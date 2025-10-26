import { __awaiter } from "tslib";
import { FluentTaskView, FLUENT_TASK_VIEW } from "@/pages/FluentTaskView";
import { LeftSidebarView, TG_LEFT_SIDEBAR_VIEW_TYPE } from "@/pages/LeftSidebarView";
import { RightDetailView, TG_RIGHT_DETAIL_VIEW_TYPE } from "@/pages/RightDetailView";
import { TASK_VIEW_TYPE } from "@/pages/TaskView";
export class FluentIntegration {
    constructor(plugin) {
        this.revealingSideLeaves = false;
        this.plugin = plugin;
    }
    /**
     * Register Fluent view and commands
     */
    register() {
        // Only register if experimental features are enabled
        if (!this.isFluentEnabled()) {
            return;
        }
        // Register the Fluent view
        this.plugin.registerView(FLUENT_TASK_VIEW, (leaf) => new FluentTaskView(leaf, this.plugin));
        // Register side leaf views for new architecture
        this.plugin.registerView(TG_LEFT_SIDEBAR_VIEW_TYPE, (leaf) => new LeftSidebarView(leaf, this.plugin));
        this.plugin.registerView(TG_RIGHT_DETAIL_VIEW_TYPE, (leaf) => new RightDetailView(leaf, this.plugin));
        // When any of the V2 views becomes active, reveal the other side leaves without focusing them
        this.plugin.registerEvent(this.plugin.app.workspace.on("active-leaf-change", (leaf) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            if (this.revealingSideLeaves)
                return;
            const useSideLeaves = !!((_a = (this.plugin.settings.fluentView)) === null || _a === void 0 ? void 0 : _a.useWorkspaceSideLeaves);
            if (!useSideLeaves || !((_b = leaf === null || leaf === void 0 ? void 0 : leaf.view) === null || _b === void 0 ? void 0 : _b.getViewType))
                return;
            const vt = leaf.view.getViewType();
            const watched = new Set([
                FLUENT_TASK_VIEW,
                TG_LEFT_SIDEBAR_VIEW_TYPE,
                TG_RIGHT_DETAIL_VIEW_TYPE,
            ]);
            if (!watched.has(vt))
                return;
            const ws = this.plugin.app.workspace;
            this.revealingSideLeaves = true;
            try {
                // Ensure side leaves exist
                const leftLeaf = yield ws.ensureSideLeaf(TG_LEFT_SIDEBAR_VIEW_TYPE, "left", { active: false });
                const rightLeaf = yield ws.ensureSideLeaf(TG_RIGHT_DETAIL_VIEW_TYPE, "right", { active: false });
                // Bring them to front within their splits (without keeping focus)
                if (leftLeaf)
                    ws.revealLeaf(leftLeaf);
                if (rightLeaf)
                    ws.revealLeaf(rightLeaf);
                // Expand sidebars if they are collapsed
                if (((_c = ws.leftSplit) === null || _c === void 0 ? void 0 : _c.collapsed) && typeof ws.leftSplit.expand === "function")
                    ws.leftSplit.expand();
                if (((_d = ws.rightSplit) === null || _d === void 0 ? void 0 : _d.collapsed) && typeof ws.rightSplit.expand === "function")
                    ws.rightSplit.expand();
                // Restore focus to the currently active (incoming) leaf
                if (ws.setActiveLeaf && leaf)
                    ws.setActiveLeaf(leaf, { focus: true });
            }
            catch (_) {
                // noop
            }
            finally {
                this.revealingSideLeaves = false;
            }
        })));
    }
    /**
     * Open the Fluent view
     */
    openV2View() {
        return __awaiter(this, void 0, void 0, function* () {
            const { workspace } = this.plugin.app;
            // Check if Fluent view is already open
            const leaves = workspace.getLeavesOfType(FLUENT_TASK_VIEW);
            if (leaves.length > 0) {
                // Focus existing view
                workspace.revealLeaf(leaves[0]);
                // Ensure side leaves if configured
                yield this.ensureSideLeavesIfEnabled();
                return;
            }
            // Create new Fluent view
            const leaf = workspace.getLeaf("tab");
            yield leaf.setViewState({
                type: FLUENT_TASK_VIEW,
                active: true,
            });
            workspace.revealLeaf(leaf);
            // Ensure side leaves if configured
            yield this.ensureSideLeavesIfEnabled();
        });
    }
    ensureSideLeavesIfEnabled() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const useSideLeaves = !!((_a = (this.plugin.settings.fluentView)) === null || _a === void 0 ? void 0 : _a.useWorkspaceSideLeaves);
            if (!useSideLeaves)
                return;
            const ws = this.plugin.app.workspace;
            // Left sidebar
            yield ws.ensureSideLeaf(TG_LEFT_SIDEBAR_VIEW_TYPE, "left", { active: false });
            yield ws.ensureSideLeaf(TG_RIGHT_DETAIL_VIEW_TYPE, "right", { active: false });
        });
    }
    /**
     * Check if Fluent features are enabled
     */
    isFluentEnabled() {
        var _a, _b;
        return (_b = (_a = this.plugin.settings.fluentView) === null || _a === void 0 ? void 0 : _a.enableFluent) !== null && _b !== void 0 ? _b : false;
    }
    /**
     * Migrate settings from V1 to V2
     */
    migrateSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.plugin.settings.fluentView) {
                this.plugin.settings.fluentView = {
                    enableFluent: false,
                    showFluentRibbon: false,
                };
            }
            // Default workspace configuration
            if (!this.plugin.settings.fluentView.workspaces) {
                this.plugin.settings.fluentView.workspaces = [
                    { id: "default", name: "Default", color: "#3498db" },
                ];
            }
            // Default Fluent configuration
            if (this.plugin.settings.fluentView.fluentConfig === undefined) {
                this.plugin.settings.fluentView.fluentConfig = {
                    enableWorkspaces: true,
                    defaultWorkspace: "default",
                    showTopNavigation: true,
                    showNewSidebar: true,
                    allowViewSwitching: true,
                    persistViewMode: true,
                    maxOtherViewsBeforeOverflow: 5,
                };
            }
            // Backfill extra experimental flag without touching types
            const v2c = this.plugin.settings.fluentView;
            if (v2c.useWorkspaceSideLeaves === undefined)
                v2c.useWorkspaceSideLeaves = true;
            yield this.plugin.saveSettings();
        });
    }
    /**
     * Toggle between V1 and Fluent views
     */
    toggleVersion() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const { workspace } = this.plugin.app;
            // Close all V1 views
            const v1Leaves = workspace.getLeavesOfType(TASK_VIEW_TYPE);
            v1Leaves.forEach((leaf) => leaf.detach());
            // Close all Fluent views
            const v2Leaves = workspace.getLeavesOfType(FLUENT_TASK_VIEW);
            v2Leaves.forEach((leaf) => leaf.detach());
            // Toggle the setting
            if (!this.plugin.settings.fluentView) {
                this.plugin.settings.fluentView = {
                    enableFluent: false,
                    showFluentRibbon: false,
                };
            }
            this.plugin.settings.fluentView.enableFluent =
                !this.plugin.settings.fluentView.enableFluent;
            yield this.plugin.saveSettings();
            // Open the appropriate view
            if ((_a = this.plugin.settings.fluentView) === null || _a === void 0 ? void 0 : _a.enableFluent) {
                yield this.openV2View();
            }
            else {
                // Open V1 view
                const leaf = workspace.getLeaf("tab");
                yield leaf.setViewState({
                    type: TASK_VIEW_TYPE,
                    active: true,
                });
                workspace.revealLeaf(leaf);
            }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmx1ZW50SW50ZWdyYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJGbHVlbnRJbnRlZ3JhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBRUEsT0FBTyxFQUFFLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzFFLE9BQU8sRUFBRSxlQUFlLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUNyRixPQUFPLEVBQUUsZUFBZSxFQUFFLHlCQUF5QixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFckYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBRWxELE1BQU0sT0FBTyxpQkFBaUI7SUFJN0IsWUFBWSxNQUE2QjtRQUZqQyx3QkFBbUIsR0FBRyxLQUFLLENBQUM7UUFHbkMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDdEIsQ0FBQztJQUVEOztPQUVHO0lBQ0ksUUFBUTtRQUNkLHFEQUFxRDtRQUNyRCxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxFQUFFO1lBQzVCLE9BQU87U0FDUDtRQUVELDJCQUEyQjtRQUMzQixJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FDdkIsZ0JBQWdCLEVBQ2hCLENBQUMsSUFBbUIsRUFBRSxFQUFFLENBQUMsSUFBSSxjQUFjLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FDOUQsQ0FBQztRQUdGLGdEQUFnRDtRQUNoRCxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FDdkIseUJBQXlCLEVBQ3pCLENBQUMsSUFBbUIsRUFBRSxFQUFFLENBQUMsSUFBSSxlQUFlLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FDL0QsQ0FBQztRQUNGLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUN2Qix5QkFBeUIsRUFDekIsQ0FBQyxJQUFtQixFQUFFLEVBQUUsQ0FBQyxJQUFJLGVB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QUUsWUFBWSxFQUFFO2dCQUNsRCxNQUFNLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQzthQUN4QjtpQkFBTTtnQkFDTixlQUFlO2dCQUNmLE1BQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3RDLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQztvQkFDdkIsSUFBSSxFQUFFLGNBQWM7b0JBQ3BCLE1BQU0sRUFBRSxJQUFJO2lCQUNaLENBQUMsQ0FBQztnQkFDSCxTQUFTLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQzNCOztLQUNEO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBXb3Jrc3BhY2UsIFdvcmtzcGFjZUxlYWYgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5pbXBvcnQgeyBGbHVlbnRUYXNrVmlldywgRkxVRU5UX1RBU0tfVklFVyB9IGZyb20gXCJAL3BhZ2VzL0ZsdWVudFRhc2tWaWV3XCI7XHJcbmltcG9ydCB7IExlZnRTaWRlYmFyVmlldywgVEdfTEVGVF9TSURFQkFSX1ZJRVdfVFlQRSB9IGZyb20gXCJAL3BhZ2VzL0xlZnRTaWRlYmFyVmlld1wiO1xyXG5pbXBvcnQgeyBSaWdodERldGFpbFZpZXcsIFRHX1JJR0hUX0RFVEFJTF9WSUVXX1RZUEUgfSBmcm9tIFwiQC9wYWdlcy9SaWdodERldGFpbFZpZXdcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHsgVEFTS19WSUVXX1RZUEUgfSBmcm9tIFwiQC9wYWdlcy9UYXNrVmlld1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEZsdWVudEludGVncmF0aW9uIHtcclxuXHRwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luO1xyXG5cdHByaXZhdGUgcmV2ZWFsaW5nU2lkZUxlYXZlcyA9IGZhbHNlO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbikge1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZWdpc3RlciBGbHVlbnQgdmlldyBhbmQgY29tbWFuZHNcclxuXHQgKi9cclxuXHRwdWJsaWMgcmVnaXN0ZXIoKSB7XHJcblx0XHQvLyBPbmx5IHJlZ2lzdGVyIGlmIGV4cGVyaW1lbnRhbCBmZWF0dXJlcyBhcmUgZW5hYmxlZFxyXG5cdFx0aWYgKCF0aGlzLmlzRmx1ZW50RW5hYmxlZCgpKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZWdpc3RlciB0aGUgRmx1ZW50IHZpZXdcclxuXHRcdHRoaXMucGx1Z2luLnJlZ2lzdGVyVmlldyhcclxuXHRcdFx0RkxVRU5UX1RBU0tfVklFVyxcclxuXHRcdFx0KGxlYWY6IFdvcmtzcGFjZUxlYWYpID0+IG5ldyBGbHVlbnRUYXNrVmlldyhsZWFmLCB0aGlzLnBsdWdpbilcclxuXHRcdCk7XHJcblxyXG5cclxuXHRcdC8vIFJlZ2lzdGVyIHNpZGUgbGVhZiB2aWV3cyBmb3IgbmV3IGFyY2hpdGVjdHVyZVxyXG5cdFx0dGhpcy5wbHVnaW4ucmVnaXN0ZXJWaWV3KFxyXG5cdFx0XHRUR19MRUZUX1NJREVCQVJfVklFV19UWVBFLFxyXG5cdFx0XHQobGVhZjogV29ya3NwYWNlTGVhZikgPT4gbmV3IExlZnRTaWRlYmFyVmlldyhsZWFmLCB0aGlzLnBsdWdpbilcclxuXHRcdCk7XHJcblx0XHR0aGlzLnBsdWdpbi5yZWdpc3RlclZpZXcoXHJcblx0XHRcdFRHX1JJR0hUX0RFVEFJTF9WSUVXX1RZUEUsXHJcblx0XHRcdChsZWFmOiBXb3Jrc3BhY2VMZWFmKSA9PiBuZXcgUmlnaHREZXRhaWxWaWV3KGxlYWYsIHRoaXMucGx1Z2luKVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBXaGVuIGFueSBvZiB0aGUgVjIgdmlld3MgYmVjb21lcyBhY3RpdmUsIHJldmVhbCB0aGUgb3RoZXIgc2lkZSBsZWF2ZXMgd2l0aG91dCBmb2N1c2luZyB0aGVtXHJcblx0XHR0aGlzLnBsdWdpbi5yZWdpc3RlckV2ZW50KFxyXG5cdFx0XHR0aGlzLnBsdWdpbi5hcHAud29ya3NwYWNlLm9uKFwiYWN0aXZlLWxlYWYtY2hhbmdlXCIsIGFzeW5jIChsZWFmKSA9PiB7XHJcblx0XHRcdFx0aWYgKHRoaXMucmV2ZWFsaW5nU2lkZUxlYXZlcykgcmV0dXJuO1xyXG5cdFx0XHRcdGNvbnN0IHVzZVNpZGVMZWF2ZXMgPSAhISh0aGlzLnBsdWdpbi5zZXR0aW5ncy5mbHVlbnRWaWV3KT8udXNlV29ya3NwYWNlU2lkZUxlYXZlcztcclxuXHRcdFx0XHRpZiAoIXVzZVNpZGVMZWF2ZXMgfHwgIWxlYWY/LnZpZXc/LmdldFZpZXdUeXBlKSByZXR1cm47XHJcblx0XHRcdFx0Y29uc3QgdnQgPSBsZWFmLnZpZXcuZ2V0Vmlld1R5cGUoKTtcclxuXHRcdFx0XHRjb25zdCB3YXRjaGVkID0gbmV3IFNldDxzdHJpbmc+KFtcclxuXHRcdFx0XHRcdEZMVUVOVF9UQVNLX1ZJRVcsXHJcblx0XHRcdFx0XHRUR19MRUZUX1NJREVCQVJfVklFV19UWVBFLFxyXG5cdFx0XHRcdFx0VEdfUklHSFRfREVUQUlMX1ZJRVdfVFlQRSxcclxuXHRcdFx0XHRdKTtcclxuXHRcdFx0XHRpZiAoIXdhdGNoZWQuaGFzKHZ0KSkgcmV0dXJuO1xyXG5cdFx0XHRcdGNvbnN0IHdzID0gdGhpcy5wbHVnaW4uYXBwLndvcmtzcGFjZSBhcyBXb3Jrc3BhY2UgJiBhbnk7XHJcblx0XHRcdFx0dGhpcy5yZXZlYWxpbmdTaWRlTGVhdmVzID0gdHJ1ZTtcclxuXHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0Ly8gRW5zdXJlIHNpZGUgbGVhdmVzIGV4aXN0XHJcblx0XHRcdFx0XHRjb25zdCBsZWZ0TGVhZiA9IGF3YWl0IHdzLmVuc3VyZVNpZGVMZWFmKFRHX0xFRlRfU0lERUJBUl9WSUVXX1RZUEUsIFwibGVmdFwiLCB7YWN0aXZlOiBmYWxzZX0pO1xyXG5cdFx0XHRcdFx0Y29uc3QgcmlnaHRMZWFmID0gYXdhaXQgd3MuZW5zdXJlU2lkZUxlYWYoVEdfUklHSFRfREVUQUlMX1ZJRVdfVFlQRSwgXCJyaWdodFwiLCB7YWN0aXZlOiBmYWxzZX0pO1xyXG5cdFx0XHRcdFx0Ly8gQnJpbmcgdGhlbSB0byBmcm9udCB3aXRoaW4gdGhlaXIgc3BsaXRzICh3aXRob3V0IGtlZXBpbmcgZm9jdXMpXHJcblx0XHRcdFx0XHRpZiAobGVmdExlYWYpIHdzLnJldmVhbExlYWYobGVmdExlYWYpO1xyXG5cdFx0XHRcdFx0aWYgKHJpZ2h0TGVhZikgd3MucmV2ZWFsTGVhZihyaWdodExlYWYpO1xyXG5cdFx0XHRcdFx0Ly8gRXhwYW5kIHNpZGViYXJzIGlmIHRoZXkgYXJlIGNvbGxhcHNlZFxyXG5cdFx0XHRcdFx0aWYgKHdzLmxlZnRTcGxpdD8uY29sbGFwc2VkICYmIHR5cGVvZiB3cy5sZWZ0U3BsaXQuZXhwYW5kID09PSBcImZ1bmN0aW9uXCIpIHdzLmxlZnRTcGxpdC5leHBhbmQoKTtcclxuXHRcdFx0XHRcdGlmICh3cy5yaWdodFNwbGl0Py5jb2xsYXBzZWQgJiYgdHlwZW9mIHdzLnJpZ2h0U3BsaXQuZXhwYW5kID09PSBcImZ1bmN0aW9uXCIpIHdzLnJpZ2h0U3BsaXQuZXhwYW5kKCk7XHJcblx0XHRcdFx0XHQvLyBSZXN0b3JlIGZvY3VzIHRvIHRoZSBjdXJyZW50bHkgYWN0aXZlIChpbmNvbWluZykgbGVhZlxyXG5cdFx0XHRcdFx0aWYgKHdzLnNldEFjdGl2ZUxlYWYgJiYgbGVhZikgd3Muc2V0QWN0aXZlTGVhZihsZWFmLCB7Zm9jdXM6IHRydWV9KTtcclxuXHRcdFx0XHR9IGNhdGNoIChfKSB7XHJcblx0XHRcdFx0XHQvLyBub29wXHJcblx0XHRcdFx0fSBmaW5hbGx5IHtcclxuXHRcdFx0XHRcdHRoaXMucmV2ZWFsaW5nU2lkZUxlYXZlcyA9IGZhbHNlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSlcclxuXHRcdCk7XHJcblxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogT3BlbiB0aGUgRmx1ZW50IHZpZXdcclxuXHQgKi9cclxuXHRwcml2YXRlIGFzeW5jIG9wZW5WMlZpZXcoKSB7XHJcblx0XHRjb25zdCB7d29ya3NwYWNlfSA9IHRoaXMucGx1Z2luLmFwcDtcclxuXHJcblx0XHQvLyBDaGVjayBpZiBGbHVlbnQgdmlldyBpcyBhbHJlYWR5IG9wZW5cclxuXHRcdGNvbnN0IGxlYXZlcyA9IHdvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoRkxVRU5UX1RBU0tfVklFVyk7XHJcblx0XHRpZiAobGVhdmVzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0Ly8gRm9jdXMgZXhpc3Rpbmcgdmlld1xyXG5cdFx0XHR3b3Jrc3BhY2UucmV2ZWFsTGVhZihsZWF2ZXNbMF0pO1xyXG5cdFx0XHQvLyBFbnN1cmUgc2lkZSBsZWF2ZXMgaWYgY29uZmlndXJlZFxyXG5cdFx0XHRhd2FpdCB0aGlzLmVuc3VyZVNpZGVMZWF2ZXNJZkVuYWJsZWQoKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENyZWF0ZSBuZXcgRmx1ZW50IHZpZXdcclxuXHRcdGNvbnN0IGxlYWYgPSB3b3Jrc3BhY2UuZ2V0TGVhZihcInRhYlwiKTtcclxuXHRcdGF3YWl0IGxlYWYuc2V0Vmlld1N0YXRlKHtcclxuXHRcdFx0dHlwZTogRkxVRU5UX1RBU0tfVklFVyxcclxuXHRcdFx0YWN0aXZlOiB0cnVlLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0d29ya3NwYWNlLnJldmVhbExlYWYobGVhZik7XHJcblxyXG5cdFx0Ly8gRW5zdXJlIHNpZGUgbGVhdmVzIGlmIGNvbmZpZ3VyZWRcclxuXHRcdGF3YWl0IHRoaXMuZW5zdXJlU2lkZUxlYXZlc0lmRW5hYmxlZCgpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBlbnN1cmVTaWRlTGVhdmVzSWZFbmFibGVkKCkge1xyXG5cdFx0Y29uc3QgdXNlU2lkZUxlYXZlcyA9ICEhKHRoaXMucGx1Z2luLnNldHRpbmdzLmZsdWVudFZpZXcpPy51c2VXb3Jrc3BhY2VTaWRlTGVhdmVzO1xyXG5cdFx0aWYgKCF1c2VTaWRlTGVhdmVzKSByZXR1cm47XHJcblxyXG5cdFx0Y29uc3Qgd3MgPSB0aGlzLnBsdWdpbi5hcHAud29ya3NwYWNlIGFzIFdvcmtzcGFjZTtcclxuXHRcdC8vIExlZnQgc2lkZWJhclxyXG5cdFx0YXdhaXQgd3MuZW5zdXJlU2lkZUxlYWYoVEdfTEVGVF9TSURFQkFSX1ZJRVdfVFlQRSwgXCJsZWZ0XCIsIHthY3RpdmU6IGZhbHNlfSk7XHJcblx0XHRhd2FpdCB3cy5lbnN1cmVTaWRlTGVhZihUR19SSUdIVF9ERVRBSUxfVklFV19UWVBFLCBcInJpZ2h0XCIsIHthY3RpdmU6IGZhbHNlfSk7XHJcblx0fVxyXG5cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgRmx1ZW50IGZlYXR1cmVzIGFyZSBlbmFibGVkXHJcblx0ICovXHJcblx0cHJpdmF0ZSBpc0ZsdWVudEVuYWJsZWQoKTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZmx1ZW50Vmlldz8uZW5hYmxlRmx1ZW50ID8/IGZhbHNlO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTWlncmF0ZSBzZXR0aW5ncyBmcm9tIFYxIHRvIFYyXHJcblx0ICovXHJcblx0cHVibGljIGFzeW5jIG1pZ3JhdGVTZXR0aW5ncygpIHtcclxuXHRcdGlmICghdGhpcy5wbHVnaW4uc2V0dGluZ3MuZmx1ZW50Vmlldykge1xyXG5cdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5mbHVlbnRWaWV3ID0ge1xyXG5cdFx0XHRcdGVuYWJsZUZsdWVudDogZmFsc2UsXHJcblx0XHRcdFx0c2hvd0ZsdWVudFJpYmJvbjogZmFsc2UsXHJcblx0XHRcdH07XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRGVmYXVsdCB3b3Jrc3BhY2UgY29uZmlndXJhdGlvblxyXG5cdFx0aWYgKCF0aGlzLnBsdWdpbi5zZXR0aW5ncy5mbHVlbnRWaWV3IS53b3Jrc3BhY2VzKSB7XHJcblx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLmZsdWVudFZpZXchLndvcmtzcGFjZXMgPSBbXHJcblx0XHRcdFx0e2lkOiBcImRlZmF1bHRcIiwgbmFtZTogXCJEZWZhdWx0XCIsIGNvbG9yOiBcIiMzNDk4ZGJcIn0sXHJcblx0XHRcdF07XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRGVmYXVsdCBGbHVlbnQgY29uZmlndXJhdGlvblxyXG5cdFx0aWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmZsdWVudFZpZXchLmZsdWVudENvbmZpZyA9PT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLmZsdWVudFZpZXchLmZsdWVudENvbmZpZyA9IHtcclxuXHRcdFx0XHRlbmFibGVXb3Jrc3BhY2VzOiB0cnVlLFxyXG5cdFx0XHRcdGRlZmF1bHRXb3Jrc3BhY2U6IFwiZGVmYXVsdFwiLFxyXG5cdFx0XHRcdHNob3dUb3BOYXZpZ2F0aW9uOiB0cnVlLFxyXG5cdFx0XHRcdHNob3dOZXdTaWRlYmFyOiB0cnVlLFxyXG5cdFx0XHRcdGFsbG93Vmlld1N3aXRjaGluZzogdHJ1ZSxcclxuXHRcdFx0XHRwZXJzaXN0Vmlld01vZGU6IHRydWUsXHJcblx0XHRcdFx0bWF4T3RoZXJWaWV3c0JlZm9yZU92ZXJmbG93OiA1LFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEJhY2tmaWxsIGV4dHJhIGV4cGVyaW1lbnRhbCBmbGFnIHdpdGhvdXQgdG91Y2hpbmcgdHlwZXNcclxuXHRcdGNvbnN0IHYyYyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmZsdWVudFZpZXc7XHJcblx0XHRpZiAodjJjLnVzZVdvcmtzcGFjZVNpZGVMZWF2ZXMgPT09IHVuZGVmaW5lZCkgdjJjLnVzZVdvcmtzcGFjZVNpZGVMZWF2ZXMgPSB0cnVlO1xyXG5cclxuXHRcdGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVG9nZ2xlIGJldHdlZW4gVjEgYW5kIEZsdWVudCB2aWV3c1xyXG5cdCAqL1xyXG5cdHB1YmxpYyBhc3luYyB0b2dnbGVWZXJzaW9uKCkge1xyXG5cdFx0Y29uc3Qge3dvcmtzcGFjZX0gPSB0aGlzLnBsdWdpbi5hcHA7XHJcblxyXG5cdFx0Ly8gQ2xvc2UgYWxsIFYxIHZpZXdzXHJcblx0XHRjb25zdCB2MUxlYXZlcyA9IHdvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoVEFTS19WSUVXX1RZUEUpO1xyXG5cdFx0djFMZWF2ZXMuZm9yRWFjaCgobGVhZikgPT4gbGVhZi5kZXRhY2goKSk7XHJcblxyXG5cdFx0Ly8gQ2xvc2UgYWxsIEZsdWVudCB2aWV3c1xyXG5cdFx0Y29uc3QgdjJMZWF2ZXMgPSB3b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKEZMVUVOVF9UQVNLX1ZJRVcpO1xyXG5cdFx0djJMZWF2ZXMuZm9yRWFjaCgobGVhZikgPT4gbGVhZi5kZXRhY2goKSk7XHJcblxyXG5cdFx0Ly8gVG9nZ2xlIHRoZSBzZXR0aW5nXHJcblx0XHRpZiAoIXRoaXMucGx1Z2luLnNldHRpbmdzLmZsdWVudFZpZXcpIHtcclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuZmx1ZW50VmlldyA9IHtcclxuXHRcdFx0XHRlbmFibGVGbHVlbnQ6IGZhbHNlLFxyXG5cdFx0XHRcdHNob3dGbHVlbnRSaWJib246IGZhbHNlLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuZmx1ZW50VmlldyEuZW5hYmxlRmx1ZW50ID1cclxuXHRcdFx0IXRoaXMucGx1Z2luLnNldHRpbmdzLmZsdWVudFZpZXchLmVuYWJsZUZsdWVudDtcclxuXHRcdGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cclxuXHRcdC8vIE9wZW4gdGhlIGFwcHJvcHJpYXRlIHZpZXdcclxuXHRcdGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5mbHVlbnRWaWV3Py5lbmFibGVGbHVlbnQpIHtcclxuXHRcdFx0YXdhaXQgdGhpcy5vcGVuVjJWaWV3KCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBPcGVuIFYxIHZpZXdcclxuXHRcdFx0Y29uc3QgbGVhZiA9IHdvcmtzcGFjZS5nZXRMZWFmKFwidGFiXCIpO1xyXG5cdFx0XHRhd2FpdCBsZWFmLnNldFZpZXdTdGF0ZSh7XHJcblx0XHRcdFx0dHlwZTogVEFTS19WSUVXX1RZUEUsXHJcblx0XHRcdFx0YWN0aXZlOiB0cnVlLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0d29ya3NwYWNlLnJldmVhbExlYWYobGVhZik7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcbiJdfQ==