import { Component, Platform, setIcon, Menu, Modal, App } from "obsidian";
import TaskProgressBarPlugin from "../../../index";
import { Task } from "../../../types/task";
import { ProjectPopover, ProjectModal, EditProjectModal } from "./ProjectPopover";
import type { CustomProject } from "../../../common/setting-definition";
import { t } from "@/translations/helper";

interface Project {
	id: string;
	name: string;
	displayName?: string;
	color: string;
	taskCount: number;
	createdAt?: number;
	updatedAt?: number;
}

type SortOption =
	| "name-asc"
	| "name-desc"
	| "tasks-asc"
	| "tasks-desc"
	| "created-asc"
	| "created-desc";

export class ProjectList extends Component {
	private containerEl: HTMLElement;
	private plugin: TaskProgressBarPlugin;
	private projects: Project[] = [];
	private activeProjectId: string | null = null;
	private onProjectSelect: (projectId: string) => void;
	private currentPopover: ProjectPopover | null = null;
	private currentSort: SortOption = "name-asc";
	private readonly STORAGE_KEY = "task-genius-project-sort";
	private collator: Intl.Collator;

	constructor(
		containerEl: HTMLElement,
		plugin: TaskProgressBarPlugin,
		onProjectSelect: (projectId: string) => void
	) {
		super();
		this.containerEl = containerEl;
		this.plugin = plugin;
		this.onProjectSelect = onProjectSelect;

		// Initialize collator with locale-sensitive sorting
		// Use numeric option to handle numbers naturally (e.g., "Project 2" < "Project 10")
		this.collator = new Intl.Collator(undefined, {
			numeric: true,
			sensitivity: "base", // Case-insensitive comparison
		});
	}

	async onload() {
		await this.loadSortPreference();
		await this.loadProjects();
		this.render();
	}

	onunload() {
		// Clean up any open popover
		if (this.currentPopover) {
			this.removeChild(this.currentPopover);
			this.currentPopover = null;
		}

		// Clear container
		this.containerEl.empty();
	}

	private async loadProjects() {
		let tasks: Task[] = [];
		if (this.plugin.dataflowOrchestrator) {
			const queryAPI = this.plugin.dataflowOrchestrator.getQueryAPI();
			tasks = await queryAPI.getAllTasks();
		} else {
			tasks = this.plugin.preloadedTasks || [];
		}
		const projectMap = new Map<string, Project>();

		tasks.forEach((task: Task) => {
			const projectName = task.metadata?.project;
			if (projectName) {
				if (!projectMap.has(projectName)) {
					// Convert dashes back to spaces for display
					const displayName = projectName.replace(/-/g, ' ');
					projectMap.set(projectName, {
						id: projectName,
						name: projectName,
						displayName: displayName,
						color: this.generateColorForProject(projectName),
						taskCount: 0,
					});
				}
				const project = projectMap.get(projectName);
				if (project) {
					project.taskCount++;
				}
			}
		});

		this.projects = Array.from(projectMap.values());

		// Load custom projects
		this.loadCustomProjects();

		// Apply sorting
		this.sortProjects();

		this.render();
	}

	private async loadSortPreference() {
		const saved = await this.plugin.app.loadLocalStorage(this.STORAGE_KEY);
		if (saved && this.isValidSortOption(saved)) {
			this.currentSort = saved as SortOption;
		}
	}

	private async saveSortPreference() {
		await this.plugin.app.saveLocalStorage(
			this.STORAGE_KEY,
			this.currentSort
		);
	}

	private isValidSortOption(value: string): boolean {
		return [
			"name-asc",
			"name-desc",
			"tasks-asc",
			"tasks-desc",
			"created-asc",
			"created-desc",
		].includes(value);
	}

	private sortProjects() {
		this.projects.sort((a, b) => {
			switch (this.currentSort) {
				case "name-asc":
					return this.collator.compare(a.displayName || a.name, b.displayName || b.name);
				case "name-desc":
					return this.collator.compare(b.displayName || b.name, a.displayName || a.name);
				case "tasks-asc":
					return a.taskCount - b.taskCount;
				case "tasks-desc":
					return b.taskCount - a.taskCount;
				case "created-asc":
					return (a.createdAt || 0) - (b.createdAt || 0);
				case "created-desc":
					return (b.createdAt || 0) - (a.createdAt || 0);
				default:
					return 0;
			}
		});
	}

	private generateColorForProject(projectName: string): string {
		const colors = [
			"#e74c3c",
			"#3498db",
			"#2ecc71",
			"#f39c12",
			"#9b59b6",
			"#1abc9c",
			"#34495e",
			"#e67e22",
		];

		let hash = 0;
		for (let i = 0; i < projectName.length; i++) {
			hash = projectName.charCodeAt(i) + ((hash << 5) - hash);
		}

		return colors[Math.abs(hash) % colors.length];
	}

	private render() {
		this.containerEl.empty();
		this.containerEl.addClass("v2-project-list");

		const scrollArea = this.containerEl.createDiv({
			cls: "v2-project-scroll",
		});

		this.projects.forEach((project) => {
			const projectItem = scrollArea.createDiv({
				cls: "v2-project-item",
				attr: { "data-project-id": project.id },
			});

			if (this.activeProjectId === project.id) {
				projectItem.addClass("is-active");
			}

			const projectColor = projectItem.createDiv({
				cls: "v2-project-color",
			});
			projectColor.style.backgroundColor = project.color;

			const projectName = projectItem.createSpan({
				cls: "v2-project-name",
				text: project.displayName || project.name,
			});

			const projectCount = projectItem.createSpan({
				cls: "v2-project-count",
				text: String(project.taskCount),
			});

			this.registerDomEvent(projectItem, "click", () => {
				this.setActiveProject(project.id);
				this.onProjectSelect(project.id);
			});

			// Add context menu handler
			this.registerDomEvent(projectItem, "contextmenu", (e: MouseEvent) => {
				e.preventDefault();
				this.showProjectContextMenu(e, project);
			});
		});

		// Add new project button
		const addProjectBtn = scrollArea.createDiv({
			cls: "v2-project-item v2-add-project",
		});

		const addIcon = addProjectBtn.createDiv({ cls: "v2-project-add-icon" });
		addIcon.createDiv({ cls: "v2-project-color-dashed" });

		addProjectBtn.createSpan({
			cls: "v2-project-name",
			text: t("Add Project"),
		});

		this.registerDomEvent(addProjectBtn, "click", () => {
			this.handleAddProject(addProjectBtn);
		});
	}

	public setActiveProject(projectId: string | null) {
		this.activeProjectId = projectId;

		this.containerEl.querySelectorAll(".v2-project-item").forEach((el) => {
			el.removeClass("is-active");
		});

		if (projectId) {
			const activeEl = this.containerEl.querySelector(
				`[data-project-id="${projectId}"]`
			);
			if (activeEl) {
				activeEl.addClass("is-active");
			}
		}
	}

	public getProjects() {
		return this.projects;
	}

	public refresh() {
		this.loadProjects();
	}

	private handleAddProject(buttonEl: HTMLElement) {
		// Clean up any existing popover
		if (this.currentPopover) {
			this.removeChild(this.currentPopover);
			this.currentPopover = null;
		}

		if (Platform.isMobile) {
			// Mobile: Use Obsidian Modal
			const modal = new ProjectModal(
				this.plugin.app,
				this.plugin,
				async (project) => {
					await this.saveProject(project);
				}
			);
			modal.open();
		} else {
			// Desktop: Use popover
			this.currentPopover = new ProjectPopover(
				this.plugin,
				buttonEl,
				async (project) => {
					await this.saveProject(project);
					if (this.currentPopover) {
						this.removeChild(this.currentPopover);
						this.currentPopover = null;
					}
				},
				() => {
					if (this.currentPopover) {
						this.removeChild(this.currentPopover);
						this.currentPopover = null;
					}
				}
			);
			this.addChild(this.currentPopover);
		}
	}

	private async saveProject(project: CustomProject) {
		// Initialize customProjects if it doesn't exist
		if (!this.plugin.settings.projectConfig) {
			this.plugin.settings.projectConfig = {
				enableEnhancedProject: false,
				pathMappings: [],
				metadataConfig: {
					metadataKey: "project",
					enabled: false,
				},
				configFile: {
					fileName: "project.md",
					searchRecursively: true,
					enabled: false,
				},
				metadataMappings: [],
				defaultProjectNaming: {
					strategy: "filename",
					stripExtension: true,
					enabled: false,
				},
				customProjects: [],
			};
		}

		if (!this.plugin.settings.projectConfig.customProjects) {
			this.plugin.settings.projectConfig.customProjects = [];
		}

		// Add the new project
		this.plugin.settings.projectConfig.customProjects.push(project);

		// Save settings
		await this.plugin.saveSettings();

		// Refresh the project list
		this.loadProjects();
	}

	private loadCustomProjects() {
		const customProjects =
			this.plugin.settings.projectConfig?.customProjects || [];

		// Merge custom projects into the projects array
		customProjects.forEach((customProject) => {
			// Check if project already exists by name
			const existingIndex = this.projects.findIndex(
				(p) => p.name === customProject.name
			);

			if (existingIndex === -1) {
				// Add new custom project
				this.projects.push({
					id: customProject.id,
					name: customProject.name,
					displayName: customProject.displayName || customProject.name,
					color: customProject.color,
					taskCount: 0, // Will be updated by task counting
					createdAt: customProject.createdAt,
					updatedAt: customProject.updatedAt,
				});
			} else {
				// Update existing project with custom color
				this.projects[existingIndex].id = customProject.id;
				this.projects[existingIndex].color = customProject.color;
				this.projects[existingIndex].displayName = customProject.displayName || customProject.name;
				this.projects[existingIndex].createdAt =
					customProject.createdAt;
				this.projects[existingIndex].updatedAt =
					customProject.updatedAt;
			}
		});
	}

	private showSortMenu(buttonEl: HTMLElement) {
		const menu = new Menu();

		const sortOptions: {
			label: string;
			value: SortOption;
			icon: string;
		}[] = [
			{ label: t("Name (A-Z)"), value: "name-asc", icon: "arrow-up-a-z" },
			{ label: t("Name (Z-A)"), value: "name-desc", icon: "arrow-down-a-z" },
			{
				label: t("Tasks (Low to High)"),
				value: "tasks-asc",
				icon: "arrow-up-1-0",
			},
			{
				label: t("Tasks (High to Low)"),
				value: "tasks-desc",
				icon: "arrow-down-1-0",
			},
			{
				label: t("Created (Oldest First)"),
				value: "created-asc",
				icon: "clock",
			},
			{
				label: t("Created (Newest First)"),
				value: "created-desc",
				icon: "history",
			},
		];

		sortOptions.forEach((option) => {
			menu.addItem((item) => {
				item.setTitle(option.label)
					.setIcon(option.icon)
					.onClick(async () => {
						this.currentSort = option.value;
						await this.saveSortPreference();
						this.sortProjects();
						this.render();
					});
				if (this.currentSort === option.value) {
					item.setChecked(true);
				}
			});
		});

		menu.showAtMouseEvent(
			new MouseEvent("click", {
				view: window,
				bubbles: true,
				cancelable: true,
				clientX: buttonEl.getBoundingClientRect().left,
				clientY: buttonEl.getBoundingClientRect().bottom,
			})
		);
	}

	private showProjectContextMenu(event: MouseEvent, project: Project) {
		const menu = new Menu();

		// Check if this is a custom project
		const isCustomProject = this.plugin.settings.projectConfig?.customProjects?.some(
			cp => cp.id === project.id || cp.name === project.name
		);

		// Edit Project option
		menu.addItem((item) => {
			item
				.setTitle(t("Edit Project"))
				.setIcon("edit");

			if (isCustomProject) {
				item.onClick(() => {
					this.editProject(project);
				});
			} else {
				item.setDisabled(true);
			}
		});

		// Delete Project option
		menu.addItem((item) => {
			item
				.setTitle(t("Delete Project"))
				.setIcon("trash");

			if (isCustomProject) {
				item.onClick(() => {
					this.deleteProject(project);
				});
			} else {
				item.setDisabled(true);
			}
		});

		menu.showAtMouseEvent(event);
	}

	private editProject(project: Project) {
		// Find the custom project data
		let customProject = this.plugin.settings.projectConfig?.customProjects?.find(
			cp => cp.id === project.id || cp.name === project.name
		);

		if (!customProject) {
			// Create a new custom project entry if it doesn't exist
			customProject = {
				id: project.id,
				name: project.name,
				displayName: project.displayName || project.name,
				color: project.color,
				createdAt: Date.now(),
				updatedAt: Date.now()
			};
		}

		// Open edit modal
		const modal = new EditProjectModal(
			this.plugin.app,
			this.plugin,
			customProject,
			async (updatedProject) => {
				await this.updateProject(updatedProject);
			}
		);
		modal.open();
	}

	private async updateProject(updatedProject: CustomProject) {
		// Initialize if needed
		if (!this.plugin.settings.projectConfig) {
			this.plugin.settings.projectConfig = {
				enableEnhancedProject: false,
				pathMappings: [],
				metadataConfig: {
					metadataKey: "project",
					enabled: false,
				},
				configFile: {
					fileName: "project.md",
					searchRecursively: true,
					enabled: false,
				},
				metadataMappings: [],
				defaultProjectNaming: {
					strategy: "filename",
					stripExtension: true,
					enabled: false,
				},
				customProjects: [],
			};
		}

		if (!this.plugin.settings.projectConfig.customProjects) {
			this.plugin.settings.projectConfig.customProjects = [];
		}

		// Find and update the project
		const index = this.plugin.settings.projectConfig.customProjects.findIndex(
			cp => cp.id === updatedProject.id
		);

		if (index !== -1) {
			this.plugin.settings.projectConfig.customProjects[index] = updatedProject;
		} else {
			this.plugin.settings.projectConfig.customProjects.push(updatedProject);
		}

		// Save settings
		await this.plugin.saveSettings();

		// Refresh the project list
		this.loadProjects();
	}

	private deleteProject(project: Project) {
		// Confirm deletion
		const modal = new (class extends Modal {
			private onConfirm: () => void;

			constructor(app: App, onConfirm: () => void) {
				super(app);
				this.onConfirm = onConfirm;
			}

			onOpen() {
				const { contentEl } = this;
				contentEl.createEl("h2", { text: t("Delete Project") });
				contentEl.createEl("p", {
					text: t(`Are you sure you want to delete "${project.displayName || project.name}"?`)
				});
				contentEl.createEl("p", {
					cls: "mod-warning",
					text: t("This action cannot be undone.")
				});

				const buttonContainer = contentEl.createDiv({ cls: "modal-button-container" });

				const cancelBtn = buttonContainer.createEl("button", {
					text: t("Cancel")
				});
				cancelBtn.addEventListener("click", () => this.close());

				const confirmBtn = buttonContainer.createEl("button", {
					text: t("Delete"),
					cls: "mod-warning"
				});
				confirmBtn.addEventListener("click", () => {
					this.onConfirm();
					this.close();
				});
			}

			onClose() {
				const { contentEl } = this;
				contentEl.empty();
			}
		})(this.plugin.app, async () => {
			// Remove from custom projects
			if (this.plugin.settings.projectConfig?.customProjects) {
				const index = this.plugin.settings.projectConfig.customProjects.findIndex(
					cp => cp.id === project.id || cp.name === project.name
				);

				if (index !== -1) {
					this.plugin.settings.projectConfig.customProjects.splice(index, 1);
					await this.plugin.saveSettings();

					// If this was the active project, clear selection
					if (this.activeProjectId === project.id) {
						this.setActiveProject(null);
						this.onProjectSelect("");
					}

					// Refresh the project list
					this.loadProjects();
				}
			}
		});

		modal.open();
	}
}
