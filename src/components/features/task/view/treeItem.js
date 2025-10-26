import { __awaiter } from "tslib";
import { Component, setIcon, Menu, Keymap } from "obsidian";
import "@/styles/tree-view.css";
import { MarkdownRendererComponent } from "@/components/ui/renderers/MarkdownRenderer";
import { createTaskCheckbox } from "./details";
import { getViewSettingOrDefault } from "@/common/setting-definition";
import { getRelativeTimeString } from "@/utils/date/date-formatter";
import { t } from "@/translations/helper";
import { InlineEditorManager } from "./InlineEditorManager";
import { sanitizePriorityForClass } from "@/utils/task/priority-utils";
import { sortTasks } from "@/commands/sortTaskCommands";
export class TaskTreeItemComponent extends Component {
    constructor(task, viewMode, app, indentLevel = 0, childTasks = [], taskMap, plugin) {
        super();
        this.app = app;
        this.childTasks = childTasks;
        this.plugin = plugin;
        this.isSelected = false;
        this.isExpanded = true;
        this.indentLevel = 0;
        this.childComponents = [];
        this.task = task;
        this.viewMode = viewMode;
        this.indentLevel = indentLevel;
        this.taskMap = taskMap;
        // Initialize shared editor manager if not exists
        if (!TaskTreeItemComponent.editorManager) {
            TaskTreeItemComponent.editorManager = new InlineEditorManager(this.app, this.plugin);
        }
    }
    /**
     * Get the inline editor from the shared manager when needed
     */
    getInlineEditor() {
        const editorOptions = {
            onTaskUpdate: (originalTask, updatedTask) => __awaiter(this, void 0, void 0, function* () {
                if (this.onTaskUpdate) {
                    try {
                        yield this.onTaskUpdate(originalTask, updatedTask);
                        console.log("treeItem onTaskUpdate completed successfully");
                        // Don't update task reference here - let onContentEditFinished handle it
                    }
                    catch (error) {
                        console.error("Error in treeItem onTaskUpdate:", error);
                        throw error; // Re-throw to let the InlineEditor handle it
                    }
                }
                else {
                    console.warn("No onTaskUpdate callback available");
                }
            }),
            onContentEditFinished: (targetEl, updatedTask) => {
                var _a;
                // Update the task reference with the saved task
                this.task = updatedTask;
                // Re-render the markdown content after editing is finished
                this.renderMarkdown();
                // Now it's safe to update the full display
                this.updateTaskDisplay();
                // Release the editor from the manager
                (_a = TaskTreeItemComponent.editorManager) === null || _a === void 0 ? void 0 : _a.releaseEditor(this.task.id);
            },
            onMetadataEditFinished: (targetEl, updatedTask, fieldType) => {
                var _a;
                // Update the task reference with the saved task
                this.task = updatedTask;
                // Update the task display to reflect metadata changes
                this.updateTaskDisplay();
                // Release the editor from the manager
                (_a = TaskTreeItemComponent.editorManager) === null || _a === void 0 ? void 0 : _a.releaseEditor(this.task.id);
            },
            useEmbeddedEditor: true, // Enable Obsidian's embedded editor
        };
        return TaskTreeItemComponent.editorManager.getEditor(this.task, editorOptions);
    }
    /**
     * Check if this task is currently being edited
     */
    isCurrentlyEditing() {
        var _a;
        return (((_a = TaskTreeItemComponent.editorManager) === null || _a === void 0 ? void 0 : _a.hasActiveEditor(this.task.id)) || false);
    }
    onload() {
        // Create task item container
        this.element = createDiv({
            cls: ["task-item", "tree-task-item"],
            attr: {
                "data-task-id": this.task.id,
            },
        });
        this.registerDomEvent(this.element, "contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.onTaskContextMenu) {
                this.onTaskContextMenu(e, this.task);
            }
        });
        // Create parent container
        this.parentContainer = this.element.createDiv({
            cls: "task-parent-container",
        });
        // Create task content
        this.renderTaskContent();
        // Create container for child tasks
        this.childrenContainer = this.element.createDiv({
            cls: "task-children-container",
        });
        // Render child tasks
        this.renderChildTasks();
        // Register click handler for selection
        this.registerDomEvent(this.parentContainer, "click", (e) => {
            // Only trigger if clicking on the task itself, not children
            if (e.target === this.parentContainer ||
                this.parentContainer.contains(e.target)) {
                const isCheckbox = e.target.classList.contains("task-checkbox");
                if (isCheckbox) {
                    e.stopPropagation();
                    this.toggleTaskCompletion();
                }
                else if (e.target.classList.contains("task-expand-toggle")) {
                    e.stopPropagation();
                }
                else {
                    this.selectTask();
                }
            }
        });
    }
    renderTaskContent() {
        // Clear existing content
        this.parentContainer.empty();
        this.parentContainer.classList.toggle("completed", this.task.completed);
        this.parentContainer.classList.toggle("selected", this.isSelected);
        // Indentation based on level
        if (this.indentLevel > 0) {
            const indentEl = this.parentContainer.createDiv({
                cls: "task-indent",
            });
            indentEl.style.width = `${this.indentLevel * 30}px`;
        }
        // Expand/collapse toggle for tasks with children
        if (this.task.metadata.children &&
            this.task.metadata.children.length > 0) {
            this.toggleEl = this.parentContainer.createDiv({
                cls: "task-expand-toggle",
            });
            setIcon(this.toggleEl, this.isExpanded ? "chevron-down" : "chevron-right");
            // Register toggle event
            this.registerDomEvent(this.toggleEl, "click", (e) => {
                e.stopPropagation();
                this.toggleExpand();
            });
        }
        // Checkbox
        const checkboxEl = this.parentContainer.createDiv({
            cls: "task-checkbox",
        }, (el) => {
            const checkbox = createTaskCheckbox(this.task.status, this.task, el);
            this.registerDomEvent(checkbox, "click", (event) => {
                event.stopPropagation();
                if (this.onTaskCompleted) {
                    this.onTaskCompleted(this.task);
                }
                if (this.task.status === " ") {
                    checkbox.checked = true;
                    checkbox.dataset.task = "x";
                }
            });
        });
        const taskItemContainer = this.parentContainer.createDiv({
            cls: "task-item-container",
        });
        // Create content-metadata container for dynamic layout
        this.contentMetadataContainer = taskItemContainer.createDiv({
            cls: "task-content-metadata-container",
        });
        // Task content with markdown rendering
        this.contentEl = this.contentMetadataContainer.createDiv({
            cls: "task-item-content",
        });
        // Make content clickable for editing - only create editor when clicked
        this.registerContentClickHandler();
        this.renderMarkdown();
        // Metadata container
        const metadataEl = this.contentMetadataContainer.createDiv({
            cls: "task-metadata",
        });
        this.renderMetadata(metadataEl);
        // Priority indicator if available
        if (this.task.metadata.priority) {
            const sanitizedPriority = sanitizePriorityForClass(this.task.metadata.priority);
            const classes = ["task-priority"];
            if (sanitizedPriority) {
                classes.push(`priority-${sanitizedPriority}`);
            }
            const priorityEl = createDiv({ cls: classes });
            // Priority icon based on level
            let icon = "•";
            icon = "!".repeat(this.task.metadata.priority);
            priorityEl.textContent = icon;
            this.parentContainer.appendChild(priorityEl);
        }
    }
    renderMetadata(metadataEl) {
        metadataEl.empty();
        // For cancelled tasks, show cancelled date (independent of completion status)
        if (this.task.metadata.cancelledDate) {
            this.renderDateMetadata(metadataEl, "cancelled", this.task.metadata.cancelledDate);
        }
        // Display dates based on task completion status
        if (!this.task.completed) {
            // Due date if available
            if (this.task.metadata.dueDate) {
                this.renderDateMetadata(metadataEl, "due", this.task.metadata.dueDate);
            }
            // Scheduled date if available
            if (this.task.metadata.scheduledDate) {
                this.renderDateMetadata(metadataEl, "scheduled", this.task.metadata.scheduledDate);
            }
            // Start date if available
            if (this.task.metadata.startDate) {
                this.renderDateMetadata(metadataEl, "start", this.task.metadata.startDate);
            }
            // Recurrence if available
            if (this.task.metadata.recurrence) {
                this.renderRecurrenceMetadata(metadataEl);
            }
        }
        else {
            // For completed tasks, show completion date
            if (this.task.metadata.completedDate) {
                this.renderDateMetadata(metadataEl, "completed", this.task.metadata.completedDate);
            }
            // Created date if available
            if (this.task.metadata.createdDate) {
                this.renderDateMetadata(metadataEl, "created", this.task.metadata.createdDate);
            }
        }
        // Project badge if available and not in project view
        if ((this.task.metadata.project || this.task.metadata.tgProject) &&
            this.viewMode !== "projects") {
            this.renderProjectMetadata(metadataEl);
        }
        // Tags if available
        if (this.task.metadata.tags && this.task.metadata.tags.length > 0) {
            this.renderTagsMetadata(metadataEl);
        }
        // OnCompletion if available
        if (this.task.metadata.onCompletion) {
            this.renderOnCompletionMetadata(metadataEl);
        }
        // DependsOn if available
        if (this.task.metadata.dependsOn &&
            this.task.metadata.dependsOn.length > 0) {
            this.renderDependsOnMetadata(metadataEl);
        }
        // ID if available
        if (this.task.metadata.id) {
            this.renderIdMetadata(metadataEl);
        }
        // Add metadata button for adding new metadata
        this.renderAddMetadataButton(metadataEl);
    }
    renderDateMetadata(metadataEl, type, dateValue) {
        var _a, _b, _c, _d;
        const dateEl = metadataEl.createEl("div", {
            cls: ["task-date", `task-${type}-date`],
        });
        const date = new Date(dateValue);
        let dateText = "";
        let cssClass = "";
        if (type === "due") {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            // Format date
            if (date.getTime() < today.getTime()) {
                dateText =
                    t("Overdue") +
                        (((_a = this.plugin.settings) === null || _a === void 0 ? void 0 : _a.useRelativeTimeForDate)
                            ? " | " + getRelativeTimeString(date)
                            : "");
                cssClass = "task-overdue";
            }
            else if (date.getTime() === today.getTime()) {
                dateText = ((_b = this.plugin.settings) === null || _b === void 0 ? void 0 : _b.useRelativeTimeForDate)
                    ? getRelativeTimeString(date) || "Today"
                    : "Today";
                cssClass = "task-due-today";
            }
            else if (date.getTime() === tomorrow.getTime()) {
                dateText = ((_c = this.plugin.settings) === null || _c === void 0 ? void 0 : _c.useRelativeTimeForDate)
                    ? getRelativeTimeString(date) || "Tomorrow"
                    : "Tomorrow";
                cssClass = "task-due-tomorrow";
            }
            else {
                dateText = date.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                });
            }
        }
        else {
            dateText = ((_d = this.plugin.settings) === null || _d === void 0 ? void 0 : _d.useRelativeTimeForDate)
                ? getRelativeTimeString(date)
                : date.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                });
        }
        if (cssClass) {
            dateEl.classList.add(cssClass);
        }
        dateEl.textContent = dateText;
        dateEl.setAttribute("aria-label", date.toLocaleDateString());
        // Make date clickable for editing only if inline editor is enabled
        if (this.plugin.settings.enableInlineEditor) {
            this.registerDomEvent(dateEl, "click", (e) => {
                e.stopPropagation();
                if (!this.isCurrentlyEditing()) {
                    const editor = this.getInlineEditor();
                    const dateString = this.formatDateForInput(date);
                    const fieldType = type === "due"
                        ? "dueDate"
                        : type === "scheduled"
                            ? "scheduledDate"
                            : type === "start"
                                ? "startDate"
                                : type === "cancelled"
                                    ? "cancelledDate"
                                    : type === "completed"
                                        ? "completedDate"
                                        : null;
                    if (fieldType) {
                        editor.showMetadataEditor(dateEl, fieldType, dateString);
                    }
                }
            });
        }
    }
    renderProjectMetadata(metadataEl) {
        // Determine which project to display: original project or tgProject
        let projectName;
        let isReadonly = false;
        if (this.task.metadata.project) {
            // Use original project if available
            projectName = this.task.metadata.project;
        }
        else if (this.task.metadata.tgProject) {
            // Use tgProject as fallback
            projectName = this.task.metadata.tgProject.name;
            isReadonly = this.task.metadata.tgProject.readonly || false;
        }
        if (!projectName)
            return;
        const projectEl = metadataEl.createEl("div", {
            cls: "task-project",
        });
        // Add a visual indicator for tgProject
        if (!this.task.metadata.project && this.task.metadata.tgProject) {
            projectEl.addClass("task-project-tg");
            projectEl.title = `Project from ${this.task.metadata.tgProject.type}: ${this.task.metadata.tgProject.source || ""}`;
        }
        projectEl.textContent = projectName.split("/").pop() || projectName;
        // Make project clickable for editing only if inline editor is enabled and not readonly
        if (this.plugin.settings.enableInlineEditor && !isReadonly) {
            this.registerDomEvent(projectEl, "click", (e) => {
                e.stopPropagation();
                if (!this.isCurrentlyEditing()) {
                    const editor = this.getInlineEditor();
                    editor.showMetadataEditor(projectEl, "project", this.task.metadata.project || "");
                }
            });
        }
    }
    renderTagsMetadata(metadataEl) {
        const tagsContainer = metadataEl.createEl("div", {
            cls: "task-tags-container",
        });
        const projectPrefix = this.plugin.settings.projectTagPrefix[this.plugin.settings.preferMetadataFormat] || "project";
        this.task.metadata.tags
            .filter((tag) => !tag.startsWith(`#${projectPrefix}`))
            .forEach((tag) => {
            const tagEl = tagsContainer.createEl("span", {
                cls: "task-tag",
                text: tag.startsWith("#") ? tag : `#${tag}`,
            });
            // Make tag clickable for editing only if inline editor is enabled
            if (this.plugin.settings.enableInlineEditor) {
                this.registerDomEvent(tagEl, "click", (e) => {
                    var _a;
                    e.stopPropagation();
                    if (!this.isCurrentlyEditing()) {
                        const editor = this.getInlineEditor();
                        const tagsString = ((_a = this.task.metadata.tags) === null || _a === void 0 ? void 0 : _a.join(", ")) || "";
                        editor.showMetadataEditor(tagsContainer, "tags", tagsString);
                    }
                });
            }
        });
    }
    renderRecurrenceMetadata(metadataEl) {
        const recurrenceEl = metadataEl.createEl("div", {
            cls: "task-date task-recurrence",
        });
        recurrenceEl.textContent = this.task.metadata.recurrence || "";
        // Make recurrence clickable for editing only if inline editor is enabled
        if (this.plugin.settings.enableInlineEditor) {
            this.registerDomEvent(recurrenceEl, "click", (e) => {
                e.stopPropagation();
                if (!this.isCurrentlyEditing()) {
                    const editor = this.getInlineEditor();
                    editor.showMetadataEditor(recurrenceEl, "recurrence", this.task.metadata.recurrence || "");
                }
            });
        }
    }
    renderOnCompletionMetadata(metadataEl) {
        const onCompletionEl = metadataEl.createEl("div", {
            cls: "task-oncompletion",
        });
        onCompletionEl.textContent = `🏁 ${this.task.metadata.onCompletion}`;
        // Make onCompletion clickable for editing only if inline editor is enabled
        if (this.plugin.settings.enableInlineEditor) {
            this.registerDomEvent(onCompletionEl, "click", (e) => {
                e.stopPropagation();
                if (!this.isCurrentlyEditing()) {
                    const editor = this.getInlineEditor();
                    editor.showMetadataEditor(onCompletionEl, "onCompletion", this.task.metadata.onCompletion || "");
                }
            });
        }
    }
    renderDependsOnMetadata(metadataEl) {
        var _a;
        const dependsOnEl = metadataEl.createEl("div", {
            cls: "task-dependson",
        });
        dependsOnEl.textContent = `⛔ ${(_a = this.task.metadata.dependsOn) === null || _a === void 0 ? void 0 : _a.join(", ")}`;
        // Make dependsOn clickable for editing only if inline editor is enabled
        if (this.plugin.settings.enableInlineEditor) {
            this.registerDomEvent(dependsOnEl, "click", (e) => {
                var _a;
                e.stopPropagation();
                if (!this.isCurrentlyEditing()) {
                    const editor = this.getInlineEditor();
                    editor.showMetadataEditor(dependsOnEl, "dependsOn", ((_a = this.task.metadata.dependsOn) === null || _a === void 0 ? void 0 : _a.join(", ")) || "");
                }
            });
        }
    }
    renderIdMetadata(metadataEl) {
        const idEl = metadataEl.createEl("div", {
            cls: "task-id",
        });
        idEl.textContent = `🆔 ${this.task.metadata.id}`;
        // Make id clickable for editing only if inline editor is enabled
        if (this.plugin.settings.enableInlineEditor) {
            this.registerDomEvent(idEl, "click", (e) => {
                e.stopPropagation();
                if (!this.isCurrentlyEditing()) {
                    const editor = this.getInlineEditor();
                    editor.showMetadataEditor(idEl, "id", this.task.metadata.id || "");
                }
            });
        }
    }
    renderAddMetadataButton(metadataEl) {
        // Only show add metadata button if inline editor is enabled
        if (!this.plugin.settings.enableInlineEditor) {
            return;
        }
        const addButtonContainer = metadataEl.createDiv({
            cls: "add-metadata-container",
        });
        // Create the add metadata button
        const addBtn = addButtonContainer.createEl("button", {
            cls: "add-metadata-btn",
            attr: { "aria-label": "Add metadata" },
        });
        setIcon(addBtn, "plus");
        this.registerDomEvent(addBtn, "click", (e) => {
            e.stopPropagation();
            // Show metadata menu directly instead of calling showAddMetadataButton
            this.showMetadataMenu(addBtn);
        });
    }
    showMetadataMenu(buttonEl) {
        const editor = this.getInlineEditor();
        // Create a temporary menu container
        const menu = new Menu();
        const availableFields = [
            { key: "project", label: "Project", icon: "folder" },
            { key: "tags", label: "Tags", icon: "tag" },
            { key: "context", label: "Context", icon: "at-sign" },
            { key: "dueDate", label: "Due Date", icon: "calendar" },
            { key: "startDate", label: "Start Date", icon: "play" },
            { key: "scheduledDate", label: "Scheduled Date", icon: "clock" },
            { key: "cancelledDate", label: "Cancelled Date", icon: "x" },
            { key: "completedDate", label: "Completed Date", icon: "check" },
            { key: "priority", label: "Priority", icon: "alert-triangle" },
            { key: "recurrence", label: "Recurrence", icon: "repeat" },
            { key: "onCompletion", label: "On Completion", icon: "flag" },
            { key: "dependsOn", label: "Depends On", icon: "link" },
            { key: "id", label: "Task ID", icon: "hash" },
        ];
        // Filter out fields that already have values
        const fieldsToShow = availableFields.filter((field) => {
            switch (field.key) {
                case "project":
                    return !this.task.metadata.project;
                case "tags":
                    return (!this.task.metadata.tags ||
                        this.task.metadata.tags.length === 0);
                case "context":
                    return !this.task.metadata.context;
                case "dueDate":
                    return !this.task.metadata.dueDate;
                case "startDate":
                    return !this.task.metadata.startDate;
                case "scheduledDate":
                    return !this.task.metadata.scheduledDate;
                case "cancelledDate":
                    return !this.task.metadata.cancelledDate;
                case "completedDate":
                    return !this.task.metadata.completedDate;
                case "priority":
                    return !this.task.metadata.priority;
                case "recurrence":
                    return !this.task.metadata.recurrence;
                case "onCompletion":
                    return !this.task.metadata.onCompletion;
                case "dependsOn":
                    return (!this.task.metadata.dependsOn ||
                        this.task.metadata.dependsOn.length === 0);
                case "id":
                    return !this.task.metadata.id;
                default:
                    return true;
            }
        });
        // If no fields are available to add, show a message
        if (fieldsToShow.length === 0) {
            menu.addItem((item) => {
                item.setTitle("All metadata fields are already set").setDisabled(true);
            });
        }
        else {
            fieldsToShow.forEach((field) => {
                menu.addItem((item) => {
                    item.setTitle(field.label)
                        .setIcon(field.icon)
                        .onClick(() => {
                        // Create a temporary container for the metadata editor
                        const tempContainer = buttonEl.parentElement.createDiv({
                            cls: "temp-metadata-editor-container",
                        });
                        editor.showMetadataEditor(tempContainer, field.key);
                    });
                });
            });
        }
        menu.showAtPosition({
            x: buttonEl.getBoundingClientRect().left,
            y: buttonEl.getBoundingClientRect().bottom,
        });
    }
    formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }
    renderMarkdown() {
        // Clear existing content if needed
        if (this.markdownRenderer) {
            this.removeChild(this.markdownRenderer);
        }
        // Clear the content element
        this.contentEl.empty();
        // Create new renderer
        this.markdownRenderer = new MarkdownRendererComponent(this.app, this.contentEl, this.task.filePath);
        this.addChild(this.markdownRenderer);
        // Render the markdown content
        this.markdownRenderer.render(this.task.originalMarkdown);
        // Re-register the click event for editing after rendering
        this.registerContentClickHandler();
        // Update layout mode after content is rendered
        // Use requestAnimationFrame to ensure the content is fully rendered
        requestAnimationFrame(() => {
            this.updateLayoutMode();
        });
    }
    /**
     * Detect content height and update layout mode
     */
    updateLayoutMode() {
        if (!this.contentEl || !this.contentMetadataContainer) {
            return;
        }
        // Check if dynamic metadata positioning is enabled
        if (!this.plugin.settings.enableDynamicMetadataPositioning) {
            // If disabled, always use multi-line (traditional) layout
            this.contentMetadataContainer.toggleClass("multi-line-content", true);
            this.contentMetadataContainer.toggleClass("single-line-content", false);
            return;
        }
        // Get the line height of the content element
        const computedStyle = window.getComputedStyle(this.contentEl);
        const lineHeight = parseFloat(computedStyle.lineHeight) ||
            parseFloat(computedStyle.fontSize) * 1.4;
        // Get actual content height
        const contentHeight = this.contentEl.scrollHeight;
        // Check if content is multi-line (with some tolerance)
        const isMultiLine = contentHeight > lineHeight * 1.2;
        // Apply appropriate layout class using Obsidian's toggleClass method
        this.contentMetadataContainer.toggleClass("multi-line-content", isMultiLine);
        this.contentMetadataContainer.toggleClass("single-line-content", !isMultiLine);
    }
    /**
     * Register click handler for content editing
     */
    registerContentClickHandler() {
        // Make content clickable for editing or navigation
        this.registerDomEvent(this.contentEl, "click", (e) => __awaiter(this, void 0, void 0, function* () {
            // Check if modifier key is pressed (Cmd/Ctrl)
            if (Keymap.isModEvent(e)) {
                // Open task in file
                e.stopPropagation();
                yield this.openTaskInFile();
            }
            else if (this.plugin.settings.enableInlineEditor && !this.isCurrentlyEditing()) {
                // Only stop propagation if we're actually going to show the editor
                e.stopPropagation();
                // Show inline editor only if enabled
                const editor = this.getInlineEditor();
                editor.showContentEditor(this.contentEl);
            }
            // If inline editor is disabled, let the click bubble up to select the task
        }));
    }
    updateTaskDisplay() {
        // Re-render the task content
        this.renderTaskContent();
    }
    renderChildTasks() {
        // Clear existing child components
        this.childComponents.forEach((component) => {
            component.unload();
        });
        this.childComponents = [];
        // Clear child container
        this.childrenContainer.empty();
        // Set visibility based on expanded state
        this.isExpanded
            ? this.childrenContainer.show()
            : this.childrenContainer.hide();
        // Get view configuration to check if we should hide completed and abandoned tasks
        const viewConfig = getViewSettingOrDefault(this.plugin, this.viewMode);
        const abandonedStatus = this.plugin.settings.taskStatuses.abandoned.split("|");
        const completedStatus = this.plugin.settings.taskStatuses.completed.split("|");
        // Filter child tasks based on view configuration
        let tasksToRender = this.childTasks;
        if (viewConfig.hideCompletedAndAbandonedTasks) {
            tasksToRender = this.childTasks.filter((task) => {
                return (!task.completed &&
                    !abandonedStatus.includes(task.status.toLowerCase()) &&
                    !completedStatus.includes(task.status.toLowerCase()));
            });
        }
        // Sort children using the same criteria as list view (fallback to sensible defaults)
        const childSortCriteria = viewConfig.sortCriteria;
        if (childSortCriteria && childSortCriteria.length > 0) {
            tasksToRender = sortTasks([...tasksToRender], childSortCriteria, this.plugin.settings);
        }
        else {
            // Default sorting: incomplete first, then priority (high->low), due date (earlier->later), content; tie-break by filePath->line
            tasksToRender = [...tasksToRender].sort((a, b) => {
                var _a, _b, _c, _d, _e, _f, _g, _h;
                const completedA = a.completed;
                const completedB = b.completed;
                if (completedA !== completedB)
                    return completedA ? 1 : -1;
                const prioA = (_a = a.metadata.priority) !== null && _a !== void 0 ? _a : 0;
                const prioB = (_b = b.metadata.priority) !== null && _b !== void 0 ? _b : 0;
                if (prioA !== prioB)
                    return prioB - prioA;
                const dueA = (_c = a.metadata.dueDate) !== null && _c !== void 0 ? _c : Infinity;
                const dueB = (_d = b.metadata.dueDate) !== null && _d !== void 0 ? _d : Infinity;
                if (dueA !== dueB)
                    return dueA - dueB;
                const collator = new Intl.Collator(undefined, {
                    usage: "sort",
                    sensitivity: "base",
                    numeric: true,
                });
                const contentCmp = collator.compare((_e = a.content) !== null && _e !== void 0 ? _e : "", (_f = b.content) !== null && _f !== void 0 ? _f : "");
                if (contentCmp !== 0)
                    return contentCmp;
                const fp = (a.filePath || "").localeCompare(b.filePath || "");
                if (fp !== 0)
                    return fp;
                return ((_g = a.line) !== null && _g !== void 0 ? _g : 0) - ((_h = b.line) !== null && _h !== void 0 ? _h : 0);
            });
        }
        // Render each filtered child task
        tasksToRender.forEach((childTask) => {
            // Find *grandchildren* by looking up children of the current childTask in the *full* taskMap
            const grandchildren = [];
            this.taskMap.forEach((potentialGrandchild) => {
                if (potentialGrandchild.metadata.parent === childTask.id) {
                    grandchildren.push(potentialGrandchild);
                }
            });
            const childComponent = new TaskTreeItemComponent(childTask, this.viewMode, this.app, this.indentLevel + 1, grandchildren, // Pass the correctly found grandchildren
            this.taskMap, // Pass the map down recursively
            this.plugin // Pass the plugin down
            );
            // Pass up events
            childComponent.onTaskSelected = (task) => {
                if (this.onTaskSelected) {
                    this.onTaskSelected(task);
                }
            };
            childComponent.onTaskCompleted = (task) => {
                if (this.onTaskCompleted) {
                    this.onTaskCompleted(task);
                }
            };
            childComponent.onToggleExpand = (taskId, isExpanded) => {
                if (this.onToggleExpand) {
                    this.onToggleExpand(taskId, isExpanded);
                }
            };
            childComponent.onTaskContextMenu = (event, task) => {
                if (this.onTaskContextMenu) {
                    this.onTaskContextMenu(event, task);
                }
            };
            // Pass up onTaskUpdate - CRITICAL: This was missing and causing the callback to not be available
            childComponent.onTaskUpdate = (originalTask, updatedTask) => __awaiter(this, void 0, void 0, function* () {
                if (this.onTaskUpdate) {
                    yield this.onTaskUpdate(originalTask, updatedTask);
                }
            });
            // Load component
            this.addChild(childComponent);
            childComponent.load();
            // Add to DOM
            this.childrenContainer.appendChild(childComponent.element);
            // Store for later cleanup
            this.childComponents.push(childComponent);
        });
    }
    updateChildTasks(childTasks) {
        this.childTasks = childTasks;
        this.renderChildTasks();
    }
    selectTask() {
        if (this.onTaskSelected) {
            this.onTaskSelected(this.task);
        }
    }
    toggleTaskCompletion() {
        // 创建任务的副本并切换完成状态
        const updatedTask = Object.assign(Object.assign({}, this.task), { completed: !this.task.completed });
        // 如果任务被标记为完成，设置完成日期
        if (!this.task.completed) {
            updatedTask.metadata = Object.assign(Object.assign({}, this.task.metadata), { completedDate: Date.now() });
        }
        else {
            // 如果任务被标记为未完成，移除完成日期
            updatedTask.metadata = Object.assign(Object.assign({}, this.task.metadata), { completedDate: undefined });
        }
        if (this.onTaskCompleted) {
            this.onTaskCompleted(updatedTask);
        }
    }
    toggleExpand() {
        this.isExpanded = !this.isExpanded;
        if (this.toggleEl instanceof HTMLElement) {
            setIcon(this.toggleEl, this.isExpanded ? "chevron-down" : "chevron-right");
        }
        // Show/hide children
        this.isExpanded
            ? this.childrenContainer.show()
            : this.childrenContainer.hide();
        // Notify parent
        if (this.onToggleExpand) {
            this.onToggleExpand(this.task.id, this.isExpanded);
        }
    }
    openTaskInFile() {
        return __awaiter(this, void 0, void 0, function* () {
            const file = this.app.vault.getFileByPath(this.task.filePath);
            if (file) {
                const leaf = this.app.workspace.getLeaf(false);
                yield leaf.openFile(file, {
                    eState: {
                        line: this.task.line,
                    },
                });
            }
        });
    }
    setSelected(selected) {
        this.isSelected = selected;
        this.element.classList.toggle("selected", selected);
    }
    updateTask(task) {
        const oldTask = this.task;
        this.task = task;
        this.renderTaskContent();
        // Update completion status
        if (oldTask.completed !== task.completed) {
            if (task.completed) {
                this.element.classList.add("task-completed");
            }
            else {
                this.element.classList.remove("task-completed");
            }
        }
        // If content or originalMarkdown changed, update the markdown display
        if (oldTask.originalMarkdown !== task.originalMarkdown ||
            oldTask.content !== task.content) {
            // Re-render the markdown content
            this.contentEl.empty();
            this.renderMarkdown();
        }
        // Check if metadata changed and need full refresh
        if (JSON.stringify(oldTask.metadata) !== JSON.stringify(task.metadata)) {
            // Re-render metadata
            const metadataEl = this.parentContainer.querySelector(".task-metadata");
            if (metadataEl) {
                this.renderMetadata(metadataEl);
            }
        }
    }
    /**
     * Attempts to find and update a task within this component's children.
     * @param updatedTask The task data to update.
     * @returns True if the task was found and updated in the subtree, false otherwise.
     */
    updateTaskRecursively(updatedTask) {
        // Iterate through the direct child components of this item
        for (const childComp of this.childComponents) {
            // Check if the direct child is the task we're looking for
            if (childComp.getTask().id === updatedTask.id) {
                childComp.updateTask(updatedTask); // Update the child directly
                return true; // Task found and updated
            }
            else {
                // If not a direct child, ask this child to check its own children recursively
                const foundInChildren = childComp.updateTaskRecursively(updatedTask);
                if (foundInChildren) {
                    return true; // Task was found deeper in this child's subtree
                }
            }
        }
        // If the loop finishes, the task was not found in this component's subtree
        return false;
    }
    /**
     * Find a component in this subtree by task id.
     */
    findComponentByTaskId(taskId) {
        if (this.task.id === taskId)
            return this;
        for (const child of this.childComponents) {
            const found = child.findComponentByTaskId(taskId);
            if (found)
                return found;
        }
        return null;
    }
    /**
     * Remove a child component (any depth) by task id. Returns true if removed.
     */
    removeChildByTaskId(taskId) {
        for (let i = 0; i < this.childComponents.length; i++) {
            const child = this.childComponents[i];
            if (child.getTask().id === taskId) {
                child.unload();
                this.childComponents.splice(i, 1);
                return true;
            }
            if (child.removeChildByTaskId(taskId)) {
                return true;
            }
        }
        return false;
    }
    getTask() {
        return this.task;
    }
    /**
     * Updates the visual selection state of this component and its children.
     * @param selectedId The ID of the task that should be marked as selected, or null to deselect all.
     */
    updateSelectionVisuals(selectedId) {
        var _a;
        const isNowSelected = this.task.id === selectedId;
        if (this.isSelected !== isNowSelected) {
            this.isSelected = isNowSelected;
            // Use the existing element reference if available, otherwise querySelector
            const elementToToggle = this.element ||
                ((_a = this.parentContainer) === null || _a === void 0 ? void 0 : _a.closest(".tree-task-item"));
            if (elementToToggle) {
                elementToToggle.classList.toggle("is-selected", this.isSelected);
                // Also ensure the parent container reflects selection if separate element
                if (this.parentContainer) {
                    this.parentContainer.classList.toggle("selected", this.isSelected);
                }
            }
            else {
                console.warn("Could not find element to toggle selection class for task:", this.task.id);
            }
        }
        // Recursively update children
        this.childComponents.forEach((child) => child.updateSelectionVisuals(selectedId));
    }
    setExpanded(expanded) {
        if (this.isExpanded !== expanded) {
            this.isExpanded = expanded;
            // Update icon
            if (this.toggleEl instanceof HTMLElement) {
                setIcon(this.toggleEl, this.isExpanded ? "chevron-down" : "chevron-right");
            }
            // Show/hide children
            this.isExpanded
                ? this.childrenContainer.show()
                : this.childrenContainer.hide();
        }
    }
    onunload() {
        var _a;
        // Release editor from manager if this task was being edited
        if ((_a = TaskTreeItemComponent.editorManager) === null || _a === void 0 ? void 0 : _a.hasActiveEditor(this.task.id)) {
            TaskTreeItemComponent.editorManager.releaseEditor(this.task.id);
        }
        // Clean up child components
        this.childComponents.forEach((component) => {
            component.unload();
        });
        // Remove element from DOM if it exists
        if (this.element && this.element.parentNode) {
            this.element.remove();
        }
    }
}
// Use shared editor manager instead of individual editors
TaskTreeItemComponent.editorManager = null;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZUl0ZW0uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0cmVlSXRlbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFPLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUVqRSxPQUFPLHdCQUF3QixDQUFDO0FBQ2hDLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUMvQyxPQUFPLEVBQUUsdUJBQXVCLEVBQVksTUFBTSw2QkFBNkIsQ0FBQztBQUNoRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNwRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFHMUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDNUQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdkUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRXhELE1BQU0sT0FBTyxxQkFBc0IsU0FBUSxTQUFTO0lBNkJuRCxZQUNDLElBQVUsRUFDVixRQUFnQixFQUNSLEdBQVEsRUFDaEIsY0FBc0IsQ0FBQyxFQUNmLGFBQXFCLEVBQUUsRUFDL0IsT0FBMEIsRUFDbEIsTUFBNkI7UUFFckMsS0FBSyxFQUFFLENBQUM7UUFOQSxRQUFHLEdBQUgsR0FBRyxDQUFLO1FBRVIsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUV2QixXQUFNLEdBQU4sTUFBTSxDQUF1QjtRQWpDOUIsZUFBVSxHQUFZLEtBQUssQ0FBQztRQUM1QixlQUFVLEdBQVksSUFBSSxDQUFDO1FBRTNCLGdCQUFXLEdBQVcsQ0FBQyxDQUFDO1FBR3hCLG9CQUFlLEdBQTRCLEVBQUUsQ0FBQztRQThCckQsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDakIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7UUFDL0IsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFFdkIsaURBQWlEO1FBQ2pELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxhQUFhLEVBQUU7WUFDekMscUJBQXFCLENBQUMsYUFBYSxHQUFHLElBQUksbUJBQW1CLENBQzVELElBQUksQ0FBQyxHQUFHLEVBQ1IsSUFBSSxDQUFDLE1BQU0sQ0FDWCxDQUFDO1NBQ0Y7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSyxlQUFlO1FBQ3RCLE1BQU0sYUFBYSxHQUF3QjtZQUMxQyxZQUFZLEVBQUUsQ0FBTyxZQUFrQixFQUFFLFdBQWlCLEVBQUUsRUFBRTtnQkFDN0QsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFO29CQUN0QixJQUFJO3dCQUNILE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsV0FBVyxDQUFDLENBQUM7d0JBQ25ELE9BQU8sQ0FBQyxHQUFHLENBQ1YsOENBQThDLENBQzlDLENBQUM7d0JBQ0YseUVBQXlFO3FCQUN6RTtvQkFBQyxPQUFPLEtBQUssRUFBRTt3QkFDZixPQUFPLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxFQUFFLEtBQUssQ0FBQyxDQUFDO3dCQUN4RCxNQUFNLEtBQUssQ0FBQyxDQUFDLDZDQUE2QztxQkFDMUQ7aUJBQ0Q7cUJBQU07b0JBQ04sT0FBTyxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO2lCQUNuRDtZQUNGLENBQUMsQ0FBQTtZQUNELHFCQUFxQixFQUFFLENBQ3RCLFFBQXFCLEVBQ3JCLFdBQWlCLEVBQ2hCLEVBQUU7O2dCQUNILGdEQUFnRDtnQkFDaEQsSUFBSSxDQUFDLElBQUksR0FBRyxXQUFXLENBQUM7Z0JBRXhCLDJEQUEyRDtnQkFDM0QsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUV0QiwyQ0FBMkM7Z0JBQzNDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO2dCQUV6QixzQ0FBc0M7Z0JBQ3RDLE1BQUEscUJBQXFCLENBQUMsYUFBYSwwQ0FBRSxhQUFhLENBQ2pELElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUNaLENBQUM7WUFDSCxDQUFDO1lBQ0Qsc0JBQXNCLEVBQUUsQ0FDdkIsUUFBcUIsRUFDckIsV0FBaUIsRUFDakIsU0FBaUIsRUFDaEIsRUFBRTs7Z0JBQ0gsZ0RBQWdEO2dCQUNoRCxJQUFJLENBQUMsSUFBSSxHQUFHLFdBQVcsQ0FBQztnQkFFeEIsc0RBQXNEO2dCQUN0RCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFFekIsc0NBQXNDO2dCQUN0QyxNQUFBLHFCQUFxQixDQUFDLGFBQWEsMENBQUUsYUFBYSxDQUNqRCxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FDWixDQUFDO1lBQ0gsQ0FBQztZQUNELGlCQUFpQixFQUFFLElBQUksRUFBRSxvQ0FBb0M7U0FDN0QsQ0FBQztRQUVGLE9BQU8scUJBQXFCLENBQUMsYUFBYyxDQUFDLFNBQVMsQ0FDcEQsSUFBSSxDQUFDLElBQUksRUFDVCxhQUFhLENBQ2IsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNLLGtCQUFrQjs7UUFDekIsT0FBTyxDQUNOLENBQUEsTUFBQSxxQkFBcUIsQ0FBQyxhQUFhLDBDQUFFLGVBQWUsQ0FDbkQsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQ1osS0FBSSxLQUFLLENBQ1YsQ0FBQztJQUNILENBQUM7SUFFRCxNQUFNO1FBQ0wsNkJBQTZCO1FBQzdCLElBQUksQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDO1lBQ3hCLEdBQUcsRUFBRSxDQUFDLFdBQVcsRUFBRSxnQkFBZ0IsQ0FBQztZQUNwQyxJQUFJLEVBQUU7Z0JBQ0wsY0FBYyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTthQUM1QjtTQUNELENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3hELENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNuQixDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDcEIsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEVBQUU7Z0JBQzNCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3JDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCwwQkFBMEI7UUFDMUIsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQztZQUM3QyxHQUFHLEVBQUUsdUJBQXVCO1NBQzVCLENBQUMsQ0FBQztRQUVILHNCQUFzQjtRQUN0QixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUV6QixtQ0FBbUM7UUFDbkMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO1lBQy9DLEdBQUcsRUFBRSx5QkFBeUI7U0FDOUIsQ0FBQyxDQUFDO1FBRUgscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBRXhCLHVDQUF1QztRQUN2QyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUMxRCw0REFBNEQ7WUFDNUQsSUFDQyxDQUFDLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxlQUFlO2dCQUNqQyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBYyxDQUFDLEVBQzlDO2dCQUNELE1BQU0sVUFBVSxHQUFJLENBQUMsQ0FBQyxNQUFzQixDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQzlELGVBQWUsQ0FDZixDQUFDO2dCQUVGLElBQUksVUFBVSxFQUFFO29CQUNmLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztvQkFDcEIsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7aUJBQzVCO3FCQUFNLElBQ0wsQ0FBQyxDQUFDLE1BQXNCLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FDM0Msb0JBQW9CLENBQ3BCLEVBQ0E7b0JBQ0QsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO2lCQUNwQjtxQkFBTTtvQkFDTixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7aUJBQ2xCO2FBQ0Q7UUFDRixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTyxpQkFBaUI7UUFDeEIseUJBQXlCO1FBQ3pCLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDN0IsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3hFLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRW5FLDZCQUE2QjtRQUM3QixJQUFJLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxFQUFFO1lBQ3pCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDO2dCQUMvQyxHQUFHLEVBQUUsYUFBYTthQUNsQixDQUFDLENBQUM7WUFDSCxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxHQUFHLElBQUksQ0FBQyxXQUFXLEdBQUcsRUFBRSxJQUFJLENBQUM7U0FDcEQ7UUFFRCxpREFBaUQ7UUFDakQsSUFDQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRO1lBQzNCLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUNyQztZQUNELElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUM7Z0JBQzlDLEdBQUcsRUFBRSxvQkFBb0I7YUFDekIsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxDQUNOLElBQUksQ0FBQyxRQUFRLEVBQ2IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQ2xELENBQUM7WUFFRix3QkFBd0I7WUFDeEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQ25ELENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDcEIsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3JCLENBQUMsQ0FBQyxDQUFDO1NBQ0g7UUFFRCxXQUFXO1FBQ1gsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQ2hEO1lBQ0MsR0FBRyxFQUFFLGVBQWU7U0FDcEIsRUFDRCxDQUFDLEVBQUUsRUFBRSxFQUFFO1lBQ04sTUFBTSxRQUFRLEdBQUcsa0JBQWtCLENBQ2xDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUNoQixJQUFJLENBQUMsSUFBSSxFQUNULEVBQUUsQ0FDRixDQUFDO1lBRUYsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDbEQsS0FBSyxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUV4QixJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUU7b0JBQ3pCLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUNoQztnQkFFRCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLEdBQUcsRUFBRTtvQkFDN0IsUUFBUSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7b0JBQ3hCLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQztpQkFDNUI7WUFDRixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FDRCxDQUFDO1FBRUYsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQztZQUN4RCxHQUFHLEVBQUUscUJBQXFCO1NBQzFCLENBQUMsQ0FBQztRQUVILHVEQUF1RDtRQUN2RCxJQUFJLENBQUMsd0JBQXdCLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxDQUFDO1lBQzNELEdBQUcsRUFBRSxpQ0FBaUM7U0FDdEMsQ0FBQyxDQUFDO1FBRUgsdUNBQXVDO1FBQ3ZDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFNBQVMsQ0FBQztZQUN4RCxHQUFHLEVBQUUsbUJBQW1CO1NBQ3hCLENBQUMsQ0FBQztRQUVILHVFQUF1RTtRQUN2RSxJQUFJLENBQUMsMkJBQTJCLEVBQUUsQ0FBQztRQUVuQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFFdEIscUJBQXFCO1FBQ3JCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLENBQUM7WUFDMUQsR0FBRyxFQUFFLGVBQWU7U0FDcEIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUVoQyxrQ0FBa0M7UUFDbEMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUU7WUFDaEMsTUFBTSxpQkFBaUIsR0FBRyx3QkFBd0IsQ0FDakQsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUMzQixDQUFDO1lBQ0YsTUFBTSxPQUFPLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUNsQyxJQUFJLGlCQUFpQixFQUFFO2dCQUN0QixPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO2FBQzlDO1lBQ0QsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFFL0MsK0JBQStCO1lBQy9CLElBQUksSUFBSSxHQUFHLEdBQUcsQ0FBQztZQUNmLElBQUksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRS9DLFVBQVUsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1lBQzlCLElBQUksQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQzdDO0lBQ0YsQ0FBQztJQUVPLGNBQWMsQ0FBQyxVQUF1QjtRQUM3QyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFbkIsOEVBQThFO1FBQzlFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFO1lBQ3JDLElBQUksQ0FBQyxrQkFBa0IsQ0FDdEIsVUFBVSxFQUNWLFdBQVcsRUFDWCxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQ2hDLENBQUM7U0FDRjtRQUVELGdEQUFnRDtRQUNoRCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUU7WUFDekIsd0JBQXdCO1lBQ3hCLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFO2dCQUMvQixJQUFJLENBQUMsa0JBQWtCLENBQ3RCLFVBQVUsRUFDVixLQUFLLEVBQ0wsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUMxQixDQUFDO2FBQ0Y7WUFFRCw4QkFBOEI7WUFDOUIsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUU7Z0JBQ3JDLElBQUksQ0FBQyxrQkFBa0IsQ0FDdEIsVUFBVSxFQUNWLFdBQVcsRUFDWCxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQ2hDLENBQUM7YUFDRjtZQUVELDBCQUEwQjtZQUMxQixJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRTtnQkFDakMsSUFBSSxDQUFDLGtCQUFrQixDQUN0QixVQUFVLEVBQ1YsT0FBTyxFQUNQLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FDNUIsQ0FBQzthQUNGO1lBRUQsMEJBQTBCO1lBQzFCLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFO2dCQUNsQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsVUFBVSxDQUFDLENBQUM7YUFDMUM7U0FDRDthQUFNO1lBQ04sNENBQTRDO1lBQzVDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFO2dCQUNyQyxJQUFJLENBQUMsa0JBQWtCLENBQ3RCLFVBQVUsRUFDVixXQUFXLEVBQ1gsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUNoQyxDQUFDO2FBQ0Y7WUFFRCw0QkFBNEI7WUFDNUIsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUU7Z0JBQ25DLElBQUksQ0FBQyxrQkFBa0IsQ0FDdEIsVUFBVSxFQUNWLFNBQVMsRUFDVCxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQzlCLENBQUM7YUFDRjtTQUNEO1FBRUQscURBQXFEO1FBQ3JELElBQ0MsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDO1lBQzVELElBQUksQ0FBQyxRQUFRLEtBQUssVUFBVSxFQUMzQjtZQUNELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUN2QztRQUVELG9CQUFvQjtRQUNwQixJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUNsRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDcEM7UUFFRCw0QkFBNEI7UUFDNUIsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUU7WUFDcEMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQzVDO1FBRUQseUJBQXlCO1FBQ3pCLElBQ0MsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUztZQUM1QixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsRUFDdEM7WUFDRCxJQUFJLENBQUMsdUJBQXVCLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDekM7UUFFRCxrQkFBa0I7UUFDbEIsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUU7WUFDMUIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQ2xDO1FBRUQsOENBQThDO1FBQzlDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRU8sa0JBQWtCLENBQ3pCLFVBQXVCLEVBQ3ZCLElBTVksRUFDWixTQUFpQjs7UUFFakIsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUU7WUFDekMsR0FBRyxFQUFFLENBQUMsV0FBVyxFQUFFLFFBQVEsSUFBSSxPQUFPLENBQUM7U0FDdkMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDakMsSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDO1FBQ2xCLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQztRQUVsQixJQUFJLElBQUksS0FBSyxLQUFLLEVBQUU7WUFDbkIsTUFBTSxLQUFLLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUN6QixLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRTNCLE1BQU0sUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2pDLFFBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBRXpDLGNBQWM7WUFDZCxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxLQUFLLENBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQ3JDLFFBQVE7b0JBQ1AsQ0FBQyxDQUFDLFNBQVMsQ0FBQzt3QkFDWixDQUFDLENBQUEsTUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsMENBQUUsc0JBQXNCOzRCQUM1QyxDQUFDLENBQUMsS0FBSyxHQUFHLHFCQUFxQixDQUFDLElBQUksQ0FBQzs0QkFDckMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNSLFFBQVEsR0FBRyxjQUFjLENBQUM7YUFDMUI7aUJBQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssS0FBSyxDQUFDLE9BQU8sRUFBRSxFQUFFO2dCQUM5QyxRQUFRLEdBQUcsQ0FBQSxNQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSwwQ0FBRSxzQkFBc0I7b0JBQ3RELENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPO29CQUN4QyxDQUFDLENBQUMsT0FBTyxDQUFDO2dCQUNYLFFBQVEsR0FBRyxnQkFBZ0IsQ0FBQzthQUM1QjtpQkFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxRQUFRLENBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQ2pELFFBQVEsR0FBRyxDQUFBLE1BQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLDBDQUFFLHNCQUFzQjtvQkFDdEQsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLFVBQVU7b0JBQzNDLENBQUMsQ0FBQyxVQUFVLENBQUM7Z0JBQ2QsUUFBUSxHQUFHLG1CQUFtQixDQUFDO2FBQy9CO2lCQUFNO2dCQUNOLFFBQVEsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFO29CQUMzQyxJQUFJLEVBQUUsU0FBUztvQkFDZixLQUFLLEVBQUUsTUFBTTtvQkFDYixHQUFHLEVBQUUsU0FBUztpQkFDZCxDQUFDLENBQUM7YUFDSDtTQUNEO2FBQU07WUFDTixRQUFRLEdBQUcsQ0FBQSxNQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSwwQ0FBRSxzQkFBc0I7Z0JBQ3RELENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUM7Z0JBQzdCLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFO29CQUNqQyxJQUFJLEVBQUUsU0FBUztvQkFDZixLQUFLLEVBQUUsTUFBTTtvQkFDYixHQUFHLEVBQUUsU0FBUztpQkFDYixDQUFDLENBQUM7U0FDTjtRQUVELElBQUksUUFBUSxFQUFFO1lBQ2IsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDL0I7UUFFRCxNQUFNLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQztRQUM5QixNQUFNLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO1FBRTdELG1FQUFtRTtRQUNuRSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFO1lBQzVDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQzVDLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxFQUFFO29CQUMvQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7b0JBQ3RDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDakQsTUFBTSxTQUFTLEdBQ2QsSUFBSSxLQUFLLEtBQUs7d0JBQ2IsQ0FBQyxDQUFDLFNBQVM7d0JBQ1gsQ0FBQyxDQUFDLElBQUksS0FBSyxXQUFXOzRCQUN0QixDQUFDLENBQUMsZUFBZTs0QkFDakIsQ0FBQyxDQUFDLElBQUksS0FBSyxPQUFPO2dDQUNsQixDQUFDLENBQUMsV0FBVztnQ0FDYixDQUFDLENBQUMsSUFBSSxLQUFLLFdBQVc7b0NBQ3RCLENBQUMsQ0FBQyxlQUFlO29DQUNqQixDQUFDLENBQUMsSUFBSSxLQUFLLFdBQVc7d0NBQ3RCLENBQUMsQ0FBQyxlQUFlO3dDQUNqQixDQUFDLENBQUMsSUFBSSxDQUFDO29CQUVULElBQUksU0FBUyxFQUFFO3dCQUNkLE1BQU0sQ0FBQyxrQkFBa0IsQ0FDeEIsTUFBTSxFQUNOLFNBQVMsRUFDVCxVQUFVLENBQ1YsQ0FBQztxQkFDRjtpQkFDRDtZQUNGLENBQUMsQ0FBQyxDQUFDO1NBQ0g7SUFDRixDQUFDO0lBRU8scUJBQXFCLENBQUMsVUFBdUI7UUFDcEQsb0VBQW9FO1FBQ3BFLElBQUksV0FBK0IsQ0FBQztRQUNwQyxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUM7UUFFdkIsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUU7WUFDL0Isb0NBQW9DO1lBQ3BDLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7U0FDekM7YUFBTSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRTtZQUN4Qyw0QkFBNEI7WUFDNUIsV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7WUFDaEQsVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxRQUFRLElBQUksS0FBSyxDQUFDO1NBQzVEO1FBRUQsSUFBSSxDQUFDLFdBQVc7WUFBRSxPQUFPO1FBRXpCLE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFO1lBQzVDLEdBQUcsRUFBRSxjQUFjO1NBQ25CLENBQUMsQ0FBQztRQUVILHVDQUF1QztRQUN2QyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRTtZQUNoRSxTQUFTLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDdEMsU0FBUyxDQUFDLEtBQUssR0FBRyxnQkFDakIsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQzlCLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLE1BQU0sSUFBSSxFQUFFLEVBQUUsQ0FBQztTQUNqRDtRQUVELFNBQVMsQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxXQUFXLENBQUM7UUFFcEUsdUZBQXVGO1FBQ3ZGLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsa0JBQWtCLElBQUksQ0FBQyxVQUFVLEVBQUU7WUFDM0QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDL0MsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUNwQixJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEVBQUU7b0JBQy9CLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztvQkFDdEMsTUFBTSxDQUFDLGtCQUFrQixDQUN4QixTQUFTLEVBQ1QsU0FBUyxFQUNULElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQ2hDLENBQUM7aUJBQ0Y7WUFDRixDQUFDLENBQUMsQ0FBQztTQUNIO0lBQ0YsQ0FBQztJQUVPLGtCQUFrQixDQUFDLFVBQXVCO1FBQ2pELE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFO1lBQ2hELEdBQUcsRUFBRSxxQkFBcUI7U0FDMUIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxhQUFhLEdBQ2xCLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUNwQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FDekMsSUFBSSxTQUFTLENBQUM7UUFDaEIsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSTthQUNyQixNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLGFBQWEsRUFBRSxDQUFDLENBQUM7YUFDckQsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDaEIsTUFBTSxLQUFLLEdBQUcsYUFBYSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUU7Z0JBQzVDLEdBQUcsRUFBRSxVQUFVO2dCQUNmLElBQUksRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxFQUFFO2FBQzNDLENBQUMsQ0FBQztZQUVILGtFQUFrRTtZQUNsRSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFO2dCQUM1QyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFOztvQkFDM0MsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO29CQUNwQixJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEVBQUU7d0JBQy9CLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQzt3QkFDdEMsTUFBTSxVQUFVLEdBQ2YsQ0FBQSxNQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksMENBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFJLEVBQUUsQ0FBQzt3QkFDM0MsTUFBTSxDQUFDLGtCQUFrQixDQUN4QixhQUFhLEVBQ2IsTUFBTSxFQUNOLFVBQVUsQ0FDVixDQUFDO3FCQUNGO2dCQUNGLENBQUMsQ0FBQyxDQUFDO2FBQ0g7UUFDRixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyx3QkFBd0IsQ0FBQyxVQUF1QjtRQUN2RCxNQUFNLFlBQVksR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRTtZQUMvQyxHQUFHLEVBQUUsMkJBQTJCO1NBQ2hDLENBQUMsQ0FBQztRQUNILFlBQVksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxJQUFJLEVBQUUsQ0FBQztRQUUvRCx5RUFBeUU7UUFDekUsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRTtZQUM1QyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUNsRCxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ3BCLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsRUFBRTtvQkFDL0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO29CQUN0QyxNQUFNLENBQUMsa0JBQWtCLENBQ3hCLFlBQVksRUFDWixZQUFZLEVBQ1osSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxJQUFJLEVBQUUsQ0FDbkMsQ0FBQztpQkFDRjtZQUNGLENBQUMsQ0FBQyxDQUFDO1NBQ0g7SUFDRixDQUFDO0lBRU8sMEJBQTBCLENBQUMsVUFBdUI7UUFDekQsTUFBTSxjQUFjLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUU7WUFDakQsR0FBRyxFQUFFLG1CQUFtQjtTQUN4QixDQUFDLENBQUM7UUFDSCxjQUFjLENBQUMsV0FBVyxHQUFHLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLENBQUM7UUFFckUsMkVBQTJFO1FBQzNFLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUU7WUFDNUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDcEQsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUNwQixJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEVBQUU7b0JBQy9CLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztvQkFDdEMsTUFBTSxDQUFDLGtCQUFrQixDQUN4QixjQUFjLEVBQ2QsY0FBYyxFQUNkLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksSUFBSSxFQUFFLENBQ3JDLENBQUM7aUJBQ0Y7WUFDRixDQUFDLENBQUMsQ0FBQztTQUNIO0lBQ0YsQ0FBQztJQUVPLHVCQUF1QixDQUFDLFVBQXVCOztRQUN0RCxNQUFNLFdBQVcsR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRTtZQUM5QyxHQUFHLEVBQUUsZ0JBQWdCO1NBQ3JCLENBQUMsQ0FBQztRQUNILFdBQVcsQ0FBQyxXQUFXLEdBQUcsS0FBSyxNQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsMENBQUUsSUFBSSxDQUNoRSxJQUFJLENBQ0osRUFBRSxDQUFDO1FBRUosd0VBQXdFO1FBQ3hFLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUU7WUFDNUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTs7Z0JBQ2pELENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxFQUFFO29CQUMvQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7b0JBQ3RDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FDeEIsV0FBVyxFQUNYLFdBQVcsRUFDWCxDQUFBLE1BQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUywwQ0FBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUksRUFBRSxDQUM5QyxDQUFDO2lCQUNGO1lBQ0YsQ0FBQyxDQUFDLENBQUM7U0FDSDtJQUNGLENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxVQUF1QjtRQUMvQyxNQUFNLElBQUksR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRTtZQUN2QyxHQUFHLEVBQUUsU0FBUztTQUNkLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxXQUFXLEdBQUcsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUVqRCxpRUFBaUU7UUFDakUsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRTtZQUM1QyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUMxQyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ3BCLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsRUFBRTtvQkFDL0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO29CQUN0QyxNQUFNLENBQUMsa0JBQWtCLENBQ3hCLElBQUksRUFDSixJQUFJLEVBQ0osSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FDM0IsQ0FBQztpQkFDRjtZQUNGLENBQUMsQ0FBQyxDQUFDO1NBQ0g7SUFDRixDQUFDO0lBRU8sdUJBQXVCLENBQUMsVUFBdUI7UUFDdEQsNERBQTREO1FBQzVELElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRTtZQUM3QyxPQUFPO1NBQ1A7UUFFRCxNQUFNLGtCQUFrQixHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUM7WUFDL0MsR0FBRyxFQUFFLHdCQUF3QjtTQUM3QixDQUFDLENBQUM7UUFFSCxpQ0FBaUM7UUFDakMsTUFBTSxNQUFNLEdBQUcsa0JBQWtCLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRTtZQUNwRCxHQUFHLEVBQUUsa0JBQWtCO1lBQ3ZCLElBQUksRUFBRSxFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUU7U0FDdEMsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUV4QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzVDLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUNwQix1RUFBdUU7WUFDdkUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQy9CLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVPLGdCQUFnQixDQUFDLFFBQXFCO1FBQzdDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUV0QyxvQ0FBb0M7UUFDcEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUV4QixNQUFNLGVBQWUsR0FBRztZQUN2QixFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFO1lBQ3BELEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUU7WUFDM0MsRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRTtZQUNyRCxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFO1lBQ3ZELEVBQUUsR0FBRyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7WUFDdkQsRUFBRSxHQUFHLEVBQUUsZUFBZSxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFO1lBQ2hFLEVBQUUsR0FBRyxFQUFFLGVBQWUsRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRTtZQUM1RCxFQUFFLEdBQUcsRUFBRSxlQUFlLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxPQUFPLEVBQUU7WUFDaEUsRUFBRSxHQUFHLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQzlELEVBQUUsR0FBRyxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7WUFDMUQsRUFBRSxHQUFHLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtZQUM3RCxFQUFFLEdBQUcsRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO1lBQ3ZELEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7U0FDN0MsQ0FBQztRQUVGLDZDQUE2QztRQUM3QyxNQUFNLFlBQVksR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDckQsUUFBUSxLQUFLLENBQUMsR0FBRyxFQUFFO2dCQUNsQixLQUFLLFNBQVM7b0JBQ2IsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQztnQkFDcEMsS0FBSyxNQUFNO29CQUNWLE9BQU8sQ0FDTixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUk7d0JBQ3hCLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUNwQyxDQUFDO2dCQUNILEtBQUssU0FBUztvQkFDYixPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDO2dCQUNwQyxLQUFLLFNBQVM7b0JBQ2IsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQztnQkFDcEMsS0FBSyxXQUFXO29CQUNmLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUM7Z0JBQ3RDLEtBQUssZUFBZTtvQkFDbkIsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQztnQkFDMUMsS0FBSyxlQUFlO29CQUNuQixPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDO2dCQUMxQyxLQUFLLGVBQWU7b0JBQ25CLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUM7Z0JBQzFDLEtBQUssVUFBVTtvQkFDZCxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDO2dCQUNyQyxLQUFLLFlBQVk7b0JBQ2hCLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUM7Z0JBQ3ZDLEtBQUssY0FBYztvQkFDbEIsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQztnQkFDekMsS0FBSyxXQUFXO29CQUNmLE9BQU8sQ0FDTixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVM7d0JBQzdCLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUN6QyxDQUFDO2dCQUNILEtBQUssSUFBSTtvQkFDUixPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUMvQjtvQkFDQyxPQUFPLElBQUksQ0FBQzthQUNiO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxvREFBb0Q7UUFDcEQsSUFBSSxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUM5QixJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7Z0JBQ3JCLElBQUksQ0FBQyxRQUFRLENBQ1oscUNBQXFDLENBQ3JDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3JCLENBQUMsQ0FBQyxDQUFDO1NBQ0g7YUFBTTtZQUNOLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDOUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQVMsRUFBRSxFQUFFO29CQUMxQixJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUM7eUJBQ3hCLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO3lCQUNuQixPQUFPLENBQUMsR0FBRyxFQUFFO3dCQUNiLHVEQUF1RDt3QkFDdkQsTUFBTSxhQUFhLEdBQ2xCLFFBQVEsQ0FBQyxhQUFjLENBQUMsU0FBUyxDQUFDOzRCQUNqQyxHQUFHLEVBQUUsZ0NBQWdDO3lCQUNyQyxDQUFDLENBQUM7d0JBRUosTUFBTSxDQUFDLGtCQUFrQixDQUN4QixhQUFhLEVBQ2IsS0FBSyxDQUFDLEdBQVUsQ0FDaEIsQ0FBQztvQkFDSCxDQUFDLENBQUMsQ0FBQztnQkFDTCxDQUFDLENBQUMsQ0FBQztZQUNKLENBQUMsQ0FBQyxDQUFDO1NBQ0g7UUFFRCxJQUFJLENBQUMsY0FBYyxDQUFDO1lBQ25CLENBQUMsRUFBRSxRQUFRLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxJQUFJO1lBQ3hDLENBQUMsRUFBRSxRQUFRLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxNQUFNO1NBQzFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxJQUFVO1FBQ3BDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNoQyxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDM0QsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDcEQsT0FBTyxHQUFHLElBQUksSUFBSSxLQUFLLElBQUksR0FBRyxFQUFFLENBQUM7SUFDbEMsQ0FBQztJQUVPLGNBQWM7UUFDckIsbUNBQW1DO1FBQ25DLElBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFO1lBQzFCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7U0FDeEM7UUFFRCw0QkFBNEI7UUFDNUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUV2QixzQkFBc0I7UUFDdEIsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUkseUJBQXlCLENBQ3BELElBQUksQ0FBQyxHQUFHLEVBQ1IsSUFBSSxDQUFDLFNBQVMsRUFDZCxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FDbEIsQ0FBQztRQUNGLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFFckMsOEJBQThCO1FBQzlCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBRXpELDBEQUEwRDtRQUMxRCxJQUFJLENBQUMsMkJBQTJCLEVBQUUsQ0FBQztRQUVuQywrQ0FBK0M7UUFDL0Msb0VBQW9FO1FBQ3BFLHFCQUFxQixDQUFDLEdBQUcsRUFBRTtZQUMxQixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUN6QixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRDs7T0FFRztJQUNLLGdCQUFnQjtRQUN2QixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBRTtZQUN0RCxPQUFPO1NBQ1A7UUFFRCxtREFBbUQ7UUFDbkQsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGdDQUFnQyxFQUFFO1lBQzNELDBEQUEwRDtZQUMxRCxJQUFJLENBQUMsd0JBQXdCLENBQUMsV0FBVyxDQUN4QyxvQkFBb0IsRUFDcEIsSUFBSSxDQUNKLENBQUM7WUFDRixJQUFJLENBQUMsd0JBQXdCLENBQUMsV0FBVyxDQUN4QyxxQkFBcUIsRUFDckIsS0FBSyxDQUNMLENBQUM7WUFDRixPQUFPO1NBQ1A7UUFFRCw2Q0FBNkM7UUFDN0MsTUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM5RCxNQUFNLFVBQVUsR0FDZixVQUFVLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQztZQUNwQyxVQUFVLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEdBQUcsQ0FBQztRQUUxQyw0QkFBNEI7UUFDNUIsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUM7UUFFbEQsdURBQXVEO1FBQ3ZELE1BQU0sV0FBVyxHQUFHLGFBQWEsR0FBRyxVQUFVLEdBQUcsR0FBRyxDQUFDO1FBRXJELHFFQUFxRTtRQUNyRSxJQUFJLENBQUMsd0JBQXdCLENBQUMsV0FBVyxDQUN4QyxvQkFBb0IsRUFDcEIsV0FBVyxDQUNYLENBQUM7UUFDRixJQUFJLENBQUMsd0JBQXdCLENBQUMsV0FBVyxDQUN4QyxxQkFBcUIsRUFDckIsQ0FBQyxXQUFXLENBQ1osQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNLLDJCQUEyQjtRQUNsQyxtREFBbUQ7UUFDbkQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLENBQU8sQ0FBQyxFQUFFLEVBQUU7WUFDMUQsOENBQThDO1lBQzlDLElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDekIsb0JBQW9CO2dCQUNwQixDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ3BCLE1BQU0sSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO2FBQzVCO2lCQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsa0JBQWtCLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsRUFBRTtnQkFDakYsbUVBQW1FO2dCQUNuRSxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ3BCLHFDQUFxQztnQkFDckMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUN0QyxNQUFNLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2FBQ3pDO1lBQ0QsMkVBQTJFO1FBQzVFLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8saUJBQWlCO1FBQ3hCLDZCQUE2QjtRQUM3QixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRU8sZ0JBQWdCO1FBQ3ZCLGtDQUFrQztRQUNsQyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFO1lBQzFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNwQixDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxlQUFlLEdBQUcsRUFBRSxDQUFDO1FBRTFCLHdCQUF3QjtRQUN4QixJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFL0IseUNBQXlDO1FBQ3pDLElBQUksQ0FBQyxVQUFVO1lBQ2QsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUU7WUFDL0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUVqQyxrRkFBa0Y7UUFDbEYsTUFBTSxVQUFVLEdBQUcsdUJBQXVCLENBQ3pDLElBQUksQ0FBQyxNQUFNLEVBQ1gsSUFBSSxDQUFDLFFBQW9CLENBQ3pCLENBQUM7UUFDRixNQUFNLGVBQWUsR0FDcEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDeEQsTUFBTSxlQUFlLEdBQ3BCLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRXhELGlEQUFpRDtRQUNqRCxJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQ3BDLElBQUksVUFBVSxDQUFDLDhCQUE4QixFQUFFO1lBQzlDLGFBQWEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO2dCQUMvQyxPQUFPLENBQ04sQ0FBQyxJQUFJLENBQUMsU0FBUztvQkFDZixDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDcEQsQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FDcEQsQ0FBQztZQUNILENBQUMsQ0FBQyxDQUFDO1NBQ0g7UUFDRCxxRkFBcUY7UUFDckYsTUFBTSxpQkFBaUIsR0FBRyxVQUFVLENBQUMsWUFBWSxDQUFDO1FBQ2xELElBQUksaUJBQWlCLElBQUksaUJBQWlCLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUN0RCxhQUFhLEdBQUcsU0FBUyxDQUN4QixDQUFDLEdBQUcsYUFBYSxDQUFDLEVBQ2xCLGlCQUFpQixFQUNqQixJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FDcEIsQ0FBQztTQUNGO2FBQU07WUFDTixnSUFBZ0k7WUFDaEksYUFBYSxHQUFHLENBQUMsR0FBRyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7O2dCQUNoRCxNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDO2dCQUMvQixNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDO2dCQUMvQixJQUFJLFVBQVUsS0FBSyxVQUFVO29CQUFFLE9BQU8sVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUUxRCxNQUFNLEtBQUssR0FBRyxNQUFBLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxtQ0FBSSxDQUFDLENBQUM7Z0JBQ3ZDLE1BQU0sS0FBSyxHQUFHLE1BQUEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLG1DQUFJLENBQUMsQ0FBQztnQkFDdkMsSUFBSSxLQUFLLEtBQUssS0FBSztvQkFBRSxPQUFPLEtBQUssR0FBRyxLQUFLLENBQUM7Z0JBRTFDLE1BQU0sSUFBSSxHQUFHLE1BQUEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLG1DQUFJLFFBQVEsQ0FBQztnQkFDNUMsTUFBTSxJQUFJLEdBQUcsTUFBQSxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sbUNBQUksUUFBUSxDQUFDO2dCQUM1QyxJQUFJLElBQUksS0FBSyxJQUFJO29CQUFFLE9BQU8sSUFBSSxHQUFHLElBQUksQ0FBQztnQkFFdEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRTtvQkFDN0MsS0FBSyxFQUFFLE1BQU07b0JBQ2IsV0FBVyxFQUFFLE1BQU07b0JBQ25CLE9BQU8sRUFBRSxJQUFJO2lCQUNiLENBQUMsQ0FBQztnQkFDSCxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUNsQyxNQUFBLENBQUMsQ0FBQyxPQUFPLG1DQUFJLEVBQUUsRUFDZixNQUFBLENBQUMsQ0FBQyxPQUFPLG1DQUFJLEVBQUUsQ0FDZixDQUFDO2dCQUNGLElBQUksVUFBVSxLQUFLLENBQUM7b0JBQUUsT0FBTyxVQUFVLENBQUM7Z0JBQ3hDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsSUFBSSxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFFBQVEsSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFDOUQsSUFBSSxFQUFFLEtBQUssQ0FBQztvQkFBRSxPQUFPLEVBQUUsQ0FBQztnQkFDeEIsT0FBTyxDQUFDLE1BQUEsQ0FBQyxDQUFDLElBQUksbUNBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFBLENBQUMsQ0FBQyxJQUFJLG1DQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3RDLENBQUMsQ0FBQyxDQUFDO1NBQ0g7UUFFRCxrQ0FBa0M7UUFDbEMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFO1lBQ25DLDZGQUE2RjtZQUM3RixNQUFNLGFBQWEsR0FBVyxFQUFFLENBQUM7WUFDakMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxFQUFFO2dCQUM1QyxJQUFJLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssU0FBUyxDQUFDLEVBQUUsRUFBRTtvQkFDekQsYUFBYSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO2lCQUN4QztZQUNGLENBQUMsQ0FBQyxDQUFDO1lBRUgsTUFBTSxjQUFjLEdBQUcsSUFBSSxxQkFBcUIsQ0FDL0MsU0FBUyxFQUNULElBQUksQ0FBQyxRQUFRLEVBQ2IsSUFBSSxDQUFDLEdBQUcsRUFDUixJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsRUFDcEIsYUFBYSxFQUFFLHlDQUF5QztZQUN4RCxJQUFJLENBQUMsT0FBTyxFQUFFLGdDQUFnQztZQUM5QyxJQUFJLENBQUMsTUFBTSxDQUFDLHVCQUF1QjthQUNuQyxDQUFDO1lBRUYsaUJBQWlCO1lBQ2pCLGNBQWMsQ0FBQyxjQUFjLEdBQUcsQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFDeEMsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFO29CQUN4QixJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUMxQjtZQUNGLENBQUMsQ0FBQztZQUVGLGNBQWMsQ0FBQyxlQUFlLEdBQUcsQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFDekMsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFO29CQUN6QixJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUMzQjtZQUNGLENBQUMsQ0FBQztZQUVGLGNBQWMsQ0FBQyxjQUFjLEdBQUcsQ0FBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLEVBQUU7Z0JBQ3RELElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRTtvQkFDeEIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7aUJBQ3hDO1lBQ0YsQ0FBQyxDQUFDO1lBRUYsY0FBYyxDQUFDLGlCQUFpQixHQUFHLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFO2dCQUNsRCxJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRTtvQkFDM0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztpQkFDcEM7WUFDRixDQUFDLENBQUM7WUFFRixpR0FBaUc7WUFDakcsY0FBYyxDQUFDLFlBQVksR0FBRyxDQUFPLFlBQVksRUFBRSxXQUFXLEVBQUUsRUFBRTtnQkFDakUsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFO29CQUN0QixNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFDO2lCQUNuRDtZQUNGLENBQUMsQ0FBQSxDQUFDO1lBRUYsaUJBQWlCO1lBQ2pCLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDOUIsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDO1lBRXRCLGFBQWE7WUFDYixJQUFJLENBQUMsaUJBQWlCLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUUzRCwwQkFBMEI7WUFDMUIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDM0MsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU0sZ0JBQWdCLENBQUMsVUFBa0I7UUFDekMsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFDN0IsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7SUFDekIsQ0FBQztJQUVPLFVBQVU7UUFDakIsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFO1lBQ3hCLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQy9CO0lBQ0YsQ0FBQztJQUVPLG9CQUFvQjtRQUMzQixpQkFBaUI7UUFDakIsTUFBTSxXQUFXLG1DQUNiLElBQUksQ0FBQyxJQUFJLEtBQ1osU0FBUyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQy9CLENBQUM7UUFFRixvQkFBb0I7UUFDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFO1lBQ3pCLFdBQVcsQ0FBQyxRQUFRLG1DQUNoQixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsS0FDckIsYUFBYSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FDekIsQ0FBQztTQUNGO2FBQU07WUFDTixxQkFBcUI7WUFDckIsV0FBVyxDQUFDLFFBQVEsbUNBQ2hCLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxLQUNyQixhQUFhLEVBQUUsU0FBUyxHQUN4QixDQUFDO1NBQ0Y7UUFFRCxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUU7WUFDekIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsQ0FBQztTQUNsQztJQUNGLENBQUM7SUFFTyxZQUFZO1FBQ25CLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBRW5DLElBQUksSUFBSSxDQUFDLFFBQVEsWUFBWSxXQUFXLEVBQUU7WUFDekMsT0FBTyxDQUNOLElBQUksQ0FBQyxRQUFRLEVBQ2IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQ2xELENBQUM7U0FDRjtRQUVELHFCQUFxQjtRQUNyQixJQUFJLENBQUMsVUFBVTtZQUNkLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFO1lBQy9CLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFakMsZ0JBQWdCO1FBQ2hCLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRTtZQUN4QixJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUNuRDtJQUNGLENBQUM7SUFFYSxjQUFjOztZQUMzQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUM5RCxJQUFJLElBQUksRUFBRTtnQkFDVCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQy9DLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUU7b0JBQ3pCLE1BQU0sRUFBRTt3QkFDUCxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJO3FCQUNwQjtpQkFDRCxDQUFDLENBQUM7YUFDSDtRQUNGLENBQUM7S0FBQTtJQUVNLFdBQVcsQ0FBQyxRQUFpQjtRQUNuQyxJQUFJLENBQUMsVUFBVSxHQUFHLFFBQVEsQ0FBQztRQUMzQixJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFFTSxVQUFVLENBQUMsSUFBVTtRQUMzQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQzFCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBRXpCLDJCQUEyQjtRQUMzQixJQUFJLE9BQU8sQ0FBQyxTQUFTLEtBQUssSUFBSSxDQUFDLFNBQVMsRUFBRTtZQUN6QyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUU7Z0JBQ25CLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2FBQzdDO2lCQUFNO2dCQUNOLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2FBQ2hEO1NBQ0Q7UUFFRCxzRUFBc0U7UUFDdEUsSUFDQyxPQUFPLENBQUMsZ0JBQWdCLEtBQUssSUFBSSxDQUFDLGdCQUFnQjtZQUNsRCxPQUFPLENBQUMsT0FBTyxLQUFLLElBQUksQ0FBQyxPQUFPLEVBQy9CO1lBQ0QsaUNBQWlDO1lBQ2pDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1NBQ3RCO1FBRUQsa0RBQWtEO1FBQ2xELElBQ0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQ2pFO1lBQ0QscUJBQXFCO1lBQ3JCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUNwRCxnQkFBZ0IsQ0FDRCxDQUFDO1lBQ2pCLElBQUksVUFBVSxFQUFFO2dCQUNmLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUM7YUFDaEM7U0FDRDtJQUNGLENBQUM7SUFFRDs7OztPQUlHO0lBQ0kscUJBQXFCLENBQUMsV0FBaUI7UUFDN0MsMkRBQTJEO1FBQzNELEtBQUssTUFBTSxTQUFTLElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRTtZQUM3QywwREFBMEQ7WUFDMUQsSUFBSSxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxLQUFLLFdBQVcsQ0FBQyxFQUFFLEVBQUU7Z0JBQzlDLFNBQVMsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyw0QkFBNEI7Z0JBQy9ELE9BQU8sSUFBSSxDQUFDLENBQUMseUJBQXlCO2FBQ3RDO2lCQUFNO2dCQUNOLDhFQUE4RTtnQkFDOUUsTUFBTSxlQUFlLEdBQ3BCLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDOUMsSUFBSSxlQUFlLEVBQUU7b0JBQ3BCLE9BQU8sSUFBSSxDQUFDLENBQUMsZ0RBQWdEO2lCQUM3RDthQUNEO1NBQ0Q7UUFDRCwyRUFBMkU7UUFDM0UsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQ7O09BRUc7SUFDSSxxQkFBcUIsQ0FBQyxNQUFjO1FBQzFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssTUFBTTtZQUFFLE9BQU8sSUFBSSxDQUFDO1FBQ3pDLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRTtZQUN6QyxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMscUJBQXFCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbEQsSUFBSSxLQUFLO2dCQUFFLE9BQU8sS0FBSyxDQUFDO1NBQ3hCO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQ7O09BRUc7SUFDSSxtQkFBbUIsQ0FBQyxNQUFjO1FBQ3hDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNyRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3RDLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsS0FBSyxNQUFNLEVBQUU7Z0JBQ2xDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDZixJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xDLE9BQU8sSUFBSSxDQUFDO2FBQ1o7WUFDRCxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDdEMsT0FBTyxJQUFJLENBQUM7YUFDWjtTQUNEO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRU0sT0FBTztRQUNiLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztJQUNsQixDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksc0JBQXNCLENBQUMsVUFBeUI7O1FBQ3RELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLFVBQVUsQ0FBQztRQUNsRCxJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssYUFBYSxFQUFFO1lBQ3RDLElBQUksQ0FBQyxVQUFVLEdBQUcsYUFBYSxDQUFDO1lBQ2hDLDJFQUEyRTtZQUMzRSxNQUFNLGVBQWUsR0FDcEIsSUFBSSxDQUFDLE9BQU87aUJBQ1osTUFBQSxJQUFJLENBQUMsZUFBZSwwQ0FBRSxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQSxDQUFDO1lBQ2xELElBQUksZUFBZSxFQUFFO2dCQUNwQixlQUFlLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FDL0IsYUFBYSxFQUNiLElBQUksQ0FBQyxVQUFVLENBQ2YsQ0FBQztnQkFDRiwwRUFBMEU7Z0JBQzFFLElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRTtvQkFDekIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUNwQyxVQUFVLEVBQ1YsSUFBSSxDQUFDLFVBQVUsQ0FDZixDQUFDO2lCQUNGO2FBQ0Q7aUJBQU07Z0JBQ04sT0FBTyxDQUFDLElBQUksQ0FDWCw0REFBNEQsRUFDNUQsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQ1osQ0FBQzthQUNGO1NBQ0Q7UUFFRCw4QkFBOEI7UUFDOUIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUN0QyxLQUFLLENBQUMsc0JBQXNCLENBQUMsVUFBVSxDQUFDLENBQ3hDLENBQUM7SUFDSCxDQUFDO0lBRU0sV0FBVyxDQUFDLFFBQWlCO1FBQ25DLElBQUksSUFBSSxDQUFDLFVBQVUsS0FBSyxRQUFRLEVBQUU7WUFDakMsSUFBSSxDQUFDLFVBQVUsR0FBRyxRQUFRLENBQUM7WUFFM0IsY0FBYztZQUNkLElBQUksSUFBSSxDQUFDLFFBQVEsWUFBWSxXQUFXLEVBQUU7Z0JBQ3pDLE9BQU8sQ0FDTixJQUFJLENBQUMsUUFBUSxFQUNiLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUNsRCxDQUFDO2FBQ0Y7WUFFRCxxQkFBcUI7WUFDckIsSUFBSSxDQUFDLFVBQVU7Z0JBQ2QsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUU7Z0JBQy9CLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUM7U0FDakM7SUFDRixDQUFDO0lBRUQsUUFBUTs7UUFDUCw0REFBNEQ7UUFDNUQsSUFDQyxNQUFBLHFCQUFxQixDQUFDLGFBQWEsMENBQUUsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQ2pFO1lBQ0QscUJBQXFCLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ2hFO1FBRUQsNEJBQTRCO1FBQzVCLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUU7WUFDMUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3BCLENBQUMsQ0FBQyxDQUFDO1FBRUgsdUNBQXVDO1FBQ3ZDLElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRTtZQUM1QyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1NBQ3RCO0lBQ0YsQ0FBQzs7QUF2dUNELDBEQUEwRDtBQUMzQyxtQ0FBYSxHQUErQixJQUFJLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHAsIENvbXBvbmVudCwgc2V0SWNvbiwgTWVudSwgS2V5bWFwIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiQC90eXBlcy90YXNrXCI7XHJcbmltcG9ydCBcIkAvc3R5bGVzL3RyZWUtdmlldy5jc3NcIjtcclxuaW1wb3J0IHsgTWFya2Rvd25SZW5kZXJlckNvbXBvbmVudCB9IGZyb20gXCJAL2NvbXBvbmVudHMvdWkvcmVuZGVyZXJzL01hcmtkb3duUmVuZGVyZXJcIjtcclxuaW1wb3J0IHsgY3JlYXRlVGFza0NoZWNrYm94IH0gZnJvbSBcIi4vZGV0YWlsc1wiO1xyXG5pbXBvcnQgeyBnZXRWaWV3U2V0dGluZ09yRGVmYXVsdCwgVmlld01vZGUgfSBmcm9tIFwiQC9jb21tb24vc2V0dGluZy1kZWZpbml0aW9uXCI7XHJcbmltcG9ydCB7IGdldFJlbGF0aXZlVGltZVN0cmluZyB9IGZyb20gXCJAL3V0aWxzL2RhdGUvZGF0ZS1mb3JtYXR0ZXJcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5pbXBvcnQgeyBJbmxpbmVFZGl0b3IsIElubGluZUVkaXRvck9wdGlvbnMgfSBmcm9tIFwiLi9JbmxpbmVFZGl0b3JcIjtcclxuaW1wb3J0IHsgSW5saW5lRWRpdG9yTWFuYWdlciB9IGZyb20gXCIuL0lubGluZUVkaXRvck1hbmFnZXJcIjtcclxuaW1wb3J0IHsgc2FuaXRpemVQcmlvcml0eUZvckNsYXNzIH0gZnJvbSBcIkAvdXRpbHMvdGFzay9wcmlvcml0eS11dGlsc1wiO1xyXG5pbXBvcnQgeyBzb3J0VGFza3MgfSBmcm9tIFwiQC9jb21tYW5kcy9zb3J0VGFza0NvbW1hbmRzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgVGFza1RyZWVJdGVtQ29tcG9uZW50IGV4dGVuZHMgQ29tcG9uZW50IHtcclxuXHRwdWJsaWMgZWxlbWVudDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSB0YXNrOiBUYXNrO1xyXG5cdHByaXZhdGUgaXNTZWxlY3RlZDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cdHByaXZhdGUgaXNFeHBhbmRlZDogYm9vbGVhbiA9IHRydWU7XHJcblx0cHJpdmF0ZSB2aWV3TW9kZTogc3RyaW5nO1xyXG5cdHByaXZhdGUgaW5kZW50TGV2ZWw6IG51bWJlciA9IDA7XHJcblx0cHJpdmF0ZSBwYXJlbnRDb250YWluZXI6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgY2hpbGRyZW5Db250YWluZXI6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgY2hpbGRDb21wb25lbnRzOiBUYXNrVHJlZUl0ZW1Db21wb25lbnRbXSA9IFtdO1xyXG5cclxuXHRwcml2YXRlIHRvZ2dsZUVsOiBIVE1MRWxlbWVudDtcclxuXHJcblx0Ly8gRXZlbnRzXHJcblx0cHVibGljIG9uVGFza1NlbGVjdGVkOiAodGFzazogVGFzaykgPT4gdm9pZDtcclxuXHRwdWJsaWMgb25UYXNrQ29tcGxldGVkOiAodGFzazogVGFzaykgPT4gdm9pZDtcclxuXHRwdWJsaWMgb25UYXNrVXBkYXRlOiAodGFzazogVGFzaywgdXBkYXRlZFRhc2s6IFRhc2spID0+IFByb21pc2U8dm9pZD47XHJcblx0cHVibGljIG9uVG9nZ2xlRXhwYW5kOiAodGFza0lkOiBzdHJpbmcsIGlzRXhwYW5kZWQ6IGJvb2xlYW4pID0+IHZvaWQ7XHJcblxyXG5cdHB1YmxpYyBvblRhc2tDb250ZXh0TWVudTogKGV2ZW50OiBNb3VzZUV2ZW50LCB0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cclxuXHRwcml2YXRlIG1hcmtkb3duUmVuZGVyZXI6IE1hcmtkb3duUmVuZGVyZXJDb21wb25lbnQ7XHJcblx0cHJpdmF0ZSBjb250ZW50RWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgY29udGVudE1ldGFkYXRhQ29udGFpbmVyOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIHRhc2tNYXA6IE1hcDxzdHJpbmcsIFRhc2s+O1xyXG5cclxuXHQvLyBVc2Ugc2hhcmVkIGVkaXRvciBtYW5hZ2VyIGluc3RlYWQgb2YgaW5kaXZpZHVhbCBlZGl0b3JzXHJcblx0cHJpdmF0ZSBzdGF0aWMgZWRpdG9yTWFuYWdlcjogSW5saW5lRWRpdG9yTWFuYWdlciB8IG51bGwgPSBudWxsO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHRhc2s6IFRhc2ssXHJcblx0XHR2aWV3TW9kZTogc3RyaW5nLFxyXG5cdFx0cHJpdmF0ZSBhcHA6IEFwcCxcclxuXHRcdGluZGVudExldmVsOiBudW1iZXIgPSAwLFxyXG5cdFx0cHJpdmF0ZSBjaGlsZFRhc2tzOiBUYXNrW10gPSBbXSxcclxuXHRcdHRhc2tNYXA6IE1hcDxzdHJpbmcsIFRhc2s+LFxyXG5cdFx0cHJpdmF0ZSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpblxyXG5cdCkge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMudGFzayA9IHRhc2s7XHJcblx0XHR0aGlzLnZpZXdNb2RlID0gdmlld01vZGU7XHJcblx0XHR0aGlzLmluZGVudExldmVsID0gaW5kZW50TGV2ZWw7XHJcblx0XHR0aGlzLnRhc2tNYXAgPSB0YXNrTWFwO1xyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgc2hhcmVkIGVkaXRvciBtYW5hZ2VyIGlmIG5vdCBleGlzdHNcclxuXHRcdGlmICghVGFza1RyZWVJdGVtQ29tcG9uZW50LmVkaXRvck1hbmFnZXIpIHtcclxuXHRcdFx0VGFza1RyZWVJdGVtQ29tcG9uZW50LmVkaXRvck1hbmFnZXIgPSBuZXcgSW5saW5lRWRpdG9yTWFuYWdlcihcclxuXHRcdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0XHR0aGlzLnBsdWdpblxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHRoZSBpbmxpbmUgZWRpdG9yIGZyb20gdGhlIHNoYXJlZCBtYW5hZ2VyIHdoZW4gbmVlZGVkXHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZXRJbmxpbmVFZGl0b3IoKTogSW5saW5lRWRpdG9yIHtcclxuXHRcdGNvbnN0IGVkaXRvck9wdGlvbnM6IElubGluZUVkaXRvck9wdGlvbnMgPSB7XHJcblx0XHRcdG9uVGFza1VwZGF0ZTogYXN5bmMgKG9yaWdpbmFsVGFzazogVGFzaywgdXBkYXRlZFRhc2s6IFRhc2spID0+IHtcclxuXHRcdFx0XHRpZiAodGhpcy5vblRhc2tVcGRhdGUpIHtcclxuXHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdGF3YWl0IHRoaXMub25UYXNrVXBkYXRlKG9yaWdpbmFsVGFzaywgdXBkYXRlZFRhc2spO1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdFx0XHRcInRyZWVJdGVtIG9uVGFza1VwZGF0ZSBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5XCJcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0Ly8gRG9uJ3QgdXBkYXRlIHRhc2sgcmVmZXJlbmNlIGhlcmUgLSBsZXQgb25Db250ZW50RWRpdEZpbmlzaGVkIGhhbmRsZSBpdFxyXG5cdFx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIGluIHRyZWVJdGVtIG9uVGFza1VwZGF0ZTpcIiwgZXJyb3IpO1xyXG5cdFx0XHRcdFx0XHR0aHJvdyBlcnJvcjsgLy8gUmUtdGhyb3cgdG8gbGV0IHRoZSBJbmxpbmVFZGl0b3IgaGFuZGxlIGl0XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUud2FybihcIk5vIG9uVGFza1VwZGF0ZSBjYWxsYmFjayBhdmFpbGFibGVcIik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRvbkNvbnRlbnRFZGl0RmluaXNoZWQ6IChcclxuXHRcdFx0XHR0YXJnZXRFbDogSFRNTEVsZW1lbnQsXHJcblx0XHRcdFx0dXBkYXRlZFRhc2s6IFRhc2tcclxuXHRcdFx0KSA9PiB7XHJcblx0XHRcdFx0Ly8gVXBkYXRlIHRoZSB0YXNrIHJlZmVyZW5jZSB3aXRoIHRoZSBzYXZlZCB0YXNrXHJcblx0XHRcdFx0dGhpcy50YXNrID0gdXBkYXRlZFRhc2s7XHJcblxyXG5cdFx0XHRcdC8vIFJlLXJlbmRlciB0aGUgbWFya2Rvd24gY29udGVudCBhZnRlciBlZGl0aW5nIGlzIGZpbmlzaGVkXHJcblx0XHRcdFx0dGhpcy5yZW5kZXJNYXJrZG93bigpO1xyXG5cclxuXHRcdFx0XHQvLyBOb3cgaXQncyBzYWZlIHRvIHVwZGF0ZSB0aGUgZnVsbCBkaXNwbGF5XHJcblx0XHRcdFx0dGhpcy51cGRhdGVUYXNrRGlzcGxheSgpO1xyXG5cclxuXHRcdFx0XHQvLyBSZWxlYXNlIHRoZSBlZGl0b3IgZnJvbSB0aGUgbWFuYWdlclxyXG5cdFx0XHRcdFRhc2tUcmVlSXRlbUNvbXBvbmVudC5lZGl0b3JNYW5hZ2VyPy5yZWxlYXNlRWRpdG9yKFxyXG5cdFx0XHRcdFx0dGhpcy50YXNrLmlkXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fSxcclxuXHRcdFx0b25NZXRhZGF0YUVkaXRGaW5pc2hlZDogKFxyXG5cdFx0XHRcdHRhcmdldEVsOiBIVE1MRWxlbWVudCxcclxuXHRcdFx0XHR1cGRhdGVkVGFzazogVGFzayxcclxuXHRcdFx0XHRmaWVsZFR5cGU6IHN0cmluZ1xyXG5cdFx0XHQpID0+IHtcclxuXHRcdFx0XHQvLyBVcGRhdGUgdGhlIHRhc2sgcmVmZXJlbmNlIHdpdGggdGhlIHNhdmVkIHRhc2tcclxuXHRcdFx0XHR0aGlzLnRhc2sgPSB1cGRhdGVkVGFzaztcclxuXHJcblx0XHRcdFx0Ly8gVXBkYXRlIHRoZSB0YXNrIGRpc3BsYXkgdG8gcmVmbGVjdCBtZXRhZGF0YSBjaGFuZ2VzXHJcblx0XHRcdFx0dGhpcy51cGRhdGVUYXNrRGlzcGxheSgpO1xyXG5cclxuXHRcdFx0XHQvLyBSZWxlYXNlIHRoZSBlZGl0b3IgZnJvbSB0aGUgbWFuYWdlclxyXG5cdFx0XHRcdFRhc2tUcmVlSXRlbUNvbXBvbmVudC5lZGl0b3JNYW5hZ2VyPy5yZWxlYXNlRWRpdG9yKFxyXG5cdFx0XHRcdFx0dGhpcy50YXNrLmlkXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fSxcclxuXHRcdFx0dXNlRW1iZWRkZWRFZGl0b3I6IHRydWUsIC8vIEVuYWJsZSBPYnNpZGlhbidzIGVtYmVkZGVkIGVkaXRvclxyXG5cdFx0fTtcclxuXHJcblx0XHRyZXR1cm4gVGFza1RyZWVJdGVtQ29tcG9uZW50LmVkaXRvck1hbmFnZXIhLmdldEVkaXRvcihcclxuXHRcdFx0dGhpcy50YXNrLFxyXG5cdFx0XHRlZGl0b3JPcHRpb25zXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgdGhpcyB0YXNrIGlzIGN1cnJlbnRseSBiZWluZyBlZGl0ZWRcclxuXHQgKi9cclxuXHRwcml2YXRlIGlzQ3VycmVudGx5RWRpdGluZygpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiAoXHJcblx0XHRcdFRhc2tUcmVlSXRlbUNvbXBvbmVudC5lZGl0b3JNYW5hZ2VyPy5oYXNBY3RpdmVFZGl0b3IoXHJcblx0XHRcdFx0dGhpcy50YXNrLmlkXHJcblx0XHRcdCkgfHwgZmFsc2VcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHRvbmxvYWQoKSB7XHJcblx0XHQvLyBDcmVhdGUgdGFzayBpdGVtIGNvbnRhaW5lclxyXG5cdFx0dGhpcy5lbGVtZW50ID0gY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBbXCJ0YXNrLWl0ZW1cIiwgXCJ0cmVlLXRhc2staXRlbVwiXSxcclxuXHRcdFx0YXR0cjoge1xyXG5cdFx0XHRcdFwiZGF0YS10YXNrLWlkXCI6IHRoaXMudGFzay5pZCxcclxuXHRcdFx0fSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudCh0aGlzLmVsZW1lbnQsIFwiY29udGV4dG1lbnVcIiwgKGUpID0+IHtcclxuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cdFx0XHRpZiAodGhpcy5vblRhc2tDb250ZXh0TWVudSkge1xyXG5cdFx0XHRcdHRoaXMub25UYXNrQ29udGV4dE1lbnUoZSwgdGhpcy50YXNrKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIHBhcmVudCBjb250YWluZXJcclxuXHRcdHRoaXMucGFyZW50Q29udGFpbmVyID0gdGhpcy5lbGVtZW50LmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ0YXNrLXBhcmVudC1jb250YWluZXJcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIENyZWF0ZSB0YXNrIGNvbnRlbnRcclxuXHRcdHRoaXMucmVuZGVyVGFza0NvbnRlbnQoKTtcclxuXHJcblx0XHQvLyBDcmVhdGUgY29udGFpbmVyIGZvciBjaGlsZCB0YXNrc1xyXG5cdFx0dGhpcy5jaGlsZHJlbkNvbnRhaW5lciA9IHRoaXMuZWxlbWVudC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwidGFzay1jaGlsZHJlbi1jb250YWluZXJcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFJlbmRlciBjaGlsZCB0YXNrc1xyXG5cdFx0dGhpcy5yZW5kZXJDaGlsZFRhc2tzKCk7XHJcblxyXG5cdFx0Ly8gUmVnaXN0ZXIgY2xpY2sgaGFuZGxlciBmb3Igc2VsZWN0aW9uXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQodGhpcy5wYXJlbnRDb250YWluZXIsIFwiY2xpY2tcIiwgKGUpID0+IHtcclxuXHRcdFx0Ly8gT25seSB0cmlnZ2VyIGlmIGNsaWNraW5nIG9uIHRoZSB0YXNrIGl0c2VsZiwgbm90IGNoaWxkcmVuXHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHRlLnRhcmdldCA9PT0gdGhpcy5wYXJlbnRDb250YWluZXIgfHxcclxuXHRcdFx0XHR0aGlzLnBhcmVudENvbnRhaW5lci5jb250YWlucyhlLnRhcmdldCBhcyBOb2RlKVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRjb25zdCBpc0NoZWNrYm94ID0gKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbGFzc0xpc3QuY29udGFpbnMoXHJcblx0XHRcdFx0XHRcInRhc2stY2hlY2tib3hcIlxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdGlmIChpc0NoZWNrYm94KSB7XHJcblx0XHRcdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cdFx0XHRcdFx0dGhpcy50b2dnbGVUYXNrQ29tcGxldGlvbigpO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAoXHJcblx0XHRcdFx0XHQoZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmNsYXNzTGlzdC5jb250YWlucyhcclxuXHRcdFx0XHRcdFx0XCJ0YXNrLWV4cGFuZC10b2dnbGVcIlxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0dGhpcy5zZWxlY3RUYXNrKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyVGFza0NvbnRlbnQoKSB7XHJcblx0XHQvLyBDbGVhciBleGlzdGluZyBjb250ZW50XHJcblx0XHR0aGlzLnBhcmVudENvbnRhaW5lci5lbXB0eSgpO1xyXG5cdFx0dGhpcy5wYXJlbnRDb250YWluZXIuY2xhc3NMaXN0LnRvZ2dsZShcImNvbXBsZXRlZFwiLCB0aGlzLnRhc2suY29tcGxldGVkKTtcclxuXHRcdHRoaXMucGFyZW50Q29udGFpbmVyLmNsYXNzTGlzdC50b2dnbGUoXCJzZWxlY3RlZFwiLCB0aGlzLmlzU2VsZWN0ZWQpO1xyXG5cclxuXHRcdC8vIEluZGVudGF0aW9uIGJhc2VkIG9uIGxldmVsXHJcblx0XHRpZiAodGhpcy5pbmRlbnRMZXZlbCA+IDApIHtcclxuXHRcdFx0Y29uc3QgaW5kZW50RWwgPSB0aGlzLnBhcmVudENvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJ0YXNrLWluZGVudFwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0aW5kZW50RWwuc3R5bGUud2lkdGggPSBgJHt0aGlzLmluZGVudExldmVsICogMzB9cHhgO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEV4cGFuZC9jb2xsYXBzZSB0b2dnbGUgZm9yIHRhc2tzIHdpdGggY2hpbGRyZW5cclxuXHRcdGlmIChcclxuXHRcdFx0dGhpcy50YXNrLm1ldGFkYXRhLmNoaWxkcmVuICYmXHJcblx0XHRcdHRoaXMudGFzay5tZXRhZGF0YS5jaGlsZHJlbi5sZW5ndGggPiAwXHJcblx0XHQpIHtcclxuXHRcdFx0dGhpcy50b2dnbGVFbCA9IHRoaXMucGFyZW50Q29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcInRhc2stZXhwYW5kLXRvZ2dsZVwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0c2V0SWNvbihcclxuXHRcdFx0XHR0aGlzLnRvZ2dsZUVsLFxyXG5cdFx0XHRcdHRoaXMuaXNFeHBhbmRlZCA/IFwiY2hldnJvbi1kb3duXCIgOiBcImNoZXZyb24tcmlnaHRcIlxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gUmVnaXN0ZXIgdG9nZ2xlIGV2ZW50XHJcblx0XHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudCh0aGlzLnRvZ2dsZUVsLCBcImNsaWNrXCIsIChlKSA9PiB7XHJcblx0XHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHRcdFx0XHR0aGlzLnRvZ2dsZUV4cGFuZCgpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDaGVja2JveFxyXG5cdFx0Y29uc3QgY2hlY2tib3hFbCA9IHRoaXMucGFyZW50Q29udGFpbmVyLmNyZWF0ZURpdihcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNsczogXCJ0YXNrLWNoZWNrYm94XCIsXHJcblx0XHRcdH0sXHJcblx0XHRcdChlbCkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IGNoZWNrYm94ID0gY3JlYXRlVGFza0NoZWNrYm94KFxyXG5cdFx0XHRcdFx0dGhpcy50YXNrLnN0YXR1cyxcclxuXHRcdFx0XHRcdHRoaXMudGFzayxcclxuXHRcdFx0XHRcdGVsXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGNoZWNrYm94LCBcImNsaWNrXCIsIChldmVudCkgPT4ge1xyXG5cdFx0XHRcdFx0ZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblxyXG5cdFx0XHRcdFx0aWYgKHRoaXMub25UYXNrQ29tcGxldGVkKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMub25UYXNrQ29tcGxldGVkKHRoaXMudGFzayk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0aWYgKHRoaXMudGFzay5zdGF0dXMgPT09IFwiIFwiKSB7XHJcblx0XHRcdFx0XHRcdGNoZWNrYm94LmNoZWNrZWQgPSB0cnVlO1xyXG5cdFx0XHRcdFx0XHRjaGVja2JveC5kYXRhc2V0LnRhc2sgPSBcInhcIjtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0KTtcclxuXHJcblx0XHRjb25zdCB0YXNrSXRlbUNvbnRhaW5lciA9IHRoaXMucGFyZW50Q29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ0YXNrLWl0ZW0tY29udGFpbmVyXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDcmVhdGUgY29udGVudC1tZXRhZGF0YSBjb250YWluZXIgZm9yIGR5bmFtaWMgbGF5b3V0XHJcblx0XHR0aGlzLmNvbnRlbnRNZXRhZGF0YUNvbnRhaW5lciA9IHRhc2tJdGVtQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ0YXNrLWNvbnRlbnQtbWV0YWRhdGEtY29udGFpbmVyXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBUYXNrIGNvbnRlbnQgd2l0aCBtYXJrZG93biByZW5kZXJpbmdcclxuXHRcdHRoaXMuY29udGVudEVsID0gdGhpcy5jb250ZW50TWV0YWRhdGFDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInRhc2staXRlbS1jb250ZW50XCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBNYWtlIGNvbnRlbnQgY2xpY2thYmxlIGZvciBlZGl0aW5nIC0gb25seSBjcmVhdGUgZWRpdG9yIHdoZW4gY2xpY2tlZFxyXG5cdFx0dGhpcy5yZWdpc3RlckNvbnRlbnRDbGlja0hhbmRsZXIoKTtcclxuXHJcblx0XHR0aGlzLnJlbmRlck1hcmtkb3duKCk7XHJcblxyXG5cdFx0Ly8gTWV0YWRhdGEgY29udGFpbmVyXHJcblx0XHRjb25zdCBtZXRhZGF0YUVsID0gdGhpcy5jb250ZW50TWV0YWRhdGFDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInRhc2stbWV0YWRhdGFcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMucmVuZGVyTWV0YWRhdGEobWV0YWRhdGFFbCk7XHJcblxyXG5cdFx0Ly8gUHJpb3JpdHkgaW5kaWNhdG9yIGlmIGF2YWlsYWJsZVxyXG5cdFx0aWYgKHRoaXMudGFzay5tZXRhZGF0YS5wcmlvcml0eSkge1xyXG5cdFx0XHRjb25zdCBzYW5pdGl6ZWRQcmlvcml0eSA9IHNhbml0aXplUHJpb3JpdHlGb3JDbGFzcyhcclxuXHRcdFx0XHR0aGlzLnRhc2subWV0YWRhdGEucHJpb3JpdHlcclxuXHRcdFx0KTtcclxuXHRcdFx0Y29uc3QgY2xhc3NlcyA9IFtcInRhc2stcHJpb3JpdHlcIl07XHJcblx0XHRcdGlmIChzYW5pdGl6ZWRQcmlvcml0eSkge1xyXG5cdFx0XHRcdGNsYXNzZXMucHVzaChgcHJpb3JpdHktJHtzYW5pdGl6ZWRQcmlvcml0eX1gKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRjb25zdCBwcmlvcml0eUVsID0gY3JlYXRlRGl2KHsgY2xzOiBjbGFzc2VzIH0pO1xyXG5cclxuXHRcdFx0Ly8gUHJpb3JpdHkgaWNvbiBiYXNlZCBvbiBsZXZlbFxyXG5cdFx0XHRsZXQgaWNvbiA9IFwi4oCiXCI7XHJcblx0XHRcdGljb24gPSBcIiFcIi5yZXBlYXQodGhpcy50YXNrLm1ldGFkYXRhLnByaW9yaXR5KTtcclxuXHJcblx0XHRcdHByaW9yaXR5RWwudGV4dENvbnRlbnQgPSBpY29uO1xyXG5cdFx0XHR0aGlzLnBhcmVudENvbnRhaW5lci5hcHBlbmRDaGlsZChwcmlvcml0eUVsKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyTWV0YWRhdGEobWV0YWRhdGFFbDogSFRNTEVsZW1lbnQpIHtcclxuXHRcdG1ldGFkYXRhRWwuZW1wdHkoKTtcclxuXHJcblx0XHQvLyBGb3IgY2FuY2VsbGVkIHRhc2tzLCBzaG93IGNhbmNlbGxlZCBkYXRlIChpbmRlcGVuZGVudCBvZiBjb21wbGV0aW9uIHN0YXR1cylcclxuXHRcdGlmICh0aGlzLnRhc2subWV0YWRhdGEuY2FuY2VsbGVkRGF0ZSkge1xyXG5cdFx0XHR0aGlzLnJlbmRlckRhdGVNZXRhZGF0YShcclxuXHRcdFx0XHRtZXRhZGF0YUVsLFxyXG5cdFx0XHRcdFwiY2FuY2VsbGVkXCIsXHJcblx0XHRcdFx0dGhpcy50YXNrLm1ldGFkYXRhLmNhbmNlbGxlZERhdGVcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBEaXNwbGF5IGRhdGVzIGJhc2VkIG9uIHRhc2sgY29tcGxldGlvbiBzdGF0dXNcclxuXHRcdGlmICghdGhpcy50YXNrLmNvbXBsZXRlZCkge1xyXG5cdFx0XHQvLyBEdWUgZGF0ZSBpZiBhdmFpbGFibGVcclxuXHRcdFx0aWYgKHRoaXMudGFzay5tZXRhZGF0YS5kdWVEYXRlKSB7XHJcblx0XHRcdFx0dGhpcy5yZW5kZXJEYXRlTWV0YWRhdGEoXHJcblx0XHRcdFx0XHRtZXRhZGF0YUVsLFxyXG5cdFx0XHRcdFx0XCJkdWVcIixcclxuXHRcdFx0XHRcdHRoaXMudGFzay5tZXRhZGF0YS5kdWVEYXRlXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gU2NoZWR1bGVkIGRhdGUgaWYgYXZhaWxhYmxlXHJcblx0XHRcdGlmICh0aGlzLnRhc2subWV0YWRhdGEuc2NoZWR1bGVkRGF0ZSkge1xyXG5cdFx0XHRcdHRoaXMucmVuZGVyRGF0ZU1ldGFkYXRhKFxyXG5cdFx0XHRcdFx0bWV0YWRhdGFFbCxcclxuXHRcdFx0XHRcdFwic2NoZWR1bGVkXCIsXHJcblx0XHRcdFx0XHR0aGlzLnRhc2subWV0YWRhdGEuc2NoZWR1bGVkRGF0ZVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFN0YXJ0IGRhdGUgaWYgYXZhaWxhYmxlXHJcblx0XHRcdGlmICh0aGlzLnRhc2subWV0YWRhdGEuc3RhcnREYXRlKSB7XHJcblx0XHRcdFx0dGhpcy5yZW5kZXJEYXRlTWV0YWRhdGEoXHJcblx0XHRcdFx0XHRtZXRhZGF0YUVsLFxyXG5cdFx0XHRcdFx0XCJzdGFydFwiLFxyXG5cdFx0XHRcdFx0dGhpcy50YXNrLm1ldGFkYXRhLnN0YXJ0RGF0ZVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFJlY3VycmVuY2UgaWYgYXZhaWxhYmxlXHJcblx0XHRcdGlmICh0aGlzLnRhc2subWV0YWRhdGEucmVjdXJyZW5jZSkge1xyXG5cdFx0XHRcdHRoaXMucmVuZGVyUmVjdXJyZW5jZU1ldGFkYXRhKG1ldGFkYXRhRWwpO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBGb3IgY29tcGxldGVkIHRhc2tzLCBzaG93IGNvbXBsZXRpb24gZGF0ZVxyXG5cdFx0XHRpZiAodGhpcy50YXNrLm1ldGFkYXRhLmNvbXBsZXRlZERhdGUpIHtcclxuXHRcdFx0XHR0aGlzLnJlbmRlckRhdGVNZXRhZGF0YShcclxuXHRcdFx0XHRcdG1ldGFkYXRhRWwsXHJcblx0XHRcdFx0XHRcImNvbXBsZXRlZFwiLFxyXG5cdFx0XHRcdFx0dGhpcy50YXNrLm1ldGFkYXRhLmNvbXBsZXRlZERhdGVcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBDcmVhdGVkIGRhdGUgaWYgYXZhaWxhYmxlXHJcblx0XHRcdGlmICh0aGlzLnRhc2subWV0YWRhdGEuY3JlYXRlZERhdGUpIHtcclxuXHRcdFx0XHR0aGlzLnJlbmRlckRhdGVNZXRhZGF0YShcclxuXHRcdFx0XHRcdG1ldGFkYXRhRWwsXHJcblx0XHRcdFx0XHRcImNyZWF0ZWRcIixcclxuXHRcdFx0XHRcdHRoaXMudGFzay5tZXRhZGF0YS5jcmVhdGVkRGF0ZVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBQcm9qZWN0IGJhZGdlIGlmIGF2YWlsYWJsZSBhbmQgbm90IGluIHByb2plY3Qgdmlld1xyXG5cdFx0aWYgKFxyXG5cdFx0XHQodGhpcy50YXNrLm1ldGFkYXRhLnByb2plY3QgfHwgdGhpcy50YXNrLm1ldGFkYXRhLnRnUHJvamVjdCkgJiZcclxuXHRcdFx0dGhpcy52aWV3TW9kZSAhPT0gXCJwcm9qZWN0c1wiXHJcblx0XHQpIHtcclxuXHRcdFx0dGhpcy5yZW5kZXJQcm9qZWN0TWV0YWRhdGEobWV0YWRhdGFFbCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVGFncyBpZiBhdmFpbGFibGVcclxuXHRcdGlmICh0aGlzLnRhc2subWV0YWRhdGEudGFncyAmJiB0aGlzLnRhc2subWV0YWRhdGEudGFncy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdHRoaXMucmVuZGVyVGFnc01ldGFkYXRhKG1ldGFkYXRhRWwpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIE9uQ29tcGxldGlvbiBpZiBhdmFpbGFibGVcclxuXHRcdGlmICh0aGlzLnRhc2subWV0YWRhdGEub25Db21wbGV0aW9uKSB7XHJcblx0XHRcdHRoaXMucmVuZGVyT25Db21wbGV0aW9uTWV0YWRhdGEobWV0YWRhdGFFbCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRGVwZW5kc09uIGlmIGF2YWlsYWJsZVxyXG5cdFx0aWYgKFxyXG5cdFx0XHR0aGlzLnRhc2subWV0YWRhdGEuZGVwZW5kc09uICYmXHJcblx0XHRcdHRoaXMudGFzay5tZXRhZGF0YS5kZXBlbmRzT24ubGVuZ3RoID4gMFxyXG5cdFx0KSB7XHJcblx0XHRcdHRoaXMucmVuZGVyRGVwZW5kc09uTWV0YWRhdGEobWV0YWRhdGFFbCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSUQgaWYgYXZhaWxhYmxlXHJcblx0XHRpZiAodGhpcy50YXNrLm1ldGFkYXRhLmlkKSB7XHJcblx0XHRcdHRoaXMucmVuZGVySWRNZXRhZGF0YShtZXRhZGF0YUVsKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGQgbWV0YWRhdGEgYnV0dG9uIGZvciBhZGRpbmcgbmV3IG1ldGFkYXRhXHJcblx0XHR0aGlzLnJlbmRlckFkZE1ldGFkYXRhQnV0dG9uKG1ldGFkYXRhRWwpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSByZW5kZXJEYXRlTWV0YWRhdGEoXHJcblx0XHRtZXRhZGF0YUVsOiBIVE1MRWxlbWVudCxcclxuXHRcdHR5cGU6XHJcblx0XHRcdHwgXCJkdWVcIlxyXG5cdFx0XHR8IFwic2NoZWR1bGVkXCJcclxuXHRcdFx0fCBcInN0YXJ0XCJcclxuXHRcdFx0fCBcImNvbXBsZXRlZFwiXHJcblx0XHRcdHwgXCJjYW5jZWxsZWRcIlxyXG5cdFx0XHR8IFwiY3JlYXRlZFwiLFxyXG5cdFx0ZGF0ZVZhbHVlOiBudW1iZXJcclxuXHQpIHtcclxuXHRcdGNvbnN0IGRhdGVFbCA9IG1ldGFkYXRhRWwuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHRjbHM6IFtcInRhc2stZGF0ZVwiLCBgdGFzay0ke3R5cGV9LWRhdGVgXSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShkYXRlVmFsdWUpO1xyXG5cdFx0bGV0IGRhdGVUZXh0ID0gXCJcIjtcclxuXHRcdGxldCBjc3NDbGFzcyA9IFwiXCI7XHJcblxyXG5cdFx0aWYgKHR5cGUgPT09IFwiZHVlXCIpIHtcclxuXHRcdFx0Y29uc3QgdG9kYXkgPSBuZXcgRGF0ZSgpO1xyXG5cdFx0XHR0b2RheS5zZXRIb3VycygwLCAwLCAwLCAwKTtcclxuXHJcblx0XHRcdGNvbnN0IHRvbW9ycm93ID0gbmV3IERhdGUodG9kYXkpO1xyXG5cdFx0XHR0b21vcnJvdy5zZXREYXRlKHRvbW9ycm93LmdldERhdGUoKSArIDEpO1xyXG5cclxuXHRcdFx0Ly8gRm9ybWF0IGRhdGVcclxuXHRcdFx0aWYgKGRhdGUuZ2V0VGltZSgpIDwgdG9kYXkuZ2V0VGltZSgpKSB7XHJcblx0XHRcdFx0ZGF0ZVRleHQgPVxyXG5cdFx0XHRcdFx0dChcIk92ZXJkdWVcIikgK1xyXG5cdFx0XHRcdFx0KHRoaXMucGx1Z2luLnNldHRpbmdzPy51c2VSZWxhdGl2ZVRpbWVGb3JEYXRlXHJcblx0XHRcdFx0XHRcdD8gXCIgfCBcIiArIGdldFJlbGF0aXZlVGltZVN0cmluZyhkYXRlKVxyXG5cdFx0XHRcdFx0XHQ6IFwiXCIpO1xyXG5cdFx0XHRcdGNzc0NsYXNzID0gXCJ0YXNrLW92ZXJkdWVcIjtcclxuXHRcdFx0fSBlbHNlIGlmIChkYXRlLmdldFRpbWUoKSA9PT0gdG9kYXkuZ2V0VGltZSgpKSB7XHJcblx0XHRcdFx0ZGF0ZVRleHQgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncz8udXNlUmVsYXRpdmVUaW1lRm9yRGF0ZVxyXG5cdFx0XHRcdFx0PyBnZXRSZWxhdGl2ZVRpbWVTdHJpbmcoZGF0ZSkgfHwgXCJUb2RheVwiXHJcblx0XHRcdFx0XHQ6IFwiVG9kYXlcIjtcclxuXHRcdFx0XHRjc3NDbGFzcyA9IFwidGFzay1kdWUtdG9kYXlcIjtcclxuXHRcdFx0fSBlbHNlIGlmIChkYXRlLmdldFRpbWUoKSA9PT0gdG9tb3Jyb3cuZ2V0VGltZSgpKSB7XHJcblx0XHRcdFx0ZGF0ZVRleHQgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncz8udXNlUmVsYXRpdmVUaW1lRm9yRGF0ZVxyXG5cdFx0XHRcdFx0PyBnZXRSZWxhdGl2ZVRpbWVTdHJpbmcoZGF0ZSkgfHwgXCJUb21vcnJvd1wiXHJcblx0XHRcdFx0XHQ6IFwiVG9tb3Jyb3dcIjtcclxuXHRcdFx0XHRjc3NDbGFzcyA9IFwidGFzay1kdWUtdG9tb3Jyb3dcIjtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRkYXRlVGV4dCA9IGRhdGUudG9Mb2NhbGVEYXRlU3RyaW5nKFwiZW4tVVNcIiwge1xyXG5cdFx0XHRcdFx0eWVhcjogXCJudW1lcmljXCIsXHJcblx0XHRcdFx0XHRtb250aDogXCJsb25nXCIsXHJcblx0XHRcdFx0XHRkYXk6IFwibnVtZXJpY1wiLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRkYXRlVGV4dCA9IHRoaXMucGx1Z2luLnNldHRpbmdzPy51c2VSZWxhdGl2ZVRpbWVGb3JEYXRlXHJcblx0XHRcdFx0PyBnZXRSZWxhdGl2ZVRpbWVTdHJpbmcoZGF0ZSlcclxuXHRcdFx0XHQ6IGRhdGUudG9Mb2NhbGVEYXRlU3RyaW5nKFwiZW4tVVNcIiwge1xyXG5cdFx0XHRcdFx0XHR5ZWFyOiBcIm51bWVyaWNcIixcclxuXHRcdFx0XHRcdFx0bW9udGg6IFwibG9uZ1wiLFxyXG5cdFx0XHRcdFx0XHRkYXk6IFwibnVtZXJpY1wiLFxyXG5cdFx0XHRcdCAgfSk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKGNzc0NsYXNzKSB7XHJcblx0XHRcdGRhdGVFbC5jbGFzc0xpc3QuYWRkKGNzc0NsYXNzKTtcclxuXHRcdH1cclxuXHJcblx0XHRkYXRlRWwudGV4dENvbnRlbnQgPSBkYXRlVGV4dDtcclxuXHRcdGRhdGVFbC5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIGRhdGUudG9Mb2NhbGVEYXRlU3RyaW5nKCkpO1xyXG5cclxuXHRcdC8vIE1ha2UgZGF0ZSBjbGlja2FibGUgZm9yIGVkaXRpbmcgb25seSBpZiBpbmxpbmUgZWRpdG9yIGlzIGVuYWJsZWRcclxuXHRcdGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbmFibGVJbmxpbmVFZGl0b3IpIHtcclxuXHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGRhdGVFbCwgXCJjbGlja1wiLCAoZSkgPT4ge1xyXG5cdFx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblx0XHRcdFx0aWYgKCF0aGlzLmlzQ3VycmVudGx5RWRpdGluZygpKSB7XHJcblx0XHRcdFx0XHRjb25zdCBlZGl0b3IgPSB0aGlzLmdldElubGluZUVkaXRvcigpO1xyXG5cdFx0XHRcdFx0Y29uc3QgZGF0ZVN0cmluZyA9IHRoaXMuZm9ybWF0RGF0ZUZvcklucHV0KGRhdGUpO1xyXG5cdFx0XHRcdFx0Y29uc3QgZmllbGRUeXBlID1cclxuXHRcdFx0XHRcdFx0dHlwZSA9PT0gXCJkdWVcIlxyXG5cdFx0XHRcdFx0XHRcdD8gXCJkdWVEYXRlXCJcclxuXHRcdFx0XHRcdFx0XHQ6IHR5cGUgPT09IFwic2NoZWR1bGVkXCJcclxuXHRcdFx0XHRcdFx0XHQ/IFwic2NoZWR1bGVkRGF0ZVwiXHJcblx0XHRcdFx0XHRcdFx0OiB0eXBlID09PSBcInN0YXJ0XCJcclxuXHRcdFx0XHRcdFx0XHQ/IFwic3RhcnREYXRlXCJcclxuXHRcdFx0XHRcdFx0XHQ6IHR5cGUgPT09IFwiY2FuY2VsbGVkXCJcclxuXHRcdFx0XHRcdFx0XHQ/IFwiY2FuY2VsbGVkRGF0ZVwiXHJcblx0XHRcdFx0XHRcdFx0OiB0eXBlID09PSBcImNvbXBsZXRlZFwiXHJcblx0XHRcdFx0XHRcdFx0PyBcImNvbXBsZXRlZERhdGVcIlxyXG5cdFx0XHRcdFx0XHRcdDogbnVsbDtcclxuXHJcblx0XHRcdFx0XHRpZiAoZmllbGRUeXBlKSB7XHJcblx0XHRcdFx0XHRcdGVkaXRvci5zaG93TWV0YWRhdGFFZGl0b3IoXHJcblx0XHRcdFx0XHRcdFx0ZGF0ZUVsLFxyXG5cdFx0XHRcdFx0XHRcdGZpZWxkVHlwZSxcclxuXHRcdFx0XHRcdFx0XHRkYXRlU3RyaW5nXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyUHJvamVjdE1ldGFkYXRhKG1ldGFkYXRhRWw6IEhUTUxFbGVtZW50KSB7XHJcblx0XHQvLyBEZXRlcm1pbmUgd2hpY2ggcHJvamVjdCB0byBkaXNwbGF5OiBvcmlnaW5hbCBwcm9qZWN0IG9yIHRnUHJvamVjdFxyXG5cdFx0bGV0IHByb2plY3ROYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcblx0XHRsZXQgaXNSZWFkb25seSA9IGZhbHNlO1xyXG5cclxuXHRcdGlmICh0aGlzLnRhc2subWV0YWRhdGEucHJvamVjdCkge1xyXG5cdFx0XHQvLyBVc2Ugb3JpZ2luYWwgcHJvamVjdCBpZiBhdmFpbGFibGVcclxuXHRcdFx0cHJvamVjdE5hbWUgPSB0aGlzLnRhc2subWV0YWRhdGEucHJvamVjdDtcclxuXHRcdH0gZWxzZSBpZiAodGhpcy50YXNrLm1ldGFkYXRhLnRnUHJvamVjdCkge1xyXG5cdFx0XHQvLyBVc2UgdGdQcm9qZWN0IGFzIGZhbGxiYWNrXHJcblx0XHRcdHByb2plY3ROYW1lID0gdGhpcy50YXNrLm1ldGFkYXRhLnRnUHJvamVjdC5uYW1lO1xyXG5cdFx0XHRpc1JlYWRvbmx5ID0gdGhpcy50YXNrLm1ldGFkYXRhLnRnUHJvamVjdC5yZWFkb25seSB8fCBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoIXByb2plY3ROYW1lKSByZXR1cm47XHJcblxyXG5cdFx0Y29uc3QgcHJvamVjdEVsID0gbWV0YWRhdGFFbC5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdGNsczogXCJ0YXNrLXByb2plY3RcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEFkZCBhIHZpc3VhbCBpbmRpY2F0b3IgZm9yIHRnUHJvamVjdFxyXG5cdFx0aWYgKCF0aGlzLnRhc2subWV0YWRhdGEucHJvamVjdCAmJiB0aGlzLnRhc2subWV0YWRhdGEudGdQcm9qZWN0KSB7XHJcblx0XHRcdHByb2plY3RFbC5hZGRDbGFzcyhcInRhc2stcHJvamVjdC10Z1wiKTtcclxuXHRcdFx0cHJvamVjdEVsLnRpdGxlID0gYFByb2plY3QgZnJvbSAke1xyXG5cdFx0XHRcdHRoaXMudGFzay5tZXRhZGF0YS50Z1Byb2plY3QudHlwZVxyXG5cdFx0XHR9OiAke3RoaXMudGFzay5tZXRhZGF0YS50Z1Byb2plY3Quc291cmNlIHx8IFwiXCJ9YDtcclxuXHRcdH1cclxuXHJcblx0XHRwcm9qZWN0RWwudGV4dENvbnRlbnQgPSBwcm9qZWN0TmFtZS5zcGxpdChcIi9cIikucG9wKCkgfHwgcHJvamVjdE5hbWU7XHJcblxyXG5cdFx0Ly8gTWFrZSBwcm9qZWN0IGNsaWNrYWJsZSBmb3IgZWRpdGluZyBvbmx5IGlmIGlubGluZSBlZGl0b3IgaXMgZW5hYmxlZCBhbmQgbm90IHJlYWRvbmx5XHJcblx0XHRpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuZW5hYmxlSW5saW5lRWRpdG9yICYmICFpc1JlYWRvbmx5KSB7XHJcblx0XHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChwcm9qZWN0RWwsIFwiY2xpY2tcIiwgKGUpID0+IHtcclxuXHRcdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cdFx0XHRcdGlmICghdGhpcy5pc0N1cnJlbnRseUVkaXRpbmcoKSkge1xyXG5cdFx0XHRcdFx0Y29uc3QgZWRpdG9yID0gdGhpcy5nZXRJbmxpbmVFZGl0b3IoKTtcclxuXHRcdFx0XHRcdGVkaXRvci5zaG93TWV0YWRhdGFFZGl0b3IoXHJcblx0XHRcdFx0XHRcdHByb2plY3RFbCxcclxuXHRcdFx0XHRcdFx0XCJwcm9qZWN0XCIsXHJcblx0XHRcdFx0XHRcdHRoaXMudGFzay5tZXRhZGF0YS5wcm9qZWN0IHx8IFwiXCJcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyVGFnc01ldGFkYXRhKG1ldGFkYXRhRWw6IEhUTUxFbGVtZW50KSB7XHJcblx0XHRjb25zdCB0YWdzQ29udGFpbmVyID0gbWV0YWRhdGFFbC5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdGNsczogXCJ0YXNrLXRhZ3MtY29udGFpbmVyXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCBwcm9qZWN0UHJlZml4ID1cclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvamVjdFRhZ1ByZWZpeFtcclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcmVmZXJNZXRhZGF0YUZvcm1hdFxyXG5cdFx0XHRdIHx8IFwicHJvamVjdFwiO1xyXG5cdFx0dGhpcy50YXNrLm1ldGFkYXRhLnRhZ3NcclxuXHRcdFx0LmZpbHRlcigodGFnKSA9PiAhdGFnLnN0YXJ0c1dpdGgoYCMke3Byb2plY3RQcmVmaXh9YCkpXHJcblx0XHRcdC5mb3JFYWNoKCh0YWcpID0+IHtcclxuXHRcdFx0XHRjb25zdCB0YWdFbCA9IHRhZ3NDb250YWluZXIuY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdFx0XHRcdGNsczogXCJ0YXNrLXRhZ1wiLFxyXG5cdFx0XHRcdFx0dGV4dDogdGFnLnN0YXJ0c1dpdGgoXCIjXCIpID8gdGFnIDogYCMke3RhZ31gLFxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyBNYWtlIHRhZyBjbGlja2FibGUgZm9yIGVkaXRpbmcgb25seSBpZiBpbmxpbmUgZWRpdG9yIGlzIGVuYWJsZWRcclxuXHRcdFx0XHRpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuZW5hYmxlSW5saW5lRWRpdG9yKSB7XHJcblx0XHRcdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQodGFnRWwsIFwiY2xpY2tcIiwgKGUpID0+IHtcclxuXHRcdFx0XHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHRcdFx0XHRcdFx0aWYgKCF0aGlzLmlzQ3VycmVudGx5RWRpdGluZygpKSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgZWRpdG9yID0gdGhpcy5nZXRJbmxpbmVFZGl0b3IoKTtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCB0YWdzU3RyaW5nID1cclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMudGFzay5tZXRhZGF0YS50YWdzPy5qb2luKFwiLCBcIikgfHwgXCJcIjtcclxuXHRcdFx0XHRcdFx0XHRlZGl0b3Iuc2hvd01ldGFkYXRhRWRpdG9yKFxyXG5cdFx0XHRcdFx0XHRcdFx0dGFnc0NvbnRhaW5lcixcclxuXHRcdFx0XHRcdFx0XHRcdFwidGFnc1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dGFnc1N0cmluZ1xyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbmRlclJlY3VycmVuY2VNZXRhZGF0YShtZXRhZGF0YUVsOiBIVE1MRWxlbWVudCkge1xyXG5cdFx0Y29uc3QgcmVjdXJyZW5jZUVsID0gbWV0YWRhdGFFbC5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdGNsczogXCJ0YXNrLWRhdGUgdGFzay1yZWN1cnJlbmNlXCIsXHJcblx0XHR9KTtcclxuXHRcdHJlY3VycmVuY2VFbC50ZXh0Q29udGVudCA9IHRoaXMudGFzay5tZXRhZGF0YS5yZWN1cnJlbmNlIHx8IFwiXCI7XHJcblxyXG5cdFx0Ly8gTWFrZSByZWN1cnJlbmNlIGNsaWNrYWJsZSBmb3IgZWRpdGluZyBvbmx5IGlmIGlubGluZSBlZGl0b3IgaXMgZW5hYmxlZFxyXG5cdFx0aWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmVuYWJsZUlubGluZUVkaXRvcikge1xyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQocmVjdXJyZW5jZUVsLCBcImNsaWNrXCIsIChlKSA9PiB7XHJcblx0XHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHRcdFx0XHRpZiAoIXRoaXMuaXNDdXJyZW50bHlFZGl0aW5nKCkpIHtcclxuXHRcdFx0XHRcdGNvbnN0IGVkaXRvciA9IHRoaXMuZ2V0SW5saW5lRWRpdG9yKCk7XHJcblx0XHRcdFx0XHRlZGl0b3Iuc2hvd01ldGFkYXRhRWRpdG9yKFxyXG5cdFx0XHRcdFx0XHRyZWN1cnJlbmNlRWwsXHJcblx0XHRcdFx0XHRcdFwicmVjdXJyZW5jZVwiLFxyXG5cdFx0XHRcdFx0XHR0aGlzLnRhc2subWV0YWRhdGEucmVjdXJyZW5jZSB8fCBcIlwiXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbmRlck9uQ29tcGxldGlvbk1ldGFkYXRhKG1ldGFkYXRhRWw6IEhUTUxFbGVtZW50KSB7XHJcblx0XHRjb25zdCBvbkNvbXBsZXRpb25FbCA9IG1ldGFkYXRhRWwuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHRjbHM6IFwidGFzay1vbmNvbXBsZXRpb25cIixcclxuXHRcdH0pO1xyXG5cdFx0b25Db21wbGV0aW9uRWwudGV4dENvbnRlbnQgPSBg8J+PgSAke3RoaXMudGFzay5tZXRhZGF0YS5vbkNvbXBsZXRpb259YDtcclxuXHJcblx0XHQvLyBNYWtlIG9uQ29tcGxldGlvbiBjbGlja2FibGUgZm9yIGVkaXRpbmcgb25seSBpZiBpbmxpbmUgZWRpdG9yIGlzIGVuYWJsZWRcclxuXHRcdGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbmFibGVJbmxpbmVFZGl0b3IpIHtcclxuXHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KG9uQ29tcGxldGlvbkVsLCBcImNsaWNrXCIsIChlKSA9PiB7XHJcblx0XHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHRcdFx0XHRpZiAoIXRoaXMuaXNDdXJyZW50bHlFZGl0aW5nKCkpIHtcclxuXHRcdFx0XHRcdGNvbnN0IGVkaXRvciA9IHRoaXMuZ2V0SW5saW5lRWRpdG9yKCk7XHJcblx0XHRcdFx0XHRlZGl0b3Iuc2hvd01ldGFkYXRhRWRpdG9yKFxyXG5cdFx0XHRcdFx0XHRvbkNvbXBsZXRpb25FbCxcclxuXHRcdFx0XHRcdFx0XCJvbkNvbXBsZXRpb25cIixcclxuXHRcdFx0XHRcdFx0dGhpcy50YXNrLm1ldGFkYXRhLm9uQ29tcGxldGlvbiB8fCBcIlwiXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbmRlckRlcGVuZHNPbk1ldGFkYXRhKG1ldGFkYXRhRWw6IEhUTUxFbGVtZW50KSB7XHJcblx0XHRjb25zdCBkZXBlbmRzT25FbCA9IG1ldGFkYXRhRWwuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHRjbHM6IFwidGFzay1kZXBlbmRzb25cIixcclxuXHRcdH0pO1xyXG5cdFx0ZGVwZW5kc09uRWwudGV4dENvbnRlbnQgPSBg4puUICR7dGhpcy50YXNrLm1ldGFkYXRhLmRlcGVuZHNPbj8uam9pbihcclxuXHRcdFx0XCIsIFwiXHJcblx0XHQpfWA7XHJcblxyXG5cdFx0Ly8gTWFrZSBkZXBlbmRzT24gY2xpY2thYmxlIGZvciBlZGl0aW5nIG9ubHkgaWYgaW5saW5lIGVkaXRvciBpcyBlbmFibGVkXHJcblx0XHRpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuZW5hYmxlSW5saW5lRWRpdG9yKSB7XHJcblx0XHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChkZXBlbmRzT25FbCwgXCJjbGlja1wiLCAoZSkgPT4ge1xyXG5cdFx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblx0XHRcdFx0aWYgKCF0aGlzLmlzQ3VycmVudGx5RWRpdGluZygpKSB7XHJcblx0XHRcdFx0XHRjb25zdCBlZGl0b3IgPSB0aGlzLmdldElubGluZUVkaXRvcigpO1xyXG5cdFx0XHRcdFx0ZWRpdG9yLnNob3dNZXRhZGF0YUVkaXRvcihcclxuXHRcdFx0XHRcdFx0ZGVwZW5kc09uRWwsXHJcblx0XHRcdFx0XHRcdFwiZGVwZW5kc09uXCIsXHJcblx0XHRcdFx0XHRcdHRoaXMudGFzay5tZXRhZGF0YS5kZXBlbmRzT24/LmpvaW4oXCIsIFwiKSB8fCBcIlwiXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbmRlcklkTWV0YWRhdGEobWV0YWRhdGFFbDogSFRNTEVsZW1lbnQpIHtcclxuXHRcdGNvbnN0IGlkRWwgPSBtZXRhZGF0YUVsLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0Y2xzOiBcInRhc2staWRcIixcclxuXHRcdH0pO1xyXG5cdFx0aWRFbC50ZXh0Q29udGVudCA9IGDwn4aUICR7dGhpcy50YXNrLm1ldGFkYXRhLmlkfWA7XHJcblxyXG5cdFx0Ly8gTWFrZSBpZCBjbGlja2FibGUgZm9yIGVkaXRpbmcgb25seSBpZiBpbmxpbmUgZWRpdG9yIGlzIGVuYWJsZWRcclxuXHRcdGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbmFibGVJbmxpbmVFZGl0b3IpIHtcclxuXHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGlkRWwsIFwiY2xpY2tcIiwgKGUpID0+IHtcclxuXHRcdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cdFx0XHRcdGlmICghdGhpcy5pc0N1cnJlbnRseUVkaXRpbmcoKSkge1xyXG5cdFx0XHRcdFx0Y29uc3QgZWRpdG9yID0gdGhpcy5nZXRJbmxpbmVFZGl0b3IoKTtcclxuXHRcdFx0XHRcdGVkaXRvci5zaG93TWV0YWRhdGFFZGl0b3IoXHJcblx0XHRcdFx0XHRcdGlkRWwsXHJcblx0XHRcdFx0XHRcdFwiaWRcIixcclxuXHRcdFx0XHRcdFx0dGhpcy50YXNrLm1ldGFkYXRhLmlkIHx8IFwiXCJcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyQWRkTWV0YWRhdGFCdXR0b24obWV0YWRhdGFFbDogSFRNTEVsZW1lbnQpIHtcclxuXHRcdC8vIE9ubHkgc2hvdyBhZGQgbWV0YWRhdGEgYnV0dG9uIGlmIGlubGluZSBlZGl0b3IgaXMgZW5hYmxlZFxyXG5cdFx0aWYgKCF0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbmFibGVJbmxpbmVFZGl0b3IpIHtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IGFkZEJ1dHRvbkNvbnRhaW5lciA9IG1ldGFkYXRhRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImFkZC1tZXRhZGF0YS1jb250YWluZXJcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIENyZWF0ZSB0aGUgYWRkIG1ldGFkYXRhIGJ1dHRvblxyXG5cdFx0Y29uc3QgYWRkQnRuID0gYWRkQnV0dG9uQ29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0Y2xzOiBcImFkZC1tZXRhZGF0YS1idG5cIixcclxuXHRcdFx0YXR0cjogeyBcImFyaWEtbGFiZWxcIjogXCJBZGQgbWV0YWRhdGFcIiB9LFxyXG5cdFx0fSk7XHJcblx0XHRzZXRJY29uKGFkZEJ0biwgXCJwbHVzXCIpO1xyXG5cclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChhZGRCdG4sIFwiY2xpY2tcIiwgKGUpID0+IHtcclxuXHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHRcdFx0Ly8gU2hvdyBtZXRhZGF0YSBtZW51IGRpcmVjdGx5IGluc3RlYWQgb2YgY2FsbGluZyBzaG93QWRkTWV0YWRhdGFCdXR0b25cclxuXHRcdFx0dGhpcy5zaG93TWV0YWRhdGFNZW51KGFkZEJ0bik7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc2hvd01ldGFkYXRhTWVudShidXR0b25FbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdGNvbnN0IGVkaXRvciA9IHRoaXMuZ2V0SW5saW5lRWRpdG9yKCk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGEgdGVtcG9yYXJ5IG1lbnUgY29udGFpbmVyXHJcblx0XHRjb25zdCBtZW51ID0gbmV3IE1lbnUoKTtcclxuXHJcblx0XHRjb25zdCBhdmFpbGFibGVGaWVsZHMgPSBbXHJcblx0XHRcdHsga2V5OiBcInByb2plY3RcIiwgbGFiZWw6IFwiUHJvamVjdFwiLCBpY29uOiBcImZvbGRlclwiIH0sXHJcblx0XHRcdHsga2V5OiBcInRhZ3NcIiwgbGFiZWw6IFwiVGFnc1wiLCBpY29uOiBcInRhZ1wiIH0sXHJcblx0XHRcdHsga2V5OiBcImNvbnRleHRcIiwgbGFiZWw6IFwiQ29udGV4dFwiLCBpY29uOiBcImF0LXNpZ25cIiB9LFxyXG5cdFx0XHR7IGtleTogXCJkdWVEYXRlXCIsIGxhYmVsOiBcIkR1ZSBEYXRlXCIsIGljb246IFwiY2FsZW5kYXJcIiB9LFxyXG5cdFx0XHR7IGtleTogXCJzdGFydERhdGVcIiwgbGFiZWw6IFwiU3RhcnQgRGF0ZVwiLCBpY29uOiBcInBsYXlcIiB9LFxyXG5cdFx0XHR7IGtleTogXCJzY2hlZHVsZWREYXRlXCIsIGxhYmVsOiBcIlNjaGVkdWxlZCBEYXRlXCIsIGljb246IFwiY2xvY2tcIiB9LFxyXG5cdFx0XHR7IGtleTogXCJjYW5jZWxsZWREYXRlXCIsIGxhYmVsOiBcIkNhbmNlbGxlZCBEYXRlXCIsIGljb246IFwieFwiIH0sXHJcblx0XHRcdHsga2V5OiBcImNvbXBsZXRlZERhdGVcIiwgbGFiZWw6IFwiQ29tcGxldGVkIERhdGVcIiwgaWNvbjogXCJjaGVja1wiIH0sXHJcblx0XHRcdHsga2V5OiBcInByaW9yaXR5XCIsIGxhYmVsOiBcIlByaW9yaXR5XCIsIGljb246IFwiYWxlcnQtdHJpYW5nbGVcIiB9LFxyXG5cdFx0XHR7IGtleTogXCJyZWN1cnJlbmNlXCIsIGxhYmVsOiBcIlJlY3VycmVuY2VcIiwgaWNvbjogXCJyZXBlYXRcIiB9LFxyXG5cdFx0XHR7IGtleTogXCJvbkNvbXBsZXRpb25cIiwgbGFiZWw6IFwiT24gQ29tcGxldGlvblwiLCBpY29uOiBcImZsYWdcIiB9LFxyXG5cdFx0XHR7IGtleTogXCJkZXBlbmRzT25cIiwgbGFiZWw6IFwiRGVwZW5kcyBPblwiLCBpY29uOiBcImxpbmtcIiB9LFxyXG5cdFx0XHR7IGtleTogXCJpZFwiLCBsYWJlbDogXCJUYXNrIElEXCIsIGljb246IFwiaGFzaFwiIH0sXHJcblx0XHRdO1xyXG5cclxuXHRcdC8vIEZpbHRlciBvdXQgZmllbGRzIHRoYXQgYWxyZWFkeSBoYXZlIHZhbHVlc1xyXG5cdFx0Y29uc3QgZmllbGRzVG9TaG93ID0gYXZhaWxhYmxlRmllbGRzLmZpbHRlcigoZmllbGQpID0+IHtcclxuXHRcdFx0c3dpdGNoIChmaWVsZC5rZXkpIHtcclxuXHRcdFx0XHRjYXNlIFwicHJvamVjdFwiOlxyXG5cdFx0XHRcdFx0cmV0dXJuICF0aGlzLnRhc2subWV0YWRhdGEucHJvamVjdDtcclxuXHRcdFx0XHRjYXNlIFwidGFnc1wiOlxyXG5cdFx0XHRcdFx0cmV0dXJuIChcclxuXHRcdFx0XHRcdFx0IXRoaXMudGFzay5tZXRhZGF0YS50YWdzIHx8XHJcblx0XHRcdFx0XHRcdHRoaXMudGFzay5tZXRhZGF0YS50YWdzLmxlbmd0aCA9PT0gMFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRjYXNlIFwiY29udGV4dFwiOlxyXG5cdFx0XHRcdFx0cmV0dXJuICF0aGlzLnRhc2subWV0YWRhdGEuY29udGV4dDtcclxuXHRcdFx0XHRjYXNlIFwiZHVlRGF0ZVwiOlxyXG5cdFx0XHRcdFx0cmV0dXJuICF0aGlzLnRhc2subWV0YWRhdGEuZHVlRGF0ZTtcclxuXHRcdFx0XHRjYXNlIFwic3RhcnREYXRlXCI6XHJcblx0XHRcdFx0XHRyZXR1cm4gIXRoaXMudGFzay5tZXRhZGF0YS5zdGFydERhdGU7XHJcblx0XHRcdFx0Y2FzZSBcInNjaGVkdWxlZERhdGVcIjpcclxuXHRcdFx0XHRcdHJldHVybiAhdGhpcy50YXNrLm1ldGFkYXRhLnNjaGVkdWxlZERhdGU7XHJcblx0XHRcdFx0Y2FzZSBcImNhbmNlbGxlZERhdGVcIjpcclxuXHRcdFx0XHRcdHJldHVybiAhdGhpcy50YXNrLm1ldGFkYXRhLmNhbmNlbGxlZERhdGU7XHJcblx0XHRcdFx0Y2FzZSBcImNvbXBsZXRlZERhdGVcIjpcclxuXHRcdFx0XHRcdHJldHVybiAhdGhpcy50YXNrLm1ldGFkYXRhLmNvbXBsZXRlZERhdGU7XHJcblx0XHRcdFx0Y2FzZSBcInByaW9yaXR5XCI6XHJcblx0XHRcdFx0XHRyZXR1cm4gIXRoaXMudGFzay5tZXRhZGF0YS5wcmlvcml0eTtcclxuXHRcdFx0XHRjYXNlIFwicmVjdXJyZW5jZVwiOlxyXG5cdFx0XHRcdFx0cmV0dXJuICF0aGlzLnRhc2subWV0YWRhdGEucmVjdXJyZW5jZTtcclxuXHRcdFx0XHRjYXNlIFwib25Db21wbGV0aW9uXCI6XHJcblx0XHRcdFx0XHRyZXR1cm4gIXRoaXMudGFzay5tZXRhZGF0YS5vbkNvbXBsZXRpb247XHJcblx0XHRcdFx0Y2FzZSBcImRlcGVuZHNPblwiOlxyXG5cdFx0XHRcdFx0cmV0dXJuIChcclxuXHRcdFx0XHRcdFx0IXRoaXMudGFzay5tZXRhZGF0YS5kZXBlbmRzT24gfHxcclxuXHRcdFx0XHRcdFx0dGhpcy50YXNrLm1ldGFkYXRhLmRlcGVuZHNPbi5sZW5ndGggPT09IDBcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0Y2FzZSBcImlkXCI6XHJcblx0XHRcdFx0XHRyZXR1cm4gIXRoaXMudGFzay5tZXRhZGF0YS5pZDtcclxuXHRcdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIElmIG5vIGZpZWxkcyBhcmUgYXZhaWxhYmxlIHRvIGFkZCwgc2hvdyBhIG1lc3NhZ2VcclxuXHRcdGlmIChmaWVsZHNUb1Nob3cubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRcdGl0ZW0uc2V0VGl0bGUoXHJcblx0XHRcdFx0XHRcIkFsbCBtZXRhZGF0YSBmaWVsZHMgYXJlIGFscmVhZHkgc2V0XCJcclxuXHRcdFx0XHQpLnNldERpc2FibGVkKHRydWUpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGZpZWxkc1RvU2hvdy5mb3JFYWNoKChmaWVsZCkgPT4ge1xyXG5cdFx0XHRcdG1lbnUuYWRkSXRlbSgoaXRlbTogYW55KSA9PiB7XHJcblx0XHRcdFx0XHRpdGVtLnNldFRpdGxlKGZpZWxkLmxhYmVsKVxyXG5cdFx0XHRcdFx0XHQuc2V0SWNvbihmaWVsZC5pY29uKVxyXG5cdFx0XHRcdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gQ3JlYXRlIGEgdGVtcG9yYXJ5IGNvbnRhaW5lciBmb3IgdGhlIG1ldGFkYXRhIGVkaXRvclxyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHRlbXBDb250YWluZXIgPVxyXG5cdFx0XHRcdFx0XHRcdFx0YnV0dG9uRWwucGFyZW50RWxlbWVudCEuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y2xzOiBcInRlbXAtbWV0YWRhdGEtZWRpdG9yLWNvbnRhaW5lclwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdGVkaXRvci5zaG93TWV0YWRhdGFFZGl0b3IoXHJcblx0XHRcdFx0XHRcdFx0XHR0ZW1wQ29udGFpbmVyLFxyXG5cdFx0XHRcdFx0XHRcdFx0ZmllbGQua2V5IGFzIGFueVxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHRtZW51LnNob3dBdFBvc2l0aW9uKHtcclxuXHRcdFx0eDogYnV0dG9uRWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkubGVmdCxcclxuXHRcdFx0eTogYnV0dG9uRWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuYm90dG9tLFxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGZvcm1hdERhdGVGb3JJbnB1dChkYXRlOiBEYXRlKTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IHllYXIgPSBkYXRlLmdldEZ1bGxZZWFyKCk7XHJcblx0XHRjb25zdCBtb250aCA9IFN0cmluZyhkYXRlLmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCBcIjBcIik7XHJcblx0XHRjb25zdCBkYXkgPSBTdHJpbmcoZGF0ZS5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIFwiMFwiKTtcclxuXHRcdHJldHVybiBgJHt5ZWFyfS0ke21vbnRofS0ke2RheX1gO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSByZW5kZXJNYXJrZG93bigpIHtcclxuXHRcdC8vIENsZWFyIGV4aXN0aW5nIGNvbnRlbnQgaWYgbmVlZGVkXHJcblx0XHRpZiAodGhpcy5tYXJrZG93blJlbmRlcmVyKSB7XHJcblx0XHRcdHRoaXMucmVtb3ZlQ2hpbGQodGhpcy5tYXJrZG93blJlbmRlcmVyKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDbGVhciB0aGUgY29udGVudCBlbGVtZW50XHJcblx0XHR0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBuZXcgcmVuZGVyZXJcclxuXHRcdHRoaXMubWFya2Rvd25SZW5kZXJlciA9IG5ldyBNYXJrZG93blJlbmRlcmVyQ29tcG9uZW50KFxyXG5cdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0dGhpcy5jb250ZW50RWwsXHJcblx0XHRcdHRoaXMudGFzay5maWxlUGF0aFxyXG5cdFx0KTtcclxuXHRcdHRoaXMuYWRkQ2hpbGQodGhpcy5tYXJrZG93blJlbmRlcmVyKTtcclxuXHJcblx0XHQvLyBSZW5kZXIgdGhlIG1hcmtkb3duIGNvbnRlbnRcclxuXHRcdHRoaXMubWFya2Rvd25SZW5kZXJlci5yZW5kZXIodGhpcy50YXNrLm9yaWdpbmFsTWFya2Rvd24pO1xyXG5cclxuXHRcdC8vIFJlLXJlZ2lzdGVyIHRoZSBjbGljayBldmVudCBmb3IgZWRpdGluZyBhZnRlciByZW5kZXJpbmdcclxuXHRcdHRoaXMucmVnaXN0ZXJDb250ZW50Q2xpY2tIYW5kbGVyKCk7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIGxheW91dCBtb2RlIGFmdGVyIGNvbnRlbnQgaXMgcmVuZGVyZWRcclxuXHRcdC8vIFVzZSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgdG8gZW5zdXJlIHRoZSBjb250ZW50IGlzIGZ1bGx5IHJlbmRlcmVkXHJcblx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xyXG5cdFx0XHR0aGlzLnVwZGF0ZUxheW91dE1vZGUoKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRGV0ZWN0IGNvbnRlbnQgaGVpZ2h0IGFuZCB1cGRhdGUgbGF5b3V0IG1vZGVcclxuXHQgKi9cclxuXHRwcml2YXRlIHVwZGF0ZUxheW91dE1vZGUoKSB7XHJcblx0XHRpZiAoIXRoaXMuY29udGVudEVsIHx8ICF0aGlzLmNvbnRlbnRNZXRhZGF0YUNvbnRhaW5lcikge1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgZHluYW1pYyBtZXRhZGF0YSBwb3NpdGlvbmluZyBpcyBlbmFibGVkXHJcblx0XHRpZiAoIXRoaXMucGx1Z2luLnNldHRpbmdzLmVuYWJsZUR5bmFtaWNNZXRhZGF0YVBvc2l0aW9uaW5nKSB7XHJcblx0XHRcdC8vIElmIGRpc2FibGVkLCBhbHdheXMgdXNlIG11bHRpLWxpbmUgKHRyYWRpdGlvbmFsKSBsYXlvdXRcclxuXHRcdFx0dGhpcy5jb250ZW50TWV0YWRhdGFDb250YWluZXIudG9nZ2xlQ2xhc3MoXHJcblx0XHRcdFx0XCJtdWx0aS1saW5lLWNvbnRlbnRcIixcclxuXHRcdFx0XHR0cnVlXHJcblx0XHRcdCk7XHJcblx0XHRcdHRoaXMuY29udGVudE1ldGFkYXRhQ29udGFpbmVyLnRvZ2dsZUNsYXNzKFxyXG5cdFx0XHRcdFwic2luZ2xlLWxpbmUtY29udGVudFwiLFxyXG5cdFx0XHRcdGZhbHNlXHJcblx0XHRcdCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBHZXQgdGhlIGxpbmUgaGVpZ2h0IG9mIHRoZSBjb250ZW50IGVsZW1lbnRcclxuXHRcdGNvbnN0IGNvbXB1dGVkU3R5bGUgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLmNvbnRlbnRFbCk7XHJcblx0XHRjb25zdCBsaW5lSGVpZ2h0ID1cclxuXHRcdFx0cGFyc2VGbG9hdChjb21wdXRlZFN0eWxlLmxpbmVIZWlnaHQpIHx8XHJcblx0XHRcdHBhcnNlRmxvYXQoY29tcHV0ZWRTdHlsZS5mb250U2l6ZSkgKiAxLjQ7XHJcblxyXG5cdFx0Ly8gR2V0IGFjdHVhbCBjb250ZW50IGhlaWdodFxyXG5cdFx0Y29uc3QgY29udGVudEhlaWdodCA9IHRoaXMuY29udGVudEVsLnNjcm9sbEhlaWdodDtcclxuXHJcblx0XHQvLyBDaGVjayBpZiBjb250ZW50IGlzIG11bHRpLWxpbmUgKHdpdGggc29tZSB0b2xlcmFuY2UpXHJcblx0XHRjb25zdCBpc011bHRpTGluZSA9IGNvbnRlbnRIZWlnaHQgPiBsaW5lSGVpZ2h0ICogMS4yO1xyXG5cclxuXHRcdC8vIEFwcGx5IGFwcHJvcHJpYXRlIGxheW91dCBjbGFzcyB1c2luZyBPYnNpZGlhbidzIHRvZ2dsZUNsYXNzIG1ldGhvZFxyXG5cdFx0dGhpcy5jb250ZW50TWV0YWRhdGFDb250YWluZXIudG9nZ2xlQ2xhc3MoXHJcblx0XHRcdFwibXVsdGktbGluZS1jb250ZW50XCIsXHJcblx0XHRcdGlzTXVsdGlMaW5lXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5jb250ZW50TWV0YWRhdGFDb250YWluZXIudG9nZ2xlQ2xhc3MoXHJcblx0XHRcdFwic2luZ2xlLWxpbmUtY29udGVudFwiLFxyXG5cdFx0XHQhaXNNdWx0aUxpbmVcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZWdpc3RlciBjbGljayBoYW5kbGVyIGZvciBjb250ZW50IGVkaXRpbmdcclxuXHQgKi9cclxuXHRwcml2YXRlIHJlZ2lzdGVyQ29udGVudENsaWNrSGFuZGxlcigpIHtcclxuXHRcdC8vIE1ha2UgY29udGVudCBjbGlja2FibGUgZm9yIGVkaXRpbmcgb3IgbmF2aWdhdGlvblxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KHRoaXMuY29udGVudEVsLCBcImNsaWNrXCIsIGFzeW5jIChlKSA9PiB7XHJcblx0XHRcdC8vIENoZWNrIGlmIG1vZGlmaWVyIGtleSBpcyBwcmVzc2VkIChDbWQvQ3RybClcclxuXHRcdFx0aWYgKEtleW1hcC5pc01vZEV2ZW50KGUpKSB7XHJcblx0XHRcdFx0Ly8gT3BlbiB0YXNrIGluIGZpbGVcclxuXHRcdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cdFx0XHRcdGF3YWl0IHRoaXMub3BlblRhc2tJbkZpbGUoKTtcclxuXHRcdFx0fSBlbHNlIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbmFibGVJbmxpbmVFZGl0b3IgJiYgIXRoaXMuaXNDdXJyZW50bHlFZGl0aW5nKCkpIHtcclxuXHRcdFx0XHQvLyBPbmx5IHN0b3AgcHJvcGFnYXRpb24gaWYgd2UncmUgYWN0dWFsbHkgZ29pbmcgdG8gc2hvdyB0aGUgZWRpdG9yXHJcblx0XHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHRcdFx0XHQvLyBTaG93IGlubGluZSBlZGl0b3Igb25seSBpZiBlbmFibGVkXHJcblx0XHRcdFx0Y29uc3QgZWRpdG9yID0gdGhpcy5nZXRJbmxpbmVFZGl0b3IoKTtcclxuXHRcdFx0XHRlZGl0b3Iuc2hvd0NvbnRlbnRFZGl0b3IodGhpcy5jb250ZW50RWwpO1xyXG5cdFx0XHR9XHJcblx0XHRcdC8vIElmIGlubGluZSBlZGl0b3IgaXMgZGlzYWJsZWQsIGxldCB0aGUgY2xpY2sgYnViYmxlIHVwIHRvIHNlbGVjdCB0aGUgdGFza1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHVwZGF0ZVRhc2tEaXNwbGF5KCkge1xyXG5cdFx0Ly8gUmUtcmVuZGVyIHRoZSB0YXNrIGNvbnRlbnRcclxuXHRcdHRoaXMucmVuZGVyVGFza0NvbnRlbnQoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyQ2hpbGRUYXNrcygpIHtcclxuXHRcdC8vIENsZWFyIGV4aXN0aW5nIGNoaWxkIGNvbXBvbmVudHNcclxuXHRcdHRoaXMuY2hpbGRDb21wb25lbnRzLmZvckVhY2goKGNvbXBvbmVudCkgPT4ge1xyXG5cdFx0XHRjb21wb25lbnQudW5sb2FkKCk7XHJcblx0XHR9KTtcclxuXHRcdHRoaXMuY2hpbGRDb21wb25lbnRzID0gW107XHJcblxyXG5cdFx0Ly8gQ2xlYXIgY2hpbGQgY29udGFpbmVyXHJcblx0XHR0aGlzLmNoaWxkcmVuQ29udGFpbmVyLmVtcHR5KCk7XHJcblxyXG5cdFx0Ly8gU2V0IHZpc2liaWxpdHkgYmFzZWQgb24gZXhwYW5kZWQgc3RhdGVcclxuXHRcdHRoaXMuaXNFeHBhbmRlZFxyXG5cdFx0XHQ/IHRoaXMuY2hpbGRyZW5Db250YWluZXIuc2hvdygpXHJcblx0XHRcdDogdGhpcy5jaGlsZHJlbkNvbnRhaW5lci5oaWRlKCk7XHJcblxyXG5cdFx0Ly8gR2V0IHZpZXcgY29uZmlndXJhdGlvbiB0byBjaGVjayBpZiB3ZSBzaG91bGQgaGlkZSBjb21wbGV0ZWQgYW5kIGFiYW5kb25lZCB0YXNrc1xyXG5cdFx0Y29uc3Qgdmlld0NvbmZpZyA9IGdldFZpZXdTZXR0aW5nT3JEZWZhdWx0KFxyXG5cdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0dGhpcy52aWV3TW9kZSBhcyBWaWV3TW9kZVxyXG5cdFx0KTtcclxuXHRcdGNvbnN0IGFiYW5kb25lZFN0YXR1cyA9XHJcblx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnRhc2tTdGF0dXNlcy5hYmFuZG9uZWQuc3BsaXQoXCJ8XCIpO1xyXG5cdFx0Y29uc3QgY29tcGxldGVkU3RhdHVzID1cclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c2VzLmNvbXBsZXRlZC5zcGxpdChcInxcIik7XHJcblxyXG5cdFx0Ly8gRmlsdGVyIGNoaWxkIHRhc2tzIGJhc2VkIG9uIHZpZXcgY29uZmlndXJhdGlvblxyXG5cdFx0bGV0IHRhc2tzVG9SZW5kZXIgPSB0aGlzLmNoaWxkVGFza3M7XHJcblx0XHRpZiAodmlld0NvbmZpZy5oaWRlQ29tcGxldGVkQW5kQWJhbmRvbmVkVGFza3MpIHtcclxuXHRcdFx0dGFza3NUb1JlbmRlciA9IHRoaXMuY2hpbGRUYXNrcy5maWx0ZXIoKHRhc2spID0+IHtcclxuXHRcdFx0XHRyZXR1cm4gKFxyXG5cdFx0XHRcdFx0IXRhc2suY29tcGxldGVkICYmXHJcblx0XHRcdFx0XHQhYWJhbmRvbmVkU3RhdHVzLmluY2x1ZGVzKHRhc2suc3RhdHVzLnRvTG93ZXJDYXNlKCkpICYmXHJcblx0XHRcdFx0XHQhY29tcGxldGVkU3RhdHVzLmluY2x1ZGVzKHRhc2suc3RhdHVzLnRvTG93ZXJDYXNlKCkpXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHQvLyBTb3J0IGNoaWxkcmVuIHVzaW5nIHRoZSBzYW1lIGNyaXRlcmlhIGFzIGxpc3QgdmlldyAoZmFsbGJhY2sgdG8gc2Vuc2libGUgZGVmYXVsdHMpXHJcblx0XHRjb25zdCBjaGlsZFNvcnRDcml0ZXJpYSA9IHZpZXdDb25maWcuc29ydENyaXRlcmlhO1xyXG5cdFx0aWYgKGNoaWxkU29ydENyaXRlcmlhICYmIGNoaWxkU29ydENyaXRlcmlhLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0dGFza3NUb1JlbmRlciA9IHNvcnRUYXNrcyhcclxuXHRcdFx0XHRbLi4udGFza3NUb1JlbmRlcl0sXHJcblx0XHRcdFx0Y2hpbGRTb3J0Q3JpdGVyaWEsXHJcblx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3NcclxuXHRcdFx0KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIERlZmF1bHQgc29ydGluZzogaW5jb21wbGV0ZSBmaXJzdCwgdGhlbiBwcmlvcml0eSAoaGlnaC0+bG93KSwgZHVlIGRhdGUgKGVhcmxpZXItPmxhdGVyKSwgY29udGVudDsgdGllLWJyZWFrIGJ5IGZpbGVQYXRoLT5saW5lXHJcblx0XHRcdHRhc2tzVG9SZW5kZXIgPSBbLi4udGFza3NUb1JlbmRlcl0uc29ydCgoYSwgYikgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IGNvbXBsZXRlZEEgPSBhLmNvbXBsZXRlZDtcclxuXHRcdFx0XHRjb25zdCBjb21wbGV0ZWRCID0gYi5jb21wbGV0ZWQ7XHJcblx0XHRcdFx0aWYgKGNvbXBsZXRlZEEgIT09IGNvbXBsZXRlZEIpIHJldHVybiBjb21wbGV0ZWRBID8gMSA6IC0xO1xyXG5cclxuXHRcdFx0XHRjb25zdCBwcmlvQSA9IGEubWV0YWRhdGEucHJpb3JpdHkgPz8gMDtcclxuXHRcdFx0XHRjb25zdCBwcmlvQiA9IGIubWV0YWRhdGEucHJpb3JpdHkgPz8gMDtcclxuXHRcdFx0XHRpZiAocHJpb0EgIT09IHByaW9CKSByZXR1cm4gcHJpb0IgLSBwcmlvQTtcclxuXHJcblx0XHRcdFx0Y29uc3QgZHVlQSA9IGEubWV0YWRhdGEuZHVlRGF0ZSA/PyBJbmZpbml0eTtcclxuXHRcdFx0XHRjb25zdCBkdWVCID0gYi5tZXRhZGF0YS5kdWVEYXRlID8/IEluZmluaXR5O1xyXG5cdFx0XHRcdGlmIChkdWVBICE9PSBkdWVCKSByZXR1cm4gZHVlQSAtIGR1ZUI7XHJcblxyXG5cdFx0XHRcdGNvbnN0IGNvbGxhdG9yID0gbmV3IEludGwuQ29sbGF0b3IodW5kZWZpbmVkLCB7XHJcblx0XHRcdFx0XHR1c2FnZTogXCJzb3J0XCIsXHJcblx0XHRcdFx0XHRzZW5zaXRpdml0eTogXCJiYXNlXCIsXHJcblx0XHRcdFx0XHRudW1lcmljOiB0cnVlLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGNvbnN0IGNvbnRlbnRDbXAgPSBjb2xsYXRvci5jb21wYXJlKFxyXG5cdFx0XHRcdFx0YS5jb250ZW50ID8/IFwiXCIsXHJcblx0XHRcdFx0XHRiLmNvbnRlbnQgPz8gXCJcIlxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0aWYgKGNvbnRlbnRDbXAgIT09IDApIHJldHVybiBjb250ZW50Q21wO1xyXG5cdFx0XHRcdGNvbnN0IGZwID0gKGEuZmlsZVBhdGggfHwgXCJcIikubG9jYWxlQ29tcGFyZShiLmZpbGVQYXRoIHx8IFwiXCIpO1xyXG5cdFx0XHRcdGlmIChmcCAhPT0gMCkgcmV0dXJuIGZwO1xyXG5cdFx0XHRcdHJldHVybiAoYS5saW5lID8/IDApIC0gKGIubGluZSA/PyAwKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUmVuZGVyIGVhY2ggZmlsdGVyZWQgY2hpbGQgdGFza1xyXG5cdFx0dGFza3NUb1JlbmRlci5mb3JFYWNoKChjaGlsZFRhc2spID0+IHtcclxuXHRcdFx0Ly8gRmluZCAqZ3JhbmRjaGlsZHJlbiogYnkgbG9va2luZyB1cCBjaGlsZHJlbiBvZiB0aGUgY3VycmVudCBjaGlsZFRhc2sgaW4gdGhlICpmdWxsKiB0YXNrTWFwXHJcblx0XHRcdGNvbnN0IGdyYW5kY2hpbGRyZW46IFRhc2tbXSA9IFtdO1xyXG5cdFx0XHR0aGlzLnRhc2tNYXAuZm9yRWFjaCgocG90ZW50aWFsR3JhbmRjaGlsZCkgPT4ge1xyXG5cdFx0XHRcdGlmIChwb3RlbnRpYWxHcmFuZGNoaWxkLm1ldGFkYXRhLnBhcmVudCA9PT0gY2hpbGRUYXNrLmlkKSB7XHJcblx0XHRcdFx0XHRncmFuZGNoaWxkcmVuLnB1c2gocG90ZW50aWFsR3JhbmRjaGlsZCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IGNoaWxkQ29tcG9uZW50ID0gbmV3IFRhc2tUcmVlSXRlbUNvbXBvbmVudChcclxuXHRcdFx0XHRjaGlsZFRhc2ssXHJcblx0XHRcdFx0dGhpcy52aWV3TW9kZSxcclxuXHRcdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0XHR0aGlzLmluZGVudExldmVsICsgMSxcclxuXHRcdFx0XHRncmFuZGNoaWxkcmVuLCAvLyBQYXNzIHRoZSBjb3JyZWN0bHkgZm91bmQgZ3JhbmRjaGlsZHJlblxyXG5cdFx0XHRcdHRoaXMudGFza01hcCwgLy8gUGFzcyB0aGUgbWFwIGRvd24gcmVjdXJzaXZlbHlcclxuXHRcdFx0XHR0aGlzLnBsdWdpbiAvLyBQYXNzIHRoZSBwbHVnaW4gZG93blxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gUGFzcyB1cCBldmVudHNcclxuXHRcdFx0Y2hpbGRDb21wb25lbnQub25UYXNrU2VsZWN0ZWQgPSAodGFzaykgPT4ge1xyXG5cdFx0XHRcdGlmICh0aGlzLm9uVGFza1NlbGVjdGVkKSB7XHJcblx0XHRcdFx0XHR0aGlzLm9uVGFza1NlbGVjdGVkKHRhc2spO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNoaWxkQ29tcG9uZW50Lm9uVGFza0NvbXBsZXRlZCA9ICh0YXNrKSA9PiB7XHJcblx0XHRcdFx0aWYgKHRoaXMub25UYXNrQ29tcGxldGVkKSB7XHJcblx0XHRcdFx0XHR0aGlzLm9uVGFza0NvbXBsZXRlZCh0YXNrKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjaGlsZENvbXBvbmVudC5vblRvZ2dsZUV4cGFuZCA9ICh0YXNrSWQsIGlzRXhwYW5kZWQpID0+IHtcclxuXHRcdFx0XHRpZiAodGhpcy5vblRvZ2dsZUV4cGFuZCkge1xyXG5cdFx0XHRcdFx0dGhpcy5vblRvZ2dsZUV4cGFuZCh0YXNrSWQsIGlzRXhwYW5kZWQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNoaWxkQ29tcG9uZW50Lm9uVGFza0NvbnRleHRNZW51ID0gKGV2ZW50LCB0YXNrKSA9PiB7XHJcblx0XHRcdFx0aWYgKHRoaXMub25UYXNrQ29udGV4dE1lbnUpIHtcclxuXHRcdFx0XHRcdHRoaXMub25UYXNrQ29udGV4dE1lbnUoZXZlbnQsIHRhc2spO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIFBhc3MgdXAgb25UYXNrVXBkYXRlIC0gQ1JJVElDQUw6IFRoaXMgd2FzIG1pc3NpbmcgYW5kIGNhdXNpbmcgdGhlIGNhbGxiYWNrIHRvIG5vdCBiZSBhdmFpbGFibGVcclxuXHRcdFx0Y2hpbGRDb21wb25lbnQub25UYXNrVXBkYXRlID0gYXN5bmMgKG9yaWdpbmFsVGFzaywgdXBkYXRlZFRhc2spID0+IHtcclxuXHRcdFx0XHRpZiAodGhpcy5vblRhc2tVcGRhdGUpIHtcclxuXHRcdFx0XHRcdGF3YWl0IHRoaXMub25UYXNrVXBkYXRlKG9yaWdpbmFsVGFzaywgdXBkYXRlZFRhc2spO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIExvYWQgY29tcG9uZW50XHJcblx0XHRcdHRoaXMuYWRkQ2hpbGQoY2hpbGRDb21wb25lbnQpO1xyXG5cdFx0XHRjaGlsZENvbXBvbmVudC5sb2FkKCk7XHJcblxyXG5cdFx0XHQvLyBBZGQgdG8gRE9NXHJcblx0XHRcdHRoaXMuY2hpbGRyZW5Db250YWluZXIuYXBwZW5kQ2hpbGQoY2hpbGRDb21wb25lbnQuZWxlbWVudCk7XHJcblxyXG5cdFx0XHQvLyBTdG9yZSBmb3IgbGF0ZXIgY2xlYW51cFxyXG5cdFx0XHR0aGlzLmNoaWxkQ29tcG9uZW50cy5wdXNoKGNoaWxkQ29tcG9uZW50KTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHVibGljIHVwZGF0ZUNoaWxkVGFza3MoY2hpbGRUYXNrczogVGFza1tdKSB7XHJcblx0XHR0aGlzLmNoaWxkVGFza3MgPSBjaGlsZFRhc2tzO1xyXG5cdFx0dGhpcy5yZW5kZXJDaGlsZFRhc2tzKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHNlbGVjdFRhc2soKSB7XHJcblx0XHRpZiAodGhpcy5vblRhc2tTZWxlY3RlZCkge1xyXG5cdFx0XHR0aGlzLm9uVGFza1NlbGVjdGVkKHRoaXMudGFzayk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHRvZ2dsZVRhc2tDb21wbGV0aW9uKCkge1xyXG5cdFx0Ly8g5Yib5bu65Lu75Yqh55qE5Ymv5pys5bm25YiH5o2i5a6M5oiQ54q25oCBXHJcblx0XHRjb25zdCB1cGRhdGVkVGFzazogVGFzayA9IHtcclxuXHRcdFx0Li4udGhpcy50YXNrLFxyXG5cdFx0XHRjb21wbGV0ZWQ6ICF0aGlzLnRhc2suY29tcGxldGVkLFxyXG5cdFx0fTtcclxuXHJcblx0XHQvLyDlpoLmnpzku7vliqHooqvmoIforrDkuLrlrozmiJDvvIzorr7nva7lrozmiJDml6XmnJ9cclxuXHRcdGlmICghdGhpcy50YXNrLmNvbXBsZXRlZCkge1xyXG5cdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YSA9IHtcclxuXHRcdFx0XHQuLi50aGlzLnRhc2subWV0YWRhdGEsXHJcblx0XHRcdFx0Y29tcGxldGVkRGF0ZTogRGF0ZS5ub3coKSxcclxuXHRcdFx0fTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIOWmguaenOS7u+WKoeiiq+agh+iusOS4uuacquWujOaIkO+8jOenu+mZpOWujOaIkOaXpeacn1xyXG5cdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YSA9IHtcclxuXHRcdFx0XHQuLi50aGlzLnRhc2subWV0YWRhdGEsXHJcblx0XHRcdFx0Y29tcGxldGVkRGF0ZTogdW5kZWZpbmVkLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0aGlzLm9uVGFza0NvbXBsZXRlZCkge1xyXG5cdFx0XHR0aGlzLm9uVGFza0NvbXBsZXRlZCh1cGRhdGVkVGFzayk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHRvZ2dsZUV4cGFuZCgpIHtcclxuXHRcdHRoaXMuaXNFeHBhbmRlZCA9ICF0aGlzLmlzRXhwYW5kZWQ7XHJcblxyXG5cdFx0aWYgKHRoaXMudG9nZ2xlRWwgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkge1xyXG5cdFx0XHRzZXRJY29uKFxyXG5cdFx0XHRcdHRoaXMudG9nZ2xlRWwsXHJcblx0XHRcdFx0dGhpcy5pc0V4cGFuZGVkID8gXCJjaGV2cm9uLWRvd25cIiA6IFwiY2hldnJvbi1yaWdodFwiXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU2hvdy9oaWRlIGNoaWxkcmVuXHJcblx0XHR0aGlzLmlzRXhwYW5kZWRcclxuXHRcdFx0PyB0aGlzLmNoaWxkcmVuQ29udGFpbmVyLnNob3coKVxyXG5cdFx0XHQ6IHRoaXMuY2hpbGRyZW5Db250YWluZXIuaGlkZSgpO1xyXG5cclxuXHRcdC8vIE5vdGlmeSBwYXJlbnRcclxuXHRcdGlmICh0aGlzLm9uVG9nZ2xlRXhwYW5kKSB7XHJcblx0XHRcdHRoaXMub25Ub2dnbGVFeHBhbmQodGhpcy50YXNrLmlkLCB0aGlzLmlzRXhwYW5kZWQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBvcGVuVGFza0luRmlsZSgpIHtcclxuXHRcdGNvbnN0IGZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRGaWxlQnlQYXRoKHRoaXMudGFzay5maWxlUGF0aCk7XHJcblx0XHRpZiAoZmlsZSkge1xyXG5cdFx0XHRjb25zdCBsZWFmID0gdGhpcy5hcHAud29ya3NwYWNlLmdldExlYWYoZmFsc2UpO1xyXG5cdFx0XHRhd2FpdCBsZWFmLm9wZW5GaWxlKGZpbGUsIHtcclxuXHRcdFx0XHRlU3RhdGU6IHtcclxuXHRcdFx0XHRcdGxpbmU6IHRoaXMudGFzay5saW5lLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHVibGljIHNldFNlbGVjdGVkKHNlbGVjdGVkOiBib29sZWFuKSB7XHJcblx0XHR0aGlzLmlzU2VsZWN0ZWQgPSBzZWxlY3RlZDtcclxuXHRcdHRoaXMuZWxlbWVudC5jbGFzc0xpc3QudG9nZ2xlKFwic2VsZWN0ZWRcIiwgc2VsZWN0ZWQpO1xyXG5cdH1cclxuXHJcblx0cHVibGljIHVwZGF0ZVRhc2sodGFzazogVGFzaykge1xyXG5cdFx0Y29uc3Qgb2xkVGFzayA9IHRoaXMudGFzaztcclxuXHRcdHRoaXMudGFzayA9IHRhc2s7XHJcblx0XHR0aGlzLnJlbmRlclRhc2tDb250ZW50KCk7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIGNvbXBsZXRpb24gc3RhdHVzXHJcblx0XHRpZiAob2xkVGFzay5jb21wbGV0ZWQgIT09IHRhc2suY29tcGxldGVkKSB7XHJcblx0XHRcdGlmICh0YXNrLmNvbXBsZXRlZCkge1xyXG5cdFx0XHRcdHRoaXMuZWxlbWVudC5jbGFzc0xpc3QuYWRkKFwidGFzay1jb21wbGV0ZWRcIik7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGhpcy5lbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoXCJ0YXNrLWNvbXBsZXRlZFwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIElmIGNvbnRlbnQgb3Igb3JpZ2luYWxNYXJrZG93biBjaGFuZ2VkLCB1cGRhdGUgdGhlIG1hcmtkb3duIGRpc3BsYXlcclxuXHRcdGlmIChcclxuXHRcdFx0b2xkVGFzay5vcmlnaW5hbE1hcmtkb3duICE9PSB0YXNrLm9yaWdpbmFsTWFya2Rvd24gfHxcclxuXHRcdFx0b2xkVGFzay5jb250ZW50ICE9PSB0YXNrLmNvbnRlbnRcclxuXHRcdCkge1xyXG5cdFx0XHQvLyBSZS1yZW5kZXIgdGhlIG1hcmtkb3duIGNvbnRlbnRcclxuXHRcdFx0dGhpcy5jb250ZW50RWwuZW1wdHkoKTtcclxuXHRcdFx0dGhpcy5yZW5kZXJNYXJrZG93bigpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENoZWNrIGlmIG1ldGFkYXRhIGNoYW5nZWQgYW5kIG5lZWQgZnVsbCByZWZyZXNoXHJcblx0XHRpZiAoXHJcblx0XHRcdEpTT04uc3RyaW5naWZ5KG9sZFRhc2subWV0YWRhdGEpICE9PSBKU09OLnN0cmluZ2lmeSh0YXNrLm1ldGFkYXRhKVxyXG5cdFx0KSB7XHJcblx0XHRcdC8vIFJlLXJlbmRlciBtZXRhZGF0YVxyXG5cdFx0XHRjb25zdCBtZXRhZGF0YUVsID0gdGhpcy5wYXJlbnRDb250YWluZXIucXVlcnlTZWxlY3RvcihcclxuXHRcdFx0XHRcIi50YXNrLW1ldGFkYXRhXCJcclxuXHRcdFx0KSBhcyBIVE1MRWxlbWVudDtcclxuXHRcdFx0aWYgKG1ldGFkYXRhRWwpIHtcclxuXHRcdFx0XHR0aGlzLnJlbmRlck1ldGFkYXRhKG1ldGFkYXRhRWwpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBBdHRlbXB0cyB0byBmaW5kIGFuZCB1cGRhdGUgYSB0YXNrIHdpdGhpbiB0aGlzIGNvbXBvbmVudCdzIGNoaWxkcmVuLlxyXG5cdCAqIEBwYXJhbSB1cGRhdGVkVGFzayBUaGUgdGFzayBkYXRhIHRvIHVwZGF0ZS5cclxuXHQgKiBAcmV0dXJucyBUcnVlIGlmIHRoZSB0YXNrIHdhcyBmb3VuZCBhbmQgdXBkYXRlZCBpbiB0aGUgc3VidHJlZSwgZmFsc2Ugb3RoZXJ3aXNlLlxyXG5cdCAqL1xyXG5cdHB1YmxpYyB1cGRhdGVUYXNrUmVjdXJzaXZlbHkodXBkYXRlZFRhc2s6IFRhc2spOiBib29sZWFuIHtcclxuXHRcdC8vIEl0ZXJhdGUgdGhyb3VnaCB0aGUgZGlyZWN0IGNoaWxkIGNvbXBvbmVudHMgb2YgdGhpcyBpdGVtXHJcblx0XHRmb3IgKGNvbnN0IGNoaWxkQ29tcCBvZiB0aGlzLmNoaWxkQ29tcG9uZW50cykge1xyXG5cdFx0XHQvLyBDaGVjayBpZiB0aGUgZGlyZWN0IGNoaWxkIGlzIHRoZSB0YXNrIHdlJ3JlIGxvb2tpbmcgZm9yXHJcblx0XHRcdGlmIChjaGlsZENvbXAuZ2V0VGFzaygpLmlkID09PSB1cGRhdGVkVGFzay5pZCkge1xyXG5cdFx0XHRcdGNoaWxkQ29tcC51cGRhdGVUYXNrKHVwZGF0ZWRUYXNrKTsgLy8gVXBkYXRlIHRoZSBjaGlsZCBkaXJlY3RseVxyXG5cdFx0XHRcdHJldHVybiB0cnVlOyAvLyBUYXNrIGZvdW5kIGFuZCB1cGRhdGVkXHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gSWYgbm90IGEgZGlyZWN0IGNoaWxkLCBhc2sgdGhpcyBjaGlsZCB0byBjaGVjayBpdHMgb3duIGNoaWxkcmVuIHJlY3Vyc2l2ZWx5XHJcblx0XHRcdFx0Y29uc3QgZm91bmRJbkNoaWxkcmVuID1cclxuXHRcdFx0XHRcdGNoaWxkQ29tcC51cGRhdGVUYXNrUmVjdXJzaXZlbHkodXBkYXRlZFRhc2spO1xyXG5cdFx0XHRcdGlmIChmb3VuZEluQ2hpbGRyZW4pIHtcclxuXHRcdFx0XHRcdHJldHVybiB0cnVlOyAvLyBUYXNrIHdhcyBmb3VuZCBkZWVwZXIgaW4gdGhpcyBjaGlsZCdzIHN1YnRyZWVcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdC8vIElmIHRoZSBsb29wIGZpbmlzaGVzLCB0aGUgdGFzayB3YXMgbm90IGZvdW5kIGluIHRoaXMgY29tcG9uZW50J3Mgc3VidHJlZVxyXG5cdFx0cmV0dXJuIGZhbHNlO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRmluZCBhIGNvbXBvbmVudCBpbiB0aGlzIHN1YnRyZWUgYnkgdGFzayBpZC5cclxuXHQgKi9cclxuXHRwdWJsaWMgZmluZENvbXBvbmVudEJ5VGFza0lkKHRhc2tJZDogc3RyaW5nKTogVGFza1RyZWVJdGVtQ29tcG9uZW50IHwgbnVsbCB7XHJcblx0XHRpZiAodGhpcy50YXNrLmlkID09PSB0YXNrSWQpIHJldHVybiB0aGlzO1xyXG5cdFx0Zm9yIChjb25zdCBjaGlsZCBvZiB0aGlzLmNoaWxkQ29tcG9uZW50cykge1xyXG5cdFx0XHRjb25zdCBmb3VuZCA9IGNoaWxkLmZpbmRDb21wb25lbnRCeVRhc2tJZCh0YXNrSWQpO1xyXG5cdFx0XHRpZiAoZm91bmQpIHJldHVybiBmb3VuZDtcclxuXHRcdH1cclxuXHRcdHJldHVybiBudWxsO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVtb3ZlIGEgY2hpbGQgY29tcG9uZW50IChhbnkgZGVwdGgpIGJ5IHRhc2sgaWQuIFJldHVybnMgdHJ1ZSBpZiByZW1vdmVkLlxyXG5cdCAqL1xyXG5cdHB1YmxpYyByZW1vdmVDaGlsZEJ5VGFza0lkKHRhc2tJZDogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuY2hpbGRDb21wb25lbnRzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGNvbnN0IGNoaWxkID0gdGhpcy5jaGlsZENvbXBvbmVudHNbaV07XHJcblx0XHRcdGlmIChjaGlsZC5nZXRUYXNrKCkuaWQgPT09IHRhc2tJZCkge1xyXG5cdFx0XHRcdGNoaWxkLnVubG9hZCgpO1xyXG5cdFx0XHRcdHRoaXMuY2hpbGRDb21wb25lbnRzLnNwbGljZShpLCAxKTtcclxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoY2hpbGQucmVtb3ZlQ2hpbGRCeVRhc2tJZCh0YXNrSWQpKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBnZXRUYXNrKCk6IFRhc2sge1xyXG5cdFx0cmV0dXJuIHRoaXMudGFzaztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZXMgdGhlIHZpc3VhbCBzZWxlY3Rpb24gc3RhdGUgb2YgdGhpcyBjb21wb25lbnQgYW5kIGl0cyBjaGlsZHJlbi5cclxuXHQgKiBAcGFyYW0gc2VsZWN0ZWRJZCBUaGUgSUQgb2YgdGhlIHRhc2sgdGhhdCBzaG91bGQgYmUgbWFya2VkIGFzIHNlbGVjdGVkLCBvciBudWxsIHRvIGRlc2VsZWN0IGFsbC5cclxuXHQgKi9cclxuXHRwdWJsaWMgdXBkYXRlU2VsZWN0aW9uVmlzdWFscyhzZWxlY3RlZElkOiBzdHJpbmcgfCBudWxsKSB7XHJcblx0XHRjb25zdCBpc05vd1NlbGVjdGVkID0gdGhpcy50YXNrLmlkID09PSBzZWxlY3RlZElkO1xyXG5cdFx0aWYgKHRoaXMuaXNTZWxlY3RlZCAhPT0gaXNOb3dTZWxlY3RlZCkge1xyXG5cdFx0XHR0aGlzLmlzU2VsZWN0ZWQgPSBpc05vd1NlbGVjdGVkO1xyXG5cdFx0XHQvLyBVc2UgdGhlIGV4aXN0aW5nIGVsZW1lbnQgcmVmZXJlbmNlIGlmIGF2YWlsYWJsZSwgb3RoZXJ3aXNlIHF1ZXJ5U2VsZWN0b3JcclxuXHRcdFx0Y29uc3QgZWxlbWVudFRvVG9nZ2xlID1cclxuXHRcdFx0XHR0aGlzLmVsZW1lbnQgfHxcclxuXHRcdFx0XHR0aGlzLnBhcmVudENvbnRhaW5lcj8uY2xvc2VzdChcIi50cmVlLXRhc2staXRlbVwiKTtcclxuXHRcdFx0aWYgKGVsZW1lbnRUb1RvZ2dsZSkge1xyXG5cdFx0XHRcdGVsZW1lbnRUb1RvZ2dsZS5jbGFzc0xpc3QudG9nZ2xlKFxyXG5cdFx0XHRcdFx0XCJpcy1zZWxlY3RlZFwiLFxyXG5cdFx0XHRcdFx0dGhpcy5pc1NlbGVjdGVkXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHQvLyBBbHNvIGVuc3VyZSB0aGUgcGFyZW50IGNvbnRhaW5lciByZWZsZWN0cyBzZWxlY3Rpb24gaWYgc2VwYXJhdGUgZWxlbWVudFxyXG5cdFx0XHRcdGlmICh0aGlzLnBhcmVudENvbnRhaW5lcikge1xyXG5cdFx0XHRcdFx0dGhpcy5wYXJlbnRDb250YWluZXIuY2xhc3NMaXN0LnRvZ2dsZShcclxuXHRcdFx0XHRcdFx0XCJzZWxlY3RlZFwiLFxyXG5cdFx0XHRcdFx0XHR0aGlzLmlzU2VsZWN0ZWRcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcdFwiQ291bGQgbm90IGZpbmQgZWxlbWVudCB0byB0b2dnbGUgc2VsZWN0aW9uIGNsYXNzIGZvciB0YXNrOlwiLFxyXG5cdFx0XHRcdFx0dGhpcy50YXNrLmlkXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlY3Vyc2l2ZWx5IHVwZGF0ZSBjaGlsZHJlblxyXG5cdFx0dGhpcy5jaGlsZENvbXBvbmVudHMuZm9yRWFjaCgoY2hpbGQpID0+XHJcblx0XHRcdGNoaWxkLnVwZGF0ZVNlbGVjdGlvblZpc3VhbHMoc2VsZWN0ZWRJZClcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgc2V0RXhwYW5kZWQoZXhwYW5kZWQ6IGJvb2xlYW4pIHtcclxuXHRcdGlmICh0aGlzLmlzRXhwYW5kZWQgIT09IGV4cGFuZGVkKSB7XHJcblx0XHRcdHRoaXMuaXNFeHBhbmRlZCA9IGV4cGFuZGVkO1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIGljb25cclxuXHRcdFx0aWYgKHRoaXMudG9nZ2xlRWwgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkge1xyXG5cdFx0XHRcdHNldEljb24oXHJcblx0XHRcdFx0XHR0aGlzLnRvZ2dsZUVsLFxyXG5cdFx0XHRcdFx0dGhpcy5pc0V4cGFuZGVkID8gXCJjaGV2cm9uLWRvd25cIiA6IFwiY2hldnJvbi1yaWdodFwiXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gU2hvdy9oaWRlIGNoaWxkcmVuXHJcblx0XHRcdHRoaXMuaXNFeHBhbmRlZFxyXG5cdFx0XHRcdD8gdGhpcy5jaGlsZHJlbkNvbnRhaW5lci5zaG93KClcclxuXHRcdFx0XHQ6IHRoaXMuY2hpbGRyZW5Db250YWluZXIuaGlkZSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0b251bmxvYWQoKSB7XHJcblx0XHQvLyBSZWxlYXNlIGVkaXRvciBmcm9tIG1hbmFnZXIgaWYgdGhpcyB0YXNrIHdhcyBiZWluZyBlZGl0ZWRcclxuXHRcdGlmIChcclxuXHRcdFx0VGFza1RyZWVJdGVtQ29tcG9uZW50LmVkaXRvck1hbmFnZXI/Lmhhc0FjdGl2ZUVkaXRvcih0aGlzLnRhc2suaWQpXHJcblx0XHQpIHtcclxuXHRcdFx0VGFza1RyZWVJdGVtQ29tcG9uZW50LmVkaXRvck1hbmFnZXIucmVsZWFzZUVkaXRvcih0aGlzLnRhc2suaWQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENsZWFuIHVwIGNoaWxkIGNvbXBvbmVudHNcclxuXHRcdHRoaXMuY2hpbGRDb21wb25lbnRzLmZvckVhY2goKGNvbXBvbmVudCkgPT4ge1xyXG5cdFx0XHRjb21wb25lbnQudW5sb2FkKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBSZW1vdmUgZWxlbWVudCBmcm9tIERPTSBpZiBpdCBleGlzdHNcclxuXHRcdGlmICh0aGlzLmVsZW1lbnQgJiYgdGhpcy5lbGVtZW50LnBhcmVudE5vZGUpIHtcclxuXHRcdFx0dGhpcy5lbGVtZW50LnJlbW92ZSgpO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG4iXX0=