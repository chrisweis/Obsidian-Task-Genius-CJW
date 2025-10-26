import { __awaiter } from "tslib";
import { BasesView, BooleanValue, DateValue, debounce, ListValue, Menu, NumberValue, StringValue, } from 'obsidian';
import { ContentComponent } from '@/components/features/task/view/content';
import { ForecastComponent } from '@/components/features/task/view/forecast';
import { TagsComponent } from '@/components/features/task/view/tags';
import { ProjectsComponent } from '@/components/features/task/view/projects';
import { ReviewComponent } from '@/components/features/task/view/review';
import { CalendarComponent } from '@/components/features/calendar';
import { KanbanComponent } from '@/components/features/kanban/kanban';
import { GanttComponent } from '@/components/features/gantt/gantt';
import { QuadrantComponent } from '@/components/features/quadrant/quadrant';
import { TaskPropertyTwoColumnView } from '@/components/features/task/view/TaskPropertyTwoColumnView';
import { ViewComponentManager } from '@/components/ui';
import { Habit as HabitsComponent } from '@/components/features/habit/habit';
import { createTaskCheckbox, TaskDetailsComponent } from '@/components/features/task/view/details';
import { t } from '@/translations/helper';
import { getViewSettingOrDefault, } from '@/common/setting-definition';
import { filterTasks } from '@/utils/task/task-filter-utils';
import { DEFAULT_FILE_TASK_MAPPING } from '@/managers/file-task-manager';
export const TaskBasesViewType = 'task-genius';
export class TaskBasesView extends BasesView {
    constructor(controller, scrollEl, plugin, initialViewMode) {
        super(controller);
        this.plugin = plugin;
        this.type = TaskBasesViewType;
        this.twoColumnViewComponents = new Map();
        // State management
        this.currentViewId = 'inbox';
        this.forcedViewMode = null;
        this.activeComponent = null;
        this.currentSelectedTaskId = null;
        this.isDetailsVisible = false;
        this.currentFilterState = null;
        this.liveFilterState = null;
        // Data
        this.tasks = [];
        // Property mappings for Bases integration
        this.taskContentProp = null;
        this.taskStatusProp = null;
        this.taskPriorityProp = null;
        this.taskProjectProp = null;
        this.taskTagsProp = null;
        this.taskDueDateProp = null;
        this.taskStartDateProp = null;
        this.taskCompletedDateProp = null;
        this.taskContextProp = null;
        // View-specific configurations loaded from Bases config
        this.viewConfig = {};
        /**
         * Handle Kanban task status update
         */
        this.handleKanbanTaskStatusUpdate = (taskId, newStatusMark) => __awaiter(this, void 0, void 0, function* () {
            const taskToUpdate = this.tasks.find((t) => t.id === taskId);
            if (taskToUpdate) {
                const isCompleted = newStatusMark.toLowerCase() ===
                    (this.plugin.settings.taskStatuses.completed || 'x')
                        .split('|')[0]
                        .toLowerCase();
                const completedDate = isCompleted ? Date.now() : undefined;
                if (taskToUpdate.status !== newStatusMark ||
                    taskToUpdate.completed !== isCompleted) {
                    const updatedTaskData = Object.assign(Object.assign({}, taskToUpdate), { status: newStatusMark, completed: isCompleted });
                    if (updatedTaskData.metadata) {
                        updatedTaskData.metadata.completedDate = completedDate;
                    }
                    yield this.updateTask(taskToUpdate, updatedTaskData);
                }
            }
        });
        if (initialViewMode) {
            this.currentViewId = initialViewMode;
        }
        this.scrollEl = scrollEl;
        this.containerEl = scrollEl.createDiv({
            cls: 'task-genius-bases-container task-genius-view',
            attr: { tabIndex: 0 }
        });
        this.rootContainerEl = this.containerEl.createDiv({
            cls: 'task-genius-container no-sidebar',
        });
        // Initialize components
        this.initializeComponents();
    }
    /**
     * Lock the view to a specific mode (used by specialized Bases integrations)
     */
    setForcedViewMode(viewMode) {
        this.forcedViewMode = viewMode;
        this.currentViewId = viewMode;
    }
    onload() {
        // Note: Don't load config here - Bases config object is not ready yet.
        // Config will be loaded in onDataUpdated() when Bases calls it with data.
        // Register event listeners
        this.registerEvent(this.app.workspace.on('task-genius:task-cache-updated', debounce(() => __awaiter(this, void 0, void 0, function* () {
            yield this.loadTasks();
        }), 150)));
        this.registerEvent(this.app.workspace.on('task-genius:filter-changed', (filterState, leafId) => {
            // Handle filter changes for this view
            if (leafId === this.containerEl.getAttribute('data-leaf-id')) {
                this.liveFilterState = filterState;
                this.currentFilterState = filterState;
                this.applyCurrentFilter();
            }
        }));
    }
    onunload() {
        var _a;
        // Cleanup active component
        if ((_a = this.activeComponent) === null || _a === void 0 ? void 0 : _a.instance) {
            const instance = this.activeComponent.instance;
            if (instance.containerEl) {
                instance.containerEl.remove();
            }
            if (typeof instance.unload === 'function') {
                this.removeChild(instance);
            }
        }
        // Cleanup two-column components
        this.twoColumnViewComponents.forEach((component) => {
            this.removeChild(component);
        });
        this.twoColumnViewComponents.clear();
        if (this.rootContainerEl) {
            this.rootContainerEl.empty();
            this.rootContainerEl.detach();
        }
    }
    /**
     * Called when Bases data or configuration is updated
     *
     * This method is triggered by Bases plugin when:
     * 1. The underlying data changes
     * 2. View configuration is modified by user
     *
     * It reloads configuration from view config and refreshes the view
     */
    onDataUpdated() {
        // Reload all configurations from Bases view config
        // This includes property mappings and view-specific settings
        this.loadConfig();
        if (this.data) {
            // Convert Bases entries to tasks
            this.tasks = this.convertBasesEntriesToTasks(this.data.data);
            // Force refresh the current view with new configuration and tasks
            // The forceRefresh=true ensures components rerender even if data hasn't changed
            this.switchView(this.currentViewId, this.currentProject, true);
        }
    }
    /**
     * Safely retrieve the Bases config. Returns null if it's not wired up yet.
     */
    getBasesConfig() {
        const config = this.config;
        if (!config) {
            return null;
        }
        return config;
    }
    /**
     * Load all configurations from Bases view config
     */
    loadConfig() {
        const config = this.getBasesConfig();
        if (!config) {
            return;
        }
        console.log(config, "based config");
        // Ensure forced view mode stays in sync with the saved config
        this.applyForcedViewModeConfig(config);
        // Load property mappings
        this.loadPropertyMappings(config);
        // Load view mode
        const viewMode = config.get('viewMode');
        if (this.forcedViewMode) {
            this.currentViewId = this.forcedViewMode;
        }
        else if (viewMode && typeof viewMode === 'string') {
            this.currentViewId = viewMode;
        }
        // Load view-specific configurations
        this.loadViewSpecificConfig(config);
    }
    /**
     * Load property mappings from Bases configuration
     * Uses DEFAULT_FILE_TASK_MAPPING as the source for default values
     */
    loadPropertyMappings(config) {
        // Map from our Bases config keys to DEFAULT_FILE_TASK_MAPPING properties
        // For Bases integration, we need to use 'note.xxx' format for properties
        // unless it's a special property like file.basename
        const defaults = {
            taskContent: 'file.basename',
            taskStatus: `note.${DEFAULT_FILE_TASK_MAPPING.statusProperty}`,
            taskPriority: `note.${DEFAULT_FILE_TASK_MAPPING.priorityProperty}`,
            taskProject: `note.${DEFAULT_FILE_TASK_MAPPING.projectProperty}`,
            taskTags: `note.${DEFAULT_FILE_TASK_MAPPING.tagsProperty}`,
            taskDueDate: `note.${DEFAULT_FILE_TASK_MAPPING.dueDateProperty}`,
            taskStartDate: `note.${DEFAULT_FILE_TASK_MAPPING.startDateProperty}`,
            taskCompletedDate: `note.${DEFAULT_FILE_TASK_MAPPING.completedDateProperty}`,
            taskContext: `note.${DEFAULT_FILE_TASK_MAPPING.contextProperty}`,
        };
        // Apply defaults if not already configured
        // This ensures property mappings work even when user hasn't explicitly set them
        for (const [key, defaultValue] of Object.entries(defaults)) {
            const currentValue = config.get(key);
            if (currentValue === undefined || currentValue === null || currentValue === '') {
                config.set(key, defaultValue);
            }
        }
        // Now load property mappings - these should always have values due to defaults above
        this.taskContentProp = config.getAsPropertyId('taskContent');
        this.taskStatusProp = config.getAsPropertyId('taskStatus');
        this.taskPriorityProp = config.getAsPropertyId('taskPriority');
        this.taskProjectProp = config.getAsPropertyId('taskProject');
        this.taskTagsProp = config.getAsPropertyId('taskTags');
        this.taskDueDateProp = config.getAsPropertyId('taskDueDate');
        this.taskStartDateProp = config.getAsPropertyId('taskStartDate');
        this.taskCompletedDateProp = config.getAsPropertyId('taskCompletedDate');
        this.taskContextProp = config.getAsPropertyId('taskContext');
    }
    /**
     * Load view-specific configurations
     */
    loadViewSpecificConfig(config) {
        // Load Kanban config
        this.viewConfig.kanban = {
            groupBy: this.getStringConfig(config, 'tg_groupBy', 'status'),
            customColumns: this.getCustomColumnsConfig(config, 'customColumns'),
            hideEmptyColumns: this.getBooleanConfig(config, 'hideEmptyColumns', false),
            defaultSortField: this.getStringConfig(config, 'defaultSortField', 'priority'),
            defaultSortOrder: this.getStringConfig(config, 'defaultSortOrder', 'desc')
        };
        // Load Calendar config
        this.viewConfig.calendar = {
            firstDayOfWeek: this.getNumericConfig(config, 'firstDayOfWeek'),
            hideWeekends: this.getBooleanConfig(config, 'hideWeekends', false)
        };
        // Load Gantt config
        this.viewConfig.gantt = {
            showTaskLabels: this.getBooleanConfig(config, 'showTaskLabels', true),
            useMarkdownRenderer: this.getBooleanConfig(config, 'useMarkdownRenderer', false)
        };
        // Load Forecast config
        this.viewConfig.forecast = {
            firstDayOfWeek: this.getNumericConfig(config, 'firstDayOfWeek'),
            hideWeekends: this.getBooleanConfig(config, 'hideWeekends', false)
        };
        // Load Quadrant config
        this.viewConfig.quadrant = {
            urgentTag: this.getStringConfig(config, 'urgentTag', '#urgent'),
            importantTag: this.getStringConfig(config, 'importantTag', '#important'),
            urgentThresholdDays: this.getNumericConfig(config, 'urgentThresholdDays', 3) || 3,
            usePriorityForClassification: this.getBooleanConfig(config, 'usePriorityForClassification', false),
            urgentPriorityThreshold: this.getNumericConfig(config, 'urgentPriorityThreshold'),
            importantPriorityThreshold: this.getNumericConfig(config, 'importantPriorityThreshold'),
        };
    }
    /**
     * Ensure forced view mode is reflected in the persisted config
     * before other configuration logic runs.
     */
    applyForcedViewModeConfig(config) {
        if (!this.forcedViewMode) {
            return;
        }
        const basesConfig = config !== null && config !== void 0 ? config : this.getBasesConfig();
        if (!basesConfig ||
            typeof basesConfig.get !== 'function' ||
            typeof basesConfig.set !== 'function') {
            return;
        }
        const currentValue = basesConfig.get('viewMode');
        if (currentValue !== this.forcedViewMode) {
            basesConfig.set('viewMode', this.forcedViewMode);
        }
    }
    /**
     * Helper method to get numeric config value
     */
    getNumericConfig(config, key, defaultValue) {
        const value = config.get(key);
        if (value !== undefined && value !== null && typeof value === 'number') {
            return value;
        }
        return defaultValue;
    }
    /**
     * Helper method to get string config value
     */
    getStringConfig(config, key, defaultValue) {
        const value = config.get(key);
        if (value !== undefined && value !== null && typeof value === 'string' && value.length > 0) {
            return value;
        }
        return defaultValue;
    }
    /**
     * Helper method to get boolean config value
     */
    getBooleanConfig(config, key, defaultValue) {
        const value = config.get(key);
        if (value !== undefined && value !== null && typeof value === 'boolean') {
            return value;
        }
        return defaultValue;
    }
    /**
     * Helper method to get custom columns config
     */
    getCustomColumnsConfig(config, key) {
        const value = config.get(key);
        if (value && Array.isArray(value)) {
            return value;
        }
        return undefined;
    }
    /**
     * Helper: string config with fallback key
     */
    getStringConfigWithFallback(config, primaryKey, fallbackKey, defaultValue) {
        const primary = config.get(primaryKey);
        if (typeof primary === 'string' && primary.length > 0)
            return primary;
        const fallback = config.get(fallbackKey);
        if (typeof fallback === 'string' && fallback.length > 0)
            return fallback;
        return defaultValue;
    }
    /**
     * Helper: boolean config with fallback key
     */
    getBooleanConfigWithFallback(config, primaryKey, fallbackKey, defaultValue) {
        const primary = config.get(primaryKey);
        if (typeof primary === 'boolean')
            return primary;
        const fallback = config.get(fallbackKey);
        if (typeof fallback === 'boolean')
            return fallback;
        return defaultValue;
    }
    /**
     * Helper: custom columns config with fallback key
     */
    getCustomColumnsConfigWithFallback(config, primaryKey, fallbackKey) {
        const primary = config.get(primaryKey);
        if (primary && Array.isArray(primary))
            return primary;
        const fallback = config.get(fallbackKey);
        if (fallback && Array.isArray(fallback))
            return fallback;
        return undefined;
    }
    /**
     * Convert Bases entries to Task format
     */
    convertBasesEntriesToTasks(entries) {
        return entries.map((entry, index) => this.convertEntryToTask(entry, index));
    }
    /**
     * Convert a single Bases entry to Task format
     */
    convertEntryToTask(entry, index) {
        // Extract raw status value from Bases entry
        const rawStatusValue = this.extractStringValue(entry, this.taskStatusProp) || ' ';
        // Map the status value using status mapping configuration
        const statusSymbol = this.mapStatusToSymbol(rawStatusValue);
        // Determine if task is completed based on mapped symbol
        const isCompleted = this.isCompletedStatus(statusSymbol);
        return {
            id: `bases-${entry.file.path}-${index}`,
            content: this.extractStringValue(entry, this.taskContentProp) || entry.file.basename,
            completed: isCompleted,
            status: statusSymbol,
            line: 0,
            filePath: entry.file.path,
            originalMarkdown: this.extractStringValue(entry, this.taskContentProp) || entry.file.basename,
            metadata: {
                priority: this.extractNumberValue(entry, this.taskPriorityProp),
                project: this.extractStringValue(entry, this.taskProjectProp),
                tags: this.extractArrayValue(entry, this.taskTagsProp),
                context: this.extractStringValue(entry, this.taskContextProp),
                dueDate: this.extractDateValue(entry, this.taskDueDateProp),
                startDate: this.extractDateValue(entry, this.taskStartDateProp),
                completedDate: this.extractDateValue(entry, this.taskCompletedDateProp),
                children: [], // Bases entries don't have child tasks
            }
        };
    }
    /**
     * Map a status value (metadata text or symbol) to a task status symbol
     * Uses the plugin's status mapping configuration
     */
    mapStatusToSymbol(statusValue) {
        var _a;
        const statusMapping = (_a = this.plugin.settings.fileSource) === null || _a === void 0 ? void 0 : _a.statusMapping;
        // If status mapping is disabled or not configured, return as-is
        if (!statusMapping || !statusMapping.enabled) {
            return statusValue;
        }
        // Handle case sensitivity
        const lookupValue = statusMapping.caseSensitive
            ? statusValue
            : statusValue.toLowerCase();
        // Check if it's already a recognized symbol
        if (statusValue in statusMapping.symbolToMetadata) {
            return statusValue;
        }
        // Try to map from metadata text to symbol
        for (const [key, symbol] of Object.entries(statusMapping.metadataToSymbol)) {
            const compareKey = statusMapping.caseSensitive ? key : key.toLowerCase();
            if (compareKey === lookupValue) {
                return symbol;
            }
        }
        // Return original value if no mapping found
        return statusValue;
    }
    /**
     * Check if a status symbol represents a completed task
     */
    isCompletedStatus(statusSymbol) {
        var _a;
        // Check against plugin's completed status marks
        const completedMarks = (((_a = this.plugin.settings.taskStatuses) === null || _a === void 0 ? void 0 : _a.completed) || 'x')
            .split('|')
            .map(m => m.trim().toLowerCase());
        return completedMarks.includes(statusSymbol.toLowerCase());
    }
    /**
     * Extract string value from Bases entry
     */
    extractStringValue(entry, prop) {
        if (!prop)
            return undefined;
        try {
            const value = entry.getValue(prop);
            if (value instanceof StringValue && value.isTruthy()) {
                const strValue = value.toString();
                return strValue;
            }
            if (value && value.isTruthy()) {
                const strValue = value.toString();
                return strValue;
            }
        }
        catch (error) {
            // Property not found or invalid
        }
        return undefined;
    }
    /**
     * Extract boolean value from Bases entry
     */
    extractBooleanValue(entry, prop) {
        if (!prop)
            return false;
        try {
            const value = entry.getValue(prop);
            if (value instanceof BooleanValue) {
                return value.isTruthy();
            }
            if (value instanceof StringValue) {
                const str = value.toString().toLowerCase();
                return str === 'x' || str === 'true' || str === 'done' || str === 'completed';
            }
        }
        catch (error) {
            // Property not found or invalid
        }
        return false;
    }
    /**
     * Extract number value from Bases entry
     */
    extractNumberValue(entry, prop) {
        if (!prop)
            return undefined;
        try {
            const value = entry.getValue(prop);
            if (value instanceof NumberValue && value.isTruthy()) {
                const strValue = value.toString();
                return Number(strValue);
            }
            if (value instanceof StringValue && value.isTruthy()) {
                const strValue = value.toString();
                const num = parseInt(strValue);
                return isNaN(num) ? undefined : num;
            }
        }
        catch (error) {
            // Property not found or invalid
        }
        return undefined;
    }
    /**
     * Extract date value from Bases entry
     */
    extractDateValue(entry, prop) {
        if (!prop)
            return undefined;
        try {
            const value = entry.getValue(prop);
            if (value instanceof DateValue && value.isTruthy()) {
                // DateValue has a date property that returns a Date object
                const dateObj = value.date;
                if (dateObj instanceof Date) {
                    return dateObj.getTime();
                }
            }
            if (value instanceof StringValue && value.isTruthy()) {
                const dateStr = value.toString();
                const date = new Date(dateStr);
                return isNaN(date.getTime()) ? undefined : date.getTime();
            }
        }
        catch (error) {
            // Property not found or invalid
        }
        return undefined;
    }
    /**
     * Extract array value from Bases entry
     */
    extractArrayValue(entry, prop) {
        if (!prop)
            return [];
        try {
            const value = entry.getValue(prop);
            if (value instanceof ListValue && value.isTruthy()) {
                const result = [];
                for (let i = 0; i < value.length(); i++) {
                    const item = value.get(i);
                    if (item) {
                        const strValue = item.toString();
                        result.push(strValue);
                    }
                }
                return result;
            }
            if (value instanceof StringValue && value.isTruthy()) {
                const strValue = value.toString();
                // Parse comma-separated values
                return strValue.split(',')
                    .map(s => s.trim())
                    .filter(s => s.length > 0);
            }
        }
        catch (error) {
            // Property not found or invalid
        }
        return [];
    }
    /**
     * Initialize essential shared components (details panel and view manager)
     * View-specific components are lazy loaded on demand
     */
    initializeComponents() {
        // Details component - shared across all views
        this.detailsComponent = new TaskDetailsComponent(this.rootContainerEl, this.app, this.plugin);
        this.addChild(this.detailsComponent);
        this.detailsComponent.load();
        // View component manager for special views
        this.viewComponentManager = new ViewComponentManager(this, this.app, this.plugin, this.rootContainerEl, {
            onTaskSelected: this.handleTaskSelection.bind(this),
            onTaskCompleted: this.toggleTaskCompletion.bind(this),
            onTaskContextMenu: this.handleTaskContextMenu.bind(this),
            onTaskStatusUpdate: this.handleKanbanTaskStatusUpdate.bind(this),
            onEventContextMenu: this.handleTaskContextMenu.bind(this),
        });
        this.addChild(this.viewComponentManager);
        this.setupComponentEvents();
    }
    /**
     * Setup event handlers for components
     */
    setupComponentEvents() {
        this.detailsComponent.onTaskToggleComplete = (task) => this.toggleTaskCompletion(task);
        this.detailsComponent.onTaskEdit = (task) => this.editTask(task);
        this.detailsComponent.onTaskUpdate = (originalTask, updatedTask) => __awaiter(this, void 0, void 0, function* () {
            yield this.updateTask(originalTask, updatedTask);
        });
        this.detailsComponent.toggleDetailsVisibility = (visible) => {
            this.toggleDetailsVisibility(visible);
        };
    }
    /**
     * Show the requested component and hide the previously active one.
     */
    activateComponent(key, component) {
        if (!component || !component.containerEl) {
            return;
        }
        if (this.activeComponent && this.activeComponent.instance !== component) {
            const previous = this.activeComponent.instance;
            if (previous === null || previous === void 0 ? void 0 : previous.containerEl) {
                previous.containerEl.hide();
            }
        }
        component.containerEl.show();
        this.activeComponent = { key, instance: component };
    }
    /**
     * Switch between different view modes
     */
    switchView(viewId, project, forceRefresh = false) {
        var _a, _b;
        if (this.forcedViewMode) {
            viewId = this.forcedViewMode;
        }
        this.currentViewId = viewId;
        this.currentProject = project;
        let targetComponent = null;
        let componentKey = viewId;
        let modeForComponent = viewId;
        // Get view configuration
        const viewConfig = getViewSettingOrDefault(this.plugin, viewId);
        const specificViewType = (_a = viewConfig.specificConfig) === null || _a === void 0 ? void 0 : _a.viewType;
        // Handle TwoColumn views
        if (specificViewType === 'twocolumn') {
            if (!this.twoColumnViewComponents.has(viewId)) {
                const twoColumnConfig = viewConfig.specificConfig;
                const twoColumnComponent = new TaskPropertyTwoColumnView(this.rootContainerEl, this.app, this.plugin, twoColumnConfig, viewId);
                this.addChild(twoColumnComponent);
                // Set up event handlers
                twoColumnComponent.onTaskSelected = (task) => {
                    this.handleTaskSelection(task);
                };
                twoColumnComponent.onTaskCompleted = (task) => {
                    this.toggleTaskCompletion(task);
                };
                twoColumnComponent.onTaskContextMenu = (event, task) => {
                    this.handleTaskContextMenu(event, task);
                };
                this.twoColumnViewComponents.set(viewId, twoColumnComponent);
                twoColumnComponent.containerEl.hide();
            }
            targetComponent = (_b = this.twoColumnViewComponents.get(viewId)) !== null && _b !== void 0 ? _b : null;
            componentKey = `twocolumn:${viewId}`;
        }
        else if (this.viewComponentManager.isSpecialView(viewId)) {
            const specialComponent = this.viewComponentManager.getOrCreateComponent(viewId);
            if (specialComponent) {
                targetComponent = specialComponent;
                componentKey = `special:${viewId}`;
                // Inject Bases-derived per-view config override into the component (if supported)
                const compAny = specialComponent;
                if (typeof compAny.setConfigOverride === 'function') {
                    const ovr = viewId === 'kanban' ? this.viewConfig.kanban
                        : viewId === 'calendar' ? this.viewConfig.calendar
                            : viewId === 'gantt' ? this.viewConfig.gantt
                                : viewId === 'forecast' ? this.viewConfig.forecast
                                    : viewId === 'quadrant' ? this.viewConfig.quadrant
                                        : null;
                    compAny.setConfigOverride(ovr !== null && ovr !== void 0 ? ovr : null);
                }
            }
        }
        else {
            // Standard view types - create component on demand
            componentKey = viewId;
            modeForComponent = viewId;
            // Clean up previous component if it exists and is different
            if (this.activeComponent && this.activeComponent.key !== viewId) {
                const prevInstance = this.activeComponent.instance;
                if (prevInstance === null || prevInstance === void 0 ? void 0 : prevInstance.containerEl) {
                    prevInstance.containerEl.remove();
                }
                // Unload previous component if it has unload method
                if (prevInstance && typeof prevInstance.unload === 'function') {
                    this.removeChild(prevInstance);
                }
            }
            // Create new component based on viewId
            switch (viewId) {
                case 'inbox':
                case 'flagged':
                    const contentComp = new ContentComponent(this.rootContainerEl, this.plugin.app, this.plugin, {
                        onTaskSelected: (task) => this.handleTaskSelection(task),
                        onTaskCompleted: (task) => this.toggleTaskCompletion(task),
                        onTaskContextMenu: (event, task) => this.handleTaskContextMenu(event, task),
                    });
                    this.addChild(contentComp);
                    contentComp.load();
                    targetComponent = contentComp;
                    break;
                case 'forecast':
                    const forecastComp = new ForecastComponent(this.rootContainerEl, this.plugin.app, this.plugin, {
                        onTaskSelected: (task) => this.handleTaskSelection(task),
                        onTaskCompleted: (task) => this.toggleTaskCompletion(task),
                        onTaskUpdate: (originalTask, updatedTask) => __awaiter(this, void 0, void 0, function* () { return yield this.handleTaskUpdate(originalTask, updatedTask); }),
                        onTaskContextMenu: (event, task) => this.handleTaskContextMenu(event, task),
                    });
                    this.addChild(forecastComp);
                    forecastComp.load();
                    targetComponent = forecastComp;
                    break;
                case 'tags':
                    const tagsComp = new TagsComponent(this.rootContainerEl, this.plugin.app, this.plugin, {
                        onTaskSelected: (task) => this.handleTaskSelection(task),
                        onTaskCompleted: (task) => this.toggleTaskCompletion(task),
                        onTaskContextMenu: (event, task) => this.handleTaskContextMenu(event, task),
                    });
                    this.addChild(tagsComp);
                    tagsComp.load();
                    targetComponent = tagsComp;
                    break;
                case 'projects':
                    const projectsComp = new ProjectsComponent(this.rootContainerEl, this.plugin.app, this.plugin, {
                        onTaskSelected: (task) => this.handleTaskSelection(task),
                        onTaskCompleted: (task) => this.toggleTaskCompletion(task),
                        onTaskContextMenu: (event, task) => this.handleTaskContextMenu(event, task),
                    });
                    this.addChild(projectsComp);
                    projectsComp.load();
                    targetComponent = projectsComp;
                    break;
                case 'review':
                    const reviewComp = new ReviewComponent(this.rootContainerEl, this.plugin.app, this.plugin, {
                        onTaskSelected: (task) => this.handleTaskSelection(task),
                        onTaskCompleted: (task) => this.toggleTaskCompletion(task),
                        onTaskContextMenu: (event, task) => this.handleTaskContextMenu(event, task),
                    });
                    this.addChild(reviewComp);
                    reviewComp.load();
                    targetComponent = reviewComp;
                    break;
                case 'calendar':
                    const calendarComp = new CalendarComponent(this.plugin.app, this.plugin, this.rootContainerEl, this.tasks, {
                        onTaskSelected: (task) => this.handleTaskSelection(task),
                        onTaskCompleted: (task) => this.toggleTaskCompletion(task),
                        onEventContextMenu: (ev, event) => this.handleTaskContextMenu(ev, event),
                    });
                    this.addChild(calendarComp);
                    calendarComp.load();
                    targetComponent = calendarComp;
                    break;
                case 'kanban':
                    const kanbanComp = new KanbanComponent(this.app, this.plugin, this.rootContainerEl, this.tasks, {
                        onTaskStatusUpdate: this.handleKanbanTaskStatusUpdate.bind(this),
                        onTaskSelected: this.handleTaskSelection.bind(this),
                        onTaskCompleted: this.toggleTaskCompletion.bind(this),
                        onTaskContextMenu: this.handleTaskContextMenu.bind(this),
                    });
                    this.addChild(kanbanComp);
                    // Ensure component lifecycle runs
                    kanbanComp.load();
                    targetComponent = kanbanComp;
                    break;
                case 'gantt':
                    const ganttComp = new GanttComponent(this.plugin, this.rootContainerEl, {
                        onTaskSelected: this.handleTaskSelection.bind(this),
                        onTaskCompleted: this.toggleTaskCompletion.bind(this),
                        onTaskContextMenu: this.handleTaskContextMenu.bind(this),
                    });
                    this.addChild(ganttComp);
                    targetComponent = ganttComp;
                    break;
                case 'quadrant':
                    const quadrantComp = new QuadrantComponent(this.app, this.plugin, this.rootContainerEl, this.tasks, {
                        onTaskStatusUpdate: this.handleKanbanTaskStatusUpdate.bind(this),
                        onTaskSelected: this.handleTaskSelection.bind(this),
                        onTaskCompleted: this.toggleTaskCompletion.bind(this),
                        onTaskContextMenu: this.handleTaskContextMenu.bind(this),
                        onTaskUpdated: (task) => __awaiter(this, void 0, void 0, function* () {
                            yield this.updateTask(task, task);
                        }),
                    });
                    this.addChild(quadrantComp);
                    quadrantComp.load();
                    targetComponent = quadrantComp;
                    break;
                case 'habit':
                    const habitsComp = new HabitsComponent(this.plugin, this.rootContainerEl);
                    this.addChild(habitsComp);
                    targetComponent = habitsComp;
                    break;
                default:
                    targetComponent = null;
                    break;
            }
        }
        if (!targetComponent) {
            this.handleTaskSelection(null);
            return;
        }
        this.activateComponent(componentKey, targetComponent);
        // Update component with filtered tasks
        if (typeof targetComponent.setTasks === 'function') {
            const filterOptions = {};
            if (this.currentFilterState &&
                this.currentFilterState.filterGroups &&
                this.currentFilterState.filterGroups.length > 0) {
                filterOptions.advancedFilter = this.currentFilterState;
            }
            let filteredTasks = filterTasks(this.tasks, viewId, this.plugin, filterOptions);
            // Filter out badge tasks for forecast view
            if (viewId === 'forecast') {
                filteredTasks = filteredTasks.filter((task) => !task.badge);
            }
            targetComponent.setTasks(filteredTasks, this.tasks, forceRefresh);
        }
        // Handle updateTasks method for table view adapter
        if (typeof targetComponent.updateTasks === 'function') {
            const filterOptions = {};
            if (this.currentFilterState &&
                this.currentFilterState.filterGroups &&
                this.currentFilterState.filterGroups.length > 0) {
                filterOptions.advancedFilter = this.currentFilterState;
            }
            targetComponent.updateTasks(filterTasks(this.tasks, viewId, this.plugin, filterOptions));
        }
        if (typeof targetComponent.setViewMode === 'function') {
            targetComponent.setViewMode(modeForComponent, project);
        }
        // Update TwoColumn views
        this.twoColumnViewComponents.forEach((component) => {
            if (component &&
                typeof component.setTasks === 'function' &&
                component.getViewId() === viewId) {
                const filterOptions = {};
                if (this.currentFilterState &&
                    this.currentFilterState.filterGroups &&
                    this.currentFilterState.filterGroups.length > 0) {
                    filterOptions.advancedFilter = this.currentFilterState;
                }
                let filteredTasks = filterTasks(this.tasks, component.getViewId(), this.plugin, filterOptions);
                if (component.getViewId() === 'forecast') {
                    filteredTasks = filteredTasks.filter((task) => !task.badge);
                }
                component.setTasks(filteredTasks);
            }
        });
        if (viewId === 'review' &&
            typeof targetComponent.refreshReviewSettings === 'function') {
            targetComponent.refreshReviewSettings();
        }
        this.handleTaskSelection(null);
    }
    /**
     * Toggle details panel visibility
     */
    toggleDetailsVisibility(visible) {
        this.isDetailsVisible = visible;
        this.rootContainerEl.toggleClass('details-visible', visible);
        this.rootContainerEl.toggleClass('details-hidden', !visible);
        this.detailsComponent.setVisible(visible);
        if (this.detailsToggleBtn) {
            this.detailsToggleBtn.toggleClass('is-active', visible);
            this.detailsToggleBtn.setAttribute('aria-label', visible ? t('Hide Details') : t('Show Details'));
        }
        if (!visible) {
            this.currentSelectedTaskId = null;
        }
    }
    /**
     * Handle task selection
     */
    handleTaskSelection(task) {
        if (task) {
            if (this.currentSelectedTaskId !== task.id) {
                this.currentSelectedTaskId = task.id;
                this.detailsComponent.showTaskDetails(task);
                if (!this.isDetailsVisible) {
                    this.toggleDetailsVisibility(true);
                }
            }
            else {
                // Toggle details visibility on re-click
                this.toggleDetailsVisibility(!this.isDetailsVisible);
            }
        }
        else {
            this.toggleDetailsVisibility(false);
            this.currentSelectedTaskId = null;
        }
    }
    /**
     * Handle task context menu
     */
    handleTaskContextMenu(event, task) {
        const menu = new Menu();
        menu.addItem((item) => {
            item.setTitle(t('Complete'));
            item.setIcon('check-square');
            item.onClick(() => {
                this.toggleTaskCompletion(task);
            });
        })
            .addItem((item) => {
            item.setIcon('square-pen');
            item.setTitle(t('Switch status'));
            const submenu = item.setSubmenu();
            // Get unique statuses from taskStatusMarks
            const statusMarks = this.plugin.settings.taskStatusMarks;
            const uniqueStatuses = new Map();
            for (const status of Object.keys(statusMarks)) {
                const mark = statusMarks[status];
                if (!Array.from(uniqueStatuses.values()).includes(mark)) {
                    uniqueStatuses.set(status, mark);
                }
            }
            for (const [status, mark] of uniqueStatuses) {
                submenu.addItem((item) => {
                    item.titleEl.createEl('span', {
                        cls: 'status-option-checkbox',
                    }, (el) => {
                        createTaskCheckbox(mark, task, el);
                    });
                    item.titleEl.createEl('span', {
                        cls: 'status-option',
                        text: status,
                    });
                    item.onClick(() => {
                        if (!task.completed && mark.toLowerCase() === 'x') {
                            task.metadata.completedDate = Date.now();
                        }
                        else {
                            task.metadata.completedDate = undefined;
                        }
                        this.updateTask(task, Object.assign(Object.assign({}, task), { status: mark, completed: mark.toLowerCase() === 'x' }));
                    });
                });
            }
        })
            .addSeparator()
            .addItem((item) => {
            item.setTitle(t('Edit'));
            item.setIcon('pencil');
            item.onClick(() => {
                this.handleTaskSelection(task);
            });
        })
            .addItem((item) => {
            item.setTitle(t('Edit in File'));
            item.setIcon('file-edit');
            item.onClick(() => {
                this.editTask(task);
            });
        });
        menu.showAtMouseEvent(event);
    }
    /**
     * Toggle task completion status
     */
    toggleTaskCompletion(task) {
        return __awaiter(this, void 0, void 0, function* () {
            const updatedTask = Object.assign(Object.assign({}, task), { completed: !task.completed });
            if (updatedTask.completed) {
                if (updatedTask.metadata) {
                    updatedTask.metadata.completedDate = Date.now();
                }
                const completedMark = (this.plugin.settings.taskStatuses.completed || 'x').split('|')[0];
                if (updatedTask.status !== completedMark) {
                    updatedTask.status = completedMark;
                }
            }
            else {
                if (updatedTask.metadata) {
                    updatedTask.metadata.completedDate = undefined;
                }
                const notStartedMark = this.plugin.settings.taskStatuses.notStarted || ' ';
                if (updatedTask.status.toLowerCase() === 'x') {
                    updatedTask.status = notStartedMark;
                }
            }
            // Update through plugin API if available
            if (this.plugin.writeAPI) {
                const result = yield this.plugin.writeAPI.updateTask({
                    taskId: updatedTask.id,
                    updates: updatedTask,
                });
                if (!result.success) {
                    throw new Error(result.error || 'Failed to update task');
                }
            }
            // Update local state
            const index = this.tasks.findIndex((t) => t.id === task.id);
            if (index !== -1) {
                this.tasks[index] = updatedTask;
                this.switchView(this.currentViewId, this.currentProject, true);
            }
        });
    }
    /**
     * Handle task update
     */
    handleTaskUpdate(originalTask, updatedTask) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.updateTask(originalTask, updatedTask);
        });
    }
    /**
     * Update task
     */
    updateTask(originalTask, updatedTask) {
        return __awaiter(this, void 0, void 0, function* () {
            // Update through plugin API if available
            if (this.plugin.writeAPI) {
                const result = yield this.plugin.writeAPI.updateTask({
                    taskId: originalTask.id,
                    updates: updatedTask,
                });
                if (!result.success) {
                    throw new Error(result.error || 'Failed to update task');
                }
                if (result.task) {
                    updatedTask = result.task;
                }
            }
            // Update local state
            const index = this.tasks.findIndex((t) => t.id === originalTask.id);
            if (index !== -1) {
                this.tasks[index] = updatedTask;
                this.switchView(this.currentViewId, this.currentProject, true);
            }
            if (this.currentSelectedTaskId === updatedTask.id) {
                if (this.detailsComponent.isCurrentlyEditing()) {
                    this.detailsComponent.currentTask = updatedTask;
                }
                else {
                    this.detailsComponent.showTaskDetails(updatedTask);
                }
            }
            return updatedTask;
        });
    }
    /**
     * Edit task in source file
     */
    editTask(task) {
        return __awaiter(this, void 0, void 0, function* () {
            const file = this.app.vault.getFileByPath(task.filePath);
            if (!file)
                return;
            const existingLeaf = this.app.workspace
                .getLeavesOfType('markdown')
                .find((leaf) => leaf.view.file === file);
            const leafToUse = existingLeaf || this.app.workspace.getLeaf('tab');
            yield leafToUse.openFile(file, {
                active: true,
                eState: {
                    line: task.line,
                },
            });
            this.app.workspace.setActiveLeaf(leafToUse, { focus: true });
        });
    }
    /**
     * Apply current filter
     */
    applyCurrentFilter() {
        this.loadTasks();
    }
    /**
     * Load tasks from plugin or Bases data
     */
    loadTasks() {
        return __awaiter(this, void 0, void 0, function* () {
            // If we have Bases data, use it
            if (this.data) {
                this.tasks = this.convertBasesEntriesToTasks(this.data.data);
            }
            else if (this.plugin.dataflowOrchestrator) {
                // Fall back to plugin's dataflow if available
                try {
                    const queryAPI = this.plugin.dataflowOrchestrator.getQueryAPI();
                    this.tasks = yield queryAPI.getAllTasks();
                }
                catch (error) {
                    console.error('Error loading tasks from dataflow:', error);
                    this.tasks = [];
                }
            }
            else {
                this.tasks = [];
            }
            // Update the current view
            if (this.currentViewId) {
                this.switchView(this.currentViewId, this.currentProject, true);
            }
        });
    }
    /**
     * Get view options for Bases configuration
     * @param viewMode - Optional view mode to filter options for specific view types
     */
    static getViewOptions(viewMode) {
        const options = [];
        // Common options for all views
        // Default values are derived from DEFAULT_FILE_TASK_MAPPING
        options.push({
            displayName: 'Property Mappings',
            type: 'group',
            items: [
                {
                    displayName: 'Task Content',
                    type: 'property',
                    key: 'taskContent',
                    placeholder: 'Property containing task text',
                    default: 'file.basename', // Special case: use file name as content
                },
                {
                    displayName: 'Task Status',
                    type: 'property',
                    key: 'taskStatus',
                    filter: prop => !prop.startsWith('file.'),
                    placeholder: 'Property for completion status',
                    default: `note.${DEFAULT_FILE_TASK_MAPPING.statusProperty}`,
                },
                {
                    displayName: 'Priority',
                    type: 'property',
                    key: 'taskPriority',
                    filter: prop => !prop.startsWith('file.'),
                    placeholder: 'Property for task priority',
                    default: `note.${DEFAULT_FILE_TASK_MAPPING.priorityProperty}`,
                },
                {
                    displayName: 'Project',
                    type: 'property',
                    key: 'taskProject',
                    filter: prop => !prop.startsWith('file.'),
                    placeholder: 'Property for project assignment',
                    default: `note.${DEFAULT_FILE_TASK_MAPPING.projectProperty}`,
                },
                {
                    displayName: 'Tags',
                    type: 'property',
                    key: 'taskTags',
                    filter: prop => !prop.startsWith('file.'),
                    placeholder: 'Property for task tags',
                    default: `note.${DEFAULT_FILE_TASK_MAPPING.tagsProperty}`,
                },
                {
                    displayName: 'Context',
                    type: 'property',
                    key: 'taskContext',
                    filter: prop => !prop.startsWith('file.'),
                    placeholder: 'Property for task context',
                    default: `note.${DEFAULT_FILE_TASK_MAPPING.contextProperty}`,
                },
            ]
        }, {
            displayName: 'Date Properties',
            type: 'group',
            items: [
                {
                    displayName: 'Due Date',
                    type: 'property',
                    key: 'taskDueDate',
                    filter: prop => !prop.startsWith('file.'),
                    placeholder: 'Property for due date',
                    default: `note.${DEFAULT_FILE_TASK_MAPPING.dueDateProperty}`,
                },
                {
                    displayName: 'Start Date',
                    type: 'property',
                    key: 'taskStartDate',
                    filter: prop => !prop.startsWith('file.'),
                    placeholder: 'Property for start date',
                    default: `note.${DEFAULT_FILE_TASK_MAPPING.startDateProperty}`,
                },
                {
                    displayName: 'Completed Date',
                    type: 'property',
                    key: 'taskCompletedDate',
                    filter: prop => !prop.startsWith('file.'),
                    placeholder: 'Property for completion date',
                    default: `note.${DEFAULT_FILE_TASK_MAPPING.completedDateProperty}`,
                },
            ]
        });
        // View-specific options based on viewMode
        // If no viewMode is specified, include all view-specific options (for unified view)
        if (!viewMode || viewMode === 'kanban') {
            options.push({
                displayName: 'Kanban View Settings',
                type: 'group',
                items: [
                    {
                        displayName: 'Group By',
                        type: 'dropdown',
                        key: 'tg_groupBy',
                        options: {
                            'status': 'Status',
                            'priority': 'Priority',
                            'tags': 'Tags',
                            'project': 'Project',
                            'context': 'Context',
                            'dueDate': 'Due Date',
                            'startDate': 'Start Date'
                        },
                        default: 'status',
                    },
                    {
                        displayName: 'Hide Empty Columns',
                        type: 'toggle',
                        key: 'hideEmptyColumns',
                        default: false,
                    },
                    {
                        displayName: 'Default Sort Field',
                        type: 'dropdown',
                        key: 'defaultSortField',
                        options: {
                            'priority': 'Priority',
                            'dueDate': 'Due Date',
                            'scheduledDate': 'Scheduled Date',
                            'startDate': 'Start Date',
                            'createdDate': 'Created Date'
                        },
                        default: 'priority',
                    },
                    {
                        displayName: 'Default Sort Order',
                        type: 'dropdown',
                        key: 'defaultSortOrder',
                        options: {
                            'asc': 'Ascending',
                            'desc': 'Descending'
                        },
                        default: 'desc',
                    },
                ]
            });
        }
        if (!viewMode || viewMode === 'calendar') {
            options.push({
                displayName: t('Calendar Settings'),
                type: 'group',
                items: [
                    {
                        displayName: 'First Day of Week',
                        type: 'slider',
                        key: 'firstDayOfWeek',
                        min: 0,
                        max: 6,
                        step: 1,
                        default: 0,
                    },
                    {
                        displayName: 'Hide Weekends',
                        type: 'toggle',
                        key: 'hideWeekends',
                        default: false,
                    },
                ]
            });
        }
        if (!viewMode || viewMode === 'gantt') {
            options.push({
                displayName: 'Gantt View Settings',
                type: 'group',
                items: [
                    {
                        displayName: 'Show Task Labels',
                        type: 'toggle',
                        key: 'showTaskLabels',
                        default: true,
                    },
                    {
                        displayName: 'Use Markdown Renderer',
                        type: 'toggle',
                        key: 'useMarkdownRenderer',
                        default: false,
                    },
                ]
            });
        }
        if (!viewMode || viewMode === 'forecast') {
            options.push({
                displayName: 'Forecast View Settings',
                type: 'group',
                items: [
                    {
                        displayName: 'First Day of Week',
                        type: 'slider',
                        key: 'firstDayOfWeek',
                        min: 0,
                        max: 6,
                        step: 1,
                        default: 0,
                    },
                    {
                        displayName: 'Hide Weekends',
                        type: 'toggle',
                        key: 'hideWeekends',
                        default: false,
                    },
                ]
            });
        }
        if (!viewMode || viewMode === 'quadrant') {
            options.push({
                displayName: 'Quadrant View Settings',
                type: 'group',
                items: [
                    {
                        displayName: 'Urgent Tag',
                        type: 'text',
                        key: 'urgentTag',
                        placeholder: '#urgent',
                        default: '#urgent',
                    },
                    {
                        displayName: 'Important Tag',
                        type: 'text',
                        key: 'importantTag',
                        placeholder: '#important',
                        default: '#important',
                    },
                    {
                        displayName: 'Urgent Threshold (Days)',
                        type: 'slider',
                        key: 'urgentThresholdDays',
                        min: 1,
                        max: 14,
                        step: 1,
                        default: 3,
                    },
                    {
                        displayName: 'Use Priority for Classification',
                        type: 'toggle',
                        key: 'usePriorityForClassification',
                        default: false,
                    },
                    {
                        displayName: 'Urgent Priority Threshold',
                        type: 'slider',
                        key: 'urgentPriorityThreshold',
                        min: 1,
                        max: 5,
                        step: 1,
                        default: 4,
                    },
                    {
                        displayName: 'Important Priority Threshold',
                        type: 'slider',
                        key: 'importantPriorityThreshold',
                        min: 1,
                        max: 5,
                        step: 1,
                        default: 3,
                    },
                ]
            });
        }
        return options;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGFza0Jhc2VzVmlldy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlRhc2tCYXNlc1ZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFHTixTQUFTLEVBRVQsWUFBWSxFQUNaLFNBQVMsRUFDVCxRQUFRLEVBQ1IsU0FBUyxFQUNULElBQUksRUFDSixXQUFXLEVBRVgsV0FBVyxHQUVYLE1BQU0sVUFBVSxDQUFDO0FBRWxCLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDekUsT0FBTyxFQUFFLGlCQUFpQixFQUFpQixNQUFNLGdDQUFnQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDbkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDdEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDdkQsT0FBTyxFQUFFLEtBQUssSUFBSSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVuRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDMUMsT0FBTyxFQUNOLHVCQUF1QixHQUl2QixNQUFNLDZCQUE2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LEVBQUUsaUNBQWlDO3dCQUM5QyxJQUFJLEVBQUUsUUFBUTt3QkFDZCxHQUFHLEVBQUUsOEJBQThCO3dCQUNuQyxPQUFPLEVBQUUsS0FBSztxQkFDZDtvQkFDRDt3QkFDQyxXQUFXLEVBQUUsMkJBQTJCO3dCQUN4QyxJQUFJLEVBQUUsUUFBUTt3QkFDZCxHQUFHLEVBQUUseUJBQXlCO3dCQUM5QixHQUFHLEVBQUUsQ0FBQzt3QkFDTixHQUFHLEVBQUUsQ0FBQzt3QkFDTixJQUFJLEVBQUUsQ0FBQzt3QkFDUCxPQUFPLEVBQUUsQ0FBQztxQkFDVjtvQkFDRDt3QkFDQyxXQUFXLEVBQUUsOEJBQThCO3dCQUMzQyxJQUFJLEVBQUUsUUFBUTt3QkFDZCxHQUFHLEVBQUUsNEJBQTRCO3dCQUNqQyxHQUFHLEVBQUUsQ0FBQzt3QkFDTixHQUFHLEVBQUUsQ0FBQzt3QkFDTixJQUFJLEVBQUUsQ0FBQzt3QkFDUCxPQUFPLEVBQUUsQ0FBQztxQkFDVjtpQkFDRDthQUNELENBQUMsQ0FBQztTQUNIO1FBRUQsT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcclxuXHRCYXNlc0VudHJ5LFxyXG5cdEJhc2VzUHJvcGVydHlJZCxcclxuXHRCYXNlc1ZpZXcsXHJcblx0QmFzZXNWaWV3Q29uZmlnLFxyXG5cdEJvb2xlYW5WYWx1ZSxcclxuXHREYXRlVmFsdWUsXHJcblx0ZGVib3VuY2UsXHJcblx0TGlzdFZhbHVlLFxyXG5cdE1lbnUsXHJcblx0TnVtYmVyVmFsdWUsXHJcblx0UXVlcnlDb250cm9sbGVyLFxyXG5cdFN0cmluZ1ZhbHVlLFxyXG5cdFZpZXdPcHRpb24sXHJcbn0gZnJvbSAnb2JzaWRpYW4nO1xyXG5pbXBvcnQgeyBUYXNrIH0gZnJvbSAnQC90eXBlcy90YXNrJztcclxuaW1wb3J0IHsgQ29udGVudENvbXBvbmVudCB9IGZyb20gJ0AvY29tcG9uZW50cy9mZWF0dXJlcy90YXNrL3ZpZXcvY29udGVudCc7XHJcbmltcG9ydCB7IEZvcmVjYXN0Q29tcG9uZW50IH0gZnJvbSAnQC9jb21wb25lbnRzL2ZlYXR1cmVzL3Rhc2svdmlldy9mb3JlY2FzdCc7XHJcbmltcG9ydCB7IFRhZ3NDb21wb25lbnQgfSBmcm9tICdAL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay92aWV3L3RhZ3MnO1xyXG5pbXBvcnQgeyBQcm9qZWN0c0NvbXBvbmVudCB9IGZyb20gJ0AvY29tcG9uZW50cy9mZWF0dXJlcy90YXNrL3ZpZXcvcHJvamVjdHMnO1xyXG5pbXBvcnQgeyBSZXZpZXdDb21wb25lbnQgfSBmcm9tICdAL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay92aWV3L3Jldmlldyc7XHJcbmltcG9ydCB7IENhbGVuZGFyQ29tcG9uZW50LCBDYWxlbmRhckV2ZW50IH0gZnJvbSAnQC9jb21wb25lbnRzL2ZlYXR1cmVzL2NhbGVuZGFyJztcclxuaW1wb3J0IHsgS2FuYmFuQ29tcG9uZW50IH0gZnJvbSAnQC9jb21wb25lbnRzL2ZlYXR1cmVzL2thbmJhbi9rYW5iYW4nO1xyXG5pbXBvcnQgeyBHYW50dENvbXBvbmVudCB9IGZyb20gJ0AvY29tcG9uZW50cy9mZWF0dXJlcy9nYW50dC9nYW50dCc7XHJcbmltcG9ydCB7IFF1YWRyYW50Q29tcG9uZW50IH0gZnJvbSAnQC9jb21wb25lbnRzL2ZlYXR1cmVzL3F1YWRyYW50L3F1YWRyYW50JztcclxuaW1wb3J0IHsgVGFza1Byb3BlcnR5VHdvQ29sdW1uVmlldyB9IGZyb20gJ0AvY29tcG9uZW50cy9mZWF0dXJlcy90YXNrL3ZpZXcvVGFza1Byb3BlcnR5VHdvQ29sdW1uVmlldyc7XHJcbmltcG9ydCB7IFZpZXdDb21wb25lbnRNYW5hZ2VyIH0gZnJvbSAnQC9jb21wb25lbnRzL3VpJztcclxuaW1wb3J0IHsgSGFiaXQgYXMgSGFiaXRzQ29tcG9uZW50IH0gZnJvbSAnQC9jb21wb25lbnRzL2ZlYXR1cmVzL2hhYml0L2hhYml0JztcclxuaW1wb3J0IHsgY3JlYXRlVGFza0NoZWNrYm94LCBUYXNrRGV0YWlsc0NvbXBvbmVudCB9IGZyb20gJ0AvY29tcG9uZW50cy9mZWF0dXJlcy90YXNrL3ZpZXcvZGV0YWlscyc7XHJcbmltcG9ydCB7IFF1aWNrQ2FwdHVyZU1vZGFsIH0gZnJvbSAnQC9jb21wb25lbnRzL2ZlYXR1cmVzL3F1aWNrLWNhcHR1cmUvbW9kYWxzL1F1aWNrQ2FwdHVyZU1vZGFsJztcclxuaW1wb3J0IHsgdCB9IGZyb20gJ0AvdHJhbnNsYXRpb25zL2hlbHBlcic7XHJcbmltcG9ydCB7XHJcblx0Z2V0Vmlld1NldHRpbmdPckRlZmF1bHQsXHJcblx0S2FuYmFuQ29sdW1uQ29uZmlnLFxyXG5cdFR3b0NvbHVtblNwZWNpZmljQ29uZmlnLFxyXG5cdFZpZXdNb2RlLFxyXG59IGZyb20gJ0AvY29tbW9uL3NldHRpbmctZGVmaW5pdGlvbic7XHJcbmltcG9ydCB7IGZpbHRlclRhc2tzIH0gZnJvbSAnQC91dGlscy90YXNrL3Rhc2stZmlsdGVyLXV0aWxzJztcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tICcuLi8uLi9pbmRleCc7XHJcbmltcG9ydCB7IFJvb3RGaWx0ZXJTdGF0ZSwgfSBmcm9tICdAL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay9maWx0ZXIvVmlld1Rhc2tGaWx0ZXInO1xyXG5pbXBvcnQgeyBERUZBVUxUX0ZJTEVfVEFTS19NQVBQSU5HIH0gZnJvbSAnQC9tYW5hZ2Vycy9maWxlLXRhc2stbWFuYWdlcic7XHJcblxyXG5leHBvcnQgY29uc3QgVGFza0Jhc2VzVmlld1R5cGUgPSAndGFzay1nZW5pdXMnO1xyXG5cclxuLyoqXHJcbiAqIEFkYXB0ZXIgY2xhc3MgdGhhdCBicmlkZ2VzIFRhc2sgR2VuaXVzIHZpZXdzIHdpdGggQmFzZXMgcGx1Z2luIEFQSVxyXG4gKiBFbmFibGVzIGFsbCBUYXNrIEdlbml1cyB2aWV3cyB0byBiZSB1c2VkIGFzIEJhc2VzIHZpZXdzXHJcbiAqL1xyXG50eXBlIFZpZXdDb21wb25lbnRJbnN0YW5jZSA9IHtcclxuXHRjb250YWluZXJFbDogSFRNTEVsZW1lbnQ7XHJcblx0c2V0VGFza3M/OiAoLi4uYXJnczogYW55W10pID0+IHZvaWQ7XHJcblx0dXBkYXRlVGFza3M/OiAoLi4uYXJnczogYW55W10pID0+IHZvaWQ7XHJcblx0c2V0Vmlld01vZGU/OiAodmlld01vZGU6IFZpZXdNb2RlLCBwcm9qZWN0Pzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZDtcclxuXHQvLyBTb21lIHZpZXcgY29tcG9uZW50cyBleHBvc2UgZXh0cmEgbWV0aG9kczsga2VlcCB0aGVtIG9wdGlvbmFsIGFuZCBkdWNrLXR5cGVkXHJcblx0cmVmcmVzaFJldmlld1NldHRpbmdzPzogKCkgPT4gdm9pZDtcclxufTtcclxuXHJcbmV4cG9ydCBjbGFzcyBUYXNrQmFzZXNWaWV3IGV4dGVuZHMgQmFzZXNWaWV3IHtcclxuXHR0eXBlID0gVGFza0Jhc2VzVmlld1R5cGU7XHJcblx0c2Nyb2xsRWw6IEhUTUxFbGVtZW50O1xyXG5cdGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudDtcclxuXHRyb290Q29udGFpbmVyRWw6IEhUTUxFbGVtZW50O1xyXG5cclxuXHQvLyBDb21wb25lbnQgcmVmZXJlbmNlc1xyXG5cdHByaXZhdGUgZGV0YWlsc0NvbXBvbmVudDogVGFza0RldGFpbHNDb21wb25lbnQ7XHJcblx0cHJpdmF0ZSB2aWV3Q29tcG9uZW50TWFuYWdlcjogVmlld0NvbXBvbmVudE1hbmFnZXI7XHJcblx0cHJpdmF0ZSB0d29Db2x1bW5WaWV3Q29tcG9uZW50czogTWFwPHN0cmluZywgVGFza1Byb3BlcnR5VHdvQ29sdW1uVmlldz4gPSBuZXcgTWFwKCk7XHJcblxyXG5cdC8vIFN0YXRlIG1hbmFnZW1lbnRcclxuXHRwcml2YXRlIGN1cnJlbnRWaWV3SWQ6IFZpZXdNb2RlID0gJ2luYm94JztcclxuXHRwcml2YXRlIGZvcmNlZFZpZXdNb2RlOiBWaWV3TW9kZSB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgYWN0aXZlQ29tcG9uZW50OiB7IGtleTogc3RyaW5nOyBpbnN0YW5jZTogVmlld0NvbXBvbmVudEluc3RhbmNlIH0gfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIGN1cnJlbnRQcm9qZWN0Pzogc3RyaW5nIHwgbnVsbDtcclxuXHRwcml2YXRlIGN1cnJlbnRTZWxlY3RlZFRhc2tJZDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBpc0RldGFpbHNWaXNpYmxlID0gZmFsc2U7XHJcblx0cHJpdmF0ZSBkZXRhaWxzVG9nZ2xlQnRuOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIGN1cnJlbnRGaWx0ZXJTdGF0ZTogUm9vdEZpbHRlclN0YXRlIHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBsaXZlRmlsdGVyU3RhdGU6IFJvb3RGaWx0ZXJTdGF0ZSB8IG51bGwgPSBudWxsO1xyXG5cclxuXHQvLyBEYXRhXHJcblx0cHJpdmF0ZSB0YXNrczogVGFza1tdID0gW107XHJcblxyXG5cdC8vIFByb3BlcnR5IG1hcHBpbmdzIGZvciBCYXNlcyBpbnRlZ3JhdGlvblxyXG5cdHByaXZhdGUgdGFza0NvbnRlbnRQcm9wOiBCYXNlc1Byb3BlcnR5SWQgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIHRhc2tTdGF0dXNQcm9wOiBCYXNlc1Byb3BlcnR5SWQgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIHRhc2tQcmlvcml0eVByb3A6IEJhc2VzUHJvcGVydHlJZCB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgdGFza1Byb2plY3RQcm9wOiBCYXNlc1Byb3BlcnR5SWQgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIHRhc2tUYWdzUHJvcDogQmFzZXNQcm9wZXJ0eUlkIHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSB0YXNrRHVlRGF0ZVByb3A6IEJhc2VzUHJvcGVydHlJZCB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgdGFza1N0YXJ0RGF0ZVByb3A6IEJhc2VzUHJvcGVydHlJZCB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgdGFza0NvbXBsZXRlZERhdGVQcm9wOiBCYXNlc1Byb3BlcnR5SWQgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIHRhc2tDb250ZXh0UHJvcDogQmFzZXNQcm9wZXJ0eUlkIHwgbnVsbCA9IG51bGw7XHJcblxyXG5cdC8vIFZpZXctc3BlY2lmaWMgY29uZmlndXJhdGlvbnMgbG9hZGVkIGZyb20gQmFzZXMgY29uZmlnXHJcblx0cHJpdmF0ZSB2aWV3Q29uZmlnOiB7XHJcblx0XHRrYW5iYW4/OiB7XHJcblx0XHRcdGdyb3VwQnk6IHN0cmluZztcclxuXHRcdFx0Y3VzdG9tQ29sdW1ucz86IEthbmJhbkNvbHVtbkNvbmZpZ1tdO1xyXG5cdFx0XHRoaWRlRW1wdHlDb2x1bW5zOiBib29sZWFuO1xyXG5cdFx0XHRkZWZhdWx0U29ydEZpZWxkOiBzdHJpbmc7XHJcblx0XHRcdGRlZmF1bHRTb3J0T3JkZXI6ICdhc2MnIHwgJ2Rlc2MnO1xyXG5cdFx0fTtcclxuXHRcdGNhbGVuZGFyPzoge1xyXG5cdFx0XHRmaXJzdERheU9mV2Vlaz86IG51bWJlcjtcclxuXHRcdFx0aGlkZVdlZWtlbmRzPzogYm9vbGVhbjtcclxuXHRcdH07XHJcblx0XHRnYW50dD86IHtcclxuXHRcdFx0c2hvd1Rhc2tMYWJlbHM6IGJvb2xlYW47XHJcblx0XHRcdHVzZU1hcmtkb3duUmVuZGVyZXI6IGJvb2xlYW47XHJcblx0XHR9O1xyXG5cdFx0Zm9yZWNhc3Q/OiB7XHJcblx0XHRcdGZpcnN0RGF5T2ZXZWVrPzogbnVtYmVyO1xyXG5cdFx0XHRoaWRlV2Vla2VuZHM/OiBib29sZWFuO1xyXG5cdFx0fTtcclxuXHRcdHF1YWRyYW50Pzoge1xyXG5cdFx0XHR1cmdlbnRUYWc6IHN0cmluZztcclxuXHRcdFx0aW1wb3J0YW50VGFnOiBzdHJpbmc7XHJcblx0XHRcdHVyZ2VudFRocmVzaG9sZERheXM6IG51bWJlcjtcclxuXHRcdFx0dXNlUHJpb3JpdHlGb3JDbGFzc2lmaWNhdGlvbjogYm9vbGVhbjtcclxuXHRcdFx0dXJnZW50UHJpb3JpdHlUaHJlc2hvbGQ/OiBudW1iZXI7XHJcblx0XHRcdGltcG9ydGFudFByaW9yaXR5VGhyZXNob2xkPzogbnVtYmVyO1xyXG5cdFx0fTtcclxuXHR9ID0ge307XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0Y29udHJvbGxlcjogUXVlcnlDb250cm9sbGVyLFxyXG5cdFx0c2Nyb2xsRWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0cHJpdmF0ZSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdGluaXRpYWxWaWV3TW9kZT86IFZpZXdNb2RlXHJcblx0KSB7XHJcblx0XHRzdXBlcihjb250cm9sbGVyKTtcclxuXHRcdGlmIChpbml0aWFsVmlld01vZGUpIHtcclxuXHRcdFx0dGhpcy5jdXJyZW50Vmlld0lkID0gaW5pdGlhbFZpZXdNb2RlO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5zY3JvbGxFbCA9IHNjcm9sbEVsO1xyXG5cdFx0dGhpcy5jb250YWluZXJFbCA9IHNjcm9sbEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogJ3Rhc2stZ2VuaXVzLWJhc2VzLWNvbnRhaW5lciB0YXNrLWdlbml1cy12aWV3JyxcclxuXHRcdFx0YXR0cjoge3RhYkluZGV4OiAwfVxyXG5cdFx0fSk7XHJcblx0XHR0aGlzLnJvb3RDb250YWluZXJFbCA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiAndGFzay1nZW5pdXMtY29udGFpbmVyIG5vLXNpZGViYXInLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBjb21wb25lbnRzXHJcblx0XHR0aGlzLmluaXRpYWxpemVDb21wb25lbnRzKCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBMb2NrIHRoZSB2aWV3IHRvIGEgc3BlY2lmaWMgbW9kZSAodXNlZCBieSBzcGVjaWFsaXplZCBCYXNlcyBpbnRlZ3JhdGlvbnMpXHJcblx0ICovXHJcblx0cHVibGljIHNldEZvcmNlZFZpZXdNb2RlKHZpZXdNb2RlOiBWaWV3TW9kZSkge1xyXG5cdFx0dGhpcy5mb3JjZWRWaWV3TW9kZSA9IHZpZXdNb2RlO1xyXG5cdFx0dGhpcy5jdXJyZW50Vmlld0lkID0gdmlld01vZGU7XHJcblx0fVxyXG5cclxuXHRvbmxvYWQoKTogdm9pZCB7XHJcblx0XHQvLyBOb3RlOiBEb24ndCBsb2FkIGNvbmZpZyBoZXJlIC0gQmFzZXMgY29uZmlnIG9iamVjdCBpcyBub3QgcmVhZHkgeWV0LlxyXG5cdFx0Ly8gQ29uZmlnIHdpbGwgYmUgbG9hZGVkIGluIG9uRGF0YVVwZGF0ZWQoKSB3aGVuIEJhc2VzIGNhbGxzIGl0IHdpdGggZGF0YS5cclxuXHJcblx0XHQvLyBSZWdpc3RlciBldmVudCBsaXN0ZW5lcnNcclxuXHRcdHRoaXMucmVnaXN0ZXJFdmVudChcclxuXHRcdFx0dGhpcy5hcHAud29ya3NwYWNlLm9uKFxyXG5cdFx0XHRcdCd0YXNrLWdlbml1czp0YXNrLWNhY2hlLXVwZGF0ZWQnLFxyXG5cdFx0XHRcdGRlYm91bmNlKGFzeW5jICgpID0+IHtcclxuXHRcdFx0XHRcdGF3YWl0IHRoaXMubG9hZFRhc2tzKCk7XHJcblx0XHRcdFx0fSwgMTUwKVxyXG5cdFx0XHQpXHJcblx0XHQpO1xyXG5cclxuXHRcdHRoaXMucmVnaXN0ZXJFdmVudChcclxuXHRcdFx0dGhpcy5hcHAud29ya3NwYWNlLm9uKFxyXG5cdFx0XHRcdCd0YXNrLWdlbml1czpmaWx0ZXItY2hhbmdlZCcsXHJcblx0XHRcdFx0KGZpbHRlclN0YXRlOiBSb290RmlsdGVyU3RhdGUsIGxlYWZJZD86IHN0cmluZykgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gSGFuZGxlIGZpbHRlciBjaGFuZ2VzIGZvciB0aGlzIHZpZXdcclxuXHRcdFx0XHRcdGlmIChsZWFmSWQgPT09IHRoaXMuY29udGFpbmVyRWwuZ2V0QXR0cmlidXRlKCdkYXRhLWxlYWYtaWQnKSkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLmxpdmVGaWx0ZXJTdGF0ZSA9IGZpbHRlclN0YXRlO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmN1cnJlbnRGaWx0ZXJTdGF0ZSA9IGZpbHRlclN0YXRlO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmFwcGx5Q3VycmVudEZpbHRlcigpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0KVxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdG9udW5sb2FkKCk6IHZvaWQge1xyXG5cdFx0Ly8gQ2xlYW51cCBhY3RpdmUgY29tcG9uZW50XHJcblx0XHRpZiAodGhpcy5hY3RpdmVDb21wb25lbnQ/Lmluc3RhbmNlKSB7XHJcblx0XHRcdGNvbnN0IGluc3RhbmNlID0gdGhpcy5hY3RpdmVDb21wb25lbnQuaW5zdGFuY2U7XHJcblx0XHRcdGlmIChpbnN0YW5jZS5jb250YWluZXJFbCkge1xyXG5cdFx0XHRcdGluc3RhbmNlLmNvbnRhaW5lckVsLnJlbW92ZSgpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmICh0eXBlb2YgKGluc3RhbmNlIGFzIGFueSkudW5sb2FkID09PSAnZnVuY3Rpb24nKSB7XHJcblx0XHRcdFx0dGhpcy5yZW1vdmVDaGlsZChpbnN0YW5jZSBhcyBhbnkpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2xlYW51cCB0d28tY29sdW1uIGNvbXBvbmVudHNcclxuXHRcdHRoaXMudHdvQ29sdW1uVmlld0NvbXBvbmVudHMuZm9yRWFjaCgoY29tcG9uZW50KSA9PiB7XHJcblx0XHRcdHRoaXMucmVtb3ZlQ2hpbGQoY29tcG9uZW50KTtcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy50d29Db2x1bW5WaWV3Q29tcG9uZW50cy5jbGVhcigpO1xyXG5cclxuXHRcdGlmICh0aGlzLnJvb3RDb250YWluZXJFbCkge1xyXG5cdFx0XHR0aGlzLnJvb3RDb250YWluZXJFbC5lbXB0eSgpO1xyXG5cdFx0XHR0aGlzLnJvb3RDb250YWluZXJFbC5kZXRhY2goKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENhbGxlZCB3aGVuIEJhc2VzIGRhdGEgb3IgY29uZmlndXJhdGlvbiBpcyB1cGRhdGVkXHJcblx0ICpcclxuXHQgKiBUaGlzIG1ldGhvZCBpcyB0cmlnZ2VyZWQgYnkgQmFzZXMgcGx1Z2luIHdoZW46XHJcblx0ICogMS4gVGhlIHVuZGVybHlpbmcgZGF0YSBjaGFuZ2VzXHJcblx0ICogMi4gVmlldyBjb25maWd1cmF0aW9uIGlzIG1vZGlmaWVkIGJ5IHVzZXJcclxuXHQgKlxyXG5cdCAqIEl0IHJlbG9hZHMgY29uZmlndXJhdGlvbiBmcm9tIHZpZXcgY29uZmlnIGFuZCByZWZyZXNoZXMgdGhlIHZpZXdcclxuXHQgKi9cclxuXHRwdWJsaWMgb25EYXRhVXBkYXRlZCgpOiB2b2lkIHtcclxuXHRcdC8vIFJlbG9hZCBhbGwgY29uZmlndXJhdGlvbnMgZnJvbSBCYXNlcyB2aWV3IGNvbmZpZ1xyXG5cdFx0Ly8gVGhpcyBpbmNsdWRlcyBwcm9wZXJ0eSBtYXBwaW5ncyBhbmQgdmlldy1zcGVjaWZpYyBzZXR0aW5nc1xyXG5cdFx0dGhpcy5sb2FkQ29uZmlnKCk7XHJcblxyXG5cdFx0aWYgKHRoaXMuZGF0YSkge1xyXG5cdFx0XHQvLyBDb252ZXJ0IEJhc2VzIGVudHJpZXMgdG8gdGFza3NcclxuXHRcdFx0dGhpcy50YXNrcyA9IHRoaXMuY29udmVydEJhc2VzRW50cmllc1RvVGFza3ModGhpcy5kYXRhLmRhdGEpO1xyXG5cclxuXHRcdFx0Ly8gRm9yY2UgcmVmcmVzaCB0aGUgY3VycmVudCB2aWV3IHdpdGggbmV3IGNvbmZpZ3VyYXRpb24gYW5kIHRhc2tzXHJcblx0XHRcdC8vIFRoZSBmb3JjZVJlZnJlc2g9dHJ1ZSBlbnN1cmVzIGNvbXBvbmVudHMgcmVyZW5kZXIgZXZlbiBpZiBkYXRhIGhhc24ndCBjaGFuZ2VkXHJcblx0XHRcdHRoaXMuc3dpdGNoVmlldyh0aGlzLmN1cnJlbnRWaWV3SWQsIHRoaXMuY3VycmVudFByb2plY3QsIHRydWUpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2FmZWx5IHJldHJpZXZlIHRoZSBCYXNlcyBjb25maWcuIFJldHVybnMgbnVsbCBpZiBpdCdzIG5vdCB3aXJlZCB1cCB5ZXQuXHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZXRCYXNlc0NvbmZpZygpOiBCYXNlc1ZpZXdDb25maWcgfCBudWxsIHtcclxuXHRcdGNvbnN0IGNvbmZpZyA9IHRoaXMuY29uZmlnO1xyXG5cdFx0aWYgKCFjb25maWcpIHtcclxuXHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gY29uZmlnO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTG9hZCBhbGwgY29uZmlndXJhdGlvbnMgZnJvbSBCYXNlcyB2aWV3IGNvbmZpZ1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgbG9hZENvbmZpZygpOiB2b2lkIHtcclxuXHRcdGNvbnN0IGNvbmZpZyA9IHRoaXMuZ2V0QmFzZXNDb25maWcoKTtcclxuXHRcdGlmICghY29uZmlnKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zb2xlLmxvZyhjb25maWcsIFwiYmFzZWQgY29uZmlnXCIpO1xyXG5cclxuXHRcdC8vIEVuc3VyZSBmb3JjZWQgdmlldyBtb2RlIHN0YXlzIGluIHN5bmMgd2l0aCB0aGUgc2F2ZWQgY29uZmlnXHJcblx0XHR0aGlzLmFwcGx5Rm9yY2VkVmlld01vZGVDb25maWcoY29uZmlnKTtcclxuXHJcblx0XHQvLyBMb2FkIHByb3BlcnR5IG1hcHBpbmdzXHJcblx0XHR0aGlzLmxvYWRQcm9wZXJ0eU1hcHBpbmdzKGNvbmZpZyk7XHJcblxyXG5cdFx0Ly8gTG9hZCB2aWV3IG1vZGVcclxuXHRcdGNvbnN0IHZpZXdNb2RlID0gY29uZmlnLmdldCgndmlld01vZGUnKTtcclxuXHRcdGlmICh0aGlzLmZvcmNlZFZpZXdNb2RlKSB7XHJcblx0XHRcdHRoaXMuY3VycmVudFZpZXdJZCA9IHRoaXMuZm9yY2VkVmlld01vZGU7XHJcblx0XHR9IGVsc2UgaWYgKHZpZXdNb2RlICYmIHR5cGVvZiB2aWV3TW9kZSA9PT0gJ3N0cmluZycpIHtcclxuXHRcdFx0dGhpcy5jdXJyZW50Vmlld0lkID0gdmlld01vZGUgYXMgVmlld01vZGU7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gTG9hZCB2aWV3LXNwZWNpZmljIGNvbmZpZ3VyYXRpb25zXHJcblx0XHR0aGlzLmxvYWRWaWV3U3BlY2lmaWNDb25maWcoY29uZmlnKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIExvYWQgcHJvcGVydHkgbWFwcGluZ3MgZnJvbSBCYXNlcyBjb25maWd1cmF0aW9uXHJcblx0ICogVXNlcyBERUZBVUxUX0ZJTEVfVEFTS19NQVBQSU5HIGFzIHRoZSBzb3VyY2UgZm9yIGRlZmF1bHQgdmFsdWVzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBsb2FkUHJvcGVydHlNYXBwaW5ncyhjb25maWc6IEJhc2VzVmlld0NvbmZpZyk6IHZvaWQge1xyXG5cdFx0Ly8gTWFwIGZyb20gb3VyIEJhc2VzIGNvbmZpZyBrZXlzIHRvIERFRkFVTFRfRklMRV9UQVNLX01BUFBJTkcgcHJvcGVydGllc1xyXG5cdFx0Ly8gRm9yIEJhc2VzIGludGVncmF0aW9uLCB3ZSBuZWVkIHRvIHVzZSAnbm90ZS54eHgnIGZvcm1hdCBmb3IgcHJvcGVydGllc1xyXG5cdFx0Ly8gdW5sZXNzIGl0J3MgYSBzcGVjaWFsIHByb3BlcnR5IGxpa2UgZmlsZS5iYXNlbmFtZVxyXG5cdFx0Y29uc3QgZGVmYXVsdHMgPSB7XHJcblx0XHRcdHRhc2tDb250ZW50OiAnZmlsZS5iYXNlbmFtZScsIC8vIFNwZWNpYWwgY2FzZTogdXNlIGZpbGUgbmFtZSBhcyBjb250ZW50IGJ5IGRlZmF1bHRcclxuXHRcdFx0dGFza1N0YXR1czogYG5vdGUuJHtERUZBVUxUX0ZJTEVfVEFTS19NQVBQSU5HLnN0YXR1c1Byb3BlcnR5fWAsXHJcblx0XHRcdHRhc2tQcmlvcml0eTogYG5vdGUuJHtERUZBVUxUX0ZJTEVfVEFTS19NQVBQSU5HLnByaW9yaXR5UHJvcGVydHl9YCxcclxuXHRcdFx0dGFza1Byb2plY3Q6IGBub3RlLiR7REVGQVVMVF9GSUxFX1RBU0tfTUFQUElORy5wcm9qZWN0UHJvcGVydHl9YCxcclxuXHRcdFx0dGFza1RhZ3M6IGBub3RlLiR7REVGQVVMVF9GSUxFX1RBU0tfTUFQUElORy50YWdzUHJvcGVydHl9YCxcclxuXHRcdFx0dGFza0R1ZURhdGU6IGBub3RlLiR7REVGQVVMVF9GSUxFX1RBU0tfTUFQUElORy5kdWVEYXRlUHJvcGVydHl9YCxcclxuXHRcdFx0dGFza1N0YXJ0RGF0ZTogYG5vdGUuJHtERUZBVUxUX0ZJTEVfVEFTS19NQVBQSU5HLnN0YXJ0RGF0ZVByb3BlcnR5fWAsXHJcblx0XHRcdHRhc2tDb21wbGV0ZWREYXRlOiBgbm90ZS4ke0RFRkFVTFRfRklMRV9UQVNLX01BUFBJTkcuY29tcGxldGVkRGF0ZVByb3BlcnR5fWAsXHJcblx0XHRcdHRhc2tDb250ZXh0OiBgbm90ZS4ke0RFRkFVTFRfRklMRV9UQVNLX01BUFBJTkcuY29udGV4dFByb3BlcnR5fWAsXHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIEFwcGx5IGRlZmF1bHRzIGlmIG5vdCBhbHJlYWR5IGNvbmZpZ3VyZWRcclxuXHRcdC8vIFRoaXMgZW5zdXJlcyBwcm9wZXJ0eSBtYXBwaW5ncyB3b3JrIGV2ZW4gd2hlbiB1c2VyIGhhc24ndCBleHBsaWNpdGx5IHNldCB0aGVtXHJcblx0XHRmb3IgKGNvbnN0IFtrZXksIGRlZmF1bHRWYWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMoZGVmYXVsdHMpKSB7XHJcblx0XHRcdGNvbnN0IGN1cnJlbnRWYWx1ZSA9IGNvbmZpZy5nZXQoa2V5KTtcclxuXHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA9PT0gdW5kZWZpbmVkIHx8IGN1cnJlbnRWYWx1ZSA9PT0gbnVsbCB8fCBjdXJyZW50VmFsdWUgPT09ICcnKSB7XHJcblx0XHRcdFx0Y29uZmlnLnNldChrZXksIGRlZmF1bHRWYWx1ZSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBOb3cgbG9hZCBwcm9wZXJ0eSBtYXBwaW5ncyAtIHRoZXNlIHNob3VsZCBhbHdheXMgaGF2ZSB2YWx1ZXMgZHVlIHRvIGRlZmF1bHRzIGFib3ZlXHJcblx0XHR0aGlzLnRhc2tDb250ZW50UHJvcCA9IGNvbmZpZy5nZXRBc1Byb3BlcnR5SWQoJ3Rhc2tDb250ZW50Jyk7XHJcblx0XHR0aGlzLnRhc2tTdGF0dXNQcm9wID0gY29uZmlnLmdldEFzUHJvcGVydHlJZCgndGFza1N0YXR1cycpO1xyXG5cdFx0dGhpcy50YXNrUHJpb3JpdHlQcm9wID0gY29uZmlnLmdldEFzUHJvcGVydHlJZCgndGFza1ByaW9yaXR5Jyk7XHJcblx0XHR0aGlzLnRhc2tQcm9qZWN0UHJvcCA9IGNvbmZpZy5nZXRBc1Byb3BlcnR5SWQoJ3Rhc2tQcm9qZWN0Jyk7XHJcblx0XHR0aGlzLnRhc2tUYWdzUHJvcCA9IGNvbmZpZy5nZXRBc1Byb3BlcnR5SWQoJ3Rhc2tUYWdzJyk7XHJcblx0XHR0aGlzLnRhc2tEdWVEYXRlUHJvcCA9IGNvbmZpZy5nZXRBc1Byb3BlcnR5SWQoJ3Rhc2tEdWVEYXRlJyk7XHJcblx0XHR0aGlzLnRhc2tTdGFydERhdGVQcm9wID0gY29uZmlnLmdldEFzUHJvcGVydHlJZCgndGFza1N0YXJ0RGF0ZScpO1xyXG5cdFx0dGhpcy50YXNrQ29tcGxldGVkRGF0ZVByb3AgPSBjb25maWcuZ2V0QXNQcm9wZXJ0eUlkKCd0YXNrQ29tcGxldGVkRGF0ZScpO1xyXG5cdFx0dGhpcy50YXNrQ29udGV4dFByb3AgPSBjb25maWcuZ2V0QXNQcm9wZXJ0eUlkKCd0YXNrQ29udGV4dCcpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTG9hZCB2aWV3LXNwZWNpZmljIGNvbmZpZ3VyYXRpb25zXHJcblx0ICovXHJcblx0cHJpdmF0ZSBsb2FkVmlld1NwZWNpZmljQ29uZmlnKGNvbmZpZzogQmFzZXNWaWV3Q29uZmlnKTogdm9pZCB7XHJcblx0XHQvLyBMb2FkIEthbmJhbiBjb25maWdcclxuXHRcdHRoaXMudmlld0NvbmZpZy5rYW5iYW4gPSB7XHJcblx0XHRcdGdyb3VwQnk6IHRoaXMuZ2V0U3RyaW5nQ29uZmlnKGNvbmZpZywgJ3RnX2dyb3VwQnknLCAnc3RhdHVzJyksXHJcblx0XHRcdGN1c3RvbUNvbHVtbnM6IHRoaXMuZ2V0Q3VzdG9tQ29sdW1uc0NvbmZpZyhjb25maWcsICdjdXN0b21Db2x1bW5zJyksXHJcblx0XHRcdGhpZGVFbXB0eUNvbHVtbnM6IHRoaXMuZ2V0Qm9vbGVhbkNvbmZpZyhjb25maWcsICdoaWRlRW1wdHlDb2x1bW5zJywgZmFsc2UpLFxyXG5cdFx0XHRkZWZhdWx0U29ydEZpZWxkOiB0aGlzLmdldFN0cmluZ0NvbmZpZyhjb25maWcsICdkZWZhdWx0U29ydEZpZWxkJywgJ3ByaW9yaXR5JyksXHJcblx0XHRcdGRlZmF1bHRTb3J0T3JkZXI6IHRoaXMuZ2V0U3RyaW5nQ29uZmlnKGNvbmZpZywgJ2RlZmF1bHRTb3J0T3JkZXInLCAnZGVzYycpIGFzICdhc2MnIHwgJ2Rlc2MnXHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIExvYWQgQ2FsZW5kYXIgY29uZmlnXHJcblx0XHR0aGlzLnZpZXdDb25maWcuY2FsZW5kYXIgPSB7XHJcblx0XHRcdGZpcnN0RGF5T2ZXZWVrOiB0aGlzLmdldE51bWVyaWNDb25maWcoY29uZmlnLCAnZmlyc3REYXlPZldlZWsnKSxcclxuXHRcdFx0aGlkZVdlZWtlbmRzOiB0aGlzLmdldEJvb2xlYW5Db25maWcoY29uZmlnLCAnaGlkZVdlZWtlbmRzJywgZmFsc2UpXHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIExvYWQgR2FudHQgY29uZmlnXHJcblx0XHR0aGlzLnZpZXdDb25maWcuZ2FudHQgPSB7XHJcblx0XHRcdHNob3dUYXNrTGFiZWxzOiB0aGlzLmdldEJvb2xlYW5Db25maWcoY29uZmlnLCAnc2hvd1Rhc2tMYWJlbHMnLCB0cnVlKSxcclxuXHRcdFx0dXNlTWFya2Rvd25SZW5kZXJlcjogdGhpcy5nZXRCb29sZWFuQ29uZmlnKGNvbmZpZywgJ3VzZU1hcmtkb3duUmVuZGVyZXInLCBmYWxzZSlcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gTG9hZCBGb3JlY2FzdCBjb25maWdcclxuXHRcdHRoaXMudmlld0NvbmZpZy5mb3JlY2FzdCA9IHtcclxuXHRcdFx0Zmlyc3REYXlPZldlZWs6IHRoaXMuZ2V0TnVtZXJpY0NvbmZpZyhjb25maWcsICdmaXJzdERheU9mV2VlaycpLFxyXG5cdFx0XHRoaWRlV2Vla2VuZHM6IHRoaXMuZ2V0Qm9vbGVhbkNvbmZpZyhjb25maWcsICdoaWRlV2Vla2VuZHMnLCBmYWxzZSlcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gTG9hZCBRdWFkcmFudCBjb25maWdcclxuXHRcdHRoaXMudmlld0NvbmZpZy5xdWFkcmFudCA9IHtcclxuXHRcdFx0dXJnZW50VGFnOiB0aGlzLmdldFN0cmluZ0NvbmZpZyhjb25maWcsICd1cmdlbnRUYWcnLCAnI3VyZ2VudCcpLFxyXG5cdFx0XHRpbXBvcnRhbnRUYWc6IHRoaXMuZ2V0U3RyaW5nQ29uZmlnKGNvbmZpZywgJ2ltcG9ydGFudFRhZycsICcjaW1wb3J0YW50JyksXHJcblx0XHRcdHVyZ2VudFRocmVzaG9sZERheXM6IHRoaXMuZ2V0TnVtZXJpY0NvbmZpZyhjb25maWcsICd1cmdlbnRUaHJlc2hvbGREYXlzJywgMykgfHwgMyxcclxuXHRcdFx0dXNlUHJpb3JpdHlGb3JDbGFzc2lmaWNhdGlvbjogdGhpcy5nZXRCb29sZWFuQ29uZmlnKGNvbmZpZywgJ3VzZVByaW9yaXR5Rm9yQ2xhc3NpZmljYXRpb24nLCBmYWxzZSksXHJcblx0XHRcdHVyZ2VudFByaW9yaXR5VGhyZXNob2xkOiB0aGlzLmdldE51bWVyaWNDb25maWcoY29uZmlnLCAndXJnZW50UHJpb3JpdHlUaHJlc2hvbGQnKSxcclxuXHRcdFx0aW1wb3J0YW50UHJpb3JpdHlUaHJlc2hvbGQ6IHRoaXMuZ2V0TnVtZXJpY0NvbmZpZyhjb25maWcsICdpbXBvcnRhbnRQcmlvcml0eVRocmVzaG9sZCcpLFxyXG5cdFx0fTtcclxuXHJcblxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRW5zdXJlIGZvcmNlZCB2aWV3IG1vZGUgaXMgcmVmbGVjdGVkIGluIHRoZSBwZXJzaXN0ZWQgY29uZmlnXHJcblx0ICogYmVmb3JlIG90aGVyIGNvbmZpZ3VyYXRpb24gbG9naWMgcnVucy5cclxuXHQgKi9cclxuXHRwcml2YXRlIGFwcGx5Rm9yY2VkVmlld01vZGVDb25maWcoY29uZmlnPzogQmFzZXNWaWV3Q29uZmlnKTogdm9pZCB7XHJcblx0XHRpZiAoIXRoaXMuZm9yY2VkVmlld01vZGUpIHtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IGJhc2VzQ29uZmlnID0gY29uZmlnID8/IHRoaXMuZ2V0QmFzZXNDb25maWcoKTtcclxuXHRcdGlmIChcclxuXHRcdFx0IWJhc2VzQ29uZmlnIHx8XHJcblx0XHRcdHR5cGVvZiBiYXNlc0NvbmZpZy5nZXQgIT09ICdmdW5jdGlvbicgfHxcclxuXHRcdFx0dHlwZW9mIGJhc2VzQ29uZmlnLnNldCAhPT0gJ2Z1bmN0aW9uJ1xyXG5cdFx0KSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBjdXJyZW50VmFsdWUgPSBiYXNlc0NvbmZpZy5nZXQoJ3ZpZXdNb2RlJyk7XHJcblx0XHRpZiAoY3VycmVudFZhbHVlICE9PSB0aGlzLmZvcmNlZFZpZXdNb2RlKSB7XHJcblx0XHRcdGJhc2VzQ29uZmlnLnNldCgndmlld01vZGUnLCB0aGlzLmZvcmNlZFZpZXdNb2RlKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhlbHBlciBtZXRob2QgdG8gZ2V0IG51bWVyaWMgY29uZmlnIHZhbHVlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZXROdW1lcmljQ29uZmlnKGNvbmZpZzogQmFzZXNWaWV3Q29uZmlnLCBrZXk6IHN0cmluZywgZGVmYXVsdFZhbHVlPzogbnVtYmVyKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcclxuXHRcdGNvbnN0IHZhbHVlID0gY29uZmlnLmdldChrZXkpO1xyXG5cdFx0aWYgKHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwgJiYgdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xyXG5cdFx0XHRyZXR1cm4gdmFsdWU7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gZGVmYXVsdFZhbHVlO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSGVscGVyIG1ldGhvZCB0byBnZXQgc3RyaW5nIGNvbmZpZyB2YWx1ZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZ2V0U3RyaW5nQ29uZmlnKGNvbmZpZzogQmFzZXNWaWV3Q29uZmlnLCBrZXk6IHN0cmluZywgZGVmYXVsdFZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgdmFsdWUgPSBjb25maWcuZ2V0KGtleSk7XHJcblx0XHRpZiAodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCAmJiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnICYmIHZhbHVlLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0cmV0dXJuIHZhbHVlO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIGRlZmF1bHRWYWx1ZTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhlbHBlciBtZXRob2QgdG8gZ2V0IGJvb2xlYW4gY29uZmlnIHZhbHVlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZXRCb29sZWFuQ29uZmlnKGNvbmZpZzogQmFzZXNWaWV3Q29uZmlnLCBrZXk6IHN0cmluZywgZGVmYXVsdFZhbHVlOiBib29sZWFuKTogYm9vbGVhbiB7XHJcblx0XHRjb25zdCB2YWx1ZSA9IGNvbmZpZy5nZXQoa2V5KTtcclxuXHRcdGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nKSB7XHJcblx0XHRcdHJldHVybiB2YWx1ZTtcclxuXHRcdH1cclxuXHRcdHJldHVybiBkZWZhdWx0VmFsdWU7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBIZWxwZXIgbWV0aG9kIHRvIGdldCBjdXN0b20gY29sdW1ucyBjb25maWdcclxuXHQgKi9cclxuXHRwcml2YXRlIGdldEN1c3RvbUNvbHVtbnNDb25maWcoY29uZmlnOiBCYXNlc1ZpZXdDb25maWcsIGtleTogc3RyaW5nKTogS2FuYmFuQ29sdW1uQ29uZmlnW10gfCB1bmRlZmluZWQge1xyXG5cdFx0Y29uc3QgdmFsdWUgPSBjb25maWcuZ2V0KGtleSk7XHJcblx0XHRpZiAodmFsdWUgJiYgQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcclxuXHRcdFx0cmV0dXJuIHZhbHVlIGFzIEthbmJhbkNvbHVtbkNvbmZpZ1tdO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhlbHBlcjogc3RyaW5nIGNvbmZpZyB3aXRoIGZhbGxiYWNrIGtleVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZ2V0U3RyaW5nQ29uZmlnV2l0aEZhbGxiYWNrKFxyXG5cdFx0Y29uZmlnOiBCYXNlc1ZpZXdDb25maWcsXHJcblx0XHRwcmltYXJ5S2V5OiBzdHJpbmcsXHJcblx0XHRmYWxsYmFja0tleTogc3RyaW5nLFxyXG5cdFx0ZGVmYXVsdFZhbHVlOiBzdHJpbmdcclxuXHQpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgcHJpbWFyeSA9IGNvbmZpZy5nZXQocHJpbWFyeUtleSk7XHJcblx0XHRpZiAodHlwZW9mIHByaW1hcnkgPT09ICdzdHJpbmcnICYmIHByaW1hcnkubGVuZ3RoID4gMCkgcmV0dXJuIHByaW1hcnk7XHJcblx0XHRjb25zdCBmYWxsYmFjayA9IGNvbmZpZy5nZXQoZmFsbGJhY2tLZXkpO1xyXG5cdFx0aWYgKHR5cGVvZiBmYWxsYmFjayA9PT0gJ3N0cmluZycgJiYgZmFsbGJhY2subGVuZ3RoID4gMCkgcmV0dXJuIGZhbGxiYWNrO1xyXG5cdFx0cmV0dXJuIGRlZmF1bHRWYWx1ZTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhlbHBlcjogYm9vbGVhbiBjb25maWcgd2l0aCBmYWxsYmFjayBrZXlcclxuXHQgKi9cclxuXHRwcml2YXRlIGdldEJvb2xlYW5Db25maWdXaXRoRmFsbGJhY2soXHJcblx0XHRjb25maWc6IEJhc2VzVmlld0NvbmZpZyxcclxuXHRcdHByaW1hcnlLZXk6IHN0cmluZyxcclxuXHRcdGZhbGxiYWNrS2V5OiBzdHJpbmcsXHJcblx0XHRkZWZhdWx0VmFsdWU6IGJvb2xlYW5cclxuXHQpOiBib29sZWFuIHtcclxuXHRcdGNvbnN0IHByaW1hcnkgPSBjb25maWcuZ2V0KHByaW1hcnlLZXkpO1xyXG5cdFx0aWYgKHR5cGVvZiBwcmltYXJ5ID09PSAnYm9vbGVhbicpIHJldHVybiBwcmltYXJ5O1xyXG5cdFx0Y29uc3QgZmFsbGJhY2sgPSBjb25maWcuZ2V0KGZhbGxiYWNrS2V5KTtcclxuXHRcdGlmICh0eXBlb2YgZmFsbGJhY2sgPT09ICdib29sZWFuJykgcmV0dXJuIGZhbGxiYWNrO1xyXG5cdFx0cmV0dXJuIGRlZmF1bHRWYWx1ZTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhlbHBlcjogY3VzdG9tIGNvbHVtbnMgY29uZmlnIHdpdGggZmFsbGJhY2sga2V5XHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZXRDdXN0b21Db2x1bW5zQ29uZmlnV2l0aEZhbGxiYWNrKFxyXG5cdFx0Y29uZmlnOiBCYXNlc1ZpZXdDb25maWcsXHJcblx0XHRwcmltYXJ5S2V5OiBzdHJpbmcsXHJcblx0XHRmYWxsYmFja0tleTogc3RyaW5nXHJcblx0KTogS2FuYmFuQ29sdW1uQ29uZmlnW10gfCB1bmRlZmluZWQge1xyXG5cdFx0Y29uc3QgcHJpbWFyeSA9IGNvbmZpZy5nZXQocHJpbWFyeUtleSk7XHJcblx0XHRpZiAocHJpbWFyeSAmJiBBcnJheS5pc0FycmF5KHByaW1hcnkpKSByZXR1cm4gcHJpbWFyeSBhcyBLYW5iYW5Db2x1bW5Db25maWdbXTtcclxuXHRcdGNvbnN0IGZhbGxiYWNrID0gY29uZmlnLmdldChmYWxsYmFja0tleSk7XHJcblx0XHRpZiAoZmFsbGJhY2sgJiYgQXJyYXkuaXNBcnJheShmYWxsYmFjaykpIHJldHVybiBmYWxsYmFjayBhcyBLYW5iYW5Db2x1bW5Db25maWdbXTtcclxuXHRcdHJldHVybiB1bmRlZmluZWQ7XHJcblx0fVxyXG5cclxuXHJcblx0LyoqXHJcblx0ICogQ29udmVydCBCYXNlcyBlbnRyaWVzIHRvIFRhc2sgZm9ybWF0XHJcblx0ICovXHJcblx0cHJpdmF0ZSBjb252ZXJ0QmFzZXNFbnRyaWVzVG9UYXNrcyhlbnRyaWVzOiBCYXNlc0VudHJ5W10pOiBUYXNrW10ge1xyXG5cdFx0cmV0dXJuIGVudHJpZXMubWFwKChlbnRyeSwgaW5kZXgpID0+IHRoaXMuY29udmVydEVudHJ5VG9UYXNrKGVudHJ5LCBpbmRleCkpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ29udmVydCBhIHNpbmdsZSBCYXNlcyBlbnRyeSB0byBUYXNrIGZvcm1hdFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgY29udmVydEVudHJ5VG9UYXNrKGVudHJ5OiBCYXNlc0VudHJ5LCBpbmRleDogbnVtYmVyKTogVGFzayB7XHJcblx0XHQvLyBFeHRyYWN0IHJhdyBzdGF0dXMgdmFsdWUgZnJvbSBCYXNlcyBlbnRyeVxyXG5cdFx0Y29uc3QgcmF3U3RhdHVzVmFsdWUgPSB0aGlzLmV4dHJhY3RTdHJpbmdWYWx1ZShlbnRyeSwgdGhpcy50YXNrU3RhdHVzUHJvcCkgfHwgJyAnO1xyXG5cclxuXHRcdC8vIE1hcCB0aGUgc3RhdHVzIHZhbHVlIHVzaW5nIHN0YXR1cyBtYXBwaW5nIGNvbmZpZ3VyYXRpb25cclxuXHRcdGNvbnN0IHN0YXR1c1N5bWJvbCA9IHRoaXMubWFwU3RhdHVzVG9TeW1ib2wocmF3U3RhdHVzVmFsdWUpO1xyXG5cclxuXHRcdC8vIERldGVybWluZSBpZiB0YXNrIGlzIGNvbXBsZXRlZCBiYXNlZCBvbiBtYXBwZWQgc3ltYm9sXHJcblx0XHRjb25zdCBpc0NvbXBsZXRlZCA9IHRoaXMuaXNDb21wbGV0ZWRTdGF0dXMoc3RhdHVzU3ltYm9sKTtcclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRpZDogYGJhc2VzLSR7ZW50cnkuZmlsZS5wYXRofS0ke2luZGV4fWAsXHJcblx0XHRcdGNvbnRlbnQ6IHRoaXMuZXh0cmFjdFN0cmluZ1ZhbHVlKGVudHJ5LCB0aGlzLnRhc2tDb250ZW50UHJvcCkgfHwgZW50cnkuZmlsZS5iYXNlbmFtZSxcclxuXHRcdFx0Y29tcGxldGVkOiBpc0NvbXBsZXRlZCxcclxuXHRcdFx0c3RhdHVzOiBzdGF0dXNTeW1ib2wsXHJcblx0XHRcdGxpbmU6IDAsIC8vIEJhc2VzIGVudHJpZXMgZG9uJ3QgaGF2ZSBsaW5lIG51bWJlcnNcclxuXHRcdFx0ZmlsZVBhdGg6IGVudHJ5LmZpbGUucGF0aCxcclxuXHRcdFx0b3JpZ2luYWxNYXJrZG93bjogdGhpcy5leHRyYWN0U3RyaW5nVmFsdWUoZW50cnksIHRoaXMudGFza0NvbnRlbnRQcm9wKSB8fCBlbnRyeS5maWxlLmJhc2VuYW1lLCAvLyBOb3QgYXBwbGljYWJsZSBmb3IgQmFzZXMgZW50cmllc1xyXG5cdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdHByaW9yaXR5OiB0aGlzLmV4dHJhY3ROdW1iZXJWYWx1ZShlbnRyeSwgdGhpcy50YXNrUHJpb3JpdHlQcm9wKSxcclxuXHRcdFx0XHRwcm9qZWN0OiB0aGlzLmV4dHJhY3RTdHJpbmdWYWx1ZShlbnRyeSwgdGhpcy50YXNrUHJvamVjdFByb3ApLFxyXG5cdFx0XHRcdHRhZ3M6IHRoaXMuZXh0cmFjdEFycmF5VmFsdWUoZW50cnksIHRoaXMudGFza1RhZ3NQcm9wKSxcclxuXHRcdFx0XHRjb250ZXh0OiB0aGlzLmV4dHJhY3RTdHJpbmdWYWx1ZShlbnRyeSwgdGhpcy50YXNrQ29udGV4dFByb3ApLFxyXG5cdFx0XHRcdGR1ZURhdGU6IHRoaXMuZXh0cmFjdERhdGVWYWx1ZShlbnRyeSwgdGhpcy50YXNrRHVlRGF0ZVByb3ApLFxyXG5cdFx0XHRcdHN0YXJ0RGF0ZTogdGhpcy5leHRyYWN0RGF0ZVZhbHVlKGVudHJ5LCB0aGlzLnRhc2tTdGFydERhdGVQcm9wKSxcclxuXHRcdFx0XHRjb21wbGV0ZWREYXRlOiB0aGlzLmV4dHJhY3REYXRlVmFsdWUoZW50cnksIHRoaXMudGFza0NvbXBsZXRlZERhdGVQcm9wKSxcclxuXHRcdFx0XHRjaGlsZHJlbjogW10sIC8vIEJhc2VzIGVudHJpZXMgZG9uJ3QgaGF2ZSBjaGlsZCB0YXNrc1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTWFwIGEgc3RhdHVzIHZhbHVlIChtZXRhZGF0YSB0ZXh0IG9yIHN5bWJvbCkgdG8gYSB0YXNrIHN0YXR1cyBzeW1ib2xcclxuXHQgKiBVc2VzIHRoZSBwbHVnaW4ncyBzdGF0dXMgbWFwcGluZyBjb25maWd1cmF0aW9uXHJcblx0ICovXHJcblx0cHJpdmF0ZSBtYXBTdGF0dXNUb1N5bWJvbChzdGF0dXNWYWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IHN0YXR1c01hcHBpbmcgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5maWxlU291cmNlPy5zdGF0dXNNYXBwaW5nO1xyXG5cclxuXHRcdC8vIElmIHN0YXR1cyBtYXBwaW5nIGlzIGRpc2FibGVkIG9yIG5vdCBjb25maWd1cmVkLCByZXR1cm4gYXMtaXNcclxuXHRcdGlmICghc3RhdHVzTWFwcGluZyB8fCAhc3RhdHVzTWFwcGluZy5lbmFibGVkKSB7XHJcblx0XHRcdHJldHVybiBzdGF0dXNWYWx1ZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBIYW5kbGUgY2FzZSBzZW5zaXRpdml0eVxyXG5cdFx0Y29uc3QgbG9va3VwVmFsdWUgPSBzdGF0dXNNYXBwaW5nLmNhc2VTZW5zaXRpdmVcclxuXHRcdFx0PyBzdGF0dXNWYWx1ZVxyXG5cdFx0XHQ6IHN0YXR1c1ZhbHVlLnRvTG93ZXJDYXNlKCk7XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgaXQncyBhbHJlYWR5IGEgcmVjb2duaXplZCBzeW1ib2xcclxuXHRcdGlmIChzdGF0dXNWYWx1ZSBpbiBzdGF0dXNNYXBwaW5nLnN5bWJvbFRvTWV0YWRhdGEpIHtcclxuXHRcdFx0cmV0dXJuIHN0YXR1c1ZhbHVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFRyeSB0byBtYXAgZnJvbSBtZXRhZGF0YSB0ZXh0IHRvIHN5bWJvbFxyXG5cdFx0Zm9yIChjb25zdCBba2V5LCBzeW1ib2xdIG9mIE9iamVjdC5lbnRyaWVzKHN0YXR1c01hcHBpbmcubWV0YWRhdGFUb1N5bWJvbCkpIHtcclxuXHRcdFx0Y29uc3QgY29tcGFyZUtleSA9IHN0YXR1c01hcHBpbmcuY2FzZVNlbnNpdGl2ZSA/IGtleSA6IGtleS50b0xvd2VyQ2FzZSgpO1xyXG5cdFx0XHRpZiAoY29tcGFyZUtleSA9PT0gbG9va3VwVmFsdWUpIHtcclxuXHRcdFx0XHRyZXR1cm4gc3ltYm9sO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUmV0dXJuIG9yaWdpbmFsIHZhbHVlIGlmIG5vIG1hcHBpbmcgZm91bmRcclxuXHRcdHJldHVybiBzdGF0dXNWYWx1ZTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGlmIGEgc3RhdHVzIHN5bWJvbCByZXByZXNlbnRzIGEgY29tcGxldGVkIHRhc2tcclxuXHQgKi9cclxuXHRwcml2YXRlIGlzQ29tcGxldGVkU3RhdHVzKHN0YXR1c1N5bWJvbDogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0XHQvLyBDaGVjayBhZ2FpbnN0IHBsdWdpbidzIGNvbXBsZXRlZCBzdGF0dXMgbWFya3NcclxuXHRcdGNvbnN0IGNvbXBsZXRlZE1hcmtzID0gKHRoaXMucGx1Z2luLnNldHRpbmdzLnRhc2tTdGF0dXNlcz8uY29tcGxldGVkIHx8ICd4JylcclxuXHRcdFx0LnNwbGl0KCd8JylcclxuXHRcdFx0Lm1hcChtID0+IG0udHJpbSgpLnRvTG93ZXJDYXNlKCkpO1xyXG5cclxuXHRcdHJldHVybiBjb21wbGV0ZWRNYXJrcy5pbmNsdWRlcyhzdGF0dXNTeW1ib2wudG9Mb3dlckNhc2UoKSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFeHRyYWN0IHN0cmluZyB2YWx1ZSBmcm9tIEJhc2VzIGVudHJ5XHJcblx0ICovXHJcblx0cHJpdmF0ZSBleHRyYWN0U3RyaW5nVmFsdWUoZW50cnk6IEJhc2VzRW50cnksIHByb3A6IEJhc2VzUHJvcGVydHlJZCB8IG51bGwpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xyXG5cdFx0aWYgKCFwcm9wKSByZXR1cm4gdW5kZWZpbmVkO1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IHZhbHVlID0gZW50cnkuZ2V0VmFsdWUocHJvcCk7XHJcblx0XHRcdGlmICh2YWx1ZSBpbnN0YW5jZW9mIFN0cmluZ1ZhbHVlICYmIHZhbHVlLmlzVHJ1dGh5KCkpIHtcclxuXHRcdFx0XHRjb25zdCBzdHJWYWx1ZSA9IHZhbHVlLnRvU3RyaW5nKCk7XHJcblx0XHRcdFx0cmV0dXJuIHN0clZhbHVlO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmICh2YWx1ZSAmJiB2YWx1ZS5pc1RydXRoeSgpKSB7XHJcblx0XHRcdFx0Y29uc3Qgc3RyVmFsdWUgPSB2YWx1ZS50b1N0cmluZygpO1xyXG5cdFx0XHRcdHJldHVybiBzdHJWYWx1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Ly8gUHJvcGVydHkgbm90IGZvdW5kIG9yIGludmFsaWRcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRXh0cmFjdCBib29sZWFuIHZhbHVlIGZyb20gQmFzZXMgZW50cnlcclxuXHQgKi9cclxuXHRwcml2YXRlIGV4dHJhY3RCb29sZWFuVmFsdWUoZW50cnk6IEJhc2VzRW50cnksIHByb3A6IEJhc2VzUHJvcGVydHlJZCB8IG51bGwpOiBib29sZWFuIHtcclxuXHRcdGlmICghcHJvcCkgcmV0dXJuIGZhbHNlO1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IHZhbHVlID0gZW50cnkuZ2V0VmFsdWUocHJvcCk7XHJcblx0XHRcdGlmICh2YWx1ZSBpbnN0YW5jZW9mIEJvb2xlYW5WYWx1ZSkge1xyXG5cdFx0XHRcdHJldHVybiB2YWx1ZS5pc1RydXRoeSgpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmICh2YWx1ZSBpbnN0YW5jZW9mIFN0cmluZ1ZhbHVlKSB7XHJcblx0XHRcdFx0Y29uc3Qgc3RyID0gdmFsdWUudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpO1xyXG5cdFx0XHRcdHJldHVybiBzdHIgPT09ICd4JyB8fCBzdHIgPT09ICd0cnVlJyB8fCBzdHIgPT09ICdkb25lJyB8fCBzdHIgPT09ICdjb21wbGV0ZWQnO1xyXG5cdFx0XHR9XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHQvLyBQcm9wZXJ0eSBub3QgZm91bmQgb3IgaW52YWxpZFxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEV4dHJhY3QgbnVtYmVyIHZhbHVlIGZyb20gQmFzZXMgZW50cnlcclxuXHQgKi9cclxuXHRwcml2YXRlIGV4dHJhY3ROdW1iZXJWYWx1ZShlbnRyeTogQmFzZXNFbnRyeSwgcHJvcDogQmFzZXNQcm9wZXJ0eUlkIHwgbnVsbCk6IG51bWJlciB8IHVuZGVmaW5lZCB7XHJcblx0XHRpZiAoIXByb3ApIHJldHVybiB1bmRlZmluZWQ7XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgdmFsdWUgPSBlbnRyeS5nZXRWYWx1ZShwcm9wKTtcclxuXHRcdFx0aWYgKHZhbHVlIGluc3RhbmNlb2YgTnVtYmVyVmFsdWUgJiYgdmFsdWUuaXNUcnV0aHkoKSkge1xyXG5cdFx0XHRcdGNvbnN0IHN0clZhbHVlID0gdmFsdWUudG9TdHJpbmcoKTtcclxuXHRcdFx0XHRyZXR1cm4gTnVtYmVyKHN0clZhbHVlKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAodmFsdWUgaW5zdGFuY2VvZiBTdHJpbmdWYWx1ZSAmJiB2YWx1ZS5pc1RydXRoeSgpKSB7XHJcblx0XHRcdFx0Y29uc3Qgc3RyVmFsdWUgPSB2YWx1ZS50b1N0cmluZygpO1xyXG5cdFx0XHRcdGNvbnN0IG51bSA9IHBhcnNlSW50KHN0clZhbHVlKTtcclxuXHRcdFx0XHRyZXR1cm4gaXNOYU4obnVtKSA/IHVuZGVmaW5lZCA6IG51bTtcclxuXHRcdFx0fVxyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Ly8gUHJvcGVydHkgbm90IGZvdW5kIG9yIGludmFsaWRcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRXh0cmFjdCBkYXRlIHZhbHVlIGZyb20gQmFzZXMgZW50cnlcclxuXHQgKi9cclxuXHRwcml2YXRlIGV4dHJhY3REYXRlVmFsdWUoZW50cnk6IEJhc2VzRW50cnksIHByb3A6IEJhc2VzUHJvcGVydHlJZCB8IG51bGwpOiBudW1iZXIgfCB1bmRlZmluZWQge1xyXG5cdFx0aWYgKCFwcm9wKSByZXR1cm4gdW5kZWZpbmVkO1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IHZhbHVlID0gZW50cnkuZ2V0VmFsdWUocHJvcCk7XHJcblx0XHRcdGlmICh2YWx1ZSBpbnN0YW5jZW9mIERhdGVWYWx1ZSAmJiB2YWx1ZS5pc1RydXRoeSgpKSB7XHJcblx0XHRcdFx0Ly8gRGF0ZVZhbHVlIGhhcyBhIGRhdGUgcHJvcGVydHkgdGhhdCByZXR1cm5zIGEgRGF0ZSBvYmplY3RcclxuXHRcdFx0XHRjb25zdCBkYXRlT2JqID0gKHZhbHVlIGFzIGFueSkuZGF0ZTtcclxuXHRcdFx0XHRpZiAoZGF0ZU9iaiBpbnN0YW5jZW9mIERhdGUpIHtcclxuXHRcdFx0XHRcdHJldHVybiBkYXRlT2JqLmdldFRpbWUoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKHZhbHVlIGluc3RhbmNlb2YgU3RyaW5nVmFsdWUgJiYgdmFsdWUuaXNUcnV0aHkoKSkge1xyXG5cdFx0XHRcdGNvbnN0IGRhdGVTdHIgPSB2YWx1ZS50b1N0cmluZygpO1xyXG5cdFx0XHRcdGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShkYXRlU3RyKTtcclxuXHRcdFx0XHRyZXR1cm4gaXNOYU4oZGF0ZS5nZXRUaW1lKCkpID8gdW5kZWZpbmVkIDogZGF0ZS5nZXRUaW1lKCk7XHJcblx0XHRcdH1cclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdC8vIFByb3BlcnR5IG5vdCBmb3VuZCBvciBpbnZhbGlkXHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEV4dHJhY3QgYXJyYXkgdmFsdWUgZnJvbSBCYXNlcyBlbnRyeVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZXh0cmFjdEFycmF5VmFsdWUoZW50cnk6IEJhc2VzRW50cnksIHByb3A6IEJhc2VzUHJvcGVydHlJZCB8IG51bGwpOiBzdHJpbmdbXSB7XHJcblx0XHRpZiAoIXByb3ApIHJldHVybiBbXTtcclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCB2YWx1ZSA9IGVudHJ5LmdldFZhbHVlKHByb3ApO1xyXG5cdFx0XHRpZiAodmFsdWUgaW5zdGFuY2VvZiBMaXN0VmFsdWUgJiYgdmFsdWUuaXNUcnV0aHkoKSkge1xyXG5cdFx0XHRcdGNvbnN0IHJlc3VsdDogc3RyaW5nW10gPSBbXTtcclxuXHRcdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHZhbHVlLmxlbmd0aCgpOyBpKyspIHtcclxuXHRcdFx0XHRcdGNvbnN0IGl0ZW0gPSB2YWx1ZS5nZXQoaSk7XHJcblx0XHRcdFx0XHRpZiAoaXRlbSkge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBzdHJWYWx1ZSA9IGl0ZW0udG9TdHJpbmcoKTtcclxuXHRcdFx0XHRcdFx0cmVzdWx0LnB1c2goc3RyVmFsdWUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmICh2YWx1ZSBpbnN0YW5jZW9mIFN0cmluZ1ZhbHVlICYmIHZhbHVlLmlzVHJ1dGh5KCkpIHtcclxuXHRcdFx0XHRjb25zdCBzdHJWYWx1ZSA9IHZhbHVlLnRvU3RyaW5nKCk7XHJcblx0XHRcdFx0Ly8gUGFyc2UgY29tbWEtc2VwYXJhdGVkIHZhbHVlc1xyXG5cdFx0XHRcdHJldHVybiBzdHJWYWx1ZS5zcGxpdCgnLCcpXHJcblx0XHRcdFx0XHQubWFwKHMgPT4gcy50cmltKCkpXHJcblx0XHRcdFx0XHQuZmlsdGVyKHMgPT4gcy5sZW5ndGggPiAwKTtcclxuXHRcdFx0fVxyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Ly8gUHJvcGVydHkgbm90IGZvdW5kIG9yIGludmFsaWRcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gW107XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBJbml0aWFsaXplIGVzc2VudGlhbCBzaGFyZWQgY29tcG9uZW50cyAoZGV0YWlscyBwYW5lbCBhbmQgdmlldyBtYW5hZ2VyKVxyXG5cdCAqIFZpZXctc3BlY2lmaWMgY29tcG9uZW50cyBhcmUgbGF6eSBsb2FkZWQgb24gZGVtYW5kXHJcblx0ICovXHJcblx0cHJpdmF0ZSBpbml0aWFsaXplQ29tcG9uZW50cygpIHtcclxuXHRcdC8vIERldGFpbHMgY29tcG9uZW50IC0gc2hhcmVkIGFjcm9zcyBhbGwgdmlld3NcclxuXHRcdHRoaXMuZGV0YWlsc0NvbXBvbmVudCA9IG5ldyBUYXNrRGV0YWlsc0NvbXBvbmVudChcclxuXHRcdFx0dGhpcy5yb290Q29udGFpbmVyRWwsXHJcblx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHR0aGlzLnBsdWdpblxyXG5cdFx0KTtcclxuXHRcdHRoaXMuYWRkQ2hpbGQodGhpcy5kZXRhaWxzQ29tcG9uZW50KTtcclxuXHRcdHRoaXMuZGV0YWlsc0NvbXBvbmVudC5sb2FkKCk7XHJcblxyXG5cdFx0Ly8gVmlldyBjb21wb25lbnQgbWFuYWdlciBmb3Igc3BlY2lhbCB2aWV3c1xyXG5cdFx0dGhpcy52aWV3Q29tcG9uZW50TWFuYWdlciA9IG5ldyBWaWV3Q29tcG9uZW50TWFuYWdlcihcclxuXHRcdFx0dGhpcyxcclxuXHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHR0aGlzLnJvb3RDb250YWluZXJFbCxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdG9uVGFza1NlbGVjdGVkOiB0aGlzLmhhbmRsZVRhc2tTZWxlY3Rpb24uYmluZCh0aGlzKSxcclxuXHRcdFx0XHRvblRhc2tDb21wbGV0ZWQ6IHRoaXMudG9nZ2xlVGFza0NvbXBsZXRpb24uYmluZCh0aGlzKSxcclxuXHRcdFx0XHRvblRhc2tDb250ZXh0TWVudTogdGhpcy5oYW5kbGVUYXNrQ29udGV4dE1lbnUuYmluZCh0aGlzKSxcclxuXHRcdFx0XHRvblRhc2tTdGF0dXNVcGRhdGU6IHRoaXMuaGFuZGxlS2FuYmFuVGFza1N0YXR1c1VwZGF0ZS5iaW5kKHRoaXMpLFxyXG5cdFx0XHRcdG9uRXZlbnRDb250ZXh0TWVudTogdGhpcy5oYW5kbGVUYXNrQ29udGV4dE1lbnUuYmluZCh0aGlzKSxcclxuXHRcdFx0fVxyXG5cdFx0KTtcclxuXHRcdHRoaXMuYWRkQ2hpbGQodGhpcy52aWV3Q29tcG9uZW50TWFuYWdlcik7XHJcblxyXG5cdFx0dGhpcy5zZXR1cENvbXBvbmVudEV2ZW50cygpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2V0dXAgZXZlbnQgaGFuZGxlcnMgZm9yIGNvbXBvbmVudHNcclxuXHQgKi9cclxuXHRwcml2YXRlIHNldHVwQ29tcG9uZW50RXZlbnRzKCkge1xyXG5cdFx0dGhpcy5kZXRhaWxzQ29tcG9uZW50Lm9uVGFza1RvZ2dsZUNvbXBsZXRlID0gKHRhc2s6IFRhc2spID0+XHJcblx0XHRcdHRoaXMudG9nZ2xlVGFza0NvbXBsZXRpb24odGFzayk7XHJcblxyXG5cdFx0dGhpcy5kZXRhaWxzQ29tcG9uZW50Lm9uVGFza0VkaXQgPSAodGFzazogVGFzaykgPT4gdGhpcy5lZGl0VGFzayh0YXNrKTtcclxuXHRcdHRoaXMuZGV0YWlsc0NvbXBvbmVudC5vblRhc2tVcGRhdGUgPSBhc3luYyAoXHJcblx0XHRcdG9yaWdpbmFsVGFzazogVGFzayxcclxuXHRcdFx0dXBkYXRlZFRhc2s6IFRhc2tcclxuXHRcdCkgPT4ge1xyXG5cdFx0XHRhd2FpdCB0aGlzLnVwZGF0ZVRhc2sob3JpZ2luYWxUYXNrLCB1cGRhdGVkVGFzayk7XHJcblx0XHR9O1xyXG5cdFx0dGhpcy5kZXRhaWxzQ29tcG9uZW50LnRvZ2dsZURldGFpbHNWaXNpYmlsaXR5ID0gKHZpc2libGU6IGJvb2xlYW4pID0+IHtcclxuXHRcdFx0dGhpcy50b2dnbGVEZXRhaWxzVmlzaWJpbGl0eSh2aXNpYmxlKTtcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTaG93IHRoZSByZXF1ZXN0ZWQgY29tcG9uZW50IGFuZCBoaWRlIHRoZSBwcmV2aW91c2x5IGFjdGl2ZSBvbmUuXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhY3RpdmF0ZUNvbXBvbmVudChrZXk6IHN0cmluZywgY29tcG9uZW50OiBWaWV3Q29tcG9uZW50SW5zdGFuY2UpOiB2b2lkIHtcclxuXHRcdGlmICghY29tcG9uZW50IHx8ICFjb21wb25lbnQuY29udGFpbmVyRWwpIHtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0aGlzLmFjdGl2ZUNvbXBvbmVudCAmJiB0aGlzLmFjdGl2ZUNvbXBvbmVudC5pbnN0YW5jZSAhPT0gY29tcG9uZW50KSB7XHJcblx0XHRcdGNvbnN0IHByZXZpb3VzID0gdGhpcy5hY3RpdmVDb21wb25lbnQuaW5zdGFuY2U7XHJcblx0XHRcdGlmIChwcmV2aW91cz8uY29udGFpbmVyRWwpIHtcclxuXHRcdFx0XHRwcmV2aW91cy5jb250YWluZXJFbC5oaWRlKCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRjb21wb25lbnQuY29udGFpbmVyRWwuc2hvdygpO1xyXG5cdFx0dGhpcy5hY3RpdmVDb21wb25lbnQgPSB7a2V5LCBpbnN0YW5jZTogY29tcG9uZW50fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFN3aXRjaCBiZXR3ZWVuIGRpZmZlcmVudCB2aWV3IG1vZGVzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBzd2l0Y2hWaWV3KFxyXG5cdFx0dmlld0lkOiBWaWV3TW9kZSxcclxuXHRcdHByb2plY3Q/OiBzdHJpbmcgfCBudWxsLFxyXG5cdFx0Zm9yY2VSZWZyZXNoID0gZmFsc2VcclxuXHQpIHtcclxuXHRcdGlmICh0aGlzLmZvcmNlZFZpZXdNb2RlKSB7XHJcblx0XHRcdHZpZXdJZCA9IHRoaXMuZm9yY2VkVmlld01vZGU7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5jdXJyZW50Vmlld0lkID0gdmlld0lkO1xyXG5cdFx0dGhpcy5jdXJyZW50UHJvamVjdCA9IHByb2plY3Q7XHJcblxyXG5cdFx0bGV0IHRhcmdldENvbXBvbmVudDogVmlld0NvbXBvbmVudEluc3RhbmNlIHwgbnVsbCA9IG51bGw7XHJcblx0XHRsZXQgY29tcG9uZW50S2V5ID0gdmlld0lkO1xyXG5cdFx0bGV0IG1vZGVGb3JDb21wb25lbnQ6IFZpZXdNb2RlID0gdmlld0lkO1xyXG5cclxuXHRcdC8vIEdldCB2aWV3IGNvbmZpZ3VyYXRpb25cclxuXHRcdGNvbnN0IHZpZXdDb25maWcgPSBnZXRWaWV3U2V0dGluZ09yRGVmYXVsdCh0aGlzLnBsdWdpbiwgdmlld0lkKTtcclxuXHRcdGNvbnN0IHNwZWNpZmljVmlld1R5cGUgPSB2aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnPy52aWV3VHlwZTtcclxuXHJcblx0XHQvLyBIYW5kbGUgVHdvQ29sdW1uIHZpZXdzXHJcblx0XHRpZiAoc3BlY2lmaWNWaWV3VHlwZSA9PT0gJ3R3b2NvbHVtbicpIHtcclxuXHRcdFx0aWYgKCF0aGlzLnR3b0NvbHVtblZpZXdDb21wb25lbnRzLmhhcyh2aWV3SWQpKSB7XHJcblx0XHRcdFx0Y29uc3QgdHdvQ29sdW1uQ29uZmlnID0gdmlld0NvbmZpZy5zcGVjaWZpY0NvbmZpZyBhcyBUd29Db2x1bW5TcGVjaWZpY0NvbmZpZztcclxuXHRcdFx0XHRjb25zdCB0d29Db2x1bW5Db21wb25lbnQgPSBuZXcgVGFza1Byb3BlcnR5VHdvQ29sdW1uVmlldyhcclxuXHRcdFx0XHRcdHRoaXMucm9vdENvbnRhaW5lckVsLFxyXG5cdFx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0XHRcdHR3b0NvbHVtbkNvbmZpZyxcclxuXHRcdFx0XHRcdHZpZXdJZFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0dGhpcy5hZGRDaGlsZCh0d29Db2x1bW5Db21wb25lbnQpO1xyXG5cclxuXHRcdFx0XHQvLyBTZXQgdXAgZXZlbnQgaGFuZGxlcnNcclxuXHRcdFx0XHR0d29Db2x1bW5Db21wb25lbnQub25UYXNrU2VsZWN0ZWQgPSAodGFzaykgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5oYW5kbGVUYXNrU2VsZWN0aW9uKHRhc2spO1xyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0dHdvQ29sdW1uQ29tcG9uZW50Lm9uVGFza0NvbXBsZXRlZCA9ICh0YXNrKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLnRvZ2dsZVRhc2tDb21wbGV0aW9uKHRhc2spO1xyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0dHdvQ29sdW1uQ29tcG9uZW50Lm9uVGFza0NvbnRleHRNZW51ID0gKGV2ZW50LCB0YXNrKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLmhhbmRsZVRhc2tDb250ZXh0TWVudShldmVudCwgdGFzayk7XHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0dGhpcy50d29Db2x1bW5WaWV3Q29tcG9uZW50cy5zZXQodmlld0lkLCB0d29Db2x1bW5Db21wb25lbnQpO1xyXG5cdFx0XHRcdHR3b0NvbHVtbkNvbXBvbmVudC5jb250YWluZXJFbC5oaWRlKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHRhcmdldENvbXBvbmVudCA9IHRoaXMudHdvQ29sdW1uVmlld0NvbXBvbmVudHMuZ2V0KHZpZXdJZCkgPz8gbnVsbDtcclxuXHRcdFx0Y29tcG9uZW50S2V5ID0gYHR3b2NvbHVtbjoke3ZpZXdJZH1gO1xyXG5cdFx0fSBlbHNlIGlmICh0aGlzLnZpZXdDb21wb25lbnRNYW5hZ2VyLmlzU3BlY2lhbFZpZXcodmlld0lkKSkge1xyXG5cdFx0XHRjb25zdCBzcGVjaWFsQ29tcG9uZW50ID0gdGhpcy52aWV3Q29tcG9uZW50TWFuYWdlci5nZXRPckNyZWF0ZUNvbXBvbmVudCh2aWV3SWQpO1xyXG5cdFx0XHRpZiAoc3BlY2lhbENvbXBvbmVudCkge1xyXG5cdFx0XHRcdHRhcmdldENvbXBvbmVudCA9IHNwZWNpYWxDb21wb25lbnQgYXMgVmlld0NvbXBvbmVudEluc3RhbmNlO1xyXG5cdFx0XHRcdGNvbXBvbmVudEtleSA9IGBzcGVjaWFsOiR7dmlld0lkfWA7XHJcblxyXG5cdFx0XHRcdC8vIEluamVjdCBCYXNlcy1kZXJpdmVkIHBlci12aWV3IGNvbmZpZyBvdmVycmlkZSBpbnRvIHRoZSBjb21wb25lbnQgKGlmIHN1cHBvcnRlZClcclxuXHRcdFx0XHRjb25zdCBjb21wQW55ID0gc3BlY2lhbENvbXBvbmVudCBhcyBhbnk7XHJcblx0XHRcdFx0aWYgKHR5cGVvZiBjb21wQW55LnNldENvbmZpZ092ZXJyaWRlID09PSAnZnVuY3Rpb24nKSB7XHJcblx0XHRcdFx0XHRjb25zdCBvdnIgPSB2aWV3SWQgPT09ICdrYW5iYW4nID8gdGhpcy52aWV3Q29uZmlnLmthbmJhblxyXG5cdFx0XHRcdFx0XHQ6IHZpZXdJZCA9PT0gJ2NhbGVuZGFyJyA/IHRoaXMudmlld0NvbmZpZy5jYWxlbmRhclxyXG5cdFx0XHRcdFx0XHRcdDogdmlld0lkID09PSAnZ2FudHQnID8gdGhpcy52aWV3Q29uZmlnLmdhbnR0XHJcblx0XHRcdFx0XHRcdFx0XHQ6IHZpZXdJZCA9PT0gJ2ZvcmVjYXN0JyA/IHRoaXMudmlld0NvbmZpZy5mb3JlY2FzdFxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ6IHZpZXdJZCA9PT0gJ3F1YWRyYW50JyA/IHRoaXMudmlld0NvbmZpZy5xdWFkcmFudFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdDogbnVsbDtcclxuXHRcdFx0XHRcdGNvbXBBbnkuc2V0Q29uZmlnT3ZlcnJpZGUob3ZyID8/IG51bGwpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gU3RhbmRhcmQgdmlldyB0eXBlcyAtIGNyZWF0ZSBjb21wb25lbnQgb24gZGVtYW5kXHJcblx0XHRcdGNvbXBvbmVudEtleSA9IHZpZXdJZDtcclxuXHRcdFx0bW9kZUZvckNvbXBvbmVudCA9IHZpZXdJZDtcclxuXHJcblx0XHRcdC8vIENsZWFuIHVwIHByZXZpb3VzIGNvbXBvbmVudCBpZiBpdCBleGlzdHMgYW5kIGlzIGRpZmZlcmVudFxyXG5cdFx0XHRpZiAodGhpcy5hY3RpdmVDb21wb25lbnQgJiYgdGhpcy5hY3RpdmVDb21wb25lbnQua2V5ICE9PSB2aWV3SWQpIHtcclxuXHRcdFx0XHRjb25zdCBwcmV2SW5zdGFuY2UgPSB0aGlzLmFjdGl2ZUNvbXBvbmVudC5pbnN0YW5jZTtcclxuXHRcdFx0XHRpZiAocHJldkluc3RhbmNlPy5jb250YWluZXJFbCkge1xyXG5cdFx0XHRcdFx0cHJldkluc3RhbmNlLmNvbnRhaW5lckVsLnJlbW92ZSgpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvLyBVbmxvYWQgcHJldmlvdXMgY29tcG9uZW50IGlmIGl0IGhhcyB1bmxvYWQgbWV0aG9kXHJcblx0XHRcdFx0aWYgKHByZXZJbnN0YW5jZSAmJiB0eXBlb2YgKHByZXZJbnN0YW5jZSBhcyBhbnkpLnVubG9hZCA9PT0gJ2Z1bmN0aW9uJykge1xyXG5cdFx0XHRcdFx0dGhpcy5yZW1vdmVDaGlsZChwcmV2SW5zdGFuY2UgYXMgYW55KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENyZWF0ZSBuZXcgY29tcG9uZW50IGJhc2VkIG9uIHZpZXdJZFxyXG5cdFx0XHRzd2l0Y2ggKHZpZXdJZCkge1xyXG5cdFx0XHRcdGNhc2UgJ2luYm94JzpcclxuXHRcdFx0XHRjYXNlICdmbGFnZ2VkJzpcclxuXHRcdFx0XHRcdGNvbnN0IGNvbnRlbnRDb21wID0gbmV3IENvbnRlbnRDb21wb25lbnQoXHJcblx0XHRcdFx0XHRcdHRoaXMucm9vdENvbnRhaW5lckVsLFxyXG5cdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5hcHAsXHJcblx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0b25UYXNrU2VsZWN0ZWQ6ICh0YXNrOiBUYXNrIHwgbnVsbCkgPT4gdGhpcy5oYW5kbGVUYXNrU2VsZWN0aW9uKHRhc2spLFxyXG5cdFx0XHRcdFx0XHRcdG9uVGFza0NvbXBsZXRlZDogKHRhc2s6IFRhc2spID0+IHRoaXMudG9nZ2xlVGFza0NvbXBsZXRpb24odGFzayksXHJcblx0XHRcdFx0XHRcdFx0b25UYXNrQ29udGV4dE1lbnU6IChldmVudDogTW91c2VFdmVudCwgdGFzazogVGFzaykgPT4gdGhpcy5oYW5kbGVUYXNrQ29udGV4dE1lbnUoZXZlbnQsIHRhc2spLFxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0dGhpcy5hZGRDaGlsZChjb250ZW50Q29tcCk7XHJcblx0XHRcdFx0XHRjb250ZW50Q29tcC5sb2FkKCk7XHJcblx0XHRcdFx0XHR0YXJnZXRDb21wb25lbnQgPSBjb250ZW50Q29tcDtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRjYXNlICdmb3JlY2FzdCc6XHJcblx0XHRcdFx0XHRjb25zdCBmb3JlY2FzdENvbXAgPSBuZXcgRm9yZWNhc3RDb21wb25lbnQoXHJcblx0XHRcdFx0XHRcdHRoaXMucm9vdENvbnRhaW5lckVsLFxyXG5cdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5hcHAsXHJcblx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0b25UYXNrU2VsZWN0ZWQ6ICh0YXNrOiBUYXNrIHwgbnVsbCkgPT4gdGhpcy5oYW5kbGVUYXNrU2VsZWN0aW9uKHRhc2spLFxyXG5cdFx0XHRcdFx0XHRcdG9uVGFza0NvbXBsZXRlZDogKHRhc2s6IFRhc2spID0+IHRoaXMudG9nZ2xlVGFza0NvbXBsZXRpb24odGFzayksXHJcblx0XHRcdFx0XHRcdFx0b25UYXNrVXBkYXRlOiBhc3luYyAob3JpZ2luYWxUYXNrOiBUYXNrLCB1cGRhdGVkVGFzazogVGFzaykgPT4gYXdhaXQgdGhpcy5oYW5kbGVUYXNrVXBkYXRlKG9yaWdpbmFsVGFzaywgdXBkYXRlZFRhc2spLFxyXG5cdFx0XHRcdFx0XHRcdG9uVGFza0NvbnRleHRNZW51OiAoZXZlbnQ6IE1vdXNlRXZlbnQsIHRhc2s6IFRhc2spID0+IHRoaXMuaGFuZGxlVGFza0NvbnRleHRNZW51KGV2ZW50LCB0YXNrKSxcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdHRoaXMuYWRkQ2hpbGQoZm9yZWNhc3RDb21wKTtcclxuXHRcdFx0XHRcdGZvcmVjYXN0Q29tcC5sb2FkKCk7XHJcblx0XHRcdFx0XHR0YXJnZXRDb21wb25lbnQgPSBmb3JlY2FzdENvbXA7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0Y2FzZSAndGFncyc6XHJcblx0XHRcdFx0XHRjb25zdCB0YWdzQ29tcCA9IG5ldyBUYWdzQ29tcG9uZW50KFxyXG5cdFx0XHRcdFx0XHR0aGlzLnJvb3RDb250YWluZXJFbCxcclxuXHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uYXBwLFxyXG5cdFx0XHRcdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdG9uVGFza1NlbGVjdGVkOiAodGFzazogVGFzayB8IG51bGwpID0+IHRoaXMuaGFuZGxlVGFza1NlbGVjdGlvbih0YXNrKSxcclxuXHRcdFx0XHRcdFx0XHRvblRhc2tDb21wbGV0ZWQ6ICh0YXNrOiBUYXNrKSA9PiB0aGlzLnRvZ2dsZVRhc2tDb21wbGV0aW9uKHRhc2spLFxyXG5cdFx0XHRcdFx0XHRcdG9uVGFza0NvbnRleHRNZW51OiAoZXZlbnQ6IE1vdXNlRXZlbnQsIHRhc2s6IFRhc2spID0+IHRoaXMuaGFuZGxlVGFza0NvbnRleHRNZW51KGV2ZW50LCB0YXNrKSxcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdHRoaXMuYWRkQ2hpbGQodGFnc0NvbXApO1xyXG5cdFx0XHRcdFx0dGFnc0NvbXAubG9hZCgpO1xyXG5cdFx0XHRcdFx0dGFyZ2V0Q29tcG9uZW50ID0gdGFnc0NvbXA7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0Y2FzZSAncHJvamVjdHMnOlxyXG5cdFx0XHRcdFx0Y29uc3QgcHJvamVjdHNDb21wID0gbmV3IFByb2plY3RzQ29tcG9uZW50KFxyXG5cdFx0XHRcdFx0XHR0aGlzLnJvb3RDb250YWluZXJFbCxcclxuXHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uYXBwLFxyXG5cdFx0XHRcdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdG9uVGFza1NlbGVjdGVkOiAodGFzazogVGFzayB8IG51bGwpID0+IHRoaXMuaGFuZGxlVGFza1NlbGVjdGlvbih0YXNrKSxcclxuXHRcdFx0XHRcdFx0XHRvblRhc2tDb21wbGV0ZWQ6ICh0YXNrOiBUYXNrKSA9PiB0aGlzLnRvZ2dsZVRhc2tDb21wbGV0aW9uKHRhc2spLFxyXG5cdFx0XHRcdFx0XHRcdG9uVGFza0NvbnRleHRNZW51OiAoZXZlbnQ6IE1vdXNlRXZlbnQsIHRhc2s6IFRhc2spID0+IHRoaXMuaGFuZGxlVGFza0NvbnRleHRNZW51KGV2ZW50LCB0YXNrKSxcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdHRoaXMuYWRkQ2hpbGQocHJvamVjdHNDb21wKTtcclxuXHRcdFx0XHRcdHByb2plY3RzQ29tcC5sb2FkKCk7XHJcblx0XHRcdFx0XHR0YXJnZXRDb21wb25lbnQgPSBwcm9qZWN0c0NvbXA7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0Y2FzZSAncmV2aWV3JzpcclxuXHRcdFx0XHRcdGNvbnN0IHJldmlld0NvbXAgPSBuZXcgUmV2aWV3Q29tcG9uZW50KFxyXG5cdFx0XHRcdFx0XHR0aGlzLnJvb3RDb250YWluZXJFbCxcclxuXHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uYXBwLFxyXG5cdFx0XHRcdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdG9uVGFza1NlbGVjdGVkOiAodGFzazogVGFzayB8IG51bGwpID0+IHRoaXMuaGFuZGxlVGFza1NlbGVjdGlvbih0YXNrKSxcclxuXHRcdFx0XHRcdFx0XHRvblRhc2tDb21wbGV0ZWQ6ICh0YXNrOiBUYXNrKSA9PiB0aGlzLnRvZ2dsZVRhc2tDb21wbGV0aW9uKHRhc2spLFxyXG5cdFx0XHRcdFx0XHRcdG9uVGFza0NvbnRleHRNZW51OiAoZXZlbnQ6IE1vdXNlRXZlbnQsIHRhc2s6IFRhc2spID0+IHRoaXMuaGFuZGxlVGFza0NvbnRleHRNZW51KGV2ZW50LCB0YXNrKSxcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdHRoaXMuYWRkQ2hpbGQocmV2aWV3Q29tcCk7XHJcblx0XHRcdFx0XHRyZXZpZXdDb21wLmxvYWQoKTtcclxuXHRcdFx0XHRcdHRhcmdldENvbXBvbmVudCA9IHJldmlld0NvbXA7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0Y2FzZSAnY2FsZW5kYXInOlxyXG5cdFx0XHRcdFx0Y29uc3QgY2FsZW5kYXJDb21wID0gbmV3IENhbGVuZGFyQ29tcG9uZW50KFxyXG5cdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5hcHAsXHJcblx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHRcdFx0XHR0aGlzLnJvb3RDb250YWluZXJFbCxcclxuXHRcdFx0XHRcdFx0dGhpcy50YXNrcyxcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdG9uVGFza1NlbGVjdGVkOiAodGFzazogVGFzayB8IG51bGwpID0+IHRoaXMuaGFuZGxlVGFza1NlbGVjdGlvbih0YXNrKSxcclxuXHRcdFx0XHRcdFx0XHRvblRhc2tDb21wbGV0ZWQ6ICh0YXNrOiBUYXNrKSA9PiB0aGlzLnRvZ2dsZVRhc2tDb21wbGV0aW9uKHRhc2spLFxyXG5cdFx0XHRcdFx0XHRcdG9uRXZlbnRDb250ZXh0TWVudTogKGV2OiBNb3VzZUV2ZW50LCBldmVudDogQ2FsZW5kYXJFdmVudCkgPT4gdGhpcy5oYW5kbGVUYXNrQ29udGV4dE1lbnUoZXYsIGV2ZW50KSxcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdHRoaXMuYWRkQ2hpbGQoY2FsZW5kYXJDb21wKTtcclxuXHRcdFx0XHRcdGNhbGVuZGFyQ29tcC5sb2FkKCk7XHJcblx0XHRcdFx0XHR0YXJnZXRDb21wb25lbnQgPSBjYWxlbmRhckNvbXA7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0Y2FzZSAna2FuYmFuJzpcclxuXHRcdFx0XHRcdGNvbnN0IGthbmJhbkNvbXAgPSBuZXcgS2FuYmFuQ29tcG9uZW50KFxyXG5cdFx0XHRcdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdFx0XHRcdHRoaXMucm9vdENvbnRhaW5lckVsLFxyXG5cdFx0XHRcdFx0XHR0aGlzLnRhc2tzLFxyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0b25UYXNrU3RhdHVzVXBkYXRlOiB0aGlzLmhhbmRsZUthbmJhblRhc2tTdGF0dXNVcGRhdGUuYmluZCh0aGlzKSxcclxuXHRcdFx0XHRcdFx0XHRvblRhc2tTZWxlY3RlZDogdGhpcy5oYW5kbGVUYXNrU2VsZWN0aW9uLmJpbmQodGhpcyksXHJcblx0XHRcdFx0XHRcdFx0b25UYXNrQ29tcGxldGVkOiB0aGlzLnRvZ2dsZVRhc2tDb21wbGV0aW9uLmJpbmQodGhpcyksXHJcblx0XHRcdFx0XHRcdFx0b25UYXNrQ29udGV4dE1lbnU6IHRoaXMuaGFuZGxlVGFza0NvbnRleHRNZW51LmJpbmQodGhpcyksXHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR0aGlzLmFkZENoaWxkKGthbmJhbkNvbXApO1xyXG5cdFx0XHRcdFx0Ly8gRW5zdXJlIGNvbXBvbmVudCBsaWZlY3ljbGUgcnVuc1xyXG5cdFx0XHRcdFx0a2FuYmFuQ29tcC5sb2FkKCk7XHJcblx0XHRcdFx0XHR0YXJnZXRDb21wb25lbnQgPSBrYW5iYW5Db21wO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdGNhc2UgJ2dhbnR0JzpcclxuXHRcdFx0XHRcdGNvbnN0IGdhbnR0Q29tcCA9IG5ldyBHYW50dENvbXBvbmVudChcclxuXHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdFx0XHRcdHRoaXMucm9vdENvbnRhaW5lckVsLFxyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0b25UYXNrU2VsZWN0ZWQ6IHRoaXMuaGFuZGxlVGFza1NlbGVjdGlvbi5iaW5kKHRoaXMpLFxyXG5cdFx0XHRcdFx0XHRcdG9uVGFza0NvbXBsZXRlZDogdGhpcy50b2dnbGVUYXNrQ29tcGxldGlvbi5iaW5kKHRoaXMpLFxyXG5cdFx0XHRcdFx0XHRcdG9uVGFza0NvbnRleHRNZW51OiB0aGlzLmhhbmRsZVRhc2tDb250ZXh0TWVudS5iaW5kKHRoaXMpLFxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0dGhpcy5hZGRDaGlsZChnYW50dENvbXApO1xyXG5cdFx0XHRcdFx0dGFyZ2V0Q29tcG9uZW50ID0gZ2FudHRDb21wO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdGNhc2UgJ3F1YWRyYW50JzpcclxuXHRcdFx0XHRcdGNvbnN0IHF1YWRyYW50Q29tcCA9IG5ldyBRdWFkcmFudENvbXBvbmVudChcclxuXHRcdFx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHRcdFx0XHR0aGlzLnJvb3RDb250YWluZXJFbCxcclxuXHRcdFx0XHRcdFx0dGhpcy50YXNrcyxcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdG9uVGFza1N0YXR1c1VwZGF0ZTogdGhpcy5oYW5kbGVLYW5iYW5UYXNrU3RhdHVzVXBkYXRlLmJpbmQodGhpcyksXHJcblx0XHRcdFx0XHRcdFx0b25UYXNrU2VsZWN0ZWQ6IHRoaXMuaGFuZGxlVGFza1NlbGVjdGlvbi5iaW5kKHRoaXMpLFxyXG5cdFx0XHRcdFx0XHRcdG9uVGFza0NvbXBsZXRlZDogdGhpcy50b2dnbGVUYXNrQ29tcGxldGlvbi5iaW5kKHRoaXMpLFxyXG5cdFx0XHRcdFx0XHRcdG9uVGFza0NvbnRleHRNZW51OiB0aGlzLmhhbmRsZVRhc2tDb250ZXh0TWVudS5iaW5kKHRoaXMpLFxyXG5cdFx0XHRcdFx0XHRcdG9uVGFza1VwZGF0ZWQ6IGFzeW5jICh0YXNrOiBUYXNrKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRhd2FpdCB0aGlzLnVwZGF0ZVRhc2sodGFzaywgdGFzayk7XHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdHRoaXMuYWRkQ2hpbGQocXVhZHJhbnRDb21wKTtcclxuXHRcdFx0XHRcdHF1YWRyYW50Q29tcC5sb2FkKCk7XHJcblx0XHRcdFx0XHR0YXJnZXRDb21wb25lbnQgPSBxdWFkcmFudENvbXA7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0Y2FzZSAnaGFiaXQnOlxyXG5cdFx0XHRcdFx0Y29uc3QgaGFiaXRzQ29tcCA9IG5ldyBIYWJpdHNDb21wb25lbnQoXHJcblx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHRcdFx0XHR0aGlzLnJvb3RDb250YWluZXJFbFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdHRoaXMuYWRkQ2hpbGQoaGFiaXRzQ29tcCk7XHJcblx0XHRcdFx0XHR0YXJnZXRDb21wb25lbnQgPSBoYWJpdHNDb21wO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0XHR0YXJnZXRDb21wb25lbnQgPSBudWxsO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRpZiAoIXRhcmdldENvbXBvbmVudCkge1xyXG5cdFx0XHR0aGlzLmhhbmRsZVRhc2tTZWxlY3Rpb24obnVsbCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmFjdGl2YXRlQ29tcG9uZW50KGNvbXBvbmVudEtleSwgdGFyZ2V0Q29tcG9uZW50KTtcclxuXHJcblx0XHQvLyBVcGRhdGUgY29tcG9uZW50IHdpdGggZmlsdGVyZWQgdGFza3NcclxuXHRcdGlmICh0eXBlb2YgdGFyZ2V0Q29tcG9uZW50LnNldFRhc2tzID09PSAnZnVuY3Rpb24nKSB7XHJcblx0XHRcdGNvbnN0IGZpbHRlck9wdGlvbnM6IHtcclxuXHRcdFx0XHRhZHZhbmNlZEZpbHRlcj86IFJvb3RGaWx0ZXJTdGF0ZTtcclxuXHRcdFx0XHR0ZXh0UXVlcnk/OiBzdHJpbmc7XHJcblx0XHRcdH0gPSB7fTtcclxuXHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHR0aGlzLmN1cnJlbnRGaWx0ZXJTdGF0ZSAmJlxyXG5cdFx0XHRcdHRoaXMuY3VycmVudEZpbHRlclN0YXRlLmZpbHRlckdyb3VwcyAmJlxyXG5cdFx0XHRcdHRoaXMuY3VycmVudEZpbHRlclN0YXRlLmZpbHRlckdyb3Vwcy5sZW5ndGggPiAwXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdGZpbHRlck9wdGlvbnMuYWR2YW5jZWRGaWx0ZXIgPSB0aGlzLmN1cnJlbnRGaWx0ZXJTdGF0ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0bGV0IGZpbHRlcmVkVGFza3MgPSBmaWx0ZXJUYXNrcyhcclxuXHRcdFx0XHR0aGlzLnRhc2tzLFxyXG5cdFx0XHRcdHZpZXdJZCxcclxuXHRcdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0XHRmaWx0ZXJPcHRpb25zXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBGaWx0ZXIgb3V0IGJhZGdlIHRhc2tzIGZvciBmb3JlY2FzdCB2aWV3XHJcblx0XHRcdGlmICh2aWV3SWQgPT09ICdmb3JlY2FzdCcpIHtcclxuXHRcdFx0XHRmaWx0ZXJlZFRhc2tzID0gZmlsdGVyZWRUYXNrcy5maWx0ZXIoXHJcblx0XHRcdFx0XHQodGFzaykgPT4gISh0YXNrIGFzIGFueSkuYmFkZ2VcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR0YXJnZXRDb21wb25lbnQuc2V0VGFza3MoXHJcblx0XHRcdFx0ZmlsdGVyZWRUYXNrcyxcclxuXHRcdFx0XHR0aGlzLnRhc2tzLFxyXG5cdFx0XHRcdGZvcmNlUmVmcmVzaFxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEhhbmRsZSB1cGRhdGVUYXNrcyBtZXRob2QgZm9yIHRhYmxlIHZpZXcgYWRhcHRlclxyXG5cdFx0aWYgKHR5cGVvZiB0YXJnZXRDb21wb25lbnQudXBkYXRlVGFza3MgPT09ICdmdW5jdGlvbicpIHtcclxuXHRcdFx0Y29uc3QgZmlsdGVyT3B0aW9uczoge1xyXG5cdFx0XHRcdGFkdmFuY2VkRmlsdGVyPzogUm9vdEZpbHRlclN0YXRlO1xyXG5cdFx0XHRcdHRleHRRdWVyeT86IHN0cmluZztcclxuXHRcdFx0fSA9IHt9O1xyXG5cclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHRoaXMuY3VycmVudEZpbHRlclN0YXRlICYmXHJcblx0XHRcdFx0dGhpcy5jdXJyZW50RmlsdGVyU3RhdGUuZmlsdGVyR3JvdXBzICYmXHJcblx0XHRcdFx0dGhpcy5jdXJyZW50RmlsdGVyU3RhdGUuZmlsdGVyR3JvdXBzLmxlbmd0aCA+IDBcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0ZmlsdGVyT3B0aW9ucy5hZHZhbmNlZEZpbHRlciA9IHRoaXMuY3VycmVudEZpbHRlclN0YXRlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR0YXJnZXRDb21wb25lbnQudXBkYXRlVGFza3MoXHJcblx0XHRcdFx0ZmlsdGVyVGFza3ModGhpcy50YXNrcywgdmlld0lkLCB0aGlzLnBsdWdpbiwgZmlsdGVyT3B0aW9ucylcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAodHlwZW9mIHRhcmdldENvbXBvbmVudC5zZXRWaWV3TW9kZSA9PT0gJ2Z1bmN0aW9uJykge1xyXG5cdFx0XHR0YXJnZXRDb21wb25lbnQuc2V0Vmlld01vZGUobW9kZUZvckNvbXBvbmVudCwgcHJvamVjdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVXBkYXRlIFR3b0NvbHVtbiB2aWV3c1xyXG5cdFx0dGhpcy50d29Db2x1bW5WaWV3Q29tcG9uZW50cy5mb3JFYWNoKChjb21wb25lbnQpID0+IHtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdGNvbXBvbmVudCAmJlxyXG5cdFx0XHRcdHR5cGVvZiBjb21wb25lbnQuc2V0VGFza3MgPT09ICdmdW5jdGlvbicgJiZcclxuXHRcdFx0XHRjb21wb25lbnQuZ2V0Vmlld0lkKCkgPT09IHZpZXdJZFxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRjb25zdCBmaWx0ZXJPcHRpb25zOiB7XHJcblx0XHRcdFx0XHRhZHZhbmNlZEZpbHRlcj86IFJvb3RGaWx0ZXJTdGF0ZTtcclxuXHRcdFx0XHRcdHRleHRRdWVyeT86IHN0cmluZztcclxuXHRcdFx0XHR9ID0ge307XHJcblxyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdHRoaXMuY3VycmVudEZpbHRlclN0YXRlICYmXHJcblx0XHRcdFx0XHR0aGlzLmN1cnJlbnRGaWx0ZXJTdGF0ZS5maWx0ZXJHcm91cHMgJiZcclxuXHRcdFx0XHRcdHRoaXMuY3VycmVudEZpbHRlclN0YXRlLmZpbHRlckdyb3Vwcy5sZW5ndGggPiAwXHJcblx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRmaWx0ZXJPcHRpb25zLmFkdmFuY2VkRmlsdGVyID0gdGhpcy5jdXJyZW50RmlsdGVyU3RhdGU7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRsZXQgZmlsdGVyZWRUYXNrcyA9IGZpbHRlclRhc2tzKFxyXG5cdFx0XHRcdFx0dGhpcy50YXNrcyxcclxuXHRcdFx0XHRcdGNvbXBvbmVudC5nZXRWaWV3SWQoKSxcclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHRcdFx0ZmlsdGVyT3B0aW9uc1xyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdGlmIChjb21wb25lbnQuZ2V0Vmlld0lkKCkgPT09ICdmb3JlY2FzdCcpIHtcclxuXHRcdFx0XHRcdGZpbHRlcmVkVGFza3MgPSBmaWx0ZXJlZFRhc2tzLmZpbHRlcihcclxuXHRcdFx0XHRcdFx0KHRhc2spID0+ICEodGFzayBhcyBhbnkpLmJhZGdlXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Y29tcG9uZW50LnNldFRhc2tzKGZpbHRlcmVkVGFza3MpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRpZiAoXHJcblx0XHRcdHZpZXdJZCA9PT0gJ3JldmlldycgJiZcclxuXHRcdFx0dHlwZW9mIHRhcmdldENvbXBvbmVudC5yZWZyZXNoUmV2aWV3U2V0dGluZ3MgPT09ICdmdW5jdGlvbidcclxuXHRcdCkge1xyXG5cdFx0XHR0YXJnZXRDb21wb25lbnQucmVmcmVzaFJldmlld1NldHRpbmdzKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5oYW5kbGVUYXNrU2VsZWN0aW9uKG51bGwpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVG9nZ2xlIGRldGFpbHMgcGFuZWwgdmlzaWJpbGl0eVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgdG9nZ2xlRGV0YWlsc1Zpc2liaWxpdHkodmlzaWJsZTogYm9vbGVhbikge1xyXG5cdFx0dGhpcy5pc0RldGFpbHNWaXNpYmxlID0gdmlzaWJsZTtcclxuXHRcdHRoaXMucm9vdENvbnRhaW5lckVsLnRvZ2dsZUNsYXNzKCdkZXRhaWxzLXZpc2libGUnLCB2aXNpYmxlKTtcclxuXHRcdHRoaXMucm9vdENvbnRhaW5lckVsLnRvZ2dsZUNsYXNzKCdkZXRhaWxzLWhpZGRlbicsICF2aXNpYmxlKTtcclxuXHJcblx0XHR0aGlzLmRldGFpbHNDb21wb25lbnQuc2V0VmlzaWJsZSh2aXNpYmxlKTtcclxuXHRcdGlmICh0aGlzLmRldGFpbHNUb2dnbGVCdG4pIHtcclxuXHRcdFx0dGhpcy5kZXRhaWxzVG9nZ2xlQnRuLnRvZ2dsZUNsYXNzKCdpcy1hY3RpdmUnLCB2aXNpYmxlKTtcclxuXHRcdFx0dGhpcy5kZXRhaWxzVG9nZ2xlQnRuLnNldEF0dHJpYnV0ZShcclxuXHRcdFx0XHQnYXJpYS1sYWJlbCcsXHJcblx0XHRcdFx0dmlzaWJsZSA/IHQoJ0hpZGUgRGV0YWlscycpIDogdCgnU2hvdyBEZXRhaWxzJylcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoIXZpc2libGUpIHtcclxuXHRcdFx0dGhpcy5jdXJyZW50U2VsZWN0ZWRUYXNrSWQgPSBudWxsO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSGFuZGxlIHRhc2sgc2VsZWN0aW9uXHJcblx0ICovXHJcblx0cHJpdmF0ZSBoYW5kbGVUYXNrU2VsZWN0aW9uKHRhc2s6IFRhc2sgfCBudWxsKSB7XHJcblx0XHRpZiAodGFzaykge1xyXG5cdFx0XHRpZiAodGhpcy5jdXJyZW50U2VsZWN0ZWRUYXNrSWQgIT09IHRhc2suaWQpIHtcclxuXHRcdFx0XHR0aGlzLmN1cnJlbnRTZWxlY3RlZFRhc2tJZCA9IHRhc2suaWQ7XHJcblx0XHRcdFx0dGhpcy5kZXRhaWxzQ29tcG9uZW50LnNob3dUYXNrRGV0YWlscyh0YXNrKTtcclxuXHRcdFx0XHRpZiAoIXRoaXMuaXNEZXRhaWxzVmlzaWJsZSkge1xyXG5cdFx0XHRcdFx0dGhpcy50b2dnbGVEZXRhaWxzVmlzaWJpbGl0eSh0cnVlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gVG9nZ2xlIGRldGFpbHMgdmlzaWJpbGl0eSBvbiByZS1jbGlja1xyXG5cdFx0XHRcdHRoaXMudG9nZ2xlRGV0YWlsc1Zpc2liaWxpdHkoIXRoaXMuaXNEZXRhaWxzVmlzaWJsZSk7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMudG9nZ2xlRGV0YWlsc1Zpc2liaWxpdHkoZmFsc2UpO1xyXG5cdFx0XHR0aGlzLmN1cnJlbnRTZWxlY3RlZFRhc2tJZCA9IG51bGw7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBIYW5kbGUgdGFzayBjb250ZXh0IG1lbnVcclxuXHQgKi9cclxuXHRwcml2YXRlIGhhbmRsZVRhc2tDb250ZXh0TWVudShldmVudDogTW91c2VFdmVudCwgdGFzazogVGFzaykge1xyXG5cdFx0Y29uc3QgbWVudSA9IG5ldyBNZW51KCk7XHJcblxyXG5cdFx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdGl0ZW0uc2V0VGl0bGUodCgnQ29tcGxldGUnKSk7XHJcblx0XHRcdGl0ZW0uc2V0SWNvbignY2hlY2stc3F1YXJlJyk7XHJcblx0XHRcdGl0ZW0ub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy50b2dnbGVUYXNrQ29tcGxldGlvbih0YXNrKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KVxyXG5cdFx0XHQuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRcdGl0ZW0uc2V0SWNvbignc3F1YXJlLXBlbicpO1xyXG5cdFx0XHRcdGl0ZW0uc2V0VGl0bGUodCgnU3dpdGNoIHN0YXR1cycpKTtcclxuXHRcdFx0XHRjb25zdCBzdWJtZW51ID0gaXRlbS5zZXRTdWJtZW51KCk7XHJcblxyXG5cdFx0XHRcdC8vIEdldCB1bmlxdWUgc3RhdHVzZXMgZnJvbSB0YXNrU3RhdHVzTWFya3NcclxuXHRcdFx0XHRjb25zdCBzdGF0dXNNYXJrcyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnRhc2tTdGF0dXNNYXJrcztcclxuXHRcdFx0XHRjb25zdCB1bmlxdWVTdGF0dXNlcyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XHJcblxyXG5cdFx0XHRcdGZvciAoY29uc3Qgc3RhdHVzIG9mIE9iamVjdC5rZXlzKHN0YXR1c01hcmtzKSkge1xyXG5cdFx0XHRcdFx0Y29uc3QgbWFyayA9IHN0YXR1c01hcmtzW3N0YXR1cyBhcyBrZXlvZiB0eXBlb2Ygc3RhdHVzTWFya3NdO1xyXG5cdFx0XHRcdFx0aWYgKCFBcnJheS5mcm9tKHVuaXF1ZVN0YXR1c2VzLnZhbHVlcygpKS5pbmNsdWRlcyhtYXJrKSkge1xyXG5cdFx0XHRcdFx0XHR1bmlxdWVTdGF0dXNlcy5zZXQoc3RhdHVzLCBtYXJrKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGZvciAoY29uc3QgW3N0YXR1cywgbWFya10gb2YgdW5pcXVlU3RhdHVzZXMpIHtcclxuXHRcdFx0XHRcdHN1Ym1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRpdGVtLnRpdGxlRWwuY3JlYXRlRWwoXHJcblx0XHRcdFx0XHRcdFx0J3NwYW4nLFxyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdGNsczogJ3N0YXR1cy1vcHRpb24tY2hlY2tib3gnLFxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0KGVsKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRjcmVhdGVUYXNrQ2hlY2tib3gobWFyaywgdGFzaywgZWwpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0aXRlbS50aXRsZUVsLmNyZWF0ZUVsKCdzcGFuJywge1xyXG5cdFx0XHRcdFx0XHRcdGNsczogJ3N0YXR1cy1vcHRpb24nLFxyXG5cdFx0XHRcdFx0XHRcdHRleHQ6IHN0YXR1cyxcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdGl0ZW0ub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0aWYgKCF0YXNrLmNvbXBsZXRlZCAmJiBtYXJrLnRvTG93ZXJDYXNlKCkgPT09ICd4Jykge1xyXG5cdFx0XHRcdFx0XHRcdFx0dGFzay5tZXRhZGF0YS5jb21wbGV0ZWREYXRlID0gRGF0ZS5ub3coKTtcclxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdFx0dGFzay5tZXRhZGF0YS5jb21wbGV0ZWREYXRlID0gdW5kZWZpbmVkO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR0aGlzLnVwZGF0ZVRhc2sodGFzaywge1xyXG5cdFx0XHRcdFx0XHRcdFx0Li4udGFzayxcclxuXHRcdFx0XHRcdFx0XHRcdHN0YXR1czogbWFyayxcclxuXHRcdFx0XHRcdFx0XHRcdGNvbXBsZXRlZDogbWFyay50b0xvd2VyQ2FzZSgpID09PSAneCcsXHJcblx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KVxyXG5cdFx0XHQuYWRkU2VwYXJhdG9yKClcclxuXHRcdFx0LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRpdGVtLnNldFRpdGxlKHQoJ0VkaXQnKSk7XHJcblx0XHRcdFx0aXRlbS5zZXRJY29uKCdwZW5jaWwnKTtcclxuXHRcdFx0XHRpdGVtLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5oYW5kbGVUYXNrU2VsZWN0aW9uKHRhc2spO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KVxyXG5cdFx0XHQuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRcdGl0ZW0uc2V0VGl0bGUodCgnRWRpdCBpbiBGaWxlJykpO1xyXG5cdFx0XHRcdGl0ZW0uc2V0SWNvbignZmlsZS1lZGl0Jyk7XHJcblx0XHRcdFx0aXRlbS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuZWRpdFRhc2sodGFzayk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdG1lbnUuc2hvd0F0TW91c2VFdmVudChldmVudCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBUb2dnbGUgdGFzayBjb21wbGV0aW9uIHN0YXR1c1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgdG9nZ2xlVGFza0NvbXBsZXRpb24odGFzazogVGFzaykge1xyXG5cdFx0Y29uc3QgdXBkYXRlZFRhc2sgPSB7Li4udGFzaywgY29tcGxldGVkOiAhdGFzay5jb21wbGV0ZWR9O1xyXG5cclxuXHRcdGlmICh1cGRhdGVkVGFzay5jb21wbGV0ZWQpIHtcclxuXHRcdFx0aWYgKHVwZGF0ZWRUYXNrLm1ldGFkYXRhKSB7XHJcblx0XHRcdFx0dXBkYXRlZFRhc2subWV0YWRhdGEuY29tcGxldGVkRGF0ZSA9IERhdGUubm93KCk7XHJcblx0XHRcdH1cclxuXHRcdFx0Y29uc3QgY29tcGxldGVkTWFyayA9IChcclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXNrU3RhdHVzZXMuY29tcGxldGVkIHx8ICd4J1xyXG5cdFx0XHQpLnNwbGl0KCd8JylbMF07XHJcblx0XHRcdGlmICh1cGRhdGVkVGFzay5zdGF0dXMgIT09IGNvbXBsZXRlZE1hcmspIHtcclxuXHRcdFx0XHR1cGRhdGVkVGFzay5zdGF0dXMgPSBjb21wbGV0ZWRNYXJrO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRpZiAodXBkYXRlZFRhc2subWV0YWRhdGEpIHtcclxuXHRcdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YS5jb21wbGV0ZWREYXRlID0gdW5kZWZpbmVkO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNvbnN0IG5vdFN0YXJ0ZWRNYXJrID1cclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXNrU3RhdHVzZXMubm90U3RhcnRlZCB8fCAnICc7XHJcblx0XHRcdGlmICh1cGRhdGVkVGFzay5zdGF0dXMudG9Mb3dlckNhc2UoKSA9PT0gJ3gnKSB7XHJcblx0XHRcdFx0dXBkYXRlZFRhc2suc3RhdHVzID0gbm90U3RhcnRlZE1hcms7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBVcGRhdGUgdGhyb3VnaCBwbHVnaW4gQVBJIGlmIGF2YWlsYWJsZVxyXG5cdFx0aWYgKHRoaXMucGx1Z2luLndyaXRlQVBJKSB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMucGx1Z2luLndyaXRlQVBJLnVwZGF0ZVRhc2soe1xyXG5cdFx0XHRcdHRhc2tJZDogdXBkYXRlZFRhc2suaWQsXHJcblx0XHRcdFx0dXBkYXRlczogdXBkYXRlZFRhc2ssXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKHJlc3VsdC5lcnJvciB8fCAnRmFpbGVkIHRvIHVwZGF0ZSB0YXNrJyk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBVcGRhdGUgbG9jYWwgc3RhdGVcclxuXHRcdGNvbnN0IGluZGV4ID0gdGhpcy50YXNrcy5maW5kSW5kZXgoKHQpID0+IHQuaWQgPT09IHRhc2suaWQpO1xyXG5cdFx0aWYgKGluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHR0aGlzLnRhc2tzW2luZGV4XSA9IHVwZGF0ZWRUYXNrO1xyXG5cdFx0XHR0aGlzLnN3aXRjaFZpZXcodGhpcy5jdXJyZW50Vmlld0lkLCB0aGlzLmN1cnJlbnRQcm9qZWN0LCB0cnVlKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSB0YXNrIHVwZGF0ZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgaGFuZGxlVGFza1VwZGF0ZShvcmlnaW5hbFRhc2s6IFRhc2ssIHVwZGF0ZWRUYXNrOiBUYXNrKSB7XHJcblx0XHRhd2FpdCB0aGlzLnVwZGF0ZVRhc2sob3JpZ2luYWxUYXNrLCB1cGRhdGVkVGFzayk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgdGFza1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgdXBkYXRlVGFzayhcclxuXHRcdG9yaWdpbmFsVGFzazogVGFzayxcclxuXHRcdHVwZGF0ZWRUYXNrOiBUYXNrXHJcblx0KTogUHJvbWlzZTxUYXNrPiB7XHJcblx0XHQvLyBVcGRhdGUgdGhyb3VnaCBwbHVnaW4gQVBJIGlmIGF2YWlsYWJsZVxyXG5cdFx0aWYgKHRoaXMucGx1Z2luLndyaXRlQVBJKSB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMucGx1Z2luLndyaXRlQVBJLnVwZGF0ZVRhc2soe1xyXG5cdFx0XHRcdHRhc2tJZDogb3JpZ2luYWxUYXNrLmlkLFxyXG5cdFx0XHRcdHVwZGF0ZXM6IHVwZGF0ZWRUYXNrLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0aWYgKCFyZXN1bHQuc3VjY2Vzcykge1xyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihyZXN1bHQuZXJyb3IgfHwgJ0ZhaWxlZCB0byB1cGRhdGUgdGFzaycpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChyZXN1bHQudGFzaykge1xyXG5cdFx0XHRcdHVwZGF0ZWRUYXNrID0gcmVzdWx0LnRhc2s7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBVcGRhdGUgbG9jYWwgc3RhdGVcclxuXHRcdGNvbnN0IGluZGV4ID0gdGhpcy50YXNrcy5maW5kSW5kZXgoKHQpID0+IHQuaWQgPT09IG9yaWdpbmFsVGFzay5pZCk7XHJcblx0XHRpZiAoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdHRoaXMudGFza3NbaW5kZXhdID0gdXBkYXRlZFRhc2s7XHJcblx0XHRcdHRoaXMuc3dpdGNoVmlldyh0aGlzLmN1cnJlbnRWaWV3SWQsIHRoaXMuY3VycmVudFByb2plY3QsIHRydWUpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0aGlzLmN1cnJlbnRTZWxlY3RlZFRhc2tJZCA9PT0gdXBkYXRlZFRhc2suaWQpIHtcclxuXHRcdFx0aWYgKHRoaXMuZGV0YWlsc0NvbXBvbmVudC5pc0N1cnJlbnRseUVkaXRpbmcoKSkge1xyXG5cdFx0XHRcdHRoaXMuZGV0YWlsc0NvbXBvbmVudC5jdXJyZW50VGFzayA9IHVwZGF0ZWRUYXNrO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMuZGV0YWlsc0NvbXBvbmVudC5zaG93VGFza0RldGFpbHModXBkYXRlZFRhc2spO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHVwZGF0ZWRUYXNrO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRWRpdCB0YXNrIGluIHNvdXJjZSBmaWxlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhc3luYyBlZGl0VGFzayh0YXNrOiBUYXNrKSB7XHJcblx0XHRjb25zdCBmaWxlID0gdGhpcy5hcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aCh0YXNrLmZpbGVQYXRoKTtcclxuXHRcdGlmICghZmlsZSkgcmV0dXJuO1xyXG5cclxuXHRcdGNvbnN0IGV4aXN0aW5nTGVhZiA9IHRoaXMuYXBwLndvcmtzcGFjZVxyXG5cdFx0XHQuZ2V0TGVhdmVzT2ZUeXBlKCdtYXJrZG93bicpXHJcblx0XHRcdC5maW5kKFxyXG5cdFx0XHRcdChsZWFmKSA9PiAobGVhZi52aWV3IGFzIGFueSkuZmlsZSA9PT0gZmlsZVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdGNvbnN0IGxlYWZUb1VzZSA9IGV4aXN0aW5nTGVhZiB8fCB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhZigndGFiJyk7XHJcblxyXG5cdFx0YXdhaXQgbGVhZlRvVXNlLm9wZW5GaWxlKGZpbGUsIHtcclxuXHRcdFx0YWN0aXZlOiB0cnVlLFxyXG5cdFx0XHRlU3RhdGU6IHtcclxuXHRcdFx0XHRsaW5lOiB0YXNrLmxpbmUsXHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLmFwcC53b3Jrc3BhY2Uuc2V0QWN0aXZlTGVhZihsZWFmVG9Vc2UsIHtmb2N1czogdHJ1ZX0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSGFuZGxlIEthbmJhbiB0YXNrIHN0YXR1cyB1cGRhdGVcclxuXHQgKi9cclxuXHRwcml2YXRlIGhhbmRsZUthbmJhblRhc2tTdGF0dXNVcGRhdGUgPSBhc3luYyAoXHJcblx0XHR0YXNrSWQ6IHN0cmluZyxcclxuXHRcdG5ld1N0YXR1c01hcms6IHN0cmluZ1xyXG5cdCkgPT4ge1xyXG5cdFx0Y29uc3QgdGFza1RvVXBkYXRlID0gdGhpcy50YXNrcy5maW5kKCh0KSA9PiB0LmlkID09PSB0YXNrSWQpO1xyXG5cclxuXHRcdGlmICh0YXNrVG9VcGRhdGUpIHtcclxuXHRcdFx0Y29uc3QgaXNDb21wbGV0ZWQgPVxyXG5cdFx0XHRcdG5ld1N0YXR1c01hcmsudG9Mb3dlckNhc2UoKSA9PT1cclxuXHRcdFx0XHQodGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c2VzLmNvbXBsZXRlZCB8fCAneCcpXHJcblx0XHRcdFx0XHQuc3BsaXQoJ3wnKVswXVxyXG5cdFx0XHRcdFx0LnRvTG93ZXJDYXNlKCk7XHJcblx0XHRcdGNvbnN0IGNvbXBsZXRlZERhdGUgPSBpc0NvbXBsZXRlZCA/IERhdGUubm93KCkgOiB1bmRlZmluZWQ7XHJcblxyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0dGFza1RvVXBkYXRlLnN0YXR1cyAhPT0gbmV3U3RhdHVzTWFyayB8fFxyXG5cdFx0XHRcdHRhc2tUb1VwZGF0ZS5jb21wbGV0ZWQgIT09IGlzQ29tcGxldGVkXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdGNvbnN0IHVwZGF0ZWRUYXNrRGF0YSA9IHtcclxuXHRcdFx0XHRcdC4uLnRhc2tUb1VwZGF0ZSxcclxuXHRcdFx0XHRcdHN0YXR1czogbmV3U3RhdHVzTWFyayxcclxuXHRcdFx0XHRcdGNvbXBsZXRlZDogaXNDb21wbGV0ZWQsXHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0aWYgKHVwZGF0ZWRUYXNrRGF0YS5tZXRhZGF0YSkge1xyXG5cdFx0XHRcdFx0dXBkYXRlZFRhc2tEYXRhLm1ldGFkYXRhLmNvbXBsZXRlZERhdGUgPSBjb21wbGV0ZWREYXRlO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0YXdhaXQgdGhpcy51cGRhdGVUYXNrKHRhc2tUb1VwZGF0ZSwgdXBkYXRlZFRhc2tEYXRhKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdC8qKlxyXG5cdCAqIEFwcGx5IGN1cnJlbnQgZmlsdGVyXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhcHBseUN1cnJlbnRGaWx0ZXIoKSB7XHJcblx0XHR0aGlzLmxvYWRUYXNrcygpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTG9hZCB0YXNrcyBmcm9tIHBsdWdpbiBvciBCYXNlcyBkYXRhXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhc3luYyBsb2FkVGFza3MoKSB7XHJcblx0XHQvLyBJZiB3ZSBoYXZlIEJhc2VzIGRhdGEsIHVzZSBpdFxyXG5cdFx0aWYgKHRoaXMuZGF0YSkge1xyXG5cdFx0XHR0aGlzLnRhc2tzID0gdGhpcy5jb252ZXJ0QmFzZXNFbnRyaWVzVG9UYXNrcyh0aGlzLmRhdGEuZGF0YSk7XHJcblx0XHR9IGVsc2UgaWYgKHRoaXMucGx1Z2luLmRhdGFmbG93T3JjaGVzdHJhdG9yKSB7XHJcblx0XHRcdC8vIEZhbGwgYmFjayB0byBwbHVnaW4ncyBkYXRhZmxvdyBpZiBhdmFpbGFibGVcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRjb25zdCBxdWVyeUFQSSA9IHRoaXMucGx1Z2luLmRhdGFmbG93T3JjaGVzdHJhdG9yLmdldFF1ZXJ5QVBJKCk7XHJcblx0XHRcdFx0dGhpcy50YXNrcyA9IGF3YWl0IHF1ZXJ5QVBJLmdldEFsbFRhc2tzKCk7XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcignRXJyb3IgbG9hZGluZyB0YXNrcyBmcm9tIGRhdGFmbG93OicsIGVycm9yKTtcclxuXHRcdFx0XHR0aGlzLnRhc2tzID0gW107XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMudGFza3MgPSBbXTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBVcGRhdGUgdGhlIGN1cnJlbnQgdmlld1xyXG5cdFx0aWYgKHRoaXMuY3VycmVudFZpZXdJZCkge1xyXG5cdFx0XHR0aGlzLnN3aXRjaFZpZXcodGhpcy5jdXJyZW50Vmlld0lkLCB0aGlzLmN1cnJlbnRQcm9qZWN0LCB0cnVlKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB2aWV3IG9wdGlvbnMgZm9yIEJhc2VzIGNvbmZpZ3VyYXRpb25cclxuXHQgKiBAcGFyYW0gdmlld01vZGUgLSBPcHRpb25hbCB2aWV3IG1vZGUgdG8gZmlsdGVyIG9wdGlvbnMgZm9yIHNwZWNpZmljIHZpZXcgdHlwZXNcclxuXHQgKi9cclxuXHRzdGF0aWMgZ2V0Vmlld09wdGlvbnModmlld01vZGU/OiBWaWV3TW9kZSk6IFZpZXdPcHRpb25bXSB7XHJcblx0XHRjb25zdCBvcHRpb25zOiBWaWV3T3B0aW9uW10gPSBbXTtcclxuXHJcblx0XHQvLyBDb21tb24gb3B0aW9ucyBmb3IgYWxsIHZpZXdzXHJcblx0XHQvLyBEZWZhdWx0IHZhbHVlcyBhcmUgZGVyaXZlZCBmcm9tIERFRkFVTFRfRklMRV9UQVNLX01BUFBJTkdcclxuXHRcdG9wdGlvbnMucHVzaChcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGRpc3BsYXlOYW1lOiAnUHJvcGVydHkgTWFwcGluZ3MnLFxyXG5cdFx0XHRcdHR5cGU6ICdncm91cCcsXHJcblx0XHRcdFx0aXRlbXM6IFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0ZGlzcGxheU5hbWU6ICdUYXNrIENvbnRlbnQnLFxyXG5cdFx0XHRcdFx0XHR0eXBlOiAncHJvcGVydHknLFxyXG5cdFx0XHRcdFx0XHRrZXk6ICd0YXNrQ29udGVudCcsXHJcblx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyOiAnUHJvcGVydHkgY29udGFpbmluZyB0YXNrIHRleHQnLFxyXG5cdFx0XHRcdFx0XHRkZWZhdWx0OiAnZmlsZS5iYXNlbmFtZScsIC8vIFNwZWNpYWwgY2FzZTogdXNlIGZpbGUgbmFtZSBhcyBjb250ZW50XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRkaXNwbGF5TmFtZTogJ1Rhc2sgU3RhdHVzJyxcclxuXHRcdFx0XHRcdFx0dHlwZTogJ3Byb3BlcnR5JyxcclxuXHRcdFx0XHRcdFx0a2V5OiAndGFza1N0YXR1cycsXHJcblx0XHRcdFx0XHRcdGZpbHRlcjogcHJvcCA9PiAhcHJvcC5zdGFydHNXaXRoKCdmaWxlLicpLFxyXG5cdFx0XHRcdFx0XHRwbGFjZWhvbGRlcjogJ1Byb3BlcnR5IGZvciBjb21wbGV0aW9uIHN0YXR1cycsXHJcblx0XHRcdFx0XHRcdGRlZmF1bHQ6IGBub3RlLiR7REVGQVVMVF9GSUxFX1RBU0tfTUFQUElORy5zdGF0dXNQcm9wZXJ0eX1gLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0ZGlzcGxheU5hbWU6ICdQcmlvcml0eScsXHJcblx0XHRcdFx0XHRcdHR5cGU6ICdwcm9wZXJ0eScsXHJcblx0XHRcdFx0XHRcdGtleTogJ3Rhc2tQcmlvcml0eScsXHJcblx0XHRcdFx0XHRcdGZpbHRlcjogcHJvcCA9PiAhcHJvcC5zdGFydHNXaXRoKCdmaWxlLicpLFxyXG5cdFx0XHRcdFx0XHRwbGFjZWhvbGRlcjogJ1Byb3BlcnR5IGZvciB0YXNrIHByaW9yaXR5JyxcclxuXHRcdFx0XHRcdFx0ZGVmYXVsdDogYG5vdGUuJHtERUZBVUxUX0ZJTEVfVEFTS19NQVBQSU5HLnByaW9yaXR5UHJvcGVydHl9YCxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGRpc3BsYXlOYW1lOiAnUHJvamVjdCcsXHJcblx0XHRcdFx0XHRcdHR5cGU6ICdwcm9wZXJ0eScsXHJcblx0XHRcdFx0XHRcdGtleTogJ3Rhc2tQcm9qZWN0JyxcclxuXHRcdFx0XHRcdFx0ZmlsdGVyOiBwcm9wID0+ICFwcm9wLnN0YXJ0c1dpdGgoJ2ZpbGUuJyksXHJcblx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyOiAnUHJvcGVydHkgZm9yIHByb2plY3QgYXNzaWdubWVudCcsXHJcblx0XHRcdFx0XHRcdGRlZmF1bHQ6IGBub3RlLiR7REVGQVVMVF9GSUxFX1RBU0tfTUFQUElORy5wcm9qZWN0UHJvcGVydHl9YCxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGRpc3BsYXlOYW1lOiAnVGFncycsXHJcblx0XHRcdFx0XHRcdHR5cGU6ICdwcm9wZXJ0eScsXHJcblx0XHRcdFx0XHRcdGtleTogJ3Rhc2tUYWdzJyxcclxuXHRcdFx0XHRcdFx0ZmlsdGVyOiBwcm9wID0+ICFwcm9wLnN0YXJ0c1dpdGgoJ2ZpbGUuJyksXHJcblx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyOiAnUHJvcGVydHkgZm9yIHRhc2sgdGFncycsXHJcblx0XHRcdFx0XHRcdGRlZmF1bHQ6IGBub3RlLiR7REVGQVVMVF9GSUxFX1RBU0tfTUFQUElORy50YWdzUHJvcGVydHl9YCxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGRpc3BsYXlOYW1lOiAnQ29udGV4dCcsXHJcblx0XHRcdFx0XHRcdHR5cGU6ICdwcm9wZXJ0eScsXHJcblx0XHRcdFx0XHRcdGtleTogJ3Rhc2tDb250ZXh0JyxcclxuXHRcdFx0XHRcdFx0ZmlsdGVyOiBwcm9wID0+ICFwcm9wLnN0YXJ0c1dpdGgoJ2ZpbGUuJyksXHJcblx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyOiAnUHJvcGVydHkgZm9yIHRhc2sgY29udGV4dCcsXHJcblx0XHRcdFx0XHRcdGRlZmF1bHQ6IGBub3RlLiR7REVGQVVMVF9GSUxFX1RBU0tfTUFQUElORy5jb250ZXh0UHJvcGVydHl9YCxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XVxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0ZGlzcGxheU5hbWU6ICdEYXRlIFByb3BlcnRpZXMnLFxyXG5cdFx0XHRcdHR5cGU6ICdncm91cCcsXHJcblx0XHRcdFx0aXRlbXM6IFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0ZGlzcGxheU5hbWU6ICdEdWUgRGF0ZScsXHJcblx0XHRcdFx0XHRcdHR5cGU6ICdwcm9wZXJ0eScsXHJcblx0XHRcdFx0XHRcdGtleTogJ3Rhc2tEdWVEYXRlJyxcclxuXHRcdFx0XHRcdFx0ZmlsdGVyOiBwcm9wID0+ICFwcm9wLnN0YXJ0c1dpdGgoJ2ZpbGUuJyksXHJcblx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyOiAnUHJvcGVydHkgZm9yIGR1ZSBkYXRlJyxcclxuXHRcdFx0XHRcdFx0ZGVmYXVsdDogYG5vdGUuJHtERUZBVUxUX0ZJTEVfVEFTS19NQVBQSU5HLmR1ZURhdGVQcm9wZXJ0eX1gLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0ZGlzcGxheU5hbWU6ICdTdGFydCBEYXRlJyxcclxuXHRcdFx0XHRcdFx0dHlwZTogJ3Byb3BlcnR5JyxcclxuXHRcdFx0XHRcdFx0a2V5OiAndGFza1N0YXJ0RGF0ZScsXHJcblx0XHRcdFx0XHRcdGZpbHRlcjogcHJvcCA9PiAhcHJvcC5zdGFydHNXaXRoKCdmaWxlLicpLFxyXG5cdFx0XHRcdFx0XHRwbGFjZWhvbGRlcjogJ1Byb3BlcnR5IGZvciBzdGFydCBkYXRlJyxcclxuXHRcdFx0XHRcdFx0ZGVmYXVsdDogYG5vdGUuJHtERUZBVUxUX0ZJTEVfVEFTS19NQVBQSU5HLnN0YXJ0RGF0ZVByb3BlcnR5fWAsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRkaXNwbGF5TmFtZTogJ0NvbXBsZXRlZCBEYXRlJyxcclxuXHRcdFx0XHRcdFx0dHlwZTogJ3Byb3BlcnR5JyxcclxuXHRcdFx0XHRcdFx0a2V5OiAndGFza0NvbXBsZXRlZERhdGUnLFxyXG5cdFx0XHRcdFx0XHRmaWx0ZXI6IHByb3AgPT4gIXByb3Auc3RhcnRzV2l0aCgnZmlsZS4nKSxcclxuXHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6ICdQcm9wZXJ0eSBmb3IgY29tcGxldGlvbiBkYXRlJyxcclxuXHRcdFx0XHRcdFx0ZGVmYXVsdDogYG5vdGUuJHtERUZBVUxUX0ZJTEVfVEFTS19NQVBQSU5HLmNvbXBsZXRlZERhdGVQcm9wZXJ0eX1gLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRdXHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gVmlldy1zcGVjaWZpYyBvcHRpb25zIGJhc2VkIG9uIHZpZXdNb2RlXHJcblx0XHQvLyBJZiBubyB2aWV3TW9kZSBpcyBzcGVjaWZpZWQsIGluY2x1ZGUgYWxsIHZpZXctc3BlY2lmaWMgb3B0aW9ucyAoZm9yIHVuaWZpZWQgdmlldylcclxuXHRcdGlmICghdmlld01vZGUgfHwgdmlld01vZGUgPT09ICdrYW5iYW4nKSB7XHJcblx0XHRcdG9wdGlvbnMucHVzaCh7XHJcblx0XHRcdFx0ZGlzcGxheU5hbWU6ICdLYW5iYW4gVmlldyBTZXR0aW5ncycsXHJcblx0XHRcdFx0dHlwZTogJ2dyb3VwJyxcclxuXHRcdFx0XHRpdGVtczogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRkaXNwbGF5TmFtZTogJ0dyb3VwIEJ5JyxcclxuXHRcdFx0XHRcdFx0dHlwZTogJ2Ryb3Bkb3duJyxcclxuXHRcdFx0XHRcdFx0a2V5OiAndGdfZ3JvdXBCeScsXHJcblx0XHRcdFx0XHRcdG9wdGlvbnM6IHtcclxuXHRcdFx0XHRcdFx0XHQnc3RhdHVzJzogJ1N0YXR1cycsXHJcblx0XHRcdFx0XHRcdFx0J3ByaW9yaXR5JzogJ1ByaW9yaXR5JyxcclxuXHRcdFx0XHRcdFx0XHQndGFncyc6ICdUYWdzJyxcclxuXHRcdFx0XHRcdFx0XHQncHJvamVjdCc6ICdQcm9qZWN0JyxcclxuXHRcdFx0XHRcdFx0XHQnY29udGV4dCc6ICdDb250ZXh0JyxcclxuXHRcdFx0XHRcdFx0XHQnZHVlRGF0ZSc6ICdEdWUgRGF0ZScsXHJcblx0XHRcdFx0XHRcdFx0J3N0YXJ0RGF0ZSc6ICdTdGFydCBEYXRlJ1xyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRkZWZhdWx0OiAnc3RhdHVzJyxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGRpc3BsYXlOYW1lOiAnSGlkZSBFbXB0eSBDb2x1bW5zJyxcclxuXHRcdFx0XHRcdFx0dHlwZTogJ3RvZ2dsZScsXHJcblx0XHRcdFx0XHRcdGtleTogJ2hpZGVFbXB0eUNvbHVtbnMnLFxyXG5cdFx0XHRcdFx0XHRkZWZhdWx0OiBmYWxzZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGRpc3BsYXlOYW1lOiAnRGVmYXVsdCBTb3J0IEZpZWxkJyxcclxuXHRcdFx0XHRcdFx0dHlwZTogJ2Ryb3Bkb3duJyxcclxuXHRcdFx0XHRcdFx0a2V5OiAnZGVmYXVsdFNvcnRGaWVsZCcsXHJcblx0XHRcdFx0XHRcdG9wdGlvbnM6IHtcclxuXHRcdFx0XHRcdFx0XHQncHJpb3JpdHknOiAnUHJpb3JpdHknLFxyXG5cdFx0XHRcdFx0XHRcdCdkdWVEYXRlJzogJ0R1ZSBEYXRlJyxcclxuXHRcdFx0XHRcdFx0XHQnc2NoZWR1bGVkRGF0ZSc6ICdTY2hlZHVsZWQgRGF0ZScsXHJcblx0XHRcdFx0XHRcdFx0J3N0YXJ0RGF0ZSc6ICdTdGFydCBEYXRlJyxcclxuXHRcdFx0XHRcdFx0XHQnY3JlYXRlZERhdGUnOiAnQ3JlYXRlZCBEYXRlJ1xyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRkZWZhdWx0OiAncHJpb3JpdHknLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0ZGlzcGxheU5hbWU6ICdEZWZhdWx0IFNvcnQgT3JkZXInLFxyXG5cdFx0XHRcdFx0XHR0eXBlOiAnZHJvcGRvd24nLFxyXG5cdFx0XHRcdFx0XHRrZXk6ICdkZWZhdWx0U29ydE9yZGVyJyxcclxuXHRcdFx0XHRcdFx0b3B0aW9uczoge1xyXG5cdFx0XHRcdFx0XHRcdCdhc2MnOiAnQXNjZW5kaW5nJyxcclxuXHRcdFx0XHRcdFx0XHQnZGVzYyc6ICdEZXNjZW5kaW5nJ1xyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRkZWZhdWx0OiAnZGVzYycsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdF1cclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKCF2aWV3TW9kZSB8fCB2aWV3TW9kZSA9PT0gJ2NhbGVuZGFyJykge1xyXG5cdFx0XHRvcHRpb25zLnB1c2goe1xyXG5cdFx0XHRcdGRpc3BsYXlOYW1lOiB0KCdDYWxlbmRhciBTZXR0aW5ncycpLFxyXG5cdFx0XHRcdHR5cGU6ICdncm91cCcsXHJcblx0XHRcdFx0aXRlbXM6IFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0ZGlzcGxheU5hbWU6ICdGaXJzdCBEYXkgb2YgV2VlaycsXHJcblx0XHRcdFx0XHRcdHR5cGU6ICdzbGlkZXInLFxyXG5cdFx0XHRcdFx0XHRrZXk6ICdmaXJzdERheU9mV2VlaycsXHJcblx0XHRcdFx0XHRcdG1pbjogMCxcclxuXHRcdFx0XHRcdFx0bWF4OiA2LFxyXG5cdFx0XHRcdFx0XHRzdGVwOiAxLFxyXG5cdFx0XHRcdFx0XHRkZWZhdWx0OiAwLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0ZGlzcGxheU5hbWU6ICdIaWRlIFdlZWtlbmRzJyxcclxuXHRcdFx0XHRcdFx0dHlwZTogJ3RvZ2dsZScsXHJcblx0XHRcdFx0XHRcdGtleTogJ2hpZGVXZWVrZW5kcycsXHJcblx0XHRcdFx0XHRcdGRlZmF1bHQ6IGZhbHNlLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRdXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICghdmlld01vZGUgfHwgdmlld01vZGUgPT09ICdnYW50dCcpIHtcclxuXHRcdFx0b3B0aW9ucy5wdXNoKHtcclxuXHRcdFx0XHRkaXNwbGF5TmFtZTogJ0dhbnR0IFZpZXcgU2V0dGluZ3MnLFxyXG5cdFx0XHRcdHR5cGU6ICdncm91cCcsXHJcblx0XHRcdFx0aXRlbXM6IFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0ZGlzcGxheU5hbWU6ICdTaG93IFRhc2sgTGFiZWxzJyxcclxuXHRcdFx0XHRcdFx0dHlwZTogJ3RvZ2dsZScsXHJcblx0XHRcdFx0XHRcdGtleTogJ3Nob3dUYXNrTGFiZWxzJyxcclxuXHRcdFx0XHRcdFx0ZGVmYXVsdDogdHJ1ZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGRpc3BsYXlOYW1lOiAnVXNlIE1hcmtkb3duIFJlbmRlcmVyJyxcclxuXHRcdFx0XHRcdFx0dHlwZTogJ3RvZ2dsZScsXHJcblx0XHRcdFx0XHRcdGtleTogJ3VzZU1hcmtkb3duUmVuZGVyZXInLFxyXG5cdFx0XHRcdFx0XHRkZWZhdWx0OiBmYWxzZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoIXZpZXdNb2RlIHx8IHZpZXdNb2RlID09PSAnZm9yZWNhc3QnKSB7XHJcblx0XHRcdG9wdGlvbnMucHVzaCh7XHJcblx0XHRcdFx0ZGlzcGxheU5hbWU6ICdGb3JlY2FzdCBWaWV3IFNldHRpbmdzJyxcclxuXHRcdFx0XHR0eXBlOiAnZ3JvdXAnLFxyXG5cdFx0XHRcdGl0ZW1zOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGRpc3BsYXlOYW1lOiAnRmlyc3QgRGF5IG9mIFdlZWsnLFxyXG5cdFx0XHRcdFx0XHR0eXBlOiAnc2xpZGVyJyxcclxuXHRcdFx0XHRcdFx0a2V5OiAnZmlyc3REYXlPZldlZWsnLFxyXG5cdFx0XHRcdFx0XHRtaW46IDAsXHJcblx0XHRcdFx0XHRcdG1heDogNixcclxuXHRcdFx0XHRcdFx0c3RlcDogMSxcclxuXHRcdFx0XHRcdFx0ZGVmYXVsdDogMCxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGRpc3BsYXlOYW1lOiAnSGlkZSBXZWVrZW5kcycsXHJcblx0XHRcdFx0XHRcdHR5cGU6ICd0b2dnbGUnLFxyXG5cdFx0XHRcdFx0XHRrZXk6ICdoaWRlV2Vla2VuZHMnLFxyXG5cdFx0XHRcdFx0XHRkZWZhdWx0OiBmYWxzZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoIXZpZXdNb2RlIHx8IHZpZXdNb2RlID09PSAncXVhZHJhbnQnKSB7XHJcblx0XHRcdG9wdGlvbnMucHVzaCh7XHJcblx0XHRcdFx0ZGlzcGxheU5hbWU6ICdRdWFkcmFudCBWaWV3IFNldHRpbmdzJyxcclxuXHRcdFx0XHR0eXBlOiAnZ3JvdXAnLFxyXG5cdFx0XHRcdGl0ZW1zOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGRpc3BsYXlOYW1lOiAnVXJnZW50IFRhZycsXHJcblx0XHRcdFx0XHRcdHR5cGU6ICd0ZXh0JyxcclxuXHRcdFx0XHRcdFx0a2V5OiAndXJnZW50VGFnJyxcclxuXHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6ICcjdXJnZW50JyxcclxuXHRcdFx0XHRcdFx0ZGVmYXVsdDogJyN1cmdlbnQnLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0ZGlzcGxheU5hbWU6ICdJbXBvcnRhbnQgVGFnJyxcclxuXHRcdFx0XHRcdFx0dHlwZTogJ3RleHQnLFxyXG5cdFx0XHRcdFx0XHRrZXk6ICdpbXBvcnRhbnRUYWcnLFxyXG5cdFx0XHRcdFx0XHRwbGFjZWhvbGRlcjogJyNpbXBvcnRhbnQnLFxyXG5cdFx0XHRcdFx0XHRkZWZhdWx0OiAnI2ltcG9ydGFudCcsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRkaXNwbGF5TmFtZTogJ1VyZ2VudCBUaHJlc2hvbGQgKERheXMpJyxcclxuXHRcdFx0XHRcdFx0dHlwZTogJ3NsaWRlcicsXHJcblx0XHRcdFx0XHRcdGtleTogJ3VyZ2VudFRocmVzaG9sZERheXMnLFxyXG5cdFx0XHRcdFx0XHRtaW46IDEsXHJcblx0XHRcdFx0XHRcdG1heDogMTQsXHJcblx0XHRcdFx0XHRcdHN0ZXA6IDEsXHJcblx0XHRcdFx0XHRcdGRlZmF1bHQ6IDMsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRkaXNwbGF5TmFtZTogJ1VzZSBQcmlvcml0eSBmb3IgQ2xhc3NpZmljYXRpb24nLFxyXG5cdFx0XHRcdFx0XHR0eXBlOiAndG9nZ2xlJyxcclxuXHRcdFx0XHRcdFx0a2V5OiAndXNlUHJpb3JpdHlGb3JDbGFzc2lmaWNhdGlvbicsXHJcblx0XHRcdFx0XHRcdGRlZmF1bHQ6IGZhbHNlLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0ZGlzcGxheU5hbWU6ICdVcmdlbnQgUHJpb3JpdHkgVGhyZXNob2xkJyxcclxuXHRcdFx0XHRcdFx0dHlwZTogJ3NsaWRlcicsXHJcblx0XHRcdFx0XHRcdGtleTogJ3VyZ2VudFByaW9yaXR5VGhyZXNob2xkJyxcclxuXHRcdFx0XHRcdFx0bWluOiAxLFxyXG5cdFx0XHRcdFx0XHRtYXg6IDUsXHJcblx0XHRcdFx0XHRcdHN0ZXA6IDEsXHJcblx0XHRcdFx0XHRcdGRlZmF1bHQ6IDQsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRkaXNwbGF5TmFtZTogJ0ltcG9ydGFudCBQcmlvcml0eSBUaHJlc2hvbGQnLFxyXG5cdFx0XHRcdFx0XHR0eXBlOiAnc2xpZGVyJyxcclxuXHRcdFx0XHRcdFx0a2V5OiAnaW1wb3J0YW50UHJpb3JpdHlUaHJlc2hvbGQnLFxyXG5cdFx0XHRcdFx0XHRtaW46IDEsXHJcblx0XHRcdFx0XHRcdG1heDogNSxcclxuXHRcdFx0XHRcdFx0c3RlcDogMSxcclxuXHRcdFx0XHRcdFx0ZGVmYXVsdDogMyxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gb3B0aW9ucztcclxuXHR9XHJcbn1cclxuIl19