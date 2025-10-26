import { __awaiter } from "tslib";
import { ItemView, TFile, setIcon, ExtraButtonComponent, ButtonComponent, Menu, Scope, Notice, Platform, debounce,
// FrontmatterCache,
 } from "obsidian";
import { SidebarComponent } from "@/components/features/task/view/sidebar";
import { ContentComponent } from "@/components/features/task/view/content";
import { ForecastComponent } from "@/components/features/task/view/forecast";
import { TagsComponent } from "@/components/features/task/view/tags";
import { ProjectsComponent } from "@/components/features/task/view/projects";
import { ReviewComponent } from "@/components/features/task/view/review";
import { TaskDetailsComponent, createTaskCheckbox, } from "@/components/features/task/view/details";
import "../styles/view.css";
import { QuickCaptureModal } from "@/components/features/quick-capture/modals/QuickCaptureModalWithSwitch";
import { t } from "@/translations/helper";
import { getViewSettingOrDefault, } from "@/common/setting-definition";
import { filterTasks } from "@/utils/task/task-filter-utils";
import { CalendarComponent, } from "@/components/features/calendar";
import { KanbanComponent } from "@/components/features/kanban/kanban";
import { GanttComponent } from "@/components/features/gantt/gantt";
import { TaskPropertyTwoColumnView } from "@/components/features/task/view/TaskPropertyTwoColumnView";
import { ViewComponentManager } from "@/components/ui";
import { Habit } from "@/components/features/habit/habit";
import { ConfirmModal } from "@/components/ui";
import { ViewTaskFilterPopover, ViewTaskFilterModal, } from "@/components/features/task/filter";
import { FilterConfigModal } from "@/components/features/task/filter/FilterConfigModal";
import { isDataflowEnabled } from "@/dataflow/createDataflow";
import { Events, on } from "@/dataflow/events/Events";
export const TASK_VIEW_TYPE = "task-genius-view";
export class TaskView extends ItemView {
    constructor(leaf, plugin) {
        var _a;
        super(leaf);
        this.plugin = plugin;
        // Custom view components by view ID
        this.twoColumnViewComponents = new Map();
        // UI state management
        this.isSidebarCollapsed = false;
        this.isDetailsVisible = false;
        this.currentViewId = "inbox";
        this.currentSelectedTaskId = null;
        this.currentSelectedTaskDOM = null;
        this.lastToggleTimestamp = 0;
        // Data management
        this.tasks = [];
        this.currentFilterState = null;
        this.liveFilterState = null; // 新增：专门跟踪实时过滤器状态
        // 创建防抖的过滤器应用函数
        this.debouncedApplyFilter = debounce(() => {
            this.applyCurrentFilter();
        }, 400); // 增加延迟到 400ms 减少频繁更新
        // Method to handle status updates originating from Kanban drag-and-drop
        this.handleKanbanTaskStatusUpdate = (taskId, newStatusMark) => __awaiter(this, void 0, void 0, function* () {
            console.log(`TaskView handling Kanban status update request for ${taskId} to mark ${newStatusMark}`);
            const taskToUpdate = this.tasks.find((t) => t.id === taskId);
            if (taskToUpdate) {
                const isCompleted = this.isCompletedMark(newStatusMark);
                const completedDate = isCompleted ? Date.now() : undefined;
                if (taskToUpdate.status !== newStatusMark ||
                    taskToUpdate.completed !== isCompleted) {
                    try {
                        yield this.updateTask(taskToUpdate, Object.assign(Object.assign({}, taskToUpdate), { status: newStatusMark, completed: isCompleted, metadata: Object.assign(Object.assign({}, taskToUpdate.metadata), { completedDate: completedDate }) }));
                        console.log(`Task ${taskId} status update processed by TaskView.`);
                    }
                    catch (error) {
                        console.error(`TaskView failed to update task status from Kanban callback for task ${taskId}:`, error);
                    }
                }
                else {
                    console.log(`Task ${taskId} status (${newStatusMark}) already matches, no update needed.`);
                }
            }
            else {
                console.warn(`TaskView could not find task with ID ${taskId} for Kanban status update.`);
            }
        });
        this.tasks = this.plugin.preloadedTasks || [];
        this.scope = new Scope(this.app.scope);
        (_a = this.scope) === null || _a === void 0 ? void 0 : _a.register(null, "escape", (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    }
    getViewType() {
        return TASK_VIEW_TYPE;
    }
    getDisplayText() {
        const currentViewConfig = getViewSettingOrDefault(this.plugin, this.currentViewId);
        return currentViewConfig.name;
    }
    getIcon() {
        const currentViewConfig = getViewSettingOrDefault(this.plugin, this.currentViewId);
        return currentViewConfig.icon;
    }
    onOpen() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            this.contentEl.toggleClass("task-genius-view", true);
            this.rootContainerEl = this.contentEl.createDiv({
                cls: "task-genius-container",
            });
            // Add debounced view update to prevent rapid successive refreshes
            const debouncedViewUpdate = debounce(() => __awaiter(this, void 0, void 0, function* () {
                // For external/editor updates, force a view refresh to avoid false "unchanged" skips
                yield this.loadTasks(false, true); // skip internal triggerViewUpdate
                this.switchView(this.currentViewId, undefined, true); // forceRefresh
            }), 500); // 增加到 500ms 防抖延迟，避免频繁更新导致中间状态显示
            // 1. 首先注册事件监听器，确保不会错过任何更新
            if (isDataflowEnabled(this.plugin) &&
                this.plugin.dataflowOrchestrator) {
                this.registerEvent(on(this.app, Events.CACHE_READY, () => __awaiter(this, void 0, void 0, function* () {
                    // 冷启动就绪，从快照加载，并更新视图
                    yield this.loadTasksFast(false);
                })));
                this.registerEvent(on(this.app, Events.TASK_CACHE_UPDATED, debouncedViewUpdate));
            }
            else {
                // Legacy: 兼容旧事件
                this.registerEvent(this.app.workspace.on("task-genius:task-cache-updated", debouncedViewUpdate));
            }
            // 监听过滤器变更事件
            this.registerEvent(this.app.workspace.on("task-genius:filter-changed", (filterState, leafId) => {
                // 只有来自实时过滤器组件的变更才更新liveFilterState
                // 排除基础过滤器（ViewConfigModal）和全局过滤器的变更
                if (leafId &&
                    !leafId.startsWith("view-config-") &&
                    leafId !== "global-filter") {
                    // 这是来自实时过滤器组件的变更
                    this.liveFilterState = filterState;
                    this.currentFilterState = filterState;
                    console.log("更新实时过滤器状态");
                }
                else if (!leafId) {
                    // 没有leafId的情况，也视为实时过滤器变更
                    this.liveFilterState = filterState;
                    this.currentFilterState = filterState;
                    console.log("更新实时过滤器状态（无leafId）");
                }
                // 使用防抖函数应用过滤器，避免频繁更新
                this.debouncedApplyFilter();
            }));
            // 监听视图配置变更事件（仅刷新侧边栏与当前视图可见性）
            this.registerEvent(this.app.workspace.on("task-genius:view-config-changed", (payload) => {
                var _a, _b;
                try {
                    // 先重绘侧边栏项目
                    if (this.sidebarComponent &&
                        typeof this.sidebarComponent.renderSidebarItems ===
                            "function") {
                        this.sidebarComponent.renderSidebarItems();
                    }
                }
                catch (e) {
                    console.warn("Failed to render sidebar items on view-config-changed:", e);
                }
                // If the edited view is the current one (e.g., type/layout changed), force refresh the main content
                if ((payload === null || payload === void 0 ? void 0 : payload.viewId) &&
                    payload.viewId === this.currentViewId) {
                    this.switchView(this.currentViewId, undefined, true);
                }
                // 若当前视图被设为不可见，则切换到第一个可见视图（不强制刷新内容）
                const currentCfg = this.plugin.settings.viewConfiguration.find((v) => v.id === this.currentViewId);
                if (!(currentCfg === null || currentCfg === void 0 ? void 0 : currentCfg.visible)) {
                    const firstVisible = (_a = this.plugin.settings.viewConfiguration.find((v) => v.visible)) === null || _a === void 0 ? void 0 : _a.id;
                    if (firstVisible &&
                        firstVisible !== this.currentViewId) {
                        this.currentViewId = firstVisible;
                        (_b = this.sidebarComponent) === null || _b === void 0 ? void 0 : _b.setViewMode(this.currentViewId);
                        // Ensure main content switches to the new visible view
                        this.switchView(this.currentViewId, undefined, true);
                    }
                }
            }));
            // 2. 加载缓存的实时过滤状态
            const savedFilterState = this.app.loadLocalStorage("task-genius-view-filter");
            console.log("savedFilterState", savedFilterState);
            if (savedFilterState &&
                typeof savedFilterState.rootCondition === "string" &&
                Array.isArray(savedFilterState.filterGroups)) {
                console.log("Saved filter state", savedFilterState);
                this.liveFilterState = savedFilterState;
                this.currentFilterState = savedFilterState;
            }
            else {
                console.log("No saved filter state or invalid state");
                this.liveFilterState = null;
                this.currentFilterState = null;
            }
            // 3. 初始化组件（但先不传入数据）
            this.initializeComponents();
            // 4. 获取初始视图ID
            const savedViewId = this.app.loadLocalStorage("task-genius:view-mode");
            const initialViewId = this.plugin.settings.viewConfiguration.find((v) => v.id === savedViewId && v.visible)
                ? savedViewId
                : ((_a = this.plugin.settings.viewConfiguration.find((v) => v.visible)) === null || _a === void 0 ? void 0 : _a.id) || "inbox";
            this.currentViewId = initialViewId;
            this.sidebarComponent.setViewMode(this.currentViewId);
            // 5. 快速加载缓存数据以立即显示 UI
            yield this.loadTasksFast(false); // Don't skip view update - we need the initial render
            // 6. Only switch view if we have tasks to display
            if (this.tasks.length > 0) {
                this.switchView(this.currentViewId);
            }
            else {
                // If no tasks loaded yet, wait for background sync before rendering
                console.log("No cached tasks found, waiting for background sync...");
                yield this.loadTasksWithSyncInBackground();
                this.switchView(this.currentViewId);
            }
            console.log("currentFilterState", this.currentFilterState);
            // 7. 在组件初始化完成后应用筛选器状态
            if (this.currentFilterState) {
                console.log("应用保存的筛选器状态");
                this.applyCurrentFilter();
            }
            this.toggleDetailsVisibility(false);
            this.createTaskMark();
            this.createActionButtons();
            this.leaf.tabHeaderStatusContainerEl.empty();
            this.leaf.tabHeaderEl.toggleClass("task-genius-tab-header", true);
            this.tabActionButton = this.leaf.tabHeaderStatusContainerEl.createEl("span", {
                cls: "task-genius-action-btn",
            }, (el) => {
                new ExtraButtonComponent(el)
                    .setIcon("notebook-pen")
                    .setTooltip(t("Capture"))
                    .onClick(() => {
                    const modal = new QuickCaptureModal(this.plugin.app, this.plugin, {}, true);
                    modal.open();
                });
            });
            this.register(() => {
                this.tabActionButton.detach();
            });
            this.checkAndCollapseSidebar();
            // 添加视图切换命令
            this.plugin.settings.viewConfiguration.forEach((view) => {
                this.plugin.addCommand({
                    id: `switch-view-${view.id}`,
                    name: view.name,
                    checkCallback: (checking) => {
                        if (checking) {
                            return true;
                        }
                        const existingLeaves = this.plugin.app.workspace.getLeavesOfType(TASK_VIEW_TYPE);
                        if (existingLeaves.length > 0) {
                            // Focus the existing view
                            this.plugin.app.workspace.revealLeaf(existingLeaves[0]);
                            const currentView = existingLeaves[0].view;
                            currentView.switchView(view.id);
                        }
                        else {
                            // If no view is active, activate one and then switch
                            this.plugin.activateTaskView().then(() => {
                                const newView = this.plugin.app.workspace.getActiveViewOfType(TaskView);
                                if (newView) {
                                    newView.switchView(view.id);
                                }
                            });
                        }
                        return true;
                    },
                });
            });
            // 确保重置筛选器按钮正确显示
            this.updateActionButtons();
        });
    }
    onResize() {
        this.checkAndCollapseSidebar();
    }
    checkAndCollapseSidebar() {
        if (this.leaf.width === 0 || this.leaf.height === 0) {
            return;
        }
        if (this.leaf.width < 768) {
            this.isSidebarCollapsed = true;
            this.sidebarComponent.setCollapsed(true);
        }
        else {
        }
    }
    initializeComponents() {
        this.sidebarComponent = new SidebarComponent(this.rootContainerEl, this.plugin);
        this.addChild(this.sidebarComponent);
        this.sidebarComponent.load();
        this.createSidebarToggle();
        this.contentComponent = new ContentComponent(this.rootContainerEl, this.plugin.app, this.plugin, {
            onTaskSelected: (task) => {
                this.handleTaskSelection(task);
            },
            onTaskCompleted: (task) => {
                this.toggleTaskCompletion(task);
            },
            onTaskUpdate: (originalTask, updatedTask) => __awaiter(this, void 0, void 0, function* () {
                console.log("TaskView onTaskUpdate", originalTask.content, updatedTask.content);
                yield this.handleTaskUpdate(originalTask, updatedTask);
            }),
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
                console.log("TaskView onTaskUpdate", originalTask.content, updatedTask.content);
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
            onTaskUpdate: (originalTask, updatedTask) => __awaiter(this, void 0, void 0, function* () {
                yield this.handleTaskUpdate(originalTask, updatedTask);
            }),
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
            onTaskUpdate: (originalTask, updatedTask) => __awaiter(this, void 0, void 0, function* () {
                yield this.handleTaskUpdate(originalTask, updatedTask);
            }),
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
            onTaskUpdate: (originalTask, updatedTask) => __awaiter(this, void 0, void 0, function* () {
                yield this.handleTaskUpdate(originalTask, updatedTask);
            }),
            onTaskContextMenu: (event, task) => {
                this.handleTaskContextMenu(event, task);
            },
        });
        this.addChild(this.reviewComponent);
        this.reviewComponent.load();
        this.reviewComponent.containerEl.hide();
        this.calendarComponent = new CalendarComponent(this.plugin.app, this.plugin, this.rootContainerEl, this.tasks, {
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
        this.kanbanComponent = new KanbanComponent(this.app, this.plugin, this.rootContainerEl, this.tasks, {
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
        this.habitComponent = new Habit(this.plugin, this.rootContainerEl);
        this.addChild(this.habitComponent);
        this.habitComponent.containerEl.hide();
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
            onTaskUpdate: this.handleTaskUpdate.bind(this),
        });
        this.addChild(this.viewComponentManager);
        this.setupComponentEvents();
    }
    createSidebarToggle() {
        var _a;
        const toggleContainer = (_a = this.headerEl.find(".view-header-nav-buttons")) === null || _a === void 0 ? void 0 : _a.createDiv({
            cls: "panel-toggle-container",
        });
        if (!toggleContainer) {
            console.error("Could not find .view-header-nav-buttons to add sidebar toggle.");
            return;
        }
        this.sidebarToggleBtn = toggleContainer.createDiv({
            cls: "panel-toggle-btn",
        });
        new ButtonComponent(this.sidebarToggleBtn)
            .setIcon("panel-left-dashed")
            .setTooltip(t("Toggle Sidebar"))
            .setClass("clickable-icon")
            .onClick(() => {
            this.toggleSidebar();
        });
    }
    createTaskMark() {
        this.titleEl.setText(t("{{num}} Tasks", {
            interpolation: {
                num: this.tasks.length,
            },
        }));
    }
    createActionButtons() {
        this.detailsToggleBtn = this.addAction("panel-right-dashed", t("Details"), () => {
            this.toggleDetailsVisibility(!this.isDetailsVisible);
        });
        this.detailsToggleBtn.toggleClass("panel-toggle-btn", true);
        this.detailsToggleBtn.toggleClass("is-active", this.isDetailsVisible);
        this.addAction("notebook-pen", t("Capture"), () => {
            const modal = new QuickCaptureModal(this.plugin.app, this.plugin, {}, true);
            modal.open();
        });
        this.addAction("filter", t("Filter"), (e) => {
            if (Platform.isDesktop) {
                const popover = new ViewTaskFilterPopover(this.plugin.app, undefined, this.plugin);
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
        // 重置筛选器按钮的逻辑移到updateActionButtons方法中
        this.updateActionButtons();
    }
    // 添加应用当前过滤器状态的方法
    applyCurrentFilter() {
        console.log("应用当前过滤状态:", this.liveFilterState ? "有实时筛选器" : "无实时筛选器", this.currentFilterState ? "有过滤器" : "无过滤器");
        // 通过triggerViewUpdate重新加载任务
        this.triggerViewUpdate();
    }
    onPaneMenu(menu) {
        // Add saved filters section
        const savedConfigs = this.plugin.settings.filterConfig.savedConfigs;
        if (savedConfigs && savedConfigs.length > 0) {
            menu.addItem((item) => {
                item.setTitle(t("Saved Filters"));
                item.setIcon("filter");
                const submenu = item.setSubmenu();
                savedConfigs.forEach((config) => {
                    submenu.addItem((subItem) => {
                        subItem.setTitle(config.name);
                        subItem.setIcon("search");
                        if (config.description) {
                            subItem.setSection(config.description);
                        }
                        subItem.onClick(() => {
                            this.applySavedFilter(config);
                        });
                    });
                });
                submenu.addSeparator();
                submenu.addItem((subItem) => {
                    subItem.setTitle(t("Manage Saved Filters"));
                    subItem.setIcon("settings");
                    subItem.onClick(() => {
                        const modal = new FilterConfigModal(this.app, this.plugin, "load", undefined, undefined, (config) => {
                            this.applySavedFilter(config);
                        });
                        modal.open();
                    });
                });
            });
            menu.addSeparator();
        }
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
        menu.addItem((item) => {
            item.setTitle(t("Settings"));
            item.setIcon("gear");
            item.onClick(() => {
                this.app.setting.open();
                this.app.setting.openTabById(this.plugin.manifest.id);
                this.plugin.settingTab.openTab("view-settings");
            });
        })
            .addSeparator()
            .addItem((item) => {
            item.setTitle(t("Reindex"));
            item.setIcon("rotate-ccw");
            item.onClick(() => __awaiter(this, void 0, void 0, function* () {
                new ConfirmModal(this.plugin, {
                    title: t("Reindex"),
                    message: t("Are you sure you want to force reindex all tasks?"),
                    confirmText: t("Reindex"),
                    cancelText: t("Cancel"),
                    onConfirm: (confirmed) => __awaiter(this, void 0, void 0, function* () {
                        if (!confirmed)
                            return;
                        try {
                            if (this.plugin.dataflowOrchestrator) {
                                yield this.plugin.dataflowOrchestrator.rebuild();
                            }
                            else {
                                throw new Error("Dataflow orchestrator not available");
                            }
                        }
                        catch (error) {
                            console.error("Failed to force reindex tasks:", error);
                            new Notice(t("Failed to force reindex tasks"));
                        }
                    }),
                }).open();
            }));
        });
        return menu;
    }
    toggleSidebar() {
        this.isSidebarCollapsed = !this.isSidebarCollapsed;
        this.rootContainerEl.toggleClass("sidebar-collapsed", this.isSidebarCollapsed);
        this.sidebarComponent.setCollapsed(this.isSidebarCollapsed);
    }
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
        this.detailsComponent.onTaskToggleComplete = (task) => this.toggleTaskCompletion(task);
        // Details component handlers
        this.detailsComponent.onTaskEdit = (task) => this.editTask(task);
        this.detailsComponent.onTaskUpdate = (originalTask, updatedTask) => __awaiter(this, void 0, void 0, function* () {
            console.log("triggered by detailsComponent", originalTask, updatedTask);
            yield this.updateTask(originalTask, updatedTask);
        });
        this.detailsComponent.toggleDetailsVisibility = (visible) => {
            this.toggleDetailsVisibility(visible);
        };
        // Sidebar component handlers
        this.sidebarComponent.onProjectSelected = (project) => {
            this.switchView("projects", project);
        };
        this.sidebarComponent.onViewModeChanged = (viewId) => {
            this.switchView(viewId);
        };
    }
    switchView(viewId, project, forceRefresh = false) {
        var _a, _b;
        this.currentViewId = viewId;
        console.log("[TaskView] Switching view to:", viewId, "Project:", project, "ForceRefresh:", forceRefresh);
        // Update sidebar to reflect current view
        this.sidebarComponent.setViewMode(viewId);
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
        this.habitComponent.containerEl.hide();
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
                        targetComponent = this.habitComponent;
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
                console.log("tasks", this.tasks);
                let filteredTasks = filterTasks(this.tasks, viewId, this.plugin, filterOptions);
                // Filter out badge tasks for forecast view - they should only appear in event view
                if (viewId === "forecast") {
                    filteredTasks = filteredTasks.filter((task) => !task.badge);
                }
                console.log("[TaskView] Calling setTasks with", filteredTasks.length, "filtered tasks, forceRefresh:", forceRefresh);
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
        this.app.saveLocalStorage("task-genius:view-mode", viewId);
        this.updateHeaderDisplay();
        // Only clear task selection if we're changing views, not when refreshing the same view
        // This preserves the details panel when updating task status
        if (this.currentSelectedTaskId) {
            // Re-select the current task to maintain details panel visibility
            const currentTask = this.tasks.find((t) => t.id === this.currentSelectedTaskId);
            if (currentTask) {
                this.detailsComponent.showTaskDetails(currentTask);
            }
            else {
                // Task no longer exists or is filtered out
                this.handleTaskSelection(null);
            }
        }
        if (this.leaf.tabHeaderInnerIconEl) {
            setIcon(this.leaf.tabHeaderInnerIconEl, this.getIcon());
            this.leaf.tabHeaderInnerTitleEl.setText(this.getDisplayText());
            this.titleEl.setText(this.getDisplayText());
        }
    }
    updateHeaderDisplay() {
        const config = getViewSettingOrDefault(this.plugin, this.currentViewId);
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
                    item.onClick(() => __awaiter(this, void 0, void 0, function* () {
                        console.log("status", status, mark);
                        const willComplete = this.isCompletedMark(mark);
                        const updatedTask = Object.assign(Object.assign({}, task), { status: mark, completed: willComplete });
                        if (!task.completed && willComplete) {
                            updatedTask.metadata.completedDate = Date.now();
                        }
                        else if (task.completed && !willComplete) {
                            updatedTask.metadata.completedDate = undefined;
                        }
                        yield this.updateTask(task, updatedTask);
                    }));
                });
            }
        })
            .addSeparator()
            .addItem((item) => {
            item.setTitle(t("Edit"));
            item.setIcon("pencil");
            item.onClick(() => {
                this.handleTaskSelection(task);
            });
        })
            .addItem((item) => {
            item.setTitle(t("Edit in File"));
            item.setIcon("pencil");
            item.onClick(() => {
                this.editTask(task);
            });
        })
            .addSeparator()
            .addItem((item) => {
            item.setTitle(t("Delete Task"));
            item.setIcon("trash");
            item.onClick(() => {
                this.confirmAndDeleteTask(event, task);
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
            if (timeSinceLastToggle > 150) {
                this.toggleDetailsVisibility(!this.isDetailsVisible);
                this.lastToggleTimestamp = now;
            }
        }
        else {
            this.toggleDetailsVisibility(false);
            this.currentSelectedTaskId = null;
        }
    }
    loadTasks(forceSync = false, skipViewUpdate = false) {
        return __awaiter(this, void 0, void 0, function* () {
            // Only use dataflow - TaskManager is deprecated
            if (!this.plugin.dataflowOrchestrator) {
                console.warn("[TaskView] Dataflow orchestrator not available, waiting for initialization...");
                this.tasks = [];
            }
            else {
                try {
                    console.log("[TaskView] Loading tasks from dataflow orchestrator...");
                    const queryAPI = this.plugin.dataflowOrchestrator.getQueryAPI();
                    this.tasks = yield queryAPI.getAllTasks();
                    console.log(`[TaskView] Loaded ${this.tasks.length} tasks from dataflow`);
                }
                catch (error) {
                    console.error("[TaskView] Error loading tasks from dataflow:", error);
                    this.tasks = [];
                }
            }
            if (!skipViewUpdate) {
                yield this.triggerViewUpdate();
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
                console.warn("[TaskView] Dataflow orchestrator not available for fast load");
                this.tasks = [];
            }
            else {
                try {
                    console.log("[TaskView] Loading tasks fast from dataflow orchestrator...");
                    const queryAPI = this.plugin.dataflowOrchestrator.getQueryAPI();
                    // For fast loading, use regular getAllTasks (it should be cached)
                    this.tasks = yield queryAPI.getAllTasks();
                    console.log(`[TaskView] Loaded ${this.tasks.length} tasks (fast from dataflow)`);
                }
                catch (error) {
                    console.error("[TaskView] Error loading tasks fast from dataflow:", error);
                    this.tasks = [];
                }
            }
            if (!skipViewUpdate) {
                yield this.triggerViewUpdate();
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
                    console.warn("[TaskView] QueryAPI not available");
                    return;
                }
                const tasks = yield queryAPI.getAllTasks();
                if (tasks.length !== this.tasks.length || tasks.length === 0) {
                    this.tasks = tasks;
                    console.log(`TaskView updated with ${this.tasks.length} tasks (dataflow sync)`);
                    // Don't trigger view update here as it will be handled by events
                }
            }
            catch (error) {
                console.warn("Background task sync failed:", error);
            }
        });
    }
    triggerViewUpdate() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            // 始终先刷新侧边栏项目，以反映可见性/顺序的变更
            try {
                if (this.sidebarComponent &&
                    typeof this.sidebarComponent.renderSidebarItems === "function") {
                    this.sidebarComponent.renderSidebarItems();
                }
            }
            catch (e) {
                console.warn("Failed to refresh sidebar items:", e);
            }
            // 如果当前视图已被设置为隐藏，则切换到第一个可见视图
            const currentCfg = this.plugin.settings.viewConfiguration.find((v) => v.id === this.currentViewId);
            if (!(currentCfg === null || currentCfg === void 0 ? void 0 : currentCfg.visible)) {
                const firstVisible = (_a = this.plugin.settings.viewConfiguration.find((v) => v.visible)) === null || _a === void 0 ? void 0 : _a.id;
                if (firstVisible && firstVisible !== this.currentViewId) {
                    this.currentViewId = firstVisible;
                    (_b = this.sidebarComponent) === null || _b === void 0 ? void 0 : _b.setViewMode(this.currentViewId);
                }
            }
            // 直接使用（可能已更新的）当前视图重新加载
            this.switchView(this.currentViewId);
            // 更新操作按钮，确保重置筛选器按钮根据最新状态显示
            this.updateActionButtons();
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
    isCompletedMark(mark) {
        var _a;
        if (!mark)
            return false;
        try {
            const lower = mark.toLowerCase();
            const completedCfg = String(((_a = this.plugin.settings.taskStatuses) === null || _a === void 0 ? void 0 : _a.completed) || "x");
            const completedSet = completedCfg
                .split("|")
                .map((s) => s.trim().toLowerCase())
                .filter(Boolean);
            if (completedSet.includes(lower))
                return true;
            const all = this.plugin.settings.taskStatuses;
            if (all) {
                for (const [type, symbols] of Object.entries(all)) {
                    const set = String(symbols)
                        .split("|")
                        .map((s) => s.trim().toLowerCase())
                        .filter(Boolean);
                    if (set.includes(lower)) {
                        return type.toLowerCase() === "completed";
                    }
                }
            }
        }
        catch (_) {
        }
        return false;
    }
    toggleTaskCompletion(task) {
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
                if (this.isCompletedMark(updatedTask.status)) {
                    updatedTask.status = notStartedMark;
                }
            }
            // Use updateTask instead of directly calling taskManager to ensure view refresh
            yield this.updateTask(task, updatedTask);
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
                console.log("Extracted changes:", updates);
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
                this.switchView(this.currentViewId, undefined, true);
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
                console.log("Extracted changes:", updates);
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
                this.switchView(this.currentViewId, undefined, true);
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
            if (!(file instanceof TFile))
                return;
            const leaf = this.app.workspace.getLeaf(false);
            yield leaf.openFile(file, {
                eState: {
                    line: task.line,
                },
            });
        });
    }
    confirmAndDeleteTask(event, task) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if the task has children
            const hasChildren = task.metadata &&
                task.metadata.children &&
                task.metadata.children.length > 0;
            if (hasChildren) {
                // Show confirmation dialog with options for tasks with children
                const childrenCount = task.metadata.children.length;
                // Create a custom modal for three-button scenario
                const menu = new Menu();
                menu.addItem((item) => {
                    item.setTitle(t("Delete task only"));
                    item.setIcon("trash");
                    item.onClick(() => {
                        this.deleteTask(task, false);
                    });
                });
                menu.addItem((item) => {
                    item.setTitle(t("Delete task and all subtasks"));
                    item.setIcon("trash-2");
                    item.onClick(() => {
                        this.deleteTask(task, true);
                    });
                });
                menu.addSeparator();
                menu.addItem((item) => {
                    item.setTitle(t("Cancel"));
                    item.onClick(() => {
                        // Do nothing
                    });
                });
                // Show menu at current mouse position
                menu.showAtMouseEvent(event);
            }
            else {
                // No children, use simple confirmation
                const modal = new ConfirmModal(this.plugin, {
                    title: t("Delete Task"),
                    message: t("Are you sure you want to delete this task?"),
                    confirmText: t("Delete"),
                    cancelText: t("Cancel"),
                    onConfirm: (confirmed) => {
                        if (confirmed) {
                            this.deleteTask(task, false);
                        }
                    },
                });
                modal.open();
            }
        });
    }
    deleteTask(task, deleteChildren) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.plugin.writeAPI) {
                console.error("WriteAPI not available for deleteTask");
                new Notice(t("Failed to delete task"));
                return;
            }
            try {
                const result = yield this.plugin.writeAPI.deleteTask({
                    taskId: task.id,
                    deleteChildren: deleteChildren,
                });
                if (result.success) {
                    new Notice(t("Task deleted"));
                    // Remove task from local list
                    const index = this.tasks.findIndex((t) => t.id === task.id);
                    if (index !== -1) {
                        this.tasks = [...this.tasks];
                        this.tasks.splice(index, 1);
                        // If deleteChildren, also remove children from local list
                        if (deleteChildren && ((_a = task.metadata) === null || _a === void 0 ? void 0 : _a.children)) {
                            for (const childId of task.metadata.children) {
                                const childIndex = this.tasks.findIndex((t) => t.id === childId);
                                if (childIndex !== -1) {
                                    this.tasks.splice(childIndex, 1);
                                }
                            }
                        }
                    }
                    // Clear selection if deleted task was selected
                    if (this.currentSelectedTaskId === task.id) {
                        this.handleTaskSelection(null);
                    }
                    // Refresh current view
                    this.switchView(this.currentViewId, undefined, true);
                }
                else {
                    new Notice(t("Failed to delete task") +
                        ": " +
                        (result.error || "Unknown error"));
                }
            }
            catch (error) {
                console.error("Error deleting task:", error);
                new Notice(t("Failed to delete task") + ": " + error.message);
            }
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
            this.unload();
            this.rootContainerEl.empty();
            this.rootContainerEl.detach();
        });
    }
    onSettingsUpdate() {
        var _a;
        console.log("TaskView received settings update notification.");
        if (typeof this.sidebarComponent.renderSidebarItems === "function") {
            this.sidebarComponent.renderSidebarItems();
        }
        else {
            console.warn("TaskView: SidebarComponent does not have renderSidebarItems method.");
        }
        // 检查当前视图的类型是否发生变化（比如从两列切换到单列）
        const currentViewConfig = this.plugin.settings.viewConfiguration.find((v) => v.id === this.currentViewId);
        // 如果当前是两列视图但配置已改为非两列，需要销毁两列组件
        const currentTwoColumn = this.twoColumnViewComponents.get(this.currentViewId);
        if (currentTwoColumn &&
            ((_a = currentViewConfig === null || currentViewConfig === void 0 ? void 0 : currentViewConfig.specificConfig) === null || _a === void 0 ? void 0 : _a.viewType) !== "twocolumn") {
            // 销毁两列视图组件 - 使用 unload 方法来清理 Component
            currentTwoColumn.unload();
            this.twoColumnViewComponents.delete(this.currentViewId);
        }
        // 重新切换到当前视图以应用新配置
        this.switchView(this.currentViewId, undefined, true); // forceRefresh to apply new layout
        this.updateHeaderDisplay();
    }
    // 添加重置筛选器的方法
    resetCurrentFilter() {
        console.log("重置实时筛选器");
        this.liveFilterState = null;
        this.currentFilterState = null;
        this.app.saveLocalStorage("task-genius-view-filter", null);
        this.applyCurrentFilter();
        this.updateActionButtons();
    }
    // 应用保存的筛选器配置
    applySavedFilter(config) {
        console.log("应用保存的筛选器:", config.name);
        this.liveFilterState = JSON.parse(JSON.stringify(config.filterState));
        this.currentFilterState = JSON.parse(JSON.stringify(config.filterState));
        console.log("applySavedFilter", this.liveFilterState);
        this.app.saveLocalStorage("task-genius-view-filter", this.liveFilterState);
        this.applyCurrentFilter();
        this.updateActionButtons();
        new Notice(t("Filter applied: ") + config.name);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGFza1ZpZXcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJUYXNrVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUNOLFFBQVEsRUFFUixLQUFLLEVBRUwsT0FBTyxFQUNQLG9CQUFvQixFQUNwQixlQUFlLEVBQ2YsSUFBSSxFQUNKLEtBQUssRUFDTCxNQUFNLEVBQ04sUUFBUSxFQUNSLFFBQVE7QUFDUixvQkFBb0I7RUFDcEIsTUFBTSxVQUFVLENBQUM7QUFFbEIsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDN0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN6RSxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLGtCQUFrQixHQUNsQixNQUFNLHlDQUF5QyxDQUFDO0FBQ2pELE9BQU8sb0JBQW9CLENBQUM7QUFFNUIsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0VBQXdFLENBQUM7QUFDM0csT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzFDLE9BQU8sRUFDTix1QkFBdUIsR0FJdkIsTUFBTSw2QkFBNkIsQ0FBQztBQUNyQyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDN0QsT0FBTyxFQUNOLGlCQUFpQixHQUVqQixNQUFNLGdDQUFnQyxDQUFDO0FBQ3hDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUNBQW1DLENB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LENBQUM7SUFDakQsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcclxuXHRJdGVtVmlldyxcclxuXHRXb3Jrc3BhY2VMZWFmLFxyXG5cdFRGaWxlLFxyXG5cdFBsdWdpbixcclxuXHRzZXRJY29uLFxyXG5cdEV4dHJhQnV0dG9uQ29tcG9uZW50LFxyXG5cdEJ1dHRvbkNvbXBvbmVudCxcclxuXHRNZW51LFxyXG5cdFNjb3BlLFxyXG5cdE5vdGljZSxcclxuXHRQbGF0Zm9ybSxcclxuXHRkZWJvdW5jZSxcclxuXHQvLyBGcm9udG1hdHRlckNhY2hlLFxyXG59IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBUYXNrIH0gZnJvbSBcIkAvdHlwZXMvdGFza1wiO1xyXG5pbXBvcnQgeyBTaWRlYmFyQ29tcG9uZW50IH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy90YXNrL3ZpZXcvc2lkZWJhclwiO1xyXG5pbXBvcnQgeyBDb250ZW50Q29tcG9uZW50IH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy90YXNrL3ZpZXcvY29udGVudFwiO1xyXG5pbXBvcnQgeyBGb3JlY2FzdENvbXBvbmVudCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay92aWV3L2ZvcmVjYXN0XCI7XHJcbmltcG9ydCB7IFRhZ3NDb21wb25lbnQgfSBmcm9tIFwiQC9jb21wb25lbnRzL2ZlYXR1cmVzL3Rhc2svdmlldy90YWdzXCI7XHJcbmltcG9ydCB7IFByb2plY3RzQ29tcG9uZW50IH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy90YXNrL3ZpZXcvcHJvamVjdHNcIjtcclxuaW1wb3J0IHsgUmV2aWV3Q29tcG9uZW50IH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy90YXNrL3ZpZXcvcmV2aWV3XCI7XHJcbmltcG9ydCB7XHJcblx0VGFza0RldGFpbHNDb21wb25lbnQsXHJcblx0Y3JlYXRlVGFza0NoZWNrYm94LFxyXG59IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay92aWV3L2RldGFpbHNcIjtcclxuaW1wb3J0IFwiLi4vc3R5bGVzL3ZpZXcuY3NzXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIi4uL2luZGV4XCI7XHJcbmltcG9ydCB7IFF1aWNrQ2FwdHVyZU1vZGFsIH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy9xdWljay1jYXB0dXJlL21vZGFscy9RdWlja0NhcHR1cmVNb2RhbFdpdGhTd2l0Y2hcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHtcclxuXHRnZXRWaWV3U2V0dGluZ09yRGVmYXVsdCxcclxuXHRWaWV3TW9kZSxcclxuXHRERUZBVUxUX1NFVFRJTkdTLFxyXG5cdFR3b0NvbHVtblNwZWNpZmljQ29uZmlnLFxyXG59IGZyb20gXCJAL2NvbW1vbi9zZXR0aW5nLWRlZmluaXRpb25cIjtcclxuaW1wb3J0IHsgZmlsdGVyVGFza3MgfSBmcm9tIFwiQC91dGlscy90YXNrL3Rhc2stZmlsdGVyLXV0aWxzXCI7XHJcbmltcG9ydCB7XHJcblx0Q2FsZW5kYXJDb21wb25lbnQsXHJcblx0Q2FsZW5kYXJFdmVudCxcclxufSBmcm9tIFwiQC9jb21wb25lbnRzL2ZlYXR1cmVzL2NhbGVuZGFyXCI7XHJcbmltcG9ydCB7IEthbmJhbkNvbXBvbmVudCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMva2FuYmFuL2thbmJhblwiO1xyXG5pbXBvcnQgeyBHYW50dENvbXBvbmVudCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvZ2FudHQvZ2FudHRcIjtcclxuaW1wb3J0IHsgVGFza1Byb3BlcnR5VHdvQ29sdW1uVmlldyB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay92aWV3L1Rhc2tQcm9wZXJ0eVR3b0NvbHVtblZpZXdcIjtcclxuaW1wb3J0IHsgVmlld0NvbXBvbmVudE1hbmFnZXIgfSBmcm9tIFwiQC9jb21wb25lbnRzL3VpXCI7XHJcbmltcG9ydCB7IEhhYml0IH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy9oYWJpdC9oYWJpdFwiO1xyXG5pbXBvcnQgeyBDb25maXJtTW9kYWwgfSBmcm9tIFwiQC9jb21wb25lbnRzL3VpXCI7XHJcbmltcG9ydCB7XHJcblx0Vmlld1Rhc2tGaWx0ZXJQb3BvdmVyLFxyXG5cdFZpZXdUYXNrRmlsdGVyTW9kYWwsXHJcbn0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy90YXNrL2ZpbHRlclwiO1xyXG5pbXBvcnQge1xyXG5cdEZpbHRlcixcclxuXHRGaWx0ZXJHcm91cCxcclxuXHRSb290RmlsdGVyU3RhdGUsXHJcbn0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy90YXNrL2ZpbHRlci9WaWV3VGFza0ZpbHRlclwiO1xyXG5pbXBvcnQgeyBGaWx0ZXJDb25maWdNb2RhbCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay9maWx0ZXIvRmlsdGVyQ29uZmlnTW9kYWxcIjtcclxuaW1wb3J0IHsgU2F2ZWRGaWx0ZXJDb25maWcgfSBmcm9tIFwiQC9jb21tb24vc2V0dGluZy1kZWZpbml0aW9uXCI7XHJcbmltcG9ydCB7IGlzRGF0YWZsb3dFbmFibGVkIH0gZnJvbSBcIkAvZGF0YWZsb3cvY3JlYXRlRGF0YWZsb3dcIjtcclxuaW1wb3J0IHsgRXZlbnRzLCBvbiB9IGZyb20gXCJAL2RhdGFmbG93L2V2ZW50cy9FdmVudHNcIjtcclxuXHJcbmV4cG9ydCBjb25zdCBUQVNLX1ZJRVdfVFlQRSA9IFwidGFzay1nZW5pdXMtdmlld1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFRhc2tWaWV3IGV4dGVuZHMgSXRlbVZpZXcge1xyXG5cdC8vIE1haW4gY29udGFpbmVyIGVsZW1lbnRzXHJcblx0cHJpdmF0ZSByb290Q29udGFpbmVyRWw6IEhUTUxFbGVtZW50O1xyXG5cclxuXHQvLyBDb21wb25lbnQgcmVmZXJlbmNlc1xyXG5cdHByaXZhdGUgc2lkZWJhckNvbXBvbmVudDogU2lkZWJhckNvbXBvbmVudDtcclxuXHRwcml2YXRlIGNvbnRlbnRDb21wb25lbnQ6IENvbnRlbnRDb21wb25lbnQ7XHJcblx0cHJpdmF0ZSBmb3JlY2FzdENvbXBvbmVudDogRm9yZWNhc3RDb21wb25lbnQ7XHJcblx0cHJpdmF0ZSB0YWdzQ29tcG9uZW50OiBUYWdzQ29tcG9uZW50O1xyXG5cdHByaXZhdGUgcHJvamVjdHNDb21wb25lbnQ6IFByb2plY3RzQ29tcG9uZW50O1xyXG5cdHByaXZhdGUgcmV2aWV3Q29tcG9uZW50OiBSZXZpZXdDb21wb25lbnQ7XHJcblx0cHJpdmF0ZSBkZXRhaWxzQ29tcG9uZW50OiBUYXNrRGV0YWlsc0NvbXBvbmVudDtcclxuXHRwcml2YXRlIGNhbGVuZGFyQ29tcG9uZW50OiBDYWxlbmRhckNvbXBvbmVudDtcclxuXHRwcml2YXRlIGthbmJhbkNvbXBvbmVudDogS2FuYmFuQ29tcG9uZW50O1xyXG5cdHByaXZhdGUgZ2FudHRDb21wb25lbnQ6IEdhbnR0Q29tcG9uZW50O1xyXG5cdHByaXZhdGUgdmlld0NvbXBvbmVudE1hbmFnZXI6IFZpZXdDb21wb25lbnRNYW5hZ2VyOyAvLyDmlrDlop7vvJrnu5/kuIDnmoTop4blm77nu4Tku7bnrqHnkIblmahcclxuXHQvLyBDdXN0b20gdmlldyBjb21wb25lbnRzIGJ5IHZpZXcgSURcclxuXHRwcml2YXRlIHR3b0NvbHVtblZpZXdDb21wb25lbnRzOiBNYXA8c3RyaW5nLCBUYXNrUHJvcGVydHlUd29Db2x1bW5WaWV3PiA9XHJcblx0XHRuZXcgTWFwKCk7XHJcblx0Ly8gVUkgc3RhdGUgbWFuYWdlbWVudFxyXG5cdHByaXZhdGUgaXNTaWRlYmFyQ29sbGFwc2VkID0gZmFsc2U7XHJcblx0cHJpdmF0ZSBpc0RldGFpbHNWaXNpYmxlID0gZmFsc2U7XHJcblx0cHJpdmF0ZSBzaWRlYmFyVG9nZ2xlQnRuOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIGRldGFpbHNUb2dnbGVCdG46IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgY3VycmVudFZpZXdJZDogVmlld01vZGUgPSBcImluYm94XCI7XHJcblx0cHJpdmF0ZSBjdXJyZW50U2VsZWN0ZWRUYXNrSWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgY3VycmVudFNlbGVjdGVkVGFza0RPTTogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIGxhc3RUb2dnbGVUaW1lc3RhbXA6IG51bWJlciA9IDA7XHJcblx0cHJpdmF0ZSBoYWJpdENvbXBvbmVudDogSGFiaXQ7XHJcblxyXG5cdHByaXZhdGUgdGFiQWN0aW9uQnV0dG9uOiBIVE1MRWxlbWVudDtcclxuXHJcblx0Ly8gRGF0YSBtYW5hZ2VtZW50XHJcblx0dGFza3M6IFRhc2tbXSA9IFtdO1xyXG5cclxuXHRwcml2YXRlIGN1cnJlbnRGaWx0ZXJTdGF0ZTogUm9vdEZpbHRlclN0YXRlIHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBsaXZlRmlsdGVyU3RhdGU6IFJvb3RGaWx0ZXJTdGF0ZSB8IG51bGwgPSBudWxsOyAvLyDmlrDlop7vvJrkuJPpl6jot5/ouKrlrp7ml7bov4fmu6TlmajnirbmgIFcclxuXHJcblx0Ly8g5Yib5bu66Ziy5oqW55qE6L+H5ruk5Zmo5bqU55So5Ye95pWwXHJcblx0cHJpdmF0ZSBkZWJvdW5jZWRBcHBseUZpbHRlciA9IGRlYm91bmNlKCgpID0+IHtcclxuXHRcdHRoaXMuYXBwbHlDdXJyZW50RmlsdGVyKCk7XHJcblx0fSwgNDAwKTsgLy8g5aKe5Yqg5bu26L+f5YiwIDQwMG1zIOWHj+Wwkemikee5geabtOaWsFxyXG5cclxuXHRjb25zdHJ1Y3RvcihsZWFmOiBXb3Jrc3BhY2VMZWFmLCBwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luKSB7XHJcblx0XHRzdXBlcihsZWFmKTtcclxuXHJcblx0XHR0aGlzLnRhc2tzID0gdGhpcy5wbHVnaW4ucHJlbG9hZGVkVGFza3MgfHwgW107XHJcblxyXG5cdFx0dGhpcy5zY29wZSA9IG5ldyBTY29wZSh0aGlzLmFwcC5zY29wZSk7XHJcblxyXG5cdFx0dGhpcy5zY29wZT8ucmVnaXN0ZXIobnVsbCwgXCJlc2NhcGVcIiwgKGUpID0+IHtcclxuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRnZXRWaWV3VHlwZSgpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIFRBU0tfVklFV19UWVBFO1xyXG5cdH1cclxuXHJcblx0Z2V0RGlzcGxheVRleHQoKTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IGN1cnJlbnRWaWV3Q29uZmlnID0gZ2V0Vmlld1NldHRpbmdPckRlZmF1bHQoXHJcblx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHR0aGlzLmN1cnJlbnRWaWV3SWRcclxuXHRcdCk7XHJcblx0XHRyZXR1cm4gY3VycmVudFZpZXdDb25maWcubmFtZTtcclxuXHR9XHJcblxyXG5cdGdldEljb24oKTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IGN1cnJlbnRWaWV3Q29uZmlnID0gZ2V0Vmlld1NldHRpbmdPckRlZmF1bHQoXHJcblx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHR0aGlzLmN1cnJlbnRWaWV3SWRcclxuXHRcdCk7XHJcblx0XHRyZXR1cm4gY3VycmVudFZpZXdDb25maWcuaWNvbjtcclxuXHR9XHJcblxyXG5cdGFzeW5jIG9uT3BlbigpIHtcclxuXHRcdHRoaXMuY29udGVudEVsLnRvZ2dsZUNsYXNzKFwidGFzay1nZW5pdXMtdmlld1wiLCB0cnVlKTtcclxuXHRcdHRoaXMucm9vdENvbnRhaW5lckVsID0gdGhpcy5jb250ZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInRhc2stZ2VuaXVzLWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQWRkIGRlYm91bmNlZCB2aWV3IHVwZGF0ZSB0byBwcmV2ZW50IHJhcGlkIHN1Y2Nlc3NpdmUgcmVmcmVzaGVzXHJcblx0XHRjb25zdCBkZWJvdW5jZWRWaWV3VXBkYXRlID0gZGVib3VuY2UoYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHQvLyBGb3IgZXh0ZXJuYWwvZWRpdG9yIHVwZGF0ZXMsIGZvcmNlIGEgdmlldyByZWZyZXNoIHRvIGF2b2lkIGZhbHNlIFwidW5jaGFuZ2VkXCIgc2tpcHNcclxuXHRcdFx0YXdhaXQgdGhpcy5sb2FkVGFza3MoZmFsc2UsIHRydWUpOyAvLyBza2lwIGludGVybmFsIHRyaWdnZXJWaWV3VXBkYXRlXHJcblx0XHRcdHRoaXMuc3dpdGNoVmlldyh0aGlzLmN1cnJlbnRWaWV3SWQsIHVuZGVmaW5lZCwgdHJ1ZSk7IC8vIGZvcmNlUmVmcmVzaFxyXG5cdFx0fSwgNTAwKTsgLy8g5aKe5Yqg5YiwIDUwMG1zIOmYsuaKluW7tui/n++8jOmBv+WFjemikee5geabtOaWsOWvvOiHtOS4remXtOeKtuaAgeaYvuekulxyXG5cclxuXHRcdC8vIDEuIOmmluWFiOazqOWGjOS6i+S7tuebkeWQrOWZqO+8jOehruS/neS4jeS8mumUmei/h+S7u+S9leabtOaWsFxyXG5cdFx0aWYgKFxyXG5cdFx0XHRpc0RhdGFmbG93RW5hYmxlZCh0aGlzLnBsdWdpbikgJiZcclxuXHRcdFx0dGhpcy5wbHVnaW4uZGF0YWZsb3dPcmNoZXN0cmF0b3JcclxuXHRcdCkge1xyXG5cclxuXHRcdFx0dGhpcy5yZWdpc3RlckV2ZW50KFxyXG5cdFx0XHRcdG9uKHRoaXMuYXBwLCBFdmVudHMuQ0FDSEVfUkVBRFksIGFzeW5jICgpID0+IHtcclxuXHRcdFx0XHRcdC8vIOWGt+WQr+WKqOWwsee7qu+8jOS7juW/q+eFp+WKoOi9ve+8jOW5tuabtOaWsOinhuWbvlxyXG5cdFx0XHRcdFx0YXdhaXQgdGhpcy5sb2FkVGFza3NGYXN0KGZhbHNlKTtcclxuXHRcdFx0XHR9KVxyXG5cdFx0XHQpO1xyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRXZlbnQoXHJcblx0XHRcdFx0b24odGhpcy5hcHAsIEV2ZW50cy5UQVNLX0NBQ0hFX1VQREFURUQsIGRlYm91bmNlZFZpZXdVcGRhdGUpXHJcblx0XHRcdCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBMZWdhY3k6IOWFvOWuueaXp+S6i+S7tlxyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRXZlbnQoXHJcblx0XHRcdFx0dGhpcy5hcHAud29ya3NwYWNlLm9uKFxyXG5cdFx0XHRcdFx0XCJ0YXNrLWdlbml1czp0YXNrLWNhY2hlLXVwZGF0ZWRcIixcclxuXHRcdFx0XHRcdGRlYm91bmNlZFZpZXdVcGRhdGVcclxuXHRcdFx0XHQpXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8g55uR5ZCs6L+H5ruk5Zmo5Y+Y5pu05LqL5Lu2XHJcblx0XHR0aGlzLnJlZ2lzdGVyRXZlbnQoXHJcblx0XHRcdHRoaXMuYXBwLndvcmtzcGFjZS5vbihcclxuXHRcdFx0XHRcInRhc2stZ2VuaXVzOmZpbHRlci1jaGFuZ2VkXCIsXHJcblx0XHRcdFx0KGZpbHRlclN0YXRlOiBSb290RmlsdGVyU3RhdGUsIGxlYWZJZD86IHN0cmluZykgPT4ge1xyXG5cdFx0XHRcdFx0Ly8g5Y+q5pyJ5p2l6Ieq5a6e5pe26L+H5ruk5Zmo57uE5Lu255qE5Y+Y5pu05omN5pu05pawbGl2ZUZpbHRlclN0YXRlXHJcblx0XHRcdFx0XHQvLyDmjpLpmaTln7rnoYDov4fmu6TlmajvvIhWaWV3Q29uZmlnTW9kYWzvvInlkozlhajlsYDov4fmu6TlmajnmoTlj5jmm7RcclxuXHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0bGVhZklkICYmXHJcblx0XHRcdFx0XHRcdCFsZWFmSWQuc3RhcnRzV2l0aChcInZpZXctY29uZmlnLVwiKSAmJlxyXG5cdFx0XHRcdFx0XHRsZWFmSWQgIT09IFwiZ2xvYmFsLWZpbHRlclwiXHJcblx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0Ly8g6L+Z5piv5p2l6Ieq5a6e5pe26L+H5ruk5Zmo57uE5Lu255qE5Y+Y5pu0XHJcblx0XHRcdFx0XHRcdHRoaXMubGl2ZUZpbHRlclN0YXRlID0gZmlsdGVyU3RhdGU7XHJcblx0XHRcdFx0XHRcdHRoaXMuY3VycmVudEZpbHRlclN0YXRlID0gZmlsdGVyU3RhdGU7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFwi5pu05paw5a6e5pe26L+H5ruk5Zmo54q25oCBXCIpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIGlmICghbGVhZklkKSB7XHJcblx0XHRcdFx0XHRcdC8vIOayoeaciWxlYWZJZOeahOaDheWGte+8jOS5n+inhuS4uuWunuaXtui/h+a7pOWZqOWPmOabtFxyXG5cdFx0XHRcdFx0XHR0aGlzLmxpdmVGaWx0ZXJTdGF0ZSA9IGZpbHRlclN0YXRlO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmN1cnJlbnRGaWx0ZXJTdGF0ZSA9IGZpbHRlclN0YXRlO1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIuabtOaWsOWunuaXtui/h+a7pOWZqOeKtuaAge+8iOaXoGxlYWZJZO+8iVwiKTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyDkvb/nlKjpmLLmipblh73mlbDlupTnlKjov4fmu6TlmajvvIzpgb/lhY3popHnuYHmm7TmlrBcclxuXHRcdFx0XHRcdHRoaXMuZGVib3VuY2VkQXBwbHlGaWx0ZXIoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdClcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8g55uR5ZCs6KeG5Zu+6YWN572u5Y+Y5pu05LqL5Lu277yI5LuF5Yi35paw5L6n6L655qCP5LiO5b2T5YmN6KeG5Zu+5Y+v6KeB5oCn77yJXHJcblx0XHR0aGlzLnJlZ2lzdGVyRXZlbnQoXHJcblx0XHRcdHRoaXMuYXBwLndvcmtzcGFjZS5vbihcclxuXHRcdFx0XHRcInRhc2stZ2VuaXVzOnZpZXctY29uZmlnLWNoYW5nZWRcIixcclxuXHRcdFx0XHQocGF5bG9hZDogeyByZWFzb246IHN0cmluZzsgdmlld0lkPzogc3RyaW5nIH0pID0+IHtcclxuXHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdC8vIOWFiOmHjee7mOS+p+i+ueagj+mhueebrlxyXG5cdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0dGhpcy5zaWRlYmFyQ29tcG9uZW50ICYmXHJcblx0XHRcdFx0XHRcdFx0dHlwZW9mIHRoaXMuc2lkZWJhckNvbXBvbmVudC5yZW5kZXJTaWRlYmFySXRlbXMgPT09XHJcblx0XHRcdFx0XHRcdFx0XCJmdW5jdGlvblwiXHJcblx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMuc2lkZWJhckNvbXBvbmVudC5yZW5kZXJTaWRlYmFySXRlbXMoKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRcdFx0XCJGYWlsZWQgdG8gcmVuZGVyIHNpZGViYXIgaXRlbXMgb24gdmlldy1jb25maWctY2hhbmdlZDpcIixcclxuXHRcdFx0XHRcdFx0XHRlXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gSWYgdGhlIGVkaXRlZCB2aWV3IGlzIHRoZSBjdXJyZW50IG9uZSAoZS5nLiwgdHlwZS9sYXlvdXQgY2hhbmdlZCksIGZvcmNlIHJlZnJlc2ggdGhlIG1haW4gY29udGVudFxyXG5cdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRwYXlsb2FkPy52aWV3SWQgJiZcclxuXHRcdFx0XHRcdFx0cGF5bG9hZC52aWV3SWQgPT09IHRoaXMuY3VycmVudFZpZXdJZFxyXG5cdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdHRoaXMuc3dpdGNoVmlldyh0aGlzLmN1cnJlbnRWaWV3SWQsIHVuZGVmaW5lZCwgdHJ1ZSk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8g6Iul5b2T5YmN6KeG5Zu+6KKr6K6+5Li65LiN5Y+v6KeB77yM5YiZ5YiH5o2i5Yiw56ys5LiA5Liq5Y+v6KeB6KeG5Zu+77yI5LiN5by65Yi25Yi35paw5YaF5a6577yJXHJcblx0XHRcdFx0XHRjb25zdCBjdXJyZW50Q2ZnID1cclxuXHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3Mudmlld0NvbmZpZ3VyYXRpb24uZmluZChcclxuXHRcdFx0XHRcdFx0XHQodikgPT4gdi5pZCA9PT0gdGhpcy5jdXJyZW50Vmlld0lkXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRpZiAoIWN1cnJlbnRDZmc/LnZpc2libGUpIHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgZmlyc3RWaXNpYmxlID1cclxuXHRcdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy52aWV3Q29uZmlndXJhdGlvbi5maW5kKFxyXG5cdFx0XHRcdFx0XHRcdFx0KHYpID0+IHYudmlzaWJsZVxyXG5cdFx0XHRcdFx0XHRcdCk/LmlkIGFzIFZpZXdNb2RlIHwgdW5kZWZpbmVkO1xyXG5cdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0Zmlyc3RWaXNpYmxlICYmXHJcblx0XHRcdFx0XHRcdFx0Zmlyc3RWaXNpYmxlICE9PSB0aGlzLmN1cnJlbnRWaWV3SWRcclxuXHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5jdXJyZW50Vmlld0lkID0gZmlyc3RWaXNpYmxlO1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMuc2lkZWJhckNvbXBvbmVudD8uc2V0Vmlld01vZGUoXHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLmN1cnJlbnRWaWV3SWRcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdC8vIEVuc3VyZSBtYWluIGNvbnRlbnQgc3dpdGNoZXMgdG8gdGhlIG5ldyB2aXNpYmxlIHZpZXdcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnN3aXRjaFZpZXcoXHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLmN1cnJlbnRWaWV3SWQsXHJcblx0XHRcdFx0XHRcdFx0XHR1bmRlZmluZWQsXHJcblx0XHRcdFx0XHRcdFx0XHR0cnVlXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0KVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyAyLiDliqDovb3nvJPlrZjnmoTlrp7ml7bov4fmu6TnirbmgIFcclxuXHRcdGNvbnN0IHNhdmVkRmlsdGVyU3RhdGUgPSB0aGlzLmFwcC5sb2FkTG9jYWxTdG9yYWdlKFxyXG5cdFx0XHRcInRhc2stZ2VuaXVzLXZpZXctZmlsdGVyXCJcclxuXHRcdCkgYXMgUm9vdEZpbHRlclN0YXRlO1xyXG5cdFx0Y29uc29sZS5sb2coXCJzYXZlZEZpbHRlclN0YXRlXCIsIHNhdmVkRmlsdGVyU3RhdGUpO1xyXG5cclxuXHRcdGlmIChcclxuXHRcdFx0c2F2ZWRGaWx0ZXJTdGF0ZSAmJlxyXG5cdFx0XHR0eXBlb2Ygc2F2ZWRGaWx0ZXJTdGF0ZS5yb290Q29uZGl0aW9uID09PSBcInN0cmluZ1wiICYmXHJcblx0XHRcdEFycmF5LmlzQXJyYXkoc2F2ZWRGaWx0ZXJTdGF0ZS5maWx0ZXJHcm91cHMpXHJcblx0XHQpIHtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJTYXZlZCBmaWx0ZXIgc3RhdGVcIiwgc2F2ZWRGaWx0ZXJTdGF0ZSk7XHJcblx0XHRcdHRoaXMubGl2ZUZpbHRlclN0YXRlID0gc2F2ZWRGaWx0ZXJTdGF0ZTtcclxuXHRcdFx0dGhpcy5jdXJyZW50RmlsdGVyU3RhdGUgPSBzYXZlZEZpbHRlclN0YXRlO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJObyBzYXZlZCBmaWx0ZXIgc3RhdGUgb3IgaW52YWxpZCBzdGF0ZVwiKTtcclxuXHRcdFx0dGhpcy5saXZlRmlsdGVyU3RhdGUgPSBudWxsO1xyXG5cdFx0XHR0aGlzLmN1cnJlbnRGaWx0ZXJTdGF0ZSA9IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gMy4g5Yid5aeL5YyW57uE5Lu277yI5L2G5YWI5LiN5Lyg5YWl5pWw5o2u77yJXHJcblx0XHR0aGlzLmluaXRpYWxpemVDb21wb25lbnRzKCk7XHJcblxyXG5cdFx0Ly8gNC4g6I635Y+W5Yid5aeL6KeG5Zu+SURcclxuXHRcdGNvbnN0IHNhdmVkVmlld0lkID0gdGhpcy5hcHAubG9hZExvY2FsU3RvcmFnZShcclxuXHRcdFx0XCJ0YXNrLWdlbml1czp2aWV3LW1vZGVcIlxyXG5cdFx0KSBhcyBWaWV3TW9kZTtcclxuXHRcdGNvbnN0IGluaXRpYWxWaWV3SWQgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy52aWV3Q29uZmlndXJhdGlvbi5maW5kKFxyXG5cdFx0XHQodikgPT4gdi5pZCA9PT0gc2F2ZWRWaWV3SWQgJiYgdi52aXNpYmxlXHJcblx0XHQpXHJcblx0XHRcdD8gc2F2ZWRWaWV3SWRcclxuXHRcdFx0OiB0aGlzLnBsdWdpbi5zZXR0aW5ncy52aWV3Q29uZmlndXJhdGlvbi5maW5kKCh2KSA9PiB2LnZpc2libGUpXHJcblx0XHRcdD8uaWQgfHwgXCJpbmJveFwiO1xyXG5cclxuXHRcdHRoaXMuY3VycmVudFZpZXdJZCA9IGluaXRpYWxWaWV3SWQ7XHJcblx0XHR0aGlzLnNpZGViYXJDb21wb25lbnQuc2V0Vmlld01vZGUodGhpcy5jdXJyZW50Vmlld0lkKTtcclxuXHJcblx0XHQvLyA1LiDlv6vpgJ/liqDovb3nvJPlrZjmlbDmja7ku6Xnq4vljbPmmL7npLogVUlcclxuXHRcdGF3YWl0IHRoaXMubG9hZFRhc2tzRmFzdChmYWxzZSk7IC8vIERvbid0IHNraXAgdmlldyB1cGRhdGUgLSB3ZSBuZWVkIHRoZSBpbml0aWFsIHJlbmRlclxyXG5cclxuXHRcdC8vIDYuIE9ubHkgc3dpdGNoIHZpZXcgaWYgd2UgaGF2ZSB0YXNrcyB0byBkaXNwbGF5XHJcblx0XHRpZiAodGhpcy50YXNrcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdHRoaXMuc3dpdGNoVmlldyh0aGlzLmN1cnJlbnRWaWV3SWQpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gSWYgbm8gdGFza3MgbG9hZGVkIHlldCwgd2FpdCBmb3IgYmFja2dyb3VuZCBzeW5jIGJlZm9yZSByZW5kZXJpbmdcclxuXHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XCJObyBjYWNoZWQgdGFza3MgZm91bmQsIHdhaXRpbmcgZm9yIGJhY2tncm91bmQgc3luYy4uLlwiXHJcblx0XHRcdCk7XHJcblx0XHRcdGF3YWl0IHRoaXMubG9hZFRhc2tzV2l0aFN5bmNJbkJhY2tncm91bmQoKTtcclxuXHRcdFx0dGhpcy5zd2l0Y2hWaWV3KHRoaXMuY3VycmVudFZpZXdJZCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc29sZS5sb2coXCJjdXJyZW50RmlsdGVyU3RhdGVcIiwgdGhpcy5jdXJyZW50RmlsdGVyU3RhdGUpO1xyXG5cdFx0Ly8gNy4g5Zyo57uE5Lu25Yid5aeL5YyW5a6M5oiQ5ZCO5bqU55So562b6YCJ5Zmo54q25oCBXHJcblx0XHRpZiAodGhpcy5jdXJyZW50RmlsdGVyU3RhdGUpIHtcclxuXHRcdFx0Y29uc29sZS5sb2coXCLlupTnlKjkv53lrZjnmoTnrZvpgInlmajnirbmgIFcIik7XHJcblx0XHRcdHRoaXMuYXBwbHlDdXJyZW50RmlsdGVyKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy50b2dnbGVEZXRhaWxzVmlzaWJpbGl0eShmYWxzZSk7XHJcblxyXG5cdFx0dGhpcy5jcmVhdGVUYXNrTWFyaygpO1xyXG5cclxuXHRcdHRoaXMuY3JlYXRlQWN0aW9uQnV0dG9ucygpO1xyXG5cclxuXHRcdCh0aGlzLmxlYWYudGFiSGVhZGVyU3RhdHVzQ29udGFpbmVyRWwgYXMgSFRNTEVsZW1lbnQpLmVtcHR5KCk7XHJcblxyXG5cdFx0KHRoaXMubGVhZi50YWJIZWFkZXJFbCBhcyBIVE1MRWxlbWVudCkudG9nZ2xlQ2xhc3MoXHJcblx0XHRcdFwidGFzay1nZW5pdXMtdGFiLWhlYWRlclwiLFxyXG5cdFx0XHR0cnVlXHJcblx0XHQpO1xyXG5cclxuXHRcdHRoaXMudGFiQWN0aW9uQnV0dG9uID0gKFxyXG5cdFx0XHR0aGlzLmxlYWYudGFiSGVhZGVyU3RhdHVzQ29udGFpbmVyRWwgYXMgSFRNTEVsZW1lbnRcclxuXHRcdCkuY3JlYXRlRWwoXHJcblx0XHRcdFwic3BhblwiLFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0Y2xzOiBcInRhc2stZ2VuaXVzLWFjdGlvbi1idG5cIixcclxuXHRcdFx0fSxcclxuXHRcdFx0KGVsOiBIVE1MRWxlbWVudCkgPT4ge1xyXG5cdFx0XHRcdG5ldyBFeHRyYUJ1dHRvbkNvbXBvbmVudChlbClcclxuXHRcdFx0XHRcdC5zZXRJY29uKFwibm90ZWJvb2stcGVuXCIpXHJcblx0XHRcdFx0XHQuc2V0VG9vbHRpcCh0KFwiQ2FwdHVyZVwiKSlcclxuXHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgbW9kYWwgPSBuZXcgUXVpY2tDYXB0dXJlTW9kYWwoXHJcblx0XHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uYXBwLFxyXG5cdFx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHRcdFx0XHRcdHt9LFxyXG5cdFx0XHRcdFx0XHRcdHRydWVcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0bW9kYWwub3BlbigpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblxyXG5cdFx0dGhpcy5yZWdpc3RlcigoKSA9PiB7XHJcblx0XHRcdHRoaXMudGFiQWN0aW9uQnV0dG9uLmRldGFjaCgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5jaGVja0FuZENvbGxhcHNlU2lkZWJhcigpO1xyXG5cclxuXHRcdC8vIOa3u+WKoOinhuWbvuWIh+aNouWRveS7pFxyXG5cdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3Mudmlld0NvbmZpZ3VyYXRpb24uZm9yRWFjaCgodmlldykgPT4ge1xyXG5cdFx0XHR0aGlzLnBsdWdpbi5hZGRDb21tYW5kKHtcclxuXHRcdFx0XHRpZDogYHN3aXRjaC12aWV3LSR7dmlldy5pZH1gLFxyXG5cdFx0XHRcdG5hbWU6IHZpZXcubmFtZSxcclxuXHRcdFx0XHRjaGVja0NhbGxiYWNrOiAoY2hlY2tpbmcpID0+IHtcclxuXHRcdFx0XHRcdGlmIChjaGVja2luZykge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRjb25zdCBleGlzdGluZ0xlYXZlcyA9XHJcblx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLmFwcC53b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKFxyXG5cdFx0XHRcdFx0XHRcdFRBU0tfVklFV19UWVBFXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRpZiAoZXhpc3RpbmdMZWF2ZXMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdFx0XHQvLyBGb2N1cyB0aGUgZXhpc3Rpbmcgdmlld1xyXG5cdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5hcHAud29ya3NwYWNlLnJldmVhbExlYWYoZXhpc3RpbmdMZWF2ZXNbMF0pO1xyXG5cdFx0XHRcdFx0XHRjb25zdCBjdXJyZW50VmlldyA9IGV4aXN0aW5nTGVhdmVzWzBdLnZpZXcgYXMgVGFza1ZpZXc7XHJcblx0XHRcdFx0XHRcdGN1cnJlbnRWaWV3LnN3aXRjaFZpZXcodmlldy5pZCk7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHQvLyBJZiBubyB2aWV3IGlzIGFjdGl2ZSwgYWN0aXZhdGUgb25lIGFuZCB0aGVuIHN3aXRjaFxyXG5cdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5hY3RpdmF0ZVRhc2tWaWV3KCkudGhlbigoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgbmV3VmlldyA9XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5hcHAud29ya3NwYWNlLmdldEFjdGl2ZVZpZXdPZlR5cGUoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFRhc2tWaWV3XHJcblx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdGlmIChuZXdWaWV3KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRuZXdWaWV3LnN3aXRjaFZpZXcodmlldy5pZCk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIOehruS/nemHjee9ruetm+mAieWZqOaMiemSruato+ehruaYvuekulxyXG5cdFx0dGhpcy51cGRhdGVBY3Rpb25CdXR0b25zKCk7XHJcblx0fVxyXG5cclxuXHRvblJlc2l6ZSgpOiB2b2lkIHtcclxuXHRcdHRoaXMuY2hlY2tBbmRDb2xsYXBzZVNpZGViYXIoKTtcclxuXHR9XHJcblxyXG5cdGNoZWNrQW5kQ29sbGFwc2VTaWRlYmFyKCkge1xyXG5cdFx0aWYgKHRoaXMubGVhZi53aWR0aCA9PT0gMCB8fCB0aGlzLmxlYWYuaGVpZ2h0ID09PSAwKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAodGhpcy5sZWFmLndpZHRoIDwgNzY4KSB7XHJcblx0XHRcdHRoaXMuaXNTaWRlYmFyQ29sbGFwc2VkID0gdHJ1ZTtcclxuXHRcdFx0dGhpcy5zaWRlYmFyQ29tcG9uZW50LnNldENvbGxhcHNlZCh0cnVlKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGluaXRpYWxpemVDb21wb25lbnRzKCkge1xyXG5cdFx0dGhpcy5zaWRlYmFyQ29tcG9uZW50ID0gbmV3IFNpZGViYXJDb21wb25lbnQoXHJcblx0XHRcdHRoaXMucm9vdENvbnRhaW5lckVsLFxyXG5cdFx0XHR0aGlzLnBsdWdpblxyXG5cdFx0KTtcclxuXHRcdHRoaXMuYWRkQ2hpbGQodGhpcy5zaWRlYmFyQ29tcG9uZW50KTtcclxuXHRcdHRoaXMuc2lkZWJhckNvbXBvbmVudC5sb2FkKCk7XHJcblxyXG5cdFx0dGhpcy5jcmVhdGVTaWRlYmFyVG9nZ2xlKCk7XHJcblxyXG5cdFx0dGhpcy5jb250ZW50Q29tcG9uZW50ID0gbmV3IENvbnRlbnRDb21wb25lbnQoXHJcblx0XHRcdHRoaXMucm9vdENvbnRhaW5lckVsLFxyXG5cdFx0XHR0aGlzLnBsdWdpbi5hcHAsXHJcblx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0b25UYXNrU2VsZWN0ZWQ6ICh0YXNrOiBUYXNrIHwgbnVsbCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5oYW5kbGVUYXNrU2VsZWN0aW9uKHRhc2spO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0b25UYXNrQ29tcGxldGVkOiAodGFzazogVGFzaykgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy50b2dnbGVUYXNrQ29tcGxldGlvbih0YXNrKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uVGFza1VwZGF0ZTogYXN5bmMgKG9yaWdpbmFsVGFzazogVGFzaywgdXBkYXRlZFRhc2s6IFRhc2spID0+IHtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRcIlRhc2tWaWV3IG9uVGFza1VwZGF0ZVwiLFxyXG5cdFx0XHRcdFx0XHRvcmlnaW5hbFRhc2suY29udGVudCxcclxuXHRcdFx0XHRcdFx0dXBkYXRlZFRhc2suY29udGVudFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdGF3YWl0IHRoaXMuaGFuZGxlVGFza1VwZGF0ZShvcmlnaW5hbFRhc2ssIHVwZGF0ZWRUYXNrKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uVGFza0NvbnRleHRNZW51OiAoZXZlbnQ6IE1vdXNlRXZlbnQsIHRhc2s6IFRhc2spID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuaGFuZGxlVGFza0NvbnRleHRNZW51KGV2ZW50LCB0YXNrKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cdFx0dGhpcy5hZGRDaGlsZCh0aGlzLmNvbnRlbnRDb21wb25lbnQpO1xyXG5cdFx0dGhpcy5jb250ZW50Q29tcG9uZW50LmxvYWQoKTtcclxuXHJcblx0XHR0aGlzLmZvcmVjYXN0Q29tcG9uZW50ID0gbmV3IEZvcmVjYXN0Q29tcG9uZW50KFxyXG5cdFx0XHR0aGlzLnJvb3RDb250YWluZXJFbCxcclxuXHRcdFx0dGhpcy5wbHVnaW4uYXBwLFxyXG5cdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0e1xyXG5cdFx0XHRcdG9uVGFza1NlbGVjdGVkOiAodGFzazogVGFzayB8IG51bGwpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuaGFuZGxlVGFza1NlbGVjdGlvbih0YXNrKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uVGFza0NvbXBsZXRlZDogKHRhc2s6IFRhc2spID0+IHtcclxuXHRcdFx0XHRcdHRoaXMudG9nZ2xlVGFza0NvbXBsZXRpb24odGFzayk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvblRhc2tVcGRhdGU6IGFzeW5jIChvcmlnaW5hbFRhc2s6IFRhc2ssIHVwZGF0ZWRUYXNrOiBUYXNrKSA9PiB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdFx0XCJUYXNrVmlldyBvblRhc2tVcGRhdGVcIixcclxuXHRcdFx0XHRcdFx0b3JpZ2luYWxUYXNrLmNvbnRlbnQsXHJcblx0XHRcdFx0XHRcdHVwZGF0ZWRUYXNrLmNvbnRlbnRcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRhd2FpdCB0aGlzLmhhbmRsZVRhc2tVcGRhdGUob3JpZ2luYWxUYXNrLCB1cGRhdGVkVGFzayk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvblRhc2tDb250ZXh0TWVudTogKGV2ZW50OiBNb3VzZUV2ZW50LCB0YXNrOiBUYXNrKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLmhhbmRsZVRhc2tDb250ZXh0TWVudShldmVudCwgdGFzayk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fVxyXG5cdFx0KTtcclxuXHRcdHRoaXMuYWRkQ2hpbGQodGhpcy5mb3JlY2FzdENvbXBvbmVudCk7XHJcblx0XHR0aGlzLmZvcmVjYXN0Q29tcG9uZW50LmxvYWQoKTtcclxuXHRcdHRoaXMuZm9yZWNhc3RDb21wb25lbnQuY29udGFpbmVyRWwuaGlkZSgpO1xyXG5cclxuXHRcdHRoaXMudGFnc0NvbXBvbmVudCA9IG5ldyBUYWdzQ29tcG9uZW50KFxyXG5cdFx0XHR0aGlzLnJvb3RDb250YWluZXJFbCxcclxuXHRcdFx0dGhpcy5wbHVnaW4uYXBwLFxyXG5cdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0e1xyXG5cdFx0XHRcdG9uVGFza1NlbGVjdGVkOiAodGFzazogVGFzayB8IG51bGwpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuaGFuZGxlVGFza1NlbGVjdGlvbih0YXNrKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uVGFza0NvbXBsZXRlZDogKHRhc2s6IFRhc2spID0+IHtcclxuXHRcdFx0XHRcdHRoaXMudG9nZ2xlVGFza0NvbXBsZXRpb24odGFzayk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvblRhc2tVcGRhdGU6IGFzeW5jIChvcmlnaW5hbFRhc2s6IFRhc2ssIHVwZGF0ZWRUYXNrOiBUYXNrKSA9PiB7XHJcblx0XHRcdFx0XHRhd2FpdCB0aGlzLmhhbmRsZVRhc2tVcGRhdGUob3JpZ2luYWxUYXNrLCB1cGRhdGVkVGFzayk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvblRhc2tDb250ZXh0TWVudTogKGV2ZW50OiBNb3VzZUV2ZW50LCB0YXNrOiBUYXNrKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLmhhbmRsZVRhc2tDb250ZXh0TWVudShldmVudCwgdGFzayk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fVxyXG5cdFx0KTtcclxuXHRcdHRoaXMuYWRkQ2hpbGQodGhpcy50YWdzQ29tcG9uZW50KTtcclxuXHRcdHRoaXMudGFnc0NvbXBvbmVudC5sb2FkKCk7XHJcblx0XHR0aGlzLnRhZ3NDb21wb25lbnQuY29udGFpbmVyRWwuaGlkZSgpO1xyXG5cclxuXHRcdHRoaXMucHJvamVjdHNDb21wb25lbnQgPSBuZXcgUHJvamVjdHNDb21wb25lbnQoXHJcblx0XHRcdHRoaXMucm9vdENvbnRhaW5lckVsLFxyXG5cdFx0XHR0aGlzLnBsdWdpbi5hcHAsXHJcblx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0b25UYXNrU2VsZWN0ZWQ6ICh0YXNrOiBUYXNrIHwgbnVsbCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5oYW5kbGVUYXNrU2VsZWN0aW9uKHRhc2spO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0b25UYXNrQ29tcGxldGVkOiAodGFzazogVGFzaykgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy50b2dnbGVUYXNrQ29tcGxldGlvbih0YXNrKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uVGFza1VwZGF0ZTogYXN5bmMgKG9yaWdpbmFsVGFzazogVGFzaywgdXBkYXRlZFRhc2s6IFRhc2spID0+IHtcclxuXHRcdFx0XHRcdGF3YWl0IHRoaXMuaGFuZGxlVGFza1VwZGF0ZShvcmlnaW5hbFRhc2ssIHVwZGF0ZWRUYXNrKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uVGFza0NvbnRleHRNZW51OiAoZXZlbnQ6IE1vdXNlRXZlbnQsIHRhc2s6IFRhc2spID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuaGFuZGxlVGFza0NvbnRleHRNZW51KGV2ZW50LCB0YXNrKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cdFx0dGhpcy5hZGRDaGlsZCh0aGlzLnByb2plY3RzQ29tcG9uZW50KTtcclxuXHRcdHRoaXMucHJvamVjdHNDb21wb25lbnQubG9hZCgpO1xyXG5cdFx0dGhpcy5wcm9qZWN0c0NvbXBvbmVudC5jb250YWluZXJFbC5oaWRlKCk7XHJcblxyXG5cdFx0dGhpcy5yZXZpZXdDb21wb25lbnQgPSBuZXcgUmV2aWV3Q29tcG9uZW50KFxyXG5cdFx0XHR0aGlzLnJvb3RDb250YWluZXJFbCxcclxuXHRcdFx0dGhpcy5wbHVnaW4uYXBwLFxyXG5cdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0e1xyXG5cdFx0XHRcdG9uVGFza1NlbGVjdGVkOiAodGFzazogVGFzayB8IG51bGwpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuaGFuZGxlVGFza1NlbGVjdGlvbih0YXNrKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uVGFza0NvbXBsZXRlZDogKHRhc2s6IFRhc2spID0+IHtcclxuXHRcdFx0XHRcdHRoaXMudG9nZ2xlVGFza0NvbXBsZXRpb24odGFzayk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvblRhc2tVcGRhdGU6IGFzeW5jIChvcmlnaW5hbFRhc2s6IFRhc2ssIHVwZGF0ZWRUYXNrOiBUYXNrKSA9PiB7XHJcblx0XHRcdFx0XHRhd2FpdCB0aGlzLmhhbmRsZVRhc2tVcGRhdGUob3JpZ2luYWxUYXNrLCB1cGRhdGVkVGFzayk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvblRhc2tDb250ZXh0TWVudTogKGV2ZW50OiBNb3VzZUV2ZW50LCB0YXNrOiBUYXNrKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLmhhbmRsZVRhc2tDb250ZXh0TWVudShldmVudCwgdGFzayk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fVxyXG5cdFx0KTtcclxuXHRcdHRoaXMuYWRkQ2hpbGQodGhpcy5yZXZpZXdDb21wb25lbnQpO1xyXG5cdFx0dGhpcy5yZXZpZXdDb21wb25lbnQubG9hZCgpO1xyXG5cdFx0dGhpcy5yZXZpZXdDb21wb25lbnQuY29udGFpbmVyRWwuaGlkZSgpO1xyXG5cclxuXHRcdHRoaXMuY2FsZW5kYXJDb21wb25lbnQgPSBuZXcgQ2FsZW5kYXJDb21wb25lbnQoXHJcblx0XHRcdHRoaXMucGx1Z2luLmFwcCxcclxuXHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdHRoaXMucm9vdENvbnRhaW5lckVsLFxyXG5cdFx0XHR0aGlzLnRhc2tzLFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0b25UYXNrU2VsZWN0ZWQ6ICh0YXNrOiBUYXNrIHwgbnVsbCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5oYW5kbGVUYXNrU2VsZWN0aW9uKHRhc2spO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0b25UYXNrQ29tcGxldGVkOiAodGFzazogVGFzaykgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy50b2dnbGVUYXNrQ29tcGxldGlvbih0YXNrKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uRXZlbnRDb250ZXh0TWVudTogKGV2OiBNb3VzZUV2ZW50LCBldmVudDogQ2FsZW5kYXJFdmVudCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5oYW5kbGVUYXNrQ29udGV4dE1lbnUoZXYsIGV2ZW50KTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cdFx0dGhpcy5hZGRDaGlsZCh0aGlzLmNhbGVuZGFyQ29tcG9uZW50KTtcclxuXHRcdHRoaXMuY2FsZW5kYXJDb21wb25lbnQubG9hZCgpO1xyXG5cdFx0dGhpcy5jYWxlbmRhckNvbXBvbmVudC5jb250YWluZXJFbC5oaWRlKCk7XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBLYW5iYW5Db21wb25lbnRcclxuXHRcdHRoaXMua2FuYmFuQ29tcG9uZW50ID0gbmV3IEthbmJhbkNvbXBvbmVudChcclxuXHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHR0aGlzLnJvb3RDb250YWluZXJFbCxcclxuXHRcdFx0dGhpcy50YXNrcyxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdG9uVGFza1N0YXR1c1VwZGF0ZTpcclxuXHRcdFx0XHRcdHRoaXMuaGFuZGxlS2FuYmFuVGFza1N0YXR1c1VwZGF0ZS5iaW5kKHRoaXMpLFxyXG5cdFx0XHRcdG9uVGFza1NlbGVjdGVkOiB0aGlzLmhhbmRsZVRhc2tTZWxlY3Rpb24uYmluZCh0aGlzKSxcclxuXHRcdFx0XHRvblRhc2tDb21wbGV0ZWQ6IHRoaXMudG9nZ2xlVGFza0NvbXBsZXRpb24uYmluZCh0aGlzKSxcclxuXHRcdFx0XHRvblRhc2tDb250ZXh0TWVudTogdGhpcy5oYW5kbGVUYXNrQ29udGV4dE1lbnUuYmluZCh0aGlzKSxcclxuXHRcdFx0fVxyXG5cdFx0KTtcclxuXHRcdHRoaXMuYWRkQ2hpbGQodGhpcy5rYW5iYW5Db21wb25lbnQpO1xyXG5cdFx0dGhpcy5rYW5iYW5Db21wb25lbnQuY29udGFpbmVyRWwuaGlkZSgpO1xyXG5cclxuXHRcdHRoaXMuZ2FudHRDb21wb25lbnQgPSBuZXcgR2FudHRDb21wb25lbnQoXHJcblx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHR0aGlzLnJvb3RDb250YWluZXJFbCxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdG9uVGFza1NlbGVjdGVkOiB0aGlzLmhhbmRsZVRhc2tTZWxlY3Rpb24uYmluZCh0aGlzKSxcclxuXHRcdFx0XHRvblRhc2tDb21wbGV0ZWQ6IHRoaXMudG9nZ2xlVGFza0NvbXBsZXRpb24uYmluZCh0aGlzKSxcclxuXHRcdFx0XHRvblRhc2tDb250ZXh0TWVudTogdGhpcy5oYW5kbGVUYXNrQ29udGV4dE1lbnUuYmluZCh0aGlzKSxcclxuXHRcdFx0fVxyXG5cdFx0KTtcclxuXHRcdHRoaXMuYWRkQ2hpbGQodGhpcy5nYW50dENvbXBvbmVudCk7XHJcblx0XHR0aGlzLmdhbnR0Q29tcG9uZW50LmNvbnRhaW5lckVsLmhpZGUoKTtcclxuXHJcblx0XHR0aGlzLmhhYml0Q29tcG9uZW50ID0gbmV3IEhhYml0KHRoaXMucGx1Z2luLCB0aGlzLnJvb3RDb250YWluZXJFbCk7XHJcblx0XHR0aGlzLmFkZENoaWxkKHRoaXMuaGFiaXRDb21wb25lbnQpO1xyXG5cdFx0dGhpcy5oYWJpdENvbXBvbmVudC5jb250YWluZXJFbC5oaWRlKCk7XHJcblxyXG5cdFx0dGhpcy5kZXRhaWxzQ29tcG9uZW50ID0gbmV3IFRhc2tEZXRhaWxzQ29tcG9uZW50KFxyXG5cdFx0XHR0aGlzLnJvb3RDb250YWluZXJFbCxcclxuXHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdHRoaXMucGx1Z2luXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5hZGRDaGlsZCh0aGlzLmRldGFpbHNDb21wb25lbnQpO1xyXG5cdFx0dGhpcy5kZXRhaWxzQ29tcG9uZW50LmxvYWQoKTtcclxuXHJcblx0XHQvLyDliJ3lp4vljJbnu5/kuIDnmoTop4blm77nu4Tku7bnrqHnkIblmahcclxuXHRcdHRoaXMudmlld0NvbXBvbmVudE1hbmFnZXIgPSBuZXcgVmlld0NvbXBvbmVudE1hbmFnZXIoXHJcblx0XHRcdHRoaXMsXHJcblx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0dGhpcy5yb290Q29udGFpbmVyRWwsXHJcblx0XHRcdHtcclxuXHRcdFx0XHRvblRhc2tTZWxlY3RlZDogdGhpcy5oYW5kbGVUYXNrU2VsZWN0aW9uLmJpbmQodGhpcyksXHJcblx0XHRcdFx0b25UYXNrQ29tcGxldGVkOiB0aGlzLnRvZ2dsZVRhc2tDb21wbGV0aW9uLmJpbmQodGhpcyksXHJcblx0XHRcdFx0b25UYXNrQ29udGV4dE1lbnU6IHRoaXMuaGFuZGxlVGFza0NvbnRleHRNZW51LmJpbmQodGhpcyksXHJcblx0XHRcdFx0b25UYXNrU3RhdHVzVXBkYXRlOlxyXG5cdFx0XHRcdFx0dGhpcy5oYW5kbGVLYW5iYW5UYXNrU3RhdHVzVXBkYXRlLmJpbmQodGhpcyksXHJcblx0XHRcdFx0b25FdmVudENvbnRleHRNZW51OiB0aGlzLmhhbmRsZVRhc2tDb250ZXh0TWVudS5iaW5kKHRoaXMpLFxyXG5cdFx0XHRcdG9uVGFza1VwZGF0ZTogdGhpcy5oYW5kbGVUYXNrVXBkYXRlLmJpbmQodGhpcyksXHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblxyXG5cdFx0dGhpcy5hZGRDaGlsZCh0aGlzLnZpZXdDb21wb25lbnRNYW5hZ2VyKTtcclxuXHJcblx0XHR0aGlzLnNldHVwQ29tcG9uZW50RXZlbnRzKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNyZWF0ZVNpZGViYXJUb2dnbGUoKSB7XHJcblx0XHRjb25zdCB0b2dnbGVDb250YWluZXIgPSAoXHJcblx0XHRcdHRoaXMuaGVhZGVyRWwuZmluZChcIi52aWV3LWhlYWRlci1uYXYtYnV0dG9uc1wiKSBhcyBIVE1MRWxlbWVudFxyXG5cdFx0KT8uY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInBhbmVsLXRvZ2dsZS1jb250YWluZXJcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdGlmICghdG9nZ2xlQ29udGFpbmVyKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXHJcblx0XHRcdFx0XCJDb3VsZCBub3QgZmluZCAudmlldy1oZWFkZXItbmF2LWJ1dHRvbnMgdG8gYWRkIHNpZGViYXIgdG9nZ2xlLlwiXHJcblx0XHRcdCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnNpZGViYXJUb2dnbGVCdG4gPSB0b2dnbGVDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInBhbmVsLXRvZ2dsZS1idG5cIixcclxuXHRcdH0pO1xyXG5cdFx0bmV3IEJ1dHRvbkNvbXBvbmVudCh0aGlzLnNpZGViYXJUb2dnbGVCdG4pXHJcblx0XHRcdC5zZXRJY29uKFwicGFuZWwtbGVmdC1kYXNoZWRcIilcclxuXHRcdFx0LnNldFRvb2x0aXAodChcIlRvZ2dsZSBTaWRlYmFyXCIpKVxyXG5cdFx0XHQuc2V0Q2xhc3MoXCJjbGlja2FibGUtaWNvblwiKVxyXG5cdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy50b2dnbGVTaWRlYmFyKCk7XHJcblx0XHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVUYXNrTWFyaygpIHtcclxuXHRcdHRoaXMudGl0bGVFbC5zZXRUZXh0KFxyXG5cdFx0XHR0KFwie3tudW19fSBUYXNrc1wiLCB7XHJcblx0XHRcdFx0aW50ZXJwb2xhdGlvbjoge1xyXG5cdFx0XHRcdFx0bnVtOiB0aGlzLnRhc2tzLmxlbmd0aCxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY3JlYXRlQWN0aW9uQnV0dG9ucygpIHtcclxuXHRcdHRoaXMuZGV0YWlsc1RvZ2dsZUJ0biA9IHRoaXMuYWRkQWN0aW9uKFxyXG5cdFx0XHRcInBhbmVsLXJpZ2h0LWRhc2hlZFwiLFxyXG5cdFx0XHR0KFwiRGV0YWlsc1wiKSxcclxuXHRcdFx0KCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMudG9nZ2xlRGV0YWlsc1Zpc2liaWxpdHkoIXRoaXMuaXNEZXRhaWxzVmlzaWJsZSk7XHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblxyXG5cdFx0dGhpcy5kZXRhaWxzVG9nZ2xlQnRuLnRvZ2dsZUNsYXNzKFwicGFuZWwtdG9nZ2xlLWJ0blwiLCB0cnVlKTtcclxuXHRcdHRoaXMuZGV0YWlsc1RvZ2dsZUJ0bi50b2dnbGVDbGFzcyhcImlzLWFjdGl2ZVwiLCB0aGlzLmlzRGV0YWlsc1Zpc2libGUpO1xyXG5cclxuXHRcdHRoaXMuYWRkQWN0aW9uKFwibm90ZWJvb2stcGVuXCIsIHQoXCJDYXB0dXJlXCIpLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IG1vZGFsID0gbmV3IFF1aWNrQ2FwdHVyZU1vZGFsKFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLmFwcCxcclxuXHRcdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0XHR7fSxcclxuXHRcdFx0XHR0cnVlXHJcblx0XHRcdCk7XHJcblx0XHRcdG1vZGFsLm9wZW4oKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuYWRkQWN0aW9uKFwiZmlsdGVyXCIsIHQoXCJGaWx0ZXJcIiksIChlKSA9PiB7XHJcblx0XHRcdGlmIChQbGF0Zm9ybS5pc0Rlc2t0b3ApIHtcclxuXHRcdFx0XHRjb25zdCBwb3BvdmVyID0gbmV3IFZpZXdUYXNrRmlsdGVyUG9wb3ZlcihcclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luLmFwcCxcclxuXHRcdFx0XHRcdHVuZGVmaW5lZCxcclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0Ly8g6K6+572u5YWz6Zet5Zue6LCDIC0g546w5Zyo5Li76KaB55So5LqO5aSE55CG5Y+W5raI5pON5L2cXHJcblx0XHRcdFx0cG9wb3Zlci5vbkNsb3NlID0gKGZpbHRlclN0YXRlKSA9PiB7XHJcblx0XHRcdFx0XHQvLyDnlLHkuo7kvb/nlKjkuoblrp7ml7bkuovku7bnm5HlkKzvvIzov5nph4zkuI3pnIDopoHlho3miYvliqjmm7TmlrDnirbmgIFcclxuXHRcdFx0XHRcdC8vIOWPr+S7peeUqOS6juWkhOeQhueJueauiueahOWFs+mXremAu+i+ke+8jOWmguaenOmcgOimgeeahOivnVxyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdC8vIOW9k+aJk+W8gOaXtu+8jOiuvue9ruWIneWni+i/h+a7pOWZqOeKtuaAgVxyXG5cdFx0XHRcdHRoaXMuYXBwLndvcmtzcGFjZS5vbkxheW91dFJlYWR5KCgpID0+IHtcclxuXHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0dGhpcy5saXZlRmlsdGVyU3RhdGUgJiZcclxuXHRcdFx0XHRcdFx0XHRwb3BvdmVyLnRhc2tGaWx0ZXJDb21wb25lbnRcclxuXHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0Ly8g5L2/55So57G75Z6L5pat6KiA6Kej5Yaz6Z2e56m66Zeu6aKYXHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgZmlsdGVyU3RhdGUgPSB0aGlzXHJcblx0XHRcdFx0XHRcdFx0XHQubGl2ZUZpbHRlclN0YXRlIGFzIFJvb3RGaWx0ZXJTdGF0ZTtcclxuXHRcdFx0XHRcdFx0XHRwb3BvdmVyLnRhc2tGaWx0ZXJDb21wb25lbnQubG9hZEZpbHRlclN0YXRlKFxyXG5cdFx0XHRcdFx0XHRcdFx0ZmlsdGVyU3RhdGVcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9LCAxMDApO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRwb3BvdmVyLnNob3dBdFBvc2l0aW9uKHt4OiBlLmNsaWVudFgsIHk6IGUuY2xpZW50WX0pO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGNvbnN0IG1vZGFsID0gbmV3IFZpZXdUYXNrRmlsdGVyTW9kYWwoXHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbi5hcHAsXHJcblx0XHRcdFx0XHR0aGlzLmxlYWYuaWQsXHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpblxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdC8vIOiuvue9ruWFs+mXreWbnuiwgyAtIOeOsOWcqOS4u+imgeeUqOS6juWkhOeQhuWPlua2iOaTjeS9nFxyXG5cdFx0XHRcdG1vZGFsLmZpbHRlckNsb3NlQ2FsbGJhY2sgPSAoZmlsdGVyU3RhdGUpID0+IHtcclxuXHRcdFx0XHRcdC8vIOeUseS6juS9v+eUqOS6huWunuaXtuS6i+S7tuebkeWQrO+8jOi/memHjOS4jemcgOimgeWGjeaJi+WKqOabtOaWsOeKtuaAgVxyXG5cdFx0XHRcdFx0Ly8g5Y+v5Lul55So5LqO5aSE55CG54m55q6K55qE5YWz6Zet6YC76L6R77yM5aaC5p6c6ZyA6KaB55qE6K+dXHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0bW9kYWwub3BlbigpO1xyXG5cclxuXHRcdFx0XHQvLyDorr7nva7liJ3lp4vov4fmu6TlmajnirbmgIFcclxuXHRcdFx0XHRpZiAodGhpcy5saXZlRmlsdGVyU3RhdGUgJiYgbW9kYWwudGFza0ZpbHRlckNvbXBvbmVudCkge1xyXG5cdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIOS9v+eUqOexu+Wei+aWreiogOino+WGs+mdnuepuumXrumimFxyXG5cdFx0XHRcdFx0XHRjb25zdCBmaWx0ZXJTdGF0ZSA9IHRoaXNcclxuXHRcdFx0XHRcdFx0XHQubGl2ZUZpbHRlclN0YXRlIGFzIFJvb3RGaWx0ZXJTdGF0ZTtcclxuXHRcdFx0XHRcdFx0bW9kYWwudGFza0ZpbHRlckNvbXBvbmVudC5sb2FkRmlsdGVyU3RhdGUoZmlsdGVyU3RhdGUpO1xyXG5cdFx0XHRcdFx0fSwgMTAwKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIOmHjee9ruetm+mAieWZqOaMiemSrueahOmAu+i+keenu+WIsHVwZGF0ZUFjdGlvbkJ1dHRvbnPmlrnms5XkuK1cclxuXHRcdHRoaXMudXBkYXRlQWN0aW9uQnV0dG9ucygpO1xyXG5cdH1cclxuXHJcblx0Ly8g5re75Yqg5bqU55So5b2T5YmN6L+H5ruk5Zmo54q25oCB55qE5pa55rOVXHJcblx0cHJpdmF0ZSBhcHBseUN1cnJlbnRGaWx0ZXIoKSB7XHJcblx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XCLlupTnlKjlvZPliY3ov4fmu6TnirbmgIE6XCIsXHJcblx0XHRcdHRoaXMubGl2ZUZpbHRlclN0YXRlID8gXCLmnInlrp7ml7bnrZvpgInlmahcIiA6IFwi5peg5a6e5pe2562b6YCJ5ZmoXCIsXHJcblx0XHRcdHRoaXMuY3VycmVudEZpbHRlclN0YXRlID8gXCLmnInov4fmu6TlmahcIiA6IFwi5peg6L+H5ruk5ZmoXCJcclxuXHRcdCk7XHJcblx0XHQvLyDpgJrov4d0cmlnZ2VyVmlld1VwZGF0ZemHjeaWsOWKoOi9veS7u+WKoVxyXG5cdFx0dGhpcy50cmlnZ2VyVmlld1VwZGF0ZSgpO1xyXG5cdH1cclxuXHJcblx0b25QYW5lTWVudShtZW51OiBNZW51KSB7XHJcblx0XHQvLyBBZGQgc2F2ZWQgZmlsdGVycyBzZWN0aW9uXHJcblx0XHRjb25zdCBzYXZlZENvbmZpZ3MgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5maWx0ZXJDb25maWcuc2F2ZWRDb25maWdzO1xyXG5cdFx0aWYgKHNhdmVkQ29uZmlncyAmJiBzYXZlZENvbmZpZ3MubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJTYXZlZCBGaWx0ZXJzXCIpKTtcclxuXHRcdFx0XHRpdGVtLnNldEljb24oXCJmaWx0ZXJcIik7XHJcblx0XHRcdFx0Y29uc3Qgc3VibWVudSA9IGl0ZW0uc2V0U3VibWVudSgpO1xyXG5cclxuXHRcdFx0XHRzYXZlZENvbmZpZ3MuZm9yRWFjaCgoY29uZmlnKSA9PiB7XHJcblx0XHRcdFx0XHRzdWJtZW51LmFkZEl0ZW0oKHN1Ykl0ZW0pID0+IHtcclxuXHRcdFx0XHRcdFx0c3ViSXRlbS5zZXRUaXRsZShjb25maWcubmFtZSk7XHJcblx0XHRcdFx0XHRcdHN1Ykl0ZW0uc2V0SWNvbihcInNlYXJjaFwiKTtcclxuXHRcdFx0XHRcdFx0aWYgKGNvbmZpZy5kZXNjcmlwdGlvbikge1xyXG5cdFx0XHRcdFx0XHRcdHN1Ykl0ZW0uc2V0U2VjdGlvbihjb25maWcuZGVzY3JpcHRpb24pO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdHN1Ykl0ZW0ub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5hcHBseVNhdmVkRmlsdGVyKGNvbmZpZyk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdHN1Ym1lbnUuYWRkU2VwYXJhdG9yKCk7XHJcblx0XHRcdFx0c3VibWVudS5hZGRJdGVtKChzdWJJdGVtKSA9PiB7XHJcblx0XHRcdFx0XHRzdWJJdGVtLnNldFRpdGxlKHQoXCJNYW5hZ2UgU2F2ZWQgRmlsdGVyc1wiKSk7XHJcblx0XHRcdFx0XHRzdWJJdGVtLnNldEljb24oXCJzZXR0aW5nc1wiKTtcclxuXHRcdFx0XHRcdHN1Ykl0ZW0ub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IG1vZGFsID0gbmV3IEZpbHRlckNvbmZpZ01vZGFsKFxyXG5cdFx0XHRcdFx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHRcdFx0XHRcdFwibG9hZFwiLFxyXG5cdFx0XHRcdFx0XHRcdHVuZGVmaW5lZCxcclxuXHRcdFx0XHRcdFx0XHR1bmRlZmluZWQsXHJcblx0XHRcdFx0XHRcdFx0KGNvbmZpZykgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5hcHBseVNhdmVkRmlsdGVyKGNvbmZpZyk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRtb2RhbC5vcGVuKCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdG1lbnUuYWRkU2VwYXJhdG9yKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKFxyXG5cdFx0XHR0aGlzLmxpdmVGaWx0ZXJTdGF0ZSAmJlxyXG5cdFx0XHR0aGlzLmxpdmVGaWx0ZXJTdGF0ZS5maWx0ZXJHcm91cHMgJiZcclxuXHRcdFx0dGhpcy5saXZlRmlsdGVyU3RhdGUuZmlsdGVyR3JvdXBzLmxlbmd0aCA+IDBcclxuXHRcdCkge1xyXG5cdFx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJSZXNldCBGaWx0ZXJcIikpO1xyXG5cdFx0XHRcdGl0ZW0uc2V0SWNvbihcInJlc2V0XCIpO1xyXG5cdFx0XHRcdGl0ZW0ub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLnJlc2V0Q3VycmVudEZpbHRlcigpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0bWVudS5hZGRTZXBhcmF0b3IoKTtcclxuXHRcdH1cclxuXHJcblx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0aXRlbS5zZXRUaXRsZSh0KFwiU2V0dGluZ3NcIikpO1xyXG5cdFx0XHRpdGVtLnNldEljb24oXCJnZWFyXCIpO1xyXG5cdFx0XHRpdGVtLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMuYXBwLnNldHRpbmcub3BlbigpO1xyXG5cdFx0XHRcdHRoaXMuYXBwLnNldHRpbmcub3BlblRhYkJ5SWQodGhpcy5wbHVnaW4ubWFuaWZlc3QuaWQpO1xyXG5cclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5nVGFiLm9wZW5UYWIoXCJ2aWV3LXNldHRpbmdzXCIpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pXHJcblx0XHRcdC5hZGRTZXBhcmF0b3IoKVxyXG5cdFx0XHQuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRcdGl0ZW0uc2V0VGl0bGUodChcIlJlaW5kZXhcIikpO1xyXG5cdFx0XHRcdGl0ZW0uc2V0SWNvbihcInJvdGF0ZS1jY3dcIik7XHJcblx0XHRcdFx0aXRlbS5vbkNsaWNrKGFzeW5jICgpID0+IHtcclxuXHRcdFx0XHRcdG5ldyBDb25maXJtTW9kYWwodGhpcy5wbHVnaW4sIHtcclxuXHRcdFx0XHRcdFx0dGl0bGU6IHQoXCJSZWluZGV4XCIpLFxyXG5cdFx0XHRcdFx0XHRtZXNzYWdlOiB0KFxyXG5cdFx0XHRcdFx0XHRcdFwiQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGZvcmNlIHJlaW5kZXggYWxsIHRhc2tzP1wiXHJcblx0XHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHRcdGNvbmZpcm1UZXh0OiB0KFwiUmVpbmRleFwiKSxcclxuXHRcdFx0XHRcdFx0Y2FuY2VsVGV4dDogdChcIkNhbmNlbFwiKSxcclxuXHRcdFx0XHRcdFx0b25Db25maXJtOiBhc3luYyAoY29uZmlybWVkKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0aWYgKCFjb25maXJtZWQpIHJldHVybjtcclxuXHRcdFx0XHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKHRoaXMucGx1Z2luLmRhdGFmbG93T3JjaGVzdHJhdG9yKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGF3YWl0IHRoaXMucGx1Z2luLmRhdGFmbG93T3JjaGVzdHJhdG9yLnJlYnVpbGQoKTtcclxuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcIkRhdGFmbG93IG9yY2hlc3RyYXRvciBub3QgYXZhaWxhYmxlXCJcclxuXHRcdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcclxuXHRcdFx0XHRcdFx0XHRcdFx0XCJGYWlsZWQgdG8gZm9yY2UgcmVpbmRleCB0YXNrczpcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0ZXJyb3JcclxuXHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0XHRuZXcgTm90aWNlKHQoXCJGYWlsZWQgdG8gZm9yY2UgcmVpbmRleCB0YXNrc1wiKSk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0fSkub3BlbigpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gbWVudTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgdG9nZ2xlU2lkZWJhcigpIHtcclxuXHRcdHRoaXMuaXNTaWRlYmFyQ29sbGFwc2VkID0gIXRoaXMuaXNTaWRlYmFyQ29sbGFwc2VkO1xyXG5cdFx0dGhpcy5yb290Q29udGFpbmVyRWwudG9nZ2xlQ2xhc3MoXHJcblx0XHRcdFwic2lkZWJhci1jb2xsYXBzZWRcIixcclxuXHRcdFx0dGhpcy5pc1NpZGViYXJDb2xsYXBzZWRcclxuXHRcdCk7XHJcblxyXG5cdFx0dGhpcy5zaWRlYmFyQ29tcG9uZW50LnNldENvbGxhcHNlZCh0aGlzLmlzU2lkZWJhckNvbGxhcHNlZCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHRvZ2dsZURldGFpbHNWaXNpYmlsaXR5KHZpc2libGU6IGJvb2xlYW4pIHtcclxuXHRcdHRoaXMuaXNEZXRhaWxzVmlzaWJsZSA9IHZpc2libGU7XHJcblx0XHR0aGlzLnJvb3RDb250YWluZXJFbC50b2dnbGVDbGFzcyhcImRldGFpbHMtdmlzaWJsZVwiLCB2aXNpYmxlKTtcclxuXHRcdHRoaXMucm9vdENvbnRhaW5lckVsLnRvZ2dsZUNsYXNzKFwiZGV0YWlscy1oaWRkZW5cIiwgIXZpc2libGUpO1xyXG5cclxuXHRcdHRoaXMuZGV0YWlsc0NvbXBvbmVudC5zZXRWaXNpYmxlKHZpc2libGUpO1xyXG5cdFx0aWYgKHRoaXMuZGV0YWlsc1RvZ2dsZUJ0bikge1xyXG5cdFx0XHR0aGlzLmRldGFpbHNUb2dnbGVCdG4udG9nZ2xlQ2xhc3MoXCJpcy1hY3RpdmVcIiwgdmlzaWJsZSk7XHJcblx0XHRcdHRoaXMuZGV0YWlsc1RvZ2dsZUJ0bi5zZXRBdHRyaWJ1dGUoXHJcblx0XHRcdFx0XCJhcmlhLWxhYmVsXCIsXHJcblx0XHRcdFx0dmlzaWJsZSA/IHQoXCJIaWRlIERldGFpbHNcIikgOiB0KFwiU2hvdyBEZXRhaWxzXCIpXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKCF2aXNpYmxlKSB7XHJcblx0XHRcdHRoaXMuY3VycmVudFNlbGVjdGVkVGFza0lkID0gbnVsbDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc2V0dXBDb21wb25lbnRFdmVudHMoKSB7XHJcblx0XHR0aGlzLmRldGFpbHNDb21wb25lbnQub25UYXNrVG9nZ2xlQ29tcGxldGUgPSAodGFzazogVGFzaykgPT5cclxuXHRcdFx0dGhpcy50b2dnbGVUYXNrQ29tcGxldGlvbih0YXNrKTtcclxuXHJcblx0XHQvLyBEZXRhaWxzIGNvbXBvbmVudCBoYW5kbGVyc1xyXG5cdFx0dGhpcy5kZXRhaWxzQ29tcG9uZW50Lm9uVGFza0VkaXQgPSAodGFzazogVGFzaykgPT4gdGhpcy5lZGl0VGFzayh0YXNrKTtcclxuXHRcdHRoaXMuZGV0YWlsc0NvbXBvbmVudC5vblRhc2tVcGRhdGUgPSBhc3luYyAoXHJcblx0XHRcdG9yaWdpbmFsVGFzazogVGFzayxcclxuXHRcdFx0dXBkYXRlZFRhc2s6IFRhc2tcclxuXHRcdCkgPT4ge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcInRyaWdnZXJlZCBieSBkZXRhaWxzQ29tcG9uZW50XCIsXHJcblx0XHRcdFx0b3JpZ2luYWxUYXNrLFxyXG5cdFx0XHRcdHVwZGF0ZWRUYXNrXHJcblx0XHRcdCk7XHJcblx0XHRcdGF3YWl0IHRoaXMudXBkYXRlVGFzayhvcmlnaW5hbFRhc2ssIHVwZGF0ZWRUYXNrKTtcclxuXHRcdH07XHJcblx0XHR0aGlzLmRldGFpbHNDb21wb25lbnQudG9nZ2xlRGV0YWlsc1Zpc2liaWxpdHkgPSAodmlzaWJsZTogYm9vbGVhbikgPT4ge1xyXG5cdFx0XHR0aGlzLnRvZ2dsZURldGFpbHNWaXNpYmlsaXR5KHZpc2libGUpO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBTaWRlYmFyIGNvbXBvbmVudCBoYW5kbGVyc1xyXG5cdFx0dGhpcy5zaWRlYmFyQ29tcG9uZW50Lm9uUHJvamVjdFNlbGVjdGVkID0gKHByb2plY3Q6IHN0cmluZykgPT4ge1xyXG5cdFx0XHR0aGlzLnN3aXRjaFZpZXcoXCJwcm9qZWN0c1wiLCBwcm9qZWN0KTtcclxuXHRcdH07XHJcblx0XHR0aGlzLnNpZGViYXJDb21wb25lbnQub25WaWV3TW9kZUNoYW5nZWQgPSAodmlld0lkOiBWaWV3TW9kZSkgPT4ge1xyXG5cdFx0XHR0aGlzLnN3aXRjaFZpZXcodmlld0lkKTtcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHN3aXRjaFZpZXcoXHJcblx0XHR2aWV3SWQ6IFZpZXdNb2RlLFxyXG5cdFx0cHJvamVjdD86IHN0cmluZyB8IG51bGwsXHJcblx0XHRmb3JjZVJlZnJlc2g6IGJvb2xlYW4gPSBmYWxzZVxyXG5cdCkge1xyXG5cdFx0dGhpcy5jdXJyZW50Vmlld0lkID0gdmlld0lkO1xyXG5cdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFwiW1Rhc2tWaWV3XSBTd2l0Y2hpbmcgdmlldyB0bzpcIixcclxuXHRcdFx0dmlld0lkLFxyXG5cdFx0XHRcIlByb2plY3Q6XCIsXHJcblx0XHRcdHByb2plY3QsXHJcblx0XHRcdFwiRm9yY2VSZWZyZXNoOlwiLFxyXG5cdFx0XHRmb3JjZVJlZnJlc2hcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHNpZGViYXIgdG8gcmVmbGVjdCBjdXJyZW50IHZpZXdcclxuXHRcdHRoaXMuc2lkZWJhckNvbXBvbmVudC5zZXRWaWV3TW9kZSh2aWV3SWQpO1xyXG5cclxuXHRcdC8vIEhpZGUgYWxsIGNvbXBvbmVudHMgZmlyc3RcclxuXHRcdHRoaXMuY29udGVudENvbXBvbmVudC5jb250YWluZXJFbC5oaWRlKCk7XHJcblx0XHR0aGlzLmZvcmVjYXN0Q29tcG9uZW50LmNvbnRhaW5lckVsLmhpZGUoKTtcclxuXHRcdHRoaXMudGFnc0NvbXBvbmVudC5jb250YWluZXJFbC5oaWRlKCk7XHJcblx0XHR0aGlzLnByb2plY3RzQ29tcG9uZW50LmNvbnRhaW5lckVsLmhpZGUoKTtcclxuXHRcdHRoaXMucmV2aWV3Q29tcG9uZW50LmNvbnRhaW5lckVsLmhpZGUoKTtcclxuXHRcdC8vIEhpZGUgYW55IHZpc2libGUgVHdvQ29sdW1uVmlldyBjb21wb25lbnRzXHJcblx0XHR0aGlzLnR3b0NvbHVtblZpZXdDb21wb25lbnRzLmZvckVhY2goKGNvbXBvbmVudCkgPT4ge1xyXG5cdFx0XHRjb21wb25lbnQuY29udGFpbmVyRWwuaGlkZSgpO1xyXG5cdFx0fSk7XHJcblx0XHQvLyBIaWRlIGFsbCBzcGVjaWFsIHZpZXcgY29tcG9uZW50c1xyXG5cdFx0dGhpcy52aWV3Q29tcG9uZW50TWFuYWdlci5oaWRlQWxsQ29tcG9uZW50cygpO1xyXG5cdFx0dGhpcy5oYWJpdENvbXBvbmVudC5jb250YWluZXJFbC5oaWRlKCk7XHJcblx0XHR0aGlzLmNhbGVuZGFyQ29tcG9uZW50LmNvbnRhaW5lckVsLmhpZGUoKTtcclxuXHRcdHRoaXMua2FuYmFuQ29tcG9uZW50LmNvbnRhaW5lckVsLmhpZGUoKTtcclxuXHRcdHRoaXMuZ2FudHRDb21wb25lbnQuY29udGFpbmVyRWwuaGlkZSgpO1xyXG5cclxuXHRcdGxldCB0YXJnZXRDb21wb25lbnQ6IGFueSA9IG51bGw7XHJcblx0XHRsZXQgbW9kZUZvckNvbXBvbmVudDogVmlld01vZGUgPSB2aWV3SWQ7XHJcblxyXG5cdFx0Ly8gR2V0IHZpZXcgY29uZmlndXJhdGlvbiB0byBjaGVjayBmb3Igc3BlY2lmaWMgdmlldyB0eXBlc1xyXG5cdFx0Y29uc3Qgdmlld0NvbmZpZyA9IGdldFZpZXdTZXR0aW5nT3JEZWZhdWx0KHRoaXMucGx1Z2luLCB2aWV3SWQpO1xyXG5cclxuXHRcdC8vIEhhbmRsZSBUd29Db2x1bW4gdmlld3NcclxuXHRcdGlmICh2aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnPy52aWV3VHlwZSA9PT0gXCJ0d29jb2x1bW5cIikge1xyXG5cdFx0XHQvLyBHZXQgb3IgY3JlYXRlIFR3b0NvbHVtblZpZXcgY29tcG9uZW50XHJcblx0XHRcdGlmICghdGhpcy50d29Db2x1bW5WaWV3Q29tcG9uZW50cy5oYXModmlld0lkKSkge1xyXG5cdFx0XHRcdC8vIENyZWF0ZSBhIG5ldyBUd29Db2x1bW5WaWV3IGNvbXBvbmVudFxyXG5cdFx0XHRcdGNvbnN0IHR3b0NvbHVtbkNvbmZpZyA9XHJcblx0XHRcdFx0XHR2aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnIGFzIFR3b0NvbHVtblNwZWNpZmljQ29uZmlnO1xyXG5cdFx0XHRcdGNvbnN0IHR3b0NvbHVtbkNvbXBvbmVudCA9IG5ldyBUYXNrUHJvcGVydHlUd29Db2x1bW5WaWV3KFxyXG5cdFx0XHRcdFx0dGhpcy5yb290Q29udGFpbmVyRWwsXHJcblx0XHRcdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHRcdFx0dHdvQ29sdW1uQ29uZmlnLFxyXG5cdFx0XHRcdFx0dmlld0lkXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHR0aGlzLmFkZENoaWxkKHR3b0NvbHVtbkNvbXBvbmVudCk7XHJcblxyXG5cdFx0XHRcdC8vIFNldCB1cCBldmVudCBoYW5kbGVyc1xyXG5cdFx0XHRcdHR3b0NvbHVtbkNvbXBvbmVudC5vblRhc2tTZWxlY3RlZCA9ICh0YXNrKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLmhhbmRsZVRhc2tTZWxlY3Rpb24odGFzayk7XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHR0d29Db2x1bW5Db21wb25lbnQub25UYXNrQ29tcGxldGVkID0gKHRhc2spID0+IHtcclxuXHRcdFx0XHRcdHRoaXMudG9nZ2xlVGFza0NvbXBsZXRpb24odGFzayk7XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHR0d29Db2x1bW5Db21wb25lbnQub25UYXNrQ29udGV4dE1lbnUgPSAoZXZlbnQsIHRhc2spID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuaGFuZGxlVGFza0NvbnRleHRNZW51KGV2ZW50LCB0YXNrKTtcclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHQvLyBTdG9yZSBmb3IgbGF0ZXIgdXNlXHJcblx0XHRcdFx0dGhpcy50d29Db2x1bW5WaWV3Q29tcG9uZW50cy5zZXQodmlld0lkLCB0d29Db2x1bW5Db21wb25lbnQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBHZXQgdGhlIGNvbXBvbmVudCB0byBkaXNwbGF5XHJcblx0XHRcdHRhcmdldENvbXBvbmVudCA9IHRoaXMudHdvQ29sdW1uVmlld0NvbXBvbmVudHMuZ2V0KHZpZXdJZCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyDmo4Dmn6Xnibnmrorop4blm77nsbvlnovvvIjln7rkuo4gc3BlY2lmaWNDb25maWcg5oiW5Y6f5aeLIHZpZXdJZO+8iVxyXG5cdFx0XHRjb25zdCBzcGVjaWZpY1ZpZXdUeXBlID0gdmlld0NvbmZpZy5zcGVjaWZpY0NvbmZpZz8udmlld1R5cGU7XHJcblxyXG5cdFx0XHQvLyDmo4Dmn6XmmK/lkKbkuLrnibnmrorop4blm77vvIzkvb/nlKjnu5/kuIDnrqHnkIblmajlpITnkIZcclxuXHRcdFx0aWYgKHRoaXMudmlld0NvbXBvbmVudE1hbmFnZXIuaXNTcGVjaWFsVmlldyh2aWV3SWQpKSB7XHJcblx0XHRcdFx0dGFyZ2V0Q29tcG9uZW50ID1cclxuXHRcdFx0XHRcdHRoaXMudmlld0NvbXBvbmVudE1hbmFnZXIuc2hvd0NvbXBvbmVudCh2aWV3SWQpO1xyXG5cdFx0XHR9IGVsc2UgaWYgKFxyXG5cdFx0XHRcdHNwZWNpZmljVmlld1R5cGUgPT09IFwiZm9yZWNhc3RcIiB8fFxyXG5cdFx0XHRcdHZpZXdJZCA9PT0gXCJmb3JlY2FzdFwiXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHRhcmdldENvbXBvbmVudCA9IHRoaXMuZm9yZWNhc3RDb21wb25lbnQ7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gU3RhbmRhcmQgdmlldyB0eXBlc1xyXG5cdFx0XHRcdHN3aXRjaCAodmlld0lkKSB7XHJcblx0XHRcdFx0XHRjYXNlIFwiaGFiaXRcIjpcclxuXHRcdFx0XHRcdFx0dGFyZ2V0Q29tcG9uZW50ID0gdGhpcy5oYWJpdENvbXBvbmVudDtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIFwidGFnc1wiOlxyXG5cdFx0XHRcdFx0XHR0YXJnZXRDb21wb25lbnQgPSB0aGlzLnRhZ3NDb21wb25lbnQ7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcInByb2plY3RzXCI6XHJcblx0XHRcdFx0XHRcdHRhcmdldENvbXBvbmVudCA9IHRoaXMucHJvamVjdHNDb21wb25lbnQ7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcInJldmlld1wiOlxyXG5cdFx0XHRcdFx0XHR0YXJnZXRDb21wb25lbnQgPSB0aGlzLnJldmlld0NvbXBvbmVudDtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIFwiaW5ib3hcIjpcclxuXHRcdFx0XHRcdGNhc2UgXCJmbGFnZ2VkXCI6XHJcblx0XHRcdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdFx0XHR0YXJnZXRDb21wb25lbnQgPSB0aGlzLmNvbnRlbnRDb21wb25lbnQ7XHJcblx0XHRcdFx0XHRcdG1vZGVGb3JDb21wb25lbnQgPSB2aWV3SWQ7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0YXJnZXRDb21wb25lbnQpIHtcclxuXHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0YEFjdGl2YXRpbmcgY29tcG9uZW50IGZvciB2aWV3ICR7dmlld0lkfWAsXHJcblx0XHRcdFx0dGFyZ2V0Q29tcG9uZW50LmNvbnN0cnVjdG9yLm5hbWVcclxuXHRcdFx0KTtcclxuXHRcdFx0dGFyZ2V0Q29tcG9uZW50LmNvbnRhaW5lckVsLnNob3coKTtcclxuXHRcdFx0aWYgKHR5cGVvZiB0YXJnZXRDb21wb25lbnQuc2V0VGFza3MgPT09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHRcdC8vIOS9v+eUqOmrmOe6p+i/h+a7pOWZqOeKtuaAge+8jOehruS/neS8oOmAkuacieaViOeahOi/h+a7pOWZqFxyXG5cdFx0XHRcdGNvbnN0IGZpbHRlck9wdGlvbnM6IHtcclxuXHRcdFx0XHRcdGFkdmFuY2VkRmlsdGVyPzogUm9vdEZpbHRlclN0YXRlO1xyXG5cdFx0XHRcdFx0dGV4dFF1ZXJ5Pzogc3RyaW5nO1xyXG5cdFx0XHRcdH0gPSB7fTtcclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHR0aGlzLmN1cnJlbnRGaWx0ZXJTdGF0ZSAmJlxyXG5cdFx0XHRcdFx0dGhpcy5jdXJyZW50RmlsdGVyU3RhdGUuZmlsdGVyR3JvdXBzICYmXHJcblx0XHRcdFx0XHR0aGlzLmN1cnJlbnRGaWx0ZXJTdGF0ZS5maWx0ZXJHcm91cHMubGVuZ3RoID4gMFxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXCLlupTnlKjpq5jnuqfnrZvpgInlmajliLDop4blm746XCIsIHZpZXdJZCk7XHJcblx0XHRcdFx0XHRmaWx0ZXJPcHRpb25zLmFkdmFuY2VkRmlsdGVyID0gdGhpcy5jdXJyZW50RmlsdGVyU3RhdGU7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcInRhc2tzXCIsIHRoaXMudGFza3MpO1xyXG5cclxuXHRcdFx0XHRsZXQgZmlsdGVyZWRUYXNrcyA9IGZpbHRlclRhc2tzKFxyXG5cdFx0XHRcdFx0dGhpcy50YXNrcyxcclxuXHRcdFx0XHRcdHZpZXdJZCxcclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHRcdFx0ZmlsdGVyT3B0aW9uc1xyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdC8vIEZpbHRlciBvdXQgYmFkZ2UgdGFza3MgZm9yIGZvcmVjYXN0IHZpZXcgLSB0aGV5IHNob3VsZCBvbmx5IGFwcGVhciBpbiBldmVudCB2aWV3XHJcblx0XHRcdFx0aWYgKHZpZXdJZCA9PT0gXCJmb3JlY2FzdFwiKSB7XHJcblx0XHRcdFx0XHRmaWx0ZXJlZFRhc2tzID0gZmlsdGVyZWRUYXNrcy5maWx0ZXIoXHJcblx0XHRcdFx0XHRcdCh0YXNrKSA9PiAhKHRhc2sgYXMgYW55KS5iYWRnZVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XCJbVGFza1ZpZXddIENhbGxpbmcgc2V0VGFza3Mgd2l0aFwiLFxyXG5cdFx0XHRcdFx0ZmlsdGVyZWRUYXNrcy5sZW5ndGgsXHJcblx0XHRcdFx0XHRcImZpbHRlcmVkIHRhc2tzLCBmb3JjZVJlZnJlc2g6XCIsXHJcblx0XHRcdFx0XHRmb3JjZVJlZnJlc2hcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHRhcmdldENvbXBvbmVudC5zZXRUYXNrcyhcclxuXHRcdFx0XHRcdGZpbHRlcmVkVGFza3MsXHJcblx0XHRcdFx0XHR0aGlzLnRhc2tzLFxyXG5cdFx0XHRcdFx0Zm9yY2VSZWZyZXNoXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSGFuZGxlIHVwZGF0ZVRhc2tzIG1ldGhvZCBmb3IgdGFibGUgdmlldyBhZGFwdGVyXHJcblx0XHRcdGlmICh0eXBlb2YgdGFyZ2V0Q29tcG9uZW50LnVwZGF0ZVRhc2tzID09PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0XHRjb25zdCBmaWx0ZXJPcHRpb25zOiB7XHJcblx0XHRcdFx0XHRhZHZhbmNlZEZpbHRlcj86IFJvb3RGaWx0ZXJTdGF0ZTtcclxuXHRcdFx0XHRcdHRleHRRdWVyeT86IHN0cmluZztcclxuXHRcdFx0XHR9ID0ge307XHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0dGhpcy5jdXJyZW50RmlsdGVyU3RhdGUgJiZcclxuXHRcdFx0XHRcdHRoaXMuY3VycmVudEZpbHRlclN0YXRlLmZpbHRlckdyb3VwcyAmJlxyXG5cdFx0XHRcdFx0dGhpcy5jdXJyZW50RmlsdGVyU3RhdGUuZmlsdGVyR3JvdXBzLmxlbmd0aCA+IDBcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwi5bqU55So6auY57qn562b6YCJ5Zmo5Yiw6KGo5qC86KeG5Zu+OlwiLCB2aWV3SWQpO1xyXG5cdFx0XHRcdFx0ZmlsdGVyT3B0aW9ucy5hZHZhbmNlZEZpbHRlciA9IHRoaXMuY3VycmVudEZpbHRlclN0YXRlO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0dGFyZ2V0Q29tcG9uZW50LnVwZGF0ZVRhc2tzKFxyXG5cdFx0XHRcdFx0ZmlsdGVyVGFza3ModGhpcy50YXNrcywgdmlld0lkLCB0aGlzLnBsdWdpbiwgZmlsdGVyT3B0aW9ucylcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAodHlwZW9mIHRhcmdldENvbXBvbmVudC5zZXRWaWV3TW9kZSA9PT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRgU2V0dGluZyB2aWV3IG1vZGUgZm9yICR7dmlld0lkfSB0byAke21vZGVGb3JDb21wb25lbnR9IHdpdGggcHJvamVjdCAke3Byb2plY3R9YFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0dGFyZ2V0Q29tcG9uZW50LnNldFZpZXdNb2RlKG1vZGVGb3JDb21wb25lbnQsIHByb2plY3QpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR0aGlzLnR3b0NvbHVtblZpZXdDb21wb25lbnRzLmZvckVhY2goKGNvbXBvbmVudCkgPT4ge1xyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdGNvbXBvbmVudCAmJlxyXG5cdFx0XHRcdFx0dHlwZW9mIGNvbXBvbmVudC5zZXRUYXNrcyA9PT0gXCJmdW5jdGlvblwiICYmXHJcblx0XHRcdFx0XHRjb21wb25lbnQuZ2V0Vmlld0lkKCkgPT09IHZpZXdJZFxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0Y29uc3QgZmlsdGVyT3B0aW9uczoge1xyXG5cdFx0XHRcdFx0XHRhZHZhbmNlZEZpbHRlcj86IFJvb3RGaWx0ZXJTdGF0ZTtcclxuXHRcdFx0XHRcdFx0dGV4dFF1ZXJ5Pzogc3RyaW5nO1xyXG5cdFx0XHRcdFx0fSA9IHt9O1xyXG5cdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHR0aGlzLmN1cnJlbnRGaWx0ZXJTdGF0ZSAmJlxyXG5cdFx0XHRcdFx0XHR0aGlzLmN1cnJlbnRGaWx0ZXJTdGF0ZS5maWx0ZXJHcm91cHMgJiZcclxuXHRcdFx0XHRcdFx0dGhpcy5jdXJyZW50RmlsdGVyU3RhdGUuZmlsdGVyR3JvdXBzLmxlbmd0aCA+IDBcclxuXHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRmaWx0ZXJPcHRpb25zLmFkdmFuY2VkRmlsdGVyID0gdGhpcy5jdXJyZW50RmlsdGVyU3RhdGU7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0bGV0IGZpbHRlcmVkVGFza3MgPSBmaWx0ZXJUYXNrcyhcclxuXHRcdFx0XHRcdFx0dGhpcy50YXNrcyxcclxuXHRcdFx0XHRcdFx0Y29tcG9uZW50LmdldFZpZXdJZCgpLFxyXG5cdFx0XHRcdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0XHRcdFx0ZmlsdGVyT3B0aW9uc1xyXG5cdFx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0XHQvLyBGaWx0ZXIgb3V0IGJhZGdlIHRhc2tzIGZvciBmb3JlY2FzdCB2aWV3IC0gdGhleSBzaG91bGQgb25seSBhcHBlYXIgaW4gZXZlbnQgdmlld1xyXG5cdFx0XHRcdFx0aWYgKGNvbXBvbmVudC5nZXRWaWV3SWQoKSA9PT0gXCJmb3JlY2FzdFwiKSB7XHJcblx0XHRcdFx0XHRcdGZpbHRlcmVkVGFza3MgPSBmaWx0ZXJlZFRhc2tzLmZpbHRlcihcclxuXHRcdFx0XHRcdFx0XHQodGFzaykgPT4gISh0YXNrIGFzIGFueSkuYmFkZ2VcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRjb21wb25lbnQuc2V0VGFza3MoZmlsdGVyZWRUYXNrcyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHZpZXdJZCA9PT0gXCJyZXZpZXdcIiAmJlxyXG5cdFx0XHRcdHR5cGVvZiB0YXJnZXRDb21wb25lbnQucmVmcmVzaFJldmlld1NldHRpbmdzID09PSBcImZ1bmN0aW9uXCJcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0dGFyZ2V0Q29tcG9uZW50LnJlZnJlc2hSZXZpZXdTZXR0aW5ncygpO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oYE5vIHRhcmdldCBjb21wb25lbnQgZm91bmQgZm9yIHZpZXdJZDogJHt2aWV3SWR9YCk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5hcHAuc2F2ZUxvY2FsU3RvcmFnZShcInRhc2stZ2VuaXVzOnZpZXctbW9kZVwiLCB2aWV3SWQpO1xyXG5cdFx0dGhpcy51cGRhdGVIZWFkZXJEaXNwbGF5KCk7XHJcblxyXG5cdFx0Ly8gT25seSBjbGVhciB0YXNrIHNlbGVjdGlvbiBpZiB3ZSdyZSBjaGFuZ2luZyB2aWV3cywgbm90IHdoZW4gcmVmcmVzaGluZyB0aGUgc2FtZSB2aWV3XHJcblx0XHQvLyBUaGlzIHByZXNlcnZlcyB0aGUgZGV0YWlscyBwYW5lbCB3aGVuIHVwZGF0aW5nIHRhc2sgc3RhdHVzXHJcblx0XHRpZiAodGhpcy5jdXJyZW50U2VsZWN0ZWRUYXNrSWQpIHtcclxuXHRcdFx0Ly8gUmUtc2VsZWN0IHRoZSBjdXJyZW50IHRhc2sgdG8gbWFpbnRhaW4gZGV0YWlscyBwYW5lbCB2aXNpYmlsaXR5XHJcblx0XHRcdGNvbnN0IGN1cnJlbnRUYXNrID0gdGhpcy50YXNrcy5maW5kKFxyXG5cdFx0XHRcdCh0KSA9PiB0LmlkID09PSB0aGlzLmN1cnJlbnRTZWxlY3RlZFRhc2tJZFxyXG5cdFx0XHQpO1xyXG5cdFx0XHRpZiAoY3VycmVudFRhc2spIHtcclxuXHRcdFx0XHR0aGlzLmRldGFpbHNDb21wb25lbnQuc2hvd1Rhc2tEZXRhaWxzKGN1cnJlbnRUYXNrKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBUYXNrIG5vIGxvbmdlciBleGlzdHMgb3IgaXMgZmlsdGVyZWQgb3V0XHJcblx0XHRcdFx0dGhpcy5oYW5kbGVUYXNrU2VsZWN0aW9uKG51bGwpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHRoaXMubGVhZi50YWJIZWFkZXJJbm5lckljb25FbCkge1xyXG5cdFx0XHRzZXRJY29uKHRoaXMubGVhZi50YWJIZWFkZXJJbm5lckljb25FbCwgdGhpcy5nZXRJY29uKCkpO1xyXG5cdFx0XHR0aGlzLmxlYWYudGFiSGVhZGVySW5uZXJUaXRsZUVsLnNldFRleHQodGhpcy5nZXREaXNwbGF5VGV4dCgpKTtcclxuXHRcdFx0dGhpcy50aXRsZUVsLnNldFRleHQodGhpcy5nZXREaXNwbGF5VGV4dCgpKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgdXBkYXRlSGVhZGVyRGlzcGxheSgpIHtcclxuXHRcdGNvbnN0IGNvbmZpZyA9IGdldFZpZXdTZXR0aW5nT3JEZWZhdWx0KHRoaXMucGx1Z2luLCB0aGlzLmN1cnJlbnRWaWV3SWQpO1xyXG5cdFx0dGhpcy5sZWFmLnNldEVwaGVtZXJhbFN0YXRlKHt0aXRsZTogY29uZmlnLm5hbWUsIGljb246IGNvbmZpZy5pY29ufSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGhhbmRsZVRhc2tDb250ZXh0TWVudShldmVudDogTW91c2VFdmVudCwgdGFzazogVGFzaykge1xyXG5cdFx0Y29uc3QgbWVudSA9IG5ldyBNZW51KCk7XHJcblxyXG5cdFx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdGl0ZW0uc2V0VGl0bGUodChcIkNvbXBsZXRlXCIpKTtcclxuXHRcdFx0aXRlbS5zZXRJY29uKFwiY2hlY2stc3F1YXJlXCIpO1xyXG5cdFx0XHRpdGVtLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMudG9nZ2xlVGFza0NvbXBsZXRpb24odGFzayk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSlcclxuXHRcdFx0LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRpdGVtLnNldEljb24oXCJzcXVhcmUtcGVuXCIpO1xyXG5cdFx0XHRcdGl0ZW0uc2V0VGl0bGUodChcIlN3aXRjaCBzdGF0dXNcIikpO1xyXG5cdFx0XHRcdGNvbnN0IHN1Ym1lbnUgPSBpdGVtLnNldFN1Ym1lbnUoKTtcclxuXHJcblx0XHRcdFx0Ly8gR2V0IHVuaXF1ZSBzdGF0dXNlcyBmcm9tIHRhc2tTdGF0dXNNYXJrc1xyXG5cdFx0XHRcdGNvbnN0IHN0YXR1c01hcmtzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c01hcmtzO1xyXG5cdFx0XHRcdGNvbnN0IHVuaXF1ZVN0YXR1c2VzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcclxuXHJcblx0XHRcdFx0Ly8gQnVpbGQgYSBtYXAgb2YgdW5pcXVlIG1hcmsgLT4gc3RhdHVzIG5hbWUgdG8gYXZvaWQgZHVwbGljYXRlc1xyXG5cdFx0XHRcdGZvciAoY29uc3Qgc3RhdHVzIG9mIE9iamVjdC5rZXlzKHN0YXR1c01hcmtzKSkge1xyXG5cdFx0XHRcdFx0Y29uc3QgbWFyayA9XHJcblx0XHRcdFx0XHRcdHN0YXR1c01hcmtzW3N0YXR1cyBhcyBrZXlvZiB0eXBlb2Ygc3RhdHVzTWFya3NdO1xyXG5cdFx0XHRcdFx0Ly8gSWYgdGhpcyBtYXJrIGlzIG5vdCBhbHJlYWR5IGluIHRoZSBtYXAsIGFkZCBpdFxyXG5cdFx0XHRcdFx0Ly8gVGhpcyBlbnN1cmVzIGVhY2ggbWFyayBhcHBlYXJzIG9ubHkgb25jZSBpbiB0aGUgbWVudVxyXG5cdFx0XHRcdFx0aWYgKCFBcnJheS5mcm9tKHVuaXF1ZVN0YXR1c2VzLnZhbHVlcygpKS5pbmNsdWRlcyhtYXJrKSkge1xyXG5cdFx0XHRcdFx0XHR1bmlxdWVTdGF0dXNlcy5zZXQoc3RhdHVzLCBtYXJrKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIENyZWF0ZSBtZW51IGl0ZW1zIGZyb20gdW5pcXVlIHN0YXR1c2VzXHJcblx0XHRcdFx0Zm9yIChjb25zdCBbc3RhdHVzLCBtYXJrXSBvZiB1bmlxdWVTdGF0dXNlcykge1xyXG5cdFx0XHRcdFx0c3VibWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdFx0XHRcdGl0ZW0udGl0bGVFbC5jcmVhdGVFbChcclxuXHRcdFx0XHRcdFx0XHRcInNwYW5cIixcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRjbHM6IFwic3RhdHVzLW9wdGlvbi1jaGVja2JveFwiLFxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0KGVsKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRjcmVhdGVUYXNrQ2hlY2tib3gobWFyaywgdGFzaywgZWwpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0aXRlbS50aXRsZUVsLmNyZWF0ZUVsKFwic3BhblwiLCB7XHJcblx0XHRcdFx0XHRcdFx0Y2xzOiBcInN0YXR1cy1vcHRpb25cIixcclxuXHRcdFx0XHRcdFx0XHR0ZXh0OiBzdGF0dXMsXHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRpdGVtLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFwic3RhdHVzXCIsIHN0YXR1cywgbWFyayk7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3Qgd2lsbENvbXBsZXRlID0gdGhpcy5pc0NvbXBsZXRlZE1hcmsobWFyayk7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgdXBkYXRlZFRhc2sgPSB7XHJcblx0XHRcdFx0XHRcdFx0XHQuLi50YXNrLFxyXG5cdFx0XHRcdFx0XHRcdFx0c3RhdHVzOiBtYXJrLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y29tcGxldGVkOiB3aWxsQ29tcGxldGUsXHJcblx0XHRcdFx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0XHRcdFx0aWYgKCF0YXNrLmNvbXBsZXRlZCAmJiB3aWxsQ29tcGxldGUpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHVwZGF0ZWRUYXNrLm1ldGFkYXRhLmNvbXBsZXRlZERhdGUgPSBEYXRlLm5vdygpO1xyXG5cdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAodGFzay5jb21wbGV0ZWQgJiYgIXdpbGxDb21wbGV0ZSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0dXBkYXRlZFRhc2subWV0YWRhdGEuY29tcGxldGVkRGF0ZSA9IHVuZGVmaW5lZDtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdGF3YWl0IHRoaXMudXBkYXRlVGFzayh0YXNrLCB1cGRhdGVkVGFzayk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KVxyXG5cdFx0XHQuYWRkU2VwYXJhdG9yKClcclxuXHRcdFx0LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJFZGl0XCIpKTtcclxuXHRcdFx0XHRpdGVtLnNldEljb24oXCJwZW5jaWxcIik7XHJcblx0XHRcdFx0aXRlbS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuaGFuZGxlVGFza1NlbGVjdGlvbih0YXNrKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSlcclxuXHRcdFx0LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJFZGl0IGluIEZpbGVcIikpO1xyXG5cdFx0XHRcdGl0ZW0uc2V0SWNvbihcInBlbmNpbFwiKTtcclxuXHRcdFx0XHRpdGVtLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5lZGl0VGFzayh0YXNrKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSlcclxuXHRcdFx0LmFkZFNlcGFyYXRvcigpXHJcblx0XHRcdC5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdFx0aXRlbS5zZXRUaXRsZSh0KFwiRGVsZXRlIFRhc2tcIikpO1xyXG5cdFx0XHRcdGl0ZW0uc2V0SWNvbihcInRyYXNoXCIpO1xyXG5cdFx0XHRcdGl0ZW0ub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLmNvbmZpcm1BbmREZWxldGVUYXNrKGV2ZW50LCB0YXNrKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0bWVudS5zaG93QXRNb3VzZUV2ZW50KGV2ZW50KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaGFuZGxlVGFza1NlbGVjdGlvbih0YXNrOiBUYXNrIHwgbnVsbCkge1xyXG5cdFx0aWYgKHRhc2spIHtcclxuXHRcdFx0Y29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcclxuXHRcdFx0Y29uc3QgdGltZVNpbmNlTGFzdFRvZ2dsZSA9IG5vdyAtIHRoaXMubGFzdFRvZ2dsZVRpbWVzdGFtcDtcclxuXHJcblx0XHRcdGlmICh0aGlzLmN1cnJlbnRTZWxlY3RlZFRhc2tJZCAhPT0gdGFzay5pZCkge1xyXG5cdFx0XHRcdHRoaXMuY3VycmVudFNlbGVjdGVkVGFza0lkID0gdGFzay5pZDtcclxuXHRcdFx0XHR0aGlzLmRldGFpbHNDb21wb25lbnQuc2hvd1Rhc2tEZXRhaWxzKHRhc2spO1xyXG5cdFx0XHRcdGlmICghdGhpcy5pc0RldGFpbHNWaXNpYmxlKSB7XHJcblx0XHRcdFx0XHR0aGlzLnRvZ2dsZURldGFpbHNWaXNpYmlsaXR5KHRydWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHR0aGlzLmxhc3RUb2dnbGVUaW1lc3RhbXAgPSBub3c7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAodGltZVNpbmNlTGFzdFRvZ2dsZSA+IDE1MCkge1xyXG5cdFx0XHRcdHRoaXMudG9nZ2xlRGV0YWlsc1Zpc2liaWxpdHkoIXRoaXMuaXNEZXRhaWxzVmlzaWJsZSk7XHJcblx0XHRcdFx0dGhpcy5sYXN0VG9nZ2xlVGltZXN0YW1wID0gbm93O1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLnRvZ2dsZURldGFpbHNWaXNpYmlsaXR5KGZhbHNlKTtcclxuXHRcdFx0dGhpcy5jdXJyZW50U2VsZWN0ZWRUYXNrSWQgPSBudWxsO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBsb2FkVGFza3MoXHJcblx0XHRmb3JjZVN5bmM6IGJvb2xlYW4gPSBmYWxzZSxcclxuXHRcdHNraXBWaWV3VXBkYXRlOiBib29sZWFuID0gZmFsc2VcclxuXHQpIHtcclxuXHRcdC8vIE9ubHkgdXNlIGRhdGFmbG93IC0gVGFza01hbmFnZXIgaXMgZGVwcmVjYXRlZFxyXG5cdFx0aWYgKCF0aGlzLnBsdWdpbi5kYXRhZmxvd09yY2hlc3RyYXRvcikge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XCJbVGFza1ZpZXddIERhdGFmbG93IG9yY2hlc3RyYXRvciBub3QgYXZhaWxhYmxlLCB3YWl0aW5nIGZvciBpbml0aWFsaXphdGlvbi4uLlwiXHJcblx0XHRcdCk7XHJcblx0XHRcdHRoaXMudGFza3MgPSBbXTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcIltUYXNrVmlld10gTG9hZGluZyB0YXNrcyBmcm9tIGRhdGFmbG93IG9yY2hlc3RyYXRvci4uLlwiXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRjb25zdCBxdWVyeUFQSSA9IHRoaXMucGx1Z2luLmRhdGFmbG93T3JjaGVzdHJhdG9yLmdldFF1ZXJ5QVBJKCk7XHJcblx0XHRcdFx0dGhpcy50YXNrcyA9IGF3YWl0IHF1ZXJ5QVBJLmdldEFsbFRhc2tzKCk7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRgW1Rhc2tWaWV3XSBMb2FkZWQgJHt0aGlzLnRhc2tzLmxlbmd0aH0gdGFza3MgZnJvbSBkYXRhZmxvd2BcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXHJcblx0XHRcdFx0XHRcIltUYXNrVmlld10gRXJyb3IgbG9hZGluZyB0YXNrcyBmcm9tIGRhdGFmbG93OlwiLFxyXG5cdFx0XHRcdFx0ZXJyb3JcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHRoaXMudGFza3MgPSBbXTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGlmICghc2tpcFZpZXdVcGRhdGUpIHtcclxuXHRcdFx0YXdhaXQgdGhpcy50cmlnZ2VyVmlld1VwZGF0ZSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTG9hZCB0YXNrcyBmYXN0IHVzaW5nIGNhY2hlZCBkYXRhIC0gZm9yIFVJIGluaXRpYWxpemF0aW9uXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhc3luYyBsb2FkVGFza3NGYXN0KHNraXBWaWV3VXBkYXRlOiBib29sZWFuID0gZmFsc2UpIHtcclxuXHRcdC8vIE9ubHkgdXNlIGRhdGFmbG93XHJcblx0XHRpZiAoIXRoaXMucGx1Z2luLmRhdGFmbG93T3JjaGVzdHJhdG9yKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcIltUYXNrVmlld10gRGF0YWZsb3cgb3JjaGVzdHJhdG9yIG5vdCBhdmFpbGFibGUgZm9yIGZhc3QgbG9hZFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdHRoaXMudGFza3MgPSBbXTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcIltUYXNrVmlld10gTG9hZGluZyB0YXNrcyBmYXN0IGZyb20gZGF0YWZsb3cgb3JjaGVzdHJhdG9yLi4uXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGNvbnN0IHF1ZXJ5QVBJID0gdGhpcy5wbHVnaW4uZGF0YWZsb3dPcmNoZXN0cmF0b3IuZ2V0UXVlcnlBUEkoKTtcclxuXHRcdFx0XHQvLyBGb3IgZmFzdCBsb2FkaW5nLCB1c2UgcmVndWxhciBnZXRBbGxUYXNrcyAoaXQgc2hvdWxkIGJlIGNhY2hlZClcclxuXHRcdFx0XHR0aGlzLnRhc2tzID0gYXdhaXQgcXVlcnlBUEkuZ2V0QWxsVGFza3MoKTtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdGBbVGFza1ZpZXddIExvYWRlZCAke3RoaXMudGFza3MubGVuZ3RofSB0YXNrcyAoZmFzdCBmcm9tIGRhdGFmbG93KWBcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXHJcblx0XHRcdFx0XHRcIltUYXNrVmlld10gRXJyb3IgbG9hZGluZyB0YXNrcyBmYXN0IGZyb20gZGF0YWZsb3c6XCIsXHJcblx0XHRcdFx0XHRlcnJvclxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0dGhpcy50YXNrcyA9IFtdO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKCFza2lwVmlld1VwZGF0ZSkge1xyXG5cdFx0XHRhd2FpdCB0aGlzLnRyaWdnZXJWaWV3VXBkYXRlKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBMb2FkIHRhc2tzIHdpdGggc3luYyBpbiBiYWNrZ3JvdW5kIC0gbm9uLWJsb2NraW5nXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhc3luYyBsb2FkVGFza3NXaXRoU3luY0luQmFja2dyb3VuZCgpIHtcclxuXHRcdC8vIE9ubHkgdXNlIGRhdGFmbG93LCBJQ1MgZXZlbnRzIGFyZSBoYW5kbGVkIHRocm91Z2ggZGF0YWZsb3cgYXJjaGl0ZWN0dXJlXHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBxdWVyeUFQSSA9IHRoaXMucGx1Z2luLmRhdGFmbG93T3JjaGVzdHJhdG9yPy5nZXRRdWVyeUFQSSgpO1xyXG5cdFx0XHRpZiAoIXF1ZXJ5QVBJKSB7XHJcblx0XHRcdFx0Y29uc29sZS53YXJuKFwiW1Rhc2tWaWV3XSBRdWVyeUFQSSBub3QgYXZhaWxhYmxlXCIpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHRjb25zdCB0YXNrcyA9IGF3YWl0IHF1ZXJ5QVBJLmdldEFsbFRhc2tzKCk7XHJcblx0XHRcdGlmICh0YXNrcy5sZW5ndGggIT09IHRoaXMudGFza3MubGVuZ3RoIHx8IHRhc2tzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRcdHRoaXMudGFza3MgPSB0YXNrcztcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdGBUYXNrVmlldyB1cGRhdGVkIHdpdGggJHt0aGlzLnRhc2tzLmxlbmd0aH0gdGFza3MgKGRhdGFmbG93IHN5bmMpYFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0Ly8gRG9uJ3QgdHJpZ2dlciB2aWV3IHVwZGF0ZSBoZXJlIGFzIGl0IHdpbGwgYmUgaGFuZGxlZCBieSBldmVudHNcclxuXHRcdFx0fVxyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFwiQmFja2dyb3VuZCB0YXNrIHN5bmMgZmFpbGVkOlwiLCBlcnJvcik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgYXN5bmMgdHJpZ2dlclZpZXdVcGRhdGUoKSB7XHJcblx0XHQvLyDlp4vnu4jlhYjliLfmlrDkvqfovrnmoI/pobnnm67vvIzku6Xlj43mmKDlj6/op4HmgKcv6aG65bqP55qE5Y+Y5pu0XHJcblx0XHR0cnkge1xyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0dGhpcy5zaWRlYmFyQ29tcG9uZW50ICYmXHJcblx0XHRcdFx0dHlwZW9mIHRoaXMuc2lkZWJhckNvbXBvbmVudC5yZW5kZXJTaWRlYmFySXRlbXMgPT09IFwiZnVuY3Rpb25cIlxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHR0aGlzLnNpZGViYXJDb21wb25lbnQucmVuZGVyU2lkZWJhckl0ZW1zKCk7XHJcblx0XHRcdH1cclxuXHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFwiRmFpbGVkIHRvIHJlZnJlc2ggc2lkZWJhciBpdGVtczpcIiwgZSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8g5aaC5p6c5b2T5YmN6KeG5Zu+5bey6KKr6K6+572u5Li66ZqQ6JeP77yM5YiZ5YiH5o2i5Yiw56ys5LiA5Liq5Y+v6KeB6KeG5Zu+XHJcblx0XHRjb25zdCBjdXJyZW50Q2ZnID0gdGhpcy5wbHVnaW4uc2V0dGluZ3Mudmlld0NvbmZpZ3VyYXRpb24uZmluZChcclxuXHRcdFx0KHYpID0+IHYuaWQgPT09IHRoaXMuY3VycmVudFZpZXdJZFxyXG5cdFx0KTtcclxuXHRcdGlmICghY3VycmVudENmZz8udmlzaWJsZSkge1xyXG5cdFx0XHRjb25zdCBmaXJzdFZpc2libGUgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy52aWV3Q29uZmlndXJhdGlvbi5maW5kKFxyXG5cdFx0XHRcdCh2KSA9PiB2LnZpc2libGVcclxuXHRcdFx0KT8uaWQgYXMgVmlld01vZGUgfCB1bmRlZmluZWQ7XHJcblx0XHRcdGlmIChmaXJzdFZpc2libGUgJiYgZmlyc3RWaXNpYmxlICE9PSB0aGlzLmN1cnJlbnRWaWV3SWQpIHtcclxuXHRcdFx0XHR0aGlzLmN1cnJlbnRWaWV3SWQgPSBmaXJzdFZpc2libGU7XHJcblx0XHRcdFx0dGhpcy5zaWRlYmFyQ29tcG9uZW50Py5zZXRWaWV3TW9kZSh0aGlzLmN1cnJlbnRWaWV3SWQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8g55u05o6l5L2/55So77yI5Y+v6IO95bey5pu05paw55qE77yJ5b2T5YmN6KeG5Zu+6YeN5paw5Yqg6L29XHJcblx0XHR0aGlzLnN3aXRjaFZpZXcodGhpcy5jdXJyZW50Vmlld0lkKTtcclxuXHJcblx0XHQvLyDmm7TmlrDmk43kvZzmjInpkq7vvIznoa7kv53ph43nva7nrZvpgInlmajmjInpkq7moLnmja7mnIDmlrDnirbmgIHmmL7npLpcclxuXHRcdHRoaXMudXBkYXRlQWN0aW9uQnV0dG9ucygpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSB1cGRhdGVBY3Rpb25CdXR0b25zKCkge1xyXG5cdFx0Ly8g56e76Zmk6L+H5ruk5Zmo6YeN572u5oyJ6ZKu77yI5aaC5p6c5a2Y5Zyo77yJXHJcblx0XHRjb25zdCByZXNldEJ1dHRvbiA9IHRoaXMubGVhZi52aWV3LmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFwiLnZpZXctYWN0aW9uLnRhc2stZmlsdGVyLXJlc2V0XCJcclxuXHRcdCk7XHJcblx0XHRpZiAocmVzZXRCdXR0b24pIHtcclxuXHRcdFx0cmVzZXRCdXR0b24ucmVtb3ZlKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8g5Y+q5pyJ5Zyo5pyJ5a6e5pe26auY57qn562b6YCJ5Zmo5pe25omN5re75Yqg6YeN572u5oyJ6ZKu77yI5LiN5YyF5ous5Z+656GA6L+H5ruk5Zmo77yJXHJcblx0XHRpZiAoXHJcblx0XHRcdHRoaXMubGl2ZUZpbHRlclN0YXRlICYmXHJcblx0XHRcdHRoaXMubGl2ZUZpbHRlclN0YXRlLmZpbHRlckdyb3VwcyAmJlxyXG5cdFx0XHR0aGlzLmxpdmVGaWx0ZXJTdGF0ZS5maWx0ZXJHcm91cHMubGVuZ3RoID4gMFxyXG5cdFx0KSB7XHJcblx0XHRcdHRoaXMuYWRkQWN0aW9uKFwicmVzZXRcIiwgdChcIlJlc2V0IEZpbHRlclwiKSwgKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMucmVzZXRDdXJyZW50RmlsdGVyKCk7XHJcblx0XHRcdH0pLmFkZENsYXNzKFwidGFzay1maWx0ZXItcmVzZXRcIik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGlzQ29tcGxldGVkTWFyayhtYXJrOiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHRcdGlmICghbWFyaykgcmV0dXJuIGZhbHNlO1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgbG93ZXIgPSBtYXJrLnRvTG93ZXJDYXNlKCk7XHJcblx0XHRcdGNvbnN0IGNvbXBsZXRlZENmZyA9IFN0cmluZyhcclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXNrU3RhdHVzZXM/LmNvbXBsZXRlZCB8fCBcInhcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRjb25zdCBjb21wbGV0ZWRTZXQgPSBjb21wbGV0ZWRDZmdcclxuXHRcdFx0XHQuc3BsaXQoXCJ8XCIpXHJcblx0XHRcdFx0Lm1hcCgocykgPT4gcy50cmltKCkudG9Mb3dlckNhc2UoKSlcclxuXHRcdFx0XHQuZmlsdGVyKEJvb2xlYW4pO1xyXG5cdFx0XHRpZiAoY29tcGxldGVkU2V0LmluY2x1ZGVzKGxvd2VyKSkgcmV0dXJuIHRydWU7XHJcblx0XHRcdGNvbnN0IGFsbCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnRhc2tTdGF0dXNlcyBhcyBSZWNvcmQ8XHJcblx0XHRcdFx0c3RyaW5nLFxyXG5cdFx0XHRcdHN0cmluZ1xyXG5cdFx0XHQ+O1xyXG5cdFx0XHRpZiAoYWxsKSB7XHJcblx0XHRcdFx0Zm9yIChjb25zdCBbdHlwZSwgc3ltYm9sc10gb2YgT2JqZWN0LmVudHJpZXMoYWxsKSkge1xyXG5cdFx0XHRcdFx0Y29uc3Qgc2V0ID0gU3RyaW5nKHN5bWJvbHMpXHJcblx0XHRcdFx0XHRcdC5zcGxpdChcInxcIilcclxuXHRcdFx0XHRcdFx0Lm1hcCgocykgPT4gcy50cmltKCkudG9Mb3dlckNhc2UoKSlcclxuXHRcdFx0XHRcdFx0LmZpbHRlcihCb29sZWFuKTtcclxuXHRcdFx0XHRcdGlmIChzZXQuaW5jbHVkZXMobG93ZXIpKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybiB0eXBlLnRvTG93ZXJDYXNlKCkgPT09IFwiY29tcGxldGVkXCI7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9IGNhdGNoIChfKSB7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIHRvZ2dsZVRhc2tDb21wbGV0aW9uKHRhc2s6IFRhc2spIHtcclxuXHRcdGNvbnN0IHVwZGF0ZWRUYXNrID0gey4uLnRhc2ssIGNvbXBsZXRlZDogIXRhc2suY29tcGxldGVkfTtcclxuXHJcblx0XHRpZiAodXBkYXRlZFRhc2suY29tcGxldGVkKSB7XHJcblx0XHRcdHVwZGF0ZWRUYXNrLm1ldGFkYXRhLmNvbXBsZXRlZERhdGUgPSBEYXRlLm5vdygpO1xyXG5cdFx0XHRjb25zdCBjb21wbGV0ZWRNYXJrID0gKFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnRhc2tTdGF0dXNlcy5jb21wbGV0ZWQgfHwgXCJ4XCJcclxuXHRcdFx0KS5zcGxpdChcInxcIilbMF07XHJcblx0XHRcdGlmICh1cGRhdGVkVGFzay5zdGF0dXMgIT09IGNvbXBsZXRlZE1hcmspIHtcclxuXHRcdFx0XHR1cGRhdGVkVGFzay5zdGF0dXMgPSBjb21wbGV0ZWRNYXJrO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YS5jb21wbGV0ZWREYXRlID0gdW5kZWZpbmVkO1xyXG5cdFx0XHRjb25zdCBub3RTdGFydGVkTWFyayA9XHJcblx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c2VzLm5vdFN0YXJ0ZWQgfHwgXCIgXCI7XHJcblx0XHRcdGlmICh0aGlzLmlzQ29tcGxldGVkTWFyayh1cGRhdGVkVGFzay5zdGF0dXMpKSB7XHJcblx0XHRcdFx0dXBkYXRlZFRhc2suc3RhdHVzID0gbm90U3RhcnRlZE1hcms7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBVc2UgdXBkYXRlVGFzayBpbnN0ZWFkIG9mIGRpcmVjdGx5IGNhbGxpbmcgdGFza01hbmFnZXIgdG8gZW5zdXJlIHZpZXcgcmVmcmVzaFxyXG5cdFx0YXdhaXQgdGhpcy51cGRhdGVUYXNrKHRhc2ssIHVwZGF0ZWRUYXNrKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEV4dHJhY3Qgb25seSB0aGUgZmllbGRzIHRoYXQgaGF2ZSBjaGFuZ2VkIGJldHdlZW4gdHdvIHRhc2tzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBleHRyYWN0Q2hhbmdlZEZpZWxkcyhcclxuXHRcdG9yaWdpbmFsVGFzazogVGFzayxcclxuXHRcdHVwZGF0ZWRUYXNrOiBUYXNrXHJcblx0KTogUGFydGlhbDxUYXNrPiB7XHJcblx0XHRjb25zdCBjaGFuZ2VzOiBQYXJ0aWFsPFRhc2s+ID0ge307XHJcblxyXG5cdFx0Ly8gQ2hlY2sgdG9wLWxldmVsIGZpZWxkc1xyXG5cdFx0aWYgKG9yaWdpbmFsVGFzay5jb250ZW50ICE9PSB1cGRhdGVkVGFzay5jb250ZW50KSB7XHJcblx0XHRcdGNoYW5nZXMuY29udGVudCA9IHVwZGF0ZWRUYXNrLmNvbnRlbnQ7XHJcblx0XHR9XHJcblx0XHRpZiAob3JpZ2luYWxUYXNrLmNvbXBsZXRlZCAhPT0gdXBkYXRlZFRhc2suY29tcGxldGVkKSB7XHJcblx0XHRcdGNoYW5nZXMuY29tcGxldGVkID0gdXBkYXRlZFRhc2suY29tcGxldGVkO1xyXG5cdFx0fVxyXG5cdFx0aWYgKG9yaWdpbmFsVGFzay5zdGF0dXMgIT09IHVwZGF0ZWRUYXNrLnN0YXR1cykge1xyXG5cdFx0XHRjaGFuZ2VzLnN0YXR1cyA9IHVwZGF0ZWRUYXNrLnN0YXR1cztcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDaGVjayBtZXRhZGF0YSBmaWVsZHNcclxuXHRcdGNvbnN0IG1ldGFkYXRhQ2hhbmdlczogUGFydGlhbDx0eXBlb2Ygb3JpZ2luYWxUYXNrLm1ldGFkYXRhPiA9IHt9O1xyXG5cdFx0bGV0IGhhc01ldGFkYXRhQ2hhbmdlcyA9IGZhbHNlO1xyXG5cclxuXHRcdC8vIENvbXBhcmUgZWFjaCBtZXRhZGF0YSBmaWVsZFxyXG5cdFx0Y29uc3QgbWV0YWRhdGFGaWVsZHMgPSBbXHJcblx0XHRcdFwicHJpb3JpdHlcIixcclxuXHRcdFx0XCJwcm9qZWN0XCIsXHJcblx0XHRcdFwidGFnc1wiLFxyXG5cdFx0XHRcImNvbnRleHRcIixcclxuXHRcdFx0XCJkdWVEYXRlXCIsXHJcblx0XHRcdFwic3RhcnREYXRlXCIsXHJcblx0XHRcdFwic2NoZWR1bGVkRGF0ZVwiLFxyXG5cdFx0XHRcImNvbXBsZXRlZERhdGVcIixcclxuXHRcdFx0XCJyZWN1cnJlbmNlXCIsXHJcblx0XHRdO1xyXG5cdFx0Zm9yIChjb25zdCBmaWVsZCBvZiBtZXRhZGF0YUZpZWxkcykge1xyXG5cdFx0XHRjb25zdCBvcmlnaW5hbFZhbHVlID0gKG9yaWdpbmFsVGFzay5tZXRhZGF0YSBhcyBhbnkpPy5bZmllbGRdO1xyXG5cdFx0XHRjb25zdCB1cGRhdGVkVmFsdWUgPSAodXBkYXRlZFRhc2subWV0YWRhdGEgYXMgYW55KT8uW2ZpZWxkXTtcclxuXHJcblx0XHRcdC8vIEhhbmRsZSBhcnJheXMgc3BlY2lhbGx5ICh0YWdzKVxyXG5cdFx0XHRpZiAoZmllbGQgPT09IFwidGFnc1wiKSB7XHJcblx0XHRcdFx0Y29uc3Qgb3JpZ1RhZ3MgPSBvcmlnaW5hbFZhbHVlIHx8IFtdO1xyXG5cdFx0XHRcdGNvbnN0IHVwZFRhZ3MgPSB1cGRhdGVkVmFsdWUgfHwgW107XHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0b3JpZ1RhZ3MubGVuZ3RoICE9PSB1cGRUYWdzLmxlbmd0aCB8fFxyXG5cdFx0XHRcdFx0IW9yaWdUYWdzLmV2ZXJ5KCh0OiBzdHJpbmcsIGk6IG51bWJlcikgPT4gdCA9PT0gdXBkVGFnc1tpXSlcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdG1ldGFkYXRhQ2hhbmdlcy50YWdzID0gdXBkVGFncztcclxuXHRcdFx0XHRcdGhhc01ldGFkYXRhQ2hhbmdlcyA9IHRydWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2UgaWYgKG9yaWdpbmFsVmFsdWUgIT09IHVwZGF0ZWRWYWx1ZSkge1xyXG5cdFx0XHRcdChtZXRhZGF0YUNoYW5nZXMgYXMgYW55KVtmaWVsZF0gPSB1cGRhdGVkVmFsdWU7XHJcblx0XHRcdFx0aGFzTWV0YWRhdGFDaGFuZ2VzID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIE9ubHkgaW5jbHVkZSBtZXRhZGF0YSBpZiB0aGVyZSBhcmUgY2hhbmdlc1xyXG5cdFx0aWYgKGhhc01ldGFkYXRhQ2hhbmdlcykge1xyXG5cdFx0XHRjaGFuZ2VzLm1ldGFkYXRhID0gbWV0YWRhdGFDaGFuZ2VzIGFzIGFueTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gY2hhbmdlcztcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgaGFuZGxlVGFza1VwZGF0ZShvcmlnaW5hbFRhc2s6IFRhc2ssIHVwZGF0ZWRUYXNrOiBUYXNrKSB7XHJcblx0XHRpZiAoIXRoaXMucGx1Z2luLndyaXRlQVBJKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJXcml0ZUFQSSBub3QgYXZhaWxhYmxlXCIpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFwiaGFuZGxlVGFza1VwZGF0ZVwiLFxyXG5cdFx0XHRvcmlnaW5hbFRhc2suY29udGVudCxcclxuXHRcdFx0dXBkYXRlZFRhc2suY29udGVudCxcclxuXHRcdFx0b3JpZ2luYWxUYXNrLmlkLFxyXG5cdFx0XHR1cGRhdGVkVGFzay5pZCxcclxuXHRcdFx0dXBkYXRlZFRhc2ssXHJcblx0XHRcdG9yaWdpbmFsVGFza1xyXG5cdFx0KTtcclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBFeHRyYWN0IG9ubHkgdGhlIGNoYW5nZWQgZmllbGRzXHJcblx0XHRcdGNvbnN0IHVwZGF0ZXMgPSB0aGlzLmV4dHJhY3RDaGFuZ2VkRmllbGRzKFxyXG5cdFx0XHRcdG9yaWdpbmFsVGFzayxcclxuXHRcdFx0XHR1cGRhdGVkVGFza1xyXG5cdFx0XHQpO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIkV4dHJhY3RlZCBjaGFuZ2VzOlwiLCB1cGRhdGVzKTtcclxuXHJcblx0XHRcdC8vIEFsd2F5cyB1c2UgV3JpdGVBUEkgd2l0aCBvbmx5IHRoZSBjaGFuZ2VkIGZpZWxkc1xyXG5cdFx0XHQvLyBVc2Ugb3JpZ2luYWxUYXNrLmlkIHRvIGVuc3VyZSB3ZSdyZSB1cGRhdGluZyB0aGUgY29ycmVjdCB0YXNrXHJcblx0XHRcdGNvbnN0IHdyaXRlUmVzdWx0ID0gYXdhaXQgdGhpcy5wbHVnaW4ud3JpdGVBUEkudXBkYXRlVGFzayh7XHJcblx0XHRcdFx0dGFza0lkOiBvcmlnaW5hbFRhc2suaWQsXHJcblx0XHRcdFx0dXBkYXRlczogdXBkYXRlcyxcclxuXHRcdFx0fSk7XHJcblx0XHRcdGlmICghd3JpdGVSZXN1bHQuc3VjY2Vzcykge1xyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcih3cml0ZVJlc3VsdC5lcnJvciB8fCBcIkZhaWxlZCB0byB1cGRhdGUgdGFza1wiKTtcclxuXHRcdFx0fVxyXG5cdFx0XHQvLyBQcmVmZXIgdGhlIGF1dGhvcml0YXRpdmUgdGFzayByZXR1cm5lZCBieSBXcml0ZUFQSSAoaW5jbHVkZXMgdXBkYXRlZCBvcmlnaW5hbE1hcmtkb3duKVxyXG5cdFx0XHRpZiAod3JpdGVSZXN1bHQudGFzaykge1xyXG5cdFx0XHRcdHVwZGF0ZWRUYXNrID0gd3JpdGVSZXN1bHQudGFzaztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0YFRhc2sgJHt1cGRhdGVkVGFzay5pZH0gdXBkYXRlZCBzdWNjZXNzZnVsbHkgdmlhIGhhbmRsZVRhc2tVcGRhdGUuYFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIGxvY2FsIHRhc2sgbGlzdCBpbW1lZGlhdGVseVxyXG5cdFx0XHRjb25zdCBpbmRleCA9IHRoaXMudGFza3MuZmluZEluZGV4KCh0KSA9PiB0LmlkID09PSBvcmlnaW5hbFRhc2suaWQpO1xyXG5cdFx0XHRpZiAoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0Ly8gQ3JlYXRlIGEgbmV3IGFycmF5IHRvIGVuc3VyZSBDb250ZW50Q29tcG9uZW50IGRldGVjdHMgdGhlIGNoYW5nZVxyXG5cdFx0XHRcdHRoaXMudGFza3MgPSBbLi4udGhpcy50YXNrc107XHJcblx0XHRcdFx0dGhpcy50YXNrc1tpbmRleF0gPSB1cGRhdGVkVGFzaztcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRcIlVwZGF0ZWQgdGFzayBub3QgZm91bmQgaW4gbG9jYWwgbGlzdCwgbWlnaHQgcmVsb2FkLlwiXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQWx3YXlzIHJlZnJlc2ggdGhlIHZpZXcgYWZ0ZXIgYSBzdWNjZXNzZnVsIHVwZGF0ZVxyXG5cdFx0XHQvLyBUaGUgdXBkYXRlIG9wZXJhdGlvbiBpdHNlbGYgbWVhbnMgZWRpdGluZyBpcyBjb21wbGV0ZVxyXG5cdFx0XHQvLyBGb3JjZSByZWZyZXNoIHNpbmNlIHdlIGtub3cgdGhlIHRhc2sgaGFzIGJlZW4gdXBkYXRlZFxyXG5cdFx0XHR0aGlzLnN3aXRjaFZpZXcodGhpcy5jdXJyZW50Vmlld0lkLCB1bmRlZmluZWQsIHRydWUpO1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIGRldGFpbHMgY29tcG9uZW50IGlmIHRoZSB1cGRhdGVkIHRhc2sgaXMgY3VycmVudGx5IHNlbGVjdGVkXHJcblx0XHRcdGlmICh0aGlzLmN1cnJlbnRTZWxlY3RlZFRhc2tJZCA9PT0gdXBkYXRlZFRhc2suaWQpIHtcclxuXHRcdFx0XHRpZiAodGhpcy5kZXRhaWxzQ29tcG9uZW50LmlzQ3VycmVudGx5RWRpdGluZygpKSB7XHJcblx0XHRcdFx0XHQvLyBVcGRhdGUgdGhlIGN1cnJlbnQgdGFzayByZWZlcmVuY2Ugd2l0aG91dCByZS1yZW5kZXJpbmcgVUlcclxuXHRcdFx0XHRcdHRoaXMuZGV0YWlsc0NvbXBvbmVudC5jdXJyZW50VGFzayA9IHVwZGF0ZWRUYXNrO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHR0aGlzLmRldGFpbHNDb21wb25lbnQuc2hvd1Rhc2tEZXRhaWxzKHVwZGF0ZWRUYXNrKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gdXBkYXRlIHRhc2s6XCIsIGVycm9yKTtcclxuXHRcdFx0Ly8gUmUtdGhyb3cgdGhlIGVycm9yIHNvIHRoYXQgdGhlIElubGluZUVkaXRvciBjYW4gaGFuZGxlIGl0IHByb3Blcmx5XHJcblx0XHRcdHRocm93IGVycm9yO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyB1cGRhdGVUYXNrKFxyXG5cdFx0b3JpZ2luYWxUYXNrOiBUYXNrLFxyXG5cdFx0dXBkYXRlZFRhc2s6IFRhc2tcclxuXHQpOiBQcm9taXNlPFRhc2s+IHtcclxuXHRcdGlmICghdGhpcy5wbHVnaW4ud3JpdGVBUEkpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIldyaXRlQVBJIG5vdCBhdmFpbGFibGUgZm9yIHVwZGF0ZVRhc2tcIik7XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIldyaXRlQVBJIG5vdCBhdmFpbGFibGVcIik7XHJcblx0XHR9XHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBFeHRyYWN0IG9ubHkgdGhlIGNoYW5nZWQgZmllbGRzXHJcblx0XHRcdGNvbnN0IHVwZGF0ZXMgPSB0aGlzLmV4dHJhY3RDaGFuZ2VkRmllbGRzKFxyXG5cdFx0XHRcdG9yaWdpbmFsVGFzayxcclxuXHRcdFx0XHR1cGRhdGVkVGFza1xyXG5cdFx0XHQpO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIkV4dHJhY3RlZCBjaGFuZ2VzOlwiLCB1cGRhdGVzKTtcclxuXHJcblx0XHRcdC8vIEFsd2F5cyB1c2UgV3JpdGVBUEkgd2l0aCBvbmx5IHRoZSBjaGFuZ2VkIGZpZWxkc1xyXG5cdFx0XHQvLyBVc2Ugb3JpZ2luYWxUYXNrLmlkIHRvIGVuc3VyZSB3ZSdyZSB1cGRhdGluZyB0aGUgY29ycmVjdCB0YXNrXHJcblx0XHRcdGNvbnN0IHdyaXRlUmVzdWx0ID0gYXdhaXQgdGhpcy5wbHVnaW4ud3JpdGVBUEkudXBkYXRlVGFzayh7XHJcblx0XHRcdFx0dGFza0lkOiBvcmlnaW5hbFRhc2suaWQsXHJcblx0XHRcdFx0dXBkYXRlczogdXBkYXRlcyxcclxuXHRcdFx0fSk7XHJcblx0XHRcdGlmICghd3JpdGVSZXN1bHQuc3VjY2Vzcykge1xyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcih3cml0ZVJlc3VsdC5lcnJvciB8fCBcIkZhaWxlZCB0byB1cGRhdGUgdGFza1wiKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAod3JpdGVSZXN1bHQudGFzaykge1xyXG5cdFx0XHRcdHVwZGF0ZWRUYXNrID0gd3JpdGVSZXN1bHQudGFzaztcclxuXHRcdFx0fVxyXG5cdFx0XHRjb25zb2xlLmxvZyhgVGFzayAke3VwZGF0ZWRUYXNrLmlkfSB1cGRhdGVkIHN1Y2Nlc3NmdWxseS5gKTtcclxuXHJcblx0XHRcdC8vIOeri+WNs+abtOaWsOacrOWcsOS7u+WKoeWIl+ihqFxyXG5cdFx0XHRjb25zdCBpbmRleCA9IHRoaXMudGFza3MuZmluZEluZGV4KCh0KSA9PiB0LmlkID09PSBvcmlnaW5hbFRhc2suaWQpO1xyXG5cdFx0XHRpZiAoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0Ly8gQ3JlYXRlIGEgbmV3IGFycmF5IHRvIGVuc3VyZSBDb250ZW50Q29tcG9uZW50IGRldGVjdHMgdGhlIGNoYW5nZVxyXG5cdFx0XHRcdHRoaXMudGFza3MgPSBbLi4udGhpcy50YXNrc107XHJcblx0XHRcdFx0dGhpcy50YXNrc1tpbmRleF0gPSB1cGRhdGVkVGFzaztcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRcIlVwZGF0ZWQgdGFzayBub3QgZm91bmQgaW4gbG9jYWwgbGlzdCwgbWlnaHQgcmVsb2FkLlwiXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQWx3YXlzIHJlZnJlc2ggdGhlIHZpZXcgYWZ0ZXIgYSBzdWNjZXNzZnVsIHVwZGF0ZVxyXG5cdFx0XHQvLyBUaGUgdXBkYXRlIG9wZXJhdGlvbiBpdHNlbGYgbWVhbnMgZWRpdGluZyBpcyBjb21wbGV0ZVxyXG5cdFx0XHQvLyBGb3JjZSByZWZyZXNoIHNpbmNlIHdlIGtub3cgdGhlIHRhc2sgaGFzIGJlZW4gdXBkYXRlZFxyXG5cdFx0XHR0aGlzLnN3aXRjaFZpZXcodGhpcy5jdXJyZW50Vmlld0lkLCB1bmRlZmluZWQsIHRydWUpO1xyXG5cclxuXHRcdFx0aWYgKHRoaXMuY3VycmVudFNlbGVjdGVkVGFza0lkID09PSB1cGRhdGVkVGFzay5pZCkge1xyXG5cdFx0XHRcdGlmICh0aGlzLmRldGFpbHNDb21wb25lbnQuaXNDdXJyZW50bHlFZGl0aW5nKCkpIHtcclxuXHRcdFx0XHRcdC8vIFVwZGF0ZSB0aGUgY3VycmVudCB0YXNrIHJlZmVyZW5jZSB3aXRob3V0IHJlLXJlbmRlcmluZyBVSVxyXG5cdFx0XHRcdFx0dGhpcy5kZXRhaWxzQ29tcG9uZW50LmN1cnJlbnRUYXNrID0gdXBkYXRlZFRhc2s7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHRoaXMuZGV0YWlsc0NvbXBvbmVudC5zaG93VGFza0RldGFpbHModXBkYXRlZFRhc2spO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHVwZGF0ZWRUYXNrO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihgRmFpbGVkIHRvIHVwZGF0ZSB0YXNrICR7b3JpZ2luYWxUYXNrLmlkfTpgLCBlcnJvcik7XHJcblx0XHRcdHRocm93IGVycm9yO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBlZGl0VGFzayh0YXNrOiBUYXNrKSB7XHJcblx0XHRjb25zdCBmaWxlID0gdGhpcy5hcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aCh0YXNrLmZpbGVQYXRoKTtcclxuXHRcdGlmICghKGZpbGUgaW5zdGFuY2VvZiBURmlsZSkpIHJldHVybjtcclxuXHJcblx0XHRjb25zdCBsZWFmID0gdGhpcy5hcHAud29ya3NwYWNlLmdldExlYWYoZmFsc2UpO1xyXG5cdFx0YXdhaXQgbGVhZi5vcGVuRmlsZShmaWxlLCB7XHJcblx0XHRcdGVTdGF0ZToge1xyXG5cdFx0XHRcdGxpbmU6IHRhc2subGluZSxcclxuXHRcdFx0fSxcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBjb25maXJtQW5kRGVsZXRlVGFzayhldmVudDogTW91c2VFdmVudCwgdGFzazogVGFzaykge1xyXG5cdFx0Ly8gQ2hlY2sgaWYgdGhlIHRhc2sgaGFzIGNoaWxkcmVuXHJcblx0XHRjb25zdCBoYXNDaGlsZHJlbiA9XHJcblx0XHRcdHRhc2subWV0YWRhdGEgJiZcclxuXHRcdFx0dGFzay5tZXRhZGF0YS5jaGlsZHJlbiAmJlxyXG5cdFx0XHR0YXNrLm1ldGFkYXRhLmNoaWxkcmVuLmxlbmd0aCA+IDA7XHJcblxyXG5cdFx0aWYgKGhhc0NoaWxkcmVuKSB7XHJcblx0XHRcdC8vIFNob3cgY29uZmlybWF0aW9uIGRpYWxvZyB3aXRoIG9wdGlvbnMgZm9yIHRhc2tzIHdpdGggY2hpbGRyZW5cclxuXHRcdFx0Y29uc3QgY2hpbGRyZW5Db3VudCA9IHRhc2subWV0YWRhdGEuY2hpbGRyZW4ubGVuZ3RoO1xyXG5cdFx0XHQvLyBDcmVhdGUgYSBjdXN0b20gbW9kYWwgZm9yIHRocmVlLWJ1dHRvbiBzY2VuYXJpb1xyXG5cdFx0XHRjb25zdCBtZW51ID0gbmV3IE1lbnUoKTtcclxuXHRcdFx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdFx0aXRlbS5zZXRUaXRsZSh0KFwiRGVsZXRlIHRhc2sgb25seVwiKSk7XHJcblx0XHRcdFx0aXRlbS5zZXRJY29uKFwidHJhc2hcIik7XHJcblx0XHRcdFx0aXRlbS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuZGVsZXRlVGFzayh0YXNrLCBmYWxzZSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJEZWxldGUgdGFzayBhbmQgYWxsIHN1YnRhc2tzXCIpKTtcclxuXHRcdFx0XHRpdGVtLnNldEljb24oXCJ0cmFzaC0yXCIpO1xyXG5cdFx0XHRcdGl0ZW0ub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLmRlbGV0ZVRhc2sodGFzaywgdHJ1ZSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0XHRtZW51LmFkZFNlcGFyYXRvcigpO1xyXG5cdFx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJDYW5jZWxcIikpO1xyXG5cdFx0XHRcdGl0ZW0ub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHQvLyBEbyBub3RoaW5nXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gU2hvdyBtZW51IGF0IGN1cnJlbnQgbW91c2UgcG9zaXRpb25cclxuXHRcdFx0bWVudS5zaG93QXRNb3VzZUV2ZW50KGV2ZW50KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIE5vIGNoaWxkcmVuLCB1c2Ugc2ltcGxlIGNvbmZpcm1hdGlvblxyXG5cdFx0XHRjb25zdCBtb2RhbCA9IG5ldyBDb25maXJtTW9kYWwodGhpcy5wbHVnaW4sIHtcclxuXHRcdFx0XHR0aXRsZTogdChcIkRlbGV0ZSBUYXNrXCIpLFxyXG5cdFx0XHRcdG1lc3NhZ2U6IHQoXCJBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gZGVsZXRlIHRoaXMgdGFzaz9cIiksXHJcblx0XHRcdFx0Y29uZmlybVRleHQ6IHQoXCJEZWxldGVcIiksXHJcblx0XHRcdFx0Y2FuY2VsVGV4dDogdChcIkNhbmNlbFwiKSxcclxuXHRcdFx0XHRvbkNvbmZpcm06IChjb25maXJtZWQpID0+IHtcclxuXHRcdFx0XHRcdGlmIChjb25maXJtZWQpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5kZWxldGVUYXNrKHRhc2ssIGZhbHNlKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0bW9kYWwub3BlbigpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBkZWxldGVUYXNrKHRhc2s6IFRhc2ssIGRlbGV0ZUNoaWxkcmVuOiBib29sZWFuKSB7XHJcblx0XHRpZiAoIXRoaXMucGx1Z2luLndyaXRlQVBJKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJXcml0ZUFQSSBub3QgYXZhaWxhYmxlIGZvciBkZWxldGVUYXNrXCIpO1xyXG5cdFx0XHRuZXcgTm90aWNlKHQoXCJGYWlsZWQgdG8gZGVsZXRlIHRhc2tcIikpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5wbHVnaW4ud3JpdGVBUEkuZGVsZXRlVGFzayh7XHJcblx0XHRcdFx0dGFza0lkOiB0YXNrLmlkLFxyXG5cdFx0XHRcdGRlbGV0ZUNoaWxkcmVuOiBkZWxldGVDaGlsZHJlbixcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRpZiAocmVzdWx0LnN1Y2Nlc3MpIHtcclxuXHRcdFx0XHRuZXcgTm90aWNlKHQoXCJUYXNrIGRlbGV0ZWRcIikpO1xyXG5cclxuXHRcdFx0XHQvLyBSZW1vdmUgdGFzayBmcm9tIGxvY2FsIGxpc3RcclxuXHRcdFx0XHRjb25zdCBpbmRleCA9IHRoaXMudGFza3MuZmluZEluZGV4KCh0KSA9PiB0LmlkID09PSB0YXNrLmlkKTtcclxuXHRcdFx0XHRpZiAoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0XHR0aGlzLnRhc2tzID0gWy4uLnRoaXMudGFza3NdO1xyXG5cdFx0XHRcdFx0dGhpcy50YXNrcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cclxuXHRcdFx0XHRcdC8vIElmIGRlbGV0ZUNoaWxkcmVuLCBhbHNvIHJlbW92ZSBjaGlsZHJlbiBmcm9tIGxvY2FsIGxpc3RcclxuXHRcdFx0XHRcdGlmIChkZWxldGVDaGlsZHJlbiAmJiB0YXNrLm1ldGFkYXRhPy5jaGlsZHJlbikge1xyXG5cdFx0XHRcdFx0XHRmb3IgKGNvbnN0IGNoaWxkSWQgb2YgdGFzay5tZXRhZGF0YS5jaGlsZHJlbikge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGNoaWxkSW5kZXggPSB0aGlzLnRhc2tzLmZpbmRJbmRleChcclxuXHRcdFx0XHRcdFx0XHRcdCh0KSA9PiB0LmlkID09PSBjaGlsZElkXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRpZiAoY2hpbGRJbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMudGFza3Muc3BsaWNlKGNoaWxkSW5kZXgsIDEpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gQ2xlYXIgc2VsZWN0aW9uIGlmIGRlbGV0ZWQgdGFzayB3YXMgc2VsZWN0ZWRcclxuXHRcdFx0XHRpZiAodGhpcy5jdXJyZW50U2VsZWN0ZWRUYXNrSWQgPT09IHRhc2suaWQpIHtcclxuXHRcdFx0XHRcdHRoaXMuaGFuZGxlVGFza1NlbGVjdGlvbihudWxsKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIFJlZnJlc2ggY3VycmVudCB2aWV3XHJcblx0XHRcdFx0dGhpcy5zd2l0Y2hWaWV3KHRoaXMuY3VycmVudFZpZXdJZCwgdW5kZWZpbmVkLCB0cnVlKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRuZXcgTm90aWNlKFxyXG5cdFx0XHRcdFx0dChcIkZhaWxlZCB0byBkZWxldGUgdGFza1wiKSArXHJcblx0XHRcdFx0XHRcIjogXCIgK1xyXG5cdFx0XHRcdFx0KHJlc3VsdC5lcnJvciB8fCBcIlVua25vd24gZXJyb3JcIilcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRXJyb3IgZGVsZXRpbmcgdGFzazpcIiwgZXJyb3IpO1xyXG5cdFx0XHRuZXcgTm90aWNlKHQoXCJGYWlsZWQgdG8gZGVsZXRlIHRhc2tcIikgKyBcIjogXCIgKyBlcnJvci5tZXNzYWdlKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGFzeW5jIG9uQ2xvc2UoKSB7XHJcblx0XHQvLyBDbGVhbnVwIFR3b0NvbHVtblZpZXcgY29tcG9uZW50c1xyXG5cdFx0dGhpcy50d29Db2x1bW5WaWV3Q29tcG9uZW50cy5mb3JFYWNoKChjb21wb25lbnQpID0+IHtcclxuXHRcdFx0dGhpcy5yZW1vdmVDaGlsZChjb21wb25lbnQpO1xyXG5cdFx0fSk7XHJcblx0XHR0aGlzLnR3b0NvbHVtblZpZXdDb21wb25lbnRzLmNsZWFyKCk7XHJcblxyXG5cdFx0Ly8gQ2xlYW51cCBzcGVjaWFsIHZpZXcgY29tcG9uZW50c1xyXG5cdFx0Ly8gdGhpcy52aWV3Q29tcG9uZW50TWFuYWdlci5jbGVhbnVwKCk7XHJcblxyXG5cdFx0dGhpcy51bmxvYWQoKTtcclxuXHRcdHRoaXMucm9vdENvbnRhaW5lckVsLmVtcHR5KCk7XHJcblx0XHR0aGlzLnJvb3RDb250YWluZXJFbC5kZXRhY2goKTtcclxuXHR9XHJcblxyXG5cdG9uU2V0dGluZ3NVcGRhdGUoKSB7XHJcblx0XHRjb25zb2xlLmxvZyhcIlRhc2tWaWV3IHJlY2VpdmVkIHNldHRpbmdzIHVwZGF0ZSBub3RpZmljYXRpb24uXCIpO1xyXG5cdFx0aWYgKHR5cGVvZiB0aGlzLnNpZGViYXJDb21wb25lbnQucmVuZGVyU2lkZWJhckl0ZW1zID09PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0dGhpcy5zaWRlYmFyQ29tcG9uZW50LnJlbmRlclNpZGViYXJJdGVtcygpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFwiVGFza1ZpZXc6IFNpZGViYXJDb21wb25lbnQgZG9lcyBub3QgaGF2ZSByZW5kZXJTaWRlYmFySXRlbXMgbWV0aG9kLlwiXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8g5qOA5p+l5b2T5YmN6KeG5Zu+55qE57G75Z6L5piv5ZCm5Y+R55Sf5Y+Y5YyW77yI5q+U5aaC5LuO5Lik5YiX5YiH5o2i5Yiw5Y2V5YiX77yJXHJcblx0XHRjb25zdCBjdXJyZW50Vmlld0NvbmZpZyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnZpZXdDb25maWd1cmF0aW9uLmZpbmQoXHJcblx0XHRcdCh2KSA9PiB2LmlkID09PSB0aGlzLmN1cnJlbnRWaWV3SWRcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8g5aaC5p6c5b2T5YmN5piv5Lik5YiX6KeG5Zu+5L2G6YWN572u5bey5pS55Li66Z2e5Lik5YiX77yM6ZyA6KaB6ZSA5q+B5Lik5YiX57uE5Lu2XHJcblx0XHRjb25zdCBjdXJyZW50VHdvQ29sdW1uID0gdGhpcy50d29Db2x1bW5WaWV3Q29tcG9uZW50cy5nZXQoXHJcblx0XHRcdHRoaXMuY3VycmVudFZpZXdJZFxyXG5cdFx0KTtcclxuXHRcdGlmIChcclxuXHRcdFx0Y3VycmVudFR3b0NvbHVtbiAmJlxyXG5cdFx0XHRjdXJyZW50Vmlld0NvbmZpZz8uc3BlY2lmaWNDb25maWc/LnZpZXdUeXBlICE9PSBcInR3b2NvbHVtblwiXHJcblx0XHQpIHtcclxuXHRcdFx0Ly8g6ZSA5q+B5Lik5YiX6KeG5Zu+57uE5Lu2IC0g5L2/55SoIHVubG9hZCDmlrnms5XmnaXmuIXnkIYgQ29tcG9uZW50XHJcblx0XHRcdGN1cnJlbnRUd29Db2x1bW4udW5sb2FkKCk7XHJcblx0XHRcdHRoaXMudHdvQ29sdW1uVmlld0NvbXBvbmVudHMuZGVsZXRlKHRoaXMuY3VycmVudFZpZXdJZCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8g6YeN5paw5YiH5o2i5Yiw5b2T5YmN6KeG5Zu+5Lul5bqU55So5paw6YWN572uXHJcblx0XHR0aGlzLnN3aXRjaFZpZXcodGhpcy5jdXJyZW50Vmlld0lkLCB1bmRlZmluZWQsIHRydWUpOyAvLyBmb3JjZVJlZnJlc2ggdG8gYXBwbHkgbmV3IGxheW91dFxyXG5cdFx0dGhpcy51cGRhdGVIZWFkZXJEaXNwbGF5KCk7XHJcblx0fVxyXG5cclxuXHQvLyBNZXRob2QgdG8gaGFuZGxlIHN0YXR1cyB1cGRhdGVzIG9yaWdpbmF0aW5nIGZyb20gS2FuYmFuIGRyYWctYW5kLWRyb3BcclxuXHRwcml2YXRlIGhhbmRsZUthbmJhblRhc2tTdGF0dXNVcGRhdGUgPSBhc3luYyAoXHJcblx0XHR0YXNrSWQ6IHN0cmluZyxcclxuXHRcdG5ld1N0YXR1c01hcms6IHN0cmluZ1xyXG5cdCkgPT4ge1xyXG5cdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdGBUYXNrVmlldyBoYW5kbGluZyBLYW5iYW4gc3RhdHVzIHVwZGF0ZSByZXF1ZXN0IGZvciAke3Rhc2tJZH0gdG8gbWFyayAke25ld1N0YXR1c01hcmt9YFxyXG5cdFx0KTtcclxuXHRcdGNvbnN0IHRhc2tUb1VwZGF0ZSA9IHRoaXMudGFza3MuZmluZCgodCkgPT4gdC5pZCA9PT0gdGFza0lkKTtcclxuXHJcblx0XHRpZiAodGFza1RvVXBkYXRlKSB7XHJcblx0XHRcdGNvbnN0IGlzQ29tcGxldGVkID0gdGhpcy5pc0NvbXBsZXRlZE1hcmsobmV3U3RhdHVzTWFyayk7XHJcblx0XHRcdGNvbnN0IGNvbXBsZXRlZERhdGUgPSBpc0NvbXBsZXRlZCA/IERhdGUubm93KCkgOiB1bmRlZmluZWQ7XHJcblxyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0dGFza1RvVXBkYXRlLnN0YXR1cyAhPT0gbmV3U3RhdHVzTWFyayB8fFxyXG5cdFx0XHRcdHRhc2tUb1VwZGF0ZS5jb21wbGV0ZWQgIT09IGlzQ29tcGxldGVkXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRhd2FpdCB0aGlzLnVwZGF0ZVRhc2sodGFza1RvVXBkYXRlLCB7XHJcblx0XHRcdFx0XHRcdC4uLnRhc2tUb1VwZGF0ZSxcclxuXHRcdFx0XHRcdFx0c3RhdHVzOiBuZXdTdGF0dXNNYXJrLFxyXG5cdFx0XHRcdFx0XHRjb21wbGV0ZWQ6IGlzQ29tcGxldGVkLFxyXG5cdFx0XHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0XHRcdC4uLnRhc2tUb1VwZGF0ZS5tZXRhZGF0YSxcclxuXHRcdFx0XHRcdFx0XHRjb21wbGV0ZWREYXRlOiBjb21wbGV0ZWREYXRlLFxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdFx0YFRhc2sgJHt0YXNrSWR9IHN0YXR1cyB1cGRhdGUgcHJvY2Vzc2VkIGJ5IFRhc2tWaWV3LmBcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXHJcblx0XHRcdFx0XHRcdGBUYXNrVmlldyBmYWlsZWQgdG8gdXBkYXRlIHRhc2sgc3RhdHVzIGZyb20gS2FuYmFuIGNhbGxiYWNrIGZvciB0YXNrICR7dGFza0lkfTpgLFxyXG5cdFx0XHRcdFx0XHRlcnJvclxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRgVGFzayAke3Rhc2tJZH0gc3RhdHVzICgke25ld1N0YXR1c01hcmt9KSBhbHJlYWR5IG1hdGNoZXMsIG5vIHVwZGF0ZSBuZWVkZWQuYFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRgVGFza1ZpZXcgY291bGQgbm90IGZpbmQgdGFzayB3aXRoIElEICR7dGFza0lkfSBmb3IgS2FuYmFuIHN0YXR1cyB1cGRhdGUuYFxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdC8vIOa3u+WKoOmHjee9ruetm+mAieWZqOeahOaWueazlVxyXG5cdHB1YmxpYyByZXNldEN1cnJlbnRGaWx0ZXIoKSB7XHJcblx0XHRjb25zb2xlLmxvZyhcIumHjee9ruWunuaXtuetm+mAieWZqFwiKTtcclxuXHRcdHRoaXMubGl2ZUZpbHRlclN0YXRlID0gbnVsbDtcclxuXHRcdHRoaXMuY3VycmVudEZpbHRlclN0YXRlID0gbnVsbDtcclxuXHRcdHRoaXMuYXBwLnNhdmVMb2NhbFN0b3JhZ2UoXCJ0YXNrLWdlbml1cy12aWV3LWZpbHRlclwiLCBudWxsKTtcclxuXHRcdHRoaXMuYXBwbHlDdXJyZW50RmlsdGVyKCk7XHJcblx0XHR0aGlzLnVwZGF0ZUFjdGlvbkJ1dHRvbnMoKTtcclxuXHR9XHJcblxyXG5cdC8vIOW6lOeUqOS/neWtmOeahOetm+mAieWZqOmFjee9rlxyXG5cdHByaXZhdGUgYXBwbHlTYXZlZEZpbHRlcihjb25maWc6IFNhdmVkRmlsdGVyQ29uZmlnKSB7XHJcblx0XHRjb25zb2xlLmxvZyhcIuW6lOeUqOS/neWtmOeahOetm+mAieWZqDpcIiwgY29uZmlnLm5hbWUpO1xyXG5cdFx0dGhpcy5saXZlRmlsdGVyU3RhdGUgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGNvbmZpZy5maWx0ZXJTdGF0ZSkpO1xyXG5cdFx0dGhpcy5jdXJyZW50RmlsdGVyU3RhdGUgPSBKU09OLnBhcnNlKFxyXG5cdFx0XHRKU09OLnN0cmluZ2lmeShjb25maWcuZmlsdGVyU3RhdGUpXHJcblx0XHQpO1xyXG5cdFx0Y29uc29sZS5sb2coXCJhcHBseVNhdmVkRmlsdGVyXCIsIHRoaXMubGl2ZUZpbHRlclN0YXRlKTtcclxuXHRcdHRoaXMuYXBwLnNhdmVMb2NhbFN0b3JhZ2UoXHJcblx0XHRcdFwidGFzay1nZW5pdXMtdmlldy1maWx0ZXJcIixcclxuXHRcdFx0dGhpcy5saXZlRmlsdGVyU3RhdGVcclxuXHRcdCk7XHJcblx0XHR0aGlzLmFwcGx5Q3VycmVudEZpbHRlcigpO1xyXG5cdFx0dGhpcy51cGRhdGVBY3Rpb25CdXR0b25zKCk7XHJcblx0XHRuZXcgTm90aWNlKHQoXCJGaWx0ZXIgYXBwbGllZDogXCIpICsgY29uZmlnLm5hbWUpO1xyXG5cdH1cclxufVxyXG4iXX0=