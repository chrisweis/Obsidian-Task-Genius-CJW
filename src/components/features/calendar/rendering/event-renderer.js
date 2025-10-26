import { Component, debounce, moment } from "obsidian";
import { determineEventColor } from "../algorithm"; // Adjust path as needed
import { clearAllMarks, MarkdownRendererComponent, } from "@/components/ui/renderers/MarkdownRenderer";
import { createTaskCheckbox } from "@/components/features/task/view/details";
/**
 * Calendar Event Component that handles rendering and lifecycle of a single event
 */
export class CalendarEventComponent extends Component {
    constructor(params) {
        super();
        this.params = params;
        this.debounceHover = debounce((ev, event) => {
            var _a, _b;
            (_b = (_a = this.params) === null || _a === void 0 ? void 0 : _a.onEventHover) === null || _b === void 0 ? void 0 : _b.call(_a, ev, event);
        }, 400);
        this.event = params.event;
        this.viewType = params.viewType;
        this.layout = params.layout;
        this.positioningHints = params.positioningHints;
        this.app = params.app;
        // Create the main element
        this.eventEl = createEl("div", {
            cls: ["calendar-event", `calendar-event-${this.viewType}`],
        });
        if (this.event.metadata.project) {
            this.eventEl.dataset.projectId = this.event.metadata.project;
        }
        if (this.event.metadata.priority) {
            this.eventEl.dataset.priority =
                this.event.metadata.priority.toString();
        }
        if (this.event.status) {
            this.eventEl.dataset.taskStatus = this.event.status;
        }
        if (this.event.filePath) {
            this.eventEl.dataset.filePath = this.event.filePath;
        }
        this.eventEl.dataset.eventId = this.event.id;
    }
    onload() {
        super.onload();
        // --- Common Styling & Attributes ---
        this.applyStyles();
        this.setTooltip();
        // --- View-Specific Rendering ---
        this.renderByViewType();
        // --- Common Click Handler ---
        this.registerEventListeners();
    }
    /**
     * Apply common styles and classes based on event properties
     */
    applyStyles() {
        const color = determineEventColor(this.event);
        if (color) {
            this.eventEl.style.backgroundColor = color;
            if (color === "grey") {
                this.eventEl.addClass("is-completed");
                // Apply line-through directly if not handled by CSS is-completed
                // this.eventEl.style.textDecoration = 'line-through';
            }
            else {
                // TODO: Add contrast check for text color if needed
            }
        }
        else if (this.event.completed) {
            // Fallback if no color but completed
            this.eventEl.addClass("is-completed");
        }
    }
    /**
     * Set tooltip information for the event
     */
    setTooltip() {
        this.eventEl.setAttr("title", `${clearAllMarks(this.event.title) || "(No title)"}\nStatus: ${this.event.status}${this.event.metadata.dueDate
            ? `\nDue: ${moment(this.event.metadata.dueDate).format("YYYY-MM-DD")}`
            : ""}${this.event.metadata.startDate
            ? `\nStart: ${moment(this.event.metadata.startDate).format("YYYY-MM-DD")}`
            : ""}`);
    }
    /**
     * Render event content based on view type
     */
    renderByViewType() {
        if (this.viewType === "month" ||
            this.viewType === "week-allday" ||
            this.viewType === "day-allday") {
            this.renderAllDayEvent();
        }
        else if (this.viewType === "day-timed" ||
            this.viewType === "week-timed") {
            this.renderTimedEvent();
        }
        else if (this.viewType === "agenda") {
            this.renderAgendaEvent();
        }
    }
    /**
     * Render all-day or month view events
     */
    renderAllDayEvent() {
        var _a;
        this.eventEl.addClass("calendar-event-allday");
        const checkbox = createTaskCheckbox(this.event.status, this.event, this.eventEl);
        this.registerDomEvent(checkbox, "click", (ev) => {
            var _a;
            ev.stopPropagation();
            if ((_a = this.params) === null || _a === void 0 ? void 0 : _a.onEventComplete) {
                this.params.onEventComplete(ev, this.event);
            }
            if (this.event.status === " ") {
                checkbox.checked = true;
                checkbox.dataset.task = "x";
            }
        });
        // Create a container for the title to render markdown into
        const titleContainer = this.eventEl.createDiv({
            cls: "calendar-event-title-container",
        });
        this.markdownRenderer = new MarkdownRendererComponent(this.app, titleContainer, this.event.filePath);
        this.addChild(this.markdownRenderer);
        this.markdownRenderer.render(this.event.title);
        if ((_a = this.positioningHints) === null || _a === void 0 ? void 0 : _a.isMultiDay) {
            this.eventEl.addClass("is-multi-day");
            if (this.positioningHints.isStart)
                this.eventEl.addClass("is-start");
            if (this.positioningHints.isEnd)
                this.eventEl.addClass("is-end");
        }
    }
    /**
     * Render timed events for day or week views
     */
    renderTimedEvent() {
        this.eventEl.toggleClass(["calendar-event-timed", "calendar-event"], true);
        if (this.viewType === "week-timed") {
            this.eventEl.addClass("calendar-event-timed-week");
        }
        if (this.layout) {
            // Apply absolute positioning from layout ONLY for week-timed view
            if (this.viewType === "week-timed") {
                this.eventEl.style.position = "absolute";
                this.eventEl.style.top = `${this.layout.top}px`;
                this.eventEl.style.left = `${this.layout.left}%`;
                this.eventEl.style.width = `${this.layout.width}%`;
                this.eventEl.style.height = `${this.layout.height}px`;
                this.eventEl.style.zIndex = String(this.layout.zIndex);
            }
            else {
                // For day-timed (now a list), use relative positioning (handled by CSS)
                this.eventEl.style.position = "relative"; // Ensure it's not absolute
                this.eventEl.style.width = "100%"; // Take full width in the list
            }
        }
        else if (this.viewType === "week-timed") {
            // Only warn if layout is missing for week-timed
            console.warn("Timed event render called without layout info for event:", this.event.id);
            // Provide some default fallback style
            this.eventEl.style.position = "relative"; // Avoid breaking layout completely
        }
        // Add separate time and title elements
        // Only show time for week-timed view, not day-timed
        if (this.event.start && this.viewType === "week-timed") {
            const eventTime = moment(this.event.start).format("h:mma");
            this.eventEl.createDiv({
                cls: "calendar-event-time",
                text: eventTime,
            });
        }
        const checkbox = createTaskCheckbox(this.event.status, this.event, this.eventEl);
        this.registerDomEvent(checkbox, "click", (ev) => {
            var _a;
            ev.stopPropagation();
            if ((_a = this.params) === null || _a === void 0 ? void 0 : _a.onEventComplete) {
                this.params.onEventComplete(ev, this.event);
            }
            if (this.event.status === " ") {
                checkbox.checked = true;
                checkbox.dataset.task = "x";
            }
        });
        const titleEl = this.eventEl.createDiv({ cls: "calendar-event-title" });
        this.markdownRenderer = new MarkdownRendererComponent(this.app, titleEl, this.event.filePath);
        this.addChild(this.markdownRenderer);
        this.markdownRenderer.render(this.event.title);
    }
    /**
     * Render agenda view events
     */
    renderAgendaEvent() {
        // Optionally prepend time if not an all-day event
        if (this.event.start && !this.event.allDay) {
            const timeStr = moment(this.event.start).format("HH:mm");
            const timeEl = this.eventEl.createSpan({
                cls: "calendar-event-time agenda-time",
                text: timeStr,
            });
            this.eventEl.appendChild(timeEl);
        }
        const checkbox = createTaskCheckbox(this.event.status, this.event, this.eventEl);
        this.registerDomEvent(checkbox, "click", (ev) => {
            var _a;
            ev.stopPropagation();
            if ((_a = this.params) === null || _a === void 0 ? void 0 : _a.onEventComplete) {
                this.params.onEventComplete(ev, this.event);
            }
            if (this.event.status === " ") {
                checkbox.checked = true;
                checkbox.dataset.task = "x";
            }
        });
        // Append title
        const titleEl = this.eventEl.createSpan({
            cls: "calendar-event-title agenda-title",
        });
        // Append title after potential time element
        this.eventEl.appendChild(titleEl);
        this.markdownRenderer = new MarkdownRendererComponent(this.app, titleEl, this.event.filePath);
        this.addChild(this.markdownRenderer);
        this.markdownRenderer.render(this.event.title);
    }
    /**
     * Register event listeners
     */
    registerEventListeners() {
        this.registerDomEvent(this.eventEl, "click", (ev) => {
            var _a, _b;
            ev.stopPropagation();
            (_b = (_a = this.params) === null || _a === void 0 ? void 0 : _a.onEventClick) === null || _b === void 0 ? void 0 : _b.call(_a, ev, this.event);
        });
        this.registerDomEvent(this.eventEl, "mouseover", (ev) => {
            this.debounceHover(ev, this.event);
        });
    }
}
/**
 * Creates and loads a calendar event component
 * @param params - Parameters for rendering the event
 * @returns The HTMLElement representing the event
 */
export function renderCalendarEvent(params) {
    const eventComponent = new CalendarEventComponent(params);
    eventComponent.registerDomEvent(eventComponent.eventEl, "contextmenu", (ev) => {
        var _a;
        (_a = params.onEventContextMenu) === null || _a === void 0 ? void 0 : _a.call(params, ev, params.event);
    });
    return { eventEl: eventComponent.eventEl, component: eventComponent };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQtcmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJldmVudC1yZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQU8sU0FBUyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFFNUQsT0FBTyxFQUFlLG1CQUFtQixFQUFFLE1BQU0sY0FBYyxDQUFDLENBQUMsd0JBQXdCO0FBQ3pGLE9BQU8sRUFDTixhQUFhLEVBQ2IseUJBQXlCLEdBQ3pCLE1BQU0sNENBQTRDLENBQUM7QUFDcEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFnQzdFOztHQUVHO0FBQ0gsTUFBTSxPQUFPLHNCQUF1QixTQUFRLFNBQVM7SUFTcEQsWUFBb0IsTUFBeUI7UUFDNUMsS0FBSyxFQUFFLENBQUM7UUFEVyxXQUFNLEdBQU4sTUFBTSxDQUFtQjtRQXVTckMsa0JBQWEsR0FBRyxRQUFRLENBQUMsQ0FBQyxFQUFjLEVBQUUsS0FBb0IsRUFBRSxFQUFFOztZQUN6RSxNQUFBLE1BQUEsSUFBSSxDQUFDLE1BQU0sMENBQUUsWUFBWSxtREFBRyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBdlNQLElBQUksQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQztRQUMxQixJQUFJLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUM7UUFDaEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO1FBQzVCLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsZ0JBQWdCLENBQUM7UUFDaEQsSUFBSSxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDO1FBRXRCLDBCQUEwQjtRQUMxQixJQUFJLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQyxLQUFLLEVBQUU7WUFDOUIs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UUFDN0MsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRTtZQUN2RCxJQUFJLENBQUMsYUFBYSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEMsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0NBS0Q7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLG1CQUFtQixDQUFDLE1BQXlCO0lBSTVELE1BQU0sY0FBYyxHQUFHLElBQUksc0JBQXNCLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDMUQsY0FBYyxDQUFDLGdCQUFnQixDQUM5QixjQUFjLENBQUMsT0FBTyxFQUN0QixhQUFhLEVBQ2IsQ0FBQyxFQUFFLEVBQUUsRUFBRTs7UUFDTixNQUFBLE1BQU0sQ0FBQyxrQkFBa0IsdURBQUcsRUFBRSxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMvQyxDQUFDLENBQ0QsQ0FBQztJQUNGLE9BQU8sRUFBRSxPQUFPLEVBQUUsY0FBYyxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsY0FBYyxFQUFFLENBQUM7QUFDdkUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcCwgQ29tcG9uZW50LCBkZWJvdW5jZSwgbW9tZW50IH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IENhbGVuZGFyRXZlbnQgfSBmcm9tICdAL2NvbXBvbmVudHMvZmVhdHVyZXMvY2FsZW5kYXIvaW5kZXgnOyAvLyBBZGp1c3QgcGF0aCBhcyBuZWVkZWRcclxuaW1wb3J0IHsgRXZlbnRMYXlvdXQsIGRldGVybWluZUV2ZW50Q29sb3IgfSBmcm9tIFwiLi4vYWxnb3JpdGhtXCI7IC8vIEFkanVzdCBwYXRoIGFzIG5lZWRlZFxyXG5pbXBvcnQge1xyXG5cdGNsZWFyQWxsTWFya3MsXHJcblx0TWFya2Rvd25SZW5kZXJlckNvbXBvbmVudCxcclxufSBmcm9tIFwiQC9jb21wb25lbnRzL3VpL3JlbmRlcmVycy9NYXJrZG93blJlbmRlcmVyXCI7XHJcbmltcG9ydCB7IGNyZWF0ZVRhc2tDaGVja2JveCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay92aWV3L2RldGFpbHNcIjtcclxuXHJcbmV4cG9ydCB0eXBlIEV2ZW50Vmlld1R5cGUgPVxyXG5cdHwgXCJtb250aFwiXHJcblx0fCBcIndlZWstYWxsZGF5XCJcclxuXHR8IFwiZGF5LWFsbGRheVwiXHJcblx0fCBcImRheS10aW1lZFwiXHJcblx0fCBcIndlZWstdGltZWRcIlxyXG5cdHwgXCJhZ2VuZGFcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRXZlbnRQb3NpdGlvbmluZ0hpbnRzIHtcclxuXHRpc011bHRpRGF5PzogYm9vbGVhbjtcclxuXHRpc1N0YXJ0PzogYm9vbGVhbjtcclxuXHRpc0VuZD86IGJvb2xlYW47XHJcblx0aXNWaWV3U3RhcnQ/OiBib29sZWFuO1xyXG5cdGlzVmlld0VuZD86IGJvb2xlYW47XHJcblx0bGF5b3V0U2xvdD86IG51bWJlcjsgLy8gQWRkZWQgZm9yIHZlcnRpY2FsIHBvc2l0aW9uaW5nIGluIHdlZWsvZGF5IGdyaWQgdmlld3NcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBSZW5kZXJFdmVudFBhcmFtcyB7XHJcblx0ZXZlbnQ6IENhbGVuZGFyRXZlbnQ7XHJcblx0dmlld1R5cGU6IEV2ZW50Vmlld1R5cGU7XHJcblx0bGF5b3V0PzogRXZlbnRMYXlvdXQ7IC8vIFByaW1hcmlseSBmb3IgdGltZWQgdmlld3NcclxuXHRwb3NpdGlvbmluZ0hpbnRzPzogRXZlbnRQb3NpdGlvbmluZ0hpbnRzOyAvLyBQcmltYXJpbHkgZm9yIG1vbnRoL2FsbC1kYXkgdmlld3NcclxuXHRhcHA6IEFwcDsgLy8gQWRkZWQgZm9yIE1hcmtkb3duIHJlbmRlcmluZ1xyXG5cclxuXHRvbkV2ZW50Q2xpY2s/OiAoZXY6IE1vdXNlRXZlbnQsIGV2ZW50OiBDYWxlbmRhckV2ZW50KSA9PiB2b2lkO1xyXG5cdG9uRXZlbnRIb3Zlcj86IChldjogTW91c2VFdmVudCwgZXZlbnQ6IENhbGVuZGFyRXZlbnQpID0+IHZvaWQ7XHJcblx0b25FdmVudENvbnRleHRNZW51PzogKGV2OiBNb3VzZUV2ZW50LCBldmVudDogQ2FsZW5kYXJFdmVudCkgPT4gdm9pZDtcclxuXHRvbkV2ZW50Q29tcGxldGU/OiAoZXY6IE1vdXNlRXZlbnQsIGV2ZW50OiBDYWxlbmRhckV2ZW50KSA9PiB2b2lkO1xyXG59XHJcblxyXG4vKipcclxuICogQ2FsZW5kYXIgRXZlbnQgQ29tcG9uZW50IHRoYXQgaGFuZGxlcyByZW5kZXJpbmcgYW5kIGxpZmVjeWNsZSBvZiBhIHNpbmdsZSBldmVudFxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIENhbGVuZGFyRXZlbnRDb21wb25lbnQgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdHByaXZhdGUgZXZlbnQ6IENhbGVuZGFyRXZlbnQ7XHJcblx0cHJpdmF0ZSB2aWV3VHlwZTogRXZlbnRWaWV3VHlwZTtcclxuXHRwcml2YXRlIGxheW91dD86IEV2ZW50TGF5b3V0O1xyXG5cdHByaXZhdGUgcG9zaXRpb25pbmdIaW50cz86IEV2ZW50UG9zaXRpb25pbmdIaW50cztcclxuXHRwcml2YXRlIGFwcDogQXBwO1xyXG5cdHB1YmxpYyBldmVudEVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIG1hcmtkb3duUmVuZGVyZXI6IE1hcmtkb3duUmVuZGVyZXJDb21wb25lbnQ7XHJcblxyXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgcGFyYW1zOiBSZW5kZXJFdmVudFBhcmFtcykge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMuZXZlbnQgPSBwYXJhbXMuZXZlbnQ7XHJcblx0XHR0aGlzLnZpZXdUeXBlID0gcGFyYW1zLnZpZXdUeXBlO1xyXG5cdFx0dGhpcy5sYXlvdXQgPSBwYXJhbXMubGF5b3V0O1xyXG5cdFx0dGhpcy5wb3NpdGlvbmluZ0hpbnRzID0gcGFyYW1zLnBvc2l0aW9uaW5nSGludHM7XHJcblx0XHR0aGlzLmFwcCA9IHBhcmFtcy5hcHA7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIHRoZSBtYWluIGVsZW1lbnRcclxuXHRcdHRoaXMuZXZlbnRFbCA9IGNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0Y2xzOiBbXCJjYWxlbmRhci1ldmVudFwiLCBgY2FsZW5kYXItZXZlbnQtJHt0aGlzLnZpZXdUeXBlfWBdLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0aWYgKHRoaXMuZXZlbnQubWV0YWRhdGEucHJvamVjdCkge1xyXG5cdFx0XHR0aGlzLmV2ZW50RWwuZGF0YXNldC5wcm9qZWN0SWQgPSB0aGlzLmV2ZW50Lm1ldGFkYXRhLnByb2plY3Q7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHRoaXMuZXZlbnQubWV0YWRhdGEucHJpb3JpdHkpIHtcclxuXHRcdFx0dGhpcy5ldmVudEVsLmRhdGFzZXQucHJpb3JpdHkgPVxyXG5cdFx0XHRcdHRoaXMuZXZlbnQubWV0YWRhdGEucHJpb3JpdHkudG9TdHJpbmcoKTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAodGhpcy5ldmVudC5zdGF0dXMpIHtcclxuXHRcdFx0dGhpcy5ldmVudEVsLmRhdGFzZXQudGFza1N0YXR1cyA9IHRoaXMuZXZlbnQuc3RhdHVzO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0aGlzLmV2ZW50LmZpbGVQYXRoKSB7XHJcblx0XHRcdHRoaXMuZXZlbnRFbC5kYXRhc2V0LmZpbGVQYXRoID0gdGhpcy5ldmVudC5maWxlUGF0aDtcclxuXHRcdH1cclxuXHRcdHRoaXMuZXZlbnRFbC5kYXRhc2V0LmV2ZW50SWQgPSB0aGlzLmV2ZW50LmlkO1xyXG5cdH1cclxuXHJcblx0b3ZlcnJpZGUgb25sb2FkKCk6IHZvaWQge1xyXG5cdFx0c3VwZXIub25sb2FkKCk7XHJcblxyXG5cdFx0Ly8gLS0tIENvbW1vbiBTdHlsaW5nICYgQXR0cmlidXRlcyAtLS1cclxuXHRcdHRoaXMuYXBwbHlTdHlsZXMoKTtcclxuXHRcdHRoaXMuc2V0VG9vbHRpcCgpO1xyXG5cclxuXHRcdC8vIC0tLSBWaWV3LVNwZWNpZmljIFJlbmRlcmluZyAtLS1cclxuXHRcdHRoaXMucmVuZGVyQnlWaWV3VHlwZSgpO1xyXG5cclxuXHRcdC8vIC0tLSBDb21tb24gQ2xpY2sgSGFuZGxlciAtLS1cclxuXHRcdHRoaXMucmVnaXN0ZXJFdmVudExpc3RlbmVycygpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQXBwbHkgY29tbW9uIHN0eWxlcyBhbmQgY2xhc3NlcyBiYXNlZCBvbiBldmVudCBwcm9wZXJ0aWVzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhcHBseVN0eWxlcygpOiB2b2lkIHtcclxuXHRcdGNvbnN0IGNvbG9yID0gZGV0ZXJtaW5lRXZlbnRDb2xvcih0aGlzLmV2ZW50KTtcclxuXHRcdGlmIChjb2xvcikge1xyXG5cdFx0XHR0aGlzLmV2ZW50RWwuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gY29sb3I7XHJcblx0XHRcdGlmIChjb2xvciA9PT0gXCJncmV5XCIpIHtcclxuXHRcdFx0XHR0aGlzLmV2ZW50RWwuYWRkQ2xhc3MoXCJpcy1jb21wbGV0ZWRcIik7XHJcblx0XHRcdFx0Ly8gQXBwbHkgbGluZS10aHJvdWdoIGRpcmVjdGx5IGlmIG5vdCBoYW5kbGVkIGJ5IENTUyBpcy1jb21wbGV0ZWRcclxuXHRcdFx0XHQvLyB0aGlzLmV2ZW50RWwuc3R5bGUudGV4dERlY29yYXRpb24gPSAnbGluZS10aHJvdWdoJztcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBUT0RPOiBBZGQgY29udHJhc3QgY2hlY2sgZm9yIHRleHQgY29sb3IgaWYgbmVlZGVkXHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSBpZiAodGhpcy5ldmVudC5jb21wbGV0ZWQpIHtcclxuXHRcdFx0Ly8gRmFsbGJhY2sgaWYgbm8gY29sb3IgYnV0IGNvbXBsZXRlZFxyXG5cdFx0XHR0aGlzLmV2ZW50RWwuYWRkQ2xhc3MoXCJpcy1jb21wbGV0ZWRcIik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTZXQgdG9vbHRpcCBpbmZvcm1hdGlvbiBmb3IgdGhlIGV2ZW50XHJcblx0ICovXHJcblx0cHJpdmF0ZSBzZXRUb29sdGlwKCk6IHZvaWQge1xyXG5cdFx0dGhpcy5ldmVudEVsLnNldEF0dHIoXHJcblx0XHRcdFwidGl0bGVcIixcclxuXHRcdFx0YCR7Y2xlYXJBbGxNYXJrcyh0aGlzLmV2ZW50LnRpdGxlKSB8fCBcIihObyB0aXRsZSlcIn1cXG5TdGF0dXM6ICR7XHJcblx0XHRcdFx0dGhpcy5ldmVudC5zdGF0dXNcclxuXHRcdFx0fSR7XHJcblx0XHRcdFx0dGhpcy5ldmVudC5tZXRhZGF0YS5kdWVEYXRlXHJcblx0XHRcdFx0XHQ/IGBcXG5EdWU6ICR7bW9tZW50KHRoaXMuZXZlbnQubWV0YWRhdGEuZHVlRGF0ZSkuZm9ybWF0KFxyXG5cdFx0XHRcdFx0XHRcdFwiWVlZWS1NTS1ERFwiXHJcblx0XHRcdFx0XHQgICl9YFxyXG5cdFx0XHRcdFx0OiBcIlwiXHJcblx0XHRcdH0ke1xyXG5cdFx0XHRcdHRoaXMuZXZlbnQubWV0YWRhdGEuc3RhcnREYXRlXHJcblx0XHRcdFx0XHQ/IGBcXG5TdGFydDogJHttb21lbnQodGhpcy5ldmVudC5tZXRhZGF0YS5zdGFydERhdGUpLmZvcm1hdChcclxuXHRcdFx0XHRcdFx0XHRcIllZWVktTU0tRERcIlxyXG5cdFx0XHRcdFx0ICApfWBcclxuXHRcdFx0XHRcdDogXCJcIlxyXG5cdFx0XHR9YFxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbmRlciBldmVudCBjb250ZW50IGJhc2VkIG9uIHZpZXcgdHlwZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgcmVuZGVyQnlWaWV3VHlwZSgpOiB2b2lkIHtcclxuXHRcdGlmIChcclxuXHRcdFx0dGhpcy52aWV3VHlwZSA9PT0gXCJtb250aFwiIHx8XHJcblx0XHRcdHRoaXMudmlld1R5cGUgPT09IFwid2Vlay1hbGxkYXlcIiB8fFxyXG5cdFx0XHR0aGlzLnZpZXdUeXBlID09PSBcImRheS1hbGxkYXlcIlxyXG5cdFx0KSB7XHJcblx0XHRcdHRoaXMucmVuZGVyQWxsRGF5RXZlbnQoKTtcclxuXHRcdH0gZWxzZSBpZiAoXHJcblx0XHRcdHRoaXMudmlld1R5cGUgPT09IFwiZGF5LXRpbWVkXCIgfHxcclxuXHRcdFx0dGhpcy52aWV3VHlwZSA9PT0gXCJ3ZWVrLXRpbWVkXCJcclxuXHRcdCkge1xyXG5cdFx0XHR0aGlzLnJlbmRlclRpbWVkRXZlbnQoKTtcclxuXHRcdH0gZWxzZSBpZiAodGhpcy52aWV3VHlwZSA9PT0gXCJhZ2VuZGFcIikge1xyXG5cdFx0XHR0aGlzLnJlbmRlckFnZW5kYUV2ZW50KCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW5kZXIgYWxsLWRheSBvciBtb250aCB2aWV3IGV2ZW50c1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgcmVuZGVyQWxsRGF5RXZlbnQoKTogdm9pZCB7XHJcblx0XHR0aGlzLmV2ZW50RWwuYWRkQ2xhc3MoXCJjYWxlbmRhci1ldmVudC1hbGxkYXlcIik7XHJcblxyXG5cdFx0Y29uc3QgY2hlY2tib3ggPSBjcmVhdGVUYXNrQ2hlY2tib3goXHJcblx0XHRcdHRoaXMuZXZlbnQuc3RhdHVzLFxyXG5cdFx0XHR0aGlzLmV2ZW50LFxyXG5cdFx0XHR0aGlzLmV2ZW50RWxcclxuXHRcdCk7XHJcblxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGNoZWNrYm94LCBcImNsaWNrXCIsIChldikgPT4ge1xyXG5cdFx0XHRldi5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHJcblx0XHRcdGlmICh0aGlzLnBhcmFtcz8ub25FdmVudENvbXBsZXRlKSB7XHJcblx0XHRcdFx0dGhpcy5wYXJhbXMub25FdmVudENvbXBsZXRlKGV2LCB0aGlzLmV2ZW50KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKHRoaXMuZXZlbnQuc3RhdHVzID09PSBcIiBcIikge1xyXG5cdFx0XHRcdGNoZWNrYm94LmNoZWNrZWQgPSB0cnVlO1xyXG5cdFx0XHRcdGNoZWNrYm94LmRhdGFzZXQudGFzayA9IFwieFwiO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDcmVhdGUgYSBjb250YWluZXIgZm9yIHRoZSB0aXRsZSB0byByZW5kZXIgbWFya2Rvd24gaW50b1xyXG5cdFx0Y29uc3QgdGl0bGVDb250YWluZXIgPSB0aGlzLmV2ZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImNhbGVuZGFyLWV2ZW50LXRpdGxlLWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblx0XHR0aGlzLm1hcmtkb3duUmVuZGVyZXIgPSBuZXcgTWFya2Rvd25SZW5kZXJlckNvbXBvbmVudChcclxuXHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdHRpdGxlQ29udGFpbmVyLFxyXG5cdFx0XHR0aGlzLmV2ZW50LmZpbGVQYXRoXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5hZGRDaGlsZCh0aGlzLm1hcmtkb3duUmVuZGVyZXIpO1xyXG5cclxuXHRcdHRoaXMubWFya2Rvd25SZW5kZXJlci5yZW5kZXIodGhpcy5ldmVudC50aXRsZSk7XHJcblxyXG5cdFx0aWYgKHRoaXMucG9zaXRpb25pbmdIaW50cz8uaXNNdWx0aURheSkge1xyXG5cdFx0XHR0aGlzLmV2ZW50RWwuYWRkQ2xhc3MoXCJpcy1tdWx0aS1kYXlcIik7XHJcblx0XHRcdGlmICh0aGlzLnBvc2l0aW9uaW5nSGludHMuaXNTdGFydClcclxuXHRcdFx0XHR0aGlzLmV2ZW50RWwuYWRkQ2xhc3MoXCJpcy1zdGFydFwiKTtcclxuXHRcdFx0aWYgKHRoaXMucG9zaXRpb25pbmdIaW50cy5pc0VuZCkgdGhpcy5ldmVudEVsLmFkZENsYXNzKFwiaXMtZW5kXCIpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVuZGVyIHRpbWVkIGV2ZW50cyBmb3IgZGF5IG9yIHdlZWsgdmlld3NcclxuXHQgKi9cclxuXHRwcml2YXRlIHJlbmRlclRpbWVkRXZlbnQoKTogdm9pZCB7XHJcblx0XHR0aGlzLmV2ZW50RWwudG9nZ2xlQ2xhc3MoXHJcblx0XHRcdFtcImNhbGVuZGFyLWV2ZW50LXRpbWVkXCIsIFwiY2FsZW5kYXItZXZlbnRcIl0sXHJcblx0XHRcdHRydWVcclxuXHRcdCk7XHJcblx0XHRpZiAodGhpcy52aWV3VHlwZSA9PT0gXCJ3ZWVrLXRpbWVkXCIpIHtcclxuXHRcdFx0dGhpcy5ldmVudEVsLmFkZENsYXNzKFwiY2FsZW5kYXItZXZlbnQtdGltZWQtd2Vla1wiKTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAodGhpcy5sYXlvdXQpIHtcclxuXHRcdFx0Ly8gQXBwbHkgYWJzb2x1dGUgcG9zaXRpb25pbmcgZnJvbSBsYXlvdXQgT05MWSBmb3Igd2Vlay10aW1lZCB2aWV3XHJcblx0XHRcdGlmICh0aGlzLnZpZXdUeXBlID09PSBcIndlZWstdGltZWRcIikge1xyXG5cdFx0XHRcdHRoaXMuZXZlbnRFbC5zdHlsZS5wb3NpdGlvbiA9IFwiYWJzb2x1dGVcIjtcclxuXHRcdFx0XHR0aGlzLmV2ZW50RWwuc3R5bGUudG9wID0gYCR7dGhpcy5sYXlvdXQudG9wfXB4YDtcclxuXHRcdFx0XHR0aGlzLmV2ZW50RWwuc3R5bGUubGVmdCA9IGAke3RoaXMubGF5b3V0LmxlZnR9JWA7XHJcblx0XHRcdFx0dGhpcy5ldmVudEVsLnN0eWxlLndpZHRoID0gYCR7dGhpcy5sYXlvdXQud2lkdGh9JWA7XHJcblx0XHRcdFx0dGhpcy5ldmVudEVsLnN0eWxlLmhlaWdodCA9IGAke3RoaXMubGF5b3V0LmhlaWdodH1weGA7XHJcblx0XHRcdFx0dGhpcy5ldmVudEVsLnN0eWxlLnpJbmRleCA9IFN0cmluZyh0aGlzLmxheW91dC56SW5kZXgpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIEZvciBkYXktdGltZWQgKG5vdyBhIGxpc3QpLCB1c2UgcmVsYXRpdmUgcG9zaXRpb25pbmcgKGhhbmRsZWQgYnkgQ1NTKVxyXG5cdFx0XHRcdHRoaXMuZXZlbnRFbC5zdHlsZS5wb3NpdGlvbiA9IFwicmVsYXRpdmVcIjsgLy8gRW5zdXJlIGl0J3Mgbm90IGFic29sdXRlXHJcblx0XHRcdFx0dGhpcy5ldmVudEVsLnN0eWxlLndpZHRoID0gXCIxMDAlXCI7IC8vIFRha2UgZnVsbCB3aWR0aCBpbiB0aGUgbGlzdFxyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2UgaWYgKHRoaXMudmlld1R5cGUgPT09IFwid2Vlay10aW1lZFwiKSB7XHJcblx0XHRcdC8vIE9ubHkgd2FybiBpZiBsYXlvdXQgaXMgbWlzc2luZyBmb3Igd2Vlay10aW1lZFxyXG5cdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XCJUaW1lZCBldmVudCByZW5kZXIgY2FsbGVkIHdpdGhvdXQgbGF5b3V0IGluZm8gZm9yIGV2ZW50OlwiLFxyXG5cdFx0XHRcdHRoaXMuZXZlbnQuaWRcclxuXHRcdFx0KTtcclxuXHRcdFx0Ly8gUHJvdmlkZSBzb21lIGRlZmF1bHQgZmFsbGJhY2sgc3R5bGVcclxuXHRcdFx0dGhpcy5ldmVudEVsLnN0eWxlLnBvc2l0aW9uID0gXCJyZWxhdGl2ZVwiOyAvLyBBdm9pZCBicmVha2luZyBsYXlvdXQgY29tcGxldGVseVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFkZCBzZXBhcmF0ZSB0aW1lIGFuZCB0aXRsZSBlbGVtZW50c1xyXG5cdFx0Ly8gT25seSBzaG93IHRpbWUgZm9yIHdlZWstdGltZWQgdmlldywgbm90IGRheS10aW1lZFxyXG5cdFx0aWYgKHRoaXMuZXZlbnQuc3RhcnQgJiYgdGhpcy52aWV3VHlwZSA9PT0gXCJ3ZWVrLXRpbWVkXCIpIHtcclxuXHRcdFx0Y29uc3QgZXZlbnRUaW1lID0gbW9tZW50KHRoaXMuZXZlbnQuc3RhcnQpLmZvcm1hdChcImg6bW1hXCIpO1xyXG5cdFx0XHR0aGlzLmV2ZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwiY2FsZW5kYXItZXZlbnQtdGltZVwiLFxyXG5cdFx0XHRcdHRleHQ6IGV2ZW50VGltZSxcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgY2hlY2tib3ggPSBjcmVhdGVUYXNrQ2hlY2tib3goXHJcblx0XHRcdHRoaXMuZXZlbnQuc3RhdHVzLFxyXG5cdFx0XHR0aGlzLmV2ZW50LFxyXG5cdFx0XHR0aGlzLmV2ZW50RWxcclxuXHRcdCk7XHJcblxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGNoZWNrYm94LCBcImNsaWNrXCIsIChldikgPT4ge1xyXG5cdFx0XHRldi5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHJcblx0XHRcdGlmICh0aGlzLnBhcmFtcz8ub25FdmVudENvbXBsZXRlKSB7XHJcblx0XHRcdFx0dGhpcy5wYXJhbXMub25FdmVudENvbXBsZXRlKGV2LCB0aGlzLmV2ZW50KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKHRoaXMuZXZlbnQuc3RhdHVzID09PSBcIiBcIikge1xyXG5cdFx0XHRcdGNoZWNrYm94LmNoZWNrZWQgPSB0cnVlO1xyXG5cdFx0XHRcdGNoZWNrYm94LmRhdGFzZXQudGFzayA9IFwieFwiO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCB0aXRsZUVsID0gdGhpcy5ldmVudEVsLmNyZWF0ZURpdih7IGNsczogXCJjYWxlbmRhci1ldmVudC10aXRsZVwiIH0pO1xyXG5cdFx0dGhpcy5tYXJrZG93blJlbmRlcmVyID0gbmV3IE1hcmtkb3duUmVuZGVyZXJDb21wb25lbnQoXHJcblx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHR0aXRsZUVsLFxyXG5cdFx0XHR0aGlzLmV2ZW50LmZpbGVQYXRoXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5hZGRDaGlsZCh0aGlzLm1hcmtkb3duUmVuZGVyZXIpO1xyXG5cclxuXHRcdHRoaXMubWFya2Rvd25SZW5kZXJlci5yZW5kZXIodGhpcy5ldmVudC50aXRsZSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW5kZXIgYWdlbmRhIHZpZXcgZXZlbnRzXHJcblx0ICovXHJcblx0cHJpdmF0ZSByZW5kZXJBZ2VuZGFFdmVudCgpOiB2b2lkIHtcclxuXHRcdC8vIE9wdGlvbmFsbHkgcHJlcGVuZCB0aW1lIGlmIG5vdCBhbiBhbGwtZGF5IGV2ZW50XHJcblx0XHRpZiAodGhpcy5ldmVudC5zdGFydCAmJiAhdGhpcy5ldmVudC5hbGxEYXkpIHtcclxuXHRcdFx0Y29uc3QgdGltZVN0ciA9IG1vbWVudCh0aGlzLmV2ZW50LnN0YXJ0KS5mb3JtYXQoXCJISDptbVwiKTtcclxuXHRcdFx0Y29uc3QgdGltZUVsID0gdGhpcy5ldmVudEVsLmNyZWF0ZVNwYW4oe1xyXG5cdFx0XHRcdGNsczogXCJjYWxlbmRhci1ldmVudC10aW1lIGFnZW5kYS10aW1lXCIsXHJcblx0XHRcdFx0dGV4dDogdGltZVN0cixcclxuXHRcdFx0fSk7XHJcblx0XHRcdHRoaXMuZXZlbnRFbC5hcHBlbmRDaGlsZCh0aW1lRWwpO1xyXG5cdFx0fVxyXG5cdFx0Y29uc3QgY2hlY2tib3ggPSBjcmVhdGVUYXNrQ2hlY2tib3goXHJcblx0XHRcdHRoaXMuZXZlbnQuc3RhdHVzLFxyXG5cdFx0XHR0aGlzLmV2ZW50LFxyXG5cdFx0XHR0aGlzLmV2ZW50RWxcclxuXHRcdCk7XHJcblxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGNoZWNrYm94LCBcImNsaWNrXCIsIChldikgPT4ge1xyXG5cdFx0XHRldi5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHJcblx0XHRcdGlmICh0aGlzLnBhcmFtcz8ub25FdmVudENvbXBsZXRlKSB7XHJcblx0XHRcdFx0dGhpcy5wYXJhbXMub25FdmVudENvbXBsZXRlKGV2LCB0aGlzLmV2ZW50KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKHRoaXMuZXZlbnQuc3RhdHVzID09PSBcIiBcIikge1xyXG5cdFx0XHRcdGNoZWNrYm94LmNoZWNrZWQgPSB0cnVlO1xyXG5cdFx0XHRcdGNoZWNrYm94LmRhdGFzZXQudGFzayA9IFwieFwiO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBBcHBlbmQgdGl0bGVcclxuXHRcdGNvbnN0IHRpdGxlRWwgPSB0aGlzLmV2ZW50RWwuY3JlYXRlU3Bhbih7XHJcblx0XHRcdGNsczogXCJjYWxlbmRhci1ldmVudC10aXRsZSBhZ2VuZGEtdGl0bGVcIixcclxuXHRcdH0pO1xyXG5cdFx0Ly8gQXBwZW5kIHRpdGxlIGFmdGVyIHBvdGVudGlhbCB0aW1lIGVsZW1lbnRcclxuXHRcdHRoaXMuZXZlbnRFbC5hcHBlbmRDaGlsZCh0aXRsZUVsKTtcclxuXHJcblx0XHR0aGlzLm1hcmtkb3duUmVuZGVyZXIgPSBuZXcgTWFya2Rvd25SZW5kZXJlckNvbXBvbmVudChcclxuXHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdHRpdGxlRWwsXHJcblx0XHRcdHRoaXMuZXZlbnQuZmlsZVBhdGhcclxuXHRcdCk7XHJcblx0XHR0aGlzLmFkZENoaWxkKHRoaXMubWFya2Rvd25SZW5kZXJlcik7XHJcblxyXG5cdFx0dGhpcy5tYXJrZG93blJlbmRlcmVyLnJlbmRlcih0aGlzLmV2ZW50LnRpdGxlKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlZ2lzdGVyIGV2ZW50IGxpc3RlbmVyc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgcmVnaXN0ZXJFdmVudExpc3RlbmVycygpOiB2b2lkIHtcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudCh0aGlzLmV2ZW50RWwsIFwiY2xpY2tcIiwgKGV2KSA9PiB7XHJcblx0XHRcdGV2LnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cdFx0XHR0aGlzLnBhcmFtcz8ub25FdmVudENsaWNrPy4oZXYsIHRoaXMuZXZlbnQpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KHRoaXMuZXZlbnRFbCwgXCJtb3VzZW92ZXJcIiwgKGV2KSA9PiB7XHJcblx0XHRcdHRoaXMuZGVib3VuY2VIb3ZlcihldiwgdGhpcy5ldmVudCk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZGVib3VuY2VIb3ZlciA9IGRlYm91bmNlKChldjogTW91c2VFdmVudCwgZXZlbnQ6IENhbGVuZGFyRXZlbnQpID0+IHtcclxuXHRcdHRoaXMucGFyYW1zPy5vbkV2ZW50SG92ZXI/LihldiwgZXZlbnQpO1xyXG5cdH0sIDQwMCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGFuZCBsb2FkcyBhIGNhbGVuZGFyIGV2ZW50IGNvbXBvbmVudFxyXG4gKiBAcGFyYW0gcGFyYW1zIC0gUGFyYW1ldGVycyBmb3IgcmVuZGVyaW5nIHRoZSBldmVudFxyXG4gKiBAcmV0dXJucyBUaGUgSFRNTEVsZW1lbnQgcmVwcmVzZW50aW5nIHRoZSBldmVudFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlckNhbGVuZGFyRXZlbnQocGFyYW1zOiBSZW5kZXJFdmVudFBhcmFtcyk6IHtcclxuXHRldmVudEVsOiBIVE1MRWxlbWVudDtcclxuXHRjb21wb25lbnQ6IENhbGVuZGFyRXZlbnRDb21wb25lbnQ7XHJcbn0ge1xyXG5cdGNvbnN0IGV2ZW50Q29tcG9uZW50ID0gbmV3IENhbGVuZGFyRXZlbnRDb21wb25lbnQocGFyYW1zKTtcclxuXHRldmVudENvbXBvbmVudC5yZWdpc3RlckRvbUV2ZW50KFxyXG5cdFx0ZXZlbnRDb21wb25lbnQuZXZlbnRFbCxcclxuXHRcdFwiY29udGV4dG1lbnVcIixcclxuXHRcdChldikgPT4ge1xyXG5cdFx0XHRwYXJhbXMub25FdmVudENvbnRleHRNZW51Py4oZXYsIHBhcmFtcy5ldmVudCk7XHJcblx0XHR9XHJcblx0KTtcclxuXHRyZXR1cm4geyBldmVudEVsOiBldmVudENvbXBvbmVudC5ldmVudEVsLCBjb21wb25lbnQ6IGV2ZW50Q29tcG9uZW50IH07XHJcbn1cclxuIl19