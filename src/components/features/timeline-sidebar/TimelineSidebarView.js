import { __awaiter } from "tslib";
import { ItemView, setIcon, moment, debounce, TFile, } from "obsidian";
import { t } from "@/translations/helper";
import { QuickCaptureModal } from "@/components/features/quick-capture/modals/QuickCaptureModalWithSwitch";
import { createEmbeddableMarkdownEditor, } from "../../../editor-extensions/core/markdown-editor";
import { saveCapture } from "@/utils/file/file-operations";
import "@/styles/timeline-sidebar.css";
import { createTaskCheckbox } from "@/components/features/task/view/details";
import { MarkdownRendererComponent } from "@/components/ui/renderers/MarkdownRenderer";
export const TIMELINE_SIDEBAR_VIEW_TYPE = "tg-timeline-sidebar-view";
// Date type priority for deduplication (higher number = higher priority)
const DATE_TYPE_PRIORITY = {
    due: 4,
    scheduled: 3,
    start: 2,
    completed: 1,
};
export class TimelineSidebarView extends ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.markdownEditor = null;
        this.currentDate = moment();
        this.events = [];
        this.isAutoScrolling = false;
        // Collapse state management
        this.isInputCollapsed = false;
        this.tempEditorContent = "";
        this.isAnimating = false;
        this.collapsedHeaderEl = null;
        this.quickInputHeaderEl = null;
        // Debounced methods
        this.debouncedRender = debounce(() => __awaiter(this, void 0, void 0, function* () {
            yield this.loadEvents();
            this.renderTimeline();
        }), 300);
        this.debouncedScroll = debounce(this.handleScroll.bind(this), 100);
        this.plugin = plugin;
    }
    getViewType() {
        return TIMELINE_SIDEBAR_VIEW_TYPE;
    }
    getDisplayText() {
        return t("Timeline");
    }
    getIcon() {
        return "calendar-clock";
    }
    onOpen() {
        return __awaiter(this, void 0, void 0, function* () {
            this.containerEl = this.contentEl;
            this.containerEl.empty();
            this.containerEl.addClass("timeline-sidebar-container");
            // Restore collapsed state from settings
            this.isInputCollapsed = this.plugin.settings.timelineSidebar.quickInputCollapsed;
            this.createHeader();
            this.createTimelineArea();
            this.createQuickInputArea();
            // Load initial data
            yield this.loadEvents();
            this.renderTimeline();
            // Auto-scroll to today on open
            setTimeout(() => {
                this.scrollToToday();
            }, 100);
            // Register for task updates
            this.registerEvent(this.plugin.app.vault.on("modify", () => {
                this.debouncedRender();
            }));
            // Register for task cache updates
            this.registerEvent(this.plugin.app.workspace.on("task-genius:task-cache-updated", () => {
                this.debouncedRender();
            }));
        });
    }
    onClose() {
        if (this.markdownEditor) {
            this.markdownEditor.destroy();
            this.markdownEditor = null;
        }
        return Promise.resolve();
    }
    createHeader() {
        const headerEl = this.containerEl.createDiv("timeline-header");
        // Title
        const titleEl = headerEl.createDiv("timeline-title");
        titleEl.setText(t("Timeline"));
        // Controls
        const controlsEl = headerEl.createDiv("timeline-controls");
        // Today button
        const todayBtn = controlsEl.createDiv("timeline-btn timeline-today-btn");
        setIcon(todayBtn, "calendar");
        todayBtn.setAttribute("aria-label", t("Go to today"));
        this.registerDomEvent(todayBtn, "click", () => {
            this.scrollToToday();
        });
        // Refresh button
        const refreshBtn = controlsEl.createDiv("timeline-btn timeline-refresh-btn");
        setIcon(refreshBtn, "refresh-cw");
        refreshBtn.setAttribute("aria-label", t("Refresh"));
        this.registerDomEvent(refreshBtn, "click", () => {
            this.loadEvents();
            this.renderTimeline();
        });
        // Focus mode toggle
        const focusBtn = controlsEl.createDiv("timeline-btn timeline-focus-btn");
        setIcon(focusBtn, "focus");
        focusBtn.setAttribute("aria-label", t("Focus on today"));
        this.registerDomEvent(focusBtn, "click", () => {
            this.toggleFocusMode();
        });
    }
    createTimelineArea() {
        this.timelineContainerEl =
            this.containerEl.createDiv("timeline-content");
        // Add scroll listener for infinite scroll
        this.registerDomEvent(this.timelineContainerEl, "scroll", () => {
            this.debouncedScroll();
        });
    }
    createQuickInputArea() {
        var _a, _b;
        this.quickInputContainerEl = this.containerEl.createDiv("timeline-quick-input");
        // Create collapsed header (always exists but hidden when expanded)
        this.collapsedHeaderEl = this.quickInputContainerEl.createDiv("quick-input-header-collapsed");
        this.createCollapsedHeader();
        // Input header with target info
        this.quickInputHeaderEl =
            this.quickInputContainerEl.createDiv("quick-input-header");
        // Add collapse button to header
        const headerLeft = this.quickInputHeaderEl.createDiv("quick-input-header-left");
        const collapseBtn = headerLeft.createDiv("quick-input-collapse-btn");
        setIcon(collapseBtn, "chevron-down");
        collapseBtn.setAttribute("aria-label", t("Collapse quick input"));
        this.registerDomEvent(collapseBtn, "click", () => {
            this.toggleInputCollapse();
        });
        const headerTitle = headerLeft.createDiv("quick-input-title");
        headerTitle.setText(t("Quick Capture"));
        const targetInfo = this.quickInputHeaderEl.createDiv("quick-input-target-info");
        this.updateTargetInfo(targetInfo);
        // Editor container
        const editorContainer = this.quickInputContainerEl.createDiv("quick-input-editor");
        // Initialize markdown editor
        setTimeout(() => {
            var _a, _b;
            this.markdownEditor = createEmbeddableMarkdownEditor(this.app, editorContainer, {
                placeholder: t("What do you want to do today?"),
                onEnter: (editor, mod, shift) => {
                    if (mod) {
                        // Submit on Cmd/Ctrl+Enter
                        this.handleQuickCapture();
                        return true;
                    }
                    return false;
                },
                onEscape: () => {
                    // Clear input on Escape
                    if (this.markdownEditor) {
                        this.markdownEditor.set("", false);
                    }
                },
                onChange: () => {
                    // Auto-resize or other behaviors
                },
            });
            // Focus the editor if not collapsed
            if (!this.isInputCollapsed) {
                (_b = (_a = this.markdownEditor) === null || _a === void 0 ? void 0 : _a.editor) === null || _b === void 0 ? void 0 : _b.focus();
            }
        }, 50);
        // Action buttons
        const actionsEl = this.quickInputContainerEl.createDiv("quick-input-actions");
        const captureBtn = actionsEl.createEl("button", {
            cls: "quick-capture-btn mod-cta",
            text: t("Capture"),
        });
        this.registerDomEvent(captureBtn, "click", () => {
            this.handleQuickCapture();
        });
        const fullModalBtn = actionsEl.createEl("button", {
            cls: "quick-modal-btn",
            text: t("More options"),
        });
        this.registerDomEvent(fullModalBtn, "click", () => {
            new QuickCaptureModal(this.app, this.plugin, {}, true).open();
        });
        // Apply initial collapsed state
        if (this.isInputCollapsed) {
            this.quickInputContainerEl.addClass("is-collapsed");
            (_a = this.collapsedHeaderEl) === null || _a === void 0 ? void 0 : _a.show();
        }
        else {
            (_b = this.collapsedHeaderEl) === null || _b === void 0 ? void 0 : _b.hide();
        }
    }
    loadEvents() {
        return __awaiter(this, void 0, void 0, function* () {
            // Get tasks from the plugin's dataflow
            let allTasks = [];
            if (this.plugin.dataflowOrchestrator) {
                try {
                    allTasks = yield this.plugin.dataflowOrchestrator.getQueryAPI().getAllTasks();
                }
                catch (error) {
                    console.error("Failed to get tasks from dataflow:", error);
                }
            }
            this.events = [];
            // Filter tasks based on showCompletedTasks setting
            const shouldShowCompletedTasks = this.plugin.settings.timelineSidebar.showCompletedTasks;
            // Get abandoned status markers to filter out
            const abandonedStatuses = this.plugin.settings.taskStatuses.abandoned.split("|");
            const filteredTasks = shouldShowCompletedTasks
                ? allTasks
                : allTasks.filter((task) => {
                    // Filter out completed tasks AND abandoned/cancelled tasks
                    return !task.completed && !abandonedStatuses.includes(task.status);
                });
            // Filter out ICS badge events from timeline
            // ICS badge events should only appear as badges in calendar views, not as individual timeline events
            const timelineFilteredTasks = filteredTasks.filter((task) => {
                var _a, _b, _c;
                // Check if this is an ICS task with badge showType
                const isIcsTask = ((_a = task.source) === null || _a === void 0 ? void 0 : _a.type) === "ics";
                const icsTask = isIcsTask ? task : null;
                const showAsBadge = ((_c = (_b = icsTask === null || icsTask === void 0 ? void 0 : icsTask.icsEvent) === null || _b === void 0 ? void 0 : _b.source) === null || _c === void 0 ? void 0 : _c.showType) === "badge";
                // Exclude ICS tasks with badge showType from timeline
                return !(isIcsTask && showAsBadge);
            });
            // Convert tasks to timeline events
            timelineFilteredTasks.forEach((task) => {
                const dates = this.extractDatesFromTask(task);
                dates.forEach(({ date, type }) => {
                    const event = {
                        id: `${task.id}-${type}`,
                        content: task.content,
                        time: date,
                        type: "task",
                        status: task.status,
                        task: task,
                        isToday: moment(date).isSame(moment(), "day"),
                        timeInfo: this.createTimeInfoFromTask(task, date, type),
                    };
                    this.events.push(event);
                });
            });
            // Sort events by time (newest first for timeline display)
            this.events.sort((a, b) => b.time.getTime() - a.time.getTime());
        });
    }
    /**
     * Deduplicates dates by priority when multiple date types fall on the same day
     * @param dates Array of date objects with type information
     * @returns Deduplicated array with highest priority date per day
     */
    deduplicateDatesByPriority(dates) {
        if (dates.length <= 1) {
            return dates;
        }
        // Group dates by day (YYYY-MM-DD format)
        const dateGroups = new Map();
        dates.forEach((dateItem) => {
            const dateKey = moment(dateItem.date).format("YYYY-MM-DD");
            if (!dateGroups.has(dateKey)) {
                dateGroups.set(dateKey, []);
            }
            dateGroups.get(dateKey).push(dateItem);
        });
        // For each day, keep only the highest priority date type
        const deduplicatedDates = [];
        dateGroups.forEach((dayDates) => {
            if (dayDates.length === 1) {
                // Only one date for this day, keep it
                deduplicatedDates.push(dayDates[0]);
            }
            else {
                // Multiple dates for same day, find highest priority
                const highestPriorityDate = dayDates.reduce((highest, current) => {
                    const currentPriority = DATE_TYPE_PRIORITY[current.type] || 0;
                    const highestPriority = DATE_TYPE_PRIORITY[highest.type] || 0;
                    return currentPriority > highestPriority
                        ? current
                        : highest;
                });
                deduplicatedDates.push(highestPriorityDate);
            }
        });
        return deduplicatedDates;
    }
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
        // If no specific time component found for this date type, try to use any available time component
        if (!relevantTimeComponent) {
            // Priority order: startTime > dueTime > scheduledTime
            if (timeComponents.startTime) {
                relevantTimeComponent = timeComponents.startTime;
                // If we have both start and end time, treat it as a range
                if (timeComponents.endTime && (enhancedDates === null || enhancedDates === void 0 ? void 0 : enhancedDates.endDateTime)) {
                    relevantEndTime = enhancedDates.endDateTime;
                }
            }
            else if (timeComponents.dueTime) {
                relevantTimeComponent = timeComponents.dueTime;
            }
            else if (timeComponents.scheduledTime) {
                relevantTimeComponent = timeComponents.scheduledTime;
            }
        }
        if (!relevantTimeComponent) {
            // No time components available at all
            return {
                primaryTime: date,
                isRange: false,
                displayFormat: "date-time",
            };
        }
        // Create enhanced datetime by combining date and time component
        // Use local time (setHours) instead of UTC to match the parsed time components
        const enhancedDateTime = new Date(date);
        enhancedDateTime.setHours(relevantTimeComponent.hour, relevantTimeComponent.minute, relevantTimeComponent.second || 0, 0);
        // Determine if this is a time range
        // Check if the time component is marked as a range OR if we have an explicit end time
        const isRange = relevantTimeComponent.isRange || !!relevantEndTime;
        // If the time component is a range but we don't have enhancedDates.endDateTime,
        // create the end time from the range partner
        if (relevantTimeComponent.isRange && !relevantEndTime && relevantTimeComponent.rangePartner) {
            const endDateTime = new Date(date);
            // Use local time (setHours) instead of UTC to match the parsed time components
            endDateTime.setHours(relevantTimeComponent.rangePartner.hour, relevantTimeComponent.rangePartner.minute, relevantTimeComponent.rangePartner.second || 0, 0);
            relevantEndTime = endDateTime;
        }
        return {
            primaryTime: enhancedDateTime,
            endTime: relevantEndTime,
            isRange,
            timeComponent: relevantTimeComponent,
            displayFormat: isRange ? "range" : "time-only",
        };
    }
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
        // Fallback: if no planning dates exist, use deduplication for edge cases
        const allDates = [];
        if (task.metadata.completedDate) {
            allDates.push({
                date: new Date(task.metadata.completedDate),
                type: "completed",
            });
        }
        return this.deduplicateDatesByPriority(allDates);
    }
    renderTimeline() {
        this.timelineContainerEl.empty();
        if (this.events.length === 0) {
            const emptyEl = this.timelineContainerEl.createDiv("timeline-empty");
            emptyEl.setText(t("No events to display"));
            return;
        }
        // Group events by date
        const eventsByDate = this.groupEventsByDate();
        // Render each date group
        for (const [dateStr, dayEvents] of eventsByDate) {
            this.renderDateGroup(dateStr, dayEvents);
        }
    }
    groupEventsByDate() {
        const grouped = new Map();
        this.events.forEach((event) => {
            const dateKey = moment(event.time).format("YYYY-MM-DD");
            if (!grouped.has(dateKey)) {
                grouped.set(dateKey, []);
            }
            grouped.get(dateKey).push(event);
        });
        return grouped;
    }
    renderDateGroup(dateStr, events) {
        const dateGroupEl = this.timelineContainerEl.createDiv("timeline-date-group");
        const dateMoment = moment(dateStr);
        const isToday = dateMoment.isSame(moment(), "day");
        const isYesterday = dateMoment.isSame(moment().subtract(1, "day"), "day");
        const isTomorrow = dateMoment.isSame(moment().add(1, "day"), "day");
        if (isToday) {
            dateGroupEl.addClass("is-today");
        }
        // Date header
        const dateHeaderEl = dateGroupEl.createDiv("timeline-date-header");
        let displayDate = dateMoment.format("MMM DD, YYYY");
        if (isToday) {
            displayDate = t("Today");
        }
        else if (isYesterday) {
            displayDate = t("Yesterday");
        }
        else if (isTomorrow) {
            displayDate = t("Tomorrow");
        }
        dateHeaderEl.setText(displayDate);
        // Add relative time
        const relativeEl = dateHeaderEl.createSpan("timeline-date-relative");
        if (!isToday && !isYesterday && !isTomorrow) {
            relativeEl.setText(dateMoment.fromNow());
        }
        // Events list
        const eventsListEl = dateGroupEl.createDiv("timeline-events-list");
        // Sort events by time within the day for chronological ordering
        const sortedEvents = this.sortEventsByTime(events);
        // Group events by time and render them
        this.renderGroupedEvents(eventsListEl, sortedEvents);
    }
    /**
     * Render time information for a timeline event
     */
    renderEventTime(timeEl, event) {
        var _a, _b, _c;
        if ((_a = event.timeInfo) === null || _a === void 0 ? void 0 : _a.timeComponent) {
            // Use parsed time component for accurate display
            const { timeComponent, isRange, endTime } = event.timeInfo;
            if (isRange && endTime) {
                // Display time range
                const startTimeStr = this.formatTimeComponent(timeComponent);
                const endTimeStr = moment(endTime).format("HH:mm");
                timeEl.setText(`${startTimeStr}-${endTimeStr}`);
                timeEl.addClass("timeline-event-time-range");
                // Add duration badge attribute for CSS ::after to render
                try {
                    const start = (_b = event.timeInfo) === null || _b === void 0 ? void 0 : _b.primaryTime;
                    if (start && endTime.getTime() > start.getTime()) {
                        const minutes = Math.round((endTime.getTime() - start.getTime()) / 60000);
                        const duration = minutes >= 60
                            ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`
                            : `${minutes}m`;
                        timeEl.setAttribute("data-duration", duration);
                    }
                }
                catch (_) {
                }
            }
            else {
                // Display single time
                timeEl.setText(this.formatTimeComponent(timeComponent));
                timeEl.addClass("timeline-event-time-single");
            }
        }
        else {
            // Try to parse time directly from content as a fallback to avoid 00:00 mismatches
            const content = event.content || "";
            // Detect time range first (e.g., 15:00-16:00)
            const rangeRegex = /([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\s*[-~～]\s*([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?/;
            const rangeMatch = content.match(rangeRegex);
            if (rangeMatch) {
                const start = `${rangeMatch[1].padStart(2, '0')}:${rangeMatch[2]}${rangeMatch[3] ? `:${rangeMatch[3]}` : ''}`;
                const end = `${rangeMatch[4].padStart(2, '0')}:${rangeMatch[5]}${rangeMatch[6] ? `:${rangeMatch[6]}` : ''}`;
                timeEl.setText(`${start}-${end}`);
                timeEl.addClass("timeline-event-time-range");
                return;
            }
            // Detect 12-hour format (e.g., 3:30 PM)
            const pattern12h = /(1[0-2]|0?[1-9]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM|am|pm)/;
            const m12 = content.match(pattern12h);
            if (m12) {
                let hour = parseInt(m12[1], 10);
                const minute = m12[2];
                const second = m12[3];
                const period = m12[4].toUpperCase();
                if (period === 'PM' && hour !== 12)
                    hour += 12;
                if (period === 'AM' && hour === 12)
                    hour = 0;
                const display = `${hour.toString().padStart(2, '0')}:${minute}${second ? `:${second}` : ''}`;
                timeEl.setText(display);
                timeEl.addClass("timeline-event-time-single");
                return;
            }
            // Detect 24-hour single time (e.g., 15:00)
            const pattern24h = /([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?/;
            const m24 = content.match(pattern24h);
            if (m24) {
                const display = `${m24[1].padStart(2, '0')}:${m24[2]}${m24[3] ? `:${m24[3]}` : ''}`;
                timeEl.setText(display);
                timeEl.addClass("timeline-event-time-single");
                return;
            }
            // Fallback to default time display - prefer enhanced primaryTime when available
            const fallbackTime = ((_c = event.timeInfo) === null || _c === void 0 ? void 0 : _c.primaryTime) || event.time;
            timeEl.setText(moment(fallbackTime).format("HH:mm"));
            timeEl.addClass("timeline-event-time-default");
        }
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
     * Render events grouped by time, separating timed events from date-only events
     */
    renderGroupedEvents(containerEl, events) {
        // Separate events into timed and date-only categories
        const timedEvents = [];
        const dateOnlyEvents = [];
        events.forEach((event) => {
            if (this.hasSpecificTime(event)) {
                timedEvents.push(event);
            }
            else {
                dateOnlyEvents.push(event);
            }
        });
        // Render timed events first, grouped by time
        if (timedEvents.length > 0) {
            this.renderTimedEventsWithGrouping(containerEl, timedEvents);
        }
        // Render date-only events in a separate section
        if (dateOnlyEvents.length > 0) {
            this.renderDateOnlyEvents(containerEl, dateOnlyEvents);
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
        // Heuristic: detect explicit time patterns in the content (e.g., "15:00", "3:30 PM")
        if (event.content) {
            const timePattern24h = /(^|[^0-9])([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?/;
            const timePattern12h = /(^|\s)(1[0-2]|0?[1-9]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM|am|pm)/;
            if (timePattern24h.test(event.content) || timePattern12h.test(event.content)) {
                return true;
            }
        }
        // Check if the original time has non-zero hours/minutes (not just midnight)
        // Use local time (getHours) to check for specific time
        const time = ((_b = event.timeInfo) === null || _b === void 0 ? void 0 : _b.primaryTime) || event.time;
        return time.getHours() !== 0 || time.getMinutes() !== 0 || time.getSeconds() !== 0;
    }
    /**
     * Render timed events with grouping for events at the same time
     */
    renderTimedEventsWithGrouping(containerEl, events) {
        // Group events by their time
        const timeGroups = new Map();
        events.forEach((event) => {
            var _a;
            const time = ((_a = event.timeInfo) === null || _a === void 0 ? void 0 : _a.primaryTime) || event.time;
            const timeKey = this.getTimeGroupKey(time, event);
            if (!timeGroups.has(timeKey)) {
                timeGroups.set(timeKey, []);
            }
            timeGroups.get(timeKey).push(event);
        });
        // Render each time group
        for (const [timeKey, groupEvents] of timeGroups) {
            if (groupEvents.length === 1) {
                // Single event - render normally
                this.renderEvent(containerEl, groupEvents[0]);
            }
            else {
                // Multiple events at same time - render as a group
                this.renderTimeGroup(containerEl, timeKey, groupEvents);
            }
        }
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
        return moment(time).format("HH:mm");
    }
    /**
     * Render a group of events that occur at the same time
     */
    renderTimeGroup(containerEl, timeKey, events) {
        const groupEl = containerEl.createDiv("timeline-time-group");
        // Time group header
        const groupHeaderEl = groupEl.createDiv("timeline-time-group-header");
        const timeEl = groupHeaderEl.createDiv("timeline-time-group-time");
        timeEl.setText(timeKey);
        timeEl.addClass("timeline-event-time");
        timeEl.addClass("timeline-event-time-group");
        const countEl = groupHeaderEl.createDiv("timeline-time-group-count");
        countEl.setText(`${events.length} events`);
        // Events in the group
        const groupEventsEl = groupEl.createDiv("timeline-time-group-events");
        events.forEach((event) => {
            var _a;
            const eventEl = groupEventsEl.createDiv("timeline-event timeline-event-grouped");
            eventEl.setAttribute("data-event-id", event.id);
            if ((_a = event.task) === null || _a === void 0 ? void 0 : _a.completed) {
                eventEl.addClass("is-completed");
            }
            // Event content (no time display since it's in the group header)
            const contentEl = eventEl.createDiv("timeline-event-content");
            // Task checkbox if it's a task
            if (event.task) {
                const checkboxEl = contentEl.createDiv("timeline-event-checkbox");
                checkboxEl.createEl("span", {
                    cls: "status-option-checkbox",
                }, (el) => {
                    var _a;
                    const checkbox = createTaskCheckbox(((_a = event.task) === null || _a === void 0 ? void 0 : _a.status) || " ", event.task, el);
                    this.registerDomEvent(checkbox, "change", (e) => __awaiter(this, void 0, void 0, function* () {
                        e.stopPropagation();
                        e.preventDefault();
                        if (event.task) {
                            yield this.toggleTaskCompletion(event.task, event);
                        }
                    }));
                });
            }
            // Event text with markdown rendering
            const textEl = contentEl.createDiv("timeline-event-text");
            const contentContainer = textEl.createDiv("timeline-event-content-text");
            // Use MarkdownRendererComponent to render the task content
            if (event.task) {
                const markdownRenderer = new MarkdownRendererComponent(this.app, contentContainer, event.task.filePath, true // hideMarks = true to clean up task metadata
                );
                this.addChild(markdownRenderer);
                // Set the file context if available
                const file = this.app.vault.getFileByPath(event.task.filePath);
                if (file instanceof TFile) {
                    markdownRenderer.setFile(file);
                }
                // Render the content asynchronously
                markdownRenderer.render(event.content, true).catch((error) => {
                    console.error("Failed to render markdown in timeline:", error);
                    // Fallback to plain text if rendering fails
                    contentContainer.setText(event.content);
                });
            }
            else {
                // Fallback for non-task events
                contentContainer.setText(event.content);
            }
            // Event actions
            const actionsEl = eventEl.createDiv("timeline-event-actions");
            if (event.task) {
                // Go to task
                const gotoBtn = actionsEl.createDiv("timeline-event-action");
                setIcon(gotoBtn, "external-link");
                gotoBtn.setAttribute("aria-label", t("Go to task"));
                this.registerDomEvent(gotoBtn, "click", () => {
                    this.goToTask(event.task);
                });
            }
            // Click to focus (but not when clicking on checkbox or actions)
            this.registerDomEvent(eventEl, "click", (e) => {
                // Prevent navigation if clicking on checkbox or action buttons
                const target = e.target;
                if (target.closest(".timeline-event-checkbox") ||
                    target.closest(".timeline-event-actions") ||
                    target.closest('input[type="checkbox"]')) {
                    return;
                }
                if (event.task) {
                    this.goToTask(event.task);
                }
            });
        });
    }
    /**
     * Render date-only events (events without specific times)
     */
    renderDateOnlyEvents(containerEl, events) {
        if (events.length === 0)
            return;
        // Create a section for date-only events
        const dateOnlySection = containerEl.createDiv("timeline-date-only-section");
        const sectionHeaderEl = dateOnlySection.createDiv("timeline-date-only-header");
        const headerTimeEl = sectionHeaderEl.createDiv("timeline-event-time timeline-event-time-date-only");
        headerTimeEl.setText("All day");
        const headerTextEl = sectionHeaderEl.createDiv("timeline-date-only-title");
        headerTextEl.setText(`${events.length} all-day event${events.length > 1 ? 's' : ''}`);
        // Render each date-only event (hide individual time labels)
        events.forEach((event) => {
            this.renderEvent(dateOnlySection, event, false);
        });
    }
    renderEvent(containerEl, event, showTime = true) {
        var _a;
        const eventEl = containerEl.createDiv("timeline-event");
        eventEl.setAttribute("data-event-id", event.id);
        if ((_a = event.task) === null || _a === void 0 ? void 0 : _a.completed) {
            eventEl.addClass("is-completed");
        }
        // Event time - use enhanced time information if available
        if (showTime) {
            const timeEl = eventEl.createDiv("timeline-event-time");
            this.renderEventTime(timeEl, event);
        }
        // Event content
        const contentEl = eventEl.createDiv("timeline-event-content");
        // Task checkbox if it's a task
        if (event.task) {
            const checkboxEl = contentEl.createDiv("timeline-event-checkbox");
            checkboxEl.createEl("span", {
                cls: "status-option-checkbox",
            }, (el) => {
                var _a;
                const checkbox = createTaskCheckbox(((_a = event.task) === null || _a === void 0 ? void 0 : _a.status) || " ", event.task, el);
                this.registerDomEvent(checkbox, "change", (e) => __awaiter(this, void 0, void 0, function* () {
                    e.stopPropagation();
                    e.preventDefault();
                    if (event.task) {
                        yield this.toggleTaskCompletion(event.task, event);
                    }
                }));
            });
        }
        // Event text with markdown rendering
        const textEl = contentEl.createDiv("timeline-event-text");
        const contentContainer = textEl.createDiv("timeline-event-content-text");
        // Use MarkdownRendererComponent to render the task content
        if (event.task) {
            const markdownRenderer = new MarkdownRendererComponent(this.app, contentContainer, event.task.filePath, true // hideMarks = true to clean up task metadata
            );
            this.addChild(markdownRenderer);
            // Set the file context if available
            const file = this.app.vault.getFileByPath(event.task.filePath);
            if (file instanceof TFile) {
                markdownRenderer.setFile(file);
            }
            // Render the content asynchronously
            markdownRenderer.render(event.content, true).catch((error) => {
                console.error("Failed to render markdown in timeline:", error);
                // Fallback to plain text if rendering fails
                contentContainer.setText(event.content);
            });
        }
        else {
            // Fallback for non-task events
            contentContainer.setText(event.content);
        }
        // Event actions
        const actionsEl = eventEl.createDiv("timeline-event-actions");
        if (event.task) {
            // Go to task
            const gotoBtn = actionsEl.createDiv("timeline-event-action");
            setIcon(gotoBtn, "external-link");
            gotoBtn.setAttribute("aria-label", t("Go to task"));
            this.registerDomEvent(gotoBtn, "click", () => {
                this.goToTask(event.task);
            });
        }
        // Click to focus (but not when clicking on checkbox or actions)
        this.registerDomEvent(eventEl, "click", (e) => {
            // Prevent navigation if clicking on checkbox or action buttons
            const target = e.target;
            if (target.closest(".timeline-event-checkbox") ||
                target.closest(".timeline-event-actions") ||
                target.closest('input[type="checkbox"]')) {
                return;
            }
            if (event.task) {
                this.goToTask(event.task);
            }
        });
    }
    goToTask(task) {
        return __awaiter(this, void 0, void 0, function* () {
            const file = this.app.vault.getFileByPath(task.filePath);
            if (!file)
                return;
            // Check if it's a canvas file
            if (task.metadata.sourceType === "canvas") {
                // For canvas files, open directly
                const leaf = this.app.workspace.getLeaf("tab");
                yield leaf.openFile(file);
                this.app.workspace.setActiveLeaf(leaf, { focus: true });
                return;
            }
            // For markdown files, prefer activating existing leaf if file is open
            const existingLeaf = this.app.workspace
                .getLeavesOfType("markdown")
                .find((leaf) => leaf.view.file === file // Type assertion needed here
            );
            const leafToUse = existingLeaf || this.app.workspace.getLeaf("tab"); // Open in new tab if not open
            yield leafToUse.openFile(file, {
                active: true,
                eState: {
                    line: task.line,
                },
            });
            // Focus the editor after opening
            this.app.workspace.setActiveLeaf(leafToUse, { focus: true });
        });
    }
    handleQuickCapture() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.markdownEditor)
                return;
            const content = this.markdownEditor.value.trim();
            if (!content)
                return;
            try {
                // Use the plugin's quick capture settings
                const captureOptions = this.plugin.settings.quickCapture;
                yield saveCapture(this.app, content, captureOptions);
                // Clear the input
                this.markdownEditor.set("", false);
                // Refresh timeline
                yield this.loadEvents();
                this.renderTimeline();
                // Check if we should collapse after capture
                if (this.plugin.settings.timelineSidebar.quickInputCollapseOnCapture) {
                    this.toggleInputCollapse();
                }
                else {
                    // Focus back to input
                    (_a = this.markdownEditor.editor) === null || _a === void 0 ? void 0 : _a.focus();
                }
            }
            catch (error) {
                console.error("Failed to capture:", error);
            }
        });
    }
    scrollToToday() {
        const todayEl = this.timelineContainerEl.querySelector(".timeline-date-group.is-today");
        if (todayEl) {
            this.isAutoScrolling = true;
            todayEl.scrollIntoView({ behavior: "smooth", block: "start" });
            setTimeout(() => {
                this.isAutoScrolling = false;
            }, 1000);
        }
    }
    toggleFocusMode() {
        this.timelineContainerEl.toggleClass("focus-mode", !this.timelineContainerEl.hasClass("focus-mode"));
        // In focus mode, only show today's events
        // Implementation depends on specific requirements
    }
    handleScroll() {
        if (this.isAutoScrolling)
            return;
        // Implement infinite scroll or lazy loading if needed
        const { scrollTop, scrollHeight, clientHeight } = this.timelineContainerEl;
        // Load more events when near bottom
        if (scrollTop + clientHeight >= scrollHeight - 100) {
            // Load more historical events
            this.loadMoreEvents();
        }
    }
    loadMoreEvents() {
        return __awaiter(this, void 0, void 0, function* () {
            // Implement loading more historical events
            // This could involve loading older tasks or extending the date range
        });
    }
    toggleTaskCompletion(task, event) {
        return __awaiter(this, void 0, void 0, function* () {
            const updatedTask = Object.assign(Object.assign({}, task), { completed: !task.completed });
            if (updatedTask.completed) {
                updatedTask.metadata.completedDate = Date.now();
                const completedMark = (this.plugin.settings.taskStatuses.completed || "x").split("|")[0];
                if (updatedTask.status !== completedMark) {
                    updatedTask.status = completedMark;
                }
            }
            else {
                updatedTask.metadata.completedDate = undefined;
                const notStartedMark = this.plugin.settings.taskStatuses.notStarted || " ";
                if (updatedTask.status.toLowerCase() === "x") {
                    updatedTask.status = notStartedMark;
                }
            }
            if (!this.plugin.writeAPI) {
                console.error("WriteAPI not available");
                return;
            }
            try {
                const result = yield this.plugin.writeAPI.updateTask({
                    taskId: task.id,
                    updates: updatedTask,
                });
                if (!result.success) {
                    console.error("Failed to toggle task completion:", result.error);
                    return;
                }
                // Update the local event data immediately for responsive UI
                if (event) {
                    event.task = updatedTask;
                    event.status = updatedTask.status;
                    // Update the event element's visual state immediately
                    const eventEl = this.timelineContainerEl.querySelector(`[data-event-id="${event.id}"]`);
                    if (eventEl) {
                        if (updatedTask.completed) {
                            eventEl.addClass("is-completed");
                        }
                        else {
                            eventEl.removeClass("is-completed");
                        }
                    }
                }
                // Reload events to ensure consistency
                yield this.loadEvents();
                this.renderTimeline();
            }
            catch (error) {
                console.error("Failed to toggle task completion:", error);
                // Revert local changes if the update failed
                if (event) {
                    event.task = task;
                    event.status = task.status;
                }
            }
        });
    }
    updateTargetInfo(targetInfoEl) {
        targetInfoEl.empty();
        const settings = this.plugin.settings.quickCapture;
        let targetText = "";
        if (settings.targetType === "daily-note") {
            const dateStr = moment().format(settings.dailyNoteSettings.format);
            const fileName = `${dateStr}.md`;
            const fullPath = settings.dailyNoteSettings.folder
                ? `${settings.dailyNoteSettings.folder}/${fileName}`
                : fileName;
            targetText = `${t("to")} ${fullPath}`;
        }
        else {
            targetText = `${t("to")} ${settings.targetFile || "Quick Capture.md"}`;
        }
        if (settings.targetHeading) {
            targetText += ` → ${settings.targetHeading}`;
        }
        targetInfoEl.setText(targetText);
        targetInfoEl.setAttribute("title", targetText);
    }
    // Method to trigger view update (called when settings change)
    triggerViewUpdate() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadEvents();
            this.renderTimeline();
        });
    }
    // Method to refresh timeline data
    refreshTimeline() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadEvents();
            this.renderTimeline();
        });
    }
    // Create collapsed header content
    createCollapsedHeader() {
        if (!this.collapsedHeaderEl)
            return;
        // Expand button
        const expandBtn = this.collapsedHeaderEl.createDiv("collapsed-expand-btn");
        setIcon(expandBtn, "chevron-right");
        expandBtn.setAttribute("aria-label", t("Expand quick input"));
        this.registerDomEvent(expandBtn, "click", () => {
            this.toggleInputCollapse();
        });
        // Title
        const titleEl = this.collapsedHeaderEl.createDiv("collapsed-title");
        titleEl.setText(t("Quick Capture"));
        // Quick actions
        if (this.plugin.settings.timelineSidebar.quickInputShowQuickActions) {
            const quickActionsEl = this.collapsedHeaderEl.createDiv("collapsed-quick-actions");
            // Quick capture button
            const quickCaptureBtn = quickActionsEl.createDiv("collapsed-quick-capture");
            setIcon(quickCaptureBtn, "plus");
            quickCaptureBtn.setAttribute("aria-label", t("Quick capture"));
            this.registerDomEvent(quickCaptureBtn, "click", () => {
                // Expand and focus editor
                if (this.isInputCollapsed) {
                    this.toggleInputCollapse();
                    setTimeout(() => {
                        var _a, _b;
                        (_b = (_a = this.markdownEditor) === null || _a === void 0 ? void 0 : _a.editor) === null || _b === void 0 ? void 0 : _b.focus();
                    }, 350); // Wait for animation
                }
            });
            // More options button
            const moreOptionsBtn = quickActionsEl.createDiv("collapsed-more-options");
            setIcon(moreOptionsBtn, "more-horizontal");
            moreOptionsBtn.setAttribute("aria-label", t("More options"));
            this.registerDomEvent(moreOptionsBtn, "click", () => {
                new QuickCaptureModal(this.app, this.plugin, {}, true).open();
            });
        }
    }
    // Toggle collapse state
    toggleInputCollapse() {
        if (this.isAnimating)
            return;
        this.isAnimating = true;
        this.isInputCollapsed = !this.isInputCollapsed;
        // Save state to settings
        this.plugin.settings.timelineSidebar.quickInputCollapsed = this.isInputCollapsed;
        this.plugin.saveSettings();
        if (this.isInputCollapsed) {
            this.handleCollapseEditor();
        }
        else {
            this.handleExpandEditor();
        }
        // Reset animation flag after animation completes
        setTimeout(() => {
            this.isAnimating = false;
        }, this.plugin.settings.timelineSidebar.quickInputAnimationDuration);
    }
    // Handle collapsing the editor
    handleCollapseEditor() {
        var _a;
        // Save current editor content
        if (this.markdownEditor) {
            this.tempEditorContent = this.markdownEditor.value;
        }
        // Add collapsed class for animation
        this.quickInputContainerEl.addClass("is-collapsing");
        this.quickInputContainerEl.addClass("is-collapsed");
        // Show collapsed header after a slight delay
        setTimeout(() => {
            var _a;
            (_a = this.collapsedHeaderEl) === null || _a === void 0 ? void 0 : _a.show();
            this.quickInputContainerEl.removeClass("is-collapsing");
        }, 50);
        // Update collapse button icon
        const collapseBtn = (_a = this.quickInputHeaderEl) === null || _a === void 0 ? void 0 : _a.querySelector(".quick-input-collapse-btn");
        if (collapseBtn) {
            setIcon(collapseBtn, "chevron-right");
            collapseBtn.setAttribute("aria-label", t("Expand quick input"));
        }
    }
    // Handle expanding the editor
    handleExpandEditor() {
        var _a, _b;
        // Hide collapsed header immediately
        (_a = this.collapsedHeaderEl) === null || _a === void 0 ? void 0 : _a.hide();
        // Remove collapsed class for animation
        this.quickInputContainerEl.addClass("is-expanding");
        this.quickInputContainerEl.removeClass("is-collapsed");
        // Restore editor content
        if (this.markdownEditor && this.tempEditorContent) {
            this.markdownEditor.set(this.tempEditorContent, false);
            this.tempEditorContent = "";
        }
        // Focus editor after animation
        setTimeout(() => {
            var _a, _b;
            this.quickInputContainerEl.removeClass("is-expanding");
            (_b = (_a = this.markdownEditor) === null || _a === void 0 ? void 0 : _a.editor) === null || _b === void 0 ? void 0 : _b.focus();
        }, 50);
        // Update collapse button icon
        const collapseBtn = (_b = this.quickInputHeaderEl) === null || _b === void 0 ? void 0 : _b.querySelector(".quick-input-collapse-btn");
        if (collapseBtn) {
            setIcon(collapseBtn, "chevron-down");
            collapseBtn.setAttribute("aria-label", t("Collapse quick input"));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGltZWxpbmVTaWRlYmFyVmlldy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlRpbWVsaW5lU2lkZWJhclZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFDTixRQUFRLEVBRVIsT0FBTyxFQUNQLE1BQU0sRUFFTixRQUFRLEVBR1IsS0FBSyxHQUNMLE1BQU0sVUFBVSxDQUFDO0FBR2xCLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUUxQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUMzRyxPQUFPLEVBQ04sOEJBQThCLEdBRTlCLE1BQU0saURBQWlELENBQUM7QUFDekQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzNELE9BQU8sK0JBQStCLENBQUM7QUFDdkMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDN0UsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFdkYsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsMEJBQTBCLENBQUM7QUFFckUseUVBQXlFO0FBQ3pFLE1BQU0sa0JBQWtCLEdBQUc7SUFDMUIsR0FBRyxFQUFFLENBQUM7SUFDTixTQUFTLEVBQUUsQ0FBQztJQUNaLEtBQUssRUFBRSxDQUFDO0lBQ1IsU0FBUyxFQUFFLENBQUM7Q0FDSCxDQUFDO0FBK0JYLE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxRQUFRO0lBd0JoRCxZQUFZLElBQW1CLEVBQUUsTUFBNkI7UUFDN0QsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBcEJMLG1CQUFjLEdBQW9DLElBQUksQ0FBQztRQUN2RCxnQkFBVyxHQUFrQixNQUFNLEVBQUUsQ0FBQztRQUN0QyxXQUFNLEdBQTRCLEVBQUUsQ0FBQztRQUNyQyxvQkFBZSxHQUFZLEtBQUssQ0FBQztRQUV6Qyw0QkFBNEI7UUFDcEIscUJBQWdCLEdB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TSxXQUFXLEdBQUcsTUFBQSxJQUFJLENBQUMsa0JBQWtCLDBDQUFFLGFBQWEsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBQ3hGLElBQUksV0FBVyxFQUFFO1lBQ2hCLE9BQU8sQ0FBQyxXQUEwQixFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ3BELFdBQVcsQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUM7U0FDbEU7SUFDRixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xyXG5cdEl0ZW1WaWV3LFxyXG5cdFdvcmtzcGFjZUxlYWYsXHJcblx0c2V0SWNvbixcclxuXHRtb21lbnQsXHJcblx0Q29tcG9uZW50LFxyXG5cdGRlYm91bmNlLFxyXG5cdEJ1dHRvbkNvbXBvbmVudCxcclxuXHRQbGF0Zm9ybSxcclxuXHRURmlsZSxcclxufSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgVGFzayB9IGZyb20gXCJAL3R5cGVzL3Rhc2tcIjtcclxuaW1wb3J0IHsgVGltZUNvbXBvbmVudCB9IGZyb20gXCJAL3R5cGVzL3RpbWUtcGFyc2luZ1wiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7IFF1aWNrQ2FwdHVyZU1vZGFsIH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy9xdWljay1jYXB0dXJlL21vZGFscy9RdWlja0NhcHR1cmVNb2RhbFdpdGhTd2l0Y2hcIjtcclxuaW1wb3J0IHtcclxuXHRjcmVhdGVFbWJlZGRhYmxlTWFya2Rvd25FZGl0b3IsXHJcblx0RW1iZWRkYWJsZU1hcmtkb3duRWRpdG9yLFxyXG59IGZyb20gXCIuLi8uLi8uLi9lZGl0b3ItZXh0ZW5zaW9ucy9jb3JlL21hcmtkb3duLWVkaXRvclwiO1xyXG5pbXBvcnQgeyBzYXZlQ2FwdHVyZSB9IGZyb20gXCJAL3V0aWxzL2ZpbGUvZmlsZS1vcGVyYXRpb25zXCI7XHJcbmltcG9ydCBcIkAvc3R5bGVzL3RpbWVsaW5lLXNpZGViYXIuY3NzXCI7XHJcbmltcG9ydCB7IGNyZWF0ZVRhc2tDaGVja2JveCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay92aWV3L2RldGFpbHNcIjtcclxuaW1wb3J0IHsgTWFya2Rvd25SZW5kZXJlckNvbXBvbmVudCB9IGZyb20gXCJAL2NvbXBvbmVudHMvdWkvcmVuZGVyZXJzL01hcmtkb3duUmVuZGVyZXJcIjtcclxuXHJcbmV4cG9ydCBjb25zdCBUSU1FTElORV9TSURFQkFSX1ZJRVdfVFlQRSA9IFwidGctdGltZWxpbmUtc2lkZWJhci12aWV3XCI7XHJcblxyXG4vLyBEYXRlIHR5cGUgcHJpb3JpdHkgZm9yIGRlZHVwbGljYXRpb24gKGhpZ2hlciBudW1iZXIgPSBoaWdoZXIgcHJpb3JpdHkpXHJcbmNvbnN0IERBVEVfVFlQRV9QUklPUklUWSA9IHtcclxuXHRkdWU6IDQsXHJcblx0c2NoZWR1bGVkOiAzLFxyXG5cdHN0YXJ0OiAyLFxyXG5cdGNvbXBsZXRlZDogMSxcclxufSBhcyBjb25zdDtcclxuXHJcbmludGVyZmFjZSBUaW1lbGluZUV2ZW50IHtcclxuXHRpZDogc3RyaW5nO1xyXG5cdGNvbnRlbnQ6IHN0cmluZztcclxuXHR0aW1lOiBEYXRlO1xyXG5cdHR5cGU6IFwidGFza1wiIHwgXCJldmVudFwiO1xyXG5cdHN0YXR1cz86IHN0cmluZztcclxuXHR0YXNrPzogVGFzaztcclxuXHRpc1RvZGF5PzogYm9vbGVhbjtcclxufVxyXG5cclxuLyoqXHJcbiAqIEVuaGFuY2VkIFRpbWVsaW5lRXZlbnQgaW50ZXJmYWNlIHdpdGggdGltZSBjb21wb25lbnQgc3VwcG9ydFxyXG4gKi9cclxuaW50ZXJmYWNlIEVuaGFuY2VkVGltZWxpbmVFdmVudCBleHRlbmRzIFRpbWVsaW5lRXZlbnQge1xyXG5cdC8qKiBFbmhhbmNlZCB0aW1lIGluZm9ybWF0aW9uICovXHJcblx0dGltZUluZm8/OiB7XHJcblx0XHQvKiogUHJpbWFyeSB0aW1lIGZvciBkaXNwbGF5IGFuZCBzb3J0aW5nICovXHJcblx0XHRwcmltYXJ5VGltZTogRGF0ZTtcclxuXHRcdC8qKiBFbmQgdGltZSBmb3IgcmFuZ2VzICovXHJcblx0XHRlbmRUaW1lPzogRGF0ZTtcclxuXHRcdC8qKiBXaGV0aGVyIHRoaXMgaXMgYSB0aW1lIHJhbmdlICovXHJcblx0XHRpc1JhbmdlOiBib29sZWFuO1xyXG5cdFx0LyoqIE9yaWdpbmFsIHRpbWUgY29tcG9uZW50IGZyb20gcGFyc2luZyAqL1xyXG5cdFx0dGltZUNvbXBvbmVudD86IFRpbWVDb21wb25lbnQ7XHJcblx0XHQvKiogRGlzcGxheSBmb3JtYXQgcHJlZmVyZW5jZSAqL1xyXG5cdFx0ZGlzcGxheUZvcm1hdDogXCJ0aW1lLW9ubHlcIiB8IFwiZGF0ZS10aW1lXCIgfCBcInJhbmdlXCI7XHJcblx0fTtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFRpbWVsaW5lU2lkZWJhclZpZXcgZXh0ZW5kcyBJdGVtVmlldyB7XHJcblx0cHJpdmF0ZSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbjtcclxuXHRwdWJsaWMgY29udGFpbmVyRWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgdGltZWxpbmVDb250YWluZXJFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBxdWlja0lucHV0Q29udGFpbmVyRWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgbWFya2Rvd25FZGl0b3I6IEVtYmVkZGFibGVNYXJrZG93bkVkaXRvciB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgY3VycmVudERhdGU6IG1vbWVudC5Nb21lbnQgPSBtb21lbnQoKTtcclxuXHRwcml2YXRlIGV2ZW50czogRW5oYW5jZWRUaW1lbGluZUV2ZW50W10gPSBbXTtcclxuXHRwcml2YXRlIGlzQXV0b1Njcm9sbGluZzogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuXHQvLyBDb2xsYXBzZSBzdGF0ZSBtYW5hZ2VtZW50XHJcblx0cHJpdmF0ZSBpc0lucHV0Q29sbGFwc2VkOiBib29sZWFuID0gZmFsc2U7XHJcblx0cHJpdmF0ZSB0ZW1wRWRpdG9yQ29udGVudDogc3RyaW5nID0gXCJcIjtcclxuXHRwcml2YXRlIGlzQW5pbWF0aW5nOiBib29sZWFuID0gZmFsc2U7XHJcblx0cHJpdmF0ZSBjb2xsYXBzZWRIZWFkZXJFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIHF1aWNrSW5wdXRIZWFkZXJFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHJcblx0Ly8gRGVib3VuY2VkIG1ldGhvZHNcclxuXHRwcml2YXRlIGRlYm91bmNlZFJlbmRlciA9IGRlYm91bmNlKGFzeW5jICgpID0+IHtcclxuXHRcdGF3YWl0IHRoaXMubG9hZEV2ZW50cygpO1xyXG5cdFx0dGhpcy5yZW5kZXJUaW1lbGluZSgpO1xyXG5cdH0sIDMwMCk7XHJcblx0cHJpdmF0ZSBkZWJvdW5jZWRTY3JvbGwgPSBkZWJvdW5jZSh0aGlzLmhhbmRsZVNjcm9sbC5iaW5kKHRoaXMpLCAxMDApO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihsZWFmOiBXb3Jrc3BhY2VMZWFmLCBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbikge1xyXG5cdFx0c3VwZXIobGVhZik7XHJcblx0XHR0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuXHR9XHJcblxyXG5cdGdldFZpZXdUeXBlKCk6IHN0cmluZyB7XHJcblx0XHRyZXR1cm4gVElNRUxJTkVfU0lERUJBUl9WSUVXX1RZUEU7XHJcblx0fVxyXG5cclxuXHRnZXREaXNwbGF5VGV4dCgpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIHQoXCJUaW1lbGluZVwiKTtcclxuXHR9XHJcblxyXG5cdGdldEljb24oKTogc3RyaW5nIHtcclxuXHRcdHJldHVybiBcImNhbGVuZGFyLWNsb2NrXCI7XHJcblx0fVxyXG5cclxuXHRhc3luYyBvbk9wZW4oKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsID0gdGhpcy5jb250ZW50RWw7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLmVtcHR5KCk7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLmFkZENsYXNzKFwidGltZWxpbmUtc2lkZWJhci1jb250YWluZXJcIik7XHJcblxyXG5cdFx0Ly8gUmVzdG9yZSBjb2xsYXBzZWQgc3RhdGUgZnJvbSBzZXR0aW5nc1xyXG5cdFx0dGhpcy5pc0lucHV0Q29sbGFwc2VkID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MudGltZWxpbmVTaWRlYmFyLnF1aWNrSW5wdXRDb2xsYXBzZWQ7XHJcblxyXG5cdFx0dGhpcy5jcmVhdGVIZWFkZXIoKTtcclxuXHRcdHRoaXMuY3JlYXRlVGltZWxpbmVBcmVhKCk7XHJcblx0XHR0aGlzLmNyZWF0ZVF1aWNrSW5wdXRBcmVhKCk7XHJcblxyXG5cdFx0Ly8gTG9hZCBpbml0aWFsIGRhdGFcclxuXHRcdGF3YWl0IHRoaXMubG9hZEV2ZW50cygpO1xyXG5cdFx0dGhpcy5yZW5kZXJUaW1lbGluZSgpO1xyXG5cclxuXHRcdC8vIEF1dG8tc2Nyb2xsIHRvIHRvZGF5IG9uIG9wZW5cclxuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHR0aGlzLnNjcm9sbFRvVG9kYXkoKTtcclxuXHRcdH0sIDEwMCk7XHJcblxyXG5cdFx0Ly8gUmVnaXN0ZXIgZm9yIHRhc2sgdXBkYXRlc1xyXG5cdFx0dGhpcy5yZWdpc3RlckV2ZW50KFxyXG5cdFx0XHR0aGlzLnBsdWdpbi5hcHAudmF1bHQub24oXCJtb2RpZnlcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMuZGVib3VuY2VkUmVuZGVyKCk7XHJcblx0XHRcdH0pXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIFJlZ2lzdGVyIGZvciB0YXNrIGNhY2hlIHVwZGF0ZXNcclxuXHRcdHRoaXMucmVnaXN0ZXJFdmVudChcclxuXHRcdFx0dGhpcy5wbHVnaW4uYXBwLndvcmtzcGFjZS5vbihcclxuXHRcdFx0XHRcInRhc2stZ2VuaXVzOnRhc2stY2FjaGUtdXBkYXRlZFwiLFxyXG5cdFx0XHRcdCgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuZGVib3VuY2VkUmVuZGVyKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHQpXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0b25DbG9zZSgpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGlmICh0aGlzLm1hcmtkb3duRWRpdG9yKSB7XHJcblx0XHRcdHRoaXMubWFya2Rvd25FZGl0b3IuZGVzdHJveSgpO1xyXG5cdFx0XHR0aGlzLm1hcmtkb3duRWRpdG9yID0gbnVsbDtcclxuXHRcdH1cclxuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY3JlYXRlSGVhZGVyKCk6IHZvaWQge1xyXG5cdFx0Y29uc3QgaGVhZGVyRWwgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdihcInRpbWVsaW5lLWhlYWRlclwiKTtcclxuXHJcblx0XHQvLyBUaXRsZVxyXG5cdFx0Y29uc3QgdGl0bGVFbCA9IGhlYWRlckVsLmNyZWF0ZURpdihcInRpbWVsaW5lLXRpdGxlXCIpO1xyXG5cdFx0dGl0bGVFbC5zZXRUZXh0KHQoXCJUaW1lbGluZVwiKSk7XHJcblxyXG5cdFx0Ly8gQ29udHJvbHNcclxuXHRcdGNvbnN0IGNvbnRyb2xzRWwgPSBoZWFkZXJFbC5jcmVhdGVEaXYoXCJ0aW1lbGluZS1jb250cm9sc1wiKTtcclxuXHJcblx0XHQvLyBUb2RheSBidXR0b25cclxuXHRcdGNvbnN0IHRvZGF5QnRuID0gY29udHJvbHNFbC5jcmVhdGVEaXYoXHJcblx0XHRcdFwidGltZWxpbmUtYnRuIHRpbWVsaW5lLXRvZGF5LWJ0blwiXHJcblx0XHQpO1xyXG5cdFx0c2V0SWNvbih0b2RheUJ0biwgXCJjYWxlbmRhclwiKTtcclxuXHRcdHRvZGF5QnRuLnNldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIiwgdChcIkdvIHRvIHRvZGF5XCIpKTtcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudCh0b2RheUJ0biwgXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdHRoaXMuc2Nyb2xsVG9Ub2RheSgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gUmVmcmVzaCBidXR0b25cclxuXHRcdGNvbnN0IHJlZnJlc2hCdG4gPSBjb250cm9sc0VsLmNyZWF0ZURpdihcclxuXHRcdFx0XCJ0aW1lbGluZS1idG4gdGltZWxpbmUtcmVmcmVzaC1idG5cIlxyXG5cdFx0KTtcclxuXHRcdHNldEljb24ocmVmcmVzaEJ0biwgXCJyZWZyZXNoLWN3XCIpO1xyXG5cdFx0cmVmcmVzaEJ0bi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIHQoXCJSZWZyZXNoXCIpKTtcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChyZWZyZXNoQnRuLCBcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0dGhpcy5sb2FkRXZlbnRzKCk7XHJcblx0XHRcdHRoaXMucmVuZGVyVGltZWxpbmUoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEZvY3VzIG1vZGUgdG9nZ2xlXHJcblx0XHRjb25zdCBmb2N1c0J0biA9IGNvbnRyb2xzRWwuY3JlYXRlRGl2KFxyXG5cdFx0XHRcInRpbWVsaW5lLWJ0biB0aW1lbGluZS1mb2N1cy1idG5cIlxyXG5cdFx0KTtcclxuXHRcdHNldEljb24oZm9jdXNCdG4sIFwiZm9jdXNcIik7XHJcblx0XHRmb2N1c0J0bi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIHQoXCJGb2N1cyBvbiB0b2RheVwiKSk7XHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZm9jdXNCdG4sIFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHR0aGlzLnRvZ2dsZUZvY3VzTW9kZSgpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNyZWF0ZVRpbWVsaW5lQXJlYSgpOiB2b2lkIHtcclxuXHRcdHRoaXMudGltZWxpbmVDb250YWluZXJFbCA9XHJcblx0XHRcdHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KFwidGltZWxpbmUtY29udGVudFwiKTtcclxuXHJcblx0XHQvLyBBZGQgc2Nyb2xsIGxpc3RlbmVyIGZvciBpbmZpbml0ZSBzY3JvbGxcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudCh0aGlzLnRpbWVsaW5lQ29udGFpbmVyRWwsIFwic2Nyb2xsXCIsICgpID0+IHtcclxuXHRcdFx0dGhpcy5kZWJvdW5jZWRTY3JvbGwoKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVRdWlja0lucHV0QXJlYSgpOiB2b2lkIHtcclxuXHRcdHRoaXMucXVpY2tJbnB1dENvbnRhaW5lckVsID0gdGhpcy5jb250YWluZXJFbC5jcmVhdGVEaXYoXHJcblx0XHRcdFwidGltZWxpbmUtcXVpY2staW5wdXRcIlxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBDcmVhdGUgY29sbGFwc2VkIGhlYWRlciAoYWx3YXlzIGV4aXN0cyBidXQgaGlkZGVuIHdoZW4gZXhwYW5kZWQpXHJcblx0XHR0aGlzLmNvbGxhcHNlZEhlYWRlckVsID0gdGhpcy5xdWlja0lucHV0Q29udGFpbmVyRWwuY3JlYXRlRGl2KFxyXG5cdFx0XHRcInF1aWNrLWlucHV0LWhlYWRlci1jb2xsYXBzZWRcIlxyXG5cdFx0KTtcclxuXHRcdHRoaXMuY3JlYXRlQ29sbGFwc2VkSGVhZGVyKCk7XHJcblxyXG5cdFx0Ly8gSW5wdXQgaGVhZGVyIHdpdGggdGFyZ2V0IGluZm9cclxuXHRcdHRoaXMucXVpY2tJbnB1dEhlYWRlckVsID1cclxuXHRcdFx0dGhpcy5xdWlja0lucHV0Q29udGFpbmVyRWwuY3JlYXRlRGl2KFwicXVpY2staW5wdXQtaGVhZGVyXCIpO1xyXG5cclxuXHRcdC8vIEFkZCBjb2xsYXBzZSBidXR0b24gdG8gaGVhZGVyXHJcblx0XHRjb25zdCBoZWFkZXJMZWZ0ID0gdGhpcy5xdWlja0lucHV0SGVhZGVyRWwuY3JlYXRlRGl2KFwicXVpY2staW5wdXQtaGVhZGVyLWxlZnRcIik7XHJcblxyXG5cdFx0Y29uc3QgY29sbGFwc2VCdG4gPSBoZWFkZXJMZWZ0LmNyZWF0ZURpdihcInF1aWNrLWlucHV0LWNvbGxhcHNlLWJ0blwiKTtcclxuXHRcdHNldEljb24oY29sbGFwc2VCdG4sIFwiY2hldnJvbi1kb3duXCIpO1xyXG5cdFx0Y29sbGFwc2VCdG4uc2V0QXR0cmlidXRlKFwiYXJpYS1sYWJlbFwiLCB0KFwiQ29sbGFwc2UgcXVpY2sgaW5wdXRcIikpO1xyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGNvbGxhcHNlQnRuLCBcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0dGhpcy50b2dnbGVJbnB1dENvbGxhcHNlKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCBoZWFkZXJUaXRsZSA9IGhlYWRlckxlZnQuY3JlYXRlRGl2KFwicXVpY2staW5wdXQtdGl0bGVcIik7XHJcblx0XHRoZWFkZXJUaXRsZS5zZXRUZXh0KHQoXCJRdWljayBDYXB0dXJlXCIpKTtcclxuXHJcblx0XHRjb25zdCB0YXJnZXRJbmZvID0gdGhpcy5xdWlja0lucHV0SGVhZGVyRWwuY3JlYXRlRGl2KFwicXVpY2staW5wdXQtdGFyZ2V0LWluZm9cIik7XHJcblx0XHR0aGlzLnVwZGF0ZVRhcmdldEluZm8odGFyZ2V0SW5mbyk7XHJcblxyXG5cdFx0Ly8gRWRpdG9yIGNvbnRhaW5lclxyXG5cdFx0Y29uc3QgZWRpdG9yQ29udGFpbmVyID1cclxuXHRcdFx0dGhpcy5xdWlja0lucHV0Q29udGFpbmVyRWwuY3JlYXRlRGl2KFwicXVpY2staW5wdXQtZWRpdG9yXCIpO1xyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgbWFya2Rvd24gZWRpdG9yXHJcblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0dGhpcy5tYXJrZG93bkVkaXRvciA9IGNyZWF0ZUVtYmVkZGFibGVNYXJrZG93bkVkaXRvcihcclxuXHRcdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0XHRlZGl0b3JDb250YWluZXIsXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0cGxhY2Vob2xkZXI6IHQoXCJXaGF0IGRvIHlvdSB3YW50IHRvIGRvIHRvZGF5P1wiKSxcclxuXHRcdFx0XHRcdG9uRW50ZXI6IChlZGl0b3IsIG1vZCwgc2hpZnQpID0+IHtcclxuXHRcdFx0XHRcdFx0aWYgKG1vZCkge1xyXG5cdFx0XHRcdFx0XHRcdC8vIFN1Ym1pdCBvbiBDbWQvQ3RybCtFbnRlclxyXG5cdFx0XHRcdFx0XHRcdHRoaXMuaGFuZGxlUXVpY2tDYXB0dXJlKCk7XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdG9uRXNjYXBlOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIENsZWFyIGlucHV0IG9uIEVzY2FwZVxyXG5cdFx0XHRcdFx0XHRpZiAodGhpcy5tYXJrZG93bkVkaXRvcikge1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMubWFya2Rvd25FZGl0b3Iuc2V0KFwiXCIsIGZhbHNlKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdG9uQ2hhbmdlOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIEF1dG8tcmVzaXplIG9yIG90aGVyIGJlaGF2aW9yc1xyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9XHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBGb2N1cyB0aGUgZWRpdG9yIGlmIG5vdCBjb2xsYXBzZWRcclxuXHRcdFx0aWYgKCF0aGlzLmlzSW5wdXRDb2xsYXBzZWQpIHtcclxuXHRcdFx0XHR0aGlzLm1hcmtkb3duRWRpdG9yPy5lZGl0b3I/LmZvY3VzKCk7XHJcblx0XHRcdH1cclxuXHRcdH0sIDUwKTtcclxuXHJcblx0XHQvLyBBY3Rpb24gYnV0dG9uc1xyXG5cdFx0Y29uc3QgYWN0aW9uc0VsID0gdGhpcy5xdWlja0lucHV0Q29udGFpbmVyRWwuY3JlYXRlRGl2KFxyXG5cdFx0XHRcInF1aWNrLWlucHV0LWFjdGlvbnNcIlxyXG5cdFx0KTtcclxuXHJcblx0XHRjb25zdCBjYXB0dXJlQnRuID0gYWN0aW9uc0VsLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0Y2xzOiBcInF1aWNrLWNhcHR1cmUtYnRuIG1vZC1jdGFcIixcclxuXHRcdFx0dGV4dDogdChcIkNhcHR1cmVcIiksXHJcblx0XHR9KTtcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChjYXB0dXJlQnRuLCBcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0dGhpcy5oYW5kbGVRdWlja0NhcHR1cmUoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IGZ1bGxNb2RhbEJ0biA9IGFjdGlvbnNFbC5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdGNsczogXCJxdWljay1tb2RhbC1idG5cIixcclxuXHRcdFx0dGV4dDogdChcIk1vcmUgb3B0aW9uc1wiKSxcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGZ1bGxNb2RhbEJ0biwgXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdG5ldyBRdWlja0NhcHR1cmVNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4sIHt9LCB0cnVlKS5vcGVuKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBBcHBseSBpbml0aWFsIGNvbGxhcHNlZCBzdGF0ZVxyXG5cdFx0aWYgKHRoaXMuaXNJbnB1dENvbGxhcHNlZCkge1xyXG5cdFx0XHR0aGlzLnF1aWNrSW5wdXRDb250YWluZXJFbC5hZGRDbGFzcyhcImlzLWNvbGxhcHNlZFwiKTtcclxuXHRcdFx0dGhpcy5jb2xsYXBzZWRIZWFkZXJFbD8uc2hvdygpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy5jb2xsYXBzZWRIZWFkZXJFbD8uaGlkZSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBsb2FkRXZlbnRzKCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Ly8gR2V0IHRhc2tzIGZyb20gdGhlIHBsdWdpbidzIGRhdGFmbG93XHJcblx0XHRsZXQgYWxsVGFza3M6IFRhc2tbXSA9IFtdO1xyXG5cclxuXHRcdGlmICh0aGlzLnBsdWdpbi5kYXRhZmxvd09yY2hlc3RyYXRvcikge1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdGFsbFRhc2tzID0gYXdhaXQgdGhpcy5wbHVnaW4uZGF0YWZsb3dPcmNoZXN0cmF0b3IuZ2V0UXVlcnlBUEkoKS5nZXRBbGxUYXNrcygpO1xyXG5cdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gZ2V0IHRhc2tzIGZyb20gZGF0YWZsb3c6XCIsIGVycm9yKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuZXZlbnRzID0gW107XHJcblxyXG5cdFx0Ly8gRmlsdGVyIHRhc2tzIGJhc2VkIG9uIHNob3dDb21wbGV0ZWRUYXNrcyBzZXR0aW5nXHJcblx0XHRjb25zdCBzaG91bGRTaG93Q29tcGxldGVkVGFza3MgPVxyXG5cdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy50aW1lbGluZVNpZGViYXIuc2hvd0NvbXBsZXRlZFRhc2tzO1xyXG5cclxuXHRcdC8vIEdldCBhYmFuZG9uZWQgc3RhdHVzIG1hcmtlcnMgdG8gZmlsdGVyIG91dFxyXG5cdFx0Y29uc3QgYWJhbmRvbmVkU3RhdHVzZXMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXNrU3RhdHVzZXMuYWJhbmRvbmVkLnNwbGl0KFwifFwiKTtcclxuXHJcblx0XHRjb25zdCBmaWx0ZXJlZFRhc2tzID0gc2hvdWxkU2hvd0NvbXBsZXRlZFRhc2tzXHJcblx0XHRcdD8gYWxsVGFza3NcclxuXHRcdFx0OiBhbGxUYXNrcy5maWx0ZXIoKHRhc2spID0+IHtcclxuXHRcdFx0XHQvLyBGaWx0ZXIgb3V0IGNvbXBsZXRlZCB0YXNrcyBBTkQgYWJhbmRvbmVkL2NhbmNlbGxlZCB0YXNrc1xyXG5cdFx0XHRcdHJldHVybiAhdGFzay5jb21wbGV0ZWQgJiYgIWFiYW5kb25lZFN0YXR1c2VzLmluY2x1ZGVzKHRhc2suc3RhdHVzKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gRmlsdGVyIG91dCBJQ1MgYmFkZ2UgZXZlbnRzIGZyb20gdGltZWxpbmVcclxuXHRcdC8vIElDUyBiYWRnZSBldmVudHMgc2hvdWxkIG9ubHkgYXBwZWFyIGFzIGJhZGdlcyBpbiBjYWxlbmRhciB2aWV3cywgbm90IGFzIGluZGl2aWR1YWwgdGltZWxpbmUgZXZlbnRzXHJcblx0XHRjb25zdCB0aW1lbGluZUZpbHRlcmVkVGFza3MgPSBmaWx0ZXJlZFRhc2tzLmZpbHRlcigodGFzaykgPT4ge1xyXG5cdFx0XHQvLyBDaGVjayBpZiB0aGlzIGlzIGFuIElDUyB0YXNrIHdpdGggYmFkZ2Ugc2hvd1R5cGVcclxuXHRcdFx0Y29uc3QgaXNJY3NUYXNrID0gKHRhc2sgYXMgYW55KS5zb3VyY2U/LnR5cGUgPT09IFwiaWNzXCI7XHJcblx0XHRcdGNvbnN0IGljc1Rhc2sgPSBpc0ljc1Rhc2sgPyAodGFzayBhcyBhbnkpIDogbnVsbDtcclxuXHRcdFx0Y29uc3Qgc2hvd0FzQmFkZ2UgPSBpY3NUYXNrPy5pY3NFdmVudD8uc291cmNlPy5zaG93VHlwZSA9PT0gXCJiYWRnZVwiO1xyXG5cclxuXHRcdFx0Ly8gRXhjbHVkZSBJQ1MgdGFza3Mgd2l0aCBiYWRnZSBzaG93VHlwZSBmcm9tIHRpbWVsaW5lXHJcblx0XHRcdHJldHVybiAhKGlzSWNzVGFzayAmJiBzaG93QXNCYWRnZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDb252ZXJ0IHRhc2tzIHRvIHRpbWVsaW5lIGV2ZW50c1xyXG5cdFx0dGltZWxpbmVGaWx0ZXJlZFRhc2tzLmZvckVhY2goKHRhc2spID0+IHtcclxuXHRcdFx0Y29uc3QgZGF0ZXMgPSB0aGlzLmV4dHJhY3REYXRlc0Zyb21UYXNrKHRhc2spO1xyXG5cdFx0XHRkYXRlcy5mb3JFYWNoKCh7ZGF0ZSwgdHlwZX0pID0+IHtcclxuXHRcdFx0XHRjb25zdCBldmVudDogRW5oYW5jZWRUaW1lbGluZUV2ZW50ID0ge1xyXG5cdFx0XHRcdFx0aWQ6IGAke3Rhc2suaWR9LSR7dHlwZX1gLFxyXG5cdFx0XHRcdFx0Y29udGVudDogdGFzay5jb250ZW50LFxyXG5cdFx0XHRcdFx0dGltZTogZGF0ZSxcclxuXHRcdFx0XHRcdHR5cGU6IFwidGFza1wiLFxyXG5cdFx0XHRcdFx0c3RhdHVzOiB0YXNrLnN0YXR1cyxcclxuXHRcdFx0XHRcdHRhc2s6IHRhc2ssXHJcblx0XHRcdFx0XHRpc1RvZGF5OiBtb21lbnQoZGF0ZSkuaXNTYW1lKG1vbWVudCgpLCBcImRheVwiKSxcclxuXHRcdFx0XHRcdHRpbWVJbmZvOiB0aGlzLmNyZWF0ZVRpbWVJbmZvRnJvbVRhc2sodGFzaywgZGF0ZSwgdHlwZSksXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHR0aGlzLmV2ZW50cy5wdXNoKGV2ZW50KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBTb3J0IGV2ZW50cyBieSB0aW1lIChuZXdlc3QgZmlyc3QgZm9yIHRpbWVsaW5lIGRpc3BsYXkpXHJcblx0XHR0aGlzLmV2ZW50cy5zb3J0KChhLCBiKSA9PiBiLnRpbWUuZ2V0VGltZSgpIC0gYS50aW1lLmdldFRpbWUoKSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBEZWR1cGxpY2F0ZXMgZGF0ZXMgYnkgcHJpb3JpdHkgd2hlbiBtdWx0aXBsZSBkYXRlIHR5cGVzIGZhbGwgb24gdGhlIHNhbWUgZGF5XHJcblx0ICogQHBhcmFtIGRhdGVzIEFycmF5IG9mIGRhdGUgb2JqZWN0cyB3aXRoIHR5cGUgaW5mb3JtYXRpb25cclxuXHQgKiBAcmV0dXJucyBEZWR1cGxpY2F0ZWQgYXJyYXkgd2l0aCBoaWdoZXN0IHByaW9yaXR5IGRhdGUgcGVyIGRheVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZGVkdXBsaWNhdGVEYXRlc0J5UHJpb3JpdHkoXHJcblx0XHRkYXRlczogQXJyYXk8eyBkYXRlOiBEYXRlOyB0eXBlOiBzdHJpbmcgfT5cclxuXHQpOiBBcnJheTx7IGRhdGU6IERhdGU7IHR5cGU6IHN0cmluZyB9PiB7XHJcblx0XHRpZiAoZGF0ZXMubGVuZ3RoIDw9IDEpIHtcclxuXHRcdFx0cmV0dXJuIGRhdGVzO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEdyb3VwIGRhdGVzIGJ5IGRheSAoWVlZWS1NTS1ERCBmb3JtYXQpXHJcblx0XHRjb25zdCBkYXRlR3JvdXBzID0gbmV3IE1hcDxcclxuXHRcdFx0c3RyaW5nLFxyXG5cdFx0XHRBcnJheTx7IGRhdGU6IERhdGU7IHR5cGU6IHN0cmluZyB9PlxyXG5cdFx0PigpO1xyXG5cclxuXHRcdGRhdGVzLmZvckVhY2goKGRhdGVJdGVtKSA9PiB7XHJcblx0XHRcdGNvbnN0IGRhdGVLZXkgPSBtb21lbnQoZGF0ZUl0ZW0uZGF0ZSkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcclxuXHRcdFx0aWYgKCFkYXRlR3JvdXBzLmhhcyhkYXRlS2V5KSkge1xyXG5cdFx0XHRcdGRhdGVHcm91cHMuc2V0KGRhdGVLZXksIFtdKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRkYXRlR3JvdXBzLmdldChkYXRlS2V5KSEucHVzaChkYXRlSXRlbSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBGb3IgZWFjaCBkYXksIGtlZXAgb25seSB0aGUgaGlnaGVzdCBwcmlvcml0eSBkYXRlIHR5cGVcclxuXHRcdGNvbnN0IGRlZHVwbGljYXRlZERhdGVzOiBBcnJheTx7IGRhdGU6IERhdGU7IHR5cGU6IHN0cmluZyB9PiA9IFtdO1xyXG5cclxuXHRcdGRhdGVHcm91cHMuZm9yRWFjaCgoZGF5RGF0ZXMpID0+IHtcclxuXHRcdFx0aWYgKGRheURhdGVzLmxlbmd0aCA9PT0gMSkge1xyXG5cdFx0XHRcdC8vIE9ubHkgb25lIGRhdGUgZm9yIHRoaXMgZGF5LCBrZWVwIGl0XHJcblx0XHRcdFx0ZGVkdXBsaWNhdGVkRGF0ZXMucHVzaChkYXlEYXRlc1swXSk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gTXVsdGlwbGUgZGF0ZXMgZm9yIHNhbWUgZGF5LCBmaW5kIGhpZ2hlc3QgcHJpb3JpdHlcclxuXHRcdFx0XHRjb25zdCBoaWdoZXN0UHJpb3JpdHlEYXRlID0gZGF5RGF0ZXMucmVkdWNlKFxyXG5cdFx0XHRcdFx0KGhpZ2hlc3QsIGN1cnJlbnQpID0+IHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgY3VycmVudFByaW9yaXR5ID1cclxuXHRcdFx0XHRcdFx0XHREQVRFX1RZUEVfUFJJT1JJVFlbXHJcblx0XHRcdFx0XHRcdFx0XHRjdXJyZW50LnR5cGUgYXMga2V5b2YgdHlwZW9mIERBVEVfVFlQRV9QUklPUklUWVxyXG5cdFx0XHRcdFx0XHRcdFx0XSB8fCAwO1xyXG5cdFx0XHRcdFx0XHRjb25zdCBoaWdoZXN0UHJpb3JpdHkgPVxyXG5cdFx0XHRcdFx0XHRcdERBVEVfVFlQRV9QUklPUklUWVtcclxuXHRcdFx0XHRcdFx0XHRcdGhpZ2hlc3QudHlwZSBhcyBrZXlvZiB0eXBlb2YgREFURV9UWVBFX1BSSU9SSVRZXHJcblx0XHRcdFx0XHRcdFx0XHRdIHx8IDA7XHJcblxyXG5cdFx0XHRcdFx0XHRyZXR1cm4gY3VycmVudFByaW9yaXR5ID4gaGlnaGVzdFByaW9yaXR5XHJcblx0XHRcdFx0XHRcdFx0PyBjdXJyZW50XHJcblx0XHRcdFx0XHRcdFx0OiBoaWdoZXN0O1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdGRlZHVwbGljYXRlZERhdGVzLnB1c2goaGlnaGVzdFByaW9yaXR5RGF0ZSk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBkZWR1cGxpY2F0ZWREYXRlcztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZSB0aW1lIGluZm9ybWF0aW9uIGZyb20gdGFzayBtZXRhZGF0YSBhbmQgZW5oYW5jZWQgdGltZSBjb21wb25lbnRzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjcmVhdGVUaW1lSW5mb0Zyb21UYXNrKFxyXG5cdFx0dGFzazogVGFzayxcclxuXHRcdGRhdGU6IERhdGUsXHJcblx0XHR0eXBlOiBzdHJpbmdcclxuXHQpOiBFbmhhbmNlZFRpbWVsaW5lRXZlbnRbXCJ0aW1lSW5mb1wiXSB7XHJcblx0XHQvLyBDaGVjayBpZiB0YXNrIGhhcyBlbmhhbmNlZCBtZXRhZGF0YSB3aXRoIHRpbWUgY29tcG9uZW50c1xyXG5cdFx0Y29uc3QgZW5oYW5jZWRNZXRhZGF0YSA9IHRhc2subWV0YWRhdGEgYXMgYW55O1xyXG5cdFx0Y29uc3QgdGltZUNvbXBvbmVudHMgPSBlbmhhbmNlZE1ldGFkYXRhPy50aW1lQ29tcG9uZW50cztcclxuXHRcdGNvbnN0IGVuaGFuY2VkRGF0ZXMgPSBlbmhhbmNlZE1ldGFkYXRhPy5lbmhhbmNlZERhdGVzO1xyXG5cclxuXHRcdGlmICghdGltZUNvbXBvbmVudHMpIHtcclxuXHRcdFx0Ly8gTm8gdGltZSBjb21wb25lbnRzIGF2YWlsYWJsZSwgdXNlIGRlZmF1bHQgdGltZSBkaXNwbGF5XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0cHJpbWFyeVRpbWU6IGRhdGUsXHJcblx0XHRcdFx0aXNSYW5nZTogZmFsc2UsXHJcblx0XHRcdFx0ZGlzcGxheUZvcm1hdDogXCJkYXRlLXRpbWVcIixcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBEZXRlcm1pbmUgd2hpY2ggdGltZSBjb21wb25lbnQgdG8gdXNlIGJhc2VkIG9uIHRoZSBkYXRlIHR5cGVcclxuXHRcdGxldCByZWxldmFudFRpbWVDb21wb25lbnQ6IFRpbWVDb21wb25lbnQgfCB1bmRlZmluZWQ7XHJcblx0XHRsZXQgcmVsZXZhbnRFbmRUaW1lOiBEYXRlIHwgdW5kZWZpbmVkO1xyXG5cclxuXHRcdHN3aXRjaCAodHlwZSkge1xyXG5cdFx0XHRjYXNlIFwic3RhcnRcIjpcclxuXHRcdFx0XHRyZWxldmFudFRpbWVDb21wb25lbnQgPSB0aW1lQ29tcG9uZW50cy5zdGFydFRpbWU7XHJcblx0XHRcdFx0aWYgKHRpbWVDb21wb25lbnRzLmVuZFRpbWUgJiYgZW5oYW5jZWREYXRlcz8uZW5kRGF0ZVRpbWUpIHtcclxuXHRcdFx0XHRcdHJlbGV2YW50RW5kVGltZSA9IGVuaGFuY2VkRGF0ZXMuZW5kRGF0ZVRpbWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwiZHVlXCI6XHJcblx0XHRcdFx0cmVsZXZhbnRUaW1lQ29tcG9uZW50ID0gdGltZUNvbXBvbmVudHMuZHVlVGltZTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBcInNjaGVkdWxlZFwiOlxyXG5cdFx0XHRcdHJlbGV2YW50VGltZUNvbXBvbmVudCA9IHRpbWVDb21wb25lbnRzLnNjaGVkdWxlZFRpbWU7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0cmVsZXZhbnRUaW1lQ29tcG9uZW50ID0gdW5kZWZpbmVkO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIElmIG5vIHNwZWNpZmljIHRpbWUgY29tcG9uZW50IGZvdW5kIGZvciB0aGlzIGRhdGUgdHlwZSwgdHJ5IHRvIHVzZSBhbnkgYXZhaWxhYmxlIHRpbWUgY29tcG9uZW50XHJcblx0XHRpZiAoIXJlbGV2YW50VGltZUNvbXBvbmVudCkge1xyXG5cdFx0XHQvLyBQcmlvcml0eSBvcmRlcjogc3RhcnRUaW1lID4gZHVlVGltZSA+IHNjaGVkdWxlZFRpbWVcclxuXHRcdFx0aWYgKHRpbWVDb21wb25lbnRzLnN0YXJ0VGltZSkge1xyXG5cdFx0XHRcdHJlbGV2YW50VGltZUNvbXBvbmVudCA9IHRpbWVDb21wb25lbnRzLnN0YXJ0VGltZTtcclxuXHRcdFx0XHQvLyBJZiB3ZSBoYXZlIGJvdGggc3RhcnQgYW5kIGVuZCB0aW1lLCB0cmVhdCBpdCBhcyBhIHJhbmdlXHJcblx0XHRcdFx0aWYgKHRpbWVDb21wb25lbnRzLmVuZFRpbWUgJiYgZW5oYW5jZWREYXRlcz8uZW5kRGF0ZVRpbWUpIHtcclxuXHRcdFx0XHRcdHJlbGV2YW50RW5kVGltZSA9IGVuaGFuY2VkRGF0ZXMuZW5kRGF0ZVRpbWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2UgaWYgKHRpbWVDb21wb25lbnRzLmR1ZVRpbWUpIHtcclxuXHRcdFx0XHRyZWxldmFudFRpbWVDb21wb25lbnQgPSB0aW1lQ29tcG9uZW50cy5kdWVUaW1lO1xyXG5cdFx0XHR9IGVsc2UgaWYgKHRpbWVDb21wb25lbnRzLnNjaGVkdWxlZFRpbWUpIHtcclxuXHRcdFx0XHRyZWxldmFudFRpbWVDb21wb25lbnQgPSB0aW1lQ29tcG9uZW50cy5zY2hlZHVsZWRUaW1lO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKCFyZWxldmFudFRpbWVDb21wb25lbnQpIHtcclxuXHRcdFx0Ly8gTm8gdGltZSBjb21wb25lbnRzIGF2YWlsYWJsZSBhdCBhbGxcclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRwcmltYXJ5VGltZTogZGF0ZSxcclxuXHRcdFx0XHRpc1JhbmdlOiBmYWxzZSxcclxuXHRcdFx0XHRkaXNwbGF5Rm9ybWF0OiBcImRhdGUtdGltZVwiLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENyZWF0ZSBlbmhhbmNlZCBkYXRldGltZSBieSBjb21iaW5pbmcgZGF0ZSBhbmQgdGltZSBjb21wb25lbnRcclxuXHRcdC8vIFVzZSBsb2NhbCB0aW1lIChzZXRIb3VycykgaW5zdGVhZCBvZiBVVEMgdG8gbWF0Y2ggdGhlIHBhcnNlZCB0aW1lIGNvbXBvbmVudHNcclxuXHRcdGNvbnN0IGVuaGFuY2VkRGF0ZVRpbWUgPSBuZXcgRGF0ZShkYXRlKTtcclxuXHRcdGVuaGFuY2VkRGF0ZVRpbWUuc2V0SG91cnMoXHJcblx0XHRcdHJlbGV2YW50VGltZUNvbXBvbmVudC5ob3VyLFxyXG5cdFx0XHRyZWxldmFudFRpbWVDb21wb25lbnQubWludXRlLFxyXG5cdFx0XHRyZWxldmFudFRpbWVDb21wb25lbnQuc2Vjb25kIHx8IDAsXHJcblx0XHRcdDBcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gRGV0ZXJtaW5lIGlmIHRoaXMgaXMgYSB0aW1lIHJhbmdlXHJcblx0XHQvLyBDaGVjayBpZiB0aGUgdGltZSBjb21wb25lbnQgaXMgbWFya2VkIGFzIGEgcmFuZ2UgT1IgaWYgd2UgaGF2ZSBhbiBleHBsaWNpdCBlbmQgdGltZVxyXG5cdFx0Y29uc3QgaXNSYW5nZSA9IHJlbGV2YW50VGltZUNvbXBvbmVudC5pc1JhbmdlIHx8ICEhcmVsZXZhbnRFbmRUaW1lO1xyXG5cclxuXHRcdC8vIElmIHRoZSB0aW1lIGNvbXBvbmVudCBpcyBhIHJhbmdlIGJ1dCB3ZSBkb24ndCBoYXZlIGVuaGFuY2VkRGF0ZXMuZW5kRGF0ZVRpbWUsXHJcblx0XHQvLyBjcmVhdGUgdGhlIGVuZCB0aW1lIGZyb20gdGhlIHJhbmdlIHBhcnRuZXJcclxuXHRcdGlmIChyZWxldmFudFRpbWVDb21wb25lbnQuaXNSYW5nZSAmJiAhcmVsZXZhbnRFbmRUaW1lICYmIHJlbGV2YW50VGltZUNvbXBvbmVudC5yYW5nZVBhcnRuZXIpIHtcclxuXHRcdFx0Y29uc3QgZW5kRGF0ZVRpbWUgPSBuZXcgRGF0ZShkYXRlKTtcclxuXHRcdFx0Ly8gVXNlIGxvY2FsIHRpbWUgKHNldEhvdXJzKSBpbnN0ZWFkIG9mIFVUQyB0byBtYXRjaCB0aGUgcGFyc2VkIHRpbWUgY29tcG9uZW50c1xyXG5cdFx0XHRlbmREYXRlVGltZS5zZXRIb3VycyhcclxuXHRcdFx0XHRyZWxldmFudFRpbWVDb21wb25lbnQucmFuZ2VQYXJ0bmVyLmhvdXIsXHJcblx0XHRcdFx0cmVsZXZhbnRUaW1lQ29tcG9uZW50LnJhbmdlUGFydG5lci5taW51dGUsXHJcblx0XHRcdFx0cmVsZXZhbnRUaW1lQ29tcG9uZW50LnJhbmdlUGFydG5lci5zZWNvbmQgfHwgMCxcclxuXHRcdFx0XHQwXHJcblx0XHRcdCk7XHJcblx0XHRcdHJlbGV2YW50RW5kVGltZSA9IGVuZERhdGVUaW1lO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHByaW1hcnlUaW1lOiBlbmhhbmNlZERhdGVUaW1lLFxyXG5cdFx0XHRlbmRUaW1lOiByZWxldmFudEVuZFRpbWUsXHJcblx0XHRcdGlzUmFuZ2UsXHJcblx0XHRcdHRpbWVDb21wb25lbnQ6IHJlbGV2YW50VGltZUNvbXBvbmVudCxcclxuXHRcdFx0ZGlzcGxheUZvcm1hdDogaXNSYW5nZSA/IFwicmFuZ2VcIiA6IFwidGltZS1vbmx5XCIsXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBleHRyYWN0RGF0ZXNGcm9tVGFzayhcclxuXHRcdHRhc2s6IFRhc2tcclxuXHQpOiBBcnJheTx7IGRhdGU6IERhdGU7IHR5cGU6IHN0cmluZyB9PiB7XHJcblx0XHQvLyBUYXNrLWxldmVsIGRlZHVwbGljYXRpb246IGVuc3VyZSBlYWNoIHRhc2sgYXBwZWFycyBvbmx5IG9uY2UgaW4gdGltZWxpbmVcclxuXHJcblx0XHQvLyBDaGVjayBpZiB0YXNrIGhhcyBlbmhhbmNlZCBtZXRhZGF0YSB3aXRoIHRpbWUgY29tcG9uZW50c1xyXG5cdFx0Y29uc3QgZW5oYW5jZWRNZXRhZGF0YSA9IHRhc2subWV0YWRhdGEgYXMgYW55O1xyXG5cdFx0Y29uc3QgdGltZUNvbXBvbmVudHMgPSBlbmhhbmNlZE1ldGFkYXRhPy50aW1lQ29tcG9uZW50cztcclxuXHRcdGNvbnN0IGVuaGFuY2VkRGF0ZXMgPSBlbmhhbmNlZE1ldGFkYXRhPy5lbmhhbmNlZERhdGVzO1xyXG5cclxuXHRcdC8vIEZvciBjb21wbGV0ZWQgdGFza3M6IHByaW9yaXRpemUgZHVlIGRhdGUsIGZhbGxiYWNrIHRvIGNvbXBsZXRlZCBkYXRlXHJcblx0XHRpZiAodGFzay5jb21wbGV0ZWQpIHtcclxuXHRcdFx0aWYgKHRhc2subWV0YWRhdGEuZHVlRGF0ZSkge1xyXG5cdFx0XHRcdC8vIFVzZSBlbmhhbmNlZCBkdWUgZGF0ZXRpbWUgaWYgYXZhaWxhYmxlLCBvdGhlcndpc2UgdXNlIG9yaWdpbmFsIHRpbWVzdGFtcFxyXG5cdFx0XHRcdGNvbnN0IGR1ZURhdGUgPSBlbmhhbmNlZERhdGVzPy5kdWVEYXRlVGltZSB8fCBuZXcgRGF0ZSh0YXNrLm1ldGFkYXRhLmR1ZURhdGUpO1xyXG5cdFx0XHRcdHJldHVybiBbe2RhdGU6IGR1ZURhdGUsIHR5cGU6IFwiZHVlXCJ9XTtcclxuXHRcdFx0fSBlbHNlIGlmICh0YXNrLm1ldGFkYXRhLmNvbXBsZXRlZERhdGUpIHtcclxuXHRcdFx0XHRyZXR1cm4gW3tkYXRlOiBuZXcgRGF0ZSh0YXNrLm1ldGFkYXRhLmNvbXBsZXRlZERhdGUpLCB0eXBlOiBcImNvbXBsZXRlZFwifV07XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBGb3Igbm9uLWNvbXBsZXRlZCB0YXNrczogc2VsZWN0IHNpbmdsZSBoaWdoZXN0IHByaW9yaXR5IGRhdGUgd2l0aCBlbmhhbmNlZCBkYXRldGltZSBzdXBwb3J0XHJcblx0XHRjb25zdCBkYXRlczogQXJyYXk8eyBkYXRlOiBEYXRlOyB0eXBlOiBzdHJpbmcgfT4gPSBbXTtcclxuXHJcblx0XHRpZiAodGFzay5tZXRhZGF0YS5kdWVEYXRlKSB7XHJcblx0XHRcdC8vIFVzZSBlbmhhbmNlZCBkdWUgZGF0ZXRpbWUgaWYgYXZhaWxhYmxlXHJcblx0XHRcdGNvbnN0IGR1ZURhdGUgPSBlbmhhbmNlZERhdGVzPy5kdWVEYXRlVGltZSB8fCBuZXcgRGF0ZSh0YXNrLm1ldGFkYXRhLmR1ZURhdGUpO1xyXG5cdFx0XHRkYXRlcy5wdXNoKHtkYXRlOiBkdWVEYXRlLCB0eXBlOiBcImR1ZVwifSk7XHJcblx0XHR9XHJcblx0XHRpZiAodGFzay5tZXRhZGF0YS5zY2hlZHVsZWREYXRlKSB7XHJcblx0XHRcdC8vIFVzZSBlbmhhbmNlZCBzY2hlZHVsZWQgZGF0ZXRpbWUgaWYgYXZhaWxhYmxlXHJcblx0XHRcdGNvbnN0IHNjaGVkdWxlZERhdGUgPSBlbmhhbmNlZERhdGVzPy5zY2hlZHVsZWREYXRlVGltZSB8fCBuZXcgRGF0ZSh0YXNrLm1ldGFkYXRhLnNjaGVkdWxlZERhdGUpO1xyXG5cdFx0XHRkYXRlcy5wdXNoKHtcclxuXHRcdFx0XHRkYXRlOiBzY2hlZHVsZWREYXRlLFxyXG5cdFx0XHRcdHR5cGU6IFwic2NoZWR1bGVkXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdFx0aWYgKHRhc2subWV0YWRhdGEuc3RhcnREYXRlKSB7XHJcblx0XHRcdC8vIFVzZSBlbmhhbmNlZCBzdGFydCBkYXRldGltZSBpZiBhdmFpbGFibGVcclxuXHRcdFx0Y29uc3Qgc3RhcnREYXRlID0gZW5oYW5jZWREYXRlcz8uc3RhcnREYXRlVGltZSB8fCBuZXcgRGF0ZSh0YXNrLm1ldGFkYXRhLnN0YXJ0RGF0ZSk7XHJcblx0XHRcdGRhdGVzLnB1c2goe1xyXG5cdFx0XHRcdGRhdGU6IHN0YXJ0RGF0ZSxcclxuXHRcdFx0XHR0eXBlOiBcInN0YXJ0XCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEZvciBub24tY29tcGxldGVkIHRhc2tzLCBzZWxlY3QgdGhlIGhpZ2hlc3QgcHJpb3JpdHkgZGF0ZVxyXG5cdFx0aWYgKGRhdGVzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0Y29uc3QgaGlnaGVzdFByaW9yaXR5RGF0ZSA9IGRhdGVzLnJlZHVjZSgoaGlnaGVzdCwgY3VycmVudCkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IGN1cnJlbnRQcmlvcml0eSA9IERBVEVfVFlQRV9QUklPUklUWVtjdXJyZW50LnR5cGUgYXMga2V5b2YgdHlwZW9mIERBVEVfVFlQRV9QUklPUklUWV0gfHwgMDtcclxuXHRcdFx0XHRjb25zdCBoaWdoZXN0UHJpb3JpdHkgPSBEQVRFX1RZUEVfUFJJT1JJVFlbaGlnaGVzdC50eXBlIGFzIGtleW9mIHR5cGVvZiBEQVRFX1RZUEVfUFJJT1JJVFldIHx8IDA7XHJcblx0XHRcdFx0cmV0dXJuIGN1cnJlbnRQcmlvcml0eSA+IGhpZ2hlc3RQcmlvcml0eSA/IGN1cnJlbnQgOiBoaWdoZXN0O1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0cmV0dXJuIFtoaWdoZXN0UHJpb3JpdHlEYXRlXTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBGYWxsYmFjazogaWYgbm8gcGxhbm5pbmcgZGF0ZXMgZXhpc3QsIHVzZSBkZWR1cGxpY2F0aW9uIGZvciBlZGdlIGNhc2VzXHJcblx0XHRjb25zdCBhbGxEYXRlczogQXJyYXk8eyBkYXRlOiBEYXRlOyB0eXBlOiBzdHJpbmcgfT4gPSBbXTtcclxuXHRcdGlmICh0YXNrLm1ldGFkYXRhLmNvbXBsZXRlZERhdGUpIHtcclxuXHRcdFx0YWxsRGF0ZXMucHVzaCh7XHJcblx0XHRcdFx0ZGF0ZTogbmV3IERhdGUodGFzay5tZXRhZGF0YS5jb21wbGV0ZWREYXRlKSxcclxuXHRcdFx0XHR0eXBlOiBcImNvbXBsZXRlZFwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdGhpcy5kZWR1cGxpY2F0ZURhdGVzQnlQcmlvcml0eShhbGxEYXRlcyk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbmRlclRpbWVsaW5lKCk6IHZvaWQge1xyXG5cdFx0dGhpcy50aW1lbGluZUNvbnRhaW5lckVsLmVtcHR5KCk7XHJcblxyXG5cdFx0aWYgKHRoaXMuZXZlbnRzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRjb25zdCBlbXB0eUVsID1cclxuXHRcdFx0XHR0aGlzLnRpbWVsaW5lQ29udGFpbmVyRWwuY3JlYXRlRGl2KFwidGltZWxpbmUtZW1wdHlcIik7XHJcblx0XHRcdGVtcHR5RWwuc2V0VGV4dCh0KFwiTm8gZXZlbnRzIHRvIGRpc3BsYXlcIikpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gR3JvdXAgZXZlbnRzIGJ5IGRhdGVcclxuXHRcdGNvbnN0IGV2ZW50c0J5RGF0ZSA9IHRoaXMuZ3JvdXBFdmVudHNCeURhdGUoKTtcclxuXHJcblx0XHQvLyBSZW5kZXIgZWFjaCBkYXRlIGdyb3VwXHJcblx0XHRmb3IgKGNvbnN0IFtkYXRlU3RyLCBkYXlFdmVudHNdIG9mIGV2ZW50c0J5RGF0ZSkge1xyXG5cdFx0XHR0aGlzLnJlbmRlckRhdGVHcm91cChkYXRlU3RyLCBkYXlFdmVudHMpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBncm91cEV2ZW50c0J5RGF0ZSgpOiBNYXA8c3RyaW5nLCBFbmhhbmNlZFRpbWVsaW5lRXZlbnRbXT4ge1xyXG5cdFx0Y29uc3QgZ3JvdXBlZCA9IG5ldyBNYXA8c3RyaW5nLCBFbmhhbmNlZFRpbWVsaW5lRXZlbnRbXT4oKTtcclxuXHJcblx0XHR0aGlzLmV2ZW50cy5mb3JFYWNoKChldmVudCkgPT4ge1xyXG5cdFx0XHRjb25zdCBkYXRlS2V5ID0gbW9tZW50KGV2ZW50LnRpbWUpLmZvcm1hdChcIllZWVktTU0tRERcIik7XHJcblx0XHRcdGlmICghZ3JvdXBlZC5oYXMoZGF0ZUtleSkpIHtcclxuXHRcdFx0XHRncm91cGVkLnNldChkYXRlS2V5LCBbXSk7XHJcblx0XHRcdH1cclxuXHRcdFx0Z3JvdXBlZC5nZXQoZGF0ZUtleSkhLnB1c2goZXZlbnQpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGdyb3VwZWQ7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbmRlckRhdGVHcm91cChkYXRlU3RyOiBzdHJpbmcsIGV2ZW50czogRW5oYW5jZWRUaW1lbGluZUV2ZW50W10pOiB2b2lkIHtcclxuXHRcdGNvbnN0IGRhdGVHcm91cEVsID0gdGhpcy50aW1lbGluZUNvbnRhaW5lckVsLmNyZWF0ZURpdihcclxuXHRcdFx0XCJ0aW1lbGluZS1kYXRlLWdyb3VwXCJcclxuXHRcdCk7XHJcblx0XHRjb25zdCBkYXRlTW9tZW50ID0gbW9tZW50KGRhdGVTdHIpO1xyXG5cdFx0Y29uc3QgaXNUb2RheSA9IGRhdGVNb21lbnQuaXNTYW1lKG1vbWVudCgpLCBcImRheVwiKTtcclxuXHRcdGNvbnN0IGlzWWVzdGVyZGF5ID0gZGF0ZU1vbWVudC5pc1NhbWUoXHJcblx0XHRcdG1vbWVudCgpLnN1YnRyYWN0KDEsIFwiZGF5XCIpLFxyXG5cdFx0XHRcImRheVwiXHJcblx0XHQpO1xyXG5cdFx0Y29uc3QgaXNUb21vcnJvdyA9IGRhdGVNb21lbnQuaXNTYW1lKG1vbWVudCgpLmFkZCgxLCBcImRheVwiKSwgXCJkYXlcIik7XHJcblxyXG5cdFx0aWYgKGlzVG9kYXkpIHtcclxuXHRcdFx0ZGF0ZUdyb3VwRWwuYWRkQ2xhc3MoXCJpcy10b2RheVwiKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBEYXRlIGhlYWRlclxyXG5cdFx0Y29uc3QgZGF0ZUhlYWRlckVsID0gZGF0ZUdyb3VwRWwuY3JlYXRlRGl2KFwidGltZWxpbmUtZGF0ZS1oZWFkZXJcIik7XHJcblxyXG5cdFx0bGV0IGRpc3BsYXlEYXRlID0gZGF0ZU1vbWVudC5mb3JtYXQoXCJNTU0gREQsIFlZWVlcIik7XHJcblx0XHRpZiAoaXNUb2RheSkge1xyXG5cdFx0XHRkaXNwbGF5RGF0ZSA9IHQoXCJUb2RheVwiKTtcclxuXHRcdH0gZWxzZSBpZiAoaXNZZXN0ZXJkYXkpIHtcclxuXHRcdFx0ZGlzcGxheURhdGUgPSB0KFwiWWVzdGVyZGF5XCIpO1xyXG5cdFx0fSBlbHNlIGlmIChpc1RvbW9ycm93KSB7XHJcblx0XHRcdGRpc3BsYXlEYXRlID0gdChcIlRvbW9ycm93XCIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGRhdGVIZWFkZXJFbC5zZXRUZXh0KGRpc3BsYXlEYXRlKTtcclxuXHJcblx0XHQvLyBBZGQgcmVsYXRpdmUgdGltZVxyXG5cdFx0Y29uc3QgcmVsYXRpdmVFbCA9IGRhdGVIZWFkZXJFbC5jcmVhdGVTcGFuKFwidGltZWxpbmUtZGF0ZS1yZWxhdGl2ZVwiKTtcclxuXHRcdGlmICghaXNUb2RheSAmJiAhaXNZZXN0ZXJkYXkgJiYgIWlzVG9tb3Jyb3cpIHtcclxuXHRcdFx0cmVsYXRpdmVFbC5zZXRUZXh0KGRhdGVNb21lbnQuZnJvbU5vdygpKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBFdmVudHMgbGlzdFxyXG5cdFx0Y29uc3QgZXZlbnRzTGlzdEVsID0gZGF0ZUdyb3VwRWwuY3JlYXRlRGl2KFwidGltZWxpbmUtZXZlbnRzLWxpc3RcIik7XHJcblxyXG5cdFx0Ly8gU29ydCBldmVudHMgYnkgdGltZSB3aXRoaW4gdGhlIGRheSBmb3IgY2hyb25vbG9naWNhbCBvcmRlcmluZ1xyXG5cdFx0Y29uc3Qgc29ydGVkRXZlbnRzID0gdGhpcy5zb3J0RXZlbnRzQnlUaW1lKGV2ZW50cyk7XHJcblxyXG5cdFx0Ly8gR3JvdXAgZXZlbnRzIGJ5IHRpbWUgYW5kIHJlbmRlciB0aGVtXHJcblx0XHR0aGlzLnJlbmRlckdyb3VwZWRFdmVudHMoZXZlbnRzTGlzdEVsLCBzb3J0ZWRFdmVudHMpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVuZGVyIHRpbWUgaW5mb3JtYXRpb24gZm9yIGEgdGltZWxpbmUgZXZlbnRcclxuXHQgKi9cclxuXHRwcml2YXRlIHJlbmRlckV2ZW50VGltZSh0aW1lRWw6IEhUTUxFbGVtZW50LCBldmVudDogRW5oYW5jZWRUaW1lbGluZUV2ZW50KTogdm9pZCB7XHJcblx0XHRpZiAoZXZlbnQudGltZUluZm8/LnRpbWVDb21wb25lbnQpIHtcclxuXHRcdFx0Ly8gVXNlIHBhcnNlZCB0aW1lIGNvbXBvbmVudCBmb3IgYWNjdXJhdGUgZGlzcGxheVxyXG5cdFx0XHRjb25zdCB7dGltZUNvbXBvbmVudCwgaXNSYW5nZSwgZW5kVGltZX0gPSBldmVudC50aW1lSW5mbztcclxuXHJcblx0XHRcdGlmIChpc1JhbmdlICYmIGVuZFRpbWUpIHtcclxuXHRcdFx0XHQvLyBEaXNwbGF5IHRpbWUgcmFuZ2VcclxuXHRcdFx0XHRjb25zdCBzdGFydFRpbWVTdHIgPSB0aGlzLmZvcm1hdFRpbWVDb21wb25lbnQodGltZUNvbXBvbmVudCk7XHJcblx0XHRcdFx0Y29uc3QgZW5kVGltZVN0ciA9IG1vbWVudChlbmRUaW1lKS5mb3JtYXQoXCJISDptbVwiKTtcclxuXHRcdFx0XHR0aW1lRWwuc2V0VGV4dChgJHtzdGFydFRpbWVTdHJ9LSR7ZW5kVGltZVN0cn1gKTtcclxuXHRcdFx0XHR0aW1lRWwuYWRkQ2xhc3MoXCJ0aW1lbGluZS1ldmVudC10aW1lLXJhbmdlXCIpO1xyXG5cdFx0XHRcdC8vIEFkZCBkdXJhdGlvbiBiYWRnZSBhdHRyaWJ1dGUgZm9yIENTUyA6OmFmdGVyIHRvIHJlbmRlclxyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRjb25zdCBzdGFydCA9IGV2ZW50LnRpbWVJbmZvPy5wcmltYXJ5VGltZTtcclxuXHRcdFx0XHRcdGlmIChzdGFydCAmJiBlbmRUaW1lLmdldFRpbWUoKSA+IHN0YXJ0LmdldFRpbWUoKSkge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBtaW51dGVzID0gTWF0aC5yb3VuZCgoZW5kVGltZS5nZXRUaW1lKCkgLSBzdGFydC5nZXRUaW1lKCkpIC8gNjAwMDApO1xyXG5cdFx0XHRcdFx0XHRjb25zdCBkdXJhdGlvbiA9IG1pbnV0ZXMgPj0gNjBcclxuXHRcdFx0XHRcdFx0XHQ/IGAke01hdGguZmxvb3IobWludXRlcyAvIDYwKX1oJHttaW51dGVzICUgNjAgPyBgICR7bWludXRlcyAlIDYwfW1gIDogJyd9YFxyXG5cdFx0XHRcdFx0XHRcdDogYCR7bWludXRlc31tYDtcclxuXHRcdFx0XHRcdFx0dGltZUVsLnNldEF0dHJpYnV0ZShcImRhdGEtZHVyYXRpb25cIiwgZHVyYXRpb24pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0gY2F0Y2ggKF8pIHtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gRGlzcGxheSBzaW5nbGUgdGltZVxyXG5cdFx0XHRcdHRpbWVFbC5zZXRUZXh0KHRoaXMuZm9ybWF0VGltZUNvbXBvbmVudCh0aW1lQ29tcG9uZW50KSk7XHJcblx0XHRcdFx0dGltZUVsLmFkZENsYXNzKFwidGltZWxpbmUtZXZlbnQtdGltZS1zaW5nbGVcIik7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIFRyeSB0byBwYXJzZSB0aW1lIGRpcmVjdGx5IGZyb20gY29udGVudCBhcyBhIGZhbGxiYWNrIHRvIGF2b2lkIDAwOjAwIG1pc21hdGNoZXNcclxuXHRcdFx0Y29uc3QgY29udGVudCA9IGV2ZW50LmNvbnRlbnQgfHwgXCJcIjtcclxuXHRcdFx0Ly8gRGV0ZWN0IHRpbWUgcmFuZ2UgZmlyc3QgKGUuZy4sIDE1OjAwLTE2OjAwKVxyXG5cdFx0XHRjb25zdCByYW5nZVJlZ2V4ID0gLyhbMDFdP1xcZHwyWzAtM10pOihbMC01XVxcZCkoPzo6KFswLTVdXFxkKSk/XFxzKlstfu+9nl1cXHMqKFswMV0/XFxkfDJbMC0zXSk6KFswLTVdXFxkKSg/OjooWzAtNV1cXGQpKT8vO1xyXG5cdFx0XHRjb25zdCByYW5nZU1hdGNoID0gY29udGVudC5tYXRjaChyYW5nZVJlZ2V4KTtcclxuXHRcdFx0aWYgKHJhbmdlTWF0Y2gpIHtcclxuXHRcdFx0XHRjb25zdCBzdGFydCA9IGAke3JhbmdlTWF0Y2hbMV0ucGFkU3RhcnQoMiwgJzAnKX06JHtyYW5nZU1hdGNoWzJdfSR7cmFuZ2VNYXRjaFszXSA/IGA6JHtyYW5nZU1hdGNoWzNdfWAgOiAnJ31gO1xyXG5cdFx0XHRcdGNvbnN0IGVuZCA9IGAke3JhbmdlTWF0Y2hbNF0ucGFkU3RhcnQoMiwgJzAnKX06JHtyYW5nZU1hdGNoWzVdfSR7cmFuZ2VNYXRjaFs2XSA/IGA6JHtyYW5nZU1hdGNoWzZdfWAgOiAnJ31gO1xyXG5cdFx0XHRcdHRpbWVFbC5zZXRUZXh0KGAke3N0YXJ0fS0ke2VuZH1gKTtcclxuXHRcdFx0XHR0aW1lRWwuYWRkQ2xhc3MoXCJ0aW1lbGluZS1ldmVudC10aW1lLXJhbmdlXCIpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHQvLyBEZXRlY3QgMTItaG91ciBmb3JtYXQgKGUuZy4sIDM6MzAgUE0pXHJcblx0XHRcdGNvbnN0IHBhdHRlcm4xMmggPSAvKDFbMC0yXXwwP1sxLTldKTooWzAtNV1cXGQpKD86OihbMC01XVxcZCkpP1xccyooQU18UE18YW18cG0pLztcclxuXHRcdFx0Y29uc3QgbTEyID0gY29udGVudC5tYXRjaChwYXR0ZXJuMTJoKTtcclxuXHRcdFx0aWYgKG0xMikge1xyXG5cdFx0XHRcdGxldCBob3VyID0gcGFyc2VJbnQobTEyWzFdLCAxMCk7XHJcblx0XHRcdFx0Y29uc3QgbWludXRlID0gbTEyWzJdO1xyXG5cdFx0XHRcdGNvbnN0IHNlY29uZCA9IG0xMlszXTtcclxuXHRcdFx0XHRjb25zdCBwZXJpb2QgPSBtMTJbNF0udG9VcHBlckNhc2UoKTtcclxuXHRcdFx0XHRpZiAocGVyaW9kID09PSAnUE0nICYmIGhvdXIgIT09IDEyKSBob3VyICs9IDEyO1xyXG5cdFx0XHRcdGlmIChwZXJpb2QgPT09ICdBTScgJiYgaG91ciA9PT0gMTIpIGhvdXIgPSAwO1xyXG5cdFx0XHRcdGNvbnN0IGRpc3BsYXkgPSBgJHtob3VyLnRvU3RyaW5nKCkucGFkU3RhcnQoMiwgJzAnKX06JHttaW51dGV9JHtzZWNvbmQgPyBgOiR7c2Vjb25kfWAgOiAnJ31gO1xyXG5cdFx0XHRcdHRpbWVFbC5zZXRUZXh0KGRpc3BsYXkpO1xyXG5cdFx0XHRcdHRpbWVFbC5hZGRDbGFzcyhcInRpbWVsaW5lLWV2ZW50LXRpbWUtc2luZ2xlXCIpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHQvLyBEZXRlY3QgMjQtaG91ciBzaW5nbGUgdGltZSAoZS5nLiwgMTU6MDApXHJcblx0XHRcdGNvbnN0IHBhdHRlcm4yNGggPSAvKFswMV0/XFxkfDJbMC0zXSk6KFswLTVdXFxkKSg/OjooWzAtNV1cXGQpKT8vO1xyXG5cdFx0XHRjb25zdCBtMjQgPSBjb250ZW50Lm1hdGNoKHBhdHRlcm4yNGgpO1xyXG5cdFx0XHRpZiAobTI0KSB7XHJcblx0XHRcdFx0Y29uc3QgZGlzcGxheSA9IGAke20yNFsxXS5wYWRTdGFydCgyLCAnMCcpfToke20yNFsyXX0ke20yNFszXSA/IGA6JHttMjRbM119YCA6ICcnfWA7XHJcblx0XHRcdFx0dGltZUVsLnNldFRleHQoZGlzcGxheSk7XHJcblx0XHRcdFx0dGltZUVsLmFkZENsYXNzKFwidGltZWxpbmUtZXZlbnQtdGltZS1zaW5nbGVcIik7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblx0XHRcdC8vIEZhbGxiYWNrIHRvIGRlZmF1bHQgdGltZSBkaXNwbGF5IC0gcHJlZmVyIGVuaGFuY2VkIHByaW1hcnlUaW1lIHdoZW4gYXZhaWxhYmxlXHJcblx0XHRcdGNvbnN0IGZhbGxiYWNrVGltZSA9IGV2ZW50LnRpbWVJbmZvPy5wcmltYXJ5VGltZSB8fCBldmVudC50aW1lO1xyXG5cdFx0XHR0aW1lRWwuc2V0VGV4dChtb21lbnQoZmFsbGJhY2tUaW1lKS5mb3JtYXQoXCJISDptbVwiKSk7XHJcblx0XHRcdHRpbWVFbC5hZGRDbGFzcyhcInRpbWVsaW5lLWV2ZW50LXRpbWUtZGVmYXVsdFwiKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEZvcm1hdCBhIHRpbWUgY29tcG9uZW50IGZvciBkaXNwbGF5XHJcblx0ICovXHJcblx0cHJpdmF0ZSBmb3JtYXRUaW1lQ29tcG9uZW50KHRpbWVDb21wb25lbnQ6IFRpbWVDb21wb25lbnQpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgaG91ciA9IHRpbWVDb21wb25lbnQuaG91ci50b1N0cmluZygpLnBhZFN0YXJ0KDIsICcwJyk7XHJcblx0XHRjb25zdCBtaW51dGUgPSB0aW1lQ29tcG9uZW50Lm1pbnV0ZS50b1N0cmluZygpLnBhZFN0YXJ0KDIsICcwJyk7XHJcblxyXG5cdFx0aWYgKHRpbWVDb21wb25lbnQuc2Vjb25kICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0Y29uc3Qgc2Vjb25kID0gdGltZUNvbXBvbmVudC5zZWNvbmQudG9TdHJpbmcoKS5wYWRTdGFydCgyLCAnMCcpO1xyXG5cdFx0XHRyZXR1cm4gYCR7aG91cn06JHttaW51dGV9OiR7c2Vjb25kfWA7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGAke2hvdXJ9OiR7bWludXRlfWA7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTb3J0IGV2ZW50cyBieSB0aW1lIHdpdGhpbiBhIGRheSBmb3IgY2hyb25vbG9naWNhbCBvcmRlcmluZ1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgc29ydEV2ZW50c0J5VGltZShldmVudHM6IEVuaGFuY2VkVGltZWxpbmVFdmVudFtdKTogRW5oYW5jZWRUaW1lbGluZUV2ZW50W10ge1xyXG5cdFx0cmV0dXJuIGV2ZW50cy5zb3J0KChhLCBiKSA9PiB7XHJcblx0XHRcdC8vIEdldCB0aGUgcHJpbWFyeSB0aW1lIGZvciBzb3J0aW5nIC0gdXNlIGVuaGFuY2VkIHRpbWUgaWYgYXZhaWxhYmxlXHJcblx0XHRcdGNvbnN0IHRpbWVBID0gYS50aW1lSW5mbz8ucHJpbWFyeVRpbWUgfHwgYS50aW1lO1xyXG5cdFx0XHRjb25zdCB0aW1lQiA9IGIudGltZUluZm8/LnByaW1hcnlUaW1lIHx8IGIudGltZTtcclxuXHJcblx0XHRcdC8vIFNvcnQgYnkgdGltZSBvZiBkYXkgKGVhcmxpZXIgdGltZXMgZmlyc3QpXHJcblx0XHRcdGNvbnN0IHRpbWVDb21wYXJpc29uID0gdGltZUEuZ2V0VGltZSgpIC0gdGltZUIuZ2V0VGltZSgpO1xyXG5cclxuXHRcdFx0aWYgKHRpbWVDb21wYXJpc29uICE9PSAwKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRpbWVDb21wYXJpc29uO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBJZiB0aW1lcyBhcmUgZXF1YWwsIHNvcnQgYnkgdGFzayBjb250ZW50IGZvciBjb25zaXN0ZW50IG9yZGVyaW5nXHJcblx0XHRcdHJldHVybiBhLmNvbnRlbnQubG9jYWxlQ29tcGFyZShiLmNvbnRlbnQpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW5kZXIgZXZlbnRzIGdyb3VwZWQgYnkgdGltZSwgc2VwYXJhdGluZyB0aW1lZCBldmVudHMgZnJvbSBkYXRlLW9ubHkgZXZlbnRzXHJcblx0ICovXHJcblx0cHJpdmF0ZSByZW5kZXJHcm91cGVkRXZlbnRzKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCwgZXZlbnRzOiBFbmhhbmNlZFRpbWVsaW5lRXZlbnRbXSk6IHZvaWQge1xyXG5cdFx0Ly8gU2VwYXJhdGUgZXZlbnRzIGludG8gdGltZWQgYW5kIGRhdGUtb25seSBjYXRlZ29yaWVzXHJcblx0XHRjb25zdCB0aW1lZEV2ZW50czogRW5oYW5jZWRUaW1lbGluZUV2ZW50W10gPSBbXTtcclxuXHRcdGNvbnN0IGRhdGVPbmx5RXZlbnRzOiBFbmhhbmNlZFRpbWVsaW5lRXZlbnRbXSA9IFtdO1xyXG5cclxuXHRcdGV2ZW50cy5mb3JFYWNoKChldmVudCkgPT4ge1xyXG5cdFx0XHRpZiAodGhpcy5oYXNTcGVjaWZpY1RpbWUoZXZlbnQpKSB7XHJcblx0XHRcdFx0dGltZWRFdmVudHMucHVzaChldmVudCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0ZGF0ZU9ubHlFdmVudHMucHVzaChldmVudCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFJlbmRlciB0aW1lZCBldmVudHMgZmlyc3QsIGdyb3VwZWQgYnkgdGltZVxyXG5cdFx0aWYgKHRpbWVkRXZlbnRzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0dGhpcy5yZW5kZXJUaW1lZEV2ZW50c1dpdGhHcm91cGluZyhjb250YWluZXJFbCwgdGltZWRFdmVudHMpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlbmRlciBkYXRlLW9ubHkgZXZlbnRzIGluIGEgc2VwYXJhdGUgc2VjdGlvblxyXG5cdFx0aWYgKGRhdGVPbmx5RXZlbnRzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0dGhpcy5yZW5kZXJEYXRlT25seUV2ZW50cyhjb250YWluZXJFbCwgZGF0ZU9ubHlFdmVudHMpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgYW4gZXZlbnQgaGFzIGEgc3BlY2lmaWMgdGltZSAobm90IGp1c3QgYSBkYXRlKVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgaGFzU3BlY2lmaWNUaW1lKGV2ZW50OiBFbmhhbmNlZFRpbWVsaW5lRXZlbnQpOiBib29sZWFuIHtcclxuXHRcdC8vIENoZWNrIGlmIHRoZSBldmVudCBoYXMgZW5oYW5jZWQgdGltZSBpbmZvcm1hdGlvblxyXG5cdFx0aWYgKGV2ZW50LnRpbWVJbmZvPy50aW1lQ29tcG9uZW50KSB7XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEhldXJpc3RpYzogZGV0ZWN0IGV4cGxpY2l0IHRpbWUgcGF0dGVybnMgaW4gdGhlIGNvbnRlbnQgKGUuZy4sIFwiMTU6MDBcIiwgXCIzOjMwIFBNXCIpXHJcblx0XHRpZiAoZXZlbnQuY29udGVudCkge1xyXG5cdFx0XHRjb25zdCB0aW1lUGF0dGVybjI0aCA9IC8oXnxbXjAtOV0pKFswMV0/XFxkfDJbMC0zXSk6KFswLTVdXFxkKSg/OjooWzAtNV1cXGQpKT8vO1xyXG5cdFx0XHRjb25zdCB0aW1lUGF0dGVybjEyaCA9IC8oXnxcXHMpKDFbMC0yXXwwP1sxLTldKTooWzAtNV1cXGQpKD86OihbMC01XVxcZCkpP1xccyooQU18UE18YW18cG0pLztcclxuXHRcdFx0aWYgKHRpbWVQYXR0ZXJuMjRoLnRlc3QoZXZlbnQuY29udGVudCkgfHwgdGltZVBhdHRlcm4xMmgudGVzdChldmVudC5jb250ZW50KSkge1xyXG5cdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgdGhlIG9yaWdpbmFsIHRpbWUgaGFzIG5vbi16ZXJvIGhvdXJzL21pbnV0ZXMgKG5vdCBqdXN0IG1pZG5pZ2h0KVxyXG5cdFx0Ly8gVXNlIGxvY2FsIHRpbWUgKGdldEhvdXJzKSB0byBjaGVjayBmb3Igc3BlY2lmaWMgdGltZVxyXG5cdFx0Y29uc3QgdGltZSA9IGV2ZW50LnRpbWVJbmZvPy5wcmltYXJ5VGltZSB8fCBldmVudC50aW1lO1xyXG5cdFx0cmV0dXJuIHRpbWUuZ2V0SG91cnMoKSAhPT0gMCB8fCB0aW1lLmdldE1pbnV0ZXMoKSAhPT0gMCB8fCB0aW1lLmdldFNlY29uZHMoKSAhPT0gMDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbmRlciB0aW1lZCBldmVudHMgd2l0aCBncm91cGluZyBmb3IgZXZlbnRzIGF0IHRoZSBzYW1lIHRpbWVcclxuXHQgKi9cclxuXHRwcml2YXRlIHJlbmRlclRpbWVkRXZlbnRzV2l0aEdyb3VwaW5nKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCwgZXZlbnRzOiBFbmhhbmNlZFRpbWVsaW5lRXZlbnRbXSk6IHZvaWQge1xyXG5cdFx0Ly8gR3JvdXAgZXZlbnRzIGJ5IHRoZWlyIHRpbWVcclxuXHRcdGNvbnN0IHRpbWVHcm91cHMgPSBuZXcgTWFwPHN0cmluZywgRW5oYW5jZWRUaW1lbGluZUV2ZW50W10+KCk7XHJcblxyXG5cdFx0ZXZlbnRzLmZvckVhY2goKGV2ZW50KSA9PiB7XHJcblx0XHRcdGNvbnN0IHRpbWUgPSBldmVudC50aW1lSW5mbz8ucHJpbWFyeVRpbWUgfHwgZXZlbnQudGltZTtcclxuXHRcdFx0Y29uc3QgdGltZUtleSA9IHRoaXMuZ2V0VGltZUdyb3VwS2V5KHRpbWUsIGV2ZW50KTtcclxuXHJcblx0XHRcdGlmICghdGltZUdyb3Vwcy5oYXModGltZUtleSkpIHtcclxuXHRcdFx0XHR0aW1lR3JvdXBzLnNldCh0aW1lS2V5LCBbXSk7XHJcblx0XHRcdH1cclxuXHRcdFx0dGltZUdyb3Vwcy5nZXQodGltZUtleSkhLnB1c2goZXZlbnQpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gUmVuZGVyIGVhY2ggdGltZSBncm91cFxyXG5cdFx0Zm9yIChjb25zdCBbdGltZUtleSwgZ3JvdXBFdmVudHNdIG9mIHRpbWVHcm91cHMpIHtcclxuXHRcdFx0aWYgKGdyb3VwRXZlbnRzLmxlbmd0aCA9PT0gMSkge1xyXG5cdFx0XHRcdC8vIFNpbmdsZSBldmVudCAtIHJlbmRlciBub3JtYWxseVxyXG5cdFx0XHRcdHRoaXMucmVuZGVyRXZlbnQoY29udGFpbmVyRWwsIGdyb3VwRXZlbnRzWzBdKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBNdWx0aXBsZSBldmVudHMgYXQgc2FtZSB0aW1lIC0gcmVuZGVyIGFzIGEgZ3JvdXBcclxuXHRcdFx0XHR0aGlzLnJlbmRlclRpbWVHcm91cChjb250YWluZXJFbCwgdGltZUtleSwgZ3JvdXBFdmVudHMpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZW5lcmF0ZSBhIHRpbWUgZ3JvdXAga2V5IGZvciBncm91cGluZyBldmVudHNcclxuXHQgKi9cclxuXHRwcml2YXRlIGdldFRpbWVHcm91cEtleSh0aW1lOiBEYXRlLCBldmVudDogRW5oYW5jZWRUaW1lbGluZUV2ZW50KTogc3RyaW5nIHtcclxuXHRcdGlmIChldmVudC50aW1lSW5mbz8udGltZUNvbXBvbmVudCkge1xyXG5cdFx0XHQvLyBVc2UgdGhlIGZvcm1hdHRlZCB0aW1lIGNvbXBvbmVudCBmb3IgcHJlY2lzZSBncm91cGluZ1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5mb3JtYXRUaW1lQ29tcG9uZW50KGV2ZW50LnRpbWVJbmZvLnRpbWVDb21wb25lbnQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEZhbGxiYWNrIHRvIGhvdXI6bWludXRlIGZvcm1hdFxyXG5cdFx0cmV0dXJuIG1vbWVudCh0aW1lKS5mb3JtYXQoXCJISDptbVwiKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbmRlciBhIGdyb3VwIG9mIGV2ZW50cyB0aGF0IG9jY3VyIGF0IHRoZSBzYW1lIHRpbWVcclxuXHQgKi9cclxuXHRwcml2YXRlIHJlbmRlclRpbWVHcm91cChjb250YWluZXJFbDogSFRNTEVsZW1lbnQsIHRpbWVLZXk6IHN0cmluZywgZXZlbnRzOiBFbmhhbmNlZFRpbWVsaW5lRXZlbnRbXSk6IHZvaWQge1xyXG5cdFx0Y29uc3QgZ3JvdXBFbCA9IGNvbnRhaW5lckVsLmNyZWF0ZURpdihcInRpbWVsaW5lLXRpbWUtZ3JvdXBcIik7XHJcblxyXG5cdFx0Ly8gVGltZSBncm91cCBoZWFkZXJcclxuXHRcdGNvbnN0IGdyb3VwSGVhZGVyRWwgPSBncm91cEVsLmNyZWF0ZURpdihcInRpbWVsaW5lLXRpbWUtZ3JvdXAtaGVhZGVyXCIpO1xyXG5cdFx0Y29uc3QgdGltZUVsID0gZ3JvdXBIZWFkZXJFbC5jcmVhdGVEaXYoXCJ0aW1lbGluZS10aW1lLWdyb3VwLXRpbWVcIik7XHJcblx0XHR0aW1lRWwuc2V0VGV4dCh0aW1lS2V5KTtcclxuXHRcdHRpbWVFbC5hZGRDbGFzcyhcInRpbWVsaW5lLWV2ZW50LXRpbWVcIik7XHJcblx0XHR0aW1lRWwuYWRkQ2xhc3MoXCJ0aW1lbGluZS1ldmVudC10aW1lLWdyb3VwXCIpO1xyXG5cclxuXHRcdGNvbnN0IGNvdW50RWwgPSBncm91cEhlYWRlckVsLmNyZWF0ZURpdihcInRpbWVsaW5lLXRpbWUtZ3JvdXAtY291bnRcIik7XHJcblx0XHRjb3VudEVsLnNldFRleHQoYCR7ZXZlbnRzLmxlbmd0aH0gZXZlbnRzYCk7XHJcblxyXG5cdFx0Ly8gRXZlbnRzIGluIHRoZSBncm91cFxyXG5cdFx0Y29uc3QgZ3JvdXBFdmVudHNFbCA9IGdyb3VwRWwuY3JlYXRlRGl2KFwidGltZWxpbmUtdGltZS1ncm91cC1ldmVudHNcIik7XHJcblxyXG5cdFx0ZXZlbnRzLmZvckVhY2goKGV2ZW50KSA9PiB7XHJcblx0XHRcdGNvbnN0IGV2ZW50RWwgPSBncm91cEV2ZW50c0VsLmNyZWF0ZURpdihcInRpbWVsaW5lLWV2ZW50IHRpbWVsaW5lLWV2ZW50LWdyb3VwZWRcIik7XHJcblx0XHRcdGV2ZW50RWwuc2V0QXR0cmlidXRlKFwiZGF0YS1ldmVudC1pZFwiLCBldmVudC5pZCk7XHJcblxyXG5cdFx0XHRpZiAoZXZlbnQudGFzaz8uY29tcGxldGVkKSB7XHJcblx0XHRcdFx0ZXZlbnRFbC5hZGRDbGFzcyhcImlzLWNvbXBsZXRlZFwiKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gRXZlbnQgY29udGVudCAobm8gdGltZSBkaXNwbGF5IHNpbmNlIGl0J3MgaW4gdGhlIGdyb3VwIGhlYWRlcilcclxuXHRcdFx0Y29uc3QgY29udGVudEVsID0gZXZlbnRFbC5jcmVhdGVEaXYoXCJ0aW1lbGluZS1ldmVudC1jb250ZW50XCIpO1xyXG5cclxuXHRcdFx0Ly8gVGFzayBjaGVja2JveCBpZiBpdCdzIGEgdGFza1xyXG5cdFx0XHRpZiAoZXZlbnQudGFzaykge1xyXG5cdFx0XHRcdGNvbnN0IGNoZWNrYm94RWwgPSBjb250ZW50RWwuY3JlYXRlRGl2KFwidGltZWxpbmUtZXZlbnQtY2hlY2tib3hcIik7XHJcblx0XHRcdFx0Y2hlY2tib3hFbC5jcmVhdGVFbChcclxuXHRcdFx0XHRcdFwic3BhblwiLFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbHM6IFwic3RhdHVzLW9wdGlvbi1jaGVja2JveFwiLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdChlbCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBjaGVja2JveCA9IGNyZWF0ZVRhc2tDaGVja2JveChcclxuXHRcdFx0XHRcdFx0XHRldmVudC50YXNrPy5zdGF0dXMgfHwgXCIgXCIsXHJcblx0XHRcdFx0XHRcdFx0ZXZlbnQudGFzayEsXHJcblx0XHRcdFx0XHRcdFx0ZWxcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGNoZWNrYm94LCBcImNoYW5nZVwiLCBhc3luYyAoZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblx0XHRcdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRcdFx0XHRcdGlmIChldmVudC50YXNrKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRhd2FpdCB0aGlzLnRvZ2dsZVRhc2tDb21wbGV0aW9uKGV2ZW50LnRhc2ssIGV2ZW50KTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEV2ZW50IHRleHQgd2l0aCBtYXJrZG93biByZW5kZXJpbmdcclxuXHRcdFx0Y29uc3QgdGV4dEVsID0gY29udGVudEVsLmNyZWF0ZURpdihcInRpbWVsaW5lLWV2ZW50LXRleHRcIik7XHJcblx0XHRcdGNvbnN0IGNvbnRlbnRDb250YWluZXIgPSB0ZXh0RWwuY3JlYXRlRGl2KFwidGltZWxpbmUtZXZlbnQtY29udGVudC10ZXh0XCIpO1xyXG5cclxuXHRcdFx0Ly8gVXNlIE1hcmtkb3duUmVuZGVyZXJDb21wb25lbnQgdG8gcmVuZGVyIHRoZSB0YXNrIGNvbnRlbnRcclxuXHRcdFx0aWYgKGV2ZW50LnRhc2spIHtcclxuXHRcdFx0XHRjb25zdCBtYXJrZG93blJlbmRlcmVyID0gbmV3IE1hcmtkb3duUmVuZGVyZXJDb21wb25lbnQoXHJcblx0XHRcdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0XHRcdGNvbnRlbnRDb250YWluZXIsXHJcblx0XHRcdFx0XHRldmVudC50YXNrLmZpbGVQYXRoLFxyXG5cdFx0XHRcdFx0dHJ1ZSAvLyBoaWRlTWFya3MgPSB0cnVlIHRvIGNsZWFuIHVwIHRhc2sgbWV0YWRhdGFcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHRoaXMuYWRkQ2hpbGQobWFya2Rvd25SZW5kZXJlcik7XHJcblxyXG5cdFx0XHRcdC8vIFNldCB0aGUgZmlsZSBjb250ZXh0IGlmIGF2YWlsYWJsZVxyXG5cdFx0XHRcdGNvbnN0IGZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRGaWxlQnlQYXRoKGV2ZW50LnRhc2suZmlsZVBhdGgpO1xyXG5cdFx0XHRcdGlmIChmaWxlIGluc3RhbmNlb2YgVEZpbGUpIHtcclxuXHRcdFx0XHRcdG1hcmtkb3duUmVuZGVyZXIuc2V0RmlsZShmaWxlKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIFJlbmRlciB0aGUgY29udGVudCBhc3luY2hyb25vdXNseVxyXG5cdFx0XHRcdG1hcmtkb3duUmVuZGVyZXIucmVuZGVyKGV2ZW50LmNvbnRlbnQsIHRydWUpLmNhdGNoKChlcnJvcikgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkZhaWxlZCB0byByZW5kZXIgbWFya2Rvd24gaW4gdGltZWxpbmU6XCIsIGVycm9yKTtcclxuXHRcdFx0XHRcdC8vIEZhbGxiYWNrIHRvIHBsYWluIHRleHQgaWYgcmVuZGVyaW5nIGZhaWxzXHJcblx0XHRcdFx0XHRjb250ZW50Q29udGFpbmVyLnNldFRleHQoZXZlbnQuY29udGVudCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gRmFsbGJhY2sgZm9yIG5vbi10YXNrIGV2ZW50c1xyXG5cdFx0XHRcdGNvbnRlbnRDb250YWluZXIuc2V0VGV4dChldmVudC5jb250ZW50KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gRXZlbnQgYWN0aW9uc1xyXG5cdFx0XHRjb25zdCBhY3Rpb25zRWwgPSBldmVudEVsLmNyZWF0ZURpdihcInRpbWVsaW5lLWV2ZW50LWFjdGlvbnNcIik7XHJcblxyXG5cdFx0XHRpZiAoZXZlbnQudGFzaykge1xyXG5cdFx0XHRcdC8vIEdvIHRvIHRhc2tcclxuXHRcdFx0XHRjb25zdCBnb3RvQnRuID0gYWN0aW9uc0VsLmNyZWF0ZURpdihcInRpbWVsaW5lLWV2ZW50LWFjdGlvblwiKTtcclxuXHRcdFx0XHRzZXRJY29uKGdvdG9CdG4sIFwiZXh0ZXJuYWwtbGlua1wiKTtcclxuXHRcdFx0XHRnb3RvQnRuLnNldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIiwgdChcIkdvIHRvIHRhc2tcIikpO1xyXG5cdFx0XHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChnb3RvQnRuLCBcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuZ29Ub1Rhc2soZXZlbnQudGFzayEpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBDbGljayB0byBmb2N1cyAoYnV0IG5vdCB3aGVuIGNsaWNraW5nIG9uIGNoZWNrYm94IG9yIGFjdGlvbnMpXHJcblx0XHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChldmVudEVsLCBcImNsaWNrXCIsIChlKSA9PiB7XHJcblx0XHRcdFx0Ly8gUHJldmVudCBuYXZpZ2F0aW9uIGlmIGNsaWNraW5nIG9uIGNoZWNrYm94IG9yIGFjdGlvbiBidXR0b25zXHJcblx0XHRcdFx0Y29uc3QgdGFyZ2V0ID0gZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0dGFyZ2V0LmNsb3Nlc3QoXCIudGltZWxpbmUtZXZlbnQtY2hlY2tib3hcIikgfHxcclxuXHRcdFx0XHRcdHRhcmdldC5jbG9zZXN0KFwiLnRpbWVsaW5lLWV2ZW50LWFjdGlvbnNcIikgfHxcclxuXHRcdFx0XHRcdHRhcmdldC5jbG9zZXN0KCdpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nKVxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0aWYgKGV2ZW50LnRhc2spIHtcclxuXHRcdFx0XHRcdHRoaXMuZ29Ub1Rhc2soZXZlbnQudGFzayk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVuZGVyIGRhdGUtb25seSBldmVudHMgKGV2ZW50cyB3aXRob3V0IHNwZWNpZmljIHRpbWVzKVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgcmVuZGVyRGF0ZU9ubHlFdmVudHMoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50LCBldmVudHM6IEVuaGFuY2VkVGltZWxpbmVFdmVudFtdKTogdm9pZCB7XHJcblx0XHRpZiAoZXZlbnRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBhIHNlY3Rpb24gZm9yIGRhdGUtb25seSBldmVudHNcclxuXHRcdGNvbnN0IGRhdGVPbmx5U2VjdGlvbiA9IGNvbnRhaW5lckVsLmNyZWF0ZURpdihcInRpbWVsaW5lLWRhdGUtb25seS1zZWN0aW9uXCIpO1xyXG5cclxuXHRcdGNvbnN0IHNlY3Rpb25IZWFkZXJFbCA9IGRhdGVPbmx5U2VjdGlvbi5jcmVhdGVEaXYoXCJ0aW1lbGluZS1kYXRlLW9ubHktaGVhZGVyXCIpO1xyXG5cdFx0Y29uc3QgaGVhZGVyVGltZUVsID0gc2VjdGlvbkhlYWRlckVsLmNyZWF0ZURpdihcInRpbWVsaW5lLWV2ZW50LXRpbWUgdGltZWxpbmUtZXZlbnQtdGltZS1kYXRlLW9ubHlcIik7XHJcblx0XHRoZWFkZXJUaW1lRWwuc2V0VGV4dChcIkFsbCBkYXlcIik7XHJcblxyXG5cdFx0Y29uc3QgaGVhZGVyVGV4dEVsID0gc2VjdGlvbkhlYWRlckVsLmNyZWF0ZURpdihcInRpbWVsaW5lLWRhdGUtb25seS10aXRsZVwiKTtcclxuXHRcdGhlYWRlclRleHRFbC5zZXRUZXh0KGAke2V2ZW50cy5sZW5ndGh9IGFsbC1kYXkgZXZlbnQke2V2ZW50cy5sZW5ndGggPiAxID8gJ3MnIDogJyd9YCk7XHJcblxyXG5cdFx0Ly8gUmVuZGVyIGVhY2ggZGF0ZS1vbmx5IGV2ZW50IChoaWRlIGluZGl2aWR1YWwgdGltZSBsYWJlbHMpXHJcblx0XHRldmVudHMuZm9yRWFjaCgoZXZlbnQpID0+IHtcclxuXHRcdFx0dGhpcy5yZW5kZXJFdmVudChkYXRlT25seVNlY3Rpb24sIGV2ZW50LCBmYWxzZSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyRXZlbnQoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50LCBldmVudDogRW5oYW5jZWRUaW1lbGluZUV2ZW50LCBzaG93VGltZTogYm9vbGVhbiA9IHRydWUpOiB2b2lkIHtcclxuXHRcdGNvbnN0IGV2ZW50RWwgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoXCJ0aW1lbGluZS1ldmVudFwiKTtcclxuXHRcdGV2ZW50RWwuc2V0QXR0cmlidXRlKFwiZGF0YS1ldmVudC1pZFwiLCBldmVudC5pZCk7XHJcblxyXG5cdFx0aWYgKGV2ZW50LnRhc2s/LmNvbXBsZXRlZCkge1xyXG5cdFx0XHRldmVudEVsLmFkZENsYXNzKFwiaXMtY29tcGxldGVkXCIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEV2ZW50IHRpbWUgLSB1c2UgZW5oYW5jZWQgdGltZSBpbmZvcm1hdGlvbiBpZiBhdmFpbGFibGVcclxuXHRcdGlmIChzaG93VGltZSkge1xyXG5cdFx0XHRjb25zdCB0aW1lRWwgPSBldmVudEVsLmNyZWF0ZURpdihcInRpbWVsaW5lLWV2ZW50LXRpbWVcIik7XHJcblx0XHRcdHRoaXMucmVuZGVyRXZlbnRUaW1lKHRpbWVFbCwgZXZlbnQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEV2ZW50IGNvbnRlbnRcclxuXHRcdGNvbnN0IGNvbnRlbnRFbCA9IGV2ZW50RWwuY3JlYXRlRGl2KFwidGltZWxpbmUtZXZlbnQtY29udGVudFwiKTtcclxuXHJcblx0XHQvLyBUYXNrIGNoZWNrYm94IGlmIGl0J3MgYSB0YXNrXHJcblx0XHRpZiAoZXZlbnQudGFzaykge1xyXG5cdFx0XHRjb25zdCBjaGVja2JveEVsID0gY29udGVudEVsLmNyZWF0ZURpdihcInRpbWVsaW5lLWV2ZW50LWNoZWNrYm94XCIpO1xyXG5cdFx0XHRjaGVja2JveEVsLmNyZWF0ZUVsKFxyXG5cdFx0XHRcdFwic3BhblwiLFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGNsczogXCJzdGF0dXMtb3B0aW9uLWNoZWNrYm94XCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHQoZWwpID0+IHtcclxuXHRcdFx0XHRcdGNvbnN0IGNoZWNrYm94ID0gY3JlYXRlVGFza0NoZWNrYm94KFxyXG5cdFx0XHRcdFx0XHRldmVudC50YXNrPy5zdGF0dXMgfHwgXCIgXCIsXHJcblx0XHRcdFx0XHRcdGV2ZW50LnRhc2shLFxyXG5cdFx0XHRcdFx0XHRlbFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChjaGVja2JveCwgXCJjaGFuZ2VcIiwgYXN5bmMgKGUpID0+IHtcclxuXHRcdFx0XHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHRcdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRcdFx0XHRpZiAoZXZlbnQudGFzaykge1xyXG5cdFx0XHRcdFx0XHRcdGF3YWl0IHRoaXMudG9nZ2xlVGFza0NvbXBsZXRpb24oZXZlbnQudGFzaywgZXZlbnQpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRXZlbnQgdGV4dCB3aXRoIG1hcmtkb3duIHJlbmRlcmluZ1xyXG5cdFx0Y29uc3QgdGV4dEVsID0gY29udGVudEVsLmNyZWF0ZURpdihcInRpbWVsaW5lLWV2ZW50LXRleHRcIik7XHJcblxyXG5cdFx0Y29uc3QgY29udGVudENvbnRhaW5lciA9IHRleHRFbC5jcmVhdGVEaXYoXHJcblx0XHRcdFwidGltZWxpbmUtZXZlbnQtY29udGVudC10ZXh0XCJcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gVXNlIE1hcmtkb3duUmVuZGVyZXJDb21wb25lbnQgdG8gcmVuZGVyIHRoZSB0YXNrIGNvbnRlbnRcclxuXHRcdGlmIChldmVudC50YXNrKSB7XHJcblx0XHRcdGNvbnN0IG1hcmtkb3duUmVuZGVyZXIgPSBuZXcgTWFya2Rvd25SZW5kZXJlckNvbXBvbmVudChcclxuXHRcdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0XHRjb250ZW50Q29udGFpbmVyLFxyXG5cdFx0XHRcdGV2ZW50LnRhc2suZmlsZVBhdGgsXHJcblx0XHRcdFx0dHJ1ZSAvLyBoaWRlTWFya3MgPSB0cnVlIHRvIGNsZWFuIHVwIHRhc2sgbWV0YWRhdGFcclxuXHRcdFx0KTtcclxuXHRcdFx0dGhpcy5hZGRDaGlsZChtYXJrZG93blJlbmRlcmVyKTtcclxuXHJcblx0XHRcdC8vIFNldCB0aGUgZmlsZSBjb250ZXh0IGlmIGF2YWlsYWJsZVxyXG5cdFx0XHRjb25zdCBmaWxlID0gdGhpcy5hcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aChldmVudC50YXNrLmZpbGVQYXRoKTtcclxuXHRcdFx0aWYgKGZpbGUgaW5zdGFuY2VvZiBURmlsZSkge1xyXG5cdFx0XHRcdG1hcmtkb3duUmVuZGVyZXIuc2V0RmlsZShmaWxlKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gUmVuZGVyIHRoZSBjb250ZW50IGFzeW5jaHJvbm91c2x5XHJcblx0XHRcdG1hcmtkb3duUmVuZGVyZXIucmVuZGVyKGV2ZW50LmNvbnRlbnQsIHRydWUpLmNhdGNoKChlcnJvcikgPT4ge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gcmVuZGVyIG1hcmtkb3duIGluIHRpbWVsaW5lOlwiLCBlcnJvcik7XHJcblx0XHRcdFx0Ly8gRmFsbGJhY2sgdG8gcGxhaW4gdGV4dCBpZiByZW5kZXJpbmcgZmFpbHNcclxuXHRcdFx0XHRjb250ZW50Q29udGFpbmVyLnNldFRleHQoZXZlbnQuY29udGVudCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gRmFsbGJhY2sgZm9yIG5vbi10YXNrIGV2ZW50c1xyXG5cdFx0XHRjb250ZW50Q29udGFpbmVyLnNldFRleHQoZXZlbnQuY29udGVudCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRXZlbnQgYWN0aW9uc1xyXG5cdFx0Y29uc3QgYWN0aW9uc0VsID0gZXZlbnRFbC5jcmVhdGVEaXYoXCJ0aW1lbGluZS1ldmVudC1hY3Rpb25zXCIpO1xyXG5cclxuXHRcdGlmIChldmVudC50YXNrKSB7XHJcblx0XHRcdC8vIEdvIHRvIHRhc2tcclxuXHRcdFx0Y29uc3QgZ290b0J0biA9IGFjdGlvbnNFbC5jcmVhdGVEaXYoXCJ0aW1lbGluZS1ldmVudC1hY3Rpb25cIik7XHJcblx0XHRcdHNldEljb24oZ290b0J0biwgXCJleHRlcm5hbC1saW5rXCIpO1xyXG5cdFx0XHRnb3RvQnRuLnNldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIiwgdChcIkdvIHRvIHRhc2tcIikpO1xyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZ290b0J0biwgXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5nb1RvVGFzayhldmVudC50YXNrISk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENsaWNrIHRvIGZvY3VzIChidXQgbm90IHdoZW4gY2xpY2tpbmcgb24gY2hlY2tib3ggb3IgYWN0aW9ucylcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChldmVudEVsLCBcImNsaWNrXCIsIChlKSA9PiB7XHJcblx0XHRcdC8vIFByZXZlbnQgbmF2aWdhdGlvbiBpZiBjbGlja2luZyBvbiBjaGVja2JveCBvciBhY3Rpb24gYnV0dG9uc1xyXG5cdFx0XHRjb25zdCB0YXJnZXQgPSBlLnRhcmdldCBhcyBIVE1MRWxlbWVudDtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHRhcmdldC5jbG9zZXN0KFwiLnRpbWVsaW5lLWV2ZW50LWNoZWNrYm94XCIpIHx8XHJcblx0XHRcdFx0dGFyZ2V0LmNsb3Nlc3QoXCIudGltZWxpbmUtZXZlbnQtYWN0aW9uc1wiKSB8fFxyXG5cdFx0XHRcdHRhcmdldC5jbG9zZXN0KCdpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nKVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChldmVudC50YXNrKSB7XHJcblx0XHRcdFx0dGhpcy5nb1RvVGFzayhldmVudC50YXNrKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIGdvVG9UYXNrKHRhc2s6IFRhc2spOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGNvbnN0IGZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRGaWxlQnlQYXRoKHRhc2suZmlsZVBhdGgpO1xyXG5cdFx0aWYgKCFmaWxlKSByZXR1cm47XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgaXQncyBhIGNhbnZhcyBmaWxlXHJcblx0XHRpZiAoKHRhc2subWV0YWRhdGEgYXMgYW55KS5zb3VyY2VUeXBlID09PSBcImNhbnZhc1wiKSB7XHJcblx0XHRcdC8vIEZvciBjYW52YXMgZmlsZXMsIG9wZW4gZGlyZWN0bHlcclxuXHRcdFx0Y29uc3QgbGVhZiA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWFmKFwidGFiXCIpO1xyXG5cdFx0XHRhd2FpdCBsZWFmLm9wZW5GaWxlKGZpbGUpO1xyXG5cdFx0XHR0aGlzLmFwcC53b3Jrc3BhY2Uuc2V0QWN0aXZlTGVhZihsZWFmLCB7Zm9jdXM6IHRydWV9KTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEZvciBtYXJrZG93biBmaWxlcywgcHJlZmVyIGFjdGl2YXRpbmcgZXhpc3RpbmcgbGVhZiBpZiBmaWxlIGlzIG9wZW5cclxuXHRcdGNvbnN0IGV4aXN0aW5nTGVhZiA9IHRoaXMuYXBwLndvcmtzcGFjZVxyXG5cdFx0XHQuZ2V0TGVhdmVzT2ZUeXBlKFwibWFya2Rvd25cIilcclxuXHRcdFx0LmZpbmQoXHJcblx0XHRcdFx0KGxlYWYpID0+IChsZWFmLnZpZXcgYXMgYW55KS5maWxlID09PSBmaWxlIC8vIFR5cGUgYXNzZXJ0aW9uIG5lZWRlZCBoZXJlXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0Y29uc3QgbGVhZlRvVXNlID0gZXhpc3RpbmdMZWFmIHx8IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWFmKFwidGFiXCIpOyAvLyBPcGVuIGluIG5ldyB0YWIgaWYgbm90IG9wZW5cclxuXHJcblx0XHRhd2FpdCBsZWFmVG9Vc2Uub3BlbkZpbGUoZmlsZSwge1xyXG5cdFx0XHRhY3RpdmU6IHRydWUsIC8vIEVuc3VyZSB0aGUgbGVhZiBiZWNvbWVzIGFjdGl2ZVxyXG5cdFx0XHRlU3RhdGU6IHtcclxuXHRcdFx0XHRsaW5lOiB0YXNrLmxpbmUsXHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHRcdC8vIEZvY3VzIHRoZSBlZGl0b3IgYWZ0ZXIgb3BlbmluZ1xyXG5cdFx0dGhpcy5hcHAud29ya3NwYWNlLnNldEFjdGl2ZUxlYWYobGVhZlRvVXNlLCB7Zm9jdXM6IHRydWV9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgaGFuZGxlUXVpY2tDYXB0dXJlKCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0aWYgKCF0aGlzLm1hcmtkb3duRWRpdG9yKSByZXR1cm47XHJcblxyXG5cdFx0Y29uc3QgY29udGVudCA9IHRoaXMubWFya2Rvd25FZGl0b3IudmFsdWUudHJpbSgpO1xyXG5cdFx0aWYgKCFjb250ZW50KSByZXR1cm47XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Ly8gVXNlIHRoZSBwbHVnaW4ncyBxdWljayBjYXB0dXJlIHNldHRpbmdzXHJcblx0XHRcdGNvbnN0IGNhcHR1cmVPcHRpb25zID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlO1xyXG5cdFx0XHRhd2FpdCBzYXZlQ2FwdHVyZSh0aGlzLmFwcCwgY29udGVudCwgY2FwdHVyZU9wdGlvbnMpO1xyXG5cclxuXHRcdFx0Ly8gQ2xlYXIgdGhlIGlucHV0XHJcblx0XHRcdHRoaXMubWFya2Rvd25FZGl0b3Iuc2V0KFwiXCIsIGZhbHNlKTtcclxuXHJcblx0XHRcdC8vIFJlZnJlc2ggdGltZWxpbmVcclxuXHRcdFx0YXdhaXQgdGhpcy5sb2FkRXZlbnRzKCk7XHJcblx0XHRcdHRoaXMucmVuZGVyVGltZWxpbmUoKTtcclxuXHJcblx0XHRcdC8vIENoZWNrIGlmIHdlIHNob3VsZCBjb2xsYXBzZSBhZnRlciBjYXB0dXJlXHJcblx0XHRcdGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy50aW1lbGluZVNpZGViYXIucXVpY2tJbnB1dENvbGxhcHNlT25DYXB0dXJlKSB7XHJcblx0XHRcdFx0dGhpcy50b2dnbGVJbnB1dENvbGxhcHNlKCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gRm9jdXMgYmFjayB0byBpbnB1dFxyXG5cdFx0XHRcdHRoaXMubWFya2Rvd25FZGl0b3IuZWRpdG9yPy5mb2N1cygpO1xyXG5cdFx0XHR9XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIGNhcHR1cmU6XCIsIGVycm9yKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc2Nyb2xsVG9Ub2RheSgpOiB2b2lkIHtcclxuXHRcdGNvbnN0IHRvZGF5RWwgPSB0aGlzLnRpbWVsaW5lQ29udGFpbmVyRWwucXVlcnlTZWxlY3RvcihcclxuXHRcdFx0XCIudGltZWxpbmUtZGF0ZS1ncm91cC5pcy10b2RheVwiXHJcblx0XHQpO1xyXG5cdFx0aWYgKHRvZGF5RWwpIHtcclxuXHRcdFx0dGhpcy5pc0F1dG9TY3JvbGxpbmcgPSB0cnVlO1xyXG5cdFx0XHR0b2RheUVsLnNjcm9sbEludG9WaWV3KHtiZWhhdmlvcjogXCJzbW9vdGhcIiwgYmxvY2s6IFwic3RhcnRcIn0pO1xyXG5cdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHR0aGlzLmlzQXV0b1Njcm9sbGluZyA9IGZhbHNlO1xyXG5cdFx0XHR9LCAxMDAwKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgdG9nZ2xlRm9jdXNNb2RlKCk6IHZvaWQge1xyXG5cdFx0dGhpcy50aW1lbGluZUNvbnRhaW5lckVsLnRvZ2dsZUNsYXNzKFxyXG5cdFx0XHRcImZvY3VzLW1vZGVcIixcclxuXHRcdFx0IXRoaXMudGltZWxpbmVDb250YWluZXJFbC5oYXNDbGFzcyhcImZvY3VzLW1vZGVcIilcclxuXHRcdCk7XHJcblx0XHQvLyBJbiBmb2N1cyBtb2RlLCBvbmx5IHNob3cgdG9kYXkncyBldmVudHNcclxuXHRcdC8vIEltcGxlbWVudGF0aW9uIGRlcGVuZHMgb24gc3BlY2lmaWMgcmVxdWlyZW1lbnRzXHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGhhbmRsZVNjcm9sbCgpOiB2b2lkIHtcclxuXHRcdGlmICh0aGlzLmlzQXV0b1Njcm9sbGluZykgcmV0dXJuO1xyXG5cclxuXHRcdC8vIEltcGxlbWVudCBpbmZpbml0ZSBzY3JvbGwgb3IgbGF6eSBsb2FkaW5nIGlmIG5lZWRlZFxyXG5cdFx0Y29uc3Qge3Njcm9sbFRvcCwgc2Nyb2xsSGVpZ2h0LCBjbGllbnRIZWlnaHR9ID1cclxuXHRcdFx0dGhpcy50aW1lbGluZUNvbnRhaW5lckVsO1xyXG5cclxuXHRcdC8vIExvYWQgbW9yZSBldmVudHMgd2hlbiBuZWFyIGJvdHRvbVxyXG5cdFx0aWYgKHNjcm9sbFRvcCArIGNsaWVudEhlaWdodCA+PSBzY3JvbGxIZWlnaHQgLSAxMDApIHtcclxuXHRcdFx0Ly8gTG9hZCBtb3JlIGhpc3RvcmljYWwgZXZlbnRzXHJcblx0XHRcdHRoaXMubG9hZE1vcmVFdmVudHMoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgbG9hZE1vcmVFdmVudHMoKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHQvLyBJbXBsZW1lbnQgbG9hZGluZyBtb3JlIGhpc3RvcmljYWwgZXZlbnRzXHJcblx0XHQvLyBUaGlzIGNvdWxkIGludm9sdmUgbG9hZGluZyBvbGRlciB0YXNrcyBvciBleHRlbmRpbmcgdGhlIGRhdGUgcmFuZ2VcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgdG9nZ2xlVGFza0NvbXBsZXRpb24oXHJcblx0XHR0YXNrOiBUYXNrLFxyXG5cdFx0ZXZlbnQ/OiBFbmhhbmNlZFRpbWVsaW5lRXZlbnRcclxuXHQpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGNvbnN0IHVwZGF0ZWRUYXNrID0gey4uLnRhc2ssIGNvbXBsZXRlZDogIXRhc2suY29tcGxldGVkfTtcclxuXHJcblx0XHRpZiAodXBkYXRlZFRhc2suY29tcGxldGVkKSB7XHJcblx0XHRcdHVwZGF0ZWRUYXNrLm1ldGFkYXRhLmNvbXBsZXRlZERhdGUgPSBEYXRlLm5vdygpO1xyXG5cdFx0XHRjb25zdCBjb21wbGV0ZWRNYXJrID0gKFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnRhc2tTdGF0dXNlcy5jb21wbGV0ZWQgfHwgXCJ4XCJcclxuXHRcdFx0KS5zcGxpdChcInxcIilbMF07XHJcblx0XHRcdGlmICh1cGRhdGVkVGFzay5zdGF0dXMgIT09IGNvbXBsZXRlZE1hcmspIHtcclxuXHRcdFx0XHR1cGRhdGVkVGFzay5zdGF0dXMgPSBjb21wbGV0ZWRNYXJrO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YS5jb21wbGV0ZWREYXRlID0gdW5kZWZpbmVkO1xyXG5cdFx0XHRjb25zdCBub3RTdGFydGVkTWFyayA9XHJcblx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c2VzLm5vdFN0YXJ0ZWQgfHwgXCIgXCI7XHJcblx0XHRcdGlmICh1cGRhdGVkVGFzay5zdGF0dXMudG9Mb3dlckNhc2UoKSA9PT0gXCJ4XCIpIHtcclxuXHRcdFx0XHR1cGRhdGVkVGFzay5zdGF0dXMgPSBub3RTdGFydGVkTWFyaztcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGlmICghdGhpcy5wbHVnaW4ud3JpdGVBUEkpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIldyaXRlQVBJIG5vdCBhdmFpbGFibGVcIik7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnBsdWdpbi53cml0ZUFQSS51cGRhdGVUYXNrKHtcclxuXHRcdFx0XHR0YXNrSWQ6IHRhc2suaWQsXHJcblx0XHRcdFx0dXBkYXRlczogdXBkYXRlZFRhc2ssXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0aWYgKCFyZXN1bHQuc3VjY2Vzcykge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gdG9nZ2xlIHRhc2sgY29tcGxldGlvbjpcIiwgcmVzdWx0LmVycm9yKTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFVwZGF0ZSB0aGUgbG9jYWwgZXZlbnQgZGF0YSBpbW1lZGlhdGVseSBmb3IgcmVzcG9uc2l2ZSBVSVxyXG5cdFx0XHRpZiAoZXZlbnQpIHtcclxuXHRcdFx0XHRldmVudC50YXNrID0gdXBkYXRlZFRhc2s7XHJcblx0XHRcdFx0ZXZlbnQuc3RhdHVzID0gdXBkYXRlZFRhc2suc3RhdHVzO1xyXG5cclxuXHRcdFx0XHQvLyBVcGRhdGUgdGhlIGV2ZW50IGVsZW1lbnQncyB2aXN1YWwgc3RhdGUgaW1tZWRpYXRlbHlcclxuXHRcdFx0XHRjb25zdCBldmVudEVsID0gdGhpcy50aW1lbGluZUNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFx0XHRgW2RhdGEtZXZlbnQtaWQ9XCIke2V2ZW50LmlkfVwiXWBcclxuXHRcdFx0XHQpIGFzIEhUTUxFbGVtZW50O1xyXG5cdFx0XHRcdGlmIChldmVudEVsKSB7XHJcblx0XHRcdFx0XHRpZiAodXBkYXRlZFRhc2suY29tcGxldGVkKSB7XHJcblx0XHRcdFx0XHRcdGV2ZW50RWwuYWRkQ2xhc3MoXCJpcy1jb21wbGV0ZWRcIik7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRldmVudEVsLnJlbW92ZUNsYXNzKFwiaXMtY29tcGxldGVkXCIpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gUmVsb2FkIGV2ZW50cyB0byBlbnN1cmUgY29uc2lzdGVuY3lcclxuXHRcdFx0YXdhaXQgdGhpcy5sb2FkRXZlbnRzKCk7XHJcblx0XHRcdHRoaXMucmVuZGVyVGltZWxpbmUoKTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gdG9nZ2xlIHRhc2sgY29tcGxldGlvbjpcIiwgZXJyb3IpO1xyXG5cdFx0XHQvLyBSZXZlcnQgbG9jYWwgY2hhbmdlcyBpZiB0aGUgdXBkYXRlIGZhaWxlZFxyXG5cdFx0XHRpZiAoZXZlbnQpIHtcclxuXHRcdFx0XHRldmVudC50YXNrID0gdGFzaztcclxuXHRcdFx0XHRldmVudC5zdGF0dXMgPSB0YXNrLnN0YXR1cztcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSB1cGRhdGVUYXJnZXRJbmZvKHRhcmdldEluZm9FbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdHRhcmdldEluZm9FbC5lbXB0eSgpO1xyXG5cclxuXHRcdGNvbnN0IHNldHRpbmdzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlO1xyXG5cdFx0bGV0IHRhcmdldFRleHQgPSBcIlwiO1xyXG5cclxuXHRcdGlmIChzZXR0aW5ncy50YXJnZXRUeXBlID09PSBcImRhaWx5LW5vdGVcIikge1xyXG5cdFx0XHRjb25zdCBkYXRlU3RyID0gbW9tZW50KCkuZm9ybWF0KHNldHRpbmdzLmRhaWx5Tm90ZVNldHRpbmdzLmZvcm1hdCk7XHJcblx0XHRcdGNvbnN0IGZpbGVOYW1lID0gYCR7ZGF0ZVN0cn0ubWRgO1xyXG5cdFx0XHRjb25zdCBmdWxsUGF0aCA9IHNldHRpbmdzLmRhaWx5Tm90ZVNldHRpbmdzLmZvbGRlclxyXG5cdFx0XHRcdD8gYCR7c2V0dGluZ3MuZGFpbHlOb3RlU2V0dGluZ3MuZm9sZGVyfS8ke2ZpbGVOYW1lfWBcclxuXHRcdFx0XHQ6IGZpbGVOYW1lO1xyXG5cdFx0XHR0YXJnZXRUZXh0ID0gYCR7dChcInRvXCIpfSAke2Z1bGxQYXRofWA7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0YXJnZXRUZXh0ID0gYCR7dChcInRvXCIpfSAke1xyXG5cdFx0XHRcdHNldHRpbmdzLnRhcmdldEZpbGUgfHwgXCJRdWljayBDYXB0dXJlLm1kXCJcclxuXHRcdFx0fWA7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHNldHRpbmdzLnRhcmdldEhlYWRpbmcpIHtcclxuXHRcdFx0dGFyZ2V0VGV4dCArPSBgIOKGkiAke3NldHRpbmdzLnRhcmdldEhlYWRpbmd9YDtcclxuXHRcdH1cclxuXHJcblx0XHR0YXJnZXRJbmZvRWwuc2V0VGV4dCh0YXJnZXRUZXh0KTtcclxuXHRcdHRhcmdldEluZm9FbC5zZXRBdHRyaWJ1dGUoXCJ0aXRsZVwiLCB0YXJnZXRUZXh0KTtcclxuXHR9XHJcblxyXG5cdC8vIE1ldGhvZCB0byB0cmlnZ2VyIHZpZXcgdXBkYXRlIChjYWxsZWQgd2hlbiBzZXR0aW5ncyBjaGFuZ2UpXHJcblx0cHVibGljIGFzeW5jIHRyaWdnZXJWaWV3VXBkYXRlKCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0YXdhaXQgdGhpcy5sb2FkRXZlbnRzKCk7XHJcblx0XHR0aGlzLnJlbmRlclRpbWVsaW5lKCk7XHJcblx0fVxyXG5cclxuXHQvLyBNZXRob2QgdG8gcmVmcmVzaCB0aW1lbGluZSBkYXRhXHJcblx0cHVibGljIGFzeW5jIHJlZnJlc2hUaW1lbGluZSgpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGF3YWl0IHRoaXMubG9hZEV2ZW50cygpO1xyXG5cdFx0dGhpcy5yZW5kZXJUaW1lbGluZSgpO1xyXG5cdH1cclxuXHJcblx0Ly8gQ3JlYXRlIGNvbGxhcHNlZCBoZWFkZXIgY29udGVudFxyXG5cdHByaXZhdGUgY3JlYXRlQ29sbGFwc2VkSGVhZGVyKCk6IHZvaWQge1xyXG5cdFx0aWYgKCF0aGlzLmNvbGxhcHNlZEhlYWRlckVsKSByZXR1cm47XHJcblxyXG5cdFx0Ly8gRXhwYW5kIGJ1dHRvblxyXG5cdFx0Y29uc3QgZXhwYW5kQnRuID0gdGhpcy5jb2xsYXBzZWRIZWFkZXJFbC5jcmVhdGVEaXYoXCJjb2xsYXBzZWQtZXhwYW5kLWJ0blwiKTtcclxuXHRcdHNldEljb24oZXhwYW5kQnRuLCBcImNoZXZyb24tcmlnaHRcIik7XHJcblx0XHRleHBhbmRCdG4uc2V0QXR0cmlidXRlKFwiYXJpYS1sYWJlbFwiLCB0KFwiRXhwYW5kIHF1aWNrIGlucHV0XCIpKTtcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChleHBhbmRCdG4sIFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHR0aGlzLnRvZ2dsZUlucHV0Q29sbGFwc2UoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFRpdGxlXHJcblx0XHRjb25zdCB0aXRsZUVsID0gdGhpcy5jb2xsYXBzZWRIZWFkZXJFbC5jcmVhdGVEaXYoXCJjb2xsYXBzZWQtdGl0bGVcIik7XHJcblx0XHR0aXRsZUVsLnNldFRleHQodChcIlF1aWNrIENhcHR1cmVcIikpO1xyXG5cclxuXHRcdC8vIFF1aWNrIGFjdGlvbnNcclxuXHRcdGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy50aW1lbGluZVNpZGViYXIucXVpY2tJbnB1dFNob3dRdWlja0FjdGlvbnMpIHtcclxuXHRcdFx0Y29uc3QgcXVpY2tBY3Rpb25zRWwgPSB0aGlzLmNvbGxhcHNlZEhlYWRlckVsLmNyZWF0ZURpdihcImNvbGxhcHNlZC1xdWljay1hY3Rpb25zXCIpO1xyXG5cclxuXHRcdFx0Ly8gUXVpY2sgY2FwdHVyZSBidXR0b25cclxuXHRcdFx0Y29uc3QgcXVpY2tDYXB0dXJlQnRuID0gcXVpY2tBY3Rpb25zRWwuY3JlYXRlRGl2KFwiY29sbGFwc2VkLXF1aWNrLWNhcHR1cmVcIik7XHJcblx0XHRcdHNldEljb24ocXVpY2tDYXB0dXJlQnRuLCBcInBsdXNcIik7XHJcblx0XHRcdHF1aWNrQ2FwdHVyZUJ0bi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIHQoXCJRdWljayBjYXB0dXJlXCIpKTtcclxuXHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KHF1aWNrQ2FwdHVyZUJ0biwgXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdFx0Ly8gRXhwYW5kIGFuZCBmb2N1cyBlZGl0b3JcclxuXHRcdFx0XHRpZiAodGhpcy5pc0lucHV0Q29sbGFwc2VkKSB7XHJcblx0XHRcdFx0XHR0aGlzLnRvZ2dsZUlucHV0Q29sbGFwc2UoKTtcclxuXHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLm1hcmtkb3duRWRpdG9yPy5lZGl0b3I/LmZvY3VzKCk7XHJcblx0XHRcdFx0XHR9LCAzNTApOyAvLyBXYWl0IGZvciBhbmltYXRpb25cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gTW9yZSBvcHRpb25zIGJ1dHRvblxyXG5cdFx0XHRjb25zdCBtb3JlT3B0aW9uc0J0biA9IHF1aWNrQWN0aW9uc0VsLmNyZWF0ZURpdihcImNvbGxhcHNlZC1tb3JlLW9wdGlvbnNcIik7XHJcblx0XHRcdHNldEljb24obW9yZU9wdGlvbnNCdG4sIFwibW9yZS1ob3Jpem9udGFsXCIpO1xyXG5cdFx0XHRtb3JlT3B0aW9uc0J0bi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIHQoXCJNb3JlIG9wdGlvbnNcIikpO1xyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQobW9yZU9wdGlvbnNCdG4sIFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdG5ldyBRdWlja0NhcHR1cmVNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4sIHt9LCB0cnVlKS5vcGVuKCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gVG9nZ2xlIGNvbGxhcHNlIHN0YXRlXHJcblx0cHJpdmF0ZSB0b2dnbGVJbnB1dENvbGxhcHNlKCk6IHZvaWQge1xyXG5cdFx0aWYgKHRoaXMuaXNBbmltYXRpbmcpIHJldHVybjtcclxuXHJcblx0XHR0aGlzLmlzQW5pbWF0aW5nID0gdHJ1ZTtcclxuXHRcdHRoaXMuaXNJbnB1dENvbGxhcHNlZCA9ICF0aGlzLmlzSW5wdXRDb2xsYXBzZWQ7XHJcblxyXG5cdFx0Ly8gU2F2ZSBzdGF0ZSB0byBzZXR0aW5nc1xyXG5cdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MudGltZWxpbmVTaWRlYmFyLnF1aWNrSW5wdXRDb2xsYXBzZWQgPSB0aGlzLmlzSW5wdXRDb2xsYXBzZWQ7XHJcblx0XHR0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHJcblx0XHRpZiAodGhpcy5pc0lucHV0Q29sbGFwc2VkKSB7XHJcblx0XHRcdHRoaXMuaGFuZGxlQ29sbGFwc2VFZGl0b3IoKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMuaGFuZGxlRXhwYW5kRWRpdG9yKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUmVzZXQgYW5pbWF0aW9uIGZsYWcgYWZ0ZXIgYW5pbWF0aW9uIGNvbXBsZXRlc1xyXG5cdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdHRoaXMuaXNBbmltYXRpbmcgPSBmYWxzZTtcclxuXHRcdH0sIHRoaXMucGx1Z2luLnNldHRpbmdzLnRpbWVsaW5lU2lkZWJhci5xdWlja0lucHV0QW5pbWF0aW9uRHVyYXRpb24pO1xyXG5cdH1cclxuXHJcblx0Ly8gSGFuZGxlIGNvbGxhcHNpbmcgdGhlIGVkaXRvclxyXG5cdHByaXZhdGUgaGFuZGxlQ29sbGFwc2VFZGl0b3IoKTogdm9pZCB7XHJcblx0XHQvLyBTYXZlIGN1cnJlbnQgZWRpdG9yIGNvbnRlbnRcclxuXHRcdGlmICh0aGlzLm1hcmtkb3duRWRpdG9yKSB7XHJcblx0XHRcdHRoaXMudGVtcEVkaXRvckNvbnRlbnQgPSB0aGlzLm1hcmtkb3duRWRpdG9yLnZhbHVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFkZCBjb2xsYXBzZWQgY2xhc3MgZm9yIGFuaW1hdGlvblxyXG5cdFx0dGhpcy5xdWlja0lucHV0Q29udGFpbmVyRWwuYWRkQ2xhc3MoXCJpcy1jb2xsYXBzaW5nXCIpO1xyXG5cdFx0dGhpcy5xdWlja0lucHV0Q29udGFpbmVyRWwuYWRkQ2xhc3MoXCJpcy1jb2xsYXBzZWRcIik7XHJcblxyXG5cdFx0Ly8gU2hvdyBjb2xsYXBzZWQgaGVhZGVyIGFmdGVyIGEgc2xpZ2h0IGRlbGF5XHJcblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0dGhpcy5jb2xsYXBzZWRIZWFkZXJFbD8uc2hvdygpO1xyXG5cdFx0XHR0aGlzLnF1aWNrSW5wdXRDb250YWluZXJFbC5yZW1vdmVDbGFzcyhcImlzLWNvbGxhcHNpbmdcIik7XHJcblx0XHR9LCA1MCk7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIGNvbGxhcHNlIGJ1dHRvbiBpY29uXHJcblx0XHRjb25zdCBjb2xsYXBzZUJ0biA9IHRoaXMucXVpY2tJbnB1dEhlYWRlckVsPy5xdWVyeVNlbGVjdG9yKFwiLnF1aWNrLWlucHV0LWNvbGxhcHNlLWJ0blwiKTtcclxuXHRcdGlmIChjb2xsYXBzZUJ0bikge1xyXG5cdFx0XHRzZXRJY29uKGNvbGxhcHNlQnRuIGFzIEhUTUxFbGVtZW50LCBcImNoZXZyb24tcmlnaHRcIik7XHJcblx0XHRcdGNvbGxhcHNlQnRuLnNldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIiwgdChcIkV4cGFuZCBxdWljayBpbnB1dFwiKSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBIYW5kbGUgZXhwYW5kaW5nIHRoZSBlZGl0b3JcclxuXHRwcml2YXRlIGhhbmRsZUV4cGFuZEVkaXRvcigpOiB2b2lkIHtcclxuXHRcdC8vIEhpZGUgY29sbGFwc2VkIGhlYWRlciBpbW1lZGlhdGVseVxyXG5cdFx0dGhpcy5jb2xsYXBzZWRIZWFkZXJFbD8uaGlkZSgpO1xyXG5cclxuXHRcdC8vIFJlbW92ZSBjb2xsYXBzZWQgY2xhc3MgZm9yIGFuaW1hdGlvblxyXG5cdFx0dGhpcy5xdWlja0lucHV0Q29udGFpbmVyRWwuYWRkQ2xhc3MoXCJpcy1leHBhbmRpbmdcIik7XHJcblx0XHR0aGlzLnF1aWNrSW5wdXRDb250YWluZXJFbC5yZW1vdmVDbGFzcyhcImlzLWNvbGxhcHNlZFwiKTtcclxuXHJcblx0XHQvLyBSZXN0b3JlIGVkaXRvciBjb250ZW50XHJcblx0XHRpZiAodGhpcy5tYXJrZG93bkVkaXRvciAmJiB0aGlzLnRlbXBFZGl0b3JDb250ZW50KSB7XHJcblx0XHRcdHRoaXMubWFya2Rvd25FZGl0b3Iuc2V0KHRoaXMudGVtcEVkaXRvckNvbnRlbnQsIGZhbHNlKTtcclxuXHRcdFx0dGhpcy50ZW1wRWRpdG9yQ29udGVudCA9IFwiXCI7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRm9jdXMgZWRpdG9yIGFmdGVyIGFuaW1hdGlvblxyXG5cdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdHRoaXMucXVpY2tJbnB1dENvbnRhaW5lckVsLnJlbW92ZUNsYXNzKFwiaXMtZXhwYW5kaW5nXCIpO1xyXG5cdFx0XHR0aGlzLm1hcmtkb3duRWRpdG9yPy5lZGl0b3I/LmZvY3VzKCk7XHJcblx0XHR9LCA1MCk7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIGNvbGxhcHNlIGJ1dHRvbiBpY29uXHJcblx0XHRjb25zdCBjb2xsYXBzZUJ0biA9IHRoaXMucXVpY2tJbnB1dEhlYWRlckVsPy5xdWVyeVNlbGVjdG9yKFwiLnF1aWNrLWlucHV0LWNvbGxhcHNlLWJ0blwiKTtcclxuXHRcdGlmIChjb2xsYXBzZUJ0bikge1xyXG5cdFx0XHRzZXRJY29uKGNvbGxhcHNlQnRuIGFzIEhUTUxFbGVtZW50LCBcImNoZXZyb24tZG93blwiKTtcclxuXHRcdFx0Y29sbGFwc2VCdG4uc2V0QXR0cmlidXRlKFwiYXJpYS1sYWJlbFwiLCB0KFwiQ29sbGFwc2UgcXVpY2sgaW5wdXRcIikpO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG4iXX0=