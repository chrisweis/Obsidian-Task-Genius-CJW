import { setIcon, Menu } from "obsidian";
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
	private collapsed: boolean = false;

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
		collapsed: boolean = false
	) {
		this.containerEl = containerEl;
		this.plugin = plugin;
		this.collapsed = collapsed;

		this.render();
	}

	private render() {
		this.containerEl.empty();
		this.containerEl.addClass("v2-sidebar");
		this.containerEl.toggleClass("is-collapsed", this.collapsed);

		// Collapsed rail mode: show compact icons for workspace, views, projects, and add
		if (this.collapsed) {
			const rail = this.containerEl.createDiv({ cls: "v2-sidebar-rail" });

			// Workspace menu button
			const wsBtn = rail.createDiv({
				cls: "v2-rail-btn",
				attr: { "aria-label": t("Workspace") },
			});
			setIcon(wsBtn, "layers");
			wsBtn.addEventListener("click", (e) =>
				this.showWorkspaceMenu(e as MouseEvent)
			);

			// Primary view icons
			this.primaryItems.forEach((item) => {
				const btn = rail.createDiv({
					cls: "v2-rail-btn",
					attr: { "aria-label": item.label, "data-view-id": item.id },
				});
				setIcon(btn, item.icon);
				btn.addEventListener("click", () => {
					this.setActiveItem(item.id);
					this.onNavigate(item.id);
				});
			});

			// Other view icons
			const otherItems = this.computeOtherItems();
			otherItems.forEach((item: V2NavigationItem) => {
				const btn = rail.createDiv({
					cls: "v2-rail-btn",
					attr: { "aria-label": item.label, "data-view-id": item.id },
				});
				setIcon(btn, item.icon);
				btn.addEventListener("click", () => {
					this.setActiveItem(item.id);
					this.onNavigate(item.id);
				});
			});

			// Projects menu button
			const projBtn = rail.createDiv({
				cls: "v2-rail-btn",
				attr: { "aria-label": t("Projects") },
			});
			setIcon(projBtn, "folder");
			projBtn.addEventListener("click", (e) =>
				this.showProjectMenu(e as MouseEvent)
			);

			// Add (New Task) button
			const addBtn = rail.createDiv({
				cls: "v2-rail-btn",
				attr: { "aria-label": t("New Task") },
			});
			setIcon(addBtn, "plus");
			addBtn.addEventListener("click", () => this.onNavigate("new-task"));

			return;
		}

		// Header with workspace selector and new task button
		const header = this.containerEl.createDiv({ cls: "v2-sidebar-header" });

		const workspaceSelectorEl = header.createDiv();
		this.workspaceSelector = new WorkspaceSelector(
			workspaceSelectorEl,
			this.workspaces,
			this.currentWorkspace,
			this.onWorkspaceChange
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
			this.onProjectSelect
		);
		// Load projects data
		this.projectList.refresh();

		// Other views section
		const otherSection = content.createDiv({ cls: "v2-sidebar-section" });
		const otherHeader = otherSection.createDiv({
			cls: "v2-section-header",
		});
		otherHeader.createSpan({ text: "Other Views" });
		this.renderNavigationItems(otherSection, this.computeOtherItems());
	}

	private computeOtherItems(): V2NavigationItem[] {
		try {
			const cfg = this.plugin?.settings?.viewConfiguration;
			if (!Array.isArray(cfg)) return this.otherItems;

			const primaryIds = new Set(this.primaryItems.map((i) => i.id));
			// Exclude views that are represented elsewhere in the sidebar (e.g., Projects list)
			const excludeIds = new Set<string>(["projects"]);
			const seen = new Set<string>();
			const items: V2NavigationItem[] = [];

			for (const v of cfg) {
				if (!v || v.visible === false) continue;
				const id = String(v.id);
				if (primaryIds.has(id) || excludeIds.has(id)) continue;
				if (seen.has(id)) continue;
				items.push({
					id,
					label: v.name || id,
					icon: v.icon || "list-plus",
					type: "other",
				});
				seen.add(id);
			}

			return items.length ? items : this.otherItems;
		} catch (e) {
			return this.otherItems;
		}
	}

	public setCollapsed(collapsed: boolean) {
		this.collapsed = collapsed;
		this.render();
	}

	private showWorkspaceMenu(event: MouseEvent) {
		const menu = new Menu();
		this.workspaces.forEach((w) => {
			menu.addItem((item) => {
				item.setTitle(w.name)
					.setIcon("layers")
					.onClick(() => {
						this.currentWorkspace = w;
						this.onWorkspaceChange(w);
						this.render();
					});
				if (w.id === this.currentWorkspace.id) item.setChecked(true);
			});
		});
		menu.showAtMouseEvent(event);
	}

	private showProjectMenu(event: MouseEvent) {
		// Try to use existing project list data; if missing, build a temporary one
		let projects: any[] = [];
		const anyList: any = this.projectList as any;
		if (anyList && typeof anyList.getProjects === "function") {
			projects = anyList.getProjects();
		} else {
			const temp = document.createElement("div");
			const tempList: any = new ProjectList(
				temp as any,
				this.plugin,
				this.onProjectSelect
			);
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

	private renderNavigationItems(
		containerEl: HTMLElement,
		items: V2NavigationItem[]
	) {
		const list = containerEl.createDiv({ cls: "v2-navigation-list" });
		items.forEach((item) => {
			const itemEl = list.createDiv({
				cls: "v2-navigation-item",
				attr: { "data-view-id": item.id },
			});
			const icon = itemEl.createDiv({ cls: "v2-navigation-icon" });
			setIcon(icon, item.icon);
			itemEl.createSpan({ cls: "v2-navigation-label", text: item.label });
			if (item.badge) {
				itemEl.createDiv({
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
		// Clear active state from both full navigation items and rail buttons
		this.containerEl
			.querySelectorAll(".v2-navigation-item, .v2-rail-btn[data-view-id]")
			.forEach((el) => {
				el.removeClass("is-active");
			});
		// Apply to any element that carries this view id (works in both modes)
		const activeEls = this.containerEl.querySelectorAll(
			`[data-view-id="${viewId}"]`
		);
		activeEls.forEach((el) => el.addClass("is-active"));
	}

	public updateWorkspace(workspace: Workspace) {
		this.currentWorkspace = workspace;
		this.workspaceSelector?.setWorkspace(workspace);
		this.projectList?.refresh();
	}
}
