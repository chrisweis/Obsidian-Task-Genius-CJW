import { moment } from "obsidian";
import { renderCalendarEvent } from "../rendering/event-renderer";
import { CalendarViewComponent } from "./base-view";
export class DayView extends CalendarViewComponent {
    constructor(app, plugin, containerEl, currentDate, events, options = {}) {
        super(plugin, app, containerEl, events, options);
        this.app = app;
        this.plugin = plugin;
        this.currentDate = currentDate;
    }
    render() {
        this.containerEl.empty();
        this.containerEl.addClass("view-day");
        // 1. Filter events for the current day
        const todayStart = this.currentDate.clone().startOf("day");
        const todayEnd = this.currentDate.clone().endOf("day");
        const dayEvents = this.events
            .filter((event) => {
            // Check if event occurs today (handles multi-day)
            const eventStart = moment(event.start);
            // Treat events without end date as starting today if they start before today ends
            const eventEnd = event.end
                ? moment(event.end)
                : eventStart.clone().endOf("day"); // Assume end of day if no end time
            // Event overlaps if its start is before today ends AND its end is after today starts
            return (eventStart.isBefore(todayEnd) &&
                eventEnd.isAfter(todayStart));
        })
            .sort((a, b) => {
            // Sort events by ID
            if (a.id < b.id)
                return -1;
            if (a.id > b.id)
                return 1;
            return 0;
        });
        // 2. Render Timeline Section (Combined List)
        const timelineSection = this.containerEl.createDiv("calendar-timeline-section" // Keep this class for general styling? Or rename?
        );
        const timelineEventsContainer = timelineSection.createDiv("calendar-timeline-events-container" // Renamed? maybe calendar-day-events-list
        );
        // 3. Render events in a simple list
        if (dayEvents.length === 0) {
            timelineEventsContainer.addClass("is-empty");
            timelineEventsContainer.setText("(No events for this day)");
        }
        else {
            dayEvents.forEach((event) => {
                // Remove layout finding logic
                /*
                const layout = eventLayouts.find((l) => l.id === event.id);
                if (!layout) {
                    console.warn("Layout not found for event:", event);
                    // Optionally render it somewhere as a fallback?
                    return;
                }
                */
                // Use the renderer, adjust viewType if needed, remove layout
                const { eventEl, component } = renderCalendarEvent({
                    event: event,
                    // Use a generic type or reuse 'timed' but styles will handle layout
                    viewType: "day-timed",
                    // layout: layout, // Removed layout
                    app: this.app,
                    onEventClick: this.options.onEventClick,
                    onEventHover: this.options.onEventHover,
                    onEventContextMenu: this.options.onEventContextMenu,
                    onEventComplete: this.options.onEventComplete,
                });
                this.addChild(component);
                timelineEventsContainer.appendChild(eventEl); // Append directly to the container
                // Add event listeners using the options from the base class
                if (this.options.onEventClick) {
                    this.registerDomEvent(eventEl, "click", (ev) => {
                        this.options.onEventClick(ev, event);
                    });
                }
                if (this.options.onEventHover) {
                    this.registerDomEvent(eventEl, "mouseenter", (ev) => {
                        this.options.onEventHover(ev, event);
                    });
                    // Optionally add mouseleave if needed
                }
            });
        }
    }
    // Update methods to allow changing data after initial render
    updateEvents(events) {
        this.events = events;
        this.render();
    }
    updateCurrentDate(date) {
        this.currentDate = date;
        this.render();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF5LXZpZXcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkYXktdmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQWtCLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUVsRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRSxPQUFPLEVBQUUscUJBQXFCLEVBQXVCLE1BQU0sYUFBYSxDQUFDO0FBR3pFLE1BQU0sT0FBTyxPQUFRLFNBQVEscUJBQXFCO0lBS2pELFlBQ0MsR0FBUSxFQUNSLE1BQTZCLEVBQzdCLFdBQXdCLEVBQ3hCLFdBQTBCLEVBQzFCLE1BQXVCLEVBQ3ZCLFVBQStCLEVBQUU7UUFFakMsS0FBSyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNqRCxJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztRQUNmLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO0lBQ2hDLENBQUM7SUFFRCxNQUFNO1FBQ0wsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN6QixJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUV0Qyx1Q0FBdUM7UUFDdkMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDM0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFdkQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU07YUFDM0IsTUFBTSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDakIsa0RBQWtEO1lBQ2xELE1B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LEVBQUUsS0FBSyxDQUFDLENBQUM7b0JBQ3ZDLENBQUMsQ0FBQyxDQUFDO29CQUNILHNDQUFzQztpQkFDdEM7WUFDRixDQUFDLENBQUMsQ0FBQztTQUNIO0lBQ0YsQ0FBQztJQUVELDZEQUE2RDtJQUM3RCxZQUFZLENBQUMsTUFBdUI7UUFDbkMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ2YsQ0FBQztJQUVELGlCQUFpQixDQUFDLElBQW1CO1FBQ3BDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBQ3hCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNmLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcCwgQ29tcG9uZW50LCBtb21lbnQgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgQ2FsZW5kYXJFdmVudCB9IGZyb20gJ0AvY29tcG9uZW50cy9mZWF0dXJlcy9jYWxlbmRhci9pbmRleCc7XHJcbmltcG9ydCB7IHJlbmRlckNhbGVuZGFyRXZlbnQgfSBmcm9tIFwiLi4vcmVuZGVyaW5nL2V2ZW50LXJlbmRlcmVyXCI7XHJcbmltcG9ydCB7IENhbGVuZGFyVmlld0NvbXBvbmVudCwgQ2FsZW5kYXJWaWV3T3B0aW9ucyB9IGZyb20gXCIuL2Jhc2Utdmlld1wiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcblxyXG5leHBvcnQgY2xhc3MgRGF5VmlldyBleHRlbmRzIENhbGVuZGFyVmlld0NvbXBvbmVudCB7XHJcblx0cHJpdmF0ZSBjdXJyZW50RGF0ZTogbW9tZW50Lk1vbWVudDtcclxuXHRwcml2YXRlIGFwcDogQXBwO1xyXG5cdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0YXBwOiBBcHAsXHJcblx0XHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCxcclxuXHRcdGN1cnJlbnREYXRlOiBtb21lbnQuTW9tZW50LFxyXG5cdFx0ZXZlbnRzOiBDYWxlbmRhckV2ZW50W10sXHJcblx0XHRvcHRpb25zOiBDYWxlbmRhclZpZXdPcHRpb25zID0ge31cclxuXHQpIHtcclxuXHRcdHN1cGVyKHBsdWdpbiwgYXBwLCBjb250YWluZXJFbCwgZXZlbnRzLCBvcHRpb25zKTtcclxuXHRcdHRoaXMuYXBwID0gYXBwO1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0XHR0aGlzLmN1cnJlbnREYXRlID0gY3VycmVudERhdGU7XHJcblx0fVxyXG5cclxuXHRyZW5kZXIoKTogdm9pZCB7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLmVtcHR5KCk7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLmFkZENsYXNzKFwidmlldy1kYXlcIik7XHJcblxyXG5cdFx0Ly8gMS4gRmlsdGVyIGV2ZW50cyBmb3IgdGhlIGN1cnJlbnQgZGF5XHJcblx0XHRjb25zdCB0b2RheVN0YXJ0ID0gdGhpcy5jdXJyZW50RGF0ZS5jbG9uZSgpLnN0YXJ0T2YoXCJkYXlcIik7XHJcblx0XHRjb25zdCB0b2RheUVuZCA9IHRoaXMuY3VycmVudERhdGUuY2xvbmUoKS5lbmRPZihcImRheVwiKTtcclxuXHJcblx0XHRjb25zdCBkYXlFdmVudHMgPSB0aGlzLmV2ZW50c1xyXG5cdFx0XHQuZmlsdGVyKChldmVudCkgPT4ge1xyXG5cdFx0XHRcdC8vIENoZWNrIGlmIGV2ZW50IG9jY3VycyB0b2RheSAoaGFuZGxlcyBtdWx0aS1kYXkpXHJcblx0XHRcdFx0Y29uc3QgZXZlbnRTdGFydCA9IG1vbWVudChldmVudC5zdGFydCk7XHJcblx0XHRcdFx0Ly8gVHJlYXQgZXZlbnRzIHdpdGhvdXQgZW5kIGRhdGUgYXMgc3RhcnRpbmcgdG9kYXkgaWYgdGhleSBzdGFydCBiZWZvcmUgdG9kYXkgZW5kc1xyXG5cdFx0XHRcdGNvbnN0IGV2ZW50RW5kID0gZXZlbnQuZW5kXHJcblx0XHRcdFx0XHQ/IG1vbWVudChldmVudC5lbmQpXHJcblx0XHRcdFx0XHQ6IGV2ZW50U3RhcnQuY2xvbmUoKS5lbmRPZihcImRheVwiKTsgLy8gQXNzdW1lIGVuZCBvZiBkYXkgaWYgbm8gZW5kIHRpbWVcclxuXHRcdFx0XHQvLyBFdmVudCBvdmVybGFwcyBpZiBpdHMgc3RhcnQgaXMgYmVmb3JlIHRvZGF5IGVuZHMgQU5EIGl0cyBlbmQgaXMgYWZ0ZXIgdG9kYXkgc3RhcnRzXHJcblx0XHRcdFx0cmV0dXJuIChcclxuXHRcdFx0XHRcdGV2ZW50U3RhcnQuaXNCZWZvcmUodG9kYXlFbmQpICYmXHJcblx0XHRcdFx0XHRldmVudEVuZC5pc0FmdGVyKHRvZGF5U3RhcnQpXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fSlcclxuXHRcdFx0LnNvcnQoKGEsIGIpID0+IHtcclxuXHRcdFx0XHQvLyBTb3J0IGV2ZW50cyBieSBJRFxyXG5cdFx0XHRcdGlmIChhLmlkIDwgYi5pZCkgcmV0dXJuIC0xO1xyXG5cdFx0XHRcdGlmIChhLmlkID4gYi5pZCkgcmV0dXJuIDE7XHJcblx0XHRcdFx0cmV0dXJuIDA7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdC8vIDIuIFJlbmRlciBUaW1lbGluZSBTZWN0aW9uIChDb21iaW5lZCBMaXN0KVxyXG5cdFx0Y29uc3QgdGltZWxpbmVTZWN0aW9uID0gdGhpcy5jb250YWluZXJFbC5jcmVhdGVEaXYoXHJcblx0XHRcdFwiY2FsZW5kYXItdGltZWxpbmUtc2VjdGlvblwiIC8vIEtlZXAgdGhpcyBjbGFzcyBmb3IgZ2VuZXJhbCBzdHlsaW5nPyBPciByZW5hbWU/XHJcblx0XHQpO1xyXG5cdFx0Y29uc3QgdGltZWxpbmVFdmVudHNDb250YWluZXIgPSB0aW1lbGluZVNlY3Rpb24uY3JlYXRlRGl2KFxyXG5cdFx0XHRcImNhbGVuZGFyLXRpbWVsaW5lLWV2ZW50cy1jb250YWluZXJcIiAvLyBSZW5hbWVkPyBtYXliZSBjYWxlbmRhci1kYXktZXZlbnRzLWxpc3RcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gMy4gUmVuZGVyIGV2ZW50cyBpbiBhIHNpbXBsZSBsaXN0XHJcblx0XHRpZiAoZGF5RXZlbnRzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHR0aW1lbGluZUV2ZW50c0NvbnRhaW5lci5hZGRDbGFzcyhcImlzLWVtcHR5XCIpO1xyXG5cdFx0XHR0aW1lbGluZUV2ZW50c0NvbnRhaW5lci5zZXRUZXh0KFwiKE5vIGV2ZW50cyBmb3IgdGhpcyBkYXkpXCIpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0ZGF5RXZlbnRzLmZvckVhY2goKGV2ZW50KSA9PiB7XHJcblx0XHRcdFx0Ly8gUmVtb3ZlIGxheW91dCBmaW5kaW5nIGxvZ2ljXHJcblx0XHRcdFx0LypcclxuXHRcdFx0XHRjb25zdCBsYXlvdXQgPSBldmVudExheW91dHMuZmluZCgobCkgPT4gbC5pZCA9PT0gZXZlbnQuaWQpO1xyXG5cdFx0XHRcdGlmICghbGF5b3V0KSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLndhcm4oXCJMYXlvdXQgbm90IGZvdW5kIGZvciBldmVudDpcIiwgZXZlbnQpO1xyXG5cdFx0XHRcdFx0Ly8gT3B0aW9uYWxseSByZW5kZXIgaXQgc29tZXdoZXJlIGFzIGEgZmFsbGJhY2s/XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdCovXHJcblxyXG5cdFx0XHRcdC8vIFVzZSB0aGUgcmVuZGVyZXIsIGFkanVzdCB2aWV3VHlwZSBpZiBuZWVkZWQsIHJlbW92ZSBsYXlvdXRcclxuXHRcdFx0XHRjb25zdCB7IGV2ZW50RWwsIGNvbXBvbmVudCB9ID0gcmVuZGVyQ2FsZW5kYXJFdmVudCh7XHJcblx0XHRcdFx0XHRldmVudDogZXZlbnQsXHJcblx0XHRcdFx0XHQvLyBVc2UgYSBnZW5lcmljIHR5cGUgb3IgcmV1c2UgJ3RpbWVkJyBidXQgc3R5bGVzIHdpbGwgaGFuZGxlIGxheW91dFxyXG5cdFx0XHRcdFx0dmlld1R5cGU6IFwiZGF5LXRpbWVkXCIsIC8vIENoYW5nZWQgYmFjayB0byBkYXktdGltZWQsIENTUyB3aWxsIGhhbmRsZSBsYXlvdXRcclxuXHRcdFx0XHRcdC8vIGxheW91dDogbGF5b3V0LCAvLyBSZW1vdmVkIGxheW91dFxyXG5cdFx0XHRcdFx0YXBwOiB0aGlzLmFwcCxcclxuXHRcdFx0XHRcdG9uRXZlbnRDbGljazogdGhpcy5vcHRpb25zLm9uRXZlbnRDbGljayxcclxuXHRcdFx0XHRcdG9uRXZlbnRIb3ZlcjogdGhpcy5vcHRpb25zLm9uRXZlbnRIb3ZlcixcclxuXHRcdFx0XHRcdG9uRXZlbnRDb250ZXh0TWVudTogdGhpcy5vcHRpb25zLm9uRXZlbnRDb250ZXh0TWVudSxcclxuXHRcdFx0XHRcdG9uRXZlbnRDb21wbGV0ZTogdGhpcy5vcHRpb25zLm9uRXZlbnRDb21wbGV0ZSxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHR0aGlzLmFkZENoaWxkKGNvbXBvbmVudCk7XHJcblx0XHRcdFx0dGltZWxpbmVFdmVudHNDb250YWluZXIuYXBwZW5kQ2hpbGQoZXZlbnRFbCk7IC8vIEFwcGVuZCBkaXJlY3RseSB0byB0aGUgY29udGFpbmVyXHJcblxyXG5cdFx0XHRcdC8vIEFkZCBldmVudCBsaXN0ZW5lcnMgdXNpbmcgdGhlIG9wdGlvbnMgZnJvbSB0aGUgYmFzZSBjbGFzc1xyXG5cdFx0XHRcdGlmICh0aGlzLm9wdGlvbnMub25FdmVudENsaWNrKSB7XHJcblx0XHRcdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZXZlbnRFbCwgXCJjbGlja1wiLCAoZXYpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5vcHRpb25zLm9uRXZlbnRDbGljayEoZXYsIGV2ZW50KTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZiAodGhpcy5vcHRpb25zLm9uRXZlbnRIb3Zlcikge1xyXG5cdFx0XHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGV2ZW50RWwsIFwibW91c2VlbnRlclwiLCAoZXYpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5vcHRpb25zLm9uRXZlbnRIb3ZlciEoZXYsIGV2ZW50KTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0Ly8gT3B0aW9uYWxseSBhZGQgbW91c2VsZWF2ZSBpZiBuZWVkZWRcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gVXBkYXRlIG1ldGhvZHMgdG8gYWxsb3cgY2hhbmdpbmcgZGF0YSBhZnRlciBpbml0aWFsIHJlbmRlclxyXG5cdHVwZGF0ZUV2ZW50cyhldmVudHM6IENhbGVuZGFyRXZlbnRbXSk6IHZvaWQge1xyXG5cdFx0dGhpcy5ldmVudHMgPSBldmVudHM7XHJcblx0XHR0aGlzLnJlbmRlcigpO1xyXG5cdH1cclxuXHJcblx0dXBkYXRlQ3VycmVudERhdGUoZGF0ZTogbW9tZW50Lk1vbWVudCk6IHZvaWQge1xyXG5cdFx0dGhpcy5jdXJyZW50RGF0ZSA9IGRhdGU7XHJcblx0XHR0aGlzLnJlbmRlcigpO1xyXG5cdH1cclxufVxyXG4iXX0=