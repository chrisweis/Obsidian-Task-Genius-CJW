import { __awaiter } from "tslib";
import { Component, setIcon } from "obsidian";
import { ContentComponent } from "@/components/features/task/view/content";
import { ForecastComponent } from "@/components/features/task/view/forecast";
import { TagsComponent } from "@/components/features/task/view/tags";
import { ProjectsComponent } from "@/components/features/task/view/projects";
import { ReviewComponent } from "@/components/features/task/view/review";
import { Habit } from "@/components/features/habit/habit";
import { CalendarComponent } from "@/components/features/calendar";
import { KanbanComponent } from "@/components/features/kanban/kanban";
import { GanttComponent } from "@/components/features/gantt/gantt";
import { ViewComponentManager } from "@/components/ui/behavior/ViewComponentManager";
import { TaskPropertyTwoColumnView } from "@/components/features/task/view/TaskPropertyTwoColumnView";
import { getViewSettingOrDefault, } from "@/common/setting-definition";
import { filterTasks } from "@/utils/task/task-filter-utils";
import { QuickCaptureModal } from "@/components/features/quick-capture/modals/QuickCaptureModal";
import { t } from "@/translations/helper";
// View mode configuration for each view type
const VIEW_MODE_CONFIG = {
    // Content-based views - support all modes
    inbox: ["list", "tree", "kanban", "calendar"],
    today: ["list", "tree", "kanban", "calendar"],
    upcoming: ["list", "tree", "kanban", "calendar"],
    flagged: ["list", "tree", "kanban", "calendar"],
    projects: ["list", "tree", "kanban", "calendar"],
    // Specialized views with limited or no modes
    tags: [],
    review: [],
    forecast: [],
    habit: [],
    gantt: [],
    calendar: [],
    kanban: [],
};
/**
 * FluentComponentManager - Manages view component lifecycle
 *
 * Responsibilities:
 * - Initialize all view components (Content, Forecast, Tags, Calendar, Kanban, etc.)
 * - Show/hide components based on active view
 * - Switch between views (inbox, today, projects, calendar, etc.)
 * - Render content with different view modes (list, tree, kanban, calendar)
 * - Render loading, error, and empty states
 */
export class FluentComponentManager extends Component {
    constructor(app, plugin, contentArea, parentView, viewHandlers) {
        super();
        this.app = app;
        this.plugin = plugin;
        this.contentArea = contentArea;
        this.parentView = parentView;
        // Two column view components
        this.twoColumnViewComponents = new Map();
        // Track currently visible component
        this.currentVisibleComponent = null;
        this.viewHandlers = viewHandlers;
    }
    /**
     * Initialize all view components
     */
    initializeViewComponents() {
        console.log("[FluentComponent] initializeViewComponents started");
        // Initialize ViewComponentManager for special views
        const viewHandlers = {
            onTaskSelected: (task) => this.viewHandlers.onTaskSelected(task),
            onTaskCompleted: (task) => this.viewHandlers.onTaskCompleted(task),
            onTaskUpdate: (originalTask, updatedTask) => __awaiter(this, void 0, void 0, function* () {
                yield this.viewHandlers.onTaskUpdate(originalTask, updatedTask);
            }),
            onTaskContextMenu: (event, task) => this.viewHandlers.onTaskContextMenu(event, task),
        };
        this.viewComponentManager = new ViewComponentManager(this.parentView, this.app, this.plugin, this.contentArea, viewHandlers);
        this.parentView.addChild(this.viewComponentManager);
        // Initialize ContentComponent (handles inbox, today, upcoming, flagged)
        console.log("[FluentComponent] Creating ContentComponent");
        this.contentComponent = new ContentComponent(this.contentArea, this.app, this.plugin, {
            onTaskSelected: (task) => {
                if (task)
                    this.viewHandlers.onTaskSelected(task);
            },
            onTaskCompleted: (task) => {
                if (task)
                    this.viewHandlers.onTaskCompleted(task);
            },
            onTaskContextMenu: (event, task) => {
                if (task)
                    this.viewHandlers.onTaskContextMenu(event, task);
            },
        });
        this.parentView.addChild(this.contentComponent);
        this.contentComponent.load();
        // Initialize ForecastComponent
        this.forecastComponent = new ForecastComponent(this.contentArea, this.app, this.plugin, {
            onTaskSelected: (task) => {
                if (task)
                    this.viewHandlers.onTaskSelected(task);
            },
            onTaskCompleted: (task) => {
                if (task)
                    this.viewHandlers.onTaskCompleted(task);
            },
            onTaskUpdate: (originalTask, updatedTask) => __awaiter(this, void 0, void 0, function* () {
                if (originalTask && updatedTask) {
                    yield this.viewHandlers.onTaskUpdate(originalTask, updatedTask);
                }
            }),
            onTaskContextMenu: (event, task) => {
                if (task)
                    this.viewHandlers.onTaskContextMenu(event, task);
            },
        });
        this.parentView.addChild(this.forecastComponent);
        this.forecastComponent.load();
        // Initialize TagsComponent
        this.tagsComponent = new TagsComponent(this.contentArea, this.app, this.plugin, {
            onTaskSelected: (task) => {
                if (task)
                    this.viewHandlers.onTaskSelected(task);
            },
            onTaskCompleted: (task) => {
                if (task)
                    this.viewHandlers.onTaskCompleted(task);
            },
            onTaskUpdate: (originalTask, updatedTask) => __awaiter(this, void 0, void 0, function* () {
                if (originalTask && updatedTask) {
                    yield this.viewHandlers.onTaskUpdate(originalTask, updatedTask);
                }
            }),
            onTaskContextMenu: (event, task) => {
                if (task)
                    this.viewHandlers.onTaskContextMenu(event, task);
            },
        });
        this.parentView.addChild(this.tagsComponent);
        this.tagsComponent.load();
        // Initialize ProjectsComponent
        this.projectsComponent = new ProjectsComponent(this.contentArea, this.app, this.plugin, {
            onTaskSelected: (task) => {
                if (task)
                    this.viewHandlers.onTaskSelected(task);
            },
            onTaskCompleted: (task) => {
                if (task)
                    this.viewHandlers.onTaskCompleted(task);
            },
            onTaskUpdate: (originalTask, updatedTask) => __awaiter(this, void 0, void 0, function* () {
                if (originalTask && updatedTask) {
                    yield this.viewHandlers.onTaskUpdate(originalTask, updatedTask);
                }
            }),
            onTaskContextMenu: (event, task) => {
                if (task)
                    this.viewHandlers.onTaskContextMenu(event, task);
            },
        });
        this.parentView.addChild(this.projectsComponent);
        this.projectsComponent.load();
        // Initialize ReviewComponent
        this.reviewComponent = new ReviewComponent(this.contentArea, this.app, this.plugin, {
            onTaskSelected: (task) => {
                if (task)
                    this.viewHandlers.onTaskSelected(task);
            },
            onTaskCompleted: (task) => {
                if (task)
                    this.viewHandlers.onTaskCompleted(task);
            },
            onTaskUpdate: (originalTask, updatedTask) => __awaiter(this, void 0, void 0, function* () {
                if (originalTask && updatedTask) {
                    yield this.viewHandlers.onTaskUpdate(originalTask, updatedTask);
                }
            }),
            onTaskContextMenu: (event, task) => {
                if (task)
                    this.viewHandlers.onTaskContextMenu(event, task);
            },
        });
        this.parentView.addChild(this.reviewComponent);
        this.reviewComponent.load();
        // Initialize HabitComponent
        this.habitComponent = new Habit(this.plugin, this.contentArea);
        this.parentView.addChild(this.habitComponent);
        this.habitComponent.load();
        // Initialize CalendarComponent
        this.calendarComponent = new CalendarComponent(this.app, this.plugin, this.contentArea, [], // tasks will be set later
        {
            onTaskSelected: (task) => {
                if (task)
                    this.viewHandlers.onTaskSelected(task);
            },
            onTaskCompleted: (task) => {
                if (task)
                    this.viewHandlers.onTaskCompleted(task);
            },
            onEventContextMenu: (ev, event) => {
                if (event)
                    this.viewHandlers.onTaskContextMenu(ev, event);
            },
        });
        this.parentView.addChild(this.calendarComponent);
        // Initialize KanbanComponent
        this.kanbanComponent = new KanbanComponent(this.app, this.plugin, this.contentArea, [], // tasks will be set later
        {
            onTaskStatusUpdate: (taskId, newStatusMark) => __awaiter(this, void 0, void 0, function* () {
                this.viewHandlers.onKanbanTaskStatusUpdate(taskId, newStatusMark);
            }),
            onTaskSelected: (task) => {
                if (task)
                    this.viewHandlers.onTaskSelected(task);
            },
            onTaskCompleted: (task) => {
                if (task)
                    this.viewHandlers.onTaskCompleted(task);
            },
            onTaskContextMenu: (event, task) => {
                if (task)
                    this.viewHandlers.onTaskContextMenu(event, task);
            },
        });
        this.parentView.addChild(this.kanbanComponent);
        // Initialize GanttComponent
        this.ganttComponent = new GanttComponent(this.plugin, this.contentArea, {
            onTaskSelected: (task) => this.viewHandlers.onTaskSelected(task),
            onTaskCompleted: (task) => this.viewHandlers.onTaskCompleted(task),
            onTaskContextMenu: (event, task) => this.viewHandlers.onTaskContextMenu(event, task),
        });
        this.parentView.addChild(this.ganttComponent);
        this.ganttComponent.load();
        // Create legacy containers for backward compatibility
        this.listContainer = this.contentArea.createDiv({
            cls: "task-list-container",
            attr: { style: "display: none;" },
        });
        this.treeContainer = this.contentArea.createDiv({
            cls: "task-tree-container",
            attr: { style: "display: none;" },
        });
        // Hide all components initially
        console.log("[FluentComponent] Hiding all components initially");
        this.hideAllComponents(true);
        console.log("[FluentComponent] initializeViewComponents completed");
    }
    /**
     * Hide all components
     */
    hideAllComponents(forceHideAll = false) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
        const isInitialHide = forceHideAll;
        // Smart hiding - only hide currently visible component (unless initial hide)
        if (!isInitialHide && this.currentVisibleComponent) {
            console.log("[FluentComponent] Smart hide - only hiding current visible component");
            (_a = this.currentVisibleComponent.containerEl) === null || _a === void 0 ? void 0 : _a.hide();
            this.currentVisibleComponent = null;
        }
        else {
            // Hide all components
            console.log("[FluentComponent] Hiding all components", isInitialHide ? "(initial hide)" : "");
            (_b = this.contentComponent) === null || _b === void 0 ? void 0 : _b.containerEl.hide();
            (_c = this.forecastComponent) === null || _c === void 0 ? void 0 : _c.containerEl.hide();
            (_d = this.tagsComponent) === null || _d === void 0 ? void 0 : _d.containerEl.hide();
            (_e = this.projectsComponent) === null || _e === void 0 ? void 0 : _e.containerEl.hide();
            (_f = this.reviewComponent) === null || _f === void 0 ? void 0 : _f.containerEl.hide();
            (_g = this.habitComponent) === null || _g === void 0 ? void 0 : _g.containerEl.hide();
            (_h = this.calendarComponent) === null || _h === void 0 ? void 0 : _h.containerEl.hide();
            (_j = this.kanbanComponent) === null || _j === void 0 ? void 0 : _j.containerEl.hide();
            (_k = this.ganttComponent) === null || _k === void 0 ? void 0 : _k.containerEl.hide();
            (_l = this.viewComponentManager) === null || _l === void 0 ? void 0 : _l.hideAllComponents();
            // Hide two column views
            this.twoColumnViewComponents.forEach((component) => {
                component.containerEl.hide();
            });
            // Hide legacy containers
            (_m = this.listContainer) === null || _m === void 0 ? void 0 : _m.hide();
            (_o = this.treeContainer) === null || _o === void 0 ? void 0 : _o.hide();
        }
    }
    /**
     * Switch to a specific view
     */
    switchView(viewId, tasks, filteredTasks, currentFilterState, viewMode, project) {
        var _a, _b, _c;
        console.log("[FluentComponent] switchView called with:", viewId, "viewMode:", viewMode);
        // Remove transient overlays (loading/error/empty) before showing components
        if (this.contentArea) {
            this.contentArea
                .querySelectorAll(".tg-fluent-loading, .tg-fluent-error-state, .tg-fluent-empty-state")
                .forEach((el) => el.remove());
        }
        // Hide all components first
        console.log("[FluentComponent] Hiding all components");
        this.hideAllComponents();
        // Check if current view supports multiple view modes and we're in a non-list mode
        const viewModes = this.getAvailableModesForView(viewId);
        // If the current view mode is not available for this view, reset to first available or list
        if (viewModes.length > 0 && !viewModes.includes(viewMode)) {
            viewMode = viewModes[0];
        }
        console.log("[FluentComponent] Is content-based view?", this.isContentBasedView(viewId), "View mode:", viewMode, "Available modes:", viewModes);
        if (this.isContentBasedView(viewId) &&
            viewModes.length > 0 &&
            viewMode !== "list" &&
            viewMode !== "tree") {
            // For content-based views in kanban/calendar mode, use special rendering
            console.log("[FluentComponent] Using renderContentWithViewMode for non-list/tree mode:", viewMode);
            this.renderContentWithViewMode(viewId, tasks, filteredTasks, viewMode);
            return;
        }
        // Get view configuration
        const viewConfig = getViewSettingOrDefault(this.plugin, viewId);
        let targetComponent = null;
        let modeForComponent = viewId;
        // Handle TwoColumn views
        if (((_a = viewConfig.specificConfig) === null || _a === void 0 ? void 0 : _a.viewType) === "twocolumn") {
            if (!this.twoColumnViewComponents.has(viewId)) {
                const twoColumnConfig = viewConfig.specificConfig;
                const twoColumnComponent = new TaskPropertyTwoColumnView(this.contentArea, this.app, this.plugin, twoColumnConfig, viewId);
                this.parentView.addChild(twoColumnComponent);
                // Set up event handlers
                twoColumnComponent.onTaskSelected = (task) => this.viewHandlers.onTaskSelected(task);
                twoColumnComponent.onTaskCompleted = (task) => this.viewHandlers.onTaskCompleted(task);
                twoColumnComponent.onTaskContextMenu = (event, task) => this.viewHandlers.onTaskContextMenu(event, task);
                this.twoColumnViewComponents.set(viewId, twoColumnComponent);
            }
            targetComponent = this.twoColumnViewComponents.get(viewId);
        }
        else {
            // Check special view types
            const specificViewType = (_b = viewConfig.specificConfig) === null || _b === void 0 ? void 0 : _b.viewType;
            // Check if it's a special view managed by ViewComponentManager
            if (this.viewComponentManager.isSpecialView(viewId)) {
                targetComponent =
                    this.viewComponentManager.showComponent(viewId);
            }
            else if (specificViewType === "forecast" ||
                viewId === "forecast") {
                targetComponent = this.forecastComponent;
            }
            else {
                // Standard view types
                switch (viewId) {
                    case "habit":
                        targetComponent = this.habitComponent;
                        break;
                    case "tags":
                        targetComponent = this.tagsComponent;
                        break;
                    case "projects":
                        // In V2, Projects is treated as a content-based view using global project filters
                        targetComponent = this.contentComponent;
                        modeForComponent = viewId;
                        break;
                    case "review":
                        targetComponent = this.reviewComponent;
                        break;
                    case "calendar":
                        targetComponent = this.calendarComponent;
                        break;
                    case "kanban":
                        targetComponent = this.kanbanComponent;
                        break;
                    case "gantt":
                        targetComponent = this.ganttComponent;
                        break;
                    case "inbox":
                    case "today":
                    case "upcoming":
                    case "flagged":
                    default:
                        // These are handled by ContentComponent
                        targetComponent = this.contentComponent;
                        modeForComponent = viewId;
                        break;
                }
            }
        }
        console.log("[FluentComponent] Target component determined:", (_c = targetComponent === null || targetComponent === void 0 ? void 0 : targetComponent.constructor) === null || _c === void 0 ? void 0 : _c.name);
        if (targetComponent) {
            console.log(`[FluentComponent] Activating component for view ${viewId}:`, targetComponent.constructor.name);
            targetComponent.containerEl.show();
            this.currentVisibleComponent = targetComponent;
            // Set view mode first for ContentComponent
            if (typeof targetComponent.setViewMode === "function") {
                console.log(`[FluentComponent] Setting view mode for ${viewId} to ${modeForComponent}`);
                targetComponent.setViewMode(modeForComponent, project);
            }
            // Set tasks on the component
            if (typeof targetComponent.setTasks === "function") {
                // Special handling for components that need only all tasks (single parameter)
                if (viewId === "review" || viewId === "tags") {
                    console.log(`[FluentComponent] Calling setTasks for ${viewId} with ALL tasks:`, tasks.length);
                    targetComponent.setTasks(tasks);
                }
                else {
                    // Use filtered tasks
                    let filteredTasksLocal = [...filteredTasks];
                    // Forecast view: remove badge-only items
                    if (viewId === "forecast") {
                        filteredTasksLocal = filteredTasksLocal.filter((task) => !task.badge);
                    }
                    console.log("[FluentComponent] Calling setTasks with filtered:", filteredTasksLocal.length, "all:", tasks.length);
                    targetComponent.setTasks(filteredTasksLocal, tasks);
                }
            }
            // Handle updateTasks method for table view adapter
            if (typeof targetComponent.updateTasks === "function") {
                const filterOptions = {};
                if (currentFilterState &&
                    currentFilterState.filterGroups &&
                    currentFilterState.filterGroups.length > 0) {
                    filterOptions.advancedFilter = currentFilterState;
                }
                targetComponent.updateTasks(filterTasks(tasks, viewId, this.plugin, filterOptions));
            }
            // Refresh review settings if needed
            if (viewId === "review" &&
                typeof targetComponent.refreshReviewSettings === "function") {
                targetComponent.refreshReviewSettings();
            }
        }
        else {
            console.warn(`[FluentComponent] No target component found for viewId: ${viewId}`);
        }
    }
    /**
     * Render content with specific view mode (list/tree/kanban/calendar)
     */
    renderContentWithViewMode(viewId, tasks, filteredTasks, viewMode) {
        console.log("[FluentComponent] renderContentWithViewMode called, viewMode:", viewMode);
        // Hide current component
        this.hideAllComponents();
        // Based on the current view mode, show the appropriate component
        switch (viewMode) {
            case "list":
            case "tree":
                // Use ContentComponent for list and tree views
                if (!this.contentComponent)
                    return;
                this.contentComponent.containerEl.show();
                this.contentComponent.setViewMode(viewId);
                this.contentComponent.setIsTreeView(viewMode === "tree");
                console.log("[FluentComponent] Setting tasks to ContentComponent, filtered:", filteredTasks.length);
                this.contentComponent.setTasks(filteredTasks, tasks);
                this.currentVisibleComponent = this.contentComponent;
                break;
            case "kanban":
                // Use KanbanComponent
                if (!this.kanbanComponent)
                    return;
                this.kanbanComponent.containerEl.show();
                console.log("[FluentComponent] Setting", filteredTasks.length, "tasks to kanban");
                this.kanbanComponent.setTasks(filteredTasks);
                this.currentVisibleComponent = this.kanbanComponent;
                break;
            case "calendar":
                // Use CalendarComponent
                console.log("[FluentComponent] Calendar mode in renderContentWithViewMode");
                if (!this.calendarComponent) {
                    console.log("[FluentComponent] No calendar component available!");
                    return;
                }
                console.log("[FluentComponent] Showing calendar component");
                this.calendarComponent.containerEl.show();
                console.log("[FluentComponent] Setting", filteredTasks.length, "tasks to calendar");
                this.calendarComponent.setTasks(filteredTasks);
                this.currentVisibleComponent = this.calendarComponent;
                console.log("[FluentComponent] Calendar mode setup complete");
                break;
        }
    }
    /**
     * Refresh current view data without full re-render
     */
    refreshCurrentViewData(viewId, tasks, filteredTasks, viewMode) {
        var _a, _b, _c, _d, _e, _f, _g;
        // Content-based views (list/tree/kanban/calendar)
        if (this.isContentBasedView(viewId)) {
            switch (viewMode) {
                case "kanban":
                    (_b = (_a = this.kanbanComponent) === null || _a === void 0 ? void 0 : _a.setTasks) === null || _b === void 0 ? void 0 : _b.call(_a, filteredTasks);
                    break;
                case "calendar":
                    (_d = (_c = this.calendarComponent) === null || _c === void 0 ? void 0 : _c.setTasks) === null || _d === void 0 ? void 0 : _d.call(_c, filteredTasks);
                    break;
                case "tree":
                case "list":
                default:
                    (_f = (_e = this.contentComponent) === null || _e === void 0 ? void 0 : _e.setTasks) === null || _f === void 0 ? void 0 : _f.call(_e, filteredTasks, tasks, true);
                    break;
            }
            return;
        }
        // Special/other views
        if ((_g = this.viewComponentManager) === null || _g === void 0 ? void 0 : _g.isSpecialView(viewId)) {
            const comp = this.viewComponentManager.getOrCreateComponent(viewId);
            if (comp === null || comp === void 0 ? void 0 : comp.updateTasks) {
                comp.updateTasks(filteredTasks);
            }
            else if (comp === null || comp === void 0 ? void 0 : comp.setTasks) {
                comp.setTasks(filteredTasks, tasks);
            }
            return;
        }
        // Direct known components fallback
        const mapping = {
            forecast: this.forecastComponent,
            tags: this.tagsComponent,
            projects: this.contentComponent,
            review: this.reviewComponent,
            habit: this.habitComponent,
            gantt: this.ganttComponent,
            kanban: this.kanbanComponent,
            calendar: this.calendarComponent,
        };
        const target = mapping[viewId];
        if (target === null || target === void 0 ? void 0 : target.setTasks) {
            if (viewId === "projects" || this.isContentBasedView(viewId)) {
                target.setTasks(filteredTasks, tasks, true);
            }
            else if (viewId === "review" || viewId === "tags") {
                target.setTasks(tasks);
            }
            else {
                target.setTasks(filteredTasks);
            }
        }
        else if (target === null || target === void 0 ? void 0 : target.updateTasks) {
            target.updateTasks(filteredTasks);
        }
    }
    /**
     * Render loading state
     */
    renderLoadingState() {
        console.log("[FluentComponent] renderLoadingState called");
        if (this.contentArea) {
            // Remove existing loading overlays
            this.contentArea
                .querySelectorAll(".tg-fluent-loading")
                .forEach((el) => el.remove());
            const loadingEl = this.contentArea.createDiv({
                cls: "tg-fluent-loading",
            });
            loadingEl.createDiv({ cls: "tg-fluent-spinner" });
            loadingEl.createDiv({
                cls: "tg-fluent-loading-text",
                text: t("Loading tasks..."),
            });
        }
    }
    /**
     * Render error state
     */
    renderErrorState(errorMessage, onRetry) {
        if (this.contentArea) {
            this.contentArea
                .querySelectorAll(".tg-fluent-error-state")
                .forEach((el) => el.remove());
            const errorEl = this.contentArea.createDiv({
                cls: "tg-fluent-error-state",
            });
            const errorIcon = errorEl.createDiv({
                cls: "tg-fluent-error-icon",
            });
            setIcon(errorIcon, "alert-triangle");
            errorEl.createDiv({
                cls: "tg-fluent-error-title",
                text: t("Failed to load tasks"),
            });
            errorEl.createDiv({
                cls: "tg-fluent-error-message",
                text: errorMessage || t("An unexpected error occurred"),
            });
            const retryBtn = errorEl.createEl("button", {
                cls: "tg-fluent-button tg-fluent-button-primary",
                text: t("Retry"),
            });
            retryBtn.addEventListener("click", onRetry);
        }
    }
    /**
     * Render empty state
     */
    renderEmptyState() {
        if (this.contentArea) {
            this.contentArea
                .querySelectorAll(".tg-fluent-empty-state")
                .forEach((el) => el.remove());
            const emptyEl = this.contentArea.createDiv({
                cls: "tg-fluent-empty-state",
            });
            const emptyIcon = emptyEl.createDiv({
                cls: "tg-fluent-empty-icon",
            });
            setIcon(emptyIcon, "inbox");
            emptyEl.createDiv({
                cls: "tg-fluent-empty-title",
                text: t("No tasks yet"),
            });
            emptyEl.createDiv({
                cls: "tg-fluent-empty-description",
                text: t("Create your first task to get started with Task Genius"),
            });
            const createBtn = emptyEl.createEl("button", {
                cls: "tg-fluent-button tg-fluent-button-primary",
                text: t("Create Task"),
            });
            createBtn.addEventListener("click", () => {
                new QuickCaptureModal(this.app, this.plugin).open();
            });
        }
    }
    /**
     * Check if view is content-based (supports multiple view modes)
     */
    isContentBasedView(viewId) {
        const contentBasedViews = [
            "inbox",
            "today",
            "upcoming",
            "flagged",
            "projects",
        ];
        return contentBasedViews.includes(viewId);
    }
    /**
     * Get available view modes for a specific view
     */
    getAvailableModesForView(viewId) {
        var _a, _b;
        // Check for special two-column views
        const viewConfig = getViewSettingOrDefault(this.plugin, viewId);
        if (((_a = viewConfig === null || viewConfig === void 0 ? void 0 : viewConfig.specificConfig) === null || _a === void 0 ? void 0 : _a.viewType) === "twocolumn") {
            return [];
        }
        // Check for special views managed by ViewComponentManager
        if ((_b = this.viewComponentManager) === null || _b === void 0 ? void 0 : _b.isSpecialView(viewId)) {
            return [];
        }
        // Return the configured modes for the view, or empty array
        return VIEW_MODE_CONFIG[viewId] || [];
    }
    /**
     * Clean up on unload
     */
    onunload() {
        // Components will be cleaned up by parent Component lifecycle
        super.onunload();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmx1ZW50Q29tcG9uZW50TWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkZsdWVudENvbXBvbmVudE1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBTyxTQUFTLEVBQUUsT0FBTyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBR25ELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDekUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDbkUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDckYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDdEcsT0FBTyxFQUFFLHVCQUF1QixHQUE0QixNQUFNLDZCQUE2QixDQUFDO0FBQ2hHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUU3RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFHMUMsNkNBQTZDO0FBQzdDLE1BQU0sZ0JBQWdCLEdBQStCO0lBQ3BELDBDQUEwQztJQUMxQyxLQUFL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Q0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNyRCxDQUFDLENBQUMsQ0FBQztTQUNIO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0ssa0JBQWtCLENBQUMsTUFBYztRQUN4QyxNQUFNLGlCQUFpQixHQUFHO1lBQ3pCLE9BQU87WUFDUCxPQUFPO1lBQ1AsVUFBVTtZQUNWLFNBQVM7WUFDVCxVQUFVO1NBQ1YsQ0FBQztRQUNGLE9BQU8saUJBQWlCLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFRDs7T0FFRztJQUNILHdCQUF3QixDQUFDLE1BQWM7O1FBQ3RDLHFDQUFxQztRQUNyQyxNQUFNLFVBQVUsR0FBRyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLE1BQWEsQ0FBQyxDQUFDO1FBQ3ZFLElBQUksQ0FBQSxNQUFBLFVBQVUsYUFBVixVQUFVLHVCQUFWLFVBQVUsQ0FBRSxjQUFjLDBDQUFFLFFBQVEsTUFBSyxXQUFXLEVBQUU7WUFDekQsT0FBTyxFQUFFLENBQUM7U0FDVjtRQUVELDBEQUEwRDtRQUMxRCxJQUFJLE1BQUEsSUFBSSxDQUFDLG9CQUFvQiwwQ0FBRSxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDckQsT0FBTyxFQUFFLENBQUM7U0FDVjtRQUVELDJEQUEyRDtRQUMzRCxPQUFPLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUN2QyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxRQUFRO1FBQ1AsOERBQThEO1FBQzlELEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNsQixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHAsIENvbXBvbmVudCwgc2V0SWNvbiB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiQC90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7IENvbnRlbnRDb21wb25lbnQgfSBmcm9tIFwiQC9jb21wb25lbnRzL2ZlYXR1cmVzL3Rhc2svdmlldy9jb250ZW50XCI7XHJcbmltcG9ydCB7IEZvcmVjYXN0Q29tcG9uZW50IH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy90YXNrL3ZpZXcvZm9yZWNhc3RcIjtcclxuaW1wb3J0IHsgVGFnc0NvbXBvbmVudCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay92aWV3L3RhZ3NcIjtcclxuaW1wb3J0IHsgUHJvamVjdHNDb21wb25lbnQgfSBmcm9tIFwiQC9jb21wb25lbnRzL2ZlYXR1cmVzL3Rhc2svdmlldy9wcm9qZWN0c1wiO1xyXG5pbXBvcnQgeyBSZXZpZXdDb21wb25lbnQgfSBmcm9tIFwiQC9jb21wb25lbnRzL2ZlYXR1cmVzL3Rhc2svdmlldy9yZXZpZXdcIjtcclxuaW1wb3J0IHsgSGFiaXQgfSBmcm9tIFwiQC9jb21wb25lbnRzL2ZlYXR1cmVzL2hhYml0L2hhYml0XCI7XHJcbmltcG9ydCB7IENhbGVuZGFyQ29tcG9uZW50IH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy9jYWxlbmRhclwiO1xyXG5pbXBvcnQgeyBLYW5iYW5Db21wb25lbnQgfSBmcm9tIFwiQC9jb21wb25lbnRzL2ZlYXR1cmVzL2thbmJhbi9rYW5iYW5cIjtcclxuaW1wb3J0IHsgR2FudHRDb21wb25lbnQgfSBmcm9tIFwiQC9jb21wb25lbnRzL2ZlYXR1cmVzL2dhbnR0L2dhbnR0XCI7XHJcbmltcG9ydCB7IFZpZXdDb21wb25lbnRNYW5hZ2VyIH0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9iZWhhdmlvci9WaWV3Q29tcG9uZW50TWFuYWdlclwiO1xyXG5pbXBvcnQgeyBUYXNrUHJvcGVydHlUd29Db2x1bW5WaWV3IH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy90YXNrL3ZpZXcvVGFza1Byb3BlcnR5VHdvQ29sdW1uVmlld1wiO1xyXG5pbXBvcnQgeyBnZXRWaWV3U2V0dGluZ09yRGVmYXVsdCwgVHdvQ29sdW1uU3BlY2lmaWNDb25maWcsIH0gZnJvbSBcIkAvY29tbW9uL3NldHRpbmctZGVmaW5pdGlvblwiO1xyXG5pbXBvcnQgeyBmaWx0ZXJUYXNrcyB9IGZyb20gXCJAL3V0aWxzL3Rhc2svdGFzay1maWx0ZXItdXRpbHNcIjtcclxuaW1wb3J0IHsgUm9vdEZpbHRlclN0YXRlIH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy90YXNrL2ZpbHRlci9WaWV3VGFza0ZpbHRlclwiO1xyXG5pbXBvcnQgeyBRdWlja0NhcHR1cmVNb2RhbCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvcXVpY2stY2FwdHVyZS9tb2RhbHMvUXVpY2tDYXB0dXJlTW9kYWxcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHsgVmlld01vZGUgfSBmcm9tIFwiLi4vY29tcG9uZW50cy9GbHVlbnRUb3BOYXZpZ2F0aW9uXCI7XHJcblxyXG4vLyBWaWV3IG1vZGUgY29uZmlndXJhdGlvbiBmb3IgZWFjaCB2aWV3IHR5cGVcclxuY29uc3QgVklFV19NT0RFX0NPTkZJRzogUmVjb3JkPHN0cmluZywgVmlld01vZGVbXT4gPSB7XHJcblx0Ly8gQ29udGVudC1iYXNlZCB2aWV3cyAtIHN1cHBvcnQgYWxsIG1vZGVzXHJcblx0aW5ib3g6IFtcImxpc3RcIiwgXCJ0cmVlXCIsIFwia2FuYmFuXCIsIFwiY2FsZW5kYXJcIl0sXHJcblx0dG9kYXk6IFtcImxpc3RcIiwgXCJ0cmVlXCIsIFwia2FuYmFuXCIsIFwiY2FsZW5kYXJcIl0sXHJcblx0dXBjb21pbmc6IFtcImxpc3RcIiwgXCJ0cmVlXCIsIFwia2FuYmFuXCIsIFwiY2FsZW5kYXJcIl0sXHJcblx0ZmxhZ2dlZDogW1wibGlzdFwiLCBcInRyZWVcIiwgXCJrYW5iYW5cIiwgXCJjYWxlbmRhclwiXSxcclxuXHRwcm9qZWN0czogW1wibGlzdFwiLCBcInRyZWVcIiwgXCJrYW5iYW5cIiwgXCJjYWxlbmRhclwiXSxcclxuXHJcblx0Ly8gU3BlY2lhbGl6ZWQgdmlld3Mgd2l0aCBsaW1pdGVkIG9yIG5vIG1vZGVzXHJcblx0dGFnczogW10sXHJcblx0cmV2aWV3OiBbXSxcclxuXHRmb3JlY2FzdDogW10sXHJcblx0aGFiaXQ6IFtdLFxyXG5cdGdhbnR0OiBbXSxcclxuXHRjYWxlbmRhcjogW10sXHJcblx0a2FuYmFuOiBbXSxcclxufTtcclxuXHJcbi8qKlxyXG4gKiBGbHVlbnRDb21wb25lbnRNYW5hZ2VyIC0gTWFuYWdlcyB2aWV3IGNvbXBvbmVudCBsaWZlY3ljbGVcclxuICpcclxuICogUmVzcG9uc2liaWxpdGllczpcclxuICogLSBJbml0aWFsaXplIGFsbCB2aWV3IGNvbXBvbmVudHMgKENvbnRlbnQsIEZvcmVjYXN0LCBUYWdzLCBDYWxlbmRhciwgS2FuYmFuLCBldGMuKVxyXG4gKiAtIFNob3cvaGlkZSBjb21wb25lbnRzIGJhc2VkIG9uIGFjdGl2ZSB2aWV3XHJcbiAqIC0gU3dpdGNoIGJldHdlZW4gdmlld3MgKGluYm94LCB0b2RheSwgcHJvamVjdHMsIGNhbGVuZGFyLCBldGMuKVxyXG4gKiAtIFJlbmRlciBjb250ZW50IHdpdGggZGlmZmVyZW50IHZpZXcgbW9kZXMgKGxpc3QsIHRyZWUsIGthbmJhbiwgY2FsZW5kYXIpXHJcbiAqIC0gUmVuZGVyIGxvYWRpbmcsIGVycm9yLCBhbmQgZW1wdHkgc3RhdGVzXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgRmx1ZW50Q29tcG9uZW50TWFuYWdlciBleHRlbmRzIENvbXBvbmVudCB7XHJcblx0Ly8gVmlldyBjb21wb25lbnRzXHJcblx0cHJpdmF0ZSBjb250ZW50Q29tcG9uZW50OiBDb250ZW50Q29tcG9uZW50O1xyXG5cdHByaXZhdGUgZm9yZWNhc3RDb21wb25lbnQ6IEZvcmVjYXN0Q29tcG9uZW50O1xyXG5cdHByaXZhdGUgdGFnc0NvbXBvbmVudDogVGFnc0NvbXBvbmVudDtcclxuXHRwcml2YXRlIHByb2plY3RzQ29tcG9uZW50OiBQcm9qZWN0c0NvbXBvbmVudDtcclxuXHRwcml2YXRlIHJldmlld0NvbXBvbmVudDogUmV2aWV3Q29tcG9uZW50O1xyXG5cdHByaXZhdGUgaGFiaXRDb21wb25lbnQ6IEhhYml0O1xyXG5cdHByaXZhdGUgY2FsZW5kYXJDb21wb25lbnQ6IENhbGVuZGFyQ29tcG9uZW50O1xyXG5cdHByaXZhdGUga2FuYmFuQ29tcG9uZW50OiBLYW5iYW5Db21wb25lbnQ7XHJcblx0cHJpdmF0ZSBnYW50dENvbXBvbmVudDogR2FudHRDb21wb25lbnQ7XHJcblx0cHJpdmF0ZSB2aWV3Q29tcG9uZW50TWFuYWdlcjogVmlld0NvbXBvbmVudE1hbmFnZXI7XHJcblxyXG5cdC8vIFR3byBjb2x1bW4gdmlldyBjb21wb25lbnRzXHJcblx0cHJpdmF0ZSB0d29Db2x1bW5WaWV3Q29tcG9uZW50czogTWFwPHN0cmluZywgVGFza1Byb3BlcnR5VHdvQ29sdW1uVmlldz4gPVxyXG5cdFx0bmV3IE1hcCgpO1xyXG5cclxuXHQvLyBMZWdhY3kgY29udGFpbmVyc1xyXG5cdHByaXZhdGUgbGlzdENvbnRhaW5lcjogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSB0cmVlQ29udGFpbmVyOiBIVE1MRWxlbWVudDtcclxuXHJcblx0Ly8gVHJhY2sgY3VycmVudGx5IHZpc2libGUgY29tcG9uZW50XHJcblx0cHJpdmF0ZSBjdXJyZW50VmlzaWJsZUNvbXBvbmVudDogYW55ID0gbnVsbDtcclxuXHJcblx0Ly8gVmlldyBoYW5kbGVyc1xyXG5cdHByaXZhdGUgdmlld0hhbmRsZXJzOiB7XHJcblx0XHRvblRhc2tTZWxlY3RlZDogKHRhc2s6IFRhc2spID0+IHZvaWQ7XHJcblx0XHRvblRhc2tDb21wbGV0ZWQ6ICh0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdFx0b25UYXNrVXBkYXRlOiAob3JpZ2luYWxUYXNrOiBUYXNrLCB1cGRhdGVkVGFzazogVGFzaykgPT4gUHJvbWlzZTx2b2lkPjtcclxuXHRcdG9uVGFza0NvbnRleHRNZW51OiAoZXZlbnQ6IE1vdXNlRXZlbnQsIHRhc2s6IFRhc2spID0+IHZvaWQ7XHJcblx0XHRvbkthbmJhblRhc2tTdGF0dXNVcGRhdGU6IChcclxuXHRcdFx0dGFza0lkOiBzdHJpbmcsXHJcblx0XHRcdG5ld1N0YXR1c01hcms6IHN0cmluZ1xyXG5cdFx0KSA9PiB2b2lkO1xyXG5cdH07XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cHJpdmF0ZSBhcHA6IEFwcCxcclxuXHRcdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRwcml2YXRlIGNvbnRlbnRBcmVhOiBIVE1MRWxlbWVudCxcclxuXHRcdHByaXZhdGUgcGFyZW50VmlldzogQ29tcG9uZW50LFxyXG5cdFx0dmlld0hhbmRsZXJzOiB7XHJcblx0XHRcdG9uVGFza1NlbGVjdGVkOiAodGFzazogVGFzaykgPT4gdm9pZDtcclxuXHRcdFx0b25UYXNrQ29tcGxldGVkOiAodGFzazogVGFzaykgPT4gdm9pZDtcclxuXHRcdFx0b25UYXNrVXBkYXRlOiAoXHJcblx0XHRcdFx0b3JpZ2luYWxUYXNrOiBUYXNrLFxyXG5cdFx0XHRcdHVwZGF0ZWRUYXNrOiBUYXNrXHJcblx0XHRcdCkgPT4gUHJvbWlzZTx2b2lkPjtcclxuXHRcdFx0b25UYXNrQ29udGV4dE1lbnU6IChldmVudDogTW91c2VFdmVudCwgdGFzazogVGFzaykgPT4gdm9pZDtcclxuXHRcdFx0b25LYW5iYW5UYXNrU3RhdHVzVXBkYXRlOiAoXHJcblx0XHRcdFx0dGFza0lkOiBzdHJpbmcsXHJcblx0XHRcdFx0bmV3U3RhdHVzTWFyazogc3RyaW5nXHJcblx0XHRcdCkgPT4gdm9pZDtcclxuXHRcdH1cclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLnZpZXdIYW5kbGVycyA9IHZpZXdIYW5kbGVycztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEluaXRpYWxpemUgYWxsIHZpZXcgY29tcG9uZW50c1xyXG5cdCAqL1xyXG5cdGluaXRpYWxpemVWaWV3Q29tcG9uZW50cygpOiB2b2lkIHtcclxuXHRcdGNvbnNvbGUubG9nKFwiW0ZsdWVudENvbXBvbmVudF0gaW5pdGlhbGl6ZVZpZXdDb21wb25lbnRzIHN0YXJ0ZWRcIik7XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBWaWV3Q29tcG9uZW50TWFuYWdlciBmb3Igc3BlY2lhbCB2aWV3c1xyXG5cdFx0Y29uc3Qgdmlld0hhbmRsZXJzID0ge1xyXG5cdFx0XHRvblRhc2tTZWxlY3RlZDogKHRhc2s6IFRhc2spID0+XHJcblx0XHRcdFx0dGhpcy52aWV3SGFuZGxlcnMub25UYXNrU2VsZWN0ZWQodGFzayksXHJcblx0XHRcdG9uVGFza0NvbXBsZXRlZDogKHRhc2s6IFRhc2spID0+XHJcblx0XHRcdFx0dGhpcy52aWV3SGFuZGxlcnMub25UYXNrQ29tcGxldGVkKHRhc2spLFxyXG5cdFx0XHRvblRhc2tVcGRhdGU6IGFzeW5jIChvcmlnaW5hbFRhc2s6IFRhc2ssIHVwZGF0ZWRUYXNrOiBUYXNrKSA9PiB7XHJcblx0XHRcdFx0YXdhaXQgdGhpcy52aWV3SGFuZGxlcnMub25UYXNrVXBkYXRlKG9yaWdpbmFsVGFzaywgdXBkYXRlZFRhc2spO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRvblRhc2tDb250ZXh0TWVudTogKGV2ZW50OiBNb3VzZUV2ZW50LCB0YXNrOiBUYXNrKSA9PlxyXG5cdFx0XHRcdHRoaXMudmlld0hhbmRsZXJzLm9uVGFza0NvbnRleHRNZW51KGV2ZW50LCB0YXNrKSxcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy52aWV3Q29tcG9uZW50TWFuYWdlciA9IG5ldyBWaWV3Q29tcG9uZW50TWFuYWdlcihcclxuXHRcdFx0dGhpcy5wYXJlbnRWaWV3LFxyXG5cdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdHRoaXMuY29udGVudEFyZWEsXHJcblx0XHRcdHZpZXdIYW5kbGVyc1xyXG5cdFx0KTtcclxuXHRcdHRoaXMucGFyZW50Vmlldy5hZGRDaGlsZCh0aGlzLnZpZXdDb21wb25lbnRNYW5hZ2VyKTtcclxuXHJcblx0XHQvLyBJbml0aWFsaXplIENvbnRlbnRDb21wb25lbnQgKGhhbmRsZXMgaW5ib3gsIHRvZGF5LCB1cGNvbWluZywgZmxhZ2dlZClcclxuXHRcdGNvbnNvbGUubG9nKFwiW0ZsdWVudENvbXBvbmVudF0gQ3JlYXRpbmcgQ29udGVudENvbXBvbmVudFwiKTtcclxuXHRcdHRoaXMuY29udGVudENvbXBvbmVudCA9IG5ldyBDb250ZW50Q29tcG9uZW50KFxyXG5cdFx0XHR0aGlzLmNvbnRlbnRBcmVhLFxyXG5cdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRvblRhc2tTZWxlY3RlZDogKHRhc2spID0+IHtcclxuXHRcdFx0XHRcdGlmICh0YXNrKSB0aGlzLnZpZXdIYW5kbGVycy5vblRhc2tTZWxlY3RlZCh0YXNrKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uVGFza0NvbXBsZXRlZDogKHRhc2spID0+IHtcclxuXHRcdFx0XHRcdGlmICh0YXNrKSB0aGlzLnZpZXdIYW5kbGVycy5vblRhc2tDb21wbGV0ZWQodGFzayk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvblRhc2tDb250ZXh0TWVudTogKGV2ZW50LCB0YXNrKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAodGFzaykgdGhpcy52aWV3SGFuZGxlcnMub25UYXNrQ29udGV4dE1lbnUoZXZlbnQsIHRhc2spO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblx0XHR0aGlzLnBhcmVudFZpZXcuYWRkQ2hpbGQodGhpcy5jb250ZW50Q29tcG9uZW50KTtcclxuXHRcdHRoaXMuY29udGVudENvbXBvbmVudC5sb2FkKCk7XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBGb3JlY2FzdENvbXBvbmVudFxyXG5cdFx0dGhpcy5mb3JlY2FzdENvbXBvbmVudCA9IG5ldyBGb3JlY2FzdENvbXBvbmVudChcclxuXHRcdFx0dGhpcy5jb250ZW50QXJlYSxcclxuXHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0b25UYXNrU2VsZWN0ZWQ6ICh0YXNrKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAodGFzaykgdGhpcy52aWV3SGFuZGxlcnMub25UYXNrU2VsZWN0ZWQodGFzayk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvblRhc2tDb21wbGV0ZWQ6ICh0YXNrKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAodGFzaykgdGhpcy52aWV3SGFuZGxlcnMub25UYXNrQ29tcGxldGVkKHRhc2spO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0b25UYXNrVXBkYXRlOiBhc3luYyAob3JpZ2luYWxUYXNrLCB1cGRhdGVkVGFzaykgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKG9yaWdpbmFsVGFzayAmJiB1cGRhdGVkVGFzaykge1xyXG5cdFx0XHRcdFx0XHRhd2FpdCB0aGlzLnZpZXdIYW5kbGVycy5vblRhc2tVcGRhdGUoXHJcblx0XHRcdFx0XHRcdFx0b3JpZ2luYWxUYXNrLFxyXG5cdFx0XHRcdFx0XHRcdHVwZGF0ZWRUYXNrXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvblRhc2tDb250ZXh0TWVudTogKGV2ZW50LCB0YXNrKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAodGFzaykgdGhpcy52aWV3SGFuZGxlcnMub25UYXNrQ29udGV4dE1lbnUoZXZlbnQsIHRhc2spO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblx0XHR0aGlzLnBhcmVudFZpZXcuYWRkQ2hpbGQodGhpcy5mb3JlY2FzdENvbXBvbmVudCk7XHJcblx0XHR0aGlzLmZvcmVjYXN0Q29tcG9uZW50LmxvYWQoKTtcclxuXHJcblx0XHQvLyBJbml0aWFsaXplIFRhZ3NDb21wb25lbnRcclxuXHRcdHRoaXMudGFnc0NvbXBvbmVudCA9IG5ldyBUYWdzQ29tcG9uZW50KFxyXG5cdFx0XHR0aGlzLmNvbnRlbnRBcmVhLFxyXG5cdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRvblRhc2tTZWxlY3RlZDogKHRhc2spID0+IHtcclxuXHRcdFx0XHRcdGlmICh0YXNrKSB0aGlzLnZpZXdIYW5kbGVycy5vblRhc2tTZWxlY3RlZCh0YXNrKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uVGFza0NvbXBsZXRlZDogKHRhc2spID0+IHtcclxuXHRcdFx0XHRcdGlmICh0YXNrKSB0aGlzLnZpZXdIYW5kbGVycy5vblRhc2tDb21wbGV0ZWQodGFzayk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvblRhc2tVcGRhdGU6IGFzeW5jIChvcmlnaW5hbFRhc2ssIHVwZGF0ZWRUYXNrKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAob3JpZ2luYWxUYXNrICYmIHVwZGF0ZWRUYXNrKSB7XHJcblx0XHRcdFx0XHRcdGF3YWl0IHRoaXMudmlld0hhbmRsZXJzLm9uVGFza1VwZGF0ZShcclxuXHRcdFx0XHRcdFx0XHRvcmlnaW5hbFRhc2ssXHJcblx0XHRcdFx0XHRcdFx0dXBkYXRlZFRhc2tcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uVGFza0NvbnRleHRNZW51OiAoZXZlbnQsIHRhc2spID0+IHtcclxuXHRcdFx0XHRcdGlmICh0YXNrKSB0aGlzLnZpZXdIYW5kbGVycy5vblRhc2tDb250ZXh0TWVudShldmVudCwgdGFzayk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fVxyXG5cdFx0KTtcclxuXHRcdHRoaXMucGFyZW50Vmlldy5hZGRDaGlsZCh0aGlzLnRhZ3NDb21wb25lbnQpO1xyXG5cdFx0dGhpcy50YWdzQ29tcG9uZW50LmxvYWQoKTtcclxuXHJcblx0XHQvLyBJbml0aWFsaXplIFByb2plY3RzQ29tcG9uZW50XHJcblx0XHR0aGlzLnByb2plY3RzQ29tcG9uZW50ID0gbmV3IFByb2plY3RzQ29tcG9uZW50KFxyXG5cdFx0XHR0aGlzLmNvbnRlbnRBcmVhLFxyXG5cdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRvblRhc2tTZWxlY3RlZDogKHRhc2spID0+IHtcclxuXHRcdFx0XHRcdGlmICh0YXNrKSB0aGlzLnZpZXdIYW5kbGVycy5vblRhc2tTZWxlY3RlZCh0YXNrKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uVGFza0NvbXBsZXRlZDogKHRhc2spID0+IHtcclxuXHRcdFx0XHRcdGlmICh0YXNrKSB0aGlzLnZpZXdIYW5kbGVycy5vblRhc2tDb21wbGV0ZWQodGFzayk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvblRhc2tVcGRhdGU6IGFzeW5jIChvcmlnaW5hbFRhc2ssIHVwZGF0ZWRUYXNrKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAob3JpZ2luYWxUYXNrICYmIHVwZGF0ZWRUYXNrKSB7XHJcblx0XHRcdFx0XHRcdGF3YWl0IHRoaXMudmlld0hhbmRsZXJzLm9uVGFza1VwZGF0ZShcclxuXHRcdFx0XHRcdFx0XHRvcmlnaW5hbFRhc2ssXHJcblx0XHRcdFx0XHRcdFx0dXBkYXRlZFRhc2tcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uVGFza0NvbnRleHRNZW51OiAoZXZlbnQsIHRhc2spID0+IHtcclxuXHRcdFx0XHRcdGlmICh0YXNrKSB0aGlzLnZpZXdIYW5kbGVycy5vblRhc2tDb250ZXh0TWVudShldmVudCwgdGFzayk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fVxyXG5cdFx0KTtcclxuXHRcdHRoaXMucGFyZW50Vmlldy5hZGRDaGlsZCh0aGlzLnByb2plY3RzQ29tcG9uZW50KTtcclxuXHRcdHRoaXMucHJvamVjdHNDb21wb25lbnQubG9hZCgpO1xyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgUmV2aWV3Q29tcG9uZW50XHJcblx0XHR0aGlzLnJldmlld0NvbXBvbmVudCA9IG5ldyBSZXZpZXdDb21wb25lbnQoXHJcblx0XHRcdHRoaXMuY29udGVudEFyZWEsXHJcblx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0e1xyXG5cdFx0XHRcdG9uVGFza1NlbGVjdGVkOiAodGFzaykgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKHRhc2spIHRoaXMudmlld0hhbmRsZXJzLm9uVGFza1NlbGVjdGVkKHRhc2spO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0b25UYXNrQ29tcGxldGVkOiAodGFzaykgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKHRhc2spIHRoaXMudmlld0hhbmRsZXJzLm9uVGFza0NvbXBsZXRlZCh0YXNrKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uVGFza1VwZGF0ZTogYXN5bmMgKG9yaWdpbmFsVGFzaywgdXBkYXRlZFRhc2spID0+IHtcclxuXHRcdFx0XHRcdGlmIChvcmlnaW5hbFRhc2sgJiYgdXBkYXRlZFRhc2spIHtcclxuXHRcdFx0XHRcdFx0YXdhaXQgdGhpcy52aWV3SGFuZGxlcnMub25UYXNrVXBkYXRlKFxyXG5cdFx0XHRcdFx0XHRcdG9yaWdpbmFsVGFzayxcclxuXHRcdFx0XHRcdFx0XHR1cGRhdGVkVGFza1xyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0b25UYXNrQ29udGV4dE1lbnU6IChldmVudCwgdGFzaykgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKHRhc2spIHRoaXMudmlld0hhbmRsZXJzLm9uVGFza0NvbnRleHRNZW51KGV2ZW50LCB0YXNrKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cdFx0dGhpcy5wYXJlbnRWaWV3LmFkZENoaWxkKHRoaXMucmV2aWV3Q29tcG9uZW50KTtcclxuXHRcdHRoaXMucmV2aWV3Q29tcG9uZW50LmxvYWQoKTtcclxuXHJcblx0XHQvLyBJbml0aWFsaXplIEhhYml0Q29tcG9uZW50XHJcblx0XHR0aGlzLmhhYml0Q29tcG9uZW50ID0gbmV3IEhhYml0KHRoaXMucGx1Z2luLCB0aGlzLmNvbnRlbnRBcmVhKTtcclxuXHRcdHRoaXMucGFyZW50Vmlldy5hZGRDaGlsZCh0aGlzLmhhYml0Q29tcG9uZW50KTtcclxuXHRcdHRoaXMuaGFiaXRDb21wb25lbnQubG9hZCgpO1xyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgQ2FsZW5kYXJDb21wb25lbnRcclxuXHRcdHRoaXMuY2FsZW5kYXJDb21wb25lbnQgPSBuZXcgQ2FsZW5kYXJDb21wb25lbnQoXHJcblx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0dGhpcy5jb250ZW50QXJlYSxcclxuXHRcdFx0W10sIC8vIHRhc2tzIHdpbGwgYmUgc2V0IGxhdGVyXHJcblx0XHRcdHtcclxuXHRcdFx0XHRvblRhc2tTZWxlY3RlZDogKHRhc2s6IFRhc2sgfCBudWxsKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAodGFzaykgdGhpcy52aWV3SGFuZGxlcnMub25UYXNrU2VsZWN0ZWQodGFzayk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvblRhc2tDb21wbGV0ZWQ6ICh0YXNrOiBUYXNrKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAodGFzaykgdGhpcy52aWV3SGFuZGxlcnMub25UYXNrQ29tcGxldGVkKHRhc2spO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0b25FdmVudENvbnRleHRNZW51OiAoZXY6IE1vdXNlRXZlbnQsIGV2ZW50OiBhbnkpID0+IHtcclxuXHRcdFx0XHRcdGlmIChldmVudClcclxuXHRcdFx0XHRcdFx0dGhpcy52aWV3SGFuZGxlcnMub25UYXNrQ29udGV4dE1lbnUoZXYsIGV2ZW50IGFzIGFueSk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fVxyXG5cdFx0KTtcclxuXHRcdHRoaXMucGFyZW50Vmlldy5hZGRDaGlsZCh0aGlzLmNhbGVuZGFyQ29tcG9uZW50KTtcclxuXHJcblx0XHQvLyBJbml0aWFsaXplIEthbmJhbkNvbXBvbmVudFxyXG5cdFx0dGhpcy5rYW5iYW5Db21wb25lbnQgPSBuZXcgS2FuYmFuQ29tcG9uZW50KFxyXG5cdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdHRoaXMuY29udGVudEFyZWEsXHJcblx0XHRcdFtdLCAvLyB0YXNrcyB3aWxsIGJlIHNldCBsYXRlclxyXG5cdFx0XHR7XHJcblx0XHRcdFx0b25UYXNrU3RhdHVzVXBkYXRlOiBhc3luYyAodGFza0lkLCBuZXdTdGF0dXNNYXJrKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLnZpZXdIYW5kbGVycy5vbkthbmJhblRhc2tTdGF0dXNVcGRhdGUoXHJcblx0XHRcdFx0XHRcdHRhc2tJZCxcclxuXHRcdFx0XHRcdFx0bmV3U3RhdHVzTWFya1xyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uVGFza1NlbGVjdGVkOiAodGFzaykgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKHRhc2spIHRoaXMudmlld0hhbmRsZXJzLm9uVGFza1NlbGVjdGVkKHRhc2spO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0b25UYXNrQ29tcGxldGVkOiAodGFzaykgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKHRhc2spIHRoaXMudmlld0hhbmRsZXJzLm9uVGFza0NvbXBsZXRlZCh0YXNrKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uVGFza0NvbnRleHRNZW51OiAoZXZlbnQsIHRhc2spID0+IHtcclxuXHRcdFx0XHRcdGlmICh0YXNrKSB0aGlzLnZpZXdIYW5kbGVycy5vblRhc2tDb250ZXh0TWVudShldmVudCwgdGFzayk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fVxyXG5cdFx0KTtcclxuXHRcdHRoaXMucGFyZW50Vmlldy5hZGRDaGlsZCh0aGlzLmthbmJhbkNvbXBvbmVudCk7XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBHYW50dENvbXBvbmVudFxyXG5cdFx0dGhpcy5nYW50dENvbXBvbmVudCA9IG5ldyBHYW50dENvbXBvbmVudChcclxuXHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdHRoaXMuY29udGVudEFyZWEsXHJcblx0XHRcdHtcclxuXHRcdFx0XHRvblRhc2tTZWxlY3RlZDogKHRhc2s6IFRhc2spID0+XHJcblx0XHRcdFx0XHR0aGlzLnZpZXdIYW5kbGVycy5vblRhc2tTZWxlY3RlZCh0YXNrKSxcclxuXHRcdFx0XHRvblRhc2tDb21wbGV0ZWQ6ICh0YXNrOiBUYXNrKSA9PlxyXG5cdFx0XHRcdFx0dGhpcy52aWV3SGFuZGxlcnMub25UYXNrQ29tcGxldGVkKHRhc2spLFxyXG5cdFx0XHRcdG9uVGFza0NvbnRleHRNZW51OiAoZXZlbnQ6IE1vdXNlRXZlbnQsIHRhc2s6IFRhc2spID0+XHJcblx0XHRcdFx0XHR0aGlzLnZpZXdIYW5kbGVycy5vblRhc2tDb250ZXh0TWVudShldmVudCwgdGFzayksXHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblx0XHR0aGlzLnBhcmVudFZpZXcuYWRkQ2hpbGQodGhpcy5nYW50dENvbXBvbmVudCk7XHJcblx0XHR0aGlzLmdhbnR0Q29tcG9uZW50LmxvYWQoKTtcclxuXHJcblx0XHQvLyBDcmVhdGUgbGVnYWN5IGNvbnRhaW5lcnMgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHlcclxuXHRcdHRoaXMubGlzdENvbnRhaW5lciA9IHRoaXMuY29udGVudEFyZWEuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInRhc2stbGlzdC1jb250YWluZXJcIixcclxuXHRcdFx0YXR0cjoge3N0eWxlOiBcImRpc3BsYXk6IG5vbmU7XCJ9LFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy50cmVlQ29udGFpbmVyID0gdGhpcy5jb250ZW50QXJlYS5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwidGFzay10cmVlLWNvbnRhaW5lclwiLFxyXG5cdFx0XHRhdHRyOiB7c3R5bGU6IFwiZGlzcGxheTogbm9uZTtcIn0sXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBIaWRlIGFsbCBjb21wb25lbnRzIGluaXRpYWxseVxyXG5cdFx0Y29uc29sZS5sb2coXCJbRmx1ZW50Q29tcG9uZW50XSBIaWRpbmcgYWxsIGNvbXBvbmVudHMgaW5pdGlhbGx5XCIpO1xyXG5cdFx0dGhpcy5oaWRlQWxsQ29tcG9uZW50cyh0cnVlKTtcclxuXHRcdGNvbnNvbGUubG9nKFwiW0ZsdWVudENvbXBvbmVudF0gaW5pdGlhbGl6ZVZpZXdDb21wb25lbnRzIGNvbXBsZXRlZFwiKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhpZGUgYWxsIGNvbXBvbmVudHNcclxuXHQgKi9cclxuXHRoaWRlQWxsQ29tcG9uZW50cyhmb3JjZUhpZGVBbGwgPSBmYWxzZSk6IHZvaWQge1xyXG5cdFx0Y29uc3QgaXNJbml0aWFsSGlkZSA9IGZvcmNlSGlkZUFsbDtcclxuXHJcblx0XHQvLyBTbWFydCBoaWRpbmcgLSBvbmx5IGhpZGUgY3VycmVudGx5IHZpc2libGUgY29tcG9uZW50ICh1bmxlc3MgaW5pdGlhbCBoaWRlKVxyXG5cdFx0aWYgKCFpc0luaXRpYWxIaWRlICYmIHRoaXMuY3VycmVudFZpc2libGVDb21wb25lbnQpIHtcclxuXHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XCJbRmx1ZW50Q29tcG9uZW50XSBTbWFydCBoaWRlIC0gb25seSBoaWRpbmcgY3VycmVudCB2aXNpYmxlIGNvbXBvbmVudFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdHRoaXMuY3VycmVudFZpc2libGVDb21wb25lbnQuY29udGFpbmVyRWw/LmhpZGUoKTtcclxuXHRcdFx0dGhpcy5jdXJyZW50VmlzaWJsZUNvbXBvbmVudCA9IG51bGw7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBIaWRlIGFsbCBjb21wb25lbnRzXHJcblx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFwiW0ZsdWVudENvbXBvbmVudF0gSGlkaW5nIGFsbCBjb21wb25lbnRzXCIsXHJcblx0XHRcdFx0aXNJbml0aWFsSGlkZSA/IFwiKGluaXRpYWwgaGlkZSlcIiA6IFwiXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0dGhpcy5jb250ZW50Q29tcG9uZW50Py5jb250YWluZXJFbC5oaWRlKCk7XHJcblx0XHRcdHRoaXMuZm9yZWNhc3RDb21wb25lbnQ/LmNvbnRhaW5lckVsLmhpZGUoKTtcclxuXHRcdFx0dGhpcy50YWdzQ29tcG9uZW50Py5jb250YWluZXJFbC5oaWRlKCk7XHJcblx0XHRcdHRoaXMucHJvamVjdHNDb21wb25lbnQ/LmNvbnRhaW5lckVsLmhpZGUoKTtcclxuXHRcdFx0dGhpcy5yZXZpZXdDb21wb25lbnQ/LmNvbnRhaW5lckVsLmhpZGUoKTtcclxuXHRcdFx0dGhpcy5oYWJpdENvbXBvbmVudD8uY29udGFpbmVyRWwuaGlkZSgpO1xyXG5cdFx0XHR0aGlzLmNhbGVuZGFyQ29tcG9uZW50Py5jb250YWluZXJFbC5oaWRlKCk7XHJcblx0XHRcdHRoaXMua2FuYmFuQ29tcG9uZW50Py5jb250YWluZXJFbC5oaWRlKCk7XHJcblx0XHRcdHRoaXMuZ2FudHRDb21wb25lbnQ/LmNvbnRhaW5lckVsLmhpZGUoKTtcclxuXHRcdFx0dGhpcy52aWV3Q29tcG9uZW50TWFuYWdlcj8uaGlkZUFsbENvbXBvbmVudHMoKTtcclxuXHJcblx0XHRcdC8vIEhpZGUgdHdvIGNvbHVtbiB2aWV3c1xyXG5cdFx0XHR0aGlzLnR3b0NvbHVtblZpZXdDb21wb25lbnRzLmZvckVhY2goKGNvbXBvbmVudCkgPT4ge1xyXG5cdFx0XHRcdGNvbXBvbmVudC5jb250YWluZXJFbC5oaWRlKCk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gSGlkZSBsZWdhY3kgY29udGFpbmVyc1xyXG5cdFx0XHR0aGlzLmxpc3RDb250YWluZXI/LmhpZGUoKTtcclxuXHRcdFx0dGhpcy50cmVlQ29udGFpbmVyPy5oaWRlKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTd2l0Y2ggdG8gYSBzcGVjaWZpYyB2aWV3XHJcblx0ICovXHJcblx0c3dpdGNoVmlldyhcclxuXHRcdHZpZXdJZDogc3RyaW5nLFxyXG5cdFx0dGFza3M6IFRhc2tbXSxcclxuXHRcdGZpbHRlcmVkVGFza3M6IFRhc2tbXSxcclxuXHRcdGN1cnJlbnRGaWx0ZXJTdGF0ZTogUm9vdEZpbHRlclN0YXRlIHwgbnVsbCxcclxuXHRcdHZpZXdNb2RlOiBWaWV3TW9kZSxcclxuXHRcdHByb2plY3Q/OiBzdHJpbmcgfCBudWxsXHJcblx0KTogdm9pZCB7XHJcblx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XCJbRmx1ZW50Q29tcG9uZW50XSBzd2l0Y2hWaWV3IGNhbGxlZCB3aXRoOlwiLFxyXG5cdFx0XHR2aWV3SWQsXHJcblx0XHRcdFwidmlld01vZGU6XCIsXHJcblx0XHRcdHZpZXdNb2RlXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIFJlbW92ZSB0cmFuc2llbnQgb3ZlcmxheXMgKGxvYWRpbmcvZXJyb3IvZW1wdHkpIGJlZm9yZSBzaG93aW5nIGNvbXBvbmVudHNcclxuXHRcdGlmICh0aGlzLmNvbnRlbnRBcmVhKSB7XHJcblx0XHRcdHRoaXMuY29udGVudEFyZWFcclxuXHRcdFx0XHQucXVlcnlTZWxlY3RvckFsbChcclxuXHRcdFx0XHRcdFwiLnRnLWZsdWVudC1sb2FkaW5nLCAudGctZmx1ZW50LWVycm9yLXN0YXRlLCAudGctZmx1ZW50LWVtcHR5LXN0YXRlXCJcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0LmZvckVhY2goKGVsKSA9PiBlbC5yZW1vdmUoKSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSGlkZSBhbGwgY29tcG9uZW50cyBmaXJzdFxyXG5cdFx0Y29uc29sZS5sb2coXCJbRmx1ZW50Q29tcG9uZW50XSBIaWRpbmcgYWxsIGNvbXBvbmVudHNcIik7XHJcblx0XHR0aGlzLmhpZGVBbGxDb21wb25lbnRzKCk7XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgY3VycmVudCB2aWV3IHN1cHBvcnRzIG11bHRpcGxlIHZpZXcgbW9kZXMgYW5kIHdlJ3JlIGluIGEgbm9uLWxpc3QgbW9kZVxyXG5cdFx0Y29uc3Qgdmlld01vZGVzID0gdGhpcy5nZXRBdmFpbGFibGVNb2Rlc0ZvclZpZXcodmlld0lkKTtcclxuXHJcblx0XHQvLyBJZiB0aGUgY3VycmVudCB2aWV3IG1vZGUgaXMgbm90IGF2YWlsYWJsZSBmb3IgdGhpcyB2aWV3LCByZXNldCB0byBmaXJzdCBhdmFpbGFibGUgb3IgbGlzdFxyXG5cdFx0aWYgKHZpZXdNb2Rlcy5sZW5ndGggPiAwICYmICF2aWV3TW9kZXMuaW5jbHVkZXModmlld01vZGUpKSB7XHJcblx0XHRcdHZpZXdNb2RlID0gdmlld01vZGVzWzBdO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcIltGbHVlbnRDb21wb25lbnRdIElzIGNvbnRlbnQtYmFzZWQgdmlldz9cIixcclxuXHRcdFx0dGhpcy5pc0NvbnRlbnRCYXNlZFZpZXcodmlld0lkKSxcclxuXHRcdFx0XCJWaWV3IG1vZGU6XCIsXHJcblx0XHRcdHZpZXdNb2RlLFxyXG5cdFx0XHRcIkF2YWlsYWJsZSBtb2RlczpcIixcclxuXHRcdFx0dmlld01vZGVzXHJcblx0XHQpO1xyXG5cclxuXHRcdGlmIChcclxuXHRcdFx0dGhpcy5pc0NvbnRlbnRCYXNlZFZpZXcodmlld0lkKSAmJlxyXG5cdFx0XHR2aWV3TW9kZXMubGVuZ3RoID4gMCAmJlxyXG5cdFx0XHR2aWV3TW9kZSAhPT0gXCJsaXN0XCIgJiZcclxuXHRcdFx0dmlld01vZGUgIT09IFwidHJlZVwiXHJcblx0XHQpIHtcclxuXHRcdFx0Ly8gRm9yIGNvbnRlbnQtYmFzZWQgdmlld3MgaW4ga2FuYmFuL2NhbGVuZGFyIG1vZGUsIHVzZSBzcGVjaWFsIHJlbmRlcmluZ1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcIltGbHVlbnRDb21wb25lbnRdIFVzaW5nIHJlbmRlckNvbnRlbnRXaXRoVmlld01vZGUgZm9yIG5vbi1saXN0L3RyZWUgbW9kZTpcIixcclxuXHRcdFx0XHR2aWV3TW9kZVxyXG5cdFx0XHQpO1xyXG5cdFx0XHR0aGlzLnJlbmRlckNvbnRlbnRXaXRoVmlld01vZGUoXHJcblx0XHRcdFx0dmlld0lkLFxyXG5cdFx0XHRcdHRhc2tzLFxyXG5cdFx0XHRcdGZpbHRlcmVkVGFza3MsXHJcblx0XHRcdFx0dmlld01vZGVcclxuXHRcdFx0KTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEdldCB2aWV3IGNvbmZpZ3VyYXRpb25cclxuXHRcdGNvbnN0IHZpZXdDb25maWcgPSBnZXRWaWV3U2V0dGluZ09yRGVmYXVsdCh0aGlzLnBsdWdpbiwgdmlld0lkIGFzIGFueSk7XHJcblxyXG5cdFx0bGV0IHRhcmdldENvbXBvbmVudDogYW55ID0gbnVsbDtcclxuXHRcdGxldCBtb2RlRm9yQ29tcG9uZW50OiBzdHJpbmcgPSB2aWV3SWQ7XHJcblxyXG5cdFx0Ly8gSGFuZGxlIFR3b0NvbHVtbiB2aWV3c1xyXG5cdFx0aWYgKHZpZXdDb25maWcuc3BlY2lmaWNDb25maWc/LnZpZXdUeXBlID09PSBcInR3b2NvbHVtblwiKSB7XHJcblx0XHRcdGlmICghdGhpcy50d29Db2x1bW5WaWV3Q29tcG9uZW50cy5oYXModmlld0lkKSkge1xyXG5cdFx0XHRcdGNvbnN0IHR3b0NvbHVtbkNvbmZpZyA9XHJcblx0XHRcdFx0XHR2aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnIGFzIFR3b0NvbHVtblNwZWNpZmljQ29uZmlnO1xyXG5cdFx0XHRcdGNvbnN0IHR3b0NvbHVtbkNvbXBvbmVudCA9IG5ldyBUYXNrUHJvcGVydHlUd29Db2x1bW5WaWV3KFxyXG5cdFx0XHRcdFx0dGhpcy5jb250ZW50QXJlYSxcclxuXHRcdFx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdFx0XHR0d29Db2x1bW5Db25maWcsXHJcblx0XHRcdFx0XHR2aWV3SWRcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHRoaXMucGFyZW50Vmlldy5hZGRDaGlsZCh0d29Db2x1bW5Db21wb25lbnQpO1xyXG5cclxuXHRcdFx0XHQvLyBTZXQgdXAgZXZlbnQgaGFuZGxlcnNcclxuXHRcdFx0XHR0d29Db2x1bW5Db21wb25lbnQub25UYXNrU2VsZWN0ZWQgPSAodGFzaykgPT5cclxuXHRcdFx0XHRcdHRoaXMudmlld0hhbmRsZXJzLm9uVGFza1NlbGVjdGVkKHRhc2spO1xyXG5cdFx0XHRcdHR3b0NvbHVtbkNvbXBvbmVudC5vblRhc2tDb21wbGV0ZWQgPSAodGFzaykgPT5cclxuXHRcdFx0XHRcdHRoaXMudmlld0hhbmRsZXJzLm9uVGFza0NvbXBsZXRlZCh0YXNrKTtcclxuXHRcdFx0XHR0d29Db2x1bW5Db21wb25lbnQub25UYXNrQ29udGV4dE1lbnUgPSAoZXZlbnQsIHRhc2spID0+XHJcblx0XHRcdFx0XHR0aGlzLnZpZXdIYW5kbGVycy5vblRhc2tDb250ZXh0TWVudShldmVudCwgdGFzayk7XHJcblxyXG5cdFx0XHRcdHRoaXMudHdvQ29sdW1uVmlld0NvbXBvbmVudHMuc2V0KHZpZXdJZCwgdHdvQ29sdW1uQ29tcG9uZW50KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dGFyZ2V0Q29tcG9uZW50ID0gdGhpcy50d29Db2x1bW5WaWV3Q29tcG9uZW50cy5nZXQodmlld0lkKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIENoZWNrIHNwZWNpYWwgdmlldyB0eXBlc1xyXG5cdFx0XHRjb25zdCBzcGVjaWZpY1ZpZXdUeXBlID0gdmlld0NvbmZpZy5zcGVjaWZpY0NvbmZpZz8udmlld1R5cGU7XHJcblxyXG5cdFx0XHQvLyBDaGVjayBpZiBpdCdzIGEgc3BlY2lhbCB2aWV3IG1hbmFnZWQgYnkgVmlld0NvbXBvbmVudE1hbmFnZXJcclxuXHRcdFx0aWYgKHRoaXMudmlld0NvbXBvbmVudE1hbmFnZXIuaXNTcGVjaWFsVmlldyh2aWV3SWQpKSB7XHJcblx0XHRcdFx0dGFyZ2V0Q29tcG9uZW50ID1cclxuXHRcdFx0XHRcdHRoaXMudmlld0NvbXBvbmVudE1hbmFnZXIuc2hvd0NvbXBvbmVudCh2aWV3SWQpO1xyXG5cdFx0XHR9IGVsc2UgaWYgKFxyXG5cdFx0XHRcdHNwZWNpZmljVmlld1R5cGUgPT09IFwiZm9yZWNhc3RcIiB8fFxyXG5cdFx0XHRcdHZpZXdJZCA9PT0gXCJmb3JlY2FzdFwiXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHRhcmdldENvbXBvbmVudCA9IHRoaXMuZm9yZWNhc3RDb21wb25lbnQ7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gU3RhbmRhcmQgdmlldyB0eXBlc1xyXG5cdFx0XHRcdHN3aXRjaCAodmlld0lkKSB7XHJcblx0XHRcdFx0XHRjYXNlIFwiaGFiaXRcIjpcclxuXHRcdFx0XHRcdFx0dGFyZ2V0Q29tcG9uZW50ID0gdGhpcy5oYWJpdENvbXBvbmVudDtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIFwidGFnc1wiOlxyXG5cdFx0XHRcdFx0XHR0YXJnZXRDb21wb25lbnQgPSB0aGlzLnRhZ3NDb21wb25lbnQ7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcInByb2plY3RzXCI6XHJcblx0XHRcdFx0XHRcdC8vIEluIFYyLCBQcm9qZWN0cyBpcyB0cmVhdGVkIGFzIGEgY29udGVudC1iYXNlZCB2aWV3IHVzaW5nIGdsb2JhbCBwcm9qZWN0IGZpbHRlcnNcclxuXHRcdFx0XHRcdFx0dGFyZ2V0Q29tcG9uZW50ID0gdGhpcy5jb250ZW50Q29tcG9uZW50O1xyXG5cdFx0XHRcdFx0XHRtb2RlRm9yQ29tcG9uZW50ID0gdmlld0lkO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgXCJyZXZpZXdcIjpcclxuXHRcdFx0XHRcdFx0dGFyZ2V0Q29tcG9uZW50ID0gdGhpcy5yZXZpZXdDb21wb25lbnQ7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcImNhbGVuZGFyXCI6XHJcblx0XHRcdFx0XHRcdHRhcmdldENvbXBvbmVudCA9IHRoaXMuY2FsZW5kYXJDb21wb25lbnQ7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcImthbmJhblwiOlxyXG5cdFx0XHRcdFx0XHR0YXJnZXRDb21wb25lbnQgPSB0aGlzLmthbmJhbkNvbXBvbmVudDtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIFwiZ2FudHRcIjpcclxuXHRcdFx0XHRcdFx0dGFyZ2V0Q29tcG9uZW50ID0gdGhpcy5nYW50dENvbXBvbmVudDtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIFwiaW5ib3hcIjpcclxuXHRcdFx0XHRcdGNhc2UgXCJ0b2RheVwiOlxyXG5cdFx0XHRcdFx0Y2FzZSBcInVwY29taW5nXCI6XHJcblx0XHRcdFx0XHRjYXNlIFwiZmxhZ2dlZFwiOlxyXG5cdFx0XHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRcdFx0Ly8gVGhlc2UgYXJlIGhhbmRsZWQgYnkgQ29udGVudENvbXBvbmVudFxyXG5cdFx0XHRcdFx0XHR0YXJnZXRDb21wb25lbnQgPSB0aGlzLmNvbnRlbnRDb21wb25lbnQ7XHJcblx0XHRcdFx0XHRcdG1vZGVGb3JDb21wb25lbnQgPSB2aWV3SWQ7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcIltGbHVlbnRDb21wb25lbnRdIFRhcmdldCBjb21wb25lbnQgZGV0ZXJtaW5lZDpcIixcclxuXHRcdFx0dGFyZ2V0Q29tcG9uZW50Py5jb25zdHJ1Y3Rvcj8ubmFtZVxyXG5cdFx0KTtcclxuXHJcblx0XHRpZiAodGFyZ2V0Q29tcG9uZW50KSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdGBbRmx1ZW50Q29tcG9uZW50XSBBY3RpdmF0aW5nIGNvbXBvbmVudCBmb3IgdmlldyAke3ZpZXdJZH06YCxcclxuXHRcdFx0XHR0YXJnZXRDb21wb25lbnQuY29uc3RydWN0b3IubmFtZVxyXG5cdFx0XHQpO1xyXG5cdFx0XHR0YXJnZXRDb21wb25lbnQuY29udGFpbmVyRWwuc2hvdygpO1xyXG5cdFx0XHR0aGlzLmN1cnJlbnRWaXNpYmxlQ29tcG9uZW50ID0gdGFyZ2V0Q29tcG9uZW50O1xyXG5cclxuXHRcdFx0Ly8gU2V0IHZpZXcgbW9kZSBmaXJzdCBmb3IgQ29udGVudENvbXBvbmVudFxyXG5cdFx0XHRpZiAodHlwZW9mIHRhcmdldENvbXBvbmVudC5zZXRWaWV3TW9kZSA9PT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRgW0ZsdWVudENvbXBvbmVudF0gU2V0dGluZyB2aWV3IG1vZGUgZm9yICR7dmlld0lkfSB0byAke21vZGVGb3JDb21wb25lbnR9YFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0dGFyZ2V0Q29tcG9uZW50LnNldFZpZXdNb2RlKG1vZGVGb3JDb21wb25lbnQgYXMgYW55LCBwcm9qZWN0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gU2V0IHRhc2tzIG9uIHRoZSBjb21wb25lbnRcclxuXHRcdFx0aWYgKHR5cGVvZiB0YXJnZXRDb21wb25lbnQuc2V0VGFza3MgPT09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHRcdC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIGNvbXBvbmVudHMgdGhhdCBuZWVkIG9ubHkgYWxsIHRhc2tzIChzaW5nbGUgcGFyYW1ldGVyKVxyXG5cdFx0XHRcdGlmICh2aWV3SWQgPT09IFwicmV2aWV3XCIgfHwgdmlld0lkID09PSBcInRhZ3NcIikge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcdGBbRmx1ZW50Q29tcG9uZW50XSBDYWxsaW5nIHNldFRhc2tzIGZvciAke3ZpZXdJZH0gd2l0aCBBTEwgdGFza3M6YCxcclxuXHRcdFx0XHRcdFx0dGFza3MubGVuZ3RoXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0dGFyZ2V0Q29tcG9uZW50LnNldFRhc2tzKHRhc2tzKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0Ly8gVXNlIGZpbHRlcmVkIHRhc2tzXHJcblx0XHRcdFx0XHRsZXQgZmlsdGVyZWRUYXNrc0xvY2FsID0gWy4uLmZpbHRlcmVkVGFza3NdO1xyXG5cdFx0XHRcdFx0Ly8gRm9yZWNhc3QgdmlldzogcmVtb3ZlIGJhZGdlLW9ubHkgaXRlbXNcclxuXHRcdFx0XHRcdGlmICh2aWV3SWQgPT09IFwiZm9yZWNhc3RcIikge1xyXG5cdFx0XHRcdFx0XHRmaWx0ZXJlZFRhc2tzTG9jYWwgPSBmaWx0ZXJlZFRhc2tzTG9jYWwuZmlsdGVyKFxyXG5cdFx0XHRcdFx0XHRcdCh0YXNrKSA9PiAhKHRhc2sgYXMgYW55KS5iYWRnZVxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcdFwiW0ZsdWVudENvbXBvbmVudF0gQ2FsbGluZyBzZXRUYXNrcyB3aXRoIGZpbHRlcmVkOlwiLFxyXG5cdFx0XHRcdFx0XHRmaWx0ZXJlZFRhc2tzTG9jYWwubGVuZ3RoLFxyXG5cdFx0XHRcdFx0XHRcImFsbDpcIixcclxuXHRcdFx0XHRcdFx0dGFza3MubGVuZ3RoXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0dGFyZ2V0Q29tcG9uZW50LnNldFRhc2tzKGZpbHRlcmVkVGFza3NMb2NhbCwgdGFza3MpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSGFuZGxlIHVwZGF0ZVRhc2tzIG1ldGhvZCBmb3IgdGFibGUgdmlldyBhZGFwdGVyXHJcblx0XHRcdGlmICh0eXBlb2YgdGFyZ2V0Q29tcG9uZW50LnVwZGF0ZVRhc2tzID09PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0XHRjb25zdCBmaWx0ZXJPcHRpb25zOiBhbnkgPSB7fTtcclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRjdXJyZW50RmlsdGVyU3RhdGUgJiZcclxuXHRcdFx0XHRcdGN1cnJlbnRGaWx0ZXJTdGF0ZS5maWx0ZXJHcm91cHMgJiZcclxuXHRcdFx0XHRcdGN1cnJlbnRGaWx0ZXJTdGF0ZS5maWx0ZXJHcm91cHMubGVuZ3RoID4gMFxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0ZmlsdGVyT3B0aW9ucy5hZHZhbmNlZEZpbHRlciA9IGN1cnJlbnRGaWx0ZXJTdGF0ZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHRhcmdldENvbXBvbmVudC51cGRhdGVUYXNrcyhcclxuXHRcdFx0XHRcdGZpbHRlclRhc2tzKFxyXG5cdFx0XHRcdFx0XHR0YXNrcyxcclxuXHRcdFx0XHRcdFx0dmlld0lkIGFzIGFueSxcclxuXHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdFx0XHRcdGZpbHRlck9wdGlvbnNcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBSZWZyZXNoIHJldmlldyBzZXR0aW5ncyBpZiBuZWVkZWRcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHZpZXdJZCA9PT0gXCJyZXZpZXdcIiAmJlxyXG5cdFx0XHRcdHR5cGVvZiB0YXJnZXRDb21wb25lbnQucmVmcmVzaFJldmlld1NldHRpbmdzID09PSBcImZ1bmN0aW9uXCJcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0dGFyZ2V0Q29tcG9uZW50LnJlZnJlc2hSZXZpZXdTZXR0aW5ncygpO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0YFtGbHVlbnRDb21wb25lbnRdIE5vIHRhcmdldCBjb21wb25lbnQgZm91bmQgZm9yIHZpZXdJZDogJHt2aWV3SWR9YFxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVuZGVyIGNvbnRlbnQgd2l0aCBzcGVjaWZpYyB2aWV3IG1vZGUgKGxpc3QvdHJlZS9rYW5iYW4vY2FsZW5kYXIpXHJcblx0ICovXHJcblx0cmVuZGVyQ29udGVudFdpdGhWaWV3TW9kZShcclxuXHRcdHZpZXdJZDogc3RyaW5nLFxyXG5cdFx0dGFza3M6IFRhc2tbXSxcclxuXHRcdGZpbHRlcmVkVGFza3M6IFRhc2tbXSxcclxuXHRcdHZpZXdNb2RlOiBWaWV3TW9kZVxyXG5cdCk6IHZvaWQge1xyXG5cdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFwiW0ZsdWVudENvbXBvbmVudF0gcmVuZGVyQ29udGVudFdpdGhWaWV3TW9kZSBjYWxsZWQsIHZpZXdNb2RlOlwiLFxyXG5cdFx0XHR2aWV3TW9kZVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBIaWRlIGN1cnJlbnQgY29tcG9uZW50XHJcblx0XHR0aGlzLmhpZGVBbGxDb21wb25lbnRzKCk7XHJcblxyXG5cdFx0Ly8gQmFzZWQgb24gdGhlIGN1cnJlbnQgdmlldyBtb2RlLCBzaG93IHRoZSBhcHByb3ByaWF0ZSBjb21wb25lbnRcclxuXHRcdHN3aXRjaCAodmlld01vZGUpIHtcclxuXHRcdFx0Y2FzZSBcImxpc3RcIjpcclxuXHRcdFx0Y2FzZSBcInRyZWVcIjpcclxuXHRcdFx0XHQvLyBVc2UgQ29udGVudENvbXBvbmVudCBmb3IgbGlzdCBhbmQgdHJlZSB2aWV3c1xyXG5cdFx0XHRcdGlmICghdGhpcy5jb250ZW50Q29tcG9uZW50KSByZXR1cm47XHJcblxyXG5cdFx0XHRcdHRoaXMuY29udGVudENvbXBvbmVudC5jb250YWluZXJFbC5zaG93KCk7XHJcblx0XHRcdFx0dGhpcy5jb250ZW50Q29tcG9uZW50LnNldFZpZXdNb2RlKHZpZXdJZCBhcyBhbnkpO1xyXG5cdFx0XHRcdHRoaXMuY29udGVudENvbXBvbmVudC5zZXRJc1RyZWVWaWV3KHZpZXdNb2RlID09PSBcInRyZWVcIik7XHJcblxyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XCJbRmx1ZW50Q29tcG9uZW50XSBTZXR0aW5nIHRhc2tzIHRvIENvbnRlbnRDb21wb25lbnQsIGZpbHRlcmVkOlwiLFxyXG5cdFx0XHRcdFx0ZmlsdGVyZWRUYXNrcy5sZW5ndGhcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHRoaXMuY29udGVudENvbXBvbmVudC5zZXRUYXNrcyhmaWx0ZXJlZFRhc2tzLCB0YXNrcyk7XHJcblx0XHRcdFx0dGhpcy5jdXJyZW50VmlzaWJsZUNvbXBvbmVudCA9IHRoaXMuY29udGVudENvbXBvbmVudDtcclxuXHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdGNhc2UgXCJrYW5iYW5cIjpcclxuXHRcdFx0XHQvLyBVc2UgS2FuYmFuQ29tcG9uZW50XHJcblx0XHRcdFx0aWYgKCF0aGlzLmthbmJhbkNvbXBvbmVudCkgcmV0dXJuO1xyXG5cclxuXHRcdFx0XHR0aGlzLmthbmJhbkNvbXBvbmVudC5jb250YWluZXJFbC5zaG93KCk7XHJcblxyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XCJbRmx1ZW50Q29tcG9uZW50XSBTZXR0aW5nXCIsXHJcblx0XHRcdFx0XHRmaWx0ZXJlZFRhc2tzLmxlbmd0aCxcclxuXHRcdFx0XHRcdFwidGFza3MgdG8ga2FuYmFuXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHRoaXMua2FuYmFuQ29tcG9uZW50LnNldFRhc2tzKGZpbHRlcmVkVGFza3MpO1xyXG5cdFx0XHRcdHRoaXMuY3VycmVudFZpc2libGVDb21wb25lbnQgPSB0aGlzLmthbmJhbkNvbXBvbmVudDtcclxuXHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdGNhc2UgXCJjYWxlbmRhclwiOlxyXG5cdFx0XHRcdC8vIFVzZSBDYWxlbmRhckNvbXBvbmVudFxyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XCJbRmx1ZW50Q29tcG9uZW50XSBDYWxlbmRhciBtb2RlIGluIHJlbmRlckNvbnRlbnRXaXRoVmlld01vZGVcIlxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0aWYgKCF0aGlzLmNhbGVuZGFyQ29tcG9uZW50KSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdFx0XCJbRmx1ZW50Q29tcG9uZW50XSBObyBjYWxlbmRhciBjb21wb25lbnQgYXZhaWxhYmxlIVwiXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Y29uc29sZS5sb2coXCJbRmx1ZW50Q29tcG9uZW50XSBTaG93aW5nIGNhbGVuZGFyIGNvbXBvbmVudFwiKTtcclxuXHRcdFx0XHR0aGlzLmNhbGVuZGFyQ29tcG9uZW50LmNvbnRhaW5lckVsLnNob3coKTtcclxuXHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcIltGbHVlbnRDb21wb25lbnRdIFNldHRpbmdcIixcclxuXHRcdFx0XHRcdGZpbHRlcmVkVGFza3MubGVuZ3RoLFxyXG5cdFx0XHRcdFx0XCJ0YXNrcyB0byBjYWxlbmRhclwiXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHR0aGlzLmNhbGVuZGFyQ29tcG9uZW50LnNldFRhc2tzKGZpbHRlcmVkVGFza3MpO1xyXG5cdFx0XHRcdHRoaXMuY3VycmVudFZpc2libGVDb21wb25lbnQgPSB0aGlzLmNhbGVuZGFyQ29tcG9uZW50O1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiW0ZsdWVudENvbXBvbmVudF0gQ2FsZW5kYXIgbW9kZSBzZXR1cCBjb21wbGV0ZVwiKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlZnJlc2ggY3VycmVudCB2aWV3IGRhdGEgd2l0aG91dCBmdWxsIHJlLXJlbmRlclxyXG5cdCAqL1xyXG5cdHJlZnJlc2hDdXJyZW50Vmlld0RhdGEoXHJcblx0XHR2aWV3SWQ6IHN0cmluZyxcclxuXHRcdHRhc2tzOiBUYXNrW10sXHJcblx0XHRmaWx0ZXJlZFRhc2tzOiBUYXNrW10sXHJcblx0XHR2aWV3TW9kZTogVmlld01vZGVcclxuXHQpOiB2b2lkIHtcclxuXHRcdC8vIENvbnRlbnQtYmFzZWQgdmlld3MgKGxpc3QvdHJlZS9rYW5iYW4vY2FsZW5kYXIpXHJcblx0XHRpZiAodGhpcy5pc0NvbnRlbnRCYXNlZFZpZXcodmlld0lkKSkge1xyXG5cdFx0XHRzd2l0Y2ggKHZpZXdNb2RlKSB7XHJcblx0XHRcdFx0Y2FzZSBcImthbmJhblwiOlxyXG5cdFx0XHRcdFx0dGhpcy5rYW5iYW5Db21wb25lbnQ/LnNldFRhc2tzPy4oZmlsdGVyZWRUYXNrcyk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIFwiY2FsZW5kYXJcIjpcclxuXHRcdFx0XHRcdHRoaXMuY2FsZW5kYXJDb21wb25lbnQ/LnNldFRhc2tzPy4oZmlsdGVyZWRUYXNrcyk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIFwidHJlZVwiOlxyXG5cdFx0XHRcdGNhc2UgXCJsaXN0XCI6XHJcblx0XHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRcdHRoaXMuY29udGVudENvbXBvbmVudD8uc2V0VGFza3M/LihcclxuXHRcdFx0XHRcdFx0ZmlsdGVyZWRUYXNrcyxcclxuXHRcdFx0XHRcdFx0dGFza3MsXHJcblx0XHRcdFx0XHRcdHRydWVcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU3BlY2lhbC9vdGhlciB2aWV3c1xyXG5cdFx0aWYgKHRoaXMudmlld0NvbXBvbmVudE1hbmFnZXI/LmlzU3BlY2lhbFZpZXcodmlld0lkKSkge1xyXG5cdFx0XHRjb25zdCBjb21wOiBhbnkgPSAoXHJcblx0XHRcdFx0dGhpcy52aWV3Q29tcG9uZW50TWFuYWdlciBhcyBhbnlcclxuXHRcdFx0KS5nZXRPckNyZWF0ZUNvbXBvbmVudCh2aWV3SWQpO1xyXG5cdFx0XHRpZiAoY29tcD8udXBkYXRlVGFza3MpIHtcclxuXHRcdFx0XHRjb21wLnVwZGF0ZVRhc2tzKGZpbHRlcmVkVGFza3MpO1xyXG5cdFx0XHR9IGVsc2UgaWYgKGNvbXA/LnNldFRhc2tzKSB7XHJcblx0XHRcdFx0Y29tcC5zZXRUYXNrcyhmaWx0ZXJlZFRhc2tzLCB0YXNrcyk7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIERpcmVjdCBrbm93biBjb21wb25lbnRzIGZhbGxiYWNrXHJcblx0XHRjb25zdCBtYXBwaW5nOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge1xyXG5cdFx0XHRmb3JlY2FzdDogdGhpcy5mb3JlY2FzdENvbXBvbmVudCxcclxuXHRcdFx0dGFnczogdGhpcy50YWdzQ29tcG9uZW50LFxyXG5cdFx0XHRwcm9qZWN0czogdGhpcy5jb250ZW50Q29tcG9uZW50LFxyXG5cdFx0XHRyZXZpZXc6IHRoaXMucmV2aWV3Q29tcG9uZW50LFxyXG5cdFx0XHRoYWJpdDogdGhpcy5oYWJpdENvbXBvbmVudCxcclxuXHRcdFx0Z2FudHQ6IHRoaXMuZ2FudHRDb21wb25lbnQsXHJcblx0XHRcdGthbmJhbjogdGhpcy5rYW5iYW5Db21wb25lbnQsXHJcblx0XHRcdGNhbGVuZGFyOiB0aGlzLmNhbGVuZGFyQ29tcG9uZW50LFxyXG5cdFx0fTtcclxuXHJcblx0XHRjb25zdCB0YXJnZXQ6IGFueSA9IChtYXBwaW5nIGFzIGFueSlbdmlld0lkXTtcclxuXHRcdGlmICh0YXJnZXQ/LnNldFRhc2tzKSB7XHJcblx0XHRcdGlmICh2aWV3SWQgPT09IFwicHJvamVjdHNcIiB8fCB0aGlzLmlzQ29udGVudEJhc2VkVmlldyh2aWV3SWQpKSB7XHJcblx0XHRcdFx0dGFyZ2V0LnNldFRhc2tzKGZpbHRlcmVkVGFza3MsIHRhc2tzLCB0cnVlKTtcclxuXHRcdFx0fSBlbHNlIGlmICh2aWV3SWQgPT09IFwicmV2aWV3XCIgfHwgdmlld0lkID09PSBcInRhZ3NcIikge1xyXG5cdFx0XHRcdHRhcmdldC5zZXRUYXNrcyh0YXNrcyk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGFyZ2V0LnNldFRhc2tzKGZpbHRlcmVkVGFza3MpO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2UgaWYgKHRhcmdldD8udXBkYXRlVGFza3MpIHtcclxuXHRcdFx0dGFyZ2V0LnVwZGF0ZVRhc2tzKGZpbHRlcmVkVGFza3MpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVuZGVyIGxvYWRpbmcgc3RhdGVcclxuXHQgKi9cclxuXHRyZW5kZXJMb2FkaW5nU3RhdGUoKTogdm9pZCB7XHJcblx0XHRjb25zb2xlLmxvZyhcIltGbHVlbnRDb21wb25lbnRdIHJlbmRlckxvYWRpbmdTdGF0ZSBjYWxsZWRcIik7XHJcblx0XHRpZiAodGhpcy5jb250ZW50QXJlYSkge1xyXG5cdFx0XHQvLyBSZW1vdmUgZXhpc3RpbmcgbG9hZGluZyBvdmVybGF5c1xyXG5cdFx0XHR0aGlzLmNvbnRlbnRBcmVhXHJcblx0XHRcdFx0LnF1ZXJ5U2VsZWN0b3JBbGwoXCIudGctZmx1ZW50LWxvYWRpbmdcIilcclxuXHRcdFx0XHQuZm9yRWFjaCgoZWwpID0+IGVsLnJlbW92ZSgpKTtcclxuXHJcblx0XHRcdGNvbnN0IGxvYWRpbmdFbCA9IHRoaXMuY29udGVudEFyZWEuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwidGctZmx1ZW50LWxvYWRpbmdcIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdGxvYWRpbmdFbC5jcmVhdGVEaXYoe2NsczogXCJ0Zy1mbHVlbnQtc3Bpbm5lclwifSk7XHJcblx0XHRcdGxvYWRpbmdFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJ0Zy1mbHVlbnQtbG9hZGluZy10ZXh0XCIsXHJcblx0XHRcdFx0dGV4dDogdChcIkxvYWRpbmcgdGFza3MuLi5cIiksXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVuZGVyIGVycm9yIHN0YXRlXHJcblx0ICovXHJcblx0cmVuZGVyRXJyb3JTdGF0ZShlcnJvck1lc3NhZ2U6IHN0cmluZywgb25SZXRyeTogKCkgPT4gdm9pZCk6IHZvaWQge1xyXG5cdFx0aWYgKHRoaXMuY29udGVudEFyZWEpIHtcclxuXHRcdFx0dGhpcy5jb250ZW50QXJlYVxyXG5cdFx0XHRcdC5xdWVyeVNlbGVjdG9yQWxsKFwiLnRnLWZsdWVudC1lcnJvci1zdGF0ZVwiKVxyXG5cdFx0XHRcdC5mb3JFYWNoKChlbCkgPT4gZWwucmVtb3ZlKCkpO1xyXG5cclxuXHRcdFx0Y29uc3QgZXJyb3JFbCA9IHRoaXMuY29udGVudEFyZWEuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwidGctZmx1ZW50LWVycm9yLXN0YXRlXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRjb25zdCBlcnJvckljb24gPSBlcnJvckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcInRnLWZsdWVudC1lcnJvci1pY29uXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRzZXRJY29uKGVycm9ySWNvbiwgXCJhbGVydC10cmlhbmdsZVwiKTtcclxuXHJcblx0XHRcdGVycm9yRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwidGctZmx1ZW50LWVycm9yLXRpdGxlXCIsXHJcblx0XHRcdFx0dGV4dDogdChcIkZhaWxlZCB0byBsb2FkIHRhc2tzXCIpLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGVycm9yRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwidGctZmx1ZW50LWVycm9yLW1lc3NhZ2VcIixcclxuXHRcdFx0XHR0ZXh0OiBlcnJvck1lc3NhZ2UgfHwgdChcIkFuIHVuZXhwZWN0ZWQgZXJyb3Igb2NjdXJyZWRcIiksXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgcmV0cnlCdG4gPSBlcnJvckVsLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0XHRjbHM6IFwidGctZmx1ZW50LWJ1dHRvbiB0Zy1mbHVlbnQtYnV0dG9uLXByaW1hcnlcIixcclxuXHRcdFx0XHR0ZXh0OiB0KFwiUmV0cnlcIiksXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0cmV0cnlCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIG9uUmV0cnkpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVuZGVyIGVtcHR5IHN0YXRlXHJcblx0ICovXHJcblx0cmVuZGVyRW1wdHlTdGF0ZSgpOiB2b2lkIHtcclxuXHRcdGlmICh0aGlzLmNvbnRlbnRBcmVhKSB7XHJcblx0XHRcdHRoaXMuY29udGVudEFyZWFcclxuXHRcdFx0XHQucXVlcnlTZWxlY3RvckFsbChcIi50Zy1mbHVlbnQtZW1wdHktc3RhdGVcIilcclxuXHRcdFx0XHQuZm9yRWFjaCgoZWwpID0+IGVsLnJlbW92ZSgpKTtcclxuXHJcblx0XHRcdGNvbnN0IGVtcHR5RWwgPSB0aGlzLmNvbnRlbnRBcmVhLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcInRnLWZsdWVudC1lbXB0eS1zdGF0ZVwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0Y29uc3QgZW1wdHlJY29uID0gZW1wdHlFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJ0Zy1mbHVlbnQtZW1wdHktaWNvblwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0c2V0SWNvbihlbXB0eUljb24sIFwiaW5ib3hcIik7XHJcblxyXG5cdFx0XHRlbXB0eUVsLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcInRnLWZsdWVudC1lbXB0eS10aXRsZVwiLFxyXG5cdFx0XHRcdHRleHQ6IHQoXCJObyB0YXNrcyB5ZXRcIiksXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0ZW1wdHlFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJ0Zy1mbHVlbnQtZW1wdHktZGVzY3JpcHRpb25cIixcclxuXHRcdFx0XHR0ZXh0OiB0KFxyXG5cdFx0XHRcdFx0XCJDcmVhdGUgeW91ciBmaXJzdCB0YXNrIHRvIGdldCBzdGFydGVkIHdpdGggVGFzayBHZW5pdXNcIlxyXG5cdFx0XHRcdCksXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgY3JlYXRlQnRuID0gZW1wdHlFbC5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdFx0Y2xzOiBcInRnLWZsdWVudC1idXR0b24gdGctZmx1ZW50LWJ1dHRvbi1wcmltYXJ5XCIsXHJcblx0XHRcdFx0dGV4dDogdChcIkNyZWF0ZSBUYXNrXCIpLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNyZWF0ZUJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdG5ldyBRdWlja0NhcHR1cmVNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4pLm9wZW4oKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDaGVjayBpZiB2aWV3IGlzIGNvbnRlbnQtYmFzZWQgKHN1cHBvcnRzIG11bHRpcGxlIHZpZXcgbW9kZXMpXHJcblx0ICovXHJcblx0cHJpdmF0ZSBpc0NvbnRlbnRCYXNlZFZpZXcodmlld0lkOiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHRcdGNvbnN0IGNvbnRlbnRCYXNlZFZpZXdzID0gW1xyXG5cdFx0XHRcImluYm94XCIsXHJcblx0XHRcdFwidG9kYXlcIixcclxuXHRcdFx0XCJ1cGNvbWluZ1wiLFxyXG5cdFx0XHRcImZsYWdnZWRcIixcclxuXHRcdFx0XCJwcm9qZWN0c1wiLFxyXG5cdFx0XTtcclxuXHRcdHJldHVybiBjb250ZW50QmFzZWRWaWV3cy5pbmNsdWRlcyh2aWV3SWQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGF2YWlsYWJsZSB2aWV3IG1vZGVzIGZvciBhIHNwZWNpZmljIHZpZXdcclxuXHQgKi9cclxuXHRnZXRBdmFpbGFibGVNb2Rlc0ZvclZpZXcodmlld0lkOiBzdHJpbmcpOiBWaWV3TW9kZVtdIHtcclxuXHRcdC8vIENoZWNrIGZvciBzcGVjaWFsIHR3by1jb2x1bW4gdmlld3NcclxuXHRcdGNvbnN0IHZpZXdDb25maWcgPSBnZXRWaWV3U2V0dGluZ09yRGVmYXVsdCh0aGlzLnBsdWdpbiwgdmlld0lkIGFzIGFueSk7XHJcblx0XHRpZiAodmlld0NvbmZpZz8uc3BlY2lmaWNDb25maWc/LnZpZXdUeXBlID09PSBcInR3b2NvbHVtblwiKSB7XHJcblx0XHRcdHJldHVybiBbXTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDaGVjayBmb3Igc3BlY2lhbCB2aWV3cyBtYW5hZ2VkIGJ5IFZpZXdDb21wb25lbnRNYW5hZ2VyXHJcblx0XHRpZiAodGhpcy52aWV3Q29tcG9uZW50TWFuYWdlcj8uaXNTcGVjaWFsVmlldyh2aWV3SWQpKSB7XHJcblx0XHRcdHJldHVybiBbXTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZXR1cm4gdGhlIGNvbmZpZ3VyZWQgbW9kZXMgZm9yIHRoZSB2aWV3LCBvciBlbXB0eSBhcnJheVxyXG5cdFx0cmV0dXJuIFZJRVdfTU9ERV9DT05GSUdbdmlld0lkXSB8fCBbXTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsZWFuIHVwIG9uIHVubG9hZFxyXG5cdCAqL1xyXG5cdG9udW5sb2FkKCk6IHZvaWQge1xyXG5cdFx0Ly8gQ29tcG9uZW50cyB3aWxsIGJlIGNsZWFuZWQgdXAgYnkgcGFyZW50IENvbXBvbmVudCBsaWZlY3ljbGVcclxuXHRcdHN1cGVyLm9udW5sb2FkKCk7XHJcblx0fVxyXG59XHJcbiJdfQ==