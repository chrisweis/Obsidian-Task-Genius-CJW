import { setIcon } from "obsidian";
import { t } from "../../../translations/helper";
import { Task } from "../../../types/task";

export interface FilterOptions {
	status?: "all" | "active" | "completed" | "overdue";
	priority?: "all" | "high" | "medium" | "low" | "none";
	project?: string | null;
	tags?: string[];
	dateRange?: {
		start: Date | null;
		end: Date | null;
	};
	assignee?: string | null;
}

export class V2FilterPanel {
	private containerEl: HTMLElement;
	private isOpen: boolean = false;
	private filters: FilterOptions = {};
	private availableProjects: Set<string> = new Set();
	private availableTags: Set<string> = new Set();
	private availableAssignees: Set<string> = new Set();

	constructor(
		private parentEl: HTMLElement,
		private onFilterChange: (filters: FilterOptions) => void,
		private tasks: Task[] = [],
	) {
		this.createPanel();
		this.extractAvailableOptions();
	}

	private createPanel() {
		// Create filter panel container
		this.containerEl = this.parentEl.createDiv({
			cls: "tg-v2-filter-panel",
		});

		// Header
		const header = this.containerEl.createDiv({
			cls: "filter-panel-header",
		});

		header.createDiv({
			cls: "filter-panel-title",
			text: t("Filters"),
		});

		const closeBtn = header.createDiv({
			cls: "filter-panel-close",
		});
		setIcon(closeBtn, "x");
		closeBtn.addEventListener("click", () => this.close());

		// Content
		const content = this.containerEl.createDiv({
			cls: "filter-panel-content",
		});

		// Status filter
		this.createStatusFilter(content);

		// Priority filter
		this.createPriorityFilter(content);

		// Project filter
		this.createProjectFilter(content);

		// Tags filter
		this.createTagsFilter(content);

		// Date range filter
		this.createDateRangeFilter(content);

		// Assignee filter
		this.createAssigneeFilter(content);

		// Apply and clear buttons
		this.createActionButtons(content);
	}

	private createStatusFilter(parentEl: HTMLElement) {
		const group = parentEl.createDiv({ cls: "filter-group" });

		group.createDiv({
			cls: "filter-group-label",
			text: t("Status"),
		});

		const options = group.createDiv({ cls: "filter-options" });

		const statuses = [
			{ value: "all", label: t("All Tasks") },
			{ value: "active", label: t("Active") },
			{ value: "completed", label: t("Completed") },
			{ value: "overdue", label: t("Overdue") },
		];

		statuses.forEach((status) => {
			const option = options.createDiv({
				cls: "filter-option",
			});

			const radio = option.createEl("input", {
				type: "radio",
				attr: {
					name: "status-filter",
					value: status.value,
				},
			});

			if (status.value === (this.filters.status || "all")) {
				radio.checked = true;
				option.addClass("is-selected");
			}

			option.createSpan({ text: status.label });

			option.addEventListener("click", () => {
				// Clear previous selection
				options.querySelectorAll(".filter-option").forEach((opt) => {
					opt.removeClass("is-selected");
				});

				// Set new selection
				option.addClass("is-selected");
				radio.checked = true;
				this.filters.status = status.value as any;
			});
		});
	}

	private createPriorityFilter(parentEl: HTMLElement) {
		const group = parentEl.createDiv({ cls: "filter-group" });

		group.createDiv({
			cls: "filter-group-label",
			text: t("Priority"),
		});

		const options = group.createDiv({ cls: "filter-options" });

		const priorities = [
			{ value: "all", label: t("All Priorities"), color: null },
			{ value: "high", label: t("High"), color: "#dc2626" },
			{ value: "medium", label: t("Medium"), color: "#f59e0b" },
			{ value: "low", label: t("Low"), color: "#3b82f6" },
			{ value: "none", label: t("None"), color: "#6b7280" },
		];

		priorities.forEach((priority) => {
			const option = options.createDiv({
				cls: "filter-option",
			});

			if (priority.color) {
				const colorDot = option.createSpan({
					cls: "priority-color-dot",
				});
				colorDot.style.backgroundColor = priority.color;
			}

			const radio = option.createEl("input", {
				type: "radio",
				attr: {
					name: "priority-filter",
					value: priority.value,
				},
			});

			if (priority.value === (this.filters.priority || "all")) {
				radio.checked = true;
				option.addClass("is-selected");
			}

			option.createSpan({ text: priority.label });

			option.addEventListener("click", () => {
				options.querySelectorAll(".filter-option").forEach((opt) => {
					opt.removeClass("is-selected");
				});

				option.addClass("is-selected");
				radio.checked = true;
				this.filters.priority = priority.value as any;
			});
		});
	}

	private createProjectFilter(parentEl: HTMLElement) {
		const group = parentEl.createDiv({ cls: "filter-group" });

		group.createDiv({
			cls: "filter-group-label",
			text: t("Project"),
		});

		const select = group.createEl("select", {
			cls: "filter-select",
		});

		// Add "All Projects" option
		const allOption = select.createEl("option", {
			value: "",
			text: t("All Projects"),
		});

		// Add project options
		Array.from(this.availableProjects)
			.sort()
			.forEach((project) => {
				select.createEl("option", {
					value: project,
					text: project,
				});
			});

		// Set current value
		if (this.filters.project) {
			select.value = this.filters.project;
		}

		select.addEventListener("change", () => {
			this.filters.project = select.value || null;
		});
	}

	private createTagsFilter(parentEl: HTMLElement) {
		const group = parentEl.createDiv({ cls: "filter-group" });

		group.createDiv({
			cls: "filter-group-label",
			text: t("Tags"),
		});

		const tagsContainer = group.createDiv({ cls: "filter-tags-container" });

		Array.from(this.availableTags)
			.sort()
			.forEach((tag) => {
				const tagEl = tagsContainer.createDiv({
					cls: "filter-tag",
				});

				const checkbox = tagEl.createEl("input", {
					type: "checkbox",
					cls: "filter-checkbox",
				});

				if (this.filters.tags?.includes(tag)) {
					checkbox.checked = true;
					tagEl.addClass("is-selected");
				}

				tagEl.createSpan({ text: tag });

				tagEl.addEventListener("click", (e) => {
					if (e.target !== checkbox) {
						checkbox.checked = !checkbox.checked;
					}

					if (checkbox.checked) {
						tagEl.addClass("is-selected");
						if (!this.filters.tags) this.filters.tags = [];
						if (!this.filters.tags.includes(tag)) {
							this.filters.tags.push(tag);
						}
					} else {
						tagEl.removeClass("is-selected");
						if (this.filters.tags) {
							this.filters.tags = this.filters.tags.filter(
								(t) => t !== tag,
							);
						}
					}
				});
			});
	}

	private createDateRangeFilter(parentEl: HTMLElement) {
		const group = parentEl.createDiv({ cls: "filter-group" });

		group.createDiv({
			cls: "filter-group-label",
			text: t("Date Range"),
		});

		const dateContainer = group.createDiv({ cls: "filter-date-container" });

		// Start date
		const startContainer = dateContainer.createDiv({
			cls: "filter-date-field",
		});
		startContainer.createSpan({ text: t("From:") });
		const startInput = startContainer.createEl("input", {
			type: "date",
			cls: "filter-date-input",
		});

		// End date
		const endContainer = dateContainer.createDiv({
			cls: "filter-date-field",
		});
		endContainer.createSpan({ text: t("To:") });
		const endInput = endContainer.createEl("input", {
			type: "date",
			cls: "filter-date-input",
		});

		// Set current values
		if (this.filters.dateRange?.start) {
			startInput.value = this.formatDate(this.filters.dateRange.start);
		}
		if (this.filters.dateRange?.end) {
			endInput.value = this.formatDate(this.filters.dateRange.end);
		}

		// Add event listeners
		startInput.addEventListener("change", () => {
			if (!this.filters.dateRange) {
				this.filters.dateRange = { start: null, end: null };
			}
			this.filters.dateRange.start = startInput.value
				? new Date(startInput.value)
				: null;
		});

		endInput.addEventListener("change", () => {
			if (!this.filters.dateRange) {
				this.filters.dateRange = { start: null, end: null };
			}
			this.filters.dateRange.end = endInput.value
				? new Date(endInput.value)
				: null;
		});
	}

	private createAssigneeFilter(parentEl: HTMLElement) {
		const group = parentEl.createDiv({ cls: "filter-group" });

		group.createDiv({
			cls: "filter-group-label",
			text: t("Assignee"),
		});

		const select = group.createEl("select", {
			cls: "filter-select",
		});

		// Add "All Assignees" option
		select.createEl("option", {
			value: "",
			text: t("All Assignees"),
		});

		// Add assignee options
		Array.from(this.availableAssignees)
			.sort()
			.forEach((assignee) => {
				select.createEl("option", {
					value: assignee,
					text: assignee,
				});
			});

		// Set current value
		if (this.filters.assignee) {
			select.value = this.filters.assignee;
		}

		select.addEventListener("change", () => {
			this.filters.assignee = select.value || null;
		});
	}

	private createActionButtons(parentEl: HTMLElement) {
		const buttonContainer = parentEl.createDiv({
			cls: "filter-action-buttons",
		});

		// Apply button
		const applyBtn = buttonContainer.createEl("button", {
			cls: "tg-v2-button tg-v2-button-primary",
			text: t("Apply Filters"),
		});

		applyBtn.addEventListener("click", () => {
			this.onFilterChange(this.filters);
			this.close();
		});

		// Clear button
		const clearBtn = buttonContainer.createEl("button", {
			cls: "tg-v2-button tg-v2-button-secondary",
			text: t("Clear All"),
		});

		clearBtn.addEventListener("click", () => {
			this.filters = {};
			this.onFilterChange(this.filters);
			this.recreatePanel();
		});
	}

	private extractAvailableOptions() {
		this.availableProjects.clear();
		this.availableTags.clear();
		this.availableAssignees.clear();

		this.tasks.forEach((task) => {
			// Extract projects
			if (task.metadata?.project) {
				this.availableProjects.add(task.metadata.project);
			}

			// Extract tags
			if (task.metadata?.tags) {
				task.metadata.tags.forEach((tag: string) =>
					this.availableTags.add(tag),
				);
			}

			// Extract assignees (if available)
			if (task.metadata?.assignee) {
				this.availableAssignees.add(task.metadata.assignee);
			}
		});
	}

	private formatDate(date: Date): string {
		return date.toISOString().split("T")[0];
	}

	private recreatePanel() {
		this.containerEl.empty();
		this.createPanel();
	}

	public open() {
		this.isOpen = true;
		this.containerEl.addClass("is-open");
	}

	public close() {
		this.isOpen = false;
		this.containerEl.removeClass("is-open");
	}

	public toggle() {
		if (this.isOpen) {
			this.close();
		} else {
			this.open();
		}
	}

	public updateTasks(tasks: Task[]) {
		this.tasks = tasks;
		this.extractAvailableOptions();
		this.recreatePanel();
	}

	public setFilters(filters: FilterOptions) {
		this.filters = { ...filters };
		this.recreatePanel();
	}

	public getFilters(): FilterOptions {
		return { ...this.filters };
	}
}
