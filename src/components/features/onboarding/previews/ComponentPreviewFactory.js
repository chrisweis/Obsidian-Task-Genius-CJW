import { setIcon } from "obsidian";
import { t } from "@/translations/helper";
/**
 * Factory class for creating component previews with mock data
 */
export class ComponentPreviewFactory {
    /**
     * Create a preview of the V2 Sidebar component
     */
    static createSidebarPreview(container) {
        container.addClass("tg-fluent-container", "component-preview-sidebar");
        const sidebar = container.createDiv({
            cls: "fluent-sidebar component-preview",
        });
        // Header with workspace selector
        const header = sidebar.createDiv({ cls: "fluent-sidebar-header" });
        // Workspace selector with correct structure
        const workspaceSelectorEl = header.createDiv();
        const workspaceSelector = workspaceSelectorEl.createDiv({
            cls: "workspace-selector",
        });
        const workspaceButton = workspaceSelector.createDiv({
            cls: "workspace-selector-button",
        });
        const workspaceInfo = workspaceButton.createDiv({
            cls: "workspace-info",
        });
        const workspaceIcon = workspaceInfo.createDiv({
            cls: "workspace-icon",
        });
        workspaceIcon.style.backgroundColor = "#3498db";
        setIcon(workspaceIcon, "layers");
        const workspaceDetails = workspaceInfo.createDiv({
            cls: "workspace-details",
        });
        const nameContainer = workspaceDetails.createDiv({
            cls: "workspace-name-container",
        });
        nameContainer.createSpan({
            text: t("Personal"),
            cls: "workspace-name",
        });
        workspaceDetails.createDiv({
            text: t("Workspace"),
            cls: "workspace-label",
        });
        const dropdownIcon = workspaceButton.createDiv({
            cls: "workspace-dropdown-icon",
        });
        setIcon(dropdownIcon, "chevron-down");
        // New task button
        const newTaskBtn = header.createEl("button", {
            cls: "fluent-new-task-btn",
            text: t("New Task"),
        });
        setIcon(newTaskBtn.createDiv({ cls: "fluent-new-task-icon" }), "plus");
        // Main navigation area
        const content = sidebar.createDiv({ cls: "fluent-sidebar-content" });
        // Primary navigation section
        const primarySection = content.createDiv({
            cls: "fluent-sidebar-section fluent-sidebar-section-primary",
        });
        const primaryList = primarySection.createDiv({
            cls: "fluent-navigation-list",
        });
        const primaryItems = [
            { id: "inbox", label: t("Inbox"), icon: "inbox", badge: 5 },
            { id: "today", label: t("Today"), icon: "calendar-days", badge: 3 },
            {
                id: "upcoming",
                label: t("Upcoming"),
                icon: "calendar",
                badge: 8,
            },
            { id: "flagged", label: t("Flagged"), icon: "flag", badge: 2 },
        ];
        primaryItems.forEach((item, index) => {
            const navItem = primaryList.createDiv({
                cls: "fluent-navigation-item",
                attr: {
                    "data-view-id": item.id,
                    tabindex: "0",
                    role: "button",
                },
            });
            if (index === 0)
                navItem.addClass("is-active");
            const icon = navItem.createDiv({ cls: "fluent-navigation-icon" });
            setIcon(icon, item.icon);
            navItem.createSpan({
                text: item.label,
                cls: "fluent-navigation-label",
            });
            if (item.badge && item.badge > 0) {
                navItem.createDiv({
                    text: item.badge.toString(),
                    cls: "fluent-navigation-badge",
                });
            }
        });
        // Projects section
        const projectsSection = content.createDiv({
            cls: "fluent-sidebar-section fluent-sidebar-section-projects",
        });
        const projectsHeader = projectsSection.createDiv({
            cls: "fluent-section-header",
        });
        projectsHeader.createSpan({ text: t("Projects") });
        const buttonContainer = projectsHeader.createDiv({
            cls: "fluent-project-header-buttons",
        });
        const treeToggleBtn = buttonContainer.createDiv({
            cls: "fluent-tree-toggle-btn",
            attr: { "aria-label": t("Toggle tree/list view") },
        });
        setIcon(treeToggleBtn, "list");
        const sortProjectBtn = buttonContainer.createDiv({
            cls: "fluent-sort-project-btn",
            attr: { "aria-label": t("Sort projects") },
        });
        setIcon(sortProjectBtn, "arrow-up-down");
        // Project list
        const projectListEl = projectsSection.createDiv();
        const projectList = projectListEl.createDiv({
            cls: "fluent-project-list",
        });
        const scrollArea = projectList.createDiv({
            cls: "fluent-project-scroll",
        });
        // Mock projects
        const projects = [
            { id: "work", name: t("Work"), color: "#3b82f6", count: 12 },
            { id: "personal", name: t("Personal"), color: "#10b981", count: 5 },
            { id: "learning", name: t("Learning"), color: "#f59e0b", count: 3 },
        ];
        projects.forEach((project) => {
            const projectItem = scrollArea.createDiv({
                cls: "fluent-project-item",
                attr: {
                    "data-project-id": project.id,
                    "data-level": "0",
                    tabindex: "0",
                    role: "button",
                },
            });
            const colorDot = projectItem.createDiv({
                cls: "fluent-project-color",
            });
            colorDot.style.backgroundColor = project.color;
            projectItem.createSpan({
                text: project.name,
                cls: "fluent-project-name",
            });
            projectItem.createSpan({
                text: project.count.toString(),
                cls: "fluent-project-count",
            });
        });
        // Other views section
        const otherSection = content.createDiv({
            cls: "fluent-sidebar-section fluent-sidebar-section-other",
        });
        const otherHeader = otherSection.createDiv({
            cls: "fluent-section-header",
        });
        otherHeader.createSpan({ text: t("Other Views") });
        const otherList = otherSection.createDiv({
            cls: "fluent-navigation-list",
        });
        const otherItems = [
            { id: "calendar", label: t("Calendar"), icon: "calendar" },
            { id: "gantt", label: t("Gantt"), icon: "git-branch" },
            { id: "tags", label: t("Tags"), icon: "tag" },
        ];
        otherItems.forEach((item) => {
            const navItem = otherList.createDiv({
                cls: "fluent-navigation-item",
                attr: {
                    "data-view-id": item.id,
                    tabindex: "0",
                    role: "button",
                },
            });
            const icon = navItem.createDiv({ cls: "fluent-navigation-icon" });
            setIcon(icon, item.icon);
            navItem.createSpan({
                text: item.label,
                cls: "fluent-navigation-label",
            });
        });
        // Interactive preview: simple selection toggle (visual only)
        const root = container.querySelector(".fluent-sidebar");
        const handleActivate = (target) => {
            const item = target.closest(".fluent-navigation-item, .fluent-project-item");
            if (!item)
                return;
            const parentList = item.parentElement;
            if (!parentList)
                return;
            // Clear previous active in the same group
            Array.from(parentList.children).forEach((el) => el.classList.remove("is-active"));
            item.classList.add("is-active");
        };
        root.addEventListener("click", (e) => {
            handleActivate(e.target);
        });
        root.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                const target = e.target;
                handleActivate(target);
                // Prevent page scroll on Space
                e.preventDefault();
            }
        });
    }
    /**
     * Create a preview of the V2 TopNavigation component
     */
    static createTopNavigationPreview(container) {
        container.addClass("tg-fluent-container", "component-preview-topnav");
        const topNav = container.createDiv({
            cls: "fluent-top-navigation component-preview",
        });
        // Left section - Search
        const leftSection = topNav.createDiv({ cls: "fluent-nav-left" });
        const searchContainer = leftSection.createDiv({
            cls: "fluent-search-container",
        });
        // Match SearchComponent structure
        const searchInputContainer = searchContainer.createDiv({
            cls: "search-input-container",
        });
        const searchInput = searchInputContainer.createEl("input", {
            type: "text",
            placeholder: t("Search tasks, projects ..."),
            cls: "search-input",
            attr: { disabled: "true" },
        });
        // Center section - View mode tabs
        const centerSection = topNav.createDiv({ cls: "fluent-nav-center" });
        const viewTabs = centerSection.createDiv({ cls: "fluent-view-tabs" });
        const modes = [
            { id: "list", label: t("List"), icon: "list" },
            { id: "kanban", label: t("Kanban"), icon: "layout-grid" },
            { id: "tree", label: t("Tree"), icon: "git-branch" },
            { id: "calendar", label: t("Calendar"), icon: "calendar" },
        ];
        modes.forEach((mode, index) => {
            const tab = viewTabs.createEl("button", {
                cls: ["fluent-view-tab", "clickable-icon"],
                attr: { "data-mode": mode.id },
            });
            if (index === 0)
                tab.addClass("is-active");
            const icon = tab.createDiv({ cls: "fluent-view-tab-icon" });
            setIcon(icon, mode.icon);
            tab.createSpan({ text: mode.label });
        });
        // Right section - Notifications and Settings
        const rightSection = topNav.createDiv({ cls: "fluent-nav-right" });
        // Notification button
        const notificationBtn = rightSection.createDiv({
            cls: "fluent-nav-icon-button",
        });
        setIcon(notificationBtn, "bell");
        const badge = notificationBtn.createDiv({
            cls: "fluent-notification-badge",
            text: "3",
        });
        // Settings button
        const settingsBtn = rightSection.createDiv({
            cls: "fluent-nav-icon-button",
        });
        setIcon(settingsBtn, "settings");
    }
    /**
     * Create a preview of the content area with task list
     */
    static createContentAreaPreview(container) {
        container.addClass("tg-fluent-container", "component-preview-content");
        const content = container.createDiv({
            cls: "task-content component-preview",
        });
        // Content header
        const header = content.createDiv({ cls: "content-header" });
        // View title
        const titleEl = header.createDiv({
            cls: "content-title",
            text: t("Inbox"),
        });
        // Task count
        const countEl = header.createDiv({
            cls: "task-count",
            text: `5 ${t("tasks")}`,
        });
        // Filter controls
        const filterEl = header.createDiv({ cls: "content-filter" });
        const filterInput = filterEl.createEl("input", {
            cls: "filter-input",
            attr: {
                type: "text",
                placeholder: t("Filter tasks..."),
                disabled: "true",
            },
        });
        // View toggle button
        const viewToggleBtn = header.createDiv({ cls: "view-toggle-btn" });
        setIcon(viewToggleBtn, "list");
        viewToggleBtn.setAttribute("aria-label", t("Toggle list/tree view"));
        // Task list
        const taskList = content.createDiv({ cls: "task-list" });
        const mockTasks = [
            {
                title: t("Review project proposal"),
                priority: "high",
                project: "Work",
            },
            {
                title: t("Update documentation"),
                priority: "medium",
                project: "Work",
            },
            { title: t("Buy groceries"), priority: "low", project: "Personal" },
            {
                title: t("Finish online course"),
                priority: "medium",
                project: "Learning",
            },
            {
                title: t("Schedule team meeting"),
                priority: "high",
                project: "Work",
            },
        ];
        mockTasks.forEach((task) => {
            const taskItem = taskList.createDiv({ cls: "task-item" });
            const checkbox = taskItem.createDiv({ cls: "task-checkbox" });
            setIcon(checkbox, "circle");
            const taskContent = taskItem.createDiv({ cls: "task-content" });
            taskContent.createSpan({ text: task.title, cls: "task-title" });
            const taskMeta = taskContent.createDiv({ cls: "task-meta" });
            if (task.priority) {
                const priorityBadge = taskMeta.createSpan({
                    cls: `task-priority priority-${task.priority}`,
                });
                priorityBadge.createSpan({ text: task.priority });
            }
            if (task.project) {
                const projectBadge = taskMeta.createSpan({
                    cls: "task-project",
                });
                projectBadge.createSpan({ text: task.project });
            }
        });
    }
    /**
     * Create a preview of the project popover
     */
    static createProjectPopoverPreview(container) {
        container.addClass("tg-fluent-container", "component-preview-popover");
        const popover = container.createDiv({
            cls: "project-popover component-preview",
        });
        // Popover header
        const header = popover.createDiv({ cls: "popover-header" });
        const colorDot = header.createSpan({ cls: "project-color-large" });
        colorDot.style.backgroundColor = "#3b82f6";
        const headerContent = header.createDiv({
            cls: "popover-header-content",
        });
        headerContent.createEl("h3", { text: t("Work") });
        headerContent.createSpan({
            text: `12 ${t("tasks")}`,
            cls: "project-task-count",
        });
        // Popover stats
        const stats = popover.createDiv({ cls: "popover-stats" });
        const statsItems = [
            { label: t("Active"), value: "8" },
            { label: t("Completed"), value: "24" },
            { label: t("Overdue"), value: "2" },
        ];
        statsItems.forEach((stat) => {
            const statItem = stats.createDiv({ cls: "stat-item" });
            statItem.createDiv({ text: stat.value, cls: "stat-value" });
            statItem.createDiv({ text: stat.label, cls: "stat-label" });
        });
        // Quick actions
        const actions = popover.createDiv({ cls: "popover-actions" });
        const actionButtons = [
            { label: t("View All"), icon: "eye" },
            { label: t("Add Task"), icon: "plus" },
            { label: t("Settings"), icon: "settings" },
        ];
        actionButtons.forEach((action) => {
            const btn = actions.createDiv({ cls: "popover-action-btn" });
            const icon = btn.createSpan();
            setIcon(icon, action.icon);
            btn.createSpan({ text: action.label });
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29tcG9uZW50UHJldmlld0ZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJDb21wb25lbnRQcmV2aWV3RmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQ25DLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUUxQzs7R0FFRztBQUNILE1BQU0sT0FBTyx1QkFBdUI7SUFDbkM7O09BRUc7SUFDSCxNQUFNLENBQUMsb0JBQW9CLENBQUMsU0FBc0I7UUFDakQsU0FBUyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO1FBRXZFLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUM7WUFDbkMsR0FBRyxFQUFFLGtDQUFrQztTQUN2QyxDQUFDLENBQUM7UUFFSCxpQ0FBaUM7UUFDakMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSx1QkFBdUIsRUFBRSxDQUFDLENBQUM7UUFFbkUsNENBQTRDO1FBQzVDLE1BQU0sbUJBQW1CLEdBQUcsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQy9DLE1BQU0saUJBQWlCLEdBQUcsbUJBQW1CLENBQUMsU0FBUyxDQUFDO1lBQ3ZELEdBQUcsRUFBRSxvQkFBb0I7U0FDekIsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxlQUFlLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxDQUFDO1lBQ25ELEdBQUcsRUFBRSwyQkFBMkI7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxhQUFhLEdBQUcsZUFBZSxDQUFDLFNBQVMsQ0FBQztZQUMvQyxHQUFHLEVBQUUsZ0JBQWdCO1NBQ3JCLENBQUMsQ0FBQztRQUNILE1BQU0sYUFBYSxHQUFHLGFBQWEsQ0FBQyxTQUFTLENBQUM7WUFDN0MsR0FBRyxFQUFFLGdCQUFnQjtTQUNyQixDQUFDLENBQUM7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Q0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUN4QyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHNldEljb24gfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuXHJcbi8qKlxyXG4gKiBGYWN0b3J5IGNsYXNzIGZvciBjcmVhdGluZyBjb21wb25lbnQgcHJldmlld3Mgd2l0aCBtb2NrIGRhdGFcclxuICovXHJcbmV4cG9ydCBjbGFzcyBDb21wb25lbnRQcmV2aWV3RmFjdG9yeSB7XHJcblx0LyoqXHJcblx0ICogQ3JlYXRlIGEgcHJldmlldyBvZiB0aGUgVjIgU2lkZWJhciBjb21wb25lbnRcclxuXHQgKi9cclxuXHRzdGF0aWMgY3JlYXRlU2lkZWJhclByZXZpZXcoY29udGFpbmVyOiBIVE1MRWxlbWVudCk6IHZvaWQge1xyXG5cdFx0Y29udGFpbmVyLmFkZENsYXNzKFwidGctZmx1ZW50LWNvbnRhaW5lclwiLCBcImNvbXBvbmVudC1wcmV2aWV3LXNpZGViYXJcIik7XHJcblxyXG5cdFx0Y29uc3Qgc2lkZWJhciA9IGNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZmx1ZW50LXNpZGViYXIgY29tcG9uZW50LXByZXZpZXdcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEhlYWRlciB3aXRoIHdvcmtzcGFjZSBzZWxlY3RvclxyXG5cdFx0Y29uc3QgaGVhZGVyID0gc2lkZWJhci5jcmVhdGVEaXYoeyBjbHM6IFwiZmx1ZW50LXNpZGViYXItaGVhZGVyXCIgfSk7XHJcblxyXG5cdFx0Ly8gV29ya3NwYWNlIHNlbGVjdG9yIHdpdGggY29ycmVjdCBzdHJ1Y3R1cmVcclxuXHRcdGNvbnN0IHdvcmtzcGFjZVNlbGVjdG9yRWwgPSBoZWFkZXIuY3JlYXRlRGl2KCk7XHJcblx0XHRjb25zdCB3b3Jrc3BhY2VTZWxlY3RvciA9IHdvcmtzcGFjZVNlbGVjdG9yRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcIndvcmtzcGFjZS1zZWxlY3RvclwiLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCB3b3Jrc3BhY2VCdXR0b24gPSB3b3Jrc3BhY2VTZWxlY3Rvci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwid29ya3NwYWNlLXNlbGVjdG9yLWJ1dHRvblwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3Qgd29ya3NwYWNlSW5mbyA9IHdvcmtzcGFjZUJ1dHRvbi5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwid29ya3NwYWNlLWluZm9cIixcclxuXHRcdH0pO1xyXG5cdFx0Y29uc3Qgd29ya3NwYWNlSWNvbiA9IHdvcmtzcGFjZUluZm8uY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcIndvcmtzcGFjZS1pY29uXCIsXHJcblx0XHR9KTtcclxuXHRcdHdvcmtzcGFjZUljb24uc3R5bGUuYmFja2dyb3VuZENvbG9yID0gXCIjMzQ5OGRiXCI7XHJcblx0XHRzZXRJY29uKHdvcmtzcGFjZUljb24sIFwibGF5ZXJzXCIpO1xyXG5cclxuXHRcdGNvbnN0IHdvcmtzcGFjZURldGFpbHMgPSB3b3Jrc3BhY2VJbmZvLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ3b3Jrc3BhY2UtZGV0YWlsc1wiLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCBuYW1lQ29udGFpbmVyID0gd29ya3NwYWNlRGV0YWlscy5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwid29ya3NwYWNlLW5hbWUtY29udGFpbmVyXCIsXHJcblx0XHR9KTtcclxuXHRcdG5hbWVDb250YWluZXIuY3JlYXRlU3Bhbih7XHJcblx0XHRcdHRleHQ6IHQoXCJQZXJzb25hbFwiKSxcclxuXHRcdFx0Y2xzOiBcIndvcmtzcGFjZS1uYW1lXCIsXHJcblx0XHR9KTtcclxuXHRcdHdvcmtzcGFjZURldGFpbHMuY3JlYXRlRGl2KHtcclxuXHRcdFx0dGV4dDogdChcIldvcmtzcGFjZVwiKSxcclxuXHRcdFx0Y2xzOiBcIndvcmtzcGFjZS1sYWJlbFwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgZHJvcGRvd25JY29uID0gd29ya3NwYWNlQnV0dG9uLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ3b3Jrc3BhY2UtZHJvcGRvd24taWNvblwiLFxyXG5cdFx0fSk7XHJcblx0XHRzZXRJY29uKGRyb3Bkb3duSWNvbiwgXCJjaGV2cm9uLWRvd25cIik7XHJcblxyXG5cdFx0Ly8gTmV3IHRhc2sgYnV0dG9uXHJcblx0XHRjb25zdCBuZXdUYXNrQnRuID0gaGVhZGVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0Y2xzOiBcImZsdWVudC1uZXctdGFzay1idG5cIixcclxuXHRcdFx0dGV4dDogdChcIk5ldyBUYXNrXCIpLFxyXG5cdFx0fSk7XHJcblx0XHRzZXRJY29uKG5ld1Rhc2tCdG4uY3JlYXRlRGl2KHsgY2xzOiBcImZsdWVudC1uZXctdGFzay1pY29uXCIgfSksIFwicGx1c1wiKTtcclxuXHJcblx0XHQvLyBNYWluIG5hdmlnYXRpb24gYXJlYVxyXG5cdFx0Y29uc3QgY29udGVudCA9IHNpZGViYXIuY3JlYXRlRGl2KHsgY2xzOiBcImZsdWVudC1zaWRlYmFyLWNvbnRlbnRcIiB9KTtcclxuXHJcblx0XHQvLyBQcmltYXJ5IG5hdmlnYXRpb24gc2VjdGlvblxyXG5cdFx0Y29uc3QgcHJpbWFyeVNlY3Rpb24gPSBjb250ZW50LmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmbHVlbnQtc2lkZWJhci1zZWN0aW9uIGZsdWVudC1zaWRlYmFyLXNlY3Rpb24tcHJpbWFyeVwiLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCBwcmltYXJ5TGlzdCA9IHByaW1hcnlTZWN0aW9uLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmbHVlbnQtbmF2aWdhdGlvbi1saXN0XCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCBwcmltYXJ5SXRlbXMgPSBbXHJcblx0XHRcdHsgaWQ6IFwiaW5ib3hcIiwgbGFiZWw6IHQoXCJJbmJveFwiKSwgaWNvbjogXCJpbmJveFwiLCBiYWRnZTogNSB9LFxyXG5cdFx0XHR7IGlkOiBcInRvZGF5XCIsIGxhYmVsOiB0KFwiVG9kYXlcIiksIGljb246IFwiY2FsZW5kYXItZGF5c1wiLCBiYWRnZTogMyB9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0aWQ6IFwidXBjb21pbmdcIixcclxuXHRcdFx0XHRsYWJlbDogdChcIlVwY29taW5nXCIpLFxyXG5cdFx0XHRcdGljb246IFwiY2FsZW5kYXJcIixcclxuXHRcdFx0XHRiYWRnZTogOCxcclxuXHRcdFx0fSxcclxuXHRcdFx0eyBpZDogXCJmbGFnZ2VkXCIsIGxhYmVsOiB0KFwiRmxhZ2dlZFwiKSwgaWNvbjogXCJmbGFnXCIsIGJhZGdlOiAyIH0sXHJcblx0XHRdO1xyXG5cclxuXHRcdHByaW1hcnlJdGVtcy5mb3JFYWNoKChpdGVtLCBpbmRleCkgPT4ge1xyXG5cdFx0XHRjb25zdCBuYXZJdGVtID0gcHJpbWFyeUxpc3QuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwiZmx1ZW50LW5hdmlnYXRpb24taXRlbVwiLFxyXG5cdFx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHRcdFwiZGF0YS12aWV3LWlkXCI6IGl0ZW0uaWQsXHJcblx0XHRcdFx0XHR0YWJpbmRleDogXCIwXCIsXHJcblx0XHRcdFx0XHRyb2xlOiBcImJ1dHRvblwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRpZiAoaW5kZXggPT09IDApIG5hdkl0ZW0uYWRkQ2xhc3MoXCJpcy1hY3RpdmVcIik7XHJcblxyXG5cdFx0XHRjb25zdCBpY29uID0gbmF2SXRlbS5jcmVhdGVEaXYoeyBjbHM6IFwiZmx1ZW50LW5hdmlnYXRpb24taWNvblwiIH0pO1xyXG5cdFx0XHRzZXRJY29uKGljb24sIGl0ZW0uaWNvbik7XHJcblx0XHRcdG5hdkl0ZW0uY3JlYXRlU3Bhbih7XHJcblx0XHRcdFx0dGV4dDogaXRlbS5sYWJlbCxcclxuXHRcdFx0XHRjbHM6IFwiZmx1ZW50LW5hdmlnYXRpb24tbGFiZWxcIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdGlmIChpdGVtLmJhZGdlICYmIGl0ZW0uYmFkZ2UgPiAwKSB7XHJcblx0XHRcdFx0bmF2SXRlbS5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdFx0dGV4dDogaXRlbS5iYWRnZS50b1N0cmluZygpLFxyXG5cdFx0XHRcdFx0Y2xzOiBcImZsdWVudC1uYXZpZ2F0aW9uLWJhZGdlXCIsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFByb2plY3RzIHNlY3Rpb25cclxuXHRcdGNvbnN0IHByb2plY3RzU2VjdGlvbiA9IGNvbnRlbnQuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZsdWVudC1zaWRlYmFyLXNlY3Rpb24gZmx1ZW50LXNpZGViYXItc2VjdGlvbi1wcm9qZWN0c1wiLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCBwcm9qZWN0c0hlYWRlciA9IHByb2plY3RzU2VjdGlvbi5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZmx1ZW50LXNlY3Rpb24taGVhZGVyXCIsXHJcblx0XHR9KTtcclxuXHRcdHByb2plY3RzSGVhZGVyLmNyZWF0ZVNwYW4oeyB0ZXh0OiB0KFwiUHJvamVjdHNcIikgfSk7XHJcblxyXG5cdFx0Y29uc3QgYnV0dG9uQ29udGFpbmVyID0gcHJvamVjdHNIZWFkZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZsdWVudC1wcm9qZWN0LWhlYWRlci1idXR0b25zXCIsXHJcblx0XHR9KTtcclxuXHRcdGNvbnN0IHRyZWVUb2dnbGVCdG4gPSBidXR0b25Db250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZsdWVudC10cmVlLXRvZ2dsZS1idG5cIixcclxuXHRcdFx0YXR0cjogeyBcImFyaWEtbGFiZWxcIjogdChcIlRvZ2dsZSB0cmVlL2xpc3Qgdmlld1wiKSB9LFxyXG5cdFx0fSk7XHJcblx0XHRzZXRJY29uKHRyZWVUb2dnbGVCdG4sIFwibGlzdFwiKTtcclxuXHJcblx0XHRjb25zdCBzb3J0UHJvamVjdEJ0biA9IGJ1dHRvbkNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZmx1ZW50LXNvcnQtcHJvamVjdC1idG5cIixcclxuXHRcdFx0YXR0cjogeyBcImFyaWEtbGFiZWxcIjogdChcIlNvcnQgcHJvamVjdHNcIikgfSxcclxuXHRcdH0pO1xyXG5cdFx0c2V0SWNvbihzb3J0UHJvamVjdEJ0biwgXCJhcnJvdy11cC1kb3duXCIpO1xyXG5cclxuXHRcdC8vIFByb2plY3QgbGlzdFxyXG5cdFx0Y29uc3QgcHJvamVjdExpc3RFbCA9IHByb2plY3RzU2VjdGlvbi5jcmVhdGVEaXYoKTtcclxuXHRcdGNvbnN0IHByb2plY3RMaXN0ID0gcHJvamVjdExpc3RFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZmx1ZW50LXByb2plY3QtbGlzdFwiLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCBzY3JvbGxBcmVhID0gcHJvamVjdExpc3QuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZsdWVudC1wcm9qZWN0LXNjcm9sbFwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gTW9jayBwcm9qZWN0c1xyXG5cdFx0Y29uc3QgcHJvamVjdHMgPSBbXHJcblx0XHRcdHsgaWQ6IFwid29ya1wiLCBuYW1lOiB0KFwiV29ya1wiKSwgY29sb3I6IFwiIzNiODJmNlwiLCBjb3VudDogMTIgfSxcclxuXHRcdFx0eyBpZDogXCJwZXJzb25hbFwiLCBuYW1lOiB0KFwiUGVyc29uYWxcIiksIGNvbG9yOiBcIiMxMGI5ODFcIiwgY291bnQ6IDUgfSxcclxuXHRcdFx0eyBpZDogXCJsZWFybmluZ1wiLCBuYW1lOiB0KFwiTGVhcm5pbmdcIiksIGNvbG9yOiBcIiNmNTllMGJcIiwgY291bnQ6IDMgfSxcclxuXHRcdF07XHJcblxyXG5cdFx0cHJvamVjdHMuZm9yRWFjaCgocHJvamVjdCkgPT4ge1xyXG5cdFx0XHRjb25zdCBwcm9qZWN0SXRlbSA9IHNjcm9sbEFyZWEuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwiZmx1ZW50LXByb2plY3QtaXRlbVwiLFxyXG5cdFx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHRcdFwiZGF0YS1wcm9qZWN0LWlkXCI6IHByb2plY3QuaWQsXHJcblx0XHRcdFx0XHRcImRhdGEtbGV2ZWxcIjogXCIwXCIsXHJcblx0XHRcdFx0XHR0YWJpbmRleDogXCIwXCIsXHJcblx0XHRcdFx0XHRyb2xlOiBcImJ1dHRvblwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRjb25zdCBjb2xvckRvdCA9IHByb2plY3RJdGVtLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcImZsdWVudC1wcm9qZWN0LWNvbG9yXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRjb2xvckRvdC5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBwcm9qZWN0LmNvbG9yO1xyXG5cdFx0XHRwcm9qZWN0SXRlbS5jcmVhdGVTcGFuKHtcclxuXHRcdFx0XHR0ZXh0OiBwcm9qZWN0Lm5hbWUsXHJcblx0XHRcdFx0Y2xzOiBcImZsdWVudC1wcm9qZWN0LW5hbWVcIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdHByb2plY3RJdGVtLmNyZWF0ZVNwYW4oe1xyXG5cdFx0XHRcdHRleHQ6IHByb2plY3QuY291bnQudG9TdHJpbmcoKSxcclxuXHRcdFx0XHRjbHM6IFwiZmx1ZW50LXByb2plY3QtY291bnRcIixcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBPdGhlciB2aWV3cyBzZWN0aW9uXHJcblx0XHRjb25zdCBvdGhlclNlY3Rpb24gPSBjb250ZW50LmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmbHVlbnQtc2lkZWJhci1zZWN0aW9uIGZsdWVudC1zaWRlYmFyLXNlY3Rpb24tb3RoZXJcIixcclxuXHRcdH0pO1xyXG5cdFx0Y29uc3Qgb3RoZXJIZWFkZXIgPSBvdGhlclNlY3Rpb24uY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZsdWVudC1zZWN0aW9uLWhlYWRlclwiLFxyXG5cdFx0fSk7XHJcblx0XHRvdGhlckhlYWRlci5jcmVhdGVTcGFuKHsgdGV4dDogdChcIk90aGVyIFZpZXdzXCIpIH0pO1xyXG5cclxuXHRcdGNvbnN0IG90aGVyTGlzdCA9IG90aGVyU2VjdGlvbi5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZmx1ZW50LW5hdmlnYXRpb24tbGlzdFwiLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCBvdGhlckl0ZW1zID0gW1xyXG5cdFx0XHR7IGlkOiBcImNhbGVuZGFyXCIsIGxhYmVsOiB0KFwiQ2FsZW5kYXJcIiksIGljb246IFwiY2FsZW5kYXJcIiB9LFxyXG5cdFx0XHR7IGlkOiBcImdhbnR0XCIsIGxhYmVsOiB0KFwiR2FudHRcIiksIGljb246IFwiZ2l0LWJyYW5jaFwiIH0sXHJcblx0XHRcdHsgaWQ6IFwidGFnc1wiLCBsYWJlbDogdChcIlRhZ3NcIiksIGljb246IFwidGFnXCIgfSxcclxuXHRcdF07XHJcblxyXG5cdFx0b3RoZXJJdGVtcy5mb3JFYWNoKChpdGVtKSA9PiB7XHJcblx0XHRcdGNvbnN0IG5hdkl0ZW0gPSBvdGhlckxpc3QuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwiZmx1ZW50LW5hdmlnYXRpb24taXRlbVwiLFxyXG5cdFx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHRcdFwiZGF0YS12aWV3LWlkXCI6IGl0ZW0uaWQsXHJcblx0XHRcdFx0XHR0YWJpbmRleDogXCIwXCIsXHJcblx0XHRcdFx0XHRyb2xlOiBcImJ1dHRvblwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRjb25zdCBpY29uID0gbmF2SXRlbS5jcmVhdGVEaXYoeyBjbHM6IFwiZmx1ZW50LW5hdmlnYXRpb24taWNvblwiIH0pO1xyXG5cdFx0XHRzZXRJY29uKGljb24sIGl0ZW0uaWNvbik7XHJcblx0XHRcdG5hdkl0ZW0uY3JlYXRlU3Bhbih7XHJcblx0XHRcdFx0dGV4dDogaXRlbS5sYWJlbCxcclxuXHRcdFx0XHRjbHM6IFwiZmx1ZW50LW5hdmlnYXRpb24tbGFiZWxcIixcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBJbnRlcmFjdGl2ZSBwcmV2aWV3OiBzaW1wbGUgc2VsZWN0aW9uIHRvZ2dsZSAodmlzdWFsIG9ubHkpXHJcblx0XHRjb25zdCByb290ID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoXCIuZmx1ZW50LXNpZGViYXJcIikhO1xyXG5cdFx0Y29uc3QgaGFuZGxlQWN0aXZhdGUgPSAodGFyZ2V0OiBIVE1MRWxlbWVudCkgPT4ge1xyXG5cdFx0XHRjb25zdCBpdGVtID0gdGFyZ2V0LmNsb3Nlc3Q8SFRNTEVsZW1lbnQ+KFxyXG5cdFx0XHRcdFwiLmZsdWVudC1uYXZpZ2F0aW9uLWl0ZW0sIC5mbHVlbnQtcHJvamVjdC1pdGVtXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0aWYgKCFpdGVtKSByZXR1cm47XHJcblx0XHRcdGNvbnN0IHBhcmVudExpc3QgPSBpdGVtLnBhcmVudEVsZW1lbnQ7XHJcblx0XHRcdGlmICghcGFyZW50TGlzdCkgcmV0dXJuO1xyXG5cdFx0XHQvLyBDbGVhciBwcmV2aW91cyBhY3RpdmUgaW4gdGhlIHNhbWUgZ3JvdXBcclxuXHRcdFx0QXJyYXkuZnJvbShwYXJlbnRMaXN0LmNoaWxkcmVuKS5mb3JFYWNoKChlbCkgPT5cclxuXHRcdFx0XHRlbC5jbGFzc0xpc3QucmVtb3ZlKFwiaXMtYWN0aXZlXCIpXHJcblx0XHRcdCk7XHJcblx0XHRcdGl0ZW0uY2xhc3NMaXN0LmFkZChcImlzLWFjdGl2ZVwiKTtcclxuXHRcdH07XHJcblxyXG5cdFx0cm9vdC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGUpID0+IHtcclxuXHRcdFx0aGFuZGxlQWN0aXZhdGUoZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQpO1xyXG5cdFx0fSk7XHJcblx0XHRyb290LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIChlOiBLZXlib2FyZEV2ZW50KSA9PiB7XHJcblx0XHRcdGlmIChlLmtleSA9PT0gXCJFbnRlclwiIHx8IGUua2V5ID09PSBcIiBcIikge1xyXG5cdFx0XHRcdGNvbnN0IHRhcmdldCA9IGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xyXG5cdFx0XHRcdGhhbmRsZUFjdGl2YXRlKHRhcmdldCk7XHJcblx0XHRcdFx0Ly8gUHJldmVudCBwYWdlIHNjcm9sbCBvbiBTcGFjZVxyXG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDcmVhdGUgYSBwcmV2aWV3IG9mIHRoZSBWMiBUb3BOYXZpZ2F0aW9uIGNvbXBvbmVudFxyXG5cdCAqL1xyXG5cdHN0YXRpYyBjcmVhdGVUb3BOYXZpZ2F0aW9uUHJldmlldyhjb250YWluZXI6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHRjb250YWluZXIuYWRkQ2xhc3MoXCJ0Zy1mbHVlbnQtY29udGFpbmVyXCIsIFwiY29tcG9uZW50LXByZXZpZXctdG9wbmF2XCIpO1xyXG5cclxuXHRcdGNvbnN0IHRvcE5hdiA9IGNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZmx1ZW50LXRvcC1uYXZpZ2F0aW9uIGNvbXBvbmVudC1wcmV2aWV3XCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBMZWZ0IHNlY3Rpb24gLSBTZWFyY2hcclxuXHRcdGNvbnN0IGxlZnRTZWN0aW9uID0gdG9wTmF2LmNyZWF0ZURpdih7IGNsczogXCJmbHVlbnQtbmF2LWxlZnRcIiB9KTtcclxuXHRcdGNvbnN0IHNlYXJjaENvbnRhaW5lciA9IGxlZnRTZWN0aW9uLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmbHVlbnQtc2VhcmNoLWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gTWF0Y2ggU2VhcmNoQ29tcG9uZW50IHN0cnVjdHVyZVxyXG5cdFx0Y29uc3Qgc2VhcmNoSW5wdXRDb250YWluZXIgPSBzZWFyY2hDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInNlYXJjaC1pbnB1dC1jb250YWluZXJcIixcclxuXHRcdH0pO1xyXG5cdFx0Y29uc3Qgc2VhcmNoSW5wdXQgPSBzZWFyY2hJbnB1dENvbnRhaW5lci5jcmVhdGVFbChcImlucHV0XCIsIHtcclxuXHRcdFx0dHlwZTogXCJ0ZXh0XCIsXHJcblx0XHRcdHBsYWNlaG9sZGVyOiB0KFwiU2VhcmNoIHRhc2tzLCBwcm9qZWN0cyAuLi5cIiksXHJcblx0XHRcdGNsczogXCJzZWFyY2gtaW5wdXRcIixcclxuXHRcdFx0YXR0cjogeyBkaXNhYmxlZDogXCJ0cnVlXCIgfSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIENlbnRlciBzZWN0aW9uIC0gVmlldyBtb2RlIHRhYnNcclxuXHRcdGNvbnN0IGNlbnRlclNlY3Rpb24gPSB0b3BOYXYuY3JlYXRlRGl2KHsgY2xzOiBcImZsdWVudC1uYXYtY2VudGVyXCIgfSk7XHJcblx0XHRjb25zdCB2aWV3VGFicyA9IGNlbnRlclNlY3Rpb24uY3JlYXRlRGl2KHsgY2xzOiBcImZsdWVudC12aWV3LXRhYnNcIiB9KTtcclxuXHJcblx0XHRjb25zdCBtb2RlcyA9IFtcclxuXHRcdFx0eyBpZDogXCJsaXN0XCIsIGxhYmVsOiB0KFwiTGlzdFwiKSwgaWNvbjogXCJsaXN0XCIgfSxcclxuXHRcdFx0eyBpZDogXCJrYW5iYW5cIiwgbGFiZWw6IHQoXCJLYW5iYW5cIiksIGljb246IFwibGF5b3V0LWdyaWRcIiB9LFxyXG5cdFx0XHR7IGlkOiBcInRyZWVcIiwgbGFiZWw6IHQoXCJUcmVlXCIpLCBpY29uOiBcImdpdC1icmFuY2hcIiB9LFxyXG5cdFx0XHR7IGlkOiBcImNhbGVuZGFyXCIsIGxhYmVsOiB0KFwiQ2FsZW5kYXJcIiksIGljb246IFwiY2FsZW5kYXJcIiB9LFxyXG5cdFx0XTtcclxuXHJcblx0XHRtb2Rlcy5mb3JFYWNoKChtb2RlLCBpbmRleCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0YWIgPSB2aWV3VGFicy5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdFx0Y2xzOiBbXCJmbHVlbnQtdmlldy10YWJcIiwgXCJjbGlja2FibGUtaWNvblwiXSxcclxuXHRcdFx0XHRhdHRyOiB7IFwiZGF0YS1tb2RlXCI6IG1vZGUuaWQgfSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdGlmIChpbmRleCA9PT0gMCkgdGFiLmFkZENsYXNzKFwiaXMtYWN0aXZlXCIpO1xyXG5cclxuXHRcdFx0Y29uc3QgaWNvbiA9IHRhYi5jcmVhdGVEaXYoeyBjbHM6IFwiZmx1ZW50LXZpZXctdGFiLWljb25cIiB9KTtcclxuXHRcdFx0c2V0SWNvbihpY29uLCBtb2RlLmljb24pO1xyXG5cdFx0XHR0YWIuY3JlYXRlU3Bhbih7IHRleHQ6IG1vZGUubGFiZWwgfSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBSaWdodCBzZWN0aW9uIC0gTm90aWZpY2F0aW9ucyBhbmQgU2V0dGluZ3NcclxuXHRcdGNvbnN0IHJpZ2h0U2VjdGlvbiA9IHRvcE5hdi5jcmVhdGVEaXYoeyBjbHM6IFwiZmx1ZW50LW5hdi1yaWdodFwiIH0pO1xyXG5cclxuXHRcdC8vIE5vdGlmaWNhdGlvbiBidXR0b25cclxuXHRcdGNvbnN0IG5vdGlmaWNhdGlvbkJ0biA9IHJpZ2h0U2VjdGlvbi5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZmx1ZW50LW5hdi1pY29uLWJ1dHRvblwiLFxyXG5cdFx0fSk7XHJcblx0XHRzZXRJY29uKG5vdGlmaWNhdGlvbkJ0biwgXCJiZWxsXCIpO1xyXG5cdFx0Y29uc3QgYmFkZ2UgPSBub3RpZmljYXRpb25CdG4uY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZsdWVudC1ub3RpZmljYXRpb24tYmFkZ2VcIixcclxuXHRcdFx0dGV4dDogXCIzXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBTZXR0aW5ncyBidXR0b25cclxuXHRcdGNvbnN0IHNldHRpbmdzQnRuID0gcmlnaHRTZWN0aW9uLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmbHVlbnQtbmF2LWljb24tYnV0dG9uXCIsXHJcblx0XHR9KTtcclxuXHRcdHNldEljb24oc2V0dGluZ3NCdG4sIFwic2V0dGluZ3NcIik7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDcmVhdGUgYSBwcmV2aWV3IG9mIHRoZSBjb250ZW50IGFyZWEgd2l0aCB0YXNrIGxpc3RcclxuXHQgKi9cclxuXHRzdGF0aWMgY3JlYXRlQ29udGVudEFyZWFQcmV2aWV3KGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdGNvbnRhaW5lci5hZGRDbGFzcyhcInRnLWZsdWVudC1jb250YWluZXJcIiwgXCJjb21wb25lbnQtcHJldmlldy1jb250ZW50XCIpO1xyXG5cclxuXHRcdGNvbnN0IGNvbnRlbnQgPSBjb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInRhc2stY29udGVudCBjb21wb25lbnQtcHJldmlld1wiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ29udGVudCBoZWFkZXJcclxuXHRcdGNvbnN0IGhlYWRlciA9IGNvbnRlbnQuY3JlYXRlRGl2KHsgY2xzOiBcImNvbnRlbnQtaGVhZGVyXCIgfSk7XHJcblxyXG5cdFx0Ly8gVmlldyB0aXRsZVxyXG5cdFx0Y29uc3QgdGl0bGVFbCA9IGhlYWRlci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiY29udGVudC10aXRsZVwiLFxyXG5cdFx0XHR0ZXh0OiB0KFwiSW5ib3hcIiksXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBUYXNrIGNvdW50XHJcblx0XHRjb25zdCBjb3VudEVsID0gaGVhZGVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ0YXNrLWNvdW50XCIsXHJcblx0XHRcdHRleHQ6IGA1ICR7dChcInRhc2tzXCIpfWAsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBGaWx0ZXIgY29udHJvbHNcclxuXHRcdGNvbnN0IGZpbHRlckVsID0gaGVhZGVyLmNyZWF0ZURpdih7IGNsczogXCJjb250ZW50LWZpbHRlclwiIH0pO1xyXG5cdFx0Y29uc3QgZmlsdGVySW5wdXQgPSBmaWx0ZXJFbC5jcmVhdGVFbChcImlucHV0XCIsIHtcclxuXHRcdFx0Y2xzOiBcImZpbHRlci1pbnB1dFwiLFxyXG5cdFx0XHRhdHRyOiB7XHJcblx0XHRcdFx0dHlwZTogXCJ0ZXh0XCIsXHJcblx0XHRcdFx0cGxhY2Vob2xkZXI6IHQoXCJGaWx0ZXIgdGFza3MuLi5cIiksXHJcblx0XHRcdFx0ZGlzYWJsZWQ6IFwidHJ1ZVwiLFxyXG5cdFx0XHR9LFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gVmlldyB0b2dnbGUgYnV0dG9uXHJcblx0XHRjb25zdCB2aWV3VG9nZ2xlQnRuID0gaGVhZGVyLmNyZWF0ZURpdih7IGNsczogXCJ2aWV3LXRvZ2dsZS1idG5cIiB9KTtcclxuXHRcdHNldEljb24odmlld1RvZ2dsZUJ0biwgXCJsaXN0XCIpO1xyXG5cdFx0dmlld1RvZ2dsZUJ0bi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIHQoXCJUb2dnbGUgbGlzdC90cmVlIHZpZXdcIikpO1xyXG5cclxuXHRcdC8vIFRhc2sgbGlzdFxyXG5cdFx0Y29uc3QgdGFza0xpc3QgPSBjb250ZW50LmNyZWF0ZURpdih7IGNsczogXCJ0YXNrLWxpc3RcIiB9KTtcclxuXHJcblx0XHRjb25zdCBtb2NrVGFza3MgPSBbXHJcblx0XHRcdHtcclxuXHRcdFx0XHR0aXRsZTogdChcIlJldmlldyBwcm9qZWN0IHByb3Bvc2FsXCIpLFxyXG5cdFx0XHRcdHByaW9yaXR5OiBcImhpZ2hcIixcclxuXHRcdFx0XHRwcm9qZWN0OiBcIldvcmtcIixcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHRpdGxlOiB0KFwiVXBkYXRlIGRvY3VtZW50YXRpb25cIiksXHJcblx0XHRcdFx0cHJpb3JpdHk6IFwibWVkaXVtXCIsXHJcblx0XHRcdFx0cHJvamVjdDogXCJXb3JrXCIsXHJcblx0XHRcdH0sXHJcblx0XHRcdHsgdGl0bGU6IHQoXCJCdXkgZ3JvY2VyaWVzXCIpLCBwcmlvcml0eTogXCJsb3dcIiwgcHJvamVjdDogXCJQZXJzb25hbFwiIH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHR0aXRsZTogdChcIkZpbmlzaCBvbmxpbmUgY291cnNlXCIpLFxyXG5cdFx0XHRcdHByaW9yaXR5OiBcIm1lZGl1bVwiLFxyXG5cdFx0XHRcdHByb2plY3Q6IFwiTGVhcm5pbmdcIixcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHRpdGxlOiB0KFwiU2NoZWR1bGUgdGVhbSBtZWV0aW5nXCIpLFxyXG5cdFx0XHRcdHByaW9yaXR5OiBcImhpZ2hcIixcclxuXHRcdFx0XHRwcm9qZWN0OiBcIldvcmtcIixcclxuXHRcdFx0fSxcclxuXHRcdF07XHJcblxyXG5cdFx0bW9ja1Rhc2tzLmZvckVhY2goKHRhc2spID0+IHtcclxuXHRcdFx0Y29uc3QgdGFza0l0ZW0gPSB0YXNrTGlzdC5jcmVhdGVEaXYoeyBjbHM6IFwidGFzay1pdGVtXCIgfSk7XHJcblxyXG5cdFx0XHRjb25zdCBjaGVja2JveCA9IHRhc2tJdGVtLmNyZWF0ZURpdih7IGNsczogXCJ0YXNrLWNoZWNrYm94XCIgfSk7XHJcblx0XHRcdHNldEljb24oY2hlY2tib3gsIFwiY2lyY2xlXCIpO1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza0NvbnRlbnQgPSB0YXNrSXRlbS5jcmVhdGVEaXYoeyBjbHM6IFwidGFzay1jb250ZW50XCIgfSk7XHJcblx0XHRcdHRhc2tDb250ZW50LmNyZWF0ZVNwYW4oeyB0ZXh0OiB0YXNrLnRpdGxlLCBjbHM6IFwidGFzay10aXRsZVwiIH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza01ldGEgPSB0YXNrQ29udGVudC5jcmVhdGVEaXYoeyBjbHM6IFwidGFzay1tZXRhXCIgfSk7XHJcblx0XHRcdGlmICh0YXNrLnByaW9yaXR5KSB7XHJcblx0XHRcdFx0Y29uc3QgcHJpb3JpdHlCYWRnZSA9IHRhc2tNZXRhLmNyZWF0ZVNwYW4oe1xyXG5cdFx0XHRcdFx0Y2xzOiBgdGFzay1wcmlvcml0eSBwcmlvcml0eS0ke3Rhc2sucHJpb3JpdHl9YCxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRwcmlvcml0eUJhZGdlLmNyZWF0ZVNwYW4oeyB0ZXh0OiB0YXNrLnByaW9yaXR5IH0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmICh0YXNrLnByb2plY3QpIHtcclxuXHRcdFx0XHRjb25zdCBwcm9qZWN0QmFkZ2UgPSB0YXNrTWV0YS5jcmVhdGVTcGFuKHtcclxuXHRcdFx0XHRcdGNsczogXCJ0YXNrLXByb2plY3RcIixcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRwcm9qZWN0QmFkZ2UuY3JlYXRlU3Bhbih7IHRleHQ6IHRhc2sucHJvamVjdCB9KTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDcmVhdGUgYSBwcmV2aWV3IG9mIHRoZSBwcm9qZWN0IHBvcG92ZXJcclxuXHQgKi9cclxuXHRzdGF0aWMgY3JlYXRlUHJvamVjdFBvcG92ZXJQcmV2aWV3KGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdGNvbnRhaW5lci5hZGRDbGFzcyhcInRnLWZsdWVudC1jb250YWluZXJcIiwgXCJjb21wb25lbnQtcHJldmlldy1wb3BvdmVyXCIpO1xyXG5cclxuXHRcdGNvbnN0IHBvcG92ZXIgPSBjb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInByb2plY3QtcG9wb3ZlciBjb21wb25lbnQtcHJldmlld1wiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gUG9wb3ZlciBoZWFkZXJcclxuXHRcdGNvbnN0IGhlYWRlciA9IHBvcG92ZXIuY3JlYXRlRGl2KHsgY2xzOiBcInBvcG92ZXItaGVhZGVyXCIgfSk7XHJcblx0XHRjb25zdCBjb2xvckRvdCA9IGhlYWRlci5jcmVhdGVTcGFuKHsgY2xzOiBcInByb2plY3QtY29sb3ItbGFyZ2VcIiB9KTtcclxuXHRcdGNvbG9yRG90LnN0eWxlLmJhY2tncm91bmRDb2xvciA9IFwiIzNiODJmNlwiO1xyXG5cclxuXHRcdGNvbnN0IGhlYWRlckNvbnRlbnQgPSBoZWFkZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInBvcG92ZXItaGVhZGVyLWNvbnRlbnRcIixcclxuXHRcdH0pO1xyXG5cdFx0aGVhZGVyQ29udGVudC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogdChcIldvcmtcIikgfSk7XHJcblx0XHRoZWFkZXJDb250ZW50LmNyZWF0ZVNwYW4oe1xyXG5cdFx0XHR0ZXh0OiBgMTIgJHt0KFwidGFza3NcIil9YCxcclxuXHRcdFx0Y2xzOiBcInByb2plY3QtdGFzay1jb3VudFwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gUG9wb3ZlciBzdGF0c1xyXG5cdFx0Y29uc3Qgc3RhdHMgPSBwb3BvdmVyLmNyZWF0ZURpdih7IGNsczogXCJwb3BvdmVyLXN0YXRzXCIgfSk7XHJcblx0XHRjb25zdCBzdGF0c0l0ZW1zID0gW1xyXG5cdFx0XHR7IGxhYmVsOiB0KFwiQWN0aXZlXCIpLCB2YWx1ZTogXCI4XCIgfSxcclxuXHRcdFx0eyBsYWJlbDogdChcIkNvbXBsZXRlZFwiKSwgdmFsdWU6IFwiMjRcIiB9LFxyXG5cdFx0XHR7IGxhYmVsOiB0KFwiT3ZlcmR1ZVwiKSwgdmFsdWU6IFwiMlwiIH0sXHJcblx0XHRdO1xyXG5cclxuXHRcdHN0YXRzSXRlbXMuZm9yRWFjaCgoc3RhdCkgPT4ge1xyXG5cdFx0XHRjb25zdCBzdGF0SXRlbSA9IHN0YXRzLmNyZWF0ZURpdih7IGNsczogXCJzdGF0LWl0ZW1cIiB9KTtcclxuXHRcdFx0c3RhdEl0ZW0uY3JlYXRlRGl2KHsgdGV4dDogc3RhdC52YWx1ZSwgY2xzOiBcInN0YXQtdmFsdWVcIiB9KTtcclxuXHRcdFx0c3RhdEl0ZW0uY3JlYXRlRGl2KHsgdGV4dDogc3RhdC5sYWJlbCwgY2xzOiBcInN0YXQtbGFiZWxcIiB9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFF1aWNrIGFjdGlvbnNcclxuXHRcdGNvbnN0IGFjdGlvbnMgPSBwb3BvdmVyLmNyZWF0ZURpdih7IGNsczogXCJwb3BvdmVyLWFjdGlvbnNcIiB9KTtcclxuXHRcdGNvbnN0IGFjdGlvbkJ1dHRvbnMgPSBbXHJcblx0XHRcdHsgbGFiZWw6IHQoXCJWaWV3IEFsbFwiKSwgaWNvbjogXCJleWVcIiB9LFxyXG5cdFx0XHR7IGxhYmVsOiB0KFwiQWRkIFRhc2tcIiksIGljb246IFwicGx1c1wiIH0sXHJcblx0XHRcdHsgbGFiZWw6IHQoXCJTZXR0aW5nc1wiKSwgaWNvbjogXCJzZXR0aW5nc1wiIH0sXHJcblx0XHRdO1xyXG5cclxuXHRcdGFjdGlvbkJ1dHRvbnMuZm9yRWFjaCgoYWN0aW9uKSA9PiB7XHJcblx0XHRcdGNvbnN0IGJ0biA9IGFjdGlvbnMuY3JlYXRlRGl2KHsgY2xzOiBcInBvcG92ZXItYWN0aW9uLWJ0blwiIH0pO1xyXG5cdFx0XHRjb25zdCBpY29uID0gYnRuLmNyZWF0ZVNwYW4oKTtcclxuXHRcdFx0c2V0SWNvbihpY29uLCBhY3Rpb24uaWNvbik7XHJcblx0XHRcdGJ0bi5jcmVhdGVTcGFuKHsgdGV4dDogYWN0aW9uLmxhYmVsIH0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG59XHJcbiJdfQ==