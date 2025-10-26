/**
 * Status Mapper for ICS Events
 * Maps ICS events to specific task statuses based on various rules
 * Integrates with existing task status system from settings
 */
export class StatusMapper {
    /**
     * Apply status mapping to an ICS event using plugin settings
     */
    static applyStatusMapping(event, config, pluginSettings) {
        // If no custom status mapping is configured, use default ICS status mapping
        if (!(config === null || config === void 0 ? void 0 : config.enabled)) {
            return this.mapIcsStatusToTaskStatus(event.status, pluginSettings);
        }
        // Check property-based rules first (higher priority)
        if (config.propertyRules) {
            const propertyStatus = this.applyPropertyRules(event, config.propertyRules, pluginSettings);
            if (propertyStatus) {
                return propertyStatus;
            }
        }
        // Apply timing-based rules
        const timingStatus = this.applyTimingRules(event, config.timingRules, pluginSettings);
        if (timingStatus) {
            return timingStatus;
        }
        // Fallback to original ICS status if no rules match
        return config.overrideIcsStatus
            ? this.convertTaskStatusToString(config.timingRules.futureEvents, pluginSettings)
            : this.mapIcsStatusToTaskStatus(event.status, pluginSettings);
    }
    /**
     * Apply property-based status rules
     */
    static applyPropertyRules(event, rules, pluginSettings) {
        // Holiday mapping (highest priority)
        if (rules.holidayMapping && "isHoliday" in event) {
            const holidayEvent = event;
            if (holidayEvent.isHoliday) {
                return this.convertTaskStatusToString(rules.holidayMapping.holidayStatus, pluginSettings);
            }
            else if (rules.holidayMapping.nonHolidayStatus) {
                return this.convertTaskStatusToString(rules.holidayMapping.nonHolidayStatus, pluginSettings);
            }
        }
        // Category mapping
        if (rules.categoryMapping && event.categories) {
            for (const category of event.categories) {
                const mappedStatus = rules.categoryMapping[category.toLowerCase()];
                if (mappedStatus) {
                    return this.convertTaskStatusToString(mappedStatus, pluginSettings);
                }
            }
        }
        // Summary pattern mapping
        if (rules.summaryMapping) {
            for (const mapping of rules.summaryMapping) {
                try {
                    const regex = new RegExp(mapping.pattern, "i");
                    if (regex.test(event.summary)) {
                        return this.convertTaskStatusToString(mapping.status, pluginSettings);
                    }
                }
                catch (error) {
                    console.warn(`Invalid regex pattern: ${mapping.pattern}`, error);
                }
            }
        }
        return null;
    }
    /**
     * Apply timing-based status rules
     */
    static applyTimingRules(event, rules, pluginSettings) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const eventStart = new Date(event.dtstart);
        const eventEnd = event.dtend ? new Date(event.dtend) : eventStart;
        // Normalize event dates to start of day for comparison
        const eventStartDay = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
        const eventEndDay = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());
        // Check if event is in the past
        if (eventEndDay < today) {
            return this.convertTaskStatusToString(rules.pastEvents, pluginSettings);
        }
        // Check if event is happening today
        if (eventStartDay <= today && eventEndDay >= today) {
            return this.convertTaskStatusToString(rules.currentEvents, pluginSettings);
        }
        // Event is in the future
        return this.convertTaskStatusToString(rules.futureEvents, pluginSettings);
    }
    /**
     * Convert TaskStatus to actual string using plugin settings
     */
    static convertTaskStatusToString(taskStatus, pluginSettings) {
        // Use the existing task status system from settings
        const statusMarks = pluginSettings.taskStatusMarks;
        // Map our TaskStatus enum to the status names used in settings
        const statusMapping = {
            " ": "Not Started",
            x: "Completed",
            "-": "Abandoned",
            ">": "In Progress",
            "<": "Planned",
            "!": "Important",
            "?": "Planned",
            "/": "In Progress",
            "+": "Completed",
            "*": "Important",
            '"': "Not Started",
            l: "Not Started",
            b: "Not Started",
            i: "Not Started",
            S: "Not Started",
            I: "Not Started",
            p: "Not Started",
            c: "Not Started",
            f: "Important",
            k: "Important",
            w: "Completed",
            u: "In Progress",
            d: "Abandoned",
        };
        const statusName = statusMapping[taskStatus];
        // Return the actual status mark from settings, fallback to the TaskStatus itself
        return statusMarks[statusName] || taskStatus;
    }
    /**
     * Map original ICS status to task status using plugin settings
     */
    static mapIcsStatusToTaskStatus(icsStatus, pluginSettings) {
        const statusMarks = pluginSettings.taskStatusMarks;
        switch (icsStatus === null || icsStatus === void 0 ? void 0 : icsStatus.toUpperCase()) {
            case "COMPLETED":
                return statusMarks["Completed"] || "x";
            case "CANCELLED":
                return statusMarks["Abandoned"] || "-";
            case "TENTATIVE":
                return statusMarks["Planned"] || "?";
            case "CONFIRMED":
            default:
                return statusMarks["Not Started"] || " ";
        }
    }
    /**
     * Get default status mapping configuration
     */
    static getDefaultConfig() {
        return {
            enabled: false,
            timingRules: {
                pastEvents: "x",
                currentEvents: "/",
                futureEvents: " ", // Keep future events as incomplete
            },
            propertyRules: {
                categoryMapping: {
                    holiday: "-",
                    vacation: "-",
                    假期: "-",
                    节日: "-", // Mark Chinese festivals as cancelled/abandoned
                },
                holidayMapping: {
                    holidayStatus: "-",
                    nonHolidayStatus: undefined, // Use timing rules for non-holidays
                },
            },
            overrideIcsStatus: true,
        };
    }
    /**
     * Get available task statuses with descriptions
     */
    static getAvailableStatuses() {
        return [
            {
                value: " ",
                label: "Incomplete",
                description: "Task is not yet completed",
            },
            { value: "x", label: "Complete", description: "Task is completed" },
            {
                value: "-",
                label: "Cancelled",
                description: "Task is cancelled or abandoned",
            },
            {
                value: ">",
                label: "Forwarded",
                description: "Task is forwarded or rescheduled",
            },
            {
                value: "<",
                label: "Scheduled",
                description: "Task is scheduled",
            },
            {
                value: "!",
                label: "Important",
                description: "Task is marked as important",
            },
            {
                value: "?",
                label: "Question",
                description: "Task is tentative or questionable",
            },
            {
                value: "/",
                label: "In Progress",
                description: "Task is currently in progress",
            },
        ];
    }
    /**
     * Get status label for display
     */
    static getStatusLabel(status) {
        const statusInfo = this.getAvailableStatuses().find((s) => s.value === status);
        return statusInfo ? statusInfo.label : "Unknown";
    }
    /**
     * Validate status mapping configuration
     */
    static validateConfig(config) {
        const errors = [];
        // Validate timing rules
        if (!config.timingRules) {
            errors.push("Timing rules are required");
        }
        else {
            const availableStatuses = this.getAvailableStatuses().map((s) => s.value);
            if (!availableStatuses.includes(config.timingRules.pastEvents)) {
                errors.push(`Invalid status for past events: ${config.timingRules.pastEvents}`);
            }
            if (!availableStatuses.includes(config.timingRules.currentEvents)) {
                errors.push(`Invalid status for current events: ${config.timingRules.currentEvents}`);
            }
            if (!availableStatuses.includes(config.timingRules.futureEvents)) {
                errors.push(`Invalid status for future events: ${config.timingRules.futureEvents}`);
            }
        }
        // Validate property rules if present
        if (config.propertyRules) {
            const availableStatuses = this.getAvailableStatuses().map((s) => s.value);
            // Validate category mapping
            if (config.propertyRules.categoryMapping) {
                for (const [category, status] of Object.entries(config.propertyRules.categoryMapping)) {
                    if (!availableStatuses.includes(status)) {
                        errors.push(`Invalid status for category '${category}': ${status}`);
                    }
                }
            }
            // Validate summary mapping
            if (config.propertyRules.summaryMapping) {
                for (const mapping of config.propertyRules.summaryMapping) {
                    if (!availableStatuses.includes(mapping.status)) {
                        errors.push(`Invalid status for pattern '${mapping.pattern}': ${mapping.status}`);
                    }
                    // Validate regex pattern
                    try {
                        new RegExp(mapping.pattern);
                    }
                    catch (error) {
                        errors.push(`Invalid regex pattern: ${mapping.pattern}`);
                    }
                }
            }
            // Validate holiday mapping
            if (config.propertyRules.holidayMapping) {
                if (!availableStatuses.includes(config.propertyRules.holidayMapping.holidayStatus)) {
                    errors.push(`Invalid holiday status: ${config.propertyRules.holidayMapping.holidayStatus}`);
                }
                if (config.propertyRules.holidayMapping.nonHolidayStatus &&
                    !availableStatuses.includes(config.propertyRules.holidayMapping.nonHolidayStatus)) {
                    errors.push(`Invalid non-holiday status: ${config.propertyRules.holidayMapping.nonHolidayStatus}`);
                }
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNzLXN0YXR1cy1tYXBwZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpY3Mtc3RhdHVzLW1hcHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OztHQUlHO0FBVUgsTUFBTSxPQUFPLFlBQVk7SUFDeEI7O09BRUc7SUFDSCxNQUFNLENBQUMsa0JBQWtCLENBQ3hCLEtBQXFDLEVBQ3JDLE1BQW9DLEVBQ3BDLGNBQXVDO1FBRXZDLDRFQUE0RTtRQUM1RSxJQUFJLENBQUMsQ0FBQSxNQUFNLGFBQU4sTUFBTSx1QkFBTixNQUFNLENBQUUsT0FBTyxDQUFBLEVBQUU7WUFDckIsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQztTQUNuRTtRQUVELHFEQUFxRDtRQUNyRCxJQUFJLE1BQU0sQ0FBQyxhQUFhLEVBQUU7WUFDekIsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUM3QyxLQUFLLEVBQ0wsTUFBTSxDQUFDLGFBQWEsRUFDcEIsY0FBYyxDQUNkLENBQUM7WUFDRixJQUFJLGNBQWMsRUFBRTtnQkFDbkIsT0FBTyxjQUFjLENBQUM7YUFDdEI7U0FDRDtRQUVELDJCQUEyQjtRQUMzQixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQ3pDLEtBQUssRUFDTCxNQUFNLENBQUMsV0FBVyxFQUNsQixjQUFjLENBQ2QsQ0FBQztRQUNGLElBQUksWUFBWSxFQUFFO1lBQ2pCLE9BQU8sWUFBWSxDQUFDO1NBQ3BCO1FBRUQsb0RBQW9EO1FBQ3BELE9BQU8sTUFBTSxDQUFDLGlCQUFpQjtZQUM5QixDQUFDLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUM5QixNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksRUFDL0IsY0FBYyxDQUNiO1lBQ0gsQ0FBQyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFD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QUM7cUJBQ0Y7aUJBQ0Q7YUFDRDtZQUVELDJCQUEyQjtZQUMzQixJQUFJLE1BQU0sQ0FBQyxhQUFhLENBQUMsY0FBYyxFQUFFO2dCQUN4QyxJQUNDLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUMxQixNQUFNLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQ2pELEVBQ0E7b0JBQ0QsTUFBTSxDQUFDLElBQUksQ0FDViwyQkFBMkIsTUFBTSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFLENBQzlFLENBQUM7aUJBQ0Y7Z0JBQ0QsSUFDQyxNQUFNLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0I7b0JBQ3BELENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUMxQixNQUFNLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FDcEQsRUFDQTtvQkFDRCxNQUFNLENBQUMsSUFBSSxDQUNWLCtCQUErQixNQUFNLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUNyRixDQUFDO2lCQUNGO2FBQ0Q7U0FDRDtRQUVELE9BQU87WUFDTixLQUFLLEVBQUUsTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDO1lBQzFCLE1BQU07U0FDTixDQUFDO0lBQ0gsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFN0YXR1cyBNYXBwZXIgZm9yIElDUyBFdmVudHNcclxuICogTWFwcyBJQ1MgZXZlbnRzIHRvIHNwZWNpZmljIHRhc2sgc3RhdHVzZXMgYmFzZWQgb24gdmFyaW91cyBydWxlc1xyXG4gKiBJbnRlZ3JhdGVzIHdpdGggZXhpc3RpbmcgdGFzayBzdGF0dXMgc3lzdGVtIGZyb20gc2V0dGluZ3NcclxuICovXHJcblxyXG5pbXBvcnQge1xyXG5cdEljc0V2ZW50LFxyXG5cdEljc1N0YXR1c01hcHBpbmcsXHJcblx0VGFza1N0YXR1cyxcclxuXHRJY3NFdmVudFdpdGhIb2xpZGF5LFxyXG59IGZyb20gXCIuLi90eXBlcy9pY3NcIjtcclxuaW1wb3J0IHsgVGFza1Byb2dyZXNzQmFyU2V0dGluZ3MgfSBmcm9tIFwiLi4vY29tbW9uL3NldHRpbmctZGVmaW5pdGlvblwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFN0YXR1c01hcHBlciB7XHJcblx0LyoqXHJcblx0ICogQXBwbHkgc3RhdHVzIG1hcHBpbmcgdG8gYW4gSUNTIGV2ZW50IHVzaW5nIHBsdWdpbiBzZXR0aW5nc1xyXG5cdCAqL1xyXG5cdHN0YXRpYyBhcHBseVN0YXR1c01hcHBpbmcoXHJcblx0XHRldmVudDogSWNzRXZlbnQgfCBJY3NFdmVudFdpdGhIb2xpZGF5LFxyXG5cdFx0Y29uZmlnOiBJY3NTdGF0dXNNYXBwaW5nIHwgdW5kZWZpbmVkLFxyXG5cdFx0cGx1Z2luU2V0dGluZ3M6IFRhc2tQcm9ncmVzc0JhclNldHRpbmdzXHJcblx0KTogc3RyaW5nIHtcclxuXHRcdC8vIElmIG5vIGN1c3RvbSBzdGF0dXMgbWFwcGluZyBpcyBjb25maWd1cmVkLCB1c2UgZGVmYXVsdCBJQ1Mgc3RhdHVzIG1hcHBpbmdcclxuXHRcdGlmICghY29uZmlnPy5lbmFibGVkKSB7XHJcblx0XHRcdHJldHVybiB0aGlzLm1hcEljc1N0YXR1c1RvVGFza1N0YXR1cyhldmVudC5zdGF0dXMsIHBsdWdpblNldHRpbmdzKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDaGVjayBwcm9wZXJ0eS1iYXNlZCBydWxlcyBmaXJzdCAoaGlnaGVyIHByaW9yaXR5KVxyXG5cdFx0aWYgKGNvbmZpZy5wcm9wZXJ0eVJ1bGVzKSB7XHJcblx0XHRcdGNvbnN0IHByb3BlcnR5U3RhdHVzID0gdGhpcy5hcHBseVByb3BlcnR5UnVsZXMoXHJcblx0XHRcdFx0ZXZlbnQsXHJcblx0XHRcdFx0Y29uZmlnLnByb3BlcnR5UnVsZXMsXHJcblx0XHRcdFx0cGx1Z2luU2V0dGluZ3NcclxuXHRcdFx0KTtcclxuXHRcdFx0aWYgKHByb3BlcnR5U3RhdHVzKSB7XHJcblx0XHRcdFx0cmV0dXJuIHByb3BlcnR5U3RhdHVzO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQXBwbHkgdGltaW5nLWJhc2VkIHJ1bGVzXHJcblx0XHRjb25zdCB0aW1pbmdTdGF0dXMgPSB0aGlzLmFwcGx5VGltaW5nUnVsZXMoXHJcblx0XHRcdGV2ZW50LFxyXG5cdFx0XHRjb25maWcudGltaW5nUnVsZXMsXHJcblx0XHRcdHBsdWdpblNldHRpbmdzXHJcblx0XHQpO1xyXG5cdFx0aWYgKHRpbWluZ1N0YXR1cykge1xyXG5cdFx0XHRyZXR1cm4gdGltaW5nU3RhdHVzO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEZhbGxiYWNrIHRvIG9yaWdpbmFsIElDUyBzdGF0dXMgaWYgbm8gcnVsZXMgbWF0Y2hcclxuXHRcdHJldHVybiBjb25maWcub3ZlcnJpZGVJY3NTdGF0dXNcclxuXHRcdFx0PyB0aGlzLmNvbnZlcnRUYXNrU3RhdHVzVG9TdHJpbmcoXHJcblx0XHRcdFx0XHRjb25maWcudGltaW5nUnVsZXMuZnV0dXJlRXZlbnRzLFxyXG5cdFx0XHRcdFx0cGx1Z2luU2V0dGluZ3NcclxuXHRcdFx0ICApXHJcblx0XHRcdDogdGhpcy5tYXBJY3NTdGF0dXNUb1Rhc2tTdGF0dXMoZXZlbnQuc3RhdHVzLCBwbHVnaW5TZXR0aW5ncyk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBBcHBseSBwcm9wZXJ0eS1iYXNlZCBzdGF0dXMgcnVsZXNcclxuXHQgKi9cclxuXHRwcml2YXRlIHN0YXRpYyBhcHBseVByb3BlcnR5UnVsZXMoXHJcblx0XHRldmVudDogSWNzRXZlbnQgfCBJY3NFdmVudFdpdGhIb2xpZGF5LFxyXG5cdFx0cnVsZXM6IE5vbk51bGxhYmxlPEljc1N0YXR1c01hcHBpbmdbXCJwcm9wZXJ0eVJ1bGVzXCJdPixcclxuXHRcdHBsdWdpblNldHRpbmdzOiBUYXNrUHJvZ3Jlc3NCYXJTZXR0aW5nc1xyXG5cdCk6IHN0cmluZyB8IG51bGwge1xyXG5cdFx0Ly8gSG9saWRheSBtYXBwaW5nIChoaWdoZXN0IHByaW9yaXR5KVxyXG5cdFx0aWYgKHJ1bGVzLmhvbGlkYXlNYXBwaW5nICYmIFwiaXNIb2xpZGF5XCIgaW4gZXZlbnQpIHtcclxuXHRcdFx0Y29uc3QgaG9saWRheUV2ZW50ID0gZXZlbnQgYXMgSWNzRXZlbnRXaXRoSG9saWRheTtcclxuXHRcdFx0aWYgKGhvbGlkYXlFdmVudC5pc0hvbGlkYXkpIHtcclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5jb252ZXJ0VGFza1N0YXR1c1RvU3RyaW5nKFxyXG5cdFx0XHRcdFx0cnVsZXMuaG9saWRheU1hcHBpbmcuaG9saWRheVN0YXR1cyxcclxuXHRcdFx0XHRcdHBsdWdpblNldHRpbmdzXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fSBlbHNlIGlmIChydWxlcy5ob2xpZGF5TWFwcGluZy5ub25Ib2xpZGF5U3RhdHVzKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuY29udmVydFRhc2tTdGF0dXNUb1N0cmluZyhcclxuXHRcdFx0XHRcdHJ1bGVzLmhvbGlkYXlNYXBwaW5nLm5vbkhvbGlkYXlTdGF0dXMsXHJcblx0XHRcdFx0XHRwbHVnaW5TZXR0aW5nc1xyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBDYXRlZ29yeSBtYXBwaW5nXHJcblx0XHRpZiAocnVsZXMuY2F0ZWdvcnlNYXBwaW5nICYmIGV2ZW50LmNhdGVnb3JpZXMpIHtcclxuXHRcdFx0Zm9yIChjb25zdCBjYXRlZ29yeSBvZiBldmVudC5jYXRlZ29yaWVzKSB7XHJcblx0XHRcdFx0Y29uc3QgbWFwcGVkU3RhdHVzID1cclxuXHRcdFx0XHRcdHJ1bGVzLmNhdGVnb3J5TWFwcGluZ1tjYXRlZ29yeS50b0xvd2VyQ2FzZSgpXTtcclxuXHRcdFx0XHRpZiAobWFwcGVkU3RhdHVzKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5jb252ZXJ0VGFza1N0YXR1c1RvU3RyaW5nKFxyXG5cdFx0XHRcdFx0XHRtYXBwZWRTdGF0dXMsXHJcblx0XHRcdFx0XHRcdHBsdWdpblNldHRpbmdzXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFN1bW1hcnkgcGF0dGVybiBtYXBwaW5nXHJcblx0XHRpZiAocnVsZXMuc3VtbWFyeU1hcHBpbmcpIHtcclxuXHRcdFx0Zm9yIChjb25zdCBtYXBwaW5nIG9mIHJ1bGVzLnN1bW1hcnlNYXBwaW5nKSB7XHJcblx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdGNvbnN0IHJlZ2V4ID0gbmV3IFJlZ0V4cChtYXBwaW5nLnBhdHRlcm4sIFwiaVwiKTtcclxuXHRcdFx0XHRcdGlmIChyZWdleC50ZXN0KGV2ZW50LnN1bW1hcnkpKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLmNvbnZlcnRUYXNrU3RhdHVzVG9TdHJpbmcoXHJcblx0XHRcdFx0XHRcdFx0bWFwcGluZy5zdGF0dXMsXHJcblx0XHRcdFx0XHRcdFx0cGx1Z2luU2V0dGluZ3NcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0XHRgSW52YWxpZCByZWdleCBwYXR0ZXJuOiAke21hcHBpbmcucGF0dGVybn1gLFxyXG5cdFx0XHRcdFx0XHRlcnJvclxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEFwcGx5IHRpbWluZy1iYXNlZCBzdGF0dXMgcnVsZXNcclxuXHQgKi9cclxuXHRwcml2YXRlIHN0YXRpYyBhcHBseVRpbWluZ1J1bGVzKFxyXG5cdFx0ZXZlbnQ6IEljc0V2ZW50IHwgSWNzRXZlbnRXaXRoSG9saWRheSxcclxuXHRcdHJ1bGVzOiBJY3NTdGF0dXNNYXBwaW5nW1widGltaW5nUnVsZXNcIl0sXHJcblx0XHRwbHVnaW5TZXR0aW5nczogVGFza1Byb2dyZXNzQmFyU2V0dGluZ3NcclxuXHQpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3Qgbm93ID0gbmV3IERhdGUoKTtcclxuXHRcdGNvbnN0IHRvZGF5ID0gbmV3IERhdGUoXHJcblx0XHRcdG5vdy5nZXRGdWxsWWVhcigpLFxyXG5cdFx0XHRub3cuZ2V0TW9udGgoKSxcclxuXHRcdFx0bm93LmdldERhdGUoKVxyXG5cdFx0KTtcclxuXHJcblx0XHRjb25zdCBldmVudFN0YXJ0ID0gbmV3IERhdGUoZXZlbnQuZHRzdGFydCk7XHJcblx0XHRjb25zdCBldmVudEVuZCA9IGV2ZW50LmR0ZW5kID8gbmV3IERhdGUoZXZlbnQuZHRlbmQpIDogZXZlbnRTdGFydDtcclxuXHJcblx0XHQvLyBOb3JtYWxpemUgZXZlbnQgZGF0ZXMgdG8gc3RhcnQgb2YgZGF5IGZvciBjb21wYXJpc29uXHJcblx0XHRjb25zdCBldmVudFN0YXJ0RGF5ID0gbmV3IERhdGUoXHJcblx0XHRcdGV2ZW50U3RhcnQuZ2V0RnVsbFllYXIoKSxcclxuXHRcdFx0ZXZlbnRTdGFydC5nZXRNb250aCgpLFxyXG5cdFx0XHRldmVudFN0YXJ0LmdldERhdGUoKVxyXG5cdFx0KTtcclxuXHRcdGNvbnN0IGV2ZW50RW5kRGF5ID0gbmV3IERhdGUoXHJcblx0XHRcdGV2ZW50RW5kLmdldEZ1bGxZZWFyKCksXHJcblx0XHRcdGV2ZW50RW5kLmdldE1vbnRoKCksXHJcblx0XHRcdGV2ZW50RW5kLmdldERhdGUoKVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBDaGVjayBpZiBldmVudCBpcyBpbiB0aGUgcGFzdFxyXG5cdFx0aWYgKGV2ZW50RW5kRGF5IDwgdG9kYXkpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMuY29udmVydFRhc2tTdGF0dXNUb1N0cmluZyhcclxuXHRcdFx0XHRydWxlcy5wYXN0RXZlbnRzLFxyXG5cdFx0XHRcdHBsdWdpblNldHRpbmdzXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgZXZlbnQgaXMgaGFwcGVuaW5nIHRvZGF5XHJcblx0XHRpZiAoZXZlbnRTdGFydERheSA8PSB0b2RheSAmJiBldmVudEVuZERheSA+PSB0b2RheSkge1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5jb252ZXJ0VGFza1N0YXR1c1RvU3RyaW5nKFxyXG5cdFx0XHRcdHJ1bGVzLmN1cnJlbnRFdmVudHMsXHJcblx0XHRcdFx0cGx1Z2luU2V0dGluZ3NcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBFdmVudCBpcyBpbiB0aGUgZnV0dXJlXHJcblx0XHRyZXR1cm4gdGhpcy5jb252ZXJ0VGFza1N0YXR1c1RvU3RyaW5nKFxyXG5cdFx0XHRydWxlcy5mdXR1cmVFdmVudHMsXHJcblx0XHRcdHBsdWdpblNldHRpbmdzXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ29udmVydCBUYXNrU3RhdHVzIHRvIGFjdHVhbCBzdHJpbmcgdXNpbmcgcGx1Z2luIHNldHRpbmdzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBzdGF0aWMgY29udmVydFRhc2tTdGF0dXNUb1N0cmluZyhcclxuXHRcdHRhc2tTdGF0dXM6IFRhc2tTdGF0dXMsXHJcblx0XHRwbHVnaW5TZXR0aW5nczogVGFza1Byb2dyZXNzQmFyU2V0dGluZ3NcclxuXHQpOiBzdHJpbmcge1xyXG5cdFx0Ly8gVXNlIHRoZSBleGlzdGluZyB0YXNrIHN0YXR1cyBzeXN0ZW0gZnJvbSBzZXR0aW5nc1xyXG5cdFx0Y29uc3Qgc3RhdHVzTWFya3MgPSBwbHVnaW5TZXR0aW5ncy50YXNrU3RhdHVzTWFya3M7XHJcblxyXG5cdFx0Ly8gTWFwIG91ciBUYXNrU3RhdHVzIGVudW0gdG8gdGhlIHN0YXR1cyBuYW1lcyB1c2VkIGluIHNldHRpbmdzXHJcblx0XHRjb25zdCBzdGF0dXNNYXBwaW5nOiBSZWNvcmQ8VGFza1N0YXR1cywgc3RyaW5nPiA9IHtcclxuXHRcdFx0XCIgXCI6IFwiTm90IFN0YXJ0ZWRcIixcclxuXHRcdFx0eDogXCJDb21wbGV0ZWRcIixcclxuXHRcdFx0XCItXCI6IFwiQWJhbmRvbmVkXCIsXHJcblx0XHRcdFwiPlwiOiBcIkluIFByb2dyZXNzXCIsXHJcblx0XHRcdFwiPFwiOiBcIlBsYW5uZWRcIixcclxuXHRcdFx0XCIhXCI6IFwiSW1wb3J0YW50XCIsXHJcblx0XHRcdFwiP1wiOiBcIlBsYW5uZWRcIiwgLy8gTWFwIHRvIGV4aXN0aW5nIHN0YXR1c1xyXG5cdFx0XHRcIi9cIjogXCJJbiBQcm9ncmVzc1wiLFxyXG5cdFx0XHRcIitcIjogXCJDb21wbGV0ZWRcIiwgLy8gTWFwIHRvIGV4aXN0aW5nIHN0YXR1c1xyXG5cdFx0XHRcIipcIjogXCJJbXBvcnRhbnRcIiwgLy8gTWFwIHRvIGV4aXN0aW5nIHN0YXR1c1xyXG5cdFx0XHQnXCInOiBcIk5vdCBTdGFydGVkXCIsIC8vIE1hcCB0byBleGlzdGluZyBzdGF0dXNcclxuXHRcdFx0bDogXCJOb3QgU3RhcnRlZFwiLFxyXG5cdFx0XHRiOiBcIk5vdCBTdGFydGVkXCIsXHJcblx0XHRcdGk6IFwiTm90IFN0YXJ0ZWRcIixcclxuXHRcdFx0UzogXCJOb3QgU3RhcnRlZFwiLFxyXG5cdFx0XHRJOiBcIk5vdCBTdGFydGVkXCIsXHJcblx0XHRcdHA6IFwiTm90IFN0YXJ0ZWRcIixcclxuXHRcdFx0YzogXCJOb3QgU3RhcnRlZFwiLFxyXG5cdFx0XHRmOiBcIkltcG9ydGFudFwiLFxyXG5cdFx0XHRrOiBcIkltcG9ydGFudFwiLFxyXG5cdFx0XHR3OiBcIkNvbXBsZXRlZFwiLFxyXG5cdFx0XHR1OiBcIkluIFByb2dyZXNzXCIsXHJcblx0XHRcdGQ6IFwiQWJhbmRvbmVkXCIsXHJcblx0XHR9O1xyXG5cclxuXHRcdGNvbnN0IHN0YXR1c05hbWUgPSBzdGF0dXNNYXBwaW5nW3Rhc2tTdGF0dXNdO1xyXG5cclxuXHRcdC8vIFJldHVybiB0aGUgYWN0dWFsIHN0YXR1cyBtYXJrIGZyb20gc2V0dGluZ3MsIGZhbGxiYWNrIHRvIHRoZSBUYXNrU3RhdHVzIGl0c2VsZlxyXG5cdFx0cmV0dXJuIHN0YXR1c01hcmtzW3N0YXR1c05hbWVdIHx8IHRhc2tTdGF0dXM7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBNYXAgb3JpZ2luYWwgSUNTIHN0YXR1cyB0byB0YXNrIHN0YXR1cyB1c2luZyBwbHVnaW4gc2V0dGluZ3NcclxuXHQgKi9cclxuXHRwcml2YXRlIHN0YXRpYyBtYXBJY3NTdGF0dXNUb1Rhc2tTdGF0dXMoXHJcblx0XHRpY3NTdGF0dXM6IHN0cmluZyB8IHVuZGVmaW5lZCxcclxuXHRcdHBsdWdpblNldHRpbmdzOiBUYXNrUHJvZ3Jlc3NCYXJTZXR0aW5nc1xyXG5cdCk6IHN0cmluZyB7XHJcblx0XHRjb25zdCBzdGF0dXNNYXJrcyA9IHBsdWdpblNldHRpbmdzLnRhc2tTdGF0dXNNYXJrcztcclxuXHJcblx0XHRzd2l0Y2ggKGljc1N0YXR1cz8udG9VcHBlckNhc2UoKSkge1xyXG5cdFx0XHRjYXNlIFwiQ09NUExFVEVEXCI6XHJcblx0XHRcdFx0cmV0dXJuIHN0YXR1c01hcmtzW1wiQ29tcGxldGVkXCJdIHx8IFwieFwiO1xyXG5cdFx0XHRjYXNlIFwiQ0FOQ0VMTEVEXCI6XHJcblx0XHRcdFx0cmV0dXJuIHN0YXR1c01hcmtzW1wiQWJhbmRvbmVkXCJdIHx8IFwiLVwiO1xyXG5cdFx0XHRjYXNlIFwiVEVOVEFUSVZFXCI6XHJcblx0XHRcdFx0cmV0dXJuIHN0YXR1c01hcmtzW1wiUGxhbm5lZFwiXSB8fCBcIj9cIjtcclxuXHRcdFx0Y2FzZSBcIkNPTkZJUk1FRFwiOlxyXG5cdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdHJldHVybiBzdGF0dXNNYXJrc1tcIk5vdCBTdGFydGVkXCJdIHx8IFwiIFwiO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGRlZmF1bHQgc3RhdHVzIG1hcHBpbmcgY29uZmlndXJhdGlvblxyXG5cdCAqL1xyXG5cdHN0YXRpYyBnZXREZWZhdWx0Q29uZmlnKCk6IEljc1N0YXR1c01hcHBpbmcge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdHRpbWluZ1J1bGVzOiB7XHJcblx0XHRcdFx0cGFzdEV2ZW50czogXCJ4XCIsIC8vIE1hcmsgcGFzdCBldmVudHMgYXMgY29tcGxldGVkXHJcblx0XHRcdFx0Y3VycmVudEV2ZW50czogXCIvXCIsIC8vIE1hcmsgY3VycmVudCBldmVudHMgYXMgaW4gcHJvZ3Jlc3NcclxuXHRcdFx0XHRmdXR1cmVFdmVudHM6IFwiIFwiLCAvLyBLZWVwIGZ1dHVyZSBldmVudHMgYXMgaW5jb21wbGV0ZVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRwcm9wZXJ0eVJ1bGVzOiB7XHJcblx0XHRcdFx0Y2F0ZWdvcnlNYXBwaW5nOiB7XHJcblx0XHRcdFx0XHRob2xpZGF5OiBcIi1cIiwgLy8gTWFyayBob2xpZGF5cyBhcyBjYW5jZWxsZWQvYWJhbmRvbmVkXHJcblx0XHRcdFx0XHR2YWNhdGlvbjogXCItXCIsIC8vIE1hcmsgdmFjYXRpb25zIGFzIGNhbmNlbGxlZC9hYmFuZG9uZWRcclxuXHRcdFx0XHRcdOWBh+acnzogXCItXCIsIC8vIE1hcmsgQ2hpbmVzZSBob2xpZGF5cyBhcyBjYW5jZWxsZWQvYWJhbmRvbmVkXHJcblx0XHRcdFx0XHToioLml6U6IFwiLVwiLCAvLyBNYXJrIENoaW5lc2UgZmVzdGl2YWxzIGFzIGNhbmNlbGxlZC9hYmFuZG9uZWRcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGhvbGlkYXlNYXBwaW5nOiB7XHJcblx0XHRcdFx0XHRob2xpZGF5U3RhdHVzOiBcIi1cIiwgLy8gTWFyayBkZXRlY3RlZCBob2xpZGF5cyBhcyBjYW5jZWxsZWRcclxuXHRcdFx0XHRcdG5vbkhvbGlkYXlTdGF0dXM6IHVuZGVmaW5lZCwgLy8gVXNlIHRpbWluZyBydWxlcyBmb3Igbm9uLWhvbGlkYXlzXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSxcclxuXHRcdFx0b3ZlcnJpZGVJY3NTdGF0dXM6IHRydWUsXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGF2YWlsYWJsZSB0YXNrIHN0YXR1c2VzIHdpdGggZGVzY3JpcHRpb25zXHJcblx0ICovXHJcblx0c3RhdGljIGdldEF2YWlsYWJsZVN0YXR1c2VzKCk6IEFycmF5PHtcclxuXHRcdHZhbHVlOiBUYXNrU3RhdHVzO1xyXG5cdFx0bGFiZWw6IHN0cmluZztcclxuXHRcdGRlc2NyaXB0aW9uOiBzdHJpbmc7XHJcblx0fT4ge1xyXG5cdFx0cmV0dXJuIFtcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHZhbHVlOiBcIiBcIixcclxuXHRcdFx0XHRsYWJlbDogXCJJbmNvbXBsZXRlXCIsXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IFwiVGFzayBpcyBub3QgeWV0IGNvbXBsZXRlZFwiLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7IHZhbHVlOiBcInhcIiwgbGFiZWw6IFwiQ29tcGxldGVcIiwgZGVzY3JpcHRpb246IFwiVGFzayBpcyBjb21wbGV0ZWRcIiB9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0dmFsdWU6IFwiLVwiLFxyXG5cdFx0XHRcdGxhYmVsOiBcIkNhbmNlbGxlZFwiLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBcIlRhc2sgaXMgY2FuY2VsbGVkIG9yIGFiYW5kb25lZFwiLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0dmFsdWU6IFwiPlwiLFxyXG5cdFx0XHRcdGxhYmVsOiBcIkZvcndhcmRlZFwiLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBcIlRhc2sgaXMgZm9yd2FyZGVkIG9yIHJlc2NoZWR1bGVkXCIsXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHR2YWx1ZTogXCI8XCIsXHJcblx0XHRcdFx0bGFiZWw6IFwiU2NoZWR1bGVkXCIsXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IFwiVGFzayBpcyBzY2hlZHVsZWRcIixcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHZhbHVlOiBcIiFcIixcclxuXHRcdFx0XHRsYWJlbDogXCJJbXBvcnRhbnRcIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogXCJUYXNrIGlzIG1hcmtlZCBhcyBpbXBvcnRhbnRcIixcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHZhbHVlOiBcIj9cIixcclxuXHRcdFx0XHRsYWJlbDogXCJRdWVzdGlvblwiLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBcIlRhc2sgaXMgdGVudGF0aXZlIG9yIHF1ZXN0aW9uYWJsZVwiLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0dmFsdWU6IFwiL1wiLFxyXG5cdFx0XHRcdGxhYmVsOiBcIkluIFByb2dyZXNzXCIsXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IFwiVGFzayBpcyBjdXJyZW50bHkgaW4gcHJvZ3Jlc3NcIixcclxuXHRcdFx0fSxcclxuXHRcdF07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgc3RhdHVzIGxhYmVsIGZvciBkaXNwbGF5XHJcblx0ICovXHJcblx0c3RhdGljIGdldFN0YXR1c0xhYmVsKHN0YXR1czogVGFza1N0YXR1cyk6IHN0cmluZyB7XHJcblx0XHRjb25zdCBzdGF0dXNJbmZvID0gdGhpcy5nZXRBdmFpbGFibGVTdGF0dXNlcygpLmZpbmQoXHJcblx0XHRcdChzKSA9PiBzLnZhbHVlID09PSBzdGF0dXNcclxuXHRcdCk7XHJcblx0XHRyZXR1cm4gc3RhdHVzSW5mbyA/IHN0YXR1c0luZm8ubGFiZWwgOiBcIlVua25vd25cIjtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFZhbGlkYXRlIHN0YXR1cyBtYXBwaW5nIGNvbmZpZ3VyYXRpb25cclxuXHQgKi9cclxuXHRzdGF0aWMgdmFsaWRhdGVDb25maWcoY29uZmlnOiBJY3NTdGF0dXNNYXBwaW5nKToge1xyXG5cdFx0dmFsaWQ6IGJvb2xlYW47XHJcblx0XHRlcnJvcnM6IHN0cmluZ1tdO1xyXG5cdH0ge1xyXG5cdFx0Y29uc3QgZXJyb3JzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuXHRcdC8vIFZhbGlkYXRlIHRpbWluZyBydWxlc1xyXG5cdFx0aWYgKCFjb25maWcudGltaW5nUnVsZXMpIHtcclxuXHRcdFx0ZXJyb3JzLnB1c2goXCJUaW1pbmcgcnVsZXMgYXJlIHJlcXVpcmVkXCIpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Y29uc3QgYXZhaWxhYmxlU3RhdHVzZXMgPSB0aGlzLmdldEF2YWlsYWJsZVN0YXR1c2VzKCkubWFwKFxyXG5cdFx0XHRcdChzKSA9PiBzLnZhbHVlXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRpZiAoIWF2YWlsYWJsZVN0YXR1c2VzLmluY2x1ZGVzKGNvbmZpZy50aW1pbmdSdWxlcy5wYXN0RXZlbnRzKSkge1xyXG5cdFx0XHRcdGVycm9ycy5wdXNoKFxyXG5cdFx0XHRcdFx0YEludmFsaWQgc3RhdHVzIGZvciBwYXN0IGV2ZW50czogJHtjb25maWcudGltaW5nUnVsZXMucGFzdEV2ZW50c31gXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoIWF2YWlsYWJsZVN0YXR1c2VzLmluY2x1ZGVzKGNvbmZpZy50aW1pbmdSdWxlcy5jdXJyZW50RXZlbnRzKSkge1xyXG5cdFx0XHRcdGVycm9ycy5wdXNoKFxyXG5cdFx0XHRcdFx0YEludmFsaWQgc3RhdHVzIGZvciBjdXJyZW50IGV2ZW50czogJHtjb25maWcudGltaW5nUnVsZXMuY3VycmVudEV2ZW50c31gXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoIWF2YWlsYWJsZVN0YXR1c2VzLmluY2x1ZGVzKGNvbmZpZy50aW1pbmdSdWxlcy5mdXR1cmVFdmVudHMpKSB7XHJcblx0XHRcdFx0ZXJyb3JzLnB1c2goXHJcblx0XHRcdFx0XHRgSW52YWxpZCBzdGF0dXMgZm9yIGZ1dHVyZSBldmVudHM6ICR7Y29uZmlnLnRpbWluZ1J1bGVzLmZ1dHVyZUV2ZW50c31gXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFZhbGlkYXRlIHByb3BlcnR5IHJ1bGVzIGlmIHByZXNlbnRcclxuXHRcdGlmIChjb25maWcucHJvcGVydHlSdWxlcykge1xyXG5cdFx0XHRjb25zdCBhdmFpbGFibGVTdGF0dXNlcyA9IHRoaXMuZ2V0QXZhaWxhYmxlU3RhdHVzZXMoKS5tYXAoXHJcblx0XHRcdFx0KHMpID0+IHMudmFsdWVcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIFZhbGlkYXRlIGNhdGVnb3J5IG1hcHBpbmdcclxuXHRcdFx0aWYgKGNvbmZpZy5wcm9wZXJ0eVJ1bGVzLmNhdGVnb3J5TWFwcGluZykge1xyXG5cdFx0XHRcdGZvciAoY29uc3QgW2NhdGVnb3J5LCBzdGF0dXNdIG9mIE9iamVjdC5lbnRyaWVzKFxyXG5cdFx0XHRcdFx0Y29uZmlnLnByb3BlcnR5UnVsZXMuY2F0ZWdvcnlNYXBwaW5nXHJcblx0XHRcdFx0KSkge1xyXG5cdFx0XHRcdFx0aWYgKCFhdmFpbGFibGVTdGF0dXNlcy5pbmNsdWRlcyhzdGF0dXMpKSB7XHJcblx0XHRcdFx0XHRcdGVycm9ycy5wdXNoKFxyXG5cdFx0XHRcdFx0XHRcdGBJbnZhbGlkIHN0YXR1cyBmb3IgY2F0ZWdvcnkgJyR7Y2F0ZWdvcnl9JzogJHtzdGF0dXN9YFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVmFsaWRhdGUgc3VtbWFyeSBtYXBwaW5nXHJcblx0XHRcdGlmIChjb25maWcucHJvcGVydHlSdWxlcy5zdW1tYXJ5TWFwcGluZykge1xyXG5cdFx0XHRcdGZvciAoY29uc3QgbWFwcGluZyBvZiBjb25maWcucHJvcGVydHlSdWxlcy5zdW1tYXJ5TWFwcGluZykge1xyXG5cdFx0XHRcdFx0aWYgKCFhdmFpbGFibGVTdGF0dXNlcy5pbmNsdWRlcyhtYXBwaW5nLnN0YXR1cykpIHtcclxuXHRcdFx0XHRcdFx0ZXJyb3JzLnB1c2goXHJcblx0XHRcdFx0XHRcdFx0YEludmFsaWQgc3RhdHVzIGZvciBwYXR0ZXJuICcke21hcHBpbmcucGF0dGVybn0nOiAke21hcHBpbmcuc3RhdHVzfWBcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBWYWxpZGF0ZSByZWdleCBwYXR0ZXJuXHJcblx0XHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0XHRuZXcgUmVnRXhwKG1hcHBpbmcucGF0dGVybik7XHJcblx0XHRcdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdFx0XHRlcnJvcnMucHVzaChcclxuXHRcdFx0XHRcdFx0XHRgSW52YWxpZCByZWdleCBwYXR0ZXJuOiAke21hcHBpbmcucGF0dGVybn1gXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBWYWxpZGF0ZSBob2xpZGF5IG1hcHBpbmdcclxuXHRcdFx0aWYgKGNvbmZpZy5wcm9wZXJ0eVJ1bGVzLmhvbGlkYXlNYXBwaW5nKSB7XHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0IWF2YWlsYWJsZVN0YXR1c2VzLmluY2x1ZGVzKFxyXG5cdFx0XHRcdFx0XHRjb25maWcucHJvcGVydHlSdWxlcy5ob2xpZGF5TWFwcGluZy5ob2xpZGF5U3RhdHVzXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRlcnJvcnMucHVzaChcclxuXHRcdFx0XHRcdFx0YEludmFsaWQgaG9saWRheSBzdGF0dXM6ICR7Y29uZmlnLnByb3BlcnR5UnVsZXMuaG9saWRheU1hcHBpbmcuaG9saWRheVN0YXR1c31gXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRjb25maWcucHJvcGVydHlSdWxlcy5ob2xpZGF5TWFwcGluZy5ub25Ib2xpZGF5U3RhdHVzICYmXHJcblx0XHRcdFx0XHQhYXZhaWxhYmxlU3RhdHVzZXMuaW5jbHVkZXMoXHJcblx0XHRcdFx0XHRcdGNvbmZpZy5wcm9wZXJ0eVJ1bGVzLmhvbGlkYXlNYXBwaW5nLm5vbkhvbGlkYXlTdGF0dXNcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdGVycm9ycy5wdXNoKFxyXG5cdFx0XHRcdFx0XHRgSW52YWxpZCBub24taG9saWRheSBzdGF0dXM6ICR7Y29uZmlnLnByb3BlcnR5UnVsZXMuaG9saWRheU1hcHBpbmcubm9uSG9saWRheVN0YXR1c31gXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHZhbGlkOiBlcnJvcnMubGVuZ3RoID09PSAwLFxyXG5cdFx0XHRlcnJvcnMsXHJcblx0XHR9O1xyXG5cdH1cclxufVxyXG4iXX0=