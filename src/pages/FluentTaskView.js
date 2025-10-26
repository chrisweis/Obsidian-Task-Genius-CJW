import { __awaiter } from "tslib";
import { ItemView } from "obsidian";
import "@/styles/fluent/fluent-main.css";
import "@/styles/fluent/fluent-secondary.css";
import "@/styles/fluent/fluent-content-header.css";
import "@/styles/fluent/fluent-project-popover.css";
import { TopNavigation } from "@/components/features/fluent/components/FluentTopNavigation";
import { onWorkspaceSwitched, onWorkspaceOverridesSaved, onSidebarSelectionChanged, } from "@/components/features/fluent/events/ui-event";
import { Events, on } from "@/dataflow/events/Events";
import { Platform } from "obsidian";
import { t } from "@/translations/helper";
// Import managers
import { FluentDataManager } from "@/components/features/fluent/managers/FluentDataManager";
import { FluentLayoutManager } from "@/components/features/fluent/managers/FluentLayoutManager";
import { FluentComponentManager } from "@/components/features/fluent/managers/FluentComponentManager";
import { FluentGestureManager } from "@/components/features/fluent/managers/FluentGestureManager";
import { FluentWorkspaceStateManager } from "@/components/features/fluent/managers/FluentWorkspaceStateManager";
import { FluentActionHandlers } from "@/components/features/fluent/managers/FluentActionHandlers";
export const FLUENT_TASK_VIEW = "fluent-task-genius-view";
/**
 * TaskViewV2 - Main view coordinator with centralized state management
 *
 * This class is the single source of truth for all state:
 * - tasks: All loaded tasks
 * - filteredTasks: Filtered tasks for current view
 * - currentViewId: Active view (inbox, today, projects, etc.)
 * - viewState: UI state (searchQuery, filters, viewMode, etc.)
 * - selectedTask: Currently selected task
 *
 * Managers are stateless executors that receive state and return results via callbacks.
 * State flows: Manager executes → Callback → TaskViewV2 updates state → Notifies other managers
 */
export class FluentTaskView extends ItemView {
    constructor(leaf, plugin) {
        var _a;
        super(leaf);
        // ====================
        // CENTRALIZED STATE - Single source of truth
        // ====================
        // Data state
        this.tasks = [];
        this.filteredTasks = [];
        this.isLoading = false;
        this.loadError = null;
        // View state
        this.currentViewId = "inbox";
        this.viewState = {
            currentWorkspace: "",
            viewMode: "list",
            searchQuery: "",
            filters: {},
            filterInputValue: "",
            selectedProject: undefined,
        };
        // Filter state
        this.currentFilterState = null;
        this.liveFilterState = null;
        // Selection state
        this.selectedTask = null;
        // Workspace state
        this.workspaceId = "";
        // Initialization state
        this.isInitializing = true;
        this.plugin = plugin;
        this.tasks = this.plugin.preloadedTasks || [];
        // Initialize workspace ID
        this.workspaceId =
            ((_a = plugin.workspaceManager) === null || _a === void 0 ? void 0 : _a.getActiveWorkspace().id) || "";
        this.viewState.currentWorkspace = this.workspaceId;
    }
    getViewType() {
        return FLUENT_TASK_VIEW;
    }
    getDisplayText() {
        return t("Task Genius Fluent");
    }
    getIcon() {
        return "layout-dashboard";
    }
    /**
     * Check if using workspace side leaves mode
     */
    useSideLeaves() {
        var _a;
        return !!((_a = (this.plugin.settings.fluentView)) === null || _a === void 0 ? void 0 : _a.useWorkspaceSideLeaves);
    }
    /**
     * Main initialization method
     */
    onOpen() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("[TG-V2] onOpen started");
            this.isInitializing = true;
            this.contentEl.empty();
            this.contentEl.toggleClass(["task-genius-fluent-view", "task-genius-view"], true);
            // Create root container (use exact same class as original)
            this.rootContainerEl = this.contentEl.createDiv({
                cls: "tg-fluent-container",
            });
            // Add mobile class for proper styling
            if (Platform.isPhone) {
                this.rootContainerEl.addClass("is-mobile");
            }
            // Initialize managers first (before UI)
            this.initializeManagers();
            // Build UI structure
            yield this.buildUIStructure();
            // Subscribe to workspace and global events
            this.registerEvents();
            // Load workspace state
            const savedWorkspaceId = this.workspaceStateManager.getSavedWorkspaceId();
            if (savedWorkspaceId && savedWorkspaceId !== this.workspaceId) {
                this.workspaceId = savedWorkspaceId;
                this.viewState.currentWorkspace = savedWorkspaceId;
            }
            // Apply workspace settings and restore filter state
            yield this.workspaceStateManager.applyWorkspaceSettings();
            const restored = this.workspaceStateManager.restoreFilterStateFromWorkspace();
            if (restored) {
                this.viewState.filters = restored.filters;
                this.viewState.selectedProject = restored.selectedProject;
                this.currentFilterState = restored.advancedFilter;
                this.viewState.viewMode = restored.viewMode;
                if (restored.shouldClearSearch) {
                    this.viewState.searchQuery = "";
                    this.viewState.filterInputValue = "";
                }
            }
            // Initial data load
            yield this.dataManager.loadTasks(false); // Will trigger onTasksLoaded callback
            // Register dataflow listeners for real-time updates
            yield this.dataManager.registerDataflowListeners();
            // Initial render
            this.updateView();
            // Check window size and auto-collapse sidebar if needed
            this.layoutManager.checkAndCollapseSidebar();
            this.isInitializing = false;
        });
    }
    /**
     * Initialize all managers with callbacks
     */
    initializeManagers() {
        // 1. FluentDataManager - Data loading and filtering
        this.dataManager = new FluentDataManager(this.plugin, () => this.currentViewId, () => ({
            liveFilterState: this.liveFilterState,
            currentFilterState: this.currentFilterState,
            viewStateFilters: this.viewState.filters,
            selectedProject: this.viewState.selectedProject || undefined,
            searchQuery: this.viewState.searchQuery || "",
            filterInputValue: this.viewState.filterInputValue || "",
        }), () => this.isInitializing);
        this.dataManager.setCallbacks({
            onTasksLoaded: (tasks, error) => {
                var _a;
                if (error) {
                    this.loadError = error;
                    this.isLoading = false;
                    (_a = this.componentManager) === null || _a === void 0 ? void 0 : _a.renderErrorState(error, () => {
                        this.dataManager.loadTasks();
                    });
                }
                else {
                    this.tasks = tasks;
                    this.loadError = null;
                    this.isLoading = false;
                    // Apply filters immediately after loading
                    this.filteredTasks = this.dataManager.applyFilters(this.tasks, this.currentViewId);
                    this.updateView();
                }
            },
            onLoadingStateChanged: (isLoading) => {
                var _a;
                this.isLoading = isLoading;
                if (isLoading && !this.isInitializing) {
                    (_a = this.componentManager) === null || _a === void 0 ? void 0 : _a.renderLoadingState();
                }
            },
            onUpdateNeeded: (source) => {
                console.log(`[TG-V2] Update needed from source: ${source}`);
                // Re-apply filters and update view
                this.filteredTasks = this.dataManager.applyFilters(this.tasks, this.currentViewId);
                this.updateView();
            },
        });
        this.addChild(this.dataManager);
        // 2. FluentActionHandlers - User actions
        this.actionHandlers = new FluentActionHandlers(this.app, this.plugin, () => this.workspaceId, () => this.useSideLeaves());
        this.actionHandlers.setCallbacks({
            onTaskSelectionChanged: (task) => {
                this.selectedTask = task;
                if (task) {
                    this.layoutManager.showTaskDetails(task);
                }
            },
            onTaskUpdated: (taskId, updatedTask) => {
                // Update task in cache
                const index = this.tasks.findIndex((t) => t.id === taskId);
                if (index !== -1) {
                    this.tasks[index] = updatedTask;
                    // Re-apply filters
                    this.filteredTasks = this.dataManager.applyFilters(this.tasks, this.currentViewId);
                    this.updateView();
                }
            },
            onTaskDeleted: (taskId, deleteChildren) => {
                // Remove task from cache
                if (deleteChildren) {
                    // Remove task and all children recursively
                    const toRemove = new Set([taskId]);
                    const findChildren = (id) => {
                        var _a;
                        const task = this.tasks.find((t) => t.id === id);
                        if ((_a = task === null || task === void 0 ? void 0 : task.metadata) === null || _a === void 0 ? void 0 : _a.children) {
                            for (const childId of task.metadata.children) {
                                toRemove.add(childId);
                                findChildren(childId);
                            }
                        }
                    };
                    findChildren(taskId);
                    this.tasks = this.tasks.filter((t) => !toRemove.has(t.id));
                }
                else {
                    this.tasks = this.tasks.filter((t) => t.id !== taskId);
                }
                // Re-apply filters
                this.filteredTasks = this.dataManager.applyFilters(this.tasks, this.currentViewId);
                this.updateView();
            },
            onNavigateToView: (viewId) => {
                // Save current view's state before switching
                this.workspaceStateManager.saveFilterStateToWorkspace();

                // Update to new view
                const previousViewId = this.currentViewId;
                this.currentViewId = viewId;

                // Restore the new view's saved state
                const restored = this.workspaceStateManager.restoreFilterStateFromWorkspace();
                if (restored) {
                    console.log(`[TG-V2] Restoring saved state for view: ${viewId}`, restored);
                    this.viewState.filters = restored.filters || [];
                    this.viewState.selectedProject = restored.selectedProject;
                    this.currentFilterState = restored.advancedFilter;
                    this.viewState.viewMode = restored.viewMode;
                    // Note: Preserve search query when switching views
                } else {
                    console.log(`[TG-V2] No saved state for view: ${viewId}, clearing filters`);
                    // Clear all filters for views without saved state
                    this.viewState.filters = [];
                    this.viewState.selectedProject = undefined;
                    this.currentFilterState = undefined;
                }

                // Re-apply filters with restored state
                this.filteredTasks = this.dataManager.applyFilters(this.tasks, this.currentViewId);
                this.updateView();
            },
            onSearchQueryChanged: (query) => {
                this.viewState.searchQuery = query;
                this.viewState.filterInputValue = query;
                // Re-apply filters
                this.filteredTasks = this.dataManager.applyFilters(this.tasks, this.currentViewId);
                this.updateView();
            },
            onProjectSelected: (projectId) => {
                console.log(`[TG-V2] Project selected: ${projectId}`);
                this.viewState.selectedProject = projectId;
                // Switch to projects view
                this.currentViewId = "projects";
                // Reflect selection into the Filter UI state so the top Filter button shows active and can be reset via "X"
                try {
                    const timestamp = Date.now();
                    const nextState = this.liveFilterState || {
                        rootCondition: "all",
                        filterGroups: [],
                    };
                    // Remove any existing project filters and empty groups to avoid duplicates
                    nextState.filterGroups = (nextState.filterGroups || [])
                        .map((g) => (Object.assign(Object.assign({}, g), { filters: (g.filters || []).filter((f) => f.property !== "project") })))
                        .filter((g) => g.filters && g.filters.length > 0); // Remove empty groups
                    // Only add project filter if projectId is not empty
                    if (projectId && projectId.trim() !== "") {
                        // Append a dedicated group for project filter to enforce AND semantics
                        nextState.filterGroups.push({
                            id: `fluent-proj-group-${timestamp}`,
                            groupCondition: "all",
                            filters: [
                                {
                                    id: `fluent-proj-filter-${timestamp}`,
                                    property: "project",
                                    condition: "is",
                                    value: projectId,
                                },
                            ],
                        });
                    }
                    this.liveFilterState = nextState;
                    this.currentFilterState = nextState;
                    this.app.saveLocalStorage("task-genius-view-filter", nextState);
                    // Broadcast so any open filter UI reacts and header button shows reset
                    // The filter-changed event listener will handle applyFilters and updateView
                    this.app.workspace.trigger("task-genius:filter-changed", nextState);
                }
                catch (e) {
                    console.warn("[TG-V2] Failed to project-sync filter UI state", e);
                    // If filter sync fails, still update the view
                    this.filteredTasks = this.dataManager.applyFilters(this.tasks, this.currentViewId);
                    this.updateView();
                }
            },
            onViewModeChanged: (mode) => {
                this.viewState.viewMode = mode;
                this.updateView();
                // Save to workspace
                this.workspaceStateManager.saveFilterStateToWorkspace();
            },
            showDetailsPanel: (task) => {
                this.layoutManager.showTaskDetails(task);
            },
            toggleDetailsVisibility: (visible) => {
                this.layoutManager.toggleDetailsVisibility(visible);
            },
            getIsDetailsVisible: () => this.layoutManager.isDetailsVisible,
        });
        this.addChild(this.actionHandlers);
        // 3. FluentWorkspaceStateManager - State persistence
        this.workspaceStateManager = new FluentWorkspaceStateManager(this.app, this.plugin, () => this.workspaceId, () => this.currentViewId, () => ({
            filters: this.viewState.filters || {},
            selectedProject: this.viewState.selectedProject || undefined,
            searchQuery: this.viewState.searchQuery || "",
            viewMode: this.viewState.viewMode,
        }), () => this.currentFilterState, () => this.liveFilterState);
        this.addChild(this.workspaceStateManager);
        console.log("[TG-V2] Managers initialized");
    }
    /**
     * Build UI structure - MUST match original DOM structure for CSS
     */
    buildUIStructure() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("[TG-V2] Building UI structure");
            // Create layout structure (exact same as original)
            const layoutContainer = this.rootContainerEl.createDiv({
                cls: "tg-fluent-layout",
            });
            // Sidebar
            const sidebarEl = layoutContainer.createDiv({
                cls: "tg-fluent-sidebar-container",
            });
            // Add mobile-specific classes and overlay
            if (Platform.isPhone) {
                sidebarEl.addClass("is-mobile-drawer");
            }
            // Main content container (IMPORTANT: this was missing!)
            const mainContainer = layoutContainer.createDiv({
                cls: "tg-fluent-main-container",
            });
            // Top navigation
            const topNavEl = mainContainer.createDiv({
                cls: "tg-fluent-top-nav",
            });
            // Content wrapper (IMPORTANT: this was missing!)
            const contentWrapper = mainContainer.createDiv({
                cls: "tg-fluent-content-wrapper",
            });
            // Actual content area
            this.contentArea = contentWrapper.createDiv({
                cls: "tg-fluent-content",
            });
            // Decide whether to use separate workspace side leaves
            const useWorkspaceSideLeaves = this.useSideLeaves();
            // Initialize FluentLayoutManager
            // Note: headerEl and titleEl are provided by Obsidian's ItemView
            this.layoutManager = new FluentLayoutManager(this.app, this.plugin, this, this.rootContainerEl, this.headerEl, // Obsidian's view header
            this.titleEl, // Obsidian's view title element
            () => this.filteredTasks.length);
            this.layoutManager.setOnSidebarNavigate((viewId) => {
                this.actionHandlers.handleNavigate(viewId);
            });
            this.layoutManager.setOnProjectSelect((projectId) => {
                this.actionHandlers.handleProjectSelect(projectId);
            });
            this.layoutManager.setTaskCallbacks({
                onTaskToggleComplete: (task) => {
                    this.actionHandlers.toggleTaskCompletion(task);
                },
                onTaskEdit: (task) => {
                    this.actionHandlers.handleTaskSelection(task);
                },
                onTaskUpdate: (originalTask, updatedTask) => __awaiter(this, void 0, void 0, function* () {
                    yield this.actionHandlers.handleTaskUpdate(originalTask, updatedTask);
                }),
            });
            this.addChild(this.layoutManager);
            if (!useWorkspaceSideLeaves) {
                // Initialize details component (non-leaves mode only)
                this.layoutManager.initializeDetailsComponent();
                // Initialize sidebar (non-leaves mode only)
                this.layoutManager.initializeSidebar(sidebarEl);
                // Setup drawer overlay for mobile
                if (Platform.isPhone) {
                    this.layoutManager.setupDrawerOverlay(layoutContainer);
                }
            }
            else {
                sidebarEl.hide();
                console.log("[TG-V2] Using workspace side leaves: skip in-view sidebar");
            }
            // Create top navigation
            console.log("[TG-V2] Initializing top navigation");
            this.topNavigation = new TopNavigation(topNavEl, this.plugin, (query) => this.actionHandlers.handleSearch(query), (mode) => this.actionHandlers.handleViewModeChange(mode), () => {
                // Filter click - open filter modal/popover
                // TODO: Implement filter modal
            }, () => {
                // Sort click
                // TODO: Implement sort
            }, () => this.actionHandlers.handleSettingsClick());
            this.addChild(this.topNavigation);
            // Initialize view components
            console.log("[TG-V2] Initializing view components");
            this.componentManager = new FluentComponentManager(this.app, this.plugin, this.contentArea, this, // parent view
            {
                onTaskSelected: (task) => {
                    this.actionHandlers.handleTaskSelection(task);
                },
                onTaskCompleted: (task) => {
                    this.actionHandlers.toggleTaskCompletion(task);
                },
                onTaskUpdate: (originalTask, updatedTask) => __awaiter(this, void 0, void 0, function* () {
                    yield this.actionHandlers.handleTaskUpdate(originalTask, updatedTask);
                }),
                onTaskContextMenu: (event, task) => {
                    this.actionHandlers.handleTaskContextMenu(event, task);
                },
                onKanbanTaskStatusUpdate: (taskId, newStatusMark) => {
                    const task = this.tasks.find((t) => t.id === taskId);
                    if (task) {
                        this.actionHandlers.handleKanbanTaskStatusUpdate(task, newStatusMark);
                    }
                },
            });
            this.addChild(this.componentManager);
            this.componentManager.initializeViewComponents();
            // Sidebar toggle in header and responsive collapse
            console.log("[TG-V2] Creating sidebar toggle");
            this.layoutManager.createSidebarToggle();
            // Create task count mark
            this.layoutManager.createTaskMark();
            // Initialize FluentGestureManager for mobile gestures
            this.gestureManager = new FluentGestureManager(this.rootContainerEl);
            this.gestureManager.setDrawerCallbacks({
                onOpenDrawer: () => this.layoutManager.openMobileDrawer(),
                onCloseDrawer: () => this.layoutManager.closeMobileDrawer(),
                getIsMobileDrawerOpen: () => this.layoutManager.isMobileDrawerOpen,
            });
            this.gestureManager.initializeMobileSwipeGestures();
            this.addChild(this.gestureManager);
            // Set up filter callbacks for action buttons
            this.layoutManager.setFilterCallbacks({
                onFilterReset: () => this.resetCurrentFilter(),
                getLiveFilterState: () => this.liveFilterState,
            });
            // Create action buttons in Obsidian view header
            console.log("[TG-V2] Creating action buttons");
            this.layoutManager.createActionButtons();
            console.log("[TG-V2] UI structure built");
        });
    }
    /**
     * Register workspace and global events
     */
    registerEvents() {
        // Workspace switch event
        if (this.plugin.workspaceManager) {
            this.registerEvent(onWorkspaceSwitched(this.app, (payload) => __awaiter(this, void 0, void 0, function* () {
                if (payload.workspaceId !== this.workspaceId) {
                    // Save current workspace state
                    this.workspaceStateManager.saveWorkspaceLayout();
                    // Switch to new workspace
                    this.workspaceId = payload.workspaceId;
                    this.viewState.currentWorkspace = payload.workspaceId;
                    // Apply new workspace settings
                    yield this.workspaceStateManager.applyWorkspaceSettings();
                    // Restore filter state
                    const restored = this.workspaceStateManager.restoreFilterStateFromWorkspace();
                    if (restored) {
                        this.viewState.filters = restored.filters;
                        this.viewState.selectedProject =
                            restored.selectedProject;
                        this.currentFilterState = restored.advancedFilter;
                        this.viewState.viewMode = restored.viewMode;
                        if (restored.shouldClearSearch) {
                            this.viewState.searchQuery = "";
                            this.viewState.filterInputValue = "";
                        }
                    }
                    // Reload tasks
                    yield this.dataManager.loadTasks();
                }
            })));
            // Workspace overrides saved event
            this.registerEvent(onWorkspaceOverridesSaved(this.app, (payload) => __awaiter(this, void 0, void 0, function* () {
                if (payload.workspaceId === this.workspaceId) {
                    yield this.workspaceStateManager.applyWorkspaceSettings();
                    yield this.dataManager.loadTasks();
                }
            })));
            // Settings changed event (skip for filter state changes)
            this.registerEvent(on(this.app, Events.SETTINGS_CHANGED, () => __awaiter(this, void 0, void 0, function* () {
                // Reload on settings change (unless caused by filter state save)
                yield this.dataManager.loadTasks();
            })));
        }
        // Listen for filter change events
        this.registerEvent(this.app.workspace.on("task-genius:filter-changed", (filterState, leafId) => {
            // Only update if it's from a live filter component
            if (leafId &&
                !leafId.startsWith("view-config-") &&
                leafId !== "global-filter") {
                console.log("[TG-V2] Filter changed from live component");
                this.liveFilterState = filterState;
                this.currentFilterState = filterState;
            }
            else if (!leafId) {
                // No leafId means it's also a live filter change
                console.log("[TG-V2] Filter changed (no leafId)");
                this.liveFilterState = filterState;
                this.currentFilterState = filterState;
            }
            // Sync selectedProject with filter UI state (if project filter is present)
            try {
                const groups = (filterState === null || filterState === void 0 ? void 0 : filterState.filterGroups) || [];
                const projectFilters = [];
                for (const g of groups) {
                    for (const f of g.filters || []) {
                        if (f.property === "project" &&
                            f.condition === "is" &&
                            typeof f.value === "string" &&
                            f.value.trim() !== "") {
                            projectFilters.push(f.value);
                        }
                    }
                }
                if (projectFilters.length > 0) {
                    this.viewState.selectedProject = projectFilters[0];
                }
                else {
                    this.viewState.selectedProject = undefined;
                }
            }
            catch (e) {
                console.warn("[TG-V2] Failed to sync selectedProject from filter state", e);
            }
            // Persist and update header UI
            this.workspaceStateManager.saveFilterStateToWorkspace();
            this.layoutManager.updateActionButtons();
            // Apply filters and update view
            this.filteredTasks = this.dataManager.applyFilters(this.tasks, this.currentViewId);
            this.updateView();
        }));
        // Sidebar selection changed (when using side leaves)
        if (this.useSideLeaves()) {
            this.registerEvent(onSidebarSelectionChanged(this.app, (payload) => {
                if (payload.workspaceId === this.workspaceId) {
                    if (payload.selectionType === "view" &&
                        payload.selectionId) {
                        this.currentViewId = payload.selectionId;
                        this.updateView();
                    }
                    if (payload.selectionType === "project" &&
                        payload.selectionId !== undefined) {
                        // Use the full project selection logic via actionHandlers
                        this.actionHandlers.handleProjectSelect(payload.selectionId || "");
                    }
                }
            }));
        }
        // Window resize
        this.registerDomEvent(window, "resize", () => {
            this.layoutManager.onResize();
        });
    }
    /**
     * Update view with current state
     */
    updateView() {
        if (this.isInitializing) {
            console.log("[TG-V2] Skip update during initialization");
            return;
        }
        console.log(`[TG-V2] updateView: viewId=${this.currentViewId}, tasks=${this.tasks.length}, filtered=${this.filteredTasks.length}`);
        // Update task count
        this.layoutManager.updateTaskMark();
        // Update sidebar active item
        this.layoutManager.setSidebarActiveItem(this.currentViewId);
        // Show loading state
        if (this.isLoading) {
            this.componentManager.renderLoadingState();
            return;
        }
        // Show error state
        if (this.loadError) {
            this.componentManager.renderErrorState(this.loadError, () => {
                this.dataManager.loadTasks();
            });
            return;
        }
        // Show empty state
        if (this.tasks.length === 0) {
            this.componentManager.renderEmptyState();
            return;
        }
        // Switch to appropriate component
        this.componentManager.switchView(this.currentViewId, this.tasks, this.filteredTasks, this.currentFilterState, this.viewState.viewMode, this.viewState.selectedProject);
    }
    /**
     * Reset all active filters
     */
    resetCurrentFilter() {
        console.log("[TG-V2] Resetting filter");
        // Clear filter states
        this.liveFilterState = null;
        this.currentFilterState = null;
        this.viewState.selectedProject = undefined; // keep project state in sync when clearing via UI
        // Clear localStorage
        this.app.saveLocalStorage("task-genius-view-filter", null);
        // Save the cleared filter state to workspace
        this.workspaceStateManager.saveFilterStateToWorkspace();
        // Broadcast filter change to ensure UI components update
        this.app.workspace.trigger("task-genius:filter-changed", {
            rootCondition: "all",
            filterGroups: [],
        });
        // Clear any active project selection in sidebar
        this.layoutManager.setActiveProject(null);
        // Re-apply filters (which will now be empty) and update view
        this.filteredTasks = this.dataManager.applyFilters(this.tasks, this.currentViewId);
        this.updateView();
        // Update action buttons (to remove Reset Filter button)
        this.layoutManager.updateActionButtons();
    }
    /**
     * Get current state (for debugging)
     */
    getState() {
        return Object.assign(Object.assign({}, this.viewState), { currentViewId: this.currentViewId });
    }
    /**
     * Set state (for debugging)
     */
    setState(state, result) {
        return __awaiter(this, void 0, void 0, function* () {
            // Restore state if needed
        });
    }
    /**
     * Clean up on close
     */
    onClose() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("[TG-V2] onClose started");
            // Save workspace layout before closing
            this.workspaceStateManager.saveWorkspaceLayout();
            // Clear selection
            this.actionHandlers.clearSelection();
            console.log("[TG-V2] onClose completed");
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmx1ZW50VGFza1ZpZXcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJGbHVlbnRUYXNrVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFFLFFBQVEsRUFBaUIsTUFBTSxVQUFVLENBQUM7QUFHbkQsT0FBTyxpQ0FBaUMsQ0FBQztBQUN6QyxPQUFPLHNDQUFzQyxDQUFDO0FBQzlDLE9BQU8sMkNBQTJDLENBQUM7QUFDbkQsT0FBTyw0Q0FBNEMsQ0FBQztBQUNwRCxPQUFPLEVBQUUsYUFBYSxFQUFZLE1BQU0sNkRBQTZELENBQUM7QUFFdEcsT0FBTyxFQUNOLG1CQUFtQixFQUNuQix5QkFBeUIsRUFDekIseUJBQXlCLEdBQ3pCLE1BQU0sOENBQThDLENBQUM7QUFDdEQsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUV0RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQ3BDLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUUxQyxrQkFBa0I7QUFDbEIsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDNUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDaEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDdEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbEcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDaEgsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFbEcsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcseUJBQXlCLENBQUM7QUFFMUQ7Ozs7Ozs7Ozs7OztHQVlHO0FBQ0gsTUFBTSxPQUFPLGNBQWUsU0FBUSxRQUFRO0lBc0QzQyxZQUFZLElBQW1CLEVBQUUs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RUFBRSxDQUFDO0lBQzFDLENBQUM7SUFFRDs7T0FFRztJQUNILFFBQVE7UUFDUCx1Q0FDSSxJQUFJLENBQUMsU0FBUyxLQUNqQixhQUFhLEVBQUUsSUFBSSxDQUFDLGFBQWEsSUFDaEM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDRyxRQUFRLENBQUMsS0FBVSxFQUFFLE1BQVc7O1lBQ3JDLDBCQUEwQjtRQUMzQixDQUFDO0tBQUE7SUFFRDs7T0FFRztJQUNHLE9BQU87O1lBQ1osT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1lBRXZDLHVDQUF1QztZQUN2QyxJQUFJLENBQUMscUJBQXFCLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUVqRCxrQkFBa0I7WUFDbEIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUVyQyxPQUFPLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFDMUMsQ0FBQztLQUFBO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBJdGVtVmlldywgV29ya3NwYWNlTGVhZiB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiQC90eXBlcy90YXNrXCI7XHJcbmltcG9ydCBcIkAvc3R5bGVzL2ZsdWVudC9mbHVlbnQtbWFpbi5jc3NcIjtcclxuaW1wb3J0IFwiQC9zdHlsZXMvZmx1ZW50L2ZsdWVudC1zZWNvbmRhcnkuY3NzXCI7XHJcbmltcG9ydCBcIkAvc3R5bGVzL2ZsdWVudC9mbHVlbnQtY29udGVudC1oZWFkZXIuY3NzXCI7XHJcbmltcG9ydCBcIkAvc3R5bGVzL2ZsdWVudC9mbHVlbnQtcHJvamVjdC1wb3BvdmVyLmNzc1wiO1xyXG5pbXBvcnQgeyBUb3BOYXZpZ2F0aW9uLCBWaWV3TW9kZSB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvZmx1ZW50L2NvbXBvbmVudHMvRmx1ZW50VG9wTmF2aWdhdGlvblwiO1xyXG5pbXBvcnQgeyBGbHVlbnRUYXNrVmlld1N0YXRlIH0gZnJvbSBcIkAvdHlwZXMvZmx1ZW50LXR5cGVzXCI7XHJcbmltcG9ydCB7XHJcblx0b25Xb3Jrc3BhY2VTd2l0Y2hlZCxcclxuXHRvbldvcmtzcGFjZU92ZXJyaWRlc1NhdmVkLFxyXG5cdG9uU2lkZWJhclNlbGVjdGlvbkNoYW5nZWQsXHJcbn0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy9mbHVlbnQvZXZlbnRzL3VpLWV2ZW50XCI7XHJcbmltcG9ydCB7IEV2ZW50cywgb24gfSBmcm9tIFwiQC9kYXRhZmxvdy9ldmVudHMvRXZlbnRzXCI7XHJcbmltcG9ydCB7IFJvb3RGaWx0ZXJTdGF0ZSB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay9maWx0ZXIvVmlld1Rhc2tGaWx0ZXJcIjtcclxuaW1wb3J0IHsgUGxhdGZvcm0gfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuXHJcbi8vIEltcG9ydCBtYW5hZ2Vyc1xyXG5pbXBvcnQgeyBGbHVlbnREYXRhTWFuYWdlciB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvZmx1ZW50L21hbmFnZXJzL0ZsdWVudERhdGFNYW5hZ2VyXCI7XHJcbmltcG9ydCB7IEZsdWVudExheW91dE1hbmFnZXIgfSBmcm9tIFwiQC9jb21wb25lbnRzL2ZlYXR1cmVzL2ZsdWVudC9tYW5hZ2Vycy9GbHVlbnRMYXlvdXRNYW5hZ2VyXCI7XHJcbmltcG9ydCB7IEZsdWVudENvbXBvbmVudE1hbmFnZXIgfSBmcm9tIFwiQC9jb21wb25lbnRzL2ZlYXR1cmVzL2ZsdWVudC9tYW5hZ2Vycy9GbHVlbnRDb21wb25lbnRNYW5hZ2VyXCI7XHJcbmltcG9ydCB7IEZsdWVudEdlc3R1cmVNYW5hZ2VyIH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy9mbHVlbnQvbWFuYWdlcnMvRmx1ZW50R2VzdHVyZU1hbmFnZXJcIjtcclxuaW1wb3J0IHsgRmx1ZW50V29ya3NwYWNlU3RhdGVNYW5hZ2VyIH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy9mbHVlbnQvbWFuYWdlcnMvRmx1ZW50V29ya3NwYWNlU3RhdGVNYW5hZ2VyXCI7XHJcbmltcG9ydCB7IEZsdWVudEFjdGlvbkhhbmRsZXJzIH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy9mbHVlbnQvbWFuYWdlcnMvRmx1ZW50QWN0aW9uSGFuZGxlcnNcIjtcclxuXHJcbmV4cG9ydCBjb25zdCBGTFVFTlRfVEFTS19WSUVXID0gXCJmbHVlbnQtdGFzay1nZW5pdXMtdmlld1wiO1xyXG5cclxuLyoqXHJcbiAqIFRhc2tWaWV3VjIgLSBNYWluIHZpZXcgY29vcmRpbmF0b3Igd2l0aCBjZW50cmFsaXplZCBzdGF0ZSBtYW5hZ2VtZW50XHJcbiAqXHJcbiAqIFRoaXMgY2xhc3MgaXMgdGhlIHNpbmdsZSBzb3VyY2Ugb2YgdHJ1dGggZm9yIGFsbCBzdGF0ZTpcclxuICogLSB0YXNrczogQWxsIGxvYWRlZCB0YXNrc1xyXG4gKiAtIGZpbHRlcmVkVGFza3M6IEZpbHRlcmVkIHRhc2tzIGZvciBjdXJyZW50IHZpZXdcclxuICogLSBjdXJyZW50Vmlld0lkOiBBY3RpdmUgdmlldyAoaW5ib3gsIHRvZGF5LCBwcm9qZWN0cywgZXRjLilcclxuICogLSB2aWV3U3RhdGU6IFVJIHN0YXRlIChzZWFyY2hRdWVyeSwgZmlsdGVycywgdmlld01vZGUsIGV0Yy4pXHJcbiAqIC0gc2VsZWN0ZWRUYXNrOiBDdXJyZW50bHkgc2VsZWN0ZWQgdGFza1xyXG4gKlxyXG4gKiBNYW5hZ2VycyBhcmUgc3RhdGVsZXNzIGV4ZWN1dG9ycyB0aGF0IHJlY2VpdmUgc3RhdGUgYW5kIHJldHVybiByZXN1bHRzIHZpYSBjYWxsYmFja3MuXHJcbiAqIFN0YXRlIGZsb3dzOiBNYW5hZ2VyIGV4ZWN1dGVzIOKGkiBDYWxsYmFjayDihpIgVGFza1ZpZXdWMiB1cGRhdGVzIHN0YXRlIOKGkiBOb3RpZmllcyBvdGhlciBtYW5hZ2Vyc1xyXG4gKi9cclxuZXhwb3J0IGNsYXNzIEZsdWVudFRhc2tWaWV3IGV4dGVuZHMgSXRlbVZpZXcge1xyXG5cdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblxyXG5cdC8vID09PT09PT09PT09PT09PT09PT09XHJcblx0Ly8gTUFOQUdFUlMgKGFkZGVkIHZpYSBhZGRDaGlsZCBmb3IgbGlmZWN5Y2xlIG1hbmFnZW1lbnQpXHJcblx0Ly8gPT09PT09PT09PT09PT09PT09PT1cclxuXHRwcml2YXRlIGRhdGFNYW5hZ2VyOiBGbHVlbnREYXRhTWFuYWdlcjtcclxuXHRwcml2YXRlIGxheW91dE1hbmFnZXI6IEZsdWVudExheW91dE1hbmFnZXI7XHJcblx0cHJpdmF0ZSBjb21wb25lbnRNYW5hZ2VyOiBGbHVlbnRDb21wb25lbnRNYW5hZ2VyO1xyXG5cdHByaXZhdGUgZ2VzdHVyZU1hbmFnZXI6IEZsdWVudEdlc3R1cmVNYW5hZ2VyO1xyXG5cdHByaXZhdGUgd29ya3NwYWNlU3RhdGVNYW5hZ2VyOiBGbHVlbnRXb3Jrc3BhY2VTdGF0ZU1hbmFnZXI7XHJcblx0cHJpdmF0ZSBhY3Rpb25IYW5kbGVyczogRmx1ZW50QWN0aW9uSGFuZGxlcnM7XHJcblxyXG5cdC8vID09PT09PT09PT09PT09PT09PT09XHJcblx0Ly8gQ0VOVFJBTElaRUQgU1RBVEUgLSBTaW5nbGUgc291cmNlIG9mIHRydXRoXHJcblx0Ly8gPT09PT09PT09PT09PT09PT09PT1cclxuXHJcblx0Ly8gRGF0YSBzdGF0ZVxyXG5cdHByaXZhdGUgdGFza3M6IFRhc2tbXSA9IFtdO1xyXG5cdHByaXZhdGUgZmlsdGVyZWRUYXNrczogVGFza1tdID0gW107XHJcblx0cHJpdmF0ZSBpc0xvYWRpbmcgPSBmYWxzZTtcclxuXHRwcml2YXRlIGxvYWRFcnJvcjogc3RyaW5nIHwgbnVsbCA9IG51bGw7XHJcblxyXG5cdC8vIFZpZXcgc3RhdGVcclxuXHRwcml2YXRlIGN1cnJlbnRWaWV3SWQgPSBcImluYm94XCI7XHJcblx0cHJpdmF0ZSB2aWV3U3RhdGU6IEZsdWVudFRhc2tWaWV3U3RhdGUgPSB7XHJcblx0XHRjdXJyZW50V29ya3NwYWNlOiBcIlwiLFxyXG5cdFx0dmlld01vZGU6IFwibGlzdFwiLFxyXG5cdFx0c2VhcmNoUXVlcnk6IFwiXCIsXHJcblx0XHRmaWx0ZXJzOiB7fSxcclxuXHRcdGZpbHRlcklucHV0VmFsdWU6IFwiXCIsXHJcblx0XHRzZWxlY3RlZFByb2plY3Q6IHVuZGVmaW5lZCxcclxuXHR9O1xyXG5cclxuXHQvLyBGaWx0ZXIgc3RhdGVcclxuXHRwcml2YXRlIGN1cnJlbnRGaWx0ZXJTdGF0ZTogUm9vdEZpbHRlclN0YXRlIHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBsaXZlRmlsdGVyU3RhdGU6IFJvb3RGaWx0ZXJTdGF0ZSB8IG51bGwgPSBudWxsO1xyXG5cclxuXHQvLyBTZWxlY3Rpb24gc3RhdGVcclxuXHRwcml2YXRlIHNlbGVjdGVkVGFzazogVGFzayB8IG51bGwgPSBudWxsO1xyXG5cclxuXHQvLyBXb3Jrc3BhY2Ugc3RhdGVcclxuXHRwcml2YXRlIHdvcmtzcGFjZUlkID0gXCJcIjtcclxuXHJcblx0Ly8gSW5pdGlhbGl6YXRpb24gc3RhdGVcclxuXHRwcml2YXRlIGlzSW5pdGlhbGl6aW5nID0gdHJ1ZTtcclxuXHJcblx0Ly8gPT09PT09PT09PT09PT09PT09PT1cclxuXHQvLyBVSSBFTEVNRU5UU1xyXG5cdC8vID09PT09PT09PT09PT09PT09PT09XHJcblx0cHJpdmF0ZSByb290Q29udGFpbmVyRWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgdG9wTmF2aWdhdGlvbjogVG9wTmF2aWdhdGlvbjtcclxuXHRwcml2YXRlIGNvbnRlbnRBcmVhOiBIVE1MRWxlbWVudDtcclxuXHJcblx0Y29uc3RydWN0b3IobGVhZjogV29ya3NwYWNlTGVhZiwgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4pIHtcclxuXHRcdHN1cGVyKGxlYWYpO1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0XHR0aGlzLnRhc2tzID0gdGhpcy5wbHVnaW4ucHJlbG9hZGVkVGFza3MgfHwgW107XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSB3b3Jrc3BhY2UgSURcclxuXHRcdHRoaXMud29ya3NwYWNlSWQgPVxyXG5cdFx0XHRwbHVnaW4ud29ya3NwYWNlTWFuYWdlcj8uZ2V0QWN0aXZlV29ya3NwYWNlKCkuaWQgfHwgXCJcIjtcclxuXHRcdHRoaXMudmlld1N0YXRlLmN1cnJlbnRXb3Jrc3BhY2UgPSB0aGlzLndvcmtzcGFjZUlkO1xyXG5cdH1cclxuXHJcblx0Z2V0Vmlld1R5cGUoKTogc3RyaW5nIHtcclxuXHRcdHJldHVybiBGTFVFTlRfVEFTS19WSUVXO1xyXG5cdH1cclxuXHJcblx0Z2V0RGlzcGxheVRleHQoKTogc3RyaW5nIHtcclxuXHRcdHJldHVybiB0KFwiVGFzayBHZW5pdXMgRmx1ZW50XCIpO1xyXG5cdH1cclxuXHJcblx0Z2V0SWNvbigpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIFwibGF5b3V0LWRhc2hib2FyZFwiO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgdXNpbmcgd29ya3NwYWNlIHNpZGUgbGVhdmVzIG1vZGVcclxuXHQgKi9cclxuXHRwcml2YXRlIHVzZVNpZGVMZWF2ZXMoKTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gISEodGhpcy5wbHVnaW4uc2V0dGluZ3MuZmx1ZW50Vmlldyk/LnVzZVdvcmtzcGFjZVNpZGVMZWF2ZXM7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBNYWluIGluaXRpYWxpemF0aW9uIG1ldGhvZFxyXG5cdCAqL1xyXG5cdGFzeW5jIG9uT3BlbigpIHtcclxuXHRcdGNvbnNvbGUubG9nKFwiW1RHLVYyXSBvbk9wZW4gc3RhcnRlZFwiKTtcclxuXHRcdHRoaXMuaXNJbml0aWFsaXppbmcgPSB0cnVlO1xyXG5cclxuXHRcdHRoaXMuY29udGVudEVsLmVtcHR5KCk7XHJcblx0XHR0aGlzLmNvbnRlbnRFbC50b2dnbGVDbGFzcyhcclxuXHRcdFx0W1widGFzay1nZW5pdXMtZmx1ZW50LXZpZXdcIiwgXCJ0YXNrLWdlbml1cy12aWV3XCJdLFxyXG5cdFx0XHR0cnVlXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSByb290IGNvbnRhaW5lciAodXNlIGV4YWN0IHNhbWUgY2xhc3MgYXMgb3JpZ2luYWwpXHJcblx0XHR0aGlzLnJvb3RDb250YWluZXJFbCA9IHRoaXMuY29udGVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ0Zy1mbHVlbnQtY29udGFpbmVyXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBBZGQgbW9iaWxlIGNsYXNzIGZvciBwcm9wZXIgc3R5bGluZ1xyXG5cdFx0aWYgKFBsYXRmb3JtLmlzUGhvbmUpIHtcclxuXHRcdFx0dGhpcy5yb290Q29udGFpbmVyRWwuYWRkQ2xhc3MoXCJpcy1tb2JpbGVcIik7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBtYW5hZ2VycyBmaXJzdCAoYmVmb3JlIFVJKVxyXG5cdFx0dGhpcy5pbml0aWFsaXplTWFuYWdlcnMoKTtcclxuXHJcblx0XHQvLyBCdWlsZCBVSSBzdHJ1Y3R1cmVcclxuXHRcdGF3YWl0IHRoaXMuYnVpbGRVSVN0cnVjdHVyZSgpO1xyXG5cclxuXHRcdC8vIFN1YnNjcmliZSB0byB3b3Jrc3BhY2UgYW5kIGdsb2JhbCBldmVudHNcclxuXHRcdHRoaXMucmVnaXN0ZXJFdmVudHMoKTtcclxuXHJcblx0XHQvLyBMb2FkIHdvcmtzcGFjZSBzdGF0ZVxyXG5cdFx0Y29uc3Qgc2F2ZWRXb3Jrc3BhY2VJZCA9XHJcblx0XHRcdHRoaXMud29ya3NwYWNlU3RhdGVNYW5hZ2VyLmdldFNhdmVkV29ya3NwYWNlSWQoKTtcclxuXHRcdGlmIChzYXZlZFdvcmtzcGFjZUlkICYmIHNhdmVkV29ya3NwYWNlSWQgIT09IHRoaXMud29ya3NwYWNlSWQpIHtcclxuXHRcdFx0dGhpcy53b3Jrc3BhY2VJZCA9IHNhdmVkV29ya3NwYWNlSWQ7XHJcblx0XHRcdHRoaXMudmlld1N0YXRlLmN1cnJlbnRXb3Jrc3BhY2UgPSBzYXZlZFdvcmtzcGFjZUlkO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFwcGx5IHdvcmtzcGFjZSBzZXR0aW5ncyBhbmQgcmVzdG9yZSBmaWx0ZXIgc3RhdGVcclxuXHRcdGF3YWl0IHRoaXMud29ya3NwYWNlU3RhdGVNYW5hZ2VyLmFwcGx5V29ya3NwYWNlU2V0dGluZ3MoKTtcclxuXHRcdGNvbnN0IHJlc3RvcmVkID1cclxuXHRcdFx0dGhpcy53b3Jrc3BhY2VTdGF0ZU1hbmFnZXIucmVzdG9yZUZpbHRlclN0YXRlRnJvbVdvcmtzcGFjZSgpO1xyXG5cdFx0aWYgKHJlc3RvcmVkKSB7XHJcblx0XHRcdHRoaXMudmlld1N0YXRlLmZpbHRlcnMgPSByZXN0b3JlZC5maWx0ZXJzO1xyXG5cdFx0XHR0aGlzLnZpZXdTdGF0ZS5zZWxlY3RlZFByb2plY3QgPSByZXN0b3JlZC5zZWxlY3RlZFByb2plY3Q7XHJcblx0XHRcdHRoaXMuY3VycmVudEZpbHRlclN0YXRlID0gcmVzdG9yZWQuYWR2YW5jZWRGaWx0ZXI7XHJcblx0XHRcdHRoaXMudmlld1N0YXRlLnZpZXdNb2RlID0gcmVzdG9yZWQudmlld01vZGU7XHJcblx0XHRcdGlmIChyZXN0b3JlZC5zaG91bGRDbGVhclNlYXJjaCkge1xyXG5cdFx0XHRcdHRoaXMudmlld1N0YXRlLnNlYXJjaFF1ZXJ5ID0gXCJcIjtcclxuXHRcdFx0XHR0aGlzLnZpZXdTdGF0ZS5maWx0ZXJJbnB1dFZhbHVlID0gXCJcIjtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEluaXRpYWwgZGF0YSBsb2FkXHJcblx0XHRhd2FpdCB0aGlzLmRhdGFNYW5hZ2VyLmxvYWRUYXNrcyhmYWxzZSk7IC8vIFdpbGwgdHJpZ2dlciBvblRhc2tzTG9hZGVkIGNhbGxiYWNrXHJcblxyXG5cdFx0Ly8gUmVnaXN0ZXIgZGF0YWZsb3cgbGlzdGVuZXJzIGZvciByZWFsLXRpbWUgdXBkYXRlc1xyXG5cdFx0YXdhaXQgdGhpcy5kYXRhTWFuYWdlci5yZWdpc3RlckRhdGFmbG93TGlzdGVuZXJzKCk7XHJcblxyXG5cdFx0Ly8gSW5pdGlhbCByZW5kZXJcclxuXHRcdHRoaXMudXBkYXRlVmlldygpO1xyXG5cclxuXHRcdC8vIENoZWNrIHdpbmRvdyBzaXplIGFuZCBhdXRvLWNvbGxhcHNlIHNpZGViYXIgaWYgbmVlZGVkXHJcblx0XHR0aGlzLmxheW91dE1hbmFnZXIuY2hlY2tBbmRDb2xsYXBzZVNpZGViYXIoKTtcclxuXHJcblx0XHR0aGlzLmlzSW5pdGlhbGl6aW5nID0gZmFsc2U7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBJbml0aWFsaXplIGFsbCBtYW5hZ2VycyB3aXRoIGNhbGxiYWNrc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgaW5pdGlhbGl6ZU1hbmFnZXJzKCkge1xyXG5cclxuXHRcdC8vIDEuIEZsdWVudERhdGFNYW5hZ2VyIC0gRGF0YSBsb2FkaW5nIGFuZCBmaWx0ZXJpbmdcclxuXHRcdHRoaXMuZGF0YU1hbmFnZXIgPSBuZXcgRmx1ZW50RGF0YU1hbmFnZXIoXHJcblx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHQoKSA9PiB0aGlzLmN1cnJlbnRWaWV3SWQsXHJcblx0XHRcdCgpID0+ICh7XHJcblx0XHRcdFx0bGl2ZUZpbHRlclN0YXRlOiB0aGlzLmxpdmVGaWx0ZXJTdGF0ZSxcclxuXHRcdFx0XHRjdXJyZW50RmlsdGVyU3RhdGU6IHRoaXMuY3VycmVudEZpbHRlclN0YXRlLFxyXG5cdFx0XHRcdHZpZXdTdGF0ZUZpbHRlcnM6IHRoaXMudmlld1N0YXRlLmZpbHRlcnMsXHJcblx0XHRcdFx0c2VsZWN0ZWRQcm9qZWN0OiB0aGlzLnZpZXdTdGF0ZS5zZWxlY3RlZFByb2plY3QgfHwgdW5kZWZpbmVkLFxyXG5cdFx0XHRcdHNlYXJjaFF1ZXJ5OiB0aGlzLnZpZXdTdGF0ZS5zZWFyY2hRdWVyeSB8fCBcIlwiLFxyXG5cdFx0XHRcdGZpbHRlcklucHV0VmFsdWU6IHRoaXMudmlld1N0YXRlLmZpbHRlcklucHV0VmFsdWUgfHwgXCJcIixcclxuXHRcdFx0fSksXHJcblx0XHRcdCgpID0+IHRoaXMuaXNJbml0aWFsaXppbmdcclxuXHRcdCk7XHJcblx0XHR0aGlzLmRhdGFNYW5hZ2VyLnNldENhbGxiYWNrcyh7XHJcblx0XHRcdG9uVGFza3NMb2FkZWQ6ICh0YXNrcywgZXJyb3IpID0+IHtcclxuXHRcdFx0XHRpZiAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdHRoaXMubG9hZEVycm9yID0gZXJyb3I7XHJcblx0XHRcdFx0XHR0aGlzLmlzTG9hZGluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0dGhpcy5jb21wb25lbnRNYW5hZ2VyPy5yZW5kZXJFcnJvclN0YXRlKGVycm9yLCAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMuZGF0YU1hbmFnZXIubG9hZFRhc2tzKCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0dGhpcy50YXNrcyA9IHRhc2tzO1xyXG5cdFx0XHRcdFx0dGhpcy5sb2FkRXJyb3IgPSBudWxsO1xyXG5cdFx0XHRcdFx0dGhpcy5pc0xvYWRpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHRcdC8vIEFwcGx5IGZpbHRlcnMgaW1tZWRpYXRlbHkgYWZ0ZXIgbG9hZGluZ1xyXG5cdFx0XHRcdFx0dGhpcy5maWx0ZXJlZFRhc2tzID0gdGhpcy5kYXRhTWFuYWdlci5hcHBseUZpbHRlcnMoXHJcblx0XHRcdFx0XHRcdHRoaXMudGFza3NcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR0aGlzLnVwZGF0ZVZpZXcoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sXHJcblx0XHRcdG9uTG9hZGluZ1N0YXRlQ2hhbmdlZDogKGlzTG9hZGluZykgPT4ge1xyXG5cdFx0XHRcdHRoaXMuaXNMb2FkaW5nID0gaXNMb2FkaW5nO1xyXG5cdFx0XHRcdGlmIChpc0xvYWRpbmcgJiYgIXRoaXMuaXNJbml0aWFsaXppbmcpIHtcclxuXHRcdFx0XHRcdHRoaXMuY29tcG9uZW50TWFuYWdlcj8ucmVuZGVyTG9hZGluZ1N0YXRlKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRvblVwZGF0ZU5lZWRlZDogKHNvdXJjZSkgPT4ge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKGBbVEctVjJdIFVwZGF0ZSBuZWVkZWQgZnJvbSBzb3VyY2U6ICR7c291cmNlfWApO1xyXG5cdFx0XHRcdC8vIFJlLWFwcGx5IGZpbHRlcnMgYW5kIHVwZGF0ZSB2aWV3XHJcblx0XHRcdFx0dGhpcy5maWx0ZXJlZFRhc2tzID0gdGhpcy5kYXRhTWFuYWdlci5hcHBseUZpbHRlcnModGhpcy50YXNrcyk7XHJcblx0XHRcdFx0dGhpcy51cGRhdGVWaWV3KCk7XHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHRcdHRoaXMuYWRkQ2hpbGQodGhpcy5kYXRhTWFuYWdlcik7XHJcblxyXG5cdFx0Ly8gMi4gRmx1ZW50QWN0aW9uSGFuZGxlcnMgLSBVc2VyIGFjdGlvbnNcclxuXHRcdHRoaXMuYWN0aW9uSGFuZGxlcnMgPSBuZXcgRmx1ZW50QWN0aW9uSGFuZGxlcnMoXHJcblx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0KCkgPT4gdGhpcy53b3Jrc3BhY2VJZCxcclxuXHRcdFx0KCkgPT4gdGhpcy51c2VTaWRlTGVhdmVzKClcclxuXHRcdCk7XHJcblx0XHR0aGlzLmFjdGlvbkhhbmRsZXJzLnNldENhbGxiYWNrcyh7XHJcblx0XHRcdG9uVGFza1NlbGVjdGlvbkNoYW5nZWQ6ICh0YXNrKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5zZWxlY3RlZFRhc2sgPSB0YXNrO1xyXG5cdFx0XHRcdGlmICh0YXNrKSB7XHJcblx0XHRcdFx0XHR0aGlzLmxheW91dE1hbmFnZXIuc2hvd1Rhc2tEZXRhaWxzKHRhc2spO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSxcclxuXHRcdFx0b25UYXNrVXBkYXRlZDogKHRhc2tJZCwgdXBkYXRlZFRhc2spID0+IHtcclxuXHRcdFx0XHQvLyBVcGRhdGUgdGFzayBpbiBjYWNoZVxyXG5cdFx0XHRcdGNvbnN0IGluZGV4ID0gdGhpcy50YXNrcy5maW5kSW5kZXgoKHQpID0+IHQuaWQgPT09IHRhc2tJZCk7XHJcblx0XHRcdFx0aWYgKGluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHRcdFx0dGhpcy50YXNrc1tpbmRleF0gPSB1cGRhdGVkVGFzaztcclxuXHRcdFx0XHRcdC8vIFJlLWFwcGx5IGZpbHRlcnNcclxuXHRcdFx0XHRcdHRoaXMuZmlsdGVyZWRUYXNrcyA9IHRoaXMuZGF0YU1hbmFnZXIuYXBwbHlGaWx0ZXJzKFxyXG5cdFx0XHRcdFx0XHR0aGlzLnRhc2tzXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0dGhpcy51cGRhdGVWaWV3KCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRvblRhc2tEZWxldGVkOiAodGFza0lkLCBkZWxldGVDaGlsZHJlbikgPT4ge1xyXG5cdFx0XHRcdC8vIFJlbW92ZSB0YXNrIGZyb20gY2FjaGVcclxuXHRcdFx0XHRpZiAoZGVsZXRlQ2hpbGRyZW4pIHtcclxuXHRcdFx0XHRcdC8vIFJlbW92ZSB0YXNrIGFuZCBhbGwgY2hpbGRyZW4gcmVjdXJzaXZlbHlcclxuXHRcdFx0XHRcdGNvbnN0IHRvUmVtb3ZlID0gbmV3IFNldDxzdHJpbmc+KFt0YXNrSWRdKTtcclxuXHRcdFx0XHRcdGNvbnN0IGZpbmRDaGlsZHJlbiA9IChpZDogc3RyaW5nKSA9PiB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IHRhc2sgPSB0aGlzLnRhc2tzLmZpbmQoKHQpID0+IHQuaWQgPT09IGlkKTtcclxuXHRcdFx0XHRcdFx0aWYgKHRhc2s/Lm1ldGFkYXRhPy5jaGlsZHJlbikge1xyXG5cdFx0XHRcdFx0XHRcdGZvciAoY29uc3QgY2hpbGRJZCBvZiB0YXNrLm1ldGFkYXRhLmNoaWxkcmVuKSB7XHJcblx0XHRcdFx0XHRcdFx0XHR0b1JlbW92ZS5hZGQoY2hpbGRJZCk7XHJcblx0XHRcdFx0XHRcdFx0XHRmaW5kQ2hpbGRyZW4oY2hpbGRJZCk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0ZmluZENoaWxkcmVuKHRhc2tJZCk7XHJcblx0XHRcdFx0XHR0aGlzLnRhc2tzID0gdGhpcy50YXNrcy5maWx0ZXIoKHQpID0+ICF0b1JlbW92ZS5oYXModC5pZCkpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHR0aGlzLnRhc2tzID0gdGhpcy50YXNrcy5maWx0ZXIoKHQpID0+IHQuaWQgIT09IHRhc2tJZCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIFJlLWFwcGx5IGZpbHRlcnNcclxuXHRcdFx0XHR0aGlzLmZpbHRlcmVkVGFza3MgPSB0aGlzLmRhdGFNYW5hZ2VyLmFwcGx5RmlsdGVycyh0aGlzLnRhc2tzKTtcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZVZpZXcoKTtcclxuXHRcdFx0fSxcclxuXHRcdFx0b25OYXZpZ2F0ZVRvVmlldzogKHZpZXdJZCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMuY3VycmVudFZpZXdJZCA9IHZpZXdJZDtcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZVZpZXcoKTtcclxuXHRcdFx0fSxcclxuXHRcdFx0b25TZWFyY2hRdWVyeUNoYW5nZWQ6IChxdWVyeSkgPT4ge1xyXG5cdFx0XHRcdHRoaXMudmlld1N0YXRlLnNlYXJjaFF1ZXJ5ID0gcXVlcnk7XHJcblx0XHRcdFx0dGhpcy52aWV3U3RhdGUuZmlsdGVySW5wdXRWYWx1ZSA9IHF1ZXJ5O1xyXG5cdFx0XHRcdC8vIFJlLWFwcGx5IGZpbHRlcnNcclxuXHRcdFx0XHR0aGlzLmZpbHRlcmVkVGFza3MgPSB0aGlzLmRhdGFNYW5hZ2VyLmFwcGx5RmlsdGVycyh0aGlzLnRhc2tzKTtcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZVZpZXcoKTtcclxuXHRcdFx0fSxcclxuXHRcdFx0b25Qcm9qZWN0U2VsZWN0ZWQ6IChwcm9qZWN0SWQpID0+IHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhgW1RHLVYyXSBQcm9qZWN0IHNlbGVjdGVkOiAke3Byb2plY3RJZH1gKTtcclxuXHRcdFx0XHR0aGlzLnZpZXdTdGF0ZS5zZWxlY3RlZFByb2plY3QgPSBwcm9qZWN0SWQ7XHJcblxyXG5cdFx0XHRcdC8vIFN3aXRjaCB0byBwcm9qZWN0cyB2aWV3XHJcblx0XHRcdFx0dGhpcy5jdXJyZW50Vmlld0lkID0gXCJwcm9qZWN0c1wiO1xyXG5cclxuXHRcdFx0XHQvLyBSZWZsZWN0IHNlbGVjdGlvbiBpbnRvIHRoZSBGaWx0ZXIgVUkgc3RhdGUgc28gdGhlIHRvcCBGaWx0ZXIgYnV0dG9uIHNob3dzIGFjdGl2ZSBhbmQgY2FuIGJlIHJlc2V0IHZpYSBcIlhcIlxyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRjb25zdCB0aW1lc3RhbXAgPSBEYXRlLm5vdygpO1xyXG5cdFx0XHRcdFx0Y29uc3QgbmV4dFN0YXRlID0gdGhpcy5saXZlRmlsdGVyU3RhdGUgfHwge1xyXG5cdFx0XHRcdFx0XHRyb290Q29uZGl0aW9uOiBcImFsbFwiLFxyXG5cdFx0XHRcdFx0XHRmaWx0ZXJHcm91cHM6IFtdLFxyXG5cdFx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0XHQvLyBSZW1vdmUgYW55IGV4aXN0aW5nIHByb2plY3QgZmlsdGVycyBhbmQgZW1wdHkgZ3JvdXBzIHRvIGF2b2lkIGR1cGxpY2F0ZXNcclxuXHRcdFx0XHRcdG5leHRTdGF0ZS5maWx0ZXJHcm91cHMgPSAobmV4dFN0YXRlLmZpbHRlckdyb3VwcyB8fCBbXSlcclxuXHRcdFx0XHRcdFx0Lm1hcCgoZzogYW55KSA9PiAoe1xyXG5cdFx0XHRcdFx0XHRcdC4uLmcsXHJcblx0XHRcdFx0XHRcdFx0ZmlsdGVyczogKGcuZmlsdGVycyB8fCBbXSkuZmlsdGVyKFxyXG5cdFx0XHRcdFx0XHRcdFx0KGY6IGFueSkgPT4gZi5wcm9wZXJ0eSAhPT0gXCJwcm9qZWN0XCJcclxuXHRcdFx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0XHR9KSlcclxuXHRcdFx0XHRcdFx0LmZpbHRlcigoZzogYW55KSA9PiBnLmZpbHRlcnMgJiYgZy5maWx0ZXJzLmxlbmd0aCA+IDApOyAvLyBSZW1vdmUgZW1wdHkgZ3JvdXBzXHJcblxyXG5cdFx0XHRcdFx0Ly8gT25seSBhZGQgcHJvamVjdCBmaWx0ZXIgaWYgcHJvamVjdElkIGlzIG5vdCBlbXB0eVxyXG5cdFx0XHRcdFx0aWYgKHByb2plY3RJZCAmJiBwcm9qZWN0SWQudHJpbSgpICE9PSBcIlwiKSB7XHJcblx0XHRcdFx0XHRcdC8vIEFwcGVuZCBhIGRlZGljYXRlZCBncm91cCBmb3IgcHJvamVjdCBmaWx0ZXIgdG8gZW5mb3JjZSBBTkQgc2VtYW50aWNzXHJcblx0XHRcdFx0XHRcdG5leHRTdGF0ZS5maWx0ZXJHcm91cHMucHVzaCh7XHJcblx0XHRcdFx0XHRcdFx0aWQ6IGBmbHVlbnQtcHJvai1ncm91cC0ke3RpbWVzdGFtcH1gLFxyXG5cdFx0XHRcdFx0XHRcdGdyb3VwQ29uZGl0aW9uOiBcImFsbFwiLFxyXG5cdFx0XHRcdFx0XHRcdGZpbHRlcnM6IFtcclxuXHRcdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0aWQ6IGBmbHVlbnQtcHJvai1maWx0ZXItJHt0aW1lc3RhbXB9YCxcclxuXHRcdFx0XHRcdFx0XHRcdFx0cHJvcGVydHk6IFwicHJvamVjdFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRjb25kaXRpb246IFwiaXNcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0dmFsdWU6IHByb2plY3RJZCxcclxuXHRcdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0XSxcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0dGhpcy5saXZlRmlsdGVyU3RhdGUgPSBuZXh0U3RhdGUgYXMgYW55O1xyXG5cdFx0XHRcdFx0dGhpcy5jdXJyZW50RmlsdGVyU3RhdGUgPSBuZXh0U3RhdGUgYXMgYW55O1xyXG5cdFx0XHRcdFx0dGhpcy5hcHAuc2F2ZUxvY2FsU3RvcmFnZShcclxuXHRcdFx0XHRcdFx0XCJ0YXNrLWdlbml1cy12aWV3LWZpbHRlclwiLFxyXG5cdFx0XHRcdFx0XHRuZXh0U3RhdGVcclxuXHRcdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gQnJvYWRjYXN0IHNvIGFueSBvcGVuIGZpbHRlciBVSSByZWFjdHMgYW5kIGhlYWRlciBidXR0b24gc2hvd3MgcmVzZXRcclxuXHRcdFx0XHRcdC8vIFRoZSBmaWx0ZXItY2hhbmdlZCBldmVudCBsaXN0ZW5lciB3aWxsIGhhbmRsZSBhcHBseUZpbHRlcnMgYW5kIHVwZGF0ZVZpZXdcclxuXHRcdFx0XHRcdHRoaXMuYXBwLndvcmtzcGFjZS50cmlnZ2VyKFxyXG5cdFx0XHRcdFx0XHRcInRhc2stZ2VuaXVzOmZpbHRlci1jaGFuZ2VkXCIsXHJcblx0XHRcdFx0XHRcdG5leHRTdGF0ZVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRcdFwiW1RHLVYyXSBGYWlsZWQgdG8gcHJvamVjdC1zeW5jIGZpbHRlciBVSSBzdGF0ZVwiLFxyXG5cdFx0XHRcdFx0XHRlXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0Ly8gSWYgZmlsdGVyIHN5bmMgZmFpbHMsIHN0aWxsIHVwZGF0ZSB0aGUgdmlld1xyXG5cdFx0XHRcdFx0dGhpcy5maWx0ZXJlZFRhc2tzID0gdGhpcy5kYXRhTWFuYWdlci5hcHBseUZpbHRlcnMoXHJcblx0XHRcdFx0XHRcdHRoaXMudGFza3NcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR0aGlzLnVwZGF0ZVZpZXcoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sXHJcblx0XHRcdG9uVmlld01vZGVDaGFuZ2VkOiAobW9kZSkgPT4ge1xyXG5cdFx0XHRcdHRoaXMudmlld1N0YXRlLnZpZXdNb2RlID0gbW9kZTtcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZVZpZXcoKTtcclxuXHRcdFx0XHQvLyBTYXZlIHRvIHdvcmtzcGFjZVxyXG5cdFx0XHRcdHRoaXMud29ya3NwYWNlU3RhdGVNYW5hZ2VyLnNhdmVGaWx0ZXJTdGF0ZVRvV29ya3NwYWNlKCk7XHJcblx0XHRcdH0sXHJcblx0XHRcdHNob3dEZXRhaWxzUGFuZWw6ICh0YXNrKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5sYXlvdXRNYW5hZ2VyLnNob3dUYXNrRGV0YWlscyh0YXNrKTtcclxuXHRcdFx0fSxcclxuXHRcdFx0dG9nZ2xlRGV0YWlsc1Zpc2liaWxpdHk6ICh2aXNpYmxlKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5sYXlvdXRNYW5hZ2VyLnRvZ2dsZURldGFpbHNWaXNpYmlsaXR5KHZpc2libGUpO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRnZXRJc0RldGFpbHNWaXNpYmxlOiAoKSA9PiB0aGlzLmxheW91dE1hbmFnZXIuaXNEZXRhaWxzVmlzaWJsZSxcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy5hZGRDaGlsZCh0aGlzLmFjdGlvbkhhbmRsZXJzKTtcclxuXHJcblx0XHQvLyAzLiBGbHVlbnRXb3Jrc3BhY2VTdGF0ZU1hbmFnZXIgLSBTdGF0ZSBwZXJzaXN0ZW5jZVxyXG5cdFx0dGhpcy53b3Jrc3BhY2VTdGF0ZU1hbmFnZXIgPSBuZXcgRmx1ZW50V29ya3NwYWNlU3RhdGVNYW5hZ2VyKFxyXG5cdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdCgpID0+IHRoaXMud29ya3NwYWNlSWQsXHJcblx0XHRcdCgpID0+IHRoaXMuY3VycmVudFZpZXdJZCxcclxuXHRcdFx0KCkgPT4gKHtcclxuXHRcdFx0XHRmaWx0ZXJzOiB0aGlzLnZpZXdTdGF0ZS5maWx0ZXJzIHx8IHt9LFxyXG5cdFx0XHRcdHNlbGVjdGVkUHJvamVjdDogdGhpcy52aWV3U3RhdGUuc2VsZWN0ZWRQcm9qZWN0IHx8IHVuZGVmaW5lZCxcclxuXHRcdFx0XHRzZWFyY2hRdWVyeTogdGhpcy52aWV3U3RhdGUuc2VhcmNoUXVlcnkgfHwgXCJcIixcclxuXHRcdFx0XHR2aWV3TW9kZTogdGhpcy52aWV3U3RhdGUudmlld01vZGUsXHJcblx0XHRcdH0pLFxyXG5cdFx0XHQoKSA9PiB0aGlzLmN1cnJlbnRGaWx0ZXJTdGF0ZSxcclxuXHRcdFx0KCkgPT4gdGhpcy5saXZlRmlsdGVyU3RhdGVcclxuXHRcdCk7XHJcblx0XHR0aGlzLmFkZENoaWxkKHRoaXMud29ya3NwYWNlU3RhdGVNYW5hZ2VyKTtcclxuXHJcblx0XHRjb25zb2xlLmxvZyhcIltURy1WMl0gTWFuYWdlcnMgaW5pdGlhbGl6ZWRcIik7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBCdWlsZCBVSSBzdHJ1Y3R1cmUgLSBNVVNUIG1hdGNoIG9yaWdpbmFsIERPTSBzdHJ1Y3R1cmUgZm9yIENTU1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgYnVpbGRVSVN0cnVjdHVyZSgpIHtcclxuXHRcdGNvbnNvbGUubG9nKFwiW1RHLVYyXSBCdWlsZGluZyBVSSBzdHJ1Y3R1cmVcIik7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGxheW91dCBzdHJ1Y3R1cmUgKGV4YWN0IHNhbWUgYXMgb3JpZ2luYWwpXHJcblx0XHRjb25zdCBsYXlvdXRDb250YWluZXIgPSB0aGlzLnJvb3RDb250YWluZXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwidGctZmx1ZW50LWxheW91dFwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gU2lkZWJhclxyXG5cdFx0Y29uc3Qgc2lkZWJhckVsID0gbGF5b3V0Q29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ0Zy1mbHVlbnQtc2lkZWJhci1jb250YWluZXJcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEFkZCBtb2JpbGUtc3BlY2lmaWMgY2xhc3NlcyBhbmQgb3ZlcmxheVxyXG5cdFx0aWYgKFBsYXRmb3JtLmlzUGhvbmUpIHtcclxuXHRcdFx0c2lkZWJhckVsLmFkZENsYXNzKFwiaXMtbW9iaWxlLWRyYXdlclwiKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBNYWluIGNvbnRlbnQgY29udGFpbmVyIChJTVBPUlRBTlQ6IHRoaXMgd2FzIG1pc3NpbmchKVxyXG5cdFx0Y29uc3QgbWFpbkNvbnRhaW5lciA9IGxheW91dENvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwidGctZmx1ZW50LW1haW4tY29udGFpbmVyXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBUb3AgbmF2aWdhdGlvblxyXG5cdFx0Y29uc3QgdG9wTmF2RWwgPSBtYWluQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ0Zy1mbHVlbnQtdG9wLW5hdlwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ29udGVudCB3cmFwcGVyIChJTVBPUlRBTlQ6IHRoaXMgd2FzIG1pc3NpbmchKVxyXG5cdFx0Y29uc3QgY29udGVudFdyYXBwZXIgPSBtYWluQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ0Zy1mbHVlbnQtY29udGVudC13cmFwcGVyXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBBY3R1YWwgY29udGVudCBhcmVhXHJcblx0XHR0aGlzLmNvbnRlbnRBcmVhID0gY29udGVudFdyYXBwZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInRnLWZsdWVudC1jb250ZW50XCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBEZWNpZGUgd2hldGhlciB0byB1c2Ugc2VwYXJhdGUgd29ya3NwYWNlIHNpZGUgbGVhdmVzXHJcblx0XHRjb25zdCB1c2VXb3Jrc3BhY2VTaWRlTGVhdmVzID0gdGhpcy51c2VTaWRlTGVhdmVzKCk7XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBGbHVlbnRMYXlvdXRNYW5hZ2VyXHJcblx0XHQvLyBOb3RlOiBoZWFkZXJFbCBhbmQgdGl0bGVFbCBhcmUgcHJvdmlkZWQgYnkgT2JzaWRpYW4ncyBJdGVtVmlld1xyXG5cdFx0dGhpcy5sYXlvdXRNYW5hZ2VyID0gbmV3IEZsdWVudExheW91dE1hbmFnZXIoXHJcblx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0dGhpcyxcclxuXHRcdFx0dGhpcy5yb290Q29udGFpbmVyRWwsXHJcblx0XHRcdHRoaXMuaGVhZGVyRWwsIC8vIE9ic2lkaWFuJ3MgdmlldyBoZWFkZXJcclxuXHRcdFx0dGhpcy50aXRsZUVsLCAvLyBPYnNpZGlhbidzIHZpZXcgdGl0bGUgZWxlbWVudFxyXG5cdFx0XHQoKSA9PiB0aGlzLmZpbHRlcmVkVGFza3MubGVuZ3RoXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5sYXlvdXRNYW5hZ2VyLnNldE9uU2lkZWJhck5hdmlnYXRlKCh2aWV3SWQpID0+IHtcclxuXHRcdFx0dGhpcy5hY3Rpb25IYW5kbGVycy5oYW5kbGVOYXZpZ2F0ZSh2aWV3SWQpO1xyXG5cdFx0fSk7XHJcblx0XHR0aGlzLmxheW91dE1hbmFnZXIuc2V0T25Qcm9qZWN0U2VsZWN0KChwcm9qZWN0SWQpID0+IHtcclxuXHRcdFx0dGhpcy5hY3Rpb25IYW5kbGVycy5oYW5kbGVQcm9qZWN0U2VsZWN0KHByb2plY3RJZCk7XHJcblx0XHR9KTtcclxuXHRcdHRoaXMubGF5b3V0TWFuYWdlci5zZXRUYXNrQ2FsbGJhY2tzKHtcclxuXHRcdFx0b25UYXNrVG9nZ2xlQ29tcGxldGU6ICh0YXNrKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5hY3Rpb25IYW5kbGVycy50b2dnbGVUYXNrQ29tcGxldGlvbih0YXNrKTtcclxuXHRcdFx0fSxcclxuXHRcdFx0b25UYXNrRWRpdDogKHRhc2spID0+IHtcclxuXHRcdFx0XHR0aGlzLmFjdGlvbkhhbmRsZXJzLmhhbmRsZVRhc2tTZWxlY3Rpb24odGFzayk7XHJcblx0XHRcdH0sXHJcblx0XHRcdG9uVGFza1VwZGF0ZTogYXN5bmMgKG9yaWdpbmFsVGFzaywgdXBkYXRlZFRhc2spID0+IHtcclxuXHRcdFx0XHRhd2FpdCB0aGlzLmFjdGlvbkhhbmRsZXJzLmhhbmRsZVRhc2tVcGRhdGUoXHJcblx0XHRcdFx0XHRvcmlnaW5hbFRhc2ssXHJcblx0XHRcdFx0XHR1cGRhdGVkVGFza1xyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHRcdHRoaXMuYWRkQ2hpbGQodGhpcy5sYXlvdXRNYW5hZ2VyKTtcclxuXHJcblx0XHRpZiAoIXVzZVdvcmtzcGFjZVNpZGVMZWF2ZXMpIHtcclxuXHRcdFx0Ly8gSW5pdGlhbGl6ZSBkZXRhaWxzIGNvbXBvbmVudCAobm9uLWxlYXZlcyBtb2RlIG9ubHkpXHJcblx0XHRcdHRoaXMubGF5b3V0TWFuYWdlci5pbml0aWFsaXplRGV0YWlsc0NvbXBvbmVudCgpO1xyXG5cclxuXHRcdFx0Ly8gSW5pdGlhbGl6ZSBzaWRlYmFyIChub24tbGVhdmVzIG1vZGUgb25seSlcclxuXHRcdFx0dGhpcy5sYXlvdXRNYW5hZ2VyLmluaXRpYWxpemVTaWRlYmFyKHNpZGViYXJFbCk7XHJcblxyXG5cdFx0XHQvLyBTZXR1cCBkcmF3ZXIgb3ZlcmxheSBmb3IgbW9iaWxlXHJcblx0XHRcdGlmIChQbGF0Zm9ybS5pc1Bob25lKSB7XHJcblx0XHRcdFx0dGhpcy5sYXlvdXRNYW5hZ2VyLnNldHVwRHJhd2VyT3ZlcmxheShsYXlvdXRDb250YWluZXIpO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRzaWRlYmFyRWwuaGlkZSgpO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcIltURy1WMl0gVXNpbmcgd29ya3NwYWNlIHNpZGUgbGVhdmVzOiBza2lwIGluLXZpZXcgc2lkZWJhclwiXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIHRvcCBuYXZpZ2F0aW9uXHJcblx0XHRjb25zb2xlLmxvZyhcIltURy1WMl0gSW5pdGlhbGl6aW5nIHRvcCBuYXZpZ2F0aW9uXCIpO1xyXG5cdFx0dGhpcy50b3BOYXZpZ2F0aW9uID0gbmV3IFRvcE5hdmlnYXRpb24oXHJcblx0XHRcdHRvcE5hdkVsLFxyXG5cdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0KHF1ZXJ5OiBzdHJpbmcpID0+IHRoaXMuYWN0aW9uSGFuZGxlcnMuaGFuZGxlU2VhcmNoKHF1ZXJ5KSxcclxuXHRcdFx0KG1vZGU6IFZpZXdNb2RlKSA9PiB0aGlzLmFjdGlvbkhhbmRsZXJzLmhhbmRsZVZpZXdNb2RlQ2hhbmdlKG1vZGUpLFxyXG5cdFx0XHQoKSA9PiB7XHJcblx0XHRcdFx0Ly8gRmlsdGVyIGNsaWNrIC0gb3BlbiBmaWx0ZXIgbW9kYWwvcG9wb3ZlclxyXG5cdFx0XHRcdC8vIFRPRE86IEltcGxlbWVudCBmaWx0ZXIgbW9kYWxcclxuXHRcdFx0fSxcclxuXHRcdFx0KCkgPT4ge1xyXG5cdFx0XHRcdC8vIFNvcnQgY2xpY2tcclxuXHRcdFx0XHQvLyBUT0RPOiBJbXBsZW1lbnQgc29ydFxyXG5cdFx0XHR9LFxyXG5cdFx0XHQoKSA9PiB0aGlzLmFjdGlvbkhhbmRsZXJzLmhhbmRsZVNldHRpbmdzQ2xpY2soKVxyXG5cdFx0KTtcclxuXHRcdHRoaXMuYWRkQ2hpbGQodGhpcy50b3BOYXZpZ2F0aW9uKTtcclxuXHJcblx0XHQvLyBJbml0aWFsaXplIHZpZXcgY29tcG9uZW50c1xyXG5cdFx0Y29uc29sZS5sb2coXCJbVEctVjJdIEluaXRpYWxpemluZyB2aWV3IGNvbXBvbmVudHNcIik7XHJcblx0XHR0aGlzLmNvbXBvbmVudE1hbmFnZXIgPSBuZXcgRmx1ZW50Q29tcG9uZW50TWFuYWdlcihcclxuXHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHR0aGlzLmNvbnRlbnRBcmVhLFxyXG5cdFx0XHR0aGlzLCAvLyBwYXJlbnQgdmlld1xyXG5cdFx0XHR7XHJcblx0XHRcdFx0b25UYXNrU2VsZWN0ZWQ6ICh0YXNrKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLmFjdGlvbkhhbmRsZXJzLmhhbmRsZVRhc2tTZWxlY3Rpb24odGFzayk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvblRhc2tDb21wbGV0ZWQ6ICh0YXNrKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLmFjdGlvbkhhbmRsZXJzLnRvZ2dsZVRhc2tDb21wbGV0aW9uKHRhc2spO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0b25UYXNrVXBkYXRlOiBhc3luYyAob3JpZ2luYWxUYXNrLCB1cGRhdGVkVGFzaykgPT4ge1xyXG5cdFx0XHRcdFx0YXdhaXQgdGhpcy5hY3Rpb25IYW5kbGVycy5oYW5kbGVUYXNrVXBkYXRlKFxyXG5cdFx0XHRcdFx0XHRvcmlnaW5hbFRhc2ssXHJcblx0XHRcdFx0XHRcdHVwZGF0ZWRUYXNrXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0b25UYXNrQ29udGV4dE1lbnU6IChldmVudCwgdGFzaykgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5hY3Rpb25IYW5kbGVycy5oYW5kbGVUYXNrQ29udGV4dE1lbnUoZXZlbnQsIHRhc2spO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0b25LYW5iYW5UYXNrU3RhdHVzVXBkYXRlOiAodGFza0lkLCBuZXdTdGF0dXNNYXJrKSA9PiB7XHJcblx0XHRcdFx0XHRjb25zdCB0YXNrID0gdGhpcy50YXNrcy5maW5kKCh0KSA9PiB0LmlkID09PSB0YXNrSWQpO1xyXG5cdFx0XHRcdFx0aWYgKHRhc2spIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5hY3Rpb25IYW5kbGVycy5oYW5kbGVLYW5iYW5UYXNrU3RhdHVzVXBkYXRlKFxyXG5cdFx0XHRcdFx0XHRcdHRhc2ssXHJcblx0XHRcdFx0XHRcdFx0bmV3U3RhdHVzTWFya1xyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblx0XHR0aGlzLmFkZENoaWxkKHRoaXMuY29tcG9uZW50TWFuYWdlcik7XHJcblx0XHR0aGlzLmNvbXBvbmVudE1hbmFnZXIuaW5pdGlhbGl6ZVZpZXdDb21wb25lbnRzKCk7XHJcblxyXG5cdFx0Ly8gU2lkZWJhciB0b2dnbGUgaW4gaGVhZGVyIGFuZCByZXNwb25zaXZlIGNvbGxhcHNlXHJcblx0XHRjb25zb2xlLmxvZyhcIltURy1WMl0gQ3JlYXRpbmcgc2lkZWJhciB0b2dnbGVcIik7XHJcblx0XHR0aGlzLmxheW91dE1hbmFnZXIuY3JlYXRlU2lkZWJhclRvZ2dsZSgpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSB0YXNrIGNvdW50IG1hcmtcclxuXHRcdHRoaXMubGF5b3V0TWFuYWdlci5jcmVhdGVUYXNrTWFyaygpO1xyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgRmx1ZW50R2VzdHVyZU1hbmFnZXIgZm9yIG1vYmlsZSBnZXN0dXJlc1xyXG5cdFx0dGhpcy5nZXN0dXJlTWFuYWdlciA9IG5ldyBGbHVlbnRHZXN0dXJlTWFuYWdlcih0aGlzLnJvb3RDb250YWluZXJFbCk7XHJcblx0XHR0aGlzLmdlc3R1cmVNYW5hZ2VyLnNldERyYXdlckNhbGxiYWNrcyh7XHJcblx0XHRcdG9uT3BlbkRyYXdlcjogKCkgPT4gdGhpcy5sYXlvdXRNYW5hZ2VyLm9wZW5Nb2JpbGVEcmF3ZXIoKSxcclxuXHRcdFx0b25DbG9zZURyYXdlcjogKCkgPT4gdGhpcy5sYXlvdXRNYW5hZ2VyLmNsb3NlTW9iaWxlRHJhd2VyKCksXHJcblx0XHRcdGdldElzTW9iaWxlRHJhd2VyT3BlbjogKCkgPT4gdGhpcy5sYXlvdXRNYW5hZ2VyLmlzTW9iaWxlRHJhd2VyT3BlbixcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy5nZXN0dXJlTWFuYWdlci5pbml0aWFsaXplTW9iaWxlU3dpcGVHZXN0dXJlcygpO1xyXG5cdFx0dGhpcy5hZGRDaGlsZCh0aGlzLmdlc3R1cmVNYW5hZ2VyKTtcclxuXHJcblx0XHQvLyBTZXQgdXAgZmlsdGVyIGNhbGxiYWNrcyBmb3IgYWN0aW9uIGJ1dHRvbnNcclxuXHRcdHRoaXMubGF5b3V0TWFuYWdlci5zZXRGaWx0ZXJDYWxsYmFja3Moe1xyXG5cdFx0XHRvbkZpbHRlclJlc2V0OiAoKSA9PiB0aGlzLnJlc2V0Q3VycmVudEZpbHRlcigpLFxyXG5cdFx0XHRnZXRMaXZlRmlsdGVyU3RhdGU6ICgpID0+IHRoaXMubGl2ZUZpbHRlclN0YXRlLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGFjdGlvbiBidXR0b25zIGluIE9ic2lkaWFuIHZpZXcgaGVhZGVyXHJcblx0XHRjb25zb2xlLmxvZyhcIltURy1WMl0gQ3JlYXRpbmcgYWN0aW9uIGJ1dHRvbnNcIik7XHJcblx0XHR0aGlzLmxheW91dE1hbmFnZXIuY3JlYXRlQWN0aW9uQnV0dG9ucygpO1xyXG5cclxuXHRcdGNvbnNvbGUubG9nKFwiW1RHLVYyXSBVSSBzdHJ1Y3R1cmUgYnVpbHRcIik7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZWdpc3RlciB3b3Jrc3BhY2UgYW5kIGdsb2JhbCBldmVudHNcclxuXHQgKi9cclxuXHRwcml2YXRlIHJlZ2lzdGVyRXZlbnRzKCkge1xyXG5cdFx0Ly8gV29ya3NwYWNlIHN3aXRjaCBldmVudFxyXG5cdFx0aWYgKHRoaXMucGx1Z2luLndvcmtzcGFjZU1hbmFnZXIpIHtcclxuXHRcdFx0dGhpcy5yZWdpc3RlckV2ZW50KFxyXG5cdFx0XHRcdG9uV29ya3NwYWNlU3dpdGNoZWQodGhpcy5hcHAsIGFzeW5jIChwYXlsb2FkKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAocGF5bG9hZC53b3Jrc3BhY2VJZCAhPT0gdGhpcy53b3Jrc3BhY2VJZCkge1xyXG5cdFx0XHRcdFx0XHQvLyBTYXZlIGN1cnJlbnQgd29ya3NwYWNlIHN0YXRlXHJcblx0XHRcdFx0XHRcdHRoaXMud29ya3NwYWNlU3RhdGVNYW5hZ2VyLnNhdmVXb3Jrc3BhY2VMYXlvdXQoKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIFN3aXRjaCB0byBuZXcgd29ya3NwYWNlXHJcblx0XHRcdFx0XHRcdHRoaXMud29ya3NwYWNlSWQgPSBwYXlsb2FkLndvcmtzcGFjZUlkO1xyXG5cdFx0XHRcdFx0XHR0aGlzLnZpZXdTdGF0ZS5jdXJyZW50V29ya3NwYWNlID0gcGF5bG9hZC53b3Jrc3BhY2VJZDtcclxuXHJcblx0XHRcdFx0XHRcdC8vIEFwcGx5IG5ldyB3b3Jrc3BhY2Ugc2V0dGluZ3NcclxuXHRcdFx0XHRcdFx0YXdhaXQgdGhpcy53b3Jrc3BhY2VTdGF0ZU1hbmFnZXIuYXBwbHlXb3Jrc3BhY2VTZXR0aW5ncygpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gUmVzdG9yZSBmaWx0ZXIgc3RhdGVcclxuXHRcdFx0XHRcdFx0Y29uc3QgcmVzdG9yZWQgPVxyXG5cdFx0XHRcdFx0XHRcdHRoaXMud29ya3NwYWNlU3RhdGVNYW5hZ2VyLnJlc3RvcmVGaWx0ZXJTdGF0ZUZyb21Xb3Jrc3BhY2UoKTtcclxuXHRcdFx0XHRcdFx0aWYgKHJlc3RvcmVkKSB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy52aWV3U3RhdGUuZmlsdGVycyA9IHJlc3RvcmVkLmZpbHRlcnM7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy52aWV3U3RhdGUuc2VsZWN0ZWRQcm9qZWN0ID1cclxuXHRcdFx0XHRcdFx0XHRcdHJlc3RvcmVkLnNlbGVjdGVkUHJvamVjdDtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmN1cnJlbnRGaWx0ZXJTdGF0ZSA9IHJlc3RvcmVkLmFkdmFuY2VkRmlsdGVyO1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMudmlld1N0YXRlLnZpZXdNb2RlID0gcmVzdG9yZWQudmlld01vZGU7XHJcblx0XHRcdFx0XHRcdFx0aWYgKHJlc3RvcmVkLnNob3VsZENsZWFyU2VhcmNoKSB7XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdTdGF0ZS5zZWFyY2hRdWVyeSA9IFwiXCI7XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdTdGF0ZS5maWx0ZXJJbnB1dFZhbHVlID0gXCJcIjtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdC8vIFJlbG9hZCB0YXNrc1xyXG5cdFx0XHRcdFx0XHRhd2FpdCB0aGlzLmRhdGFNYW5hZ2VyLmxvYWRUYXNrcygpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBXb3Jrc3BhY2Ugb3ZlcnJpZGVzIHNhdmVkIGV2ZW50XHJcblx0XHRcdHRoaXMucmVnaXN0ZXJFdmVudChcclxuXHRcdFx0XHRvbldvcmtzcGFjZU92ZXJyaWRlc1NhdmVkKHRoaXMuYXBwLCBhc3luYyAocGF5bG9hZCkgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKHBheWxvYWQud29ya3NwYWNlSWQgPT09IHRoaXMud29ya3NwYWNlSWQpIHtcclxuXHRcdFx0XHRcdFx0YXdhaXQgdGhpcy53b3Jrc3BhY2VTdGF0ZU1hbmFnZXIuYXBwbHlXb3Jrc3BhY2VTZXR0aW5ncygpO1xyXG5cdFx0XHRcdFx0XHRhd2FpdCB0aGlzLmRhdGFNYW5hZ2VyLmxvYWRUYXNrcygpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBTZXR0aW5ncyBjaGFuZ2VkIGV2ZW50IChza2lwIGZvciBmaWx0ZXIgc3RhdGUgY2hhbmdlcylcclxuXHRcdFx0dGhpcy5yZWdpc3RlckV2ZW50KFxyXG5cdFx0XHRcdG9uKHRoaXMuYXBwLCBFdmVudHMuU0VUVElOR1NfQ0hBTkdFRCwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gUmVsb2FkIG9uIHNldHRpbmdzIGNoYW5nZSAodW5sZXNzIGNhdXNlZCBieSBmaWx0ZXIgc3RhdGUgc2F2ZSlcclxuXHRcdFx0XHRcdGF3YWl0IHRoaXMuZGF0YU1hbmFnZXIubG9hZFRhc2tzKCk7XHJcblx0XHRcdFx0fSlcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBMaXN0ZW4gZm9yIGZpbHRlciBjaGFuZ2UgZXZlbnRzXHJcblx0XHR0aGlzLnJlZ2lzdGVyRXZlbnQoXHJcblx0XHRcdHRoaXMuYXBwLndvcmtzcGFjZS5vbihcclxuXHRcdFx0XHRcInRhc2stZ2VuaXVzOmZpbHRlci1jaGFuZ2VkXCIsXHJcblx0XHRcdFx0KGZpbHRlclN0YXRlOiBSb290RmlsdGVyU3RhdGUsIGxlYWZJZD86IHN0cmluZykgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gT25seSB1cGRhdGUgaWYgaXQncyBmcm9tIGEgbGl2ZSBmaWx0ZXIgY29tcG9uZW50XHJcblx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdGxlYWZJZCAmJlxyXG5cdFx0XHRcdFx0XHQhbGVhZklkLnN0YXJ0c1dpdGgoXCJ2aWV3LWNvbmZpZy1cIikgJiZcclxuXHRcdFx0XHRcdFx0bGVhZklkICE9PSBcImdsb2JhbC1maWx0ZXJcIlxyXG5cdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRcdFwiW1RHLVYyXSBGaWx0ZXIgY2hhbmdlZCBmcm9tIGxpdmUgY29tcG9uZW50XCJcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0dGhpcy5saXZlRmlsdGVyU3RhdGUgPSBmaWx0ZXJTdGF0ZTtcclxuXHRcdFx0XHRcdFx0dGhpcy5jdXJyZW50RmlsdGVyU3RhdGUgPSBmaWx0ZXJTdGF0ZTtcclxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoIWxlYWZJZCkge1xyXG5cdFx0XHRcdFx0XHQvLyBObyBsZWFmSWQgbWVhbnMgaXQncyBhbHNvIGEgbGl2ZSBmaWx0ZXIgY2hhbmdlXHJcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiW1RHLVYyXSBGaWx0ZXIgY2hhbmdlZCAobm8gbGVhZklkKVwiKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5saXZlRmlsdGVyU3RhdGUgPSBmaWx0ZXJTdGF0ZTtcclxuXHRcdFx0XHRcdFx0dGhpcy5jdXJyZW50RmlsdGVyU3RhdGUgPSBmaWx0ZXJTdGF0ZTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBTeW5jIHNlbGVjdGVkUHJvamVjdCB3aXRoIGZpbHRlciBVSSBzdGF0ZSAoaWYgcHJvamVjdCBmaWx0ZXIgaXMgcHJlc2VudClcclxuXHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IGdyb3VwcyA9IGZpbHRlclN0YXRlPy5maWx0ZXJHcm91cHMgfHwgW107XHJcblx0XHRcdFx0XHRcdGNvbnN0IHByb2plY3RGaWx0ZXJzOiBzdHJpbmdbXSA9IFtdO1xyXG5cdFx0XHRcdFx0XHRmb3IgKGNvbnN0IGcgb2YgZ3JvdXBzKSB7XHJcblx0XHRcdFx0XHRcdFx0Zm9yIChjb25zdCBmIG9mIGcuZmlsdGVycyB8fCBbXSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRmLnByb3BlcnR5ID09PSBcInByb2plY3RcIiAmJlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRmLmNvbmRpdGlvbiA9PT0gXCJpc1wiICYmXHJcblx0XHRcdFx0XHRcdFx0XHRcdHR5cGVvZiBmLnZhbHVlID09PSBcInN0cmluZ1wiICYmXHJcblx0XHRcdFx0XHRcdFx0XHRcdGYudmFsdWUudHJpbSgpICE9PSBcIlwiXHJcblx0XHRcdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0cHJvamVjdEZpbHRlcnMucHVzaChmLnZhbHVlKTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0aWYgKHByb2plY3RGaWx0ZXJzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdTdGF0ZS5zZWxlY3RlZFByb2plY3QgPSBwcm9qZWN0RmlsdGVyc1swXTtcclxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdTdGF0ZS5zZWxlY3RlZFByb2plY3QgPSB1bmRlZmluZWQ7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0XHRcdFwiW1RHLVYyXSBGYWlsZWQgdG8gc3luYyBzZWxlY3RlZFByb2plY3QgZnJvbSBmaWx0ZXIgc3RhdGVcIixcclxuXHRcdFx0XHRcdFx0XHRlXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gUGVyc2lzdCBhbmQgdXBkYXRlIGhlYWRlciBVSVxyXG5cdFx0XHRcdFx0dGhpcy53b3Jrc3BhY2VTdGF0ZU1hbmFnZXIuc2F2ZUZpbHRlclN0YXRlVG9Xb3Jrc3BhY2UoKTtcclxuXHRcdFx0XHRcdHRoaXMubGF5b3V0TWFuYWdlci51cGRhdGVBY3Rpb25CdXR0b25zKCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gQXBwbHkgZmlsdGVycyBhbmQgdXBkYXRlIHZpZXdcclxuXHRcdFx0XHRcdHRoaXMuZmlsdGVyZWRUYXNrcyA9IHRoaXMuZGF0YU1hbmFnZXIuYXBwbHlGaWx0ZXJzKFxyXG5cdFx0XHRcdFx0XHR0aGlzLnRhc2tzXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0dGhpcy51cGRhdGVWaWV3KCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHQpXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIFNpZGViYXIgc2VsZWN0aW9uIGNoYW5nZWQgKHdoZW4gdXNpbmcgc2lkZSBsZWF2ZXMpXHJcblx0XHRpZiAodGhpcy51c2VTaWRlTGVhdmVzKCkpIHtcclxuXHRcdFx0dGhpcy5yZWdpc3RlckV2ZW50KFxyXG5cdFx0XHRcdG9uU2lkZWJhclNlbGVjdGlvbkNoYW5nZWQodGhpcy5hcHAsIChwYXlsb2FkKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAocGF5bG9hZC53b3Jrc3BhY2VJZCA9PT0gdGhpcy53b3Jrc3BhY2VJZCkge1xyXG5cdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0cGF5bG9hZC5zZWxlY3Rpb25UeXBlID09PSBcInZpZXdcIiAmJlxyXG5cdFx0XHRcdFx0XHRcdHBheWxvYWQuc2VsZWN0aW9uSWRcclxuXHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5jdXJyZW50Vmlld0lkID0gcGF5bG9hZC5zZWxlY3Rpb25JZDtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnVwZGF0ZVZpZXcoKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0cGF5bG9hZC5zZWxlY3Rpb25UeXBlID09PSBcInByb2plY3RcIiAmJlxyXG5cdFx0XHRcdFx0XHRcdHBheWxvYWQuc2VsZWN0aW9uSWQgIT09IHVuZGVmaW5lZFxyXG5cdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHQvLyBVc2UgdGhlIGZ1bGwgcHJvamVjdCBzZWxlY3Rpb24gbG9naWMgdmlhIGFjdGlvbkhhbmRsZXJzXHJcblx0XHRcdFx0XHRcdFx0dGhpcy5hY3Rpb25IYW5kbGVycy5oYW5kbGVQcm9qZWN0U2VsZWN0KFxyXG5cdFx0XHRcdFx0XHRcdFx0cGF5bG9hZC5zZWxlY3Rpb25JZCB8fCBcIlwiXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gV2luZG93IHJlc2l6ZVxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KHdpbmRvdywgXCJyZXNpemVcIiwgKCkgPT4ge1xyXG5cdFx0XHR0aGlzLmxheW91dE1hbmFnZXIub25SZXNpemUoKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIHZpZXcgd2l0aCBjdXJyZW50IHN0YXRlXHJcblx0ICovXHJcblx0cHJpdmF0ZSB1cGRhdGVWaWV3KCkge1xyXG5cdFx0aWYgKHRoaXMuaXNJbml0aWFsaXppbmcpIHtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJbVEctVjJdIFNraXAgdXBkYXRlIGR1cmluZyBpbml0aWFsaXphdGlvblwiKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRgW1RHLVYyXSB1cGRhdGVWaWV3OiB2aWV3SWQ9JHt0aGlzLmN1cnJlbnRWaWV3SWR9LCB0YXNrcz0ke3RoaXMudGFza3MubGVuZ3RofSwgZmlsdGVyZWQ9JHt0aGlzLmZpbHRlcmVkVGFza3MubGVuZ3RofWBcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHRhc2sgY291bnRcclxuXHRcdHRoaXMubGF5b3V0TWFuYWdlci51cGRhdGVUYXNrTWFyaygpO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSBzaWRlYmFyIGFjdGl2ZSBpdGVtXHJcblx0XHR0aGlzLmxheW91dE1hbmFnZXIuc2V0U2lkZWJhckFjdGl2ZUl0ZW0odGhpcy5jdXJyZW50Vmlld0lkKTtcclxuXHJcblx0XHQvLyBTaG93IGxvYWRpbmcgc3RhdGVcclxuXHRcdGlmICh0aGlzLmlzTG9hZGluZykge1xyXG5cdFx0XHR0aGlzLmNvbXBvbmVudE1hbmFnZXIucmVuZGVyTG9hZGluZ1N0YXRlKCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTaG93IGVycm9yIHN0YXRlXHJcblx0XHRpZiAodGhpcy5sb2FkRXJyb3IpIHtcclxuXHRcdFx0dGhpcy5jb21wb25lbnRNYW5hZ2VyLnJlbmRlckVycm9yU3RhdGUodGhpcy5sb2FkRXJyb3IsICgpID0+IHtcclxuXHRcdFx0XHR0aGlzLmRhdGFNYW5hZ2VyLmxvYWRUYXNrcygpO1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFNob3cgZW1wdHkgc3RhdGVcclxuXHRcdGlmICh0aGlzLnRhc2tzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHR0aGlzLmNvbXBvbmVudE1hbmFnZXIucmVuZGVyRW1wdHlTdGF0ZSgpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU3dpdGNoIHRvIGFwcHJvcHJpYXRlIGNvbXBvbmVudFxyXG5cdFx0dGhpcy5jb21wb25lbnRNYW5hZ2VyLnN3aXRjaFZpZXcoXHJcblx0XHRcdHRoaXMuY3VycmVudFZpZXdJZCxcclxuXHRcdFx0dGhpcy50YXNrcyxcclxuXHRcdFx0dGhpcy5maWx0ZXJlZFRhc2tzLFxyXG5cdFx0XHR0aGlzLmN1cnJlbnRGaWx0ZXJTdGF0ZSxcclxuXHRcdFx0dGhpcy52aWV3U3RhdGUudmlld01vZGUsXHJcblx0XHRcdHRoaXMudmlld1N0YXRlLnNlbGVjdGVkUHJvamVjdFxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlc2V0IGFsbCBhY3RpdmUgZmlsdGVyc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgcmVzZXRDdXJyZW50RmlsdGVyKCk6IHZvaWQge1xyXG5cdFx0Y29uc29sZS5sb2coXCJbVEctVjJdIFJlc2V0dGluZyBmaWx0ZXJcIik7XHJcblxyXG5cdFx0Ly8gQ2xlYXIgZmlsdGVyIHN0YXRlc1xyXG5cdFx0dGhpcy5saXZlRmlsdGVyU3RhdGUgPSBudWxsO1xyXG5cdFx0dGhpcy5jdXJyZW50RmlsdGVyU3RhdGUgPSBudWxsO1xyXG5cdFx0dGhpcy52aWV3U3RhdGUuc2VsZWN0ZWRQcm9qZWN0ID0gdW5kZWZpbmVkOyAvLyBrZWVwIHByb2plY3Qgc3RhdGUgaW4gc3luYyB3aGVuIGNsZWFyaW5nIHZpYSBVSVxyXG5cclxuXHRcdC8vIENsZWFyIGxvY2FsU3RvcmFnZVxyXG5cdFx0dGhpcy5hcHAuc2F2ZUxvY2FsU3RvcmFnZShcInRhc2stZ2VuaXVzLXZpZXctZmlsdGVyXCIsIG51bGwpO1xyXG5cclxuXHRcdC8vIFNhdmUgdGhlIGNsZWFyZWQgZmlsdGVyIHN0YXRlIHRvIHdvcmtzcGFjZVxyXG5cdFx0dGhpcy53b3Jrc3BhY2VTdGF0ZU1hbmFnZXIuc2F2ZUZpbHRlclN0YXRlVG9Xb3Jrc3BhY2UoKTtcclxuXHJcblx0XHQvLyBCcm9hZGNhc3QgZmlsdGVyIGNoYW5nZSB0byBlbnN1cmUgVUkgY29tcG9uZW50cyB1cGRhdGVcclxuXHRcdHRoaXMuYXBwLndvcmtzcGFjZS50cmlnZ2VyKFwidGFzay1nZW5pdXM6ZmlsdGVyLWNoYW5nZWRcIiwge1xyXG5cdFx0XHRyb290Q29uZGl0aW9uOiBcImFsbFwiLFxyXG5cdFx0XHRmaWx0ZXJHcm91cHM6IFtdLFxyXG5cdFx0fSBhcyBhbnkpO1xyXG5cclxuXHRcdC8vIENsZWFyIGFueSBhY3RpdmUgcHJvamVjdCBzZWxlY3Rpb24gaW4gc2lkZWJhclxyXG5cdFx0dGhpcy5sYXlvdXRNYW5hZ2VyLnNldEFjdGl2ZVByb2plY3QobnVsbCk7XHJcblxyXG5cdFx0Ly8gUmUtYXBwbHkgZmlsdGVycyAod2hpY2ggd2lsbCBub3cgYmUgZW1wdHkpIGFuZCB1cGRhdGUgdmlld1xyXG5cdFx0dGhpcy5maWx0ZXJlZFRhc2tzID0gdGhpcy5kYXRhTWFuYWdlci5hcHBseUZpbHRlcnModGhpcy50YXNrcyk7XHJcblx0XHR0aGlzLnVwZGF0ZVZpZXcoKTtcclxuXHJcblx0XHQvLyBVcGRhdGUgYWN0aW9uIGJ1dHRvbnMgKHRvIHJlbW92ZSBSZXNldCBGaWx0ZXIgYnV0dG9uKVxyXG5cdFx0dGhpcy5sYXlvdXRNYW5hZ2VyLnVwZGF0ZUFjdGlvbkJ1dHRvbnMoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBjdXJyZW50IHN0YXRlIChmb3IgZGVidWdnaW5nKVxyXG5cdCAqL1xyXG5cdGdldFN0YXRlKCkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0Li4udGhpcy52aWV3U3RhdGUsXHJcblx0XHRcdGN1cnJlbnRWaWV3SWQ6IHRoaXMuY3VycmVudFZpZXdJZCxcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTZXQgc3RhdGUgKGZvciBkZWJ1Z2dpbmcpXHJcblx0ICovXHJcblx0YXN5bmMgc2V0U3RhdGUoc3RhdGU6IGFueSwgcmVzdWx0OiBhbnkpIHtcclxuXHRcdC8vIFJlc3RvcmUgc3RhdGUgaWYgbmVlZGVkXHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDbGVhbiB1cCBvbiBjbG9zZVxyXG5cdCAqL1xyXG5cdGFzeW5jIG9uQ2xvc2UoKSB7XHJcblx0XHRjb25zb2xlLmxvZyhcIltURy1WMl0gb25DbG9zZSBzdGFydGVkXCIpO1xyXG5cclxuXHRcdC8vIFNhdmUgd29ya3NwYWNlIGxheW91dCBiZWZvcmUgY2xvc2luZ1xyXG5cdFx0dGhpcy53b3Jrc3BhY2VTdGF0ZU1hbmFnZXIuc2F2ZVdvcmtzcGFjZUxheW91dCgpO1xyXG5cclxuXHRcdC8vIENsZWFyIHNlbGVjdGlvblxyXG5cdFx0dGhpcy5hY3Rpb25IYW5kbGVycy5jbGVhclNlbGVjdGlvbigpO1xyXG5cclxuXHRcdGNvbnNvbGUubG9nKFwiW1RHLVYyXSBvbkNsb3NlIGNvbXBsZXRlZFwiKTtcclxuXHR9XHJcbn1cclxuIl19