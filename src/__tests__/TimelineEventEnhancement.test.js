// Date type priority for deduplication (higher number = higher priority)
const DATE_TYPE_PRIORITY = {
    due: 4,
    scheduled: 3,
    start: 2,
    completed: 1,
};
// Mock the TimelineSidebarView class for testing
class MockTimelineSidebarView {
    /**
     * Create time information from task metadata and enhanced time components
     */
    createTimeInfoFromTask(task, date, type) {
        // Check if task has enhanced metadata with time components
        const enhancedMetadata = task.metadata;
        const timeComponents = enhancedMetadata === null || enhancedMetadata === void 0 ? void 0 : enhancedMetadata.timeComponents;
        const enhancedDates = enhancedMetadata === null || enhancedMetadata === void 0 ? void 0 : enhancedMetadata.enhancedDates;
        if (!timeComponents) {
            // No time components available, use default time display
            return {
                primaryTime: date,
                isRange: false,
                displayFormat: "date-time",
            };
        }
        // Determine which time component to use based on the date type
        let relevantTimeComponent;
        let relevantEndTime;
        switch (type) {
            case "start":
                relevantTimeComponent = timeComponents.startTime;
                if (timeComponents.endTime && (enhancedDates === null || enhancedDates === void 0 ? void 0 : enhancedDates.endDateTime)) {
                    relevantEndTime = enhancedDates.endDateTime;
                }
                break;
            case "due":
                relevantTimeComponent = timeComponents.dueTime;
                break;
            case "scheduled":
                relevantTimeComponent = timeComponents.scheduledTime;
                break;
            default:
                relevantTimeComponent = undefined;
        }
        if (!relevantTimeComponent) {
            // No specific time component for this date type
            return {
                primaryTime: date,
                isRange: false,
                displayFormat: "date-time",
            };
        }
        // Create enhanced datetime by combining date and time component
        const enhancedDateTime = new Date(date);
        enhancedDateTime.setUTCHours(relevantTimeComponent.hour, relevantTimeComponent.minute, relevantTimeComponent.second || 0, 0);
        // Determine if this is a time range
        const isRange = relevantTimeComponent.isRange && !!relevantEndTime;
        return {
            primaryTime: enhancedDateTime,
            endTime: relevantEndTime,
            isRange,
            timeComponent: relevantTimeComponent,
            displayFormat: isRange ? "range" : "time-only",
        };
    }
    /**
     * Format a time component for display
     */
    formatTimeComponent(timeComponent) {
        const hour = timeComponent.hour.toString().padStart(2, '0');
        const minute = timeComponent.minute.toString().padStart(2, '0');
        if (timeComponent.second !== undefined) {
            const second = timeComponent.second.toString().padStart(2, '0');
            return `${hour}:${minute}:${second}`;
        }
        return `${hour}:${minute}`;
    }
    /**
     * Extract dates from task with enhanced datetime support
     */
    extractDatesFromTask(task) {
        // Task-level deduplication: ensure each task appears only once in timeline
        // Check if task has enhanced metadata with time components
        const enhancedMetadata = task.metadata;
        const timeComponents = enhancedMetadata === null || enhancedMetadata === void 0 ? void 0 : enhancedMetadata.timeComponents;
        const enhancedDates = enhancedMetadata === null || enhancedMetadata === void 0 ? void 0 : enhancedMetadata.enhancedDates;
        // For completed tasks: prioritize due date, fallback to completed date
        if (task.completed) {
            if (task.metadata.dueDate) {
                // Use enhanced due datetime if available, otherwise use original timestamp
                const dueDate = (enhancedDates === null || enhancedDates === void 0 ? void 0 : enhancedDates.dueDateTime) || new Date(task.metadata.dueDate);
                return [{ date: dueDate, type: "due" }];
            }
            else if (task.metadata.completedDate) {
                return [{ date: new Date(task.metadata.completedDate), type: "completed" }];
            }
        }
        // For non-completed tasks: select single highest priority date with enhanced datetime support
        const dates = [];
        if (task.metadata.dueDate) {
            // Use enhanced due datetime if available
            const dueDate = (enhancedDates === null || enhancedDates === void 0 ? void 0 : enhancedDates.dueDateTime) || new Date(task.metadata.dueDate);
            dates.push({ date: dueDate, type: "due" });
        }
        if (task.metadata.scheduledDate) {
            // Use enhanced scheduled datetime if available
            const scheduledDate = (enhancedDates === null || enhancedDates === void 0 ? void 0 : enhancedDates.scheduledDateTime) || new Date(task.metadata.scheduledDate);
            dates.push({
                date: scheduledDate,
                type: "scheduled",
            });
        }
        if (task.metadata.startDate) {
            // Use enhanced start datetime if available
            const startDate = (enhancedDates === null || enhancedDates === void 0 ? void 0 : enhancedDates.startDateTime) || new Date(task.metadata.startDate);
            dates.push({
                date: startDate,
                type: "start",
            });
        }
        // For non-completed tasks, select the highest priority date
        if (dates.length > 0) {
            const highestPriorityDate = dates.reduce((highest, current) => {
                const currentPriority = DATE_TYPE_PRIORITY[current.type] || 0;
                const highestPriority = DATE_TYPE_PRIORITY[highest.type] || 0;
                return currentPriority > highestPriority ? current : highest;
            });
            return [highestPriorityDate];
        }
        // Fallback: if no planning dates exist, return empty array for simplicity in tests
        const allDates = [];
        if (task.metadata.completedDate) {
            allDates.push({
                date: new Date(task.metadata.completedDate),
                type: "completed",
            });
        }
        return allDates;
    }
    /**
     * Sort events by time within a day for chronological ordering
     */
    sortEventsByTime(events) {
        return events.sort((a, b) => {
            var _a, _b;
            // Get the primary time for sorting - use enhanced time if available
            const timeA = ((_a = a.timeInfo) === null || _a === void 0 ? void 0 : _a.primaryTime) || a.time;
            const timeB = ((_b = b.timeInfo) === null || _b === void 0 ? void 0 : _b.primaryTime) || b.time;
            // Sort by time of day (earlier times first)
            const timeComparison = timeA.getTime() - timeB.getTime();
            if (timeComparison !== 0) {
                return timeComparison;
            }
            // If times are equal, sort by task content for consistent ordering
            return a.content.localeCompare(b.content);
        });
    }
    /**
     * Render time information for a timeline event
     */
    renderEventTime(timeEl, event) {
        var _a;
        if ((_a = event.timeInfo) === null || _a === void 0 ? void 0 : _a.timeComponent) {
            // Use parsed time component for accurate display
            const { timeComponent, isRange, endTime } = event.timeInfo;
            if (isRange && endTime) {
                // Display time range
                const startTimeStr = this.formatTimeComponent(timeComponent);
                const endTimeStr = global.moment(endTime).format("HH:mm");
                timeEl.setText(`${startTimeStr}-${endTimeStr}`);
                timeEl.addClass("timeline-event-time-range");
            }
            else {
                // Display single time
                timeEl.setText(this.formatTimeComponent(timeComponent));
                timeEl.addClass("timeline-event-time-single");
            }
        }
        else {
            // Fallback to default time display
            timeEl.setText(global.moment(event.time).format("HH:mm"));
            timeEl.addClass("timeline-event-time-default");
        }
    }
    /**
     * Check if an event has a specific time (not just a date)
     */
    hasSpecificTime(event) {
        var _a, _b;
        // Check if the event has enhanced time information
        if ((_a = event.timeInfo) === null || _a === void 0 ? void 0 : _a.timeComponent) {
            return true;
        }
        // Check if the original time has non-zero hours/minutes (not just midnight)
        const time = ((_b = event.timeInfo) === null || _b === void 0 ? void 0 : _b.primaryTime) || event.time;
        return time.getUTCHours() !== 0 || time.getUTCMinutes() !== 0 || time.getUTCSeconds() !== 0;
    }
    /**
     * Generate a time group key for grouping events
     */
    getTimeGroupKey(time, event) {
        var _a;
        if ((_a = event.timeInfo) === null || _a === void 0 ? void 0 : _a.timeComponent) {
            // Use the formatted time component for precise grouping
            return this.formatTimeComponent(event.timeInfo.timeComponent);
        }
        // Fallback to hour:minute format
        return global.moment(time).format("HH:mm");
    }
}
describe("Timeline Event Enhancement", () => {
    let mockTimeline;
    beforeEach(() => {
        mockTimeline = new MockTimelineSidebarView();
    });
    describe("createTimeInfoFromTask", () => {
        it("should return default time info when no time components are available", () => {
            const task = {
                id: "test-1",
                content: "Test task",
                filePath: "test.md",
                line: 1,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Test task",
                metadata: {
                    tags: [],
                    children: [],
                },
            };
            const date = new Date("2024-01-15T00:00:00Z");
            const result = mockTimeline.createTimeInfoFromTask(task, date, "due");
            expect(result).toEqual({
                primaryTime: date,
                isRange: false,
                displayFormat: "date-time",
            });
        });
        it("should create time info with single time component for due date", () => {
            const timeComponent = {
                hour: 14,
                minute: 30,
                originalText: "2:30 PM",
                isRange: false,
            };
            const task = {
                id: "test-2",
                content: "Meeting at 2:30 PM",
                filePath: "test.md",
                line: 1,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Meeting at 2:30 PM",
                metadata: {
                    tags: [],
                    children: [],
                    timeComponents: {
                        dueTime: timeComponent,
                    },
                },
            };
            const date = new Date("2024-01-15T00:00:00Z");
            const result = mockTimeline.createTimeInfoFromTask(task, date, "due");
            const expectedDateTime = new Date("2024-01-15T14:30:00Z");
            expect(result.primaryTime).toEqual(expectedDateTime);
            expect(result.isRange).toBe(false);
            expect(result.displayFormat).toBe("time-only");
            expect(result.timeComponent).toEqual(timeComponent);
        });
        it("should create time info with time range for start date", () => {
            const startTimeComponent = {
                hour: 9,
                minute: 0,
                originalText: "9:00-17:00",
                isRange: true,
            };
            const endTimeComponent = {
                hour: 17,
                minute: 0,
                originalText: "9:00-17:00",
                isRange: true,
            };
            const endDateTime = new Date("2024-01-15T17:00:00Z");
            const task = {
                id: "test-3",
                content: "Workshop 9:00-17:00",
                filePath: "test.md",
                line: 1,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Workshop 9:00-17:00",
                metadata: {
                    tags: [],
                    children: [],
                    timeComponents: {
                        startTime: startTimeComponent,
                        endTime: endTimeComponent,
                    },
                    enhancedDates: {
                        endDateTime: endDateTime,
                    },
                },
            };
            const date = new Date("2024-01-15T00:00:00Z");
            const result = mockTimeline.createTimeInfoFromTask(task, date, "start");
            const expectedDateTime = new Date("2024-01-15T09:00:00Z");
            expect(result.primaryTime).toEqual(expectedDateTime);
            expect(result.endTime).toEqual(endDateTime);
            expect(result.isRange).toBe(true);
            expect(result.displayFormat).toBe("range");
            expect(result.timeComponent).toEqual(startTimeComponent);
        });
        it("should handle scheduled time component", () => {
            const timeComponent = {
                hour: 10,
                minute: 15,
                second: 30,
                originalText: "10:15:30",
                isRange: false,
            };
            const task = {
                id: "test-4",
                content: "Call at 10:15:30",
                filePath: "test.md",
                line: 1,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Call at 10:15:30",
                metadata: {
                    tags: [],
                    children: [],
                    timeComponents: {
                        scheduledTime: timeComponent,
                    },
                },
            };
            const date = new Date("2024-01-15T00:00:00Z");
            const result = mockTimeline.createTimeInfoFromTask(task, date, "scheduled");
            const expectedDateTime = new Date("2024-01-15T10:15:30Z");
            expect(result.primaryTime).toEqual(expectedDateTime);
            expect(result.isRange).toBe(false);
            expect(result.displayFormat).toBe("time-only");
            expect(result.timeComponent).toEqual(timeComponent);
        });
        it("should return default when no matching time component for date type", () => {
            const timeComponent = {
                hour: 14,
                minute: 30,
                originalText: "2:30 PM",
                isRange: false,
            };
            const task = {
                id: "test-5",
                content: "Task with due time",
                filePath: "test.md",
                line: 1,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Task with due time",
                metadata: {
                    tags: [],
                    children: [],
                    timeComponents: {
                        dueTime: timeComponent,
                    },
                },
            };
            const date = new Date("2024-01-15T00:00:00Z");
            // Request start time info but only due time is available
            const result = mockTimeline.createTimeInfoFromTask(task, date, "start");
            expect(result).toEqual({
                primaryTime: date,
                isRange: false,
                displayFormat: "date-time",
            });
        });
    });
    describe("extractDatesFromTask", () => {
        it("should use enhanced datetime for due date when available", () => {
            const enhancedDueDateTime = new Date("2024-01-15T14:30:00Z");
            const task = {
                id: "test-enhanced-1",
                content: "Meeting at 2:30 PM",
                filePath: "test.md",
                line: 1,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Meeting at 2:30 PM",
                metadata: {
                    tags: [],
                    children: [],
                    dueDate: new Date("2024-01-15T00:00:00Z").getTime(),
                    enhancedDates: {
                        dueDateTime: enhancedDueDateTime,
                    },
                },
            };
            const result = mockTimeline.extractDatesFromTask(task);
            expect(result).toHaveLength(1);
            expect(result[0].date).toEqual(enhancedDueDateTime);
            expect(result[0].type).toBe("due");
        });
        it("should use enhanced datetime for scheduled date when available", () => {
            const enhancedScheduledDateTime = new Date("2024-01-15T09:15:00Z");
            const task = {
                id: "test-enhanced-2",
                content: "Call at 9:15 AM",
                filePath: "test.md",
                line: 1,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Call at 9:15 AM",
                metadata: {
                    tags: [],
                    children: [],
                    scheduledDate: new Date("2024-01-15T00:00:00Z").getTime(),
                    enhancedDates: {
                        scheduledDateTime: enhancedScheduledDateTime,
                    },
                },
            };
            const result = mockTimeline.extractDatesFromTask(task);
            expect(result).toHaveLength(1);
            expect(result[0].date).toEqual(enhancedScheduledDateTime);
            expect(result[0].type).toBe("scheduled");
        });
        it("should use enhanced datetime for start date when available", () => {
            const enhancedStartDateTime = new Date("2024-01-15T08:00:00Z");
            const task = {
                id: "test-enhanced-3",
                content: "Workshop starts at 8:00 AM",
                filePath: "test.md",
                line: 1,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Workshop starts at 8:00 AM",
                metadata: {
                    tags: [],
                    children: [],
                    startDate: new Date("2024-01-15T00:00:00Z").getTime(),
                    enhancedDates: {
                        startDateTime: enhancedStartDateTime,
                    },
                },
            };
            const result = mockTimeline.extractDatesFromTask(task);
            expect(result).toHaveLength(1);
            expect(result[0].date).toEqual(enhancedStartDateTime);
            expect(result[0].type).toBe("start");
        });
        it("should fallback to original timestamp when enhanced datetime not available", () => {
            const originalDueDate = new Date("2024-01-15T00:00:00Z");
            const task = {
                id: "test-fallback-1",
                content: "Task without enhanced datetime",
                filePath: "test.md",
                line: 1,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Task without enhanced datetime",
                metadata: {
                    tags: [],
                    children: [],
                    dueDate: originalDueDate.getTime(),
                },
            };
            const result = mockTimeline.extractDatesFromTask(task);
            expect(result).toHaveLength(1);
            expect(result[0].date).toEqual(originalDueDate);
            expect(result[0].type).toBe("due");
        });
        it("should prioritize due date over scheduled date with enhanced datetimes", () => {
            const enhancedDueDateTime = new Date("2024-01-15T14:30:00Z");
            const enhancedScheduledDateTime = new Date("2024-01-15T09:15:00Z");
            const task = {
                id: "test-priority-1",
                content: "Task with both due and scheduled times",
                filePath: "test.md",
                line: 1,
                completed: false,
                status: " ",
                originalMarkdown: "- [ ] Task with both due and scheduled times",
                metadata: {
                    tags: [],
                    children: [],
                    dueDate: new Date("2024-01-15T00:00:00Z").getTime(),
                    scheduledDate: new Date("2024-01-15T00:00:00Z").getTime(),
                    enhancedDates: {
                        dueDateTime: enhancedDueDateTime,
                        scheduledDateTime: enhancedScheduledDateTime,
                    },
                },
            };
            const result = mockTimeline.extractDatesFromTask(task);
            expect(result).toHaveLength(1);
            expect(result[0].date).toEqual(enhancedDueDateTime);
            expect(result[0].type).toBe("due");
        });
        it("should handle completed tasks with enhanced due datetime", () => {
            const enhancedDueDateTime = new Date("2024-01-15T14:30:00Z");
            const task = {
                id: "test-completed-1",
                content: "Completed meeting at 2:30 PM",
                filePath: "test.md",
                line: 1,
                completed: true,
                status: "x",
                originalMarkdown: "- [x] Completed meeting at 2:30 PM",
                metadata: {
                    tags: [],
                    children: [],
                    dueDate: new Date("2024-01-15T00:00:00Z").getTime(),
                    completedDate: new Date("2024-01-15T15:00:00Z").getTime(),
                    enhancedDates: {
                        dueDateTime: enhancedDueDateTime,
                    },
                },
            };
            const result = mockTimeline.extractDatesFromTask(task);
            expect(result).toHaveLength(1);
            expect(result[0].date).toEqual(enhancedDueDateTime);
            expect(result[0].type).toBe("due");
        });
    });
    describe("sortEventsByTime", () => {
        it("should sort events by time chronologically", () => {
            const events = [
                {
                    id: "event-3",
                    content: "Lunch",
                    time: new Date("2024-01-15T12:00:00Z"),
                    timeInfo: {
                        primaryTime: new Date("2024-01-15T12:00:00Z"),
                    },
                },
                {
                    id: "event-1",
                    content: "Morning meeting",
                    time: new Date("2024-01-15T09:00:00Z"),
                    timeInfo: {
                        primaryTime: new Date("2024-01-15T09:00:00Z"),
                    },
                },
                {
                    id: "event-2",
                    content: "Coffee break",
                    time: new Date("2024-01-15T10:30:00Z"),
                    timeInfo: {
                        primaryTime: new Date("2024-01-15T10:30:00Z"),
                    },
                },
            ];
            const sorted = mockTimeline.sortEventsByTime(events);
            expect(sorted[0].content).toBe("Morning meeting");
            expect(sorted[1].content).toBe("Coffee break");
            expect(sorted[2].content).toBe("Lunch");
        });
        it("should sort events with same time by content alphabetically", () => {
            const events = [
                {
                    id: "event-2",
                    content: "Zebra task",
                    time: new Date("2024-01-15T09:00:00Z"),
                    timeInfo: {
                        primaryTime: new Date("2024-01-15T09:00:00Z"),
                    },
                },
                {
                    id: "event-1",
                    content: "Alpha task",
                    time: new Date("2024-01-15T09:00:00Z"),
                    timeInfo: {
                        primaryTime: new Date("2024-01-15T09:00:00Z"),
                    },
                },
            ];
            const sorted = mockTimeline.sortEventsByTime(events);
            expect(sorted[0].content).toBe("Alpha task");
            expect(sorted[1].content).toBe("Zebra task");
        });
        it("should handle events without timeInfo by using fallback time", () => {
            const events = [
                {
                    id: "event-2",
                    content: "Enhanced task",
                    time: new Date("2024-01-15T10:00:00Z"),
                    timeInfo: {
                        primaryTime: new Date("2024-01-15T10:00:00Z"),
                    },
                },
                {
                    id: "event-1",
                    content: "Legacy task",
                    time: new Date("2024-01-15T09:00:00Z"),
                    // No timeInfo
                },
            ];
            const sorted = mockTimeline.sortEventsByTime(events);
            expect(sorted[0].content).toBe("Legacy task");
            expect(sorted[1].content).toBe("Enhanced task");
        });
    });
    describe("renderEventTime", () => {
        let mockTimeEl;
        beforeEach(() => {
            // Create a mock DOM element
            mockTimeEl = {
                setText: jest.fn(),
                addClass: jest.fn(),
            };
        });
        it("should render single time component with proper formatting", () => {
            const timeComponent = {
                hour: 14,
                minute: 30,
                originalText: "2:30 PM",
                isRange: false,
            };
            const event = {
                timeInfo: {
                    timeComponent,
                    isRange: false,
                },
            };
            mockTimeline.renderEventTime(mockTimeEl, event);
            expect(mockTimeEl.setText).toHaveBeenCalledWith("14:30");
            expect(mockTimeEl.addClass).toHaveBeenCalledWith("timeline-event-time-single");
        });
        it("should render time range with start and end times", () => {
            const timeComponent = {
                hour: 9,
                minute: 0,
                originalText: "9:00-17:00",
                isRange: true,
            };
            const endTime = new Date("2024-01-15T17:00:00Z");
            const event = {
                timeInfo: {
                    timeComponent,
                    isRange: true,
                    endTime,
                },
            };
            // Mock moment for the end time formatting
            const mockMoment = {
                format: jest.fn().mockReturnValue("17:00"),
            };
            global.moment = jest.fn().mockReturnValue(mockMoment);
            mockTimeline.renderEventTime(mockTimeEl, event);
            expect(mockTimeEl.setText).toHaveBeenCalledWith("09:00-17:00");
            expect(mockTimeEl.addClass).toHaveBeenCalledWith("timeline-event-time-range");
        });
        it("should render time component with seconds", () => {
            const timeComponent = {
                hour: 10,
                minute: 15,
                second: 30,
                originalText: "10:15:30",
                isRange: false,
            };
            const event = {
                timeInfo: {
                    timeComponent,
                    isRange: false,
                },
            };
            mockTimeline.renderEventTime(mockTimeEl, event);
            expect(mockTimeEl.setText).toHaveBeenCalledWith("10:15:30");
            expect(mockTimeEl.addClass).toHaveBeenCalledWith("timeline-event-time-single");
        });
        it("should fallback to default time display when no time component", () => {
            const event = {
                time: new Date("2024-01-15T14:30:00Z"),
                // No timeInfo
            };
            // Mock moment for the fallback
            const mockMoment = {
                format: jest.fn().mockReturnValue("14:30"),
            };
            global.moment = jest.fn().mockReturnValue(mockMoment);
            mockTimeline.renderEventTime(mockTimeEl, event);
            expect(mockTimeEl.setText).toHaveBeenCalledWith("14:30");
            expect(mockTimeEl.addClass).toHaveBeenCalledWith("timeline-event-time-default");
        });
    });
    describe("timeline grouping and sorting integration", () => {
        it("should separate timed events from date-only events", () => {
            const events = [
                {
                    id: "timed-1",
                    content: "Meeting at 2 PM",
                    time: new Date("2024-01-15T14:00:00Z"),
                    timeInfo: {
                        primaryTime: new Date("2024-01-15T14:00:00Z"),
                        timeComponent: { hour: 14, minute: 0, originalText: "2 PM", isRange: false },
                    },
                },
                {
                    id: "date-only-1",
                    content: "All day task",
                    time: new Date("2024-01-15T00:00:00Z"),
                    // No timeInfo - indicates date-only
                },
                {
                    id: "timed-2",
                    content: "Call at 10 AM",
                    time: new Date("2024-01-15T10:00:00Z"),
                    timeInfo: {
                        primaryTime: new Date("2024-01-15T10:00:00Z"),
                        timeComponent: { hour: 10, minute: 0, originalText: "10 AM", isRange: false },
                    },
                },
            ];
            const timedEvents = [];
            const dateOnlyEvents = [];
            events.forEach((event) => {
                if (mockTimeline.hasSpecificTime(event)) {
                    timedEvents.push(event);
                }
                else {
                    dateOnlyEvents.push(event);
                }
            });
            expect(timedEvents).toHaveLength(2);
            expect(timedEvents[0].id).toBe("timed-1");
            expect(timedEvents[1].id).toBe("timed-2");
            expect(dateOnlyEvents).toHaveLength(1);
            expect(dateOnlyEvents[0].id).toBe("date-only-1");
        });
        it("should group events with the same time", () => {
            const events = [
                {
                    id: "event-1",
                    content: "First meeting",
                    time: new Date("2024-01-15T14:00:00Z"),
                    timeInfo: {
                        primaryTime: new Date("2024-01-15T14:00:00Z"),
                        timeComponent: { hour: 14, minute: 0, originalText: "2 PM", isRange: false },
                    },
                },
                {
                    id: "event-2",
                    content: "Second meeting",
                    time: new Date("2024-01-15T14:00:00Z"),
                    timeInfo: {
                        primaryTime: new Date("2024-01-15T14:00:00Z"),
                        timeComponent: { hour: 14, minute: 0, originalText: "2 PM", isRange: false },
                    },
                },
                {
                    id: "event-3",
                    content: "Different time",
                    time: new Date("2024-01-15T15:00:00Z"),
                    timeInfo: {
                        primaryTime: new Date("2024-01-15T15:00:00Z"),
                        timeComponent: { hour: 15, minute: 0, originalText: "3 PM", isRange: false },
                    },
                },
            ];
            const timeGroups = new Map();
            events.forEach((event) => {
                var _a;
                const timeKey = mockTimeline.getTimeGroupKey(((_a = event.timeInfo) === null || _a === void 0 ? void 0 : _a.primaryTime) || event.time, event);
                if (!timeGroups.has(timeKey)) {
                    timeGroups.set(timeKey, []);
                }
                timeGroups.get(timeKey).push(event);
            });
            expect(timeGroups.size).toBe(2);
            expect(timeGroups.get("14:00")).toHaveLength(2);
            expect(timeGroups.get("15:00")).toHaveLength(1);
        });
        it("should handle mixed timed and date-only events in chronological order", () => {
            const events = [
                {
                    id: "date-only",
                    content: "All day task",
                    time: new Date("2024-01-15T00:00:00Z"),
                },
                {
                    id: "morning",
                    content: "Morning meeting",
                    time: new Date("2024-01-15T09:00:00Z"),
                    timeInfo: {
                        primaryTime: new Date("2024-01-15T09:00:00Z"),
                        timeComponent: { hour: 9, minute: 0, originalText: "9 AM", isRange: false },
                    },
                },
                {
                    id: "afternoon",
                    content: "Afternoon call",
                    time: new Date("2024-01-15T15:00:00Z"),
                    timeInfo: {
                        primaryTime: new Date("2024-01-15T15:00:00Z"),
                        timeComponent: { hour: 15, minute: 0, originalText: "3 PM", isRange: false },
                    },
                },
            ];
            const sortedEvents = mockTimeline.sortEventsByTime(events);
            // Date-only events should come first (midnight), then timed events
            expect(sortedEvents[0].id).toBe("date-only");
            expect(sortedEvents[1].id).toBe("morning");
            expect(sortedEvents[2].id).toBe("afternoon");
        });
        it("should generate consistent time group keys", () => {
            const event1 = {
                timeInfo: {
                    timeComponent: { hour: 14, minute: 30, originalText: "2:30 PM", isRange: false },
                },
            };
            const event2 = {
                time: new Date("2024-01-15T14:30:00Z"),
            };
            // Mock moment for fallback
            const mockMoment = {
                format: jest.fn().mockReturnValue("14:30"),
            };
            global.moment = jest.fn().mockReturnValue(mockMoment);
            const key1 = mockTimeline.getTimeGroupKey(new Date(), event1);
            const key2 = mockTimeline.getTimeGroupKey(event2.time, event2);
            expect(key1).toBe("14:30");
            expect(key2).toBe("14:30");
        });
    });
    describe("formatTimeComponent", () => {
        it("should format time component without seconds", () => {
            const timeComponent = {
                hour: 9,
                minute: 30,
                originalText: "9:30",
                isRange: false,
            };
            const result = mockTimeline.formatTimeComponent(timeComponent);
            expect(result).toBe("09:30");
        });
        it("should format time component with seconds", () => {
            const timeComponent = {
                hour: 14,
                minute: 5,
                second: 45,
                originalText: "14:05:45",
                isRange: false,
            };
            const result = mockTimeline.formatTimeComponent(timeComponent);
            expect(result).toBe("14:05:45");
        });
        it("should pad single digit hours and minutes", () => {
            const timeComponent = {
                hour: 7,
                minute: 5,
                originalText: "7:05",
                isRange: false,
            };
            const result = mockTimeline.formatTimeComponent(timeComponent);
            expect(result).toBe("07:05");
        });
        it("should handle midnight (00:00)", () => {
            const timeComponent = {
                hour: 0,
                minute: 0,
                originalText: "00:00",
                isRange: false,
            };
            const result = mockTimeline.formatTimeComponent(timeComponent);
            expect(result).toBe("00:00");
        });
        it("should handle noon (12:00)", () => {
            const timeComponent = {
                hour: 12,
                minute: 0,
                originalText: "12:00",
                isRange: false,
            };
            const result = mockTimeline.formatTimeComponent(timeComponent);
            expect(result).toBe("12:00");
        });
    });
});
export {};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGltZWxpbmVFdmVudEVuaGFuY2VtZW50LnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJUaW1lbGluZUV2ZW50RW5oYW5jZW1lbnQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFHQSx5RUFBeUU7QUFDekUsTUFBTSxrQkFBa0IsR0FBRztJQUMxQixHQUFHLEVBQUUsQ0FBQztJQUNOLFNBQVMsRUFBRSxDQUFDO0lBQ1osS0FBSyxFQUFFLENBQUM7SUFDUixTQUFTLEVBQUUsQ0FBQztDQUNILENBQUM7QUFFWCxpREFBaUQ7QUFDakQsTUFBTSx1QkFBdUI7SUFDNUI7O09BRUc7SUFDSCxzQkFBc0IsQ0FDckIsSUFBVSxFQUNWLElBQVUsRUFDVixJQUFZO1FBUVosMkRBQTJEO1FBQzNELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFFBQWUsQ0FBQztRQUM5QyxNQUFNLGNBQWMsR0FBRyxnQkFBZ0IsYUFBaEIsZ0JBQWdCLHVCQUFoQixnQkFBZ0IsQ0FBRSxjQUFjLENBQUM7UUFDeEQsTUFBTSxhQUFhLEdBQUcsZ0JBQWdCLGFBQWhCLGdCQUFnQix1QkFBaEIsZ0JBQWdCLENBQUUsYUFBYSxDQUFDO1FBRXRELElBQUksQ0FBQyxjQUFjLEVBQUU7WUFDcEIseURBQXlEO1lBQ3pELE9BQU87Z0JBQ04sV0FBVyxFQUFFLElBQUk7Z0JBQ2pCLE9BQU8sRUFBRSxLQUFLO2dCQUNkLGFBQWEsRUFBRSxXQUFXO2FBQzFCLENBQUM7U0FDRjtRQUVELCtEQUErRDtRQUMvRCxJQUFJLHFCQUFnRCxDQUFDO1FBQ3JELElBQUksZUFBaUMsQ0FBQztRQUV0QyxRQUFRLElBQUksRUFBRTtZQUNiLEtBQUssT0FBTztnQkFDWCxxQkFBcUIsR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFDO2dCQUNqRCxJQUFJLGNBQWMsQ0FBQyxPQUFPLEtBQUksYUFBYSxhQUFiLGFBQWEsdUJBQWIsYUFBYSxDQUFFLFdBQVcsQ0FBQSxFQUFFO29CQUN6RCxlQUFlLEdB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QUFDO2dCQUNULFlBQVksRUFBRSxPQUFPO2dCQUNyQixPQUFPLEVBQUUsS0FBSzthQUNkLENBQUM7WUFFRixNQUFNLE1BQU0sR0FBRyxZQUFZLENBQUMsbUJBQW1CLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDL0QsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM5QixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUaW1lQ29tcG9uZW50IH0gZnJvbSBcIi4uL3R5cGVzL3RpbWUtcGFyc2luZ1wiO1xyXG5pbXBvcnQgeyBUYXNrLCBFbmhhbmNlZFN0YW5kYXJkVGFza01ldGFkYXRhIH0gZnJvbSBcIi4uL3R5cGVzL3Rhc2tcIjtcclxuXHJcbi8vIERhdGUgdHlwZSBwcmlvcml0eSBmb3IgZGVkdXBsaWNhdGlvbiAoaGlnaGVyIG51bWJlciA9IGhpZ2hlciBwcmlvcml0eSlcclxuY29uc3QgREFURV9UWVBFX1BSSU9SSVRZID0ge1xyXG5cdGR1ZTogNCxcclxuXHRzY2hlZHVsZWQ6IDMsXHJcblx0c3RhcnQ6IDIsXHJcblx0Y29tcGxldGVkOiAxLFxyXG59IGFzIGNvbnN0O1xyXG5cclxuLy8gTW9jayB0aGUgVGltZWxpbmVTaWRlYmFyVmlldyBjbGFzcyBmb3IgdGVzdGluZ1xyXG5jbGFzcyBNb2NrVGltZWxpbmVTaWRlYmFyVmlldyB7XHJcblx0LyoqXHJcblx0ICogQ3JlYXRlIHRpbWUgaW5mb3JtYXRpb24gZnJvbSB0YXNrIG1ldGFkYXRhIGFuZCBlbmhhbmNlZCB0aW1lIGNvbXBvbmVudHNcclxuXHQgKi9cclxuXHRjcmVhdGVUaW1lSW5mb0Zyb21UYXNrKFxyXG5cdFx0dGFzazogVGFzayxcclxuXHRcdGRhdGU6IERhdGUsXHJcblx0XHR0eXBlOiBzdHJpbmdcclxuXHQpOiB7XHJcblx0XHRwcmltYXJ5VGltZTogRGF0ZTtcclxuXHRcdGVuZFRpbWU/OiBEYXRlO1xyXG5cdFx0aXNSYW5nZTogYm9vbGVhbjtcclxuXHRcdHRpbWVDb21wb25lbnQ/OiBUaW1lQ29tcG9uZW50O1xyXG5cdFx0ZGlzcGxheUZvcm1hdDogXCJ0aW1lLW9ubHlcIiB8IFwiZGF0ZS10aW1lXCIgfCBcInJhbmdlXCI7XHJcblx0fSB7XHJcblx0XHQvLyBDaGVjayBpZiB0YXNrIGhhcyBlbmhhbmNlZCBtZXRhZGF0YSB3aXRoIHRpbWUgY29tcG9uZW50c1xyXG5cdFx0Y29uc3QgZW5oYW5jZWRNZXRhZGF0YSA9IHRhc2subWV0YWRhdGEgYXMgYW55O1xyXG5cdFx0Y29uc3QgdGltZUNvbXBvbmVudHMgPSBlbmhhbmNlZE1ldGFkYXRhPy50aW1lQ29tcG9uZW50cztcclxuXHRcdGNvbnN0IGVuaGFuY2VkRGF0ZXMgPSBlbmhhbmNlZE1ldGFkYXRhPy5lbmhhbmNlZERhdGVzO1xyXG5cclxuXHRcdGlmICghdGltZUNvbXBvbmVudHMpIHtcclxuXHRcdFx0Ly8gTm8gdGltZSBjb21wb25lbnRzIGF2YWlsYWJsZSwgdXNlIGRlZmF1bHQgdGltZSBkaXNwbGF5XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0cHJpbWFyeVRpbWU6IGRhdGUsXHJcblx0XHRcdFx0aXNSYW5nZTogZmFsc2UsXHJcblx0XHRcdFx0ZGlzcGxheUZvcm1hdDogXCJkYXRlLXRpbWVcIixcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBEZXRlcm1pbmUgd2hpY2ggdGltZSBjb21wb25lbnQgdG8gdXNlIGJhc2VkIG9uIHRoZSBkYXRlIHR5cGVcclxuXHRcdGxldCByZWxldmFudFRpbWVDb21wb25lbnQ6IFRpbWVDb21wb25lbnQgfCB1bmRlZmluZWQ7XHJcblx0XHRsZXQgcmVsZXZhbnRFbmRUaW1lOiBEYXRlIHwgdW5kZWZpbmVkO1xyXG5cclxuXHRcdHN3aXRjaCAodHlwZSkge1xyXG5cdFx0XHRjYXNlIFwic3RhcnRcIjpcclxuXHRcdFx0XHRyZWxldmFudFRpbWVDb21wb25lbnQgPSB0aW1lQ29tcG9uZW50cy5zdGFydFRpbWU7XHJcblx0XHRcdFx0aWYgKHRpbWVDb21wb25lbnRzLmVuZFRpbWUgJiYgZW5oYW5jZWREYXRlcz8uZW5kRGF0ZVRpbWUpIHtcclxuXHRcdFx0XHRcdHJlbGV2YW50RW5kVGltZSA9IGVuaGFuY2VkRGF0ZXMuZW5kRGF0ZVRpbWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwiZHVlXCI6XHJcblx0XHRcdFx0cmVsZXZhbnRUaW1lQ29tcG9uZW50ID0gdGltZUNvbXBvbmVudHMuZHVlVGltZTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBcInNjaGVkdWxlZFwiOlxyXG5cdFx0XHRcdHJlbGV2YW50VGltZUNvbXBvbmVudCA9IHRpbWVDb21wb25lbnRzLnNjaGVkdWxlZFRpbWU7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0cmVsZXZhbnRUaW1lQ29tcG9uZW50ID0gdW5kZWZpbmVkO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICghcmVsZXZhbnRUaW1lQ29tcG9uZW50KSB7XHJcblx0XHRcdC8vIE5vIHNwZWNpZmljIHRpbWUgY29tcG9uZW50IGZvciB0aGlzIGRhdGUgdHlwZVxyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdHByaW1hcnlUaW1lOiBkYXRlLFxyXG5cdFx0XHRcdGlzUmFuZ2U6IGZhbHNlLFxyXG5cdFx0XHRcdGRpc3BsYXlGb3JtYXQ6IFwiZGF0ZS10aW1lXCIsXHJcblx0XHRcdH07XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGVuaGFuY2VkIGRhdGV0aW1lIGJ5IGNvbWJpbmluZyBkYXRlIGFuZCB0aW1lIGNvbXBvbmVudFxyXG5cdFx0Y29uc3QgZW5oYW5jZWREYXRlVGltZSA9IG5ldyBEYXRlKGRhdGUpO1xyXG5cdFx0ZW5oYW5jZWREYXRlVGltZS5zZXRVVENIb3VycyhcclxuXHRcdFx0cmVsZXZhbnRUaW1lQ29tcG9uZW50LmhvdXIsXHJcblx0XHRcdHJlbGV2YW50VGltZUNvbXBvbmVudC5taW51dGUsXHJcblx0XHRcdHJlbGV2YW50VGltZUNvbXBvbmVudC5zZWNvbmQgfHwgMCxcclxuXHRcdFx0MFxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBEZXRlcm1pbmUgaWYgdGhpcyBpcyBhIHRpbWUgcmFuZ2VcclxuXHRcdGNvbnN0IGlzUmFuZ2UgPSByZWxldmFudFRpbWVDb21wb25lbnQuaXNSYW5nZSAmJiAhIXJlbGV2YW50RW5kVGltZTtcclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRwcmltYXJ5VGltZTogZW5oYW5jZWREYXRlVGltZSxcclxuXHRcdFx0ZW5kVGltZTogcmVsZXZhbnRFbmRUaW1lLFxyXG5cdFx0XHRpc1JhbmdlLFxyXG5cdFx0XHR0aW1lQ29tcG9uZW50OiByZWxldmFudFRpbWVDb21wb25lbnQsXHJcblx0XHRcdGRpc3BsYXlGb3JtYXQ6IGlzUmFuZ2UgPyBcInJhbmdlXCIgOiBcInRpbWUtb25seVwiLFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEZvcm1hdCBhIHRpbWUgY29tcG9uZW50IGZvciBkaXNwbGF5XHJcblx0ICovXHJcblx0Zm9ybWF0VGltZUNvbXBvbmVudCh0aW1lQ29tcG9uZW50OiBUaW1lQ29tcG9uZW50KTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IGhvdXIgPSB0aW1lQ29tcG9uZW50LmhvdXIudG9TdHJpbmcoKS5wYWRTdGFydCgyLCAnMCcpO1xyXG5cdFx0Y29uc3QgbWludXRlID0gdGltZUNvbXBvbmVudC5taW51dGUudG9TdHJpbmcoKS5wYWRTdGFydCgyLCAnMCcpO1xyXG5cdFx0XHJcblx0XHRpZiAodGltZUNvbXBvbmVudC5zZWNvbmQgIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRjb25zdCBzZWNvbmQgPSB0aW1lQ29tcG9uZW50LnNlY29uZC50b1N0cmluZygpLnBhZFN0YXJ0KDIsICcwJyk7XHJcblx0XHRcdHJldHVybiBgJHtob3VyfToke21pbnV0ZX06JHtzZWNvbmR9YDtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0cmV0dXJuIGAke2hvdXJ9OiR7bWludXRlfWA7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFeHRyYWN0IGRhdGVzIGZyb20gdGFzayB3aXRoIGVuaGFuY2VkIGRhdGV0aW1lIHN1cHBvcnRcclxuXHQgKi9cclxuXHRleHRyYWN0RGF0ZXNGcm9tVGFzayh0YXNrOiBUYXNrKTogQXJyYXk8eyBkYXRlOiBEYXRlOyB0eXBlOiBzdHJpbmcgfT4ge1xyXG5cdFx0Ly8gVGFzay1sZXZlbCBkZWR1cGxpY2F0aW9uOiBlbnN1cmUgZWFjaCB0YXNrIGFwcGVhcnMgb25seSBvbmNlIGluIHRpbWVsaW5lXHJcblx0XHRcclxuXHRcdC8vIENoZWNrIGlmIHRhc2sgaGFzIGVuaGFuY2VkIG1ldGFkYXRhIHdpdGggdGltZSBjb21wb25lbnRzXHJcblx0XHRjb25zdCBlbmhhbmNlZE1ldGFkYXRhID0gdGFzay5tZXRhZGF0YSBhcyBhbnk7XHJcblx0XHRjb25zdCB0aW1lQ29tcG9uZW50cyA9IGVuaGFuY2VkTWV0YWRhdGE/LnRpbWVDb21wb25lbnRzO1xyXG5cdFx0Y29uc3QgZW5oYW5jZWREYXRlcyA9IGVuaGFuY2VkTWV0YWRhdGE/LmVuaGFuY2VkRGF0ZXM7XHJcblx0XHRcclxuXHRcdC8vIEZvciBjb21wbGV0ZWQgdGFza3M6IHByaW9yaXRpemUgZHVlIGRhdGUsIGZhbGxiYWNrIHRvIGNvbXBsZXRlZCBkYXRlXHJcblx0XHRpZiAodGFzay5jb21wbGV0ZWQpIHtcclxuXHRcdFx0aWYgKHRhc2subWV0YWRhdGEuZHVlRGF0ZSkge1xyXG5cdFx0XHRcdC8vIFVzZSBlbmhhbmNlZCBkdWUgZGF0ZXRpbWUgaWYgYXZhaWxhYmxlLCBvdGhlcndpc2UgdXNlIG9yaWdpbmFsIHRpbWVzdGFtcFxyXG5cdFx0XHRcdGNvbnN0IGR1ZURhdGUgPSBlbmhhbmNlZERhdGVzPy5kdWVEYXRlVGltZSB8fCBuZXcgRGF0ZSh0YXNrLm1ldGFkYXRhLmR1ZURhdGUpO1xyXG5cdFx0XHRcdHJldHVybiBbeyBkYXRlOiBkdWVEYXRlLCB0eXBlOiBcImR1ZVwiIH1dO1xyXG5cdFx0XHR9IGVsc2UgaWYgKHRhc2subWV0YWRhdGEuY29tcGxldGVkRGF0ZSkge1xyXG5cdFx0XHRcdHJldHVybiBbeyBkYXRlOiBuZXcgRGF0ZSh0YXNrLm1ldGFkYXRhLmNvbXBsZXRlZERhdGUpLCB0eXBlOiBcImNvbXBsZXRlZFwiIH1dO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdC8vIEZvciBub24tY29tcGxldGVkIHRhc2tzOiBzZWxlY3Qgc2luZ2xlIGhpZ2hlc3QgcHJpb3JpdHkgZGF0ZSB3aXRoIGVuaGFuY2VkIGRhdGV0aW1lIHN1cHBvcnRcclxuXHRcdGNvbnN0IGRhdGVzOiBBcnJheTx7IGRhdGU6IERhdGU7IHR5cGU6IHN0cmluZyB9PiA9IFtdO1xyXG5cclxuXHRcdGlmICh0YXNrLm1ldGFkYXRhLmR1ZURhdGUpIHtcclxuXHRcdFx0Ly8gVXNlIGVuaGFuY2VkIGR1ZSBkYXRldGltZSBpZiBhdmFpbGFibGVcclxuXHRcdFx0Y29uc3QgZHVlRGF0ZSA9IGVuaGFuY2VkRGF0ZXM/LmR1ZURhdGVUaW1lIHx8IG5ldyBEYXRlKHRhc2subWV0YWRhdGEuZHVlRGF0ZSk7XHJcblx0XHRcdGRhdGVzLnB1c2goeyBkYXRlOiBkdWVEYXRlLCB0eXBlOiBcImR1ZVwiIH0pO1xyXG5cdFx0fVxyXG5cdFx0aWYgKHRhc2subWV0YWRhdGEuc2NoZWR1bGVkRGF0ZSkge1xyXG5cdFx0XHQvLyBVc2UgZW5oYW5jZWQgc2NoZWR1bGVkIGRhdGV0aW1lIGlmIGF2YWlsYWJsZVxyXG5cdFx0XHRjb25zdCBzY2hlZHVsZWREYXRlID0gZW5oYW5jZWREYXRlcz8uc2NoZWR1bGVkRGF0ZVRpbWUgfHwgbmV3IERhdGUodGFzay5tZXRhZGF0YS5zY2hlZHVsZWREYXRlKTtcclxuXHRcdFx0ZGF0ZXMucHVzaCh7XHJcblx0XHRcdFx0ZGF0ZTogc2NoZWR1bGVkRGF0ZSxcclxuXHRcdFx0XHR0eXBlOiBcInNjaGVkdWxlZFwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdGlmICh0YXNrLm1ldGFkYXRhLnN0YXJ0RGF0ZSkge1xyXG5cdFx0XHQvLyBVc2UgZW5oYW5jZWQgc3RhcnQgZGF0ZXRpbWUgaWYgYXZhaWxhYmxlXHJcblx0XHRcdGNvbnN0IHN0YXJ0RGF0ZSA9IGVuaGFuY2VkRGF0ZXM/LnN0YXJ0RGF0ZVRpbWUgfHwgbmV3IERhdGUodGFzay5tZXRhZGF0YS5zdGFydERhdGUpO1xyXG5cdFx0XHRkYXRlcy5wdXNoKHtcclxuXHRcdFx0XHRkYXRlOiBzdGFydERhdGUsXHJcblx0XHRcdFx0dHlwZTogXCJzdGFydFwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Ly8gRm9yIG5vbi1jb21wbGV0ZWQgdGFza3MsIHNlbGVjdCB0aGUgaGlnaGVzdCBwcmlvcml0eSBkYXRlXHJcblx0XHRpZiAoZGF0ZXMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRjb25zdCBoaWdoZXN0UHJpb3JpdHlEYXRlID0gZGF0ZXMucmVkdWNlKChoaWdoZXN0LCBjdXJyZW50KSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgY3VycmVudFByaW9yaXR5ID0gREFURV9UWVBFX1BSSU9SSVRZW2N1cnJlbnQudHlwZSBhcyBrZXlvZiB0eXBlb2YgREFURV9UWVBFX1BSSU9SSVRZXSB8fCAwO1xyXG5cdFx0XHRcdGNvbnN0IGhpZ2hlc3RQcmlvcml0eSA9IERBVEVfVFlQRV9QUklPUklUWVtoaWdoZXN0LnR5cGUgYXMga2V5b2YgdHlwZW9mIERBVEVfVFlQRV9QUklPUklUWV0gfHwgMDtcclxuXHRcdFx0XHRyZXR1cm4gY3VycmVudFByaW9yaXR5ID4gaGlnaGVzdFByaW9yaXR5ID8gY3VycmVudCA6IGhpZ2hlc3Q7XHJcblx0XHRcdH0pO1xyXG5cdFx0XHRyZXR1cm4gW2hpZ2hlc3RQcmlvcml0eURhdGVdO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvLyBGYWxsYmFjazogaWYgbm8gcGxhbm5pbmcgZGF0ZXMgZXhpc3QsIHJldHVybiBlbXB0eSBhcnJheSBmb3Igc2ltcGxpY2l0eSBpbiB0ZXN0c1xyXG5cdFx0Y29uc3QgYWxsRGF0ZXM6IEFycmF5PHsgZGF0ZTogRGF0ZTsgdHlwZTogc3RyaW5nIH0+ID0gW107XHJcblx0XHRpZiAodGFzay5tZXRhZGF0YS5jb21wbGV0ZWREYXRlKSB7XHJcblx0XHRcdGFsbERhdGVzLnB1c2goe1xyXG5cdFx0XHRcdGRhdGU6IG5ldyBEYXRlKHRhc2subWV0YWRhdGEuY29tcGxldGVkRGF0ZSksXHJcblx0XHRcdFx0dHlwZTogXCJjb21wbGV0ZWRcIixcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHJldHVybiBhbGxEYXRlcztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNvcnQgZXZlbnRzIGJ5IHRpbWUgd2l0aGluIGEgZGF5IGZvciBjaHJvbm9sb2dpY2FsIG9yZGVyaW5nXHJcblx0ICovXHJcblx0c29ydEV2ZW50c0J5VGltZShldmVudHM6IGFueVtdKTogYW55W10ge1xyXG5cdFx0cmV0dXJuIGV2ZW50cy5zb3J0KChhLCBiKSA9PiB7XHJcblx0XHRcdC8vIEdldCB0aGUgcHJpbWFyeSB0aW1lIGZvciBzb3J0aW5nIC0gdXNlIGVuaGFuY2VkIHRpbWUgaWYgYXZhaWxhYmxlXHJcblx0XHRcdGNvbnN0IHRpbWVBID0gYS50aW1lSW5mbz8ucHJpbWFyeVRpbWUgfHwgYS50aW1lO1xyXG5cdFx0XHRjb25zdCB0aW1lQiA9IGIudGltZUluZm8/LnByaW1hcnlUaW1lIHx8IGIudGltZTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIFNvcnQgYnkgdGltZSBvZiBkYXkgKGVhcmxpZXIgdGltZXMgZmlyc3QpXHJcblx0XHRcdGNvbnN0IHRpbWVDb21wYXJpc29uID0gdGltZUEuZ2V0VGltZSgpIC0gdGltZUIuZ2V0VGltZSgpO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKHRpbWVDb21wYXJpc29uICE9PSAwKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRpbWVDb21wYXJpc29uO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBJZiB0aW1lcyBhcmUgZXF1YWwsIHNvcnQgYnkgdGFzayBjb250ZW50IGZvciBjb25zaXN0ZW50IG9yZGVyaW5nXHJcblx0XHRcdHJldHVybiBhLmNvbnRlbnQubG9jYWxlQ29tcGFyZShiLmNvbnRlbnQpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW5kZXIgdGltZSBpbmZvcm1hdGlvbiBmb3IgYSB0aW1lbGluZSBldmVudFxyXG5cdCAqL1xyXG5cdHJlbmRlckV2ZW50VGltZSh0aW1lRWw6IGFueSwgZXZlbnQ6IGFueSk6IHZvaWQge1xyXG5cdFx0aWYgKGV2ZW50LnRpbWVJbmZvPy50aW1lQ29tcG9uZW50KSB7XHJcblx0XHRcdC8vIFVzZSBwYXJzZWQgdGltZSBjb21wb25lbnQgZm9yIGFjY3VyYXRlIGRpc3BsYXlcclxuXHRcdFx0Y29uc3QgeyB0aW1lQ29tcG9uZW50LCBpc1JhbmdlLCBlbmRUaW1lIH0gPSBldmVudC50aW1lSW5mbztcclxuXHRcdFx0XHJcblx0XHRcdGlmIChpc1JhbmdlICYmIGVuZFRpbWUpIHtcclxuXHRcdFx0XHQvLyBEaXNwbGF5IHRpbWUgcmFuZ2VcclxuXHRcdFx0XHRjb25zdCBzdGFydFRpbWVTdHIgPSB0aGlzLmZvcm1hdFRpbWVDb21wb25lbnQodGltZUNvbXBvbmVudCk7XHJcblx0XHRcdFx0Y29uc3QgZW5kVGltZVN0ciA9IChnbG9iYWwgYXMgYW55KS5tb21lbnQoZW5kVGltZSkuZm9ybWF0KFwiSEg6bW1cIik7XHJcblx0XHRcdFx0dGltZUVsLnNldFRleHQoYCR7c3RhcnRUaW1lU3RyfS0ke2VuZFRpbWVTdHJ9YCk7XHJcblx0XHRcdFx0dGltZUVsLmFkZENsYXNzKFwidGltZWxpbmUtZXZlbnQtdGltZS1yYW5nZVwiKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBEaXNwbGF5IHNpbmdsZSB0aW1lXHJcblx0XHRcdFx0dGltZUVsLnNldFRleHQodGhpcy5mb3JtYXRUaW1lQ29tcG9uZW50KHRpbWVDb21wb25lbnQpKTtcclxuXHRcdFx0XHR0aW1lRWwuYWRkQ2xhc3MoXCJ0aW1lbGluZS1ldmVudC10aW1lLXNpbmdsZVwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gRmFsbGJhY2sgdG8gZGVmYXVsdCB0aW1lIGRpc3BsYXlcclxuXHRcdFx0dGltZUVsLnNldFRleHQoKGdsb2JhbCBhcyBhbnkpLm1vbWVudChldmVudC50aW1lKS5mb3JtYXQoXCJISDptbVwiKSk7XHJcblx0XHRcdHRpbWVFbC5hZGRDbGFzcyhcInRpbWVsaW5lLWV2ZW50LXRpbWUtZGVmYXVsdFwiKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGlmIGFuIGV2ZW50IGhhcyBhIHNwZWNpZmljIHRpbWUgKG5vdCBqdXN0IGEgZGF0ZSlcclxuXHQgKi9cclxuXHRoYXNTcGVjaWZpY1RpbWUoZXZlbnQ6IGFueSk6IGJvb2xlYW4ge1xyXG5cdFx0Ly8gQ2hlY2sgaWYgdGhlIGV2ZW50IGhhcyBlbmhhbmNlZCB0aW1lIGluZm9ybWF0aW9uXHJcblx0XHRpZiAoZXZlbnQudGltZUluZm8/LnRpbWVDb21wb25lbnQpIHtcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgdGhlIG9yaWdpbmFsIHRpbWUgaGFzIG5vbi16ZXJvIGhvdXJzL21pbnV0ZXMgKG5vdCBqdXN0IG1pZG5pZ2h0KVxyXG5cdFx0Y29uc3QgdGltZSA9IGV2ZW50LnRpbWVJbmZvPy5wcmltYXJ5VGltZSB8fCBldmVudC50aW1lO1xyXG5cdFx0cmV0dXJuIHRpbWUuZ2V0VVRDSG91cnMoKSAhPT0gMCB8fCB0aW1lLmdldFVUQ01pbnV0ZXMoKSAhPT0gMCB8fCB0aW1lLmdldFVUQ1NlY29uZHMoKSAhPT0gMDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdlbmVyYXRlIGEgdGltZSBncm91cCBrZXkgZm9yIGdyb3VwaW5nIGV2ZW50c1xyXG5cdCAqL1xyXG5cdGdldFRpbWVHcm91cEtleSh0aW1lOiBEYXRlLCBldmVudDogYW55KTogc3RyaW5nIHtcclxuXHRcdGlmIChldmVudC50aW1lSW5mbz8udGltZUNvbXBvbmVudCkge1xyXG5cdFx0XHQvLyBVc2UgdGhlIGZvcm1hdHRlZCB0aW1lIGNvbXBvbmVudCBmb3IgcHJlY2lzZSBncm91cGluZ1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5mb3JtYXRUaW1lQ29tcG9uZW50KGV2ZW50LnRpbWVJbmZvLnRpbWVDb21wb25lbnQpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvLyBGYWxsYmFjayB0byBob3VyOm1pbnV0ZSBmb3JtYXRcclxuXHRcdHJldHVybiAoZ2xvYmFsIGFzIGFueSkubW9tZW50KHRpbWUpLmZvcm1hdChcIkhIOm1tXCIpO1xyXG5cdH1cclxufVxyXG5cclxuZGVzY3JpYmUoXCJUaW1lbGluZSBFdmVudCBFbmhhbmNlbWVudFwiLCAoKSA9PiB7XHJcblx0bGV0IG1vY2tUaW1lbGluZTogTW9ja1RpbWVsaW5lU2lkZWJhclZpZXc7XHJcblxyXG5cdGJlZm9yZUVhY2goKCkgPT4ge1xyXG5cdFx0bW9ja1RpbWVsaW5lID0gbmV3IE1vY2tUaW1lbGluZVNpZGViYXJWaWV3KCk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiY3JlYXRlVGltZUluZm9Gcm9tVGFza1wiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCByZXR1cm4gZGVmYXVsdCB0aW1lIGluZm8gd2hlbiBubyB0aW1lIGNvbXBvbmVudHMgYXJlIGF2YWlsYWJsZVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRhc2s6IFRhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwidGVzdC0xXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUZXN0IHRhc2tcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0bGluZTogMSxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBUZXN0IHRhc2tcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMDA6MDA6MDBaXCIpO1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBtb2NrVGltZWxpbmUuY3JlYXRlVGltZUluZm9Gcm9tVGFzayh0YXNrLCBkYXRlLCBcImR1ZVwiKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoe1xyXG5cdFx0XHRcdHByaW1hcnlUaW1lOiBkYXRlLFxyXG5cdFx0XHRcdGlzUmFuZ2U6IGZhbHNlLFxyXG5cdFx0XHRcdGRpc3BsYXlGb3JtYXQ6IFwiZGF0ZS10aW1lXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgY3JlYXRlIHRpbWUgaW5mbyB3aXRoIHNpbmdsZSB0aW1lIGNvbXBvbmVudCBmb3IgZHVlIGRhdGVcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0aW1lQ29tcG9uZW50OiBUaW1lQ29tcG9uZW50ID0ge1xyXG5cdFx0XHRcdGhvdXI6IDE0LFxyXG5cdFx0XHRcdG1pbnV0ZTogMzAsXHJcblx0XHRcdFx0b3JpZ2luYWxUZXh0OiBcIjI6MzAgUE1cIixcclxuXHRcdFx0XHRpc1JhbmdlOiBmYWxzZSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2s6IFRhc2s8RW5oYW5jZWRTdGFuZGFyZFRhc2tNZXRhZGF0YT4gPSB7XHJcblx0XHRcdFx0aWQ6IFwidGVzdC0yXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJNZWV0aW5nIGF0IDI6MzAgUE1cIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0bGluZTogMSxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBNZWV0aW5nIGF0IDI6MzAgUE1cIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHR0aW1lQ29tcG9uZW50czoge1xyXG5cdFx0XHRcdFx0XHRkdWVUaW1lOiB0aW1lQ29tcG9uZW50LFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgZGF0ZSA9IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQwMDowMDowMFpcIik7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IG1vY2tUaW1lbGluZS5jcmVhdGVUaW1lSW5mb0Zyb21UYXNrKHRhc2ssIGRhdGUsIFwiZHVlXCIpO1xyXG5cclxuXHRcdFx0Y29uc3QgZXhwZWN0ZWREYXRlVGltZSA9IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxNDozMDowMFpcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQucHJpbWFyeVRpbWUpLnRvRXF1YWwoZXhwZWN0ZWREYXRlVGltZSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuaXNSYW5nZSkudG9CZShmYWxzZSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuZGlzcGxheUZvcm1hdCkudG9CZShcInRpbWUtb25seVwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC50aW1lQ29tcG9uZW50KS50b0VxdWFsKHRpbWVDb21wb25lbnQpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgY3JlYXRlIHRpbWUgaW5mbyB3aXRoIHRpbWUgcmFuZ2UgZm9yIHN0YXJ0IGRhdGVcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBzdGFydFRpbWVDb21wb25lbnQ6IFRpbWVDb21wb25lbnQgPSB7XHJcblx0XHRcdFx0aG91cjogOSxcclxuXHRcdFx0XHRtaW51dGU6IDAsXHJcblx0XHRcdFx0b3JpZ2luYWxUZXh0OiBcIjk6MDAtMTc6MDBcIixcclxuXHRcdFx0XHRpc1JhbmdlOiB0cnVlLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgZW5kVGltZUNvbXBvbmVudDogVGltZUNvbXBvbmVudCA9IHtcclxuXHRcdFx0XHRob3VyOiAxNyxcclxuXHRcdFx0XHRtaW51dGU6IDAsXHJcblx0XHRcdFx0b3JpZ2luYWxUZXh0OiBcIjk6MDAtMTc6MDBcIixcclxuXHRcdFx0XHRpc1JhbmdlOiB0cnVlLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgZW5kRGF0ZVRpbWUgPSBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMTc6MDA6MDBaXCIpO1xyXG5cclxuXHRcdFx0Y29uc3QgdGFzazogVGFzazxFbmhhbmNlZFN0YW5kYXJkVGFza01ldGFkYXRhPiA9IHtcclxuXHRcdFx0XHRpZDogXCJ0ZXN0LTNcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIldvcmtzaG9wIDk6MDAtMTc6MDBcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0bGluZTogMSxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBXb3Jrc2hvcCA5OjAwLTE3OjAwXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0dGltZUNvbXBvbmVudHM6IHtcclxuXHRcdFx0XHRcdFx0c3RhcnRUaW1lOiBzdGFydFRpbWVDb21wb25lbnQsXHJcblx0XHRcdFx0XHRcdGVuZFRpbWU6IGVuZFRpbWVDb21wb25lbnQsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0ZW5oYW5jZWREYXRlczoge1xyXG5cdFx0XHRcdFx0XHRlbmREYXRlVGltZTogZW5kRGF0ZVRpbWUsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUoXCIyMDI0LTAxLTE1VDAwOjAwOjAwWlwiKTtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gbW9ja1RpbWVsaW5lLmNyZWF0ZVRpbWVJbmZvRnJvbVRhc2sodGFzaywgZGF0ZSwgXCJzdGFydFwiKTtcclxuXHJcblx0XHRcdGNvbnN0IGV4cGVjdGVkRGF0ZVRpbWUgPSBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMDk6MDA6MDBaXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnByaW1hcnlUaW1lKS50b0VxdWFsKGV4cGVjdGVkRGF0ZVRpbWUpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmVuZFRpbWUpLnRvRXF1YWwoZW5kRGF0ZVRpbWUpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmlzUmFuZ2UpLnRvQmUodHJ1ZSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuZGlzcGxheUZvcm1hdCkudG9CZShcInJhbmdlXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnRpbWVDb21wb25lbnQpLnRvRXF1YWwoc3RhcnRUaW1lQ29tcG9uZW50KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBzY2hlZHVsZWQgdGltZSBjb21wb25lbnRcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0aW1lQ29tcG9uZW50OiBUaW1lQ29tcG9uZW50ID0ge1xyXG5cdFx0XHRcdGhvdXI6IDEwLFxyXG5cdFx0XHRcdG1pbnV0ZTogMTUsXHJcblx0XHRcdFx0c2Vjb25kOiAzMCxcclxuXHRcdFx0XHRvcmlnaW5hbFRleHQ6IFwiMTA6MTU6MzBcIixcclxuXHRcdFx0XHRpc1JhbmdlOiBmYWxzZSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2s6IFRhc2s8RW5oYW5jZWRTdGFuZGFyZFRhc2tNZXRhZGF0YT4gPSB7XHJcblx0XHRcdFx0aWQ6IFwidGVzdC00XCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJDYWxsIGF0IDEwOjE1OjMwXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdGxpbmU6IDEsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbIF0gQ2FsbCBhdCAxMDoxNTozMFwiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdHRpbWVDb21wb25lbnRzOiB7XHJcblx0XHRcdFx0XHRcdHNjaGVkdWxlZFRpbWU6IHRpbWVDb21wb25lbnQsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUoXCIyMDI0LTAxLTE1VDAwOjAwOjAwWlwiKTtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gbW9ja1RpbWVsaW5lLmNyZWF0ZVRpbWVJbmZvRnJvbVRhc2sodGFzaywgZGF0ZSwgXCJzY2hlZHVsZWRcIik7XHJcblxyXG5cdFx0XHRjb25zdCBleHBlY3RlZERhdGVUaW1lID0gbmV3IERhdGUoXCIyMDI0LTAxLTE1VDEwOjE1OjMwWlwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5wcmltYXJ5VGltZSkudG9FcXVhbChleHBlY3RlZERhdGVUaW1lKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5pc1JhbmdlKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5kaXNwbGF5Rm9ybWF0KS50b0JlKFwidGltZS1vbmx5XCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnRpbWVDb21wb25lbnQpLnRvRXF1YWwodGltZUNvbXBvbmVudCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCByZXR1cm4gZGVmYXVsdCB3aGVuIG5vIG1hdGNoaW5nIHRpbWUgY29tcG9uZW50IGZvciBkYXRlIHR5cGVcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0aW1lQ29tcG9uZW50OiBUaW1lQ29tcG9uZW50ID0ge1xyXG5cdFx0XHRcdGhvdXI6IDE0LFxyXG5cdFx0XHRcdG1pbnV0ZTogMzAsXHJcblx0XHRcdFx0b3JpZ2luYWxUZXh0OiBcIjI6MzAgUE1cIixcclxuXHRcdFx0XHRpc1JhbmdlOiBmYWxzZSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2s6IFRhc2s8RW5oYW5jZWRTdGFuZGFyZFRhc2tNZXRhZGF0YT4gPSB7XHJcblx0XHRcdFx0aWQ6IFwidGVzdC01XCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUYXNrIHdpdGggZHVlIHRpbWVcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0bGluZTogMSxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBUYXNrIHdpdGggZHVlIHRpbWVcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHR0aW1lQ29tcG9uZW50czoge1xyXG5cdFx0XHRcdFx0XHRkdWVUaW1lOiB0aW1lQ29tcG9uZW50LFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgZGF0ZSA9IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQwMDowMDowMFpcIik7XHJcblx0XHRcdC8vIFJlcXVlc3Qgc3RhcnQgdGltZSBpbmZvIGJ1dCBvbmx5IGR1ZSB0aW1lIGlzIGF2YWlsYWJsZVxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBtb2NrVGltZWxpbmUuY3JlYXRlVGltZUluZm9Gcm9tVGFzayh0YXNrLCBkYXRlLCBcInN0YXJ0XCIpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9FcXVhbCh7XHJcblx0XHRcdFx0cHJpbWFyeVRpbWU6IGRhdGUsXHJcblx0XHRcdFx0aXNSYW5nZTogZmFsc2UsXHJcblx0XHRcdFx0ZGlzcGxheUZvcm1hdDogXCJkYXRlLXRpbWVcIixcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJleHRyYWN0RGF0ZXNGcm9tVGFza1wiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCB1c2UgZW5oYW5jZWQgZGF0ZXRpbWUgZm9yIGR1ZSBkYXRlIHdoZW4gYXZhaWxhYmxlXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZW5oYW5jZWREdWVEYXRlVGltZSA9IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxNDozMDowMFpcIik7XHJcblx0XHRcdFxyXG5cdFx0XHRjb25zdCB0YXNrOiBUYXNrPEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGE+ID0ge1xyXG5cdFx0XHRcdGlkOiBcInRlc3QtZW5oYW5jZWQtMVwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiTWVldGluZyBhdCAyOjMwIFBNXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdGxpbmU6IDEsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbIF0gTWVldGluZyBhdCAyOjMwIFBNXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0ZHVlRGF0ZTogbmV3IERhdGUoXCIyMDI0LTAxLTE1VDAwOjAwOjAwWlwiKS5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHRlbmhhbmNlZERhdGVzOiB7XHJcblx0XHRcdFx0XHRcdGR1ZURhdGVUaW1lOiBlbmhhbmNlZER1ZURhdGVUaW1lLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gbW9ja1RpbWVsaW5lLmV4dHJhY3REYXRlc0Zyb21UYXNrKHRhc2spO1xyXG5cdFx0XHRcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0WzBdLmRhdGUpLnRvRXF1YWwoZW5oYW5jZWREdWVEYXRlVGltZSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHRbMF0udHlwZSkudG9CZShcImR1ZVwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHVzZSBlbmhhbmNlZCBkYXRldGltZSBmb3Igc2NoZWR1bGVkIGRhdGUgd2hlbiBhdmFpbGFibGVcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBlbmhhbmNlZFNjaGVkdWxlZERhdGVUaW1lID0gbmV3IERhdGUoXCIyMDI0LTAxLTE1VDA5OjE1OjAwWlwiKTtcclxuXHRcdFx0XHJcblx0XHRcdGNvbnN0IHRhc2s6IFRhc2s8RW5oYW5jZWRTdGFuZGFyZFRhc2tNZXRhZGF0YT4gPSB7XHJcblx0XHRcdFx0aWQ6IFwidGVzdC1lbmhhbmNlZC0yXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJDYWxsIGF0IDk6MTUgQU1cIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0bGluZTogMSxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBDYWxsIGF0IDk6MTUgQU1cIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHRzY2hlZHVsZWREYXRlOiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMDA6MDA6MDBaXCIpLmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdGVuaGFuY2VkRGF0ZXM6IHtcclxuXHRcdFx0XHRcdFx0c2NoZWR1bGVkRGF0ZVRpbWU6IGVuaGFuY2VkU2NoZWR1bGVkRGF0ZVRpbWUsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBtb2NrVGltZWxpbmUuZXh0cmFjdERhdGVzRnJvbVRhc2sodGFzayk7XHJcblx0XHRcdFxyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHRbMF0uZGF0ZSkudG9FcXVhbChlbmhhbmNlZFNjaGVkdWxlZERhdGVUaW1lKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdFswXS50eXBlKS50b0JlKFwic2NoZWR1bGVkXCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgdXNlIGVuaGFuY2VkIGRhdGV0aW1lIGZvciBzdGFydCBkYXRlIHdoZW4gYXZhaWxhYmxlXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZW5oYW5jZWRTdGFydERhdGVUaW1lID0gbmV3IERhdGUoXCIyMDI0LTAxLTE1VDA4OjAwOjAwWlwiKTtcclxuXHRcdFx0XHJcblx0XHRcdGNvbnN0IHRhc2s6IFRhc2s8RW5oYW5jZWRTdGFuZGFyZFRhc2tNZXRhZGF0YT4gPSB7XHJcblx0XHRcdFx0aWQ6IFwidGVzdC1lbmhhbmNlZC0zXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJXb3Jrc2hvcCBzdGFydHMgYXQgODowMCBBTVwiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRsaW5lOiAxLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIFdvcmtzaG9wIHN0YXJ0cyBhdCA4OjAwIEFNXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0c3RhcnREYXRlOiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMDA6MDA6MDBaXCIpLmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdGVuaGFuY2VkRGF0ZXM6IHtcclxuXHRcdFx0XHRcdFx0c3RhcnREYXRlVGltZTogZW5oYW5jZWRTdGFydERhdGVUaW1lLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gbW9ja1RpbWVsaW5lLmV4dHJhY3REYXRlc0Zyb21UYXNrKHRhc2spO1xyXG5cdFx0XHRcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0WzBdLmRhdGUpLnRvRXF1YWwoZW5oYW5jZWRTdGFydERhdGVUaW1lKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdFswXS50eXBlKS50b0JlKFwic3RhcnRcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBmYWxsYmFjayB0byBvcmlnaW5hbCB0aW1lc3RhbXAgd2hlbiBlbmhhbmNlZCBkYXRldGltZSBub3QgYXZhaWxhYmxlXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3Qgb3JpZ2luYWxEdWVEYXRlID0gbmV3IERhdGUoXCIyMDI0LTAxLTE1VDAwOjAwOjAwWlwiKTtcclxuXHRcdFx0XHJcblx0XHRcdGNvbnN0IHRhc2s6IFRhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwidGVzdC1mYWxsYmFjay0xXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUYXNrIHdpdGhvdXQgZW5oYW5jZWQgZGF0ZXRpbWVcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0bGluZTogMSxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBUYXNrIHdpdGhvdXQgZW5oYW5jZWQgZGF0ZXRpbWVcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHRkdWVEYXRlOiBvcmlnaW5hbER1ZURhdGUuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBtb2NrVGltZWxpbmUuZXh0cmFjdERhdGVzRnJvbVRhc2sodGFzayk7XHJcblx0XHRcdFxyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHRbMF0uZGF0ZSkudG9FcXVhbChvcmlnaW5hbER1ZURhdGUpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0WzBdLnR5cGUpLnRvQmUoXCJkdWVcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBwcmlvcml0aXplIGR1ZSBkYXRlIG92ZXIgc2NoZWR1bGVkIGRhdGUgd2l0aCBlbmhhbmNlZCBkYXRldGltZXNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBlbmhhbmNlZER1ZURhdGVUaW1lID0gbmV3IERhdGUoXCIyMDI0LTAxLTE1VDE0OjMwOjAwWlwiKTtcclxuXHRcdFx0Y29uc3QgZW5oYW5jZWRTY2hlZHVsZWREYXRlVGltZSA9IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQwOToxNTowMFpcIik7XHJcblx0XHRcdFxyXG5cdFx0XHRjb25zdCB0YXNrOiBUYXNrPEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGE+ID0ge1xyXG5cdFx0XHRcdGlkOiBcInRlc3QtcHJpb3JpdHktMVwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiVGFzayB3aXRoIGJvdGggZHVlIGFuZCBzY2hlZHVsZWQgdGltZXNcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0bGluZTogMSxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCIgXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBUYXNrIHdpdGggYm90aCBkdWUgYW5kIHNjaGVkdWxlZCB0aW1lc1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdGR1ZURhdGU6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQwMDowMDowMFpcIikuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0c2NoZWR1bGVkRGF0ZTogbmV3IERhdGUoXCIyMDI0LTAxLTE1VDAwOjAwOjAwWlwiKS5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHRlbmhhbmNlZERhdGVzOiB7XHJcblx0XHRcdFx0XHRcdGR1ZURhdGVUaW1lOiBlbmhhbmNlZER1ZURhdGVUaW1lLFxyXG5cdFx0XHRcdFx0XHRzY2hlZHVsZWREYXRlVGltZTogZW5oYW5jZWRTY2hlZHVsZWREYXRlVGltZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IG1vY2tUaW1lbGluZS5leHRyYWN0RGF0ZXNGcm9tVGFzayh0YXNrKTtcclxuXHRcdFx0XHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdFswXS5kYXRlKS50b0VxdWFsKGVuaGFuY2VkRHVlRGF0ZVRpbWUpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0WzBdLnR5cGUpLnRvQmUoXCJkdWVcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgY29tcGxldGVkIHRhc2tzIHdpdGggZW5oYW5jZWQgZHVlIGRhdGV0aW1lXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZW5oYW5jZWREdWVEYXRlVGltZSA9IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxNDozMDowMFpcIik7XHJcblx0XHRcdFxyXG5cdFx0XHRjb25zdCB0YXNrOiBUYXNrPEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGE+ID0ge1xyXG5cdFx0XHRcdGlkOiBcInRlc3QtY29tcGxldGVkLTFcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIkNvbXBsZXRlZCBtZWV0aW5nIGF0IDI6MzAgUE1cIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0bGluZTogMSxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0c3RhdHVzOiBcInhcIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gW3hdIENvbXBsZXRlZCBtZWV0aW5nIGF0IDI6MzAgUE1cIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHRkdWVEYXRlOiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMDA6MDA6MDBaXCIpLmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdGNvbXBsZXRlZERhdGU6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxNTowMDowMFpcIikuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0ZW5oYW5jZWREYXRlczoge1xyXG5cdFx0XHRcdFx0XHRkdWVEYXRlVGltZTogZW5oYW5jZWREdWVEYXRlVGltZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IG1vY2tUaW1lbGluZS5leHRyYWN0RGF0ZXNGcm9tVGFzayh0YXNrKTtcclxuXHRcdFx0XHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdFswXS5kYXRlKS50b0VxdWFsKGVuaGFuY2VkRHVlRGF0ZVRpbWUpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0WzBdLnR5cGUpLnRvQmUoXCJkdWVcIik7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJzb3J0RXZlbnRzQnlUaW1lXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIHNvcnQgZXZlbnRzIGJ5IHRpbWUgY2hyb25vbG9naWNhbGx5XCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZXZlbnRzOiBhbnlbXSA9IFtcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRpZDogXCJldmVudC0zXCIsXHJcblx0XHRcdFx0XHRjb250ZW50OiBcIkx1bmNoXCIsXHJcblx0XHRcdFx0XHR0aW1lOiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMTI6MDA6MDBaXCIpLFxyXG5cdFx0XHRcdFx0dGltZUluZm86IHtcclxuXHRcdFx0XHRcdFx0cHJpbWFyeVRpbWU6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxMjowMDowMFpcIiksXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0aWQ6IFwiZXZlbnQtMVwiLFxyXG5cdFx0XHRcdFx0Y29udGVudDogXCJNb3JuaW5nIG1lZXRpbmdcIixcclxuXHRcdFx0XHRcdHRpbWU6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQwOTowMDowMFpcIiksXHJcblx0XHRcdFx0XHR0aW1lSW5mbzoge1xyXG5cdFx0XHRcdFx0XHRwcmltYXJ5VGltZTogbmV3IERhdGUoXCIyMDI0LTAxLTE1VDA5OjAwOjAwWlwiKSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRpZDogXCJldmVudC0yXCIsXHJcblx0XHRcdFx0XHRjb250ZW50OiBcIkNvZmZlZSBicmVha1wiLFxyXG5cdFx0XHRcdFx0dGltZTogbmV3IERhdGUoXCIyMDI0LTAxLTE1VDEwOjMwOjAwWlwiKSxcclxuXHRcdFx0XHRcdHRpbWVJbmZvOiB7XHJcblx0XHRcdFx0XHRcdHByaW1hcnlUaW1lOiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMTA6MzA6MDBaXCIpLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRdO1xyXG5cclxuXHRcdFx0Y29uc3Qgc29ydGVkID0gbW9ja1RpbWVsaW5lLnNvcnRFdmVudHNCeVRpbWUoZXZlbnRzKTtcclxuXHJcblx0XHRcdGV4cGVjdChzb3J0ZWRbMF0uY29udGVudCkudG9CZShcIk1vcm5pbmcgbWVldGluZ1wiKTtcclxuXHRcdFx0ZXhwZWN0KHNvcnRlZFsxXS5jb250ZW50KS50b0JlKFwiQ29mZmVlIGJyZWFrXCIpO1xyXG5cdFx0XHRleHBlY3Qoc29ydGVkWzJdLmNvbnRlbnQpLnRvQmUoXCJMdW5jaFwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHNvcnQgZXZlbnRzIHdpdGggc2FtZSB0aW1lIGJ5IGNvbnRlbnQgYWxwaGFiZXRpY2FsbHlcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBldmVudHM6IGFueVtdID0gW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGlkOiBcImV2ZW50LTJcIixcclxuXHRcdFx0XHRcdGNvbnRlbnQ6IFwiWmVicmEgdGFza1wiLFxyXG5cdFx0XHRcdFx0dGltZTogbmV3IERhdGUoXCIyMDI0LTAxLTE1VDA5OjAwOjAwWlwiKSxcclxuXHRcdFx0XHRcdHRpbWVJbmZvOiB7XHJcblx0XHRcdFx0XHRcdHByaW1hcnlUaW1lOiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMDk6MDA6MDBaXCIpLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGlkOiBcImV2ZW50LTFcIixcclxuXHRcdFx0XHRcdGNvbnRlbnQ6IFwiQWxwaGEgdGFza1wiLFxyXG5cdFx0XHRcdFx0dGltZTogbmV3IERhdGUoXCIyMDI0LTAxLTE1VDA5OjAwOjAwWlwiKSxcclxuXHRcdFx0XHRcdHRpbWVJbmZvOiB7XHJcblx0XHRcdFx0XHRcdHByaW1hcnlUaW1lOiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMDk6MDA6MDBaXCIpLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRdO1xyXG5cclxuXHRcdFx0Y29uc3Qgc29ydGVkID0gbW9ja1RpbWVsaW5lLnNvcnRFdmVudHNCeVRpbWUoZXZlbnRzKTtcclxuXHJcblx0XHRcdGV4cGVjdChzb3J0ZWRbMF0uY29udGVudCkudG9CZShcIkFscGhhIHRhc2tcIik7XHJcblx0XHRcdGV4cGVjdChzb3J0ZWRbMV0uY29udGVudCkudG9CZShcIlplYnJhIHRhc2tcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgZXZlbnRzIHdpdGhvdXQgdGltZUluZm8gYnkgdXNpbmcgZmFsbGJhY2sgdGltZVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGV2ZW50czogYW55W10gPSBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0aWQ6IFwiZXZlbnQtMlwiLFxyXG5cdFx0XHRcdFx0Y29udGVudDogXCJFbmhhbmNlZCB0YXNrXCIsXHJcblx0XHRcdFx0XHR0aW1lOiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMTA6MDA6MDBaXCIpLFxyXG5cdFx0XHRcdFx0dGltZUluZm86IHtcclxuXHRcdFx0XHRcdFx0cHJpbWFyeVRpbWU6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxMDowMDowMFpcIiksXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0aWQ6IFwiZXZlbnQtMVwiLFxyXG5cdFx0XHRcdFx0Y29udGVudDogXCJMZWdhY3kgdGFza1wiLFxyXG5cdFx0XHRcdFx0dGltZTogbmV3IERhdGUoXCIyMDI0LTAxLTE1VDA5OjAwOjAwWlwiKSxcclxuXHRcdFx0XHRcdC8vIE5vIHRpbWVJbmZvXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XTtcclxuXHJcblx0XHRcdGNvbnN0IHNvcnRlZCA9IG1vY2tUaW1lbGluZS5zb3J0RXZlbnRzQnlUaW1lKGV2ZW50cyk7XHJcblxyXG5cdFx0XHRleHBlY3Qoc29ydGVkWzBdLmNvbnRlbnQpLnRvQmUoXCJMZWdhY3kgdGFza1wiKTtcclxuXHRcdFx0ZXhwZWN0KHNvcnRlZFsxXS5jb250ZW50KS50b0JlKFwiRW5oYW5jZWQgdGFza1wiKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcInJlbmRlckV2ZW50VGltZVwiLCAoKSA9PiB7XHJcblx0XHRsZXQgbW9ja1RpbWVFbDogSFRNTEVsZW1lbnQ7XHJcblxyXG5cdFx0YmVmb3JlRWFjaCgoKSA9PiB7XHJcblx0XHRcdC8vIENyZWF0ZSBhIG1vY2sgRE9NIGVsZW1lbnRcclxuXHRcdFx0bW9ja1RpbWVFbCA9IHtcclxuXHRcdFx0XHRzZXRUZXh0OiBqZXN0LmZuKCksXHJcblx0XHRcdFx0YWRkQ2xhc3M6IGplc3QuZm4oKSxcclxuXHRcdFx0fSBhcyBhbnk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCByZW5kZXIgc2luZ2xlIHRpbWUgY29tcG9uZW50IHdpdGggcHJvcGVyIGZvcm1hdHRpbmdcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0aW1lQ29tcG9uZW50OiBUaW1lQ29tcG9uZW50ID0ge1xyXG5cdFx0XHRcdGhvdXI6IDE0LFxyXG5cdFx0XHRcdG1pbnV0ZTogMzAsXHJcblx0XHRcdFx0b3JpZ2luYWxUZXh0OiBcIjI6MzAgUE1cIixcclxuXHRcdFx0XHRpc1JhbmdlOiBmYWxzZSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGV2ZW50OiBhbnkgPSB7XHJcblx0XHRcdFx0dGltZUluZm86IHtcclxuXHRcdFx0XHRcdHRpbWVDb21wb25lbnQsXHJcblx0XHRcdFx0XHRpc1JhbmdlOiBmYWxzZSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0bW9ja1RpbWVsaW5lLnJlbmRlckV2ZW50VGltZShtb2NrVGltZUVsLCBldmVudCk7XHJcblxyXG5cdFx0XHRleHBlY3QobW9ja1RpbWVFbC5zZXRUZXh0KS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcIjE0OjMwXCIpO1xyXG5cdFx0XHRleHBlY3QobW9ja1RpbWVFbC5hZGRDbGFzcykudG9IYXZlQmVlbkNhbGxlZFdpdGgoXCJ0aW1lbGluZS1ldmVudC10aW1lLXNpbmdsZVwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHJlbmRlciB0aW1lIHJhbmdlIHdpdGggc3RhcnQgYW5kIGVuZCB0aW1lc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRpbWVDb21wb25lbnQ6IFRpbWVDb21wb25lbnQgPSB7XHJcblx0XHRcdFx0aG91cjogOSxcclxuXHRcdFx0XHRtaW51dGU6IDAsXHJcblx0XHRcdFx0b3JpZ2luYWxUZXh0OiBcIjk6MDAtMTc6MDBcIixcclxuXHRcdFx0XHRpc1JhbmdlOiB0cnVlLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgZW5kVGltZSA9IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxNzowMDowMFpcIik7XHJcblxyXG5cdFx0XHRjb25zdCBldmVudDogYW55ID0ge1xyXG5cdFx0XHRcdHRpbWVJbmZvOiB7XHJcblx0XHRcdFx0XHR0aW1lQ29tcG9uZW50LFxyXG5cdFx0XHRcdFx0aXNSYW5nZTogdHJ1ZSxcclxuXHRcdFx0XHRcdGVuZFRpbWUsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIE1vY2sgbW9tZW50IGZvciB0aGUgZW5kIHRpbWUgZm9ybWF0dGluZ1xyXG5cdFx0XHRjb25zdCBtb2NrTW9tZW50ID0ge1xyXG5cdFx0XHRcdGZvcm1hdDogamVzdC5mbigpLm1vY2tSZXR1cm5WYWx1ZShcIjE3OjAwXCIpLFxyXG5cdFx0XHR9O1xyXG5cdFx0XHQoZ2xvYmFsIGFzIGFueSkubW9tZW50ID0gamVzdC5mbigpLm1vY2tSZXR1cm5WYWx1ZShtb2NrTW9tZW50KTtcclxuXHJcblx0XHRcdG1vY2tUaW1lbGluZS5yZW5kZXJFdmVudFRpbWUobW9ja1RpbWVFbCwgZXZlbnQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KG1vY2tUaW1lRWwuc2V0VGV4dCkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXCIwOTowMC0xNzowMFwiKTtcclxuXHRcdFx0ZXhwZWN0KG1vY2tUaW1lRWwuYWRkQ2xhc3MpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFwidGltZWxpbmUtZXZlbnQtdGltZS1yYW5nZVwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHJlbmRlciB0aW1lIGNvbXBvbmVudCB3aXRoIHNlY29uZHNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0aW1lQ29tcG9uZW50OiBUaW1lQ29tcG9uZW50ID0ge1xyXG5cdFx0XHRcdGhvdXI6IDEwLFxyXG5cdFx0XHRcdG1pbnV0ZTogMTUsXHJcblx0XHRcdFx0c2Vjb25kOiAzMCxcclxuXHRcdFx0XHRvcmlnaW5hbFRleHQ6IFwiMTA6MTU6MzBcIixcclxuXHRcdFx0XHRpc1JhbmdlOiBmYWxzZSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGV2ZW50OiBhbnkgPSB7XHJcblx0XHRcdFx0dGltZUluZm86IHtcclxuXHRcdFx0XHRcdHRpbWVDb21wb25lbnQsXHJcblx0XHRcdFx0XHRpc1JhbmdlOiBmYWxzZSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0bW9ja1RpbWVsaW5lLnJlbmRlckV2ZW50VGltZShtb2NrVGltZUVsLCBldmVudCk7XHJcblxyXG5cdFx0XHRleHBlY3QobW9ja1RpbWVFbC5zZXRUZXh0KS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcIjEwOjE1OjMwXCIpO1xyXG5cdFx0XHRleHBlY3QobW9ja1RpbWVFbC5hZGRDbGFzcykudG9IYXZlQmVlbkNhbGxlZFdpdGgoXCJ0aW1lbGluZS1ldmVudC10aW1lLXNpbmdsZVwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGZhbGxiYWNrIHRvIGRlZmF1bHQgdGltZSBkaXNwbGF5IHdoZW4gbm8gdGltZSBjb21wb25lbnRcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBldmVudDogYW55ID0ge1xyXG5cdFx0XHRcdHRpbWU6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxNDozMDowMFpcIiksXHJcblx0XHRcdFx0Ly8gTm8gdGltZUluZm9cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIE1vY2sgbW9tZW50IGZvciB0aGUgZmFsbGJhY2tcclxuXHRcdFx0Y29uc3QgbW9ja01vbWVudCA9IHtcclxuXHRcdFx0XHRmb3JtYXQ6IGplc3QuZm4oKS5tb2NrUmV0dXJuVmFsdWUoXCIxNDozMFwiKSxcclxuXHRcdFx0fTtcclxuXHRcdFx0KGdsb2JhbCBhcyBhbnkpLm1vbWVudCA9IGplc3QuZm4oKS5tb2NrUmV0dXJuVmFsdWUobW9ja01vbWVudCk7XHJcblxyXG5cdFx0XHRtb2NrVGltZWxpbmUucmVuZGVyRXZlbnRUaW1lKG1vY2tUaW1lRWwsIGV2ZW50KTtcclxuXHJcblx0XHRcdGV4cGVjdChtb2NrVGltZUVsLnNldFRleHQpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFwiMTQ6MzBcIik7XHJcblx0XHRcdGV4cGVjdChtb2NrVGltZUVsLmFkZENsYXNzKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcInRpbWVsaW5lLWV2ZW50LXRpbWUtZGVmYXVsdFwiKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcInRpbWVsaW5lIGdyb3VwaW5nIGFuZCBzb3J0aW5nIGludGVncmF0aW9uXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIHNlcGFyYXRlIHRpbWVkIGV2ZW50cyBmcm9tIGRhdGUtb25seSBldmVudHNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBldmVudHM6IGFueVtdID0gW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGlkOiBcInRpbWVkLTFcIixcclxuXHRcdFx0XHRcdGNvbnRlbnQ6IFwiTWVldGluZyBhdCAyIFBNXCIsXHJcblx0XHRcdFx0XHR0aW1lOiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMTQ6MDA6MDBaXCIpLFxyXG5cdFx0XHRcdFx0dGltZUluZm86IHtcclxuXHRcdFx0XHRcdFx0cHJpbWFyeVRpbWU6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxNDowMDowMFpcIiksXHJcblx0XHRcdFx0XHRcdHRpbWVDb21wb25lbnQ6IHsgaG91cjogMTQsIG1pbnV0ZTogMCwgb3JpZ2luYWxUZXh0OiBcIjIgUE1cIiwgaXNSYW5nZTogZmFsc2UgfSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRpZDogXCJkYXRlLW9ubHktMVwiLFxyXG5cdFx0XHRcdFx0Y29udGVudDogXCJBbGwgZGF5IHRhc2tcIixcclxuXHRcdFx0XHRcdHRpbWU6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQwMDowMDowMFpcIiksXHJcblx0XHRcdFx0XHQvLyBObyB0aW1lSW5mbyAtIGluZGljYXRlcyBkYXRlLW9ubHlcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGlkOiBcInRpbWVkLTJcIixcclxuXHRcdFx0XHRcdGNvbnRlbnQ6IFwiQ2FsbCBhdCAxMCBBTVwiLFxyXG5cdFx0XHRcdFx0dGltZTogbmV3IERhdGUoXCIyMDI0LTAxLTE1VDEwOjAwOjAwWlwiKSxcclxuXHRcdFx0XHRcdHRpbWVJbmZvOiB7XHJcblx0XHRcdFx0XHRcdHByaW1hcnlUaW1lOiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMTA6MDA6MDBaXCIpLFxyXG5cdFx0XHRcdFx0XHR0aW1lQ29tcG9uZW50OiB7IGhvdXI6IDEwLCBtaW51dGU6IDAsIG9yaWdpbmFsVGV4dDogXCIxMCBBTVwiLCBpc1JhbmdlOiBmYWxzZSB9LFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRdO1xyXG5cclxuXHRcdFx0Y29uc3QgdGltZWRFdmVudHM6IGFueVtdID0gW107XHJcblx0XHRcdGNvbnN0IGRhdGVPbmx5RXZlbnRzOiBhbnlbXSA9IFtdO1xyXG5cclxuXHRcdFx0ZXZlbnRzLmZvckVhY2goKGV2ZW50KSA9PiB7XHJcblx0XHRcdFx0aWYgKG1vY2tUaW1lbGluZS5oYXNTcGVjaWZpY1RpbWUoZXZlbnQpKSB7XHJcblx0XHRcdFx0XHR0aW1lZEV2ZW50cy5wdXNoKGV2ZW50KTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0ZGF0ZU9ubHlFdmVudHMucHVzaChldmVudCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGV4cGVjdCh0aW1lZEV2ZW50cykudG9IYXZlTGVuZ3RoKDIpO1xyXG5cdFx0XHRleHBlY3QodGltZWRFdmVudHNbMF0uaWQpLnRvQmUoXCJ0aW1lZC0xXCIpO1xyXG5cdFx0XHRleHBlY3QodGltZWRFdmVudHNbMV0uaWQpLnRvQmUoXCJ0aW1lZC0yXCIpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KGRhdGVPbmx5RXZlbnRzKS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRcdGV4cGVjdChkYXRlT25seUV2ZW50c1swXS5pZCkudG9CZShcImRhdGUtb25seS0xXCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgZ3JvdXAgZXZlbnRzIHdpdGggdGhlIHNhbWUgdGltZVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGV2ZW50czogYW55W10gPSBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0aWQ6IFwiZXZlbnQtMVwiLFxyXG5cdFx0XHRcdFx0Y29udGVudDogXCJGaXJzdCBtZWV0aW5nXCIsXHJcblx0XHRcdFx0XHR0aW1lOiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMTQ6MDA6MDBaXCIpLFxyXG5cdFx0XHRcdFx0dGltZUluZm86IHtcclxuXHRcdFx0XHRcdFx0cHJpbWFyeVRpbWU6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxNDowMDowMFpcIiksXHJcblx0XHRcdFx0XHRcdHRpbWVDb21wb25lbnQ6IHsgaG91cjogMTQsIG1pbnV0ZTogMCwgb3JpZ2luYWxUZXh0OiBcIjIgUE1cIiwgaXNSYW5nZTogZmFsc2UgfSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRpZDogXCJldmVudC0yXCIsXHJcblx0XHRcdFx0XHRjb250ZW50OiBcIlNlY29uZCBtZWV0aW5nXCIsXHJcblx0XHRcdFx0XHR0aW1lOiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMTQ6MDA6MDBaXCIpLFxyXG5cdFx0XHRcdFx0dGltZUluZm86IHtcclxuXHRcdFx0XHRcdFx0cHJpbWFyeVRpbWU6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxNDowMDowMFpcIiksXHJcblx0XHRcdFx0XHRcdHRpbWVDb21wb25lbnQ6IHsgaG91cjogMTQsIG1pbnV0ZTogMCwgb3JpZ2luYWxUZXh0OiBcIjIgUE1cIiwgaXNSYW5nZTogZmFsc2UgfSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRpZDogXCJldmVudC0zXCIsXHJcblx0XHRcdFx0XHRjb250ZW50OiBcIkRpZmZlcmVudCB0aW1lXCIsXHJcblx0XHRcdFx0XHR0aW1lOiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMTU6MDA6MDBaXCIpLFxyXG5cdFx0XHRcdFx0dGltZUluZm86IHtcclxuXHRcdFx0XHRcdFx0cHJpbWFyeVRpbWU6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQxNTowMDowMFpcIiksXHJcblx0XHRcdFx0XHRcdHRpbWVDb21wb25lbnQ6IHsgaG91cjogMTUsIG1pbnV0ZTogMCwgb3JpZ2luYWxUZXh0OiBcIjMgUE1cIiwgaXNSYW5nZTogZmFsc2UgfSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XTtcclxuXHJcblx0XHRcdGNvbnN0IHRpbWVHcm91cHMgPSBuZXcgTWFwPHN0cmluZywgYW55W10+KCk7XHJcblxyXG5cdFx0XHRldmVudHMuZm9yRWFjaCgoZXZlbnQpID0+IHtcclxuXHRcdFx0XHRjb25zdCB0aW1lS2V5ID0gbW9ja1RpbWVsaW5lLmdldFRpbWVHcm91cEtleShcclxuXHRcdFx0XHRcdGV2ZW50LnRpbWVJbmZvPy5wcmltYXJ5VGltZSB8fCBldmVudC50aW1lLFxyXG5cdFx0XHRcdFx0ZXZlbnRcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGlmICghdGltZUdyb3Vwcy5oYXModGltZUtleSkpIHtcclxuXHRcdFx0XHRcdHRpbWVHcm91cHMuc2V0KHRpbWVLZXksIFtdKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0dGltZUdyb3Vwcy5nZXQodGltZUtleSkhLnB1c2goZXZlbnQpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGV4cGVjdCh0aW1lR3JvdXBzLnNpemUpLnRvQmUoMik7XHJcblx0XHRcdGV4cGVjdCh0aW1lR3JvdXBzLmdldChcIjE0OjAwXCIpKS50b0hhdmVMZW5ndGgoMik7XHJcblx0XHRcdGV4cGVjdCh0aW1lR3JvdXBzLmdldChcIjE1OjAwXCIpKS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgbWl4ZWQgdGltZWQgYW5kIGRhdGUtb25seSBldmVudHMgaW4gY2hyb25vbG9naWNhbCBvcmRlclwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGV2ZW50czogYW55W10gPSBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0aWQ6IFwiZGF0ZS1vbmx5XCIsXHJcblx0XHRcdFx0XHRjb250ZW50OiBcIkFsbCBkYXkgdGFza1wiLFxyXG5cdFx0XHRcdFx0dGltZTogbmV3IERhdGUoXCIyMDI0LTAxLTE1VDAwOjAwOjAwWlwiKSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGlkOiBcIm1vcm5pbmdcIixcclxuXHRcdFx0XHRcdGNvbnRlbnQ6IFwiTW9ybmluZyBtZWV0aW5nXCIsXHJcblx0XHRcdFx0XHR0aW1lOiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMDk6MDA6MDBaXCIpLFxyXG5cdFx0XHRcdFx0dGltZUluZm86IHtcclxuXHRcdFx0XHRcdFx0cHJpbWFyeVRpbWU6IG5ldyBEYXRlKFwiMjAyNC0wMS0xNVQwOTowMDowMFpcIiksXHJcblx0XHRcdFx0XHRcdHRpbWVDb21wb25lbnQ6IHsgaG91cjogOSwgbWludXRlOiAwLCBvcmlnaW5hbFRleHQ6IFwiOSBBTVwiLCBpc1JhbmdlOiBmYWxzZSB9LFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGlkOiBcImFmdGVybm9vblwiLFxyXG5cdFx0XHRcdFx0Y29udGVudDogXCJBZnRlcm5vb24gY2FsbFwiLFxyXG5cdFx0XHRcdFx0dGltZTogbmV3IERhdGUoXCIyMDI0LTAxLTE1VDE1OjAwOjAwWlwiKSxcclxuXHRcdFx0XHRcdHRpbWVJbmZvOiB7XHJcblx0XHRcdFx0XHRcdHByaW1hcnlUaW1lOiBuZXcgRGF0ZShcIjIwMjQtMDEtMTVUMTU6MDA6MDBaXCIpLFxyXG5cdFx0XHRcdFx0XHR0aW1lQ29tcG9uZW50OiB7IGhvdXI6IDE1LCBtaW51dGU6IDAsIG9yaWdpbmFsVGV4dDogXCIzIFBNXCIsIGlzUmFuZ2U6IGZhbHNlIH0sXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdF07XHJcblxyXG5cdFx0XHRjb25zdCBzb3J0ZWRFdmVudHMgPSBtb2NrVGltZWxpbmUuc29ydEV2ZW50c0J5VGltZShldmVudHMpO1xyXG5cclxuXHRcdFx0Ly8gRGF0ZS1vbmx5IGV2ZW50cyBzaG91bGQgY29tZSBmaXJzdCAobWlkbmlnaHQpLCB0aGVuIHRpbWVkIGV2ZW50c1xyXG5cdFx0XHRleHBlY3Qoc29ydGVkRXZlbnRzWzBdLmlkKS50b0JlKFwiZGF0ZS1vbmx5XCIpO1xyXG5cdFx0XHRleHBlY3Qoc29ydGVkRXZlbnRzWzFdLmlkKS50b0JlKFwibW9ybmluZ1wiKTtcclxuXHRcdFx0ZXhwZWN0KHNvcnRlZEV2ZW50c1syXS5pZCkudG9CZShcImFmdGVybm9vblwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGdlbmVyYXRlIGNvbnNpc3RlbnQgdGltZSBncm91cCBrZXlzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZXZlbnQxID0ge1xyXG5cdFx0XHRcdHRpbWVJbmZvOiB7XHJcblx0XHRcdFx0XHR0aW1lQ29tcG9uZW50OiB7IGhvdXI6IDE0LCBtaW51dGU6IDMwLCBvcmlnaW5hbFRleHQ6IFwiMjozMCBQTVwiLCBpc1JhbmdlOiBmYWxzZSB9LFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBldmVudDIgPSB7XHJcblx0XHRcdFx0dGltZTogbmV3IERhdGUoXCIyMDI0LTAxLTE1VDE0OjMwOjAwWlwiKSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIE1vY2sgbW9tZW50IGZvciBmYWxsYmFja1xyXG5cdFx0XHRjb25zdCBtb2NrTW9tZW50ID0ge1xyXG5cdFx0XHRcdGZvcm1hdDogamVzdC5mbigpLm1vY2tSZXR1cm5WYWx1ZShcIjE0OjMwXCIpLFxyXG5cdFx0XHR9O1xyXG5cdFx0XHQoZ2xvYmFsIGFzIGFueSkubW9tZW50ID0gamVzdC5mbigpLm1vY2tSZXR1cm5WYWx1ZShtb2NrTW9tZW50KTtcclxuXHJcblx0XHRcdGNvbnN0IGtleTEgPSBtb2NrVGltZWxpbmUuZ2V0VGltZUdyb3VwS2V5KG5ldyBEYXRlKCksIGV2ZW50MSBhcyBhbnkpO1xyXG5cdFx0XHRjb25zdCBrZXkyID0gbW9ja1RpbWVsaW5lLmdldFRpbWVHcm91cEtleShldmVudDIudGltZSwgZXZlbnQyIGFzIGFueSk7XHJcblxyXG5cdFx0XHRleHBlY3Qoa2V5MSkudG9CZShcIjE0OjMwXCIpO1xyXG5cdFx0XHRleHBlY3Qoa2V5MikudG9CZShcIjE0OjMwXCIpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiZm9ybWF0VGltZUNvbXBvbmVudFwiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBmb3JtYXQgdGltZSBjb21wb25lbnQgd2l0aG91dCBzZWNvbmRzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGltZUNvbXBvbmVudDogVGltZUNvbXBvbmVudCA9IHtcclxuXHRcdFx0XHRob3VyOiA5LFxyXG5cdFx0XHRcdG1pbnV0ZTogMzAsXHJcblx0XHRcdFx0b3JpZ2luYWxUZXh0OiBcIjk6MzBcIixcclxuXHRcdFx0XHRpc1JhbmdlOiBmYWxzZSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IG1vY2tUaW1lbGluZS5mb3JtYXRUaW1lQ29tcG9uZW50KHRpbWVDb21wb25lbnQpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlKFwiMDk6MzBcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBmb3JtYXQgdGltZSBjb21wb25lbnQgd2l0aCBzZWNvbmRzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGltZUNvbXBvbmVudDogVGltZUNvbXBvbmVudCA9IHtcclxuXHRcdFx0XHRob3VyOiAxNCxcclxuXHRcdFx0XHRtaW51dGU6IDUsXHJcblx0XHRcdFx0c2Vjb25kOiA0NSxcclxuXHRcdFx0XHRvcmlnaW5hbFRleHQ6IFwiMTQ6MDU6NDVcIixcclxuXHRcdFx0XHRpc1JhbmdlOiBmYWxzZSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IG1vY2tUaW1lbGluZS5mb3JtYXRUaW1lQ29tcG9uZW50KHRpbWVDb21wb25lbnQpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlKFwiMTQ6MDU6NDVcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBwYWQgc2luZ2xlIGRpZ2l0IGhvdXJzIGFuZCBtaW51dGVzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGltZUNvbXBvbmVudDogVGltZUNvbXBvbmVudCA9IHtcclxuXHRcdFx0XHRob3VyOiA3LFxyXG5cdFx0XHRcdG1pbnV0ZTogNSxcclxuXHRcdFx0XHRvcmlnaW5hbFRleHQ6IFwiNzowNVwiLFxyXG5cdFx0XHRcdGlzUmFuZ2U6IGZhbHNlLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gbW9ja1RpbWVsaW5lLmZvcm1hdFRpbWVDb21wb25lbnQodGltZUNvbXBvbmVudCk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvQmUoXCIwNzowNVwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBtaWRuaWdodCAoMDA6MDApXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGltZUNvbXBvbmVudDogVGltZUNvbXBvbmVudCA9IHtcclxuXHRcdFx0XHRob3VyOiAwLFxyXG5cdFx0XHRcdG1pbnV0ZTogMCxcclxuXHRcdFx0XHRvcmlnaW5hbFRleHQ6IFwiMDA6MDBcIixcclxuXHRcdFx0XHRpc1JhbmdlOiBmYWxzZSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IG1vY2tUaW1lbGluZS5mb3JtYXRUaW1lQ29tcG9uZW50KHRpbWVDb21wb25lbnQpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlKFwiMDA6MDBcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgbm9vbiAoMTI6MDApXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGltZUNvbXBvbmVudDogVGltZUNvbXBvbmVudCA9IHtcclxuXHRcdFx0XHRob3VyOiAxMixcclxuXHRcdFx0XHRtaW51dGU6IDAsXHJcblx0XHRcdFx0b3JpZ2luYWxUZXh0OiBcIjEyOjAwXCIsXHJcblx0XHRcdFx0aXNSYW5nZTogZmFsc2UsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBtb2NrVGltZWxpbmUuZm9ybWF0VGltZUNvbXBvbmVudCh0aW1lQ29tcG9uZW50KTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9CZShcIjEyOjAwXCIpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcbn0pOyJdfQ==