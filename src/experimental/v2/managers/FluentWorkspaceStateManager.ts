import { Component, debounce, App } from "obsidian";
import TaskProgressBarPlugin from "@/index";
import { RootFilterState } from "@/components/features/task/filter/ViewTaskFilter";
import { ViewMode } from "../components/V2TopNavigation";

/**
 * FluentWorkspaceStateManager - Manages workspace state persistence
 *
 * Responsibilities:
 * - Save/restore workspace layout (filter state, view preferences)
 * - Workspace switching
 * - Filter state persistence to workspace overrides
 * - LocalStorage management for current workspace
 */
export class FluentWorkspaceStateManager extends Component {
	// Flag to prevent infinite loops during save
	private isSavingFilterState = false;

	constructor(
		private app: App,
		private plugin: TaskProgressBarPlugin,
		private getWorkspaceId: () => string,
		private getCurrentViewId: () => string,
		private getViewState: () => {
			filters: any;
			selectedProject: string | undefined;
			searchQuery: string;
			viewMode: ViewMode;
		},
		private getCurrentFilterState: () => RootFilterState | null,
		private getLiveFilterState: () => RootFilterState | null
	) {
		super();
	}

	/**
	 * Save workspace layout (filter state and preferences)
	 */
	saveWorkspaceLayout(): void {
		const workspaceId = this.getWorkspaceId();
		if (!workspaceId) return;

		// Save filter state
		this.saveFilterStateToWorkspace();

		// Save current workspace ID to localStorage for persistence
		localStorage.setItem(
			"task-genius-v2-current-workspace",
			workspaceId
		);
	}

	/**
	 * Load workspace layout (filter state and preferences)
	 */
	loadWorkspaceLayout(): string | null {
		// Load current workspace from localStorage
		const savedCurrentWorkspace = localStorage.getItem(
			"task-genius-v2-current-workspace"
		);

		if (savedCurrentWorkspace) {
			return savedCurrentWorkspace;
		}

		return null;
	}

	/**
	 * Apply workspace settings
	 */
	async applyWorkspaceSettings(): Promise<void> {
		const workspaceId = this.getWorkspaceId();
		if (!this.plugin.workspaceManager || !workspaceId) return;

		const settings = this.plugin.workspaceManager.getEffectiveSettings(
			workspaceId
		);

		// Workspace settings are now restored via restoreFilterStateFromWorkspace
		// This method is kept for future workspace-specific settings that are not filter-related
	}

	/**
	 * Switch to a different workspace
	 */
	async switchWorkspace(workspaceId: string): Promise<void> {
		// Save current workspace before switching
		this.saveWorkspaceLayout();

		// Update workspace ID will be handled by caller
		// This method just handles the save/restore logic
	}

	/**
	 * Save filter state to workspace (debounced to avoid infinite loops)
	 */
	saveFilterStateToWorkspace = debounce(
		() => {
			const workspaceId = this.getWorkspaceId();
			const viewId = this.getCurrentViewId();

			if (!this.plugin.workspaceManager || !workspaceId) return;

			const effectiveSettings =
				this.plugin.workspaceManager.getEffectiveSettings(
					workspaceId
				);

			// Save current filter state
			if (!effectiveSettings.v2FilterState) {
				effectiveSettings.v2FilterState = {};
			}

			const viewState = this.getViewState();
			const currentFilterState = this.getCurrentFilterState();

			// Build payload (do NOT persist ephemeral fields across workspaces)
			const payload = {
				filters: viewState.filters,
				selectedProject: viewState.selectedProject,
				advancedFilter: currentFilterState,
				viewMode: viewState.viewMode,
			};
			effectiveSettings.v2FilterState[viewId] = payload;

			console.log("[FluentWorkspace] saveFilterStateToWorkspace", {
				workspaceId: workspaceId,
				viewId: viewId,
				searchQuery: viewState.searchQuery,
				selectedProject: viewState.selectedProject,
				hasAdvanced: !!currentFilterState,
				groups: (currentFilterState as any)?.filterGroups?.length ?? 0,
			});

			// Use saveOverridesQuietly to avoid triggering SETTINGS_CHANGED event
			this.plugin.workspaceManager
				.saveOverridesQuietly(workspaceId, effectiveSettings)
				.then(() =>
					console.log("[FluentWorkspace] overrides saved quietly", {
						workspaceId: workspaceId,
						viewId: viewId,
					})
				)
				.catch((e) =>
					console.warn("[FluentWorkspace] failed to save overrides", e)
				);
		},
		500,
		true
	);

	/**
	 * Restore filter state from workspace
	 */
	restoreFilterStateFromWorkspace(): {
		filters: any;
		selectedProject: string | undefined;
		advancedFilter: RootFilterState | null;
		viewMode: ViewMode;
		shouldClearSearch: boolean;
	} | null {
		const workspaceId = this.getWorkspaceId();
		const viewId = this.getCurrentViewId();

		if (!this.plugin.workspaceManager || !workspaceId) return null;

		const effectiveSettings =
			this.plugin.workspaceManager.getEffectiveSettings(workspaceId);

		const saved =
			effectiveSettings.v2FilterState?.[viewId] ?? null;

		console.log("[FluentWorkspace] restoreFilterStateFromWorkspace", {
			workspaceId: workspaceId,
			viewId: viewId,
			hasSaved: !!saved,
			savedSearch: saved?.searchQuery ?? "",
			savedProject: saved?.selectedProject ?? null,
			hasAdvanced: !!saved?.advancedFilter,
			groups: saved?.advancedFilter?.filterGroups?.length ?? 0,
		});

		if (saved) {
			const savedState = saved;

			return {
				filters: savedState.filters || {},
				selectedProject: savedState.selectedProject,
				advancedFilter: savedState.advancedFilter || null,
				viewMode: savedState.viewMode || "list",
				shouldClearSearch: true, // Always clear searchQuery on workspace restore
			};
		} else {
			// No saved state for this view in this workspace
			return {
				filters: {},
				selectedProject: undefined,
				advancedFilter: null,
				viewMode: "list",
				shouldClearSearch: true,
			};
		}
	}

	/**
	 * Get saved workspace ID from localStorage
	 */
	getSavedWorkspaceId(): string | null {
		return localStorage.getItem("task-genius-v2-current-workspace");
	}

	/**
	 * Clear workspace state from localStorage
	 */
	clearWorkspaceState(): void {
		localStorage.removeItem("task-genius-v2-current-workspace");
	}

	/**
	 * Clean up on unload
	 */
	onunload(): void {
		// Save state before unload
		this.saveWorkspaceLayout();
		super.onunload();
	}
}