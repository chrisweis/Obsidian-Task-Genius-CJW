import { __awaiter } from "tslib";
import { debounce, moment } from "obsidian";
import { renderCalendarEvent } from "../rendering/event-renderer"; // Use new renderer
import { getViewSettingOrDefault, } from "@/common/setting-definition"; // Import helper
import { CalendarViewComponent } from "./base-view"; // Import base class and options type
import Sortable from "sortablejs";
/**
 * Renders the week view grid as a component.
 */
export class WeekView extends CalendarViewComponent {
    // Removed onEventClick/onMouseHover properties, now in this.options
    constructor(app, plugin, containerEl, currentViewId, currentDate, events, options, // Use the base options type
    overrideConfig) {
        super(plugin, app, containerEl, events, options); // Call base constructor
        this.currentViewId = currentViewId;
        this.sortableInstances = []; // Store sortable instances for cleanup
        this.debounceHover = debounce((ev) => {
            var _a;
            const target = ev.target;
            if (target.closest(".calendar-day-column")) {
                const dateStr = (_a = target
                    .closest(".calendar-day-column")) === null || _a === void 0 ? void 0 : _a.getAttribute("data-date");
                if (this.options.onDayHover) {
                    this.options.onDayHover(ev, moment(dateStr).valueOf());
                }
            }
        }, 200);
        this.app = app; // Store app
        this.plugin = plugin; // Store plugin
        this.currentDate = currentDate;
        this.overrideConfig = overrideConfig;
    }
    render() {
        var _a, _b, _c, _d, _e, _f;
        // Get view settings, prefer override values when provided
        const viewConfig = getViewSettingOrDefault(this.plugin, this.currentViewId);
        console.log("viewConfig calendar", viewConfig);
        const firstDayOfWeekSetting = ((_b = (_a = this.overrideConfig) === null || _a === void 0 ? void 0 : _a.firstDayOfWeek) !== null && _b !== void 0 ? _b : viewConfig.specificConfig.firstDayOfWeek);
        const hideWeekends = (_f = ((_d = (_c = this.overrideConfig) === null || _c === void 0 ? void 0 : _c.hideWeekends) !== null && _d !== void 0 ? _d : (_e = viewConfig.specificConfig) === null || _e === void 0 ? void 0 : _e.hideWeekends)) !== null && _f !== void 0 ? _f : false;
        // Default to Sunday (0) if the setting is undefined, following 0=Sun, 1=Mon, ..., 6=Sat
        const effectiveFirstDay = firstDayOfWeekSetting === undefined ? 0 : firstDayOfWeekSetting;
        // Calculate start and end of week based on the setting
        const startOfWeek = this.currentDate.clone().weekday(effectiveFirstDay);
        const endOfWeek = startOfWeek.clone().add(6, "days"); // Week always has 7 days
        this.containerEl.empty();
        this.containerEl.addClass("view-week");
        // Add hide-weekends class if weekend hiding is enabled
        if (hideWeekends) {
            this.containerEl.addClass("hide-weekends");
        }
        else {
            this.containerEl.removeClass("hide-weekends");
        }
        // 1. Render Header Row (Days of the week + Dates)
        const headerRow = this.containerEl.createDiv("calendar-week-header");
        const dayHeaderCells = {};
        let currentDayIter = startOfWeek.clone();
        // Generate rotated weekdays for header
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
        let dayIndex = 0;
        while (currentDayIter.isSameOrBefore(endOfWeek, "day")) {
            const isWeekend = currentDayIter.day() === 0 || currentDayIter.day() === 6; // Sunday or Saturday
            // Skip weekend days if hideWeekends is enabled
            if (hideWeekends && isWeekend) {
                currentDayIter.add(1, "day");
                continue; // Don't increment dayIndex for skipped days
            }
            const dateStr = currentDayIter.format("YYYY-MM-DD");
            const headerCell = headerRow.createDiv("calendar-header-cell");
            dayHeaderCells[dateStr] = headerCell; // Store header cell if needed
            const weekdayEl = headerCell.createDiv("calendar-weekday");
            weekdayEl.textContent = filteredWeekdays[dayIndex]; // Use filtered weekday names
            const dayNumEl = headerCell.createDiv("calendar-day-number");
            dayNumEl.textContent = currentDayIter.format("D"); // Date number
            if (currentDayIter.isSame(moment(), "day")) {
                headerCell.addClass("is-today");
            }
            currentDayIter.add(1, "day");
            dayIndex++;
        }
        // --- All-Day Section (Renamed for clarity, now holds all events) ---
        const weekGridSection = this.containerEl.createDiv("calendar-week-grid-section" // Renamed class
        );
        const weekGrid = weekGridSection.createDiv("calendar-week-grid"); // Renamed class
        const dayEventContainers = {}; // Renamed variable
        currentDayIter = startOfWeek.clone();
        while (currentDayIter.isSameOrBefore(endOfWeek, "day")) {
            const isWeekend = currentDayIter.day() === 0 || currentDayIter.day() === 6; // Sunday or Saturday
            // Skip weekend days if hideWeekends is enabled
            if (hideWeekends && isWeekend) {
                currentDayIter.add(1, "day");
                continue;
            }
            const dateStr = currentDayIter.format("YYYY-MM-DD");
            const dayCell = weekGrid.createEl("div", {
                cls: "calendar-day-column",
                attr: {
                    "data-date": dateStr,
                },
            });
            dayEventContainers[dateStr] = dayCell.createDiv(
            // Use renamed variable
            "calendar-day-events-container" // Renamed class
            );
            if (currentDayIter.isSame(moment(), "day")) {
                dayCell.addClass("is-today"); // Apply to the main day cell
            }
            if (isWeekend) {
                // This weekend check is based on Sun/Sat, might need adjustment if start day changes weekend definition visually
                dayCell.addClass("is-weekend"); // Apply to the main day cell
            }
            currentDayIter.add(1, "day");
        }
        // 3. Filter Events for the Week (Uses calculated startOfWeek/endOfWeek)
        const weekEvents = this.events.filter((event) => {
            const eventStart = moment(event.start);
            const eventEnd = event.end ? moment(event.end) : eventStart;
            return (eventStart.isBefore(endOfWeek.clone().endOf("day").add(1, "millisecond")) && eventEnd.isSameOrAfter(startOfWeek.clone().startOf("day")));
        });
        // Sort events: Simple sort by start time might be useful, but not strictly necessary for this logic
        const sortedWeekEvents = [...weekEvents].sort((a, b) => {
            return moment(a.start).valueOf() - moment(b.start).valueOf(); // Earlier start date first
        });
        // --- Calculate vertical slots for each event --- (REMOVED)
        // --- Render events (Simplified Logic) ---
        sortedWeekEvents.forEach((event) => {
            if (!event.start)
                return; // Skip events without a start date
            const eventStartMoment = moment(event.start).startOf("day");
            // Use calculated week boundaries
            const weekStartMoment = startOfWeek.clone().startOf("day");
            const weekEndMoment = endOfWeek.clone().endOf("day");
            // Check if the event's START date is within the current week view
            if (eventStartMoment.isSameOrAfter(weekStartMoment) &&
                eventStartMoment.isSameOrBefore(weekEndMoment)) {
                const dateStr = eventStartMoment.format("YYYY-MM-DD");
                const container = dayEventContainers[dateStr]; // Get the container for the start date
                if (container) {
                    // Render the event ONCE in the correct day's container
                    const { eventEl, component } = renderCalendarEvent({
                        event: event,
                        viewType: "week-allday",
                        // positioningHints removed - no complex layout needed now
                        app: this.app,
                        onEventClick: this.options.onEventClick,
                        onEventHover: this.options.onEventHover,
                        onEventContextMenu: this.options.onEventContextMenu,
                        onEventComplete: this.options.onEventComplete,
                    });
                    this.addChild(component);
                    // No absolute positioning or slot calculation needed
                    // eventEl.style.top = ...
                    container.appendChild(eventEl);
                }
            }
        });
        console.log(`Rendered Simplified Week View from ${startOfWeek.format("YYYY-MM-DD")} to ${endOfWeek.format("YYYY-MM-DD")} (First day: ${effectiveFirstDay})`);
        this.registerDomEvent(weekGrid, "click", (ev) => {
            var _a;
            const target = ev.target;
            if (target.closest(".calendar-day-column")) {
                const dateStr = (_a = target
                    .closest(".calendar-day-column")) === null || _a === void 0 ? void 0 : _a.getAttribute("data-date");
                if (this.options.onDayClick) {
                    this.options.onDayClick(ev, moment(dateStr).valueOf(), {
                        behavior: "open-quick-capture",
                    });
                }
            }
        });
        this.registerDomEvent(weekGrid, "mouseover", (ev) => {
            this.debounceHover(ev);
        });
        // Initialize drag and drop functionality
        this.initializeDragAndDrop(dayEventContainers);
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
    initializeDragAndDrop(dayEventContainers) {
        // Clean up existing sortable instances
        this.sortableInstances.forEach((instance) => instance.destroy());
        this.sortableInstances = [];
        // Initialize sortable for each day's events container
        Object.entries(dayEventContainers).forEach(([dateStr, eventsContainer]) => {
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
            const targetDateColumn = targetContainer.closest(".calendar-day-column");
            if (!eventId || !targetDateColumn) {
                console.warn("Could not determine event ID or target date for drag operation");
                return;
            }
            const targetDateStr = targetDateColumn.getAttribute("data-date");
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
            const targetDate = moment(targetDateStr).valueOf();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vlay12aWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsid2Vlay12aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBQWtCLFFBQVEsRUFBRSxNQUFNLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFFNUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNkJBQTZCLENBQUMsQ0FBQyxtQkFBbUI7QUFDdEYsT0FBTyxFQUVOLHVCQUF1QixHQUN2QixNQUFNLDZCQUE2QixDQUFDLENBQUMsZ0JBQWdCO0FBRXRELE9BQU8sRUFBRSxxQkFBcUIsRUFBdUIsTUFBTSxhQUFhLENBQUMsQ0FBQyxxQ0FBcUM7QUFDL0csT0FBTyxRQUFRLE1BQU0sWUFBWSxDQUFDO0FBRWxDOztHQUVHO0FBQ0gsTUFBTSxPQUFPLFFBQVMsU0FBUSxxQkFBcUI7SUFVbEQsb0VBQW9FO0lBRXBFLFlBQ0MsR0FBUSxFQUNSLE1BQTZCLEVBQzdCLFdBQXdCLEVBQ2hCLGFBQXFCLEVBQzdCLFdBQTBCLEVBQzFCLE1BQXVCLEVBQ3ZCLE9BQTRCLEVBQUUsNEJBQTRCO0lBQzFELGNBQWdEO1FBRWhELEtBQUssQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyx3QkFBd0I7UUFObEUsa0JBQWEsR0FBYixhQUFhLENBQVE7UUFUdEIsc0JBQWlCLEdBQWUsRUFBRSxDQUFDLENBQUMsdUNBQXVDO1FBd08zRSxrQkFBYSxHQUFHLFFBQVEsQ0FBQyxDQUFDLEVBQWMsRUFBRSxFQUFFOztZQUNuRCxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsTUFBcUIsQ0FBQztZQUN4QyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsc0JBQXNCLENBQUMsRUFBRTtnQkFDM0MsTUFBTSxPQUFPLEdBQUcsTUFBQSxNQUFNO3FCQUNwQixPQUFPLENBQUMsc0JBQXNCLENBQUMsMENBQzlCLFlBQVksQ0FBQyxXQUFXLENBQUMs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LFVBQVUsQ0FBQzthQUMxQztZQUVELGtCQUFrQjtZQUNsQixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQztnQkFDcEQsTUFBTSxFQUFFLGFBQWEsQ0FBQyxFQUFFO2dCQUN4QixPQUFPLEVBQUUsV0FBVzthQUNwQixDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRTtnQkFDcEIsTUFBTSxJQUFJLEtBQUssQ0FBQywwQkFBMEIsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7YUFDMUQ7UUFDRixDQUFDO0tBQUE7SUFFRDs7T0FFRztJQUNILFFBQVE7UUFDUCxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUNqRSxJQUFJLENBQUMsaUJBQWlCLEdBQUcsRUFBRSxDQUFDO1FBQzVCLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNsQixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHAsIENvbXBvbmVudCwgZGVib3VuY2UsIG1vbWVudCB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBDYWxlbmRhckV2ZW50IH0gZnJvbSAnQC9jb21wb25lbnRzL2ZlYXR1cmVzL2NhbGVuZGFyL2luZGV4JztcclxuaW1wb3J0IHsgcmVuZGVyQ2FsZW5kYXJFdmVudCB9IGZyb20gXCIuLi9yZW5kZXJpbmcvZXZlbnQtcmVuZGVyZXJcIjsgLy8gVXNlIG5ldyByZW5kZXJlclxyXG5pbXBvcnQge1xyXG5cdENhbGVuZGFyU3BlY2lmaWNDb25maWcsXHJcblx0Z2V0Vmlld1NldHRpbmdPckRlZmF1bHQsXHJcbn0gZnJvbSBcIkAvY29tbW9uL3NldHRpbmctZGVmaW5pdGlvblwiOyAvLyBJbXBvcnQgaGVscGVyXHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjsgLy8gSW1wb3J0IHBsdWdpbiB0eXBlIGZvciBzZXR0aW5ncyBhY2Nlc3NcclxuaW1wb3J0IHsgQ2FsZW5kYXJWaWV3Q29tcG9uZW50LCBDYWxlbmRhclZpZXdPcHRpb25zIH0gZnJvbSBcIi4vYmFzZS12aWV3XCI7IC8vIEltcG9ydCBiYXNlIGNsYXNzIGFuZCBvcHRpb25zIHR5cGVcclxuaW1wb3J0IFNvcnRhYmxlIGZyb20gXCJzb3J0YWJsZWpzXCI7XHJcblxyXG4vKipcclxuICogUmVuZGVycyB0aGUgd2VlayB2aWV3IGdyaWQgYXMgYSBjb21wb25lbnQuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgV2Vla1ZpZXcgZXh0ZW5kcyBDYWxlbmRhclZpZXdDb21wb25lbnQge1xyXG5cdC8vIEV4dGVuZCBiYXNlIGNsYXNzXHJcblx0Ly8gcHJpdmF0ZSBjb250YWluZXJFbDogSFRNTEVsZW1lbnQ7IC8vIEluaGVyaXRlZFxyXG5cdHByaXZhdGUgY3VycmVudERhdGU6IG1vbWVudC5Nb21lbnQ7XHJcblx0Ly8gcHJpdmF0ZSBldmVudHM6IENhbGVuZGFyRXZlbnRbXTsgLy8gSW5oZXJpdGVkXHJcblx0cHJpdmF0ZSBhcHA6IEFwcDsgLy8gS2VlcCBhcHAgcmVmZXJlbmNlXHJcblx0cHJpdmF0ZSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbjsgLy8gS2VlcCBwbHVnaW4gcmVmZXJlbmNlXHJcblx0cHJpdmF0ZSBzb3J0YWJsZUluc3RhbmNlczogU29ydGFibGVbXSA9IFtdOyAvLyBTdG9yZSBzb3J0YWJsZSBpbnN0YW5jZXMgZm9yIGNsZWFudXBcclxuXHRcdHByaXZhdGUgb3ZlcnJpZGVDb25maWc/OiBQYXJ0aWFsPENhbGVuZGFyU3BlY2lmaWNDb25maWc+O1xyXG5cclxuXHQvLyBSZW1vdmVkIG9uRXZlbnRDbGljay9vbk1vdXNlSG92ZXIgcHJvcGVydGllcywgbm93IGluIHRoaXMub3B0aW9uc1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdGFwcDogQXBwLFxyXG5cdFx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRjb250YWluZXJFbDogSFRNTEVsZW1lbnQsXHJcblx0XHRwcml2YXRlIGN1cnJlbnRWaWV3SWQ6IHN0cmluZyxcclxuXHRcdGN1cnJlbnREYXRlOiBtb21lbnQuTW9tZW50LFxyXG5cdFx0ZXZlbnRzOiBDYWxlbmRhckV2ZW50W10sXHJcblx0XHRvcHRpb25zOiBDYWxlbmRhclZpZXdPcHRpb25zLCAvLyBVc2UgdGhlIGJhc2Ugb3B0aW9ucyB0eXBlXHJcblx0XHRvdmVycmlkZUNvbmZpZz86IFBhcnRpYWw8Q2FsZW5kYXJTcGVjaWZpY0NvbmZpZz5cclxuXHQpIHtcclxuXHRcdHN1cGVyKHBsdWdpbiwgYXBwLCBjb250YWluZXJFbCwgZXZlbnRzLCBvcHRpb25zKTsgLy8gQ2FsbCBiYXNlIGNvbnN0cnVjdG9yXHJcblx0XHR0aGlzLmFwcCA9IGFwcDsgLy8gU3RvcmUgYXBwXHJcblx0XHR0aGlzLnBsdWdpbiA9IHBsdWdpbjsgLy8gU3RvcmUgcGx1Z2luXHJcblx0XHR0aGlzLmN1cnJlbnREYXRlID0gY3VycmVudERhdGU7XHJcblx0XHR0aGlzLm92ZXJyaWRlQ29uZmlnID0gb3ZlcnJpZGVDb25maWc7XHJcblx0fVxyXG5cclxuXHRyZW5kZXIoKTogdm9pZCB7XHJcblx0XHQvLyBHZXQgdmlldyBzZXR0aW5ncywgcHJlZmVyIG92ZXJyaWRlIHZhbHVlcyB3aGVuIHByb3ZpZGVkXHJcblx0XHRjb25zdCB2aWV3Q29uZmlnID0gZ2V0Vmlld1NldHRpbmdPckRlZmF1bHQoXHJcblx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHR0aGlzLmN1cnJlbnRWaWV3SWRcclxuXHRcdCk7XHJcblx0XHRjb25zb2xlLmxvZyhcInZpZXdDb25maWcgY2FsZW5kYXJcIiwgdmlld0NvbmZpZyk7XHJcblx0XHRjb25zdCBmaXJzdERheU9mV2Vla1NldHRpbmcgPSAodGhpcy5vdmVycmlkZUNvbmZpZz8uZmlyc3REYXlPZldlZWsgPz8gKHZpZXdDb25maWcuc3BlY2lmaWNDb25maWcgYXMgQ2FsZW5kYXJTcGVjaWZpY0NvbmZpZykuZmlyc3REYXlPZldlZWspO1xyXG5cdFx0Y29uc3QgaGlkZVdlZWtlbmRzID0gKHRoaXMub3ZlcnJpZGVDb25maWc/LmhpZGVXZWVrZW5kcyA/PyAodmlld0NvbmZpZy5zcGVjaWZpY0NvbmZpZyBhcyBDYWxlbmRhclNwZWNpZmljQ29uZmlnKT8uaGlkZVdlZWtlbmRzKSA/PyBmYWxzZTtcclxuXHRcdC8vIERlZmF1bHQgdG8gU3VuZGF5ICgwKSBpZiB0aGUgc2V0dGluZyBpcyB1bmRlZmluZWQsIGZvbGxvd2luZyAwPVN1biwgMT1Nb24sIC4uLiwgNj1TYXRcclxuXHRcdGNvbnN0IGVmZmVjdGl2ZUZpcnN0RGF5ID1cclxuXHRcdFx0Zmlyc3REYXlPZldlZWtTZXR0aW5nID09PSB1bmRlZmluZWQgPyAwIDogZmlyc3REYXlPZldlZWtTZXR0aW5nO1xyXG5cclxuXHRcdC8vIENhbGN1bGF0ZSBzdGFydCBhbmQgZW5kIG9mIHdlZWsgYmFzZWQgb24gdGhlIHNldHRpbmdcclxuXHRcdGNvbnN0IHN0YXJ0T2ZXZWVrID0gdGhpcy5jdXJyZW50RGF0ZS5jbG9uZSgpLndlZWtkYXkoZWZmZWN0aXZlRmlyc3REYXkpO1xyXG5cdFx0Y29uc3QgZW5kT2ZXZWVrID0gc3RhcnRPZldlZWsuY2xvbmUoKS5hZGQoNiwgXCJkYXlzXCIpOyAvLyBXZWVrIGFsd2F5cyBoYXMgNyBkYXlzXHJcblxyXG5cdFx0dGhpcy5jb250YWluZXJFbC5lbXB0eSgpO1xyXG5cdFx0dGhpcy5jb250YWluZXJFbC5hZGRDbGFzcyhcInZpZXctd2Vla1wiKTtcclxuXHJcblx0XHQvLyBBZGQgaGlkZS13ZWVrZW5kcyBjbGFzcyBpZiB3ZWVrZW5kIGhpZGluZyBpcyBlbmFibGVkXHJcblx0XHRpZiAoaGlkZVdlZWtlbmRzKSB7XHJcblx0XHRcdHRoaXMuY29udGFpbmVyRWwuYWRkQ2xhc3MoXCJoaWRlLXdlZWtlbmRzXCIpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy5jb250YWluZXJFbC5yZW1vdmVDbGFzcyhcImhpZGUtd2Vla2VuZHNcIik7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gMS4gUmVuZGVyIEhlYWRlciBSb3cgKERheXMgb2YgdGhlIHdlZWsgKyBEYXRlcylcclxuXHRcdGNvbnN0IGhlYWRlclJvdyA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KFwiY2FsZW5kYXItd2Vlay1oZWFkZXJcIik7XHJcblx0XHRjb25zdCBkYXlIZWFkZXJDZWxsczogeyBba2V5OiBzdHJpbmddOiBIVE1MRWxlbWVudCB9ID0ge307XHJcblx0XHRsZXQgY3VycmVudERheUl0ZXIgPSBzdGFydE9mV2Vlay5jbG9uZSgpO1xyXG5cclxuXHRcdC8vIEdlbmVyYXRlIHJvdGF0ZWQgd2Vla2RheXMgZm9yIGhlYWRlclxyXG5cdFx0Y29uc3Qgd2Vla2RheXMgPSBtb21lbnQud2Vla2RheXNTaG9ydCh0cnVlKTsgLy8gR2V0cyBsb2NhbGUtYXdhcmUgc2hvcnQgd2Vla2RheXNcclxuXHRcdGNvbnN0IHJvdGF0ZWRXZWVrZGF5cyA9IFtcclxuXHRcdFx0Li4ud2Vla2RheXMuc2xpY2UoZWZmZWN0aXZlRmlyc3REYXkpLFxyXG5cdFx0XHQuLi53ZWVrZGF5cy5zbGljZSgwLCBlZmZlY3RpdmVGaXJzdERheSksXHJcblx0XHRdO1xyXG5cclxuXHRcdC8vIEZpbHRlciBvdXQgd2Vla2VuZHMgaWYgaGlkZVdlZWtlbmRzIGlzIGVuYWJsZWRcclxuXHRcdGNvbnN0IGZpbHRlcmVkV2Vla2RheXMgPSBoaWRlV2Vla2VuZHNcclxuXHRcdFx0PyByb3RhdGVkV2Vla2RheXMuZmlsdGVyKChfLCBpbmRleCkgPT4ge1xyXG5cdFx0XHRcdC8vIENhbGN1bGF0ZSB0aGUgYWN0dWFsIGRheSBvZiB3ZWVrIGZvciB0aGlzIGhlYWRlciBwb3NpdGlvblxyXG5cdFx0XHRcdGNvbnN0IGRheU9mV2VlayA9IChlZmZlY3RpdmVGaXJzdERheSArIGluZGV4KSAlIDc7XHJcblx0XHRcdFx0cmV0dXJuIGRheU9mV2VlayAhPT0gMCAmJiBkYXlPZldlZWsgIT09IDY7IC8vIEV4Y2x1ZGUgU3VuZGF5ICgwKSBhbmQgU2F0dXJkYXkgKDYpXHJcblx0XHRcdH0pXHJcblx0XHRcdDogcm90YXRlZFdlZWtkYXlzO1xyXG5cclxuXHRcdGxldCBkYXlJbmRleCA9IDA7XHJcblxyXG5cdFx0d2hpbGUgKGN1cnJlbnREYXlJdGVyLmlzU2FtZU9yQmVmb3JlKGVuZE9mV2VlaywgXCJkYXlcIikpIHtcclxuXHRcdFx0Y29uc3QgaXNXZWVrZW5kID0gY3VycmVudERheUl0ZXIuZGF5KCkgPT09IDAgfHwgY3VycmVudERheUl0ZXIuZGF5KCkgPT09IDY7IC8vIFN1bmRheSBvciBTYXR1cmRheVxyXG5cclxuXHRcdFx0Ly8gU2tpcCB3ZWVrZW5kIGRheXMgaWYgaGlkZVdlZWtlbmRzIGlzIGVuYWJsZWRcclxuXHRcdFx0aWYgKGhpZGVXZWVrZW5kcyAmJiBpc1dlZWtlbmQpIHtcclxuXHRcdFx0XHRjdXJyZW50RGF5SXRlci5hZGQoMSwgXCJkYXlcIik7XHJcblx0XHRcdFx0Y29udGludWU7IC8vIERvbid0IGluY3JlbWVudCBkYXlJbmRleCBmb3Igc2tpcHBlZCBkYXlzXHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IGRhdGVTdHIgPSBjdXJyZW50RGF5SXRlci5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xyXG5cdFx0XHRjb25zdCBoZWFkZXJDZWxsID0gaGVhZGVyUm93LmNyZWF0ZURpdihcImNhbGVuZGFyLWhlYWRlci1jZWxsXCIpO1xyXG5cdFx0XHRkYXlIZWFkZXJDZWxsc1tkYXRlU3RyXSA9IGhlYWRlckNlbGw7IC8vIFN0b3JlIGhlYWRlciBjZWxsIGlmIG5lZWRlZFxyXG5cdFx0XHRjb25zdCB3ZWVrZGF5RWwgPSBoZWFkZXJDZWxsLmNyZWF0ZURpdihcImNhbGVuZGFyLXdlZWtkYXlcIik7XHJcblx0XHRcdHdlZWtkYXlFbC50ZXh0Q29udGVudCA9IGZpbHRlcmVkV2Vla2RheXNbZGF5SW5kZXhdOyAvLyBVc2UgZmlsdGVyZWQgd2Vla2RheSBuYW1lc1xyXG5cdFx0XHRjb25zdCBkYXlOdW1FbCA9IGhlYWRlckNlbGwuY3JlYXRlRGl2KFwiY2FsZW5kYXItZGF5LW51bWJlclwiKTtcclxuXHRcdFx0ZGF5TnVtRWwudGV4dENvbnRlbnQgPSBjdXJyZW50RGF5SXRlci5mb3JtYXQoXCJEXCIpOyAvLyBEYXRlIG51bWJlclxyXG5cclxuXHRcdFx0aWYgKGN1cnJlbnREYXlJdGVyLmlzU2FtZShtb21lbnQoKSwgXCJkYXlcIikpIHtcclxuXHRcdFx0XHRoZWFkZXJDZWxsLmFkZENsYXNzKFwiaXMtdG9kYXlcIik7XHJcblx0XHRcdH1cclxuXHRcdFx0Y3VycmVudERheUl0ZXIuYWRkKDEsIFwiZGF5XCIpO1xyXG5cdFx0XHRkYXlJbmRleCsrO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIC0tLSBBbGwtRGF5IFNlY3Rpb24gKFJlbmFtZWQgZm9yIGNsYXJpdHksIG5vdyBob2xkcyBhbGwgZXZlbnRzKSAtLS1cclxuXHRcdGNvbnN0IHdlZWtHcmlkU2VjdGlvbiA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KFxyXG5cdFx0XHRcImNhbGVuZGFyLXdlZWstZ3JpZC1zZWN0aW9uXCIgLy8gUmVuYW1lZCBjbGFzc1xyXG5cdFx0KTtcclxuXHRcdGNvbnN0IHdlZWtHcmlkID0gd2Vla0dyaWRTZWN0aW9uLmNyZWF0ZURpdihcImNhbGVuZGFyLXdlZWstZ3JpZFwiKTsgLy8gUmVuYW1lZCBjbGFzc1xyXG5cdFx0Y29uc3QgZGF5RXZlbnRDb250YWluZXJzOiB7IFtrZXk6IHN0cmluZ106IEhUTUxFbGVtZW50IH0gPSB7fTsgLy8gUmVuYW1lZCB2YXJpYWJsZVxyXG5cdFx0Y3VycmVudERheUl0ZXIgPSBzdGFydE9mV2Vlay5jbG9uZSgpO1xyXG5cclxuXHRcdHdoaWxlIChjdXJyZW50RGF5SXRlci5pc1NhbWVPckJlZm9yZShlbmRPZldlZWssIFwiZGF5XCIpKSB7XHJcblx0XHRcdGNvbnN0IGlzV2Vla2VuZCA9IGN1cnJlbnREYXlJdGVyLmRheSgpID09PSAwIHx8IGN1cnJlbnREYXlJdGVyLmRheSgpID09PSA2OyAvLyBTdW5kYXkgb3IgU2F0dXJkYXlcclxuXHJcblx0XHRcdC8vIFNraXAgd2Vla2VuZCBkYXlzIGlmIGhpZGVXZWVrZW5kcyBpcyBlbmFibGVkXHJcblx0XHRcdGlmIChoaWRlV2Vla2VuZHMgJiYgaXNXZWVrZW5kKSB7XHJcblx0XHRcdFx0Y3VycmVudERheUl0ZXIuYWRkKDEsIFwiZGF5XCIpO1xyXG5cdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBkYXRlU3RyID0gY3VycmVudERheUl0ZXIuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcclxuXHRcdFx0Y29uc3QgZGF5Q2VsbCA9IHdlZWtHcmlkLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0XHRjbHM6IFwiY2FsZW5kYXItZGF5LWNvbHVtblwiLFxyXG5cdFx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHRcdFwiZGF0YS1kYXRlXCI6IGRhdGVTdHIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdGRheUV2ZW50Q29udGFpbmVyc1tkYXRlU3RyXSA9IGRheUNlbGwuY3JlYXRlRGl2KFxyXG5cdFx0XHRcdC8vIFVzZSByZW5hbWVkIHZhcmlhYmxlXHJcblx0XHRcdFx0XCJjYWxlbmRhci1kYXktZXZlbnRzLWNvbnRhaW5lclwiIC8vIFJlbmFtZWQgY2xhc3NcclxuXHRcdFx0KTtcclxuXHRcdFx0aWYgKGN1cnJlbnREYXlJdGVyLmlzU2FtZShtb21lbnQoKSwgXCJkYXlcIikpIHtcclxuXHRcdFx0XHRkYXlDZWxsLmFkZENsYXNzKFwiaXMtdG9kYXlcIik7IC8vIEFwcGx5IHRvIHRoZSBtYWluIGRheSBjZWxsXHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKGlzV2Vla2VuZCkge1xyXG5cdFx0XHRcdC8vIFRoaXMgd2Vla2VuZCBjaGVjayBpcyBiYXNlZCBvbiBTdW4vU2F0LCBtaWdodCBuZWVkIGFkanVzdG1lbnQgaWYgc3RhcnQgZGF5IGNoYW5nZXMgd2Vla2VuZCBkZWZpbml0aW9uIHZpc3VhbGx5XHJcblx0XHRcdFx0ZGF5Q2VsbC5hZGRDbGFzcyhcImlzLXdlZWtlbmRcIik7IC8vIEFwcGx5IHRvIHRoZSBtYWluIGRheSBjZWxsXHJcblx0XHRcdH1cclxuXHRcdFx0Y3VycmVudERheUl0ZXIuYWRkKDEsIFwiZGF5XCIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIDMuIEZpbHRlciBFdmVudHMgZm9yIHRoZSBXZWVrIChVc2VzIGNhbGN1bGF0ZWQgc3RhcnRPZldlZWsvZW5kT2ZXZWVrKVxyXG5cdFx0Y29uc3Qgd2Vla0V2ZW50cyA9IHRoaXMuZXZlbnRzLmZpbHRlcigoZXZlbnQpID0+IHtcclxuXHRcdFx0Y29uc3QgZXZlbnRTdGFydCA9IG1vbWVudChldmVudC5zdGFydCk7XHJcblx0XHRcdGNvbnN0IGV2ZW50RW5kID0gZXZlbnQuZW5kID8gbW9tZW50KGV2ZW50LmVuZCkgOiBldmVudFN0YXJ0O1xyXG5cdFx0XHRyZXR1cm4gKFxyXG5cdFx0XHRcdGV2ZW50U3RhcnQuaXNCZWZvcmUoXHJcblx0XHRcdFx0XHRlbmRPZldlZWsuY2xvbmUoKS5lbmRPZihcImRheVwiKS5hZGQoMSwgXCJtaWxsaXNlY29uZFwiKVxyXG5cdFx0XHRcdCkgJiYgZXZlbnRFbmQuaXNTYW1lT3JBZnRlcihzdGFydE9mV2Vlay5jbG9uZSgpLnN0YXJ0T2YoXCJkYXlcIikpXHJcblx0XHRcdCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBTb3J0IGV2ZW50czogU2ltcGxlIHNvcnQgYnkgc3RhcnQgdGltZSBtaWdodCBiZSB1c2VmdWwsIGJ1dCBub3Qgc3RyaWN0bHkgbmVjZXNzYXJ5IGZvciB0aGlzIGxvZ2ljXHJcblx0XHRjb25zdCBzb3J0ZWRXZWVrRXZlbnRzID0gWy4uLndlZWtFdmVudHNdLnNvcnQoKGEsIGIpID0+IHtcclxuXHRcdFx0cmV0dXJuIG1vbWVudChhLnN0YXJ0KS52YWx1ZU9mKCkgLSBtb21lbnQoYi5zdGFydCkudmFsdWVPZigpOyAvLyBFYXJsaWVyIHN0YXJ0IGRhdGUgZmlyc3RcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIC0tLSBDYWxjdWxhdGUgdmVydGljYWwgc2xvdHMgZm9yIGVhY2ggZXZlbnQgLS0tIChSRU1PVkVEKVxyXG5cclxuXHRcdC8vIC0tLSBSZW5kZXIgZXZlbnRzIChTaW1wbGlmaWVkIExvZ2ljKSAtLS1cclxuXHRcdHNvcnRlZFdlZWtFdmVudHMuZm9yRWFjaCgoZXZlbnQpID0+IHtcclxuXHRcdFx0aWYgKCFldmVudC5zdGFydCkgcmV0dXJuOyAvLyBTa2lwIGV2ZW50cyB3aXRob3V0IGEgc3RhcnQgZGF0ZVxyXG5cclxuXHRcdFx0Y29uc3QgZXZlbnRTdGFydE1vbWVudCA9IG1vbWVudChldmVudC5zdGFydCkuc3RhcnRPZihcImRheVwiKTtcclxuXHJcblx0XHRcdC8vIFVzZSBjYWxjdWxhdGVkIHdlZWsgYm91bmRhcmllc1xyXG5cdFx0XHRjb25zdCB3ZWVrU3RhcnRNb21lbnQgPSBzdGFydE9mV2Vlay5jbG9uZSgpLnN0YXJ0T2YoXCJkYXlcIik7XHJcblx0XHRcdGNvbnN0IHdlZWtFbmRNb21lbnQgPSBlbmRPZldlZWsuY2xvbmUoKS5lbmRPZihcImRheVwiKTtcclxuXHJcblx0XHRcdC8vIENoZWNrIGlmIHRoZSBldmVudCdzIFNUQVJUIGRhdGUgaXMgd2l0aGluIHRoZSBjdXJyZW50IHdlZWsgdmlld1xyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0ZXZlbnRTdGFydE1vbWVudC5pc1NhbWVPckFmdGVyKHdlZWtTdGFydE1vbWVudCkgJiZcclxuXHRcdFx0XHRldmVudFN0YXJ0TW9tZW50LmlzU2FtZU9yQmVmb3JlKHdlZWtFbmRNb21lbnQpXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdGNvbnN0IGRhdGVTdHIgPSBldmVudFN0YXJ0TW9tZW50LmZvcm1hdChcIllZWVktTU0tRERcIik7XHJcblx0XHRcdFx0Y29uc3QgY29udGFpbmVyID0gZGF5RXZlbnRDb250YWluZXJzW2RhdGVTdHJdOyAvLyBHZXQgdGhlIGNvbnRhaW5lciBmb3IgdGhlIHN0YXJ0IGRhdGVcclxuXHRcdFx0XHRpZiAoY29udGFpbmVyKSB7XHJcblx0XHRcdFx0XHQvLyBSZW5kZXIgdGhlIGV2ZW50IE9OQ0UgaW4gdGhlIGNvcnJlY3QgZGF5J3MgY29udGFpbmVyXHJcblx0XHRcdFx0XHRjb25zdCB7IGV2ZW50RWwsIGNvbXBvbmVudCB9ID0gcmVuZGVyQ2FsZW5kYXJFdmVudCh7XHJcblx0XHRcdFx0XHRcdGV2ZW50OiBldmVudCxcclxuXHRcdFx0XHRcdFx0dmlld1R5cGU6IFwid2Vlay1hbGxkYXlcIiwgLy8gUmV2ZXJ0ZWQgdG8gb3JpZ2luYWwgdHlwZSB0byBmaXggbGludGVyIGVycm9yXHJcblx0XHRcdFx0XHRcdC8vIHBvc2l0aW9uaW5nSGludHMgcmVtb3ZlZCAtIG5vIGNvbXBsZXggbGF5b3V0IG5lZWRlZCBub3dcclxuXHRcdFx0XHRcdFx0YXBwOiB0aGlzLmFwcCxcclxuXHRcdFx0XHRcdFx0b25FdmVudENsaWNrOiB0aGlzLm9wdGlvbnMub25FdmVudENsaWNrLFxyXG5cdFx0XHRcdFx0XHRvbkV2ZW50SG92ZXI6IHRoaXMub3B0aW9ucy5vbkV2ZW50SG92ZXIsXHJcblx0XHRcdFx0XHRcdG9uRXZlbnRDb250ZXh0TWVudTogdGhpcy5vcHRpb25zLm9uRXZlbnRDb250ZXh0TWVudSxcclxuXHRcdFx0XHRcdFx0b25FdmVudENvbXBsZXRlOiB0aGlzLm9wdGlvbnMub25FdmVudENvbXBsZXRlLFxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR0aGlzLmFkZENoaWxkKGNvbXBvbmVudCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gTm8gYWJzb2x1dGUgcG9zaXRpb25pbmcgb3Igc2xvdCBjYWxjdWxhdGlvbiBuZWVkZWRcclxuXHRcdFx0XHRcdC8vIGV2ZW50RWwuc3R5bGUudG9wID0gLi4uXHJcblxyXG5cdFx0XHRcdFx0Y29udGFpbmVyLmFwcGVuZENoaWxkKGV2ZW50RWwpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdGBSZW5kZXJlZCBTaW1wbGlmaWVkIFdlZWsgVmlldyBmcm9tICR7c3RhcnRPZldlZWsuZm9ybWF0KFxyXG5cdFx0XHRcdFwiWVlZWS1NTS1ERFwiXHJcblx0XHRcdCl9IHRvICR7ZW5kT2ZXZWVrLmZvcm1hdChcclxuXHRcdFx0XHRcIllZWVktTU0tRERcIlxyXG5cdFx0XHQpfSAoRmlyc3QgZGF5OiAke2VmZmVjdGl2ZUZpcnN0RGF5fSlgXHJcblx0XHQpO1xyXG5cclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudCh3ZWVrR3JpZCwgXCJjbGlja1wiLCAoZXYpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFyZ2V0ID0gZXYudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xyXG5cdFx0XHRpZiAodGFyZ2V0LmNsb3Nlc3QoXCIuY2FsZW5kYXItZGF5LWNvbHVtblwiKSkge1xyXG5cdFx0XHRcdGNvbnN0IGRhdGVTdHIgPSB0YXJnZXRcclxuXHRcdFx0XHRcdC5jbG9zZXN0KFwiLmNhbGVuZGFyLWRheS1jb2x1bW5cIilcclxuXHRcdFx0XHRcdD8uZ2V0QXR0cmlidXRlKFwiZGF0YS1kYXRlXCIpO1xyXG5cdFx0XHRcdGlmICh0aGlzLm9wdGlvbnMub25EYXlDbGljaykge1xyXG5cdFx0XHRcdFx0dGhpcy5vcHRpb25zLm9uRGF5Q2xpY2soZXYsIG1vbWVudChkYXRlU3RyKS52YWx1ZU9mKCksIHtcclxuXHRcdFx0XHRcdFx0YmVoYXZpb3I6IFwib3Blbi1xdWljay1jYXB0dXJlXCIsXHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudCh3ZWVrR3JpZCwgXCJtb3VzZW92ZXJcIiwgKGV2KSA9PiB7XHJcblx0XHRcdHRoaXMuZGVib3VuY2VIb3Zlcihldik7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBJbml0aWFsaXplIGRyYWcgYW5kIGRyb3AgZnVuY3Rpb25hbGl0eVxyXG5cdFx0dGhpcy5pbml0aWFsaXplRHJhZ0FuZERyb3AoZGF5RXZlbnRDb250YWluZXJzKTtcclxuXHR9XHJcblxyXG5cdC8vIFVwZGF0ZSBtZXRob2RzIHRvIGFsbG93IGNoYW5naW5nIGRhdGEgYWZ0ZXIgaW5pdGlhbCByZW5kZXJcclxuXHR1cGRhdGVFdmVudHMoZXZlbnRzOiBDYWxlbmRhckV2ZW50W10pOiB2b2lkIHtcclxuXHRcdHRoaXMuZXZlbnRzID0gZXZlbnRzO1xyXG5cdFx0dGhpcy5yZW5kZXIoKTsgLy8gUmUtcmVuZGVyIHdpbGwgcGljayB1cCBjdXJyZW50IHNldHRpbmdzXHJcblx0fVxyXG5cclxuXHR1cGRhdGVDdXJyZW50RGF0ZShkYXRlOiBtb21lbnQuTW9tZW50KTogdm9pZCB7XHJcblx0XHR0aGlzLmN1cnJlbnREYXRlID0gZGF0ZTtcclxuXHRcdHRoaXMucmVuZGVyKCk7IC8vIFJlLXJlbmRlciB3aWxsIHBpY2sgdXAgY3VycmVudCBzZXR0aW5ncyBhbmQgZGF0ZVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBkZWJvdW5jZUhvdmVyID0gZGVib3VuY2UoKGV2OiBNb3VzZUV2ZW50KSA9PiB7XHJcblx0XHRjb25zdCB0YXJnZXQgPSBldi50YXJnZXQgYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRpZiAodGFyZ2V0LmNsb3Nlc3QoXCIuY2FsZW5kYXItZGF5LWNvbHVtblwiKSkge1xyXG5cdFx0XHRjb25zdCBkYXRlU3RyID0gdGFyZ2V0XHJcblx0XHRcdFx0LmNsb3Nlc3QoXCIuY2FsZW5kYXItZGF5LWNvbHVtblwiKVxyXG5cdFx0XHRcdD8uZ2V0QXR0cmlidXRlKFwiZGF0YS1kYXRlXCIpO1xyXG5cdFx0XHRpZiAodGhpcy5vcHRpb25zLm9uRGF5SG92ZXIpIHtcclxuXHRcdFx0XHR0aGlzLm9wdGlvbnMub25EYXlIb3ZlcihldiwgbW9tZW50KGRhdGVTdHIpLnZhbHVlT2YoKSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9LCAyMDApO1xyXG5cclxuXHQvKipcclxuXHQgKiBJbml0aWFsaXplIGRyYWcgYW5kIGRyb3AgZnVuY3Rpb25hbGl0eSBmb3IgY2FsZW5kYXIgZXZlbnRzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBpbml0aWFsaXplRHJhZ0FuZERyb3AoZGF5RXZlbnRDb250YWluZXJzOiB7XHJcblx0XHRba2V5OiBzdHJpbmddOiBIVE1MRWxlbWVudDtcclxuXHR9KTogdm9pZCB7XHJcblx0XHQvLyBDbGVhbiB1cCBleGlzdGluZyBzb3J0YWJsZSBpbnN0YW5jZXNcclxuXHRcdHRoaXMuc29ydGFibGVJbnN0YW5jZXMuZm9yRWFjaCgoaW5zdGFuY2UpID0+IGluc3RhbmNlLmRlc3Ryb3koKSk7XHJcblx0XHR0aGlzLnNvcnRhYmxlSW5zdGFuY2VzID0gW107XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBzb3J0YWJsZSBmb3IgZWFjaCBkYXkncyBldmVudHMgY29udGFpbmVyXHJcblx0XHRPYmplY3QuZW50cmllcyhkYXlFdmVudENvbnRhaW5lcnMpLmZvckVhY2goXHJcblx0XHRcdChbZGF0ZVN0ciwgZXZlbnRzQ29udGFpbmVyXSkgPT4ge1xyXG5cdFx0XHRcdGlmIChldmVudHNDb250YWluZXIpIHtcclxuXHRcdFx0XHRcdGNvbnN0IHNvcnRhYmxlSW5zdGFuY2UgPSBTb3J0YWJsZS5jcmVhdGUoZXZlbnRzQ29udGFpbmVyLCB7XHJcblx0XHRcdFx0XHRcdGdyb3VwOiBcImNhbGVuZGFyLWV2ZW50c1wiLFxyXG5cdFx0XHRcdFx0XHRhbmltYXRpb246IDE1MCxcclxuXHRcdFx0XHRcdFx0Z2hvc3RDbGFzczogXCJjYWxlbmRhci1ldmVudC1naG9zdFwiLFxyXG5cdFx0XHRcdFx0XHRkcmFnQ2xhc3M6IFwiY2FsZW5kYXItZXZlbnQtZHJhZ2dpbmdcIixcclxuXHRcdFx0XHRcdFx0b25FbmQ6IChldmVudCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMuaGFuZGxlRHJhZ0VuZChldmVudCwgZGF0ZVN0cik7XHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdHRoaXMuc29ydGFibGVJbnN0YW5jZXMucHVzaChzb3J0YWJsZUluc3RhbmNlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBIYW5kbGUgZHJhZyBlbmQgZXZlbnQgdG8gdXBkYXRlIHRhc2sgZGF0ZXNcclxuXHQgKi9cclxuXHRwcml2YXRlIGFzeW5jIGhhbmRsZURyYWdFbmQoXHJcblx0XHRldmVudDogU29ydGFibGUuU29ydGFibGVFdmVudCxcclxuXHRcdG9yaWdpbmFsRGF0ZVN0cjogc3RyaW5nXHJcblx0KTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRjb25zdCBldmVudEVsID0gZXZlbnQuaXRlbTtcclxuXHRcdGNvbnN0IGV2ZW50SWQgPSBldmVudEVsLmRhdGFzZXQuZXZlbnRJZDtcclxuXHRcdGNvbnN0IHRhcmdldENvbnRhaW5lciA9IGV2ZW50LnRvO1xyXG5cdFx0Y29uc3QgdGFyZ2V0RGF0ZUNvbHVtbiA9IHRhcmdldENvbnRhaW5lci5jbG9zZXN0KFxyXG5cdFx0XHRcIi5jYWxlbmRhci1kYXktY29sdW1uXCJcclxuXHRcdCk7XHJcblxyXG5cdFx0aWYgKCFldmVudElkIHx8ICF0YXJnZXREYXRlQ29sdW1uKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcIkNvdWxkIG5vdCBkZXRlcm1pbmUgZXZlbnQgSUQgb3IgdGFyZ2V0IGRhdGUgZm9yIGRyYWcgb3BlcmF0aW9uXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHRhcmdldERhdGVTdHIgPSB0YXJnZXREYXRlQ29sdW1uLmdldEF0dHJpYnV0ZShcImRhdGEtZGF0ZVwiKTtcclxuXHRcdGlmICghdGFyZ2V0RGF0ZVN0ciB8fCB0YXJnZXREYXRlU3RyID09PSBvcmlnaW5hbERhdGVTdHIpIHtcclxuXHRcdFx0Ly8gTm8gZGF0ZSBjaGFuZ2UsIG5vdGhpbmcgdG8gZG9cclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEZpbmQgdGhlIGNhbGVuZGFyIGV2ZW50XHJcblx0XHRjb25zdCBjYWxlbmRhckV2ZW50ID0gdGhpcy5ldmVudHMuZmluZCgoZSkgPT4gZS5pZCA9PT0gZXZlbnRJZCk7XHJcblx0XHRpZiAoIWNhbGVuZGFyRXZlbnQpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKGBDYWxlbmRhciBldmVudCB3aXRoIElEICR7ZXZlbnRJZH0gbm90IGZvdW5kYCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHRhd2FpdCB0aGlzLnVwZGF0ZVRhc2tEYXRlKGNhbGVuZGFyRXZlbnQsIHRhcmdldERhdGVTdHIpO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRgVGFzayAke2V2ZW50SWR9IG1vdmVkIGZyb20gJHtvcmlnaW5hbERhdGVTdHJ9IHRvICR7dGFyZ2V0RGF0ZVN0cn1gXHJcblx0XHRcdCk7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIHVwZGF0ZSB0YXNrIGRhdGU6XCIsIGVycm9yKTtcclxuXHRcdFx0Ly8gUmV2ZXJ0IHRoZSB2aXN1YWwgY2hhbmdlIGJ5IHJlLXJlbmRlcmluZ1xyXG5cdFx0XHR0aGlzLnJlbmRlcigpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIHRhc2sgZGF0ZSBiYXNlZCBvbiB0aGUgdGFyZ2V0IGRhdGVcclxuXHQgKi9cclxuXHRwcml2YXRlIGFzeW5jIHVwZGF0ZVRhc2tEYXRlKFxyXG5cdFx0Y2FsZW5kYXJFdmVudDogQ2FsZW5kYXJFdmVudCxcclxuXHRcdHRhcmdldERhdGVTdHI6IHN0cmluZ1xyXG5cdCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Y29uc3QgdGFyZ2V0RGF0ZSA9IG1vbWVudCh0YXJnZXREYXRlU3RyKS52YWx1ZU9mKCk7XHJcblxyXG5cdFx0aWYgKCF0aGlzLnBsdWdpbi53cml0ZUFQSSkge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJXcml0ZUFQSSBub3QgYXZhaWxhYmxlXCIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENyZWF0ZSB1cGRhdGVkIHRhc2sgd2l0aCBuZXcgZGF0ZVxyXG5cdFx0Y29uc3QgdXBkYXRlZFRhc2sgPSB7IC4uLmNhbGVuZGFyRXZlbnQgfTtcclxuXHJcblx0XHQvLyBEZXRlcm1pbmUgd2hpY2ggZGF0ZSBmaWVsZCB0byB1cGRhdGUgYmFzZWQgb24gd2hhdCB0aGUgdGFzayBjdXJyZW50bHkgaGFzXHJcblx0XHRpZiAoY2FsZW5kYXJFdmVudC5tZXRhZGF0YS5kdWVEYXRlKSB7XHJcblx0XHRcdHVwZGF0ZWRUYXNrLm1ldGFkYXRhLmR1ZURhdGUgPSB0YXJnZXREYXRlO1xyXG5cdFx0fSBlbHNlIGlmIChjYWxlbmRhckV2ZW50Lm1ldGFkYXRhLnNjaGVkdWxlZERhdGUpIHtcclxuXHRcdFx0dXBkYXRlZFRhc2subWV0YWRhdGEuc2NoZWR1bGVkRGF0ZSA9IHRhcmdldERhdGU7XHJcblx0XHR9IGVsc2UgaWYgKGNhbGVuZGFyRXZlbnQubWV0YWRhdGEuc3RhcnREYXRlKSB7XHJcblx0XHRcdHVwZGF0ZWRUYXNrLm1ldGFkYXRhLnN0YXJ0RGF0ZSA9IHRhcmdldERhdGU7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBEZWZhdWx0IHRvIGR1ZSBkYXRlIGlmIG5vIGRhdGUgaXMgc2V0XHJcblx0XHRcdHVwZGF0ZWRUYXNrLm1ldGFkYXRhLmR1ZURhdGUgPSB0YXJnZXREYXRlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFVwZGF0ZSB0aGUgdGFza1xyXG5cdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5wbHVnaW4ud3JpdGVBUEkudXBkYXRlVGFzayh7XHJcblx0XHRcdHRhc2tJZDogY2FsZW5kYXJFdmVudC5pZCxcclxuXHRcdFx0dXBkYXRlczogdXBkYXRlZFRhc2ssXHJcblx0XHR9KTtcclxuXHJcblx0XHRpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHVwZGF0ZSB0YXNrOiAke3Jlc3VsdC5lcnJvcn1gKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsZWFuIHVwIHNvcnRhYmxlIGluc3RhbmNlcyB3aGVuIGNvbXBvbmVudCBpcyBkZXN0cm95ZWRcclxuXHQgKi9cclxuXHRvbnVubG9hZCgpOiB2b2lkIHtcclxuXHRcdHRoaXMuc29ydGFibGVJbnN0YW5jZXMuZm9yRWFjaCgoaW5zdGFuY2UpID0+IGluc3RhbmNlLmRlc3Ryb3koKSk7XHJcblx0XHR0aGlzLnNvcnRhYmxlSW5zdGFuY2VzID0gW107XHJcblx0XHRzdXBlci5vbnVubG9hZCgpO1xyXG5cdH1cclxufVxyXG4iXX0=