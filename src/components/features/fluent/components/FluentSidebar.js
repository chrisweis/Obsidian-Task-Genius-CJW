import { __awaiter } from "tslib";
import { Component, setIcon, Menu, Notice, Modal, Platform } from "obsidian";
import { WorkspaceSelector } from "./WorkspaceSelector";
import { ProjectList } from "@/components/features/fluent/components/ProjectList";
import { onWorkspaceSwitched, onWorkspaceDeleted, onWorkspaceCreated, } from "@/components/features/fluent/events/ui-event";
import { t } from "@/translations/helper";
import { ViewConfigModal } from "@/components/features/task/view/modals/ViewConfigModal";
import { TASK_SPECIFIC_VIEW_TYPE } from "@/pages/TaskSpecificView";
export class FluentSidebar extends Component {
    constructor(containerEl, plugin, onNavigate, onProjectSelect, collapsed = false) {
        var _a;
        super();
        this.onNavigate = onNavigate;
        this.onProjectSelect = onProjectSelect;
        this.collapsed = false;
        this.isTreeView = false;
        this.otherViewsSection = null;
        this.railEl = null;
        this.primaryItems = [
            { id: "inbox", label: t("Inbox"), icon: "inbox", type: "primary" },
            {
                id: "today",
                label: t("Today"),
                icon: "calendar-days",
                type: "primary",
            },
            {
                id: "upcoming",
                label: t("Upcoming"),
                icon: "calendar",
                type: "primary",
            },
            { id: "flagged", label: t("Flagged"), icon: "flag", type: "primary" },
        ];
        this.otherItems = [
            {
                id: "calendar",
                label: t("Calendar"),
                icon: "calendar",
                type: "other",
            },
            { id: "gantt", label: t("Gantt"), icon: "git-branch", type: "other" },
            {
                id: "review",
                label: t("Review"),
                icon: "check-square",
                type: "other",
            },
            { id: "tags", label: t("Tags"), icon: "tag", type: "other" },
        ];
        this.containerEl = containerEl;
        this.plugin = plugin;
        this.collapsed = collapsed;
        this.currentWorkspaceId =
            ((_a = plugin.workspaceManager) === null || _a === void 0 ? void 0 : _a.getActiveWorkspace().id) || "";
    }
    render() {
        this.containerEl.empty();
        this.containerEl.addClass("fluent-sidebar");
        this.containerEl.toggleClass("is-collapsed", this.collapsed);
        // Desktop: show rail mode when collapsed
        // Mobile: always render full sidebar (CSS handles visibility)
        if (this.collapsed && !Platform.isPhone) {
            this.railEl = this.containerEl.createDiv({
                cls: "fluent-sidebar-rail",
            });
            this.renderRailMode();
            return;
        }
        // Header with workspace selector and new task button
        const header = this.containerEl.createDiv({
            cls: "fluent-sidebar-header",
        });
        const workspaceSelectorEl = header.createDiv();
        if (this.plugin.workspaceManager) {
            this.workspaceSelector = new WorkspaceSelector(workspaceSelectorEl, this.plugin, (workspaceId) => this.handleWorkspaceChange(workspaceId));
        }
        // New Task Button
        const newTaskBtn = header.createEl("button", {
            cls: "fluent-new-task-btn",
            text: t("New Task"),
        });
        setIcon(newTaskBtn.createDiv({ cls: "fluent-new-task-icon" }), "plus");
        newTaskBtn.addEventListener("click", () => {
            this.onNavigate("new-task");
        });
        // Main navigation area
        const content = this.containerEl.createDiv({
            cls: "fluent-sidebar-content",
        });
        // Primary navigation section
        const primarySection = content.createDiv({
            cls: "fluent-sidebar-section",
        });
        this.renderNavigationItems(primarySection, this.primaryItems);
        // Projects section
        const projectsSection = content.createDiv({
            cls: "fluent-sidebar-section",
        });
        const projectHeader = projectsSection.createDiv({
            cls: "fluent-section-header",
        });
        projectHeader.createSpan({ text: t("Projects") });
        // Button container for tree toggle and sort
        const buttonContainer = projectHeader.createDiv({
            cls: "fluent-project-header-buttons",
        });
        // Tree/List toggle button
        const treeToggleBtn = buttonContainer.createDiv({
            cls: "fluent-tree-toggle-btn",
            attr: { "aria-label": t("Toggle tree/list view") },
        });
        // Load saved view mode preference
        this.isTreeView =
            this.plugin.app.loadLocalStorage("task-genius-project-view-mode") === "tree";
        setIcon(treeToggleBtn, this.isTreeView ? "git-branch" : "list");
        treeToggleBtn.addEventListener("click", () => {
            var _a, _b;
            this.isTreeView = !this.isTreeView;
            setIcon(treeToggleBtn, this.isTreeView ? "git-branch" : "list");
            // Save preference
            this.plugin.app.saveLocalStorage("task-genius-project-view-mode", this.isTreeView ? "tree" : "list");
            // Update project list view mode
            if (this.projectList) {
                (_b = (_a = this.projectList).setViewMode) === null || _b === void 0 ? void 0 : _b.call(_a, this.isTreeView);
            }
        });
        // Sort button
        const sortProjectBtn = buttonContainer.createDiv({
            cls: "fluent-sort-project-btn",
            attr: { "aria-label": t("Sort projects") },
        });
        setIcon(sortProjectBtn, "arrow-up-down");
        // Pass sort button to project list for menu handling
        sortProjectBtn.addEventListener("click", () => {
            var _a, _b;
            (_b = (_a = this.projectList).showSortMenu) === null || _b === void 0 ? void 0 : _b.call(_a, sortProjectBtn);
        });
        const projectListEl = projectsSection.createDiv();
        this.projectList = new ProjectList(projectListEl, this.plugin, this.onProjectSelect, this.isTreeView);
        // Add ProjectList as a child component
        this.addChild(this.projectList);
        // Other views section
        this.otherViewsSection = content.createDiv({
            cls: "fluent-sidebar-section",
        });
        this.renderOtherViewsSection();
    }
    renderRailMode() {
        var _a, _b, _c, _d, _e;
        if (!this.railEl) {
            return;
        }
        // Clear existing content
        this.railEl.empty();
        // Workspace menu button
        const wsBtn = this.railEl.createDiv({
            cls: "fluent-rail-btn",
            attr: { "aria-label": t("Workspace") },
        });
        setIcon(wsBtn, "layers");
        wsBtn.addEventListener("click", (e) => this.showWorkspaceMenuWithManager(e));
        // Primary view icons
        this.primaryItems.forEach((item) => {
            const btn = this.railEl.createDiv({
                cls: "fluent-rail-btn",
                attr: { "aria-label": item.label, "data-view-id": item.id },
            });
            setIcon(btn, item.icon);
            btn.addEventListener("click", () => {
                this.setActiveItem(item.id);
                this.onNavigate(item.id);
            });
            // Add context menu handler for rail button
            btn.addEventListener("contextmenu", (e) => {
                this.showViewContextMenu(e, item.id);
            });
        });
        // Other view icons with overflow menu when > 5
        const allOtherItems = this.computeOtherItems();
        const visibleCount = (_e = (_d = (_c = (_b = (_a = this.plugin) === null || _a === void 0 ? void 0 : _a.settings) === null || _b === void 0 ? void 0 : _b.fluentView) === null || _c === void 0 ? void 0 : _c.fluentConfig) === null || _d === void 0 ? void 0 : _d.maxOtherViewsBeforeOverflow) !== null && _e !== void 0 ? _e : 5;
        const displayedOther = allOtherItems.slice(0, visibleCount);
        const remainingOther = allOtherItems.slice(visibleCount);
        displayedOther.forEach((item) => {
            const btn = this.railEl.createDiv({
                cls: "fluent-rail-btn",
                attr: { "aria-label": item.label, "data-view-id": item.id },
            });
            setIcon(btn, item.icon);
            btn.addEventListener("click", () => {
                this.setActiveItem(item.id);
                this.onNavigate(item.id);
            });
            // Add context menu handler for rail button
            btn.addEventListener("contextmenu", (e) => {
                this.showViewContextMenu(e, item.id);
            });
        });
        if (remainingOther.length > 0) {
            const moreBtn = this.railEl.createDiv({
                cls: "fluent-rail-btn",
                attr: { "aria-label": t("More views") },
            });
            setIcon(moreBtn, "more-horizontal");
            moreBtn.addEventListener("click", (e) => this.showOtherViewsMenu(e, remainingOther));
        }
        // Projects menu button
        const projBtn = this.railEl.createDiv({
            cls: "fluent-rail-btn",
            attr: { "aria-label": t("Projects") },
        });
        setIcon(projBtn, "folder");
        projBtn.addEventListener("click", (e) => this.showProjectMenu(e));
        // Add (New Task) button
        const addBtn = this.railEl.createDiv({
            cls: "fluent-rail-btn",
            attr: { "aria-label": t("New Task") },
        });
        setIcon(addBtn, "plus");
        addBtn.addEventListener("click", () => this.onNavigate("new-task"));
    }
    renderOtherViewsSection() {
        var _a, _b, _c, _d, _e;
        if (!this.otherViewsSection || this.collapsed) {
            return;
        }
        // Clear existing content
        this.otherViewsSection.empty();
        // Create header
        const otherHeader = this.otherViewsSection.createDiv({
            cls: "fluent-section-header",
        });
        const allOtherItems = this.computeOtherItems();
        const visibleCount = (_e = (_d = (_c = (_b = (_a = this.plugin) === null || _a === void 0 ? void 0 : _a.settings) === null || _b === void 0 ? void 0 : _b.fluentView) === null || _c === void 0 ? void 0 : _c.fluentConfig) === null || _d === void 0 ? void 0 : _d.maxOtherViewsBeforeOverflow) !== null && _e !== void 0 ? _e : 5;
        const displayedOther = allOtherItems.slice(0, visibleCount);
        const remainingOther = allOtherItems.slice(visibleCount);
        otherHeader.createSpan({ text: t("Other Views") });
        if (remainingOther.length > 0) {
            const moreBtn = otherHeader.createDiv({
                cls: "fluent-section-action",
                attr: { "aria-label": t("More views") },
            });
            setIcon(moreBtn, "more-horizontal");
            moreBtn.addEventListener("click", (e) => this.showOtherViewsMenu(e, remainingOther));
        }
        this.renderNavigationItems(this.otherViewsSection, displayedOther);
    }
    computeOtherItems() {
        var _a, _b;
        try {
            const cfg = (_b = (_a = this.plugin) === null || _a === void 0 ? void 0 : _a.settings) === null || _b === void 0 ? void 0 : _b.viewConfiguration;
            if (!Array.isArray(cfg))
                return this.otherItems;
            const primaryIds = new Set(this.primaryItems.map((i) => i.id));
            // Exclude views that are represented elsewhere in the sidebar (e.g., Projects list)
            const excludeIds = new Set(["projects"]);
            const seen = new Set();
            const items = [];
            for (const v of cfg) {
                if (!v || v.visible === false)
                    continue;
                const id = String(v.id);
                if (primaryIds.has(id) || excludeIds.has(id))
                    continue;
                if (seen.has(id))
                    continue;
                items.push({
                    id,
                    label: v.name || id,
                    icon: v.icon || "list-plus",
                    type: "other",
                });
                seen.add(id);
            }
            return items.length ? items : this.otherItems;
        }
        catch (e) {
            return this.otherItems;
        }
    }
    onload() {
        // On mobile, ensure we render the full sidebar content
        // even though it starts "collapsed" (hidden off-screen)
        if (Platform.isPhone && this.collapsed) {
            // Temporarily set to not collapsed to render full content
            const wasCollapsed = this.collapsed;
            this.collapsed = false;
            this.render();
            this.collapsed = wasCollapsed;
            // Apply the collapsed class for CSS positioning
            this.containerEl.addClass("is-collapsed");
        }
        else {
            this.render();
        }
        // Subscribe to workspace events
        if (this.plugin.workspaceManager) {
            this.registerEvent(onWorkspaceSwitched(this.plugin.app, (payload) => {
                this.currentWorkspaceId = payload.workspaceId;
                this.render();
            }));
            this.registerEvent(onWorkspaceDeleted(this.plugin.app, () => {
                this.render();
            }));
            this.registerEvent(onWorkspaceCreated(this.plugin.app, () => {
                this.render();
            }));
        }
    }
    onunload() {
        // Clean up is handled by Component base class
        this.containerEl.empty();
    }
    setCollapsed(collapsed) {
        this.collapsed = collapsed;
        // On mobile, don't re-render when toggling collapse
        // The CSS will handle the drawer animation
        if (!Platform.isPhone) {
            this.render();
        }
        else {
            // Just toggle the class for mobile
            this.containerEl.toggleClass("is-collapsed", collapsed);
        }
    }
    handleWorkspaceChange(workspaceId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.plugin.workspaceManager) {
                yield this.plugin.workspaceManager.setActiveWorkspace(workspaceId);
                this.currentWorkspaceId = workspaceId;
            }
        });
    }
    showWorkspaceMenuWithManager(event) {
        if (!this.plugin.workspaceManager)
            return;
        const menu = new Menu();
        const workspaces = this.plugin.workspaceManager.getAllWorkspaces();
        const currentWorkspace = this.plugin.workspaceManager.getActiveWorkspace();
        workspaces.forEach((w) => {
            menu.addItem((item) => {
                var _a;
                const isDefault = (_a = this.plugin.workspaceManager) === null || _a === void 0 ? void 0 : _a.isDefaultWorkspace(w.id);
                const title = isDefault ? `${w.name} 🔒` : w.name;
                item.setTitle(title)
                    .setIcon("layers")
                    .onClick(() => __awaiter(this, void 0, void 0, function* () {
                    yield this.handleWorkspaceChange(w.id);
                }));
                if (w.id === currentWorkspace.id)
                    item.setChecked(true);
            });
        });
        menu.addSeparator();
        menu.addItem((item) => {
            item.setTitle(t("Create Workspace"))
                .setIcon("plus")
                .onClick(() => this.showCreateWorkspaceDialog());
        });
        menu.showAtMouseEvent(event);
    }
    showCreateWorkspaceDialog() {
        class CreateWorkspaceModal extends Modal {
            constructor(plugin, onCreated) {
                super(plugin.app);
                this.plugin = plugin;
                this.onCreated = onCreated;
            }
            onOpen() {
                const { contentEl } = this;
                contentEl.createEl("h2", { text: t("Create New Workspace") });
                const inputContainer = contentEl.createDiv();
                inputContainer.createEl("label", {
                    text: t("Workspace Name:"),
                });
                this.nameInput = inputContainer.createEl("input", {
                    type: "text",
                    placeholder: t("Enter workspace name..."),
                });
                const buttonContainer = contentEl.createDiv({
                    cls: "modal-button-container",
                });
                const createButton = buttonContainer.createEl("button", {
                    text: t("Create"),
                });
                const cancelButton = buttonContainer.createEl("button", {
                    text: t("Cancel"),
                });
                createButton.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
                    const name = this.nameInput.value.trim();
                    if (name && this.plugin.workspaceManager) {
                        yield this.plugin.workspaceManager.createWorkspace(name);
                        new Notice(t('Workspace "{{name}}" created', {
                            interpolation: {
                                name: name,
                            },
                        }));
                        this.onCreated();
                        this.close();
                    }
                    else {
                        new Notice(t("Please enter a workspace name"));
                    }
                }));
                cancelButton.addEventListener("click", () => {
                    this.close();
                });
                this.nameInput.focus();
            }
            onClose() {
                const { contentEl } = this;
                contentEl.empty();
            }
        }
        new CreateWorkspaceModal(this.plugin, () => this.render()).open();
    }
    showProjectMenu(event) {
        // Try to use existing project list data; if missing, build a temporary one
        let projects = [];
        const anyList = this.projectList;
        if (anyList && typeof anyList.getProjects === "function") {
            projects = anyList.getProjects();
        }
        else {
            const temp = document.createElement("div");
            const tempList = new ProjectList(temp, this.plugin, this.onProjectSelect);
            if (typeof tempList.getProjects === "function") {
                projects = tempList.getProjects();
            }
        }
        const menu = new Menu();
        projects.forEach((p) => {
            menu.addItem((item) => {
                item.setTitle(p.name)
                    .setIcon("folder")
                    .onClick(() => {
                    this.onProjectSelect(p.id);
                });
            });
        });
        menu.showAtMouseEvent(event);
    }
    showOtherViewsMenu(event, items) {
        const menu = new Menu();
        items.forEach((it) => {
            menu.addItem((mi) => {
                mi.setTitle(it.label)
                    .setIcon(it.icon)
                    .onClick(() => {
                    this.setActiveItem(it.id);
                    this.onNavigate(it.id);
                });
            });
        });
        menu.showAtMouseEvent(event);
    }
    showViewContextMenu(event, viewId) {
        event.preventDefault();
        event.stopPropagation();
        const menu = new Menu();
        // Check if this is a primary view
        const isPrimaryView = this.primaryItems.some((item) => item.id === viewId);
        // Open in new tab
        menu.addItem((item) => {
            item.setTitle(t("Open in new tab"))
                .setIcon("plus-square")
                .onClick(() => {
                const leaf = this.plugin.app.workspace.getLeaf("tab");
                leaf.setViewState({
                    type: TASK_SPECIFIC_VIEW_TYPE,
                    state: {
                        viewId: viewId,
                    },
                });
            });
        });
        // Open settings
        menu.addItem((item) => {
            item.setTitle(t("Open settings"))
                .setIcon("settings")
                .onClick(() => __awaiter(this, void 0, void 0, function* () {
                // Special handling for habit view
                if (viewId === "habit") {
                    this.plugin.app.setting.open();
                    this.plugin.app.setting.openTabById(this.plugin.manifest.id);
                    setTimeout(() => {
                        if (this.plugin.settingTab) {
                            this.plugin.settingTab.openTab("habit");
                        }
                    }, 100);
                    return;
                }
                // Normal handling for other views
                const view = this.plugin.settings.viewConfiguration.find((v) => v.id === viewId);
                if (!view) {
                    return;
                }
                const currentRules = (view === null || view === void 0 ? void 0 : view.filterRules) || {};
                new ViewConfigModal(this.plugin.app, this.plugin, view, currentRules, (updatedView, updatedRules) => {
                    const currentIndex = this.plugin.settings.viewConfiguration.findIndex((v) => v.id === updatedView.id);
                    if (currentIndex !== -1) {
                        this.plugin.settings.viewConfiguration[currentIndex] = Object.assign(Object.assign({}, updatedView), { filterRules: updatedRules });
                        this.plugin.saveSettings();
                        // Re-render if visibility changed
                        if (view.visible !== updatedView.visible) {
                            this.render();
                        }
                        // Trigger view config changed event
                        this.plugin.app.workspace.trigger("task-genius:view-config-changed", { reason: "edit", viewId: viewId });
                    }
                }).open();
            }));
        });
        // Hide in sidebar - only for non-primary views
        if (!isPrimaryView) {
            // Copy view
            menu.addItem((item) => {
                item.setTitle(t("Copy view"))
                    .setIcon("copy")
                    .onClick(() => {
                    const view = this.plugin.settings.viewConfiguration.find((v) => v.id === viewId);
                    if (!view) {
                        return;
                    }
                    // Create a copy of the current view
                    new ViewConfigModal(this.plugin.app, this.plugin, null, // null for create mode
                    null, // null for create mode
                    (createdView, createdRules) => {
                        if (!this.plugin.settings.viewConfiguration.some((v) => v.id === createdView.id)) {
                            this.plugin.settings.viewConfiguration.push(Object.assign(Object.assign({}, createdView), { filterRules: createdRules }));
                            this.plugin.saveSettings();
                            // Re-render the sidebar to show the new view
                            this.render();
                            // Trigger view config changed event
                            this.plugin.app.workspace.trigger("task-genius:view-config-changed", {
                                reason: "create",
                                viewId: createdView.id,
                            });
                            new Notice(t("View copied successfully: ") +
                                createdView.name);
                        }
                        else {
                            new Notice(t("Error: View ID already exists."));
                        }
                    }, view, // Pass current view as copy source
                    view.id).open();
                });
            });
            menu.addItem((item) => {
                item.setTitle(t("Hide in sidebar"))
                    .setIcon("eye-off")
                    .onClick(() => {
                    const view = this.plugin.settings.viewConfiguration.find((v) => v.id === viewId);
                    if (!view) {
                        return;
                    }
                    view.visible = false;
                    this.plugin.saveSettings();
                    // Re-render based on current mode
                    if (this.collapsed) {
                        this.renderRailMode();
                    }
                    else {
                        this.renderOtherViewsSection();
                    }
                    // Trigger view config changed event
                    this.plugin.app.workspace.trigger("task-genius:view-config-changed", { reason: "visibility", viewId: viewId });
                });
            });
        }
        // Delete (for custom views only)
        const view = this.plugin.settings.viewConfiguration.find((v) => v.id === viewId);
        if ((view === null || view === void 0 ? void 0 : view.type) === "custom") {
            menu.addSeparator();
            menu.addItem((item) => {
                item.setTitle(t("Delete"))
                    .setIcon("trash")
                    .setWarning(true)
                    .onClick(() => {
                    this.plugin.settings.viewConfiguration =
                        this.plugin.settings.viewConfiguration.filter((v) => v.id !== viewId);
                    this.plugin.saveSettings();
                    // Re-render based on current mode
                    if (this.collapsed) {
                        this.renderRailMode();
                    }
                    else {
                        this.renderOtherViewsSection();
                    }
                    // Trigger view config changed event
                    this.plugin.app.workspace.trigger("task-genius:view-config-changed", { reason: "delete", viewId: viewId });
                    new Notice(t("View deleted: ") + view.name);
                });
            });
        }
        menu.showAtMouseEvent(event);
    }
    renderNavigationItems(containerEl, items) {
        const list = containerEl.createDiv({ cls: "fluent-navigation-list" });
        items.forEach((item) => {
            const itemEl = list.createDiv({
                cls: "fluent-navigation-item",
                attr: { "data-view-id": item.id },
            });
            const icon = itemEl.createDiv({ cls: "fluent-navigation-icon" });
            setIcon(icon, item.icon);
            itemEl.createSpan({
                cls: "fluent-navigation-label",
                text: item.label,
            });
            if (item.badge) {
                itemEl.createDiv({
                    cls: "fluent-navigation-badge",
                    text: String(item.badge),
                });
            }
            itemEl.addEventListener("click", () => {
                this.setActiveItem(item.id);
                this.onNavigate(item.id);
            });
            // Add context menu handler
            itemEl.addEventListener("contextmenu", (e) => {
                this.showViewContextMenu(e, item.id);
            });
        });
    }
    setActiveItem(viewId) {
        // Clear active state from both full navigation items and rail buttons
        this.containerEl
            .querySelectorAll(".fluent-navigation-item, .fluent-rail-btn[data-view-id]")
            .forEach((el) => {
            el.removeClass("is-active");
        });
        // Apply to any element that carries this view id (works in both modes)
        const activeEls = this.containerEl.querySelectorAll(`[data-view-id="${viewId}"]`);
        activeEls.forEach((el) => el.addClass("is-active"));
    }
    updateWorkspace(workspaceOrId) {
        var _a, _b;
        const workspaceId = typeof workspaceOrId === "string"
            ? workspaceOrId
            : workspaceOrId.id;
        this.currentWorkspaceId = workspaceId;
        (_a = this.workspaceSelector) === null || _a === void 0 ? void 0 : _a.setWorkspace(workspaceId);
        (_b = this.projectList) === null || _b === void 0 ? void 0 : _b.refresh();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmx1ZW50U2lkZWJhci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkZsdWVudFNpZGViYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUM3RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUN4RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFHbEYsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixrQkFBa0IsRUFDbEIsa0JBQWtCLEdBQ2xCLE1BQU0sOENBQThDLENBQUM7QUFFdEQsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUN6RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQU9uRSxNQUFNLE9BQU8sYUFBYyxTQUFRLFNBQVM7SUE2QzNDLFlBQ0MsV0FBd0IsRUFDeEIsTUFBNkIsRUFDckIsVUFBb0MsRUFDcEMsZUFBNEMsRUFDcEQsU0FBUyxHQUFHLEtBQUs7O1FBRWpCLEtBQUssRUFBRSxDQUFDO1FBSkEsZUFBVSxHQUFWLFVBQVUsQ0FBMEI7UUFDcEMsb0JBQWUsR0FBZixlQUFlLENBQTZCO1FBNUM3QyxjQUFTLEdBQUcsS0FBSyxDQUFDO1FBRWxCLGVBQVUsR0FBRyxLQUFLLENBQUM7UUFDbkIsc0JBQWlCLEdBQXVCLElBQUksQ0FBQztRQUM3QyxXQUFNLEdBQXVCLElBQUksQ0FBQztRQUVsQyxpQkFBWSxHQUErQjtZQUNsRCxFQUFDLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFT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RCxrQkFBa0IsTUFBTSxJQUFJLENBQzVCLENBQUM7UUFDRixTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUVNLGVBQWUsQ0FBQyxhQUFxQzs7UUFDM0QsTUFBTSxXQUFXLEdBQ2hCLE9BQU8sYUFBYSxLQUFLLFFBQVE7WUFDaEMsQ0FBQyxDQUFDLGFBQWE7WUFDZixDQUFDLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztRQUNyQixJQUFJLENBQUMsa0JBQWtCLEdBQUcsV0FBVyxDQUFDO1FBQ3RDLE1BQUEsSUFBSSxDQUFDLGlCQUFpQiwwQ0FBRSxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDbEQsTUFBQSxJQUFJLENBQUMsV0FBVywwQ0FBRSxPQUFPLEVBQUUsQ0FBQztJQUM3QixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQsIHNldEljb24sIE1lbnUsIE5vdGljZSwgTW9kYWwsIFBsYXRmb3JtIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFdvcmtzcGFjZVNlbGVjdG9yIH0gZnJvbSBcIi4vV29ya3NwYWNlU2VsZWN0b3JcIjtcclxuaW1wb3J0IHsgUHJvamVjdExpc3QgfSBmcm9tIFwiQC9jb21wb25lbnRzL2ZlYXR1cmVzL2ZsdWVudC9jb21wb25lbnRzL1Byb2plY3RMaXN0XCI7XHJcbmltcG9ydCB7IEZsdWVudFRhc2tOYXZpZ2F0aW9uSXRlbSB9IGZyb20gXCJAL3R5cGVzL2ZsdWVudC10eXBlc1wiO1xyXG5pbXBvcnQgeyBXb3Jrc3BhY2VEYXRhIH0gZnJvbSBcIkAvdHlwZXMvd29ya3NwYWNlXCI7XHJcbmltcG9ydCB7XHJcblx0b25Xb3Jrc3BhY2VTd2l0Y2hlZCxcclxuXHRvbldvcmtzcGFjZURlbGV0ZWQsXHJcblx0b25Xb3Jrc3BhY2VDcmVhdGVkLFxyXG59IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvZmx1ZW50L2V2ZW50cy91aS1ldmVudFwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCB7IFZpZXdDb25maWdNb2RhbCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay92aWV3L21vZGFscy9WaWV3Q29uZmlnTW9kYWxcIjtcclxuaW1wb3J0IHsgVEFTS19TUEVDSUZJQ19WSUVXX1RZUEUgfSBmcm9tIFwiQC9wYWdlcy9UYXNrU3BlY2lmaWNWaWV3XCI7XHJcbmltcG9ydCB7XHJcblx0Vmlld0NvbmZpZyxcclxuXHRWaWV3RmlsdGVyUnVsZSxcclxuXHRWaWV3TW9kZSxcclxufSBmcm9tIFwiQC9jb21tb24vc2V0dGluZy1kZWZpbml0aW9uXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgRmx1ZW50U2lkZWJhciBleHRlbmRzIENvbXBvbmVudCB7XHJcblx0cHJpdmF0ZSBjb250YWluZXJFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbjtcclxuXHRwcml2YXRlIHdvcmtzcGFjZVNlbGVjdG9yOiBXb3Jrc3BhY2VTZWxlY3RvcjtcclxuXHRwdWJsaWMgcHJvamVjdExpc3Q6IFByb2plY3RMaXN0O1xyXG5cdHByaXZhdGUgY29sbGFwc2VkID0gZmFsc2U7XHJcblx0cHJpdmF0ZSBjdXJyZW50V29ya3NwYWNlSWQ6IHN0cmluZztcclxuXHRwcml2YXRlIGlzVHJlZVZpZXcgPSBmYWxzZTtcclxuXHRwcml2YXRlIG90aGVyVmlld3NTZWN0aW9uOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgcmFpbEVsOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xyXG5cclxuXHRwcml2YXRlIHByaW1hcnlJdGVtczogRmx1ZW50VGFza05hdmlnYXRpb25JdGVtW10gPSBbXHJcblx0XHR7aWQ6IFwiaW5ib3hcIiwgbGFiZWw6IHQoXCJJbmJveFwiKSwgaWNvbjogXCJpbmJveFwiLCB0eXBlOiBcInByaW1hcnlcIn0sXHJcblx0XHR7XHJcblx0XHRcdGlkOiBcInRvZGF5XCIsXHJcblx0XHRcdGxhYmVsOiB0KFwiVG9kYXlcIiksXHJcblx0XHRcdGljb246IFwiY2FsZW5kYXItZGF5c1wiLFxyXG5cdFx0XHR0eXBlOiBcInByaW1hcnlcIixcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGlkOiBcInVwY29taW5nXCIsXHJcblx0XHRcdGxhYmVsOiB0KFwiVXBjb21pbmdcIiksXHJcblx0XHRcdGljb246IFwiY2FsZW5kYXJcIixcclxuXHRcdFx0dHlwZTogXCJwcmltYXJ5XCIsXHJcblx0XHR9LFxyXG5cdFx0e2lkOiBcImZsYWdnZWRcIiwgbGFiZWw6IHQoXCJGbGFnZ2VkXCIpLCBpY29uOiBcImZsYWdcIiwgdHlwZTogXCJwcmltYXJ5XCJ9LFxyXG5cdF07XHJcblxyXG5cdHByaXZhdGUgb3RoZXJJdGVtczogRmx1ZW50VGFza05hdmlnYXRpb25JdGVtW10gPSBbXHJcblx0XHR7XHJcblx0XHRcdGlkOiBcImNhbGVuZGFyXCIsXHJcblx0XHRcdGxhYmVsOiB0KFwiQ2FsZW5kYXJcIiksXHJcblx0XHRcdGljb246IFwiY2FsZW5kYXJcIixcclxuXHRcdFx0dHlwZTogXCJvdGhlclwiLFxyXG5cdFx0fSxcclxuXHRcdHtpZDogXCJnYW50dFwiLCBsYWJlbDogdChcIkdhbnR0XCIpLCBpY29uOiBcImdpdC1icmFuY2hcIiwgdHlwZTogXCJvdGhlclwifSxcclxuXHRcdHtcclxuXHRcdFx0aWQ6IFwicmV2aWV3XCIsXHJcblx0XHRcdGxhYmVsOiB0KFwiUmV2aWV3XCIpLFxyXG5cdFx0XHRpY29uOiBcImNoZWNrLXNxdWFyZVwiLFxyXG5cdFx0XHR0eXBlOiBcIm90aGVyXCIsXHJcblx0XHR9LFxyXG5cdFx0e2lkOiBcInRhZ3NcIiwgbGFiZWw6IHQoXCJUYWdzXCIpLCBpY29uOiBcInRhZ1wiLCB0eXBlOiBcIm90aGVyXCJ9LFxyXG5cdF07XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0Y29udGFpbmVyRWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRwcml2YXRlIG9uTmF2aWdhdGU6ICh2aWV3SWQ6IHN0cmluZykgPT4gdm9pZCxcclxuXHRcdHByaXZhdGUgb25Qcm9qZWN0U2VsZWN0OiAocHJvamVjdElkOiBzdHJpbmcpID0+IHZvaWQsXHJcblx0XHRjb2xsYXBzZWQgPSBmYWxzZVxyXG5cdCkge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMuY29udGFpbmVyRWwgPSBjb250YWluZXJFbDtcclxuXHRcdHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG5cdFx0dGhpcy5jb2xsYXBzZWQgPSBjb2xsYXBzZWQ7XHJcblx0XHR0aGlzLmN1cnJlbnRXb3Jrc3BhY2VJZCA9XHJcblx0XHRcdHBsdWdpbi53b3Jrc3BhY2VNYW5hZ2VyPy5nZXRBY3RpdmVXb3Jrc3BhY2UoKS5pZCB8fCBcIlwiO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSByZW5kZXIoKSB7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLmVtcHR5KCk7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLmFkZENsYXNzKFwiZmx1ZW50LXNpZGViYXJcIik7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLnRvZ2dsZUNsYXNzKFwiaXMtY29sbGFwc2VkXCIsIHRoaXMuY29sbGFwc2VkKTtcclxuXHJcblx0XHQvLyBEZXNrdG9wOiBzaG93IHJhaWwgbW9kZSB3aGVuIGNvbGxhcHNlZFxyXG5cdFx0Ly8gTW9iaWxlOiBhbHdheXMgcmVuZGVyIGZ1bGwgc2lkZWJhciAoQ1NTIGhhbmRsZXMgdmlzaWJpbGl0eSlcclxuXHRcdGlmICh0aGlzLmNvbGxhcHNlZCAmJiAhUGxhdGZvcm0uaXNQaG9uZSkge1xyXG5cdFx0XHR0aGlzLnJhaWxFbCA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwiZmx1ZW50LXNpZGViYXItcmFpbFwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0dGhpcy5yZW5kZXJSYWlsTW9kZSgpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSGVhZGVyIHdpdGggd29ya3NwYWNlIHNlbGVjdG9yIGFuZCBuZXcgdGFzayBidXR0b25cclxuXHRcdGNvbnN0IGhlYWRlciA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZsdWVudC1zaWRlYmFyLWhlYWRlclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3Qgd29ya3NwYWNlU2VsZWN0b3JFbCA9IGhlYWRlci5jcmVhdGVEaXYoKTtcclxuXHRcdGlmICh0aGlzLnBsdWdpbi53b3Jrc3BhY2VNYW5hZ2VyKSB7XHJcblx0XHRcdHRoaXMud29ya3NwYWNlU2VsZWN0b3IgPSBuZXcgV29ya3NwYWNlU2VsZWN0b3IoXHJcblx0XHRcdFx0d29ya3NwYWNlU2VsZWN0b3JFbCxcclxuXHRcdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0XHQod29ya3NwYWNlSWQ6IHN0cmluZykgPT4gdGhpcy5oYW5kbGVXb3Jrc3BhY2VDaGFuZ2Uod29ya3NwYWNlSWQpXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gTmV3IFRhc2sgQnV0dG9uXHJcblx0XHRjb25zdCBuZXdUYXNrQnRuID0gaGVhZGVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0Y2xzOiBcImZsdWVudC1uZXctdGFzay1idG5cIixcclxuXHRcdFx0dGV4dDogdChcIk5ldyBUYXNrXCIpLFxyXG5cdFx0fSk7XHJcblx0XHRzZXRJY29uKG5ld1Rhc2tCdG4uY3JlYXRlRGl2KHtjbHM6IFwiZmx1ZW50LW5ldy10YXNrLWljb25cIn0pLCBcInBsdXNcIik7XHJcblx0XHRuZXdUYXNrQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdHRoaXMub25OYXZpZ2F0ZShcIm5ldy10YXNrXCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gTWFpbiBuYXZpZ2F0aW9uIGFyZWFcclxuXHRcdGNvbnN0IGNvbnRlbnQgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmbHVlbnQtc2lkZWJhci1jb250ZW50XCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBQcmltYXJ5IG5hdmlnYXRpb24gc2VjdGlvblxyXG5cdFx0Y29uc3QgcHJpbWFyeVNlY3Rpb24gPSBjb250ZW50LmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmbHVlbnQtc2lkZWJhci1zZWN0aW9uXCIsXHJcblx0XHR9KTtcclxuXHRcdHRoaXMucmVuZGVyTmF2aWdhdGlvbkl0ZW1zKHByaW1hcnlTZWN0aW9uLCB0aGlzLnByaW1hcnlJdGVtcyk7XHJcblxyXG5cdFx0Ly8gUHJvamVjdHMgc2VjdGlvblxyXG5cdFx0Y29uc3QgcHJvamVjdHNTZWN0aW9uID0gY29udGVudC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZmx1ZW50LXNpZGViYXItc2VjdGlvblwiLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCBwcm9qZWN0SGVhZGVyID0gcHJvamVjdHNTZWN0aW9uLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmbHVlbnQtc2VjdGlvbi1oZWFkZXJcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdHByb2plY3RIZWFkZXIuY3JlYXRlU3Bhbih7dGV4dDogdChcIlByb2plY3RzXCIpfSk7XHJcblxyXG5cdFx0Ly8gQnV0dG9uIGNvbnRhaW5lciBmb3IgdHJlZSB0b2dnbGUgYW5kIHNvcnRcclxuXHRcdGNvbnN0IGJ1dHRvbkNvbnRhaW5lciA9IHByb2plY3RIZWFkZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZsdWVudC1wcm9qZWN0LWhlYWRlci1idXR0b25zXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBUcmVlL0xpc3QgdG9nZ2xlIGJ1dHRvblxyXG5cdFx0Y29uc3QgdHJlZVRvZ2dsZUJ0biA9IGJ1dHRvbkNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZmx1ZW50LXRyZWUtdG9nZ2xlLWJ0blwiLFxyXG5cdFx0XHRhdHRyOiB7XCJhcmlhLWxhYmVsXCI6IHQoXCJUb2dnbGUgdHJlZS9saXN0IHZpZXdcIil9LFxyXG5cdFx0fSk7XHJcblx0XHQvLyBMb2FkIHNhdmVkIHZpZXcgbW9kZSBwcmVmZXJlbmNlXHJcblx0XHR0aGlzLmlzVHJlZVZpZXcgPVxyXG5cdFx0XHR0aGlzLnBsdWdpbi5hcHAubG9hZExvY2FsU3RvcmFnZShcclxuXHRcdFx0XHRcInRhc2stZ2VuaXVzLXByb2plY3Qtdmlldy1tb2RlXCJcclxuXHRcdFx0KSA9PT0gXCJ0cmVlXCI7XHJcblx0XHRzZXRJY29uKHRyZWVUb2dnbGVCdG4sIHRoaXMuaXNUcmVlVmlldyA/IFwiZ2l0LWJyYW5jaFwiIDogXCJsaXN0XCIpO1xyXG5cclxuXHRcdHRyZWVUb2dnbGVCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0dGhpcy5pc1RyZWVWaWV3ID0gIXRoaXMuaXNUcmVlVmlldztcclxuXHRcdFx0c2V0SWNvbih0cmVlVG9nZ2xlQnRuLCB0aGlzLmlzVHJlZVZpZXcgPyBcImdpdC1icmFuY2hcIiA6IFwibGlzdFwiKTtcclxuXHRcdFx0Ly8gU2F2ZSBwcmVmZXJlbmNlXHJcblx0XHRcdHRoaXMucGx1Z2luLmFwcC5zYXZlTG9jYWxTdG9yYWdlKFxyXG5cdFx0XHRcdFwidGFzay1nZW5pdXMtcHJvamVjdC12aWV3LW1vZGVcIixcclxuXHRcdFx0XHR0aGlzLmlzVHJlZVZpZXcgPyBcInRyZWVcIiA6IFwibGlzdFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdC8vIFVwZGF0ZSBwcm9qZWN0IGxpc3QgdmlldyBtb2RlXHJcblx0XHRcdGlmICh0aGlzLnByb2plY3RMaXN0KSB7XHJcblx0XHRcdFx0KHRoaXMucHJvamVjdExpc3QgYXMgYW55KS5zZXRWaWV3TW9kZT8uKHRoaXMuaXNUcmVlVmlldyk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFNvcnQgYnV0dG9uXHJcblx0XHRjb25zdCBzb3J0UHJvamVjdEJ0biA9IGJ1dHRvbkNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZmx1ZW50LXNvcnQtcHJvamVjdC1idG5cIixcclxuXHRcdFx0YXR0cjoge1wiYXJpYS1sYWJlbFwiOiB0KFwiU29ydCBwcm9qZWN0c1wiKX0sXHJcblx0XHR9KTtcclxuXHRcdHNldEljb24oc29ydFByb2plY3RCdG4sIFwiYXJyb3ctdXAtZG93blwiKTtcclxuXHJcblx0XHQvLyBQYXNzIHNvcnQgYnV0dG9uIHRvIHByb2plY3QgbGlzdCBmb3IgbWVudSBoYW5kbGluZ1xyXG5cdFx0c29ydFByb2plY3RCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0KHRoaXMucHJvamVjdExpc3QgYXMgYW55KS5zaG93U29ydE1lbnU/Lihzb3J0UHJvamVjdEJ0bik7XHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCBwcm9qZWN0TGlzdEVsID0gcHJvamVjdHNTZWN0aW9uLmNyZWF0ZURpdigpO1xyXG5cdFx0dGhpcy5wcm9qZWN0TGlzdCA9IG5ldyBQcm9qZWN0TGlzdChcclxuXHRcdFx0cHJvamVjdExpc3RFbCxcclxuXHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdHRoaXMub25Qcm9qZWN0U2VsZWN0LFxyXG5cdFx0XHR0aGlzLmlzVHJlZVZpZXdcclxuXHRcdCk7XHJcblx0XHQvLyBBZGQgUHJvamVjdExpc3QgYXMgYSBjaGlsZCBjb21wb25lbnRcclxuXHRcdHRoaXMuYWRkQ2hpbGQodGhpcy5wcm9qZWN0TGlzdCk7XHJcblxyXG5cdFx0Ly8gT3RoZXIgdmlld3Mgc2VjdGlvblxyXG5cdFx0dGhpcy5vdGhlclZpZXdzU2VjdGlvbiA9IGNvbnRlbnQuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZsdWVudC1zaWRlYmFyLXNlY3Rpb25cIixcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy5yZW5kZXJPdGhlclZpZXdzU2VjdGlvbigpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSByZW5kZXJSYWlsTW9kZSgpIHtcclxuXHRcdGlmICghdGhpcy5yYWlsRWwpIHtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENsZWFyIGV4aXN0aW5nIGNvbnRlbnRcclxuXHRcdHRoaXMucmFpbEVsLmVtcHR5KCk7XHJcblxyXG5cdFx0Ly8gV29ya3NwYWNlIG1lbnUgYnV0dG9uXHJcblx0XHRjb25zdCB3c0J0biA9IHRoaXMucmFpbEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmbHVlbnQtcmFpbC1idG5cIixcclxuXHRcdFx0YXR0cjoge1wiYXJpYS1sYWJlbFwiOiB0KFwiV29ya3NwYWNlXCIpfSxcclxuXHRcdH0pO1xyXG5cdFx0c2V0SWNvbih3c0J0biwgXCJsYXllcnNcIik7XHJcblx0XHR3c0J0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGUpID0+XHJcblx0XHRcdHRoaXMuc2hvd1dvcmtzcGFjZU1lbnVXaXRoTWFuYWdlcihlIGFzIE1vdXNlRXZlbnQpXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIFByaW1hcnkgdmlldyBpY29uc1xyXG5cdFx0dGhpcy5wcmltYXJ5SXRlbXMuZm9yRWFjaCgoaXRlbSkgPT4ge1xyXG5cdFx0XHRjb25zdCBidG4gPSB0aGlzLnJhaWxFbCEuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwiZmx1ZW50LXJhaWwtYnRuXCIsXHJcblx0XHRcdFx0YXR0cjoge1wiYXJpYS1sYWJlbFwiOiBpdGVtLmxhYmVsLCBcImRhdGEtdmlldy1pZFwiOiBpdGVtLmlkfSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdHNldEljb24oYnRuLCBpdGVtLmljb24pO1xyXG5cdFx0XHRidG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0XHR0aGlzLnNldEFjdGl2ZUl0ZW0oaXRlbS5pZCk7XHJcblx0XHRcdFx0dGhpcy5vbk5hdmlnYXRlKGl0ZW0uaWQpO1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0Ly8gQWRkIGNvbnRleHQgbWVudSBoYW5kbGVyIGZvciByYWlsIGJ1dHRvblxyXG5cdFx0XHRidG4uYWRkRXZlbnRMaXN0ZW5lcihcImNvbnRleHRtZW51XCIsIChlKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5zaG93Vmlld0NvbnRleHRNZW51KGUgYXMgTW91c2VFdmVudCwgaXRlbS5pZCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gT3RoZXIgdmlldyBpY29ucyB3aXRoIG92ZXJmbG93IG1lbnUgd2hlbiA+IDVcclxuXHRcdGNvbnN0IGFsbE90aGVySXRlbXMgPSB0aGlzLmNvbXB1dGVPdGhlckl0ZW1zKCk7XHJcblx0XHRjb25zdCB2aXNpYmxlQ291bnQgPVxyXG5cdFx0XHR0aGlzLnBsdWdpbj8uc2V0dGluZ3M/LmZsdWVudFZpZXc/LmZsdWVudENvbmZpZ1xyXG5cdFx0XHRcdD8ubWF4T3RoZXJWaWV3c0JlZm9yZU92ZXJmbG93ID8/IDU7XHJcblx0XHRjb25zdCBkaXNwbGF5ZWRPdGhlcjogRmx1ZW50VGFza05hdmlnYXRpb25JdGVtW10gPSBhbGxPdGhlckl0ZW1zLnNsaWNlKFxyXG5cdFx0XHQwLFxyXG5cdFx0XHR2aXNpYmxlQ291bnRcclxuXHRcdCk7XHJcblx0XHRjb25zdCByZW1haW5pbmdPdGhlcjogRmx1ZW50VGFza05hdmlnYXRpb25JdGVtW10gPVxyXG5cdFx0XHRhbGxPdGhlckl0ZW1zLnNsaWNlKHZpc2libGVDb3VudCk7XHJcblxyXG5cdFx0ZGlzcGxheWVkT3RoZXIuZm9yRWFjaCgoaXRlbTogRmx1ZW50VGFza05hdmlnYXRpb25JdGVtKSA9PiB7XHJcblx0XHRcdGNvbnN0IGJ0biA9IHRoaXMucmFpbEVsIS5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJmbHVlbnQtcmFpbC1idG5cIixcclxuXHRcdFx0XHRhdHRyOiB7XCJhcmlhLWxhYmVsXCI6IGl0ZW0ubGFiZWwsIFwiZGF0YS12aWV3LWlkXCI6IGl0ZW0uaWR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0c2V0SWNvbihidG4sIGl0ZW0uaWNvbik7XHJcblx0XHRcdGJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMuc2V0QWN0aXZlSXRlbShpdGVtLmlkKTtcclxuXHRcdFx0XHR0aGlzLm9uTmF2aWdhdGUoaXRlbS5pZCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0XHQvLyBBZGQgY29udGV4dCBtZW51IGhhbmRsZXIgZm9yIHJhaWwgYnV0dG9uXHJcblx0XHRcdGJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY29udGV4dG1lbnVcIiwgKGUpID0+IHtcclxuXHRcdFx0XHR0aGlzLnNob3dWaWV3Q29udGV4dE1lbnUoZSBhcyBNb3VzZUV2ZW50LCBpdGVtLmlkKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpZiAocmVtYWluaW5nT3RoZXIubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRjb25zdCBtb3JlQnRuID0gdGhpcy5yYWlsRWwhLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcImZsdWVudC1yYWlsLWJ0blwiLFxyXG5cdFx0XHRcdGF0dHI6IHtcImFyaWEtbGFiZWxcIjogdChcIk1vcmUgdmlld3NcIil9LFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0c2V0SWNvbihtb3JlQnRuLCBcIm1vcmUtaG9yaXpvbnRhbFwiKTtcclxuXHRcdFx0bW9yZUJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGUpID0+XHJcblx0XHRcdFx0dGhpcy5zaG93T3RoZXJWaWV3c01lbnUoZSBhcyBNb3VzZUV2ZW50LCByZW1haW5pbmdPdGhlcilcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBQcm9qZWN0cyBtZW51IGJ1dHRvblxyXG5cdFx0Y29uc3QgcHJvakJ0biA9IHRoaXMucmFpbEVsIS5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZmx1ZW50LXJhaWwtYnRuXCIsXHJcblx0XHRcdGF0dHI6IHtcImFyaWEtbGFiZWxcIjogdChcIlByb2plY3RzXCIpfSxcclxuXHRcdH0pO1xyXG5cdFx0c2V0SWNvbihwcm9qQnRuLCBcImZvbGRlclwiKTtcclxuXHRcdHByb2pCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChlKSA9PlxyXG5cdFx0XHR0aGlzLnNob3dQcm9qZWN0TWVudShlIGFzIE1vdXNlRXZlbnQpXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIEFkZCAoTmV3IFRhc2spIGJ1dHRvblxyXG5cdFx0Y29uc3QgYWRkQnRuID0gdGhpcy5yYWlsRWwhLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmbHVlbnQtcmFpbC1idG5cIixcclxuXHRcdFx0YXR0cjoge1wiYXJpYS1sYWJlbFwiOiB0KFwiTmV3IFRhc2tcIil9LFxyXG5cdFx0fSk7XHJcblx0XHRzZXRJY29uKGFkZEJ0biwgXCJwbHVzXCIpO1xyXG5cdFx0YWRkQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLm9uTmF2aWdhdGUoXCJuZXctdGFza1wiKSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbmRlck90aGVyVmlld3NTZWN0aW9uKCkge1xyXG5cdFx0aWYgKCF0aGlzLm90aGVyVmlld3NTZWN0aW9uIHx8IHRoaXMuY29sbGFwc2VkKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDbGVhciBleGlzdGluZyBjb250ZW50XHJcblx0XHR0aGlzLm90aGVyVmlld3NTZWN0aW9uLmVtcHR5KCk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGhlYWRlclxyXG5cdFx0Y29uc3Qgb3RoZXJIZWFkZXIgPSB0aGlzLm90aGVyVmlld3NTZWN0aW9uLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmbHVlbnQtc2VjdGlvbi1oZWFkZXJcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IGFsbE90aGVySXRlbXMgPSB0aGlzLmNvbXB1dGVPdGhlckl0ZW1zKCk7XHJcblx0XHRjb25zdCB2aXNpYmxlQ291bnQgPVxyXG5cdFx0XHR0aGlzLnBsdWdpbj8uc2V0dGluZ3M/LmZsdWVudFZpZXc/LmZsdWVudENvbmZpZ1xyXG5cdFx0XHRcdD8ubWF4T3RoZXJWaWV3c0JlZm9yZU92ZXJmbG93ID8/IDU7XHJcblx0XHRjb25zdCBkaXNwbGF5ZWRPdGhlcjogRmx1ZW50VGFza05hdmlnYXRpb25JdGVtW10gPSBhbGxPdGhlckl0ZW1zLnNsaWNlKFxyXG5cdFx0XHQwLFxyXG5cdFx0XHR2aXNpYmxlQ291bnRcclxuXHRcdCk7XHJcblx0XHRjb25zdCByZW1haW5pbmdPdGhlcjogRmx1ZW50VGFza05hdmlnYXRpb25JdGVtW10gPVxyXG5cdFx0XHRhbGxPdGhlckl0ZW1zLnNsaWNlKHZpc2libGVDb3VudCk7XHJcblxyXG5cdFx0b3RoZXJIZWFkZXIuY3JlYXRlU3Bhbih7dGV4dDogdChcIk90aGVyIFZpZXdzXCIpfSk7XHJcblxyXG5cdFx0aWYgKHJlbWFpbmluZ090aGVyLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0Y29uc3QgbW9yZUJ0biA9IG90aGVySGVhZGVyLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcImZsdWVudC1zZWN0aW9uLWFjdGlvblwiLFxyXG5cdFx0XHRcdGF0dHI6IHtcImFyaWEtbGFiZWxcIjogdChcIk1vcmUgdmlld3NcIil9LFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0c2V0SWNvbihtb3JlQnRuLCBcIm1vcmUtaG9yaXpvbnRhbFwiKTtcclxuXHRcdFx0bW9yZUJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGUpID0+XHJcblx0XHRcdFx0dGhpcy5zaG93T3RoZXJWaWV3c01lbnUoZSBhcyBNb3VzZUV2ZW50LCByZW1haW5pbmdPdGhlcilcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnJlbmRlck5hdmlnYXRpb25JdGVtcyh0aGlzLm90aGVyVmlld3NTZWN0aW9uLCBkaXNwbGF5ZWRPdGhlcik7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNvbXB1dGVPdGhlckl0ZW1zKCk6IEZsdWVudFRhc2tOYXZpZ2F0aW9uSXRlbVtdIHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IGNmZyA9IHRoaXMucGx1Z2luPy5zZXR0aW5ncz8udmlld0NvbmZpZ3VyYXRpb247XHJcblx0XHRcdGlmICghQXJyYXkuaXNBcnJheShjZmcpKSByZXR1cm4gdGhpcy5vdGhlckl0ZW1zO1xyXG5cclxuXHRcdFx0Y29uc3QgcHJpbWFyeUlkcyA9IG5ldyBTZXQodGhpcy5wcmltYXJ5SXRlbXMubWFwKChpKSA9PiBpLmlkKSk7XHJcblx0XHRcdC8vIEV4Y2x1ZGUgdmlld3MgdGhhdCBhcmUgcmVwcmVzZW50ZWQgZWxzZXdoZXJlIGluIHRoZSBzaWRlYmFyIChlLmcuLCBQcm9qZWN0cyBsaXN0KVxyXG5cdFx0XHRjb25zdCBleGNsdWRlSWRzID0gbmV3IFNldDxzdHJpbmc+KFtcInByb2plY3RzXCJdKTtcclxuXHRcdFx0Y29uc3Qgc2VlbiA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG5cdFx0XHRjb25zdCBpdGVtczogRmx1ZW50VGFza05hdmlnYXRpb25JdGVtW10gPSBbXTtcclxuXHJcblx0XHRcdGZvciAoY29uc3QgdiBvZiBjZmcpIHtcclxuXHRcdFx0XHRpZiAoIXYgfHwgdi52aXNpYmxlID09PSBmYWxzZSkgY29udGludWU7XHJcblx0XHRcdFx0Y29uc3QgaWQgPSBTdHJpbmcodi5pZCk7XHJcblx0XHRcdFx0aWYgKHByaW1hcnlJZHMuaGFzKGlkKSB8fCBleGNsdWRlSWRzLmhhcyhpZCkpIGNvbnRpbnVlO1xyXG5cdFx0XHRcdGlmIChzZWVuLmhhcyhpZCkpIGNvbnRpbnVlO1xyXG5cdFx0XHRcdGl0ZW1zLnB1c2goe1xyXG5cdFx0XHRcdFx0aWQsXHJcblx0XHRcdFx0XHRsYWJlbDogdi5uYW1lIHx8IGlkLFxyXG5cdFx0XHRcdFx0aWNvbjogdi5pY29uIHx8IFwibGlzdC1wbHVzXCIsXHJcblx0XHRcdFx0XHR0eXBlOiBcIm90aGVyXCIsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0c2Vlbi5hZGQoaWQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gaXRlbXMubGVuZ3RoID8gaXRlbXMgOiB0aGlzLm90aGVySXRlbXM7XHJcblx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdHJldHVybiB0aGlzLm90aGVySXRlbXM7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRvbmxvYWQoKSB7XHJcblx0XHQvLyBPbiBtb2JpbGUsIGVuc3VyZSB3ZSByZW5kZXIgdGhlIGZ1bGwgc2lkZWJhciBjb250ZW50XHJcblx0XHQvLyBldmVuIHRob3VnaCBpdCBzdGFydHMgXCJjb2xsYXBzZWRcIiAoaGlkZGVuIG9mZi1zY3JlZW4pXHJcblx0XHRpZiAoUGxhdGZvcm0uaXNQaG9uZSAmJiB0aGlzLmNvbGxhcHNlZCkge1xyXG5cdFx0XHQvLyBUZW1wb3JhcmlseSBzZXQgdG8gbm90IGNvbGxhcHNlZCB0byByZW5kZXIgZnVsbCBjb250ZW50XHJcblx0XHRcdGNvbnN0IHdhc0NvbGxhcHNlZCA9IHRoaXMuY29sbGFwc2VkO1xyXG5cdFx0XHR0aGlzLmNvbGxhcHNlZCA9IGZhbHNlO1xyXG5cdFx0XHR0aGlzLnJlbmRlcigpO1xyXG5cdFx0XHR0aGlzLmNvbGxhcHNlZCA9IHdhc0NvbGxhcHNlZDtcclxuXHRcdFx0Ly8gQXBwbHkgdGhlIGNvbGxhcHNlZCBjbGFzcyBmb3IgQ1NTIHBvc2l0aW9uaW5nXHJcblx0XHRcdHRoaXMuY29udGFpbmVyRWwuYWRkQ2xhc3MoXCJpcy1jb2xsYXBzZWRcIik7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLnJlbmRlcigpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFN1YnNjcmliZSB0byB3b3Jrc3BhY2UgZXZlbnRzXHJcblx0XHRpZiAodGhpcy5wbHVnaW4ud29ya3NwYWNlTWFuYWdlcikge1xyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRXZlbnQoXHJcblx0XHRcdFx0b25Xb3Jrc3BhY2VTd2l0Y2hlZCh0aGlzLnBsdWdpbi5hcHAsIChwYXlsb2FkKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLmN1cnJlbnRXb3Jrc3BhY2VJZCA9IHBheWxvYWQud29ya3NwYWNlSWQ7XHJcblx0XHRcdFx0XHR0aGlzLnJlbmRlcigpO1xyXG5cdFx0XHRcdH0pXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRXZlbnQoXHJcblx0XHRcdFx0b25Xb3Jrc3BhY2VEZWxldGVkKHRoaXMucGx1Z2luLmFwcCwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5yZW5kZXIoKTtcclxuXHRcdFx0XHR9KVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0dGhpcy5yZWdpc3RlckV2ZW50KFxyXG5cdFx0XHRcdG9uV29ya3NwYWNlQ3JlYXRlZCh0aGlzLnBsdWdpbi5hcHAsICgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMucmVuZGVyKCk7XHJcblx0XHRcdFx0fSlcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdG9udW5sb2FkKCkge1xyXG5cdFx0Ly8gQ2xlYW4gdXAgaXMgaGFuZGxlZCBieSBDb21wb25lbnQgYmFzZSBjbGFzc1xyXG5cdFx0dGhpcy5jb250YWluZXJFbC5lbXB0eSgpO1xyXG5cdH1cclxuXHJcblx0cHVibGljIHNldENvbGxhcHNlZChjb2xsYXBzZWQ6IGJvb2xlYW4pIHtcclxuXHRcdHRoaXMuY29sbGFwc2VkID0gY29sbGFwc2VkO1xyXG5cdFx0Ly8gT24gbW9iaWxlLCBkb24ndCByZS1yZW5kZXIgd2hlbiB0b2dnbGluZyBjb2xsYXBzZVxyXG5cdFx0Ly8gVGhlIENTUyB3aWxsIGhhbmRsZSB0aGUgZHJhd2VyIGFuaW1hdGlvblxyXG5cdFx0aWYgKCFQbGF0Zm9ybS5pc1Bob25lKSB7XHJcblx0XHRcdHRoaXMucmVuZGVyKCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBKdXN0IHRvZ2dsZSB0aGUgY2xhc3MgZm9yIG1vYmlsZVxyXG5cdFx0XHR0aGlzLmNvbnRhaW5lckVsLnRvZ2dsZUNsYXNzKFwiaXMtY29sbGFwc2VkXCIsIGNvbGxhcHNlZCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIGhhbmRsZVdvcmtzcGFjZUNoYW5nZSh3b3Jrc3BhY2VJZDogc3RyaW5nKSB7XHJcblx0XHRpZiAodGhpcy5wbHVnaW4ud29ya3NwYWNlTWFuYWdlcikge1xyXG5cdFx0XHRhd2FpdCB0aGlzLnBsdWdpbi53b3Jrc3BhY2VNYW5hZ2VyLnNldEFjdGl2ZVdvcmtzcGFjZSh3b3Jrc3BhY2VJZCk7XHJcblx0XHRcdHRoaXMuY3VycmVudFdvcmtzcGFjZUlkID0gd29ya3NwYWNlSWQ7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHNob3dXb3Jrc3BhY2VNZW51V2l0aE1hbmFnZXIoZXZlbnQ6IE1vdXNlRXZlbnQpIHtcclxuXHRcdGlmICghdGhpcy5wbHVnaW4ud29ya3NwYWNlTWFuYWdlcikgcmV0dXJuO1xyXG5cclxuXHRcdGNvbnN0IG1lbnUgPSBuZXcgTWVudSgpO1xyXG5cdFx0Y29uc3Qgd29ya3NwYWNlcyA9IHRoaXMucGx1Z2luLndvcmtzcGFjZU1hbmFnZXIuZ2V0QWxsV29ya3NwYWNlcygpO1xyXG5cdFx0Y29uc3QgY3VycmVudFdvcmtzcGFjZSA9XHJcblx0XHRcdHRoaXMucGx1Z2luLndvcmtzcGFjZU1hbmFnZXIuZ2V0QWN0aXZlV29ya3NwYWNlKCk7XHJcblxyXG5cdFx0d29ya3NwYWNlcy5mb3JFYWNoKCh3KSA9PiB7XHJcblx0XHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IGlzRGVmYXVsdCA9XHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbi53b3Jrc3BhY2VNYW5hZ2VyPy5pc0RlZmF1bHRXb3Jrc3BhY2Uody5pZCk7XHJcblx0XHRcdFx0Y29uc3QgdGl0bGUgPSBpc0RlZmF1bHQgPyBgJHt3Lm5hbWV9IPCflJJgIDogdy5uYW1lO1xyXG5cclxuXHRcdFx0XHRpdGVtLnNldFRpdGxlKHRpdGxlKVxyXG5cdFx0XHRcdFx0LnNldEljb24oXCJsYXllcnNcIilcclxuXHRcdFx0XHRcdC5vbkNsaWNrKGFzeW5jICgpID0+IHtcclxuXHRcdFx0XHRcdFx0YXdhaXQgdGhpcy5oYW5kbGVXb3Jrc3BhY2VDaGFuZ2Uody5pZCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRpZiAody5pZCA9PT0gY3VycmVudFdvcmtzcGFjZS5pZCkgaXRlbS5zZXRDaGVja2VkKHRydWUpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdG1lbnUuYWRkU2VwYXJhdG9yKCk7XHJcblx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0aXRlbS5zZXRUaXRsZSh0KFwiQ3JlYXRlIFdvcmtzcGFjZVwiKSlcclxuXHRcdFx0XHQuc2V0SWNvbihcInBsdXNcIilcclxuXHRcdFx0XHQub25DbGljaygoKSA9PiB0aGlzLnNob3dDcmVhdGVXb3Jrc3BhY2VEaWFsb2coKSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRtZW51LnNob3dBdE1vdXNlRXZlbnQoZXZlbnQpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBzaG93Q3JlYXRlV29ya3NwYWNlRGlhbG9nKCkge1xyXG5cdFx0Y2xhc3MgQ3JlYXRlV29ya3NwYWNlTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XHJcblx0XHRcdHByaXZhdGUgbmFtZUlucHV0OiBIVE1MSW5wdXRFbGVtZW50O1xyXG5cclxuXHRcdFx0Y29uc3RydWN0b3IoXHJcblx0XHRcdFx0cHJpdmF0ZSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdFx0XHRwcml2YXRlIG9uQ3JlYXRlZDogKCkgPT4gdm9pZFxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRzdXBlcihwbHVnaW4uYXBwKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0b25PcGVuKCkge1xyXG5cdFx0XHRcdGNvbnN0IHtjb250ZW50RWx9ID0gdGhpcztcclxuXHRcdFx0XHRjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7dGV4dDogdChcIkNyZWF0ZSBOZXcgV29ya3NwYWNlXCIpfSk7XHJcblxyXG5cdFx0XHRcdGNvbnN0IGlucHV0Q29udGFpbmVyID0gY29udGVudEVsLmNyZWF0ZURpdigpO1xyXG5cdFx0XHRcdGlucHV0Q29udGFpbmVyLmNyZWF0ZUVsKFwibGFiZWxcIiwge1xyXG5cdFx0XHRcdFx0dGV4dDogdChcIldvcmtzcGFjZSBOYW1lOlwiKSxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHR0aGlzLm5hbWVJbnB1dCA9IGlucHV0Q29udGFpbmVyLmNyZWF0ZUVsKFwiaW5wdXRcIiwge1xyXG5cdFx0XHRcdFx0dHlwZTogXCJ0ZXh0XCIsXHJcblx0XHRcdFx0XHRwbGFjZWhvbGRlcjogdChcIkVudGVyIHdvcmtzcGFjZSBuYW1lLi4uXCIpLFxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRjb25zdCBidXR0b25Db250YWluZXIgPSBjb250ZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRcdGNsczogXCJtb2RhbC1idXR0b24tY29udGFpbmVyXCIsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0Y29uc3QgY3JlYXRlQnV0dG9uID0gYnV0dG9uQ29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0XHRcdHRleHQ6IHQoXCJDcmVhdGVcIiksXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0Y29uc3QgY2FuY2VsQnV0dG9uID0gYnV0dG9uQ29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0XHRcdHRleHQ6IHQoXCJDYW5jZWxcIiksXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdGNyZWF0ZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc3QgbmFtZSA9IHRoaXMubmFtZUlucHV0LnZhbHVlLnRyaW0oKTtcclxuXHRcdFx0XHRcdGlmIChuYW1lICYmIHRoaXMucGx1Z2luLndvcmtzcGFjZU1hbmFnZXIpIHtcclxuXHRcdFx0XHRcdFx0YXdhaXQgdGhpcy5wbHVnaW4ud29ya3NwYWNlTWFuYWdlci5jcmVhdGVXb3Jrc3BhY2UoXHJcblx0XHRcdFx0XHRcdFx0bmFtZVxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRuZXcgTm90aWNlKFxyXG5cdFx0XHRcdFx0XHRcdHQoJ1dvcmtzcGFjZSBcInt7bmFtZX19XCIgY3JlYXRlZCcsIHtcclxuXHRcdFx0XHRcdFx0XHRcdGludGVycG9sYXRpb246IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0bmFtZTogbmFtZSxcclxuXHRcdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0fSlcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0dGhpcy5vbkNyZWF0ZWQoKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0bmV3IE5vdGljZSh0KFwiUGxlYXNlIGVudGVyIGEgd29ya3NwYWNlIG5hbWVcIikpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRjYW5jZWxCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuY2xvc2UoKTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0dGhpcy5uYW1lSW5wdXQuZm9jdXMoKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0b25DbG9zZSgpIHtcclxuXHRcdFx0XHRjb25zdCB7Y29udGVudEVsfSA9IHRoaXM7XHJcblx0XHRcdFx0Y29udGVudEVsLmVtcHR5KCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRuZXcgQ3JlYXRlV29ya3NwYWNlTW9kYWwodGhpcy5wbHVnaW4sICgpID0+IHRoaXMucmVuZGVyKCkpLm9wZW4oKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc2hvd1Byb2plY3RNZW51KGV2ZW50OiBNb3VzZUV2ZW50KSB7XHJcblx0XHQvLyBUcnkgdG8gdXNlIGV4aXN0aW5nIHByb2plY3QgbGlzdCBkYXRhOyBpZiBtaXNzaW5nLCBidWlsZCBhIHRlbXBvcmFyeSBvbmVcclxuXHRcdGxldCBwcm9qZWN0czogYW55W10gPSBbXTtcclxuXHRcdGNvbnN0IGFueUxpc3Q6IGFueSA9IHRoaXMucHJvamVjdExpc3QgYXMgYW55O1xyXG5cdFx0aWYgKGFueUxpc3QgJiYgdHlwZW9mIGFueUxpc3QuZ2V0UHJvamVjdHMgPT09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHRwcm9qZWN0cyA9IGFueUxpc3QuZ2V0UHJvamVjdHMoKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGNvbnN0IHRlbXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG5cdFx0XHRjb25zdCB0ZW1wTGlzdDogYW55ID0gbmV3IFByb2plY3RMaXN0KFxyXG5cdFx0XHRcdHRlbXAgYXMgYW55LFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHRcdHRoaXMub25Qcm9qZWN0U2VsZWN0XHJcblx0XHRcdCk7XHJcblx0XHRcdGlmICh0eXBlb2YgdGVtcExpc3QuZ2V0UHJvamVjdHMgPT09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHRcdHByb2plY3RzID0gdGVtcExpc3QuZ2V0UHJvamVjdHMoKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0Y29uc3QgbWVudSA9IG5ldyBNZW51KCk7XHJcblx0XHRwcm9qZWN0cy5mb3JFYWNoKChwKSA9PiB7XHJcblx0XHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRcdGl0ZW0uc2V0VGl0bGUocC5uYW1lKVxyXG5cdFx0XHRcdFx0LnNldEljb24oXCJmb2xkZXJcIilcclxuXHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5vblByb2plY3RTZWxlY3QocC5pZCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHRcdG1lbnUuc2hvd0F0TW91c2VFdmVudChldmVudCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHNob3dPdGhlclZpZXdzTWVudShldmVudDogTW91c2VFdmVudCwgaXRlbXM6IEZsdWVudFRhc2tOYXZpZ2F0aW9uSXRlbVtdKSB7XHJcblx0XHRjb25zdCBtZW51ID0gbmV3IE1lbnUoKTtcclxuXHRcdGl0ZW1zLmZvckVhY2goKGl0OiBGbHVlbnRUYXNrTmF2aWdhdGlvbkl0ZW0pID0+IHtcclxuXHRcdFx0bWVudS5hZGRJdGVtKChtaSkgPT4ge1xyXG5cdFx0XHRcdG1pLnNldFRpdGxlKGl0LmxhYmVsKVxyXG5cdFx0XHRcdFx0LnNldEljb24oaXQuaWNvbilcclxuXHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5zZXRBY3RpdmVJdGVtKGl0LmlkKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5vbk5hdmlnYXRlKGl0LmlkKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdFx0bWVudS5zaG93QXRNb3VzZUV2ZW50KGV2ZW50KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc2hvd1ZpZXdDb250ZXh0TWVudShldmVudDogTW91c2VFdmVudCwgdmlld0lkOiBzdHJpbmcpIHtcclxuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHJcblx0XHRjb25zdCBtZW51ID0gbmV3IE1lbnUoKTtcclxuXHJcblx0XHQvLyBDaGVjayBpZiB0aGlzIGlzIGEgcHJpbWFyeSB2aWV3XHJcblx0XHRjb25zdCBpc1ByaW1hcnlWaWV3ID0gdGhpcy5wcmltYXJ5SXRlbXMuc29tZShcclxuXHRcdFx0KGl0ZW0pID0+IGl0ZW0uaWQgPT09IHZpZXdJZFxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBPcGVuIGluIG5ldyB0YWJcclxuXHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJPcGVuIGluIG5ldyB0YWJcIikpXHJcblx0XHRcdFx0LnNldEljb24oXCJwbHVzLXNxdWFyZVwiKVxyXG5cdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdGNvbnN0IGxlYWYgPSB0aGlzLnBsdWdpbi5hcHAud29ya3NwYWNlLmdldExlYWYoXCJ0YWJcIik7XHJcblx0XHRcdFx0XHRsZWFmLnNldFZpZXdTdGF0ZSh7XHJcblx0XHRcdFx0XHRcdHR5cGU6IFRBU0tfU1BFQ0lGSUNfVklFV19UWVBFLFxyXG5cdFx0XHRcdFx0XHRzdGF0ZToge1xyXG5cdFx0XHRcdFx0XHRcdHZpZXdJZDogdmlld0lkLFxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBPcGVuIHNldHRpbmdzXHJcblx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0aXRlbS5zZXRUaXRsZSh0KFwiT3BlbiBzZXR0aW5nc1wiKSlcclxuXHRcdFx0XHQuc2V0SWNvbihcInNldHRpbmdzXCIpXHJcblx0XHRcdFx0Lm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gU3BlY2lhbCBoYW5kbGluZyBmb3IgaGFiaXQgdmlld1xyXG5cdFx0XHRcdFx0aWYgKHZpZXdJZCA9PT0gXCJoYWJpdFwiKSB7XHJcblx0XHRcdFx0XHRcdCh0aGlzLnBsdWdpbi5hcHAgYXMgYW55KS5zZXR0aW5nLm9wZW4oKTtcclxuXHRcdFx0XHRcdFx0KHRoaXMucGx1Z2luLmFwcCBhcyBhbnkpLnNldHRpbmcub3BlblRhYkJ5SWQoXHJcblx0XHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4ubWFuaWZlc3QuaWRcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0aWYgKHRoaXMucGx1Z2luLnNldHRpbmdUYWIpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdUYWIub3BlblRhYihcImhhYml0XCIpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fSwgMTAwKTtcclxuXHRcdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIE5vcm1hbCBoYW5kbGluZyBmb3Igb3RoZXIgdmlld3NcclxuXHRcdFx0XHRcdGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy52aWV3Q29uZmlndXJhdGlvbi5maW5kKFxyXG5cdFx0XHRcdFx0XHQodikgPT4gdi5pZCA9PT0gdmlld0lkXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0aWYgKCF2aWV3KSB7XHJcblx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGNvbnN0IGN1cnJlbnRSdWxlcyA9IHZpZXc/LmZpbHRlclJ1bGVzIHx8IHt9O1xyXG5cdFx0XHRcdFx0bmV3IFZpZXdDb25maWdNb2RhbChcclxuXHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uYXBwLFxyXG5cdFx0XHRcdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0XHRcdFx0dmlldyxcclxuXHRcdFx0XHRcdFx0Y3VycmVudFJ1bGVzLFxyXG5cdFx0XHRcdFx0XHQoXHJcblx0XHRcdFx0XHRcdFx0dXBkYXRlZFZpZXc6IFZpZXdDb25maWcsXHJcblx0XHRcdFx0XHRcdFx0dXBkYXRlZFJ1bGVzOiBWaWV3RmlsdGVyUnVsZVxyXG5cdFx0XHRcdFx0XHQpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBjdXJyZW50SW5kZXggPVxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3Mudmlld0NvbmZpZ3VyYXRpb24uZmluZEluZGV4KFxyXG5cdFx0XHRcdFx0XHRcdFx0XHQodikgPT4gdi5pZCA9PT0gdXBkYXRlZFZpZXcuaWRcclxuXHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0aWYgKGN1cnJlbnRJbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnZpZXdDb25maWd1cmF0aW9uW1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRjdXJyZW50SW5kZXhcclxuXHRcdFx0XHRcdFx0XHRcdFx0XSA9IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Li4udXBkYXRlZFZpZXcsXHJcblx0XHRcdFx0XHRcdFx0XHRcdGZpbHRlclJ1bGVzOiB1cGRhdGVkUnVsZXMsXHJcblx0XHRcdFx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0XHRcdFx0XHQvLyBSZS1yZW5kZXIgaWYgdmlzaWJpbGl0eSBjaGFuZ2VkXHJcblx0XHRcdFx0XHRcdFx0XHRpZiAodmlldy52aXNpYmxlICE9PSB1cGRhdGVkVmlldy52aXNpYmxlKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMucmVuZGVyKCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHQvLyBUcmlnZ2VyIHZpZXcgY29uZmlnIGNoYW5nZWQgZXZlbnRcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLmFwcC53b3Jrc3BhY2UudHJpZ2dlcihcclxuXHRcdFx0XHRcdFx0XHRcdFx0XCJ0YXNrLWdlbml1czp2aWV3LWNvbmZpZy1jaGFuZ2VkXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdHtyZWFzb246IFwiZWRpdFwiLCB2aWV3SWQ6IHZpZXdJZH1cclxuXHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHQpLm9wZW4oKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEhpZGUgaW4gc2lkZWJhciAtIG9ubHkgZm9yIG5vbi1wcmltYXJ5IHZpZXdzXHJcblx0XHRpZiAoIWlzUHJpbWFyeVZpZXcpIHtcclxuXHRcdFx0Ly8gQ29weSB2aWV3XHJcblx0XHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRcdGl0ZW0uc2V0VGl0bGUodChcIkNvcHkgdmlld1wiKSlcclxuXHRcdFx0XHRcdC5zZXRJY29uKFwiY29weVwiKVxyXG5cdFx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRjb25zdCB2aWV3ID1cclxuXHRcdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy52aWV3Q29uZmlndXJhdGlvbi5maW5kKFxyXG5cdFx0XHRcdFx0XHRcdFx0KHYpID0+IHYuaWQgPT09IHZpZXdJZFxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdGlmICghdmlldykge1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHQvLyBDcmVhdGUgYSBjb3B5IG9mIHRoZSBjdXJyZW50IHZpZXdcclxuXHRcdFx0XHRcdFx0bmV3IFZpZXdDb25maWdNb2RhbChcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5hcHAsXHJcblx0XHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdFx0XHRcdFx0bnVsbCwgLy8gbnVsbCBmb3IgY3JlYXRlIG1vZGVcclxuXHRcdFx0XHRcdFx0XHRudWxsLCAvLyBudWxsIGZvciBjcmVhdGUgbW9kZVxyXG5cdFx0XHRcdFx0XHRcdChcclxuXHRcdFx0XHRcdFx0XHRcdGNyZWF0ZWRWaWV3OiBWaWV3Q29uZmlnLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y3JlYXRlZFJ1bGVzOiBWaWV3RmlsdGVyUnVsZVxyXG5cdFx0XHRcdFx0XHRcdCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHQhdGhpcy5wbHVnaW4uc2V0dGluZ3Mudmlld0NvbmZpZ3VyYXRpb24uc29tZShcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQodikgPT4gdi5pZCA9PT0gY3JlYXRlZFZpZXcuaWRcclxuXHRcdFx0XHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnZpZXdDb25maWd1cmF0aW9uLnB1c2goXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Li4uY3JlYXRlZFZpZXcsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRmaWx0ZXJSdWxlczogY3JlYXRlZFJ1bGVzLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdC8vIFJlLXJlbmRlciB0aGUgc2lkZWJhciB0byBzaG93IHRoZSBuZXcgdmlld1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnJlbmRlcigpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBUcmlnZ2VyIHZpZXcgY29uZmlnIGNoYW5nZWQgZXZlbnRcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uYXBwLndvcmtzcGFjZS50cmlnZ2VyKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFwidGFzay1nZW5pdXM6dmlldy1jb25maWctY2hhbmdlZFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHJlYXNvbjogXCJjcmVhdGVcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHZpZXdJZDogY3JlYXRlZFZpZXcuaWQsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRuZXcgTm90aWNlKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHQoXCJWaWV3IGNvcGllZCBzdWNjZXNzZnVsbHk6IFwiKSArXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y3JlYXRlZFZpZXcubmFtZVxyXG5cdFx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0bmV3IE5vdGljZShcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0KFwiRXJyb3I6IFZpZXcgSUQgYWxyZWFkeSBleGlzdHMuXCIpXHJcblx0XHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHR2aWV3LCAvLyBQYXNzIGN1cnJlbnQgdmlldyBhcyBjb3B5IHNvdXJjZVxyXG5cdFx0XHRcdFx0XHRcdHZpZXcuaWRcclxuXHRcdFx0XHRcdFx0KS5vcGVuKCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJIaWRlIGluIHNpZGViYXJcIikpXHJcblx0XHRcdFx0XHQuc2V0SWNvbihcImV5ZS1vZmZcIilcclxuXHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgdmlldyA9XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3Mudmlld0NvbmZpZ3VyYXRpb24uZmluZChcclxuXHRcdFx0XHRcdFx0XHRcdCh2KSA9PiB2LmlkID09PSB2aWV3SWRcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRpZiAoIXZpZXcpIHtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0dmlldy52aXNpYmxlID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdFx0XHQvLyBSZS1yZW5kZXIgYmFzZWQgb24gY3VycmVudCBtb2RlXHJcblx0XHRcdFx0XHRcdGlmICh0aGlzLmNvbGxhcHNlZCkge1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMucmVuZGVyUmFpbE1vZGUoKTtcclxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnJlbmRlck90aGVyVmlld3NTZWN0aW9uKCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0Ly8gVHJpZ2dlciB2aWV3IGNvbmZpZyBjaGFuZ2VkIGV2ZW50XHJcblx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLmFwcC53b3Jrc3BhY2UudHJpZ2dlcihcclxuXHRcdFx0XHRcdFx0XHRcInRhc2stZ2VuaXVzOnZpZXctY29uZmlnLWNoYW5nZWRcIixcclxuXHRcdFx0XHRcdFx0XHR7cmVhc29uOiBcInZpc2liaWxpdHlcIiwgdmlld0lkOiB2aWV3SWR9XHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRGVsZXRlIChmb3IgY3VzdG9tIHZpZXdzIG9ubHkpXHJcblx0XHRjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3Mudmlld0NvbmZpZ3VyYXRpb24uZmluZChcclxuXHRcdFx0KHYpID0+IHYuaWQgPT09IHZpZXdJZFxyXG5cdFx0KTtcclxuXHRcdGlmICh2aWV3Py50eXBlID09PSBcImN1c3RvbVwiKSB7XHJcblx0XHRcdG1lbnUuYWRkU2VwYXJhdG9yKCk7XHJcblx0XHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRcdGl0ZW0uc2V0VGl0bGUodChcIkRlbGV0ZVwiKSlcclxuXHRcdFx0XHRcdC5zZXRJY29uKFwidHJhc2hcIilcclxuXHRcdFx0XHRcdC5zZXRXYXJuaW5nKHRydWUpXHJcblx0XHRcdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnZpZXdDb25maWd1cmF0aW9uID1cclxuXHRcdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy52aWV3Q29uZmlndXJhdGlvbi5maWx0ZXIoXHJcblx0XHRcdFx0XHRcdFx0XHQodikgPT4gdi5pZCAhPT0gdmlld0lkXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0XHRcdC8vIFJlLXJlbmRlciBiYXNlZCBvbiBjdXJyZW50IG1vZGVcclxuXHRcdFx0XHRcdFx0aWYgKHRoaXMuY29sbGFwc2VkKSB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5yZW5kZXJSYWlsTW9kZSgpO1xyXG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMucmVuZGVyT3RoZXJWaWV3c1NlY3Rpb24oKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHQvLyBUcmlnZ2VyIHZpZXcgY29uZmlnIGNoYW5nZWQgZXZlbnRcclxuXHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uYXBwLndvcmtzcGFjZS50cmlnZ2VyKFxyXG5cdFx0XHRcdFx0XHRcdFwidGFzay1nZW5pdXM6dmlldy1jb25maWctY2hhbmdlZFwiLFxyXG5cdFx0XHRcdFx0XHRcdHtyZWFzb246IFwiZGVsZXRlXCIsIHZpZXdJZDogdmlld0lkfVxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRuZXcgTm90aWNlKHQoXCJWaWV3IGRlbGV0ZWQ6IFwiKSArIHZpZXcubmFtZSk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0bWVudS5zaG93QXRNb3VzZUV2ZW50KGV2ZW50KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyTmF2aWdhdGlvbkl0ZW1zKFxyXG5cdFx0Y29udGFpbmVyRWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0aXRlbXM6IEZsdWVudFRhc2tOYXZpZ2F0aW9uSXRlbVtdXHJcblx0KSB7XHJcblx0XHRjb25zdCBsaXN0ID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KHtjbHM6IFwiZmx1ZW50LW5hdmlnYXRpb24tbGlzdFwifSk7XHJcblx0XHRpdGVtcy5mb3JFYWNoKChpdGVtKSA9PiB7XHJcblx0XHRcdGNvbnN0IGl0ZW1FbCA9IGxpc3QuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwiZmx1ZW50LW5hdmlnYXRpb24taXRlbVwiLFxyXG5cdFx0XHRcdGF0dHI6IHtcImRhdGEtdmlldy1pZFwiOiBpdGVtLmlkfSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdGNvbnN0IGljb24gPSBpdGVtRWwuY3JlYXRlRGl2KHtjbHM6IFwiZmx1ZW50LW5hdmlnYXRpb24taWNvblwifSk7XHJcblx0XHRcdHNldEljb24oaWNvbiwgaXRlbS5pY29uKTtcclxuXHRcdFx0aXRlbUVsLmNyZWF0ZVNwYW4oe1xyXG5cdFx0XHRcdGNsczogXCJmbHVlbnQtbmF2aWdhdGlvbi1sYWJlbFwiLFxyXG5cdFx0XHRcdHRleHQ6IGl0ZW0ubGFiZWwsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRpZiAoaXRlbS5iYWRnZSkge1xyXG5cdFx0XHRcdGl0ZW1FbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdFx0Y2xzOiBcImZsdWVudC1uYXZpZ2F0aW9uLWJhZGdlXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBTdHJpbmcoaXRlbS5iYWRnZSksXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdFx0aXRlbUVsLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5zZXRBY3RpdmVJdGVtKGl0ZW0uaWQpO1xyXG5cdFx0XHRcdHRoaXMub25OYXZpZ2F0ZShpdGVtLmlkKTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdC8vIEFkZCBjb250ZXh0IG1lbnUgaGFuZGxlclxyXG5cdFx0XHRpdGVtRWwuYWRkRXZlbnRMaXN0ZW5lcihcImNvbnRleHRtZW51XCIsIChlKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5zaG93Vmlld0NvbnRleHRNZW51KGUgYXMgTW91c2VFdmVudCwgaXRlbS5pZCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgc2V0QWN0aXZlSXRlbSh2aWV3SWQ6IHN0cmluZykge1xyXG5cdFx0Ly8gQ2xlYXIgYWN0aXZlIHN0YXRlIGZyb20gYm90aCBmdWxsIG5hdmlnYXRpb24gaXRlbXMgYW5kIHJhaWwgYnV0dG9uc1xyXG5cdFx0dGhpcy5jb250YWluZXJFbFxyXG5cdFx0XHQucXVlcnlTZWxlY3RvckFsbChcclxuXHRcdFx0XHRcIi5mbHVlbnQtbmF2aWdhdGlvbi1pdGVtLCAuZmx1ZW50LXJhaWwtYnRuW2RhdGEtdmlldy1pZF1cIlxyXG5cdFx0XHQpXHJcblx0XHRcdC5mb3JFYWNoKChlbCkgPT4ge1xyXG5cdFx0XHRcdGVsLnJlbW92ZUNsYXNzKFwiaXMtYWN0aXZlXCIpO1xyXG5cdFx0XHR9KTtcclxuXHRcdC8vIEFwcGx5IHRvIGFueSBlbGVtZW50IHRoYXQgY2FycmllcyB0aGlzIHZpZXcgaWQgKHdvcmtzIGluIGJvdGggbW9kZXMpXHJcblx0XHRjb25zdCBhY3RpdmVFbHMgPSB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoXHJcblx0XHRcdGBbZGF0YS12aWV3LWlkPVwiJHt2aWV3SWR9XCJdYFxyXG5cdFx0KTtcclxuXHRcdGFjdGl2ZUVscy5mb3JFYWNoKChlbCkgPT4gZWwuYWRkQ2xhc3MoXCJpcy1hY3RpdmVcIikpO1xyXG5cdH1cclxuXHJcblx0cHVibGljIHVwZGF0ZVdvcmtzcGFjZSh3b3Jrc3BhY2VPcklkOiBzdHJpbmcgfCBXb3Jrc3BhY2VEYXRhKSB7XHJcblx0XHRjb25zdCB3b3Jrc3BhY2VJZCA9XHJcblx0XHRcdHR5cGVvZiB3b3Jrc3BhY2VPcklkID09PSBcInN0cmluZ1wiXHJcblx0XHRcdFx0PyB3b3Jrc3BhY2VPcklkXHJcblx0XHRcdFx0OiB3b3Jrc3BhY2VPcklkLmlkO1xyXG5cdFx0dGhpcy5jdXJyZW50V29ya3NwYWNlSWQgPSB3b3Jrc3BhY2VJZDtcclxuXHRcdHRoaXMud29ya3NwYWNlU2VsZWN0b3I/LnNldFdvcmtzcGFjZSh3b3Jrc3BhY2VJZCk7XHJcblx0XHR0aGlzLnByb2plY3RMaXN0Py5yZWZyZXNoKCk7XHJcblx0fVxyXG59XHJcbiJdfQ==