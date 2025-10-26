import { Component, setIcon, Menu, Notice, Modal, Platform, SearchComponent, DropdownComponent } from "obsidian";
import { ProjectList } from "@/components/features/fluent/components/ProjectList";
import { FluentTaskNavigationItem } from "@/types/fluent-types";
import TaskProgressBarPlugin from "@/index";
import { t } from "@/translations/helper";
import { ViewConfigModal } from "@/components/features/task/view/modals/ViewConfigModal";
import { TASK_SPECIFIC_VIEW_TYPE } from "@/pages/TaskSpecificView";
import {
	ViewConfig,
	ViewFilterRule,
	ViewMode,
} from "@/common/setting-definition";

export class FluentSidebar extends Component {
	private containerEl: HTMLElement;
	private plugin: TaskProgressBarPlugin;
	public projectList: ProjectList;
	private collapsed = false;
	private isTreeView = false;
	private otherViewsSection: HTMLElement | null = null;
	private railEl: HTMLElement | null = null;
	private filterDropdownContainer: HTMLElement | null = null;
	private filterDropdown: import("obsidian").DropdownComponent | null = null;
	private searchComponent: SearchComponent | null = null;
	private clearFiltersBtn: HTMLElement | null = null;

	// Resizable sections
	private projectsSection: HTMLElement | null = null;
	private projectsSectionHeight = 60; // Default 60% for projects section
	private readonly SECTION_HEIGHT_KEY = "task-genius-projects-section-height";

	private primaryItems: FluentTaskNavigationItem[] = [
		{id: "inbox", label: t("Inbox"), icon: "inbox", type: "primary"},
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
		{id: "flagged", label: t("Flagged"), icon: "flag", type: "primary"},
	];

	private otherItems: FluentTaskNavigationItem[] = [
		{
			id: "calendar",
			label: t("Calendar"),
			icon: "calendar",
			type: "other",
		},
		{id: "gantt", label: t("Gantt"), icon: "git-branch", type: "other"},
		{
			id: "review",
			label: t("Review"),
			icon: "check-square",
			type: "other",
		},
		{id: "tags", label: t("Tags"), icon: "tag", type: "other"},
		{
			id: "project-manager",
			label: t("Project Manager"),
			icon: "list-ordered",
			type: "other",
		},
	];

	constructor(
		containerEl: HTMLElement,
		plugin: TaskProgressBarPlugin,
		private onNavigate: (viewId: string) => void,
		private onProjectSelect: (projectId: string) => void,
		private onSearch?: (query: string) => void,
		private onFilterSelect?: (configId: string | null) => void,
		collapsed = false
	) {
		super();
		this.containerEl = containerEl;
		this.plugin = plugin;
		this.collapsed = collapsed;

		// Load saved section height
		this.loadSectionHeight();
	}

	private loadSectionHeight() {
		const saved = this.plugin.app.loadLocalStorage(this.SECTION_HEIGHT_KEY);
		if (saved !== null && saved !== undefined) {
			const height = parseFloat(saved);
			if (!isNaN(height) && height >= 20 && height <= 80) {
				this.projectsSectionHeight = height;
			}
		}
	}

	private saveSectionHeight() {
		this.plugin.app.saveLocalStorage(
			this.SECTION_HEIGHT_KEY,
			String(this.projectsSectionHeight)
		);
	}

	private render() {
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

		// Header with new task button
		const header = this.containerEl.createDiv({
			cls: "fluent-sidebar-header",
		});

		// New Task Button
		const newTaskBtn = header.createEl("button", {
			cls: "fluent-new-task-btn",
			text: t("New Task"),
		});
		setIcon(newTaskBtn.createDiv({cls: "fluent-new-task-icon"}), "plus");
		newTaskBtn.addEventListener("click", () => {
			this.onNavigate("new-task");
		});

		// Main navigation area
		const content = this.containerEl.createDiv({
			cls: "fluent-sidebar-content",
		});

		// FILTERS AT TOP
		// Filter dropdown (first)
		if (this.onFilterSelect) {
			const filterSection = content.createDiv({
				cls: "fluent-sidebar-filter-section",
			});
			this.filterDropdownContainer = filterSection.createDiv({
				cls: "fluent-sidebar-filter-dropdown-container",
			});
			this.renderFilterDropdown();
		}

		// Search field (second)
		if (this.onSearch) {
			const searchSection = content.createDiv({
				cls: "fluent-sidebar-search-section",
			});
			const searchContainer = searchSection.createDiv({
				cls: "fluent-sidebar-search-container",
			});

			this.searchComponent = new SearchComponent(searchContainer)
				.setPlaceholder(t("Search tasks, projects"))
				.onChange((value) => {
					if (this.onSearch) {
						this.onSearch(value);
					}
					// Update clear button state when search changes
					this.updateClearButtonState();
				});

			// Clear filters button
			this.clearFiltersBtn = searchContainer.createDiv({
				cls: "fluent-clear-filters-btn",
				attr: {"aria-label": t("Clear all filters")},
			});
			setIcon(this.clearFiltersBtn, "x-circle");
			this.clearFiltersBtn.addEventListener("click", () => {
				if (!this.clearFiltersBtn?.hasClass("is-disabled")) {
					this.clearAllFilters();
				}
			});

			// Set initial state
			this.updateClearButtonState();
		}

		// Projects section (third - resizable)
		this.projectsSection = content.createDiv({
			cls: "fluent-sidebar-section fluent-sidebar-section-resizable",
		});
		// Apply saved height
		this.projectsSection.style.height = `${this.projectsSectionHeight}%`;
		const projectHeader = this.projectsSection.createDiv({
			cls: "fluent-section-header",
		});

		projectHeader.createSpan({text: t("Projects")});

		// Filter input for projects
		const filterContainer = projectHeader.createDiv({
			cls: "fluent-project-filter-container",
		});

		new SearchComponent(filterContainer)
			.setPlaceholder(t("Filter projects..."))
			.onChange((value) => {
				if (this.projectList) {
					(this.projectList as any).setFilterQuery?.(value);
				}
			});

		// Button container for tree toggle and sort
		const buttonContainer = projectHeader.createDiv({
			cls: "fluent-project-header-buttons",
		});

		// Hide completed projects toggle button
		const hideCompletedBtn = buttonContainer.createDiv({
			cls: "fluent-hide-completed-btn",
			attr: {"aria-label": t("Hide completed projects")},
		});
		setIcon(hideCompletedBtn, "check-circle");

		hideCompletedBtn.addEventListener("click", () => {
			if (this.projectList) {
				(this.projectList as any).toggleHideCompletedProjects?.();
				const isHidden = (this.projectList as any).getHideCompletedProjects?.() || false;
				// Update icon opacity to show active state
				if (isHidden) {
					hideCompletedBtn.addClass("is-active");
				} else {
					hideCompletedBtn.removeClass("is-active");
				}
			}
		});

		// Tree/List toggle button
		const treeToggleBtn = buttonContainer.createDiv({
			cls: "fluent-tree-toggle-btn",
			attr: {"aria-label": t("Toggle tree/list view")},
		});
		// Load saved view mode preference
		this.isTreeView =
			this.plugin.app.loadLocalStorage(
				"task-genius-project-view-mode"
			) === "tree";
		setIcon(treeToggleBtn, this.isTreeView ? "git-branch" : "list");

		treeToggleBtn.addEventListener("click", () => {
			this.isTreeView = !this.isTreeView;
			setIcon(treeToggleBtn, this.isTreeView ? "git-branch" : "list");
			// Save preference
			this.plugin.app.saveLocalStorage(
				"task-genius-project-view-mode",
				this.isTreeView ? "tree" : "list"
			);
			// Update project list view mode
			if (this.projectList) {
				(this.projectList as any).setViewMode?.(this.isTreeView);
			}
		});

		// Sort button
		const sortProjectBtn = buttonContainer.createDiv({
			cls: "fluent-sort-project-btn",
			attr: {"aria-label": t("Sort projects")},
		});
		setIcon(sortProjectBtn, "arrow-up-down");

		// Pass sort button to project list for menu handling
		sortProjectBtn.addEventListener("click", () => {
			(this.projectList as any).showSortMenu?.(sortProjectBtn);
		});

		const projectListEl = this.projectsSection.createDiv({
			cls: "fluent-project-list-container",
		});
		this.projectList = new ProjectList(
			projectListEl,
			this.plugin,
			(projectId: string) => {
				this.onProjectSelect(projectId);
				// Update clear button state when project selection changes
				this.updateClearButtonState();
			},
			this.isTreeView,
			hideCompletedBtn
		);
		// Add ProjectList as a child component
		this.addChild(this.projectList);

		// Resize handle
		const resizeHandle = content.createDiv({
			cls: "fluent-sidebar-resize-handle",
		});
		this.setupResizeHandle(resizeHandle);

		// VIEWS AT BOTTOM (in a resizable container with scrollbar)
		this.otherViewsSection = content.createDiv({
			cls: "fluent-sidebar-section fluent-sidebar-section-resizable fluent-sidebar-views-section",
		});
		// Calculate and apply views section height
		this.otherViewsSection.style.height = `${100 - this.projectsSectionHeight}%`;

		// Get all views (combining primary and other)
		const allViews = this.computeAllViews();

		// Create scrollable views container (no header, no divider, no overflow button)
		const viewsContainer = this.otherViewsSection.createDiv({
			cls: "fluent-sidebar-views-container",
		});

		// Render all views (scrollbar will handle overflow)
		this.renderNavigationItems(viewsContainer, allViews);
	}

	private setupResizeHandle(resizeHandle: HTMLElement) {
		let isResizing = false;
		let startY = 0;
		let startHeight = 0;

		const onMouseDown = (e: MouseEvent) => {
			isResizing = true;
			startY = e.clientY;
			startHeight = this.projectsSectionHeight;

			// Add resizing class to body for cursor
			document.body.addClass("fluent-sidebar-resizing");

			e.preventDefault();
		};

		const onMouseMove = (e: MouseEvent) => {
			if (!isResizing || !this.projectsSection || !this.otherViewsSection) {
				return;
			}

			// Calculate the container height
			const content = this.projectsSection.parentElement;
			if (!content) return;

			const contentRect = content.getBoundingClientRect();
			const contentHeight = contentRect.height;

			// Calculate delta and new percentage
			const deltaY = e.clientY - startY;
			const deltaPercent = (deltaY / contentHeight) * 100;
			let newHeight = startHeight + deltaPercent;

			// Constrain between 20% and 80%
			newHeight = Math.max(20, Math.min(80, newHeight));

			// Apply new heights
			this.projectsSectionHeight = newHeight;
			this.projectsSection.style.height = `${newHeight}%`;
			this.otherViewsSection.style.height = `${100 - newHeight}%`;

			e.preventDefault();
		};

		const onMouseUp = () => {
			if (isResizing) {
				isResizing = false;
				document.body.removeClass("fluent-sidebar-resizing");

				// Save the new height
				this.saveSectionHeight();
			}
		};

		// Register events
		this.registerDomEvent(resizeHandle, "mousedown", onMouseDown);
		this.registerDomEvent(document, "mousemove", onMouseMove);
		this.registerDomEvent(document, "mouseup", onMouseUp);
	}

	private renderRailMode() {
		if (!this.railEl) {
			return;
		}

		// Clear existing content
		this.railEl.empty();

		// All view icons (combined, no regions)
		const allViews = this.computeAllViews();

		// Render all views (rail mode will scroll if needed)
		allViews.forEach((item: FluentTaskNavigationItem) => {
			const btn = this.railEl!.createDiv({
				cls: "fluent-rail-btn",
				attr: {"aria-label": item.label, "data-view-id": item.id},
			});
			setIcon(btn, item.icon);
			btn.addEventListener("click", () => {
				this.setActiveItem(item.id);
				this.onNavigate(item.id);
			});
			// Add context menu handler for rail button
			btn.addEventListener("contextmenu", (e) => {
				this.showViewContextMenu(e as MouseEvent, item.id);
			});
		});

		// Projects menu button
		const projBtn = this.railEl!.createDiv({
			cls: "fluent-rail-btn",
			attr: {"aria-label": t("Projects")},
		});
		setIcon(projBtn, "folder");
		projBtn.addEventListener("click", (e) =>
			this.showProjectMenu(e as MouseEvent)
		);

		// Add (New Task) button
		const addBtn = this.railEl!.createDiv({
			cls: "fluent-rail-btn",
			attr: {"aria-label": t("New Task")},
		});
		setIcon(addBtn, "plus");
		addBtn.addEventListener("click", () => this.onNavigate("new-task"));
	}

	private renderOtherViewsSection() {
		if (!this.otherViewsSection || this.collapsed) {
			return;
		}

		// Clear existing content
		this.otherViewsSection.empty();

		// Get all views (combined, no regions)
		const allViews = this.computeAllViews();

		// Create scrollable views container (no header, no overflow button)
		const viewsContainer = this.otherViewsSection.createDiv({
			cls: "fluent-sidebar-views-container",
		});

		// Render all views (scrollbar will handle overflow)
		this.renderNavigationItems(viewsContainer, allViews);
	}

	/**
	 * Compute primary (top region) views from viewConfiguration
	 */
	private computePrimaryItems(): FluentTaskNavigationItem[] {
		try {
			const cfg = this.plugin?.settings?.viewConfiguration;
			if (!Array.isArray(cfg)) return this.primaryItems;

			// Exclude views that are represented elsewhere in the sidebar
			const excludeIds = new Set<string>(["projects"]);
			const seen = new Set<string>();
			const items: FluentTaskNavigationItem[] = [];

			for (const v of cfg) {
				// Only include visible views from the top region
				if (!v || v.visible === false || v.region !== "top") continue;
				const id = String(v.id);
				if (excludeIds.has(id) || seen.has(id)) continue;
				items.push({
					id,
					label: v.name || id,
					icon: v.icon || "list-plus",
					type: "primary",
				});
				seen.add(id);
			}

			// Fallback to default primary items if no top region views
			return items.length > 0 ? items : this.primaryItems;
		} catch (e) {
			return this.primaryItems;
		}
	}

	/**
	 * Compute other (bottom region) views from viewConfiguration
	 */
	private computeOtherItems(): FluentTaskNavigationItem[] {
		try {
			const cfg = this.plugin?.settings?.viewConfiguration;
			if (!Array.isArray(cfg)) return this.otherItems;

			// Exclude views that are represented elsewhere in the sidebar
			const excludeIds = new Set<string>(["projects"]);
			const seen = new Set<string>();
			const items: FluentTaskNavigationItem[] = [];

			for (const v of cfg) {
				// Only include visible views from the bottom region (or no region specified for backwards compat)
				if (!v || v.visible === false) continue;
				const region = v.region || "bottom"; // Default to bottom for backwards compatibility
				if (region !== "bottom") continue;
				const id = String(v.id);
				if (excludeIds.has(id) || seen.has(id)) continue;
				items.push({
					id,
					label: v.name || id,
					icon: v.icon || "list-plus",
					type: "other",
				});
				seen.add(id);
			}

			// Fallback to default other items if no bottom region views
			return items.length > 0 ? items : this.otherItems;
		} catch (e) {
			return this.otherItems;
		}
	}

	/**
	 * Compute all views (combining primary and other, ignoring regions)
	 */
	private computeAllViews(): FluentTaskNavigationItem[] {
		try {
			const cfg = this.plugin?.settings?.viewConfiguration;
			if (!Array.isArray(cfg)) {
				// Return combined default items
				return [...this.primaryItems, ...this.otherItems];
			}

			// Exclude views that are represented elsewhere in the sidebar
			const excludeIds = new Set<string>(["projects"]);
			const seen = new Set<string>();
			const items: FluentTaskNavigationItem[] = [];

			for (const v of cfg) {
				// Include all visible views (ignore region)
				if (!v || v.visible === false) continue;
				const id = String(v.id);
				if (excludeIds.has(id) || seen.has(id)) continue;
				items.push({
					id,
					label: v.name || id,
					icon: v.icon || "list-plus",
					type: "primary",
				});
				seen.add(id);
			}

			// Fallback to combined default items if no views found
			return items.length > 0 ? items : [...this.primaryItems, ...this.otherItems];
		} catch (e) {
			return [...this.primaryItems, ...this.otherItems];
		}
	}

	private renderFilterDropdown() {
		if (!this.filterDropdownContainer) return;

		this.filterDropdownContainer.empty();

		const savedFilters = this.plugin.settings.filterConfig.savedConfigs;

		this.filterDropdown = new DropdownComponent(
			this.filterDropdownContainer
		)
			.addOption("", t("All Tasks"))
			.onChange((value) => {
				if (this.onFilterSelect) {
					// null for "All Tasks", otherwise the config ID
					this.onFilterSelect(value || null);
				}
				// Update clear button state when filter changes
				this.updateClearButtonState();
			});

		// Add saved filter options
		savedFilters.forEach((config) => {
			this.filterDropdown?.addOption(config.id, config.name);
		});
	}

	public refreshFilterDropdown() {
		this.renderFilterDropdown();
	}

	public resetFilterDropdown() {
		if (this.filterDropdown) {
			this.filterDropdown.setValue("");
		}
	}

	/**
	 * Clear all filters - resets filter to "All tasks" and project to "All Projects"
	 */
	public clearAllFilters() {
		// Reset filter dropdown to "All tasks"
		this.resetFilterDropdown();

		// Clear the filter by calling onFilterSelect with null
		if (this.onFilterSelect) {
			this.onFilterSelect(null);
		}

		// Clear search query
		if (this.searchComponent) {
			this.searchComponent.setValue("");
		}
		if (this.onSearch) {
			this.onSearch("");
		}

		// Clear project selection (set to "All Projects")
		if (this.projectList) {
			(this.projectList as any).setActiveProject?.(null);
		}

		// Update button state after clearing
		this.updateClearButtonState();
	}

	/**
	 * Check if any filters are currently active
	 */
	private hasActiveFilters(): boolean {
		// Check search query
		const searchValue = this.searchComponent?.getValue() || "";
		if (searchValue.trim() !== "") {
			return true;
		}

		// Check filter dropdown (empty string means "All Tasks")
		const filterValue = this.filterDropdown?.getValue() || "";
		if (filterValue !== "") {
			return true;
		}

		// Check if any projects are selected
		const activeProjects = (this.projectList as any)?.activeProjectIds;
		if (activeProjects && activeProjects instanceof Set && activeProjects.size > 0) {
			return true;
		}

		return false;
	}

	/**
	 * Update the clear filters button disabled state
	 */
	public updateClearButtonState() {
		if (!this.clearFiltersBtn) return;

		const hasFilters = this.hasActiveFilters();

		if (hasFilters) {
			this.clearFiltersBtn.removeClass("is-disabled");
			this.clearFiltersBtn.setAttribute("aria-disabled", "false");
		} else {
			this.clearFiltersBtn.addClass("is-disabled");
			this.clearFiltersBtn.setAttribute("aria-disabled", "true");
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
		} else {
			this.render();
		}
	}

	onunload() {
		// Clean up is handled by Component base class
		this.containerEl.empty();
	}

	public setCollapsed(collapsed: boolean) {
		this.collapsed = collapsed;
		// On mobile, don't re-render when toggling collapse
		// The CSS will handle the drawer animation
		if (!Platform.isPhone) {
			this.render();
		} else {
			// Just toggle the class for mobile
			this.containerEl.toggleClass("is-collapsed", collapsed);
		}
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

	private showOtherViewsMenu(event: MouseEvent, items: FluentTaskNavigationItem[]) {
		const menu = new Menu();
		items.forEach((it: FluentTaskNavigationItem) => {
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

	private showViewContextMenu(event: MouseEvent, viewId: string) {
		event.preventDefault();
		event.stopPropagation();

		const menu = new Menu();

		// Check if this is a primary view
		const primaryItems = this.computePrimaryItems();
		const isPrimaryView = primaryItems.some(
			(item) => item.id === viewId
		);

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
				.onClick(async () => {
					// Special handling for habit view
					if (viewId === "habit") {
						(this.plugin.app as any).setting.open();
						(this.plugin.app as any).setting.openTabById(
							this.plugin.manifest.id
						);
						setTimeout(() => {
							if (this.plugin.settingTab) {
								this.plugin.settingTab.openTab("habit");
							}
						}, 100);
						return;
					}

					// Normal handling for other views
					const view = this.plugin.settings.viewConfiguration.find(
						(v) => v.id === viewId
					);
					if (!view) {
						return;
					}
					const currentRules = view?.filterRules || {};
					new ViewConfigModal(
						this.plugin.app,
						this.plugin,
						view,
						currentRules,
						(
							updatedView: ViewConfig,
							updatedRules: ViewFilterRule
						) => {
							const currentIndex =
								this.plugin.settings.viewConfiguration.findIndex(
									(v) => v.id === updatedView.id
								);
							if (currentIndex !== -1) {
								this.plugin.settings.viewConfiguration[
									currentIndex
									] = {
									...updatedView,
									filterRules: updatedRules,
								};
								this.plugin.saveSettings();
								// Re-render if visibility changed
								if (view.visible !== updatedView.visible) {
									this.render();
								}
								// Trigger view config changed event
								this.plugin.app.workspace.trigger(
									"task-genius:view-config-changed",
									{reason: "edit", viewId: viewId}
								);
							}
						}
					).open();
				});
		});

		// Hide in sidebar - only for non-primary views
		if (!isPrimaryView) {
			// Copy view
			menu.addItem((item) => {
				item.setTitle(t("Copy view"))
					.setIcon("copy")
					.onClick(() => {
						const view =
							this.plugin.settings.viewConfiguration.find(
								(v) => v.id === viewId
							);
						if (!view) {
							return;
						}
						// Create a copy of the current view
						new ViewConfigModal(
							this.plugin.app,
							this.plugin,
							null, // null for create mode
							null, // null for create mode
							(
								createdView: ViewConfig,
								createdRules: ViewFilterRule
							) => {
								if (
									!this.plugin.settings.viewConfiguration.some(
										(v) => v.id === createdView.id
									)
								) {
									this.plugin.settings.viewConfiguration.push(
										{
											...createdView,
											filterRules: createdRules,
										}
									);
									this.plugin.saveSettings();
									// Re-render the sidebar to show the new view
									this.render();
									// Trigger view config changed event
									this.plugin.app.workspace.trigger(
										"task-genius:view-config-changed",
										{
											reason: "create",
											viewId: createdView.id,
										}
									);
									new Notice(
										t("View copied successfully: ") +
										createdView.name
									);
								} else {
									new Notice(
										t("Error: View ID already exists.")
									);
								}
							},
							view, // Pass current view as copy source
							view.id
						).open();
					});
			});

			menu.addItem((item) => {
				item.setTitle(t("Hide in sidebar"))
					.setIcon("eye-off")
					.onClick(() => {
						const view =
							this.plugin.settings.viewConfiguration.find(
								(v) => v.id === viewId
							);
						if (!view) {
							return;
						}
						view.visible = false;
						this.plugin.saveSettings();
						// Re-render based on current mode
						if (this.collapsed) {
							this.renderRailMode();
						} else {
							this.renderOtherViewsSection();
						}
						// Trigger view config changed event
						this.plugin.app.workspace.trigger(
							"task-genius:view-config-changed",
							{reason: "visibility", viewId: viewId}
						);
					});
			});
		}

		// Delete (for custom views only)
		const view = this.plugin.settings.viewConfiguration.find(
			(v) => v.id === viewId
		);
		if (view?.type === "custom") {
			menu.addSeparator();
			menu.addItem((item) => {
				item.setTitle(t("Delete"))
					.setIcon("trash")
					.setWarning(true)
					.onClick(() => {
						this.plugin.settings.viewConfiguration =
							this.plugin.settings.viewConfiguration.filter(
								(v) => v.id !== viewId
							);
						this.plugin.saveSettings();
						// Re-render based on current mode
						if (this.collapsed) {
							this.renderRailMode();
						} else {
							this.renderOtherViewsSection();
						}
						// Trigger view config changed event
						this.plugin.app.workspace.trigger(
							"task-genius:view-config-changed",
							{reason: "delete", viewId: viewId}
						);
						new Notice(t("View deleted: ") + view.name);
					});
			});
		}

		menu.showAtMouseEvent(event);
	}

	private renderNavigationItems(
		containerEl: HTMLElement,
		items: FluentTaskNavigationItem[]
	) {
		const list = containerEl.createDiv({cls: "fluent-navigation-list"});
		items.forEach((item) => {
			const itemEl = list.createDiv({
				cls: "fluent-navigation-item",
				attr: {"data-view-id": item.id},
			});
			const icon = itemEl.createDiv({cls: "fluent-navigation-icon"});
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
				this.showViewContextMenu(e as MouseEvent, item.id);
			});
		});
	}

	public setActiveItem(viewId: string) {
		// Clear active state from both full navigation items and rail buttons
		this.containerEl
			.querySelectorAll(
				".fluent-navigation-item, .fluent-rail-btn[data-view-id]"
			)
			.forEach((el) => {
				el.removeClass("is-active");
			});
		// Apply to any element that carries this view id (works in both modes)
		const activeEls = this.containerEl.querySelectorAll(
			`[data-view-id="${viewId}"]`
		);
		activeEls.forEach((el) => el.addClass("is-active"));
	}
}
