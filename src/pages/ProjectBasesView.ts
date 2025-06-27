/**
 * Projects Bases View
 * Specialized view for project-based task management
 */

import { App } from "obsidian";
import { BaseTaskBasesView } from "./BaseTaskBasesView";
import { ProjectsComponent } from "../components/task-view/projects";
import TaskProgressBarPlugin from "../index";
import { filterTasks } from "../utils/TaskFilterUtils";
import { t } from "../translations/helper";

export class ProjectBasesView extends BaseTaskBasesView {
	type = "projects-bases-view";

	private projectsComponent: ProjectsComponent;
	private isLoaded = false;

	constructor(
		containerEl: HTMLElement,
		app: App,
		plugin: TaskProgressBarPlugin
	) {
		super(containerEl, app, plugin, "projects");
		this.initializeComponents();
	}

	private initializeComponents(): void {
		// Create projects component for project tasks
		this.projectsComponent = new ProjectsComponent(
			this.containerEl,
			this.app,
			this.plugin,
			{
				onTaskSelected: (task) => {
					console.log("[ProjectBasesView] Task selected:", task);
				},
				onTaskCompleted: (task) => {
					console.log("[ProjectBasesView] Task completed:", task);
					this.handleTaskCompletion(task);
				},
				onTaskContextMenu: (event, task) => {
					console.log("[ProjectBasesView] Task context menu:", task);
				},
			}
		);

		this.addChild(this.projectsComponent);
	}

	// Abstract method implementations
	protected onConfigUpdated(): void {
		if (this.isLoaded) {
			this.updateProjectTasks();
		}
	}

	protected onDataUpdated(): void {
		this.updateProjectTasks();
	}

	protected onDisplay(): void {
		this.containerEl.removeClass("is-loading");
		if (this.tasks.length === 0) {
			this.showEmptyState();
		} else {
			this.hideEmptyState();
		}
	}

	protected onViewLoad(): void {
		this.projectsComponent.load();
		this.isLoaded = true;
		this.updateProjectTasks();
	}

	protected onViewUnload(): void {
		this.isLoaded = false;
	}

	protected onViewResize(): void {
		// Projects component handles its own resize
	}

	protected getCustomActions(): Array<{
		name: string;
		callback: () => void;
		icon: string;
	}> {
		return [
			{
				name: t("New Project"),
				icon: "folder-plus",
				callback: () => {
					this.createNewProject();
				},
			},
			{
				name: t("Archive Completed"),
				icon: "archive",
				callback: () => {
					this.archiveCompletedProjects();
				},
			},
			{
				name: t("Project Statistics"),
				icon: "bar-chart",
				callback: () => {
					this.showProjectStatistics();
				},
			},
		];
	}

	protected getEditMenuItems(): Array<{
		displayName: string;
		component: (container: HTMLElement) => any;
	}> {
		return [
			{
				displayName: "Project Settings",
				component: (container: HTMLElement) => {
					return this.createProjectSettingsComponent(container);
				},
			},
		];
	}

	private updateProjectTasks(): void {
		if (!this.isLoaded) return;

		try {
			// Filter tasks for projects view (tasks with projects)
			const projectTasks = filterTasks(
				this.tasks,
				"projects",
				this.plugin
			);

			// Update projects component with filtered tasks
			this.projectsComponent.setTasks(projectTasks, this.tasks);

			console.log(
				`[ProjectBasesView] Updated with ${projectTasks.length} project tasks`
			);
		} catch (error) {
			console.error(
				"[ProjectBasesView] Error updating project tasks:",
				error
			);
			this.showErrorState("Failed to update project tasks");
		}
	}

	private handleTaskCompletion(task: any): void {
		console.log("[ProjectBasesView] Handling task completion:", task);

		// Trigger refresh after completion
		setTimeout(() => {
			this.refreshTasks();
		}, 100);
	}

	private createNewProject(): void {
		console.log("[ProjectBasesView] Creating new project");
		// This would open a new project creation modal
	}

	private archiveCompletedProjects(): void {
		console.log("[ProjectBasesView] Archiving completed projects");
		// This would archive all completed projects
	}

	private showProjectStatistics(): void {
		console.log("[ProjectBasesView] Showing project statistics");
		// This would show project completion statistics
	}

	private createProjectSettingsComponent(container: HTMLElement): any {
		const settingsEl = container.createDiv({
			cls: "projects-view-settings",
		});

		settingsEl.createEl("h3", {
			text: "Project Settings",
		});

		const optionsEl = settingsEl.createDiv({
			cls: "settings-options",
		});

		// Show project hierarchy
		const hierarchyEl = optionsEl.createDiv({
			cls: "setting-item",
		});

		hierarchyEl.createEl("label", {
			text: "Show project hierarchy",
		});

		const hierarchyToggle = hierarchyEl.createEl("input", {
			type: "checkbox",
			checked: true,
		});

		// Group by project
		const groupingEl = optionsEl.createDiv({
			cls: "setting-item",
		});

		groupingEl.createEl("label", {
			text: "Group tasks by project",
		});

		const groupingToggle = groupingEl.createEl("input", {
			type: "checkbox",
			checked: true,
		});

		// Show completed projects
		const completedEl = optionsEl.createDiv({
			cls: "setting-item",
		});

		completedEl.createEl("label", {
			text: "Show completed projects",
		});

		const completedToggle = completedEl.createEl("input", {
			type: "checkbox",
		});

		return settingsEl;
	}

	private showEmptyState(): void {
		this.hideEmptyState();

		const emptyEl = this.createEmptyContainer("No project tasks found");
		emptyEl.addClass("projects-empty-state");

		const helpEl = emptyEl.createDiv({
			cls: "projects-empty-help",
		});

		helpEl.createEl("p", {
			text: "Tasks with project assignments will appear here.",
		});

		const helpText = helpEl.createEl("div", {
			cls: "projects-help-text",
		});

		helpText.createEl("p", {
			text: "To assign a task to a project:",
		});

		const helpList = helpText.createEl("ul");
		helpList.createEl("li", {
			text: "Add #project/projectname tag to the task",
		});
		helpList.createEl("li", {
			text: "Use project:: property in frontmatter",
		});

		const createBtn = helpEl.createEl("button", {
			cls: "projects-create-btn",
			text: "Create Project",
		});

		createBtn.addEventListener("click", () => {
			this.createNewProject();
		});
	}

	private hideEmptyState(): void {
		const emptyEl = this.containerEl.querySelector(".projects-empty-state");
		if (emptyEl) {
			emptyEl.remove();
		}
	}

	private showErrorState(message: string): void {
		this.containerEl.empty();
		this.createErrorContainer(message);
	}
}
