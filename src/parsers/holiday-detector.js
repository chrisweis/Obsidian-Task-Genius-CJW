/**
 * Holiday Detection and Grouping Utility
 * Detects holiday events and groups consecutive holidays for better display
 */
export class HolidayDetector {
    /**
     * Detect if an event is a holiday based on configuration
     */
    static isHoliday(event, config) {
        if (!config.enabled) {
            return false;
        }
        const { detectionPatterns } = config;
        // Check summary patterns
        if (detectionPatterns.summary) {
            for (const pattern of detectionPatterns.summary) {
                try {
                    const regex = new RegExp(pattern, "i");
                    if (regex.test(event.summary)) {
                        return true;
                    }
                }
                catch (error) {
                    console.warn(`Invalid regex pattern: ${pattern}`, error);
                }
            }
        }
        // Check description patterns
        if (detectionPatterns.description && event.description) {
            for (const pattern of detectionPatterns.description) {
                try {
                    const regex = new RegExp(pattern, "i");
                    if (regex.test(event.description)) {
                        return true;
                    }
                }
                catch (error) {
                    console.warn(`Invalid regex pattern: ${pattern}`, error);
                }
            }
        }
        // Check categories
        if (detectionPatterns.categories && event.categories) {
            for (const category of detectionPatterns.categories) {
                if (event.categories.some((cat) => cat.toLowerCase().includes(category.toLowerCase()))) {
                    return true;
                }
            }
        }
        // Check keywords in summary and description
        if (detectionPatterns.keywords) {
            const textToCheck = [event.summary, event.description || ""].join(" ");
            for (const keyword of detectionPatterns.keywords) {
                if (textToCheck.toLowerCase().includes(keyword.toLowerCase())) {
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * Group consecutive holiday events
     */
    static groupConsecutiveHolidays(events, config) {
        if (!config.enabled || config.groupingStrategy === "none") {
            return [];
        }
        // Filter and sort holiday events
        const holidayEvents = events
            .filter((event) => this.isHoliday(event, config))
            .sort((a, b) => a.dtstart.getTime() - b.dtstart.getTime());
        if (holidayEvents.length === 0) {
            return [];
        }
        const groups = [];
        let currentGroup = [holidayEvents[0]];
        for (let i = 1; i < holidayEvents.length; i++) {
            const currentEvent = holidayEvents[i];
            const lastEvent = currentGroup[currentGroup.length - 1];
            // Calculate gap in days
            const gapDays = this.calculateDaysBetween(lastEvent.dtend || lastEvent.dtstart, currentEvent.dtstart);
            if (gapDays <= config.maxGapDays) {
                // Add to current group
                currentGroup.push(currentEvent);
            }
            else {
                // Create group from current events and start new group
                if (currentGroup.length > 0) {
                    groups.push(this.createHolidayGroup(currentGroup, config));
                }
                currentGroup = [currentEvent];
            }
        }
        // Add the last group
        if (currentGroup.length > 0) {
            groups.push(this.createHolidayGroup(currentGroup, config));
        }
        return groups;
    }
    /**
     * Process events with holiday detection and grouping
     */
    static processEventsWithHolidayDetection(events, config) {
        if (!config.enabled) {
            // Return events as-is with holiday flags set to false
            return events.map((event) => (Object.assign(Object.assign({}, event), { isHoliday: false, showInForecast: true })));
        }
        // Group consecutive holidays
        const holidayGroups = this.groupConsecutiveHolidays(events, config);
        // Create a map of event UIDs to their holiday groups
        const eventToGroupMap = new Map();
        holidayGroups.forEach((group) => {
            group.events.forEach((event) => {
                eventToGroupMap.set(event.uid, group);
            });
        });
        // Process each event
        const processedEvents = [];
        events.forEach((event) => {
            const isHoliday = this.isHoliday(event, config);
            const holidayGroup = eventToGroupMap.get(event.uid);
            let showInForecast = true;
            if (isHoliday && holidayGroup) {
                // Apply grouping strategy
                switch (config.groupingStrategy) {
                    case "first-only":
                        // Only show the first event in the group
                        showInForecast =
                            holidayGroup.events[0].uid === event.uid;
                        break;
                    case "summary":
                        // Show a summary event (first event with modified title)
                        showInForecast =
                            holidayGroup.events[0].uid === event.uid;
                        break;
                    case "range":
                        // Show first and last events only
                        const isFirst = holidayGroup.events[0].uid === event.uid;
                        const isLast = holidayGroup.events[holidayGroup.events.length - 1]
                            .uid === event.uid;
                        showInForecast = isFirst || isLast;
                        break;
                    default:
                        showInForecast = true;
                }
                // Override with config setting
                if (!config.showInForecast) {
                    showInForecast = false;
                }
            }
            processedEvents.push(Object.assign(Object.assign({}, event), { isHoliday,
                holidayGroup,
                showInForecast }));
        });
        return processedEvents;
    }
    /**
     * Create a holiday group from consecutive events
     */
    static createHolidayGroup(events, config) {
        const sortedEvents = events.sort((a, b) => a.dtstart.getTime() - b.dtstart.getTime());
        const firstEvent = sortedEvents[0];
        const lastEvent = sortedEvents[sortedEvents.length - 1];
        const startDate = firstEvent.dtstart;
        const endDate = lastEvent.dtend || lastEvent.dtstart;
        const isMultiDay = sortedEvents.length > 1;
        // Generate group title based on strategy
        let title = firstEvent.summary;
        if (config.groupingStrategy === "summary" && isMultiDay) {
            if (config.groupDisplayFormat) {
                title = config.groupDisplayFormat
                    .replace("{title}", firstEvent.summary)
                    .replace("{count}", sortedEvents.length.toString())
                    .replace("{startDate}", this.formatDate(startDate))
                    .replace("{endDate}", this.formatDate(endDate));
            }
            else {
                title = `${firstEvent.summary} (${sortedEvents.length} days)`;
            }
        }
        else if (config.groupingStrategy === "range" && isMultiDay) {
            title = `${firstEvent.summary} - ${this.formatDateRange(startDate, endDate)}`;
        }
        return {
            id: `holiday-group-${firstEvent.uid}-${sortedEvents.length}`,
            title,
            startDate,
            endDate,
            events: sortedEvents,
            source: firstEvent.source,
            isMultiDay,
            displayStrategy: config.groupingStrategy === "none"
                ? "first-only"
                : config.groupingStrategy,
        };
    }
    /**
     * Calculate days between two dates
     */
    static calculateDaysBetween(date1, date2) {
        const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
        const firstDate = new Date(date1);
        const secondDate = new Date(date2);
        // Reset time to start of day for accurate day calculation
        firstDate.setHours(0, 0, 0, 0);
        secondDate.setHours(0, 0, 0, 0);
        return Math.round(Math.abs((firstDate.getTime() - secondDate.getTime()) / oneDay));
    }
    /**
     * Format date for display
     */
    static formatDate(date) {
        return date.toLocaleDateString();
    }
    /**
     * Format date range for display
     */
    static formatDateRange(startDate, endDate) {
        const start = this.formatDate(startDate);
        const end = this.formatDate(endDate);
        return start === end ? start : `${start} - ${end}`;
    }
    /**
     * Get default holiday configuration
     */
    static getDefaultConfig() {
        return {
            enabled: false,
            detectionPatterns: {
                summary: [
                    "holiday",
                    "vacation",
                    "公假",
                    "假期",
                    "节日",
                    "春节",
                    "国庆",
                    "中秋",
                    "清明",
                    "劳动节",
                    "端午",
                    "元旦",
                    "Christmas",
                    "New Year",
                    "Easter",
                    "Thanksgiving",
                ],
                keywords: [
                    "holiday",
                    "vacation",
                    "day off",
                    "public holiday",
                    "bank holiday",
                    "假期",
                    "休假",
                    "节日",
                    "公假",
                ],
                categories: ["holiday", "vacation", "假期", "节日"],
            },
            groupingStrategy: "first-only",
            maxGapDays: 1,
            showInForecast: false,
            showInCalendar: true,
            groupDisplayFormat: "{title} ({count} days)",
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9saWRheS1kZXRlY3Rvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhvbGlkYXktZGV0ZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztHQUdHO0FBU0gsTUFBTSxPQUFPLGVBQWU7SUFDM0I7O09BRUc7SUFDSCxNQUFNLENBQUMsU0FBUyxDQUFDLEtBQWUsRUFBRSxNQUF3QjtRQUN6RCxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRTtZQUNwQixPQUFPLEtBQUssQ0FBQztTQUNiO1FBRUQsTUFBTSxFQUFFLGlCQUFpQixFQUFFLEdBQUcsTUFBTSxDQUFDO1FBRXJDLHlCQUF5QjtRQUN6QixJQUFJLGlCQUFpQixDQUFDLE9BQU8sRUFBRTtZQUM5QixLQUFLLE1BQU0sT0FBTyxJQUFJLGlCQUFpQixDQUFDLE9BQU8sRUFBRTtnQkFDaEQsSUFBSTtvQkFDSCxNQUFNLEtBQUssR0FBRyxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7b0JBQ3ZDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUU7d0JBQzlCLE9BQU8sSUFBSSxDQUFDO3FCQUNaO2lCQUNEO2dCQUFDLE9BQU8sS0FBSyxFQUFFO29CQUNmLE9BQU8sQ0FBQyxJQUFJLENBQUMsMEJBQTBCLE9BQU8sRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO2lCQUN6RDthQUNEO1NBQ0Q7UUFFRCw2QkFBNkI7UUFDN0IsSUFBSSxpQkFBaUIsQ0FBQyxXQUFXLElBQUksS0FBSyxDQUFDLFdBQVcsRUFBRTtZQUN2RCxLQUFLLE1BQU0sT0FBTyxJQUFJLGlCQUFpQixDQUFDLFdBQVcsRUFBRTtnQkFDcEQsSUFBSTtvQkFDSCxNQUFNLEtBQUssR0FBRyxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7b0JBQ3ZDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFD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b0JBQ0wsSUFBSTtvQkFDSixJQUFJO29CQUNKLFdBQVc7b0JBQ1gsVUFBVTtvQkFDVixRQUFRO29CQUNSLGNBQWM7aUJBQ2Q7Z0JBQ0QsUUFBUSxFQUFFO29CQUNULFNBQVM7b0JBQ1QsVUFBVTtvQkFDVixTQUFTO29CQUNULGdCQUFnQjtvQkFDaEIsY0FBYztvQkFDZCxJQUFJO29CQUNKLElBQUk7b0JBQ0osSUFBSTtvQkFDSixJQUFJO2lCQUNKO2dCQUNELFVBQVUsRUFBRSxDQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQzthQUMvQztZQUNELGdCQUFnQixFQUFFLFlBQVk7WUFDOUIsVUFBVSxFQUFFLENBQUM7WUFDYixjQUFjLEVBQUUsS0FBSztZQUNyQixjQUFjLEVBQUUsSUFBSTtZQUNwQixrQkFBa0IsRUFBRSx3QkFBd0I7U0FDNUMsQ0FBQztJQUNILENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBIb2xpZGF5IERldGVjdGlvbiBhbmQgR3JvdXBpbmcgVXRpbGl0eVxyXG4gKiBEZXRlY3RzIGhvbGlkYXkgZXZlbnRzIGFuZCBncm91cHMgY29uc2VjdXRpdmUgaG9saWRheXMgZm9yIGJldHRlciBkaXNwbGF5XHJcbiAqL1xyXG5cclxuaW1wb3J0IHtcclxuXHRJY3NFdmVudCxcclxuXHRJY3NIb2xpZGF5Q29uZmlnLFxyXG5cdEljc0hvbGlkYXlHcm91cCxcclxuXHRJY3NFdmVudFdpdGhIb2xpZGF5LFxyXG59IGZyb20gXCIuLi90eXBlcy9pY3NcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBIb2xpZGF5RGV0ZWN0b3Ige1xyXG5cdC8qKlxyXG5cdCAqIERldGVjdCBpZiBhbiBldmVudCBpcyBhIGhvbGlkYXkgYmFzZWQgb24gY29uZmlndXJhdGlvblxyXG5cdCAqL1xyXG5cdHN0YXRpYyBpc0hvbGlkYXkoZXZlbnQ6IEljc0V2ZW50LCBjb25maWc6IEljc0hvbGlkYXlDb25maWcpOiBib29sZWFuIHtcclxuXHRcdGlmICghY29uZmlnLmVuYWJsZWQpIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHsgZGV0ZWN0aW9uUGF0dGVybnMgfSA9IGNvbmZpZztcclxuXHJcblx0XHQvLyBDaGVjayBzdW1tYXJ5IHBhdHRlcm5zXHJcblx0XHRpZiAoZGV0ZWN0aW9uUGF0dGVybnMuc3VtbWFyeSkge1xyXG5cdFx0XHRmb3IgKGNvbnN0IHBhdHRlcm4gb2YgZGV0ZWN0aW9uUGF0dGVybnMuc3VtbWFyeSkge1xyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRjb25zdCByZWdleCA9IG5ldyBSZWdFeHAocGF0dGVybiwgXCJpXCIpO1xyXG5cdFx0XHRcdFx0aWYgKHJlZ2V4LnRlc3QoZXZlbnQuc3VtbWFyeSkpIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUud2FybihgSW52YWxpZCByZWdleCBwYXR0ZXJuOiAke3BhdHRlcm59YCwgZXJyb3IpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENoZWNrIGRlc2NyaXB0aW9uIHBhdHRlcm5zXHJcblx0XHRpZiAoZGV0ZWN0aW9uUGF0dGVybnMuZGVzY3JpcHRpb24gJiYgZXZlbnQuZGVzY3JpcHRpb24pIHtcclxuXHRcdFx0Zm9yIChjb25zdCBwYXR0ZXJuIG9mIGRldGVjdGlvblBhdHRlcm5zLmRlc2NyaXB0aW9uKSB7XHJcblx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdGNvbnN0IHJlZ2V4ID0gbmV3IFJlZ0V4cChwYXR0ZXJuLCBcImlcIik7XHJcblx0XHRcdFx0XHRpZiAocmVnZXgudGVzdChldmVudC5kZXNjcmlwdGlvbikpIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUud2FybihgSW52YWxpZCByZWdleCBwYXR0ZXJuOiAke3BhdHRlcm59YCwgZXJyb3IpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENoZWNrIGNhdGVnb3JpZXNcclxuXHRcdGlmIChkZXRlY3Rpb25QYXR0ZXJucy5jYXRlZ29yaWVzICYmIGV2ZW50LmNhdGVnb3JpZXMpIHtcclxuXHRcdFx0Zm9yIChjb25zdCBjYXRlZ29yeSBvZiBkZXRlY3Rpb25QYXR0ZXJucy5jYXRlZ29yaWVzKSB7XHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0ZXZlbnQuY2F0ZWdvcmllcy5zb21lKChjYXQpID0+XHJcblx0XHRcdFx0XHRcdGNhdC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGNhdGVnb3J5LnRvTG93ZXJDYXNlKCkpXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBDaGVjayBrZXl3b3JkcyBpbiBzdW1tYXJ5IGFuZCBkZXNjcmlwdGlvblxyXG5cdFx0aWYgKGRldGVjdGlvblBhdHRlcm5zLmtleXdvcmRzKSB7XHJcblx0XHRcdGNvbnN0IHRleHRUb0NoZWNrID0gW2V2ZW50LnN1bW1hcnksIGV2ZW50LmRlc2NyaXB0aW9uIHx8IFwiXCJdLmpvaW4oXHJcblx0XHRcdFx0XCIgXCJcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGZvciAoY29uc3Qga2V5d29yZCBvZiBkZXRlY3Rpb25QYXR0ZXJucy5rZXl3b3Jkcykge1xyXG5cdFx0XHRcdGlmICh0ZXh0VG9DaGVjay50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGtleXdvcmQudG9Mb3dlckNhc2UoKSkpIHtcclxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdyb3VwIGNvbnNlY3V0aXZlIGhvbGlkYXkgZXZlbnRzXHJcblx0ICovXHJcblx0c3RhdGljIGdyb3VwQ29uc2VjdXRpdmVIb2xpZGF5cyhcclxuXHRcdGV2ZW50czogSWNzRXZlbnRbXSxcclxuXHRcdGNvbmZpZzogSWNzSG9saWRheUNvbmZpZ1xyXG5cdCk6IEljc0hvbGlkYXlHcm91cFtdIHtcclxuXHRcdGlmICghY29uZmlnLmVuYWJsZWQgfHwgY29uZmlnLmdyb3VwaW5nU3RyYXRlZ3kgPT09IFwibm9uZVwiKSB7XHJcblx0XHRcdHJldHVybiBbXTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBGaWx0ZXIgYW5kIHNvcnQgaG9saWRheSBldmVudHNcclxuXHRcdGNvbnN0IGhvbGlkYXlFdmVudHMgPSBldmVudHNcclxuXHRcdFx0LmZpbHRlcigoZXZlbnQpID0+IHRoaXMuaXNIb2xpZGF5KGV2ZW50LCBjb25maWcpKVxyXG5cdFx0XHQuc29ydCgoYSwgYikgPT4gYS5kdHN0YXJ0LmdldFRpbWUoKSAtIGIuZHRzdGFydC5nZXRUaW1lKCkpO1xyXG5cclxuXHRcdGlmIChob2xpZGF5RXZlbnRzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRyZXR1cm4gW107XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgZ3JvdXBzOiBJY3NIb2xpZGF5R3JvdXBbXSA9IFtdO1xyXG5cdFx0bGV0IGN1cnJlbnRHcm91cDogSWNzRXZlbnRbXSA9IFtob2xpZGF5RXZlbnRzWzBdXTtcclxuXHJcblx0XHRmb3IgKGxldCBpID0gMTsgaSA8IGhvbGlkYXlFdmVudHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0Y29uc3QgY3VycmVudEV2ZW50ID0gaG9saWRheUV2ZW50c1tpXTtcclxuXHRcdFx0Y29uc3QgbGFzdEV2ZW50ID0gY3VycmVudEdyb3VwW2N1cnJlbnRHcm91cC5sZW5ndGggLSAxXTtcclxuXHJcblx0XHRcdC8vIENhbGN1bGF0ZSBnYXAgaW4gZGF5c1xyXG5cdFx0XHRjb25zdCBnYXBEYXlzID0gdGhpcy5jYWxjdWxhdGVEYXlzQmV0d2VlbihcclxuXHRcdFx0XHRsYXN0RXZlbnQuZHRlbmQgfHwgbGFzdEV2ZW50LmR0c3RhcnQsXHJcblx0XHRcdFx0Y3VycmVudEV2ZW50LmR0c3RhcnRcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGlmIChnYXBEYXlzIDw9IGNvbmZpZy5tYXhHYXBEYXlzKSB7XHJcblx0XHRcdFx0Ly8gQWRkIHRvIGN1cnJlbnQgZ3JvdXBcclxuXHRcdFx0XHRjdXJyZW50R3JvdXAucHVzaChjdXJyZW50RXZlbnQpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIENyZWF0ZSBncm91cCBmcm9tIGN1cnJlbnQgZXZlbnRzIGFuZCBzdGFydCBuZXcgZ3JvdXBcclxuXHRcdFx0XHRpZiAoY3VycmVudEdyb3VwLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRcdGdyb3Vwcy5wdXNoKHRoaXMuY3JlYXRlSG9saWRheUdyb3VwKGN1cnJlbnRHcm91cCwgY29uZmlnKSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGN1cnJlbnRHcm91cCA9IFtjdXJyZW50RXZlbnRdO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWRkIHRoZSBsYXN0IGdyb3VwXHJcblx0XHRpZiAoY3VycmVudEdyb3VwLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0Z3JvdXBzLnB1c2godGhpcy5jcmVhdGVIb2xpZGF5R3JvdXAoY3VycmVudEdyb3VwLCBjb25maWcpKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gZ3JvdXBzO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUHJvY2VzcyBldmVudHMgd2l0aCBob2xpZGF5IGRldGVjdGlvbiBhbmQgZ3JvdXBpbmdcclxuXHQgKi9cclxuXHRzdGF0aWMgcHJvY2Vzc0V2ZW50c1dpdGhIb2xpZGF5RGV0ZWN0aW9uKFxyXG5cdFx0ZXZlbnRzOiBJY3NFdmVudFtdLFxyXG5cdFx0Y29uZmlnOiBJY3NIb2xpZGF5Q29uZmlnXHJcblx0KTogSWNzRXZlbnRXaXRoSG9saWRheVtdIHtcclxuXHRcdGlmICghY29uZmlnLmVuYWJsZWQpIHtcclxuXHRcdFx0Ly8gUmV0dXJuIGV2ZW50cyBhcy1pcyB3aXRoIGhvbGlkYXkgZmxhZ3Mgc2V0IHRvIGZhbHNlXHJcblx0XHRcdHJldHVybiBldmVudHMubWFwKChldmVudCkgPT4gKHtcclxuXHRcdFx0XHQuLi5ldmVudCxcclxuXHRcdFx0XHRpc0hvbGlkYXk6IGZhbHNlLFxyXG5cdFx0XHRcdHNob3dJbkZvcmVjYXN0OiB0cnVlLFxyXG5cdFx0XHR9KSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gR3JvdXAgY29uc2VjdXRpdmUgaG9saWRheXNcclxuXHRcdGNvbnN0IGhvbGlkYXlHcm91cHMgPSB0aGlzLmdyb3VwQ29uc2VjdXRpdmVIb2xpZGF5cyhldmVudHMsIGNvbmZpZyk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGEgbWFwIG9mIGV2ZW50IFVJRHMgdG8gdGhlaXIgaG9saWRheSBncm91cHNcclxuXHRcdGNvbnN0IGV2ZW50VG9Hcm91cE1hcCA9IG5ldyBNYXA8c3RyaW5nLCBJY3NIb2xpZGF5R3JvdXA+KCk7XHJcblx0XHRob2xpZGF5R3JvdXBzLmZvckVhY2goKGdyb3VwKSA9PiB7XHJcblx0XHRcdGdyb3VwLmV2ZW50cy5mb3JFYWNoKChldmVudCkgPT4ge1xyXG5cdFx0XHRcdGV2ZW50VG9Hcm91cE1hcC5zZXQoZXZlbnQudWlkLCBncm91cCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gUHJvY2VzcyBlYWNoIGV2ZW50XHJcblx0XHRjb25zdCBwcm9jZXNzZWRFdmVudHM6IEljc0V2ZW50V2l0aEhvbGlkYXlbXSA9IFtdO1xyXG5cclxuXHRcdGV2ZW50cy5mb3JFYWNoKChldmVudCkgPT4ge1xyXG5cdFx0XHRjb25zdCBpc0hvbGlkYXkgPSB0aGlzLmlzSG9saWRheShldmVudCwgY29uZmlnKTtcclxuXHRcdFx0Y29uc3QgaG9saWRheUdyb3VwID0gZXZlbnRUb0dyb3VwTWFwLmdldChldmVudC51aWQpO1xyXG5cclxuXHRcdFx0bGV0IHNob3dJbkZvcmVjYXN0ID0gdHJ1ZTtcclxuXHJcblx0XHRcdGlmIChpc0hvbGlkYXkgJiYgaG9saWRheUdyb3VwKSB7XHJcblx0XHRcdFx0Ly8gQXBwbHkgZ3JvdXBpbmcgc3RyYXRlZ3lcclxuXHRcdFx0XHRzd2l0Y2ggKGNvbmZpZy5ncm91cGluZ1N0cmF0ZWd5KSB7XHJcblx0XHRcdFx0XHRjYXNlIFwiZmlyc3Qtb25seVwiOlxyXG5cdFx0XHRcdFx0XHQvLyBPbmx5IHNob3cgdGhlIGZpcnN0IGV2ZW50IGluIHRoZSBncm91cFxyXG5cdFx0XHRcdFx0XHRzaG93SW5Gb3JlY2FzdCA9XHJcblx0XHRcdFx0XHRcdFx0aG9saWRheUdyb3VwLmV2ZW50c1swXS51aWQgPT09IGV2ZW50LnVpZDtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIFwic3VtbWFyeVwiOlxyXG5cdFx0XHRcdFx0XHQvLyBTaG93IGEgc3VtbWFyeSBldmVudCAoZmlyc3QgZXZlbnQgd2l0aCBtb2RpZmllZCB0aXRsZSlcclxuXHRcdFx0XHRcdFx0c2hvd0luRm9yZWNhc3QgPVxyXG5cdFx0XHRcdFx0XHRcdGhvbGlkYXlHcm91cC5ldmVudHNbMF0udWlkID09PSBldmVudC51aWQ7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcInJhbmdlXCI6XHJcblx0XHRcdFx0XHRcdC8vIFNob3cgZmlyc3QgYW5kIGxhc3QgZXZlbnRzIG9ubHlcclxuXHRcdFx0XHRcdFx0Y29uc3QgaXNGaXJzdCA9XHJcblx0XHRcdFx0XHRcdFx0aG9saWRheUdyb3VwLmV2ZW50c1swXS51aWQgPT09IGV2ZW50LnVpZDtcclxuXHRcdFx0XHRcdFx0Y29uc3QgaXNMYXN0ID1cclxuXHRcdFx0XHRcdFx0XHRob2xpZGF5R3JvdXAuZXZlbnRzW2hvbGlkYXlHcm91cC5ldmVudHMubGVuZ3RoIC0gMV1cclxuXHRcdFx0XHRcdFx0XHRcdC51aWQgPT09IGV2ZW50LnVpZDtcclxuXHRcdFx0XHRcdFx0c2hvd0luRm9yZWNhc3QgPSBpc0ZpcnN0IHx8IGlzTGFzdDtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdFx0XHRzaG93SW5Gb3JlY2FzdCA9IHRydWU7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBPdmVycmlkZSB3aXRoIGNvbmZpZyBzZXR0aW5nXHJcblx0XHRcdFx0aWYgKCFjb25maWcuc2hvd0luRm9yZWNhc3QpIHtcclxuXHRcdFx0XHRcdHNob3dJbkZvcmVjYXN0ID0gZmFsc2U7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRwcm9jZXNzZWRFdmVudHMucHVzaCh7XHJcblx0XHRcdFx0Li4uZXZlbnQsXHJcblx0XHRcdFx0aXNIb2xpZGF5LFxyXG5cdFx0XHRcdGhvbGlkYXlHcm91cCxcclxuXHRcdFx0XHRzaG93SW5Gb3JlY2FzdCxcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gcHJvY2Vzc2VkRXZlbnRzO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ3JlYXRlIGEgaG9saWRheSBncm91cCBmcm9tIGNvbnNlY3V0aXZlIGV2ZW50c1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgc3RhdGljIGNyZWF0ZUhvbGlkYXlHcm91cChcclxuXHRcdGV2ZW50czogSWNzRXZlbnRbXSxcclxuXHRcdGNvbmZpZzogSWNzSG9saWRheUNvbmZpZ1xyXG5cdCk6IEljc0hvbGlkYXlHcm91cCB7XHJcblx0XHRjb25zdCBzb3J0ZWRFdmVudHMgPSBldmVudHMuc29ydChcclxuXHRcdFx0KGEsIGIpID0+IGEuZHRzdGFydC5nZXRUaW1lKCkgLSBiLmR0c3RhcnQuZ2V0VGltZSgpXHJcblx0XHQpO1xyXG5cdFx0Y29uc3QgZmlyc3RFdmVudCA9IHNvcnRlZEV2ZW50c1swXTtcclxuXHRcdGNvbnN0IGxhc3RFdmVudCA9IHNvcnRlZEV2ZW50c1tzb3J0ZWRFdmVudHMubGVuZ3RoIC0gMV07XHJcblxyXG5cdFx0Y29uc3Qgc3RhcnREYXRlID0gZmlyc3RFdmVudC5kdHN0YXJ0O1xyXG5cdFx0Y29uc3QgZW5kRGF0ZSA9IGxhc3RFdmVudC5kdGVuZCB8fCBsYXN0RXZlbnQuZHRzdGFydDtcclxuXHRcdGNvbnN0IGlzTXVsdGlEYXkgPSBzb3J0ZWRFdmVudHMubGVuZ3RoID4gMTtcclxuXHJcblx0XHQvLyBHZW5lcmF0ZSBncm91cCB0aXRsZSBiYXNlZCBvbiBzdHJhdGVneVxyXG5cdFx0bGV0IHRpdGxlID0gZmlyc3RFdmVudC5zdW1tYXJ5O1xyXG5cdFx0aWYgKGNvbmZpZy5ncm91cGluZ1N0cmF0ZWd5ID09PSBcInN1bW1hcnlcIiAmJiBpc011bHRpRGF5KSB7XHJcblx0XHRcdGlmIChjb25maWcuZ3JvdXBEaXNwbGF5Rm9ybWF0KSB7XHJcblx0XHRcdFx0dGl0bGUgPSBjb25maWcuZ3JvdXBEaXNwbGF5Rm9ybWF0XHJcblx0XHRcdFx0XHQucmVwbGFjZShcInt0aXRsZX1cIiwgZmlyc3RFdmVudC5zdW1tYXJ5KVxyXG5cdFx0XHRcdFx0LnJlcGxhY2UoXCJ7Y291bnR9XCIsIHNvcnRlZEV2ZW50cy5sZW5ndGgudG9TdHJpbmcoKSlcclxuXHRcdFx0XHRcdC5yZXBsYWNlKFwie3N0YXJ0RGF0ZX1cIiwgdGhpcy5mb3JtYXREYXRlKHN0YXJ0RGF0ZSkpXHJcblx0XHRcdFx0XHQucmVwbGFjZShcIntlbmREYXRlfVwiLCB0aGlzLmZvcm1hdERhdGUoZW5kRGF0ZSkpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRpdGxlID0gYCR7Zmlyc3RFdmVudC5zdW1tYXJ5fSAoJHtzb3J0ZWRFdmVudHMubGVuZ3RofSBkYXlzKWA7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSBpZiAoY29uZmlnLmdyb3VwaW5nU3RyYXRlZ3kgPT09IFwicmFuZ2VcIiAmJiBpc011bHRpRGF5KSB7XHJcblx0XHRcdHRpdGxlID0gYCR7Zmlyc3RFdmVudC5zdW1tYXJ5fSAtICR7dGhpcy5mb3JtYXREYXRlUmFuZ2UoXHJcblx0XHRcdFx0c3RhcnREYXRlLFxyXG5cdFx0XHRcdGVuZERhdGVcclxuXHRcdFx0KX1gO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGlkOiBgaG9saWRheS1ncm91cC0ke2ZpcnN0RXZlbnQudWlkfS0ke3NvcnRlZEV2ZW50cy5sZW5ndGh9YCxcclxuXHRcdFx0dGl0bGUsXHJcblx0XHRcdHN0YXJ0RGF0ZSxcclxuXHRcdFx0ZW5kRGF0ZSxcclxuXHRcdFx0ZXZlbnRzOiBzb3J0ZWRFdmVudHMsXHJcblx0XHRcdHNvdXJjZTogZmlyc3RFdmVudC5zb3VyY2UsXHJcblx0XHRcdGlzTXVsdGlEYXksXHJcblx0XHRcdGRpc3BsYXlTdHJhdGVneTpcclxuXHRcdFx0XHRjb25maWcuZ3JvdXBpbmdTdHJhdGVneSA9PT0gXCJub25lXCJcclxuXHRcdFx0XHRcdD8gXCJmaXJzdC1vbmx5XCJcclxuXHRcdFx0XHRcdDogY29uZmlnLmdyb3VwaW5nU3RyYXRlZ3ksXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2FsY3VsYXRlIGRheXMgYmV0d2VlbiB0d28gZGF0ZXNcclxuXHQgKi9cclxuXHRwcml2YXRlIHN0YXRpYyBjYWxjdWxhdGVEYXlzQmV0d2VlbihkYXRlMTogRGF0ZSwgZGF0ZTI6IERhdGUpOiBudW1iZXIge1xyXG5cdFx0Y29uc3Qgb25lRGF5ID0gMjQgKiA2MCAqIDYwICogMTAwMDsgLy8gaG91cnMqbWludXRlcypzZWNvbmRzKm1pbGxpc2Vjb25kc1xyXG5cdFx0Y29uc3QgZmlyc3REYXRlID0gbmV3IERhdGUoZGF0ZTEpO1xyXG5cdFx0Y29uc3Qgc2Vjb25kRGF0ZSA9IG5ldyBEYXRlKGRhdGUyKTtcclxuXHJcblx0XHQvLyBSZXNldCB0aW1lIHRvIHN0YXJ0IG9mIGRheSBmb3IgYWNjdXJhdGUgZGF5IGNhbGN1bGF0aW9uXHJcblx0XHRmaXJzdERhdGUuc2V0SG91cnMoMCwgMCwgMCwgMCk7XHJcblx0XHRzZWNvbmREYXRlLnNldEhvdXJzKDAsIDAsIDAsIDApO1xyXG5cclxuXHRcdHJldHVybiBNYXRoLnJvdW5kKFxyXG5cdFx0XHRNYXRoLmFicygoZmlyc3REYXRlLmdldFRpbWUoKSAtIHNlY29uZERhdGUuZ2V0VGltZSgpKSAvIG9uZURheSlcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBGb3JtYXQgZGF0ZSBmb3IgZGlzcGxheVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgc3RhdGljIGZvcm1hdERhdGUoZGF0ZTogRGF0ZSk6IHN0cmluZyB7XHJcblx0XHRyZXR1cm4gZGF0ZS50b0xvY2FsZURhdGVTdHJpbmcoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEZvcm1hdCBkYXRlIHJhbmdlIGZvciBkaXNwbGF5XHJcblx0ICovXHJcblx0cHJpdmF0ZSBzdGF0aWMgZm9ybWF0RGF0ZVJhbmdlKHN0YXJ0RGF0ZTogRGF0ZSwgZW5kRGF0ZTogRGF0ZSk6IHN0cmluZyB7XHJcblx0XHRjb25zdCBzdGFydCA9IHRoaXMuZm9ybWF0RGF0ZShzdGFydERhdGUpO1xyXG5cdFx0Y29uc3QgZW5kID0gdGhpcy5mb3JtYXREYXRlKGVuZERhdGUpO1xyXG5cdFx0cmV0dXJuIHN0YXJ0ID09PSBlbmQgPyBzdGFydCA6IGAke3N0YXJ0fSAtICR7ZW5kfWA7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgZGVmYXVsdCBob2xpZGF5IGNvbmZpZ3VyYXRpb25cclxuXHQgKi9cclxuXHRzdGF0aWMgZ2V0RGVmYXVsdENvbmZpZygpOiBJY3NIb2xpZGF5Q29uZmlnIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHRkZXRlY3Rpb25QYXR0ZXJuczoge1xyXG5cdFx0XHRcdHN1bW1hcnk6IFtcclxuXHRcdFx0XHRcdFwiaG9saWRheVwiLFxyXG5cdFx0XHRcdFx0XCJ2YWNhdGlvblwiLFxyXG5cdFx0XHRcdFx0XCLlhazlgYdcIixcclxuXHRcdFx0XHRcdFwi5YGH5pyfXCIsXHJcblx0XHRcdFx0XHRcIuiKguaXpVwiLFxyXG5cdFx0XHRcdFx0XCLmmKXoioJcIixcclxuXHRcdFx0XHRcdFwi5Zu95bqGXCIsXHJcblx0XHRcdFx0XHRcIuS4reeni1wiLFxyXG5cdFx0XHRcdFx0XCLmuIXmmI5cIixcclxuXHRcdFx0XHRcdFwi5Yqz5Yqo6IqCXCIsXHJcblx0XHRcdFx0XHRcIuerr+WNiFwiLFxyXG5cdFx0XHRcdFx0XCLlhYPml6ZcIixcclxuXHRcdFx0XHRcdFwiQ2hyaXN0bWFzXCIsXHJcblx0XHRcdFx0XHRcIk5ldyBZZWFyXCIsXHJcblx0XHRcdFx0XHRcIkVhc3RlclwiLFxyXG5cdFx0XHRcdFx0XCJUaGFua3NnaXZpbmdcIixcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdGtleXdvcmRzOiBbXHJcblx0XHRcdFx0XHRcImhvbGlkYXlcIixcclxuXHRcdFx0XHRcdFwidmFjYXRpb25cIixcclxuXHRcdFx0XHRcdFwiZGF5IG9mZlwiLFxyXG5cdFx0XHRcdFx0XCJwdWJsaWMgaG9saWRheVwiLFxyXG5cdFx0XHRcdFx0XCJiYW5rIGhvbGlkYXlcIixcclxuXHRcdFx0XHRcdFwi5YGH5pyfXCIsXHJcblx0XHRcdFx0XHRcIuS8keWBh1wiLFxyXG5cdFx0XHRcdFx0XCLoioLml6VcIixcclxuXHRcdFx0XHRcdFwi5YWs5YGHXCIsXHJcblx0XHRcdFx0XSxcclxuXHRcdFx0XHRjYXRlZ29yaWVzOiBbXCJob2xpZGF5XCIsIFwidmFjYXRpb25cIiwgXCLlgYfmnJ9cIiwgXCLoioLml6VcIl0sXHJcblx0XHRcdH0sXHJcblx0XHRcdGdyb3VwaW5nU3RyYXRlZ3k6IFwiZmlyc3Qtb25seVwiLFxyXG5cdFx0XHRtYXhHYXBEYXlzOiAxLFxyXG5cdFx0XHRzaG93SW5Gb3JlY2FzdDogZmFsc2UsXHJcblx0XHRcdHNob3dJbkNhbGVuZGFyOiB0cnVlLFxyXG5cdFx0XHRncm91cERpc3BsYXlGb3JtYXQ6IFwie3RpdGxlfSAoe2NvdW50fSBkYXlzKVwiLFxyXG5cdFx0fTtcclxuXHR9XHJcbn1cclxuIl19