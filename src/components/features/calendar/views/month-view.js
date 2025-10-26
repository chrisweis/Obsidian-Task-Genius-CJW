import { __awaiter } from "tslib";
import { debounce, moment } from "obsidian";
import { renderCalendarEvent } from "../rendering/event-renderer"; // Import the new renderer
import { CalendarViewComponent } from "./base-view"; // Import base class and options type
import Sortable from "sortablejs";
/**
 * Utility function to parse date string (YYYY-MM-DD) to Date object
 * Optimized for performance to replace moment.js usage
 */
function parseDateString(dateStr) {
    const dateParts = dateStr.split("-");
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed in Date
    const day = parseInt(dateParts[2], 10);
    return new Date(year, month, day);
}
/**
 * Renders the month view grid as a component.
 */
export class MonthView extends CalendarViewComponent {
    constructor(app, plugin, containerEl, currentViewId, currentDate, events, options, // Use the base options type
    overrideConfig) {
        super(plugin, app, containerEl, events, options); // Call base constructor
        this.currentViewId = currentViewId;
        this.sortableInstances = []; // Store sortable instances for cleanup
        this.debounceHover = debounce((ev) => {
            var _a;
            const target = ev.target;
            if (target.closest(".calendar-day-cell")) {
                const dateStr = (_a = target
                    .closest(".calendar-day-cell")) === null || _a === void 0 ? void 0 : _a.getAttribute("data-date");
                if (this.options.onDayHover && dateStr) {
                    // Use optimized date parsing for better performance
                    const date = parseDateString(dateStr);
                    this.options.onDayHover(ev, date.getTime());
                }
            }
        }, 200);
        this.app = app; // Still store app if needed directly
        this.plugin = plugin; // Still store plugin if needed directly
        this.currentDate = currentDate;
        this.overrideConfig = overrideConfig;
    }
    render() {
        var _a, _b, _c, _d, _e, _f;
        // Get view settings, prefer override values when provided
        const viewConfig = (_a = this.plugin.settings.viewConfiguration.find((v) => v.id === this.currentViewId)) === null || _a === void 0 ? void 0 : _a.specificConfig;
        const firstDayOfWeekSetting = (_c = (_b = this.overrideConfig) === null || _b === void 0 ? void 0 : _b.firstDayOfWeek) !== null && _c !== void 0 ? _c : viewConfig === null || viewConfig === void 0 ? void 0 : viewConfig.firstDayOfWeek;
        const hideWeekends = (_f = ((_e = (_d = this.overrideConfig) === null || _d === void 0 ? void 0 : _d.hideWeekends) !== null && _e !== void 0 ? _e : viewConfig === null || viewConfig === void 0 ? void 0 : viewConfig.hideWeekends)) !== null && _f !== void 0 ? _f : false;
        // Default to Sunday (0) if the setting is undefined, following 0=Sun, 1=Mon, ..., 6=Sat
        const effectiveFirstDay = firstDayOfWeekSetting === undefined ? 0 : firstDayOfWeekSetting;
        // 1. Calculate the date range for the grid using effective first day
        const startOfMonth = this.currentDate.clone().startOf("month");
        const endOfMonth = this.currentDate.clone().endOf("month");
        // Calculate grid start based on the week containing the start of the month, adjusted for the effective first day
        const gridStart = startOfMonth.clone().weekday(effectiveFirstDay - 7); // moment handles wrapping correctly
        // Calculate grid end based on the week containing the end of the month, adjusted for the effective first day
        let gridEnd = endOfMonth.clone().weekday(effectiveFirstDay + 6); // moment handles wrapping correctly
        // Adjust grid coverage based on whether weekends are hidden
        if (hideWeekends) {
            // When weekends are hidden, we need fewer days to fill the grid
            // Calculate how many work days we need (approximately 6 weeks * 5 work days = 30 days)
            let workDaysCount = 0;
            let tempIter = gridStart.clone();
            // Count existing work days in the current range
            while (tempIter.isSameOrBefore(gridEnd, "day")) {
                const isWeekend = tempIter.day() === 0 || tempIter.day() === 6;
                if (!isWeekend) {
                    workDaysCount++;
                }
                tempIter.add(1, "day");
            }
            // Ensure we have at least 30 work days (6 weeks * 5 days) for consistent layout
            while (workDaysCount < 30) {
                gridEnd.add(1, "day");
                const isWeekend = gridEnd.day() === 0 || gridEnd.day() === 6;
                if (!isWeekend) {
                    workDaysCount++;
                }
            }
        }
        else {
            // Original logic for when weekends are shown
            // Ensure grid covers at least 6 weeks (42 days) for consistent layout
            if (gridEnd.diff(gridStart, "days") + 1 < 42) {
                // Add full weeks until at least 42 days are covered
                const daysToAdd = 42 - (gridEnd.diff(gridStart, "days") + 1);
                gridEnd.add(daysToAdd, "days");
            }
        }
        this.containerEl.empty();
        this.containerEl.addClass("view-month"); // Add class for styling
        // Add hide-weekends class if weekend hiding is enabled
        if (hideWeekends) {
            this.containerEl.addClass("hide-weekends");
        }
        else {
            this.containerEl.removeClass("hide-weekends");
        }
        // 2. Add weekday headers, rotated according to effective first day
        const headerRow = this.containerEl.createDiv("calendar-weekday-header");
        const weekdays = moment.weekdaysShort(true); // Gets locale-aware short weekdays
        const rotatedWeekdays = [
            ...weekdays.slice(effectiveFirstDay),
            ...weekdays.slice(0, effectiveFirstDay),
        ];
        // Filter out weekends if hideWeekends is enabled
        const filteredWeekdays = hideWeekends
            ? rotatedWeekdays.filter((_, index) => {
                // Calculate the actual day of week for this header position
                const dayOfWeek = (effectiveFirstDay + index) % 7;
                return dayOfWeek !== 0 && dayOfWeek !== 6; // Exclude Sunday (0) and Saturday (6)
            })
            : rotatedWeekdays;
        filteredWeekdays.forEach((day) => {
            const weekdayEl = headerRow.createDiv("calendar-weekday");
            weekdayEl.textContent = day;
        });
        // 3. Create day cells grid container
        const gridContainer = this.containerEl.createDiv("calendar-month-grid");
        const dayCells = {}; // Store cells by date string 'YYYY-MM-DD'
        let currentDayIter = gridStart.clone();
        while (currentDayIter.isSameOrBefore(gridEnd, "day")) {
            const isWeekend = currentDayIter.day() === 0 || currentDayIter.day() === 6; // Sunday or Saturday
            // Skip weekend days if hideWeekends is enabled
            if (hideWeekends && isWeekend) {
                currentDayIter.add(1, "day");
                continue;
            }
            const cell = gridContainer.createEl("div", {
                cls: "calendar-day-cell",
                attr: {
                    "data-date": currentDayIter.format("YYYY-MM-DD"),
                },
            });
            const dateStr = currentDayIter.format("YYYY-MM-DD");
            dayCells[dateStr] = cell;
            const headerEl = cell.createDiv("calendar-day-header");
            // Add day number
            const dayNumberEl = headerEl.createDiv("calendar-day-number");
            dayNumberEl.textContent = currentDayIter.format("D");
            // Add styling classes
            if (!currentDayIter.isSame(this.currentDate, "month")) {
                cell.addClass("is-other-month");
            }
            if (currentDayIter.isSame(moment(), "day")) {
                cell.addClass("is-today");
            }
            // Note: We don't add is-weekend class when hideWeekends is enabled
            // because weekend cells are not created at all
            if (!hideWeekends && isWeekend) {
                cell.addClass("is-weekend");
            }
            // Add events container within the cell
            cell.createDiv("calendar-events-container"); // This is where events will be appended
            currentDayIter.add(1, "day");
        }
        // 4. Filter and Render Events into the appropriate cells (uses calculated gridStart/gridEnd)
        this.events.forEach((event) => {
            const eventStartMoment = moment(event.start).startOf("day");
            const gridEndMoment = gridEnd.clone().endOf("day"); // Ensure comparison includes full last day
            const gridStartMoment = gridStart.clone().startOf("day");
            // Ensure the event is relevant to the displayed grid dates
            if (eventStartMoment.isAfter(gridEndMoment) || // Starts after the grid ends
                (event.end &&
                    moment(event.end).startOf("day").isBefore(gridStartMoment)) // Ends before the grid starts
            ) {
                return; // Event is completely outside the current grid view
            }
            // --- Simplified logic: Only render event on its start date ---
            // Check if the event's start date is within the visible grid dates
            if (eventStartMoment.isSameOrAfter(gridStartMoment) &&
                eventStartMoment.isSameOrBefore(gridEndMoment)) {
                const dateStr = eventStartMoment.format("YYYY-MM-DD");
                const targetCell = dayCells[dateStr];
                if (targetCell) {
                    const eventsContainer = targetCell.querySelector(".calendar-events-container");
                    if (eventsContainer) {
                        // Render the event using the existing renderer
                        const { eventEl, component } = renderCalendarEvent({
                            event: event,
                            viewType: "month",
                            app: this.app,
                            onEventClick: this.options.onEventClick,
                            onEventHover: this.options.onEventHover,
                            onEventContextMenu: this.options.onEventContextMenu,
                            onEventComplete: this.options.onEventComplete,
                        });
                        this.addChild(component);
                        eventsContainer.appendChild(eventEl);
                    }
                }
            }
            // --- End of simplified logic ---
        });
        // 5. Render badges for ICS events with badge showType
        Object.keys(dayCells).forEach((dateStr) => {
            var _a, _b;
            const cell = dayCells[dateStr];
            // Use optimized date parsing for better performance
            const date = parseDateString(dateStr);
            const badgeEvents = ((_b = (_a = this.options).getBadgeEventsForDate) === null || _b === void 0 ? void 0 : _b.call(_a, date)) || [];
            if (badgeEvents.length > 0) {
                const headerEl = cell.querySelector(".calendar-day-header");
                const badgesContainer = headerEl.createDiv("calendar-badges-container");
                if (badgesContainer) {
                    badgeEvents.forEach((badgeEvent) => {
                        const badgeEl = badgesContainer.createEl("div", {
                            cls: "calendar-badge",
                        });
                        // Add color styling if available
                        if (badgeEvent.color) {
                            badgeEl.style.backgroundColor = badgeEvent.color;
                        }
                        // Add count text
                        badgeEl.textContent = badgeEvent.content;
                    });
                }
            }
        });
        console.log(`Rendered Month View component from ${gridStart.format("YYYY-MM-DD")} to ${gridEnd.format("YYYY-MM-DD")} (First day: ${effectiveFirstDay})`);
        this.registerDomEvent(gridContainer, "click", (ev) => {
            var _a, _b;
            const target = ev.target;
            if (target.closest(".calendar-day-number")) {
                const dateStr = (_a = target
                    .closest(".calendar-day-cell")) === null || _a === void 0 ? void 0 : _a.getAttribute("data-date");
                if (this.options.onDayClick && dateStr) {
                    console.log("Day number clicked:", dateStr);
                    // Use optimized date parsing for better performance
                    const date = parseDateString(dateStr);
                    this.options.onDayClick(ev, date.getTime(), {
                        behavior: "open-task-view",
                    });
                }
                return;
            }
            if (target.closest(".calendar-day-cell")) {
                const dateStr = (_b = target
                    .closest(".calendar-day-cell")) === null || _b === void 0 ? void 0 : _b.getAttribute("data-date");
                if (this.options.onDayClick && dateStr) {
                    // Use optimized date parsing for better performance
                    const date = parseDateString(dateStr);
                    this.options.onDayClick(ev, date.getTime(), {
                        behavior: "open-quick-capture",
                    });
                }
            }
        });
        this.registerDomEvent(gridContainer, "mouseover", (ev) => {
            this.debounceHover(ev);
        });
        // Initialize drag and drop functionality
        this.initializeDragAndDrop(dayCells);
    }
    // Update methods to allow changing data after initial render
    updateEvents(events) {
        this.events = events;
        this.render(); // Re-render will pick up current settings
    }
    updateCurrentDate(date) {
        this.currentDate = date;
        this.render(); // Re-render will pick up current settings and date
    }
    /**
     * Initialize drag and drop functionality for calendar events
     */
    initializeDragAndDrop(dayCells) {
        // Clean up existing sortable instances
        this.sortableInstances.forEach((instance) => instance.destroy());
        this.sortableInstances = [];
        // Initialize sortable for each day's events container
        Object.entries(dayCells).forEach(([dateStr, dayCell]) => {
            const eventsContainer = dayCell.querySelector(".calendar-events-container");
            if (eventsContainer) {
                const sortableInstance = Sortable.create(eventsContainer, {
                    group: "calendar-events",
                    animation: 150,
                    ghostClass: "calendar-event-ghost",
                    dragClass: "calendar-event-dragging",
                    onEnd: (event) => {
                        this.handleDragEnd(event, dateStr);
                    },
                });
                this.sortableInstances.push(sortableInstance);
            }
        });
    }
    /**
     * Handle drag end event to update task dates
     */
    handleDragEnd(event, originalDateStr) {
        return __awaiter(this, void 0, void 0, function* () {
            const eventEl = event.item;
            const eventId = eventEl.dataset.eventId;
            const targetContainer = event.to;
            const targetDateCell = targetContainer.closest(".calendar-day-cell");
            if (!eventId || !targetDateCell) {
                console.warn("Could not determine event ID or target date for drag operation");
                return;
            }
            const targetDateStr = targetDateCell.getAttribute("data-date");
            if (!targetDateStr || targetDateStr === originalDateStr) {
                // No date change, nothing to do
                return;
            }
            // Find the calendar event
            const calendarEvent = this.events.find((e) => e.id === eventId);
            if (!calendarEvent) {
                console.warn(`Calendar event with ID ${eventId} not found`);
                return;
            }
            try {
                yield this.updateTaskDate(calendarEvent, targetDateStr);
                console.log(`Task ${eventId} moved from ${originalDateStr} to ${targetDateStr}`);
            }
            catch (error) {
                console.error("Failed to update task date:", error);
                // Revert the visual change by re-rendering
                this.render();
            }
        });
    }
    /**
     * Update task date based on the target date
     */
    updateTaskDate(calendarEvent, targetDateStr) {
        return __awaiter(this, void 0, void 0, function* () {
            // Use optimized date parsing for better performance
            const targetDate = parseDateString(targetDateStr).getTime();
            if (!this.plugin.writeAPI) {
                throw new Error("WriteAPI not available");
            }
            // Create updated task with new date
            const updatedTask = Object.assign({}, calendarEvent);
            // Determine which date field to update based on what the task currently has
            if (calendarEvent.metadata.dueDate) {
                updatedTask.metadata.dueDate = targetDate;
            }
            else if (calendarEvent.metadata.scheduledDate) {
                updatedTask.metadata.scheduledDate = targetDate;
            }
            else if (calendarEvent.metadata.startDate) {
                updatedTask.metadata.startDate = targetDate;
            }
            else {
                // Default to due date if no date is set
                updatedTask.metadata.dueDate = targetDate;
            }
            // Update the task
            const result = yield this.plugin.writeAPI.updateTask({
                taskId: calendarEvent.id,
                updates: updatedTask,
            });
            if (!result.success) {
                throw new Error(`Failed to update task: ${result.error}`);
            }
        });
    }
    /**
     * Clean up sortable instances when component is destroyed
     */
    onunload() {
        this.sortableInstances.forEach((instance) => instance.destroy());
        this.sortableInstances = [];
        super.onunload();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9udGgtdmlldy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1vbnRoLXZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBa0IsUUFBUSxFQUFFLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUU1RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQyxDQUFDLDBCQUEwQjtBQU03RixPQUFPLEVBQUUscUJBQXFCLEVBQXVCLE1BQU0sYUFBYSxDQUFDLENBQUMscUNBQXFDO0FBQy9HLE9BQU8sUUFBUSxNQUFNLFlBQVksQ0FBQztBQUVsQzs7O0dBR0c7QUFDSCxTQUFTLGVBQWUsQ0FBQyxPQUFlO0lBQ3ZDLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDckMsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN4QyxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLDZCQUE2QjtJQUMzRSxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztBQUNuQyxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sU0FBVSxTQUFRLHFCQUFxQjtJQU9uRCxZQUNDLEdBQVEsRUFDUixNQUE2QixFQUM3QixXQUF3QixFQUNoQixhQUFxQixFQUM3QixXQUEwQixFQUMxQixNQUF1QixFQUN2QixPQUE0QixFQUFFLDRCQUE0QjtJQUMxRCxjQUFnRDtRQUVoRCxLQUFLLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxXQUFXLEVBQUUs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QUFTLEVBQUU7Z0JBQzVDLFdBQVcsQ0FBQyxRQUFRLENBQUMsU0FBUyxHQUFHLFVBQVUsQ0FBQzthQUM1QztpQkFBTTtnQkFDTix3Q0FBd0M7Z0JBQ3hDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxHQUFHLFVBQVUsQ0FBQzthQUMxQztZQUVELGtCQUFrQjtZQUNsQixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQztnQkFDcEQsTUFBTSxFQUFFLGFBQWEsQ0FBQyxFQUFFO2dCQUN4QixPQUFPLEVBQUUsV0FBVzthQUNwQixDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRTtnQkFDcEIsTUFBTSxJQUFJLEtBQUssQ0FBQywwQkFBMEIsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7YUFDMUQ7UUFDRixDQUFDO0tBQUE7SUFFRDs7T0FFRztJQUNILFFBQVE7UUFDUCxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUNqRSxJQUFJLENBQUMsaUJBQWlCLEdBQUcsRUFBRSxDQUFDO1FBQzVCLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNsQixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHAsIENvbXBvbmVudCwgZGVib3VuY2UsIG1vbWVudCB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBDYWxlbmRhckV2ZW50IH0gZnJvbSAnQC9jb21wb25lbnRzL2ZlYXR1cmVzL2NhbGVuZGFyL2luZGV4JztcclxuaW1wb3J0IHsgcmVuZGVyQ2FsZW5kYXJFdmVudCB9IGZyb20gXCIuLi9yZW5kZXJpbmcvZXZlbnQtcmVuZGVyZXJcIjsgLy8gSW1wb3J0IHRoZSBuZXcgcmVuZGVyZXJcclxuaW1wb3J0IHtcclxuXHRDYWxlbmRhclNwZWNpZmljQ29uZmlnLFxyXG5cdGdldFZpZXdTZXR0aW5nT3JEZWZhdWx0LFxyXG59IGZyb20gXCJAL2NvbW1vbi9zZXR0aW5nLWRlZmluaXRpb25cIjsgLy8gSW1wb3J0IGhlbHBlclxyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7IC8vIEltcG9ydCBwbHVnaW4gdHlwZSBmb3Igc2V0dGluZ3MgYWNjZXNzXHJcbmltcG9ydCB7IENhbGVuZGFyVmlld0NvbXBvbmVudCwgQ2FsZW5kYXJWaWV3T3B0aW9ucyB9IGZyb20gXCIuL2Jhc2Utdmlld1wiOyAvLyBJbXBvcnQgYmFzZSBjbGFzcyBhbmQgb3B0aW9ucyB0eXBlXHJcbmltcG9ydCBTb3J0YWJsZSBmcm9tIFwic29ydGFibGVqc1wiO1xyXG5cclxuLyoqXHJcbiAqIFV0aWxpdHkgZnVuY3Rpb24gdG8gcGFyc2UgZGF0ZSBzdHJpbmcgKFlZWVktTU0tREQpIHRvIERhdGUgb2JqZWN0XHJcbiAqIE9wdGltaXplZCBmb3IgcGVyZm9ybWFuY2UgdG8gcmVwbGFjZSBtb21lbnQuanMgdXNhZ2VcclxuICovXHJcbmZ1bmN0aW9uIHBhcnNlRGF0ZVN0cmluZyhkYXRlU3RyOiBzdHJpbmcpOiBEYXRlIHtcclxuXHRjb25zdCBkYXRlUGFydHMgPSBkYXRlU3RyLnNwbGl0KFwiLVwiKTtcclxuXHRjb25zdCB5ZWFyID0gcGFyc2VJbnQoZGF0ZVBhcnRzWzBdLCAxMCk7XHJcblx0Y29uc3QgbW9udGggPSBwYXJzZUludChkYXRlUGFydHNbMV0sIDEwKSAtIDE7IC8vIE1vbnRoIGlzIDAtaW5kZXhlZCBpbiBEYXRlXHJcblx0Y29uc3QgZGF5ID0gcGFyc2VJbnQoZGF0ZVBhcnRzWzJdLCAxMCk7XHJcblx0cmV0dXJuIG5ldyBEYXRlKHllYXIsIG1vbnRoLCBkYXkpO1xyXG59XHJcblxyXG4vKipcclxuICogUmVuZGVycyB0aGUgbW9udGggdmlldyBncmlkIGFzIGEgY29tcG9uZW50LlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIE1vbnRoVmlldyBleHRlbmRzIENhbGVuZGFyVmlld0NvbXBvbmVudCB7XHJcblx0cHJpdmF0ZSBjdXJyZW50RGF0ZTogbW9tZW50Lk1vbWVudDtcclxuXHRwcml2YXRlIGFwcDogQXBwOyAvLyBLZWVwIGFwcCByZWZlcmVuY2UgaWYgbmVlZGVkIGRpcmVjdGx5XHJcblx0cHJpdmF0ZSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbjsgLy8gS2VlcCBwbHVnaW4gcmVmZXJlbmNlIGlmIG5lZWRlZCBkaXJlY3RseVxyXG5cdHByaXZhdGUgc29ydGFibGVJbnN0YW5jZXM6IFNvcnRhYmxlW10gPSBbXTsgLy8gU3RvcmUgc29ydGFibGUgaW5zdGFuY2VzIGZvciBjbGVhbnVwXHJcblx0cHJpdmF0ZSBvdmVycmlkZUNvbmZpZz86IFBhcnRpYWw8Q2FsZW5kYXJTcGVjaWZpY0NvbmZpZz47XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0YXBwOiBBcHAsXHJcblx0XHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCxcclxuXHRcdHByaXZhdGUgY3VycmVudFZpZXdJZDogc3RyaW5nLFxyXG5cdFx0Y3VycmVudERhdGU6IG1vbWVudC5Nb21lbnQsXHJcblx0XHRldmVudHM6IENhbGVuZGFyRXZlbnRbXSxcclxuXHRcdG9wdGlvbnM6IENhbGVuZGFyVmlld09wdGlvbnMsIC8vIFVzZSB0aGUgYmFzZSBvcHRpb25zIHR5cGVcclxuXHRcdG92ZXJyaWRlQ29uZmlnPzogUGFydGlhbDxDYWxlbmRhclNwZWNpZmljQ29uZmlnPlxyXG5cdCkge1xyXG5cdFx0c3VwZXIocGx1Z2luLCBhcHAsIGNvbnRhaW5lckVsLCBldmVudHMsIG9wdGlvbnMpOyAvLyBDYWxsIGJhc2UgY29uc3RydWN0b3JcclxuXHRcdHRoaXMuYXBwID0gYXBwOyAvLyBTdGlsbCBzdG9yZSBhcHAgaWYgbmVlZGVkIGRpcmVjdGx5XHJcblx0XHR0aGlzLnBsdWdpbiA9IHBsdWdpbjsgLy8gU3RpbGwgc3RvcmUgcGx1Z2luIGlmIG5lZWRlZCBkaXJlY3RseVxyXG5cdFx0dGhpcy5jdXJyZW50RGF0ZSA9IGN1cnJlbnREYXRlO1xyXG5cdFx0dGhpcy5vdmVycmlkZUNvbmZpZyA9IG92ZXJyaWRlQ29uZmlnO1xyXG5cdH1cclxuXHJcblx0cmVuZGVyKCk6IHZvaWQge1xyXG5cdFx0Ly8gR2V0IHZpZXcgc2V0dGluZ3MsIHByZWZlciBvdmVycmlkZSB2YWx1ZXMgd2hlbiBwcm92aWRlZFxyXG5cdFx0Y29uc3Qgdmlld0NvbmZpZyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnZpZXdDb25maWd1cmF0aW9uLmZpbmQoXHJcblx0XHRcdCh2KSA9PiB2LmlkID09PSB0aGlzLmN1cnJlbnRWaWV3SWRcclxuXHRcdCk/LnNwZWNpZmljQ29uZmlnIGFzIENhbGVuZGFyU3BlY2lmaWNDb25maWc7XHJcblx0XHRjb25zdCBmaXJzdERheU9mV2Vla1NldHRpbmcgPSB0aGlzLm92ZXJyaWRlQ29uZmlnPy5maXJzdERheU9mV2VlayA/PyB2aWV3Q29uZmlnPy5maXJzdERheU9mV2VlaztcclxuXHRcdGNvbnN0IGhpZGVXZWVrZW5kcyA9ICh0aGlzLm92ZXJyaWRlQ29uZmlnPy5oaWRlV2Vla2VuZHMgPz8gdmlld0NvbmZpZz8uaGlkZVdlZWtlbmRzKSA/PyBmYWxzZTtcclxuXHRcdC8vIERlZmF1bHQgdG8gU3VuZGF5ICgwKSBpZiB0aGUgc2V0dGluZyBpcyB1bmRlZmluZWQsIGZvbGxvd2luZyAwPVN1biwgMT1Nb24sIC4uLiwgNj1TYXRcclxuXHRcdGNvbnN0IGVmZmVjdGl2ZUZpcnN0RGF5ID1cclxuXHRcdFx0Zmlyc3REYXlPZldlZWtTZXR0aW5nID09PSB1bmRlZmluZWQgPyAwIDogZmlyc3REYXlPZldlZWtTZXR0aW5nO1xyXG5cclxuXHRcdC8vIDEuIENhbGN1bGF0ZSB0aGUgZGF0ZSByYW5nZSBmb3IgdGhlIGdyaWQgdXNpbmcgZWZmZWN0aXZlIGZpcnN0IGRheVxyXG5cdFx0Y29uc3Qgc3RhcnRPZk1vbnRoID0gdGhpcy5jdXJyZW50RGF0ZS5jbG9uZSgpLnN0YXJ0T2YoXCJtb250aFwiKTtcclxuXHRcdGNvbnN0IGVuZE9mTW9udGggPSB0aGlzLmN1cnJlbnREYXRlLmNsb25lKCkuZW5kT2YoXCJtb250aFwiKTtcclxuXHRcdC8vIENhbGN1bGF0ZSBncmlkIHN0YXJ0IGJhc2VkIG9uIHRoZSB3ZWVrIGNvbnRhaW5pbmcgdGhlIHN0YXJ0IG9mIHRoZSBtb250aCwgYWRqdXN0ZWQgZm9yIHRoZSBlZmZlY3RpdmUgZmlyc3QgZGF5XHJcblx0XHRjb25zdCBncmlkU3RhcnQgPSBzdGFydE9mTW9udGguY2xvbmUoKS53ZWVrZGF5KGVmZmVjdGl2ZUZpcnN0RGF5IC0gNyk7IC8vIG1vbWVudCBoYW5kbGVzIHdyYXBwaW5nIGNvcnJlY3RseVxyXG5cdFx0Ly8gQ2FsY3VsYXRlIGdyaWQgZW5kIGJhc2VkIG9uIHRoZSB3ZWVrIGNvbnRhaW5pbmcgdGhlIGVuZCBvZiB0aGUgbW9udGgsIGFkanVzdGVkIGZvciB0aGUgZWZmZWN0aXZlIGZpcnN0IGRheVxyXG5cdFx0bGV0IGdyaWRFbmQgPSBlbmRPZk1vbnRoLmNsb25lKCkud2Vla2RheShlZmZlY3RpdmVGaXJzdERheSArIDYpOyAvLyBtb21lbnQgaGFuZGxlcyB3cmFwcGluZyBjb3JyZWN0bHlcclxuXHJcblx0XHQvLyBBZGp1c3QgZ3JpZCBjb3ZlcmFnZSBiYXNlZCBvbiB3aGV0aGVyIHdlZWtlbmRzIGFyZSBoaWRkZW5cclxuXHRcdGlmIChoaWRlV2Vla2VuZHMpIHtcclxuXHRcdFx0Ly8gV2hlbiB3ZWVrZW5kcyBhcmUgaGlkZGVuLCB3ZSBuZWVkIGZld2VyIGRheXMgdG8gZmlsbCB0aGUgZ3JpZFxyXG5cdFx0XHQvLyBDYWxjdWxhdGUgaG93IG1hbnkgd29yayBkYXlzIHdlIG5lZWQgKGFwcHJveGltYXRlbHkgNiB3ZWVrcyAqIDUgd29yayBkYXlzID0gMzAgZGF5cylcclxuXHRcdFx0bGV0IHdvcmtEYXlzQ291bnQgPSAwO1xyXG5cdFx0XHRsZXQgdGVtcEl0ZXIgPSBncmlkU3RhcnQuY2xvbmUoKTtcclxuXHJcblx0XHRcdC8vIENvdW50IGV4aXN0aW5nIHdvcmsgZGF5cyBpbiB0aGUgY3VycmVudCByYW5nZVxyXG5cdFx0XHR3aGlsZSAodGVtcEl0ZXIuaXNTYW1lT3JCZWZvcmUoZ3JpZEVuZCwgXCJkYXlcIikpIHtcclxuXHRcdFx0XHRjb25zdCBpc1dlZWtlbmQgPSB0ZW1wSXRlci5kYXkoKSA9PT0gMCB8fCB0ZW1wSXRlci5kYXkoKSA9PT0gNjtcclxuXHRcdFx0XHRpZiAoIWlzV2Vla2VuZCkge1xyXG5cdFx0XHRcdFx0d29ya0RheXNDb3VudCsrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHR0ZW1wSXRlci5hZGQoMSwgXCJkYXlcIik7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEVuc3VyZSB3ZSBoYXZlIGF0IGxlYXN0IDMwIHdvcmsgZGF5cyAoNiB3ZWVrcyAqIDUgZGF5cykgZm9yIGNvbnNpc3RlbnQgbGF5b3V0XHJcblx0XHRcdHdoaWxlICh3b3JrRGF5c0NvdW50IDwgMzApIHtcclxuXHRcdFx0XHRncmlkRW5kLmFkZCgxLCBcImRheVwiKTtcclxuXHRcdFx0XHRjb25zdCBpc1dlZWtlbmQgPSBncmlkRW5kLmRheSgpID09PSAwIHx8IGdyaWRFbmQuZGF5KCkgPT09IDY7XHJcblx0XHRcdFx0aWYgKCFpc1dlZWtlbmQpIHtcclxuXHRcdFx0XHRcdHdvcmtEYXlzQ291bnQrKztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIE9yaWdpbmFsIGxvZ2ljIGZvciB3aGVuIHdlZWtlbmRzIGFyZSBzaG93blxyXG5cdFx0XHQvLyBFbnN1cmUgZ3JpZCBjb3ZlcnMgYXQgbGVhc3QgNiB3ZWVrcyAoNDIgZGF5cykgZm9yIGNvbnNpc3RlbnQgbGF5b3V0XHJcblx0XHRcdGlmIChncmlkRW5kLmRpZmYoZ3JpZFN0YXJ0LCBcImRheXNcIikgKyAxIDwgNDIpIHtcclxuXHRcdFx0XHQvLyBBZGQgZnVsbCB3ZWVrcyB1bnRpbCBhdCBsZWFzdCA0MiBkYXlzIGFyZSBjb3ZlcmVkXHJcblx0XHRcdFx0Y29uc3QgZGF5c1RvQWRkID0gNDIgLSAoZ3JpZEVuZC5kaWZmKGdyaWRTdGFydCwgXCJkYXlzXCIpICsgMSk7XHJcblx0XHRcdFx0Z3JpZEVuZC5hZGQoZGF5c1RvQWRkLCBcImRheXNcIik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLmVtcHR5KCk7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLmFkZENsYXNzKFwidmlldy1tb250aFwiKTsgLy8gQWRkIGNsYXNzIGZvciBzdHlsaW5nXHJcblxyXG5cdFx0Ly8gQWRkIGhpZGUtd2Vla2VuZHMgY2xhc3MgaWYgd2Vla2VuZCBoaWRpbmcgaXMgZW5hYmxlZFxyXG5cdFx0aWYgKGhpZGVXZWVrZW5kcykge1xyXG5cdFx0XHR0aGlzLmNvbnRhaW5lckVsLmFkZENsYXNzKFwiaGlkZS13ZWVrZW5kc1wiKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMuY29udGFpbmVyRWwucmVtb3ZlQ2xhc3MoXCJoaWRlLXdlZWtlbmRzXCIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIDIuIEFkZCB3ZWVrZGF5IGhlYWRlcnMsIHJvdGF0ZWQgYWNjb3JkaW5nIHRvIGVmZmVjdGl2ZSBmaXJzdCBkYXlcclxuXHRcdGNvbnN0IGhlYWRlclJvdyA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KFwiY2FsZW5kYXItd2Vla2RheS1oZWFkZXJcIik7XHJcblx0XHRjb25zdCB3ZWVrZGF5cyA9IG1vbWVudC53ZWVrZGF5c1Nob3J0KHRydWUpOyAvLyBHZXRzIGxvY2FsZS1hd2FyZSBzaG9ydCB3ZWVrZGF5c1xyXG5cdFx0Y29uc3Qgcm90YXRlZFdlZWtkYXlzID0gW1xyXG5cdFx0XHQuLi53ZWVrZGF5cy5zbGljZShlZmZlY3RpdmVGaXJzdERheSksXHJcblx0XHRcdC4uLndlZWtkYXlzLnNsaWNlKDAsIGVmZmVjdGl2ZUZpcnN0RGF5KSxcclxuXHRcdF07XHJcblxyXG5cdFx0Ly8gRmlsdGVyIG91dCB3ZWVrZW5kcyBpZiBoaWRlV2Vla2VuZHMgaXMgZW5hYmxlZFxyXG5cdFx0Y29uc3QgZmlsdGVyZWRXZWVrZGF5cyA9IGhpZGVXZWVrZW5kc1xyXG5cdFx0XHQ/IHJvdGF0ZWRXZWVrZGF5cy5maWx0ZXIoKF8sIGluZGV4KSA9PiB7XHJcblx0XHRcdFx0Ly8gQ2FsY3VsYXRlIHRoZSBhY3R1YWwgZGF5IG9mIHdlZWsgZm9yIHRoaXMgaGVhZGVyIHBvc2l0aW9uXHJcblx0XHRcdFx0Y29uc3QgZGF5T2ZXZWVrID0gKGVmZmVjdGl2ZUZpcnN0RGF5ICsgaW5kZXgpICUgNztcclxuXHRcdFx0XHRyZXR1cm4gZGF5T2ZXZWVrICE9PSAwICYmIGRheU9mV2VlayAhPT0gNjsgLy8gRXhjbHVkZSBTdW5kYXkgKDApIGFuZCBTYXR1cmRheSAoNilcclxuXHRcdFx0fSlcclxuXHRcdFx0OiByb3RhdGVkV2Vla2RheXM7XHJcblxyXG5cdFx0ZmlsdGVyZWRXZWVrZGF5cy5mb3JFYWNoKChkYXkpID0+IHtcclxuXHRcdFx0Y29uc3Qgd2Vla2RheUVsID0gaGVhZGVyUm93LmNyZWF0ZURpdihcImNhbGVuZGFyLXdlZWtkYXlcIik7XHJcblx0XHRcdHdlZWtkYXlFbC50ZXh0Q29udGVudCA9IGRheTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIDMuIENyZWF0ZSBkYXkgY2VsbHMgZ3JpZCBjb250YWluZXJcclxuXHRcdGNvbnN0IGdyaWRDb250YWluZXIgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdihcImNhbGVuZGFyLW1vbnRoLWdyaWRcIik7XHJcblx0XHRjb25zdCBkYXlDZWxsczogeyBba2V5OiBzdHJpbmddOiBIVE1MRWxlbWVudCB9ID0ge307IC8vIFN0b3JlIGNlbGxzIGJ5IGRhdGUgc3RyaW5nICdZWVlZLU1NLUREJ1xyXG5cdFx0bGV0IGN1cnJlbnREYXlJdGVyID0gZ3JpZFN0YXJ0LmNsb25lKCk7XHJcblxyXG5cdFx0d2hpbGUgKGN1cnJlbnREYXlJdGVyLmlzU2FtZU9yQmVmb3JlKGdyaWRFbmQsIFwiZGF5XCIpKSB7XHJcblx0XHRcdGNvbnN0IGlzV2Vla2VuZCA9IGN1cnJlbnREYXlJdGVyLmRheSgpID09PSAwIHx8IGN1cnJlbnREYXlJdGVyLmRheSgpID09PSA2OyAvLyBTdW5kYXkgb3IgU2F0dXJkYXlcclxuXHJcblx0XHRcdC8vIFNraXAgd2Vla2VuZCBkYXlzIGlmIGhpZGVXZWVrZW5kcyBpcyBlbmFibGVkXHJcblx0XHRcdGlmIChoaWRlV2Vla2VuZHMgJiYgaXNXZWVrZW5kKSB7XHJcblx0XHRcdFx0Y3VycmVudERheUl0ZXIuYWRkKDEsIFwiZGF5XCIpO1xyXG5cdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBjZWxsID0gZ3JpZENvbnRhaW5lci5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdFx0Y2xzOiBcImNhbGVuZGFyLWRheS1jZWxsXCIsXHJcblx0XHRcdFx0YXR0cjoge1xyXG5cdFx0XHRcdFx0XCJkYXRhLWRhdGVcIjogY3VycmVudERheUl0ZXIuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0Y29uc3QgZGF0ZVN0ciA9IGN1cnJlbnREYXlJdGVyLmZvcm1hdChcIllZWVktTU0tRERcIik7XHJcblx0XHRcdGRheUNlbGxzW2RhdGVTdHJdID0gY2VsbDtcclxuXHJcblx0XHRcdGNvbnN0IGhlYWRlckVsID0gY2VsbC5jcmVhdGVEaXYoXCJjYWxlbmRhci1kYXktaGVhZGVyXCIpO1xyXG5cdFx0XHQvLyBBZGQgZGF5IG51bWJlclxyXG5cdFx0XHRjb25zdCBkYXlOdW1iZXJFbCA9IGhlYWRlckVsLmNyZWF0ZURpdihcImNhbGVuZGFyLWRheS1udW1iZXJcIik7XHJcblx0XHRcdGRheU51bWJlckVsLnRleHRDb250ZW50ID0gY3VycmVudERheUl0ZXIuZm9ybWF0KFwiRFwiKTtcclxuXHJcblx0XHRcdC8vIEFkZCBzdHlsaW5nIGNsYXNzZXNcclxuXHRcdFx0aWYgKCFjdXJyZW50RGF5SXRlci5pc1NhbWUodGhpcy5jdXJyZW50RGF0ZSwgXCJtb250aFwiKSkge1xyXG5cdFx0XHRcdGNlbGwuYWRkQ2xhc3MoXCJpcy1vdGhlci1tb250aFwiKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoY3VycmVudERheUl0ZXIuaXNTYW1lKG1vbWVudCgpLCBcImRheVwiKSkge1xyXG5cdFx0XHRcdGNlbGwuYWRkQ2xhc3MoXCJpcy10b2RheVwiKTtcclxuXHRcdFx0fVxyXG5cdFx0XHQvLyBOb3RlOiBXZSBkb24ndCBhZGQgaXMtd2Vla2VuZCBjbGFzcyB3aGVuIGhpZGVXZWVrZW5kcyBpcyBlbmFibGVkXHJcblx0XHRcdC8vIGJlY2F1c2Ugd2Vla2VuZCBjZWxscyBhcmUgbm90IGNyZWF0ZWQgYXQgYWxsXHJcblx0XHRcdGlmICghaGlkZVdlZWtlbmRzICYmIGlzV2Vla2VuZCkge1xyXG5cdFx0XHRcdGNlbGwuYWRkQ2xhc3MoXCJpcy13ZWVrZW5kXCIpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBBZGQgZXZlbnRzIGNvbnRhaW5lciB3aXRoaW4gdGhlIGNlbGxcclxuXHRcdFx0Y2VsbC5jcmVhdGVEaXYoXCJjYWxlbmRhci1ldmVudHMtY29udGFpbmVyXCIpOyAvLyBUaGlzIGlzIHdoZXJlIGV2ZW50cyB3aWxsIGJlIGFwcGVuZGVkXHJcblxyXG5cdFx0XHRjdXJyZW50RGF5SXRlci5hZGQoMSwgXCJkYXlcIik7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gNC4gRmlsdGVyIGFuZCBSZW5kZXIgRXZlbnRzIGludG8gdGhlIGFwcHJvcHJpYXRlIGNlbGxzICh1c2VzIGNhbGN1bGF0ZWQgZ3JpZFN0YXJ0L2dyaWRFbmQpXHJcblx0XHR0aGlzLmV2ZW50cy5mb3JFYWNoKChldmVudCkgPT4ge1xyXG5cdFx0XHRjb25zdCBldmVudFN0YXJ0TW9tZW50ID0gbW9tZW50KGV2ZW50LnN0YXJ0KS5zdGFydE9mKFwiZGF5XCIpO1xyXG5cdFx0XHRjb25zdCBncmlkRW5kTW9tZW50ID0gZ3JpZEVuZC5jbG9uZSgpLmVuZE9mKFwiZGF5XCIpOyAvLyBFbnN1cmUgY29tcGFyaXNvbiBpbmNsdWRlcyBmdWxsIGxhc3QgZGF5XHJcblx0XHRcdGNvbnN0IGdyaWRTdGFydE1vbWVudCA9IGdyaWRTdGFydC5jbG9uZSgpLnN0YXJ0T2YoXCJkYXlcIik7XHJcblxyXG5cdFx0XHQvLyBFbnN1cmUgdGhlIGV2ZW50IGlzIHJlbGV2YW50IHRvIHRoZSBkaXNwbGF5ZWQgZ3JpZCBkYXRlc1xyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0ZXZlbnRTdGFydE1vbWVudC5pc0FmdGVyKGdyaWRFbmRNb21lbnQpIHx8IC8vIFN0YXJ0cyBhZnRlciB0aGUgZ3JpZCBlbmRzXHJcblx0XHRcdFx0KGV2ZW50LmVuZCAmJlxyXG5cdFx0XHRcdFx0bW9tZW50KGV2ZW50LmVuZCkuc3RhcnRPZihcImRheVwiKS5pc0JlZm9yZShncmlkU3RhcnRNb21lbnQpKSAvLyBFbmRzIGJlZm9yZSB0aGUgZ3JpZCBzdGFydHNcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0cmV0dXJuOyAvLyBFdmVudCBpcyBjb21wbGV0ZWx5IG91dHNpZGUgdGhlIGN1cnJlbnQgZ3JpZCB2aWV3XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIC0tLSBTaW1wbGlmaWVkIGxvZ2ljOiBPbmx5IHJlbmRlciBldmVudCBvbiBpdHMgc3RhcnQgZGF0ZSAtLS1cclxuXHRcdFx0Ly8gQ2hlY2sgaWYgdGhlIGV2ZW50J3Mgc3RhcnQgZGF0ZSBpcyB3aXRoaW4gdGhlIHZpc2libGUgZ3JpZCBkYXRlc1xyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0ZXZlbnRTdGFydE1vbWVudC5pc1NhbWVPckFmdGVyKGdyaWRTdGFydE1vbWVudCkgJiZcclxuXHRcdFx0XHRldmVudFN0YXJ0TW9tZW50LmlzU2FtZU9yQmVmb3JlKGdyaWRFbmRNb21lbnQpXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdGNvbnN0IGRhdGVTdHIgPSBldmVudFN0YXJ0TW9tZW50LmZvcm1hdChcIllZWVktTU0tRERcIik7XHJcblx0XHRcdFx0Y29uc3QgdGFyZ2V0Q2VsbCA9IGRheUNlbGxzW2RhdGVTdHJdO1xyXG5cdFx0XHRcdGlmICh0YXJnZXRDZWxsKSB7XHJcblx0XHRcdFx0XHRjb25zdCBldmVudHNDb250YWluZXIgPSB0YXJnZXRDZWxsLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFx0XHRcdFwiLmNhbGVuZGFyLWV2ZW50cy1jb250YWluZXJcIlxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdGlmIChldmVudHNDb250YWluZXIpIHtcclxuXHRcdFx0XHRcdFx0Ly8gUmVuZGVyIHRoZSBldmVudCB1c2luZyB0aGUgZXhpc3RpbmcgcmVuZGVyZXJcclxuXHRcdFx0XHRcdFx0Y29uc3QgeyBldmVudEVsLCBjb21wb25lbnQgfSA9IHJlbmRlckNhbGVuZGFyRXZlbnQoe1xyXG5cdFx0XHRcdFx0XHRcdGV2ZW50OiBldmVudCxcclxuXHRcdFx0XHRcdFx0XHR2aWV3VHlwZTogXCJtb250aFwiLCAvLyBQYXNzIHZpZXdUeXBlIGNvbnNpc3RlbnRseVxyXG5cdFx0XHRcdFx0XHRcdGFwcDogdGhpcy5hcHAsXHJcblx0XHRcdFx0XHRcdFx0b25FdmVudENsaWNrOiB0aGlzLm9wdGlvbnMub25FdmVudENsaWNrLFxyXG5cdFx0XHRcdFx0XHRcdG9uRXZlbnRIb3ZlcjogdGhpcy5vcHRpb25zLm9uRXZlbnRIb3ZlcixcclxuXHRcdFx0XHRcdFx0XHRvbkV2ZW50Q29udGV4dE1lbnU6IHRoaXMub3B0aW9ucy5vbkV2ZW50Q29udGV4dE1lbnUsXHJcblx0XHRcdFx0XHRcdFx0b25FdmVudENvbXBsZXRlOiB0aGlzLm9wdGlvbnMub25FdmVudENvbXBsZXRlLFxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0dGhpcy5hZGRDaGlsZChjb21wb25lbnQpO1xyXG5cdFx0XHRcdFx0XHRldmVudHNDb250YWluZXIuYXBwZW5kQ2hpbGQoZXZlbnRFbCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdC8vIC0tLSBFbmQgb2Ygc2ltcGxpZmllZCBsb2dpYyAtLS1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIDUuIFJlbmRlciBiYWRnZXMgZm9yIElDUyBldmVudHMgd2l0aCBiYWRnZSBzaG93VHlwZVxyXG5cdFx0T2JqZWN0LmtleXMoZGF5Q2VsbHMpLmZvckVhY2goKGRhdGVTdHIpID0+IHtcclxuXHRcdFx0Y29uc3QgY2VsbCA9IGRheUNlbGxzW2RhdGVTdHJdO1xyXG5cdFx0XHQvLyBVc2Ugb3B0aW1pemVkIGRhdGUgcGFyc2luZyBmb3IgYmV0dGVyIHBlcmZvcm1hbmNlXHJcblx0XHRcdGNvbnN0IGRhdGUgPSBwYXJzZURhdGVTdHJpbmcoZGF0ZVN0cik7XHJcblxyXG5cdFx0XHRjb25zdCBiYWRnZUV2ZW50cyA9XHJcblx0XHRcdFx0dGhpcy5vcHRpb25zLmdldEJhZGdlRXZlbnRzRm9yRGF0ZT8uKGRhdGUpIHx8IFtdO1xyXG5cclxuXHRcdFx0aWYgKGJhZGdlRXZlbnRzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRjb25zdCBoZWFkZXJFbCA9IGNlbGwucXVlcnlTZWxlY3RvcihcclxuXHRcdFx0XHRcdFwiLmNhbGVuZGFyLWRheS1oZWFkZXJcIlxyXG5cdFx0XHRcdCkgYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRcdFx0Y29uc3QgYmFkZ2VzQ29udGFpbmVyID0gaGVhZGVyRWwuY3JlYXRlRGl2KFxyXG5cdFx0XHRcdFx0XCJjYWxlbmRhci1iYWRnZXMtY29udGFpbmVyXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGlmIChiYWRnZXNDb250YWluZXIpIHtcclxuXHRcdFx0XHRcdGJhZGdlRXZlbnRzLmZvckVhY2goKGJhZGdlRXZlbnQpID0+IHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgYmFkZ2VFbCA9IGJhZGdlc0NvbnRhaW5lci5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdFx0XHRcdFx0Y2xzOiBcImNhbGVuZGFyLWJhZGdlXCIsXHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gQWRkIGNvbG9yIHN0eWxpbmcgaWYgYXZhaWxhYmxlXHJcblx0XHRcdFx0XHRcdGlmIChiYWRnZUV2ZW50LmNvbG9yKSB7XHJcblx0XHRcdFx0XHRcdFx0YmFkZ2VFbC5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBiYWRnZUV2ZW50LmNvbG9yO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBBZGQgY291bnQgdGV4dFxyXG5cdFx0XHRcdFx0XHRiYWRnZUVsLnRleHRDb250ZW50ID0gYmFkZ2VFdmVudC5jb250ZW50O1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0YFJlbmRlcmVkIE1vbnRoIFZpZXcgY29tcG9uZW50IGZyb20gJHtncmlkU3RhcnQuZm9ybWF0KFxyXG5cdFx0XHRcdFwiWVlZWS1NTS1ERFwiXHJcblx0XHRcdCl9IHRvICR7Z3JpZEVuZC5mb3JtYXQoXHJcblx0XHRcdFx0XCJZWVlZLU1NLUREXCJcclxuXHRcdFx0KX0gKEZpcnN0IGRheTogJHtlZmZlY3RpdmVGaXJzdERheX0pYFxyXG5cdFx0KTtcclxuXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZ3JpZENvbnRhaW5lciwgXCJjbGlja1wiLCAoZXYpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFyZ2V0ID0gZXYudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xyXG5cdFx0XHRpZiAodGFyZ2V0LmNsb3Nlc3QoXCIuY2FsZW5kYXItZGF5LW51bWJlclwiKSkge1xyXG5cdFx0XHRcdGNvbnN0IGRhdGVTdHIgPSB0YXJnZXRcclxuXHRcdFx0XHRcdC5jbG9zZXN0KFwiLmNhbGVuZGFyLWRheS1jZWxsXCIpXHJcblx0XHRcdFx0XHQ/LmdldEF0dHJpYnV0ZShcImRhdGEtZGF0ZVwiKTtcclxuXHRcdFx0XHRpZiAodGhpcy5vcHRpb25zLm9uRGF5Q2xpY2sgJiYgZGF0ZVN0cikge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXCJEYXkgbnVtYmVyIGNsaWNrZWQ6XCIsIGRhdGVTdHIpO1xyXG5cdFx0XHRcdFx0Ly8gVXNlIG9wdGltaXplZCBkYXRlIHBhcnNpbmcgZm9yIGJldHRlciBwZXJmb3JtYW5jZVxyXG5cdFx0XHRcdFx0Y29uc3QgZGF0ZSA9IHBhcnNlRGF0ZVN0cmluZyhkYXRlU3RyKTtcclxuXHRcdFx0XHRcdHRoaXMub3B0aW9ucy5vbkRheUNsaWNrKGV2LCBkYXRlLmdldFRpbWUoKSwge1xyXG5cdFx0XHRcdFx0XHRiZWhhdmlvcjogXCJvcGVuLXRhc2stdmlld1wiLFxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKHRhcmdldC5jbG9zZXN0KFwiLmNhbGVuZGFyLWRheS1jZWxsXCIpKSB7XHJcblx0XHRcdFx0Y29uc3QgZGF0ZVN0ciA9IHRhcmdldFxyXG5cdFx0XHRcdFx0LmNsb3Nlc3QoXCIuY2FsZW5kYXItZGF5LWNlbGxcIilcclxuXHRcdFx0XHRcdD8uZ2V0QXR0cmlidXRlKFwiZGF0YS1kYXRlXCIpO1xyXG5cdFx0XHRcdGlmICh0aGlzLm9wdGlvbnMub25EYXlDbGljayAmJiBkYXRlU3RyKSB7XHJcblx0XHRcdFx0XHQvLyBVc2Ugb3B0aW1pemVkIGRhdGUgcGFyc2luZyBmb3IgYmV0dGVyIHBlcmZvcm1hbmNlXHJcblx0XHRcdFx0XHRjb25zdCBkYXRlID0gcGFyc2VEYXRlU3RyaW5nKGRhdGVTdHIpO1xyXG5cdFx0XHRcdFx0dGhpcy5vcHRpb25zLm9uRGF5Q2xpY2soZXYsIGRhdGUuZ2V0VGltZSgpLCB7XHJcblx0XHRcdFx0XHRcdGJlaGF2aW9yOiBcIm9wZW4tcXVpY2stY2FwdHVyZVwiLFxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZ3JpZENvbnRhaW5lciwgXCJtb3VzZW92ZXJcIiwgKGV2KSA9PiB7XHJcblx0XHRcdHRoaXMuZGVib3VuY2VIb3Zlcihldik7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBJbml0aWFsaXplIGRyYWcgYW5kIGRyb3AgZnVuY3Rpb25hbGl0eVxyXG5cdFx0dGhpcy5pbml0aWFsaXplRHJhZ0FuZERyb3AoZGF5Q2VsbHMpO1xyXG5cdH1cclxuXHJcblx0Ly8gVXBkYXRlIG1ldGhvZHMgdG8gYWxsb3cgY2hhbmdpbmcgZGF0YSBhZnRlciBpbml0aWFsIHJlbmRlclxyXG5cdHVwZGF0ZUV2ZW50cyhldmVudHM6IENhbGVuZGFyRXZlbnRbXSk6IHZvaWQge1xyXG5cdFx0dGhpcy5ldmVudHMgPSBldmVudHM7XHJcblx0XHR0aGlzLnJlbmRlcigpOyAvLyBSZS1yZW5kZXIgd2lsbCBwaWNrIHVwIGN1cnJlbnQgc2V0dGluZ3NcclxuXHR9XHJcblxyXG5cdHVwZGF0ZUN1cnJlbnREYXRlKGRhdGU6IG1vbWVudC5Nb21lbnQpOiB2b2lkIHtcclxuXHRcdHRoaXMuY3VycmVudERhdGUgPSBkYXRlO1xyXG5cdFx0dGhpcy5yZW5kZXIoKTsgLy8gUmUtcmVuZGVyIHdpbGwgcGljayB1cCBjdXJyZW50IHNldHRpbmdzIGFuZCBkYXRlXHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGRlYm91bmNlSG92ZXIgPSBkZWJvdW5jZSgoZXY6IE1vdXNlRXZlbnQpID0+IHtcclxuXHRcdGNvbnN0IHRhcmdldCA9IGV2LnRhcmdldCBhcyBIVE1MRWxlbWVudDtcclxuXHRcdGlmICh0YXJnZXQuY2xvc2VzdChcIi5jYWxlbmRhci1kYXktY2VsbFwiKSkge1xyXG5cdFx0XHRjb25zdCBkYXRlU3RyID0gdGFyZ2V0XHJcblx0XHRcdFx0LmNsb3Nlc3QoXCIuY2FsZW5kYXItZGF5LWNlbGxcIilcclxuXHRcdFx0XHQ/LmdldEF0dHJpYnV0ZShcImRhdGEtZGF0ZVwiKTtcclxuXHRcdFx0aWYgKHRoaXMub3B0aW9ucy5vbkRheUhvdmVyICYmIGRhdGVTdHIpIHtcclxuXHRcdFx0XHQvLyBVc2Ugb3B0aW1pemVkIGRhdGUgcGFyc2luZyBmb3IgYmV0dGVyIHBlcmZvcm1hbmNlXHJcblx0XHRcdFx0Y29uc3QgZGF0ZSA9IHBhcnNlRGF0ZVN0cmluZyhkYXRlU3RyKTtcclxuXHRcdFx0XHR0aGlzLm9wdGlvbnMub25EYXlIb3ZlcihldiwgZGF0ZS5nZXRUaW1lKCkpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSwgMjAwKTtcclxuXHJcblx0LyoqXHJcblx0ICogSW5pdGlhbGl6ZSBkcmFnIGFuZCBkcm9wIGZ1bmN0aW9uYWxpdHkgZm9yIGNhbGVuZGFyIGV2ZW50c1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgaW5pdGlhbGl6ZURyYWdBbmREcm9wKGRheUNlbGxzOiB7XHJcblx0XHRba2V5OiBzdHJpbmddOiBIVE1MRWxlbWVudDtcclxuXHR9KTogdm9pZCB7XHJcblx0XHQvLyBDbGVhbiB1cCBleGlzdGluZyBzb3J0YWJsZSBpbnN0YW5jZXNcclxuXHRcdHRoaXMuc29ydGFibGVJbnN0YW5jZXMuZm9yRWFjaCgoaW5zdGFuY2UpID0+IGluc3RhbmNlLmRlc3Ryb3koKSk7XHJcblx0XHR0aGlzLnNvcnRhYmxlSW5zdGFuY2VzID0gW107XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBzb3J0YWJsZSBmb3IgZWFjaCBkYXkncyBldmVudHMgY29udGFpbmVyXHJcblx0XHRPYmplY3QuZW50cmllcyhkYXlDZWxscykuZm9yRWFjaCgoW2RhdGVTdHIsIGRheUNlbGxdKSA9PiB7XHJcblx0XHRcdGNvbnN0IGV2ZW50c0NvbnRhaW5lciA9IGRheUNlbGwucXVlcnlTZWxlY3RvcihcclxuXHRcdFx0XHRcIi5jYWxlbmRhci1ldmVudHMtY29udGFpbmVyXCJcclxuXHRcdFx0KSBhcyBIVE1MRWxlbWVudDtcclxuXHRcdFx0aWYgKGV2ZW50c0NvbnRhaW5lcikge1xyXG5cdFx0XHRcdGNvbnN0IHNvcnRhYmxlSW5zdGFuY2UgPSBTb3J0YWJsZS5jcmVhdGUoZXZlbnRzQ29udGFpbmVyLCB7XHJcblx0XHRcdFx0XHRncm91cDogXCJjYWxlbmRhci1ldmVudHNcIixcclxuXHRcdFx0XHRcdGFuaW1hdGlvbjogMTUwLFxyXG5cdFx0XHRcdFx0Z2hvc3RDbGFzczogXCJjYWxlbmRhci1ldmVudC1naG9zdFwiLFxyXG5cdFx0XHRcdFx0ZHJhZ0NsYXNzOiBcImNhbGVuZGFyLWV2ZW50LWRyYWdnaW5nXCIsXHJcblx0XHRcdFx0XHRvbkVuZDogKGV2ZW50KSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMuaGFuZGxlRHJhZ0VuZChldmVudCwgZGF0ZVN0cik7XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdHRoaXMuc29ydGFibGVJbnN0YW5jZXMucHVzaChzb3J0YWJsZUluc3RhbmNlKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBIYW5kbGUgZHJhZyBlbmQgZXZlbnQgdG8gdXBkYXRlIHRhc2sgZGF0ZXNcclxuXHQgKi9cclxuXHRwcml2YXRlIGFzeW5jIGhhbmRsZURyYWdFbmQoXHJcblx0XHRldmVudDogU29ydGFibGUuU29ydGFibGVFdmVudCxcclxuXHRcdG9yaWdpbmFsRGF0ZVN0cjogc3RyaW5nXHJcblx0KTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRjb25zdCBldmVudEVsID0gZXZlbnQuaXRlbTtcclxuXHRcdGNvbnN0IGV2ZW50SWQgPSBldmVudEVsLmRhdGFzZXQuZXZlbnRJZDtcclxuXHRcdGNvbnN0IHRhcmdldENvbnRhaW5lciA9IGV2ZW50LnRvO1xyXG5cdFx0Y29uc3QgdGFyZ2V0RGF0ZUNlbGwgPSB0YXJnZXRDb250YWluZXIuY2xvc2VzdChcIi5jYWxlbmRhci1kYXktY2VsbFwiKTtcclxuXHJcblx0XHRpZiAoIWV2ZW50SWQgfHwgIXRhcmdldERhdGVDZWxsKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcIkNvdWxkIG5vdCBkZXRlcm1pbmUgZXZlbnQgSUQgb3IgdGFyZ2V0IGRhdGUgZm9yIGRyYWcgb3BlcmF0aW9uXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHRhcmdldERhdGVTdHIgPSB0YXJnZXREYXRlQ2VsbC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWRhdGVcIik7XHJcblx0XHRpZiAoIXRhcmdldERhdGVTdHIgfHwgdGFyZ2V0RGF0ZVN0ciA9PT0gb3JpZ2luYWxEYXRlU3RyKSB7XHJcblx0XHRcdC8vIE5vIGRhdGUgY2hhbmdlLCBub3RoaW5nIHRvIGRvXHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBGaW5kIHRoZSBjYWxlbmRhciBldmVudFxyXG5cdFx0Y29uc3QgY2FsZW5kYXJFdmVudCA9IHRoaXMuZXZlbnRzLmZpbmQoKGUpID0+IGUuaWQgPT09IGV2ZW50SWQpO1xyXG5cdFx0aWYgKCFjYWxlbmRhckV2ZW50KSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihgQ2FsZW5kYXIgZXZlbnQgd2l0aCBJRCAke2V2ZW50SWR9IG5vdCBmb3VuZGApO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0YXdhaXQgdGhpcy51cGRhdGVUYXNrRGF0ZShjYWxlbmRhckV2ZW50LCB0YXJnZXREYXRlU3RyKTtcclxuXHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0YFRhc2sgJHtldmVudElkfSBtb3ZlZCBmcm9tICR7b3JpZ2luYWxEYXRlU3RyfSB0byAke3RhcmdldERhdGVTdHJ9YFxyXG5cdFx0XHQpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkZhaWxlZCB0byB1cGRhdGUgdGFzayBkYXRlOlwiLCBlcnJvcik7XHJcblx0XHRcdC8vIFJldmVydCB0aGUgdmlzdWFsIGNoYW5nZSBieSByZS1yZW5kZXJpbmdcclxuXHRcdFx0dGhpcy5yZW5kZXIoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSB0YXNrIGRhdGUgYmFzZWQgb24gdGhlIHRhcmdldCBkYXRlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhc3luYyB1cGRhdGVUYXNrRGF0ZShcclxuXHRcdGNhbGVuZGFyRXZlbnQ6IENhbGVuZGFyRXZlbnQsXHJcblx0XHR0YXJnZXREYXRlU3RyOiBzdHJpbmdcclxuXHQpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdC8vIFVzZSBvcHRpbWl6ZWQgZGF0ZSBwYXJzaW5nIGZvciBiZXR0ZXIgcGVyZm9ybWFuY2VcclxuXHRcdGNvbnN0IHRhcmdldERhdGUgPSBwYXJzZURhdGVTdHJpbmcodGFyZ2V0RGF0ZVN0cikuZ2V0VGltZSgpO1xyXG5cclxuXHRcdGlmICghdGhpcy5wbHVnaW4ud3JpdGVBUEkpIHtcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiV3JpdGVBUEkgbm90IGF2YWlsYWJsZVwiKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDcmVhdGUgdXBkYXRlZCB0YXNrIHdpdGggbmV3IGRhdGVcclxuXHRcdGNvbnN0IHVwZGF0ZWRUYXNrID0geyAuLi5jYWxlbmRhckV2ZW50IH07XHJcblxyXG5cdFx0Ly8gRGV0ZXJtaW5lIHdoaWNoIGRhdGUgZmllbGQgdG8gdXBkYXRlIGJhc2VkIG9uIHdoYXQgdGhlIHRhc2sgY3VycmVudGx5IGhhc1xyXG5cdFx0aWYgKGNhbGVuZGFyRXZlbnQubWV0YWRhdGEuZHVlRGF0ZSkge1xyXG5cdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YS5kdWVEYXRlID0gdGFyZ2V0RGF0ZTtcclxuXHRcdH0gZWxzZSBpZiAoY2FsZW5kYXJFdmVudC5tZXRhZGF0YS5zY2hlZHVsZWREYXRlKSB7XHJcblx0XHRcdHVwZGF0ZWRUYXNrLm1ldGFkYXRhLnNjaGVkdWxlZERhdGUgPSB0YXJnZXREYXRlO1xyXG5cdFx0fSBlbHNlIGlmIChjYWxlbmRhckV2ZW50Lm1ldGFkYXRhLnN0YXJ0RGF0ZSkge1xyXG5cdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YS5zdGFydERhdGUgPSB0YXJnZXREYXRlO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gRGVmYXVsdCB0byBkdWUgZGF0ZSBpZiBubyBkYXRlIGlzIHNldFxyXG5cdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YS5kdWVEYXRlID0gdGFyZ2V0RGF0ZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBVcGRhdGUgdGhlIHRhc2tcclxuXHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMucGx1Z2luLndyaXRlQVBJLnVwZGF0ZVRhc2soe1xyXG5cdFx0XHR0YXNrSWQ6IGNhbGVuZGFyRXZlbnQuaWQsXHJcblx0XHRcdHVwZGF0ZXM6IHVwZGF0ZWRUYXNrLFxyXG5cdFx0fSk7XHJcblx0XHRcclxuXHRcdGlmICghcmVzdWx0LnN1Y2Nlc3MpIHtcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gdXBkYXRlIHRhc2s6ICR7cmVzdWx0LmVycm9yfWApO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2xlYW4gdXAgc29ydGFibGUgaW5zdGFuY2VzIHdoZW4gY29tcG9uZW50IGlzIGRlc3Ryb3llZFxyXG5cdCAqL1xyXG5cdG9udW5sb2FkKCk6IHZvaWQge1xyXG5cdFx0dGhpcy5zb3J0YWJsZUluc3RhbmNlcy5mb3JFYWNoKChpbnN0YW5jZSkgPT4gaW5zdGFuY2UuZGVzdHJveSgpKTtcclxuXHRcdHRoaXMuc29ydGFibGVJbnN0YW5jZXMgPSBbXTtcclxuXHRcdHN1cGVyLm9udW5sb2FkKCk7XHJcblx0fVxyXG59XHJcbiJdfQ==