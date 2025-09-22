import { Component, setIcon, Menu, Notice, Modal } from "obsidian";
import { WorkspaceSelector } from "./WorkspaceSelector";
import { ProjectList } from "@/experimental/v2/components/ProjectList";
import { V2NavigationItem } from "@/experimental/v2/types";
import { WorkspaceData } from "@/experimental/v2/types/workspace";
import {
	onWorkspaceSwitched,
	onWorkspaceDeleted,
	onWorkspaceCreated,
} from "@/experimental/v2/events/ui-event";
import TaskProgressBarPlugin from "@/index";
import { t } from "@/translations/helper";

export class V2Sidebar extends Component {
	private containerEl: HTMLElement;
	private plugin: TaskProgressBarPlugin;
	private workspaceSelector: WorkspaceSelector;
	public projectList: ProjectList;
	private collapsed: boolean = false;
	private currentWorkspaceId: string;

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
		private onNavigate: (viewId: string) => void,
		private onProjectSelect: (projectId: string) => void,
		collapsed: boolean = false
	) {
		super();
		this.containerEl = containerEl;
		this.plugin = plugin;
		this.collapsed = collapsed;
		this.currentWorkspaceId =
			plugin.workspaceManager?.getActiveWorkspace().id || "";
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
				this.showWorkspaceMenuWithManager(e as MouseEvent)
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

			// Other view icons with overflow menu when > 5
			const allOtherItems = this.computeOtherItems();
			const visibleCount =
				this.plugin?.settings?.experimental?.v2Config
					?.maxOtherViewsBeforeOverflow ?? 5;
			const displayedOther: V2NavigationItem[] = allOtherItems.slice(
				0,
				visibleCount
			);
			const remainingOther: V2NavigationItem[] =
				allOtherItems.slice(visibleCount);
			displayedOther.forEach((item: V2NavigationItem) => {
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
			if (remainingOther.length > 0) {
				const moreBtn = rail.createDiv({
					cls: "v2-rail-btn",
					attr: { "aria-label": t("More views") },
				});
				setIcon(moreBtn, "more-horizontal");
				moreBtn.addEventListener("click", (e) =>
					this.showOtherViewsMenu(e as MouseEvent, remainingOther)
				);
			}

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
		if (this.plugin.workspaceManager) {
			this.workspaceSelector = new WorkspaceSelector(
				workspaceSelectorEl,
				this.plugin,
				(workspaceId: string) => this.handleWorkspaceChange(workspaceId)
			);
		}

		// New Task Button
		const newTaskBtn = header.createEl("button", {
			cls: "v2-new-task-btn",
			text: t("New Task"),
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

		projectHeader.createSpan({ text: t("Projects") });
		const sortProjectBtn = projectHeader.createDiv({
			cls: "v2-sort-project-btn",
			attr: { "aria-label": t("Sort projects") },
		});
		setIcon(sortProjectBtn, "arrow-up-down");

		// Pass sort button to project list for menu handling
		sortProjectBtn.addEventListener("click", () => {
			(this.projectList as any).showSortMenu?.(sortProjectBtn);
		});

		const projectListEl = projectsSection.createDiv();
		this.projectList = new ProjectList(
			projectListEl,
			this.plugin,
			this.onProjectSelect
		);
		// Add ProjectList as a child component
		this.addChild(this.projectList);

		// Other views section
		const otherSection = content.createDiv({ cls: "v2-sidebar-section" });
		const otherHeader = otherSection.createDiv({
			cls: "v2-section-header",
		});
		const allOtherItems = this.computeOtherItems();
		const visibleCount = 5;
		const displayedOther: V2NavigationItem[] = allOtherItems.slice(
			0,
			visibleCount
		);
		const remainingOther: V2NavigationItem[] =
			allOtherItems.slice(visibleCount);
		otherHeader.createSpan({ text: t("Other Views") });
		if (remainingOther.length > 0) {
			const moreBtn = otherHeader.createDiv({
				cls: "v2-section-action",
				attr: { "aria-label": t("More views") },
			});
			setIcon(moreBtn, "more-horizontal");
			moreBtn.addEventListener("click", (e) =>
				this.showOtherViewsMenu(e as MouseEvent, remainingOther)
			);
		}
		this.renderNavigationItems(otherSection, displayedOther);
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

	onload() {
		this.render();

		// Subscribe to workspace events
		if (this.plugin.workspaceManager) {
			this.registerEvent(
				onWorkspaceSwitched(this.plugin.app, (payload) => {
					this.currentWorkspaceId = payload.workspaceId;
					this.render();
				})
			);

			this.registerEvent(
				onWorkspaceDeleted(this.plugin.app, () => {
					this.render();
				})
			);

			this.registerEvent(
				onWorkspaceCreated(this.plugin.app, () => {
					this.render();
				})
			);
		}
	}

	onunload() {
		// Clean up is handled by Component base class
		this.containerEl.empty();
	}

	public setCollapsed(collapsed: boolean) {
		this.collapsed = collapsed;
		this.render();
	}

	private async handleWorkspaceChange(workspaceId: string) {
		if (this.plugin.workspaceManager) {
			await this.plugin.workspaceManager.setActiveWorkspace(workspaceId);
			this.currentWorkspaceId = workspaceId;
		}
	}

	private showWorkspaceMenuWithManager(event: MouseEvent) {
		if (!this.plugin.workspaceManager) return;

		const menu = new Menu();
		const workspaces = this.plugin.workspaceManager.getAllWorkspaces();
		const currentWorkspace =
			this.plugin.workspaceManager.getActiveWorkspace();

		workspaces.forEach((w) => {
			menu.addItem((item) => {
				const isDefault =
					this.plugin.workspaceManager?.isDefaultWorkspace(w.id);
				const title = isDefault ? `${w.name} 🔒` : w.name;

				item.setTitle(title)
					.setIcon("layers")
					.onClick(async () => {
						await this.handleWorkspaceChange(w.id);
					});
				if (w.id === currentWorkspace.id) item.setChecked(true);
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

	private showCreateWorkspaceDialog() {
		class CreateWorkspaceModal extends Modal {
			private nameInput: HTMLInputElement;

			constructor(
				private plugin: TaskProgressBarPlugin,
				private onCreated: () => void
			) {
				super(plugin.app);
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

				createButton.addEventListener("click", async () => {
					const name = this.nameInput.value.trim();
					if (name && this.plugin.workspaceManager) {
						await this.plugin.workspaceManager.createWorkspace(
							name
						);
						new Notice(
							t('Workspace "{{name}}" created', {
								interpolation: {
									name: name,
								},
							})
						);
						this.onCreated();
						this.close();
					} else {
						new Notice(t("Please enter a workspace name"));
					}
				});

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

	private showOtherViewsMenu(event: MouseEvent, items: V2NavigationItem[]) {
		const menu = new Menu();
		items.forEach((it: V2NavigationItem) => {
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

	public updateWorkspace(workspaceOrId: string | WorkspaceData) {
		const workspaceId =
			typeof workspaceOrId === "string"
				? workspaceOrId
				: workspaceOrId.id;
		this.currentWorkspaceId = workspaceId;
		this.workspaceSelector?.setWorkspace(workspaceId);
		this.projectList?.refresh();
	}
}
