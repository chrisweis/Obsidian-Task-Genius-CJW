import { setIcon } from "obsidian";
import { WorkspaceSelector } from "./WorkspaceSelector";
import { ProjectList } from "@/experimental/v2/components/ProjectList";
import { Workspace, V2NavigationItem } from "@/experimental/v2/types";
import TaskProgressBarPlugin from "@/index";
import { t } from "@/translations/helper";

export class V2Sidebar {
	private containerEl: HTMLElement;
	private plugin: TaskProgressBarPlugin;
	private workspaceSelector: WorkspaceSelector;
	public projectList: ProjectList;

	private primaryItems: V2NavigationItem[] = [
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

	private otherItems: V2NavigationItem[] = [
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

	constructor(
		containerEl: HTMLElement,
		plugin: TaskProgressBarPlugin,
		private currentWorkspace: Workspace,
		private workspaces: Workspace[],
		private onNavigate: (viewId: string) => void,
		private onWorkspaceChange: (workspace: Workspace) => void,
		private onProjectSelect: (projectId: string) => void,
	) {
		this.containerEl = containerEl;
		this.plugin = plugin;

		this.render();
	}

	private render() {
		this.containerEl.empty();
		this.containerEl.addClass("v2-sidebar");

		// Header with workspace selector and new task button
		const header = this.containerEl.createDiv({ cls: "v2-sidebar-header" });

		const workspaceSelectorEl = header.createDiv();
		this.workspaceSelector = new WorkspaceSelector(
			workspaceSelectorEl,
			this.workspaces,
			this.currentWorkspace,
			this.onWorkspaceChange,
		);

		// New Task Button
		const newTaskBtn = header.createEl("button", {
			cls: "v2-new-task-btn",
			text: "New Task",
		});
		setIcon(newTaskBtn.createDiv({ cls: "v2-new-task-icon" }), "plus");
		newTaskBtn.addEventListener("click", () => {
			this.onNavigate("new-task");
		});

		// Main navigation area
		const content = this.containerEl.createDiv({
			cls: "v2-sidebar-content",
		});

		// Primary navigation section
		const primarySection = content.createDiv({ cls: "v2-sidebar-section" });
		this.renderNavigationItems(primarySection, this.primaryItems);

		// Projects section
		const projectsSection = content.createDiv({
			cls: "v2-sidebar-section",
		});
		const projectHeader = projectsSection.createDiv({
			cls: "v2-section-header",
		});
		projectHeader.createSpan({ text: "Projects" });
		const addProjectBtn = projectHeader.createDiv({
			cls: "v2-add-project-btn",
		});
		setIcon(addProjectBtn, "plus");

		const projectListEl = projectsSection.createDiv();
		this.projectList = new ProjectList(
			projectListEl,
			this.plugin,
			this.onProjectSelect,
		);
		// Load projects data
		this.projectList.refresh();

		// Other views section
		const otherSection = content.createDiv({ cls: "v2-sidebar-section" });
		const otherHeader = otherSection.createDiv({
			cls: "v2-section-header",
		});
		otherHeader.createSpan({ text: "Other Views" });
		this.renderNavigationItems(otherSection, this.otherItems);
	}

	private renderNavigationItems(
		containerEl: HTMLElement,
		items: V2NavigationItem[],
	) {
		const list = containerEl.createDiv({ cls: "v2-navigation-list" });

		items.forEach((item) => {
			const itemEl = list.createDiv({
				cls: "v2-navigation-item",
				attr: { "data-view-id": item.id },
			});

			const icon = itemEl.createDiv({ cls: "v2-navigation-icon" });
			setIcon(icon, item.icon);

			itemEl.createSpan({
				cls: "v2-navigation-label",
				text: item.label,
			});

			if (item.badge) {
				const badge = itemEl.createDiv({
					cls: "v2-navigation-badge",
					text: String(item.badge),
				});
			}

			itemEl.addEventListener("click", () => {
				this.setActiveItem(item.id);
				this.onNavigate(item.id);
			});
		});
	}

	public setActiveItem(viewId: string) {
		this.containerEl
			.querySelectorAll(".v2-navigation-item")
			.forEach((el) => {
				el.removeClass("is-active");
			});

		const activeEl = this.containerEl.querySelector(
			`[data-view-id="${viewId}"]`,
		);
		if (activeEl) {
			activeEl.addClass("is-active");
		}
	}

	public updateWorkspace(workspace: Workspace) {
		this.currentWorkspace = workspace;
		this.workspaceSelector?.setWorkspace(workspace);
		this.projectList?.refresh();
	}
}
