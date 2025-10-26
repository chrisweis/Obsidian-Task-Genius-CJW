import { __awaiter } from "tslib";
import { ButtonComponent, Component, DropdownComponent, moment, } from "obsidian";
// Removed: import { renderCalendarEvent } from "./event";
import "@/styles/calendar/view.css"; // Import the CSS file
import "@/styles/calendar/event.css"; // Import the CSS file
import "@/styles/calendar/badge.css"; // Import the badge CSS file
import { t } from "@/translations/helper";
// Import view rendering functions
import { MonthView } from "./views/month-view";
import { WeekView } from "./views/week-view";
import { DayView } from "./views/day-view";
import { AgendaView } from "./views/agenda-view";
import { YearView } from "./views/year-view";
import { QuickCaptureModal } from "@/components/features/quick-capture/modals/QuickCaptureModalWithSwitch";
export class CalendarComponent extends Component {
    constructor(app, plugin, parentEl, initialTasks = [], params = {}, viewId = "calendar" // 新增：视图ID参数
    ) {
        super();
        this.params = params;
        this.viewId = viewId;
        this.tasks = [];
        this.events = [];
        this.currentViewMode = "month";
        this.currentDate = moment(); // Use moment.js provided by Obsidian
        // Track the currently active view component
        this.activeViewComponent = null;
        // Performance optimization: Cache badge events by date
        this.badgeEventsCache = new Map();
        this.badgeEventsCacheVersion = 0;
        // Per-view override from Bases (firstDayOfWeek, hideWeekends, ...)
        this.configOverride = null;
        /**
         * on event click
         */
        this.onEventClick = (ev, event) => {
            var _a, _b, _c;
            console.log("Event clicked:", event, this.params, (_a = this.params) === null || _a === void 0 ? void 0 : _a.onTaskSelected);
            (_c = (_b = this.params) === null || _b === void 0 ? void 0 : _b.onTaskSelected) === null || _c === void 0 ? void 0 : _c.call(_b, event);
        };
        /**
         * on event mouse hover
         */
        this.onEventHover = (ev, event) => {
            console.log("Event mouse entered:", event);
        };
        /**
         * on view change
         */
        this.onViewChange = (viewMode) => {
            console.log("View changed:", viewMode);
        };
        /**
         * on day click
         */
        this.onDayClick = (ev, day, options) => {
            if (this.currentViewMode === "year") {
                this.setView("day");
                this.currentDate = moment(day);
                this.render();
            }
            else if (options.behavior === "open-quick-capture") {
                new QuickCaptureModal(this.app, this.plugin, { dueDate: moment(day).toDate() }, true).open();
            }
            else if (options.behavior === "open-task-view") {
                this.setView("day");
                this.currentDate = moment(day);
                this.render();
            }
        };
        /**
         * on day hover
         */
        this.onDayHover = (ev, day) => {
            console.log("Day hovered:", day);
        };
        /**
         * on month click
         */
        this.onMonthClick = (ev, month) => {
            this.setView("month");
            this.currentDate = moment(month);
            this.render();
        };
        /**
         * on month hover
         */
        this.onMonthHover = (ev, month) => {
            console.log("Month hovered:", month);
        };
        /**
         * on task context menu
         */
        this.onEventContextMenu = (ev, event) => {
            var _a, _b;
            (_b = (_a = this.params) === null || _a === void 0 ? void 0 : _a.onEventContextMenu) === null || _b === void 0 ? void 0 : _b.call(_a, ev, event);
        };
        /**
         * on task complete
         */
        this.onEventComplete = (ev, event) => {
            var _a, _b;
            (_b = (_a = this.params) === null || _a === void 0 ? void 0 : _a.onTaskCompleted) === null || _b === void 0 ? void 0 : _b.call(_a, event);
        };
        this.app = app;
        this.plugin = plugin;
        this.containerEl = parentEl.createDiv("full-calendar-container");
        this.tasks = initialTasks;
        this.headerEl = this.containerEl.createDiv("calendar-header");
        this.viewContainerEl = this.containerEl.createDiv("calendar-view-container");
        const viewMode = this.app.loadLocalStorage("task-genius:calendar-view");
        if (viewMode) {
            this.currentViewMode = viewMode;
        }
        console.log("CalendarComponent initialized with params:", this.params);
    }
    onload() {
        super.onload();
        this.processTasks(); // Process initial tasks into events
        this.render(); // Initial render (header and the default view)
        console.log("CalendarComponent loaded.");
    }
    onunload() {
        super.onunload();
        // Detach the active view component if it exists
        if (this.activeViewComponent) {
            this.removeChild(this.activeViewComponent);
            this.activeViewComponent = null;
        }
        // If views were created and added as children even if inactive at some point,
        // Obsidian's Component.onunload should handle detaching them.
        // Explicitly removing them might be safer if addChild was ever called on inactive views.
        // Example: [this.monthView, this.weekView, ...].forEach(view => view && this.removeChild(view));
        this.containerEl.empty(); // Clean up the main container
        console.log("CalendarComponent unloaded.");
    }
    // --- Public API ---
    /**
     * Updates the tasks displayed in the calendar.
     * @param newTasks - The new array of tasks.
     */
    updateTasks(newTasks) {
        this.tasks = newTasks;
        // Clear badge cache when tasks change
        this.invalidateBadgeEventsCache();
        this.processTasks();
        // Only update the currently active view
        if (this.activeViewComponent) {
            this.activeViewComponent.updateEvents(this.events);
        }
        else {
            // If no view is active yet (e.g., called before initial render finishes),
            // render the view which will call update internally.
            this.renderCurrentView();
        }
    }
    /**
     * Changes the current view mode.
     * @param viewMode - The new view mode.
     */
    setView(viewMode) {
        if (this.currentViewMode !== viewMode) {
            this.currentViewMode = viewMode;
            this.render(); // Re-render header and switch the view
            this.app.saveLocalStorage("task-genius:calendar-view", this.currentViewMode);
        }
    }
    /**
     * Navigates the calendar view forward or backward.
     * @param direction - 'prev' or 'next'.
     */
    navigate(direction) {
        const unit = this.getViewUnit();
        if (direction === "prev") {
            this.currentDate.subtract(1, unit);
        }
        else {
            this.currentDate.add(1, unit);
        }
        this.render(); // Re-render header and update the view
    }
    /**
     * Navigates the calendar view to today.
     */
    goToToday() {
        this.currentDate = moment();
        this.render(); // Re-render header and update the view
    }
    // --- Internal Rendering Logic ---
    /**
     * Renders the entire component (header and view).
     * Ensures view instances are ready.
     */
    render() {
        this.renderHeader();
        this.renderCurrentView();
    }
    /**
     * setTasks
     * @param tasks - The tasks to display in the calendar.
     */
    setTasks(tasks) {
        this.tasks = tasks;
        // Clear badge cache when tasks change
        this.invalidateBadgeEventsCache();
        this.processTasks();
        this.render(); // Re-render header and update the view
    }
    /**
     * Renders the header section with navigation and view controls.
     */
    renderHeader() {
        this.headerEl.empty(); // Clear previous header
        // Navigation buttons
        const navGroup = this.headerEl.createDiv("calendar-nav");
        // Previous button
        const prevButton = new ButtonComponent(navGroup.createDiv());
        prevButton.buttonEl.toggleClass(["calendar-nav-button", "prev-button"], true);
        prevButton.setIcon("chevron-left");
        prevButton.onClick(() => this.navigate("prev"));
        // Today button
        const todayButton = new ButtonComponent(navGroup.createDiv());
        todayButton.buttonEl.toggleClass(["calendar-nav-button", "today-button"], true);
        todayButton.setButtonText(t("Today"));
        todayButton.onClick(() => this.goToToday());
        // Next button
        const nextButton = new ButtonComponent(navGroup.createDiv());
        nextButton.buttonEl.toggleClass(["calendar-nav-button", "next-button"], true);
        nextButton.setIcon("chevron-right");
        nextButton.onClick(() => this.navigate("next"));
        // Current date display
        const currentDisplay = this.headerEl.createSpan("calendar-current-date");
        currentDisplay.textContent = this.getCurrentDateDisplay();
        // View mode switcher (example using buttons)
        const viewGroup = this.headerEl.createDiv("calendar-view-switcher");
        const modes = [
            "year",
            "month",
            "week",
            "day",
            "agenda",
        ];
        modes.forEach((mode) => {
            const button = viewGroup.createEl("button", {
                text: {
                    year: t("Year"),
                    month: t("Month"),
                    week: t("Week"),
                    day: t("Day"),
                    agenda: t("Agenda"),
                }[mode],
            });
            if (mode === this.currentViewMode) {
                button.addClass("is-active");
            }
            button.onclick = () => this.setView(mode);
        });
        viewGroup.createEl("div", {
            cls: "calendar-view-switcher-selector",
        }, (el) => {
            new DropdownComponent(el)
                .addOption("year", t("Year"))
                .addOption("month", t("Month"))
                .addOption("week", t("Week"))
                .addOption("day", t("Day"))
                .addOption("agenda", t("Agenda"))
                .onChange((value) => this.setView(value))
                .setValue(this.currentViewMode);
        });
    }
    /**
     * Renders the currently selected view (Month, Day, Agenda, etc.).
     * Manages attaching/detaching the active view component.
     */
    renderCurrentView() {
        var _a;
        // Determine which view component should be active
        let nextViewComponent = null;
        console.log("Rendering current view:", this.currentViewMode, this.params, (_a = this.params) === null || _a === void 0 ? void 0 : _a.onTaskSelected);
        switch (this.currentViewMode) {
            case "month":
                const effMonth = this.getEffectiveCalendarConfig();
                nextViewComponent = new MonthView(this.app, this.plugin, this.viewContainerEl, this.viewId, this.currentDate, this.events, {
                    onEventClick: this.onEventClick,
                    onEventHover: this.onEventHover,
                    onDayClick: this.onDayClick,
                    onDayHover: this.onDayHover,
                    onEventContextMenu: this.onEventContextMenu,
                    onEventComplete: this.onEventComplete,
                    getBadgeEventsForDate: this.getBadgeEventsForDate.bind(this),
                }, effMonth);
                break;
            case "week":
                const effWeek = this.getEffectiveCalendarConfig();
                nextViewComponent = new WeekView(this.app, this.plugin, this.viewContainerEl, this.viewId, this.currentDate, this.events, {
                    onEventClick: this.onEventClick,
                    onEventHover: this.onEventHover,
                    onDayClick: this.onDayClick,
                    onDayHover: this.onDayHover,
                    onEventContextMenu: this.onEventContextMenu,
                    onEventComplete: this.onEventComplete,
                    getBadgeEventsForDate: this.getBadgeEventsForDate.bind(this),
                }, effWeek);
                break;
            case "day":
                nextViewComponent = new DayView(this.app, this.plugin, this.viewContainerEl, this.currentDate, this.events, {
                    onEventClick: this.onEventClick,
                    onEventHover: this.onEventHover,
                    onEventContextMenu: this.onEventContextMenu,
                    onEventComplete: this.onEventComplete,
                });
                break;
            case "agenda":
                nextViewComponent = new AgendaView(this.app, this.plugin, this.viewContainerEl, this.currentDate, this.events, {
                    onEventClick: this.onEventClick,
                    onEventHover: this.onEventHover,
                    onEventContextMenu: this.onEventContextMenu,
                    onEventComplete: this.onEventComplete,
                });
                break;
            case "year":
                const effYear = this.getEffectiveCalendarConfig();
                nextViewComponent = new YearView(this.app, this.plugin, this.viewContainerEl, this.currentDate, this.events, {
                    onEventClick: this.onEventClick,
                    onEventHover: this.onEventHover,
                    onDayClick: this.onDayClick,
                    onDayHover: this.onDayHover,
                    onMonthClick: this.onMonthClick,
                    onMonthHover: this.onMonthHover,
                }, effYear);
                break;
            default:
                this.viewContainerEl.empty(); // Clear container if view is unknown
                this.viewContainerEl.setText(`View mode "${this.currentViewMode}" not implemented yet.`);
                nextViewComponent = null; // Ensure no view is active
        }
        // Check if the view needs to be switched
        if (this.activeViewComponent !== nextViewComponent) {
            // Detach the old view if it exists
            if (this.activeViewComponent) {
                this.removeChild(this.activeViewComponent); // Properly unload and detach the component
            }
            // Attach the new view if it exists
            if (nextViewComponent) {
                this.activeViewComponent = nextViewComponent;
                this.addChild(this.activeViewComponent); // Load and attach the new component
                // Pre-compute badge events for better performance
                this.precomputeBadgeEventsForCurrentView();
                // Update the newly activated view with current data
                this.activeViewComponent.updateEvents(this.events);
            }
            else {
                this.activeViewComponent = null; // No view is active
            }
        }
        else if (this.activeViewComponent) {
            // If the view is the same, just update it with potentially new date/events
            // Pre-compute badge events for better performance
            this.precomputeBadgeEventsForCurrentView();
            this.activeViewComponent.updateEvents(this.events);
        }
        // Update container class for styling purposes
        this.viewContainerEl.removeClass("view-year", "view-month", "view-week", "view-day", "view-agenda");
        if (this.activeViewComponent) {
            this.viewContainerEl.addClass(`view-${this.currentViewMode}`);
        }
        console.log("Rendering current view:", this.currentViewMode, "Active component:", this.activeViewComponent
            ? this.activeViewComponent.constructor.name
            : "None");
    }
    /**
     * Processes the raw tasks into calendar events.
     */
    processTasks() {
        return __awaiter(this, void 0, void 0, function* () {
            this.events = [];
            // Clear badge cache when processing tasks
            this.invalidateBadgeEventsCache();
            const primaryDateField = "dueDate"; // TODO: Make this configurable via settings
            // Process tasks
            this.tasks.forEach((task) => {
                var _a, _b, _c, _d, _e, _f;
                // Check if this is an ICS task with badge showType
                const isIcsTask = ((_a = task.source) === null || _a === void 0 ? void 0 : _a.type) === "ics";
                const icsTask = isIcsTask ? task : null; // Type assertion for IcsTask
                const showAsBadge = ((_c = (_b = icsTask === null || icsTask === void 0 ? void 0 : icsTask.icsEvent) === null || _b === void 0 ? void 0 : _b.source) === null || _c === void 0 ? void 0 : _c.showType) === "badge";
                // If ICS is configured as badge, do NOT add a full event; badges will be
                // provided via getBadgeEventsForDate from the raw tasks list to avoid duplication.
                if (isIcsTask && showAsBadge) {
                    return; // skip adding to this.events
                }
                // Determine the date to use based on priority (dueDate > scheduledDate > startDate)
                let eventDate = null;
                let isAllDay = true; // Assume tasks are all-day unless time info exists
                // For ICS tasks, use the ICS event dates directly
                if (isIcsTask && (icsTask === null || icsTask === void 0 ? void 0 : icsTask.icsEvent)) {
                    eventDate = icsTask.icsEvent.dtstart.getTime();
                    isAllDay = icsTask.icsEvent.allDay;
                }
                else {
                    if (task.metadata[primaryDateField]) {
                        eventDate = task.metadata[primaryDateField];
                    }
                    else if (task.metadata.scheduledDate) {
                        eventDate = task.metadata.scheduledDate;
                    }
                    else if (task.metadata.startDate) {
                        eventDate = task.metadata.startDate;
                    }
                }
                if (eventDate) {
                    const startMoment = moment(eventDate);
                    const start = isAllDay
                        ? startMoment.startOf("day").toDate()
                        : startMoment.toDate();
                    let end = undefined;
                    let effectiveStart = start; // Use the primary date as start by default
                    if (isIcsTask && ((_d = icsTask === null || icsTask === void 0 ? void 0 : icsTask.icsEvent) === null || _d === void 0 ? void 0 : _d.dtend)) {
                        end = icsTask.icsEvent.dtend;
                    }
                    else if (task.metadata.startDate &&
                        task.metadata.dueDate &&
                        task.metadata.startDate !== task.metadata.dueDate) {
                        const sMoment = moment(task.metadata.startDate).startOf("day");
                        const dMoment = moment(task.metadata.dueDate).startOf("day");
                        if (sMoment.isBefore(dMoment)) {
                            end = dMoment.add(1, "day").toDate();
                            effectiveStart = sMoment.toDate();
                        }
                    }
                    let eventColor;
                    if (isIcsTask && ((_f = (_e = icsTask === null || icsTask === void 0 ? void 0 : icsTask.icsEvent) === null || _e === void 0 ? void 0 : _e.source) === null || _f === void 0 ? void 0 : _f.color)) {
                        eventColor = icsTask.icsEvent.source.color;
                    }
                    else {
                        eventColor = task.completed ? "grey" : undefined;
                    }
                    this.events.push(Object.assign(Object.assign({}, task), { title: task.content, start: effectiveStart, end: end, allDay: isAllDay, color: eventColor }));
                }
            });
            // Sort events for potentially easier rendering later (e.g., agenda)
            this.events.sort((a, b) => a.start.getTime() - b.start.getTime());
            console.log(`Processed ${this.events.length} events from ${this.tasks.length} tasks (including ICS events as tasks).`);
        });
    }
    /**
     * Invalidate the badge events cache
     */
    invalidateBadgeEventsCache() {
        this.badgeEventsCache.clear();
        this.badgeEventsCacheVersion++;
    }
    /**
     * Pre-compute badge events for a date range to optimize performance
     * This replaces the per-date filtering with a single pass through all tasks
     */
    precomputeBadgeEventsForRange(startDate, endDate) {
        // Convert dates to YYYY-MM-DD format for consistent comparison
        const formatDateKey = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        };
        // Clear existing cache for the range
        const startKey = formatDateKey(startDate);
        const endKey = formatDateKey(endDate);
        // Initialize cache entries for the date range
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dateKey = formatDateKey(currentDate);
            this.badgeEventsCache.set(dateKey, []);
            currentDate.setDate(currentDate.getDate() + 1);
        }
        // Single pass through all tasks to populate cache
        this.tasks.forEach((task) => {
            var _a, _b, _c;
            const isIcsTask = ((_a = task.source) === null || _a === void 0 ? void 0 : _a.type) === "ics";
            const icsTask = isIcsTask ? task : null;
            const showAsBadge = ((_c = (_b = icsTask === null || icsTask === void 0 ? void 0 : icsTask.icsEvent) === null || _b === void 0 ? void 0 : _b.source) === null || _c === void 0 ? void 0 : _c.showType) === "badge";
            if (isIcsTask && showAsBadge && (icsTask === null || icsTask === void 0 ? void 0 : icsTask.icsEvent)) {
                // Use native Date operations instead of moment for better performance
                const eventDate = new Date(icsTask.icsEvent.dtstart);
                // Normalize to start of day for comparison
                const eventDateNormalized = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
                const eventDateKey = formatDateKey(eventDateNormalized);
                // Check if the event is within our cached range
                if (this.badgeEventsCache.has(eventDateKey)) {
                    // Convert the task to a CalendarEvent format for consistency
                    const calendarEvent = Object.assign(Object.assign({}, task), { title: task.content, start: icsTask.icsEvent.dtstart, end: icsTask.icsEvent.dtend, allDay: icsTask.icsEvent.allDay, color: icsTask.icsEvent.source.color });
                    const existingEvents = this.badgeEventsCache.get(eventDateKey) || [];
                    existingEvents.push(calendarEvent);
                    this.badgeEventsCache.set(eventDateKey, existingEvents);
                }
            }
        });
        console.log(`Pre-computed badge events for range ${startKey} to ${endKey}. Cache size: ${this.badgeEventsCache.size}`);
    }
    /**
     * Get badge events for a specific date (optimized version)
     * These are ICS events that should be displayed as badges (count) rather than full events
     */
    getBadgeEventsForDate(date) {
        // Use native Date operations for better performance
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();
        const normalizedDate = new Date(year, month, day);
        const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        // Check if we have cached data for this date
        if (this.badgeEventsCache.has(dateKey)) {
            const cachedEvents = this.badgeEventsCache.get(dateKey) || [];
            return cachedEvents;
        }
        const badgeEventsForDate = [];
        this.tasks.forEach((task) => {
            var _a, _b, _c;
            const isIcsTask = ((_a = task.source) === null || _a === void 0 ? void 0 : _a.type) === "ics";
            const icsTask = isIcsTask ? task : null;
            const showAsBadge = ((_c = (_b = icsTask === null || icsTask === void 0 ? void 0 : icsTask.icsEvent) === null || _b === void 0 ? void 0 : _b.source) === null || _c === void 0 ? void 0 : _c.showType) === "badge";
            if (isIcsTask && showAsBadge && (icsTask === null || icsTask === void 0 ? void 0 : icsTask.icsEvent)) {
                // Use native Date operations instead of moment for better performance
                const eventDate = new Date(icsTask.icsEvent.dtstart);
                const eventYear = eventDate.getFullYear();
                const eventMonth = eventDate.getMonth();
                const eventDay = eventDate.getDate();
                // Check if the event is on the target date using native comparison
                if (eventYear === year &&
                    eventMonth === month &&
                    eventDay === day) {
                    // Convert the task to a CalendarEvent format for consistency
                    const calendarEvent = Object.assign(Object.assign({}, task), { title: task.content, start: icsTask.icsEvent.dtstart, end: icsTask.icsEvent.dtend, allDay: icsTask.icsEvent.allDay, color: icsTask.icsEvent.source.color, badge: true });
                    badgeEventsForDate.push(calendarEvent);
                }
            }
        });
        // Cache the result for future use
        this.badgeEventsCache.set(dateKey, badgeEventsForDate);
        return badgeEventsForDate;
    }
    /**
     * Pre-compute badge events for the current view's date range
     * This should be called when the view changes or data updates
     */
    precomputeBadgeEventsForCurrentView() {
        var _a;
        if (!this.activeViewComponent)
            return;
        let startDate;
        let endDate;
        switch (this.currentViewMode) {
            case "month": {
                // For month view, compute for the entire grid (including previous/next month days)
                const startOfMonth = this.currentDate.clone().startOf("month");
                const endOfMonth = this.currentDate.clone().endOf("month");
                // Get first day of week setting (effective with override)
                const effCfg = this.getEffectiveCalendarConfig();
                const firstDayOfWeek = (_a = effCfg.firstDayOfWeek) !== null && _a !== void 0 ? _a : 0;
                const gridStart = startOfMonth
                    .clone()
                    .weekday(firstDayOfWeek - 7);
                const gridEnd = endOfMonth.clone().weekday(firstDayOfWeek + 6);
                // Ensure at least 42 days (6 weeks)
                if (gridEnd.diff(gridStart, "days") + 1 < 42) {
                    const daysToAdd = 42 - (gridEnd.diff(gridStart, "days") + 1);
                    gridEnd.add(daysToAdd, "days");
                }
                startDate = gridStart.toDate();
                endDate = gridEnd.toDate();
                break;
            }
            case "week": {
                const startOfWeek = this.currentDate.clone().startOf("week");
                const endOfWeek = this.currentDate.clone().endOf("week");
                startDate = startOfWeek.toDate();
                endDate = endOfWeek.toDate();
                break;
            }
            case "day":
                startDate = this.currentDate.clone().startOf("day").toDate();
                endDate = this.currentDate.clone().endOf("day").toDate();
                break;
            case "year":
                const startOfYear = this.currentDate.clone().startOf("year");
                const endOfYear = this.currentDate.clone().endOf("year");
                startDate = startOfYear.toDate();
                endDate = endOfYear.toDate();
                break;
            default:
                // For agenda and other views, use a reasonable default range
                startDate = this.currentDate.clone().startOf("day").toDate();
                endDate = this.currentDate.clone().add(30, "days").toDate();
        }
        this.precomputeBadgeEventsForRange(startDate, endDate);
    }
    /**
     * Map ICS priority to task priority
     */
    mapIcsPriorityToTaskPriority(icsPriority) {
        if (icsPriority === undefined)
            return undefined;
        // ICS priority: 0 (undefined), 1-4 (high), 5 (normal), 6-9 (low)
        // Task priority: 1 (highest), 2 (high), 3 (medium), 4 (low), 5 (lowest)
        if (icsPriority >= 1 && icsPriority <= 4)
            return 1; // High
        if (icsPriority === 5)
            return 3; // Medium
        if (icsPriority >= 6 && icsPriority <= 9)
            return 5; // Low
        return undefined;
    }
    // --- Utility Methods ---
    /**
     * Gets the appropriate moment.js unit for navigation based on the current view.
     */
    getViewUnit() {
        switch (this.currentViewMode) {
            case "year":
                return "year";
            case "month":
                return "month";
            case "week":
                return "week";
            case "day":
                return "day";
            case "agenda":
                return "week"; // Agenda might advance week by week
            default:
                return "month";
        }
    }
    /**
     * Gets the formatted string for the current date display in the header.
     */
    getCurrentDateDisplay() {
        switch (this.currentViewMode) {
            case "year":
                return this.currentDate.format("YYYY");
            case "month":
                return this.currentDate.format("MMMM/YYYY");
            case "week":
                const startOfWeek = this.currentDate.clone().startOf("week");
                const endOfWeek = this.currentDate.clone().endOf("week");
                // Handle weeks spanning across month/year changes
                if (startOfWeek.month() !== endOfWeek.month()) {
                    if (startOfWeek.year() !== endOfWeek.year()) {
                        return `${startOfWeek.format("MMM D, YYYY")} - ${endOfWeek.format("MMM D, YYYY")}`;
                    }
                    else {
                        return `${startOfWeek.format("MMM D")} - ${endOfWeek.format("MMM D, YYYY")}`;
                    }
                }
                else {
                    return `${startOfWeek.format("MMM D")} - ${endOfWeek.format("D, YYYY")}`;
                }
            case "day":
                return this.currentDate.format("dddd, MMMM D, YYYY");
            case "agenda":
                // Example: Agenda showing the next 7 days
                const endOfAgenda = this.currentDate.clone().add(6, "days");
                return `${this.currentDate.format("MMM D")} - ${endOfAgenda.format("MMM D, YYYY")}`;
            default:
                return this.currentDate.format("MMMM YYYY");
        }
    }
    /**
     * Gets the current view component.
     */
    get currentViewComponent() {
        return this.activeViewComponent;
    }
    // Allow external overrides (e.g., from Bases) and compute effective config
    setConfigOverride(override) {
        this.configOverride = override !== null && override !== void 0 ? override : null;
        // Re-render to apply new config
        this.render();
    }
    getEffectiveCalendarConfig() {
        var _a, _b;
        const baseCfg = (_a = this.plugin.settings.viewConfiguration.find((v) => v.id === this.viewId)) === null || _a === void 0 ? void 0 : _a.specificConfig;
        return Object.assign(Object.assign({}, (baseCfg !== null && baseCfg !== void 0 ? baseCfg : {})), ((_b = this.configOverride) !== null && _b !== void 0 ? _b : {}));
    }
}
// Helper function (example - might move to a utils file)
function getDaysInMonth(year, month) {
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
        days.push(new Date(date));
        date.setDate(date.getDate() + 1);
    }
    return days;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUVOLGVBQWUsRUFDZixTQUFTLEVBQ1QsaUJBQWlCLEVBRWpCLE1BQU0sR0FFTixNQUFNLFVBQVUsQ0FBQztBQUdsQiwwREFBMEQ7QUFDMUQsT0FBTyw0QkFBNEIsQ0FBQyxDQUFDLHNCQUFzQjtBQUMzRCxPQUFPLDZCQUE2QixDQUFDLENBQUMsc0JBQXNCO0FBQzVELE9BQU8sNkJBQTZCLENBQUMsQ0FBQyw0QkFBNEI7QUFDbEUsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRTFDLGtDQUFrQztBQUNsQyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDL0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzdDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUMzQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDakQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRTdDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdFQUF3RSxDQUFDO0FBc0IzRyxNQUFNLE9BQU8saUJBQWtCLFNBQVEsU0FBUztJQXdCL0MsWUFDQyxHQUFRLEVBQ1IsTUFBNkIsRUFDN0IsUUFBcUIsRUFDckIsZUFBdUIsRUFBRSxFQUNqQixTQUlKLEVBQUUsRUFDRSxTQUFpQixVQUFVLENBQUMsWUFBWTs7UUFFaEQsS0FBSyxFQUFFLENBQUM7UUFQQSxXQUFNLEdBQU4sTUFBTSxDQUlSO1FBQ0UsV0FBTSxHQUFOLE1BQU0sQ0FBcUI7UUFoQzVCLFVBQUssR0FBVyxFQUFFLENBQUM7UUFDbkIsV0FBTSxHQUFvQixFQUFFLENBQUM7UUFDN0Isb0JBQWUsR0FBcUIsT0FBTyxDQUFDO1FBQzVDLGdCQUFXLEdBQWtCLE1BQU0sRUFBRSxDQUFDLENBQUMscUNBQXFDO1FBUXBGLDRDQUE0QztRQUNwQyx3QkFBbUIsR0FBd0IsSUFBSSxDQUFDO1FBRXhELHVEQUF1RDtRQUMvQyxxQkFBZ0IsR0FBaUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUMzRCw0QkFBdUIsR0FBVyxDQUFDLENBQUM7UUFHNUMsbUVBQW1FO1FBQzNELG1CQUFjLEdBQWlGLElBQUksQ0FBQztRQTB3QjVHOztXQUVHO1FBQ0ksaUJBQVksR0FBRyxDQUFDLEVBQWMsRUFBRSxLQUFvQixFQUFFLEVBQUU7O1lBQzlELE9BQU8sQ0FBQyxHQUFHLENBQ1YsZ0JBQWdCLEVBQ2hCLEtBQUssRUFDTCxJQUFJLENBQUMsTUFBTSxFQUNYLE1BQUEsSUFBSSxDQUFDLE1BQU0sMENBQUUsY0FBYyxDQUMzQixDQUFDO1lBQ0YsTUFBQSxNQUFBLElBQUksQ0FBQyxNQUFNLDBDQUFFLGNBQWMsbURBQUcsS0FBSyxDQUFDLENBQUM7UUFDdEMsQ0FBQyxDQUFDO1FBRUY7O1dBRUc7UUFDSSxpQkFBWSxHQUFHLENBQUMsRUFBYyxFQUFFLEtBQW9CLEVBQUUsRUFBRTtZQUM5RCxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzVDLENBQUMsQ0FBQztRQUVGOztXQUVHO1FBQ0ksaUJBQVksR0FBRyxDQUFDLFFBQTBCLEVBQUUsRUFBRTtZQUNwRCxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUN4QyxDQUFDLENBQUM7UUFFRjs7V0FFRztRQUNJLGVBQVUsR0FBRyxDQUNuQixFQUFjLEVBQ2QsR0FBVyxFQUNYLE9BRUMsRUFDQSxFQUFFO1lBQ0gsSUFBSSxJQUFJLENBQUMsZUFBZSxLQUFLLE1BQU0sRUFBRTtnQkFDcEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDcEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQy9CLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQzthQUNkO2lCQUFNLElBQUksT0FBTyxDQUFDLFFBQVEsS0FBSyxvQkFBb0IsRUFBRTtnQkFDckQsSUFBSSxpQkFBaUIsQ0FDcEIsSUFBSSxDQUFDLEdBQUcsRUFDUixJQUFJLENBQUMsTUFBTSxFQUNYLEVBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBQyxFQUMvQixJQUFJLENBQ0osQ0FBQyxJQUFJLEVBQUUsQ0FBQzthQUNUO2lCQUFNLElBQUksT0FBTyxDQUFDLFFBQVEsS0FBSyxnQkFBZ0IsRUFBRTtnQkFDakQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDcEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQy9CLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQzthQUNkO1FBQ0YsQ0FBQyxDQUFDO1FBRUY7O1dBRUc7UUFDSSxlQUFVLEdBQUcsQ0FBQyxFQUFjLEVBQUUsR0FBVyxFQUFFLEVBQUU7WUFDbkQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDbEMsQ0FBQyxDQUFDO1FBRUY7O1dBRUc7UUFDSSxpQkFBWSxHQUFHLENBQUMsRUFBYyxFQUFFLEtBQWEsRUFBRSxFQUFFO1lBQ3ZELElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDdEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDakMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2YsQ0FBQyxDQUFDO1FBRUY7O1dBRUc7UUFDSSxpQkFBWSxHQUFHLENBQUMsRUFBYyxFQUFFLEtBQWEsRUFBRSxFQUFFO1lBQ3ZELE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdEMsQ0FBQyxDQUFDO1FBRUY7O1dBRUc7UUFDSSx1QkFBa0IsR0FBRyxDQUFDLEVBQWMsRUFBRSxLQUFvQixFQUFFLEVBQUU7O1lBQ3BFLE1BQUEsTUFBQSxJQUFJLENBQUMsTUFBTSwwQ0FBRSxrQkFBa0IsbURBQUcsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzlDLENBQUMsQ0FBQztRQUVGOztXQUVHO1FBQ0ksb0JBQWUsR0FBRyxDQUFDLEVBQWMsRUFBRSxLQUFvQixFQUFFLEVBQUU7O1lBQ2pFLE1BQUEsTUFBQSxJQUFJLENBQUMsTUFBTSwwQ0FBRSxlQUFlLG1EQUFHLEtBQUssQ0FBQyxDQUFDO1FBQ3ZDLENBQUMsQ0FBQztRQXIxQkQsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7UUFDZixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUNqRSxJQUFJLENBQUMsS0FBSyxHQUFHLFlBQVksQ0FBQztRQUUxQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDOUQsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FDaEQseUJBQXlCLENBQ3pCLENBQUM7UUFFRixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFDeEUsSUFBSSxRQUFRLEVBQUU7WUFDYixJQUFJLENBQUMsZUFBZSxHQUFHLFFBQTRCLENBQUM7U0FDcEQ7UUFHRCxPQUFPLENBQUMsR0FBRyxDQUFDLDRDQUE0QyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN4RSxDQUFDO0lBRVEsTUFBTTtRQUNkLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUVmLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLG9DQUFvQztRQUN6RCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQywrQ0FBK0M7UUFFOUQsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFUSxRQUFRO1FBQ2hCLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNqQixnREFBZ0Q7UUFHaEQsSUFBSSxJQUFJLENBQUMsbUJBQW1CLEVBQUU7WUFDN0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQztZQUMzQyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDO1NBQ2hDO1FBQ0QsOEVBQThFO1FBQzlFLDhEQUE4RDtRQUM5RCx5RkFBeUY7UUFDekYsaUdBQWlHO1FBRWpHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyw4QkFBOEI7UUFDeEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRCxxQkFBcUI7SUFFckI7OztPQUdHO0lBQ0gsV0FBVyxDQUFDLFFBQWdCO1FBQzNCLElBQUksQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDO1FBQ3RCLHNDQUFzQztRQUN0QyxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztRQUNsQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDcEIsd0NBQXdDO1FBR3hDLElBQUksSUFBSSxDQUFDLG1CQUFtQixFQUFFO1lBQzdCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ25EO2FBQU07WUFDTiwwRUFBMEU7WUFDMUUscURBQXFEO1lBQ3JELElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1NBQ3pCO0lBQ0YsQ0FBQztJQUVEOzs7T0FHRztJQUNILE9BQU8sQ0FBQyxRQUEwQjtRQUNqQyxJQUFJLElBQUksQ0FBQyxlQUFlLEtBQUssUUFBUSxFQUFFO1lBQ3RDLElBQUksQ0FBQyxlQUFlLEdBQUcsUUFBUSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLHVDQUF1QztZQUV0RCxJQUFJLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUN4QiwyQkFBMkIsRUFDM0IsSUFBSSxDQUFDLGVBQWUsQ0FDcEIsQ0FBQztTQUNGO0lBQ0YsQ0FBQztJQUVEOzs7T0FHRztJQUNILFFBQVEsQ0FBQyxTQUEwQjtRQUNsQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDaEMsSUFBSSxTQUFTLEtBQUssTUFBTSxFQUFFO1lBQ3pCLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztTQUNuQzthQUFNO1lBQ04sSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQzlCO1FBQ0QsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsdUNBQXVDO0lBRXZELENBQUM7SUFFRDs7T0FFRztJQUNILFNBQVM7UUFDUixJQUFJLENBQUMsV0FBVyxHQUFHLE1BQU0sRUFBRSxDQUFDO1FBQzVCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLHVDQUF1QztJQUN2RCxDQUFDO0lBRUQsbUNBQW1DO0lBRW5DOzs7T0FHRztJQUNLLE1BQU07UUFDYixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDcEIsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7SUFDMUIsQ0FBQztJQUVEOzs7T0FHRztJQUNJLFFBQVEsQ0FBQyxLQUFhO1FBQzVCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ25CLHNDQUFzQztRQUN0QyxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztRQUNsQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDcEIsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsdUNBQXVDO0lBQ3ZELENBQUM7SUFFRDs7T0FFRztJQUNLLFlBQVk7UUFDbkIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLHdCQUF3QjtRQUUvQyxxQkFBcUI7UUFDckIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUM7UUFFekQsa0JBQWtCO1FBQ2xCLE1BQU0sVUFBVSxHQUFHLElBQUksZUFBZSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQzdELFVBQVUsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUM5QixDQUFDLHFCQUFxQixFQUFFLGFBQWEsQ0FBQyxFQUN0QyxJQUFJLENBQ0osQ0FBQztRQUNGLFVBQVUsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbkMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFFaEQsZUFBZTtRQUNmLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQzlELFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUMvQixDQUFDLHFCQUFxQixFQUFFLGNBQWMsQ0FBQyxFQUN2QyxJQUFJLENBQ0osQ0FBQztRQUNGLFdBQVcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDdEMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQztRQUU1QyxjQUFjO1FBQ2QsTUFBTSxVQUFVLEdBQUcsSUFBSSxlQUFlLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7UUFDN0QsVUFBVSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQzlCLENBQUMscUJBQXFCLEVBQUUsYUFBYSxDQUFDLEVBQ3RDLElBQUksQ0FDSixDQUFDO1FBQ0YsVUFBVSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNwQyxVQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUVoRCx1QkFBdUI7UUFDdkIsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQzlDLHVCQUF1QixDQUN2QixDQUFDO1FBQ0YsY0FBYyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUUxRCw2Q0FBNkM7UUFDN0MsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUNwRSxNQUFNLEtBQUssR0FBdUI7WUFDakMsTUFBTTtZQUNOLE9BQU87WUFDUCxNQUFNO1lBQ04sS0FBSztZQUNMLFFBQVE7U0FDUixDQUFDO1FBQ0YsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ3RCLE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFO2dCQUMzQyxJQUFJLEVBQUU7b0JBQ0wsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUM7b0JBQ2YsS0FBSyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUM7b0JBQ2pCLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDO29CQUNmLEdBQUcsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDO29CQUNiLE1BQU0sRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDO2lCQUNuQixDQUFDLElBQUksQ0FBQzthQUNQLENBQUMsQ0FBQztZQUNILElBQUksSUFBSSxLQUFLLElBQUksQ0FBQyxlQUFlLEVBQUU7Z0JBQ2xDLE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7YUFDN0I7WUFDRCxNQUFNLENBQUMsT0FBTyxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDM0MsQ0FBQyxDQUFDLENBQUM7UUFFSCxTQUFTLENBQUMsUUFBUSxDQUNqQixLQUFLLEVBQ0w7WUFDQyxHQUFHLEVBQUUsaUNBQWlDO1NBQ3RDLEVBQ0QsQ0FBQyxFQUFFLEVBQUUsRUFBRTtZQUNOLElBQUksaUJBQWlCLENBQUMsRUFBRSxDQUFDO2lCQUN2QixTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztpQkFDNUIsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7aUJBQzlCLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2lCQUM1QixTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztpQkFDMUIsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7aUJBQ2hDLFFBQVEsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQ25CLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBeUIsQ0FBQyxDQUN2QztpQkFDQSxRQUFRLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ2xDLENBQUMsQ0FDRCxDQUFDO0lBQ0gsQ0FBQztJQUVEOzs7T0FHRztJQUNLLGlCQUFpQjs7UUFDeEIsa0RBQWtEO1FBQ2xELElBQUksaUJBQWlCLEdBQXdCLElBQUksQ0FBQztRQUNsRCxPQUFPLENBQUMsR0FBRyxDQUNWLHlCQUF5QixFQUN6QixJQUFJLENBQUMsZUFBZSxFQUNwQixJQUFJLENBQUMsTUFBTSxFQUNYLE1BQUEsSUFBSSxDQUFDLE1BQU0sMENBQUUsY0FBYyxDQUMzQixDQUFDO1FBQ0YsUUFBUSxJQUFJLENBQUMsZUFBZSxFQUFFO1lBQzdCLEtBQUssT0FBTztnQkFDWCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztnQkFDbkQsaUJBQWlCLEdBQUcsSUFBSSxTQUFTLENBQ2hDLElBQUksQ0FBQyxHQUFHLEVBQ1IsSUFBSSxDQUFDLE1BQU0sRUFDWCxJQUFJLENBQUMsZUFBZSxFQUNwQixJQUFJLENBQUMsTUFBTSxFQUNYLElBQUksQ0FBQyxXQUFXLEVBQ2hCLElBQUksQ0FBQyxNQUFNLEVBQ1g7b0JBQ0MsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO29CQUMvQixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7b0JBQy9CLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTtvQkFDM0IsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO29CQUMzQixrQkFBa0IsRUFBRSxJQUFJLENBQUMsa0JBQWtCO29CQUMzQyxlQUFlLEVBQUUsSUFBSSxDQUFDLGVBQWU7b0JBQ3JDLHFCQUFxQixFQUNwQixJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztpQkFDdEMsRUFDRCxRQUFRLENBQ1IsQ0FBQztnQkFDRixNQUFNO1lBQ1AsS0FBSyxNQUFNO2dCQUNWLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO2dCQUNsRCxpQkFBaUIsR0FBRyxJQUFJLFFBQVEsQ0FDL0IsSUFBSSxDQUFDLEdBQUcsRUFDUixJQUFJLENBQUMsTUFBTSxFQUNYLElBQUksQ0FBQyxlQUFlLEVBQ3BCLElBQUksQ0FBQyxNQUFNLEVBQ1gsSUFBSSxDQUFDLFdBQVcsRUFDaEIsSUFBSSxDQUFDLE1BQU0sRUFDWDtvQkFDQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7b0JBQy9CLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtvQkFDL0IsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO29CQUMzQixVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVU7b0JBQzNCLGtCQUFrQixFQUFFLElBQUksQ0FBQyxrQkFBa0I7b0JBQzNDLGVBQWUsRUFBRSxJQUFJLENBQUMsZUFBZTtvQkFDckMscUJBQXFCLEVBQ3BCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO2lCQUN0QyxFQUNELE9BQU8sQ0FDUCxDQUFDO2dCQUNGLE1BQU07WUFDUCxLQUFLLEtBQUs7Z0JBQ1QsaUJBQWlCLEdBQUcsSUFBSSxPQUFPLENBQzlCLElBQUksQ0FBQyxHQUFHLEVBQ1IsSUFBSSxDQUFDLE1BQU0sRUFDWCxJQUFJLENBQUMsZUFBZSxFQUNwQixJQUFJLENBQUMsV0FBVyxFQUNoQixJQUFJLENBQUMsTUFBTSxFQUNYO29CQUNDLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtvQkFDL0IsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO29CQUMvQixrQkFBa0IsRUFBRSxJQUFJLENBQUMsa0JBQWtCO29CQUMzQyxlQUFlLEVBQUUsSUFBSSxDQUFDLGVBQWU7aUJBQ3JDLENBQ0QsQ0FBQztnQkFDRixNQUFNO1lBQ1AsS0FBSyxRQUFRO2dCQUNaLGlCQUFpQixHQUFHLElBQUksVUFBVSxDQUNqQyxJQUFJLENBQUMsR0FBRyxFQUNSLElBQUksQ0FBQyxNQUFNLEVBQ1gsSUFBSSxDQUFDLGVBQWUsRUFDcEIsSUFBSSxDQUFDLFdBQVcsRUFDaEIsSUFBSSxDQUFDLE1BQU0sRUFDWDtvQkFDQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7b0JBQy9CLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtvQkFDL0Isa0JBQWtCLEVBQUUsSUFBSSxDQUFDLGtCQUFrQjtvQkFDM0MsZUFBZSxFQUFFLElBQUksQ0FBQyxlQUFlO2lCQUNyQyxDQUNELENBQUM7Z0JBQ0YsTUFBTTtZQUNQLEtBQUssTUFBTTtnQkFDVixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztnQkFDbEQsaUJBQWlCLEdBQUcsSUFBSSxRQUFRLENBQy9CLElBQUksQ0FBQyxHQUFHLEVBQ1IsSUFBSSxDQUFDLE1BQU0sRUFDWCxJQUFJLENBQUMsZUFBZSxFQUNwQixJQUFJLENBQUMsV0FBVyxFQUNoQixJQUFJLENBQUMsTUFBTSxFQUNYO29CQUNDLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtvQkFDL0IsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO29CQUMvQixVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVU7b0JBQzNCLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTtvQkFDM0IsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO29CQUMvQixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7aUJBQy9CLEVBQ0QsT0FBTyxDQUNQLENBQUM7Z0JBQ0YsTUFBTTtZQUNQO2dCQUNDLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxxQ0FBcUM7Z0JBQ25FLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUMzQixjQUFjLElBQUksQ0FBQyxlQUFlLHdCQUF3QixDQUMxRCxDQUFDO2dCQUNGLGlCQUFpQixHQUFHLElBQUksQ0FBQyxDQUFDLDJCQUEyQjtTQUN0RDtRQUVELHlDQUF5QztRQUN6QyxJQUFJLElBQUksQ0FBQyxtQkFBbUIsS0FBSyxpQkFBaUIsRUFBRTtZQUNuRCxtQ0FBbUM7WUFDbkMsSUFBSSxJQUFJLENBQUMsbUJBQW1CLEVBQUU7Z0JBQzdCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQywyQ0FBMkM7YUFDdkY7WUFFRCxtQ0FBbUM7WUFDbkMsSUFBSSxpQkFBaUIsRUFBRTtnQkFDdEIsSUFBSSxDQUFDLG1CQUFtQixHQUFHLGlCQUFpQixDQUFDO2dCQUM3QyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsb0NBQW9DO2dCQUM3RSxrREFBa0Q7Z0JBQ2xELElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxDQUFDO2dCQUMzQyxvREFBb0Q7Z0JBQ3BELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQ25EO2lCQUFNO2dCQUNOLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUMsQ0FBQyxvQkFBb0I7YUFDckQ7U0FDRDthQUFNLElBQUksSUFBSSxDQUFDLG1CQUFtQixFQUFFO1lBQ3BDLDJFQUEyRTtZQUMzRSxrREFBa0Q7WUFDbEQsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLENBQUM7WUFDM0MsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDbkQ7UUFFRCw4Q0FBOEM7UUFDOUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQy9CLFdBQVcsRUFDWCxZQUFZLEVBQ1osV0FBVyxFQUNYLFVBQVUsRUFDVixhQUFhLENBQ2IsQ0FBQztRQUNGLElBQUksSUFBSSxDQUFDLG1CQUFtQixFQUFFO1lBQzdCLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLFFBQVEsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUM7U0FDOUQ7UUFFRCxPQUFPLENBQUMsR0FBRyxDQUNWLHlCQUF5QixFQUN6QixJQUFJLENBQUMsZUFBZSxFQUNwQixtQkFBbUIsRUFDbkIsSUFBSSxDQUFDLG1CQUFtQjtZQUN2QixDQUFDLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxJQUFJO1lBQzNDLENBQUMsQ0FBQyxNQUFNLENBQ1QsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNXLFlBQVk7O1lBQ3pCLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDO1lBQ2pCLDBDQUEwQztZQUMxQyxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztZQUNsQyxNQUFNLGdCQUFnQixHQUFHLFNBQVMsQ0FBQyxDQUFDLDRDQUE0QztZQUVoRixnQkFBZ0I7WUFDaEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTs7Z0JBQzNCLG1EQUFtRDtnQkFDbkQsTUFBTSxTQUFTLEdBQUcsQ0FBQSxNQUFDLElBQVksQ0FBQyxNQUFNLDBDQUFFLElBQUksTUFBSyxLQUFLLENBQUM7Z0JBQ3ZELE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUUsSUFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsNkJBQTZCO2dCQUNuRixNQUFNLFdBQVcsR0FBRyxDQUFBLE1BQUEsTUFBQSxPQUFPLGFBQVAsT0FBTyx1QkFBUCxPQUFPLENBQUUsUUFBUSwwQ0FBRSxNQUFNLDBDQUFFLFFBQVEsTUFBSyxPQUFPLENBQUM7Z0JBRXBFLHlFQUF5RTtnQkFDekUsbUZBQW1GO2dCQUNuRixJQUFJLFNBQVMsSUFBSSxXQUFXLEVBQUU7b0JBQzdCLE9BQU8sQ0FBQyw2QkFBNkI7aUJBQ3JDO2dCQUVELG9GQUFvRjtnQkFDcEYsSUFBSSxTQUFTLEdBQWtCLElBQUksQ0FBQztnQkFDcEMsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLENBQUMsbURBQW1EO2dCQUV4RSxrREFBa0Q7Z0JBQ2xELElBQUksU0FBUyxLQUFJLE9BQU8sYUFBUCxPQUFPLHVCQUFQLE9BQU8sQ0FBRSxRQUFRLENBQUEsRUFBRTtvQkFDbkMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUMvQyxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7aUJBQ25DO3FCQUFNO29CQUNOLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO3dCQUNwQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO3FCQUM1Qzt5QkFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFO3dCQUN2QyxTQUFTLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUM7cUJBQ3hDO3lCQUFNLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUU7d0JBQ25DLFNBQVMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQztxQkFDcEM7aUJBQ0Q7Z0JBRUQsSUFBSSxTQUFTLEVBQUU7b0JBQ2QsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO29CQUN0QyxNQUFNLEtBQUssR0FBRyxRQUFRO3dCQUNyQixDQUFDLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLEVBQUU7d0JBQ3JDLENBQUMsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBRXhCLElBQUksR0FBRyxHQUFxQixTQUFTLENBQUM7b0JBQ3RDLElBQUksY0FBYyxHQUFHLEtBQUssQ0FBQyxDQUFDLDJDQUEyQztvQkFFdkUsSUFBSSxTQUFTLEtBQUksTUFBQSxPQUFPLGFBQVAsT0FBTyx1QkFBUCxPQUFPLENBQUUsUUFBUSwwQ0FBRSxLQUFLLENBQUEsRUFBRTt3QkFDMUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO3FCQUM3Qjt5QkFBTSxJQUNOLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUzt3QkFDdkIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPO3dCQUNyQixJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsS0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFDaEQ7d0JBQ0QsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO3dCQUMvRCxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7d0JBQzdELElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRTs0QkFDOUIsR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDOzRCQUNyQyxjQUFjLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO3lCQUNsQztxQkFDRDtvQkFFRCxJQUFJLFVBQThCLENBQUM7b0JBQ25DLElBQUksU0FBUyxLQUFJLE1BQUEsTUFBQSxPQUFPLGFBQVAsT0FBTyx1QkFBUCxPQUFPLENBQUUsUUFBUSwwQ0FBRSxNQUFNLDBDQUFFLEtBQUssQ0FBQSxFQUFFO3dCQUNsRCxVQUFVLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO3FCQUMzQzt5QkFBTTt3QkFDTixVQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7cUJBQ2pEO29CQUVELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxpQ0FDWixJQUFJLEtBQ1AsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQ25CLEtBQUssRUFBRSxjQUFjLEVBQ3JCLEdBQUcsRUFBRSxHQUFHLEVBQ1IsTUFBTSxFQUFFLFFBQVEsRUFDaEIsS0FBSyxFQUFFLFVBQVUsSUFDaEIsQ0FBQztpQkFDSDtZQUNGLENBQUMsQ0FBQyxDQUFDO1lBRUgsb0VBQW9FO1lBQ3BFLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFFbEUsT0FBTyxDQUFDLEdBQUcsQ0FDVixhQUFhLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxnQkFBZ0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLHlDQUF5QyxDQUN6RyxDQUFDO1FBQ0gsQ0FBQztLQUFBO0lBRUQ7O09BRUc7SUFDSywwQkFBMEI7UUFDakMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxDQUFDO1FBQzlCLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO0lBQ2hDLENBQUM7SUFFRDs7O09BR0c7SUFDSyw2QkFBNkIsQ0FDcEMsU0FBZSxFQUNmLE9BQWE7UUFFYiwrREFBK0Q7UUFDL0QsTUFBTSxhQUFhLEdBQUcsQ0FBQyxJQUFVLEVBQVUsRUFBRTtZQUM1QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDaEMsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzNELE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3BELE9BQU8sR0FBRyxJQUFJLElBQUksS0FBSyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ2xDLENBQUMsQ0FBQztRQUVGLHFDQUFxQztRQUNyQyxNQUFNLFFBQVEsR0FBRyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDMUMsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRXRDLDhDQUE4QztRQUM5QyxNQUFNLFdBQVcsR0FBRyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN4QyxPQUFPLFdBQVcsSUFBSSxPQUFPLEVBQUU7WUFDOUIsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzNDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZDLFdBQVcsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQy9DO1FBRUQsa0RBQWtEO1FBQ2xELElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7O1lBQzNCLE1BQU0sU0FBUyxHQUFHLENBQUEsTUFBQyxJQUFZLENBQUMsTUFBTSwwQ0FBRSxJQUFJLE1BQUssS0FBSyxDQUFDO1lBQ3ZELE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUUsSUFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ3JELE1BQU0sV0FBVyxHQUFHLENBQUEsTUFBQSxNQUFBLE9BQU8sYUFBUCxPQUFPLHVCQUFQLE9BQU8sQ0FBRSxRQUFRLDBDQUFFLE1BQU0sMENBQUUsUUFBUSxNQUFLLE9BQU8sQ0FBQztZQUVwRSxJQUFJLFNBQVMsSUFBSSxXQUFXLEtBQUksT0FBTyxhQUFQLE9BQU8sdUJBQVAsT0FBTyxDQUFFLFFBQVEsQ0FBQSxFQUFFO2dCQUNsRCxzRUFBc0U7Z0JBQ3RFLE1BQU0sU0FBUyxHQUFHLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3JELDJDQUEyQztnQkFDM0MsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLElBQUksQ0FDbkMsU0FBUyxDQUFDLFdBQVcsRUFBRSxFQUN2QixTQUFTLENBQUMsUUFBUSxFQUFFLEVBQ3BCLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FDbkIsQ0FBQztnQkFDRixNQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsbUJBQW1CLENBQUMsQ0FBQztnQkFFeEQsZ0RBQWdEO2dCQUNoRCxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQUU7b0JBQzVDLDZEQUE2RDtvQkFDN0QsTUFBTSxhQUFhLG1DQUNmLElBQUksS0FDUCxLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFDbkIsS0FBSyxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUMvQixHQUFHLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQzNCLE1BQU0sRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFDL0IsS0FBSyxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssR0FDcEMsQ0FBQztvQkFFRixNQUFNLGNBQWMsR0FDbkIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQy9DLGNBQWMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7b0JBQ25DLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLGNBQWMsQ0FBQyxDQUFDO2lCQUN4RDthQUNEO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLENBQUMsR0FBRyxDQUNWLHVDQUF1QyxRQUFRLE9BQU8sTUFBTSxpQkFBaUIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUN6RyxDQUFDO0lBQ0gsQ0FBQztJQUVEOzs7T0FHRztJQUNJLHFCQUFxQixDQUFDLElBQVU7UUFDdEMsb0RBQW9EO1FBQ3BELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNoQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDOUIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzNCLE1BQU0sY0FBYyxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDbEQsTUFBTSxPQUFPLEdBQUcsR0FBRyxJQUFJLElBQUksTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FDdEUsR0FBRyxDQUNILENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDO1FBRXJCLDZDQUE2QztRQUM3QyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDdkMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDOUQsT0FBTyxZQUFZLENBQUM7U0FDcEI7UUFFRCxNQUFNLGtCQUFrQixHQUFvQixFQUFFLENBQUM7UUFFL0MsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTs7WUFDM0IsTUFBTSxTQUFTLEdBQUcsQ0FBQSxNQUFDLElBQVksQ0FBQyxNQUFNLDBDQUFFLElBQUksTUFBSyxLQUFLLENBQUM7WUFDdkQsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBRSxJQUFnQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDckQsTUFBTSxXQUFXLEdBQUcsQ0FBQSxNQUFBLE1BQUEsT0FBTyxhQUFQLE9BQU8sdUJBQVAsT0FBTyxDQUFFLFFBQVEsMENBQUUsTUFBTSwwQ0FBRSxRQUFRLE1BQUssT0FBTyxDQUFDO1lBRXBFLElBQUksU0FBUyxJQUFJLFdBQVcsS0FBSSxPQUFPLGFBQVAsT0FBTyx1QkFBUCxPQUFPLENBQUUsUUFBUSxDQUFBLEVBQUU7Z0JBQ2xELHNFQUFzRTtnQkFDdEUsTUFBTSxTQUFTLEdBQUcsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDckQsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUMxQyxNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ3hDLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFFckMsbUVBQW1FO2dCQUNuRSxJQUNDLFNBQVMsS0FBSyxJQUFJO29CQUNsQixVQUFVLEtBQUssS0FBSztvQkFDcEIsUUFBUSxLQUFLLEdBQUcsRUFDZjtvQkFDRCw2REFBNkQ7b0JBQzdELE1BQU0sYUFBYSxtQ0FDZixJQUFJLEtBQ1AsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQ25CLEtBQUssRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFDL0IsR0FBRyxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUMzQixNQUFNLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQy9CLEtBQUssRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQ3BDLEtBQUssRUFBRSxJQUFJLEdBQ1gsQ0FBQztvQkFDRixrQkFBa0IsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7aUJBQ3ZDO2FBQ0Q7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILGtDQUFrQztRQUNsQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBRXZELE9BQU8sa0JBQWtCLENBQUM7SUFDM0IsQ0FBQztJQUVEOzs7T0FHRztJQUNJLG1DQUFtQzs7UUFDekMsSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUI7WUFBRSxPQUFPO1FBRXRDLElBQUksU0FBZSxDQUFDO1FBQ3BCLElBQUksT0FBYSxDQUFDO1FBRWxCLFFBQVEsSUFBSSxDQUFDLGVBQWUsRUFBRTtZQUM3QixLQUFLLE9BQU8sQ0FBQyxDQUFDO2dCQUViLG1GQUFtRjtnQkFDbkYsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQy9ELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUUzRCwwREFBMEQ7Z0JBQzFELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO2dCQUNqRCxNQUFNLGNBQWMsR0FBRyxNQUFBLE1BQU0sQ0FBQyxjQUFjLG1DQUFJLENBQUMsQ0FBQztnQkFFbEQsTUFBTSxTQUFTLEdBQUcsWUFBWTtxQkFDNUIsS0FBSyxFQUFFO3FCQUNQLE9BQU8sQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQzlCLE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUUvRCxvQ0FBb0M7Z0JBQ3BDLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsRUFBRTtvQkFDN0MsTUFBTSxTQUFTLEdBQ2QsRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQzVDLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2lCQUMvQjtnQkFFRCxTQUFTLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUMvQixPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUMzQixNQUFNO2FBQ047WUFFRCxLQUFLLE1BQU0sQ0FBQyxDQUFDO2dCQUVaLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUM3RCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDekQsU0FBUyxHQUFHLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDakMsT0FBTyxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDN0IsTUFBTTthQUNOO1lBRUQsS0FBSyxLQUFLO2dCQUNULFNBQVMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDN0QsT0FBTyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUN6RCxNQUFNO1lBRVAsS0FBSyxNQUFNO2dCQUNWLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUM3RCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDekQsU0FBUyxHQUFHLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDakMsT0FBTyxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDN0IsTUFBTTtZQUVQO2dCQUNDLDZEQUE2RDtnQkFDN0QsU0FBUyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUM3RCxPQUFPLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1NBQzdEO1FBRUQsSUFBSSxDQUFDLDZCQUE2QixDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBRUQ7O09BRUc7SUFDSyw0QkFBNEIsQ0FDbkMsV0FBb0I7UUFFcEIsSUFBSSxXQUFXLEtBQUssU0FBUztZQUFFLE9BQU8sU0FBUyxDQUFDO1FBRWhELGlFQUFpRTtRQUNqRSx3RUFBd0U7UUFDeEUsSUFBSSxXQUFXLElBQUksQ0FBQyxJQUFJLFdBQVcsSUFBSSxDQUFDO1lBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPO1FBQzNELElBQUksV0FBVyxLQUFLLENBQUM7WUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVM7UUFDMUMsSUFBSSxXQUFXLElBQUksQ0FBQyxJQUFJLFdBQVcsSUFBSSxDQUFDO1lBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNO1FBQzFELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCwwQkFBMEI7SUFFMUI7O09BRUc7SUFDSyxXQUFXO1FBQ2xCLFFBQVEsSUFBSSxDQUFDLGVBQWUsRUFBRTtZQUM3QixLQUFLLE1BQU07Z0JBQ1YsT0FBTyxNQUFNLENBQUM7WUFDZixLQUFLLE9BQU87Z0JBQ1gsT0FBTyxPQUFPLENBQUM7WUFDaEIsS0FBSyxNQUFNO2dCQUNWLE9BQU8sTUFBTSxDQUFDO1lBQ2YsS0FBSyxLQUFLO2dCQUNULE9BQU8sS0FBSyxDQUFDO1lBQ2QsS0FBSyxRQUFRO2dCQUNaLE9BQU8sTUFBTSxDQUFDLENBQUMsb0NBQW9DO1lBQ3BEO2dCQUNDLE9BQU8sT0FBTyxDQUFDO1NBQ2hCO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0sscUJBQXFCO1FBQzVCLFFBQVEsSUFBSSxDQUFDLGVBQWUsRUFBRTtZQUM3QixLQUFLLE1BQU07Z0JBQ1YsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN4QyxLQUFLLE9BQU87Z0JBQ1gsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUM3QyxLQUFLLE1BQU07Z0JBQ1YsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQzdELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUN6RCxrREFBa0Q7Z0JBQ2xELElBQUksV0FBVyxDQUFDLEtBQUssRUFBRSxLQUFLLFNBQVMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtvQkFDOUMsSUFBSSxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssU0FBUyxDQUFDLElBQUksRUFBRSxFQUFFO3dCQUM1QyxPQUFPLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FDM0IsYUFBYSxDQUNiLE1BQU0sU0FBUyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO3FCQUN6Qzt5QkFBTTt3QkFDTixPQUFPLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FDM0IsT0FBTyxDQUNQLE1BQU0sU0FBUyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO3FCQUN6QztpQkFDRDtxQkFBTTtvQkFDTixPQUFPLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxTQUFTLENBQUMsTUFBTSxDQUMxRCxTQUFTLENBQ1QsRUFBRSxDQUFDO2lCQUNKO1lBQ0YsS0FBSyxLQUFLO2dCQUNULE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsQ0FBQztZQUN0RCxLQUFLLFFBQVE7Z0JBQ1osMENBQTBDO2dCQUMxQyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQzVELE9BQU8sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FDaEMsT0FBTyxDQUNQLE1BQU0sV0FBVyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO1lBQzVDO2dCQUNDLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7U0FDN0M7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFXLG9CQUFvQjtRQUM5QixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQztJQUNqQyxDQUFDO0lBOEZELDJFQUEyRTtJQUNwRSxpQkFBaUIsQ0FDdkIsUUFBc0Y7UUFFdEYsSUFBSSxDQUFDLGNBQWMsR0FBRyxRQUFRLGFBQVIsUUFBUSxjQUFSLFFBQVEsR0FBSSxJQUFJLENBQUM7UUFDdkMsZ0NBQWdDO1FBQ2hDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNmLENBQUM7SUFFTywwQkFBMEI7O1FBQ2pDLE1BQU0sT0FBTyxHQUFHLE1BQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLElBQUksQ0FBQyxNQUFNLENBQUMsMENBQUUsY0FBbUcsQ0FBQztRQUM5TCx1Q0FBVyxDQUFDLE9BQU8sYUFBUCxPQUFPLGNBQVAsT0FBTyxHQUFJLEVBQUUsQ0FBQyxHQUFLLENBQUMsTUFBQSxJQUFJLENBQUMsY0FBYyxtQ0FBSSxFQUFFLENBQUMsRUFBRTtJQUM3RCxDQUFDO0NBRUQ7QUFFRCx5REFBeUQ7QUFDekQsU0FBUyxjQUFjLENBQUMsSUFBWSxFQUFFLEtBQWE7SUFDbEQsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN0QyxNQUFNLElBQUksR0FBVyxFQUFFLENBQUM7SUFDeEIsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssS0FBSyxFQUFFO1FBQ2pDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUMxQixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztLQUNqQztJQUNELE9BQU8sSUFBSSxDQUFDO0FBQ2IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XHJcblx0QXBwLFxyXG5cdEJ1dHRvbkNvbXBvbmVudCxcclxuXHRDb21wb25lbnQsXHJcblx0RHJvcGRvd25Db21wb25lbnQsXHJcblx0VEZpbGUsXHJcblx0bW9tZW50LFxyXG5cdHNldEljb24sXHJcbn0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiQC90eXBlcy90YXNrXCI7IC8vIEFzc3VtaW5nIFRhc2sgdHlwZSBleGlzdHMgaGVyZVxyXG5pbXBvcnQgeyBJY3NUYXNrIH0gZnJvbSBcIkAvdHlwZXMvaWNzXCI7XHJcbi8vIFJlbW92ZWQ6IGltcG9ydCB7IHJlbmRlckNhbGVuZGFyRXZlbnQgfSBmcm9tIFwiLi9ldmVudFwiO1xyXG5pbXBvcnQgXCJAL3N0eWxlcy9jYWxlbmRhci92aWV3LmNzc1wiOyAvLyBJbXBvcnQgdGhlIENTUyBmaWxlXHJcbmltcG9ydCBcIkAvc3R5bGVzL2NhbGVuZGFyL2V2ZW50LmNzc1wiOyAvLyBJbXBvcnQgdGhlIENTUyBmaWxlXHJcbmltcG9ydCBcIkAvc3R5bGVzL2NhbGVuZGFyL2JhZGdlLmNzc1wiOyAvLyBJbXBvcnQgdGhlIGJhZGdlIENTUyBmaWxlXHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcblxyXG4vLyBJbXBvcnQgdmlldyByZW5kZXJpbmcgZnVuY3Rpb25zXHJcbmltcG9ydCB7IE1vbnRoVmlldyB9IGZyb20gXCIuL3ZpZXdzL21vbnRoLXZpZXdcIjtcclxuaW1wb3J0IHsgV2Vla1ZpZXcgfSBmcm9tIFwiLi92aWV3cy93ZWVrLXZpZXdcIjtcclxuaW1wb3J0IHsgRGF5VmlldyB9IGZyb20gXCIuL3ZpZXdzL2RheS12aWV3XCI7XHJcbmltcG9ydCB7IEFnZW5kYVZpZXcgfSBmcm9tIFwiLi92aWV3cy9hZ2VuZGEtdmlld1wiO1xyXG5pbXBvcnQgeyBZZWFyVmlldyB9IGZyb20gXCIuL3ZpZXdzL3llYXItdmlld1wiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7IFF1aWNrQ2FwdHVyZU1vZGFsIH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy9xdWljay1jYXB0dXJlL21vZGFscy9RdWlja0NhcHR1cmVNb2RhbFdpdGhTd2l0Y2hcIjtcclxuLy8gSW1wb3J0IGFsZ29yaXRobSBmdW5jdGlvbnMgKG9wdGlvbmFsIGZvciBub3csIGNvdWxkIGJlIHVzZWQgd2l0aGluIHZpZXdzKVxyXG4vLyBpbXBvcnQgeyBjYWxjdWxhdGVFdmVudExheW91dCwgZGV0ZXJtaW5lRXZlbnRDb2xvciB9IGZyb20gJy4vYWxnb3JpdGhtJztcclxuXHJcbi8vIERlZmluZSB0aGUgdHlwZXMgZm9yIHRoZSB2aWV3IG1vZGVzXHJcbnR5cGUgQ2FsZW5kYXJWaWV3TW9kZSA9IFwieWVhclwiIHwgXCJtb250aFwiIHwgXCJ3ZWVrXCIgfCBcImRheVwiIHwgXCJhZ2VuZGFcIjtcclxuXHJcbnR5cGUgQ2FsZW5kYXJWaWV3ID0gTW9udGhWaWV3IHwgV2Vla1ZpZXcgfCBEYXlWaWV3IHwgQWdlbmRhVmlldyB8IFllYXJWaWV3O1xyXG5cclxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xyXG5leHBvcnQgaW50ZXJmYWNlIENhbGVuZGFyRXZlbnQgZXh0ZW5kcyBUYXNrIHtcclxuXHQvLyBJbmhlcml0cyBhbGwgcHJvcGVydGllcyBmcm9tIFRhc2tcclxuXHQvLyBBZGRpdGlvbmFsIHByb3BlcnRpZXMgc3BlY2lmaWMgdG8gY2FsZW5kYXIgZGlzcGxheTpcclxuXHR0aXRsZTogc3RyaW5nOyAvLyBPZnRlbiB0aGUgc2FtZSBhcyBUYXNrLmNvbnRlbnQsIGJ1dCBjb3VsZCBiZSBjdXN0b21pemVkXHJcblx0c3RhcnQ6IERhdGU7XHJcblx0ZW5kPzogRGF0ZTsgLy8gT3B0aW9uYWwgZW5kIGRhdGUgZm9yIG11bHRpLWRheSBldmVudHNcclxuXHRhbGxEYXk6IGJvb2xlYW47IC8vIEluZGljYXRlcyBpZiB0aGUgZXZlbnQgaXMgYW4gYWxsLWRheSBldmVudFxyXG5cdC8vIHRhc2s6IFRhc2s7IC8vIFJlbW92ZWQsIGFzIHByb3BlcnRpZXMgYXJlIG5vdyBpbmhlcml0ZWRcclxuXHRjb2xvcj86IHN0cmluZzsgLy8gT3B0aW9uYWwgY29sb3IgZm9yIHRoZSBldmVudFxyXG5cdGJhZGdlPzogYm9vbGVhbjsgLy8gSW5kaWNhdGVzIGlmIHRoaXMgaXMgYSBiYWRnZSBldmVudCAoZm9yIElDUyBldmVudHMgd2l0aCBzaG93VHlwZT1cImJhZGdlXCIpXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBDYWxlbmRhckNvbXBvbmVudCBleHRlbmRzIENvbXBvbmVudCB7XHJcblx0cHVibGljIGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIHRhc2tzOiBUYXNrW10gPSBbXTtcclxuXHRwcml2YXRlIGV2ZW50czogQ2FsZW5kYXJFdmVudFtdID0gW107XHJcblx0cHJpdmF0ZSBjdXJyZW50Vmlld01vZGU6IENhbGVuZGFyVmlld01vZGUgPSBcIm1vbnRoXCI7XHJcblx0cHJpdmF0ZSBjdXJyZW50RGF0ZTogbW9tZW50Lk1vbWVudCA9IG1vbWVudCgpOyAvLyBVc2UgbW9tZW50LmpzIHByb3ZpZGVkIGJ5IE9ic2lkaWFuXHJcblxyXG5cdHByaXZhdGUgaGVhZGVyRWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgdmlld0NvbnRhaW5lckVsOiBIVE1MRWxlbWVudDsgLy8gUGFyZW50IGNvbnRhaW5lciBmb3IgYWxsIHZpZXdzXHJcblxyXG5cdHByaXZhdGUgYXBwOiBBcHA7XHJcblx0cHJpdmF0ZSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbjtcclxuXHJcblx0Ly8gVHJhY2sgdGhlIGN1cnJlbnRseSBhY3RpdmUgdmlldyBjb21wb25lbnRcclxuXHRwcml2YXRlIGFjdGl2ZVZpZXdDb21wb25lbnQ6IENhbGVuZGFyVmlldyB8IG51bGwgPSBudWxsO1xyXG5cclxuXHQvLyBQZXJmb3JtYW5jZSBvcHRpbWl6YXRpb246IENhY2hlIGJhZGdlIGV2ZW50cyBieSBkYXRlXHJcblx0cHJpdmF0ZSBiYWRnZUV2ZW50c0NhY2hlOiBNYXA8c3RyaW5nLCBDYWxlbmRhckV2ZW50W10+ID0gbmV3IE1hcCgpO1xyXG5cdHByaXZhdGUgYmFkZ2VFdmVudHNDYWNoZVZlcnNpb246IG51bWJlciA9IDA7XHJcblxyXG5cclxuXHQvLyBQZXItdmlldyBvdmVycmlkZSBmcm9tIEJhc2VzIChmaXJzdERheU9mV2VlaywgaGlkZVdlZWtlbmRzLCAuLi4pXHJcblx0cHJpdmF0ZSBjb25maWdPdmVycmlkZTogUGFydGlhbDxpbXBvcnQoXCJAL2NvbW1vbi9zZXR0aW5nLWRlZmluaXRpb25cIikuQ2FsZW5kYXJTcGVjaWZpY0NvbmZpZz4gfCBudWxsID0gbnVsbDtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRhcHA6IEFwcCxcclxuXHRcdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0cGFyZW50RWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0aW5pdGlhbFRhc2tzOiBUYXNrW10gPSBbXSxcclxuXHRcdHByaXZhdGUgcGFyYW1zOiB7XHJcblx0XHRcdG9uVGFza1NlbGVjdGVkPzogKHRhc2s6IFRhc2sgfCBudWxsKSA9PiB2b2lkO1xyXG5cdFx0XHRvblRhc2tDb21wbGV0ZWQ/OiAodGFzazogVGFzaykgPT4gdm9pZDtcclxuXHRcdFx0b25FdmVudENvbnRleHRNZW51PzogKGV2OiBNb3VzZUV2ZW50LCBldmVudDogQ2FsZW5kYXJFdmVudCkgPT4gdm9pZDtcclxuXHRcdH0gPSB7fSxcclxuXHRcdHByaXZhdGUgdmlld0lkOiBzdHJpbmcgPSBcImNhbGVuZGFyXCIgLy8g5paw5aKe77ya6KeG5Zu+SUTlj4LmlbBcclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLmFwcCA9IGFwcDtcclxuXHRcdHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG5cdFx0dGhpcy5jb250YWluZXJFbCA9IHBhcmVudEVsLmNyZWF0ZURpdihcImZ1bGwtY2FsZW5kYXItY29udGFpbmVyXCIpO1xyXG5cdFx0dGhpcy50YXNrcyA9IGluaXRpYWxUYXNrcztcclxuXHJcblx0XHR0aGlzLmhlYWRlckVsID0gdGhpcy5jb250YWluZXJFbC5jcmVhdGVEaXYoXCJjYWxlbmRhci1oZWFkZXJcIik7XHJcblx0XHR0aGlzLnZpZXdDb250YWluZXJFbCA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KFxyXG5cdFx0XHRcImNhbGVuZGFyLXZpZXctY29udGFpbmVyXCJcclxuXHRcdCk7XHJcblxyXG5cdFx0Y29uc3Qgdmlld01vZGUgPSB0aGlzLmFwcC5sb2FkTG9jYWxTdG9yYWdlKFwidGFzay1nZW5pdXM6Y2FsZW5kYXItdmlld1wiKTtcclxuXHRcdGlmICh2aWV3TW9kZSkge1xyXG5cdFx0XHR0aGlzLmN1cnJlbnRWaWV3TW9kZSA9IHZpZXdNb2RlIGFzIENhbGVuZGFyVmlld01vZGU7XHJcblx0XHR9XHJcblxyXG5cclxuXHRcdGNvbnNvbGUubG9nKFwiQ2FsZW5kYXJDb21wb25lbnQgaW5pdGlhbGl6ZWQgd2l0aCBwYXJhbXM6XCIsIHRoaXMucGFyYW1zKTtcclxuXHR9XHJcblxyXG5cdG92ZXJyaWRlIG9ubG9hZCgpIHtcclxuXHRcdHN1cGVyLm9ubG9hZCgpO1xyXG5cclxuXHRcdHRoaXMucHJvY2Vzc1Rhc2tzKCk7IC8vIFByb2Nlc3MgaW5pdGlhbCB0YXNrcyBpbnRvIGV2ZW50c1xyXG5cdFx0dGhpcy5yZW5kZXIoKTsgLy8gSW5pdGlhbCByZW5kZXIgKGhlYWRlciBhbmQgdGhlIGRlZmF1bHQgdmlldylcclxuXHJcblx0XHRjb25zb2xlLmxvZyhcIkNhbGVuZGFyQ29tcG9uZW50IGxvYWRlZC5cIik7XHJcblx0fVxyXG5cclxuXHRvdmVycmlkZSBvbnVubG9hZCgpIHtcclxuXHRcdHN1cGVyLm9udW5sb2FkKCk7XHJcblx0XHQvLyBEZXRhY2ggdGhlIGFjdGl2ZSB2aWV3IGNvbXBvbmVudCBpZiBpdCBleGlzdHNcclxuXHJcblxyXG5cdFx0aWYgKHRoaXMuYWN0aXZlVmlld0NvbXBvbmVudCkge1xyXG5cdFx0XHR0aGlzLnJlbW92ZUNoaWxkKHRoaXMuYWN0aXZlVmlld0NvbXBvbmVudCk7XHJcblx0XHRcdHRoaXMuYWN0aXZlVmlld0NvbXBvbmVudCA9IG51bGw7XHJcblx0XHR9XHJcblx0XHQvLyBJZiB2aWV3cyB3ZXJlIGNyZWF0ZWQgYW5kIGFkZGVkIGFzIGNoaWxkcmVuIGV2ZW4gaWYgaW5hY3RpdmUgYXQgc29tZSBwb2ludCxcclxuXHRcdC8vIE9ic2lkaWFuJ3MgQ29tcG9uZW50Lm9udW5sb2FkIHNob3VsZCBoYW5kbGUgZGV0YWNoaW5nIHRoZW0uXHJcblx0XHQvLyBFeHBsaWNpdGx5IHJlbW92aW5nIHRoZW0gbWlnaHQgYmUgc2FmZXIgaWYgYWRkQ2hpbGQgd2FzIGV2ZXIgY2FsbGVkIG9uIGluYWN0aXZlIHZpZXdzLlxyXG5cdFx0Ly8gRXhhbXBsZTogW3RoaXMubW9udGhWaWV3LCB0aGlzLndlZWtWaWV3LCAuLi5dLmZvckVhY2godmlldyA9PiB2aWV3ICYmIHRoaXMucmVtb3ZlQ2hpbGQodmlldykpO1xyXG5cclxuXHRcdHRoaXMuY29udGFpbmVyRWwuZW1wdHkoKTsgLy8gQ2xlYW4gdXAgdGhlIG1haW4gY29udGFpbmVyXHJcblx0XHRjb25zb2xlLmxvZyhcIkNhbGVuZGFyQ29tcG9uZW50IHVubG9hZGVkLlwiKTtcclxuXHR9XHJcblxyXG5cdC8vIC0tLSBQdWJsaWMgQVBJIC0tLVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGVzIHRoZSB0YXNrcyBkaXNwbGF5ZWQgaW4gdGhlIGNhbGVuZGFyLlxyXG5cdCAqIEBwYXJhbSBuZXdUYXNrcyAtIFRoZSBuZXcgYXJyYXkgb2YgdGFza3MuXHJcblx0ICovXHJcblx0dXBkYXRlVGFza3MobmV3VGFza3M6IFRhc2tbXSkge1xyXG5cdFx0dGhpcy50YXNrcyA9IG5ld1Rhc2tzO1xyXG5cdFx0Ly8gQ2xlYXIgYmFkZ2UgY2FjaGUgd2hlbiB0YXNrcyBjaGFuZ2VcclxuXHRcdHRoaXMuaW52YWxpZGF0ZUJhZGdlRXZlbnRzQ2FjaGUoKTtcclxuXHRcdHRoaXMucHJvY2Vzc1Rhc2tzKCk7XHJcblx0XHQvLyBPbmx5IHVwZGF0ZSB0aGUgY3VycmVudGx5IGFjdGl2ZSB2aWV3XHJcblxyXG5cclxuXHRcdGlmICh0aGlzLmFjdGl2ZVZpZXdDb21wb25lbnQpIHtcclxuXHRcdFx0dGhpcy5hY3RpdmVWaWV3Q29tcG9uZW50LnVwZGF0ZUV2ZW50cyh0aGlzLmV2ZW50cyk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBJZiBubyB2aWV3IGlzIGFjdGl2ZSB5ZXQgKGUuZy4sIGNhbGxlZCBiZWZvcmUgaW5pdGlhbCByZW5kZXIgZmluaXNoZXMpLFxyXG5cdFx0XHQvLyByZW5kZXIgdGhlIHZpZXcgd2hpY2ggd2lsbCBjYWxsIHVwZGF0ZSBpbnRlcm5hbGx5LlxyXG5cdFx0XHR0aGlzLnJlbmRlckN1cnJlbnRWaWV3KCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDaGFuZ2VzIHRoZSBjdXJyZW50IHZpZXcgbW9kZS5cclxuXHQgKiBAcGFyYW0gdmlld01vZGUgLSBUaGUgbmV3IHZpZXcgbW9kZS5cclxuXHQgKi9cclxuXHRzZXRWaWV3KHZpZXdNb2RlOiBDYWxlbmRhclZpZXdNb2RlKSB7XHJcblx0XHRpZiAodGhpcy5jdXJyZW50Vmlld01vZGUgIT09IHZpZXdNb2RlKSB7XHJcblx0XHRcdHRoaXMuY3VycmVudFZpZXdNb2RlID0gdmlld01vZGU7XHJcblx0XHRcdHRoaXMucmVuZGVyKCk7IC8vIFJlLXJlbmRlciBoZWFkZXIgYW5kIHN3aXRjaCB0aGUgdmlld1xyXG5cclxuXHRcdFx0dGhpcy5hcHAuc2F2ZUxvY2FsU3RvcmFnZShcclxuXHRcdFx0XHRcInRhc2stZ2VuaXVzOmNhbGVuZGFyLXZpZXdcIixcclxuXHRcdFx0XHR0aGlzLmN1cnJlbnRWaWV3TW9kZVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTmF2aWdhdGVzIHRoZSBjYWxlbmRhciB2aWV3IGZvcndhcmQgb3IgYmFja3dhcmQuXHJcblx0ICogQHBhcmFtIGRpcmVjdGlvbiAtICdwcmV2JyBvciAnbmV4dCcuXHJcblx0ICovXHJcblx0bmF2aWdhdGUoZGlyZWN0aW9uOiBcInByZXZcIiB8IFwibmV4dFwiKSB7XHJcblx0XHRjb25zdCB1bml0ID0gdGhpcy5nZXRWaWV3VW5pdCgpO1xyXG5cdFx0aWYgKGRpcmVjdGlvbiA9PT0gXCJwcmV2XCIpIHtcclxuXHRcdFx0dGhpcy5jdXJyZW50RGF0ZS5zdWJ0cmFjdCgxLCB1bml0KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMuY3VycmVudERhdGUuYWRkKDEsIHVuaXQpO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5yZW5kZXIoKTsgLy8gUmUtcmVuZGVyIGhlYWRlciBhbmQgdXBkYXRlIHRoZSB2aWV3XHJcblxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTmF2aWdhdGVzIHRoZSBjYWxlbmRhciB2aWV3IHRvIHRvZGF5LlxyXG5cdCAqL1xyXG5cdGdvVG9Ub2RheSgpIHtcclxuXHRcdHRoaXMuY3VycmVudERhdGUgPSBtb21lbnQoKTtcclxuXHRcdHRoaXMucmVuZGVyKCk7IC8vIFJlLXJlbmRlciBoZWFkZXIgYW5kIHVwZGF0ZSB0aGUgdmlld1xyXG5cdH1cclxuXHJcblx0Ly8gLS0tIEludGVybmFsIFJlbmRlcmluZyBMb2dpYyAtLS1cclxuXHJcblx0LyoqXHJcblx0ICogUmVuZGVycyB0aGUgZW50aXJlIGNvbXBvbmVudCAoaGVhZGVyIGFuZCB2aWV3KS5cclxuXHQgKiBFbnN1cmVzIHZpZXcgaW5zdGFuY2VzIGFyZSByZWFkeS5cclxuXHQgKi9cclxuXHRwcml2YXRlIHJlbmRlcigpIHtcclxuXHRcdHRoaXMucmVuZGVySGVhZGVyKCk7XHJcblx0XHR0aGlzLnJlbmRlckN1cnJlbnRWaWV3KCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBzZXRUYXNrc1xyXG5cdCAqIEBwYXJhbSB0YXNrcyAtIFRoZSB0YXNrcyB0byBkaXNwbGF5IGluIHRoZSBjYWxlbmRhci5cclxuXHQgKi9cclxuXHRwdWJsaWMgc2V0VGFza3ModGFza3M6IFRhc2tbXSkge1xyXG5cdFx0dGhpcy50YXNrcyA9IHRhc2tzO1xyXG5cdFx0Ly8gQ2xlYXIgYmFkZ2UgY2FjaGUgd2hlbiB0YXNrcyBjaGFuZ2VcclxuXHRcdHRoaXMuaW52YWxpZGF0ZUJhZGdlRXZlbnRzQ2FjaGUoKTtcclxuXHRcdHRoaXMucHJvY2Vzc1Rhc2tzKCk7XHJcblx0XHR0aGlzLnJlbmRlcigpOyAvLyBSZS1yZW5kZXIgaGVhZGVyIGFuZCB1cGRhdGUgdGhlIHZpZXdcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbmRlcnMgdGhlIGhlYWRlciBzZWN0aW9uIHdpdGggbmF2aWdhdGlvbiBhbmQgdmlldyBjb250cm9scy5cclxuXHQgKi9cclxuXHRwcml2YXRlIHJlbmRlckhlYWRlcigpIHtcclxuXHRcdHRoaXMuaGVhZGVyRWwuZW1wdHkoKTsgLy8gQ2xlYXIgcHJldmlvdXMgaGVhZGVyXHJcblxyXG5cdFx0Ly8gTmF2aWdhdGlvbiBidXR0b25zXHJcblx0XHRjb25zdCBuYXZHcm91cCA9IHRoaXMuaGVhZGVyRWwuY3JlYXRlRGl2KFwiY2FsZW5kYXItbmF2XCIpO1xyXG5cclxuXHRcdC8vIFByZXZpb3VzIGJ1dHRvblxyXG5cdFx0Y29uc3QgcHJldkJ1dHRvbiA9IG5ldyBCdXR0b25Db21wb25lbnQobmF2R3JvdXAuY3JlYXRlRGl2KCkpO1xyXG5cdFx0cHJldkJ1dHRvbi5idXR0b25FbC50b2dnbGVDbGFzcyhcclxuXHRcdFx0W1wiY2FsZW5kYXItbmF2LWJ1dHRvblwiLCBcInByZXYtYnV0dG9uXCJdLFxyXG5cdFx0XHR0cnVlXHJcblx0XHQpO1xyXG5cdFx0cHJldkJ1dHRvbi5zZXRJY29uKFwiY2hldnJvbi1sZWZ0XCIpO1xyXG5cdFx0cHJldkJ1dHRvbi5vbkNsaWNrKCgpID0+IHRoaXMubmF2aWdhdGUoXCJwcmV2XCIpKTtcclxuXHJcblx0XHQvLyBUb2RheSBidXR0b25cclxuXHRcdGNvbnN0IHRvZGF5QnV0dG9uID0gbmV3IEJ1dHRvbkNvbXBvbmVudChuYXZHcm91cC5jcmVhdGVEaXYoKSk7XHJcblx0XHR0b2RheUJ1dHRvbi5idXR0b25FbC50b2dnbGVDbGFzcyhcclxuXHRcdFx0W1wiY2FsZW5kYXItbmF2LWJ1dHRvblwiLCBcInRvZGF5LWJ1dHRvblwiXSxcclxuXHRcdFx0dHJ1ZVxyXG5cdFx0KTtcclxuXHRcdHRvZGF5QnV0dG9uLnNldEJ1dHRvblRleHQodChcIlRvZGF5XCIpKTtcclxuXHRcdHRvZGF5QnV0dG9uLm9uQ2xpY2soKCkgPT4gdGhpcy5nb1RvVG9kYXkoKSk7XHJcblxyXG5cdFx0Ly8gTmV4dCBidXR0b25cclxuXHRcdGNvbnN0IG5leHRCdXR0b24gPSBuZXcgQnV0dG9uQ29tcG9uZW50KG5hdkdyb3VwLmNyZWF0ZURpdigpKTtcclxuXHRcdG5leHRCdXR0b24uYnV0dG9uRWwudG9nZ2xlQ2xhc3MoXHJcblx0XHRcdFtcImNhbGVuZGFyLW5hdi1idXR0b25cIiwgXCJuZXh0LWJ1dHRvblwiXSxcclxuXHRcdFx0dHJ1ZVxyXG5cdFx0KTtcclxuXHRcdG5leHRCdXR0b24uc2V0SWNvbihcImNoZXZyb24tcmlnaHRcIik7XHJcblx0XHRuZXh0QnV0dG9uLm9uQ2xpY2soKCkgPT4gdGhpcy5uYXZpZ2F0ZShcIm5leHRcIikpO1xyXG5cclxuXHRcdC8vIEN1cnJlbnQgZGF0ZSBkaXNwbGF5XHJcblx0XHRjb25zdCBjdXJyZW50RGlzcGxheSA9IHRoaXMuaGVhZGVyRWwuY3JlYXRlU3BhbihcclxuXHRcdFx0XCJjYWxlbmRhci1jdXJyZW50LWRhdGVcIlxyXG5cdFx0KTtcclxuXHRcdGN1cnJlbnREaXNwbGF5LnRleHRDb250ZW50ID0gdGhpcy5nZXRDdXJyZW50RGF0ZURpc3BsYXkoKTtcclxuXHJcblx0XHQvLyBWaWV3IG1vZGUgc3dpdGNoZXIgKGV4YW1wbGUgdXNpbmcgYnV0dG9ucylcclxuXHRcdGNvbnN0IHZpZXdHcm91cCA9IHRoaXMuaGVhZGVyRWwuY3JlYXRlRGl2KFwiY2FsZW5kYXItdmlldy1zd2l0Y2hlclwiKTtcclxuXHRcdGNvbnN0IG1vZGVzOiBDYWxlbmRhclZpZXdNb2RlW10gPSBbXHJcblx0XHRcdFwieWVhclwiLFxyXG5cdFx0XHRcIm1vbnRoXCIsXHJcblx0XHRcdFwid2Vla1wiLFxyXG5cdFx0XHRcImRheVwiLFxyXG5cdFx0XHRcImFnZW5kYVwiLFxyXG5cdFx0XTtcclxuXHRcdG1vZGVzLmZvckVhY2goKG1vZGUpID0+IHtcclxuXHRcdFx0Y29uc3QgYnV0dG9uID0gdmlld0dyb3VwLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0XHR0ZXh0OiB7XHJcblx0XHRcdFx0XHR5ZWFyOiB0KFwiWWVhclwiKSxcclxuXHRcdFx0XHRcdG1vbnRoOiB0KFwiTW9udGhcIiksXHJcblx0XHRcdFx0XHR3ZWVrOiB0KFwiV2Vla1wiKSxcclxuXHRcdFx0XHRcdGRheTogdChcIkRheVwiKSxcclxuXHRcdFx0XHRcdGFnZW5kYTogdChcIkFnZW5kYVwiKSxcclxuXHRcdFx0XHR9W21vZGVdLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0aWYgKG1vZGUgPT09IHRoaXMuY3VycmVudFZpZXdNb2RlKSB7XHJcblx0XHRcdFx0YnV0dG9uLmFkZENsYXNzKFwiaXMtYWN0aXZlXCIpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGJ1dHRvbi5vbmNsaWNrID0gKCkgPT4gdGhpcy5zZXRWaWV3KG1vZGUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dmlld0dyb3VwLmNyZWF0ZUVsKFxyXG5cdFx0XHRcImRpdlwiLFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0Y2xzOiBcImNhbGVuZGFyLXZpZXctc3dpdGNoZXItc2VsZWN0b3JcIixcclxuXHRcdFx0fSxcclxuXHRcdFx0KGVsKSA9PiB7XHJcblx0XHRcdFx0bmV3IERyb3Bkb3duQ29tcG9uZW50KGVsKVxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcInllYXJcIiwgdChcIlllYXJcIikpXHJcblx0XHRcdFx0XHQuYWRkT3B0aW9uKFwibW9udGhcIiwgdChcIk1vbnRoXCIpKVxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcIndlZWtcIiwgdChcIldlZWtcIikpXHJcblx0XHRcdFx0XHQuYWRkT3B0aW9uKFwiZGF5XCIsIHQoXCJEYXlcIikpXHJcblx0XHRcdFx0XHQuYWRkT3B0aW9uKFwiYWdlbmRhXCIsIHQoXCJBZ2VuZGFcIikpXHJcblx0XHRcdFx0XHQub25DaGFuZ2UoKHZhbHVlKSA9PlxyXG5cdFx0XHRcdFx0XHR0aGlzLnNldFZpZXcodmFsdWUgYXMgQ2FsZW5kYXJWaWV3TW9kZSlcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZSh0aGlzLmN1cnJlbnRWaWV3TW9kZSk7XHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW5kZXJzIHRoZSBjdXJyZW50bHkgc2VsZWN0ZWQgdmlldyAoTW9udGgsIERheSwgQWdlbmRhLCBldGMuKS5cclxuXHQgKiBNYW5hZ2VzIGF0dGFjaGluZy9kZXRhY2hpbmcgdGhlIGFjdGl2ZSB2aWV3IGNvbXBvbmVudC5cclxuXHQgKi9cclxuXHRwcml2YXRlIHJlbmRlckN1cnJlbnRWaWV3KCkge1xyXG5cdFx0Ly8gRGV0ZXJtaW5lIHdoaWNoIHZpZXcgY29tcG9uZW50IHNob3VsZCBiZSBhY3RpdmVcclxuXHRcdGxldCBuZXh0Vmlld0NvbXBvbmVudDogQ2FsZW5kYXJWaWV3IHwgbnVsbCA9IG51bGw7XHJcblx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XCJSZW5kZXJpbmcgY3VycmVudCB2aWV3OlwiLFxyXG5cdFx0XHR0aGlzLmN1cnJlbnRWaWV3TW9kZSxcclxuXHRcdFx0dGhpcy5wYXJhbXMsXHJcblx0XHRcdHRoaXMucGFyYW1zPy5vblRhc2tTZWxlY3RlZFxyXG5cdFx0KTtcclxuXHRcdHN3aXRjaCAodGhpcy5jdXJyZW50Vmlld01vZGUpIHtcclxuXHRcdFx0Y2FzZSBcIm1vbnRoXCI6XHJcblx0XHRcdFx0Y29uc3QgZWZmTW9udGggPSB0aGlzLmdldEVmZmVjdGl2ZUNhbGVuZGFyQ29uZmlnKCk7XHJcblx0XHRcdFx0bmV4dFZpZXdDb21wb25lbnQgPSBuZXcgTW9udGhWaWV3KFxyXG5cdFx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0XHRcdHRoaXMudmlld0NvbnRhaW5lckVsLFxyXG5cdFx0XHRcdFx0dGhpcy52aWV3SWQsXHJcblx0XHRcdFx0XHR0aGlzLmN1cnJlbnREYXRlLFxyXG5cdFx0XHRcdFx0dGhpcy5ldmVudHMsXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG9uRXZlbnRDbGljazogdGhpcy5vbkV2ZW50Q2xpY2ssXHJcblx0XHRcdFx0XHRcdG9uRXZlbnRIb3ZlcjogdGhpcy5vbkV2ZW50SG92ZXIsXHJcblx0XHRcdFx0XHRcdG9uRGF5Q2xpY2s6IHRoaXMub25EYXlDbGljayxcclxuXHRcdFx0XHRcdFx0b25EYXlIb3ZlcjogdGhpcy5vbkRheUhvdmVyLFxyXG5cdFx0XHRcdFx0XHRvbkV2ZW50Q29udGV4dE1lbnU6IHRoaXMub25FdmVudENvbnRleHRNZW51LFxyXG5cdFx0XHRcdFx0XHRvbkV2ZW50Q29tcGxldGU6IHRoaXMub25FdmVudENvbXBsZXRlLFxyXG5cdFx0XHRcdFx0XHRnZXRCYWRnZUV2ZW50c0ZvckRhdGU6XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5nZXRCYWRnZUV2ZW50c0ZvckRhdGUuYmluZCh0aGlzKSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRlZmZNb250aFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgXCJ3ZWVrXCI6XHJcblx0XHRcdFx0Y29uc3QgZWZmV2VlayA9IHRoaXMuZ2V0RWZmZWN0aXZlQ2FsZW5kYXJDb25maWcoKTtcclxuXHRcdFx0XHRuZXh0Vmlld0NvbXBvbmVudCA9IG5ldyBXZWVrVmlldyhcclxuXHRcdFx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdFx0XHR0aGlzLnZpZXdDb250YWluZXJFbCxcclxuXHRcdFx0XHRcdHRoaXMudmlld0lkLFxyXG5cdFx0XHRcdFx0dGhpcy5jdXJyZW50RGF0ZSxcclxuXHRcdFx0XHRcdHRoaXMuZXZlbnRzLFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRvbkV2ZW50Q2xpY2s6IHRoaXMub25FdmVudENsaWNrLFxyXG5cdFx0XHRcdFx0XHRvbkV2ZW50SG92ZXI6IHRoaXMub25FdmVudEhvdmVyLFxyXG5cdFx0XHRcdFx0XHRvbkRheUNsaWNrOiB0aGlzLm9uRGF5Q2xpY2ssXHJcblx0XHRcdFx0XHRcdG9uRGF5SG92ZXI6IHRoaXMub25EYXlIb3ZlcixcclxuXHRcdFx0XHRcdFx0b25FdmVudENvbnRleHRNZW51OiB0aGlzLm9uRXZlbnRDb250ZXh0TWVudSxcclxuXHRcdFx0XHRcdFx0b25FdmVudENvbXBsZXRlOiB0aGlzLm9uRXZlbnRDb21wbGV0ZSxcclxuXHRcdFx0XHRcdFx0Z2V0QmFkZ2VFdmVudHNGb3JEYXRlOlxyXG5cdFx0XHRcdFx0XHRcdHRoaXMuZ2V0QmFkZ2VFdmVudHNGb3JEYXRlLmJpbmQodGhpcyksXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0ZWZmV2Vla1xyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgXCJkYXlcIjpcclxuXHRcdFx0XHRuZXh0Vmlld0NvbXBvbmVudCA9IG5ldyBEYXlWaWV3KFxyXG5cdFx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0XHRcdHRoaXMudmlld0NvbnRhaW5lckVsLFxyXG5cdFx0XHRcdFx0dGhpcy5jdXJyZW50RGF0ZSxcclxuXHRcdFx0XHRcdHRoaXMuZXZlbnRzLFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRvbkV2ZW50Q2xpY2s6IHRoaXMub25FdmVudENsaWNrLFxyXG5cdFx0XHRcdFx0XHRvbkV2ZW50SG92ZXI6IHRoaXMub25FdmVudEhvdmVyLFxyXG5cdFx0XHRcdFx0XHRvbkV2ZW50Q29udGV4dE1lbnU6IHRoaXMub25FdmVudENvbnRleHRNZW51LFxyXG5cdFx0XHRcdFx0XHRvbkV2ZW50Q29tcGxldGU6IHRoaXMub25FdmVudENvbXBsZXRlLFxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgXCJhZ2VuZGFcIjpcclxuXHRcdFx0XHRuZXh0Vmlld0NvbXBvbmVudCA9IG5ldyBBZ2VuZGFWaWV3KFxyXG5cdFx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0XHRcdHRoaXMudmlld0NvbnRhaW5lckVsLFxyXG5cdFx0XHRcdFx0dGhpcy5jdXJyZW50RGF0ZSxcclxuXHRcdFx0XHRcdHRoaXMuZXZlbnRzLFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRvbkV2ZW50Q2xpY2s6IHRoaXMub25FdmVudENsaWNrLFxyXG5cdFx0XHRcdFx0XHRvbkV2ZW50SG92ZXI6IHRoaXMub25FdmVudEhvdmVyLFxyXG5cdFx0XHRcdFx0XHRvbkV2ZW50Q29udGV4dE1lbnU6IHRoaXMub25FdmVudENvbnRleHRNZW51LFxyXG5cdFx0XHRcdFx0XHRvbkV2ZW50Q29tcGxldGU6IHRoaXMub25FdmVudENvbXBsZXRlLFxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgXCJ5ZWFyXCI6XHJcblx0XHRcdFx0Y29uc3QgZWZmWWVhciA9IHRoaXMuZ2V0RWZmZWN0aXZlQ2FsZW5kYXJDb25maWcoKTtcclxuXHRcdFx0XHRuZXh0Vmlld0NvbXBvbmVudCA9IG5ldyBZZWFyVmlldyhcclxuXHRcdFx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdFx0XHR0aGlzLnZpZXdDb250YWluZXJFbCxcclxuXHRcdFx0XHRcdHRoaXMuY3VycmVudERhdGUsXHJcblx0XHRcdFx0XHR0aGlzLmV2ZW50cyxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0b25FdmVudENsaWNrOiB0aGlzLm9uRXZlbnRDbGljayxcclxuXHRcdFx0XHRcdFx0b25FdmVudEhvdmVyOiB0aGlzLm9uRXZlbnRIb3ZlcixcclxuXHRcdFx0XHRcdFx0b25EYXlDbGljazogdGhpcy5vbkRheUNsaWNrLFxyXG5cdFx0XHRcdFx0XHRvbkRheUhvdmVyOiB0aGlzLm9uRGF5SG92ZXIsXHJcblx0XHRcdFx0XHRcdG9uTW9udGhDbGljazogdGhpcy5vbk1vbnRoQ2xpY2ssXHJcblx0XHRcdFx0XHRcdG9uTW9udGhIb3ZlcjogdGhpcy5vbk1vbnRoSG92ZXIsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0ZWZmWWVhclxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0dGhpcy52aWV3Q29udGFpbmVyRWwuZW1wdHkoKTsgLy8gQ2xlYXIgY29udGFpbmVyIGlmIHZpZXcgaXMgdW5rbm93blxyXG5cdFx0XHRcdHRoaXMudmlld0NvbnRhaW5lckVsLnNldFRleHQoXHJcblx0XHRcdFx0XHRgVmlldyBtb2RlIFwiJHt0aGlzLmN1cnJlbnRWaWV3TW9kZX1cIiBub3QgaW1wbGVtZW50ZWQgeWV0LmBcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdG5leHRWaWV3Q29tcG9uZW50ID0gbnVsbDsgLy8gRW5zdXJlIG5vIHZpZXcgaXMgYWN0aXZlXHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgdGhlIHZpZXcgbmVlZHMgdG8gYmUgc3dpdGNoZWRcclxuXHRcdGlmICh0aGlzLmFjdGl2ZVZpZXdDb21wb25lbnQgIT09IG5leHRWaWV3Q29tcG9uZW50KSB7XHJcblx0XHRcdC8vIERldGFjaCB0aGUgb2xkIHZpZXcgaWYgaXQgZXhpc3RzXHJcblx0XHRcdGlmICh0aGlzLmFjdGl2ZVZpZXdDb21wb25lbnQpIHtcclxuXHRcdFx0XHR0aGlzLnJlbW92ZUNoaWxkKHRoaXMuYWN0aXZlVmlld0NvbXBvbmVudCk7IC8vIFByb3Blcmx5IHVubG9hZCBhbmQgZGV0YWNoIHRoZSBjb21wb25lbnRcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQXR0YWNoIHRoZSBuZXcgdmlldyBpZiBpdCBleGlzdHNcclxuXHRcdFx0aWYgKG5leHRWaWV3Q29tcG9uZW50KSB7XHJcblx0XHRcdFx0dGhpcy5hY3RpdmVWaWV3Q29tcG9uZW50ID0gbmV4dFZpZXdDb21wb25lbnQ7XHJcblx0XHRcdFx0dGhpcy5hZGRDaGlsZCh0aGlzLmFjdGl2ZVZpZXdDb21wb25lbnQpOyAvLyBMb2FkIGFuZCBhdHRhY2ggdGhlIG5ldyBjb21wb25lbnRcclxuXHRcdFx0XHQvLyBQcmUtY29tcHV0ZSBiYWRnZSBldmVudHMgZm9yIGJldHRlciBwZXJmb3JtYW5jZVxyXG5cdFx0XHRcdHRoaXMucHJlY29tcHV0ZUJhZGdlRXZlbnRzRm9yQ3VycmVudFZpZXcoKTtcclxuXHRcdFx0XHQvLyBVcGRhdGUgdGhlIG5ld2x5IGFjdGl2YXRlZCB2aWV3IHdpdGggY3VycmVudCBkYXRhXHJcblx0XHRcdFx0dGhpcy5hY3RpdmVWaWV3Q29tcG9uZW50LnVwZGF0ZUV2ZW50cyh0aGlzLmV2ZW50cyk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGhpcy5hY3RpdmVWaWV3Q29tcG9uZW50ID0gbnVsbDsgLy8gTm8gdmlldyBpcyBhY3RpdmVcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIGlmICh0aGlzLmFjdGl2ZVZpZXdDb21wb25lbnQpIHtcclxuXHRcdFx0Ly8gSWYgdGhlIHZpZXcgaXMgdGhlIHNhbWUsIGp1c3QgdXBkYXRlIGl0IHdpdGggcG90ZW50aWFsbHkgbmV3IGRhdGUvZXZlbnRzXHJcblx0XHRcdC8vIFByZS1jb21wdXRlIGJhZGdlIGV2ZW50cyBmb3IgYmV0dGVyIHBlcmZvcm1hbmNlXHJcblx0XHRcdHRoaXMucHJlY29tcHV0ZUJhZGdlRXZlbnRzRm9yQ3VycmVudFZpZXcoKTtcclxuXHRcdFx0dGhpcy5hY3RpdmVWaWV3Q29tcG9uZW50LnVwZGF0ZUV2ZW50cyh0aGlzLmV2ZW50cyk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVXBkYXRlIGNvbnRhaW5lciBjbGFzcyBmb3Igc3R5bGluZyBwdXJwb3Nlc1xyXG5cdFx0dGhpcy52aWV3Q29udGFpbmVyRWwucmVtb3ZlQ2xhc3MoXHJcblx0XHRcdFwidmlldy15ZWFyXCIsXHJcblx0XHRcdFwidmlldy1tb250aFwiLFxyXG5cdFx0XHRcInZpZXctd2Vla1wiLFxyXG5cdFx0XHRcInZpZXctZGF5XCIsXHJcblx0XHRcdFwidmlldy1hZ2VuZGFcIlxyXG5cdFx0KTtcclxuXHRcdGlmICh0aGlzLmFjdGl2ZVZpZXdDb21wb25lbnQpIHtcclxuXHRcdFx0dGhpcy52aWV3Q29udGFpbmVyRWwuYWRkQ2xhc3MoYHZpZXctJHt0aGlzLmN1cnJlbnRWaWV3TW9kZX1gKTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XCJSZW5kZXJpbmcgY3VycmVudCB2aWV3OlwiLFxyXG5cdFx0XHR0aGlzLmN1cnJlbnRWaWV3TW9kZSxcclxuXHRcdFx0XCJBY3RpdmUgY29tcG9uZW50OlwiLFxyXG5cdFx0XHR0aGlzLmFjdGl2ZVZpZXdDb21wb25lbnRcclxuXHRcdFx0XHQ/IHRoaXMuYWN0aXZlVmlld0NvbXBvbmVudC5jb25zdHJ1Y3Rvci5uYW1lXHJcblx0XHRcdFx0OiBcIk5vbmVcIlxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFByb2Nlc3NlcyB0aGUgcmF3IHRhc2tzIGludG8gY2FsZW5kYXIgZXZlbnRzLlxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgcHJvY2Vzc1Rhc2tzKCkge1xyXG5cdFx0dGhpcy5ldmVudHMgPSBbXTtcclxuXHRcdC8vIENsZWFyIGJhZGdlIGNhY2hlIHdoZW4gcHJvY2Vzc2luZyB0YXNrc1xyXG5cdFx0dGhpcy5pbnZhbGlkYXRlQmFkZ2VFdmVudHNDYWNoZSgpO1xyXG5cdFx0Y29uc3QgcHJpbWFyeURhdGVGaWVsZCA9IFwiZHVlRGF0ZVwiOyAvLyBUT0RPOiBNYWtlIHRoaXMgY29uZmlndXJhYmxlIHZpYSBzZXR0aW5nc1xyXG5cclxuXHRcdC8vIFByb2Nlc3MgdGFza3NcclxuXHRcdHRoaXMudGFza3MuZm9yRWFjaCgodGFzaykgPT4ge1xyXG5cdFx0XHQvLyBDaGVjayBpZiB0aGlzIGlzIGFuIElDUyB0YXNrIHdpdGggYmFkZ2Ugc2hvd1R5cGVcclxuXHRcdFx0Y29uc3QgaXNJY3NUYXNrID0gKHRhc2sgYXMgYW55KS5zb3VyY2U/LnR5cGUgPT09IFwiaWNzXCI7XHJcblx0XHRcdGNvbnN0IGljc1Rhc2sgPSBpc0ljc1Rhc2sgPyAodGFzayBhcyBJY3NUYXNrKSA6IG51bGw7IC8vIFR5cGUgYXNzZXJ0aW9uIGZvciBJY3NUYXNrXHJcblx0XHRcdGNvbnN0IHNob3dBc0JhZGdlID0gaWNzVGFzaz8uaWNzRXZlbnQ/LnNvdXJjZT8uc2hvd1R5cGUgPT09IFwiYmFkZ2VcIjtcclxuXHJcblx0XHRcdC8vIElmIElDUyBpcyBjb25maWd1cmVkIGFzIGJhZGdlLCBkbyBOT1QgYWRkIGEgZnVsbCBldmVudDsgYmFkZ2VzIHdpbGwgYmVcclxuXHRcdFx0Ly8gcHJvdmlkZWQgdmlhIGdldEJhZGdlRXZlbnRzRm9yRGF0ZSBmcm9tIHRoZSByYXcgdGFza3MgbGlzdCB0byBhdm9pZCBkdXBsaWNhdGlvbi5cclxuXHRcdFx0aWYgKGlzSWNzVGFzayAmJiBzaG93QXNCYWRnZSkge1xyXG5cdFx0XHRcdHJldHVybjsgLy8gc2tpcCBhZGRpbmcgdG8gdGhpcy5ldmVudHNcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gRGV0ZXJtaW5lIHRoZSBkYXRlIHRvIHVzZSBiYXNlZCBvbiBwcmlvcml0eSAoZHVlRGF0ZSA+IHNjaGVkdWxlZERhdGUgPiBzdGFydERhdGUpXHJcblx0XHRcdGxldCBldmVudERhdGU6IG51bWJlciB8IG51bGwgPSBudWxsO1xyXG5cdFx0XHRsZXQgaXNBbGxEYXkgPSB0cnVlOyAvLyBBc3N1bWUgdGFza3MgYXJlIGFsbC1kYXkgdW5sZXNzIHRpbWUgaW5mbyBleGlzdHNcclxuXHJcblx0XHRcdC8vIEZvciBJQ1MgdGFza3MsIHVzZSB0aGUgSUNTIGV2ZW50IGRhdGVzIGRpcmVjdGx5XHJcblx0XHRcdGlmIChpc0ljc1Rhc2sgJiYgaWNzVGFzaz8uaWNzRXZlbnQpIHtcclxuXHRcdFx0XHRldmVudERhdGUgPSBpY3NUYXNrLmljc0V2ZW50LmR0c3RhcnQuZ2V0VGltZSgpO1xyXG5cdFx0XHRcdGlzQWxsRGF5ID0gaWNzVGFzay5pY3NFdmVudC5hbGxEYXk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0aWYgKHRhc2subWV0YWRhdGFbcHJpbWFyeURhdGVGaWVsZF0pIHtcclxuXHRcdFx0XHRcdGV2ZW50RGF0ZSA9IHRhc2subWV0YWRhdGFbcHJpbWFyeURhdGVGaWVsZF07XHJcblx0XHRcdFx0fSBlbHNlIGlmICh0YXNrLm1ldGFkYXRhLnNjaGVkdWxlZERhdGUpIHtcclxuXHRcdFx0XHRcdGV2ZW50RGF0ZSA9IHRhc2subWV0YWRhdGEuc2NoZWR1bGVkRGF0ZTtcclxuXHRcdFx0XHR9IGVsc2UgaWYgKHRhc2subWV0YWRhdGEuc3RhcnREYXRlKSB7XHJcblx0XHRcdFx0XHRldmVudERhdGUgPSB0YXNrLm1ldGFkYXRhLnN0YXJ0RGF0ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChldmVudERhdGUpIHtcclxuXHRcdFx0XHRjb25zdCBzdGFydE1vbWVudCA9IG1vbWVudChldmVudERhdGUpO1xyXG5cdFx0XHRcdGNvbnN0IHN0YXJ0ID0gaXNBbGxEYXlcclxuXHRcdFx0XHRcdD8gc3RhcnRNb21lbnQuc3RhcnRPZihcImRheVwiKS50b0RhdGUoKVxyXG5cdFx0XHRcdFx0OiBzdGFydE1vbWVudC50b0RhdGUoKTtcclxuXHJcblx0XHRcdFx0bGV0IGVuZDogRGF0ZSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcclxuXHRcdFx0XHRsZXQgZWZmZWN0aXZlU3RhcnQgPSBzdGFydDsgLy8gVXNlIHRoZSBwcmltYXJ5IGRhdGUgYXMgc3RhcnQgYnkgZGVmYXVsdFxyXG5cclxuXHRcdFx0XHRpZiAoaXNJY3NUYXNrICYmIGljc1Rhc2s/Lmljc0V2ZW50Py5kdGVuZCkge1xyXG5cdFx0XHRcdFx0ZW5kID0gaWNzVGFzay5pY3NFdmVudC5kdGVuZDtcclxuXHRcdFx0XHR9IGVsc2UgaWYgKFxyXG5cdFx0XHRcdFx0dGFzay5tZXRhZGF0YS5zdGFydERhdGUgJiZcclxuXHRcdFx0XHRcdHRhc2subWV0YWRhdGEuZHVlRGF0ZSAmJlxyXG5cdFx0XHRcdFx0dGFzay5tZXRhZGF0YS5zdGFydERhdGUgIT09IHRhc2subWV0YWRhdGEuZHVlRGF0ZVxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0Y29uc3Qgc01vbWVudCA9IG1vbWVudCh0YXNrLm1ldGFkYXRhLnN0YXJ0RGF0ZSkuc3RhcnRPZihcImRheVwiKTtcclxuXHRcdFx0XHRcdGNvbnN0IGRNb21lbnQgPSBtb21lbnQodGFzay5tZXRhZGF0YS5kdWVEYXRlKS5zdGFydE9mKFwiZGF5XCIpO1xyXG5cdFx0XHRcdFx0aWYgKHNNb21lbnQuaXNCZWZvcmUoZE1vbWVudCkpIHtcclxuXHRcdFx0XHRcdFx0ZW5kID0gZE1vbWVudC5hZGQoMSwgXCJkYXlcIikudG9EYXRlKCk7XHJcblx0XHRcdFx0XHRcdGVmZmVjdGl2ZVN0YXJ0ID0gc01vbWVudC50b0RhdGUoKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGxldCBldmVudENvbG9yOiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcblx0XHRcdFx0aWYgKGlzSWNzVGFzayAmJiBpY3NUYXNrPy5pY3NFdmVudD8uc291cmNlPy5jb2xvcikge1xyXG5cdFx0XHRcdFx0ZXZlbnRDb2xvciA9IGljc1Rhc2suaWNzRXZlbnQuc291cmNlLmNvbG9yO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRldmVudENvbG9yID0gdGFzay5jb21wbGV0ZWQgPyBcImdyZXlcIiA6IHVuZGVmaW5lZDtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHRoaXMuZXZlbnRzLnB1c2goe1xyXG5cdFx0XHRcdFx0Li4udGFzayxcclxuXHRcdFx0XHRcdHRpdGxlOiB0YXNrLmNvbnRlbnQsXHJcblx0XHRcdFx0XHRzdGFydDogZWZmZWN0aXZlU3RhcnQsXHJcblx0XHRcdFx0XHRlbmQ6IGVuZCxcclxuXHRcdFx0XHRcdGFsbERheTogaXNBbGxEYXksXHJcblx0XHRcdFx0XHRjb2xvcjogZXZlbnRDb2xvcixcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gU29ydCBldmVudHMgZm9yIHBvdGVudGlhbGx5IGVhc2llciByZW5kZXJpbmcgbGF0ZXIgKGUuZy4sIGFnZW5kYSlcclxuXHRcdHRoaXMuZXZlbnRzLnNvcnQoKGEsIGIpID0+IGEuc3RhcnQuZ2V0VGltZSgpIC0gYi5zdGFydC5nZXRUaW1lKCkpO1xyXG5cclxuXHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRgUHJvY2Vzc2VkICR7dGhpcy5ldmVudHMubGVuZ3RofSBldmVudHMgZnJvbSAke3RoaXMudGFza3MubGVuZ3RofSB0YXNrcyAoaW5jbHVkaW5nIElDUyBldmVudHMgYXMgdGFza3MpLmBcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBJbnZhbGlkYXRlIHRoZSBiYWRnZSBldmVudHMgY2FjaGVcclxuXHQgKi9cclxuXHRwcml2YXRlIGludmFsaWRhdGVCYWRnZUV2ZW50c0NhY2hlKCk6IHZvaWQge1xyXG5cdFx0dGhpcy5iYWRnZUV2ZW50c0NhY2hlLmNsZWFyKCk7XHJcblx0XHR0aGlzLmJhZGdlRXZlbnRzQ2FjaGVWZXJzaW9uKys7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBQcmUtY29tcHV0ZSBiYWRnZSBldmVudHMgZm9yIGEgZGF0ZSByYW5nZSB0byBvcHRpbWl6ZSBwZXJmb3JtYW5jZVxyXG5cdCAqIFRoaXMgcmVwbGFjZXMgdGhlIHBlci1kYXRlIGZpbHRlcmluZyB3aXRoIGEgc2luZ2xlIHBhc3MgdGhyb3VnaCBhbGwgdGFza3NcclxuXHQgKi9cclxuXHRwcml2YXRlIHByZWNvbXB1dGVCYWRnZUV2ZW50c0ZvclJhbmdlKFxyXG5cdFx0c3RhcnREYXRlOiBEYXRlLFxyXG5cdFx0ZW5kRGF0ZTogRGF0ZVxyXG5cdCk6IHZvaWQge1xyXG5cdFx0Ly8gQ29udmVydCBkYXRlcyB0byBZWVlZLU1NLUREIGZvcm1hdCBmb3IgY29uc2lzdGVudCBjb21wYXJpc29uXHJcblx0XHRjb25zdCBmb3JtYXREYXRlS2V5ID0gKGRhdGU6IERhdGUpOiBzdHJpbmcgPT4ge1xyXG5cdFx0XHRjb25zdCB5ZWFyID0gZGF0ZS5nZXRGdWxsWWVhcigpO1xyXG5cdFx0XHRjb25zdCBtb250aCA9IFN0cmluZyhkYXRlLmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCBcIjBcIik7XHJcblx0XHRcdGNvbnN0IGRheSA9IFN0cmluZyhkYXRlLmdldERhdGUoKSkucGFkU3RhcnQoMiwgXCIwXCIpO1xyXG5cdFx0XHRyZXR1cm4gYCR7eWVhcn0tJHttb250aH0tJHtkYXl9YDtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gQ2xlYXIgZXhpc3RpbmcgY2FjaGUgZm9yIHRoZSByYW5nZVxyXG5cdFx0Y29uc3Qgc3RhcnRLZXkgPSBmb3JtYXREYXRlS2V5KHN0YXJ0RGF0ZSk7XHJcblx0XHRjb25zdCBlbmRLZXkgPSBmb3JtYXREYXRlS2V5KGVuZERhdGUpO1xyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgY2FjaGUgZW50cmllcyBmb3IgdGhlIGRhdGUgcmFuZ2VcclxuXHRcdGNvbnN0IGN1cnJlbnREYXRlID0gbmV3IERhdGUoc3RhcnREYXRlKTtcclxuXHRcdHdoaWxlIChjdXJyZW50RGF0ZSA8PSBlbmREYXRlKSB7XHJcblx0XHRcdGNvbnN0IGRhdGVLZXkgPSBmb3JtYXREYXRlS2V5KGN1cnJlbnREYXRlKTtcclxuXHRcdFx0dGhpcy5iYWRnZUV2ZW50c0NhY2hlLnNldChkYXRlS2V5LCBbXSk7XHJcblx0XHRcdGN1cnJlbnREYXRlLnNldERhdGUoY3VycmVudERhdGUuZ2V0RGF0ZSgpICsgMSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU2luZ2xlIHBhc3MgdGhyb3VnaCBhbGwgdGFza3MgdG8gcG9wdWxhdGUgY2FjaGVcclxuXHRcdHRoaXMudGFza3MuZm9yRWFjaCgodGFzaykgPT4ge1xyXG5cdFx0XHRjb25zdCBpc0ljc1Rhc2sgPSAodGFzayBhcyBhbnkpLnNvdXJjZT8udHlwZSA9PT0gXCJpY3NcIjtcclxuXHRcdFx0Y29uc3QgaWNzVGFzayA9IGlzSWNzVGFzayA/ICh0YXNrIGFzIEljc1Rhc2spIDogbnVsbDtcclxuXHRcdFx0Y29uc3Qgc2hvd0FzQmFkZ2UgPSBpY3NUYXNrPy5pY3NFdmVudD8uc291cmNlPy5zaG93VHlwZSA9PT0gXCJiYWRnZVwiO1xyXG5cclxuXHRcdFx0aWYgKGlzSWNzVGFzayAmJiBzaG93QXNCYWRnZSAmJiBpY3NUYXNrPy5pY3NFdmVudCkge1xyXG5cdFx0XHRcdC8vIFVzZSBuYXRpdmUgRGF0ZSBvcGVyYXRpb25zIGluc3RlYWQgb2YgbW9tZW50IGZvciBiZXR0ZXIgcGVyZm9ybWFuY2VcclxuXHRcdFx0XHRjb25zdCBldmVudERhdGUgPSBuZXcgRGF0ZShpY3NUYXNrLmljc0V2ZW50LmR0c3RhcnQpO1xyXG5cdFx0XHRcdC8vIE5vcm1hbGl6ZSB0byBzdGFydCBvZiBkYXkgZm9yIGNvbXBhcmlzb25cclxuXHRcdFx0XHRjb25zdCBldmVudERhdGVOb3JtYWxpemVkID0gbmV3IERhdGUoXHJcblx0XHRcdFx0XHRldmVudERhdGUuZ2V0RnVsbFllYXIoKSxcclxuXHRcdFx0XHRcdGV2ZW50RGF0ZS5nZXRNb250aCgpLFxyXG5cdFx0XHRcdFx0ZXZlbnREYXRlLmdldERhdGUoKVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0Y29uc3QgZXZlbnREYXRlS2V5ID0gZm9ybWF0RGF0ZUtleShldmVudERhdGVOb3JtYWxpemVkKTtcclxuXHJcblx0XHRcdFx0Ly8gQ2hlY2sgaWYgdGhlIGV2ZW50IGlzIHdpdGhpbiBvdXIgY2FjaGVkIHJhbmdlXHJcblx0XHRcdFx0aWYgKHRoaXMuYmFkZ2VFdmVudHNDYWNoZS5oYXMoZXZlbnREYXRlS2V5KSkge1xyXG5cdFx0XHRcdFx0Ly8gQ29udmVydCB0aGUgdGFzayB0byBhIENhbGVuZGFyRXZlbnQgZm9ybWF0IGZvciBjb25zaXN0ZW5jeVxyXG5cdFx0XHRcdFx0Y29uc3QgY2FsZW5kYXJFdmVudDogQ2FsZW5kYXJFdmVudCA9IHtcclxuXHRcdFx0XHRcdFx0Li4udGFzayxcclxuXHRcdFx0XHRcdFx0dGl0bGU6IHRhc2suY29udGVudCxcclxuXHRcdFx0XHRcdFx0c3RhcnQ6IGljc1Rhc2suaWNzRXZlbnQuZHRzdGFydCxcclxuXHRcdFx0XHRcdFx0ZW5kOiBpY3NUYXNrLmljc0V2ZW50LmR0ZW5kLFxyXG5cdFx0XHRcdFx0XHRhbGxEYXk6IGljc1Rhc2suaWNzRXZlbnQuYWxsRGF5LFxyXG5cdFx0XHRcdFx0XHRjb2xvcjogaWNzVGFzay5pY3NFdmVudC5zb3VyY2UuY29sb3IsXHJcblx0XHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRcdGNvbnN0IGV4aXN0aW5nRXZlbnRzID1cclxuXHRcdFx0XHRcdFx0dGhpcy5iYWRnZUV2ZW50c0NhY2hlLmdldChldmVudERhdGVLZXkpIHx8IFtdO1xyXG5cdFx0XHRcdFx0ZXhpc3RpbmdFdmVudHMucHVzaChjYWxlbmRhckV2ZW50KTtcclxuXHRcdFx0XHRcdHRoaXMuYmFkZ2VFdmVudHNDYWNoZS5zZXQoZXZlbnREYXRlS2V5LCBleGlzdGluZ0V2ZW50cyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0YFByZS1jb21wdXRlZCBiYWRnZSBldmVudHMgZm9yIHJhbmdlICR7c3RhcnRLZXl9IHRvICR7ZW5kS2V5fS4gQ2FjaGUgc2l6ZTogJHt0aGlzLmJhZGdlRXZlbnRzQ2FjaGUuc2l6ZX1gXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGJhZGdlIGV2ZW50cyBmb3IgYSBzcGVjaWZpYyBkYXRlIChvcHRpbWl6ZWQgdmVyc2lvbilcclxuXHQgKiBUaGVzZSBhcmUgSUNTIGV2ZW50cyB0aGF0IHNob3VsZCBiZSBkaXNwbGF5ZWQgYXMgYmFkZ2VzIChjb3VudCkgcmF0aGVyIHRoYW4gZnVsbCBldmVudHNcclxuXHQgKi9cclxuXHRwdWJsaWMgZ2V0QmFkZ2VFdmVudHNGb3JEYXRlKGRhdGU6IERhdGUpOiBDYWxlbmRhckV2ZW50W10ge1xyXG5cdFx0Ly8gVXNlIG5hdGl2ZSBEYXRlIG9wZXJhdGlvbnMgZm9yIGJldHRlciBwZXJmb3JtYW5jZVxyXG5cdFx0Y29uc3QgeWVhciA9IGRhdGUuZ2V0RnVsbFllYXIoKTtcclxuXHRcdGNvbnN0IG1vbnRoID0gZGF0ZS5nZXRNb250aCgpO1xyXG5cdFx0Y29uc3QgZGF5ID0gZGF0ZS5nZXREYXRlKCk7XHJcblx0XHRjb25zdCBub3JtYWxpemVkRGF0ZSA9IG5ldyBEYXRlKHllYXIsIG1vbnRoLCBkYXkpO1xyXG5cdFx0Y29uc3QgZGF0ZUtleSA9IGAke3llYXJ9LSR7U3RyaW5nKG1vbnRoICsgMSkucGFkU3RhcnQoMiwgXCIwXCIpfS0ke1N0cmluZyhcclxuXHRcdFx0ZGF5XHJcblx0XHQpLnBhZFN0YXJ0KDIsIFwiMFwiKX1gO1xyXG5cclxuXHRcdC8vIENoZWNrIGlmIHdlIGhhdmUgY2FjaGVkIGRhdGEgZm9yIHRoaXMgZGF0ZVxyXG5cdFx0aWYgKHRoaXMuYmFkZ2VFdmVudHNDYWNoZS5oYXMoZGF0ZUtleSkpIHtcclxuXHRcdFx0Y29uc3QgY2FjaGVkRXZlbnRzID0gdGhpcy5iYWRnZUV2ZW50c0NhY2hlLmdldChkYXRlS2V5KSB8fCBbXTtcclxuXHRcdFx0cmV0dXJuIGNhY2hlZEV2ZW50cztcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBiYWRnZUV2ZW50c0ZvckRhdGU6IENhbGVuZGFyRXZlbnRbXSA9IFtdO1xyXG5cclxuXHRcdHRoaXMudGFza3MuZm9yRWFjaCgodGFzaykgPT4ge1xyXG5cdFx0XHRjb25zdCBpc0ljc1Rhc2sgPSAodGFzayBhcyBhbnkpLnNvdXJjZT8udHlwZSA9PT0gXCJpY3NcIjtcclxuXHRcdFx0Y29uc3QgaWNzVGFzayA9IGlzSWNzVGFzayA/ICh0YXNrIGFzIEljc1Rhc2spIDogbnVsbDtcclxuXHRcdFx0Y29uc3Qgc2hvd0FzQmFkZ2UgPSBpY3NUYXNrPy5pY3NFdmVudD8uc291cmNlPy5zaG93VHlwZSA9PT0gXCJiYWRnZVwiO1xyXG5cclxuXHRcdFx0aWYgKGlzSWNzVGFzayAmJiBzaG93QXNCYWRnZSAmJiBpY3NUYXNrPy5pY3NFdmVudCkge1xyXG5cdFx0XHRcdC8vIFVzZSBuYXRpdmUgRGF0ZSBvcGVyYXRpb25zIGluc3RlYWQgb2YgbW9tZW50IGZvciBiZXR0ZXIgcGVyZm9ybWFuY2VcclxuXHRcdFx0XHRjb25zdCBldmVudERhdGUgPSBuZXcgRGF0ZShpY3NUYXNrLmljc0V2ZW50LmR0c3RhcnQpO1xyXG5cdFx0XHRcdGNvbnN0IGV2ZW50WWVhciA9IGV2ZW50RGF0ZS5nZXRGdWxsWWVhcigpO1xyXG5cdFx0XHRcdGNvbnN0IGV2ZW50TW9udGggPSBldmVudERhdGUuZ2V0TW9udGgoKTtcclxuXHRcdFx0XHRjb25zdCBldmVudERheSA9IGV2ZW50RGF0ZS5nZXREYXRlKCk7XHJcblxyXG5cdFx0XHRcdC8vIENoZWNrIGlmIHRoZSBldmVudCBpcyBvbiB0aGUgdGFyZ2V0IGRhdGUgdXNpbmcgbmF0aXZlIGNvbXBhcmlzb25cclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRldmVudFllYXIgPT09IHllYXIgJiZcclxuXHRcdFx0XHRcdGV2ZW50TW9udGggPT09IG1vbnRoICYmXHJcblx0XHRcdFx0XHRldmVudERheSA9PT0gZGF5XHJcblx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHQvLyBDb252ZXJ0IHRoZSB0YXNrIHRvIGEgQ2FsZW5kYXJFdmVudCBmb3JtYXQgZm9yIGNvbnNpc3RlbmN5XHJcblx0XHRcdFx0XHRjb25zdCBjYWxlbmRhckV2ZW50OiBDYWxlbmRhckV2ZW50ID0ge1xyXG5cdFx0XHRcdFx0XHQuLi50YXNrLFxyXG5cdFx0XHRcdFx0XHR0aXRsZTogdGFzay5jb250ZW50LFxyXG5cdFx0XHRcdFx0XHRzdGFydDogaWNzVGFzay5pY3NFdmVudC5kdHN0YXJ0LFxyXG5cdFx0XHRcdFx0XHRlbmQ6IGljc1Rhc2suaWNzRXZlbnQuZHRlbmQsXHJcblx0XHRcdFx0XHRcdGFsbERheTogaWNzVGFzay5pY3NFdmVudC5hbGxEYXksXHJcblx0XHRcdFx0XHRcdGNvbG9yOiBpY3NUYXNrLmljc0V2ZW50LnNvdXJjZS5jb2xvcixcclxuXHRcdFx0XHRcdFx0YmFkZ2U6IHRydWUsIC8vIE1hcmsgYXMgYmFkZ2UgZXZlbnRcclxuXHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHRiYWRnZUV2ZW50c0ZvckRhdGUucHVzaChjYWxlbmRhckV2ZW50KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIENhY2hlIHRoZSByZXN1bHQgZm9yIGZ1dHVyZSB1c2VcclxuXHRcdHRoaXMuYmFkZ2VFdmVudHNDYWNoZS5zZXQoZGF0ZUtleSwgYmFkZ2VFdmVudHNGb3JEYXRlKTtcclxuXHJcblx0XHRyZXR1cm4gYmFkZ2VFdmVudHNGb3JEYXRlO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUHJlLWNvbXB1dGUgYmFkZ2UgZXZlbnRzIGZvciB0aGUgY3VycmVudCB2aWV3J3MgZGF0ZSByYW5nZVxyXG5cdCAqIFRoaXMgc2hvdWxkIGJlIGNhbGxlZCB3aGVuIHRoZSB2aWV3IGNoYW5nZXMgb3IgZGF0YSB1cGRhdGVzXHJcblx0ICovXHJcblx0cHVibGljIHByZWNvbXB1dGVCYWRnZUV2ZW50c0ZvckN1cnJlbnRWaWV3KCk6IHZvaWQge1xyXG5cdFx0aWYgKCF0aGlzLmFjdGl2ZVZpZXdDb21wb25lbnQpIHJldHVybjtcclxuXHJcblx0XHRsZXQgc3RhcnREYXRlOiBEYXRlO1xyXG5cdFx0bGV0IGVuZERhdGU6IERhdGU7XHJcblxyXG5cdFx0c3dpdGNoICh0aGlzLmN1cnJlbnRWaWV3TW9kZSkge1xyXG5cdFx0XHRjYXNlIFwibW9udGhcIjoge1xyXG5cclxuXHRcdFx0XHQvLyBGb3IgbW9udGggdmlldywgY29tcHV0ZSBmb3IgdGhlIGVudGlyZSBncmlkIChpbmNsdWRpbmcgcHJldmlvdXMvbmV4dCBtb250aCBkYXlzKVxyXG5cdFx0XHRcdGNvbnN0IHN0YXJ0T2ZNb250aCA9IHRoaXMuY3VycmVudERhdGUuY2xvbmUoKS5zdGFydE9mKFwibW9udGhcIik7XHJcblx0XHRcdFx0Y29uc3QgZW5kT2ZNb250aCA9IHRoaXMuY3VycmVudERhdGUuY2xvbmUoKS5lbmRPZihcIm1vbnRoXCIpO1xyXG5cclxuXHRcdFx0XHQvLyBHZXQgZmlyc3QgZGF5IG9mIHdlZWsgc2V0dGluZyAoZWZmZWN0aXZlIHdpdGggb3ZlcnJpZGUpXHJcblx0XHRcdFx0Y29uc3QgZWZmQ2ZnID0gdGhpcy5nZXRFZmZlY3RpdmVDYWxlbmRhckNvbmZpZygpO1xyXG5cdFx0XHRcdGNvbnN0IGZpcnN0RGF5T2ZXZWVrID0gZWZmQ2ZnLmZpcnN0RGF5T2ZXZWVrID8/IDA7XHJcblxyXG5cdFx0XHRcdGNvbnN0IGdyaWRTdGFydCA9IHN0YXJ0T2ZNb250aFxyXG5cdFx0XHRcdFx0LmNsb25lKClcclxuXHRcdFx0XHRcdC53ZWVrZGF5KGZpcnN0RGF5T2ZXZWVrIC0gNyk7XHJcblx0XHRcdFx0Y29uc3QgZ3JpZEVuZCA9IGVuZE9mTW9udGguY2xvbmUoKS53ZWVrZGF5KGZpcnN0RGF5T2ZXZWVrICsgNik7XHJcblxyXG5cdFx0XHRcdC8vIEVuc3VyZSBhdCBsZWFzdCA0MiBkYXlzICg2IHdlZWtzKVxyXG5cdFx0XHRcdGlmIChncmlkRW5kLmRpZmYoZ3JpZFN0YXJ0LCBcImRheXNcIikgKyAxIDwgNDIpIHtcclxuXHRcdFx0XHRcdGNvbnN0IGRheXNUb0FkZCA9XHJcblx0XHRcdFx0XHRcdDQyIC0gKGdyaWRFbmQuZGlmZihncmlkU3RhcnQsIFwiZGF5c1wiKSArIDEpO1xyXG5cdFx0XHRcdFx0Z3JpZEVuZC5hZGQoZGF5c1RvQWRkLCBcImRheXNcIik7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRzdGFydERhdGUgPSBncmlkU3RhcnQudG9EYXRlKCk7XHJcblx0XHRcdFx0ZW5kRGF0ZSA9IGdyaWRFbmQudG9EYXRlKCk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNhc2UgXCJ3ZWVrXCI6IHtcclxuXHJcblx0XHRcdFx0Y29uc3Qgc3RhcnRPZldlZWsgPSB0aGlzLmN1cnJlbnREYXRlLmNsb25lKCkuc3RhcnRPZihcIndlZWtcIik7XHJcblx0XHRcdFx0Y29uc3QgZW5kT2ZXZWVrID0gdGhpcy5jdXJyZW50RGF0ZS5jbG9uZSgpLmVuZE9mKFwid2Vla1wiKTtcclxuXHRcdFx0XHRzdGFydERhdGUgPSBzdGFydE9mV2Vlay50b0RhdGUoKTtcclxuXHRcdFx0XHRlbmREYXRlID0gZW5kT2ZXZWVrLnRvRGF0ZSgpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjYXNlIFwiZGF5XCI6XHJcblx0XHRcdFx0c3RhcnREYXRlID0gdGhpcy5jdXJyZW50RGF0ZS5jbG9uZSgpLnN0YXJ0T2YoXCJkYXlcIikudG9EYXRlKCk7XHJcblx0XHRcdFx0ZW5kRGF0ZSA9IHRoaXMuY3VycmVudERhdGUuY2xvbmUoKS5lbmRPZihcImRheVwiKS50b0RhdGUoKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdGNhc2UgXCJ5ZWFyXCI6XHJcblx0XHRcdFx0Y29uc3Qgc3RhcnRPZlllYXIgPSB0aGlzLmN1cnJlbnREYXRlLmNsb25lKCkuc3RhcnRPZihcInllYXJcIik7XHJcblx0XHRcdFx0Y29uc3QgZW5kT2ZZZWFyID0gdGhpcy5jdXJyZW50RGF0ZS5jbG9uZSgpLmVuZE9mKFwieWVhclwiKTtcclxuXHRcdFx0XHRzdGFydERhdGUgPSBzdGFydE9mWWVhci50b0RhdGUoKTtcclxuXHRcdFx0XHRlbmREYXRlID0gZW5kT2ZZZWFyLnRvRGF0ZSgpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHQvLyBGb3IgYWdlbmRhIGFuZCBvdGhlciB2aWV3cywgdXNlIGEgcmVhc29uYWJsZSBkZWZhdWx0IHJhbmdlXHJcblx0XHRcdFx0c3RhcnREYXRlID0gdGhpcy5jdXJyZW50RGF0ZS5jbG9uZSgpLnN0YXJ0T2YoXCJkYXlcIikudG9EYXRlKCk7XHJcblx0XHRcdFx0ZW5kRGF0ZSA9IHRoaXMuY3VycmVudERhdGUuY2xvbmUoKS5hZGQoMzAsIFwiZGF5c1wiKS50b0RhdGUoKTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnByZWNvbXB1dGVCYWRnZUV2ZW50c0ZvclJhbmdlKHN0YXJ0RGF0ZSwgZW5kRGF0ZSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBNYXAgSUNTIHByaW9yaXR5IHRvIHRhc2sgcHJpb3JpdHlcclxuXHQgKi9cclxuXHRwcml2YXRlIG1hcEljc1ByaW9yaXR5VG9UYXNrUHJpb3JpdHkoXHJcblx0XHRpY3NQcmlvcml0eT86IG51bWJlclxyXG5cdCk6IG51bWJlciB8IHVuZGVmaW5lZCB7XHJcblx0XHRpZiAoaWNzUHJpb3JpdHkgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHVuZGVmaW5lZDtcclxuXHJcblx0XHQvLyBJQ1MgcHJpb3JpdHk6IDAgKHVuZGVmaW5lZCksIDEtNCAoaGlnaCksIDUgKG5vcm1hbCksIDYtOSAobG93KVxyXG5cdFx0Ly8gVGFzayBwcmlvcml0eTogMSAoaGlnaGVzdCksIDIgKGhpZ2gpLCAzIChtZWRpdW0pLCA0IChsb3cpLCA1IChsb3dlc3QpXHJcblx0XHRpZiAoaWNzUHJpb3JpdHkgPj0gMSAmJiBpY3NQcmlvcml0eSA8PSA0KSByZXR1cm4gMTsgLy8gSGlnaFxyXG5cdFx0aWYgKGljc1ByaW9yaXR5ID09PSA1KSByZXR1cm4gMzsgLy8gTWVkaXVtXHJcblx0XHRpZiAoaWNzUHJpb3JpdHkgPj0gNiAmJiBpY3NQcmlvcml0eSA8PSA5KSByZXR1cm4gNTsgLy8gTG93XHJcblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xyXG5cdH1cclxuXHJcblx0Ly8gLS0tIFV0aWxpdHkgTWV0aG9kcyAtLS1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0cyB0aGUgYXBwcm9wcmlhdGUgbW9tZW50LmpzIHVuaXQgZm9yIG5hdmlnYXRpb24gYmFzZWQgb24gdGhlIGN1cnJlbnQgdmlldy5cclxuXHQgKi9cclxuXHRwcml2YXRlIGdldFZpZXdVbml0KCk6IG1vbWVudC51bml0T2ZUaW1lLkR1cmF0aW9uQ29uc3RydWN0b3Ige1xyXG5cdFx0c3dpdGNoICh0aGlzLmN1cnJlbnRWaWV3TW9kZSkge1xyXG5cdFx0XHRjYXNlIFwieWVhclwiOlxyXG5cdFx0XHRcdHJldHVybiBcInllYXJcIjtcclxuXHRcdFx0Y2FzZSBcIm1vbnRoXCI6XHJcblx0XHRcdFx0cmV0dXJuIFwibW9udGhcIjtcclxuXHRcdFx0Y2FzZSBcIndlZWtcIjpcclxuXHRcdFx0XHRyZXR1cm4gXCJ3ZWVrXCI7XHJcblx0XHRcdGNhc2UgXCJkYXlcIjpcclxuXHRcdFx0XHRyZXR1cm4gXCJkYXlcIjtcclxuXHRcdFx0Y2FzZSBcImFnZW5kYVwiOlxyXG5cdFx0XHRcdHJldHVybiBcIndlZWtcIjsgLy8gQWdlbmRhIG1pZ2h0IGFkdmFuY2Ugd2VlayBieSB3ZWVrXHJcblx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0cmV0dXJuIFwibW9udGhcIjtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldHMgdGhlIGZvcm1hdHRlZCBzdHJpbmcgZm9yIHRoZSBjdXJyZW50IGRhdGUgZGlzcGxheSBpbiB0aGUgaGVhZGVyLlxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZ2V0Q3VycmVudERhdGVEaXNwbGF5KCk6IHN0cmluZyB7XHJcblx0XHRzd2l0Y2ggKHRoaXMuY3VycmVudFZpZXdNb2RlKSB7XHJcblx0XHRcdGNhc2UgXCJ5ZWFyXCI6XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuY3VycmVudERhdGUuZm9ybWF0KFwiWVlZWVwiKTtcclxuXHRcdFx0Y2FzZSBcIm1vbnRoXCI6XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuY3VycmVudERhdGUuZm9ybWF0KFwiTU1NTS9ZWVlZXCIpO1xyXG5cdFx0XHRjYXNlIFwid2Vla1wiOlxyXG5cdFx0XHRcdGNvbnN0IHN0YXJ0T2ZXZWVrID0gdGhpcy5jdXJyZW50RGF0ZS5jbG9uZSgpLnN0YXJ0T2YoXCJ3ZWVrXCIpO1xyXG5cdFx0XHRcdGNvbnN0IGVuZE9mV2VlayA9IHRoaXMuY3VycmVudERhdGUuY2xvbmUoKS5lbmRPZihcIndlZWtcIik7XHJcblx0XHRcdFx0Ly8gSGFuZGxlIHdlZWtzIHNwYW5uaW5nIGFjcm9zcyBtb250aC95ZWFyIGNoYW5nZXNcclxuXHRcdFx0XHRpZiAoc3RhcnRPZldlZWsubW9udGgoKSAhPT0gZW5kT2ZXZWVrLm1vbnRoKCkpIHtcclxuXHRcdFx0XHRcdGlmIChzdGFydE9mV2Vlay55ZWFyKCkgIT09IGVuZE9mV2Vlay55ZWFyKCkpIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIGAke3N0YXJ0T2ZXZWVrLmZvcm1hdChcclxuXHRcdFx0XHRcdFx0XHRcIk1NTSBELCBZWVlZXCJcclxuXHRcdFx0XHRcdFx0KX0gLSAke2VuZE9mV2Vlay5mb3JtYXQoXCJNTU0gRCwgWVlZWVwiKX1gO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIGAke3N0YXJ0T2ZXZWVrLmZvcm1hdChcclxuXHRcdFx0XHRcdFx0XHRcIk1NTSBEXCJcclxuXHRcdFx0XHRcdFx0KX0gLSAke2VuZE9mV2Vlay5mb3JtYXQoXCJNTU0gRCwgWVlZWVwiKX1gO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gYCR7c3RhcnRPZldlZWsuZm9ybWF0KFwiTU1NIERcIil9IC0gJHtlbmRPZldlZWsuZm9ybWF0KFxyXG5cdFx0XHRcdFx0XHRcIkQsIFlZWVlcIlxyXG5cdFx0XHRcdFx0KX1gO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0Y2FzZSBcImRheVwiOlxyXG5cdFx0XHRcdHJldHVybiB0aGlzLmN1cnJlbnREYXRlLmZvcm1hdChcImRkZGQsIE1NTU0gRCwgWVlZWVwiKTtcclxuXHRcdFx0Y2FzZSBcImFnZW5kYVwiOlxyXG5cdFx0XHRcdC8vIEV4YW1wbGU6IEFnZW5kYSBzaG93aW5nIHRoZSBuZXh0IDcgZGF5c1xyXG5cdFx0XHRcdGNvbnN0IGVuZE9mQWdlbmRhID0gdGhpcy5jdXJyZW50RGF0ZS5jbG9uZSgpLmFkZCg2LCBcImRheXNcIik7XHJcblx0XHRcdFx0cmV0dXJuIGAke3RoaXMuY3VycmVudERhdGUuZm9ybWF0KFxyXG5cdFx0XHRcdFx0XCJNTU0gRFwiXHJcblx0XHRcdFx0KX0gLSAke2VuZE9mQWdlbmRhLmZvcm1hdChcIk1NTSBELCBZWVlZXCIpfWA7XHJcblx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuY3VycmVudERhdGUuZm9ybWF0KFwiTU1NTSBZWVlZXCIpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0cyB0aGUgY3VycmVudCB2aWV3IGNvbXBvbmVudC5cclxuXHQgKi9cclxuXHRwdWJsaWMgZ2V0IGN1cnJlbnRWaWV3Q29tcG9uZW50KCk6IENhbGVuZGFyVmlldyB8IG51bGwge1xyXG5cdFx0cmV0dXJuIHRoaXMuYWN0aXZlVmlld0NvbXBvbmVudDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIG9uIGV2ZW50IGNsaWNrXHJcblx0ICovXHJcblx0cHVibGljIG9uRXZlbnRDbGljayA9IChldjogTW91c2VFdmVudCwgZXZlbnQ6IENhbGVuZGFyRXZlbnQpID0+IHtcclxuXHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcIkV2ZW50IGNsaWNrZWQ6XCIsXHJcblx0XHRcdGV2ZW50LFxyXG5cdFx0XHR0aGlzLnBhcmFtcyxcclxuXHRcdFx0dGhpcy5wYXJhbXM/Lm9uVGFza1NlbGVjdGVkXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5wYXJhbXM/Lm9uVGFza1NlbGVjdGVkPy4oZXZlbnQpO1xyXG5cdH07XHJcblxyXG5cdC8qKlxyXG5cdCAqIG9uIGV2ZW50IG1vdXNlIGhvdmVyXHJcblx0ICovXHJcblx0cHVibGljIG9uRXZlbnRIb3ZlciA9IChldjogTW91c2VFdmVudCwgZXZlbnQ6IENhbGVuZGFyRXZlbnQpID0+IHtcclxuXHRcdGNvbnNvbGUubG9nKFwiRXZlbnQgbW91c2UgZW50ZXJlZDpcIiwgZXZlbnQpO1xyXG5cdH07XHJcblxyXG5cdC8qKlxyXG5cdCAqIG9uIHZpZXcgY2hhbmdlXHJcblx0ICovXHJcblx0cHVibGljIG9uVmlld0NoYW5nZSA9ICh2aWV3TW9kZTogQ2FsZW5kYXJWaWV3TW9kZSkgPT4ge1xyXG5cdFx0Y29uc29sZS5sb2coXCJWaWV3IGNoYW5nZWQ6XCIsIHZpZXdNb2RlKTtcclxuXHR9O1xyXG5cclxuXHQvKipcclxuXHQgKiBvbiBkYXkgY2xpY2tcclxuXHQgKi9cclxuXHRwdWJsaWMgb25EYXlDbGljayA9IChcclxuXHRcdGV2OiBNb3VzZUV2ZW50LFxyXG5cdFx0ZGF5OiBudW1iZXIsXHJcblx0XHRvcHRpb25zOiB7XHJcblx0XHRcdGJlaGF2aW9yOiBcIm9wZW4tcXVpY2stY2FwdHVyZVwiIHwgXCJvcGVuLXRhc2stdmlld1wiO1xyXG5cdFx0fVxyXG5cdCkgPT4ge1xyXG5cdFx0aWYgKHRoaXMuY3VycmVudFZpZXdNb2RlID09PSBcInllYXJcIikge1xyXG5cdFx0XHR0aGlzLnNldFZpZXcoXCJkYXlcIik7XHJcblx0XHRcdHRoaXMuY3VycmVudERhdGUgPSBtb21lbnQoZGF5KTtcclxuXHRcdFx0dGhpcy5yZW5kZXIoKTtcclxuXHRcdH0gZWxzZSBpZiAob3B0aW9ucy5iZWhhdmlvciA9PT0gXCJvcGVuLXF1aWNrLWNhcHR1cmVcIikge1xyXG5cdFx0XHRuZXcgUXVpY2tDYXB0dXJlTW9kYWwoXHJcblx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdFx0e2R1ZURhdGU6IG1vbWVudChkYXkpLnRvRGF0ZSgpfSxcclxuXHRcdFx0XHR0cnVlXHJcblx0XHRcdCkub3BlbigpO1xyXG5cdFx0fSBlbHNlIGlmIChvcHRpb25zLmJlaGF2aW9yID09PSBcIm9wZW4tdGFzay12aWV3XCIpIHtcclxuXHRcdFx0dGhpcy5zZXRWaWV3KFwiZGF5XCIpO1xyXG5cdFx0XHR0aGlzLmN1cnJlbnREYXRlID0gbW9tZW50KGRheSk7XHJcblx0XHRcdHRoaXMucmVuZGVyKCk7XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0LyoqXHJcblx0ICogb24gZGF5IGhvdmVyXHJcblx0ICovXHJcblx0cHVibGljIG9uRGF5SG92ZXIgPSAoZXY6IE1vdXNlRXZlbnQsIGRheTogbnVtYmVyKSA9PiB7XHJcblx0XHRjb25zb2xlLmxvZyhcIkRheSBob3ZlcmVkOlwiLCBkYXkpO1xyXG5cdH07XHJcblxyXG5cdC8qKlxyXG5cdCAqIG9uIG1vbnRoIGNsaWNrXHJcblx0ICovXHJcblx0cHVibGljIG9uTW9udGhDbGljayA9IChldjogTW91c2VFdmVudCwgbW9udGg6IG51bWJlcikgPT4ge1xyXG5cdFx0dGhpcy5zZXRWaWV3KFwibW9udGhcIik7XHJcblx0XHR0aGlzLmN1cnJlbnREYXRlID0gbW9tZW50KG1vbnRoKTtcclxuXHRcdHRoaXMucmVuZGVyKCk7XHJcblx0fTtcclxuXHJcblx0LyoqXHJcblx0ICogb24gbW9udGggaG92ZXJcclxuXHQgKi9cclxuXHRwdWJsaWMgb25Nb250aEhvdmVyID0gKGV2OiBNb3VzZUV2ZW50LCBtb250aDogbnVtYmVyKSA9PiB7XHJcblx0XHRjb25zb2xlLmxvZyhcIk1vbnRoIGhvdmVyZWQ6XCIsIG1vbnRoKTtcclxuXHR9O1xyXG5cclxuXHQvKipcclxuXHQgKiBvbiB0YXNrIGNvbnRleHQgbWVudVxyXG5cdCAqL1xyXG5cdHB1YmxpYyBvbkV2ZW50Q29udGV4dE1lbnUgPSAoZXY6IE1vdXNlRXZlbnQsIGV2ZW50OiBDYWxlbmRhckV2ZW50KSA9PiB7XHJcblx0XHR0aGlzLnBhcmFtcz8ub25FdmVudENvbnRleHRNZW51Py4oZXYsIGV2ZW50KTtcclxuXHR9O1xyXG5cclxuXHQvKipcclxuXHQgKiBvbiB0YXNrIGNvbXBsZXRlXHJcblx0ICovXHJcblx0cHVibGljIG9uRXZlbnRDb21wbGV0ZSA9IChldjogTW91c2VFdmVudCwgZXZlbnQ6IENhbGVuZGFyRXZlbnQpID0+IHtcclxuXHRcdHRoaXMucGFyYW1zPy5vblRhc2tDb21wbGV0ZWQ/LihldmVudCk7XHJcblx0fTtcclxuXHJcblx0Ly8gQWxsb3cgZXh0ZXJuYWwgb3ZlcnJpZGVzIChlLmcuLCBmcm9tIEJhc2VzKSBhbmQgY29tcHV0ZSBlZmZlY3RpdmUgY29uZmlnXHJcblx0cHVibGljIHNldENvbmZpZ092ZXJyaWRlKFxyXG5cdFx0b3ZlcnJpZGU6IFBhcnRpYWw8aW1wb3J0KFwiQC9jb21tb24vc2V0dGluZy1kZWZpbml0aW9uXCIpLkNhbGVuZGFyU3BlY2lmaWNDb25maWc+IHwgbnVsbFxyXG5cdCk6IHZvaWQge1xyXG5cdFx0dGhpcy5jb25maWdPdmVycmlkZSA9IG92ZXJyaWRlID8/IG51bGw7XHJcblx0XHQvLyBSZS1yZW5kZXIgdG8gYXBwbHkgbmV3IGNvbmZpZ1xyXG5cdFx0dGhpcy5yZW5kZXIoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZ2V0RWZmZWN0aXZlQ2FsZW5kYXJDb25maWcoKTogUGFydGlhbDxpbXBvcnQoXCJAL2NvbW1vbi9zZXR0aW5nLWRlZmluaXRpb25cIikuQ2FsZW5kYXJTcGVjaWZpY0NvbmZpZz4ge1xyXG5cdFx0Y29uc3QgYmFzZUNmZyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnZpZXdDb25maWd1cmF0aW9uLmZpbmQoKHYpID0+IHYuaWQgPT09IHRoaXMudmlld0lkKT8uc3BlY2lmaWNDb25maWcgYXMgUGFydGlhbDxpbXBvcnQoXCJAL2NvbW1vbi9zZXR0aW5nLWRlZmluaXRpb25cIikuQ2FsZW5kYXJTcGVjaWZpY0NvbmZpZz4gfCB1bmRlZmluZWQ7XHJcblx0XHRyZXR1cm4gey4uLihiYXNlQ2ZnID8/IHt9KSwgLi4uKHRoaXMuY29uZmlnT3ZlcnJpZGUgPz8ge30pfTtcclxuXHR9XHJcblxyXG59XHJcblxyXG4vLyBIZWxwZXIgZnVuY3Rpb24gKGV4YW1wbGUgLSBtaWdodCBtb3ZlIHRvIGEgdXRpbHMgZmlsZSlcclxuZnVuY3Rpb24gZ2V0RGF5c0luTW9udGgoeWVhcjogbnVtYmVyLCBtb250aDogbnVtYmVyKTogRGF0ZVtdIHtcclxuXHRjb25zdCBkYXRlID0gbmV3IERhdGUoeWVhciwgbW9udGgsIDEpO1xyXG5cdGNvbnN0IGRheXM6IERhdGVbXSA9IFtdO1xyXG5cdHdoaWxlIChkYXRlLmdldE1vbnRoKCkgPT09IG1vbnRoKSB7XHJcblx0XHRkYXlzLnB1c2gobmV3IERhdGUoZGF0ZSkpO1xyXG5cdFx0ZGF0ZS5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpICsgMSk7XHJcblx0fVxyXG5cdHJldHVybiBkYXlzO1xyXG59XHJcbiJdfQ==