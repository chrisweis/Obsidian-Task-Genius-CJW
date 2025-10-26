import { ItemView, WorkspaceLeaf } from "obsidian";
import TaskProgressBarPlugin from "@/index";
import { Task } from "@/types/task";
import "@/styles/fluent/fluent-main.css";
import "@/styles/fluent/fluent-secondary.css";
import "@/styles/fluent/fluent-content-header.css";
import "@/styles/fluent/fluent-project-popover.css";
import { TopNavigation, ViewMode } from "@/components/features/fluent/components/FluentTopNavigation";
import { FluentTaskViewState } from "@/types/fluent-types";
import {
	onWorkspaceSwitched,
	onWorkspaceOverridesSaved,
	onSidebarSelectionChanged,
} from "@/components/features/fluent/events/ui-event";
import { Events, on } from "@/dataflow/events/Events";
import { RootFilterState } from "@/components/features/task/filter/ViewTaskFilter";
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
	private plugin: TaskProgressBarPlugin;

	// ====================
	// MANAGERS (added via addChild for lifecycle management)
	// ====================
	private dataManager: FluentDataManager;
	private layoutManager: FluentLayoutManager;
	private componentManager: FluentComponentManager;
	private gestureManager: FluentGestureManager;
	private workspaceStateManager: FluentWorkspaceStateManager;
	private actionHandlers: FluentActionHandlers;

	// ====================
	// CENTRALIZED STATE - Single source of truth
	// ====================

	// Data state
	private tasks: Task[] = [];
	private filteredTasks: Task[] = [];
	private isLoading = false;
	private loadError: string | null = null;

	// View state
	private currentViewId = "inbox";
	private viewState: FluentTaskViewState = {
		currentWorkspace: "",
		viewMode: "list",
		searchQuery: "",
		filters: {},
		filterInputValue: "",
		selectedProject: undefined,
	};

	// Filter state
	private currentFilterState: RootFilterState | null = null;
	private liveFilterState: RootFilterState | null = null;

	// Selection state
	private selectedTask: Task | null = null;

	// Workspace state
	private workspaceId = "";

	// Initialization state
	private isInitializing = true;

	// Debounce timer for updates
	private updateTimeout: NodeJS.Timeout | null = null;

	// ====================
	// UI ELEMENTS
	// ====================
	private rootContainerEl: HTMLElement;
	private topNavigation: TopNavigation;
	private contentArea: HTMLElement;

	constructor(leaf: WorkspaceLeaf, plugin: TaskProgressBarPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.tasks = this.plugin.preloadedTasks || [];

		// Initialize workspace ID
		this.workspaceId =
			plugin.workspaceManager?.getActiveWorkspace().id || "";
		this.viewState.currentWorkspace = this.workspaceId;
	}

	getViewType(): string {
		return FLUENT_TASK_VIEW;
	}

	getDisplayText(): string {
		return t("Task Genius Fluent");
	}

	getIcon(): string {
		return "layout-dashboard";
	}

	/**
	 * Check if using workspace side leaves mode
	 */
	private useSideLeaves(): boolean {
		return !!(this.plugin.settings.fluentView)?.useWorkspaceSideLeaves;
	}

	/**
	 * Main initialization method
	 */
	async onOpen() {
		console.log("[TG-V2] onOpen started");
		this.isInitializing = true;

		this.contentEl.empty();
		this.contentEl.toggleClass(
			["task-genius-fluent-view", "task-genius-view"],
			true
		);

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
		await this.buildUIStructure();

		// Subscribe to workspace and global events
		this.registerEvents();

		// Load workspace state
		const savedWorkspaceId =
			this.workspaceStateManager.getSavedWorkspaceId();
		if (savedWorkspaceId && savedWorkspaceId !== this.workspaceId) {
			this.workspaceId = savedWorkspaceId;
			this.viewState.currentWorkspace = savedWorkspaceId;
		}

		// Apply workspace settings and restore filter state
		await this.workspaceStateManager.applyWorkspaceSettings();
		const restored =
			this.workspaceStateManager.restoreFilterStateFromWorkspace();

		console.log("[TG-V2] ===== RESTORED STATE =====", JSON.stringify(restored, null, 2));

		if (restored) {
			this.viewState.filters = restored.filters;
			this.viewState.viewMode = restored.viewMode;
			if (restored.shouldClearSearch) {
				this.viewState.searchQuery = "";
				this.viewState.filterInputValue = "";
			}

			console.log("[TG-V2] Restored advancedFilter:", JSON.stringify(restored.advancedFilter, null, 2));

			// Handle project selection restoration
			// IMPORTANT: Don't just set viewState.selectedProject - we need to trigger the full
			// project selection logic to ensure filter state is cleaned up properly
			console.log("[TG-V2] Restoring project selection:", restored.selectedProject);

			if (restored.selectedProject && restored.selectedProject !== "") {
				// Restore specific project selection
				console.log("[TG-V2] Restoring specific project:", restored.selectedProject);
				this.viewState.selectedProject = restored.selectedProject;
				this.currentFilterState = restored.advancedFilter;
				this.liveFilterState = restored.advancedFilter;
				this.layoutManager.setActiveProject(restored.selectedProject);
			} else {
				// No project selected - completely clear filter state
				console.log("[TG-V2] No project selected - CLEARING ALL FILTER STATE");

				this.currentFilterState = null;
				this.liveFilterState = null;
				this.viewState.selectedProject = undefined;
				this.layoutManager.setActiveProject(null);
			}
		} else {
			// No restored state - ensure clean state
			console.log("[TG-V2] No restored state, initializing with clean state");
			this.currentFilterState = null;
			this.liveFilterState = null;
			this.viewState.selectedProject = undefined;
			this.layoutManager.setActiveProject(null);
		}

		console.log("[TG-V2] ===== FINAL STATE AFTER RESTORE =====");
		console.log("[TG-V2] currentFilterState:", JSON.stringify(this.currentFilterState, null, 2));
		console.log("[TG-V2] liveFilterState:", JSON.stringify(this.liveFilterState, null, 2));
		console.log("[TG-V2] selectedProject:", this.viewState.selectedProject);

		// Initial data load
		await this.dataManager.loadTasks(false); // Will trigger onTasksLoaded callback

		// Register dataflow listeners for real-time updates
		await this.dataManager.registerDataflowListeners();

		// Initial render
		this.updateView();

		// Check window size and auto-collapse sidebar if needed
		this.layoutManager.checkAndCollapseSidebar();

		this.isInitializing = false;
	}

	/**
	 * Initialize all managers with callbacks
	 */
	private initializeManagers() {

		// 1. FluentDataManager - Data loading and filtering
		this.dataManager = new FluentDataManager(
			this.plugin,
			() => this.currentViewId,
			() => ({
				liveFilterState: this.liveFilterState,
				currentFilterState: this.currentFilterState,
				viewStateFilters: this.viewState.filters,
				selectedProject: this.viewState.selectedProject || undefined,
				searchQuery: this.viewState.searchQuery || "",
				filterInputValue: this.viewState.filterInputValue || "",
			}),
			() => this.isInitializing
		);
		this.dataManager.setCallbacks({
			onTasksLoaded: (tasks, error) => {
				if (error) {
					this.loadError = error;
					this.isLoading = false;
					this.componentManager?.renderErrorState(error, () => {
						this.dataManager.loadTasks();
					});
				} else {
					this.tasks = tasks;
					this.loadError = null;
					this.isLoading = false;
					// Apply filters immediately after loading
					this.filteredTasks = this.dataManager.applyFilters(
						this.tasks
					);
					this.updateView();
				}
			},
			onLoadingStateChanged: (isLoading) => {
				this.isLoading = isLoading;
				if (isLoading && !this.isInitializing) {
					this.componentManager?.renderLoadingState();
				}
			},
			onUpdateNeeded: (source) => {
				console.log(`[TG-V2] Update needed from source: ${source}`);
				// Re-apply filters and update view
				this.filteredTasks = this.dataManager.applyFilters(this.tasks);
				this.updateView();
			},
		});
		this.addChild(this.dataManager);

		// 2. FluentActionHandlers - User actions
		this.actionHandlers = new FluentActionHandlers(
			this.app,
			this.plugin,
			() => this.workspaceId,
			() => this.useSideLeaves()
		);
		this.actionHandlers.setCallbacks({
			onTaskSelectionChanged: (task) => {
				this.selectedTask = task;
				if (task) {
					this.layoutManager.showTaskDetails(task);
				}
			},
			onTaskUpdated: (taskId, updatedTask) => {
				console.log("[TG-V2] onTaskUpdated callback:", taskId, updatedTask);
				// Update task in cache
				const index = this.tasks.findIndex((t) => t.id === taskId);
				if (index !== -1) {
					this.tasks[index] = updatedTask;

					// If this is the currently selected task, update it and refresh details panel
					if (this.selectedTask && this.selectedTask.id === taskId) {
						console.log("[TG-V2] Updated task is selected, refreshing details panel");
						this.selectedTask = updatedTask;
						this.layoutManager.showTaskDetails(updatedTask);
					}

					// Re-apply filters
					this.filteredTasks = this.dataManager.applyFilters(
						this.tasks
					);
					this.updateView();
				}
			},
			onTaskDeleted: (taskId, deleteChildren) => {
				// Remove task from cache
				if (deleteChildren) {
					// Remove task and all children recursively
					const toRemove = new Set<string>([taskId]);
					const findChildren = (id: string) => {
						const task = this.tasks.find((t) => t.id === id);
						if (task?.metadata?.children) {
							for (const childId of task.metadata.children) {
								toRemove.add(childId);
								findChildren(childId);
							}
						}
					};
					findChildren(taskId);
					this.tasks = this.tasks.filter((t) => !toRemove.has(t.id));
				} else {
					this.tasks = this.tasks.filter((t) => t.id !== taskId);
				}
				// Re-apply filters
				this.filteredTasks = this.dataManager.applyFilters(this.tasks);
				this.updateView();
			},
			onNavigateToView: (viewId) => {
				this.currentViewId = viewId;
				this.updateView();
			},
			onSearchQueryChanged: (query) => {
				this.viewState.searchQuery = query;
				this.viewState.filterInputValue = query;
				// Re-apply filters
				this.filteredTasks = this.dataManager.applyFilters(this.tasks);
				this.updateView();
			},
			onProjectSelected: (projectId) => {
				console.log(`[TG-V2] Project selected: ${projectId}`);

				// Parse multi-select format (multi:id1,id2,id3)
				let projectIds: string[] = [];
				if (projectId.startsWith("multi:")) {
					projectIds = projectId.substring(6).split(",");
					this.viewState.selectedProject = projectIds[0]; // Store first for compatibility
					console.log(`[TG-V2] Multi-select mode: ${projectIds.length} projects - ${projectIds.join(", ")}`);
				} else {
					this.viewState.selectedProject = projectId;
					projectIds = projectId ? [projectId] : [];
					console.log(`[TG-V2] Single project mode: ${projectId || "(none)"}`);
				}

				// Note: Removed view switching - project selection now only filters without changing the view
				// Users can stay in Matrix, Calendar, or any other view while filtering by project

				// Reflect selection into the Filter UI state so the top Filter button shows active and can be reset via "X"
				try {
					const timestamp = Date.now();
					const nextState = this.liveFilterState || {
						rootCondition: "all",
						filterGroups: [],
					};

					// Remove any existing project filters and empty groups to avoid duplicates
					nextState.filterGroups = (nextState.filterGroups || [])
						.map((g: any) => ({
							...g,
							filters: (g.filters || []).filter(
								(f: any) => f.property !== "project"
							),
						}))
						.filter((g: any) => g.filters && g.filters.length > 0); // Remove empty groups

					// Only add project filters if projectIds is not empty
					if (projectIds.length > 0) {
						const customProjects = this.plugin.settings.projectConfig?.customProjects || [];

						// Create filters for each selected project
						const projectFilters = projectIds.map((pid, index) => {
							const customProject = customProjects.find((p) => p.id === pid);
							const projectNameForFilter = customProject ? customProject.name : pid;

							return {
								id: `fluent-proj-filter-${timestamp}-${index}`,
								property: "project",
								condition: "is",
								value: projectNameForFilter,
							};
						});

						// Append a dedicated group for project filters with OR condition (any match)
						nextState.filterGroups.push({
							id: `fluent-proj-group-${timestamp}`,
							groupCondition: "any", // Use "any" for OR semantics
							filters: projectFilters,
						});

						console.log(`[TG-V2] Created filter group with ${projectFilters.length} project filters (OR condition)`);
						console.log(`[TG-V2] Filter values: ${projectFilters.map(f => f.value).join(", ")}`);
					}

					this.liveFilterState = nextState as any;
					this.currentFilterState = nextState as any;
					this.app.saveLocalStorage(
						"task-genius-view-filter",
						nextState
					);

					// Broadcast so any open filter UI reacts and header button shows reset
					// The filter-changed event listener will handle applyFilters and updateView
					this.app.workspace.trigger(
						"task-genius:filter-changed",
						nextState
					);
				} catch (e) {
					console.warn(
						"[TG-V2] Failed to project-sync filter UI state",
						e
					);
					// If filter sync fails, still update the view
					this.filteredTasks = this.dataManager.applyFilters(
						this.tasks
					);
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
		this.workspaceStateManager = new FluentWorkspaceStateManager(
			this.app,
			this.plugin,
			() => this.workspaceId,
			() => this.currentViewId,
			() => ({
				filters: this.viewState.filters || {},
				selectedProject: this.viewState.selectedProject || undefined,
				searchQuery: this.viewState.searchQuery || "",
				viewMode: this.viewState.viewMode,
			}),
			() => this.currentFilterState,
			() => this.liveFilterState
		);
		this.addChild(this.workspaceStateManager);

		console.log("[TG-V2] Managers initialized");
	}

	/**
	 * Build UI structure - MUST match original DOM structure for CSS
	 */
	private async buildUIStructure() {
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
		this.layoutManager = new FluentLayoutManager(
			this.app,
			this.plugin,
			this,
			this.rootContainerEl,
			this.headerEl, // Obsidian's view header
			this.titleEl, // Obsidian's view title element
			() => this.filteredTasks.length
		);
		this.layoutManager.setOnSidebarNavigate((viewId) => {
			this.actionHandlers.handleNavigate(viewId);
		});
		this.layoutManager.setOnProjectSelect((projectId) => {
			this.actionHandlers.handleProjectSelect(projectId);
		});
		this.layoutManager.setOnSearch((query) => {
			this.actionHandlers.handleSearch(query);
		});
		this.layoutManager.setOnFilterSelect((configId) => {
			this.handleFilterSelect(configId);
		});
		this.layoutManager.setTaskCallbacks({
			onTaskToggleComplete: (task) => {
				this.actionHandlers.toggleTaskCompletion(task);
			},
			onTaskEdit: (task) => {
				this.actionHandlers.handleTaskSelection(task);
			},
			onTaskUpdate: async (originalTask, updatedTask) => {
				await this.actionHandlers.handleTaskUpdate(
					originalTask,
					updatedTask
				);
			},
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
		} else {
			sidebarEl.hide();
			console.log(
				"[TG-V2] Using workspace side leaves: skip in-view sidebar"
			);
		}

		// Create top navigation
		console.log("[TG-V2] Initializing top navigation");
		this.topNavigation = new TopNavigation(
			topNavEl,
			this.plugin,
			(query: string) => this.actionHandlers.handleSearch(query),
			(mode: ViewMode) => this.actionHandlers.handleViewModeChange(mode),
			() => {
				// Filter click - open filter modal/popover
				// TODO: Implement filter modal
			},
			() => {
				// Sort click
				// TODO: Implement sort
			},
			() => this.actionHandlers.handleSettingsClick(),
			undefined, // availableModes - use defaults
			undefined, // onToggleSidebar
			(configId: string | null) => this.handleFilterSelect(configId),
			(task: Task) => this.actionHandlers.handleTaskSelection(task)
		);
		this.addChild(this.topNavigation);

		// Initialize view components
		console.log("[TG-V2] Initializing view components");
		this.componentManager = new FluentComponentManager(
			this.app,
			this.plugin,
			this.contentArea,
			this, // parent view
			{
				onTaskSelected: (task) => {
					this.actionHandlers.handleTaskSelection(task);
				},
				onTaskCompleted: (task) => {
					this.actionHandlers.toggleTaskCompletion(task);
				},
				onTaskUpdate: async (originalTask, updatedTask) => {
					await this.actionHandlers.handleTaskUpdate(
						originalTask,
						updatedTask
					);
				},
				onTaskContextMenu: (event, task) => {
					this.actionHandlers.handleTaskContextMenu(event, task);
				},
				onKanbanTaskStatusUpdate: (taskId, newStatusMark) => {
					const task = this.tasks.find((t) => t.id === taskId);
					if (task) {
						this.actionHandlers.handleKanbanTaskStatusUpdate(
							task,
							newStatusMark
						);
					}
				},
			}
		);
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
	}

	/**
	 * Register workspace and global events
	 */
	private registerEvents() {
		// Workspace switch event
		if (this.plugin.workspaceManager) {
			this.registerEvent(
				onWorkspaceSwitched(this.app, async (payload) => {
					if (payload.workspaceId !== this.workspaceId) {
						// Save current workspace state
						this.workspaceStateManager.saveWorkspaceLayout();

						// Switch to new workspace
						this.workspaceId = payload.workspaceId;
						this.viewState.currentWorkspace = payload.workspaceId;

						// Apply new workspace settings
						await this.workspaceStateManager.applyWorkspaceSettings();

						// Restore filter state
						const restored =
							this.workspaceStateManager.restoreFilterStateFromWorkspace();
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
						await this.dataManager.loadTasks();
					}
				})
			);

			// Workspace overrides saved event
			this.registerEvent(
				onWorkspaceOverridesSaved(this.app, async (payload) => {
					if (payload.workspaceId === this.workspaceId) {
						await this.workspaceStateManager.applyWorkspaceSettings();
						await this.dataManager.loadTasks();
					}
				})
			);

			// Settings changed event (skip for filter state changes)
			this.registerEvent(
				on(this.app, Events.SETTINGS_CHANGED, async () => {
					// Reload on settings change (unless caused by filter state save)
					await this.dataManager.loadTasks();
				})
			);
		}

		// Listen for filter change events
		this.registerEvent(
			this.app.workspace.on(
				"task-genius:filter-changed",
				(filterState: RootFilterState, leafId?: string) => {
					// Only update if it's from a live filter component
					if (
						leafId &&
						!leafId.startsWith("view-config-") &&
						leafId !== "global-filter"
					) {
						console.log(
							"[TG-V2] Filter changed from live component"
						);
						this.liveFilterState = filterState;
						this.currentFilterState = filterState;
					} else if (!leafId) {
						// No leafId means it's also a live filter change
						console.log("[TG-V2] Filter changed (no leafId)");
						this.liveFilterState = filterState;
						this.currentFilterState = filterState;
					}

					// Sync selectedProject with filter UI state (if project filter is present)
					try {
						const groups = filterState?.filterGroups || [];
						const projectFilters: string[] = [];
						for (const g of groups) {
							for (const f of g.filters || []) {
								if (
									f.property === "project" &&
									f.condition === "is" &&
									typeof f.value === "string" &&
									f.value.trim() !== ""
								) {
									projectFilters.push(f.value);
								}
							}
						}
						if (projectFilters.length > 0) {
							this.viewState.selectedProject = projectFilters[0];
						} else {
							this.viewState.selectedProject = undefined;
						}
					} catch (e) {
						console.warn(
							"[TG-V2] Failed to sync selectedProject from filter state",
							e
						);
					}

					// Persist and update header UI
					this.workspaceStateManager.saveFilterStateToWorkspace();
					this.layoutManager.updateActionButtons();

					// Apply filters and update view
					this.filteredTasks = this.dataManager.applyFilters(
						this.tasks
					);
					this.updateView();
				}
			)
		);

		// Listen for saved filter changes to refresh dropdown
		this.registerEvent(
			on(
				this.app,
				Events.SAVED_FILTERS_CHANGED,
				() => {
					console.log("[TG-V2] Saved filters changed, refreshing dropdown");
					this.layoutManager?.sidebar?.refreshFilterDropdown();
				}
			)
		);

		// Sidebar selection changed (when using side leaves)
		if (this.useSideLeaves()) {
			this.registerEvent(
				onSidebarSelectionChanged(this.app, (payload) => {
					if (payload.workspaceId === this.workspaceId) {
						if (
							payload.selectionType === "view" &&
							payload.selectionId
						) {
							this.currentViewId = payload.selectionId;
							this.updateView();
						}
						if (
							payload.selectionType === "project" &&
							payload.selectionId !== undefined
						) {
							// Use the full project selection logic via actionHandlers
							this.actionHandlers.handleProjectSelect(
								payload.selectionId || ""
							);
						}
						if (
							payload.selectionType === "search" &&
							payload.selectionId !== undefined
						) {
							// Handle search query from sidebar
							this.actionHandlers.handleSearch(payload.selectionId);
						}
						if (
							payload.selectionType === "filter"
						) {
							// Handle filter selection from sidebar
							this.handleFilterSelect(payload.selectionId || null);
						}
					}
				})
			);
		}

		// Window resize
		this.registerDomEvent(window, "resize", () => {
			this.layoutManager.onResize();
		});
	}

	/**
	 * Update view with current state (debounced to prevent rapid successive updates)
	 */
	private updateView() {
		if (this.isInitializing) {
			console.log("[TG-V2] Skip update during initialization");
			return;
		}

		// Clear any pending update
		if (this.updateTimeout) {
			clearTimeout(this.updateTimeout);
		}

		// Debounce updates by 10ms to batch rapid successive calls
		this.updateTimeout = setTimeout(() => {
			this.updateTimeout = null;
			this.performUpdate();
		}, 10);
	}

	/**
	 * Perform the actual view update
	 */
	private performUpdate() {
		console.log(
			`[TG-V2] performUpdate: viewId=${this.currentViewId}, tasks=${this.tasks.length}, filtered=${this.filteredTasks.length}`
		);

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

		// CRITICAL: Re-apply filters with the current viewId before switching components
		// This ensures filteredTasks are filtered with the NEW view's logic, not the old view's
		console.log(`[TG-V2] performUpdate: Re-applying filters for viewId=${this.currentViewId}`);
		this.filteredTasks = this.dataManager.applyFilters(this.tasks);
		console.log(`[TG-V2] performUpdate: After re-filter: ${this.filteredTasks.length} tasks`);

		// Update available view modes for top navigation based on current view
		const availableModes = this.componentManager.getAvailableModesForView(
			this.currentViewId
		);
		this.topNavigation.updateAvailableModes(availableModes);

		// Switch to appropriate component
		this.componentManager.switchView(
			this.currentViewId,
			this.tasks,
			this.filteredTasks,
			this.currentFilterState,
			this.viewState.viewMode,
			this.viewState.selectedProject
		);
	}

	/**
	 * Reset all active filters
	 */
	private handleFilterSelect(configId: string | null): void {
		console.log("[TG-V2] Filter selected:", configId);

		if (!configId) {
			// "All Tasks" selected - reset filter
			this.resetCurrentFilter();
			return;
		}

		// Find the saved filter configuration
		const config = this.plugin.settings.filterConfig.savedConfigs.find(
			(c) => c.id === configId
		);

		if (!config) {
			console.error("[TG-V2] Filter config not found:", configId);
			return;
		}

		// MERGE the saved filter with existing filters instead of replacing
		const currentState = this.currentFilterState || {
			rootCondition: "all",
			filterGroups: [],
		};

		// Combine existing filter groups with saved filter groups
		// Use "all" (AND) at root level so tasks must match both existing filters (projects, etc.) AND saved filters
		const mergedState = {
			rootCondition: "all" as const, // AND all groups together
			filterGroups: [
				...(currentState.filterGroups || []),
				...(config.filterState.filterGroups || []),
			],
		};

		console.log(`[TG-V2] Merged filter state: ${currentState.filterGroups?.length || 0} existing groups + ${config.filterState.filterGroups?.length || 0} saved groups = ${mergedState.filterGroups.length} total groups`);

		// Apply the merged filter state
		this.liveFilterState = mergedState;
		this.currentFilterState = mergedState;

		// Save to localStorage
		this.app.saveLocalStorage("task-genius-view-filter", mergedState);

		// Broadcast filter change so UI components can update
		this.app.workspace.trigger("task-genius:filter-changed", mergedState);

		// Refresh data
		this.dataManager.loadTasks();
	}

	private resetCurrentFilter(): void {
		console.log("[TG-V2] Resetting filter");

		// Clear filter states
		this.liveFilterState = null;
		this.currentFilterState = null;
		this.viewState.selectedProject = undefined; // keep project state in sync when clearing via UI

		// Reset filter dropdown to "All tasks"
		this.layoutManager?.sidebar?.resetFilterDropdown();

		// Clear localStorage
		this.app.saveLocalStorage("task-genius-view-filter", null);

		// Save the cleared filter state to workspace
		this.workspaceStateManager.saveFilterStateToWorkspace();

		// Broadcast filter change to ensure UI components update
		this.app.workspace.trigger("task-genius:filter-changed", {
			rootCondition: "all",
			filterGroups: [],
		} as any);

		// Clear any active project selection in sidebar
		this.layoutManager.setActiveProject(null);

		// Re-apply filters (which will now be empty) and update view
		this.filteredTasks = this.dataManager.applyFilters(this.tasks);
		this.updateView();

		// Update action buttons (to remove Reset Filter button)
		this.layoutManager.updateActionButtons();
	}

	/**
	 * Get current state (for debugging)
	 */
	getState() {
		return {
			...this.viewState,
			currentViewId: this.currentViewId,
		};
	}

	/**
	 * Set state (for debugging)
	 */
	async setState(state: any, result: any) {
		// Restore state if needed
	}

	/**
	 * Clean up on close
	 */
	async onClose() {
		console.log("[TG-V2] onClose started");

		// Save workspace layout before closing
		this.workspaceStateManager.saveWorkspaceLayout();

		// Clear selection
		this.actionHandlers.clearSelection();

		console.log("[TG-V2] onClose completed");
	}
}
