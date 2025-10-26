import { __awaiter } from "tslib";
import { Component, setIcon } from "obsidian";
import { TaskListItemComponent } from "./listItem"; // Re-import needed components
import { getViewSettingOrDefault } from "@/common/setting-definition"; // 导入 SortCriterion
import { tasksToTree } from "@/utils/ui/tree-view-utils"; // Re-import needed utils
import { TaskTreeItemComponent } from "./treeItem"; // Re-import needed components
import { t } from "@/translations/helper";
import { getInitialViewMode, saveViewMode } from "@/utils/ui/view-mode-utils";
// @ts-ignore
import { filterTasks } from "@/utils/task/task-filter-utils";
import { sortTasks } from "@/commands/sortTaskCommands"; // 导入 sortTasks 函数
export class ContentComponent extends Component {
    constructor(parentEl, app, plugin, params = {}) {
        super();
        this.parentEl = parentEl;
        this.app = app;
        this.plugin = plugin;
        this.params = params;
        // Task data
        this.allTasks = [];
        this.notFilteredTasks = [];
        this.filteredTasks = []; // Tasks after filters applied
        this.selectedTask = null;
        // Child Components (managed by InboxComponent for lazy loading)
        this.taskComponents = [];
        this.treeComponents = [];
        this.taskPageSize = 50; // Number of tasks to load per batch
        this.nextTaskIndex = 0; // Index for next list item batch
        this.nextRootTaskIndex = 0; // Index for next tree root batch
        this.rootTasks = []; // Root tasks for tree view
        // State
        this.currentViewId = "inbox"; // Renamed from currentViewMode
        this.selectedProjectForView = null; // Keep track if a specific project is filtered (for project view)
        this.focusFilter = null; // Keep focus filter if needed
        this.isTreeView = false;
        this.isRendering = false; // Guard against concurrent renders
        this.pendingForceRefresh = false; // Track if a force refresh is pending
        this.pendingVisibilityRetry = false; // Queue a retry when container becomes visible
        this.visibilityRetryCount = 0; // Limit visibility retry loop
    }
    onload() {
        // Create main content container
        this.containerEl = this.parentEl.createDiv({ cls: "task-content" });
        // Create header
        this.createContentHeader();
        // Create task list container
        this.taskListEl = this.containerEl.createDiv({ cls: "task-list" });
        // Initialize view mode from saved state or global default
        this.initializeViewMode();
        // Set up intersection observer for lazy loading
        this.initializeVirtualList();
    }
    createContentHeader() {
        this.headerEl = this.containerEl.createDiv({ cls: "content-header" });
        // View title - will be updated in setViewMode
        this.titleEl = this.headerEl.createDiv({
            cls: "content-title",
            text: t("Inbox"), // Default title
        });
        // Task count
        this.countEl = this.headerEl.createDiv({
            cls: "task-count",
            text: t("0 tasks"),
        });
        // Filter controls
        const filterEl = this.headerEl.createDiv({ cls: "content-filter" });
        this.filterInput = filterEl.createEl("input", {
            cls: "filter-input",
            attr: { type: "text", placeholder: t("Filter tasks...") },
        });
        // View toggle button
        const viewToggleBtn = this.headerEl.createDiv({
            cls: "view-toggle-btn",
        });
        setIcon(viewToggleBtn, "list"); // Set initial icon
        viewToggleBtn.setAttribute("aria-label", t("Toggle list/tree view"));
        this.registerDomEvent(viewToggleBtn, "click", () => {
            this.toggleViewMode();
        });
        // Focus filter button (remains commented out)
        // ...
        // Event listeners
        let filterTimeout;
        this.registerDomEvent(this.filterInput, "input", () => {
            clearTimeout(filterTimeout);
            filterTimeout = setTimeout(() => {
                this.filterTasks(this.filterInput.value);
            }, 300); // 增加 300ms 防抖延迟
        });
    }
    initializeVirtualList() {
        this.taskListObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting &&
                    entry.target.classList.contains("task-load-marker")) {
                    // console.log(
                    // 	"Load marker intersecting, calling loadMoreTasks..."
                    // );
                    // Target is the load marker, load more tasks
                    this.loadMoreTasks();
                }
            });
        }, {
            root: this.taskListEl,
            threshold: 0.1, // Trigger when 10% of the marker is visible
        });
    }
    /**
     * Initialize view mode from saved state or global default
     */
    initializeViewMode() {
        var _a;
        this.isTreeView = getInitialViewMode(this.app, this.plugin, this.currentViewId);
        // Update the toggle button icon to match the initial state
        const viewToggleBtn = (_a = this.headerEl) === null || _a === void 0 ? void 0 : _a.querySelector(".view-toggle-btn");
        if (viewToggleBtn) {
            setIcon(viewToggleBtn, this.isTreeView ? "git-branch" : "list");
        }
    }
    toggleViewMode() {
        this.isTreeView = !this.isTreeView;
        const viewToggleBtn = this.headerEl.querySelector(".view-toggle-btn");
        if (viewToggleBtn) {
            setIcon(viewToggleBtn, this.isTreeView ? "git-branch" : "list");
        }
        // Save the new view mode state
        saveViewMode(this.app, this.currentViewId, this.isTreeView);
        this.refreshTaskList(); // Refresh list completely on view mode change
    }
    setIsTreeView(isTree) {
        var _a;
        if (this.isTreeView !== isTree) {
            this.isTreeView = isTree;
            const viewToggleBtn = (_a = this.headerEl) === null || _a === void 0 ? void 0 : _a.querySelector(".view-toggle-btn");
            if (viewToggleBtn) {
                setIcon(viewToggleBtn, this.isTreeView ? "git-branch" : "list");
            }
            this.refreshTaskList();
        }
    }
    setTasks(tasks, notFilteredTasks, forceRefresh = false) {
        var _a, _b, _c, _d;
        // Allow forced refresh for cases where we know the data has changed
        if (forceRefresh) {
            console.log("ContentComponent: Forced refresh requested");
            // Cancel any ongoing rendering if force refresh is requested
            this.isRendering = false;
            this.pendingForceRefresh = true;
            this.allTasks = tasks;
            this.notFilteredTasks = notFilteredTasks;
            this.applyFilters();
            this.refreshTaskList();
            return;
        }
        // If a force refresh is pending, skip non-forced updates
        if (this.pendingForceRefresh) {
            console.log("ContentComponent: Skipping non-forced update, force refresh is pending");
            return;
        }
        // Prevent unnecessary refreshes if data hasn't actually changed
        // Check if the array reference has changed (which indicates an update)
        if (this.allTasks === tasks &&
            this.notFilteredTasks === notFilteredTasks) {
            console.log("ContentComponent: Same array references, skipping refresh");
            return;
        }
        // Additional check for actual content changes
        if (this.allTasks.length === tasks.length &&
            this.notFilteredTasks.length === notFilteredTasks.length &&
            tasks.length > 0) {
            // Quick check - if same length and not empty, check if first few tasks are identical
            const sampleSize = Math.min(5, tasks.length);
            let unchanged = true;
            for (let i = 0; i < sampleSize; i++) {
                if (((_a = this.allTasks[i]) === null || _a === void 0 ? void 0 : _a.id) !== ((_b = tasks[i]) === null || _b === void 0 ? void 0 : _b.id) ||
                    ((_c = this.allTasks[i]) === null || _c === void 0 ? void 0 : _c.originalMarkdown) !==
                        ((_d = tasks[i]) === null || _d === void 0 ? void 0 : _d.originalMarkdown)) {
                    unchanged = false;
                    break;
                }
            }
            if (unchanged) {
                console.log("ContentComponent: Tasks unchanged, skipping refresh");
                return;
            }
        }
        this.allTasks = tasks;
        this.notFilteredTasks = notFilteredTasks;
        this.applyFilters();
        this.refreshTaskList();
    }
    // Updated method signature
    setViewMode(viewId, project) {
        this.currentViewId = viewId;
        this.selectedProjectForView = project === undefined ? null : project;
        // Update title based on the view config
        const viewConfig = getViewSettingOrDefault(this.plugin, viewId);
        let title = t(viewConfig.name);
        // Special handling for project view title (if needed, maybe handled by component itself)
        // if (viewId === "projects" && this.selectedProjectForView) {
        // 	const projectName = this.selectedProjectForView.split("/").pop();
        // 	title = projectName || t("Project");
        // }
        this.titleEl.setText(title);
        // Re-initialize view mode for the new view
        this.initializeViewMode();
        this.applyFilters();
        this.refreshTaskList();
    }
    applyFilters() {
        var _a, _b;
        // Call the centralized filter utility
        this.filteredTasks = filterTasks(this.allTasks, this.currentViewId, this.plugin, { textQuery: (_a = this.filterInput) === null || _a === void 0 ? void 0 : _a.value });
        const sortCriteria = (_b = this.plugin.settings.viewConfiguration.find((view) => view.id === this.currentViewId)) === null || _b === void 0 ? void 0 : _b.sortCriteria;
        if (sortCriteria && sortCriteria.length > 0) {
            this.filteredTasks = sortTasks(this.filteredTasks, sortCriteria, this.plugin.settings);
        }
        else {
            // Default sorting: completed tasks last, then by priority, due date, content,
            // with lowest-priority tie-breakers: filePath -> line
            this.filteredTasks.sort((a, b) => {
                var _a, _b, _c, _d, _e, _f, _g, _h;
                const completedA = a.completed;
                const completedB = b.completed;
                if (completedA !== completedB)
                    return completedA ? 1 : -1;
                // Access priority from metadata
                const prioA = (_a = a.metadata.priority) !== null && _a !== void 0 ? _a : 0;
                const prioB = (_b = b.metadata.priority) !== null && _b !== void 0 ? _b : 0;
                if (prioA !== prioB)
                    return prioB - prioA;
                // Access due date from metadata
                const dueA = (_c = a.metadata.dueDate) !== null && _c !== void 0 ? _c : Infinity;
                const dueB = (_d = b.metadata.dueDate) !== null && _d !== void 0 ? _d : Infinity;
                if (dueA !== dueB)
                    return dueA - dueB;
                // Content compare (case-insensitive numeric aware)
                const collator = new Intl.Collator(undefined, {
                    usage: "sort",
                    sensitivity: "base",
                    numeric: true,
                });
                const contentCmp = collator.compare((_e = a.content) !== null && _e !== void 0 ? _e : "", (_f = b.content) !== null && _f !== void 0 ? _f : "");
                if (contentCmp !== 0)
                    return contentCmp;
                // Lowest-priority tie-breakers to ensure stability across files
                const fp = (a.filePath || "").localeCompare(b.filePath || "");
                if (fp !== 0)
                    return fp;
                return ((_g = a.line) !== null && _g !== void 0 ? _g : 0) - ((_h = b.line) !== null && _h !== void 0 ? _h : 0);
            });
        }
        // Update the task count display
        this.countEl.setText(`${this.filteredTasks.length} ${t("tasks")}`);
    }
    filterTasks(query) {
        this.applyFilters(); // Re-apply all filters including the new text query
        this.refreshTaskList();
    }
    cleanupComponents() {
        // Unload and clear previous components
        this.taskComponents.forEach((component) => this.removeChild(component));
        this.taskComponents = [];
        this.treeComponents.forEach((component) => this.removeChild(component));
        this.treeComponents = [];
        // Disconnect observer from any previous elements
        this.taskListObserver.disconnect();
        // Clear the container
        this.taskListEl.empty();
    }
    isContainerVisible() {
        if (!this.containerEl)
            return false;
        const inDom = document.body.contains(this.containerEl);
        if (!inDom)
            return false;
        const style = window.getComputedStyle(this.containerEl);
        if (style.display === "none" || style.visibility === "hidden")
            return false;
        const rect = this.containerEl.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }
    refreshTaskList() {
        var _a;
        // Defer rendering if container is not visible yet (e.g., view hidden during init)
        if (!this.isContainerVisible()) {
            console.warn("ContentComponent: Cannot render: Container not visible. Queuing refresh...");
            this.pendingForceRefresh = true;
            if (!this.pendingVisibilityRetry) {
                this.pendingVisibilityRetry = true;
                const tryAgain = () => {
                    if (this.isContainerVisible()) {
                        this.pendingVisibilityRetry = false;
                        this.visibilityRetryCount = 0;
                        if (this.pendingForceRefresh && !this.isRendering) {
                            this.pendingForceRefresh = false;
                            this.refreshTaskList();
                        }
                        return;
                    }
                    if (this.visibilityRetryCount < 30) {
                        this.visibilityRetryCount++;
                        setTimeout(tryAgain, 100);
                    }
                    else {
                        this.pendingVisibilityRetry = false;
                        this.visibilityRetryCount = 0;
                        console.warn("ContentComponent: Container still not visible after retries; will wait for next trigger.");
                    }
                };
                tryAgain();
            }
            return;
        }
        // If a render is already in progress, queue a refresh instead of skipping
        if (this.isRendering) {
            console.log("ContentComponent: Already rendering, queueing a refresh");
            this.pendingForceRefresh = true;
            return;
        }
        this.isRendering = true;
        // Capture scroll state to mitigate scrollbar jumping
        const prevScrollState = this.captureScrollState();
        try {
            this.cleanupComponents(); // Clear previous state and components
            // Reset indices for lazy loading
            this.nextTaskIndex = 0;
            this.nextRootTaskIndex = 0;
            this.rootTasks = [];
            if (this.filteredTasks.length === 0) {
                this.addEmptyState(t("No tasks found."));
                return;
            }
            // Render based on view mode
            if (this.isTreeView) {
                const taskMap = new Map();
                // Add all non-filtered tasks to the taskMap
                this.notFilteredTasks.forEach((task) => taskMap.set(task.id, task));
                this.rootTasks = tasksToTree(this.filteredTasks); // Calculate root tasks
                // Sort roots according to view's sort criteria (fallback to sensible defaults)
                const viewSortCriteria = (_a = this.plugin.settings.viewConfiguration.find((view) => view.id === this.currentViewId)) === null || _a === void 0 ? void 0 : _a.sortCriteria;
                if (viewSortCriteria && viewSortCriteria.length > 0) {
                    this.rootTasks = sortTasks(this.rootTasks, viewSortCriteria, this.plugin.settings);
                }
                else {
                    // Default sorting: completed tasks last, then by priority, due date, content,
                    // with lowest-priority tie-breakers: filePath -> line
                    this.rootTasks.sort((a, b) => {
                        var _a, _b, _c, _d, _e, _f, _g, _h;
                        const completedA = a.completed;
                        const completedB = b.completed;
                        if (completedA !== completedB)
                            return completedA ? 1 : -1;
                        // Access priority from metadata
                        const prioA = (_a = a.metadata.priority) !== null && _a !== void 0 ? _a : 0;
                        const prioB = (_b = b.metadata.priority) !== null && _b !== void 0 ? _b : 0;
                        if (prioA !== prioB)
                            return prioB - prioA;
                        // Access due date from metadata
                        const dueA = (_c = a.metadata.dueDate) !== null && _c !== void 0 ? _c : Infinity;
                        const dueB = (_d = b.metadata.dueDate) !== null && _d !== void 0 ? _d : Infinity;
                        if (dueA !== dueB)
                            return dueA - dueB;
                        // Content compare (case-insensitive numeric aware)
                        const collator = new Intl.Collator(undefined, {
                            usage: "sort",
                            sensitivity: "base",
                            numeric: true,
                        });
                        const contentCmp = collator.compare((_e = a.content) !== null && _e !== void 0 ? _e : "", (_f = b.content) !== null && _f !== void 0 ? _f : "");
                        if (contentCmp !== 0)
                            return contentCmp;
                        // Lowest-priority tie-breakers to ensure stability across files
                        const fp = (a.filePath || "").localeCompare(b.filePath || "");
                        if (fp !== 0)
                            return fp;
                        return ((_g = a.line) !== null && _g !== void 0 ? _g : 0) - ((_h = b.line) !== null && _h !== void 0 ? _h : 0);
                    });
                }
                this.loadRootTaskBatch(taskMap); // Load the first batch
            }
            else {
                this.loadTaskBatch(); // Load the first batch
            }
            // Add load marker if necessary
            this.checkAndAddLoadMarker();
            // Restore scroll state after render
            this.restoreScrollState(prevScrollState);
        }
        finally {
            // Reset rendering flag after completion
            setTimeout(() => {
                this.isRendering = false;
                // If a refresh was queued during rendering, process it now
                if (this.pendingForceRefresh) {
                    this.pendingForceRefresh = false;
                    this.refreshTaskList();
                }
            }, 50); // Small delay to prevent immediate re-entry
        }
    }
    // Capture current scroll state (anchor id + offset + scrollTop)
    captureScrollState() {
        const container = this.taskListEl;
        if (!container)
            return {
                scrollTop: 0,
                anchorId: null,
                anchorOffset: 0,
            };
        const scrollTop = container.scrollTop;
        let anchorId = null;
        let anchorOffset = 0;
        const containerRect = container.getBoundingClientRect();
        // Find first visible task item
        const items = Array.from(container.querySelectorAll(".task-item"));
        for (const el of items) {
            const rect = el.getBoundingClientRect();
            const offset = rect.top - containerRect.top;
            if (rect.bottom > containerRect.top) {
                anchorId = el.getAttribute("data-task-id");
                anchorOffset = Math.max(0, offset);
                break;
            }
        }
        return { scrollTop, anchorId, anchorOffset };
    }
    // Restore scroll state after re-render
    restoreScrollState(state) {
        const container = this.taskListEl;
        if (!container)
            return;
        // Try anchor-based restoration first
        if (state.anchorId) {
            const anchorEl = container.querySelector(`[data-task-id="${state.anchorId}"]`);
            if (anchorEl) {
                const desiredOffset = state.anchorOffset;
                const currentOffset = anchorEl.getBoundingClientRect().top -
                    container.getBoundingClientRect().top;
                const delta = currentOffset - desiredOffset;
                container.scrollTop += delta;
                return;
            }
        }
        // Fallback: restore raw scrollTop
        container.scrollTop = state.scrollTop;
    }
    loadTaskBatch() {
        const fragment = document.createDocumentFragment();
        const countToLoad = this.taskPageSize;
        const start = this.nextTaskIndex;
        const end = Math.min(start + countToLoad, this.filteredTasks.length);
        // console.log(`Loading list tasks from ${start} to ${end}`);
        for (let i = start; i < end; i++) {
            const task = this.filteredTasks[i];
            const taskComponent = new TaskListItemComponent(task, this.currentViewId, // Pass currentViewId
            this.app, this.plugin);
            // Attach event handlers
            taskComponent.onTaskSelected = this.selectTask.bind(this);
            taskComponent.onTaskCompleted = (t) => {
                if (this.params.onTaskCompleted)
                    this.params.onTaskCompleted(t);
            };
            taskComponent.onTaskUpdate = (originalTask, updatedTask) => __awaiter(this, void 0, void 0, function* () {
                if (this.params.onTaskUpdate) {
                    console.log("ContentComponent onTaskUpdate", originalTask.content, updatedTask.content);
                    yield this.params.onTaskUpdate(originalTask, updatedTask);
                }
            });
            taskComponent.onTaskContextMenu = (e, t) => {
                if (this.params.onTaskContextMenu)
                    this.params.onTaskContextMenu(e, t);
            };
            this.addChild(taskComponent); // Manage lifecycle
            taskComponent.load();
            fragment.appendChild(taskComponent.element);
            this.taskComponents.push(taskComponent); // Keep track of rendered components
        }
        this.taskListEl.appendChild(fragment);
        this.nextTaskIndex = end; // Update index for the next batch
        return end; // Return the new end index
    }
    loadRootTaskBatch(taskMap) {
        const fragment = document.createDocumentFragment();
        const countToLoad = this.taskPageSize;
        const start = this.nextRootTaskIndex;
        const end = Math.min(start + countToLoad, this.rootTasks.length);
        // Make sure all non-filtered tasks are in the taskMap
        this.notFilteredTasks.forEach((task) => {
            if (!taskMap.has(task.id)) {
                taskMap.set(task.id, task);
            }
        });
        for (let i = start; i < end; i++) {
            const rootTask = this.rootTasks[i];
            const childTasks = this.notFilteredTasks.filter((task) => task.metadata.parent === rootTask.id);
            const treeComponent = new TaskTreeItemComponent(rootTask, this.currentViewId, // Pass currentViewId
            this.app, 0, childTasks, taskMap, this.plugin);
            // Attach event handlers
            treeComponent.onTaskSelected = this.selectTask.bind(this);
            treeComponent.onTaskCompleted = (t) => {
                if (this.params.onTaskCompleted)
                    this.params.onTaskCompleted(t);
            };
            treeComponent.onTaskUpdate = (originalTask, updatedTask) => __awaiter(this, void 0, void 0, function* () {
                if (this.params.onTaskUpdate) {
                    yield this.params.onTaskUpdate(originalTask, updatedTask);
                }
            });
            treeComponent.onTaskContextMenu = (e, t) => {
                if (this.params.onTaskContextMenu)
                    this.params.onTaskContextMenu(e, t);
            };
            this.addChild(treeComponent); // Manage lifecycle
            treeComponent.load();
            fragment.appendChild(treeComponent.element);
            this.treeComponents.push(treeComponent); // Keep track of rendered components
        }
        this.taskListEl.appendChild(fragment);
        this.nextRootTaskIndex = end; // Update index for the next batch
        return end; // Return the new end index
    }
    checkAndAddLoadMarker() {
        this.removeLoadMarker(); // Remove existing marker first
        const moreTasksExist = this.isTreeView
            ? this.nextRootTaskIndex < this.rootTasks.length
            : this.nextTaskIndex < this.filteredTasks.length;
        // console.log(
        // 	`Check load marker: moreTasksExist = ${moreTasksExist} (Tree: ${this.nextRootTaskIndex}/${this.rootTasks.length}, List: ${this.nextTaskIndex}/${this.filteredTasks.length})`
        // );
        if (moreTasksExist) {
            this.addLoadMarker();
        }
    }
    addLoadMarker() {
        const loadMarker = this.taskListEl.createDiv({
            cls: "task-load-marker",
            attr: { "data-task-id": "load-marker" }, // Use data attribute for identification
        });
        loadMarker.setText(t("Loading more..."));
        // console.log("Adding load marker and observing.");
        this.taskListObserver.observe(loadMarker); // Observe the marker
    }
    removeLoadMarker() {
        const oldMarker = this.taskListEl.querySelector(".task-load-marker");
        if (oldMarker) {
            this.taskListObserver.unobserve(oldMarker); // Stop observing before removing
            oldMarker.remove();
        }
    }
    loadMoreTasks() {
        // console.log("Load more tasks triggered...");
        this.removeLoadMarker(); // Remove the current marker
        if (this.isTreeView) {
            if (this.nextRootTaskIndex < this.rootTasks.length) {
                // console.log(
                // 	`Loading more TREE tasks from index ${this.nextRootTaskIndex}`
                // );
                const taskMap = new Map();
                this.filteredTasks.forEach((task) => taskMap.set(task.id, task));
                this.loadRootTaskBatch(taskMap);
            }
            else {
                // console.log("No more TREE tasks to load.");
            }
        }
        else {
            if (this.nextTaskIndex < this.filteredTasks.length) {
                // console.log(
                // 	`Loading more LIST tasks from index ${this.nextTaskIndex}`
                // );
                this.loadTaskBatch();
            }
            else {
                // console.log("No more LIST tasks to load.");
            }
        }
        // Add the marker back if there are still more tasks after loading the batch
        this.checkAndAddLoadMarker();
    }
    addEmptyState(message) {
        this.cleanupComponents(); // Ensure list is clean
        const emptyEl = this.taskListEl.createDiv({ cls: "task-empty-state" });
        emptyEl.setText(message);
    }
    selectTask(task) {
        var _a;
        if (((_a = this.selectedTask) === null || _a === void 0 ? void 0 : _a.id) === (task === null || task === void 0 ? void 0 : task.id) && task !== null) {
            // If clicking the already selected task, deselect it (or toggle details - handled by TaskView)
            // this.selectedTask = null;
            // console.log("Task deselected (in ContentComponent):", task?.id);
            // // Update visual state of the item if needed (remove highlight)
            // const itemEl = this.taskListEl.querySelector(`[data-task-row-id="${task.id}"]`);
            // itemEl?.removeClass('is-selected'); // Example class
            // if(this.onTaskSelected) this.onTaskSelected(null); // Notify parent
            // return;
        }
        // Deselect previous task visually if needed
        if (this.selectedTask) {
            // const prevItemEl = this.taskListEl.querySelector(`[data-task-row-id="${this.selectedTask.id}"]`);
            // prevItemEl?.removeClass('is-selected');
        }
        this.selectedTask = task;
        // console.log("Task selected (in ContentComponent):", task?.id);
        // Select new task visually if needed
        if (task) {
            // const newItemEl = this.taskListEl.querySelector(`[data-task-row-id="${task.id}"]`);
            // newItemEl?.addClass('is-selected');
        }
        if (this.params.onTaskSelected) {
            this.params.onTaskSelected(task);
        }
    }
    updateTask(updatedTask) {
        // 1) Update sources
        const taskIndexAll = this.allTasks.findIndex((t) => t.id === updatedTask.id);
        if (taskIndexAll !== -1)
            this.allTasks[taskIndexAll] = Object.assign({}, updatedTask);
        const taskIndexNotFiltered = this.notFilteredTasks.findIndex((t) => t.id === updatedTask.id);
        if (taskIndexNotFiltered !== -1)
            this.notFilteredTasks[taskIndexNotFiltered] = Object.assign({}, updatedTask);
        if (this.selectedTask && this.selectedTask.id === updatedTask.id)
            this.selectedTask = Object.assign({}, updatedTask);
        // 2) Re-apply filters and detect visibility change
        const prevLen = this.filteredTasks.length;
        this.applyFilters();
        const taskFromFiltered = this.filteredTasks.find((t) => t.id === updatedTask.id);
        const taskStillVisible = !!taskFromFiltered;
        // Helper: insert list item at correct position (list view)
        const insertListItem = (taskToInsert) => {
            const compIds = new Set(this.taskComponents.map((c) => c.getTask().id));
            const sortedIndex = this.filteredTasks.findIndex((t) => t.id === taskToInsert.id);
            // Find the next rendered neighbor after sortedIndex
            let nextComp = null;
            for (let i = sortedIndex + 1; i < this.filteredTasks.length; i++) {
                const id = this.filteredTasks[i].id;
                if (compIds.has(id)) {
                    nextComp = this.taskComponents.find((c) => c.getTask().id === id);
                    break;
                }
            }
            // Create component
            const taskComponent = new TaskListItemComponent(taskToInsert, this.currentViewId, this.app, this.plugin);
            // Attach events
            taskComponent.onTaskSelected = this.selectTask.bind(this);
            taskComponent.onTaskCompleted = (t) => {
                var _a, _b;
                (_b = (_a = this.params).onTaskCompleted) === null || _b === void 0 ? void 0 : _b.call(_a, t);
            };
            taskComponent.onTaskUpdate = (orig, upd) => __awaiter(this, void 0, void 0, function* () {
                if (this.params.onTaskUpdate)
                    yield this.params.onTaskUpdate(orig, upd);
            });
            taskComponent.onTaskContextMenu = (e, t) => {
                var _a, _b;
                (_b = (_a = this.params).onTaskContextMenu) === null || _b === void 0 ? void 0 : _b.call(_a, e, t);
            };
            this.addChild(taskComponent);
            taskComponent.load();
            // Insert DOM
            if (nextComp) {
                this.taskListEl.insertBefore(taskComponent.element, nextComp.element);
                const idx = this.taskComponents.indexOf(nextComp);
                this.taskComponents.splice(idx, 0, taskComponent);
            }
            else {
                this.taskListEl.appendChild(taskComponent.element);
                this.taskComponents.push(taskComponent);
            }
        };
        // Helper: remove list item
        const removeListItem = (taskId) => {
            const idx = this.taskComponents.findIndex((c) => c.getTask().id === taskId);
            if (idx >= 0) {
                const comp = this.taskComponents[idx];
                this.removeChild(comp);
                comp.element.remove();
                this.taskComponents.splice(idx, 1);
            }
        };
        // Helper: sort comparator for roots (filePath -> line)
        const rootComparator = (a, b) => {
            var _a, _b;
            const fp = (a.filePath || "").localeCompare(b.filePath || "");
            if (fp !== 0)
                return fp;
            return ((_a = a.line) !== null && _a !== void 0 ? _a : 0) - ((_b = b.line) !== null && _b !== void 0 ? _b : 0);
        };
        if (taskStillVisible) {
            if (!this.isTreeView) {
                // List view: update in place or insert if new to view
                const comp = this.taskComponents.find((c) => c.getTask().id === updatedTask.id);
                if (comp) {
                    comp.updateTask(taskFromFiltered);
                }
                else {
                    insertListItem(taskFromFiltered);
                }
            }
            else {
                // Tree view: update existing subtree or insert to parent/root
                const comp = this.treeComponents.find((c) => c.getTask().id === updatedTask.id);
                if (comp) {
                    comp.updateTask(taskFromFiltered);
                }
                else {
                    // Not a root comp; try update within children
                    let updated = false;
                    for (const rootComp of this.treeComponents) {
                        if (rootComp.updateTaskRecursively(taskFromFiltered)) {
                            updated = true;
                            break;
                        }
                    }
                    if (!updated) {
                        // Insert new visible task
                        const parentId = taskFromFiltered.metadata.parent;
                        if (parentId) {
                            // Find parent comp and rebuild its children list incrementally
                            for (const rootComp of this.treeComponents) {
                                const parentComp = rootComp.findComponentByTaskId(parentId);
                                if (parentComp) {
                                    const newChildren = this.notFilteredTasks.filter((t) => t.metadata.parent === parentId);
                                    parentComp.updateChildTasks(newChildren);
                                    updated = true;
                                    break;
                                }
                            }
                        }
                        else {
                            // Root insertion
                            const taskMap = new Map();
                            this.notFilteredTasks.forEach((t) => taskMap.set(t.id, t));
                            const childTasks = this.notFilteredTasks.filter((t) => t.metadata.parent === taskFromFiltered.id);
                            const newRoot = new TaskTreeItemComponent(taskFromFiltered, this.currentViewId, this.app, 0, childTasks, taskMap, this.plugin);
                            newRoot.onTaskSelected = this.selectTask.bind(this);
                            newRoot.onTaskCompleted = (t) => {
                                var _a, _b;
                                (_b = (_a = this.params).onTaskCompleted) === null || _b === void 0 ? void 0 : _b.call(_a, t);
                            };
                            newRoot.onTaskUpdate = (orig, upd) => __awaiter(this, void 0, void 0, function* () {
                                if (this.params.onTaskUpdate)
                                    yield this.params.onTaskUpdate(orig, upd);
                            });
                            newRoot.onTaskContextMenu = (e, t) => {
                                var _a, _b;
                                (_b = (_a = this.params).onTaskContextMenu) === null || _b === void 0 ? void 0 : _b.call(_a, e, t);
                            };
                            this.addChild(newRoot);
                            newRoot.load();
                            // Determine insert index among existing roots
                            let insertAt = this.treeComponents.length;
                            for (let i = 0; i < this.treeComponents.length; i++) {
                                if (rootComparator(taskFromFiltered, this.treeComponents[i].getTask()) < 0) {
                                    insertAt = i;
                                    break;
                                }
                            }
                            if (insertAt < this.treeComponents.length) {
                                this.taskListEl.insertBefore(newRoot.element, this.treeComponents[insertAt].element);
                                this.treeComponents.splice(insertAt, 0, newRoot);
                            }
                            else {
                                this.taskListEl.appendChild(newRoot.element);
                                this.treeComponents.push(newRoot);
                            }
                        }
                    }
                }
            }
        }
        else {
            // Task became not visible
            if (!this.isTreeView) {
                removeListItem(updatedTask.id);
                // Optional: backfill one more item if available
                if (this.nextTaskIndex < this.filteredTasks.length) {
                    this.loadTaskBatch();
                }
            }
            else {
                // Tree view removal
                // If root component exists, remove it
                const idx = this.treeComponents.findIndex((c) => c.getTask().id === updatedTask.id);
                if (idx >= 0) {
                    const comp = this.treeComponents[idx];
                    this.removeChild(comp);
                    comp.element.remove();
                    this.treeComponents.splice(idx, 1);
                }
                else {
                    // Otherwise remove from its parent's subtree
                    for (const rootComp of this.treeComponents) {
                        if (rootComp.removeChildByTaskId(updatedTask.id))
                            break;
                    }
                }
            }
        }
        // 3) Update count display (no full refresh path)
        if (this.filteredTasks.length !== prevLen) {
            this.countEl.setText(`${this.filteredTasks.length} ${t("tasks")}`);
        }
    }
    getSelectedTask() {
        return this.selectedTask;
    }
    onunload() {
        this.cleanupComponents(); // Use the cleanup method
        this.containerEl.empty(); // Extra safety
        this.containerEl.remove();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvbnRlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBTyxTQUFTLEVBQUUsT0FBTyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBRW5ELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLFlBQVksQ0FBQyxDQUFDLDhCQUE4QjtBQUNsRixPQUFPLEVBQVksdUJBQXVCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQyxDQUFDLG1CQUFtQjtBQUNwRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNEJBQTRCLENBQUMsQ0FBQyx5QkFBeUI7QUFDbkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sWUFBWSxDQUFDLENBQUMsOEJBQThCO0FBQ2xGLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUUxQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsWUFBWSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFFOUUsYUFBYTtBQUNiLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNkJBQTZCLENBQUMsQ0FBQyxrQkFBa0I7QUFTM0UsTUFBTSxPQUFPLGdCQUFpQixTQUFRLFNBQVM7SUFrQzlDLFlBQ1MsUUFBcUIsRUFDckIsR0FBUSxFQUNSLE1BQTZCLEVBQzdCLFNBQWlDLEVBQUU7UUFFM0MsS0FBSyxFQUFFLENBQUM7UUFMQSxhQUFRLEdBQVIsUUFBUSxDQUFhO1FBQ3JCLFFBQUcsR0FBSCxHQUFHLENBQUs7UUFDUixXQUFNLEdBQU4sTUFBTSxDQUF1QjtRQUM3QixXQUFNLEdBQU4sTUFBTSxDQUE2QjtRQTlCNUMsWUFBWTtRQUNKLGFBQVEsR0FBVyxFQUFFLENBQUM7UUFDdEIscUJBQWdCLEdBQVcsRUFBRSxDQUFDO1FBQzlCLGtCQUFhLEdBQVcsRUFBRSxDQUFDLENBQUMsOEJBQThCO1FBQzFELGlCQUFZLEdBQWdCLElBQUksQ0FBQztRQUV6QyxnRUFBZ0U7UUFDeEQsbUJBQWMsR0FBNEIsRUFBRSxDQUFDO1FBQzdDLG1CQUFjLEdBQTRCLEVBQUUsQ0FBQztRQUk3QyxpQkFBWSxHQUFHLEVBQUUsQ0FBQyxDQUFDLG9DQUFvQztRQUN2RCxrQkFBYSxHQUFHLENBQUMsQ0FBQyxDQUFDLGlDQUFpQztRQUNwRCxzQkFBaUIsR0FBRyxDQUFDLENBQUMsQ0FBQyxpQ0FBaUM7UUFDeEQsY0FBUyxHQUFXLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQjtRQUUzRCxRQUFRO1FBQ0Esa0JBQWEsR0FBYSxPQUFPLENBQUMsQ0FBQywrQkFBK0I7UUFDbEUsMkJBQXNCLEdBQWtCLElBQUksQ0FBQyxDQUFDLGtFQUFrRTtRQUNoSCxnQkFBVyxHQUFrQixJQUFJLENBQUMsQ0FBQyw4QkFBOEI7UUFDakUsZUFBVSxHQUFZLEtBQUssQ0FBQztRQUM1QixnQkFBVyxHQUFZLEtBQUssQ0FBQyxDQUFDLG1DQUFtQztRQUNqRSx3QkFBbUIsR0FBWSxLQUFLLENBQUMsQ0FBQyxzQ0FBc0M7UUFDNUUsMkJBQXNCLEdBQVksS0FBSyxDQUFDLENBQUMsK0NBQStDO1FBQ3hGLHlCQUFvQixHQUFXLENBQUMsQ0FBQyxDQUFDLDhCQUE4QjtJQVF4RSxDQUFDO0lBRUQsTUFBTTtRQUNMLGdDQUFnQztRQUNoQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFFcEUsZ0JBQWdCO1FBQ2hCLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBRTNCLDZCQUE2QjtRQUM3QixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFFbkUsMERBQTBEO1FBQzFELElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBRTFCLGdEQUFnRDtRQUNoRCxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBRU8sbUJBQW1CO1FBQzFCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO1FBRXRFLDhDQUE4QztRQUM5QyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDO1lBQ3RDLEdBQUcsRUFBRSxlQUFlO1lBQ3BCLElBQUksRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsZ0JBQWdCO1NBQ2xDLENBQUMsQ0FBQztRQUVILGFBQWE7UUFDYixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDO1lBQ3RDLEdBQUcsRUFBRSxZQUFZO1lBQ2pCLElBQUksRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDO1NBQ2xCLENBQUMsQ0FBQztRQUVILGtCQUFrQjtRQUNsQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLENBQUM7UUFDcEUsSUFBSSxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRTtZQUM3QyxHQUFHLEVBQUUsY0FBYztZQUNuQixJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsRUFBRTtTQUN6RCxDQUFDLENBQUM7UUFFSCxxQkFBcUI7UUFDckIsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUM7WUFDN0MsR0FBRyxFQUFFLGlCQUFpQjtTQUN0QixDQUFDLENBQUM7UUFDSCxPQUFPLENBQUMsYUFBYSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsbUJBQW1CO1FBQ25ELGFBQWEsQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUM7UUFDckUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFO1lBQ2xELElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUN2QixDQUFDLENBQUMsQ0FBQztRQUVILDhDQUE4QztRQUM5QyxNQUFNO1FBRU4sa0JBQWtCO1FBQ2xCLElBQUksYUFBNkIsQ0FBQztRQUNsQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFO1lBQ3JELFlBQVksQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUM1QixhQUFhLEdBQUcsVUFBVSxDQUFDLEdBQUcsRUFBRTtnQkFDL0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLGdCQUFnQjtRQUMxQixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTyxxQkFBcUI7UUFDNUIsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksb0JBQW9CLENBQy9DLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDWCxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ3pCLElBQ0MsS0FBSyxDQUFDLGNBQWM7b0JBQ3BCLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxFQUNsRDtvQkFDRCxlQUFlO29CQUNmLHdEQUF3RDtvQkFDeEQsS0FBSztvQkFDTCw2Q0FBNkM7b0JBQzdDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztpQkFDckI7WUFDRixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsRUFDRDtZQUNDLElBQUksRUFBRSxJQUFJLENBQUMsVUFBVTtZQUNyQixTQUFTLEVBQUUsR0FBRyxFQUFFLDRDQUE0QztTQUM1RCxDQUNELENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSyxrQkFBa0I7O1FBQ3pCLElBQUksQ0FBQyxVQUFVLEdBQUcsa0JBQWtCLENBQ25DLElBQUksQ0FBQyxHQUFHLEVBQ1IsSUFBSSxDQUFDLE1BQU0sRUFDWCxJQUFJLENBQUMsYUFBYSxDQUNsQixDQUFDO1FBQ0YsMkRBQTJEO1FBQzNELE1BQU0sYUFBYSxHQUFHLE1BQUEsSUFBSSxDQUFDLFFBQVEsMENBQUUsYUFBYSxDQUNqRCxrQkFBa0IsQ0FDSCxDQUFDO1FBQ2pCLElBQUksYUFBYSxFQUFFO1lBQ2xCLE9BQU8sQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUNoRTtJQUNGLENBQUM7SUFFTyxjQUFjO1FBQ3JCLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQ25DLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUNoRCxrQkFBa0IsQ0FDSCxDQUFDO1FBQ2pCLElBQUksYUFBYSxFQUFFO1lBQ2xCLE9BQU8sQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUNoRTtRQUNELCtCQUErQjtRQUMvQixZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM1RCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyw4Q0FBOEM7SUFDdkUsQ0FBQztJQUVNLGFBQWEsQ0FBQyxNQUFlOztRQUNuQyxJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssTUFBTSxFQUFFO1lBQy9CLElBQUksQ0FBQyxVQUFVLEdBQUcsTUFBTSxDQUFDO1lBQ3pCLE1BQU0sYUFBYSxHQUFHLE1BQUEsSUFBSSxDQUFDLFFBQVEsMENBQUUsYUFBYSxDQUNqRCxrQkFBa0IsQ0FDSCxDQUFDO1lBQ2pCLElBQUksYUFBYSxFQUFFO2dCQUNsQixPQUFPLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDaEU7WUFDRCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7U0FDdkI7SUFDRixDQUFDO0lBRU0sUUFBUSxDQUNkLEtBQWEsRUFDYixnQkFBd0IsRUFDeEIsZUFBd0IsS0FBSzs7UUFFN0Isb0VBQW9FO1FBQ3BFLElBQUksWUFBWSxFQUFFO1lBQ2pCLE9BQU8sQ0FBQyxHQUFHLENBQUMsNENBQTRDLENBQUMsQ0FBQztZQUMxRCw2REFBNkQ7WUFDN0QsSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUM7WUFDekIsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQztZQUNoQyxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQztZQUN0QixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUM7WUFDekMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3BCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN2QixPQUFPO1NBQ1A7UUFFRCx5REFBeUQ7UUFDekQsSUFBSSxJQUFJLENBQUMsbUJBQW1CLEVBQUU7WUFDN0IsT0FBTyxDQUFDLEdBQUcsQ0FDVix3RUFBd0UsQ0FDeEUsQ0FBQztZQUNGLE9BQU87U0FDUDtRQUVELGdFQUFnRTtRQUNoRSx1RUFBdUU7UUFDdkUsSUFDQyxJQUFJLENBQUMsUUFBUSxLQUFLLEtBQUs7WUFDdkIsSUFBSSxDQUFDLGdCQUFnQixLQUFLLGdCQUFnQixFQUN6QztZQUNELE9BQU8sQ0FBQyxHQUFHLENBQ1YsMkRBQTJELENBQzNELENBQUM7WUFDRixPQUFPO1NBQ1A7UUFFRCw4Q0FBOEM7UUFDOUMsSUFDQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxLQUFLLENBQUMsTUFBTTtZQUNyQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxLQUFLLGdCQUFnQixDQUFDLE1BQU07WUFDeEQsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQ2Y7WUFDRCxxRkFBcUY7WUFDckYsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzdDLElBQUksU0FBUyxHQUFHLElBQUksQ0FBQztZQUNyQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsVUFBVSxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUNwQyxJQUNDLENBQUEsTUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQywwQ0FBRSxFQUFFLE9BQUssTUFBQSxLQUFLLENBQUMsQ0FBQyxDQUFDLDBDQUFFLEVBQUUsQ0FBQTtvQkFDckMsQ0FBQSxNQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLDBDQUFFLGdCQUFnQjt5QkFDakMsTUFBQSxLQUFLLENBQUMsQ0FBQyxDQUFDLDBDQUFFLGdCQUFnQixDQUFBLEVBQzFCO29CQUNELFNBQVMsR0FBRyxLQUFLLENBQUM7b0JBQ2xCLE1BQU07aUJBQ047YUFDRDtZQUNELElBQUksU0FBUyxFQUFFO2dCQUNkLE9BQU8sQ0FBQyxHQUFHLENBQ1YscURBQXFELENBQ3JELENBQUM7Z0JBQ0YsT0FBTzthQUNQO1NBQ0Q7UUFFRCxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQztRQUN0QixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUM7UUFDekMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ3BCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUN4QixDQUFDO0lBRUQsMkJBQTJCO0lBQ3BCLFdBQVcsQ0FBQyxNQUFnQixFQUFFLE9BQXVCO1FBQzNELElBQUksQ0FBQyxhQUFhLEdBQUcsTUFBTSxDQUFDO1FBQzVCLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxPQUFPLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUVyRSx3Q0FBd0M7UUFDeEMsTUFBTSxVQUFVLEdBQUcsdUJBQXVCLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNoRSxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRS9CLHlGQUF5RjtRQUN6Riw4REFBOEQ7UUFDOUQscUVBQXFFO1FBQ3JFLHdDQUF3QztRQUN4QyxJQUFJO1FBQ0osSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFNUIsMkNBQTJDO1FBQzNDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBRTFCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNwQixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDeEIsQ0FBQztJQUVPLFlBQVk7O1FBQ25CLHNDQUFzQztRQUN0QyxJQUFJLENBQUMsYUFBYSxHQUFHLFdBQVcsQ0FDL0IsSUFBSSxDQUFDLFFBQVEsRUFDYixJQUFJLENBQUMsYUFBYSxFQUNsQixJQUFJLENBQUMsTUFBTSxFQUNYLEVBQUUsU0FBUyxFQUFFLE1BQUEsSUFBSSxDQUFDLFdBQVcsMENBQUUsS0FBSyxFQUFFLENBQ3RDLENBQUM7UUFFRixNQUFNLFlBQVksR0FBRyxNQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FDL0QsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssSUFBSSxDQUFDLGFBQWEsQ0FDeEMsMENBQUUsWUFBWSxDQUFDO1FBQ2hCLElBQUksWUFBWSxJQUFJLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQzVDLElBQUksQ0FBQyxhQUFhLEdBQUcsU0FBUyxDQUM3QixJQUFJLENBQUMsYUFBYSxFQUNsQixZQUFZLEVBQ1osSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQ3BCLENBQUM7U0FDRjthQUFNO1lBQ04sOEVBQThFO1lBQzlFLHNEQUFzRDtZQUN0RCxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTs7Z0JBQ2hDLE1BQU0sVUFBVSxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUM7Z0JBQy9CLE1BQU0sVUFBVSxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUM7Z0JBQy9CLElBQUksVUFBVSxLQUFLLFVBQVU7b0JBQUUsT0FBTyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBRTFELGdDQUFnQztnQkFDaEMsTUFBTSxLQUFLLEdBQUcsTUFBQSxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsbUNBQUksQ0FBQyxDQUFDO2dCQUN2QyxNQUFNLEtBQUssR0FBRyxNQUFBLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxtQ0FBSSxDQUFDLENBQUM7Z0JBQ3ZDLElBQUksS0FBSyxLQUFLLEtBQUs7b0JBQUUsT0FBTyxLQUFLLEdBQUcsS0FBSyxDQUFDO2dCQUUxQyxnQ0FBZ0M7Z0JBQ2hDLE1BQU0sSUFBSSxHQUFHLE1BQUEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLG1DQUFJLFFBQVEsQ0FBQztnQkFDNUMsTUFBTSxJQUFJLEdBQUcsTUFBQSxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sbUNBQUksUUFBUSxDQUFDO2dCQUM1QyxJQUFJLElBQUksS0FBSyxJQUFJO29CQUFFLE9BQU8sSUFBSSxHQUFHLElBQUksQ0FBQztnQkFFdEMsbURBQW1EO2dCQUNuRCxNQUFNLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFO29CQUM3QyxLQUFLLEVBQUUsTUFBTTtvQkFDYixXQUFXLEVBQUUsTUFBTTtvQkFDbkIsT0FBTyxFQUFFLElBQUk7aUJBQ2IsQ0FBQyxDQUFDO2dCQUNILE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQ2xDLE1BQUEsQ0FBQyxDQUFDLE9BQU8sbUNBQUksRUFBRSxFQUNmLE1BQUEsQ0FBQyxDQUFDLE9BQU8sbUNBQUksRUFBRSxDQUNmLENBQUM7Z0JBQ0YsSUFBSSxVQUFVLEtBQUssQ0FBQztvQkFBRSxPQUFPLFVBQVUsQ0FBQztnQkFDeEMsZ0VBQWdFO2dCQUNoRSxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDLENBQUM7Z0JBQzlELElBQUksRUFBRSxLQUFLLENBQUM7b0JBQUUsT0FBTyxFQUFFLENBQUM7Z0JBQ3hCLE9BQU8sQ0FBQyxNQUFBLENBQUMsQ0FBQyxJQUFJLG1DQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBQSxDQUFDLENBQUMsSUFBSSxtQ0FBSSxDQUFDLENBQUMsQ0FBQztZQUN0QyxDQUFDLENBQUMsQ0FBQztTQUNIO1FBRUQsZ0NBQWdDO1FBQ2hDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBRU8sV0FBVyxDQUFDLEtBQWE7UUFDaEMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsb0RBQW9EO1FBQ3pFLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUN4QixDQUFDO0lBRU8saUJBQWlCO1FBQ3hCLHVDQUF1QztRQUN2QyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ3hFLElBQUksQ0FBQyxjQUFjLEdBQUcsRUFBRSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDeEUsSUFBSSxDQUFDLGNBQWMsR0FBRyxFQUFFLENBQUM7UUFDekIsaURBQWlEO1FBQ2pELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUNuQyxzQkFBc0I7UUFDdEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN6QixDQUFDO0lBRU8sa0JBQWtCO1FBQ3pCLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBQ3BDLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN2RCxJQUFJLENBQUMsS0FBSztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBQ3pCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDeEQsSUFBSSxLQUFLLENBQUMsT0FBTyxLQUFLLE1BQU0sSUFBSSxLQUFLLENBQUMsVUFBVSxLQUFLLFFBQVE7WUFDNUQsT0FBTyxLQUFLLENBQUM7UUFDZCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLHFCQUFxQixFQUFFLENBQUM7UUFDdEQsT0FBTyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRU8sZUFBZTs7UUFDdEIsa0ZBQWtGO1FBQ2xGLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsRUFBRTtZQUMvQixPQUFPLENBQUMsSUFBSSxDQUNYLDRFQUE0RSxDQUM1RSxDQUFDO1lBQ0YsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQztZQUNoQyxJQUFJLENBQUMsSUFBSSxDQUFDLHNCQUFzQixFQUFFO2dCQUNqQyxJQUFJLENBQUMsc0JBQXNCLEdBQUcsSUFBSSxDQUFDO2dCQUNuQyxNQUFNLFFBQVEsR0FBRyxHQUFHLEVBQUU7b0JBQ3JCLElBQUksSUFBSSxDQUFDLGtCQUFrQixFQUFFLEVBQUU7d0JBQzlCLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxLQUFLLENBQUM7d0JBQ3BDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxDQUFDLENBQUM7d0JBQzlCLElBQUksSUFBSSxDQUFDLG1CQUFtQixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRTs0QkFDbEQsSUFBSSxDQUFDLG1CQUFtQixHQUFHLEtBQUssQ0FBQzs0QkFDakMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO3lCQUN2Qjt3QkFDRCxPQUFPO3FCQUNQO29CQUNELElBQUksSUFBSSxDQUFDLG9CQUFvQixHQUFHLEVBQUUsRUFBRTt3QkFDbkMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7d0JBQzVCLFVBQVUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7cUJBQzFCO3lCQUFNO3dCQUNOLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxLQUFLLENBQUM7d0JBQ3BDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxDQUFDLENBQUM7d0JBQzlCLE9BQU8sQ0FBQyxJQUFJLENBQ1gsMEZBQTBGLENBQzFGLENBQUM7cUJBQ0Y7Z0JBQ0YsQ0FBQyxDQUFDO2dCQUNGLFFBQVEsRUFBRSxDQUFDO2FBQ1g7WUFDRCxPQUFPO1NBQ1A7UUFFRCwwRUFBMEU7UUFDMUUsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFO1lBQ3JCLE9BQU8sQ0FBQyxHQUFHLENBQ1YseURBQXlELENBQ3pELENBQUM7WUFDRixJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDO1lBQ2hDLE9BQU87U0FDUDtRQUVELElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBRXhCLHFEQUFxRDtRQUNyRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUVsRCxJQUFJO1lBQ0gsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxzQ0FBc0M7WUFFaEUsaUNBQWlDO1lBQ2pDLElBQUksQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLENBQUM7WUFDM0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7WUFFcEIsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQ3BDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztnQkFDekMsT0FBTzthQUNQO1lBRUQsNEJBQTRCO1lBQzVCLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRTtnQkFDcEIsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBQWdCLENBQUM7Z0JBQ3hDLDRDQUE0QztnQkFDNUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FDMUIsQ0FBQztnQkFDRixJQUFJLENBQUMsU0FBUyxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyx1QkFBdUI7Z0JBQ3pFLCtFQUErRTtnQkFDL0UsTUFBTSxnQkFBZ0IsR0FDckIsTUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQzFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLElBQUksQ0FBQyxhQUFhLENBQ3hDLDBDQUFFLFlBQVksQ0FBQztnQkFDakIsSUFBSSxnQkFBZ0IsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO29CQUNwRCxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FDekIsSUFBSSxDQUFDLFNBQVMsRUFDZCxnQkFBZ0IsRUFDaEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQ3BCLENBQUM7aUJBQ0Y7cUJBQU07b0JBQ04sOEVBQThFO29CQUM5RSxzREFBc0Q7b0JBQ3RELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFOzt3QkFDNUIsTUFBTSxVQUFVLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQzt3QkFDL0IsTUFBTSxVQUFVLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQzt3QkFDL0IsSUFBSSxVQUFVLEtBQUssVUFBVTs0QkFDNUIsT0FBTyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBRTVCLGdDQUFnQzt3QkFDaEMsTUFBTSxLQUFLLEdBQUcsTUFBQSxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsbUNBQUksQ0FBQyxDQUFDO3dCQUN2QyxNQUFNLEtBQUssR0FBRyxNQUFBLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxtQ0FBSSxDQUFDLENBQUM7d0JBQ3ZDLElBQUksS0FBSyxLQUFLLEtBQUs7NEJBQUUsT0FBTyxLQUFLLEdBQUcsS0FBSyxDQUFDO3dCQUUxQyxnQ0FBZ0M7d0JBQ2hDLE1BQU0sSUFBSSxHQUFHLE1BQUEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLG1DQUFJLFFBQVEsQ0FBQzt3QkFDNUMsTUFBTSxJQUFJLEdBQUcsTUFBQSxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sbUNBQUksUUFBUSxDQUFDO3dCQUM1QyxJQUFJLElBQUksS0FBSyxJQUFJOzRCQUFFLE9BQU8sSUFBSSxHQUFHLElBQUksQ0FBQzt3QkFFdEMsbURBQW1EO3dCQUNuRCxNQUFNLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFOzRCQUM3QyxLQUFLLEVBQUUsTUFBTTs0QkFDYixXQUFXLEVBQUUsTUFBTTs0QkFDbkIsT0FBTyxFQUFFLElBQUk7eUJBQ2IsQ0FBQyxDQUFDO3dCQUNILE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQ2xDLE1BQUEsQ0FBQyxDQUFDLE9BQU8sbUNBQUksRUFBRSxFQUNmLE1BQUEsQ0FBQyxDQUFDLE9BQU8sbUNBQUksRUFBRSxDQUNmLENBQUM7d0JBQ0YsSUFBSSxVQUFVLEtBQUssQ0FBQzs0QkFBRSxPQUFPLFVBQVUsQ0FBQzt3QkFDeEMsZ0VBQWdFO3dCQUNoRSxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDLENBQUMsYUFBYSxDQUMxQyxDQUFDLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FDaEIsQ0FBQzt3QkFDRixJQUFJLEVBQUUsS0FBSyxDQUFDOzRCQUFFLE9BQU8sRUFBRSxDQUFDO3dCQUN4QixPQUFPLENBQUMsTUFBQSxDQUFDLENBQUMsSUFBSSxtQ0FBSSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQUEsQ0FBQyxDQUFDLElBQUksbUNBQUksQ0FBQyxDQUFDLENBQUM7b0JBQ3RDLENBQUMsQ0FBQyxDQUFDO2lCQUNIO2dCQUNELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLHVCQUF1QjthQUN4RDtpQkFBTTtnQkFDTixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyx1QkFBdUI7YUFDN0M7WUFFRCwrQkFBK0I7WUFDL0IsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7WUFDN0Isb0NBQW9DO1lBQ3BDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsQ0FBQztTQUN6QztnQkFBUztZQUNULHdDQUF3QztZQUN4QyxVQUFVLENBQUMsR0FBRyxFQUFFO2dCQUNmLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO2dCQUN6QiwyREFBMkQ7Z0JBQzNELElBQUksSUFBSSxDQUFDLG1CQUFtQixFQUFFO29CQUM3QixJQUFJLENBQUMsbUJBQW1CLEdBQUcsS0FBSyxDQUFDO29CQUNqQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7aUJBQ3ZCO1lBQ0YsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsNENBQTRDO1NBQ3BEO0lBQ0YsQ0FBQztJQUVELGdFQUFnRTtJQUN4RCxrQkFBa0I7UUFDekIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUNsQyxJQUFJLENBQUMsU0FBUztZQUNiLE9BQU87Z0JBQ04sU0FBUyxFQUFFLENBQUM7Z0JBQ1osUUFBUSxFQUFFLElBQXFCO2dCQUMvQixZQUFZLEVBQUUsQ0FBQzthQUNmLENBQUM7UUFDSCxNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDO1FBQ3RDLElBQUksUUFBUSxHQUFrQixJQUFJLENBQUM7UUFDbkMsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDO1FBQ3JCLE1BQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1FBQ3hELCtCQUErQjtRQUMvQixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUN2QixTQUFTLENBQUMsZ0JBQWdCLENBQWMsWUFBWSxDQUFDLENBQ3JELENBQUM7UUFDRixLQUFLLE1BQU0sRUFBRSxJQUFJLEtBQUssRUFBRTtZQUN2QixNQUFNLElBQUksR0FBRyxFQUFFLENBQUMscUJBQXFCLEVBQUUsQ0FBQztZQUN4QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUM7WUFDNUMsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLGFBQWEsQ0FBQyxHQUFHLEVBQUU7Z0JBQ3BDLFFBQVEsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFDO2dCQUMzQyxZQUFZLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQ25DLE1BQU07YUFDTjtTQUNEO1FBQ0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLENBQUM7SUFDOUMsQ0FBQztJQUVELHVDQUF1QztJQUMvQixrQkFBa0IsQ0FBQyxLQUkxQjtRQUNBLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7UUFDbEMsSUFBSSxDQUFDLFNBQVM7WUFBRSxPQUFPO1FBQ3ZCLHFDQUFxQztRQUNyQyxJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUU7WUFDbkIsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLGFBQWEsQ0FDdkMsa0JBQWtCLEtBQUssQ0FBQyxRQUFRLElBQUksQ0FDcEMsQ0FBQztZQUNGLElBQUksUUFBUSxFQUFFO2dCQUNiLE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxZQUFZLENBQUM7Z0JBQ3pDLE1BQU0sYUFBYSxHQUNsQixRQUFRLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxHQUFHO29CQUNwQyxTQUFTLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxHQUFHLENBQUM7Z0JBQ3ZDLE1BQU0sS0FBSyxHQUFHLGFBQWEsR0FBRyxhQUFhLENBQUM7Z0JBQzVDLFNBQVMsQ0FBQyxTQUFTLElBQUksS0FBSyxDQUFDO2dCQUM3QixPQUFPO2FBQ1A7U0FDRDtRQUNELGtDQUFrQztRQUNsQyxTQUFTLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUM7SUFDdkMsQ0FBQztJQUVPLGFBQWE7UUFDcEIsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLHNCQUFzQixFQUFFLENBQUM7UUFDbkQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQztRQUN0QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDO1FBQ2pDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLFdBQVcsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRXJFLDZEQUE2RDtRQUU3RCxLQUFLLElBQUksQ0FBQyxHQUFHLEtBQUssRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ2pDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkMsTUFBTSxhQUFhLEdBQUcsSUFBSSxxQkFBcUIsQ0FDOUMsSUFBSSxFQUNKLElBQUksQ0FBQyxhQUFhLEVBQUUscUJBQXFCO1lBQ3pDLElBQUksQ0FBQyxHQUFHLEVBQ1IsSUFBSSxDQUFDLE1BQU0sQ0FDWCxDQUFDO1lBRUYsd0JBQXdCO1lBQ3hCLGFBQWEsQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDMUQsYUFBYSxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUNyQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZTtvQkFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqRSxDQUFDLENBQUM7WUFDRixhQUFhLENBQUMsWUFBWSxHQUFHLENBQU8sWUFBWSxFQUFFLFdBQVcsRUFBRSxFQUFFO2dCQUNoRSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFO29CQUM3QixPQUFPLENBQUMsR0FBRyxDQUNWLCtCQUErQixFQUMvQixZQUFZLENBQUMsT0FBTyxFQUNwQixXQUFXLENBQUMsT0FBTyxDQUNuQixDQUFDO29CQUNGLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFDO2lCQUMxRDtZQUNGLENBQUMsQ0FBQSxDQUFDO1lBQ0YsYUFBYSxDQUFDLGlCQUFpQixHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUMxQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCO29CQUNoQyxJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN0QyxDQUFDLENBQUM7WUFFRixJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsbUJBQW1CO1lBQ2pELGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNyQixRQUFRLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM1QyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLG9DQUFvQztTQUM3RTtRQUVELElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3RDLElBQUksQ0FBQyxhQUFhLEdBQUcsR0FBRyxDQUFDLENBQUMsa0NBQWtDO1FBQzVELE9BQU8sR0FBRyxDQUFDLENBQUMsMkJBQTJCO0lBQ3hDLENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxPQUEwQjtRQUNuRCxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztRQUNuRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDO1FBQ3RDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztRQUNyQyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxXQUFXLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVqRSxzREFBc0Q7UUFDdEQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ3RDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDMUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQzNCO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxLQUFLLElBQUksQ0FBQyxHQUFHLEtBQUssRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ2pDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FDOUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLFFBQVEsQ0FBQyxFQUFFLENBQzlDLENBQUM7WUFFRixNQUFNLGFBQWEsR0FBRyxJQUFJLHFCQUFxQixDQUM5QyxRQUFRLEVBQ1IsSUFBSSxDQUFDLGFBQWEsRUFBRSxxQkFBcUI7WUFDekMsSUFBSSxDQUFDLEdBQUcsRUFDUixDQUFDLEVBQ0QsVUFBVSxFQUNWLE9BQU8sRUFDUCxJQUFJLENBQUMsTUFBTSxDQUNYLENBQUM7WUFFRix3QkFBd0I7WUFDeEIsYUFBYSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMxRCxhQUFhLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3JDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlO29CQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pFLENBQUMsQ0FBQztZQUNGLGFBQWEsQ0FBQyxZQUFZLEdBQUcsQ0FBTyxZQUFZLEVBQUUsV0FBVyxFQUFFLEVBQUU7Z0JBQ2hFLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUU7b0JBQzdCLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFDO2lCQUMxRDtZQUNGLENBQUMsQ0FBQSxDQUFDO1lBQ0YsYUFBYSxDQUFDLGlCQUFpQixHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUMxQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCO29CQUNoQyxJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN0QyxDQUFDLENBQUM7WUFFRixJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsbUJBQW1CO1lBQ2pELGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNyQixRQUFRLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM1QyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLG9DQUFvQztTQUM3RTtRQUVELElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3RDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxHQUFHLENBQUMsQ0FBQyxrQ0FBa0M7UUFDaEUsT0FBTyxHQUFHLENBQUMsQ0FBQywyQkFBMkI7SUFDeEMsQ0FBQztJQUVPLHFCQUFxQjtRQUM1QixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLCtCQUErQjtRQUV4RCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsVUFBVTtZQUNyQyxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTTtZQUNoRCxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQztRQUVsRCxlQUFlO1FBQ2YsZ0xBQWdMO1FBQ2hMLEtBQUs7UUFFTCxJQUFJLGNBQWMsRUFBRTtZQUNuQixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7U0FDckI7SUFDRixDQUFDO0lBRU8sYUFBYTtRQUNwQixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQztZQUM1QyxHQUFHLEVBQUUsa0JBQWtCO1lBQ3ZCLElBQUksRUFBRSxFQUFFLGNBQWMsRUFBRSxhQUFhLEVBQUUsRUFBRSx3Q0FBd0M7U0FDakYsQ0FBQyxDQUFDO1FBQ0gsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLG9EQUFvRDtRQUNwRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMscUJBQXFCO0lBQ2pFLENBQUM7SUFFTyxnQkFBZ0I7UUFDdkIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUNyRSxJQUFJLFNBQVMsRUFBRTtZQUNkLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxpQ0FBaUM7WUFDN0UsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO1NBQ25CO0lBQ0YsQ0FBQztJQUVPLGFBQWE7UUFDcEIsK0NBQStDO1FBQy9DLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsNEJBQTRCO1FBRXJELElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRTtZQUNwQixJQUFJLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRTtnQkFDbkQsZUFBZTtnQkFDZixrRUFBa0U7Z0JBQ2xFLEtBQUs7Z0JBQ0wsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBQWdCLENBQUM7Z0JBQ3hDLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FDbkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUMxQixDQUFDO2dCQUNGLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUNoQztpQkFBTTtnQkFDTiw4Q0FBOEM7YUFDOUM7U0FDRDthQUFNO1lBQ04sSUFBSSxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO2dCQUNuRCxlQUFlO2dCQUNmLDhEQUE4RDtnQkFDOUQsS0FBSztnQkFDTCxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7YUFDckI7aUJBQU07Z0JBQ04sOENBQThDO2FBQzlDO1NBQ0Q7UUFFRCw0RUFBNEU7UUFDNUUsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUVPLGFBQWEsQ0FBQyxPQUFlO1FBQ3BDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUMsdUJBQXVCO1FBQ2pELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLGtCQUFrQixFQUFFLENBQUMsQ0FBQztRQUN2RSxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzFCLENBQUM7SUFFTyxVQUFVLENBQUMsSUFBaUI7O1FBQ25DLElBQUksQ0FBQSxNQUFBLElBQUksQ0FBQyxZQUFZLDBDQUFFLEVBQUUsT0FBSyxJQUFJLGFBQUosSUFBSSx1QkFBSixJQUFJLENBQUUsRUFBRSxDQUFBLElBQUksSUFBSSxLQUFLLElBQUksRUFBRTtZQUN4RCwrRkFBK0Y7WUFDL0YsNEJBQTRCO1lBQzVCLG1FQUFtRTtZQUNuRSxrRUFBa0U7WUFDbEUsbUZBQW1GO1lBQ25GLHVEQUF1RDtZQUN2RCxzRUFBc0U7WUFDdEUsVUFBVTtTQUNWO1FBRUQsNENBQTRDO1FBQzVDLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRTtZQUN0QixvR0FBb0c7WUFDcEcsMENBQTBDO1NBQzFDO1FBRUQsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUM7UUFDekIsaUVBQWlFO1FBRWpFLHFDQUFxQztRQUNyQyxJQUFJLElBQUksRUFBRTtZQUNULHNGQUFzRjtZQUN0RixzQ0FBc0M7U0FDdEM7UUFFRCxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFO1lBQy9CLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ2pDO0lBQ0YsQ0FBQztJQUVNLFVBQVUsQ0FBQyxXQUFpQjtRQUNsQyxvQkFBb0I7UUFDcEIsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQzNDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLFdBQVcsQ0FBQyxFQUFFLENBQzlCLENBQUM7UUFDRixJQUFJLFlBQVksS0FBSyxDQUFDLENBQUM7WUFDdEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMscUJBQVEsV0FBVyxDQUFFLENBQUM7UUFDbEQsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUMzRCxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxXQUFXLENBQUMsRUFBRSxDQUM5QixDQUFDO1FBQ0YsSUFBSSxvQkFBb0IsS0FBSyxDQUFDLENBQUM7WUFDOUIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLHFCQUFRLFdBQVcsQ0FBRSxDQUFDO1FBQ2xFLElBQUksSUFBSSxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsS0FBSyxXQUFXLENBQUMsRUFBRTtZQUMvRCxJQUFJLENBQUMsWUFBWSxxQkFBUSxXQUFXLENBQUUsQ0FBQztRQUV4QyxtREFBbUQ7UUFDbkQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUM7UUFDMUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ3BCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQy9DLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLFdBQVcsQ0FBQyxFQUFFLENBQzlCLENBQUM7UUFDRixNQUFNLGdCQUFnQixHQUFHLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQztRQUU1QywyREFBMkQ7UUFDM0QsTUFBTSxjQUFjLEdBQUcsQ0FBQyxZQUFrQixFQUFFLEVBQUU7WUFDN0MsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLENBQ3RCLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQzlDLENBQUM7WUFDRixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FDL0MsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssWUFBWSxDQUFDLEVBQUUsQ0FDL0IsQ0FBQztZQUNGLG9EQUFvRDtZQUNwRCxJQUFJLFFBQVEsR0FBUSxJQUFJLENBQUM7WUFDekIsS0FBSyxJQUFJLENBQUMsR0FBRyxXQUFXLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDakUsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BDLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtvQkFDcEIsUUFBUSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUNsQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQzVCLENBQUM7b0JBQ0YsTUFBTTtpQkFDTjthQUNEO1lBQ0QsbUJBQW1CO1lBQ25CLE1BQU0sYUFBYSxHQUFHLElBQUkscUJBQXFCLENBQzlDLFlBQVksRUFDWixJQUFJLENBQUMsYUFBYSxFQUNsQixJQUFJLENBQUMsR0FBRyxFQUNSLElBQUksQ0FBQyxNQUFNLENBQ1gsQ0FBQztZQUNGLGdCQUFnQjtZQUNoQixhQUFhLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFELGFBQWEsQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRTs7Z0JBQ3JDLE1BQUEsTUFBQSxJQUFJLENBQUMsTUFBTSxFQUFDLGVBQWUsbURBQUcsQ0FBQyxDQUFDLENBQUM7WUFDbEMsQ0FBQyxDQUFDO1lBQ0YsYUFBYSxDQUFDLFlBQVksR0FBRyxDQUFPLElBQUksRUFBRSxHQUFHLEVBQUUsRUFBRTtnQkFDaEQsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVk7b0JBQzNCLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzVDLENBQUMsQ0FBQSxDQUFDO1lBQ0YsYUFBYSxDQUFDLGlCQUFpQixHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFOztnQkFDMUMsTUFBQSxNQUFBLElBQUksQ0FBQyxNQUFNLEVBQUMsaUJBQWlCLG1EQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN2QyxDQUFDLENBQUM7WUFDRixJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQzdCLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNyQixhQUFhO1lBQ2IsSUFBSSxRQUFRLEVBQUU7Z0JBQ2IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQzNCLGFBQWEsQ0FBQyxPQUFPLEVBQ3JCLFFBQVEsQ0FBQyxPQUFPLENBQ2hCLENBQUM7Z0JBQ0YsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ2xELElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7YUFDbEQ7aUJBQU07Z0JBQ04sSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNuRCxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQzthQUN4QztRQUNGLENBQUMsQ0FBQztRQUVGLDJCQUEyQjtRQUMzQixNQUFNLGNBQWMsR0FBRyxDQUFDLE1BQWMsRUFBRSxFQUFFO1lBQ3pDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUN4QyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsS0FBSyxNQUFNLENBQ2hDLENBQUM7WUFDRixJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUU7Z0JBQ2IsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDdEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDdkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDdEIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ25DO1FBQ0YsQ0FBQyxDQUFDO1FBRUYsdURBQXVEO1FBQ3ZELE1BQU0sY0FBYyxHQUFHLENBQUMsQ0FBTyxFQUFFLENBQU8sRUFBRSxFQUFFOztZQUMzQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDLENBQUM7WUFDOUQsSUFBSSxFQUFFLEtBQUssQ0FBQztnQkFBRSxPQUFPLEVBQUUsQ0FBQztZQUN4QixPQUFPLENBQUMsTUFBQSxDQUFDLENBQUMsSUFBSSxtQ0FBSSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQUEsQ0FBQyxDQUFDLElBQUksbUNBQUksQ0FBQyxDQUFDLENBQUM7UUFDdEMsQ0FBQyxDQUFDO1FBRUYsSUFBSSxnQkFBZ0IsRUFBRTtZQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRTtnQkFDckIsc0RBQXNEO2dCQUN0RCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FDcEMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEtBQUssV0FBVyxDQUFDLEVBQUUsQ0FDeEMsQ0FBQztnQkFDRixJQUFJLElBQUksRUFBRTtvQkFDVCxJQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFpQixDQUFDLENBQUM7aUJBQ25DO3FCQUFNO29CQUNOLGNBQWMsQ0FBQyxnQkFBaUIsQ0FBQyxDQUFDO2lCQUNsQzthQUNEO2lCQUFNO2dCQUNOLDhEQUE4RDtnQkFDOUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQ3BDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxLQUFLLFdBQVcsQ0FBQyxFQUFFLENBQ3hDLENBQUM7Z0JBQ0YsSUFBSSxJQUFJLEVBQUU7b0JBQ1QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBaUIsQ0FBQyxDQUFDO2lCQUNuQztxQkFBTTtvQkFDTiw4Q0FBOEM7b0JBQzlDLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQztvQkFDcEIsS0FBSyxNQUFNLFFBQVEsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFO3dCQUMzQyxJQUFJLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxnQkFBaUIsQ0FBQyxFQUFFOzRCQUN0RCxPQUFPLEdBQUcsSUFBSSxDQUFDOzRCQUNmLE1BQU07eUJBQ047cUJBQ0Q7b0JBQ0QsSUFBSSxDQUFDLE9BQU8sRUFBRTt3QkFDYiwwQkFBMEI7d0JBQzFCLE1BQU0sUUFBUSxHQUFHLGdCQUFpQixDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7d0JBQ25ELElBQUksUUFBUSxFQUFFOzRCQUNiLCtEQUErRDs0QkFDL0QsS0FBSyxNQUFNLFFBQVEsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFO2dDQUMzQyxNQUFNLFVBQVUsR0FDZixRQUFRLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUFDLENBQUM7Z0NBQzFDLElBQUksVUFBVSxFQUFFO29DQUNmLE1BQU0sV0FBVyxHQUNoQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUMzQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQ0wsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssUUFBUSxDQUMvQixDQUFDO29DQUNILFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztvQ0FDekMsT0FBTyxHQUFHLElBQUksQ0FBQztvQ0FDZixNQUFNO2lDQUNOOzZCQUNEO3lCQUNEOzZCQUFNOzRCQUNOLGlCQUFpQjs0QkFDakIsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBQWdCLENBQUM7NEJBQ3hDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNuQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQ3BCLENBQUM7NEJBQ0YsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FDOUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNMLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLGdCQUFpQixDQUFDLEVBQUUsQ0FDM0MsQ0FBQzs0QkFDRixNQUFNLE9BQU8sR0FBRyxJQUFJLHFCQUFxQixDQUN4QyxnQkFBaUIsRUFDakIsSUFBSSxDQUFDLGFBQWEsRUFDbEIsSUFBSSxDQUFDLEdBQUcsRUFDUixDQUFDLEVBQ0QsVUFBVSxFQUNWLE9BQU8sRUFDUCxJQUFJLENBQUMsTUFBTSxDQUNYLENBQUM7NEJBQ0YsT0FBTyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzs0QkFDcEQsT0FBTyxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFOztnQ0FDL0IsTUFBQSxNQUFBLElBQUksQ0FBQyxNQUFNLEVBQUMsZUFBZSxtREFBRyxDQUFDLENBQUMsQ0FBQzs0QkFDbEMsQ0FBQyxDQUFDOzRCQUNGLE9BQU8sQ0FBQyxZQUFZLEdBQUcsQ0FBTyxJQUFJLEVBQUUsR0FBRyxFQUFFLEVBQUU7Z0NBQzFDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZO29DQUMzQixNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQzs0QkFDNUMsQ0FBQyxDQUFBLENBQUM7NEJBQ0YsT0FBTyxDQUFDLGlCQUFpQixHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFOztnQ0FDcEMsTUFBQSxNQUFBLElBQUksQ0FBQyxNQUFNLEVBQUMsaUJBQWlCLG1EQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzs0QkFDdkMsQ0FBQyxDQUFDOzRCQUNGLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7NEJBQ3ZCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQzs0QkFDZiw4Q0FBOEM7NEJBQzlDLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDOzRCQUMxQyxLQUNDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFDVCxDQUFDLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQzlCLENBQUMsRUFBRSxFQUNGO2dDQUNELElBQ0MsY0FBYyxDQUNiLGdCQUFpQixFQUNqQixJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUNoQyxHQUFHLENBQUMsRUFDSjtvQ0FDRCxRQUFRLEdBQUcsQ0FBQyxDQUFDO29DQUNiLE1BQU07aUNBQ047NkJBQ0Q7NEJBQ0QsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUU7Z0NBQzFDLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUMzQixPQUFPLENBQUMsT0FBTyxFQUNmLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUNyQyxDQUFDO2dDQUNGLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUN6QixRQUFRLEVBQ1IsQ0FBQyxFQUNELE9BQU8sQ0FDUCxDQUFDOzZCQUNGO2lDQUFNO2dDQUNOLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztnQ0FDN0MsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7NkJBQ2xDO3lCQUNEO3FCQUNEO2lCQUNEO2FBQ0Q7U0FDRDthQUFNO1lBQ04sMEJBQTBCO1lBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUNyQixjQUFjLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUMvQixnREFBZ0Q7Z0JBQ2hELElBQUksSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtvQkFDbkQsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2lCQUNyQjthQUNEO2lCQUFNO2dCQUNOLG9CQUFvQjtnQkFDcEIsc0NBQXNDO2dCQUN0QyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FDeEMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEtBQUssV0FBVyxDQUFDLEVBQUUsQ0FDeEMsQ0FBQztnQkFDRixJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUU7b0JBQ2IsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDdEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDdkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDdEIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO2lCQUNuQztxQkFBTTtvQkFDTiw2Q0FBNkM7b0JBQzdDLEtBQUssTUFBTSxRQUFRLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRTt3QkFDM0MsSUFBSSxRQUFRLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQzs0QkFBRSxNQUFNO3FCQUN4RDtpQkFDRDthQUNEO1NBQ0Q7UUFFRCxpREFBaUQ7UUFDakQsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sS0FBSyxPQUFPLEVBQUU7WUFDMUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ25FO0lBQ0YsQ0FBQztJQUVNLGVBQWU7UUFDckIsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQzFCLENBQUM7SUFFRCxRQUFRO1FBQ1AsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQyx5QkFBeUI7UUFDbkQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLGVBQWU7UUFDekMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUMzQixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHAsIENvbXBvbmVudCwgc2V0SWNvbiB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBUYXNrIH0gZnJvbSBcIkAvdHlwZXMvdGFza1wiO1xyXG5pbXBvcnQgeyBUYXNrTGlzdEl0ZW1Db21wb25lbnQgfSBmcm9tIFwiLi9saXN0SXRlbVwiOyAvLyBSZS1pbXBvcnQgbmVlZGVkIGNvbXBvbmVudHNcclxuaW1wb3J0IHsgVmlld01vZGUsIGdldFZpZXdTZXR0aW5nT3JEZWZhdWx0IH0gZnJvbSBcIkAvY29tbW9uL3NldHRpbmctZGVmaW5pdGlvblwiOyAvLyDlr7zlhaUgU29ydENyaXRlcmlvblxyXG5pbXBvcnQgeyB0YXNrc1RvVHJlZSB9IGZyb20gXCJAL3V0aWxzL3VpL3RyZWUtdmlldy11dGlsc1wiOyAvLyBSZS1pbXBvcnQgbmVlZGVkIHV0aWxzXHJcbmltcG9ydCB7IFRhc2tUcmVlSXRlbUNvbXBvbmVudCB9IGZyb20gXCIuL3RyZWVJdGVtXCI7IC8vIFJlLWltcG9ydCBuZWVkZWQgY29tcG9uZW50c1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7IGdldEluaXRpYWxWaWV3TW9kZSwgc2F2ZVZpZXdNb2RlIH0gZnJvbSBcIkAvdXRpbHMvdWkvdmlldy1tb2RlLXV0aWxzXCI7XHJcblxyXG4vLyBAdHMtaWdub3JlXHJcbmltcG9ydCB7IGZpbHRlclRhc2tzIH0gZnJvbSBcIkAvdXRpbHMvdGFzay90YXNrLWZpbHRlci11dGlsc1wiO1xyXG5pbXBvcnQgeyBzb3J0VGFza3MgfSBmcm9tIFwiQC9jb21tYW5kcy9zb3J0VGFza0NvbW1hbmRzXCI7IC8vIOWvvOWFpSBzb3J0VGFza3Mg5Ye95pWwXHJcblxyXG5pbnRlcmZhY2UgQ29udGVudENvbXBvbmVudFBhcmFtcyB7XHJcblx0b25UYXNrU2VsZWN0ZWQ/OiAodGFzazogVGFzayB8IG51bGwpID0+IHZvaWQ7XHJcblx0b25UYXNrQ29tcGxldGVkPzogKHRhc2s6IFRhc2spID0+IHZvaWQ7XHJcblx0b25UYXNrVXBkYXRlPzogKG9yaWdpbmFsVGFzazogVGFzaywgdXBkYXRlZFRhc2s6IFRhc2spID0+IFByb21pc2U8dm9pZD47XHJcblx0b25UYXNrQ29udGV4dE1lbnU/OiAoZXZlbnQ6IE1vdXNlRXZlbnQsIHRhc2s6IFRhc2spID0+IHZvaWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBDb250ZW50Q29tcG9uZW50IGV4dGVuZHMgQ29tcG9uZW50IHtcclxuXHRwdWJsaWMgY29udGFpbmVyRWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgaGVhZGVyRWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgdGFza0xpc3RFbDogSFRNTEVsZW1lbnQ7IC8vIENvbnRhaW5lciBmb3IgcmVuZGVyaW5nXHJcblx0cHJpdmF0ZSBmaWx0ZXJJbnB1dDogSFRNTElucHV0RWxlbWVudDtcclxuXHRwcml2YXRlIHRpdGxlRWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgY291bnRFbDogSFRNTEVsZW1lbnQ7XHJcblxyXG5cdC8vIFRhc2sgZGF0YVxyXG5cdHByaXZhdGUgYWxsVGFza3M6IFRhc2tbXSA9IFtdO1xyXG5cdHByaXZhdGUgbm90RmlsdGVyZWRUYXNrczogVGFza1tdID0gW107XHJcblx0cHJpdmF0ZSBmaWx0ZXJlZFRhc2tzOiBUYXNrW10gPSBbXTsgLy8gVGFza3MgYWZ0ZXIgZmlsdGVycyBhcHBsaWVkXHJcblx0cHJpdmF0ZSBzZWxlY3RlZFRhc2s6IFRhc2sgfCBudWxsID0gbnVsbDtcclxuXHJcblx0Ly8gQ2hpbGQgQ29tcG9uZW50cyAobWFuYWdlZCBieSBJbmJveENvbXBvbmVudCBmb3IgbGF6eSBsb2FkaW5nKVxyXG5cdHByaXZhdGUgdGFza0NvbXBvbmVudHM6IFRhc2tMaXN0SXRlbUNvbXBvbmVudFtdID0gW107XHJcblx0cHJpdmF0ZSB0cmVlQ29tcG9uZW50czogVGFza1RyZWVJdGVtQ29tcG9uZW50W10gPSBbXTtcclxuXHJcblx0Ly8gVmlydHVhbGl6YXRpb24gU3RhdGVcclxuXHRwcml2YXRlIHRhc2tMaXN0T2JzZXJ2ZXI6IEludGVyc2VjdGlvbk9ic2VydmVyO1xyXG5cdHByaXZhdGUgdGFza1BhZ2VTaXplID0gNTA7IC8vIE51bWJlciBvZiB0YXNrcyB0byBsb2FkIHBlciBiYXRjaFxyXG5cdHByaXZhdGUgbmV4dFRhc2tJbmRleCA9IDA7IC8vIEluZGV4IGZvciBuZXh0IGxpc3QgaXRlbSBiYXRjaFxyXG5cdHByaXZhdGUgbmV4dFJvb3RUYXNrSW5kZXggPSAwOyAvLyBJbmRleCBmb3IgbmV4dCB0cmVlIHJvb3QgYmF0Y2hcclxuXHRwcml2YXRlIHJvb3RUYXNrczogVGFza1tdID0gW107IC8vIFJvb3QgdGFza3MgZm9yIHRyZWUgdmlld1xyXG5cclxuXHQvLyBTdGF0ZVxyXG5cdHByaXZhdGUgY3VycmVudFZpZXdJZDogVmlld01vZGUgPSBcImluYm94XCI7IC8vIFJlbmFtZWQgZnJvbSBjdXJyZW50Vmlld01vZGVcclxuXHRwcml2YXRlIHNlbGVjdGVkUHJvamVjdEZvclZpZXc6IHN0cmluZyB8IG51bGwgPSBudWxsOyAvLyBLZWVwIHRyYWNrIGlmIGEgc3BlY2lmaWMgcHJvamVjdCBpcyBmaWx0ZXJlZCAoZm9yIHByb2plY3QgdmlldylcclxuXHRwcml2YXRlIGZvY3VzRmlsdGVyOiBzdHJpbmcgfCBudWxsID0gbnVsbDsgLy8gS2VlcCBmb2N1cyBmaWx0ZXIgaWYgbmVlZGVkXHJcblx0cHJpdmF0ZSBpc1RyZWVWaWV3OiBib29sZWFuID0gZmFsc2U7XHJcblx0cHJpdmF0ZSBpc1JlbmRlcmluZzogYm9vbGVhbiA9IGZhbHNlOyAvLyBHdWFyZCBhZ2FpbnN0IGNvbmN1cnJlbnQgcmVuZGVyc1xyXG5cdHByaXZhdGUgcGVuZGluZ0ZvcmNlUmVmcmVzaDogYm9vbGVhbiA9IGZhbHNlOyAvLyBUcmFjayBpZiBhIGZvcmNlIHJlZnJlc2ggaXMgcGVuZGluZ1xyXG5cdHByaXZhdGUgcGVuZGluZ1Zpc2liaWxpdHlSZXRyeTogYm9vbGVhbiA9IGZhbHNlOyAvLyBRdWV1ZSBhIHJldHJ5IHdoZW4gY29udGFpbmVyIGJlY29tZXMgdmlzaWJsZVxyXG5cdHByaXZhdGUgdmlzaWJpbGl0eVJldHJ5Q291bnQ6IG51bWJlciA9IDA7IC8vIExpbWl0IHZpc2liaWxpdHkgcmV0cnkgbG9vcFxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cHJpdmF0ZSBwYXJlbnRFbDogSFRNTEVsZW1lbnQsXHJcblx0XHRwcml2YXRlIGFwcDogQXBwLFxyXG5cdFx0cHJpdmF0ZSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdHByaXZhdGUgcGFyYW1zOiBDb250ZW50Q29tcG9uZW50UGFyYW1zID0ge30sXHJcblx0KSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdH1cclxuXHJcblx0b25sb2FkKCkge1xyXG5cdFx0Ly8gQ3JlYXRlIG1haW4gY29udGVudCBjb250YWluZXJcclxuXHRcdHRoaXMuY29udGFpbmVyRWwgPSB0aGlzLnBhcmVudEVsLmNyZWF0ZURpdih7IGNsczogXCJ0YXNrLWNvbnRlbnRcIiB9KTtcclxuXHJcblx0XHQvLyBDcmVhdGUgaGVhZGVyXHJcblx0XHR0aGlzLmNyZWF0ZUNvbnRlbnRIZWFkZXIoKTtcclxuXHJcblx0XHQvLyBDcmVhdGUgdGFzayBsaXN0IGNvbnRhaW5lclxyXG5cdFx0dGhpcy50YXNrTGlzdEVsID0gdGhpcy5jb250YWluZXJFbC5jcmVhdGVEaXYoeyBjbHM6IFwidGFzay1saXN0XCIgfSk7XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSB2aWV3IG1vZGUgZnJvbSBzYXZlZCBzdGF0ZSBvciBnbG9iYWwgZGVmYXVsdFxyXG5cdFx0dGhpcy5pbml0aWFsaXplVmlld01vZGUoKTtcclxuXHJcblx0XHQvLyBTZXQgdXAgaW50ZXJzZWN0aW9uIG9ic2VydmVyIGZvciBsYXp5IGxvYWRpbmdcclxuXHRcdHRoaXMuaW5pdGlhbGl6ZVZpcnR1YWxMaXN0KCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNyZWF0ZUNvbnRlbnRIZWFkZXIoKSB7XHJcblx0XHR0aGlzLmhlYWRlckVsID0gdGhpcy5jb250YWluZXJFbC5jcmVhdGVEaXYoeyBjbHM6IFwiY29udGVudC1oZWFkZXJcIiB9KTtcclxuXHJcblx0XHQvLyBWaWV3IHRpdGxlIC0gd2lsbCBiZSB1cGRhdGVkIGluIHNldFZpZXdNb2RlXHJcblx0XHR0aGlzLnRpdGxlRWwgPSB0aGlzLmhlYWRlckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJjb250ZW50LXRpdGxlXCIsXHJcblx0XHRcdHRleHQ6IHQoXCJJbmJveFwiKSwgLy8gRGVmYXVsdCB0aXRsZVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gVGFzayBjb3VudFxyXG5cdFx0dGhpcy5jb3VudEVsID0gdGhpcy5oZWFkZXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwidGFzay1jb3VudFwiLFxyXG5cdFx0XHR0ZXh0OiB0KFwiMCB0YXNrc1wiKSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEZpbHRlciBjb250cm9sc1xyXG5cdFx0Y29uc3QgZmlsdGVyRWwgPSB0aGlzLmhlYWRlckVsLmNyZWF0ZURpdih7IGNsczogXCJjb250ZW50LWZpbHRlclwiIH0pO1xyXG5cdFx0dGhpcy5maWx0ZXJJbnB1dCA9IGZpbHRlckVsLmNyZWF0ZUVsKFwiaW5wdXRcIiwge1xyXG5cdFx0XHRjbHM6IFwiZmlsdGVyLWlucHV0XCIsXHJcblx0XHRcdGF0dHI6IHsgdHlwZTogXCJ0ZXh0XCIsIHBsYWNlaG9sZGVyOiB0KFwiRmlsdGVyIHRhc2tzLi4uXCIpIH0sXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBWaWV3IHRvZ2dsZSBidXR0b25cclxuXHRcdGNvbnN0IHZpZXdUb2dnbGVCdG4gPSB0aGlzLmhlYWRlckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ2aWV3LXRvZ2dsZS1idG5cIixcclxuXHRcdH0pO1xyXG5cdFx0c2V0SWNvbih2aWV3VG9nZ2xlQnRuLCBcImxpc3RcIik7IC8vIFNldCBpbml0aWFsIGljb25cclxuXHRcdHZpZXdUb2dnbGVCdG4uc2V0QXR0cmlidXRlKFwiYXJpYS1sYWJlbFwiLCB0KFwiVG9nZ2xlIGxpc3QvdHJlZSB2aWV3XCIpKTtcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudCh2aWV3VG9nZ2xlQnRuLCBcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0dGhpcy50b2dnbGVWaWV3TW9kZSgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gRm9jdXMgZmlsdGVyIGJ1dHRvbiAocmVtYWlucyBjb21tZW50ZWQgb3V0KVxyXG5cdFx0Ly8gLi4uXHJcblxyXG5cdFx0Ly8gRXZlbnQgbGlzdGVuZXJzXHJcblx0XHRsZXQgZmlsdGVyVGltZW91dDogTm9kZUpTLlRpbWVvdXQ7XHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQodGhpcy5maWx0ZXJJbnB1dCwgXCJpbnB1dFwiLCAoKSA9PiB7XHJcblx0XHRcdGNsZWFyVGltZW91dChmaWx0ZXJUaW1lb3V0KTtcclxuXHRcdFx0ZmlsdGVyVGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMuZmlsdGVyVGFza3ModGhpcy5maWx0ZXJJbnB1dC52YWx1ZSk7XHJcblx0XHRcdH0sIDMwMCk7IC8vIOWinuWKoCAzMDBtcyDpmLLmipblu7bov59cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBpbml0aWFsaXplVmlydHVhbExpc3QoKSB7XHJcblx0XHR0aGlzLnRhc2tMaXN0T2JzZXJ2ZXIgPSBuZXcgSW50ZXJzZWN0aW9uT2JzZXJ2ZXIoXHJcblx0XHRcdChlbnRyaWVzKSA9PiB7XHJcblx0XHRcdFx0ZW50cmllcy5mb3JFYWNoKChlbnRyeSkgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRlbnRyeS5pc0ludGVyc2VjdGluZyAmJlxyXG5cdFx0XHRcdFx0XHRlbnRyeS50YXJnZXQuY2xhc3NMaXN0LmNvbnRhaW5zKFwidGFzay1sb2FkLW1hcmtlclwiKVxyXG5cdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdC8vIGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHQvLyBcdFwiTG9hZCBtYXJrZXIgaW50ZXJzZWN0aW5nLCBjYWxsaW5nIGxvYWRNb3JlVGFza3MuLi5cIlxyXG5cdFx0XHRcdFx0XHQvLyApO1xyXG5cdFx0XHRcdFx0XHQvLyBUYXJnZXQgaXMgdGhlIGxvYWQgbWFya2VyLCBsb2FkIG1vcmUgdGFza3NcclxuXHRcdFx0XHRcdFx0dGhpcy5sb2FkTW9yZVRhc2tzKCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRyb290OiB0aGlzLnRhc2tMaXN0RWwsIC8vIE9ic2VydmUgd2l0aGluIHRoZSB0YXNrIGxpc3QgY29udGFpbmVyXHJcblx0XHRcdFx0dGhyZXNob2xkOiAwLjEsIC8vIFRyaWdnZXIgd2hlbiAxMCUgb2YgdGhlIG1hcmtlciBpcyB2aXNpYmxlXHJcblx0XHRcdH0sXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSW5pdGlhbGl6ZSB2aWV3IG1vZGUgZnJvbSBzYXZlZCBzdGF0ZSBvciBnbG9iYWwgZGVmYXVsdFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgaW5pdGlhbGl6ZVZpZXdNb2RlKCkge1xyXG5cdFx0dGhpcy5pc1RyZWVWaWV3ID0gZ2V0SW5pdGlhbFZpZXdNb2RlKFxyXG5cdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdHRoaXMuY3VycmVudFZpZXdJZCxcclxuXHRcdCk7XHJcblx0XHQvLyBVcGRhdGUgdGhlIHRvZ2dsZSBidXR0b24gaWNvbiB0byBtYXRjaCB0aGUgaW5pdGlhbCBzdGF0ZVxyXG5cdFx0Y29uc3Qgdmlld1RvZ2dsZUJ0biA9IHRoaXMuaGVhZGVyRWw/LnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFwiLnZpZXctdG9nZ2xlLWJ0blwiLFxyXG5cdFx0KSBhcyBIVE1MRWxlbWVudDtcclxuXHRcdGlmICh2aWV3VG9nZ2xlQnRuKSB7XHJcblx0XHRcdHNldEljb24odmlld1RvZ2dsZUJ0biwgdGhpcy5pc1RyZWVWaWV3ID8gXCJnaXQtYnJhbmNoXCIgOiBcImxpc3RcIik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHRvZ2dsZVZpZXdNb2RlKCkge1xyXG5cdFx0dGhpcy5pc1RyZWVWaWV3ID0gIXRoaXMuaXNUcmVlVmlldztcclxuXHRcdGNvbnN0IHZpZXdUb2dnbGVCdG4gPSB0aGlzLmhlYWRlckVsLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFwiLnZpZXctdG9nZ2xlLWJ0blwiLFxyXG5cdFx0KSBhcyBIVE1MRWxlbWVudDtcclxuXHRcdGlmICh2aWV3VG9nZ2xlQnRuKSB7XHJcblx0XHRcdHNldEljb24odmlld1RvZ2dsZUJ0biwgdGhpcy5pc1RyZWVWaWV3ID8gXCJnaXQtYnJhbmNoXCIgOiBcImxpc3RcIik7XHJcblx0XHR9XHJcblx0XHQvLyBTYXZlIHRoZSBuZXcgdmlldyBtb2RlIHN0YXRlXHJcblx0XHRzYXZlVmlld01vZGUodGhpcy5hcHAsIHRoaXMuY3VycmVudFZpZXdJZCwgdGhpcy5pc1RyZWVWaWV3KTtcclxuXHRcdHRoaXMucmVmcmVzaFRhc2tMaXN0KCk7IC8vIFJlZnJlc2ggbGlzdCBjb21wbGV0ZWx5IG9uIHZpZXcgbW9kZSBjaGFuZ2VcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzZXRJc1RyZWVWaWV3KGlzVHJlZTogYm9vbGVhbikge1xyXG5cdFx0aWYgKHRoaXMuaXNUcmVlVmlldyAhPT0gaXNUcmVlKSB7XHJcblx0XHRcdHRoaXMuaXNUcmVlVmlldyA9IGlzVHJlZTtcclxuXHRcdFx0Y29uc3Qgdmlld1RvZ2dsZUJ0biA9IHRoaXMuaGVhZGVyRWw/LnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFx0XCIudmlldy10b2dnbGUtYnRuXCIsXHJcblx0XHRcdCkgYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRcdGlmICh2aWV3VG9nZ2xlQnRuKSB7XHJcblx0XHRcdFx0c2V0SWNvbih2aWV3VG9nZ2xlQnRuLCB0aGlzLmlzVHJlZVZpZXcgPyBcImdpdC1icmFuY2hcIiA6IFwibGlzdFwiKTtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGlzLnJlZnJlc2hUYXNrTGlzdCgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHVibGljIHNldFRhc2tzKFxyXG5cdFx0dGFza3M6IFRhc2tbXSxcclxuXHRcdG5vdEZpbHRlcmVkVGFza3M6IFRhc2tbXSxcclxuXHRcdGZvcmNlUmVmcmVzaDogYm9vbGVhbiA9IGZhbHNlLFxyXG5cdCkge1xyXG5cdFx0Ly8gQWxsb3cgZm9yY2VkIHJlZnJlc2ggZm9yIGNhc2VzIHdoZXJlIHdlIGtub3cgdGhlIGRhdGEgaGFzIGNoYW5nZWRcclxuXHRcdGlmIChmb3JjZVJlZnJlc2gpIHtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJDb250ZW50Q29tcG9uZW50OiBGb3JjZWQgcmVmcmVzaCByZXF1ZXN0ZWRcIik7XHJcblx0XHRcdC8vIENhbmNlbCBhbnkgb25nb2luZyByZW5kZXJpbmcgaWYgZm9yY2UgcmVmcmVzaCBpcyByZXF1ZXN0ZWRcclxuXHRcdFx0dGhpcy5pc1JlbmRlcmluZyA9IGZhbHNlO1xyXG5cdFx0XHR0aGlzLnBlbmRpbmdGb3JjZVJlZnJlc2ggPSB0cnVlO1xyXG5cdFx0XHR0aGlzLmFsbFRhc2tzID0gdGFza3M7XHJcblx0XHRcdHRoaXMubm90RmlsdGVyZWRUYXNrcyA9IG5vdEZpbHRlcmVkVGFza3M7XHJcblx0XHRcdHRoaXMuYXBwbHlGaWx0ZXJzKCk7XHJcblx0XHRcdHRoaXMucmVmcmVzaFRhc2tMaXN0KCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBJZiBhIGZvcmNlIHJlZnJlc2ggaXMgcGVuZGluZywgc2tpcCBub24tZm9yY2VkIHVwZGF0ZXNcclxuXHRcdGlmICh0aGlzLnBlbmRpbmdGb3JjZVJlZnJlc2gpIHtcclxuXHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XCJDb250ZW50Q29tcG9uZW50OiBTa2lwcGluZyBub24tZm9yY2VkIHVwZGF0ZSwgZm9yY2UgcmVmcmVzaCBpcyBwZW5kaW5nXCIsXHJcblx0XHRcdCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBQcmV2ZW50IHVubmVjZXNzYXJ5IHJlZnJlc2hlcyBpZiBkYXRhIGhhc24ndCBhY3R1YWxseSBjaGFuZ2VkXHJcblx0XHQvLyBDaGVjayBpZiB0aGUgYXJyYXkgcmVmZXJlbmNlIGhhcyBjaGFuZ2VkICh3aGljaCBpbmRpY2F0ZXMgYW4gdXBkYXRlKVxyXG5cdFx0aWYgKFxyXG5cdFx0XHR0aGlzLmFsbFRhc2tzID09PSB0YXNrcyAmJlxyXG5cdFx0XHR0aGlzLm5vdEZpbHRlcmVkVGFza3MgPT09IG5vdEZpbHRlcmVkVGFza3NcclxuXHRcdCkge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcIkNvbnRlbnRDb21wb25lbnQ6IFNhbWUgYXJyYXkgcmVmZXJlbmNlcywgc2tpcHBpbmcgcmVmcmVzaFwiLFxyXG5cdFx0XHQpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWRkaXRpb25hbCBjaGVjayBmb3IgYWN0dWFsIGNvbnRlbnQgY2hhbmdlc1xyXG5cdFx0aWYgKFxyXG5cdFx0XHR0aGlzLmFsbFRhc2tzLmxlbmd0aCA9PT0gdGFza3MubGVuZ3RoICYmXHJcblx0XHRcdHRoaXMubm90RmlsdGVyZWRUYXNrcy5sZW5ndGggPT09IG5vdEZpbHRlcmVkVGFza3MubGVuZ3RoICYmXHJcblx0XHRcdHRhc2tzLmxlbmd0aCA+IDBcclxuXHRcdCkge1xyXG5cdFx0XHQvLyBRdWljayBjaGVjayAtIGlmIHNhbWUgbGVuZ3RoIGFuZCBub3QgZW1wdHksIGNoZWNrIGlmIGZpcnN0IGZldyB0YXNrcyBhcmUgaWRlbnRpY2FsXHJcblx0XHRcdGNvbnN0IHNhbXBsZVNpemUgPSBNYXRoLm1pbig1LCB0YXNrcy5sZW5ndGgpO1xyXG5cdFx0XHRsZXQgdW5jaGFuZ2VkID0gdHJ1ZTtcclxuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBzYW1wbGVTaXplOyBpKyspIHtcclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHR0aGlzLmFsbFRhc2tzW2ldPy5pZCAhPT0gdGFza3NbaV0/LmlkIHx8XHJcblx0XHRcdFx0XHR0aGlzLmFsbFRhc2tzW2ldPy5vcmlnaW5hbE1hcmtkb3duICE9PVxyXG5cdFx0XHRcdFx0XHR0YXNrc1tpXT8ub3JpZ2luYWxNYXJrZG93blxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0dW5jaGFuZ2VkID0gZmFsc2U7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKHVuY2hhbmdlZCkge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XCJDb250ZW50Q29tcG9uZW50OiBUYXNrcyB1bmNoYW5nZWQsIHNraXBwaW5nIHJlZnJlc2hcIixcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuYWxsVGFza3MgPSB0YXNrcztcclxuXHRcdHRoaXMubm90RmlsdGVyZWRUYXNrcyA9IG5vdEZpbHRlcmVkVGFza3M7XHJcblx0XHR0aGlzLmFwcGx5RmlsdGVycygpO1xyXG5cdFx0dGhpcy5yZWZyZXNoVGFza0xpc3QoKTtcclxuXHR9XHJcblxyXG5cdC8vIFVwZGF0ZWQgbWV0aG9kIHNpZ25hdHVyZVxyXG5cdHB1YmxpYyBzZXRWaWV3TW9kZSh2aWV3SWQ6IFZpZXdNb2RlLCBwcm9qZWN0Pzogc3RyaW5nIHwgbnVsbCkge1xyXG5cdFx0dGhpcy5jdXJyZW50Vmlld0lkID0gdmlld0lkO1xyXG5cdFx0dGhpcy5zZWxlY3RlZFByb2plY3RGb3JWaWV3ID0gcHJvamVjdCA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IHByb2plY3Q7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHRpdGxlIGJhc2VkIG9uIHRoZSB2aWV3IGNvbmZpZ1xyXG5cdFx0Y29uc3Qgdmlld0NvbmZpZyA9IGdldFZpZXdTZXR0aW5nT3JEZWZhdWx0KHRoaXMucGx1Z2luLCB2aWV3SWQpO1xyXG5cdFx0bGV0IHRpdGxlID0gdCh2aWV3Q29uZmlnLm5hbWUpO1xyXG5cclxuXHRcdC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIHByb2plY3QgdmlldyB0aXRsZSAoaWYgbmVlZGVkLCBtYXliZSBoYW5kbGVkIGJ5IGNvbXBvbmVudCBpdHNlbGYpXHJcblx0XHQvLyBpZiAodmlld0lkID09PSBcInByb2plY3RzXCIgJiYgdGhpcy5zZWxlY3RlZFByb2plY3RGb3JWaWV3KSB7XHJcblx0XHQvLyBcdGNvbnN0IHByb2plY3ROYW1lID0gdGhpcy5zZWxlY3RlZFByb2plY3RGb3JWaWV3LnNwbGl0KFwiL1wiKS5wb3AoKTtcclxuXHRcdC8vIFx0dGl0bGUgPSBwcm9qZWN0TmFtZSB8fCB0KFwiUHJvamVjdFwiKTtcclxuXHRcdC8vIH1cclxuXHRcdHRoaXMudGl0bGVFbC5zZXRUZXh0KHRpdGxlKTtcclxuXHJcblx0XHQvLyBSZS1pbml0aWFsaXplIHZpZXcgbW9kZSBmb3IgdGhlIG5ldyB2aWV3XHJcblx0XHR0aGlzLmluaXRpYWxpemVWaWV3TW9kZSgpO1xyXG5cclxuXHRcdHRoaXMuYXBwbHlGaWx0ZXJzKCk7XHJcblx0XHR0aGlzLnJlZnJlc2hUYXNrTGlzdCgpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhcHBseUZpbHRlcnMoKSB7XHJcblx0XHQvLyBDYWxsIHRoZSBjZW50cmFsaXplZCBmaWx0ZXIgdXRpbGl0eVxyXG5cdFx0dGhpcy5maWx0ZXJlZFRhc2tzID0gZmlsdGVyVGFza3MoXHJcblx0XHRcdHRoaXMuYWxsVGFza3MsXHJcblx0XHRcdHRoaXMuY3VycmVudFZpZXdJZCxcclxuXHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdHsgdGV4dFF1ZXJ5OiB0aGlzLmZpbHRlcklucHV0Py52YWx1ZSB9LCAvLyBQYXNzIHRleHQgcXVlcnkgZnJvbSBpbnB1dFxyXG5cdFx0KTtcclxuXHJcblx0XHRjb25zdCBzb3J0Q3JpdGVyaWEgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy52aWV3Q29uZmlndXJhdGlvbi5maW5kKFxyXG5cdFx0XHQodmlldykgPT4gdmlldy5pZCA9PT0gdGhpcy5jdXJyZW50Vmlld0lkLFxyXG5cdFx0KT8uc29ydENyaXRlcmlhO1xyXG5cdFx0aWYgKHNvcnRDcml0ZXJpYSAmJiBzb3J0Q3JpdGVyaWEubGVuZ3RoID4gMCkge1xyXG5cdFx0XHR0aGlzLmZpbHRlcmVkVGFza3MgPSBzb3J0VGFza3MoXHJcblx0XHRcdFx0dGhpcy5maWx0ZXJlZFRhc2tzLFxyXG5cdFx0XHRcdHNvcnRDcml0ZXJpYSxcclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncyxcclxuXHRcdFx0KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIERlZmF1bHQgc29ydGluZzogY29tcGxldGVkIHRhc2tzIGxhc3QsIHRoZW4gYnkgcHJpb3JpdHksIGR1ZSBkYXRlLCBjb250ZW50LFxyXG5cdFx0XHQvLyB3aXRoIGxvd2VzdC1wcmlvcml0eSB0aWUtYnJlYWtlcnM6IGZpbGVQYXRoIC0+IGxpbmVcclxuXHRcdFx0dGhpcy5maWx0ZXJlZFRhc2tzLnNvcnQoKGEsIGIpID0+IHtcclxuXHRcdFx0XHRjb25zdCBjb21wbGV0ZWRBID0gYS5jb21wbGV0ZWQ7XHJcblx0XHRcdFx0Y29uc3QgY29tcGxldGVkQiA9IGIuY29tcGxldGVkO1xyXG5cdFx0XHRcdGlmIChjb21wbGV0ZWRBICE9PSBjb21wbGV0ZWRCKSByZXR1cm4gY29tcGxldGVkQSA/IDEgOiAtMTtcclxuXHJcblx0XHRcdFx0Ly8gQWNjZXNzIHByaW9yaXR5IGZyb20gbWV0YWRhdGFcclxuXHRcdFx0XHRjb25zdCBwcmlvQSA9IGEubWV0YWRhdGEucHJpb3JpdHkgPz8gMDtcclxuXHRcdFx0XHRjb25zdCBwcmlvQiA9IGIubWV0YWRhdGEucHJpb3JpdHkgPz8gMDtcclxuXHRcdFx0XHRpZiAocHJpb0EgIT09IHByaW9CKSByZXR1cm4gcHJpb0IgLSBwcmlvQTtcclxuXHJcblx0XHRcdFx0Ly8gQWNjZXNzIGR1ZSBkYXRlIGZyb20gbWV0YWRhdGFcclxuXHRcdFx0XHRjb25zdCBkdWVBID0gYS5tZXRhZGF0YS5kdWVEYXRlID8/IEluZmluaXR5O1xyXG5cdFx0XHRcdGNvbnN0IGR1ZUIgPSBiLm1ldGFkYXRhLmR1ZURhdGUgPz8gSW5maW5pdHk7XHJcblx0XHRcdFx0aWYgKGR1ZUEgIT09IGR1ZUIpIHJldHVybiBkdWVBIC0gZHVlQjtcclxuXHJcblx0XHRcdFx0Ly8gQ29udGVudCBjb21wYXJlIChjYXNlLWluc2Vuc2l0aXZlIG51bWVyaWMgYXdhcmUpXHJcblx0XHRcdFx0Y29uc3QgY29sbGF0b3IgPSBuZXcgSW50bC5Db2xsYXRvcih1bmRlZmluZWQsIHtcclxuXHRcdFx0XHRcdHVzYWdlOiBcInNvcnRcIixcclxuXHRcdFx0XHRcdHNlbnNpdGl2aXR5OiBcImJhc2VcIixcclxuXHRcdFx0XHRcdG51bWVyaWM6IHRydWUsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0Y29uc3QgY29udGVudENtcCA9IGNvbGxhdG9yLmNvbXBhcmUoXHJcblx0XHRcdFx0XHRhLmNvbnRlbnQgPz8gXCJcIixcclxuXHRcdFx0XHRcdGIuY29udGVudCA/PyBcIlwiLFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0aWYgKGNvbnRlbnRDbXAgIT09IDApIHJldHVybiBjb250ZW50Q21wO1xyXG5cdFx0XHRcdC8vIExvd2VzdC1wcmlvcml0eSB0aWUtYnJlYWtlcnMgdG8gZW5zdXJlIHN0YWJpbGl0eSBhY3Jvc3MgZmlsZXNcclxuXHRcdFx0XHRjb25zdCBmcCA9IChhLmZpbGVQYXRoIHx8IFwiXCIpLmxvY2FsZUNvbXBhcmUoYi5maWxlUGF0aCB8fCBcIlwiKTtcclxuXHRcdFx0XHRpZiAoZnAgIT09IDApIHJldHVybiBmcDtcclxuXHRcdFx0XHRyZXR1cm4gKGEubGluZSA/PyAwKSAtIChiLmxpbmUgPz8gMCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFVwZGF0ZSB0aGUgdGFzayBjb3VudCBkaXNwbGF5XHJcblx0XHR0aGlzLmNvdW50RWwuc2V0VGV4dChgJHt0aGlzLmZpbHRlcmVkVGFza3MubGVuZ3RofSAke3QoXCJ0YXNrc1wiKX1gKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZmlsdGVyVGFza3MocXVlcnk6IHN0cmluZykge1xyXG5cdFx0dGhpcy5hcHBseUZpbHRlcnMoKTsgLy8gUmUtYXBwbHkgYWxsIGZpbHRlcnMgaW5jbHVkaW5nIHRoZSBuZXcgdGV4dCBxdWVyeVxyXG5cdFx0dGhpcy5yZWZyZXNoVGFza0xpc3QoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY2xlYW51cENvbXBvbmVudHMoKSB7XHJcblx0XHQvLyBVbmxvYWQgYW5kIGNsZWFyIHByZXZpb3VzIGNvbXBvbmVudHNcclxuXHRcdHRoaXMudGFza0NvbXBvbmVudHMuZm9yRWFjaCgoY29tcG9uZW50KSA9PiB0aGlzLnJlbW92ZUNoaWxkKGNvbXBvbmVudCkpO1xyXG5cdFx0dGhpcy50YXNrQ29tcG9uZW50cyA9IFtdO1xyXG5cdFx0dGhpcy50cmVlQ29tcG9uZW50cy5mb3JFYWNoKChjb21wb25lbnQpID0+IHRoaXMucmVtb3ZlQ2hpbGQoY29tcG9uZW50KSk7XHJcblx0XHR0aGlzLnRyZWVDb21wb25lbnRzID0gW107XHJcblx0XHQvLyBEaXNjb25uZWN0IG9ic2VydmVyIGZyb20gYW55IHByZXZpb3VzIGVsZW1lbnRzXHJcblx0XHR0aGlzLnRhc2tMaXN0T2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xyXG5cdFx0Ly8gQ2xlYXIgdGhlIGNvbnRhaW5lclxyXG5cdFx0dGhpcy50YXNrTGlzdEVsLmVtcHR5KCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGlzQ29udGFpbmVyVmlzaWJsZSgpOiBib29sZWFuIHtcclxuXHRcdGlmICghdGhpcy5jb250YWluZXJFbCkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0Y29uc3QgaW5Eb20gPSBkb2N1bWVudC5ib2R5LmNvbnRhaW5zKHRoaXMuY29udGFpbmVyRWwpO1xyXG5cdFx0aWYgKCFpbkRvbSkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0Y29uc3Qgc3R5bGUgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLmNvbnRhaW5lckVsKTtcclxuXHRcdGlmIChzdHlsZS5kaXNwbGF5ID09PSBcIm5vbmVcIiB8fCBzdHlsZS52aXNpYmlsaXR5ID09PSBcImhpZGRlblwiKVxyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRjb25zdCByZWN0ID0gdGhpcy5jb250YWluZXJFbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuXHRcdHJldHVybiByZWN0LndpZHRoID4gMCAmJiByZWN0LmhlaWdodCA+IDA7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlZnJlc2hUYXNrTGlzdCgpIHtcclxuXHRcdC8vIERlZmVyIHJlbmRlcmluZyBpZiBjb250YWluZXIgaXMgbm90IHZpc2libGUgeWV0IChlLmcuLCB2aWV3IGhpZGRlbiBkdXJpbmcgaW5pdClcclxuXHRcdGlmICghdGhpcy5pc0NvbnRhaW5lclZpc2libGUoKSkge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XCJDb250ZW50Q29tcG9uZW50OiBDYW5ub3QgcmVuZGVyOiBDb250YWluZXIgbm90IHZpc2libGUuIFF1ZXVpbmcgcmVmcmVzaC4uLlwiLFxyXG5cdFx0XHQpO1xyXG5cdFx0XHR0aGlzLnBlbmRpbmdGb3JjZVJlZnJlc2ggPSB0cnVlO1xyXG5cdFx0XHRpZiAoIXRoaXMucGVuZGluZ1Zpc2liaWxpdHlSZXRyeSkge1xyXG5cdFx0XHRcdHRoaXMucGVuZGluZ1Zpc2liaWxpdHlSZXRyeSA9IHRydWU7XHJcblx0XHRcdFx0Y29uc3QgdHJ5QWdhaW4gPSAoKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAodGhpcy5pc0NvbnRhaW5lclZpc2libGUoKSkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnBlbmRpbmdWaXNpYmlsaXR5UmV0cnkgPSBmYWxzZTtcclxuXHRcdFx0XHRcdFx0dGhpcy52aXNpYmlsaXR5UmV0cnlDb3VudCA9IDA7XHJcblx0XHRcdFx0XHRcdGlmICh0aGlzLnBlbmRpbmdGb3JjZVJlZnJlc2ggJiYgIXRoaXMuaXNSZW5kZXJpbmcpIHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnBlbmRpbmdGb3JjZVJlZnJlc2ggPSBmYWxzZTtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnJlZnJlc2hUYXNrTGlzdCgpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGlmICh0aGlzLnZpc2liaWxpdHlSZXRyeUNvdW50IDwgMzApIHtcclxuXHRcdFx0XHRcdFx0dGhpcy52aXNpYmlsaXR5UmV0cnlDb3VudCsrO1xyXG5cdFx0XHRcdFx0XHRzZXRUaW1lb3V0KHRyeUFnYWluLCAxMDApO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5wZW5kaW5nVmlzaWJpbGl0eVJldHJ5ID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdHRoaXMudmlzaWJpbGl0eVJldHJ5Q291bnQgPSAwO1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRcdFx0XCJDb250ZW50Q29tcG9uZW50OiBDb250YWluZXIgc3RpbGwgbm90IHZpc2libGUgYWZ0ZXIgcmV0cmllczsgd2lsbCB3YWl0IGZvciBuZXh0IHRyaWdnZXIuXCIsXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHR0cnlBZ2FpbigpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBJZiBhIHJlbmRlciBpcyBhbHJlYWR5IGluIHByb2dyZXNzLCBxdWV1ZSBhIHJlZnJlc2ggaW5zdGVhZCBvZiBza2lwcGluZ1xyXG5cdFx0aWYgKHRoaXMuaXNSZW5kZXJpbmcpIHtcclxuXHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XCJDb250ZW50Q29tcG9uZW50OiBBbHJlYWR5IHJlbmRlcmluZywgcXVldWVpbmcgYSByZWZyZXNoXCIsXHJcblx0XHRcdCk7XHJcblx0XHRcdHRoaXMucGVuZGluZ0ZvcmNlUmVmcmVzaCA9IHRydWU7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmlzUmVuZGVyaW5nID0gdHJ1ZTtcclxuXHJcblx0XHQvLyBDYXB0dXJlIHNjcm9sbCBzdGF0ZSB0byBtaXRpZ2F0ZSBzY3JvbGxiYXIganVtcGluZ1xyXG5cdFx0Y29uc3QgcHJldlNjcm9sbFN0YXRlID0gdGhpcy5jYXB0dXJlU2Nyb2xsU3RhdGUoKTtcclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHR0aGlzLmNsZWFudXBDb21wb25lbnRzKCk7IC8vIENsZWFyIHByZXZpb3VzIHN0YXRlIGFuZCBjb21wb25lbnRzXHJcblxyXG5cdFx0XHQvLyBSZXNldCBpbmRpY2VzIGZvciBsYXp5IGxvYWRpbmdcclxuXHRcdFx0dGhpcy5uZXh0VGFza0luZGV4ID0gMDtcclxuXHRcdFx0dGhpcy5uZXh0Um9vdFRhc2tJbmRleCA9IDA7XHJcblx0XHRcdHRoaXMucm9vdFRhc2tzID0gW107XHJcblxyXG5cdFx0XHRpZiAodGhpcy5maWx0ZXJlZFRhc2tzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRcdHRoaXMuYWRkRW1wdHlTdGF0ZSh0KFwiTm8gdGFza3MgZm91bmQuXCIpKTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFJlbmRlciBiYXNlZCBvbiB2aWV3IG1vZGVcclxuXHRcdFx0aWYgKHRoaXMuaXNUcmVlVmlldykge1xyXG5cdFx0XHRcdGNvbnN0IHRhc2tNYXAgPSBuZXcgTWFwPHN0cmluZywgVGFzaz4oKTtcclxuXHRcdFx0XHQvLyBBZGQgYWxsIG5vbi1maWx0ZXJlZCB0YXNrcyB0byB0aGUgdGFza01hcFxyXG5cdFx0XHRcdHRoaXMubm90RmlsdGVyZWRUYXNrcy5mb3JFYWNoKCh0YXNrKSA9PlxyXG5cdFx0XHRcdFx0dGFza01hcC5zZXQodGFzay5pZCwgdGFzayksXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHR0aGlzLnJvb3RUYXNrcyA9IHRhc2tzVG9UcmVlKHRoaXMuZmlsdGVyZWRUYXNrcyk7IC8vIENhbGN1bGF0ZSByb290IHRhc2tzXHJcblx0XHRcdFx0Ly8gU29ydCByb290cyBhY2NvcmRpbmcgdG8gdmlldydzIHNvcnQgY3JpdGVyaWEgKGZhbGxiYWNrIHRvIHNlbnNpYmxlIGRlZmF1bHRzKVxyXG5cdFx0XHRcdGNvbnN0IHZpZXdTb3J0Q3JpdGVyaWEgPVxyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3Mudmlld0NvbmZpZ3VyYXRpb24uZmluZChcclxuXHRcdFx0XHRcdFx0KHZpZXcpID0+IHZpZXcuaWQgPT09IHRoaXMuY3VycmVudFZpZXdJZCxcclxuXHRcdFx0XHRcdCk/LnNvcnRDcml0ZXJpYTtcclxuXHRcdFx0XHRpZiAodmlld1NvcnRDcml0ZXJpYSAmJiB2aWV3U29ydENyaXRlcmlhLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRcdHRoaXMucm9vdFRhc2tzID0gc29ydFRhc2tzKFxyXG5cdFx0XHRcdFx0XHR0aGlzLnJvb3RUYXNrcyxcclxuXHRcdFx0XHRcdFx0dmlld1NvcnRDcml0ZXJpYSxcclxuXHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MsXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHQvLyBEZWZhdWx0IHNvcnRpbmc6IGNvbXBsZXRlZCB0YXNrcyBsYXN0LCB0aGVuIGJ5IHByaW9yaXR5LCBkdWUgZGF0ZSwgY29udGVudCxcclxuXHRcdFx0XHRcdC8vIHdpdGggbG93ZXN0LXByaW9yaXR5IHRpZS1icmVha2VyczogZmlsZVBhdGggLT4gbGluZVxyXG5cdFx0XHRcdFx0dGhpcy5yb290VGFza3Muc29ydCgoYSwgYikgPT4ge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBjb21wbGV0ZWRBID0gYS5jb21wbGV0ZWQ7XHJcblx0XHRcdFx0XHRcdGNvbnN0IGNvbXBsZXRlZEIgPSBiLmNvbXBsZXRlZDtcclxuXHRcdFx0XHRcdFx0aWYgKGNvbXBsZXRlZEEgIT09IGNvbXBsZXRlZEIpXHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGNvbXBsZXRlZEEgPyAxIDogLTE7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBBY2Nlc3MgcHJpb3JpdHkgZnJvbSBtZXRhZGF0YVxyXG5cdFx0XHRcdFx0XHRjb25zdCBwcmlvQSA9IGEubWV0YWRhdGEucHJpb3JpdHkgPz8gMDtcclxuXHRcdFx0XHRcdFx0Y29uc3QgcHJpb0IgPSBiLm1ldGFkYXRhLnByaW9yaXR5ID8/IDA7XHJcblx0XHRcdFx0XHRcdGlmIChwcmlvQSAhPT0gcHJpb0IpIHJldHVybiBwcmlvQiAtIHByaW9BO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gQWNjZXNzIGR1ZSBkYXRlIGZyb20gbWV0YWRhdGFcclxuXHRcdFx0XHRcdFx0Y29uc3QgZHVlQSA9IGEubWV0YWRhdGEuZHVlRGF0ZSA/PyBJbmZpbml0eTtcclxuXHRcdFx0XHRcdFx0Y29uc3QgZHVlQiA9IGIubWV0YWRhdGEuZHVlRGF0ZSA/PyBJbmZpbml0eTtcclxuXHRcdFx0XHRcdFx0aWYgKGR1ZUEgIT09IGR1ZUIpIHJldHVybiBkdWVBIC0gZHVlQjtcclxuXHJcblx0XHRcdFx0XHRcdC8vIENvbnRlbnQgY29tcGFyZSAoY2FzZS1pbnNlbnNpdGl2ZSBudW1lcmljIGF3YXJlKVxyXG5cdFx0XHRcdFx0XHRjb25zdCBjb2xsYXRvciA9IG5ldyBJbnRsLkNvbGxhdG9yKHVuZGVmaW5lZCwge1xyXG5cdFx0XHRcdFx0XHRcdHVzYWdlOiBcInNvcnRcIixcclxuXHRcdFx0XHRcdFx0XHRzZW5zaXRpdml0eTogXCJiYXNlXCIsXHJcblx0XHRcdFx0XHRcdFx0bnVtZXJpYzogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdGNvbnN0IGNvbnRlbnRDbXAgPSBjb2xsYXRvci5jb21wYXJlKFxyXG5cdFx0XHRcdFx0XHRcdGEuY29udGVudCA/PyBcIlwiLFxyXG5cdFx0XHRcdFx0XHRcdGIuY29udGVudCA/PyBcIlwiLFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRpZiAoY29udGVudENtcCAhPT0gMCkgcmV0dXJuIGNvbnRlbnRDbXA7XHJcblx0XHRcdFx0XHRcdC8vIExvd2VzdC1wcmlvcml0eSB0aWUtYnJlYWtlcnMgdG8gZW5zdXJlIHN0YWJpbGl0eSBhY3Jvc3MgZmlsZXNcclxuXHRcdFx0XHRcdFx0Y29uc3QgZnAgPSAoYS5maWxlUGF0aCB8fCBcIlwiKS5sb2NhbGVDb21wYXJlKFxyXG5cdFx0XHRcdFx0XHRcdGIuZmlsZVBhdGggfHwgXCJcIixcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0aWYgKGZwICE9PSAwKSByZXR1cm4gZnA7XHJcblx0XHRcdFx0XHRcdHJldHVybiAoYS5saW5lID8/IDApIC0gKGIubGluZSA/PyAwKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHR0aGlzLmxvYWRSb290VGFza0JhdGNoKHRhc2tNYXApOyAvLyBMb2FkIHRoZSBmaXJzdCBiYXRjaFxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMubG9hZFRhc2tCYXRjaCgpOyAvLyBMb2FkIHRoZSBmaXJzdCBiYXRjaFxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBBZGQgbG9hZCBtYXJrZXIgaWYgbmVjZXNzYXJ5XHJcblx0XHRcdHRoaXMuY2hlY2tBbmRBZGRMb2FkTWFya2VyKCk7XHJcblx0XHRcdC8vIFJlc3RvcmUgc2Nyb2xsIHN0YXRlIGFmdGVyIHJlbmRlclxyXG5cdFx0XHR0aGlzLnJlc3RvcmVTY3JvbGxTdGF0ZShwcmV2U2Nyb2xsU3RhdGUpO1xyXG5cdFx0fSBmaW5hbGx5IHtcclxuXHRcdFx0Ly8gUmVzZXQgcmVuZGVyaW5nIGZsYWcgYWZ0ZXIgY29tcGxldGlvblxyXG5cdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHR0aGlzLmlzUmVuZGVyaW5nID0gZmFsc2U7XHJcblx0XHRcdFx0Ly8gSWYgYSByZWZyZXNoIHdhcyBxdWV1ZWQgZHVyaW5nIHJlbmRlcmluZywgcHJvY2VzcyBpdCBub3dcclxuXHRcdFx0XHRpZiAodGhpcy5wZW5kaW5nRm9yY2VSZWZyZXNoKSB7XHJcblx0XHRcdFx0XHR0aGlzLnBlbmRpbmdGb3JjZVJlZnJlc2ggPSBmYWxzZTtcclxuXHRcdFx0XHRcdHRoaXMucmVmcmVzaFRhc2tMaXN0KCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LCA1MCk7IC8vIFNtYWxsIGRlbGF5IHRvIHByZXZlbnQgaW1tZWRpYXRlIHJlLWVudHJ5XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBDYXB0dXJlIGN1cnJlbnQgc2Nyb2xsIHN0YXRlIChhbmNob3IgaWQgKyBvZmZzZXQgKyBzY3JvbGxUb3ApXHJcblx0cHJpdmF0ZSBjYXB0dXJlU2Nyb2xsU3RhdGUoKSB7XHJcblx0XHRjb25zdCBjb250YWluZXIgPSB0aGlzLnRhc2tMaXN0RWw7XHJcblx0XHRpZiAoIWNvbnRhaW5lcilcclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRzY3JvbGxUb3A6IDAsXHJcblx0XHRcdFx0YW5jaG9ySWQ6IG51bGwgYXMgc3RyaW5nIHwgbnVsbCxcclxuXHRcdFx0XHRhbmNob3JPZmZzZXQ6IDAsXHJcblx0XHRcdH07XHJcblx0XHRjb25zdCBzY3JvbGxUb3AgPSBjb250YWluZXIuc2Nyb2xsVG9wO1xyXG5cdFx0bGV0IGFuY2hvcklkOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcclxuXHRcdGxldCBhbmNob3JPZmZzZXQgPSAwO1xyXG5cdFx0Y29uc3QgY29udGFpbmVyUmVjdCA9IGNvbnRhaW5lci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuXHRcdC8vIEZpbmQgZmlyc3QgdmlzaWJsZSB0YXNrIGl0ZW1cclxuXHRcdGNvbnN0IGl0ZW1zID0gQXJyYXkuZnJvbShcclxuXHRcdFx0Y29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KFwiLnRhc2staXRlbVwiKSxcclxuXHRcdCk7XHJcblx0XHRmb3IgKGNvbnN0IGVsIG9mIGl0ZW1zKSB7XHJcblx0XHRcdGNvbnN0IHJlY3QgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuXHRcdFx0Y29uc3Qgb2Zmc2V0ID0gcmVjdC50b3AgLSBjb250YWluZXJSZWN0LnRvcDtcclxuXHRcdFx0aWYgKHJlY3QuYm90dG9tID4gY29udGFpbmVyUmVjdC50b3ApIHtcclxuXHRcdFx0XHRhbmNob3JJZCA9IGVsLmdldEF0dHJpYnV0ZShcImRhdGEtdGFzay1pZFwiKTtcclxuXHRcdFx0XHRhbmNob3JPZmZzZXQgPSBNYXRoLm1heCgwLCBvZmZzZXQpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRyZXR1cm4geyBzY3JvbGxUb3AsIGFuY2hvcklkLCBhbmNob3JPZmZzZXQgfTtcclxuXHR9XHJcblxyXG5cdC8vIFJlc3RvcmUgc2Nyb2xsIHN0YXRlIGFmdGVyIHJlLXJlbmRlclxyXG5cdHByaXZhdGUgcmVzdG9yZVNjcm9sbFN0YXRlKHN0YXRlOiB7XHJcblx0XHRzY3JvbGxUb3A6IG51bWJlcjtcclxuXHRcdGFuY2hvcklkOiBzdHJpbmcgfCBudWxsO1xyXG5cdFx0YW5jaG9yT2Zmc2V0OiBudW1iZXI7XHJcblx0fSkge1xyXG5cdFx0Y29uc3QgY29udGFpbmVyID0gdGhpcy50YXNrTGlzdEVsO1xyXG5cdFx0aWYgKCFjb250YWluZXIpIHJldHVybjtcclxuXHRcdC8vIFRyeSBhbmNob3ItYmFzZWQgcmVzdG9yYXRpb24gZmlyc3RcclxuXHRcdGlmIChzdGF0ZS5hbmNob3JJZCkge1xyXG5cdFx0XHRjb25zdCBhbmNob3JFbCA9IGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PihcclxuXHRcdFx0XHRgW2RhdGEtdGFzay1pZD1cIiR7c3RhdGUuYW5jaG9ySWR9XCJdYCxcclxuXHRcdFx0KTtcclxuXHRcdFx0aWYgKGFuY2hvckVsKSB7XHJcblx0XHRcdFx0Y29uc3QgZGVzaXJlZE9mZnNldCA9IHN0YXRlLmFuY2hvck9mZnNldDtcclxuXHRcdFx0XHRjb25zdCBjdXJyZW50T2Zmc2V0ID1cclxuXHRcdFx0XHRcdGFuY2hvckVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcCAtXHJcblx0XHRcdFx0XHRjb250YWluZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wO1xyXG5cdFx0XHRcdGNvbnN0IGRlbHRhID0gY3VycmVudE9mZnNldCAtIGRlc2lyZWRPZmZzZXQ7XHJcblx0XHRcdFx0Y29udGFpbmVyLnNjcm9sbFRvcCArPSBkZWx0YTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdC8vIEZhbGxiYWNrOiByZXN0b3JlIHJhdyBzY3JvbGxUb3BcclxuXHRcdGNvbnRhaW5lci5zY3JvbGxUb3AgPSBzdGF0ZS5zY3JvbGxUb3A7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGxvYWRUYXNrQmF0Y2goKTogbnVtYmVyIHtcclxuXHRcdGNvbnN0IGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xyXG5cdFx0Y29uc3QgY291bnRUb0xvYWQgPSB0aGlzLnRhc2tQYWdlU2l6ZTtcclxuXHRcdGNvbnN0IHN0YXJ0ID0gdGhpcy5uZXh0VGFza0luZGV4O1xyXG5cdFx0Y29uc3QgZW5kID0gTWF0aC5taW4oc3RhcnQgKyBjb3VudFRvTG9hZCwgdGhpcy5maWx0ZXJlZFRhc2tzLmxlbmd0aCk7XHJcblxyXG5cdFx0Ly8gY29uc29sZS5sb2coYExvYWRpbmcgbGlzdCB0YXNrcyBmcm9tICR7c3RhcnR9IHRvICR7ZW5kfWApO1xyXG5cclxuXHRcdGZvciAobGV0IGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XHJcblx0XHRcdGNvbnN0IHRhc2sgPSB0aGlzLmZpbHRlcmVkVGFza3NbaV07XHJcblx0XHRcdGNvbnN0IHRhc2tDb21wb25lbnQgPSBuZXcgVGFza0xpc3RJdGVtQ29tcG9uZW50KFxyXG5cdFx0XHRcdHRhc2ssXHJcblx0XHRcdFx0dGhpcy5jdXJyZW50Vmlld0lkLCAvLyBQYXNzIGN1cnJlbnRWaWV3SWRcclxuXHRcdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIEF0dGFjaCBldmVudCBoYW5kbGVyc1xyXG5cdFx0XHR0YXNrQ29tcG9uZW50Lm9uVGFza1NlbGVjdGVkID0gdGhpcy5zZWxlY3RUYXNrLmJpbmQodGhpcyk7XHJcblx0XHRcdHRhc2tDb21wb25lbnQub25UYXNrQ29tcGxldGVkID0gKHQpID0+IHtcclxuXHRcdFx0XHRpZiAodGhpcy5wYXJhbXMub25UYXNrQ29tcGxldGVkKSB0aGlzLnBhcmFtcy5vblRhc2tDb21wbGV0ZWQodCk7XHJcblx0XHRcdH07XHJcblx0XHRcdHRhc2tDb21wb25lbnQub25UYXNrVXBkYXRlID0gYXN5bmMgKG9yaWdpbmFsVGFzaywgdXBkYXRlZFRhc2spID0+IHtcclxuXHRcdFx0XHRpZiAodGhpcy5wYXJhbXMub25UYXNrVXBkYXRlKSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdFx0XCJDb250ZW50Q29tcG9uZW50IG9uVGFza1VwZGF0ZVwiLFxyXG5cdFx0XHRcdFx0XHRvcmlnaW5hbFRhc2suY29udGVudCxcclxuXHRcdFx0XHRcdFx0dXBkYXRlZFRhc2suY29udGVudCxcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRhd2FpdCB0aGlzLnBhcmFtcy5vblRhc2tVcGRhdGUob3JpZ2luYWxUYXNrLCB1cGRhdGVkVGFzayk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cdFx0XHR0YXNrQ29tcG9uZW50Lm9uVGFza0NvbnRleHRNZW51ID0gKGUsIHQpID0+IHtcclxuXHRcdFx0XHRpZiAodGhpcy5wYXJhbXMub25UYXNrQ29udGV4dE1lbnUpXHJcblx0XHRcdFx0XHR0aGlzLnBhcmFtcy5vblRhc2tDb250ZXh0TWVudShlLCB0KTtcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHRoaXMuYWRkQ2hpbGQodGFza0NvbXBvbmVudCk7IC8vIE1hbmFnZSBsaWZlY3ljbGVcclxuXHRcdFx0dGFza0NvbXBvbmVudC5sb2FkKCk7XHJcblx0XHRcdGZyYWdtZW50LmFwcGVuZENoaWxkKHRhc2tDb21wb25lbnQuZWxlbWVudCk7XHJcblx0XHRcdHRoaXMudGFza0NvbXBvbmVudHMucHVzaCh0YXNrQ29tcG9uZW50KTsgLy8gS2VlcCB0cmFjayBvZiByZW5kZXJlZCBjb21wb25lbnRzXHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy50YXNrTGlzdEVsLmFwcGVuZENoaWxkKGZyYWdtZW50KTtcclxuXHRcdHRoaXMubmV4dFRhc2tJbmRleCA9IGVuZDsgLy8gVXBkYXRlIGluZGV4IGZvciB0aGUgbmV4dCBiYXRjaFxyXG5cdFx0cmV0dXJuIGVuZDsgLy8gUmV0dXJuIHRoZSBuZXcgZW5kIGluZGV4XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGxvYWRSb290VGFza0JhdGNoKHRhc2tNYXA6IE1hcDxzdHJpbmcsIFRhc2s+KTogbnVtYmVyIHtcclxuXHRcdGNvbnN0IGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xyXG5cdFx0Y29uc3QgY291bnRUb0xvYWQgPSB0aGlzLnRhc2tQYWdlU2l6ZTtcclxuXHRcdGNvbnN0IHN0YXJ0ID0gdGhpcy5uZXh0Um9vdFRhc2tJbmRleDtcclxuXHRcdGNvbnN0IGVuZCA9IE1hdGgubWluKHN0YXJ0ICsgY291bnRUb0xvYWQsIHRoaXMucm9vdFRhc2tzLmxlbmd0aCk7XHJcblxyXG5cdFx0Ly8gTWFrZSBzdXJlIGFsbCBub24tZmlsdGVyZWQgdGFza3MgYXJlIGluIHRoZSB0YXNrTWFwXHJcblx0XHR0aGlzLm5vdEZpbHRlcmVkVGFza3MuZm9yRWFjaCgodGFzaykgPT4ge1xyXG5cdFx0XHRpZiAoIXRhc2tNYXAuaGFzKHRhc2suaWQpKSB7XHJcblx0XHRcdFx0dGFza01hcC5zZXQodGFzay5pZCwgdGFzayk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdGZvciAobGV0IGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XHJcblx0XHRcdGNvbnN0IHJvb3RUYXNrID0gdGhpcy5yb290VGFza3NbaV07XHJcblx0XHRcdGNvbnN0IGNoaWxkVGFza3MgPSB0aGlzLm5vdEZpbHRlcmVkVGFza3MuZmlsdGVyKFxyXG5cdFx0XHRcdCh0YXNrKSA9PiB0YXNrLm1ldGFkYXRhLnBhcmVudCA9PT0gcm9vdFRhc2suaWQsXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRjb25zdCB0cmVlQ29tcG9uZW50ID0gbmV3IFRhc2tUcmVlSXRlbUNvbXBvbmVudChcclxuXHRcdFx0XHRyb290VGFzayxcclxuXHRcdFx0XHR0aGlzLmN1cnJlbnRWaWV3SWQsIC8vIFBhc3MgY3VycmVudFZpZXdJZFxyXG5cdFx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHRcdDAsXHJcblx0XHRcdFx0Y2hpbGRUYXNrcyxcclxuXHRcdFx0XHR0YXNrTWFwLFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gQXR0YWNoIGV2ZW50IGhhbmRsZXJzXHJcblx0XHRcdHRyZWVDb21wb25lbnQub25UYXNrU2VsZWN0ZWQgPSB0aGlzLnNlbGVjdFRhc2suYmluZCh0aGlzKTtcclxuXHRcdFx0dHJlZUNvbXBvbmVudC5vblRhc2tDb21wbGV0ZWQgPSAodCkgPT4ge1xyXG5cdFx0XHRcdGlmICh0aGlzLnBhcmFtcy5vblRhc2tDb21wbGV0ZWQpIHRoaXMucGFyYW1zLm9uVGFza0NvbXBsZXRlZCh0KTtcclxuXHRcdFx0fTtcclxuXHRcdFx0dHJlZUNvbXBvbmVudC5vblRhc2tVcGRhdGUgPSBhc3luYyAob3JpZ2luYWxUYXNrLCB1cGRhdGVkVGFzaykgPT4ge1xyXG5cdFx0XHRcdGlmICh0aGlzLnBhcmFtcy5vblRhc2tVcGRhdGUpIHtcclxuXHRcdFx0XHRcdGF3YWl0IHRoaXMucGFyYW1zLm9uVGFza1VwZGF0ZShvcmlnaW5hbFRhc2ssIHVwZGF0ZWRUYXNrKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblx0XHRcdHRyZWVDb21wb25lbnQub25UYXNrQ29udGV4dE1lbnUgPSAoZSwgdCkgPT4ge1xyXG5cdFx0XHRcdGlmICh0aGlzLnBhcmFtcy5vblRhc2tDb250ZXh0TWVudSlcclxuXHRcdFx0XHRcdHRoaXMucGFyYW1zLm9uVGFza0NvbnRleHRNZW51KGUsIHQpO1xyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0dGhpcy5hZGRDaGlsZCh0cmVlQ29tcG9uZW50KTsgLy8gTWFuYWdlIGxpZmVjeWNsZVxyXG5cdFx0XHR0cmVlQ29tcG9uZW50LmxvYWQoKTtcclxuXHRcdFx0ZnJhZ21lbnQuYXBwZW5kQ2hpbGQodHJlZUNvbXBvbmVudC5lbGVtZW50KTtcclxuXHRcdFx0dGhpcy50cmVlQ29tcG9uZW50cy5wdXNoKHRyZWVDb21wb25lbnQpOyAvLyBLZWVwIHRyYWNrIG9mIHJlbmRlcmVkIGNvbXBvbmVudHNcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnRhc2tMaXN0RWwuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpO1xyXG5cdFx0dGhpcy5uZXh0Um9vdFRhc2tJbmRleCA9IGVuZDsgLy8gVXBkYXRlIGluZGV4IGZvciB0aGUgbmV4dCBiYXRjaFxyXG5cdFx0cmV0dXJuIGVuZDsgLy8gUmV0dXJuIHRoZSBuZXcgZW5kIGluZGV4XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNoZWNrQW5kQWRkTG9hZE1hcmtlcigpIHtcclxuXHRcdHRoaXMucmVtb3ZlTG9hZE1hcmtlcigpOyAvLyBSZW1vdmUgZXhpc3RpbmcgbWFya2VyIGZpcnN0XHJcblxyXG5cdFx0Y29uc3QgbW9yZVRhc2tzRXhpc3QgPSB0aGlzLmlzVHJlZVZpZXdcclxuXHRcdFx0PyB0aGlzLm5leHRSb290VGFza0luZGV4IDwgdGhpcy5yb290VGFza3MubGVuZ3RoXHJcblx0XHRcdDogdGhpcy5uZXh0VGFza0luZGV4IDwgdGhpcy5maWx0ZXJlZFRhc2tzLmxlbmd0aDtcclxuXHJcblx0XHQvLyBjb25zb2xlLmxvZyhcclxuXHRcdC8vIFx0YENoZWNrIGxvYWQgbWFya2VyOiBtb3JlVGFza3NFeGlzdCA9ICR7bW9yZVRhc2tzRXhpc3R9IChUcmVlOiAke3RoaXMubmV4dFJvb3RUYXNrSW5kZXh9LyR7dGhpcy5yb290VGFza3MubGVuZ3RofSwgTGlzdDogJHt0aGlzLm5leHRUYXNrSW5kZXh9LyR7dGhpcy5maWx0ZXJlZFRhc2tzLmxlbmd0aH0pYFxyXG5cdFx0Ly8gKTtcclxuXHJcblx0XHRpZiAobW9yZVRhc2tzRXhpc3QpIHtcclxuXHRcdFx0dGhpcy5hZGRMb2FkTWFya2VyKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFkZExvYWRNYXJrZXIoKSB7XHJcblx0XHRjb25zdCBsb2FkTWFya2VyID0gdGhpcy50YXNrTGlzdEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ0YXNrLWxvYWQtbWFya2VyXCIsXHJcblx0XHRcdGF0dHI6IHsgXCJkYXRhLXRhc2staWRcIjogXCJsb2FkLW1hcmtlclwiIH0sIC8vIFVzZSBkYXRhIGF0dHJpYnV0ZSBmb3IgaWRlbnRpZmljYXRpb25cclxuXHRcdH0pO1xyXG5cdFx0bG9hZE1hcmtlci5zZXRUZXh0KHQoXCJMb2FkaW5nIG1vcmUuLi5cIikpO1xyXG5cdFx0Ly8gY29uc29sZS5sb2coXCJBZGRpbmcgbG9hZCBtYXJrZXIgYW5kIG9ic2VydmluZy5cIik7XHJcblx0XHR0aGlzLnRhc2tMaXN0T2JzZXJ2ZXIub2JzZXJ2ZShsb2FkTWFya2VyKTsgLy8gT2JzZXJ2ZSB0aGUgbWFya2VyXHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbW92ZUxvYWRNYXJrZXIoKSB7XHJcblx0XHRjb25zdCBvbGRNYXJrZXIgPSB0aGlzLnRhc2tMaXN0RWwucXVlcnlTZWxlY3RvcihcIi50YXNrLWxvYWQtbWFya2VyXCIpO1xyXG5cdFx0aWYgKG9sZE1hcmtlcikge1xyXG5cdFx0XHR0aGlzLnRhc2tMaXN0T2JzZXJ2ZXIudW5vYnNlcnZlKG9sZE1hcmtlcik7IC8vIFN0b3Agb2JzZXJ2aW5nIGJlZm9yZSByZW1vdmluZ1xyXG5cdFx0XHRvbGRNYXJrZXIucmVtb3ZlKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGxvYWRNb3JlVGFza3MoKSB7XHJcblx0XHQvLyBjb25zb2xlLmxvZyhcIkxvYWQgbW9yZSB0YXNrcyB0cmlnZ2VyZWQuLi5cIik7XHJcblx0XHR0aGlzLnJlbW92ZUxvYWRNYXJrZXIoKTsgLy8gUmVtb3ZlIHRoZSBjdXJyZW50IG1hcmtlclxyXG5cclxuXHRcdGlmICh0aGlzLmlzVHJlZVZpZXcpIHtcclxuXHRcdFx0aWYgKHRoaXMubmV4dFJvb3RUYXNrSW5kZXggPCB0aGlzLnJvb3RUYXNrcy5sZW5ndGgpIHtcclxuXHRcdFx0XHQvLyBjb25zb2xlLmxvZyhcclxuXHRcdFx0XHQvLyBcdGBMb2FkaW5nIG1vcmUgVFJFRSB0YXNrcyBmcm9tIGluZGV4ICR7dGhpcy5uZXh0Um9vdFRhc2tJbmRleH1gXHJcblx0XHRcdFx0Ly8gKTtcclxuXHRcdFx0XHRjb25zdCB0YXNrTWFwID0gbmV3IE1hcDxzdHJpbmcsIFRhc2s+KCk7XHJcblx0XHRcdFx0dGhpcy5maWx0ZXJlZFRhc2tzLmZvckVhY2goKHRhc2spID0+XHJcblx0XHRcdFx0XHR0YXNrTWFwLnNldCh0YXNrLmlkLCB0YXNrKSxcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHRoaXMubG9hZFJvb3RUYXNrQmF0Y2godGFza01hcCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gY29uc29sZS5sb2coXCJObyBtb3JlIFRSRUUgdGFza3MgdG8gbG9hZC5cIik7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGlmICh0aGlzLm5leHRUYXNrSW5kZXggPCB0aGlzLmZpbHRlcmVkVGFza3MubGVuZ3RoKSB7XHJcblx0XHRcdFx0Ly8gY29uc29sZS5sb2coXHJcblx0XHRcdFx0Ly8gXHRgTG9hZGluZyBtb3JlIExJU1QgdGFza3MgZnJvbSBpbmRleCAke3RoaXMubmV4dFRhc2tJbmRleH1gXHJcblx0XHRcdFx0Ly8gKTtcclxuXHRcdFx0XHR0aGlzLmxvYWRUYXNrQmF0Y2goKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBjb25zb2xlLmxvZyhcIk5vIG1vcmUgTElTVCB0YXNrcyB0byBsb2FkLlwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFkZCB0aGUgbWFya2VyIGJhY2sgaWYgdGhlcmUgYXJlIHN0aWxsIG1vcmUgdGFza3MgYWZ0ZXIgbG9hZGluZyB0aGUgYmF0Y2hcclxuXHRcdHRoaXMuY2hlY2tBbmRBZGRMb2FkTWFya2VyKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFkZEVtcHR5U3RhdGUobWVzc2FnZTogc3RyaW5nKSB7XHJcblx0XHR0aGlzLmNsZWFudXBDb21wb25lbnRzKCk7IC8vIEVuc3VyZSBsaXN0IGlzIGNsZWFuXHJcblx0XHRjb25zdCBlbXB0eUVsID0gdGhpcy50YXNrTGlzdEVsLmNyZWF0ZURpdih7IGNsczogXCJ0YXNrLWVtcHR5LXN0YXRlXCIgfSk7XHJcblx0XHRlbXB0eUVsLnNldFRleHQobWVzc2FnZSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHNlbGVjdFRhc2sodGFzazogVGFzayB8IG51bGwpIHtcclxuXHRcdGlmICh0aGlzLnNlbGVjdGVkVGFzaz8uaWQgPT09IHRhc2s/LmlkICYmIHRhc2sgIT09IG51bGwpIHtcclxuXHRcdFx0Ly8gSWYgY2xpY2tpbmcgdGhlIGFscmVhZHkgc2VsZWN0ZWQgdGFzaywgZGVzZWxlY3QgaXQgKG9yIHRvZ2dsZSBkZXRhaWxzIC0gaGFuZGxlZCBieSBUYXNrVmlldylcclxuXHRcdFx0Ly8gdGhpcy5zZWxlY3RlZFRhc2sgPSBudWxsO1xyXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhcIlRhc2sgZGVzZWxlY3RlZCAoaW4gQ29udGVudENvbXBvbmVudCk6XCIsIHRhc2s/LmlkKTtcclxuXHRcdFx0Ly8gLy8gVXBkYXRlIHZpc3VhbCBzdGF0ZSBvZiB0aGUgaXRlbSBpZiBuZWVkZWQgKHJlbW92ZSBoaWdobGlnaHQpXHJcblx0XHRcdC8vIGNvbnN0IGl0ZW1FbCA9IHRoaXMudGFza0xpc3RFbC5xdWVyeVNlbGVjdG9yKGBbZGF0YS10YXNrLXJvdy1pZD1cIiR7dGFzay5pZH1cIl1gKTtcclxuXHRcdFx0Ly8gaXRlbUVsPy5yZW1vdmVDbGFzcygnaXMtc2VsZWN0ZWQnKTsgLy8gRXhhbXBsZSBjbGFzc1xyXG5cdFx0XHQvLyBpZih0aGlzLm9uVGFza1NlbGVjdGVkKSB0aGlzLm9uVGFza1NlbGVjdGVkKG51bGwpOyAvLyBOb3RpZnkgcGFyZW50XHJcblx0XHRcdC8vIHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBEZXNlbGVjdCBwcmV2aW91cyB0YXNrIHZpc3VhbGx5IGlmIG5lZWRlZFxyXG5cdFx0aWYgKHRoaXMuc2VsZWN0ZWRUYXNrKSB7XHJcblx0XHRcdC8vIGNvbnN0IHByZXZJdGVtRWwgPSB0aGlzLnRhc2tMaXN0RWwucXVlcnlTZWxlY3RvcihgW2RhdGEtdGFzay1yb3ctaWQ9XCIke3RoaXMuc2VsZWN0ZWRUYXNrLmlkfVwiXWApO1xyXG5cdFx0XHQvLyBwcmV2SXRlbUVsPy5yZW1vdmVDbGFzcygnaXMtc2VsZWN0ZWQnKTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnNlbGVjdGVkVGFzayA9IHRhc2s7XHJcblx0XHQvLyBjb25zb2xlLmxvZyhcIlRhc2sgc2VsZWN0ZWQgKGluIENvbnRlbnRDb21wb25lbnQpOlwiLCB0YXNrPy5pZCk7XHJcblxyXG5cdFx0Ly8gU2VsZWN0IG5ldyB0YXNrIHZpc3VhbGx5IGlmIG5lZWRlZFxyXG5cdFx0aWYgKHRhc2spIHtcclxuXHRcdFx0Ly8gY29uc3QgbmV3SXRlbUVsID0gdGhpcy50YXNrTGlzdEVsLnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLXRhc2stcm93LWlkPVwiJHt0YXNrLmlkfVwiXWApO1xyXG5cdFx0XHQvLyBuZXdJdGVtRWw/LmFkZENsYXNzKCdpcy1zZWxlY3RlZCcpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0aGlzLnBhcmFtcy5vblRhc2tTZWxlY3RlZCkge1xyXG5cdFx0XHR0aGlzLnBhcmFtcy5vblRhc2tTZWxlY3RlZCh0YXNrKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHB1YmxpYyB1cGRhdGVUYXNrKHVwZGF0ZWRUYXNrOiBUYXNrKSB7XHJcblx0XHQvLyAxKSBVcGRhdGUgc291cmNlc1xyXG5cdFx0Y29uc3QgdGFza0luZGV4QWxsID0gdGhpcy5hbGxUYXNrcy5maW5kSW5kZXgoXHJcblx0XHRcdCh0KSA9PiB0LmlkID09PSB1cGRhdGVkVGFzay5pZCxcclxuXHRcdCk7XHJcblx0XHRpZiAodGFza0luZGV4QWxsICE9PSAtMSlcclxuXHRcdFx0dGhpcy5hbGxUYXNrc1t0YXNrSW5kZXhBbGxdID0geyAuLi51cGRhdGVkVGFzayB9O1xyXG5cdFx0Y29uc3QgdGFza0luZGV4Tm90RmlsdGVyZWQgPSB0aGlzLm5vdEZpbHRlcmVkVGFza3MuZmluZEluZGV4KFxyXG5cdFx0XHQodCkgPT4gdC5pZCA9PT0gdXBkYXRlZFRhc2suaWQsXHJcblx0XHQpO1xyXG5cdFx0aWYgKHRhc2tJbmRleE5vdEZpbHRlcmVkICE9PSAtMSlcclxuXHRcdFx0dGhpcy5ub3RGaWx0ZXJlZFRhc2tzW3Rhc2tJbmRleE5vdEZpbHRlcmVkXSA9IHsgLi4udXBkYXRlZFRhc2sgfTtcclxuXHRcdGlmICh0aGlzLnNlbGVjdGVkVGFzayAmJiB0aGlzLnNlbGVjdGVkVGFzay5pZCA9PT0gdXBkYXRlZFRhc2suaWQpXHJcblx0XHRcdHRoaXMuc2VsZWN0ZWRUYXNrID0geyAuLi51cGRhdGVkVGFzayB9O1xyXG5cclxuXHRcdC8vIDIpIFJlLWFwcGx5IGZpbHRlcnMgYW5kIGRldGVjdCB2aXNpYmlsaXR5IGNoYW5nZVxyXG5cdFx0Y29uc3QgcHJldkxlbiA9IHRoaXMuZmlsdGVyZWRUYXNrcy5sZW5ndGg7XHJcblx0XHR0aGlzLmFwcGx5RmlsdGVycygpO1xyXG5cdFx0Y29uc3QgdGFza0Zyb21GaWx0ZXJlZCA9IHRoaXMuZmlsdGVyZWRUYXNrcy5maW5kKFxyXG5cdFx0XHQodCkgPT4gdC5pZCA9PT0gdXBkYXRlZFRhc2suaWQsXHJcblx0XHQpO1xyXG5cdFx0Y29uc3QgdGFza1N0aWxsVmlzaWJsZSA9ICEhdGFza0Zyb21GaWx0ZXJlZDtcclxuXHJcblx0XHQvLyBIZWxwZXI6IGluc2VydCBsaXN0IGl0ZW0gYXQgY29ycmVjdCBwb3NpdGlvbiAobGlzdCB2aWV3KVxyXG5cdFx0Y29uc3QgaW5zZXJ0TGlzdEl0ZW0gPSAodGFza1RvSW5zZXJ0OiBUYXNrKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbXBJZHMgPSBuZXcgU2V0KFxyXG5cdFx0XHRcdHRoaXMudGFza0NvbXBvbmVudHMubWFwKChjKSA9PiBjLmdldFRhc2soKS5pZCksXHJcblx0XHRcdCk7XHJcblx0XHRcdGNvbnN0IHNvcnRlZEluZGV4ID0gdGhpcy5maWx0ZXJlZFRhc2tzLmZpbmRJbmRleChcclxuXHRcdFx0XHQodCkgPT4gdC5pZCA9PT0gdGFza1RvSW5zZXJ0LmlkLFxyXG5cdFx0XHQpO1xyXG5cdFx0XHQvLyBGaW5kIHRoZSBuZXh0IHJlbmRlcmVkIG5laWdoYm9yIGFmdGVyIHNvcnRlZEluZGV4XHJcblx0XHRcdGxldCBuZXh0Q29tcDogYW55ID0gbnVsbDtcclxuXHRcdFx0Zm9yIChsZXQgaSA9IHNvcnRlZEluZGV4ICsgMTsgaSA8IHRoaXMuZmlsdGVyZWRUYXNrcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdGNvbnN0IGlkID0gdGhpcy5maWx0ZXJlZFRhc2tzW2ldLmlkO1xyXG5cdFx0XHRcdGlmIChjb21wSWRzLmhhcyhpZCkpIHtcclxuXHRcdFx0XHRcdG5leHRDb21wID0gdGhpcy50YXNrQ29tcG9uZW50cy5maW5kKFxyXG5cdFx0XHRcdFx0XHQoYykgPT4gYy5nZXRUYXNrKCkuaWQgPT09IGlkLFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHQvLyBDcmVhdGUgY29tcG9uZW50XHJcblx0XHRcdGNvbnN0IHRhc2tDb21wb25lbnQgPSBuZXcgVGFza0xpc3RJdGVtQ29tcG9uZW50KFxyXG5cdFx0XHRcdHRhc2tUb0luc2VydCxcclxuXHRcdFx0XHR0aGlzLmN1cnJlbnRWaWV3SWQsXHJcblx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdCk7XHJcblx0XHRcdC8vIEF0dGFjaCBldmVudHNcclxuXHRcdFx0dGFza0NvbXBvbmVudC5vblRhc2tTZWxlY3RlZCA9IHRoaXMuc2VsZWN0VGFzay5iaW5kKHRoaXMpO1xyXG5cdFx0XHR0YXNrQ29tcG9uZW50Lm9uVGFza0NvbXBsZXRlZCA9ICh0KSA9PiB7XHJcblx0XHRcdFx0dGhpcy5wYXJhbXMub25UYXNrQ29tcGxldGVkPy4odCk7XHJcblx0XHRcdH07XHJcblx0XHRcdHRhc2tDb21wb25lbnQub25UYXNrVXBkYXRlID0gYXN5bmMgKG9yaWcsIHVwZCkgPT4ge1xyXG5cdFx0XHRcdGlmICh0aGlzLnBhcmFtcy5vblRhc2tVcGRhdGUpXHJcblx0XHRcdFx0XHRhd2FpdCB0aGlzLnBhcmFtcy5vblRhc2tVcGRhdGUob3JpZywgdXBkKTtcclxuXHRcdFx0fTtcclxuXHRcdFx0dGFza0NvbXBvbmVudC5vblRhc2tDb250ZXh0TWVudSA9IChlLCB0KSA9PiB7XHJcblx0XHRcdFx0dGhpcy5wYXJhbXMub25UYXNrQ29udGV4dE1lbnU/LihlLCB0KTtcclxuXHRcdFx0fTtcclxuXHRcdFx0dGhpcy5hZGRDaGlsZCh0YXNrQ29tcG9uZW50KTtcclxuXHRcdFx0dGFza0NvbXBvbmVudC5sb2FkKCk7XHJcblx0XHRcdC8vIEluc2VydCBET01cclxuXHRcdFx0aWYgKG5leHRDb21wKSB7XHJcblx0XHRcdFx0dGhpcy50YXNrTGlzdEVsLmluc2VydEJlZm9yZShcclxuXHRcdFx0XHRcdHRhc2tDb21wb25lbnQuZWxlbWVudCxcclxuXHRcdFx0XHRcdG5leHRDb21wLmVsZW1lbnQsXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRjb25zdCBpZHggPSB0aGlzLnRhc2tDb21wb25lbnRzLmluZGV4T2YobmV4dENvbXApO1xyXG5cdFx0XHRcdHRoaXMudGFza0NvbXBvbmVudHMuc3BsaWNlKGlkeCwgMCwgdGFza0NvbXBvbmVudCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGhpcy50YXNrTGlzdEVsLmFwcGVuZENoaWxkKHRhc2tDb21wb25lbnQuZWxlbWVudCk7XHJcblx0XHRcdFx0dGhpcy50YXNrQ29tcG9uZW50cy5wdXNoKHRhc2tDb21wb25lbnQpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIEhlbHBlcjogcmVtb3ZlIGxpc3QgaXRlbVxyXG5cdFx0Y29uc3QgcmVtb3ZlTGlzdEl0ZW0gPSAodGFza0lkOiBzdHJpbmcpID0+IHtcclxuXHRcdFx0Y29uc3QgaWR4ID0gdGhpcy50YXNrQ29tcG9uZW50cy5maW5kSW5kZXgoXHJcblx0XHRcdFx0KGMpID0+IGMuZ2V0VGFzaygpLmlkID09PSB0YXNrSWQsXHJcblx0XHRcdCk7XHJcblx0XHRcdGlmIChpZHggPj0gMCkge1xyXG5cdFx0XHRcdGNvbnN0IGNvbXAgPSB0aGlzLnRhc2tDb21wb25lbnRzW2lkeF07XHJcblx0XHRcdFx0dGhpcy5yZW1vdmVDaGlsZChjb21wKTtcclxuXHRcdFx0XHRjb21wLmVsZW1lbnQucmVtb3ZlKCk7XHJcblx0XHRcdFx0dGhpcy50YXNrQ29tcG9uZW50cy5zcGxpY2UoaWR4LCAxKTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBIZWxwZXI6IHNvcnQgY29tcGFyYXRvciBmb3Igcm9vdHMgKGZpbGVQYXRoIC0+IGxpbmUpXHJcblx0XHRjb25zdCByb290Q29tcGFyYXRvciA9IChhOiBUYXNrLCBiOiBUYXNrKSA9PiB7XHJcblx0XHRcdGNvbnN0IGZwID0gKGEuZmlsZVBhdGggfHwgXCJcIikubG9jYWxlQ29tcGFyZShiLmZpbGVQYXRoIHx8IFwiXCIpO1xyXG5cdFx0XHRpZiAoZnAgIT09IDApIHJldHVybiBmcDtcclxuXHRcdFx0cmV0dXJuIChhLmxpbmUgPz8gMCkgLSAoYi5saW5lID8/IDApO1xyXG5cdFx0fTtcclxuXHJcblx0XHRpZiAodGFza1N0aWxsVmlzaWJsZSkge1xyXG5cdFx0XHRpZiAoIXRoaXMuaXNUcmVlVmlldykge1xyXG5cdFx0XHRcdC8vIExpc3QgdmlldzogdXBkYXRlIGluIHBsYWNlIG9yIGluc2VydCBpZiBuZXcgdG8gdmlld1xyXG5cdFx0XHRcdGNvbnN0IGNvbXAgPSB0aGlzLnRhc2tDb21wb25lbnRzLmZpbmQoXHJcblx0XHRcdFx0XHQoYykgPT4gYy5nZXRUYXNrKCkuaWQgPT09IHVwZGF0ZWRUYXNrLmlkLFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0aWYgKGNvbXApIHtcclxuXHRcdFx0XHRcdGNvbXAudXBkYXRlVGFzayh0YXNrRnJvbUZpbHRlcmVkISk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGluc2VydExpc3RJdGVtKHRhc2tGcm9tRmlsdGVyZWQhKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gVHJlZSB2aWV3OiB1cGRhdGUgZXhpc3Rpbmcgc3VidHJlZSBvciBpbnNlcnQgdG8gcGFyZW50L3Jvb3RcclxuXHRcdFx0XHRjb25zdCBjb21wID0gdGhpcy50cmVlQ29tcG9uZW50cy5maW5kKFxyXG5cdFx0XHRcdFx0KGMpID0+IGMuZ2V0VGFzaygpLmlkID09PSB1cGRhdGVkVGFzay5pZCxcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGlmIChjb21wKSB7XHJcblx0XHRcdFx0XHRjb21wLnVwZGF0ZVRhc2sodGFza0Zyb21GaWx0ZXJlZCEpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHQvLyBOb3QgYSByb290IGNvbXA7IHRyeSB1cGRhdGUgd2l0aGluIGNoaWxkcmVuXHJcblx0XHRcdFx0XHRsZXQgdXBkYXRlZCA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0Zm9yIChjb25zdCByb290Q29tcCBvZiB0aGlzLnRyZWVDb21wb25lbnRzKSB7XHJcblx0XHRcdFx0XHRcdGlmIChyb290Q29tcC51cGRhdGVUYXNrUmVjdXJzaXZlbHkodGFza0Zyb21GaWx0ZXJlZCEpKSB7XHJcblx0XHRcdFx0XHRcdFx0dXBkYXRlZCA9IHRydWU7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGlmICghdXBkYXRlZCkge1xyXG5cdFx0XHRcdFx0XHQvLyBJbnNlcnQgbmV3IHZpc2libGUgdGFza1xyXG5cdFx0XHRcdFx0XHRjb25zdCBwYXJlbnRJZCA9IHRhc2tGcm9tRmlsdGVyZWQhLm1ldGFkYXRhLnBhcmVudDtcclxuXHRcdFx0XHRcdFx0aWYgKHBhcmVudElkKSB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gRmluZCBwYXJlbnQgY29tcCBhbmQgcmVidWlsZCBpdHMgY2hpbGRyZW4gbGlzdCBpbmNyZW1lbnRhbGx5XHJcblx0XHRcdFx0XHRcdFx0Zm9yIChjb25zdCByb290Q29tcCBvZiB0aGlzLnRyZWVDb21wb25lbnRzKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBwYXJlbnRDb21wID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0cm9vdENvbXAuZmluZENvbXBvbmVudEJ5VGFza0lkKHBhcmVudElkKTtcclxuXHRcdFx0XHRcdFx0XHRcdGlmIChwYXJlbnRDb21wKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IG5ld0NoaWxkcmVuID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0aGlzLm5vdEZpbHRlcmVkVGFza3MuZmlsdGVyKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0KHQpID0+XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHQubWV0YWRhdGEucGFyZW50ID09PSBwYXJlbnRJZCxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRwYXJlbnRDb21wLnVwZGF0ZUNoaWxkVGFza3MobmV3Q2hpbGRyZW4pO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR1cGRhdGVkID0gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdC8vIFJvb3QgaW5zZXJ0aW9uXHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgdGFza01hcCA9IG5ldyBNYXA8c3RyaW5nLCBUYXNrPigpO1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMubm90RmlsdGVyZWRUYXNrcy5mb3JFYWNoKCh0KSA9PlxyXG5cdFx0XHRcdFx0XHRcdFx0dGFza01hcC5zZXQodC5pZCwgdCksXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBjaGlsZFRhc2tzID0gdGhpcy5ub3RGaWx0ZXJlZFRhc2tzLmZpbHRlcihcclxuXHRcdFx0XHRcdFx0XHRcdCh0KSA9PlxyXG5cdFx0XHRcdFx0XHRcdFx0XHR0Lm1ldGFkYXRhLnBhcmVudCA9PT0gdGFza0Zyb21GaWx0ZXJlZCEuaWQsXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBuZXdSb290ID0gbmV3IFRhc2tUcmVlSXRlbUNvbXBvbmVudChcclxuXHRcdFx0XHRcdFx0XHRcdHRhc2tGcm9tRmlsdGVyZWQhLFxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5jdXJyZW50Vmlld0lkLFxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0XHRcdFx0XHQwLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2hpbGRUYXNrcyxcclxuXHRcdFx0XHRcdFx0XHRcdHRhc2tNYXAsXHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdG5ld1Jvb3Qub25UYXNrU2VsZWN0ZWQgPSB0aGlzLnNlbGVjdFRhc2suYmluZCh0aGlzKTtcclxuXHRcdFx0XHRcdFx0XHRuZXdSb290Lm9uVGFza0NvbXBsZXRlZCA9ICh0KSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnBhcmFtcy5vblRhc2tDb21wbGV0ZWQ/Lih0KTtcclxuXHRcdFx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0XHRcdG5ld1Jvb3Qub25UYXNrVXBkYXRlID0gYXN5bmMgKG9yaWcsIHVwZCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKHRoaXMucGFyYW1zLm9uVGFza1VwZGF0ZSlcclxuXHRcdFx0XHRcdFx0XHRcdFx0YXdhaXQgdGhpcy5wYXJhbXMub25UYXNrVXBkYXRlKG9yaWcsIHVwZCk7XHJcblx0XHRcdFx0XHRcdFx0fTtcclxuXHRcdFx0XHRcdFx0XHRuZXdSb290Lm9uVGFza0NvbnRleHRNZW51ID0gKGUsIHQpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMucGFyYW1zLm9uVGFza0NvbnRleHRNZW51Py4oZSwgdCk7XHJcblx0XHRcdFx0XHRcdFx0fTtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmFkZENoaWxkKG5ld1Jvb3QpO1xyXG5cdFx0XHRcdFx0XHRcdG5ld1Jvb3QubG9hZCgpO1xyXG5cdFx0XHRcdFx0XHRcdC8vIERldGVybWluZSBpbnNlcnQgaW5kZXggYW1vbmcgZXhpc3Rpbmcgcm9vdHNcclxuXHRcdFx0XHRcdFx0XHRsZXQgaW5zZXJ0QXQgPSB0aGlzLnRyZWVDb21wb25lbnRzLmxlbmd0aDtcclxuXHRcdFx0XHRcdFx0XHRmb3IgKFxyXG5cdFx0XHRcdFx0XHRcdFx0bGV0IGkgPSAwO1xyXG5cdFx0XHRcdFx0XHRcdFx0aSA8IHRoaXMudHJlZUNvbXBvbmVudHMubGVuZ3RoO1xyXG5cdFx0XHRcdFx0XHRcdFx0aSsrXHJcblx0XHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0XHRcdHJvb3RDb21wYXJhdG9yKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRhc2tGcm9tRmlsdGVyZWQhLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMudHJlZUNvbXBvbmVudHNbaV0uZ2V0VGFzaygpLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHQpIDwgMFxyXG5cdFx0XHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGluc2VydEF0ID0gaTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdGlmIChpbnNlcnRBdCA8IHRoaXMudHJlZUNvbXBvbmVudHMubGVuZ3RoKSB7XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnRhc2tMaXN0RWwuaW5zZXJ0QmVmb3JlKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRuZXdSb290LmVsZW1lbnQsXHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMudHJlZUNvbXBvbmVudHNbaW5zZXJ0QXRdLmVsZW1lbnQsXHJcblx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy50cmVlQ29tcG9uZW50cy5zcGxpY2UoXHJcblx0XHRcdFx0XHRcdFx0XHRcdGluc2VydEF0LFxyXG5cdFx0XHRcdFx0XHRcdFx0XHQwLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRuZXdSb290LFxyXG5cdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy50YXNrTGlzdEVsLmFwcGVuZENoaWxkKG5ld1Jvb3QuZWxlbWVudCk7XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnRyZWVDb21wb25lbnRzLnB1c2gobmV3Um9vdCk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBUYXNrIGJlY2FtZSBub3QgdmlzaWJsZVxyXG5cdFx0XHRpZiAoIXRoaXMuaXNUcmVlVmlldykge1xyXG5cdFx0XHRcdHJlbW92ZUxpc3RJdGVtKHVwZGF0ZWRUYXNrLmlkKTtcclxuXHRcdFx0XHQvLyBPcHRpb25hbDogYmFja2ZpbGwgb25lIG1vcmUgaXRlbSBpZiBhdmFpbGFibGVcclxuXHRcdFx0XHRpZiAodGhpcy5uZXh0VGFza0luZGV4IDwgdGhpcy5maWx0ZXJlZFRhc2tzLmxlbmd0aCkge1xyXG5cdFx0XHRcdFx0dGhpcy5sb2FkVGFza0JhdGNoKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIFRyZWUgdmlldyByZW1vdmFsXHJcblx0XHRcdFx0Ly8gSWYgcm9vdCBjb21wb25lbnQgZXhpc3RzLCByZW1vdmUgaXRcclxuXHRcdFx0XHRjb25zdCBpZHggPSB0aGlzLnRyZWVDb21wb25lbnRzLmZpbmRJbmRleChcclxuXHRcdFx0XHRcdChjKSA9PiBjLmdldFRhc2soKS5pZCA9PT0gdXBkYXRlZFRhc2suaWQsXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRpZiAoaWR4ID49IDApIHtcclxuXHRcdFx0XHRcdGNvbnN0IGNvbXAgPSB0aGlzLnRyZWVDb21wb25lbnRzW2lkeF07XHJcblx0XHRcdFx0XHR0aGlzLnJlbW92ZUNoaWxkKGNvbXApO1xyXG5cdFx0XHRcdFx0Y29tcC5lbGVtZW50LnJlbW92ZSgpO1xyXG5cdFx0XHRcdFx0dGhpcy50cmVlQ29tcG9uZW50cy5zcGxpY2UoaWR4LCAxKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0Ly8gT3RoZXJ3aXNlIHJlbW92ZSBmcm9tIGl0cyBwYXJlbnQncyBzdWJ0cmVlXHJcblx0XHRcdFx0XHRmb3IgKGNvbnN0IHJvb3RDb21wIG9mIHRoaXMudHJlZUNvbXBvbmVudHMpIHtcclxuXHRcdFx0XHRcdFx0aWYgKHJvb3RDb21wLnJlbW92ZUNoaWxkQnlUYXNrSWQodXBkYXRlZFRhc2suaWQpKSBicmVhaztcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyAzKSBVcGRhdGUgY291bnQgZGlzcGxheSAobm8gZnVsbCByZWZyZXNoIHBhdGgpXHJcblx0XHRpZiAodGhpcy5maWx0ZXJlZFRhc2tzLmxlbmd0aCAhPT0gcHJldkxlbikge1xyXG5cdFx0XHR0aGlzLmNvdW50RWwuc2V0VGV4dChgJHt0aGlzLmZpbHRlcmVkVGFza3MubGVuZ3RofSAke3QoXCJ0YXNrc1wiKX1gKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHB1YmxpYyBnZXRTZWxlY3RlZFRhc2soKTogVGFzayB8IG51bGwge1xyXG5cdFx0cmV0dXJuIHRoaXMuc2VsZWN0ZWRUYXNrO1xyXG5cdH1cclxuXHJcblx0b251bmxvYWQoKSB7XHJcblx0XHR0aGlzLmNsZWFudXBDb21wb25lbnRzKCk7IC8vIFVzZSB0aGUgY2xlYW51cCBtZXRob2RcclxuXHRcdHRoaXMuY29udGFpbmVyRWwuZW1wdHkoKTsgLy8gRXh0cmEgc2FmZXR5XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLnJlbW92ZSgpO1xyXG5cdH1cclxufVxyXG4iXX0=