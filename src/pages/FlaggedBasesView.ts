/**
 * Flagged Bases View
 * Specialized view for flagged and high priority tasks
 */

import { App } from "obsidian";
import { BaseTaskBasesView } from "./BaseTaskBasesView";
import { ContentComponent } from "../components/task-view/content";
import TaskProgressBarPlugin from "../index";
import { filterTasks } from "../utils/TaskFilterUtils";
import { t } from "../translations/helper";

export class FlaggedBasesView extends BaseTaskBasesView {
	type = "flagged-bases-view";

	private contentComponent: ContentComponent;
	private isLoaded = false;

	constructor(
		containerEl: HTMLElement,
		app: App,
		plugin: TaskProgressBarPlugin
	) {
		super(containerEl, app, plugin, "flagged");
		this.initializeComponents();
	}

	private initializeComponents(): void {
		// Create content component for flagged tasks
		this.contentComponent = new ContentComponent(
			this.containerEl,
			this.app,
			this.plugin,
			{
				onTaskSelected: (task) => {
					console.log("[FlaggedBasesView] Task selected:", task);
				},
				onTaskCompleted: (task) => {
					console.log("[FlaggedBasesView] Task completed:", task);
					this.handleTaskCompletion(task);
				},
				onTaskContextMenu: (event, task) => {
					console.log("[FlaggedBasesView] Task context menu:", task);
				},
			}
		);

		this.addChild(this.contentComponent);
	}

	// Abstract method implementations
	protected onConfigUpdated(): void {
		if (this.isLoaded) {
			this.updateFlaggedTasks();
		}
	}

	protected onDataUpdated(): void {
		this.updateFlaggedTasks();
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
		this.contentComponent.load();
		this.isLoaded = true;
		this.updateFlaggedTasks();
	}

	protected onViewUnload(): void {
		this.isLoaded = false;
	}

	protected onViewResize(): void {
		// Content component handles its own resize
	}

	protected getCustomActions(): Array<{
		name: string;
		callback: () => void;
		icon: string;
	}> {
		return [
			{
				name: t("Set Priority"),
				icon: "flag",
				callback: () => {
					this.openPrioritySelector();
				},
			},
			{
				name: t("Clear Flags"),
				icon: "flag-off",
				callback: () => {
					this.clearAllFlags();
				},
			},
			{
				name: t("Filter by Priority"),
				icon: "filter",
				callback: () => {
					this.openPriorityFilter();
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
				displayName: "Priority Settings",
				component: (container: HTMLElement) => {
					return this.createPrioritySettingsComponent(container);
				},
			},
		];
	}

	private updateFlaggedTasks(): void {
		if (!this.isLoaded) return;

		try {
			// Filter tasks for flagged view (high priority and flagged tasks)
			const flaggedTasks = filterTasks(
				this.tasks,
				"flagged",
				this.plugin
			);

			// Sort by priority (highest first)
			flaggedTasks.sort((a, b) => {
				const priorityA = a.metadata.priority || 0;
				const priorityB = b.metadata.priority || 0;
				return priorityB - priorityA;
			});

			// Update content component with filtered tasks
			this.contentComponent.setTasks(flaggedTasks, this.tasks);
			this.contentComponent.setViewMode("flagged");

			console.log(
				`[FlaggedBasesView] Updated with ${flaggedTasks.length} flagged tasks`
			);
		} catch (error) {
			console.error(
				"[FlaggedBasesView] Error updating flagged tasks:",
				error
			);
			this.showErrorState("Failed to update flagged tasks");
		}
	}

	private handleTaskCompletion(task: any): void {
		console.log("[FlaggedBasesView] Handling task completion:", task);

		// Trigger refresh after completion
		setTimeout(() => {
			this.refreshTasks();
		}, 100);
	}

	private openPrioritySelector(): void {
		console.log("[FlaggedBasesView] Opening priority selector");
		// This would open a priority selection modal
	}

	private clearAllFlags(): void {
		console.log("[FlaggedBasesView] Clearing all flags");
		// This would clear flags from all visible tasks
	}

	private openPriorityFilter(): void {
		console.log("[FlaggedBasesView] Opening priority filter");
		// This would open a priority filter modal
	}

	private createPrioritySettingsComponent(container: HTMLElement): any {
		const settingsEl = container.createDiv({
			cls: "flagged-view-settings",
		});

		settingsEl.createEl("h3", {
			text: "Priority Settings",
		});

		const optionsEl = settingsEl.createDiv({
			cls: "settings-options",
		});

		// Minimum priority threshold
		const thresholdEl = optionsEl.createDiv({
			cls: "setting-item",
		});

		thresholdEl.createEl("label", {
			text: "Minimum priority for flagged view:",
		});

		const thresholdInput = thresholdEl.createEl("input", {
			type: "number",
			value: "3",
		});
		thresholdInput.min = "0";
		thresholdInput.max = "10";

		// Show completed flagged tasks
		const completedEl = optionsEl.createDiv({
			cls: "setting-item",
		});

		completedEl.createEl("label", {
			text: "Show completed flagged tasks",
		});

		const completedToggle = completedEl.createEl("input", {
			type: "checkbox",
		});

		return settingsEl;
	}

	private showEmptyState(): void {
		this.hideEmptyState();

		const emptyEl = this.createEmptyContainer("No flagged tasks found");
		emptyEl.addClass("flagged-empty-state");

		const helpEl = emptyEl.createDiv({
			cls: "flagged-empty-help",
		});

		helpEl.createEl("p", {
			text: "Tasks with high priority (3+) or flagged tags will appear here.",
		});

		const helpText = helpEl.createEl("div", {
			cls: "flagged-help-text",
		});

		helpText.createEl("p", {
			text: "To flag a task:",
		});

		const helpList = helpText.createEl("ul");
		helpList.createEl("li", {
			text: "Set priority to 3 or higher",
		});
		helpList.createEl("li", {
			text: "Add #flagged tag to the task",
		});
	}

	private hideEmptyState(): void {
		const emptyEl = this.containerEl.querySelector(".flagged-empty-state");
		if (emptyEl) {
			emptyEl.remove();
		}
	}

	private showErrorState(message: string): void {
		this.containerEl.empty();
		this.createErrorContainer(message);
	}
}
