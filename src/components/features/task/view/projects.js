import { __awaiter } from "tslib";
import { Component, setIcon, ExtraButtonComponent, Platform, } from "obsidian";
import { t } from "@/translations/helper";
import "@/styles/project-view.css";
import "@/styles/project-tree.css";
import { TaskListRendererComponent } from "./TaskList";
import { sortTasks } from "@/commands/sortTaskCommands";
import { getEffectiveProject } from "@/utils/task/task-operations";
import { createPopper } from "@popperjs/core";
import { getInitialViewMode, saveViewMode } from "@/utils/ui/view-mode-utils";
import { ProjectTreeComponent } from "./ProjectTreeComponent";
import { buildProjectTree } from "@/core/project-tree-builder";
import { filterTasksByProjectPaths } from "@/core/project-filter";
import { formatProgressText, } from "@/editor-extensions/ui-widgets/progress-bar-widget";
export class ProjectsComponent extends Component {
    constructor(parentEl, app, plugin, params = {}) {
        super();
        this.parentEl = parentEl;
        this.app = app;
        this.plugin = plugin;
        this.params = params;
        this.projectPropsBtnEl = null;
        this.projectPropsPopoverEl = null;
        this.projectPropsPopper = null;
        // State
        this.allTasks = [];
        this.filteredTasks = [];
        this.selectedProjects = {
            projects: [],
            tasks: [],
            isMultiSelect: false,
        };
        this.allProjectsMap = new Map();
        this.isTreeView = false;
        this.allTasksMap = new Map();
        this.isProjectTreeView = false;
        this.currentInfoProject = null;
        this.infoRenderGen = 0;
    }
    onload() {
        // Create main container
        this.containerEl = this.parentEl.createDiv({
            cls: "projects-container",
        });
        // Create content container for columns
        const contentContainer = this.containerEl.createDiv({
            cls: "projects-content",
        });
        // Left column: create projects list
        this.createLeftColumn(contentContainer);
        // Right column: create task list for selected projects
        this.createRightColumn(contentContainer);
        // Initialize view mode from saved state or global default
        this.initializeViewMode();
        // Load project tree view preference from localStorage
        const savedTreeView = localStorage.getItem("task-genius-project-tree-view");
        this.isProjectTreeView = savedTreeView === "true";
        // Initialize the task renderer
        this.taskRenderer = new TaskListRendererComponent(this, this.taskListContainerEl, this.plugin, this.app, "projects");
        // Connect event handlers
        this.taskRenderer.onTaskSelected = (task) => {
            if (this.params.onTaskSelected)
                this.params.onTaskSelected(task);
        };
        this.taskRenderer.onTaskCompleted = (task) => {
            if (this.params.onTaskCompleted)
                this.params.onTaskCompleted(task);
        };
        this.taskRenderer.onTaskUpdate = (originalTask, updatedTask) => __awaiter(this, void 0, void 0, function* () {
            if (this.params.onTaskUpdate) {
                yield this.params.onTaskUpdate(originalTask, updatedTask);
            }
        });
        this.taskRenderer.onTaskContextMenu = (event, task) => {
            if (this.params.onTaskContextMenu)
                this.params.onTaskContextMenu(event, task);
        };
    }
    createProjectsHeader() {
        this.projectsHeaderEl = this.containerEl.createDiv({
            cls: "projects-header",
        });
        // Title and project count
        const titleContainer = this.projectsHeaderEl.createDiv({
            cls: "projects-title-container",
        });
        this.titleEl = titleContainer.createDiv({
            cls: "projects-title",
            text: t("Projects"),
        });
        this.countEl = titleContainer.createDiv({
            cls: "projects-count",
        });
        this.countEl.setText(`0 ${t("projects")}`);
    }
    createLeftColumn(parentEl) {
        this.leftColumnEl = parentEl.createDiv({
            cls: "projects-left-column",
        });
        // Add close button for mobile
        // Header for the projects section
        const headerEl = this.leftColumnEl.createDiv({
            cls: "projects-sidebar-header",
        });
        const headerTitle = headerEl.createDiv({
            cls: "projects-sidebar-title",
            text: t("Projects"),
        });
        const headerButtons = headerEl.createDiv({
            cls: "projects-sidebar-header-btn-group",
        });
        // Add view toggle button for tree/list
        const treeToggleBtn = headerButtons.createDiv({
            cls: "projects-tree-toggle-btn",
        });
        setIcon(treeToggleBtn, this.isProjectTreeView ? "git-branch" : "list");
        treeToggleBtn.setAttribute("aria-label", t("Toggle tree/list view"));
        this.registerDomEvent(treeToggleBtn, "click", () => {
            this.toggleProjectTreeView();
        });
        // Add multi-select toggle button
        const multiSelectBtn = headerButtons.createDiv({
            cls: "projects-multi-select-btn",
        });
        setIcon(multiSelectBtn, "list-plus");
        multiSelectBtn.setAttribute("aria-label", t("Toggle multi-select"));
        if (Platform.isPhone) {
            const closeBtn = headerEl.createDiv({
                cls: "projects-sidebar-close",
            });
            new ExtraButtonComponent(closeBtn).setIcon("x").onClick(() => {
                this.toggleLeftColumnVisibility(false);
            });
        }
        this.registerDomEvent(multiSelectBtn, "click", () => {
            this.toggleMultiSelect();
        });
        // Projects list container
        this.projectsListEl = this.leftColumnEl.createDiv({
            cls: "projects-sidebar-list",
        });
    }
    createRightColumn(parentEl) {
        this.taskContainerEl = parentEl.createDiv({
            cls: "projects-right-column",
        });
        // Task list header
        const taskHeaderEl = this.taskContainerEl.createDiv({
            cls: "projects-task-header",
        });
        // Add sidebar toggle button for mobile
        if (Platform.isPhone) {
            taskHeaderEl.createEl("div", {
                cls: "projects-sidebar-toggle",
            }, (el) => {
                new ExtraButtonComponent(el)
                    .setIcon("sidebar")
                    .onClick(() => {
                    this.toggleLeftColumnVisibility();
                });
            });
        }
        // Header main content container
        const headerMainContent = taskHeaderEl.createDiv({
            cls: "projects-header-main-content",
        });
        // First row: title and actions
        const headerTopRow = headerMainContent.createDiv({
            cls: "projects-header-top-row",
        });
        const taskTitleEl = headerTopRow
            .createDiv({ cls: "projects-header-top-left" })
            .createDiv({
            cls: "projects-task-title",
        });
        taskTitleEl.setText(t("Tasks"));
        const headerTopRightRow = headerTopRow.createDiv({
            cls: "projects-header-top-right",
        });
        this.headerTopRightRowEl = headerTopRightRow;
        const taskCountEl = headerTopRightRow.createDiv({
            cls: "projects-task-count",
        });
        taskCountEl.setText(`0 ${t("tasks")}`);
        // Add view toggle button
        const viewToggleBtn = headerTopRightRow.createDiv({
            cls: "view-toggle-btn",
        });
        setIcon(viewToggleBtn, "list");
        viewToggleBtn.setAttribute("aria-label", t("Toggle list/tree view"));
        this.registerDomEvent(viewToggleBtn, "click", () => {
            this.toggleViewMode();
        });
        // Task list container
        this.taskListContainerEl = this.taskContainerEl.createDiv({
            cls: "projects-task-list",
        });
        // Initialize tgProject props button state
        this.updateTgProjectPropsButton(null);
    }
    setTasks(tasks) {
        this.allTasks = tasks;
        this.allTasksMap = new Map(this.allTasks.map((task) => [task.id, task]));
        this.buildProjectsIndex();
        this.renderProjectsList();
        // If projects were already selected, update the tasks
        if (this.selectedProjects.projects.length > 0) {
            this.updateSelectedTasks();
        }
        else {
            this.taskRenderer.renderTasks([], this.isTreeView, this.allTasksMap, t("Select a project to see related tasks"));
            this.updateTaskListHeader(t("Tasks"), `0 ${t("tasks")}`);
        }
    }
    buildProjectsIndex() {
        var _a;
        // Clear existing index
        this.allProjectsMap.clear();
        // Build a map of projects to task IDs
        this.allTasks.forEach((task) => {
            var _a;
            const effectiveProject = getEffectiveProject(task);
            if (effectiveProject) {
                if (!this.allProjectsMap.has(effectiveProject)) {
                    this.allProjectsMap.set(effectiveProject, new Set());
                }
                (_a = this.allProjectsMap.get(effectiveProject)) === null || _a === void 0 ? void 0 : _a.add(task.id);
            }
        });
        // Build project tree if in tree view
        if (this.isProjectTreeView) {
            const separator = this.plugin.settings.projectPathSeparator || "/";
            this.projectTree = buildProjectTree(this.allProjectsMap, separator);
        }
        // Update projects count
        (_a = this.countEl) === null || _a === void 0 ? void 0 : _a.setText(`${this.allProjectsMap.size} projects`);
    }
    renderProjectsList() {
        // Clear existing list
        this.projectsListEl.empty();
        if (this.isProjectTreeView && this.projectTree) {
            // Render as tree
            if (this.projectTreeComponent) {
                this.projectTreeComponent.unload();
            }
            this.projectTreeComponent = new ProjectTreeComponent(this.projectsListEl, this.app, this.plugin);
            // Set up event handlers
            this.projectTreeComponent.onNodeSelected = (selectedNodes, tasks) => {
                this.selectedProjects.projects = Array.from(selectedNodes);
                this.updateSelectedTasks();
                const single = this.selectedProjects.projects.length === 1
                    ? this.selectedProjects.projects[0]
                    : null;
                this.updateTgProjectPropsButton(single);
            };
            this.projectTreeComponent.onMultiSelectToggled = (isMultiSelect) => {
                this.selectedProjects.isMultiSelect = isMultiSelect;
                if (!isMultiSelect &&
                    this.selectedProjects.projects.length === 0) {
                    this.taskRenderer.renderTasks([], this.isTreeView, this.allTasksMap, t("Select a project to see related tasks"));
                    this.updateTaskListHeader(t("Tasks"), `0 ${t("tasks")}`);
                }
            };
            this.projectTreeComponent.load();
            // Set the tree that was already built
            if (this.projectTree) {
                this.projectTreeComponent.setTree(this.projectTree, this.allTasks);
            }
        }
        else {
            // Render as flat list
            if (this.projectTreeComponent) {
                this.projectTreeComponent.unload();
                this.projectTreeComponent = undefined;
            }
            // Sort projects alphabetically
            const sortedProjects = Array.from(this.allProjectsMap.keys()).sort();
            // Render each project
            sortedProjects.forEach((project) => {
                // Get tasks for this project
                const projectTaskIds = this.allProjectsMap.get(project);
                const taskCount = (projectTaskIds === null || projectTaskIds === void 0 ? void 0 : projectTaskIds.size) || 0;
                // Calculate completed tasks for this project
                let completedCount = 0;
                if (projectTaskIds) {
                    projectTaskIds.forEach((taskId) => {
                        const task = this.allTasksMap.get(taskId);
                        if (task && this.getTaskStatus(task) === "completed") {
                            completedCount++;
                        }
                    });
                }
                // Create project item
                const projectItem = this.projectsListEl.createDiv({
                    cls: "project-list-item",
                });
                // Project icon
                const projectIconEl = projectItem.createDiv({
                    cls: "project-icon",
                });
                setIcon(projectIconEl, "folder");
                // Project name
                const projectNameEl = projectItem.createDiv({
                    cls: "project-name",
                });
                projectNameEl.setText(project);
                // Task count badge with progress
                const countEl = projectItem.createDiv({
                    cls: "project-count",
                });
                // Show completed/total format
                if (this.plugin.settings.addProgressBarToProjectsView &&
                    taskCount > 0) {
                    countEl.setText(`${completedCount}/${taskCount}`);
                    // Add data attributes for styling
                    countEl.dataset.completed = completedCount.toString();
                    countEl.dataset.total = taskCount.toString();
                    countEl.toggleClass("has-progress", true);
                    // Add completion class for visual feedback
                    if (completedCount === taskCount) {
                        countEl.classList.add("all-completed");
                    }
                    else if (completedCount > 0) {
                        countEl.classList.add("partially-completed");
                    }
                }
                else {
                    countEl.setText(taskCount.toString());
                }
                // Store project name as data attribute
                projectItem.dataset.project = project;
                // Check if this project is already selected
                if (this.selectedProjects.projects.includes(project)) {
                    projectItem.classList.add("selected");
                }
                // Add click handler
                this.registerDomEvent(projectItem, "click", (e) => {
                    this.handleProjectSelection(project, e.ctrlKey || e.metaKey);
                });
            });
            // Add empty state if no projects
            if (sortedProjects.length === 0) {
                const emptyEl = this.projectsListEl.createDiv({
                    cls: "projects-empty-state",
                });
                emptyEl.setText(t("No projects found"));
            }
        }
    }
    handleProjectSelection(project, isCtrlPressed) {
        if (this.selectedProjects.isMultiSelect || isCtrlPressed) {
            // Multi-select mode
            const index = this.selectedProjects.projects.indexOf(project);
            if (index === -1) {
                // Add to selection
                this.selectedProjects.projects.push(project);
            }
            else {
                // Remove from selection
                this.selectedProjects.projects.splice(index, 1);
            }
            // If no projects selected and not in multi-select mode, reset
            if (this.selectedProjects.projects.length === 0 &&
                !this.selectedProjects.isMultiSelect) {
                this.taskRenderer.renderTasks([], this.isTreeView, this.allTasksMap, t("Select a project to see related tasks"));
                this.updateTaskListHeader(t("Tasks"), `0 ${t("tasks")}`);
                return;
            }
        }
        else {
            // Single-select mode
            this.selectedProjects.projects = [project];
        }
        // Update UI to show which projects are selected
        const projectItems = this.projectsListEl.querySelectorAll(".project-list-item");
        projectItems.forEach((item) => {
            const itemProject = item.getAttribute("data-project");
            if (itemProject &&
                this.selectedProjects.projects.includes(itemProject)) {
                item.classList.add("selected");
            }
            else {
                item.classList.remove("selected");
            }
        });
        // Update tasks based on selected projects
        this.updateSelectedTasks();
    }
    toggleMultiSelect() {
        this.selectedProjects.isMultiSelect =
            !this.selectedProjects.isMultiSelect;
        // Update UI to reflect multi-select mode
        if (this.selectedProjects.isMultiSelect) {
            this.containerEl.classList.add("multi-select-mode");
        }
        else {
            this.containerEl.classList.remove("multi-select-mode");
            // If no projects are selected, reset the view
            if (this.selectedProjects.projects.length === 0) {
                this.taskRenderer.renderTasks([], this.isTreeView, this.allTasksMap, t("Select a project to see related tasks"));
                this.updateTaskListHeader(t("Tasks"), `0 ${t("tasks")}`);
                this.updateTgProjectPropsButton(null);
            }
        }
        // Update tree component if it exists
        if (this.projectTreeComponent) {
            this.projectTreeComponent.setMultiSelectMode(this.selectedProjects.isMultiSelect);
        }
    }
    /**
     * Initialize view mode from saved state or global default
     */
    initializeViewMode() {
        var _a;
        this.isTreeView = getInitialViewMode(this.app, this.plugin, "projects");
        // Update the toggle button icon to match the initial state
        const viewToggleBtn = (_a = this.taskContainerEl) === null || _a === void 0 ? void 0 : _a.querySelector(".view-toggle-btn");
        if (viewToggleBtn) {
            setIcon(viewToggleBtn, this.isTreeView ? "git-branch" : "list");
        }
    }
    toggleViewMode() {
        this.isTreeView = !this.isTreeView;
        // Update toggle button icon
        const viewToggleBtn = this.taskContainerEl.querySelector(".view-toggle-btn");
        if (viewToggleBtn) {
            setIcon(viewToggleBtn, this.isTreeView ? "git-branch" : "list");
        }
        // Save the new view mode state
        saveViewMode(this.app, "projects", this.isTreeView);
        // Update tasks display using the renderer
        this.renderTaskList();
    }
    updateSelectedTasks() {
        if (this.selectedProjects.projects.length === 0) {
            this.taskRenderer.renderTasks([], this.isTreeView, this.allTasksMap, t("Select a project to see related tasks"));
            this.updateTaskListHeader(t("Tasks"), `0 ${t("tasks")}`);
            return;
        }
        // Use the project filter utility for inclusive filtering in tree view
        if (this.isProjectTreeView) {
            this.filteredTasks = filterTasksByProjectPaths(this.allTasks, this.selectedProjects.projects, this.plugin.settings.projectPathSeparator || "/");
        }
        else {
            // Get tasks from all selected projects (OR logic)
            const resultTaskIds = new Set();
            // Union all task sets from selected projects
            this.selectedProjects.projects.forEach((project) => {
                const taskIds = this.allProjectsMap.get(project);
                if (taskIds) {
                    taskIds.forEach((id) => resultTaskIds.add(id));
                }
            });
            // Convert task IDs to actual task objects
            this.filteredTasks = this.allTasks.filter((task) => resultTaskIds.has(task.id));
        }
        const viewConfig = this.plugin.settings.viewConfiguration.find((view) => view.id === "projects");
        if ((viewConfig === null || viewConfig === void 0 ? void 0 : viewConfig.sortCriteria) && viewConfig.sortCriteria.length > 0) {
            this.filteredTasks = sortTasks(this.filteredTasks, viewConfig.sortCriteria, this.plugin.settings);
        }
        else {
            // Sort tasks by priority and due date
            // Sort tasks by priority and due date
            this.filteredTasks.sort((a, b) => {
                // First by completion status
                if (a.completed !== b.completed) {
                    return a.completed ? 1 : -1;
                }
                // Then by priority (high to low)
                const priorityA = a.metadata.priority || 0;
                const priorityB = b.metadata.priority || 0;
                if (priorityA !== priorityB) {
                    return priorityB - priorityA;
                }
                // Then by due date (early to late)
                const dueDateA = a.metadata.dueDate || Number.MAX_SAFE_INTEGER;
                const dueDateB = b.metadata.dueDate || Number.MAX_SAFE_INTEGER;
                return dueDateA - dueDateB;
            });
        }
        // Update the task list using the renderer
        this.renderTaskList();
    }
    updateTaskListHeader(title, countText) {
        const taskHeaderEl = this.taskContainerEl.querySelector(".projects-task-title");
        if (taskHeaderEl) {
            taskHeaderEl.textContent = title;
        }
        const taskCountEl = this.taskContainerEl.querySelector(".projects-task-count");
        if (taskCountEl) {
            taskCountEl.textContent = countText;
        }
        // Update progress bar if enabled and projects are selected
        this.updateProgressBar();
    }
    updateProgressBar() {
        // Check if progress bar should be shown
        if (!this.plugin.settings.addProgressBarToProjectsView ||
            this.plugin.settings.progressBarDisplayMode === "none" ||
            this.filteredTasks.length === 0) {
            // Hide progress bar container if it exists
            const progressContainer = this.taskContainerEl.querySelector(".projects-header-progress");
            if (progressContainer) {
                progressContainer.remove();
            }
            return;
        }
        // Calculate progress data
        const progressData = this.calculateProgressData();
        // Get or create progress container
        let progressContainer = this.taskContainerEl.querySelector(".projects-header-progress");
        if (!progressContainer) {
            const headerMainContent = this.taskContainerEl.querySelector(".projects-header-main-content");
            if (headerMainContent) {
                progressContainer = headerMainContent.createDiv({
                    cls: "projects-header-progress",
                });
            }
        }
        else {
            // Clear existing content
            progressContainer.empty();
        }
        if (!progressContainer)
            return;
        const displayMode = this.plugin.settings.progressBarDisplayMode;
        // Render graphical progress bar using existing progress bar styles
        if (displayMode === "graphical" || displayMode === "both") {
            // Create progress bar with same structure as existing widgets
            const progressBarEl = progressContainer.createSpan({
                cls: "cm-task-progress-bar projects-progress",
            });
            const progressBackGroundEl = progressBarEl.createDiv({
                cls: "progress-bar-inline-background",
            });
            // Calculate percentages
            const completedPercentage = Math.round((progressData.completed / progressData.total) * 10000) / 100;
            const inProgressPercentage = progressData.inProgress
                ? Math.round((progressData.inProgress / progressData.total) * 10000) / 100
                : 0;
            const abandonedPercentage = progressData.abandoned
                ? Math.round((progressData.abandoned / progressData.total) * 10000) / 100
                : 0;
            const plannedPercentage = progressData.planned
                ? Math.round((progressData.planned / progressData.total) * 10000) / 100
                : 0;
            // Create progress segments
            const progressEl = progressBackGroundEl.createDiv({
                cls: "progress-bar-inline progress-completed",
            });
            progressEl.style.width = completedPercentage + "%";
            // Add additional status bars if needed
            if (progressData.inProgress && progressData.inProgress > 0) {
                const inProgressEl = progressBackGroundEl.createDiv({
                    cls: "progress-bar-inline progress-in-progress",
                });
                inProgressEl.style.width = inProgressPercentage + "%";
                inProgressEl.style.left = completedPercentage + "%";
            }
            if (progressData.abandoned && progressData.abandoned > 0) {
                const abandonedEl = progressBackGroundEl.createDiv({
                    cls: "progress-bar-inline progress-abandoned",
                });
                abandonedEl.style.width = abandonedPercentage + "%";
                abandonedEl.style.left =
                    completedPercentage + inProgressPercentage + "%";
            }
            if (progressData.planned && progressData.planned > 0) {
                const plannedEl = progressBackGroundEl.createDiv({
                    cls: "progress-bar-inline progress-planned",
                });
                plannedEl.style.width = plannedPercentage + "%";
                plannedEl.style.left =
                    completedPercentage +
                        inProgressPercentage +
                        abandonedPercentage +
                        "%";
            }
            // Apply progress level class
            let progressClass = "progress-bar-inline";
            switch (true) {
                case completedPercentage === 0:
                    progressClass += " progress-bar-inline-empty";
                    break;
                case completedPercentage > 0 && completedPercentage < 25:
                    progressClass += " progress-bar-inline-0";
                    break;
                case completedPercentage >= 25 && completedPercentage < 50:
                    progressClass += " progress-bar-inline-1";
                    break;
                case completedPercentage >= 50 && completedPercentage < 75:
                    progressClass += " progress-bar-inline-2";
                    break;
                case completedPercentage >= 75 && completedPercentage < 100:
                    progressClass += " progress-bar-inline-3";
                    break;
                case completedPercentage >= 100:
                    progressClass += " progress-bar-inline-complete";
                    break;
            }
            progressEl.className = progressClass;
        }
        // Render text progress
        if (displayMode === "text" || displayMode === "both") {
            const progressText = formatProgressText(progressData, this.plugin);
            if (progressText) {
                // If we're in text-only mode, create a simple text container
                // If we're in "both" mode, the text was already added to the progress bar
                if (displayMode === "text") {
                    const textEl = progressContainer.createDiv({
                        cls: "progress-status projects-progress-text",
                    });
                    textEl.setText(progressText);
                }
                else if (displayMode === "both") {
                    // Add text to the existing progress bar container
                    const progressBarEl = progressContainer.querySelector(".cm-task-progress-bar");
                    if (progressBarEl) {
                        const textEl = progressBarEl.createDiv({
                            cls: "progress-status",
                        });
                        textEl.setText(progressText);
                    }
                }
            }
        }
    }
    calculateProgressData() {
        const data = {
            completed: 0,
            total: this.filteredTasks.length,
            inProgress: 0,
            abandoned: 0,
            notStarted: 0,
            planned: 0,
        };
        this.filteredTasks.forEach((task) => {
            const status = this.getTaskStatus(task);
            switch (status) {
                case "completed":
                    data.completed++;
                    break;
                case "inProgress":
                    data.inProgress = (data.inProgress || 0) + 1;
                    break;
                case "abandoned":
                    data.abandoned = (data.abandoned || 0) + 1;
                    break;
                case "planned":
                    data.planned = (data.planned || 0) + 1;
                    break;
                case "notStarted":
                default:
                    data.notStarted = (data.notStarted || 0) + 1;
                    break;
            }
        });
        return data;
    }
    /**
     * Get the task status based on plugin settings
     * Follows the same logic as progress-bar-widget.ts
     */
    getTaskStatus(task) {
        var _a, _b, _c, _d;
        // If task is marked as completed in the task object
        if (task.completed) {
            return "completed";
        }
        const mark = task.status;
        if (!mark) {
            return "notStarted";
        }
        // Priority 1: If useOnlyCountMarks is enabled
        if ((_a = this.plugin) === null || _a === void 0 ? void 0 : _a.settings.useOnlyCountMarks) {
            const onlyCountMarks = ((_c = (_b = this.plugin) === null || _b === void 0 ? void 0 : _b.settings.onlyCountTaskMarks) === null || _c === void 0 ? void 0 : _c.split("|")) || [];
            if (onlyCountMarks.includes(mark)) {
                return "completed";
            }
            else {
                // If using onlyCountMarks and the mark is not in the list,
                // determine which other status it belongs to
                return this.determineNonCompletedStatus(mark);
            }
        }
        // Priority 2: If the mark is in excludeTaskMarks
        if (((_d = this.plugin) === null || _d === void 0 ? void 0 : _d.settings.excludeTaskMarks) &&
            this.plugin.settings.excludeTaskMarks.includes(mark)) {
            // Excluded marks are considered not started
            return "notStarted";
        }
        // Priority 3: Check against specific task statuses
        return this.determineTaskStatus(mark);
    }
    /**
     * Helper to determine the non-completed status of a task mark
     */
    determineNonCompletedStatus(mark) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const inProgressMarks = ((_c = (_b = (_a = this.plugin) === null || _a === void 0 ? void 0 : _a.settings.taskStatuses) === null || _b === void 0 ? void 0 : _b.inProgress) === null || _c === void 0 ? void 0 : _c.split("|")) || [
            "/",
            "-",
        ];
        if (inProgressMarks.includes(mark)) {
            return "inProgress";
        }
        const abandonedMarks = ((_f = (_e = (_d = this.plugin) === null || _d === void 0 ? void 0 : _d.settings.taskStatuses) === null || _e === void 0 ? void 0 : _e.abandoned) === null || _f === void 0 ? void 0 : _f.split("|")) || [">"];
        if (abandonedMarks.includes(mark)) {
            return "abandoned";
        }
        const plannedMarks = ((_j = (_h = (_g = this.plugin) === null || _g === void 0 ? void 0 : _g.settings.taskStatuses) === null || _h === void 0 ? void 0 : _h.planned) === null || _j === void 0 ? void 0 : _j.split("|")) || ["?"];
        if (plannedMarks.includes(mark)) {
            return "planned";
        }
        // If the mark doesn't match any specific category, use the countOtherStatusesAs setting
        return (((_k = this.plugin) === null || _k === void 0 ? void 0 : _k.settings.countOtherStatusesAs) || "notStarted");
    }
    /**
     * Helper to determine the specific task status
     */
    determineTaskStatus(mark) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
        const completedMarks = ((_c = (_b = (_a = this.plugin) === null || _a === void 0 ? void 0 : _a.settings.taskStatuses) === null || _b === void 0 ? void 0 : _b.completed) === null || _c === void 0 ? void 0 : _c.split("|")) || [
            "x",
            "X",
        ];
        if (completedMarks.includes(mark)) {
            return "completed";
        }
        const inProgressMarks = ((_f = (_e = (_d = this.plugin) === null || _d === void 0 ? void 0 : _d.settings.taskStatuses) === null || _e === void 0 ? void 0 : _e.inProgress) === null || _f === void 0 ? void 0 : _f.split("|")) || [
            "/",
            "-",
        ];
        if (inProgressMarks.includes(mark)) {
            return "inProgress";
        }
        const abandonedMarks = ((_j = (_h = (_g = this.plugin) === null || _g === void 0 ? void 0 : _g.settings.taskStatuses) === null || _h === void 0 ? void 0 : _h.abandoned) === null || _j === void 0 ? void 0 : _j.split("|")) || [">"];
        if (abandonedMarks.includes(mark)) {
            return "abandoned";
        }
        const plannedMarks = ((_m = (_l = (_k = this.plugin) === null || _k === void 0 ? void 0 : _k.settings.taskStatuses) === null || _l === void 0 ? void 0 : _l.planned) === null || _m === void 0 ? void 0 : _m.split("|")) || ["?"];
        if (plannedMarks.includes(mark)) {
            return "planned";
        }
        // If not matching any specific status, check if it's a not-started mark
        const notStartedMarks = ((_q = (_p = (_o = this.plugin) === null || _o === void 0 ? void 0 : _o.settings.taskStatuses) === null || _p === void 0 ? void 0 : _p.notStarted) === null || _q === void 0 ? void 0 : _q.split("|")) || [" "];
        if (notStartedMarks.includes(mark)) {
            return "notStarted";
        }
        // If we get here, the mark doesn't match any of our defined categories
        // Use the countOtherStatusesAs setting to determine how to count it
        return (((_r = this.plugin) === null || _r === void 0 ? void 0 : _r.settings.countOtherStatusesAs) || "notStarted");
    }
    renderTaskList() {
        // Update the header
        let title = t("Tasks");
        if (this.selectedProjects.projects.length === 1) {
            title = this.selectedProjects.projects[0];
        }
        else if (this.selectedProjects.projects.length > 1) {
            title = `${this.selectedProjects.projects.length} ${t("projects selected")}`;
        }
        const countText = `${this.filteredTasks.length} ${t("tasks")}`;
        this.updateTaskListHeader(title, countText);
        // Use the renderer to display tasks or empty state
        this.taskRenderer.renderTasks(this.filteredTasks, this.isTreeView, this.allTasksMap, t("No tasks in the selected projects"));
    }
    updateTask(updatedTask) {
        // Update in our main tasks list
        const taskIndex = this.allTasks.findIndex((t) => t.id === updatedTask.id);
        let needsFullRefresh = false;
        if (taskIndex !== -1) {
            const oldTask = this.allTasks[taskIndex];
            // Check if project assignment changed, which affects the sidebar/filtering
            if (oldTask.metadata.project !== updatedTask.metadata.project) {
                needsFullRefresh = true;
            }
            this.allTasks[taskIndex] = updatedTask;
        }
        else {
            // Task is potentially new, add it and refresh
            this.allTasks.push(updatedTask);
            needsFullRefresh = true;
        }
        // If project changed or task is new, rebuild index and fully refresh UI
        if (needsFullRefresh) {
            this.buildProjectsIndex();
            this.renderProjectsList(); // Update left sidebar
            this.updateSelectedTasks(); // Recalculate filtered tasks and re-render right panel
        }
        else {
            // Otherwise, just update the task in the filtered list and the renderer
            const filteredIndex = this.filteredTasks.findIndex((t) => t.id === updatedTask.id);
            if (filteredIndex !== -1) {
                this.filteredTasks[filteredIndex] = updatedTask;
                // Ask the renderer to update the specific component
                this.taskRenderer.updateTask(updatedTask);
                // Optional: Re-sort if sorting criteria changed, then re-render
                // this.renderTaskList();
            }
            else {
                // Task might have become visible due to the update, requires re-filtering
                this.updateSelectedTasks();
            }
        }
    }
    toggleProjectTreeView() {
        this.isProjectTreeView = !this.isProjectTreeView;
        // Update button icon
        const treeToggleBtn = this.leftColumnEl.querySelector(".projects-tree-toggle-btn");
        if (treeToggleBtn) {
            setIcon(treeToggleBtn, this.isProjectTreeView ? "git-branch" : "list");
        }
        // Save preference to localStorage for now
        localStorage.setItem("task-genius-project-tree-view", this.isProjectTreeView.toString());
        // Rebuild project index and re-render
        this.buildProjectsIndex();
        this.renderProjectsList();
        // Update tasks and tgProject info button based on current selection
        if (this.selectedProjects.projects.length > 0) {
            this.updateSelectedTasks();
        }
        const single = this.selectedProjects.projects.length === 1
            ? this.selectedProjects.projects[0]
            : null;
        this.updateTgProjectPropsButton(single);
    }
    /** Create or update the tgProject info button in the right header */
    updateTgProjectPropsButton(selectedProject) {
        var _a;
        if (!this.headerTopRightRowEl)
            return;
        // No selection: remove button and popover
        if (!selectedProject) {
            if (this.projectPropsBtnEl) {
                this.projectPropsBtnEl.remove();
                this.projectPropsBtnEl = null;
            }
            this.teardownProjectPropsUI();
            return;
        }
        // Show info button only when there exists a task with a real tgProject AND
        // (no metadata.project) OR (metadata.project equals tgProject.name).
        {
            const separator = this.plugin.settings.projectPathSeparator || "/";
            const hasInfo = this.allTasks.some((task) => {
                var _a, _b;
                const p = getEffectiveProject(task);
                const match = p === selectedProject ||
                    (p && p.startsWith(selectedProject + separator));
                if (!match)
                    return false;
                const tg = (_a = task.metadata) === null || _a === void 0 ? void 0 : _a.tgProject;
                if (!tg || typeof tg !== "object")
                    return false;
                const mp = (_b = task.metadata) === null || _b === void 0 ? void 0 : _b.project;
                return (mp === undefined ||
                    mp === null ||
                    mp === "" ||
                    mp === tg.name);
            });
            if (!hasInfo) {
                if (this.projectPropsBtnEl) {
                    this.projectPropsBtnEl.remove();
                    this.projectPropsBtnEl = null;
                }
                this.teardownProjectPropsUI();
                return;
            }
        }
        // Ensure button exists
        if (!this.projectPropsBtnEl) {
            const btn = this.headerTopRightRowEl.createDiv({
                cls: "projects-props-btn",
                attr: {
                    "aria-label": t("Show project info") || "Project info",
                },
            });
            setIcon(btn, "info");
            this.projectPropsBtnEl = btn;
            this.registerDomEvent(btn, "click", (e) => __awaiter(this, void 0, void 0, function* () {
                var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
                e.stopPropagation();
                if (this.projectPropsPopoverEl) {
                    this.teardownProjectPropsUI();
                    return;
                }
                // Create popover using createEl from document.body
                this.projectPropsPopoverEl = document.body.createEl("div", {
                    cls: "tg-project-popover",
                    attr: {
                        style: "background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 8px; padding: 8px 10px; box-shadow: var(--shadow-s); max-width: 420px; z-index: 9999;"
                    }
                });
                const list = this.projectPropsPopoverEl.createDiv({
                    cls: "tg-project-props"
                });
                this.projectPropsPopper = createPopper(btn, this.projectPropsPopoverEl, {
                    placement: "bottom-end",
                    modifiers: [
                        { name: "offset", options: { offset: [0, 8] } },
                    ],
                });
                // Render-token to prevent stale async updates
                const gen = ++this.infoRenderGen;
                // Close on outside click or ESC
                this.registerDomEvent(this.projectPropsPopoverEl, "mousedown", (ev) => ev.stopPropagation());
                this.outsideClickHandler = (ev) => {
                    const target = ev.target;
                    if (!this.projectPropsPopoverEl)
                        return;
                    if (this.projectPropsPopoverEl.contains(target))
                        return;
                    if (this.projectPropsBtnEl &&
                        this.projectPropsBtnEl.contains(target))
                        return;
                    this.teardownProjectPropsUI();
                };
                this.registerDomEvent(document, "mousedown", this.outsideClickHandler, { capture: true });
                this.escKeyHandler = (ev) => {
                    if (ev.key === "Escape") {
                        this.teardownProjectPropsUI();
                    }
                };
                this.registerDomEvent(document, "keydown", this.escKeyHandler);
                // Resolve representative task and tgProject using current selection
                const currentSelected = this.selectedProjects.projects.length === 1
                    ? this.selectedProjects.projects[0]
                    : null;
                if (!currentSelected) {
                    list.textContent =
                        t("No project selected") || "No project selected";
                    return;
                }
                this.currentInfoProject = currentSelected;
                // Gather tasks in this project group
                const separator = this.plugin.settings.projectPathSeparator || "/";
                const tasksInProject = this.allTasks.filter((task) => {
                    const p = getEffectiveProject(task);
                    return (p === currentSelected ||
                        (p && p.startsWith(currentSelected + separator)));
                });
                const candidates = tasksInProject.filter((t) => {
                    var _a, _b;
                    const tg = (_a = t.metadata) === null || _a === void 0 ? void 0 : _a.tgProject;
                    if (!tg || typeof tg !== "object")
                        return false;
                    const mp = (_b = t.metadata) === null || _b === void 0 ? void 0 : _b.project;
                    return (mp === undefined ||
                        mp === null ||
                        mp === "" ||
                        mp === tg.name);
                });
                const taskPrefMatch = candidates.find((t) => {
                    var _a, _b;
                    const mp = (_a = t.metadata) === null || _a === void 0 ? void 0 : _a.project;
                    const tg = (_b = t.metadata) === null || _b === void 0 ? void 0 : _b.tgProject;
                    return mp && tg && mp === tg.name;
                });
                const taskForResolve = taskPrefMatch || candidates[0];
                if (!taskForResolve) {
                    list.textContent =
                        t("No task found in selection") || "No task found";
                    return;
                }
                list.textContent = t("Loading...") || "Loading...";
                let enhanced = {};
                let configSourcePath;
                try {
                    const resolver = (_b = this.plugin.dataflowOrchestrator) === null || _b === void 0 ? void 0 : _b.projectResolver;
                    if (resolver === null || resolver === void 0 ? void 0 : resolver.get) {
                        const pdata = yield resolver.get(taskForResolve.filePath);
                        enhanced = (pdata === null || pdata === void 0 ? void 0 : pdata.enhancedMetadata) || {};
                        configSourcePath = pdata === null || pdata === void 0 ? void 0 : pdata.configSource;
                    }
                    else {
                        const repo = (_c = this.plugin.dataflowOrchestrator) === null || _c === void 0 ? void 0 : _c.getRepository();
                        const storage = (_d = repo === null || repo === void 0 ? void 0 : repo.getStorage) === null || _d === void 0 ? void 0 : _d.call(repo);
                        const rec = storage
                            ? yield storage.loadProject(taskForResolve.filePath)
                            : null;
                        enhanced = ((_e = rec === null || rec === void 0 ? void 0 : rec.data) === null || _e === void 0 ? void 0 : _e.enhancedMetadata) || {};
                        configSourcePath = (_f = rec === null || rec === void 0 ? void 0 : rec.data) === null || _f === void 0 ? void 0 : _f.configSource;
                    }
                }
                catch (err) {
                    console.warn("[Projects] Failed to load project metadata:", err);
                }
                // Stale-guard: if a newer render started, abort
                if (gen !== this.infoRenderGen) {
                    return;
                }
                // Choose tg strictly from the selected candidate (must exist by button rule)
                const tg = ((_g = taskForResolve === null || taskForResolve === void 0 ? void 0 : taskForResolve.metadata) === null || _g === void 0 ? void 0 : _g.tgProject) ||
                    undefined;
                if (!tg) {
                    this.teardownProjectPropsUI();
                    return;
                }
                const entries = [];
                let fmKeys = new Set();
                const projectName = (_k = (_j = (_h = taskForResolve === null || taskForResolve === void 0 ? void 0 : taskForResolve.metadata) === null || _h === void 0 ? void 0 : _h.project) !== null && _j !== void 0 ? _j : tg.name) !== null && _k !== void 0 ? _k : currentSelected;
                entries.push(["project", projectName]);
                entries.push(["type", tg.type]);
                if (tg.source)
                    entries.push(["source", tg.source]);
                if (tg.readonly !== undefined)
                    entries.push(["readonly", tg.readonly]);
                // If tgProject exists (incl. type=config), load its source file frontmatter and display
                if (tg) {
                    if (configSourcePath) {
                        entries.push(["configSource", configSourcePath]);
                    }
                    const metaPath = tg && tg.type === "config" && configSourcePath
                        ? configSourcePath
                        : taskForResolve.filePath;
                    try {
                        const abs = this.app.vault.getAbstractFileByPath(metaPath);
                        if (abs && abs.extension) {
                            const file = abs; // TFile
                            const fm = (_l = this.app.metadataCache.getFileCache(file)) === null || _l === void 0 ? void 0 : _l.frontmatter;
                            if (fm && typeof fm === "object") {
                                // record fm keys for de-duplication
                                fmKeys = new Set(Object.keys(fm).filter((k) => {
                                    const kl = k.toLowerCase();
                                    return (kl !== "position" &&
                                        kl !== "projectname" &&
                                        kl !== "project");
                                }));
                                entries.push(["—", "—"]);
                                entries.push(["sourceFile", metaPath]);
                                for (const [k, v] of Object.entries(fm)) {
                                    if (k === "position")
                                        continue;
                                    const kl = k.toLowerCase();
                                    if (kl === "projectname" ||
                                        kl === "project")
                                        continue;
                                    entries.push([`frontmatter.${k}`, v]);
                                }
                            }
                        }
                    }
                    catch (e) {
                        console.warn("[Projects] Failed to read source frontmatter:", e);
                    }
                }
                // Build details from enhanced first, fallback to task metadata
                const sourceObj = Object.keys(enhanced).length > 0
                    ? enhanced
                    : taskForResolve.metadata || {};
                const blacklist = new Set([
                    "tgProject",
                    "project",
                    "children",
                    "childrenIds",
                    "parent",
                    "parentId",
                    "listMarker",
                    "indentLevel",
                    "actualIndent",
                    "originalMarkdown",
                    "line",
                    "comment",
                    "heading",
                    "_subtaskInheritanceRules",
                    "metadata",
                ]);
                for (const [k, vRaw] of Object.entries(sourceObj)) {
                    if (blacklist.has(k))
                        continue;
                    if (vRaw === undefined || vRaw === null || vRaw === "")
                        continue;
                    // avoid duplicates: if key already comes from frontmatter, skip plain key
                    if (fmKeys && fmKeys.has(k))
                        continue;
                    let v = vRaw;
                    // Format arrays/objects
                    if (Array.isArray(v)) {
                        if (v.length === 0)
                            continue;
                        if (k === "tags" || k === "dependsOn") {
                            v = v.join(", ");
                        }
                        else {
                            // Skip noisy arrays by default
                            continue;
                        }
                    }
                    else if (typeof v === "object") {
                        // Skip nested objects by default to avoid noise
                        continue;
                    }
                    // Format known date-like fields
                    const kl = k.toLowerCase();
                    if ((/date$/i.test(k) || kl.endsWith("date")) &&
                        typeof v !== "string") {
                        const n = Number(v);
                        if (!Number.isNaN(n) && n > 1e10) {
                            try {
                                v = new Date(n).toLocaleString();
                            }
                            catch (_m) { }
                        }
                    }
                    entries.push([k, v]);
                }
                // Render entries
                list.empty();
                entries.forEach(([k, v]) => {
                    const row = list.createDiv({
                        attr: {
                            style: "display:flex; gap:8px; align-items:center; padding:2px 0"
                        }
                    });
                    const keyEl = row.createDiv({
                        attr: {
                            style: "opacity:0.7; min-width:120px;"
                        }
                    });
                    keyEl.setText(String(k));
                    const valEl = row.createDiv();
                    valEl.setText(typeof v === "string" ? v : JSON.stringify(v));
                });
            }));
        }
        // If popover is open and selection changed, refresh content
        if (this.projectPropsPopoverEl && selectedProject) {
            if (this.currentInfoProject !== selectedProject) {
                this.currentInfoProject = selectedProject;
                // Recreate the popover to reflect new selection
                this.teardownProjectPropsUI();
                (_a = this.projectPropsBtnEl) === null || _a === void 0 ? void 0 : _a.click();
            }
        }
    }
    /** Close and cleanup the popover */
    teardownProjectPropsUI() {
        // Clear handler references (events are auto-cleaned by registerDomEvent)
        this.outsideClickHandler = undefined;
        this.escKeyHandler = undefined;
        // Destroy popper and remove popover
        if (this.projectPropsPopper &&
            typeof this.projectPropsPopper.destroy === "function") {
            this.projectPropsPopper.destroy();
        }
        this.projectPropsPopper = null;
        if (this.projectPropsPopoverEl) {
            this.projectPropsPopoverEl.remove();
        }
        this.projectPropsPopoverEl = null;
    }
    onunload() {
        if (this.projectTreeComponent) {
            this.projectTreeComponent.unload();
        }
        this.containerEl.empty();
        this.containerEl.remove();
    }
    // Toggle left column visibility with animation support
    toggleLeftColumnVisibility(visible) {
        if (visible === undefined) {
            // Toggle based on current state
            visible = !this.leftColumnEl.hasClass("is-visible");
        }
        if (visible) {
            this.leftColumnEl.addClass("is-visible");
            this.leftColumnEl.show();
        }
        else {
            this.leftColumnEl.removeClass("is-visible");
            // Wait for animation to complete before hiding
            setTimeout(() => {
                if (!this.leftColumnEl.hasClass("is-visible")) {
                    this.leftColumnEl.hide();
                }
            }, 300); // Match CSS transition duration
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvamVjdHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwcm9qZWN0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUVOLFNBQVMsRUFDVCxPQUFPLEVBQ1Asb0JBQW9CLEVBQ3BCLFFBQVEsR0FDUixNQUFNLFVBQVUsQ0FBQztBQUVsQixPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDMUMsT0FBTywyQkFBMkIsQ0FBQztBQUNuQyxPQUFPLDJCQUEyQixDQUFDO0FBQ25DLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUV2RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDeEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDbkUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxZQUFZLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUM5RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUM5RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUUvRCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNsRSxPQUFPLEVBQ04sa0JBQWtCLEdBRWxCLE1BQU0sb0RBQW9ELENBQUM7QUFRNUQsTUFBTSxPQUFPLGlCQUFrQixTQUFRLFNBQVM7SUF3Qy9DLFlBQ1MsUUFBcUIsRUFDckIsR0FBUSxFQUNSLE1BQTZCLEVBQzdCLFNBS0osRUFBRTtRQUVOLEtBQUssRUFBRSxDQUFDO1FBVkEsYUFBUSxHQUFSLFFBQVEsQ0FBYTtRQUNyQixRQUFHLEdBQUgsR0FBRyxDQUFLO1FBQ1IsV0FBTSxHQUFOLE1BQU0sQ0FBdUI7UUFDN0IsV0FBTSxHQUFOLE1BQU0sQ0FLUjtRQW5DQyxzQkFBaUIsR0FB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QyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDekMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQztTQUN6QjthQUFNO1lBQ04sSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUM7WUFFNUMsK0NBQStDO1lBQy9DLFVBQVUsQ0FBQyxHQUFHLEVBQUU7Z0JBQ2YsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxFQUFFO29CQUM5QyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDO2lCQUN6QjtZQUNGLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLGdDQUFnQztTQUN6QztJQUNGLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XHJcblx0QXBwLFxyXG5cdENvbXBvbmVudCxcclxuXHRzZXRJY29uLFxyXG5cdEV4dHJhQnV0dG9uQ29tcG9uZW50LFxyXG5cdFBsYXRmb3JtLFxyXG59IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBUYXNrLCBUZ1Byb2plY3QgfSBmcm9tIFwiQC90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCBcIkAvc3R5bGVzL3Byb2plY3Qtdmlldy5jc3NcIjtcclxuaW1wb3J0IFwiQC9zdHlsZXMvcHJvamVjdC10cmVlLmNzc1wiO1xyXG5pbXBvcnQgeyBUYXNrTGlzdFJlbmRlcmVyQ29tcG9uZW50IH0gZnJvbSBcIi4vVGFza0xpc3RcIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5pbXBvcnQgeyBzb3J0VGFza3MgfSBmcm9tIFwiQC9jb21tYW5kcy9zb3J0VGFza0NvbW1hbmRzXCI7XHJcbmltcG9ydCB7IGdldEVmZmVjdGl2ZVByb2plY3QgfSBmcm9tIFwiQC91dGlscy90YXNrL3Rhc2stb3BlcmF0aW9uc1wiO1xyXG5pbXBvcnQgeyBjcmVhdGVQb3BwZXIgfSBmcm9tIFwiQHBvcHBlcmpzL2NvcmVcIjtcclxuaW1wb3J0IHsgZ2V0SW5pdGlhbFZpZXdNb2RlLCBzYXZlVmlld01vZGUgfSBmcm9tIFwiQC91dGlscy91aS92aWV3LW1vZGUtdXRpbHNcIjtcclxuaW1wb3J0IHsgUHJvamVjdFRyZWVDb21wb25lbnQgfSBmcm9tIFwiLi9Qcm9qZWN0VHJlZUNvbXBvbmVudFwiO1xyXG5pbXBvcnQgeyBidWlsZFByb2plY3RUcmVlIH0gZnJvbSBcIkAvY29yZS9wcm9qZWN0LXRyZWUtYnVpbGRlclwiO1xyXG5pbXBvcnQgeyBUcmVlTm9kZSwgUHJvamVjdE5vZGVEYXRhIH0gZnJvbSBcIkAvdHlwZXMvdHJlZVwiO1xyXG5pbXBvcnQgeyBmaWx0ZXJUYXNrc0J5UHJvamVjdFBhdGhzIH0gZnJvbSBcIkAvY29yZS9wcm9qZWN0LWZpbHRlclwiO1xyXG5pbXBvcnQge1xyXG5cdGZvcm1hdFByb2dyZXNzVGV4dCxcclxuXHRQcm9ncmVzc0RhdGEsXHJcbn0gZnJvbSBcIkAvZWRpdG9yLWV4dGVuc2lvbnMvdWktd2lkZ2V0cy9wcm9ncmVzcy1iYXItd2lkZ2V0XCI7XHJcblxyXG5pbnRlcmZhY2UgU2VsZWN0ZWRQcm9qZWN0cyB7XHJcblx0cHJvamVjdHM6IHN0cmluZ1tdO1xyXG5cdHRhc2tzOiBUYXNrW107XHJcblx0aXNNdWx0aVNlbGVjdDogYm9vbGVhbjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFByb2plY3RzQ29tcG9uZW50IGV4dGVuZHMgQ29tcG9uZW50IHtcclxuXHQvLyBVSSBFbGVtZW50c1xyXG5cdHB1YmxpYyBjb250YWluZXJFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBwcm9qZWN0c0hlYWRlckVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIHByb2plY3RzTGlzdEVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIHRhc2tDb250YWluZXJFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSB0YXNrTGlzdENvbnRhaW5lckVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIHRpdGxlRWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgY291bnRFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBsZWZ0Q29sdW1uRWw6IEhUTUxFbGVtZW50O1xyXG5cclxuXHQvLyBDaGlsZCBjb21wb25lbnRzXHJcblx0cHJpdmF0ZSB0YXNrUmVuZGVyZXI6IFRhc2tMaXN0UmVuZGVyZXJDb21wb25lbnQ7XHJcblx0cHJpdmF0ZSBoZWFkZXJUb3BSaWdodFJvd0VsPzogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBwcm9qZWN0UHJvcHNCdG5FbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIHByb2plY3RQcm9wc1BvcG92ZXJFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIHByb2plY3RQcm9wc1BvcHBlcjogYW55ID0gbnVsbDtcclxuXHJcblx0cHJpdmF0ZSBvdXRzaWRlQ2xpY2tIYW5kbGVyPzogKGU6IE1vdXNlRXZlbnQpID0+IHZvaWQ7XHJcblx0cHJpdmF0ZSBlc2NLZXlIYW5kbGVyPzogKGU6IEtleWJvYXJkRXZlbnQpID0+IHZvaWQ7XHJcblxyXG5cdC8vIFN0YXRlXHJcblx0cHJpdmF0ZSBhbGxUYXNrczogVGFza1tdID0gW107XHJcblx0cHJpdmF0ZSBmaWx0ZXJlZFRhc2tzOiBUYXNrW10gPSBbXTtcclxuXHRwcml2YXRlIHNlbGVjdGVkUHJvamVjdHM6IFNlbGVjdGVkUHJvamVjdHMgPSB7XHJcblx0XHRwcm9qZWN0czogW10sXHJcblx0XHR0YXNrczogW10sXHJcblx0XHRpc011bHRpU2VsZWN0OiBmYWxzZSxcclxuXHR9O1xyXG5cdHByaXZhdGUgYWxsUHJvamVjdHNNYXA6IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PiA9IG5ldyBNYXAoKTtcclxuXHRwcml2YXRlIGlzVHJlZVZpZXc6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHRwcml2YXRlIGFsbFRhc2tzTWFwOiBNYXA8c3RyaW5nLCBUYXNrPiA9IG5ldyBNYXAoKTtcclxuXHRwcml2YXRlIGlzUHJvamVjdFRyZWVWaWV3OiBib29sZWFuID0gZmFsc2U7XHJcblx0cHJpdmF0ZSBwcm9qZWN0VHJlZUNvbXBvbmVudD86IFByb2plY3RUcmVlQ29tcG9uZW50O1xyXG5cdHByaXZhdGUgcHJvamVjdFRyZWU/OiBUcmVlTm9kZTxQcm9qZWN0Tm9kZURhdGE+O1xyXG5cclxuXHRwcml2YXRlIGN1cnJlbnRJbmZvUHJvamVjdDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XHJcblxyXG5cdHByaXZhdGUgaW5mb1JlbmRlckdlbjogbnVtYmVyID0gMDtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwcml2YXRlIHBhcmVudEVsOiBIVE1MRWxlbWVudCxcclxuXHRcdHByaXZhdGUgYXBwOiBBcHAsXHJcblx0XHRwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0cHJpdmF0ZSBwYXJhbXM6IHtcclxuXHRcdFx0b25UYXNrU2VsZWN0ZWQ/OiAodGFzazogVGFzayB8IG51bGwpID0+IHZvaWQ7XHJcblx0XHRcdG9uVGFza0NvbXBsZXRlZD86ICh0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdFx0XHRvblRhc2tVcGRhdGU/OiAodGFzazogVGFzaywgdXBkYXRlZFRhc2s6IFRhc2spID0+IFByb21pc2U8dm9pZD47XHJcblx0XHRcdG9uVGFza0NvbnRleHRNZW51PzogKGV2ZW50OiBNb3VzZUV2ZW50LCB0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdFx0fSA9IHt9XHJcblx0KSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdH1cclxuXHJcblx0b25sb2FkKCkge1xyXG5cdFx0Ly8gQ3JlYXRlIG1haW4gY29udGFpbmVyXHJcblx0XHR0aGlzLmNvbnRhaW5lckVsID0gdGhpcy5wYXJlbnRFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwicHJvamVjdHMtY29udGFpbmVyXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDcmVhdGUgY29udGVudCBjb250YWluZXIgZm9yIGNvbHVtbnNcclxuXHRcdGNvbnN0IGNvbnRlbnRDb250YWluZXIgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJwcm9qZWN0cy1jb250ZW50XCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBMZWZ0IGNvbHVtbjogY3JlYXRlIHByb2plY3RzIGxpc3RcclxuXHRcdHRoaXMuY3JlYXRlTGVmdENvbHVtbihjb250ZW50Q29udGFpbmVyKTtcclxuXHJcblx0XHQvLyBSaWdodCBjb2x1bW46IGNyZWF0ZSB0YXNrIGxpc3QgZm9yIHNlbGVjdGVkIHByb2plY3RzXHJcblx0XHR0aGlzLmNyZWF0ZVJpZ2h0Q29sdW1uKGNvbnRlbnRDb250YWluZXIpO1xyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgdmlldyBtb2RlIGZyb20gc2F2ZWQgc3RhdGUgb3IgZ2xvYmFsIGRlZmF1bHRcclxuXHRcdHRoaXMuaW5pdGlhbGl6ZVZpZXdNb2RlKCk7XHJcblxyXG5cdFx0Ly8gTG9hZCBwcm9qZWN0IHRyZWUgdmlldyBwcmVmZXJlbmNlIGZyb20gbG9jYWxTdG9yYWdlXHJcblx0XHRjb25zdCBzYXZlZFRyZWVWaWV3ID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oXHJcblx0XHRcdFwidGFzay1nZW5pdXMtcHJvamVjdC10cmVlLXZpZXdcIlxyXG5cdFx0KTtcclxuXHRcdHRoaXMuaXNQcm9qZWN0VHJlZVZpZXcgPSBzYXZlZFRyZWVWaWV3ID09PSBcInRydWVcIjtcclxuXHJcblx0XHQvLyBJbml0aWFsaXplIHRoZSB0YXNrIHJlbmRlcmVyXHJcblx0XHR0aGlzLnRhc2tSZW5kZXJlciA9IG5ldyBUYXNrTGlzdFJlbmRlcmVyQ29tcG9uZW50KFxyXG5cdFx0XHR0aGlzLFxyXG5cdFx0XHR0aGlzLnRhc2tMaXN0Q29udGFpbmVyRWwsXHJcblx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0XCJwcm9qZWN0c1wiXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIENvbm5lY3QgZXZlbnQgaGFuZGxlcnNcclxuXHRcdHRoaXMudGFza1JlbmRlcmVyLm9uVGFza1NlbGVjdGVkID0gKHRhc2spID0+IHtcclxuXHRcdFx0aWYgKHRoaXMucGFyYW1zLm9uVGFza1NlbGVjdGVkKSB0aGlzLnBhcmFtcy5vblRhc2tTZWxlY3RlZCh0YXNrKTtcclxuXHRcdH07XHJcblx0XHR0aGlzLnRhc2tSZW5kZXJlci5vblRhc2tDb21wbGV0ZWQgPSAodGFzaykgPT4ge1xyXG5cdFx0XHRpZiAodGhpcy5wYXJhbXMub25UYXNrQ29tcGxldGVkKSB0aGlzLnBhcmFtcy5vblRhc2tDb21wbGV0ZWQodGFzayk7XHJcblx0XHR9O1xyXG5cdFx0dGhpcy50YXNrUmVuZGVyZXIub25UYXNrVXBkYXRlID0gYXN5bmMgKG9yaWdpbmFsVGFzaywgdXBkYXRlZFRhc2spID0+IHtcclxuXHRcdFx0aWYgKHRoaXMucGFyYW1zLm9uVGFza1VwZGF0ZSkge1xyXG5cdFx0XHRcdGF3YWl0IHRoaXMucGFyYW1zLm9uVGFza1VwZGF0ZShvcmlnaW5hbFRhc2ssIHVwZGF0ZWRUYXNrKTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHRcdHRoaXMudGFza1JlbmRlcmVyLm9uVGFza0NvbnRleHRNZW51ID0gKGV2ZW50LCB0YXNrKSA9PiB7XHJcblx0XHRcdGlmICh0aGlzLnBhcmFtcy5vblRhc2tDb250ZXh0TWVudSlcclxuXHRcdFx0XHR0aGlzLnBhcmFtcy5vblRhc2tDb250ZXh0TWVudShldmVudCwgdGFzayk7XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVQcm9qZWN0c0hlYWRlcigpIHtcclxuXHRcdHRoaXMucHJvamVjdHNIZWFkZXJFbCA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInByb2plY3RzLWhlYWRlclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gVGl0bGUgYW5kIHByb2plY3QgY291bnRcclxuXHRcdGNvbnN0IHRpdGxlQ29udGFpbmVyID0gdGhpcy5wcm9qZWN0c0hlYWRlckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJwcm9qZWN0cy10aXRsZS1jb250YWluZXJcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMudGl0bGVFbCA9IHRpdGxlQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJwcm9qZWN0cy10aXRsZVwiLFxyXG5cdFx0XHR0ZXh0OiB0KFwiUHJvamVjdHNcIiksXHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLmNvdW50RWwgPSB0aXRsZUNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwicHJvamVjdHMtY291bnRcIixcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy5jb3VudEVsLnNldFRleHQoYDAgJHt0KFwicHJvamVjdHNcIil9YCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNyZWF0ZUxlZnRDb2x1bW4ocGFyZW50RWw6IEhUTUxFbGVtZW50KSB7XHJcblx0XHR0aGlzLmxlZnRDb2x1bW5FbCA9IHBhcmVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJwcm9qZWN0cy1sZWZ0LWNvbHVtblwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQWRkIGNsb3NlIGJ1dHRvbiBmb3IgbW9iaWxlXHJcblxyXG5cdFx0Ly8gSGVhZGVyIGZvciB0aGUgcHJvamVjdHMgc2VjdGlvblxyXG5cdFx0Y29uc3QgaGVhZGVyRWwgPSB0aGlzLmxlZnRDb2x1bW5FbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwicHJvamVjdHMtc2lkZWJhci1oZWFkZXJcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IGhlYWRlclRpdGxlID0gaGVhZGVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInByb2plY3RzLXNpZGViYXItdGl0bGVcIixcclxuXHRcdFx0dGV4dDogdChcIlByb2plY3RzXCIpLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgaGVhZGVyQnV0dG9ucyA9IGhlYWRlckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJwcm9qZWN0cy1zaWRlYmFyLWhlYWRlci1idG4tZ3JvdXBcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEFkZCB2aWV3IHRvZ2dsZSBidXR0b24gZm9yIHRyZWUvbGlzdFxyXG5cdFx0Y29uc3QgdHJlZVRvZ2dsZUJ0biA9IGhlYWRlckJ1dHRvbnMuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInByb2plY3RzLXRyZWUtdG9nZ2xlLWJ0blwiLFxyXG5cdFx0fSk7XHJcblx0XHRzZXRJY29uKHRyZWVUb2dnbGVCdG4sIHRoaXMuaXNQcm9qZWN0VHJlZVZpZXcgPyBcImdpdC1icmFuY2hcIiA6IFwibGlzdFwiKTtcclxuXHRcdHRyZWVUb2dnbGVCdG4uc2V0QXR0cmlidXRlKFwiYXJpYS1sYWJlbFwiLCB0KFwiVG9nZ2xlIHRyZWUvbGlzdCB2aWV3XCIpKTtcclxuXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQodHJlZVRvZ2dsZUJ0biwgXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdHRoaXMudG9nZ2xlUHJvamVjdFRyZWVWaWV3KCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBBZGQgbXVsdGktc2VsZWN0IHRvZ2dsZSBidXR0b25cclxuXHRcdGNvbnN0IG11bHRpU2VsZWN0QnRuID0gaGVhZGVyQnV0dG9ucy5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwicHJvamVjdHMtbXVsdGktc2VsZWN0LWJ0blwiLFxyXG5cdFx0fSk7XHJcblx0XHRzZXRJY29uKG11bHRpU2VsZWN0QnRuLCBcImxpc3QtcGx1c1wiKTtcclxuXHRcdG11bHRpU2VsZWN0QnRuLnNldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIiwgdChcIlRvZ2dsZSBtdWx0aS1zZWxlY3RcIikpO1xyXG5cclxuXHRcdGlmIChQbGF0Zm9ybS5pc1Bob25lKSB7XHJcblx0XHRcdGNvbnN0IGNsb3NlQnRuID0gaGVhZGVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwicHJvamVjdHMtc2lkZWJhci1jbG9zZVwiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdG5ldyBFeHRyYUJ1dHRvbkNvbXBvbmVudChjbG9zZUJ0bikuc2V0SWNvbihcInhcIikub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy50b2dnbGVMZWZ0Q29sdW1uVmlzaWJpbGl0eShmYWxzZSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KG11bHRpU2VsZWN0QnRuLCBcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0dGhpcy50b2dnbGVNdWx0aVNlbGVjdCgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gUHJvamVjdHMgbGlzdCBjb250YWluZXJcclxuXHRcdHRoaXMucHJvamVjdHNMaXN0RWwgPSB0aGlzLmxlZnRDb2x1bW5FbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwicHJvamVjdHMtc2lkZWJhci1saXN0XCIsXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY3JlYXRlUmlnaHRDb2x1bW4ocGFyZW50RWw6IEhUTUxFbGVtZW50KSB7XHJcblx0XHR0aGlzLnRhc2tDb250YWluZXJFbCA9IHBhcmVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJwcm9qZWN0cy1yaWdodC1jb2x1bW5cIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFRhc2sgbGlzdCBoZWFkZXJcclxuXHRcdGNvbnN0IHRhc2tIZWFkZXJFbCA9IHRoaXMudGFza0NvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJwcm9qZWN0cy10YXNrLWhlYWRlclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQWRkIHNpZGViYXIgdG9nZ2xlIGJ1dHRvbiBmb3IgbW9iaWxlXHJcblx0XHRpZiAoUGxhdGZvcm0uaXNQaG9uZSkge1xyXG5cdFx0XHR0YXNrSGVhZGVyRWwuY3JlYXRlRWwoXHJcblx0XHRcdFx0XCJkaXZcIixcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRjbHM6IFwicHJvamVjdHMtc2lkZWJhci10b2dnbGVcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdChlbCkgPT4ge1xyXG5cdFx0XHRcdFx0bmV3IEV4dHJhQnV0dG9uQ29tcG9uZW50KGVsKVxyXG5cdFx0XHRcdFx0XHQuc2V0SWNvbihcInNpZGViYXJcIilcclxuXHRcdFx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMudG9nZ2xlTGVmdENvbHVtblZpc2liaWxpdHkoKTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEhlYWRlciBtYWluIGNvbnRlbnQgY29udGFpbmVyXHJcblx0XHRjb25zdCBoZWFkZXJNYWluQ29udGVudCA9IHRhc2tIZWFkZXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwicHJvamVjdHMtaGVhZGVyLW1haW4tY29udGVudFwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gRmlyc3Qgcm93OiB0aXRsZSBhbmQgYWN0aW9uc1xyXG5cdFx0Y29uc3QgaGVhZGVyVG9wUm93ID0gaGVhZGVyTWFpbkNvbnRlbnQuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInByb2plY3RzLWhlYWRlci10b3Atcm93XCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCB0YXNrVGl0bGVFbCA9IGhlYWRlclRvcFJvd1xyXG5cdFx0XHQuY3JlYXRlRGl2KHsgY2xzOiBcInByb2plY3RzLWhlYWRlci10b3AtbGVmdFwiIH0pXHJcblx0XHRcdC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJwcm9qZWN0cy10YXNrLXRpdGxlXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0dGFza1RpdGxlRWwuc2V0VGV4dCh0KFwiVGFza3NcIikpO1xyXG5cclxuXHRcdGNvbnN0IGhlYWRlclRvcFJpZ2h0Um93ID0gaGVhZGVyVG9wUm93LmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJwcm9qZWN0cy1oZWFkZXItdG9wLXJpZ2h0XCIsXHJcblx0XHR9KTtcclxuXHRcdHRoaXMuaGVhZGVyVG9wUmlnaHRSb3dFbCA9IGhlYWRlclRvcFJpZ2h0Um93O1xyXG5cclxuXHRcdGNvbnN0IHRhc2tDb3VudEVsID0gaGVhZGVyVG9wUmlnaHRSb3cuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInByb2plY3RzLXRhc2stY291bnRcIixcclxuXHRcdH0pO1xyXG5cdFx0dGFza0NvdW50RWwuc2V0VGV4dChgMCAke3QoXCJ0YXNrc1wiKX1gKTtcclxuXHJcblx0XHQvLyBBZGQgdmlldyB0b2dnbGUgYnV0dG9uXHJcblx0XHRjb25zdCB2aWV3VG9nZ2xlQnRuID0gaGVhZGVyVG9wUmlnaHRSb3cuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInZpZXctdG9nZ2xlLWJ0blwiLFxyXG5cdFx0fSk7XHJcblx0XHRzZXRJY29uKHZpZXdUb2dnbGVCdG4sIFwibGlzdFwiKTtcclxuXHRcdHZpZXdUb2dnbGVCdG4uc2V0QXR0cmlidXRlKFwiYXJpYS1sYWJlbFwiLCB0KFwiVG9nZ2xlIGxpc3QvdHJlZSB2aWV3XCIpKTtcclxuXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQodmlld1RvZ2dsZUJ0biwgXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdHRoaXMudG9nZ2xlVmlld01vZGUoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFRhc2sgbGlzdCBjb250YWluZXJcclxuXHRcdHRoaXMudGFza0xpc3RDb250YWluZXJFbCA9IHRoaXMudGFza0NvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJwcm9qZWN0cy10YXNrLWxpc3RcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgdGdQcm9qZWN0IHByb3BzIGJ1dHRvbiBzdGF0ZVxyXG5cdFx0dGhpcy51cGRhdGVUZ1Byb2plY3RQcm9wc0J1dHRvbihudWxsKTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzZXRUYXNrcyh0YXNrczogVGFza1tdKSB7XHJcblx0XHR0aGlzLmFsbFRhc2tzID0gdGFza3M7XHJcblx0XHR0aGlzLmFsbFRhc2tzTWFwID0gbmV3IE1hcChcclxuXHRcdFx0dGhpcy5hbGxUYXNrcy5tYXAoKHRhc2spID0+IFt0YXNrLmlkLCB0YXNrXSlcclxuXHRcdCk7XHJcblx0XHR0aGlzLmJ1aWxkUHJvamVjdHNJbmRleCgpO1xyXG5cdFx0dGhpcy5yZW5kZXJQcm9qZWN0c0xpc3QoKTtcclxuXHJcblx0XHQvLyBJZiBwcm9qZWN0cyB3ZXJlIGFscmVhZHkgc2VsZWN0ZWQsIHVwZGF0ZSB0aGUgdGFza3NcclxuXHRcdGlmICh0aGlzLnNlbGVjdGVkUHJvamVjdHMucHJvamVjdHMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHR0aGlzLnVwZGF0ZVNlbGVjdGVkVGFza3MoKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMudGFza1JlbmRlcmVyLnJlbmRlclRhc2tzKFxyXG5cdFx0XHRcdFtdLFxyXG5cdFx0XHRcdHRoaXMuaXNUcmVlVmlldyxcclxuXHRcdFx0XHR0aGlzLmFsbFRhc2tzTWFwLFxyXG5cdFx0XHRcdHQoXCJTZWxlY3QgYSBwcm9qZWN0IHRvIHNlZSByZWxhdGVkIHRhc2tzXCIpXHJcblx0XHRcdCk7XHJcblx0XHRcdHRoaXMudXBkYXRlVGFza0xpc3RIZWFkZXIodChcIlRhc2tzXCIpLCBgMCAke3QoXCJ0YXNrc1wiKX1gKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYnVpbGRQcm9qZWN0c0luZGV4KCkge1xyXG5cdFx0Ly8gQ2xlYXIgZXhpc3RpbmcgaW5kZXhcclxuXHRcdHRoaXMuYWxsUHJvamVjdHNNYXAuY2xlYXIoKTtcclxuXHJcblx0XHQvLyBCdWlsZCBhIG1hcCBvZiBwcm9qZWN0cyB0byB0YXNrIElEc1xyXG5cdFx0dGhpcy5hbGxUYXNrcy5mb3JFYWNoKCh0YXNrKSA9PiB7XHJcblx0XHRcdGNvbnN0IGVmZmVjdGl2ZVByb2plY3QgPSBnZXRFZmZlY3RpdmVQcm9qZWN0KHRhc2spO1xyXG5cdFx0XHRpZiAoZWZmZWN0aXZlUHJvamVjdCkge1xyXG5cdFx0XHRcdGlmICghdGhpcy5hbGxQcm9qZWN0c01hcC5oYXMoZWZmZWN0aXZlUHJvamVjdCkpIHtcclxuXHRcdFx0XHRcdHRoaXMuYWxsUHJvamVjdHNNYXAuc2V0KGVmZmVjdGl2ZVByb2plY3QsIG5ldyBTZXQoKSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHRoaXMuYWxsUHJvamVjdHNNYXAuZ2V0KGVmZmVjdGl2ZVByb2plY3QpPy5hZGQodGFzay5pZCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEJ1aWxkIHByb2plY3QgdHJlZSBpZiBpbiB0cmVlIHZpZXdcclxuXHRcdGlmICh0aGlzLmlzUHJvamVjdFRyZWVWaWV3KSB7XHJcblx0XHRcdGNvbnN0IHNlcGFyYXRvciA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnByb2plY3RQYXRoU2VwYXJhdG9yIHx8IFwiL1wiO1xyXG5cdFx0XHR0aGlzLnByb2plY3RUcmVlID0gYnVpbGRQcm9qZWN0VHJlZSh0aGlzLmFsbFByb2plY3RzTWFwLCBzZXBhcmF0b3IpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFVwZGF0ZSBwcm9qZWN0cyBjb3VudFxyXG5cdFx0dGhpcy5jb3VudEVsPy5zZXRUZXh0KGAke3RoaXMuYWxsUHJvamVjdHNNYXAuc2l6ZX0gcHJvamVjdHNgKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyUHJvamVjdHNMaXN0KCkge1xyXG5cdFx0Ly8gQ2xlYXIgZXhpc3RpbmcgbGlzdFxyXG5cdFx0dGhpcy5wcm9qZWN0c0xpc3RFbC5lbXB0eSgpO1xyXG5cclxuXHRcdGlmICh0aGlzLmlzUHJvamVjdFRyZWVWaWV3ICYmIHRoaXMucHJvamVjdFRyZWUpIHtcclxuXHRcdFx0Ly8gUmVuZGVyIGFzIHRyZWVcclxuXHRcdFx0aWYgKHRoaXMucHJvamVjdFRyZWVDb21wb25lbnQpIHtcclxuXHRcdFx0XHR0aGlzLnByb2plY3RUcmVlQ29tcG9uZW50LnVubG9hZCgpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR0aGlzLnByb2plY3RUcmVlQ29tcG9uZW50ID0gbmV3IFByb2plY3RUcmVlQ29tcG9uZW50KFxyXG5cdFx0XHRcdHRoaXMucHJvamVjdHNMaXN0RWwsXHJcblx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0dGhpcy5wbHVnaW5cclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIFNldCB1cCBldmVudCBoYW5kbGVyc1xyXG5cdFx0XHR0aGlzLnByb2plY3RUcmVlQ29tcG9uZW50Lm9uTm9kZVNlbGVjdGVkID0gKFxyXG5cdFx0XHRcdHNlbGVjdGVkTm9kZXM6IFNldDxzdHJpbmc+LFxyXG5cdFx0XHRcdHRhc2tzOiBUYXNrW11cclxuXHRcdFx0KSA9PiB7XHJcblx0XHRcdFx0dGhpcy5zZWxlY3RlZFByb2plY3RzLnByb2plY3RzID0gQXJyYXkuZnJvbShzZWxlY3RlZE5vZGVzKTtcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZVNlbGVjdGVkVGFza3MoKTtcclxuXHRcdFx0XHRjb25zdCBzaW5nbGUgPVxyXG5cdFx0XHRcdFx0dGhpcy5zZWxlY3RlZFByb2plY3RzLnByb2plY3RzLmxlbmd0aCA9PT0gMVxyXG5cdFx0XHRcdFx0XHQ/IHRoaXMuc2VsZWN0ZWRQcm9qZWN0cy5wcm9qZWN0c1swXVxyXG5cdFx0XHRcdFx0XHQ6IG51bGw7XHJcblx0XHRcdFx0dGhpcy51cGRhdGVUZ1Byb2plY3RQcm9wc0J1dHRvbihzaW5nbGUpO1xyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0dGhpcy5wcm9qZWN0VHJlZUNvbXBvbmVudC5vbk11bHRpU2VsZWN0VG9nZ2xlZCA9IChcclxuXHRcdFx0XHRpc011bHRpU2VsZWN0OiBib29sZWFuXHJcblx0XHRcdCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMuc2VsZWN0ZWRQcm9qZWN0cy5pc011bHRpU2VsZWN0ID0gaXNNdWx0aVNlbGVjdDtcclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHQhaXNNdWx0aVNlbGVjdCAmJlxyXG5cdFx0XHRcdFx0dGhpcy5zZWxlY3RlZFByb2plY3RzLnByb2plY3RzLmxlbmd0aCA9PT0gMFxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0dGhpcy50YXNrUmVuZGVyZXIucmVuZGVyVGFza3MoXHJcblx0XHRcdFx0XHRcdFtdLFxyXG5cdFx0XHRcdFx0XHR0aGlzLmlzVHJlZVZpZXcsXHJcblx0XHRcdFx0XHRcdHRoaXMuYWxsVGFza3NNYXAsXHJcblx0XHRcdFx0XHRcdHQoXCJTZWxlY3QgYSBwcm9qZWN0IHRvIHNlZSByZWxhdGVkIHRhc2tzXCIpXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0dGhpcy51cGRhdGVUYXNrTGlzdEhlYWRlcih0KFwiVGFza3NcIiksIGAwICR7dChcInRhc2tzXCIpfWApO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHRcdFx0dGhpcy5wcm9qZWN0VHJlZUNvbXBvbmVudC5sb2FkKCk7XHJcblx0XHRcdC8vIFNldCB0aGUgdHJlZSB0aGF0IHdhcyBhbHJlYWR5IGJ1aWx0XHJcblx0XHRcdGlmICh0aGlzLnByb2plY3RUcmVlKSB7XHJcblx0XHRcdFx0dGhpcy5wcm9qZWN0VHJlZUNvbXBvbmVudC5zZXRUcmVlKFxyXG5cdFx0XHRcdFx0dGhpcy5wcm9qZWN0VHJlZSxcclxuXHRcdFx0XHRcdHRoaXMuYWxsVGFza3NcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBSZW5kZXIgYXMgZmxhdCBsaXN0XHJcblx0XHRcdGlmICh0aGlzLnByb2plY3RUcmVlQ29tcG9uZW50KSB7XHJcblx0XHRcdFx0dGhpcy5wcm9qZWN0VHJlZUNvbXBvbmVudC51bmxvYWQoKTtcclxuXHRcdFx0XHR0aGlzLnByb2plY3RUcmVlQ29tcG9uZW50ID0gdW5kZWZpbmVkO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBTb3J0IHByb2plY3RzIGFscGhhYmV0aWNhbGx5XHJcblx0XHRcdGNvbnN0IHNvcnRlZFByb2plY3RzID0gQXJyYXkuZnJvbShcclxuXHRcdFx0XHR0aGlzLmFsbFByb2plY3RzTWFwLmtleXMoKVxyXG5cdFx0XHQpLnNvcnQoKTtcclxuXHJcblx0XHRcdC8vIFJlbmRlciBlYWNoIHByb2plY3RcclxuXHRcdFx0c29ydGVkUHJvamVjdHMuZm9yRWFjaCgocHJvamVjdCkgPT4ge1xyXG5cdFx0XHRcdC8vIEdldCB0YXNrcyBmb3IgdGhpcyBwcm9qZWN0XHJcblx0XHRcdFx0Y29uc3QgcHJvamVjdFRhc2tJZHMgPSB0aGlzLmFsbFByb2plY3RzTWFwLmdldChwcm9qZWN0KTtcclxuXHRcdFx0XHRjb25zdCB0YXNrQ291bnQgPSBwcm9qZWN0VGFza0lkcz8uc2l6ZSB8fCAwO1xyXG5cclxuXHRcdFx0XHQvLyBDYWxjdWxhdGUgY29tcGxldGVkIHRhc2tzIGZvciB0aGlzIHByb2plY3RcclxuXHRcdFx0XHRsZXQgY29tcGxldGVkQ291bnQgPSAwO1xyXG5cdFx0XHRcdGlmIChwcm9qZWN0VGFza0lkcykge1xyXG5cdFx0XHRcdFx0cHJvamVjdFRhc2tJZHMuZm9yRWFjaCgodGFza0lkKSA9PiB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IHRhc2sgPSB0aGlzLmFsbFRhc2tzTWFwLmdldCh0YXNrSWQpO1xyXG5cdFx0XHRcdFx0XHRpZiAodGFzayAmJiB0aGlzLmdldFRhc2tTdGF0dXModGFzaykgPT09IFwiY29tcGxldGVkXCIpIHtcclxuXHRcdFx0XHRcdFx0XHRjb21wbGV0ZWRDb3VudCsrO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIENyZWF0ZSBwcm9qZWN0IGl0ZW1cclxuXHRcdFx0XHRjb25zdCBwcm9qZWN0SXRlbSA9IHRoaXMucHJvamVjdHNMaXN0RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRcdGNsczogXCJwcm9qZWN0LWxpc3QtaXRlbVwiLFxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyBQcm9qZWN0IGljb25cclxuXHRcdFx0XHRjb25zdCBwcm9qZWN0SWNvbkVsID0gcHJvamVjdEl0ZW0uY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRcdGNsczogXCJwcm9qZWN0LWljb25cIixcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRzZXRJY29uKHByb2plY3RJY29uRWwsIFwiZm9sZGVyXCIpO1xyXG5cclxuXHRcdFx0XHQvLyBQcm9qZWN0IG5hbWVcclxuXHRcdFx0XHRjb25zdCBwcm9qZWN0TmFtZUVsID0gcHJvamVjdEl0ZW0uY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRcdGNsczogXCJwcm9qZWN0LW5hbWVcIixcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRwcm9qZWN0TmFtZUVsLnNldFRleHQocHJvamVjdCk7XHJcblxyXG5cdFx0XHRcdC8vIFRhc2sgY291bnQgYmFkZ2Ugd2l0aCBwcm9ncmVzc1xyXG5cdFx0XHRcdGNvbnN0IGNvdW50RWwgPSBwcm9qZWN0SXRlbS5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdFx0Y2xzOiBcInByb2plY3QtY291bnRcIixcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gU2hvdyBjb21wbGV0ZWQvdG90YWwgZm9ybWF0XHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuYWRkUHJvZ3Jlc3NCYXJUb1Byb2plY3RzVmlldyAmJlxyXG5cdFx0XHRcdFx0dGFza0NvdW50ID4gMFxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0Y291bnRFbC5zZXRUZXh0KGAke2NvbXBsZXRlZENvdW50fS8ke3Rhc2tDb3VudH1gKTtcclxuXHRcdFx0XHRcdC8vIEFkZCBkYXRhIGF0dHJpYnV0ZXMgZm9yIHN0eWxpbmdcclxuXHRcdFx0XHRcdGNvdW50RWwuZGF0YXNldC5jb21wbGV0ZWQgPSBjb21wbGV0ZWRDb3VudC50b1N0cmluZygpO1xyXG5cdFx0XHRcdFx0Y291bnRFbC5kYXRhc2V0LnRvdGFsID0gdGFza0NvdW50LnRvU3RyaW5nKCk7XHJcblxyXG5cdFx0XHRcdFx0Y291bnRFbC50b2dnbGVDbGFzcyhcImhhcy1wcm9ncmVzc1wiLCB0cnVlKTtcclxuXHJcblx0XHRcdFx0XHQvLyBBZGQgY29tcGxldGlvbiBjbGFzcyBmb3IgdmlzdWFsIGZlZWRiYWNrXHJcblx0XHRcdFx0XHRpZiAoY29tcGxldGVkQ291bnQgPT09IHRhc2tDb3VudCkge1xyXG5cdFx0XHRcdFx0XHRjb3VudEVsLmNsYXNzTGlzdC5hZGQoXCJhbGwtY29tcGxldGVkXCIpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIGlmIChjb21wbGV0ZWRDb3VudCA+IDApIHtcclxuXHRcdFx0XHRcdFx0Y291bnRFbC5jbGFzc0xpc3QuYWRkKFwicGFydGlhbGx5LWNvbXBsZXRlZFwiKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0Y291bnRFbC5zZXRUZXh0KHRhc2tDb3VudC50b1N0cmluZygpKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIFN0b3JlIHByb2plY3QgbmFtZSBhcyBkYXRhIGF0dHJpYnV0ZVxyXG5cdFx0XHRcdHByb2plY3RJdGVtLmRhdGFzZXQucHJvamVjdCA9IHByb2plY3Q7XHJcblxyXG5cdFx0XHRcdC8vIENoZWNrIGlmIHRoaXMgcHJvamVjdCBpcyBhbHJlYWR5IHNlbGVjdGVkXHJcblx0XHRcdFx0aWYgKHRoaXMuc2VsZWN0ZWRQcm9qZWN0cy5wcm9qZWN0cy5pbmNsdWRlcyhwcm9qZWN0KSkge1xyXG5cdFx0XHRcdFx0cHJvamVjdEl0ZW0uY2xhc3NMaXN0LmFkZChcInNlbGVjdGVkXCIpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gQWRkIGNsaWNrIGhhbmRsZXJcclxuXHRcdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQocHJvamVjdEl0ZW0sIFwiY2xpY2tcIiwgKGUpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuaGFuZGxlUHJvamVjdFNlbGVjdGlvbihcclxuXHRcdFx0XHRcdFx0cHJvamVjdCxcclxuXHRcdFx0XHRcdFx0ZS5jdHJsS2V5IHx8IGUubWV0YUtleVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBBZGQgZW1wdHkgc3RhdGUgaWYgbm8gcHJvamVjdHNcclxuXHRcdFx0aWYgKHNvcnRlZFByb2plY3RzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRcdGNvbnN0IGVtcHR5RWwgPSB0aGlzLnByb2plY3RzTGlzdEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0XHRjbHM6IFwicHJvamVjdHMtZW1wdHktc3RhdGVcIixcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRlbXB0eUVsLnNldFRleHQodChcIk5vIHByb2plY3RzIGZvdW5kXCIpKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBoYW5kbGVQcm9qZWN0U2VsZWN0aW9uKHByb2plY3Q6IHN0cmluZywgaXNDdHJsUHJlc3NlZDogYm9vbGVhbikge1xyXG5cdFx0aWYgKHRoaXMuc2VsZWN0ZWRQcm9qZWN0cy5pc011bHRpU2VsZWN0IHx8IGlzQ3RybFByZXNzZWQpIHtcclxuXHRcdFx0Ly8gTXVsdGktc2VsZWN0IG1vZGVcclxuXHRcdFx0Y29uc3QgaW5kZXggPSB0aGlzLnNlbGVjdGVkUHJvamVjdHMucHJvamVjdHMuaW5kZXhPZihwcm9qZWN0KTtcclxuXHRcdFx0aWYgKGluZGV4ID09PSAtMSkge1xyXG5cdFx0XHRcdC8vIEFkZCB0byBzZWxlY3Rpb25cclxuXHRcdFx0XHR0aGlzLnNlbGVjdGVkUHJvamVjdHMucHJvamVjdHMucHVzaChwcm9qZWN0KTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBSZW1vdmUgZnJvbSBzZWxlY3Rpb25cclxuXHRcdFx0XHR0aGlzLnNlbGVjdGVkUHJvamVjdHMucHJvamVjdHMuc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSWYgbm8gcHJvamVjdHMgc2VsZWN0ZWQgYW5kIG5vdCBpbiBtdWx0aS1zZWxlY3QgbW9kZSwgcmVzZXRcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHRoaXMuc2VsZWN0ZWRQcm9qZWN0cy5wcm9qZWN0cy5sZW5ndGggPT09IDAgJiZcclxuXHRcdFx0XHQhdGhpcy5zZWxlY3RlZFByb2plY3RzLmlzTXVsdGlTZWxlY3RcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0dGhpcy50YXNrUmVuZGVyZXIucmVuZGVyVGFza3MoXHJcblx0XHRcdFx0XHRbXSxcclxuXHRcdFx0XHRcdHRoaXMuaXNUcmVlVmlldyxcclxuXHRcdFx0XHRcdHRoaXMuYWxsVGFza3NNYXAsXHJcblx0XHRcdFx0XHR0KFwiU2VsZWN0IGEgcHJvamVjdCB0byBzZWUgcmVsYXRlZCB0YXNrc1wiKVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0dGhpcy51cGRhdGVUYXNrTGlzdEhlYWRlcih0KFwiVGFza3NcIiksIGAwICR7dChcInRhc2tzXCIpfWApO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gU2luZ2xlLXNlbGVjdCBtb2RlXHJcblx0XHRcdHRoaXMuc2VsZWN0ZWRQcm9qZWN0cy5wcm9qZWN0cyA9IFtwcm9qZWN0XTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBVcGRhdGUgVUkgdG8gc2hvdyB3aGljaCBwcm9qZWN0cyBhcmUgc2VsZWN0ZWRcclxuXHRcdGNvbnN0IHByb2plY3RJdGVtcyA9XHJcblx0XHRcdHRoaXMucHJvamVjdHNMaXN0RWwucXVlcnlTZWxlY3RvckFsbChcIi5wcm9qZWN0LWxpc3QtaXRlbVwiKTtcclxuXHRcdHByb2plY3RJdGVtcy5mb3JFYWNoKChpdGVtKSA9PiB7XHJcblx0XHRcdGNvbnN0IGl0ZW1Qcm9qZWN0ID0gaXRlbS5nZXRBdHRyaWJ1dGUoXCJkYXRhLXByb2plY3RcIik7XHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHRpdGVtUHJvamVjdCAmJlxyXG5cdFx0XHRcdHRoaXMuc2VsZWN0ZWRQcm9qZWN0cy5wcm9qZWN0cy5pbmNsdWRlcyhpdGVtUHJvamVjdClcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0aXRlbS5jbGFzc0xpc3QuYWRkKFwic2VsZWN0ZWRcIik7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0aXRlbS5jbGFzc0xpc3QucmVtb3ZlKFwic2VsZWN0ZWRcIik7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSB0YXNrcyBiYXNlZCBvbiBzZWxlY3RlZCBwcm9qZWN0c1xyXG5cdFx0dGhpcy51cGRhdGVTZWxlY3RlZFRhc2tzKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHRvZ2dsZU11bHRpU2VsZWN0KCkge1xyXG5cdFx0dGhpcy5zZWxlY3RlZFByb2plY3RzLmlzTXVsdGlTZWxlY3QgPVxyXG5cdFx0XHQhdGhpcy5zZWxlY3RlZFByb2plY3RzLmlzTXVsdGlTZWxlY3Q7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIFVJIHRvIHJlZmxlY3QgbXVsdGktc2VsZWN0IG1vZGVcclxuXHRcdGlmICh0aGlzLnNlbGVjdGVkUHJvamVjdHMuaXNNdWx0aVNlbGVjdCkge1xyXG5cdFx0XHR0aGlzLmNvbnRhaW5lckVsLmNsYXNzTGlzdC5hZGQoXCJtdWx0aS1zZWxlY3QtbW9kZVwiKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMuY29udGFpbmVyRWwuY2xhc3NMaXN0LnJlbW92ZShcIm11bHRpLXNlbGVjdC1tb2RlXCIpO1xyXG5cclxuXHRcdFx0Ly8gSWYgbm8gcHJvamVjdHMgYXJlIHNlbGVjdGVkLCByZXNldCB0aGUgdmlld1xyXG5cdFx0XHRpZiAodGhpcy5zZWxlY3RlZFByb2plY3RzLnByb2plY3RzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRcdHRoaXMudGFza1JlbmRlcmVyLnJlbmRlclRhc2tzKFxyXG5cdFx0XHRcdFx0W10sXHJcblx0XHRcdFx0XHR0aGlzLmlzVHJlZVZpZXcsXHJcblx0XHRcdFx0XHR0aGlzLmFsbFRhc2tzTWFwLFxyXG5cdFx0XHRcdFx0dChcIlNlbGVjdCBhIHByb2plY3QgdG8gc2VlIHJlbGF0ZWQgdGFza3NcIilcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHRoaXMudXBkYXRlVGFza0xpc3RIZWFkZXIodChcIlRhc2tzXCIpLCBgMCAke3QoXCJ0YXNrc1wiKX1gKTtcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZVRnUHJvamVjdFByb3BzQnV0dG9uKG51bGwpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHRyZWUgY29tcG9uZW50IGlmIGl0IGV4aXN0c1xyXG5cdFx0aWYgKHRoaXMucHJvamVjdFRyZWVDb21wb25lbnQpIHtcclxuXHRcdFx0dGhpcy5wcm9qZWN0VHJlZUNvbXBvbmVudC5zZXRNdWx0aVNlbGVjdE1vZGUoXHJcblx0XHRcdFx0dGhpcy5zZWxlY3RlZFByb2plY3RzLmlzTXVsdGlTZWxlY3RcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEluaXRpYWxpemUgdmlldyBtb2RlIGZyb20gc2F2ZWQgc3RhdGUgb3IgZ2xvYmFsIGRlZmF1bHRcclxuXHQgKi9cclxuXHRwcml2YXRlIGluaXRpYWxpemVWaWV3TW9kZSgpIHtcclxuXHRcdHRoaXMuaXNUcmVlVmlldyA9IGdldEluaXRpYWxWaWV3TW9kZSh0aGlzLmFwcCwgdGhpcy5wbHVnaW4sIFwicHJvamVjdHNcIik7XHJcblx0XHQvLyBVcGRhdGUgdGhlIHRvZ2dsZSBidXR0b24gaWNvbiB0byBtYXRjaCB0aGUgaW5pdGlhbCBzdGF0ZVxyXG5cdFx0Y29uc3Qgdmlld1RvZ2dsZUJ0biA9IHRoaXMudGFza0NvbnRhaW5lckVsPy5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRcIi52aWV3LXRvZ2dsZS1idG5cIlxyXG5cdFx0KSBhcyBIVE1MRWxlbWVudDtcclxuXHRcdGlmICh2aWV3VG9nZ2xlQnRuKSB7XHJcblx0XHRcdHNldEljb24odmlld1RvZ2dsZUJ0biwgdGhpcy5pc1RyZWVWaWV3ID8gXCJnaXQtYnJhbmNoXCIgOiBcImxpc3RcIik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHRvZ2dsZVZpZXdNb2RlKCkge1xyXG5cdFx0dGhpcy5pc1RyZWVWaWV3ID0gIXRoaXMuaXNUcmVlVmlldztcclxuXHJcblx0XHQvLyBVcGRhdGUgdG9nZ2xlIGJ1dHRvbiBpY29uXHJcblx0XHRjb25zdCB2aWV3VG9nZ2xlQnRuID0gdGhpcy50YXNrQ29udGFpbmVyRWwucXVlcnlTZWxlY3RvcihcclxuXHRcdFx0XCIudmlldy10b2dnbGUtYnRuXCJcclxuXHRcdCkgYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRpZiAodmlld1RvZ2dsZUJ0bikge1xyXG5cdFx0XHRzZXRJY29uKHZpZXdUb2dnbGVCdG4sIHRoaXMuaXNUcmVlVmlldyA/IFwiZ2l0LWJyYW5jaFwiIDogXCJsaXN0XCIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFNhdmUgdGhlIG5ldyB2aWV3IG1vZGUgc3RhdGVcclxuXHRcdHNhdmVWaWV3TW9kZSh0aGlzLmFwcCwgXCJwcm9qZWN0c1wiLCB0aGlzLmlzVHJlZVZpZXcpO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSB0YXNrcyBkaXNwbGF5IHVzaW5nIHRoZSByZW5kZXJlclxyXG5cdFx0dGhpcy5yZW5kZXJUYXNrTGlzdCgpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSB1cGRhdGVTZWxlY3RlZFRhc2tzKCkge1xyXG5cdFx0aWYgKHRoaXMuc2VsZWN0ZWRQcm9qZWN0cy5wcm9qZWN0cy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0dGhpcy50YXNrUmVuZGVyZXIucmVuZGVyVGFza3MoXHJcblx0XHRcdFx0W10sXHJcblx0XHRcdFx0dGhpcy5pc1RyZWVWaWV3LFxyXG5cdFx0XHRcdHRoaXMuYWxsVGFza3NNYXAsXHJcblx0XHRcdFx0dChcIlNlbGVjdCBhIHByb2plY3QgdG8gc2VlIHJlbGF0ZWQgdGFza3NcIilcclxuXHRcdFx0KTtcclxuXHRcdFx0dGhpcy51cGRhdGVUYXNrTGlzdEhlYWRlcih0KFwiVGFza3NcIiksIGAwICR7dChcInRhc2tzXCIpfWApO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVXNlIHRoZSBwcm9qZWN0IGZpbHRlciB1dGlsaXR5IGZvciBpbmNsdXNpdmUgZmlsdGVyaW5nIGluIHRyZWUgdmlld1xyXG5cdFx0aWYgKHRoaXMuaXNQcm9qZWN0VHJlZVZpZXcpIHtcclxuXHRcdFx0dGhpcy5maWx0ZXJlZFRhc2tzID0gZmlsdGVyVGFza3NCeVByb2plY3RQYXRocyhcclxuXHRcdFx0XHR0aGlzLmFsbFRhc2tzLFxyXG5cdFx0XHRcdHRoaXMuc2VsZWN0ZWRQcm9qZWN0cy5wcm9qZWN0cyxcclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0UGF0aFNlcGFyYXRvciB8fCBcIi9cIlxyXG5cdFx0XHQpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gR2V0IHRhc2tzIGZyb20gYWxsIHNlbGVjdGVkIHByb2plY3RzIChPUiBsb2dpYylcclxuXHRcdFx0Y29uc3QgcmVzdWx0VGFza0lkcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG5cclxuXHRcdFx0Ly8gVW5pb24gYWxsIHRhc2sgc2V0cyBmcm9tIHNlbGVjdGVkIHByb2plY3RzXHJcblx0XHRcdHRoaXMuc2VsZWN0ZWRQcm9qZWN0cy5wcm9qZWN0cy5mb3JFYWNoKChwcm9qZWN0KSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgdGFza0lkcyA9IHRoaXMuYWxsUHJvamVjdHNNYXAuZ2V0KHByb2plY3QpO1xyXG5cdFx0XHRcdGlmICh0YXNrSWRzKSB7XHJcblx0XHRcdFx0XHR0YXNrSWRzLmZvckVhY2goKGlkKSA9PiByZXN1bHRUYXNrSWRzLmFkZChpZCkpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBDb252ZXJ0IHRhc2sgSURzIHRvIGFjdHVhbCB0YXNrIG9iamVjdHNcclxuXHRcdFx0dGhpcy5maWx0ZXJlZFRhc2tzID0gdGhpcy5hbGxUYXNrcy5maWx0ZXIoKHRhc2spID0+XHJcblx0XHRcdFx0cmVzdWx0VGFza0lkcy5oYXModGFzay5pZClcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCB2aWV3Q29uZmlnID0gdGhpcy5wbHVnaW4uc2V0dGluZ3Mudmlld0NvbmZpZ3VyYXRpb24uZmluZChcclxuXHRcdFx0KHZpZXcpID0+IHZpZXcuaWQgPT09IFwicHJvamVjdHNcIlxyXG5cdFx0KTtcclxuXHRcdGlmICh2aWV3Q29uZmlnPy5zb3J0Q3JpdGVyaWEgJiYgdmlld0NvbmZpZy5zb3J0Q3JpdGVyaWEubGVuZ3RoID4gMCkge1xyXG5cdFx0XHR0aGlzLmZpbHRlcmVkVGFza3MgPSBzb3J0VGFza3MoXHJcblx0XHRcdFx0dGhpcy5maWx0ZXJlZFRhc2tzLFxyXG5cdFx0XHRcdHZpZXdDb25maWcuc29ydENyaXRlcmlhLFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzXHJcblx0XHRcdCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBTb3J0IHRhc2tzIGJ5IHByaW9yaXR5IGFuZCBkdWUgZGF0ZVxyXG5cdFx0XHQvLyBTb3J0IHRhc2tzIGJ5IHByaW9yaXR5IGFuZCBkdWUgZGF0ZVxyXG5cdFx0XHR0aGlzLmZpbHRlcmVkVGFza3Muc29ydCgoYSwgYikgPT4ge1xyXG5cdFx0XHRcdC8vIEZpcnN0IGJ5IGNvbXBsZXRpb24gc3RhdHVzXHJcblx0XHRcdFx0aWYgKGEuY29tcGxldGVkICE9PSBiLmNvbXBsZXRlZCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGEuY29tcGxldGVkID8gMSA6IC0xO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gVGhlbiBieSBwcmlvcml0eSAoaGlnaCB0byBsb3cpXHJcblx0XHRcdFx0Y29uc3QgcHJpb3JpdHlBID0gYS5tZXRhZGF0YS5wcmlvcml0eSB8fCAwO1xyXG5cdFx0XHRcdGNvbnN0IHByaW9yaXR5QiA9IGIubWV0YWRhdGEucHJpb3JpdHkgfHwgMDtcclxuXHRcdFx0XHRpZiAocHJpb3JpdHlBICE9PSBwcmlvcml0eUIpIHtcclxuXHRcdFx0XHRcdHJldHVybiBwcmlvcml0eUIgLSBwcmlvcml0eUE7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBUaGVuIGJ5IGR1ZSBkYXRlIChlYXJseSB0byBsYXRlKVxyXG5cdFx0XHRcdGNvbnN0IGR1ZURhdGVBID0gYS5tZXRhZGF0YS5kdWVEYXRlIHx8IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSO1xyXG5cdFx0XHRcdGNvbnN0IGR1ZURhdGVCID0gYi5tZXRhZGF0YS5kdWVEYXRlIHx8IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSO1xyXG5cdFx0XHRcdHJldHVybiBkdWVEYXRlQSAtIGR1ZURhdGVCO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBVcGRhdGUgdGhlIHRhc2sgbGlzdCB1c2luZyB0aGUgcmVuZGVyZXJcclxuXHRcdHRoaXMucmVuZGVyVGFza0xpc3QoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgdXBkYXRlVGFza0xpc3RIZWFkZXIodGl0bGU6IHN0cmluZywgY291bnRUZXh0OiBzdHJpbmcpIHtcclxuXHRcdGNvbnN0IHRhc2tIZWFkZXJFbCA9IHRoaXMudGFza0NvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFwiLnByb2plY3RzLXRhc2stdGl0bGVcIlxyXG5cdFx0KTtcclxuXHRcdGlmICh0YXNrSGVhZGVyRWwpIHtcclxuXHRcdFx0dGFza0hlYWRlckVsLnRleHRDb250ZW50ID0gdGl0bGU7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgdGFza0NvdW50RWwgPSB0aGlzLnRhc2tDb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRcIi5wcm9qZWN0cy10YXNrLWNvdW50XCJcclxuXHRcdCk7XHJcblx0XHRpZiAodGFza0NvdW50RWwpIHtcclxuXHRcdFx0dGFza0NvdW50RWwudGV4dENvbnRlbnQgPSBjb3VudFRleHQ7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHByb2dyZXNzIGJhciBpZiBlbmFibGVkIGFuZCBwcm9qZWN0cyBhcmUgc2VsZWN0ZWRcclxuXHRcdHRoaXMudXBkYXRlUHJvZ3Jlc3NCYXIoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgdXBkYXRlUHJvZ3Jlc3NCYXIoKSB7XHJcblx0XHQvLyBDaGVjayBpZiBwcm9ncmVzcyBiYXIgc2hvdWxkIGJlIHNob3duXHJcblx0XHRpZiAoXHJcblx0XHRcdCF0aGlzLnBsdWdpbi5zZXR0aW5ncy5hZGRQcm9ncmVzc0JhclRvUHJvamVjdHNWaWV3IHx8XHJcblx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnByb2dyZXNzQmFyRGlzcGxheU1vZGUgPT09IFwibm9uZVwiIHx8XHJcblx0XHRcdHRoaXMuZmlsdGVyZWRUYXNrcy5sZW5ndGggPT09IDBcclxuXHRcdCkge1xyXG5cdFx0XHQvLyBIaWRlIHByb2dyZXNzIGJhciBjb250YWluZXIgaWYgaXQgZXhpc3RzXHJcblx0XHRcdGNvbnN0IHByb2dyZXNzQ29udGFpbmVyID0gdGhpcy50YXNrQ29udGFpbmVyRWwucXVlcnlTZWxlY3RvcihcclxuXHRcdFx0XHRcIi5wcm9qZWN0cy1oZWFkZXItcHJvZ3Jlc3NcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRpZiAocHJvZ3Jlc3NDb250YWluZXIpIHtcclxuXHRcdFx0XHRwcm9ncmVzc0NvbnRhaW5lci5yZW1vdmUoKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2FsY3VsYXRlIHByb2dyZXNzIGRhdGFcclxuXHRcdGNvbnN0IHByb2dyZXNzRGF0YSA9IHRoaXMuY2FsY3VsYXRlUHJvZ3Jlc3NEYXRhKCk7XHJcblxyXG5cdFx0Ly8gR2V0IG9yIGNyZWF0ZSBwcm9ncmVzcyBjb250YWluZXJcclxuXHRcdGxldCBwcm9ncmVzc0NvbnRhaW5lciA9IHRoaXMudGFza0NvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFwiLnByb2plY3RzLWhlYWRlci1wcm9ncmVzc1wiXHJcblx0XHQpIGFzIEhUTUxFbGVtZW50O1xyXG5cclxuXHRcdGlmICghcHJvZ3Jlc3NDb250YWluZXIpIHtcclxuXHRcdFx0Y29uc3QgaGVhZGVyTWFpbkNvbnRlbnQgPSB0aGlzLnRhc2tDb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRcdFwiLnByb2plY3RzLWhlYWRlci1tYWluLWNvbnRlbnRcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRpZiAoaGVhZGVyTWFpbkNvbnRlbnQpIHtcclxuXHRcdFx0XHRwcm9ncmVzc0NvbnRhaW5lciA9IGhlYWRlck1haW5Db250ZW50LmNyZWF0ZURpdih7XHJcblx0XHRcdFx0XHRjbHM6IFwicHJvamVjdHMtaGVhZGVyLXByb2dyZXNzXCIsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIENsZWFyIGV4aXN0aW5nIGNvbnRlbnRcclxuXHRcdFx0cHJvZ3Jlc3NDb250YWluZXIuZW1wdHkoKTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoIXByb2dyZXNzQ29udGFpbmVyKSByZXR1cm47XHJcblxyXG5cdFx0Y29uc3QgZGlzcGxheU1vZGUgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm9ncmVzc0JhckRpc3BsYXlNb2RlO1xyXG5cclxuXHRcdC8vIFJlbmRlciBncmFwaGljYWwgcHJvZ3Jlc3MgYmFyIHVzaW5nIGV4aXN0aW5nIHByb2dyZXNzIGJhciBzdHlsZXNcclxuXHRcdGlmIChkaXNwbGF5TW9kZSA9PT0gXCJncmFwaGljYWxcIiB8fCBkaXNwbGF5TW9kZSA9PT0gXCJib3RoXCIpIHtcclxuXHRcdFx0Ly8gQ3JlYXRlIHByb2dyZXNzIGJhciB3aXRoIHNhbWUgc3RydWN0dXJlIGFzIGV4aXN0aW5nIHdpZGdldHNcclxuXHRcdFx0Y29uc3QgcHJvZ3Jlc3NCYXJFbCA9IHByb2dyZXNzQ29udGFpbmVyLmNyZWF0ZVNwYW4oe1xyXG5cdFx0XHRcdGNsczogXCJjbS10YXNrLXByb2dyZXNzLWJhciBwcm9qZWN0cy1wcm9ncmVzc1wiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IHByb2dyZXNzQmFja0dyb3VuZEVsID0gcHJvZ3Jlc3NCYXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJwcm9ncmVzcy1iYXItaW5saW5lLWJhY2tncm91bmRcIixcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBDYWxjdWxhdGUgcGVyY2VudGFnZXNcclxuXHRcdFx0Y29uc3QgY29tcGxldGVkUGVyY2VudGFnZSA9XHJcblx0XHRcdFx0TWF0aC5yb3VuZChcclxuXHRcdFx0XHRcdChwcm9ncmVzc0RhdGEuY29tcGxldGVkIC8gcHJvZ3Jlc3NEYXRhLnRvdGFsKSAqIDEwMDAwXHJcblx0XHRcdFx0KSAvIDEwMDtcclxuXHRcdFx0Y29uc3QgaW5Qcm9ncmVzc1BlcmNlbnRhZ2UgPSBwcm9ncmVzc0RhdGEuaW5Qcm9ncmVzc1xyXG5cdFx0XHRcdD8gTWF0aC5yb3VuZChcclxuXHRcdFx0XHRcdFx0KHByb2dyZXNzRGF0YS5pblByb2dyZXNzIC8gcHJvZ3Jlc3NEYXRhLnRvdGFsKSAqIDEwMDAwXHJcblx0XHRcdFx0ICApIC8gMTAwXHJcblx0XHRcdFx0OiAwO1xyXG5cdFx0XHRjb25zdCBhYmFuZG9uZWRQZXJjZW50YWdlID0gcHJvZ3Jlc3NEYXRhLmFiYW5kb25lZFxyXG5cdFx0XHRcdD8gTWF0aC5yb3VuZChcclxuXHRcdFx0XHRcdFx0KHByb2dyZXNzRGF0YS5hYmFuZG9uZWQgLyBwcm9ncmVzc0RhdGEudG90YWwpICogMTAwMDBcclxuXHRcdFx0XHQgICkgLyAxMDBcclxuXHRcdFx0XHQ6IDA7XHJcblx0XHRcdGNvbnN0IHBsYW5uZWRQZXJjZW50YWdlID0gcHJvZ3Jlc3NEYXRhLnBsYW5uZWRcclxuXHRcdFx0XHQ/IE1hdGgucm91bmQoXHJcblx0XHRcdFx0XHRcdChwcm9ncmVzc0RhdGEucGxhbm5lZCAvIHByb2dyZXNzRGF0YS50b3RhbCkgKiAxMDAwMFxyXG5cdFx0XHRcdCAgKSAvIDEwMFxyXG5cdFx0XHRcdDogMDtcclxuXHJcblx0XHRcdC8vIENyZWF0ZSBwcm9ncmVzcyBzZWdtZW50c1xyXG5cdFx0XHRjb25zdCBwcm9ncmVzc0VsID0gcHJvZ3Jlc3NCYWNrR3JvdW5kRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwicHJvZ3Jlc3MtYmFyLWlubGluZSBwcm9ncmVzcy1jb21wbGV0ZWRcIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdHByb2dyZXNzRWwuc3R5bGUud2lkdGggPSBjb21wbGV0ZWRQZXJjZW50YWdlICsgXCIlXCI7XHJcblxyXG5cdFx0XHQvLyBBZGQgYWRkaXRpb25hbCBzdGF0dXMgYmFycyBpZiBuZWVkZWRcclxuXHRcdFx0aWYgKHByb2dyZXNzRGF0YS5pblByb2dyZXNzICYmIHByb2dyZXNzRGF0YS5pblByb2dyZXNzID4gMCkge1xyXG5cdFx0XHRcdGNvbnN0IGluUHJvZ3Jlc3NFbCA9IHByb2dyZXNzQmFja0dyb3VuZEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0XHRjbHM6IFwicHJvZ3Jlc3MtYmFyLWlubGluZSBwcm9ncmVzcy1pbi1wcm9ncmVzc1wiLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGluUHJvZ3Jlc3NFbC5zdHlsZS53aWR0aCA9IGluUHJvZ3Jlc3NQZXJjZW50YWdlICsgXCIlXCI7XHJcblx0XHRcdFx0aW5Qcm9ncmVzc0VsLnN0eWxlLmxlZnQgPSBjb21wbGV0ZWRQZXJjZW50YWdlICsgXCIlXCI7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChwcm9ncmVzc0RhdGEuYWJhbmRvbmVkICYmIHByb2dyZXNzRGF0YS5hYmFuZG9uZWQgPiAwKSB7XHJcblx0XHRcdFx0Y29uc3QgYWJhbmRvbmVkRWwgPSBwcm9ncmVzc0JhY2tHcm91bmRFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdFx0Y2xzOiBcInByb2dyZXNzLWJhci1pbmxpbmUgcHJvZ3Jlc3MtYWJhbmRvbmVkXCIsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0YWJhbmRvbmVkRWwuc3R5bGUud2lkdGggPSBhYmFuZG9uZWRQZXJjZW50YWdlICsgXCIlXCI7XHJcblx0XHRcdFx0YWJhbmRvbmVkRWwuc3R5bGUubGVmdCA9XHJcblx0XHRcdFx0XHRjb21wbGV0ZWRQZXJjZW50YWdlICsgaW5Qcm9ncmVzc1BlcmNlbnRhZ2UgKyBcIiVcIjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKHByb2dyZXNzRGF0YS5wbGFubmVkICYmIHByb2dyZXNzRGF0YS5wbGFubmVkID4gMCkge1xyXG5cdFx0XHRcdGNvbnN0IHBsYW5uZWRFbCA9IHByb2dyZXNzQmFja0dyb3VuZEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0XHRjbHM6IFwicHJvZ3Jlc3MtYmFyLWlubGluZSBwcm9ncmVzcy1wbGFubmVkXCIsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0cGxhbm5lZEVsLnN0eWxlLndpZHRoID0gcGxhbm5lZFBlcmNlbnRhZ2UgKyBcIiVcIjtcclxuXHRcdFx0XHRwbGFubmVkRWwuc3R5bGUubGVmdCA9XHJcblx0XHRcdFx0XHRjb21wbGV0ZWRQZXJjZW50YWdlICtcclxuXHRcdFx0XHRcdGluUHJvZ3Jlc3NQZXJjZW50YWdlICtcclxuXHRcdFx0XHRcdGFiYW5kb25lZFBlcmNlbnRhZ2UgK1xyXG5cdFx0XHRcdFx0XCIlXCI7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEFwcGx5IHByb2dyZXNzIGxldmVsIGNsYXNzXHJcblx0XHRcdGxldCBwcm9ncmVzc0NsYXNzID0gXCJwcm9ncmVzcy1iYXItaW5saW5lXCI7XHJcblx0XHRcdHN3aXRjaCAodHJ1ZSkge1xyXG5cdFx0XHRcdGNhc2UgY29tcGxldGVkUGVyY2VudGFnZSA9PT0gMDpcclxuXHRcdFx0XHRcdHByb2dyZXNzQ2xhc3MgKz0gXCIgcHJvZ3Jlc3MtYmFyLWlubGluZS1lbXB0eVwiO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBjb21wbGV0ZWRQZXJjZW50YWdlID4gMCAmJiBjb21wbGV0ZWRQZXJjZW50YWdlIDwgMjU6XHJcblx0XHRcdFx0XHRwcm9ncmVzc0NsYXNzICs9IFwiIHByb2dyZXNzLWJhci1pbmxpbmUtMFwiO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBjb21wbGV0ZWRQZXJjZW50YWdlID49IDI1ICYmIGNvbXBsZXRlZFBlcmNlbnRhZ2UgPCA1MDpcclxuXHRcdFx0XHRcdHByb2dyZXNzQ2xhc3MgKz0gXCIgcHJvZ3Jlc3MtYmFyLWlubGluZS0xXCI7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIGNvbXBsZXRlZFBlcmNlbnRhZ2UgPj0gNTAgJiYgY29tcGxldGVkUGVyY2VudGFnZSA8IDc1OlxyXG5cdFx0XHRcdFx0cHJvZ3Jlc3NDbGFzcyArPSBcIiBwcm9ncmVzcy1iYXItaW5saW5lLTJcIjtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgY29tcGxldGVkUGVyY2VudGFnZSA+PSA3NSAmJiBjb21wbGV0ZWRQZXJjZW50YWdlIDwgMTAwOlxyXG5cdFx0XHRcdFx0cHJvZ3Jlc3NDbGFzcyArPSBcIiBwcm9ncmVzcy1iYXItaW5saW5lLTNcIjtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgY29tcGxldGVkUGVyY2VudGFnZSA+PSAxMDA6XHJcblx0XHRcdFx0XHRwcm9ncmVzc0NsYXNzICs9IFwiIHByb2dyZXNzLWJhci1pbmxpbmUtY29tcGxldGVcIjtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdHByb2dyZXNzRWwuY2xhc3NOYW1lID0gcHJvZ3Jlc3NDbGFzcztcclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZW5kZXIgdGV4dCBwcm9ncmVzc1xyXG5cdFx0aWYgKGRpc3BsYXlNb2RlID09PSBcInRleHRcIiB8fCBkaXNwbGF5TW9kZSA9PT0gXCJib3RoXCIpIHtcclxuXHRcdFx0Y29uc3QgcHJvZ3Jlc3NUZXh0ID0gZm9ybWF0UHJvZ3Jlc3NUZXh0KHByb2dyZXNzRGF0YSwgdGhpcy5wbHVnaW4pO1xyXG5cdFx0XHRpZiAocHJvZ3Jlc3NUZXh0KSB7XHJcblx0XHRcdFx0Ly8gSWYgd2UncmUgaW4gdGV4dC1vbmx5IG1vZGUsIGNyZWF0ZSBhIHNpbXBsZSB0ZXh0IGNvbnRhaW5lclxyXG5cdFx0XHRcdC8vIElmIHdlJ3JlIGluIFwiYm90aFwiIG1vZGUsIHRoZSB0ZXh0IHdhcyBhbHJlYWR5IGFkZGVkIHRvIHRoZSBwcm9ncmVzcyBiYXJcclxuXHRcdFx0XHRpZiAoZGlzcGxheU1vZGUgPT09IFwidGV4dFwiKSB7XHJcblx0XHRcdFx0XHRjb25zdCB0ZXh0RWwgPSBwcm9ncmVzc0NvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdFx0XHRjbHM6IFwicHJvZ3Jlc3Mtc3RhdHVzIHByb2plY3RzLXByb2dyZXNzLXRleHRcIixcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0dGV4dEVsLnNldFRleHQocHJvZ3Jlc3NUZXh0KTtcclxuXHRcdFx0XHR9IGVsc2UgaWYgKGRpc3BsYXlNb2RlID09PSBcImJvdGhcIikge1xyXG5cdFx0XHRcdFx0Ly8gQWRkIHRleHQgdG8gdGhlIGV4aXN0aW5nIHByb2dyZXNzIGJhciBjb250YWluZXJcclxuXHRcdFx0XHRcdGNvbnN0IHByb2dyZXNzQmFyRWwgPSBwcm9ncmVzc0NvbnRhaW5lci5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRcdFx0XHRcIi5jbS10YXNrLXByb2dyZXNzLWJhclwiXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0aWYgKHByb2dyZXNzQmFyRWwpIHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgdGV4dEVsID0gcHJvZ3Jlc3NCYXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdFx0XHRcdGNsczogXCJwcm9ncmVzcy1zdGF0dXNcIixcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdHRleHRFbC5zZXRUZXh0KHByb2dyZXNzVGV4dCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNhbGN1bGF0ZVByb2dyZXNzRGF0YSgpOiBQcm9ncmVzc0RhdGEge1xyXG5cdFx0Y29uc3QgZGF0YTogUHJvZ3Jlc3NEYXRhID0ge1xyXG5cdFx0XHRjb21wbGV0ZWQ6IDAsXHJcblx0XHRcdHRvdGFsOiB0aGlzLmZpbHRlcmVkVGFza3MubGVuZ3RoLFxyXG5cdFx0XHRpblByb2dyZXNzOiAwLFxyXG5cdFx0XHRhYmFuZG9uZWQ6IDAsXHJcblx0XHRcdG5vdFN0YXJ0ZWQ6IDAsXHJcblx0XHRcdHBsYW5uZWQ6IDAsXHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuZmlsdGVyZWRUYXNrcy5mb3JFYWNoKCh0YXNrKSA9PiB7XHJcblx0XHRcdGNvbnN0IHN0YXR1cyA9IHRoaXMuZ2V0VGFza1N0YXR1cyh0YXNrKTtcclxuXHJcblx0XHRcdHN3aXRjaCAoc3RhdHVzKSB7XHJcblx0XHRcdFx0Y2FzZSBcImNvbXBsZXRlZFwiOlxyXG5cdFx0XHRcdFx0ZGF0YS5jb21wbGV0ZWQrKztcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJpblByb2dyZXNzXCI6XHJcblx0XHRcdFx0XHRkYXRhLmluUHJvZ3Jlc3MgPSAoZGF0YS5pblByb2dyZXNzIHx8IDApICsgMTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJhYmFuZG9uZWRcIjpcclxuXHRcdFx0XHRcdGRhdGEuYWJhbmRvbmVkID0gKGRhdGEuYWJhbmRvbmVkIHx8IDApICsgMTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJwbGFubmVkXCI6XHJcblx0XHRcdFx0XHRkYXRhLnBsYW5uZWQgPSAoZGF0YS5wbGFubmVkIHx8IDApICsgMTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJub3RTdGFydGVkXCI6XHJcblx0XHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRcdGRhdGEubm90U3RhcnRlZCA9IChkYXRhLm5vdFN0YXJ0ZWQgfHwgMCkgKyAxO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBkYXRhO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHRoZSB0YXNrIHN0YXR1cyBiYXNlZCBvbiBwbHVnaW4gc2V0dGluZ3NcclxuXHQgKiBGb2xsb3dzIHRoZSBzYW1lIGxvZ2ljIGFzIHByb2dyZXNzLWJhci13aWRnZXQudHNcclxuXHQgKi9cclxuXHRwcml2YXRlIGdldFRhc2tTdGF0dXMoXHJcblx0XHR0YXNrOiBUYXNrXHJcblx0KTogXCJjb21wbGV0ZWRcIiB8IFwiaW5Qcm9ncmVzc1wiIHwgXCJhYmFuZG9uZWRcIiB8IFwibm90U3RhcnRlZFwiIHwgXCJwbGFubmVkXCIge1xyXG5cdFx0Ly8gSWYgdGFzayBpcyBtYXJrZWQgYXMgY29tcGxldGVkIGluIHRoZSB0YXNrIG9iamVjdFxyXG5cdFx0aWYgKHRhc2suY29tcGxldGVkKSB7XHJcblx0XHRcdHJldHVybiBcImNvbXBsZXRlZFwiO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IG1hcmsgPSB0YXNrLnN0YXR1cztcclxuXHRcdGlmICghbWFyaykge1xyXG5cdFx0XHRyZXR1cm4gXCJub3RTdGFydGVkXCI7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUHJpb3JpdHkgMTogSWYgdXNlT25seUNvdW50TWFya3MgaXMgZW5hYmxlZFxyXG5cdFx0aWYgKHRoaXMucGx1Z2luPy5zZXR0aW5ncy51c2VPbmx5Q291bnRNYXJrcykge1xyXG5cdFx0XHRjb25zdCBvbmx5Q291bnRNYXJrcyA9XHJcblx0XHRcdFx0dGhpcy5wbHVnaW4/LnNldHRpbmdzLm9ubHlDb3VudFRhc2tNYXJrcz8uc3BsaXQoXCJ8XCIpIHx8IFtdO1xyXG5cdFx0XHRpZiAob25seUNvdW50TWFya3MuaW5jbHVkZXMobWFyaykpIHtcclxuXHRcdFx0XHRyZXR1cm4gXCJjb21wbGV0ZWRcIjtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBJZiB1c2luZyBvbmx5Q291bnRNYXJrcyBhbmQgdGhlIG1hcmsgaXMgbm90IGluIHRoZSBsaXN0LFxyXG5cdFx0XHRcdC8vIGRldGVybWluZSB3aGljaCBvdGhlciBzdGF0dXMgaXQgYmVsb25ncyB0b1xyXG5cdFx0XHRcdHJldHVybiB0aGlzLmRldGVybWluZU5vbkNvbXBsZXRlZFN0YXR1cyhtYXJrKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFByaW9yaXR5IDI6IElmIHRoZSBtYXJrIGlzIGluIGV4Y2x1ZGVUYXNrTWFya3NcclxuXHRcdGlmIChcclxuXHRcdFx0dGhpcy5wbHVnaW4/LnNldHRpbmdzLmV4Y2x1ZGVUYXNrTWFya3MgJiZcclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXhjbHVkZVRhc2tNYXJrcy5pbmNsdWRlcyhtYXJrKVxyXG5cdFx0KSB7XHJcblx0XHRcdC8vIEV4Y2x1ZGVkIG1hcmtzIGFyZSBjb25zaWRlcmVkIG5vdCBzdGFydGVkXHJcblx0XHRcdHJldHVybiBcIm5vdFN0YXJ0ZWRcIjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBQcmlvcml0eSAzOiBDaGVjayBhZ2FpbnN0IHNwZWNpZmljIHRhc2sgc3RhdHVzZXNcclxuXHRcdHJldHVybiB0aGlzLmRldGVybWluZVRhc2tTdGF0dXMobWFyayk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBIZWxwZXIgdG8gZGV0ZXJtaW5lIHRoZSBub24tY29tcGxldGVkIHN0YXR1cyBvZiBhIHRhc2sgbWFya1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgZGV0ZXJtaW5lTm9uQ29tcGxldGVkU3RhdHVzKFxyXG5cdFx0bWFyazogc3RyaW5nXHJcblx0KTogXCJpblByb2dyZXNzXCIgfCBcImFiYW5kb25lZFwiIHwgXCJub3RTdGFydGVkXCIgfCBcInBsYW5uZWRcIiB7XHJcblx0XHRjb25zdCBpblByb2dyZXNzTWFya3MgPVxyXG5cdFx0XHR0aGlzLnBsdWdpbj8uc2V0dGluZ3MudGFza1N0YXR1c2VzPy5pblByb2dyZXNzPy5zcGxpdChcInxcIikgfHwgW1xyXG5cdFx0XHRcdFwiL1wiLFxyXG5cdFx0XHRcdFwiLVwiLFxyXG5cdFx0XHRdO1xyXG5cclxuXHRcdGlmIChpblByb2dyZXNzTWFya3MuaW5jbHVkZXMobWFyaykpIHtcclxuXHRcdFx0cmV0dXJuIFwiaW5Qcm9ncmVzc1wiO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IGFiYW5kb25lZE1hcmtzID1cclxuXHRcdFx0dGhpcy5wbHVnaW4/LnNldHRpbmdzLnRhc2tTdGF0dXNlcz8uYWJhbmRvbmVkPy5zcGxpdChcInxcIikgfHwgW1wiPlwiXTtcclxuXHRcdGlmIChhYmFuZG9uZWRNYXJrcy5pbmNsdWRlcyhtYXJrKSkge1xyXG5cdFx0XHRyZXR1cm4gXCJhYmFuZG9uZWRcIjtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBwbGFubmVkTWFya3MgPSB0aGlzLnBsdWdpbj8uc2V0dGluZ3MudGFza1N0YXR1c2VzPy5wbGFubmVkPy5zcGxpdChcclxuXHRcdFx0XCJ8XCJcclxuXHRcdCkgfHwgW1wiP1wiXTtcclxuXHRcdGlmIChwbGFubmVkTWFya3MuaW5jbHVkZXMobWFyaykpIHtcclxuXHRcdFx0cmV0dXJuIFwicGxhbm5lZFwiO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIElmIHRoZSBtYXJrIGRvZXNuJ3QgbWF0Y2ggYW55IHNwZWNpZmljIGNhdGVnb3J5LCB1c2UgdGhlIGNvdW50T3RoZXJTdGF0dXNlc0FzIHNldHRpbmdcclxuXHRcdHJldHVybiAoXHJcblx0XHRcdCh0aGlzLnBsdWdpbj8uc2V0dGluZ3MuY291bnRPdGhlclN0YXR1c2VzQXMgYXNcclxuXHRcdFx0XHR8IFwiaW5Qcm9ncmVzc1wiXHJcblx0XHRcdFx0fCBcImFiYW5kb25lZFwiXHJcblx0XHRcdFx0fCBcIm5vdFN0YXJ0ZWRcIlxyXG5cdFx0XHRcdHwgXCJwbGFubmVkXCIpIHx8IFwibm90U3RhcnRlZFwiXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSGVscGVyIHRvIGRldGVybWluZSB0aGUgc3BlY2lmaWMgdGFzayBzdGF0dXNcclxuXHQgKi9cclxuXHRwcml2YXRlIGRldGVybWluZVRhc2tTdGF0dXMoXHJcblx0XHRtYXJrOiBzdHJpbmdcclxuXHQpOiBcImNvbXBsZXRlZFwiIHwgXCJpblByb2dyZXNzXCIgfCBcImFiYW5kb25lZFwiIHwgXCJub3RTdGFydGVkXCIgfCBcInBsYW5uZWRcIiB7XHJcblx0XHRjb25zdCBjb21wbGV0ZWRNYXJrcyA9XHJcblx0XHRcdHRoaXMucGx1Z2luPy5zZXR0aW5ncy50YXNrU3RhdHVzZXM/LmNvbXBsZXRlZD8uc3BsaXQoXCJ8XCIpIHx8IFtcclxuXHRcdFx0XHRcInhcIixcclxuXHRcdFx0XHRcIlhcIixcclxuXHRcdFx0XTtcclxuXHRcdGlmIChjb21wbGV0ZWRNYXJrcy5pbmNsdWRlcyhtYXJrKSkge1xyXG5cdFx0XHRyZXR1cm4gXCJjb21wbGV0ZWRcIjtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBpblByb2dyZXNzTWFya3MgPVxyXG5cdFx0XHR0aGlzLnBsdWdpbj8uc2V0dGluZ3MudGFza1N0YXR1c2VzPy5pblByb2dyZXNzPy5zcGxpdChcInxcIikgfHwgW1xyXG5cdFx0XHRcdFwiL1wiLFxyXG5cdFx0XHRcdFwiLVwiLFxyXG5cdFx0XHRdO1xyXG5cdFx0aWYgKGluUHJvZ3Jlc3NNYXJrcy5pbmNsdWRlcyhtYXJrKSkge1xyXG5cdFx0XHRyZXR1cm4gXCJpblByb2dyZXNzXCI7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgYWJhbmRvbmVkTWFya3MgPVxyXG5cdFx0XHR0aGlzLnBsdWdpbj8uc2V0dGluZ3MudGFza1N0YXR1c2VzPy5hYmFuZG9uZWQ/LnNwbGl0KFwifFwiKSB8fCBbXCI+XCJdO1xyXG5cdFx0aWYgKGFiYW5kb25lZE1hcmtzLmluY2x1ZGVzKG1hcmspKSB7XHJcblx0XHRcdHJldHVybiBcImFiYW5kb25lZFwiO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHBsYW5uZWRNYXJrcyA9IHRoaXMucGx1Z2luPy5zZXR0aW5ncy50YXNrU3RhdHVzZXM/LnBsYW5uZWQ/LnNwbGl0KFxyXG5cdFx0XHRcInxcIlxyXG5cdFx0KSB8fCBbXCI/XCJdO1xyXG5cdFx0aWYgKHBsYW5uZWRNYXJrcy5pbmNsdWRlcyhtYXJrKSkge1xyXG5cdFx0XHRyZXR1cm4gXCJwbGFubmVkXCI7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSWYgbm90IG1hdGNoaW5nIGFueSBzcGVjaWZpYyBzdGF0dXMsIGNoZWNrIGlmIGl0J3MgYSBub3Qtc3RhcnRlZCBtYXJrXHJcblx0XHRjb25zdCBub3RTdGFydGVkTWFya3MgPVxyXG5cdFx0XHR0aGlzLnBsdWdpbj8uc2V0dGluZ3MudGFza1N0YXR1c2VzPy5ub3RTdGFydGVkPy5zcGxpdChcInxcIikgfHwgW1wiIFwiXTtcclxuXHRcdGlmIChub3RTdGFydGVkTWFya3MuaW5jbHVkZXMobWFyaykpIHtcclxuXHRcdFx0cmV0dXJuIFwibm90U3RhcnRlZFwiO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIElmIHdlIGdldCBoZXJlLCB0aGUgbWFyayBkb2Vzbid0IG1hdGNoIGFueSBvZiBvdXIgZGVmaW5lZCBjYXRlZ29yaWVzXHJcblx0XHQvLyBVc2UgdGhlIGNvdW50T3RoZXJTdGF0dXNlc0FzIHNldHRpbmcgdG8gZGV0ZXJtaW5lIGhvdyB0byBjb3VudCBpdFxyXG5cdFx0cmV0dXJuIChcclxuXHRcdFx0KHRoaXMucGx1Z2luPy5zZXR0aW5ncy5jb3VudE90aGVyU3RhdHVzZXNBcyBhc1xyXG5cdFx0XHRcdHwgXCJjb21wbGV0ZWRcIlxyXG5cdFx0XHRcdHwgXCJpblByb2dyZXNzXCJcclxuXHRcdFx0XHR8IFwiYWJhbmRvbmVkXCJcclxuXHRcdFx0XHR8IFwibm90U3RhcnRlZFwiXHJcblx0XHRcdFx0fCBcInBsYW5uZWRcIikgfHwgXCJub3RTdGFydGVkXCJcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbmRlclRhc2tMaXN0KCkge1xyXG5cdFx0Ly8gVXBkYXRlIHRoZSBoZWFkZXJcclxuXHRcdGxldCB0aXRsZSA9IHQoXCJUYXNrc1wiKTtcclxuXHRcdGlmICh0aGlzLnNlbGVjdGVkUHJvamVjdHMucHJvamVjdHMubGVuZ3RoID09PSAxKSB7XHJcblx0XHRcdHRpdGxlID0gdGhpcy5zZWxlY3RlZFByb2plY3RzLnByb2plY3RzWzBdO1xyXG5cdFx0fSBlbHNlIGlmICh0aGlzLnNlbGVjdGVkUHJvamVjdHMucHJvamVjdHMubGVuZ3RoID4gMSkge1xyXG5cdFx0XHR0aXRsZSA9IGAke3RoaXMuc2VsZWN0ZWRQcm9qZWN0cy5wcm9qZWN0cy5sZW5ndGh9ICR7dChcclxuXHRcdFx0XHRcInByb2plY3RzIHNlbGVjdGVkXCJcclxuXHRcdFx0KX1gO1xyXG5cdFx0fVxyXG5cdFx0Y29uc3QgY291bnRUZXh0ID0gYCR7dGhpcy5maWx0ZXJlZFRhc2tzLmxlbmd0aH0gJHt0KFwidGFza3NcIil9YDtcclxuXHRcdHRoaXMudXBkYXRlVGFza0xpc3RIZWFkZXIodGl0bGUsIGNvdW50VGV4dCk7XHJcblxyXG5cdFx0Ly8gVXNlIHRoZSByZW5kZXJlciB0byBkaXNwbGF5IHRhc2tzIG9yIGVtcHR5IHN0YXRlXHJcblx0XHR0aGlzLnRhc2tSZW5kZXJlci5yZW5kZXJUYXNrcyhcclxuXHRcdFx0dGhpcy5maWx0ZXJlZFRhc2tzLFxyXG5cdFx0XHR0aGlzLmlzVHJlZVZpZXcsXHJcblx0XHRcdHRoaXMuYWxsVGFza3NNYXAsXHJcblx0XHRcdHQoXCJObyB0YXNrcyBpbiB0aGUgc2VsZWN0ZWQgcHJvamVjdHNcIilcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgdXBkYXRlVGFzayh1cGRhdGVkVGFzazogVGFzaykge1xyXG5cdFx0Ly8gVXBkYXRlIGluIG91ciBtYWluIHRhc2tzIGxpc3RcclxuXHRcdGNvbnN0IHRhc2tJbmRleCA9IHRoaXMuYWxsVGFza3MuZmluZEluZGV4KFxyXG5cdFx0XHQodCkgPT4gdC5pZCA9PT0gdXBkYXRlZFRhc2suaWRcclxuXHRcdCk7XHJcblx0XHRsZXQgbmVlZHNGdWxsUmVmcmVzaCA9IGZhbHNlO1xyXG5cdFx0aWYgKHRhc2tJbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0Y29uc3Qgb2xkVGFzayA9IHRoaXMuYWxsVGFza3NbdGFza0luZGV4XTtcclxuXHRcdFx0Ly8gQ2hlY2sgaWYgcHJvamVjdCBhc3NpZ25tZW50IGNoYW5nZWQsIHdoaWNoIGFmZmVjdHMgdGhlIHNpZGViYXIvZmlsdGVyaW5nXHJcblx0XHRcdGlmIChvbGRUYXNrLm1ldGFkYXRhLnByb2plY3QgIT09IHVwZGF0ZWRUYXNrLm1ldGFkYXRhLnByb2plY3QpIHtcclxuXHRcdFx0XHRuZWVkc0Z1bGxSZWZyZXNoID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGlzLmFsbFRhc2tzW3Rhc2tJbmRleF0gPSB1cGRhdGVkVGFzaztcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIFRhc2sgaXMgcG90ZW50aWFsbHkgbmV3LCBhZGQgaXQgYW5kIHJlZnJlc2hcclxuXHRcdFx0dGhpcy5hbGxUYXNrcy5wdXNoKHVwZGF0ZWRUYXNrKTtcclxuXHRcdFx0bmVlZHNGdWxsUmVmcmVzaCA9IHRydWU7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSWYgcHJvamVjdCBjaGFuZ2VkIG9yIHRhc2sgaXMgbmV3LCByZWJ1aWxkIGluZGV4IGFuZCBmdWxseSByZWZyZXNoIFVJXHJcblx0XHRpZiAobmVlZHNGdWxsUmVmcmVzaCkge1xyXG5cdFx0XHR0aGlzLmJ1aWxkUHJvamVjdHNJbmRleCgpO1xyXG5cdFx0XHR0aGlzLnJlbmRlclByb2plY3RzTGlzdCgpOyAvLyBVcGRhdGUgbGVmdCBzaWRlYmFyXHJcblx0XHRcdHRoaXMudXBkYXRlU2VsZWN0ZWRUYXNrcygpOyAvLyBSZWNhbGN1bGF0ZSBmaWx0ZXJlZCB0YXNrcyBhbmQgcmUtcmVuZGVyIHJpZ2h0IHBhbmVsXHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBPdGhlcndpc2UsIGp1c3QgdXBkYXRlIHRoZSB0YXNrIGluIHRoZSBmaWx0ZXJlZCBsaXN0IGFuZCB0aGUgcmVuZGVyZXJcclxuXHRcdFx0Y29uc3QgZmlsdGVyZWRJbmRleCA9IHRoaXMuZmlsdGVyZWRUYXNrcy5maW5kSW5kZXgoXHJcblx0XHRcdFx0KHQpID0+IHQuaWQgPT09IHVwZGF0ZWRUYXNrLmlkXHJcblx0XHRcdCk7XHJcblx0XHRcdGlmIChmaWx0ZXJlZEluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHRcdHRoaXMuZmlsdGVyZWRUYXNrc1tmaWx0ZXJlZEluZGV4XSA9IHVwZGF0ZWRUYXNrO1xyXG5cdFx0XHRcdC8vIEFzayB0aGUgcmVuZGVyZXIgdG8gdXBkYXRlIHRoZSBzcGVjaWZpYyBjb21wb25lbnRcclxuXHRcdFx0XHR0aGlzLnRhc2tSZW5kZXJlci51cGRhdGVUYXNrKHVwZGF0ZWRUYXNrKTtcclxuXHRcdFx0XHQvLyBPcHRpb25hbDogUmUtc29ydCBpZiBzb3J0aW5nIGNyaXRlcmlhIGNoYW5nZWQsIHRoZW4gcmUtcmVuZGVyXHJcblx0XHRcdFx0Ly8gdGhpcy5yZW5kZXJUYXNrTGlzdCgpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIFRhc2sgbWlnaHQgaGF2ZSBiZWNvbWUgdmlzaWJsZSBkdWUgdG8gdGhlIHVwZGF0ZSwgcmVxdWlyZXMgcmUtZmlsdGVyaW5nXHJcblx0XHRcdFx0dGhpcy51cGRhdGVTZWxlY3RlZFRhc2tzKCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgdG9nZ2xlUHJvamVjdFRyZWVWaWV3KCkge1xyXG5cdFx0dGhpcy5pc1Byb2plY3RUcmVlVmlldyA9ICF0aGlzLmlzUHJvamVjdFRyZWVWaWV3O1xyXG5cclxuXHRcdC8vIFVwZGF0ZSBidXR0b24gaWNvblxyXG5cdFx0Y29uc3QgdHJlZVRvZ2dsZUJ0biA9IHRoaXMubGVmdENvbHVtbkVsLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFwiLnByb2plY3RzLXRyZWUtdG9nZ2xlLWJ0blwiXHJcblx0XHQpIGFzIEhUTUxFbGVtZW50O1xyXG5cdFx0aWYgKHRyZWVUb2dnbGVCdG4pIHtcclxuXHRcdFx0c2V0SWNvbihcclxuXHRcdFx0XHR0cmVlVG9nZ2xlQnRuLFxyXG5cdFx0XHRcdHRoaXMuaXNQcm9qZWN0VHJlZVZpZXcgPyBcImdpdC1icmFuY2hcIiA6IFwibGlzdFwiXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU2F2ZSBwcmVmZXJlbmNlIHRvIGxvY2FsU3RvcmFnZSBmb3Igbm93XHJcblx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcclxuXHRcdFx0XCJ0YXNrLWdlbml1cy1wcm9qZWN0LXRyZWUtdmlld1wiLFxyXG5cdFx0XHR0aGlzLmlzUHJvamVjdFRyZWVWaWV3LnRvU3RyaW5nKClcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gUmVidWlsZCBwcm9qZWN0IGluZGV4IGFuZCByZS1yZW5kZXJcclxuXHRcdHRoaXMuYnVpbGRQcm9qZWN0c0luZGV4KCk7XHJcblx0XHR0aGlzLnJlbmRlclByb2plY3RzTGlzdCgpO1xyXG5cdFx0Ly8gVXBkYXRlIHRhc2tzIGFuZCB0Z1Byb2plY3QgaW5mbyBidXR0b24gYmFzZWQgb24gY3VycmVudCBzZWxlY3Rpb25cclxuXHRcdGlmICh0aGlzLnNlbGVjdGVkUHJvamVjdHMucHJvamVjdHMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHR0aGlzLnVwZGF0ZVNlbGVjdGVkVGFza3MoKTtcclxuXHRcdH1cclxuXHRcdGNvbnN0IHNpbmdsZSA9XHJcblx0XHRcdHRoaXMuc2VsZWN0ZWRQcm9qZWN0cy5wcm9qZWN0cy5sZW5ndGggPT09IDFcclxuXHRcdFx0XHQ/IHRoaXMuc2VsZWN0ZWRQcm9qZWN0cy5wcm9qZWN0c1swXVxyXG5cdFx0XHRcdDogbnVsbDtcclxuXHRcdHRoaXMudXBkYXRlVGdQcm9qZWN0UHJvcHNCdXR0b24oc2luZ2xlKTtcclxuXHR9XHJcblxyXG5cdC8qKiBDcmVhdGUgb3IgdXBkYXRlIHRoZSB0Z1Byb2plY3QgaW5mbyBidXR0b24gaW4gdGhlIHJpZ2h0IGhlYWRlciAqL1xyXG5cdHByaXZhdGUgdXBkYXRlVGdQcm9qZWN0UHJvcHNCdXR0b24oc2VsZWN0ZWRQcm9qZWN0OiBzdHJpbmcgfCBudWxsKTogdm9pZCB7XHJcblx0XHRpZiAoIXRoaXMuaGVhZGVyVG9wUmlnaHRSb3dFbCkgcmV0dXJuO1xyXG5cdFx0Ly8gTm8gc2VsZWN0aW9uOiByZW1vdmUgYnV0dG9uIGFuZCBwb3BvdmVyXHJcblx0XHRpZiAoIXNlbGVjdGVkUHJvamVjdCkge1xyXG5cdFx0XHRpZiAodGhpcy5wcm9qZWN0UHJvcHNCdG5FbCkge1xyXG5cdFx0XHRcdHRoaXMucHJvamVjdFByb3BzQnRuRWwucmVtb3ZlKCk7XHJcblx0XHRcdFx0dGhpcy5wcm9qZWN0UHJvcHNCdG5FbCA9IG51bGw7XHJcblx0XHRcdH1cclxuXHRcdFx0dGhpcy50ZWFyZG93blByb2plY3RQcm9wc1VJKCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdC8vIFNob3cgaW5mbyBidXR0b24gb25seSB3aGVuIHRoZXJlIGV4aXN0cyBhIHRhc2sgd2l0aCBhIHJlYWwgdGdQcm9qZWN0IEFORFxyXG5cdFx0Ly8gKG5vIG1ldGFkYXRhLnByb2plY3QpIE9SIChtZXRhZGF0YS5wcm9qZWN0IGVxdWFscyB0Z1Byb2plY3QubmFtZSkuXHJcblx0XHR7XHJcblx0XHRcdGNvbnN0IHNlcGFyYXRvciA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnByb2plY3RQYXRoU2VwYXJhdG9yIHx8IFwiL1wiO1xyXG5cdFx0XHRjb25zdCBoYXNJbmZvID0gdGhpcy5hbGxUYXNrcy5zb21lKCh0YXNrKSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgcCA9IGdldEVmZmVjdGl2ZVByb2plY3QodGFzayk7XHJcblx0XHRcdFx0Y29uc3QgbWF0Y2ggPVxyXG5cdFx0XHRcdFx0cCA9PT0gc2VsZWN0ZWRQcm9qZWN0IHx8XHJcblx0XHRcdFx0XHQocCAmJiBwLnN0YXJ0c1dpdGgoc2VsZWN0ZWRQcm9qZWN0ICsgc2VwYXJhdG9yKSk7XHJcblx0XHRcdFx0aWYgKCFtYXRjaCkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdGNvbnN0IHRnID0gKHRhc2subWV0YWRhdGEgYXMgYW55KT8udGdQcm9qZWN0IGFzIGFueTtcclxuXHRcdFx0XHRpZiAoIXRnIHx8IHR5cGVvZiB0ZyAhPT0gXCJvYmplY3RcIikgcmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdGNvbnN0IG1wID0gdGFzay5tZXRhZGF0YT8ucHJvamVjdDtcclxuXHRcdFx0XHRyZXR1cm4gKFxyXG5cdFx0XHRcdFx0bXAgPT09IHVuZGVmaW5lZCB8fFxyXG5cdFx0XHRcdFx0bXAgPT09IG51bGwgfHxcclxuXHRcdFx0XHRcdG1wID09PSBcIlwiIHx8XHJcblx0XHRcdFx0XHRtcCA9PT0gdGcubmFtZVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0XHRpZiAoIWhhc0luZm8pIHtcclxuXHRcdFx0XHRpZiAodGhpcy5wcm9qZWN0UHJvcHNCdG5FbCkge1xyXG5cdFx0XHRcdFx0dGhpcy5wcm9qZWN0UHJvcHNCdG5FbC5yZW1vdmUoKTtcclxuXHRcdFx0XHRcdHRoaXMucHJvamVjdFByb3BzQnRuRWwgPSBudWxsO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHR0aGlzLnRlYXJkb3duUHJvamVjdFByb3BzVUkoKTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdC8vIEVuc3VyZSBidXR0b24gZXhpc3RzXHJcblx0XHRpZiAoIXRoaXMucHJvamVjdFByb3BzQnRuRWwpIHtcclxuXHRcdFx0Y29uc3QgYnRuID0gdGhpcy5oZWFkZXJUb3BSaWdodFJvd0VsLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcInByb2plY3RzLXByb3BzLWJ0blwiLFxyXG5cdFx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHRcdFwiYXJpYS1sYWJlbFwiOiB0KFwiU2hvdyBwcm9qZWN0IGluZm9cIikgfHwgXCJQcm9qZWN0IGluZm9cIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0c2V0SWNvbihidG4sIFwiaW5mb1wiKTtcclxuXHRcdFx0dGhpcy5wcm9qZWN0UHJvcHNCdG5FbCA9IGJ0bjtcclxuXHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGJ0biwgXCJjbGlja1wiLCBhc3luYyAoZSkgPT4ge1xyXG5cdFx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblx0XHRcdFx0aWYgKHRoaXMucHJvamVjdFByb3BzUG9wb3ZlckVsKSB7XHJcblx0XHRcdFx0XHR0aGlzLnRlYXJkb3duUHJvamVjdFByb3BzVUkoKTtcclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gQ3JlYXRlIHBvcG92ZXIgdXNpbmcgY3JlYXRlRWwgZnJvbSBkb2N1bWVudC5ib2R5XHJcblx0XHRcdFx0dGhpcy5wcm9qZWN0UHJvcHNQb3BvdmVyRWwgPSBkb2N1bWVudC5ib2R5LmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0XHRcdGNsczogXCJ0Zy1wcm9qZWN0LXBvcG92ZXJcIixcclxuXHRcdFx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHRcdFx0c3R5bGU6IFwiYmFja2dyb3VuZDogdmFyKC0tYmFja2dyb3VuZC1zZWNvbmRhcnkpOyBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1iYWNrZ3JvdW5kLW1vZGlmaWVyLWJvcmRlcik7IGJvcmRlci1yYWRpdXM6IDhweDsgcGFkZGluZzogOHB4IDEwcHg7IGJveC1zaGFkb3c6IHZhcigtLXNoYWRvdy1zKTsgbWF4LXdpZHRoOiA0MjBweDsgei1pbmRleDogOTk5OTtcIlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGNvbnN0IGxpc3QgPSB0aGlzLnByb2plY3RQcm9wc1BvcG92ZXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdFx0Y2xzOiBcInRnLXByb2plY3QtcHJvcHNcIlxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdHRoaXMucHJvamVjdFByb3BzUG9wcGVyID0gY3JlYXRlUG9wcGVyKGJ0biwgdGhpcy5wcm9qZWN0UHJvcHNQb3BvdmVyRWwsIHtcclxuXHRcdFx0XHRcdHBsYWNlbWVudDogXCJib3R0b20tZW5kXCIsXHJcblx0XHRcdFx0XHRtb2RpZmllcnM6IFtcclxuXHRcdFx0XHRcdFx0eyBuYW1lOiBcIm9mZnNldFwiLCBvcHRpb25zOiB7IG9mZnNldDogWzAsIDhdIH0gfSxcclxuXHRcdFx0XHRcdF0sXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0Ly8gUmVuZGVyLXRva2VuIHRvIHByZXZlbnQgc3RhbGUgYXN5bmMgdXBkYXRlc1xyXG5cdFx0XHRcdGNvbnN0IGdlbiA9ICsrdGhpcy5pbmZvUmVuZGVyR2VuO1xyXG5cclxuXHRcdFx0XHQvLyBDbG9zZSBvbiBvdXRzaWRlIGNsaWNrIG9yIEVTQ1xyXG5cclxuXHRcdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQodGhpcy5wcm9qZWN0UHJvcHNQb3BvdmVyRWwsIFwibW91c2Vkb3duXCIsIChldikgPT4gZXYuc3RvcFByb3BhZ2F0aW9uKCkpO1xyXG5cclxuXHRcdFx0XHR0aGlzLm91dHNpZGVDbGlja0hhbmRsZXIgPSAoZXY6IE1vdXNlRXZlbnQpID0+IHtcclxuXHRcdFx0XHRcdGNvbnN0IHRhcmdldCA9IGV2LnRhcmdldCBhcyBOb2RlO1xyXG5cdFx0XHRcdFx0aWYgKCF0aGlzLnByb2plY3RQcm9wc1BvcG92ZXJFbCkgcmV0dXJuO1xyXG5cdFx0XHRcdFx0aWYgKHRoaXMucHJvamVjdFByb3BzUG9wb3ZlckVsLmNvbnRhaW5zKHRhcmdldCkpIHJldHVybjtcclxuXHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0dGhpcy5wcm9qZWN0UHJvcHNCdG5FbCAmJlxyXG5cdFx0XHRcdFx0XHR0aGlzLnByb2plY3RQcm9wc0J0bkVsLmNvbnRhaW5zKHRhcmdldClcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdFx0dGhpcy50ZWFyZG93blByb2plY3RQcm9wc1VJKCk7XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoXHJcblx0XHRcdFx0XHRkb2N1bWVudCxcclxuXHRcdFx0XHRcdFwibW91c2Vkb3duXCIsXHJcblx0XHRcdFx0XHR0aGlzLm91dHNpZGVDbGlja0hhbmRsZXIsXHJcblx0XHRcdFx0XHR7IGNhcHR1cmU6IHRydWUgfVxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdHRoaXMuZXNjS2V5SGFuZGxlciA9IChldjogS2V5Ym9hcmRFdmVudCkgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKGV2LmtleSA9PT0gXCJFc2NhcGVcIikge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnRlYXJkb3duUHJvamVjdFByb3BzVUkoKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9O1xyXG5cdFx0XHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChkb2N1bWVudCwgXCJrZXlkb3duXCIsIHRoaXMuZXNjS2V5SGFuZGxlcik7XHJcblxyXG5cdFx0XHRcdC8vIFJlc29sdmUgcmVwcmVzZW50YXRpdmUgdGFzayBhbmQgdGdQcm9qZWN0IHVzaW5nIGN1cnJlbnQgc2VsZWN0aW9uXHJcblx0XHRcdFx0Y29uc3QgY3VycmVudFNlbGVjdGVkID1cclxuXHRcdFx0XHRcdHRoaXMuc2VsZWN0ZWRQcm9qZWN0cy5wcm9qZWN0cy5sZW5ndGggPT09IDFcclxuXHRcdFx0XHRcdFx0PyB0aGlzLnNlbGVjdGVkUHJvamVjdHMucHJvamVjdHNbMF1cclxuXHRcdFx0XHRcdFx0OiBudWxsO1xyXG5cdFx0XHRcdGlmICghY3VycmVudFNlbGVjdGVkKSB7XHJcblx0XHRcdFx0XHRsaXN0LnRleHRDb250ZW50ID1cclxuXHRcdFx0XHRcdFx0dChcIk5vIHByb2plY3Qgc2VsZWN0ZWRcIikgfHwgXCJObyBwcm9qZWN0IHNlbGVjdGVkXCI7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHRoaXMuY3VycmVudEluZm9Qcm9qZWN0ID0gY3VycmVudFNlbGVjdGVkO1xyXG5cdFx0XHRcdC8vIEdhdGhlciB0YXNrcyBpbiB0aGlzIHByb2plY3QgZ3JvdXBcclxuXHRcdFx0XHRjb25zdCBzZXBhcmF0b3IgPVxyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvamVjdFBhdGhTZXBhcmF0b3IgfHwgXCIvXCI7XHJcblx0XHRcdFx0Y29uc3QgdGFza3NJblByb2plY3QgPSB0aGlzLmFsbFRhc2tzLmZpbHRlcigodGFzaykgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc3QgcCA9IGdldEVmZmVjdGl2ZVByb2plY3QodGFzayk7XHJcblx0XHRcdFx0XHRyZXR1cm4gKFxyXG5cdFx0XHRcdFx0XHRwID09PSBjdXJyZW50U2VsZWN0ZWQgfHxcclxuXHRcdFx0XHRcdFx0KHAgJiYgcC5zdGFydHNXaXRoKGN1cnJlbnRTZWxlY3RlZCArIHNlcGFyYXRvcikpXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGNvbnN0IGNhbmRpZGF0ZXMgPSB0YXNrc0luUHJvamVjdC5maWx0ZXIoKHQpID0+IHtcclxuXHRcdFx0XHRcdGNvbnN0IHRnID0gKHQubWV0YWRhdGEgYXMgYW55KT8udGdQcm9qZWN0IGFzIGFueTtcclxuXHRcdFx0XHRcdGlmICghdGcgfHwgdHlwZW9mIHRnICE9PSBcIm9iamVjdFwiKSByZXR1cm4gZmFsc2U7XHJcblx0XHRcdFx0XHRjb25zdCBtcCA9IHQubWV0YWRhdGE/LnByb2plY3Q7XHJcblx0XHRcdFx0XHRyZXR1cm4gKFxyXG5cdFx0XHRcdFx0XHRtcCA9PT0gdW5kZWZpbmVkIHx8XHJcblx0XHRcdFx0XHRcdG1wID09PSBudWxsIHx8XHJcblx0XHRcdFx0XHRcdG1wID09PSBcIlwiIHx8XHJcblx0XHRcdFx0XHRcdG1wID09PSB0Zy5uYW1lXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGNvbnN0IHRhc2tQcmVmTWF0Y2ggPSBjYW5kaWRhdGVzLmZpbmQoKHQpID0+IHtcclxuXHRcdFx0XHRcdGNvbnN0IG1wID0gdC5tZXRhZGF0YT8ucHJvamVjdDtcclxuXHRcdFx0XHRcdGNvbnN0IHRnID0gKHQubWV0YWRhdGEgYXMgYW55KT8udGdQcm9qZWN0IGFzIGFueTtcclxuXHRcdFx0XHRcdHJldHVybiBtcCAmJiB0ZyAmJiBtcCA9PT0gdGcubmFtZTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRjb25zdCB0YXNrRm9yUmVzb2x2ZTogVGFzayB8IHVuZGVmaW5lZCA9XHJcblx0XHRcdFx0XHR0YXNrUHJlZk1hdGNoIHx8IGNhbmRpZGF0ZXNbMF07XHJcblx0XHRcdFx0aWYgKCF0YXNrRm9yUmVzb2x2ZSkge1xyXG5cdFx0XHRcdFx0bGlzdC50ZXh0Q29udGVudCA9XHJcblx0XHRcdFx0XHRcdHQoXCJObyB0YXNrIGZvdW5kIGluIHNlbGVjdGlvblwiKSB8fCBcIk5vIHRhc2sgZm91bmRcIjtcclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0bGlzdC50ZXh0Q29udGVudCA9IHQoXCJMb2FkaW5nLi4uXCIpIHx8IFwiTG9hZGluZy4uLlwiO1xyXG5cclxuXHRcdFx0XHRsZXQgZW5oYW5jZWQ6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcclxuXHRcdFx0XHRsZXQgY29uZmlnU291cmNlUGF0aDogc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRjb25zdCByZXNvbHZlciA9ICh0aGlzLnBsdWdpbi5kYXRhZmxvd09yY2hlc3RyYXRvciBhcyBhbnkpXHJcblx0XHRcdFx0XHRcdD8ucHJvamVjdFJlc29sdmVyO1xyXG5cdFx0XHRcdFx0aWYgKHJlc29sdmVyPy5nZXQpIHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgcGRhdGEgPSBhd2FpdCByZXNvbHZlci5nZXQoXHJcblx0XHRcdFx0XHRcdFx0dGFza0ZvclJlc29sdmUuZmlsZVBhdGhcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0ZW5oYW5jZWQgPSBwZGF0YT8uZW5oYW5jZWRNZXRhZGF0YSB8fCB7fTtcclxuXHRcdFx0XHRcdFx0Y29uZmlnU291cmNlUGF0aCA9IHBkYXRhPy5jb25maWdTb3VyY2U7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRjb25zdCByZXBvID1cclxuXHRcdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5kYXRhZmxvd09yY2hlc3RyYXRvcj8uZ2V0UmVwb3NpdG9yeSgpO1xyXG5cdFx0XHRcdFx0XHRjb25zdCBzdG9yYWdlID0gKHJlcG8gYXMgYW55KT8uZ2V0U3RvcmFnZT8uKCk7XHJcblx0XHRcdFx0XHRcdGNvbnN0IHJlYyA9IHN0b3JhZ2VcclxuXHRcdFx0XHRcdFx0XHQ/IGF3YWl0IHN0b3JhZ2UubG9hZFByb2plY3QodGFza0ZvclJlc29sdmUuZmlsZVBhdGgpXHJcblx0XHRcdFx0XHRcdFx0OiBudWxsO1xyXG5cdFx0XHRcdFx0XHRlbmhhbmNlZCA9IHJlYz8uZGF0YT8uZW5oYW5jZWRNZXRhZGF0YSB8fCB7fTtcclxuXHRcdFx0XHRcdFx0Y29uZmlnU291cmNlUGF0aCA9IHJlYz8uZGF0YT8uY29uZmlnU291cmNlO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0gY2F0Y2ggKGVycikge1xyXG5cdFx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0XHRcIltQcm9qZWN0c10gRmFpbGVkIHRvIGxvYWQgcHJvamVjdCBtZXRhZGF0YTpcIixcclxuXHRcdFx0XHRcdFx0ZXJyXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gU3RhbGUtZ3VhcmQ6IGlmIGEgbmV3ZXIgcmVuZGVyIHN0YXJ0ZWQsIGFib3J0XHJcblx0XHRcdFx0aWYgKGdlbiAhPT0gdGhpcy5pbmZvUmVuZGVyR2VuKSB7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBDaG9vc2UgdGcgc3RyaWN0bHkgZnJvbSB0aGUgc2VsZWN0ZWQgY2FuZGlkYXRlIChtdXN0IGV4aXN0IGJ5IGJ1dHRvbiBydWxlKVxyXG5cdFx0XHRcdGNvbnN0IHRnID1cclxuXHRcdFx0XHRcdCgodGFza0ZvclJlc29sdmU/Lm1ldGFkYXRhIGFzIGFueSk/LnRnUHJvamVjdCBhcyBhbnkpIHx8XHJcblx0XHRcdFx0XHR1bmRlZmluZWQ7XHJcblx0XHRcdFx0aWYgKCF0Zykge1xyXG5cdFx0XHRcdFx0dGhpcy50ZWFyZG93blByb2plY3RQcm9wc1VJKCk7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGNvbnN0IGVudHJpZXM6IEFycmF5PFtzdHJpbmcsIGFueV0+ID0gW107XHJcblx0XHRcdFx0bGV0IGZtS2V5czogU2V0PHN0cmluZz4gPSBuZXcgU2V0KCk7XHJcblx0XHRcdFx0Y29uc3QgcHJvamVjdE5hbWUgPVxyXG5cdFx0XHRcdFx0dGFza0ZvclJlc29sdmU/Lm1ldGFkYXRhPy5wcm9qZWN0ID8/XHJcblx0XHRcdFx0XHQodGcgYXMgYW55KS5uYW1lID8/XHJcblx0XHRcdFx0XHRjdXJyZW50U2VsZWN0ZWQ7XHJcblx0XHRcdFx0ZW50cmllcy5wdXNoKFtcInByb2plY3RcIiwgcHJvamVjdE5hbWVdKTtcclxuXHRcdFx0XHRlbnRyaWVzLnB1c2goW1widHlwZVwiLCAodGcgYXMgYW55KS50eXBlXSk7XHJcblx0XHRcdFx0aWYgKCh0ZyBhcyBhbnkpLnNvdXJjZSlcclxuXHRcdFx0XHRcdGVudHJpZXMucHVzaChbXCJzb3VyY2VcIiwgKHRnIGFzIGFueSkuc291cmNlXSk7XHJcblx0XHRcdFx0aWYgKCh0ZyBhcyBhbnkpLnJlYWRvbmx5ICE9PSB1bmRlZmluZWQpXHJcblx0XHRcdFx0XHRlbnRyaWVzLnB1c2goW1wicmVhZG9ubHlcIiwgKHRnIGFzIGFueSkucmVhZG9ubHldKTtcclxuXHJcblx0XHRcdFx0Ly8gSWYgdGdQcm9qZWN0IGV4aXN0cyAoaW5jbC4gdHlwZT1jb25maWcpLCBsb2FkIGl0cyBzb3VyY2UgZmlsZSBmcm9udG1hdHRlciBhbmQgZGlzcGxheVxyXG5cdFx0XHRcdGlmICh0Zykge1xyXG5cdFx0XHRcdFx0aWYgKGNvbmZpZ1NvdXJjZVBhdGgpIHtcclxuXHRcdFx0XHRcdFx0ZW50cmllcy5wdXNoKFtcImNvbmZpZ1NvdXJjZVwiLCBjb25maWdTb3VyY2VQYXRoXSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRjb25zdCBtZXRhUGF0aCA9XHJcblx0XHRcdFx0XHRcdHRnICYmICh0ZyBhcyBhbnkpLnR5cGUgPT09IFwiY29uZmlnXCIgJiYgY29uZmlnU291cmNlUGF0aFxyXG5cdFx0XHRcdFx0XHRcdD8gY29uZmlnU291cmNlUGF0aFxyXG5cdFx0XHRcdFx0XHRcdDogdGFza0ZvclJlc29sdmUuZmlsZVBhdGg7XHJcblx0XHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBhYnMgPVxyXG5cdFx0XHRcdFx0XHRcdHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChtZXRhUGF0aCk7XHJcblx0XHRcdFx0XHRcdGlmIChhYnMgJiYgKGFicyBhcyBhbnkpLmV4dGVuc2lvbikge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGZpbGUgPSBhYnMgYXMgYW55OyAvLyBURmlsZVxyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGZtID1cclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRmaWxlXHJcblx0XHRcdFx0XHRcdFx0XHQpPy5mcm9udG1hdHRlcjtcclxuXHRcdFx0XHRcdFx0XHRpZiAoZm0gJiYgdHlwZW9mIGZtID09PSBcIm9iamVjdFwiKSB7XHJcblx0XHRcdFx0XHRcdFx0XHQvLyByZWNvcmQgZm0ga2V5cyBmb3IgZGUtZHVwbGljYXRpb25cclxuXHRcdFx0XHRcdFx0XHRcdGZtS2V5cyA9IG5ldyBTZXQoXHJcblx0XHRcdFx0XHRcdFx0XHRcdE9iamVjdC5rZXlzKGZtKS5maWx0ZXIoKGspID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBrbCA9IGsudG9Mb3dlckNhc2UoKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0a2wgIT09IFwicG9zaXRpb25cIiAmJlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0a2wgIT09IFwicHJvamVjdG5hbWVcIiAmJlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0a2wgIT09IFwicHJvamVjdFwiXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0fSlcclxuXHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0XHRlbnRyaWVzLnB1c2goW1wi4oCUXCIsIFwi4oCUXCJdKTtcclxuXHRcdFx0XHRcdFx0XHRcdGVudHJpZXMucHVzaChbXCJzb3VyY2VGaWxlXCIsIG1ldGFQYXRoXSk7XHJcblx0XHRcdFx0XHRcdFx0XHRmb3IgKGNvbnN0IFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyhmbSkpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKGsgPT09IFwicG9zaXRpb25cIikgY29udGludWU7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IGtsID0gay50b0xvd2VyQ2FzZSgpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0a2wgPT09IFwicHJvamVjdG5hbWVcIiB8fFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGtsID09PSBcInByb2plY3RcIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGVudHJpZXMucHVzaChbYGZyb250bWF0dGVyLiR7a31gLCB2XSk7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcdFx0XHRcIltQcm9qZWN0c10gRmFpbGVkIHRvIHJlYWQgc291cmNlIGZyb250bWF0dGVyOlwiLFxyXG5cdFx0XHRcdFx0XHRcdGVcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIEJ1aWxkIGRldGFpbHMgZnJvbSBlbmhhbmNlZCBmaXJzdCwgZmFsbGJhY2sgdG8gdGFzayBtZXRhZGF0YVxyXG5cdFx0XHRcdGNvbnN0IHNvdXJjZU9iajogUmVjb3JkPHN0cmluZywgYW55PiA9XHJcblx0XHRcdFx0XHRPYmplY3Qua2V5cyhlbmhhbmNlZCkubGVuZ3RoID4gMFxyXG5cdFx0XHRcdFx0XHQ/IGVuaGFuY2VkXHJcblx0XHRcdFx0XHRcdDogdGFza0ZvclJlc29sdmUubWV0YWRhdGEgfHwge307XHJcblx0XHRcdFx0Y29uc3QgYmxhY2tsaXN0ID0gbmV3IFNldChbXHJcblx0XHRcdFx0XHRcInRnUHJvamVjdFwiLFxyXG5cdFx0XHRcdFx0XCJwcm9qZWN0XCIsXHJcblx0XHRcdFx0XHRcImNoaWxkcmVuXCIsXHJcblx0XHRcdFx0XHRcImNoaWxkcmVuSWRzXCIsXHJcblx0XHRcdFx0XHRcInBhcmVudFwiLFxyXG5cdFx0XHRcdFx0XCJwYXJlbnRJZFwiLFxyXG5cdFx0XHRcdFx0XCJsaXN0TWFya2VyXCIsXHJcblx0XHRcdFx0XHRcImluZGVudExldmVsXCIsXHJcblx0XHRcdFx0XHRcImFjdHVhbEluZGVudFwiLFxyXG5cdFx0XHRcdFx0XCJvcmlnaW5hbE1hcmtkb3duXCIsXHJcblx0XHRcdFx0XHRcImxpbmVcIixcclxuXHRcdFx0XHRcdFwiY29tbWVudFwiLFxyXG5cdFx0XHRcdFx0XCJoZWFkaW5nXCIsXHJcblx0XHRcdFx0XHRcIl9zdWJ0YXNrSW5oZXJpdGFuY2VSdWxlc1wiLFxyXG5cdFx0XHRcdFx0XCJtZXRhZGF0YVwiLFxyXG5cdFx0XHRcdF0pO1xyXG5cdFx0XHRcdGZvciAoY29uc3QgW2ssIHZSYXddIG9mIE9iamVjdC5lbnRyaWVzKHNvdXJjZU9iaikpIHtcclxuXHRcdFx0XHRcdGlmIChibGFja2xpc3QuaGFzKGspKSBjb250aW51ZTtcclxuXHRcdFx0XHRcdGlmICh2UmF3ID09PSB1bmRlZmluZWQgfHwgdlJhdyA9PT0gbnVsbCB8fCB2UmF3ID09PSBcIlwiKVxyXG5cdFx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHRcdC8vIGF2b2lkIGR1cGxpY2F0ZXM6IGlmIGtleSBhbHJlYWR5IGNvbWVzIGZyb20gZnJvbnRtYXR0ZXIsIHNraXAgcGxhaW4ga2V5XHJcblx0XHRcdFx0XHRpZiAoZm1LZXlzICYmIGZtS2V5cy5oYXMoaykpIGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0bGV0IHY6IGFueSA9IHZSYXc7XHJcblx0XHRcdFx0XHQvLyBGb3JtYXQgYXJyYXlzL29iamVjdHNcclxuXHRcdFx0XHRcdGlmIChBcnJheS5pc0FycmF5KHYpKSB7XHJcblx0XHRcdFx0XHRcdGlmICh2Lmxlbmd0aCA9PT0gMCkgY29udGludWU7XHJcblx0XHRcdFx0XHRcdGlmIChrID09PSBcInRhZ3NcIiB8fCBrID09PSBcImRlcGVuZHNPblwiKSB7XHJcblx0XHRcdFx0XHRcdFx0diA9IHYuam9pbihcIiwgXCIpO1xyXG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdC8vIFNraXAgbm9pc3kgYXJyYXlzIGJ5IGRlZmF1bHRcclxuXHRcdFx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSBlbHNlIGlmICh0eXBlb2YgdiA9PT0gXCJvYmplY3RcIikge1xyXG5cdFx0XHRcdFx0XHQvLyBTa2lwIG5lc3RlZCBvYmplY3RzIGJ5IGRlZmF1bHQgdG8gYXZvaWQgbm9pc2VcclxuXHRcdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHQvLyBGb3JtYXQga25vd24gZGF0ZS1saWtlIGZpZWxkc1xyXG5cdFx0XHRcdFx0Y29uc3Qga2wgPSBrLnRvTG93ZXJDYXNlKCk7XHJcblx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdCgvZGF0ZSQvaS50ZXN0KGspIHx8IGtsLmVuZHNXaXRoKFwiZGF0ZVwiKSkgJiZcclxuXHRcdFx0XHRcdFx0dHlwZW9mIHYgIT09IFwic3RyaW5nXCJcclxuXHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBuID0gTnVtYmVyKHYpO1xyXG5cdFx0XHRcdFx0XHRpZiAoIU51bWJlci5pc05hTihuKSAmJiBuID4gMWUxMCkge1xyXG5cdFx0XHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdFx0XHR2ID0gbmV3IERhdGUobikudG9Mb2NhbGVTdHJpbmcoKTtcclxuXHRcdFx0XHRcdFx0XHR9IGNhdGNoIHt9XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGVudHJpZXMucHVzaChbaywgdl0pO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gUmVuZGVyIGVudHJpZXNcclxuXHRcdFx0XHRsaXN0LmVtcHR5KCk7XHJcblx0XHRcdFx0ZW50cmllcy5mb3JFYWNoKChbaywgdl0pID0+IHtcclxuXHRcdFx0XHRcdGNvbnN0IHJvdyA9IGxpc3QuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRcdFx0YXR0cjoge1xyXG5cdFx0XHRcdFx0XHRcdHN0eWxlOiBcImRpc3BsYXk6ZmxleDsgZ2FwOjhweDsgYWxpZ24taXRlbXM6Y2VudGVyOyBwYWRkaW5nOjJweCAwXCJcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRjb25zdCBrZXlFbCA9IHJvdy5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdFx0XHRhdHRyOiB7XHJcblx0XHRcdFx0XHRcdFx0c3R5bGU6IFwib3BhY2l0eTowLjc7IG1pbi13aWR0aDoxMjBweDtcIlxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdGtleUVsLnNldFRleHQoU3RyaW5nKGspKTtcclxuXHRcdFx0XHRcdGNvbnN0IHZhbEVsID0gcm93LmNyZWF0ZURpdigpO1xyXG5cdFx0XHRcdFx0dmFsRWwuc2V0VGV4dChcclxuXHRcdFx0XHRcdFx0dHlwZW9mIHYgPT09IFwic3RyaW5nXCIgPyB2IDogSlNPTi5zdHJpbmdpZnkodilcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIElmIHBvcG92ZXIgaXMgb3BlbiBhbmQgc2VsZWN0aW9uIGNoYW5nZWQsIHJlZnJlc2ggY29udGVudFxyXG5cdFx0aWYgKHRoaXMucHJvamVjdFByb3BzUG9wb3ZlckVsICYmIHNlbGVjdGVkUHJvamVjdCkge1xyXG5cdFx0XHRpZiAodGhpcy5jdXJyZW50SW5mb1Byb2plY3QgIT09IHNlbGVjdGVkUHJvamVjdCkge1xyXG5cdFx0XHRcdHRoaXMuY3VycmVudEluZm9Qcm9qZWN0ID0gc2VsZWN0ZWRQcm9qZWN0O1xyXG5cdFx0XHRcdC8vIFJlY3JlYXRlIHRoZSBwb3BvdmVyIHRvIHJlZmxlY3QgbmV3IHNlbGVjdGlvblxyXG5cdFx0XHRcdHRoaXMudGVhcmRvd25Qcm9qZWN0UHJvcHNVSSgpO1xyXG5cdFx0XHRcdHRoaXMucHJvamVjdFByb3BzQnRuRWw/LmNsaWNrKCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKiBDbG9zZSBhbmQgY2xlYW51cCB0aGUgcG9wb3ZlciAqL1xyXG5cdHByaXZhdGUgdGVhcmRvd25Qcm9qZWN0UHJvcHNVSSgpOiB2b2lkIHtcclxuXHRcdC8vIENsZWFyIGhhbmRsZXIgcmVmZXJlbmNlcyAoZXZlbnRzIGFyZSBhdXRvLWNsZWFuZWQgYnkgcmVnaXN0ZXJEb21FdmVudClcclxuXHRcdHRoaXMub3V0c2lkZUNsaWNrSGFuZGxlciA9IHVuZGVmaW5lZDtcclxuXHRcdHRoaXMuZXNjS2V5SGFuZGxlciA9IHVuZGVmaW5lZDtcclxuXHJcblx0XHQvLyBEZXN0cm95IHBvcHBlciBhbmQgcmVtb3ZlIHBvcG92ZXJcclxuXHRcdGlmIChcclxuXHRcdFx0dGhpcy5wcm9qZWN0UHJvcHNQb3BwZXIgJiZcclxuXHRcdFx0dHlwZW9mIHRoaXMucHJvamVjdFByb3BzUG9wcGVyLmRlc3Ryb3kgPT09IFwiZnVuY3Rpb25cIlxyXG5cdFx0KSB7XHJcblx0XHRcdHRoaXMucHJvamVjdFByb3BzUG9wcGVyLmRlc3Ryb3koKTtcclxuXHRcdH1cclxuXHRcdHRoaXMucHJvamVjdFByb3BzUG9wcGVyID0gbnVsbDtcclxuXHRcdGlmICh0aGlzLnByb2plY3RQcm9wc1BvcG92ZXJFbCkge1xyXG5cdFx0XHR0aGlzLnByb2plY3RQcm9wc1BvcG92ZXJFbC5yZW1vdmUoKTtcclxuXHRcdH1cclxuXHRcdHRoaXMucHJvamVjdFByb3BzUG9wb3ZlckVsID0gbnVsbDtcclxuXHR9XHJcblxyXG5cdG9udW5sb2FkKCkge1xyXG5cdFx0aWYgKHRoaXMucHJvamVjdFRyZWVDb21wb25lbnQpIHtcclxuXHRcdFx0dGhpcy5wcm9qZWN0VHJlZUNvbXBvbmVudC51bmxvYWQoKTtcclxuXHRcdH1cclxuXHRcdHRoaXMuY29udGFpbmVyRWwuZW1wdHkoKTtcclxuXHRcdHRoaXMuY29udGFpbmVyRWwucmVtb3ZlKCk7XHJcblx0fVxyXG5cclxuXHQvLyBUb2dnbGUgbGVmdCBjb2x1bW4gdmlzaWJpbGl0eSB3aXRoIGFuaW1hdGlvbiBzdXBwb3J0XHJcblx0cHJpdmF0ZSB0b2dnbGVMZWZ0Q29sdW1uVmlzaWJpbGl0eSh2aXNpYmxlPzogYm9vbGVhbikge1xyXG5cdFx0aWYgKHZpc2libGUgPT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHQvLyBUb2dnbGUgYmFzZWQgb24gY3VycmVudCBzdGF0ZVxyXG5cdFx0XHR2aXNpYmxlID0gIXRoaXMubGVmdENvbHVtbkVsLmhhc0NsYXNzKFwiaXMtdmlzaWJsZVwiKTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAodmlzaWJsZSkge1xyXG5cdFx0XHR0aGlzLmxlZnRDb2x1bW5FbC5hZGRDbGFzcyhcImlzLXZpc2libGVcIik7XHJcblx0XHRcdHRoaXMubGVmdENvbHVtbkVsLnNob3coKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMubGVmdENvbHVtbkVsLnJlbW92ZUNsYXNzKFwiaXMtdmlzaWJsZVwiKTtcclxuXHJcblx0XHRcdC8vIFdhaXQgZm9yIGFuaW1hdGlvbiB0byBjb21wbGV0ZSBiZWZvcmUgaGlkaW5nXHJcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdGlmICghdGhpcy5sZWZ0Q29sdW1uRWwuaGFzQ2xhc3MoXCJpcy12aXNpYmxlXCIpKSB7XHJcblx0XHRcdFx0XHR0aGlzLmxlZnRDb2x1bW5FbC5oaWRlKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LCAzMDApOyAvLyBNYXRjaCBDU1MgdHJhbnNpdGlvbiBkdXJhdGlvblxyXG5cdFx0fVxyXG5cdH1cclxufVxyXG4iXX0=