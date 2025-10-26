import { __awaiter } from "tslib";
import { ItemView, ExtraButtonComponent, Menu, Scope, debounce,
// FrontmatterCache,
 } from "obsidian";
// Removed SidebarComponent import
import { ContentComponent } from "@/components/features/task/view/content";
import { ForecastComponent } from "@/components/features/task/view/forecast";
import { TagsComponent } from "@/components/features/task/view/tags";
import { ProjectsComponent } from "@/components/features/task/view/projects";
import { ReviewComponent } from "@/components/features/task/view/review";
import { TaskDetailsComponent, createTaskCheckbox, } from "@/components/features/task/view/details";
import "../styles/view.css";
import { QuickCaptureModal } from "@/components/features/quick-capture/modals/QuickCaptureModal";
import { t } from "@/translations/helper";
import { getViewSettingOrDefault, } from "@/common/setting-definition";
import { filterTasks } from "@/utils/task/task-filter-utils";
import { CalendarComponent, } from "@/components/features/calendar";
import { KanbanComponent } from "@/components/features/kanban/kanban";
import { GanttComponent } from "@/components/features/gantt/gantt";
import { TaskPropertyTwoColumnView } from "@/components/features/task/view/TaskPropertyTwoColumnView";
import { ViewComponentManager } from "@/components/ui";
import { Habit as HabitsComponent } from "../components/features/habit/habit";
import { Platform } from "obsidian";
import { ViewTaskFilterPopover, ViewTaskFilterModal, } from "@/components/features/task/filter";
import { isDataflowEnabled } from "@/dataflow/createDataflow";
import { Events, on } from "@/dataflow/events/Events";
export const TASK_SPECIFIC_VIEW_TYPE = "task-genius-specific-view";
export class TaskSpecificView extends ItemView {
    constructor(leaf, plugin) {
        var _a;
        super(leaf);
        this.plugin = plugin;
        // Custom view components by view ID
        this.twoColumnViewComponents = new Map();
        // UI state management (Sidebar state removed)
        this.isDetailsVisible = false;
        this.currentViewId = "inbox"; // Default or loaded from state
        this.currentSelectedTaskId = null;
        this.currentSelectedTaskDOM = null;
        this.lastToggleTimestamp = 0;
        this.currentFilterState = null;
        this.liveFilterState = null; // 新增：专门跟踪实时过滤器状态
        // Data management
        this.tasks = [];
        this.debouncedApplyFilter = debounce(() => {
            this.applyCurrentFilter();
        }, 100);
        // Method to handle status updates originating from Kanban drag-and-drop
        this.handleKanbanTaskStatusUpdate = (taskId, newStatusMark) => __awaiter(this, void 0, void 0, function* () {
            console.log(`TaskSpecificView handling Kanban status update request for ${taskId} to mark ${newStatusMark}`);
            const taskToUpdate = this.tasks.find((t) => t.id === taskId);
            if (taskToUpdate) {
                const isCompleted = newStatusMark.toLowerCase() ===
                    (this.plugin.settings.taskStatuses.completed || "x")
                        .split("|")[0]
                        .toLowerCase();
                const completedDate = isCompleted ? Date.now() : undefined;
                if (taskToUpdate.status !== newStatusMark ||
                    taskToUpdate.completed !== isCompleted) {
                    try {
                        // 创建更新的任务对象，将 completedDate 设置到 metadata 中
                        const updatedTaskData = Object.assign(Object.assign({}, taskToUpdate), { status: newStatusMark, completed: isCompleted });
                        // 确保 metadata 存在并设置 completedDate
                        if (updatedTaskData.metadata) {
                            updatedTaskData.metadata.completedDate = completedDate;
                        }
                        // Use updateTask to ensure consistency and UI updates
                        yield this.updateTask(taskToUpdate, updatedTaskData);
                        console.log(`Task ${taskId} status update processed by TaskSpecificView.`);
                    }
                    catch (error) {
                        console.error(`TaskSpecificView failed to update task status from Kanban callback for task ${taskId}:`, error);
                    }
                }
                else {
                    console.log(`Task ${taskId} status (${newStatusMark}) already matches, no update needed.`);
                }
            }
            else {
                console.warn(`TaskSpecificView could not find task with ID ${taskId} for Kanban status update.`);
            }
        });
        // 使用预加载的任务进行快速初始显示
        this.tasks = this.plugin.preloadedTasks || [];
        this.scope = new Scope(this.app.scope);
        (_a = this.scope) === null || _a === void 0 ? void 0 : _a.register(null, "escape", (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    }
    // New State Management Methods
    getState() {
        const state = super.getState();
        return Object.assign(Object.assign({}, state), { viewId: this.currentViewId, project: this.currentProject, filterState: this.liveFilterState });
    }
    setState(state, result) {
        const _super = Object.create(null, {
            setState: { get: () => super.setState }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.setState.call(this, state, result);
            if (state && typeof state === "object") {
                const specificState = state;
                this.currentViewId = (specificState === null || specificState === void 0 ? void 0 : specificState.viewId) || "inbox";
                this.currentProject = specificState === null || specificState === void 0 ? void 0 : specificState.project;
                // 从状态恢复的过滤器应该被视为实时过滤器
                this.liveFilterState = (specificState === null || specificState === void 0 ? void 0 : specificState.filterState) || null;
                this.currentFilterState = (specificState === null || specificState === void 0 ? void 0 : specificState.filterState) || null;
                console.log("TaskSpecificView setState:", specificState);
                if (!this.rootContainerEl) {
                    this.app.workspace.onLayoutReady(() => {
                        if (this.currentViewId) {
                            this.switchView(this.currentViewId, this.currentProject);
                        }
                    });
                }
                else if (this.currentViewId) {
                    this.switchView(this.currentViewId, this.currentProject);
                }
            }
        });
    }
    getViewType() {
        return TASK_SPECIFIC_VIEW_TYPE;
    }
    getDisplayText() {
        const currentViewConfig = getViewSettingOrDefault(this.plugin, this.currentViewId);
        // Potentially add project name if relevant for 'projects' view?
        return currentViewConfig.name;
    }
    getIcon() {
        const currentViewConfig = getViewSettingOrDefault(this.plugin, this.currentViewId);
        return currentViewConfig.icon;
    }
    onOpen() {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            this.contentEl.toggleClass("task-genius-view", true);
            this.contentEl.toggleClass("task-genius-specific-view", true);
            this.rootContainerEl = this.contentEl.createDiv({
                cls: "task-genius-container no-sidebar",
            });
            // Add debounced view update to prevent rapid successive refreshes
            const debouncedViewUpdate = debounce(() => __awaiter(this, void 0, void 0, function* () {
                // Don't skip view updates - the detailsComponent will handle edit state properly
                yield this.loadTasks(false, false);
            }), 150); // 150ms debounce delay
            // 1. 首先注册事件监听器，确保不会错过任何更新
            if (isDataflowEnabled(this.plugin) &&
                this.plugin.dataflowOrchestrator) {
                // Dataflow: 订阅统一事件
                this.registerEvent(on(this.app, Events.CACHE_READY, () => __awaiter(this, void 0, void 0, function* () {
                    // 冷启动就绪，从快照加载，并刷新视图
                    yield this.loadTasksFast(false);
                })));
                this.registerEvent(on(this.app, Events.TASK_CACHE_UPDATED, debouncedViewUpdate));
            }
            else {
                // Legacy: 兼容旧事件
                this.registerEvent(this.app.workspace.on("task-genius:task-cache-updated", debouncedViewUpdate));
            }
            this.registerEvent(this.app.workspace.on("task-genius:filter-changed", (filterState, leafId) => {
                console.log("TaskSpecificView 过滤器实时变更:", filterState, "leafId:", leafId);
                // 只处理来自当前视图的过滤器变更
                if (leafId === this.leaf.id) {
                    // 这是来自当前视图的实时过滤器组件的变更
                    this.liveFilterState = filterState;
                    this.currentFilterState = filterState;
                    console.log("更新 TaskSpecificView 实时过滤器状态");
                    this.debouncedApplyFilter();
                }
                // 忽略来自其他leafId的变更，包括基础过滤器（view-config-开头）
            }));
            // 2. 初始化组件（但先不传入数据）
            this.initializeComponents();
            // 3. 获取初始视图状态
            const state = this.leaf.getViewState().state;
            const specificState = state;
            console.log("TaskSpecificView initial state:", specificState);
            this.currentViewId = (specificState === null || specificState === void 0 ? void 0 : specificState.viewId) || "inbox"; // Fallback if state is missing
            this.currentProject = specificState === null || specificState === void 0 ? void 0 : specificState.project;
            this.currentFilterState = (specificState === null || specificState === void 0 ? void 0 : specificState.filterState) || null;
            // 4. 先使用预加载的数据快速显示
            this.switchView(this.currentViewId, this.currentProject);
            // 5. 快速加载缓存数据以立即显示 UI 并刷新视图
            yield this.loadTasksFast(false);
            // 6. 后台同步最新数据（非阻塞）
            this.loadTasksWithSyncInBackground();
            this.toggleDetailsVisibility(false);
            this.createActionButtons(); // Keep details toggle and quick capture
            (_a = this.leaf.tabHeaderStatusContainerEl) === null || _a === void 0 ? void 0 : _a.empty();
            (_b = this.leaf.tabHeaderEl) === null || _b === void 0 ? void 0 : _b.toggleClass("task-genius-tab-header", true);
            this.tabActionButton = (_c = this.leaf.tabHeaderStatusContainerEl) === null || _c === void 0 ? void 0 : _c.createEl("span", {
                cls: "task-genius-action-btn",
            }, (el) => {
                new ExtraButtonComponent(el)
                    .setIcon("check-square")
                    .setTooltip(t("Capture"))
                    .onClick(() => {
                    const modal = new QuickCaptureModal(this.plugin.app, this.plugin, {}, true);
                    modal.open();
                });
            });
            if (this.tabActionButton) {
                this.register(() => {
                    this.tabActionButton.detach();
                });
            }
        });
    }
    // Removed onResize and checkAndCollapseSidebar methods
    initializeComponents() {
        // No SidebarComponent initialization
        // No createSidebarToggle call
        this.contentComponent = new ContentComponent(this.rootContainerEl, this.plugin.app, this.plugin, {
            onTaskSelected: (task) => {
                this.handleTaskSelection(task);
            },
            onTaskCompleted: (task) => {
                this.toggleTaskCompletion(task);
            },
            onTaskContextMenu: (event, task) => {
                this.handleTaskContextMenu(event, task);
            },
        });
        this.addChild(this.contentComponent);
        this.contentComponent.load();
        this.forecastComponent = new ForecastComponent(this.rootContainerEl, this.plugin.app, this.plugin, {
            onTaskSelected: (task) => {
                this.handleTaskSelection(task);
            },
            onTaskCompleted: (task) => {
                this.toggleTaskCompletion(task);
            },
            onTaskUpdate: (originalTask, updatedTask) => __awaiter(this, void 0, void 0, function* () {
                yield this.handleTaskUpdate(originalTask, updatedTask);
            }),
            onTaskContextMenu: (event, task) => {
                this.handleTaskContextMenu(event, task);
            },
        });
        this.addChild(this.forecastComponent);
        this.forecastComponent.load();
        this.forecastComponent.containerEl.hide();
        this.tagsComponent = new TagsComponent(this.rootContainerEl, this.plugin.app, this.plugin, {
            onTaskSelected: (task) => {
                this.handleTaskSelection(task);
            },
            onTaskCompleted: (task) => {
                this.toggleTaskCompletion(task);
            },
            onTaskContextMenu: (event, task) => {
                this.handleTaskContextMenu(event, task);
            },
        });
        this.addChild(this.tagsComponent);
        this.tagsComponent.load();
        this.tagsComponent.containerEl.hide();
        this.projectsComponent = new ProjectsComponent(this.rootContainerEl, this.plugin.app, this.plugin, {
            onTaskSelected: (task) => {
                this.handleTaskSelection(task);
            },
            onTaskCompleted: (task) => {
                this.toggleTaskCompletion(task);
            },
            onTaskContextMenu: (event, task) => {
                this.handleTaskContextMenu(event, task);
            },
        });
        this.addChild(this.projectsComponent);
        this.projectsComponent.load();
        this.projectsComponent.containerEl.hide();
        this.reviewComponent = new ReviewComponent(this.rootContainerEl, this.plugin.app, this.plugin, {
            onTaskSelected: (task) => {
                this.handleTaskSelection(task);
            },
            onTaskCompleted: (task) => {
                this.toggleTaskCompletion(task);
            },
            onTaskContextMenu: (event, task) => {
                this.handleTaskContextMenu(event, task);
            },
        });
        this.addChild(this.reviewComponent);
        this.reviewComponent.load();
        this.reviewComponent.containerEl.hide();
        this.calendarComponent = new CalendarComponent(this.plugin.app, this.plugin, this.rootContainerEl, this.tasks, // 使用预加载的任务数据
        {
            onTaskSelected: (task) => {
                this.handleTaskSelection(task);
            },
            onTaskCompleted: (task) => {
                this.toggleTaskCompletion(task);
            },
            onEventContextMenu: (ev, event) => {
                this.handleTaskContextMenu(ev, event);
            },
        });
        this.addChild(this.calendarComponent);
        this.calendarComponent.load();
        this.calendarComponent.containerEl.hide();
        // Initialize KanbanComponent
        this.kanbanComponent = new KanbanComponent(this.app, this.plugin, this.rootContainerEl, this.tasks, // 使用预加载的任务数据
        {
            onTaskStatusUpdate: this.handleKanbanTaskStatusUpdate.bind(this),
            onTaskSelected: this.handleTaskSelection.bind(this),
            onTaskCompleted: this.toggleTaskCompletion.bind(this),
            onTaskContextMenu: this.handleTaskContextMenu.bind(this),
        });
        this.addChild(this.kanbanComponent);
        this.kanbanComponent.containerEl.hide();
        this.ganttComponent = new GanttComponent(this.plugin, this.rootContainerEl, {
            onTaskSelected: this.handleTaskSelection.bind(this),
            onTaskCompleted: this.toggleTaskCompletion.bind(this),
            onTaskContextMenu: this.handleTaskContextMenu.bind(this),
        });
        this.addChild(this.ganttComponent);
        this.ganttComponent.containerEl.hide();
        this.habitsComponent = new HabitsComponent(this.plugin, this.rootContainerEl);
        this.addChild(this.habitsComponent);
        this.habitsComponent.containerEl.hide();
        this.detailsComponent = new TaskDetailsComponent(this.rootContainerEl, this.app, this.plugin);
        this.addChild(this.detailsComponent);
        this.detailsComponent.load();
        // 初始化统一的视图组件管理器
        this.viewComponentManager = new ViewComponentManager(this, this.app, this.plugin, this.rootContainerEl, {
            onTaskSelected: this.handleTaskSelection.bind(this),
            onTaskCompleted: this.toggleTaskCompletion.bind(this),
            onTaskContextMenu: this.handleTaskContextMenu.bind(this),
            onTaskStatusUpdate: this.handleKanbanTaskStatusUpdate.bind(this),
            onEventContextMenu: this.handleTaskContextMenu.bind(this),
        });
        this.addChild(this.viewComponentManager);
        this.setupComponentEvents();
    }
    // Removed createSidebarToggle
    createActionButtons() {
        this.detailsToggleBtn = this.addAction("panel-right-dashed", t("Details"), () => {
            this.toggleDetailsVisibility(!this.isDetailsVisible);
        });
        this.detailsToggleBtn.toggleClass("panel-toggle-btn", true);
        this.detailsToggleBtn.toggleClass("is-active", this.isDetailsVisible);
        // Keep quick capture button
        this.addAction("notebook-pen", t("Capture"), () => {
            const modal = new QuickCaptureModal(this.plugin.app, this.plugin, {}, true);
            modal.open();
        });
        this.addAction("filter", t("Filter"), (e) => {
            if (Platform.isDesktop) {
                const popover = new ViewTaskFilterPopover(this.plugin.app, this.leaf.id, this.plugin);
                // 设置关闭回调 - 现在主要用于处理取消操作
                popover.onClose = (filterState) => {
                    // 由于使用了实时事件监听，这里不需要再手动更新状态
                    // 可以用于处理特殊的关闭逻辑，如果需要的话
                };
                // 当打开时，设置初始过滤器状态
                this.app.workspace.onLayoutReady(() => {
                    setTimeout(() => {
                        if (this.liveFilterState &&
                            popover.taskFilterComponent) {
                            // 使用类型断言解决非空问题
                            const filterState = this
                                .liveFilterState;
                            popover.taskFilterComponent.loadFilterState(filterState);
                        }
                    }, 100);
                });
                popover.showAtPosition({ x: e.clientX, y: e.clientY });
            }
            else {
                const modal = new ViewTaskFilterModal(this.plugin.app, this.leaf.id, this.plugin);
                // 设置关闭回调 - 现在主要用于处理取消操作
                modal.filterCloseCallback = (filterState) => {
                    // 由于使用了实时事件监听，这里不需要再手动更新状态
                    // 可以用于处理特殊的关闭逻辑，如果需要的话
                };
                modal.open();
                // 设置初始过滤器状态
                if (this.liveFilterState && modal.taskFilterComponent) {
                    setTimeout(() => {
                        // 使用类型断言解决非空问题
                        const filterState = this
                            .liveFilterState;
                        modal.taskFilterComponent.loadFilterState(filterState);
                    }, 100);
                }
            }
        });
    }
    onPaneMenu(menu) {
        if (this.liveFilterState &&
            this.liveFilterState.filterGroups &&
            this.liveFilterState.filterGroups.length > 0) {
            menu.addItem((item) => {
                item.setTitle(t("Reset Filter"));
                item.setIcon("reset");
                item.onClick(() => {
                    this.resetCurrentFilter();
                });
            });
            menu.addSeparator();
        }
        // Keep settings item
        menu.addItem((item) => {
            item.setTitle(t("Settings"));
            item.setIcon("gear");
            item.onClick(() => {
                this.app.setting.open();
                this.app.setting.openTabById(this.plugin.manifest.id);
                this.plugin.settingTab.openTab("view-settings");
            });
        });
        // Add specific view actions if needed in the future
        return menu;
    }
    // Removed toggleSidebar
    toggleDetailsVisibility(visible) {
        this.isDetailsVisible = visible;
        this.rootContainerEl.toggleClass("details-visible", visible);
        this.rootContainerEl.toggleClass("details-hidden", !visible);
        this.detailsComponent.setVisible(visible);
        if (this.detailsToggleBtn) {
            this.detailsToggleBtn.toggleClass("is-active", visible);
            this.detailsToggleBtn.setAttribute("aria-label", visible ? t("Hide Details") : t("Show Details"));
        }
        if (!visible) {
            this.currentSelectedTaskId = null;
        }
    }
    setupComponentEvents() {
        // No sidebar event handlers
        this.detailsComponent.onTaskToggleComplete = (task) => this.toggleTaskCompletion(task);
        // Details component handlers
        this.detailsComponent.onTaskEdit = (task) => this.editTask(task);
        this.detailsComponent.onTaskUpdate = (originalTask, updatedTask) => __awaiter(this, void 0, void 0, function* () {
            yield this.updateTask(originalTask, updatedTask);
        });
        this.detailsComponent.toggleDetailsVisibility = (visible) => {
            this.toggleDetailsVisibility(visible);
        };
        // No sidebar component handlers needed
    }
    switchView(viewId, project, forceRefresh = false) {
        var _a, _b;
        this.currentViewId = viewId;
        this.currentProject = project;
        console.log("Switching view to:", viewId, "Project:", project);
        // Hide all components first
        this.contentComponent.containerEl.hide();
        this.forecastComponent.containerEl.hide();
        this.tagsComponent.containerEl.hide();
        this.projectsComponent.containerEl.hide();
        this.reviewComponent.containerEl.hide();
        // Hide any visible TwoColumnView components
        this.twoColumnViewComponents.forEach((component) => {
            component.containerEl.hide();
        });
        // Hide all special view components
        this.viewComponentManager.hideAllComponents();
        this.habitsComponent.containerEl.hide();
        this.calendarComponent.containerEl.hide();
        this.kanbanComponent.containerEl.hide();
        this.ganttComponent.containerEl.hide();
        let targetComponent = null;
        let modeForComponent = viewId;
        // Get view configuration to check for specific view types
        const viewConfig = getViewSettingOrDefault(this.plugin, viewId);
        // Handle TwoColumn views
        if (((_a = viewConfig.specificConfig) === null || _a === void 0 ? void 0 : _a.viewType) === "twocolumn") {
            // Get or create TwoColumnView component
            if (!this.twoColumnViewComponents.has(viewId)) {
                // Create a new TwoColumnView component
                const twoColumnConfig = viewConfig.specificConfig;
                const twoColumnComponent = new TaskPropertyTwoColumnView(this.rootContainerEl, this.app, this.plugin, twoColumnConfig, viewId);
                this.addChild(twoColumnComponent);
                // Set up event handlers
                twoColumnComponent.onTaskSelected = (task) => {
                    this.handleTaskSelection(task);
                };
                twoColumnComponent.onTaskCompleted = (task) => {
                    this.toggleTaskCompletion(task);
                };
                twoColumnComponent.onTaskContextMenu = (event, task) => {
                    this.handleTaskContextMenu(event, task);
                };
                // Store for later use
                this.twoColumnViewComponents.set(viewId, twoColumnComponent);
            }
            // Get the component to display
            targetComponent = this.twoColumnViewComponents.get(viewId);
        }
        else {
            // 检查特殊视图类型（基于 specificConfig 或原始 viewId）
            const specificViewType = (_b = viewConfig.specificConfig) === null || _b === void 0 ? void 0 : _b.viewType;
            // 检查是否为特殊视图，使用统一管理器处理
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
                        targetComponent = this.habitsComponent;
                        break;
                    case "tags":
                        targetComponent = this.tagsComponent;
                        break;
                    case "projects":
                        targetComponent = this.projectsComponent;
                        break;
                    case "review":
                        targetComponent = this.reviewComponent;
                        break;
                    case "inbox":
                    case "flagged":
                    default:
                        targetComponent = this.contentComponent;
                        modeForComponent = viewId;
                        break;
                }
            }
        }
        if (targetComponent) {
            console.log(`Activating component for view ${viewId}`, targetComponent.constructor.name);
            targetComponent.containerEl.show();
            if (typeof targetComponent.setTasks === "function") {
                // 使用高级过滤器状态，确保传递有效的过滤器
                const filterOptions = {};
                if (this.currentFilterState &&
                    this.currentFilterState.filterGroups &&
                    this.currentFilterState.filterGroups.length > 0) {
                    console.log("应用高级筛选器到视图:", viewId);
                    filterOptions.advancedFilter = this.currentFilterState;
                }
                let filteredTasks = filterTasks(this.tasks, viewId, this.plugin, filterOptions);
                // Filter out badge tasks for forecast view - they should only appear in event view
                if (viewId === "forecast") {
                    filteredTasks = filteredTasks.filter((task) => !task.badge);
                }
                targetComponent.setTasks(filteredTasks, this.tasks, forceRefresh);
            }
            // Handle updateTasks method for table view adapter
            if (typeof targetComponent.updateTasks === "function") {
                const filterOptions = {};
                if (this.currentFilterState &&
                    this.currentFilterState.filterGroups &&
                    this.currentFilterState.filterGroups.length > 0) {
                    console.log("应用高级筛选器到表格视图:", viewId);
                    filterOptions.advancedFilter = this.currentFilterState;
                }
                targetComponent.updateTasks(filterTasks(this.tasks, viewId, this.plugin, filterOptions));
            }
            if (typeof targetComponent.setViewMode === "function") {
                console.log(`Setting view mode for ${viewId} to ${modeForComponent} with project ${project}`);
                targetComponent.setViewMode(modeForComponent, project);
            }
            this.twoColumnViewComponents.forEach((component) => {
                if (component &&
                    typeof component.setTasks === "function" &&
                    component.getViewId() === viewId) {
                    const filterOptions = {};
                    if (this.currentFilterState &&
                        this.currentFilterState.filterGroups &&
                        this.currentFilterState.filterGroups.length > 0) {
                        filterOptions.advancedFilter = this.currentFilterState;
                    }
                    let filteredTasks = filterTasks(this.tasks, component.getViewId(), this.plugin, filterOptions);
                    // Filter out badge tasks for forecast view - they should only appear in event view
                    if (component.getViewId() === "forecast") {
                        filteredTasks = filteredTasks.filter((task) => !task.badge);
                    }
                    component.setTasks(filteredTasks);
                }
            });
            if (viewId === "review" &&
                typeof targetComponent.refreshReviewSettings === "function") {
                targetComponent.refreshReviewSettings();
            }
        }
        else {
            console.warn(`No target component found for viewId: ${viewId}`);
        }
        this.updateHeaderDisplay();
        this.handleTaskSelection(null);
    }
    /**
     * Get the currently active component based on currentViewId
     */
    getActiveComponent() {
        var _a, _b;
        if (!this.currentViewId)
            return null;
        // Check for special view types first
        const viewConfig = getViewSettingOrDefault(this.plugin, this.currentViewId);
        // Handle TwoColumn views
        if (((_a = viewConfig.specificConfig) === null || _a === void 0 ? void 0 : _a.viewType) === "twocolumn") {
            return this.twoColumnViewComponents.get(this.currentViewId);
        }
        // Check if it's a special view handled by viewComponentManager
        if (this.viewComponentManager.isSpecialView(this.currentViewId)) {
            // For special views, we can't easily get the component instance
            // Return null to skip the update
            return null;
        }
        // Handle forecast views
        const specificViewType = (_b = viewConfig.specificConfig) === null || _b === void 0 ? void 0 : _b.viewType;
        if (specificViewType === "forecast" ||
            this.currentViewId === "forecast") {
            return this.forecastComponent;
        }
        // Handle standard view types
        switch (this.currentViewId) {
            case "habit":
                return this.habitsComponent;
            case "tags":
                return this.tagsComponent;
            case "projects":
                return this.projectsComponent;
            case "review":
                return this.reviewComponent;
            case "inbox":
            case "flagged":
            default:
                return this.contentComponent;
        }
    }
    updateHeaderDisplay() {
        const config = getViewSettingOrDefault(this.plugin, this.currentViewId);
        // Use the actual currentViewId for the header
        this.leaf.setEphemeralState({ title: config.name, icon: config.icon });
    }
    handleTaskContextMenu(event, task) {
        const menu = new Menu();
        menu.addItem((item) => {
            item.setTitle(t("Complete"));
            item.setIcon("check-square");
            item.onClick(() => {
                this.toggleTaskCompletion(task);
            });
        })
            .addItem((item) => {
            item.setIcon("square-pen");
            item.setTitle(t("Switch status"));
            const submenu = item.setSubmenu();
            // Get unique statuses from taskStatusMarks
            const statusMarks = this.plugin.settings.taskStatusMarks;
            const uniqueStatuses = new Map();
            // Build a map of unique mark -> status name to avoid duplicates
            for (const status of Object.keys(statusMarks)) {
                const mark = statusMarks[status];
                // If this mark is not already in the map, add it
                // This ensures each mark appears only once in the menu
                if (!Array.from(uniqueStatuses.values()).includes(mark)) {
                    uniqueStatuses.set(status, mark);
                }
            }
            // Create menu items from unique statuses
            for (const [status, mark] of uniqueStatuses) {
                submenu.addItem((item) => {
                    item.titleEl.createEl("span", {
                        cls: "status-option-checkbox",
                    }, (el) => {
                        createTaskCheckbox(mark, task, el);
                    });
                    item.titleEl.createEl("span", {
                        cls: "status-option",
                        text: status,
                    });
                    item.onClick(() => {
                        console.log("status", status, mark);
                        if (!task.completed && mark.toLowerCase() === "x") {
                            task.metadata.completedDate = Date.now();
                        }
                        else {
                            task.metadata.completedDate = undefined;
                        }
                        this.updateTask(task, Object.assign(Object.assign({}, task), { status: mark, completed: mark.toLowerCase() === "x" ? true : false }));
                    });
                });
            }
        })
            .addSeparator()
            .addItem((item) => {
            item.setTitle(t("Edit"));
            item.setIcon("pencil");
            item.onClick(() => {
                this.handleTaskSelection(task); // Open details view for editing
            });
        })
            .addItem((item) => {
            item.setTitle(t("Edit in File"));
            item.setIcon("file-edit"); // Changed icon slightly
            item.onClick(() => {
                this.editTask(task);
            });
        });
        menu.showAtMouseEvent(event);
    }
    handleTaskSelection(task) {
        if (task) {
            const now = Date.now();
            const timeSinceLastToggle = now - this.lastToggleTimestamp;
            if (this.currentSelectedTaskId !== task.id) {
                this.currentSelectedTaskId = task.id;
                this.detailsComponent.showTaskDetails(task);
                if (!this.isDetailsVisible) {
                    this.toggleDetailsVisibility(true);
                }
                this.lastToggleTimestamp = now;
                return;
            }
            // Toggle details visibility on double-click/re-click
            if (timeSinceLastToggle > 150) {
                // Debounce slightly
                this.toggleDetailsVisibility(!this.isDetailsVisible);
                this.lastToggleTimestamp = now;
            }
        }
        else {
            // Deselecting task explicitly
            this.toggleDetailsVisibility(false);
            this.currentSelectedTaskId = null;
        }
    }
    loadTasks(forceSync = false, skipViewUpdate = false) {
        return __awaiter(this, void 0, void 0, function* () {
            // Only use dataflow - TaskManager is deprecated
            if (!this.plugin.dataflowOrchestrator) {
                console.warn("[TaskSpecificView] Dataflow orchestrator not available, waiting for initialization...");
                this.tasks = [];
            }
            else {
                try {
                    console.log("[TaskSpecificView] Loading tasks from dataflow orchestrator...");
                    const queryAPI = this.plugin.dataflowOrchestrator.getQueryAPI();
                    this.tasks = yield queryAPI.getAllTasks();
                    console.log(`[TaskSpecificView] Loaded ${this.tasks.length} tasks from dataflow`);
                }
                catch (error) {
                    console.error("[TaskSpecificView] Error loading tasks from dataflow:", error);
                    this.tasks = [];
                }
            }
            if (!skipViewUpdate) {
                // 直接切换到当前视图
                if (this.currentViewId) {
                    this.switchView(this.currentViewId, this.currentProject, true);
                }
                // 更新操作按钮
                this.updateActionButtons();
            }
        });
    }
    /**
     * Load tasks fast using cached data - for UI initialization
     */
    loadTasksFast(skipViewUpdate = false) {
        return __awaiter(this, void 0, void 0, function* () {
            // Only use dataflow
            if (!this.plugin.dataflowOrchestrator) {
                console.warn("[TaskSpecificView] Dataflow orchestrator not available for fast load");
                this.tasks = [];
            }
            else {
                try {
                    console.log("[TaskSpecificView] Loading tasks fast from dataflow orchestrator...");
                    const queryAPI = this.plugin.dataflowOrchestrator.getQueryAPI();
                    // For fast loading, use regular getAllTasks (it should be cached)
                    this.tasks = yield queryAPI.getAllTasks();
                    console.log(`[TaskSpecificView] Loaded ${this.tasks.length} tasks (fast from dataflow)`);
                }
                catch (error) {
                    console.error("[TaskSpecificView] Error loading tasks fast from dataflow:", error);
                    this.tasks = [];
                }
            }
            if (!skipViewUpdate) {
                // 直接切换到当前视图
                if (this.currentViewId) {
                    this.switchView(this.currentViewId, this.currentProject, true);
                }
                // 更新操作按钮
                this.updateActionButtons();
            }
        });
    }
    /**
     * Load tasks with sync in background - non-blocking
     */
    loadTasksWithSyncInBackground() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // Only use dataflow, ICS events are handled through dataflow architecture
            try {
                const queryAPI = (_a = this.plugin.dataflowOrchestrator) === null || _a === void 0 ? void 0 : _a.getQueryAPI();
                if (!queryAPI) {
                    console.warn("[TaskSpecificView] QueryAPI not available");
                    return;
                }
                const tasks = yield queryAPI.getAllTasks();
                if (tasks.length !== this.tasks.length || tasks.length === 0) {
                    this.tasks = tasks;
                    console.log(`TaskSpecificView updated with ${this.tasks.length} tasks (dataflow sync)`);
                    // Don't trigger view update here as it will be handled by events
                }
            }
            catch (error) {
                console.warn("Background task sync failed:", error);
            }
        });
    }
    // 添加应用当前过滤器状态的方法
    applyCurrentFilter() {
        console.log("应用 TaskSpecificView 当前过滤状态:", this.liveFilterState ? "有实时筛选器" : "无实时筛选器", this.currentFilterState ? "有过滤器" : "无过滤器");
        // 通过 loadTasks 重新加载任务
        this.loadTasks();
    }
    triggerViewUpdate() {
        return __awaiter(this, void 0, void 0, function* () {
            // 直接切换到当前视图以刷新任务
            if (this.currentViewId) {
                this.switchView(this.currentViewId, this.currentProject);
                // 更新操作按钮
                this.updateActionButtons();
            }
            else {
                console.warn("TaskSpecificView: Cannot trigger update, currentViewId is not set.");
            }
        });
    }
    updateActionButtons() {
        // 移除过滤器重置按钮（如果存在）
        const resetButton = this.leaf.view.containerEl.querySelector(".view-action.task-filter-reset");
        if (resetButton) {
            resetButton.remove();
        }
        // 只有在有实时高级筛选器时才添加重置按钮（不包括基础过滤器）
        if (this.liveFilterState &&
            this.liveFilterState.filterGroups &&
            this.liveFilterState.filterGroups.length > 0) {
            this.addAction("reset", t("Reset Filter"), () => {
                this.resetCurrentFilter();
            }).addClass("task-filter-reset");
        }
    }
    toggleTaskCompletion(task) {
        return __awaiter(this, void 0, void 0, function* () {
            const updatedTask = Object.assign(Object.assign({}, task), { completed: !task.completed });
            if (updatedTask.completed) {
                // 设置完成时间到任务元数据中
                if (updatedTask.metadata) {
                    updatedTask.metadata.completedDate = Date.now();
                }
                const completedMark = (this.plugin.settings.taskStatuses.completed || "x").split("|")[0];
                if (updatedTask.status !== completedMark) {
                    updatedTask.status = completedMark;
                }
            }
            else {
                // 清除完成时间
                if (updatedTask.metadata) {
                    updatedTask.metadata.completedDate = undefined;
                }
                const notStartedMark = this.plugin.settings.taskStatuses.notStarted || " ";
                if (updatedTask.status.toLowerCase() === "x") {
                    // Only revert if it was the completed mark
                    updatedTask.status = notStartedMark;
                }
            }
            // Always use WriteAPI
            if (!this.plugin.writeAPI) {
                console.error("WriteAPI not available");
                return;
            }
            const result = yield this.plugin.writeAPI.updateTask({
                taskId: updatedTask.id,
                updates: updatedTask,
            });
            if (!result.success) {
                throw new Error(result.error || "Failed to update task");
            }
            // Task cache listener will trigger loadTasks -> triggerViewUpdate
        });
    }
    /**
     * Extract only the fields that have changed between two tasks
     */
    extractChangedFields(originalTask, updatedTask) {
        var _a, _b;
        const changes = {};
        // Check top-level fields
        if (originalTask.content !== updatedTask.content) {
            changes.content = updatedTask.content;
        }
        if (originalTask.completed !== updatedTask.completed) {
            changes.completed = updatedTask.completed;
        }
        if (originalTask.status !== updatedTask.status) {
            changes.status = updatedTask.status;
        }
        // Check metadata fields
        const metadataChanges = {};
        let hasMetadataChanges = false;
        // Compare each metadata field
        const metadataFields = [
            "priority",
            "project",
            "tags",
            "context",
            "dueDate",
            "startDate",
            "scheduledDate",
            "completedDate",
            "recurrence",
        ];
        for (const field of metadataFields) {
            const originalValue = (_a = originalTask.metadata) === null || _a === void 0 ? void 0 : _a[field];
            const updatedValue = (_b = updatedTask.metadata) === null || _b === void 0 ? void 0 : _b[field];
            // Handle arrays specially (tags)
            if (field === "tags") {
                const origTags = originalValue || [];
                const updTags = updatedValue || [];
                if (origTags.length !== updTags.length ||
                    !origTags.every((t, i) => t === updTags[i])) {
                    metadataChanges.tags = updTags;
                    hasMetadataChanges = true;
                }
            }
            else if (originalValue !== updatedValue) {
                metadataChanges[field] = updatedValue;
                hasMetadataChanges = true;
            }
        }
        // Only include metadata if there are changes
        if (hasMetadataChanges) {
            changes.metadata = metadataChanges;
        }
        return changes;
    }
    handleTaskUpdate(originalTask, updatedTask) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.plugin.writeAPI) {
                console.error("WriteAPI not available");
                return;
            }
            console.log("handleTaskUpdate", originalTask.content, updatedTask.content, originalTask.id, updatedTask.id, updatedTask, originalTask);
            try {
                // Extract only the changed fields
                const updates = this.extractChangedFields(originalTask, updatedTask);
                // Always use WriteAPI with only the changed fields
                // Use originalTask.id to ensure we're updating the correct task
                const writeResult = yield this.plugin.writeAPI.updateTask({
                    taskId: originalTask.id,
                    updates: updates,
                });
                if (!writeResult.success) {
                    throw new Error(writeResult.error || "Failed to update task");
                }
                // Prefer the authoritative task returned by WriteAPI (includes updated originalMarkdown)
                if (writeResult.task) {
                    updatedTask = writeResult.task;
                }
                console.log(`Task ${updatedTask.id} updated successfully via handleTaskUpdate.`);
                // Update local task list immediately
                const index = this.tasks.findIndex((t) => t.id === originalTask.id);
                if (index !== -1) {
                    // Create a new array to ensure ContentComponent detects the change
                    this.tasks = [...this.tasks];
                    this.tasks[index] = updatedTask;
                }
                else {
                    console.warn("Updated task not found in local list, might reload.");
                }
                // Always refresh the view after a successful update
                // The update operation itself means editing is complete
                // Force refresh since we know the task has been updated
                this.switchView(this.currentViewId, this.currentProject, true);
                // Update details component if the updated task is currently selected
                if (this.currentSelectedTaskId === updatedTask.id) {
                    if (this.detailsComponent.isCurrentlyEditing()) {
                        // Update the current task reference without re-rendering UI
                        this.detailsComponent.currentTask = updatedTask;
                    }
                    else {
                        this.detailsComponent.showTaskDetails(updatedTask);
                    }
                }
            }
            catch (error) {
                console.error("Failed to update task:", error);
                // Re-throw the error so that the InlineEditor can handle it properly
                throw error;
            }
        });
    }
    updateTask(originalTask, updatedTask) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.plugin.writeAPI) {
                console.error("WriteAPI not available for updateTask");
                throw new Error("WriteAPI not available");
            }
            try {
                // Extract only the changed fields
                const updates = this.extractChangedFields(originalTask, updatedTask);
                // Always use WriteAPI with only the changed fields
                // Use originalTask.id to ensure we're updating the correct task
                const writeResult = yield this.plugin.writeAPI.updateTask({
                    taskId: originalTask.id,
                    updates: updates,
                });
                if (!writeResult.success) {
                    throw new Error(writeResult.error || "Failed to update task");
                }
                if (writeResult.task) {
                    updatedTask = writeResult.task;
                }
                console.log(`Task ${updatedTask.id} updated successfully.`);
                // 立即更新本地任务列表
                const index = this.tasks.findIndex((t) => t.id === originalTask.id);
                if (index !== -1) {
                    // Create a new array to ensure ContentComponent detects the change
                    this.tasks = [...this.tasks];
                    this.tasks[index] = updatedTask;
                }
                else {
                    console.warn("Updated task not found in local list, might reload.");
                }
                // Always refresh the view after a successful update
                // The update operation itself means editing is complete
                // Force refresh since we know the task has been updated
                this.switchView(this.currentViewId, this.currentProject, true);
                if (this.currentSelectedTaskId === updatedTask.id) {
                    if (this.detailsComponent.isCurrentlyEditing()) {
                        // Update the current task reference without re-rendering UI
                        this.detailsComponent.currentTask = updatedTask;
                    }
                    else {
                        this.detailsComponent.showTaskDetails(updatedTask);
                    }
                }
                return updatedTask;
            }
            catch (error) {
                console.error(`Failed to update task ${originalTask.id}:`, error);
                throw error;
            }
        });
    }
    editTask(task) {
        return __awaiter(this, void 0, void 0, function* () {
            const file = this.app.vault.getFileByPath(task.filePath);
            if (!file)
                return;
            // Prefer activating existing leaf if file is open
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
    onClose() {
        return __awaiter(this, void 0, void 0, function* () {
            // Cleanup TwoColumnView components
            this.twoColumnViewComponents.forEach((component) => {
                this.removeChild(component);
            });
            this.twoColumnViewComponents.clear();
            // Cleanup special view components
            // this.viewComponentManager.cleanup();
            this.unload(); // This callsremoveChild on all direct children automatically
            if (this.rootContainerEl) {
                this.rootContainerEl.empty();
                this.rootContainerEl.detach();
            }
            console.log("TaskSpecificView closed");
        });
    }
    onSettingsUpdate() {
        console.log("TaskSpecificView received settings update notification.");
        // No sidebar to update
        // Re-trigger view update to reflect potential setting changes (e.g., filters, status marks)
        this.triggerViewUpdate();
        this.updateHeaderDisplay(); // Update icon/title if changed
    }
    // 添加重置筛选器的方法
    resetCurrentFilter() {
        console.log("重置 TaskSpecificView 实时筛选器");
        this.liveFilterState = null;
        this.currentFilterState = null;
        this.app.saveLocalStorage(`task-genius-view-filter-${this.leaf.id}`, null);
        this.applyCurrentFilter();
        this.updateActionButtons();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGFza1NwZWNpZmljVmlldy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlRhc2tTcGVjaWZpY1ZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFDTixRQUFRLEVBS1Isb0JBQW9CLEVBRXBCLElBQUksRUFDSixLQUFLLEVBQ0wsUUFBUTtBQUNSLG9CQUFvQjtFQUNwQixNQUFNLFVBQVUsQ0FBQztBQUVsQixrQ0FBa0M7QUFDbEMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDN0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN6RSxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLGtCQUFrQixHQUNsQixNQUFNLHlDQUF5QyxDQUFDO0FBQ2pELE9BQU8sb0JBQW9CLENBQUM7QUFFNUIsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDakcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzFDLE9BQU8sRUFDTix1QkFBdUIsR0FJdkIsTUFBTSw2QkFBNkIsQ0FBQztBQUNyQyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDN0QsT0FBTyxFQUNOLGlCQUFpQixHQUVqQixNQUFNLGdDQUFnQyxDQUFDO0FBQ3hDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDbkUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDdEcsT0FBTyxFQUFFLG9C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Q0FBQyxDQUFDO1lBQzdCLENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssRUFBRSxDQUFDO1lBRXJDLGtDQUFrQztZQUNsQyx1Q0FBdUM7WUFFdkMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsNkRBQTZEO1lBQzVFLElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRTtnQkFDekIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDN0IsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQzthQUM5QjtZQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUN4QyxDQUFDO0tBQUE7SUFFRCxnQkFBZ0I7UUFDZixPQUFPLENBQUMsR0FBRyxDQUFDLHlEQUF5RCxDQUFDLENBQUM7UUFDdkUsdUJBQXVCO1FBQ3ZCLDRGQUE0RjtRQUM1RixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUN6QixJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLCtCQUErQjtJQUM1RCxDQUFDO0lBNERELGFBQWE7SUFDTixrQkFBa0I7UUFDeEIsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO1FBQzVCLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUM7UUFDL0IsSUFBSSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FDeEIsMkJBQTJCLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQ3pDLElBQUksQ0FDSixDQUFDO1FBQ0YsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFDMUIsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7SUFDNUIsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcclxuXHRJdGVtVmlldyxcclxuXHRXb3Jrc3BhY2VMZWFmLFxyXG5cdFRGaWxlLFxyXG5cdFBsdWdpbixcclxuXHRzZXRJY29uLFxyXG5cdEV4dHJhQnV0dG9uQ29tcG9uZW50LFxyXG5cdEJ1dHRvbkNvbXBvbmVudCxcclxuXHRNZW51LFxyXG5cdFNjb3BlLFxyXG5cdGRlYm91bmNlLFxyXG5cdC8vIEZyb250bWF0dGVyQ2FjaGUsXHJcbn0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiQC90eXBlcy90YXNrXCI7XHJcbi8vIFJlbW92ZWQgU2lkZWJhckNvbXBvbmVudCBpbXBvcnRcclxuaW1wb3J0IHsgQ29udGVudENvbXBvbmVudCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay92aWV3L2NvbnRlbnRcIjtcclxuaW1wb3J0IHsgRm9yZWNhc3RDb21wb25lbnQgfSBmcm9tIFwiQC9jb21wb25lbnRzL2ZlYXR1cmVzL3Rhc2svdmlldy9mb3JlY2FzdFwiO1xyXG5pbXBvcnQgeyBUYWdzQ29tcG9uZW50IH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy90YXNrL3ZpZXcvdGFnc1wiO1xyXG5pbXBvcnQgeyBQcm9qZWN0c0NvbXBvbmVudCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay92aWV3L3Byb2plY3RzXCI7XHJcbmltcG9ydCB7IFJldmlld0NvbXBvbmVudCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay92aWV3L3Jldmlld1wiO1xyXG5pbXBvcnQge1xyXG5cdFRhc2tEZXRhaWxzQ29tcG9uZW50LFxyXG5cdGNyZWF0ZVRhc2tDaGVja2JveCxcclxufSBmcm9tIFwiQC9jb21wb25lbnRzL2ZlYXR1cmVzL3Rhc2svdmlldy9kZXRhaWxzXCI7XHJcbmltcG9ydCBcIi4uL3N0eWxlcy92aWV3LmNzc1wiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCIuLi9pbmRleFwiO1xyXG5pbXBvcnQgeyBRdWlja0NhcHR1cmVNb2RhbCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvcXVpY2stY2FwdHVyZS9tb2RhbHMvUXVpY2tDYXB0dXJlTW9kYWxcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHtcclxuXHRnZXRWaWV3U2V0dGluZ09yRGVmYXVsdCxcclxuXHRWaWV3TW9kZSxcclxuXHRERUZBVUxUX1NFVFRJTkdTLFxyXG5cdFR3b0NvbHVtblNwZWNpZmljQ29uZmlnLFxyXG59IGZyb20gXCJAL2NvbW1vbi9zZXR0aW5nLWRlZmluaXRpb25cIjtcclxuaW1wb3J0IHsgZmlsdGVyVGFza3MgfSBmcm9tIFwiQC91dGlscy90YXNrL3Rhc2stZmlsdGVyLXV0aWxzXCI7XHJcbmltcG9ydCB7XHJcblx0Q2FsZW5kYXJDb21wb25lbnQsXHJcblx0Q2FsZW5kYXJFdmVudCxcclxufSBmcm9tIFwiQC9jb21wb25lbnRzL2ZlYXR1cmVzL2NhbGVuZGFyXCI7XHJcbmltcG9ydCB7IEthbmJhbkNvbXBvbmVudCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMva2FuYmFuL2thbmJhblwiO1xyXG5pbXBvcnQgeyBHYW50dENvbXBvbmVudCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvZ2FudHQvZ2FudHRcIjtcclxuaW1wb3J0IHsgVGFza1Byb3BlcnR5VHdvQ29sdW1uVmlldyB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay92aWV3L1Rhc2tQcm9wZXJ0eVR3b0NvbHVtblZpZXdcIjtcclxuaW1wb3J0IHsgVmlld0NvbXBvbmVudE1hbmFnZXIgfSBmcm9tIFwiQC9jb21wb25lbnRzL3VpXCI7XHJcbmltcG9ydCB7IEhhYml0IGFzIEhhYml0c0NvbXBvbmVudCB9IGZyb20gXCIuLi9jb21wb25lbnRzL2ZlYXR1cmVzL2hhYml0L2hhYml0XCI7XHJcbmltcG9ydCB7IFBsYXRmb3JtIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7XHJcblx0Vmlld1Rhc2tGaWx0ZXJQb3BvdmVyLFxyXG5cdFZpZXdUYXNrRmlsdGVyTW9kYWwsXHJcbn0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy90YXNrL2ZpbHRlclwiO1xyXG5pbXBvcnQge1xyXG5cdEZpbHRlcixcclxuXHRGaWx0ZXJHcm91cCxcclxuXHRSb290RmlsdGVyU3RhdGUsXHJcbn0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy90YXNrL2ZpbHRlci9WaWV3VGFza0ZpbHRlclwiO1xyXG5pbXBvcnQgeyBpc0RhdGFmbG93RW5hYmxlZCB9IGZyb20gXCJAL2RhdGFmbG93L2NyZWF0ZURhdGFmbG93XCI7XHJcbmltcG9ydCB7IEV2ZW50cywgb24gfSBmcm9tIFwiQC9kYXRhZmxvdy9ldmVudHMvRXZlbnRzXCI7XHJcblxyXG5leHBvcnQgY29uc3QgVEFTS19TUEVDSUZJQ19WSUVXX1RZUEUgPSBcInRhc2stZ2VuaXVzLXNwZWNpZmljLXZpZXdcIjtcclxuXHJcbmludGVyZmFjZSBUYXNrU3BlY2lmaWNWaWV3U3RhdGUge1xyXG5cdHZpZXdJZDogVmlld01vZGU7XHJcblx0cHJvamVjdD86IHN0cmluZyB8IG51bGw7XHJcblx0ZmlsdGVyU3RhdGU/OiBSb290RmlsdGVyU3RhdGUgfCBudWxsO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVGFza1NwZWNpZmljVmlldyBleHRlbmRzIEl0ZW1WaWV3IHtcclxuXHQvLyBNYWluIGNvbnRhaW5lciBlbGVtZW50c1xyXG5cdHByaXZhdGUgcm9vdENvbnRhaW5lckVsOiBIVE1MRWxlbWVudDtcclxuXHJcblx0Ly8gQ29tcG9uZW50IHJlZmVyZW5jZXMgKFNpZGViYXIgcmVtb3ZlZClcclxuXHRwcml2YXRlIGNvbnRlbnRDb21wb25lbnQ6IENvbnRlbnRDb21wb25lbnQ7XHJcblx0cHJpdmF0ZSBmb3JlY2FzdENvbXBvbmVudDogRm9yZWNhc3RDb21wb25lbnQ7XHJcblx0cHJpdmF0ZSB0YWdzQ29tcG9uZW50OiBUYWdzQ29tcG9uZW50O1xyXG5cdHByaXZhdGUgcHJvamVjdHNDb21wb25lbnQ6IFByb2plY3RzQ29tcG9uZW50O1xyXG5cdHByaXZhdGUgcmV2aWV3Q29tcG9uZW50OiBSZXZpZXdDb21wb25lbnQ7XHJcblx0cHJpdmF0ZSBkZXRhaWxzQ29tcG9uZW50OiBUYXNrRGV0YWlsc0NvbXBvbmVudDtcclxuXHRwcml2YXRlIGNhbGVuZGFyQ29tcG9uZW50OiBDYWxlbmRhckNvbXBvbmVudDtcclxuXHRwcml2YXRlIGthbmJhbkNvbXBvbmVudDogS2FuYmFuQ29tcG9uZW50O1xyXG5cdHByaXZhdGUgZ2FudHRDb21wb25lbnQ6IEdhbnR0Q29tcG9uZW50O1xyXG5cdHByaXZhdGUgaGFiaXRzQ29tcG9uZW50OiBIYWJpdHNDb21wb25lbnQ7XHJcblx0cHJpdmF0ZSB2aWV3Q29tcG9uZW50TWFuYWdlcjogVmlld0NvbXBvbmVudE1hbmFnZXI7IC8vIOaWsOWinu+8mue7n+S4gOeahOinhuWbvue7hOS7tueuoeeQhuWZqFxyXG5cdC8vIEN1c3RvbSB2aWV3IGNvbXBvbmVudHMgYnkgdmlldyBJRFxyXG5cdHByaXZhdGUgdHdvQ29sdW1uVmlld0NvbXBvbmVudHM6IE1hcDxzdHJpbmcsIFRhc2tQcm9wZXJ0eVR3b0NvbHVtblZpZXc+ID1cclxuXHRcdG5ldyBNYXAoKTtcclxuXHQvLyBVSSBzdGF0ZSBtYW5hZ2VtZW50IChTaWRlYmFyIHN0YXRlIHJlbW92ZWQpXHJcblx0cHJpdmF0ZSBpc0RldGFpbHNWaXNpYmxlOiBib29sZWFuID0gZmFsc2U7XHJcblx0cHJpdmF0ZSBkZXRhaWxzVG9nZ2xlQnRuOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIGN1cnJlbnRWaWV3SWQ6IFZpZXdNb2RlID0gXCJpbmJveFwiOyAvLyBEZWZhdWx0IG9yIGxvYWRlZCBmcm9tIHN0YXRlXHJcblx0cHJpdmF0ZSBjdXJyZW50UHJvamVjdD86IHN0cmluZyB8IG51bGw7XHJcblx0cHJpdmF0ZSBjdXJyZW50U2VsZWN0ZWRUYXNrSWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgY3VycmVudFNlbGVjdGVkVGFza0RPTTogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIGxhc3RUb2dnbGVUaW1lc3RhbXA6IG51bWJlciA9IDA7XHJcblxyXG5cdHByaXZhdGUgdGFiQWN0aW9uQnV0dG9uOiBIVE1MRWxlbWVudDtcclxuXHJcblx0cHJpdmF0ZSBjdXJyZW50RmlsdGVyU3RhdGU6IFJvb3RGaWx0ZXJTdGF0ZSB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgbGl2ZUZpbHRlclN0YXRlOiBSb290RmlsdGVyU3RhdGUgfCBudWxsID0gbnVsbDsgLy8g5paw5aKe77ya5LiT6Zeo6Lef6Liq5a6e5pe26L+H5ruk5Zmo54q25oCBXHJcblxyXG5cdC8vIERhdGEgbWFuYWdlbWVudFxyXG5cdHRhc2tzOiBUYXNrW10gPSBbXTtcclxuXHJcblx0Y29uc3RydWN0b3IobGVhZjogV29ya3NwYWNlTGVhZiwgcHJpdmF0ZSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbikge1xyXG5cdFx0c3VwZXIobGVhZik7XHJcblxyXG5cdFx0Ly8g5L2/55So6aKE5Yqg6L2955qE5Lu75Yqh6L+b6KGM5b+r6YCf5Yid5aeL5pi+56S6XHJcblx0XHR0aGlzLnRhc2tzID0gdGhpcy5wbHVnaW4ucHJlbG9hZGVkVGFza3MgfHwgW107XHJcblxyXG5cdFx0dGhpcy5zY29wZSA9IG5ldyBTY29wZSh0aGlzLmFwcC5zY29wZSk7XHJcblxyXG5cdFx0dGhpcy5zY29wZT8ucmVnaXN0ZXIobnVsbCwgXCJlc2NhcGVcIiwgKGUpID0+IHtcclxuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyBOZXcgU3RhdGUgTWFuYWdlbWVudCBNZXRob2RzXHJcblx0Z2V0U3RhdGUoKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4ge1xyXG5cdFx0Y29uc3Qgc3RhdGUgPSBzdXBlci5nZXRTdGF0ZSgpO1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0Li4uc3RhdGUsXHJcblx0XHRcdHZpZXdJZDogdGhpcy5jdXJyZW50Vmlld0lkLFxyXG5cdFx0XHRwcm9qZWN0OiB0aGlzLmN1cnJlbnRQcm9qZWN0LFxyXG5cdFx0XHRmaWx0ZXJTdGF0ZTogdGhpcy5saXZlRmlsdGVyU3RhdGUsIC8vIOS/neWtmOWunuaXtui/h+a7pOWZqOeKtuaAge+8jOiAjOS4jeaYr+WfuuehgOi/h+a7pOWZqFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdGFzeW5jIHNldFN0YXRlKHN0YXRlOiB1bmtub3duLCByZXN1bHQ6IGFueSkge1xyXG5cdFx0YXdhaXQgc3VwZXIuc2V0U3RhdGUoc3RhdGUsIHJlc3VsdCk7XHJcblxyXG5cdFx0aWYgKHN0YXRlICYmIHR5cGVvZiBzdGF0ZSA9PT0gXCJvYmplY3RcIikge1xyXG5cdFx0XHRjb25zdCBzcGVjaWZpY1N0YXRlID0gc3RhdGUgYXMgVGFza1NwZWNpZmljVmlld1N0YXRlO1xyXG5cclxuXHRcdFx0dGhpcy5jdXJyZW50Vmlld0lkID0gc3BlY2lmaWNTdGF0ZT8udmlld0lkIHx8IFwiaW5ib3hcIjtcclxuXHRcdFx0dGhpcy5jdXJyZW50UHJvamVjdCA9IHNwZWNpZmljU3RhdGU/LnByb2plY3Q7XHJcblx0XHRcdC8vIOS7jueKtuaAgeaBouWkjeeahOi/h+a7pOWZqOW6lOivpeiiq+inhuS4uuWunuaXtui/h+a7pOWZqFxyXG5cdFx0XHR0aGlzLmxpdmVGaWx0ZXJTdGF0ZSA9IHNwZWNpZmljU3RhdGU/LmZpbHRlclN0YXRlIHx8IG51bGw7XHJcblx0XHRcdHRoaXMuY3VycmVudEZpbHRlclN0YXRlID0gc3BlY2lmaWNTdGF0ZT8uZmlsdGVyU3RhdGUgfHwgbnVsbDtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJUYXNrU3BlY2lmaWNWaWV3IHNldFN0YXRlOlwiLCBzcGVjaWZpY1N0YXRlKTtcclxuXHJcblx0XHRcdGlmICghdGhpcy5yb290Q29udGFpbmVyRWwpIHtcclxuXHRcdFx0XHR0aGlzLmFwcC53b3Jrc3BhY2Uub25MYXlvdXRSZWFkeSgoKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAodGhpcy5jdXJyZW50Vmlld0lkKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMuc3dpdGNoVmlldyhcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmN1cnJlbnRWaWV3SWQsXHJcblx0XHRcdFx0XHRcdFx0dGhpcy5jdXJyZW50UHJvamVjdFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9IGVsc2UgaWYgKHRoaXMuY3VycmVudFZpZXdJZCkge1xyXG5cdFx0XHRcdHRoaXMuc3dpdGNoVmlldyh0aGlzLmN1cnJlbnRWaWV3SWQsIHRoaXMuY3VycmVudFByb2plY3QpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRnZXRWaWV3VHlwZSgpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIFRBU0tfU1BFQ0lGSUNfVklFV19UWVBFO1xyXG5cdH1cclxuXHJcblx0Z2V0RGlzcGxheVRleHQoKTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IGN1cnJlbnRWaWV3Q29uZmlnID0gZ2V0Vmlld1NldHRpbmdPckRlZmF1bHQoXHJcblx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHR0aGlzLmN1cnJlbnRWaWV3SWRcclxuXHRcdCk7XHJcblx0XHQvLyBQb3RlbnRpYWxseSBhZGQgcHJvamVjdCBuYW1lIGlmIHJlbGV2YW50IGZvciAncHJvamVjdHMnIHZpZXc/XHJcblx0XHRyZXR1cm4gY3VycmVudFZpZXdDb25maWcubmFtZTtcclxuXHR9XHJcblxyXG5cdGdldEljb24oKTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IGN1cnJlbnRWaWV3Q29uZmlnID0gZ2V0Vmlld1NldHRpbmdPckRlZmF1bHQoXHJcblx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHR0aGlzLmN1cnJlbnRWaWV3SWRcclxuXHRcdCk7XHJcblx0XHRyZXR1cm4gY3VycmVudFZpZXdDb25maWcuaWNvbjtcclxuXHR9XHJcblxyXG5cdGFzeW5jIG9uT3BlbigpIHtcclxuXHRcdHRoaXMuY29udGVudEVsLnRvZ2dsZUNsYXNzKFwidGFzay1nZW5pdXMtdmlld1wiLCB0cnVlKTtcclxuXHRcdHRoaXMuY29udGVudEVsLnRvZ2dsZUNsYXNzKFwidGFzay1nZW5pdXMtc3BlY2lmaWMtdmlld1wiLCB0cnVlKTtcclxuXHRcdHRoaXMucm9vdENvbnRhaW5lckVsID0gdGhpcy5jb250ZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInRhc2stZ2VuaXVzLWNvbnRhaW5lciBuby1zaWRlYmFyXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBBZGQgZGVib3VuY2VkIHZpZXcgdXBkYXRlIHRvIHByZXZlbnQgcmFwaWQgc3VjY2Vzc2l2ZSByZWZyZXNoZXNcclxuXHRcdGNvbnN0IGRlYm91bmNlZFZpZXdVcGRhdGUgPSBkZWJvdW5jZShhc3luYyAoKSA9PiB7XHJcblx0XHRcdC8vIERvbid0IHNraXAgdmlldyB1cGRhdGVzIC0gdGhlIGRldGFpbHNDb21wb25lbnQgd2lsbCBoYW5kbGUgZWRpdCBzdGF0ZSBwcm9wZXJseVxyXG5cdFx0XHRhd2FpdCB0aGlzLmxvYWRUYXNrcyhmYWxzZSwgZmFsc2UpO1xyXG5cdFx0fSwgMTUwKTsgLy8gMTUwbXMgZGVib3VuY2UgZGVsYXlcclxuXHJcblx0XHQvLyAxLiDpppblhYjms6jlhozkuovku7bnm5HlkKzlmajvvIznoa7kv53kuI3kvJrplJnov4fku7vkvZXmm7TmlrBcclxuXHRcdGlmIChcclxuXHRcdFx0aXNEYXRhZmxvd0VuYWJsZWQodGhpcy5wbHVnaW4pICYmXHJcblx0XHRcdHRoaXMucGx1Z2luLmRhdGFmbG93T3JjaGVzdHJhdG9yXHJcblx0XHQpIHtcclxuXHRcdFx0Ly8gRGF0YWZsb3c6IOiuoumYhee7n+S4gOS6i+S7tlxyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRXZlbnQoXHJcblx0XHRcdFx0b24odGhpcy5hcHAsIEV2ZW50cy5DQUNIRV9SRUFEWSwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRcdFx0Ly8g5Ya35ZCv5Yqo5bCx57uq77yM5LuO5b+r54Wn5Yqg6L2977yM5bm25Yi35paw6KeG5Zu+XHJcblx0XHRcdFx0XHRhd2FpdCB0aGlzLmxvYWRUYXNrc0Zhc3QoZmFsc2UpO1xyXG5cdFx0XHRcdH0pXHJcblx0XHRcdCk7XHJcblx0XHRcdHRoaXMucmVnaXN0ZXJFdmVudChcclxuXHRcdFx0XHRvbih0aGlzLmFwcCwgRXZlbnRzLlRBU0tfQ0FDSEVfVVBEQVRFRCwgZGVib3VuY2VkVmlld1VwZGF0ZSlcclxuXHRcdFx0KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIExlZ2FjeTog5YW85a655pen5LqL5Lu2XHJcblx0XHRcdHRoaXMucmVnaXN0ZXJFdmVudChcclxuXHRcdFx0XHR0aGlzLmFwcC53b3Jrc3BhY2Uub24oXHJcblx0XHRcdFx0XHRcInRhc2stZ2VuaXVzOnRhc2stY2FjaGUtdXBkYXRlZFwiLFxyXG5cdFx0XHRcdFx0ZGVib3VuY2VkVmlld1VwZGF0ZVxyXG5cdFx0XHRcdClcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnJlZ2lzdGVyRXZlbnQoXHJcblx0XHRcdHRoaXMuYXBwLndvcmtzcGFjZS5vbihcclxuXHRcdFx0XHRcInRhc2stZ2VuaXVzOmZpbHRlci1jaGFuZ2VkXCIsXHJcblx0XHRcdFx0KGZpbHRlclN0YXRlOiBSb290RmlsdGVyU3RhdGUsIGxlYWZJZD86IHN0cmluZykgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcdFwiVGFza1NwZWNpZmljVmlldyDov4fmu6Tlmajlrp7ml7blj5jmm7Q6XCIsXHJcblx0XHRcdFx0XHRcdGZpbHRlclN0YXRlLFxyXG5cdFx0XHRcdFx0XHRcImxlYWZJZDpcIixcclxuXHRcdFx0XHRcdFx0bGVhZklkXHJcblx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdC8vIOWPquWkhOeQhuadpeiHquW9k+WJjeinhuWbvueahOi/h+a7pOWZqOWPmOabtFxyXG5cdFx0XHRcdFx0aWYgKGxlYWZJZCA9PT0gdGhpcy5sZWFmLmlkKSB7XHJcblx0XHRcdFx0XHRcdC8vIOi/meaYr+adpeiHquW9k+WJjeinhuWbvueahOWunuaXtui/h+a7pOWZqOe7hOS7tueahOWPmOabtFxyXG5cdFx0XHRcdFx0XHR0aGlzLmxpdmVGaWx0ZXJTdGF0ZSA9IGZpbHRlclN0YXRlO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmN1cnJlbnRGaWx0ZXJTdGF0ZSA9IGZpbHRlclN0YXRlO1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIuabtOaWsCBUYXNrU3BlY2lmaWNWaWV3IOWunuaXtui/h+a7pOWZqOeKtuaAgVwiKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5kZWJvdW5jZWRBcHBseUZpbHRlcigpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0Ly8g5b+955Wl5p2l6Ieq5YW25LuWbGVhZklk55qE5Y+Y5pu077yM5YyF5ous5Z+656GA6L+H5ruk5Zmo77yIdmlldy1jb25maWct5byA5aS077yJXHJcblx0XHRcdFx0fVxyXG5cdFx0XHQpXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIDIuIOWIneWni+WMlue7hOS7tu+8iOS9huWFiOS4jeS8oOWFpeaVsOaNru+8iVxyXG5cdFx0dGhpcy5pbml0aWFsaXplQ29tcG9uZW50cygpO1xyXG5cclxuXHRcdC8vIDMuIOiOt+WPluWIneWni+inhuWbvueKtuaAgVxyXG5cdFx0Y29uc3Qgc3RhdGUgPSB0aGlzLmxlYWYuZ2V0Vmlld1N0YXRlKCkuc3RhdGUgYXMgYW55O1xyXG5cdFx0Y29uc3Qgc3BlY2lmaWNTdGF0ZSA9IHN0YXRlIGFzIHVua25vd24gYXMgVGFza1NwZWNpZmljVmlld1N0YXRlO1xyXG5cdFx0Y29uc29sZS5sb2coXCJUYXNrU3BlY2lmaWNWaWV3IGluaXRpYWwgc3RhdGU6XCIsIHNwZWNpZmljU3RhdGUpO1xyXG5cdFx0dGhpcy5jdXJyZW50Vmlld0lkID0gc3BlY2lmaWNTdGF0ZT8udmlld0lkIHx8IFwiaW5ib3hcIjsgLy8gRmFsbGJhY2sgaWYgc3RhdGUgaXMgbWlzc2luZ1xyXG5cdFx0dGhpcy5jdXJyZW50UHJvamVjdCA9IHNwZWNpZmljU3RhdGU/LnByb2plY3Q7XHJcblx0XHR0aGlzLmN1cnJlbnRGaWx0ZXJTdGF0ZSA9IHNwZWNpZmljU3RhdGU/LmZpbHRlclN0YXRlIHx8IG51bGw7XHJcblxyXG5cdFx0Ly8gNC4g5YWI5L2/55So6aKE5Yqg6L2955qE5pWw5o2u5b+r6YCf5pi+56S6XHJcblx0XHR0aGlzLnN3aXRjaFZpZXcodGhpcy5jdXJyZW50Vmlld0lkLCB0aGlzLmN1cnJlbnRQcm9qZWN0KTtcclxuXHJcblx0XHQvLyA1LiDlv6vpgJ/liqDovb3nvJPlrZjmlbDmja7ku6Xnq4vljbPmmL7npLogVUkg5bm25Yi35paw6KeG5Zu+XHJcblx0XHRhd2FpdCB0aGlzLmxvYWRUYXNrc0Zhc3QoZmFsc2UpO1xyXG5cclxuXHRcdC8vIDYuIOWQjuWPsOWQjOatpeacgOaWsOaVsOaNru+8iOmdnumYu+Whnu+8iVxyXG5cdFx0dGhpcy5sb2FkVGFza3NXaXRoU3luY0luQmFja2dyb3VuZCgpO1xyXG5cclxuXHRcdHRoaXMudG9nZ2xlRGV0YWlsc1Zpc2liaWxpdHkoZmFsc2UpO1xyXG5cclxuXHRcdHRoaXMuY3JlYXRlQWN0aW9uQnV0dG9ucygpOyAvLyBLZWVwIGRldGFpbHMgdG9nZ2xlIGFuZCBxdWljayBjYXB0dXJlXHJcblxyXG5cdFx0KHRoaXMubGVhZi50YWJIZWFkZXJTdGF0dXNDb250YWluZXJFbCBhcyBIVE1MRWxlbWVudCk/LmVtcHR5KCk7XHJcblx0XHQodGhpcy5sZWFmLnRhYkhlYWRlckVsIGFzIEhUTUxFbGVtZW50KT8udG9nZ2xlQ2xhc3MoXHJcblx0XHRcdFwidGFzay1nZW5pdXMtdGFiLWhlYWRlclwiLFxyXG5cdFx0XHR0cnVlXHJcblx0XHQpO1xyXG5cdFx0dGhpcy50YWJBY3Rpb25CdXR0b24gPSAoXHJcblx0XHRcdHRoaXMubGVhZi50YWJIZWFkZXJTdGF0dXNDb250YWluZXJFbCBhcyBIVE1MRWxlbWVudFxyXG5cdFx0KT8uY3JlYXRlRWwoXHJcblx0XHRcdFwic3BhblwiLFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0Y2xzOiBcInRhc2stZ2VuaXVzLWFjdGlvbi1idG5cIixcclxuXHRcdFx0fSxcclxuXHRcdFx0KGVsOiBIVE1MRWxlbWVudCkgPT4ge1xyXG5cdFx0XHRcdG5ldyBFeHRyYUJ1dHRvbkNvbXBvbmVudChlbClcclxuXHRcdFx0XHRcdC5zZXRJY29uKFwiY2hlY2stc3F1YXJlXCIpXHJcblx0XHRcdFx0XHQuc2V0VG9vbHRpcCh0KFwiQ2FwdHVyZVwiKSlcclxuXHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgbW9kYWwgPSBuZXcgUXVpY2tDYXB0dXJlTW9kYWwoXHJcblx0XHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uYXBwLFxyXG5cdFx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHRcdFx0XHRcdHt9LFxyXG5cdFx0XHRcdFx0XHRcdHRydWVcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0bW9kYWwub3BlbigpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblx0XHRpZiAodGhpcy50YWJBY3Rpb25CdXR0b24pIHtcclxuXHRcdFx0dGhpcy5yZWdpc3RlcigoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy50YWJBY3Rpb25CdXR0b24uZGV0YWNoKCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBkZWJvdW5jZWRBcHBseUZpbHRlciA9IGRlYm91bmNlKCgpID0+IHtcclxuXHRcdHRoaXMuYXBwbHlDdXJyZW50RmlsdGVyKCk7XHJcblx0fSwgMTAwKTtcclxuXHJcblx0Ly8gUmVtb3ZlZCBvblJlc2l6ZSBhbmQgY2hlY2tBbmRDb2xsYXBzZVNpZGViYXIgbWV0aG9kc1xyXG5cclxuXHRwcml2YXRlIGluaXRpYWxpemVDb21wb25lbnRzKCkge1xyXG5cdFx0Ly8gTm8gU2lkZWJhckNvbXBvbmVudCBpbml0aWFsaXphdGlvblxyXG5cdFx0Ly8gTm8gY3JlYXRlU2lkZWJhclRvZ2dsZSBjYWxsXHJcblxyXG5cdFx0dGhpcy5jb250ZW50Q29tcG9uZW50ID0gbmV3IENvbnRlbnRDb21wb25lbnQoXHJcblx0XHRcdHRoaXMucm9vdENvbnRhaW5lckVsLFxyXG5cdFx0XHR0aGlzLnBsdWdpbi5hcHAsXHJcblx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0b25UYXNrU2VsZWN0ZWQ6ICh0YXNrOiBUYXNrIHwgbnVsbCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5oYW5kbGVUYXNrU2VsZWN0aW9uKHRhc2spO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0b25UYXNrQ29tcGxldGVkOiAodGFzazogVGFzaykgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy50b2dnbGVUYXNrQ29tcGxldGlvbih0YXNrKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uVGFza0NvbnRleHRNZW51OiAoZXZlbnQ6IE1vdXNlRXZlbnQsIHRhc2s6IFRhc2spID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuaGFuZGxlVGFza0NvbnRleHRNZW51KGV2ZW50LCB0YXNrKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cdFx0dGhpcy5hZGRDaGlsZCh0aGlzLmNvbnRlbnRDb21wb25lbnQpO1xyXG5cdFx0dGhpcy5jb250ZW50Q29tcG9uZW50LmxvYWQoKTtcclxuXHJcblx0XHR0aGlzLmZvcmVjYXN0Q29tcG9uZW50ID0gbmV3IEZvcmVjYXN0Q29tcG9uZW50KFxyXG5cdFx0XHR0aGlzLnJvb3RDb250YWluZXJFbCxcclxuXHRcdFx0dGhpcy5wbHVnaW4uYXBwLFxyXG5cdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0e1xyXG5cdFx0XHRcdG9uVGFza1NlbGVjdGVkOiAodGFzazogVGFzayB8IG51bGwpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuaGFuZGxlVGFza1NlbGVjdGlvbih0YXNrKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uVGFza0NvbXBsZXRlZDogKHRhc2s6IFRhc2spID0+IHtcclxuXHRcdFx0XHRcdHRoaXMudG9nZ2xlVGFza0NvbXBsZXRpb24odGFzayk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvblRhc2tVcGRhdGU6IGFzeW5jIChvcmlnaW5hbFRhc2s6IFRhc2ssIHVwZGF0ZWRUYXNrOiBUYXNrKSA9PiB7XHJcblx0XHRcdFx0XHRhd2FpdCB0aGlzLmhhbmRsZVRhc2tVcGRhdGUob3JpZ2luYWxUYXNrLCB1cGRhdGVkVGFzayk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvblRhc2tDb250ZXh0TWVudTogKGV2ZW50OiBNb3VzZUV2ZW50LCB0YXNrOiBUYXNrKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLmhhbmRsZVRhc2tDb250ZXh0TWVudShldmVudCwgdGFzayk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fVxyXG5cdFx0KTtcclxuXHRcdHRoaXMuYWRkQ2hpbGQodGhpcy5mb3JlY2FzdENvbXBvbmVudCk7XHJcblx0XHR0aGlzLmZvcmVjYXN0Q29tcG9uZW50LmxvYWQoKTtcclxuXHRcdHRoaXMuZm9yZWNhc3RDb21wb25lbnQuY29udGFpbmVyRWwuaGlkZSgpO1xyXG5cclxuXHRcdHRoaXMudGFnc0NvbXBvbmVudCA9IG5ldyBUYWdzQ29tcG9uZW50KFxyXG5cdFx0XHR0aGlzLnJvb3RDb250YWluZXJFbCxcclxuXHRcdFx0dGhpcy5wbHVnaW4uYXBwLFxyXG5cdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0e1xyXG5cdFx0XHRcdG9uVGFza1NlbGVjdGVkOiAodGFzazogVGFzayB8IG51bGwpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuaGFuZGxlVGFza1NlbGVjdGlvbih0YXNrKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uVGFza0NvbXBsZXRlZDogKHRhc2s6IFRhc2spID0+IHtcclxuXHRcdFx0XHRcdHRoaXMudG9nZ2xlVGFza0NvbXBsZXRpb24odGFzayk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvblRhc2tDb250ZXh0TWVudTogKGV2ZW50OiBNb3VzZUV2ZW50LCB0YXNrOiBUYXNrKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLmhhbmRsZVRhc2tDb250ZXh0TWVudShldmVudCwgdGFzayk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fVxyXG5cdFx0KTtcclxuXHRcdHRoaXMuYWRkQ2hpbGQodGhpcy50YWdzQ29tcG9uZW50KTtcclxuXHRcdHRoaXMudGFnc0NvbXBvbmVudC5sb2FkKCk7XHJcblx0XHR0aGlzLnRhZ3NDb21wb25lbnQuY29udGFpbmVyRWwuaGlkZSgpO1xyXG5cclxuXHRcdHRoaXMucHJvamVjdHNDb21wb25lbnQgPSBuZXcgUHJvamVjdHNDb21wb25lbnQoXHJcblx0XHRcdHRoaXMucm9vdENvbnRhaW5lckVsLFxyXG5cdFx0XHR0aGlzLnBsdWdpbi5hcHAsXHJcblx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0b25UYXNrU2VsZWN0ZWQ6ICh0YXNrOiBUYXNrIHwgbnVsbCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5oYW5kbGVUYXNrU2VsZWN0aW9uKHRhc2spO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0b25UYXNrQ29tcGxldGVkOiAodGFzazogVGFzaykgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy50b2dnbGVUYXNrQ29tcGxldGlvbih0YXNrKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uVGFza0NvbnRleHRNZW51OiAoZXZlbnQ6IE1vdXNlRXZlbnQsIHRhc2s6IFRhc2spID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuaGFuZGxlVGFza0NvbnRleHRNZW51KGV2ZW50LCB0YXNrKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cdFx0dGhpcy5hZGRDaGlsZCh0aGlzLnByb2plY3RzQ29tcG9uZW50KTtcclxuXHRcdHRoaXMucHJvamVjdHNDb21wb25lbnQubG9hZCgpO1xyXG5cdFx0dGhpcy5wcm9qZWN0c0NvbXBvbmVudC5jb250YWluZXJFbC5oaWRlKCk7XHJcblxyXG5cdFx0dGhpcy5yZXZpZXdDb21wb25lbnQgPSBuZXcgUmV2aWV3Q29tcG9uZW50KFxyXG5cdFx0XHR0aGlzLnJvb3RDb250YWluZXJFbCxcclxuXHRcdFx0dGhpcy5wbHVnaW4uYXBwLFxyXG5cdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0e1xyXG5cdFx0XHRcdG9uVGFza1NlbGVjdGVkOiAodGFzazogVGFzayB8IG51bGwpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuaGFuZGxlVGFza1NlbGVjdGlvbih0YXNrKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uVGFza0NvbXBsZXRlZDogKHRhc2s6IFRhc2spID0+IHtcclxuXHRcdFx0XHRcdHRoaXMudG9nZ2xlVGFza0NvbXBsZXRpb24odGFzayk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvblRhc2tDb250ZXh0TWVudTogKGV2ZW50OiBNb3VzZUV2ZW50LCB0YXNrOiBUYXNrKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLmhhbmRsZVRhc2tDb250ZXh0TWVudShldmVudCwgdGFzayk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fVxyXG5cdFx0KTtcclxuXHRcdHRoaXMuYWRkQ2hpbGQodGhpcy5yZXZpZXdDb21wb25lbnQpO1xyXG5cdFx0dGhpcy5yZXZpZXdDb21wb25lbnQubG9hZCgpO1xyXG5cdFx0dGhpcy5yZXZpZXdDb21wb25lbnQuY29udGFpbmVyRWwuaGlkZSgpO1xyXG5cclxuXHRcdHRoaXMuY2FsZW5kYXJDb21wb25lbnQgPSBuZXcgQ2FsZW5kYXJDb21wb25lbnQoXHJcblx0XHRcdHRoaXMucGx1Z2luLmFwcCxcclxuXHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdHRoaXMucm9vdENvbnRhaW5lckVsLFxyXG5cdFx0XHR0aGlzLnRhc2tzLCAvLyDkvb/nlKjpooTliqDovb3nmoTku7vliqHmlbDmja5cclxuXHRcdFx0e1xyXG5cdFx0XHRcdG9uVGFza1NlbGVjdGVkOiAodGFzazogVGFzayB8IG51bGwpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuaGFuZGxlVGFza1NlbGVjdGlvbih0YXNrKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uVGFza0NvbXBsZXRlZDogKHRhc2s6IFRhc2spID0+IHtcclxuXHRcdFx0XHRcdHRoaXMudG9nZ2xlVGFza0NvbXBsZXRpb24odGFzayk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvbkV2ZW50Q29udGV4dE1lbnU6IChldjogTW91c2VFdmVudCwgZXZlbnQ6IENhbGVuZGFyRXZlbnQpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuaGFuZGxlVGFza0NvbnRleHRNZW51KGV2LCBldmVudCk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fVxyXG5cdFx0KTtcclxuXHRcdHRoaXMuYWRkQ2hpbGQodGhpcy5jYWxlbmRhckNvbXBvbmVudCk7XHJcblx0XHR0aGlzLmNhbGVuZGFyQ29tcG9uZW50LmxvYWQoKTtcclxuXHRcdHRoaXMuY2FsZW5kYXJDb21wb25lbnQuY29udGFpbmVyRWwuaGlkZSgpO1xyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgS2FuYmFuQ29tcG9uZW50XHJcblx0XHR0aGlzLmthbmJhbkNvbXBvbmVudCA9IG5ldyBLYW5iYW5Db21wb25lbnQoXHJcblx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0dGhpcy5yb290Q29udGFpbmVyRWwsXHJcblx0XHRcdHRoaXMudGFza3MsIC8vIOS9v+eUqOmihOWKoOi9veeahOS7u+WKoeaVsOaNrlxyXG5cdFx0XHR7XHJcblx0XHRcdFx0b25UYXNrU3RhdHVzVXBkYXRlOlxyXG5cdFx0XHRcdFx0dGhpcy5oYW5kbGVLYW5iYW5UYXNrU3RhdHVzVXBkYXRlLmJpbmQodGhpcyksXHJcblx0XHRcdFx0b25UYXNrU2VsZWN0ZWQ6IHRoaXMuaGFuZGxlVGFza1NlbGVjdGlvbi5iaW5kKHRoaXMpLFxyXG5cdFx0XHRcdG9uVGFza0NvbXBsZXRlZDogdGhpcy50b2dnbGVUYXNrQ29tcGxldGlvbi5iaW5kKHRoaXMpLFxyXG5cdFx0XHRcdG9uVGFza0NvbnRleHRNZW51OiB0aGlzLmhhbmRsZVRhc2tDb250ZXh0TWVudS5iaW5kKHRoaXMpLFxyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cdFx0dGhpcy5hZGRDaGlsZCh0aGlzLmthbmJhbkNvbXBvbmVudCk7XHJcblx0XHR0aGlzLmthbmJhbkNvbXBvbmVudC5jb250YWluZXJFbC5oaWRlKCk7XHJcblxyXG5cdFx0dGhpcy5nYW50dENvbXBvbmVudCA9IG5ldyBHYW50dENvbXBvbmVudChcclxuXHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdHRoaXMucm9vdENvbnRhaW5lckVsLFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0b25UYXNrU2VsZWN0ZWQ6IHRoaXMuaGFuZGxlVGFza1NlbGVjdGlvbi5iaW5kKHRoaXMpLFxyXG5cdFx0XHRcdG9uVGFza0NvbXBsZXRlZDogdGhpcy50b2dnbGVUYXNrQ29tcGxldGlvbi5iaW5kKHRoaXMpLFxyXG5cdFx0XHRcdG9uVGFza0NvbnRleHRNZW51OiB0aGlzLmhhbmRsZVRhc2tDb250ZXh0TWVudS5iaW5kKHRoaXMpLFxyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cdFx0dGhpcy5hZGRDaGlsZCh0aGlzLmdhbnR0Q29tcG9uZW50KTtcclxuXHRcdHRoaXMuZ2FudHRDb21wb25lbnQuY29udGFpbmVyRWwuaGlkZSgpO1xyXG5cclxuXHRcdHRoaXMuaGFiaXRzQ29tcG9uZW50ID0gbmV3IEhhYml0c0NvbXBvbmVudChcclxuXHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdHRoaXMucm9vdENvbnRhaW5lckVsXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5hZGRDaGlsZCh0aGlzLmhhYml0c0NvbXBvbmVudCk7XHJcblx0XHR0aGlzLmhhYml0c0NvbXBvbmVudC5jb250YWluZXJFbC5oaWRlKCk7XHJcblx0XHR0aGlzLmRldGFpbHNDb21wb25lbnQgPSBuZXcgVGFza0RldGFpbHNDb21wb25lbnQoXHJcblx0XHRcdHRoaXMucm9vdENvbnRhaW5lckVsLFxyXG5cdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0dGhpcy5wbHVnaW5cclxuXHRcdCk7XHJcblx0XHR0aGlzLmFkZENoaWxkKHRoaXMuZGV0YWlsc0NvbXBvbmVudCk7XHJcblx0XHR0aGlzLmRldGFpbHNDb21wb25lbnQubG9hZCgpO1xyXG5cclxuXHRcdC8vIOWIneWni+WMlue7n+S4gOeahOinhuWbvue7hOS7tueuoeeQhuWZqFxyXG5cdFx0dGhpcy52aWV3Q29tcG9uZW50TWFuYWdlciA9IG5ldyBWaWV3Q29tcG9uZW50TWFuYWdlcihcclxuXHRcdFx0dGhpcyxcclxuXHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHR0aGlzLnJvb3RDb250YWluZXJFbCxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdG9uVGFza1NlbGVjdGVkOiB0aGlzLmhhbmRsZVRhc2tTZWxlY3Rpb24uYmluZCh0aGlzKSxcclxuXHRcdFx0XHRvblRhc2tDb21wbGV0ZWQ6IHRoaXMudG9nZ2xlVGFza0NvbXBsZXRpb24uYmluZCh0aGlzKSxcclxuXHRcdFx0XHRvblRhc2tDb250ZXh0TWVudTogdGhpcy5oYW5kbGVUYXNrQ29udGV4dE1lbnUuYmluZCh0aGlzKSxcclxuXHRcdFx0XHRvblRhc2tTdGF0dXNVcGRhdGU6XHJcblx0XHRcdFx0XHR0aGlzLmhhbmRsZUthbmJhblRhc2tTdGF0dXNVcGRhdGUuYmluZCh0aGlzKSxcclxuXHRcdFx0XHRvbkV2ZW50Q29udGV4dE1lbnU6IHRoaXMuaGFuZGxlVGFza0NvbnRleHRNZW51LmJpbmQodGhpcyksXHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblxyXG5cdFx0dGhpcy5hZGRDaGlsZCh0aGlzLnZpZXdDb21wb25lbnRNYW5hZ2VyKTtcclxuXHJcblx0XHR0aGlzLnNldHVwQ29tcG9uZW50RXZlbnRzKCk7XHJcblx0fVxyXG5cclxuXHQvLyBSZW1vdmVkIGNyZWF0ZVNpZGViYXJUb2dnbGVcclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVBY3Rpb25CdXR0b25zKCkge1xyXG5cdFx0dGhpcy5kZXRhaWxzVG9nZ2xlQnRuID0gdGhpcy5hZGRBY3Rpb24oXHJcblx0XHRcdFwicGFuZWwtcmlnaHQtZGFzaGVkXCIsXHJcblx0XHRcdHQoXCJEZXRhaWxzXCIpLFxyXG5cdFx0XHQoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy50b2dnbGVEZXRhaWxzVmlzaWJpbGl0eSghdGhpcy5pc0RldGFpbHNWaXNpYmxlKTtcclxuXHRcdFx0fVxyXG5cdFx0KTtcclxuXHJcblx0XHR0aGlzLmRldGFpbHNUb2dnbGVCdG4udG9nZ2xlQ2xhc3MoXCJwYW5lbC10b2dnbGUtYnRuXCIsIHRydWUpO1xyXG5cdFx0dGhpcy5kZXRhaWxzVG9nZ2xlQnRuLnRvZ2dsZUNsYXNzKFwiaXMtYWN0aXZlXCIsIHRoaXMuaXNEZXRhaWxzVmlzaWJsZSk7XHJcblxyXG5cdFx0Ly8gS2VlcCBxdWljayBjYXB0dXJlIGJ1dHRvblxyXG5cdFx0dGhpcy5hZGRBY3Rpb24oXCJub3RlYm9vay1wZW5cIiwgdChcIkNhcHR1cmVcIiksICgpID0+IHtcclxuXHRcdFx0Y29uc3QgbW9kYWwgPSBuZXcgUXVpY2tDYXB0dXJlTW9kYWwoXHJcblx0XHRcdFx0dGhpcy5wbHVnaW4uYXBwLFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHRcdHt9LFxyXG5cdFx0XHRcdHRydWVcclxuXHRcdFx0KTtcclxuXHRcdFx0bW9kYWwub3BlbigpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5hZGRBY3Rpb24oXCJmaWx0ZXJcIiwgdChcIkZpbHRlclwiKSwgKGUpID0+IHtcclxuXHRcdFx0aWYgKFBsYXRmb3JtLmlzRGVza3RvcCkge1xyXG5cdFx0XHRcdGNvbnN0IHBvcG92ZXIgPSBuZXcgVmlld1Rhc2tGaWx0ZXJQb3BvdmVyKFxyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4uYXBwLFxyXG5cdFx0XHRcdFx0dGhpcy5sZWFmLmlkLFxyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW5cclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHQvLyDorr7nva7lhbPpl63lm57osIMgLSDnjrDlnKjkuLvopoHnlKjkuo7lpITnkIblj5bmtojmk43kvZxcclxuXHRcdFx0XHRwb3BvdmVyLm9uQ2xvc2UgPSAoZmlsdGVyU3RhdGUpID0+IHtcclxuXHRcdFx0XHRcdC8vIOeUseS6juS9v+eUqOS6huWunuaXtuS6i+S7tuebkeWQrO+8jOi/memHjOS4jemcgOimgeWGjeaJi+WKqOabtOaWsOeKtuaAgVxyXG5cdFx0XHRcdFx0Ly8g5Y+v5Lul55So5LqO5aSE55CG54m55q6K55qE5YWz6Zet6YC76L6R77yM5aaC5p6c6ZyA6KaB55qE6K+dXHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0Ly8g5b2T5omT5byA5pe277yM6K6+572u5Yid5aeL6L+H5ruk5Zmo54q25oCBXHJcblx0XHRcdFx0dGhpcy5hcHAud29ya3NwYWNlLm9uTGF5b3V0UmVhZHkoKCkgPT4ge1xyXG5cdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmxpdmVGaWx0ZXJTdGF0ZSAmJlxyXG5cdFx0XHRcdFx0XHRcdHBvcG92ZXIudGFza0ZpbHRlckNvbXBvbmVudFxyXG5cdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHQvLyDkvb/nlKjnsbvlnovmlq3oqIDop6PlhrPpnZ7nqbrpl67pophcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBmaWx0ZXJTdGF0ZSA9IHRoaXNcclxuXHRcdFx0XHRcdFx0XHRcdC5saXZlRmlsdGVyU3RhdGUgYXMgUm9vdEZpbHRlclN0YXRlO1xyXG5cdFx0XHRcdFx0XHRcdHBvcG92ZXIudGFza0ZpbHRlckNvbXBvbmVudC5sb2FkRmlsdGVyU3RhdGUoXHJcblx0XHRcdFx0XHRcdFx0XHRmaWx0ZXJTdGF0ZVxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0sIDEwMCk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdHBvcG92ZXIuc2hvd0F0UG9zaXRpb24oe3g6IGUuY2xpZW50WCwgeTogZS5jbGllbnRZfSk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Y29uc3QgbW9kYWwgPSBuZXcgVmlld1Rhc2tGaWx0ZXJNb2RhbChcclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luLmFwcCxcclxuXHRcdFx0XHRcdHRoaXMubGVhZi5pZCxcclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0Ly8g6K6+572u5YWz6Zet5Zue6LCDIC0g546w5Zyo5Li76KaB55So5LqO5aSE55CG5Y+W5raI5pON5L2cXHJcblx0XHRcdFx0bW9kYWwuZmlsdGVyQ2xvc2VDYWxsYmFjayA9IChmaWx0ZXJTdGF0ZSkgPT4ge1xyXG5cdFx0XHRcdFx0Ly8g55Sx5LqO5L2/55So5LqG5a6e5pe25LqL5Lu255uR5ZCs77yM6L+Z6YeM5LiN6ZyA6KaB5YaN5omL5Yqo5pu05paw54q25oCBXHJcblx0XHRcdFx0XHQvLyDlj6/ku6XnlKjkuo7lpITnkIbnibnmrornmoTlhbPpl63pgLvovpHvvIzlpoLmnpzpnIDopoHnmoTor51cclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRtb2RhbC5vcGVuKCk7XHJcblxyXG5cdFx0XHRcdC8vIOiuvue9ruWIneWni+i/h+a7pOWZqOeKtuaAgVxyXG5cdFx0XHRcdGlmICh0aGlzLmxpdmVGaWx0ZXJTdGF0ZSAmJiBtb2RhbC50YXNrRmlsdGVyQ29tcG9uZW50KSB7XHJcblx0XHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8g5L2/55So57G75Z6L5pat6KiA6Kej5Yaz6Z2e56m66Zeu6aKYXHJcblx0XHRcdFx0XHRcdGNvbnN0IGZpbHRlclN0YXRlID0gdGhpc1xyXG5cdFx0XHRcdFx0XHRcdC5saXZlRmlsdGVyU3RhdGUgYXMgUm9vdEZpbHRlclN0YXRlO1xyXG5cdFx0XHRcdFx0XHRtb2RhbC50YXNrRmlsdGVyQ29tcG9uZW50LmxvYWRGaWx0ZXJTdGF0ZShmaWx0ZXJTdGF0ZSk7XHJcblx0XHRcdFx0XHR9LCAxMDApO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRvblBhbmVNZW51KG1lbnU6IE1lbnUpIHtcclxuXHRcdGlmIChcclxuXHRcdFx0dGhpcy5saXZlRmlsdGVyU3RhdGUgJiZcclxuXHRcdFx0dGhpcy5saXZlRmlsdGVyU3RhdGUuZmlsdGVyR3JvdXBzICYmXHJcblx0XHRcdHRoaXMubGl2ZUZpbHRlclN0YXRlLmZpbHRlckdyb3Vwcy5sZW5ndGggPiAwXHJcblx0XHQpIHtcclxuXHRcdFx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdFx0aXRlbS5zZXRUaXRsZSh0KFwiUmVzZXQgRmlsdGVyXCIpKTtcclxuXHRcdFx0XHRpdGVtLnNldEljb24oXCJyZXNldFwiKTtcclxuXHRcdFx0XHRpdGVtLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5yZXNldEN1cnJlbnRGaWx0ZXIoKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdG1lbnUuYWRkU2VwYXJhdG9yKCk7XHJcblx0XHR9XHJcblx0XHQvLyBLZWVwIHNldHRpbmdzIGl0ZW1cclxuXHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJTZXR0aW5nc1wiKSk7XHJcblx0XHRcdGl0ZW0uc2V0SWNvbihcImdlYXJcIik7XHJcblx0XHRcdGl0ZW0ub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5hcHAuc2V0dGluZy5vcGVuKCk7XHJcblx0XHRcdFx0dGhpcy5hcHAuc2V0dGluZy5vcGVuVGFiQnlJZCh0aGlzLnBsdWdpbi5tYW5pZmVzdC5pZCk7XHJcblxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdUYWIub3BlblRhYihcInZpZXctc2V0dGluZ3NcIik7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0XHQvLyBBZGQgc3BlY2lmaWMgdmlldyBhY3Rpb25zIGlmIG5lZWRlZCBpbiB0aGUgZnV0dXJlXHJcblx0XHRyZXR1cm4gbWVudTtcclxuXHR9XHJcblxyXG5cdC8vIFJlbW92ZWQgdG9nZ2xlU2lkZWJhclxyXG5cclxuXHRwcml2YXRlIHRvZ2dsZURldGFpbHNWaXNpYmlsaXR5KHZpc2libGU6IGJvb2xlYW4pIHtcclxuXHRcdHRoaXMuaXNEZXRhaWxzVmlzaWJsZSA9IHZpc2libGU7XHJcblx0XHR0aGlzLnJvb3RDb250YWluZXJFbC50b2dnbGVDbGFzcyhcImRldGFpbHMtdmlzaWJsZVwiLCB2aXNpYmxlKTtcclxuXHRcdHRoaXMucm9vdENvbnRhaW5lckVsLnRvZ2dsZUNsYXNzKFwiZGV0YWlscy1oaWRkZW5cIiwgIXZpc2libGUpO1xyXG5cclxuXHRcdHRoaXMuZGV0YWlsc0NvbXBvbmVudC5zZXRWaXNpYmxlKHZpc2libGUpO1xyXG5cdFx0aWYgKHRoaXMuZGV0YWlsc1RvZ2dsZUJ0bikge1xyXG5cdFx0XHR0aGlzLmRldGFpbHNUb2dnbGVCdG4udG9nZ2xlQ2xhc3MoXCJpcy1hY3RpdmVcIiwgdmlzaWJsZSk7XHJcblx0XHRcdHRoaXMuZGV0YWlsc1RvZ2dsZUJ0bi5zZXRBdHRyaWJ1dGUoXHJcblx0XHRcdFx0XCJhcmlhLWxhYmVsXCIsXHJcblx0XHRcdFx0dmlzaWJsZSA/IHQoXCJIaWRlIERldGFpbHNcIikgOiB0KFwiU2hvdyBEZXRhaWxzXCIpXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKCF2aXNpYmxlKSB7XHJcblx0XHRcdHRoaXMuY3VycmVudFNlbGVjdGVkVGFza0lkID0gbnVsbDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc2V0dXBDb21wb25lbnRFdmVudHMoKSB7XHJcblx0XHQvLyBObyBzaWRlYmFyIGV2ZW50IGhhbmRsZXJzXHJcblx0XHR0aGlzLmRldGFpbHNDb21wb25lbnQub25UYXNrVG9nZ2xlQ29tcGxldGUgPSAodGFzazogVGFzaykgPT5cclxuXHRcdFx0dGhpcy50b2dnbGVUYXNrQ29tcGxldGlvbih0YXNrKTtcclxuXHJcblx0XHQvLyBEZXRhaWxzIGNvbXBvbmVudCBoYW5kbGVyc1xyXG5cdFx0dGhpcy5kZXRhaWxzQ29tcG9uZW50Lm9uVGFza0VkaXQgPSAodGFzazogVGFzaykgPT4gdGhpcy5lZGl0VGFzayh0YXNrKTtcclxuXHRcdHRoaXMuZGV0YWlsc0NvbXBvbmVudC5vblRhc2tVcGRhdGUgPSBhc3luYyAoXHJcblx0XHRcdG9yaWdpbmFsVGFzazogVGFzayxcclxuXHRcdFx0dXBkYXRlZFRhc2s6IFRhc2tcclxuXHRcdCkgPT4ge1xyXG5cdFx0XHRhd2FpdCB0aGlzLnVwZGF0ZVRhc2sob3JpZ2luYWxUYXNrLCB1cGRhdGVkVGFzayk7XHJcblx0XHR9O1xyXG5cdFx0dGhpcy5kZXRhaWxzQ29tcG9uZW50LnRvZ2dsZURldGFpbHNWaXNpYmlsaXR5ID0gKHZpc2libGU6IGJvb2xlYW4pID0+IHtcclxuXHRcdFx0dGhpcy50b2dnbGVEZXRhaWxzVmlzaWJpbGl0eSh2aXNpYmxlKTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gTm8gc2lkZWJhciBjb21wb25lbnQgaGFuZGxlcnMgbmVlZGVkXHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHN3aXRjaFZpZXcoXHJcblx0XHR2aWV3SWQ6IFZpZXdNb2RlLFxyXG5cdFx0cHJvamVjdD86IHN0cmluZyB8IG51bGwsXHJcblx0XHRmb3JjZVJlZnJlc2g6IGJvb2xlYW4gPSBmYWxzZVxyXG5cdCkge1xyXG5cdFx0dGhpcy5jdXJyZW50Vmlld0lkID0gdmlld0lkO1xyXG5cdFx0dGhpcy5jdXJyZW50UHJvamVjdCA9IHByb2plY3Q7XHJcblx0XHRjb25zb2xlLmxvZyhcIlN3aXRjaGluZyB2aWV3IHRvOlwiLCB2aWV3SWQsIFwiUHJvamVjdDpcIiwgcHJvamVjdCk7XHJcblxyXG5cdFx0Ly8gSGlkZSBhbGwgY29tcG9uZW50cyBmaXJzdFxyXG5cdFx0dGhpcy5jb250ZW50Q29tcG9uZW50LmNvbnRhaW5lckVsLmhpZGUoKTtcclxuXHRcdHRoaXMuZm9yZWNhc3RDb21wb25lbnQuY29udGFpbmVyRWwuaGlkZSgpO1xyXG5cdFx0dGhpcy50YWdzQ29tcG9uZW50LmNvbnRhaW5lckVsLmhpZGUoKTtcclxuXHRcdHRoaXMucHJvamVjdHNDb21wb25lbnQuY29udGFpbmVyRWwuaGlkZSgpO1xyXG5cdFx0dGhpcy5yZXZpZXdDb21wb25lbnQuY29udGFpbmVyRWwuaGlkZSgpO1xyXG5cdFx0Ly8gSGlkZSBhbnkgdmlzaWJsZSBUd29Db2x1bW5WaWV3IGNvbXBvbmVudHNcclxuXHRcdHRoaXMudHdvQ29sdW1uVmlld0NvbXBvbmVudHMuZm9yRWFjaCgoY29tcG9uZW50KSA9PiB7XHJcblx0XHRcdGNvbXBvbmVudC5jb250YWluZXJFbC5oaWRlKCk7XHJcblx0XHR9KTtcclxuXHRcdC8vIEhpZGUgYWxsIHNwZWNpYWwgdmlldyBjb21wb25lbnRzXHJcblx0XHR0aGlzLnZpZXdDb21wb25lbnRNYW5hZ2VyLmhpZGVBbGxDb21wb25lbnRzKCk7XHJcblx0XHR0aGlzLmhhYml0c0NvbXBvbmVudC5jb250YWluZXJFbC5oaWRlKCk7XHJcblx0XHR0aGlzLmNhbGVuZGFyQ29tcG9uZW50LmNvbnRhaW5lckVsLmhpZGUoKTtcclxuXHRcdHRoaXMua2FuYmFuQ29tcG9uZW50LmNvbnRhaW5lckVsLmhpZGUoKTtcclxuXHRcdHRoaXMuZ2FudHRDb21wb25lbnQuY29udGFpbmVyRWwuaGlkZSgpO1xyXG5cclxuXHRcdGxldCB0YXJnZXRDb21wb25lbnQ6IGFueSA9IG51bGw7XHJcblx0XHRsZXQgbW9kZUZvckNvbXBvbmVudDogVmlld01vZGUgPSB2aWV3SWQ7XHJcblxyXG5cdFx0Ly8gR2V0IHZpZXcgY29uZmlndXJhdGlvbiB0byBjaGVjayBmb3Igc3BlY2lmaWMgdmlldyB0eXBlc1xyXG5cdFx0Y29uc3Qgdmlld0NvbmZpZyA9IGdldFZpZXdTZXR0aW5nT3JEZWZhdWx0KHRoaXMucGx1Z2luLCB2aWV3SWQpO1xyXG5cclxuXHRcdC8vIEhhbmRsZSBUd29Db2x1bW4gdmlld3NcclxuXHRcdGlmICh2aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnPy52aWV3VHlwZSA9PT0gXCJ0d29jb2x1bW5cIikge1xyXG5cdFx0XHQvLyBHZXQgb3IgY3JlYXRlIFR3b0NvbHVtblZpZXcgY29tcG9uZW50XHJcblx0XHRcdGlmICghdGhpcy50d29Db2x1bW5WaWV3Q29tcG9uZW50cy5oYXModmlld0lkKSkge1xyXG5cdFx0XHRcdC8vIENyZWF0ZSBhIG5ldyBUd29Db2x1bW5WaWV3IGNvbXBvbmVudFxyXG5cdFx0XHRcdGNvbnN0IHR3b0NvbHVtbkNvbmZpZyA9XHJcblx0XHRcdFx0XHR2aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnIGFzIFR3b0NvbHVtblNwZWNpZmljQ29uZmlnO1xyXG5cdFx0XHRcdGNvbnN0IHR3b0NvbHVtbkNvbXBvbmVudCA9IG5ldyBUYXNrUHJvcGVydHlUd29Db2x1bW5WaWV3KFxyXG5cdFx0XHRcdFx0dGhpcy5yb290Q29udGFpbmVyRWwsXHJcblx0XHRcdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHRcdFx0dHdvQ29sdW1uQ29uZmlnLFxyXG5cdFx0XHRcdFx0dmlld0lkXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHR0aGlzLmFkZENoaWxkKHR3b0NvbHVtbkNvbXBvbmVudCk7XHJcblxyXG5cdFx0XHRcdC8vIFNldCB1cCBldmVudCBoYW5kbGVyc1xyXG5cdFx0XHRcdHR3b0NvbHVtbkNvbXBvbmVudC5vblRhc2tTZWxlY3RlZCA9ICh0YXNrKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLmhhbmRsZVRhc2tTZWxlY3Rpb24odGFzayk7XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHR0d29Db2x1bW5Db21wb25lbnQub25UYXNrQ29tcGxldGVkID0gKHRhc2spID0+IHtcclxuXHRcdFx0XHRcdHRoaXMudG9nZ2xlVGFza0NvbXBsZXRpb24odGFzayk7XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHR0d29Db2x1bW5Db21wb25lbnQub25UYXNrQ29udGV4dE1lbnUgPSAoZXZlbnQsIHRhc2spID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuaGFuZGxlVGFza0NvbnRleHRNZW51KGV2ZW50LCB0YXNrKTtcclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHQvLyBTdG9yZSBmb3IgbGF0ZXIgdXNlXHJcblx0XHRcdFx0dGhpcy50d29Db2x1bW5WaWV3Q29tcG9uZW50cy5zZXQodmlld0lkLCB0d29Db2x1bW5Db21wb25lbnQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBHZXQgdGhlIGNvbXBvbmVudCB0byBkaXNwbGF5XHJcblx0XHRcdHRhcmdldENvbXBvbmVudCA9IHRoaXMudHdvQ29sdW1uVmlld0NvbXBvbmVudHMuZ2V0KHZpZXdJZCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyDmo4Dmn6Xnibnmrorop4blm77nsbvlnovvvIjln7rkuo4gc3BlY2lmaWNDb25maWcg5oiW5Y6f5aeLIHZpZXdJZO+8iVxyXG5cdFx0XHRjb25zdCBzcGVjaWZpY1ZpZXdUeXBlID0gdmlld0NvbmZpZy5zcGVjaWZpY0NvbmZpZz8udmlld1R5cGU7XHJcblxyXG5cdFx0XHQvLyDmo4Dmn6XmmK/lkKbkuLrnibnmrorop4blm77vvIzkvb/nlKjnu5/kuIDnrqHnkIblmajlpITnkIZcclxuXHRcdFx0aWYgKHRoaXMudmlld0NvbXBvbmVudE1hbmFnZXIuaXNTcGVjaWFsVmlldyh2aWV3SWQpKSB7XHJcblx0XHRcdFx0dGFyZ2V0Q29tcG9uZW50ID1cclxuXHRcdFx0XHRcdHRoaXMudmlld0NvbXBvbmVudE1hbmFnZXIuc2hvd0NvbXBvbmVudCh2aWV3SWQpO1xyXG5cdFx0XHR9IGVsc2UgaWYgKFxyXG5cdFx0XHRcdHNwZWNpZmljVmlld1R5cGUgPT09IFwiZm9yZWNhc3RcIiB8fFxyXG5cdFx0XHRcdHZpZXdJZCA9PT0gXCJmb3JlY2FzdFwiXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHRhcmdldENvbXBvbmVudCA9IHRoaXMuZm9yZWNhc3RDb21wb25lbnQ7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gU3RhbmRhcmQgdmlldyB0eXBlc1xyXG5cdFx0XHRcdHN3aXRjaCAodmlld0lkKSB7XHJcblx0XHRcdFx0XHRjYXNlIFwiaGFiaXRcIjpcclxuXHRcdFx0XHRcdFx0dGFyZ2V0Q29tcG9uZW50ID0gdGhpcy5oYWJpdHNDb21wb25lbnQ7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcInRhZ3NcIjpcclxuXHRcdFx0XHRcdFx0dGFyZ2V0Q29tcG9uZW50ID0gdGhpcy50YWdzQ29tcG9uZW50O1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgXCJwcm9qZWN0c1wiOlxyXG5cdFx0XHRcdFx0XHR0YXJnZXRDb21wb25lbnQgPSB0aGlzLnByb2plY3RzQ29tcG9uZW50O1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgXCJyZXZpZXdcIjpcclxuXHRcdFx0XHRcdFx0dGFyZ2V0Q29tcG9uZW50ID0gdGhpcy5yZXZpZXdDb21wb25lbnQ7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcImluYm94XCI6XHJcblx0XHRcdFx0XHRjYXNlIFwiZmxhZ2dlZFwiOlxyXG5cdFx0XHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRcdFx0dGFyZ2V0Q29tcG9uZW50ID0gdGhpcy5jb250ZW50Q29tcG9uZW50O1xyXG5cdFx0XHRcdFx0XHRtb2RlRm9yQ29tcG9uZW50ID0gdmlld0lkO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRpZiAodGFyZ2V0Q29tcG9uZW50KSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdGBBY3RpdmF0aW5nIGNvbXBvbmVudCBmb3IgdmlldyAke3ZpZXdJZH1gLFxyXG5cdFx0XHRcdHRhcmdldENvbXBvbmVudC5jb25zdHJ1Y3Rvci5uYW1lXHJcblx0XHRcdCk7XHJcblx0XHRcdHRhcmdldENvbXBvbmVudC5jb250YWluZXJFbC5zaG93KCk7XHJcblx0XHRcdGlmICh0eXBlb2YgdGFyZ2V0Q29tcG9uZW50LnNldFRhc2tzID09PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0XHQvLyDkvb/nlKjpq5jnuqfov4fmu6TlmajnirbmgIHvvIznoa7kv53kvKDpgJLmnInmlYjnmoTov4fmu6TlmahcclxuXHRcdFx0XHRjb25zdCBmaWx0ZXJPcHRpb25zOiB7XHJcblx0XHRcdFx0XHRhZHZhbmNlZEZpbHRlcj86IFJvb3RGaWx0ZXJTdGF0ZTtcclxuXHRcdFx0XHRcdHRleHRRdWVyeT86IHN0cmluZztcclxuXHRcdFx0XHR9ID0ge307XHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0dGhpcy5jdXJyZW50RmlsdGVyU3RhdGUgJiZcclxuXHRcdFx0XHRcdHRoaXMuY3VycmVudEZpbHRlclN0YXRlLmZpbHRlckdyb3VwcyAmJlxyXG5cdFx0XHRcdFx0dGhpcy5jdXJyZW50RmlsdGVyU3RhdGUuZmlsdGVyR3JvdXBzLmxlbmd0aCA+IDBcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwi5bqU55So6auY57qn562b6YCJ5Zmo5Yiw6KeG5Zu+OlwiLCB2aWV3SWQpO1xyXG5cdFx0XHRcdFx0ZmlsdGVyT3B0aW9ucy5hZHZhbmNlZEZpbHRlciA9IHRoaXMuY3VycmVudEZpbHRlclN0YXRlO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0bGV0IGZpbHRlcmVkVGFza3MgPSBmaWx0ZXJUYXNrcyhcclxuXHRcdFx0XHRcdHRoaXMudGFza3MsXHJcblx0XHRcdFx0XHR2aWV3SWQsXHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0XHRcdGZpbHRlck9wdGlvbnNcclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHQvLyBGaWx0ZXIgb3V0IGJhZGdlIHRhc2tzIGZvciBmb3JlY2FzdCB2aWV3IC0gdGhleSBzaG91bGQgb25seSBhcHBlYXIgaW4gZXZlbnQgdmlld1xyXG5cdFx0XHRcdGlmICh2aWV3SWQgPT09IFwiZm9yZWNhc3RcIikge1xyXG5cdFx0XHRcdFx0ZmlsdGVyZWRUYXNrcyA9IGZpbHRlcmVkVGFza3MuZmlsdGVyKFxyXG5cdFx0XHRcdFx0XHQodGFzaykgPT4gISh0YXNrIGFzIGFueSkuYmFkZ2VcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHR0YXJnZXRDb21wb25lbnQuc2V0VGFza3MoXHJcblx0XHRcdFx0XHRmaWx0ZXJlZFRhc2tzLFxyXG5cdFx0XHRcdFx0dGhpcy50YXNrcyxcclxuXHRcdFx0XHRcdGZvcmNlUmVmcmVzaFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEhhbmRsZSB1cGRhdGVUYXNrcyBtZXRob2QgZm9yIHRhYmxlIHZpZXcgYWRhcHRlclxyXG5cdFx0XHRpZiAodHlwZW9mIHRhcmdldENvbXBvbmVudC51cGRhdGVUYXNrcyA9PT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdFx0Y29uc3QgZmlsdGVyT3B0aW9uczoge1xyXG5cdFx0XHRcdFx0YWR2YW5jZWRGaWx0ZXI/OiBSb290RmlsdGVyU3RhdGU7XHJcblx0XHRcdFx0XHR0ZXh0UXVlcnk/OiBzdHJpbmc7XHJcblx0XHRcdFx0fSA9IHt9O1xyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdHRoaXMuY3VycmVudEZpbHRlclN0YXRlICYmXHJcblx0XHRcdFx0XHR0aGlzLmN1cnJlbnRGaWx0ZXJTdGF0ZS5maWx0ZXJHcm91cHMgJiZcclxuXHRcdFx0XHRcdHRoaXMuY3VycmVudEZpbHRlclN0YXRlLmZpbHRlckdyb3Vwcy5sZW5ndGggPiAwXHJcblx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIuW6lOeUqOmrmOe6p+etm+mAieWZqOWIsOihqOagvOinhuWbvjpcIiwgdmlld0lkKTtcclxuXHRcdFx0XHRcdGZpbHRlck9wdGlvbnMuYWR2YW5jZWRGaWx0ZXIgPSB0aGlzLmN1cnJlbnRGaWx0ZXJTdGF0ZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHRhcmdldENvbXBvbmVudC51cGRhdGVUYXNrcyhcclxuXHRcdFx0XHRcdGZpbHRlclRhc2tzKHRoaXMudGFza3MsIHZpZXdJZCwgdGhpcy5wbHVnaW4sIGZpbHRlck9wdGlvbnMpXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKHR5cGVvZiB0YXJnZXRDb21wb25lbnQuc2V0Vmlld01vZGUgPT09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0YFNldHRpbmcgdmlldyBtb2RlIGZvciAke3ZpZXdJZH0gdG8gJHttb2RlRm9yQ29tcG9uZW50fSB3aXRoIHByb2plY3QgJHtwcm9qZWN0fWBcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHRhcmdldENvbXBvbmVudC5zZXRWaWV3TW9kZShtb2RlRm9yQ29tcG9uZW50LCBwcm9qZWN0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dGhpcy50d29Db2x1bW5WaWV3Q29tcG9uZW50cy5mb3JFYWNoKChjb21wb25lbnQpID0+IHtcclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRjb21wb25lbnQgJiZcclxuXHRcdFx0XHRcdHR5cGVvZiBjb21wb25lbnQuc2V0VGFza3MgPT09IFwiZnVuY3Rpb25cIiAmJlxyXG5cdFx0XHRcdFx0Y29tcG9uZW50LmdldFZpZXdJZCgpID09PSB2aWV3SWRcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdGNvbnN0IGZpbHRlck9wdGlvbnM6IHtcclxuXHRcdFx0XHRcdFx0YWR2YW5jZWRGaWx0ZXI/OiBSb290RmlsdGVyU3RhdGU7XHJcblx0XHRcdFx0XHRcdHRleHRRdWVyeT86IHN0cmluZztcclxuXHRcdFx0XHRcdH0gPSB7fTtcclxuXHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0dGhpcy5jdXJyZW50RmlsdGVyU3RhdGUgJiZcclxuXHRcdFx0XHRcdFx0dGhpcy5jdXJyZW50RmlsdGVyU3RhdGUuZmlsdGVyR3JvdXBzICYmXHJcblx0XHRcdFx0XHRcdHRoaXMuY3VycmVudEZpbHRlclN0YXRlLmZpbHRlckdyb3Vwcy5sZW5ndGggPiAwXHJcblx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0ZmlsdGVyT3B0aW9ucy5hZHZhbmNlZEZpbHRlciA9IHRoaXMuY3VycmVudEZpbHRlclN0YXRlO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdGxldCBmaWx0ZXJlZFRhc2tzID0gZmlsdGVyVGFza3MoXHJcblx0XHRcdFx0XHRcdHRoaXMudGFza3MsXHJcblx0XHRcdFx0XHRcdGNvbXBvbmVudC5nZXRWaWV3SWQoKSxcclxuXHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdFx0XHRcdGZpbHRlck9wdGlvbnNcclxuXHRcdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gRmlsdGVyIG91dCBiYWRnZSB0YXNrcyBmb3IgZm9yZWNhc3QgdmlldyAtIHRoZXkgc2hvdWxkIG9ubHkgYXBwZWFyIGluIGV2ZW50IHZpZXdcclxuXHRcdFx0XHRcdGlmIChjb21wb25lbnQuZ2V0Vmlld0lkKCkgPT09IFwiZm9yZWNhc3RcIikge1xyXG5cdFx0XHRcdFx0XHRmaWx0ZXJlZFRhc2tzID0gZmlsdGVyZWRUYXNrcy5maWx0ZXIoXHJcblx0XHRcdFx0XHRcdFx0KHRhc2spID0+ICEodGFzayBhcyBhbnkpLmJhZGdlXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Y29tcG9uZW50LnNldFRhc2tzKGZpbHRlcmVkVGFza3MpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHR2aWV3SWQgPT09IFwicmV2aWV3XCIgJiZcclxuXHRcdFx0XHR0eXBlb2YgdGFyZ2V0Q29tcG9uZW50LnJlZnJlc2hSZXZpZXdTZXR0aW5ncyA9PT0gXCJmdW5jdGlvblwiXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHRhcmdldENvbXBvbmVudC5yZWZyZXNoUmV2aWV3U2V0dGluZ3MoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKGBObyB0YXJnZXQgY29tcG9uZW50IGZvdW5kIGZvciB2aWV3SWQ6ICR7dmlld0lkfWApO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMudXBkYXRlSGVhZGVyRGlzcGxheSgpO1xyXG5cdFx0dGhpcy5oYW5kbGVUYXNrU2VsZWN0aW9uKG51bGwpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHRoZSBjdXJyZW50bHkgYWN0aXZlIGNvbXBvbmVudCBiYXNlZCBvbiBjdXJyZW50Vmlld0lkXHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZXRBY3RpdmVDb21wb25lbnQoKTogYW55IHtcclxuXHRcdGlmICghdGhpcy5jdXJyZW50Vmlld0lkKSByZXR1cm4gbnVsbDtcclxuXHJcblx0XHQvLyBDaGVjayBmb3Igc3BlY2lhbCB2aWV3IHR5cGVzIGZpcnN0XHJcblx0XHRjb25zdCB2aWV3Q29uZmlnID0gZ2V0Vmlld1NldHRpbmdPckRlZmF1bHQoXHJcblx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHR0aGlzLmN1cnJlbnRWaWV3SWRcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gSGFuZGxlIFR3b0NvbHVtbiB2aWV3c1xyXG5cdFx0aWYgKHZpZXdDb25maWcuc3BlY2lmaWNDb25maWc/LnZpZXdUeXBlID09PSBcInR3b2NvbHVtblwiKSB7XHJcblx0XHRcdHJldHVybiB0aGlzLnR3b0NvbHVtblZpZXdDb21wb25lbnRzLmdldCh0aGlzLmN1cnJlbnRWaWV3SWQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENoZWNrIGlmIGl0J3MgYSBzcGVjaWFsIHZpZXcgaGFuZGxlZCBieSB2aWV3Q29tcG9uZW50TWFuYWdlclxyXG5cdFx0aWYgKHRoaXMudmlld0NvbXBvbmVudE1hbmFnZXIuaXNTcGVjaWFsVmlldyh0aGlzLmN1cnJlbnRWaWV3SWQpKSB7XHJcblx0XHRcdC8vIEZvciBzcGVjaWFsIHZpZXdzLCB3ZSBjYW4ndCBlYXNpbHkgZ2V0IHRoZSBjb21wb25lbnQgaW5zdGFuY2VcclxuXHRcdFx0Ly8gUmV0dXJuIG51bGwgdG8gc2tpcCB0aGUgdXBkYXRlXHJcblx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEhhbmRsZSBmb3JlY2FzdCB2aWV3c1xyXG5cdFx0Y29uc3Qgc3BlY2lmaWNWaWV3VHlwZSA9IHZpZXdDb25maWcuc3BlY2lmaWNDb25maWc/LnZpZXdUeXBlO1xyXG5cdFx0aWYgKFxyXG5cdFx0XHRzcGVjaWZpY1ZpZXdUeXBlID09PSBcImZvcmVjYXN0XCIgfHxcclxuXHRcdFx0dGhpcy5jdXJyZW50Vmlld0lkID09PSBcImZvcmVjYXN0XCJcclxuXHRcdCkge1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5mb3JlY2FzdENvbXBvbmVudDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBIYW5kbGUgc3RhbmRhcmQgdmlldyB0eXBlc1xyXG5cdFx0c3dpdGNoICh0aGlzLmN1cnJlbnRWaWV3SWQpIHtcclxuXHRcdFx0Y2FzZSBcImhhYml0XCI6XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuaGFiaXRzQ29tcG9uZW50O1xyXG5cdFx0XHRjYXNlIFwidGFnc1wiOlxyXG5cdFx0XHRcdHJldHVybiB0aGlzLnRhZ3NDb21wb25lbnQ7XHJcblx0XHRcdGNhc2UgXCJwcm9qZWN0c1wiOlxyXG5cdFx0XHRcdHJldHVybiB0aGlzLnByb2plY3RzQ29tcG9uZW50O1xyXG5cdFx0XHRjYXNlIFwicmV2aWV3XCI6XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMucmV2aWV3Q29tcG9uZW50O1xyXG5cdFx0XHRjYXNlIFwiaW5ib3hcIjpcclxuXHRcdFx0Y2FzZSBcImZsYWdnZWRcIjpcclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5jb250ZW50Q29tcG9uZW50O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSB1cGRhdGVIZWFkZXJEaXNwbGF5KCkge1xyXG5cdFx0Y29uc3QgY29uZmlnID0gZ2V0Vmlld1NldHRpbmdPckRlZmF1bHQodGhpcy5wbHVnaW4sIHRoaXMuY3VycmVudFZpZXdJZCk7XHJcblx0XHQvLyBVc2UgdGhlIGFjdHVhbCBjdXJyZW50Vmlld0lkIGZvciB0aGUgaGVhZGVyXHJcblx0XHR0aGlzLmxlYWYuc2V0RXBoZW1lcmFsU3RhdGUoe3RpdGxlOiBjb25maWcubmFtZSwgaWNvbjogY29uZmlnLmljb259KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaGFuZGxlVGFza0NvbnRleHRNZW51KGV2ZW50OiBNb3VzZUV2ZW50LCB0YXNrOiBUYXNrKSB7XHJcblx0XHRjb25zdCBtZW51ID0gbmV3IE1lbnUoKTtcclxuXHJcblx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0aXRlbS5zZXRUaXRsZSh0KFwiQ29tcGxldGVcIikpO1xyXG5cdFx0XHRpdGVtLnNldEljb24oXCJjaGVjay1zcXVhcmVcIik7XHJcblx0XHRcdGl0ZW0ub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy50b2dnbGVUYXNrQ29tcGxldGlvbih0YXNrKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KVxyXG5cdFx0XHQuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRcdGl0ZW0uc2V0SWNvbihcInNxdWFyZS1wZW5cIik7XHJcblx0XHRcdFx0aXRlbS5zZXRUaXRsZSh0KFwiU3dpdGNoIHN0YXR1c1wiKSk7XHJcblx0XHRcdFx0Y29uc3Qgc3VibWVudSA9IGl0ZW0uc2V0U3VibWVudSgpO1xyXG5cclxuXHRcdFx0XHQvLyBHZXQgdW5pcXVlIHN0YXR1c2VzIGZyb20gdGFza1N0YXR1c01hcmtzXHJcblx0XHRcdFx0Y29uc3Qgc3RhdHVzTWFya3MgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXNrU3RhdHVzTWFya3M7XHJcblx0XHRcdFx0Y29uc3QgdW5pcXVlU3RhdHVzZXMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xyXG5cclxuXHRcdFx0XHQvLyBCdWlsZCBhIG1hcCBvZiB1bmlxdWUgbWFyayAtPiBzdGF0dXMgbmFtZSB0byBhdm9pZCBkdXBsaWNhdGVzXHJcblx0XHRcdFx0Zm9yIChjb25zdCBzdGF0dXMgb2YgT2JqZWN0LmtleXMoc3RhdHVzTWFya3MpKSB7XHJcblx0XHRcdFx0XHRjb25zdCBtYXJrID1cclxuXHRcdFx0XHRcdFx0c3RhdHVzTWFya3Nbc3RhdHVzIGFzIGtleW9mIHR5cGVvZiBzdGF0dXNNYXJrc107XHJcblx0XHRcdFx0XHQvLyBJZiB0aGlzIG1hcmsgaXMgbm90IGFscmVhZHkgaW4gdGhlIG1hcCwgYWRkIGl0XHJcblx0XHRcdFx0XHQvLyBUaGlzIGVuc3VyZXMgZWFjaCBtYXJrIGFwcGVhcnMgb25seSBvbmNlIGluIHRoZSBtZW51XHJcblx0XHRcdFx0XHRpZiAoIUFycmF5LmZyb20odW5pcXVlU3RhdHVzZXMudmFsdWVzKCkpLmluY2x1ZGVzKG1hcmspKSB7XHJcblx0XHRcdFx0XHRcdHVuaXF1ZVN0YXR1c2VzLnNldChzdGF0dXMsIG1hcmspO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gQ3JlYXRlIG1lbnUgaXRlbXMgZnJvbSB1bmlxdWUgc3RhdHVzZXNcclxuXHRcdFx0XHRmb3IgKGNvbnN0IFtzdGF0dXMsIG1hcmtdIG9mIHVuaXF1ZVN0YXR1c2VzKSB7XHJcblx0XHRcdFx0XHRzdWJtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRcdFx0aXRlbS50aXRsZUVsLmNyZWF0ZUVsKFxyXG5cdFx0XHRcdFx0XHRcdFwic3BhblwiLFxyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdGNsczogXCJzdGF0dXMtb3B0aW9uLWNoZWNrYm94XCIsXHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHQoZWwpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdGNyZWF0ZVRhc2tDaGVja2JveChtYXJrLCB0YXNrLCBlbCk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRpdGVtLnRpdGxlRWwuY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdFx0XHRcdFx0XHRjbHM6IFwic3RhdHVzLW9wdGlvblwiLFxyXG5cdFx0XHRcdFx0XHRcdHRleHQ6IHN0YXR1cyxcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdGl0ZW0ub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coXCJzdGF0dXNcIiwgc3RhdHVzLCBtYXJrKTtcclxuXHRcdFx0XHRcdFx0XHRpZiAoIXRhc2suY29tcGxldGVkICYmIG1hcmsudG9Mb3dlckNhc2UoKSA9PT0gXCJ4XCIpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHRhc2subWV0YWRhdGEuY29tcGxldGVkRGF0ZSA9IERhdGUubm93KCk7XHJcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRcdHRhc2subWV0YWRhdGEuY29tcGxldGVkRGF0ZSA9IHVuZGVmaW5lZDtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0dGhpcy51cGRhdGVUYXNrKHRhc2ssIHtcclxuXHRcdFx0XHRcdFx0XHRcdC4uLnRhc2ssXHJcblx0XHRcdFx0XHRcdFx0XHRzdGF0dXM6IG1hcmssXHJcblx0XHRcdFx0XHRcdFx0XHRjb21wbGV0ZWQ6XHJcblx0XHRcdFx0XHRcdFx0XHRcdG1hcmsudG9Mb3dlckNhc2UoKSA9PT0gXCJ4XCIgPyB0cnVlIDogZmFsc2UsXHJcblx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KVxyXG5cdFx0XHQuYWRkU2VwYXJhdG9yKClcclxuXHRcdFx0LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJFZGl0XCIpKTtcclxuXHRcdFx0XHRpdGVtLnNldEljb24oXCJwZW5jaWxcIik7XHJcblx0XHRcdFx0aXRlbS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuaGFuZGxlVGFza1NlbGVjdGlvbih0YXNrKTsgLy8gT3BlbiBkZXRhaWxzIHZpZXcgZm9yIGVkaXRpbmdcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSlcclxuXHRcdFx0LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJFZGl0IGluIEZpbGVcIikpO1xyXG5cdFx0XHRcdGl0ZW0uc2V0SWNvbihcImZpbGUtZWRpdFwiKTsgLy8gQ2hhbmdlZCBpY29uIHNsaWdodGx5XHJcblx0XHRcdFx0aXRlbS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuZWRpdFRhc2sodGFzayk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdG1lbnUuc2hvd0F0TW91c2VFdmVudChldmVudCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGhhbmRsZVRhc2tTZWxlY3Rpb24odGFzazogVGFzayB8IG51bGwpIHtcclxuXHRcdGlmICh0YXNrKSB7XHJcblx0XHRcdGNvbnN0IG5vdyA9IERhdGUubm93KCk7XHJcblx0XHRcdGNvbnN0IHRpbWVTaW5jZUxhc3RUb2dnbGUgPSBub3cgLSB0aGlzLmxhc3RUb2dnbGVUaW1lc3RhbXA7XHJcblxyXG5cdFx0XHRpZiAodGhpcy5jdXJyZW50U2VsZWN0ZWRUYXNrSWQgIT09IHRhc2suaWQpIHtcclxuXHRcdFx0XHR0aGlzLmN1cnJlbnRTZWxlY3RlZFRhc2tJZCA9IHRhc2suaWQ7XHJcblx0XHRcdFx0dGhpcy5kZXRhaWxzQ29tcG9uZW50LnNob3dUYXNrRGV0YWlscyh0YXNrKTtcclxuXHRcdFx0XHRpZiAoIXRoaXMuaXNEZXRhaWxzVmlzaWJsZSkge1xyXG5cdFx0XHRcdFx0dGhpcy50b2dnbGVEZXRhaWxzVmlzaWJpbGl0eSh0cnVlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0dGhpcy5sYXN0VG9nZ2xlVGltZXN0YW1wID0gbm93O1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVG9nZ2xlIGRldGFpbHMgdmlzaWJpbGl0eSBvbiBkb3VibGUtY2xpY2svcmUtY2xpY2tcclxuXHRcdFx0aWYgKHRpbWVTaW5jZUxhc3RUb2dnbGUgPiAxNTApIHtcclxuXHRcdFx0XHQvLyBEZWJvdW5jZSBzbGlnaHRseVxyXG5cdFx0XHRcdHRoaXMudG9nZ2xlRGV0YWlsc1Zpc2liaWxpdHkoIXRoaXMuaXNEZXRhaWxzVmlzaWJsZSk7XHJcblx0XHRcdFx0dGhpcy5sYXN0VG9nZ2xlVGltZXN0YW1wID0gbm93O1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBEZXNlbGVjdGluZyB0YXNrIGV4cGxpY2l0bHlcclxuXHRcdFx0dGhpcy50b2dnbGVEZXRhaWxzVmlzaWJpbGl0eShmYWxzZSk7XHJcblx0XHRcdHRoaXMuY3VycmVudFNlbGVjdGVkVGFza0lkID0gbnVsbDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgbG9hZFRhc2tzKFxyXG5cdFx0Zm9yY2VTeW5jOiBib29sZWFuID0gZmFsc2UsXHJcblx0XHRza2lwVmlld1VwZGF0ZTogYm9vbGVhbiA9IGZhbHNlXHJcblx0KSB7XHJcblx0XHQvLyBPbmx5IHVzZSBkYXRhZmxvdyAtIFRhc2tNYW5hZ2VyIGlzIGRlcHJlY2F0ZWRcclxuXHRcdGlmICghdGhpcy5wbHVnaW4uZGF0YWZsb3dPcmNoZXN0cmF0b3IpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFwiW1Rhc2tTcGVjaWZpY1ZpZXddIERhdGFmbG93IG9yY2hlc3RyYXRvciBub3QgYXZhaWxhYmxlLCB3YWl0aW5nIGZvciBpbml0aWFsaXphdGlvbi4uLlwiXHJcblx0XHRcdCk7XHJcblx0XHRcdHRoaXMudGFza3MgPSBbXTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcIltUYXNrU3BlY2lmaWNWaWV3XSBMb2FkaW5nIHRhc2tzIGZyb20gZGF0YWZsb3cgb3JjaGVzdHJhdG9yLi4uXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGNvbnN0IHF1ZXJ5QVBJID0gdGhpcy5wbHVnaW4uZGF0YWZsb3dPcmNoZXN0cmF0b3IuZ2V0UXVlcnlBUEkoKTtcclxuXHRcdFx0XHR0aGlzLnRhc2tzID0gYXdhaXQgcXVlcnlBUEkuZ2V0QWxsVGFza3MoKTtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdGBbVGFza1NwZWNpZmljVmlld10gTG9hZGVkICR7dGhpcy50YXNrcy5sZW5ndGh9IHRhc2tzIGZyb20gZGF0YWZsb3dgXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFxyXG5cdFx0XHRcdFx0XCJbVGFza1NwZWNpZmljVmlld10gRXJyb3IgbG9hZGluZyB0YXNrcyBmcm9tIGRhdGFmbG93OlwiLFxyXG5cdFx0XHRcdFx0ZXJyb3JcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHRoaXMudGFza3MgPSBbXTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGlmICghc2tpcFZpZXdVcGRhdGUpIHtcclxuXHRcdFx0Ly8g55u05o6l5YiH5o2i5Yiw5b2T5YmN6KeG5Zu+XHJcblx0XHRcdGlmICh0aGlzLmN1cnJlbnRWaWV3SWQpIHtcclxuXHRcdFx0XHR0aGlzLnN3aXRjaFZpZXcodGhpcy5jdXJyZW50Vmlld0lkLCB0aGlzLmN1cnJlbnRQcm9qZWN0LCB0cnVlKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8g5pu05paw5pON5L2c5oyJ6ZKuXHJcblx0XHRcdHRoaXMudXBkYXRlQWN0aW9uQnV0dG9ucygpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTG9hZCB0YXNrcyBmYXN0IHVzaW5nIGNhY2hlZCBkYXRhIC0gZm9yIFVJIGluaXRpYWxpemF0aW9uXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhc3luYyBsb2FkVGFza3NGYXN0KHNraXBWaWV3VXBkYXRlOiBib29sZWFuID0gZmFsc2UpIHtcclxuXHRcdC8vIE9ubHkgdXNlIGRhdGFmbG93XHJcblx0XHRpZiAoIXRoaXMucGx1Z2luLmRhdGFmbG93T3JjaGVzdHJhdG9yKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcIltUYXNrU3BlY2lmaWNWaWV3XSBEYXRhZmxvdyBvcmNoZXN0cmF0b3Igbm90IGF2YWlsYWJsZSBmb3IgZmFzdCBsb2FkXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0dGhpcy50YXNrcyA9IFtdO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdFwiW1Rhc2tTcGVjaWZpY1ZpZXddIExvYWRpbmcgdGFza3MgZmFzdCBmcm9tIGRhdGFmbG93IG9yY2hlc3RyYXRvci4uLlwiXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRjb25zdCBxdWVyeUFQSSA9IHRoaXMucGx1Z2luLmRhdGFmbG93T3JjaGVzdHJhdG9yLmdldFF1ZXJ5QVBJKCk7XHJcblx0XHRcdFx0Ly8gRm9yIGZhc3QgbG9hZGluZywgdXNlIHJlZ3VsYXIgZ2V0QWxsVGFza3MgKGl0IHNob3VsZCBiZSBjYWNoZWQpXHJcblx0XHRcdFx0dGhpcy50YXNrcyA9IGF3YWl0IHF1ZXJ5QVBJLmdldEFsbFRhc2tzKCk7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRgW1Rhc2tTcGVjaWZpY1ZpZXddIExvYWRlZCAke3RoaXMudGFza3MubGVuZ3RofSB0YXNrcyAoZmFzdCBmcm9tIGRhdGFmbG93KWBcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXHJcblx0XHRcdFx0XHRcIltUYXNrU3BlY2lmaWNWaWV3XSBFcnJvciBsb2FkaW5nIHRhc2tzIGZhc3QgZnJvbSBkYXRhZmxvdzpcIixcclxuXHRcdFx0XHRcdGVycm9yXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHR0aGlzLnRhc2tzID0gW107XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRpZiAoIXNraXBWaWV3VXBkYXRlKSB7XHJcblx0XHRcdC8vIOebtOaOpeWIh+aNouWIsOW9k+WJjeinhuWbvlxyXG5cdFx0XHRpZiAodGhpcy5jdXJyZW50Vmlld0lkKSB7XHJcblx0XHRcdFx0dGhpcy5zd2l0Y2hWaWV3KHRoaXMuY3VycmVudFZpZXdJZCwgdGhpcy5jdXJyZW50UHJvamVjdCwgdHJ1ZSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIOabtOaWsOaTjeS9nOaMiemSrlxyXG5cdFx0XHR0aGlzLnVwZGF0ZUFjdGlvbkJ1dHRvbnMoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIExvYWQgdGFza3Mgd2l0aCBzeW5jIGluIGJhY2tncm91bmQgLSBub24tYmxvY2tpbmdcclxuXHQgKi9cclxuXHRwcml2YXRlIGFzeW5jIGxvYWRUYXNrc1dpdGhTeW5jSW5CYWNrZ3JvdW5kKCkge1xyXG5cdFx0Ly8gT25seSB1c2UgZGF0YWZsb3csIElDUyBldmVudHMgYXJlIGhhbmRsZWQgdGhyb3VnaCBkYXRhZmxvdyBhcmNoaXRlY3R1cmVcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IHF1ZXJ5QVBJID0gdGhpcy5wbHVnaW4uZGF0YWZsb3dPcmNoZXN0cmF0b3I/LmdldFF1ZXJ5QVBJKCk7XHJcblx0XHRcdGlmICghcXVlcnlBUEkpIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXCJbVGFza1NwZWNpZmljVmlld10gUXVlcnlBUEkgbm90IGF2YWlsYWJsZVwiKTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdFx0Y29uc3QgdGFza3MgPSBhd2FpdCBxdWVyeUFQSS5nZXRBbGxUYXNrcygpO1xyXG5cdFx0XHRpZiAodGFza3MubGVuZ3RoICE9PSB0aGlzLnRhc2tzLmxlbmd0aCB8fCB0YXNrcy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0XHR0aGlzLnRhc2tzID0gdGFza3M7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRgVGFza1NwZWNpZmljVmlldyB1cGRhdGVkIHdpdGggJHt0aGlzLnRhc2tzLmxlbmd0aH0gdGFza3MgKGRhdGFmbG93IHN5bmMpYFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0Ly8gRG9uJ3QgdHJpZ2dlciB2aWV3IHVwZGF0ZSBoZXJlIGFzIGl0IHdpbGwgYmUgaGFuZGxlZCBieSBldmVudHNcclxuXHRcdFx0fVxyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFwiQmFja2dyb3VuZCB0YXNrIHN5bmMgZmFpbGVkOlwiLCBlcnJvcik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyDmt7vliqDlupTnlKjlvZPliY3ov4fmu6TlmajnirbmgIHnmoTmlrnms5VcclxuXHRwcml2YXRlIGFwcGx5Q3VycmVudEZpbHRlcigpIHtcclxuXHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcIuW6lOeUqCBUYXNrU3BlY2lmaWNWaWV3IOW9k+WJjei/h+a7pOeKtuaAgTpcIixcclxuXHRcdFx0dGhpcy5saXZlRmlsdGVyU3RhdGUgPyBcIuacieWunuaXtuetm+mAieWZqFwiIDogXCLml6Dlrp7ml7bnrZvpgInlmahcIixcclxuXHRcdFx0dGhpcy5jdXJyZW50RmlsdGVyU3RhdGUgPyBcIuaciei/h+a7pOWZqFwiIDogXCLml6Dov4fmu6TlmahcIlxyXG5cdFx0KTtcclxuXHRcdC8vIOmAmui/hyBsb2FkVGFza3Mg6YeN5paw5Yqg6L295Lu75YqhXHJcblx0XHR0aGlzLmxvYWRUYXNrcygpO1xyXG5cdH1cclxuXHJcblx0cHVibGljIGFzeW5jIHRyaWdnZXJWaWV3VXBkYXRlKCkge1xyXG5cdFx0Ly8g55u05o6l5YiH5o2i5Yiw5b2T5YmN6KeG5Zu+5Lul5Yi35paw5Lu75YqhXHJcblx0XHRpZiAodGhpcy5jdXJyZW50Vmlld0lkKSB7XHJcblx0XHRcdHRoaXMuc3dpdGNoVmlldyh0aGlzLmN1cnJlbnRWaWV3SWQsIHRoaXMuY3VycmVudFByb2plY3QpO1xyXG5cdFx0XHQvLyDmm7TmlrDmk43kvZzmjInpkq5cclxuXHRcdFx0dGhpcy51cGRhdGVBY3Rpb25CdXR0b25zKCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XCJUYXNrU3BlY2lmaWNWaWV3OiBDYW5ub3QgdHJpZ2dlciB1cGRhdGUsIGN1cnJlbnRWaWV3SWQgaXMgbm90IHNldC5cIlxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSB1cGRhdGVBY3Rpb25CdXR0b25zKCkge1xyXG5cdFx0Ly8g56e76Zmk6L+H5ruk5Zmo6YeN572u5oyJ6ZKu77yI5aaC5p6c5a2Y5Zyo77yJXHJcblx0XHRjb25zdCByZXNldEJ1dHRvbiA9IHRoaXMubGVhZi52aWV3LmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFwiLnZpZXctYWN0aW9uLnRhc2stZmlsdGVyLXJlc2V0XCJcclxuXHRcdCk7XHJcblx0XHRpZiAocmVzZXRCdXR0b24pIHtcclxuXHRcdFx0cmVzZXRCdXR0b24ucmVtb3ZlKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8g5Y+q5pyJ5Zyo5pyJ5a6e5pe26auY57qn562b6YCJ5Zmo5pe25omN5re75Yqg6YeN572u5oyJ6ZKu77yI5LiN5YyF5ous5Z+656GA6L+H5ruk5Zmo77yJXHJcblx0XHRpZiAoXHJcblx0XHRcdHRoaXMubGl2ZUZpbHRlclN0YXRlICYmXHJcblx0XHRcdHRoaXMubGl2ZUZpbHRlclN0YXRlLmZpbHRlckdyb3VwcyAmJlxyXG5cdFx0XHR0aGlzLmxpdmVGaWx0ZXJTdGF0ZS5maWx0ZXJHcm91cHMubGVuZ3RoID4gMFxyXG5cdFx0KSB7XHJcblx0XHRcdHRoaXMuYWRkQWN0aW9uKFwicmVzZXRcIiwgdChcIlJlc2V0IEZpbHRlclwiKSwgKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMucmVzZXRDdXJyZW50RmlsdGVyKCk7XHJcblx0XHRcdH0pLmFkZENsYXNzKFwidGFzay1maWx0ZXItcmVzZXRcIik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIHRvZ2dsZVRhc2tDb21wbGV0aW9uKHRhc2s6IFRhc2spIHtcclxuXHRcdGNvbnN0IHVwZGF0ZWRUYXNrID0gey4uLnRhc2ssIGNvbXBsZXRlZDogIXRhc2suY29tcGxldGVkfTtcclxuXHJcblx0XHRpZiAodXBkYXRlZFRhc2suY29tcGxldGVkKSB7XHJcblx0XHRcdC8vIOiuvue9ruWujOaIkOaXtumXtOWIsOS7u+WKoeWFg+aVsOaNruS4rVxyXG5cdFx0XHRpZiAodXBkYXRlZFRhc2subWV0YWRhdGEpIHtcclxuXHRcdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YS5jb21wbGV0ZWREYXRlID0gRGF0ZS5ub3coKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRjb25zdCBjb21wbGV0ZWRNYXJrID0gKFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnRhc2tTdGF0dXNlcy5jb21wbGV0ZWQgfHwgXCJ4XCJcclxuXHRcdFx0KS5zcGxpdChcInxcIilbMF07XHJcblx0XHRcdGlmICh1cGRhdGVkVGFzay5zdGF0dXMgIT09IGNvbXBsZXRlZE1hcmspIHtcclxuXHRcdFx0XHR1cGRhdGVkVGFzay5zdGF0dXMgPSBjb21wbGV0ZWRNYXJrO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyDmuIXpmaTlrozmiJDml7bpl7RcclxuXHRcdFx0aWYgKHVwZGF0ZWRUYXNrLm1ldGFkYXRhKSB7XHJcblx0XHRcdFx0dXBkYXRlZFRhc2subWV0YWRhdGEuY29tcGxldGVkRGF0ZSA9IHVuZGVmaW5lZDtcclxuXHRcdFx0fVxyXG5cdFx0XHRjb25zdCBub3RTdGFydGVkTWFyayA9XHJcblx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c2VzLm5vdFN0YXJ0ZWQgfHwgXCIgXCI7XHJcblx0XHRcdGlmICh1cGRhdGVkVGFzay5zdGF0dXMudG9Mb3dlckNhc2UoKSA9PT0gXCJ4XCIpIHtcclxuXHRcdFx0XHQvLyBPbmx5IHJldmVydCBpZiBpdCB3YXMgdGhlIGNvbXBsZXRlZCBtYXJrXHJcblx0XHRcdFx0dXBkYXRlZFRhc2suc3RhdHVzID0gbm90U3RhcnRlZE1hcms7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBBbHdheXMgdXNlIFdyaXRlQVBJXHJcblx0XHRpZiAoIXRoaXMucGx1Z2luLndyaXRlQVBJKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJXcml0ZUFQSSBub3QgYXZhaWxhYmxlXCIpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5wbHVnaW4ud3JpdGVBUEkudXBkYXRlVGFzayh7XHJcblx0XHRcdHRhc2tJZDogdXBkYXRlZFRhc2suaWQsXHJcblx0XHRcdHVwZGF0ZXM6IHVwZGF0ZWRUYXNrLFxyXG5cdFx0fSk7XHJcblx0XHRpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihyZXN1bHQuZXJyb3IgfHwgXCJGYWlsZWQgdG8gdXBkYXRlIHRhc2tcIik7XHJcblx0XHR9XHJcblx0XHQvLyBUYXNrIGNhY2hlIGxpc3RlbmVyIHdpbGwgdHJpZ2dlciBsb2FkVGFza3MgLT4gdHJpZ2dlclZpZXdVcGRhdGVcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEV4dHJhY3Qgb25seSB0aGUgZmllbGRzIHRoYXQgaGF2ZSBjaGFuZ2VkIGJldHdlZW4gdHdvIHRhc2tzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBleHRyYWN0Q2hhbmdlZEZpZWxkcyhcclxuXHRcdG9yaWdpbmFsVGFzazogVGFzayxcclxuXHRcdHVwZGF0ZWRUYXNrOiBUYXNrXHJcblx0KTogUGFydGlhbDxUYXNrPiB7XHJcblx0XHRjb25zdCBjaGFuZ2VzOiBQYXJ0aWFsPFRhc2s+ID0ge307XHJcblxyXG5cdFx0Ly8gQ2hlY2sgdG9wLWxldmVsIGZpZWxkc1xyXG5cdFx0aWYgKG9yaWdpbmFsVGFzay5jb250ZW50ICE9PSB1cGRhdGVkVGFzay5jb250ZW50KSB7XHJcblx0XHRcdGNoYW5nZXMuY29udGVudCA9IHVwZGF0ZWRUYXNrLmNvbnRlbnQ7XHJcblx0XHR9XHJcblx0XHRpZiAob3JpZ2luYWxUYXNrLmNvbXBsZXRlZCAhPT0gdXBkYXRlZFRhc2suY29tcGxldGVkKSB7XHJcblx0XHRcdGNoYW5nZXMuY29tcGxldGVkID0gdXBkYXRlZFRhc2suY29tcGxldGVkO1xyXG5cdFx0fVxyXG5cdFx0aWYgKG9yaWdpbmFsVGFzay5zdGF0dXMgIT09IHVwZGF0ZWRUYXNrLnN0YXR1cykge1xyXG5cdFx0XHRjaGFuZ2VzLnN0YXR1cyA9IHVwZGF0ZWRUYXNrLnN0YXR1cztcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDaGVjayBtZXRhZGF0YSBmaWVsZHNcclxuXHRcdGNvbnN0IG1ldGFkYXRhQ2hhbmdlczogUGFydGlhbDx0eXBlb2Ygb3JpZ2luYWxUYXNrLm1ldGFkYXRhPiA9IHt9O1xyXG5cdFx0bGV0IGhhc01ldGFkYXRhQ2hhbmdlcyA9IGZhbHNlO1xyXG5cclxuXHRcdC8vIENvbXBhcmUgZWFjaCBtZXRhZGF0YSBmaWVsZFxyXG5cdFx0Y29uc3QgbWV0YWRhdGFGaWVsZHMgPSBbXHJcblx0XHRcdFwicHJpb3JpdHlcIixcclxuXHRcdFx0XCJwcm9qZWN0XCIsXHJcblx0XHRcdFwidGFnc1wiLFxyXG5cdFx0XHRcImNvbnRleHRcIixcclxuXHRcdFx0XCJkdWVEYXRlXCIsXHJcblx0XHRcdFwic3RhcnREYXRlXCIsXHJcblx0XHRcdFwic2NoZWR1bGVkRGF0ZVwiLFxyXG5cdFx0XHRcImNvbXBsZXRlZERhdGVcIixcclxuXHRcdFx0XCJyZWN1cnJlbmNlXCIsXHJcblx0XHRdO1xyXG5cdFx0Zm9yIChjb25zdCBmaWVsZCBvZiBtZXRhZGF0YUZpZWxkcykge1xyXG5cdFx0XHRjb25zdCBvcmlnaW5hbFZhbHVlID0gKG9yaWdpbmFsVGFzay5tZXRhZGF0YSBhcyBhbnkpPy5bZmllbGRdO1xyXG5cdFx0XHRjb25zdCB1cGRhdGVkVmFsdWUgPSAodXBkYXRlZFRhc2subWV0YWRhdGEgYXMgYW55KT8uW2ZpZWxkXTtcclxuXHJcblx0XHRcdC8vIEhhbmRsZSBhcnJheXMgc3BlY2lhbGx5ICh0YWdzKVxyXG5cdFx0XHRpZiAoZmllbGQgPT09IFwidGFnc1wiKSB7XHJcblx0XHRcdFx0Y29uc3Qgb3JpZ1RhZ3MgPSBvcmlnaW5hbFZhbHVlIHx8IFtdO1xyXG5cdFx0XHRcdGNvbnN0IHVwZFRhZ3MgPSB1cGRhdGVkVmFsdWUgfHwgW107XHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0b3JpZ1RhZ3MubGVuZ3RoICE9PSB1cGRUYWdzLmxlbmd0aCB8fFxyXG5cdFx0XHRcdFx0IW9yaWdUYWdzLmV2ZXJ5KCh0OiBzdHJpbmcsIGk6IG51bWJlcikgPT4gdCA9PT0gdXBkVGFnc1tpXSlcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdG1ldGFkYXRhQ2hhbmdlcy50YWdzID0gdXBkVGFncztcclxuXHRcdFx0XHRcdGhhc01ldGFkYXRhQ2hhbmdlcyA9IHRydWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2UgaWYgKG9yaWdpbmFsVmFsdWUgIT09IHVwZGF0ZWRWYWx1ZSkge1xyXG5cdFx0XHRcdChtZXRhZGF0YUNoYW5nZXMgYXMgYW55KVtmaWVsZF0gPSB1cGRhdGVkVmFsdWU7XHJcblx0XHRcdFx0aGFzTWV0YWRhdGFDaGFuZ2VzID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIE9ubHkgaW5jbHVkZSBtZXRhZGF0YSBpZiB0aGVyZSBhcmUgY2hhbmdlc1xyXG5cdFx0aWYgKGhhc01ldGFkYXRhQ2hhbmdlcykge1xyXG5cdFx0XHRjaGFuZ2VzLm1ldGFkYXRhID0gbWV0YWRhdGFDaGFuZ2VzIGFzIGFueTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gY2hhbmdlcztcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgaGFuZGxlVGFza1VwZGF0ZShvcmlnaW5hbFRhc2s6IFRhc2ssIHVwZGF0ZWRUYXNrOiBUYXNrKSB7XHJcblx0XHRpZiAoIXRoaXMucGx1Z2luLndyaXRlQVBJKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJXcml0ZUFQSSBub3QgYXZhaWxhYmxlXCIpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFwiaGFuZGxlVGFza1VwZGF0ZVwiLFxyXG5cdFx0XHRvcmlnaW5hbFRhc2suY29udGVudCxcclxuXHRcdFx0dXBkYXRlZFRhc2suY29udGVudCxcclxuXHRcdFx0b3JpZ2luYWxUYXNrLmlkLFxyXG5cdFx0XHR1cGRhdGVkVGFzay5pZCxcclxuXHRcdFx0dXBkYXRlZFRhc2ssXHJcblx0XHRcdG9yaWdpbmFsVGFza1xyXG5cdFx0KTtcclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBFeHRyYWN0IG9ubHkgdGhlIGNoYW5nZWQgZmllbGRzXHJcblx0XHRcdGNvbnN0IHVwZGF0ZXMgPSB0aGlzLmV4dHJhY3RDaGFuZ2VkRmllbGRzKFxyXG5cdFx0XHRcdG9yaWdpbmFsVGFzayxcclxuXHRcdFx0XHR1cGRhdGVkVGFza1xyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gQWx3YXlzIHVzZSBXcml0ZUFQSSB3aXRoIG9ubHkgdGhlIGNoYW5nZWQgZmllbGRzXHJcblx0XHRcdC8vIFVzZSBvcmlnaW5hbFRhc2suaWQgdG8gZW5zdXJlIHdlJ3JlIHVwZGF0aW5nIHRoZSBjb3JyZWN0IHRhc2tcclxuXHRcdFx0Y29uc3Qgd3JpdGVSZXN1bHQgPSBhd2FpdCB0aGlzLnBsdWdpbi53cml0ZUFQSS51cGRhdGVUYXNrKHtcclxuXHRcdFx0XHR0YXNrSWQ6IG9yaWdpbmFsVGFzay5pZCxcclxuXHRcdFx0XHR1cGRhdGVzOiB1cGRhdGVzLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0aWYgKCF3cml0ZVJlc3VsdC5zdWNjZXNzKSB7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKHdyaXRlUmVzdWx0LmVycm9yIHx8IFwiRmFpbGVkIHRvIHVwZGF0ZSB0YXNrXCIpO1xyXG5cdFx0XHR9XHJcblx0XHRcdC8vIFByZWZlciB0aGUgYXV0aG9yaXRhdGl2ZSB0YXNrIHJldHVybmVkIGJ5IFdyaXRlQVBJIChpbmNsdWRlcyB1cGRhdGVkIG9yaWdpbmFsTWFya2Rvd24pXHJcblx0XHRcdGlmICh3cml0ZVJlc3VsdC50YXNrKSB7XHJcblx0XHRcdFx0dXBkYXRlZFRhc2sgPSB3cml0ZVJlc3VsdC50YXNrO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRgVGFzayAke3VwZGF0ZWRUYXNrLmlkfSB1cGRhdGVkIHN1Y2Nlc3NmdWxseSB2aWEgaGFuZGxlVGFza1VwZGF0ZS5gXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgbG9jYWwgdGFzayBsaXN0IGltbWVkaWF0ZWx5XHJcblx0XHRcdGNvbnN0IGluZGV4ID0gdGhpcy50YXNrcy5maW5kSW5kZXgoKHQpID0+IHQuaWQgPT09IG9yaWdpbmFsVGFzay5pZCk7XHJcblx0XHRcdGlmIChpbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHQvLyBDcmVhdGUgYSBuZXcgYXJyYXkgdG8gZW5zdXJlIENvbnRlbnRDb21wb25lbnQgZGV0ZWN0cyB0aGUgY2hhbmdlXHJcblx0XHRcdFx0dGhpcy50YXNrcyA9IFsuLi50aGlzLnRhc2tzXTtcclxuXHRcdFx0XHR0aGlzLnRhc2tzW2luZGV4XSA9IHVwZGF0ZWRUYXNrO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcdFwiVXBkYXRlZCB0YXNrIG5vdCBmb3VuZCBpbiBsb2NhbCBsaXN0LCBtaWdodCByZWxvYWQuXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBBbHdheXMgcmVmcmVzaCB0aGUgdmlldyBhZnRlciBhIHN1Y2Nlc3NmdWwgdXBkYXRlXHJcblx0XHRcdC8vIFRoZSB1cGRhdGUgb3BlcmF0aW9uIGl0c2VsZiBtZWFucyBlZGl0aW5nIGlzIGNvbXBsZXRlXHJcblx0XHRcdC8vIEZvcmNlIHJlZnJlc2ggc2luY2Ugd2Uga25vdyB0aGUgdGFzayBoYXMgYmVlbiB1cGRhdGVkXHJcblx0XHRcdHRoaXMuc3dpdGNoVmlldyh0aGlzLmN1cnJlbnRWaWV3SWQsIHRoaXMuY3VycmVudFByb2plY3QsIHRydWUpO1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIGRldGFpbHMgY29tcG9uZW50IGlmIHRoZSB1cGRhdGVkIHRhc2sgaXMgY3VycmVudGx5IHNlbGVjdGVkXHJcblx0XHRcdGlmICh0aGlzLmN1cnJlbnRTZWxlY3RlZFRhc2tJZCA9PT0gdXBkYXRlZFRhc2suaWQpIHtcclxuXHRcdFx0XHRpZiAodGhpcy5kZXRhaWxzQ29tcG9uZW50LmlzQ3VycmVudGx5RWRpdGluZygpKSB7XHJcblx0XHRcdFx0XHQvLyBVcGRhdGUgdGhlIGN1cnJlbnQgdGFzayByZWZlcmVuY2Ugd2l0aG91dCByZS1yZW5kZXJpbmcgVUlcclxuXHRcdFx0XHRcdHRoaXMuZGV0YWlsc0NvbXBvbmVudC5jdXJyZW50VGFzayA9IHVwZGF0ZWRUYXNrO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHR0aGlzLmRldGFpbHNDb21wb25lbnQuc2hvd1Rhc2tEZXRhaWxzKHVwZGF0ZWRUYXNrKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gdXBkYXRlIHRhc2s6XCIsIGVycm9yKTtcclxuXHRcdFx0Ly8gUmUtdGhyb3cgdGhlIGVycm9yIHNvIHRoYXQgdGhlIElubGluZUVkaXRvciBjYW4gaGFuZGxlIGl0IHByb3Blcmx5XHJcblx0XHRcdHRocm93IGVycm9yO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyB1cGRhdGVUYXNrKFxyXG5cdFx0b3JpZ2luYWxUYXNrOiBUYXNrLFxyXG5cdFx0dXBkYXRlZFRhc2s6IFRhc2tcclxuXHQpOiBQcm9taXNlPFRhc2s+IHtcclxuXHRcdGlmICghdGhpcy5wbHVnaW4ud3JpdGVBUEkpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIldyaXRlQVBJIG5vdCBhdmFpbGFibGUgZm9yIHVwZGF0ZVRhc2tcIik7XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIldyaXRlQVBJIG5vdCBhdmFpbGFibGVcIik7XHJcblx0XHR9XHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBFeHRyYWN0IG9ubHkgdGhlIGNoYW5nZWQgZmllbGRzXHJcblx0XHRcdGNvbnN0IHVwZGF0ZXMgPSB0aGlzLmV4dHJhY3RDaGFuZ2VkRmllbGRzKFxyXG5cdFx0XHRcdG9yaWdpbmFsVGFzayxcclxuXHRcdFx0XHR1cGRhdGVkVGFza1xyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gQWx3YXlzIHVzZSBXcml0ZUFQSSB3aXRoIG9ubHkgdGhlIGNoYW5nZWQgZmllbGRzXHJcblx0XHRcdC8vIFVzZSBvcmlnaW5hbFRhc2suaWQgdG8gZW5zdXJlIHdlJ3JlIHVwZGF0aW5nIHRoZSBjb3JyZWN0IHRhc2tcclxuXHRcdFx0Y29uc3Qgd3JpdGVSZXN1bHQgPSBhd2FpdCB0aGlzLnBsdWdpbi53cml0ZUFQSS51cGRhdGVUYXNrKHtcclxuXHRcdFx0XHR0YXNrSWQ6IG9yaWdpbmFsVGFzay5pZCxcclxuXHRcdFx0XHR1cGRhdGVzOiB1cGRhdGVzLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0aWYgKCF3cml0ZVJlc3VsdC5zdWNjZXNzKSB7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKHdyaXRlUmVzdWx0LmVycm9yIHx8IFwiRmFpbGVkIHRvIHVwZGF0ZSB0YXNrXCIpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmICh3cml0ZVJlc3VsdC50YXNrKSB7XHJcblx0XHRcdFx0dXBkYXRlZFRhc2sgPSB3cml0ZVJlc3VsdC50YXNrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNvbnNvbGUubG9nKGBUYXNrICR7dXBkYXRlZFRhc2suaWR9IHVwZGF0ZWQgc3VjY2Vzc2Z1bGx5LmApO1xyXG5cclxuXHRcdFx0Ly8g56uL5Y2z5pu05paw5pys5Zyw5Lu75Yqh5YiX6KGoXHJcblx0XHRcdGNvbnN0IGluZGV4ID0gdGhpcy50YXNrcy5maW5kSW5kZXgoKHQpID0+IHQuaWQgPT09IG9yaWdpbmFsVGFzay5pZCk7XHJcblx0XHRcdGlmIChpbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHQvLyBDcmVhdGUgYSBuZXcgYXJyYXkgdG8gZW5zdXJlIENvbnRlbnRDb21wb25lbnQgZGV0ZWN0cyB0aGUgY2hhbmdlXHJcblx0XHRcdFx0dGhpcy50YXNrcyA9IFsuLi50aGlzLnRhc2tzXTtcclxuXHRcdFx0XHR0aGlzLnRhc2tzW2luZGV4XSA9IHVwZGF0ZWRUYXNrO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcdFwiVXBkYXRlZCB0YXNrIG5vdCBmb3VuZCBpbiBsb2NhbCBsaXN0LCBtaWdodCByZWxvYWQuXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBBbHdheXMgcmVmcmVzaCB0aGUgdmlldyBhZnRlciBhIHN1Y2Nlc3NmdWwgdXBkYXRlXHJcblx0XHRcdC8vIFRoZSB1cGRhdGUgb3BlcmF0aW9uIGl0c2VsZiBtZWFucyBlZGl0aW5nIGlzIGNvbXBsZXRlXHJcblx0XHRcdC8vIEZvcmNlIHJlZnJlc2ggc2luY2Ugd2Uga25vdyB0aGUgdGFzayBoYXMgYmVlbiB1cGRhdGVkXHJcblx0XHRcdHRoaXMuc3dpdGNoVmlldyh0aGlzLmN1cnJlbnRWaWV3SWQsIHRoaXMuY3VycmVudFByb2plY3QsIHRydWUpO1xyXG5cclxuXHRcdFx0aWYgKHRoaXMuY3VycmVudFNlbGVjdGVkVGFza0lkID09PSB1cGRhdGVkVGFzay5pZCkge1xyXG5cdFx0XHRcdGlmICh0aGlzLmRldGFpbHNDb21wb25lbnQuaXNDdXJyZW50bHlFZGl0aW5nKCkpIHtcclxuXHRcdFx0XHRcdC8vIFVwZGF0ZSB0aGUgY3VycmVudCB0YXNrIHJlZmVyZW5jZSB3aXRob3V0IHJlLXJlbmRlcmluZyBVSVxyXG5cdFx0XHRcdFx0dGhpcy5kZXRhaWxzQ29tcG9uZW50LmN1cnJlbnRUYXNrID0gdXBkYXRlZFRhc2s7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHRoaXMuZGV0YWlsc0NvbXBvbmVudC5zaG93VGFza0RldGFpbHModXBkYXRlZFRhc2spO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHVwZGF0ZWRUYXNrO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihgRmFpbGVkIHRvIHVwZGF0ZSB0YXNrICR7b3JpZ2luYWxUYXNrLmlkfTpgLCBlcnJvcik7XHJcblx0XHRcdHRocm93IGVycm9yO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBlZGl0VGFzayh0YXNrOiBUYXNrKSB7XHJcblx0XHRjb25zdCBmaWxlID0gdGhpcy5hcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aCh0YXNrLmZpbGVQYXRoKTtcclxuXHRcdGlmICghZmlsZSkgcmV0dXJuO1xyXG5cclxuXHRcdC8vIFByZWZlciBhY3RpdmF0aW5nIGV4aXN0aW5nIGxlYWYgaWYgZmlsZSBpcyBvcGVuXHJcblx0XHRjb25zdCBleGlzdGluZ0xlYWYgPSB0aGlzLmFwcC53b3Jrc3BhY2VcclxuXHRcdFx0LmdldExlYXZlc09mVHlwZShcIm1hcmtkb3duXCIpXHJcblx0XHRcdC5maW5kKFxyXG5cdFx0XHRcdChsZWFmKSA9PiAobGVhZi52aWV3IGFzIGFueSkuZmlsZSA9PT0gZmlsZSAvLyBUeXBlIGFzc2VydGlvbiBuZWVkZWQgaGVyZVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdGNvbnN0IGxlYWZUb1VzZSA9IGV4aXN0aW5nTGVhZiB8fCB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhZihcInRhYlwiKTsgLy8gT3BlbiBpbiBuZXcgdGFiIGlmIG5vdCBvcGVuXHJcblxyXG5cdFx0YXdhaXQgbGVhZlRvVXNlLm9wZW5GaWxlKGZpbGUsIHtcclxuXHRcdFx0YWN0aXZlOiB0cnVlLCAvLyBFbnN1cmUgdGhlIGxlYWYgYmVjb21lcyBhY3RpdmVcclxuXHRcdFx0ZVN0YXRlOiB7XHJcblx0XHRcdFx0bGluZTogdGFzay5saW5lLFxyXG5cdFx0XHR9LFxyXG5cdFx0fSk7XHJcblx0XHQvLyBGb2N1cyB0aGUgZWRpdG9yIGFmdGVyIG9wZW5pbmdcclxuXHRcdHRoaXMuYXBwLndvcmtzcGFjZS5zZXRBY3RpdmVMZWFmKGxlYWZUb1VzZSwge2ZvY3VzOiB0cnVlfSk7XHJcblx0fVxyXG5cclxuXHRhc3luYyBvbkNsb3NlKCkge1xyXG5cdFx0Ly8gQ2xlYW51cCBUd29Db2x1bW5WaWV3IGNvbXBvbmVudHNcclxuXHRcdHRoaXMudHdvQ29sdW1uVmlld0NvbXBvbmVudHMuZm9yRWFjaCgoY29tcG9uZW50KSA9PiB7XHJcblx0XHRcdHRoaXMucmVtb3ZlQ2hpbGQoY29tcG9uZW50KTtcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy50d29Db2x1bW5WaWV3Q29tcG9uZW50cy5jbGVhcigpO1xyXG5cclxuXHRcdC8vIENsZWFudXAgc3BlY2lhbCB2aWV3IGNvbXBvbmVudHNcclxuXHRcdC8vIHRoaXMudmlld0NvbXBvbmVudE1hbmFnZXIuY2xlYW51cCgpO1xyXG5cclxuXHRcdHRoaXMudW5sb2FkKCk7IC8vIFRoaXMgY2FsbHNyZW1vdmVDaGlsZCBvbiBhbGwgZGlyZWN0IGNoaWxkcmVuIGF1dG9tYXRpY2FsbHlcclxuXHRcdGlmICh0aGlzLnJvb3RDb250YWluZXJFbCkge1xyXG5cdFx0XHR0aGlzLnJvb3RDb250YWluZXJFbC5lbXB0eSgpO1xyXG5cdFx0XHR0aGlzLnJvb3RDb250YWluZXJFbC5kZXRhY2goKTtcclxuXHRcdH1cclxuXHRcdGNvbnNvbGUubG9nKFwiVGFza1NwZWNpZmljVmlldyBjbG9zZWRcIik7XHJcblx0fVxyXG5cclxuXHRvblNldHRpbmdzVXBkYXRlKCkge1xyXG5cdFx0Y29uc29sZS5sb2coXCJUYXNrU3BlY2lmaWNWaWV3IHJlY2VpdmVkIHNldHRpbmdzIHVwZGF0ZSBub3RpZmljYXRpb24uXCIpO1xyXG5cdFx0Ly8gTm8gc2lkZWJhciB0byB1cGRhdGVcclxuXHRcdC8vIFJlLXRyaWdnZXIgdmlldyB1cGRhdGUgdG8gcmVmbGVjdCBwb3RlbnRpYWwgc2V0dGluZyBjaGFuZ2VzIChlLmcuLCBmaWx0ZXJzLCBzdGF0dXMgbWFya3MpXHJcblx0XHR0aGlzLnRyaWdnZXJWaWV3VXBkYXRlKCk7XHJcblx0XHR0aGlzLnVwZGF0ZUhlYWRlckRpc3BsYXkoKTsgLy8gVXBkYXRlIGljb24vdGl0bGUgaWYgY2hhbmdlZFxyXG5cdH1cclxuXHJcblx0Ly8gTWV0aG9kIHRvIGhhbmRsZSBzdGF0dXMgdXBkYXRlcyBvcmlnaW5hdGluZyBmcm9tIEthbmJhbiBkcmFnLWFuZC1kcm9wXHJcblx0cHJpdmF0ZSBoYW5kbGVLYW5iYW5UYXNrU3RhdHVzVXBkYXRlID0gYXN5bmMgKFxyXG5cdFx0dGFza0lkOiBzdHJpbmcsXHJcblx0XHRuZXdTdGF0dXNNYXJrOiBzdHJpbmdcclxuXHQpID0+IHtcclxuXHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRgVGFza1NwZWNpZmljVmlldyBoYW5kbGluZyBLYW5iYW4gc3RhdHVzIHVwZGF0ZSByZXF1ZXN0IGZvciAke3Rhc2tJZH0gdG8gbWFyayAke25ld1N0YXR1c01hcmt9YFxyXG5cdFx0KTtcclxuXHRcdGNvbnN0IHRhc2tUb1VwZGF0ZSA9IHRoaXMudGFza3MuZmluZCgodCkgPT4gdC5pZCA9PT0gdGFza0lkKTtcclxuXHJcblx0XHRpZiAodGFza1RvVXBkYXRlKSB7XHJcblx0XHRcdGNvbnN0IGlzQ29tcGxldGVkID1cclxuXHRcdFx0XHRuZXdTdGF0dXNNYXJrLnRvTG93ZXJDYXNlKCkgPT09XHJcblx0XHRcdFx0KHRoaXMucGx1Z2luLnNldHRpbmdzLnRhc2tTdGF0dXNlcy5jb21wbGV0ZWQgfHwgXCJ4XCIpXHJcblx0XHRcdFx0XHQuc3BsaXQoXCJ8XCIpWzBdXHJcblx0XHRcdFx0XHQudG9Mb3dlckNhc2UoKTtcclxuXHRcdFx0Y29uc3QgY29tcGxldGVkRGF0ZSA9IGlzQ29tcGxldGVkID8gRGF0ZS5ub3coKSA6IHVuZGVmaW5lZDtcclxuXHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHR0YXNrVG9VcGRhdGUuc3RhdHVzICE9PSBuZXdTdGF0dXNNYXJrIHx8XHJcblx0XHRcdFx0dGFza1RvVXBkYXRlLmNvbXBsZXRlZCAhPT0gaXNDb21wbGV0ZWRcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdC8vIOWIm+W7uuabtOaWsOeahOS7u+WKoeWvueixoe+8jOWwhiBjb21wbGV0ZWREYXRlIOiuvue9ruWIsCBtZXRhZGF0YSDkuK1cclxuXHRcdFx0XHRcdGNvbnN0IHVwZGF0ZWRUYXNrRGF0YSA9IHtcclxuXHRcdFx0XHRcdFx0Li4udGFza1RvVXBkYXRlLFxyXG5cdFx0XHRcdFx0XHRzdGF0dXM6IG5ld1N0YXR1c01hcmssXHJcblx0XHRcdFx0XHRcdGNvbXBsZXRlZDogaXNDb21wbGV0ZWQsXHJcblx0XHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRcdC8vIOehruS/nSBtZXRhZGF0YSDlrZjlnKjlubborr7nva4gY29tcGxldGVkRGF0ZVxyXG5cdFx0XHRcdFx0aWYgKHVwZGF0ZWRUYXNrRGF0YS5tZXRhZGF0YSkge1xyXG5cdFx0XHRcdFx0XHR1cGRhdGVkVGFza0RhdGEubWV0YWRhdGEuY29tcGxldGVkRGF0ZSA9IGNvbXBsZXRlZERhdGU7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gVXNlIHVwZGF0ZVRhc2sgdG8gZW5zdXJlIGNvbnNpc3RlbmN5IGFuZCBVSSB1cGRhdGVzXHJcblx0XHRcdFx0XHRhd2FpdCB0aGlzLnVwZGF0ZVRhc2sodGFza1RvVXBkYXRlLCB1cGRhdGVkVGFza0RhdGEpO1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcdGBUYXNrICR7dGFza0lkfSBzdGF0dXMgdXBkYXRlIHByb2Nlc3NlZCBieSBUYXNrU3BlY2lmaWNWaWV3LmBcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXHJcblx0XHRcdFx0XHRcdGBUYXNrU3BlY2lmaWNWaWV3IGZhaWxlZCB0byB1cGRhdGUgdGFzayBzdGF0dXMgZnJvbSBLYW5iYW4gY2FsbGJhY2sgZm9yIHRhc2sgJHt0YXNrSWR9OmAsXHJcblx0XHRcdFx0XHRcdGVycm9yXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdGBUYXNrICR7dGFza0lkfSBzdGF0dXMgKCR7bmV3U3RhdHVzTWFya30pIGFscmVhZHkgbWF0Y2hlcywgbm8gdXBkYXRlIG5lZWRlZC5gXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdGBUYXNrU3BlY2lmaWNWaWV3IGNvdWxkIG5vdCBmaW5kIHRhc2sgd2l0aCBJRCAke3Rhc2tJZH0gZm9yIEthbmJhbiBzdGF0dXMgdXBkYXRlLmBcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHQvLyDmt7vliqDph43nva7nrZvpgInlmajnmoTmlrnms5VcclxuXHRwdWJsaWMgcmVzZXRDdXJyZW50RmlsdGVyKCkge1xyXG5cdFx0Y29uc29sZS5sb2coXCLph43nva4gVGFza1NwZWNpZmljVmlldyDlrp7ml7bnrZvpgInlmahcIik7XHJcblx0XHR0aGlzLmxpdmVGaWx0ZXJTdGF0ZSA9IG51bGw7XHJcblx0XHR0aGlzLmN1cnJlbnRGaWx0ZXJTdGF0ZSA9IG51bGw7XHJcblx0XHR0aGlzLmFwcC5zYXZlTG9jYWxTdG9yYWdlKFxyXG5cdFx0XHRgdGFzay1nZW5pdXMtdmlldy1maWx0ZXItJHt0aGlzLmxlYWYuaWR9YCxcclxuXHRcdFx0bnVsbFxyXG5cdFx0KTtcclxuXHRcdHRoaXMuYXBwbHlDdXJyZW50RmlsdGVyKCk7XHJcblx0XHR0aGlzLnVwZGF0ZUFjdGlvbkJ1dHRvbnMoKTtcclxuXHR9XHJcbn1cclxuIl19