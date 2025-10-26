import { __awaiter } from "tslib";
import { Component, Platform, DropdownComponent, Notice } from "obsidian";
import { QuadrantColumnComponent } from "./quadrant-column";
import Sortable from "sortablejs";
import "@/styles/quadrant/quadrant.css";
import { t } from "@/translations/helper";
export const QUADRANT_DEFINITIONS = [
    {
        id: "urgent-important",
        title: t("Urgent & Important"),
        description: t("Do First - Crisis & emergencies"),
        priorityEmoji: "🔺",
        urgentTag: "#urgent",
        importantTag: "#important",
        className: "quadrant-urgent-important",
    },
    {
        id: "not-urgent-important",
        title: t("Not Urgent & Important"),
        description: t("Schedule - Planning & development"),
        priorityEmoji: "⏫",
        importantTag: "#important",
        className: "quadrant-not-urgent-important",
    },
    {
        id: "urgent-not-important",
        title: t("Urgent & Not Important"),
        description: t("Delegate - Interruptions & distractions"),
        priorityEmoji: "🔼",
        urgentTag: "#urgent",
        className: "quadrant-urgent-not-important",
    },
    {
        id: "not-urgent-not-important",
        title: t("Not Urgent & Not Important"),
        description: t("Eliminate - Time wasters"),
        priorityEmoji: "🔽",
        className: "quadrant-not-urgent-not-important",
    },
];
export class QuadrantComponent extends Component {
    constructor(app, plugin, parentEl, initialTasks = [], params = {}, viewId = "quadrant") {
        super();
        this.columns = [];
        this.sortableInstances = [];
        this.tasks = [];
        this.allTasks = [];
        this.currentViewId = "quadrant";
        this.filterComponent = null;
        this.activeFilters = [];
        this.sortOption = {
            field: "priority",
            order: "desc",
            label: "Priority (High to Low)",
        };
        this.hideEmptyColumns = false;
        // Per-view override from Bases
        this.configOverride = null;
        this.app = app;
        this.plugin = plugin;
        this.currentViewId = viewId;
        this.containerEl = parentEl.createDiv("tg-quadrant-component-container");
        this.tasks = initialTasks;
        this.params = params;
    }
    // Quadrant-specific configuration
    get quadrantConfig() {
        var _a, _b;
        const view = this.plugin.settings.viewConfiguration.find((v) => v.id === this.currentViewId);
        if (view &&
            view.specificConfig &&
            view.specificConfig.viewType === "quadrant") {
            return Object.assign(Object.assign({}, view.specificConfig), ((_a = this.configOverride) !== null && _a !== void 0 ? _a : {}));
        }
        // Fallback to default quadrant config
        const defaultView = this.plugin.settings.viewConfiguration.find((v) => v.id === "quadrant");
        const base = (defaultView === null || defaultView === void 0 ? void 0 : defaultView.specificConfig) || {
            urgentTag: "#urgent",
            importantTag: "#important",
            urgentThresholdDays: 3,
        };
        return Object.assign(Object.assign({}, base), ((_b = this.configOverride) !== null && _b !== void 0 ? _b : {}));
    }
    onload() {
        super.onload();
        this.render();
    }
    setConfigOverride(override) {
        this.configOverride = override !== null && override !== void 0 ? override : null;
        // Re-render to apply new config safely
        this.cleanup();
        this.render();
    }
    onunload() {
        this.cleanup();
        super.onunload();
    }
    cleanup() {
        // Clean up sortable instances
        this.sortableInstances.forEach((sortable) => {
            sortable.destroy();
        });
        this.sortableInstances = [];
        // Clean up columns
        this.columns.forEach((column) => {
            column.onunload();
        });
        this.columns = [];
        // Clean up filter component
        if (this.filterComponent) {
            this.filterComponent.onunload();
            this.filterComponent = null;
        }
    }
    render() {
        this.containerEl.empty();
        // Create header with controls
        this.createHeader();
        // Create filter section
        this.createFilterSection();
        // Create main quadrant grid
        this.createQuadrantGrid();
        // Initialize the view
        this.refresh();
    }
    createHeader() {
        const headerEl = this.containerEl.createDiv("tg-quadrant-header");
        const titleEl = headerEl.createDiv("tg-quadrant-title");
        titleEl.textContent = t("Matrix");
        const controlsEl = headerEl.createDiv("tg-quadrant-controls");
        // Sort dropdown
        const sortEl = controlsEl.createDiv("tg-quadrant-sort");
        const sortOptions = [
            {
                field: "priority",
                order: "desc",
                label: t("Priority (High to Low)"),
            },
            {
                field: "priority",
                order: "asc",
                label: t("Priority (Low to High)"),
            },
            {
                field: "dueDate",
                order: "asc",
                label: t("Due Date (Earliest First)"),
            },
            {
                field: "dueDate",
                order: "desc",
                label: t("Due Date (Latest First)"),
            },
            {
                field: "createdDate",
                order: "desc",
                label: t("Created Date (Newest First)"),
            },
            {
                field: "createdDate",
                order: "asc",
                label: t("Created Date (Oldest First)"),
            },
        ];
        // 创建 DropdownComponent 并添加到 sortEl
        const sortDropdown = new DropdownComponent(sortEl);
        // 填充下拉选项
        sortOptions.forEach((option) => {
            const value = `${option.field}-${option.order}`;
            sortDropdown.addOption(value, option.label);
        });
        // 设置当前选中项（如果有）
        const currentValue = `${this.sortOption.field}-${this.sortOption.order}`;
        sortDropdown.setValue(currentValue);
        // 监听下拉选择变化
        sortDropdown.onChange((value) => {
            const [field, order] = value.split("-");
            const newSortOption = sortOptions.find((opt) => opt.field === field && opt.order === order) || this.sortOption;
            // Only update if the sort option actually changed
            if (newSortOption.field !== this.sortOption.field ||
                newSortOption.order !== this.sortOption.order) {
                console.log(`Sort option changed from ${this.sortOption.field}-${this.sortOption.order} to ${newSortOption.field}-${newSortOption.order}`);
                this.sortOption = newSortOption;
                // Force refresh all columns since sorting affects all quadrants
                this.forceRefreshAll();
            }
        });
    }
    createFilterSection() {
        this.filterContainerEl = this.containerEl.createDiv("tg-quadrant-filter-container");
    }
    createQuadrantGrid() {
        this.columnContainerEl = this.containerEl.createDiv("tg-quadrant-grid");
        // Create four quadrant columns
        QUADRANT_DEFINITIONS.forEach((quadrant) => {
            const columnEl = this.columnContainerEl.createDiv(`tg-quadrant-column ${quadrant.className}`);
            const column = new QuadrantColumnComponent(this.app, this.plugin, columnEl, quadrant, {
                onTaskStatusUpdate: (taskId, newStatus) => __awaiter(this, void 0, void 0, function* () {
                    // Call the original callback if provided
                    if (this.params.onTaskStatusUpdate) {
                        yield this.params.onTaskStatusUpdate(taskId, newStatus);
                    }
                    // Trigger a refresh to re-categorize tasks after any task update
                    setTimeout(() => {
                        this.refreshSelectively();
                    }, 100);
                }),
                onTaskSelected: this.params.onTaskSelected,
                onTaskCompleted: this.params.onTaskCompleted,
                onTaskContextMenu: this.params.onTaskContextMenu,
                onTaskUpdated: this.params.onTaskUpdated,
            });
            this.addChild(column);
            this.columns.push(column);
            // Setup drag and drop for this column
            this.setupDragAndDrop(columnEl, quadrant);
        });
    }
    setupDragAndDrop(columnEl, quadrant) {
        const contentEl = columnEl.querySelector(".tg-quadrant-column-content");
        if (!contentEl)
            return;
        // Detect if we're on a mobile device for optimized settings
        const isMobile = !Platform.isDesktop ||
            "ontouchstart" in window ||
            navigator.maxTouchPoints > 0;
        const sortable = new Sortable(contentEl, {
            group: "quadrant-tasks",
            animation: 150,
            ghostClass: "tg-quadrant-card--ghost",
            dragClass: "tg-quadrant-card--dragging",
            // Mobile-specific optimizations - following kanban pattern
            delay: isMobile ? 150 : 0,
            touchStartThreshold: isMobile ? 5 : 3,
            forceFallback: false,
            fallbackOnBody: true,
            // Scroll settings for mobile
            scroll: true,
            scrollSensitivity: isMobile ? 50 : 30,
            scrollSpeed: isMobile ? 15 : 10,
            bubbleScroll: true,
            onEnd: (event) => {
                this.handleSortEnd(event, quadrant);
            },
        });
        this.sortableInstances.push(sortable);
    }
    handleTaskReorder(evt, quadrant) {
        const taskEl = evt.item;
        const taskId = taskEl.getAttribute("data-task-id");
        if (!taskId || evt.oldIndex === evt.newIndex)
            return;
        // Update task order within the same quadrant
        const task = this.tasks.find((t) => t.id === taskId);
        if (!task)
            return;
        // You could implement custom ordering logic here
        // For example, updating a custom order field in task metadata
        console.log(`Reordered task ${taskId} from position ${evt.oldIndex} to ${evt.newIndex} in quadrant ${quadrant.id}`);
    }
    handleSortEnd(event, sourceQuadrant) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Quadrant sort end:", event.oldIndex, event.newIndex);
            const taskId = event.item.dataset.taskId;
            const dropTargetColumnContent = event.to;
            const sourceColumnContent = event.from;
            if (taskId && dropTargetColumnContent && sourceColumnContent) {
                // Get target quadrant information
                const targetQuadrantId = dropTargetColumnContent.getAttribute("data-quadrant-id");
                const targetQuadrant = QUADRANT_DEFINITIONS.find((q) => q.id === targetQuadrantId);
                // Get source quadrant information
                const sourceQuadrantId = sourceColumnContent.getAttribute("data-quadrant-id");
                const actualSourceQuadrant = QUADRANT_DEFINITIONS.find((q) => q.id === sourceQuadrantId);
                if (targetQuadrant && actualSourceQuadrant) {
                    // Handle cross-quadrant moves
                    if (targetQuadrantId !== sourceQuadrantId) {
                        console.log(`Moving task ${taskId} from ${sourceQuadrantId} to ${targetQuadrantId}`);
                        yield this.updateTaskQuadrant(taskId, targetQuadrant, actualSourceQuadrant);
                    }
                    else if (event.oldIndex !== event.newIndex) {
                        // Handle reordering within the same quadrant
                        console.log(`Reordering task ${taskId} within ${targetQuadrantId}`);
                        this.handleTaskReorder(event, targetQuadrant);
                    }
                }
            }
        });
    }
    updateTaskQuadrant(taskId, quadrant, sourceQuadrant) {
        return __awaiter(this, void 0, void 0, function* () {
            const task = this.tasks.find((t) => t.id === taskId);
            if (!task)
                return;
            try {
                // Create a copy of the task for modification
                const updatedTask = Object.assign({}, task);
                // Ensure metadata exists
                if (!updatedTask.metadata) {
                    updatedTask.metadata = {
                        tags: [],
                        children: [],
                    };
                }
                // Update tags in metadata
                const updatedTags = [...(updatedTask.metadata.tags || [])];
                // Get tag names to remove (from source quadrant if provided, otherwise from config)
                const tagsToRemove = [];
                if (sourceQuadrant) {
                    // Remove tags from source quadrant (keep # prefix since metadata.tags includes #)
                    if (sourceQuadrant.urgentTag) {
                        tagsToRemove.push(sourceQuadrant.urgentTag);
                    }
                    if (sourceQuadrant.importantTag) {
                        tagsToRemove.push(sourceQuadrant.importantTag);
                    }
                }
                else {
                    // Fallback: remove all urgent/important tags from config
                    const urgentTag = this.quadrantConfig.urgentTag || "#urgent";
                    const importantTag = this.quadrantConfig.importantTag || "#important";
                    tagsToRemove.push(urgentTag);
                    tagsToRemove.push(importantTag);
                }
                // Remove existing urgent/important tags
                const filteredTags = updatedTags.filter((tag) => !tagsToRemove.includes(tag));
                // Add new tags based on target quadrant (keep # prefix since metadata.tags includes #)
                if (quadrant.urgentTag) {
                    if (!filteredTags.includes(quadrant.urgentTag)) {
                        filteredTags.push(quadrant.urgentTag);
                    }
                }
                if (quadrant.importantTag) {
                    if (!filteredTags.includes(quadrant.importantTag)) {
                        filteredTags.push(quadrant.importantTag);
                    }
                }
                // Update tags in metadata
                updatedTask.metadata.tags = filteredTags;
                // Only update priority if using priority-based classification
                if (this.quadrantConfig.usePriorityForClassification) {
                    // Update priority based on quadrant
                    switch (quadrant.id) {
                        case "urgent-important":
                            updatedTask.metadata.priority = 5; // Highest
                            break;
                        case "not-urgent-important":
                            updatedTask.metadata.priority = 4; // High
                            break;
                        case "urgent-not-important":
                            updatedTask.metadata.priority = 3; // Medium
                            break;
                        case "not-urgent-not-important":
                            updatedTask.metadata.priority = 2; // Low
                            break;
                    }
                }
                // Store quadrant information in metadata using custom fields
                if (!updatedTask.metadata.customFields) {
                    updatedTask.metadata.customFields = {};
                }
                updatedTask.metadata.customFields.quadrant = quadrant.id;
                updatedTask.metadata.customFields.lastQuadrantUpdate =
                    Date.now();
                // Call the onTaskUpdated callback if provided
                if (this.params.onTaskUpdated) {
                    yield this.params.onTaskUpdated(updatedTask);
                }
                // Update the task in our local array
                const taskIndex = this.tasks.findIndex((t) => t.id === taskId);
                if (taskIndex !== -1) {
                    this.tasks[taskIndex] = updatedTask;
                }
                // Show success feedback
                this.showUpdateFeedback(task, quadrant);
                // Refresh the view after a short delay to show the feedback
                setTimeout(() => {
                    this.refresh();
                }, 500);
            }
            catch (error) {
                console.error("Failed to update task quadrant:", error);
                this.showErrorFeedback(task, error);
            }
        });
    }
    showUpdateFeedback(_task, quadrant) {
        // Use Obsidian's native Notice API for feedback
        const message = `${quadrant.priorityEmoji} ${t("Task moved to")} ${quadrant.title}`;
        new Notice(message, 2000);
    }
    showErrorFeedback(_task, error) {
        console.error("Task update error:", error);
        // Use Obsidian's native Notice API for error feedback
        const message = `⚠️ ${t("Failed to update task")}`;
        new Notice(message, 3000);
    }
    categorizeTasksByQuadrant(tasks) {
        const quadrantTasks = new Map();
        // Initialize all quadrants
        QUADRANT_DEFINITIONS.forEach((quadrant) => {
            quadrantTasks.set(quadrant.id, []);
        });
        tasks.forEach((task) => {
            const quadrantId = this.determineTaskQuadrant(task);
            const quadrantTaskList = quadrantTasks.get(quadrantId) || [];
            quadrantTaskList.push(task);
            quadrantTasks.set(quadrantId, quadrantTaskList);
        });
        return quadrantTasks;
    }
    determineTaskQuadrant(task) {
        var _a, _b;
        let isUrgent = false;
        let isImportant = false;
        if (this.quadrantConfig.usePriorityForClassification) {
            // Use priority-based classification
            const priority = ((_a = task.metadata) === null || _a === void 0 ? void 0 : _a.priority) || 0;
            const urgentThreshold = this.quadrantConfig.urgentPriorityThreshold || 4;
            const importantThreshold = this.quadrantConfig.importantPriorityThreshold || 3;
            isUrgent = priority >= urgentThreshold;
            isImportant = priority >= importantThreshold;
        }
        else {
            // Use tag-based classification
            const content = task.content.toLowerCase();
            const tags = ((_b = task.metadata) === null || _b === void 0 ? void 0 : _b.tags) || [];
            // Check urgency: explicit tags, priority level (4-5), or due date
            const urgentTag = (this.quadrantConfig.urgentTag || "#urgent").toLowerCase();
            const isUrgentByTag = content.includes(urgentTag) || tags.includes(urgentTag);
            const isUrgentByOtherCriteria = this.isTaskUrgent(task);
            isUrgent = isUrgentByTag || isUrgentByOtherCriteria;
            // Check importance: explicit tags, priority level (3-5), or important keywords
            const importantTag = (this.quadrantConfig.importantTag || "#important").toLowerCase();
            const isImportantByTag = content.includes(importantTag) || tags.includes(importantTag);
            const isImportantByOtherCriteria = this.isTaskImportant(task);
            isImportant = isImportantByTag || isImportantByOtherCriteria;
        }
        if (isUrgent && isImportant) {
            return "urgent-important";
        }
        else if (!isUrgent && isImportant) {
            return "not-urgent-important";
        }
        else if (isUrgent && !isImportant) {
            return "urgent-not-important";
        }
        else {
            return "not-urgent-not-important";
        }
    }
    isTaskUrgent(task) {
        var _a, _b;
        // Check if task has high priority emojis or due date is soon
        const hasHighPriority = /[🔺⏫]/.test(task.content);
        // Check numeric priority - higher values (4-5) indicate urgent tasks
        const hasHighNumericPriority = ((_a = task.metadata) === null || _a === void 0 ? void 0 : _a.priority) && task.metadata.priority >= 4;
        // Use configured threshold for urgent due dates
        const urgentThresholdMs = (this.quadrantConfig.urgentThresholdDays || 3) *
            24 *
            60 *
            60 *
            1000;
        const hasSoonDueDate = ((_b = task.metadata) === null || _b === void 0 ? void 0 : _b.dueDate) &&
            task.metadata.dueDate <= Date.now() + urgentThresholdMs;
        return hasHighPriority || hasHighNumericPriority || !!hasSoonDueDate;
    }
    isTaskImportant(task) {
        var _a;
        // Check if task has medium-high priority or is part of important projects
        const hasMediumHighPriority = /[🔺⏫🔼]/.test(task.content);
        // Check numeric priority - higher values (3-5) indicate important tasks
        const hasImportantNumericPriority = ((_a = task.metadata) === null || _a === void 0 ? void 0 : _a.priority) && task.metadata.priority >= 3;
        // Could also check for important project tags or keywords
        const hasImportantKeywords = /\b(goal|project|milestone|strategic)\b/i.test(task.content);
        return (hasMediumHighPriority ||
            hasImportantNumericPriority ||
            hasImportantKeywords);
    }
    setTasks(tasks) {
        this.allTasks = [...tasks];
        this.applyFilters();
    }
    applyFilters() {
        // Apply active filters to tasks
        let filteredTasks = [...this.allTasks];
        // TODO: Apply active filters here if needed
        // for (const filter of this.activeFilters) {
        //     filteredTasks = this.applyFilter(filteredTasks, filter);
        // }
        this.tasks = filteredTasks;
        this.refreshSelectively();
    }
    refresh() {
        this.refreshSelectively();
    }
    /**
     * Selective refresh - only update columns that have changed tasks
     */
    refreshSelectively() {
        if (!this.columns.length)
            return;
        // Categorize tasks by quadrant
        const newQuadrantTasks = this.categorizeTasksByQuadrant(this.tasks);
        // Compare with previous state and only update changed columns
        this.columns.forEach((column) => {
            const quadrantId = column.getQuadrantId();
            const newTasks = newQuadrantTasks.get(quadrantId) || [];
            const currentTasks = column.getTasks();
            // Check if tasks have actually changed for this column
            if (this.hasTasksChanged(currentTasks, newTasks)) {
                console.log(`Tasks changed for quadrant ${quadrantId}, updating...`);
                // Sort tasks within each quadrant
                const sortedTasks = this.sortTasks(newTasks);
                // Set tasks for the column
                column.setTasks(sortedTasks);
                // Update visibility
                if (this.hideEmptyColumns && column.isEmpty()) {
                    column.setVisibility(false);
                }
                else {
                    column.setVisibility(true);
                }
                // Force load content only for this specific column if needed
                if (!column.isEmpty() && !column.isLoaded()) {
                    setTimeout(() => {
                        column.forceLoadContent();
                    }, 50);
                }
            }
            else {
                console.log(`No changes for quadrant ${quadrantId}, skipping update`);
            }
        });
    }
    /**
     * Check if tasks have changed between current and new task lists
     */
    hasTasksChanged(currentTasks, newTasks) {
        // Quick length check
        if (currentTasks.length !== newTasks.length) {
            return true;
        }
        // If both are empty, no change
        if (currentTasks.length === 0 && newTasks.length === 0) {
            return false;
        }
        // Create sets of task IDs for comparison
        const currentIds = new Set(currentTasks.map((task) => task.id));
        const newIds = new Set(newTasks.map((task) => task.id));
        // Check if task IDs are different
        if (currentIds.size !== newIds.size) {
            return true;
        }
        // Check if any task ID is different
        for (const id of currentIds) {
            if (!newIds.has(id)) {
                return true;
            }
        }
        // Check if task order has changed (important for sorting)
        for (let i = 0; i < currentTasks.length; i++) {
            if (currentTasks[i].id !== newTasks[i].id) {
                return true; // Order changed
            }
        }
        // Check if task content has changed (more detailed comparison)
        const currentTaskMap = new Map(currentTasks.map((task) => [task.id, task]));
        const newTaskMap = new Map(newTasks.map((task) => [task.id, task]));
        for (const [id, newTask] of newTaskMap) {
            const currentTask = currentTaskMap.get(id);
            if (!currentTask) {
                return true; // New task
            }
            // Check if task content or metadata has changed
            if (this.hasTaskContentChanged(currentTask, newTask)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Check if individual task content has changed
     */
    hasTaskContentChanged(currentTask, newTask) {
        // Compare basic properties
        if (currentTask.content !== newTask.content) {
            return true;
        }
        if (currentTask.status !== newTask.status) {
            return true;
        }
        // Compare metadata if it exists
        if (currentTask.metadata && newTask.metadata) {
            // Check priority
            if (currentTask.metadata.priority !== newTask.metadata.priority) {
                return true;
            }
            // Check dates
            if (currentTask.metadata.dueDate !== newTask.metadata.dueDate) {
                return true;
            }
            if (currentTask.metadata.scheduledDate !==
                newTask.metadata.scheduledDate) {
                return true;
            }
            if (currentTask.metadata.startDate !== newTask.metadata.startDate) {
                return true;
            }
            // Check tags
            const currentTags = currentTask.metadata.tags || [];
            const newTags = newTask.metadata.tags || [];
            if (currentTags.length !== newTags.length ||
                !currentTags.every((tag) => newTags.includes(tag))) {
                return true;
            }
        }
        else if (currentTask.metadata !== newTask.metadata) {
            // One has metadata, the other doesn't
            return true;
        }
        return false;
    }
    /**
     * Force refresh all columns (fallback for when selective refresh isn't sufficient)
     */
    forceRefreshAll() {
        console.log("Force refreshing all columns");
        if (!this.columns.length)
            return;
        // Categorize tasks by quadrant
        const quadrantTasks = this.categorizeTasksByQuadrant(this.tasks);
        // Update each column
        this.columns.forEach((column) => {
            const quadrantId = column.getQuadrantId();
            const tasks = quadrantTasks.get(quadrantId) || [];
            // Sort tasks within each quadrant
            const sortedTasks = this.sortTasks(tasks);
            // Set tasks for the column
            column.setTasks(sortedTasks);
            // Hide empty columns if needed
            if (this.hideEmptyColumns && column.isEmpty()) {
                column.setVisibility(false);
            }
            else {
                column.setVisibility(true);
            }
        });
        // Force load content for all visible columns after a short delay
        setTimeout(() => {
            this.forceLoadAllColumns();
        }, 200);
    }
    forceLoadAllColumns() {
        console.log("Force loading all columns");
        this.columns.forEach((column) => {
            if (!column.isEmpty()) {
                column.forceLoadContent();
            }
        });
    }
    /**
     * Update a specific quadrant column
     */
    updateQuadrant(quadrantId, tasks) {
        const column = this.columns.find((col) => col.getQuadrantId() === quadrantId);
        if (!column) {
            console.warn(`Quadrant column not found: ${quadrantId}`);
            return;
        }
        let tasksToUpdate;
        if (tasks) {
            // Use provided tasks
            tasksToUpdate = tasks;
        }
        else {
            // Recalculate tasks for this quadrant only
            const quadrantTasks = this.categorizeTasksByQuadrant(this.tasks);
            tasksToUpdate = quadrantTasks.get(quadrantId) || [];
        }
        // Sort tasks
        const sortedTasks = this.sortTasks(tasksToUpdate);
        // Update only this column
        column.setTasks(sortedTasks);
        // Update visibility
        if (this.hideEmptyColumns && column.isEmpty()) {
            column.setVisibility(false);
        }
        else {
            column.setVisibility(true);
        }
        console.log(`Updated quadrant ${quadrantId} with ${sortedTasks.length} tasks`);
    }
    /**
     * Batch update multiple quadrants
     */
    updateQuadrants(updates) {
        updates.forEach(({ quadrantId, tasks }) => {
            this.updateQuadrant(quadrantId, tasks);
        });
    }
    sortTasks(tasks) {
        const sortedTasks = [...tasks];
        console.log(`Sorting ${tasks.length} tasks by ${this.sortOption.field} (${this.sortOption.order})`);
        sortedTasks.sort((a, b) => {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            let aValue, bValue;
            switch (this.sortOption.field) {
                case "priority":
                    aValue = this.getTaskPriorityValue(a);
                    bValue = this.getTaskPriorityValue(b);
                    break;
                case "dueDate":
                    aValue = ((_a = a.metadata) === null || _a === void 0 ? void 0 : _a.dueDate) || 0;
                    bValue = ((_b = b.metadata) === null || _b === void 0 ? void 0 : _b.dueDate) || 0;
                    break;
                case "scheduledDate":
                    aValue = ((_c = a.metadata) === null || _c === void 0 ? void 0 : _c.scheduledDate) || 0;
                    bValue = ((_d = b.metadata) === null || _d === void 0 ? void 0 : _d.scheduledDate) || 0;
                    break;
                case "startDate":
                    aValue = ((_e = a.metadata) === null || _e === void 0 ? void 0 : _e.startDate) || 0;
                    bValue = ((_f = b.metadata) === null || _f === void 0 ? void 0 : _f.startDate) || 0;
                    break;
                case "createdDate":
                    aValue = ((_g = a.metadata) === null || _g === void 0 ? void 0 : _g.createdDate) || 0;
                    bValue = ((_h = b.metadata) === null || _h === void 0 ? void 0 : _h.createdDate) || 0;
                    break;
                default:
                    return 0;
            }
            if (this.sortOption.order === "asc") {
                return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
            }
            else {
                return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
            }
        });
        // Log first few tasks for debugging
        if (sortedTasks.length > 0) {
            console.log(`First 3 sorted tasks:`, sortedTasks.slice(0, 3).map((t) => {
                var _a, _b;
                return ({
                    id: t.id,
                    content: t.content.substring(0, 50),
                    priority: this.getTaskPriorityValue(t),
                    dueDate: (_a = t.metadata) === null || _a === void 0 ? void 0 : _a.dueDate,
                    scheduledDate: (_b = t.metadata) === null || _b === void 0 ? void 0 : _b.scheduledDate,
                });
            }));
        }
        return sortedTasks;
    }
    getTaskPriorityValue(task) {
        var _a;
        // First check if task has numeric priority in metadata
        if (((_a = task.metadata) === null || _a === void 0 ? void 0 : _a.priority) &&
            typeof task.metadata.priority === "number") {
            return task.metadata.priority;
        }
        // Fallback to emoji-based priority detection
        if (task.content.includes("🔺"))
            return 5; // Highest
        if (task.content.includes("⏫"))
            return 4; // High
        if (task.content.includes("🔼"))
            return 3; // Medium
        if (task.content.includes("🔽"))
            return 2; // Low
        if (task.content.includes("⏬"))
            return 1; // Lowest
        return 0; // No priority
    }
    getQuadrantStats() {
        const quadrantTasks = this.categorizeTasksByQuadrant(this.tasks);
        const stats = {};
        QUADRANT_DEFINITIONS.forEach((quadrant) => {
            var _a;
            stats[quadrant.id] = ((_a = quadrantTasks.get(quadrant.id)) === null || _a === void 0 ? void 0 : _a.length) || 0;
        });
        return stats;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVhZHJhbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJxdWFkcmFudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFPLFNBQVMsRUFBVyxRQUFRLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBR3hGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzVELE9BQU8sUUFBUSxNQUFNLFlBQVksQ0FBQztBQUNsQyxPQUFPLGdDQUFnQyxDQUFDO0FBQ3hDLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQTJCMUMsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQXlCO0lBQ3pEO1FBQ0MsRUFBRSxFQUFFLGtCQUFrQjtRQUN0QixLQUFLLEVBQUUsQ0FBQyxDQUFDLG9CQUFvQixDQUFDO1FBQzlCLFdBQVcsRUFBRSxDQUFDLENBQUMsaUNBQWlDLENBQUM7UUFDakQsYUFBYSxFQUFFLElBQUk7UUFDbkIsU0FBUyxFQUFFLFNBQVM7UUFDcEIsWUFBWSxFQUFFLFlBQVk7UUFDMUIsU0FBUyxFQUFFLDJCQUEyQjtLQUN0QztJQUNEO1FBQ0MsRUFBRSxFQUFFLHNCQUFzQjtRQUMxQixLQUFLLEVBQUUsQ0FBQyxDQUFDLHdCQUF3QixDQUFDO1FBQ2xDLFdBQVcsRUFBRSxDQUFDLENBQUMsbUNBQW1DLENBQUM7UUFDbkQsYUFBYSxFQUFFLEdBQUc7UUFDbEIsWUFBWSxFQUFFLFlBQVk7UUFDMUIsU0FBUyxFQUFFLCtCQUErQjtLQUMxQztJQUNEO1FBQ0MsRUFBRSxFQUFFLHNCQUFzQjtRQUMxQixLQUFLLEVBQUUsQ0FBQyxDQUFDLHdCQUF3QixDQUFDO1FBQ2xDLFdBQVcsRUFBRSxDQUFDLENBQUMseUNBQXlDLENBQUM7UUFDekQsYUFBYSxFQUFFLElBQUk7UUFDbkIsU0FBUyxFQUFFLFNBQVM7UUFDcEIsU0FBUyxFQUFFLCtCQUErQjtLQUMxQztJQUNEO1FB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QVEsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFBLE1BQUEsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLDBDQUFFLE1BQU0sS0FBSSxDQUFDLENBQUM7UUFDbEUsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcCwgQ29tcG9uZW50LCBzZXRJY29uLCBQbGF0Zm9ybSwgRHJvcGRvd25Db21wb25lbnQsIE5vdGljZSB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiQC90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7IFF1YWRyYW50Q29sdW1uQ29tcG9uZW50IH0gZnJvbSBcIi4vcXVhZHJhbnQtY29sdW1uXCI7XHJcbmltcG9ydCBTb3J0YWJsZSBmcm9tIFwic29ydGFibGVqc1wiO1xyXG5pbXBvcnQgXCJAL3N0eWxlcy9xdWFkcmFudC9xdWFkcmFudC5jc3NcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHsgRmlsdGVyQ29tcG9uZW50IH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy90YXNrL2ZpbHRlci9pbi12aWV3L2ZpbHRlclwiO1xyXG5pbXBvcnQgeyBBY3RpdmVGaWx0ZXIgfSBmcm9tIFwiQC9jb21wb25lbnRzL2ZlYXR1cmVzL3Rhc2svZmlsdGVyL2luLXZpZXcvZmlsdGVyLXR5cGVcIjtcclxuaW1wb3J0IHsgUXVhZHJhbnRTcGVjaWZpY0NvbmZpZyB9IGZyb20gXCJAL2NvbW1vbi9zZXR0aW5nLWRlZmluaXRpb25cIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUXVhZHJhbnRTb3J0T3B0aW9uIHtcclxuXHRmaWVsZDpcclxuXHRcdHwgXCJwcmlvcml0eVwiXHJcblx0XHR8IFwiZHVlRGF0ZVwiXHJcblx0XHR8IFwic2NoZWR1bGVkRGF0ZVwiXHJcblx0XHR8IFwic3RhcnREYXRlXCJcclxuXHRcdHwgXCJjcmVhdGVkRGF0ZVwiO1xyXG5cdG9yZGVyOiBcImFzY1wiIHwgXCJkZXNjXCI7XHJcblx0bGFiZWw6IHN0cmluZztcclxufVxyXG5cclxuLy8g5Zub6LGh6ZmQ5a6a5LmJXHJcbmV4cG9ydCBpbnRlcmZhY2UgUXVhZHJhbnREZWZpbml0aW9uIHtcclxuXHRpZDogc3RyaW5nO1xyXG5cdHRpdGxlOiBzdHJpbmc7XHJcblx0ZGVzY3JpcHRpb246IHN0cmluZztcclxuXHRwcmlvcml0eUVtb2ppOiBzdHJpbmc7XHJcblx0dXJnZW50VGFnPzogc3RyaW5nOyAvLyDntKfmgKXku7vliqHmoIfnrb5cclxuXHRpbXBvcnRhbnRUYWc/OiBzdHJpbmc7IC8vIOmHjeimgeS7u+WKoeagh+etvlxyXG5cdGNsYXNzTmFtZTogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgUVVBRFJBTlRfREVGSU5JVElPTlM6IFF1YWRyYW50RGVmaW5pdGlvbltdID0gW1xyXG5cdHtcclxuXHRcdGlkOiBcInVyZ2VudC1pbXBvcnRhbnRcIixcclxuXHRcdHRpdGxlOiB0KFwiVXJnZW50ICYgSW1wb3J0YW50XCIpLFxyXG5cdFx0ZGVzY3JpcHRpb246IHQoXCJEbyBGaXJzdCAtIENyaXNpcyAmIGVtZXJnZW5jaWVzXCIpLFxyXG5cdFx0cHJpb3JpdHlFbW9qaTogXCLwn5S6XCIsIC8vIEhpZ2hlc3QgcHJpb3JpdHlcclxuXHRcdHVyZ2VudFRhZzogXCIjdXJnZW50XCIsXHJcblx0XHRpbXBvcnRhbnRUYWc6IFwiI2ltcG9ydGFudFwiLFxyXG5cdFx0Y2xhc3NOYW1lOiBcInF1YWRyYW50LXVyZ2VudC1pbXBvcnRhbnRcIixcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiBcIm5vdC11cmdlbnQtaW1wb3J0YW50XCIsXHJcblx0XHR0aXRsZTogdChcIk5vdCBVcmdlbnQgJiBJbXBvcnRhbnRcIiksXHJcblx0XHRkZXNjcmlwdGlvbjogdChcIlNjaGVkdWxlIC0gUGxhbm5pbmcgJiBkZXZlbG9wbWVudFwiKSxcclxuXHRcdHByaW9yaXR5RW1vamk6IFwi4o+rXCIsIC8vIEhpZ2ggcHJpb3JpdHlcclxuXHRcdGltcG9ydGFudFRhZzogXCIjaW1wb3J0YW50XCIsXHJcblx0XHRjbGFzc05hbWU6IFwicXVhZHJhbnQtbm90LXVyZ2VudC1pbXBvcnRhbnRcIixcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiBcInVyZ2VudC1ub3QtaW1wb3J0YW50XCIsXHJcblx0XHR0aXRsZTogdChcIlVyZ2VudCAmIE5vdCBJbXBvcnRhbnRcIiksXHJcblx0XHRkZXNjcmlwdGlvbjogdChcIkRlbGVnYXRlIC0gSW50ZXJydXB0aW9ucyAmIGRpc3RyYWN0aW9uc1wiKSxcclxuXHRcdHByaW9yaXR5RW1vamk6IFwi8J+UvFwiLCAvLyBNZWRpdW0gcHJpb3JpdHlcclxuXHRcdHVyZ2VudFRhZzogXCIjdXJnZW50XCIsXHJcblx0XHRjbGFzc05hbWU6IFwicXVhZHJhbnQtdXJnZW50LW5vdC1pbXBvcnRhbnRcIixcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiBcIm5vdC11cmdlbnQtbm90LWltcG9ydGFudFwiLFxyXG5cdFx0dGl0bGU6IHQoXCJOb3QgVXJnZW50ICYgTm90IEltcG9ydGFudFwiKSxcclxuXHRcdGRlc2NyaXB0aW9uOiB0KFwiRWxpbWluYXRlIC0gVGltZSB3YXN0ZXJzXCIpLFxyXG5cdFx0cHJpb3JpdHlFbW9qaTogXCLwn5S9XCIsIC8vIExvdyBwcmlvcml0eVxyXG5cdFx0Y2xhc3NOYW1lOiBcInF1YWRyYW50LW5vdC11cmdlbnQtbm90LWltcG9ydGFudFwiLFxyXG5cdH0sXHJcbl07XHJcblxyXG5leHBvcnQgY2xhc3MgUXVhZHJhbnRDb21wb25lbnQgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luO1xyXG5cdGFwcDogQXBwO1xyXG5cdHB1YmxpYyBjb250YWluZXJFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBjb2x1bW5zOiBRdWFkcmFudENvbHVtbkNvbXBvbmVudFtdID0gW107XHJcblx0cHJpdmF0ZSBjb2x1bW5Db250YWluZXJFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBzb3J0YWJsZUluc3RhbmNlczogU29ydGFibGVbXSA9IFtdO1xyXG5cdHByaXZhdGUgdGFza3M6IFRhc2tbXSA9IFtdO1xyXG5cdHByaXZhdGUgYWxsVGFza3M6IFRhc2tbXSA9IFtdO1xyXG5cdHByaXZhdGUgY3VycmVudFZpZXdJZDogc3RyaW5nID0gXCJxdWFkcmFudFwiO1xyXG5cdHByaXZhdGUgcGFyYW1zOiB7XHJcblx0XHRvblRhc2tTdGF0dXNVcGRhdGU/OiAoXHJcblx0XHRcdHRhc2tJZDogc3RyaW5nLFxyXG5cdFx0XHRuZXdTdGF0dXNNYXJrOiBzdHJpbmdcclxuXHRcdCkgPT4gUHJvbWlzZTx2b2lkPjtcclxuXHRcdG9uVGFza1NlbGVjdGVkPzogKHRhc2s6IFRhc2spID0+IHZvaWQ7XHJcblx0XHRvblRhc2tDb21wbGV0ZWQ/OiAodGFzazogVGFzaykgPT4gdm9pZDtcclxuXHRcdG9uVGFza0NvbnRleHRNZW51PzogKGV2OiBNb3VzZUV2ZW50LCB0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdFx0b25UYXNrVXBkYXRlZD86ICh0YXNrOiBUYXNrKSA9PiBQcm9taXNlPHZvaWQ+O1xyXG5cdH07XHJcblx0cHJpdmF0ZSBmaWx0ZXJDb21wb25lbnQ6IEZpbHRlckNvbXBvbmVudCB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgYWN0aXZlRmlsdGVyczogQWN0aXZlRmlsdGVyW10gPSBbXTtcclxuXHRwcml2YXRlIGZpbHRlckNvbnRhaW5lckVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIHNvcnRPcHRpb246IFF1YWRyYW50U29ydE9wdGlvbiA9IHtcclxuXHRcdGZpZWxkOiBcInByaW9yaXR5XCIsXHJcblx0XHRvcmRlcjogXCJkZXNjXCIsXHJcblx0XHRsYWJlbDogXCJQcmlvcml0eSAoSGlnaCB0byBMb3cpXCIsXHJcblx0fTtcclxuXHRwcml2YXRlIGhpZGVFbXB0eUNvbHVtbnM6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcblx0XHQvLyBQZXItdmlldyBvdmVycmlkZSBmcm9tIEJhc2VzXHJcblx0XHRwcml2YXRlIGNvbmZpZ092ZXJyaWRlOiBQYXJ0aWFsPFF1YWRyYW50U3BlY2lmaWNDb25maWc+IHwgbnVsbCA9IG51bGw7XHJcblxyXG5cclxuXHQvLyBRdWFkcmFudC1zcGVjaWZpYyBjb25maWd1cmF0aW9uXHJcblx0cHJpdmF0ZSBnZXQgcXVhZHJhbnRDb25maWcoKSB7XHJcblx0XHRjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3Mudmlld0NvbmZpZ3VyYXRpb24uZmluZChcclxuXHRcdFx0KHYpID0+IHYuaWQgPT09IHRoaXMuY3VycmVudFZpZXdJZFxyXG5cdFx0KTtcclxuXHRcdGlmIChcclxuXHRcdFx0dmlldyAmJlxyXG5cdFx0XHR2aWV3LnNwZWNpZmljQ29uZmlnICYmXHJcblx0XHRcdHZpZXcuc3BlY2lmaWNDb25maWcudmlld1R5cGUgPT09IFwicXVhZHJhbnRcIlxyXG5cdFx0KSB7XHJcblx0XHRcdHJldHVybiB7IC4uLih2aWV3LnNwZWNpZmljQ29uZmlnIGFzIGFueSksIC4uLih0aGlzLmNvbmZpZ092ZXJyaWRlID8/IHt9KSB9O1xyXG5cdFx0fVxyXG5cdFx0Ly8gRmFsbGJhY2sgdG8gZGVmYXVsdCBxdWFkcmFudCBjb25maWdcclxuXHRcdGNvbnN0IGRlZmF1bHRWaWV3ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3Mudmlld0NvbmZpZ3VyYXRpb24uZmluZChcclxuXHRcdFx0KHYpID0+IHYuaWQgPT09IFwicXVhZHJhbnRcIlxyXG5cdFx0KTtcclxuXHRcdGNvbnN0IGJhc2UgPSAoZGVmYXVsdFZpZXc/LnNwZWNpZmljQ29uZmlnIGFzIGFueSkgfHwge1xyXG5cdFx0XHR1cmdlbnRUYWc6IFwiI3VyZ2VudFwiLFxyXG5cdFx0XHRpbXBvcnRhbnRUYWc6IFwiI2ltcG9ydGFudFwiLFxyXG5cdFx0XHR1cmdlbnRUaHJlc2hvbGREYXlzOiAzLFxyXG5cdFx0fTtcclxuXHRcdHJldHVybiB7IC4uLmJhc2UsIC4uLih0aGlzLmNvbmZpZ092ZXJyaWRlID8/IHt9KSB9O1xyXG5cdH1cclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRhcHA6IEFwcCxcclxuXHRcdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0cGFyZW50RWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0aW5pdGlhbFRhc2tzOiBUYXNrW10gPSBbXSxcclxuXHRcdHBhcmFtczoge1xyXG5cdFx0XHRvblRhc2tTdGF0dXNVcGRhdGU/OiAoXHJcblx0XHRcdFx0dGFza0lkOiBzdHJpbmcsXHJcblx0XHRcdFx0bmV3U3RhdHVzTWFyazogc3RyaW5nXHJcblx0XHRcdCkgPT4gUHJvbWlzZTx2b2lkPjtcclxuXHRcdFx0b25UYXNrU2VsZWN0ZWQ/OiAodGFzazogVGFzaykgPT4gdm9pZDtcclxuXHRcdFx0b25UYXNrQ29tcGxldGVkPzogKHRhc2s6IFRhc2spID0+IHZvaWQ7XHJcblx0XHRcdG9uVGFza0NvbnRleHRNZW51PzogKGV2OiBNb3VzZUV2ZW50LCB0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdFx0XHRvblRhc2tVcGRhdGVkPzogKHRhc2s6IFRhc2spID0+IFByb21pc2U8dm9pZD47XHJcblx0XHR9ID0ge30sXHJcblx0XHR2aWV3SWQ6IHN0cmluZyA9IFwicXVhZHJhbnRcIlxyXG5cdCkge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMuYXBwID0gYXBwO1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0XHR0aGlzLmN1cnJlbnRWaWV3SWQgPSB2aWV3SWQ7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsID0gcGFyZW50RWwuY3JlYXRlRGl2KFxyXG5cdFx0XHRcInRnLXF1YWRyYW50LWNvbXBvbmVudC1jb250YWluZXJcIlxyXG5cdFx0KTtcclxuXHJcblxyXG5cdFx0dGhpcy50YXNrcyA9IGluaXRpYWxUYXNrcztcclxuXHRcdHRoaXMucGFyYW1zID0gcGFyYW1zO1xyXG5cdH1cclxuXHJcblx0b3ZlcnJpZGUgb25sb2FkKCkge1xyXG5cdFx0c3VwZXIub25sb2FkKCk7XHJcblx0XHR0aGlzLnJlbmRlcigpO1xyXG5cdH1cclxuXHJcblxyXG5cdFx0cHVibGljIHNldENvbmZpZ092ZXJyaWRlKG92ZXJyaWRlOiBQYXJ0aWFsPFF1YWRyYW50U3BlY2lmaWNDb25maWc+IHwgbnVsbCk6IHZvaWQge1xyXG5cdFx0XHR0aGlzLmNvbmZpZ092ZXJyaWRlID0gb3ZlcnJpZGUgPz8gbnVsbDtcclxuXHRcdFx0Ly8gUmUtcmVuZGVyIHRvIGFwcGx5IG5ldyBjb25maWcgc2FmZWx5XHJcblx0XHRcdHRoaXMuY2xlYW51cCgpO1xyXG5cdFx0XHR0aGlzLnJlbmRlcigpO1xyXG5cdFx0fVxyXG5cclxuXHRvdmVycmlkZSBvbnVubG9hZCgpIHtcclxuXHRcdHRoaXMuY2xlYW51cCgpO1xyXG5cdFx0c3VwZXIub251bmxvYWQoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY2xlYW51cCgpIHtcclxuXHRcdC8vIENsZWFuIHVwIHNvcnRhYmxlIGluc3RhbmNlc1xyXG5cdFx0dGhpcy5zb3J0YWJsZUluc3RhbmNlcy5mb3JFYWNoKChzb3J0YWJsZSkgPT4ge1xyXG5cdFx0XHRzb3J0YWJsZS5kZXN0cm95KCk7XHJcblx0XHR9KTtcclxuXHRcdHRoaXMuc29ydGFibGVJbnN0YW5jZXMgPSBbXTtcclxuXHJcblx0XHQvLyBDbGVhbiB1cCBjb2x1bW5zXHJcblx0XHR0aGlzLmNvbHVtbnMuZm9yRWFjaCgoY29sdW1uKSA9PiB7XHJcblx0XHRcdGNvbHVtbi5vbnVubG9hZCgpO1xyXG5cdFx0fSk7XHJcblx0XHR0aGlzLmNvbHVtbnMgPSBbXTtcclxuXHJcblx0XHQvLyBDbGVhbiB1cCBmaWx0ZXIgY29tcG9uZW50XHJcblx0XHRpZiAodGhpcy5maWx0ZXJDb21wb25lbnQpIHtcclxuXHRcdFx0dGhpcy5maWx0ZXJDb21wb25lbnQub251bmxvYWQoKTtcclxuXHRcdFx0dGhpcy5maWx0ZXJDb21wb25lbnQgPSBudWxsO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSByZW5kZXIoKSB7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLmVtcHR5KCk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGhlYWRlciB3aXRoIGNvbnRyb2xzXHJcblx0XHR0aGlzLmNyZWF0ZUhlYWRlcigpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBmaWx0ZXIgc2VjdGlvblxyXG5cdFx0dGhpcy5jcmVhdGVGaWx0ZXJTZWN0aW9uKCk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIG1haW4gcXVhZHJhbnQgZ3JpZFxyXG5cdFx0dGhpcy5jcmVhdGVRdWFkcmFudEdyaWQoKTtcclxuXHJcblx0XHQvLyBJbml0aWFsaXplIHRoZSB2aWV3XHJcblx0XHR0aGlzLnJlZnJlc2goKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY3JlYXRlSGVhZGVyKCkge1xyXG5cdFx0Y29uc3QgaGVhZGVyRWwgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdihcInRnLXF1YWRyYW50LWhlYWRlclwiKTtcclxuXHJcblx0XHRjb25zdCB0aXRsZUVsID0gaGVhZGVyRWwuY3JlYXRlRGl2KFwidGctcXVhZHJhbnQtdGl0bGVcIik7XHJcblx0XHR0aXRsZUVsLnRleHRDb250ZW50ID0gdChcIk1hdHJpeFwiKTtcclxuXHJcblx0XHRjb25zdCBjb250cm9sc0VsID0gaGVhZGVyRWwuY3JlYXRlRGl2KFwidGctcXVhZHJhbnQtY29udHJvbHNcIik7XHJcblxyXG5cdFx0Ly8gU29ydCBkcm9wZG93blxyXG5cdFx0Y29uc3Qgc29ydEVsID0gY29udHJvbHNFbC5jcmVhdGVEaXYoXCJ0Zy1xdWFkcmFudC1zb3J0XCIpO1xyXG5cclxuXHRcdGNvbnN0IHNvcnRPcHRpb25zOiBRdWFkcmFudFNvcnRPcHRpb25bXSA9IFtcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGZpZWxkOiBcInByaW9yaXR5XCIsXHJcblx0XHRcdFx0b3JkZXI6IFwiZGVzY1wiLFxyXG5cdFx0XHRcdGxhYmVsOiB0KFwiUHJpb3JpdHkgKEhpZ2ggdG8gTG93KVwiKSxcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGZpZWxkOiBcInByaW9yaXR5XCIsXHJcblx0XHRcdFx0b3JkZXI6IFwiYXNjXCIsXHJcblx0XHRcdFx0bGFiZWw6IHQoXCJQcmlvcml0eSAoTG93IHRvIEhpZ2gpXCIpLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0ZmllbGQ6IFwiZHVlRGF0ZVwiLFxyXG5cdFx0XHRcdG9yZGVyOiBcImFzY1wiLFxyXG5cdFx0XHRcdGxhYmVsOiB0KFwiRHVlIERhdGUgKEVhcmxpZXN0IEZpcnN0KVwiKSxcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGZpZWxkOiBcImR1ZURhdGVcIixcclxuXHRcdFx0XHRvcmRlcjogXCJkZXNjXCIsXHJcblx0XHRcdFx0bGFiZWw6IHQoXCJEdWUgRGF0ZSAoTGF0ZXN0IEZpcnN0KVwiKSxcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGZpZWxkOiBcImNyZWF0ZWREYXRlXCIsXHJcblx0XHRcdFx0b3JkZXI6IFwiZGVzY1wiLFxyXG5cdFx0XHRcdGxhYmVsOiB0KFwiQ3JlYXRlZCBEYXRlIChOZXdlc3QgRmlyc3QpXCIpLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0ZmllbGQ6IFwiY3JlYXRlZERhdGVcIixcclxuXHRcdFx0XHRvcmRlcjogXCJhc2NcIixcclxuXHRcdFx0XHRsYWJlbDogdChcIkNyZWF0ZWQgRGF0ZSAoT2xkZXN0IEZpcnN0KVwiKSxcclxuXHRcdFx0fSxcclxuXHRcdF07XHJcblxyXG5cdFx0Ly8g5Yib5bu6IERyb3Bkb3duQ29tcG9uZW50IOW5tua3u+WKoOWIsCBzb3J0RWxcclxuXHRcdGNvbnN0IHNvcnREcm9wZG93biA9IG5ldyBEcm9wZG93bkNvbXBvbmVudChzb3J0RWwpO1xyXG5cclxuXHRcdC8vIOWhq+WFheS4i+aLiemAiemhuVxyXG5cdFx0c29ydE9wdGlvbnMuZm9yRWFjaCgob3B0aW9uKSA9PiB7XHJcblx0XHRcdGNvbnN0IHZhbHVlID0gYCR7b3B0aW9uLmZpZWxkfS0ke29wdGlvbi5vcmRlcn1gO1xyXG5cdFx0XHRzb3J0RHJvcGRvd24uYWRkT3B0aW9uKHZhbHVlLCBvcHRpb24ubGFiZWwpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8g6K6+572u5b2T5YmN6YCJ5Lit6aG577yI5aaC5p6c5pyJ77yJXHJcblx0XHRjb25zdCBjdXJyZW50VmFsdWUgPSBgJHt0aGlzLnNvcnRPcHRpb24uZmllbGR9LSR7dGhpcy5zb3J0T3B0aW9uLm9yZGVyfWA7XHJcblx0XHRzb3J0RHJvcGRvd24uc2V0VmFsdWUoY3VycmVudFZhbHVlKTtcclxuXHJcblx0XHQvLyDnm5HlkKzkuIvmi4npgInmi6nlj5jljJZcclxuXHRcdHNvcnREcm9wZG93bi5vbkNoYW5nZSgodmFsdWU6IHN0cmluZykgPT4ge1xyXG5cdFx0XHRjb25zdCBbZmllbGQsIG9yZGVyXSA9IHZhbHVlLnNwbGl0KFwiLVwiKTtcclxuXHRcdFx0Y29uc3QgbmV3U29ydE9wdGlvbiA9XHJcblx0XHRcdFx0c29ydE9wdGlvbnMuZmluZChcclxuXHRcdFx0XHRcdChvcHQpID0+IG9wdC5maWVsZCA9PT0gZmllbGQgJiYgb3B0Lm9yZGVyID09PSBvcmRlclxyXG5cdFx0XHRcdCkgfHwgdGhpcy5zb3J0T3B0aW9uO1xyXG5cclxuXHRcdFx0Ly8gT25seSB1cGRhdGUgaWYgdGhlIHNvcnQgb3B0aW9uIGFjdHVhbGx5IGNoYW5nZWRcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdG5ld1NvcnRPcHRpb24uZmllbGQgIT09IHRoaXMuc29ydE9wdGlvbi5maWVsZCB8fFxyXG5cdFx0XHRcdG5ld1NvcnRPcHRpb24ub3JkZXIgIT09IHRoaXMuc29ydE9wdGlvbi5vcmRlclxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdGBTb3J0IG9wdGlvbiBjaGFuZ2VkIGZyb20gJHt0aGlzLnNvcnRPcHRpb24uZmllbGR9LSR7dGhpcy5zb3J0T3B0aW9uLm9yZGVyfSB0byAke25ld1NvcnRPcHRpb24uZmllbGR9LSR7bmV3U29ydE9wdGlvbi5vcmRlcn1gXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHR0aGlzLnNvcnRPcHRpb24gPSBuZXdTb3J0T3B0aW9uO1xyXG5cdFx0XHRcdC8vIEZvcmNlIHJlZnJlc2ggYWxsIGNvbHVtbnMgc2luY2Ugc29ydGluZyBhZmZlY3RzIGFsbCBxdWFkcmFudHNcclxuXHRcdFx0XHR0aGlzLmZvcmNlUmVmcmVzaEFsbCgpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY3JlYXRlRmlsdGVyU2VjdGlvbigpIHtcclxuXHRcdHRoaXMuZmlsdGVyQ29udGFpbmVyRWwgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdihcclxuXHRcdFx0XCJ0Zy1xdWFkcmFudC1maWx0ZXItY29udGFpbmVyXCJcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNyZWF0ZVF1YWRyYW50R3JpZCgpIHtcclxuXHRcdHRoaXMuY29sdW1uQ29udGFpbmVyRWwgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdihcInRnLXF1YWRyYW50LWdyaWRcIik7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGZvdXIgcXVhZHJhbnQgY29sdW1uc1xyXG5cdFx0UVVBRFJBTlRfREVGSU5JVElPTlMuZm9yRWFjaCgocXVhZHJhbnQpID0+IHtcclxuXHRcdFx0Y29uc3QgY29sdW1uRWwgPSB0aGlzLmNvbHVtbkNvbnRhaW5lckVsLmNyZWF0ZURpdihcclxuXHRcdFx0XHRgdGctcXVhZHJhbnQtY29sdW1uICR7cXVhZHJhbnQuY2xhc3NOYW1lfWBcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGNvbnN0IGNvbHVtbiA9IG5ldyBRdWFkcmFudENvbHVtbkNvbXBvbmVudChcclxuXHRcdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0XHRjb2x1bW5FbCxcclxuXHRcdFx0XHRxdWFkcmFudCxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRvblRhc2tTdGF0dXNVcGRhdGU6IGFzeW5jIChcclxuXHRcdFx0XHRcdFx0dGFza0lkOiBzdHJpbmcsXHJcblx0XHRcdFx0XHRcdG5ld1N0YXR1czogc3RyaW5nXHJcblx0XHRcdFx0XHQpID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8gQ2FsbCB0aGUgb3JpZ2luYWwgY2FsbGJhY2sgaWYgcHJvdmlkZWRcclxuXHRcdFx0XHRcdFx0aWYgKHRoaXMucGFyYW1zLm9uVGFza1N0YXR1c1VwZGF0ZSkge1xyXG5cdFx0XHRcdFx0XHRcdGF3YWl0IHRoaXMucGFyYW1zLm9uVGFza1N0YXR1c1VwZGF0ZShcclxuXHRcdFx0XHRcdFx0XHRcdHRhc2tJZCxcclxuXHRcdFx0XHRcdFx0XHRcdG5ld1N0YXR1c1xyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0Ly8gVHJpZ2dlciBhIHJlZnJlc2ggdG8gcmUtY2F0ZWdvcml6ZSB0YXNrcyBhZnRlciBhbnkgdGFzayB1cGRhdGVcclxuXHRcdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5yZWZyZXNoU2VsZWN0aXZlbHkoKTtcclxuXHRcdFx0XHRcdFx0fSwgMTAwKTtcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRvblRhc2tTZWxlY3RlZDogdGhpcy5wYXJhbXMub25UYXNrU2VsZWN0ZWQsXHJcblx0XHRcdFx0XHRvblRhc2tDb21wbGV0ZWQ6IHRoaXMucGFyYW1zLm9uVGFza0NvbXBsZXRlZCxcclxuXHRcdFx0XHRcdG9uVGFza0NvbnRleHRNZW51OiB0aGlzLnBhcmFtcy5vblRhc2tDb250ZXh0TWVudSxcclxuXHRcdFx0XHRcdG9uVGFza1VwZGF0ZWQ6IHRoaXMucGFyYW1zLm9uVGFza1VwZGF0ZWQsXHJcblx0XHRcdFx0fVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0dGhpcy5hZGRDaGlsZChjb2x1bW4pO1xyXG5cdFx0XHR0aGlzLmNvbHVtbnMucHVzaChjb2x1bW4pO1xyXG5cclxuXHRcdFx0Ly8gU2V0dXAgZHJhZyBhbmQgZHJvcCBmb3IgdGhpcyBjb2x1bW5cclxuXHRcdFx0dGhpcy5zZXR1cERyYWdBbmREcm9wKGNvbHVtbkVsLCBxdWFkcmFudCk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc2V0dXBEcmFnQW5kRHJvcChcclxuXHRcdGNvbHVtbkVsOiBIVE1MRWxlbWVudCxcclxuXHRcdHF1YWRyYW50OiBRdWFkcmFudERlZmluaXRpb25cclxuXHQpIHtcclxuXHRcdGNvbnN0IGNvbnRlbnRFbCA9IGNvbHVtbkVsLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFwiLnRnLXF1YWRyYW50LWNvbHVtbi1jb250ZW50XCJcclxuXHRcdCkgYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRpZiAoIWNvbnRlbnRFbCkgcmV0dXJuO1xyXG5cclxuXHRcdC8vIERldGVjdCBpZiB3ZSdyZSBvbiBhIG1vYmlsZSBkZXZpY2UgZm9yIG9wdGltaXplZCBzZXR0aW5nc1xyXG5cdFx0Y29uc3QgaXNNb2JpbGUgPVxyXG5cdFx0XHQhUGxhdGZvcm0uaXNEZXNrdG9wIHx8XHJcblx0XHRcdFwib250b3VjaHN0YXJ0XCIgaW4gd2luZG93IHx8XHJcblx0XHRcdG5hdmlnYXRvci5tYXhUb3VjaFBvaW50cyA+IDA7XHJcblxyXG5cdFx0Y29uc3Qgc29ydGFibGUgPSBuZXcgU29ydGFibGUoY29udGVudEVsLCB7XHJcblx0XHRcdGdyb3VwOiBcInF1YWRyYW50LXRhc2tzXCIsXHJcblx0XHRcdGFuaW1hdGlvbjogMTUwLFxyXG5cdFx0XHRnaG9zdENsYXNzOiBcInRnLXF1YWRyYW50LWNhcmQtLWdob3N0XCIsXHJcblx0XHRcdGRyYWdDbGFzczogXCJ0Zy1xdWFkcmFudC1jYXJkLS1kcmFnZ2luZ1wiLFxyXG5cdFx0XHQvLyBNb2JpbGUtc3BlY2lmaWMgb3B0aW1pemF0aW9ucyAtIGZvbGxvd2luZyBrYW5iYW4gcGF0dGVyblxyXG5cdFx0XHRkZWxheTogaXNNb2JpbGUgPyAxNTAgOiAwLCAvLyBMb25nZXIgZGVsYXkgb24gbW9iaWxlIHRvIGRpc3Rpbmd1aXNoIGZyb20gc2Nyb2xsXHJcblx0XHRcdHRvdWNoU3RhcnRUaHJlc2hvbGQ6IGlzTW9iaWxlID8gNSA6IDMsIC8vIE1vcmUgdGhyZXNob2xkIG9uIG1vYmlsZVxyXG5cdFx0XHRmb3JjZUZhbGxiYWNrOiBmYWxzZSwgLy8gVXNlIG5hdGl2ZSBIVE1MNSBkcmFnIHdoZW4gcG9zc2libGVcclxuXHRcdFx0ZmFsbGJhY2tPbkJvZHk6IHRydWUsIC8vIEFwcGVuZCBnaG9zdCB0byBib2R5IGZvciBiZXR0ZXIgbW9iaWxlIHBlcmZvcm1hbmNlXHJcblx0XHRcdC8vIFNjcm9sbCBzZXR0aW5ncyBmb3IgbW9iaWxlXHJcblx0XHRcdHNjcm9sbDogdHJ1ZSwgLy8gRW5hYmxlIGF1dG8tc2Nyb2xsaW5nXHJcblx0XHRcdHNjcm9sbFNlbnNpdGl2aXR5OiBpc01vYmlsZSA/IDUwIDogMzAsIC8vIEhpZ2hlciBzZW5zaXRpdml0eSBvbiBtb2JpbGVcclxuXHRcdFx0c2Nyb2xsU3BlZWQ6IGlzTW9iaWxlID8gMTUgOiAxMCwgLy8gRmFzdGVyIHNjcm9sbCBvbiBtb2JpbGVcclxuXHRcdFx0YnViYmxlU2Nyb2xsOiB0cnVlLCAvLyBFbmFibGUgYnViYmxlIHNjcm9sbGluZyBmb3IgbmVzdGVkIGNvbnRhaW5lcnNcclxuXHJcblx0XHRcdG9uRW5kOiAoZXZlbnQpID0+IHtcclxuXHRcdFx0XHR0aGlzLmhhbmRsZVNvcnRFbmQoZXZlbnQsIHF1YWRyYW50KTtcclxuXHRcdFx0fSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuc29ydGFibGVJbnN0YW5jZXMucHVzaChzb3J0YWJsZSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGhhbmRsZVRhc2tSZW9yZGVyKGV2dDogYW55LCBxdWFkcmFudDogUXVhZHJhbnREZWZpbml0aW9uKSB7XHJcblx0XHRjb25zdCB0YXNrRWwgPSBldnQuaXRlbTtcclxuXHRcdGNvbnN0IHRhc2tJZCA9IHRhc2tFbC5nZXRBdHRyaWJ1dGUoXCJkYXRhLXRhc2staWRcIik7XHJcblxyXG5cdFx0aWYgKCF0YXNrSWQgfHwgZXZ0Lm9sZEluZGV4ID09PSBldnQubmV3SW5kZXgpIHJldHVybjtcclxuXHJcblx0XHQvLyBVcGRhdGUgdGFzayBvcmRlciB3aXRoaW4gdGhlIHNhbWUgcXVhZHJhbnRcclxuXHRcdGNvbnN0IHRhc2sgPSB0aGlzLnRhc2tzLmZpbmQoKHQpID0+IHQuaWQgPT09IHRhc2tJZCk7XHJcblx0XHRpZiAoIXRhc2spIHJldHVybjtcclxuXHJcblx0XHQvLyBZb3UgY291bGQgaW1wbGVtZW50IGN1c3RvbSBvcmRlcmluZyBsb2dpYyBoZXJlXHJcblx0XHQvLyBGb3IgZXhhbXBsZSwgdXBkYXRpbmcgYSBjdXN0b20gb3JkZXIgZmllbGQgaW4gdGFzayBtZXRhZGF0YVxyXG5cdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdGBSZW9yZGVyZWQgdGFzayAke3Rhc2tJZH0gZnJvbSBwb3NpdGlvbiAke2V2dC5vbGRJbmRleH0gdG8gJHtldnQubmV3SW5kZXh9IGluIHF1YWRyYW50ICR7cXVhZHJhbnQuaWR9YFxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgaGFuZGxlU29ydEVuZChcclxuXHRcdGV2ZW50OiBTb3J0YWJsZS5Tb3J0YWJsZUV2ZW50LFxyXG5cdFx0c291cmNlUXVhZHJhbnQ6IFF1YWRyYW50RGVmaW5pdGlvblxyXG5cdCkge1xyXG5cdFx0Y29uc29sZS5sb2coXCJRdWFkcmFudCBzb3J0IGVuZDpcIiwgZXZlbnQub2xkSW5kZXgsIGV2ZW50Lm5ld0luZGV4KTtcclxuXHRcdGNvbnN0IHRhc2tJZCA9IGV2ZW50Lml0ZW0uZGF0YXNldC50YXNrSWQ7XHJcblx0XHRjb25zdCBkcm9wVGFyZ2V0Q29sdW1uQ29udGVudCA9IGV2ZW50LnRvO1xyXG5cdFx0Y29uc3Qgc291cmNlQ29sdW1uQ29udGVudCA9IGV2ZW50LmZyb207XHJcblxyXG5cdFx0aWYgKHRhc2tJZCAmJiBkcm9wVGFyZ2V0Q29sdW1uQ29udGVudCAmJiBzb3VyY2VDb2x1bW5Db250ZW50KSB7XHJcblx0XHRcdC8vIEdldCB0YXJnZXQgcXVhZHJhbnQgaW5mb3JtYXRpb25cclxuXHRcdFx0Y29uc3QgdGFyZ2V0UXVhZHJhbnRJZCA9XHJcblx0XHRcdFx0ZHJvcFRhcmdldENvbHVtbkNvbnRlbnQuZ2V0QXR0cmlidXRlKFwiZGF0YS1xdWFkcmFudC1pZFwiKTtcclxuXHRcdFx0Y29uc3QgdGFyZ2V0UXVhZHJhbnQgPSBRVUFEUkFOVF9ERUZJTklUSU9OUy5maW5kKFxyXG5cdFx0XHRcdChxKSA9PiBxLmlkID09PSB0YXJnZXRRdWFkcmFudElkXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBHZXQgc291cmNlIHF1YWRyYW50IGluZm9ybWF0aW9uXHJcblx0XHRcdGNvbnN0IHNvdXJjZVF1YWRyYW50SWQgPVxyXG5cdFx0XHRcdHNvdXJjZUNvbHVtbkNvbnRlbnQuZ2V0QXR0cmlidXRlKFwiZGF0YS1xdWFkcmFudC1pZFwiKTtcclxuXHRcdFx0Y29uc3QgYWN0dWFsU291cmNlUXVhZHJhbnQgPSBRVUFEUkFOVF9ERUZJTklUSU9OUy5maW5kKFxyXG5cdFx0XHRcdChxKSA9PiBxLmlkID09PSBzb3VyY2VRdWFkcmFudElkXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRpZiAodGFyZ2V0UXVhZHJhbnQgJiYgYWN0dWFsU291cmNlUXVhZHJhbnQpIHtcclxuXHRcdFx0XHQvLyBIYW5kbGUgY3Jvc3MtcXVhZHJhbnQgbW92ZXNcclxuXHRcdFx0XHRpZiAodGFyZ2V0UXVhZHJhbnRJZCAhPT0gc291cmNlUXVhZHJhbnRJZCkge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcdGBNb3ZpbmcgdGFzayAke3Rhc2tJZH0gZnJvbSAke3NvdXJjZVF1YWRyYW50SWR9IHRvICR7dGFyZ2V0UXVhZHJhbnRJZH1gXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0YXdhaXQgdGhpcy51cGRhdGVUYXNrUXVhZHJhbnQoXHJcblx0XHRcdFx0XHRcdHRhc2tJZCxcclxuXHRcdFx0XHRcdFx0dGFyZ2V0UXVhZHJhbnQsXHJcblx0XHRcdFx0XHRcdGFjdHVhbFNvdXJjZVF1YWRyYW50XHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAoZXZlbnQub2xkSW5kZXggIT09IGV2ZW50Lm5ld0luZGV4KSB7XHJcblx0XHRcdFx0XHQvLyBIYW5kbGUgcmVvcmRlcmluZyB3aXRoaW4gdGhlIHNhbWUgcXVhZHJhbnRcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRgUmVvcmRlcmluZyB0YXNrICR7dGFza0lkfSB3aXRoaW4gJHt0YXJnZXRRdWFkcmFudElkfWBcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR0aGlzLmhhbmRsZVRhc2tSZW9yZGVyKGV2ZW50LCB0YXJnZXRRdWFkcmFudCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIHVwZGF0ZVRhc2tRdWFkcmFudChcclxuXHRcdHRhc2tJZDogc3RyaW5nLFxyXG5cdFx0cXVhZHJhbnQ6IFF1YWRyYW50RGVmaW5pdGlvbixcclxuXHRcdHNvdXJjZVF1YWRyYW50PzogUXVhZHJhbnREZWZpbml0aW9uXHJcblx0KSB7XHJcblx0XHRjb25zdCB0YXNrID0gdGhpcy50YXNrcy5maW5kKCh0KSA9PiB0LmlkID09PSB0YXNrSWQpO1xyXG5cdFx0aWYgKCF0YXNrKSByZXR1cm47XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Ly8gQ3JlYXRlIGEgY29weSBvZiB0aGUgdGFzayBmb3IgbW9kaWZpY2F0aW9uXHJcblx0XHRcdGNvbnN0IHVwZGF0ZWRUYXNrID0geyAuLi50YXNrIH07XHJcblxyXG5cdFx0XHQvLyBFbnN1cmUgbWV0YWRhdGEgZXhpc3RzXHJcblx0XHRcdGlmICghdXBkYXRlZFRhc2subWV0YWRhdGEpIHtcclxuXHRcdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YSA9IHtcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFVwZGF0ZSB0YWdzIGluIG1ldGFkYXRhXHJcblx0XHRcdGNvbnN0IHVwZGF0ZWRUYWdzID0gWy4uLih1cGRhdGVkVGFzay5tZXRhZGF0YS50YWdzIHx8IFtdKV07XHJcblxyXG5cdFx0XHQvLyBHZXQgdGFnIG5hbWVzIHRvIHJlbW92ZSAoZnJvbSBzb3VyY2UgcXVhZHJhbnQgaWYgcHJvdmlkZWQsIG90aGVyd2lzZSBmcm9tIGNvbmZpZylcclxuXHRcdFx0Y29uc3QgdGFnc1RvUmVtb3ZlOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuXHRcdFx0aWYgKHNvdXJjZVF1YWRyYW50KSB7XHJcblx0XHRcdFx0Ly8gUmVtb3ZlIHRhZ3MgZnJvbSBzb3VyY2UgcXVhZHJhbnQgKGtlZXAgIyBwcmVmaXggc2luY2UgbWV0YWRhdGEudGFncyBpbmNsdWRlcyAjKVxyXG5cdFx0XHRcdGlmIChzb3VyY2VRdWFkcmFudC51cmdlbnRUYWcpIHtcclxuXHRcdFx0XHRcdHRhZ3NUb1JlbW92ZS5wdXNoKHNvdXJjZVF1YWRyYW50LnVyZ2VudFRhZyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGlmIChzb3VyY2VRdWFkcmFudC5pbXBvcnRhbnRUYWcpIHtcclxuXHRcdFx0XHRcdHRhZ3NUb1JlbW92ZS5wdXNoKHNvdXJjZVF1YWRyYW50LmltcG9ydGFudFRhZyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIEZhbGxiYWNrOiByZW1vdmUgYWxsIHVyZ2VudC9pbXBvcnRhbnQgdGFncyBmcm9tIGNvbmZpZ1xyXG5cdFx0XHRcdGNvbnN0IHVyZ2VudFRhZyA9IHRoaXMucXVhZHJhbnRDb25maWcudXJnZW50VGFnIHx8IFwiI3VyZ2VudFwiO1xyXG5cdFx0XHRcdGNvbnN0IGltcG9ydGFudFRhZyA9XHJcblx0XHRcdFx0XHR0aGlzLnF1YWRyYW50Q29uZmlnLmltcG9ydGFudFRhZyB8fCBcIiNpbXBvcnRhbnRcIjtcclxuXHRcdFx0XHR0YWdzVG9SZW1vdmUucHVzaCh1cmdlbnRUYWcpO1xyXG5cdFx0XHRcdHRhZ3NUb1JlbW92ZS5wdXNoKGltcG9ydGFudFRhZyk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFJlbW92ZSBleGlzdGluZyB1cmdlbnQvaW1wb3J0YW50IHRhZ3NcclxuXHRcdFx0Y29uc3QgZmlsdGVyZWRUYWdzID0gdXBkYXRlZFRhZ3MuZmlsdGVyKFxyXG5cdFx0XHRcdCh0YWcpID0+ICF0YWdzVG9SZW1vdmUuaW5jbHVkZXModGFnKVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gQWRkIG5ldyB0YWdzIGJhc2VkIG9uIHRhcmdldCBxdWFkcmFudCAoa2VlcCAjIHByZWZpeCBzaW5jZSBtZXRhZGF0YS50YWdzIGluY2x1ZGVzICMpXHJcblx0XHRcdGlmIChxdWFkcmFudC51cmdlbnRUYWcpIHtcclxuXHRcdFx0XHRpZiAoIWZpbHRlcmVkVGFncy5pbmNsdWRlcyhxdWFkcmFudC51cmdlbnRUYWcpKSB7XHJcblx0XHRcdFx0XHRmaWx0ZXJlZFRhZ3MucHVzaChxdWFkcmFudC51cmdlbnRUYWcpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAocXVhZHJhbnQuaW1wb3J0YW50VGFnKSB7XHJcblx0XHRcdFx0aWYgKCFmaWx0ZXJlZFRhZ3MuaW5jbHVkZXMocXVhZHJhbnQuaW1wb3J0YW50VGFnKSkge1xyXG5cdFx0XHRcdFx0ZmlsdGVyZWRUYWdzLnB1c2gocXVhZHJhbnQuaW1wb3J0YW50VGFnKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFVwZGF0ZSB0YWdzIGluIG1ldGFkYXRhXHJcblx0XHRcdHVwZGF0ZWRUYXNrLm1ldGFkYXRhLnRhZ3MgPSBmaWx0ZXJlZFRhZ3M7XHJcblxyXG5cdFx0XHQvLyBPbmx5IHVwZGF0ZSBwcmlvcml0eSBpZiB1c2luZyBwcmlvcml0eS1iYXNlZCBjbGFzc2lmaWNhdGlvblxyXG5cdFx0XHRpZiAodGhpcy5xdWFkcmFudENvbmZpZy51c2VQcmlvcml0eUZvckNsYXNzaWZpY2F0aW9uKSB7XHJcblx0XHRcdFx0Ly8gVXBkYXRlIHByaW9yaXR5IGJhc2VkIG9uIHF1YWRyYW50XHJcblx0XHRcdFx0c3dpdGNoIChxdWFkcmFudC5pZCkge1xyXG5cdFx0XHRcdFx0Y2FzZSBcInVyZ2VudC1pbXBvcnRhbnRcIjpcclxuXHRcdFx0XHRcdFx0dXBkYXRlZFRhc2subWV0YWRhdGEucHJpb3JpdHkgPSA1OyAvLyBIaWdoZXN0XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcIm5vdC11cmdlbnQtaW1wb3J0YW50XCI6XHJcblx0XHRcdFx0XHRcdHVwZGF0ZWRUYXNrLm1ldGFkYXRhLnByaW9yaXR5ID0gNDsgLy8gSGlnaFxyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgXCJ1cmdlbnQtbm90LWltcG9ydGFudFwiOlxyXG5cdFx0XHRcdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YS5wcmlvcml0eSA9IDM7IC8vIE1lZGl1bVxyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgXCJub3QtdXJnZW50LW5vdC1pbXBvcnRhbnRcIjpcclxuXHRcdFx0XHRcdFx0dXBkYXRlZFRhc2subWV0YWRhdGEucHJpb3JpdHkgPSAyOyAvLyBMb3dcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBTdG9yZSBxdWFkcmFudCBpbmZvcm1hdGlvbiBpbiBtZXRhZGF0YSB1c2luZyBjdXN0b20gZmllbGRzXHJcblx0XHRcdGlmICghKHVwZGF0ZWRUYXNrLm1ldGFkYXRhIGFzIGFueSkuY3VzdG9tRmllbGRzKSB7XHJcblx0XHRcdFx0KHVwZGF0ZWRUYXNrLm1ldGFkYXRhIGFzIGFueSkuY3VzdG9tRmllbGRzID0ge307XHJcblx0XHRcdH1cclxuXHRcdFx0KHVwZGF0ZWRUYXNrLm1ldGFkYXRhIGFzIGFueSkuY3VzdG9tRmllbGRzLnF1YWRyYW50ID0gcXVhZHJhbnQuaWQ7XHJcblx0XHRcdCh1cGRhdGVkVGFzay5tZXRhZGF0YSBhcyBhbnkpLmN1c3RvbUZpZWxkcy5sYXN0UXVhZHJhbnRVcGRhdGUgPVxyXG5cdFx0XHRcdERhdGUubm93KCk7XHJcblxyXG5cdFx0XHQvLyBDYWxsIHRoZSBvblRhc2tVcGRhdGVkIGNhbGxiYWNrIGlmIHByb3ZpZGVkXHJcblx0XHRcdGlmICh0aGlzLnBhcmFtcy5vblRhc2tVcGRhdGVkKSB7XHJcblx0XHRcdFx0YXdhaXQgdGhpcy5wYXJhbXMub25UYXNrVXBkYXRlZCh1cGRhdGVkVGFzayk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFVwZGF0ZSB0aGUgdGFzayBpbiBvdXIgbG9jYWwgYXJyYXlcclxuXHRcdFx0Y29uc3QgdGFza0luZGV4ID0gdGhpcy50YXNrcy5maW5kSW5kZXgoKHQpID0+IHQuaWQgPT09IHRhc2tJZCk7XHJcblx0XHRcdGlmICh0YXNrSW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0dGhpcy50YXNrc1t0YXNrSW5kZXhdID0gdXBkYXRlZFRhc2s7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFNob3cgc3VjY2VzcyBmZWVkYmFja1xyXG5cdFx0XHR0aGlzLnNob3dVcGRhdGVGZWVkYmFjayh0YXNrLCBxdWFkcmFudCk7XHJcblxyXG5cdFx0XHQvLyBSZWZyZXNoIHRoZSB2aWV3IGFmdGVyIGEgc2hvcnQgZGVsYXkgdG8gc2hvdyB0aGUgZmVlZGJhY2tcclxuXHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5yZWZyZXNoKCk7XHJcblx0XHRcdH0sIDUwMCk7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIHVwZGF0ZSB0YXNrIHF1YWRyYW50OlwiLCBlcnJvcik7XHJcblx0XHRcdHRoaXMuc2hvd0Vycm9yRmVlZGJhY2sodGFzaywgZXJyb3IpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBzaG93VXBkYXRlRmVlZGJhY2soX3Rhc2s6IFRhc2ssIHF1YWRyYW50OiBRdWFkcmFudERlZmluaXRpb24pIHtcclxuXHRcdC8vIFVzZSBPYnNpZGlhbidzIG5hdGl2ZSBOb3RpY2UgQVBJIGZvciBmZWVkYmFja1xyXG5cdFx0Y29uc3QgbWVzc2FnZSA9IGAke3F1YWRyYW50LnByaW9yaXR5RW1vaml9ICR7dChcIlRhc2sgbW92ZWQgdG9cIil9ICR7cXVhZHJhbnQudGl0bGV9YDtcclxuXHRcdG5ldyBOb3RpY2UobWVzc2FnZSwgMjAwMCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHNob3dFcnJvckZlZWRiYWNrKF90YXNrOiBUYXNrLCBlcnJvcjogYW55KSB7XHJcblx0XHRjb25zb2xlLmVycm9yKFwiVGFzayB1cGRhdGUgZXJyb3I6XCIsIGVycm9yKTtcclxuXHJcblx0XHQvLyBVc2UgT2JzaWRpYW4ncyBuYXRpdmUgTm90aWNlIEFQSSBmb3IgZXJyb3IgZmVlZGJhY2tcclxuXHRcdGNvbnN0IG1lc3NhZ2UgPSBg4pqg77iPICR7dChcIkZhaWxlZCB0byB1cGRhdGUgdGFza1wiKX1gO1xyXG5cdFx0bmV3IE5vdGljZShtZXNzYWdlLCAzMDAwKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY2F0ZWdvcml6ZVRhc2tzQnlRdWFkcmFudCh0YXNrczogVGFza1tdKTogTWFwPHN0cmluZywgVGFza1tdPiB7XHJcblx0XHRjb25zdCBxdWFkcmFudFRhc2tzID0gbmV3IE1hcDxzdHJpbmcsIFRhc2tbXT4oKTtcclxuXHJcblx0XHQvLyBJbml0aWFsaXplIGFsbCBxdWFkcmFudHNcclxuXHRcdFFVQURSQU5UX0RFRklOSVRJT05TLmZvckVhY2goKHF1YWRyYW50KSA9PiB7XHJcblx0XHRcdHF1YWRyYW50VGFza3Muc2V0KHF1YWRyYW50LmlkLCBbXSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0YXNrcy5mb3JFYWNoKCh0YXNrKSA9PiB7XHJcblx0XHRcdGNvbnN0IHF1YWRyYW50SWQgPSB0aGlzLmRldGVybWluZVRhc2tRdWFkcmFudCh0YXNrKTtcclxuXHRcdFx0Y29uc3QgcXVhZHJhbnRUYXNrTGlzdCA9IHF1YWRyYW50VGFza3MuZ2V0KHF1YWRyYW50SWQpIHx8IFtdO1xyXG5cdFx0XHRxdWFkcmFudFRhc2tMaXN0LnB1c2godGFzayk7XHJcblx0XHRcdHF1YWRyYW50VGFza3Muc2V0KHF1YWRyYW50SWQsIHF1YWRyYW50VGFza0xpc3QpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIHF1YWRyYW50VGFza3M7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGRldGVybWluZVRhc2tRdWFkcmFudCh0YXNrOiBUYXNrKTogc3RyaW5nIHtcclxuXHRcdGxldCBpc1VyZ2VudCA9IGZhbHNlO1xyXG5cdFx0bGV0IGlzSW1wb3J0YW50ID0gZmFsc2U7XHJcblxyXG5cdFx0aWYgKHRoaXMucXVhZHJhbnRDb25maWcudXNlUHJpb3JpdHlGb3JDbGFzc2lmaWNhdGlvbikge1xyXG5cdFx0XHQvLyBVc2UgcHJpb3JpdHktYmFzZWQgY2xhc3NpZmljYXRpb25cclxuXHRcdFx0Y29uc3QgcHJpb3JpdHkgPSB0YXNrLm1ldGFkYXRhPy5wcmlvcml0eSB8fCAwO1xyXG5cdFx0XHRjb25zdCB1cmdlbnRUaHJlc2hvbGQgPVxyXG5cdFx0XHRcdHRoaXMucXVhZHJhbnRDb25maWcudXJnZW50UHJpb3JpdHlUaHJlc2hvbGQgfHwgNDtcclxuXHRcdFx0Y29uc3QgaW1wb3J0YW50VGhyZXNob2xkID1cclxuXHRcdFx0XHR0aGlzLnF1YWRyYW50Q29uZmlnLmltcG9ydGFudFByaW9yaXR5VGhyZXNob2xkIHx8IDM7XHJcblxyXG5cdFx0XHRpc1VyZ2VudCA9IHByaW9yaXR5ID49IHVyZ2VudFRocmVzaG9sZDtcclxuXHRcdFx0aXNJbXBvcnRhbnQgPSBwcmlvcml0eSA+PSBpbXBvcnRhbnRUaHJlc2hvbGQ7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBVc2UgdGFnLWJhc2VkIGNsYXNzaWZpY2F0aW9uXHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSB0YXNrLmNvbnRlbnQudG9Mb3dlckNhc2UoKTtcclxuXHRcdFx0Y29uc3QgdGFncyA9IHRhc2subWV0YWRhdGE/LnRhZ3MgfHwgW107XHJcblxyXG5cdFx0XHQvLyBDaGVjayB1cmdlbmN5OiBleHBsaWNpdCB0YWdzLCBwcmlvcml0eSBsZXZlbCAoNC01KSwgb3IgZHVlIGRhdGVcclxuXHRcdFx0Y29uc3QgdXJnZW50VGFnID0gKFxyXG5cdFx0XHRcdHRoaXMucXVhZHJhbnRDb25maWcudXJnZW50VGFnIHx8IFwiI3VyZ2VudFwiXHJcblx0XHRcdCkudG9Mb3dlckNhc2UoKTtcclxuXHRcdFx0Y29uc3QgaXNVcmdlbnRCeVRhZyA9XHJcblx0XHRcdFx0Y29udGVudC5pbmNsdWRlcyh1cmdlbnRUYWcpIHx8IHRhZ3MuaW5jbHVkZXModXJnZW50VGFnKTtcclxuXHRcdFx0Y29uc3QgaXNVcmdlbnRCeU90aGVyQ3JpdGVyaWEgPSB0aGlzLmlzVGFza1VyZ2VudCh0YXNrKTtcclxuXHRcdFx0aXNVcmdlbnQgPSBpc1VyZ2VudEJ5VGFnIHx8IGlzVXJnZW50QnlPdGhlckNyaXRlcmlhO1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgaW1wb3J0YW5jZTogZXhwbGljaXQgdGFncywgcHJpb3JpdHkgbGV2ZWwgKDMtNSksIG9yIGltcG9ydGFudCBrZXl3b3Jkc1xyXG5cdFx0XHRjb25zdCBpbXBvcnRhbnRUYWcgPSAoXHJcblx0XHRcdFx0dGhpcy5xdWFkcmFudENvbmZpZy5pbXBvcnRhbnRUYWcgfHwgXCIjaW1wb3J0YW50XCJcclxuXHRcdFx0KS50b0xvd2VyQ2FzZSgpO1xyXG5cdFx0XHRjb25zdCBpc0ltcG9ydGFudEJ5VGFnID1cclxuXHRcdFx0XHRjb250ZW50LmluY2x1ZGVzKGltcG9ydGFudFRhZykgfHwgdGFncy5pbmNsdWRlcyhpbXBvcnRhbnRUYWcpO1xyXG5cdFx0XHRjb25zdCBpc0ltcG9ydGFudEJ5T3RoZXJDcml0ZXJpYSA9IHRoaXMuaXNUYXNrSW1wb3J0YW50KHRhc2spO1xyXG5cdFx0XHRpc0ltcG9ydGFudCA9IGlzSW1wb3J0YW50QnlUYWcgfHwgaXNJbXBvcnRhbnRCeU90aGVyQ3JpdGVyaWE7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKGlzVXJnZW50ICYmIGlzSW1wb3J0YW50KSB7XHJcblx0XHRcdHJldHVybiBcInVyZ2VudC1pbXBvcnRhbnRcIjtcclxuXHRcdH0gZWxzZSBpZiAoIWlzVXJnZW50ICYmIGlzSW1wb3J0YW50KSB7XHJcblx0XHRcdHJldHVybiBcIm5vdC11cmdlbnQtaW1wb3J0YW50XCI7XHJcblx0XHR9IGVsc2UgaWYgKGlzVXJnZW50ICYmICFpc0ltcG9ydGFudCkge1xyXG5cdFx0XHRyZXR1cm4gXCJ1cmdlbnQtbm90LWltcG9ydGFudFwiO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0cmV0dXJuIFwibm90LXVyZ2VudC1ub3QtaW1wb3J0YW50XCI7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGlzVGFza1VyZ2VudCh0YXNrOiBUYXNrKTogYm9vbGVhbiB7XHJcblx0XHQvLyBDaGVjayBpZiB0YXNrIGhhcyBoaWdoIHByaW9yaXR5IGVtb2ppcyBvciBkdWUgZGF0ZSBpcyBzb29uXHJcblx0XHRjb25zdCBoYXNIaWdoUHJpb3JpdHkgPSAvW/CflLrij6tdLy50ZXN0KHRhc2suY29udGVudCk7XHJcblxyXG5cdFx0Ly8gQ2hlY2sgbnVtZXJpYyBwcmlvcml0eSAtIGhpZ2hlciB2YWx1ZXMgKDQtNSkgaW5kaWNhdGUgdXJnZW50IHRhc2tzXHJcblx0XHRjb25zdCBoYXNIaWdoTnVtZXJpY1ByaW9yaXR5ID1cclxuXHRcdFx0dGFzay5tZXRhZGF0YT8ucHJpb3JpdHkgJiYgdGFzay5tZXRhZGF0YS5wcmlvcml0eSA+PSA0O1xyXG5cclxuXHRcdC8vIFVzZSBjb25maWd1cmVkIHRocmVzaG9sZCBmb3IgdXJnZW50IGR1ZSBkYXRlc1xyXG5cdFx0Y29uc3QgdXJnZW50VGhyZXNob2xkTXMgPVxyXG5cdFx0XHQodGhpcy5xdWFkcmFudENvbmZpZy51cmdlbnRUaHJlc2hvbGREYXlzIHx8IDMpICpcclxuXHRcdFx0MjQgKlxyXG5cdFx0XHQ2MCAqXHJcblx0XHRcdDYwICpcclxuXHRcdFx0MTAwMDtcclxuXHRcdGNvbnN0IGhhc1Nvb25EdWVEYXRlID1cclxuXHRcdFx0dGFzay5tZXRhZGF0YT8uZHVlRGF0ZSAmJlxyXG5cdFx0XHR0YXNrLm1ldGFkYXRhLmR1ZURhdGUgPD0gRGF0ZS5ub3coKSArIHVyZ2VudFRocmVzaG9sZE1zO1xyXG5cclxuXHRcdHJldHVybiBoYXNIaWdoUHJpb3JpdHkgfHwgaGFzSGlnaE51bWVyaWNQcmlvcml0eSB8fCAhIWhhc1Nvb25EdWVEYXRlO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBpc1Rhc2tJbXBvcnRhbnQodGFzazogVGFzayk6IGJvb2xlYW4ge1xyXG5cdFx0Ly8gQ2hlY2sgaWYgdGFzayBoYXMgbWVkaXVtLWhpZ2ggcHJpb3JpdHkgb3IgaXMgcGFydCBvZiBpbXBvcnRhbnQgcHJvamVjdHNcclxuXHRcdGNvbnN0IGhhc01lZGl1bUhpZ2hQcmlvcml0eSA9IC9b8J+UuuKPq/CflLxdLy50ZXN0KHRhc2suY29udGVudCk7XHJcblxyXG5cdFx0Ly8gQ2hlY2sgbnVtZXJpYyBwcmlvcml0eSAtIGhpZ2hlciB2YWx1ZXMgKDMtNSkgaW5kaWNhdGUgaW1wb3J0YW50IHRhc2tzXHJcblx0XHRjb25zdCBoYXNJbXBvcnRhbnROdW1lcmljUHJpb3JpdHkgPVxyXG5cdFx0XHR0YXNrLm1ldGFkYXRhPy5wcmlvcml0eSAmJiB0YXNrLm1ldGFkYXRhLnByaW9yaXR5ID49IDM7XHJcblxyXG5cdFx0Ly8gQ291bGQgYWxzbyBjaGVjayBmb3IgaW1wb3J0YW50IHByb2plY3QgdGFncyBvciBrZXl3b3Jkc1xyXG5cdFx0Y29uc3QgaGFzSW1wb3J0YW50S2V5d29yZHMgPVxyXG5cdFx0XHQvXFxiKGdvYWx8cHJvamVjdHxtaWxlc3RvbmV8c3RyYXRlZ2ljKVxcYi9pLnRlc3QodGFzay5jb250ZW50KTtcclxuXHJcblx0XHRyZXR1cm4gKFxyXG5cdFx0XHRoYXNNZWRpdW1IaWdoUHJpb3JpdHkgfHxcclxuXHRcdFx0aGFzSW1wb3J0YW50TnVtZXJpY1ByaW9yaXR5IHx8XHJcblx0XHRcdGhhc0ltcG9ydGFudEtleXdvcmRzXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0cHVibGljIHNldFRhc2tzKHRhc2tzOiBUYXNrW10pIHtcclxuXHRcdHRoaXMuYWxsVGFza3MgPSBbLi4udGFza3NdO1xyXG5cdFx0dGhpcy5hcHBseUZpbHRlcnMoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXBwbHlGaWx0ZXJzKCkge1xyXG5cdFx0Ly8gQXBwbHkgYWN0aXZlIGZpbHRlcnMgdG8gdGFza3NcclxuXHRcdGxldCBmaWx0ZXJlZFRhc2tzID0gWy4uLnRoaXMuYWxsVGFza3NdO1xyXG5cclxuXHRcdC8vIFRPRE86IEFwcGx5IGFjdGl2ZSBmaWx0ZXJzIGhlcmUgaWYgbmVlZGVkXHJcblx0XHQvLyBmb3IgKGNvbnN0IGZpbHRlciBvZiB0aGlzLmFjdGl2ZUZpbHRlcnMpIHtcclxuXHRcdC8vICAgICBmaWx0ZXJlZFRhc2tzID0gdGhpcy5hcHBseUZpbHRlcihmaWx0ZXJlZFRhc2tzLCBmaWx0ZXIpO1xyXG5cdFx0Ly8gfVxyXG5cclxuXHRcdHRoaXMudGFza3MgPSBmaWx0ZXJlZFRhc2tzO1xyXG5cdFx0dGhpcy5yZWZyZXNoU2VsZWN0aXZlbHkoKTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyByZWZyZXNoKCkge1xyXG5cdFx0dGhpcy5yZWZyZXNoU2VsZWN0aXZlbHkoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNlbGVjdGl2ZSByZWZyZXNoIC0gb25seSB1cGRhdGUgY29sdW1ucyB0aGF0IGhhdmUgY2hhbmdlZCB0YXNrc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgcmVmcmVzaFNlbGVjdGl2ZWx5KCkge1xyXG5cdFx0aWYgKCF0aGlzLmNvbHVtbnMubGVuZ3RoKSByZXR1cm47XHJcblxyXG5cdFx0Ly8gQ2F0ZWdvcml6ZSB0YXNrcyBieSBxdWFkcmFudFxyXG5cdFx0Y29uc3QgbmV3UXVhZHJhbnRUYXNrcyA9IHRoaXMuY2F0ZWdvcml6ZVRhc2tzQnlRdWFkcmFudCh0aGlzLnRhc2tzKTtcclxuXHJcblx0XHQvLyBDb21wYXJlIHdpdGggcHJldmlvdXMgc3RhdGUgYW5kIG9ubHkgdXBkYXRlIGNoYW5nZWQgY29sdW1uc1xyXG5cdFx0dGhpcy5jb2x1bW5zLmZvckVhY2goKGNvbHVtbikgPT4ge1xyXG5cdFx0XHRjb25zdCBxdWFkcmFudElkID0gY29sdW1uLmdldFF1YWRyYW50SWQoKTtcclxuXHRcdFx0Y29uc3QgbmV3VGFza3MgPSBuZXdRdWFkcmFudFRhc2tzLmdldChxdWFkcmFudElkKSB8fCBbXTtcclxuXHRcdFx0Y29uc3QgY3VycmVudFRhc2tzID0gY29sdW1uLmdldFRhc2tzKCk7XHJcblxyXG5cdFx0XHQvLyBDaGVjayBpZiB0YXNrcyBoYXZlIGFjdHVhbGx5IGNoYW5nZWQgZm9yIHRoaXMgY29sdW1uXHJcblx0XHRcdGlmICh0aGlzLmhhc1Rhc2tzQ2hhbmdlZChjdXJyZW50VGFza3MsIG5ld1Rhc2tzKSkge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0YFRhc2tzIGNoYW5nZWQgZm9yIHF1YWRyYW50ICR7cXVhZHJhbnRJZH0sIHVwZGF0aW5nLi4uYFxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdC8vIFNvcnQgdGFza3Mgd2l0aGluIGVhY2ggcXVhZHJhbnRcclxuXHRcdFx0XHRjb25zdCBzb3J0ZWRUYXNrcyA9IHRoaXMuc29ydFRhc2tzKG5ld1Rhc2tzKTtcclxuXHJcblx0XHRcdFx0Ly8gU2V0IHRhc2tzIGZvciB0aGUgY29sdW1uXHJcblx0XHRcdFx0Y29sdW1uLnNldFRhc2tzKHNvcnRlZFRhc2tzKTtcclxuXHJcblx0XHRcdFx0Ly8gVXBkYXRlIHZpc2liaWxpdHlcclxuXHRcdFx0XHRpZiAodGhpcy5oaWRlRW1wdHlDb2x1bW5zICYmIGNvbHVtbi5pc0VtcHR5KCkpIHtcclxuXHRcdFx0XHRcdGNvbHVtbi5zZXRWaXNpYmlsaXR5KGZhbHNlKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0Y29sdW1uLnNldFZpc2liaWxpdHkodHJ1ZSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBGb3JjZSBsb2FkIGNvbnRlbnQgb25seSBmb3IgdGhpcyBzcGVjaWZpYyBjb2x1bW4gaWYgbmVlZGVkXHJcblx0XHRcdFx0aWYgKCFjb2x1bW4uaXNFbXB0eSgpICYmICFjb2x1bW4uaXNMb2FkZWQoKSkge1xyXG5cdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0XHRcdGNvbHVtbi5mb3JjZUxvYWRDb250ZW50KCk7XHJcblx0XHRcdFx0XHR9LCA1MCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0YE5vIGNoYW5nZXMgZm9yIHF1YWRyYW50ICR7cXVhZHJhbnRJZH0sIHNraXBwaW5nIHVwZGF0ZWBcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGlmIHRhc2tzIGhhdmUgY2hhbmdlZCBiZXR3ZWVuIGN1cnJlbnQgYW5kIG5ldyB0YXNrIGxpc3RzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBoYXNUYXNrc0NoYW5nZWQoY3VycmVudFRhc2tzOiBUYXNrW10sIG5ld1Rhc2tzOiBUYXNrW10pOiBib29sZWFuIHtcclxuXHRcdC8vIFF1aWNrIGxlbmd0aCBjaGVja1xyXG5cdFx0aWYgKGN1cnJlbnRUYXNrcy5sZW5ndGggIT09IG5ld1Rhc2tzLmxlbmd0aCkge1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBJZiBib3RoIGFyZSBlbXB0eSwgbm8gY2hhbmdlXHJcblx0XHRpZiAoY3VycmVudFRhc2tzLmxlbmd0aCA9PT0gMCAmJiBuZXdUYXNrcy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENyZWF0ZSBzZXRzIG9mIHRhc2sgSURzIGZvciBjb21wYXJpc29uXHJcblx0XHRjb25zdCBjdXJyZW50SWRzID0gbmV3IFNldChjdXJyZW50VGFza3MubWFwKCh0YXNrKSA9PiB0YXNrLmlkKSk7XHJcblx0XHRjb25zdCBuZXdJZHMgPSBuZXcgU2V0KG5ld1Rhc2tzLm1hcCgodGFzaykgPT4gdGFzay5pZCkpO1xyXG5cclxuXHRcdC8vIENoZWNrIGlmIHRhc2sgSURzIGFyZSBkaWZmZXJlbnRcclxuXHRcdGlmIChjdXJyZW50SWRzLnNpemUgIT09IG5ld0lkcy5zaXplKSB7XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENoZWNrIGlmIGFueSB0YXNrIElEIGlzIGRpZmZlcmVudFxyXG5cdFx0Zm9yIChjb25zdCBpZCBvZiBjdXJyZW50SWRzKSB7XHJcblx0XHRcdGlmICghbmV3SWRzLmhhcyhpZCkpIHtcclxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENoZWNrIGlmIHRhc2sgb3JkZXIgaGFzIGNoYW5nZWQgKGltcG9ydGFudCBmb3Igc29ydGluZylcclxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgY3VycmVudFRhc2tzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGlmIChjdXJyZW50VGFza3NbaV0uaWQgIT09IG5ld1Rhc2tzW2ldLmlkKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7IC8vIE9yZGVyIGNoYW5nZWRcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENoZWNrIGlmIHRhc2sgY29udGVudCBoYXMgY2hhbmdlZCAobW9yZSBkZXRhaWxlZCBjb21wYXJpc29uKVxyXG5cdFx0Y29uc3QgY3VycmVudFRhc2tNYXAgPSBuZXcgTWFwKFxyXG5cdFx0XHRjdXJyZW50VGFza3MubWFwKCh0YXNrKSA9PiBbdGFzay5pZCwgdGFza10pXHJcblx0XHQpO1xyXG5cdFx0Y29uc3QgbmV3VGFza01hcCA9IG5ldyBNYXAobmV3VGFza3MubWFwKCh0YXNrKSA9PiBbdGFzay5pZCwgdGFza10pKTtcclxuXHJcblx0XHRmb3IgKGNvbnN0IFtpZCwgbmV3VGFza10gb2YgbmV3VGFza01hcCkge1xyXG5cdFx0XHRjb25zdCBjdXJyZW50VGFzayA9IGN1cnJlbnRUYXNrTWFwLmdldChpZCk7XHJcblx0XHRcdGlmICghY3VycmVudFRhc2spIHtcclxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTsgLy8gTmV3IHRhc2tcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgaWYgdGFzayBjb250ZW50IG9yIG1ldGFkYXRhIGhhcyBjaGFuZ2VkXHJcblx0XHRcdGlmICh0aGlzLmhhc1Rhc2tDb250ZW50Q2hhbmdlZChjdXJyZW50VGFzaywgbmV3VGFzaykpIHtcclxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGlmIGluZGl2aWR1YWwgdGFzayBjb250ZW50IGhhcyBjaGFuZ2VkXHJcblx0ICovXHJcblx0cHJpdmF0ZSBoYXNUYXNrQ29udGVudENoYW5nZWQoY3VycmVudFRhc2s6IFRhc2ssIG5ld1Rhc2s6IFRhc2spOiBib29sZWFuIHtcclxuXHRcdC8vIENvbXBhcmUgYmFzaWMgcHJvcGVydGllc1xyXG5cdFx0aWYgKGN1cnJlbnRUYXNrLmNvbnRlbnQgIT09IG5ld1Rhc2suY29udGVudCkge1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoY3VycmVudFRhc2suc3RhdHVzICE9PSBuZXdUYXNrLnN0YXR1cykge1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDb21wYXJlIG1ldGFkYXRhIGlmIGl0IGV4aXN0c1xyXG5cdFx0aWYgKGN1cnJlbnRUYXNrLm1ldGFkYXRhICYmIG5ld1Rhc2subWV0YWRhdGEpIHtcclxuXHRcdFx0Ly8gQ2hlY2sgcHJpb3JpdHlcclxuXHRcdFx0aWYgKGN1cnJlbnRUYXNrLm1ldGFkYXRhLnByaW9yaXR5ICE9PSBuZXdUYXNrLm1ldGFkYXRhLnByaW9yaXR5KSB7XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENoZWNrIGRhdGVzXHJcblx0XHRcdGlmIChjdXJyZW50VGFzay5tZXRhZGF0YS5kdWVEYXRlICE9PSBuZXdUYXNrLm1ldGFkYXRhLmR1ZURhdGUpIHtcclxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdGN1cnJlbnRUYXNrLm1ldGFkYXRhLnNjaGVkdWxlZERhdGUgIT09XHJcblx0XHRcdFx0bmV3VGFzay5tZXRhZGF0YS5zY2hlZHVsZWREYXRlXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoY3VycmVudFRhc2subWV0YWRhdGEuc3RhcnREYXRlICE9PSBuZXdUYXNrLm1ldGFkYXRhLnN0YXJ0RGF0ZSkge1xyXG5cdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBDaGVjayB0YWdzXHJcblx0XHRcdGNvbnN0IGN1cnJlbnRUYWdzID0gY3VycmVudFRhc2subWV0YWRhdGEudGFncyB8fCBbXTtcclxuXHRcdFx0Y29uc3QgbmV3VGFncyA9IG5ld1Rhc2subWV0YWRhdGEudGFncyB8fCBbXTtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdGN1cnJlbnRUYWdzLmxlbmd0aCAhPT0gbmV3VGFncy5sZW5ndGggfHxcclxuXHRcdFx0XHQhY3VycmVudFRhZ3MuZXZlcnkoKHRhZykgPT4gbmV3VGFncy5pbmNsdWRlcyh0YWcpKVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIGlmIChjdXJyZW50VGFzay5tZXRhZGF0YSAhPT0gbmV3VGFzay5tZXRhZGF0YSkge1xyXG5cdFx0XHQvLyBPbmUgaGFzIG1ldGFkYXRhLCB0aGUgb3RoZXIgZG9lc24ndFxyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBGb3JjZSByZWZyZXNoIGFsbCBjb2x1bW5zIChmYWxsYmFjayBmb3Igd2hlbiBzZWxlY3RpdmUgcmVmcmVzaCBpc24ndCBzdWZmaWNpZW50KVxyXG5cdCAqL1xyXG5cdHB1YmxpYyBmb3JjZVJlZnJlc2hBbGwoKSB7XHJcblx0XHRjb25zb2xlLmxvZyhcIkZvcmNlIHJlZnJlc2hpbmcgYWxsIGNvbHVtbnNcIik7XHJcblx0XHRpZiAoIXRoaXMuY29sdW1ucy5sZW5ndGgpIHJldHVybjtcclxuXHJcblx0XHQvLyBDYXRlZ29yaXplIHRhc2tzIGJ5IHF1YWRyYW50XHJcblx0XHRjb25zdCBxdWFkcmFudFRhc2tzID0gdGhpcy5jYXRlZ29yaXplVGFza3NCeVF1YWRyYW50KHRoaXMudGFza3MpO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSBlYWNoIGNvbHVtblxyXG5cdFx0dGhpcy5jb2x1bW5zLmZvckVhY2goKGNvbHVtbikgPT4ge1xyXG5cdFx0XHRjb25zdCBxdWFkcmFudElkID0gY29sdW1uLmdldFF1YWRyYW50SWQoKTtcclxuXHRcdFx0Y29uc3QgdGFza3MgPSBxdWFkcmFudFRhc2tzLmdldChxdWFkcmFudElkKSB8fCBbXTtcclxuXHJcblx0XHRcdC8vIFNvcnQgdGFza3Mgd2l0aGluIGVhY2ggcXVhZHJhbnRcclxuXHRcdFx0Y29uc3Qgc29ydGVkVGFza3MgPSB0aGlzLnNvcnRUYXNrcyh0YXNrcyk7XHJcblxyXG5cdFx0XHQvLyBTZXQgdGFza3MgZm9yIHRoZSBjb2x1bW5cclxuXHRcdFx0Y29sdW1uLnNldFRhc2tzKHNvcnRlZFRhc2tzKTtcclxuXHJcblx0XHRcdC8vIEhpZGUgZW1wdHkgY29sdW1ucyBpZiBuZWVkZWRcclxuXHRcdFx0aWYgKHRoaXMuaGlkZUVtcHR5Q29sdW1ucyAmJiBjb2x1bW4uaXNFbXB0eSgpKSB7XHJcblx0XHRcdFx0Y29sdW1uLnNldFZpc2liaWxpdHkoZmFsc2UpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGNvbHVtbi5zZXRWaXNpYmlsaXR5KHRydWUpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBGb3JjZSBsb2FkIGNvbnRlbnQgZm9yIGFsbCB2aXNpYmxlIGNvbHVtbnMgYWZ0ZXIgYSBzaG9ydCBkZWxheVxyXG5cdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdHRoaXMuZm9yY2VMb2FkQWxsQ29sdW1ucygpO1xyXG5cdFx0fSwgMjAwKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZm9yY2VMb2FkQWxsQ29sdW1ucygpIHtcclxuXHRcdGNvbnNvbGUubG9nKFwiRm9yY2UgbG9hZGluZyBhbGwgY29sdW1uc1wiKTtcclxuXHRcdHRoaXMuY29sdW1ucy5mb3JFYWNoKChjb2x1bW4pID0+IHtcclxuXHRcdFx0aWYgKCFjb2x1bW4uaXNFbXB0eSgpKSB7XHJcblx0XHRcdFx0Y29sdW1uLmZvcmNlTG9hZENvbnRlbnQoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgYSBzcGVjaWZpYyBxdWFkcmFudCBjb2x1bW5cclxuXHQgKi9cclxuXHRwdWJsaWMgdXBkYXRlUXVhZHJhbnQocXVhZHJhbnRJZDogc3RyaW5nLCB0YXNrcz86IFRhc2tbXSkge1xyXG5cdFx0Y29uc3QgY29sdW1uID0gdGhpcy5jb2x1bW5zLmZpbmQoXHJcblx0XHRcdChjb2wpID0+IGNvbC5nZXRRdWFkcmFudElkKCkgPT09IHF1YWRyYW50SWRcclxuXHRcdCk7XHJcblx0XHRpZiAoIWNvbHVtbikge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oYFF1YWRyYW50IGNvbHVtbiBub3QgZm91bmQ6ICR7cXVhZHJhbnRJZH1gKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGxldCB0YXNrc1RvVXBkYXRlOiBUYXNrW107XHJcblx0XHRpZiAodGFza3MpIHtcclxuXHRcdFx0Ly8gVXNlIHByb3ZpZGVkIHRhc2tzXHJcblx0XHRcdHRhc2tzVG9VcGRhdGUgPSB0YXNrcztcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIFJlY2FsY3VsYXRlIHRhc2tzIGZvciB0aGlzIHF1YWRyYW50IG9ubHlcclxuXHRcdFx0Y29uc3QgcXVhZHJhbnRUYXNrcyA9IHRoaXMuY2F0ZWdvcml6ZVRhc2tzQnlRdWFkcmFudCh0aGlzLnRhc2tzKTtcclxuXHRcdFx0dGFza3NUb1VwZGF0ZSA9IHF1YWRyYW50VGFza3MuZ2V0KHF1YWRyYW50SWQpIHx8IFtdO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFNvcnQgdGFza3NcclxuXHRcdGNvbnN0IHNvcnRlZFRhc2tzID0gdGhpcy5zb3J0VGFza3ModGFza3NUb1VwZGF0ZSk7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIG9ubHkgdGhpcyBjb2x1bW5cclxuXHRcdGNvbHVtbi5zZXRUYXNrcyhzb3J0ZWRUYXNrcyk7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHZpc2liaWxpdHlcclxuXHRcdGlmICh0aGlzLmhpZGVFbXB0eUNvbHVtbnMgJiYgY29sdW1uLmlzRW1wdHkoKSkge1xyXG5cdFx0XHRjb2x1bW4uc2V0VmlzaWJpbGl0eShmYWxzZSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjb2x1bW4uc2V0VmlzaWJpbGl0eSh0cnVlKTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0YFVwZGF0ZWQgcXVhZHJhbnQgJHtxdWFkcmFudElkfSB3aXRoICR7c29ydGVkVGFza3MubGVuZ3RofSB0YXNrc2BcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBCYXRjaCB1cGRhdGUgbXVsdGlwbGUgcXVhZHJhbnRzXHJcblx0ICovXHJcblx0cHVibGljIHVwZGF0ZVF1YWRyYW50cyh1cGRhdGVzOiB7IHF1YWRyYW50SWQ6IHN0cmluZzsgdGFza3M/OiBUYXNrW10gfVtdKSB7XHJcblx0XHR1cGRhdGVzLmZvckVhY2goKHsgcXVhZHJhbnRJZCwgdGFza3MgfSkgPT4ge1xyXG5cdFx0XHR0aGlzLnVwZGF0ZVF1YWRyYW50KHF1YWRyYW50SWQsIHRhc2tzKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBzb3J0VGFza3ModGFza3M6IFRhc2tbXSk6IFRhc2tbXSB7XHJcblx0XHRjb25zdCBzb3J0ZWRUYXNrcyA9IFsuLi50YXNrc107XHJcblxyXG5cdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdGBTb3J0aW5nICR7dGFza3MubGVuZ3RofSB0YXNrcyBieSAke3RoaXMuc29ydE9wdGlvbi5maWVsZH0gKCR7dGhpcy5zb3J0T3B0aW9uLm9yZGVyfSlgXHJcblx0XHQpO1xyXG5cclxuXHRcdHNvcnRlZFRhc2tzLnNvcnQoKGEsIGIpID0+IHtcclxuXHRcdFx0bGV0IGFWYWx1ZTogYW55LCBiVmFsdWU6IGFueTtcclxuXHJcblx0XHRcdHN3aXRjaCAodGhpcy5zb3J0T3B0aW9uLmZpZWxkKSB7XHJcblx0XHRcdFx0Y2FzZSBcInByaW9yaXR5XCI6XHJcblx0XHRcdFx0XHRhVmFsdWUgPSB0aGlzLmdldFRhc2tQcmlvcml0eVZhbHVlKGEpO1xyXG5cdFx0XHRcdFx0YlZhbHVlID0gdGhpcy5nZXRUYXNrUHJpb3JpdHlWYWx1ZShiKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJkdWVEYXRlXCI6XHJcblx0XHRcdFx0XHRhVmFsdWUgPSBhLm1ldGFkYXRhPy5kdWVEYXRlIHx8IDA7XHJcblx0XHRcdFx0XHRiVmFsdWUgPSBiLm1ldGFkYXRhPy5kdWVEYXRlIHx8IDA7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIFwic2NoZWR1bGVkRGF0ZVwiOlxyXG5cdFx0XHRcdFx0YVZhbHVlID0gYS5tZXRhZGF0YT8uc2NoZWR1bGVkRGF0ZSB8fCAwO1xyXG5cdFx0XHRcdFx0YlZhbHVlID0gYi5tZXRhZGF0YT8uc2NoZWR1bGVkRGF0ZSB8fCAwO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBcInN0YXJ0RGF0ZVwiOlxyXG5cdFx0XHRcdFx0YVZhbHVlID0gYS5tZXRhZGF0YT8uc3RhcnREYXRlIHx8IDA7XHJcblx0XHRcdFx0XHRiVmFsdWUgPSBiLm1ldGFkYXRhPy5zdGFydERhdGUgfHwgMDtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJjcmVhdGVkRGF0ZVwiOlxyXG5cdFx0XHRcdFx0YVZhbHVlID0gYS5tZXRhZGF0YT8uY3JlYXRlZERhdGUgfHwgMDtcclxuXHRcdFx0XHRcdGJWYWx1ZSA9IGIubWV0YWRhdGE/LmNyZWF0ZWREYXRlIHx8IDA7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdFx0cmV0dXJuIDA7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmICh0aGlzLnNvcnRPcHRpb24ub3JkZXIgPT09IFwiYXNjXCIpIHtcclxuXHRcdFx0XHRyZXR1cm4gYVZhbHVlID4gYlZhbHVlID8gMSA6IGFWYWx1ZSA8IGJWYWx1ZSA/IC0xIDogMDtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRyZXR1cm4gYVZhbHVlIDwgYlZhbHVlID8gMSA6IGFWYWx1ZSA+IGJWYWx1ZSA/IC0xIDogMDtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gTG9nIGZpcnN0IGZldyB0YXNrcyBmb3IgZGVidWdnaW5nXHJcblx0XHRpZiAoc29ydGVkVGFza3MubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRgRmlyc3QgMyBzb3J0ZWQgdGFza3M6YCxcclxuXHRcdFx0XHRzb3J0ZWRUYXNrcy5zbGljZSgwLCAzKS5tYXAoKHQpID0+ICh7XHJcblx0XHRcdFx0XHRpZDogdC5pZCxcclxuXHRcdFx0XHRcdGNvbnRlbnQ6IHQuY29udGVudC5zdWJzdHJpbmcoMCwgNTApLFxyXG5cdFx0XHRcdFx0cHJpb3JpdHk6IHRoaXMuZ2V0VGFza1ByaW9yaXR5VmFsdWUodCksXHJcblx0XHRcdFx0XHRkdWVEYXRlOiB0Lm1ldGFkYXRhPy5kdWVEYXRlLFxyXG5cdFx0XHRcdFx0c2NoZWR1bGVkRGF0ZTogdC5tZXRhZGF0YT8uc2NoZWR1bGVkRGF0ZSxcclxuXHRcdFx0XHR9KSlcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gc29ydGVkVGFza3M7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldFRhc2tQcmlvcml0eVZhbHVlKHRhc2s6IFRhc2spOiBudW1iZXIge1xyXG5cdFx0Ly8gRmlyc3QgY2hlY2sgaWYgdGFzayBoYXMgbnVtZXJpYyBwcmlvcml0eSBpbiBtZXRhZGF0YVxyXG5cdFx0aWYgKFxyXG5cdFx0XHR0YXNrLm1ldGFkYXRhPy5wcmlvcml0eSAmJlxyXG5cdFx0XHR0eXBlb2YgdGFzay5tZXRhZGF0YS5wcmlvcml0eSA9PT0gXCJudW1iZXJcIlxyXG5cdFx0KSB7XHJcblx0XHRcdHJldHVybiB0YXNrLm1ldGFkYXRhLnByaW9yaXR5O1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEZhbGxiYWNrIHRvIGVtb2ppLWJhc2VkIHByaW9yaXR5IGRldGVjdGlvblxyXG5cdFx0aWYgKHRhc2suY29udGVudC5pbmNsdWRlcyhcIvCflLpcIikpIHJldHVybiA1OyAvLyBIaWdoZXN0XHJcblx0XHRpZiAodGFzay5jb250ZW50LmluY2x1ZGVzKFwi4o+rXCIpKSByZXR1cm4gNDsgLy8gSGlnaFxyXG5cdFx0aWYgKHRhc2suY29udGVudC5pbmNsdWRlcyhcIvCflLxcIikpIHJldHVybiAzOyAvLyBNZWRpdW1cclxuXHRcdGlmICh0YXNrLmNvbnRlbnQuaW5jbHVkZXMoXCLwn5S9XCIpKSByZXR1cm4gMjsgLy8gTG93XHJcblx0XHRpZiAodGFzay5jb250ZW50LmluY2x1ZGVzKFwi4o+sXCIpKSByZXR1cm4gMTsgLy8gTG93ZXN0XHJcblx0XHRyZXR1cm4gMDsgLy8gTm8gcHJpb3JpdHlcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBnZXRRdWFkcmFudFN0YXRzKCk6IHsgW2tleTogc3RyaW5nXTogbnVtYmVyIH0ge1xyXG5cdFx0Y29uc3QgcXVhZHJhbnRUYXNrcyA9IHRoaXMuY2F0ZWdvcml6ZVRhc2tzQnlRdWFkcmFudCh0aGlzLnRhc2tzKTtcclxuXHRcdGNvbnN0IHN0YXRzOiB7IFtrZXk6IHN0cmluZ106IG51bWJlciB9ID0ge307XHJcblxyXG5cdFx0UVVBRFJBTlRfREVGSU5JVElPTlMuZm9yRWFjaCgocXVhZHJhbnQpID0+IHtcclxuXHRcdFx0c3RhdHNbcXVhZHJhbnQuaWRdID0gcXVhZHJhbnRUYXNrcy5nZXQocXVhZHJhbnQuaWQpPy5sZW5ndGggfHwgMDtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBzdGF0cztcclxuXHR9XHJcbn1cclxuIl19