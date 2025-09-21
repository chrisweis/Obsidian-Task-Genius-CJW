import { setIcon, Menu, Notice, SearchComponent } from "obsidian";
import TaskProgressBarPlugin from "@/index";
import { Task } from "@/types/task";
import { t } from "@/translations/helper";

export type ViewMode = "list" | "kanban" | "tree" | "calendar";

export class TopNavigation {
	private containerEl: HTMLElement;
	private plugin: TaskProgressBarPlugin;
	private searchInput: HTMLInputElement;
	private currentViewMode: ViewMode = "list";
	private notificationCount = 0;

	constructor(
		containerEl: HTMLElement,
		plugin: TaskProgressBarPlugin,
		private onSearch: (query: string) => void,
		private onViewModeChange: (mode: ViewMode) => void,
		private onFilterClick: () => void,
		private onSortClick: () => void,
		private onSettingsClick: () => void
	) {
		this.containerEl = containerEl;
		this.plugin = plugin;

		this.updateNotificationCount();
		this.render();
	}

	private async updateNotificationCount() {
		let tasks: Task[] = [];
		if (this.plugin.dataflowOrchestrator) {
			const queryAPI = this.plugin.dataflowOrchestrator.getQueryAPI();
			tasks = await queryAPI.getAllTasks();
		} else {
			tasks = this.plugin.preloadedTasks || [];
		}
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		this.notificationCount = tasks.filter((task: Task) => {
			if (task.completed) return false;
			const dueDate = task.metadata?.dueDate
				? new Date(task.metadata.dueDate)
				: null;
			return dueDate && dueDate <= today;
		}).length;

		this.updateNotificationBadge();
	}

	private render() {
		this.containerEl.empty();
		this.containerEl.addClass("v2-top-navigation");

		// Left section - Search
		const leftSection = this.containerEl.createDiv({ cls: "v2-nav-left" });
		const searchContainer = leftSection.createDiv({
			cls: "v2-search-container",
		});

		new SearchComponent(searchContainer)
			.setPlaceholder(t("Search tasks, projects ..."))
			.onChange((value) => {
				this.onSearch(value);
			});

		// Center section - View mode tabs
		const centerSection = this.containerEl.createDiv({
			cls: "v2-nav-center",
		});
		const viewTabs = centerSection.createDiv({ cls: "v2-view-tabs" });

		this.createViewTab(viewTabs, "list", "list", "List");
		this.createViewTab(viewTabs, "kanban", "layout-grid", "Kanban");
		this.createViewTab(viewTabs, "tree", "git-branch", "Tree");
		this.createViewTab(viewTabs, "calendar", "calendar", "Calendar");

		// Right section - Notifications and Settings
		const rightSection = this.containerEl.createDiv({
			cls: "v2-nav-right",
		});

		// Notification button
		const notificationBtn = rightSection.createDiv({
			cls: "v2-nav-icon-button",
		});
		setIcon(notificationBtn, "bell");
		const badge = notificationBtn.createDiv({
			cls: "v2-notification-badge",
			text: String(this.notificationCount),
		});
		if (this.notificationCount === 0) {
			badge.hide();
		}
		notificationBtn.addEventListener("click", (e) =>
			this.showNotifications(e)
		);

		// Settings button
		const settingsBtn = rightSection.createDiv({
			cls: "v2-nav-icon-button",
		});
		setIcon(settingsBtn, "settings");
		settingsBtn.addEventListener("click", () => this.onSettingsClick());
	}

	private createViewTab(
		container: HTMLElement,
		mode: ViewMode,
		icon: string,
		label: string
	) {
		const tab = container.createEl("button", {
			cls: ["v2-view-tab", "clickable-icon"],
			attr: { "data-mode": mode },
		});

		if (mode === this.currentViewMode) {
			tab.addClass("is-active");
		}

		setIcon(tab.createDiv({ cls: "v2-view-tab-icon" }), icon);
		tab.createSpan({ text: label });

		tab.addEventListener("click", () => {
			this.setViewMode(mode);
			this.onViewModeChange(mode);
		});
	}

	private setViewMode(mode: ViewMode) {
		this.currentViewMode = mode;

		this.containerEl.querySelectorAll(".v2-view-tab").forEach((tab) => {
			tab.removeClass("is-active");
		});

		const activeTab = this.containerEl.querySelector(
			`[data-mode="${mode}"]`
		);
		if (activeTab) {
			activeTab.addClass("is-active");
		}
	}

	private async showNotifications(event: MouseEvent) {
		const menu = new Menu();

		let tasks: Task[] = [];
		if (this.plugin.dataflowOrchestrator) {
			const queryAPI = this.plugin.dataflowOrchestrator.getQueryAPI();
			tasks = await queryAPI.getAllTasks();
		} else {
			tasks = this.plugin.preloadedTasks || [];
		}
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const overdueTasks = tasks
			.filter((task: Task) => {
				if (task.completed) return false;
				const dueDate = task.metadata?.dueDate
					? new Date(task.metadata.dueDate)
					: null;
				return dueDate && dueDate <= today;
			})
			.slice(0, 10);

		if (overdueTasks.length === 0) {
			menu.addItem((item) => {
				item.setTitle("No overdue tasks").setDisabled(true);
			});
		} else {
			menu.addItem((item) => {
				item.setTitle(
					`${overdueTasks.length} overdue tasks`
				).setDisabled(true);
			});

			menu.addSeparator();

			overdueTasks.forEach((task) => {
				menu.addItem((item) => {
					item.setTitle(task.content || "Untitled task")
						.setIcon("alert-circle")
						.onClick(() => {
							new Notice(`Task: ${task.content}`);
						});
				});
			});
		}

		menu.showAtMouseEvent(event);
	}

	private updateNotificationBadge() {
		const badge = this.containerEl.querySelector(".v2-notification-badge");
		if (badge instanceof HTMLElement) {
			badge.textContent = String(this.notificationCount);
			if (this.notificationCount === 0) {
				badge.hide();
			} else {
				badge.show();
			}
		}
	}

	public refresh() {
		this.updateNotificationCount();
	}

	public getSearchQuery(): string {
		return this.searchInput?.value || "";
	}

	public clearSearch() {
		if (this.searchInput) {
			this.searchInput.value = "";
			this.onSearch("");
		}
	}
}
