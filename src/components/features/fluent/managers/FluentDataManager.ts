import { Component, debounce } from "obsidian";
import TaskProgressBarPlugin from "@/index";
import { Task } from "@/types/task";
import { filterTasks } from "@/utils/task/task-filter-utils";
import { RootFilterState } from "@/components/features/task/filter/ViewTaskFilter";
import { isDataflowEnabled } from "@/dataflow/createDataflow";
import { Events, on } from "@/dataflow/events/Events";
import { getViewSettingOrDefault } from "@/common/setting-definition";

/**
 * FluentDataManager - Stateless data loading and filtering executor
 *
 * Responsibilities:
 * - Load tasks from dataflow or preloaded cache (returns via callback)
 * - Apply filters to tasks (pure function, returns filtered tasks)
 * - Register dataflow event listeners for real-time updates
 * - Schedule and batch updates to prevent rapid re-renders
 *
 * NOTE: This manager is STATELESS - it does not hold tasks or filtered tasks.
 * All state is managed by TaskViewV2, this manager only executes operations.
 */
export class FluentDataManager extends Component {
	// Callbacks
	private onTasksLoaded?: (tasks: Task[], error: string | null) => void;
	private onLoadingStateChanged?: (isLoading: boolean) => void;
	private onUpdateNeeded?: (source: string) => void;

	constructor(
		private plugin: TaskProgressBarPlugin,
		private getCurrentViewId: () => string,
		private getCurrentFilterState: () => {
			liveFilterState: RootFilterState | null;
			currentFilterState: RootFilterState | null;
			viewStateFilters: any;
			selectedProject: string | undefined;
			searchQuery: string;
			filterInputValue: string;
		},
		private isInitializing: () => boolean
	) {
		super();
	}

	/**
	 * Set callbacks for data operations
	 */
	setCallbacks(callbacks: {
		onTasksLoaded?: (tasks: Task[], error: string | null) => void;
		onLoadingStateChanged?: (isLoading: boolean) => void;
		onUpdateNeeded?: (source: string) => void;
	}) {
		this.onTasksLoaded = callbacks.onTasksLoaded;
		this.onLoadingStateChanged = callbacks.onLoadingStateChanged;
		this.onUpdateNeeded = callbacks.onUpdateNeeded;
	}

	/**
	 * Load tasks from dataflow or preloaded cache
	 * Returns loaded tasks via callback
	 */
	async loadTasks(showLoading = true): Promise<void> {
		try {
			console.log(
				"[FluentData] loadTasks started, showLoading:",
				showLoading
			);

			// Notify loading state
			if (showLoading && !this.isInitializing()) {
				console.log("[FluentData] Notifying loading state");
				this.onLoadingStateChanged?.(true);
			}

			let loadedTasks: Task[] = [];

			if (this.plugin.dataflowOrchestrator) {
				console.log(
					"[FluentData] Using dataflow orchestrator to load tasks"
				);
				const queryAPI = this.plugin.dataflowOrchestrator.getQueryAPI();
				console.log("[FluentData] Getting all tasks from queryAPI...");
				loadedTasks = await queryAPI.getAllTasks();
				console.log(
					`[FluentData] Loaded ${loadedTasks.length} tasks from dataflow`
				);
			} else {
				console.log(
					"[FluentData] Dataflow not available, using preloaded tasks"
				);
				loadedTasks = this.plugin.preloadedTasks || [];
				console.log(
					`[FluentData] Loaded ${loadedTasks.length} preloaded tasks`
				);
			}

			// Return loaded tasks via callback
			this.onTasksLoaded?.(loadedTasks, null);
		} catch (error) {
			console.error("[FluentData] Failed to load tasks:", error);
			const errorMessage =
				(error as Error).message || "Failed to load tasks";
			// Return error via callback
			this.onTasksLoaded?.([], errorMessage);
		} finally {
			// Always notify loading complete
			console.log("[FluentData] loadTasks complete");
			this.onLoadingStateChanged?.(false);
		}
	}

	/**
	 * Apply filters to tasks (pure function - returns filtered tasks)
	 * @param tasks - All tasks to filter
	 * @returns Filtered tasks based on current filter state
	 */
	applyFilters(tasks: Task[]): Task[] {
		const viewId = this.getCurrentViewId();
		const filterState = this.getCurrentFilterState();

		console.log("[FluentData] ===== APPLY FILTERS =====");
		console.log(`[FluentData] Current ViewID: ${viewId}`);
		console.log("[FluentData] Input tasks:", tasks.length);
		console.log("[FluentData] Current filterState:", JSON.stringify({
			liveFilterState: filterState.liveFilterState,
			currentFilterState: filterState.currentFilterState,
			viewStateFilters: filterState.viewStateFilters,
			selectedProject: filterState.selectedProject,
			searchQuery: filterState.searchQuery,
			filterInputValue: filterState.filterInputValue,
		}, null, 2));

		// Get view configuration to check if global filters should be ignored
		const viewConfig = getViewSettingOrDefault(this.plugin, viewId as any);
		const ignoreGlobalFilters = viewConfig.ignoreGlobalFilters || false;

		if (ignoreGlobalFilters) {
			console.log(`[FluentData] View ${viewId} is configured to ignore global filters - using only view's own filter rules`);
		}

		// Build filter options
		const filterOptions: any = {
			textQuery: ignoreGlobalFilters
				? "" // Don't apply search query if ignoring global filters
				: (filterState.filterInputValue || filterState.searchQuery || ""),
		};

		// Apply advanced filters from the filter popover/modal (only if NOT ignoring global filters)
		let hasAdvancedProjectFilter = false;
		if (
			!ignoreGlobalFilters &&
			filterState.currentFilterState &&
			filterState.currentFilterState.filterGroups &&
			filterState.currentFilterState.filterGroups.length > 0
		) {
			console.log("[FluentData] Applying advanced filters from dropdown");
			filterOptions.advancedFilter = filterState.currentFilterState;

			// Check if advanced filter already has project filters
			hasAdvancedProjectFilter = filterState.currentFilterState.filterGroups.some(
				(group: any) =>
					group.filters &&
					group.filters.some((filter: any) => filter.property === "project")
			);
			if (hasAdvancedProjectFilter) {
				console.log("[FluentData] Advanced filter contains project filters - skipping legacy project filter");
			}
		}

		// If there are additional fluent-specific filters from the filter panel, pass them (only if NOT ignoring global filters)
		if (
			!ignoreGlobalFilters &&
			filterState.viewStateFilters &&
			Object.keys(filterState.viewStateFilters).length > 0
		) {
			filterOptions.v2Filters = filterState.viewStateFilters;
		}

		// Global project filter - Skip if ignoring global filters or if advanced filter already has project filters
		// NOTE: Removed hardcoded inbox exclusion - let ignoreGlobalFilters setting control this
		if (
			!ignoreGlobalFilters &&
			filterState.selectedProject &&
			!hasAdvancedProjectFilter
		) {
			console.log(
				`[FluentData] Applying project filter: ${filterState.selectedProject} to view: ${viewId}`
			);
			filterOptions.v2Filters = {
				...(filterOptions.v2Filters || {}),
				project: filterState.selectedProject,
			};
		} else if (ignoreGlobalFilters && filterState.selectedProject) {
			console.log(
				`[FluentData] Skipping project filter for view: ${viewId} because ignoreGlobalFilters is enabled`
			);
		}

		// Pass ignoreGlobalFilters to the filter utility so it can skip default view logic
		filterOptions.ignoreGlobalFilters = ignoreGlobalFilters;

		console.log("[FluentData] Final filterOptions:", JSON.stringify(filterOptions, null, 2));

		// Use the existing filterTasks utility which handles all view-specific logic
		let filteredTasks = filterTasks(
			tasks,
			viewId as any,
			this.plugin,
			filterOptions
		);

		console.log(`[FluentData] After filterTasks utility: ${filteredTasks.length} tasks`);

		// Apply additional fluent-specific filters if needed (but NOT when ignoring global filters)
		if (filterOptions.v2Filters && !ignoreGlobalFilters) {
			console.log("[FluentData] Applying v2Filters:", JSON.stringify(filterOptions.v2Filters, null, 2));
			filteredTasks = this.applyV2Filters(
				filteredTasks,
				filterOptions.v2Filters
			);
			console.log(`[FluentData] After v2Filters: ${filteredTasks.length} tasks`);
		} else if (filterOptions.v2Filters && ignoreGlobalFilters) {
			console.log("[FluentData] Skipping v2Filters because ignoreGlobalFilters is enabled");
		}

		console.log(
			`[FluentData] ===== FINAL RESULT: ${filteredTasks.length} tasks from ${tasks.length} total =====`
		);

		return filteredTasks;
	}

	/**
	 * Apply fluent-specific filters (pure function - returns filtered tasks)
	 * @param tasks - Tasks to filter
	 * @param filters - V2 filter configuration
	 * @returns Filtered tasks
	 */
	private applyV2Filters(tasks: Task[], filters: any): Task[] {
		const viewId = this.getCurrentViewId();
		console.log(`[FluentData] applyV2Filters - viewId from getCurrentViewId(): ${viewId}`);
		console.log(`[FluentData] applyV2Filters - filters.project: ${filters.project}`);
		let result = [...tasks]; // Copy array to avoid mutation

		// Status filter
		if (filters.status && filters.status !== "all") {
			switch (filters.status) {
				case "active":
					result = result.filter((task) => !task.completed);
					break;
				case "completed":
					result = result.filter((task) => task.completed);
					break;
				case "overdue":
					result = result.filter((task) => {
						if (task.completed || !task.metadata?.dueDate)
							return false;
						return new Date(task.metadata.dueDate) < new Date();
					});
					break;
			}
		}

		// Priority filter
		if (filters.priority && filters.priority !== "all") {
			result = result.filter((task) => {
				const taskPriority = task.metadata?.priority || 0;
				const filterPriority =
					typeof filters.priority === "string"
						? parseInt(filters.priority)
						: filters.priority;
				return taskPriority === filterPriority;
			});
		}

		// Project filter - Skip for Inbox view
		if (filters.project && viewId !== "inbox") {
			console.log(`[FluentData] applyV2Filters - Applying project filter for viewId: ${viewId}`);
			// Get custom project to find the actual project name
			const customProjects = this.plugin.settings.projectConfig?.customProjects || [];
			const customProject = customProjects.find((p) => p.id === filters.project);

			// If it's a custom project (with generated ID), match by name
			// Otherwise, match by the project value directly
			const projectToMatch = customProject ? customProject.name : filters.project;
			console.log(`[FluentData] applyV2Filters - Filtering to project: ${projectToMatch}`);

			const beforeCount = result.length;
			result = result.filter(
				(task) => task.metadata?.project === projectToMatch
			);
			console.log(`[FluentData] applyV2Filters - Project filter: ${beforeCount} -> ${result.length} tasks`);
		} else if (filters.project && viewId === "inbox") {
			console.log(`[FluentData] applyV2Filters - SKIPPING project filter because viewId is inbox`);
		}

		// Tags filter
		if (filters.tags && filters.tags.length > 0) {
			result = result.filter((task) => {
				if (!task.metadata?.tags) return false;
				return filters.tags!.some((tag: string) =>
					task.metadata!.tags!.includes(tag)
				);
			});
		}

		// Date range filter
		if (filters.dateRange) {
			if (filters.dateRange.start) {
				result = result.filter((task) => {
					if (!task.metadata?.dueDate) return false;
					return (
						new Date(task.metadata.dueDate) >=
						filters.dateRange!.start!
					);
				});
			}
			if (filters.dateRange.end) {
				result = result.filter((task) => {
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
			result = result.filter(
				(task) => task.metadata?.assignee === filters.assignee
			);
		}

		return result;
	}

	/**
	 * Register dataflow event listeners for real-time updates
	 * Notifies parent via onUpdateNeeded callback
	 */
	async registerDataflowListeners(): Promise<void> {
		// Add debounced view update to prevent rapid successive refreshes
		const debouncedViewUpdate = debounce(async () => {
			console.log("[FluentData] debouncedViewUpdate triggered");
			if (!this.isInitializing()) {
				// Load tasks and notify parent
				await this.loadTasks(false);
				// Notify parent that data changed
				this.onUpdateNeeded?.("dataflow");
			}
		}, 500);

		// Add debounced filter application
		const debouncedApplyFilter = debounce(() => {
			if (!this.isInitializing()) {
				this.onUpdateNeeded?.("filter-changed");
			}
		}, 400);

		// Register dataflow event listeners
		if (
			isDataflowEnabled(this.plugin) &&
			this.plugin.dataflowOrchestrator
		) {
			// Listen for cache ready event
			this.registerEvent(
				on(this.plugin.app, Events.CACHE_READY, async () => {
					await this.loadTasks();
					this.onUpdateNeeded?.("cache-ready");
				})
			);

			// Listen for task cache updates
			this.registerEvent(
				on(
					this.plugin.app,
					Events.TASK_CACHE_UPDATED,
					debouncedViewUpdate
				)
			);
		} else {
			// Legacy event support
			this.registerEvent(
				this.plugin.app.workspace.on(
					"task-genius:task-cache-updated",
					debouncedViewUpdate
				)
			);
		}

		// Listen for filter change events
		this.registerEvent(
			this.plugin.app.workspace.on(
				"task-genius:filter-changed",
				(filterState: RootFilterState, leafId?: string) => {
					// Only update if it's from a live filter component
					if (
						!leafId ||
						(!leafId.startsWith("view-config-") &&
							leafId !== "global-filter")
					) {
						console.log(
							"[FluentData] Filter changed, notifying update needed"
						);
						debouncedApplyFilter();
					}
				}
			)
		);
	}

	/**
	 * Get current filter count for badge display
	 */
	getActiveFilterCount(): number {
		const filterState = this.getCurrentFilterState();
		let count = 0;

		if (filterState.searchQuery || filterState.filterInputValue) count++;
		if (filterState.selectedProject) count++;
		if (filterState.currentFilterState?.filterGroups?.length) {
			count += filterState.currentFilterState.filterGroups.length;
		}

		return count;
	}
}
