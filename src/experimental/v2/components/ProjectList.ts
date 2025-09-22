import { Component, Platform, setIcon, Menu } from "obsidian";
import TaskProgressBarPlugin from "../../../index";
import { Task } from "../../../types/task";
import { ProjectPopover, ProjectModal } from "./ProjectPopover";
import type { CustomProject } from "../../../common/setting-definition";
import { t } from "@/translations/helper";

interface Project {
	id: string;
	name: string;
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
					projectMap.set(projectName, {
						id: projectName,
						name: projectName,
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
					return this.collator.compare(a.name, b.name);
				case "name-desc":
					return this.collator.compare(b.name, a.name);
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
				text: project.name,
			});

			const projectCount = projectItem.createSpan({
				cls: "v2-project-count",
				text: String(project.taskCount),
			});

			this.registerDomEvent(projectItem, "click", () => {
				this.setActiveProject(project.id);
				this.onProjectSelect(project.id);
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
					color: customProject.color,
					taskCount: 0, // Will be updated by task counting
					createdAt: customProject.createdAt,
					updatedAt: customProject.updatedAt,
				});
			} else {
				// Update existing project with custom color
				this.projects[existingIndex].id = customProject.id;
				this.projects[existingIndex].color = customProject.color;
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
}
