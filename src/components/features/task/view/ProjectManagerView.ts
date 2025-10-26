import {
	App,
	Component,
	setIcon,
	TFile,
	Notice,
} from "obsidian";
import { t } from "@/translations/helper";
import TaskProgressBarPlugin from "@/index";
import { CustomProject } from "@/common/setting-definition";
import "@/styles/project-manager-view.css";

export class ProjectManagerComponent extends Component {
	// UI Elements
	public containerEl: HTMLElement;
	private headerEl: HTMLElement;
	private projectsListEl: HTMLElement;
	private emptyStateEl: HTMLElement | null = null;

	// Data
	private projects: Array<CustomProject & { autoDetected?: boolean }> = [];
	private draggedElement: HTMLElement | null = null;
	private draggedProject: CustomProject | null = null;

	constructor(
		public app: App,
		public plugin: TaskProgressBarPlugin,
		private parentEl: HTMLElement
	) {
		super();
	}

	onload() {
		// Create own container div inside parent (like other components)
		this.containerEl = this.parentEl.createDiv({
			cls: "project-manager-view"
		});
		this.render();
	}

	onunload() {
		this.containerEl.empty();
	}

	async render() {
		this.containerEl.empty();

		// Create header
		this.headerEl = this.containerEl.createDiv({
			cls: "project-manager-header",
		});

		const titleSection = this.headerEl.createDiv({
			cls: "project-manager-title-section",
		});

		titleSection.createEl("h2", {
			text: t("Projects"),
			cls: "project-manager-title",
		});

		titleSection.createEl("p", {
			text: t("Drag to reorder projects by priority"),
			cls: "project-manager-subtitle",
		});

		// Create projects list container
		this.projectsListEl = this.containerEl.createDiv({
			cls: "project-manager-list",
		});

		// Load and render projects
		await this.loadProjects();
		this.renderProjects();
	}

	private async loadProjects() {
		// Get all custom projects
		const customProjects =
			this.plugin.settings.projectConfig?.customProjects || [];

		// Get all tasks to extract unique projects
		let allTasks: any[] = [];
		if (this.plugin.dataflowOrchestrator) {
			const queryAPI = this.plugin.dataflowOrchestrator.getQueryAPI();
			allTasks = queryAPI.getAllTasksSync() || [];
		}

		// Extract unique projects from tasks
		const autoDetectedProjects = new Map<string, { name: string; count: number }>();
		allTasks.forEach((task) => {
			const projectName = task.metadata?.project || task.project;
			if (projectName) {
				const existing = autoDetectedProjects.get(projectName);
				if (existing) {
					existing.count++;
				} else {
					autoDetectedProjects.set(projectName, {
						name: projectName,
						count: 1,
					});
				}
			}
		});

		// Combine custom and auto-detected projects
		const projectMap = new Map<string, CustomProject & { autoDetected?: boolean }>();

		// Add custom projects first
		customProjects.forEach((cp) => {
			projectMap.set(cp.id || cp.name, {
				...cp,
				autoDetected: false,
			});
		});

		// Add auto-detected projects that aren't already custom
		autoDetectedProjects.forEach((ap, projectName) => {
			if (!projectMap.has(projectName)) {
				// Convert auto-detected project to CustomProject format
				projectMap.set(projectName, {
					id: projectName,
					name: projectName,
					displayName: projectName,
					color: "#808080",
					createdAt: Date.now(),
					updatedAt: Date.now(),
					autoDetected: true,
				});
			}
		});

		// Convert to array and sort by priority
		this.projects = Array.from(projectMap.values()).sort((a, b) => {
			const priorityA = a.priority ?? Number.MAX_SAFE_INTEGER;
			const priorityB = b.priority ?? Number.MAX_SAFE_INTEGER;
			return priorityA - priorityB;
		});

		// Assign priority numbers if not set
		this.projects.forEach((project, index) => {
			if (project.priority === undefined) {
				project.priority = index + 1;
			}
		});
	}

	private renderProjects() {
		this.projectsListEl.empty();

		if (this.projects.length === 0) {
			this.renderEmptyState();
			return;
		}

		this.projects.forEach((project, index) => {
			this.renderProjectItem(project, index);
		});
	}

	private renderEmptyState() {
		if (this.emptyStateEl) {
			this.emptyStateEl.remove();
		}

		this.emptyStateEl = this.projectsListEl.createDiv({
			cls: "project-manager-empty-state",
		});

		const iconEl = this.emptyStateEl.createDiv({
			cls: "project-manager-empty-icon",
		});
		setIcon(iconEl, "folder-tree");

		this.emptyStateEl.createEl("h3", {
			text: t("No projects found"),
		});

		this.emptyStateEl.createEl("p", {
			text: t("Projects will appear here as you create tasks with project metadata."),
		});
	}

	private renderProjectItem(project: CustomProject & { autoDetected?: boolean }, index: number) {
		const projectItem = this.projectsListEl.createDiv({
			cls: "project-manager-item",
			attr: {
				"data-project-id": project.id,
				draggable: "true",
			},
		});

		// Drag handle
		const dragHandle = projectItem.createDiv({
			cls: "project-manager-drag-handle",
		});
		setIcon(dragHandle, "grip-vertical");

		// Priority number
		const priorityEl = projectItem.createDiv({
			cls: "project-manager-priority",
			text: String(project.priority || index + 1),
		});

		// Project color indicator
		const colorEl = projectItem.createDiv({
			cls: "project-manager-color",
		});
		colorEl.style.backgroundColor = project.color;

		// Project info
		const infoEl = projectItem.createDiv({
			cls: "project-manager-info",
		});

		const nameEl = infoEl.createDiv({
			cls: "project-manager-name",
			text: project.displayName || project.name,
		});

		// Add badges
		const badgesEl = infoEl.createDiv({
			cls: "project-manager-badges",
		});

		if (project.markdownFile) {
			const fileBadge = badgesEl.createSpan({
				cls: "project-manager-badge",
			});
			const fileIcon = fileBadge.createSpan({
				cls: "project-manager-badge-icon",
			});
			setIcon(fileIcon, "file-text");
			fileBadge.createSpan({
				text: t("File"),
			});
		}

		if (project.autoDetected) {
			const autoBadge = badgesEl.createSpan({
				cls: "project-manager-badge project-manager-badge-auto",
			});
			const autoIcon = autoBadge.createSpan({
				cls: "project-manager-badge-icon",
			});
			setIcon(autoIcon, "sparkles");
			autoBadge.createSpan({
				text: t("Auto"),
			});
		}

		// Actions
		const actionsEl = projectItem.createDiv({
			cls: "project-manager-actions",
		});

		// Open file button (if file exists)
		if (project.markdownFile) {
			const openBtn = actionsEl.createDiv({
				cls: "project-manager-action-btn",
				attr: {
					"aria-label": t("Open project file"),
				},
			});
			setIcon(openBtn, "external-link");

			this.registerDomEvent(openBtn, "click", async (e) => {
				e.stopPropagation();
				await this.openProjectFile(project.markdownFile!);
			});
		}

		// Setup drag events
		this.setupDragEvents(projectItem, project);
	}

	private setupDragEvents(element: HTMLElement, project: CustomProject) {
		this.registerDomEvent(element, "dragstart", (e: DragEvent) => {
			this.draggedElement = element;
			this.draggedProject = project;
			element.classList.add("is-dragging");
			e.dataTransfer!.effectAllowed = "move";
		});

		this.registerDomEvent(element, "dragend", () => {
			if (this.draggedElement) {
				this.draggedElement.classList.remove("is-dragging");
				this.draggedElement = null;
				this.draggedProject = null;
			}
			// Remove all drag-over classes
			this.projectsListEl
				.querySelectorAll(".is-drag-over")
				.forEach((el) => el.classList.remove("is-drag-over"));
		});

		this.registerDomEvent(element, "dragover", (e: DragEvent) => {
			e.preventDefault();
			e.dataTransfer!.dropEffect = "move";

			if (!this.draggedElement || this.draggedElement === element) {
				return;
			}

			// Add visual indicator
			element.classList.add("is-drag-over");
		});

		this.registerDomEvent(element, "dragleave", () => {
			element.classList.remove("is-drag-over");
		});

		this.registerDomEvent(element, "drop", async (e: DragEvent) => {
			e.preventDefault();
			element.classList.remove("is-drag-over");

			if (!this.draggedProject || !this.draggedElement) {
				return;
			}

			const draggedProjectId = this.draggedProject.id;
			const targetProjectId = element.getAttribute("data-project-id");

			if (!targetProjectId || draggedProjectId === targetProjectId) {
				return;
			}

			await this.reorderProjects(draggedProjectId, targetProjectId);
		});
	}

	private async reorderProjects(draggedId: string, targetId: string) {
		// Find indices
		const draggedIndex = this.projects.findIndex((p) => p.id === draggedId);
		const targetIndex = this.projects.findIndex((p) => p.id === targetId);

		if (draggedIndex === -1 || targetIndex === -1) {
			return;
		}

		// Reorder array
		const [draggedProject] = this.projects.splice(draggedIndex, 1);
		this.projects.splice(targetIndex, 0, draggedProject);

		// Update priorities
		await this.updateAllPriorities();

		// Re-render
		this.renderProjects();
	}

	private async updateAllPriorities() {
		// Update priority for each project
		for (let i = 0; i < this.projects.length; i++) {
			const project = this.projects[i];
			const newPriority = i + 1;
			project.priority = newPriority;

			// Update in settings if it's a custom project
			if (!project.autoDetected) {
				await this.updateProjectInSettings(project);
			}

			// Update frontmatter if file exists
			if (project.markdownFile) {
				await this.updateProjectFilePriority(
					project.markdownFile,
					newPriority
				);
			}
		}

		// Save settings
		await this.plugin.saveSettings();
	}

	private async updateProjectInSettings(project: CustomProject & { autoDetected?: boolean }) {
		if (!this.plugin.settings.projectConfig.customProjects) {
			this.plugin.settings.projectConfig.customProjects = [];
		}

		const index =
			this.plugin.settings.projectConfig.customProjects.findIndex(
				(p) => p.id === project.id
			);

		if (index !== -1) {
			this.plugin.settings.projectConfig.customProjects[index] = {
				...this.plugin.settings.projectConfig.customProjects[index],
				priority: project.priority,
			};
		} else if (!project.autoDetected) {
			// If it's not auto-detected and not in settings, add it
			const { autoDetected, ...customProjectData } = project;
			this.plugin.settings.projectConfig.customProjects.push(customProjectData);
		}
	}

	private async updateProjectFilePriority(
		filePath: string,
		priority: number
	) {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) {
			return;
		}

		try {
			await this.app.fileManager.processFrontMatter(
				file,
				(frontmatter) => {
					frontmatter.priority = priority;
				}
			);
		} catch (error) {
			console.error(`Failed to update priority in ${filePath}:`, error);
		}
	}

	private async openProjectFile(filePath: string) {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (file instanceof TFile) {
			const leaf = this.app.workspace.getLeaf("tab");
			await leaf.openFile(file);
		} else {
			new Notice(t("Project file not found"));
		}
	}

	public async refresh() {
		await this.loadProjects();
		this.renderProjects();
	}
}
