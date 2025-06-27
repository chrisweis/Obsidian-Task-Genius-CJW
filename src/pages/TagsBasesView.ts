/**
 * Tags Bases View
 * Specialized view for tag-based task management
 */

import { App } from "obsidian";
import { BaseTaskBasesView } from "./BaseTaskBasesView";
import { TagsComponent } from "../components/task-view/tags";
import TaskProgressBarPlugin from "../index";
import { filterTasks } from "../utils/TaskFilterUtils";
import { t } from "../translations/helper";

export class TagsBasesView extends BaseTaskBasesView {
	type = "tags-bases-view";

	private tagsComponent: TagsComponent;
	private isLoaded = false;

	constructor(
		containerEl: HTMLElement,
		app: App,
		plugin: TaskProgressBarPlugin
	) {
		super(containerEl, app, plugin, "tags");
		this.initializeComponents();
	}

	private initializeComponents(): void {
		// Create tags component for tag-based tasks
		this.tagsComponent = new TagsComponent(
			this.containerEl,
			this.app,
			this.plugin,
			{
				onTaskSelected: (task) => {
					console.log("[TagsBasesView] Task selected:", task);
				},
				onTaskCompleted: (task) => {
					console.log("[TagsBasesView] Task completed:", task);
					this.handleTaskCompletion(task);
				},
				onTaskContextMenu: (event, task) => {
					console.log("[TagsBasesView] Task context menu:", task);
				},
			}
		);

		this.addChild(this.tagsComponent);
	}

	// Abstract method implementations
	protected onConfigUpdated(): void {
		if (this.isLoaded) {
			this.updateTagTasks();
		}
	}

	protected onDataUpdated(): void {
		this.updateTagTasks();
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
		this.tagsComponent.load();
		this.isLoaded = true;
		this.updateTagTasks();
	}

	protected onViewUnload(): void {
		this.isLoaded = false;
	}

	protected onViewResize(): void {
		// Tags component handles its own resize
	}

	protected getCustomActions(): Array<{
		name: string;
		callback: () => void;
		icon: string;
	}> {
		return [
			{
				name: t("Manage Tags"),
				icon: "tags",
				callback: () => {
					this.openTagManager();
				},
			},
		];
	}

	protected getEditMenuItems(): Array<{
		displayName: string;
		component: (container: HTMLElement) => any;
	}> {
		return [];
	}

	private updateTagTasks(): void {
		if (!this.isLoaded) return;

		try {
			// Filter tasks for tags view (tasks with tags)
			const tagTasks = filterTasks(this.tasks, "tags", this.plugin);

			// Update tags component with filtered tasks
			this.tagsComponent.setTasks(tagTasks);

			console.log(
				`[TagsBasesView] Updated with ${tagTasks.length} tagged tasks`
			);
		} catch (error) {
			console.error("[TagsBasesView] Error updating tag tasks:", error);
			this.showErrorState("Failed to update tag tasks");
		}
	}

	private handleTaskCompletion(task: any): void {
		console.log("[TagsBasesView] Handling task completion:", task);

		// Trigger refresh after completion
		setTimeout(() => {
			this.refreshTasks();
		}, 100);
	}

	private openTagManager(): void {
		console.log("[TagsBasesView] Opening tag manager");
		// This would open a tag management modal
	}

	private showEmptyState(): void {
		this.hideEmptyState();

		const emptyEl = this.createEmptyContainer("No tagged tasks found");
		emptyEl.addClass("tags-empty-state");
	}

	private hideEmptyState(): void {
		const emptyEl = this.containerEl.querySelector(".tags-empty-state");
		if (emptyEl) {
			emptyEl.remove();
		}
	}

	private showErrorState(message: string): void {
		this.containerEl.empty();
		this.createErrorContainer(message);
	}
}
