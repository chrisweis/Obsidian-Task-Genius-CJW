import {
	ItemView,
	WorkspaceLeaf,
	Plugin,
	Notice,
	debounce,
	setIcon,
} from "obsidian";
import TaskProgressBarPlugin from "../../index";
import { Task, BaseTask } from "../../types/task";
import { V2Sidebar } from "./components/V2Sidebar";
import "./styles/v2.css";
import "./styles/v2-enhanced.css";
import "./styles/v2-content-header.css";
import { TopNavigation, ViewMode } from "./components/V2TopNavigation";
import { V2FilterPanel, FilterOptions } from "./components/V2FilterPanel";
import { Workspace, V2ViewState } from "./types";
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

export class TaskViewV2 extends ItemView {
	private plugin: TaskProgressBarPlugin;
	private rootContainerEl: HTMLElement;

	// Components
	private sidebar: V2Sidebar;
	private topNavigation: TopNavigation;
	private contentArea: HTMLElement;
	private filterPanel: V2FilterPanel;

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
	private isDetailsVisible: boolean = false;
	private currentFilterState: RootFilterState | null = null;
	private liveFilterState: RootFilterState | null = null;

	// State management
	private viewState: V2ViewState = {
		currentWorkspace: "default",
		viewMode: "list",
		searchQuery: "",
		filters: {},
	};

	private workspaces: Workspace[] = [];

	private tasks: Task[] = [];
	private filteredTasks: Task[] = [];
	private currentViewId: string = "inbox";
	private isLoading: boolean = false;
	private loadError: string | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: TaskProgressBarPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.tasks = this.plugin.preloadedTasks || [];

		// Load workspaces from settings or localStorage
		this.initializeDefaultWorkspaces();
	}

	getViewType(): string {
		return TASK_VIEW_V2_TYPE;
	}

	getDisplayText(): string {
		return "Task Genius V2";
	}

	getIcon(): string {
		return "layout-dashboard";
	}

	async onOpen() {
		this.contentEl.empty();
		this.contentEl.addClass("task-genius-v2-view");

		// Load saved filter state
		const savedFilterState = this.app.loadLocalStorage(
			"task-genius-view-filter",
		) as RootFilterState;

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

		// Initialize components
		this.initializeSidebar(sidebarEl);
		this.initializeTopNavigation(topNavEl);
		this.initializeViewComponents();
		this.initializeFilterPanel();

		// Register dataflow event listeners first for real-time updates
		await this.registerDataflowListeners();

		// Load initial data
		await this.loadTasks();
		this.switchView(this.currentViewId);

		// Create action buttons in Obsidian view header
		this.createActionButtons();
	}

	private initializeSidebar(containerEl: HTMLElement) {
		const currentWorkspace =
			this.workspaces.find(
				(w) => w.id === this.viewState.currentWorkspace,
			) || this.workspaces[0];

		this.sidebar = new V2Sidebar(
			containerEl,
			this.plugin,
			currentWorkspace,
			this.workspaces,
			(viewId) => this.handleNavigate(viewId),
			(workspace) => this.handleWorkspaceChange(workspace),
			(projectId) => this.handleProjectSelect(projectId),
		);
	}

	private initializeTopNavigation(containerEl: HTMLElement) {
		this.topNavigation = new TopNavigation(
			containerEl,
			this.plugin,
			(query) => this.handleSearch(query),
			(mode) => this.handleViewModeChange(mode),
			() => {}, // Filter is now in Obsidian view header
			() => {}, // Sort is now in Obsidian view header
			() => this.handleSettingsClick(),
		);
	}

	private initializeViewComponents() {
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
			viewHandlers,
		);
		this.addChild(this.viewComponentManager);

		// Initialize ContentComponent (handles inbox, today, upcoming, flagged)
		this.contentComponent = new ContentComponent(
			this.contentArea,
			this.app,
			this.plugin,
			{
				onTaskSelected: (task) => this.handleTaskSelection(task),
				onTaskCompleted: (task) => this.toggleTaskCompletion(task),
				onTaskContextMenu: (event, task) =>
					this.handleTaskContextMenu(event, task),
			},
		);
		this.addChild(this.contentComponent);
		this.contentComponent.load();

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
			},
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
			},
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
			},
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
			},
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
			},
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
			},
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
			},
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

		// Hide all components initially
		this.hideAllComponents();
	}

	private hideAllComponents() {
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

	private initializeFilterPanel() {
		// Create filter panel
		this.filterPanel = new V2FilterPanel(
			this.rootContainerEl,
			(filters: FilterOptions) => {
				// Apply filters when changed
				this.viewState.filters = filters;
				this.applyFilters();
				this.updateView();
			},
			this.tasks,
		);
	}

	private async registerDataflowListeners() {
		// Add debounced view update to prevent rapid successive refreshes
		const debouncedViewUpdate = debounce(async () => {
			await this.loadTasks();
			this.switchView(this.currentViewId);
			// Also refresh project list when tasks update
			this.sidebar?.projectList?.refresh();
		}, 500);

		// Add debounced filter application
		const debouncedApplyFilter = debounce(() => {
			this.applyFilters();
			this.updateView();
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
				}),
			);

			// Listen for task cache updates
			this.registerEvent(
				on(this.app, Events.TASK_CACHE_UPDATED, debouncedViewUpdate),
			);
		} else {
			// Legacy event support
			this.registerEvent(
				this.app.workspace.on(
					"task-genius:task-cache-updated",
					debouncedViewUpdate,
				),
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
							"[TaskViewV2] Filter changed from live component",
						);
						this.liveFilterState = filterState;
						this.currentFilterState = filterState;
					} else if (!leafId) {
						// No leafId means it's also a live filter change
						console.log("[TaskViewV2] Filter changed (no leafId)");
						this.liveFilterState = filterState;
						this.currentFilterState = filterState;
					}

					// Apply filters with debouncing
					debouncedApplyFilter();
				},
			),
		);
	}

	private async loadTasks() {
		try {
			console.log("[TaskViewV2] Starting to load tasks...");
			this.isLoading = true;
			this.loadError = null;
			this.updateView(); // Show loading state

			if (this.plugin.dataflowOrchestrator) {
				console.log(
					"[TaskViewV2] Using dataflow orchestrator to load tasks",
				);
				const queryAPI = this.plugin.dataflowOrchestrator.getQueryAPI();
				this.tasks = await queryAPI.getAllTasks();
				console.log(
					`[TaskViewV2] Loaded ${this.tasks.length} tasks from dataflow`,
				);
			} else {
				console.log("[TaskViewV2] Using preloaded tasks");
				this.tasks = this.plugin.preloadedTasks || [];
				console.log(
					`[TaskViewV2] Loaded ${this.tasks.length} preloaded tasks`,
				);
			}

			this.applyFilters();
			console.log(
				`[TaskViewV2] After filtering: ${this.filteredTasks.length} tasks`,
			);
		} catch (error) {
			console.error("[TaskViewV2] Failed to load tasks:", error);
			this.loadError = error.message || "Failed to load tasks";
			this.tasks = [];
			this.filteredTasks = [];
		} finally {
			this.isLoading = false;
			this.updateView();
			// Refresh sidebar project list with new data
			this.sidebar?.projectList?.refresh();
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
			filterOptions,
		);

		// Apply additional V2-specific filters if needed
		if (filterOptions.v2Filters) {
			const filters = filterOptions.v2Filters as FilterOptions;

			// Status filter
			if (filters.status && filters.status !== "all") {
				switch (filters.status) {
					case "active":
						this.filteredTasks = this.filteredTasks.filter(
							(task) => !task.completed,
						);
						break;
					case "completed":
						this.filteredTasks = this.filteredTasks.filter(
							(task) => task.completed,
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
							},
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

			// Project filter
			if (filters.project) {
				this.filteredTasks = this.filteredTasks.filter(
					(task) => task.metadata?.project === filters.project,
				);
			}

			// Tags filter
			if (filters.tags && filters.tags.length > 0) {
				this.filteredTasks = this.filteredTasks.filter((task) => {
					if (!task.metadata?.tags) return false;
					return filters.tags!.some((tag) =>
						task.metadata!.tags!.includes(tag),
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
					(task) => task.metadata?.assignee === filters.assignee,
				);
			}
		}

		// Update task count
		if (this.taskCountEl) {
			this.taskCountEl.setText(
				`${this.filteredTasks.length} ${t("tasks")}`,
			);
		}

		// Update filter panel with latest tasks
		if (this.filterPanel) {
			this.filterPanel.updateTasks(this.tasks);
		}
	}

	private switchView(viewId: string, project?: string | null) {
		this.currentViewId = viewId;
		this.sidebar?.setActiveItem(viewId);
		console.log(
			"[TaskViewV2] Switching view to:",
			viewId,
			"Project:",
			project,
		);

		// Update content header title based on view
		if (this.contentTitleEl) {
			const viewTitles: Record<string, string> = {
				inbox: "Inbox",
				today: "Today",
				upcoming: "Upcoming",
				flagged: "Flagged",
				forecast: "Forecast",
				projects: "Projects",
				tags: "Tags",
				review: "Review",
				habit: "Habit",
				calendar: "Calendar",
				kanban: "Kanban",
				gantt: "Gantt",
			};
			this.contentTitleEl.setText(t(viewTitles[viewId] || "Tasks"));
		}

		// Hide all components first
		this.hideAllComponents();

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
					viewId,
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
						targetComponent = this.projectsComponent;
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

		if (targetComponent) {
			console.log(
				`[TaskViewV2] Activating component for view ${viewId}:`,
				targetComponent.constructor.name,
			);
			targetComponent.containerEl.show();

			// Apply filters
			this.applyFilters();

			// Set tasks on the component
			if (typeof targetComponent.setTasks === "function") {
				const filterOptions: any = {};
				if (
					this.currentFilterState &&
					this.currentFilterState.filterGroups &&
					this.currentFilterState.filterGroups.length > 0
				) {
					console.log(
						"[TaskViewV2] Applying advanced filter to view:",
						viewId,
					);
					filterOptions.advancedFilter = this.currentFilterState;
				}

				let filteredTasks = filterTasks(
					this.tasks,
					viewId as any,
					this.plugin,
					filterOptions,
				);

				// Filter out badge tasks for forecast view
				if (viewId === "forecast") {
					filteredTasks = filteredTasks.filter(
						(task) => !(task as any).badge,
					);
				}

				targetComponent.setTasks(filteredTasks, this.tasks);
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
						filterOptions,
					),
				);
			}

			// Set view mode for ContentComponent
			if (typeof targetComponent.setViewMode === "function") {
				console.log(
					`[TaskViewV2] Setting view mode for ${viewId} to ${modeForComponent} with project ${project}`,
				);
				targetComponent.setViewMode(modeForComponent as any, project);
			}

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
						filterOptions,
					);

					// Filter out badge tasks for forecast view
					if (component.getViewId() === "forecast") {
						filteredTasks = filteredTasks.filter(
							(task) => !(task as any).badge,
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
				`[TaskViewV2] No target component found for viewId: ${viewId}`,
			);
		}

		// Clear task selection
		this.handleTaskSelection(null);
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
						this.currentViewId,
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
					this.plugin,
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
				this.filteredTasks,
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
						this.plugin,
					);

					// Set up event handlers
					treeItem.onTaskSelected = (task) =>
						this.handleTaskSelection(task);
					treeItem.onTaskCompleted = (task) =>
						this.toggleTaskCompletion(task);
					treeItem.onTaskUpdate = async (
						originalTask,
						updatedTask,
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
		// Show loading state if loading
		if (this.isLoading) {
			this.renderLoadingState();
			return;
		}

		// Show error state if there's an error
		if (this.loadError) {
			this.renderErrorState();
			return;
		}

		// Show empty state if no tasks (only for basic views)
		if (
			this.filteredTasks.length === 0 &&
			this.viewState.searchQuery === "" &&
			!this.viewState.filters?.status &&
			["inbox", "today", "upcoming", "flagged"].includes(
				this.currentViewId,
			)
		) {
			this.renderEmptyState();
			return;
		}

		// Re-render the current view with updated data
		this.switchView(this.currentViewId);
	}

	private renderLoadingState() {
		this.clearCurrentView();
		if (this.contentArea) {
			this.contentArea.empty();

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
			this.contentArea.empty();

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
			this.contentArea.empty();

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
					"Create your first task to get started with Task Genius",
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
			[...tasksByProject.entries()].sort(([a], [b]) =>
				a.localeCompare(b),
			),
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
			(t) => t.metadata?.project === projectPath,
		);
		const completed = projectTasks.filter((t) => t.completed).length;
		const total = projectTasks.length;
		const percentage = total > 0 ? (completed / total) * 100 : 0;

		return { completed, total, percentage };
	}

	// Workspace management
	private saveWorkspaceLayout() {
		const currentWorkspace = this.workspaces.find(
			(w) => w.id === this.viewState.currentWorkspace,
		);
		if (!currentWorkspace) return;

		// Update workspace settings
		currentWorkspace.settings = {
			...currentWorkspace.settings,
			viewPreferences: {
				viewMode: this.viewState.viewMode,
				searchQuery: this.viewState.searchQuery,
				filters: this.viewState.filters,
			},
		};

		// Save all workspaces to localStorage
		localStorage.setItem(
			"task-genius-v2-workspaces",
			JSON.stringify(this.workspaces),
		);

		// Save current workspace ID
		localStorage.setItem(
			"task-genius-v2-current-workspace",
			this.viewState.currentWorkspace,
		);
	}

	private loadWorkspaceLayout() {
		// Load workspaces from localStorage
		const savedWorkspaces = localStorage.getItem(
			"task-genius-v2-workspaces",
		);
		if (savedWorkspaces) {
			try {
				this.workspaces = JSON.parse(savedWorkspaces);
			} catch (error) {
				console.error("Failed to load workspaces:", error);
				this.initializeDefaultWorkspaces();
			}
		} else {
			this.initializeDefaultWorkspaces();
		}

		// Load current workspace
		const savedCurrentWorkspace = localStorage.getItem(
			"task-genius-v2-current-workspace",
		);
		if (savedCurrentWorkspace) {
			this.viewState.currentWorkspace = savedCurrentWorkspace;
		}

		// Apply workspace settings
		const currentWorkspace = this.workspaces.find(
			(w) => w.id === this.viewState.currentWorkspace,
		);
		if (currentWorkspace?.settings?.viewPreferences) {
			const prefs = currentWorkspace.settings.viewPreferences;
			if (prefs.viewMode) this.viewState.viewMode = prefs.viewMode;
			if (prefs.searchQuery !== undefined)
				this.viewState.searchQuery = prefs.searchQuery;
			if (prefs.filters) this.viewState.filters = prefs.filters;
		}
	}

	private initializeDefaultWorkspaces() {
		this.workspaces = [
			{ id: "default", name: "Default", color: "#7c3aed" },
			{ id: "personal", name: "Personal", color: "#3b82f6" },
			{ id: "work", name: "Work", color: "#10b981" },
		];
	}

	private switchWorkspace(workspaceId: string) {
		// Save current workspace before switching
		this.saveWorkspaceLayout();

		// Update workspace ID
		this.viewState.currentWorkspace = workspaceId;

		// Load new workspace settings
		const newWorkspace = this.workspaces.find((w) => w.id === workspaceId);
		if (newWorkspace?.settings?.viewPreferences) {
			const prefs = newWorkspace.settings.viewPreferences;
			if (prefs.viewMode) this.viewState.viewMode = prefs.viewMode;
			if (prefs.searchQuery !== undefined)
				this.viewState.searchQuery = prefs.searchQuery;
			if (prefs.filters) this.viewState.filters = prefs.filters;
		}

		// Apply filters and update view
		this.applyFilters();
		this.updateView();

		// Update UI to reflect workspace change
		if (this.sidebar) {
			// Update sidebar workspace selection if needed
			const workspace = this.workspaces.find((w) => w.id === workspaceId);
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
			this.switchView(viewId);
		}
	}

	private handleSearch(query: string) {
		this.viewState.searchQuery = query;
		this.applyFilters();
		this.updateView();
	}

	private handleViewModeChange(mode: ViewMode) {
		this.viewState.viewMode = mode;
		this.updateView();
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
			},
		);

		this.detailsToggleBtn.toggleClass("panel-toggle-btn", true);
		this.detailsToggleBtn.toggleClass("is-active", this.isDetailsVisible);

		// Capture button
		this.addAction("notebook-pen", t("Capture"), () => {
			const modal = new QuickCaptureModal(
				this.app,
				this.plugin,
				{},
				true,
			);
			modal.open();
		});

		// Filter button
		this.addAction("filter", t("Filter"), (e) => {
			if (Platform.isDesktop) {
				const popover = new ViewTaskFilterPopover(
					this.app,
					undefined,
					this.plugin,
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
								filterState,
							);
						}
					}, 100);
				});

				popover.showAtPosition({ x: e.clientX, y: e.clientY });
			} else {
				const modal = new ViewTaskFilterModal(
					this.app,
					this.leaf.id,
					this.plugin,
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
			".view-action.task-filter-reset",
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
		// TODO: Implement details panel in V2
		if (this.detailsToggleBtn) {
			this.detailsToggleBtn.toggleClass("is-active", visible);
			this.detailsToggleBtn.setAttribute(
				"aria-label",
				visible ? t("Hide Details") : t("Show Details"),
			);
		}
	}

	private resetCurrentFilter() {
		console.log("[TaskViewV2] Resetting filter");
		this.liveFilterState = null;
		this.currentFilterState = null;
		this.app.saveLocalStorage("task-genius-view-filter", null);
		this.applyFilters();
		this.updateView();
		this.updateActionButtons();
	}

	private handleWorkspaceChange(workspace: Workspace) {
		this.viewState.currentWorkspace = workspace.id;
		this.sidebar?.updateWorkspace(workspace);
		this.loadTasks();
		new Notice(`Switched to ${workspace.name} workspace`);
	}

	private handleProjectSelect(projectId: string) {
		console.log(`[TaskViewV2] Project selected: ${projectId}`);
		this.viewState.selectedProject = projectId;
		// Switch to projects view and show tasks for this project
		this.switchView("projects", projectId);
	}

	// Task handling methods
	private handleTaskSelection(task: Task | null) {
		// Handle task selection (e.g., show details panel)
		if (task) {
			console.log("Task selected:", task.content);
			// TODO: Implement details panel
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
				updatedTask,
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

			// Refresh view
			this.applyFilters();
			this.renderContent();
		} catch (error) {
			console.error("Failed to update task:", error);
			new Notice("Failed to update task");
		}
	}

	private handleTaskContextMenu(event: MouseEvent, task: Task) {
		// TODO: Implement context menu
		console.log("Task context menu for:", task.content);
	}

	private async handleKanbanTaskStatusUpdate(
		taskId: string,
		newStatusMark: string,
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

	// Helper methods
	private isCompletedMark(mark: string): boolean {
		if (!mark) return false;
		try {
			const lower = mark.toLowerCase();
			const completedCfg = String(
				this.plugin.settings.taskStatuses?.completed || "x",
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

	private extractChangedFields(
		originalTask: Task,
		updatedTask: Task,
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

	async onClose() {
		// Save workspace layout
		this.saveWorkspaceLayout();

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
