/**
 * Base Task Bases View
 * Abstract base class for all task-based Bases views
 * Provides common BasesView interface implementation
 */

import { Component, App } from "obsidian";
import { Task } from "../types/task";
import TaskProgressBarPlugin from "../index";
import { ViewMode } from "../common/setting-definition";

// Import BasesView types
interface BasesViewSettings {
	get(key: string): any;
	set(data: any): void;
	getOrder(): string[] | null;
	setOrder(order: string[]): void;
	getDisplayName(prop: any): string;
	setDisplayName(prop: any, name: string): void;
	getViewName(): string;
}

interface BasesViewData {
	entries: any[];
}

interface BasesProperty {
	name: string;
	type: string;
	dataType?: string;
}

interface BaseView {
	onload?(): void;
	onunload?(): void;
	onActionsMenu(): Array<{
		name: string;
		callback: () => void;
		icon: string;
	}>;
	onEditMenu(): Array<{
		displayName: string;
		component: (container: HTMLElement) => any;
	}>;
	onResize(): void;
}

interface BasesView extends BaseView {
	type: string;
	app: any;
	containerEl: HTMLElement;
	settings: BasesViewSettings;
	data: BasesViewData[];
	properties: BasesProperty[];
	updateConfig(settings: BasesViewSettings): void;
	updateData(properties: BasesProperty[], data: BasesViewData[]): void;
	display(): void;
}

export abstract class BaseTaskBasesView extends Component implements BasesView {
	// BasesView interface properties
	abstract type: string;
	app: App;
	containerEl: HTMLElement;
	settings: BasesViewSettings;
	data: BasesViewData[] = [];
	properties: BasesProperty[] = [];

	// Task-specific properties
	protected plugin: TaskProgressBarPlugin;
	protected tasks: Task[] = [];
	protected viewMode: ViewMode;

	constructor(
		containerEl: HTMLElement,
		app: App,
		plugin: TaskProgressBarPlugin,
		viewMode: ViewMode
	) {
		super();
		this.containerEl = containerEl;
		this.app = app;
		this.plugin = plugin;
		this.viewMode = viewMode;

		// Initialize container
		this.containerEl.empty();
		this.containerEl.addClass("base-task-bases-view");
	}

	// BasesView interface implementation
	updateConfig(settings: BasesViewSettings): void {
		this.settings = settings;
		console.log(`[${this.type}] Config updated:`, settings);
		this.onConfigUpdated();
	}

	updateData(properties: BasesProperty[], data: BasesViewData[]): void {
		console.log(`[${this.type}] Data updated:`, { properties, data });
		this.properties = properties;
		this.data = data;

		// Convert entries to tasks
		const hasChanges = this.convertEntriesToTasks();

		if (hasChanges) {
			console.log(`[${this.type}] Changes detected, updating view`);
			this.onDataUpdated();
		} else {
			console.log(`[${this.type}] No changes detected, skipping update`);
		}
	}

	display(): void {
		console.log(`[${this.type}] Displaying view`);
		this.containerEl.show();
		this.onDisplay();
	}

	// BaseView interface implementation
	onload(): void {
		console.log(`[${this.type}] Loading view`);
		this.onViewLoad();
	}

	onunload(): void {
		console.log(`[${this.type}] Unloading view`);
		this.onViewUnload();
		this.unload();
	}

	onActionsMenu(): Array<{
		name: string;
		callback: () => void;
		icon: string;
	}> {
		const baseActions = [
			{
				name: "Refresh Tasks",
				icon: "refresh-cw",
				callback: () => {
					this.refreshTasks();
				},
			},
		];

		const customActions = this.getCustomActions();
		return [...baseActions, ...customActions];
	}

	onEditMenu(): Array<{
		displayName: string;
		component: (container: HTMLElement) => any;
	}> {
		return this.getEditMenuItems();
	}

	onResize(): void {
		this.onViewResize();
	}

	// Protected methods for data conversion
	protected convertEntriesToTasks(): boolean {
		if (!this.data || this.data.length === 0) {
			this.tasks = [];
			return true;
		}

		const newTasks: Task[] = [];

		for (const group of this.data) {
			if (!group.entries) continue;

			for (const entry of group.entries) {
				try {
					const task = this.entryToTask(entry);
					if (task) {
						newTasks.push(task);
					}
				} catch (error) {
					console.error(
						`[${this.type}] Error converting entry to task:`,
						error,
						entry
					);
				}
			}
		}

		// Check if tasks have changed
		const hasChanged = this.hasTasksChanged(this.tasks, newTasks);
		this.tasks = newTasks;

		return hasChanged;
	}

	protected entryToTask(entry: any): Task | null {
		try {
			// Basic task structure from entry
			const task: Task = {
				id: entry.file?.path || `${Date.now()}-${Math.random()}`,
				content:
					entry.properties?.title || entry.file?.name || "Untitled",
				completed: entry.properties?.completed || false,
				status: entry.properties?.status || " ",
				filePath: entry.file?.path || "",
				line: entry.properties?.line || 0,
				originalMarkdown: entry.properties?.originalMarkdown || "",
				metadata: {
					tags: entry.properties?.tags || [],
					project: entry.properties?.project || "",
					tgProject: entry.properties?.tgProject || "",
					priority: entry.properties?.priority || 0,
					dueDate: entry.properties?.dueDate || undefined,
					scheduledDate: entry.properties?.scheduledDate || undefined,
					startDate: entry.properties?.startDate || undefined,
					completedDate: entry.properties?.completedDate || undefined,
					createdDate: entry.properties?.createdDate || undefined,
					cancelledDate: entry.properties?.cancelledDate || undefined,
					context: entry.properties?.context || "",
					recurrence: entry.properties?.recurrence || undefined,
					onCompletion: entry.properties?.onCompletion || undefined,
					children: [],
				},
			};

			return task;
		} catch (error) {
			console.error(
				`[${this.type}] Error converting entry to task:`,
				error
			);
			return null;
		}
	}

	protected hasTasksChanged(oldTasks: Task[], newTasks: Task[]): boolean {
		if (oldTasks.length !== newTasks.length) {
			return true;
		}

		// Simple comparison by ID and content
		const oldTaskMap = new Map(oldTasks.map((t) => [t.id, t.content]));

		for (const newTask of newTasks) {
			const oldContent = oldTaskMap.get(newTask.id);
			if (oldContent !== newTask.content) {
				return true;
			}
		}

		return false;
	}

	protected refreshTasks(): void {
		// Force refresh by converting data again
		this.convertEntriesToTasks();
		this.onDataUpdated();
	}

	// Abstract methods that subclasses must implement
	protected abstract onConfigUpdated(): void;
	protected abstract onDataUpdated(): void;
	protected abstract onDisplay(): void;
	protected abstract onViewLoad(): void;
	protected abstract onViewUnload(): void;
	protected abstract onViewResize(): void;
	protected abstract getCustomActions(): Array<{
		name: string;
		callback: () => void;
		icon: string;
	}>;
	protected abstract getEditMenuItems(): Array<{
		displayName: string;
		component: (container: HTMLElement) => any;
	}>;

	// Utility methods for subclasses
	protected createErrorContainer(message: string): HTMLElement {
		const errorEl = this.containerEl.createDiv({
			cls: "bases-view-error",
		});

		errorEl.createDiv({
			cls: "bases-view-error-icon",
			text: "⚠️",
		});

		errorEl.createDiv({
			cls: "bases-view-error-message",
			text: message,
		});

		return errorEl;
	}

	protected createLoadingContainer(): HTMLElement {
		const loadingEl = this.containerEl.createDiv({
			cls: "bases-view-loading",
		});

		loadingEl.createDiv({
			cls: "bases-view-loading-spinner",
		});

		loadingEl.createDiv({
			cls: "bases-view-loading-text",
			text: "Loading tasks...",
		});

		return loadingEl;
	}

	protected createEmptyContainer(
		message: string = "No tasks found"
	): HTMLElement {
		const emptyEl = this.containerEl.createDiv({
			cls: "bases-view-empty",
		});

		emptyEl.createDiv({
			cls: "bases-view-empty-icon",
			text: "📋",
		});

		emptyEl.createDiv({
			cls: "bases-view-empty-message",
			text: message,
		});

		return emptyEl;
	}
}
