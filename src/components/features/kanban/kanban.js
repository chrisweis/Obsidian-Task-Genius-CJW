import { __awaiter } from "tslib";
import { Component, Menu, Platform, setIcon, } from "obsidian";
import { KanbanColumnComponent } from "./kanban-column";
// import { DragManager, DragMoveEvent, DragEndEvent } from "@/components/ui/behavior/DragManager";
import Sortable from "sortablejs";
import "@/styles/kanban/kanban.css";
import { t } from "@/translations/helper"; // Added import for t
import { FilterComponent, buildFilterOptionsFromTasks, } from "@/components/features/task/filter/in-view/filter";
import { getEffectiveProject, isProjectReadonly, } from "@/utils/task/task-operations";
// CSS classes for drop indicators
const DROP_INDICATOR_BEFORE_CLASS = "tg-kanban-card--drop-indicator-before";
const DROP_INDICATOR_AFTER_CLASS = "tg-kanban-card--drop-indicator-after";
const DROP_INDICATOR_EMPTY_CLASS = "tg-kanban-column-content--drop-indicator-empty";
export class KanbanComponent extends Component {
    constructor(app, plugin, parentEl, initialTasks = [], params = {}, viewId = "kanban" // 新增：视图ID参数
    ) {
        super();
        this.columns = [];
        // private dragManager: DragManager;
        this.sortableInstances = [];
        this.columnSortableInstance = null;
        this.tasks = [];
        this.allTasks = [];
        this.currentViewId = "kanban"; // 新增：当前视图ID
        this.columnOrder = [];
        this.filterComponent = null;
        this.activeFilters = [];
        this.sortOption = {
            field: "priority",
            order: "desc",
            label: "Priority (High to Low)",
        };
        this.hideEmptyColumns = false;
        this.configOverride = null; // Configuration override from Bases view
        // Handle filter application from clickable metadata
        this.handleFilterApply = (filterType, value) => {
            // Convert value to string for consistent handling
            let stringValue = Array.isArray(value) ? value[0] : value.toString();
            // For priority filters, convert numeric input to icon representation if needed
            if (filterType === "priority" && /^\d+$/.test(stringValue)) {
                stringValue = this.convertPriorityToIcon(parseInt(stringValue));
            }
            // Add the filter to active filters
            const newFilter = {
                id: `${filterType}-${stringValue}`,
                category: filterType,
                categoryLabel: this.getCategoryLabel(filterType),
                value: stringValue,
            };
            console.log("Kanban handleFilterApply", filterType, stringValue);
            // Check if filter already exists
            const existingFilterIndex = this.activeFilters.findIndex((f) => f.category === filterType && f.value === stringValue);
            if (existingFilterIndex === -1) {
                // Add new filter
                this.activeFilters.push(newFilter);
            }
            else {
                // Remove existing filter (toggle behavior)
                this.activeFilters.splice(existingFilterIndex, 1);
            }
            // Update filter component to reflect changes
            if (this.filterComponent) {
                this.filterComponent.setFilters(this.activeFilters.map((f) => ({
                    category: f.category,
                    value: f.value,
                })));
            }
            // Re-apply filters and render
            this.applyFiltersAndRender();
        };
        this.app = app;
        this.plugin = plugin;
        this.currentViewId = viewId; // 设置当前视图ID
        this.containerEl = parentEl.createDiv("tg-kanban-component-container");
        this.tasks = initialTasks;
        this.params = params;
    }
    /**
     * Set configuration override from Bases view config
     */
    setConfigOverride(config) {
        const isChanged = this.hasConfigOverrideChanged(config);
        this.configOverride = config;
        console.log('[Kanban] setConfigOverride received', config);
        if (isChanged) {
            // Refresh derived state from effective config (sort/hide/column order)
            this.loadKanbanConfig();
            const eff = this.getEffectiveKanbanConfig();
            console.log('[Kanban] effective config after override', eff);
            if (this.columnContainerEl) {
                // Rebuild columns with the new configuration so changes like groupBy
                // take effect immediately without requiring a data refresh.
                this.applyFiltersAndRender();
            }
        }
    }
    getEffectiveKanbanConfig() {
        var _a;
        const pluginConfig = (_a = this.plugin.settings.viewConfiguration.find((v) => v.id === this.currentViewId)) === null || _a === void 0 ? void 0 : _a.specificConfig;
        return this.configOverride ? Object.assign(Object.assign({}, (pluginConfig !== null && pluginConfig !== void 0 ? pluginConfig : {})), this.configOverride) : pluginConfig;
    }
    onload() {
        super.onload();
        this.containerEl.empty();
        this.containerEl.addClass("tg-kanban-view");
        // Load configuration settings
        this.loadKanbanConfig();
        this.filterContainerEl = this.containerEl.createDiv({
            cls: "tg-kanban-filters",
        });
        // Render filter controls first
        this.renderFilterControls(this.filterContainerEl);
        // Then render sort and toggle controls
        this.renderControls(this.filterContainerEl);
        this.columnContainerEl = this.containerEl.createDiv({
            cls: "tg-kanban-column-container",
        });
        this.renderColumns();
        console.log("KanbanComponent loaded.");
    }
    onunload() {
        super.onunload();
        this.columns.forEach((col) => col.unload());
        this.sortableInstances.forEach((instance) => instance.destroy());
        // Destroy column sortable instance
        if (this.columnSortableInstance) {
            this.columnSortableInstance.destroy();
            this.columnSortableInstance = null;
        }
        this.columns = [];
        this.containerEl.empty();
        console.log("KanbanComponent unloaded.");
    }
    hasConfigOverrideChanged(nextConfig) {
        if (!this.configOverride && !nextConfig) {
            return false;
        }
        if (!this.configOverride || !nextConfig) {
            return true;
        }
        try {
            return (JSON.stringify(this.configOverride) !== JSON.stringify(nextConfig));
        }
        catch (error) {
            console.warn("Failed to compare kanban config overrides:", error);
            return true;
        }
    }
    renderControls(containerEl) {
        // Create a controls container for sort and toggle controls
        const controlsContainer = containerEl.createDiv({
            cls: "tg-kanban-controls-container",
        });
        // Sort dropdown
        const sortContainer = controlsContainer.createDiv({
            cls: "tg-kanban-sort-container",
        });
        const sortButton = sortContainer.createEl("button", {
            cls: "tg-kanban-sort-button clickable-icon",
        }, (el) => {
            setIcon(el, "arrow-up-down");
        });
        this.registerDomEvent(sortButton, "click", (event) => {
            const menu = new Menu();
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
                    field: "scheduledDate",
                    order: "asc",
                    label: t("Scheduled Date (Earliest First)"),
                },
                {
                    field: "scheduledDate",
                    order: "desc",
                    label: t("Scheduled Date (Latest First)"),
                },
                {
                    field: "startDate",
                    order: "asc",
                    label: t("Start Date (Earliest First)"),
                },
                {
                    field: "startDate",
                    order: "desc",
                    label: t("Start Date (Latest First)"),
                },
            ];
            sortOptions.forEach((option) => {
                menu.addItem((item) => {
                    item.setTitle(option.label)
                        .setChecked(option.field === this.sortOption.field &&
                        option.order === this.sortOption.order)
                        .onClick(() => {
                        this.sortOption = option;
                        this.renderColumns();
                    });
                });
            });
            menu.showAtMouseEvent(event);
        });
    }
    renderFilterControls(containerEl) {
        console.log("Kanban rendering filter controls");
        // Build initial options from the current full task list
        const initialFilterOptions = buildFilterOptionsFromTasks(this.allTasks);
        console.log("Kanban initial filter options:", initialFilterOptions);
        this.filterComponent = new FilterComponent({
            container: containerEl,
            options: initialFilterOptions,
            onChange: (updatedFilters) => {
                if (!this.columnContainerEl) {
                    return;
                }
                this.activeFilters = updatedFilters;
                this.applyFiltersAndRender(); // Re-render when filters change
            },
        }, this.plugin // Pass plugin instance
        );
        this.addChild(this.filterComponent); // Register as child component
    }
    setTasks(newTasks) {
        console.log("Kanban setting tasks:", newTasks.length);
        this.allTasks = [...newTasks]; // Store the full list
        console.log(this.filterComponent);
        // Update filter options based on the complete task list
        if (this.filterComponent) {
            this.filterComponent.updateFilterOptions(this.allTasks);
        }
        else {
            console.warn("Filter component not initialized when setting tasks.");
            // Options will be built when renderFilterControls is called if it hasn't been yet.
            // If renderFilterControls already ran, this might indicate an issue.
        }
        // Apply current filters (which might be empty initially) and render the board
        this.applyFiltersAndRender();
    }
    applyFiltersAndRender() {
        console.log("Kanban applying filters:", this.activeFilters);
        // Filter the full list based on active filters
        if (this.activeFilters.length === 0) {
            this.tasks = [...this.allTasks]; // No filters active, show all tasks
        }
        else {
            // Import or define PRIORITY_MAP if needed for priority filtering
            const PRIORITY_MAP = {
                "🔺": 5,
                "⏫": 4,
                "🔼": 3,
                "🔽": 2,
                "⏬️": 1,
                "⏬": 1,
                highest: 5,
                high: 4,
                medium: 3,
                low: 2,
                lowest: 1,
                // Add numeric string mappings
                "1": 1,
                "2": 2,
                "3": 3,
                "4": 4,
                "5": 5,
            };
            this.tasks = this.allTasks.filter((task) => {
                return this.activeFilters.every((filter) => {
                    switch (filter.category) {
                        case "status":
                            return task.status === filter.value;
                        case "tag":
                            // Support for nested tags - include child tags
                            return this.matchesTagFilter(task, filter.value);
                        case "project":
                            return task.metadata.project === filter.value;
                        case "context":
                            return task.metadata.context === filter.value;
                        case "priority":
                            const expectedPriority = PRIORITY_MAP[filter.value] ||
                                parseInt(filter.value);
                            return task.metadata.priority === expectedPriority;
                        case "completed":
                            return ((filter.value === "Yes" && task.completed) ||
                                (filter.value === "No" && !task.completed));
                        case "filePath":
                            return task.filePath === filter.value;
                        default:
                            console.warn(`Unknown filter category in Kanban: ${filter.category}`);
                            return true;
                    }
                });
            });
        }
        console.log("Kanban filtered tasks count:", this.tasks.length);
        this.renderColumns();
    }
    // Enhanced tag filtering to support nested tags
    matchesTagFilter(task, filterTag) {
        if (!task.metadata.tags || task.metadata.tags.length === 0)
            return false;
        return task.metadata.tags.some((taskTag) => {
            // Skip non-string tags
            if (typeof taskTag !== "string") {
                return false;
            }
            // Direct match
            if (taskTag === filterTag)
                return true;
            // Check if task tag is a child of the filter tag
            // e.g., filterTag = "#work", taskTag = "#work/project1"
            const normalizedFilterTag = filterTag.startsWith("#")
                ? filterTag
                : `#${filterTag}`;
            const normalizedTaskTag = taskTag.startsWith("#")
                ? taskTag
                : `#${taskTag}`;
            return normalizedTaskTag.startsWith(normalizedFilterTag + "/");
        });
    }
    // Allow multiple symbols to represent the same logical status (e.g., In Progress: "/" and ">")
    getAllowedMarksForStatusName(statusName) {
        if (!statusName)
            return null;
        const s = statusName.trim().toLowerCase();
        const ts = this.plugin.settings.taskStatuses;
        if (!ts)
            return null;
        // Map common status names to configured categories
        const keyMap = {
            "in progress": "inProgress",
            completed: "completed",
            abandoned: "abandoned",
            planned: "planned",
            "not started": "notStarted",
            // synonyms commonly seen
            cancelled: "abandoned",
            canceled: "abandoned",
            unchecked: "notStarted",
            checked: "completed",
        };
        const key = keyMap[s];
        if (!key)
            return null;
        const raw = ts[key];
        if (!raw || typeof raw !== "string")
            return null;
        const set = new Set(raw
            .split("|")
            .map((ch) => ch.trim())
            .filter((ch) => ch.length === 1));
        return set.size > 0 ? set : null;
    }
    convertPriorityToIcon(priority) {
        const PRIORITY_ICONS = {
            5: "🔺",
            4: "⏫",
            3: "🔼",
            2: "🔽",
            1: "⏬",
        };
        return PRIORITY_ICONS[priority] || priority.toString();
    }
    getCategoryLabel(category) {
        switch (category) {
            case "tag":
                return t("Tag");
            case "project":
                return t("Project");
            case "priority":
                return t("Priority");
            case "status":
                return t("Status");
            case "context":
                return t("Context");
            default:
                return category;
        }
    }
    renderColumns() {
        var _a;
        (_a = this.columnContainerEl) === null || _a === void 0 ? void 0 : _a.empty();
        this.columns.forEach((col) => this.removeChild(col));
        this.columns = [];
        // Resolve effective config (Bases override wins over plugin settings)
        const kanbanConfig = this.getEffectiveKanbanConfig();
        console.log('[Kanban] renderColumns effective config', kanbanConfig);
        const groupBy = (kanbanConfig === null || kanbanConfig === void 0 ? void 0 : kanbanConfig.groupBy) || "status";
        if (groupBy === "status") {
            this.renderStatusColumns();
        }
        else {
            this.renderCustomColumns(groupBy, kanbanConfig === null || kanbanConfig === void 0 ? void 0 : kanbanConfig.customColumns);
        }
        // Update column visibility based on hideEmptyColumns setting
        this.updateColumnVisibility();
        // Re-initialize sortable instances after columns are rendered
        this.initializeSortableInstances();
        // Initialize column sorting
        this.initializeColumnSortable();
    }
    renderStatusColumns() {
        const statusCycle = this.plugin.settings.taskStatusCycle;
        let statusNames = statusCycle.length > 0
            ? statusCycle
            : ["Todo", "In Progress", "Done"];
        const spaceStatus = [];
        const xStatus = [];
        const otherStatuses = [];
        statusNames.forEach((statusName) => {
            var _a;
            const statusMark = (_a = this.resolveStatusMark(statusName)) !== null && _a !== void 0 ? _a : " ";
            if (this.plugin.settings.excludeMarksFromCycle &&
                this.plugin.settings.excludeMarksFromCycle.includes(statusName)) {
                return;
            }
            if (statusMark === " ") {
                spaceStatus.push(statusName);
            }
            else if (statusMark.toLowerCase() === "x") {
                xStatus.push(statusName);
            }
            else {
                otherStatuses.push(statusName);
            }
        });
        // 按照要求的顺序合并状态名称
        statusNames = [...spaceStatus, ...otherStatuses, ...xStatus];
        // Apply saved column order to status names
        const statusColumns = statusNames.map((name) => ({ title: name }));
        const orderedStatusColumns = this.applyColumnOrder(statusColumns);
        const orderedStatusNames = orderedStatusColumns.map((col) => col.title);
        orderedStatusNames.forEach((statusName) => {
            const tasksForStatus = this.getTasksForStatus(statusName);
            const column = new KanbanColumnComponent(this.app, this.plugin, this.columnContainerEl, statusName, tasksForStatus, Object.assign(Object.assign({}, this.params), { onTaskStatusUpdate: (taskId, newStatusMark) => this.handleStatusUpdate(taskId, newStatusMark), onFilterApply: this.handleFilterApply }));
            this.addChild(column);
            this.columns.push(column);
        });
    }
    renderCustomColumns(groupBy, customColumns) {
        let columnConfigs = [];
        if (customColumns && customColumns.length > 0) {
            // Use custom defined columns
            columnConfigs = customColumns
                .sort((a, b) => a.order - b.order)
                .map((col) => ({
                title: col.title,
                value: col.value,
                id: col.id,
            }));
        }
        else {
            // Generate default columns based on groupBy type
            columnConfigs = this.generateDefaultColumns(groupBy);
        }
        // Apply saved column order to column configurations
        const orderedColumnConfigs = this.applyColumnOrder(columnConfigs);
        orderedColumnConfigs.forEach((config) => {
            const tasksForColumn = this.getTasksForProperty(groupBy, config.value);
            const column = new KanbanColumnComponent(this.app, this.plugin, this.columnContainerEl, config.title, tasksForColumn, Object.assign(Object.assign({}, this.params), { onTaskStatusUpdate: (taskId, newValue) => this.handlePropertyUpdate(taskId, groupBy, config.value, newValue), onFilterApply: this.handleFilterApply }));
            this.addChild(column);
            this.columns.push(column);
        });
    }
    generateDefaultColumns(groupBy) {
        switch (groupBy) {
            case "priority":
                return [
                    { title: "🔺 Highest", value: 5, id: "priority-5" },
                    { title: "⏫ High", value: 4, id: "priority-4" },
                    { title: "🔼 Medium", value: 3, id: "priority-3" },
                    { title: "🔽 Low", value: 2, id: "priority-2" },
                    { title: "⏬ Lowest", value: 1, id: "priority-1" },
                    { title: "No Priority", value: null, id: "priority-none" },
                ];
            case "tags":
                // Get unique tags from all tasks
                const allTags = new Set();
                this.tasks.forEach((task) => {
                    const metadata = task.metadata || {};
                    if (metadata.tags) {
                        metadata.tags.forEach((tag) => {
                            // Skip non-string tags
                            if (typeof tag === "string") {
                                allTags.add(tag);
                            }
                        });
                    }
                });
                const tagColumns = Array.from(allTags).map((tag) => ({
                    title: `${tag}`,
                    value: tag,
                    id: `tag-${tag}`,
                }));
                tagColumns.unshift({
                    title: "No Tags",
                    value: "",
                    id: "tag-none",
                });
                return tagColumns;
            case "project":
                // Get unique projects from all tasks (including tgProject)
                const allProjects = new Set();
                this.tasks.forEach((task) => {
                    const effectiveProject = getEffectiveProject(task);
                    if (effectiveProject) {
                        allProjects.add(effectiveProject);
                    }
                });
                const projectColumns = Array.from(allProjects).map((project) => ({
                    title: project,
                    value: project,
                    id: `project-${project}`,
                }));
                projectColumns.push({
                    title: "No Project",
                    value: "",
                    id: "project-none",
                });
                return projectColumns;
            case "context":
                // Get unique contexts from all tasks
                const allContexts = new Set();
                this.tasks.forEach((task) => {
                    const metadata = task.metadata || {};
                    if (metadata.context) {
                        allContexts.add(metadata.context);
                    }
                });
                const contextColumns = Array.from(allContexts).map((context) => ({
                    title: `@${context}`,
                    value: context,
                    id: `context-${context}`,
                }));
                contextColumns.push({
                    title: "No Context",
                    value: "",
                    id: "context-none",
                });
                return contextColumns;
            case "dueDate":
            case "scheduledDate":
            case "startDate":
                return [
                    {
                        title: "Overdue",
                        value: "overdue",
                        id: `${groupBy}-overdue`,
                    },
                    { title: "Today", value: "today", id: `${groupBy}-today` },
                    {
                        title: "Tomorrow",
                        value: "tomorrow",
                        id: `${groupBy}-tomorrow`,
                    },
                    {
                        title: "This Week",
                        value: "thisWeek",
                        id: `${groupBy}-thisWeek`,
                    },
                    {
                        title: "Next Week",
                        value: "nextWeek",
                        id: `${groupBy}-nextWeek`,
                    },
                    { title: "Later", value: "later", id: `${groupBy}-later` },
                    { title: "No Date", value: null, id: `${groupBy}-none` },
                ];
            case "filePath":
                // Get unique file paths from all tasks
                const allPaths = new Set();
                this.tasks.forEach((task) => {
                    if (task.filePath) {
                        allPaths.add(task.filePath);
                    }
                });
                return Array.from(allPaths).map((path) => ({
                    title: path.split("/").pop() || path,
                    value: path,
                    id: `path-${path.replace(/[^a-zA-Z0-9]/g, "-")}`,
                }));
            default:
                return [{ title: "All Tasks", value: null, id: "all" }];
        }
    }
    updateColumnVisibility() {
        var _a;
        const effective = this.getEffectiveKanbanConfig();
        const hideEmpty = (_a = effective === null || effective === void 0 ? void 0 : effective.hideEmptyColumns) !== null && _a !== void 0 ? _a : this.hideEmptyColumns;
        this.columns.forEach((column) => {
            if (hideEmpty && column.isEmpty()) {
                column.setVisible(false);
            }
            else {
                column.setVisible(true);
            }
        });
    }
    getTasksForStatus(statusName) {
        var _a;
        // Prefer multi-mark mapping from settings.taskStatuses when available
        const allowed = this.getAllowedMarksForStatusName(statusName);
        const statusMark = (_a = this.resolveStatusMark(statusName)) !== null && _a !== void 0 ? _a : " ";
        // Filter from the already filtered list
        const tasksForStatus = this.tasks.filter((task) => {
            const mark = task.status || " ";
            return allowed ? allowed.has(mark) : mark === statusMark;
        });
        // Sort tasks within the status column based on selected sort option
        tasksForStatus.sort((a, b) => this.compareTasks(a, b, this.sortOption));
        return tasksForStatus;
    }
    compareTasks(a, b, sortOption) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const { field, order } = sortOption;
        let comparison = 0;
        // Ensure both tasks have metadata property
        const metadataA = a.metadata || {};
        const metadataB = b.metadata || {};
        switch (field) {
            case "priority":
                const priorityA = (_a = metadataA.priority) !== null && _a !== void 0 ? _a : 0;
                const priorityB = (_b = metadataB.priority) !== null && _b !== void 0 ? _b : 0;
                comparison = priorityA - priorityB;
                break;
            case "dueDate":
                const dueDateA = (_c = metadataA.dueDate) !== null && _c !== void 0 ? _c : Number.MAX_SAFE_INTEGER;
                const dueDateB = (_d = metadataB.dueDate) !== null && _d !== void 0 ? _d : Number.MAX_SAFE_INTEGER;
                comparison = dueDateA - dueDateB;
                break;
            case "scheduledDate":
                const scheduledA = (_e = metadataA.scheduledDate) !== null && _e !== void 0 ? _e : Number.MAX_SAFE_INTEGER;
                const scheduledB = (_f = metadataB.scheduledDate) !== null && _f !== void 0 ? _f : Number.MAX_SAFE_INTEGER;
                comparison = scheduledA - scheduledB;
                break;
            case "startDate":
                const startA = (_g = metadataA.startDate) !== null && _g !== void 0 ? _g : Number.MAX_SAFE_INTEGER;
                const startB = (_h = metadataB.startDate) !== null && _h !== void 0 ? _h : Number.MAX_SAFE_INTEGER;
                comparison = startA - startB;
                break;
            case "createdDate":
                const createdA = (_j = metadataA.createdDate) !== null && _j !== void 0 ? _j : Number.MAX_SAFE_INTEGER;
                const createdB = (_k = metadataB.createdDate) !== null && _k !== void 0 ? _k : Number.MAX_SAFE_INTEGER;
                comparison = createdA - createdB;
                break;
        }
        // Apply order (asc/desc)
        return order === "desc" ? -comparison : comparison;
    }
    initializeSortableInstances() {
        this.sortableInstances.forEach((instance) => instance.destroy());
        this.sortableInstances = [];
        // Detect if we're on a mobile device
        const isMobile = !Platform.isDesktop ||
            "ontouchstart" in window ||
            navigator.maxTouchPoints > 0;
        this.columns.forEach((col) => {
            const columnContent = col.getContentElement();
            const instance = Sortable.create(columnContent, {
                group: "kanban-group",
                animation: 150,
                ghostClass: "tg-kanban-card-ghost",
                dragClass: "tg-kanban-card-dragging",
                // Mobile-specific optimizations
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
                    this.handleSortEnd(event);
                },
            });
            this.sortableInstances.push(instance);
        });
    }
    handleSortEnd(event) {
        var _a, _b, _c, _d, _e, _f;
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Kanban sort end:", event.oldIndex, event.newIndex);
            const taskId = event.item.dataset.taskId;
            const dropTargetColumnContent = event.to;
            const sourceColumnContent = event.from;
            if (taskId && dropTargetColumnContent) {
                // Get target column information
                const targetColumnEl = dropTargetColumnContent.closest(".tg-kanban-column");
                const targetColumnTitle = targetColumnEl
                    ? (_a = targetColumnEl.querySelector(".tg-kanban-column-title")) === null || _a === void 0 ? void 0 : _a.textContent
                    : null;
                // Get source column information
                const sourceColumnEl = sourceColumnContent.closest(".tg-kanban-column");
                const sourceColumnTitle = sourceColumnEl
                    ? (_b = sourceColumnEl.querySelector(".tg-kanban-column-title")) === null || _b === void 0 ? void 0 : _b.textContent
                    : null;
                if (targetColumnTitle && sourceColumnTitle) {
                    const kanbanConfig = (_c = this.plugin.settings.viewConfiguration.find((v) => v.id === this.currentViewId)) === null || _c === void 0 ? void 0 : _c.specificConfig;
                    const groupByPlugin = (kanbanConfig === null || kanbanConfig === void 0 ? void 0 : kanbanConfig.groupBy) || "status";
                    const groupBy = ((_d = this.getEffectiveKanbanConfig()) === null || _d === void 0 ? void 0 : _d.groupBy) || groupByPlugin;
                    if (groupBy === "status") {
                        // Handle status-based grouping (original logic)
                        const targetStatusMark = this.resolveStatusMark((targetColumnTitle || "").trim());
                        if (targetStatusMark !== undefined) {
                            console.log(`Kanban requesting status update for task ${taskId} to status ${targetColumnTitle} (mark: ${targetStatusMark})`);
                            yield this.handleStatusUpdate(taskId, targetStatusMark);
                        }
                        else {
                            console.warn(`Could not find status mark for status name: ${targetColumnTitle}`);
                        }
                    }
                    else {
                        const effectiveCustomColumns = ((_e = this.getEffectiveKanbanConfig()) === null || _e === void 0 ? void 0 : _e.customColumns) || (kanbanConfig === null || kanbanConfig === void 0 ? void 0 : kanbanConfig.customColumns);
                        // Handle property-based grouping
                        const targetValue = this.getColumnValueFromTitle(targetColumnTitle, groupBy, effectiveCustomColumns);
                        const sourceValue = this.getColumnValueFromTitle(sourceColumnTitle, groupBy, effectiveCustomColumns);
                        console.log(`Kanban requesting ${groupBy} update for task ${taskId} from ${sourceValue} to value: ${targetValue}`);
                        yield this.handlePropertyUpdate(taskId, groupBy, sourceValue, targetValue);
                    }
                    // After update, select the moved task so the status panel (details) reflects changes
                    const movedTask = this.allTasks.find((t) => t.id === taskId) ||
                        this.tasks.find((t) => t.id === taskId);
                    if (movedTask && ((_f = this.params) === null || _f === void 0 ? void 0 : _f.onTaskSelected)) {
                        this.params.onTaskSelected(movedTask);
                    }
                }
            }
        });
    }
    loadKanbanConfig() {
        const kanbanConfig = this.getEffectiveKanbanConfig();
        if (kanbanConfig) {
            this.hideEmptyColumns = kanbanConfig.hideEmptyColumns || false;
            this.sortOption = {
                field: kanbanConfig.defaultSortField || "priority",
                order: kanbanConfig.defaultSortOrder || "desc",
                label: this.getSortOptionLabel(kanbanConfig.defaultSortField || "priority", kanbanConfig.defaultSortOrder || "desc"),
            };
            console.log('[Kanban] loadKanbanConfig applied', {
                hideEmptyColumns: this.hideEmptyColumns,
                defaultSortField: this.sortOption.field,
                defaultSortOrder: this.sortOption.order,
            });
        }
        // Load saved column order
        this.loadColumnOrder();
    }
    getSortOptionLabel(field, order) {
        const fieldLabels = {
            priority: t("Priority"),
            dueDate: t("Due Date"),
            scheduledDate: t("Scheduled Date"),
            startDate: t("Start Date"),
            createdDate: t("Created Date"),
        };
        const orderLabel = order === "asc" ? t("Ascending") : t("Descending");
        return `${fieldLabels[field]} (${orderLabel})`;
    }
    /**
     * Resolve a status column title to its mark safely.
     * Accepts either configured status names (e.g., "Abandoned")
     * or raw marks (e.g., "-", "x", "/").
     */
    resolveStatusMark(titleOrMark) {
        if (!titleOrMark)
            return undefined;
        const trimmed = titleOrMark.trim();
        // If a single-character mark is provided, use it as-is
        if (trimmed.length === 1) {
            return trimmed;
        }
        // Try exact match
        const exact = this.plugin.settings.taskStatusMarks[trimmed];
        if (typeof exact === "string")
            return exact;
        // Try case-insensitive match
        for (const [name, mark] of Object.entries(this.plugin.settings.taskStatusMarks)) {
            if (name.toLowerCase() === trimmed.toLowerCase()) {
                return mark;
            }
        }
        return undefined;
    }
    getColumnContainer() {
        return this.columnContainerEl;
    }
    handleStatusUpdate(taskId, newStatusMark) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.params.onTaskStatusUpdate) {
                try {
                    yield this.params.onTaskStatusUpdate(taskId, newStatusMark);
                }
                catch (error) {
                    console.error("Failed to update task status:", error);
                }
            }
        });
    }
    handlePropertyUpdate(taskId, groupBy, oldValue, newValue) {
        return __awaiter(this, void 0, void 0, function* () {
            // This method will handle updating task properties when dragged between columns
            if (groupBy === "status") {
                yield this.handleStatusUpdate(taskId, newValue);
                return;
            }
            // Find the task to update
            const taskToUpdate = this.allTasks.find((task) => task.id === taskId);
            if (!taskToUpdate) {
                console.warn(`Task with ID ${taskId} not found for property update`);
                return;
            }
            taskToUpdate.metadata = taskToUpdate.metadata || {};
            // Create updated task object
            const updatedTask = Object.assign({}, taskToUpdate);
            // Update the specific property based on groupBy type
            switch (groupBy) {
                case "priority":
                    updatedTask.metadata.priority =
                        newValue === null || newValue === ""
                            ? undefined
                            : Number(newValue);
                    break;
                case "tags":
                    if (newValue === null || newValue === "") {
                        // Moving to "No Tags" column - remove all tags
                        updatedTask.metadata.tags = [];
                    }
                    else {
                        // Moving to a specific tag column
                        // Use the oldValue parameter to determine which tag to remove
                        let currentTags = updatedTask.metadata.tags || [];
                        console.log("Tags update - current tags:", currentTags);
                        console.log("Tags update - oldValue:", oldValue);
                        console.log("Tags update - newValue:", newValue);
                        // Remove the old tag if it exists and is different from the new value
                        if (oldValue && oldValue !== "" && oldValue !== newValue) {
                            // Try to match the oldValue with existing tags
                            // Handle both with and without # prefix
                            const oldTagVariants = [
                                oldValue,
                                `#${oldValue}`,
                                oldValue.startsWith("#")
                                    ? oldValue.substring(1)
                                    : oldValue,
                            ];
                            currentTags = currentTags.filter((tag) => !oldTagVariants.includes(tag));
                            console.log("Tags after removing old:", currentTags);
                        }
                        // Add the new tag if it's not already present
                        // Handle both with and without # prefix
                        const newTagVariants = [
                            newValue,
                            `#${newValue}`,
                            newValue.startsWith("#")
                                ? newValue.substring(1)
                                : newValue,
                        ];
                        const hasNewTag = currentTags.some((tag) => newTagVariants.includes(tag));
                        if (!hasNewTag) {
                            // Add the tag in the same format as existing tags, or without # if no existing tags
                            const tagToAdd = currentTags.length > 0 &&
                                currentTags[0].startsWith("#")
                                ? newValue.startsWith("#")
                                    ? newValue
                                    : `#${newValue}`
                                : newValue.startsWith("#")
                                    ? newValue.substring(1)
                                    : newValue;
                            currentTags.push(tagToAdd);
                        }
                        console.log("Tags after adding new:", currentTags);
                        updatedTask.metadata.tags = currentTags;
                    }
                    break;
                case "project":
                    // Only update project if it's not a read-only tgProject
                    if (!isProjectReadonly(taskToUpdate)) {
                        updatedTask.metadata.project =
                            newValue === null || newValue === ""
                                ? undefined
                                : newValue;
                    }
                    break;
                case "context":
                    updatedTask.metadata.context =
                        newValue === null || newValue === "" ? undefined : newValue;
                    break;
                case "dueDate":
                case "scheduledDate":
                case "startDate":
                    // For date fields, we need to convert the category back to an actual date
                    const dateValue = this.convertDateCategoryToTimestamp(newValue);
                    if (groupBy === "dueDate") {
                        updatedTask.metadata.dueDate = dateValue;
                    }
                    else if (groupBy === "scheduledDate") {
                        updatedTask.metadata.scheduledDate = dateValue;
                    }
                    else if (groupBy === "startDate") {
                        updatedTask.metadata.startDate = dateValue;
                    }
                    break;
                default:
                    console.warn(`Unsupported property type for update: ${groupBy}`);
                    return;
            }
            // Update the task using WriteAPI
            try {
                console.log(`Updating task ${taskId} ${groupBy} from:`, oldValue, "to:", newValue);
                if (this.plugin.writeAPI) {
                    const result = yield this.plugin.writeAPI.updateTask({
                        taskId,
                        updates: updatedTask,
                    });
                    if (!result.success) {
                        console.error(`Failed to update task ${taskId} property ${groupBy}:`, result.error);
                    }
                }
                else {
                    console.error("WriteAPI not available");
                }
            }
            catch (error) {
                console.error(`Failed to update task ${taskId} property ${groupBy}:`, error);
            }
        });
    }
    getTasksForProperty(groupBy, value) {
        // Filter tasks based on the groupBy property and value
        const tasksForProperty = this.tasks.filter((task) => {
            const metadata = task.metadata || {};
            switch (groupBy) {
                case "priority":
                    if (value === null || value === "") {
                        return !metadata.priority;
                    }
                    return metadata.priority === value;
                case "tags":
                    if (value === null || value === "") {
                        return !metadata.tags || metadata.tags.length === 0;
                    }
                    return (metadata.tags &&
                        metadata.tags.some((tag) => typeof tag === "string" && tag === value));
                case "project":
                    if (value === null || value === "") {
                        return !getEffectiveProject(task);
                    }
                    return getEffectiveProject(task) === value;
                case "context":
                    if (value === null || value === "") {
                        return !metadata.context;
                    }
                    return metadata.context === value;
                case "dueDate":
                case "scheduledDate":
                case "startDate":
                    return this.matchesDateCategory(task, groupBy, value);
                case "filePath":
                    return task.filePath === value;
                default:
                    return true;
            }
        });
        // Sort tasks within the property column based on selected sort option
        tasksForProperty.sort((a, b) => {
            return this.compareTasks(a, b, this.sortOption);
        });
        return tasksForProperty;
    }
    matchesDateCategory(task, dateField, category) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const twoWeeksFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
        const metadata = task.metadata || {};
        let taskDate;
        switch (dateField) {
            case "dueDate":
                taskDate = metadata.dueDate;
                break;
            case "scheduledDate":
                taskDate = metadata.scheduledDate;
                break;
            case "startDate":
                taskDate = metadata.startDate;
                break;
        }
        if (!taskDate) {
            return category === "none" || category === null || category === "";
        }
        const taskDateObj = new Date(taskDate);
        switch (category) {
            case "overdue":
                return taskDateObj < today;
            case "today":
                return taskDateObj >= today && taskDateObj < tomorrow;
            case "tomorrow":
                return (taskDateObj >= tomorrow &&
                    taskDateObj <
                        new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000));
            case "thisWeek":
                return taskDateObj >= tomorrow && taskDateObj < weekFromNow;
            case "nextWeek":
                return (taskDateObj >= weekFromNow && taskDateObj < twoWeeksFromNow);
            case "later":
                return taskDateObj >= twoWeeksFromNow;
            case "none":
            case null:
            case "":
                return false; // Already handled above
            default:
                return false;
        }
    }
    getColumnValueFromTitle(title, groupBy, customColumns) {
        console.log("customColumns", customColumns);
        if (customColumns && customColumns.length > 0) {
            const column = customColumns.find((col) => col.title === title);
            return column ? column.value : null;
        }
        // Handle default columns based on groupBy type
        switch (groupBy) {
            case "priority":
                if (title.includes("Highest"))
                    return 5;
                if (title.includes("High"))
                    return 4;
                if (title.includes("Medium"))
                    return 3;
                if (title.includes("Low"))
                    return 2;
                if (title.includes("Lowest"))
                    return 1;
                if (title.includes("No Priority"))
                    return null;
                break;
            case "tags":
                if (title === "No Tags")
                    return "";
                return title.startsWith("#")
                    ? title.trim().substring(1)
                    : title;
            case "project":
                if (title === "No Project")
                    return "";
                return title;
            case "context":
                if (title === "No Context")
                    return "";
                return title.startsWith("@") ? title.substring(1) : title;
            case "dueDate":
            case "scheduledDate":
            case "startDate":
                if (title === "Overdue")
                    return "overdue";
                if (title === "Today")
                    return "today";
                if (title === "Tomorrow")
                    return "tomorrow";
                if (title === "This Week")
                    return "thisWeek";
                if (title === "Next Week")
                    return "nextWeek";
                if (title === "Later")
                    return "later";
                if (title === "No Date")
                    return null;
                break;
            case "filePath":
                return title; // For file paths, the title is the value
        }
        return title;
    }
    convertDateCategoryToTimestamp(category) {
        if (category === null || category === "" || category === "none") {
            return undefined;
        }
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        switch (category) {
            case "overdue":
                // For overdue, we can't determine a specific date, so return undefined
                // The user should manually set a specific date
                return undefined;
            case "today":
                return today.getTime();
            case "tomorrow":
                return new Date(today.getTime() + 24 * 60 * 60 * 1000).getTime();
            case "thisWeek":
                // Set to end of this week (Sunday)
                const daysUntilSunday = 7 - today.getDay();
                return new Date(today.getTime() + daysUntilSunday * 24 * 60 * 60 * 1000).getTime();
            case "nextWeek":
                // Set to end of next week
                const daysUntilNextSunday = 14 - today.getDay();
                return new Date(today.getTime() + daysUntilNextSunday * 24 * 60 * 60 * 1000).getTime();
            case "later":
                // Set to one month from now
                const oneMonthLater = new Date(today);
                oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
                return oneMonthLater.getTime();
            default:
                return undefined;
        }
    }
    getTaskOriginalColumnValue(task, groupBy) {
        var _a;
        // Determine which column the task currently belongs to based on its properties
        const metadata = task.metadata || {};
        switch (groupBy) {
            case "tags":
                // For tags, find which tag column this task would be in
                // We need to check against the current column configuration
                const kanbanConfig = (_a = this.plugin.settings.viewConfiguration.find((v) => v.id === this.currentViewId)) === null || _a === void 0 ? void 0 : _a.specificConfig;
                if ((kanbanConfig === null || kanbanConfig === void 0 ? void 0 : kanbanConfig.customColumns) &&
                    kanbanConfig.customColumns.length > 0) {
                    // Check custom columns
                    for (const column of kanbanConfig.customColumns) {
                        if (column.value === "" || column.value === null) {
                            // "No Tags" column
                            if (!metadata.tags || metadata.tags.length === 0) {
                                return "";
                            }
                        }
                        else {
                            // Specific tag column
                            if (metadata.tags &&
                                metadata.tags.some((tag) => typeof tag === "string" &&
                                    tag === column.value)) {
                                return column.value;
                            }
                        }
                    }
                }
                else {
                    // Use default columns - find the first tag that matches existing columns
                    if (!metadata.tags || metadata.tags.length === 0) {
                        return "";
                    }
                    // Return the first string tag (for simplicity, as we need to determine which column it came from)
                    const firstStringTag = metadata.tags.find((tag) => typeof tag === "string");
                    return firstStringTag || "";
                }
                return "";
            case "project":
                return getEffectiveProject(task) || "";
            case "context":
                return metadata.context || "";
            case "priority":
                return metadata.priority || null;
            case "dueDate":
                return this.getDateCategory(metadata.dueDate);
            case "scheduledDate":
                return this.getDateCategory(metadata.scheduledDate);
            case "startDate":
                return this.getDateCategory(metadata.startDate);
            case "filePath":
                return task.filePath;
            default:
                return null;
        }
    }
    getDateCategory(timestamp) {
        if (!timestamp) {
            return "none";
        }
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const twoWeeksFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
        const taskDate = new Date(timestamp);
        if (taskDate < today) {
            return "overdue";
        }
        else if (taskDate >= today && taskDate < tomorrow) {
            return "today";
        }
        else if (taskDate >= tomorrow &&
            taskDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)) {
            return "tomorrow";
        }
        else if (taskDate >= tomorrow && taskDate < weekFromNow) {
            return "thisWeek";
        }
        else if (taskDate >= weekFromNow && taskDate < twoWeeksFromNow) {
            return "nextWeek";
        }
        else {
            return "later";
        }
    }
    // Column order management methods
    getColumnOrderKey() {
        const kanbanConfig = this.getEffectiveKanbanConfig();
        const groupBy = (kanbanConfig === null || kanbanConfig === void 0 ? void 0 : kanbanConfig.groupBy) || "status";
        return `kanban-column-order-${this.currentViewId}-${groupBy}`;
    }
    loadColumnOrder() {
        try {
            const key = this.getColumnOrderKey();
            const savedOrder = this.app.loadLocalStorage(key);
            if (savedOrder) {
                this.columnOrder = JSON.parse(savedOrder);
            }
            else {
                this.columnOrder = [];
            }
        }
        catch (error) {
            console.warn("Failed to load column order from localStorage:", error);
            this.columnOrder = [];
        }
    }
    saveColumnOrder(order) {
        try {
            const key = this.getColumnOrderKey();
            this.app.saveLocalStorage(key, JSON.stringify(order));
            this.columnOrder = [...order];
        }
        catch (error) {
            console.warn("Failed to save column order to localStorage:", error);
        }
    }
    applyColumnOrder(columns) {
        try {
            if (this.columnOrder.length === 0) {
                return columns;
            }
            if (!Array.isArray(columns)) {
                console.warn("Invalid columns array provided to applyColumnOrder");
                return [];
            }
            const orderedColumns = [];
            const remainingColumns = [...columns];
            // First, add columns in the saved order
            this.columnOrder.forEach((orderedId) => {
                if (orderedId) {
                    const columnIndex = remainingColumns.findIndex((col) => (col.id && col.id === orderedId) ||
                        col.title === orderedId);
                    if (columnIndex !== -1) {
                        orderedColumns.push(remainingColumns.splice(columnIndex, 1)[0]);
                    }
                }
            });
            // Then, add any remaining columns that weren't in the saved order
            orderedColumns.push(...remainingColumns);
            return orderedColumns;
        }
        catch (error) {
            console.error("Error applying column order:", error);
            return columns; // Fallback to original order
        }
    }
    initializeColumnSortable() {
        // Destroy existing column sortable instance if it exists
        if (this.columnSortableInstance) {
            this.columnSortableInstance.destroy();
            this.columnSortableInstance = null;
        }
        // Create sortable instance for column container
        this.columnSortableInstance = Sortable.create(this.columnContainerEl, {
            group: "kanban-columns",
            animation: 150,
            ghostClass: "tg-kanban-column-ghost",
            dragClass: "tg-kanban-column-dragging",
            handle: ".tg-kanban-column-header",
            direction: "horizontal",
            swapThreshold: 0.65,
            filter: ".tg-kanban-column-content, .tg-kanban-card, .tg-kanban-add-card-button",
            preventOnFilter: false,
            onEnd: (event) => {
                this.handleColumnSortEnd(event);
            },
        });
    }
    handleColumnSortEnd(event) {
        console.log("Column sort end:", event.oldIndex, event.newIndex);
        try {
            if (event.oldIndex === event.newIndex) {
                return; // No change in position
            }
            // Get the current column order from DOM
            const newColumnOrder = [];
            const columnElements = this.columnContainerEl.querySelectorAll(".tg-kanban-column");
            if (columnElements.length === 0) {
                console.warn("No column elements found during column sort end");
                return;
            }
            columnElements.forEach((columnEl) => {
                var _a;
                const columnTitle = (_a = columnEl.querySelector(".tg-kanban-column-title")) === null || _a === void 0 ? void 0 : _a.textContent;
                if (columnTitle) {
                    // Use the data-status-name attribute if available, otherwise use title
                    const statusName = columnEl.getAttribute("data-status-name");
                    const columnId = statusName || columnTitle;
                    newColumnOrder.push(columnId);
                }
            });
            if (newColumnOrder.length === 0) {
                console.warn("No valid column order found during sort end");
                return;
            }
            // Save the new order
            this.saveColumnOrder(newColumnOrder);
        }
        catch (error) {
            console.error("Error handling column sort end:", error);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2FuYmFuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsia2FuYmFuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBRU4sU0FBUyxFQUNULElBQUksRUFDSixRQUFRLEVBQ1IsT0FBTyxHQUVQLE1BQU0sVUFBVSxDQUFDO0FBR2xCLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ3hELG1HQUFtRztBQUNuRyxPQUFPLFFBQVEsTUFBTSxZQUFZLENBQUM7QUFDbEMsT0FBTyw0QkFBNEIsQ0FBQztBQUNwQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUMsQ0FBQyxxQkFBcUI7QUFDaEUsT0FBTyxFQUNOLGVBQWUsRUFDZiwyQkFBMkIsR0FDM0IsTUFBTSxrREFBa0QsQ0FBQztBQU0xRCxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLGlCQUFpQixHQUNqQixNQUFNLDhCQUE4QixDQUFDO0FBRXRDLGtDQUFrQztBQUNsQyxNQUFNLDJCQUEyQixHQUFHLHVDQUF1QyxDQUFDO0FBQzVFLE1BQU0sMEJBQTBCLEdBQUcsc0NBQXNDLENBQUM7QUFDMUUsTUFBTSwwQkFBMEIsR0FDL0IsZ0RBQWdELENBQUM7QUFhbEQsTUFBTSxPQUFPLGVBQWdCLFNBQVEsU0FBUztJQWlDN0MsWUFDQyxHQUFRLEVBQ1IsTUFBNkIsRUFDN0IsUUFBcUIsRUFDckIsZUFBdUIsRUFBRSxFQUN6QixTQVFJLEVBQUUsRUFDTixNQUFNLEdBQUcsUUFBUSxDQUFDLFlBQVk7O1FBRTlCLEtBQUssRUFBRSxDQUFDO1FBN0NELFlBQU8sR0FBNEIsRUFBRSxDQUFDO1FBRTlDLG9DQUFvQztRQUM1QixzQkFBaUIsR0FBZSxFQUFFLENBQUM7UUFDbkMsMkJBQXNCLEdBQW9CLElBQUksQ0FBQztRQUMvQyxVQUFLLEdBQVcsRUFBRSxDQUFDO1FBQ25CLGFBQVEsR0FBVyxFQUFFLENBQUM7UUFDdEIsa0JBQWEsR0FBRyxRQUFRLENBQUMs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LEVBQUU7Z0JBQ2hDLE9BQU8sQ0FBQyxJQUFJLENBQUMsNkNBQTZDLENBQUMsQ0FBQztnQkFDNUQsT0FBTzthQUNQO1lBRUQscUJBQXFCO1lBQ3JCLElBQUksQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLENBQUM7U0FDckM7UUFBQyxPQUFPLEtBQUssRUFBRTtZQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsaUNBQWlDLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDeEQ7SUFDRixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xyXG5cdEFwcCxcclxuXHRDb21wb25lbnQsXHJcblx0TWVudSxcclxuXHRQbGF0Zm9ybSxcclxuXHRzZXRJY29uLFxyXG5cdFdvcmtzcGFjZUxlYWYsXHJcbn0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjsgLy8gQWRqdXN0IHBhdGggYXMgbmVlZGVkXHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiQC90eXBlcy90YXNrXCI7IC8vIEFkanVzdCBwYXRoIGFzIG5lZWRlZFxyXG5pbXBvcnQgeyBLYW5iYW5Db2x1bW5Db21wb25lbnQgfSBmcm9tIFwiLi9rYW5iYW4tY29sdW1uXCI7XHJcbi8vIGltcG9ydCB7IERyYWdNYW5hZ2VyLCBEcmFnTW92ZUV2ZW50LCBEcmFnRW5kRXZlbnQgfSBmcm9tIFwiQC9jb21wb25lbnRzL3VpL2JlaGF2aW9yL0RyYWdNYW5hZ2VyXCI7XHJcbmltcG9ydCBTb3J0YWJsZSBmcm9tIFwic29ydGFibGVqc1wiO1xyXG5pbXBvcnQgXCJAL3N0eWxlcy9rYW5iYW4va2FuYmFuLmNzc1wiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiOyAvLyBBZGRlZCBpbXBvcnQgZm9yIHRcclxuaW1wb3J0IHtcclxuXHRGaWx0ZXJDb21wb25lbnQsXHJcblx0YnVpbGRGaWx0ZXJPcHRpb25zRnJvbVRhc2tzLFxyXG59IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay9maWx0ZXIvaW4tdmlldy9maWx0ZXJcIjtcclxuaW1wb3J0IHsgQWN0aXZlRmlsdGVyIH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy90YXNrL2ZpbHRlci9pbi12aWV3L2ZpbHRlci10eXBlXCI7XHJcbmltcG9ydCB7XHJcblx0S2FuYmFuU3BlY2lmaWNDb25maWcsXHJcblx0S2FuYmFuQ29sdW1uQ29uZmlnLFxyXG59IGZyb20gXCJAL2NvbW1vbi9zZXR0aW5nLWRlZmluaXRpb25cIjtcclxuaW1wb3J0IHtcclxuXHRnZXRFZmZlY3RpdmVQcm9qZWN0LFxyXG5cdGlzUHJvamVjdFJlYWRvbmx5LFxyXG59IGZyb20gXCJAL3V0aWxzL3Rhc2svdGFzay1vcGVyYXRpb25zXCI7XHJcblxyXG4vLyBDU1MgY2xhc3NlcyBmb3IgZHJvcCBpbmRpY2F0b3JzXHJcbmNvbnN0IERST1BfSU5ESUNBVE9SX0JFRk9SRV9DTEFTUyA9IFwidGcta2FuYmFuLWNhcmQtLWRyb3AtaW5kaWNhdG9yLWJlZm9yZVwiO1xyXG5jb25zdCBEUk9QX0lORElDQVRPUl9BRlRFUl9DTEFTUyA9IFwidGcta2FuYmFuLWNhcmQtLWRyb3AtaW5kaWNhdG9yLWFmdGVyXCI7XHJcbmNvbnN0IERST1BfSU5ESUNBVE9SX0VNUFRZX0NMQVNTID1cclxuXHRcInRnLWthbmJhbi1jb2x1bW4tY29udGVudC0tZHJvcC1pbmRpY2F0b3ItZW1wdHlcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgS2FuYmFuU29ydE9wdGlvbiB7XHJcblx0ZmllbGQ6XHJcblx0XHR8IFwicHJpb3JpdHlcIlxyXG5cdFx0fCBcImR1ZURhdGVcIlxyXG5cdFx0fCBcInNjaGVkdWxlZERhdGVcIlxyXG5cdFx0fCBcInN0YXJ0RGF0ZVwiXHJcblx0XHR8IFwiY3JlYXRlZERhdGVcIjtcclxuXHRvcmRlcjogXCJhc2NcIiB8IFwiZGVzY1wiO1xyXG5cdGxhYmVsOiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBLYW5iYW5Db21wb25lbnQgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luO1xyXG5cdGFwcDogQXBwO1xyXG5cdHB1YmxpYyBjb250YWluZXJFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBjb2x1bW5zOiBLYW5iYW5Db2x1bW5Db21wb25lbnRbXSA9IFtdO1xyXG5cdHByaXZhdGUgY29sdW1uQ29udGFpbmVyRWw6IEhUTUxFbGVtZW50O1xyXG5cdC8vIHByaXZhdGUgZHJhZ01hbmFnZXI6IERyYWdNYW5hZ2VyO1xyXG5cdHByaXZhdGUgc29ydGFibGVJbnN0YW5jZXM6IFNvcnRhYmxlW10gPSBbXTtcclxuXHRwcml2YXRlIGNvbHVtblNvcnRhYmxlSW5zdGFuY2U6IFNvcnRhYmxlIHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSB0YXNrczogVGFza1tdID0gW107XHJcblx0cHJpdmF0ZSBhbGxUYXNrczogVGFza1tdID0gW107XHJcblx0cHJpdmF0ZSBjdXJyZW50Vmlld0lkID0gXCJrYW5iYW5cIjsgLy8g5paw5aKe77ya5b2T5YmN6KeG5Zu+SURcclxuXHRwcml2YXRlIGNvbHVtbk9yZGVyOiBzdHJpbmdbXSA9IFtdO1xyXG5cdHByaXZhdGUgcGFyYW1zOiB7XHJcblx0XHRvblRhc2tTdGF0dXNVcGRhdGU/OiAoXHJcblx0XHRcdHRhc2tJZDogc3RyaW5nLFxyXG5cdFx0XHRuZXdTdGF0dXNNYXJrOiBzdHJpbmdcclxuXHRcdCkgPT4gUHJvbWlzZTx2b2lkPjtcclxuXHRcdG9uVGFza1NlbGVjdGVkPzogKHRhc2s6IFRhc2spID0+IHZvaWQ7XHJcblx0XHRvblRhc2tDb21wbGV0ZWQ/OiAodGFzazogVGFzaykgPT4gdm9pZDtcclxuXHRcdG9uVGFza0NvbnRleHRNZW51PzogKGV2OiBNb3VzZUV2ZW50LCB0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdH07XHJcblx0cHJpdmF0ZSBmaWx0ZXJDb21wb25lbnQ6IEZpbHRlckNvbXBvbmVudCB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgYWN0aXZlRmlsdGVyczogQWN0aXZlRmlsdGVyW10gPSBbXTtcclxuXHRwcml2YXRlIGZpbHRlckNvbnRhaW5lckVsOiBIVE1MRWxlbWVudDsgLy8gQXNzdW1lIHlvdSBoYXZlIGEgY29udGFpbmVyIGZvciBmaWx0ZXJzXHJcblx0cHJpdmF0ZSBzb3J0T3B0aW9uOiBLYW5iYW5Tb3J0T3B0aW9uID0ge1xyXG5cdFx0ZmllbGQ6IFwicHJpb3JpdHlcIixcclxuXHRcdG9yZGVyOiBcImRlc2NcIixcclxuXHRcdGxhYmVsOiBcIlByaW9yaXR5IChIaWdoIHRvIExvdylcIixcclxuXHR9O1xyXG5cdHByaXZhdGUgaGlkZUVtcHR5Q29sdW1ucyA9IGZhbHNlO1xyXG5cdHByaXZhdGUgY29uZmlnT3ZlcnJpZGU6IFBhcnRpYWw8S2FuYmFuU3BlY2lmaWNDb25maWc+IHwgbnVsbCA9IG51bGw7IC8vIENvbmZpZ3VyYXRpb24gb3ZlcnJpZGUgZnJvbSBCYXNlcyB2aWV3XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0YXBwOiBBcHAsXHJcblx0XHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdHBhcmVudEVsOiBIVE1MRWxlbWVudCxcclxuXHRcdGluaXRpYWxUYXNrczogVGFza1tdID0gW10sXHJcblx0XHRwYXJhbXM6IHtcclxuXHRcdFx0b25UYXNrU3RhdHVzVXBkYXRlPzogKFxyXG5cdFx0XHRcdHRhc2tJZDogc3RyaW5nLFxyXG5cdFx0XHRcdG5ld1N0YXR1c01hcms6IHN0cmluZ1xyXG5cdFx0XHQpID0+IFByb21pc2U8dm9pZD47XHJcblx0XHRcdG9uVGFza1NlbGVjdGVkPzogKHRhc2s6IFRhc2spID0+IHZvaWQ7XHJcblx0XHRcdG9uVGFza0NvbXBsZXRlZD86ICh0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdFx0XHRvblRhc2tDb250ZXh0TWVudT86IChldjogTW91c2VFdmVudCwgdGFzazogVGFzaykgPT4gdm9pZDtcclxuXHRcdH0gPSB7fSxcclxuXHRcdHZpZXdJZCA9IFwia2FuYmFuXCIgLy8g5paw5aKe77ya6KeG5Zu+SUTlj4LmlbBcclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLmFwcCA9IGFwcDtcclxuXHRcdHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG5cdFx0dGhpcy5jdXJyZW50Vmlld0lkID0gdmlld0lkOyAvLyDorr7nva7lvZPliY3op4blm75JRFxyXG5cdFx0dGhpcy5jb250YWluZXJFbCA9IHBhcmVudEVsLmNyZWF0ZURpdihcInRnLWthbmJhbi1jb21wb25lbnQtY29udGFpbmVyXCIpO1xyXG5cdFx0dGhpcy50YXNrcyA9IGluaXRpYWxUYXNrcztcclxuXHRcdHRoaXMucGFyYW1zID0gcGFyYW1zO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2V0IGNvbmZpZ3VyYXRpb24gb3ZlcnJpZGUgZnJvbSBCYXNlcyB2aWV3IGNvbmZpZ1xyXG5cdCAqL1xyXG5cdHB1YmxpYyBzZXRDb25maWdPdmVycmlkZShjb25maWc6IFBhcnRpYWw8S2FuYmFuU3BlY2lmaWNDb25maWc+IHwgbnVsbCk6IHZvaWQge1xyXG5cdFx0Y29uc3QgaXNDaGFuZ2VkID0gdGhpcy5oYXNDb25maWdPdmVycmlkZUNoYW5nZWQoY29uZmlnKTtcclxuXHRcdHRoaXMuY29uZmlnT3ZlcnJpZGUgPSBjb25maWc7XHJcblx0XHRjb25zb2xlLmxvZygnW0thbmJhbl0gc2V0Q29uZmlnT3ZlcnJpZGUgcmVjZWl2ZWQnLCBjb25maWcpO1xyXG5cclxuXHRcdGlmIChpc0NoYW5nZWQpIHtcclxuXHRcdFx0Ly8gUmVmcmVzaCBkZXJpdmVkIHN0YXRlIGZyb20gZWZmZWN0aXZlIGNvbmZpZyAoc29ydC9oaWRlL2NvbHVtbiBvcmRlcilcclxuXHRcdFx0dGhpcy5sb2FkS2FuYmFuQ29uZmlnKCk7XHJcblx0XHRcdGNvbnN0IGVmZiA9IHRoaXMuZ2V0RWZmZWN0aXZlS2FuYmFuQ29uZmlnKCk7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdbS2FuYmFuXSBlZmZlY3RpdmUgY29uZmlnIGFmdGVyIG92ZXJyaWRlJywgZWZmKTtcclxuXHRcdFx0aWYgKHRoaXMuY29sdW1uQ29udGFpbmVyRWwpIHtcclxuXHRcdFx0XHQvLyBSZWJ1aWxkIGNvbHVtbnMgd2l0aCB0aGUgbmV3IGNvbmZpZ3VyYXRpb24gc28gY2hhbmdlcyBsaWtlIGdyb3VwQnlcclxuXHRcdFx0XHQvLyB0YWtlIGVmZmVjdCBpbW1lZGlhdGVseSB3aXRob3V0IHJlcXVpcmluZyBhIGRhdGEgcmVmcmVzaC5cclxuXHRcdFx0XHR0aGlzLmFwcGx5RmlsdGVyc0FuZFJlbmRlcigpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldEVmZmVjdGl2ZUthbmJhbkNvbmZpZygpOiBLYW5iYW5TcGVjaWZpY0NvbmZpZyB8IHVuZGVmaW5lZCB7XHJcblx0XHRjb25zdCBwbHVnaW5Db25maWcgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy52aWV3Q29uZmlndXJhdGlvbi5maW5kKFxyXG5cdFx0XHQodikgPT4gdi5pZCA9PT0gdGhpcy5jdXJyZW50Vmlld0lkXHJcblx0XHQpPy5zcGVjaWZpY0NvbmZpZyBhcyBLYW5iYW5TcGVjaWZpY0NvbmZpZztcclxuXHRcdHJldHVybiB0aGlzLmNvbmZpZ092ZXJyaWRlID8gey4uLihwbHVnaW5Db25maWcgPz8ge30pLCAuLi50aGlzLmNvbmZpZ092ZXJyaWRlfSA6IHBsdWdpbkNvbmZpZztcclxuXHR9XHJcblxyXG5cdG92ZXJyaWRlIG9ubG9hZCgpIHtcclxuXHRcdHN1cGVyLm9ubG9hZCgpO1xyXG5cdFx0dGhpcy5jb250YWluZXJFbC5lbXB0eSgpO1xyXG5cdFx0dGhpcy5jb250YWluZXJFbC5hZGRDbGFzcyhcInRnLWthbmJhbi12aWV3XCIpO1xyXG5cclxuXHRcdC8vIExvYWQgY29uZmlndXJhdGlvbiBzZXR0aW5nc1xyXG5cdFx0dGhpcy5sb2FkS2FuYmFuQ29uZmlnKCk7XHJcblxyXG5cdFx0dGhpcy5maWx0ZXJDb250YWluZXJFbCA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInRnLWthbmJhbi1maWx0ZXJzXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBSZW5kZXIgZmlsdGVyIGNvbnRyb2xzIGZpcnN0XHJcblx0XHR0aGlzLnJlbmRlckZpbHRlckNvbnRyb2xzKHRoaXMuZmlsdGVyQ29udGFpbmVyRWwpO1xyXG5cclxuXHRcdC8vIFRoZW4gcmVuZGVyIHNvcnQgYW5kIHRvZ2dsZSBjb250cm9sc1xyXG5cdFx0dGhpcy5yZW5kZXJDb250cm9scyh0aGlzLmZpbHRlckNvbnRhaW5lckVsKTtcclxuXHJcblx0XHR0aGlzLmNvbHVtbkNvbnRhaW5lckVsID0gdGhpcy5jb250YWluZXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwidGcta2FuYmFuLWNvbHVtbi1jb250YWluZXJcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMucmVuZGVyQ29sdW1ucygpO1xyXG5cdFx0Y29uc29sZS5sb2coXCJLYW5iYW5Db21wb25lbnQgbG9hZGVkLlwiKTtcclxuXHR9XHJcblxyXG5cdG92ZXJyaWRlIG9udW5sb2FkKCkge1xyXG5cdFx0c3VwZXIub251bmxvYWQoKTtcclxuXHRcdHRoaXMuY29sdW1ucy5mb3JFYWNoKChjb2wpID0+IGNvbC51bmxvYWQoKSk7XHJcblx0XHR0aGlzLnNvcnRhYmxlSW5zdGFuY2VzLmZvckVhY2goKGluc3RhbmNlKSA9PiBpbnN0YW5jZS5kZXN0cm95KCkpO1xyXG5cclxuXHRcdC8vIERlc3Ryb3kgY29sdW1uIHNvcnRhYmxlIGluc3RhbmNlXHJcblx0XHRpZiAodGhpcy5jb2x1bW5Tb3J0YWJsZUluc3RhbmNlKSB7XHJcblx0XHRcdHRoaXMuY29sdW1uU29ydGFibGVJbnN0YW5jZS5kZXN0cm95KCk7XHJcblx0XHRcdHRoaXMuY29sdW1uU29ydGFibGVJbnN0YW5jZSA9IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5jb2x1bW5zID0gW107XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLmVtcHR5KCk7XHJcblx0XHRjb25zb2xlLmxvZyhcIkthbmJhbkNvbXBvbmVudCB1bmxvYWRlZC5cIik7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGhhc0NvbmZpZ092ZXJyaWRlQ2hhbmdlZChcclxuXHRcdG5leHRDb25maWc6IFBhcnRpYWw8S2FuYmFuU3BlY2lmaWNDb25maWc+IHwgbnVsbFxyXG5cdCk6IGJvb2xlYW4ge1xyXG5cdFx0aWYgKCF0aGlzLmNvbmZpZ092ZXJyaWRlICYmICFuZXh0Q29uZmlnKSB7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoIXRoaXMuY29uZmlnT3ZlcnJpZGUgfHwgIW5leHRDb25maWcpIHtcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0cmV0dXJuIChcclxuXHRcdFx0XHRKU09OLnN0cmluZ2lmeSh0aGlzLmNvbmZpZ092ZXJyaWRlKSAhPT0gSlNPTi5zdHJpbmdpZnkobmV4dENvbmZpZylcclxuXHRcdFx0KTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcIkZhaWxlZCB0byBjb21wYXJlIGthbmJhbiBjb25maWcgb3ZlcnJpZGVzOlwiLCBlcnJvcik7XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSByZW5kZXJDb250cm9scyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpIHtcclxuXHRcdC8vIENyZWF0ZSBhIGNvbnRyb2xzIGNvbnRhaW5lciBmb3Igc29ydCBhbmQgdG9nZ2xlIGNvbnRyb2xzXHJcblx0XHRjb25zdCBjb250cm9sc0NvbnRhaW5lciA9IGNvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ0Zy1rYW5iYW4tY29udHJvbHMtY29udGFpbmVyXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBTb3J0IGRyb3Bkb3duXHJcblx0XHRjb25zdCBzb3J0Q29udGFpbmVyID0gY29udHJvbHNDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInRnLWthbmJhbi1zb3J0LWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3Qgc29ydEJ1dHRvbiA9IHNvcnRDb250YWluZXIuY3JlYXRlRWwoXHJcblx0XHRcdFwiYnV0dG9uXCIsXHJcblx0XHRcdHtcclxuXHRcdFx0XHRjbHM6IFwidGcta2FuYmFuLXNvcnQtYnV0dG9uIGNsaWNrYWJsZS1pY29uXCIsXHJcblx0XHRcdH0sXHJcblx0XHRcdChlbCkgPT4ge1xyXG5cdFx0XHRcdHNldEljb24oZWwsIFwiYXJyb3ctdXAtZG93blwiKTtcclxuXHRcdFx0fVxyXG5cdFx0KTtcclxuXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoc29ydEJ1dHRvbiwgXCJjbGlja1wiLCAoZXZlbnQpID0+IHtcclxuXHRcdFx0Y29uc3QgbWVudSA9IG5ldyBNZW51KCk7XHJcblxyXG5cdFx0XHRjb25zdCBzb3J0T3B0aW9uczogS2FuYmFuU29ydE9wdGlvbltdID0gW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGZpZWxkOiBcInByaW9yaXR5XCIsXHJcblx0XHRcdFx0XHRvcmRlcjogXCJkZXNjXCIsXHJcblx0XHRcdFx0XHRsYWJlbDogdChcIlByaW9yaXR5IChIaWdoIHRvIExvdylcIiksXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRmaWVsZDogXCJwcmlvcml0eVwiLFxyXG5cdFx0XHRcdFx0b3JkZXI6IFwiYXNjXCIsXHJcblx0XHRcdFx0XHRsYWJlbDogdChcIlByaW9yaXR5IChMb3cgdG8gSGlnaClcIiksXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRmaWVsZDogXCJkdWVEYXRlXCIsXHJcblx0XHRcdFx0XHRvcmRlcjogXCJhc2NcIixcclxuXHRcdFx0XHRcdGxhYmVsOiB0KFwiRHVlIERhdGUgKEVhcmxpZXN0IEZpcnN0KVwiKSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGZpZWxkOiBcImR1ZURhdGVcIixcclxuXHRcdFx0XHRcdG9yZGVyOiBcImRlc2NcIixcclxuXHRcdFx0XHRcdGxhYmVsOiB0KFwiRHVlIERhdGUgKExhdGVzdCBGaXJzdClcIiksXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRmaWVsZDogXCJzY2hlZHVsZWREYXRlXCIsXHJcblx0XHRcdFx0XHRvcmRlcjogXCJhc2NcIixcclxuXHRcdFx0XHRcdGxhYmVsOiB0KFwiU2NoZWR1bGVkIERhdGUgKEVhcmxpZXN0IEZpcnN0KVwiKSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGZpZWxkOiBcInNjaGVkdWxlZERhdGVcIixcclxuXHRcdFx0XHRcdG9yZGVyOiBcImRlc2NcIixcclxuXHRcdFx0XHRcdGxhYmVsOiB0KFwiU2NoZWR1bGVkIERhdGUgKExhdGVzdCBGaXJzdClcIiksXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRmaWVsZDogXCJzdGFydERhdGVcIixcclxuXHRcdFx0XHRcdG9yZGVyOiBcImFzY1wiLFxyXG5cdFx0XHRcdFx0bGFiZWw6IHQoXCJTdGFydCBEYXRlIChFYXJsaWVzdCBGaXJzdClcIiksXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRmaWVsZDogXCJzdGFydERhdGVcIixcclxuXHRcdFx0XHRcdG9yZGVyOiBcImRlc2NcIixcclxuXHRcdFx0XHRcdGxhYmVsOiB0KFwiU3RhcnQgRGF0ZSAoTGF0ZXN0IEZpcnN0KVwiKSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRdO1xyXG5cclxuXHRcdFx0c29ydE9wdGlvbnMuZm9yRWFjaCgob3B0aW9uKSA9PiB7XHJcblx0XHRcdFx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdFx0XHRpdGVtLnNldFRpdGxlKG9wdGlvbi5sYWJlbClcclxuXHRcdFx0XHRcdFx0LnNldENoZWNrZWQoXHJcblx0XHRcdFx0XHRcdFx0b3B0aW9uLmZpZWxkID09PSB0aGlzLnNvcnRPcHRpb24uZmllbGQgJiZcclxuXHRcdFx0XHRcdFx0XHRvcHRpb24ub3JkZXIgPT09IHRoaXMuc29ydE9wdGlvbi5vcmRlclxyXG5cdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnNvcnRPcHRpb24gPSBvcHRpb247XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5yZW5kZXJDb2x1bW5zKCk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdG1lbnUuc2hvd0F0TW91c2VFdmVudChldmVudCk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyRmlsdGVyQ29udHJvbHMoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KSB7XHJcblx0XHRjb25zb2xlLmxvZyhcIkthbmJhbiByZW5kZXJpbmcgZmlsdGVyIGNvbnRyb2xzXCIpO1xyXG5cdFx0Ly8gQnVpbGQgaW5pdGlhbCBvcHRpb25zIGZyb20gdGhlIGN1cnJlbnQgZnVsbCB0YXNrIGxpc3RcclxuXHRcdGNvbnN0IGluaXRpYWxGaWx0ZXJPcHRpb25zID0gYnVpbGRGaWx0ZXJPcHRpb25zRnJvbVRhc2tzKHRoaXMuYWxsVGFza3MpO1xyXG5cdFx0Y29uc29sZS5sb2coXCJLYW5iYW4gaW5pdGlhbCBmaWx0ZXIgb3B0aW9uczpcIiwgaW5pdGlhbEZpbHRlck9wdGlvbnMpO1xyXG5cclxuXHRcdHRoaXMuZmlsdGVyQ29tcG9uZW50ID0gbmV3IEZpbHRlckNvbXBvbmVudChcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNvbnRhaW5lcjogY29udGFpbmVyRWwsXHJcblx0XHRcdFx0b3B0aW9uczogaW5pdGlhbEZpbHRlck9wdGlvbnMsXHJcblx0XHRcdFx0b25DaGFuZ2U6ICh1cGRhdGVkRmlsdGVyczogQWN0aXZlRmlsdGVyW10pID0+IHtcclxuXHRcdFx0XHRcdGlmICghdGhpcy5jb2x1bW5Db250YWluZXJFbCkge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR0aGlzLmFjdGl2ZUZpbHRlcnMgPSB1cGRhdGVkRmlsdGVycztcclxuXHRcdFx0XHRcdHRoaXMuYXBwbHlGaWx0ZXJzQW5kUmVuZGVyKCk7IC8vIFJlLXJlbmRlciB3aGVuIGZpbHRlcnMgY2hhbmdlXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSxcclxuXHRcdFx0dGhpcy5wbHVnaW4gLy8gUGFzcyBwbHVnaW4gaW5zdGFuY2VcclxuXHRcdCk7XHJcblxyXG5cdFx0dGhpcy5hZGRDaGlsZCh0aGlzLmZpbHRlckNvbXBvbmVudCk7IC8vIFJlZ2lzdGVyIGFzIGNoaWxkIGNvbXBvbmVudFxyXG5cdH1cclxuXHJcblx0cHVibGljIHNldFRhc2tzKG5ld1Rhc2tzOiBUYXNrW10pIHtcclxuXHRcdGNvbnNvbGUubG9nKFwiS2FuYmFuIHNldHRpbmcgdGFza3M6XCIsIG5ld1Rhc2tzLmxlbmd0aCk7XHJcblx0XHR0aGlzLmFsbFRhc2tzID0gWy4uLm5ld1Rhc2tzXTsgLy8gU3RvcmUgdGhlIGZ1bGwgbGlzdFxyXG5cclxuXHRcdGNvbnNvbGUubG9nKHRoaXMuZmlsdGVyQ29tcG9uZW50KTtcclxuXHRcdC8vIFVwZGF0ZSBmaWx0ZXIgb3B0aW9ucyBiYXNlZCBvbiB0aGUgY29tcGxldGUgdGFzayBsaXN0XHJcblx0XHRpZiAodGhpcy5maWx0ZXJDb21wb25lbnQpIHtcclxuXHRcdFx0dGhpcy5maWx0ZXJDb21wb25lbnQudXBkYXRlRmlsdGVyT3B0aW9ucyh0aGlzLmFsbFRhc2tzKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcIkZpbHRlciBjb21wb25lbnQgbm90IGluaXRpYWxpemVkIHdoZW4gc2V0dGluZyB0YXNrcy5cIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHQvLyBPcHRpb25zIHdpbGwgYmUgYnVpbHQgd2hlbiByZW5kZXJGaWx0ZXJDb250cm9scyBpcyBjYWxsZWQgaWYgaXQgaGFzbid0IGJlZW4geWV0LlxyXG5cdFx0XHQvLyBJZiByZW5kZXJGaWx0ZXJDb250cm9scyBhbHJlYWR5IHJhbiwgdGhpcyBtaWdodCBpbmRpY2F0ZSBhbiBpc3N1ZS5cclxuXHRcdH1cclxuXHJcblx0XHQvLyBBcHBseSBjdXJyZW50IGZpbHRlcnMgKHdoaWNoIG1pZ2h0IGJlIGVtcHR5IGluaXRpYWxseSkgYW5kIHJlbmRlciB0aGUgYm9hcmRcclxuXHRcdHRoaXMuYXBwbHlGaWx0ZXJzQW5kUmVuZGVyKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFwcGx5RmlsdGVyc0FuZFJlbmRlcigpIHtcclxuXHRcdGNvbnNvbGUubG9nKFwiS2FuYmFuIGFwcGx5aW5nIGZpbHRlcnM6XCIsIHRoaXMuYWN0aXZlRmlsdGVycyk7XHJcblx0XHQvLyBGaWx0ZXIgdGhlIGZ1bGwgbGlzdCBiYXNlZCBvbiBhY3RpdmUgZmlsdGVyc1xyXG5cdFx0aWYgKHRoaXMuYWN0aXZlRmlsdGVycy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0dGhpcy50YXNrcyA9IFsuLi50aGlzLmFsbFRhc2tzXTsgLy8gTm8gZmlsdGVycyBhY3RpdmUsIHNob3cgYWxsIHRhc2tzXHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBJbXBvcnQgb3IgZGVmaW5lIFBSSU9SSVRZX01BUCBpZiBuZWVkZWQgZm9yIHByaW9yaXR5IGZpbHRlcmluZ1xyXG5cdFx0XHRjb25zdCBQUklPUklUWV9NQVA6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7XHJcblx0XHRcdFx0XCLwn5S6XCI6IDUsXHJcblx0XHRcdFx0XCLij6tcIjogNCxcclxuXHRcdFx0XHRcIvCflLxcIjogMyxcclxuXHRcdFx0XHRcIvCflL1cIjogMixcclxuXHRcdFx0XHRcIuKPrO+4j1wiOiAxLFxyXG5cdFx0XHRcdFwi4o+sXCI6IDEsXHJcblx0XHRcdFx0aGlnaGVzdDogNSxcclxuXHRcdFx0XHRoaWdoOiA0LFxyXG5cdFx0XHRcdG1lZGl1bTogMyxcclxuXHRcdFx0XHRsb3c6IDIsXHJcblx0XHRcdFx0bG93ZXN0OiAxLFxyXG5cdFx0XHRcdC8vIEFkZCBudW1lcmljIHN0cmluZyBtYXBwaW5nc1xyXG5cdFx0XHRcdFwiMVwiOiAxLFxyXG5cdFx0XHRcdFwiMlwiOiAyLFxyXG5cdFx0XHRcdFwiM1wiOiAzLFxyXG5cdFx0XHRcdFwiNFwiOiA0LFxyXG5cdFx0XHRcdFwiNVwiOiA1LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0dGhpcy50YXNrcyA9IHRoaXMuYWxsVGFza3MuZmlsdGVyKCh0YXNrKSA9PiB7XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuYWN0aXZlRmlsdGVycy5ldmVyeSgoZmlsdGVyKSA9PiB7XHJcblx0XHRcdFx0XHRzd2l0Y2ggKGZpbHRlci5jYXRlZ29yeSkge1xyXG5cdFx0XHRcdFx0XHRjYXNlIFwic3RhdHVzXCI6XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRhc2suc3RhdHVzID09PSBmaWx0ZXIudmFsdWU7XHJcblx0XHRcdFx0XHRcdGNhc2UgXCJ0YWdcIjpcclxuXHRcdFx0XHRcdFx0XHQvLyBTdXBwb3J0IGZvciBuZXN0ZWQgdGFncyAtIGluY2x1ZGUgY2hpbGQgdGFnc1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybiB0aGlzLm1hdGNoZXNUYWdGaWx0ZXIodGFzaywgZmlsdGVyLnZhbHVlKTtcclxuXHRcdFx0XHRcdFx0Y2FzZSBcInByb2plY3RcIjpcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdGFzay5tZXRhZGF0YS5wcm9qZWN0ID09PSBmaWx0ZXIudmFsdWU7XHJcblx0XHRcdFx0XHRcdGNhc2UgXCJjb250ZXh0XCI6XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRhc2subWV0YWRhdGEuY29udGV4dCA9PT0gZmlsdGVyLnZhbHVlO1xyXG5cdFx0XHRcdFx0XHRjYXNlIFwicHJpb3JpdHlcIjpcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBleHBlY3RlZFByaW9yaXR5ID1cclxuXHRcdFx0XHRcdFx0XHRcdFBSSU9SSVRZX01BUFtmaWx0ZXIudmFsdWVdIHx8XHJcblx0XHRcdFx0XHRcdFx0XHRwYXJzZUludChmaWx0ZXIudmFsdWUpO1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybiB0YXNrLm1ldGFkYXRhLnByaW9yaXR5ID09PSBleHBlY3RlZFByaW9yaXR5O1xyXG5cdFx0XHRcdFx0XHRjYXNlIFwiY29tcGxldGVkXCI6XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIChcclxuXHRcdFx0XHRcdFx0XHRcdChmaWx0ZXIudmFsdWUgPT09IFwiWWVzXCIgJiYgdGFzay5jb21wbGV0ZWQpIHx8XHJcblx0XHRcdFx0XHRcdFx0XHQoZmlsdGVyLnZhbHVlID09PSBcIk5vXCIgJiYgIXRhc2suY29tcGxldGVkKVxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdGNhc2UgXCJmaWxlUGF0aFwiOlxyXG5cdFx0XHRcdFx0XHRcdHJldHVybiB0YXNrLmZpbGVQYXRoID09PSBmaWx0ZXIudmFsdWU7XHJcblx0XHRcdFx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0XHRcdFx0YFVua25vd24gZmlsdGVyIGNhdGVnb3J5IGluIEthbmJhbjogJHtmaWx0ZXIuY2F0ZWdvcnl9YFxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnNvbGUubG9nKFwiS2FuYmFuIGZpbHRlcmVkIHRhc2tzIGNvdW50OlwiLCB0aGlzLnRhc2tzLmxlbmd0aCk7XHJcblxyXG5cdFx0dGhpcy5yZW5kZXJDb2x1bW5zKCk7XHJcblx0fVxyXG5cclxuXHQvLyBFbmhhbmNlZCB0YWcgZmlsdGVyaW5nIHRvIHN1cHBvcnQgbmVzdGVkIHRhZ3NcclxuXHRwcml2YXRlIG1hdGNoZXNUYWdGaWx0ZXIodGFzazogVGFzaywgZmlsdGVyVGFnOiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHRcdGlmICghdGFzay5tZXRhZGF0YS50YWdzIHx8IHRhc2subWV0YWRhdGEudGFncy5sZW5ndGggPT09IDApXHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHJcblx0XHRyZXR1cm4gdGFzay5tZXRhZGF0YS50YWdzLnNvbWUoKHRhc2tUYWcpID0+IHtcclxuXHRcdFx0Ly8gU2tpcCBub24tc3RyaW5nIHRhZ3NcclxuXHRcdFx0aWYgKHR5cGVvZiB0YXNrVGFnICE9PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBEaXJlY3QgbWF0Y2hcclxuXHRcdFx0aWYgKHRhc2tUYWcgPT09IGZpbHRlclRhZykgcmV0dXJuIHRydWU7XHJcblxyXG5cdFx0XHQvLyBDaGVjayBpZiB0YXNrIHRhZyBpcyBhIGNoaWxkIG9mIHRoZSBmaWx0ZXIgdGFnXHJcblx0XHRcdC8vIGUuZy4sIGZpbHRlclRhZyA9IFwiI3dvcmtcIiwgdGFza1RhZyA9IFwiI3dvcmsvcHJvamVjdDFcIlxyXG5cdFx0XHRjb25zdCBub3JtYWxpemVkRmlsdGVyVGFnID0gZmlsdGVyVGFnLnN0YXJ0c1dpdGgoXCIjXCIpXHJcblx0XHRcdFx0PyBmaWx0ZXJUYWdcclxuXHRcdFx0XHQ6IGAjJHtmaWx0ZXJUYWd9YDtcclxuXHRcdFx0Y29uc3Qgbm9ybWFsaXplZFRhc2tUYWcgPSB0YXNrVGFnLnN0YXJ0c1dpdGgoXCIjXCIpXHJcblx0XHRcdFx0PyB0YXNrVGFnXHJcblx0XHRcdFx0OiBgIyR7dGFza1RhZ31gO1xyXG5cclxuXHRcdFx0cmV0dXJuIG5vcm1hbGl6ZWRUYXNrVGFnLnN0YXJ0c1dpdGgobm9ybWFsaXplZEZpbHRlclRhZyArIFwiL1wiKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gQWxsb3cgbXVsdGlwbGUgc3ltYm9scyB0byByZXByZXNlbnQgdGhlIHNhbWUgbG9naWNhbCBzdGF0dXMgKGUuZy4sIEluIFByb2dyZXNzOiBcIi9cIiBhbmQgXCI+XCIpXHJcblx0cHJpdmF0ZSBnZXRBbGxvd2VkTWFya3NGb3JTdGF0dXNOYW1lKFxyXG5cdFx0c3RhdHVzTmFtZTogc3RyaW5nXHJcblx0KTogU2V0PHN0cmluZz4gfCBudWxsIHtcclxuXHRcdGlmICghc3RhdHVzTmFtZSkgcmV0dXJuIG51bGw7XHJcblx0XHRjb25zdCBzID0gc3RhdHVzTmFtZS50cmltKCkudG9Mb3dlckNhc2UoKTtcclxuXHRcdGNvbnN0IHRzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c2VzIGFzIGFueTtcclxuXHRcdGlmICghdHMpIHJldHVybiBudWxsO1xyXG5cdFx0Ly8gTWFwIGNvbW1vbiBzdGF0dXMgbmFtZXMgdG8gY29uZmlndXJlZCBjYXRlZ29yaWVzXHJcblx0XHRjb25zdCBrZXlNYXA6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XHJcblx0XHRcdFwiaW4gcHJvZ3Jlc3NcIjogXCJpblByb2dyZXNzXCIsXHJcblx0XHRcdGNvbXBsZXRlZDogXCJjb21wbGV0ZWRcIixcclxuXHRcdFx0YWJhbmRvbmVkOiBcImFiYW5kb25lZFwiLFxyXG5cdFx0XHRwbGFubmVkOiBcInBsYW5uZWRcIixcclxuXHRcdFx0XCJub3Qgc3RhcnRlZFwiOiBcIm5vdFN0YXJ0ZWRcIixcclxuXHRcdFx0Ly8gc3lub255bXMgY29tbW9ubHkgc2VlblxyXG5cdFx0XHRjYW5jZWxsZWQ6IFwiYWJhbmRvbmVkXCIsXHJcblx0XHRcdGNhbmNlbGVkOiBcImFiYW5kb25lZFwiLFxyXG5cdFx0XHR1bmNoZWNrZWQ6IFwibm90U3RhcnRlZFwiLFxyXG5cdFx0XHRjaGVja2VkOiBcImNvbXBsZXRlZFwiLFxyXG5cdFx0fTtcclxuXHRcdGNvbnN0IGtleSA9IGtleU1hcFtzXTtcclxuXHRcdGlmICgha2V5KSByZXR1cm4gbnVsbDtcclxuXHRcdGNvbnN0IHJhdzogc3RyaW5nIHwgdW5kZWZpbmVkID0gdHNba2V5XTtcclxuXHRcdGlmICghcmF3IHx8IHR5cGVvZiByYXcgIT09IFwic3RyaW5nXCIpIHJldHVybiBudWxsO1xyXG5cdFx0Y29uc3Qgc2V0ID0gbmV3IFNldChcclxuXHRcdFx0cmF3XHJcblx0XHRcdFx0LnNwbGl0KFwifFwiKVxyXG5cdFx0XHRcdC5tYXAoKGNoOiBzdHJpbmcpID0+IGNoLnRyaW0oKSlcclxuXHRcdFx0XHQuZmlsdGVyKChjaDogc3RyaW5nKSA9PiBjaC5sZW5ndGggPT09IDEpXHJcblx0XHQpO1xyXG5cdFx0cmV0dXJuIHNldC5zaXplID4gMCA/IHNldCA6IG51bGw7XHJcblx0fVxyXG5cclxuXHQvLyBIYW5kbGUgZmlsdGVyIGFwcGxpY2F0aW9uIGZyb20gY2xpY2thYmxlIG1ldGFkYXRhXHJcblx0cHJpdmF0ZSBoYW5kbGVGaWx0ZXJBcHBseSA9IChcclxuXHRcdGZpbHRlclR5cGU6IHN0cmluZyxcclxuXHRcdHZhbHVlOiBzdHJpbmcgfCBudW1iZXIgfCBzdHJpbmdbXVxyXG5cdCkgPT4ge1xyXG5cdFx0Ly8gQ29udmVydCB2YWx1ZSB0byBzdHJpbmcgZm9yIGNvbnNpc3RlbnQgaGFuZGxpbmdcclxuXHRcdGxldCBzdHJpbmdWYWx1ZSA9IEFycmF5LmlzQXJyYXkodmFsdWUpID8gdmFsdWVbMF0gOiB2YWx1ZS50b1N0cmluZygpO1xyXG5cclxuXHRcdC8vIEZvciBwcmlvcml0eSBmaWx0ZXJzLCBjb252ZXJ0IG51bWVyaWMgaW5wdXQgdG8gaWNvbiByZXByZXNlbnRhdGlvbiBpZiBuZWVkZWRcclxuXHRcdGlmIChmaWx0ZXJUeXBlID09PSBcInByaW9yaXR5XCIgJiYgL15cXGQrJC8udGVzdChzdHJpbmdWYWx1ZSkpIHtcclxuXHRcdFx0c3RyaW5nVmFsdWUgPSB0aGlzLmNvbnZlcnRQcmlvcml0eVRvSWNvbihwYXJzZUludChzdHJpbmdWYWx1ZSkpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFkZCB0aGUgZmlsdGVyIHRvIGFjdGl2ZSBmaWx0ZXJzXHJcblx0XHRjb25zdCBuZXdGaWx0ZXI6IEFjdGl2ZUZpbHRlciA9IHtcclxuXHRcdFx0aWQ6IGAke2ZpbHRlclR5cGV9LSR7c3RyaW5nVmFsdWV9YCxcclxuXHRcdFx0Y2F0ZWdvcnk6IGZpbHRlclR5cGUsXHJcblx0XHRcdGNhdGVnb3J5TGFiZWw6IHRoaXMuZ2V0Q2F0ZWdvcnlMYWJlbChmaWx0ZXJUeXBlKSxcclxuXHRcdFx0dmFsdWU6IHN0cmluZ1ZhbHVlLFxyXG5cdFx0fTtcclxuXHJcblx0XHRjb25zb2xlLmxvZyhcIkthbmJhbiBoYW5kbGVGaWx0ZXJBcHBseVwiLCBmaWx0ZXJUeXBlLCBzdHJpbmdWYWx1ZSk7XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgZmlsdGVyIGFscmVhZHkgZXhpc3RzXHJcblx0XHRjb25zdCBleGlzdGluZ0ZpbHRlckluZGV4ID0gdGhpcy5hY3RpdmVGaWx0ZXJzLmZpbmRJbmRleChcclxuXHRcdFx0KGYpID0+IGYuY2F0ZWdvcnkgPT09IGZpbHRlclR5cGUgJiYgZi52YWx1ZSA9PT0gc3RyaW5nVmFsdWVcclxuXHRcdCk7XHJcblxyXG5cdFx0aWYgKGV4aXN0aW5nRmlsdGVySW5kZXggPT09IC0xKSB7XHJcblx0XHRcdC8vIEFkZCBuZXcgZmlsdGVyXHJcblx0XHRcdHRoaXMuYWN0aXZlRmlsdGVycy5wdXNoKG5ld0ZpbHRlcik7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBSZW1vdmUgZXhpc3RpbmcgZmlsdGVyICh0b2dnbGUgYmVoYXZpb3IpXHJcblx0XHRcdHRoaXMuYWN0aXZlRmlsdGVycy5zcGxpY2UoZXhpc3RpbmdGaWx0ZXJJbmRleCwgMSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVXBkYXRlIGZpbHRlciBjb21wb25lbnQgdG8gcmVmbGVjdCBjaGFuZ2VzXHJcblx0XHRpZiAodGhpcy5maWx0ZXJDb21wb25lbnQpIHtcclxuXHRcdFx0dGhpcy5maWx0ZXJDb21wb25lbnQuc2V0RmlsdGVycyhcclxuXHRcdFx0XHR0aGlzLmFjdGl2ZUZpbHRlcnMubWFwKChmKSA9PiAoe1xyXG5cdFx0XHRcdFx0Y2F0ZWdvcnk6IGYuY2F0ZWdvcnksXHJcblx0XHRcdFx0XHR2YWx1ZTogZi52YWx1ZSxcclxuXHRcdFx0XHR9KSlcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZS1hcHBseSBmaWx0ZXJzIGFuZCByZW5kZXJcclxuXHRcdHRoaXMuYXBwbHlGaWx0ZXJzQW5kUmVuZGVyKCk7XHJcblx0fTtcclxuXHJcblx0cHJpdmF0ZSBjb252ZXJ0UHJpb3JpdHlUb0ljb24ocHJpb3JpdHk6IG51bWJlcik6IHN0cmluZyB7XHJcblx0XHRjb25zdCBQUklPUklUWV9JQ09OUzogUmVjb3JkPG51bWJlciwgc3RyaW5nPiA9IHtcclxuXHRcdFx0NTogXCLwn5S6XCIsXHJcblx0XHRcdDQ6IFwi4o+rXCIsXHJcblx0XHRcdDM6IFwi8J+UvFwiLFxyXG5cdFx0XHQyOiBcIvCflL1cIixcclxuXHRcdFx0MTogXCLij6xcIixcclxuXHRcdH07XHJcblx0XHRyZXR1cm4gUFJJT1JJVFlfSUNPTlNbcHJpb3JpdHldIHx8IHByaW9yaXR5LnRvU3RyaW5nKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldENhdGVnb3J5TGFiZWwoY2F0ZWdvcnk6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHRzd2l0Y2ggKGNhdGVnb3J5KSB7XHJcblx0XHRcdGNhc2UgXCJ0YWdcIjpcclxuXHRcdFx0XHRyZXR1cm4gdChcIlRhZ1wiKTtcclxuXHRcdFx0Y2FzZSBcInByb2plY3RcIjpcclxuXHRcdFx0XHRyZXR1cm4gdChcIlByb2plY3RcIik7XHJcblx0XHRcdGNhc2UgXCJwcmlvcml0eVwiOlxyXG5cdFx0XHRcdHJldHVybiB0KFwiUHJpb3JpdHlcIik7XHJcblx0XHRcdGNhc2UgXCJzdGF0dXNcIjpcclxuXHRcdFx0XHRyZXR1cm4gdChcIlN0YXR1c1wiKTtcclxuXHRcdFx0Y2FzZSBcImNvbnRleHRcIjpcclxuXHRcdFx0XHRyZXR1cm4gdChcIkNvbnRleHRcIik7XHJcblx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0cmV0dXJuIGNhdGVnb3J5O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSByZW5kZXJDb2x1bW5zKCkge1xyXG5cdFx0dGhpcy5jb2x1bW5Db250YWluZXJFbD8uZW1wdHkoKTtcclxuXHRcdHRoaXMuY29sdW1ucy5mb3JFYWNoKChjb2wpID0+IHRoaXMucmVtb3ZlQ2hpbGQoY29sKSk7XHJcblx0XHR0aGlzLmNvbHVtbnMgPSBbXTtcclxuXHJcblx0XHQvLyBSZXNvbHZlIGVmZmVjdGl2ZSBjb25maWcgKEJhc2VzIG92ZXJyaWRlIHdpbnMgb3ZlciBwbHVnaW4gc2V0dGluZ3MpXHJcblx0XHRjb25zdCBrYW5iYW5Db25maWcgPSB0aGlzLmdldEVmZmVjdGl2ZUthbmJhbkNvbmZpZygpO1xyXG5cdFx0Y29uc29sZS5sb2coJ1tLYW5iYW5dIHJlbmRlckNvbHVtbnMgZWZmZWN0aXZlIGNvbmZpZycsIGthbmJhbkNvbmZpZyk7XHJcblxyXG5cdFx0Y29uc3QgZ3JvdXBCeSA9IGthbmJhbkNvbmZpZz8uZ3JvdXBCeSB8fCBcInN0YXR1c1wiO1xyXG5cclxuXHRcdGlmIChncm91cEJ5ID09PSBcInN0YXR1c1wiKSB7XHJcblx0XHRcdHRoaXMucmVuZGVyU3RhdHVzQ29sdW1ucygpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy5yZW5kZXJDdXN0b21Db2x1bW5zKGdyb3VwQnksIGthbmJhbkNvbmZpZz8uY3VzdG9tQ29sdW1ucyk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVXBkYXRlIGNvbHVtbiB2aXNpYmlsaXR5IGJhc2VkIG9uIGhpZGVFbXB0eUNvbHVtbnMgc2V0dGluZ1xyXG5cdFx0dGhpcy51cGRhdGVDb2x1bW5WaXNpYmlsaXR5KCk7XHJcblxyXG5cdFx0Ly8gUmUtaW5pdGlhbGl6ZSBzb3J0YWJsZSBpbnN0YW5jZXMgYWZ0ZXIgY29sdW1ucyBhcmUgcmVuZGVyZWRcclxuXHRcdHRoaXMuaW5pdGlhbGl6ZVNvcnRhYmxlSW5zdGFuY2VzKCk7XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBjb2x1bW4gc29ydGluZ1xyXG5cdFx0dGhpcy5pbml0aWFsaXplQ29sdW1uU29ydGFibGUoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyU3RhdHVzQ29sdW1ucygpIHtcclxuXHRcdGNvbnN0IHN0YXR1c0N5Y2xlID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c0N5Y2xlO1xyXG5cdFx0bGV0IHN0YXR1c05hbWVzID1cclxuXHRcdFx0c3RhdHVzQ3ljbGUubGVuZ3RoID4gMFxyXG5cdFx0XHRcdD8gc3RhdHVzQ3ljbGVcclxuXHRcdFx0XHQ6IFtcIlRvZG9cIiwgXCJJbiBQcm9ncmVzc1wiLCBcIkRvbmVcIl07XHJcblxyXG5cdFx0Y29uc3Qgc3BhY2VTdGF0dXM6IHN0cmluZ1tdID0gW107XHJcblx0XHRjb25zdCB4U3RhdHVzOiBzdHJpbmdbXSA9IFtdO1xyXG5cdFx0Y29uc3Qgb3RoZXJTdGF0dXNlczogc3RyaW5nW10gPSBbXTtcclxuXHJcblx0XHRzdGF0dXNOYW1lcy5mb3JFYWNoKChzdGF0dXNOYW1lKSA9PiB7XHJcblx0XHRcdGNvbnN0IHN0YXR1c01hcmsgPSB0aGlzLnJlc29sdmVTdGF0dXNNYXJrKHN0YXR1c05hbWUpID8/IFwiIFwiO1xyXG5cclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLmV4Y2x1ZGVNYXJrc0Zyb21DeWNsZSAmJlxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLmV4Y2x1ZGVNYXJrc0Zyb21DeWNsZS5pbmNsdWRlcyhzdGF0dXNOYW1lKVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChzdGF0dXNNYXJrID09PSBcIiBcIikge1xyXG5cdFx0XHRcdHNwYWNlU3RhdHVzLnB1c2goc3RhdHVzTmFtZSk7XHJcblx0XHRcdH0gZWxzZSBpZiAoc3RhdHVzTWFyay50b0xvd2VyQ2FzZSgpID09PSBcInhcIikge1xyXG5cdFx0XHRcdHhTdGF0dXMucHVzaChzdGF0dXNOYW1lKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRvdGhlclN0YXR1c2VzLnB1c2goc3RhdHVzTmFtZSk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIOaMieeFp+imgeaxgueahOmhuuW6j+WQiOW5tueKtuaAgeWQjeensFxyXG5cdFx0c3RhdHVzTmFtZXMgPSBbLi4uc3BhY2VTdGF0dXMsIC4uLm90aGVyU3RhdHVzZXMsIC4uLnhTdGF0dXNdO1xyXG5cclxuXHRcdC8vIEFwcGx5IHNhdmVkIGNvbHVtbiBvcmRlciB0byBzdGF0dXMgbmFtZXNcclxuXHRcdGNvbnN0IHN0YXR1c0NvbHVtbnMgPSBzdGF0dXNOYW1lcy5tYXAoKG5hbWUpID0+ICh7dGl0bGU6IG5hbWV9KSk7XHJcblx0XHRjb25zdCBvcmRlcmVkU3RhdHVzQ29sdW1ucyA9IHRoaXMuYXBwbHlDb2x1bW5PcmRlcihzdGF0dXNDb2x1bW5zKTtcclxuXHRcdGNvbnN0IG9yZGVyZWRTdGF0dXNOYW1lcyA9IG9yZGVyZWRTdGF0dXNDb2x1bW5zLm1hcCgoY29sKSA9PiBjb2wudGl0bGUpO1xyXG5cclxuXHRcdG9yZGVyZWRTdGF0dXNOYW1lcy5mb3JFYWNoKChzdGF0dXNOYW1lKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRhc2tzRm9yU3RhdHVzID0gdGhpcy5nZXRUYXNrc0ZvclN0YXR1cyhzdGF0dXNOYW1lKTtcclxuXHJcblx0XHRcdGNvbnN0IGNvbHVtbiA9IG5ldyBLYW5iYW5Db2x1bW5Db21wb25lbnQoXHJcblx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdFx0dGhpcy5jb2x1bW5Db250YWluZXJFbCxcclxuXHRcdFx0XHRzdGF0dXNOYW1lLFxyXG5cdFx0XHRcdHRhc2tzRm9yU3RhdHVzLFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdC4uLnRoaXMucGFyYW1zLFxyXG5cdFx0XHRcdFx0b25UYXNrU3RhdHVzVXBkYXRlOiAoXHJcblx0XHRcdFx0XHRcdHRhc2tJZDogc3RyaW5nLFxyXG5cdFx0XHRcdFx0XHRuZXdTdGF0dXNNYXJrOiBzdHJpbmdcclxuXHRcdFx0XHRcdCkgPT4gdGhpcy5oYW5kbGVTdGF0dXNVcGRhdGUodGFza0lkLCBuZXdTdGF0dXNNYXJrKSxcclxuXHRcdFx0XHRcdG9uRmlsdGVyQXBwbHk6IHRoaXMuaGFuZGxlRmlsdGVyQXBwbHksXHJcblx0XHRcdFx0fVxyXG5cdFx0XHQpO1xyXG5cdFx0XHR0aGlzLmFkZENoaWxkKGNvbHVtbik7XHJcblx0XHRcdHRoaXMuY29sdW1ucy5wdXNoKGNvbHVtbik7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyQ3VzdG9tQ29sdW1ucyhcclxuXHRcdGdyb3VwQnk6IHN0cmluZyxcclxuXHRcdGN1c3RvbUNvbHVtbnM/OiBLYW5iYW5Db2x1bW5Db25maWdbXVxyXG5cdCkge1xyXG5cdFx0bGV0IGNvbHVtbkNvbmZpZ3M6IHsgdGl0bGU6IHN0cmluZzsgdmFsdWU6IGFueTsgaWQ6IHN0cmluZyB9W10gPSBbXTtcclxuXHJcblx0XHRpZiAoY3VzdG9tQ29sdW1ucyAmJiBjdXN0b21Db2x1bW5zLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0Ly8gVXNlIGN1c3RvbSBkZWZpbmVkIGNvbHVtbnNcclxuXHRcdFx0Y29sdW1uQ29uZmlncyA9IGN1c3RvbUNvbHVtbnNcclxuXHRcdFx0XHQuc29ydCgoYSwgYikgPT4gYS5vcmRlciAtIGIub3JkZXIpXHJcblx0XHRcdFx0Lm1hcCgoY29sKSA9PiAoe1xyXG5cdFx0XHRcdFx0dGl0bGU6IGNvbC50aXRsZSxcclxuXHRcdFx0XHRcdHZhbHVlOiBjb2wudmFsdWUsXHJcblx0XHRcdFx0XHRpZDogY29sLmlkLFxyXG5cdFx0XHRcdH0pKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIEdlbmVyYXRlIGRlZmF1bHQgY29sdW1ucyBiYXNlZCBvbiBncm91cEJ5IHR5cGVcclxuXHRcdFx0Y29sdW1uQ29uZmlncyA9IHRoaXMuZ2VuZXJhdGVEZWZhdWx0Q29sdW1ucyhncm91cEJ5KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBBcHBseSBzYXZlZCBjb2x1bW4gb3JkZXIgdG8gY29sdW1uIGNvbmZpZ3VyYXRpb25zXHJcblx0XHRjb25zdCBvcmRlcmVkQ29sdW1uQ29uZmlncyA9IHRoaXMuYXBwbHlDb2x1bW5PcmRlcihjb2x1bW5Db25maWdzKTtcclxuXHJcblx0XHRvcmRlcmVkQ29sdW1uQ29uZmlncy5mb3JFYWNoKChjb25maWcpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFza3NGb3JDb2x1bW4gPSB0aGlzLmdldFRhc2tzRm9yUHJvcGVydHkoXHJcblx0XHRcdFx0Z3JvdXBCeSxcclxuXHRcdFx0XHRjb25maWcudmFsdWVcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGNvbnN0IGNvbHVtbiA9IG5ldyBLYW5iYW5Db2x1bW5Db21wb25lbnQoXHJcblx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdFx0dGhpcy5jb2x1bW5Db250YWluZXJFbCxcclxuXHRcdFx0XHRjb25maWcudGl0bGUsXHJcblx0XHRcdFx0dGFza3NGb3JDb2x1bW4sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0Li4udGhpcy5wYXJhbXMsXHJcblx0XHRcdFx0XHRvblRhc2tTdGF0dXNVcGRhdGU6ICh0YXNrSWQ6IHN0cmluZywgbmV3VmFsdWU6IHN0cmluZykgPT5cclxuXHRcdFx0XHRcdFx0dGhpcy5oYW5kbGVQcm9wZXJ0eVVwZGF0ZShcclxuXHRcdFx0XHRcdFx0XHR0YXNrSWQsXHJcblx0XHRcdFx0XHRcdFx0Z3JvdXBCeSxcclxuXHRcdFx0XHRcdFx0XHRjb25maWcudmFsdWUsXHJcblx0XHRcdFx0XHRcdFx0bmV3VmFsdWVcclxuXHRcdFx0XHRcdFx0KSxcclxuXHRcdFx0XHRcdG9uRmlsdGVyQXBwbHk6IHRoaXMuaGFuZGxlRmlsdGVyQXBwbHksXHJcblx0XHRcdFx0fVxyXG5cdFx0XHQpO1xyXG5cdFx0XHR0aGlzLmFkZENoaWxkKGNvbHVtbik7XHJcblx0XHRcdHRoaXMuY29sdW1ucy5wdXNoKGNvbHVtbik7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZ2VuZXJhdGVEZWZhdWx0Q29sdW1ucyhcclxuXHRcdGdyb3VwQnk6IHN0cmluZ1xyXG5cdCk6IHsgdGl0bGU6IHN0cmluZzsgdmFsdWU6IGFueTsgaWQ6IHN0cmluZyB9W10ge1xyXG5cdFx0c3dpdGNoIChncm91cEJ5KSB7XHJcblx0XHRcdGNhc2UgXCJwcmlvcml0eVwiOlxyXG5cdFx0XHRcdHJldHVybiBbXHJcblx0XHRcdFx0XHR7dGl0bGU6IFwi8J+UuiBIaWdoZXN0XCIsIHZhbHVlOiA1LCBpZDogXCJwcmlvcml0eS01XCJ9LFxyXG5cdFx0XHRcdFx0e3RpdGxlOiBcIuKPqyBIaWdoXCIsIHZhbHVlOiA0LCBpZDogXCJwcmlvcml0eS00XCJ9LFxyXG5cdFx0XHRcdFx0e3RpdGxlOiBcIvCflLwgTWVkaXVtXCIsIHZhbHVlOiAzLCBpZDogXCJwcmlvcml0eS0zXCJ9LFxyXG5cdFx0XHRcdFx0e3RpdGxlOiBcIvCflL0gTG93XCIsIHZhbHVlOiAyLCBpZDogXCJwcmlvcml0eS0yXCJ9LFxyXG5cdFx0XHRcdFx0e3RpdGxlOiBcIuKPrCBMb3dlc3RcIiwgdmFsdWU6IDEsIGlkOiBcInByaW9yaXR5LTFcIn0sXHJcblx0XHRcdFx0XHR7dGl0bGU6IFwiTm8gUHJpb3JpdHlcIiwgdmFsdWU6IG51bGwsIGlkOiBcInByaW9yaXR5LW5vbmVcIn0sXHJcblx0XHRcdFx0XTtcclxuXHRcdFx0Y2FzZSBcInRhZ3NcIjpcclxuXHRcdFx0XHQvLyBHZXQgdW5pcXVlIHRhZ3MgZnJvbSBhbGwgdGFza3NcclxuXHRcdFx0XHRjb25zdCBhbGxUYWdzID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcblx0XHRcdFx0dGhpcy50YXNrcy5mb3JFYWNoKCh0YXNrKSA9PiB7XHJcblx0XHRcdFx0XHRjb25zdCBtZXRhZGF0YSA9IHRhc2subWV0YWRhdGEgfHwge307XHJcblx0XHRcdFx0XHRpZiAobWV0YWRhdGEudGFncykge1xyXG5cdFx0XHRcdFx0XHRtZXRhZGF0YS50YWdzLmZvckVhY2goKHRhZykgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdC8vIFNraXAgbm9uLXN0cmluZyB0YWdzXHJcblx0XHRcdFx0XHRcdFx0aWYgKHR5cGVvZiB0YWcgPT09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0XHRcdFx0XHRcdGFsbFRhZ3MuYWRkKHRhZyk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRjb25zdCB0YWdDb2x1bW5zID0gQXJyYXkuZnJvbShhbGxUYWdzKS5tYXAoKHRhZykgPT4gKHtcclxuXHRcdFx0XHRcdHRpdGxlOiBgJHt0YWd9YCxcclxuXHRcdFx0XHRcdHZhbHVlOiB0YWcsXHJcblx0XHRcdFx0XHRpZDogYHRhZy0ke3RhZ31gLFxyXG5cdFx0XHRcdH0pKTtcclxuXHRcdFx0XHR0YWdDb2x1bW5zLnVuc2hpZnQoe1xyXG5cdFx0XHRcdFx0dGl0bGU6IFwiTm8gVGFnc1wiLFxyXG5cdFx0XHRcdFx0dmFsdWU6IFwiXCIsXHJcblx0XHRcdFx0XHRpZDogXCJ0YWctbm9uZVwiLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdHJldHVybiB0YWdDb2x1bW5zO1xyXG5cdFx0XHRjYXNlIFwicHJvamVjdFwiOlxyXG5cdFx0XHRcdC8vIEdldCB1bmlxdWUgcHJvamVjdHMgZnJvbSBhbGwgdGFza3MgKGluY2x1ZGluZyB0Z1Byb2plY3QpXHJcblx0XHRcdFx0Y29uc3QgYWxsUHJvamVjdHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuXHRcdFx0XHR0aGlzLnRhc2tzLmZvckVhY2goKHRhc2spID0+IHtcclxuXHRcdFx0XHRcdGNvbnN0IGVmZmVjdGl2ZVByb2plY3QgPSBnZXRFZmZlY3RpdmVQcm9qZWN0KHRhc2spO1xyXG5cdFx0XHRcdFx0aWYgKGVmZmVjdGl2ZVByb2plY3QpIHtcclxuXHRcdFx0XHRcdFx0YWxsUHJvamVjdHMuYWRkKGVmZmVjdGl2ZVByb2plY3QpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGNvbnN0IHByb2plY3RDb2x1bW5zID0gQXJyYXkuZnJvbShhbGxQcm9qZWN0cykubWFwKFxyXG5cdFx0XHRcdFx0KHByb2plY3QpID0+ICh7XHJcblx0XHRcdFx0XHRcdHRpdGxlOiBwcm9qZWN0LFxyXG5cdFx0XHRcdFx0XHR2YWx1ZTogcHJvamVjdCxcclxuXHRcdFx0XHRcdFx0aWQ6IGBwcm9qZWN0LSR7cHJvamVjdH1gLFxyXG5cdFx0XHRcdFx0fSlcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHByb2plY3RDb2x1bW5zLnB1c2goe1xyXG5cdFx0XHRcdFx0dGl0bGU6IFwiTm8gUHJvamVjdFwiLFxyXG5cdFx0XHRcdFx0dmFsdWU6IFwiXCIsXHJcblx0XHRcdFx0XHRpZDogXCJwcm9qZWN0LW5vbmVcIixcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRyZXR1cm4gcHJvamVjdENvbHVtbnM7XHJcblx0XHRcdGNhc2UgXCJjb250ZXh0XCI6XHJcblx0XHRcdFx0Ly8gR2V0IHVuaXF1ZSBjb250ZXh0cyBmcm9tIGFsbCB0YXNrc1xyXG5cdFx0XHRcdGNvbnN0IGFsbENvbnRleHRzID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcblx0XHRcdFx0dGhpcy50YXNrcy5mb3JFYWNoKCh0YXNrKSA9PiB7XHJcblx0XHRcdFx0XHRjb25zdCBtZXRhZGF0YSA9IHRhc2subWV0YWRhdGEgfHwge307XHJcblx0XHRcdFx0XHRpZiAobWV0YWRhdGEuY29udGV4dCkge1xyXG5cdFx0XHRcdFx0XHRhbGxDb250ZXh0cy5hZGQobWV0YWRhdGEuY29udGV4dCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0Y29uc3QgY29udGV4dENvbHVtbnMgPSBBcnJheS5mcm9tKGFsbENvbnRleHRzKS5tYXAoXHJcblx0XHRcdFx0XHQoY29udGV4dCkgPT4gKHtcclxuXHRcdFx0XHRcdFx0dGl0bGU6IGBAJHtjb250ZXh0fWAsXHJcblx0XHRcdFx0XHRcdHZhbHVlOiBjb250ZXh0LFxyXG5cdFx0XHRcdFx0XHRpZDogYGNvbnRleHQtJHtjb250ZXh0fWAsXHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0Y29udGV4dENvbHVtbnMucHVzaCh7XHJcblx0XHRcdFx0XHR0aXRsZTogXCJObyBDb250ZXh0XCIsXHJcblx0XHRcdFx0XHR2YWx1ZTogXCJcIixcclxuXHRcdFx0XHRcdGlkOiBcImNvbnRleHQtbm9uZVwiLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdHJldHVybiBjb250ZXh0Q29sdW1ucztcclxuXHRcdFx0Y2FzZSBcImR1ZURhdGVcIjpcclxuXHRcdFx0Y2FzZSBcInNjaGVkdWxlZERhdGVcIjpcclxuXHRcdFx0Y2FzZSBcInN0YXJ0RGF0ZVwiOlxyXG5cdFx0XHRcdHJldHVybiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHRpdGxlOiBcIk92ZXJkdWVcIixcclxuXHRcdFx0XHRcdFx0dmFsdWU6IFwib3ZlcmR1ZVwiLFxyXG5cdFx0XHRcdFx0XHRpZDogYCR7Z3JvdXBCeX0tb3ZlcmR1ZWAsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e3RpdGxlOiBcIlRvZGF5XCIsIHZhbHVlOiBcInRvZGF5XCIsIGlkOiBgJHtncm91cEJ5fS10b2RheWB9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR0aXRsZTogXCJUb21vcnJvd1wiLFxyXG5cdFx0XHRcdFx0XHR2YWx1ZTogXCJ0b21vcnJvd1wiLFxyXG5cdFx0XHRcdFx0XHRpZDogYCR7Z3JvdXBCeX0tdG9tb3Jyb3dgLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0dGl0bGU6IFwiVGhpcyBXZWVrXCIsXHJcblx0XHRcdFx0XHRcdHZhbHVlOiBcInRoaXNXZWVrXCIsXHJcblx0XHRcdFx0XHRcdGlkOiBgJHtncm91cEJ5fS10aGlzV2Vla2AsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR0aXRsZTogXCJOZXh0IFdlZWtcIixcclxuXHRcdFx0XHRcdFx0dmFsdWU6IFwibmV4dFdlZWtcIixcclxuXHRcdFx0XHRcdFx0aWQ6IGAke2dyb3VwQnl9LW5leHRXZWVrYCxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7dGl0bGU6IFwiTGF0ZXJcIiwgdmFsdWU6IFwibGF0ZXJcIiwgaWQ6IGAke2dyb3VwQnl9LWxhdGVyYH0sXHJcblx0XHRcdFx0XHR7dGl0bGU6IFwiTm8gRGF0ZVwiLCB2YWx1ZTogbnVsbCwgaWQ6IGAke2dyb3VwQnl9LW5vbmVgfSxcclxuXHRcdFx0XHRdO1xyXG5cdFx0XHRjYXNlIFwiZmlsZVBhdGhcIjpcclxuXHRcdFx0XHQvLyBHZXQgdW5pcXVlIGZpbGUgcGF0aHMgZnJvbSBhbGwgdGFza3NcclxuXHRcdFx0XHRjb25zdCBhbGxQYXRocyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG5cdFx0XHRcdHRoaXMudGFza3MuZm9yRWFjaCgodGFzaykgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKHRhc2suZmlsZVBhdGgpIHtcclxuXHRcdFx0XHRcdFx0YWxsUGF0aHMuYWRkKHRhc2suZmlsZVBhdGgpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdHJldHVybiBBcnJheS5mcm9tKGFsbFBhdGhzKS5tYXAoKHBhdGgpID0+ICh7XHJcblx0XHRcdFx0XHR0aXRsZTogcGF0aC5zcGxpdChcIi9cIikucG9wKCkgfHwgcGF0aCwgLy8gU2hvdyBqdXN0IGZpbGVuYW1lXHJcblx0XHRcdFx0XHR2YWx1ZTogcGF0aCxcclxuXHRcdFx0XHRcdGlkOiBgcGF0aC0ke3BhdGgucmVwbGFjZSgvW15hLXpBLVowLTldL2csIFwiLVwiKX1gLFxyXG5cdFx0XHRcdH0pKTtcclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRyZXR1cm4gW3t0aXRsZTogXCJBbGwgVGFza3NcIiwgdmFsdWU6IG51bGwsIGlkOiBcImFsbFwifV07XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHVwZGF0ZUNvbHVtblZpc2liaWxpdHkoKSB7XHJcblx0XHRjb25zdCBlZmZlY3RpdmUgPSB0aGlzLmdldEVmZmVjdGl2ZUthbmJhbkNvbmZpZygpO1xyXG5cdFx0Y29uc3QgaGlkZUVtcHR5ID0gZWZmZWN0aXZlPy5oaWRlRW1wdHlDb2x1bW5zID8/IHRoaXMuaGlkZUVtcHR5Q29sdW1ucztcclxuXHRcdHRoaXMuY29sdW1ucy5mb3JFYWNoKChjb2x1bW4pID0+IHtcclxuXHRcdFx0aWYgKGhpZGVFbXB0eSAmJiBjb2x1bW4uaXNFbXB0eSgpKSB7XHJcblx0XHRcdFx0Y29sdW1uLnNldFZpc2libGUoZmFsc2UpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGNvbHVtbi5zZXRWaXNpYmxlKHRydWUpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZ2V0VGFza3NGb3JTdGF0dXMoc3RhdHVzTmFtZTogc3RyaW5nKTogVGFza1tdIHtcclxuXHRcdC8vIFByZWZlciBtdWx0aS1tYXJrIG1hcHBpbmcgZnJvbSBzZXR0aW5ncy50YXNrU3RhdHVzZXMgd2hlbiBhdmFpbGFibGVcclxuXHRcdGNvbnN0IGFsbG93ZWQgPSB0aGlzLmdldEFsbG93ZWRNYXJrc0ZvclN0YXR1c05hbWUoc3RhdHVzTmFtZSk7XHJcblx0XHRjb25zdCBzdGF0dXNNYXJrID0gdGhpcy5yZXNvbHZlU3RhdHVzTWFyayhzdGF0dXNOYW1lKSA/PyBcIiBcIjtcclxuXHJcblx0XHQvLyBGaWx0ZXIgZnJvbSB0aGUgYWxyZWFkeSBmaWx0ZXJlZCBsaXN0XHJcblx0XHRjb25zdCB0YXNrc0ZvclN0YXR1cyA9IHRoaXMudGFza3MuZmlsdGVyKCh0YXNrKSA9PiB7XHJcblx0XHRcdGNvbnN0IG1hcmsgPSB0YXNrLnN0YXR1cyB8fCBcIiBcIjtcclxuXHRcdFx0cmV0dXJuIGFsbG93ZWQgPyBhbGxvd2VkLmhhcyhtYXJrKSA6IG1hcmsgPT09IHN0YXR1c01hcms7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBTb3J0IHRhc2tzIHdpdGhpbiB0aGUgc3RhdHVzIGNvbHVtbiBiYXNlZCBvbiBzZWxlY3RlZCBzb3J0IG9wdGlvblxyXG5cdFx0dGFza3NGb3JTdGF0dXMuc29ydCgoYSwgYikgPT4gdGhpcy5jb21wYXJlVGFza3MoYSwgYiwgdGhpcy5zb3J0T3B0aW9uKSk7XHJcblx0XHRyZXR1cm4gdGFza3NGb3JTdGF0dXM7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNvbXBhcmVUYXNrcyhcclxuXHRcdGE6IFRhc2ssXHJcblx0XHRiOiBUYXNrLFxyXG5cdFx0c29ydE9wdGlvbjogS2FuYmFuU29ydE9wdGlvblxyXG5cdCk6IG51bWJlciB7XHJcblx0XHRjb25zdCB7ZmllbGQsIG9yZGVyfSA9IHNvcnRPcHRpb247XHJcblx0XHRsZXQgY29tcGFyaXNvbiA9IDA7XHJcblxyXG5cdFx0Ly8gRW5zdXJlIGJvdGggdGFza3MgaGF2ZSBtZXRhZGF0YSBwcm9wZXJ0eVxyXG5cdFx0Y29uc3QgbWV0YWRhdGFBID0gYS5tZXRhZGF0YSB8fCB7fTtcclxuXHRcdGNvbnN0IG1ldGFkYXRhQiA9IGIubWV0YWRhdGEgfHwge307XHJcblxyXG5cdFx0c3dpdGNoIChmaWVsZCkge1xyXG5cdFx0XHRjYXNlIFwicHJpb3JpdHlcIjpcclxuXHRcdFx0XHRjb25zdCBwcmlvcml0eUEgPSBtZXRhZGF0YUEucHJpb3JpdHkgPz8gMDtcclxuXHRcdFx0XHRjb25zdCBwcmlvcml0eUIgPSBtZXRhZGF0YUIucHJpb3JpdHkgPz8gMDtcclxuXHRcdFx0XHRjb21wYXJpc29uID0gcHJpb3JpdHlBIC0gcHJpb3JpdHlCO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwiZHVlRGF0ZVwiOlxyXG5cdFx0XHRcdGNvbnN0IGR1ZURhdGVBID0gbWV0YWRhdGFBLmR1ZURhdGUgPz8gTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVI7XHJcblx0XHRcdFx0Y29uc3QgZHVlRGF0ZUIgPSBtZXRhZGF0YUIuZHVlRGF0ZSA/PyBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUjtcclxuXHRcdFx0XHRjb21wYXJpc29uID0gZHVlRGF0ZUEgLSBkdWVEYXRlQjtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBcInNjaGVkdWxlZERhdGVcIjpcclxuXHRcdFx0XHRjb25zdCBzY2hlZHVsZWRBID1cclxuXHRcdFx0XHRcdG1ldGFkYXRhQS5zY2hlZHVsZWREYXRlID8/IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSO1xyXG5cdFx0XHRcdGNvbnN0IHNjaGVkdWxlZEIgPVxyXG5cdFx0XHRcdFx0bWV0YWRhdGFCLnNjaGVkdWxlZERhdGUgPz8gTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVI7XHJcblx0XHRcdFx0Y29tcGFyaXNvbiA9IHNjaGVkdWxlZEEgLSBzY2hlZHVsZWRCO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwic3RhcnREYXRlXCI6XHJcblx0XHRcdFx0Y29uc3Qgc3RhcnRBID0gbWV0YWRhdGFBLnN0YXJ0RGF0ZSA/PyBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUjtcclxuXHRcdFx0XHRjb25zdCBzdGFydEIgPSBtZXRhZGF0YUIuc3RhcnREYXRlID8/IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSO1xyXG5cdFx0XHRcdGNvbXBhcmlzb24gPSBzdGFydEEgLSBzdGFydEI7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgXCJjcmVhdGVkRGF0ZVwiOlxyXG5cdFx0XHRcdGNvbnN0IGNyZWF0ZWRBID1cclxuXHRcdFx0XHRcdG1ldGFkYXRhQS5jcmVhdGVkRGF0ZSA/PyBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUjtcclxuXHRcdFx0XHRjb25zdCBjcmVhdGVkQiA9XHJcblx0XHRcdFx0XHRtZXRhZGF0YUIuY3JlYXRlZERhdGUgPz8gTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVI7XHJcblx0XHRcdFx0Y29tcGFyaXNvbiA9IGNyZWF0ZWRBIC0gY3JlYXRlZEI7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQXBwbHkgb3JkZXIgKGFzYy9kZXNjKVxyXG5cdFx0cmV0dXJuIG9yZGVyID09PSBcImRlc2NcIiA/IC1jb21wYXJpc29uIDogY29tcGFyaXNvbjtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaW5pdGlhbGl6ZVNvcnRhYmxlSW5zdGFuY2VzKCkge1xyXG5cdFx0dGhpcy5zb3J0YWJsZUluc3RhbmNlcy5mb3JFYWNoKChpbnN0YW5jZSkgPT4gaW5zdGFuY2UuZGVzdHJveSgpKTtcclxuXHRcdHRoaXMuc29ydGFibGVJbnN0YW5jZXMgPSBbXTtcclxuXHJcblx0XHQvLyBEZXRlY3QgaWYgd2UncmUgb24gYSBtb2JpbGUgZGV2aWNlXHJcblx0XHRjb25zdCBpc01vYmlsZSA9XHJcblx0XHRcdCFQbGF0Zm9ybS5pc0Rlc2t0b3AgfHxcclxuXHRcdFx0XCJvbnRvdWNoc3RhcnRcIiBpbiB3aW5kb3cgfHxcclxuXHRcdFx0bmF2aWdhdG9yLm1heFRvdWNoUG9pbnRzID4gMDtcclxuXHJcblx0XHR0aGlzLmNvbHVtbnMuZm9yRWFjaCgoY29sKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbHVtbkNvbnRlbnQgPSBjb2wuZ2V0Q29udGVudEVsZW1lbnQoKTtcclxuXHRcdFx0Y29uc3QgaW5zdGFuY2UgPSBTb3J0YWJsZS5jcmVhdGUoY29sdW1uQ29udGVudCwge1xyXG5cdFx0XHRcdGdyb3VwOiBcImthbmJhbi1ncm91cFwiLFxyXG5cdFx0XHRcdGFuaW1hdGlvbjogMTUwLFxyXG5cdFx0XHRcdGdob3N0Q2xhc3M6IFwidGcta2FuYmFuLWNhcmQtZ2hvc3RcIixcclxuXHRcdFx0XHRkcmFnQ2xhc3M6IFwidGcta2FuYmFuLWNhcmQtZHJhZ2dpbmdcIixcclxuXHRcdFx0XHQvLyBNb2JpbGUtc3BlY2lmaWMgb3B0aW1pemF0aW9uc1xyXG5cdFx0XHRcdGRlbGF5OiBpc01vYmlsZSA/IDE1MCA6IDAsIC8vIExvbmdlciBkZWxheSBvbiBtb2JpbGUgdG8gZGlzdGluZ3Vpc2ggZnJvbSBzY3JvbGxcclxuXHRcdFx0XHR0b3VjaFN0YXJ0VGhyZXNob2xkOiBpc01vYmlsZSA/IDUgOiAzLCAvLyBNb3JlIHRocmVzaG9sZCBvbiBtb2JpbGVcclxuXHRcdFx0XHRmb3JjZUZhbGxiYWNrOiBmYWxzZSwgLy8gVXNlIG5hdGl2ZSBIVE1MNSBkcmFnIHdoZW4gcG9zc2libGVcclxuXHRcdFx0XHRmYWxsYmFja09uQm9keTogdHJ1ZSwgLy8gQXBwZW5kIGdob3N0IHRvIGJvZHkgZm9yIGJldHRlciBtb2JpbGUgcGVyZm9ybWFuY2VcclxuXHRcdFx0XHQvLyBTY3JvbGwgc2V0dGluZ3MgZm9yIG1vYmlsZVxyXG5cdFx0XHRcdHNjcm9sbDogdHJ1ZSwgLy8gRW5hYmxlIGF1dG8tc2Nyb2xsaW5nXHJcblx0XHRcdFx0c2Nyb2xsU2Vuc2l0aXZpdHk6IGlzTW9iaWxlID8gNTAgOiAzMCwgLy8gSGlnaGVyIHNlbnNpdGl2aXR5IG9uIG1vYmlsZVxyXG5cdFx0XHRcdHNjcm9sbFNwZWVkOiBpc01vYmlsZSA/IDE1IDogMTAsIC8vIEZhc3RlciBzY3JvbGwgb24gbW9iaWxlXHJcblx0XHRcdFx0YnViYmxlU2Nyb2xsOiB0cnVlLCAvLyBFbmFibGUgYnViYmxlIHNjcm9sbGluZyBmb3IgbmVzdGVkIGNvbnRhaW5lcnNcclxuXHRcdFx0XHRvbkVuZDogKGV2ZW50KSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLmhhbmRsZVNvcnRFbmQoZXZlbnQpO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0XHR0aGlzLnNvcnRhYmxlSW5zdGFuY2VzLnB1c2goaW5zdGFuY2UpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIGhhbmRsZVNvcnRFbmQoZXZlbnQ6IFNvcnRhYmxlLlNvcnRhYmxlRXZlbnQpIHtcclxuXHRcdGNvbnNvbGUubG9nKFwiS2FuYmFuIHNvcnQgZW5kOlwiLCBldmVudC5vbGRJbmRleCwgZXZlbnQubmV3SW5kZXgpO1xyXG5cdFx0Y29uc3QgdGFza0lkID0gZXZlbnQuaXRlbS5kYXRhc2V0LnRhc2tJZDtcclxuXHRcdGNvbnN0IGRyb3BUYXJnZXRDb2x1bW5Db250ZW50ID0gZXZlbnQudG87XHJcblx0XHRjb25zdCBzb3VyY2VDb2x1bW5Db250ZW50ID0gZXZlbnQuZnJvbTtcclxuXHJcblx0XHRpZiAodGFza0lkICYmIGRyb3BUYXJnZXRDb2x1bW5Db250ZW50KSB7XHJcblx0XHRcdC8vIEdldCB0YXJnZXQgY29sdW1uIGluZm9ybWF0aW9uXHJcblx0XHRcdGNvbnN0IHRhcmdldENvbHVtbkVsID1cclxuXHRcdFx0XHRkcm9wVGFyZ2V0Q29sdW1uQ29udGVudC5jbG9zZXN0KFwiLnRnLWthbmJhbi1jb2x1bW5cIik7XHJcblx0XHRcdGNvbnN0IHRhcmdldENvbHVtblRpdGxlID0gdGFyZ2V0Q29sdW1uRWxcclxuXHRcdFx0XHQ/ICh0YXJnZXRDb2x1bW5FbCBhcyBIVE1MRWxlbWVudCkucXVlcnlTZWxlY3RvcihcclxuXHRcdFx0XHRcdFwiLnRnLWthbmJhbi1jb2x1bW4tdGl0bGVcIlxyXG5cdFx0XHRcdCk/LnRleHRDb250ZW50XHJcblx0XHRcdFx0OiBudWxsO1xyXG5cclxuXHRcdFx0Ly8gR2V0IHNvdXJjZSBjb2x1bW4gaW5mb3JtYXRpb25cclxuXHRcdFx0Y29uc3Qgc291cmNlQ29sdW1uRWwgPVxyXG5cdFx0XHRcdHNvdXJjZUNvbHVtbkNvbnRlbnQuY2xvc2VzdChcIi50Zy1rYW5iYW4tY29sdW1uXCIpO1xyXG5cdFx0XHRjb25zdCBzb3VyY2VDb2x1bW5UaXRsZSA9IHNvdXJjZUNvbHVtbkVsXHJcblx0XHRcdFx0PyAoc291cmNlQ29sdW1uRWwgYXMgSFRNTEVsZW1lbnQpLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFx0XHRcIi50Zy1rYW5iYW4tY29sdW1uLXRpdGxlXCJcclxuXHRcdFx0XHQpPy50ZXh0Q29udGVudFxyXG5cdFx0XHRcdDogbnVsbDtcclxuXHJcblx0XHRcdGlmICh0YXJnZXRDb2x1bW5UaXRsZSAmJiBzb3VyY2VDb2x1bW5UaXRsZSkge1xyXG5cdFx0XHRcdGNvbnN0IGthbmJhbkNvbmZpZyA9XHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy52aWV3Q29uZmlndXJhdGlvbi5maW5kKFxyXG5cdFx0XHRcdFx0XHQodikgPT4gdi5pZCA9PT0gdGhpcy5jdXJyZW50Vmlld0lkXHJcblx0XHRcdFx0XHQpPy5zcGVjaWZpY0NvbmZpZyBhcyBLYW5iYW5TcGVjaWZpY0NvbmZpZztcclxuXHJcblx0XHRcdFx0Y29uc3QgZ3JvdXBCeVBsdWdpbiA9IGthbmJhbkNvbmZpZz8uZ3JvdXBCeSB8fCBcInN0YXR1c1wiO1xyXG5cdFx0XHRcdGNvbnN0IGdyb3VwQnkgPSAodGhpcy5nZXRFZmZlY3RpdmVLYW5iYW5Db25maWcoKT8uZ3JvdXBCeSkgfHwgZ3JvdXBCeVBsdWdpbjtcclxuXHJcblx0XHRcdFx0aWYgKGdyb3VwQnkgPT09IFwic3RhdHVzXCIpIHtcclxuXHRcdFx0XHRcdC8vIEhhbmRsZSBzdGF0dXMtYmFzZWQgZ3JvdXBpbmcgKG9yaWdpbmFsIGxvZ2ljKVxyXG5cdFx0XHRcdFx0Y29uc3QgdGFyZ2V0U3RhdHVzTWFyayA9IHRoaXMucmVzb2x2ZVN0YXR1c01hcmsoXHJcblx0XHRcdFx0XHRcdCh0YXJnZXRDb2x1bW5UaXRsZSB8fCBcIlwiKS50cmltKClcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRpZiAodGFyZ2V0U3RhdHVzTWFyayAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRcdGBLYW5iYW4gcmVxdWVzdGluZyBzdGF0dXMgdXBkYXRlIGZvciB0YXNrICR7dGFza0lkfSB0byBzdGF0dXMgJHt0YXJnZXRDb2x1bW5UaXRsZX0gKG1hcms6ICR7dGFyZ2V0U3RhdHVzTWFya30pYFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRhd2FpdCB0aGlzLmhhbmRsZVN0YXR1c1VwZGF0ZSh0YXNrSWQsIHRhcmdldFN0YXR1c01hcmspO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0XHRcdGBDb3VsZCBub3QgZmluZCBzdGF0dXMgbWFyayBmb3Igc3RhdHVzIG5hbWU6ICR7dGFyZ2V0Q29sdW1uVGl0bGV9YFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRjb25zdCBlZmZlY3RpdmVDdXN0b21Db2x1bW5zID0gKHRoaXMuZ2V0RWZmZWN0aXZlS2FuYmFuQ29uZmlnKCk/LmN1c3RvbUNvbHVtbnMpIHx8IGthbmJhbkNvbmZpZz8uY3VzdG9tQ29sdW1ucztcclxuXHJcblx0XHRcdFx0XHQvLyBIYW5kbGUgcHJvcGVydHktYmFzZWQgZ3JvdXBpbmdcclxuXHRcdFx0XHRcdGNvbnN0IHRhcmdldFZhbHVlID0gdGhpcy5nZXRDb2x1bW5WYWx1ZUZyb21UaXRsZShcclxuXHRcdFx0XHRcdFx0dGFyZ2V0Q29sdW1uVGl0bGUsXHJcblx0XHRcdFx0XHRcdGdyb3VwQnksXHJcblx0XHRcdFx0XHRcdGVmZmVjdGl2ZUN1c3RvbUNvbHVtbnNcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRjb25zdCBzb3VyY2VWYWx1ZSA9IHRoaXMuZ2V0Q29sdW1uVmFsdWVGcm9tVGl0bGUoXHJcblx0XHRcdFx0XHRcdHNvdXJjZUNvbHVtblRpdGxlLFxyXG5cdFx0XHRcdFx0XHRncm91cEJ5LFxyXG5cdFx0XHRcdFx0XHRlZmZlY3RpdmVDdXN0b21Db2x1bW5zXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcdGBLYW5iYW4gcmVxdWVzdGluZyAke2dyb3VwQnl9IHVwZGF0ZSBmb3IgdGFzayAke3Rhc2tJZH0gZnJvbSAke3NvdXJjZVZhbHVlfSB0byB2YWx1ZTogJHt0YXJnZXRWYWx1ZX1gXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0YXdhaXQgdGhpcy5oYW5kbGVQcm9wZXJ0eVVwZGF0ZShcclxuXHRcdFx0XHRcdFx0dGFza0lkLFxyXG5cdFx0XHRcdFx0XHRncm91cEJ5LFxyXG5cdFx0XHRcdFx0XHRzb3VyY2VWYWx1ZSxcclxuXHRcdFx0XHRcdFx0dGFyZ2V0VmFsdWVcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBBZnRlciB1cGRhdGUsIHNlbGVjdCB0aGUgbW92ZWQgdGFzayBzbyB0aGUgc3RhdHVzIHBhbmVsIChkZXRhaWxzKSByZWZsZWN0cyBjaGFuZ2VzXHJcblx0XHRcdFx0Y29uc3QgbW92ZWRUYXNrID1cclxuXHRcdFx0XHRcdHRoaXMuYWxsVGFza3MuZmluZCgodCkgPT4gdC5pZCA9PT0gdGFza0lkKSB8fFxyXG5cdFx0XHRcdFx0dGhpcy50YXNrcy5maW5kKCh0KSA9PiB0LmlkID09PSB0YXNrSWQpO1xyXG5cdFx0XHRcdGlmIChtb3ZlZFRhc2sgJiYgdGhpcy5wYXJhbXM/Lm9uVGFza1NlbGVjdGVkKSB7XHJcblx0XHRcdFx0XHR0aGlzLnBhcmFtcy5vblRhc2tTZWxlY3RlZChtb3ZlZFRhc2spO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBsb2FkS2FuYmFuQ29uZmlnKCkge1xyXG5cdFx0Y29uc3Qga2FuYmFuQ29uZmlnID0gdGhpcy5nZXRFZmZlY3RpdmVLYW5iYW5Db25maWcoKTtcclxuXHJcblx0XHRpZiAoa2FuYmFuQ29uZmlnKSB7XHJcblx0XHRcdHRoaXMuaGlkZUVtcHR5Q29sdW1ucyA9IGthbmJhbkNvbmZpZy5oaWRlRW1wdHlDb2x1bW5zIHx8IGZhbHNlO1xyXG5cdFx0XHR0aGlzLnNvcnRPcHRpb24gPSB7XHJcblx0XHRcdFx0ZmllbGQ6IGthbmJhbkNvbmZpZy5kZWZhdWx0U29ydEZpZWxkIHx8IFwicHJpb3JpdHlcIixcclxuXHRcdFx0XHRvcmRlcjoga2FuYmFuQ29uZmlnLmRlZmF1bHRTb3J0T3JkZXIgfHwgXCJkZXNjXCIsXHJcblx0XHRcdFx0bGFiZWw6IHRoaXMuZ2V0U29ydE9wdGlvbkxhYmVsKFxyXG5cdFx0XHRcdFx0a2FuYmFuQ29uZmlnLmRlZmF1bHRTb3J0RmllbGQgfHwgXCJwcmlvcml0eVwiLFxyXG5cdFx0XHRcdFx0a2FuYmFuQ29uZmlnLmRlZmF1bHRTb3J0T3JkZXIgfHwgXCJkZXNjXCJcclxuXHRcdFx0XHQpLFxyXG5cdFx0XHR9O1xyXG5cdFx0XHRjb25zb2xlLmxvZygnW0thbmJhbl0gbG9hZEthbmJhbkNvbmZpZyBhcHBsaWVkJywge1xyXG5cdFx0XHRcdGhpZGVFbXB0eUNvbHVtbnM6IHRoaXMuaGlkZUVtcHR5Q29sdW1ucyxcclxuXHRcdFx0XHRkZWZhdWx0U29ydEZpZWxkOiB0aGlzLnNvcnRPcHRpb24uZmllbGQsXHJcblx0XHRcdFx0ZGVmYXVsdFNvcnRPcmRlcjogdGhpcy5zb3J0T3B0aW9uLm9yZGVyLFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBMb2FkIHNhdmVkIGNvbHVtbiBvcmRlclxyXG5cdFx0dGhpcy5sb2FkQ29sdW1uT3JkZXIoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZ2V0U29ydE9wdGlvbkxhYmVsKGZpZWxkOiBzdHJpbmcsIG9yZGVyOiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgZmllbGRMYWJlbHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XHJcblx0XHRcdHByaW9yaXR5OiB0KFwiUHJpb3JpdHlcIiksXHJcblx0XHRcdGR1ZURhdGU6IHQoXCJEdWUgRGF0ZVwiKSxcclxuXHRcdFx0c2NoZWR1bGVkRGF0ZTogdChcIlNjaGVkdWxlZCBEYXRlXCIpLFxyXG5cdFx0XHRzdGFydERhdGU6IHQoXCJTdGFydCBEYXRlXCIpLFxyXG5cdFx0XHRjcmVhdGVkRGF0ZTogdChcIkNyZWF0ZWQgRGF0ZVwiKSxcclxuXHRcdH07XHJcblx0XHRjb25zdCBvcmRlckxhYmVsID0gb3JkZXIgPT09IFwiYXNjXCIgPyB0KFwiQXNjZW5kaW5nXCIpIDogdChcIkRlc2NlbmRpbmdcIik7XHJcblx0XHRyZXR1cm4gYCR7ZmllbGRMYWJlbHNbZmllbGRdfSAoJHtvcmRlckxhYmVsfSlgO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVzb2x2ZSBhIHN0YXR1cyBjb2x1bW4gdGl0bGUgdG8gaXRzIG1hcmsgc2FmZWx5LlxyXG5cdCAqIEFjY2VwdHMgZWl0aGVyIGNvbmZpZ3VyZWQgc3RhdHVzIG5hbWVzIChlLmcuLCBcIkFiYW5kb25lZFwiKVxyXG5cdCAqIG9yIHJhdyBtYXJrcyAoZS5nLiwgXCItXCIsIFwieFwiLCBcIi9cIikuXHJcblx0ICovXHJcblx0cHJpdmF0ZSByZXNvbHZlU3RhdHVzTWFyayh0aXRsZU9yTWFyazogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcclxuXHRcdGlmICghdGl0bGVPck1hcmspIHJldHVybiB1bmRlZmluZWQ7XHJcblx0XHRjb25zdCB0cmltbWVkID0gdGl0bGVPck1hcmsudHJpbSgpO1xyXG5cdFx0Ly8gSWYgYSBzaW5nbGUtY2hhcmFjdGVyIG1hcmsgaXMgcHJvdmlkZWQsIHVzZSBpdCBhcy1pc1xyXG5cdFx0aWYgKHRyaW1tZWQubGVuZ3RoID09PSAxKSB7XHJcblx0XHRcdHJldHVybiB0cmltbWVkO1xyXG5cdFx0fVxyXG5cdFx0Ly8gVHJ5IGV4YWN0IG1hdGNoXHJcblx0XHRjb25zdCBleGFjdCA9ICh0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXNrU3RhdHVzTWFya3MgYXMgYW55KVt0cmltbWVkXTtcclxuXHRcdGlmICh0eXBlb2YgZXhhY3QgPT09IFwic3RyaW5nXCIpIHJldHVybiBleGFjdDtcclxuXHRcdC8vIFRyeSBjYXNlLWluc2Vuc2l0aXZlIG1hdGNoXHJcblx0XHRmb3IgKGNvbnN0IFtuYW1lLCBtYXJrXSBvZiBPYmplY3QuZW50cmllcyhcclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c01hcmtzXHJcblx0XHQpKSB7XHJcblx0XHRcdGlmIChuYW1lLnRvTG93ZXJDYXNlKCkgPT09IHRyaW1tZWQudG9Mb3dlckNhc2UoKSkge1xyXG5cdFx0XHRcdHJldHVybiBtYXJrIGFzIHN0cmluZztcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBnZXRDb2x1bW5Db250YWluZXIoKTogSFRNTEVsZW1lbnQge1xyXG5cdFx0cmV0dXJuIHRoaXMuY29sdW1uQ29udGFpbmVyRWw7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIGhhbmRsZVN0YXR1c1VwZGF0ZShcclxuXHRcdHRhc2tJZDogc3RyaW5nLFxyXG5cdFx0bmV3U3RhdHVzTWFyazogc3RyaW5nXHJcblx0KTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRpZiAodGhpcy5wYXJhbXMub25UYXNrU3RhdHVzVXBkYXRlKSB7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0YXdhaXQgdGhpcy5wYXJhbXMub25UYXNrU3RhdHVzVXBkYXRlKHRhc2tJZCwgbmV3U3RhdHVzTWFyayk7XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkZhaWxlZCB0byB1cGRhdGUgdGFzayBzdGF0dXM6XCIsIGVycm9yKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBoYW5kbGVQcm9wZXJ0eVVwZGF0ZShcclxuXHRcdHRhc2tJZDogc3RyaW5nLFxyXG5cdFx0Z3JvdXBCeTogc3RyaW5nLFxyXG5cdFx0b2xkVmFsdWU6IGFueSxcclxuXHRcdG5ld1ZhbHVlOiBzdHJpbmdcclxuXHQpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdC8vIFRoaXMgbWV0aG9kIHdpbGwgaGFuZGxlIHVwZGF0aW5nIHRhc2sgcHJvcGVydGllcyB3aGVuIGRyYWdnZWQgYmV0d2VlbiBjb2x1bW5zXHJcblx0XHRpZiAoZ3JvdXBCeSA9PT0gXCJzdGF0dXNcIikge1xyXG5cdFx0XHRhd2FpdCB0aGlzLmhhbmRsZVN0YXR1c1VwZGF0ZSh0YXNrSWQsIG5ld1ZhbHVlKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEZpbmQgdGhlIHRhc2sgdG8gdXBkYXRlXHJcblx0XHRjb25zdCB0YXNrVG9VcGRhdGUgPSB0aGlzLmFsbFRhc2tzLmZpbmQoKHRhc2spID0+IHRhc2suaWQgPT09IHRhc2tJZCk7XHJcblx0XHRpZiAoIXRhc2tUb1VwZGF0ZSkge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0YFRhc2sgd2l0aCBJRCAke3Rhc2tJZH0gbm90IGZvdW5kIGZvciBwcm9wZXJ0eSB1cGRhdGVgXHJcblx0XHRcdCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHR0YXNrVG9VcGRhdGUubWV0YWRhdGEgPSB0YXNrVG9VcGRhdGUubWV0YWRhdGEgfHwge307XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIHVwZGF0ZWQgdGFzayBvYmplY3RcclxuXHRcdGNvbnN0IHVwZGF0ZWRUYXNrID0gey4uLnRhc2tUb1VwZGF0ZX07XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHRoZSBzcGVjaWZpYyBwcm9wZXJ0eSBiYXNlZCBvbiBncm91cEJ5IHR5cGVcclxuXHRcdHN3aXRjaCAoZ3JvdXBCeSkge1xyXG5cdFx0XHRjYXNlIFwicHJpb3JpdHlcIjpcclxuXHRcdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YS5wcmlvcml0eSA9XHJcblx0XHRcdFx0XHRuZXdWYWx1ZSA9PT0gbnVsbCB8fCBuZXdWYWx1ZSA9PT0gXCJcIlxyXG5cdFx0XHRcdFx0XHQ/IHVuZGVmaW5lZFxyXG5cdFx0XHRcdFx0XHQ6IE51bWJlcihuZXdWYWx1ZSk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgXCJ0YWdzXCI6XHJcblx0XHRcdFx0aWYgKG5ld1ZhbHVlID09PSBudWxsIHx8IG5ld1ZhbHVlID09PSBcIlwiKSB7XHJcblx0XHRcdFx0XHQvLyBNb3ZpbmcgdG8gXCJObyBUYWdzXCIgY29sdW1uIC0gcmVtb3ZlIGFsbCB0YWdzXHJcblx0XHRcdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YS50YWdzID0gW107XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdC8vIE1vdmluZyB0byBhIHNwZWNpZmljIHRhZyBjb2x1bW5cclxuXHRcdFx0XHRcdC8vIFVzZSB0aGUgb2xkVmFsdWUgcGFyYW1ldGVyIHRvIGRldGVybWluZSB3aGljaCB0YWcgdG8gcmVtb3ZlXHJcblx0XHRcdFx0XHRsZXQgY3VycmVudFRhZ3MgPSB1cGRhdGVkVGFzay5tZXRhZGF0YS50YWdzIHx8IFtdO1xyXG5cclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiVGFncyB1cGRhdGUgLSBjdXJyZW50IHRhZ3M6XCIsIGN1cnJlbnRUYWdzKTtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiVGFncyB1cGRhdGUgLSBvbGRWYWx1ZTpcIiwgb2xkVmFsdWUpO1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXCJUYWdzIHVwZGF0ZSAtIG5ld1ZhbHVlOlwiLCBuZXdWYWx1ZSk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gUmVtb3ZlIHRoZSBvbGQgdGFnIGlmIGl0IGV4aXN0cyBhbmQgaXMgZGlmZmVyZW50IGZyb20gdGhlIG5ldyB2YWx1ZVxyXG5cdFx0XHRcdFx0aWYgKG9sZFZhbHVlICYmIG9sZFZhbHVlICE9PSBcIlwiICYmIG9sZFZhbHVlICE9PSBuZXdWYWx1ZSkge1xyXG5cdFx0XHRcdFx0XHQvLyBUcnkgdG8gbWF0Y2ggdGhlIG9sZFZhbHVlIHdpdGggZXhpc3RpbmcgdGFnc1xyXG5cdFx0XHRcdFx0XHQvLyBIYW5kbGUgYm90aCB3aXRoIGFuZCB3aXRob3V0ICMgcHJlZml4XHJcblx0XHRcdFx0XHRcdGNvbnN0IG9sZFRhZ1ZhcmlhbnRzID0gW1xyXG5cdFx0XHRcdFx0XHRcdG9sZFZhbHVlLFxyXG5cdFx0XHRcdFx0XHRcdGAjJHtvbGRWYWx1ZX1gLFxyXG5cdFx0XHRcdFx0XHRcdG9sZFZhbHVlLnN0YXJ0c1dpdGgoXCIjXCIpXHJcblx0XHRcdFx0XHRcdFx0XHQ/IG9sZFZhbHVlLnN1YnN0cmluZygxKVxyXG5cdFx0XHRcdFx0XHRcdFx0OiBvbGRWYWx1ZSxcclxuXHRcdFx0XHRcdFx0XTtcclxuXHJcblx0XHRcdFx0XHRcdGN1cnJlbnRUYWdzID0gY3VycmVudFRhZ3MuZmlsdGVyKFxyXG5cdFx0XHRcdFx0XHRcdCh0YWcpID0+ICFvbGRUYWdWYXJpYW50cy5pbmNsdWRlcyh0YWcpXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiVGFncyBhZnRlciByZW1vdmluZyBvbGQ6XCIsIGN1cnJlbnRUYWdzKTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBBZGQgdGhlIG5ldyB0YWcgaWYgaXQncyBub3QgYWxyZWFkeSBwcmVzZW50XHJcblx0XHRcdFx0XHQvLyBIYW5kbGUgYm90aCB3aXRoIGFuZCB3aXRob3V0ICMgcHJlZml4XHJcblx0XHRcdFx0XHRjb25zdCBuZXdUYWdWYXJpYW50cyA9IFtcclxuXHRcdFx0XHRcdFx0bmV3VmFsdWUsXHJcblx0XHRcdFx0XHRcdGAjJHtuZXdWYWx1ZX1gLFxyXG5cdFx0XHRcdFx0XHRuZXdWYWx1ZS5zdGFydHNXaXRoKFwiI1wiKVxyXG5cdFx0XHRcdFx0XHRcdD8gbmV3VmFsdWUuc3Vic3RyaW5nKDEpXHJcblx0XHRcdFx0XHRcdFx0OiBuZXdWYWx1ZSxcclxuXHRcdFx0XHRcdF07XHJcblxyXG5cdFx0XHRcdFx0Y29uc3QgaGFzTmV3VGFnID0gY3VycmVudFRhZ3Muc29tZSgodGFnKSA9PlxyXG5cdFx0XHRcdFx0XHRuZXdUYWdWYXJpYW50cy5pbmNsdWRlcyh0YWcpXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0aWYgKCFoYXNOZXdUYWcpIHtcclxuXHRcdFx0XHRcdFx0Ly8gQWRkIHRoZSB0YWcgaW4gdGhlIHNhbWUgZm9ybWF0IGFzIGV4aXN0aW5nIHRhZ3MsIG9yIHdpdGhvdXQgIyBpZiBubyBleGlzdGluZyB0YWdzXHJcblx0XHRcdFx0XHRcdGNvbnN0IHRhZ1RvQWRkID1cclxuXHRcdFx0XHRcdFx0XHRjdXJyZW50VGFncy5sZW5ndGggPiAwICYmXHJcblx0XHRcdFx0XHRcdFx0Y3VycmVudFRhZ3NbMF0uc3RhcnRzV2l0aChcIiNcIilcclxuXHRcdFx0XHRcdFx0XHRcdD8gbmV3VmFsdWUuc3RhcnRzV2l0aChcIiNcIilcclxuXHRcdFx0XHRcdFx0XHRcdFx0PyBuZXdWYWx1ZVxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ6IGAjJHtuZXdWYWx1ZX1gXHJcblx0XHRcdFx0XHRcdFx0XHQ6IG5ld1ZhbHVlLnN0YXJ0c1dpdGgoXCIjXCIpXHJcblx0XHRcdFx0XHRcdFx0XHRcdD8gbmV3VmFsdWUuc3Vic3RyaW5nKDEpXHJcblx0XHRcdFx0XHRcdFx0XHRcdDogbmV3VmFsdWU7XHJcblx0XHRcdFx0XHRcdGN1cnJlbnRUYWdzLnB1c2godGFnVG9BZGQpO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiVGFncyBhZnRlciBhZGRpbmcgbmV3OlwiLCBjdXJyZW50VGFncyk7XHJcblx0XHRcdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YS50YWdzID0gY3VycmVudFRhZ3M7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwicHJvamVjdFwiOlxyXG5cdFx0XHRcdC8vIE9ubHkgdXBkYXRlIHByb2plY3QgaWYgaXQncyBub3QgYSByZWFkLW9ubHkgdGdQcm9qZWN0XHJcblx0XHRcdFx0aWYgKCFpc1Byb2plY3RSZWFkb25seSh0YXNrVG9VcGRhdGUpKSB7XHJcblx0XHRcdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YS5wcm9qZWN0ID1cclxuXHRcdFx0XHRcdFx0bmV3VmFsdWUgPT09IG51bGwgfHwgbmV3VmFsdWUgPT09IFwiXCJcclxuXHRcdFx0XHRcdFx0XHQ/IHVuZGVmaW5lZFxyXG5cdFx0XHRcdFx0XHRcdDogbmV3VmFsdWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwiY29udGV4dFwiOlxyXG5cdFx0XHRcdHVwZGF0ZWRUYXNrLm1ldGFkYXRhLmNvbnRleHQgPVxyXG5cdFx0XHRcdFx0bmV3VmFsdWUgPT09IG51bGwgfHwgbmV3VmFsdWUgPT09IFwiXCIgPyB1bmRlZmluZWQgOiBuZXdWYWx1ZTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBcImR1ZURhdGVcIjpcclxuXHRcdFx0Y2FzZSBcInNjaGVkdWxlZERhdGVcIjpcclxuXHRcdFx0Y2FzZSBcInN0YXJ0RGF0ZVwiOlxyXG5cdFx0XHRcdC8vIEZvciBkYXRlIGZpZWxkcywgd2UgbmVlZCB0byBjb252ZXJ0IHRoZSBjYXRlZ29yeSBiYWNrIHRvIGFuIGFjdHVhbCBkYXRlXHJcblx0XHRcdFx0Y29uc3QgZGF0ZVZhbHVlID0gdGhpcy5jb252ZXJ0RGF0ZUNhdGVnb3J5VG9UaW1lc3RhbXAobmV3VmFsdWUpO1xyXG5cdFx0XHRcdGlmIChncm91cEJ5ID09PSBcImR1ZURhdGVcIikge1xyXG5cdFx0XHRcdFx0dXBkYXRlZFRhc2subWV0YWRhdGEuZHVlRGF0ZSA9IGRhdGVWYWx1ZTtcclxuXHRcdFx0XHR9IGVsc2UgaWYgKGdyb3VwQnkgPT09IFwic2NoZWR1bGVkRGF0ZVwiKSB7XHJcblx0XHRcdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YS5zY2hlZHVsZWREYXRlID0gZGF0ZVZhbHVlO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAoZ3JvdXBCeSA9PT0gXCJzdGFydERhdGVcIikge1xyXG5cdFx0XHRcdFx0dXBkYXRlZFRhc2subWV0YWRhdGEuc3RhcnREYXRlID0gZGF0ZVZhbHVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRgVW5zdXBwb3J0ZWQgcHJvcGVydHkgdHlwZSBmb3IgdXBkYXRlOiAke2dyb3VwQnl9YFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFVwZGF0ZSB0aGUgdGFzayB1c2luZyBXcml0ZUFQSVxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0YFVwZGF0aW5nIHRhc2sgJHt0YXNrSWR9ICR7Z3JvdXBCeX0gZnJvbTpgLFxyXG5cdFx0XHRcdG9sZFZhbHVlLFxyXG5cdFx0XHRcdFwidG86XCIsXHJcblx0XHRcdFx0bmV3VmFsdWVcclxuXHRcdFx0KTtcclxuXHRcdFx0aWYgKHRoaXMucGx1Z2luLndyaXRlQVBJKSB7XHJcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5wbHVnaW4ud3JpdGVBUEkudXBkYXRlVGFzayh7XHJcblx0XHRcdFx0XHR0YXNrSWQsXHJcblx0XHRcdFx0XHR1cGRhdGVzOiB1cGRhdGVkVGFzayxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmVycm9yKFxyXG5cdFx0XHRcdFx0XHRgRmFpbGVkIHRvIHVwZGF0ZSB0YXNrICR7dGFza0lkfSBwcm9wZXJ0eSAke2dyb3VwQnl9OmAsXHJcblx0XHRcdFx0XHRcdHJlc3VsdC5lcnJvclxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcihcIldyaXRlQVBJIG5vdCBhdmFpbGFibGVcIik7XHJcblx0XHRcdH1cclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXHJcblx0XHRcdFx0YEZhaWxlZCB0byB1cGRhdGUgdGFzayAke3Rhc2tJZH0gcHJvcGVydHkgJHtncm91cEJ5fTpgLFxyXG5cdFx0XHRcdGVycm9yXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldFRhc2tzRm9yUHJvcGVydHkoZ3JvdXBCeTogc3RyaW5nLCB2YWx1ZTogYW55KTogVGFza1tdIHtcclxuXHRcdC8vIEZpbHRlciB0YXNrcyBiYXNlZCBvbiB0aGUgZ3JvdXBCeSBwcm9wZXJ0eSBhbmQgdmFsdWVcclxuXHRcdGNvbnN0IHRhc2tzRm9yUHJvcGVydHkgPSB0aGlzLnRhc2tzLmZpbHRlcigodGFzaykgPT4ge1xyXG5cdFx0XHRjb25zdCBtZXRhZGF0YSA9IHRhc2subWV0YWRhdGEgfHwge307XHJcblx0XHRcdHN3aXRjaCAoZ3JvdXBCeSkge1xyXG5cdFx0XHRcdGNhc2UgXCJwcmlvcml0eVwiOlxyXG5cdFx0XHRcdFx0aWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSBcIlwiKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybiAhbWV0YWRhdGEucHJpb3JpdHk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRyZXR1cm4gbWV0YWRhdGEucHJpb3JpdHkgPT09IHZhbHVlO1xyXG5cdFx0XHRcdGNhc2UgXCJ0YWdzXCI6XHJcblx0XHRcdFx0XHRpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IFwiXCIpIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuICFtZXRhZGF0YS50YWdzIHx8IG1ldGFkYXRhLnRhZ3MubGVuZ3RoID09PSAwO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0cmV0dXJuIChcclxuXHRcdFx0XHRcdFx0bWV0YWRhdGEudGFncyAmJlxyXG5cdFx0XHRcdFx0XHRtZXRhZGF0YS50YWdzLnNvbWUoXHJcblx0XHRcdFx0XHRcdFx0KHRhZykgPT4gdHlwZW9mIHRhZyA9PT0gXCJzdHJpbmdcIiAmJiB0YWcgPT09IHZhbHVlXHJcblx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0Y2FzZSBcInByb2plY3RcIjpcclxuXHRcdFx0XHRcdGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gIWdldEVmZmVjdGl2ZVByb2plY3QodGFzayk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRyZXR1cm4gZ2V0RWZmZWN0aXZlUHJvamVjdCh0YXNrKSA9PT0gdmFsdWU7XHJcblx0XHRcdFx0Y2FzZSBcImNvbnRleHRcIjpcclxuXHRcdFx0XHRcdGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gIW1ldGFkYXRhLmNvbnRleHQ7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRyZXR1cm4gbWV0YWRhdGEuY29udGV4dCA9PT0gdmFsdWU7XHJcblx0XHRcdFx0Y2FzZSBcImR1ZURhdGVcIjpcclxuXHRcdFx0XHRjYXNlIFwic2NoZWR1bGVkRGF0ZVwiOlxyXG5cdFx0XHRcdGNhc2UgXCJzdGFydERhdGVcIjpcclxuXHRcdFx0XHRcdHJldHVybiB0aGlzLm1hdGNoZXNEYXRlQ2F0ZWdvcnkodGFzaywgZ3JvdXBCeSwgdmFsdWUpO1xyXG5cdFx0XHRcdGNhc2UgXCJmaWxlUGF0aFwiOlxyXG5cdFx0XHRcdFx0cmV0dXJuIHRhc2suZmlsZVBhdGggPT09IHZhbHVlO1xyXG5cdFx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gU29ydCB0YXNrcyB3aXRoaW4gdGhlIHByb3BlcnR5IGNvbHVtbiBiYXNlZCBvbiBzZWxlY3RlZCBzb3J0IG9wdGlvblxyXG5cdFx0dGFza3NGb3JQcm9wZXJ0eS5zb3J0KChhLCBiKSA9PiB7XHJcblx0XHRcdHJldHVybiB0aGlzLmNvbXBhcmVUYXNrcyhhLCBiLCB0aGlzLnNvcnRPcHRpb24pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIHRhc2tzRm9yUHJvcGVydHk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIG1hdGNoZXNEYXRlQ2F0ZWdvcnkoXHJcblx0XHR0YXNrOiBUYXNrLFxyXG5cdFx0ZGF0ZUZpZWxkOiBzdHJpbmcsXHJcblx0XHRjYXRlZ29yeTogc3RyaW5nXHJcblx0KTogYm9vbGVhbiB7XHJcblx0XHRjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xyXG5cdFx0Y29uc3QgdG9kYXkgPSBuZXcgRGF0ZShcclxuXHRcdFx0bm93LmdldEZ1bGxZZWFyKCksXHJcblx0XHRcdG5vdy5nZXRNb250aCgpLFxyXG5cdFx0XHRub3cuZ2V0RGF0ZSgpXHJcblx0XHQpO1xyXG5cdFx0Y29uc3QgdG9tb3Jyb3cgPSBuZXcgRGF0ZSh0b2RheS5nZXRUaW1lKCkgKyAyNCAqIDYwICogNjAgKiAxMDAwKTtcclxuXHRcdGNvbnN0IHdlZWtGcm9tTm93ID0gbmV3IERhdGUodG9kYXkuZ2V0VGltZSgpICsgNyAqIDI0ICogNjAgKiA2MCAqIDEwMDApO1xyXG5cdFx0Y29uc3QgdHdvV2Vla3NGcm9tTm93ID0gbmV3IERhdGUoXHJcblx0XHRcdHRvZGF5LmdldFRpbWUoKSArIDE0ICogMjQgKiA2MCAqIDYwICogMTAwMFxyXG5cdFx0KTtcclxuXHJcblx0XHRjb25zdCBtZXRhZGF0YSA9IHRhc2subWV0YWRhdGEgfHwge307XHJcblx0XHRsZXQgdGFza0RhdGU6IG51bWJlciB8IHVuZGVmaW5lZDtcclxuXHRcdHN3aXRjaCAoZGF0ZUZpZWxkKSB7XHJcblx0XHRcdGNhc2UgXCJkdWVEYXRlXCI6XHJcblx0XHRcdFx0dGFza0RhdGUgPSBtZXRhZGF0YS5kdWVEYXRlO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwic2NoZWR1bGVkRGF0ZVwiOlxyXG5cdFx0XHRcdHRhc2tEYXRlID0gbWV0YWRhdGEuc2NoZWR1bGVkRGF0ZTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBcInN0YXJ0RGF0ZVwiOlxyXG5cdFx0XHRcdHRhc2tEYXRlID0gbWV0YWRhdGEuc3RhcnREYXRlO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICghdGFza0RhdGUpIHtcclxuXHRcdFx0cmV0dXJuIGNhdGVnb3J5ID09PSBcIm5vbmVcIiB8fCBjYXRlZ29yeSA9PT0gbnVsbCB8fCBjYXRlZ29yeSA9PT0gXCJcIjtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCB0YXNrRGF0ZU9iaiA9IG5ldyBEYXRlKHRhc2tEYXRlKTtcclxuXHJcblx0XHRzd2l0Y2ggKGNhdGVnb3J5KSB7XHJcblx0XHRcdGNhc2UgXCJvdmVyZHVlXCI6XHJcblx0XHRcdFx0cmV0dXJuIHRhc2tEYXRlT2JqIDwgdG9kYXk7XHJcblx0XHRcdGNhc2UgXCJ0b2RheVwiOlxyXG5cdFx0XHRcdHJldHVybiB0YXNrRGF0ZU9iaiA+PSB0b2RheSAmJiB0YXNrRGF0ZU9iaiA8IHRvbW9ycm93O1xyXG5cdFx0XHRjYXNlIFwidG9tb3Jyb3dcIjpcclxuXHRcdFx0XHRyZXR1cm4gKFxyXG5cdFx0XHRcdFx0dGFza0RhdGVPYmogPj0gdG9tb3Jyb3cgJiZcclxuXHRcdFx0XHRcdHRhc2tEYXRlT2JqIDxcclxuXHRcdFx0XHRcdG5ldyBEYXRlKHRvbW9ycm93LmdldFRpbWUoKSArIDI0ICogNjAgKiA2MCAqIDEwMDApXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0Y2FzZSBcInRoaXNXZWVrXCI6XHJcblx0XHRcdFx0cmV0dXJuIHRhc2tEYXRlT2JqID49IHRvbW9ycm93ICYmIHRhc2tEYXRlT2JqIDwgd2Vla0Zyb21Ob3c7XHJcblx0XHRcdGNhc2UgXCJuZXh0V2Vla1wiOlxyXG5cdFx0XHRcdHJldHVybiAoXHJcblx0XHRcdFx0XHR0YXNrRGF0ZU9iaiA+PSB3ZWVrRnJvbU5vdyAmJiB0YXNrRGF0ZU9iaiA8IHR3b1dlZWtzRnJvbU5vd1xyXG5cdFx0XHRcdCk7XHJcblx0XHRcdGNhc2UgXCJsYXRlclwiOlxyXG5cdFx0XHRcdHJldHVybiB0YXNrRGF0ZU9iaiA+PSB0d29XZWVrc0Zyb21Ob3c7XHJcblx0XHRcdGNhc2UgXCJub25lXCI6XHJcblx0XHRcdGNhc2UgbnVsbDpcclxuXHRcdFx0Y2FzZSBcIlwiOlxyXG5cdFx0XHRcdHJldHVybiBmYWxzZTsgLy8gQWxyZWFkeSBoYW5kbGVkIGFib3ZlXHJcblx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBnZXRDb2x1bW5WYWx1ZUZyb21UaXRsZShcclxuXHRcdHRpdGxlOiBzdHJpbmcsXHJcblx0XHRncm91cEJ5OiBzdHJpbmcsXHJcblx0XHRjdXN0b21Db2x1bW5zPzogS2FuYmFuQ29sdW1uQ29uZmlnW11cclxuXHQpOiBhbnkge1xyXG5cdFx0Y29uc29sZS5sb2coXCJjdXN0b21Db2x1bW5zXCIsIGN1c3RvbUNvbHVtbnMpO1xyXG5cdFx0aWYgKGN1c3RvbUNvbHVtbnMgJiYgY3VzdG9tQ29sdW1ucy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdGNvbnN0IGNvbHVtbiA9IGN1c3RvbUNvbHVtbnMuZmluZCgoY29sKSA9PiBjb2wudGl0bGUgPT09IHRpdGxlKTtcclxuXHRcdFx0cmV0dXJuIGNvbHVtbiA/IGNvbHVtbi52YWx1ZSA6IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSGFuZGxlIGRlZmF1bHQgY29sdW1ucyBiYXNlZCBvbiBncm91cEJ5IHR5cGVcclxuXHRcdHN3aXRjaCAoZ3JvdXBCeSkge1xyXG5cdFx0XHRjYXNlIFwicHJpb3JpdHlcIjpcclxuXHRcdFx0XHRpZiAodGl0bGUuaW5jbHVkZXMoXCJIaWdoZXN0XCIpKSByZXR1cm4gNTtcclxuXHRcdFx0XHRpZiAodGl0bGUuaW5jbHVkZXMoXCJIaWdoXCIpKSByZXR1cm4gNDtcclxuXHRcdFx0XHRpZiAodGl0bGUuaW5jbHVkZXMoXCJNZWRpdW1cIikpIHJldHVybiAzO1xyXG5cdFx0XHRcdGlmICh0aXRsZS5pbmNsdWRlcyhcIkxvd1wiKSkgcmV0dXJuIDI7XHJcblx0XHRcdFx0aWYgKHRpdGxlLmluY2x1ZGVzKFwiTG93ZXN0XCIpKSByZXR1cm4gMTtcclxuXHRcdFx0XHRpZiAodGl0bGUuaW5jbHVkZXMoXCJObyBQcmlvcml0eVwiKSkgcmV0dXJuIG51bGw7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgXCJ0YWdzXCI6XHJcblx0XHRcdFx0aWYgKHRpdGxlID09PSBcIk5vIFRhZ3NcIikgcmV0dXJuIFwiXCI7XHJcblx0XHRcdFx0cmV0dXJuIHRpdGxlLnN0YXJ0c1dpdGgoXCIjXCIpXHJcblx0XHRcdFx0XHQ/IHRpdGxlLnRyaW0oKS5zdWJzdHJpbmcoMSlcclxuXHRcdFx0XHRcdDogdGl0bGU7XHJcblx0XHRcdGNhc2UgXCJwcm9qZWN0XCI6XHJcblx0XHRcdFx0aWYgKHRpdGxlID09PSBcIk5vIFByb2plY3RcIikgcmV0dXJuIFwiXCI7XHJcblx0XHRcdFx0cmV0dXJuIHRpdGxlO1xyXG5cdFx0XHRjYXNlIFwiY29udGV4dFwiOlxyXG5cdFx0XHRcdGlmICh0aXRsZSA9PT0gXCJObyBDb250ZXh0XCIpIHJldHVybiBcIlwiO1xyXG5cdFx0XHRcdHJldHVybiB0aXRsZS5zdGFydHNXaXRoKFwiQFwiKSA/IHRpdGxlLnN1YnN0cmluZygxKSA6IHRpdGxlO1xyXG5cdFx0XHRjYXNlIFwiZHVlRGF0ZVwiOlxyXG5cdFx0XHRjYXNlIFwic2NoZWR1bGVkRGF0ZVwiOlxyXG5cdFx0XHRjYXNlIFwic3RhcnREYXRlXCI6XHJcblx0XHRcdFx0aWYgKHRpdGxlID09PSBcIk92ZXJkdWVcIikgcmV0dXJuIFwib3ZlcmR1ZVwiO1xyXG5cdFx0XHRcdGlmICh0aXRsZSA9PT0gXCJUb2RheVwiKSByZXR1cm4gXCJ0b2RheVwiO1xyXG5cdFx0XHRcdGlmICh0aXRsZSA9PT0gXCJUb21vcnJvd1wiKSByZXR1cm4gXCJ0b21vcnJvd1wiO1xyXG5cdFx0XHRcdGlmICh0aXRsZSA9PT0gXCJUaGlzIFdlZWtcIikgcmV0dXJuIFwidGhpc1dlZWtcIjtcclxuXHRcdFx0XHRpZiAodGl0bGUgPT09IFwiTmV4dCBXZWVrXCIpIHJldHVybiBcIm5leHRXZWVrXCI7XHJcblx0XHRcdFx0aWYgKHRpdGxlID09PSBcIkxhdGVyXCIpIHJldHVybiBcImxhdGVyXCI7XHJcblx0XHRcdFx0aWYgKHRpdGxlID09PSBcIk5vIERhdGVcIikgcmV0dXJuIG51bGw7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgXCJmaWxlUGF0aFwiOlxyXG5cdFx0XHRcdHJldHVybiB0aXRsZTsgLy8gRm9yIGZpbGUgcGF0aHMsIHRoZSB0aXRsZSBpcyB0aGUgdmFsdWVcclxuXHRcdH1cclxuXHRcdHJldHVybiB0aXRsZTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY29udmVydERhdGVDYXRlZ29yeVRvVGltZXN0YW1wKFxyXG5cdFx0Y2F0ZWdvcnk6IHN0cmluZ1xyXG5cdCk6IG51bWJlciB8IHVuZGVmaW5lZCB7XHJcblx0XHRpZiAoY2F0ZWdvcnkgPT09IG51bGwgfHwgY2F0ZWdvcnkgPT09IFwiXCIgfHwgY2F0ZWdvcnkgPT09IFwibm9uZVwiKSB7XHJcblx0XHRcdHJldHVybiB1bmRlZmluZWQ7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3Qgbm93ID0gbmV3IERhdGUoKTtcclxuXHRcdGNvbnN0IHRvZGF5ID0gbmV3IERhdGUoXHJcblx0XHRcdG5vdy5nZXRGdWxsWWVhcigpLFxyXG5cdFx0XHRub3cuZ2V0TW9udGgoKSxcclxuXHRcdFx0bm93LmdldERhdGUoKVxyXG5cdFx0KTtcclxuXHJcblx0XHRzd2l0Y2ggKGNhdGVnb3J5KSB7XHJcblx0XHRcdGNhc2UgXCJvdmVyZHVlXCI6XHJcblx0XHRcdFx0Ly8gRm9yIG92ZXJkdWUsIHdlIGNhbid0IGRldGVybWluZSBhIHNwZWNpZmljIGRhdGUsIHNvIHJldHVybiB1bmRlZmluZWRcclxuXHRcdFx0XHQvLyBUaGUgdXNlciBzaG91bGQgbWFudWFsbHkgc2V0IGEgc3BlY2lmaWMgZGF0ZVxyXG5cdFx0XHRcdHJldHVybiB1bmRlZmluZWQ7XHJcblx0XHRcdGNhc2UgXCJ0b2RheVwiOlxyXG5cdFx0XHRcdHJldHVybiB0b2RheS5nZXRUaW1lKCk7XHJcblx0XHRcdGNhc2UgXCJ0b21vcnJvd1wiOlxyXG5cdFx0XHRcdHJldHVybiBuZXcgRGF0ZShcclxuXHRcdFx0XHRcdHRvZGF5LmdldFRpbWUoKSArIDI0ICogNjAgKiA2MCAqIDEwMDBcclxuXHRcdFx0XHQpLmdldFRpbWUoKTtcclxuXHRcdFx0Y2FzZSBcInRoaXNXZWVrXCI6XHJcblx0XHRcdFx0Ly8gU2V0IHRvIGVuZCBvZiB0aGlzIHdlZWsgKFN1bmRheSlcclxuXHRcdFx0XHRjb25zdCBkYXlzVW50aWxTdW5kYXkgPSA3IC0gdG9kYXkuZ2V0RGF5KCk7XHJcblx0XHRcdFx0cmV0dXJuIG5ldyBEYXRlKFxyXG5cdFx0XHRcdFx0dG9kYXkuZ2V0VGltZSgpICsgZGF5c1VudGlsU3VuZGF5ICogMjQgKiA2MCAqIDYwICogMTAwMFxyXG5cdFx0XHRcdCkuZ2V0VGltZSgpO1xyXG5cdFx0XHRjYXNlIFwibmV4dFdlZWtcIjpcclxuXHRcdFx0XHQvLyBTZXQgdG8gZW5kIG9mIG5leHQgd2Vla1xyXG5cdFx0XHRcdGNvbnN0IGRheXNVbnRpbE5leHRTdW5kYXkgPSAxNCAtIHRvZGF5LmdldERheSgpO1xyXG5cdFx0XHRcdHJldHVybiBuZXcgRGF0ZShcclxuXHRcdFx0XHRcdHRvZGF5LmdldFRpbWUoKSArIGRheXNVbnRpbE5leHRTdW5kYXkgKiAyNCAqIDYwICogNjAgKiAxMDAwXHJcblx0XHRcdFx0KS5nZXRUaW1lKCk7XHJcblx0XHRcdGNhc2UgXCJsYXRlclwiOlxyXG5cdFx0XHRcdC8vIFNldCB0byBvbmUgbW9udGggZnJvbSBub3dcclxuXHRcdFx0XHRjb25zdCBvbmVNb250aExhdGVyID0gbmV3IERhdGUodG9kYXkpO1xyXG5cdFx0XHRcdG9uZU1vbnRoTGF0ZXIuc2V0TW9udGgob25lTW9udGhMYXRlci5nZXRNb250aCgpICsgMSk7XHJcblx0XHRcdFx0cmV0dXJuIG9uZU1vbnRoTGF0ZXIuZ2V0VGltZSgpO1xyXG5cdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdHJldHVybiB1bmRlZmluZWQ7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldFRhc2tPcmlnaW5hbENvbHVtblZhbHVlKHRhc2s6IFRhc2ssIGdyb3VwQnk6IHN0cmluZyk6IGFueSB7XHJcblx0XHQvLyBEZXRlcm1pbmUgd2hpY2ggY29sdW1uIHRoZSB0YXNrIGN1cnJlbnRseSBiZWxvbmdzIHRvIGJhc2VkIG9uIGl0cyBwcm9wZXJ0aWVzXHJcblx0XHRjb25zdCBtZXRhZGF0YSA9IHRhc2subWV0YWRhdGEgfHwge307XHJcblx0XHRzd2l0Y2ggKGdyb3VwQnkpIHtcclxuXHRcdFx0Y2FzZSBcInRhZ3NcIjpcclxuXHRcdFx0XHQvLyBGb3IgdGFncywgZmluZCB3aGljaCB0YWcgY29sdW1uIHRoaXMgdGFzayB3b3VsZCBiZSBpblxyXG5cdFx0XHRcdC8vIFdlIG5lZWQgdG8gY2hlY2sgYWdhaW5zdCB0aGUgY3VycmVudCBjb2x1bW4gY29uZmlndXJhdGlvblxyXG5cdFx0XHRcdGNvbnN0IGthbmJhbkNvbmZpZyA9XHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy52aWV3Q29uZmlndXJhdGlvbi5maW5kKFxyXG5cdFx0XHRcdFx0XHQodikgPT4gdi5pZCA9PT0gdGhpcy5jdXJyZW50Vmlld0lkXHJcblx0XHRcdFx0XHQpPy5zcGVjaWZpY0NvbmZpZyBhcyBLYW5iYW5TcGVjaWZpY0NvbmZpZztcclxuXHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0a2FuYmFuQ29uZmlnPy5jdXN0b21Db2x1bW5zICYmXHJcblx0XHRcdFx0XHRrYW5iYW5Db25maWcuY3VzdG9tQ29sdW1ucy5sZW5ndGggPiAwXHJcblx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHQvLyBDaGVjayBjdXN0b20gY29sdW1uc1xyXG5cdFx0XHRcdFx0Zm9yIChjb25zdCBjb2x1bW4gb2Yga2FuYmFuQ29uZmlnLmN1c3RvbUNvbHVtbnMpIHtcclxuXHRcdFx0XHRcdFx0aWYgKGNvbHVtbi52YWx1ZSA9PT0gXCJcIiB8fCBjb2x1bW4udmFsdWUgPT09IG51bGwpIHtcclxuXHRcdFx0XHRcdFx0XHQvLyBcIk5vIFRhZ3NcIiBjb2x1bW5cclxuXHRcdFx0XHRcdFx0XHRpZiAoIW1ldGFkYXRhLnRhZ3MgfHwgbWV0YWRhdGEudGFncy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0XHRcdFx0XHRcdHJldHVybiBcIlwiO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHQvLyBTcGVjaWZpYyB0YWcgY29sdW1uXHJcblx0XHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdFx0bWV0YWRhdGEudGFncyAmJlxyXG5cdFx0XHRcdFx0XHRcdFx0bWV0YWRhdGEudGFncy5zb21lKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHQodGFnKSA9PlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHR5cGVvZiB0YWcgPT09IFwic3RyaW5nXCIgJiZcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0YWcgPT09IGNvbHVtbi52YWx1ZVxyXG5cdFx0XHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIGNvbHVtbi52YWx1ZTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0Ly8gVXNlIGRlZmF1bHQgY29sdW1ucyAtIGZpbmQgdGhlIGZpcnN0IHRhZyB0aGF0IG1hdGNoZXMgZXhpc3RpbmcgY29sdW1uc1xyXG5cdFx0XHRcdFx0aWYgKCFtZXRhZGF0YS50YWdzIHx8IG1ldGFkYXRhLnRhZ3MubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybiBcIlwiO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0Ly8gUmV0dXJuIHRoZSBmaXJzdCBzdHJpbmcgdGFnIChmb3Igc2ltcGxpY2l0eSwgYXMgd2UgbmVlZCB0byBkZXRlcm1pbmUgd2hpY2ggY29sdW1uIGl0IGNhbWUgZnJvbSlcclxuXHRcdFx0XHRcdGNvbnN0IGZpcnN0U3RyaW5nVGFnID0gbWV0YWRhdGEudGFncy5maW5kKFxyXG5cdFx0XHRcdFx0XHQodGFnKSA9PiB0eXBlb2YgdGFnID09PSBcInN0cmluZ1wiXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0cmV0dXJuIGZpcnN0U3RyaW5nVGFnIHx8IFwiXCI7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHJldHVybiBcIlwiO1xyXG5cdFx0XHRjYXNlIFwicHJvamVjdFwiOlxyXG5cdFx0XHRcdHJldHVybiBnZXRFZmZlY3RpdmVQcm9qZWN0KHRhc2spIHx8IFwiXCI7XHJcblx0XHRcdGNhc2UgXCJjb250ZXh0XCI6XHJcblx0XHRcdFx0cmV0dXJuIG1ldGFkYXRhLmNvbnRleHQgfHwgXCJcIjtcclxuXHRcdFx0Y2FzZSBcInByaW9yaXR5XCI6XHJcblx0XHRcdFx0cmV0dXJuIG1ldGFkYXRhLnByaW9yaXR5IHx8IG51bGw7XHJcblx0XHRcdGNhc2UgXCJkdWVEYXRlXCI6XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuZ2V0RGF0ZUNhdGVnb3J5KG1ldGFkYXRhLmR1ZURhdGUpO1xyXG5cdFx0XHRjYXNlIFwic2NoZWR1bGVkRGF0ZVwiOlxyXG5cdFx0XHRcdHJldHVybiB0aGlzLmdldERhdGVDYXRlZ29yeShtZXRhZGF0YS5zY2hlZHVsZWREYXRlKTtcclxuXHRcdFx0Y2FzZSBcInN0YXJ0RGF0ZVwiOlxyXG5cdFx0XHRcdHJldHVybiB0aGlzLmdldERhdGVDYXRlZ29yeShtZXRhZGF0YS5zdGFydERhdGUpO1xyXG5cdFx0XHRjYXNlIFwiZmlsZVBhdGhcIjpcclxuXHRcdFx0XHRyZXR1cm4gdGFzay5maWxlUGF0aDtcclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZ2V0RGF0ZUNhdGVnb3J5KHRpbWVzdGFtcDogbnVtYmVyIHwgdW5kZWZpbmVkKTogc3RyaW5nIHtcclxuXHRcdGlmICghdGltZXN0YW1wKSB7XHJcblx0XHRcdHJldHVybiBcIm5vbmVcIjtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xyXG5cdFx0Y29uc3QgdG9kYXkgPSBuZXcgRGF0ZShcclxuXHRcdFx0bm93LmdldEZ1bGxZZWFyKCksXHJcblx0XHRcdG5vdy5nZXRNb250aCgpLFxyXG5cdFx0XHRub3cuZ2V0RGF0ZSgpXHJcblx0XHQpO1xyXG5cdFx0Y29uc3QgdG9tb3Jyb3cgPSBuZXcgRGF0ZSh0b2RheS5nZXRUaW1lKCkgKyAyNCAqIDYwICogNjAgKiAxMDAwKTtcclxuXHRcdGNvbnN0IHdlZWtGcm9tTm93ID0gbmV3IERhdGUodG9kYXkuZ2V0VGltZSgpICsgNyAqIDI0ICogNjAgKiA2MCAqIDEwMDApO1xyXG5cdFx0Y29uc3QgdHdvV2Vla3NGcm9tTm93ID0gbmV3IERhdGUoXHJcblx0XHRcdHRvZGF5LmdldFRpbWUoKSArIDE0ICogMjQgKiA2MCAqIDYwICogMTAwMFxyXG5cdFx0KTtcclxuXHJcblx0XHRjb25zdCB0YXNrRGF0ZSA9IG5ldyBEYXRlKHRpbWVzdGFtcCk7XHJcblxyXG5cdFx0aWYgKHRhc2tEYXRlIDwgdG9kYXkpIHtcclxuXHRcdFx0cmV0dXJuIFwib3ZlcmR1ZVwiO1xyXG5cdFx0fSBlbHNlIGlmICh0YXNrRGF0ZSA+PSB0b2RheSAmJiB0YXNrRGF0ZSA8IHRvbW9ycm93KSB7XHJcblx0XHRcdHJldHVybiBcInRvZGF5XCI7XHJcblx0XHR9IGVsc2UgaWYgKFxyXG5cdFx0XHR0YXNrRGF0ZSA+PSB0b21vcnJvdyAmJlxyXG5cdFx0XHR0YXNrRGF0ZSA8IG5ldyBEYXRlKHRvbW9ycm93LmdldFRpbWUoKSArIDI0ICogNjAgKiA2MCAqIDEwMDApXHJcblx0XHQpIHtcclxuXHRcdFx0cmV0dXJuIFwidG9tb3Jyb3dcIjtcclxuXHRcdH0gZWxzZSBpZiAodGFza0RhdGUgPj0gdG9tb3Jyb3cgJiYgdGFza0RhdGUgPCB3ZWVrRnJvbU5vdykge1xyXG5cdFx0XHRyZXR1cm4gXCJ0aGlzV2Vla1wiO1xyXG5cdFx0fSBlbHNlIGlmICh0YXNrRGF0ZSA+PSB3ZWVrRnJvbU5vdyAmJiB0YXNrRGF0ZSA8IHR3b1dlZWtzRnJvbU5vdykge1xyXG5cdFx0XHRyZXR1cm4gXCJuZXh0V2Vla1wiO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0cmV0dXJuIFwibGF0ZXJcIjtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIENvbHVtbiBvcmRlciBtYW5hZ2VtZW50IG1ldGhvZHNcclxuXHRwcml2YXRlIGdldENvbHVtbk9yZGVyS2V5KCk6IHN0cmluZyB7XHJcblx0XHRjb25zdCBrYW5iYW5Db25maWcgPSB0aGlzLmdldEVmZmVjdGl2ZUthbmJhbkNvbmZpZygpO1xyXG5cdFx0Y29uc3QgZ3JvdXBCeSA9IGthbmJhbkNvbmZpZz8uZ3JvdXBCeSB8fCBcInN0YXR1c1wiO1xyXG5cdFx0cmV0dXJuIGBrYW5iYW4tY29sdW1uLW9yZGVyLSR7dGhpcy5jdXJyZW50Vmlld0lkfS0ke2dyb3VwQnl9YDtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgbG9hZENvbHVtbk9yZGVyKCk6IHZvaWQge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3Qga2V5ID0gdGhpcy5nZXRDb2x1bW5PcmRlcktleSgpO1xyXG5cdFx0XHRjb25zdCBzYXZlZE9yZGVyID0gdGhpcy5hcHAubG9hZExvY2FsU3RvcmFnZShrZXkpO1xyXG5cdFx0XHRpZiAoc2F2ZWRPcmRlcikge1xyXG5cdFx0XHRcdHRoaXMuY29sdW1uT3JkZXIgPSBKU09OLnBhcnNlKHNhdmVkT3JkZXIpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMuY29sdW1uT3JkZXIgPSBbXTtcclxuXHRcdFx0fVxyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFwiRmFpbGVkIHRvIGxvYWQgY29sdW1uIG9yZGVyIGZyb20gbG9jYWxTdG9yYWdlOlwiLFxyXG5cdFx0XHRcdGVycm9yXHJcblx0XHRcdCk7XHJcblx0XHRcdHRoaXMuY29sdW1uT3JkZXIgPSBbXTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc2F2ZUNvbHVtbk9yZGVyKG9yZGVyOiBzdHJpbmdbXSk6IHZvaWQge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3Qga2V5ID0gdGhpcy5nZXRDb2x1bW5PcmRlcktleSgpO1xyXG5cdFx0XHR0aGlzLmFwcC5zYXZlTG9jYWxTdG9yYWdlKGtleSwgSlNPTi5zdHJpbmdpZnkob3JkZXIpKTtcclxuXHRcdFx0dGhpcy5jb2x1bW5PcmRlciA9IFsuLi5vcmRlcl07XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXCJGYWlsZWQgdG8gc2F2ZSBjb2x1bW4gb3JkZXIgdG8gbG9jYWxTdG9yYWdlOlwiLCBlcnJvcik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFwcGx5Q29sdW1uT3JkZXI8VCBleHRlbmRzIHsgdGl0bGU6IHN0cmluZzsgaWQ/OiBzdHJpbmcgfT4oXHJcblx0XHRjb2x1bW5zOiBUW11cclxuXHQpOiBUW10ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0aWYgKHRoaXMuY29sdW1uT3JkZXIubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdFx0cmV0dXJuIGNvbHVtbnM7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmICghQXJyYXkuaXNBcnJheShjb2x1bW5zKSkge1xyXG5cdFx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcdFwiSW52YWxpZCBjb2x1bW5zIGFycmF5IHByb3ZpZGVkIHRvIGFwcGx5Q29sdW1uT3JkZXJcIlxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0cmV0dXJuIFtdO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBvcmRlcmVkQ29sdW1uczogVFtdID0gW107XHJcblx0XHRcdGNvbnN0IHJlbWFpbmluZ0NvbHVtbnMgPSBbLi4uY29sdW1uc107XHJcblxyXG5cdFx0XHQvLyBGaXJzdCwgYWRkIGNvbHVtbnMgaW4gdGhlIHNhdmVkIG9yZGVyXHJcblx0XHRcdHRoaXMuY29sdW1uT3JkZXIuZm9yRWFjaCgob3JkZXJlZElkKSA9PiB7XHJcblx0XHRcdFx0aWYgKG9yZGVyZWRJZCkge1xyXG5cdFx0XHRcdFx0Y29uc3QgY29sdW1uSW5kZXggPSByZW1haW5pbmdDb2x1bW5zLmZpbmRJbmRleChcclxuXHRcdFx0XHRcdFx0KGNvbCkgPT5cclxuXHRcdFx0XHRcdFx0XHQoY29sLmlkICYmIGNvbC5pZCA9PT0gb3JkZXJlZElkKSB8fFxyXG5cdFx0XHRcdFx0XHRcdGNvbC50aXRsZSA9PT0gb3JkZXJlZElkXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0aWYgKGNvbHVtbkluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHRcdFx0XHRvcmRlcmVkQ29sdW1ucy5wdXNoKFxyXG5cdFx0XHRcdFx0XHRcdHJlbWFpbmluZ0NvbHVtbnMuc3BsaWNlKGNvbHVtbkluZGV4LCAxKVswXVxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBUaGVuLCBhZGQgYW55IHJlbWFpbmluZyBjb2x1bW5zIHRoYXQgd2VyZW4ndCBpbiB0aGUgc2F2ZWQgb3JkZXJcclxuXHRcdFx0b3JkZXJlZENvbHVtbnMucHVzaCguLi5yZW1haW5pbmdDb2x1bW5zKTtcclxuXHJcblx0XHRcdHJldHVybiBvcmRlcmVkQ29sdW1ucztcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFcnJvciBhcHBseWluZyBjb2x1bW4gb3JkZXI6XCIsIGVycm9yKTtcclxuXHRcdFx0cmV0dXJuIGNvbHVtbnM7IC8vIEZhbGxiYWNrIHRvIG9yaWdpbmFsIG9yZGVyXHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGluaXRpYWxpemVDb2x1bW5Tb3J0YWJsZSgpOiB2b2lkIHtcclxuXHRcdC8vIERlc3Ryb3kgZXhpc3RpbmcgY29sdW1uIHNvcnRhYmxlIGluc3RhbmNlIGlmIGl0IGV4aXN0c1xyXG5cdFx0aWYgKHRoaXMuY29sdW1uU29ydGFibGVJbnN0YW5jZSkge1xyXG5cdFx0XHR0aGlzLmNvbHVtblNvcnRhYmxlSW5zdGFuY2UuZGVzdHJveSgpO1xyXG5cdFx0XHR0aGlzLmNvbHVtblNvcnRhYmxlSW5zdGFuY2UgPSBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENyZWF0ZSBzb3J0YWJsZSBpbnN0YW5jZSBmb3IgY29sdW1uIGNvbnRhaW5lclxyXG5cdFx0dGhpcy5jb2x1bW5Tb3J0YWJsZUluc3RhbmNlID0gU29ydGFibGUuY3JlYXRlKHRoaXMuY29sdW1uQ29udGFpbmVyRWwsIHtcclxuXHRcdFx0Z3JvdXA6IFwia2FuYmFuLWNvbHVtbnNcIixcclxuXHRcdFx0YW5pbWF0aW9uOiAxNTAsXHJcblx0XHRcdGdob3N0Q2xhc3M6IFwidGcta2FuYmFuLWNvbHVtbi1naG9zdFwiLFxyXG5cdFx0XHRkcmFnQ2xhc3M6IFwidGcta2FuYmFuLWNvbHVtbi1kcmFnZ2luZ1wiLFxyXG5cdFx0XHRoYW5kbGU6IFwiLnRnLWthbmJhbi1jb2x1bW4taGVhZGVyXCIsIC8vIE9ubHkgYWxsb3cgZHJhZ2dpbmcgYnkgaGVhZGVyXHJcblx0XHRcdGRpcmVjdGlvbjogXCJob3Jpem9udGFsXCIsIC8vIENvbHVtbnMgYXJlIGFycmFuZ2VkIGhvcml6b250YWxseVxyXG5cdFx0XHRzd2FwVGhyZXNob2xkOiAwLjY1LCAvLyBUaHJlc2hvbGQgZm9yIHN3YXBwaW5nIGVsZW1lbnRzXHJcblx0XHRcdGZpbHRlcjogXCIudGcta2FuYmFuLWNvbHVtbi1jb250ZW50LCAudGcta2FuYmFuLWNhcmQsIC50Zy1rYW5iYW4tYWRkLWNhcmQtYnV0dG9uXCIsIC8vIFByZXZlbnQgZHJhZ2dpbmcgdGhlc2UgZWxlbWVudHNcclxuXHRcdFx0cHJldmVudE9uRmlsdGVyOiBmYWxzZSwgLy8gRG9uJ3QgcHJldmVudCBkZWZhdWx0IG9uIGZpbHRlcmVkIGVsZW1lbnRzXHJcblx0XHRcdG9uRW5kOiAoZXZlbnQpID0+IHtcclxuXHRcdFx0XHR0aGlzLmhhbmRsZUNvbHVtblNvcnRFbmQoZXZlbnQpO1xyXG5cdFx0XHR9LFxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGhhbmRsZUNvbHVtblNvcnRFbmQoZXZlbnQ6IFNvcnRhYmxlLlNvcnRhYmxlRXZlbnQpOiB2b2lkIHtcclxuXHRcdGNvbnNvbGUubG9nKFwiQ29sdW1uIHNvcnQgZW5kOlwiLCBldmVudC5vbGRJbmRleCwgZXZlbnQubmV3SW5kZXgpO1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdGlmIChldmVudC5vbGRJbmRleCA9PT0gZXZlbnQubmV3SW5kZXgpIHtcclxuXHRcdFx0XHRyZXR1cm47IC8vIE5vIGNoYW5nZSBpbiBwb3NpdGlvblxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBHZXQgdGhlIGN1cnJlbnQgY29sdW1uIG9yZGVyIGZyb20gRE9NXHJcblx0XHRcdGNvbnN0IG5ld0NvbHVtbk9yZGVyOiBzdHJpbmdbXSA9IFtdO1xyXG5cdFx0XHRjb25zdCBjb2x1bW5FbGVtZW50cyA9XHJcblx0XHRcdFx0dGhpcy5jb2x1bW5Db250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKFwiLnRnLWthbmJhbi1jb2x1bW5cIik7XHJcblxyXG5cdFx0XHRpZiAoY29sdW1uRWxlbWVudHMubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdFx0Y29uc29sZS53YXJuKFwiTm8gY29sdW1uIGVsZW1lbnRzIGZvdW5kIGR1cmluZyBjb2x1bW4gc29ydCBlbmRcIik7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb2x1bW5FbGVtZW50cy5mb3JFYWNoKChjb2x1bW5FbCkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IGNvbHVtblRpdGxlID0gKGNvbHVtbkVsIGFzIEhUTUxFbGVtZW50KS5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRcdFx0XCIudGcta2FuYmFuLWNvbHVtbi10aXRsZVwiXHJcblx0XHRcdFx0KT8udGV4dENvbnRlbnQ7XHJcblx0XHRcdFx0aWYgKGNvbHVtblRpdGxlKSB7XHJcblx0XHRcdFx0XHQvLyBVc2UgdGhlIGRhdGEtc3RhdHVzLW5hbWUgYXR0cmlidXRlIGlmIGF2YWlsYWJsZSwgb3RoZXJ3aXNlIHVzZSB0aXRsZVxyXG5cdFx0XHRcdFx0Y29uc3Qgc3RhdHVzTmFtZSA9IChjb2x1bW5FbCBhcyBIVE1MRWxlbWVudCkuZ2V0QXR0cmlidXRlKFxyXG5cdFx0XHRcdFx0XHRcImRhdGEtc3RhdHVzLW5hbWVcIlxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdGNvbnN0IGNvbHVtbklkID0gc3RhdHVzTmFtZSB8fCBjb2x1bW5UaXRsZTtcclxuXHJcblx0XHRcdFx0XHRuZXdDb2x1bW5PcmRlci5wdXNoKGNvbHVtbklkKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0aWYgKG5ld0NvbHVtbk9yZGVyLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRcdGNvbnNvbGUud2FybihcIk5vIHZhbGlkIGNvbHVtbiBvcmRlciBmb3VuZCBkdXJpbmcgc29ydCBlbmRcIik7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBTYXZlIHRoZSBuZXcgb3JkZXJcclxuXHRcdFx0dGhpcy5zYXZlQ29sdW1uT3JkZXIobmV3Q29sdW1uT3JkZXIpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIGhhbmRsaW5nIGNvbHVtbiBzb3J0IGVuZDpcIiwgZXJyb3IpO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG4iXX0=