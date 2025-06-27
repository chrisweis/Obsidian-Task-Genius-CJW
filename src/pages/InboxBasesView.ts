/**
 * Inbox Bases View
 * Specialized view for inbox tasks (tasks without projects)
 */

import { App } from "obsidian";
import { BaseTaskBasesView } from "./BaseTaskBasesView";
import { ContentComponent } from "../components/task-view/content";
import TaskProgressBarPlugin from "../index";
import { filterTasks } from "../utils/TaskFilterUtils";
import { t } from "../translations/helper";

export class InboxBasesView extends BaseTaskBasesView {
	type = "inbox-bases-view";

	private contentComponent: ContentComponent;
	private isLoaded = false;

	constructor(
		containerEl: HTMLElement,
		app: App,
		plugin: TaskProgressBarPlugin
	) {
		super(containerEl, app, plugin, "inbox");
		this.initializeComponents();
	}

	private initializeComponents(): void {
		// Create content component for inbox tasks
		this.contentComponent = new ContentComponent(
			this.containerEl,
			this.app,
			this.plugin,
			{
				onTaskSelected: (task) => {
					// Handle task selection if needed
					console.log("[InboxBasesView] Task selected:", task);
				},
				onTaskCompleted: (task) => {
					// Handle task completion
					console.log("[InboxBasesView] Task completed:", task);
					this.handleTaskCompletion(task);
				},
				onTaskContextMenu: (event, task) => {
					// Handle context menu
					console.log("[InboxBasesView] Task context menu:", task);
				},
			}
		);

		this.addChild(this.contentComponent);
	}

	// Abstract method implementations
	protected onConfigUpdated(): void {
		// Handle configuration updates
		if (this.isLoaded) {
			this.updateInboxTasks();
		}
	}

	protected onDataUpdated(): void {
		// Handle data updates
		this.updateInboxTasks();
	}

	protected onDisplay(): void {
		// Display the view
		this.containerEl.removeClass("is-loading");
		if (this.tasks.length === 0) {
			this.showEmptyState();
		} else {
			this.hideEmptyState();
		}
	}

	protected onViewLoad(): void {
		// Load the view
		this.contentComponent.load();
		this.isLoaded = true;
		this.updateInboxTasks();
	}

	protected onViewUnload(): void {
		// Unload the view
		this.isLoaded = false;
		// Component cleanup is handled by parent
	}

	protected onViewResize(): void {
		// Handle view resize
		// Content component handles its own resize
	}

	protected getCustomActions(): Array<{
		name: string;
		callback: () => void;
		icon: string;
	}> {
		return [
			{
				name: t("Quick Capture"),
				icon: "plus",
				callback: () => {
					// Open quick capture modal
					this.openQuickCapture();
				},
			},
			{
				name: t("Filter"),
				icon: "filter",
				callback: () => {
					// Open filter options
					this.openFilterOptions();
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
				displayName: "View Settings",
				component: (container: HTMLElement) => {
					return this.createViewSettingsComponent(container);
				},
			},
		];
	}

	private updateInboxTasks(): void {
		if (!this.isLoaded) return;

		console.log(this);

		try {
			// Filter tasks for inbox view (tasks without projects)
			const inboxTasks = filterTasks(this.tasks, "inbox", this.plugin);

			// Update content component with filtered tasks
			this.contentComponent.setTasks(inboxTasks, this.tasks);
			this.contentComponent.setViewMode("inbox");

			console.log(
				`[InboxBasesView] Updated with ${inboxTasks.length} inbox tasks`
			);
		} catch (error) {
			console.error(
				"[InboxBasesView] Error updating inbox tasks:",
				error
			);
			this.showErrorState("Failed to update inbox tasks");
		}
	}

	private handleTaskCompletion(task: any): void {
		// Handle task completion
		// This would typically update the task in the backend
		console.log("[InboxBasesView] Handling task completion:", task);

		// Trigger refresh after completion
		setTimeout(() => {
			this.refreshTasks();
		}, 100);
	}

	private openQuickCapture(): void {
		// Open quick capture modal
		try {
			const {
				QuickCaptureModal,
			} = require("../components/QuickCaptureModal");
			const modal = new QuickCaptureModal(
				this.app,
				this.plugin,
				{},
				true
			);
			modal.open();
		} catch (error) {
			console.error(
				"[InboxBasesView] Error opening quick capture:",
				error
			);
		}
	}

	private openFilterOptions(): void {
		// Open filter options
		console.log("[InboxBasesView] Opening filter options");
		// This could open a filter modal or popover
	}

	private createViewSettingsComponent(container: HTMLElement): any {
		// Create view settings component
		const settingsEl = container.createDiv({
			cls: "inbox-view-settings",
		});

		settingsEl.createEl("h3", {
			text: "Inbox View Settings",
		});

		// Add settings options here
		const optionsEl = settingsEl.createDiv({
			cls: "settings-options",
		});

		optionsEl.createEl("label", {
			text: "Show completed tasks",
		});

		const toggleEl = optionsEl.createEl("input", {
			type: "checkbox",
		});

		// Add more settings as needed

		return settingsEl;
	}

	private showEmptyState(): void {
		// Remove any existing empty state
		this.hideEmptyState();

		// Create empty state
		const emptyEl = this.createEmptyContainer("No inbox tasks found");
		emptyEl.addClass("inbox-empty-state");

		// Add helpful message
		const helpEl = emptyEl.createDiv({
			cls: "inbox-empty-help",
		});

		helpEl.createEl("p", {
			text: "Tasks without projects will appear here.",
		});

		const captureBtn = helpEl.createEl("button", {
			cls: "inbox-capture-btn",
			text: "Create Task",
		});

		captureBtn.addEventListener("click", () => {
			this.openQuickCapture();
		});
	}

	private hideEmptyState(): void {
		const emptyEl = this.containerEl.querySelector(".inbox-empty-state");
		if (emptyEl) {
			emptyEl.remove();
		}
	}

	private showErrorState(message: string): void {
		this.containerEl.empty();
		this.createErrorContainer(message);
	}
}
