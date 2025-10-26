import { __awaiter } from "tslib";
import { Component, debounce } from "obsidian";
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
    constructor(app, plugin, getWorkspaceId, getCurrentViewId, getViewState, getCurrentFilterState, getLiveFilterState) {
        super();
        this.app = app;
        this.plugin = plugin;
        this.getWorkspaceId = getWorkspaceId;
        this.getCurrentViewId = getCurrentViewId;
        this.getViewState = getViewState;
        this.getCurrentFilterState = getCurrentFilterState;
        this.getLiveFilterState = getLiveFilterState;
        // Flag to prevent infinite loops during save
        this.isSavingFilterState = false;
        /**
         * Save filter state to workspace (debounced to avoid infinite loops)
         */
        this.saveFilterStateToWorkspace = debounce(() => {
            var _a, _b;
            const workspaceId = this.getWorkspaceId();
            const viewId = this.getCurrentViewId();
            if (!this.plugin.workspaceManager || !workspaceId)
                return;
            const effectiveSettings = this.plugin.workspaceManager.getEffectiveSettings(workspaceId);
            // Save current filter state
            if (!effectiveSettings.fluentFilterState) {
                effectiveSettings.fluentFilterState = {};
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
            effectiveSettings.fluentFilterState[viewId] = payload;
            console.log("[FluentWorkspace] saveFilterStateToWorkspace", {
                workspaceId: workspaceId,
                viewId: viewId,
                searchQuery: viewState.searchQuery,
                selectedProject: viewState.selectedProject,
                hasAdvanced: !!currentFilterState,
                groups: (_b = (_a = currentFilterState === null || currentFilterState === void 0 ? void 0 : currentFilterState.filterGroups) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0,
            });
            // Use saveOverridesQuietly to avoid triggering SETTINGS_CHANGED event
            this.plugin.workspaceManager
                .saveOverridesQuietly(workspaceId, effectiveSettings)
                .then(() => console.log("[FluentWorkspace] overrides saved quietly", {
                workspaceId: workspaceId,
                viewId: viewId,
            }))
                .catch((e) => console.warn("[FluentWorkspace] failed to save overrides", e));
        }, 500, true);
    }
    /**
     * Save workspace layout (filter state and preferences)
     */
    saveWorkspaceLayout() {
        const workspaceId = this.getWorkspaceId();
        if (!workspaceId)
            return;
        // Save filter state
        this.saveFilterStateToWorkspace();
        // Save current workspace ID to localStorage for persistence
        localStorage.setItem("task-genius-fluent-current-workspace", workspaceId);
    }
    /**
     * Load workspace layout (filter state and preferences)
     */
    loadWorkspaceLayout() {
        // Load current workspace from localStorage
        const savedCurrentWorkspace = localStorage.getItem("task-genius-fluent-current-workspace");
        if (savedCurrentWorkspace) {
            return savedCurrentWorkspace;
        }
        return null;
    }
    /**
     * Apply workspace settings
     */
    applyWorkspaceSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            const workspaceId = this.getWorkspaceId();
            if (!this.plugin.workspaceManager || !workspaceId)
                return;
            const settings = this.plugin.workspaceManager.getEffectiveSettings(workspaceId);
            // Workspace settings are now restored via restoreFilterStateFromWorkspace
            // This method is kept for future workspace-specific settings that are not filter-related
        });
    }
    /**
     * Switch to a different workspace
     */
    switchWorkspace(workspaceId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Save current workspace before switching
            this.saveWorkspaceLayout();
            // Update workspace ID will be handled by caller
            // This method just handles the save/restore logic
        });
    }
    /**
     * Restore filter state from workspace
     */
    restoreFilterStateFromWorkspace() {
        var _a, _b;
        const workspaceId = this.getWorkspaceId();
        const viewId = this.getCurrentViewId();
        if (!this.plugin.workspaceManager || !workspaceId)
            return null;
        const effectiveSettings = this.plugin.workspaceManager.getEffectiveSettings(workspaceId);
        const saved = (_b = (_a = effectiveSettings.fluentFilterState) === null || _a === void 0 ? void 0 : _a[viewId]) !== null && _b !== void 0 ? _b : null;
        if (saved) {
            const savedState = saved;
            return {
                filters: savedState.filters || {},
                selectedProject: savedState.selectedProject,
                advancedFilter: savedState.advancedFilter || null,
                viewMode: savedState.viewMode || "list",
                shouldClearSearch: true, // Always clear searchQuery on workspace restore
            };
        }
        else {
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
    getSavedWorkspaceId() {
        return localStorage.getItem("task-genius-fluent-current-workspace");
    }
    /**
     * Clear workspace state from localStorage
     */
    clearWorkspaceState() {
        localStorage.removeItem("task-genius-fluent-current-workspace");
    }
    /**
     * Clean up on unload
     */
    onunload() {
        // Save state before unload
        this.saveWorkspaceLayout();
        super.onunload();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmx1ZW50V29ya3NwYWNlU3RhdGVNYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiRmx1ZW50V29ya3NwYWNlU3RhdGVNYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBQU8sU0FBUyxFQUFFLFFBQVEsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUtwRDs7Ozs7Ozs7R0FRRztBQUNILE1BQU0sT0FBTywyQkFBNEIsU0FBUSxTQUFTO0lBSXpELFlBQ1MsR0FBUSxFQUNSLE1BQTZCLEVBQzdCLGNBQTRCLEVBQzVCLGdCQUE4QixFQUM5QixZQUtQLEVBQ08scUJBQW1ELEVBQ25ELGtCQUFnRDtRQUV4RCxLQUFLLEVBQUUsQ0FBQztRQWJBLFFBQUcsR0FBSCxHQUFHLENBQUs7UUFDUixXQUFNLEdBQU4sTUFBTSxDQUF1QjtRQUM3QixtQkFBYyxHQUFkLGNBQWMsQ0FBYztRQUM1QixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWM7UUFDOUIsaUJBQVksR0FBWixZQUFZLENBS25CO1FBQ08sMEJBQXFCLEdBQXJCLHFCQUFxQixDQUE4QjtRQUNuRCx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQThCO1FBZnpELDZDQUE2QztRQUNyQyx3QkFBbUIsR0FBRyxLQUFLLENBQUM7UUE2RXBDOztXQUVHO1FBQ0gsK0JBQTBCLEdBQUcsUUFBUSxDQUNwQyxHQUFHLEVBQUU7O1lBQ0osTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzFDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBRXZDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixJQUFJLENBQUMsV0FBVztnQkFBRSxPQUFPO1lBRTFELE1BQU0saUJBQWlCLEdBQ3RCLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLENBQUM7WUFFaEUsNEJBQTRCO1lB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QUFDO0lBRUQ7O09BRUc7SUFDSCxtQkFBbUI7UUFDbEIsWUFBWSxDQUFDLFVBQVUsQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO0lBQ2pFLENBQUM7SUFFRDs7T0FFRztJQUNILFFBQVE7UUFDUCwyQkFBMkI7UUFDM0IsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDM0IsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ2xCLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcCwgQ29tcG9uZW50LCBkZWJvdW5jZSB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7IFJvb3RGaWx0ZXJTdGF0ZSB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay9maWx0ZXIvVmlld1Rhc2tGaWx0ZXJcIjtcclxuaW1wb3J0IHsgVmlld01vZGUgfSBmcm9tIFwiLi4vY29tcG9uZW50cy9GbHVlbnRUb3BOYXZpZ2F0aW9uXCI7XHJcblxyXG4vKipcclxuICogRmx1ZW50V29ya3NwYWNlU3RhdGVNYW5hZ2VyIC0gTWFuYWdlcyB3b3Jrc3BhY2Ugc3RhdGUgcGVyc2lzdGVuY2VcclxuICpcclxuICogUmVzcG9uc2liaWxpdGllczpcclxuICogLSBTYXZlL3Jlc3RvcmUgd29ya3NwYWNlIGxheW91dCAoZmlsdGVyIHN0YXRlLCB2aWV3IHByZWZlcmVuY2VzKVxyXG4gKiAtIFdvcmtzcGFjZSBzd2l0Y2hpbmdcclxuICogLSBGaWx0ZXIgc3RhdGUgcGVyc2lzdGVuY2UgdG8gd29ya3NwYWNlIG92ZXJyaWRlc1xyXG4gKiAtIExvY2FsU3RvcmFnZSBtYW5hZ2VtZW50IGZvciBjdXJyZW50IHdvcmtzcGFjZVxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIEZsdWVudFdvcmtzcGFjZVN0YXRlTWFuYWdlciBleHRlbmRzIENvbXBvbmVudCB7XHJcblx0Ly8gRmxhZyB0byBwcmV2ZW50IGluZmluaXRlIGxvb3BzIGR1cmluZyBzYXZlXHJcblx0cHJpdmF0ZSBpc1NhdmluZ0ZpbHRlclN0YXRlID0gZmFsc2U7XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cHJpdmF0ZSBhcHA6IEFwcCxcclxuXHRcdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRwcml2YXRlIGdldFdvcmtzcGFjZUlkOiAoKSA9PiBzdHJpbmcsXHJcblx0XHRwcml2YXRlIGdldEN1cnJlbnRWaWV3SWQ6ICgpID0+IHN0cmluZyxcclxuXHRcdHByaXZhdGUgZ2V0Vmlld1N0YXRlOiAoKSA9PiB7XHJcblx0XHRcdGZpbHRlcnM6IGFueTtcclxuXHRcdFx0c2VsZWN0ZWRQcm9qZWN0OiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcblx0XHRcdHNlYXJjaFF1ZXJ5OiBzdHJpbmc7XHJcblx0XHRcdHZpZXdNb2RlOiBWaWV3TW9kZTtcclxuXHRcdH0sXHJcblx0XHRwcml2YXRlIGdldEN1cnJlbnRGaWx0ZXJTdGF0ZTogKCkgPT4gUm9vdEZpbHRlclN0YXRlIHwgbnVsbCxcclxuXHRcdHByaXZhdGUgZ2V0TGl2ZUZpbHRlclN0YXRlOiAoKSA9PiBSb290RmlsdGVyU3RhdGUgfCBudWxsXHJcblx0KSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2F2ZSB3b3Jrc3BhY2UgbGF5b3V0IChmaWx0ZXIgc3RhdGUgYW5kIHByZWZlcmVuY2VzKVxyXG5cdCAqL1xyXG5cdHNhdmVXb3Jrc3BhY2VMYXlvdXQoKTogdm9pZCB7XHJcblx0XHRjb25zdCB3b3Jrc3BhY2VJZCA9IHRoaXMuZ2V0V29ya3NwYWNlSWQoKTtcclxuXHRcdGlmICghd29ya3NwYWNlSWQpIHJldHVybjtcclxuXHJcblx0XHQvLyBTYXZlIGZpbHRlciBzdGF0ZVxyXG5cdFx0dGhpcy5zYXZlRmlsdGVyU3RhdGVUb1dvcmtzcGFjZSgpO1xyXG5cclxuXHRcdC8vIFNhdmUgY3VycmVudCB3b3Jrc3BhY2UgSUQgdG8gbG9jYWxTdG9yYWdlIGZvciBwZXJzaXN0ZW5jZVxyXG5cdFx0bG9jYWxTdG9yYWdlLnNldEl0ZW0oXHJcblx0XHRcdFwidGFzay1nZW5pdXMtZmx1ZW50LWN1cnJlbnQtd29ya3NwYWNlXCIsXHJcblx0XHRcdHdvcmtzcGFjZUlkXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTG9hZCB3b3Jrc3BhY2UgbGF5b3V0IChmaWx0ZXIgc3RhdGUgYW5kIHByZWZlcmVuY2VzKVxyXG5cdCAqL1xyXG5cdGxvYWRXb3Jrc3BhY2VMYXlvdXQoKTogc3RyaW5nIHwgbnVsbCB7XHJcblx0XHQvLyBMb2FkIGN1cnJlbnQgd29ya3NwYWNlIGZyb20gbG9jYWxTdG9yYWdlXHJcblx0XHRjb25zdCBzYXZlZEN1cnJlbnRXb3Jrc3BhY2UgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcclxuXHRcdFx0XCJ0YXNrLWdlbml1cy1mbHVlbnQtY3VycmVudC13b3Jrc3BhY2VcIlxyXG5cdFx0KTtcclxuXHJcblx0XHRpZiAoc2F2ZWRDdXJyZW50V29ya3NwYWNlKSB7XHJcblx0XHRcdHJldHVybiBzYXZlZEN1cnJlbnRXb3Jrc3BhY2U7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIG51bGw7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBBcHBseSB3b3Jrc3BhY2Ugc2V0dGluZ3NcclxuXHQgKi9cclxuXHRhc3luYyBhcHBseVdvcmtzcGFjZVNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Y29uc3Qgd29ya3NwYWNlSWQgPSB0aGlzLmdldFdvcmtzcGFjZUlkKCk7XHJcblx0XHRpZiAoIXRoaXMucGx1Z2luLndvcmtzcGFjZU1hbmFnZXIgfHwgIXdvcmtzcGFjZUlkKSByZXR1cm47XHJcblxyXG5cdFx0Y29uc3Qgc2V0dGluZ3MgPVxyXG5cdFx0XHR0aGlzLnBsdWdpbi53b3Jrc3BhY2VNYW5hZ2VyLmdldEVmZmVjdGl2ZVNldHRpbmdzKHdvcmtzcGFjZUlkKTtcclxuXHJcblx0XHQvLyBXb3Jrc3BhY2Ugc2V0dGluZ3MgYXJlIG5vdyByZXN0b3JlZCB2aWEgcmVzdG9yZUZpbHRlclN0YXRlRnJvbVdvcmtzcGFjZVxyXG5cdFx0Ly8gVGhpcyBtZXRob2QgaXMga2VwdCBmb3IgZnV0dXJlIHdvcmtzcGFjZS1zcGVjaWZpYyBzZXR0aW5ncyB0aGF0IGFyZSBub3QgZmlsdGVyLXJlbGF0ZWRcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFN3aXRjaCB0byBhIGRpZmZlcmVudCB3b3Jrc3BhY2VcclxuXHQgKi9cclxuXHRhc3luYyBzd2l0Y2hXb3Jrc3BhY2Uod29ya3NwYWNlSWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Ly8gU2F2ZSBjdXJyZW50IHdvcmtzcGFjZSBiZWZvcmUgc3dpdGNoaW5nXHJcblx0XHR0aGlzLnNhdmVXb3Jrc3BhY2VMYXlvdXQoKTtcclxuXHJcblx0XHQvLyBVcGRhdGUgd29ya3NwYWNlIElEIHdpbGwgYmUgaGFuZGxlZCBieSBjYWxsZXJcclxuXHRcdC8vIFRoaXMgbWV0aG9kIGp1c3QgaGFuZGxlcyB0aGUgc2F2ZS9yZXN0b3JlIGxvZ2ljXHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTYXZlIGZpbHRlciBzdGF0ZSB0byB3b3Jrc3BhY2UgKGRlYm91bmNlZCB0byBhdm9pZCBpbmZpbml0ZSBsb29wcylcclxuXHQgKi9cclxuXHRzYXZlRmlsdGVyU3RhdGVUb1dvcmtzcGFjZSA9IGRlYm91bmNlKFxyXG5cdFx0KCkgPT4ge1xyXG5cdFx0XHRjb25zdCB3b3Jrc3BhY2VJZCA9IHRoaXMuZ2V0V29ya3NwYWNlSWQoKTtcclxuXHRcdFx0Y29uc3Qgdmlld0lkID0gdGhpcy5nZXRDdXJyZW50Vmlld0lkKCk7XHJcblxyXG5cdFx0XHRpZiAoIXRoaXMucGx1Z2luLndvcmtzcGFjZU1hbmFnZXIgfHwgIXdvcmtzcGFjZUlkKSByZXR1cm47XHJcblxyXG5cdFx0XHRjb25zdCBlZmZlY3RpdmVTZXR0aW5ncyA9XHJcblx0XHRcdFx0dGhpcy5wbHVnaW4ud29ya3NwYWNlTWFuYWdlci5nZXRFZmZlY3RpdmVTZXR0aW5ncyh3b3Jrc3BhY2VJZCk7XHJcblxyXG5cdFx0XHQvLyBTYXZlIGN1cnJlbnQgZmlsdGVyIHN0YXRlXHJcblx0XHRcdGlmICghZWZmZWN0aXZlU2V0dGluZ3MuZmx1ZW50RmlsdGVyU3RhdGUpIHtcclxuXHRcdFx0XHRlZmZlY3RpdmVTZXR0aW5ncy5mbHVlbnRGaWx0ZXJTdGF0ZSA9IHt9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCB2aWV3U3RhdGUgPSB0aGlzLmdldFZpZXdTdGF0ZSgpO1xyXG5cdFx0XHRjb25zdCBjdXJyZW50RmlsdGVyU3RhdGUgPSB0aGlzLmdldEN1cnJlbnRGaWx0ZXJTdGF0ZSgpO1xyXG5cclxuXHRcdFx0Ly8gQnVpbGQgcGF5bG9hZCAoZG8gTk9UIHBlcnNpc3QgZXBoZW1lcmFsIGZpZWxkcyBhY3Jvc3Mgd29ya3NwYWNlcylcclxuXHRcdFx0Y29uc3QgcGF5bG9hZCA9IHtcclxuXHRcdFx0XHRmaWx0ZXJzOiB2aWV3U3RhdGUuZmlsdGVycyxcclxuXHRcdFx0XHRzZWxlY3RlZFByb2plY3Q6IHZpZXdTdGF0ZS5zZWxlY3RlZFByb2plY3QsXHJcblx0XHRcdFx0YWR2YW5jZWRGaWx0ZXI6IGN1cnJlbnRGaWx0ZXJTdGF0ZSxcclxuXHRcdFx0XHR2aWV3TW9kZTogdmlld1N0YXRlLnZpZXdNb2RlLFxyXG5cdFx0XHR9O1xyXG5cdFx0XHRlZmZlY3RpdmVTZXR0aW5ncy5mbHVlbnRGaWx0ZXJTdGF0ZVt2aWV3SWRdID0gcGF5bG9hZDtcclxuXHJcblx0XHRcdGNvbnNvbGUubG9nKFwiW0ZsdWVudFdvcmtzcGFjZV0gc2F2ZUZpbHRlclN0YXRlVG9Xb3Jrc3BhY2VcIiwge1xyXG5cdFx0XHRcdHdvcmtzcGFjZUlkOiB3b3Jrc3BhY2VJZCxcclxuXHRcdFx0XHR2aWV3SWQ6IHZpZXdJZCxcclxuXHRcdFx0XHRzZWFyY2hRdWVyeTogdmlld1N0YXRlLnNlYXJjaFF1ZXJ5LFxyXG5cdFx0XHRcdHNlbGVjdGVkUHJvamVjdDogdmlld1N0YXRlLnNlbGVjdGVkUHJvamVjdCxcclxuXHRcdFx0XHRoYXNBZHZhbmNlZDogISFjdXJyZW50RmlsdGVyU3RhdGUsXHJcblx0XHRcdFx0Z3JvdXBzOiAoY3VycmVudEZpbHRlclN0YXRlIGFzIGFueSk/LmZpbHRlckdyb3Vwcz8ubGVuZ3RoID8/IDAsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gVXNlIHNhdmVPdmVycmlkZXNRdWlldGx5IHRvIGF2b2lkIHRyaWdnZXJpbmcgU0VUVElOR1NfQ0hBTkdFRCBldmVudFxyXG5cdFx0XHR0aGlzLnBsdWdpbi53b3Jrc3BhY2VNYW5hZ2VyXHJcblx0XHRcdFx0LnNhdmVPdmVycmlkZXNRdWlldGx5KHdvcmtzcGFjZUlkLCBlZmZlY3RpdmVTZXR0aW5ncylcclxuXHRcdFx0XHQudGhlbigoKSA9PlxyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXCJbRmx1ZW50V29ya3NwYWNlXSBvdmVycmlkZXMgc2F2ZWQgcXVpZXRseVwiLCB7XHJcblx0XHRcdFx0XHRcdHdvcmtzcGFjZUlkOiB3b3Jrc3BhY2VJZCxcclxuXHRcdFx0XHRcdFx0dmlld0lkOiB2aWV3SWQsXHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdClcclxuXHRcdFx0XHQuY2F0Y2goKGUpID0+XHJcblx0XHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRcdFwiW0ZsdWVudFdvcmtzcGFjZV0gZmFpbGVkIHRvIHNhdmUgb3ZlcnJpZGVzXCIsXHJcblx0XHRcdFx0XHRcdGVcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHQpO1xyXG5cdFx0fSxcclxuXHRcdDUwMCxcclxuXHRcdHRydWVcclxuXHQpO1xyXG5cclxuXHQvKipcclxuXHQgKiBSZXN0b3JlIGZpbHRlciBzdGF0ZSBmcm9tIHdvcmtzcGFjZVxyXG5cdCAqL1xyXG5cdHJlc3RvcmVGaWx0ZXJTdGF0ZUZyb21Xb3Jrc3BhY2UoKToge1xyXG5cdFx0ZmlsdGVyczogYW55O1xyXG5cdFx0c2VsZWN0ZWRQcm9qZWN0OiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcblx0XHRhZHZhbmNlZEZpbHRlcjogUm9vdEZpbHRlclN0YXRlIHwgbnVsbDtcclxuXHRcdHZpZXdNb2RlOiBWaWV3TW9kZTtcclxuXHRcdHNob3VsZENsZWFyU2VhcmNoOiBib29sZWFuO1xyXG5cdH0gfCBudWxsIHtcclxuXHRcdGNvbnN0IHdvcmtzcGFjZUlkID0gdGhpcy5nZXRXb3Jrc3BhY2VJZCgpO1xyXG5cdFx0Y29uc3Qgdmlld0lkID0gdGhpcy5nZXRDdXJyZW50Vmlld0lkKCk7XHJcblxyXG5cdFx0aWYgKCF0aGlzLnBsdWdpbi53b3Jrc3BhY2VNYW5hZ2VyIHx8ICF3b3Jrc3BhY2VJZCkgcmV0dXJuIG51bGw7XHJcblxyXG5cdFx0Y29uc3QgZWZmZWN0aXZlU2V0dGluZ3MgPVxyXG5cdFx0XHR0aGlzLnBsdWdpbi53b3Jrc3BhY2VNYW5hZ2VyLmdldEVmZmVjdGl2ZVNldHRpbmdzKHdvcmtzcGFjZUlkKTtcclxuXHJcblx0XHRjb25zdCBzYXZlZCA9IGVmZmVjdGl2ZVNldHRpbmdzLmZsdWVudEZpbHRlclN0YXRlPy5bdmlld0lkXSA/PyBudWxsO1xyXG5cclxuXHRcdGlmIChzYXZlZCkge1xyXG5cdFx0XHRjb25zdCBzYXZlZFN0YXRlID0gc2F2ZWQ7XHJcblxyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdGZpbHRlcnM6IHNhdmVkU3RhdGUuZmlsdGVycyB8fCB7fSxcclxuXHRcdFx0XHRzZWxlY3RlZFByb2plY3Q6IHNhdmVkU3RhdGUuc2VsZWN0ZWRQcm9qZWN0LFxyXG5cdFx0XHRcdGFkdmFuY2VkRmlsdGVyOiBzYXZlZFN0YXRlLmFkdmFuY2VkRmlsdGVyIHx8IG51bGwsXHJcblx0XHRcdFx0dmlld01vZGU6IHNhdmVkU3RhdGUudmlld01vZGUgfHwgXCJsaXN0XCIsXHJcblx0XHRcdFx0c2hvdWxkQ2xlYXJTZWFyY2g6IHRydWUsIC8vIEFsd2F5cyBjbGVhciBzZWFyY2hRdWVyeSBvbiB3b3Jrc3BhY2UgcmVzdG9yZVxyXG5cdFx0XHR9O1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gTm8gc2F2ZWQgc3RhdGUgZm9yIHRoaXMgdmlldyBpbiB0aGlzIHdvcmtzcGFjZVxyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdGZpbHRlcnM6IHt9LFxyXG5cdFx0XHRcdHNlbGVjdGVkUHJvamVjdDogdW5kZWZpbmVkLFxyXG5cdFx0XHRcdGFkdmFuY2VkRmlsdGVyOiBudWxsLFxyXG5cdFx0XHRcdHZpZXdNb2RlOiBcImxpc3RcIixcclxuXHRcdFx0XHRzaG91bGRDbGVhclNlYXJjaDogdHJ1ZSxcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBzYXZlZCB3b3Jrc3BhY2UgSUQgZnJvbSBsb2NhbFN0b3JhZ2VcclxuXHQgKi9cclxuXHRnZXRTYXZlZFdvcmtzcGFjZUlkKCk6IHN0cmluZyB8IG51bGwge1xyXG5cdFx0cmV0dXJuIGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwidGFzay1nZW5pdXMtZmx1ZW50LWN1cnJlbnQtd29ya3NwYWNlXCIpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2xlYXIgd29ya3NwYWNlIHN0YXRlIGZyb20gbG9jYWxTdG9yYWdlXHJcblx0ICovXHJcblx0Y2xlYXJXb3Jrc3BhY2VTdGF0ZSgpOiB2b2lkIHtcclxuXHRcdGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKFwidGFzay1nZW5pdXMtZmx1ZW50LWN1cnJlbnQtd29ya3NwYWNlXCIpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2xlYW4gdXAgb24gdW5sb2FkXHJcblx0ICovXHJcblx0b251bmxvYWQoKTogdm9pZCB7XHJcblx0XHQvLyBTYXZlIHN0YXRlIGJlZm9yZSB1bmxvYWRcclxuXHRcdHRoaXMuc2F2ZVdvcmtzcGFjZUxheW91dCgpO1xyXG5cdFx0c3VwZXIub251bmxvYWQoKTtcclxuXHR9XHJcbn1cclxuIl19