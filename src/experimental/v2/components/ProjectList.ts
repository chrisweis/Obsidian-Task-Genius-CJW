import { setIcon } from "obsidian";
import TaskProgressBarPlugin from "../../../index";
import { Task } from "../../../types/task";

interface Project {
	id: string;
	name: string;
	color: string;
	taskCount: number;
}

export class ProjectList {
	private containerEl: HTMLElement;
	private plugin: TaskProgressBarPlugin;
	private projects: Project[] = [];
	private activeProjectId: string | null = null;

	constructor(
		containerEl: HTMLElement,
		plugin: TaskProgressBarPlugin,
		private onProjectSelect: (projectId: string) => void
	) {
		this.containerEl = containerEl;
		this.plugin = plugin;

		this.loadProjects();
		this.render();
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
		this.render();
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

			projectItem.addEventListener("click", () => {
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
			text: "Add Project",
		});

		addProjectBtn.addEventListener("click", () => {
			console.log("Add new project");
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
}
