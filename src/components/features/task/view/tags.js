import { Component, setIcon, ExtraButtonComponent, Platform, } from "obsidian";
import { t } from "@/translations/helper";
import "@/styles/tag-view.css";
import { TaskListRendererComponent } from "./TaskList";
import { sortTasks } from "@/commands/sortTaskCommands";
import { getInitialViewMode, saveViewMode } from "@/utils/ui/view-mode-utils";
export class TagsComponent extends Component {
    constructor(parentEl, app, plugin, params = {}) {
        super();
        this.parentEl = parentEl;
        this.app = app;
        this.plugin = plugin;
        this.params = params;
        // Child components
        this.taskComponents = [];
        this.treeComponents = [];
        this.mainTaskRenderer = null;
        // State
        this.allTasks = [];
        this.filteredTasks = [];
        this.tagSections = [];
        this.selectedTags = {
            tags: [],
            tasks: [],
            isMultiSelect: false,
        };
        this.allTagsMap = new Map(); // tag -> taskIds
        this.isTreeView = false;
        this.allTasksMap = new Map();
    }
    onload() {
        // Create main container
        this.containerEl = this.parentEl.createDiv({
            cls: "tags-container",
        });
        // Create content container for columns
        const contentContainer = this.containerEl.createDiv({
            cls: "tags-content",
        });
        // Left column: create tags list
        this.createLeftColumn(contentContainer);
        // Right column: create task list for selected tags
        this.createRightColumn(contentContainer);
        // Initialize view mode from saved state or global default
        this.initializeViewMode();
    }
    createTagsHeader() {
        this.tagsHeaderEl = this.containerEl.createDiv({
            cls: "tags-header",
        });
        // Title and task count
        const titleContainer = this.tagsHeaderEl.createDiv({
            cls: "tags-title-container",
        });
        this.titleEl = titleContainer.createDiv({
            cls: "tags-title",
            text: t("Tags"),
        });
        this.countEl = titleContainer.createDiv({
            cls: "tags-count",
        });
        this.countEl.setText("0 tags");
    }
    createLeftColumn(parentEl) {
        this.leftColumnEl = parentEl.createDiv({
            cls: "tags-left-column",
        });
        // Header for the tags section
        const headerEl = this.leftColumnEl.createDiv({
            cls: "tags-sidebar-header",
        });
        const headerTitle = headerEl.createDiv({
            cls: "tags-sidebar-title",
            text: t("Tags"),
        });
        // Add multi-select toggle button
        const multiSelectBtn = headerEl.createDiv({
            cls: "tags-multi-select-btn",
        });
        setIcon(multiSelectBtn, "list-plus");
        multiSelectBtn.setAttribute("aria-label", t("Toggle multi-select"));
        this.registerDomEvent(multiSelectBtn, "click", () => {
            this.toggleMultiSelect();
        });
        // Add close button for mobile
        if (Platform.isPhone) {
            const closeBtn = headerEl.createDiv({
                cls: "tags-sidebar-close",
            });
            new ExtraButtonComponent(closeBtn).setIcon("x").onClick(() => {
                this.toggleLeftColumnVisibility(false);
            });
        }
        // Tags list container
        this.tagsListEl = this.leftColumnEl.createDiv({
            cls: "tags-sidebar-list",
        });
    }
    createRightColumn(parentEl) {
        this.taskContainerEl = parentEl.createDiv({
            cls: "tags-right-column",
        });
        // Task list header
        const taskHeaderEl = this.taskContainerEl.createDiv({
            cls: "tags-task-header",
        });
        // Add sidebar toggle button for mobile
        if (Platform.isPhone) {
            taskHeaderEl.createEl("div", {
                cls: "tags-sidebar-toggle",
            }, (el) => {
                new ExtraButtonComponent(el)
                    .setIcon("sidebar")
                    .onClick(() => {
                    this.toggleLeftColumnVisibility();
                });
            });
        }
        const taskTitleEl = taskHeaderEl.createDiv({
            cls: "tags-task-title",
        });
        taskTitleEl.setText(t("Tasks"));
        const taskCountEl = taskHeaderEl.createDiv({
            cls: "tags-task-count",
        });
        taskCountEl.setText("0 tasks");
        // Add view toggle button
        const viewToggleBtn = taskHeaderEl.createDiv({
            cls: "view-toggle-btn",
        });
        setIcon(viewToggleBtn, "list");
        viewToggleBtn.setAttribute("aria-label", t("Toggle list/tree view"));
        this.registerDomEvent(viewToggleBtn, "click", () => {
            this.toggleViewMode();
        });
        // Task list container
        this.taskListContainerEl = this.taskContainerEl.createDiv({
            cls: "tags-task-list",
        });
    }
    setTasks(tasks) {
        this.allTasks = tasks;
        this.allTasksMap = new Map(this.allTasks.map((task) => [task.id, task]));
        this.buildTagsIndex();
        this.renderTagsList();
        // If tags were already selected, update the tasks
        if (this.selectedTags.tags.length > 0) {
            this.updateSelectedTasks();
        }
        else {
            this.cleanupRenderers();
            this.renderEmptyTaskList(t("Select a tag to see related tasks"));
        }
    }
    buildTagsIndex() {
        var _a;
        // Clear existing index
        this.allTagsMap.clear();
        // Build a map of tags to task IDs
        this.allTasks.forEach((task) => {
            if (task.metadata.tags && task.metadata.tags.length > 0) {
                task.metadata.tags.forEach((tag) => {
                    var _a;
                    // Skip non-string tags
                    if (typeof tag !== "string") {
                        return;
                    }
                    if (!this.allTagsMap.has(tag)) {
                        this.allTagsMap.set(tag, new Set());
                    }
                    (_a = this.allTagsMap.get(tag)) === null || _a === void 0 ? void 0 : _a.add(task.id);
                });
            }
        });
        // Update tags count
        (_a = this.countEl) === null || _a === void 0 ? void 0 : _a.setText(`${this.allTagsMap.size} tags`);
    }
    renderTagsList() {
        // Clear existing list
        this.tagsListEl.empty();
        // Sort tags alphabetically
        const sortedTags = Array.from(this.allTagsMap.keys()).sort();
        // Create hierarchical structure for nested tags
        const tagHierarchy = {};
        sortedTags.forEach((tag) => {
            const parts = tag.split("/");
            let current = tagHierarchy;
            parts.forEach((part, index) => {
                if (!current[part]) {
                    current[part] = {
                        _tasks: new Set(),
                        _path: parts.slice(0, index + 1).join("/"),
                    };
                }
                // Add tasks to this level
                const taskIds = this.allTagsMap.get(tag);
                if (taskIds) {
                    taskIds.forEach((id) => current[part]._tasks.add(id));
                }
                current = current[part];
            });
        });
        // Render the hierarchy
        this.renderTagHierarchy(tagHierarchy, this.tagsListEl, 0);
    }
    renderTagHierarchy(node, parentEl, level) {
        // Sort keys alphabetically, but exclude metadata properties
        const keys = Object.keys(node)
            .filter((k) => !k.startsWith("_"))
            .sort();
        keys.forEach((key) => {
            const childNode = node[key];
            const fullPath = childNode._path;
            const taskCount = childNode._tasks.size;
            // Create tag item
            const tagItem = parentEl.createDiv({
                cls: "tag-list-item",
                attr: {
                    "data-tag": fullPath,
                    "aria-label": fullPath,
                },
            });
            // Add indent based on level
            if (level > 0) {
                const indentEl = tagItem.createDiv({
                    cls: "tag-indent",
                });
                indentEl.style.width = `${level * 20}px`;
            }
            // Tag icon and color
            const tagIconEl = tagItem.createDiv({
                cls: "tag-icon",
            });
            setIcon(tagIconEl, "hash");
            // Tag name and count
            const tagNameEl = tagItem.createDiv({
                cls: "tag-name",
            });
            tagNameEl.setText(key.replace("#", ""));
            const tagCountEl = tagItem.createDiv({
                cls: "tag-count",
            });
            tagCountEl.setText(taskCount.toString());
            // Store the full tag path as data attribute
            tagItem.dataset.tag = fullPath;
            // Check if this tag is already selected
            if (this.selectedTags.tags.includes(fullPath)) {
                tagItem.classList.add("selected");
            }
            // Add click handler
            this.registerDomEvent(tagItem, "click", (e) => {
                this.handleTagSelection(fullPath, e.ctrlKey || e.metaKey);
            });
            // If this node has children, render them recursively
            const hasChildren = Object.keys(childNode).filter((k) => !k.startsWith("_"))
                .length > 0;
            if (hasChildren) {
                // Create a container for children
                const childrenContainer = parentEl.createDiv({
                    cls: "tag-children",
                });
                // Render children
                this.renderTagHierarchy(childNode, childrenContainer, level + 1);
            }
        });
    }
    handleTagSelection(tag, isCtrlPressed) {
        if (this.selectedTags.isMultiSelect || isCtrlPressed) {
            // Multi-select mode
            const index = this.selectedTags.tags.indexOf(tag);
            if (index === -1) {
                // Add to selection
                this.selectedTags.tags.push(tag);
            }
            else {
                // Remove from selection
                this.selectedTags.tags.splice(index, 1);
            }
            // If no tags selected and not in multi-select mode, reset
            if (this.selectedTags.tags.length === 0 &&
                !this.selectedTags.isMultiSelect) {
                this.cleanupRenderers();
                this.renderEmptyTaskList(t("Select a tag to see related tasks"));
                return;
            }
        }
        else {
            // Single-select mode
            this.selectedTags.tags = [tag];
        }
        // Update UI to show which tags are selected
        const tagItems = this.tagsListEl.querySelectorAll(".tag-list-item");
        tagItems.forEach((item) => {
            const itemTag = item.getAttribute("data-tag");
            if (itemTag && this.selectedTags.tags.includes(itemTag)) {
                item.classList.add("selected");
            }
            else {
                item.classList.remove("selected");
            }
        });
        // Update tasks based on selected tags
        this.updateSelectedTasks();
        // Hide sidebar on mobile after selection
        if (Platform.isPhone) {
            this.toggleLeftColumnVisibility(false);
        }
    }
    toggleMultiSelect() {
        this.selectedTags.isMultiSelect = !this.selectedTags.isMultiSelect;
        // Update UI to reflect multi-select mode
        if (this.selectedTags.isMultiSelect) {
            this.containerEl.classList.add("multi-select-mode");
        }
        else {
            this.containerEl.classList.remove("multi-select-mode");
            // If no tags are selected, reset the view
            if (this.selectedTags.tags.length === 0) {
                this.cleanupRenderers();
                this.renderEmptyTaskList(t("Select a tag to see related tasks"));
            }
        }
    }
    /**
     * Initialize view mode from saved state or global default
     */
    initializeViewMode() {
        var _a;
        this.isTreeView = getInitialViewMode(this.app, this.plugin, "tags");
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
        saveViewMode(this.app, "tags", this.isTreeView);
        // Re-render the task list with the new mode
        this.renderTaskList();
    }
    updateSelectedTasks() {
        if (this.selectedTags.tags.length === 0) {
            this.cleanupRenderers();
            this.renderEmptyTaskList(t("Select a tag to see related tasks"));
            return;
        }
        // Get tasks that have ANY of the selected tags (OR logic)
        console.log(this.selectedTags.tags);
        const taskSets = this.selectedTags.tags.map((tag) => {
            // For each selected tag, include tasks from child tags
            const matchingTasks = new Set();
            // Add direct matches from this exact tag
            const directMatches = this.allTagsMap.get(tag);
            if (directMatches) {
                directMatches.forEach((id) => matchingTasks.add(id));
            }
            // Add matches from child tags (those that start with parent tag path + /)
            this.allTagsMap.forEach((taskIds, childTag) => {
                if (childTag !== tag && childTag.startsWith(tag + "/")) {
                    taskIds.forEach((id) => matchingTasks.add(id));
                }
            });
            return matchingTasks;
        });
        console.log(taskSets, this.allTagsMap);
        if (taskSets.length === 0) {
            this.filteredTasks = [];
        }
        else {
            // Join all sets (OR logic)
            const resultTaskIds = new Set();
            // Union all sets
            taskSets.forEach((set) => {
                set.forEach((id) => resultTaskIds.add(id));
            });
            // Convert task IDs to actual task objects
            this.filteredTasks = this.allTasks.filter((task) => resultTaskIds.has(task.id));
            const viewConfig = this.plugin.settings.viewConfiguration.find((view) => view.id === "tags");
            if ((viewConfig === null || viewConfig === void 0 ? void 0 : viewConfig.sortCriteria) &&
                viewConfig.sortCriteria.length > 0) {
                this.filteredTasks = sortTasks(this.filteredTasks, viewConfig.sortCriteria, this.plugin.settings);
            }
            else {
                this.filteredTasks.sort((a, b) => {
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
        }
        // Decide whether to create sections or render flat/tree
        if (!this.isTreeView && this.selectedTags.tags.length > 1) {
            this.createTagSections();
        }
        else {
            // Render directly without sections
            this.tagSections = [];
            this.renderTaskList();
        }
    }
    createTagSections() {
        // Clear previous sections and their renderers
        this.cleanupRenderers();
        this.tagSections = [];
        // Group tasks by the selected tags they match (including children)
        const tagTaskMap = new Map();
        this.selectedTags.tags.forEach((tag) => {
            const tasksForThisTagBranch = this.filteredTasks.filter((task) => {
                if (!task.metadata.tags)
                    return false;
                return task.metadata.tags.some((taskTag) => 
                // Skip non-string tags
                typeof taskTag === "string" &&
                    (taskTag === tag || taskTag.startsWith(tag + "/")));
            });
            if (tasksForThisTagBranch.length > 0) {
                // Ensure tasks aren't duplicated across sections if selection overlaps (e.g., #parent and #parent/child)
                // This simple grouping might show duplicates if a task has both selected tags.
                // For OR logic display, maybe better to render all `filteredTasks` under one combined header?
                // Let's stick to sections per selected tag for now.
                tagTaskMap.set(tag, tasksForThisTagBranch);
            }
        });
        // Create section objects
        tagTaskMap.forEach((tasks, tag) => {
            this.tagSections.push({
                tag: tag,
                tasks: tasks,
                isExpanded: true,
                // Renderer will be created in renderTagSections
            });
        });
        // Sort sections by tag name
        this.tagSections.sort((a, b) => a.tag.localeCompare(b.tag));
        // Update the task list view
        this.renderTaskList();
    }
    updateTaskListHeader() {
        const taskHeaderEl = this.taskContainerEl.querySelector(".tags-task-title");
        if (taskHeaderEl) {
            if (this.selectedTags.tags.length === 1) {
                taskHeaderEl.textContent = `#${this.selectedTags.tags[0].replace("#", "")}`;
            }
            else if (this.selectedTags.tags.length > 1) {
                taskHeaderEl.textContent = `${this.selectedTags.tags.length} ${t("tags selected")}`;
            }
            else {
                taskHeaderEl.textContent = t("Tasks");
            }
        }
        const taskCountEl = this.taskContainerEl.querySelector(".tags-task-count");
        if (taskCountEl) {
            // Use filteredTasks length for the total count across selections/sections
            taskCountEl.textContent = `${this.filteredTasks.length} ${t("tasks")}`;
        }
    }
    cleanupRenderers() {
        // Cleanup main renderer if it exists
        if (this.mainTaskRenderer) {
            this.removeChild(this.mainTaskRenderer);
            this.mainTaskRenderer = null;
        }
        // Cleanup section renderers
        this.tagSections.forEach((section) => {
            if (section.renderer) {
                this.removeChild(section.renderer);
                section.renderer = undefined;
            }
        });
        // Clear the container manually as renderers might not have cleared it if just removed
        this.taskListContainerEl.empty();
    }
    renderTaskList() {
        this.cleanupRenderers(); // Clean up any previous renderers
        this.updateTaskListHeader(); // Update title and count
        if (this.filteredTasks.length === 0 &&
            this.selectedTags.tags.length > 0) {
            // We have selected tags, but no tasks match
            this.renderEmptyTaskList(t("No tasks with the selected tags"));
            return;
        }
        if (this.filteredTasks.length === 0 &&
            this.selectedTags.tags.length === 0) {
            // No tags selected yet
            this.renderEmptyTaskList(t("Select a tag to see related tasks"));
            return;
        }
        // Decide rendering mode: sections or flat/tree
        const useSections = !this.isTreeView &&
            this.tagSections.length > 0 &&
            this.selectedTags.tags.length > 1;
        if (useSections) {
            this.renderTagSections();
        }
        else {
            // Use a single main renderer for flat list or tree view
            this.mainTaskRenderer = new TaskListRendererComponent(this, this.taskListContainerEl, this.plugin, this.app, "tags");
            this.params.onTaskSelected &&
                (this.mainTaskRenderer.onTaskSelected =
                    this.params.onTaskSelected);
            this.params.onTaskCompleted &&
                (this.mainTaskRenderer.onTaskCompleted =
                    this.params.onTaskCompleted);
            this.params.onTaskUpdate &&
                (this.mainTaskRenderer.onTaskUpdate = this.params.onTaskUpdate);
            this.params.onTaskContextMenu &&
                (this.mainTaskRenderer.onTaskContextMenu =
                    this.params.onTaskContextMenu);
            this.mainTaskRenderer.renderTasks(this.filteredTasks, this.isTreeView, this.allTasksMap, 
            // Empty message handled above, so this shouldn't be shown
            t("No tasks found."));
        }
    }
    renderTagSections() {
        // Assumes cleanupRenderers was called before this
        this.tagSections.forEach((section) => {
            const sectionEl = this.taskListContainerEl.createDiv({
                cls: "task-tag-section",
            });
            // Section header
            const headerEl = sectionEl.createDiv({ cls: "tag-section-header" });
            const toggleEl = headerEl.createDiv({ cls: "section-toggle" });
            setIcon(toggleEl, section.isExpanded ? "chevron-down" : "chevron-right");
            const titleEl = headerEl.createDiv({ cls: "section-title" });
            titleEl.setText(`#${section.tag.replace("#", "")}`);
            const countEl = headerEl.createDiv({ cls: "section-count" });
            countEl.setText(`${section.tasks.length}`);
            // Task container for the renderer
            const taskListEl = sectionEl.createDiv({ cls: "section-tasks" });
            if (!section.isExpanded) {
                taskListEl.hide();
            }
            // Create a renderer for this section
            section.renderer = new TaskListRendererComponent(this, taskListEl, // Render inside this section's container
            this.plugin, this.app, "tags");
            this.params.onTaskSelected &&
                (section.renderer.onTaskSelected = this.params.onTaskSelected);
            this.params.onTaskCompleted &&
                (section.renderer.onTaskCompleted =
                    this.params.onTaskCompleted);
            this.params.onTaskUpdate &&
                (section.renderer.onTaskUpdate = this.params.onTaskUpdate);
            this.params.onTaskContextMenu &&
                (section.renderer.onTaskContextMenu =
                    this.params.onTaskContextMenu);
            // Render tasks for this section (always list view within sections)
            section.renderer.renderTasks(section.tasks, this.isTreeView, this.allTasksMap, t("No tasks found for this tag."));
            // Register toggle event
            this.registerDomEvent(headerEl, "click", () => {
                section.isExpanded = !section.isExpanded;
                setIcon(toggleEl, section.isExpanded ? "chevron-down" : "chevron-right");
                section.isExpanded ? taskListEl.show() : taskListEl.hide();
            });
        });
    }
    renderEmptyTaskList(message) {
        this.cleanupRenderers(); // Ensure no renderers are active
        this.taskListContainerEl.empty(); // Clear the main container
        // Optionally update header (already done in renderTaskList)
        // this.updateTaskListHeader();
        // Display the message
        const emptyEl = this.taskListContainerEl.createDiv({
            cls: "tags-empty-state",
        });
        emptyEl.setText(message);
    }
    updateTask(updatedTask) {
        let needsFullRefresh = false;
        const taskIndex = this.allTasks.findIndex((t) => t.id === updatedTask.id);
        if (taskIndex !== -1) {
            const oldTask = this.allTasks[taskIndex];
            // Check if tags changed, necessitating a rebuild/re-render
            const tagsChanged = !oldTask.metadata.tags ||
                !updatedTask.metadata.tags ||
                oldTask.metadata.tags.join(",") !==
                    updatedTask.metadata.tags.join(",");
            if (tagsChanged) {
                needsFullRefresh = true;
            }
            this.allTasks[taskIndex] = updatedTask;
        }
        else {
            this.allTasks.push(updatedTask);
            needsFullRefresh = true; // New task, requires full refresh
        }
        // If tags changed or task is new, rebuild index and fully refresh UI
        if (needsFullRefresh) {
            this.buildTagsIndex();
            this.renderTagsList(); // Update left sidebar
            this.updateSelectedTasks(); // Recalculate filtered tasks and re-render right panel
        }
        else {
            // Otherwise, update the task in the filtered list
            const filteredIndex = this.filteredTasks.findIndex((t) => t.id === updatedTask.id);
            if (filteredIndex !== -1) {
                this.filteredTasks[filteredIndex] = updatedTask;
                // Find the correct renderer (main or section) and update the task
                if (this.mainTaskRenderer) {
                    this.mainTaskRenderer.updateTask(updatedTask);
                }
                else {
                    this.tagSections.forEach((section) => {
                        var _a, _b;
                        // Check if the task belongs to this section's tag branch
                        if ((_a = updatedTask.metadata.tags) === null || _a === void 0 ? void 0 : _a.some((taskTag) => 
                        // Skip non-string tags
                        typeof taskTag === "string" &&
                            (taskTag === section.tag ||
                                taskTag.startsWith(section.tag + "/")))) {
                            // Check if the task is actually in this section's list
                            if (section.tasks.some((t) => t.id === updatedTask.id)) {
                                (_b = section.renderer) === null || _b === void 0 ? void 0 : _b.updateTask(updatedTask);
                            }
                        }
                    });
                }
                // Optional: Re-sort if needed, then call renderTaskList or relevant section update
            }
            else {
                // Task might have become visible/invisible due to update, requires re-filtering
                this.updateSelectedTasks();
            }
        }
    }
    onunload() {
        // Renderers are children, cleaned up automatically.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFncy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRhZ3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUVOLFNBQVMsRUFDVCxPQUFPLEVBQ1Asb0JBQW9CLEVBQ3BCLFFBQVEsR0FDUixNQUFNLFVBQVUsQ0FBQztBQUdsQixPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDMUMsT0FBTyx1QkFBdUIsQ0FBQztBQUUvQixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFdkQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3hELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxZQUFZLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQWU5RSxNQUFNLE9BQU8sYUFBYyxTQUFRLFNBQVM7SUE0QjNDLFlBQ1MsUUFBcUIsRUFDckIsR0FBUSxFQUNSLE1BQTZCLEVBQzdCLFNBS0osRUFBRTtRQUVOLEtBQUssRUFBRSxDQUFDO1FBVkEsYUFBUSxHQUFSLFFBQVEsQ0FBYTtRQUNyQixRQUFHLEdBQUgsR0FBRyxDQUFLO1FBQ1IsV0FBTSxHQUFOLE1BQU0sQ0FBdUI7UUFDN0IsV0FBTSxHQUFOLE1BQU0sQ0FLUjtRQTFCUCxtQkFBbUI7UUFDWCxtQkFBYyxHQUE0QixFQUFFLENBQUM7UUFDN0MsbUJBQWMsR0FBNEIsRUFBRSxDQUFDO1FBQzdDLHFCQUFnQixHQUFxQyxJQUFJLENBQUM7UUFFbEUsUUFBUTtRQUNBLGFBQVEsR0FBVyxFQUFFLENBQUM7UUFDdEIsa0JBQWEsR0FBVyxFQUFFLENBQUM7UUFDM0IsZ0JBQVcsR0FBaUIsRUFBRSxDQUFDO1FBQy9CLGlCQUFZLEdBQWlCO1lBQ3BDLElBQUksRUFBRSxFQUFFO1lBQ1IsS0FBSyxFQUFFLEVBQUU7WUFDVCxhQUFhLEVBQUUsS0FBSztTQUNwQixDQUFDO1FBQ00sZUFBVSxHQUE2QixJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMs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TyxFQUFFO1lBQ1osSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDekMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQztTQUN6QjthQUFNO1lBQ04sSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUM7WUFFNUMsK0NBQStDO1lBQy9DLFVBQVUsQ0FBQyxHQUFHLEVBQUU7Z0JBQ2YsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxFQUFFO29CQUM5QyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDO2lCQUN6QjtZQUNGLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLGdDQUFnQztTQUN6QztJQUNGLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XHJcblx0QXBwLFxyXG5cdENvbXBvbmVudCxcclxuXHRzZXRJY29uLFxyXG5cdEV4dHJhQnV0dG9uQ29tcG9uZW50LFxyXG5cdFBsYXRmb3JtLFxyXG59IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBUYXNrIH0gZnJvbSBcIkAvdHlwZXMvdGFza1wiO1xyXG5pbXBvcnQgeyBUYXNrTGlzdEl0ZW1Db21wb25lbnQgfSBmcm9tIFwiLi9saXN0SXRlbVwiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgXCJAL3N0eWxlcy90YWctdmlldy5jc3NcIjtcclxuaW1wb3J0IHsgVGFza1RyZWVJdGVtQ29tcG9uZW50IH0gZnJvbSBcIi4vdHJlZUl0ZW1cIjtcclxuaW1wb3J0IHsgVGFza0xpc3RSZW5kZXJlckNvbXBvbmVudCB9IGZyb20gXCIuL1Rhc2tMaXN0XCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjtcclxuaW1wb3J0IHsgc29ydFRhc2tzIH0gZnJvbSBcIkAvY29tbWFuZHMvc29ydFRhc2tDb21tYW5kc1wiO1xyXG5pbXBvcnQgeyBnZXRJbml0aWFsVmlld01vZGUsIHNhdmVWaWV3TW9kZSB9IGZyb20gXCJAL3V0aWxzL3VpL3ZpZXctbW9kZS11dGlsc1wiO1xyXG5cclxuaW50ZXJmYWNlIFNlbGVjdGVkVGFncyB7XHJcblx0dGFnczogc3RyaW5nW107XHJcblx0dGFza3M6IFRhc2tbXTtcclxuXHRpc011bHRpU2VsZWN0OiBib29sZWFuO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgVGFnU2VjdGlvbiB7XHJcblx0dGFnOiBzdHJpbmc7XHJcblx0dGFza3M6IFRhc2tbXTtcclxuXHRpc0V4cGFuZGVkOiBib29sZWFuO1xyXG5cdHJlbmRlcmVyPzogVGFza0xpc3RSZW5kZXJlckNvbXBvbmVudDtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFRhZ3NDb21wb25lbnQgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdC8vIFVJIEVsZW1lbnRzXHJcblx0cHVibGljIGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIHRhZ3NIZWFkZXJFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSB0YWdzTGlzdEVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIHRhc2tDb250YWluZXJFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSB0YXNrTGlzdENvbnRhaW5lckVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIHRpdGxlRWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgY291bnRFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBsZWZ0Q29sdW1uRWw6IEhUTUxFbGVtZW50O1xyXG5cclxuXHQvLyBDaGlsZCBjb21wb25lbnRzXHJcblx0cHJpdmF0ZSB0YXNrQ29tcG9uZW50czogVGFza0xpc3RJdGVtQ29tcG9uZW50W10gPSBbXTtcclxuXHRwcml2YXRlIHRyZWVDb21wb25lbnRzOiBUYXNrVHJlZUl0ZW1Db21wb25lbnRbXSA9IFtdO1xyXG5cdHByaXZhdGUgbWFpblRhc2tSZW5kZXJlcjogVGFza0xpc3RSZW5kZXJlckNvbXBvbmVudCB8IG51bGwgPSBudWxsO1xyXG5cclxuXHQvLyBTdGF0ZVxyXG5cdHByaXZhdGUgYWxsVGFza3M6IFRhc2tbXSA9IFtdO1xyXG5cdHByaXZhdGUgZmlsdGVyZWRUYXNrczogVGFza1tdID0gW107XHJcblx0cHJpdmF0ZSB0YWdTZWN0aW9uczogVGFnU2VjdGlvbltdID0gW107XHJcblx0cHJpdmF0ZSBzZWxlY3RlZFRhZ3M6IFNlbGVjdGVkVGFncyA9IHtcclxuXHRcdHRhZ3M6IFtdLFxyXG5cdFx0dGFza3M6IFtdLFxyXG5cdFx0aXNNdWx0aVNlbGVjdDogZmFsc2UsXHJcblx0fTtcclxuXHRwcml2YXRlIGFsbFRhZ3NNYXA6IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PiA9IG5ldyBNYXAoKTsgLy8gdGFnIC0+IHRhc2tJZHNcclxuXHRwcml2YXRlIGlzVHJlZVZpZXc6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHRwcml2YXRlIGFsbFRhc2tzTWFwOiBNYXA8c3RyaW5nLCBUYXNrPiA9IG5ldyBNYXAoKTtcclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHByaXZhdGUgcGFyZW50RWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0cHJpdmF0ZSBhcHA6IEFwcCxcclxuXHRcdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRwcml2YXRlIHBhcmFtczoge1xyXG5cdFx0XHRvblRhc2tTZWxlY3RlZD86ICh0YXNrOiBUYXNrIHwgbnVsbCkgPT4gdm9pZDtcclxuXHRcdFx0b25UYXNrQ29tcGxldGVkPzogKHRhc2s6IFRhc2spID0+IHZvaWQ7XHJcblx0XHRcdG9uVGFza1VwZGF0ZT86ICh0YXNrOiBUYXNrLCB1cGRhdGVkVGFzazogVGFzaykgPT4gUHJvbWlzZTx2b2lkPjtcclxuXHRcdFx0b25UYXNrQ29udGV4dE1lbnU/OiAoZXZlbnQ6IE1vdXNlRXZlbnQsIHRhc2s6IFRhc2spID0+IHZvaWQ7XHJcblx0XHR9ID0ge31cclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0fVxyXG5cclxuXHRvbmxvYWQoKSB7XHJcblx0XHQvLyBDcmVhdGUgbWFpbiBjb250YWluZXJcclxuXHRcdHRoaXMuY29udGFpbmVyRWwgPSB0aGlzLnBhcmVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ0YWdzLWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGNvbnRlbnQgY29udGFpbmVyIGZvciBjb2x1bW5zXHJcblx0XHRjb25zdCBjb250ZW50Q29udGFpbmVyID0gdGhpcy5jb250YWluZXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwidGFncy1jb250ZW50XCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBMZWZ0IGNvbHVtbjogY3JlYXRlIHRhZ3MgbGlzdFxyXG5cdFx0dGhpcy5jcmVhdGVMZWZ0Q29sdW1uKGNvbnRlbnRDb250YWluZXIpO1xyXG5cclxuXHRcdC8vIFJpZ2h0IGNvbHVtbjogY3JlYXRlIHRhc2sgbGlzdCBmb3Igc2VsZWN0ZWQgdGFnc1xyXG5cdFx0dGhpcy5jcmVhdGVSaWdodENvbHVtbihjb250ZW50Q29udGFpbmVyKTtcclxuXHJcblx0XHQvLyBJbml0aWFsaXplIHZpZXcgbW9kZSBmcm9tIHNhdmVkIHN0YXRlIG9yIGdsb2JhbCBkZWZhdWx0XHJcblx0XHR0aGlzLmluaXRpYWxpemVWaWV3TW9kZSgpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVUYWdzSGVhZGVyKCkge1xyXG5cdFx0dGhpcy50YWdzSGVhZGVyRWwgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ0YWdzLWhlYWRlclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gVGl0bGUgYW5kIHRhc2sgY291bnRcclxuXHRcdGNvbnN0IHRpdGxlQ29udGFpbmVyID0gdGhpcy50YWdzSGVhZGVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInRhZ3MtdGl0bGUtY29udGFpbmVyXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLnRpdGxlRWwgPSB0aXRsZUNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwidGFncy10aXRsZVwiLFxyXG5cdFx0XHR0ZXh0OiB0KFwiVGFnc1wiKSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuY291bnRFbCA9IHRpdGxlQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ0YWdzLWNvdW50XCIsXHJcblx0XHR9KTtcclxuXHRcdHRoaXMuY291bnRFbC5zZXRUZXh0KFwiMCB0YWdzXCIpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVMZWZ0Q29sdW1uKHBhcmVudEVsOiBIVE1MRWxlbWVudCkge1xyXG5cdFx0dGhpcy5sZWZ0Q29sdW1uRWwgPSBwYXJlbnRFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwidGFncy1sZWZ0LWNvbHVtblwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gSGVhZGVyIGZvciB0aGUgdGFncyBzZWN0aW9uXHJcblx0XHRjb25zdCBoZWFkZXJFbCA9IHRoaXMubGVmdENvbHVtbkVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ0YWdzLXNpZGViYXItaGVhZGVyXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCBoZWFkZXJUaXRsZSA9IGhlYWRlckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ0YWdzLXNpZGViYXItdGl0bGVcIixcclxuXHRcdFx0dGV4dDogdChcIlRhZ3NcIiksXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBBZGQgbXVsdGktc2VsZWN0IHRvZ2dsZSBidXR0b25cclxuXHRcdGNvbnN0IG11bHRpU2VsZWN0QnRuID0gaGVhZGVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInRhZ3MtbXVsdGktc2VsZWN0LWJ0blwiLFxyXG5cdFx0fSk7XHJcblx0XHRzZXRJY29uKG11bHRpU2VsZWN0QnRuLCBcImxpc3QtcGx1c1wiKTtcclxuXHRcdG11bHRpU2VsZWN0QnRuLnNldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIiwgdChcIlRvZ2dsZSBtdWx0aS1zZWxlY3RcIikpO1xyXG5cclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChtdWx0aVNlbGVjdEJ0biwgXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdHRoaXMudG9nZ2xlTXVsdGlTZWxlY3QoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEFkZCBjbG9zZSBidXR0b24gZm9yIG1vYmlsZVxyXG5cdFx0aWYgKFBsYXRmb3JtLmlzUGhvbmUpIHtcclxuXHRcdFx0Y29uc3QgY2xvc2VCdG4gPSBoZWFkZXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJ0YWdzLXNpZGViYXItY2xvc2VcIixcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRuZXcgRXh0cmFCdXR0b25Db21wb25lbnQoY2xvc2VCdG4pLnNldEljb24oXCJ4XCIpLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMudG9nZ2xlTGVmdENvbHVtblZpc2liaWxpdHkoZmFsc2UpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBUYWdzIGxpc3QgY29udGFpbmVyXHJcblx0XHR0aGlzLnRhZ3NMaXN0RWwgPSB0aGlzLmxlZnRDb2x1bW5FbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwidGFncy1zaWRlYmFyLWxpc3RcIixcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVSaWdodENvbHVtbihwYXJlbnRFbDogSFRNTEVsZW1lbnQpIHtcclxuXHRcdHRoaXMudGFza0NvbnRhaW5lckVsID0gcGFyZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInRhZ3MtcmlnaHQtY29sdW1uXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBUYXNrIGxpc3QgaGVhZGVyXHJcblx0XHRjb25zdCB0YXNrSGVhZGVyRWwgPSB0aGlzLnRhc2tDb250YWluZXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwidGFncy10YXNrLWhlYWRlclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQWRkIHNpZGViYXIgdG9nZ2xlIGJ1dHRvbiBmb3IgbW9iaWxlXHJcblx0XHRpZiAoUGxhdGZvcm0uaXNQaG9uZSkge1xyXG5cdFx0XHR0YXNrSGVhZGVyRWwuY3JlYXRlRWwoXHJcblx0XHRcdFx0XCJkaXZcIixcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRjbHM6IFwidGFncy1zaWRlYmFyLXRvZ2dsZVwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0KGVsKSA9PiB7XHJcblx0XHRcdFx0XHRuZXcgRXh0cmFCdXR0b25Db21wb25lbnQoZWwpXHJcblx0XHRcdFx0XHRcdC5zZXRJY29uKFwic2lkZWJhclwiKVxyXG5cdFx0XHRcdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy50b2dnbGVMZWZ0Q29sdW1uVmlzaWJpbGl0eSgpO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgdGFza1RpdGxlRWwgPSB0YXNrSGVhZGVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInRhZ3MtdGFzay10aXRsZVwiLFxyXG5cdFx0fSk7XHJcblx0XHR0YXNrVGl0bGVFbC5zZXRUZXh0KHQoXCJUYXNrc1wiKSk7XHJcblxyXG5cdFx0Y29uc3QgdGFza0NvdW50RWwgPSB0YXNrSGVhZGVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInRhZ3MtdGFzay1jb3VudFwiLFxyXG5cdFx0fSk7XHJcblx0XHR0YXNrQ291bnRFbC5zZXRUZXh0KFwiMCB0YXNrc1wiKTtcclxuXHJcblx0XHQvLyBBZGQgdmlldyB0b2dnbGUgYnV0dG9uXHJcblx0XHRjb25zdCB2aWV3VG9nZ2xlQnRuID0gdGFza0hlYWRlckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ2aWV3LXRvZ2dsZS1idG5cIixcclxuXHRcdH0pO1xyXG5cdFx0c2V0SWNvbih2aWV3VG9nZ2xlQnRuLCBcImxpc3RcIik7XHJcblx0XHR2aWV3VG9nZ2xlQnRuLnNldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIiwgdChcIlRvZ2dsZSBsaXN0L3RyZWUgdmlld1wiKSk7XHJcblxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KHZpZXdUb2dnbGVCdG4sIFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHR0aGlzLnRvZ2dsZVZpZXdNb2RlKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBUYXNrIGxpc3QgY29udGFpbmVyXHJcblx0XHR0aGlzLnRhc2tMaXN0Q29udGFpbmVyRWwgPSB0aGlzLnRhc2tDb250YWluZXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwidGFncy10YXNrLWxpc3RcIixcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHVibGljIHNldFRhc2tzKHRhc2tzOiBUYXNrW10pIHtcclxuXHRcdHRoaXMuYWxsVGFza3MgPSB0YXNrcztcclxuXHRcdHRoaXMuYWxsVGFza3NNYXAgPSBuZXcgTWFwKFxyXG5cdFx0XHR0aGlzLmFsbFRhc2tzLm1hcCgodGFzaykgPT4gW3Rhc2suaWQsIHRhc2tdKVxyXG5cdFx0KTtcclxuXHRcdHRoaXMuYnVpbGRUYWdzSW5kZXgoKTtcclxuXHRcdHRoaXMucmVuZGVyVGFnc0xpc3QoKTtcclxuXHJcblx0XHQvLyBJZiB0YWdzIHdlcmUgYWxyZWFkeSBzZWxlY3RlZCwgdXBkYXRlIHRoZSB0YXNrc1xyXG5cdFx0aWYgKHRoaXMuc2VsZWN0ZWRUYWdzLnRhZ3MubGVuZ3RoID4gMCkge1xyXG5cdFx0XHR0aGlzLnVwZGF0ZVNlbGVjdGVkVGFza3MoKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMuY2xlYW51cFJlbmRlcmVycygpO1xyXG5cdFx0XHR0aGlzLnJlbmRlckVtcHR5VGFza0xpc3QodChcIlNlbGVjdCBhIHRhZyB0byBzZWUgcmVsYXRlZCB0YXNrc1wiKSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGJ1aWxkVGFnc0luZGV4KCkge1xyXG5cdFx0Ly8gQ2xlYXIgZXhpc3RpbmcgaW5kZXhcclxuXHRcdHRoaXMuYWxsVGFnc01hcC5jbGVhcigpO1xyXG5cclxuXHRcdC8vIEJ1aWxkIGEgbWFwIG9mIHRhZ3MgdG8gdGFzayBJRHNcclxuXHRcdHRoaXMuYWxsVGFza3MuZm9yRWFjaCgodGFzaykgPT4ge1xyXG5cdFx0XHRpZiAodGFzay5tZXRhZGF0YS50YWdzICYmIHRhc2subWV0YWRhdGEudGFncy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0dGFzay5tZXRhZGF0YS50YWdzLmZvckVhY2goKHRhZykgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gU2tpcCBub24tc3RyaW5nIHRhZ3NcclxuXHRcdFx0XHRcdGlmICh0eXBlb2YgdGFnICE9PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRpZiAoIXRoaXMuYWxsVGFnc01hcC5oYXModGFnKSkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLmFsbFRhZ3NNYXAuc2V0KHRhZywgbmV3IFNldCgpKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdHRoaXMuYWxsVGFnc01hcC5nZXQodGFnKT8uYWRkKHRhc2suaWQpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBVcGRhdGUgdGFncyBjb3VudFxyXG5cdFx0dGhpcy5jb3VudEVsPy5zZXRUZXh0KGAke3RoaXMuYWxsVGFnc01hcC5zaXplfSB0YWdzYCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbmRlclRhZ3NMaXN0KCkge1xyXG5cdFx0Ly8gQ2xlYXIgZXhpc3RpbmcgbGlzdFxyXG5cdFx0dGhpcy50YWdzTGlzdEVsLmVtcHR5KCk7XHJcblxyXG5cdFx0Ly8gU29ydCB0YWdzIGFscGhhYmV0aWNhbGx5XHJcblx0XHRjb25zdCBzb3J0ZWRUYWdzID0gQXJyYXkuZnJvbSh0aGlzLmFsbFRhZ3NNYXAua2V5cygpKS5zb3J0KCk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGhpZXJhcmNoaWNhbCBzdHJ1Y3R1cmUgZm9yIG5lc3RlZCB0YWdzXHJcblx0XHRjb25zdCB0YWdIaWVyYXJjaHk6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcclxuXHJcblx0XHRzb3J0ZWRUYWdzLmZvckVhY2goKHRhZykgPT4ge1xyXG5cdFx0XHRjb25zdCBwYXJ0cyA9IHRhZy5zcGxpdChcIi9cIik7XHJcblx0XHRcdGxldCBjdXJyZW50ID0gdGFnSGllcmFyY2h5O1xyXG5cclxuXHRcdFx0cGFydHMuZm9yRWFjaCgocGFydCwgaW5kZXgpID0+IHtcclxuXHRcdFx0XHRpZiAoIWN1cnJlbnRbcGFydF0pIHtcclxuXHRcdFx0XHRcdGN1cnJlbnRbcGFydF0gPSB7XHJcblx0XHRcdFx0XHRcdF90YXNrczogbmV3IFNldCgpLFxyXG5cdFx0XHRcdFx0XHRfcGF0aDogcGFydHMuc2xpY2UoMCwgaW5kZXggKyAxKS5qb2luKFwiL1wiKSxcclxuXHRcdFx0XHRcdH07XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBBZGQgdGFza3MgdG8gdGhpcyBsZXZlbFxyXG5cdFx0XHRcdGNvbnN0IHRhc2tJZHMgPSB0aGlzLmFsbFRhZ3NNYXAuZ2V0KHRhZyk7XHJcblx0XHRcdFx0aWYgKHRhc2tJZHMpIHtcclxuXHRcdFx0XHRcdHRhc2tJZHMuZm9yRWFjaCgoaWQpID0+IGN1cnJlbnRbcGFydF0uX3Rhc2tzLmFkZChpZCkpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Y3VycmVudCA9IGN1cnJlbnRbcGFydF07XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gUmVuZGVyIHRoZSBoaWVyYXJjaHlcclxuXHRcdHRoaXMucmVuZGVyVGFnSGllcmFyY2h5KHRhZ0hpZXJhcmNoeSwgdGhpcy50YWdzTGlzdEVsLCAwKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyVGFnSGllcmFyY2h5KFxyXG5cdFx0bm9kZTogUmVjb3JkPHN0cmluZywgYW55PixcclxuXHRcdHBhcmVudEVsOiBIVE1MRWxlbWVudCxcclxuXHRcdGxldmVsOiBudW1iZXJcclxuXHQpIHtcclxuXHRcdC8vIFNvcnQga2V5cyBhbHBoYWJldGljYWxseSwgYnV0IGV4Y2x1ZGUgbWV0YWRhdGEgcHJvcGVydGllc1xyXG5cdFx0Y29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKG5vZGUpXHJcblx0XHRcdC5maWx0ZXIoKGspID0+ICFrLnN0YXJ0c1dpdGgoXCJfXCIpKVxyXG5cdFx0XHQuc29ydCgpO1xyXG5cclxuXHRcdGtleXMuZm9yRWFjaCgoa2V5KSA9PiB7XHJcblx0XHRcdGNvbnN0IGNoaWxkTm9kZSA9IG5vZGVba2V5XTtcclxuXHRcdFx0Y29uc3QgZnVsbFBhdGggPSBjaGlsZE5vZGUuX3BhdGg7XHJcblx0XHRcdGNvbnN0IHRhc2tDb3VudCA9IGNoaWxkTm9kZS5fdGFza3Muc2l6ZTtcclxuXHJcblx0XHRcdC8vIENyZWF0ZSB0YWcgaXRlbVxyXG5cdFx0XHRjb25zdCB0YWdJdGVtID0gcGFyZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwidGFnLWxpc3QtaXRlbVwiLFxyXG5cdFx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHRcdFwiZGF0YS10YWdcIjogZnVsbFBhdGgsXHJcblx0XHRcdFx0XHRcImFyaWEtbGFiZWxcIjogZnVsbFBhdGgsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBBZGQgaW5kZW50IGJhc2VkIG9uIGxldmVsXHJcblx0XHRcdGlmIChsZXZlbCA+IDApIHtcclxuXHRcdFx0XHRjb25zdCBpbmRlbnRFbCA9IHRhZ0l0ZW0uY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRcdGNsczogXCJ0YWctaW5kZW50XCIsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0aW5kZW50RWwuc3R5bGUud2lkdGggPSBgJHtsZXZlbCAqIDIwfXB4YDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVGFnIGljb24gYW5kIGNvbG9yXHJcblx0XHRcdGNvbnN0IHRhZ0ljb25FbCA9IHRhZ0l0ZW0uY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwidGFnLWljb25cIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdHNldEljb24odGFnSWNvbkVsLCBcImhhc2hcIik7XHJcblxyXG5cdFx0XHQvLyBUYWcgbmFtZSBhbmQgY291bnRcclxuXHRcdFx0Y29uc3QgdGFnTmFtZUVsID0gdGFnSXRlbS5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJ0YWctbmFtZVwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0dGFnTmFtZUVsLnNldFRleHQoa2V5LnJlcGxhY2UoXCIjXCIsIFwiXCIpKTtcclxuXHJcblx0XHRcdGNvbnN0IHRhZ0NvdW50RWwgPSB0YWdJdGVtLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcInRhZy1jb3VudFwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0dGFnQ291bnRFbC5zZXRUZXh0KHRhc2tDb3VudC50b1N0cmluZygpKTtcclxuXHJcblx0XHRcdC8vIFN0b3JlIHRoZSBmdWxsIHRhZyBwYXRoIGFzIGRhdGEgYXR0cmlidXRlXHJcblx0XHRcdHRhZ0l0ZW0uZGF0YXNldC50YWcgPSBmdWxsUGF0aDtcclxuXHJcblx0XHRcdC8vIENoZWNrIGlmIHRoaXMgdGFnIGlzIGFscmVhZHkgc2VsZWN0ZWRcclxuXHRcdFx0aWYgKHRoaXMuc2VsZWN0ZWRUYWdzLnRhZ3MuaW5jbHVkZXMoZnVsbFBhdGgpKSB7XHJcblx0XHRcdFx0dGFnSXRlbS5jbGFzc0xpc3QuYWRkKFwic2VsZWN0ZWRcIik7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEFkZCBjbGljayBoYW5kbGVyXHJcblx0XHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudCh0YWdJdGVtLCBcImNsaWNrXCIsIChlKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5oYW5kbGVUYWdTZWxlY3Rpb24oZnVsbFBhdGgsIGUuY3RybEtleSB8fCBlLm1ldGFLZXkpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIElmIHRoaXMgbm9kZSBoYXMgY2hpbGRyZW4sIHJlbmRlciB0aGVtIHJlY3Vyc2l2ZWx5XHJcblx0XHRcdGNvbnN0IGhhc0NoaWxkcmVuID1cclxuXHRcdFx0XHRPYmplY3Qua2V5cyhjaGlsZE5vZGUpLmZpbHRlcigoaykgPT4gIWsuc3RhcnRzV2l0aChcIl9cIikpXHJcblx0XHRcdFx0XHQubGVuZ3RoID4gMDtcclxuXHRcdFx0aWYgKGhhc0NoaWxkcmVuKSB7XHJcblx0XHRcdFx0Ly8gQ3JlYXRlIGEgY29udGFpbmVyIGZvciBjaGlsZHJlblxyXG5cdFx0XHRcdGNvbnN0IGNoaWxkcmVuQ29udGFpbmVyID0gcGFyZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRcdGNsczogXCJ0YWctY2hpbGRyZW5cIixcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gUmVuZGVyIGNoaWxkcmVuXHJcblx0XHRcdFx0dGhpcy5yZW5kZXJUYWdIaWVyYXJjaHkoXHJcblx0XHRcdFx0XHRjaGlsZE5vZGUsXHJcblx0XHRcdFx0XHRjaGlsZHJlbkNvbnRhaW5lcixcclxuXHRcdFx0XHRcdGxldmVsICsgMVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBoYW5kbGVUYWdTZWxlY3Rpb24odGFnOiBzdHJpbmcsIGlzQ3RybFByZXNzZWQ6IGJvb2xlYW4pIHtcclxuXHRcdGlmICh0aGlzLnNlbGVjdGVkVGFncy5pc011bHRpU2VsZWN0IHx8IGlzQ3RybFByZXNzZWQpIHtcclxuXHRcdFx0Ly8gTXVsdGktc2VsZWN0IG1vZGVcclxuXHRcdFx0Y29uc3QgaW5kZXggPSB0aGlzLnNlbGVjdGVkVGFncy50YWdzLmluZGV4T2YodGFnKTtcclxuXHRcdFx0aWYgKGluZGV4ID09PSAtMSkge1xyXG5cdFx0XHRcdC8vIEFkZCB0byBzZWxlY3Rpb25cclxuXHRcdFx0XHR0aGlzLnNlbGVjdGVkVGFncy50YWdzLnB1c2godGFnKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBSZW1vdmUgZnJvbSBzZWxlY3Rpb25cclxuXHRcdFx0XHR0aGlzLnNlbGVjdGVkVGFncy50YWdzLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIElmIG5vIHRhZ3Mgc2VsZWN0ZWQgYW5kIG5vdCBpbiBtdWx0aS1zZWxlY3QgbW9kZSwgcmVzZXRcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHRoaXMuc2VsZWN0ZWRUYWdzLnRhZ3MubGVuZ3RoID09PSAwICYmXHJcblx0XHRcdFx0IXRoaXMuc2VsZWN0ZWRUYWdzLmlzTXVsdGlTZWxlY3RcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0dGhpcy5jbGVhbnVwUmVuZGVyZXJzKCk7XHJcblx0XHRcdFx0dGhpcy5yZW5kZXJFbXB0eVRhc2tMaXN0KFxyXG5cdFx0XHRcdFx0dChcIlNlbGVjdCBhIHRhZyB0byBzZWUgcmVsYXRlZCB0YXNrc1wiKVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBTaW5nbGUtc2VsZWN0IG1vZGVcclxuXHRcdFx0dGhpcy5zZWxlY3RlZFRhZ3MudGFncyA9IFt0YWddO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFVwZGF0ZSBVSSB0byBzaG93IHdoaWNoIHRhZ3MgYXJlIHNlbGVjdGVkXHJcblx0XHRjb25zdCB0YWdJdGVtcyA9IHRoaXMudGFnc0xpc3RFbC5xdWVyeVNlbGVjdG9yQWxsKFwiLnRhZy1saXN0LWl0ZW1cIik7XHJcblx0XHR0YWdJdGVtcy5mb3JFYWNoKChpdGVtKSA9PiB7XHJcblx0XHRcdGNvbnN0IGl0ZW1UYWcgPSBpdGVtLmdldEF0dHJpYnV0ZShcImRhdGEtdGFnXCIpO1xyXG5cdFx0XHRpZiAoaXRlbVRhZyAmJiB0aGlzLnNlbGVjdGVkVGFncy50YWdzLmluY2x1ZGVzKGl0ZW1UYWcpKSB7XHJcblx0XHRcdFx0aXRlbS5jbGFzc0xpc3QuYWRkKFwic2VsZWN0ZWRcIik7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0aXRlbS5jbGFzc0xpc3QucmVtb3ZlKFwic2VsZWN0ZWRcIik7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSB0YXNrcyBiYXNlZCBvbiBzZWxlY3RlZCB0YWdzXHJcblx0XHR0aGlzLnVwZGF0ZVNlbGVjdGVkVGFza3MoKTtcclxuXHJcblx0XHQvLyBIaWRlIHNpZGViYXIgb24gbW9iaWxlIGFmdGVyIHNlbGVjdGlvblxyXG5cdFx0aWYgKFBsYXRmb3JtLmlzUGhvbmUpIHtcclxuXHRcdFx0dGhpcy50b2dnbGVMZWZ0Q29sdW1uVmlzaWJpbGl0eShmYWxzZSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHRvZ2dsZU11bHRpU2VsZWN0KCkge1xyXG5cdFx0dGhpcy5zZWxlY3RlZFRhZ3MuaXNNdWx0aVNlbGVjdCA9ICF0aGlzLnNlbGVjdGVkVGFncy5pc011bHRpU2VsZWN0O1xyXG5cclxuXHRcdC8vIFVwZGF0ZSBVSSB0byByZWZsZWN0IG11bHRpLXNlbGVjdCBtb2RlXHJcblx0XHRpZiAodGhpcy5zZWxlY3RlZFRhZ3MuaXNNdWx0aVNlbGVjdCkge1xyXG5cdFx0XHR0aGlzLmNvbnRhaW5lckVsLmNsYXNzTGlzdC5hZGQoXCJtdWx0aS1zZWxlY3QtbW9kZVwiKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMuY29udGFpbmVyRWwuY2xhc3NMaXN0LnJlbW92ZShcIm11bHRpLXNlbGVjdC1tb2RlXCIpO1xyXG5cclxuXHRcdFx0Ly8gSWYgbm8gdGFncyBhcmUgc2VsZWN0ZWQsIHJlc2V0IHRoZSB2aWV3XHJcblx0XHRcdGlmICh0aGlzLnNlbGVjdGVkVGFncy50YWdzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRcdHRoaXMuY2xlYW51cFJlbmRlcmVycygpO1xyXG5cdFx0XHRcdHRoaXMucmVuZGVyRW1wdHlUYXNrTGlzdChcclxuXHRcdFx0XHRcdHQoXCJTZWxlY3QgYSB0YWcgdG8gc2VlIHJlbGF0ZWQgdGFza3NcIilcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBJbml0aWFsaXplIHZpZXcgbW9kZSBmcm9tIHNhdmVkIHN0YXRlIG9yIGdsb2JhbCBkZWZhdWx0XHJcblx0ICovXHJcblx0cHJpdmF0ZSBpbml0aWFsaXplVmlld01vZGUoKSB7XHJcblx0XHR0aGlzLmlzVHJlZVZpZXcgPSBnZXRJbml0aWFsVmlld01vZGUodGhpcy5hcHAsIHRoaXMucGx1Z2luLCBcInRhZ3NcIik7XHJcblx0XHQvLyBVcGRhdGUgdGhlIHRvZ2dsZSBidXR0b24gaWNvbiB0byBtYXRjaCB0aGUgaW5pdGlhbCBzdGF0ZVxyXG5cdFx0Y29uc3Qgdmlld1RvZ2dsZUJ0biA9IHRoaXMudGFza0NvbnRhaW5lckVsPy5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRcIi52aWV3LXRvZ2dsZS1idG5cIlxyXG5cdFx0KSBhcyBIVE1MRWxlbWVudDtcclxuXHRcdGlmICh2aWV3VG9nZ2xlQnRuKSB7XHJcblx0XHRcdHNldEljb24odmlld1RvZ2dsZUJ0biwgdGhpcy5pc1RyZWVWaWV3ID8gXCJnaXQtYnJhbmNoXCIgOiBcImxpc3RcIik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHRvZ2dsZVZpZXdNb2RlKCkge1xyXG5cdFx0dGhpcy5pc1RyZWVWaWV3ID0gIXRoaXMuaXNUcmVlVmlldztcclxuXHJcblx0XHQvLyBVcGRhdGUgdG9nZ2xlIGJ1dHRvbiBpY29uXHJcblx0XHRjb25zdCB2aWV3VG9nZ2xlQnRuID0gdGhpcy50YXNrQ29udGFpbmVyRWwucXVlcnlTZWxlY3RvcihcclxuXHRcdFx0XCIudmlldy10b2dnbGUtYnRuXCJcclxuXHRcdCkgYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRpZiAodmlld1RvZ2dsZUJ0bikge1xyXG5cdFx0XHRzZXRJY29uKHZpZXdUb2dnbGVCdG4sIHRoaXMuaXNUcmVlVmlldyA/IFwiZ2l0LWJyYW5jaFwiIDogXCJsaXN0XCIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFNhdmUgdGhlIG5ldyB2aWV3IG1vZGUgc3RhdGVcclxuXHRcdHNhdmVWaWV3TW9kZSh0aGlzLmFwcCwgXCJ0YWdzXCIsIHRoaXMuaXNUcmVlVmlldyk7XHJcblxyXG5cdFx0Ly8gUmUtcmVuZGVyIHRoZSB0YXNrIGxpc3Qgd2l0aCB0aGUgbmV3IG1vZGVcclxuXHRcdHRoaXMucmVuZGVyVGFza0xpc3QoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgdXBkYXRlU2VsZWN0ZWRUYXNrcygpIHtcclxuXHRcdGlmICh0aGlzLnNlbGVjdGVkVGFncy50YWdzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHR0aGlzLmNsZWFudXBSZW5kZXJlcnMoKTtcclxuXHRcdFx0dGhpcy5yZW5kZXJFbXB0eVRhc2tMaXN0KHQoXCJTZWxlY3QgYSB0YWcgdG8gc2VlIHJlbGF0ZWQgdGFza3NcIikpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gR2V0IHRhc2tzIHRoYXQgaGF2ZSBBTlkgb2YgdGhlIHNlbGVjdGVkIHRhZ3MgKE9SIGxvZ2ljKVxyXG5cdFx0Y29uc29sZS5sb2codGhpcy5zZWxlY3RlZFRhZ3MudGFncyk7XHJcblx0XHRjb25zdCB0YXNrU2V0czogU2V0PHN0cmluZz5bXSA9IHRoaXMuc2VsZWN0ZWRUYWdzLnRhZ3MubWFwKCh0YWcpID0+IHtcclxuXHRcdFx0Ly8gRm9yIGVhY2ggc2VsZWN0ZWQgdGFnLCBpbmNsdWRlIHRhc2tzIGZyb20gY2hpbGQgdGFnc1xyXG5cdFx0XHRjb25zdCBtYXRjaGluZ1Rhc2tzID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcblxyXG5cdFx0XHQvLyBBZGQgZGlyZWN0IG1hdGNoZXMgZnJvbSB0aGlzIGV4YWN0IHRhZ1xyXG5cdFx0XHRjb25zdCBkaXJlY3RNYXRjaGVzID0gdGhpcy5hbGxUYWdzTWFwLmdldCh0YWcpO1xyXG5cdFx0XHRpZiAoZGlyZWN0TWF0Y2hlcykge1xyXG5cdFx0XHRcdGRpcmVjdE1hdGNoZXMuZm9yRWFjaCgoaWQpID0+IG1hdGNoaW5nVGFza3MuYWRkKGlkKSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEFkZCBtYXRjaGVzIGZyb20gY2hpbGQgdGFncyAodGhvc2UgdGhhdCBzdGFydCB3aXRoIHBhcmVudCB0YWcgcGF0aCArIC8pXHJcblx0XHRcdHRoaXMuYWxsVGFnc01hcC5mb3JFYWNoKCh0YXNrSWRzLCBjaGlsZFRhZykgPT4ge1xyXG5cdFx0XHRcdGlmIChjaGlsZFRhZyAhPT0gdGFnICYmIGNoaWxkVGFnLnN0YXJ0c1dpdGgodGFnICsgXCIvXCIpKSB7XHJcblx0XHRcdFx0XHR0YXNrSWRzLmZvckVhY2goKGlkKSA9PiBtYXRjaGluZ1Rhc2tzLmFkZChpZCkpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRyZXR1cm4gbWF0Y2hpbmdUYXNrcztcclxuXHRcdH0pO1xyXG5cdFx0Y29uc29sZS5sb2codGFza1NldHMsIHRoaXMuYWxsVGFnc01hcCk7XHJcblxyXG5cdFx0aWYgKHRhc2tTZXRzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHR0aGlzLmZpbHRlcmVkVGFza3MgPSBbXTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIEpvaW4gYWxsIHNldHMgKE9SIGxvZ2ljKVxyXG5cdFx0XHRjb25zdCByZXN1bHRUYXNrSWRzID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcblxyXG5cdFx0XHQvLyBVbmlvbiBhbGwgc2V0c1xyXG5cdFx0XHR0YXNrU2V0cy5mb3JFYWNoKChzZXQpID0+IHtcclxuXHRcdFx0XHRzZXQuZm9yRWFjaCgoaWQpID0+IHJlc3VsdFRhc2tJZHMuYWRkKGlkKSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQ29udmVydCB0YXNrIElEcyB0byBhY3R1YWwgdGFzayBvYmplY3RzXHJcblx0XHRcdHRoaXMuZmlsdGVyZWRUYXNrcyA9IHRoaXMuYWxsVGFza3MuZmlsdGVyKCh0YXNrKSA9PlxyXG5cdFx0XHRcdHJlc3VsdFRhc2tJZHMuaGFzKHRhc2suaWQpXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRjb25zdCB2aWV3Q29uZmlnID0gdGhpcy5wbHVnaW4uc2V0dGluZ3Mudmlld0NvbmZpZ3VyYXRpb24uZmluZChcclxuXHRcdFx0XHQodmlldykgPT4gdmlldy5pZCA9PT0gXCJ0YWdzXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHZpZXdDb25maWc/LnNvcnRDcml0ZXJpYSAmJlxyXG5cdFx0XHRcdHZpZXdDb25maWcuc29ydENyaXRlcmlhLmxlbmd0aCA+IDBcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0dGhpcy5maWx0ZXJlZFRhc2tzID0gc29ydFRhc2tzKFxyXG5cdFx0XHRcdFx0dGhpcy5maWx0ZXJlZFRhc2tzLFxyXG5cdFx0XHRcdFx0dmlld0NvbmZpZy5zb3J0Q3JpdGVyaWEsXHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5nc1xyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGhpcy5maWx0ZXJlZFRhc2tzLnNvcnQoKGEsIGIpID0+IHtcclxuXHRcdFx0XHRcdGlmIChhLmNvbXBsZXRlZCAhPT0gYi5jb21wbGV0ZWQpIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIGEuY29tcGxldGVkID8gMSA6IC0xO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIFRoZW4gYnkgcHJpb3JpdHkgKGhpZ2ggdG8gbG93KVxyXG5cdFx0XHRcdFx0Y29uc3QgcHJpb3JpdHlBID0gYS5tZXRhZGF0YS5wcmlvcml0eSB8fCAwO1xyXG5cdFx0XHRcdFx0Y29uc3QgcHJpb3JpdHlCID0gYi5tZXRhZGF0YS5wcmlvcml0eSB8fCAwO1xyXG5cdFx0XHRcdFx0aWYgKHByaW9yaXR5QSAhPT0gcHJpb3JpdHlCKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybiBwcmlvcml0eUIgLSBwcmlvcml0eUE7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gVGhlbiBieSBkdWUgZGF0ZSAoZWFybHkgdG8gbGF0ZSlcclxuXHRcdFx0XHRcdGNvbnN0IGR1ZURhdGVBID1cclxuXHRcdFx0XHRcdFx0YS5tZXRhZGF0YS5kdWVEYXRlIHx8IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSO1xyXG5cdFx0XHRcdFx0Y29uc3QgZHVlRGF0ZUIgPVxyXG5cdFx0XHRcdFx0XHRiLm1ldGFkYXRhLmR1ZURhdGUgfHwgTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVI7XHJcblx0XHRcdFx0XHRyZXR1cm4gZHVlRGF0ZUEgLSBkdWVEYXRlQjtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIERlY2lkZSB3aGV0aGVyIHRvIGNyZWF0ZSBzZWN0aW9ucyBvciByZW5kZXIgZmxhdC90cmVlXHJcblx0XHRpZiAoIXRoaXMuaXNUcmVlVmlldyAmJiB0aGlzLnNlbGVjdGVkVGFncy50YWdzLmxlbmd0aCA+IDEpIHtcclxuXHRcdFx0dGhpcy5jcmVhdGVUYWdTZWN0aW9ucygpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gUmVuZGVyIGRpcmVjdGx5IHdpdGhvdXQgc2VjdGlvbnNcclxuXHRcdFx0dGhpcy50YWdTZWN0aW9ucyA9IFtdO1xyXG5cdFx0XHR0aGlzLnJlbmRlclRhc2tMaXN0KCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNyZWF0ZVRhZ1NlY3Rpb25zKCkge1xyXG5cdFx0Ly8gQ2xlYXIgcHJldmlvdXMgc2VjdGlvbnMgYW5kIHRoZWlyIHJlbmRlcmVyc1xyXG5cdFx0dGhpcy5jbGVhbnVwUmVuZGVyZXJzKCk7XHJcblx0XHR0aGlzLnRhZ1NlY3Rpb25zID0gW107XHJcblxyXG5cdFx0Ly8gR3JvdXAgdGFza3MgYnkgdGhlIHNlbGVjdGVkIHRhZ3MgdGhleSBtYXRjaCAoaW5jbHVkaW5nIGNoaWxkcmVuKVxyXG5cdFx0Y29uc3QgdGFnVGFza01hcCA9IG5ldyBNYXA8c3RyaW5nLCBUYXNrW10+KCk7XHJcblx0XHR0aGlzLnNlbGVjdGVkVGFncy50YWdzLmZvckVhY2goKHRhZykgPT4ge1xyXG5cdFx0XHRjb25zdCB0YXNrc0ZvclRoaXNUYWdCcmFuY2ggPSB0aGlzLmZpbHRlcmVkVGFza3MuZmlsdGVyKCh0YXNrKSA9PiB7XHJcblx0XHRcdFx0aWYgKCF0YXNrLm1ldGFkYXRhLnRhZ3MpIHJldHVybiBmYWxzZTtcclxuXHRcdFx0XHRyZXR1cm4gdGFzay5tZXRhZGF0YS50YWdzLnNvbWUoXHJcblx0XHRcdFx0XHQodGFza1RhZykgPT5cclxuXHRcdFx0XHRcdFx0Ly8gU2tpcCBub24tc3RyaW5nIHRhZ3NcclxuXHRcdFx0XHRcdFx0dHlwZW9mIHRhc2tUYWcgPT09IFwic3RyaW5nXCIgJiZcclxuXHRcdFx0XHRcdFx0KHRhc2tUYWcgPT09IHRhZyB8fCB0YXNrVGFnLnN0YXJ0c1dpdGgodGFnICsgXCIvXCIpKVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0aWYgKHRhc2tzRm9yVGhpc1RhZ0JyYW5jaC5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0Ly8gRW5zdXJlIHRhc2tzIGFyZW4ndCBkdXBsaWNhdGVkIGFjcm9zcyBzZWN0aW9ucyBpZiBzZWxlY3Rpb24gb3ZlcmxhcHMgKGUuZy4sICNwYXJlbnQgYW5kICNwYXJlbnQvY2hpbGQpXHJcblx0XHRcdFx0Ly8gVGhpcyBzaW1wbGUgZ3JvdXBpbmcgbWlnaHQgc2hvdyBkdXBsaWNhdGVzIGlmIGEgdGFzayBoYXMgYm90aCBzZWxlY3RlZCB0YWdzLlxyXG5cdFx0XHRcdC8vIEZvciBPUiBsb2dpYyBkaXNwbGF5LCBtYXliZSBiZXR0ZXIgdG8gcmVuZGVyIGFsbCBgZmlsdGVyZWRUYXNrc2AgdW5kZXIgb25lIGNvbWJpbmVkIGhlYWRlcj9cclxuXHRcdFx0XHQvLyBMZXQncyBzdGljayB0byBzZWN0aW9ucyBwZXIgc2VsZWN0ZWQgdGFnIGZvciBub3cuXHJcblx0XHRcdFx0dGFnVGFza01hcC5zZXQodGFnLCB0YXNrc0ZvclRoaXNUYWdCcmFuY2gpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDcmVhdGUgc2VjdGlvbiBvYmplY3RzXHJcblx0XHR0YWdUYXNrTWFwLmZvckVhY2goKHRhc2tzLCB0YWcpID0+IHtcclxuXHRcdFx0dGhpcy50YWdTZWN0aW9ucy5wdXNoKHtcclxuXHRcdFx0XHR0YWc6IHRhZyxcclxuXHRcdFx0XHR0YXNrczogdGFza3MsXHJcblx0XHRcdFx0aXNFeHBhbmRlZDogdHJ1ZSxcclxuXHRcdFx0XHQvLyBSZW5kZXJlciB3aWxsIGJlIGNyZWF0ZWQgaW4gcmVuZGVyVGFnU2VjdGlvbnNcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBTb3J0IHNlY3Rpb25zIGJ5IHRhZyBuYW1lXHJcblx0XHR0aGlzLnRhZ1NlY3Rpb25zLnNvcnQoKGEsIGIpID0+IGEudGFnLmxvY2FsZUNvbXBhcmUoYi50YWcpKTtcclxuXHJcblx0XHQvLyBVcGRhdGUgdGhlIHRhc2sgbGlzdCB2aWV3XHJcblx0XHR0aGlzLnJlbmRlclRhc2tMaXN0KCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHVwZGF0ZVRhc2tMaXN0SGVhZGVyKCkge1xyXG5cdFx0Y29uc3QgdGFza0hlYWRlckVsID1cclxuXHRcdFx0dGhpcy50YXNrQ29udGFpbmVyRWwucXVlcnlTZWxlY3RvcihcIi50YWdzLXRhc2stdGl0bGVcIik7XHJcblx0XHRpZiAodGFza0hlYWRlckVsKSB7XHJcblx0XHRcdGlmICh0aGlzLnNlbGVjdGVkVGFncy50YWdzLmxlbmd0aCA9PT0gMSkge1xyXG5cdFx0XHRcdHRhc2tIZWFkZXJFbC50ZXh0Q29udGVudCA9IGAjJHt0aGlzLnNlbGVjdGVkVGFncy50YWdzWzBdLnJlcGxhY2UoXHJcblx0XHRcdFx0XHRcIiNcIixcclxuXHRcdFx0XHRcdFwiXCJcclxuXHRcdFx0XHQpfWA7XHJcblx0XHRcdH0gZWxzZSBpZiAodGhpcy5zZWxlY3RlZFRhZ3MudGFncy5sZW5ndGggPiAxKSB7XHJcblx0XHRcdFx0dGFza0hlYWRlckVsLnRleHRDb250ZW50ID0gYCR7XHJcblx0XHRcdFx0XHR0aGlzLnNlbGVjdGVkVGFncy50YWdzLmxlbmd0aFxyXG5cdFx0XHRcdH0gJHt0KFwidGFncyBzZWxlY3RlZFwiKX1gO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRhc2tIZWFkZXJFbC50ZXh0Q29udGVudCA9IHQoXCJUYXNrc1wiKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHRhc2tDb3VudEVsID1cclxuXHRcdFx0dGhpcy50YXNrQ29udGFpbmVyRWwucXVlcnlTZWxlY3RvcihcIi50YWdzLXRhc2stY291bnRcIik7XHJcblx0XHRpZiAodGFza0NvdW50RWwpIHtcclxuXHRcdFx0Ly8gVXNlIGZpbHRlcmVkVGFza3MgbGVuZ3RoIGZvciB0aGUgdG90YWwgY291bnQgYWNyb3NzIHNlbGVjdGlvbnMvc2VjdGlvbnNcclxuXHRcdFx0dGFza0NvdW50RWwudGV4dENvbnRlbnQgPSBgJHt0aGlzLmZpbHRlcmVkVGFza3MubGVuZ3RofSAke3QoXHJcblx0XHRcdFx0XCJ0YXNrc1wiXHJcblx0XHRcdCl9YDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY2xlYW51cFJlbmRlcmVycygpIHtcclxuXHRcdC8vIENsZWFudXAgbWFpbiByZW5kZXJlciBpZiBpdCBleGlzdHNcclxuXHRcdGlmICh0aGlzLm1haW5UYXNrUmVuZGVyZXIpIHtcclxuXHRcdFx0dGhpcy5yZW1vdmVDaGlsZCh0aGlzLm1haW5UYXNrUmVuZGVyZXIpO1xyXG5cdFx0XHR0aGlzLm1haW5UYXNrUmVuZGVyZXIgPSBudWxsO1xyXG5cdFx0fVxyXG5cdFx0Ly8gQ2xlYW51cCBzZWN0aW9uIHJlbmRlcmVyc1xyXG5cdFx0dGhpcy50YWdTZWN0aW9ucy5mb3JFYWNoKChzZWN0aW9uKSA9PiB7XHJcblx0XHRcdGlmIChzZWN0aW9uLnJlbmRlcmVyKSB7XHJcblx0XHRcdFx0dGhpcy5yZW1vdmVDaGlsZChzZWN0aW9uLnJlbmRlcmVyKTtcclxuXHRcdFx0XHRzZWN0aW9uLnJlbmRlcmVyID0gdW5kZWZpbmVkO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHRcdC8vIENsZWFyIHRoZSBjb250YWluZXIgbWFudWFsbHkgYXMgcmVuZGVyZXJzIG1pZ2h0IG5vdCBoYXZlIGNsZWFyZWQgaXQgaWYganVzdCByZW1vdmVkXHJcblx0XHR0aGlzLnRhc2tMaXN0Q29udGFpbmVyRWwuZW1wdHkoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyVGFza0xpc3QoKSB7XHJcblx0XHR0aGlzLmNsZWFudXBSZW5kZXJlcnMoKTsgLy8gQ2xlYW4gdXAgYW55IHByZXZpb3VzIHJlbmRlcmVyc1xyXG5cdFx0dGhpcy51cGRhdGVUYXNrTGlzdEhlYWRlcigpOyAvLyBVcGRhdGUgdGl0bGUgYW5kIGNvdW50XHJcblxyXG5cdFx0aWYgKFxyXG5cdFx0XHR0aGlzLmZpbHRlcmVkVGFza3MubGVuZ3RoID09PSAwICYmXHJcblx0XHRcdHRoaXMuc2VsZWN0ZWRUYWdzLnRhZ3MubGVuZ3RoID4gMFxyXG5cdFx0KSB7XHJcblx0XHRcdC8vIFdlIGhhdmUgc2VsZWN0ZWQgdGFncywgYnV0IG5vIHRhc2tzIG1hdGNoXHJcblx0XHRcdHRoaXMucmVuZGVyRW1wdHlUYXNrTGlzdCh0KFwiTm8gdGFza3Mgd2l0aCB0aGUgc2VsZWN0ZWQgdGFnc1wiKSk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdGlmIChcclxuXHRcdFx0dGhpcy5maWx0ZXJlZFRhc2tzLmxlbmd0aCA9PT0gMCAmJlxyXG5cdFx0XHR0aGlzLnNlbGVjdGVkVGFncy50YWdzLmxlbmd0aCA9PT0gMFxyXG5cdFx0KSB7XHJcblx0XHRcdC8vIE5vIHRhZ3Mgc2VsZWN0ZWQgeWV0XHJcblx0XHRcdHRoaXMucmVuZGVyRW1wdHlUYXNrTGlzdCh0KFwiU2VsZWN0IGEgdGFnIHRvIHNlZSByZWxhdGVkIHRhc2tzXCIpKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIERlY2lkZSByZW5kZXJpbmcgbW9kZTogc2VjdGlvbnMgb3IgZmxhdC90cmVlXHJcblx0XHRjb25zdCB1c2VTZWN0aW9ucyA9XHJcblx0XHRcdCF0aGlzLmlzVHJlZVZpZXcgJiZcclxuXHRcdFx0dGhpcy50YWdTZWN0aW9ucy5sZW5ndGggPiAwICYmXHJcblx0XHRcdHRoaXMuc2VsZWN0ZWRUYWdzLnRhZ3MubGVuZ3RoID4gMTtcclxuXHJcblx0XHRpZiAodXNlU2VjdGlvbnMpIHtcclxuXHRcdFx0dGhpcy5yZW5kZXJUYWdTZWN0aW9ucygpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gVXNlIGEgc2luZ2xlIG1haW4gcmVuZGVyZXIgZm9yIGZsYXQgbGlzdCBvciB0cmVlIHZpZXdcclxuXHRcdFx0dGhpcy5tYWluVGFza1JlbmRlcmVyID0gbmV3IFRhc2tMaXN0UmVuZGVyZXJDb21wb25lbnQoXHJcblx0XHRcdFx0dGhpcyxcclxuXHRcdFx0XHR0aGlzLnRhc2tMaXN0Q29udGFpbmVyRWwsXHJcblx0XHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0XCJ0YWdzXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0dGhpcy5wYXJhbXMub25UYXNrU2VsZWN0ZWQgJiZcclxuXHRcdFx0XHQodGhpcy5tYWluVGFza1JlbmRlcmVyLm9uVGFza1NlbGVjdGVkID1cclxuXHRcdFx0XHRcdHRoaXMucGFyYW1zLm9uVGFza1NlbGVjdGVkKTtcclxuXHRcdFx0dGhpcy5wYXJhbXMub25UYXNrQ29tcGxldGVkICYmXHJcblx0XHRcdFx0KHRoaXMubWFpblRhc2tSZW5kZXJlci5vblRhc2tDb21wbGV0ZWQgPVxyXG5cdFx0XHRcdFx0dGhpcy5wYXJhbXMub25UYXNrQ29tcGxldGVkKTtcclxuXHRcdFx0dGhpcy5wYXJhbXMub25UYXNrVXBkYXRlICYmXHJcblx0XHRcdFx0KHRoaXMubWFpblRhc2tSZW5kZXJlci5vblRhc2tVcGRhdGUgPSB0aGlzLnBhcmFtcy5vblRhc2tVcGRhdGUpO1xyXG5cdFx0XHR0aGlzLnBhcmFtcy5vblRhc2tDb250ZXh0TWVudSAmJlxyXG5cdFx0XHRcdCh0aGlzLm1haW5UYXNrUmVuZGVyZXIub25UYXNrQ29udGV4dE1lbnUgPVxyXG5cdFx0XHRcdFx0dGhpcy5wYXJhbXMub25UYXNrQ29udGV4dE1lbnUpO1xyXG5cclxuXHRcdFx0dGhpcy5tYWluVGFza1JlbmRlcmVyLnJlbmRlclRhc2tzKFxyXG5cdFx0XHRcdHRoaXMuZmlsdGVyZWRUYXNrcyxcclxuXHRcdFx0XHR0aGlzLmlzVHJlZVZpZXcsXHJcblx0XHRcdFx0dGhpcy5hbGxUYXNrc01hcCxcclxuXHRcdFx0XHQvLyBFbXB0eSBtZXNzYWdlIGhhbmRsZWQgYWJvdmUsIHNvIHRoaXMgc2hvdWxkbid0IGJlIHNob3duXHJcblx0XHRcdFx0dChcIk5vIHRhc2tzIGZvdW5kLlwiKVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSByZW5kZXJUYWdTZWN0aW9ucygpIHtcclxuXHRcdC8vIEFzc3VtZXMgY2xlYW51cFJlbmRlcmVycyB3YXMgY2FsbGVkIGJlZm9yZSB0aGlzXHJcblx0XHR0aGlzLnRhZ1NlY3Rpb25zLmZvckVhY2goKHNlY3Rpb24pID0+IHtcclxuXHRcdFx0Y29uc3Qgc2VjdGlvbkVsID0gdGhpcy50YXNrTGlzdENvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcInRhc2stdGFnLXNlY3Rpb25cIixcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBTZWN0aW9uIGhlYWRlclxyXG5cdFx0XHRjb25zdCBoZWFkZXJFbCA9IHNlY3Rpb25FbC5jcmVhdGVEaXYoeyBjbHM6IFwidGFnLXNlY3Rpb24taGVhZGVyXCIgfSk7XHJcblx0XHRcdGNvbnN0IHRvZ2dsZUVsID0gaGVhZGVyRWwuY3JlYXRlRGl2KHsgY2xzOiBcInNlY3Rpb24tdG9nZ2xlXCIgfSk7XHJcblx0XHRcdHNldEljb24oXHJcblx0XHRcdFx0dG9nZ2xlRWwsXHJcblx0XHRcdFx0c2VjdGlvbi5pc0V4cGFuZGVkID8gXCJjaGV2cm9uLWRvd25cIiA6IFwiY2hldnJvbi1yaWdodFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdGNvbnN0IHRpdGxlRWwgPSBoZWFkZXJFbC5jcmVhdGVEaXYoeyBjbHM6IFwic2VjdGlvbi10aXRsZVwiIH0pO1xyXG5cdFx0XHR0aXRsZUVsLnNldFRleHQoYCMke3NlY3Rpb24udGFnLnJlcGxhY2UoXCIjXCIsIFwiXCIpfWApO1xyXG5cdFx0XHRjb25zdCBjb3VudEVsID0gaGVhZGVyRWwuY3JlYXRlRGl2KHsgY2xzOiBcInNlY3Rpb24tY291bnRcIiB9KTtcclxuXHRcdFx0Y291bnRFbC5zZXRUZXh0KGAke3NlY3Rpb24udGFza3MubGVuZ3RofWApO1xyXG5cclxuXHRcdFx0Ly8gVGFzayBjb250YWluZXIgZm9yIHRoZSByZW5kZXJlclxyXG5cdFx0XHRjb25zdCB0YXNrTGlzdEVsID0gc2VjdGlvbkVsLmNyZWF0ZURpdih7IGNsczogXCJzZWN0aW9uLXRhc2tzXCIgfSk7XHJcblx0XHRcdGlmICghc2VjdGlvbi5pc0V4cGFuZGVkKSB7XHJcblx0XHRcdFx0dGFza0xpc3RFbC5oaWRlKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENyZWF0ZSBhIHJlbmRlcmVyIGZvciB0aGlzIHNlY3Rpb25cclxuXHRcdFx0c2VjdGlvbi5yZW5kZXJlciA9IG5ldyBUYXNrTGlzdFJlbmRlcmVyQ29tcG9uZW50KFxyXG5cdFx0XHRcdHRoaXMsXHJcblx0XHRcdFx0dGFza0xpc3RFbCwgLy8gUmVuZGVyIGluc2lkZSB0aGlzIHNlY3Rpb24ncyBjb250YWluZXJcclxuXHRcdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0XHRcInRhZ3NcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHR0aGlzLnBhcmFtcy5vblRhc2tTZWxlY3RlZCAmJlxyXG5cdFx0XHRcdChzZWN0aW9uLnJlbmRlcmVyLm9uVGFza1NlbGVjdGVkID0gdGhpcy5wYXJhbXMub25UYXNrU2VsZWN0ZWQpO1xyXG5cdFx0XHR0aGlzLnBhcmFtcy5vblRhc2tDb21wbGV0ZWQgJiZcclxuXHRcdFx0XHQoc2VjdGlvbi5yZW5kZXJlci5vblRhc2tDb21wbGV0ZWQgPVxyXG5cdFx0XHRcdFx0dGhpcy5wYXJhbXMub25UYXNrQ29tcGxldGVkKTtcclxuXHRcdFx0dGhpcy5wYXJhbXMub25UYXNrVXBkYXRlICYmXHJcblx0XHRcdFx0KHNlY3Rpb24ucmVuZGVyZXIub25UYXNrVXBkYXRlID0gdGhpcy5wYXJhbXMub25UYXNrVXBkYXRlKTtcclxuXHRcdFx0dGhpcy5wYXJhbXMub25UYXNrQ29udGV4dE1lbnUgJiZcclxuXHRcdFx0XHQoc2VjdGlvbi5yZW5kZXJlci5vblRhc2tDb250ZXh0TWVudSA9XHJcblx0XHRcdFx0XHR0aGlzLnBhcmFtcy5vblRhc2tDb250ZXh0TWVudSk7XHJcblxyXG5cdFx0XHQvLyBSZW5kZXIgdGFza3MgZm9yIHRoaXMgc2VjdGlvbiAoYWx3YXlzIGxpc3QgdmlldyB3aXRoaW4gc2VjdGlvbnMpXHJcblx0XHRcdHNlY3Rpb24ucmVuZGVyZXIucmVuZGVyVGFza3MoXHJcblx0XHRcdFx0c2VjdGlvbi50YXNrcyxcclxuXHRcdFx0XHR0aGlzLmlzVHJlZVZpZXcsXHJcblx0XHRcdFx0dGhpcy5hbGxUYXNrc01hcCxcclxuXHRcdFx0XHR0KFwiTm8gdGFza3MgZm91bmQgZm9yIHRoaXMgdGFnLlwiKVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gUmVnaXN0ZXIgdG9nZ2xlIGV2ZW50XHJcblx0XHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChoZWFkZXJFbCwgXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdFx0c2VjdGlvbi5pc0V4cGFuZGVkID0gIXNlY3Rpb24uaXNFeHBhbmRlZDtcclxuXHRcdFx0XHRzZXRJY29uKFxyXG5cdFx0XHRcdFx0dG9nZ2xlRWwsXHJcblx0XHRcdFx0XHRzZWN0aW9uLmlzRXhwYW5kZWQgPyBcImNoZXZyb24tZG93blwiIDogXCJjaGV2cm9uLXJpZ2h0XCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHNlY3Rpb24uaXNFeHBhbmRlZCA/IHRhc2tMaXN0RWwuc2hvdygpIDogdGFza0xpc3RFbC5oaWRlKCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbmRlckVtcHR5VGFza0xpc3QobWVzc2FnZTogc3RyaW5nKSB7XHJcblx0XHR0aGlzLmNsZWFudXBSZW5kZXJlcnMoKTsgLy8gRW5zdXJlIG5vIHJlbmRlcmVycyBhcmUgYWN0aXZlXHJcblx0XHR0aGlzLnRhc2tMaXN0Q29udGFpbmVyRWwuZW1wdHkoKTsgLy8gQ2xlYXIgdGhlIG1haW4gY29udGFpbmVyXHJcblxyXG5cdFx0Ly8gT3B0aW9uYWxseSB1cGRhdGUgaGVhZGVyIChhbHJlYWR5IGRvbmUgaW4gcmVuZGVyVGFza0xpc3QpXHJcblx0XHQvLyB0aGlzLnVwZGF0ZVRhc2tMaXN0SGVhZGVyKCk7XHJcblxyXG5cdFx0Ly8gRGlzcGxheSB0aGUgbWVzc2FnZVxyXG5cdFx0Y29uc3QgZW1wdHlFbCA9IHRoaXMudGFza0xpc3RDb250YWluZXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwidGFncy1lbXB0eS1zdGF0ZVwiLFxyXG5cdFx0fSk7XHJcblx0XHRlbXB0eUVsLnNldFRleHQobWVzc2FnZSk7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgdXBkYXRlVGFzayh1cGRhdGVkVGFzazogVGFzaykge1xyXG5cdFx0bGV0IG5lZWRzRnVsbFJlZnJlc2ggPSBmYWxzZTtcclxuXHRcdGNvbnN0IHRhc2tJbmRleCA9IHRoaXMuYWxsVGFza3MuZmluZEluZGV4KFxyXG5cdFx0XHQodCkgPT4gdC5pZCA9PT0gdXBkYXRlZFRhc2suaWRcclxuXHRcdCk7XHJcblxyXG5cdFx0aWYgKHRhc2tJbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0Y29uc3Qgb2xkVGFzayA9IHRoaXMuYWxsVGFza3NbdGFza0luZGV4XTtcclxuXHRcdFx0Ly8gQ2hlY2sgaWYgdGFncyBjaGFuZ2VkLCBuZWNlc3NpdGF0aW5nIGEgcmVidWlsZC9yZS1yZW5kZXJcclxuXHRcdFx0Y29uc3QgdGFnc0NoYW5nZWQgPVxyXG5cdFx0XHRcdCFvbGRUYXNrLm1ldGFkYXRhLnRhZ3MgfHxcclxuXHRcdFx0XHQhdXBkYXRlZFRhc2subWV0YWRhdGEudGFncyB8fFxyXG5cdFx0XHRcdG9sZFRhc2subWV0YWRhdGEudGFncy5qb2luKFwiLFwiKSAhPT1cclxuXHRcdFx0XHRcdHVwZGF0ZWRUYXNrLm1ldGFkYXRhLnRhZ3Muam9pbihcIixcIik7XHJcblxyXG5cdFx0XHRpZiAodGFnc0NoYW5nZWQpIHtcclxuXHRcdFx0XHRuZWVkc0Z1bGxSZWZyZXNoID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGlzLmFsbFRhc2tzW3Rhc2tJbmRleF0gPSB1cGRhdGVkVGFzaztcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMuYWxsVGFza3MucHVzaCh1cGRhdGVkVGFzayk7XHJcblx0XHRcdG5lZWRzRnVsbFJlZnJlc2ggPSB0cnVlOyAvLyBOZXcgdGFzaywgcmVxdWlyZXMgZnVsbCByZWZyZXNoXHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSWYgdGFncyBjaGFuZ2VkIG9yIHRhc2sgaXMgbmV3LCByZWJ1aWxkIGluZGV4IGFuZCBmdWxseSByZWZyZXNoIFVJXHJcblx0XHRpZiAobmVlZHNGdWxsUmVmcmVzaCkge1xyXG5cdFx0XHR0aGlzLmJ1aWxkVGFnc0luZGV4KCk7XHJcblx0XHRcdHRoaXMucmVuZGVyVGFnc0xpc3QoKTsgLy8gVXBkYXRlIGxlZnQgc2lkZWJhclxyXG5cdFx0XHR0aGlzLnVwZGF0ZVNlbGVjdGVkVGFza3MoKTsgLy8gUmVjYWxjdWxhdGUgZmlsdGVyZWQgdGFza3MgYW5kIHJlLXJlbmRlciByaWdodCBwYW5lbFxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gT3RoZXJ3aXNlLCB1cGRhdGUgdGhlIHRhc2sgaW4gdGhlIGZpbHRlcmVkIGxpc3RcclxuXHRcdFx0Y29uc3QgZmlsdGVyZWRJbmRleCA9IHRoaXMuZmlsdGVyZWRUYXNrcy5maW5kSW5kZXgoXHJcblx0XHRcdFx0KHQpID0+IHQuaWQgPT09IHVwZGF0ZWRUYXNrLmlkXHJcblx0XHRcdCk7XHJcblx0XHRcdGlmIChmaWx0ZXJlZEluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHRcdHRoaXMuZmlsdGVyZWRUYXNrc1tmaWx0ZXJlZEluZGV4XSA9IHVwZGF0ZWRUYXNrO1xyXG5cclxuXHRcdFx0XHQvLyBGaW5kIHRoZSBjb3JyZWN0IHJlbmRlcmVyIChtYWluIG9yIHNlY3Rpb24pIGFuZCB1cGRhdGUgdGhlIHRhc2tcclxuXHRcdFx0XHRpZiAodGhpcy5tYWluVGFza1JlbmRlcmVyKSB7XHJcblx0XHRcdFx0XHR0aGlzLm1haW5UYXNrUmVuZGVyZXIudXBkYXRlVGFzayh1cGRhdGVkVGFzayk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHRoaXMudGFnU2VjdGlvbnMuZm9yRWFjaCgoc2VjdGlvbikgPT4ge1xyXG5cdFx0XHRcdFx0XHQvLyBDaGVjayBpZiB0aGUgdGFzayBiZWxvbmdzIHRvIHRoaXMgc2VjdGlvbidzIHRhZyBicmFuY2hcclxuXHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdHVwZGF0ZWRUYXNrLm1ldGFkYXRhLnRhZ3M/LnNvbWUoXHJcblx0XHRcdFx0XHRcdFx0XHQodGFza1RhZzogc3RyaW5nKSA9PlxyXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBTa2lwIG5vbi1zdHJpbmcgdGFnc1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0eXBlb2YgdGFza1RhZyA9PT0gXCJzdHJpbmdcIiAmJlxyXG5cdFx0XHRcdFx0XHRcdFx0XHQodGFza1RhZyA9PT0gc2VjdGlvbi50YWcgfHxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0YXNrVGFnLnN0YXJ0c1dpdGgoc2VjdGlvbi50YWcgKyBcIi9cIikpXHJcblx0XHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHQvLyBDaGVjayBpZiB0aGUgdGFzayBpcyBhY3R1YWxseSBpbiB0aGlzIHNlY3Rpb24ncyBsaXN0XHJcblx0XHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdFx0c2VjdGlvbi50YXNrcy5zb21lKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHQodCkgPT4gdC5pZCA9PT0gdXBkYXRlZFRhc2suaWRcclxuXHRcdFx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHNlY3Rpb24ucmVuZGVyZXI/LnVwZGF0ZVRhc2sodXBkYXRlZFRhc2spO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIE9wdGlvbmFsOiBSZS1zb3J0IGlmIG5lZWRlZCwgdGhlbiBjYWxsIHJlbmRlclRhc2tMaXN0IG9yIHJlbGV2YW50IHNlY3Rpb24gdXBkYXRlXHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gVGFzayBtaWdodCBoYXZlIGJlY29tZSB2aXNpYmxlL2ludmlzaWJsZSBkdWUgdG8gdXBkYXRlLCByZXF1aXJlcyByZS1maWx0ZXJpbmdcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZVNlbGVjdGVkVGFza3MoKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0b251bmxvYWQoKSB7XHJcblx0XHQvLyBSZW5kZXJlcnMgYXJlIGNoaWxkcmVuLCBjbGVhbmVkIHVwIGF1dG9tYXRpY2FsbHkuXHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLmVtcHR5KCk7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLnJlbW92ZSgpO1xyXG5cdH1cclxuXHJcblx0Ly8gVG9nZ2xlIGxlZnQgY29sdW1uIHZpc2liaWxpdHkgd2l0aCBhbmltYXRpb24gc3VwcG9ydFxyXG5cdHByaXZhdGUgdG9nZ2xlTGVmdENvbHVtblZpc2liaWxpdHkodmlzaWJsZT86IGJvb2xlYW4pIHtcclxuXHRcdGlmICh2aXNpYmxlID09PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0Ly8gVG9nZ2xlIGJhc2VkIG9uIGN1cnJlbnQgc3RhdGVcclxuXHRcdFx0dmlzaWJsZSA9ICF0aGlzLmxlZnRDb2x1bW5FbC5oYXNDbGFzcyhcImlzLXZpc2libGVcIik7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHZpc2libGUpIHtcclxuXHRcdFx0dGhpcy5sZWZ0Q29sdW1uRWwuYWRkQ2xhc3MoXCJpcy12aXNpYmxlXCIpO1xyXG5cdFx0XHR0aGlzLmxlZnRDb2x1bW5FbC5zaG93KCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLmxlZnRDb2x1bW5FbC5yZW1vdmVDbGFzcyhcImlzLXZpc2libGVcIik7XHJcblxyXG5cdFx0XHQvLyBXYWl0IGZvciBhbmltYXRpb24gdG8gY29tcGxldGUgYmVmb3JlIGhpZGluZ1xyXG5cdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRpZiAoIXRoaXMubGVmdENvbHVtbkVsLmhhc0NsYXNzKFwiaXMtdmlzaWJsZVwiKSkge1xyXG5cdFx0XHRcdFx0dGhpcy5sZWZ0Q29sdW1uRWwuaGlkZSgpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSwgMzAwKTsgLy8gTWF0Y2ggQ1NTIHRyYW5zaXRpb24gZHVyYXRpb25cclxuXHRcdH1cclxuXHR9XHJcbn1cclxuIl19