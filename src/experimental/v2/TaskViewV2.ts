import {
	ItemView,
	WorkspaceLeaf,
	Plugin,
	Notice,
	debounce,
	setIcon,
	Menu,
	TFile,
	ButtonComponent,
} from "obsidian";
import TaskProgressBarPlugin from "../../index";
import { Task, BaseTask } from "../../types/task";
import { V2Sidebar } from "./components/V2Sidebar";
import "./styles/v2.css";
import "./styles/v2-enhanced.css";
import "./styles/v2-content-header.css";
import "@/styles/v2-project-popover.css";
import { TopNavigation, ViewMode } from "./components/V2TopNavigation";
import { V2ViewState } from "./types";
import {
	onWorkspaceSwitched,
	onWorkspaceOverridesSaved,
} from "./events/ui-event";
import { Events, on } from "../../dataflow/events/Events";
import { TaskListItemComponent } from "../../components/features/task/view/listItem";
import { TaskTreeItemComponent } from "../../components/features/task/view/treeItem";
import {
	CalendarComponent,
	CalendarEvent,
} from "../../components/features/calendar";
import { KanbanComponent } from "../../components/features/kanban/kanban";
import { GanttComponent } from "../../components/features/gantt/gantt";
import { filterTasks } from "../../utils/task/task-filter-utils";
import {
	getViewSettingOrDefault,
	TwoColumnSpecificConfig,
} from "../../common/setting-definition";
import { ContentComponent } from "../../components/features/task/view/content";
import { ForecastComponent } from "../../components/features/task/view/forecast";
import { TagsComponent } from "../../components/features/task/view/tags";
import { ProjectsComponent } from "../../components/features/task/view/projects";
import { ReviewComponent } from "../../components/features/task/view/review";
import { Habit } from "../../components/features/habit/habit";
import { ViewComponentManager } from "../../components/ui/behavior/ViewComponentManager";
import { TaskPropertyTwoColumnView } from "../../components/features/task/view/TaskPropertyTwoColumnView";
import {
	TaskDetailsComponent,
	createTaskCheckbox,
} from "../../components/features/task/view/details";
import { ConfirmModal } from "../../components/ui/modals/ConfirmModal";
import { QuickCaptureModal } from "../../components/features/quick-capture/modals/QuickCaptureModal";
import {
	ViewTaskFilterPopover,
	ViewTaskFilterModal,
} from "../../components/features/task/filter";
import { RootFilterState } from "../../components/features/task/filter/ViewTaskFilter";
import { Platform } from "obsidian";
import { TaskProgressBarSettingTab } from "../../setting";
import { isDataflowEnabled } from "../../dataflow/createDataflow";
import { t } from "../../translations/helper";

export const TASK_VIEW_V2_TYPE = "task-genius-view-v2";

// View mode configuration for each view type
const VIEW_MODE_CONFIG: Record<string, ViewMode[]> = {
	// Content-based views - support all modes
	inbox: ["list", "tree", "kanban", "calendar"],
	today: ["list", "tree", "kanban", "calendar"],
	upcoming: ["list", "tree", "kanban", "calendar"],
	flagged: ["list", "tree", "kanban", "calendar"],
	projects: ["list", "tree", "kanban", "calendar"],

	// Specialized views with limited or no modes
	tags: [],
	review: [],
	forecast: [], // Has its own specialized UI
	habit: [], // Has its own specialized UI
	gantt: [], // Is itself a view mode
	calendar: [], // Is itself a calendar view
	kanban: [], // Is itself a kanban view
};

export class TaskViewV2 extends ItemView {
	private plugin: TaskProgressBarPlugin;
	private rootContainerEl: HTMLElement;

	// Components
	private sidebar: V2Sidebar;
	private topNavigation: TopNavigation;
	private contentArea: HTMLElement;

	// View components - using existing components from the main plugin
	private contentComponent: ContentComponent;
	private forecastComponent: ForecastComponent;
	private tagsComponent: TagsComponent;
	private projectsComponent: ProjectsComponent;
	private reviewComponent: ReviewComponent;
	private calendarComponent: CalendarComponent;
	private kanbanComponent: KanbanComponent;
	private ganttComponent: GanttComponent;
	private habitComponent: Habit;
	private viewComponentManager: ViewComponentManager;
	private detailsComponent: TaskDetailsComponent;

	// Two column view components
	private twoColumnViewComponents: Map<string, TaskPropertyTwoColumnView> =
		new Map();

	// Legacy containers for backward compatibility
	private listContainer: HTMLElement;
	private treeContainer: HTMLElement;
	private taskComponents: Map<
		string,
		TaskListItemComponent | TaskTreeItemComponent
	> = new Map();

	// Content header elements
	private contentHeaderEl: HTMLElement;
	private contentTitleEl: HTMLElement;
	private taskCountEl: HTMLElement;
	private filterInputEl: HTMLInputElement;
	private viewToggleBtn: HTMLElement;
	private isTreeView: boolean = false;

	// View action buttons
	private detailsToggleBtn: HTMLElement;
	private currentSelectedTaskId: string | null = null;
	private lastToggleTimestamp: number = 0;
	private isDetailsVisible: boolean = false;
	private currentFilterState: RootFilterState | null = null;

	// Sidebar collapse state
	private isSidebarCollapsed: boolean = false;
	private sidebarToggleBtn: HTMLElement | null = null;

	// V2 Details panel
	private detailsPanelEl: HTMLElement | null = null;
	private detailsBodyEl: HTMLElement | null = null;

	private liveFilterState: RootFilterState | null = null;

	// State management
	private viewState: V2ViewState = {
		currentWorkspace: "",
		viewMode: "list", // Default should be list, not calendar
		searchQuery: "",
		filters: {},
	};

	private workspaceId: string = "";
	private isSavingFilterState: boolean = false;

	private tasks: Task[] = [];
	private filteredTasks: Task[] = [];
	private currentViewId: string = "inbox";
	private isLoading: boolean = false;
	private loadError: string | null = null;
	private isInitializing: boolean = true;
	private updateScheduled: boolean = false;
	private pendingUpdates: Set<string> = new Set();

	// Track the current active component for view mode switching
	private currentActiveComponent: any = null;
	private currentVisibleComponent: any = null;

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
		return TASK_VIEW_V2_TYPE;
	}

	getDisplayText(): string {
		return t("Task Genius Fluent");
	}

	getIcon(): string {
		return "layout-dashboard";
	}

	async onOpen() {
		console.log("[TG-V2] onOpen started");
		this.isInitializing = true;
		this.contentEl.empty();
		this.contentEl.toggleClass(
			["task-genius-v2-view", "task-genius-view"],
			true
		);

		// Subscribe to workspace events
		if (this.plugin.workspaceManager) {
			this.registerEvent(
				onWorkspaceSwitched(this.app, async (payload) => {
					if (payload.workspaceId !== this.workspaceId) {
						// Save current workspace state before switching
						this.saveWorkspaceLayout();
						// Switch to the new workspace and restore its state
						this.workspaceId = payload.workspaceId;
						this.viewState.currentWorkspace = payload.workspaceId;
						await this.applyWorkspaceSettings();
						this.restoreFilterStateFromWorkspace();
						await this.loadTasks();
						this.scheduleUpdate('workspace-switch');
					}
				})
			);

			this.registerEvent(
				onWorkspaceOverridesSaved(this.app, async (payload) => {
					if (payload.workspaceId === this.workspaceId) {
						await this.applyWorkspaceSettings();
						await this.loadTasks();
						this.scheduleUpdate('workspace-overrides');
					}
				})
			);

			// Skip SETTINGS_CHANGED for v2FilterState changes to avoid loops
			this.registerEvent(
				on(this.app, Events.SETTINGS_CHANGED, async () => {
					// Only reload if not caused by filter state save
					if (!this.isSavingFilterState) {
						await this.applyWorkspaceSettings();
						await this.loadTasks();
						this.switchView(this.currentViewId);
					}
				})
			);
		}

		// Initialize default view mode to list
		console.log("[TG-V2] Initial viewMode:", this.viewState.viewMode);
		this.viewState.viewMode = "list"; // Force list mode for now

		// Load saved filter state
		const savedFilterState = this.app.loadLocalStorage(
			"task-genius-view-filter"
		) as RootFilterState;
		console.log("[TG-V2] Loaded saved filter state:", savedFilterState);

		if (
			savedFilterState &&
			typeof savedFilterState.rootCondition === "string" &&
			Array.isArray(savedFilterState.filterGroups)
		) {
			console.log("[TaskViewV2] Loaded saved filter state");
			this.liveFilterState = savedFilterState;
			this.currentFilterState = savedFilterState;
		}

		// Load workspace layout
		this.loadWorkspaceLayout();

		// For content-based views, default to list mode
		// Calendar/kanban should only be used when explicitly selected from top navigation
		if (this.isContentBasedView("inbox")) {
			console.log(
				"[TG-V2] Resetting view mode to list for content-based view"
			);
			this.viewState.viewMode = "list";
		}

		// Create main container with layout structure
		this.rootContainerEl = this.contentEl.createDiv({
			cls: "tg-v2-container",
		});

		// Create layout structure
		const layoutContainer = this.rootContainerEl.createDiv({
			cls: "tg-v2-layout",
		});

		// Sidebar
		const sidebarEl = layoutContainer.createDiv({
			cls: "tg-v2-sidebar-container",
		});

		// Main content area
		const mainContainer = layoutContainer.createDiv({
			cls: "tg-v2-main-container",
		});

		// Top navigation
		const topNavEl = mainContainer.createDiv({
			cls: "tg-v2-top-nav",
		});

		// Content area with wrapper for header
		const contentWrapper = mainContainer.createDiv({
			cls: "tg-v2-content-wrapper",
		});

		// Actual content area
		this.contentArea = contentWrapper.createDiv({
			cls: "tg-v2-content",
		});

		// Initialize details component (hidden by default)
		this.detailsComponent = new TaskDetailsComponent(
			this.rootContainerEl,
			this.app,
			this.plugin
		);
		this.addChild(this.detailsComponent);
		this.detailsComponent.load();
		this.detailsComponent.onTaskToggleComplete = (task: Task) =>
			this.toggleTaskCompletion(task);
		this.detailsComponent.onTaskEdit = (task: Task) => this.editTask(task);
		this.detailsComponent.onTaskUpdate = async (
			originalTask: Task,
			updatedTask: Task
		) => {
			await this.handleTaskUpdate(originalTask, updatedTask);
		};
		this.detailsComponent.toggleDetailsVisibility = (visible: boolean) => {
			this.toggleDetailsVisibility(visible);
		};
		this.detailsComponent.setVisible(this.isDetailsVisible);

		// Initialize components
		console.log("[TG-V2] Initializing sidebar");
		this.initializeSidebar(sidebarEl);
		console.log("[TG-V2] Initializing top navigation");
		this.initializeTopNavigation(topNavEl);
		console.log("[TG-V2] Initializing view components");
		this.initializeViewComponents();

		// Register dataflow event listeners first for real-time updates
		console.log("[TG-V2] Registering dataflow listeners");
		await this.registerDataflowListeners();

		// Load initial data - first try to use preloaded tasks like TaskView does
		console.log("[TG-V2] Checking for preloaded tasks");
		if (
			this.plugin.preloadedTasks &&
			this.plugin.preloadedTasks.length > 0
		) {
			console.log(
				"[TG-V2] Using preloaded tasks:",
				this.plugin.preloadedTasks.length
			);
			this.tasks = this.plugin.preloadedTasks;
		} else {
			// If no preloaded tasks, load them
			console.log("[TG-V2] No preloaded tasks, loading from dataflow");
			await this.loadTasks(false); // Don't show loading state during initial load
			console.log("[TG-V2] Loaded tasks:", this.tasks.length);
		}

		// Apply filters once
		console.log("[TG-V2] Applying initial filters");
		this.applyFilters();
		console.log(
			"[TG-V2] After applying filters, tasks:",
			this.tasks.length,
			"filtered:",
			this.filteredTasks.length
		);

		// Single initial render
		console.log("[TG-V2] Performing initial render with:", this.currentViewId);
		// Keep isInitializing true during first switchView
		this.switchView(this.currentViewId);

		// Refresh top navigation (badge) after tasks are loaded
		this.topNavigation?.refresh();

		// Sidebar toggle in header and responsive collapse
		this.createSidebarToggle();
		this.checkAndCollapseSidebar();

		// Create action buttons in Obsidian view header
		console.log("[TG-V2] Creating action buttons");
		this.createActionButtons();

		// Mark initialization as complete (only set once, at the very end)
		this.isInitializing = false;
		console.log("[TG-V2] onOpen completed");
	}

	private initializeSidebar(containerEl: HTMLElement) {
		this.sidebar = new V2Sidebar(
			containerEl,
			this.plugin,
			(viewId) => this.handleNavigate(viewId),
			(projectId) => this.handleProjectSelect(projectId),
			this.isSidebarCollapsed
		);
		// Add sidebar as a child component for proper lifecycle management
		this.addChild(this.sidebar);
	}

	private initializeTopNavigation(containerEl: HTMLElement) {
		// Get initial available modes for the current view
		const availableModes = this.getAvailableModesForView(
			this.currentViewId
		);

		this.topNavigation = new TopNavigation(
			containerEl,
			this.plugin,
			(query) => this.handleSearch(query),
			(mode) => this.handleViewModeChange(mode),
			() => {}, // Filter is now in Obsidian view header
			() => {}, // Sort is now in Obsidian view header
			() => this.handleSettingsClick(),
			availableModes
		);
	}

	private initializeViewComponents() {
		console.log("[TG-V2] initializeViewComponents started");
		// Initialize ViewComponentManager for special views
		const viewHandlers = {
			onTaskSelected: (task: Task) => this.handleTaskSelection(task),
			onTaskCompleted: (task: Task) => this.toggleTaskCompletion(task),
			onTaskUpdate: async (originalTask: Task, updatedTask: Task) => {
				await this.handleTaskUpdate(originalTask, updatedTask);
			},
			onTaskContextMenu: (event: MouseEvent, task: Task) =>
				this.handleTaskContextMenu(event, task),
		};
		this.viewComponentManager = new ViewComponentManager(
			this,
			this.app,
			this.plugin,
			this.contentArea,
			viewHandlers
		);
		this.addChild(this.viewComponentManager);

		// Initialize ContentComponent (handles inbox, today, upcoming, flagged)
		console.log("[TG-V2] Creating ContentComponent");
		this.contentComponent = new ContentComponent(
			this.contentArea,
			this.app,
			this.plugin,
			{
				onTaskSelected: (task) => this.handleTaskSelection(task),
				onTaskCompleted: (task) => this.toggleTaskCompletion(task),
				onTaskContextMenu: (event, task) =>
					this.handleTaskContextMenu(event, task),
			}
		);
		console.log("[TG-V2] Adding ContentComponent as child");
		this.addChild(this.contentComponent);
		console.log("[TG-V2] Loading ContentComponent");
		this.contentComponent.load();
		console.log(
			"[TG-V2] ContentComponent loaded, containerEl exists:",
			!!this.contentComponent.containerEl
		);

		// Initialize ForecastComponent
		this.forecastComponent = new ForecastComponent(
			this.contentArea,
			this.app,
			this.plugin,
			{
				onTaskSelected: (task) => this.handleTaskSelection(task),
				onTaskCompleted: (task) => this.toggleTaskCompletion(task),
				onTaskUpdate: async (originalTask, updatedTask) => {
					await this.handleTaskUpdate(originalTask, updatedTask);
				},
				onTaskContextMenu: (event, task) =>
					this.handleTaskContextMenu(event, task),
			}
		);
		this.addChild(this.forecastComponent);
		this.forecastComponent.load();

		// Initialize TagsComponent
		this.tagsComponent = new TagsComponent(
			this.contentArea,
			this.app,
			this.plugin,
			{
				onTaskSelected: (task) => this.handleTaskSelection(task),
				onTaskCompleted: (task) => this.toggleTaskCompletion(task),
				onTaskUpdate: async (originalTask, updatedTask) => {
					await this.handleTaskUpdate(originalTask, updatedTask);
				},
				onTaskContextMenu: (event, task) =>
					this.handleTaskContextMenu(event, task),
			}
		);
		this.addChild(this.tagsComponent);
		this.tagsComponent.load();

		// Initialize ProjectsComponent
		this.projectsComponent = new ProjectsComponent(
			this.contentArea,
			this.app,
			this.plugin,
			{
				onTaskSelected: (task) => this.handleTaskSelection(task),
				onTaskCompleted: (task) => this.toggleTaskCompletion(task),
				onTaskUpdate: async (originalTask, updatedTask) => {
					await this.handleTaskUpdate(originalTask, updatedTask);
				},
				onTaskContextMenu: (event, task) =>
					this.handleTaskContextMenu(event, task),
			}
		);
		this.addChild(this.projectsComponent);
		this.projectsComponent.load();

		// Initialize ReviewComponent
		this.reviewComponent = new ReviewComponent(
			this.contentArea,
			this.app,
			this.plugin,
			{
				onTaskSelected: (task) => this.handleTaskSelection(task),
				onTaskCompleted: (task) => this.toggleTaskCompletion(task),
				onTaskUpdate: async (originalTask, updatedTask) => {
					await this.handleTaskUpdate(originalTask, updatedTask);
				},
				onTaskContextMenu: (event, task) =>
					this.handleTaskContextMenu(event, task),
			}
		);
		this.addChild(this.reviewComponent);
		this.reviewComponent.load();

		// Initialize HabitComponent
		this.habitComponent = new Habit(this.plugin, this.contentArea);
		this.addChild(this.habitComponent);
		this.habitComponent.load();

		// Initialize CalendarComponent
		this.calendarComponent = new CalendarComponent(
			this.app,
			this.plugin,
			this.contentArea,
			this.tasks,
			{
				onTaskSelected: (task: Task | null) =>
					this.handleTaskSelection(task),
				onTaskCompleted: (task: Task) =>
					this.toggleTaskCompletion(task),
				onEventContextMenu: (ev: MouseEvent, event: CalendarEvent) => {
					this.handleTaskContextMenu(ev, event as any);
				},
			}
		);
		this.addChild(this.calendarComponent);

		// Initialize KanbanComponent
		this.kanbanComponent = new KanbanComponent(
			this.app,
			this.plugin,
			this.contentArea,
			this.tasks,
			{
				onTaskStatusUpdate:
					this.handleKanbanTaskStatusUpdate.bind(this),
				onTaskSelected: this.handleTaskSelection.bind(this),
				onTaskCompleted: this.toggleTaskCompletion.bind(this),
				onTaskContextMenu: this.handleTaskContextMenu.bind(this),
			}
		);
		this.addChild(this.kanbanComponent);

		// Initialize GanttComponent
		this.ganttComponent = new GanttComponent(
			this.plugin,
			this.contentArea,
			{
				onTaskSelected: (task: Task) => this.handleTaskSelection(task),
				onTaskCompleted: (task: Task) =>
					this.toggleTaskCompletion(task),
				onTaskContextMenu: (event: MouseEvent, task: Task) =>
					this.handleTaskContextMenu(event, task),
			}
		);
		this.addChild(this.ganttComponent);
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

		// Hide all components initially (force hide all during initialization)
		console.log("[TG-V2] Hiding all components initially");
		this.hideAllComponents(true); // Pass true to force hide all components
		console.log("[TG-V2] initializeViewComponents completed");
	}

	private createSidebarToggle() {
		const headerBtns = this.headerEl?.find(
			".view-header-nav-buttons"
		) as HTMLElement | null;
		if (!headerBtns) {
			console.warn("[TG-V2] header buttons container not found");
			return;
		}
		const container = headerBtns.createDiv({
			cls: "panel-toggle-container",
		});
		this.sidebarToggleBtn = container.createDiv({
			cls: "panel-toggle-btn",
		});
		const btn = new ButtonComponent(this.sidebarToggleBtn);
		btn.setIcon("panel-left-dashed")
			.setTooltip(t("Toggle Sidebar"))
			.setClass("clickable-icon")
			.onClick(() => this.toggleSidebar());
	}

	private toggleSidebar() {
		this.isSidebarCollapsed = !this.isSidebarCollapsed;
		this.sidebar?.setCollapsed(this.isSidebarCollapsed);
		this.rootContainerEl?.toggleClass(
			"v2-sidebar-collapsed",
			this.isSidebarCollapsed
		);
	}

	onResize(): void {
		this.checkAndCollapseSidebar();
	}

	private checkAndCollapseSidebar() {
		// Auto-collapse on narrow panes
		try {
			const width = (this.leaf as any)?.width ?? 0;
			if (width > 0 && width < 768) {
				this.isSidebarCollapsed = true;
				this.sidebar?.setCollapsed(true);
				this.rootContainerEl?.addClass("v2-sidebar-collapsed");
			}
		} catch (_) {}
	}

	private hideAllComponents(forceHideAll: boolean = false) {
		// During initialization, we need to hide all components initially
		// But during view switches, we can be smarter about it
		const isInitialHide = this.isInitializing && forceHideAll;

		if (this.isInitializing && !forceHideAll) {
			// Skip smart hiding during initialization unless forced
			console.log("[TG-V2] Skipping hideAllComponents during initialization (not initial hide)");
			return;
		}

		// Smart hiding - only hide currently visible component (unless initial hide)
		if (!isInitialHide && this.currentVisibleComponent) {
			console.log("[TG-V2] Smart hide - only hiding current visible component");
			this.currentVisibleComponent.containerEl?.hide();
			this.currentVisibleComponent = null;
		} else {
			// Hide all components (during initial setup or when no current visible tracked)
			console.log("[TG-V2] Hiding all components", isInitialHide ? "(initial hide)" : "");
			this.contentComponent?.containerEl.hide();
			this.forecastComponent?.containerEl.hide();
			this.tagsComponent?.containerEl.hide();
			this.projectsComponent?.containerEl.hide();
			this.reviewComponent?.containerEl.hide();
			this.habitComponent?.containerEl.hide();
			this.calendarComponent?.containerEl.hide();
			this.kanbanComponent?.containerEl.hide();
			this.ganttComponent?.containerEl.hide();
			this.viewComponentManager?.hideAllComponents();

			// Hide two column views
			this.twoColumnViewComponents.forEach((component) => {
				component.containerEl.hide();
			});

			// Hide legacy containers
			this.listContainer?.hide();
			this.treeContainer?.hide();
		}
	}

	private async registerDataflowListeners() {
		// Add debounced view update to prevent rapid successive refreshes
		const debouncedViewUpdate = debounce(async () => {
			console.log("[TG-V2] debouncedViewUpdate triggered");
			if (!this.isInitializing) {
				await this.loadTasks(false); // Don't show loading state for updates
				this.scheduleUpdate('dataflow');
				// Refresh top navigation (badge)
				this.topNavigation?.refresh();
				// Also refresh project list when tasks update
				this.sidebar?.projectList?.refresh();
			}
		}, 500);

		// Add debounced filter application
		const debouncedApplyFilter = debounce(() => {
			if (!this.isInitializing) {
				this.scheduleUpdate('filter-changed');
			}
		}, 400);

		// Register dataflow event listeners
		if (
			isDataflowEnabled(this.plugin) &&
			this.plugin.dataflowOrchestrator
		) {
			const { on, Events } = await import("../../dataflow/events/Events");

			// Listen for cache ready event
			this.registerEvent(
				on(this.app, Events.CACHE_READY, async () => {
					await this.loadTasks();
					this.switchView(this.currentViewId);
					// Refresh top navigation (badge) when cache becomes ready
					this.topNavigation?.refresh();
				})
			);

			// Listen for task cache updates
			this.registerEvent(
				on(this.app, Events.TASK_CACHE_UPDATED, debouncedViewUpdate)
			);
		} else {
			// Legacy event support
			this.registerEvent(
				this.app.workspace.on(
					"task-genius:task-cache-updated",
					debouncedViewUpdate
				)
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
							"[TaskViewV2] Filter changed from live component"
						);
						this.liveFilterState = filterState;
						this.currentFilterState = filterState;
					} else if (!leafId) {
						// No leafId means it's also a live filter change
						console.log("[TaskViewV2] Filter changed (no leafId)");
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
							"[TaskViewV2] Failed to sync selectedProject from filter state",
							e
						);
					}

					// Persist and update header UI
					this.saveFilterStateToWorkspace();
					this.updateActionButtons();

					// Apply filters with debouncing
					debouncedApplyFilter();
				}
			)
		);
	}

	private async loadTasks(showLoading: boolean = true) {
		try {
			console.log("[TG-V2] loadTasks started, showLoading:", showLoading);
			// Only show loading state if requested, not initializing, and we don't have tasks
			if (showLoading && !this.isInitializing && (!this.tasks || this.tasks.length === 0)) {
				console.log("[TG-V2] Setting isLoading to true");
				this.isLoading = true;
				this.loadError = null;
				this.renderLoadingState(); // Directly show loading state
			}

			if (this.plugin.dataflowOrchestrator) {
				console.log(
					"[TG-V2] Using dataflow orchestrator to load tasks"
				);
				const queryAPI = this.plugin.dataflowOrchestrator.getQueryAPI();
				console.log("[TG-V2] Getting all tasks from queryAPI...");
				this.tasks = await queryAPI.getAllTasks();
				console.log(
					`[TG-V2] Loaded ${this.tasks.length} tasks from dataflow`
				);
			} else {
				console.log(
					"[TG-V2] Dataflow not available, using preloaded tasks"
				);
				this.tasks = this.plugin.preloadedTasks || [];
				console.log(
					`[TG-V2] Loaded ${this.tasks.length} preloaded tasks`
				);
			}

			// Only apply filters if not initializing (during init, filters are applied after loadTasks)
			if (!this.isInitializing) {
				console.log("[TG-V2] Calling applyFilters from loadTasks");
				this.applyFilters();
				console.log(
					`[TG-V2] After filtering: ${this.filteredTasks.length} tasks`
				);
			} else {
				console.log("[TG-V2] Skipping filters during initialization");
			}
		} catch (error) {
			console.error("[TG-V2] Failed to load tasks:", error);
			this.loadError = error.message || "Failed to load tasks";
			this.tasks = [];
			this.filteredTasks = [];
			this.isLoading = false;
		} finally {
			// Always set loading to false
			console.log(
				"[TG-V2] loadTasks finally block, isLoading was:",
				this.isLoading
			);
			if (this.isLoading) {
				this.isLoading = false;
				console.log("[TG-V2] Set isLoading to false");
			}
			// Don't call updateView here - it will be called by switchView
			// this.updateView();
			// Refresh sidebar project list with new data
			if (this.sidebar?.projectList) {
				console.log("[TG-V2] Refreshing project list");
				this.sidebar.projectList.refresh();
			}
		}
	}

	private applyFilters() {
		// Use the centralized filterTasks utility
		const filterOptions: any = {
			textQuery:
				this.filterInputEl?.value || this.viewState.searchQuery || "",
		};

		// Apply advanced filters from the filter popover/modal
		if (
			this.currentFilterState &&
			this.currentFilterState.filterGroups &&
			this.currentFilterState.filterGroups.length > 0
		) {
			console.log("[TaskViewV2] Applying advanced filters");
			filterOptions.advancedFilter = this.currentFilterState;
		}

		// If there are additional V2-specific filters from the filter panel, pass them
		if (
			this.viewState.filters &&
			Object.keys(this.viewState.filters).length > 0
		) {
			// Convert V2 filter format to RootFilterState format if needed
			// For now, keep the simple filtering logic
			filterOptions.v2Filters = this.viewState.filters;
		}

		// B: 全局项目筛选 - 如果存在选中的项目，将其并入 v2Filters
		// Skip project filter for Inbox view (Inbox tasks don't have projects by definition)
		if (this.viewState.selectedProject && this.currentViewId !== "inbox") {
			filterOptions.v2Filters = {
				...(filterOptions.v2Filters || {}),
				project: this.viewState.selectedProject,
			};
		}

		// Use the existing filterTasks utility which handles all view-specific logic
		// The filterTasks utility already handles:
		// - inbox: tasks without projects
		// - today: tasks due today
		// - upcoming: tasks due in next 7 days
		// - flagged: high priority tasks (priority >= 3)
		// - Other views: handled by their specific filter configurations
		this.filteredTasks = filterTasks(
			this.tasks,
			this.currentViewId as any,
			this.plugin,
			filterOptions
		);

		// Apply additional V2-specific filters if needed
		if (filterOptions.v2Filters) {
			const filters = filterOptions.v2Filters as any;

			// Status filter
			if (filters.status && filters.status !== "all") {
				switch (filters.status) {
					case "active":
						this.filteredTasks = this.filteredTasks.filter(
							(task) => !task.completed
						);
						break;
					case "completed":
						this.filteredTasks = this.filteredTasks.filter(
							(task) => task.completed
						);
						break;
					case "overdue":
						this.filteredTasks = this.filteredTasks.filter(
							(task) => {
								if (task.completed || !task.metadata?.dueDate)
									return false;
								return (
									new Date(task.metadata.dueDate) < new Date()
								);
							}
						);
						break;
				}
			}

			// Priority filter
			if (filters.priority && filters.priority !== "all") {
				this.filteredTasks = this.filteredTasks.filter((task) => {
					const taskPriority = task.metadata?.priority || 0;
					const filterPriority =
						typeof filters.priority === "string"
							? parseInt(filters.priority)
							: filters.priority;
					return taskPriority === filterPriority;
				});
			}

			// Project filter - Skip for Inbox view (Inbox tasks don't have projects)
			if (filters.project && this.currentViewId !== "inbox") {
				this.filteredTasks = this.filteredTasks.filter(
					(task) => task.metadata?.project === filters.project
				);
			}

			// Tags filter
			if (filters.tags && filters.tags.length > 0) {
				this.filteredTasks = this.filteredTasks.filter((task) => {
					if (!task.metadata?.tags) return false;
					return filters.tags!.some((tag: string) =>
						task.metadata!.tags!.includes(tag)
					);
				});
			}

			// Date range filter
			if (filters.dateRange) {
				if (filters.dateRange.start) {
					this.filteredTasks = this.filteredTasks.filter((task) => {
						if (!task.metadata?.dueDate) return false;
						return (
							new Date(task.metadata.dueDate) >=
							filters.dateRange!.start!
						);
					});
				}
				if (filters.dateRange.end) {
					this.filteredTasks = this.filteredTasks.filter((task) => {
						if (!task.metadata?.dueDate) return false;
						return (
							new Date(task.metadata.dueDate) <=
							filters.dateRange!.end!
						);
					});
				}
			}

			// Assignee filter
			if (filters.assignee) {
				this.filteredTasks = this.filteredTasks.filter(
					(task) => task.metadata?.assignee === filters.assignee
				);
			}
		}

		// Update task count
		if (this.taskCountEl) {
			this.taskCountEl.setText(
				`${this.filteredTasks.length} ${t("tasks")}`
			);
		}

		// Filter panel is now handled in Obsidian view header
		// No need to update here
	}

	private switchView(viewId: string, project?: string | null) {
		console.log(
			"[TG-V2] switchView called with:",
			viewId,
			"project:",
			project,
			"isInitializing:",
			this.isInitializing
		);

		// Skip if we're switching to the same view (but never skip during initialization)
		if (!this.isInitializing && this.currentViewId === viewId && !project && this.filteredTasks.length > 0) {
			console.log("[TG-V2] Already on this view with data, skipping switchView");
			return;
		}

		this.currentViewId = viewId;
		this.sidebar?.setActiveItem(viewId);

		// Update available view modes for the current view
		const availableModes = this.getAvailableModesForView(viewId);
		this.topNavigation?.updateAvailableModes(availableModes);
		console.log(
			"[TG-V2] Current tasks:",
			this.tasks.length,
			"Current viewMode:",
			this.viewState.viewMode
		);

		// Update content header title based on view
		if (this.contentTitleEl) {
			const viewTitles: Record<string, string> = {
				inbox: t("Inbox"),
				today: t("Today"),
				upcoming: t("Upcoming"),
				flagged: t("Flagged"),
				forecast: t("Forecast"),
				projects: t("Projects"),
				tags: t("Tags"),
				review: t("Review"),
				habit: t("Habit"),
				calendar: t("Calendar"),
				kanban: t("Kanban"),
				gantt: t("Gantt"),
			};
			this.contentTitleEl.setText(t(viewTitles[viewId] || "Tasks"));
		}

		// Remove transient overlays (loading/error/empty) before showing components
		if (this.contentArea) {
			this.contentArea
				.querySelectorAll(
					".tg-v2-loading, .tg-v2-error-state, .tg-v2-empty-state"
				)
				.forEach((el) => el.remove());
		}

		// Hide all components first
		console.log("[TG-V2] Hiding all components");
		this.hideAllComponents();

		// Check if current view supports multiple view modes and we're in a non-list mode
		// For initial load with list mode, continue with normal flow
		const viewModes = this.getAvailableModesForView(viewId);

		// If the current view mode is not available for this view, reset to first available or list
		if (
			viewModes.length > 0 &&
			!viewModes.includes(this.viewState.viewMode)
		) {
			this.viewState.viewMode = viewModes[0];
			// Update TopNavigation to reflect the change
			if (this.topNavigation) {
				// The updateAvailableModes call above should handle this
			}
		}

		console.log(
			"[TG-V2] Is content-based view?",
			this.isContentBasedView(viewId),
			"View mode:",
			this.viewState.viewMode,
			"Available modes:",
			viewModes
		);
		if (
			this.isContentBasedView(viewId) &&
			viewModes.length > 0 &&
			this.viewState.viewMode !== "list" &&
			this.viewState.viewMode !== "tree" // Tree is also handled by ContentComponent
		) {
			// For content-based views in kanban/calendar mode, use special rendering
			console.log(
				"[TG-V2] Using renderContentWithViewMode for non-list/tree mode:",
				this.viewState.viewMode
			);
			// Filters should already be applied before reaching here
			console.log(
				"[TG-V2] Rendering content with view mode, filters already applied"
			);
			this.renderContentWithViewMode();
			return;
		}

		// Get view configuration to check for specific view types
		const viewConfig = getViewSettingOrDefault(this.plugin, viewId as any);

		let targetComponent: any = null;
		let modeForComponent: string = viewId;

		// Handle TwoColumn views
		if (viewConfig.specificConfig?.viewType === "twocolumn") {
			// Get or create TwoColumnView component
			if (!this.twoColumnViewComponents.has(viewId)) {
				const twoColumnConfig =
					viewConfig.specificConfig as TwoColumnSpecificConfig;
				const twoColumnComponent = new TaskPropertyTwoColumnView(
					this.contentArea,
					this.app,
					this.plugin,
					twoColumnConfig,
					viewId
				);
				this.addChild(twoColumnComponent);

				// Set up event handlers
				twoColumnComponent.onTaskSelected = (task) =>
					this.handleTaskSelection(task);
				twoColumnComponent.onTaskCompleted = (task) =>
					this.toggleTaskCompletion(task);
				twoColumnComponent.onTaskContextMenu = (event, task) =>
					this.handleTaskContextMenu(event, task);

				// Store for later use
				this.twoColumnViewComponents.set(viewId, twoColumnComponent);
			}

			targetComponent = this.twoColumnViewComponents.get(viewId);
		} else {
			// Check special view types
			const specificViewType = viewConfig.specificConfig?.viewType;

			// Check if it's a special view managed by ViewComponentManager
			if (this.viewComponentManager.isSpecialView(viewId)) {
				targetComponent =
					this.viewComponentManager.showComponent(viewId);
			} else if (
				specificViewType === "forecast" ||
				viewId === "forecast"
			) {
				targetComponent = this.forecastComponent;
			} else {
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

		console.log(
			"[TG-V2] Target component determined:",
			targetComponent?.constructor?.name
		);

		if (targetComponent) {
			console.log(
				`[TG-V2] Activating component for view ${viewId}:`,
				targetComponent.constructor.name,
				"Container exists:",
				!!targetComponent.containerEl,
				"Current display:",
				targetComponent.containerEl?.style?.display
			);
			targetComponent.containerEl.show();
			this.currentVisibleComponent = targetComponent; // Track visible component
			console.log(
				"[TG-V2] After show, display:",
				targetComponent.containerEl?.style?.display
			);

			// Set view mode first for ContentComponent
			if (typeof targetComponent.setViewMode === "function") {
				console.log(
					`[TG-V2] Setting view mode for ${viewId} to ${modeForComponent} with project ${project}`
				);
				targetComponent.setViewMode(modeForComponent as any, project);
			}

			// Apply filters only if needed (not during initialization as they're already applied)
			if (!this.isInitializing && (this.filteredTasks.length === 0 || project)) {
				console.log("[TG-V2] Applying filters in switchView");
				this.applyFilters();
				console.log(
					"[TG-V2] After applyFilters, filtered tasks:",
					this.filteredTasks.length
				);
			} else {
				console.log(
					"[TG-V2] Skipping filter application, already have filtered tasks:",
					this.filteredTasks.length
				);
			}

			// Set tasks on the component
			if (typeof targetComponent.setTasks === "function") {
				// Special handling for components that need only all tasks (single parameter)
				if (viewId === "review" || viewId === "tags") {
					console.log(
						`[TG-V2] Calling setTasks for ${viewId} with ALL tasks (unfiltered):`,
						this.tasks.length,
						"tasks, first few:",
						this.tasks.slice(0, 3).map(t => ({ id: t.id, project: t.metadata?.project }))
					);
					// ReviewComponent and TagsComponent need all tasks to build their lists
					// and only accept a single parameter
					targetComponent.setTasks(this.tasks);
				} else {
					// Use already computed filteredTasks from applyFilters() so text search,
					// project selection, and advanced filters are consistently applied
					let filteredTasksLocal = [...this.filteredTasks];
					// Forecast view: remove badge-only items
					if (viewId === "forecast") {
						filteredTasksLocal = filteredTasksLocal.filter(
							(task) => !(task as any).badge
						);
					}
					console.log(
						"[TG-V2] Calling setTasks with filtered:",
						filteredTasksLocal.length,
						"all:",
						this.tasks.length
					);
					// ContentComponent and others expect (filtered, all) parameters
					// Note: "projects" view uses ContentComponent, not ProjectsComponent
					targetComponent.setTasks(filteredTasksLocal, this.tasks);
				}
				console.log("[TG-V2] setTasks completed");
			}

			// Handle updateTasks method for table view adapter
			if (typeof targetComponent.updateTasks === "function") {
				const filterOptions: any = {};
				if (
					this.currentFilterState &&
					this.currentFilterState.filterGroups &&
					this.currentFilterState.filterGroups.length > 0
				) {
					filterOptions.advancedFilter = this.currentFilterState;
				}

				targetComponent.updateTasks(
					filterTasks(
						this.tasks,
						viewId as any,
						this.plugin,
						filterOptions
					)
				);
			}

			// View mode already set above

			// Handle two column views separately
			this.twoColumnViewComponents.forEach((component) => {
				if (
					component &&
					typeof component.setTasks === "function" &&
					component.getViewId() === viewId
				) {
					const filterOptions: any = {};
					if (
						this.currentFilterState &&
						this.currentFilterState.filterGroups &&
						this.currentFilterState.filterGroups.length > 0
					) {
						filterOptions.advancedFilter = this.currentFilterState;
					}

					let filteredTasks = filterTasks(
						this.tasks,
						component.getViewId() as any,
						this.plugin,
						filterOptions
					);

					// Filter out badge tasks for forecast view
					if (component.getViewId() === "forecast") {
						filteredTasks = filteredTasks.filter(
							(task) => !(task as any).badge
						);
					}

					component.setTasks(filteredTasks);
				}
			});

			// Refresh review settings if needed
			if (
				viewId === "review" &&
				typeof targetComponent.refreshReviewSettings === "function"
			) {
				targetComponent.refreshReviewSettings();
			}
		} else {
			console.warn(
				`[TG-V2] No target component found for viewId: ${viewId}`
			);
		}

		// Clear task selection
		console.log("[TG-V2] Clearing task selection");
		this.handleTaskSelection(null);
		console.log("[TG-V2] switchView completed");
	}

	private isContentBasedView(viewId: string): boolean {
		// These views support multiple view modes (list/kanban/calendar/tree)
		// Include 'projects' so top view tabs work inside Projects with global filters
		const contentBasedViews = [
			"inbox",
			"today",
			"upcoming",
			"flagged",
			"projects",
		];
		return contentBasedViews.includes(viewId);
	}

	private renderContentWithViewMode() {
		console.log(
			"[TG-V2] renderContentWithViewMode called, viewMode:",
			this.viewState.viewMode
		);
		// Hide current component (not all)
		this.hideAllComponents();

		// Don't apply filters here - they should already be applied
		// Filters are applied in switchView before calling this method
		console.log(
			"[TG-V2] Using existing filtered tasks:",
			this.filteredTasks.length
		);

		// Based on the current view mode, show the appropriate component
		switch (this.viewState.viewMode) {
			case "list":
			case "tree":
				// Use ContentComponent for list and tree views
				if (!this.contentComponent) return;

				this.contentComponent.containerEl.show();
				this.contentComponent.setViewMode(this.currentViewId as any);
				this.contentComponent.setIsTreeView(
					this.viewState.viewMode === "tree"
				);

				// Set filtered tasks
				// Use the already filtered tasks instead of filtering again
				// this.filteredTasks should already be set by applyFilters in switchView
				console.log(
					"[TG-V2] Setting tasks to ContentComponent, filtered:",
					this.filteredTasks.length
				);
				this.contentComponent.setTasks(this.filteredTasks, this.tasks);
				this.currentActiveComponent = this.contentComponent;
				this.currentVisibleComponent = this.contentComponent;
				break;

			case "kanban":
				// Use KanbanComponent
				if (!this.kanbanComponent) return;

				this.kanbanComponent.containerEl.show();

				// Use already filtered tasks
				console.log(
					"[TG-V2] Setting",
					this.filteredTasks.length,
					"tasks to kanban"
				);
				this.kanbanComponent.setTasks(this.filteredTasks);
				this.currentActiveComponent = this.kanbanComponent;
				this.currentVisibleComponent = this.kanbanComponent;
				break;

			case "calendar":
				// Use CalendarComponent
				console.log(
					"[TG-V2] Calendar mode in renderContentWithViewMode"
				);
				if (!this.calendarComponent) {
					console.log("[TG-V2] No calendar component available!");
					return;
				}

				console.log("[TG-V2] Showing calendar component");
				this.calendarComponent.containerEl.show();

				// Use already filtered tasks
				console.log(
					"[TG-V2] Setting",
					this.filteredTasks.length,
					"tasks to calendar"
				);
				this.calendarComponent.setTasks(this.filteredTasks);
				this.currentActiveComponent = this.calendarComponent;
				this.currentVisibleComponent = this.calendarComponent;
				console.log("[TG-V2] Calendar mode setup complete");
				break;
		}

		// Update task count
		if (this.taskCountEl) {
			this.taskCountEl.setText(
				`${this.filteredTasks.length} ${t("tasks")}`
			);
		}

		console.log("[TG-V2] renderContentWithViewMode completed");
	}

	private renderContent() {
		// This method is now mainly used for legacy view mode switching
		// The new switchView method handles most of the component switching

		// For view mode changes (list/kanban/tree/calendar), switch to the appropriate view
		switch (this.viewState.viewMode) {
			case "list":
				// Use content component for list view
				if (
					["inbox", "today", "upcoming", "flagged"].includes(
						this.currentViewId
					)
				) {
					this.switchView(this.currentViewId);
				} else {
					this.renderListView(); // Fall back to legacy list view
				}
				break;
			case "kanban":
				this.switchView("kanban");
				break;
			case "tree":
				this.renderTreeView(); // Use legacy tree view for now
				break;
			case "calendar":
				this.switchView("calendar");
				break;
		}
	}

	private renderListView() {
		// Clear current content
		this.clearCurrentView();

		// Show list container
		if (this.listContainer) {
			this.listContainer.style.display = "block";
			this.listContainer.empty();

			// Create list wrapper
			const listWrapper = this.listContainer.createDiv({
				cls: "task-list-wrapper",
			});

			// Render each task using TaskListItemComponent
			this.filteredTasks.forEach((task, index) => {
				const itemEl = listWrapper.createDiv({
					cls: "task-list-item",
				});

				const listItem = new TaskListItemComponent(
					task,
					this.currentViewId,
					this.app,
					this.plugin
				);

				// Set up event handlers
				listItem.onTaskSelected = (task) =>
					this.handleTaskSelection(task);
				listItem.onTaskCompleted = (task) =>
					this.toggleTaskCompletion(task);
				listItem.onTaskUpdate = async (originalTask, updatedTask) => {
					await this.handleTaskUpdate(originalTask, updatedTask);
				};
				listItem.onTaskContextMenu = (event, task) => {
					this.handleTaskContextMenu(event, task);
				};

				// Mount the component to the element
				itemEl.appendChild(listItem.element);
			});

			if (this.filteredTasks.length === 0) {
				listWrapper.createDiv({
					cls: "task-list-empty",
					text: t("No tasks to display"),
				});
			}
		}
	}

	private renderTreeView() {
		// Clear current content
		this.clearCurrentView();

		// Show tree container
		if (this.treeContainer) {
			this.treeContainer.style.display = "block";
			this.treeContainer.empty();

			// Create tree wrapper
			const treeWrapper = this.treeContainer.createDiv({
				cls: "task-tree-wrapper",
			});

			// Organize tasks by project hierarchy
			const tasksByProject = this.organizeTasksByProject(
				this.filteredTasks
			);

			// Render each project group
			for (const [projectPath, projectTasks] of tasksByProject) {
				const projectEl = treeWrapper.createDiv({
					cls: "task-tree-project",
				});

				// Create project header
				const headerEl = projectEl.createDiv({
					cls: "task-tree-project-header",
					text: projectPath || t("No Project"),
				});

				// Render tasks in this project
				const tasksEl = projectEl.createDiv({
					cls: "task-tree-tasks",
				});

				projectTasks.forEach((task, index) => {
					const itemEl = tasksEl.createDiv({
						cls: "task-tree-item",
					});

					// Create task map for tree view
					const taskMap = new Map<string, Task>();
					this.tasks.forEach((t) => taskMap.set(t.id, t));

					const treeItem = new TaskTreeItemComponent(
						task,
						this.currentViewId,
						this.app,
						0, // indentLevel
						(task.metadata?.children
							?.map((childId) => taskMap.get(childId))
							.filter(Boolean) as Task[]) || [], // childTasks
						taskMap,
						this.plugin
					);

					// Set up event handlers
					treeItem.onTaskSelected = (task) =>
						this.handleTaskSelection(task);
					treeItem.onTaskCompleted = (task) =>
						this.toggleTaskCompletion(task);
					treeItem.onTaskUpdate = async (
						originalTask,
						updatedTask
					) => {
						await this.handleTaskUpdate(originalTask, updatedTask);
					};
					treeItem.onTaskContextMenu = (event, task) => {
						this.handleTaskContextMenu(event, task);
					};

					// Mount the component to the element
					itemEl.appendChild(treeItem.element);
				});
			}

			if (this.filteredTasks.length === 0) {
				treeWrapper.createDiv({
					cls: "task-tree-empty",
					text: t("No tasks to display"),
				});
			}
		}
	}

	// Helper methods
	private clearCurrentView() {
		// Hide all view containers
		if (this.listContainer) this.listContainer.style.display = "none";
		if (this.treeContainer) this.treeContainer.style.display = "none";
		if (this.kanbanComponent) this.kanbanComponent.containerEl.hide();
		if (this.calendarComponent) this.calendarComponent.containerEl.hide();
	}

	private updateView() {
		// Schedule an update instead of immediately updating
		if (!this.isInitializing) {
			this.scheduleUpdate('updateView');
		}
	}

	private refreshCurrentViewData() {
		const viewId = this.currentViewId;
		// Update top badges and projects minimally
		this.topNavigation?.refresh?.();
		this.sidebar?.projectList?.refresh?.();
		// Content-based views (list/tree/kanban/calendar under inbox/today/upcoming/flagged/projects)
		if (this.isContentBasedView(viewId)) {
			switch (this.viewState.viewMode) {
				case "kanban":
					this.kanbanComponent?.setTasks?.(this.filteredTasks);
					break;
				case "calendar":
					this.calendarComponent?.setTasks?.(this.filteredTasks);
					break;
				case "tree":
				case "list":
				default:
					// ContentComponent expects (filtered, all)
					this.contentComponent?.setTasks?.(
						this.filteredTasks,
						this.tasks,
						true
					);
					break;
			}
			return;
		}

		// Special/other views
		if (this.viewComponentManager?.isSpecialView(viewId)) {
			const comp: any = (
				this.viewComponentManager as any
			).getOrCreateComponent(viewId);
			if (comp?.updateTasks) {
				comp.updateTasks(this.filteredTasks);
			} else if (comp?.setTasks) {
				comp.setTasks(this.filteredTasks, this.tasks);
			}
			return;
		}

		// Direct known components fallback
		const mapping: Record<string, any> = {
			forecast: this.forecastComponent,
			tags: this.tagsComponent,
			projects: this.contentComponent,
			review: this.reviewComponent,
			habit: this.habitComponent,
			gantt: this.ganttComponent,
			kanban: this.kanbanComponent,
			calendar: this.calendarComponent,
		};
		const target: any = (mapping as any)[viewId];
		if (target?.setTasks) {
			if (viewId === "projects" || this.isContentBasedView(viewId)) {
				// ContentComponent expects (filtered, all, forceRefresh)
				target.setTasks(this.filteredTasks, this.tasks, true);
			} else if (viewId === "review" || viewId === "tags") {
				// ReviewComponent and TagsComponent need all tasks
				target.setTasks(this.tasks);
			} else {
				// Other components use filtered tasks
				target.setTasks(this.filteredTasks);
			}
		} else if (target?.updateTasks) {
			target.updateTasks(this.filteredTasks);
		}
	}

	private renderLoadingState() {
		console.log("[TG-V2] renderLoadingState called");
		this.clearCurrentView();
		if (this.contentArea) {
			console.log("[TG-V2] Preparing content area for loading state");
			// Do not empty content area to avoid destroying components; just overlay
			// Remove existing loading overlays
			this.contentArea
				.querySelectorAll(".tg-v2-loading")
				.forEach((el) => el.remove());

			const loadingEl = this.contentArea.createDiv({
				cls: "tg-v2-loading",
			});
			loadingEl.createDiv({ cls: "tg-v2-spinner" });
			loadingEl.createDiv({
				cls: "tg-v2-loading-text",
				text: t("Loading tasks..."),
			});
		}
	}

	private renderErrorState() {
		this.clearCurrentView();
		if (this.contentArea) {
			// Do not empty content area; overlay error UI
			this.contentArea
				.querySelectorAll(".tg-v2-error-state")
				.forEach((el) => el.remove());

			const errorEl = this.contentArea.createDiv({
				cls: "tg-v2-error-state",
			});
			const errorIcon = errorEl.createDiv({ cls: "tg-v2-error-icon" });
			setIcon(errorIcon, "alert-triangle");

			errorEl.createDiv({
				cls: "tg-v2-error-title",
				text: t("Failed to load tasks"),
			});

			errorEl.createDiv({
				cls: "tg-v2-error-message",
				text: this.loadError || t("An unexpected error occurred"),
			});

			const retryBtn = errorEl.createEl("button", {
				cls: "tg-v2-button tg-v2-button-primary",
				text: t("Retry"),
			});

			retryBtn.addEventListener("click", () => {
				this.loadError = null;
				this.loadTasks();
			});
		}
	}

	private renderEmptyState() {
		this.clearCurrentView();
		if (this.contentArea) {
			// Do not empty content area; overlay empty UI
			this.contentArea
				.querySelectorAll(".tg-v2-empty-state")
				.forEach((el) => el.remove());

			const emptyEl = this.contentArea.createDiv({
				cls: "tg-v2-empty-state",
			});
			const emptyIcon = emptyEl.createDiv({ cls: "tg-v2-empty-icon" });
			setIcon(emptyIcon, "inbox");

			emptyEl.createDiv({
				cls: "tg-v2-empty-title",
				text: t("No tasks yet"),
			});

			emptyEl.createDiv({
				cls: "tg-v2-empty-description",
				text: t(
					"Create your first task to get started with Task Genius"
				),
			});

			const createBtn = emptyEl.createEl("button", {
				cls: "tg-v2-button tg-v2-button-primary",
				text: t("Create Task"),
			});

			createBtn.addEventListener("click", () => {
				new QuickCaptureModal(this.app, this.plugin).open();
			});
		}
	}

	private organizeTasksByProject(tasks: Task[]): Map<string, Task[]> {
		const tasksByProject = new Map<string, Task[]>();

		tasks.forEach((task) => {
			const projectPath = task.metadata?.project || "";
			if (!tasksByProject.has(projectPath)) {
				tasksByProject.set(projectPath, []);
			}
			tasksByProject.get(projectPath)!.push(task);
		});

		// Sort projects alphabetically
		return new Map(
			[...tasksByProject.entries()].sort(([a], [b]) => a.localeCompare(b))
		);
	}

	// Project calculation methods
	private calculateProjectStats(tasks: Task[]) {
		const projectsMap = this.organizeTasksByProject(tasks);
		const totalProjects = projectsMap.size;
		let totalTasks = 0;
		let completedTasks = 0;

		for (const projectTasks of projectsMap.values()) {
			totalTasks += projectTasks.length;
			completedTasks += projectTasks.filter((t) => t.completed).length;
		}

		return {
			totalProjects,
			totalTasks,
			completedTasks,
			completionRate:
				totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
		};
	}

	private getProjectProgress(projectPath: string) {
		const projectTasks = this.tasks.filter(
			(t) => t.metadata?.project === projectPath
		);
		const completed = projectTasks.filter((t) => t.completed).length;
		const total = projectTasks.length;
		const percentage = total > 0 ? (completed / total) * 100 : 0;

		return { completed, total, percentage };
	}

	// Workspace management
	private saveWorkspaceLayout() {
		// Save filter state which includes view preferences
		this.saveFilterStateToWorkspace();

		// Save current workspace ID to localStorage for persistence
		localStorage.setItem(
			"task-genius-v2-current-workspace",
			this.viewState.currentWorkspace
		);
	}

	private loadWorkspaceLayout() {
		// Load current workspace from localStorage
		const savedCurrentWorkspace = localStorage.getItem(
			"task-genius-v2-current-workspace"
		);
		if (savedCurrentWorkspace) {
			this.viewState.currentWorkspace = savedCurrentWorkspace;
			this.workspaceId = savedCurrentWorkspace;
		}

		// Restore filter state which includes view preferences
		this.restoreFilterStateFromWorkspace();
	}

	private async applyWorkspaceSettings() {
		if (!this.plugin.workspaceManager || !this.workspaceId) return;

		const settings = this.plugin.workspaceManager.getEffectiveSettings(
			this.workspaceId
		);

		// Workspace settings are now restored via restoreFilterStateFromWorkspace
		// This method is kept for future workspace-specific settings that are not filter-related
	}

	private switchWorkspace(workspaceId: string) {
		// Save current workspace before switching
		this.saveWorkspaceLayout();

		// Update workspace ID
		this.viewState.currentWorkspace = workspaceId;
		this.workspaceId = workspaceId;

		// Restore filter state from new workspace
		this.restoreFilterStateFromWorkspace();

		// Apply filters and update view
		this.applyFilters();
		this.updateView();

		// Update UI to reflect workspace change
		if (this.sidebar) {
			// Update sidebar workspace selection if needed
			const workspace =
				this.plugin.workspaceManager?.getWorkspace(workspaceId);
			if (workspace) {
				this.sidebar.updateWorkspace(workspace);
			}
		}
	}

	// Event handlers
	private handleNavigate(viewId: string) {
		if (viewId === "new-task") {
			new QuickCaptureModal(this.app, this.plugin).open();
		} else {
			console.log(`[TG-V2] handleNavigate to ${viewId}, current tasks:`, this.tasks.length);
			this.switchView(viewId);
		}
	}

	private handleSearch(query: string) {
		this.viewState.searchQuery = query;
		this.scheduleUpdate('search');
		// Persist and update header UI
		this.saveFilterStateToWorkspace();
		this.updateActionButtons();
	}

	private handleViewModeChange(mode: ViewMode) {
		// Only change if the mode is available for the current view
		const availableModes = this.getAvailableModesForView(
			this.currentViewId
		);
		if (availableModes.includes(mode)) {
			this.viewState.viewMode = mode;
			this.renderContentWithViewMode();
		}
	}

	private handleSettingsClick() {
		// Open Obsidian settings and navigate to the plugin tab
		this.app.setting.open();
		this.app.setting.openTabById(this.plugin.manifest.id);
	}

	private createActionButtons() {
		// Details toggle button
		this.detailsToggleBtn = this.addAction(
			"panel-right-dashed",
			t("Details"),
			() => {
				this.toggleDetailsVisibility(!this.isDetailsVisible);
			}
		);

		this.detailsToggleBtn.toggleClass("panel-toggle-btn", true);
		this.detailsToggleBtn.toggleClass("is-active", this.isDetailsVisible);

		// Capture button
		this.addAction("notebook-pen", t("Capture"), () => {
			const modal = new QuickCaptureModal(
				this.app,
				this.plugin,
				{},
				true
			);
			modal.open();
		});

		// Filter button
		this.addAction("filter", t("Filter"), (e) => {
			if (Platform.isDesktop) {
				const popover = new ViewTaskFilterPopover(
					this.app,
					undefined,
					this.plugin
				);

				// Set up filter state when opening
				this.app.workspace.onLayoutReady(() => {
					setTimeout(() => {
						if (
							this.liveFilterState &&
							popover.taskFilterComponent
						) {
							const filterState = this
								.liveFilterState as RootFilterState;
							popover.taskFilterComponent.loadFilterState(
								filterState
							);
						}
					}, 100);
				});

				popover.showAtPosition({ x: e.clientX, y: e.clientY });
			} else {
				const modal = new ViewTaskFilterModal(
					this.app,
					this.leaf.id,
					this.plugin
				);

				modal.open();

				// Set initial filter state
				if (this.liveFilterState && modal.taskFilterComponent) {
					setTimeout(() => {
						const filterState = this
							.liveFilterState as RootFilterState;
						modal.taskFilterComponent.loadFilterState(filterState);
					}, 100);
				}
			}
		});

		// Update action buttons visibility
		this.updateActionButtons();
	}

	private updateActionButtons() {
		// Remove reset filter button if exists
		const resetButton = this.containerEl.querySelector(
			".view-action.task-filter-reset"
		);
		if (resetButton) {
			resetButton.remove();
		}

		// Add reset filter button if there are active filters
		if (
			this.liveFilterState &&
			this.liveFilterState.filterGroups &&
			this.liveFilterState.filterGroups.length > 0
		) {
			this.addAction("reset", t("Reset Filter"), () => {
				this.resetCurrentFilter();
			}).addClass("task-filter-reset");
		}
	}

	private toggleDetailsVisibility(visible: boolean) {
		this.isDetailsVisible = visible;
		this.rootContainerEl?.toggleClass("details-visible", visible);
		this.rootContainerEl?.toggleClass("details-hidden", !visible);
		if (this.detailsComponent) {
			this.detailsComponent.setVisible(visible);
		}
		if (this.detailsToggleBtn) {
			this.detailsToggleBtn.toggleClass("is-active", visible);
			this.detailsToggleBtn.setAttribute(
				"aria-label",
				visible ? t("Hide Details") : t("Show Details")
			);
		}
	}

	private resetCurrentFilter() {
		console.log("[TaskViewV2] Resetting filter");
		this.liveFilterState = null;
		this.currentFilterState = null;

		this.viewState.selectedProject = undefined; // keep project state in sync when clearing via UI
		this.app.saveLocalStorage("task-genius-view-filter", null);
		this.applyFilters();
		this.updateView();
		this.updateActionButtons();
	}

	private async handleWorkspaceChange(workspaceId: string) {
		if (!this.plugin.workspaceManager) return;

		// Save to workspace manager
		await this.plugin.workspaceManager.setActiveWorkspace(workspaceId);

		// Update local state
		this.workspaceId = workspaceId;
		this.viewState.currentWorkspace = workspaceId;

		// Update sidebar
		this.sidebar?.updateWorkspace(workspaceId);

		// Apply workspace settings and reload
		await this.applyWorkspaceSettings();
		await this.loadTasks();

		// Refresh current view
		this.switchView(this.currentViewId);
		this.topNavigation?.refresh();
	}

	private handleProjectSelect(projectId: string) {
		console.log(`[TaskViewV2] Project selected: ${projectId}`);
		this.viewState.selectedProject = projectId;

		// 1) Reflect selection into the Filter UI state so the top Filter button shows active and can be reset via "X"
		try {
			const timestamp = Date.now();
			const nextState = this.liveFilterState || {
				rootCondition: "all",
				filterGroups: [],
			};

			// Remove any existing project filters to avoid duplicates
			nextState.filterGroups = (nextState.filterGroups || []).map(
				(g: any) => ({
					...g,
					filters: (g.filters || []).filter(
						(f: any) => f.property !== "project"
					),
				})
			);
			// Append a dedicated group for project filter to enforce AND semantics
			nextState.filterGroups.push({
				id: `v2-proj-group-${timestamp}`,
				groupCondition: "all",
				filters: [
					{
						id: `v2-proj-filter-${timestamp}`,
						property: "project",
						condition: "is",
						value: projectId,
					},
				],
			});
			this.liveFilterState = nextState as any;
			this.currentFilterState = nextState as any;
			this.app.saveLocalStorage("task-genius-view-filter", nextState);
			// Broadcast so any open filter UI reacts and header button shows reset
			this.app.workspace.trigger("task-genius:filter-changed", nextState);
			this.updateActionButtons();
		} catch (e) {
			console.warn(
				"[TaskViewV2] Failed to project-sync filter UI state",
				e
			);
		}

		// 2) Switch to projects view (existing behavior)
		this.switchView("projects", projectId);
	}

	private ensureDetailsPanel() {
		if (this.detailsPanelEl) return;
		const wrapper = this.contentArea?.parentElement as HTMLElement;
		if (!wrapper) return;
		this.detailsPanelEl = wrapper.createDiv({ cls: "tg-v2-details-panel" });
		const header = this.detailsPanelEl.createDiv({
			cls: "tg-v2-details-header",
		});
		header.setText(t("Details"));
		this.detailsBodyEl = this.detailsPanelEl.createDiv({
			cls: "tg-v2-details-body",
		});
		this.detailsPanelEl.hide();
	}

	private showDetailsMessage(message: string) {
		this.ensureDetailsPanel();
		if (this.detailsBodyEl) {
			this.detailsBodyEl.empty();
			this.detailsBodyEl.createEl("div", { text: message });
		}
	}

	// Task handling methods
	private handleTaskSelection(task: Task | null) {
		if (task) {
			const now = Date.now();
			const timeSinceLastToggle = now - this.lastToggleTimestamp;

			if (this.currentSelectedTaskId !== task.id) {
				this.currentSelectedTaskId = task.id;
				this.detailsComponent?.showTaskDetails(task);
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
		} else {
			this.toggleDetailsVisibility(false);
			this.currentSelectedTaskId = null;
		}
	}

	private async toggleTaskCompletion(task: Task) {
		if (!this.plugin.writeAPI) {
			new Notice("WriteAPI not available");
			return;
		}

		const updatedTask = { ...task, completed: !task.completed };

		if (updatedTask.completed) {
			updatedTask.metadata.completedDate = Date.now();
			const completedMark = (
				this.plugin.settings.taskStatuses.completed || "x"
			).split("|")[0];
			if (updatedTask.status !== completedMark) {
				updatedTask.status = completedMark;
			}
		} else {
			updatedTask.metadata.completedDate = undefined;
			const notStartedMark =
				this.plugin.settings.taskStatuses.notStarted || " ";
			if (this.isCompletedMark(updatedTask.status)) {
				updatedTask.status = notStartedMark;
			}
		}

		await this.handleTaskUpdate(task, updatedTask);
	}

	private async handleTaskUpdate(originalTask: Task, updatedTask: Task) {
		if (!this.plugin.writeAPI) {
			console.error("WriteAPI not available");
			return;
		}

		try {
			const updates = this.extractChangedFields(
				originalTask,
				updatedTask
			);
			const writeResult = await this.plugin.writeAPI.updateTask({
				taskId: originalTask.id,
				updates: updates,
			});

			if (!writeResult.success) {
				throw new Error(writeResult.error || "Failed to update task");
			}

			// Update local task list immediately
			const index = this.tasks.findIndex((t) => t.id === originalTask.id);
			if (index !== -1) {
				this.tasks = [...this.tasks];
				this.tasks[index] = writeResult.task || updatedTask;
			}

			// Re-apply filters and lightly refresh current view without full rerender
			this.applyFilters();
			this.refreshCurrentViewData();

			// If the updated task is currently selected, refresh the details panel only
			const updated = writeResult.task || updatedTask;
			if (
				this.currentSelectedTaskId &&
				updated &&
				this.currentSelectedTaskId === updated.id
			) {
				if (this.detailsComponent?.isCurrentlyEditing?.()) {
					(this.detailsComponent as any).currentTask = updated;
				} else {
					this.detailsComponent?.showTaskDetails(updated);
				}
			}
		} catch (error) {
			console.error("Failed to update task:", error);
			new Notice("Failed to update task");
		}
	}

	private handleTaskContextMenu(event: MouseEvent, task: Task) {
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
				const uniqueStatuses = new Map<string, string>();

				// Build a map of unique mark -> status name to avoid duplicates
				for (const status of Object.keys(statusMarks)) {
					const mark =
						statusMarks[status as keyof typeof statusMarks];
					// If this mark is not already in the map, add it
					// This ensures each mark appears only once in the menu
					if (!Array.from(uniqueStatuses.values()).includes(mark)) {
						uniqueStatuses.set(status, mark);
					}
				}

				// Create menu items from unique statuses
				for (const [status, mark] of uniqueStatuses) {
					submenu.addItem((item) => {
						item.titleEl.createEl(
							"span",
							{
								cls: "status-option-checkbox",
							},
							(el) => {
								createTaskCheckbox(mark, task, el);
							}
						);
						item.titleEl.createEl("span", {
							cls: "status-option",
							text: status,
						});
						item.onClick(async () => {
							const willComplete = this.isCompletedMark(mark);
							const updatedTask = {
								...task,
								status: mark,
								completed: willComplete,
							};

							if (!task.completed && willComplete) {
								updatedTask.metadata.completedDate = Date.now();
							} else if (task.completed && !willComplete) {
								updatedTask.metadata.completedDate = undefined;
							}

							await this.handleTaskUpdate(task, updatedTask);
						});
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

	private async handleKanbanTaskStatusUpdate(
		taskId: string,
		newStatusMark: string
	) {
		const task = this.tasks.find((t) => t.id === taskId);
		if (!task) return;

		const isCompleted = this.isCompletedMark(newStatusMark);
		const completedDate = isCompleted ? Date.now() : undefined;

		if (task.status !== newStatusMark || task.completed !== isCompleted) {
			await this.handleTaskUpdate(task, {
				...task,
				status: newStatusMark,
				completed: isCompleted,
				metadata: {
					...task.metadata,
					completedDate: completedDate,
				},
			});
		}
	}
	private async editTask(task: Task) {
		const file = this.app.vault.getFileByPath(task.filePath);
		if (!(file instanceof TFile)) return;
		const leaf = this.app.workspace.getLeaf(false);
		await leaf.openFile(file, {
			eState: { line: task.line },
		});
	}

	private async confirmAndDeleteTask(event: MouseEvent, task: Task) {
		const hasChildren =
			task.metadata &&
			task.metadata.children &&
			task.metadata.children.length > 0;

		if (hasChildren) {
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
			});
			menu.showAtMouseEvent(event);
		} else {
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
	}

	private async deleteTask(task: Task, deleteChildren: boolean) {
		if (!this.plugin.writeAPI) {
			console.error("WriteAPI not available for deleteTask");
			new Notice(t("Failed to delete task"));
			return;
		}
		try {
			const result = await this.plugin.writeAPI.deleteTask({
				taskId: task.id,
				deleteChildren,
			});
			if (result.success) {
				new Notice(t("Task deleted"));
				const index = this.tasks.findIndex((t) => t.id === task.id);
				if (index !== -1) {
					this.tasks = [...this.tasks];
					this.tasks.splice(index, 1);
					if (deleteChildren && task.metadata?.children) {
						for (const childId of task.metadata.children) {
							const childIndex = this.tasks.findIndex(
								(t) => t.id === childId
							);
							if (childIndex !== -1) {
								this.tasks.splice(childIndex, 1);
							}
						}
					}
				}
				if (this.currentSelectedTaskId === task.id) {
					this.handleTaskSelection(null);
				}
				this.switchView(this.currentViewId);
			} else {
				new Notice(
					t("Failed to delete task") +
						": " +
						(result.error || "Unknown error")
				);
			}
		} catch (error) {
			console.error("Error deleting task:", error);
			new Notice(
				t("Failed to delete task") + ": " + (error as any).message
			);
		}
	}

	// Helper methods
	private isCompletedMark(mark: string): boolean {
		if (!mark) return false;
		try {
			const lower = mark.toLowerCase();
			const completedCfg = String(
				this.plugin.settings.taskStatuses?.completed || "x"
			);
			const completedSet = completedCfg
				.split("|")
				.map((s) => s.trim().toLowerCase())
				.filter(Boolean);
			return completedSet.includes(lower);
		} catch (_) {
			return false;
		}
	}

	private scheduleUpdate(source: string) {
		console.log(`[TG-V2] Update scheduled from: ${source}`);
		this.pendingUpdates.add(source);

		if (!this.updateScheduled) {
			this.updateScheduled = true;
			// Use requestAnimationFrame for smoother updates
			requestAnimationFrame(() => {
				setTimeout(() => {
					this.executeScheduledUpdate();
				}, 100); // Small delay to batch multiple updates
			});
		}
	}

	private executeScheduledUpdate() {
		if (this.isInitializing) {
			console.log("[TG-V2] Skipping update during initialization");
			this.updateScheduled = false;
			this.pendingUpdates.clear();
			return;
		}

		console.log(
			"[TG-V2] Executing scheduled update for sources:",
			Array.from(this.pendingUpdates)
		);

		// Check what kind of updates are pending
		const needsFullReload = this.pendingUpdates.has('dataflow') ||
							   this.pendingUpdates.has('workspace-switch');
		const needsFilterRefresh = this.pendingUpdates.has('filter-changed') ||
								  this.pendingUpdates.has('search');

		this.pendingUpdates.clear();
		this.updateScheduled = false;

		// Handle loading/error states first
		if (this.isLoading) {
			console.log("[TG-V2] Still loading, showing loading state");
			this.renderLoadingState();
			return;
		}

		if (this.loadError) {
			console.log("[TG-V2] Showing error state");
			this.renderErrorState();
			return;
		}

		// Apply filters if needed (only once)
		if (needsFilterRefresh || needsFullReload) {
			console.log("[TG-V2] Applying filters in scheduled update");
			this.applyFilters();
		}

		// Refresh current view data without full re-render if possible
		if (needsFilterRefresh && !needsFullReload) {
			console.log("[TG-V2] Refreshing current view data only");
			this.refreshCurrentViewData();
		} else {
			// Full view switch only when necessary
			console.log("[TG-V2] Performing full view update");
			this.switchView(this.currentViewId);
		}
	}

	private extractChangedFields(
		originalTask: Task,
		updatedTask: Task
	): Partial<Task> {
		const changes: Partial<Task> = {};

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
		const metadataChanges: Partial<typeof originalTask.metadata> = {};
		let hasMetadataChanges = false;

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
			const originalValue = (originalTask.metadata as any)?.[field];
			const updatedValue = (updatedTask.metadata as any)?.[field];

			if (field === "tags") {
				const origTags = originalValue || [];
				const updTags = updatedValue || [];
				if (
					origTags.length !== updTags.length ||
					!origTags.every((t: string, i: number) => t === updTags[i])
				) {
					metadataChanges.tags = updTags;
					hasMetadataChanges = true;
				}
			} else if (originalValue !== updatedValue) {
				(metadataChanges as any)[field] = updatedValue;
				hasMetadataChanges = true;
			}
		}

		if (hasMetadataChanges) {
			changes.metadata = metadataChanges as any;
		}

		return changes;
	}

	private async refresh() {
		await this.loadTasks();
		this.renderContent();
		this.topNavigation?.refresh();
	}

	// Save filter state to workspace - debounced to avoid infinite loops
	private saveFilterStateToWorkspace = debounce(
		() => {
			if (!this.plugin.workspaceManager || !this.workspaceId) return;

			const effectiveSettings =
				this.plugin.workspaceManager.getEffectiveSettings(
					this.workspaceId
				);

			// Save current filter state
			if (!effectiveSettings.v2FilterState) {
				effectiveSettings.v2FilterState = {};
			}

			// Do NOT persist ephemeral fields across workspaces
			const payload = {
				filters: this.viewState.filters,
				selectedProject: this.viewState.selectedProject,
				advancedFilter: this.currentFilterState,
				viewMode: this.viewState.viewMode,
			};
			effectiveSettings.v2FilterState[this.currentViewId] = payload;

			console.log("[TG-WORKSPACE] saveFilterStateToWorkspace", {
				workspaceId: this.workspaceId,
				viewId: this.currentViewId,
				searchQuery: this.viewState.searchQuery,
				selectedProject: this.viewState.selectedProject,
				hasAdvanced: !!this.currentFilterState,
				groups:
					(this.currentFilterState as any)?.filterGroups?.length ?? 0,
			});

			// Use saveOverridesQuietly to avoid triggering SETTINGS_CHANGED event
			this.plugin.workspaceManager
				.saveOverridesQuietly(this.workspaceId, effectiveSettings)
				.then(() =>
					console.log("[TG-WORKSPACE] overrides saved quietly", {
						workspaceId: this.workspaceId,
						viewId: this.currentViewId,
					})
				)
				.catch((e) =>
					console.warn("[TG-WORKSPACE] failed to save overrides", e)
				);
		},
		500,
		true
	);

	// Restore filter state from workspace
	private restoreFilterStateFromWorkspace() {
		if (!this.plugin.workspaceManager || !this.workspaceId) return;

		const effectiveSettings =
			this.plugin.workspaceManager.getEffectiveSettings(this.workspaceId);

		const saved =
			effectiveSettings.v2FilterState?.[this.currentViewId] ?? null;
		console.log("[TG-WORKSPACE] restoreFilterStateFromWorkspace", {
			workspaceId: this.workspaceId,
			viewId: this.currentViewId,
			hasSaved: !!saved,
			savedSearch: saved?.searchQuery ?? "",
			savedProject: saved?.selectedProject ?? null,
			hasAdvanced: !!saved?.advancedFilter,
			groups: saved?.advancedFilter?.filterGroups?.length ?? 0,
		});

		if (saved) {
			const savedState = saved;

			// Restore filter state (ephemeral fields will be cleared below)
			this.viewState.filters = savedState.filters || {};
			this.currentFilterState = savedState.advancedFilter || null;
			this.liveFilterState = savedState.advancedFilter || null;
			this.viewState.viewMode = savedState.viewMode || "list";

			// Clear only searchQuery on workspace restore
			this.viewState.searchQuery = "";
			// Keep selectedProject (and any advancedFilter changes caused by it)
			// Update UI elements
			if (this.filterInputEl) {
				this.filterInputEl.value = "";
			}

			// Broadcast so any open filter UI reacts and header button shows reset (advanced only)
			this.app.workspace.trigger(
				"task-genius:filter-changed",
				this.liveFilterState as any
			);
		} else {
			// No saved state for this view in this workspace; clear advanced filter UI state
			this.currentFilterState = null;
			this.liveFilterState = null;

			// Always clear searchQuery when switching workspace
			this.viewState.searchQuery = "";
			if (this.filterInputEl) {
				this.filterInputEl.value = "";
			}

			// Let UI know filters are cleared
			this.app.workspace.trigger("task-genius:filter-changed", {
				rootCondition: "all",
				filterGroups: [],
			} as any);
		}

		// Refresh header action buttons (e.g., reset filter button)
		this.updateActionButtons();

		// Ensure data reflects the restored filters immediately when UI is ready
		if (this.rootContainerEl) {
			console.log("[TG-WORKSPACE] apply restored filters to view", {
				workspaceId: this.workspaceId,
				viewId: this.currentViewId,
			});
			this.applyFilters();
			this.updateView();
		} else {
			console.log(
				"[TG-WORKSPACE] UI not ready, skip applying filters/updateView"
			);
		}
	}

	private getAvailableModesForView(viewId: string): ViewMode[] {
		// Check for special two-column views
		const viewConfig = getViewSettingOrDefault(this.plugin, viewId as any);
		if (viewConfig?.specificConfig?.viewType === "twocolumn") {
			// Two-column views typically support list and tree modes
			return ["list", "tree"];
		}

		// Check for special views managed by ViewComponentManager
		if (this.viewComponentManager?.isSpecialView(viewId)) {
			// Special views usually have their own UI, no modes needed
			return [];
		}

		// Return the configured modes for the view, or empty array
		return VIEW_MODE_CONFIG[viewId] || [];
	}

	async onClose() {
		// Save workspace layout and filter state
		this.saveWorkspaceLayout();
		this.saveFilterStateToWorkspace();

		// Clean up components
		if (this.kanbanComponent) {
			this.kanbanComponent.unload();
		}
		if (this.calendarComponent) {
			this.calendarComponent.unload();
		}

		// Cleanup
		this.contentArea?.empty();
	}
}
