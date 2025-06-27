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
		console.log("[BaseTaskBasesView] Converting entries to tasks");
		console.log("[BaseTaskBasesView] Data:", this.data);
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
			// Extract basic file information
			const file = entry.file;
			const frontmatter = entry.frontmatter || {};

			if (!file) {
				console.warn(
					`[${this.type}] Entry missing file information:`,
					entry
				);
				return null;
			}

			// Extract task content from multiple sources
			const content = this.extractTaskContent(entry);

			// Extract task metadata
			const metadata = this.extractTaskMetadata(entry);

			// Determine completion status
			const completed = this.extractCompletionStatus(entry);

			// Extract task status mark
			const status = this.extractTaskStatus(entry);

			console.log("[BaseTaskBasesView] Entry:", entry);

			// Build task object
			const task: Task = {
				id: this.generateTaskId(entry),
				content: content,
				completed: completed,
				status: status,
				filePath: file.path || "",
				line: this.getEntryProperty(entry, "line", "note") || 0,
				originalMarkdown:
					this.getEntryProperty(entry, "originalMarkdown", "note") ||
					content,
				metadata: {
					...metadata,
					children: [],
				},
			};

			return task;
		} catch (error) {
			console.error(
				`[${this.type}] Error converting entry to task:`,
				error,
				entry
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

	/**
	 * Extract task content from entry using multiple sources
	 */
	private extractTaskContent(entry: any): string {
		// Try multiple content sources in priority order
		const contentSources = [
			() => this.getEntryProperty(entry, "title", "note"),
			() => this.getEntryProperty(entry, "content", "note"),
			() => this.getEntryProperty(entry, "text", "note"),
			() => entry.file?.basename,
			() => entry.file?.name,
		];

		for (const getContent of contentSources) {
			try {
				const content = getContent();
				if (content && typeof content === "string" && content.trim()) {
					return content.trim();
				}
			} catch (error) {
				// Continue to next source
			}
		}

		return "Untitled Task";
	}

	/**
	 * Extract task metadata from entry
	 */
	private extractTaskMetadata(entry: any): any {
		return {
			tags: this.extractTags(entry),
			project: this.extractProject(entry),
			tgProject: this.getEntryProperty(entry, "tgProject", "note") || "",
			priority: this.extractPriority(entry),
			dueDate:
				this.extractDate(entry, "dueDate") ||
				this.extractDate(entry, "due"),
			scheduledDate:
				this.extractDate(entry, "scheduledDate") ||
				this.extractDate(entry, "scheduled"),
			startDate:
				this.extractDate(entry, "startDate") ||
				this.extractDate(entry, "start"),
			completedDate:
				this.extractDate(entry, "completedDate") ||
				this.extractDate(entry, "completed"),
			createdDate:
				this.extractDate(entry, "createdDate") ||
				this.extractDate(entry, "created") ||
				this.extractFileCreatedDate(entry),
			cancelledDate:
				this.extractDate(entry, "cancelledDate") ||
				this.extractDate(entry, "cancelled"),
			context: this.getEntryProperty(entry, "context", "note") || "",
			recurrence:
				this.getEntryProperty(entry, "recurrence", "note") || undefined,
			onCompletion:
				this.getEntryProperty(entry, "onCompletion", "note") ||
				undefined,
		};
	}

	/**
	 * Extract completion status from entry
	 */
	private extractCompletionStatus(entry: any): boolean {
		// Check multiple completion indicators
		const completionSources = [
			() => this.getEntryProperty(entry, "completed", "note"),
			() => this.getEntryProperty(entry, "done", "note"),
			() => entry.frontmatter?.completed,
			() => entry.frontmatter?.done,
		];

		for (const getCompleted of completionSources) {
			try {
				const completed = getCompleted();
				if (typeof completed === "boolean") {
					return completed;
				}
				if (typeof completed === "string") {
					return (
						completed.toLowerCase() === "true" || completed === "x"
					);
				}
			} catch (error) {
				// Continue to next source
			}
		}

		return false;
	}

	/**
	 * Extract task status mark from entry
	 */
	private extractTaskStatus(entry: any): string {
		const statusSources = [
			() => this.getEntryProperty(entry, "status", "note"),
			() => entry.frontmatter?.status,
		];

		for (const getStatus of statusSources) {
			try {
				const status = getStatus();
				if (status && typeof status === "string") {
					return status;
				}
			} catch (error) {
				// Continue to next source
			}
		}

		// Default status based on completion
		return this.extractCompletionStatus(entry) ? "x" : " ";
	}

	/**
	 * Extract tags from entry
	 */
	private extractTags(entry: any): string[] {
		const tagSources = [
			() => this.getEntryProperty(entry, "tags", "note"),
			() => entry.frontmatter?.tags,
		];

		for (const getTags of tagSources) {
			try {
				const tags = getTags();
				if (Array.isArray(tags)) {
					return tags.filter((tag) => typeof tag === "string");
				}
				if (typeof tags === "string") {
					return tags
						.split(",")
						.map((tag) => tag.trim())
						.filter((tag) => tag);
				}
			} catch (error) {
				// Continue to next source
			}
		}

		return [];
	}

	/**
	 * Extract project from entry
	 */
	private extractProject(entry: any): string {
		const projectSources = [
			() => this.getEntryProperty(entry, "project", "note"),
			() => entry.frontmatter?.project,
			() => this.extractProjectFromTags(entry),
		];

		for (const getProject of projectSources) {
			try {
				const project = getProject();
				if (project && typeof project === "string") {
					return project.trim();
				}
			} catch (error) {
				// Continue to next source
			}
		}

		return "";
	}

	/**
	 * Extract project from tags
	 */
	private extractProjectFromTags(entry: any): string {
		const tags = this.extractTags(entry);
		const projectTag = tags.find(
			(tag) =>
				tag.startsWith("#project/") ||
				tag.startsWith("project/") ||
				tag.startsWith("#proj/") ||
				tag.startsWith("proj/")
		);

		if (projectTag) {
			return projectTag.replace(/^#?(project|proj)\//, "");
		}

		return "";
	}

	/**
	 * Extract priority from entry
	 */
	private extractPriority(entry: any): number {
		const prioritySources = [
			() => this.getEntryProperty(entry, "priority", "note"),
			() => entry.frontmatter?.priority,
		];

		for (const getPriority of prioritySources) {
			try {
				const priority = getPriority();
				if (typeof priority === "number") {
					return Math.max(0, Math.min(10, priority));
				}
				if (typeof priority === "string") {
					const parsed = parseInt(priority);
					if (!isNaN(parsed)) {
						return Math.max(0, Math.min(10, parsed));
					}
				}
			} catch (error) {
				// Continue to next source
			}
		}

		return 0;
	}

	/**
	 * Extract date from entry
	 */
	private extractDate(entry: any, dateField: string): number | undefined {
		const dateSources = [
			() => this.getEntryProperty(entry, dateField, "note"),
			() => entry.frontmatter?.[dateField],
		];

		for (const getDate of dateSources) {
			try {
				const date = getDate();
				if (typeof date === "number") {
					return date;
				}
				if (typeof date === "string") {
					const parsed = Date.parse(date);
					if (!isNaN(parsed)) {
						return parsed;
					}
				}
				if (date instanceof Date) {
					return date.getTime();
				}
			} catch (error) {
				// Continue to next source
			}
		}

		return undefined;
	}

	/**
	 * Extract file created date
	 */
	private extractFileCreatedDate(entry: any): number | undefined {
		try {
			const file = entry.file;
			if (file?.stat?.ctime) {
				return file.stat.ctime;
			}
		} catch (error) {
			// Ignore error
		}
		return undefined;
	}

	/**
	 * Generate unique task ID from entry
	 */
	private generateTaskId(entry: any): string {
		try {
			const file = entry.file;
			if (file?.path) {
				return file.path;
			}
		} catch (error) {
			// Fallback to random ID
		}

		return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Generic property accessor for Bases entries
	 */
	private getEntryProperty(
		entry: any,
		propertyName: string,
		type: "note" | "file" | "formula" = "note"
	): any {
		try {
			if (typeof entry.getValue === "function") {
				return entry.getValue({ type, name: propertyName });
			}
		} catch (error) {
			// Fallback to direct access
		}

		// Fallback: try direct property access
		try {
			if (type === "note" && entry.frontmatter) {
				return entry.frontmatter[propertyName];
			}
			if (type === "file" && entry.file) {
				return entry.file[propertyName];
			}
		} catch (error) {
			// Ignore error
		}

		return undefined;
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
