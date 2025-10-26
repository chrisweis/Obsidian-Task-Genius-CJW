import { debounce, moment } from "obsidian";
import { getViewSettingOrDefault, } from "@/common/setting-definition"; // Import helper
import { CalendarViewComponent } from "./base-view"; // Import base class
/**
 * Renders the year view grid as a component.
 */
export class YearView extends CalendarViewComponent {
    constructor(app, plugin, containerEl, currentDate, events, options, // Use base options type
    overrideConfig) {
        super(plugin, app, containerEl, events, options); // Call base constructor
        this.debounceHover = debounce((ev) => {
            var _a;
            const target = ev.target;
            if (target.closest(".mini-day-cell")) {
                const dateStr = (_a = target
                    .closest(".mini-day-cell")) === null || _a === void 0 ? void 0 : _a.getAttribute("data-date");
                if (this.options.onDayHover) {
                    this.options.onDayHover(ev, moment(dateStr).valueOf());
                }
            }
        }, 200);
        this.app = app;
        this.plugin = plugin;
        this.currentDate = currentDate;
        this.overrideConfig = overrideConfig;
    }
    render() {
        var _a, _b, _c, _d, _e, _f;
        const year = this.currentDate.year();
        this.containerEl.empty();
        this.containerEl.addClass("view-year");
        console.log(`YearView: Rendering year ${year}. Total events received: ${this.events.length}`); // Log total events
        // Create a grid container for the 12 months (e.g., 4x3)
        const yearGrid = this.containerEl.createDiv("calendar-year-grid");
        // Filter events relevant to the current year
        const yearStart = moment({ year: year, month: 0, day: 1 });
        const yearEnd = moment({ year: year, month: 11, day: 31 });
        const startTimeFilter = performance.now();
        const yearEvents = this.events.filter((e) => {
            const start = moment(e.start);
            const end = e.end ? moment(e.end) : start;
            return (start.isSameOrBefore(yearEnd.endOf("day")) &&
                end.isSameOrAfter(yearStart.startOf("day")));
        });
        const endTimeFilter = performance.now();
        console.log(`YearView: Filtered ${yearEvents.length} events for year ${year} in ${endTimeFilter - startTimeFilter}ms`); // Log filtering time
        // Get view settings (prefer override when provided)
        const viewConfig = getViewSettingOrDefault(this.plugin, "calendar"); // Adjust if needed
        const firstDayOfWeekSetting = ((_b = (_a = this.overrideConfig) === null || _a === void 0 ? void 0 : _a.firstDayOfWeek) !== null && _b !== void 0 ? _b : viewConfig.specificConfig.firstDayOfWeek);
        const hideWeekends = (_f = ((_d = (_c = this.overrideConfig) === null || _c === void 0 ? void 0 : _c.hideWeekends) !== null && _d !== void 0 ? _d : (_e = viewConfig.specificConfig) === null || _e === void 0 ? void 0 : _e.hideWeekends)) !== null && _f !== void 0 ? _f : false;
        // Add hide-weekends class if weekend hiding is enabled
        if (hideWeekends) {
            this.containerEl.addClass("hide-weekends");
        }
        else {
            this.containerEl.removeClass("hide-weekends");
        }
        // Default to Sunday (0) if the setting is undefined, following 0=Sun, 1=Mon, ..., 6=Sat
        const effectiveFirstDay = firstDayOfWeekSetting === undefined ? 0 : firstDayOfWeekSetting;
        console.log("Effective first day:", effectiveFirstDay);
        const totalRenderStartTime = performance.now(); // Start total render time
        for (let month = 0; month < 12; month++) {
            const monthStartTime = performance.now(); // Start time for this month
            const monthContainer = yearGrid.createDiv("calendar-mini-month");
            const monthMoment = moment({ year: year, month: month, day: 1 });
            // Add month header
            const monthHeader = monthContainer.createDiv("mini-month-header");
            monthHeader.textContent = monthMoment.format("MMMM"); // Full month name
            // Add click listener to month header
            this.registerDomEvent(monthHeader, "click", (ev) => {
                // Trigger callback from options if it exists
                if (this.options.onMonthClick) {
                    this.options.onMonthClick(ev, monthMoment.valueOf());
                }
            });
            this.registerDomEvent(monthHeader, "mouseenter", (ev) => {
                // Trigger hover callback from options if it exists
                if (this.options.onMonthHover) {
                    this.options.onMonthHover(ev, monthMoment.valueOf());
                }
            });
            monthHeader.style.cursor = "pointer"; // Indicate clickable
            // Add body container for the mini-calendar grid
            const monthBody = monthContainer.createDiv("mini-month-body");
            const daysWithEvents = this.calculateDaysWithEvents(monthMoment, yearEvents // Pass already filtered year events
            );
            this.renderMiniMonthGrid(monthBody, monthMoment, daysWithEvents, effectiveFirstDay, hideWeekends);
        }
        const totalRenderEndTime = performance.now(); // End total render time
        console.log(`YearView: Finished rendering year ${year} in ${totalRenderEndTime - totalRenderStartTime}ms. (First day: ${effectiveFirstDay})`);
    }
    // Helper function to calculate which days in a month have events
    calculateDaysWithEvents(monthMoment, relevantEvents // Use the pre-filtered events
    ) {
        const days = new Set();
        const monthStart = monthMoment.clone().startOf("month");
        const monthEnd = monthMoment.clone().endOf("month");
        relevantEvents.forEach((event) => {
            // Check if event has a specific date (start, scheduled, or due) within the current month
            const datesToCheck = [
                event.start,
                event.metadata.scheduledDate,
                event.metadata.dueDate, // Assuming 'due' exists on CalendarEvent
            ];
            datesToCheck.forEach((dateInput) => {
                if (dateInput) {
                    const dateMoment = moment(dateInput);
                    // Check if the date falls within the current month
                    if (dateMoment.isBetween(monthStart, monthEnd, "day", "[]")) {
                        // '[]' includes start and end days
                        days.add(dateMoment.date()); // Add the day number (1-31)
                    }
                }
            });
        });
        return days;
    }
    // Helper function to render the mini-grid for a month
    renderMiniMonthGrid(container, monthMoment, daysWithEvents, effectiveFirstDay, // Pass the effective first day
    hideWeekends // Pass the weekend hiding setting
    ) {
        container.empty(); // Clear placeholder
        container.addClass("mini-month-grid");
        // Add mini weekday headers (optional, but helpful), rotated
        const headerRow = container.createDiv("mini-weekday-header");
        const weekdays = moment.weekdaysMin(true); // Use minimal names like Mo, Tu
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
            headerRow.createDiv("mini-weekday").textContent = day;
        });
        // Calculate grid boundaries using effective first day
        const monthStart = monthMoment.clone().startOf("month");
        const monthEnd = monthMoment.clone().endOf("month");
        let gridStart;
        let gridEnd;
        if (hideWeekends) {
            // When weekends are hidden, adjust grid to start and end on work days
            // Find the first work day of the week containing the start of month
            gridStart = monthStart.clone();
            const daysToSubtractStart = (monthStart.weekday() - effectiveFirstDay + 7) % 7;
            gridStart.subtract(daysToSubtractStart, "days");
            // Ensure gridStart is not a weekend
            while (gridStart.day() === 0 || gridStart.day() === 6) {
                gridStart.add(1, "day");
            }
            // Find the last work day of the week containing the end of month
            gridEnd = monthEnd.clone();
            const daysToAddEnd = (effectiveFirstDay + 4 - monthEnd.weekday() + 7) % 7; // 4 = Friday in work week
            gridEnd.add(daysToAddEnd, "days");
            // Ensure gridEnd is not a weekend
            while (gridEnd.day() === 0 || gridEnd.day() === 6) {
                gridEnd.subtract(1, "day");
            }
        }
        else {
            // Original logic for when weekends are shown
            const daysToSubtractStart = (monthStart.weekday() - effectiveFirstDay + 7) % 7;
            gridStart = monthStart.clone().subtract(daysToSubtractStart, "days");
            const daysToAddEnd = (effectiveFirstDay + 6 - monthEnd.weekday() + 7) % 7;
            gridEnd = monthEnd.clone().add(daysToAddEnd, "days");
        }
        let currentDayIter = gridStart.clone();
        while (currentDayIter.isSameOrBefore(gridEnd, "day")) {
            const isWeekend = currentDayIter.day() === 0 || currentDayIter.day() === 6; // Sunday or Saturday
            // Skip weekend days if hideWeekends is enabled
            if (hideWeekends && isWeekend) {
                currentDayIter.add(1, "day");
                continue;
            }
            const cell = container.createEl("div", {
                cls: "mini-day-cell",
                attr: {
                    "data-date": currentDayIter.format("YYYY-MM-DD"),
                },
            });
            const dayNumber = currentDayIter.date();
            // Only show day number if it's in the current month
            if (currentDayIter.isSame(monthMoment, "month")) {
                cell.textContent = String(dayNumber);
            }
            else {
                cell.addClass("is-other-month");
                cell.textContent = String(dayNumber); // Still show number but dimmed
            }
            if (currentDayIter.isSame(moment(), "day")) {
                cell.addClass("is-today");
            }
            if (currentDayIter.isSame(monthMoment, "month") &&
                daysWithEvents.has(dayNumber)) {
                cell.addClass("has-events");
            }
            // Add click listener to day cell only for days in the current month
            if (currentDayIter.isSame(monthMoment, "month")) {
                cell.style.cursor = "pointer"; // Indicate clickable
            }
            else {
                // Optionally disable clicks or provide different behavior for other month days
                cell.style.cursor = "default";
            }
            currentDayIter.add(1, "day");
        }
        this.registerDomEvent(container, "click", (ev) => {
            var _a;
            const target = ev.target;
            if (target.closest(".mini-day-cell")) {
                const dateStr = (_a = target
                    .closest(".mini-day-cell")) === null || _a === void 0 ? void 0 : _a.getAttribute("data-date");
                if (this.options.onDayClick) {
                    this.options.onDayClick(ev, moment(dateStr).valueOf(), {
                        behavior: "open-task-view",
                    });
                }
            }
        });
        this.registerDomEvent(container, "mouseover", (ev) => {
            this.debounceHover(ev);
        });
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
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieWVhci12aWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsieWVhci12aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBa0IsUUFBUSxFQUFFLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUU1RCxPQUFPLEVBRU4sdUJBQXVCLEdBQ3ZCLE1BQU0sNkJBQTZCLENBQUMsQ0FBQyxnQkFBZ0I7QUFFdEQsT0FBTyxFQUFFLHFCQUFxQixFQUF1QixNQUFNLGFBQWEsQ0FBQyxDQUFDLG9CQUFvQjtBQUU5Rjs7R0FFRztBQUNILE1BQU0sT0FBTyxRQUFTLFNBQVEscUJBQXFCO0lBV2xELFlBQ0MsR0FBUSxFQUNSLE1BQTZCLEVBQzdCLFdBQXdCLEVBQ3hCLFdBQTBCLEVBQzFCLE1BQXVCLEVBQ3ZCLE9BQTRCLEVBQUUsd0JBQXdCO0lBQ3RELGNBQWdEO1FBRWhELEtBQUssQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyx3QkFBd0I7UUFtU25FLGtCQUFhLEdBQUcsUUFBUSxDQUFDLENBQUMsRUFBYyxFQUFFLEVBQUU7O1lBQ25ELE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxNQUFxQixDQUFDO1lBQ3hDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO2dCQUNyQyxNQUFNLE9BQU8sR0FBRyxNQUFBLE1BQU07cUJBQ3BCLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQywwQ0FDeEIsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFDO2dCQUM3QixJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFO29CQUM1QixJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7aUJBQ3ZEO2FBQ0Q7UUFDRixDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7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QUVILElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUU7WUFDcEQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN4QixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCw2REFBNkQ7SUFDN0QsWUFBWSxDQUFDLE1BQXVCO1FBQ25DLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLDBDQUEwQztJQUMxRCxDQUFDO0lBRUQsaUJBQWlCLENBQUMsSUFBbUI7UUFDcEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFDeEIsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsbURBQW1EO0lBQ25FLENBQUM7Q0FhRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcCwgQ29tcG9uZW50LCBkZWJvdW5jZSwgbW9tZW50IH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IENhbGVuZGFyRXZlbnQgfSBmcm9tICdAL2NvbXBvbmVudHMvZmVhdHVyZXMvY2FsZW5kYXIvaW5kZXgnO1xyXG5pbXBvcnQge1xyXG5cdENhbGVuZGFyU3BlY2lmaWNDb25maWcsXHJcblx0Z2V0Vmlld1NldHRpbmdPckRlZmF1bHQsXHJcbn0gZnJvbSBcIkAvY29tbW9uL3NldHRpbmctZGVmaW5pdGlvblwiOyAvLyBJbXBvcnQgaGVscGVyXHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjsgLy8gSW1wb3J0IHBsdWdpbiB0eXBlIGZvciBzZXR0aW5ncyBhY2Nlc3NcclxuaW1wb3J0IHsgQ2FsZW5kYXJWaWV3Q29tcG9uZW50LCBDYWxlbmRhclZpZXdPcHRpb25zIH0gZnJvbSBcIi4vYmFzZS12aWV3XCI7IC8vIEltcG9ydCBiYXNlIGNsYXNzXHJcblxyXG4vKipcclxuICogUmVuZGVycyB0aGUgeWVhciB2aWV3IGdyaWQgYXMgYSBjb21wb25lbnQuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgWWVhclZpZXcgZXh0ZW5kcyBDYWxlbmRhclZpZXdDb21wb25lbnQge1xyXG5cdC8vIEV4dGVuZCBiYXNlIGNsYXNzXHJcblx0Ly8gcHJpdmF0ZSBjb250YWluZXJFbDogSFRNTEVsZW1lbnQ7IC8vIEluaGVyaXRlZFxyXG5cdHByaXZhdGUgY3VycmVudERhdGU6IG1vbWVudC5Nb21lbnQ7XHJcblx0Ly8gcHJpdmF0ZSBldmVudHM6IENhbGVuZGFyRXZlbnRbXTsgLy8gSW5oZXJpdGVkXHJcblx0cHJpdmF0ZSBhcHA6IEFwcDsgLy8gS2VlcCBhcHAgcmVmZXJlbmNlXHJcblx0cHJpdmF0ZSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbjsgLy8gS2VlcCBwbHVnaW4gcmVmZXJlbmNlXHJcblx0Ly8gUmVtb3ZlZCBzcGVjaWZpYyBjbGljay9ob3ZlciBwcm9wZXJ0aWVzLCB1c2UgdGhpcy5vcHRpb25zXHJcblx0XHRwcml2YXRlIG92ZXJyaWRlQ29uZmlnPzogUGFydGlhbDxDYWxlbmRhclNwZWNpZmljQ29uZmlnPjtcclxuXHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0YXBwOiBBcHAsXHJcblx0XHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCxcclxuXHRcdGN1cnJlbnREYXRlOiBtb21lbnQuTW9tZW50LFxyXG5cdFx0ZXZlbnRzOiBDYWxlbmRhckV2ZW50W10sXHJcblx0XHRvcHRpb25zOiBDYWxlbmRhclZpZXdPcHRpb25zLCAvLyBVc2UgYmFzZSBvcHRpb25zIHR5cGVcclxuXHRcdG92ZXJyaWRlQ29uZmlnPzogUGFydGlhbDxDYWxlbmRhclNwZWNpZmljQ29uZmlnPlxyXG5cdCkge1xyXG5cdFx0c3VwZXIocGx1Z2luLCBhcHAsIGNvbnRhaW5lckVsLCBldmVudHMsIG9wdGlvbnMpOyAvLyBDYWxsIGJhc2UgY29uc3RydWN0b3JcclxuXHRcdHRoaXMuYXBwID0gYXBwO1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0XHR0aGlzLmN1cnJlbnREYXRlID0gY3VycmVudERhdGU7XHJcblx0XHR0aGlzLm92ZXJyaWRlQ29uZmlnID0gb3ZlcnJpZGVDb25maWc7XHJcblx0fVxyXG5cclxuXHRyZW5kZXIoKTogdm9pZCB7XHJcblx0XHRjb25zdCB5ZWFyID0gdGhpcy5jdXJyZW50RGF0ZS55ZWFyKCk7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLmVtcHR5KCk7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLmFkZENsYXNzKFwidmlldy15ZWFyXCIpO1xyXG5cclxuXHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRgWWVhclZpZXc6IFJlbmRlcmluZyB5ZWFyICR7eWVhcn0uIFRvdGFsIGV2ZW50cyByZWNlaXZlZDogJHt0aGlzLmV2ZW50cy5sZW5ndGh9YFxyXG5cdFx0KTsgLy8gTG9nIHRvdGFsIGV2ZW50c1xyXG5cclxuXHRcdC8vIENyZWF0ZSBhIGdyaWQgY29udGFpbmVyIGZvciB0aGUgMTIgbW9udGhzIChlLmcuLCA0eDMpXHJcblx0XHRjb25zdCB5ZWFyR3JpZCA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KFwiY2FsZW5kYXIteWVhci1ncmlkXCIpO1xyXG5cclxuXHRcdC8vIEZpbHRlciBldmVudHMgcmVsZXZhbnQgdG8gdGhlIGN1cnJlbnQgeWVhclxyXG5cdFx0Y29uc3QgeWVhclN0YXJ0ID0gbW9tZW50KHsgeWVhcjogeWVhciwgbW9udGg6IDAsIGRheTogMSB9KTtcclxuXHRcdGNvbnN0IHllYXJFbmQgPSBtb21lbnQoeyB5ZWFyOiB5ZWFyLCBtb250aDogMTEsIGRheTogMzEgfSk7XHJcblx0XHRjb25zdCBzdGFydFRpbWVGaWx0ZXIgPSBwZXJmb3JtYW5jZS5ub3coKTtcclxuXHRcdGNvbnN0IHllYXJFdmVudHMgPSB0aGlzLmV2ZW50cy5maWx0ZXIoKGUpID0+IHtcclxuXHRcdFx0Y29uc3Qgc3RhcnQgPSBtb21lbnQoZS5zdGFydCk7XHJcblx0XHRcdGNvbnN0IGVuZCA9IGUuZW5kID8gbW9tZW50KGUuZW5kKSA6IHN0YXJ0O1xyXG5cdFx0XHRyZXR1cm4gKFxyXG5cdFx0XHRcdHN0YXJ0LmlzU2FtZU9yQmVmb3JlKHllYXJFbmQuZW5kT2YoXCJkYXlcIikpICYmXHJcblx0XHRcdFx0ZW5kLmlzU2FtZU9yQWZ0ZXIoeWVhclN0YXJ0LnN0YXJ0T2YoXCJkYXlcIikpXHJcblx0XHRcdCk7XHJcblx0XHR9KTtcclxuXHRcdGNvbnN0IGVuZFRpbWVGaWx0ZXIgPSBwZXJmb3JtYW5jZS5ub3coKTtcclxuXHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRgWWVhclZpZXc6IEZpbHRlcmVkICR7XHJcblx0XHRcdFx0eWVhckV2ZW50cy5sZW5ndGhcclxuXHRcdFx0fSBldmVudHMgZm9yIHllYXIgJHt5ZWFyfSBpbiAke2VuZFRpbWVGaWx0ZXIgLSBzdGFydFRpbWVGaWx0ZXJ9bXNgXHJcblx0XHQpOyAvLyBMb2cgZmlsdGVyaW5nIHRpbWVcclxuXHJcblx0XHQvLyBHZXQgdmlldyBzZXR0aW5ncyAocHJlZmVyIG92ZXJyaWRlIHdoZW4gcHJvdmlkZWQpXHJcblx0XHRjb25zdCB2aWV3Q29uZmlnID0gZ2V0Vmlld1NldHRpbmdPckRlZmF1bHQodGhpcy5wbHVnaW4sIFwiY2FsZW5kYXJcIik7IC8vIEFkanVzdCBpZiBuZWVkZWRcclxuXHRcdGNvbnN0IGZpcnN0RGF5T2ZXZWVrU2V0dGluZyA9ICh0aGlzLm92ZXJyaWRlQ29uZmlnPy5maXJzdERheU9mV2VlayA/PyAodmlld0NvbmZpZy5zcGVjaWZpY0NvbmZpZyBhcyBDYWxlbmRhclNwZWNpZmljQ29uZmlnKS5maXJzdERheU9mV2Vlayk7XHJcblx0XHRjb25zdCBoaWRlV2Vla2VuZHMgPSAodGhpcy5vdmVycmlkZUNvbmZpZz8uaGlkZVdlZWtlbmRzID8/ICh2aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnIGFzIENhbGVuZGFyU3BlY2lmaWNDb25maWcpPy5oaWRlV2Vla2VuZHMpID8/IGZhbHNlO1xyXG5cclxuXHRcdC8vIEFkZCBoaWRlLXdlZWtlbmRzIGNsYXNzIGlmIHdlZWtlbmQgaGlkaW5nIGlzIGVuYWJsZWRcclxuXHRcdGlmIChoaWRlV2Vla2VuZHMpIHtcclxuXHRcdFx0dGhpcy5jb250YWluZXJFbC5hZGRDbGFzcyhcImhpZGUtd2Vla2VuZHNcIik7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLmNvbnRhaW5lckVsLnJlbW92ZUNsYXNzKFwiaGlkZS13ZWVrZW5kc1wiKTtcclxuXHRcdH1cclxuXHRcdC8vIERlZmF1bHQgdG8gU3VuZGF5ICgwKSBpZiB0aGUgc2V0dGluZyBpcyB1bmRlZmluZWQsIGZvbGxvd2luZyAwPVN1biwgMT1Nb24sIC4uLiwgNj1TYXRcclxuXHRcdGNvbnN0IGVmZmVjdGl2ZUZpcnN0RGF5ID1cclxuXHRcdFx0Zmlyc3REYXlPZldlZWtTZXR0aW5nID09PSB1bmRlZmluZWQgPyAwIDogZmlyc3REYXlPZldlZWtTZXR0aW5nO1xyXG5cclxuXHRcdGNvbnNvbGUubG9nKFwiRWZmZWN0aXZlIGZpcnN0IGRheTpcIiwgZWZmZWN0aXZlRmlyc3REYXkpO1xyXG5cclxuXHRcdGNvbnN0IHRvdGFsUmVuZGVyU3RhcnRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7IC8vIFN0YXJ0IHRvdGFsIHJlbmRlciB0aW1lXHJcblxyXG5cdFx0Zm9yIChsZXQgbW9udGggPSAwOyBtb250aCA8IDEyOyBtb250aCsrKSB7XHJcblx0XHRcdGNvbnN0IG1vbnRoU3RhcnRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7IC8vIFN0YXJ0IHRpbWUgZm9yIHRoaXMgbW9udGhcclxuXHRcdFx0Y29uc3QgbW9udGhDb250YWluZXIgPSB5ZWFyR3JpZC5jcmVhdGVEaXYoXCJjYWxlbmRhci1taW5pLW1vbnRoXCIpO1xyXG5cdFx0XHRjb25zdCBtb250aE1vbWVudCA9IG1vbWVudCh7IHllYXI6IHllYXIsIG1vbnRoOiBtb250aCwgZGF5OiAxIH0pO1xyXG5cclxuXHRcdFx0Ly8gQWRkIG1vbnRoIGhlYWRlclxyXG5cdFx0XHRjb25zdCBtb250aEhlYWRlciA9IG1vbnRoQ29udGFpbmVyLmNyZWF0ZURpdihcIm1pbmktbW9udGgtaGVhZGVyXCIpO1xyXG5cdFx0XHRtb250aEhlYWRlci50ZXh0Q29udGVudCA9IG1vbnRoTW9tZW50LmZvcm1hdChcIk1NTU1cIik7IC8vIEZ1bGwgbW9udGggbmFtZVxyXG5cclxuXHRcdFx0Ly8gQWRkIGNsaWNrIGxpc3RlbmVyIHRvIG1vbnRoIGhlYWRlclxyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQobW9udGhIZWFkZXIsIFwiY2xpY2tcIiwgKGV2KSA9PiB7XHJcblx0XHRcdFx0Ly8gVHJpZ2dlciBjYWxsYmFjayBmcm9tIG9wdGlvbnMgaWYgaXQgZXhpc3RzXHJcblx0XHRcdFx0aWYgKHRoaXMub3B0aW9ucy5vbk1vbnRoQ2xpY2spIHtcclxuXHRcdFx0XHRcdHRoaXMub3B0aW9ucy5vbk1vbnRoQ2xpY2soZXYsIG1vbnRoTW9tZW50LnZhbHVlT2YoKSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KG1vbnRoSGVhZGVyLCBcIm1vdXNlZW50ZXJcIiwgKGV2KSA9PiB7XHJcblx0XHRcdFx0Ly8gVHJpZ2dlciBob3ZlciBjYWxsYmFjayBmcm9tIG9wdGlvbnMgaWYgaXQgZXhpc3RzXHJcblx0XHRcdFx0aWYgKHRoaXMub3B0aW9ucy5vbk1vbnRoSG92ZXIpIHtcclxuXHRcdFx0XHRcdHRoaXMub3B0aW9ucy5vbk1vbnRoSG92ZXIoZXYsIG1vbnRoTW9tZW50LnZhbHVlT2YoKSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdFx0bW9udGhIZWFkZXIuc3R5bGUuY3Vyc29yID0gXCJwb2ludGVyXCI7IC8vIEluZGljYXRlIGNsaWNrYWJsZVxyXG5cclxuXHRcdFx0Ly8gQWRkIGJvZHkgY29udGFpbmVyIGZvciB0aGUgbWluaS1jYWxlbmRhciBncmlkXHJcblx0XHRcdGNvbnN0IG1vbnRoQm9keSA9IG1vbnRoQ29udGFpbmVyLmNyZWF0ZURpdihcIm1pbmktbW9udGgtYm9keVwiKTtcclxuXHRcdFx0Y29uc3QgZGF5c1dpdGhFdmVudHMgPSB0aGlzLmNhbGN1bGF0ZURheXNXaXRoRXZlbnRzKFxyXG5cdFx0XHRcdG1vbnRoTW9tZW50LFxyXG5cdFx0XHRcdHllYXJFdmVudHMgLy8gUGFzcyBhbHJlYWR5IGZpbHRlcmVkIHllYXIgZXZlbnRzXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHR0aGlzLnJlbmRlck1pbmlNb250aEdyaWQoXHJcblx0XHRcdFx0bW9udGhCb2R5LFxyXG5cdFx0XHRcdG1vbnRoTW9tZW50LFxyXG5cdFx0XHRcdGRheXNXaXRoRXZlbnRzLFxyXG5cdFx0XHRcdGVmZmVjdGl2ZUZpcnN0RGF5LFxyXG5cdFx0XHRcdGhpZGVXZWVrZW5kc1xyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHRvdGFsUmVuZGVyRW5kVGltZSA9IHBlcmZvcm1hbmNlLm5vdygpOyAvLyBFbmQgdG90YWwgcmVuZGVyIHRpbWVcclxuXHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRgWWVhclZpZXc6IEZpbmlzaGVkIHJlbmRlcmluZyB5ZWFyICR7eWVhcn0gaW4gJHtcclxuXHRcdFx0XHR0b3RhbFJlbmRlckVuZFRpbWUgLSB0b3RhbFJlbmRlclN0YXJ0VGltZVxyXG5cdFx0XHR9bXMuIChGaXJzdCBkYXk6ICR7ZWZmZWN0aXZlRmlyc3REYXl9KWBcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvLyBIZWxwZXIgZnVuY3Rpb24gdG8gY2FsY3VsYXRlIHdoaWNoIGRheXMgaW4gYSBtb250aCBoYXZlIGV2ZW50c1xyXG5cdHByaXZhdGUgY2FsY3VsYXRlRGF5c1dpdGhFdmVudHMoXHJcblx0XHRtb250aE1vbWVudDogbW9tZW50Lk1vbWVudCxcclxuXHRcdHJlbGV2YW50RXZlbnRzOiBDYWxlbmRhckV2ZW50W10gLy8gVXNlIHRoZSBwcmUtZmlsdGVyZWQgZXZlbnRzXHJcblx0KTogU2V0PG51bWJlcj4ge1xyXG5cdFx0Y29uc3QgZGF5cyA9IG5ldyBTZXQ8bnVtYmVyPigpO1xyXG5cdFx0Y29uc3QgbW9udGhTdGFydCA9IG1vbnRoTW9tZW50LmNsb25lKCkuc3RhcnRPZihcIm1vbnRoXCIpO1xyXG5cdFx0Y29uc3QgbW9udGhFbmQgPSBtb250aE1vbWVudC5jbG9uZSgpLmVuZE9mKFwibW9udGhcIik7XHJcblxyXG5cdFx0cmVsZXZhbnRFdmVudHMuZm9yRWFjaCgoZXZlbnQpID0+IHtcclxuXHRcdFx0Ly8gQ2hlY2sgaWYgZXZlbnQgaGFzIGEgc3BlY2lmaWMgZGF0ZSAoc3RhcnQsIHNjaGVkdWxlZCwgb3IgZHVlKSB3aXRoaW4gdGhlIGN1cnJlbnQgbW9udGhcclxuXHRcdFx0Y29uc3QgZGF0ZXNUb0NoZWNrOiAoXHJcblx0XHRcdFx0fCBzdHJpbmdcclxuXHRcdFx0XHR8IG1vbWVudC5Nb21lbnRcclxuXHRcdFx0XHR8IERhdGVcclxuXHRcdFx0XHR8IG51bWJlclxyXG5cdFx0XHRcdHwgbnVsbFxyXG5cdFx0XHRcdHwgdW5kZWZpbmVkXHJcblx0XHRcdClbXSA9IFtcclxuXHRcdFx0XHRldmVudC5zdGFydCxcclxuXHRcdFx0XHRldmVudC5tZXRhZGF0YS5zY2hlZHVsZWREYXRlLCAvLyBBc3N1bWluZyAnc2NoZWR1bGVkJyBleGlzdHMgb24gQ2FsZW5kYXJFdmVudFxyXG5cdFx0XHRcdGV2ZW50Lm1ldGFkYXRhLmR1ZURhdGUsIC8vIEFzc3VtaW5nICdkdWUnIGV4aXN0cyBvbiBDYWxlbmRhckV2ZW50XHJcblx0XHRcdF07XHJcblxyXG5cdFx0XHRkYXRlc1RvQ2hlY2suZm9yRWFjaCgoZGF0ZUlucHV0KSA9PiB7XHJcblx0XHRcdFx0aWYgKGRhdGVJbnB1dCkge1xyXG5cdFx0XHRcdFx0Y29uc3QgZGF0ZU1vbWVudCA9IG1vbWVudChkYXRlSW5wdXQpO1xyXG5cdFx0XHRcdFx0Ly8gQ2hlY2sgaWYgdGhlIGRhdGUgZmFsbHMgd2l0aGluIHRoZSBjdXJyZW50IG1vbnRoXHJcblx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdGRhdGVNb21lbnQuaXNCZXR3ZWVuKG1vbnRoU3RhcnQsIG1vbnRoRW5kLCBcImRheVwiLCBcIltdXCIpXHJcblx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0Ly8gJ1tdJyBpbmNsdWRlcyBzdGFydCBhbmQgZW5kIGRheXNcclxuXHRcdFx0XHRcdFx0ZGF5cy5hZGQoZGF0ZU1vbWVudC5kYXRlKCkpOyAvLyBBZGQgdGhlIGRheSBudW1iZXIgKDEtMzEpXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBkYXlzO1xyXG5cdH1cclxuXHJcblx0Ly8gSGVscGVyIGZ1bmN0aW9uIHRvIHJlbmRlciB0aGUgbWluaS1ncmlkIGZvciBhIG1vbnRoXHJcblx0cHJpdmF0ZSByZW5kZXJNaW5pTW9udGhHcmlkKFxyXG5cdFx0Y29udGFpbmVyOiBIVE1MRWxlbWVudCxcclxuXHRcdG1vbnRoTW9tZW50OiBtb21lbnQuTW9tZW50LFxyXG5cdFx0ZGF5c1dpdGhFdmVudHM6IFNldDxudW1iZXI+LFxyXG5cdFx0ZWZmZWN0aXZlRmlyc3REYXk6IG51bWJlciwgLy8gUGFzcyB0aGUgZWZmZWN0aXZlIGZpcnN0IGRheVxyXG5cdFx0aGlkZVdlZWtlbmRzOiBib29sZWFuIC8vIFBhc3MgdGhlIHdlZWtlbmQgaGlkaW5nIHNldHRpbmdcclxuXHQpIHtcclxuXHRcdGNvbnRhaW5lci5lbXB0eSgpOyAvLyBDbGVhciBwbGFjZWhvbGRlclxyXG5cdFx0Y29udGFpbmVyLmFkZENsYXNzKFwibWluaS1tb250aC1ncmlkXCIpO1xyXG5cclxuXHRcdC8vIEFkZCBtaW5pIHdlZWtkYXkgaGVhZGVycyAob3B0aW9uYWwsIGJ1dCBoZWxwZnVsKSwgcm90YXRlZFxyXG5cdFx0Y29uc3QgaGVhZGVyUm93ID0gY29udGFpbmVyLmNyZWF0ZURpdihcIm1pbmktd2Vla2RheS1oZWFkZXJcIik7XHJcblx0XHRjb25zdCB3ZWVrZGF5cyA9IG1vbWVudC53ZWVrZGF5c01pbih0cnVlKTsgLy8gVXNlIG1pbmltYWwgbmFtZXMgbGlrZSBNbywgVHVcclxuXHRcdGNvbnN0IHJvdGF0ZWRXZWVrZGF5cyA9IFtcclxuXHRcdFx0Li4ud2Vla2RheXMuc2xpY2UoZWZmZWN0aXZlRmlyc3REYXkpLFxyXG5cdFx0XHQuLi53ZWVrZGF5cy5zbGljZSgwLCBlZmZlY3RpdmVGaXJzdERheSksXHJcblx0XHRdO1xyXG5cclxuXHRcdC8vIEZpbHRlciBvdXQgd2Vla2VuZHMgaWYgaGlkZVdlZWtlbmRzIGlzIGVuYWJsZWRcclxuXHRcdGNvbnN0IGZpbHRlcmVkV2Vla2RheXMgPSBoaWRlV2Vla2VuZHNcclxuXHRcdFx0PyByb3RhdGVkV2Vla2RheXMuZmlsdGVyKChfLCBpbmRleCkgPT4ge1xyXG5cdFx0XHRcdC8vIENhbGN1bGF0ZSB0aGUgYWN0dWFsIGRheSBvZiB3ZWVrIGZvciB0aGlzIGhlYWRlciBwb3NpdGlvblxyXG5cdFx0XHRcdGNvbnN0IGRheU9mV2VlayA9IChlZmZlY3RpdmVGaXJzdERheSArIGluZGV4KSAlIDc7XHJcblx0XHRcdFx0cmV0dXJuIGRheU9mV2VlayAhPT0gMCAmJiBkYXlPZldlZWsgIT09IDY7IC8vIEV4Y2x1ZGUgU3VuZGF5ICgwKSBhbmQgU2F0dXJkYXkgKDYpXHJcblx0XHRcdH0pXHJcblx0XHRcdDogcm90YXRlZFdlZWtkYXlzO1xyXG5cclxuXHRcdGZpbHRlcmVkV2Vla2RheXMuZm9yRWFjaCgoZGF5KSA9PiB7XHJcblx0XHRcdGhlYWRlclJvdy5jcmVhdGVEaXYoXCJtaW5pLXdlZWtkYXlcIikudGV4dENvbnRlbnQgPSBkYXk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDYWxjdWxhdGUgZ3JpZCBib3VuZGFyaWVzIHVzaW5nIGVmZmVjdGl2ZSBmaXJzdCBkYXlcclxuXHRcdGNvbnN0IG1vbnRoU3RhcnQgPSBtb250aE1vbWVudC5jbG9uZSgpLnN0YXJ0T2YoXCJtb250aFwiKTtcclxuXHRcdGNvbnN0IG1vbnRoRW5kID0gbW9udGhNb21lbnQuY2xvbmUoKS5lbmRPZihcIm1vbnRoXCIpO1xyXG5cclxuXHRcdGxldCBncmlkU3RhcnQ6IG1vbWVudC5Nb21lbnQ7XHJcblx0XHRsZXQgZ3JpZEVuZDogbW9tZW50Lk1vbWVudDtcclxuXHJcblx0XHRpZiAoaGlkZVdlZWtlbmRzKSB7XHJcblx0XHRcdC8vIFdoZW4gd2Vla2VuZHMgYXJlIGhpZGRlbiwgYWRqdXN0IGdyaWQgdG8gc3RhcnQgYW5kIGVuZCBvbiB3b3JrIGRheXNcclxuXHRcdFx0Ly8gRmluZCB0aGUgZmlyc3Qgd29yayBkYXkgb2YgdGhlIHdlZWsgY29udGFpbmluZyB0aGUgc3RhcnQgb2YgbW9udGhcclxuXHRcdFx0Z3JpZFN0YXJ0ID0gbW9udGhTdGFydC5jbG9uZSgpO1xyXG5cdFx0XHRjb25zdCBkYXlzVG9TdWJ0cmFjdFN0YXJ0ID0gKG1vbnRoU3RhcnQud2Vla2RheSgpIC0gZWZmZWN0aXZlRmlyc3REYXkgKyA3KSAlIDc7XHJcblx0XHRcdGdyaWRTdGFydC5zdWJ0cmFjdChkYXlzVG9TdWJ0cmFjdFN0YXJ0LCBcImRheXNcIik7XHJcblxyXG5cdFx0XHQvLyBFbnN1cmUgZ3JpZFN0YXJ0IGlzIG5vdCBhIHdlZWtlbmRcclxuXHRcdFx0d2hpbGUgKGdyaWRTdGFydC5kYXkoKSA9PT0gMCB8fCBncmlkU3RhcnQuZGF5KCkgPT09IDYpIHtcclxuXHRcdFx0XHRncmlkU3RhcnQuYWRkKDEsIFwiZGF5XCIpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBGaW5kIHRoZSBsYXN0IHdvcmsgZGF5IG9mIHRoZSB3ZWVrIGNvbnRhaW5pbmcgdGhlIGVuZCBvZiBtb250aFxyXG5cdFx0XHRncmlkRW5kID0gbW9udGhFbmQuY2xvbmUoKTtcclxuXHRcdFx0Y29uc3QgZGF5c1RvQWRkRW5kID0gKGVmZmVjdGl2ZUZpcnN0RGF5ICsgNCAtIG1vbnRoRW5kLndlZWtkYXkoKSArIDcpICUgNzsgLy8gNCA9IEZyaWRheSBpbiB3b3JrIHdlZWtcclxuXHRcdFx0Z3JpZEVuZC5hZGQoZGF5c1RvQWRkRW5kLCBcImRheXNcIik7XHJcblxyXG5cdFx0XHQvLyBFbnN1cmUgZ3JpZEVuZCBpcyBub3QgYSB3ZWVrZW5kXHJcblx0XHRcdHdoaWxlIChncmlkRW5kLmRheSgpID09PSAwIHx8IGdyaWRFbmQuZGF5KCkgPT09IDYpIHtcclxuXHRcdFx0XHRncmlkRW5kLnN1YnRyYWN0KDEsIFwiZGF5XCIpO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBPcmlnaW5hbCBsb2dpYyBmb3Igd2hlbiB3ZWVrZW5kcyBhcmUgc2hvd25cclxuXHRcdFx0Y29uc3QgZGF5c1RvU3VidHJhY3RTdGFydCA9IChtb250aFN0YXJ0LndlZWtkYXkoKSAtIGVmZmVjdGl2ZUZpcnN0RGF5ICsgNykgJSA3O1xyXG5cdFx0XHRncmlkU3RhcnQgPSBtb250aFN0YXJ0LmNsb25lKCkuc3VidHJhY3QoZGF5c1RvU3VidHJhY3RTdGFydCwgXCJkYXlzXCIpO1xyXG5cclxuXHRcdFx0Y29uc3QgZGF5c1RvQWRkRW5kID0gKGVmZmVjdGl2ZUZpcnN0RGF5ICsgNiAtIG1vbnRoRW5kLndlZWtkYXkoKSArIDcpICUgNztcclxuXHRcdFx0Z3JpZEVuZCA9IG1vbnRoRW5kLmNsb25lKCkuYWRkKGRheXNUb0FkZEVuZCwgXCJkYXlzXCIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGxldCBjdXJyZW50RGF5SXRlciA9IGdyaWRTdGFydC5jbG9uZSgpO1xyXG5cdFx0d2hpbGUgKGN1cnJlbnREYXlJdGVyLmlzU2FtZU9yQmVmb3JlKGdyaWRFbmQsIFwiZGF5XCIpKSB7XHJcblx0XHRcdGNvbnN0IGlzV2Vla2VuZCA9IGN1cnJlbnREYXlJdGVyLmRheSgpID09PSAwIHx8IGN1cnJlbnREYXlJdGVyLmRheSgpID09PSA2OyAvLyBTdW5kYXkgb3IgU2F0dXJkYXlcclxuXHJcblx0XHRcdC8vIFNraXAgd2Vla2VuZCBkYXlzIGlmIGhpZGVXZWVrZW5kcyBpcyBlbmFibGVkXHJcblx0XHRcdGlmIChoaWRlV2Vla2VuZHMgJiYgaXNXZWVrZW5kKSB7XHJcblx0XHRcdFx0Y3VycmVudERheUl0ZXIuYWRkKDEsIFwiZGF5XCIpO1xyXG5cdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBjZWxsID0gY29udGFpbmVyLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0XHRjbHM6IFwibWluaS1kYXktY2VsbFwiLFxyXG5cdFx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHRcdFwiZGF0YS1kYXRlXCI6IGN1cnJlbnREYXlJdGVyLmZvcm1hdChcIllZWVktTU0tRERcIiksXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdGNvbnN0IGRheU51bWJlciA9IGN1cnJlbnREYXlJdGVyLmRhdGUoKTtcclxuXHRcdFx0Ly8gT25seSBzaG93IGRheSBudW1iZXIgaWYgaXQncyBpbiB0aGUgY3VycmVudCBtb250aFxyXG5cdFx0XHRpZiAoY3VycmVudERheUl0ZXIuaXNTYW1lKG1vbnRoTW9tZW50LCBcIm1vbnRoXCIpKSB7XHJcblx0XHRcdFx0Y2VsbC50ZXh0Q29udGVudCA9IFN0cmluZyhkYXlOdW1iZXIpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGNlbGwuYWRkQ2xhc3MoXCJpcy1vdGhlci1tb250aFwiKTtcclxuXHRcdFx0XHRjZWxsLnRleHRDb250ZW50ID0gU3RyaW5nKGRheU51bWJlcik7IC8vIFN0aWxsIHNob3cgbnVtYmVyIGJ1dCBkaW1tZWRcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKGN1cnJlbnREYXlJdGVyLmlzU2FtZShtb21lbnQoKSwgXCJkYXlcIikpIHtcclxuXHRcdFx0XHRjZWxsLmFkZENsYXNzKFwiaXMtdG9kYXlcIik7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdGN1cnJlbnREYXlJdGVyLmlzU2FtZShtb250aE1vbWVudCwgXCJtb250aFwiKSAmJlxyXG5cdFx0XHRcdGRheXNXaXRoRXZlbnRzLmhhcyhkYXlOdW1iZXIpXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdGNlbGwuYWRkQ2xhc3MoXCJoYXMtZXZlbnRzXCIpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBBZGQgY2xpY2sgbGlzdGVuZXIgdG8gZGF5IGNlbGwgb25seSBmb3IgZGF5cyBpbiB0aGUgY3VycmVudCBtb250aFxyXG5cdFx0XHRpZiAoY3VycmVudERheUl0ZXIuaXNTYW1lKG1vbnRoTW9tZW50LCBcIm1vbnRoXCIpKSB7XHJcblx0XHRcdFx0Y2VsbC5zdHlsZS5jdXJzb3IgPSBcInBvaW50ZXJcIjsgLy8gSW5kaWNhdGUgY2xpY2thYmxlXHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gT3B0aW9uYWxseSBkaXNhYmxlIGNsaWNrcyBvciBwcm92aWRlIGRpZmZlcmVudCBiZWhhdmlvciBmb3Igb3RoZXIgbW9udGggZGF5c1xyXG5cdFx0XHRcdGNlbGwuc3R5bGUuY3Vyc29yID0gXCJkZWZhdWx0XCI7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGN1cnJlbnREYXlJdGVyLmFkZCgxLCBcImRheVwiKTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoY29udGFpbmVyLCBcImNsaWNrXCIsIChldikgPT4ge1xyXG5cdFx0XHRjb25zdCB0YXJnZXQgPSBldi50YXJnZXQgYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRcdGlmICh0YXJnZXQuY2xvc2VzdChcIi5taW5pLWRheS1jZWxsXCIpKSB7XHJcblx0XHRcdFx0Y29uc3QgZGF0ZVN0ciA9IHRhcmdldFxyXG5cdFx0XHRcdFx0LmNsb3Nlc3QoXCIubWluaS1kYXktY2VsbFwiKVxyXG5cdFx0XHRcdFx0Py5nZXRBdHRyaWJ1dGUoXCJkYXRhLWRhdGVcIik7XHJcblx0XHRcdFx0aWYgKHRoaXMub3B0aW9ucy5vbkRheUNsaWNrKSB7XHJcblx0XHRcdFx0XHR0aGlzLm9wdGlvbnMub25EYXlDbGljayhldiwgbW9tZW50KGRhdGVTdHIpLnZhbHVlT2YoKSwge1xyXG5cdFx0XHRcdFx0XHRiZWhhdmlvcjogXCJvcGVuLXRhc2stdmlld1wiLFxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoY29udGFpbmVyLCBcIm1vdXNlb3ZlclwiLCAoZXYpID0+IHtcclxuXHRcdFx0dGhpcy5kZWJvdW5jZUhvdmVyKGV2KTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gVXBkYXRlIG1ldGhvZHMgdG8gYWxsb3cgY2hhbmdpbmcgZGF0YSBhZnRlciBpbml0aWFsIHJlbmRlclxyXG5cdHVwZGF0ZUV2ZW50cyhldmVudHM6IENhbGVuZGFyRXZlbnRbXSk6IHZvaWQge1xyXG5cdFx0dGhpcy5ldmVudHMgPSBldmVudHM7XHJcblx0XHR0aGlzLnJlbmRlcigpOyAvLyBSZS1yZW5kZXIgd2lsbCBwaWNrIHVwIGN1cnJlbnQgc2V0dGluZ3NcclxuXHR9XHJcblxyXG5cdHVwZGF0ZUN1cnJlbnREYXRlKGRhdGU6IG1vbWVudC5Nb21lbnQpOiB2b2lkIHtcclxuXHRcdHRoaXMuY3VycmVudERhdGUgPSBkYXRlO1xyXG5cdFx0dGhpcy5yZW5kZXIoKTsgLy8gUmUtcmVuZGVyIHdpbGwgcGljayB1cCBjdXJyZW50IHNldHRpbmdzIGFuZCBkYXRlXHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGRlYm91bmNlSG92ZXIgPSBkZWJvdW5jZSgoZXY6IE1vdXNlRXZlbnQpID0+IHtcclxuXHRcdGNvbnN0IHRhcmdldCA9IGV2LnRhcmdldCBhcyBIVE1MRWxlbWVudDtcclxuXHRcdGlmICh0YXJnZXQuY2xvc2VzdChcIi5taW5pLWRheS1jZWxsXCIpKSB7XHJcblx0XHRcdGNvbnN0IGRhdGVTdHIgPSB0YXJnZXRcclxuXHRcdFx0XHQuY2xvc2VzdChcIi5taW5pLWRheS1jZWxsXCIpXHJcblx0XHRcdFx0Py5nZXRBdHRyaWJ1dGUoXCJkYXRhLWRhdGVcIik7XHJcblx0XHRcdGlmICh0aGlzLm9wdGlvbnMub25EYXlIb3Zlcikge1xyXG5cdFx0XHRcdHRoaXMub3B0aW9ucy5vbkRheUhvdmVyKGV2LCBtb21lbnQoZGF0ZVN0cikudmFsdWVPZigpKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0sIDIwMCk7XHJcbn1cclxuIl19