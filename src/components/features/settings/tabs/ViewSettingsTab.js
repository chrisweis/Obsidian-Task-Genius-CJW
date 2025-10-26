import { __awaiter } from "tslib";
import { Setting, Notice, setIcon } from "obsidian";
import { t } from "@/translations/helper";
import { ViewConfigModal } from "@/components/features/task/view/modals/ViewConfigModal";
import { TaskFilterComponent } from "@/components/features/task/filter/ViewTaskFilter";
import Sortable from "sortablejs";
import "@/styles/view-setting-tab.css";
export function renderViewSettingsTab(settingTab, containerEl) {
    new Setting(containerEl)
        .setName(t("View Configuration"))
        .setDesc(t("Configure the Task Genius sidebar views, visibility, order, and create custom views."))
        .setHeading();
    new Setting(containerEl)
        .setName(t("Enable Task Genius Views"))
        .setDesc(t("Enable Task Genius sidebar views to display and manage tasks. Requires the indexer to be enabled."))
        .addToggle((toggle) => {
        toggle.setValue(settingTab.plugin.settings.enableView);
        toggle.onChange((value) => {
            if (value && !settingTab.plugin.settings.enableIndexer) {
                // If trying to enable views but indexer is disabled, show warning
                new Notice(t("Cannot enable views without indexer. Please enable the indexer first in Index & Sources settings."));
                toggle.setValue(false);
                return;
            }
            settingTab.plugin.settings.enableView = value;
            settingTab.applySettingsUpdate();
            settingTab.display(); // Refresh settings display
        });
    });
    if (!settingTab.plugin.settings.enableView) {
        // Show message when views are disabled
        new Setting(containerEl)
            .setName(t("Views are disabled"))
            .setDesc(t("Enable Task Genius Views above to configure view settings."));
        return;
    }
    new Setting(containerEl)
        .setName(t("Default view mode"))
        .setDesc(t("Choose the default display mode for all views. This affects how tasks are displayed when you first open a view or create a new view."))
        .addDropdown((dropdown) => {
        dropdown
            .addOption("list", t("List View"))
            .addOption("tree", t("Tree View"))
            .setValue(settingTab.plugin.settings.defaultViewMode)
            .onChange((value) => {
            settingTab.plugin.settings.defaultViewMode = value;
            settingTab.applySettingsUpdate();
        });
    });
    // Project Tree View Settings
    new Setting(containerEl)
        .setName(t("Project Tree View Settings"))
        .setDesc(t("Configure how projects are displayed in tree view."))
        .setHeading();
    new Setting(containerEl)
        .setName(t("Default project view mode"))
        .setDesc(t("Choose whether to display projects as a flat list or hierarchical tree by default."))
        .addDropdown((dropdown) => {
        dropdown
            .addOption("list", t("List View"))
            .addOption("tree", t("Tree View"))
            .setValue(settingTab.plugin.settings.projectViewDefaultMode)
            .onChange((value) => {
            settingTab.plugin.settings.projectViewDefaultMode =
                value;
            settingTab.applySettingsUpdate();
        });
    });
    new Setting(containerEl)
        .setName(t("Auto-expand project tree"))
        .setDesc(t("Automatically expand all project nodes when opening the project view in tree mode."))
        .addToggle((toggle) => {
        toggle
            .setValue(settingTab.plugin.settings.projectTreeAutoExpand)
            .onChange((value) => {
            settingTab.plugin.settings.projectTreeAutoExpand = value;
            settingTab.applySettingsUpdate();
        });
    });
    new Setting(containerEl)
        .setName(t("Show empty project folders"))
        .setDesc(t("Display project folders even if they don't contain any tasks."))
        .addToggle((toggle) => {
        toggle
            .setValue(settingTab.plugin.settings.projectTreeShowEmptyFolders)
            .onChange((value) => {
            settingTab.plugin.settings.projectTreeShowEmptyFolders =
                value;
            settingTab.applySettingsUpdate();
        });
    });
    new Setting(containerEl)
        .setName(t("Project path separator"))
        .setDesc(t("Character used to separate project hierarchy levels (e.g., '/' in 'Project/SubProject')."))
        .addText((text) => {
        text.setPlaceholder("/")
            .setValue(settingTab.plugin.settings.projectPathSeparator)
            .onChange((value) => {
            settingTab.plugin.settings.projectPathSeparator =
                value || "/";
            settingTab.applySettingsUpdate();
        });
    });
    // Date and Time Configuration Section
    new Setting(containerEl)
        .setName(t("Date and Time Display"))
        .setDesc(t("Configure how dates and times are displayed in views."))
        .setHeading();
    new Setting(containerEl)
        .setName(t("Use relative time for date"))
        .setDesc(t("Use relative time for date in task list item, e.g. 'yesterday', 'today', 'tomorrow', 'in 2 days', '3 months ago', etc."))
        .addToggle((toggle) => {
        toggle.setValue(settingTab.plugin.settings.useRelativeTimeForDate);
        toggle.onChange((value) => {
            settingTab.plugin.settings.useRelativeTimeForDate = value;
            settingTab.applySettingsUpdate();
        });
    });
    // Inline Editor Configuration
    new Setting(containerEl)
        .setName(t("Editor Configuration"))
        .setDesc(t("Configure inline editing and metadata positioning."))
        .setHeading();
    new Setting(containerEl)
        .setName(t("Enable inline editor"))
        .setDesc(t("Enable inline editing of task content and metadata directly in task views. When disabled, tasks can only be edited in the source file."))
        .addToggle((toggle) => {
        toggle.setValue(settingTab.plugin.settings.enableInlineEditor);
        toggle.onChange((value) => {
            settingTab.plugin.settings.enableInlineEditor = value;
            settingTab.applySettingsUpdate();
        });
    });
    new Setting(containerEl)
        .setName(t("Enable dynamic metadata positioning"))
        .setDesc(t("Intelligently position task metadata. When enabled, metadata appears on the same line as short tasks and below long tasks. When disabled, metadata always appears below the task content."))
        .addToggle((toggle) => {
        toggle.setValue(settingTab.plugin.settings.enableDynamicMetadataPositioning);
        toggle.onChange((value) => {
            settingTab.plugin.settings.enableDynamicMetadataPositioning =
                value;
            settingTab.applySettingsUpdate();
        });
    });
    // --- Global Filter Section ---
    new Setting(containerEl)
        .setName(t("Global Filter Configuration"))
        .setDesc(t("Configure global filter rules that apply to all Views by default. Individual Views can override these settings."))
        .setHeading();
    // Global filter container
    const globalFilterContainer = containerEl.createDiv({
        cls: "global-filter-container",
    });
    // Global filter component
    let globalFilterComponent = null;
    // Sortable instances for view management
    let topSortable = null;
    let bottomSortable = null;
    // Initialize global filter component
    const initializeGlobalFilter = () => {
        if (globalFilterComponent) {
            globalFilterComponent.onunload();
        }
        // Pre-save the global filter state to localStorage so TaskFilterComponent can load it
        if (settingTab.plugin.settings.globalFilterRules.advancedFilter) {
            settingTab.app.saveLocalStorage("task-genius-view-filter-global-filter", settingTab.plugin.settings.globalFilterRules.advancedFilter);
        }
        globalFilterComponent = new TaskFilterComponent(globalFilterContainer, settingTab.app, "global-filter", // Use a special leafId for global filter
        settingTab.plugin);
        // Load the component
        globalFilterComponent.onload();
        // Listen for filter changes
        const handleGlobalFilterChange = (filterState) => {
            if (globalFilterComponent) {
                // Update global filter rules in settings
                settingTab.plugin.settings.globalFilterRules = Object.assign(Object.assign({}, settingTab.plugin.settings.globalFilterRules), { advancedFilter: filterState });
                settingTab.applySettingsUpdate();
                // 触发视图刷新以应用新的全局筛选器
                // 使用插件的triggerViewUpdate方法刷新所有TaskView
                settingTab.plugin.triggerViewUpdate();
            }
        };
        // Register event listener for global filter changes
        settingTab.plugin.registerEvent(settingTab.app.workspace.on("task-genius:filter-changed", (filterState, leafId) => {
            if (leafId === "global-filter") {
                handleGlobalFilterChange(filterState);
            }
        }));
    };
    // Initialize the global filter component
    initializeGlobalFilter();
    // Store cleanup function for later use
    containerEl.cleanupGlobalFilter = () => {
        if (globalFilterComponent) {
            globalFilterComponent.onunload();
            globalFilterComponent = null;
        }
        // Also cleanup sortables
        if (topSortable) {
            topSortable.destroy();
            topSortable = null;
        }
        if (bottomSortable) {
            bottomSortable.destroy();
            bottomSortable = null;
        }
    };
    // --- New View Management Section ---
    new Setting(containerEl)
        .setName(t("Manage Views"))
        .setDesc(t("Drag views between sections or within sections to reorder them. Toggle visibility with the eye icon."))
        .setHeading();
    const viewListContainer = containerEl.createDiv({
        cls: "view-management-list",
    });
    // Create two containers for top and bottom sections
    const topSectionContainer = viewListContainer.createDiv({
        cls: "view-section-container",
    });
    const topSectionHeader = topSectionContainer.createDiv({
        cls: "view-section-header",
    });
    topSectionHeader.createEl("h4", { text: t("Top Section") });
    const topViewsContainer = topSectionContainer.createDiv({
        cls: "view-section-items sortable-views",
        attr: { "data-region": "top" },
    });
    const bottomSectionContainer = viewListContainer.createDiv({
        cls: "view-section-container",
    });
    const bottomSectionHeader = bottomSectionContainer.createDiv({
        cls: "view-section-header",
    });
    bottomSectionHeader.createEl("h4", { text: t("Bottom Section") });
    const bottomViewsContainer = bottomSectionContainer.createDiv({
        cls: "view-section-items sortable-views",
        attr: { "data-region": "bottom" },
    });
    // Function to render the list of views
    const renderViewList = () => {
        topViewsContainer.empty();
        bottomViewsContainer.empty();
        // Destroy existing sortables before re-rendering
        if (topSortable) {
            topSortable.destroy();
            topSortable = null;
        }
        if (bottomSortable) {
            bottomSortable.destroy();
            bottomSortable = null;
        }
        // Group views by region
        const topViews = [];
        const bottomViews = [];
        settingTab.plugin.settings.viewConfiguration.forEach((view) => {
            if (view.region === "bottom") {
                bottomViews.push(view);
            }
            else {
                topViews.push(view);
            }
        });
        // Helper function to create view item
        const createViewItem = (view, container) => {
            const viewEl = container.createDiv({
                cls: "view-item sortable-view-item",
                attr: {
                    "data-view-id": view.id,
                },
            });
            // Add drag handle
            const dragHandle = viewEl.createDiv({ cls: "view-drag-handle" });
            setIcon(dragHandle, "grip-vertical");
            // View icon
            const iconEl = viewEl.createDiv({ cls: "view-item-icon" });
            setIcon(iconEl, view.icon);
            // View info
            const infoEl = viewEl.createDiv({ cls: "view-item-info" });
            infoEl.createEl("div", { cls: "view-item-name", text: view.name });
            infoEl.createEl("div", {
                cls: "view-item-type",
                text: `[${view.type}]`,
            });
            // Actions container
            const actionsEl = viewEl.createDiv({ cls: "view-item-actions" });
            // Visibility toggle
            const visibilityBtn = actionsEl.createEl("button", {
                cls: ["view-action-button", "clickable-icon"],
                attr: {
                    "aria-label": view.visible
                        ? t("Hide from sidebar")
                        : t("Show in sidebar"),
                },
            });
            setIcon(visibilityBtn, view.visible ? "eye" : "eye-off");
            visibilityBtn.onclick = () => __awaiter(this, void 0, void 0, function* () {
                view.visible = !view.visible;
                // Save only; avoid full view refresh
                yield settingTab.plugin.saveSettings();
                renderViewList();
                // Emit event to notify TaskView sidebar to update without full view refresh
                settingTab.app.workspace.trigger("task-genius:view-config-changed", { reason: "visibility-changed", viewId: view.id });
            });
            // Edit button
            const editBtn = actionsEl.createEl("button", {
                cls: ["view-action-button", "clickable-icon"],
                attr: {
                    "aria-label": t("Edit View"),
                },
            });
            setIcon(editBtn, "pencil");
            editBtn.onclick = () => {
                if (view.id === "habit") {
                    settingTab.openTab("habit");
                    return;
                }
                new ViewConfigModal(settingTab.app, settingTab.plugin, view, view.filterRules || {}, (updatedView, updatedRules) => {
                    const currentIndex = settingTab.plugin.settings.viewConfiguration.findIndex((v) => v.id === updatedView.id);
                    if (currentIndex !== -1) {
                        settingTab.plugin.settings.viewConfiguration[currentIndex] = Object.assign(Object.assign({}, updatedView), { filterRules: updatedRules });
                        settingTab.plugin.saveSettings();
                        renderViewList();
                        settingTab.app.workspace.trigger("task-genius:view-config-changed", {
                            reason: "view-updated",
                            viewId: updatedView.id,
                        });
                    }
                }).open();
            };
            // Copy button
            const copyBtn = actionsEl.createEl("button", {
                cls: ["view-action-button", "clickable-icon"],
                attr: {
                    "aria-label": t("Copy View"),
                },
            });
            setIcon(copyBtn, "copy");
            copyBtn.onclick = () => {
                new ViewConfigModal(settingTab.app, settingTab.plugin, null, null, (createdView, createdRules) => {
                    if (!settingTab.plugin.settings.viewConfiguration.some((v) => v.id === createdView.id)) {
                        settingTab.plugin.settings.viewConfiguration.push(Object.assign(Object.assign({}, createdView), { filterRules: createdRules }));
                        settingTab.plugin.saveSettings();
                        renderViewList();
                        settingTab.app.workspace.trigger("task-genius:view-config-changed", {
                            reason: "view-copied",
                            viewId: createdView.id,
                        });
                        new Notice(t("View copied successfully: ") +
                            createdView.name);
                    }
                    else {
                        new Notice(t("Error: View ID already exists."));
                    }
                }, view, view.id).open();
            };
            // Delete button for custom views
            if (view.type === "custom") {
                const deleteBtn = actionsEl.createEl("button", {
                    cls: [
                        "view-action-button",
                        "view-action-delete",
                        "clickable-icon",
                    ],
                    attr: {
                        "aria-label": t("Delete View"),
                    },
                });
                setIcon(deleteBtn, "trash");
                deleteBtn.onclick = () => {
                    const index = settingTab.plugin.settings.viewConfiguration.findIndex((v) => v.id === view.id);
                    if (index !== -1) {
                        settingTab.plugin.settings.viewConfiguration.splice(index, 1);
                        settingTab.applySettingsUpdate();
                        renderViewList();
                    }
                };
            }
            return viewEl;
        };
        // Render views in their respective containers
        topViews.forEach((view) => createViewItem(view, topViewsContainer));
        bottomViews.forEach((view) => createViewItem(view, bottomViewsContainer));
        // Setup sortable for both containers
        const updateViewOrder = () => {
            const newOrder = [];
            // Get all views from top container
            topViewsContainer
                .querySelectorAll(".sortable-view-item")
                .forEach((el) => {
                const viewId = el.getAttribute("data-view-id");
                const view = settingTab.plugin.settings.viewConfiguration.find((v) => v.id === viewId);
                if (view) {
                    view.region = "top";
                    newOrder.push(view);
                }
            });
            // Get all views from bottom container
            bottomViewsContainer
                .querySelectorAll(".sortable-view-item")
                .forEach((el) => {
                const viewId = el.getAttribute("data-view-id");
                const view = settingTab.plugin.settings.viewConfiguration.find((v) => v.id === viewId);
                if (view) {
                    view.region = "bottom";
                    newOrder.push(view);
                }
            });
            // Update the settings
            settingTab.plugin.settings.viewConfiguration = newOrder;
            settingTab.plugin.saveSettings();
            settingTab.app.workspace.trigger("task-genius:view-config-changed", { reason: "order-changed" });
        };
        // Create sortable instances
        topSortable = Sortable.create(topViewsContainer, {
            group: "views",
            animation: 150,
            handle: ".view-drag-handle",
            ghostClass: "sortable-ghost",
            chosenClass: "sortable-chosen",
            dragClass: "sortable-drag",
            onEnd: () => {
                updateViewOrder();
            },
        });
        bottomSortable = Sortable.create(bottomViewsContainer, {
            group: "views",
            animation: 150,
            handle: ".view-drag-handle",
            ghostClass: "sortable-ghost",
            chosenClass: "sortable-chosen",
            dragClass: "sortable-drag",
            onEnd: () => {
                updateViewOrder();
            },
        });
    };
    renderViewList(); // Initial render
    // Add New Custom View Button (Logic unchanged)
    const addBtnContainer = containerEl.createDiv();
    new Setting(addBtnContainer).addButton((button) => {
        button
            .setButtonText(t("Add Custom View"))
            .setCta()
            .onClick(() => {
            new ViewConfigModal(settingTab.app, settingTab.plugin, null, null, (createdView, createdRules) => {
                if (!settingTab.plugin.settings.viewConfiguration.some((v) => v.id === createdView.id)) {
                    // Save with filter rules embedded
                    settingTab.plugin.settings.viewConfiguration.push(Object.assign(Object.assign({}, createdView), { filterRules: createdRules }));
                    settingTab.plugin.saveSettings();
                    renderViewList();
                    settingTab.app.workspace.trigger("task-genius:view-config-changed", { reason: "view-added", viewId: createdView.id });
                }
                else {
                    new Notice(t("Error: View ID already exists."));
                }
            }).open();
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVmlld1NldHRpbmdzVGFiLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiVmlld1NldHRpbmdzVGFiLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFFcEQsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRTFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUN6RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN2RixPQUFPLFFBQVEsTUFBTSxZQUFZLENBQUM7QUFDbEMsT0FBTywrQkFBK0IsQ0FBQztBQUV2QyxNQUFNLFVBQVUscUJBQXFCLENBQ3BDLFVBQXFDLEVBQ3JDLFdBQXdCO0lBRXhCLElBQUksT0FBTyxDQUFDLFdBQVcsQ0FBQztTQUN0QixPQUFPLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUM7U0FDaEMsT0FBTyxDQUNQLENBQUMsQ0FDQSxzRkFBc0YsQ0FDdEYsQ0FDRDtTQUNBLFVBQVUsRUFBRSxDQUFDO0lBRWYsSUFBSSxPQUFPLENBQUMsV0FBVyxDQUFDO1NBQ3RCLE9BQU8sQ0FBQyxDQUFDLENBQUMsMEJBQTBCLENBQUMsQ0FBQztTQUN0QyxPQUFPLENBQ1AsQ0FBQyxDQUNBLG1HQUFtRyxDQUNuRyxDQUNEO1NBQ0EsU0FBUyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7UUFDckIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDekIsSUFBSSxLQUFLLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUU7Z0JBQ3ZELGtFQUFrRTtnQkFDbEUs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QUFrQztvQkFDbEMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsSUFBSSxpQ0FDN0MsV0FBVyxLQUNkLFdBQVcsRUFBRSxZQUFZLElBQ3hCLENBQUM7b0JBQ0gsVUFBVSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFDakMsY0FBYyxFQUFFLENBQUM7b0JBQ2hCLFVBQVUsQ0FBQyxHQUFHLENBQUMsU0FBaUIsQ0FBQyxPQUFPLENBQ3hDLGlDQUFpQyxFQUNqQyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLFdBQVcsQ0FBQyxFQUFFLEVBQUUsQ0FDaEQsQ0FBQztpQkFDRjtxQkFBTTtvQkFDTixJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsZ0NBQWdDLENBQUMsQ0FBQyxDQUFDO2lCQUNoRDtZQUNGLENBQUMsQ0FDRCxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ1YsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTZXR0aW5nLCBOb3RpY2UsIHNldEljb24gfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgVmlld0NvbmZpZywgVmlld0ZpbHRlclJ1bGUgfSBmcm9tIFwiQC9jb21tb24vc2V0dGluZy1kZWZpbml0aW9uXCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCB7IFRhc2tQcm9ncmVzc0JhclNldHRpbmdUYWIgfSBmcm9tIFwiQC9zZXR0aW5nXCI7XHJcbmltcG9ydCB7IFZpZXdDb25maWdNb2RhbCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay92aWV3L21vZGFscy9WaWV3Q29uZmlnTW9kYWxcIjtcclxuaW1wb3J0IHsgVGFza0ZpbHRlckNvbXBvbmVudCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay9maWx0ZXIvVmlld1Rhc2tGaWx0ZXJcIjtcclxuaW1wb3J0IFNvcnRhYmxlIGZyb20gXCJzb3J0YWJsZWpzXCI7XHJcbmltcG9ydCBcIkAvc3R5bGVzL3ZpZXctc2V0dGluZy10YWIuY3NzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyVmlld1NldHRpbmdzVGFiKFxyXG5cdHNldHRpbmdUYWI6IFRhc2tQcm9ncmVzc0JhclNldHRpbmdUYWIsXHJcblx0Y29udGFpbmVyRWw6IEhUTUxFbGVtZW50XHJcbikge1xyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIlZpZXcgQ29uZmlndXJhdGlvblwiKSlcclxuXHRcdC5zZXREZXNjKFxyXG5cdFx0XHR0KFxyXG5cdFx0XHRcdFwiQ29uZmlndXJlIHRoZSBUYXNrIEdlbml1cyBzaWRlYmFyIHZpZXdzLCB2aXNpYmlsaXR5LCBvcmRlciwgYW5kIGNyZWF0ZSBjdXN0b20gdmlld3MuXCJcclxuXHRcdFx0KVxyXG5cdFx0KVxyXG5cdFx0LnNldEhlYWRpbmcoKTtcclxuXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiRW5hYmxlIFRhc2sgR2VuaXVzIFZpZXdzXCIpKVxyXG5cdFx0LnNldERlc2MoXHJcblx0XHRcdHQoXHJcblx0XHRcdFx0XCJFbmFibGUgVGFzayBHZW5pdXMgc2lkZWJhciB2aWV3cyB0byBkaXNwbGF5IGFuZCBtYW5hZ2UgdGFza3MuIFJlcXVpcmVzIHRoZSBpbmRleGVyIHRvIGJlIGVuYWJsZWQuXCJcclxuXHRcdFx0KVxyXG5cdFx0KVxyXG5cdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XHJcblx0XHRcdHRvZ2dsZS5zZXRWYWx1ZShzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5lbmFibGVWaWV3KTtcclxuXHRcdFx0dG9nZ2xlLm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdGlmICh2YWx1ZSAmJiAhc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZW5hYmxlSW5kZXhlcikge1xyXG5cdFx0XHRcdFx0Ly8gSWYgdHJ5aW5nIHRvIGVuYWJsZSB2aWV3cyBidXQgaW5kZXhlciBpcyBkaXNhYmxlZCwgc2hvdyB3YXJuaW5nXHJcblx0XHRcdFx0XHRuZXcgTm90aWNlKFxyXG5cdFx0XHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XHRcdFwiQ2Fubm90IGVuYWJsZSB2aWV3cyB3aXRob3V0IGluZGV4ZXIuIFBsZWFzZSBlbmFibGUgdGhlIGluZGV4ZXIgZmlyc3QgaW4gSW5kZXggJiBTb3VyY2VzIHNldHRpbmdzLlwiXHJcblx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR0b2dnbGUuc2V0VmFsdWUoZmFsc2UpO1xyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5lbmFibGVWaWV3ID0gdmFsdWU7XHJcblx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0c2V0dGluZ1RhYi5kaXNwbGF5KCk7IC8vIFJlZnJlc2ggc2V0dGluZ3MgZGlzcGxheVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRpZiAoIXNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmVuYWJsZVZpZXcpIHtcclxuXHRcdC8vIFNob3cgbWVzc2FnZSB3aGVuIHZpZXdzIGFyZSBkaXNhYmxlZFxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJWaWV3cyBhcmUgZGlzYWJsZWRcIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdHQoXCJFbmFibGUgVGFzayBHZW5pdXMgVmlld3MgYWJvdmUgdG8gY29uZmlndXJlIHZpZXcgc2V0dGluZ3MuXCIpXHJcblx0XHRcdCk7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJEZWZhdWx0IHZpZXcgbW9kZVwiKSlcclxuXHRcdC5zZXREZXNjKFxyXG5cdFx0XHR0KFxyXG5cdFx0XHRcdFwiQ2hvb3NlIHRoZSBkZWZhdWx0IGRpc3BsYXkgbW9kZSBmb3IgYWxsIHZpZXdzLiBUaGlzIGFmZmVjdHMgaG93IHRhc2tzIGFyZSBkaXNwbGF5ZWQgd2hlbiB5b3UgZmlyc3Qgb3BlbiBhIHZpZXcgb3IgY3JlYXRlIGEgbmV3IHZpZXcuXCJcclxuXHRcdFx0KVxyXG5cdFx0KVxyXG5cdFx0LmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xyXG5cdFx0XHRkcm9wZG93blxyXG5cdFx0XHRcdC5hZGRPcHRpb24oXCJsaXN0XCIsIHQoXCJMaXN0IFZpZXdcIikpXHJcblx0XHRcdFx0LmFkZE9wdGlvbihcInRyZWVcIiwgdChcIlRyZWUgVmlld1wiKSlcclxuXHRcdFx0XHQuc2V0VmFsdWUoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZGVmYXVsdFZpZXdNb2RlKVxyXG5cdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmRlZmF1bHRWaWV3TW9kZSA9IHZhbHVlIGFzXHJcblx0XHRcdFx0XHRcdHwgXCJsaXN0XCJcclxuXHRcdFx0XHRcdFx0fCBcInRyZWVcIjtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdC8vIFByb2plY3QgVHJlZSBWaWV3IFNldHRpbmdzXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiUHJvamVjdCBUcmVlIFZpZXcgU2V0dGluZ3NcIikpXHJcblx0XHQuc2V0RGVzYyh0KFwiQ29uZmlndXJlIGhvdyBwcm9qZWN0cyBhcmUgZGlzcGxheWVkIGluIHRyZWUgdmlldy5cIikpXHJcblx0XHQuc2V0SGVhZGluZygpO1xyXG5cclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJEZWZhdWx0IHByb2plY3QgdmlldyBtb2RlXCIpKVxyXG5cdFx0LnNldERlc2MoXHJcblx0XHRcdHQoXHJcblx0XHRcdFx0XCJDaG9vc2Ugd2hldGhlciB0byBkaXNwbGF5IHByb2plY3RzIGFzIGEgZmxhdCBsaXN0IG9yIGhpZXJhcmNoaWNhbCB0cmVlIGJ5IGRlZmF1bHQuXCJcclxuXHRcdFx0KVxyXG5cdFx0KVxyXG5cdFx0LmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xyXG5cdFx0XHRkcm9wZG93blxyXG5cdFx0XHRcdC5hZGRPcHRpb24oXCJsaXN0XCIsIHQoXCJMaXN0IFZpZXdcIikpXHJcblx0XHRcdFx0LmFkZE9wdGlvbihcInRyZWVcIiwgdChcIlRyZWUgVmlld1wiKSlcclxuXHRcdFx0XHQuc2V0VmFsdWUoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdFZpZXdEZWZhdWx0TW9kZSlcclxuXHRcdFx0XHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Vmlld0RlZmF1bHRNb2RlID1cclxuXHRcdFx0XHRcdFx0dmFsdWUgYXMgXCJsaXN0XCIgfCBcInRyZWVcIjtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIkF1dG8tZXhwYW5kIHByb2plY3QgdHJlZVwiKSlcclxuXHRcdC5zZXREZXNjKFxyXG5cdFx0XHR0KFxyXG5cdFx0XHRcdFwiQXV0b21hdGljYWxseSBleHBhbmQgYWxsIHByb2plY3Qgbm9kZXMgd2hlbiBvcGVuaW5nIHRoZSBwcm9qZWN0IHZpZXcgaW4gdHJlZSBtb2RlLlwiXHJcblx0XHRcdClcclxuXHRcdClcclxuXHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xyXG5cdFx0XHR0b2dnbGVcclxuXHRcdFx0XHQuc2V0VmFsdWUoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdFRyZWVBdXRvRXhwYW5kKVxyXG5cdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByb2plY3RUcmVlQXV0b0V4cGFuZCA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiU2hvdyBlbXB0eSBwcm9qZWN0IGZvbGRlcnNcIikpXHJcblx0XHQuc2V0RGVzYyhcclxuXHRcdFx0dChcIkRpc3BsYXkgcHJvamVjdCBmb2xkZXJzIGV2ZW4gaWYgdGhleSBkb24ndCBjb250YWluIGFueSB0YXNrcy5cIilcclxuXHRcdClcclxuXHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xyXG5cdFx0XHR0b2dnbGVcclxuXHRcdFx0XHQuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0VHJlZVNob3dFbXB0eUZvbGRlcnNcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdFRyZWVTaG93RW1wdHlGb2xkZXJzID1cclxuXHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJQcm9qZWN0IHBhdGggc2VwYXJhdG9yXCIpKVxyXG5cdFx0LnNldERlc2MoXHJcblx0XHRcdHQoXHJcblx0XHRcdFx0XCJDaGFyYWN0ZXIgdXNlZCB0byBzZXBhcmF0ZSBwcm9qZWN0IGhpZXJhcmNoeSBsZXZlbHMgKGUuZy4sICcvJyBpbiAnUHJvamVjdC9TdWJQcm9qZWN0JykuXCJcclxuXHRcdFx0KVxyXG5cdFx0KVxyXG5cdFx0LmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0dGV4dC5zZXRQbGFjZWhvbGRlcihcIi9cIilcclxuXHRcdFx0XHQuc2V0VmFsdWUoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdFBhdGhTZXBhcmF0b3IpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdFBhdGhTZXBhcmF0b3IgPVxyXG5cdFx0XHRcdFx0XHR2YWx1ZSB8fCBcIi9cIjtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdC8vIERhdGUgYW5kIFRpbWUgQ29uZmlndXJhdGlvbiBTZWN0aW9uXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiRGF0ZSBhbmQgVGltZSBEaXNwbGF5XCIpKVxyXG5cdFx0LnNldERlc2ModChcIkNvbmZpZ3VyZSBob3cgZGF0ZXMgYW5kIHRpbWVzIGFyZSBkaXNwbGF5ZWQgaW4gdmlld3MuXCIpKVxyXG5cdFx0LnNldEhlYWRpbmcoKTtcclxuXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiVXNlIHJlbGF0aXZlIHRpbWUgZm9yIGRhdGVcIikpXHJcblx0XHQuc2V0RGVzYyhcclxuXHRcdFx0dChcclxuXHRcdFx0XHRcIlVzZSByZWxhdGl2ZSB0aW1lIGZvciBkYXRlIGluIHRhc2sgbGlzdCBpdGVtLCBlLmcuICd5ZXN0ZXJkYXknLCAndG9kYXknLCAndG9tb3Jyb3cnLCAnaW4gMiBkYXlzJywgJzMgbW9udGhzIGFnbycsIGV0Yy5cIlxyXG5cdFx0XHQpXHJcblx0XHQpXHJcblx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcclxuXHRcdFx0dG9nZ2xlLnNldFZhbHVlKHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnVzZVJlbGF0aXZlVGltZUZvckRhdGUpO1xyXG5cdFx0XHR0b2dnbGUub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudXNlUmVsYXRpdmVUaW1lRm9yRGF0ZSA9IHZhbHVlO1xyXG5cdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHQvLyBJbmxpbmUgRWRpdG9yIENvbmZpZ3VyYXRpb25cclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJFZGl0b3IgQ29uZmlndXJhdGlvblwiKSlcclxuXHRcdC5zZXREZXNjKHQoXCJDb25maWd1cmUgaW5saW5lIGVkaXRpbmcgYW5kIG1ldGFkYXRhIHBvc2l0aW9uaW5nLlwiKSlcclxuXHRcdC5zZXRIZWFkaW5nKCk7XHJcblxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIkVuYWJsZSBpbmxpbmUgZWRpdG9yXCIpKVxyXG5cdFx0LnNldERlc2MoXHJcblx0XHRcdHQoXHJcblx0XHRcdFx0XCJFbmFibGUgaW5saW5lIGVkaXRpbmcgb2YgdGFzayBjb250ZW50IGFuZCBtZXRhZGF0YSBkaXJlY3RseSBpbiB0YXNrIHZpZXdzLiBXaGVuIGRpc2FibGVkLCB0YXNrcyBjYW4gb25seSBiZSBlZGl0ZWQgaW4gdGhlIHNvdXJjZSBmaWxlLlwiXHJcblx0XHRcdClcclxuXHRcdClcclxuXHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xyXG5cdFx0XHR0b2dnbGUuc2V0VmFsdWUoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZW5hYmxlSW5saW5lRWRpdG9yKTtcclxuXHRcdFx0dG9nZ2xlLm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmVuYWJsZUlubGluZUVkaXRvciA9IHZhbHVlO1xyXG5cdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJFbmFibGUgZHluYW1pYyBtZXRhZGF0YSBwb3NpdGlvbmluZ1wiKSlcclxuXHRcdC5zZXREZXNjKFxyXG5cdFx0XHR0KFxyXG5cdFx0XHRcdFwiSW50ZWxsaWdlbnRseSBwb3NpdGlvbiB0YXNrIG1ldGFkYXRhLiBXaGVuIGVuYWJsZWQsIG1ldGFkYXRhIGFwcGVhcnMgb24gdGhlIHNhbWUgbGluZSBhcyBzaG9ydCB0YXNrcyBhbmQgYmVsb3cgbG9uZyB0YXNrcy4gV2hlbiBkaXNhYmxlZCwgbWV0YWRhdGEgYWx3YXlzIGFwcGVhcnMgYmVsb3cgdGhlIHRhc2sgY29udGVudC5cIlxyXG5cdFx0XHQpXHJcblx0XHQpXHJcblx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcclxuXHRcdFx0dG9nZ2xlLnNldFZhbHVlKFxyXG5cdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmVuYWJsZUR5bmFtaWNNZXRhZGF0YVBvc2l0aW9uaW5nXHJcblx0XHRcdCk7XHJcblx0XHRcdHRvZ2dsZS5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5lbmFibGVEeW5hbWljTWV0YWRhdGFQb3NpdGlvbmluZyA9XHJcblx0XHRcdFx0XHR2YWx1ZTtcclxuXHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0Ly8gLS0tIEdsb2JhbCBGaWx0ZXIgU2VjdGlvbiAtLS1cclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJHbG9iYWwgRmlsdGVyIENvbmZpZ3VyYXRpb25cIikpXHJcblx0XHQuc2V0RGVzYyhcclxuXHRcdFx0dChcclxuXHRcdFx0XHRcIkNvbmZpZ3VyZSBnbG9iYWwgZmlsdGVyIHJ1bGVzIHRoYXQgYXBwbHkgdG8gYWxsIFZpZXdzIGJ5IGRlZmF1bHQuIEluZGl2aWR1YWwgVmlld3MgY2FuIG92ZXJyaWRlIHRoZXNlIHNldHRpbmdzLlwiXHJcblx0XHRcdClcclxuXHRcdClcclxuXHRcdC5zZXRIZWFkaW5nKCk7XHJcblxyXG5cdC8vIEdsb2JhbCBmaWx0ZXIgY29udGFpbmVyXHJcblx0Y29uc3QgZ2xvYmFsRmlsdGVyQ29udGFpbmVyID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdGNsczogXCJnbG9iYWwtZmlsdGVyLWNvbnRhaW5lclwiLFxyXG5cdH0pO1xyXG5cclxuXHQvLyBHbG9iYWwgZmlsdGVyIGNvbXBvbmVudFxyXG5cdGxldCBnbG9iYWxGaWx0ZXJDb21wb25lbnQ6IFRhc2tGaWx0ZXJDb21wb25lbnQgfCBudWxsID0gbnVsbDtcclxuXHJcblx0Ly8gU29ydGFibGUgaW5zdGFuY2VzIGZvciB2aWV3IG1hbmFnZW1lbnRcclxuXHRsZXQgdG9wU29ydGFibGU6IFNvcnRhYmxlIHwgbnVsbCA9IG51bGw7XHJcblx0bGV0IGJvdHRvbVNvcnRhYmxlOiBTb3J0YWJsZSB8IG51bGwgPSBudWxsO1xyXG5cclxuXHQvLyBJbml0aWFsaXplIGdsb2JhbCBmaWx0ZXIgY29tcG9uZW50XHJcblx0Y29uc3QgaW5pdGlhbGl6ZUdsb2JhbEZpbHRlciA9ICgpID0+IHtcclxuXHRcdGlmIChnbG9iYWxGaWx0ZXJDb21wb25lbnQpIHtcclxuXHRcdFx0Z2xvYmFsRmlsdGVyQ29tcG9uZW50Lm9udW5sb2FkKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUHJlLXNhdmUgdGhlIGdsb2JhbCBmaWx0ZXIgc3RhdGUgdG8gbG9jYWxTdG9yYWdlIHNvIFRhc2tGaWx0ZXJDb21wb25lbnQgY2FuIGxvYWQgaXRcclxuXHRcdGlmIChzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5nbG9iYWxGaWx0ZXJSdWxlcy5hZHZhbmNlZEZpbHRlcikge1xyXG5cdFx0XHRzZXR0aW5nVGFiLmFwcC5zYXZlTG9jYWxTdG9yYWdlKFxyXG5cdFx0XHRcdFwidGFzay1nZW5pdXMtdmlldy1maWx0ZXItZ2xvYmFsLWZpbHRlclwiLFxyXG5cdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmdsb2JhbEZpbHRlclJ1bGVzLmFkdmFuY2VkRmlsdGVyXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Z2xvYmFsRmlsdGVyQ29tcG9uZW50ID0gbmV3IFRhc2tGaWx0ZXJDb21wb25lbnQoXHJcblx0XHRcdGdsb2JhbEZpbHRlckNvbnRhaW5lcixcclxuXHRcdFx0c2V0dGluZ1RhYi5hcHAsXHJcblx0XHRcdFwiZ2xvYmFsLWZpbHRlclwiLCAvLyBVc2UgYSBzcGVjaWFsIGxlYWZJZCBmb3IgZ2xvYmFsIGZpbHRlclxyXG5cdFx0XHRzZXR0aW5nVGFiLnBsdWdpblxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBMb2FkIHRoZSBjb21wb25lbnRcclxuXHRcdGdsb2JhbEZpbHRlckNvbXBvbmVudC5vbmxvYWQoKTtcclxuXHJcblx0XHQvLyBMaXN0ZW4gZm9yIGZpbHRlciBjaGFuZ2VzXHJcblx0XHRjb25zdCBoYW5kbGVHbG9iYWxGaWx0ZXJDaGFuZ2UgPSAoZmlsdGVyU3RhdGU6IGFueSkgPT4ge1xyXG5cdFx0XHRpZiAoZ2xvYmFsRmlsdGVyQ29tcG9uZW50KSB7XHJcblx0XHRcdFx0Ly8gVXBkYXRlIGdsb2JhbCBmaWx0ZXIgcnVsZXMgaW4gc2V0dGluZ3NcclxuXHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5nbG9iYWxGaWx0ZXJSdWxlcyA9IHtcclxuXHRcdFx0XHRcdC4uLnNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmdsb2JhbEZpbHRlclJ1bGVzLFxyXG5cdFx0XHRcdFx0YWR2YW5jZWRGaWx0ZXI6IGZpbHRlclN0YXRlLFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblxyXG5cdFx0XHRcdC8vIOinpuWPkeinhuWbvuWIt+aWsOS7peW6lOeUqOaWsOeahOWFqOWxgOetm+mAieWZqFxyXG5cdFx0XHRcdC8vIOS9v+eUqOaPkuS7tueahHRyaWdnZXJWaWV3VXBkYXRl5pa55rOV5Yi35paw5omA5pyJVGFza1ZpZXdcclxuXHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi50cmlnZ2VyVmlld1VwZGF0ZSgpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIFJlZ2lzdGVyIGV2ZW50IGxpc3RlbmVyIGZvciBnbG9iYWwgZmlsdGVyIGNoYW5nZXNcclxuXHRcdHNldHRpbmdUYWIucGx1Z2luLnJlZ2lzdGVyRXZlbnQoXHJcblx0XHRcdHNldHRpbmdUYWIuYXBwLndvcmtzcGFjZS5vbihcclxuXHRcdFx0XHRcInRhc2stZ2VuaXVzOmZpbHRlci1jaGFuZ2VkXCIsXHJcblx0XHRcdFx0KGZpbHRlclN0YXRlLCBsZWFmSWQpID0+IHtcclxuXHRcdFx0XHRcdGlmIChsZWFmSWQgPT09IFwiZ2xvYmFsLWZpbHRlclwiKSB7XHJcblx0XHRcdFx0XHRcdGhhbmRsZUdsb2JhbEZpbHRlckNoYW5nZShmaWx0ZXJTdGF0ZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHQpXHJcblx0XHQpO1xyXG5cdH07XHJcblxyXG5cdC8vIEluaXRpYWxpemUgdGhlIGdsb2JhbCBmaWx0ZXIgY29tcG9uZW50XHJcblx0aW5pdGlhbGl6ZUdsb2JhbEZpbHRlcigpO1xyXG5cclxuXHQvLyBTdG9yZSBjbGVhbnVwIGZ1bmN0aW9uIGZvciBsYXRlciB1c2VcclxuXHQoY29udGFpbmVyRWwgYXMgYW55KS5jbGVhbnVwR2xvYmFsRmlsdGVyID0gKCkgPT4ge1xyXG5cdFx0aWYgKGdsb2JhbEZpbHRlckNvbXBvbmVudCkge1xyXG5cdFx0XHRnbG9iYWxGaWx0ZXJDb21wb25lbnQub251bmxvYWQoKTtcclxuXHRcdFx0Z2xvYmFsRmlsdGVyQ29tcG9uZW50ID0gbnVsbDtcclxuXHRcdH1cclxuXHRcdC8vIEFsc28gY2xlYW51cCBzb3J0YWJsZXNcclxuXHRcdGlmICh0b3BTb3J0YWJsZSkge1xyXG5cdFx0XHR0b3BTb3J0YWJsZS5kZXN0cm95KCk7XHJcblx0XHRcdHRvcFNvcnRhYmxlID0gbnVsbDtcclxuXHRcdH1cclxuXHRcdGlmIChib3R0b21Tb3J0YWJsZSkge1xyXG5cdFx0XHRib3R0b21Tb3J0YWJsZS5kZXN0cm95KCk7XHJcblx0XHRcdGJvdHRvbVNvcnRhYmxlID0gbnVsbDtcclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHQvLyAtLS0gTmV3IFZpZXcgTWFuYWdlbWVudCBTZWN0aW9uIC0tLVxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIk1hbmFnZSBWaWV3c1wiKSlcclxuXHRcdC5zZXREZXNjKFxyXG5cdFx0XHR0KFxyXG5cdFx0XHRcdFwiRHJhZyB2aWV3cyBiZXR3ZWVuIHNlY3Rpb25zIG9yIHdpdGhpbiBzZWN0aW9ucyB0byByZW9yZGVyIHRoZW0uIFRvZ2dsZSB2aXNpYmlsaXR5IHdpdGggdGhlIGV5ZSBpY29uLlwiXHJcblx0XHRcdClcclxuXHRcdClcclxuXHRcdC5zZXRIZWFkaW5nKCk7XHJcblxyXG5cdGNvbnN0IHZpZXdMaXN0Q29udGFpbmVyID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdGNsczogXCJ2aWV3LW1hbmFnZW1lbnQtbGlzdFwiLFxyXG5cdH0pO1xyXG5cclxuXHQvLyBDcmVhdGUgdHdvIGNvbnRhaW5lcnMgZm9yIHRvcCBhbmQgYm90dG9tIHNlY3Rpb25zXHJcblx0Y29uc3QgdG9wU2VjdGlvbkNvbnRhaW5lciA9IHZpZXdMaXN0Q29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRjbHM6IFwidmlldy1zZWN0aW9uLWNvbnRhaW5lclwiLFxyXG5cdH0pO1xyXG5cdGNvbnN0IHRvcFNlY3Rpb25IZWFkZXIgPSB0b3BTZWN0aW9uQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRjbHM6IFwidmlldy1zZWN0aW9uLWhlYWRlclwiLFxyXG5cdH0pO1xyXG5cdHRvcFNlY3Rpb25IZWFkZXIuY3JlYXRlRWwoXCJoNFwiLCB7IHRleHQ6IHQoXCJUb3AgU2VjdGlvblwiKSB9KTtcclxuXHRjb25zdCB0b3BWaWV3c0NvbnRhaW5lciA9IHRvcFNlY3Rpb25Db250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdGNsczogXCJ2aWV3LXNlY3Rpb24taXRlbXMgc29ydGFibGUtdmlld3NcIixcclxuXHRcdGF0dHI6IHsgXCJkYXRhLXJlZ2lvblwiOiBcInRvcFwiIH0sXHJcblx0fSk7XHJcblxyXG5cdGNvbnN0IGJvdHRvbVNlY3Rpb25Db250YWluZXIgPSB2aWV3TGlzdENvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0Y2xzOiBcInZpZXctc2VjdGlvbi1jb250YWluZXJcIixcclxuXHR9KTtcclxuXHRjb25zdCBib3R0b21TZWN0aW9uSGVhZGVyID0gYm90dG9tU2VjdGlvbkNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0Y2xzOiBcInZpZXctc2VjdGlvbi1oZWFkZXJcIixcclxuXHR9KTtcclxuXHRib3R0b21TZWN0aW9uSGVhZGVyLmNyZWF0ZUVsKFwiaDRcIiwgeyB0ZXh0OiB0KFwiQm90dG9tIFNlY3Rpb25cIikgfSk7XHJcblx0Y29uc3QgYm90dG9tVmlld3NDb250YWluZXIgPSBib3R0b21TZWN0aW9uQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRjbHM6IFwidmlldy1zZWN0aW9uLWl0ZW1zIHNvcnRhYmxlLXZpZXdzXCIsXHJcblx0XHRhdHRyOiB7IFwiZGF0YS1yZWdpb25cIjogXCJib3R0b21cIiB9LFxyXG5cdH0pO1xyXG5cclxuXHQvLyBGdW5jdGlvbiB0byByZW5kZXIgdGhlIGxpc3Qgb2Ygdmlld3NcclxuXHRjb25zdCByZW5kZXJWaWV3TGlzdCA9ICgpID0+IHtcclxuXHRcdHRvcFZpZXdzQ29udGFpbmVyLmVtcHR5KCk7XHJcblx0XHRib3R0b21WaWV3c0NvbnRhaW5lci5lbXB0eSgpO1xyXG5cclxuXHRcdC8vIERlc3Ryb3kgZXhpc3Rpbmcgc29ydGFibGVzIGJlZm9yZSByZS1yZW5kZXJpbmdcclxuXHRcdGlmICh0b3BTb3J0YWJsZSkge1xyXG5cdFx0XHR0b3BTb3J0YWJsZS5kZXN0cm95KCk7XHJcblx0XHRcdHRvcFNvcnRhYmxlID0gbnVsbDtcclxuXHRcdH1cclxuXHRcdGlmIChib3R0b21Tb3J0YWJsZSkge1xyXG5cdFx0XHRib3R0b21Tb3J0YWJsZS5kZXN0cm95KCk7XHJcblx0XHRcdGJvdHRvbVNvcnRhYmxlID0gbnVsbDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBHcm91cCB2aWV3cyBieSByZWdpb25cclxuXHRcdGNvbnN0IHRvcFZpZXdzOiBWaWV3Q29uZmlnW10gPSBbXTtcclxuXHRcdGNvbnN0IGJvdHRvbVZpZXdzOiBWaWV3Q29uZmlnW10gPSBbXTtcclxuXHJcblx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy52aWV3Q29uZmlndXJhdGlvbi5mb3JFYWNoKCh2aWV3KSA9PiB7XHJcblx0XHRcdGlmICh2aWV3LnJlZ2lvbiA9PT0gXCJib3R0b21cIikge1xyXG5cdFx0XHRcdGJvdHRvbVZpZXdzLnB1c2godmlldyk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dG9wVmlld3MucHVzaCh2aWV3KTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gSGVscGVyIGZ1bmN0aW9uIHRvIGNyZWF0ZSB2aWV3IGl0ZW1cclxuXHRcdGNvbnN0IGNyZWF0ZVZpZXdJdGVtID0gKHZpZXc6IFZpZXdDb25maWcsIGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpID0+IHtcclxuXHRcdFx0Y29uc3Qgdmlld0VsID0gY29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcInZpZXctaXRlbSBzb3J0YWJsZS12aWV3LWl0ZW1cIixcclxuXHRcdFx0XHRhdHRyOiB7XHJcblx0XHRcdFx0XHRcImRhdGEtdmlldy1pZFwiOiB2aWV3LmlkLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQWRkIGRyYWcgaGFuZGxlXHJcblx0XHRcdGNvbnN0IGRyYWdIYW5kbGUgPSB2aWV3RWwuY3JlYXRlRGl2KHsgY2xzOiBcInZpZXctZHJhZy1oYW5kbGVcIiB9KTtcclxuXHRcdFx0c2V0SWNvbihkcmFnSGFuZGxlLCBcImdyaXAtdmVydGljYWxcIik7XHJcblxyXG5cdFx0XHQvLyBWaWV3IGljb25cclxuXHRcdFx0Y29uc3QgaWNvbkVsID0gdmlld0VsLmNyZWF0ZURpdih7IGNsczogXCJ2aWV3LWl0ZW0taWNvblwiIH0pO1xyXG5cdFx0XHRzZXRJY29uKGljb25FbCwgdmlldy5pY29uKTtcclxuXHJcblx0XHRcdC8vIFZpZXcgaW5mb1xyXG5cdFx0XHRjb25zdCBpbmZvRWwgPSB2aWV3RWwuY3JlYXRlRGl2KHsgY2xzOiBcInZpZXctaXRlbS1pbmZvXCIgfSk7XHJcblx0XHRcdGluZm9FbC5jcmVhdGVFbChcImRpdlwiLCB7IGNsczogXCJ2aWV3LWl0ZW0tbmFtZVwiLCB0ZXh0OiB2aWV3Lm5hbWUgfSk7XHJcblx0XHRcdGluZm9FbC5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdFx0Y2xzOiBcInZpZXctaXRlbS10eXBlXCIsXHJcblx0XHRcdFx0dGV4dDogYFske3ZpZXcudHlwZX1dYCxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBBY3Rpb25zIGNvbnRhaW5lclxyXG5cdFx0XHRjb25zdCBhY3Rpb25zRWwgPSB2aWV3RWwuY3JlYXRlRGl2KHsgY2xzOiBcInZpZXctaXRlbS1hY3Rpb25zXCIgfSk7XHJcblxyXG5cdFx0XHQvLyBWaXNpYmlsaXR5IHRvZ2dsZVxyXG5cdFx0XHRjb25zdCB2aXNpYmlsaXR5QnRuID0gYWN0aW9uc0VsLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0XHRjbHM6IFtcInZpZXctYWN0aW9uLWJ1dHRvblwiLCBcImNsaWNrYWJsZS1pY29uXCJdLFxyXG5cdFx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHRcdFwiYXJpYS1sYWJlbFwiOiB2aWV3LnZpc2libGVcclxuXHRcdFx0XHRcdFx0PyB0KFwiSGlkZSBmcm9tIHNpZGViYXJcIilcclxuXHRcdFx0XHRcdFx0OiB0KFwiU2hvdyBpbiBzaWRlYmFyXCIpLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRzZXRJY29uKHZpc2liaWxpdHlCdG4sIHZpZXcudmlzaWJsZSA/IFwiZXllXCIgOiBcImV5ZS1vZmZcIik7XHJcblx0XHRcdHZpc2liaWxpdHlCdG4ub25jbGljayA9IGFzeW5jICgpID0+IHtcclxuXHRcdFx0XHR2aWV3LnZpc2libGUgPSAhdmlldy52aXNpYmxlO1xyXG5cdFx0XHRcdC8vIFNhdmUgb25seTsgYXZvaWQgZnVsbCB2aWV3IHJlZnJlc2hcclxuXHRcdFx0XHRhd2FpdCBzZXR0aW5nVGFiLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHRyZW5kZXJWaWV3TGlzdCgpO1xyXG5cdFx0XHRcdC8vIEVtaXQgZXZlbnQgdG8gbm90aWZ5IFRhc2tWaWV3IHNpZGViYXIgdG8gdXBkYXRlIHdpdGhvdXQgZnVsbCB2aWV3IHJlZnJlc2hcclxuXHRcdFx0XHQoc2V0dGluZ1RhYi5hcHAud29ya3NwYWNlIGFzIGFueSkudHJpZ2dlcihcclxuXHRcdFx0XHRcdFwidGFzay1nZW5pdXM6dmlldy1jb25maWctY2hhbmdlZFwiLFxyXG5cdFx0XHRcdFx0eyByZWFzb246IFwidmlzaWJpbGl0eS1jaGFuZ2VkXCIsIHZpZXdJZDogdmlldy5pZCB9XHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIEVkaXQgYnV0dG9uXHJcblx0XHRcdGNvbnN0IGVkaXRCdG4gPSBhY3Rpb25zRWwuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHRcdGNsczogW1widmlldy1hY3Rpb24tYnV0dG9uXCIsIFwiY2xpY2thYmxlLWljb25cIl0sXHJcblx0XHRcdFx0YXR0cjoge1xyXG5cdFx0XHRcdFx0XCJhcmlhLWxhYmVsXCI6IHQoXCJFZGl0IFZpZXdcIiksXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdHNldEljb24oZWRpdEJ0biwgXCJwZW5jaWxcIik7XHJcblx0XHRcdGVkaXRCdG4ub25jbGljayA9ICgpID0+IHtcclxuXHRcdFx0XHRpZiAodmlldy5pZCA9PT0gXCJoYWJpdFwiKSB7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLm9wZW5UYWIoXCJoYWJpdFwiKTtcclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0bmV3IFZpZXdDb25maWdNb2RhbChcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwLFxyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4sXHJcblx0XHRcdFx0XHR2aWV3LFxyXG5cdFx0XHRcdFx0dmlldy5maWx0ZXJSdWxlcyB8fCB7fSxcclxuXHRcdFx0XHRcdCh1cGRhdGVkVmlldzogVmlld0NvbmZpZywgdXBkYXRlZFJ1bGVzOiBWaWV3RmlsdGVyUnVsZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBjdXJyZW50SW5kZXggPVxyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnZpZXdDb25maWd1cmF0aW9uLmZpbmRJbmRleChcclxuXHRcdFx0XHRcdFx0XHRcdCh2KSA9PiB2LmlkID09PSB1cGRhdGVkVmlldy5pZFxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdGlmIChjdXJyZW50SW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3Mudmlld0NvbmZpZ3VyYXRpb25bXHJcblx0XHRcdFx0XHRcdFx0XHRjdXJyZW50SW5kZXhcclxuXHRcdFx0XHRcdFx0XHRdID0ge1xyXG5cdFx0XHRcdFx0XHRcdFx0Li4udXBkYXRlZFZpZXcsXHJcblx0XHRcdFx0XHRcdFx0XHRmaWx0ZXJSdWxlczogdXBkYXRlZFJ1bGVzLFxyXG5cdFx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0XHRcdFx0cmVuZGVyVmlld0xpc3QoKTtcclxuXHRcdFx0XHRcdFx0XHQoc2V0dGluZ1RhYi5hcHAud29ya3NwYWNlIGFzIGFueSkudHJpZ2dlcihcclxuXHRcdFx0XHRcdFx0XHRcdFwidGFzay1nZW5pdXM6dmlldy1jb25maWctY2hhbmdlZFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRyZWFzb246IFwidmlldy11cGRhdGVkXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdHZpZXdJZDogdXBkYXRlZFZpZXcuaWQsXHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdCkub3BlbigpO1xyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gQ29weSBidXR0b25cclxuXHRcdFx0Y29uc3QgY29weUJ0biA9IGFjdGlvbnNFbC5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdFx0Y2xzOiBbXCJ2aWV3LWFjdGlvbi1idXR0b25cIiwgXCJjbGlja2FibGUtaWNvblwiXSxcclxuXHRcdFx0XHRhdHRyOiB7XHJcblx0XHRcdFx0XHRcImFyaWEtbGFiZWxcIjogdChcIkNvcHkgVmlld1wiKSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0c2V0SWNvbihjb3B5QnRuLCBcImNvcHlcIik7XHJcblx0XHRcdGNvcHlCdG4ub25jbGljayA9ICgpID0+IHtcclxuXHRcdFx0XHRuZXcgVmlld0NvbmZpZ01vZGFsKFxyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHAsXHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbixcclxuXHRcdFx0XHRcdG51bGwsXHJcblx0XHRcdFx0XHRudWxsLFxyXG5cdFx0XHRcdFx0KGNyZWF0ZWRWaWV3OiBWaWV3Q29uZmlnLCBjcmVhdGVkUnVsZXM6IFZpZXdGaWx0ZXJSdWxlKSA9PiB7XHJcblx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHQhc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3Mudmlld0NvbmZpZ3VyYXRpb24uc29tZShcclxuXHRcdFx0XHRcdFx0XHRcdCh2KSA9PiB2LmlkID09PSBjcmVhdGVkVmlldy5pZFxyXG5cdFx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3Mudmlld0NvbmZpZ3VyYXRpb24ucHVzaCh7XHJcblx0XHRcdFx0XHRcdFx0XHQuLi5jcmVhdGVkVmlldyxcclxuXHRcdFx0XHRcdFx0XHRcdGZpbHRlclJ1bGVzOiBjcmVhdGVkUnVsZXMsXHJcblx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0XHRcdFx0cmVuZGVyVmlld0xpc3QoKTtcclxuXHRcdFx0XHRcdFx0XHQoc2V0dGluZ1RhYi5hcHAud29ya3NwYWNlIGFzIGFueSkudHJpZ2dlcihcclxuXHRcdFx0XHRcdFx0XHRcdFwidGFzay1nZW5pdXM6dmlldy1jb25maWctY2hhbmdlZFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRyZWFzb246IFwidmlldy1jb3BpZWRcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0dmlld0lkOiBjcmVhdGVkVmlldy5pZCxcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdG5ldyBOb3RpY2UoXHJcblx0XHRcdFx0XHRcdFx0XHR0KFwiVmlldyBjb3BpZWQgc3VjY2Vzc2Z1bGx5OiBcIikgK1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRjcmVhdGVkVmlldy5uYW1lXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRuZXcgTm90aWNlKHQoXCJFcnJvcjogVmlldyBJRCBhbHJlYWR5IGV4aXN0cy5cIikpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0dmlldyxcclxuXHRcdFx0XHRcdHZpZXcuaWRcclxuXHRcdFx0XHQpLm9wZW4oKTtcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIERlbGV0ZSBidXR0b24gZm9yIGN1c3RvbSB2aWV3c1xyXG5cdFx0XHRpZiAodmlldy50eXBlID09PSBcImN1c3RvbVwiKSB7XHJcblx0XHRcdFx0Y29uc3QgZGVsZXRlQnRuID0gYWN0aW9uc0VsLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0XHRcdGNsczogW1xyXG5cdFx0XHRcdFx0XHRcInZpZXctYWN0aW9uLWJ1dHRvblwiLFxyXG5cdFx0XHRcdFx0XHRcInZpZXctYWN0aW9uLWRlbGV0ZVwiLFxyXG5cdFx0XHRcdFx0XHRcImNsaWNrYWJsZS1pY29uXCIsXHJcblx0XHRcdFx0XHRdLFxyXG5cdFx0XHRcdFx0YXR0cjoge1xyXG5cdFx0XHRcdFx0XHRcImFyaWEtbGFiZWxcIjogdChcIkRlbGV0ZSBWaWV3XCIpLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRzZXRJY29uKGRlbGV0ZUJ0biwgXCJ0cmFzaFwiKTtcclxuXHRcdFx0XHRkZWxldGVCdG4ub25jbGljayA9ICgpID0+IHtcclxuXHRcdFx0XHRcdGNvbnN0IGluZGV4ID1cclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3Mudmlld0NvbmZpZ3VyYXRpb24uZmluZEluZGV4KFxyXG5cdFx0XHRcdFx0XHRcdCh2KSA9PiB2LmlkID09PSB2aWV3LmlkXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRpZiAoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnZpZXdDb25maWd1cmF0aW9uLnNwbGljZShcclxuXHRcdFx0XHRcdFx0XHRpbmRleCxcclxuXHRcdFx0XHRcdFx0XHQxXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHRyZW5kZXJWaWV3TGlzdCgpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiB2aWV3RWw7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIFJlbmRlciB2aWV3cyBpbiB0aGVpciByZXNwZWN0aXZlIGNvbnRhaW5lcnNcclxuXHRcdHRvcFZpZXdzLmZvckVhY2goKHZpZXcpID0+IGNyZWF0ZVZpZXdJdGVtKHZpZXcsIHRvcFZpZXdzQ29udGFpbmVyKSk7XHJcblx0XHRib3R0b21WaWV3cy5mb3JFYWNoKCh2aWV3KSA9PlxyXG5cdFx0XHRjcmVhdGVWaWV3SXRlbSh2aWV3LCBib3R0b21WaWV3c0NvbnRhaW5lcilcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gU2V0dXAgc29ydGFibGUgZm9yIGJvdGggY29udGFpbmVyc1xyXG5cdFx0Y29uc3QgdXBkYXRlVmlld09yZGVyID0gKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBuZXdPcmRlcjogVmlld0NvbmZpZ1tdID0gW107XHJcblxyXG5cdFx0XHQvLyBHZXQgYWxsIHZpZXdzIGZyb20gdG9wIGNvbnRhaW5lclxyXG5cdFx0XHR0b3BWaWV3c0NvbnRhaW5lclxyXG5cdFx0XHRcdC5xdWVyeVNlbGVjdG9yQWxsKFwiLnNvcnRhYmxlLXZpZXctaXRlbVwiKVxyXG5cdFx0XHRcdC5mb3JFYWNoKChlbCkgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc3Qgdmlld0lkID0gZWwuZ2V0QXR0cmlidXRlKFwiZGF0YS12aWV3LWlkXCIpO1xyXG5cdFx0XHRcdFx0Y29uc3QgdmlldyA9XHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnZpZXdDb25maWd1cmF0aW9uLmZpbmQoXHJcblx0XHRcdFx0XHRcdFx0KHYpID0+IHYuaWQgPT09IHZpZXdJZFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0aWYgKHZpZXcpIHtcclxuXHRcdFx0XHRcdFx0dmlldy5yZWdpb24gPSBcInRvcFwiO1xyXG5cdFx0XHRcdFx0XHRuZXdPcmRlci5wdXNoKHZpZXcpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gR2V0IGFsbCB2aWV3cyBmcm9tIGJvdHRvbSBjb250YWluZXJcclxuXHRcdFx0Ym90dG9tVmlld3NDb250YWluZXJcclxuXHRcdFx0XHQucXVlcnlTZWxlY3RvckFsbChcIi5zb3J0YWJsZS12aWV3LWl0ZW1cIilcclxuXHRcdFx0XHQuZm9yRWFjaCgoZWwpID0+IHtcclxuXHRcdFx0XHRcdGNvbnN0IHZpZXdJZCA9IGVsLmdldEF0dHJpYnV0ZShcImRhdGEtdmlldy1pZFwiKTtcclxuXHRcdFx0XHRcdGNvbnN0IHZpZXcgPVxyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy52aWV3Q29uZmlndXJhdGlvbi5maW5kKFxyXG5cdFx0XHRcdFx0XHRcdCh2KSA9PiB2LmlkID09PSB2aWV3SWRcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdGlmICh2aWV3KSB7XHJcblx0XHRcdFx0XHRcdHZpZXcucmVnaW9uID0gXCJib3R0b21cIjtcclxuXHRcdFx0XHRcdFx0bmV3T3JkZXIucHVzaCh2aWV3KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIFVwZGF0ZSB0aGUgc2V0dGluZ3NcclxuXHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3Mudmlld0NvbmZpZ3VyYXRpb24gPSBuZXdPcmRlcjtcclxuXHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdChzZXR0aW5nVGFiLmFwcC53b3Jrc3BhY2UgYXMgYW55KS50cmlnZ2VyKFxyXG5cdFx0XHRcdFwidGFzay1nZW5pdXM6dmlldy1jb25maWctY2hhbmdlZFwiLFxyXG5cdFx0XHRcdHsgcmVhc29uOiBcIm9yZGVyLWNoYW5nZWRcIiB9XHJcblx0XHRcdCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIENyZWF0ZSBzb3J0YWJsZSBpbnN0YW5jZXNcclxuXHRcdHRvcFNvcnRhYmxlID0gU29ydGFibGUuY3JlYXRlKHRvcFZpZXdzQ29udGFpbmVyLCB7XHJcblx0XHRcdGdyb3VwOiBcInZpZXdzXCIsXHJcblx0XHRcdGFuaW1hdGlvbjogMTUwLFxyXG5cdFx0XHRoYW5kbGU6IFwiLnZpZXctZHJhZy1oYW5kbGVcIixcclxuXHRcdFx0Z2hvc3RDbGFzczogXCJzb3J0YWJsZS1naG9zdFwiLFxyXG5cdFx0XHRjaG9zZW5DbGFzczogXCJzb3J0YWJsZS1jaG9zZW5cIixcclxuXHRcdFx0ZHJhZ0NsYXNzOiBcInNvcnRhYmxlLWRyYWdcIixcclxuXHRcdFx0b25FbmQ6ICgpID0+IHtcclxuXHRcdFx0XHR1cGRhdGVWaWV3T3JkZXIoKTtcclxuXHRcdFx0fSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGJvdHRvbVNvcnRhYmxlID0gU29ydGFibGUuY3JlYXRlKGJvdHRvbVZpZXdzQ29udGFpbmVyLCB7XHJcblx0XHRcdGdyb3VwOiBcInZpZXdzXCIsXHJcblx0XHRcdGFuaW1hdGlvbjogMTUwLFxyXG5cdFx0XHRoYW5kbGU6IFwiLnZpZXctZHJhZy1oYW5kbGVcIixcclxuXHRcdFx0Z2hvc3RDbGFzczogXCJzb3J0YWJsZS1naG9zdFwiLFxyXG5cdFx0XHRjaG9zZW5DbGFzczogXCJzb3J0YWJsZS1jaG9zZW5cIixcclxuXHRcdFx0ZHJhZ0NsYXNzOiBcInNvcnRhYmxlLWRyYWdcIixcclxuXHRcdFx0b25FbmQ6ICgpID0+IHtcclxuXHRcdFx0XHR1cGRhdGVWaWV3T3JkZXIoKTtcclxuXHRcdFx0fSxcclxuXHRcdH0pO1xyXG5cdH07XHJcblxyXG5cdHJlbmRlclZpZXdMaXN0KCk7IC8vIEluaXRpYWwgcmVuZGVyXHJcblxyXG5cdC8vIEFkZCBOZXcgQ3VzdG9tIFZpZXcgQnV0dG9uIChMb2dpYyB1bmNoYW5nZWQpXHJcblx0Y29uc3QgYWRkQnRuQ29udGFpbmVyID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KCk7XHJcblx0bmV3IFNldHRpbmcoYWRkQnRuQ29udGFpbmVyKS5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xyXG5cdFx0YnV0dG9uXHJcblx0XHRcdC5zZXRCdXR0b25UZXh0KHQoXCJBZGQgQ3VzdG9tIFZpZXdcIikpXHJcblx0XHRcdC5zZXRDdGEoKVxyXG5cdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0bmV3IFZpZXdDb25maWdNb2RhbChcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwLFxyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4sXHJcblx0XHRcdFx0XHRudWxsLFxyXG5cdFx0XHRcdFx0bnVsbCxcclxuXHRcdFx0XHRcdChjcmVhdGVkVmlldzogVmlld0NvbmZpZywgY3JlYXRlZFJ1bGVzOiBWaWV3RmlsdGVyUnVsZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0IXNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnZpZXdDb25maWd1cmF0aW9uLnNvbWUoXHJcblx0XHRcdFx0XHRcdFx0XHQodikgPT4gdi5pZCA9PT0gY3JlYXRlZFZpZXcuaWRcclxuXHRcdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdC8vIFNhdmUgd2l0aCBmaWx0ZXIgcnVsZXMgZW1iZWRkZWRcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy52aWV3Q29uZmlndXJhdGlvbi5wdXNoKHtcclxuXHRcdFx0XHRcdFx0XHRcdC4uLmNyZWF0ZWRWaWV3LFxyXG5cdFx0XHRcdFx0XHRcdFx0ZmlsdGVyUnVsZXM6IGNyZWF0ZWRSdWxlcyxcclxuXHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHRcdFx0XHRyZW5kZXJWaWV3TGlzdCgpO1xyXG5cdFx0XHRcdFx0XHRcdChzZXR0aW5nVGFiLmFwcC53b3Jrc3BhY2UgYXMgYW55KS50cmlnZ2VyKFxyXG5cdFx0XHRcdFx0XHRcdFx0XCJ0YXNrLWdlbml1czp2aWV3LWNvbmZpZy1jaGFuZ2VkXCIsXHJcblx0XHRcdFx0XHRcdFx0XHR7IHJlYXNvbjogXCJ2aWV3LWFkZGVkXCIsIHZpZXdJZDogY3JlYXRlZFZpZXcuaWQgfVxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0bmV3IE5vdGljZSh0KFwiRXJyb3I6IFZpZXcgSUQgYWxyZWFkeSBleGlzdHMuXCIpKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdCkub3BlbigpO1xyXG5cdFx0XHR9KTtcclxuXHR9KTtcclxufVxyXG4iXX0=