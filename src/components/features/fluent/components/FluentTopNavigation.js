import { __awaiter } from "tslib";
import { setIcon, Menu, Notice, SearchComponent, Component, } from "obsidian";
import { t } from "@/translations/helper";
export class TopNavigation extends Component {
    constructor(containerEl, plugin, onSearch, onViewModeChange, onFilterClick, onSortClick, onSettingsClick, availableModes, onToggleSidebar) {
        super();
        this.onSearch = onSearch;
        this.onViewModeChange = onViewModeChange;
        this.onFilterClick = onFilterClick;
        this.onSortClick = onSortClick;
        this.onSettingsClick = onSettingsClick;
        this.onToggleSidebar = onToggleSidebar;
        this.currentViewMode = "list";
        this.notificationCount = 0;
        this.availableModes = ["list", "kanban", "tree", "calendar"];
        this.viewTabsContainer = null;
        this.containerEl = containerEl;
        this.plugin = plugin;
        if (availableModes) {
            this.availableModes = availableModes;
            // Ensure current mode is valid
            if (!this.availableModes.includes(this.currentViewMode)) {
                this.currentViewMode = this.availableModes[0] || "list";
            }
        }
        this.updateNotificationCount();
        this.render();
    }
    updateNotificationCount() {
        return __awaiter(this, void 0, void 0, function* () {
            let tasks = [];
            if (this.plugin.dataflowOrchestrator) {
                const queryAPI = this.plugin.dataflowOrchestrator.getQueryAPI();
                tasks = yield queryAPI.getAllTasks();
            }
            else {
                tasks = this.plugin.preloadedTasks || [];
            }
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            this.notificationCount = tasks.filter((task) => {
                var _a;
                if (task.completed)
                    return false;
                const dueDate = ((_a = task.metadata) === null || _a === void 0 ? void 0 : _a.dueDate)
                    ? new Date(task.metadata.dueDate)
                    : null;
                return dueDate && dueDate <= today;
            }).length;
            this.updateNotificationBadge();
        });
    }
    render() {
        this.containerEl.empty();
        this.containerEl.addClass("fluent-top-navigation");
        // Hide entire navigation if no view modes are available
        if (this.availableModes.length === 0) {
            this.containerEl.style.display = "none";
            return;
        }
        // Show navigation when modes are available
        this.containerEl.style.display = "";
        // Left section - Hamburger menu (mobile) and Search
        const leftSection = this.containerEl.createDiv({
            cls: "fluent-nav-left",
        });
        const searchContainer = leftSection.createDiv({
            cls: "fluent-search-container",
        });
        new SearchComponent(searchContainer)
            .setPlaceholder(t("Search tasks, projects ..."))
            .onChange((value) => {
            this.onSearch(value);
        });
        // Center section - View mode tabs
        const centerSection = this.containerEl.createDiv({
            cls: "fluent-nav-center",
        });
        // Render view tabs (we know modes are available at this point)
        this.viewTabsContainer = centerSection.createDiv({
            cls: "fluent-view-tabs",
        });
        this.renderViewTabs();
        // Right section - Notifications and Settings
        const rightSection = this.containerEl.createDiv({
            cls: "fluent-nav-right",
        });
        // Notification button
        const notificationBtn = rightSection.createDiv({
            cls: "fluent-nav-icon-button",
        });
        setIcon(notificationBtn, "bell");
        const badge = notificationBtn.createDiv({
            cls: "fluent-notification-badge",
            text: String(this.notificationCount),
        });
        if (this.notificationCount === 0) {
            badge.hide();
        }
        notificationBtn.addEventListener("click", (e) => this.showNotifications(e));
        // Settings button
        const settingsBtn = rightSection.createDiv({
            cls: "fluent-nav-icon-button",
        });
        setIcon(settingsBtn, "settings");
        settingsBtn.addEventListener("click", () => this.onSettingsClick());
    }
    createViewTab(container, mode, icon, label) {
        const tab = container.createEl("button", {
            cls: ["fluent-view-tab", "clickable-icon"],
            attr: { "data-mode": mode },
        });
        if (mode === this.currentViewMode) {
            tab.addClass("is-active");
        }
        setIcon(tab.createDiv({ cls: "fluent-view-tab-icon" }), icon);
        tab.createSpan({ text: label });
        tab.addEventListener("click", () => {
            this.setViewMode(mode);
            this.onViewModeChange(mode);
        });
    }
    setViewMode(mode) {
        this.currentViewMode = mode;
        this.containerEl.querySelectorAll(".fluent-view-tab").forEach((tab) => {
            tab.removeClass("is-active");
        });
        const activeTab = this.containerEl.querySelector(`[data-mode="${mode}"]`);
        if (activeTab) {
            activeTab.addClass("is-active");
        }
    }
    showNotifications(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const menu = new Menu();
            let tasks = [];
            if (this.plugin.dataflowOrchestrator) {
                const queryAPI = this.plugin.dataflowOrchestrator.getQueryAPI();
                tasks = yield queryAPI.getAllTasks();
            }
            else {
                tasks = this.plugin.preloadedTasks || [];
            }
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const overdueTasks = tasks
                .filter((task) => {
                var _a;
                if (task.completed)
                    return false;
                const dueDate = ((_a = task.metadata) === null || _a === void 0 ? void 0 : _a.dueDate)
                    ? new Date(task.metadata.dueDate)
                    : null;
                return dueDate && dueDate <= today;
            })
                .slice(0, 10);
            if (overdueTasks.length === 0) {
                menu.addItem((item) => {
                    item.setTitle("No overdue tasks").setDisabled(true);
                });
            }
            else {
                menu.addItem((item) => {
                    item.setTitle(`${overdueTasks.length} overdue tasks`).setDisabled(true);
                });
                menu.addSeparator();
                overdueTasks.forEach((task) => {
                    menu.addItem((item) => {
                        item.setTitle(task.content || t("Untitled task"))
                            .setIcon("alert-circle")
                            .onClick(() => {
                            new Notice(t("Task: {{content}}", {
                                content: task.content || "",
                            }));
                        });
                    });
                });
            }
            menu.showAtMouseEvent(event);
        });
    }
    updateNotificationBadge() {
        const badge = this.containerEl.querySelector(".fluent-notification-badge");
        if (badge instanceof HTMLElement) {
            badge.textContent = String(this.notificationCount);
            if (this.notificationCount === 0) {
                badge.hide();
            }
            else {
                badge.show();
            }
        }
    }
    refresh() {
        this.updateNotificationCount();
    }
    getSearchQuery() {
        var _a;
        return ((_a = this.searchInput) === null || _a === void 0 ? void 0 : _a.value) || "";
    }
    clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = "";
            this.onSearch("");
        }
    }
    renderViewTabs() {
        if (!this.viewTabsContainer)
            return;
        this.viewTabsContainer.empty();
        const modeConfig = {
            list: { icon: "list", label: "List" },
            kanban: { icon: "layout-grid", label: "Kanban" },
            tree: { icon: "git-branch", label: "Tree" },
            calendar: { icon: "calendar", label: "Calendar" },
        };
        for (const mode of this.availableModes) {
            const config = modeConfig[mode];
            if (config) {
                this.createViewTab(this.viewTabsContainer, mode, config.icon, config.label);
            }
        }
    }
    updateAvailableModes(modes) {
        this.availableModes = modes;
        // Hide entire navigation if no modes available
        if (modes.length === 0) {
            this.containerEl.style.display = "none";
            return;
        }
        // Show navigation when modes are available
        this.containerEl.style.display = "";
        // If current mode is no longer available, switch to first available mode
        if (!modes.includes(this.currentViewMode)) {
            this.currentViewMode = modes[0];
            // Notify about the mode change
            this.onViewModeChange(this.currentViewMode);
        }
        // Update center section visibility (this should always be visible now since we handle empty modes above)
        const centerSection = this.containerEl.querySelector(".fluent-nav-center");
        if (centerSection) {
            centerSection.style.display = "";
            // Re-render the view tabs
            if (!this.viewTabsContainer) {
                this.viewTabsContainer = centerSection.createDiv({
                    cls: "fluent-view-tabs",
                });
            }
            this.renderViewTabs();
        }
    }
    getCurrentViewMode() {
        return this.currentViewMode;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmx1ZW50VG9wTmF2aWdhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkZsdWVudFRvcE5hdmlnYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFDTixPQUFPLEVBQ1AsSUFBSSxFQUNKLE1BQU0sRUFDTixlQUFlLEVBRWYsU0FBUyxHQUNULE1BQU0sVUFBVSxDQUFDO0FBR2xCLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUkxQyxNQUFNLE9BQU8sYUFBYyxTQUFRLFNBQVM7SUFTM0MsWUFDQyxXQUF3QixFQUN4QixNQUE2QixFQUNyQixRQUFpQyxFQUNqQyxnQkFBMEMsRUFDMUMsYUFBeUIsRUFDekIsV0FBdUIsRUFDdkIsZUFBMkIsRUFDbkMsY0FBMkIsRUFDbkIsZUFBNEI7UUFFcEMsS0FBSyxFQUFFLENBQUM7UUFSQSxhQUFRLEdBQVIsUUFBUSxDQUF5QjtRQUNqQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQTBCO1FBQzFDLGtCQUFhLEdBQWIsYUFBYSxDQUFZO1FBQ3pCLGdCQUFXLEdBQVgsV0FBVyxDQUFZO1FBQ3ZCLG9CQUFlLEdBQWYsZUFBZSxDQUFZO1FBRTNCLG9CQUFlLEdBQWYsZUFBZSxDQUFhO1FBZDdCLG9CQUFlLEdBQWEsTUFBTSxDQUFDO1FBQ25DLHNCQUFpQixHQUFHLENBQUMsQ0FBQztRQUN0QixtQkFBYyxHQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDcEUsc0JBQWlCLEdBQXVCLElBQUksQ0FBQztRQWNwRCxJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztRQUMvQixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLGNBQWMsRUFBRTtZQUNuQixJQUFJLENBQUMsY0FBYyxHQUFHLGNBQWMsQ0FBQztZQUNyQywrQkFBK0I7WUFDL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFj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dEI7SUFDRixDQUFDO0lBRU0sa0JBQWtCO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQztJQUM3QixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xyXG5cdHNldEljb24sXHJcblx0TWVudSxcclxuXHROb3RpY2UsXHJcblx0U2VhcmNoQ29tcG9uZW50LFxyXG5cdFBsYXRmb3JtLFxyXG5cdENvbXBvbmVudCxcclxufSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5pbXBvcnQgeyBUYXNrIH0gZnJvbSBcIkAvdHlwZXMvdGFza1wiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5cclxuZXhwb3J0IHR5cGUgVmlld01vZGUgPSBcImxpc3RcIiB8IFwia2FuYmFuXCIgfCBcInRyZWVcIiB8IFwiY2FsZW5kYXJcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBUb3BOYXZpZ2F0aW9uIGV4dGVuZHMgQ29tcG9uZW50IHtcclxuXHRwcml2YXRlIGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luO1xyXG5cdHByaXZhdGUgc2VhcmNoSW5wdXQ6IEhUTUxJbnB1dEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBjdXJyZW50Vmlld01vZGU6IFZpZXdNb2RlID0gXCJsaXN0XCI7XHJcblx0cHJpdmF0ZSBub3RpZmljYXRpb25Db3VudCA9IDA7XHJcblx0cHJpdmF0ZSBhdmFpbGFibGVNb2RlczogVmlld01vZGVbXSA9IFtcImxpc3RcIiwgXCJrYW5iYW5cIiwgXCJ0cmVlXCIsIFwiY2FsZW5kYXJcIl07XHJcblx0cHJpdmF0ZSB2aWV3VGFic0NvbnRhaW5lcjogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRjb250YWluZXJFbDogSFRNTEVsZW1lbnQsXHJcblx0XHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdHByaXZhdGUgb25TZWFyY2g6IChxdWVyeTogc3RyaW5nKSA9PiB2b2lkLFxyXG5cdFx0cHJpdmF0ZSBvblZpZXdNb2RlQ2hhbmdlOiAobW9kZTogVmlld01vZGUpID0+IHZvaWQsXHJcblx0XHRwcml2YXRlIG9uRmlsdGVyQ2xpY2s6ICgpID0+IHZvaWQsXHJcblx0XHRwcml2YXRlIG9uU29ydENsaWNrOiAoKSA9PiB2b2lkLFxyXG5cdFx0cHJpdmF0ZSBvblNldHRpbmdzQ2xpY2s6ICgpID0+IHZvaWQsXHJcblx0XHRhdmFpbGFibGVNb2Rlcz86IFZpZXdNb2RlW10sXHJcblx0XHRwcml2YXRlIG9uVG9nZ2xlU2lkZWJhcj86ICgpID0+IHZvaWRcclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsID0gY29udGFpbmVyRWw7XHJcblx0XHR0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuXHRcdGlmIChhdmFpbGFibGVNb2Rlcykge1xyXG5cdFx0XHR0aGlzLmF2YWlsYWJsZU1vZGVzID0gYXZhaWxhYmxlTW9kZXM7XHJcblx0XHRcdC8vIEVuc3VyZSBjdXJyZW50IG1vZGUgaXMgdmFsaWRcclxuXHRcdFx0aWYgKCF0aGlzLmF2YWlsYWJsZU1vZGVzLmluY2x1ZGVzKHRoaXMuY3VycmVudFZpZXdNb2RlKSkge1xyXG5cdFx0XHRcdHRoaXMuY3VycmVudFZpZXdNb2RlID0gdGhpcy5hdmFpbGFibGVNb2Rlc1swXSB8fCBcImxpc3RcIjtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMudXBkYXRlTm90aWZpY2F0aW9uQ291bnQoKTtcclxuXHRcdHRoaXMucmVuZGVyKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIHVwZGF0ZU5vdGlmaWNhdGlvbkNvdW50KCkge1xyXG5cdFx0bGV0IHRhc2tzOiBUYXNrW10gPSBbXTtcclxuXHRcdGlmICh0aGlzLnBsdWdpbi5kYXRhZmxvd09yY2hlc3RyYXRvcikge1xyXG5cdFx0XHRjb25zdCBxdWVyeUFQSSA9IHRoaXMucGx1Z2luLmRhdGFmbG93T3JjaGVzdHJhdG9yLmdldFF1ZXJ5QVBJKCk7XHJcblx0XHRcdHRhc2tzID0gYXdhaXQgcXVlcnlBUEkuZ2V0QWxsVGFza3MoKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRhc2tzID0gdGhpcy5wbHVnaW4ucHJlbG9hZGVkVGFza3MgfHwgW107XHJcblx0XHR9XHJcblx0XHRjb25zdCB0b2RheSA9IG5ldyBEYXRlKCk7XHJcblx0XHR0b2RheS5zZXRIb3VycygwLCAwLCAwLCAwKTtcclxuXHJcblx0XHR0aGlzLm5vdGlmaWNhdGlvbkNvdW50ID0gdGFza3MuZmlsdGVyKCh0YXNrOiBUYXNrKSA9PiB7XHJcblx0XHRcdGlmICh0YXNrLmNvbXBsZXRlZCkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRjb25zdCBkdWVEYXRlID0gdGFzay5tZXRhZGF0YT8uZHVlRGF0ZVxyXG5cdFx0XHRcdD8gbmV3IERhdGUodGFzay5tZXRhZGF0YS5kdWVEYXRlKVxyXG5cdFx0XHRcdDogbnVsbDtcclxuXHRcdFx0cmV0dXJuIGR1ZURhdGUgJiYgZHVlRGF0ZSA8PSB0b2RheTtcclxuXHRcdH0pLmxlbmd0aDtcclxuXHJcblx0XHR0aGlzLnVwZGF0ZU5vdGlmaWNhdGlvbkJhZGdlKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbmRlcigpIHtcclxuXHRcdHRoaXMuY29udGFpbmVyRWwuZW1wdHkoKTtcclxuXHRcdHRoaXMuY29udGFpbmVyRWwuYWRkQ2xhc3MoXCJmbHVlbnQtdG9wLW5hdmlnYXRpb25cIik7XHJcblxyXG5cdFx0Ly8gSGlkZSBlbnRpcmUgbmF2aWdhdGlvbiBpZiBubyB2aWV3IG1vZGVzIGFyZSBhdmFpbGFibGVcclxuXHRcdGlmICh0aGlzLmF2YWlsYWJsZU1vZGVzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHR0aGlzLmNvbnRhaW5lckVsLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFNob3cgbmF2aWdhdGlvbiB3aGVuIG1vZGVzIGFyZSBhdmFpbGFibGVcclxuXHRcdHRoaXMuY29udGFpbmVyRWwuc3R5bGUuZGlzcGxheSA9IFwiXCI7XHJcblxyXG5cdFx0Ly8gTGVmdCBzZWN0aW9uIC0gSGFtYnVyZ2VyIG1lbnUgKG1vYmlsZSkgYW5kIFNlYXJjaFxyXG5cdFx0Y29uc3QgbGVmdFNlY3Rpb24gPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmbHVlbnQtbmF2LWxlZnRcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IHNlYXJjaENvbnRhaW5lciA9IGxlZnRTZWN0aW9uLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmbHVlbnQtc2VhcmNoLWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0bmV3IFNlYXJjaENvbXBvbmVudChzZWFyY2hDb250YWluZXIpXHJcblx0XHRcdC5zZXRQbGFjZWhvbGRlcih0KFwiU2VhcmNoIHRhc2tzLCBwcm9qZWN0cyAuLi5cIikpXHJcblx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHR0aGlzLm9uU2VhcmNoKHZhbHVlKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ2VudGVyIHNlY3Rpb24gLSBWaWV3IG1vZGUgdGFic1xyXG5cdFx0Y29uc3QgY2VudGVyU2VjdGlvbiA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZsdWVudC1uYXYtY2VudGVyXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBSZW5kZXIgdmlldyB0YWJzICh3ZSBrbm93IG1vZGVzIGFyZSBhdmFpbGFibGUgYXQgdGhpcyBwb2ludClcclxuXHRcdHRoaXMudmlld1RhYnNDb250YWluZXIgPSBjZW50ZXJTZWN0aW9uLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmbHVlbnQtdmlldy10YWJzXCIsXHJcblx0XHR9KTtcclxuXHRcdHRoaXMucmVuZGVyVmlld1RhYnMoKTtcclxuXHJcblx0XHQvLyBSaWdodCBzZWN0aW9uIC0gTm90aWZpY2F0aW9ucyBhbmQgU2V0dGluZ3NcclxuXHRcdGNvbnN0IHJpZ2h0U2VjdGlvbiA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZsdWVudC1uYXYtcmlnaHRcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIE5vdGlmaWNhdGlvbiBidXR0b25cclxuXHRcdGNvbnN0IG5vdGlmaWNhdGlvbkJ0biA9IHJpZ2h0U2VjdGlvbi5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZmx1ZW50LW5hdi1pY29uLWJ1dHRvblwiLFxyXG5cdFx0fSk7XHJcblx0XHRzZXRJY29uKG5vdGlmaWNhdGlvbkJ0biwgXCJiZWxsXCIpO1xyXG5cdFx0Y29uc3QgYmFkZ2UgPSBub3RpZmljYXRpb25CdG4uY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZsdWVudC1ub3RpZmljYXRpb24tYmFkZ2VcIixcclxuXHRcdFx0dGV4dDogU3RyaW5nKHRoaXMubm90aWZpY2F0aW9uQ291bnQpLFxyXG5cdFx0fSk7XHJcblx0XHRpZiAodGhpcy5ub3RpZmljYXRpb25Db3VudCA9PT0gMCkge1xyXG5cdFx0XHRiYWRnZS5oaWRlKCk7XHJcblx0XHR9XHJcblx0XHRub3RpZmljYXRpb25CdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChlKSA9PlxyXG5cdFx0XHR0aGlzLnNob3dOb3RpZmljYXRpb25zKGUpXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIFNldHRpbmdzIGJ1dHRvblxyXG5cdFx0Y29uc3Qgc2V0dGluZ3NCdG4gPSByaWdodFNlY3Rpb24uY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZsdWVudC1uYXYtaWNvbi1idXR0b25cIixcclxuXHRcdH0pO1xyXG5cdFx0c2V0SWNvbihzZXR0aW5nc0J0biwgXCJzZXR0aW5nc1wiKTtcclxuXHRcdHNldHRpbmdzQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLm9uU2V0dGluZ3NDbGljaygpKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY3JlYXRlVmlld1RhYihcclxuXHRcdGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXHJcblx0XHRtb2RlOiBWaWV3TW9kZSxcclxuXHRcdGljb246IHN0cmluZyxcclxuXHRcdGxhYmVsOiBzdHJpbmdcclxuXHQpIHtcclxuXHRcdGNvbnN0IHRhYiA9IGNvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdGNsczogW1wiZmx1ZW50LXZpZXctdGFiXCIsIFwiY2xpY2thYmxlLWljb25cIl0sXHJcblx0XHRcdGF0dHI6IHsgXCJkYXRhLW1vZGVcIjogbW9kZSB9LFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0aWYgKG1vZGUgPT09IHRoaXMuY3VycmVudFZpZXdNb2RlKSB7XHJcblx0XHRcdHRhYi5hZGRDbGFzcyhcImlzLWFjdGl2ZVwiKTtcclxuXHRcdH1cclxuXHJcblx0XHRzZXRJY29uKHRhYi5jcmVhdGVEaXYoeyBjbHM6IFwiZmx1ZW50LXZpZXctdGFiLWljb25cIiB9KSwgaWNvbik7XHJcblx0XHR0YWIuY3JlYXRlU3Bhbih7IHRleHQ6IGxhYmVsIH0pO1xyXG5cclxuXHRcdHRhYi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHR0aGlzLnNldFZpZXdNb2RlKG1vZGUpO1xyXG5cdFx0XHR0aGlzLm9uVmlld01vZGVDaGFuZ2UobW9kZSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc2V0Vmlld01vZGUobW9kZTogVmlld01vZGUpIHtcclxuXHRcdHRoaXMuY3VycmVudFZpZXdNb2RlID0gbW9kZTtcclxuXHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoXCIuZmx1ZW50LXZpZXctdGFiXCIpLmZvckVhY2goKHRhYikgPT4ge1xyXG5cdFx0XHR0YWIucmVtb3ZlQ2xhc3MoXCJpcy1hY3RpdmVcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCBhY3RpdmVUYWIgPSB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdGBbZGF0YS1tb2RlPVwiJHttb2RlfVwiXWBcclxuXHRcdCk7XHJcblx0XHRpZiAoYWN0aXZlVGFiKSB7XHJcblx0XHRcdGFjdGl2ZVRhYi5hZGRDbGFzcyhcImlzLWFjdGl2ZVwiKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgc2hvd05vdGlmaWNhdGlvbnMoZXZlbnQ6IE1vdXNlRXZlbnQpIHtcclxuXHRcdGNvbnN0IG1lbnUgPSBuZXcgTWVudSgpO1xyXG5cclxuXHRcdGxldCB0YXNrczogVGFza1tdID0gW107XHJcblx0XHRpZiAodGhpcy5wbHVnaW4uZGF0YWZsb3dPcmNoZXN0cmF0b3IpIHtcclxuXHRcdFx0Y29uc3QgcXVlcnlBUEkgPSB0aGlzLnBsdWdpbi5kYXRhZmxvd09yY2hlc3RyYXRvci5nZXRRdWVyeUFQSSgpO1xyXG5cdFx0XHR0YXNrcyA9IGF3YWl0IHF1ZXJ5QVBJLmdldEFsbFRhc2tzKCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0YXNrcyA9IHRoaXMucGx1Z2luLnByZWxvYWRlZFRhc2tzIHx8IFtdO1xyXG5cdFx0fVxyXG5cdFx0Y29uc3QgdG9kYXkgPSBuZXcgRGF0ZSgpO1xyXG5cdFx0dG9kYXkuc2V0SG91cnMoMCwgMCwgMCwgMCk7XHJcblxyXG5cdFx0Y29uc3Qgb3ZlcmR1ZVRhc2tzID0gdGFza3NcclxuXHRcdFx0LmZpbHRlcigodGFzazogVGFzaykgPT4ge1xyXG5cdFx0XHRcdGlmICh0YXNrLmNvbXBsZXRlZCkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdGNvbnN0IGR1ZURhdGUgPSB0YXNrLm1ldGFkYXRhPy5kdWVEYXRlXHJcblx0XHRcdFx0XHQ/IG5ldyBEYXRlKHRhc2subWV0YWRhdGEuZHVlRGF0ZSlcclxuXHRcdFx0XHRcdDogbnVsbDtcclxuXHRcdFx0XHRyZXR1cm4gZHVlRGF0ZSAmJiBkdWVEYXRlIDw9IHRvZGF5O1xyXG5cdFx0XHR9KVxyXG5cdFx0XHQuc2xpY2UoMCwgMTApO1xyXG5cclxuXHRcdGlmIChvdmVyZHVlVGFza3MubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRcdGl0ZW0uc2V0VGl0bGUoXCJObyBvdmVyZHVlIHRhc2tzXCIpLnNldERpc2FibGVkKHRydWUpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRcdGl0ZW0uc2V0VGl0bGUoXHJcblx0XHRcdFx0XHRgJHtvdmVyZHVlVGFza3MubGVuZ3RofSBvdmVyZHVlIHRhc2tzYFxyXG5cdFx0XHRcdCkuc2V0RGlzYWJsZWQodHJ1ZSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0bWVudS5hZGRTZXBhcmF0b3IoKTtcclxuXHJcblx0XHRcdG92ZXJkdWVUYXNrcy5mb3JFYWNoKCh0YXNrKSA9PiB7XHJcblx0XHRcdFx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdFx0XHRpdGVtLnNldFRpdGxlKHRhc2suY29udGVudCB8fCB0KFwiVW50aXRsZWQgdGFza1wiKSlcclxuXHRcdFx0XHRcdFx0LnNldEljb24oXCJhbGVydC1jaXJjbGVcIilcclxuXHRcdFx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdG5ldyBOb3RpY2UoXHJcblx0XHRcdFx0XHRcdFx0XHR0KFwiVGFzazoge3tjb250ZW50fX1cIiwge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRjb250ZW50OiB0YXNrLmNvbnRlbnQgfHwgXCJcIixcclxuXHRcdFx0XHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdG1lbnUuc2hvd0F0TW91c2VFdmVudChldmVudCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHVwZGF0ZU5vdGlmaWNhdGlvbkJhZGdlKCkge1xyXG5cdFx0Y29uc3QgYmFkZ2UgPSB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFwiLmZsdWVudC1ub3RpZmljYXRpb24tYmFkZ2VcIlxyXG5cdFx0KTtcclxuXHRcdGlmIChiYWRnZSBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XHJcblx0XHRcdGJhZGdlLnRleHRDb250ZW50ID0gU3RyaW5nKHRoaXMubm90aWZpY2F0aW9uQ291bnQpO1xyXG5cdFx0XHRpZiAodGhpcy5ub3RpZmljYXRpb25Db3VudCA9PT0gMCkge1xyXG5cdFx0XHRcdGJhZGdlLmhpZGUoKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRiYWRnZS5zaG93KCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHB1YmxpYyByZWZyZXNoKCkge1xyXG5cdFx0dGhpcy51cGRhdGVOb3RpZmljYXRpb25Db3VudCgpO1xyXG5cdH1cclxuXHJcblx0cHVibGljIGdldFNlYXJjaFF1ZXJ5KCk6IHN0cmluZyB7XHJcblx0XHRyZXR1cm4gdGhpcy5zZWFyY2hJbnB1dD8udmFsdWUgfHwgXCJcIjtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBjbGVhclNlYXJjaCgpIHtcclxuXHRcdGlmICh0aGlzLnNlYXJjaElucHV0KSB7XHJcblx0XHRcdHRoaXMuc2VhcmNoSW5wdXQudmFsdWUgPSBcIlwiO1xyXG5cdFx0XHR0aGlzLm9uU2VhcmNoKFwiXCIpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSByZW5kZXJWaWV3VGFicygpIHtcclxuXHRcdGlmICghdGhpcy52aWV3VGFic0NvbnRhaW5lcikgcmV0dXJuO1xyXG5cclxuXHRcdHRoaXMudmlld1RhYnNDb250YWluZXIuZW1wdHkoKTtcclxuXHJcblx0XHRjb25zdCBtb2RlQ29uZmlnOiBSZWNvcmQ8Vmlld01vZGUsIHsgaWNvbjogc3RyaW5nOyBsYWJlbDogc3RyaW5nIH0+ID0ge1xyXG5cdFx0XHRsaXN0OiB7IGljb246IFwibGlzdFwiLCBsYWJlbDogXCJMaXN0XCIgfSxcclxuXHRcdFx0a2FuYmFuOiB7IGljb246IFwibGF5b3V0LWdyaWRcIiwgbGFiZWw6IFwiS2FuYmFuXCIgfSxcclxuXHRcdFx0dHJlZTogeyBpY29uOiBcImdpdC1icmFuY2hcIiwgbGFiZWw6IFwiVHJlZVwiIH0sXHJcblx0XHRcdGNhbGVuZGFyOiB7IGljb246IFwiY2FsZW5kYXJcIiwgbGFiZWw6IFwiQ2FsZW5kYXJcIiB9LFxyXG5cdFx0fTtcclxuXHJcblx0XHRmb3IgKGNvbnN0IG1vZGUgb2YgdGhpcy5hdmFpbGFibGVNb2Rlcykge1xyXG5cdFx0XHRjb25zdCBjb25maWcgPSBtb2RlQ29uZmlnW21vZGVdO1xyXG5cdFx0XHRpZiAoY29uZmlnKSB7XHJcblx0XHRcdFx0dGhpcy5jcmVhdGVWaWV3VGFiKFxyXG5cdFx0XHRcdFx0dGhpcy52aWV3VGFic0NvbnRhaW5lcixcclxuXHRcdFx0XHRcdG1vZGUsXHJcblx0XHRcdFx0XHRjb25maWcuaWNvbixcclxuXHRcdFx0XHRcdGNvbmZpZy5sYWJlbFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHB1YmxpYyB1cGRhdGVBdmFpbGFibGVNb2Rlcyhtb2RlczogVmlld01vZGVbXSkge1xyXG5cdFx0dGhpcy5hdmFpbGFibGVNb2RlcyA9IG1vZGVzO1xyXG5cclxuXHRcdC8vIEhpZGUgZW50aXJlIG5hdmlnYXRpb24gaWYgbm8gbW9kZXMgYXZhaWxhYmxlXHJcblx0XHRpZiAobW9kZXMubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdHRoaXMuY29udGFpbmVyRWwuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU2hvdyBuYXZpZ2F0aW9uIHdoZW4gbW9kZXMgYXJlIGF2YWlsYWJsZVxyXG5cdFx0dGhpcy5jb250YWluZXJFbC5zdHlsZS5kaXNwbGF5ID0gXCJcIjtcclxuXHJcblx0XHQvLyBJZiBjdXJyZW50IG1vZGUgaXMgbm8gbG9uZ2VyIGF2YWlsYWJsZSwgc3dpdGNoIHRvIGZpcnN0IGF2YWlsYWJsZSBtb2RlXHJcblx0XHRpZiAoIW1vZGVzLmluY2x1ZGVzKHRoaXMuY3VycmVudFZpZXdNb2RlKSkge1xyXG5cdFx0XHR0aGlzLmN1cnJlbnRWaWV3TW9kZSA9IG1vZGVzWzBdO1xyXG5cdFx0XHQvLyBOb3RpZnkgYWJvdXQgdGhlIG1vZGUgY2hhbmdlXHJcblx0XHRcdHRoaXMub25WaWV3TW9kZUNoYW5nZSh0aGlzLmN1cnJlbnRWaWV3TW9kZSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVXBkYXRlIGNlbnRlciBzZWN0aW9uIHZpc2liaWxpdHkgKHRoaXMgc2hvdWxkIGFsd2F5cyBiZSB2aXNpYmxlIG5vdyBzaW5jZSB3ZSBoYW5kbGUgZW1wdHkgbW9kZXMgYWJvdmUpXHJcblx0XHRjb25zdCBjZW50ZXJTZWN0aW9uID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRcIi5mbHVlbnQtbmF2LWNlbnRlclwiXHJcblx0XHQpIGFzIEhUTUxFbGVtZW50O1xyXG5cdFx0aWYgKGNlbnRlclNlY3Rpb24pIHtcclxuXHRcdFx0Y2VudGVyU2VjdGlvbi5zdHlsZS5kaXNwbGF5ID0gXCJcIjtcclxuXHRcdFx0Ly8gUmUtcmVuZGVyIHRoZSB2aWV3IHRhYnNcclxuXHRcdFx0aWYgKCF0aGlzLnZpZXdUYWJzQ29udGFpbmVyKSB7XHJcblx0XHRcdFx0dGhpcy52aWV3VGFic0NvbnRhaW5lciA9IGNlbnRlclNlY3Rpb24uY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRcdGNsczogXCJmbHVlbnQtdmlldy10YWJzXCIsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdFx0dGhpcy5yZW5kZXJWaWV3VGFicygpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHVibGljIGdldEN1cnJlbnRWaWV3TW9kZSgpOiBWaWV3TW9kZSB7XHJcblx0XHRyZXR1cm4gdGhpcy5jdXJyZW50Vmlld01vZGU7XHJcblx0fVxyXG59XHJcbiJdfQ==