import { __awaiter } from "tslib";
import { Component, ExtraButtonComponent, Platform, setIcon, } from "obsidian";
import { CalendarComponent } from './calendar';
import { t } from "@/translations/helper";
import "@/styles/forecast.css";
import "@/styles/calendar.css";
import { TaskListRendererComponent } from "./TaskList";
import { sortTasks } from "@/commands/sortTaskCommands"; // 导入 sortTasks 函数
import { getInitialViewMode, saveViewMode } from "@/utils/ui/view-mode-utils";
export class ForecastComponent extends Component {
    constructor(parentEl, app, plugin, params = {}) {
        super();
        this.parentEl = parentEl;
        this.app = app;
        this.plugin = plugin;
        this.params = params;
        this.taskComponents = [];
        // State
        this.allTasks = [];
        this.pastTasks = [];
        this.todayTasks = [];
        this.futureTasks = [];
        this.dateSections = [];
        this.focusFilter = null;
        this.isTreeView = false;
        this.treeComponents = [];
        this.allTasksMap = new Map();
        // Per-view override from Bases
        this.configOverride = null;
        // Initialize dates
        this.currentDate = new Date();
        this.currentDate.setHours(0, 0, 0, 0);
        this.selectedDate = new Date(this.currentDate);
    }
    onload() {
        // Create main container
        this.containerEl = this.parentEl.createDiv({
            cls: "forecast-container",
        });
        // Create content container for columns
        const contentContainer = this.containerEl.createDiv({
            cls: "forecast-content",
        });
        // Left column: create calendar section and due soon stats
        this.createLeftColumn(contentContainer);
        // Right column: create task sections by date
        this.createRightColumn(contentContainer);
        // Initialize view mode from saved state or global default
        this.initializeViewMode();
        // Set up window focus handler
        this.windowFocusHandler = () => {
            // Update current date when window regains focus
            const newCurrentDate = new Date();
            newCurrentDate.setHours(0, 0, 0, 0);
            // Store previous current date for comparison
            const oldCurrentDate = new Date(this.currentDate);
            oldCurrentDate.setHours(0, 0, 0, 0);
            // Update current date
            this.currentDate = newCurrentDate;
            // Update the calendar's current date
            this.calendarComponent.setCurrentDate(this.currentDate);
            // Only update selected date if it's older than the new current date
            // and the selected date was previously on the current date
            const selectedDateTimestamp = new Date(this.selectedDate).setHours(0, 0, 0, 0);
            const oldCurrentTimestamp = oldCurrentDate.getTime();
            const newCurrentTimestamp = newCurrentDate.getTime();
            // Check if selectedDate equals oldCurrentDate (was on "today")
            // and if the new current date is after the selected date
            if (selectedDateTimestamp === oldCurrentTimestamp &&
                selectedDateTimestamp < newCurrentTimestamp) {
                // Update selected date to the new current date
                this.selectedDate = new Date(newCurrentDate);
                // Update the calendar's selected date
                this.calendarComponent.selectDate(this.selectedDate);
            }
            // If the date hasn't changed (still the same day), don't refresh
            if (oldCurrentTimestamp === newCurrentTimestamp) {
                // Skip refreshing if it's still the same day
                return;
            }
            // Update tasks categorization and UI
            this.categorizeTasks();
            this.updateTaskStats();
            this.updateDueSoonSection();
            this.refreshDateSectionsUI();
        };
        // Register the window focus event
        this.registerDomEvent(window, "focus", this.windowFocusHandler);
    }
    setConfigOverride(override) {
        this.configOverride = override !== null && override !== void 0 ? override : null;
        this.rebuildCalendarWithEffectiveOptions();
    }
    getEffectiveForecastConfig() {
        var _a, _b;
        const baseCfg = (_a = this.plugin.settings.viewConfiguration.find((v) => v.id === "forecast")) === null || _a === void 0 ? void 0 : _a.specificConfig;
        return Object.assign(Object.assign({}, (baseCfg !== null && baseCfg !== void 0 ? baseCfg : {})), ((_b = this.configOverride) !== null && _b !== void 0 ? _b : {}));
    }
    rebuildCalendarWithEffectiveOptions() {
        var _a, _b;
        if (!this.calendarContainerEl)
            return;
        // Remove old calendar component if exists
        if (this.calendarComponent) {
            this.removeChild(this.calendarComponent);
        }
        this.calendarContainerEl.empty();
        const eff = this.getEffectiveForecastConfig();
        const calendarOptions = {
            firstDayOfWeek: (_a = eff.firstDayOfWeek) !== null && _a !== void 0 ? _a : 0,
            showWeekends: !((_b = eff.hideWeekends) !== null && _b !== void 0 ? _b : false),
            showTaskCounts: true,
        };
        this.calendarComponent = new CalendarComponent(this.calendarContainerEl, calendarOptions);
        this.addChild(this.calendarComponent);
        this.calendarComponent.load();
        // Restore state and tasks
        this.calendarComponent.setCurrentDate(this.currentDate);
        this.calendarComponent.selectDate(this.selectedDate);
        this.calendarComponent.setTasks(this.allTasks);
        // Rebind selection handler
        this.calendarComponent.onDateSelected = (date, tasks) => {
            const selectedDate = new Date(date);
            selectedDate.setHours(0, 0, 0, 0);
            this.selectedDate = selectedDate;
            this.updateDueSoonSection();
            this.refreshDateSectionsUI();
            if (Platform.isPhone) {
                this.toggleLeftColumnVisibility(false);
            }
        };
    }
    createForecastHeader() {
        this.forecastHeaderEl = this.taskContainerEl.createDiv({
            cls: "forecast-header",
        });
        if (Platform.isPhone) {
            this.forecastHeaderEl.createEl("div", {
                cls: "forecast-sidebar-toggle",
            }, (el) => {
                new ExtraButtonComponent(el)
                    .setIcon("sidebar")
                    .onClick(() => {
                    this.toggleLeftColumnVisibility();
                });
            });
        }
        // Title and task count
        const titleContainer = this.forecastHeaderEl.createDiv({
            cls: "forecast-title-container",
        });
        this.titleEl = titleContainer.createDiv({
            cls: "forecast-title",
            text: t("Forecast"),
        });
        const countEl = titleContainer.createDiv({
            cls: "forecast-count",
        });
        countEl.setText(t("0 tasks, 0 projects"));
        // View toggle and settings
        const actionsContainer = this.forecastHeaderEl.createDiv({
            cls: "forecast-actions",
        });
        // List/Tree toggle button
        const viewToggleBtn = actionsContainer.createDiv({
            cls: "view-toggle-btn",
        });
        setIcon(viewToggleBtn, "list");
        viewToggleBtn.setAttribute("aria-label", t("Toggle list/tree view"));
        this.registerDomEvent(viewToggleBtn, "click", () => {
            this.toggleViewMode();
        });
        // // Settings button
        // this.settingsEl = actionsContainer.createDiv({
        // 	cls: "forecast-settings",
        // });
        // setIcon(this.settingsEl, "settings");
    }
    /**
     * Initialize view mode from saved state or global default
     */
    initializeViewMode() {
        var _a;
        this.isTreeView = getInitialViewMode(this.app, this.plugin, "forecast");
        // Update the toggle button icon to match the initial state
        const viewToggleBtn = (_a = this.forecastHeaderEl) === null || _a === void 0 ? void 0 : _a.querySelector(".view-toggle-btn");
        if (viewToggleBtn) {
            setIcon(viewToggleBtn, this.isTreeView ? "git-branch" : "list");
        }
    }
    toggleViewMode() {
        this.isTreeView = !this.isTreeView;
        // Update toggle button icon
        const viewToggleBtn = this.forecastHeaderEl.querySelector(".view-toggle-btn");
        if (viewToggleBtn) {
            setIcon(viewToggleBtn, this.isTreeView ? "git-branch" : "list");
        }
        // Save the new view mode state
        saveViewMode(this.app, "forecast", this.isTreeView);
        // Update sections display
        this.refreshDateSectionsUI();
    }
    createFocusBar() {
        this.focusBarEl = this.taskContainerEl.createDiv({
            cls: "forecast-focus-bar",
        });
        const focusInput = this.focusBarEl.createEl("input", {
            cls: "focus-input",
            attr: {
                type: "text",
                placeholder: t("Focusing on Work"),
            },
        });
        const unfocusBtn = this.focusBarEl.createEl("button", {
            cls: "unfocus-button",
            text: t("Unfocus"),
        });
        this.registerDomEvent(unfocusBtn, "click", () => {
            focusInput.value = "";
        });
    }
    createLeftColumn(parentEl) {
        var _a, _b;
        this.leftColumnEl = parentEl.createDiv({
            cls: "forecast-left-column",
        });
        if (Platform.isPhone) {
            // Add close button for mobile sidebar
            const closeBtn = this.leftColumnEl.createDiv({
                cls: "forecast-sidebar-close",
            });
            new ExtraButtonComponent(closeBtn).setIcon("x").onClick(() => {
                this.toggleLeftColumnVisibility(false);
            });
        }
        // Stats bar for Past Due / Today / Future counts
        this.createStatsBar(this.leftColumnEl);
        // Calendar section
        this.calendarContainerEl = this.leftColumnEl.createDiv({
            cls: "forecast-calendar-section",
        });
        // Create and initialize calendar component using effective config (Bases override + settings)
        const eff = this.getEffectiveForecastConfig();
        const calendarOptions = {
            firstDayOfWeek: (_a = eff.firstDayOfWeek) !== null && _a !== void 0 ? _a : 0,
            showWeekends: !((_b = eff.hideWeekends) !== null && _b !== void 0 ? _b : false),
            showTaskCounts: true,
        };
        this.calendarComponent = new CalendarComponent(this.calendarContainerEl, calendarOptions);
        this.addChild(this.calendarComponent);
        this.calendarComponent.load();
        // Due Soon section below calendar
        this.createDueSoonSection(this.leftColumnEl);
        // Set up calendar events
        this.calendarComponent.onDateSelected = (date, tasks) => {
            const selectedDate = new Date(date);
            selectedDate.setHours(0, 0, 0, 0);
            this.selectedDate = selectedDate;
            // Update the Coming Up section first
            this.updateDueSoonSection();
            // Then refresh the date sections in the right panel
            this.refreshDateSectionsUI();
            if (Platform.isPhone) {
                this.toggleLeftColumnVisibility(false);
            }
        };
    }
    createStatsBar(parentEl) {
        this.statsContainerEl = parentEl.createDiv({
            cls: "forecast-stats",
        });
        // Create stat items
        const createStatItem = (id, label, count, type) => {
            const statItem = this.statsContainerEl.createDiv({
                cls: `stat-item tg-${id}`,
            });
            const countEl = statItem.createDiv({
                cls: "stat-count",
                text: count.toString(),
            });
            const labelEl = statItem.createDiv({
                cls: "stat-label",
                text: label,
            });
            // Register click handler
            this.registerDomEvent(statItem, "click", () => {
                this.focusTaskList(type);
                if (Platform.isPhone) {
                    this.toggleLeftColumnVisibility(false);
                }
            });
            return statItem;
        };
        // Create stats for past due, today, and future
        createStatItem("past-due", t("Past Due"), 0, "past-due");
        createStatItem("today", t("Today"), 0, "today");
        createStatItem("future", t("Future"), 0, "future");
    }
    createDueSoonSection(parentEl) {
        this.dueSoonContainerEl = parentEl.createDiv({
            cls: "forecast-due-soon-section",
        });
        // Due soon entries will be added when tasks are set
    }
    createRightColumn(parentEl) {
        this.taskContainerEl = parentEl.createDiv({
            cls: "forecast-right-column",
        });
        // Create header with project count and actions
        this.createForecastHeader();
        // Create focus filter bar
        // this.createFocusBar();
        this.taskListContainerEl = this.taskContainerEl.createDiv({
            cls: "forecast-task-list",
        });
        // Date sections will be added when tasks are set
    }
    setTasks(tasks) {
        this.allTasks = tasks;
        this.allTasksMap = new Map(this.allTasks.map((task) => [task.id, task]));
        // Update header count
        this.updateHeaderCount();
        // Filter and categorize tasks
        this.categorizeTasks();
        // Update calendar with all tasks
        this.calendarComponent.setTasks(this.allTasks);
        // Update stats
        this.updateTaskStats();
        // Update due soon section
        this.updateDueSoonSection();
        // Calculate and render date sections for the right column
        this.calculateDateSections();
        this.renderDateSectionsUI();
    }
    updateHeaderCount() {
        // Count actions (tasks) and unique projects
        const projectSet = new Set();
        this.allTasks.forEach((task) => {
            if (task.metadata.project) {
                projectSet.add(task.metadata.project);
            }
        });
        const taskCount = this.allTasks.length;
        const projectCount = projectSet.size;
        // Update header
        const countEl = this.forecastHeaderEl.querySelector(".forecast-count");
        if (countEl) {
            countEl.textContent = `${taskCount} ${t("tasks")}, ${projectCount} ${t("project")}${projectCount !== 1 ? "s" : ""}`;
        }
    }
    categorizeTasks() {
        var _a;
        // Use currentDate as today
        const today = new Date(this.currentDate);
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = today.getTime();
        const sortCriteria = (_a = this.plugin.settings.viewConfiguration.find((view) => view.id === "forecast")) === null || _a === void 0 ? void 0 : _a.sortCriteria;
        // Filter for incomplete tasks with a relevant date
        const tasksWithRelevantDate = this.allTasks.filter((task) => this.getRelevantDate(task) !== undefined);
        // Split into past, today, and future based on relevantDate
        this.pastTasks = tasksWithRelevantDate.filter((task) => {
            const relevantTimestamp = this.getRelevantDate(task);
            return relevantTimestamp < todayTimestamp;
        });
        this.todayTasks = tasksWithRelevantDate.filter((task) => {
            const relevantTimestamp = this.getRelevantDate(task);
            return relevantTimestamp === todayTimestamp;
        });
        this.futureTasks = tasksWithRelevantDate.filter((task) => {
            const relevantTimestamp = this.getRelevantDate(task);
            return relevantTimestamp > todayTimestamp;
        });
        // Use sortTasks to sort tasks
        if (sortCriteria && sortCriteria.length > 0) {
            this.pastTasks = sortTasks(this.pastTasks, sortCriteria, this.plugin.settings);
            this.todayTasks = sortTasks(this.todayTasks, sortCriteria, this.plugin.settings);
            this.futureTasks = sortTasks(this.futureTasks, sortCriteria, this.plugin.settings);
        }
        else {
            // 如果未启用排序设置，使用默认的优先级和日期排序
            this.pastTasks = this.sortTasksByPriorityAndRelevantDate(this.pastTasks);
            this.todayTasks = this.sortTasksByPriorityAndRelevantDate(this.todayTasks);
            this.futureTasks = this.sortTasksByPriorityAndRelevantDate(this.futureTasks);
        }
    }
    /**
     * 按优先级和相关日期排序任务
     */
    sortTasksByPriorityAndRelevantDate(tasks) {
        return tasks.sort((a, b) => {
            // First by priority (high to low)
            const priorityA = a.metadata.priority || 0;
            const priorityB = b.metadata.priority || 0;
            if (priorityA !== priorityB) {
                return priorityB - priorityA;
            }
            // Then by relevant date (early to late)
            // Ensure dates exist before comparison
            const relevantDateA = this.getRelevantDate(a);
            const relevantDateB = this.getRelevantDate(b);
            if (relevantDateA === undefined && relevantDateB === undefined)
                return 0;
            if (relevantDateA === undefined)
                return 1; // Place tasks without dates later
            if (relevantDateB === undefined)
                return -1; // Place tasks without dates later
            return relevantDateA - relevantDateB;
        });
    }
    updateTaskStats() {
        // Update counts in stats bar
        const statItems = this.statsContainerEl.querySelectorAll(".stat-item");
        statItems.forEach((item) => {
            const countEl = item.querySelector(".stat-count");
            if (countEl) {
                // Note: Labels remain "Past Due", "Today", "Future" but now include scheduled tasks.
                if (item.hasClass("tg-past-due")) {
                    countEl.textContent = this.pastTasks.length.toString(); // Use pastTasks
                }
                else if (item.hasClass("tg-today")) {
                    countEl.textContent = this.todayTasks.length.toString();
                }
                else if (item.hasClass("tg-future")) {
                    countEl.textContent = this.futureTasks.length.toString();
                }
            }
        });
    }
    updateDueSoonSection() {
        // Clear existing content
        this.dueSoonContainerEl.empty();
        // Use the current selected date as the starting point
        // Always create a new date object to avoid reference issues
        const baseDate = new Date(this.selectedDate);
        baseDate.setHours(0, 0, 0, 0);
        const dueSoonItems = [];
        // Process tasks with relevant dates in the next 15 days from the selected date
        for (let i = 0; i < 15; i++) {
            const date = new Date(baseDate);
            date.setDate(date.getDate() + i);
            // Skip the selected day itself - Coming Up should show days *after* the selected one
            if (date.getTime() === baseDate.getTime())
                continue;
            // Use the new function checking relevantDate
            const tasksForDay = this.getTasksForRelevantDate(date);
            if (tasksForDay.length > 0) {
                dueSoonItems.push({
                    date: date,
                    tasks: tasksForDay,
                });
            }
        }
        // Add a header
        const headerEl = this.dueSoonContainerEl.createDiv({
            cls: "due-soon-header",
        });
        headerEl.setText(t("Coming Up")); // Title remains "Coming Up"
        // Create entries for upcoming tasks based on relevant date
        dueSoonItems.forEach((item) => {
            const itemEl = this.dueSoonContainerEl.createDiv({
                cls: "due-soon-item",
            });
            // Format the date
            const dateStr = this.formatDateForDueSoon(item.date);
            // Get day of week
            const dayOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][item.date.getDay()];
            const dateEl = itemEl.createDiv({
                cls: "due-soon-date",
            });
            dateEl.setText(`${dayOfWeek}, ${dateStr}`);
            const countEl = itemEl.createDiv({
                cls: "due-soon-count",
            });
            // Properly format the task count
            const taskCount = item.tasks.length;
            countEl.setText(`${taskCount} ${taskCount === 1 ? t("Task") : t("Tasks")}`);
            // Add click handler to select this date in the calendar
            this.registerDomEvent(itemEl, "click", () => {
                this.calendarComponent.selectDate(item.date);
                // this.selectedDate = item.date; // This is now handled by calendarComponent.onDateSelected
                // this.refreshDateSectionsUI(); // This is now handled by calendarComponent.onDateSelected
                if (Platform.isPhone) {
                    this.toggleLeftColumnVisibility(false);
                }
            });
        });
        // Add empty state if needed
        if (dueSoonItems.length === 0) {
            const emptyEl = this.dueSoonContainerEl.createDiv({
                cls: "due-soon-empty",
            });
            emptyEl.setText(t("No upcoming tasks"));
        }
    }
    formatDateForDueSoon(date) {
        const monthNames = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ];
        return `${monthNames[date.getMonth()]} ${date.getDate()}`;
    }
    calculateDateSections() {
        this.dateSections = [];
        // Today section
        if (this.todayTasks.length > 0) {
            this.dateSections.push({
                title: this.formatSectionTitleForDate(this.currentDate),
                date: new Date(this.currentDate),
                tasks: this.todayTasks,
                isExpanded: true,
            });
        }
        // Future sections by relevant date
        const dateMap = new Map();
        this.futureTasks.forEach((task) => {
            const relevantTimestamp = this.getRelevantDate(task);
            if (relevantTimestamp) {
                const date = new Date(relevantTimestamp); // Already zeroed by getRelevantDate logic implicitly via getTime()
                // Use local date components for the key to avoid timezone shifts in map key
                const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                if (!dateMap.has(dateKey)) {
                    dateMap.set(dateKey, []);
                }
                // Ensure task is added only once per relevant date section
                if (!dateMap.get(dateKey).some((t) => t.id === task.id)) {
                    dateMap.get(dateKey).push(task);
                }
            }
        });
        // Sort dates and create sections
        const sortedDates = Array.from(dateMap.keys()).sort();
        sortedDates.forEach((dateKey) => {
            const [year, month, day] = dateKey.split("-").map(Number);
            const date = new Date(year, month - 1, day);
            const tasks = dateMap.get(dateKey); // Tasks should already be sorted by priority within category
            const today = new Date(this.currentDate);
            today.setHours(0, 0, 0, 0);
            // Use helper for title
            const title = this.formatSectionTitleForDate(date);
            this.dateSections.push({
                title: title,
                date: date,
                tasks: tasks,
                isExpanded: this.shouldExpandFutureSection(date, this.currentDate), // Expand based on relation to today
            });
        });
        // Past section (if any) - using pastTasks
        // Title remains "Past Due" but covers overdue and past scheduled.
        if (this.pastTasks.length > 0) {
            this.dateSections.unshift({
                title: t("Past Due"),
                date: new Date(0),
                tasks: this.pastTasks,
                isExpanded: true,
            });
        }
        const viewConfig = this.plugin.settings.viewConfiguration.find((view) => view.id === "forecast");
        if ((viewConfig === null || viewConfig === void 0 ? void 0 : viewConfig.sortCriteria) && viewConfig.sortCriteria.length > 0) {
            const dueDateSortCriterion = viewConfig.sortCriteria.find((t) => t.field === "dueDate");
            const scheduledDateSortCriterion = viewConfig.sortCriteria.find((t) => t.field === "scheduledDate");
            if (dueDateSortCriterion && dueDateSortCriterion.order === "desc") {
                this.dateSections.reverse();
            }
            else if (scheduledDateSortCriterion &&
                scheduledDateSortCriterion.order === "desc") {
                this.dateSections.reverse();
            }
        }
    }
    renderDateSectionsUI() {
        this.cleanupRenderers();
        // Ensure the map is up-to-date (belt and suspenders)
        this.allTasksMap = new Map(this.allTasks.map((task) => [task.id, task]));
        if (this.dateSections.length === 0) {
            const emptyEl = this.taskListContainerEl.createDiv({
                cls: "forecast-empty-state",
            });
            emptyEl.setText(t("No tasks scheduled"));
            return;
        }
        this.dateSections.forEach((section) => {
            const sectionEl = this.taskListContainerEl.createDiv({
                cls: "task-date-section",
            });
            // Check if this section is overdue
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const sectionDate = new Date(section.date);
            sectionDate.setHours(0, 0, 0, 0);
            // Add 'overdue' class for past due sections
            if (sectionDate.getTime() < today.getTime() ||
                section.title === "Past Due") {
                sectionEl.addClass("overdue");
            }
            // Section header
            const headerEl = sectionEl.createDiv({
                cls: "date-section-header",
            });
            // Expand/collapse toggle
            const toggleEl = headerEl.createDiv({
                cls: "section-toggle",
            });
            setIcon(toggleEl, section.isExpanded ? "chevron-down" : "chevron-right");
            // Section title
            const titleEl = headerEl.createDiv({
                cls: "section-title",
            });
            titleEl.setText(section.title);
            // Task count badge
            const countEl = headerEl.createDiv({
                cls: "section-count",
            });
            countEl.setText(`${section.tasks.length}`);
            // Task container (initially hidden if collapsed)
            const taskListEl = sectionEl.createDiv({
                cls: "section-tasks",
            });
            if (!section.isExpanded) {
                taskListEl.hide();
            }
            // Register toggle event
            this.registerDomEvent(headerEl, "click", () => {
                section.isExpanded = !section.isExpanded;
                setIcon(toggleEl, section.isExpanded ? "chevron-down" : "chevron-right");
                section.isExpanded ? taskListEl.show() : taskListEl.hide();
            });
            // Create and configure renderer for this section
            section.renderer = new TaskListRendererComponent(this, taskListEl, this.plugin, this.app, "forecast");
            this.params.onTaskSelected &&
                (section.renderer.onTaskSelected = this.params.onTaskSelected);
            this.params.onTaskCompleted &&
                (section.renderer.onTaskCompleted =
                    this.params.onTaskCompleted);
            this.params.onTaskContextMenu &&
                (section.renderer.onTaskContextMenu =
                    this.params.onTaskContextMenu);
            // Set up task update callback - use params callback if available, otherwise use internal updateTask
            section.renderer.onTaskUpdate = (originalTask, updatedTask) => __awaiter(this, void 0, void 0, function* () {
                if (this.params.onTaskUpdate) {
                    yield this.params.onTaskUpdate(originalTask, updatedTask);
                }
                else {
                    // Fallback to internal updateTask method
                    this.updateTask(updatedTask);
                }
            });
            // Render tasks using the section's renderer
            section.renderer.renderTasks(section.tasks, this.isTreeView, this.allTasksMap, t("No tasks for this section."));
        });
    }
    formatDate(date) {
        const months = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
        ];
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    }
    focusTaskList(type) {
        // Clear previous focus
        const statItems = this.statsContainerEl.querySelectorAll(".stat-item");
        statItems.forEach((item) => item.classList.remove("active"));
        // Set new focus
        if (this.focusFilter === type) {
            // Toggle off if already selected
            this.focusFilter = null;
        }
        else {
            this.focusFilter = type;
            const activeItem = this.statsContainerEl.querySelector(`.stat-item.tg-${type}` // Use the type identifier passed during creation
            );
            if (activeItem) {
                activeItem.classList.add("active");
            }
        }
        // Update date sections based on filter using new task categories
        if (this.focusFilter === "past-due") {
            this.dateSections =
                this.pastTasks.length > 0
                    ? [
                        // Check if tasks exist
                        {
                            title: t("Past Due"),
                            date: new Date(0),
                            tasks: this.pastTasks,
                            isExpanded: true,
                        },
                    ]
                    : []; // Empty array if no past tasks
        }
        else if (this.focusFilter === "today") {
            this.dateSections =
                this.todayTasks.length > 0
                    ? [
                        // Check if tasks exist
                        {
                            title: this.formatSectionTitleForDate(this.currentDate),
                            date: new Date(this.currentDate),
                            tasks: this.todayTasks,
                            isExpanded: true,
                        },
                    ]
                    : []; // Empty array if no today tasks
        }
        else if (this.focusFilter === "future") {
            // Recalculate future sections using relevant dates
            this.calculateDateSections(); // Recalculates all, including future
            // Filter out past and today sections from the full recalculation
            const todayTimestamp = new Date(this.currentDate).setHours(0, 0, 0, 0);
            this.dateSections = this.dateSections.filter((section) => {
                // Keep sections whose date is strictly after today
                // Exclude the 'Past Due' section (date timestamp 0)
                const sectionTimestamp = section.date.getTime();
                return sectionTimestamp > todayTimestamp;
            });
        }
        else {
            // No filter, show all sections (recalculate)
            this.calculateDateSections();
        }
        // Re-render the sections
        this.renderDateSectionsUI();
    }
    refreshDateSectionsUI() {
        // Update sections based on selected date
        if (this.focusFilter) {
            // If there's a filter active, don't change the sections
            return;
        }
        this.cleanupRenderers();
        // Calculate the sections based on the new selectedDate
        this.calculateFilteredDateSections();
        // Render the newly calculated sections
        this.renderDateSectionsUI();
    }
    calculateFilteredDateSections() {
        var _a;
        this.dateSections = [];
        // 基于选择日期重新分类所有任务
        const selectedTimestamp = new Date(this.selectedDate).setHours(0, 0, 0, 0);
        // 获取有相关日期的任务
        const tasksWithRelevantDate = this.allTasks.filter((task) => this.getRelevantDate(task) !== undefined);
        // 相对于选择日期重新分类
        const pastTasksRelativeToSelected = tasksWithRelevantDate.filter((task) => {
            const relevantTimestamp = this.getRelevantDate(task);
            return relevantTimestamp < selectedTimestamp;
        });
        const selectedDateTasks = tasksWithRelevantDate.filter((task) => {
            const relevantTimestamp = this.getRelevantDate(task);
            return relevantTimestamp === selectedTimestamp;
        });
        const futureTasksRelativeToSelected = tasksWithRelevantDate.filter((task) => {
            const relevantTimestamp = this.getRelevantDate(task);
            return relevantTimestamp > selectedTimestamp;
        });
        // 获取排序配置
        const sortCriteria = (_a = this.plugin.settings.viewConfiguration.find((view) => view.id === "forecast")) === null || _a === void 0 ? void 0 : _a.sortCriteria;
        // 对重新分类的任务进行排序
        let sortedPastTasks;
        let sortedSelectedDateTasks;
        let sortedFutureTasks;
        if (sortCriteria && sortCriteria.length > 0) {
            sortedPastTasks = sortTasks(pastTasksRelativeToSelected, sortCriteria, this.plugin.settings);
            sortedSelectedDateTasks = sortTasks(selectedDateTasks, sortCriteria, this.plugin.settings);
            sortedFutureTasks = sortTasks(futureTasksRelativeToSelected, sortCriteria, this.plugin.settings);
        }
        else {
            sortedPastTasks = this.sortTasksByPriorityAndRelevantDate(pastTasksRelativeToSelected);
            sortedSelectedDateTasks = this.sortTasksByPriorityAndRelevantDate(selectedDateTasks);
            sortedFutureTasks = this.sortTasksByPriorityAndRelevantDate(futureTasksRelativeToSelected);
        }
        // Section for the selected date
        if (sortedSelectedDateTasks.length > 0) {
            this.dateSections.push({
                title: this.formatSectionTitleForDate(this.selectedDate),
                date: new Date(this.selectedDate),
                tasks: sortedSelectedDateTasks,
                isExpanded: true,
            });
        }
        // Add Past Due section if applicable
        if (sortedPastTasks.length > 0) {
            this.dateSections.unshift({
                title: t("Past Due"),
                date: new Date(0),
                tasks: sortedPastTasks,
                isExpanded: true,
            });
        }
        // Add future sections by date
        const dateMap = new Map();
        sortedFutureTasks.forEach((task) => {
            const relevantTimestamp = this.getRelevantDate(task);
            const date = new Date(relevantTimestamp);
            // Create date key
            const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
            if (!dateMap.has(dateKey)) {
                dateMap.set(dateKey, []);
            }
            // Avoid duplicates
            if (!dateMap.get(dateKey).some((t) => t.id === task.id)) {
                dateMap.get(dateKey).push(task);
            }
        });
        const sortedDates = Array.from(dateMap.keys()).sort();
        sortedDates.forEach((dateKey) => {
            const [year, month, day] = dateKey.split("-").map(Number);
            const date = new Date(year, month - 1, day);
            const tasks = dateMap.get(dateKey);
            let title = this.formatSectionTitleForDate(date);
            this.dateSections.push({
                title: title,
                date: date,
                tasks: tasks,
                // Expand based on relation to the selected date
                isExpanded: this.shouldExpandFutureSection(date, this.selectedDate),
            });
        });
        // 处理排序配置中的降序设置
        if (sortCriteria && sortCriteria.length > 0) {
            const dueDateSortCriterion = sortCriteria.find((t) => t.field === "dueDate");
            const scheduledDateSortCriterion = sortCriteria.find((t) => t.field === "scheduledDate");
            if (dueDateSortCriterion && dueDateSortCriterion.order === "desc") {
                this.dateSections.reverse();
            }
            else if (scheduledDateSortCriterion &&
                scheduledDateSortCriterion.order === "desc") {
                this.dateSections.reverse();
            }
        }
        // Handle empty state in renderDateSectionsUI
    }
    // Helper to format section titles dynamically based on relation to today
    formatSectionTitleForDate(date) {
        const dateTimestamp = new Date(date).setHours(0, 0, 0, 0);
        const todayTimestamp = new Date(this.currentDate).setHours(0, 0, 0, 0);
        let prefix = "";
        const dayDiffFromToday = Math.round((dateTimestamp - todayTimestamp) / (1000 * 3600 * 24));
        if (dayDiffFromToday === 0) {
            prefix = t("Today") + ", ";
        }
        else if (dayDiffFromToday === 1) {
            prefix = t("Tomorrow") + ", ";
        }
        // else: no prefix for other days
        // Use full day name
        const dayOfWeek = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
        ][date.getDay()];
        const formattedDate = this.formatDate(date); // e.g., "January 1, 2024"
        // For Today, just show "Today - Full Date"
        if (dayDiffFromToday === 0) {
            return t("Today") + " — " + formattedDate;
        }
        // For others, show Prefix + DayOfWeek + Full Date
        return `${prefix}${dayOfWeek}, ${formattedDate}`;
    }
    // Helper to decide if a future section should be expanded relative to a comparison date
    shouldExpandFutureSection(sectionDate, compareDate) {
        const compareTimestamp = new Date(compareDate).setHours(0, 0, 0, 0);
        const sectionTimestamp = new Date(sectionDate).setHours(0, 0, 0, 0);
        // Calculate difference in days from the comparison date
        const dayDiff = Math.round((sectionTimestamp - compareTimestamp) / (1000 * 3600 * 24));
        // Expand if the section date is within the next 7 days *after* the comparison date
        return dayDiff > 0 && dayDiff <= 7;
    }
    // Renaming getTasksForDate to be more specific about its check
    getTasksForRelevantDate(date) {
        if (!date)
            return [];
        const targetTimestamp = new Date(date).setHours(0, 0, 0, 0);
        return this.allTasks.filter((task) => {
            const relevantTimestamp = this.getRelevantDate(task);
            return relevantTimestamp === targetTimestamp;
        });
    }
    updateTask(updatedTask) {
        // Update in the main list
        const taskIndex = this.allTasks.findIndex((t) => t.id === updatedTask.id);
        if (taskIndex !== -1) {
            this.allTasks[taskIndex] = updatedTask;
        }
        else {
            this.allTasks.push(updatedTask); // Add if new
        }
        this.allTasksMap.set(updatedTask.id, updatedTask);
        // Re-categorize tasks based on potentially changed relevantDate
        this.categorizeTasks();
        this.updateHeaderCount();
        this.updateTaskStats();
        this.updateDueSoonSection();
        this.calendarComponent.setTasks(this.allTasks);
        // Refresh UI based on current view state (filtered or full)
        if (this.focusFilter) {
            this.focusTaskList(this.focusFilter);
        }
        else {
            this.refreshDateSectionsUI();
        }
    }
    cleanupRenderers() {
        this.dateSections.forEach((section) => {
            if (section.renderer) {
                this.removeChild(section.renderer);
                section.renderer = undefined;
            }
        });
        // Clear the container manually
        this.taskListContainerEl.empty();
    }
    onunload() {
        // Renderers are children, handled by Obsidian unload.
        // No need to manually remove DOM event listeners registered with this.registerDomEvent
        this.containerEl.empty();
        this.containerEl.remove();
    }
    // Toggle left column visibility with animation support
    toggleLeftColumnVisibility(visible) {
        if (visible === undefined) {
            // Toggle based on current state
            visible = !this.leftColumnEl.hasClass("is-visible");
        }
        if (visible) {
            this.leftColumnEl.addClass("is-visible");
            this.leftColumnEl.show();
        }
        else {
            this.leftColumnEl.removeClass("is-visible");
            // Wait for animation to complete before hiding
            setTimeout(() => {
                if (!this.leftColumnEl.hasClass("is-visible")) {
                    this.leftColumnEl.hide();
                }
            }, 300); // Match CSS transition duration
        }
    }
    getRelevantDate(task) {
        // Prioritize scheduledDate, fallback to dueDate
        const dateToUse = task.metadata.scheduledDate || task.metadata.dueDate;
        if (!dateToUse)
            return undefined;
        // Return timestamp (or Date object if needed elsewhere, but timestamp is good for comparisons)
        const date = new Date(dateToUse);
        date.setHours(0, 0, 0, 0); // Zero out time for consistent comparison
        return date.getTime();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9yZWNhc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmb3JlY2FzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUVOLFNBQVMsRUFDVCxvQkFBb0IsRUFDcEIsUUFBUSxFQUNSLE9BQU8sR0FDUCxNQUFNLFVBQVUsQ0FBQztBQUVsQixPQUFPLEVBQUUsaUJBQWlCLEVBQW1CLE1BQU0sWUFBWSxDQUFDO0FBRWhFLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUMxQyxPQUFPLHVCQUF1QixDQUFDO0FBQy9CLE9BQU8sdUJBQXVCLENBQUM7QUFFL0IsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sWUFBWSxDQUFDO0FBR3ZELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQyxDQUFDLGtCQUFrQjtBQUMzRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsWUFBWSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFVOUUsTUFBTSxPQUFPLGlCQUFrQixTQUFRLFNBQVM7SUFzQy9DLFlBQ1MsUUFBcUIsRUFDckIsR0FBUSxFQUNSLE1BQTZCLEVBQzdCLFNBUUosRUFBRTtRQUVOLEtBQUssRUFBRSxDQUFDO1FBYkEsYUFBUSxHQUFSLFFBQVEsQ0FBYTtRQUNyQixRQUFHLEdBQUgsR0FBRyxDQUFLO1FBQ1IsV0FBTSxHQUFOLE1BQU0sQ0FBdUI7UUFDN0IsV0FBTSxHQUFOLE1BQU0sQ0FRUjtRQWhDQyxtQkFBYyxHQUE0QixFQUFFLENBQUM7UUFFckQsUUFBUTtRQUNBLGFBQVEsR0FBVyxFQUFFLENBQUM7UUFDdEIsY0FBUyxHQUFXLEVBQUUsQ0FBQztRQUN2QixlQUFVLEdBQVcsRUFBRSxDQUFDO1FBQ3hCLGdCQUFXLEdBQVcsRUFBRSxDQUFDO1FBR3pCLGlCQUFZLEdBQWtCLEVBQUUsQ0FBQztRQUNqQyxnQkFBVyxHQUFrQixJQUFJLENBQUM7UUFFbEMsZUFBVSxHQUFZLEtBQUssQ0FBQztRQUM1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Q0FBQyxDQUFDLGdDQUFnQztTQUN6QztJQUNGLENBQUM7SUFFTyxlQUFlLENBQUMsSUFBVTtRQUNqQyxnREFBZ0Q7UUFDaEQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7UUFDdkUsSUFBSSxDQUFDLFNBQVM7WUFBRSxPQUFPLFNBQVMsQ0FBQztRQUVqQywrRkFBK0Y7UUFDL0YsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLDBDQUEwQztRQUNyRSxPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN2QixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xyXG5cdEFwcCxcclxuXHRDb21wb25lbnQsXHJcblx0RXh0cmFCdXR0b25Db21wb25lbnQsXHJcblx0UGxhdGZvcm0sXHJcblx0c2V0SWNvbixcclxufSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgVGFzayB9IGZyb20gXCJAL3R5cGVzL3Rhc2tcIjtcclxuaW1wb3J0IHsgQ2FsZW5kYXJDb21wb25lbnQsIENhbGVuZGFyT3B0aW9ucyB9IGZyb20gJy4vY2FsZW5kYXInO1xyXG5pbXBvcnQgeyBUYXNrTGlzdEl0ZW1Db21wb25lbnQgfSBmcm9tIFwiLi9saXN0SXRlbVwiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgXCJAL3N0eWxlcy9mb3JlY2FzdC5jc3NcIjtcclxuaW1wb3J0IFwiQC9zdHlsZXMvY2FsZW5kYXIuY3NzXCI7XHJcbmltcG9ydCB7IFRhc2tUcmVlSXRlbUNvbXBvbmVudCB9IGZyb20gXCIuL3RyZWVJdGVtXCI7XHJcbmltcG9ydCB7IFRhc2tMaXN0UmVuZGVyZXJDb21wb25lbnQgfSBmcm9tIFwiLi9UYXNrTGlzdFwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7IEZvcmVjYXN0U3BlY2lmaWNDb25maWcgfSBmcm9tIFwiQC9jb21tb24vc2V0dGluZy1kZWZpbml0aW9uXCI7XHJcbmltcG9ydCB7IHNvcnRUYXNrcyB9IGZyb20gXCJAL2NvbW1hbmRzL3NvcnRUYXNrQ29tbWFuZHNcIjsgLy8g5a+85YWlIHNvcnRUYXNrcyDlh73mlbBcclxuaW1wb3J0IHsgZ2V0SW5pdGlhbFZpZXdNb2RlLCBzYXZlVmlld01vZGUgfSBmcm9tIFwiQC91dGlscy91aS92aWV3LW1vZGUtdXRpbHNcIjtcclxuXHJcbmludGVyZmFjZSBEYXRlU2VjdGlvbiB7XHJcblx0dGl0bGU6IHN0cmluZztcclxuXHRkYXRlOiBEYXRlO1xyXG5cdHRhc2tzOiBUYXNrW107XHJcblx0aXNFeHBhbmRlZDogYm9vbGVhbjtcclxuXHRyZW5kZXJlcj86IFRhc2tMaXN0UmVuZGVyZXJDb21wb25lbnQ7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBGb3JlY2FzdENvbXBvbmVudCBleHRlbmRzIENvbXBvbmVudCB7XHJcblx0Ly8gVUkgRWxlbWVudHNcclxuXHRwdWJsaWMgY29udGFpbmVyRWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgZm9yZWNhc3RIZWFkZXJFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBzZXR0aW5nc0VsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIGNhbGVuZGFyQ29udGFpbmVyRWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgZHVlU29vbkNvbnRhaW5lckVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIHRhc2tDb250YWluZXJFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSB0YXNrTGlzdENvbnRhaW5lckVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIGZvY3VzQmFyRWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgdGl0bGVFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBzdGF0c0NvbnRhaW5lckVsOiBIVE1MRWxlbWVudDtcclxuXHJcblx0cHJpdmF0ZSBsZWZ0Q29sdW1uRWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgcmlnaHRDb2x1bW5FbDogSFRNTEVsZW1lbnQ7XHJcblxyXG5cdC8vIENoaWxkIGNvbXBvbmVudHNcclxuXHRwcml2YXRlIGNhbGVuZGFyQ29tcG9uZW50OiBDYWxlbmRhckNvbXBvbmVudDtcclxuXHRwcml2YXRlIHRhc2tDb21wb25lbnRzOiBUYXNrTGlzdEl0ZW1Db21wb25lbnRbXSA9IFtdO1xyXG5cclxuXHQvLyBTdGF0ZVxyXG5cdHByaXZhdGUgYWxsVGFza3M6IFRhc2tbXSA9IFtdO1xyXG5cdHByaXZhdGUgcGFzdFRhc2tzOiBUYXNrW10gPSBbXTtcclxuXHRwcml2YXRlIHRvZGF5VGFza3M6IFRhc2tbXSA9IFtdO1xyXG5cdHByaXZhdGUgZnV0dXJlVGFza3M6IFRhc2tbXSA9IFtdO1xyXG5cdHByaXZhdGUgc2VsZWN0ZWREYXRlOiBEYXRlO1xyXG5cdHByaXZhdGUgY3VycmVudERhdGU6IERhdGU7XHJcblx0cHJpdmF0ZSBkYXRlU2VjdGlvbnM6IERhdGVTZWN0aW9uW10gPSBbXTtcclxuXHRwcml2YXRlIGZvY3VzRmlsdGVyOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIHdpbmRvd0ZvY3VzSGFuZGxlcjogKCkgPT4gdm9pZDtcclxuXHRwcml2YXRlIGlzVHJlZVZpZXc6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHRwcml2YXRlIHRyZWVDb21wb25lbnRzOiBUYXNrVHJlZUl0ZW1Db21wb25lbnRbXSA9IFtdO1xyXG5cdHByaXZhdGUgYWxsVGFza3NNYXA6IE1hcDxzdHJpbmcsIFRhc2s+ID0gbmV3IE1hcCgpO1xyXG5cclxuXHJcblx0XHQvLyBQZXItdmlldyBvdmVycmlkZSBmcm9tIEJhc2VzXHJcblx0XHRwcml2YXRlIGNvbmZpZ092ZXJyaWRlOiBQYXJ0aWFsPEZvcmVjYXN0U3BlY2lmaWNDb25maWc+IHwgbnVsbCA9IG51bGw7XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cHJpdmF0ZSBwYXJlbnRFbDogSFRNTEVsZW1lbnQsXHJcblx0XHRwcml2YXRlIGFwcDogQXBwLFxyXG5cdFx0cHJpdmF0ZSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdHByaXZhdGUgcGFyYW1zOiB7XHJcblx0XHRcdG9uVGFza1NlbGVjdGVkPzogKHRhc2s6IFRhc2sgfCBudWxsKSA9PiB2b2lkO1xyXG5cdFx0XHRvblRhc2tDb21wbGV0ZWQ/OiAodGFzazogVGFzaykgPT4gdm9pZDtcclxuXHRcdFx0b25UYXNrVXBkYXRlPzogKFxyXG5cdFx0XHRcdG9yaWdpbmFsVGFzazogVGFzayxcclxuXHRcdFx0XHR1cGRhdGVkVGFzazogVGFza1xyXG5cdFx0XHQpID0+IFByb21pc2U8dm9pZD47XHJcblx0XHRcdG9uVGFza0NvbnRleHRNZW51PzogKGV2ZW50OiBNb3VzZUV2ZW50LCB0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdFx0fSA9IHt9XHJcblx0KSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBkYXRlc1xyXG5cdFx0dGhpcy5jdXJyZW50RGF0ZSA9IG5ldyBEYXRlKCk7XHJcblxyXG5cclxuXHRcdHRoaXMuY3VycmVudERhdGUuc2V0SG91cnMoMCwgMCwgMCwgMCk7XHJcblx0XHR0aGlzLnNlbGVjdGVkRGF0ZSA9IG5ldyBEYXRlKHRoaXMuY3VycmVudERhdGUpO1xyXG5cdH1cclxuXHJcblx0b25sb2FkKCkge1xyXG5cdFx0Ly8gQ3JlYXRlIG1haW4gY29udGFpbmVyXHJcblx0XHR0aGlzLmNvbnRhaW5lckVsID0gdGhpcy5wYXJlbnRFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZm9yZWNhc3QtY29udGFpbmVyXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDcmVhdGUgY29udGVudCBjb250YWluZXIgZm9yIGNvbHVtbnNcclxuXHRcdGNvbnN0IGNvbnRlbnRDb250YWluZXIgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmb3JlY2FzdC1jb250ZW50XCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBMZWZ0IGNvbHVtbjogY3JlYXRlIGNhbGVuZGFyIHNlY3Rpb24gYW5kIGR1ZSBzb29uIHN0YXRzXHJcblx0XHR0aGlzLmNyZWF0ZUxlZnRDb2x1bW4oY29udGVudENvbnRhaW5lcik7XHJcblxyXG5cdFx0Ly8gUmlnaHQgY29sdW1uOiBjcmVhdGUgdGFzayBzZWN0aW9ucyBieSBkYXRlXHJcblx0XHR0aGlzLmNyZWF0ZVJpZ2h0Q29sdW1uKGNvbnRlbnRDb250YWluZXIpO1xyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgdmlldyBtb2RlIGZyb20gc2F2ZWQgc3RhdGUgb3IgZ2xvYmFsIGRlZmF1bHRcclxuXHRcdHRoaXMuaW5pdGlhbGl6ZVZpZXdNb2RlKCk7XHJcblxyXG5cdFx0Ly8gU2V0IHVwIHdpbmRvdyBmb2N1cyBoYW5kbGVyXHJcblx0XHR0aGlzLndpbmRvd0ZvY3VzSGFuZGxlciA9ICgpID0+IHtcclxuXHRcdFx0Ly8gVXBkYXRlIGN1cnJlbnQgZGF0ZSB3aGVuIHdpbmRvdyByZWdhaW5zIGZvY3VzXHJcblx0XHRcdGNvbnN0IG5ld0N1cnJlbnREYXRlID0gbmV3IERhdGUoKTtcclxuXHRcdFx0bmV3Q3VycmVudERhdGUuc2V0SG91cnMoMCwgMCwgMCwgMCk7XHJcblxyXG5cdFx0XHQvLyBTdG9yZSBwcmV2aW91cyBjdXJyZW50IGRhdGUgZm9yIGNvbXBhcmlzb25cclxuXHRcdFx0Y29uc3Qgb2xkQ3VycmVudERhdGUgPSBuZXcgRGF0ZSh0aGlzLmN1cnJlbnREYXRlKTtcclxuXHRcdFx0b2xkQ3VycmVudERhdGUuc2V0SG91cnMoMCwgMCwgMCwgMCk7XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgY3VycmVudCBkYXRlXHJcblx0XHRcdHRoaXMuY3VycmVudERhdGUgPSBuZXdDdXJyZW50RGF0ZTtcclxuXHJcblx0XHRcdC8vIFVwZGF0ZSB0aGUgY2FsZW5kYXIncyBjdXJyZW50IGRhdGVcclxuXHRcdFx0dGhpcy5jYWxlbmRhckNvbXBvbmVudC5zZXRDdXJyZW50RGF0ZSh0aGlzLmN1cnJlbnREYXRlKTtcclxuXHJcblx0XHRcdC8vIE9ubHkgdXBkYXRlIHNlbGVjdGVkIGRhdGUgaWYgaXQncyBvbGRlciB0aGFuIHRoZSBuZXcgY3VycmVudCBkYXRlXHJcblx0XHRcdC8vIGFuZCB0aGUgc2VsZWN0ZWQgZGF0ZSB3YXMgcHJldmlvdXNseSBvbiB0aGUgY3VycmVudCBkYXRlXHJcblx0XHRcdGNvbnN0IHNlbGVjdGVkRGF0ZVRpbWVzdGFtcCA9IG5ldyBEYXRlKHRoaXMuc2VsZWN0ZWREYXRlKS5zZXRIb3VycyhcclxuXHRcdFx0XHQwLFxyXG5cdFx0XHRcdDAsXHJcblx0XHRcdFx0MCxcclxuXHRcdFx0XHQwXHJcblx0XHRcdCk7XHJcblx0XHRcdGNvbnN0IG9sZEN1cnJlbnRUaW1lc3RhbXAgPSBvbGRDdXJyZW50RGF0ZS5nZXRUaW1lKCk7XHJcblx0XHRcdGNvbnN0IG5ld0N1cnJlbnRUaW1lc3RhbXAgPSBuZXdDdXJyZW50RGF0ZS5nZXRUaW1lKCk7XHJcblxyXG5cdFx0XHQvLyBDaGVjayBpZiBzZWxlY3RlZERhdGUgZXF1YWxzIG9sZEN1cnJlbnREYXRlICh3YXMgb24gXCJ0b2RheVwiKVxyXG5cdFx0XHQvLyBhbmQgaWYgdGhlIG5ldyBjdXJyZW50IGRhdGUgaXMgYWZ0ZXIgdGhlIHNlbGVjdGVkIGRhdGVcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHNlbGVjdGVkRGF0ZVRpbWVzdGFtcCA9PT0gb2xkQ3VycmVudFRpbWVzdGFtcCAmJlxyXG5cdFx0XHRcdHNlbGVjdGVkRGF0ZVRpbWVzdGFtcCA8IG5ld0N1cnJlbnRUaW1lc3RhbXBcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0Ly8gVXBkYXRlIHNlbGVjdGVkIGRhdGUgdG8gdGhlIG5ldyBjdXJyZW50IGRhdGVcclxuXHRcdFx0XHR0aGlzLnNlbGVjdGVkRGF0ZSA9IG5ldyBEYXRlKG5ld0N1cnJlbnREYXRlKTtcclxuXHRcdFx0XHQvLyBVcGRhdGUgdGhlIGNhbGVuZGFyJ3Mgc2VsZWN0ZWQgZGF0ZVxyXG5cdFx0XHRcdHRoaXMuY2FsZW5kYXJDb21wb25lbnQuc2VsZWN0RGF0ZSh0aGlzLnNlbGVjdGVkRGF0ZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gSWYgdGhlIGRhdGUgaGFzbid0IGNoYW5nZWQgKHN0aWxsIHRoZSBzYW1lIGRheSksIGRvbid0IHJlZnJlc2hcclxuXHRcdFx0aWYgKG9sZEN1cnJlbnRUaW1lc3RhbXAgPT09IG5ld0N1cnJlbnRUaW1lc3RhbXApIHtcclxuXHRcdFx0XHQvLyBTa2lwIHJlZnJlc2hpbmcgaWYgaXQncyBzdGlsbCB0aGUgc2FtZSBkYXlcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gVXBkYXRlIHRhc2tzIGNhdGVnb3JpemF0aW9uIGFuZCBVSVxyXG5cdFx0XHR0aGlzLmNhdGVnb3JpemVUYXNrcygpO1xyXG5cdFx0XHR0aGlzLnVwZGF0ZVRhc2tTdGF0cygpO1xyXG5cdFx0XHR0aGlzLnVwZGF0ZUR1ZVNvb25TZWN0aW9uKCk7XHJcblx0XHRcdHRoaXMucmVmcmVzaERhdGVTZWN0aW9uc1VJKCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIFJlZ2lzdGVyIHRoZSB3aW5kb3cgZm9jdXMgZXZlbnRcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudCh3aW5kb3csIFwiZm9jdXNcIiwgdGhpcy53aW5kb3dGb2N1c0hhbmRsZXIpO1xyXG5cdH1cclxuXHJcblx0XHRwdWJsaWMgc2V0Q29uZmlnT3ZlcnJpZGUob3ZlcnJpZGU6IFBhcnRpYWw8Rm9yZWNhc3RTcGVjaWZpY0NvbmZpZz4gfCBudWxsKTogdm9pZCB7XHJcblx0XHRcdHRoaXMuY29uZmlnT3ZlcnJpZGUgPSBvdmVycmlkZSA/PyBudWxsO1xyXG5cdFx0XHR0aGlzLnJlYnVpbGRDYWxlbmRhcldpdGhFZmZlY3RpdmVPcHRpb25zKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cHJpdmF0ZSBnZXRFZmZlY3RpdmVGb3JlY2FzdENvbmZpZygpOiBQYXJ0aWFsPEZvcmVjYXN0U3BlY2lmaWNDb25maWc+IHtcclxuXHRcdFx0Y29uc3QgYmFzZUNmZyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnZpZXdDb25maWd1cmF0aW9uLmZpbmQoKHYpID0+IHYuaWQgPT09IFwiZm9yZWNhc3RcIik/LnNwZWNpZmljQ29uZmlnIGFzIEZvcmVjYXN0U3BlY2lmaWNDb25maWcgfCB1bmRlZmluZWQ7XHJcblx0XHRcdHJldHVybiB7IC4uLihiYXNlQ2ZnID8/IHt9KSwgLi4uKHRoaXMuY29uZmlnT3ZlcnJpZGUgPz8ge30pIH07XHJcblx0XHR9XHJcblxyXG5cdFx0cHJpdmF0ZSByZWJ1aWxkQ2FsZW5kYXJXaXRoRWZmZWN0aXZlT3B0aW9ucygpOiB2b2lkIHtcclxuXHRcdFx0aWYgKCF0aGlzLmNhbGVuZGFyQ29udGFpbmVyRWwpIHJldHVybjtcclxuXHRcdFx0Ly8gUmVtb3ZlIG9sZCBjYWxlbmRhciBjb21wb25lbnQgaWYgZXhpc3RzXHJcblx0XHRcdGlmICh0aGlzLmNhbGVuZGFyQ29tcG9uZW50KSB7XHJcblx0XHRcdFx0dGhpcy5yZW1vdmVDaGlsZCh0aGlzLmNhbGVuZGFyQ29tcG9uZW50KTtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGlzLmNhbGVuZGFyQ29udGFpbmVyRWwuZW1wdHkoKTtcclxuXHRcdFx0Y29uc3QgZWZmID0gdGhpcy5nZXRFZmZlY3RpdmVGb3JlY2FzdENvbmZpZygpO1xyXG5cdFx0XHRjb25zdCBjYWxlbmRhck9wdGlvbnM6IFBhcnRpYWw8Q2FsZW5kYXJPcHRpb25zPiA9IHtcclxuXHRcdFx0XHRmaXJzdERheU9mV2VlazogZWZmLmZpcnN0RGF5T2ZXZWVrID8/IDAsXHJcblx0XHRcdFx0c2hvd1dlZWtlbmRzOiAhKGVmZi5oaWRlV2Vla2VuZHMgPz8gZmFsc2UpLFxyXG5cdFx0XHRcdHNob3dUYXNrQ291bnRzOiB0cnVlLFxyXG5cdFx0XHR9O1xyXG5cdFx0XHR0aGlzLmNhbGVuZGFyQ29tcG9uZW50ID0gbmV3IENhbGVuZGFyQ29tcG9uZW50KHRoaXMuY2FsZW5kYXJDb250YWluZXJFbCwgY2FsZW5kYXJPcHRpb25zKTtcclxuXHRcdFx0dGhpcy5hZGRDaGlsZCh0aGlzLmNhbGVuZGFyQ29tcG9uZW50KTtcclxuXHRcdFx0dGhpcy5jYWxlbmRhckNvbXBvbmVudC5sb2FkKCk7XHJcblx0XHRcdC8vIFJlc3RvcmUgc3RhdGUgYW5kIHRhc2tzXHJcblx0XHRcdHRoaXMuY2FsZW5kYXJDb21wb25lbnQuc2V0Q3VycmVudERhdGUodGhpcy5jdXJyZW50RGF0ZSk7XHJcblx0XHRcdHRoaXMuY2FsZW5kYXJDb21wb25lbnQuc2VsZWN0RGF0ZSh0aGlzLnNlbGVjdGVkRGF0ZSk7XHJcblx0XHRcdHRoaXMuY2FsZW5kYXJDb21wb25lbnQuc2V0VGFza3ModGhpcy5hbGxUYXNrcyk7XHJcblx0XHRcdC8vIFJlYmluZCBzZWxlY3Rpb24gaGFuZGxlclxyXG5cdFx0XHR0aGlzLmNhbGVuZGFyQ29tcG9uZW50Lm9uRGF0ZVNlbGVjdGVkID0gKGRhdGUsIHRhc2tzKSA9PiB7XHJcblx0XHRcdFx0Y29uc3Qgc2VsZWN0ZWREYXRlID0gbmV3IERhdGUoZGF0ZSk7XHJcblx0XHRcdFx0c2VsZWN0ZWREYXRlLnNldEhvdXJzKDAsIDAsIDAsIDApO1xyXG5cdFx0XHRcdHRoaXMuc2VsZWN0ZWREYXRlID0gc2VsZWN0ZWREYXRlO1xyXG5cdFx0XHRcdHRoaXMudXBkYXRlRHVlU29vblNlY3Rpb24oKTtcclxuXHRcdFx0XHR0aGlzLnJlZnJlc2hEYXRlU2VjdGlvbnNVSSgpO1xyXG5cdFx0XHRcdGlmIChQbGF0Zm9ybS5pc1Bob25lKSB7XHJcblx0XHRcdFx0XHR0aGlzLnRvZ2dsZUxlZnRDb2x1bW5WaXNpYmlsaXR5KGZhbHNlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblx0XHR9XHJcblxyXG5cclxuXHRwcml2YXRlIGNyZWF0ZUZvcmVjYXN0SGVhZGVyKCkge1xyXG5cdFx0dGhpcy5mb3JlY2FzdEhlYWRlckVsID0gdGhpcy50YXNrQ29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZvcmVjYXN0LWhlYWRlclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0aWYgKFBsYXRmb3JtLmlzUGhvbmUpIHtcclxuXHRcdFx0dGhpcy5mb3JlY2FzdEhlYWRlckVsLmNyZWF0ZUVsKFxyXG5cdFx0XHRcdFwiZGl2XCIsXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0Y2xzOiBcImZvcmVjYXN0LXNpZGViYXItdG9nZ2xlXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHQoZWwpID0+IHtcclxuXHRcdFx0XHRcdG5ldyBFeHRyYUJ1dHRvbkNvbXBvbmVudChlbClcclxuXHRcdFx0XHRcdFx0LnNldEljb24oXCJzaWRlYmFyXCIpXHJcblx0XHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnRvZ2dsZUxlZnRDb2x1bW5WaXNpYmlsaXR5KCk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBUaXRsZSBhbmQgdGFzayBjb3VudFxyXG5cdFx0Y29uc3QgdGl0bGVDb250YWluZXIgPSB0aGlzLmZvcmVjYXN0SGVhZGVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZvcmVjYXN0LXRpdGxlLWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy50aXRsZUVsID0gdGl0bGVDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZvcmVjYXN0LXRpdGxlXCIsXHJcblx0XHRcdHRleHQ6IHQoXCJGb3JlY2FzdFwiKSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IGNvdW50RWwgPSB0aXRsZUNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZm9yZWNhc3QtY291bnRcIixcclxuXHRcdH0pO1xyXG5cdFx0Y291bnRFbC5zZXRUZXh0KHQoXCIwIHRhc2tzLCAwIHByb2plY3RzXCIpKTtcclxuXHJcblx0XHQvLyBWaWV3IHRvZ2dsZSBhbmQgc2V0dGluZ3NcclxuXHRcdGNvbnN0IGFjdGlvbnNDb250YWluZXIgPSB0aGlzLmZvcmVjYXN0SGVhZGVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZvcmVjYXN0LWFjdGlvbnNcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIExpc3QvVHJlZSB0b2dnbGUgYnV0dG9uXHJcblx0XHRjb25zdCB2aWV3VG9nZ2xlQnRuID0gYWN0aW9uc0NvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwidmlldy10b2dnbGUtYnRuXCIsXHJcblx0XHR9KTtcclxuXHRcdHNldEljb24odmlld1RvZ2dsZUJ0biwgXCJsaXN0XCIpO1xyXG5cdFx0dmlld1RvZ2dsZUJ0bi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIHQoXCJUb2dnbGUgbGlzdC90cmVlIHZpZXdcIikpO1xyXG5cclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudCh2aWV3VG9nZ2xlQnRuLCBcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0dGhpcy50b2dnbGVWaWV3TW9kZSgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gLy8gU2V0dGluZ3MgYnV0dG9uXHJcblx0XHQvLyB0aGlzLnNldHRpbmdzRWwgPSBhY3Rpb25zQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHQvLyBcdGNsczogXCJmb3JlY2FzdC1zZXR0aW5nc1wiLFxyXG5cdFx0Ly8gfSk7XHJcblx0XHQvLyBzZXRJY29uKHRoaXMuc2V0dGluZ3NFbCwgXCJzZXR0aW5nc1wiKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEluaXRpYWxpemUgdmlldyBtb2RlIGZyb20gc2F2ZWQgc3RhdGUgb3IgZ2xvYmFsIGRlZmF1bHRcclxuXHQgKi9cclxuXHRwcml2YXRlIGluaXRpYWxpemVWaWV3TW9kZSgpIHtcclxuXHRcdHRoaXMuaXNUcmVlVmlldyA9IGdldEluaXRpYWxWaWV3TW9kZSh0aGlzLmFwcCwgdGhpcy5wbHVnaW4sIFwiZm9yZWNhc3RcIik7XHJcblx0XHQvLyBVcGRhdGUgdGhlIHRvZ2dsZSBidXR0b24gaWNvbiB0byBtYXRjaCB0aGUgaW5pdGlhbCBzdGF0ZVxyXG5cdFx0Y29uc3Qgdmlld1RvZ2dsZUJ0biA9IHRoaXMuZm9yZWNhc3RIZWFkZXJFbD8ucXVlcnlTZWxlY3RvcihcclxuXHRcdFx0XCIudmlldy10b2dnbGUtYnRuXCJcclxuXHRcdCkgYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRpZiAodmlld1RvZ2dsZUJ0bikge1xyXG5cdFx0XHRzZXRJY29uKHZpZXdUb2dnbGVCdG4sIHRoaXMuaXNUcmVlVmlldyA/IFwiZ2l0LWJyYW5jaFwiIDogXCJsaXN0XCIpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSB0b2dnbGVWaWV3TW9kZSgpIHtcclxuXHRcdHRoaXMuaXNUcmVlVmlldyA9ICF0aGlzLmlzVHJlZVZpZXc7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHRvZ2dsZSBidXR0b24gaWNvblxyXG5cdFx0Y29uc3Qgdmlld1RvZ2dsZUJ0biA9IHRoaXMuZm9yZWNhc3RIZWFkZXJFbC5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRcIi52aWV3LXRvZ2dsZS1idG5cIlxyXG5cdFx0KSBhcyBIVE1MRWxlbWVudDtcclxuXHRcdGlmICh2aWV3VG9nZ2xlQnRuKSB7XHJcblx0XHRcdHNldEljb24odmlld1RvZ2dsZUJ0biwgdGhpcy5pc1RyZWVWaWV3ID8gXCJnaXQtYnJhbmNoXCIgOiBcImxpc3RcIik7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU2F2ZSB0aGUgbmV3IHZpZXcgbW9kZSBzdGF0ZVxyXG5cdFx0c2F2ZVZpZXdNb2RlKHRoaXMuYXBwLCBcImZvcmVjYXN0XCIsIHRoaXMuaXNUcmVlVmlldyk7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHNlY3Rpb25zIGRpc3BsYXlcclxuXHRcdHRoaXMucmVmcmVzaERhdGVTZWN0aW9uc1VJKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNyZWF0ZUZvY3VzQmFyKCkge1xyXG5cdFx0dGhpcy5mb2N1c0JhckVsID0gdGhpcy50YXNrQ29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZvcmVjYXN0LWZvY3VzLWJhclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgZm9jdXNJbnB1dCA9IHRoaXMuZm9jdXNCYXJFbC5jcmVhdGVFbChcImlucHV0XCIsIHtcclxuXHRcdFx0Y2xzOiBcImZvY3VzLWlucHV0XCIsXHJcblx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHR0eXBlOiBcInRleHRcIixcclxuXHRcdFx0XHRwbGFjZWhvbGRlcjogdChcIkZvY3VzaW5nIG9uIFdvcmtcIiksXHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCB1bmZvY3VzQnRuID0gdGhpcy5mb2N1c0JhckVsLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0Y2xzOiBcInVuZm9jdXMtYnV0dG9uXCIsXHJcblx0XHRcdHRleHQ6IHQoXCJVbmZvY3VzXCIpLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KHVuZm9jdXNCdG4sIFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRmb2N1c0lucHV0LnZhbHVlID0gXCJcIjtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVMZWZ0Q29sdW1uKHBhcmVudEVsOiBIVE1MRWxlbWVudCkge1xyXG5cdFx0dGhpcy5sZWZ0Q29sdW1uRWwgPSBwYXJlbnRFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZm9yZWNhc3QtbGVmdC1jb2x1bW5cIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdGlmIChQbGF0Zm9ybS5pc1Bob25lKSB7XHJcblx0XHRcdC8vIEFkZCBjbG9zZSBidXR0b24gZm9yIG1vYmlsZSBzaWRlYmFyXHJcblx0XHRcdGNvbnN0IGNsb3NlQnRuID0gdGhpcy5sZWZ0Q29sdW1uRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwiZm9yZWNhc3Qtc2lkZWJhci1jbG9zZVwiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdG5ldyBFeHRyYUJ1dHRvbkNvbXBvbmVudChjbG9zZUJ0bikuc2V0SWNvbihcInhcIikub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy50b2dnbGVMZWZ0Q29sdW1uVmlzaWJpbGl0eShmYWxzZSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFN0YXRzIGJhciBmb3IgUGFzdCBEdWUgLyBUb2RheSAvIEZ1dHVyZSBjb3VudHNcclxuXHRcdHRoaXMuY3JlYXRlU3RhdHNCYXIodGhpcy5sZWZ0Q29sdW1uRWwpO1xyXG5cclxuXHRcdC8vIENhbGVuZGFyIHNlY3Rpb25cclxuXHRcdHRoaXMuY2FsZW5kYXJDb250YWluZXJFbCA9IHRoaXMubGVmdENvbHVtbkVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmb3JlY2FzdC1jYWxlbmRhci1zZWN0aW9uXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDcmVhdGUgYW5kIGluaXRpYWxpemUgY2FsZW5kYXIgY29tcG9uZW50IHVzaW5nIGVmZmVjdGl2ZSBjb25maWcgKEJhc2VzIG92ZXJyaWRlICsgc2V0dGluZ3MpXHJcblx0XHRjb25zdCBlZmYgPSB0aGlzLmdldEVmZmVjdGl2ZUZvcmVjYXN0Q29uZmlnKCk7XHJcblx0XHRjb25zdCBjYWxlbmRhck9wdGlvbnM6IFBhcnRpYWw8Q2FsZW5kYXJPcHRpb25zPiA9IHtcclxuXHRcdFx0Zmlyc3REYXlPZldlZWs6IGVmZi5maXJzdERheU9mV2VlayA/PyAwLFxyXG5cdFx0XHRzaG93V2Vla2VuZHM6ICEoZWZmLmhpZGVXZWVrZW5kcyA/PyBmYWxzZSksIC8vIEludmVydCBoaWRlV2Vla2VuZHMgdG8gc2hvd1dlZWtlbmRzXHJcblx0XHRcdHNob3dUYXNrQ291bnRzOiB0cnVlLFxyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmNhbGVuZGFyQ29tcG9uZW50ID0gbmV3IENhbGVuZGFyQ29tcG9uZW50KHRoaXMuY2FsZW5kYXJDb250YWluZXJFbCwgY2FsZW5kYXJPcHRpb25zKTtcclxuXHRcdHRoaXMuYWRkQ2hpbGQodGhpcy5jYWxlbmRhckNvbXBvbmVudCk7XHJcblx0XHR0aGlzLmNhbGVuZGFyQ29tcG9uZW50LmxvYWQoKTtcclxuXHJcblx0XHQvLyBEdWUgU29vbiBzZWN0aW9uIGJlbG93IGNhbGVuZGFyXHJcblx0XHR0aGlzLmNyZWF0ZUR1ZVNvb25TZWN0aW9uKHRoaXMubGVmdENvbHVtbkVsKTtcclxuXHJcblx0XHQvLyBTZXQgdXAgY2FsZW5kYXIgZXZlbnRzXHJcblx0XHR0aGlzLmNhbGVuZGFyQ29tcG9uZW50Lm9uRGF0ZVNlbGVjdGVkID0gKGRhdGUsIHRhc2tzKSA9PiB7XHJcblx0XHRcdGNvbnN0IHNlbGVjdGVkRGF0ZSA9IG5ldyBEYXRlKGRhdGUpO1xyXG5cdFx0XHRzZWxlY3RlZERhdGUuc2V0SG91cnMoMCwgMCwgMCwgMCk7XHJcblx0XHRcdHRoaXMuc2VsZWN0ZWREYXRlID0gc2VsZWN0ZWREYXRlO1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIHRoZSBDb21pbmcgVXAgc2VjdGlvbiBmaXJzdFxyXG5cdFx0XHR0aGlzLnVwZGF0ZUR1ZVNvb25TZWN0aW9uKCk7XHJcblx0XHRcdC8vIFRoZW4gcmVmcmVzaCB0aGUgZGF0ZSBzZWN0aW9ucyBpbiB0aGUgcmlnaHQgcGFuZWxcclxuXHRcdFx0dGhpcy5yZWZyZXNoRGF0ZVNlY3Rpb25zVUkoKTtcclxuXHJcblx0XHRcdGlmIChQbGF0Zm9ybS5pc1Bob25lKSB7XHJcblx0XHRcdFx0dGhpcy50b2dnbGVMZWZ0Q29sdW1uVmlzaWJpbGl0eShmYWxzZSk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNyZWF0ZVN0YXRzQmFyKHBhcmVudEVsOiBIVE1MRWxlbWVudCkge1xyXG5cdFx0dGhpcy5zdGF0c0NvbnRhaW5lckVsID0gcGFyZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZvcmVjYXN0LXN0YXRzXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDcmVhdGUgc3RhdCBpdGVtc1xyXG5cdFx0Y29uc3QgY3JlYXRlU3RhdEl0ZW0gPSAoXHJcblx0XHRcdGlkOiBzdHJpbmcsXHJcblx0XHRcdGxhYmVsOiBzdHJpbmcsXHJcblx0XHRcdGNvdW50OiBudW1iZXIsXHJcblx0XHRcdHR5cGU6IHN0cmluZ1xyXG5cdFx0KSA9PiB7XHJcblx0XHRcdGNvbnN0IHN0YXRJdGVtID0gdGhpcy5zdGF0c0NvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBgc3RhdC1pdGVtIHRnLSR7aWR9YCxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCBjb3VudEVsID0gc3RhdEl0ZW0uY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwic3RhdC1jb3VudFwiLFxyXG5cdFx0XHRcdHRleHQ6IGNvdW50LnRvU3RyaW5nKCksXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgbGFiZWxFbCA9IHN0YXRJdGVtLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcInN0YXQtbGFiZWxcIixcclxuXHRcdFx0XHR0ZXh0OiBsYWJlbCxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBSZWdpc3RlciBjbGljayBoYW5kbGVyXHJcblx0XHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChzdGF0SXRlbSwgXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5mb2N1c1Rhc2tMaXN0KHR5cGUpO1xyXG5cclxuXHRcdFx0XHRpZiAoUGxhdGZvcm0uaXNQaG9uZSkge1xyXG5cdFx0XHRcdFx0dGhpcy50b2dnbGVMZWZ0Q29sdW1uVmlzaWJpbGl0eShmYWxzZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHJldHVybiBzdGF0SXRlbTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIHN0YXRzIGZvciBwYXN0IGR1ZSwgdG9kYXksIGFuZCBmdXR1cmVcclxuXHRcdGNyZWF0ZVN0YXRJdGVtKFwicGFzdC1kdWVcIiwgdChcIlBhc3QgRHVlXCIpLCAwLCBcInBhc3QtZHVlXCIpO1xyXG5cdFx0Y3JlYXRlU3RhdEl0ZW0oXCJ0b2RheVwiLCB0KFwiVG9kYXlcIiksIDAsIFwidG9kYXlcIik7XHJcblx0XHRjcmVhdGVTdGF0SXRlbShcImZ1dHVyZVwiLCB0KFwiRnV0dXJlXCIpLCAwLCBcImZ1dHVyZVwiKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY3JlYXRlRHVlU29vblNlY3Rpb24ocGFyZW50RWw6IEhUTUxFbGVtZW50KSB7XHJcblx0XHR0aGlzLmR1ZVNvb25Db250YWluZXJFbCA9IHBhcmVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmb3JlY2FzdC1kdWUtc29vbi1zZWN0aW9uXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBEdWUgc29vbiBlbnRyaWVzIHdpbGwgYmUgYWRkZWQgd2hlbiB0YXNrcyBhcmUgc2V0XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNyZWF0ZVJpZ2h0Q29sdW1uKHBhcmVudEVsOiBIVE1MRWxlbWVudCkge1xyXG5cdFx0dGhpcy50YXNrQ29udGFpbmVyRWwgPSBwYXJlbnRFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZm9yZWNhc3QtcmlnaHQtY29sdW1uXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDcmVhdGUgaGVhZGVyIHdpdGggcHJvamVjdCBjb3VudCBhbmQgYWN0aW9uc1xyXG5cdFx0dGhpcy5jcmVhdGVGb3JlY2FzdEhlYWRlcigpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBmb2N1cyBmaWx0ZXIgYmFyXHJcblx0XHQvLyB0aGlzLmNyZWF0ZUZvY3VzQmFyKCk7XHJcblxyXG5cdFx0dGhpcy50YXNrTGlzdENvbnRhaW5lckVsID0gdGhpcy50YXNrQ29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZvcmVjYXN0LXRhc2stbGlzdFwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gRGF0ZSBzZWN0aW9ucyB3aWxsIGJlIGFkZGVkIHdoZW4gdGFza3MgYXJlIHNldFxyXG5cdH1cclxuXHJcblx0cHVibGljIHNldFRhc2tzKHRhc2tzOiBUYXNrW10pIHtcclxuXHRcdHRoaXMuYWxsVGFza3MgPSB0YXNrcztcclxuXHRcdHRoaXMuYWxsVGFza3NNYXAgPSBuZXcgTWFwKFxyXG5cdFx0XHR0aGlzLmFsbFRhc2tzLm1hcCgodGFzaykgPT4gW3Rhc2suaWQsIHRhc2tdKVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBVcGRhdGUgaGVhZGVyIGNvdW50XHJcblx0XHR0aGlzLnVwZGF0ZUhlYWRlckNvdW50KCk7XHJcblxyXG5cdFx0Ly8gRmlsdGVyIGFuZCBjYXRlZ29yaXplIHRhc2tzXHJcblx0XHR0aGlzLmNhdGVnb3JpemVUYXNrcygpO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSBjYWxlbmRhciB3aXRoIGFsbCB0YXNrc1xyXG5cdFx0dGhpcy5jYWxlbmRhckNvbXBvbmVudC5zZXRUYXNrcyh0aGlzLmFsbFRhc2tzKTtcclxuXHJcblx0XHQvLyBVcGRhdGUgc3RhdHNcclxuXHRcdHRoaXMudXBkYXRlVGFza1N0YXRzKCk7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIGR1ZSBzb29uIHNlY3Rpb25cclxuXHRcdHRoaXMudXBkYXRlRHVlU29vblNlY3Rpb24oKTtcclxuXHJcblx0XHQvLyBDYWxjdWxhdGUgYW5kIHJlbmRlciBkYXRlIHNlY3Rpb25zIGZvciB0aGUgcmlnaHQgY29sdW1uXHJcblx0XHR0aGlzLmNhbGN1bGF0ZURhdGVTZWN0aW9ucygpO1xyXG5cdFx0dGhpcy5yZW5kZXJEYXRlU2VjdGlvbnNVSSgpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSB1cGRhdGVIZWFkZXJDb3VudCgpIHtcclxuXHRcdC8vIENvdW50IGFjdGlvbnMgKHRhc2tzKSBhbmQgdW5pcXVlIHByb2plY3RzXHJcblx0XHRjb25zdCBwcm9qZWN0U2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcblx0XHR0aGlzLmFsbFRhc2tzLmZvckVhY2goKHRhc2spID0+IHtcclxuXHRcdFx0aWYgKHRhc2subWV0YWRhdGEucHJvamVjdCkge1xyXG5cdFx0XHRcdHByb2plY3RTZXQuYWRkKHRhc2subWV0YWRhdGEucHJvamVjdCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IHRhc2tDb3VudCA9IHRoaXMuYWxsVGFza3MubGVuZ3RoO1xyXG5cdFx0Y29uc3QgcHJvamVjdENvdW50ID0gcHJvamVjdFNldC5zaXplO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSBoZWFkZXJcclxuXHRcdGNvbnN0IGNvdW50RWwgPSB0aGlzLmZvcmVjYXN0SGVhZGVyRWwucXVlcnlTZWxlY3RvcihcIi5mb3JlY2FzdC1jb3VudFwiKTtcclxuXHRcdGlmIChjb3VudEVsKSB7XHJcblx0XHRcdGNvdW50RWwudGV4dENvbnRlbnQgPSBgJHt0YXNrQ291bnR9ICR7dChcclxuXHRcdFx0XHRcInRhc2tzXCJcclxuXHRcdFx0KX0sICR7cHJvamVjdENvdW50fSAke3QoXCJwcm9qZWN0XCIpfSR7XHJcblx0XHRcdFx0cHJvamVjdENvdW50ICE9PSAxID8gXCJzXCIgOiBcIlwiXHJcblx0XHRcdH1gO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjYXRlZ29yaXplVGFza3MoKSB7XHJcblx0XHQvLyBVc2UgY3VycmVudERhdGUgYXMgdG9kYXlcclxuXHRcdGNvbnN0IHRvZGF5ID0gbmV3IERhdGUodGhpcy5jdXJyZW50RGF0ZSk7XHJcblx0XHR0b2RheS5zZXRIb3VycygwLCAwLCAwLCAwKTtcclxuXHRcdGNvbnN0IHRvZGF5VGltZXN0YW1wID0gdG9kYXkuZ2V0VGltZSgpO1xyXG5cclxuXHRcdGNvbnN0IHNvcnRDcml0ZXJpYSA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnZpZXdDb25maWd1cmF0aW9uLmZpbmQoXHJcblx0XHRcdCh2aWV3KSA9PiB2aWV3LmlkID09PSBcImZvcmVjYXN0XCJcclxuXHRcdCk/LnNvcnRDcml0ZXJpYTtcclxuXHJcblx0XHQvLyBGaWx0ZXIgZm9yIGluY29tcGxldGUgdGFza3Mgd2l0aCBhIHJlbGV2YW50IGRhdGVcclxuXHRcdGNvbnN0IHRhc2tzV2l0aFJlbGV2YW50RGF0ZSA9IHRoaXMuYWxsVGFza3MuZmlsdGVyKFxyXG5cdFx0XHQodGFzaykgPT4gdGhpcy5nZXRSZWxldmFudERhdGUodGFzaykgIT09IHVuZGVmaW5lZFxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBTcGxpdCBpbnRvIHBhc3QsIHRvZGF5LCBhbmQgZnV0dXJlIGJhc2VkIG9uIHJlbGV2YW50RGF0ZVxyXG5cdFx0dGhpcy5wYXN0VGFza3MgPSB0YXNrc1dpdGhSZWxldmFudERhdGUuZmlsdGVyKCh0YXNrKSA9PiB7XHJcblx0XHRcdGNvbnN0IHJlbGV2YW50VGltZXN0YW1wID0gdGhpcy5nZXRSZWxldmFudERhdGUodGFzaykhO1xyXG5cdFx0XHRyZXR1cm4gcmVsZXZhbnRUaW1lc3RhbXAgPCB0b2RheVRpbWVzdGFtcDtcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy50b2RheVRhc2tzID0gdGFza3NXaXRoUmVsZXZhbnREYXRlLmZpbHRlcigodGFzaykgPT4ge1xyXG5cdFx0XHRjb25zdCByZWxldmFudFRpbWVzdGFtcCA9IHRoaXMuZ2V0UmVsZXZhbnREYXRlKHRhc2spITtcclxuXHRcdFx0cmV0dXJuIHJlbGV2YW50VGltZXN0YW1wID09PSB0b2RheVRpbWVzdGFtcDtcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy5mdXR1cmVUYXNrcyA9IHRhc2tzV2l0aFJlbGV2YW50RGF0ZS5maWx0ZXIoKHRhc2spID0+IHtcclxuXHRcdFx0Y29uc3QgcmVsZXZhbnRUaW1lc3RhbXAgPSB0aGlzLmdldFJlbGV2YW50RGF0ZSh0YXNrKSE7XHJcblx0XHRcdHJldHVybiByZWxldmFudFRpbWVzdGFtcCA+IHRvZGF5VGltZXN0YW1wO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gVXNlIHNvcnRUYXNrcyB0byBzb3J0IHRhc2tzXHJcblx0XHRpZiAoc29ydENyaXRlcmlhICYmIHNvcnRDcml0ZXJpYS5sZW5ndGggPiAwKSB7XHJcblx0XHRcdHRoaXMucGFzdFRhc2tzID0gc29ydFRhc2tzKFxyXG5cdFx0XHRcdHRoaXMucGFzdFRhc2tzLFxyXG5cdFx0XHRcdHNvcnRDcml0ZXJpYSxcclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5nc1xyXG5cdFx0XHQpO1xyXG5cdFx0XHR0aGlzLnRvZGF5VGFza3MgPSBzb3J0VGFza3MoXHJcblx0XHRcdFx0dGhpcy50b2RheVRhc2tzLFxyXG5cdFx0XHRcdHNvcnRDcml0ZXJpYSxcclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5nc1xyXG5cdFx0XHQpO1xyXG5cdFx0XHR0aGlzLmZ1dHVyZVRhc2tzID0gc29ydFRhc2tzKFxyXG5cdFx0XHRcdHRoaXMuZnV0dXJlVGFza3MsXHJcblx0XHRcdFx0c29ydENyaXRlcmlhLFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzXHJcblx0XHRcdCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyDlpoLmnpzmnKrlkK/nlKjmjpLluo/orr7nva7vvIzkvb/nlKjpu5jorqTnmoTkvJjlhYjnuqflkozml6XmnJ/mjpLluo9cclxuXHRcdFx0dGhpcy5wYXN0VGFza3MgPSB0aGlzLnNvcnRUYXNrc0J5UHJpb3JpdHlBbmRSZWxldmFudERhdGUoXHJcblx0XHRcdFx0dGhpcy5wYXN0VGFza3NcclxuXHRcdFx0KTtcclxuXHRcdFx0dGhpcy50b2RheVRhc2tzID0gdGhpcy5zb3J0VGFza3NCeVByaW9yaXR5QW5kUmVsZXZhbnREYXRlKFxyXG5cdFx0XHRcdHRoaXMudG9kYXlUYXNrc1xyXG5cdFx0XHQpO1xyXG5cdFx0XHR0aGlzLmZ1dHVyZVRhc2tzID0gdGhpcy5zb3J0VGFza3NCeVByaW9yaXR5QW5kUmVsZXZhbnREYXRlKFxyXG5cdFx0XHRcdHRoaXMuZnV0dXJlVGFza3NcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIOaMieS8mOWFiOe6p+WSjOebuOWFs+aXpeacn+aOkuW6j+S7u+WKoVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgc29ydFRhc2tzQnlQcmlvcml0eUFuZFJlbGV2YW50RGF0ZSh0YXNrczogVGFza1tdKTogVGFza1tdIHtcclxuXHRcdHJldHVybiB0YXNrcy5zb3J0KChhLCBiKSA9PiB7XHJcblx0XHRcdC8vIEZpcnN0IGJ5IHByaW9yaXR5IChoaWdoIHRvIGxvdylcclxuXHRcdFx0Y29uc3QgcHJpb3JpdHlBID0gYS5tZXRhZGF0YS5wcmlvcml0eSB8fCAwO1xyXG5cdFx0XHRjb25zdCBwcmlvcml0eUIgPSBiLm1ldGFkYXRhLnByaW9yaXR5IHx8IDA7XHJcblx0XHRcdGlmIChwcmlvcml0eUEgIT09IHByaW9yaXR5Qikge1xyXG5cdFx0XHRcdHJldHVybiBwcmlvcml0eUIgLSBwcmlvcml0eUE7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFRoZW4gYnkgcmVsZXZhbnQgZGF0ZSAoZWFybHkgdG8gbGF0ZSlcclxuXHRcdFx0Ly8gRW5zdXJlIGRhdGVzIGV4aXN0IGJlZm9yZSBjb21wYXJpc29uXHJcblx0XHRcdGNvbnN0IHJlbGV2YW50RGF0ZUEgPSB0aGlzLmdldFJlbGV2YW50RGF0ZShhKTtcclxuXHRcdFx0Y29uc3QgcmVsZXZhbnREYXRlQiA9IHRoaXMuZ2V0UmVsZXZhbnREYXRlKGIpO1xyXG5cclxuXHRcdFx0aWYgKHJlbGV2YW50RGF0ZUEgPT09IHVuZGVmaW5lZCAmJiByZWxldmFudERhdGVCID09PSB1bmRlZmluZWQpXHJcblx0XHRcdFx0cmV0dXJuIDA7XHJcblx0XHRcdGlmIChyZWxldmFudERhdGVBID09PSB1bmRlZmluZWQpIHJldHVybiAxOyAvLyBQbGFjZSB0YXNrcyB3aXRob3V0IGRhdGVzIGxhdGVyXHJcblx0XHRcdGlmIChyZWxldmFudERhdGVCID09PSB1bmRlZmluZWQpIHJldHVybiAtMTsgLy8gUGxhY2UgdGFza3Mgd2l0aG91dCBkYXRlcyBsYXRlclxyXG5cclxuXHRcdFx0cmV0dXJuIHJlbGV2YW50RGF0ZUEgLSByZWxldmFudERhdGVCO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHVwZGF0ZVRhc2tTdGF0cygpIHtcclxuXHRcdC8vIFVwZGF0ZSBjb3VudHMgaW4gc3RhdHMgYmFyXHJcblx0XHRjb25zdCBzdGF0SXRlbXMgPSB0aGlzLnN0YXRzQ29udGFpbmVyRWwucXVlcnlTZWxlY3RvckFsbChcIi5zdGF0LWl0ZW1cIik7XHJcblx0XHRzdGF0SXRlbXMuZm9yRWFjaCgoaXRlbSkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb3VudEVsID0gaXRlbS5xdWVyeVNlbGVjdG9yKFwiLnN0YXQtY291bnRcIik7XHJcblx0XHRcdGlmIChjb3VudEVsKSB7XHJcblx0XHRcdFx0Ly8gTm90ZTogTGFiZWxzIHJlbWFpbiBcIlBhc3QgRHVlXCIsIFwiVG9kYXlcIiwgXCJGdXR1cmVcIiBidXQgbm93IGluY2x1ZGUgc2NoZWR1bGVkIHRhc2tzLlxyXG5cdFx0XHRcdGlmIChpdGVtLmhhc0NsYXNzKFwidGctcGFzdC1kdWVcIikpIHtcclxuXHRcdFx0XHRcdGNvdW50RWwudGV4dENvbnRlbnQgPSB0aGlzLnBhc3RUYXNrcy5sZW5ndGgudG9TdHJpbmcoKTsgLy8gVXNlIHBhc3RUYXNrc1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAoaXRlbS5oYXNDbGFzcyhcInRnLXRvZGF5XCIpKSB7XHJcblx0XHRcdFx0XHRjb3VudEVsLnRleHRDb250ZW50ID0gdGhpcy50b2RheVRhc2tzLmxlbmd0aC50b1N0cmluZygpO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAoaXRlbS5oYXNDbGFzcyhcInRnLWZ1dHVyZVwiKSkge1xyXG5cdFx0XHRcdFx0Y291bnRFbC50ZXh0Q29udGVudCA9IHRoaXMuZnV0dXJlVGFza3MubGVuZ3RoLnRvU3RyaW5nKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgdXBkYXRlRHVlU29vblNlY3Rpb24oKSB7XHJcblx0XHQvLyBDbGVhciBleGlzdGluZyBjb250ZW50XHJcblx0XHR0aGlzLmR1ZVNvb25Db250YWluZXJFbC5lbXB0eSgpO1xyXG5cclxuXHRcdC8vIFVzZSB0aGUgY3VycmVudCBzZWxlY3RlZCBkYXRlIGFzIHRoZSBzdGFydGluZyBwb2ludFxyXG5cdFx0Ly8gQWx3YXlzIGNyZWF0ZSBhIG5ldyBkYXRlIG9iamVjdCB0byBhdm9pZCByZWZlcmVuY2UgaXNzdWVzXHJcblx0XHRjb25zdCBiYXNlRGF0ZSA9IG5ldyBEYXRlKHRoaXMuc2VsZWN0ZWREYXRlKTtcclxuXHRcdGJhc2VEYXRlLnNldEhvdXJzKDAsIDAsIDAsIDApO1xyXG5cclxuXHRcdGNvbnN0IGR1ZVNvb25JdGVtczogeyBkYXRlOiBEYXRlOyB0YXNrczogVGFza1tdIH1bXSA9IFtdO1xyXG5cclxuXHRcdC8vIFByb2Nlc3MgdGFza3Mgd2l0aCByZWxldmFudCBkYXRlcyBpbiB0aGUgbmV4dCAxNSBkYXlzIGZyb20gdGhlIHNlbGVjdGVkIGRhdGVcclxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgMTU7IGkrKykge1xyXG5cdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUoYmFzZURhdGUpO1xyXG5cdFx0XHRkYXRlLnNldERhdGUoZGF0ZS5nZXREYXRlKCkgKyBpKTtcclxuXHJcblx0XHRcdC8vIFNraXAgdGhlIHNlbGVjdGVkIGRheSBpdHNlbGYgLSBDb21pbmcgVXAgc2hvdWxkIHNob3cgZGF5cyAqYWZ0ZXIqIHRoZSBzZWxlY3RlZCBvbmVcclxuXHRcdFx0aWYgKGRhdGUuZ2V0VGltZSgpID09PSBiYXNlRGF0ZS5nZXRUaW1lKCkpIGNvbnRpbnVlO1xyXG5cclxuXHRcdFx0Ly8gVXNlIHRoZSBuZXcgZnVuY3Rpb24gY2hlY2tpbmcgcmVsZXZhbnREYXRlXHJcblx0XHRcdGNvbnN0IHRhc2tzRm9yRGF5ID0gdGhpcy5nZXRUYXNrc0ZvclJlbGV2YW50RGF0ZShkYXRlKTtcclxuXHRcdFx0aWYgKHRhc2tzRm9yRGF5Lmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRkdWVTb29uSXRlbXMucHVzaCh7XHJcblx0XHRcdFx0XHRkYXRlOiBkYXRlLFxyXG5cdFx0XHRcdFx0dGFza3M6IHRhc2tzRm9yRGF5LFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWRkIGEgaGVhZGVyXHJcblx0XHRjb25zdCBoZWFkZXJFbCA9IHRoaXMuZHVlU29vbkNvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJkdWUtc29vbi1oZWFkZXJcIixcclxuXHRcdH0pO1xyXG5cdFx0aGVhZGVyRWwuc2V0VGV4dCh0KFwiQ29taW5nIFVwXCIpKTsgLy8gVGl0bGUgcmVtYWlucyBcIkNvbWluZyBVcFwiXHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGVudHJpZXMgZm9yIHVwY29taW5nIHRhc2tzIGJhc2VkIG9uIHJlbGV2YW50IGRhdGVcclxuXHRcdGR1ZVNvb25JdGVtcy5mb3JFYWNoKChpdGVtKSA9PiB7XHJcblx0XHRcdGNvbnN0IGl0ZW1FbCA9IHRoaXMuZHVlU29vbkNvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcImR1ZS1zb29uLWl0ZW1cIixcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBGb3JtYXQgdGhlIGRhdGVcclxuXHRcdFx0Y29uc3QgZGF0ZVN0ciA9IHRoaXMuZm9ybWF0RGF0ZUZvckR1ZVNvb24oaXRlbS5kYXRlKTtcclxuXHJcblx0XHRcdC8vIEdldCBkYXkgb2Ygd2Vla1xyXG5cdFx0XHRjb25zdCBkYXlPZldlZWsgPSBbXCJTdW5cIiwgXCJNb25cIiwgXCJUdWVcIiwgXCJXZWRcIiwgXCJUaHVcIiwgXCJGcmlcIiwgXCJTYXRcIl1bXHJcblx0XHRcdFx0aXRlbS5kYXRlLmdldERheSgpXHJcblx0XHRcdF07XHJcblxyXG5cdFx0XHRjb25zdCBkYXRlRWwgPSBpdGVtRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwiZHVlLXNvb24tZGF0ZVwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0ZGF0ZUVsLnNldFRleHQoYCR7ZGF5T2ZXZWVrfSwgJHtkYXRlU3RyfWApO1xyXG5cclxuXHRcdFx0Y29uc3QgY291bnRFbCA9IGl0ZW1FbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJkdWUtc29vbi1jb3VudFwiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIFByb3Blcmx5IGZvcm1hdCB0aGUgdGFzayBjb3VudFxyXG5cdFx0XHRjb25zdCB0YXNrQ291bnQgPSBpdGVtLnRhc2tzLmxlbmd0aDtcclxuXHRcdFx0Y291bnRFbC5zZXRUZXh0KFxyXG5cdFx0XHRcdGAke3Rhc2tDb3VudH0gJHt0YXNrQ291bnQgPT09IDEgPyB0KFwiVGFza1wiKSA6IHQoXCJUYXNrc1wiKX1gXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBBZGQgY2xpY2sgaGFuZGxlciB0byBzZWxlY3QgdGhpcyBkYXRlIGluIHRoZSBjYWxlbmRhclxyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoaXRlbUVsLCBcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0XHR0aGlzLmNhbGVuZGFyQ29tcG9uZW50LnNlbGVjdERhdGUoaXRlbS5kYXRlKTtcclxuXHRcdFx0XHQvLyB0aGlzLnNlbGVjdGVkRGF0ZSA9IGl0ZW0uZGF0ZTsgLy8gVGhpcyBpcyBub3cgaGFuZGxlZCBieSBjYWxlbmRhckNvbXBvbmVudC5vbkRhdGVTZWxlY3RlZFxyXG5cdFx0XHRcdC8vIHRoaXMucmVmcmVzaERhdGVTZWN0aW9uc1VJKCk7IC8vIFRoaXMgaXMgbm93IGhhbmRsZWQgYnkgY2FsZW5kYXJDb21wb25lbnQub25EYXRlU2VsZWN0ZWRcclxuXHJcblx0XHRcdFx0aWYgKFBsYXRmb3JtLmlzUGhvbmUpIHtcclxuXHRcdFx0XHRcdHRoaXMudG9nZ2xlTGVmdENvbHVtblZpc2liaWxpdHkoZmFsc2UpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBBZGQgZW1wdHkgc3RhdGUgaWYgbmVlZGVkXHJcblx0XHRpZiAoZHVlU29vbkl0ZW1zLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRjb25zdCBlbXB0eUVsID0gdGhpcy5kdWVTb29uQ29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwiZHVlLXNvb24tZW1wdHlcIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdGVtcHR5RWwuc2V0VGV4dCh0KFwiTm8gdXBjb21pbmcgdGFza3NcIikpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBmb3JtYXREYXRlRm9yRHVlU29vbihkYXRlOiBEYXRlKTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IG1vbnRoTmFtZXMgPSBbXHJcblx0XHRcdFwiSmFuXCIsXHJcblx0XHRcdFwiRmViXCIsXHJcblx0XHRcdFwiTWFyXCIsXHJcblx0XHRcdFwiQXByXCIsXHJcblx0XHRcdFwiTWF5XCIsXHJcblx0XHRcdFwiSnVuXCIsXHJcblx0XHRcdFwiSnVsXCIsXHJcblx0XHRcdFwiQXVnXCIsXHJcblx0XHRcdFwiU2VwXCIsXHJcblx0XHRcdFwiT2N0XCIsXHJcblx0XHRcdFwiTm92XCIsXHJcblx0XHRcdFwiRGVjXCIsXHJcblx0XHRdO1xyXG5cdFx0cmV0dXJuIGAke21vbnRoTmFtZXNbZGF0ZS5nZXRNb250aCgpXX0gJHtkYXRlLmdldERhdGUoKX1gO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjYWxjdWxhdGVEYXRlU2VjdGlvbnMoKSB7XHJcblx0XHR0aGlzLmRhdGVTZWN0aW9ucyA9IFtdO1xyXG5cclxuXHRcdC8vIFRvZGF5IHNlY3Rpb25cclxuXHRcdGlmICh0aGlzLnRvZGF5VGFza3MubGVuZ3RoID4gMCkge1xyXG5cdFx0XHR0aGlzLmRhdGVTZWN0aW9ucy5wdXNoKHtcclxuXHRcdFx0XHR0aXRsZTogdGhpcy5mb3JtYXRTZWN0aW9uVGl0bGVGb3JEYXRlKHRoaXMuY3VycmVudERhdGUpLCAvLyBVc2UgaGVscGVyIGZvciBjb25zaXN0ZW50IHRpdGxlXHJcblx0XHRcdFx0ZGF0ZTogbmV3IERhdGUodGhpcy5jdXJyZW50RGF0ZSksXHJcblx0XHRcdFx0dGFza3M6IHRoaXMudG9kYXlUYXNrcywgLy8gVXNlIGNhdGVnb3JpemVkIHRvZGF5VGFza3NcclxuXHRcdFx0XHRpc0V4cGFuZGVkOiB0cnVlLFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBGdXR1cmUgc2VjdGlvbnMgYnkgcmVsZXZhbnQgZGF0ZVxyXG5cdFx0Y29uc3QgZGF0ZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBUYXNrW10+KCk7XHJcblx0XHR0aGlzLmZ1dHVyZVRhc2tzLmZvckVhY2goKHRhc2spID0+IHtcclxuXHRcdFx0Y29uc3QgcmVsZXZhbnRUaW1lc3RhbXAgPSB0aGlzLmdldFJlbGV2YW50RGF0ZSh0YXNrKTtcclxuXHRcdFx0aWYgKHJlbGV2YW50VGltZXN0YW1wKSB7XHJcblx0XHRcdFx0Y29uc3QgZGF0ZSA9IG5ldyBEYXRlKHJlbGV2YW50VGltZXN0YW1wKTsgLy8gQWxyZWFkeSB6ZXJvZWQgYnkgZ2V0UmVsZXZhbnREYXRlIGxvZ2ljIGltcGxpY2l0bHkgdmlhIGdldFRpbWUoKVxyXG5cdFx0XHRcdC8vIFVzZSBsb2NhbCBkYXRlIGNvbXBvbmVudHMgZm9yIHRoZSBrZXkgdG8gYXZvaWQgdGltZXpvbmUgc2hpZnRzIGluIG1hcCBrZXlcclxuXHRcdFx0XHRjb25zdCBkYXRlS2V5ID0gYCR7ZGF0ZS5nZXRGdWxsWWVhcigpfS0ke1N0cmluZyhcclxuXHRcdFx0XHRcdGRhdGUuZ2V0TW9udGgoKSArIDFcclxuXHRcdFx0XHQpLnBhZFN0YXJ0KDIsIFwiMFwiKX0tJHtTdHJpbmcoZGF0ZS5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIFwiMFwiKX1gO1xyXG5cclxuXHRcdFx0XHRpZiAoIWRhdGVNYXAuaGFzKGRhdGVLZXkpKSB7XHJcblx0XHRcdFx0XHRkYXRlTWFwLnNldChkYXRlS2V5LCBbXSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIEVuc3VyZSB0YXNrIGlzIGFkZGVkIG9ubHkgb25jZSBwZXIgcmVsZXZhbnQgZGF0ZSBzZWN0aW9uXHJcblx0XHRcdFx0aWYgKCFkYXRlTWFwLmdldChkYXRlS2V5KSEuc29tZSgodCkgPT4gdC5pZCA9PT0gdGFzay5pZCkpIHtcclxuXHRcdFx0XHRcdGRhdGVNYXAuZ2V0KGRhdGVLZXkpIS5wdXNoKHRhc2spO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gU29ydCBkYXRlcyBhbmQgY3JlYXRlIHNlY3Rpb25zXHJcblx0XHRjb25zdCBzb3J0ZWREYXRlcyA9IEFycmF5LmZyb20oZGF0ZU1hcC5rZXlzKCkpLnNvcnQoKTtcclxuXHJcblx0XHRzb3J0ZWREYXRlcy5mb3JFYWNoKChkYXRlS2V5KSA9PiB7XHJcblx0XHRcdGNvbnN0IFt5ZWFyLCBtb250aCwgZGF5XSA9IGRhdGVLZXkuc3BsaXQoXCItXCIpLm1hcChOdW1iZXIpO1xyXG5cdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUoeWVhciwgbW9udGggLSAxLCBkYXkpO1xyXG5cdFx0XHRjb25zdCB0YXNrcyA9IGRhdGVNYXAuZ2V0KGRhdGVLZXkpITsgLy8gVGFza3Mgc2hvdWxkIGFscmVhZHkgYmUgc29ydGVkIGJ5IHByaW9yaXR5IHdpdGhpbiBjYXRlZ29yeVxyXG5cclxuXHRcdFx0Y29uc3QgdG9kYXkgPSBuZXcgRGF0ZSh0aGlzLmN1cnJlbnREYXRlKTtcclxuXHRcdFx0dG9kYXkuc2V0SG91cnMoMCwgMCwgMCwgMCk7XHJcblxyXG5cdFx0XHQvLyBVc2UgaGVscGVyIGZvciB0aXRsZVxyXG5cdFx0XHRjb25zdCB0aXRsZSA9IHRoaXMuZm9ybWF0U2VjdGlvblRpdGxlRm9yRGF0ZShkYXRlKTtcclxuXHJcblx0XHRcdHRoaXMuZGF0ZVNlY3Rpb25zLnB1c2goe1xyXG5cdFx0XHRcdHRpdGxlOiB0aXRsZSxcclxuXHRcdFx0XHRkYXRlOiBkYXRlLFxyXG5cdFx0XHRcdHRhc2tzOiB0YXNrcyxcclxuXHRcdFx0XHRpc0V4cGFuZGVkOiB0aGlzLnNob3VsZEV4cGFuZEZ1dHVyZVNlY3Rpb24oXHJcblx0XHRcdFx0XHRkYXRlLFxyXG5cdFx0XHRcdFx0dGhpcy5jdXJyZW50RGF0ZVxyXG5cdFx0XHRcdCksIC8vIEV4cGFuZCBiYXNlZCBvbiByZWxhdGlvbiB0byB0b2RheVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFBhc3Qgc2VjdGlvbiAoaWYgYW55KSAtIHVzaW5nIHBhc3RUYXNrc1xyXG5cdFx0Ly8gVGl0bGUgcmVtYWlucyBcIlBhc3QgRHVlXCIgYnV0IGNvdmVycyBvdmVyZHVlIGFuZCBwYXN0IHNjaGVkdWxlZC5cclxuXHRcdGlmICh0aGlzLnBhc3RUYXNrcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdHRoaXMuZGF0ZVNlY3Rpb25zLnVuc2hpZnQoe1xyXG5cdFx0XHRcdHRpdGxlOiB0KFwiUGFzdCBEdWVcIiksIC8vIEtlZXAgdGl0bGUgZm9yIG5vd1xyXG5cdFx0XHRcdGRhdGU6IG5ldyBEYXRlKDApLCAvLyBQbGFjZWhvbGRlciBkYXRlXHJcblx0XHRcdFx0dGFza3M6IHRoaXMucGFzdFRhc2tzLCAvLyBVc2UgcGFzdFRhc2tzXHJcblx0XHRcdFx0aXNFeHBhbmRlZDogdHJ1ZSxcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3Qgdmlld0NvbmZpZyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnZpZXdDb25maWd1cmF0aW9uLmZpbmQoXHJcblx0XHRcdCh2aWV3KSA9PiB2aWV3LmlkID09PSBcImZvcmVjYXN0XCJcclxuXHRcdCk7XHJcblx0XHRpZiAodmlld0NvbmZpZz8uc29ydENyaXRlcmlhICYmIHZpZXdDb25maWcuc29ydENyaXRlcmlhLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0Y29uc3QgZHVlRGF0ZVNvcnRDcml0ZXJpb24gPSB2aWV3Q29uZmlnLnNvcnRDcml0ZXJpYS5maW5kKFxyXG5cdFx0XHRcdCh0KSA9PiB0LmZpZWxkID09PSBcImR1ZURhdGVcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRjb25zdCBzY2hlZHVsZWREYXRlU29ydENyaXRlcmlvbiA9IHZpZXdDb25maWcuc29ydENyaXRlcmlhLmZpbmQoXHJcblx0XHRcdFx0KHQpID0+IHQuZmllbGQgPT09IFwic2NoZWR1bGVkRGF0ZVwiXHJcblx0XHRcdCk7XHJcblx0XHRcdGlmIChkdWVEYXRlU29ydENyaXRlcmlvbiAmJiBkdWVEYXRlU29ydENyaXRlcmlvbi5vcmRlciA9PT0gXCJkZXNjXCIpIHtcclxuXHRcdFx0XHR0aGlzLmRhdGVTZWN0aW9ucy5yZXZlcnNlKCk7XHJcblx0XHRcdH0gZWxzZSBpZiAoXHJcblx0XHRcdFx0c2NoZWR1bGVkRGF0ZVNvcnRDcml0ZXJpb24gJiZcclxuXHRcdFx0XHRzY2hlZHVsZWREYXRlU29ydENyaXRlcmlvbi5vcmRlciA9PT0gXCJkZXNjXCJcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0dGhpcy5kYXRlU2VjdGlvbnMucmV2ZXJzZSgpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbmRlckRhdGVTZWN0aW9uc1VJKCkge1xyXG5cdFx0dGhpcy5jbGVhbnVwUmVuZGVyZXJzKCk7XHJcblxyXG5cdFx0Ly8gRW5zdXJlIHRoZSBtYXAgaXMgdXAtdG8tZGF0ZSAoYmVsdCBhbmQgc3VzcGVuZGVycylcclxuXHRcdHRoaXMuYWxsVGFza3NNYXAgPSBuZXcgTWFwKFxyXG5cdFx0XHR0aGlzLmFsbFRhc2tzLm1hcCgodGFzaykgPT4gW3Rhc2suaWQsIHRhc2tdKVxyXG5cdFx0KTtcclxuXHJcblx0XHRpZiAodGhpcy5kYXRlU2VjdGlvbnMubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdGNvbnN0IGVtcHR5RWwgPSB0aGlzLnRhc2tMaXN0Q29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwiZm9yZWNhc3QtZW1wdHktc3RhdGVcIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdGVtcHR5RWwuc2V0VGV4dCh0KFwiTm8gdGFza3Mgc2NoZWR1bGVkXCIpKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuZGF0ZVNlY3Rpb25zLmZvckVhY2goKHNlY3Rpb24pID0+IHtcclxuXHRcdFx0Y29uc3Qgc2VjdGlvbkVsID0gdGhpcy50YXNrTGlzdENvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcInRhc2stZGF0ZS1zZWN0aW9uXCIsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgaWYgdGhpcyBzZWN0aW9uIGlzIG92ZXJkdWVcclxuXHRcdFx0Y29uc3QgdG9kYXkgPSBuZXcgRGF0ZSgpO1xyXG5cdFx0XHR0b2RheS5zZXRIb3VycygwLCAwLCAwLCAwKTtcclxuXHRcdFx0Y29uc3Qgc2VjdGlvbkRhdGUgPSBuZXcgRGF0ZShzZWN0aW9uLmRhdGUpO1xyXG5cdFx0XHRzZWN0aW9uRGF0ZS5zZXRIb3VycygwLCAwLCAwLCAwKTtcclxuXHJcblx0XHRcdC8vIEFkZCAnb3ZlcmR1ZScgY2xhc3MgZm9yIHBhc3QgZHVlIHNlY3Rpb25zXHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHRzZWN0aW9uRGF0ZS5nZXRUaW1lKCkgPCB0b2RheS5nZXRUaW1lKCkgfHxcclxuXHRcdFx0XHRzZWN0aW9uLnRpdGxlID09PSBcIlBhc3QgRHVlXCJcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0c2VjdGlvbkVsLmFkZENsYXNzKFwib3ZlcmR1ZVwiKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gU2VjdGlvbiBoZWFkZXJcclxuXHRcdFx0Y29uc3QgaGVhZGVyRWwgPSBzZWN0aW9uRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwiZGF0ZS1zZWN0aW9uLWhlYWRlclwiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIEV4cGFuZC9jb2xsYXBzZSB0b2dnbGVcclxuXHRcdFx0Y29uc3QgdG9nZ2xlRWwgPSBoZWFkZXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJzZWN0aW9uLXRvZ2dsZVwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0c2V0SWNvbihcclxuXHRcdFx0XHR0b2dnbGVFbCxcclxuXHRcdFx0XHRzZWN0aW9uLmlzRXhwYW5kZWQgPyBcImNoZXZyb24tZG93blwiIDogXCJjaGV2cm9uLXJpZ2h0XCJcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIFNlY3Rpb24gdGl0bGVcclxuXHRcdFx0Y29uc3QgdGl0bGVFbCA9IGhlYWRlckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcInNlY3Rpb24tdGl0bGVcIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdHRpdGxlRWwuc2V0VGV4dChzZWN0aW9uLnRpdGxlKTtcclxuXHJcblx0XHRcdC8vIFRhc2sgY291bnQgYmFkZ2VcclxuXHRcdFx0Y29uc3QgY291bnRFbCA9IGhlYWRlckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcInNlY3Rpb24tY291bnRcIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdGNvdW50RWwuc2V0VGV4dChgJHtzZWN0aW9uLnRhc2tzLmxlbmd0aH1gKTtcclxuXHJcblx0XHRcdC8vIFRhc2sgY29udGFpbmVyIChpbml0aWFsbHkgaGlkZGVuIGlmIGNvbGxhcHNlZClcclxuXHRcdFx0Y29uc3QgdGFza0xpc3RFbCA9IHNlY3Rpb25FbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJzZWN0aW9uLXRhc2tzXCIsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0aWYgKCFzZWN0aW9uLmlzRXhwYW5kZWQpIHtcclxuXHRcdFx0XHR0YXNrTGlzdEVsLmhpZGUoKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gUmVnaXN0ZXIgdG9nZ2xlIGV2ZW50XHJcblx0XHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChoZWFkZXJFbCwgXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdFx0c2VjdGlvbi5pc0V4cGFuZGVkID0gIXNlY3Rpb24uaXNFeHBhbmRlZDtcclxuXHRcdFx0XHRzZXRJY29uKFxyXG5cdFx0XHRcdFx0dG9nZ2xlRWwsXHJcblx0XHRcdFx0XHRzZWN0aW9uLmlzRXhwYW5kZWQgPyBcImNoZXZyb24tZG93blwiIDogXCJjaGV2cm9uLXJpZ2h0XCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHNlY3Rpb24uaXNFeHBhbmRlZCA/IHRhc2tMaXN0RWwuc2hvdygpIDogdGFza0xpc3RFbC5oaWRlKCk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIGFuZCBjb25maWd1cmUgcmVuZGVyZXIgZm9yIHRoaXMgc2VjdGlvblxyXG5cdFx0XHRzZWN0aW9uLnJlbmRlcmVyID0gbmV3IFRhc2tMaXN0UmVuZGVyZXJDb21wb25lbnQoXHJcblx0XHRcdFx0dGhpcyxcclxuXHRcdFx0XHR0YXNrTGlzdEVsLFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHRcdFwiZm9yZWNhc3RcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHR0aGlzLnBhcmFtcy5vblRhc2tTZWxlY3RlZCAmJlxyXG5cdFx0XHRcdChzZWN0aW9uLnJlbmRlcmVyLm9uVGFza1NlbGVjdGVkID0gdGhpcy5wYXJhbXMub25UYXNrU2VsZWN0ZWQpO1xyXG5cdFx0XHR0aGlzLnBhcmFtcy5vblRhc2tDb21wbGV0ZWQgJiZcclxuXHRcdFx0XHQoc2VjdGlvbi5yZW5kZXJlci5vblRhc2tDb21wbGV0ZWQgPVxyXG5cdFx0XHRcdFx0dGhpcy5wYXJhbXMub25UYXNrQ29tcGxldGVkKTtcclxuXHRcdFx0dGhpcy5wYXJhbXMub25UYXNrQ29udGV4dE1lbnUgJiZcclxuXHRcdFx0XHQoc2VjdGlvbi5yZW5kZXJlci5vblRhc2tDb250ZXh0TWVudSA9XHJcblx0XHRcdFx0XHR0aGlzLnBhcmFtcy5vblRhc2tDb250ZXh0TWVudSk7XHJcblxyXG5cdFx0XHQvLyBTZXQgdXAgdGFzayB1cGRhdGUgY2FsbGJhY2sgLSB1c2UgcGFyYW1zIGNhbGxiYWNrIGlmIGF2YWlsYWJsZSwgb3RoZXJ3aXNlIHVzZSBpbnRlcm5hbCB1cGRhdGVUYXNrXHJcblx0XHRcdHNlY3Rpb24ucmVuZGVyZXIub25UYXNrVXBkYXRlID0gYXN5bmMgKFxyXG5cdFx0XHRcdG9yaWdpbmFsVGFzazogVGFzayxcclxuXHRcdFx0XHR1cGRhdGVkVGFzazogVGFza1xyXG5cdFx0XHQpID0+IHtcclxuXHRcdFx0XHRpZiAodGhpcy5wYXJhbXMub25UYXNrVXBkYXRlKSB7XHJcblx0XHRcdFx0XHRhd2FpdCB0aGlzLnBhcmFtcy5vblRhc2tVcGRhdGUob3JpZ2luYWxUYXNrLCB1cGRhdGVkVGFzayk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdC8vIEZhbGxiYWNrIHRvIGludGVybmFsIHVwZGF0ZVRhc2sgbWV0aG9kXHJcblx0XHRcdFx0XHR0aGlzLnVwZGF0ZVRhc2sodXBkYXRlZFRhc2spO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIFJlbmRlciB0YXNrcyB1c2luZyB0aGUgc2VjdGlvbidzIHJlbmRlcmVyXHJcblx0XHRcdHNlY3Rpb24ucmVuZGVyZXIucmVuZGVyVGFza3MoXHJcblx0XHRcdFx0c2VjdGlvbi50YXNrcyxcclxuXHRcdFx0XHR0aGlzLmlzVHJlZVZpZXcsXHJcblx0XHRcdFx0dGhpcy5hbGxUYXNrc01hcCxcclxuXHRcdFx0XHR0KFwiTm8gdGFza3MgZm9yIHRoaXMgc2VjdGlvbi5cIilcclxuXHRcdFx0KTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBmb3JtYXREYXRlKGRhdGU6IERhdGUpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgbW9udGhzID0gW1xyXG5cdFx0XHRcIkphbnVhcnlcIixcclxuXHRcdFx0XCJGZWJydWFyeVwiLFxyXG5cdFx0XHRcIk1hcmNoXCIsXHJcblx0XHRcdFwiQXByaWxcIixcclxuXHRcdFx0XCJNYXlcIixcclxuXHRcdFx0XCJKdW5lXCIsXHJcblx0XHRcdFwiSnVseVwiLFxyXG5cdFx0XHRcIkF1Z3VzdFwiLFxyXG5cdFx0XHRcIlNlcHRlbWJlclwiLFxyXG5cdFx0XHRcIk9jdG9iZXJcIixcclxuXHRcdFx0XCJOb3ZlbWJlclwiLFxyXG5cdFx0XHRcIkRlY2VtYmVyXCIsXHJcblx0XHRdO1xyXG5cdFx0cmV0dXJuIGAke1xyXG5cdFx0XHRtb250aHNbZGF0ZS5nZXRNb250aCgpXVxyXG5cdFx0fSAke2RhdGUuZ2V0RGF0ZSgpfSwgJHtkYXRlLmdldEZ1bGxZZWFyKCl9YDtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZm9jdXNUYXNrTGlzdCh0eXBlOiBzdHJpbmcpIHtcclxuXHRcdC8vIENsZWFyIHByZXZpb3VzIGZvY3VzXHJcblx0XHRjb25zdCBzdGF0SXRlbXMgPSB0aGlzLnN0YXRzQ29udGFpbmVyRWwucXVlcnlTZWxlY3RvckFsbChcIi5zdGF0LWl0ZW1cIik7XHJcblx0XHRzdGF0SXRlbXMuZm9yRWFjaCgoaXRlbSkgPT4gaXRlbS5jbGFzc0xpc3QucmVtb3ZlKFwiYWN0aXZlXCIpKTtcclxuXHJcblx0XHQvLyBTZXQgbmV3IGZvY3VzXHJcblx0XHRpZiAodGhpcy5mb2N1c0ZpbHRlciA9PT0gdHlwZSkge1xyXG5cdFx0XHQvLyBUb2dnbGUgb2ZmIGlmIGFscmVhZHkgc2VsZWN0ZWRcclxuXHRcdFx0dGhpcy5mb2N1c0ZpbHRlciA9IG51bGw7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLmZvY3VzRmlsdGVyID0gdHlwZTtcclxuXHRcdFx0Y29uc3QgYWN0aXZlSXRlbSA9IHRoaXMuc3RhdHNDb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRcdGAuc3RhdC1pdGVtLnRnLSR7dHlwZX1gIC8vIFVzZSB0aGUgdHlwZSBpZGVudGlmaWVyIHBhc3NlZCBkdXJpbmcgY3JlYXRpb25cclxuXHRcdFx0KTtcclxuXHRcdFx0aWYgKGFjdGl2ZUl0ZW0pIHtcclxuXHRcdFx0XHRhY3RpdmVJdGVtLmNsYXNzTGlzdC5hZGQoXCJhY3RpdmVcIik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBVcGRhdGUgZGF0ZSBzZWN0aW9ucyBiYXNlZCBvbiBmaWx0ZXIgdXNpbmcgbmV3IHRhc2sgY2F0ZWdvcmllc1xyXG5cdFx0aWYgKHRoaXMuZm9jdXNGaWx0ZXIgPT09IFwicGFzdC1kdWVcIikge1xyXG5cdFx0XHR0aGlzLmRhdGVTZWN0aW9ucyA9XHJcblx0XHRcdFx0dGhpcy5wYXN0VGFza3MubGVuZ3RoID4gMFxyXG5cdFx0XHRcdFx0PyBbXHJcblx0XHRcdFx0XHRcdFx0Ly8gQ2hlY2sgaWYgdGFza3MgZXhpc3RcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR0aXRsZTogdChcIlBhc3QgRHVlXCIpLCAvLyBUaXRsZSBrZXB0XHJcblx0XHRcdFx0XHRcdFx0XHRkYXRlOiBuZXcgRGF0ZSgwKSxcclxuXHRcdFx0XHRcdFx0XHRcdHRhc2tzOiB0aGlzLnBhc3RUYXNrcywgLy8gVXNlIHBhc3RUYXNrc1xyXG5cdFx0XHRcdFx0XHRcdFx0aXNFeHBhbmRlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0ICBdXHJcblx0XHRcdFx0XHQ6IFtdOyAvLyBFbXB0eSBhcnJheSBpZiBubyBwYXN0IHRhc2tzXHJcblx0XHR9IGVsc2UgaWYgKHRoaXMuZm9jdXNGaWx0ZXIgPT09IFwidG9kYXlcIikge1xyXG5cdFx0XHR0aGlzLmRhdGVTZWN0aW9ucyA9XHJcblx0XHRcdFx0dGhpcy50b2RheVRhc2tzLmxlbmd0aCA+IDBcclxuXHRcdFx0XHRcdD8gW1xyXG5cdFx0XHRcdFx0XHRcdC8vIENoZWNrIGlmIHRhc2tzIGV4aXN0XHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0dGl0bGU6IHRoaXMuZm9ybWF0U2VjdGlvblRpdGxlRm9yRGF0ZShcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5jdXJyZW50RGF0ZVxyXG5cdFx0XHRcdFx0XHRcdFx0KSwgLy8gVXNlIGhlbHBlclxyXG5cdFx0XHRcdFx0XHRcdFx0ZGF0ZTogbmV3IERhdGUodGhpcy5jdXJyZW50RGF0ZSksXHJcblx0XHRcdFx0XHRcdFx0XHR0YXNrczogdGhpcy50b2RheVRhc2tzLCAvLyBVc2UgdG9kYXlUYXNrc1xyXG5cdFx0XHRcdFx0XHRcdFx0aXNFeHBhbmRlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0ICBdXHJcblx0XHRcdFx0XHQ6IFtdOyAvLyBFbXB0eSBhcnJheSBpZiBubyB0b2RheSB0YXNrc1xyXG5cdFx0fSBlbHNlIGlmICh0aGlzLmZvY3VzRmlsdGVyID09PSBcImZ1dHVyZVwiKSB7XHJcblx0XHRcdC8vIFJlY2FsY3VsYXRlIGZ1dHVyZSBzZWN0aW9ucyB1c2luZyByZWxldmFudCBkYXRlc1xyXG5cdFx0XHR0aGlzLmNhbGN1bGF0ZURhdGVTZWN0aW9ucygpOyAvLyBSZWNhbGN1bGF0ZXMgYWxsLCBpbmNsdWRpbmcgZnV0dXJlXHJcblx0XHRcdC8vIEZpbHRlciBvdXQgcGFzdCBhbmQgdG9kYXkgc2VjdGlvbnMgZnJvbSB0aGUgZnVsbCByZWNhbGN1bGF0aW9uXHJcblx0XHRcdGNvbnN0IHRvZGF5VGltZXN0YW1wID0gbmV3IERhdGUodGhpcy5jdXJyZW50RGF0ZSkuc2V0SG91cnMoXHJcblx0XHRcdFx0MCxcclxuXHRcdFx0XHQwLFxyXG5cdFx0XHRcdDAsXHJcblx0XHRcdFx0MFxyXG5cdFx0XHQpO1xyXG5cdFx0XHR0aGlzLmRhdGVTZWN0aW9ucyA9IHRoaXMuZGF0ZVNlY3Rpb25zLmZpbHRlcigoc2VjdGlvbikgPT4ge1xyXG5cdFx0XHRcdC8vIEtlZXAgc2VjdGlvbnMgd2hvc2UgZGF0ZSBpcyBzdHJpY3RseSBhZnRlciB0b2RheVxyXG5cdFx0XHRcdC8vIEV4Y2x1ZGUgdGhlICdQYXN0IER1ZScgc2VjdGlvbiAoZGF0ZSB0aW1lc3RhbXAgMClcclxuXHRcdFx0XHRjb25zdCBzZWN0aW9uVGltZXN0YW1wID0gc2VjdGlvbi5kYXRlLmdldFRpbWUoKTtcclxuXHRcdFx0XHRyZXR1cm4gc2VjdGlvblRpbWVzdGFtcCA+IHRvZGF5VGltZXN0YW1wO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIE5vIGZpbHRlciwgc2hvdyBhbGwgc2VjdGlvbnMgKHJlY2FsY3VsYXRlKVxyXG5cdFx0XHR0aGlzLmNhbGN1bGF0ZURhdGVTZWN0aW9ucygpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlLXJlbmRlciB0aGUgc2VjdGlvbnNcclxuXHRcdHRoaXMucmVuZGVyRGF0ZVNlY3Rpb25zVUkoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVmcmVzaERhdGVTZWN0aW9uc1VJKCkge1xyXG5cdFx0Ly8gVXBkYXRlIHNlY3Rpb25zIGJhc2VkIG9uIHNlbGVjdGVkIGRhdGVcclxuXHRcdGlmICh0aGlzLmZvY3VzRmlsdGVyKSB7XHJcblx0XHRcdC8vIElmIHRoZXJlJ3MgYSBmaWx0ZXIgYWN0aXZlLCBkb24ndCBjaGFuZ2UgdGhlIHNlY3Rpb25zXHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmNsZWFudXBSZW5kZXJlcnMoKTtcclxuXHJcblx0XHQvLyBDYWxjdWxhdGUgdGhlIHNlY3Rpb25zIGJhc2VkIG9uIHRoZSBuZXcgc2VsZWN0ZWREYXRlXHJcblx0XHR0aGlzLmNhbGN1bGF0ZUZpbHRlcmVkRGF0ZVNlY3Rpb25zKCk7XHJcblxyXG5cdFx0Ly8gUmVuZGVyIHRoZSBuZXdseSBjYWxjdWxhdGVkIHNlY3Rpb25zXHJcblx0XHR0aGlzLnJlbmRlckRhdGVTZWN0aW9uc1VJKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNhbGN1bGF0ZUZpbHRlcmVkRGF0ZVNlY3Rpb25zKCkge1xyXG5cdFx0dGhpcy5kYXRlU2VjdGlvbnMgPSBbXTtcclxuXHJcblx0XHQvLyDln7rkuo7pgInmi6nml6XmnJ/ph43mlrDliIbnsbvmiYDmnInku7vliqFcclxuXHRcdGNvbnN0IHNlbGVjdGVkVGltZXN0YW1wID0gbmV3IERhdGUodGhpcy5zZWxlY3RlZERhdGUpLnNldEhvdXJzKDAsIDAsIDAsIDApO1xyXG5cclxuXHRcdC8vIOiOt+WPluacieebuOWFs+aXpeacn+eahOS7u+WKoVxyXG5cdFx0Y29uc3QgdGFza3NXaXRoUmVsZXZhbnREYXRlID0gdGhpcy5hbGxUYXNrcy5maWx0ZXIoXHJcblx0XHRcdCh0YXNrKSA9PiB0aGlzLmdldFJlbGV2YW50RGF0ZSh0YXNrKSAhPT0gdW5kZWZpbmVkXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIOebuOWvueS6jumAieaLqeaXpeacn+mHjeaWsOWIhuexu1xyXG5cdFx0Y29uc3QgcGFzdFRhc2tzUmVsYXRpdmVUb1NlbGVjdGVkID0gdGFza3NXaXRoUmVsZXZhbnREYXRlLmZpbHRlcigodGFzaykgPT4ge1xyXG5cdFx0XHRjb25zdCByZWxldmFudFRpbWVzdGFtcCA9IHRoaXMuZ2V0UmVsZXZhbnREYXRlKHRhc2spITtcclxuXHRcdFx0cmV0dXJuIHJlbGV2YW50VGltZXN0YW1wIDwgc2VsZWN0ZWRUaW1lc3RhbXA7XHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCBzZWxlY3RlZERhdGVUYXNrcyA9IHRhc2tzV2l0aFJlbGV2YW50RGF0ZS5maWx0ZXIoKHRhc2spID0+IHtcclxuXHRcdFx0Y29uc3QgcmVsZXZhbnRUaW1lc3RhbXAgPSB0aGlzLmdldFJlbGV2YW50RGF0ZSh0YXNrKSE7XHJcblx0XHRcdHJldHVybiByZWxldmFudFRpbWVzdGFtcCA9PT0gc2VsZWN0ZWRUaW1lc3RhbXA7XHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCBmdXR1cmVUYXNrc1JlbGF0aXZlVG9TZWxlY3RlZCA9IHRhc2tzV2l0aFJlbGV2YW50RGF0ZS5maWx0ZXIoKHRhc2spID0+IHtcclxuXHRcdFx0Y29uc3QgcmVsZXZhbnRUaW1lc3RhbXAgPSB0aGlzLmdldFJlbGV2YW50RGF0ZSh0YXNrKSE7XHJcblx0XHRcdHJldHVybiByZWxldmFudFRpbWVzdGFtcCA+IHNlbGVjdGVkVGltZXN0YW1wO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8g6I635Y+W5o6S5bqP6YWN572uXHJcblx0XHRjb25zdCBzb3J0Q3JpdGVyaWEgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy52aWV3Q29uZmlndXJhdGlvbi5maW5kKFxyXG5cdFx0XHQodmlldykgPT4gdmlldy5pZCA9PT0gXCJmb3JlY2FzdFwiXHJcblx0XHQpPy5zb3J0Q3JpdGVyaWE7XHJcblxyXG5cdFx0Ly8g5a+56YeN5paw5YiG57G755qE5Lu75Yqh6L+b6KGM5o6S5bqPXHJcblx0XHRsZXQgc29ydGVkUGFzdFRhc2tzOiBUYXNrW107XHJcblx0XHRsZXQgc29ydGVkU2VsZWN0ZWREYXRlVGFza3M6IFRhc2tbXTtcclxuXHRcdGxldCBzb3J0ZWRGdXR1cmVUYXNrczogVGFza1tdO1xyXG5cclxuXHRcdGlmIChzb3J0Q3JpdGVyaWEgJiYgc29ydENyaXRlcmlhLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0c29ydGVkUGFzdFRhc2tzID0gc29ydFRhc2tzKFxyXG5cdFx0XHRcdHBhc3RUYXNrc1JlbGF0aXZlVG9TZWxlY3RlZCxcclxuXHRcdFx0XHRzb3J0Q3JpdGVyaWEsXHJcblx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3NcclxuXHRcdFx0KTtcclxuXHRcdFx0c29ydGVkU2VsZWN0ZWREYXRlVGFza3MgPSBzb3J0VGFza3MoXHJcblx0XHRcdFx0c2VsZWN0ZWREYXRlVGFza3MsXHJcblx0XHRcdFx0c29ydENyaXRlcmlhLFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzXHJcblx0XHRcdCk7XHJcblx0XHRcdHNvcnRlZEZ1dHVyZVRhc2tzID0gc29ydFRhc2tzKFxyXG5cdFx0XHRcdGZ1dHVyZVRhc2tzUmVsYXRpdmVUb1NlbGVjdGVkLFxyXG5cdFx0XHRcdHNvcnRDcml0ZXJpYSxcclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5nc1xyXG5cdFx0XHQpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0c29ydGVkUGFzdFRhc2tzID0gdGhpcy5zb3J0VGFza3NCeVByaW9yaXR5QW5kUmVsZXZhbnREYXRlKFxyXG5cdFx0XHRcdHBhc3RUYXNrc1JlbGF0aXZlVG9TZWxlY3RlZFxyXG5cdFx0XHQpO1xyXG5cdFx0XHRzb3J0ZWRTZWxlY3RlZERhdGVUYXNrcyA9IHRoaXMuc29ydFRhc2tzQnlQcmlvcml0eUFuZFJlbGV2YW50RGF0ZShcclxuXHRcdFx0XHRzZWxlY3RlZERhdGVUYXNrc1xyXG5cdFx0XHQpO1xyXG5cdFx0XHRzb3J0ZWRGdXR1cmVUYXNrcyA9IHRoaXMuc29ydFRhc2tzQnlQcmlvcml0eUFuZFJlbGV2YW50RGF0ZShcclxuXHRcdFx0XHRmdXR1cmVUYXNrc1JlbGF0aXZlVG9TZWxlY3RlZFxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFNlY3Rpb24gZm9yIHRoZSBzZWxlY3RlZCBkYXRlXHJcblx0XHRpZiAoc29ydGVkU2VsZWN0ZWREYXRlVGFza3MubGVuZ3RoID4gMCkge1xyXG5cdFx0XHR0aGlzLmRhdGVTZWN0aW9ucy5wdXNoKHtcclxuXHRcdFx0XHR0aXRsZTogdGhpcy5mb3JtYXRTZWN0aW9uVGl0bGVGb3JEYXRlKHRoaXMuc2VsZWN0ZWREYXRlKSxcclxuXHRcdFx0XHRkYXRlOiBuZXcgRGF0ZSh0aGlzLnNlbGVjdGVkRGF0ZSksXHJcblx0XHRcdFx0dGFza3M6IHNvcnRlZFNlbGVjdGVkRGF0ZVRhc2tzLFxyXG5cdFx0XHRcdGlzRXhwYW5kZWQ6IHRydWUsXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFkZCBQYXN0IER1ZSBzZWN0aW9uIGlmIGFwcGxpY2FibGVcclxuXHRcdGlmIChzb3J0ZWRQYXN0VGFza3MubGVuZ3RoID4gMCkge1xyXG5cdFx0XHR0aGlzLmRhdGVTZWN0aW9ucy51bnNoaWZ0KHtcclxuXHRcdFx0XHR0aXRsZTogdChcIlBhc3QgRHVlXCIpLFxyXG5cdFx0XHRcdGRhdGU6IG5ldyBEYXRlKDApLCAvLyBQbGFjZWhvbGRlclxyXG5cdFx0XHRcdHRhc2tzOiBzb3J0ZWRQYXN0VGFza3MsXHJcblx0XHRcdFx0aXNFeHBhbmRlZDogdHJ1ZSxcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWRkIGZ1dHVyZSBzZWN0aW9ucyBieSBkYXRlXHJcblx0XHRjb25zdCBkYXRlTWFwID0gbmV3IE1hcDxzdHJpbmcsIFRhc2tbXT4oKTtcclxuXHRcdHNvcnRlZEZ1dHVyZVRhc2tzLmZvckVhY2goKHRhc2spID0+IHtcclxuXHRcdFx0Y29uc3QgcmVsZXZhbnRUaW1lc3RhbXAgPSB0aGlzLmdldFJlbGV2YW50RGF0ZSh0YXNrKSE7XHJcblx0XHRcdGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShyZWxldmFudFRpbWVzdGFtcCk7XHJcblx0XHRcdC8vIENyZWF0ZSBkYXRlIGtleVxyXG5cdFx0XHRjb25zdCBkYXRlS2V5ID0gYCR7ZGF0ZS5nZXRGdWxsWWVhcigpfS0ke1N0cmluZyhcclxuXHRcdFx0XHRkYXRlLmdldE1vbnRoKCkgKyAxXHJcblx0XHRcdCkucGFkU3RhcnQoMiwgXCIwXCIpfS0ke1N0cmluZyhkYXRlLmdldERhdGUoKSkucGFkU3RhcnQoMiwgXCIwXCIpfWA7XHJcblxyXG5cdFx0XHRpZiAoIWRhdGVNYXAuaGFzKGRhdGVLZXkpKSB7XHJcblx0XHRcdFx0ZGF0ZU1hcC5zZXQoZGF0ZUtleSwgW10pO1xyXG5cdFx0XHR9XHJcblx0XHRcdC8vIEF2b2lkIGR1cGxpY2F0ZXNcclxuXHRcdFx0aWYgKCFkYXRlTWFwLmdldChkYXRlS2V5KSEuc29tZSgodCkgPT4gdC5pZCA9PT0gdGFzay5pZCkpIHtcclxuXHRcdFx0XHRkYXRlTWFwLmdldChkYXRlS2V5KSEucHVzaCh0YXNrKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3Qgc29ydGVkRGF0ZXMgPSBBcnJheS5mcm9tKGRhdGVNYXAua2V5cygpKS5zb3J0KCk7XHJcblx0XHRzb3J0ZWREYXRlcy5mb3JFYWNoKChkYXRlS2V5KSA9PiB7XHJcblx0XHRcdGNvbnN0IFt5ZWFyLCBtb250aCwgZGF5XSA9IGRhdGVLZXkuc3BsaXQoXCItXCIpLm1hcChOdW1iZXIpO1xyXG5cdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUoeWVhciwgbW9udGggLSAxLCBkYXkpO1xyXG5cdFx0XHRjb25zdCB0YXNrcyA9IGRhdGVNYXAuZ2V0KGRhdGVLZXkpITtcclxuXHJcblx0XHRcdGxldCB0aXRsZSA9IHRoaXMuZm9ybWF0U2VjdGlvblRpdGxlRm9yRGF0ZShkYXRlKTtcclxuXHJcblx0XHRcdHRoaXMuZGF0ZVNlY3Rpb25zLnB1c2goe1xyXG5cdFx0XHRcdHRpdGxlOiB0aXRsZSxcclxuXHRcdFx0XHRkYXRlOiBkYXRlLFxyXG5cdFx0XHRcdHRhc2tzOiB0YXNrcyxcclxuXHRcdFx0XHQvLyBFeHBhbmQgYmFzZWQgb24gcmVsYXRpb24gdG8gdGhlIHNlbGVjdGVkIGRhdGVcclxuXHRcdFx0XHRpc0V4cGFuZGVkOiB0aGlzLnNob3VsZEV4cGFuZEZ1dHVyZVNlY3Rpb24oXHJcblx0XHRcdFx0XHRkYXRlLFxyXG5cdFx0XHRcdFx0dGhpcy5zZWxlY3RlZERhdGVcclxuXHRcdFx0XHQpLFxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIOWkhOeQhuaOkuW6j+mFjee9ruS4reeahOmZjeW6j+iuvue9rlxyXG5cdFx0aWYgKHNvcnRDcml0ZXJpYSAmJiBzb3J0Q3JpdGVyaWEubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRjb25zdCBkdWVEYXRlU29ydENyaXRlcmlvbiA9IHNvcnRDcml0ZXJpYS5maW5kKFxyXG5cdFx0XHRcdCh0KSA9PiB0LmZpZWxkID09PSBcImR1ZURhdGVcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRjb25zdCBzY2hlZHVsZWREYXRlU29ydENyaXRlcmlvbiA9IHNvcnRDcml0ZXJpYS5maW5kKFxyXG5cdFx0XHRcdCh0KSA9PiB0LmZpZWxkID09PSBcInNjaGVkdWxlZERhdGVcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRpZiAoZHVlRGF0ZVNvcnRDcml0ZXJpb24gJiYgZHVlRGF0ZVNvcnRDcml0ZXJpb24ub3JkZXIgPT09IFwiZGVzY1wiKSB7XHJcblx0XHRcdFx0dGhpcy5kYXRlU2VjdGlvbnMucmV2ZXJzZSgpO1xyXG5cdFx0XHR9IGVsc2UgaWYgKFxyXG5cdFx0XHRcdHNjaGVkdWxlZERhdGVTb3J0Q3JpdGVyaW9uICYmXHJcblx0XHRcdFx0c2NoZWR1bGVkRGF0ZVNvcnRDcml0ZXJpb24ub3JkZXIgPT09IFwiZGVzY1wiXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHRoaXMuZGF0ZVNlY3Rpb25zLnJldmVyc2UoKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEhhbmRsZSBlbXB0eSBzdGF0ZSBpbiByZW5kZXJEYXRlU2VjdGlvbnNVSVxyXG5cdH1cclxuXHJcblx0Ly8gSGVscGVyIHRvIGZvcm1hdCBzZWN0aW9uIHRpdGxlcyBkeW5hbWljYWxseSBiYXNlZCBvbiByZWxhdGlvbiB0byB0b2RheVxyXG5cdHByaXZhdGUgZm9ybWF0U2VjdGlvblRpdGxlRm9yRGF0ZShkYXRlOiBEYXRlKTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IGRhdGVUaW1lc3RhbXAgPSBuZXcgRGF0ZShkYXRlKS5zZXRIb3VycygwLCAwLCAwLCAwKTtcclxuXHRcdGNvbnN0IHRvZGF5VGltZXN0YW1wID0gbmV3IERhdGUodGhpcy5jdXJyZW50RGF0ZSkuc2V0SG91cnMoMCwgMCwgMCwgMCk7XHJcblxyXG5cdFx0bGV0IHByZWZpeCA9IFwiXCI7XHJcblx0XHRjb25zdCBkYXlEaWZmRnJvbVRvZGF5ID0gTWF0aC5yb3VuZChcclxuXHRcdFx0KGRhdGVUaW1lc3RhbXAgLSB0b2RheVRpbWVzdGFtcCkgLyAoMTAwMCAqIDM2MDAgKiAyNClcclxuXHRcdCk7XHJcblxyXG5cdFx0aWYgKGRheURpZmZGcm9tVG9kYXkgPT09IDApIHtcclxuXHRcdFx0cHJlZml4ID0gdChcIlRvZGF5XCIpICsgXCIsIFwiO1xyXG5cdFx0fSBlbHNlIGlmIChkYXlEaWZmRnJvbVRvZGF5ID09PSAxKSB7XHJcblx0XHRcdHByZWZpeCA9IHQoXCJUb21vcnJvd1wiKSArIFwiLCBcIjtcclxuXHRcdH1cclxuXHRcdC8vIGVsc2U6IG5vIHByZWZpeCBmb3Igb3RoZXIgZGF5c1xyXG5cclxuXHRcdC8vIFVzZSBmdWxsIGRheSBuYW1lXHJcblx0XHRjb25zdCBkYXlPZldlZWsgPSBbXHJcblx0XHRcdFwiU3VuZGF5XCIsXHJcblx0XHRcdFwiTW9uZGF5XCIsXHJcblx0XHRcdFwiVHVlc2RheVwiLFxyXG5cdFx0XHRcIldlZG5lc2RheVwiLFxyXG5cdFx0XHRcIlRodXJzZGF5XCIsXHJcblx0XHRcdFwiRnJpZGF5XCIsXHJcblx0XHRcdFwiU2F0dXJkYXlcIixcclxuXHRcdF1bZGF0ZS5nZXREYXkoKV07XHJcblx0XHRjb25zdCBmb3JtYXR0ZWREYXRlID0gdGhpcy5mb3JtYXREYXRlKGRhdGUpOyAvLyBlLmcuLCBcIkphbnVhcnkgMSwgMjAyNFwiXHJcblxyXG5cdFx0Ly8gRm9yIFRvZGF5LCBqdXN0IHNob3cgXCJUb2RheSAtIEZ1bGwgRGF0ZVwiXHJcblx0XHRpZiAoZGF5RGlmZkZyb21Ub2RheSA9PT0gMCkge1xyXG5cdFx0XHRyZXR1cm4gdChcIlRvZGF5XCIpICsgXCIg4oCUIFwiICsgZm9ybWF0dGVkRGF0ZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBGb3Igb3RoZXJzLCBzaG93IFByZWZpeCArIERheU9mV2VlayArIEZ1bGwgRGF0ZVxyXG5cdFx0cmV0dXJuIGAke3ByZWZpeH0ke2RheU9mV2Vla30sICR7Zm9ybWF0dGVkRGF0ZX1gO1xyXG5cdH1cclxuXHJcblx0Ly8gSGVscGVyIHRvIGRlY2lkZSBpZiBhIGZ1dHVyZSBzZWN0aW9uIHNob3VsZCBiZSBleHBhbmRlZCByZWxhdGl2ZSB0byBhIGNvbXBhcmlzb24gZGF0ZVxyXG5cdHByaXZhdGUgc2hvdWxkRXhwYW5kRnV0dXJlU2VjdGlvbihcclxuXHRcdHNlY3Rpb25EYXRlOiBEYXRlLFxyXG5cdFx0Y29tcGFyZURhdGU6IERhdGVcclxuXHQpOiBib29sZWFuIHtcclxuXHRcdGNvbnN0IGNvbXBhcmVUaW1lc3RhbXAgPSBuZXcgRGF0ZShjb21wYXJlRGF0ZSkuc2V0SG91cnMoMCwgMCwgMCwgMCk7XHJcblx0XHRjb25zdCBzZWN0aW9uVGltZXN0YW1wID0gbmV3IERhdGUoc2VjdGlvbkRhdGUpLnNldEhvdXJzKDAsIDAsIDAsIDApO1xyXG5cdFx0Ly8gQ2FsY3VsYXRlIGRpZmZlcmVuY2UgaW4gZGF5cyBmcm9tIHRoZSBjb21wYXJpc29uIGRhdGVcclxuXHRcdGNvbnN0IGRheURpZmYgPSBNYXRoLnJvdW5kKFxyXG5cdFx0XHQoc2VjdGlvblRpbWVzdGFtcCAtIGNvbXBhcmVUaW1lc3RhbXApIC8gKDEwMDAgKiAzNjAwICogMjQpXHJcblx0XHQpO1xyXG5cdFx0Ly8gRXhwYW5kIGlmIHRoZSBzZWN0aW9uIGRhdGUgaXMgd2l0aGluIHRoZSBuZXh0IDcgZGF5cyAqYWZ0ZXIqIHRoZSBjb21wYXJpc29uIGRhdGVcclxuXHRcdHJldHVybiBkYXlEaWZmID4gMCAmJiBkYXlEaWZmIDw9IDc7XHJcblx0fVxyXG5cclxuXHQvLyBSZW5hbWluZyBnZXRUYXNrc0ZvckRhdGUgdG8gYmUgbW9yZSBzcGVjaWZpYyBhYm91dCBpdHMgY2hlY2tcclxuXHRwcml2YXRlIGdldFRhc2tzRm9yUmVsZXZhbnREYXRlKGRhdGU6IERhdGUpOiBUYXNrW10ge1xyXG5cdFx0aWYgKCFkYXRlKSByZXR1cm4gW107XHJcblxyXG5cdFx0Y29uc3QgdGFyZ2V0VGltZXN0YW1wID0gbmV3IERhdGUoZGF0ZSkuc2V0SG91cnMoMCwgMCwgMCwgMCk7XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMuYWxsVGFza3MuZmlsdGVyKCh0YXNrKSA9PiB7XHJcblx0XHRcdGNvbnN0IHJlbGV2YW50VGltZXN0YW1wID0gdGhpcy5nZXRSZWxldmFudERhdGUodGFzayk7XHJcblx0XHRcdHJldHVybiByZWxldmFudFRpbWVzdGFtcCA9PT0gdGFyZ2V0VGltZXN0YW1wO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgdXBkYXRlVGFzayh1cGRhdGVkVGFzazogVGFzaykge1xyXG5cdFx0Ly8gVXBkYXRlIGluIHRoZSBtYWluIGxpc3RcclxuXHRcdGNvbnN0IHRhc2tJbmRleCA9IHRoaXMuYWxsVGFza3MuZmluZEluZGV4KFxyXG5cdFx0XHQodCkgPT4gdC5pZCA9PT0gdXBkYXRlZFRhc2suaWRcclxuXHRcdCk7XHJcblx0XHRpZiAodGFza0luZGV4ICE9PSAtMSkge1xyXG5cdFx0XHR0aGlzLmFsbFRhc2tzW3Rhc2tJbmRleF0gPSB1cGRhdGVkVGFzaztcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMuYWxsVGFza3MucHVzaCh1cGRhdGVkVGFzayk7IC8vIEFkZCBpZiBuZXdcclxuXHRcdH1cclxuXHRcdHRoaXMuYWxsVGFza3NNYXAuc2V0KHVwZGF0ZWRUYXNrLmlkLCB1cGRhdGVkVGFzayk7XHJcblxyXG5cdFx0Ly8gUmUtY2F0ZWdvcml6ZSB0YXNrcyBiYXNlZCBvbiBwb3RlbnRpYWxseSBjaGFuZ2VkIHJlbGV2YW50RGF0ZVxyXG5cdFx0dGhpcy5jYXRlZ29yaXplVGFza3MoKTtcclxuXHJcblx0XHR0aGlzLnVwZGF0ZUhlYWRlckNvdW50KCk7XHJcblx0XHR0aGlzLnVwZGF0ZVRhc2tTdGF0cygpO1xyXG5cdFx0dGhpcy51cGRhdGVEdWVTb29uU2VjdGlvbigpO1xyXG5cdFx0dGhpcy5jYWxlbmRhckNvbXBvbmVudC5zZXRUYXNrcyh0aGlzLmFsbFRhc2tzKTtcclxuXHJcblx0XHQvLyBSZWZyZXNoIFVJIGJhc2VkIG9uIGN1cnJlbnQgdmlldyBzdGF0ZSAoZmlsdGVyZWQgb3IgZnVsbClcclxuXHRcdGlmICh0aGlzLmZvY3VzRmlsdGVyKSB7XHJcblx0XHRcdHRoaXMuZm9jdXNUYXNrTGlzdCh0aGlzLmZvY3VzRmlsdGVyKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMucmVmcmVzaERhdGVTZWN0aW9uc1VJKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNsZWFudXBSZW5kZXJlcnMoKSB7XHJcblx0XHR0aGlzLmRhdGVTZWN0aW9ucy5mb3JFYWNoKChzZWN0aW9uKSA9PiB7XHJcblx0XHRcdGlmIChzZWN0aW9uLnJlbmRlcmVyKSB7XHJcblx0XHRcdFx0dGhpcy5yZW1vdmVDaGlsZChzZWN0aW9uLnJlbmRlcmVyKTtcclxuXHRcdFx0XHRzZWN0aW9uLnJlbmRlcmVyID0gdW5kZWZpbmVkO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHRcdC8vIENsZWFyIHRoZSBjb250YWluZXIgbWFudWFsbHlcclxuXHRcdHRoaXMudGFza0xpc3RDb250YWluZXJFbC5lbXB0eSgpO1xyXG5cdH1cclxuXHJcblx0b251bmxvYWQoKSB7XHJcblx0XHQvLyBSZW5kZXJlcnMgYXJlIGNoaWxkcmVuLCBoYW5kbGVkIGJ5IE9ic2lkaWFuIHVubG9hZC5cclxuXHRcdC8vIE5vIG5lZWQgdG8gbWFudWFsbHkgcmVtb3ZlIERPTSBldmVudCBsaXN0ZW5lcnMgcmVnaXN0ZXJlZCB3aXRoIHRoaXMucmVnaXN0ZXJEb21FdmVudFxyXG5cdFx0dGhpcy5jb250YWluZXJFbC5lbXB0eSgpO1xyXG5cdFx0dGhpcy5jb250YWluZXJFbC5yZW1vdmUoKTtcclxuXHR9XHJcblxyXG5cdC8vIFRvZ2dsZSBsZWZ0IGNvbHVtbiB2aXNpYmlsaXR5IHdpdGggYW5pbWF0aW9uIHN1cHBvcnRcclxuXHRwcml2YXRlIHRvZ2dsZUxlZnRDb2x1bW5WaXNpYmlsaXR5KHZpc2libGU/OiBib29sZWFuKSB7XHJcblx0XHRpZiAodmlzaWJsZSA9PT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdC8vIFRvZ2dsZSBiYXNlZCBvbiBjdXJyZW50IHN0YXRlXHJcblx0XHRcdHZpc2libGUgPSAhdGhpcy5sZWZ0Q29sdW1uRWwuaGFzQ2xhc3MoXCJpcy12aXNpYmxlXCIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh2aXNpYmxlKSB7XHJcblx0XHRcdHRoaXMubGVmdENvbHVtbkVsLmFkZENsYXNzKFwiaXMtdmlzaWJsZVwiKTtcclxuXHRcdFx0dGhpcy5sZWZ0Q29sdW1uRWwuc2hvdygpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy5sZWZ0Q29sdW1uRWwucmVtb3ZlQ2xhc3MoXCJpcy12aXNpYmxlXCIpO1xyXG5cclxuXHRcdFx0Ly8gV2FpdCBmb3IgYW5pbWF0aW9uIHRvIGNvbXBsZXRlIGJlZm9yZSBoaWRpbmdcclxuXHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0aWYgKCF0aGlzLmxlZnRDb2x1bW5FbC5oYXNDbGFzcyhcImlzLXZpc2libGVcIikpIHtcclxuXHRcdFx0XHRcdHRoaXMubGVmdENvbHVtbkVsLmhpZGUoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sIDMwMCk7IC8vIE1hdGNoIENTUyB0cmFuc2l0aW9uIGR1cmF0aW9uXHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldFJlbGV2YW50RGF0ZSh0YXNrOiBUYXNrKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcclxuXHRcdC8vIFByaW9yaXRpemUgc2NoZWR1bGVkRGF0ZSwgZmFsbGJhY2sgdG8gZHVlRGF0ZVxyXG5cdFx0Y29uc3QgZGF0ZVRvVXNlID0gdGFzay5tZXRhZGF0YS5zY2hlZHVsZWREYXRlIHx8IHRhc2subWV0YWRhdGEuZHVlRGF0ZTtcclxuXHRcdGlmICghZGF0ZVRvVXNlKSByZXR1cm4gdW5kZWZpbmVkO1xyXG5cclxuXHRcdC8vIFJldHVybiB0aW1lc3RhbXAgKG9yIERhdGUgb2JqZWN0IGlmIG5lZWRlZCBlbHNld2hlcmUsIGJ1dCB0aW1lc3RhbXAgaXMgZ29vZCBmb3IgY29tcGFyaXNvbnMpXHJcblx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUoZGF0ZVRvVXNlKTtcclxuXHRcdGRhdGUuc2V0SG91cnMoMCwgMCwgMCwgMCk7IC8vIFplcm8gb3V0IHRpbWUgZm9yIGNvbnNpc3RlbnQgY29tcGFyaXNvblxyXG5cdFx0cmV0dXJuIGRhdGUuZ2V0VGltZSgpO1xyXG5cdH1cclxufVxyXG4iXX0=