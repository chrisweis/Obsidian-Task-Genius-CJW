import { __awaiter } from "tslib";
import { Component, Menu, setIcon, Notice } from "obsidian";
import { t } from "@/translations/helper";
import { TASK_SPECIFIC_VIEW_TYPE } from "@/pages/TaskSpecificView";
import { ViewConfigModal } from "@/components/features/task/view/modals/ViewConfigModal";
// Remove the enum if it exists, use ViewMode type directly
// export type ViewMode = "inbox" | "forecast" | "projects" | "tags" | "review";
export class SidebarComponent extends Component {
    constructor(parentEl, plugin) {
        super();
        this.currentViewId = "inbox";
        this.isCollapsed = false;
        // Event handlers
        this.onViewModeChanged = () => { };
        this.onProjectSelected = () => { };
        this.containerEl = parentEl.createDiv({ cls: "task-sidebar" });
        this.plugin = plugin;
        this.app = plugin.app;
    }
    onload() {
        this.navEl = this.containerEl.createDiv({ cls: "sidebar-nav" });
        this.renderSidebarItems(); // Initial render
    }
    // New method to render sidebar items dynamically
    renderSidebarItems() {
        this.navEl.empty(); // Clear existing items
        // Ensure settings are initialized
        if (!this.plugin.settings.viewConfiguration) {
            // This should ideally be handled earlier, but as a fallback:
            console.warn("SidebarComponent: viewConfiguration not initialized in settings.");
            return;
        }
        // 根据 region 属性将视图分为顶部组和底部组，同时保持各组内的顺序
        const topViews = [];
        const bottomViews = [];
        // 按照原始顺序遍历，根据 region 分组
        this.plugin.settings.viewConfiguration.forEach((viewConfig) => {
            if (viewConfig.visible) {
                if (viewConfig.region === "bottom") {
                    bottomViews.push(viewConfig);
                }
                else {
                    // 默认或 "top" 都放在顶部
                    topViews.push(viewConfig);
                }
            }
        });
        // 先渲染顶部视图（保持原始顺序）
        topViews.forEach((viewConfig) => {
            this.createNavItem(viewConfig.id, t(viewConfig.name), viewConfig.icon);
        });
        // 如果有顶部视图和底部视图，添加分隔符
        if (topViews.length > 0 && bottomViews.length > 0) {
            this.createNavSpacer();
        }
        // 渲染底部视图（保持原始顺序）
        bottomViews.forEach((viewConfig) => {
            this.createNavItem(viewConfig.id, t(viewConfig.name), viewConfig.icon);
        });
        // Highlight the currently active view
        this.updateActiveItem();
    }
    createNavSpacer() {
        this.navEl.createDiv({ cls: "sidebar-nav-spacer" });
    }
    createNavItem(viewId, label, icon) {
        const navItem = this.navEl.createDiv({
            cls: "sidebar-nav-item",
            attr: { "data-view-id": viewId },
        });
        const iconEl = navItem.createSpan({ cls: "nav-item-icon" });
        setIcon(iconEl, icon);
        navItem.createSpan({ cls: "nav-item-label", text: label });
        this.registerDomEvent(navItem, "click", () => {
            this.setViewMode(viewId);
            // Trigger the event for TaskView to handle the switch
            if (this.onViewModeChanged) {
                this.onViewModeChanged(viewId);
            }
        });
        this.registerDomEvent(navItem, "contextmenu", (e) => {
            var _a;
            const menu = new Menu();
            menu.addItem((item) => {
                item.setTitle(t("Open in new tab")).onClick(() => {
                    const leaf = this.app.workspace.getLeaf();
                    leaf.setViewState({
                        type: TASK_SPECIFIC_VIEW_TYPE,
                        state: {
                            viewId: viewId,
                        },
                    });
                });
            })
                .addItem((item) => {
                item.setTitle(t("Open settings")).onClick(() => __awaiter(this, void 0, void 0, function* () {
                    // Special handling for habit view
                    if (viewId === "habit") {
                        // Open the settings tab and navigate to habit section
                        this.app.setting.open();
                        this.app.setting.openTabById(this.plugin.manifest.id);
                        // Wait a bit for the settings to open
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
                    new ViewConfigModal(this.app, this.plugin, view, currentRules, (updatedView, updatedRules) => {
                        const currentIndex = this.plugin.settings.viewConfiguration.findIndex((v) => v.id === updatedView.id);
                        if (currentIndex !== -1) {
                            // Update the view config in the array
                            this.plugin.settings.viewConfiguration[currentIndex] = Object.assign(Object.assign({}, updatedView), { filterRules: updatedRules }); // Ensure rules are saved back to viewConfig
                            this.plugin.saveSettings();
                            this.updateActiveItem();
                        }
                    }).open();
                }));
            })
                .addItem((item) => {
                item.setTitle(t("Copy view")).onClick(() => {
                    const view = this.plugin.settings.viewConfiguration.find((v) => v.id === viewId);
                    if (!view) {
                        return;
                    }
                    // Create a copy of the current view
                    new ViewConfigModal(this.app, this.plugin, null, // null for create mode
                    null, // null for create mode
                    (createdView, createdRules) => {
                        if (!this.plugin.settings.viewConfiguration.some((v) => v.id === createdView.id)) {
                            // Save with filter rules embedded
                            this.plugin.settings.viewConfiguration.push(Object.assign(Object.assign({}, createdView), { filterRules: createdRules }));
                            this.plugin.saveSettings();
                            this.renderSidebarItems();
                            new Notice(t("View copied successfully: ") +
                                createdView.name);
                        }
                        else {
                            new Notice(t("Error: View ID already exists."));
                        }
                    }, view, // 传入当前视图作为拷贝源
                    view.id).open();
                });
            })
                .addItem((item) => {
                item.setTitle(t("Hide in sidebar")).onClick(() => {
                    const view = this.plugin.settings.viewConfiguration.find((v) => v.id === viewId);
                    if (!view) {
                        return;
                    }
                    view.visible = false;
                    this.plugin.saveSettings();
                    this.renderSidebarItems();
                });
            });
            if (((_a = this.plugin.settings.viewConfiguration.find((view) => view.id === viewId)) === null || _a === void 0 ? void 0 : _a.type) === "custom") {
                menu.addItem((item) => {
                    item.setTitle(t("Delete"))
                        .setWarning(true)
                        .onClick(() => {
                        this.plugin.settings.viewConfiguration =
                            this.plugin.settings.viewConfiguration.filter((v) => v.id !== viewId);
                        this.plugin.saveSettings();
                        this.renderSidebarItems();
                    });
                });
            }
            menu.showAtMouseEvent(e);
        });
        return navItem;
    }
    // Updated setViewMode to accept ViewMode type and use viewId
    setViewMode(viewId) {
        this.currentViewId = viewId;
        this.updateActiveItem();
    }
    updateActiveItem() {
        const items = this.navEl.querySelectorAll(".sidebar-nav-item");
        items.forEach((item) => {
            if (item.getAttribute("data-view-id") === this.currentViewId) {
                item.addClass("is-active");
            }
            else {
                item.removeClass("is-active");
            }
        });
    }
    setCollapsed(collapsed) {
        this.isCollapsed = collapsed;
        this.containerEl.toggleClass("collapsed", collapsed);
    }
    onunload() {
        this.containerEl.empty();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lkZWJhci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNpZGViYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBTyxTQUFTLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFFakUsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBUTFDLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ25FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUV6RiwyREFBMkQ7QUFDM0QsZ0ZBQWdGO0FBRWhGLE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxTQUFTO0lBWTlDLFlBQVksUUFBcUIsRUFBRSxNQUE2QjtRQUMvRCxLQUFLLEVBQUUsQ0FBQztRQVJELGtCQUFhLEdBQWEsT0FBTyxDQUFDO1FBQ2xDLGdCQUFXLEdBQVksS0FBSyxDQUFDO1FBRXJDLGlCQUFpQjtRQUNWLHNCQUFpQixHQUErQixHQUFHLEVBQUUsR0FBRSxDQUFDLENBQUM7UUFDekQsc0JBQWlCLEdBQThCLEdBQUcsRUFBRSxHQUFFLENBQUMsQ0FBQztRQUk5RCxJQUFJLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQztRQUMvRCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUM7SUFDdkIsQ0FBQztJQUVELE1BQU07UUFDTCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUM7UUFDaEUsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxpQkFBaUI7SUFDN0MsQ0FBQztJQUVELGlEQUFpRDtJQUNqRCxrQkFBa0I7UUFDakIsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLHVCQUF1QjtRQUUzQyxrQ0FBa0M7UUFDbEMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFO1lBQzVDLDZEQUE2RDtZQUM3RCxPQUFPLENBQUMsSUFBSSxDQUNYLGtFQUFrRSxDQUNsRSxDQUFDO1lBQ0YsT0FBTztTQUNQO1FBRUQsc0NBQXNDO1FBQ3RDLE1BQU0sUUFBUSxHQUFpQixFQUFFLENBQUM7UUFDbEMsTUFBTSxXQUFXLEdBQWlCLEVBQUUsQ0FBQztRQUVyQyx3QkFBd0I7UUFDeEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUU7WUFDN0QsSUFBSSxVQUFVLENBQUMsT0FBTyxFQUFFO2dCQUN2QixJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssUUFBUSxFQUFFO29CQUNuQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2lCQUM3QjtxQkFBTTtvQkFDTixrQkFBa0I7b0JBQ2xCLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7aUJBQzFCO2FBQ0Q7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILGtCQUFrQjtRQUNsQixRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUU7WUFDL0IsSUFBSSxDQUFDLGFBQWEsQ0FDakIsVUFBVSxDQUFDLEVBQUUsRUFDYixDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUNsQixVQUFVLENBQUMsSUFBSSxDQUNmLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVILHFCQUFxQjtRQUNyQixJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ2xELElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztTQUN2QjtRQUVELGlCQUFpQjtRQUNqQixXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUU7WUFDbEMsSUFBSSxDQUFDLGFBQWEsQ0FDakIsVUFBVSxDQUFDLEVBQUUsRUFDYixDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUNsQixVQUFVLENBQUMsSUFBSSxDQUNmLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVILHNDQUFzQztRQUN0QyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUN6QixDQUFDO0lBRU8sZUFBZTtRQUN0QixJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxvQkFBb0IsRUFBRSxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUVPLGFBQWEsQ0FBQyxNQUFnQixFQUFFLEtBQWEsRUFBRSxJQUFZO1FBQ2xFLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDO1lBQ3BDLEdBQUcsRUFBRSxrQkFBa0I7WUFDdkIsSUFBSSxFQUFFLEVBQUUsY0FBYyxFQUFFLE1BQU0sRUFBRTtTQUNoQyxDQUFDLENBQUM7UUFFSCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUsR0FBRyxFQUFFLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFDNUQsT0FBTyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUV0QixPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUsR0FBRyxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBRTNELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUM1QyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pCLHNEQUFzRDtZQUN0RCxJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRTtnQkFDM0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQy9CO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFOztZQUNuRCxNQUFNLElBQUksR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFDckIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUU7b0JBQ2hELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUMxQyxJQUFJLENBQUMsWUFBWSxDQUFDO3dCQUNqQixJQUFJLEVBQUUsdUJBQXVCO3dCQUM3QixLQUFLLEVBQUU7NEJBQ04sTUFBTSxFQUFFLE1BQU07eUJBQ2Q7cUJBQ0QsQ0FBQyxDQUFDO2dCQUNKLENBQUMsQ0FBQyxDQUFDO1lBQ0osQ0FBQyxDQUFDO2lCQUNBLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO2dCQUNqQixJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFTLEVBQUU7b0JBQ3BELGtDQUFrQztvQkFDbEMsSUFBSSxNQUFNLEtBQUssT0FBTyxFQUFFO3dCQUN2QixzREFBc0Q7d0JBQ3JELElBQUksQ0FBQyxHQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO3dCQUNoQyxJQUFJLENBQUMsR0FBVyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7d0JBQy9ELHNDQUFzQzt3QkFDdEMsVUFBVSxDQUFDLEdBQUcsRUFBRTs0QkFDZixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFO2dDQUMzQixJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7NkJBQ3hDO3dCQUNGLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQzt3QkFDUixPQUFPO3FCQUNQO29CQUVELGtDQUFrQztvQkFDbEMsTUFBTSxJQUFJLEdBQ1QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUMxQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxNQUFNLENBQ3RCLENBQUM7b0JBQ0gsSUFBSSxDQUFDLElBQUksRUFBRTt3QkFDVixPQUFPO3FCQUNQO29CQUNELE1BQU0sWUFBWSxHQUFHLENBQUEsSUFBSSxhQUFKLElBQUksdUJBQUosSUFBSSxDQUFFLFdBQVcsS0FBSSxFQUFFLENBQUM7b0JBQzdDLElBQUksZUFBZSxDQUNsQixJQUFJLENBQUMsR0FBRyxFQUNSLElBQUksQ0FBQyxNQUFNLEVBQ1gsSUFBSSxFQUNKLFlBQVksRUFDWixDQUNDLFdBQXVCLEVBQ3ZCLFlBQTRCLEVBQzNCLEVBQUU7d0JBQ0gsTUFBTSxZQUFZLEdBQ2pCLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FDL0MsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssV0FBVyxDQUFDLEVBQUUsQ0FDOUIsQ0FBQzt3QkFDSCxJQUFJLFlBQVksS0FBSyxDQUFDLENBQUMsRUFBRTs0QkFDeEIsc0NBQXNDOzRCQUN0QyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FDckMsWUFBWSxDQUNaLG1DQUNHLFdBQVcsS0FDZCxXQUFXLEVBQUUsWUFBWSxHQUN6QixDQUFDLENBQUMsNENBQTRDOzRCQUMvQyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDOzRCQUMzQixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQzt5QkFDeEI7b0JBQ0YsQ0FBQyxDQUNELENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1YsQ0FBQyxDQUFBLENBQUMsQ0FBQztZQUNKLENBQUMsQ0FBQztpQkFDRCxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFDakIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFO29CQUMxQyxNQUFNLElBQUksR0FDVCxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQzFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLE1BQU0sQ0FDdEIsQ0FBQztvQkFDSCxJQUFJLENBQUMsSUFBSSxFQUFFO3dCQUNWLE9BQU87cUJBQ1A7b0JBQ0Qsb0NBQW9DO29CQUNwQyxJQUFJLGVBQWUsQ0FDbEIsSUFBSSxDQUFDLEdBQUcsRUFDUixJQUFJLENBQUMsTUFBTSxFQUNYLElBQUksRUFBRSx1QkFBdUI7b0JBQzdCLElBQUksRUFBRSx1QkFBdUI7b0JBQzdCLENBQ0MsV0FBdUIsRUFDdkIsWUFBNEIsRUFDM0IsRUFBRTt3QkFDSCxJQUNDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUMzQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxXQUFXLENBQUMsRUFBRSxDQUM5QixFQUNBOzRCQUNELGtDQUFrQzs0QkFDbEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsSUFBSSxpQ0FFdEMsV0FBVyxLQUNkLFdBQVcsRUFBRSxZQUFZLElBRTFCLENBQUM7NEJBQ0YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQzs0QkFDM0IsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7NEJBQzFCLElBQUksTUFBTSxDQUNULENBQUMsQ0FBQyw0QkFBNEIsQ0FBQztnQ0FDOUIsV0FBVyxDQUFDLElBQUksQ0FDakIsQ0FBQzt5QkFDRjs2QkFBTTs0QkFDTixJQUFJLE1BQU0sQ0FDVCxDQUFDLENBQUMsZ0NBQWdDLENBQUMsQ0FDbkMsQ0FBQzt5QkFDRjtvQkFDRixDQUFDLEVBQ0QsSUFBSSxFQUFFLGNBQWM7b0JBQ3BCLElBQUksQ0FBQyxFQUFFLENBQ1AsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDVixDQUFDLENBQUMsQ0FBQztZQUNKLENBQUMsQ0FBQztpQkFDRCxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFDakIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUU7b0JBQ2hELE1BQU0sSUFBSSxHQUNULElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FDMUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssTUFBTSxDQUN0QixDQUFDO29CQUNILElBQUksQ0FBQyxJQUFJLEVBQUU7d0JBQ1YsT0FBTztxQkFDUDtvQkFDRCxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztvQkFDckIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFDM0IsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7Z0JBQzNCLENBQUMsQ0FBQyxDQUFDO1lBQ0osQ0FBQyxDQUFDLENBQUM7WUFFSixJQUNDLENBQUEsTUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQzFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLE1BQU0sQ0FDNUIsMENBQUUsSUFBSSxNQUFLLFFBQVEsRUFDbkI7Z0JBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO29CQUNyQixJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQzt5QkFDeEIsVUFBVSxDQUFDLElBQUksQ0FBQzt5QkFDaEIsT0FBTyxDQUFDLEdBQUcsRUFBRTt3QkFDYixJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUI7NEJBQ3JDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FDNUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssTUFBTSxDQUN0QixDQUFDO3dCQUVILElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUM7d0JBQzNCLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO29CQUMzQixDQUFDLENBQUMsQ0FBQztnQkFDTCxDQUFDLENBQUMsQ0FBQzthQUNIO1lBRUQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFCLENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztJQUVELDZEQUE2RDtJQUM3RCxXQUFXLENBQUMsTUFBZ0I7UUFDM0IsSUFBSSxDQUFDLGFBQWEsR0FBRyxNQUFNLENBQUM7UUFDNUIsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7SUFDekIsQ0FBQztJQUVPLGdCQUFnQjtRQUN2QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDL0QsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ3RCLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsS0FBSyxJQUFJLENBQUMsYUFBYSxFQUFFO2dCQUM3RCxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO2FBQzNCO2lCQUFNO2dCQUNOLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUM7YUFDOUI7UUFDRixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxZQUFZLENBQUMsU0FBa0I7UUFDOUIsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUM7UUFDN0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ3RELENBQUM7SUFFRCxRQUFRO1FBQ1AsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUMxQixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHAsIENvbXBvbmVudCwgTWVudSwgc2V0SWNvbiwgTm90aWNlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuLy8gSW1wb3J0IG5lY2Vzc2FyeSB0eXBlcyBmcm9tIHNldHRpbmdzIGRlZmluaXRpb25cclxuaW1wb3J0IHtcclxuXHRWaWV3Q29uZmlnLFxyXG5cdFZpZXdGaWx0ZXJSdWxlLFxyXG5cdFZpZXdNb2RlLFxyXG5cdGdldFZpZXdTZXR0aW5nT3JEZWZhdWx0LFxyXG59IGZyb20gXCJAL2NvbW1vbi9zZXR0aW5nLWRlZmluaXRpb25cIjtcclxuaW1wb3J0IHsgVEFTS19TUEVDSUZJQ19WSUVXX1RZUEUgfSBmcm9tIFwiQC9wYWdlcy9UYXNrU3BlY2lmaWNWaWV3XCI7XHJcbmltcG9ydCB7IFZpZXdDb25maWdNb2RhbCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay92aWV3L21vZGFscy9WaWV3Q29uZmlnTW9kYWxcIjtcclxuXHJcbi8vIFJlbW92ZSB0aGUgZW51bSBpZiBpdCBleGlzdHMsIHVzZSBWaWV3TW9kZSB0eXBlIGRpcmVjdGx5XHJcbi8vIGV4cG9ydCB0eXBlIFZpZXdNb2RlID0gXCJpbmJveFwiIHwgXCJmb3JlY2FzdFwiIHwgXCJwcm9qZWN0c1wiIHwgXCJ0YWdzXCIgfCBcInJldmlld1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFNpZGViYXJDb21wb25lbnQgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdHByaXZhdGUgY29udGFpbmVyRWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgbmF2RWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblx0cHJpdmF0ZSBhcHA6IEFwcDtcclxuXHRwcml2YXRlIGN1cnJlbnRWaWV3SWQ6IFZpZXdNb2RlID0gXCJpbmJveFwiO1xyXG5cdHByaXZhdGUgaXNDb2xsYXBzZWQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcblx0Ly8gRXZlbnQgaGFuZGxlcnNcclxuXHRwdWJsaWMgb25WaWV3TW9kZUNoYW5nZWQ6ICh2aWV3SWQ6IFZpZXdNb2RlKSA9PiB2b2lkID0gKCkgPT4ge307XHJcblx0cHVibGljIG9uUHJvamVjdFNlbGVjdGVkOiAocHJvamVjdDogc3RyaW5nKSA9PiB2b2lkID0gKCkgPT4ge307XHJcblxyXG5cdGNvbnN0cnVjdG9yKHBhcmVudEVsOiBIVE1MRWxlbWVudCwgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4pIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsID0gcGFyZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInRhc2stc2lkZWJhclwiIH0pO1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0XHR0aGlzLmFwcCA9IHBsdWdpbi5hcHA7XHJcblx0fVxyXG5cclxuXHRvbmxvYWQoKSB7XHJcblx0XHR0aGlzLm5hdkVsID0gdGhpcy5jb250YWluZXJFbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lkZWJhci1uYXZcIiB9KTtcclxuXHRcdHRoaXMucmVuZGVyU2lkZWJhckl0ZW1zKCk7IC8vIEluaXRpYWwgcmVuZGVyXHJcblx0fVxyXG5cclxuXHQvLyBOZXcgbWV0aG9kIHRvIHJlbmRlciBzaWRlYmFyIGl0ZW1zIGR5bmFtaWNhbGx5XHJcblx0cmVuZGVyU2lkZWJhckl0ZW1zKCkge1xyXG5cdFx0dGhpcy5uYXZFbC5lbXB0eSgpOyAvLyBDbGVhciBleGlzdGluZyBpdGVtc1xyXG5cclxuXHRcdC8vIEVuc3VyZSBzZXR0aW5ncyBhcmUgaW5pdGlhbGl6ZWRcclxuXHRcdGlmICghdGhpcy5wbHVnaW4uc2V0dGluZ3Mudmlld0NvbmZpZ3VyYXRpb24pIHtcclxuXHRcdFx0Ly8gVGhpcyBzaG91bGQgaWRlYWxseSBiZSBoYW5kbGVkIGVhcmxpZXIsIGJ1dCBhcyBhIGZhbGxiYWNrOlxyXG5cdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XCJTaWRlYmFyQ29tcG9uZW50OiB2aWV3Q29uZmlndXJhdGlvbiBub3QgaW5pdGlhbGl6ZWQgaW4gc2V0dGluZ3MuXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIOagueaNriByZWdpb24g5bGe5oCn5bCG6KeG5Zu+5YiG5Li66aG26YOo57uE5ZKM5bqV6YOo57uE77yM5ZCM5pe25L+d5oyB5ZCE57uE5YaF55qE6aG65bqPXHJcblx0XHRjb25zdCB0b3BWaWV3czogVmlld0NvbmZpZ1tdID0gW107XHJcblx0XHRjb25zdCBib3R0b21WaWV3czogVmlld0NvbmZpZ1tdID0gW107XHJcblxyXG5cdFx0Ly8g5oyJ54Wn5Y6f5aeL6aG65bqP6YGN5Y6G77yM5qC55o2uIHJlZ2lvbiDliIbnu4RcclxuXHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnZpZXdDb25maWd1cmF0aW9uLmZvckVhY2goKHZpZXdDb25maWcpID0+IHtcclxuXHRcdFx0aWYgKHZpZXdDb25maWcudmlzaWJsZSkge1xyXG5cdFx0XHRcdGlmICh2aWV3Q29uZmlnLnJlZ2lvbiA9PT0gXCJib3R0b21cIikge1xyXG5cdFx0XHRcdFx0Ym90dG9tVmlld3MucHVzaCh2aWV3Q29uZmlnKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0Ly8g6buY6K6k5oiWIFwidG9wXCIg6YO95pS+5Zyo6aG26YOoXHJcblx0XHRcdFx0XHR0b3BWaWV3cy5wdXNoKHZpZXdDb25maWcpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8g5YWI5riy5p+T6aG26YOo6KeG5Zu+77yI5L+d5oyB5Y6f5aeL6aG65bqP77yJXHJcblx0XHR0b3BWaWV3cy5mb3JFYWNoKCh2aWV3Q29uZmlnKSA9PiB7XHJcblx0XHRcdHRoaXMuY3JlYXRlTmF2SXRlbShcclxuXHRcdFx0XHR2aWV3Q29uZmlnLmlkLFxyXG5cdFx0XHRcdHQodmlld0NvbmZpZy5uYW1lKSxcclxuXHRcdFx0XHR2aWV3Q29uZmlnLmljb25cclxuXHRcdFx0KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIOWmguaenOaciemhtumDqOinhuWbvuWSjOW6lemDqOinhuWbvu+8jOa3u+WKoOWIhumalOesplxyXG5cdFx0aWYgKHRvcFZpZXdzLmxlbmd0aCA+IDAgJiYgYm90dG9tVmlld3MubGVuZ3RoID4gMCkge1xyXG5cdFx0XHR0aGlzLmNyZWF0ZU5hdlNwYWNlcigpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIOa4suafk+W6lemDqOinhuWbvu+8iOS/neaMgeWOn+Wni+mhuuW6j++8iVxyXG5cdFx0Ym90dG9tVmlld3MuZm9yRWFjaCgodmlld0NvbmZpZykgPT4ge1xyXG5cdFx0XHR0aGlzLmNyZWF0ZU5hdkl0ZW0oXHJcblx0XHRcdFx0dmlld0NvbmZpZy5pZCxcclxuXHRcdFx0XHR0KHZpZXdDb25maWcubmFtZSksXHJcblx0XHRcdFx0dmlld0NvbmZpZy5pY29uXHJcblx0XHRcdCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBIaWdobGlnaHQgdGhlIGN1cnJlbnRseSBhY3RpdmUgdmlld1xyXG5cdFx0dGhpcy51cGRhdGVBY3RpdmVJdGVtKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNyZWF0ZU5hdlNwYWNlcigpIHtcclxuXHRcdHRoaXMubmF2RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNpZGViYXItbmF2LXNwYWNlclwiIH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVOYXZJdGVtKHZpZXdJZDogVmlld01vZGUsIGxhYmVsOiBzdHJpbmcsIGljb246IHN0cmluZykge1xyXG5cdFx0Y29uc3QgbmF2SXRlbSA9IHRoaXMubmF2RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInNpZGViYXItbmF2LWl0ZW1cIixcclxuXHRcdFx0YXR0cjogeyBcImRhdGEtdmlldy1pZFwiOiB2aWV3SWQgfSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IGljb25FbCA9IG5hdkl0ZW0uY3JlYXRlU3Bhbih7IGNsczogXCJuYXYtaXRlbS1pY29uXCIgfSk7XHJcblx0XHRzZXRJY29uKGljb25FbCwgaWNvbik7XHJcblxyXG5cdFx0bmF2SXRlbS5jcmVhdGVTcGFuKHsgY2xzOiBcIm5hdi1pdGVtLWxhYmVsXCIsIHRleHQ6IGxhYmVsIH0pO1xyXG5cclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChuYXZJdGVtLCBcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0dGhpcy5zZXRWaWV3TW9kZSh2aWV3SWQpO1xyXG5cdFx0XHQvLyBUcmlnZ2VyIHRoZSBldmVudCBmb3IgVGFza1ZpZXcgdG8gaGFuZGxlIHRoZSBzd2l0Y2hcclxuXHRcdFx0aWYgKHRoaXMub25WaWV3TW9kZUNoYW5nZWQpIHtcclxuXHRcdFx0XHR0aGlzLm9uVmlld01vZGVDaGFuZ2VkKHZpZXdJZCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChuYXZJdGVtLCBcImNvbnRleHRtZW51XCIsIChlKSA9PiB7XHJcblx0XHRcdGNvbnN0IG1lbnUgPSBuZXcgTWVudSgpO1xyXG5cdFx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJPcGVuIGluIG5ldyB0YWJcIikpLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc3QgbGVhZiA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWFmKCk7XHJcblx0XHRcdFx0XHRsZWFmLnNldFZpZXdTdGF0ZSh7XHJcblx0XHRcdFx0XHRcdHR5cGU6IFRBU0tfU1BFQ0lGSUNfVklFV19UWVBFLFxyXG5cdFx0XHRcdFx0XHRzdGF0ZToge1xyXG5cdFx0XHRcdFx0XHRcdHZpZXdJZDogdmlld0lkLFxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pXHJcblx0XHRcdFx0LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRcdGl0ZW0uc2V0VGl0bGUodChcIk9wZW4gc2V0dGluZ3NcIikpLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHQvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciBoYWJpdCB2aWV3XHJcblx0XHRcdFx0XHRcdGlmICh2aWV3SWQgPT09IFwiaGFiaXRcIikge1xyXG5cdFx0XHRcdFx0XHRcdC8vIE9wZW4gdGhlIHNldHRpbmdzIHRhYiBhbmQgbmF2aWdhdGUgdG8gaGFiaXQgc2VjdGlvblxyXG5cdFx0XHRcdFx0XHRcdCh0aGlzLmFwcCBhcyBhbnkpLnNldHRpbmcub3BlbigpO1xyXG5cdFx0XHRcdFx0XHRcdCh0aGlzLmFwcCBhcyBhbnkpLnNldHRpbmcub3BlblRhYkJ5SWQodGhpcy5wbHVnaW4ubWFuaWZlc3QuaWQpO1xyXG5cdFx0XHRcdFx0XHRcdC8vIFdhaXQgYSBiaXQgZm9yIHRoZSBzZXR0aW5ncyB0byBvcGVuXHJcblx0XHRcdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRpZiAodGhpcy5wbHVnaW4uc2V0dGluZ1RhYikge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5nVGFiLm9wZW5UYWIoXCJoYWJpdFwiKTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9LCAxMDApO1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0Ly8gTm9ybWFsIGhhbmRsaW5nIGZvciBvdGhlciB2aWV3c1xyXG5cdFx0XHRcdFx0XHRjb25zdCB2aWV3ID1cclxuXHRcdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy52aWV3Q29uZmlndXJhdGlvbi5maW5kKFxyXG5cdFx0XHRcdFx0XHRcdFx0KHYpID0+IHYuaWQgPT09IHZpZXdJZFxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdGlmICghdmlldykge1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRjb25zdCBjdXJyZW50UnVsZXMgPSB2aWV3Py5maWx0ZXJSdWxlcyB8fCB7fTtcclxuXHRcdFx0XHRcdFx0bmV3IFZpZXdDb25maWdNb2RhbChcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0XHRcdFx0XHR2aWV3LFxyXG5cdFx0XHRcdFx0XHRcdGN1cnJlbnRSdWxlcyxcclxuXHRcdFx0XHRcdFx0XHQoXHJcblx0XHRcdFx0XHRcdFx0XHR1cGRhdGVkVmlldzogVmlld0NvbmZpZyxcclxuXHRcdFx0XHRcdFx0XHRcdHVwZGF0ZWRSdWxlczogVmlld0ZpbHRlclJ1bGVcclxuXHRcdFx0XHRcdFx0XHQpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IGN1cnJlbnRJbmRleCA9XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnZpZXdDb25maWd1cmF0aW9uLmZpbmRJbmRleChcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQodikgPT4gdi5pZCA9PT0gdXBkYXRlZFZpZXcuaWRcclxuXHRcdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdGlmIChjdXJyZW50SW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdC8vIFVwZGF0ZSB0aGUgdmlldyBjb25maWcgaW4gdGhlIGFycmF5XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnZpZXdDb25maWd1cmF0aW9uW1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGN1cnJlbnRJbmRleFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRdID0ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdC4uLnVwZGF0ZWRWaWV3LFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGZpbHRlclJ1bGVzOiB1cGRhdGVkUnVsZXMsXHJcblx0XHRcdFx0XHRcdFx0XHRcdH07IC8vIEVuc3VyZSBydWxlcyBhcmUgc2F2ZWQgYmFjayB0byB2aWV3Q29uZmlnXHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnVwZGF0ZUFjdGl2ZUl0ZW0oKTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdCkub3BlbigpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSlcclxuXHRcdFx0XHQuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRcdFx0aXRlbS5zZXRUaXRsZSh0KFwiQ29weSB2aWV3XCIpKS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgdmlldyA9XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3Mudmlld0NvbmZpZ3VyYXRpb24uZmluZChcclxuXHRcdFx0XHRcdFx0XHRcdCh2KSA9PiB2LmlkID09PSB2aWV3SWRcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRpZiAoIXZpZXcpIHtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0Ly8gQ3JlYXRlIGEgY29weSBvZiB0aGUgY3VycmVudCB2aWV3XHJcblx0XHRcdFx0XHRcdG5ldyBWaWV3Q29uZmlnTW9kYWwoXHJcblx0XHRcdFx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdFx0XHRcdFx0bnVsbCwgLy8gbnVsbCBmb3IgY3JlYXRlIG1vZGVcclxuXHRcdFx0XHRcdFx0XHRudWxsLCAvLyBudWxsIGZvciBjcmVhdGUgbW9kZVxyXG5cdFx0XHRcdFx0XHRcdChcclxuXHRcdFx0XHRcdFx0XHRcdGNyZWF0ZWRWaWV3OiBWaWV3Q29uZmlnLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y3JlYXRlZFJ1bGVzOiBWaWV3RmlsdGVyUnVsZVxyXG5cdFx0XHRcdFx0XHRcdCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHQhdGhpcy5wbHVnaW4uc2V0dGluZ3Mudmlld0NvbmZpZ3VyYXRpb24uc29tZShcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQodikgPT4gdi5pZCA9PT0gY3JlYXRlZFZpZXcuaWRcclxuXHRcdFx0XHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdC8vIFNhdmUgd2l0aCBmaWx0ZXIgcnVsZXMgZW1iZWRkZWRcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3Mudmlld0NvbmZpZ3VyYXRpb24ucHVzaChcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQuLi5jcmVhdGVkVmlldyxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGZpbHRlclJ1bGVzOiBjcmVhdGVkUnVsZXMsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5yZW5kZXJTaWRlYmFySXRlbXMoKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0bmV3IE5vdGljZShcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0KFwiVmlldyBjb3BpZWQgc3VjY2Vzc2Z1bGx5OiBcIikgK1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y3JlYXRlZFZpZXcubmFtZVxyXG5cdFx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0bmV3IE5vdGljZShcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0KFwiRXJyb3I6IFZpZXcgSUQgYWxyZWFkeSBleGlzdHMuXCIpXHJcblx0XHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHR2aWV3LCAvLyDkvKDlhaXlvZPliY3op4blm77kvZzkuLrmi7fotJ3mupBcclxuXHRcdFx0XHRcdFx0XHR2aWV3LmlkXHJcblx0XHRcdFx0XHRcdCkub3BlbigpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSlcclxuXHRcdFx0XHQuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRcdFx0aXRlbS5zZXRUaXRsZSh0KFwiSGlkZSBpbiBzaWRlYmFyXCIpKS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgdmlldyA9XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3Mudmlld0NvbmZpZ3VyYXRpb24uZmluZChcclxuXHRcdFx0XHRcdFx0XHRcdCh2KSA9PiB2LmlkID09PSB2aWV3SWRcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRpZiAoIXZpZXcpIHtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0dmlldy52aXNpYmxlID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdFx0XHR0aGlzLnJlbmRlclNpZGViYXJJdGVtcygpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3Mudmlld0NvbmZpZ3VyYXRpb24uZmluZChcclxuXHRcdFx0XHRcdCh2aWV3KSA9PiB2aWV3LmlkID09PSB2aWV3SWRcclxuXHRcdFx0XHQpPy50eXBlID09PSBcImN1c3RvbVwiXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRcdFx0aXRlbS5zZXRUaXRsZSh0KFwiRGVsZXRlXCIpKVxyXG5cdFx0XHRcdFx0XHQuc2V0V2FybmluZyh0cnVlKVxyXG5cdFx0XHRcdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3Mudmlld0NvbmZpZ3VyYXRpb24gPVxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3Mudmlld0NvbmZpZ3VyYXRpb24uZmlsdGVyKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHQodikgPT4gdi5pZCAhPT0gdmlld0lkXHJcblx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnJlbmRlclNpZGViYXJJdGVtcygpO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0bWVudS5zaG93QXRNb3VzZUV2ZW50KGUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIG5hdkl0ZW07XHJcblx0fVxyXG5cclxuXHQvLyBVcGRhdGVkIHNldFZpZXdNb2RlIHRvIGFjY2VwdCBWaWV3TW9kZSB0eXBlIGFuZCB1c2Ugdmlld0lkXHJcblx0c2V0Vmlld01vZGUodmlld0lkOiBWaWV3TW9kZSkge1xyXG5cdFx0dGhpcy5jdXJyZW50Vmlld0lkID0gdmlld0lkO1xyXG5cdFx0dGhpcy51cGRhdGVBY3RpdmVJdGVtKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHVwZGF0ZUFjdGl2ZUl0ZW0oKSB7XHJcblx0XHRjb25zdCBpdGVtcyA9IHRoaXMubmF2RWwucXVlcnlTZWxlY3RvckFsbChcIi5zaWRlYmFyLW5hdi1pdGVtXCIpO1xyXG5cdFx0aXRlbXMuZm9yRWFjaCgoaXRlbSkgPT4ge1xyXG5cdFx0XHRpZiAoaXRlbS5nZXRBdHRyaWJ1dGUoXCJkYXRhLXZpZXctaWRcIikgPT09IHRoaXMuY3VycmVudFZpZXdJZCkge1xyXG5cdFx0XHRcdGl0ZW0uYWRkQ2xhc3MoXCJpcy1hY3RpdmVcIik7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0aXRlbS5yZW1vdmVDbGFzcyhcImlzLWFjdGl2ZVwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRzZXRDb2xsYXBzZWQoY29sbGFwc2VkOiBib29sZWFuKSB7XHJcblx0XHR0aGlzLmlzQ29sbGFwc2VkID0gY29sbGFwc2VkO1xyXG5cdFx0dGhpcy5jb250YWluZXJFbC50b2dnbGVDbGFzcyhcImNvbGxhcHNlZFwiLCBjb2xsYXBzZWQpO1xyXG5cdH1cclxuXHJcblx0b251bmxvYWQoKSB7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLmVtcHR5KCk7XHJcblx0fVxyXG59XHJcbiJdfQ==