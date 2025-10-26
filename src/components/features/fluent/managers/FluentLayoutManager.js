import { __awaiter } from "tslib";
import { ButtonComponent, Component, Platform, } from "obsidian";
import { FluentSidebar } from "../components/FluentSidebar";
import { TaskDetailsComponent } from "@/components/features/task/view/details";
import { t } from "@/translations/helper";
import { TG_LEFT_SIDEBAR_VIEW_TYPE } from "../../../../pages/LeftSidebarView";
import { QuickCaptureModal } from "@/components/features/quick-capture/modals/QuickCaptureModal";
import { ViewTaskFilterModal, ViewTaskFilterPopover, } from "@/components/features/task/filter";
/**
 * FluentLayoutManager - Manages layout, sidebar, and details panel
 *
 * Responsibilities:
 * - Sidebar toggle (supports both leaves and non-leaves mode)
 * - Details panel visibility (supports both leaves and non-leaves mode)
 * - Mobile drawer management
 * - Responsive layout adjustments
 * - Header buttons (sidebar toggle, task count)
 *
 * KEY ARCHITECTURAL CONSIDERATION:
 * This manager handles TWO distinct modes:
 * 1. Leaves Mode (useWorkspaceSideLeaves: true): Sidebar/Details in separate workspace leaves
 * 2. Non-Leaves Mode: Sidebar/Details embedded in main view
 */
export class FluentLayoutManager extends Component {
    constructor(app, plugin, view, rootContainerEl, headerEl, titleEl, getTaskCount) {
        super();
        this.app = app;
        this.plugin = plugin;
        this.view = view;
        this.rootContainerEl = rootContainerEl;
        this.headerEl = headerEl;
        this.titleEl = titleEl;
        this.getTaskCount = getTaskCount;
        // Layout state
        this.isSidebarCollapsed = false;
        this.isDetailsVisible = false;
        this.isMobileDrawerOpen = false;
        // UI elements
        this.sidebarToggleBtn = null;
        this.drawerOverlay = null;
        this.detailsToggleBtn = null;
        // Components (non-leaves mode only)
        this.sidebar = null;
        this.detailsComponent = null;
        this.leaf = view.leaf;
    }
    /**
     * Set navigation callback
     */
    setOnSidebarNavigate(callback) {
        this.onSidebarNavigate = callback;
    }
    /**
     * Set project select callback
     */
    setOnProjectSelect(callback) {
        this.onProjectSelect = callback;
    }
    /**
     * Set task callbacks for details component
     */
    setTaskCallbacks(callbacks) {
        this.onTaskToggleComplete = callbacks.onTaskToggleComplete;
        this.onTaskEdit = callbacks.onTaskEdit;
        this.onTaskUpdate = callbacks.onTaskUpdate;
    }
    /**
     * Set filter callbacks
     */
    setFilterCallbacks(callbacks) {
        this.onFilterReset = callbacks.onFilterReset;
        this.getLiveFilterState = callbacks.getLiveFilterState;
    }
    /**
     * Check if using workspace side leaves mode
     */
    useSideLeaves() {
        var _a;
        return !!((_a = (this.plugin.settings.fluentView)) === null || _a === void 0 ? void 0 : _a.useWorkspaceSideLeaves);
    }
    /**
     * Initialize sidebar (non-leaves mode only)
     */
    initializeSidebar(containerEl) {
        if (this.useSideLeaves()) {
            containerEl.hide();
            console.log("[FluentLayout] Using workspace side leaves: skip in-view sidebar");
            return;
        }
        // On mobile, start with sidebar completely hidden (drawer closed)
        const initialCollapsedState = Platform.isPhone
            ? true
            : this.isSidebarCollapsed;
        this.sidebar = new FluentSidebar(containerEl, this.plugin, (viewId) => {
            var _a;
            (_a = this.onSidebarNavigate) === null || _a === void 0 ? void 0 : _a.call(this, viewId);
            // Auto-close drawer on mobile after navigation
            if (Platform.isPhone) {
                this.closeMobileDrawer();
            }
        }, (projectId) => {
            var _a;
            (_a = this.onProjectSelect) === null || _a === void 0 ? void 0 : _a.call(this, projectId);
            // Auto-close drawer on mobile after selection
            if (Platform.isPhone) {
                this.closeMobileDrawer();
            }
        }, initialCollapsedState);
        // Add sidebar as a child component for proper lifecycle management
        this.addChild(this.sidebar);
    }
    /**
     * Initialize details component (non-leaves mode only)
     */
    initializeDetailsComponent() {
        if (this.useSideLeaves()) {
            console.log("[FluentLayout] Using workspace side leaves: skip in-view details panel");
            return;
        }
        // Initialize details component (hidden by default)
        this.detailsComponent = new TaskDetailsComponent(this.rootContainerEl, this.app, this.plugin);
        this.addChild(this.detailsComponent);
        this.detailsComponent.load();
        // Set up callbacks
        this.detailsComponent.onTaskToggleComplete = (task) => { var _a; return (_a = this.onTaskToggleComplete) === null || _a === void 0 ? void 0 : _a.call(this, task); };
        this.detailsComponent.onTaskEdit = (task) => { var _a; return (_a = this.onTaskEdit) === null || _a === void 0 ? void 0 : _a.call(this, task); };
        this.detailsComponent.onTaskUpdate = (originalTask, updatedTask) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            yield ((_a = this.onTaskUpdate) === null || _a === void 0 ? void 0 : _a.call(this, originalTask, updatedTask));
        });
        this.detailsComponent.toggleDetailsVisibility = (visible) => {
            this.toggleDetailsVisibility(visible);
        };
        this.detailsComponent.setVisible(this.isDetailsVisible);
    }
    /**
     * Create sidebar toggle button in header
     */
    createSidebarToggle() {
        var _a, _b;
        const headerBtns = !Platform.isPhone
            ? (_a = this.headerEl) === null || _a === void 0 ? void 0 : _a.querySelector(".view-header-nav-buttons")
            : (_b = this.headerEl) === null || _b === void 0 ? void 0 : _b.querySelector(".view-header-left");
        if (!headerBtns) {
            console.warn("[FluentLayout] header buttons container not found");
            return;
        }
        const container = headerBtns.createDiv({
            cls: "panel-toggle-container",
        });
        this.sidebarToggleBtn = container.createDiv({
            cls: "panel-toggle-btn",
        });
        const btn = new ButtonComponent(this.sidebarToggleBtn);
        btn.setIcon(Platform.isPhone ? "menu" : "panel-left-dashed")
            .setTooltip(t("Toggle Sidebar"))
            .setClass("clickable-icon")
            .onClick(() => this.toggleSidebar());
    }
    /**
     * Create task count mark in title
     */
    createTaskMark() {
        this.updateTaskMark();
    }
    /**
     * Update task count in title
     */
    updateTaskMark() {
        this.titleEl.setText(t("{{num}} Tasks", {
            interpolation: {
                num: this.getTaskCount(),
            },
        }));
    }
    /**
     * Toggle sidebar visibility
     * Behavior differs based on mode:
     * - Leaves mode: Toggle workspace left split
     * - Non-leaves mode: Toggle internal sidebar component
     * - Mobile: Toggle drawer overlay
     */
    toggleSidebar() {
        var _a, _b;
        if (this.useSideLeaves()) {
            // In side-leaf mode, toggle the left sidebar split collapse state
            const ws = this.app.workspace;
            const leftSplit = ws.leftSplit;
            const isCollapsed = !!(leftSplit === null || leftSplit === void 0 ? void 0 : leftSplit.collapsed);
            if (isCollapsed) {
                // Expand and ensure our sidebar view
                leftSplit.expand();
                // Handle async ensureSideLeaf
                ws.ensureSideLeaf(TG_LEFT_SIDEBAR_VIEW_TYPE, "left", {
                    active: false,
                }).then((leftLeaf) => {
                    var _a;
                    if (leftLeaf) {
                        (_a = ws.revealLeaf) === null || _a === void 0 ? void 0 : _a.call(ws, leftLeaf);
                    }
                });
            }
            else {
                leftSplit.collapse();
            }
            return;
        }
        if (Platform.isPhone) {
            // On mobile, toggle the drawer open/closed
            if (this.isMobileDrawerOpen) {
                this.closeMobileDrawer();
            }
            else {
                this.openMobileDrawer();
            }
        }
        else {
            // On desktop, toggle collapse state
            this.isSidebarCollapsed = !this.isSidebarCollapsed;
            (_a = this.sidebar) === null || _a === void 0 ? void 0 : _a.setCollapsed(this.isSidebarCollapsed);
            (_b = this.rootContainerEl) === null || _b === void 0 ? void 0 : _b.toggleClass("fluent-sidebar-collapsed", this.isSidebarCollapsed);
        }
    }
    /**
     * Open mobile drawer
     */
    openMobileDrawer() {
        var _a, _b;
        this.isMobileDrawerOpen = true;
        (_a = this.rootContainerEl) === null || _a === void 0 ? void 0 : _a.addClass("drawer-open");
        if (this.drawerOverlay) {
            this.drawerOverlay.style.display = "block";
        }
        // Show the sidebar
        (_b = this.sidebar) === null || _b === void 0 ? void 0 : _b.setCollapsed(false);
    }
    /**
     * Close mobile drawer
     */
    closeMobileDrawer() {
        var _a, _b;
        this.isMobileDrawerOpen = false;
        (_a = this.rootContainerEl) === null || _a === void 0 ? void 0 : _a.removeClass("drawer-open");
        if (this.drawerOverlay) {
            this.drawerOverlay.style.display = "none";
        }
        // Hide the sidebar
        (_b = this.sidebar) === null || _b === void 0 ? void 0 : _b.setCollapsed(true);
    }
    /**
     * Set up drawer overlay for mobile
     */
    setupDrawerOverlay(layoutContainer) {
        if (!Platform.isPhone)
            return;
        this.drawerOverlay = layoutContainer.createDiv({
            cls: "drawer-overlay",
        });
        this.drawerOverlay.style.display = "none";
        this.drawerOverlay.addEventListener("click", () => {
            this.closeMobileDrawer();
        });
    }
    /**
     * Toggle details panel visibility
     * Behavior differs based on mode:
     * - Leaves mode: Toggle workspace right split
     * - Non-leaves mode: Toggle internal details component
     * - Mobile: Overlay with backdrop
     */
    toggleDetailsVisibility(visible) {
        var _a, _b, _c;
        this.isDetailsVisible = visible;
        if (this.useSideLeaves()) {
            // In side-leaf mode, reveal/collapse the right details pane
            const ws = this.app.workspace;
            if (visible) {
                // Try to expand right split if it's collapsed
                if ((_a = ws.rightSplit) === null || _a === void 0 ? void 0 : _a.collapsed) {
                    ws.rightSplit.expand();
                }
            }
            else {
                ws.rightSplit.collapse();
            }
            // Update header toggle visual state
            if (this.detailsToggleBtn) {
                this.detailsToggleBtn.toggleClass("is-active", visible);
                this.detailsToggleBtn.setAttribute("aria-label", visible ? t("Hide Details") : t("Show Details"));
            }
            return;
        }
        // Legacy/in-view mode
        (_b = this.rootContainerEl) === null || _b === void 0 ? void 0 : _b.toggleClass("details-visible", visible);
        (_c = this.rootContainerEl) === null || _c === void 0 ? void 0 : _c.toggleClass("details-hidden", !visible);
        if (this.detailsComponent) {
            this.detailsComponent.setVisible(visible);
        }
        if (this.detailsToggleBtn) {
            this.detailsToggleBtn.toggleClass("is-active", visible);
            this.detailsToggleBtn.setAttribute("aria-label", visible ? t("Hide Details") : t("Show Details"));
        }
        // On mobile, add click handler to overlay to close details
        if (Platform.isPhone && visible) {
            // Use setTimeout to avoid immediate close on open
            setTimeout(() => {
                const overlayClickHandler = (e) => {
                    var _a;
                    // Check if click is on the overlay (pseudo-element area)
                    const detailsEl = (_a = this.rootContainerEl) === null || _a === void 0 ? void 0 : _a.querySelector(".task-details");
                    if (detailsEl && !detailsEl.contains(e.target)) {
                        this.toggleDetailsVisibility(false);
                        document.removeEventListener("click", overlayClickHandler);
                    }
                };
                document.addEventListener("click", overlayClickHandler);
                this.mobileDetailsOverlayHandler = overlayClickHandler;
            }, 100);
        }
        else if (Platform.isPhone &&
            !visible &&
            this.mobileDetailsOverlayHandler) {
            document.removeEventListener("click", this.mobileDetailsOverlayHandler);
            delete this.mobileDetailsOverlayHandler;
        }
    }
    /**
     * Store details toggle button reference
     */
    setDetailsToggleBtn(btn) {
        this.detailsToggleBtn = btn;
        this.detailsToggleBtn.toggleClass("is-active", this.isDetailsVisible);
    }
    /**
     * Check and auto-collapse sidebar on narrow screens (desktop only)
     */
    checkAndCollapseSidebar() {
        var _a, _b, _c, _d;
        // Skip auto-collapse on mobile, as we use drawer mode
        if (Platform.isPhone) {
            return;
        }
        // Auto-collapse on narrow panes (desktop only)
        try {
            const width = (_b = (_a = this.leaf) === null || _a === void 0 ? void 0 : _a.width) !== null && _b !== void 0 ? _b : 0;
            if (width > 0 && width < 768) {
                this.isSidebarCollapsed = true;
                (_c = this.sidebar) === null || _c === void 0 ? void 0 : _c.setCollapsed(true);
                (_d = this.rootContainerEl) === null || _d === void 0 ? void 0 : _d.addClass("fluent-sidebar-collapsed");
            }
        }
        catch (_) {
            // Ignore errors
        }
    }
    /**
     * Handle window resize
     */
    onResize() {
        // Only check and collapse on desktop
        if (!Platform.isPhone) {
            this.checkAndCollapseSidebar();
        }
    }
    /**
     * Show task details in details panel
     */
    showTaskDetails(task) {
        var _a;
        if (this.useSideLeaves()) {
            // In leaves mode, emit event to side leaf details view
            // This will be handled by the main view's event emission
            return;
        }
        (_a = this.detailsComponent) === null || _a === void 0 ? void 0 : _a.showTaskDetails(task);
    }
    /**
     * Set sidebar active item
     */
    setSidebarActiveItem(viewId) {
        var _a;
        (_a = this.sidebar) === null || _a === void 0 ? void 0 : _a.setActiveItem(viewId);
    }
    /**
     * Refresh sidebar project list
     */
    refreshSidebarProjects() {
        var _a, _b;
        (_b = (_a = this.sidebar) === null || _a === void 0 ? void 0 : _a.projectList) === null || _b === void 0 ? void 0 : _b.refresh();
    }
    /**
     * Set active project in sidebar
     */
    setActiveProject(projectId) {
        var _a, _b;
        (_b = (_a = this.sidebar) === null || _a === void 0 ? void 0 : _a.projectList) === null || _b === void 0 ? void 0 : _b.setActiveProject(projectId);
    }
    /**
     * Create action buttons in view header
     * - Details toggle button
     * - Quick capture button
     * - Filter button
     * - Reset filter button (conditional)
     */
    createActionButtons() {
        // Details toggle button
        this.detailsToggleBtn = this.view.addAction("panel-right-dashed", t("Details"), () => {
            this.toggleDetailsVisibility(!this.isDetailsVisible);
        });
        if (this.detailsToggleBtn) {
            this.detailsToggleBtn.toggleClass("panel-toggle-btn", true);
            this.detailsToggleBtn.toggleClass("is-active", this.isDetailsVisible);
        }
        // Capture button
        this.view.addAction("notebook-pen", t("Capture"), () => {
            const modal = new QuickCaptureModal(this.app, this.plugin, {}, true);
            modal.open();
        });
        // Filter button
        this.view.addAction("filter", t("Filter"), (e) => {
            var _a;
            if (Platform.isDesktop) {
                const popover = new ViewTaskFilterPopover(this.app, undefined, this.plugin);
                // Set up filter state when opening
                this.app.workspace.onLayoutReady(() => {
                    setTimeout(() => {
                        var _a;
                        const liveFilterState = (_a = this.getLiveFilterState) === null || _a === void 0 ? void 0 : _a.call(this);
                        if (liveFilterState && popover.taskFilterComponent) {
                            popover.taskFilterComponent.loadFilterState(liveFilterState);
                        }
                    }, 100);
                });
                popover.showAtPosition({ x: e.clientX, y: e.clientY });
            }
            else {
                const modal = new ViewTaskFilterModal(this.app, this.leaf.id, this.plugin);
                modal.open();
                // Set initial filter state
                const liveFilterState = (_a = this.getLiveFilterState) === null || _a === void 0 ? void 0 : _a.call(this);
                if (liveFilterState && modal.taskFilterComponent) {
                    setTimeout(() => {
                        modal.taskFilterComponent.loadFilterState(liveFilterState);
                    }, 100);
                }
            }
        });
        // Update action buttons visibility
        this.updateActionButtons();
    }
    /**
     * Update action buttons visibility (mainly Reset Filter button)
     */
    updateActionButtons() {
        var _a;
        // Remove reset filter button if exists
        const resetButton = this.headerEl.querySelector(".view-action.task-filter-reset");
        if (resetButton) {
            resetButton.remove();
        }
        // Add reset filter button if there are active filters
        const liveFilterState = (_a = this.getLiveFilterState) === null || _a === void 0 ? void 0 : _a.call(this);
        if (liveFilterState &&
            liveFilterState.filterGroups &&
            liveFilterState.filterGroups.length > 0) {
            this.view
                .addAction("reset", t("Reset Filter"), () => {
                var _a;
                (_a = this.onFilterReset) === null || _a === void 0 ? void 0 : _a.call(this);
            })
                .addClass("task-filter-reset");
        }
    }
    /**
     * Clean up mobile event listeners
     */
    onunload() {
        if (Platform.isPhone && this.mobileDetailsOverlayHandler) {
            document.removeEventListener("click", this.mobileDetailsOverlayHandler);
            delete this.mobileDetailsOverlayHandler;
        }
        super.onunload();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmx1ZW50TGF5b3V0TWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkZsdWVudExheW91dE1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBTyxlQUFlLEVBQUUsU0FBUyxFQUFZLFFBQVEsR0FBa0IsTUFBTSxVQUFVLENBQUM7QUFFL0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzVELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRS9FLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUMxQyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUscUJBQXFCLEdBQUcsTUFBTSxtQ0FBbUMsQ0FBQztBQUdoRzs7Ozs7Ozs7Ozs7Ozs7R0FjRztBQUNILE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxTQUFTO0lBNkJqRCxZQUNTLEdBQVEsRUFDUixNQUE2QixFQUM3QixJQUFjLEVBQ2QsZUFBNEIsRUFDNUIsUUFBcUIsRUFDckIsT0FBb0IsRUFDcEIsWUFBMEI7UUFFbEMsS0FBSyxFQUFFLENBQUM7UUFSQSxRQUFHLEdBQUgsR0FBRyxDQUFLO1FBQ1IsV0FBTSxHQUFOLE1BQU0sQ0FBdUI7UUFDN0IsU0FBSSxHQUFKLElBQUksQ0FBVTtRQUNkLG9CQUFlLEdBQWYsZUFBZSxDQUFhO1FBQzVCLGFBQVEsR0FBUixRQUFRLENBQWE7UUFDckIsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQUNwQixpQkFBWSxHQUFaLFlBQVksQ0FBYztRQW5DbkMsZUFBZTtRQUNSLHVCQUFrQixHQUFHLEtBQUssQ0FBQztRQUMzQixxQkFBZ0IsR0FBRyxLQUFLLENBQUM7UUFDekIsdUJBQWtCLEdBQUcsS0FBSyxDQUFD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RDs7T0FFRztJQUNILFFBQVE7UUFDUCxJQUFJLFFBQVEsQ0FBQyxPQUFPLElBQUssSUFBWSxDQUFDLDJCQUEyQixFQUFFO1lBQ2xFLFFBQVEsQ0FBQyxtQkFBbUIsQ0FDM0IsT0FBTyxFQUNOLElBQVksQ0FBQywyQkFBMkIsQ0FDekMsQ0FBQztZQUNGLE9BQVEsSUFBWSxDQUFDLDJCQUEyQixDQUFDO1NBQ2pEO1FBQ0QsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ2xCLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcCwgQnV0dG9uQ29tcG9uZW50LCBDb21wb25lbnQsIEl0ZW1WaWV3LCBQbGF0Zm9ybSwgV29ya3NwYWNlTGVhZiwgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5pbXBvcnQgeyBGbHVlbnRTaWRlYmFyIH0gZnJvbSBcIi4uL2NvbXBvbmVudHMvRmx1ZW50U2lkZWJhclwiO1xyXG5pbXBvcnQgeyBUYXNrRGV0YWlsc0NvbXBvbmVudCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay92aWV3L2RldGFpbHNcIjtcclxuaW1wb3J0IHsgVGFzayB9IGZyb20gXCJAL3R5cGVzL3Rhc2tcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHsgVEdfTEVGVF9TSURFQkFSX1ZJRVdfVFlQRSB9IGZyb20gXCIuLi8uLi8uLi8uLi9wYWdlcy9MZWZ0U2lkZWJhclZpZXdcIjtcclxuaW1wb3J0IHsgUXVpY2tDYXB0dXJlTW9kYWwgfSBmcm9tIFwiQC9jb21wb25lbnRzL2ZlYXR1cmVzL3F1aWNrLWNhcHR1cmUvbW9kYWxzL1F1aWNrQ2FwdHVyZU1vZGFsXCI7XHJcbmltcG9ydCB7IFZpZXdUYXNrRmlsdGVyTW9kYWwsIFZpZXdUYXNrRmlsdGVyUG9wb3ZlciwgfSBmcm9tIFwiQC9jb21wb25lbnRzL2ZlYXR1cmVzL3Rhc2svZmlsdGVyXCI7XHJcbmltcG9ydCB7IFJvb3RGaWx0ZXJTdGF0ZSB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay9maWx0ZXIvVmlld1Rhc2tGaWx0ZXJcIjtcclxuXHJcbi8qKlxyXG4gKiBGbHVlbnRMYXlvdXRNYW5hZ2VyIC0gTWFuYWdlcyBsYXlvdXQsIHNpZGViYXIsIGFuZCBkZXRhaWxzIHBhbmVsXHJcbiAqXHJcbiAqIFJlc3BvbnNpYmlsaXRpZXM6XHJcbiAqIC0gU2lkZWJhciB0b2dnbGUgKHN1cHBvcnRzIGJvdGggbGVhdmVzIGFuZCBub24tbGVhdmVzIG1vZGUpXHJcbiAqIC0gRGV0YWlscyBwYW5lbCB2aXNpYmlsaXR5IChzdXBwb3J0cyBib3RoIGxlYXZlcyBhbmQgbm9uLWxlYXZlcyBtb2RlKVxyXG4gKiAtIE1vYmlsZSBkcmF3ZXIgbWFuYWdlbWVudFxyXG4gKiAtIFJlc3BvbnNpdmUgbGF5b3V0IGFkanVzdG1lbnRzXHJcbiAqIC0gSGVhZGVyIGJ1dHRvbnMgKHNpZGViYXIgdG9nZ2xlLCB0YXNrIGNvdW50KVxyXG4gKlxyXG4gKiBLRVkgQVJDSElURUNUVVJBTCBDT05TSURFUkFUSU9OOlxyXG4gKiBUaGlzIG1hbmFnZXIgaGFuZGxlcyBUV08gZGlzdGluY3QgbW9kZXM6XHJcbiAqIDEuIExlYXZlcyBNb2RlICh1c2VXb3Jrc3BhY2VTaWRlTGVhdmVzOiB0cnVlKTogU2lkZWJhci9EZXRhaWxzIGluIHNlcGFyYXRlIHdvcmtzcGFjZSBsZWF2ZXNcclxuICogMi4gTm9uLUxlYXZlcyBNb2RlOiBTaWRlYmFyL0RldGFpbHMgZW1iZWRkZWQgaW4gbWFpbiB2aWV3XHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgRmx1ZW50TGF5b3V0TWFuYWdlciBleHRlbmRzIENvbXBvbmVudCB7XHJcblx0Ly8gTGF5b3V0IHN0YXRlXHJcblx0cHVibGljIGlzU2lkZWJhckNvbGxhcHNlZCA9IGZhbHNlO1xyXG5cdHB1YmxpYyBpc0RldGFpbHNWaXNpYmxlID0gZmFsc2U7XHJcblx0cHVibGljIGlzTW9iaWxlRHJhd2VyT3BlbiA9IGZhbHNlO1xyXG5cclxuXHQvLyBVSSBlbGVtZW50c1xyXG5cdHByaXZhdGUgc2lkZWJhclRvZ2dsZUJ0bjogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIGRyYXdlck92ZXJsYXk6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBkZXRhaWxzVG9nZ2xlQnRuOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgbW9iaWxlRGV0YWlsc092ZXJsYXlIYW5kbGVyPzogKGU6IE1vdXNlRXZlbnQpID0+IHZvaWQ7XHJcblxyXG5cdC8vIENvbXBvbmVudHMgKG5vbi1sZWF2ZXMgbW9kZSBvbmx5KVxyXG5cdHB1YmxpYyBzaWRlYmFyOiBGbHVlbnRTaWRlYmFyIHwgbnVsbCA9IG51bGw7XHJcblx0cHVibGljIGRldGFpbHNDb21wb25lbnQ6IFRhc2tEZXRhaWxzQ29tcG9uZW50IHwgbnVsbCA9IG51bGw7XHJcblxyXG5cdC8vIENhbGxiYWNrc1xyXG5cdHByaXZhdGUgb25TaWRlYmFyTmF2aWdhdGU/OiAodmlld0lkOiBzdHJpbmcpID0+IHZvaWQ7XHJcblx0cHJpdmF0ZSBvblByb2plY3RTZWxlY3Q/OiAocHJvamVjdElkOiBzdHJpbmcpID0+IHZvaWQ7XHJcblx0cHJpdmF0ZSBvblRhc2tUb2dnbGVDb21wbGV0ZT86ICh0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdHByaXZhdGUgb25UYXNrRWRpdD86ICh0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdHByaXZhdGUgb25UYXNrVXBkYXRlPzogKFxyXG5cdFx0b3JpZ2luYWxUYXNrOiBUYXNrLFxyXG5cdFx0dXBkYXRlZFRhc2s6IFRhc2tcclxuXHQpID0+IFByb21pc2U8dm9pZD47XHJcblx0cHJpdmF0ZSBvbkZpbHRlclJlc2V0PzogKCkgPT4gdm9pZDtcclxuXHRwcml2YXRlIGdldExpdmVGaWx0ZXJTdGF0ZT86ICgpID0+IFJvb3RGaWx0ZXJTdGF0ZSB8IG51bGw7XHJcblx0cHJpdmF0ZSBsZWFmOiBXb3Jrc3BhY2VMZWFmO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHByaXZhdGUgYXBwOiBBcHAsXHJcblx0XHRwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0cHJpdmF0ZSB2aWV3OiBJdGVtVmlldyxcclxuXHRcdHByaXZhdGUgcm9vdENvbnRhaW5lckVsOiBIVE1MRWxlbWVudCxcclxuXHRcdHByaXZhdGUgaGVhZGVyRWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0cHJpdmF0ZSB0aXRsZUVsOiBIVE1MRWxlbWVudCxcclxuXHRcdHByaXZhdGUgZ2V0VGFza0NvdW50OiAoKSA9PiBudW1iZXJcclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblxyXG5cdFx0dGhpcy5sZWFmID0gdmlldy5sZWFmO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2V0IG5hdmlnYXRpb24gY2FsbGJhY2tcclxuXHQgKi9cclxuXHRzZXRPblNpZGViYXJOYXZpZ2F0ZShjYWxsYmFjazogKHZpZXdJZDogc3RyaW5nKSA9PiB2b2lkKTogdm9pZCB7XHJcblx0XHR0aGlzLm9uU2lkZWJhck5hdmlnYXRlID0gY2FsbGJhY2s7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTZXQgcHJvamVjdCBzZWxlY3QgY2FsbGJhY2tcclxuXHQgKi9cclxuXHRzZXRPblByb2plY3RTZWxlY3QoY2FsbGJhY2s6IChwcm9qZWN0SWQ6IHN0cmluZykgPT4gdm9pZCk6IHZvaWQge1xyXG5cdFx0dGhpcy5vblByb2plY3RTZWxlY3QgPSBjYWxsYmFjaztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNldCB0YXNrIGNhbGxiYWNrcyBmb3IgZGV0YWlscyBjb21wb25lbnRcclxuXHQgKi9cclxuXHRzZXRUYXNrQ2FsbGJhY2tzKGNhbGxiYWNrczoge1xyXG5cdFx0b25UYXNrVG9nZ2xlQ29tcGxldGU6ICh0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdFx0b25UYXNrRWRpdDogKHRhc2s6IFRhc2spID0+IHZvaWQ7XHJcblx0XHRvblRhc2tVcGRhdGU6IChvcmlnaW5hbFRhc2s6IFRhc2ssIHVwZGF0ZWRUYXNrOiBUYXNrKSA9PiBQcm9taXNlPHZvaWQ+O1xyXG5cdH0pOiB2b2lkIHtcclxuXHRcdHRoaXMub25UYXNrVG9nZ2xlQ29tcGxldGUgPSBjYWxsYmFja3Mub25UYXNrVG9nZ2xlQ29tcGxldGU7XHJcblx0XHR0aGlzLm9uVGFza0VkaXQgPSBjYWxsYmFja3Mub25UYXNrRWRpdDtcclxuXHRcdHRoaXMub25UYXNrVXBkYXRlID0gY2FsbGJhY2tzLm9uVGFza1VwZGF0ZTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNldCBmaWx0ZXIgY2FsbGJhY2tzXHJcblx0ICovXHJcblx0c2V0RmlsdGVyQ2FsbGJhY2tzKGNhbGxiYWNrczoge1xyXG5cdFx0b25GaWx0ZXJSZXNldDogKCkgPT4gdm9pZDtcclxuXHRcdGdldExpdmVGaWx0ZXJTdGF0ZTogKCkgPT4gUm9vdEZpbHRlclN0YXRlIHwgbnVsbDtcclxuXHR9KTogdm9pZCB7XHJcblx0XHR0aGlzLm9uRmlsdGVyUmVzZXQgPSBjYWxsYmFja3Mub25GaWx0ZXJSZXNldDtcclxuXHRcdHRoaXMuZ2V0TGl2ZUZpbHRlclN0YXRlID0gY2FsbGJhY2tzLmdldExpdmVGaWx0ZXJTdGF0ZTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGlmIHVzaW5nIHdvcmtzcGFjZSBzaWRlIGxlYXZlcyBtb2RlXHJcblx0ICovXHJcblx0cHJpdmF0ZSB1c2VTaWRlTGVhdmVzKCk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuICEhKHRoaXMucGx1Z2luLnNldHRpbmdzLmZsdWVudFZpZXcpPy51c2VXb3Jrc3BhY2VTaWRlTGVhdmVzO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSW5pdGlhbGl6ZSBzaWRlYmFyIChub24tbGVhdmVzIG1vZGUgb25seSlcclxuXHQgKi9cclxuXHRpbml0aWFsaXplU2lkZWJhcihjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdGlmICh0aGlzLnVzZVNpZGVMZWF2ZXMoKSkge1xyXG5cdFx0XHRjb250YWluZXJFbC5oaWRlKCk7XHJcblx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFwiW0ZsdWVudExheW91dF0gVXNpbmcgd29ya3NwYWNlIHNpZGUgbGVhdmVzOiBza2lwIGluLXZpZXcgc2lkZWJhclwiXHJcblx0XHRcdCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBPbiBtb2JpbGUsIHN0YXJ0IHdpdGggc2lkZWJhciBjb21wbGV0ZWx5IGhpZGRlbiAoZHJhd2VyIGNsb3NlZClcclxuXHRcdGNvbnN0IGluaXRpYWxDb2xsYXBzZWRTdGF0ZSA9IFBsYXRmb3JtLmlzUGhvbmVcclxuXHRcdFx0PyB0cnVlXHJcblx0XHRcdDogdGhpcy5pc1NpZGViYXJDb2xsYXBzZWQ7XHJcblxyXG5cdFx0dGhpcy5zaWRlYmFyID0gbmV3IEZsdWVudFNpZGViYXIoXHJcblx0XHRcdGNvbnRhaW5lckVsLFxyXG5cdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0KHZpZXdJZCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMub25TaWRlYmFyTmF2aWdhdGU/Lih2aWV3SWQpO1xyXG5cdFx0XHRcdC8vIEF1dG8tY2xvc2UgZHJhd2VyIG9uIG1vYmlsZSBhZnRlciBuYXZpZ2F0aW9uXHJcblx0XHRcdFx0aWYgKFBsYXRmb3JtLmlzUGhvbmUpIHtcclxuXHRcdFx0XHRcdHRoaXMuY2xvc2VNb2JpbGVEcmF3ZXIoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sXHJcblx0XHRcdChwcm9qZWN0SWQpID0+IHtcclxuXHRcdFx0XHR0aGlzLm9uUHJvamVjdFNlbGVjdD8uKHByb2plY3RJZCk7XHJcblx0XHRcdFx0Ly8gQXV0by1jbG9zZSBkcmF3ZXIgb24gbW9iaWxlIGFmdGVyIHNlbGVjdGlvblxyXG5cdFx0XHRcdGlmIChQbGF0Zm9ybS5pc1Bob25lKSB7XHJcblx0XHRcdFx0XHR0aGlzLmNsb3NlTW9iaWxlRHJhd2VyKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRpbml0aWFsQ29sbGFwc2VkU3RhdGVcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gQWRkIHNpZGViYXIgYXMgYSBjaGlsZCBjb21wb25lbnQgZm9yIHByb3BlciBsaWZlY3ljbGUgbWFuYWdlbWVudFxyXG5cdFx0dGhpcy5hZGRDaGlsZCh0aGlzLnNpZGViYXIpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSW5pdGlhbGl6ZSBkZXRhaWxzIGNvbXBvbmVudCAobm9uLWxlYXZlcyBtb2RlIG9ubHkpXHJcblx0ICovXHJcblx0aW5pdGlhbGl6ZURldGFpbHNDb21wb25lbnQoKTogdm9pZCB7XHJcblx0XHRpZiAodGhpcy51c2VTaWRlTGVhdmVzKCkpIHtcclxuXHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XCJbRmx1ZW50TGF5b3V0XSBVc2luZyB3b3Jrc3BhY2Ugc2lkZSBsZWF2ZXM6IHNraXAgaW4tdmlldyBkZXRhaWxzIHBhbmVsXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgZGV0YWlscyBjb21wb25lbnQgKGhpZGRlbiBieSBkZWZhdWx0KVxyXG5cdFx0dGhpcy5kZXRhaWxzQ29tcG9uZW50ID0gbmV3IFRhc2tEZXRhaWxzQ29tcG9uZW50KFxyXG5cdFx0XHR0aGlzLnJvb3RDb250YWluZXJFbCxcclxuXHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdHRoaXMucGx1Z2luXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5hZGRDaGlsZCh0aGlzLmRldGFpbHNDb21wb25lbnQpO1xyXG5cdFx0dGhpcy5kZXRhaWxzQ29tcG9uZW50LmxvYWQoKTtcclxuXHJcblx0XHQvLyBTZXQgdXAgY2FsbGJhY2tzXHJcblx0XHR0aGlzLmRldGFpbHNDb21wb25lbnQub25UYXNrVG9nZ2xlQ29tcGxldGUgPSAodGFzazogVGFzaykgPT5cclxuXHRcdFx0dGhpcy5vblRhc2tUb2dnbGVDb21wbGV0ZT8uKHRhc2spO1xyXG5cdFx0dGhpcy5kZXRhaWxzQ29tcG9uZW50Lm9uVGFza0VkaXQgPSAodGFzazogVGFzaykgPT5cclxuXHRcdFx0dGhpcy5vblRhc2tFZGl0Py4odGFzayk7XHJcblx0XHR0aGlzLmRldGFpbHNDb21wb25lbnQub25UYXNrVXBkYXRlID0gYXN5bmMgKFxyXG5cdFx0XHRvcmlnaW5hbFRhc2s6IFRhc2ssXHJcblx0XHRcdHVwZGF0ZWRUYXNrOiBUYXNrXHJcblx0XHQpID0+IHtcclxuXHRcdFx0YXdhaXQgdGhpcy5vblRhc2tVcGRhdGU/LihvcmlnaW5hbFRhc2ssIHVwZGF0ZWRUYXNrKTtcclxuXHRcdH07XHJcblx0XHR0aGlzLmRldGFpbHNDb21wb25lbnQudG9nZ2xlRGV0YWlsc1Zpc2liaWxpdHkgPSAodmlzaWJsZTogYm9vbGVhbikgPT4ge1xyXG5cdFx0XHR0aGlzLnRvZ2dsZURldGFpbHNWaXNpYmlsaXR5KHZpc2libGUpO1xyXG5cdFx0fTtcclxuXHRcdHRoaXMuZGV0YWlsc0NvbXBvbmVudC5zZXRWaXNpYmxlKHRoaXMuaXNEZXRhaWxzVmlzaWJsZSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDcmVhdGUgc2lkZWJhciB0b2dnbGUgYnV0dG9uIGluIGhlYWRlclxyXG5cdCAqL1xyXG5cdGNyZWF0ZVNpZGViYXJUb2dnbGUoKTogdm9pZCB7XHJcblx0XHRjb25zdCBoZWFkZXJCdG5zID0gIVBsYXRmb3JtLmlzUGhvbmVcclxuXHRcdFx0PyAodGhpcy5oZWFkZXJFbD8ucXVlcnlTZWxlY3RvcihcclxuXHRcdFx0XHRcIi52aWV3LWhlYWRlci1uYXYtYnV0dG9uc1wiXHJcblx0XHRcdCkgYXMgSFRNTEVsZW1lbnQgfCBudWxsKVxyXG5cdFx0XHQ6ICh0aGlzLmhlYWRlckVsPy5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRcdFwiLnZpZXctaGVhZGVyLWxlZnRcIlxyXG5cdFx0XHQpIGFzIEhUTUxFbGVtZW50KTtcclxuXHJcblx0XHRpZiAoIWhlYWRlckJ0bnMpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFwiW0ZsdWVudExheW91dF0gaGVhZGVyIGJ1dHRvbnMgY29udGFpbmVyIG5vdCBmb3VuZFwiKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IGNvbnRhaW5lciA9IGhlYWRlckJ0bnMuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInBhbmVsLXRvZ2dsZS1jb250YWluZXJcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuc2lkZWJhclRvZ2dsZUJ0biA9IGNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwicGFuZWwtdG9nZ2xlLWJ0blwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgYnRuID0gbmV3IEJ1dHRvbkNvbXBvbmVudCh0aGlzLnNpZGViYXJUb2dnbGVCdG4pO1xyXG5cdFx0YnRuLnNldEljb24oUGxhdGZvcm0uaXNQaG9uZSA/IFwibWVudVwiIDogXCJwYW5lbC1sZWZ0LWRhc2hlZFwiKVxyXG5cdFx0XHQuc2V0VG9vbHRpcCh0KFwiVG9nZ2xlIFNpZGViYXJcIikpXHJcblx0XHRcdC5zZXRDbGFzcyhcImNsaWNrYWJsZS1pY29uXCIpXHJcblx0XHRcdC5vbkNsaWNrKCgpID0+IHRoaXMudG9nZ2xlU2lkZWJhcigpKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZSB0YXNrIGNvdW50IG1hcmsgaW4gdGl0bGVcclxuXHQgKi9cclxuXHRjcmVhdGVUYXNrTWFyaygpOiB2b2lkIHtcclxuXHRcdHRoaXMudXBkYXRlVGFza01hcmsoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSB0YXNrIGNvdW50IGluIHRpdGxlXHJcblx0ICovXHJcblx0dXBkYXRlVGFza01hcmsoKTogdm9pZCB7XHJcblx0XHR0aGlzLnRpdGxlRWwuc2V0VGV4dChcclxuXHRcdFx0dChcInt7bnVtfX0gVGFza3NcIiwge1xyXG5cdFx0XHRcdGludGVycG9sYXRpb246IHtcclxuXHRcdFx0XHRcdG51bTogdGhpcy5nZXRUYXNrQ291bnQoKSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFRvZ2dsZSBzaWRlYmFyIHZpc2liaWxpdHlcclxuXHQgKiBCZWhhdmlvciBkaWZmZXJzIGJhc2VkIG9uIG1vZGU6XHJcblx0ICogLSBMZWF2ZXMgbW9kZTogVG9nZ2xlIHdvcmtzcGFjZSBsZWZ0IHNwbGl0XHJcblx0ICogLSBOb24tbGVhdmVzIG1vZGU6IFRvZ2dsZSBpbnRlcm5hbCBzaWRlYmFyIGNvbXBvbmVudFxyXG5cdCAqIC0gTW9iaWxlOiBUb2dnbGUgZHJhd2VyIG92ZXJsYXlcclxuXHQgKi9cclxuXHR0b2dnbGVTaWRlYmFyKCk6IHZvaWQge1xyXG5cdFx0aWYgKHRoaXMudXNlU2lkZUxlYXZlcygpKSB7XHJcblx0XHRcdC8vIEluIHNpZGUtbGVhZiBtb2RlLCB0b2dnbGUgdGhlIGxlZnQgc2lkZWJhciBzcGxpdCBjb2xsYXBzZSBzdGF0ZVxyXG5cdFx0XHRjb25zdCB3cyA9IHRoaXMuYXBwLndvcmtzcGFjZTtcclxuXHRcdFx0Y29uc3QgbGVmdFNwbGl0ID0gd3MubGVmdFNwbGl0O1xyXG5cdFx0XHRjb25zdCBpc0NvbGxhcHNlZCA9ICEhbGVmdFNwbGl0Py5jb2xsYXBzZWQ7XHJcblxyXG5cdFx0XHRpZiAoaXNDb2xsYXBzZWQpIHtcclxuXHRcdFx0XHQvLyBFeHBhbmQgYW5kIGVuc3VyZSBvdXIgc2lkZWJhciB2aWV3XHJcblx0XHRcdFx0bGVmdFNwbGl0LmV4cGFuZCgpO1xyXG5cdFx0XHRcdC8vIEhhbmRsZSBhc3luYyBlbnN1cmVTaWRlTGVhZlxyXG5cdFx0XHRcdHdzLmVuc3VyZVNpZGVMZWFmKFRHX0xFRlRfU0lERUJBUl9WSUVXX1RZUEUsIFwibGVmdFwiLCB7XHJcblx0XHRcdFx0XHRhY3RpdmU6IGZhbHNlLFxyXG5cdFx0XHRcdH0pLnRoZW4oKGxlZnRMZWFmKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAobGVmdExlYWYpIHtcclxuXHRcdFx0XHRcdFx0d3MucmV2ZWFsTGVhZj8uKGxlZnRMZWFmKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRsZWZ0U3BsaXQuY29sbGFwc2UoKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKFBsYXRmb3JtLmlzUGhvbmUpIHtcclxuXHRcdFx0Ly8gT24gbW9iaWxlLCB0b2dnbGUgdGhlIGRyYXdlciBvcGVuL2Nsb3NlZFxyXG5cdFx0XHRpZiAodGhpcy5pc01vYmlsZURyYXdlck9wZW4pIHtcclxuXHRcdFx0XHR0aGlzLmNsb3NlTW9iaWxlRHJhd2VyKCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGhpcy5vcGVuTW9iaWxlRHJhd2VyKCk7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIE9uIGRlc2t0b3AsIHRvZ2dsZSBjb2xsYXBzZSBzdGF0ZVxyXG5cdFx0XHR0aGlzLmlzU2lkZWJhckNvbGxhcHNlZCA9ICF0aGlzLmlzU2lkZWJhckNvbGxhcHNlZDtcclxuXHRcdFx0dGhpcy5zaWRlYmFyPy5zZXRDb2xsYXBzZWQodGhpcy5pc1NpZGViYXJDb2xsYXBzZWQpO1xyXG5cdFx0XHR0aGlzLnJvb3RDb250YWluZXJFbD8udG9nZ2xlQ2xhc3MoXHJcblx0XHRcdFx0XCJmbHVlbnQtc2lkZWJhci1jb2xsYXBzZWRcIixcclxuXHRcdFx0XHR0aGlzLmlzU2lkZWJhckNvbGxhcHNlZFxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogT3BlbiBtb2JpbGUgZHJhd2VyXHJcblx0ICovXHJcblx0b3Blbk1vYmlsZURyYXdlcigpOiB2b2lkIHtcclxuXHRcdHRoaXMuaXNNb2JpbGVEcmF3ZXJPcGVuID0gdHJ1ZTtcclxuXHRcdHRoaXMucm9vdENvbnRhaW5lckVsPy5hZGRDbGFzcyhcImRyYXdlci1vcGVuXCIpO1xyXG5cdFx0aWYgKHRoaXMuZHJhd2VyT3ZlcmxheSkge1xyXG5cdFx0XHR0aGlzLmRyYXdlck92ZXJsYXkuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcclxuXHRcdH1cclxuXHRcdC8vIFNob3cgdGhlIHNpZGViYXJcclxuXHRcdHRoaXMuc2lkZWJhcj8uc2V0Q29sbGFwc2VkKGZhbHNlKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsb3NlIG1vYmlsZSBkcmF3ZXJcclxuXHQgKi9cclxuXHRjbG9zZU1vYmlsZURyYXdlcigpOiB2b2lkIHtcclxuXHRcdHRoaXMuaXNNb2JpbGVEcmF3ZXJPcGVuID0gZmFsc2U7XHJcblx0XHR0aGlzLnJvb3RDb250YWluZXJFbD8ucmVtb3ZlQ2xhc3MoXCJkcmF3ZXItb3BlblwiKTtcclxuXHRcdGlmICh0aGlzLmRyYXdlck92ZXJsYXkpIHtcclxuXHRcdFx0dGhpcy5kcmF3ZXJPdmVybGF5LnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuXHRcdH1cclxuXHRcdC8vIEhpZGUgdGhlIHNpZGViYXJcclxuXHRcdHRoaXMuc2lkZWJhcj8uc2V0Q29sbGFwc2VkKHRydWUpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2V0IHVwIGRyYXdlciBvdmVybGF5IGZvciBtb2JpbGVcclxuXHQgKi9cclxuXHRzZXR1cERyYXdlck92ZXJsYXkobGF5b3V0Q29udGFpbmVyOiBIVE1MRWxlbWVudCk6IHZvaWQge1xyXG5cdFx0aWYgKCFQbGF0Zm9ybS5pc1Bob25lKSByZXR1cm47XHJcblxyXG5cdFx0dGhpcy5kcmF3ZXJPdmVybGF5ID0gbGF5b3V0Q29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJkcmF3ZXItb3ZlcmxheVwiLFxyXG5cdFx0fSk7XHJcblx0XHR0aGlzLmRyYXdlck92ZXJsYXkuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG5cdFx0dGhpcy5kcmF3ZXJPdmVybGF5LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdHRoaXMuY2xvc2VNb2JpbGVEcmF3ZXIoKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVG9nZ2xlIGRldGFpbHMgcGFuZWwgdmlzaWJpbGl0eVxyXG5cdCAqIEJlaGF2aW9yIGRpZmZlcnMgYmFzZWQgb24gbW9kZTpcclxuXHQgKiAtIExlYXZlcyBtb2RlOiBUb2dnbGUgd29ya3NwYWNlIHJpZ2h0IHNwbGl0XHJcblx0ICogLSBOb24tbGVhdmVzIG1vZGU6IFRvZ2dsZSBpbnRlcm5hbCBkZXRhaWxzIGNvbXBvbmVudFxyXG5cdCAqIC0gTW9iaWxlOiBPdmVybGF5IHdpdGggYmFja2Ryb3BcclxuXHQgKi9cclxuXHR0b2dnbGVEZXRhaWxzVmlzaWJpbGl0eSh2aXNpYmxlOiBib29sZWFuKTogdm9pZCB7XHJcblx0XHR0aGlzLmlzRGV0YWlsc1Zpc2libGUgPSB2aXNpYmxlO1xyXG5cclxuXHRcdGlmICh0aGlzLnVzZVNpZGVMZWF2ZXMoKSkge1xyXG5cdFx0XHQvLyBJbiBzaWRlLWxlYWYgbW9kZSwgcmV2ZWFsL2NvbGxhcHNlIHRoZSByaWdodCBkZXRhaWxzIHBhbmVcclxuXHRcdFx0Y29uc3Qgd3MgPSB0aGlzLmFwcC53b3Jrc3BhY2U7XHJcblx0XHRcdGlmICh2aXNpYmxlKSB7XHJcblx0XHRcdFx0Ly8gVHJ5IHRvIGV4cGFuZCByaWdodCBzcGxpdCBpZiBpdCdzIGNvbGxhcHNlZFxyXG5cdFx0XHRcdGlmICh3cy5yaWdodFNwbGl0Py5jb2xsYXBzZWQpIHtcclxuXHRcdFx0XHRcdHdzLnJpZ2h0U3BsaXQuZXhwYW5kKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHdzLnJpZ2h0U3BsaXQuY29sbGFwc2UoKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIGhlYWRlciB0b2dnbGUgdmlzdWFsIHN0YXRlXHJcblx0XHRcdGlmICh0aGlzLmRldGFpbHNUb2dnbGVCdG4pIHtcclxuXHRcdFx0XHR0aGlzLmRldGFpbHNUb2dnbGVCdG4udG9nZ2xlQ2xhc3MoXCJpcy1hY3RpdmVcIiwgdmlzaWJsZSk7XHJcblx0XHRcdFx0dGhpcy5kZXRhaWxzVG9nZ2xlQnRuLnNldEF0dHJpYnV0ZShcclxuXHRcdFx0XHRcdFwiYXJpYS1sYWJlbFwiLFxyXG5cdFx0XHRcdFx0dmlzaWJsZSA/IHQoXCJIaWRlIERldGFpbHNcIikgOiB0KFwiU2hvdyBEZXRhaWxzXCIpXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gTGVnYWN5L2luLXZpZXcgbW9kZVxyXG5cdFx0dGhpcy5yb290Q29udGFpbmVyRWw/LnRvZ2dsZUNsYXNzKFwiZGV0YWlscy12aXNpYmxlXCIsIHZpc2libGUpO1xyXG5cdFx0dGhpcy5yb290Q29udGFpbmVyRWw/LnRvZ2dsZUNsYXNzKFwiZGV0YWlscy1oaWRkZW5cIiwgIXZpc2libGUpO1xyXG5cclxuXHRcdGlmICh0aGlzLmRldGFpbHNDb21wb25lbnQpIHtcclxuXHRcdFx0dGhpcy5kZXRhaWxzQ29tcG9uZW50LnNldFZpc2libGUodmlzaWJsZSk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHRoaXMuZGV0YWlsc1RvZ2dsZUJ0bikge1xyXG5cdFx0XHR0aGlzLmRldGFpbHNUb2dnbGVCdG4udG9nZ2xlQ2xhc3MoXCJpcy1hY3RpdmVcIiwgdmlzaWJsZSk7XHJcblx0XHRcdHRoaXMuZGV0YWlsc1RvZ2dsZUJ0bi5zZXRBdHRyaWJ1dGUoXHJcblx0XHRcdFx0XCJhcmlhLWxhYmVsXCIsXHJcblx0XHRcdFx0dmlzaWJsZSA/IHQoXCJIaWRlIERldGFpbHNcIikgOiB0KFwiU2hvdyBEZXRhaWxzXCIpXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gT24gbW9iaWxlLCBhZGQgY2xpY2sgaGFuZGxlciB0byBvdmVybGF5IHRvIGNsb3NlIGRldGFpbHNcclxuXHRcdGlmIChQbGF0Zm9ybS5pc1Bob25lICYmIHZpc2libGUpIHtcclxuXHRcdFx0Ly8gVXNlIHNldFRpbWVvdXQgdG8gYXZvaWQgaW1tZWRpYXRlIGNsb3NlIG9uIG9wZW5cclxuXHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0Y29uc3Qgb3ZlcmxheUNsaWNrSGFuZGxlciA9IChlOiBNb3VzZUV2ZW50KSA9PiB7XHJcblx0XHRcdFx0XHQvLyBDaGVjayBpZiBjbGljayBpcyBvbiB0aGUgb3ZlcmxheSAocHNldWRvLWVsZW1lbnQgYXJlYSlcclxuXHRcdFx0XHRcdGNvbnN0IGRldGFpbHNFbCA9XHJcblx0XHRcdFx0XHRcdHRoaXMucm9vdENvbnRhaW5lckVsPy5xdWVyeVNlbGVjdG9yKFwiLnRhc2stZGV0YWlsc1wiKTtcclxuXHRcdFx0XHRcdGlmIChkZXRhaWxzRWwgJiYgIWRldGFpbHNFbC5jb250YWlucyhlLnRhcmdldCBhcyBOb2RlKSkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnRvZ2dsZURldGFpbHNWaXNpYmlsaXR5KGZhbHNlKTtcclxuXHRcdFx0XHRcdFx0ZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcclxuXHRcdFx0XHRcdFx0XHRcImNsaWNrXCIsXHJcblx0XHRcdFx0XHRcdFx0b3ZlcmxheUNsaWNrSGFuZGxlclxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIG92ZXJsYXlDbGlja0hhbmRsZXIpO1xyXG5cdFx0XHRcdHRoaXMubW9iaWxlRGV0YWlsc092ZXJsYXlIYW5kbGVyID0gb3ZlcmxheUNsaWNrSGFuZGxlcjtcclxuXHRcdFx0fSwgMTAwKTtcclxuXHRcdH0gZWxzZSBpZiAoXHJcblx0XHRcdFBsYXRmb3JtLmlzUGhvbmUgJiZcclxuXHRcdFx0IXZpc2libGUgJiZcclxuXHRcdFx0dGhpcy5tb2JpbGVEZXRhaWxzT3ZlcmxheUhhbmRsZXJcclxuXHRcdCkge1xyXG5cdFx0XHRkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFxyXG5cdFx0XHRcdFwiY2xpY2tcIixcclxuXHRcdFx0XHR0aGlzLm1vYmlsZURldGFpbHNPdmVybGF5SGFuZGxlclxyXG5cdFx0XHQpO1xyXG5cdFx0XHRkZWxldGUgdGhpcy5tb2JpbGVEZXRhaWxzT3ZlcmxheUhhbmRsZXI7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTdG9yZSBkZXRhaWxzIHRvZ2dsZSBidXR0b24gcmVmZXJlbmNlXHJcblx0ICovXHJcblx0c2V0RGV0YWlsc1RvZ2dsZUJ0bihidG46IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHR0aGlzLmRldGFpbHNUb2dnbGVCdG4gPSBidG47XHJcblx0XHR0aGlzLmRldGFpbHNUb2dnbGVCdG4udG9nZ2xlQ2xhc3MoXCJpcy1hY3RpdmVcIiwgdGhpcy5pc0RldGFpbHNWaXNpYmxlKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGFuZCBhdXRvLWNvbGxhcHNlIHNpZGViYXIgb24gbmFycm93IHNjcmVlbnMgKGRlc2t0b3Agb25seSlcclxuXHQgKi9cclxuXHRjaGVja0FuZENvbGxhcHNlU2lkZWJhcigpOiB2b2lkIHtcclxuXHRcdC8vIFNraXAgYXV0by1jb2xsYXBzZSBvbiBtb2JpbGUsIGFzIHdlIHVzZSBkcmF3ZXIgbW9kZVxyXG5cdFx0aWYgKFBsYXRmb3JtLmlzUGhvbmUpIHtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEF1dG8tY29sbGFwc2Ugb24gbmFycm93IHBhbmVzIChkZXNrdG9wIG9ubHkpXHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCB3aWR0aCA9IHRoaXMubGVhZj8ud2lkdGggPz8gMDtcclxuXHRcdFx0aWYgKHdpZHRoID4gMCAmJiB3aWR0aCA8IDc2OCkge1xyXG5cdFx0XHRcdHRoaXMuaXNTaWRlYmFyQ29sbGFwc2VkID0gdHJ1ZTtcclxuXHRcdFx0XHR0aGlzLnNpZGViYXI/LnNldENvbGxhcHNlZCh0cnVlKTtcclxuXHRcdFx0XHR0aGlzLnJvb3RDb250YWluZXJFbD8uYWRkQ2xhc3MoXCJmbHVlbnQtc2lkZWJhci1jb2xsYXBzZWRcIik7XHJcblx0XHRcdH1cclxuXHRcdH0gY2F0Y2ggKF8pIHtcclxuXHRcdFx0Ly8gSWdub3JlIGVycm9yc1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSGFuZGxlIHdpbmRvdyByZXNpemVcclxuXHQgKi9cclxuXHRvblJlc2l6ZSgpOiB2b2lkIHtcclxuXHRcdC8vIE9ubHkgY2hlY2sgYW5kIGNvbGxhcHNlIG9uIGRlc2t0b3BcclxuXHRcdGlmICghUGxhdGZvcm0uaXNQaG9uZSkge1xyXG5cdFx0XHR0aGlzLmNoZWNrQW5kQ29sbGFwc2VTaWRlYmFyKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTaG93IHRhc2sgZGV0YWlscyBpbiBkZXRhaWxzIHBhbmVsXHJcblx0ICovXHJcblx0c2hvd1Rhc2tEZXRhaWxzKHRhc2s6IFRhc2spOiB2b2lkIHtcclxuXHRcdGlmICh0aGlzLnVzZVNpZGVMZWF2ZXMoKSkge1xyXG5cdFx0XHQvLyBJbiBsZWF2ZXMgbW9kZSwgZW1pdCBldmVudCB0byBzaWRlIGxlYWYgZGV0YWlscyB2aWV3XHJcblx0XHRcdC8vIFRoaXMgd2lsbCBiZSBoYW5kbGVkIGJ5IHRoZSBtYWluIHZpZXcncyBldmVudCBlbWlzc2lvblxyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5kZXRhaWxzQ29tcG9uZW50Py5zaG93VGFza0RldGFpbHModGFzayk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTZXQgc2lkZWJhciBhY3RpdmUgaXRlbVxyXG5cdCAqL1xyXG5cdHNldFNpZGViYXJBY3RpdmVJdGVtKHZpZXdJZDogc3RyaW5nKTogdm9pZCB7XHJcblx0XHR0aGlzLnNpZGViYXI/LnNldEFjdGl2ZUl0ZW0odmlld0lkKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlZnJlc2ggc2lkZWJhciBwcm9qZWN0IGxpc3RcclxuXHQgKi9cclxuXHRyZWZyZXNoU2lkZWJhclByb2plY3RzKCk6IHZvaWQge1xyXG5cdFx0dGhpcy5zaWRlYmFyPy5wcm9qZWN0TGlzdD8ucmVmcmVzaCgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2V0IGFjdGl2ZSBwcm9qZWN0IGluIHNpZGViYXJcclxuXHQgKi9cclxuXHRzZXRBY3RpdmVQcm9qZWN0KHByb2plY3RJZDogc3RyaW5nIHwgbnVsbCk6IHZvaWQge1xyXG5cdFx0dGhpcy5zaWRlYmFyPy5wcm9qZWN0TGlzdD8uc2V0QWN0aXZlUHJvamVjdChwcm9qZWN0SWQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ3JlYXRlIGFjdGlvbiBidXR0b25zIGluIHZpZXcgaGVhZGVyXHJcblx0ICogLSBEZXRhaWxzIHRvZ2dsZSBidXR0b25cclxuXHQgKiAtIFF1aWNrIGNhcHR1cmUgYnV0dG9uXHJcblx0ICogLSBGaWx0ZXIgYnV0dG9uXHJcblx0ICogLSBSZXNldCBmaWx0ZXIgYnV0dG9uIChjb25kaXRpb25hbClcclxuXHQgKi9cclxuXHRjcmVhdGVBY3Rpb25CdXR0b25zKCk6IHZvaWQge1xyXG5cdFx0Ly8gRGV0YWlscyB0b2dnbGUgYnV0dG9uXHJcblx0XHR0aGlzLmRldGFpbHNUb2dnbGVCdG4gPSB0aGlzLnZpZXcuYWRkQWN0aW9uKFxyXG5cdFx0XHRcInBhbmVsLXJpZ2h0LWRhc2hlZFwiLFxyXG5cdFx0XHR0KFwiRGV0YWlsc1wiKSxcclxuXHRcdFx0KCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMudG9nZ2xlRGV0YWlsc1Zpc2liaWxpdHkoIXRoaXMuaXNEZXRhaWxzVmlzaWJsZSk7XHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblxyXG5cdFx0aWYgKHRoaXMuZGV0YWlsc1RvZ2dsZUJ0bikge1xyXG5cdFx0XHR0aGlzLmRldGFpbHNUb2dnbGVCdG4udG9nZ2xlQ2xhc3MoXCJwYW5lbC10b2dnbGUtYnRuXCIsIHRydWUpO1xyXG5cdFx0XHR0aGlzLmRldGFpbHNUb2dnbGVCdG4udG9nZ2xlQ2xhc3MoXHJcblx0XHRcdFx0XCJpcy1hY3RpdmVcIixcclxuXHRcdFx0XHR0aGlzLmlzRGV0YWlsc1Zpc2libGVcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDYXB0dXJlIGJ1dHRvblxyXG5cdFx0dGhpcy52aWV3LmFkZEFjdGlvbihcIm5vdGVib29rLXBlblwiLCB0KFwiQ2FwdHVyZVwiKSwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBtb2RhbCA9IG5ldyBRdWlja0NhcHR1cmVNb2RhbChcclxuXHRcdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0XHR7fSxcclxuXHRcdFx0XHR0cnVlXHJcblx0XHRcdCk7XHJcblx0XHRcdG1vZGFsLm9wZW4oKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEZpbHRlciBidXR0b25cclxuXHRcdHRoaXMudmlldy5hZGRBY3Rpb24oXCJmaWx0ZXJcIiwgdChcIkZpbHRlclwiKSwgKGU6IE1vdXNlRXZlbnQpID0+IHtcclxuXHRcdFx0aWYgKFBsYXRmb3JtLmlzRGVza3RvcCkge1xyXG5cdFx0XHRcdGNvbnN0IHBvcG92ZXIgPSBuZXcgVmlld1Rhc2tGaWx0ZXJQb3BvdmVyKFxyXG5cdFx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0XHR1bmRlZmluZWQsXHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpblxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdC8vIFNldCB1cCBmaWx0ZXIgc3RhdGUgd2hlbiBvcGVuaW5nXHJcblx0XHRcdFx0dGhpcy5hcHAud29ya3NwYWNlLm9uTGF5b3V0UmVhZHkoKCkgPT4ge1xyXG5cdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IGxpdmVGaWx0ZXJTdGF0ZSA9IHRoaXMuZ2V0TGl2ZUZpbHRlclN0YXRlPy4oKTtcclxuXHRcdFx0XHRcdFx0aWYgKGxpdmVGaWx0ZXJTdGF0ZSAmJiBwb3BvdmVyLnRhc2tGaWx0ZXJDb21wb25lbnQpIHtcclxuXHRcdFx0XHRcdFx0XHRwb3BvdmVyLnRhc2tGaWx0ZXJDb21wb25lbnQubG9hZEZpbHRlclN0YXRlKFxyXG5cdFx0XHRcdFx0XHRcdFx0bGl2ZUZpbHRlclN0YXRlXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSwgMTAwKTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0cG9wb3Zlci5zaG93QXRQb3NpdGlvbih7eDogZS5jbGllbnRYLCB5OiBlLmNsaWVudFl9KTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRjb25zdCBtb2RhbCA9IG5ldyBWaWV3VGFza0ZpbHRlck1vZGFsKFxyXG5cdFx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0XHR0aGlzLmxlYWYuaWQsXHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpblxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdG1vZGFsLm9wZW4oKTtcclxuXHJcblx0XHRcdFx0Ly8gU2V0IGluaXRpYWwgZmlsdGVyIHN0YXRlXHJcblx0XHRcdFx0Y29uc3QgbGl2ZUZpbHRlclN0YXRlID0gdGhpcy5nZXRMaXZlRmlsdGVyU3RhdGU/LigpO1xyXG5cdFx0XHRcdGlmIChsaXZlRmlsdGVyU3RhdGUgJiYgbW9kYWwudGFza0ZpbHRlckNvbXBvbmVudCkge1xyXG5cdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0XHRcdG1vZGFsLnRhc2tGaWx0ZXJDb21wb25lbnQubG9hZEZpbHRlclN0YXRlKFxyXG5cdFx0XHRcdFx0XHRcdGxpdmVGaWx0ZXJTdGF0ZVxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fSwgMTAwKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSBhY3Rpb24gYnV0dG9ucyB2aXNpYmlsaXR5XHJcblx0XHR0aGlzLnVwZGF0ZUFjdGlvbkJ1dHRvbnMoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBhY3Rpb24gYnV0dG9ucyB2aXNpYmlsaXR5IChtYWlubHkgUmVzZXQgRmlsdGVyIGJ1dHRvbilcclxuXHQgKi9cclxuXHR1cGRhdGVBY3Rpb25CdXR0b25zKCk6IHZvaWQge1xyXG5cdFx0Ly8gUmVtb3ZlIHJlc2V0IGZpbHRlciBidXR0b24gaWYgZXhpc3RzXHJcblx0XHRjb25zdCByZXNldEJ1dHRvbiA9IHRoaXMuaGVhZGVyRWwucXVlcnlTZWxlY3RvcihcclxuXHRcdFx0XCIudmlldy1hY3Rpb24udGFzay1maWx0ZXItcmVzZXRcIlxyXG5cdFx0KTtcclxuXHRcdGlmIChyZXNldEJ1dHRvbikge1xyXG5cdFx0XHRyZXNldEJ1dHRvbi5yZW1vdmUoKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGQgcmVzZXQgZmlsdGVyIGJ1dHRvbiBpZiB0aGVyZSBhcmUgYWN0aXZlIGZpbHRlcnNcclxuXHRcdGNvbnN0IGxpdmVGaWx0ZXJTdGF0ZSA9IHRoaXMuZ2V0TGl2ZUZpbHRlclN0YXRlPy4oKTtcclxuXHRcdGlmIChcclxuXHRcdFx0bGl2ZUZpbHRlclN0YXRlICYmXHJcblx0XHRcdGxpdmVGaWx0ZXJTdGF0ZS5maWx0ZXJHcm91cHMgJiZcclxuXHRcdFx0bGl2ZUZpbHRlclN0YXRlLmZpbHRlckdyb3Vwcy5sZW5ndGggPiAwXHJcblx0XHQpIHtcclxuXHRcdFx0dGhpcy52aWV3XHJcblx0XHRcdFx0LmFkZEFjdGlvbihcInJlc2V0XCIsIHQoXCJSZXNldCBGaWx0ZXJcIiksICgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMub25GaWx0ZXJSZXNldD8uKCk7XHJcblx0XHRcdFx0fSlcclxuXHRcdFx0XHQuYWRkQ2xhc3MoXCJ0YXNrLWZpbHRlci1yZXNldFwiKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsZWFuIHVwIG1vYmlsZSBldmVudCBsaXN0ZW5lcnNcclxuXHQgKi9cclxuXHRvbnVubG9hZCgpOiB2b2lkIHtcclxuXHRcdGlmIChQbGF0Zm9ybS5pc1Bob25lICYmICh0aGlzIGFzIGFueSkubW9iaWxlRGV0YWlsc092ZXJsYXlIYW5kbGVyKSB7XHJcblx0XHRcdGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXHJcblx0XHRcdFx0XCJjbGlja1wiLFxyXG5cdFx0XHRcdCh0aGlzIGFzIGFueSkubW9iaWxlRGV0YWlsc092ZXJsYXlIYW5kbGVyXHJcblx0XHRcdCk7XHJcblx0XHRcdGRlbGV0ZSAodGhpcyBhcyBhbnkpLm1vYmlsZURldGFpbHNPdmVybGF5SGFuZGxlcjtcclxuXHRcdH1cclxuXHRcdHN1cGVyLm9udW5sb2FkKCk7XHJcblx0fVxyXG59XHJcbiJdfQ==