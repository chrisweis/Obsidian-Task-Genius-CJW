import { setIcon } from "obsidian";
import { t } from "@/translations/helper";

/**
 * Factory class for creating component previews with mock data
 */
export class ComponentPreviewFactory {
	/**
	 * Create a preview of the V2 Sidebar component
	 */
	static createSidebarPreview(container: HTMLElement): void {
		container.addClass("tg-v2-container", "component-preview-sidebar");

		const sidebar = container.createDiv({ cls: "v2-sidebar component-preview" });

		// Header with workspace selector
		const header = sidebar.createDiv({ cls: "v2-sidebar-header" });
		const workspaceSelector = header.createDiv({ cls: "workspace-selector" });

		const workspaceButton = workspaceSelector.createDiv({ cls: "workspace-button" });
		const workspaceIcon = workspaceButton.createSpan({ cls: "workspace-icon" });
		setIcon(workspaceIcon, "layout-dashboard");
		workspaceButton.createSpan({ text: t("Personal"), cls: "workspace-name" });
		const chevron = workspaceButton.createSpan({ cls: "workspace-chevron" });
		setIcon(chevron, "chevron-down");

		// New task button
		const newTaskBtn = header.createDiv({ cls: "new-task-button" });
		setIcon(newTaskBtn, "plus");
		newTaskBtn.createSpan({ text: t("New Task") });

		// Primary navigation
		const primaryNav = sidebar.createDiv({ cls: "v2-sidebar-section" });
		const primaryItems = [
			{ id: "inbox", label: t("Inbox"), icon: "inbox", count: 5 },
			{ id: "today", label: t("Today"), icon: "calendar-days", count: 3 },
			{ id: "upcoming", label: t("Upcoming"), icon: "calendar", count: 8 },
			{ id: "flagged", label: t("Flagged"), icon: "flag", count: 2 },
		];

		primaryItems.forEach((item, index) => {
			const navItem = primaryNav.createDiv({ cls: "v2-nav-item" });
			if (index === 0) navItem.addClass("is-active");

			const icon = navItem.createSpan({ cls: "v2-nav-icon" });
			setIcon(icon, item.icon);
			navItem.createSpan({ text: item.label, cls: "v2-nav-label" });
			if (item.count > 0) {
				navItem.createSpan({ text: item.count.toString(), cls: "v2-nav-count" });
			}
		});

		// Projects section
		const projectsSection = sidebar.createDiv({ cls: "v2-sidebar-section" });
		const projectsHeader = projectsSection.createDiv({ cls: "v2-section-header" });
		projectsHeader.createSpan({ text: t("Projects") });

		const projectsHeaderActions = projectsHeader.createDiv({ cls: "v2-section-actions" });
		const addIcon = projectsHeaderActions.createSpan({ cls: "clickable-icon" });
		setIcon(addIcon, "plus");

		// Mock projects
		const projects = [
			{ name: t("Work"), color: "#3b82f6", count: 12 },
			{ name: t("Personal"), color: "#10b981", count: 5 },
			{ name: t("Learning"), color: "#f59e0b", count: 3 },
		];

		projects.forEach(project => {
			const projectItem = projectsSection.createDiv({ cls: "project-item" });
			const colorDot = projectItem.createSpan({ cls: "project-color" });
			colorDot.style.backgroundColor = project.color;
			projectItem.createSpan({ text: project.name, cls: "project-name" });
			projectItem.createSpan({ text: project.count.toString(), cls: "project-count" });
		});

		// Other views section
		const otherSection = sidebar.createDiv({ cls: "v2-sidebar-section" });
		const otherHeader = otherSection.createDiv({ cls: "v2-section-header" });
		otherHeader.createSpan({ text: t("Other Views") });

		const otherItems = [
			{ label: t("Calendar"), icon: "calendar" },
			{ label: t("Gantt"), icon: "git-branch" },
			{ label: t("Tags"), icon: "tag" },
		];

		otherItems.forEach(item => {
			const navItem = otherSection.createDiv({ cls: "v2-nav-item" });
			const icon = navItem.createSpan({ cls: "v2-nav-icon" });
			setIcon(icon, item.icon);
			navItem.createSpan({ text: item.label, cls: "v2-nav-label" });
		});
	}

	/**
	 * Create a preview of the V2 TopNavigation component
	 */
	static createTopNavigationPreview(container: HTMLElement): void {
		container.addClass("tg-v2-container", "component-preview-topnav");

		const topNav = container.createDiv({ cls: "v2-top-navigation component-preview" });

		// Left section - Search
		const leftSection = topNav.createDiv({ cls: "v2-nav-left" });
		const searchContainer = leftSection.createDiv({ cls: "v2-search-container" });
		const searchInput = searchContainer.createEl("input", {
			type: "text",
			placeholder: t("Search tasks, projects ..."),
			attr: { disabled: "true" },
		});
		searchInput.addClass("search-input");

		// Center section - View mode tabs
		const centerSection = topNav.createDiv({ cls: "v2-nav-center" });
		const viewTabs = centerSection.createDiv({ cls: "v2-view-tabs" });

		const modes = [
			{ id: "list", label: t("List"), icon: "list" },
			{ id: "kanban", label: t("Kanban"), icon: "columns" },
			{ id: "tree", label: t("Tree"), icon: "network" },
			{ id: "calendar", label: t("Calendar"), icon: "calendar" },
		];

		modes.forEach((mode, index) => {
			const tab = viewTabs.createDiv({ cls: "v2-view-tab" });
			if (index === 0) tab.addClass("is-active");

			const icon = tab.createSpan({ cls: "v2-tab-icon" });
			setIcon(icon, mode.icon);
			tab.createSpan({ text: mode.label, cls: "v2-tab-label" });
		});

		// Right section - Actions
		const rightSection = topNav.createDiv({ cls: "v2-nav-right" });

		const filterBtn = rightSection.createDiv({ cls: "v2-nav-action" });
		setIcon(filterBtn, "filter");
		filterBtn.createSpan({ text: t("Filter") });

		const sortBtn = rightSection.createDiv({ cls: "v2-nav-action" });
		setIcon(sortBtn, "arrow-up-down");

		const settingsBtn = rightSection.createDiv({ cls: "v2-nav-action" });
		setIcon(settingsBtn, "settings");
	}

	/**
	 * Create a preview of the content area with task list
	 */
	static createContentAreaPreview(container: HTMLElement): void {
		container.addClass("tg-v2-container", "component-preview-content");

		const content = container.createDiv({ cls: "v2-content-area component-preview" });

		// Content header
		const header = content.createDiv({ cls: "v2-content-header" });
		header.createEl("h2", { text: t("Inbox") });
		const headerStats = header.createDiv({ cls: "v2-content-stats" });
		headerStats.createSpan({ text: `5 ${t("tasks")}` });

		// Task list
		const taskList = content.createDiv({ cls: "v2-task-list" });

		const mockTasks = [
			{ title: t("Review project proposal"), priority: "high", project: "Work" },
			{ title: t("Update documentation"), priority: "medium", project: "Work" },
			{ title: t("Buy groceries"), priority: "low", project: "Personal" },
			{ title: t("Finish online course"), priority: "medium", project: "Learning" },
			{ title: t("Schedule team meeting"), priority: "high", project: "Work" },
		];

		mockTasks.forEach(task => {
			const taskItem = taskList.createDiv({ cls: "v2-task-item" });

			const checkbox = taskItem.createDiv({ cls: "task-checkbox" });
			setIcon(checkbox, "circle");

			const taskContent = taskItem.createDiv({ cls: "task-content" });
			taskContent.createSpan({ text: task.title, cls: "task-title" });

			const taskMeta = taskContent.createDiv({ cls: "task-meta" });
			if (task.priority) {
				const priorityBadge = taskMeta.createSpan({ cls: `task-priority priority-${task.priority}` });
				priorityBadge.createSpan({ text: task.priority });
			}
			if (task.project) {
				const projectBadge = taskMeta.createSpan({ cls: "task-project" });
				projectBadge.createSpan({ text: task.project });
			}
		});
	}

	/**
	 * Create a preview of the project popover
	 */
	static createProjectPopoverPreview(container: HTMLElement): void {
		container.addClass("tg-v2-container", "component-preview-popover");

		const popover = container.createDiv({ cls: "project-popover component-preview" });

		// Popover header
		const header = popover.createDiv({ cls: "popover-header" });
		const colorDot = header.createSpan({ cls: "project-color-large" });
		colorDot.style.backgroundColor = "#3b82f6";

		const headerContent = header.createDiv({ cls: "popover-header-content" });
		headerContent.createEl("h3", { text: t("Work") });
		headerContent.createSpan({ text: `12 ${t("tasks")}`, cls: "project-task-count" });

		// Popover stats
		const stats = popover.createDiv({ cls: "popover-stats" });
		const statsItems = [
			{ label: t("Active"), value: "8" },
			{ label: t("Completed"), value: "24" },
			{ label: t("Overdue"), value: "2" },
		];

		statsItems.forEach(stat => {
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

		actionButtons.forEach(action => {
			const btn = actions.createDiv({ cls: "popover-action-btn" });
			const icon = btn.createSpan();
			setIcon(icon, action.icon);
			btn.createSpan({ text: action.label });
		});
	}
}
