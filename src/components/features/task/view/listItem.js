import { __awaiter } from "tslib";
import { Component, Menu, setIcon, Keymap } from "obsidian";
import { MarkdownRendererComponent } from "@/components/ui/renderers/MarkdownRenderer";
import "@/styles/task-list.css";
import { createTaskCheckbox } from "./details";
import { getRelativeTimeString } from "@/utils/date/date-formatter";
import { t } from "@/translations/helper";
import { InlineEditorManager } from "./InlineEditorManager";
import { sanitizePriorityForClass } from "@/utils/task/priority-utils";
export class TaskListItemComponent extends Component {
    constructor(task, viewMode, app, plugin) {
        super();
        this.task = task;
        this.viewMode = viewMode;
        this.app = app;
        this.plugin = plugin;
        this.element = createEl("div", {
            cls: "task-item",
            attr: { "data-task-id": this.task.id },
        });
        this.settings = this.plugin.settings;
        // Initialize shared editor manager if not exists
        if (!TaskListItemComponent.editorManager) {
            TaskListItemComponent.editorManager = new InlineEditorManager(this.app, this.plugin);
        }
    }
    /**
     * Get the inline editor from the shared manager when needed
     */
    getInlineEditor() {
        const editorOptions = {
            onTaskUpdate: (originalTask, updatedTask) => __awaiter(this, void 0, void 0, function* () {
                if (this.onTaskUpdate) {
                    console.log(originalTask.content, updatedTask.content);
                    try {
                        yield this.onTaskUpdate(originalTask, updatedTask);
                        console.log("listItem onTaskUpdate completed successfully");
                        // Don't update task reference here - let onContentEditFinished handle it
                    }
                    catch (error) {
                        console.error("Error in listItem onTaskUpdate:", error);
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
                (_a = TaskListItemComponent.editorManager) === null || _a === void 0 ? void 0 : _a.releaseEditor(this.task.id);
            },
            onMetadataEditFinished: (targetEl, updatedTask, fieldType) => {
                var _a;
                // Update the task reference with the saved task
                this.task = updatedTask;
                // Update the task display to reflect metadata changes
                this.updateTaskDisplay();
                // Release the editor from the manager
                (_a = TaskListItemComponent.editorManager) === null || _a === void 0 ? void 0 : _a.releaseEditor(this.task.id);
            },
            useEmbeddedEditor: true, // Enable Obsidian's embedded editor
        };
        return TaskListItemComponent.editorManager.getEditor(this.task, editorOptions);
    }
    /**
     * Check if this task is currently being edited
     */
    isCurrentlyEditing() {
        var _a;
        return (((_a = TaskListItemComponent.editorManager) === null || _a === void 0 ? void 0 : _a.hasActiveEditor(this.task.id)) || false);
    }
    onload() {
        this.registerDomEvent(this.element, "contextmenu", (event) => {
            console.log("contextmenu", event, this.task);
            if (this.onTaskContextMenu) {
                this.onTaskContextMenu(event, this.task);
            }
        });
        this.renderTaskItem();
    }
    renderTaskItem() {
        this.element.empty();
        if (this.task.completed) {
            this.element.classList.add("task-completed");
        }
        // Task checkbox for completion status
        const checkboxEl = createEl("div", {
            cls: "task-checkbox",
        }, (el) => {
            // Create a checkbox input element
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
        this.element.appendChild(checkboxEl);
        this.containerEl = this.element.createDiv({
            cls: "task-item-container",
        });
        // Create content-metadata container for dynamic layout
        this.contentMetadataContainer = this.containerEl.createDiv({
            cls: "task-content-metadata-container",
        });
        // Task content
        this.contentEl = this.contentMetadataContainer.createDiv({
            cls: "task-item-content",
        });
        // Make content clickable for editing
        this.registerContentClickHandler();
        this.renderMarkdown();
        this.metadataEl = this.contentMetadataContainer.createDiv({
            cls: "task-item-metadata",
        });
        this.renderMetadata();
        // Priority indicator if available
        if (this.task.metadata.priority) {
            console.log("priority", this.task.metadata.priority);
            // Convert priority to numeric value
            let numericPriority;
            if (typeof this.task.metadata.priority === "string") {
                switch (this.task.metadata.priority.toLowerCase()) {
                    case "low":
                        numericPriority = 1;
                        break;
                    case "medium":
                        numericPriority = 2;
                        break;
                    case "high":
                        numericPriority = 3;
                        break;
                    default:
                        numericPriority =
                            parseInt(this.task.metadata.priority) || 1;
                        break;
                }
            }
            else {
                numericPriority = this.task.metadata.priority;
            }
            const sanitizedPriority = sanitizePriorityForClass(numericPriority);
            const classes = ["task-priority"];
            if (sanitizedPriority) {
                classes.push(`priority-${sanitizedPriority}`);
            }
            const priorityEl = createDiv({ cls: classes });
            // Priority icon based on level
            let icon = "•";
            icon = "!".repeat(numericPriority);
            priorityEl.textContent = icon;
            this.element.appendChild(priorityEl);
        }
        // Click handler to select task
        this.registerDomEvent(this.element, "click", () => {
            if (this.onTaskSelected) {
                this.onTaskSelected(this.task);
            }
        });
    }
    renderMetadata() {
        this.metadataEl.empty();
        // For cancelled tasks, show cancelled date (independent of completion status)
        if (this.task.metadata.cancelledDate) {
            this.renderDateMetadata("cancelled", this.task.metadata.cancelledDate);
        }
        // Display dates based on task completion status
        if (!this.task.completed) {
            // For incomplete tasks, show due, scheduled, and start dates
            // Due date if available
            if (this.task.metadata.dueDate) {
                this.renderDateMetadata("due", this.task.metadata.dueDate);
            }
            // Scheduled date if available
            if (this.task.metadata.scheduledDate) {
                this.renderDateMetadata("scheduled", this.task.metadata.scheduledDate);
            }
            // Start date if available
            if (this.task.metadata.startDate) {
                this.renderDateMetadata("start", this.task.metadata.startDate);
            }
            // Recurrence if available
            if (this.task.metadata.recurrence) {
                this.renderRecurrenceMetadata();
            }
        }
        else {
            // For completed tasks, show completion date
            if (this.task.metadata.completedDate) {
                this.renderDateMetadata("completed", this.task.metadata.completedDate);
            }
            // Created date if available
            if (this.task.metadata.createdDate) {
                this.renderDateMetadata("created", this.task.metadata.createdDate);
            }
        }
        // Project badge if available and not in project view
        if ((this.task.metadata.project || this.task.metadata.tgProject) &&
            this.viewMode !== "projects") {
            this.renderProjectMetadata();
        }
        // Tags if available
        if (this.task.metadata.tags && this.task.metadata.tags.length > 0) {
            this.renderTagsMetadata();
        }
        // OnCompletion if available
        if (this.task.metadata.onCompletion) {
            this.renderOnCompletionMetadata();
        }
        // DependsOn if available
        if (this.task.metadata.dependsOn &&
            this.task.metadata.dependsOn.length > 0) {
            this.renderDependsOnMetadata();
        }
        // ID if available
        if (this.task.metadata.id) {
            this.renderIdMetadata();
        }
        // Add metadata button for adding new metadata
        this.renderAddMetadataButton();
    }
    renderDateMetadata(type, dateValue) {
        const dateEl = this.metadataEl.createEl("div", {
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
                        (this.settings.useRelativeTimeForDate
                            ? " | " + getRelativeTimeString(date)
                            : "");
                cssClass = "task-overdue";
            }
            else if (date.getTime() === today.getTime()) {
                dateText = this.settings.useRelativeTimeForDate
                    ? getRelativeTimeString(date) || "Today"
                    : "Today";
                cssClass = "task-due-today";
            }
            else if (date.getTime() === tomorrow.getTime()) {
                dateText = this.settings.useRelativeTimeForDate
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
            dateText = this.settings.useRelativeTimeForDate
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
                        this.getInlineEditor().showMetadataEditor(dateEl, fieldType, dateString);
                    }
                }
            });
        }
    }
    renderProjectMetadata() {
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
        const projectEl = this.metadataEl.createEl("div", {
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
                    this.getInlineEditor().showMetadataEditor(projectEl, "project", this.task.metadata.project || "");
                }
            });
        }
    }
    renderTagsMetadata() {
        const tagsContainer = this.metadataEl.createEl("div", {
            cls: "task-tags-container",
        });
        this.task.metadata.tags
            .filter((tag) => !tag.startsWith("#project"))
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
                        const tagsString = ((_a = this.task.metadata.tags) === null || _a === void 0 ? void 0 : _a.join(", ")) || "";
                        this.getInlineEditor().showMetadataEditor(tagsContainer, "tags", tagsString);
                    }
                });
            }
        });
    }
    renderRecurrenceMetadata() {
        const recurrenceEl = this.metadataEl.createEl("div", {
            cls: "task-date task-recurrence",
        });
        recurrenceEl.textContent = this.task.metadata.recurrence || "";
        // Make recurrence clickable for editing only if inline editor is enabled
        if (this.plugin.settings.enableInlineEditor) {
            this.registerDomEvent(recurrenceEl, "click", (e) => {
                e.stopPropagation();
                if (!this.isCurrentlyEditing()) {
                    this.getInlineEditor().showMetadataEditor(recurrenceEl, "recurrence", this.task.metadata.recurrence || "");
                }
            });
        }
    }
    renderOnCompletionMetadata() {
        const onCompletionEl = this.metadataEl.createEl("div", {
            cls: "task-oncompletion",
        });
        onCompletionEl.textContent = `🏁 ${this.task.metadata.onCompletion}`;
        // Make onCompletion clickable for editing only if inline editor is enabled
        if (this.plugin.settings.enableInlineEditor) {
            this.registerDomEvent(onCompletionEl, "click", (e) => {
                e.stopPropagation();
                if (!this.isCurrentlyEditing()) {
                    this.getInlineEditor().showMetadataEditor(onCompletionEl, "onCompletion", this.task.metadata.onCompletion || "");
                }
            });
        }
    }
    renderDependsOnMetadata() {
        var _a;
        const dependsOnEl = this.metadataEl.createEl("div", {
            cls: "task-dependson",
        });
        dependsOnEl.textContent = `⛔ ${(_a = this.task.metadata.dependsOn) === null || _a === void 0 ? void 0 : _a.join(", ")}`;
        // Make dependsOn clickable for editing only if inline editor is enabled
        if (this.plugin.settings.enableInlineEditor) {
            this.registerDomEvent(dependsOnEl, "click", (e) => {
                var _a;
                e.stopPropagation();
                if (!this.isCurrentlyEditing()) {
                    this.getInlineEditor().showMetadataEditor(dependsOnEl, "dependsOn", ((_a = this.task.metadata.dependsOn) === null || _a === void 0 ? void 0 : _a.join(", ")) || "");
                }
            });
        }
    }
    renderIdMetadata() {
        const idEl = this.metadataEl.createEl("div", {
            cls: "task-id",
        });
        idEl.textContent = `🆔 ${this.task.metadata.id}`;
        // Make id clickable for editing only if inline editor is enabled
        if (this.plugin.settings.enableInlineEditor) {
            this.registerDomEvent(idEl, "click", (e) => {
                e.stopPropagation();
                if (!this.isCurrentlyEditing()) {
                    this.getInlineEditor().showMetadataEditor(idEl, "id", this.task.metadata.id || "");
                }
            });
        }
    }
    renderAddMetadataButton() {
        // Only show add metadata button if inline editor is enabled
        if (!this.plugin.settings.enableInlineEditor) {
            return;
        }
        const addButtonContainer = this.metadataEl.createDiv({
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
        // 使用 requestAnimationFrame 确保 DOM 完全清理后再渲染新内容
        requestAnimationFrame(() => {
            // Create new renderer
            this.markdownRenderer = new MarkdownRendererComponent(this.app, this.contentEl, this.task.filePath);
            this.addChild(this.markdownRenderer);
            // Render the markdown content - 使用最新的 originalMarkdown
            this.markdownRenderer.render(this.task.originalMarkdown || "\u200b");
            // Re-register the click event for editing after rendering
            this.registerContentClickHandler();
            // Update layout mode after content is rendered
            // Use another requestAnimationFrame to ensure the content is fully rendered
            requestAnimationFrame(() => {
                this.updateLayoutMode();
            });
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
            else if (this.plugin.settings.enableInlineEditor &&
                !this.isCurrentlyEditing()) {
                // Only stop propagation if we're actually going to show the editor
                e.stopPropagation();
                // Show inline editor only if enabled
                this.getInlineEditor().showContentEditor(this.contentEl);
            }
            // If inline editor is disabled, let the click bubble up to select the task
        }));
    }
    updateTaskDisplay() {
        // Re-render the entire task item
        this.renderTaskItem();
    }
    getTask() {
        return this.task;
    }
    updateTask(task) {
        const oldTask = this.task;
        this.task = task;
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
        // Check if metadata changed and update metadata display
        if (JSON.stringify(oldTask.metadata) !== JSON.stringify(task.metadata)) {
            this.renderMetadata();
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
        if (selected) {
            this.element.classList.add("selected");
        }
        else {
            this.element.classList.remove("selected");
        }
    }
    onunload() {
        var _a;
        // Release editor from manager if this task was being edited
        if ((_a = TaskListItemComponent.editorManager) === null || _a === void 0 ? void 0 : _a.hasActiveEditor(this.task.id)) {
            TaskListItemComponent.editorManager.releaseEditor(this.task.id);
        }
        this.element.detach();
    }
}
// Use shared editor manager instead of individual editors
TaskListItemComponent.editorManager = null;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdEl0ZW0uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsaXN0SXRlbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFPLFNBQVMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUVqRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN2RixPQUFPLHdCQUF3QixDQUFDO0FBQ2hDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUMvQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNwRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFJMUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDNUQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFdkUsTUFBTSxPQUFPLHFCQUFzQixTQUFRLFNBQVM7SUFzQm5ELFlBQ1MsSUFBVSxFQUNWLFFBQWdCLEVBQ2hCLEdBQVEsRUFDUixNQUE2QjtRQUVyQyxLQUFLLEVBQUUsQ0FBQztRQUxBLFNBQUksR0FBSixJQUFJLENBQU07UUFDVixhQUFRLEdBQVIsUUFBUSxDQUFRO1FBQ2hCLFFBQUcsR0FBSCxHQUFHLENBQUs7UUFDUixXQUFNLEdBQU4sTUFBTSxDQUF1QjtRQUlyQyxJQUFJLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQyxLQUFLLEVBQUU7WUFDOUIsR0FBRyxFQUFFLFdBQVc7WUFDaEIsSUFBSSxFQUFFLEVBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFDO1NBQ3BDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7UUFFckMsaURBQWlEO1FBQ2pELElBQUksQ0FBQyxxQkFBcUIs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UyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUMxQztJQUNGLENBQUM7SUFFRCxRQUFROztRQUNQLDREQUE0RDtRQUM1RCxJQUNDLE1BQUEscUJBQXFCLENBQUMsYUFBYSwwQ0FBRSxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFDakU7WUFDRCxxQkFBcUIsQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDaEU7UUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ3ZCLENBQUM7O0FBMzJCRCwwREFBMEQ7QUFDM0MsbUNBQWEsR0FBK0IsSUFBSSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwLCBDb21wb25lbnQsIE1lbnUsIHNldEljb24sIEtleW1hcCB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBUYXNrIH0gZnJvbSBcIkAvdHlwZXMvdGFza1wiO1xyXG5pbXBvcnQgeyBNYXJrZG93blJlbmRlcmVyQ29tcG9uZW50IH0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9yZW5kZXJlcnMvTWFya2Rvd25SZW5kZXJlclwiO1xyXG5pbXBvcnQgXCJAL3N0eWxlcy90YXNrLWxpc3QuY3NzXCI7XHJcbmltcG9ydCB7IGNyZWF0ZVRhc2tDaGVja2JveCB9IGZyb20gXCIuL2RldGFpbHNcIjtcclxuaW1wb3J0IHsgZ2V0UmVsYXRpdmVUaW1lU3RyaW5nIH0gZnJvbSBcIkAvdXRpbHMvZGF0ZS9kYXRlLWZvcm1hdHRlclwiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7IFRhc2tQcm9ncmVzc0JhclNldHRpbmdzIH0gZnJvbSBcIkAvY29tbW9uL3NldHRpbmctZGVmaW5pdGlvblwiO1xyXG5pbXBvcnQgeyBJbmxpbmVFZGl0b3IsIElubGluZUVkaXRvck9wdGlvbnMgfSBmcm9tIFwiLi9JbmxpbmVFZGl0b3JcIjtcclxuaW1wb3J0IHsgSW5saW5lRWRpdG9yTWFuYWdlciB9IGZyb20gXCIuL0lubGluZUVkaXRvck1hbmFnZXJcIjtcclxuaW1wb3J0IHsgc2FuaXRpemVQcmlvcml0eUZvckNsYXNzIH0gZnJvbSBcIkAvdXRpbHMvdGFzay9wcmlvcml0eS11dGlsc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFRhc2tMaXN0SXRlbUNvbXBvbmVudCBleHRlbmRzIENvbXBvbmVudCB7XHJcblx0cHVibGljIGVsZW1lbnQ6IEhUTUxFbGVtZW50O1xyXG5cclxuXHQvLyBFdmVudHNcclxuXHRwdWJsaWMgb25UYXNrU2VsZWN0ZWQ6ICh0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdHB1YmxpYyBvblRhc2tDb21wbGV0ZWQ6ICh0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdHB1YmxpYyBvblRhc2tVcGRhdGU6ICh0YXNrOiBUYXNrLCB1cGRhdGVkVGFzazogVGFzaykgPT4gUHJvbWlzZTx2b2lkPjtcclxuXHJcblx0cHVibGljIG9uVGFza0NvbnRleHRNZW51OiAoZXZlbnQ6IE1vdXNlRXZlbnQsIHRhc2s6IFRhc2spID0+IHZvaWQ7XHJcblxyXG5cdHByaXZhdGUgbWFya2Rvd25SZW5kZXJlcjogTWFya2Rvd25SZW5kZXJlckNvbXBvbmVudDtcclxuXHRwcml2YXRlIGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIGNvbnRlbnRFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBjb250ZW50TWV0YWRhdGFDb250YWluZXI6IEhUTUxFbGVtZW50O1xyXG5cclxuXHRwcml2YXRlIG1ldGFkYXRhRWw6IEhUTUxFbGVtZW50O1xyXG5cclxuXHRwcml2YXRlIHNldHRpbmdzOiBUYXNrUHJvZ3Jlc3NCYXJTZXR0aW5ncztcclxuXHJcblx0Ly8gVXNlIHNoYXJlZCBlZGl0b3IgbWFuYWdlciBpbnN0ZWFkIG9mIGluZGl2aWR1YWwgZWRpdG9yc1xyXG5cdHByaXZhdGUgc3RhdGljIGVkaXRvck1hbmFnZXI6IElubGluZUVkaXRvck1hbmFnZXIgfCBudWxsID0gbnVsbDtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwcml2YXRlIHRhc2s6IFRhc2ssXHJcblx0XHRwcml2YXRlIHZpZXdNb2RlOiBzdHJpbmcsXHJcblx0XHRwcml2YXRlIGFwcDogQXBwLFxyXG5cdFx0cHJpdmF0ZSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpblxyXG5cdCkge1xyXG5cdFx0c3VwZXIoKTtcclxuXHJcblx0XHR0aGlzLmVsZW1lbnQgPSBjcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdGNsczogXCJ0YXNrLWl0ZW1cIixcclxuXHRcdFx0YXR0cjoge1wiZGF0YS10YXNrLWlkXCI6IHRoaXMudGFzay5pZH0sXHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLnNldHRpbmdzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3M7XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBzaGFyZWQgZWRpdG9yIG1hbmFnZXIgaWYgbm90IGV4aXN0c1xyXG5cdFx0aWYgKCFUYXNrTGlzdEl0ZW1Db21wb25lbnQuZWRpdG9yTWFuYWdlcikge1xyXG5cdFx0XHRUYXNrTGlzdEl0ZW1Db21wb25lbnQuZWRpdG9yTWFuYWdlciA9IG5ldyBJbmxpbmVFZGl0b3JNYW5hZ2VyKFxyXG5cdFx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgdGhlIGlubGluZSBlZGl0b3IgZnJvbSB0aGUgc2hhcmVkIG1hbmFnZXIgd2hlbiBuZWVkZWRcclxuXHQgKi9cclxuXHRwcml2YXRlIGdldElubGluZUVkaXRvcigpOiBJbmxpbmVFZGl0b3Ige1xyXG5cdFx0Y29uc3QgZWRpdG9yT3B0aW9uczogSW5saW5lRWRpdG9yT3B0aW9ucyA9IHtcclxuXHRcdFx0b25UYXNrVXBkYXRlOiBhc3luYyAob3JpZ2luYWxUYXNrOiBUYXNrLCB1cGRhdGVkVGFzazogVGFzaykgPT4ge1xyXG5cdFx0XHRcdGlmICh0aGlzLm9uVGFza1VwZGF0ZSkge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2cob3JpZ2luYWxUYXNrLmNvbnRlbnQsIHVwZGF0ZWRUYXNrLmNvbnRlbnQpO1xyXG5cdFx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdFx0YXdhaXQgdGhpcy5vblRhc2tVcGRhdGUob3JpZ2luYWxUYXNrLCB1cGRhdGVkVGFzayk7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRcdFwibGlzdEl0ZW0gb25UYXNrVXBkYXRlIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHlcIlxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHQvLyBEb24ndCB1cGRhdGUgdGFzayByZWZlcmVuY2UgaGVyZSAtIGxldCBvbkNvbnRlbnRFZGl0RmluaXNoZWQgaGFuZGxlIGl0XHJcblx0XHRcdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmVycm9yKFwiRXJyb3IgaW4gbGlzdEl0ZW0gb25UYXNrVXBkYXRlOlwiLCBlcnJvcik7XHJcblx0XHRcdFx0XHRcdHRocm93IGVycm9yOyAvLyBSZS10aHJvdyB0byBsZXQgdGhlIElubGluZUVkaXRvciBoYW5kbGUgaXRcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0Y29uc29sZS53YXJuKFwiTm8gb25UYXNrVXBkYXRlIGNhbGxiYWNrIGF2YWlsYWJsZVwiKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sXHJcblx0XHRcdG9uQ29udGVudEVkaXRGaW5pc2hlZDogKFxyXG5cdFx0XHRcdHRhcmdldEVsOiBIVE1MRWxlbWVudCxcclxuXHRcdFx0XHR1cGRhdGVkVGFzazogVGFza1xyXG5cdFx0XHQpID0+IHtcclxuXHRcdFx0XHQvLyBVcGRhdGUgdGhlIHRhc2sgcmVmZXJlbmNlIHdpdGggdGhlIHNhdmVkIHRhc2tcclxuXHRcdFx0XHR0aGlzLnRhc2sgPSB1cGRhdGVkVGFzaztcclxuXHJcblx0XHRcdFx0Ly8gUmUtcmVuZGVyIHRoZSBtYXJrZG93biBjb250ZW50IGFmdGVyIGVkaXRpbmcgaXMgZmluaXNoZWRcclxuXHRcdFx0XHR0aGlzLnJlbmRlck1hcmtkb3duKCk7XHJcblxyXG5cdFx0XHRcdC8vIE5vdyBpdCdzIHNhZmUgdG8gdXBkYXRlIHRoZSBmdWxsIGRpc3BsYXlcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZVRhc2tEaXNwbGF5KCk7XHJcblxyXG5cdFx0XHRcdC8vIFJlbGVhc2UgdGhlIGVkaXRvciBmcm9tIHRoZSBtYW5hZ2VyXHJcblx0XHRcdFx0VGFza0xpc3RJdGVtQ29tcG9uZW50LmVkaXRvck1hbmFnZXI/LnJlbGVhc2VFZGl0b3IoXHJcblx0XHRcdFx0XHR0aGlzLnRhc2suaWRcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRvbk1ldGFkYXRhRWRpdEZpbmlzaGVkOiAoXHJcblx0XHRcdFx0dGFyZ2V0RWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0XHRcdHVwZGF0ZWRUYXNrOiBUYXNrLFxyXG5cdFx0XHRcdGZpZWxkVHlwZTogc3RyaW5nXHJcblx0XHRcdCkgPT4ge1xyXG5cdFx0XHRcdC8vIFVwZGF0ZSB0aGUgdGFzayByZWZlcmVuY2Ugd2l0aCB0aGUgc2F2ZWQgdGFza1xyXG5cdFx0XHRcdHRoaXMudGFzayA9IHVwZGF0ZWRUYXNrO1xyXG5cclxuXHRcdFx0XHQvLyBVcGRhdGUgdGhlIHRhc2sgZGlzcGxheSB0byByZWZsZWN0IG1ldGFkYXRhIGNoYW5nZXNcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZVRhc2tEaXNwbGF5KCk7XHJcblxyXG5cdFx0XHRcdC8vIFJlbGVhc2UgdGhlIGVkaXRvciBmcm9tIHRoZSBtYW5hZ2VyXHJcblx0XHRcdFx0VGFza0xpc3RJdGVtQ29tcG9uZW50LmVkaXRvck1hbmFnZXI/LnJlbGVhc2VFZGl0b3IoXHJcblx0XHRcdFx0XHR0aGlzLnRhc2suaWRcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHR1c2VFbWJlZGRlZEVkaXRvcjogdHJ1ZSwgLy8gRW5hYmxlIE9ic2lkaWFuJ3MgZW1iZWRkZWQgZWRpdG9yXHJcblx0XHR9O1xyXG5cclxuXHRcdHJldHVybiBUYXNrTGlzdEl0ZW1Db21wb25lbnQuZWRpdG9yTWFuYWdlciEuZ2V0RWRpdG9yKFxyXG5cdFx0XHR0aGlzLnRhc2ssXHJcblx0XHRcdGVkaXRvck9wdGlvbnNcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDaGVjayBpZiB0aGlzIHRhc2sgaXMgY3VycmVudGx5IGJlaW5nIGVkaXRlZFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgaXNDdXJyZW50bHlFZGl0aW5nKCk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIChcclxuXHRcdFx0VGFza0xpc3RJdGVtQ29tcG9uZW50LmVkaXRvck1hbmFnZXI/Lmhhc0FjdGl2ZUVkaXRvcihcclxuXHRcdFx0XHR0aGlzLnRhc2suaWRcclxuXHRcdFx0KSB8fCBmYWxzZVxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdG9ubG9hZCgpIHtcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudCh0aGlzLmVsZW1lbnQsIFwiY29udGV4dG1lbnVcIiwgKGV2ZW50KSA9PiB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiY29udGV4dG1lbnVcIiwgZXZlbnQsIHRoaXMudGFzayk7XHJcblx0XHRcdGlmICh0aGlzLm9uVGFza0NvbnRleHRNZW51KSB7XHJcblx0XHRcdFx0dGhpcy5vblRhc2tDb250ZXh0TWVudShldmVudCwgdGhpcy50YXNrKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5yZW5kZXJUYXNrSXRlbSgpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSByZW5kZXJUYXNrSXRlbSgpIHtcclxuXHRcdHRoaXMuZWxlbWVudC5lbXB0eSgpO1xyXG5cclxuXHRcdGlmICh0aGlzLnRhc2suY29tcGxldGVkKSB7XHJcblx0XHRcdHRoaXMuZWxlbWVudC5jbGFzc0xpc3QuYWRkKFwidGFzay1jb21wbGV0ZWRcIik7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVGFzayBjaGVja2JveCBmb3IgY29tcGxldGlvbiBzdGF0dXNcclxuXHRcdGNvbnN0IGNoZWNrYm94RWwgPSBjcmVhdGVFbChcclxuXHRcdFx0XCJkaXZcIixcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNsczogXCJ0YXNrLWNoZWNrYm94XCIsXHJcblx0XHRcdH0sXHJcblx0XHRcdChlbCkgPT4ge1xyXG5cdFx0XHRcdC8vIENyZWF0ZSBhIGNoZWNrYm94IGlucHV0IGVsZW1lbnRcclxuXHRcdFx0XHRjb25zdCBjaGVja2JveCA9IGNyZWF0ZVRhc2tDaGVja2JveChcclxuXHRcdFx0XHRcdHRoaXMudGFzay5zdGF0dXMsXHJcblx0XHRcdFx0XHR0aGlzLnRhc2ssXHJcblx0XHRcdFx0XHRlbFxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChjaGVja2JveCwgXCJjbGlja1wiLCAoZXZlbnQpID0+IHtcclxuXHRcdFx0XHRcdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cclxuXHRcdFx0XHRcdGlmICh0aGlzLm9uVGFza0NvbXBsZXRlZCkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLm9uVGFza0NvbXBsZXRlZCh0aGlzLnRhc2spO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdGlmICh0aGlzLnRhc2suc3RhdHVzID09PSBcIiBcIikge1xyXG5cdFx0XHRcdFx0XHRjaGVja2JveC5jaGVja2VkID0gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0Y2hlY2tib3guZGF0YXNldC50YXNrID0gXCJ4XCI7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblxyXG5cdFx0dGhpcy5lbGVtZW50LmFwcGVuZENoaWxkKGNoZWNrYm94RWwpO1xyXG5cdFx0dGhpcy5jb250YWluZXJFbCA9IHRoaXMuZWxlbWVudC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwidGFzay1pdGVtLWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGNvbnRlbnQtbWV0YWRhdGEgY29udGFpbmVyIGZvciBkeW5hbWljIGxheW91dFxyXG5cdFx0dGhpcy5jb250ZW50TWV0YWRhdGFDb250YWluZXIgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ0YXNrLWNvbnRlbnQtbWV0YWRhdGEtY29udGFpbmVyXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBUYXNrIGNvbnRlbnRcclxuXHRcdHRoaXMuY29udGVudEVsID0gdGhpcy5jb250ZW50TWV0YWRhdGFDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInRhc2staXRlbS1jb250ZW50XCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBNYWtlIGNvbnRlbnQgY2xpY2thYmxlIGZvciBlZGl0aW5nXHJcblx0XHR0aGlzLnJlZ2lzdGVyQ29udGVudENsaWNrSGFuZGxlcigpO1xyXG5cclxuXHRcdHRoaXMucmVuZGVyTWFya2Rvd24oKTtcclxuXHJcblx0XHR0aGlzLm1ldGFkYXRhRWwgPSB0aGlzLmNvbnRlbnRNZXRhZGF0YUNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwidGFzay1pdGVtLW1ldGFkYXRhXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLnJlbmRlck1ldGFkYXRhKCk7XHJcblxyXG5cdFx0Ly8gUHJpb3JpdHkgaW5kaWNhdG9yIGlmIGF2YWlsYWJsZVxyXG5cdFx0aWYgKHRoaXMudGFzay5tZXRhZGF0YS5wcmlvcml0eSkge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcInByaW9yaXR5XCIsIHRoaXMudGFzay5tZXRhZGF0YS5wcmlvcml0eSk7XHJcblxyXG5cdFx0XHQvLyBDb252ZXJ0IHByaW9yaXR5IHRvIG51bWVyaWMgdmFsdWVcclxuXHRcdFx0bGV0IG51bWVyaWNQcmlvcml0eTogbnVtYmVyO1xyXG5cdFx0XHRpZiAodHlwZW9mIHRoaXMudGFzay5tZXRhZGF0YS5wcmlvcml0eSA9PT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHRcdHN3aXRjaCAoKHRoaXMudGFzay5tZXRhZGF0YS5wcmlvcml0eSBhcyBzdHJpbmcpLnRvTG93ZXJDYXNlKCkpIHtcclxuXHRcdFx0XHRcdGNhc2UgXCJsb3dcIjpcclxuXHRcdFx0XHRcdFx0bnVtZXJpY1ByaW9yaXR5ID0gMTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIFwibWVkaXVtXCI6XHJcblx0XHRcdFx0XHRcdG51bWVyaWNQcmlvcml0eSA9IDI7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcImhpZ2hcIjpcclxuXHRcdFx0XHRcdFx0bnVtZXJpY1ByaW9yaXR5ID0gMztcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdFx0XHRudW1lcmljUHJpb3JpdHkgPVxyXG5cdFx0XHRcdFx0XHRcdHBhcnNlSW50KHRoaXMudGFzay5tZXRhZGF0YS5wcmlvcml0eSkgfHwgMTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdG51bWVyaWNQcmlvcml0eSA9IHRoaXMudGFzay5tZXRhZGF0YS5wcmlvcml0eTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3Qgc2FuaXRpemVkUHJpb3JpdHkgPSBzYW5pdGl6ZVByaW9yaXR5Rm9yQ2xhc3MobnVtZXJpY1ByaW9yaXR5KTtcclxuXHRcdFx0Y29uc3QgY2xhc3NlcyA9IFtcInRhc2stcHJpb3JpdHlcIl07XHJcblx0XHRcdGlmIChzYW5pdGl6ZWRQcmlvcml0eSkge1xyXG5cdFx0XHRcdGNsYXNzZXMucHVzaChgcHJpb3JpdHktJHtzYW5pdGl6ZWRQcmlvcml0eX1gKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRjb25zdCBwcmlvcml0eUVsID0gY3JlYXRlRGl2KHtjbHM6IGNsYXNzZXN9KTtcclxuXHJcblx0XHRcdC8vIFByaW9yaXR5IGljb24gYmFzZWQgb24gbGV2ZWxcclxuXHRcdFx0bGV0IGljb24gPSBcIuKAolwiO1xyXG5cdFx0XHRpY29uID0gXCIhXCIucmVwZWF0KG51bWVyaWNQcmlvcml0eSk7XHJcblxyXG5cdFx0XHRwcmlvcml0eUVsLnRleHRDb250ZW50ID0gaWNvbjtcclxuXHRcdFx0dGhpcy5lbGVtZW50LmFwcGVuZENoaWxkKHByaW9yaXR5RWwpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENsaWNrIGhhbmRsZXIgdG8gc2VsZWN0IHRhc2tcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudCh0aGlzLmVsZW1lbnQsIFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRpZiAodGhpcy5vblRhc2tTZWxlY3RlZCkge1xyXG5cdFx0XHRcdHRoaXMub25UYXNrU2VsZWN0ZWQodGhpcy50YXNrKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbmRlck1ldGFkYXRhKCkge1xyXG5cdFx0dGhpcy5tZXRhZGF0YUVsLmVtcHR5KCk7XHJcblxyXG5cdFx0Ly8gRm9yIGNhbmNlbGxlZCB0YXNrcywgc2hvdyBjYW5jZWxsZWQgZGF0ZSAoaW5kZXBlbmRlbnQgb2YgY29tcGxldGlvbiBzdGF0dXMpXHJcblx0XHRpZiAodGhpcy50YXNrLm1ldGFkYXRhLmNhbmNlbGxlZERhdGUpIHtcclxuXHRcdFx0dGhpcy5yZW5kZXJEYXRlTWV0YWRhdGEoXHJcblx0XHRcdFx0XCJjYW5jZWxsZWRcIixcclxuXHRcdFx0XHR0aGlzLnRhc2subWV0YWRhdGEuY2FuY2VsbGVkRGF0ZVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIERpc3BsYXkgZGF0ZXMgYmFzZWQgb24gdGFzayBjb21wbGV0aW9uIHN0YXR1c1xyXG5cdFx0aWYgKCF0aGlzLnRhc2suY29tcGxldGVkKSB7XHJcblx0XHRcdC8vIEZvciBpbmNvbXBsZXRlIHRhc2tzLCBzaG93IGR1ZSwgc2NoZWR1bGVkLCBhbmQgc3RhcnQgZGF0ZXNcclxuXHJcblx0XHRcdC8vIER1ZSBkYXRlIGlmIGF2YWlsYWJsZVxyXG5cdFx0XHRpZiAodGhpcy50YXNrLm1ldGFkYXRhLmR1ZURhdGUpIHtcclxuXHRcdFx0XHR0aGlzLnJlbmRlckRhdGVNZXRhZGF0YShcImR1ZVwiLCB0aGlzLnRhc2subWV0YWRhdGEuZHVlRGF0ZSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFNjaGVkdWxlZCBkYXRlIGlmIGF2YWlsYWJsZVxyXG5cdFx0XHRpZiAodGhpcy50YXNrLm1ldGFkYXRhLnNjaGVkdWxlZERhdGUpIHtcclxuXHRcdFx0XHR0aGlzLnJlbmRlckRhdGVNZXRhZGF0YShcclxuXHRcdFx0XHRcdFwic2NoZWR1bGVkXCIsXHJcblx0XHRcdFx0XHR0aGlzLnRhc2subWV0YWRhdGEuc2NoZWR1bGVkRGF0ZVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFN0YXJ0IGRhdGUgaWYgYXZhaWxhYmxlXHJcblx0XHRcdGlmICh0aGlzLnRhc2subWV0YWRhdGEuc3RhcnREYXRlKSB7XHJcblx0XHRcdFx0dGhpcy5yZW5kZXJEYXRlTWV0YWRhdGEoXCJzdGFydFwiLCB0aGlzLnRhc2subWV0YWRhdGEuc3RhcnREYXRlKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gUmVjdXJyZW5jZSBpZiBhdmFpbGFibGVcclxuXHRcdFx0aWYgKHRoaXMudGFzay5tZXRhZGF0YS5yZWN1cnJlbmNlKSB7XHJcblx0XHRcdFx0dGhpcy5yZW5kZXJSZWN1cnJlbmNlTWV0YWRhdGEoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gRm9yIGNvbXBsZXRlZCB0YXNrcywgc2hvdyBjb21wbGV0aW9uIGRhdGVcclxuXHRcdFx0aWYgKHRoaXMudGFzay5tZXRhZGF0YS5jb21wbGV0ZWREYXRlKSB7XHJcblx0XHRcdFx0dGhpcy5yZW5kZXJEYXRlTWV0YWRhdGEoXHJcblx0XHRcdFx0XHRcImNvbXBsZXRlZFwiLFxyXG5cdFx0XHRcdFx0dGhpcy50YXNrLm1ldGFkYXRhLmNvbXBsZXRlZERhdGVcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBDcmVhdGVkIGRhdGUgaWYgYXZhaWxhYmxlXHJcblx0XHRcdGlmICh0aGlzLnRhc2subWV0YWRhdGEuY3JlYXRlZERhdGUpIHtcclxuXHRcdFx0XHR0aGlzLnJlbmRlckRhdGVNZXRhZGF0YShcclxuXHRcdFx0XHRcdFwiY3JlYXRlZFwiLFxyXG5cdFx0XHRcdFx0dGhpcy50YXNrLm1ldGFkYXRhLmNyZWF0ZWREYXRlXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFByb2plY3QgYmFkZ2UgaWYgYXZhaWxhYmxlIGFuZCBub3QgaW4gcHJvamVjdCB2aWV3XHJcblx0XHRpZiAoXHJcblx0XHRcdCh0aGlzLnRhc2subWV0YWRhdGEucHJvamVjdCB8fCB0aGlzLnRhc2subWV0YWRhdGEudGdQcm9qZWN0KSAmJlxyXG5cdFx0XHR0aGlzLnZpZXdNb2RlICE9PSBcInByb2plY3RzXCJcclxuXHRcdCkge1xyXG5cdFx0XHR0aGlzLnJlbmRlclByb2plY3RNZXRhZGF0YSgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFRhZ3MgaWYgYXZhaWxhYmxlXHJcblx0XHRpZiAodGhpcy50YXNrLm1ldGFkYXRhLnRhZ3MgJiYgdGhpcy50YXNrLm1ldGFkYXRhLnRhZ3MubGVuZ3RoID4gMCkge1xyXG5cdFx0XHR0aGlzLnJlbmRlclRhZ3NNZXRhZGF0YSgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIE9uQ29tcGxldGlvbiBpZiBhdmFpbGFibGVcclxuXHRcdGlmICh0aGlzLnRhc2subWV0YWRhdGEub25Db21wbGV0aW9uKSB7XHJcblx0XHRcdHRoaXMucmVuZGVyT25Db21wbGV0aW9uTWV0YWRhdGEoKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBEZXBlbmRzT24gaWYgYXZhaWxhYmxlXHJcblx0XHRpZiAoXHJcblx0XHRcdHRoaXMudGFzay5tZXRhZGF0YS5kZXBlbmRzT24gJiZcclxuXHRcdFx0dGhpcy50YXNrLm1ldGFkYXRhLmRlcGVuZHNPbi5sZW5ndGggPiAwXHJcblx0XHQpIHtcclxuXHRcdFx0dGhpcy5yZW5kZXJEZXBlbmRzT25NZXRhZGF0YSgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIElEIGlmIGF2YWlsYWJsZVxyXG5cdFx0aWYgKHRoaXMudGFzay5tZXRhZGF0YS5pZCkge1xyXG5cdFx0XHR0aGlzLnJlbmRlcklkTWV0YWRhdGEoKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGQgbWV0YWRhdGEgYnV0dG9uIGZvciBhZGRpbmcgbmV3IG1ldGFkYXRhXHJcblx0XHR0aGlzLnJlbmRlckFkZE1ldGFkYXRhQnV0dG9uKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbmRlckRhdGVNZXRhZGF0YShcclxuXHRcdHR5cGU6XHJcblx0XHRcdHwgXCJkdWVcIlxyXG5cdFx0XHR8IFwic2NoZWR1bGVkXCJcclxuXHRcdFx0fCBcInN0YXJ0XCJcclxuXHRcdFx0fCBcImNvbXBsZXRlZFwiXHJcblx0XHRcdHwgXCJjYW5jZWxsZWRcIlxyXG5cdFx0XHR8IFwiY3JlYXRlZFwiLFxyXG5cdFx0ZGF0ZVZhbHVlOiBudW1iZXJcclxuXHQpIHtcclxuXHRcdGNvbnN0IGRhdGVFbCA9IHRoaXMubWV0YWRhdGFFbC5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdGNsczogW1widGFzay1kYXRlXCIsIGB0YXNrLSR7dHlwZX0tZGF0ZWBdLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgZGF0ZSA9IG5ldyBEYXRlKGRhdGVWYWx1ZSk7XHJcblx0XHRsZXQgZGF0ZVRleHQgPSBcIlwiO1xyXG5cdFx0bGV0IGNzc0NsYXNzID0gXCJcIjtcclxuXHJcblx0XHRpZiAodHlwZSA9PT0gXCJkdWVcIikge1xyXG5cdFx0XHRjb25zdCB0b2RheSA9IG5ldyBEYXRlKCk7XHJcblx0XHRcdHRvZGF5LnNldEhvdXJzKDAsIDAsIDAsIDApO1xyXG5cclxuXHRcdFx0Y29uc3QgdG9tb3Jyb3cgPSBuZXcgRGF0ZSh0b2RheSk7XHJcblx0XHRcdHRvbW9ycm93LnNldERhdGUodG9tb3Jyb3cuZ2V0RGF0ZSgpICsgMSk7XHJcblxyXG5cdFx0XHQvLyBGb3JtYXQgZGF0ZVxyXG5cdFx0XHRpZiAoZGF0ZS5nZXRUaW1lKCkgPCB0b2RheS5nZXRUaW1lKCkpIHtcclxuXHRcdFx0XHRkYXRlVGV4dCA9XHJcblx0XHRcdFx0XHR0KFwiT3ZlcmR1ZVwiKSArXHJcblx0XHRcdFx0XHQodGhpcy5zZXR0aW5ncy51c2VSZWxhdGl2ZVRpbWVGb3JEYXRlXHJcblx0XHRcdFx0XHRcdD8gXCIgfCBcIiArIGdldFJlbGF0aXZlVGltZVN0cmluZyhkYXRlKVxyXG5cdFx0XHRcdFx0XHQ6IFwiXCIpO1xyXG5cdFx0XHRcdGNzc0NsYXNzID0gXCJ0YXNrLW92ZXJkdWVcIjtcclxuXHRcdFx0fSBlbHNlIGlmIChkYXRlLmdldFRpbWUoKSA9PT0gdG9kYXkuZ2V0VGltZSgpKSB7XHJcblx0XHRcdFx0ZGF0ZVRleHQgPSB0aGlzLnNldHRpbmdzLnVzZVJlbGF0aXZlVGltZUZvckRhdGVcclxuXHRcdFx0XHRcdD8gZ2V0UmVsYXRpdmVUaW1lU3RyaW5nKGRhdGUpIHx8IFwiVG9kYXlcIlxyXG5cdFx0XHRcdFx0OiBcIlRvZGF5XCI7XHJcblx0XHRcdFx0Y3NzQ2xhc3MgPSBcInRhc2stZHVlLXRvZGF5XCI7XHJcblx0XHRcdH0gZWxzZSBpZiAoZGF0ZS5nZXRUaW1lKCkgPT09IHRvbW9ycm93LmdldFRpbWUoKSkge1xyXG5cdFx0XHRcdGRhdGVUZXh0ID0gdGhpcy5zZXR0aW5ncy51c2VSZWxhdGl2ZVRpbWVGb3JEYXRlXHJcblx0XHRcdFx0XHQ/IGdldFJlbGF0aXZlVGltZVN0cmluZyhkYXRlKSB8fCBcIlRvbW9ycm93XCJcclxuXHRcdFx0XHRcdDogXCJUb21vcnJvd1wiO1xyXG5cdFx0XHRcdGNzc0NsYXNzID0gXCJ0YXNrLWR1ZS10b21vcnJvd1wiO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGRhdGVUZXh0ID0gZGF0ZS50b0xvY2FsZURhdGVTdHJpbmcoXCJlbi1VU1wiLCB7XHJcblx0XHRcdFx0XHR5ZWFyOiBcIm51bWVyaWNcIixcclxuXHRcdFx0XHRcdG1vbnRoOiBcImxvbmdcIixcclxuXHRcdFx0XHRcdGRheTogXCJudW1lcmljXCIsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGRhdGVUZXh0ID0gdGhpcy5zZXR0aW5ncy51c2VSZWxhdGl2ZVRpbWVGb3JEYXRlXHJcblx0XHRcdFx0PyBnZXRSZWxhdGl2ZVRpbWVTdHJpbmcoZGF0ZSlcclxuXHRcdFx0XHQ6IGRhdGUudG9Mb2NhbGVEYXRlU3RyaW5nKFwiZW4tVVNcIiwge1xyXG5cdFx0XHRcdFx0eWVhcjogXCJudW1lcmljXCIsXHJcblx0XHRcdFx0XHRtb250aDogXCJsb25nXCIsXHJcblx0XHRcdFx0XHRkYXk6IFwibnVtZXJpY1wiLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChjc3NDbGFzcykge1xyXG5cdFx0XHRkYXRlRWwuY2xhc3NMaXN0LmFkZChjc3NDbGFzcyk7XHJcblx0XHR9XHJcblxyXG5cdFx0ZGF0ZUVsLnRleHRDb250ZW50ID0gZGF0ZVRleHQ7XHJcblx0XHRkYXRlRWwuc2V0QXR0cmlidXRlKFwiYXJpYS1sYWJlbFwiLCBkYXRlLnRvTG9jYWxlRGF0ZVN0cmluZygpKTtcclxuXHJcblx0XHQvLyBNYWtlIGRhdGUgY2xpY2thYmxlIGZvciBlZGl0aW5nIG9ubHkgaWYgaW5saW5lIGVkaXRvciBpcyBlbmFibGVkXHJcblx0XHRpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuZW5hYmxlSW5saW5lRWRpdG9yKSB7XHJcblx0XHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChkYXRlRWwsIFwiY2xpY2tcIiwgKGUpID0+IHtcclxuXHRcdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cdFx0XHRcdGlmICghdGhpcy5pc0N1cnJlbnRseUVkaXRpbmcoKSkge1xyXG5cdFx0XHRcdFx0Y29uc3QgZGF0ZVN0cmluZyA9IHRoaXMuZm9ybWF0RGF0ZUZvcklucHV0KGRhdGUpO1xyXG5cdFx0XHRcdFx0Y29uc3QgZmllbGRUeXBlID1cclxuXHRcdFx0XHRcdFx0dHlwZSA9PT0gXCJkdWVcIlxyXG5cdFx0XHRcdFx0XHRcdD8gXCJkdWVEYXRlXCJcclxuXHRcdFx0XHRcdFx0XHQ6IHR5cGUgPT09IFwic2NoZWR1bGVkXCJcclxuXHRcdFx0XHRcdFx0XHRcdD8gXCJzY2hlZHVsZWREYXRlXCJcclxuXHRcdFx0XHRcdFx0XHRcdDogdHlwZSA9PT0gXCJzdGFydFwiXHJcblx0XHRcdFx0XHRcdFx0XHRcdD8gXCJzdGFydERhdGVcIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ6IHR5cGUgPT09IFwiY2FuY2VsbGVkXCJcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQ/IFwiY2FuY2VsbGVkRGF0ZVwiXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0OiB0eXBlID09PSBcImNvbXBsZXRlZFwiXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQ/IFwiY29tcGxldGVkRGF0ZVwiXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQ6IG51bGw7XHJcblxyXG5cdFx0XHRcdFx0aWYgKGZpZWxkVHlwZSkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLmdldElubGluZUVkaXRvcigpLnNob3dNZXRhZGF0YUVkaXRvcihcclxuXHRcdFx0XHRcdFx0XHRkYXRlRWwsXHJcblx0XHRcdFx0XHRcdFx0ZmllbGRUeXBlLFxyXG5cdFx0XHRcdFx0XHRcdGRhdGVTdHJpbmdcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSByZW5kZXJQcm9qZWN0TWV0YWRhdGEoKSB7XHJcblx0XHQvLyBEZXRlcm1pbmUgd2hpY2ggcHJvamVjdCB0byBkaXNwbGF5OiBvcmlnaW5hbCBwcm9qZWN0IG9yIHRnUHJvamVjdFxyXG5cdFx0bGV0IHByb2plY3ROYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcblx0XHRsZXQgaXNSZWFkb25seSA9IGZhbHNlO1xyXG5cclxuXHRcdGlmICh0aGlzLnRhc2subWV0YWRhdGEucHJvamVjdCkge1xyXG5cdFx0XHQvLyBVc2Ugb3JpZ2luYWwgcHJvamVjdCBpZiBhdmFpbGFibGVcclxuXHRcdFx0cHJvamVjdE5hbWUgPSB0aGlzLnRhc2subWV0YWRhdGEucHJvamVjdDtcclxuXHRcdH0gZWxzZSBpZiAodGhpcy50YXNrLm1ldGFkYXRhLnRnUHJvamVjdCkge1xyXG5cdFx0XHQvLyBVc2UgdGdQcm9qZWN0IGFzIGZhbGxiYWNrXHJcblx0XHRcdHByb2plY3ROYW1lID0gdGhpcy50YXNrLm1ldGFkYXRhLnRnUHJvamVjdC5uYW1lO1xyXG5cdFx0XHRpc1JlYWRvbmx5ID0gdGhpcy50YXNrLm1ldGFkYXRhLnRnUHJvamVjdC5yZWFkb25seSB8fCBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoIXByb2plY3ROYW1lKSByZXR1cm47XHJcblxyXG5cdFx0Y29uc3QgcHJvamVjdEVsID0gdGhpcy5tZXRhZGF0YUVsLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0Y2xzOiBcInRhc2stcHJvamVjdFwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQWRkIGEgdmlzdWFsIGluZGljYXRvciBmb3IgdGdQcm9qZWN0XHJcblx0XHRpZiAoIXRoaXMudGFzay5tZXRhZGF0YS5wcm9qZWN0ICYmIHRoaXMudGFzay5tZXRhZGF0YS50Z1Byb2plY3QpIHtcclxuXHRcdFx0cHJvamVjdEVsLmFkZENsYXNzKFwidGFzay1wcm9qZWN0LXRnXCIpO1xyXG5cdFx0XHRwcm9qZWN0RWwudGl0bGUgPSBgUHJvamVjdCBmcm9tICR7XHJcblx0XHRcdFx0dGhpcy50YXNrLm1ldGFkYXRhLnRnUHJvamVjdC50eXBlXHJcblx0XHRcdH06ICR7dGhpcy50YXNrLm1ldGFkYXRhLnRnUHJvamVjdC5zb3VyY2UgfHwgXCJcIn1gO1xyXG5cdFx0fVxyXG5cclxuXHRcdHByb2plY3RFbC50ZXh0Q29udGVudCA9IHByb2plY3ROYW1lLnNwbGl0KFwiL1wiKS5wb3AoKSB8fCBwcm9qZWN0TmFtZTtcclxuXHJcblx0XHQvLyBNYWtlIHByb2plY3QgY2xpY2thYmxlIGZvciBlZGl0aW5nIG9ubHkgaWYgaW5saW5lIGVkaXRvciBpcyBlbmFibGVkIGFuZCBub3QgcmVhZG9ubHlcclxuXHRcdGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbmFibGVJbmxpbmVFZGl0b3IgJiYgIWlzUmVhZG9ubHkpIHtcclxuXHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KHByb2plY3RFbCwgXCJjbGlja1wiLCAoZSkgPT4ge1xyXG5cdFx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblx0XHRcdFx0aWYgKCF0aGlzLmlzQ3VycmVudGx5RWRpdGluZygpKSB7XHJcblx0XHRcdFx0XHR0aGlzLmdldElubGluZUVkaXRvcigpLnNob3dNZXRhZGF0YUVkaXRvcihcclxuXHRcdFx0XHRcdFx0cHJvamVjdEVsLFxyXG5cdFx0XHRcdFx0XHRcInByb2plY3RcIixcclxuXHRcdFx0XHRcdFx0dGhpcy50YXNrLm1ldGFkYXRhLnByb2plY3QgfHwgXCJcIlxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSByZW5kZXJUYWdzTWV0YWRhdGEoKSB7XHJcblx0XHRjb25zdCB0YWdzQ29udGFpbmVyID0gdGhpcy5tZXRhZGF0YUVsLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0Y2xzOiBcInRhc2stdGFncy1jb250YWluZXJcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMudGFzay5tZXRhZGF0YS50YWdzXHJcblx0XHRcdC5maWx0ZXIoKHRhZykgPT4gIXRhZy5zdGFydHNXaXRoKFwiI3Byb2plY3RcIikpXHJcblx0XHRcdC5mb3JFYWNoKCh0YWcpID0+IHtcclxuXHRcdFx0XHRjb25zdCB0YWdFbCA9IHRhZ3NDb250YWluZXIuY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdFx0XHRcdGNsczogXCJ0YXNrLXRhZ1wiLFxyXG5cdFx0XHRcdFx0dGV4dDogdGFnLnN0YXJ0c1dpdGgoXCIjXCIpID8gdGFnIDogYCMke3RhZ31gLFxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyBNYWtlIHRhZyBjbGlja2FibGUgZm9yIGVkaXRpbmcgb25seSBpZiBpbmxpbmUgZWRpdG9yIGlzIGVuYWJsZWRcclxuXHRcdFx0XHRpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuZW5hYmxlSW5saW5lRWRpdG9yKSB7XHJcblx0XHRcdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQodGFnRWwsIFwiY2xpY2tcIiwgKGUpID0+IHtcclxuXHRcdFx0XHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHRcdFx0XHRcdFx0aWYgKCF0aGlzLmlzQ3VycmVudGx5RWRpdGluZygpKSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgdGFnc1N0cmluZyA9XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnRhc2subWV0YWRhdGEudGFncz8uam9pbihcIiwgXCIpIHx8IFwiXCI7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5nZXRJbmxpbmVFZGl0b3IoKS5zaG93TWV0YWRhdGFFZGl0b3IoXHJcblx0XHRcdFx0XHRcdFx0XHR0YWdzQ29udGFpbmVyLFxyXG5cdFx0XHRcdFx0XHRcdFx0XCJ0YWdzXCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0YWdzU3RyaW5nXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyUmVjdXJyZW5jZU1ldGFkYXRhKCkge1xyXG5cdFx0Y29uc3QgcmVjdXJyZW5jZUVsID0gdGhpcy5tZXRhZGF0YUVsLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0Y2xzOiBcInRhc2stZGF0ZSB0YXNrLXJlY3VycmVuY2VcIixcclxuXHRcdH0pO1xyXG5cdFx0cmVjdXJyZW5jZUVsLnRleHRDb250ZW50ID0gdGhpcy50YXNrLm1ldGFkYXRhLnJlY3VycmVuY2UgfHwgXCJcIjtcclxuXHJcblx0XHQvLyBNYWtlIHJlY3VycmVuY2UgY2xpY2thYmxlIGZvciBlZGl0aW5nIG9ubHkgaWYgaW5saW5lIGVkaXRvciBpcyBlbmFibGVkXHJcblx0XHRpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuZW5hYmxlSW5saW5lRWRpdG9yKSB7XHJcblx0XHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChyZWN1cnJlbmNlRWwsIFwiY2xpY2tcIiwgKGUpID0+IHtcclxuXHRcdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cdFx0XHRcdGlmICghdGhpcy5pc0N1cnJlbnRseUVkaXRpbmcoKSkge1xyXG5cdFx0XHRcdFx0dGhpcy5nZXRJbmxpbmVFZGl0b3IoKS5zaG93TWV0YWRhdGFFZGl0b3IoXHJcblx0XHRcdFx0XHRcdHJlY3VycmVuY2VFbCxcclxuXHRcdFx0XHRcdFx0XCJyZWN1cnJlbmNlXCIsXHJcblx0XHRcdFx0XHRcdHRoaXMudGFzay5tZXRhZGF0YS5yZWN1cnJlbmNlIHx8IFwiXCJcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyT25Db21wbGV0aW9uTWV0YWRhdGEoKSB7XHJcblx0XHRjb25zdCBvbkNvbXBsZXRpb25FbCA9IHRoaXMubWV0YWRhdGFFbC5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdGNsczogXCJ0YXNrLW9uY29tcGxldGlvblwiLFxyXG5cdFx0fSk7XHJcblx0XHRvbkNvbXBsZXRpb25FbC50ZXh0Q29udGVudCA9IGDwn4+BICR7dGhpcy50YXNrLm1ldGFkYXRhLm9uQ29tcGxldGlvbn1gO1xyXG5cclxuXHRcdC8vIE1ha2Ugb25Db21wbGV0aW9uIGNsaWNrYWJsZSBmb3IgZWRpdGluZyBvbmx5IGlmIGlubGluZSBlZGl0b3IgaXMgZW5hYmxlZFxyXG5cdFx0aWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmVuYWJsZUlubGluZUVkaXRvcikge1xyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQob25Db21wbGV0aW9uRWwsIFwiY2xpY2tcIiwgKGUpID0+IHtcclxuXHRcdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cdFx0XHRcdGlmICghdGhpcy5pc0N1cnJlbnRseUVkaXRpbmcoKSkge1xyXG5cdFx0XHRcdFx0dGhpcy5nZXRJbmxpbmVFZGl0b3IoKS5zaG93TWV0YWRhdGFFZGl0b3IoXHJcblx0XHRcdFx0XHRcdG9uQ29tcGxldGlvbkVsLFxyXG5cdFx0XHRcdFx0XHRcIm9uQ29tcGxldGlvblwiLFxyXG5cdFx0XHRcdFx0XHR0aGlzLnRhc2subWV0YWRhdGEub25Db21wbGV0aW9uIHx8IFwiXCJcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyRGVwZW5kc09uTWV0YWRhdGEoKSB7XHJcblx0XHRjb25zdCBkZXBlbmRzT25FbCA9IHRoaXMubWV0YWRhdGFFbC5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdGNsczogXCJ0YXNrLWRlcGVuZHNvblwiLFxyXG5cdFx0fSk7XHJcblx0XHRkZXBlbmRzT25FbC50ZXh0Q29udGVudCA9IGDim5QgJHt0aGlzLnRhc2subWV0YWRhdGEuZGVwZW5kc09uPy5qb2luKFxyXG5cdFx0XHRcIiwgXCJcclxuXHRcdCl9YDtcclxuXHJcblx0XHQvLyBNYWtlIGRlcGVuZHNPbiBjbGlja2FibGUgZm9yIGVkaXRpbmcgb25seSBpZiBpbmxpbmUgZWRpdG9yIGlzIGVuYWJsZWRcclxuXHRcdGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbmFibGVJbmxpbmVFZGl0b3IpIHtcclxuXHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGRlcGVuZHNPbkVsLCBcImNsaWNrXCIsIChlKSA9PiB7XHJcblx0XHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHRcdFx0XHRpZiAoIXRoaXMuaXNDdXJyZW50bHlFZGl0aW5nKCkpIHtcclxuXHRcdFx0XHRcdHRoaXMuZ2V0SW5saW5lRWRpdG9yKCkuc2hvd01ldGFkYXRhRWRpdG9yKFxyXG5cdFx0XHRcdFx0XHRkZXBlbmRzT25FbCxcclxuXHRcdFx0XHRcdFx0XCJkZXBlbmRzT25cIixcclxuXHRcdFx0XHRcdFx0dGhpcy50YXNrLm1ldGFkYXRhLmRlcGVuZHNPbj8uam9pbihcIiwgXCIpIHx8IFwiXCJcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVySWRNZXRhZGF0YSgpIHtcclxuXHRcdGNvbnN0IGlkRWwgPSB0aGlzLm1ldGFkYXRhRWwuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHRjbHM6IFwidGFzay1pZFwiLFxyXG5cdFx0fSk7XHJcblx0XHRpZEVsLnRleHRDb250ZW50ID0gYPCfhpQgJHt0aGlzLnRhc2subWV0YWRhdGEuaWR9YDtcclxuXHJcblx0XHQvLyBNYWtlIGlkIGNsaWNrYWJsZSBmb3IgZWRpdGluZyBvbmx5IGlmIGlubGluZSBlZGl0b3IgaXMgZW5hYmxlZFxyXG5cdFx0aWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmVuYWJsZUlubGluZUVkaXRvcikge1xyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoaWRFbCwgXCJjbGlja1wiLCAoZSkgPT4ge1xyXG5cdFx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblx0XHRcdFx0aWYgKCF0aGlzLmlzQ3VycmVudGx5RWRpdGluZygpKSB7XHJcblx0XHRcdFx0XHR0aGlzLmdldElubGluZUVkaXRvcigpLnNob3dNZXRhZGF0YUVkaXRvcihcclxuXHRcdFx0XHRcdFx0aWRFbCxcclxuXHRcdFx0XHRcdFx0XCJpZFwiLFxyXG5cdFx0XHRcdFx0XHR0aGlzLnRhc2subWV0YWRhdGEuaWQgfHwgXCJcIlxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSByZW5kZXJBZGRNZXRhZGF0YUJ1dHRvbigpIHtcclxuXHRcdC8vIE9ubHkgc2hvdyBhZGQgbWV0YWRhdGEgYnV0dG9uIGlmIGlubGluZSBlZGl0b3IgaXMgZW5hYmxlZFxyXG5cdFx0aWYgKCF0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbmFibGVJbmxpbmVFZGl0b3IpIHtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IGFkZEJ1dHRvbkNvbnRhaW5lciA9IHRoaXMubWV0YWRhdGFFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiYWRkLW1ldGFkYXRhLWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIHRoZSBhZGQgbWV0YWRhdGEgYnV0dG9uXHJcblx0XHRjb25zdCBhZGRCdG4gPSBhZGRCdXR0b25Db250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHRjbHM6IFwiYWRkLW1ldGFkYXRhLWJ0blwiLFxyXG5cdFx0XHRhdHRyOiB7XCJhcmlhLWxhYmVsXCI6IFwiQWRkIG1ldGFkYXRhXCJ9LFxyXG5cdFx0fSk7XHJcblx0XHRzZXRJY29uKGFkZEJ0biwgXCJwbHVzXCIpO1xyXG5cclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChhZGRCdG4sIFwiY2xpY2tcIiwgKGUpID0+IHtcclxuXHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHRcdFx0Ly8gU2hvdyBtZXRhZGF0YSBtZW51IGRpcmVjdGx5IGluc3RlYWQgb2YgY2FsbGluZyBzaG93QWRkTWV0YWRhdGFCdXR0b25cclxuXHRcdFx0dGhpcy5zaG93TWV0YWRhdGFNZW51KGFkZEJ0bik7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc2hvd01ldGFkYXRhTWVudShidXR0b25FbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdGNvbnN0IGVkaXRvciA9IHRoaXMuZ2V0SW5saW5lRWRpdG9yKCk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGEgdGVtcG9yYXJ5IG1lbnUgY29udGFpbmVyXHJcblx0XHRjb25zdCBtZW51ID0gbmV3IE1lbnUoKTtcclxuXHJcblx0XHRjb25zdCBhdmFpbGFibGVGaWVsZHMgPSBbXHJcblx0XHRcdHtrZXk6IFwicHJvamVjdFwiLCBsYWJlbDogXCJQcm9qZWN0XCIsIGljb246IFwiZm9sZGVyXCJ9LFxyXG5cdFx0XHR7a2V5OiBcInRhZ3NcIiwgbGFiZWw6IFwiVGFnc1wiLCBpY29uOiBcInRhZ1wifSxcclxuXHRcdFx0e2tleTogXCJjb250ZXh0XCIsIGxhYmVsOiBcIkNvbnRleHRcIiwgaWNvbjogXCJhdC1zaWduXCJ9LFxyXG5cdFx0XHR7a2V5OiBcImR1ZURhdGVcIiwgbGFiZWw6IFwiRHVlIERhdGVcIiwgaWNvbjogXCJjYWxlbmRhclwifSxcclxuXHRcdFx0e2tleTogXCJzdGFydERhdGVcIiwgbGFiZWw6IFwiU3RhcnQgRGF0ZVwiLCBpY29uOiBcInBsYXlcIn0sXHJcblx0XHRcdHtrZXk6IFwic2NoZWR1bGVkRGF0ZVwiLCBsYWJlbDogXCJTY2hlZHVsZWQgRGF0ZVwiLCBpY29uOiBcImNsb2NrXCJ9LFxyXG5cdFx0XHR7a2V5OiBcImNhbmNlbGxlZERhdGVcIiwgbGFiZWw6IFwiQ2FuY2VsbGVkIERhdGVcIiwgaWNvbjogXCJ4XCJ9LFxyXG5cdFx0XHR7a2V5OiBcImNvbXBsZXRlZERhdGVcIiwgbGFiZWw6IFwiQ29tcGxldGVkIERhdGVcIiwgaWNvbjogXCJjaGVja1wifSxcclxuXHRcdFx0e2tleTogXCJwcmlvcml0eVwiLCBsYWJlbDogXCJQcmlvcml0eVwiLCBpY29uOiBcImFsZXJ0LXRyaWFuZ2xlXCJ9LFxyXG5cdFx0XHR7a2V5OiBcInJlY3VycmVuY2VcIiwgbGFiZWw6IFwiUmVjdXJyZW5jZVwiLCBpY29uOiBcInJlcGVhdFwifSxcclxuXHRcdFx0e2tleTogXCJvbkNvbXBsZXRpb25cIiwgbGFiZWw6IFwiT24gQ29tcGxldGlvblwiLCBpY29uOiBcImZsYWdcIn0sXHJcblx0XHRcdHtrZXk6IFwiZGVwZW5kc09uXCIsIGxhYmVsOiBcIkRlcGVuZHMgT25cIiwgaWNvbjogXCJsaW5rXCJ9LFxyXG5cdFx0XHR7a2V5OiBcImlkXCIsIGxhYmVsOiBcIlRhc2sgSURcIiwgaWNvbjogXCJoYXNoXCJ9LFxyXG5cdFx0XTtcclxuXHJcblx0XHQvLyBGaWx0ZXIgb3V0IGZpZWxkcyB0aGF0IGFscmVhZHkgaGF2ZSB2YWx1ZXNcclxuXHRcdGNvbnN0IGZpZWxkc1RvU2hvdyA9IGF2YWlsYWJsZUZpZWxkcy5maWx0ZXIoKGZpZWxkKSA9PiB7XHJcblx0XHRcdHN3aXRjaCAoZmllbGQua2V5KSB7XHJcblx0XHRcdFx0Y2FzZSBcInByb2plY3RcIjpcclxuXHRcdFx0XHRcdHJldHVybiAhdGhpcy50YXNrLm1ldGFkYXRhLnByb2plY3Q7XHJcblx0XHRcdFx0Y2FzZSBcInRhZ3NcIjpcclxuXHRcdFx0XHRcdHJldHVybiAoXHJcblx0XHRcdFx0XHRcdCF0aGlzLnRhc2subWV0YWRhdGEudGFncyB8fFxyXG5cdFx0XHRcdFx0XHR0aGlzLnRhc2subWV0YWRhdGEudGFncy5sZW5ndGggPT09IDBcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0Y2FzZSBcImNvbnRleHRcIjpcclxuXHRcdFx0XHRcdHJldHVybiAhdGhpcy50YXNrLm1ldGFkYXRhLmNvbnRleHQ7XHJcblx0XHRcdFx0Y2FzZSBcImR1ZURhdGVcIjpcclxuXHRcdFx0XHRcdHJldHVybiAhdGhpcy50YXNrLm1ldGFkYXRhLmR1ZURhdGU7XHJcblx0XHRcdFx0Y2FzZSBcInN0YXJ0RGF0ZVwiOlxyXG5cdFx0XHRcdFx0cmV0dXJuICF0aGlzLnRhc2subWV0YWRhdGEuc3RhcnREYXRlO1xyXG5cdFx0XHRcdGNhc2UgXCJzY2hlZHVsZWREYXRlXCI6XHJcblx0XHRcdFx0XHRyZXR1cm4gIXRoaXMudGFzay5tZXRhZGF0YS5zY2hlZHVsZWREYXRlO1xyXG5cdFx0XHRcdGNhc2UgXCJjYW5jZWxsZWREYXRlXCI6XHJcblx0XHRcdFx0XHRyZXR1cm4gIXRoaXMudGFzay5tZXRhZGF0YS5jYW5jZWxsZWREYXRlO1xyXG5cdFx0XHRcdGNhc2UgXCJjb21wbGV0ZWREYXRlXCI6XHJcblx0XHRcdFx0XHRyZXR1cm4gIXRoaXMudGFzay5tZXRhZGF0YS5jb21wbGV0ZWREYXRlO1xyXG5cdFx0XHRcdGNhc2UgXCJwcmlvcml0eVwiOlxyXG5cdFx0XHRcdFx0cmV0dXJuICF0aGlzLnRhc2subWV0YWRhdGEucHJpb3JpdHk7XHJcblx0XHRcdFx0Y2FzZSBcInJlY3VycmVuY2VcIjpcclxuXHRcdFx0XHRcdHJldHVybiAhdGhpcy50YXNrLm1ldGFkYXRhLnJlY3VycmVuY2U7XHJcblx0XHRcdFx0Y2FzZSBcIm9uQ29tcGxldGlvblwiOlxyXG5cdFx0XHRcdFx0cmV0dXJuICF0aGlzLnRhc2subWV0YWRhdGEub25Db21wbGV0aW9uO1xyXG5cdFx0XHRcdGNhc2UgXCJkZXBlbmRzT25cIjpcclxuXHRcdFx0XHRcdHJldHVybiAoXHJcblx0XHRcdFx0XHRcdCF0aGlzLnRhc2subWV0YWRhdGEuZGVwZW5kc09uIHx8XHJcblx0XHRcdFx0XHRcdHRoaXMudGFzay5tZXRhZGF0YS5kZXBlbmRzT24ubGVuZ3RoID09PSAwXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdGNhc2UgXCJpZFwiOlxyXG5cdFx0XHRcdFx0cmV0dXJuICF0aGlzLnRhc2subWV0YWRhdGEuaWQ7XHJcblx0XHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBJZiBubyBmaWVsZHMgYXJlIGF2YWlsYWJsZSB0byBhZGQsIHNob3cgYSBtZXNzYWdlXHJcblx0XHRpZiAoZmllbGRzVG9TaG93Lmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRpdGVtLnNldFRpdGxlKFxyXG5cdFx0XHRcdFx0XCJBbGwgbWV0YWRhdGEgZmllbGRzIGFyZSBhbHJlYWR5IHNldFwiXHJcblx0XHRcdFx0KS5zZXREaXNhYmxlZCh0cnVlKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRmaWVsZHNUb1Nob3cuZm9yRWFjaCgoZmllbGQpID0+IHtcclxuXHRcdFx0XHRtZW51LmFkZEl0ZW0oKGl0ZW06IGFueSkgPT4ge1xyXG5cdFx0XHRcdFx0aXRlbS5zZXRUaXRsZShmaWVsZC5sYWJlbClcclxuXHRcdFx0XHRcdFx0LnNldEljb24oZmllbGQuaWNvbilcclxuXHRcdFx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdC8vIENyZWF0ZSBhIHRlbXBvcmFyeSBjb250YWluZXIgZm9yIHRoZSBtZXRhZGF0YSBlZGl0b3JcclxuXHRcdFx0XHRcdFx0XHRjb25zdCB0ZW1wQ29udGFpbmVyID1cclxuXHRcdFx0XHRcdFx0XHRcdGJ1dHRvbkVsLnBhcmVudEVsZW1lbnQhLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGNsczogXCJ0ZW1wLW1ldGFkYXRhLWVkaXRvci1jb250YWluZXJcIixcclxuXHRcdFx0XHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRlZGl0b3Iuc2hvd01ldGFkYXRhRWRpdG9yKFxyXG5cdFx0XHRcdFx0XHRcdFx0dGVtcENvbnRhaW5lcixcclxuXHRcdFx0XHRcdFx0XHRcdGZpZWxkLmtleSBhcyBhbnlcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0bWVudS5zaG93QXRQb3NpdGlvbih7XHJcblx0XHRcdHg6IGJ1dHRvbkVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmxlZnQsXHJcblx0XHRcdHk6IGJ1dHRvbkVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmJvdHRvbSxcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBmb3JtYXREYXRlRm9ySW5wdXQoZGF0ZTogRGF0ZSk6IHN0cmluZyB7XHJcblx0XHRjb25zdCB5ZWFyID0gZGF0ZS5nZXRGdWxsWWVhcigpO1xyXG5cdFx0Y29uc3QgbW9udGggPSBTdHJpbmcoZGF0ZS5nZXRNb250aCgpICsgMSkucGFkU3RhcnQoMiwgXCIwXCIpO1xyXG5cdFx0Y29uc3QgZGF5ID0gU3RyaW5nKGRhdGUuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCBcIjBcIik7XHJcblx0XHRyZXR1cm4gYCR7eWVhcn0tJHttb250aH0tJHtkYXl9YDtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyTWFya2Rvd24oKSB7XHJcblx0XHQvLyBDbGVhciBleGlzdGluZyBjb250ZW50IGlmIG5lZWRlZFxyXG5cdFx0aWYgKHRoaXMubWFya2Rvd25SZW5kZXJlcikge1xyXG5cdFx0XHR0aGlzLnJlbW92ZUNoaWxkKHRoaXMubWFya2Rvd25SZW5kZXJlcik7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2xlYXIgdGhlIGNvbnRlbnQgZWxlbWVudFxyXG5cdFx0dGhpcy5jb250ZW50RWwuZW1wdHkoKTtcclxuXHJcblx0XHQvLyDkvb/nlKggcmVxdWVzdEFuaW1hdGlvbkZyYW1lIOehruS/nSBET00g5a6M5YWo5riF55CG5ZCO5YaN5riy5p+T5paw5YaF5a65XHJcblx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xyXG5cdFx0XHQvLyBDcmVhdGUgbmV3IHJlbmRlcmVyXHJcblx0XHRcdHRoaXMubWFya2Rvd25SZW5kZXJlciA9IG5ldyBNYXJrZG93blJlbmRlcmVyQ29tcG9uZW50KFxyXG5cdFx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHRcdHRoaXMuY29udGVudEVsLFxyXG5cdFx0XHRcdHRoaXMudGFzay5maWxlUGF0aFxyXG5cdFx0XHQpO1xyXG5cdFx0XHR0aGlzLmFkZENoaWxkKHRoaXMubWFya2Rvd25SZW5kZXJlcik7XHJcblxyXG5cdFx0XHQvLyBSZW5kZXIgdGhlIG1hcmtkb3duIGNvbnRlbnQgLSDkvb/nlKjmnIDmlrDnmoQgb3JpZ2luYWxNYXJrZG93blxyXG5cdFx0XHR0aGlzLm1hcmtkb3duUmVuZGVyZXIucmVuZGVyKFxyXG5cdFx0XHRcdHRoaXMudGFzay5vcmlnaW5hbE1hcmtkb3duIHx8IFwiXFx1MjAwYlwiXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBSZS1yZWdpc3RlciB0aGUgY2xpY2sgZXZlbnQgZm9yIGVkaXRpbmcgYWZ0ZXIgcmVuZGVyaW5nXHJcblx0XHRcdHRoaXMucmVnaXN0ZXJDb250ZW50Q2xpY2tIYW5kbGVyKCk7XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgbGF5b3V0IG1vZGUgYWZ0ZXIgY29udGVudCBpcyByZW5kZXJlZFxyXG5cdFx0XHQvLyBVc2UgYW5vdGhlciByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgdG8gZW5zdXJlIHRoZSBjb250ZW50IGlzIGZ1bGx5IHJlbmRlcmVkXHJcblx0XHRcdHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy51cGRhdGVMYXlvdXRNb2RlKCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBEZXRlY3QgY29udGVudCBoZWlnaHQgYW5kIHVwZGF0ZSBsYXlvdXQgbW9kZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgdXBkYXRlTGF5b3V0TW9kZSgpIHtcclxuXHRcdGlmICghdGhpcy5jb250ZW50RWwgfHwgIXRoaXMuY29udGVudE1ldGFkYXRhQ29udGFpbmVyKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDaGVjayBpZiBkeW5hbWljIG1ldGFkYXRhIHBvc2l0aW9uaW5nIGlzIGVuYWJsZWRcclxuXHRcdGlmICghdGhpcy5wbHVnaW4uc2V0dGluZ3MuZW5hYmxlRHluYW1pY01ldGFkYXRhUG9zaXRpb25pbmcpIHtcclxuXHRcdFx0Ly8gSWYgZGlzYWJsZWQsIGFsd2F5cyB1c2UgbXVsdGktbGluZSAodHJhZGl0aW9uYWwpIGxheW91dFxyXG5cdFx0XHR0aGlzLmNvbnRlbnRNZXRhZGF0YUNvbnRhaW5lci50b2dnbGVDbGFzcyhcclxuXHRcdFx0XHRcIm11bHRpLWxpbmUtY29udGVudFwiLFxyXG5cdFx0XHRcdHRydWVcclxuXHRcdFx0KTtcclxuXHRcdFx0dGhpcy5jb250ZW50TWV0YWRhdGFDb250YWluZXIudG9nZ2xlQ2xhc3MoXHJcblx0XHRcdFx0XCJzaW5nbGUtbGluZS1jb250ZW50XCIsXHJcblx0XHRcdFx0ZmFsc2VcclxuXHRcdFx0KTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEdldCB0aGUgbGluZSBoZWlnaHQgb2YgdGhlIGNvbnRlbnQgZWxlbWVudFxyXG5cdFx0Y29uc3QgY29tcHV0ZWRTdHlsZSA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHRoaXMuY29udGVudEVsKTtcclxuXHRcdGNvbnN0IGxpbmVIZWlnaHQgPVxyXG5cdFx0XHRwYXJzZUZsb2F0KGNvbXB1dGVkU3R5bGUubGluZUhlaWdodCkgfHxcclxuXHRcdFx0cGFyc2VGbG9hdChjb21wdXRlZFN0eWxlLmZvbnRTaXplKSAqIDEuNDtcclxuXHJcblx0XHQvLyBHZXQgYWN0dWFsIGNvbnRlbnQgaGVpZ2h0XHJcblx0XHRjb25zdCBjb250ZW50SGVpZ2h0ID0gdGhpcy5jb250ZW50RWwuc2Nyb2xsSGVpZ2h0O1xyXG5cclxuXHRcdC8vIENoZWNrIGlmIGNvbnRlbnQgaXMgbXVsdGktbGluZSAod2l0aCBzb21lIHRvbGVyYW5jZSlcclxuXHRcdGNvbnN0IGlzTXVsdGlMaW5lID0gY29udGVudEhlaWdodCA+IGxpbmVIZWlnaHQgKiAxLjI7XHJcblxyXG5cdFx0Ly8gQXBwbHkgYXBwcm9wcmlhdGUgbGF5b3V0IGNsYXNzIHVzaW5nIE9ic2lkaWFuJ3MgdG9nZ2xlQ2xhc3MgbWV0aG9kXHJcblx0XHR0aGlzLmNvbnRlbnRNZXRhZGF0YUNvbnRhaW5lci50b2dnbGVDbGFzcyhcclxuXHRcdFx0XCJtdWx0aS1saW5lLWNvbnRlbnRcIixcclxuXHRcdFx0aXNNdWx0aUxpbmVcclxuXHRcdCk7XHJcblx0XHR0aGlzLmNvbnRlbnRNZXRhZGF0YUNvbnRhaW5lci50b2dnbGVDbGFzcyhcclxuXHRcdFx0XCJzaW5nbGUtbGluZS1jb250ZW50XCIsXHJcblx0XHRcdCFpc011bHRpTGluZVxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlZ2lzdGVyIGNsaWNrIGhhbmRsZXIgZm9yIGNvbnRlbnQgZWRpdGluZ1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgcmVnaXN0ZXJDb250ZW50Q2xpY2tIYW5kbGVyKCkge1xyXG5cdFx0Ly8gTWFrZSBjb250ZW50IGNsaWNrYWJsZSBmb3IgZWRpdGluZyBvciBuYXZpZ2F0aW9uXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQodGhpcy5jb250ZW50RWwsIFwiY2xpY2tcIiwgYXN5bmMgKGUpID0+IHtcclxuXHRcdFx0Ly8gQ2hlY2sgaWYgbW9kaWZpZXIga2V5IGlzIHByZXNzZWQgKENtZC9DdHJsKVxyXG5cdFx0XHRpZiAoS2V5bWFwLmlzTW9kRXZlbnQoZSkpIHtcclxuXHRcdFx0XHQvLyBPcGVuIHRhc2sgaW4gZmlsZVxyXG5cdFx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblx0XHRcdFx0YXdhaXQgdGhpcy5vcGVuVGFza0luRmlsZSgpO1xyXG5cdFx0XHR9IGVsc2UgaWYgKFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLmVuYWJsZUlubGluZUVkaXRvciAmJlxyXG5cdFx0XHRcdCF0aGlzLmlzQ3VycmVudGx5RWRpdGluZygpXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdC8vIE9ubHkgc3RvcCBwcm9wYWdhdGlvbiBpZiB3ZSdyZSBhY3R1YWxseSBnb2luZyB0byBzaG93IHRoZSBlZGl0b3JcclxuXHRcdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cdFx0XHRcdC8vIFNob3cgaW5saW5lIGVkaXRvciBvbmx5IGlmIGVuYWJsZWRcclxuXHRcdFx0XHR0aGlzLmdldElubGluZUVkaXRvcigpLnNob3dDb250ZW50RWRpdG9yKHRoaXMuY29udGVudEVsKTtcclxuXHRcdFx0fVxyXG5cdFx0XHQvLyBJZiBpbmxpbmUgZWRpdG9yIGlzIGRpc2FibGVkLCBsZXQgdGhlIGNsaWNrIGJ1YmJsZSB1cCB0byBzZWxlY3QgdGhlIHRhc2tcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSB1cGRhdGVUYXNrRGlzcGxheSgpIHtcclxuXHRcdC8vIFJlLXJlbmRlciB0aGUgZW50aXJlIHRhc2sgaXRlbVxyXG5cdFx0dGhpcy5yZW5kZXJUYXNrSXRlbSgpO1xyXG5cdH1cclxuXHJcblx0cHVibGljIGdldFRhc2soKTogVGFzayB7XHJcblx0XHRyZXR1cm4gdGhpcy50YXNrO1xyXG5cdH1cclxuXHJcblx0cHVibGljIHVwZGF0ZVRhc2sodGFzazogVGFzaykge1xyXG5cdFx0Y29uc3Qgb2xkVGFzayA9IHRoaXMudGFzaztcclxuXHRcdHRoaXMudGFzayA9IHRhc2s7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIGNvbXBsZXRpb24gc3RhdHVzXHJcblx0XHRpZiAob2xkVGFzay5jb21wbGV0ZWQgIT09IHRhc2suY29tcGxldGVkKSB7XHJcblx0XHRcdGlmICh0YXNrLmNvbXBsZXRlZCkge1xyXG5cdFx0XHRcdHRoaXMuZWxlbWVudC5jbGFzc0xpc3QuYWRkKFwidGFzay1jb21wbGV0ZWRcIik7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGhpcy5lbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoXCJ0YXNrLWNvbXBsZXRlZFwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIElmIGNvbnRlbnQgb3Igb3JpZ2luYWxNYXJrZG93biBjaGFuZ2VkLCB1cGRhdGUgdGhlIG1hcmtkb3duIGRpc3BsYXlcclxuXHRcdGlmIChcclxuXHRcdFx0b2xkVGFzay5vcmlnaW5hbE1hcmtkb3duICE9PSB0YXNrLm9yaWdpbmFsTWFya2Rvd24gfHxcclxuXHRcdFx0b2xkVGFzay5jb250ZW50ICE9PSB0YXNrLmNvbnRlbnRcclxuXHRcdCkge1xyXG5cdFx0XHQvLyBSZS1yZW5kZXIgdGhlIG1hcmtkb3duIGNvbnRlbnRcclxuXHRcdFx0dGhpcy5jb250ZW50RWwuZW1wdHkoKTtcclxuXHRcdFx0dGhpcy5yZW5kZXJNYXJrZG93bigpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENoZWNrIGlmIG1ldGFkYXRhIGNoYW5nZWQgYW5kIHVwZGF0ZSBtZXRhZGF0YSBkaXNwbGF5XHJcblx0XHRpZiAoXHJcblx0XHRcdEpTT04uc3RyaW5naWZ5KG9sZFRhc2subWV0YWRhdGEpICE9PSBKU09OLnN0cmluZ2lmeSh0YXNrLm1ldGFkYXRhKVxyXG5cdFx0KSB7XHJcblx0XHRcdHRoaXMucmVuZGVyTWV0YWRhdGEoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgb3BlblRhc2tJbkZpbGUoKSB7XHJcblx0XHRjb25zdCBmaWxlID0gdGhpcy5hcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aCh0aGlzLnRhc2suZmlsZVBhdGgpO1xyXG5cdFx0aWYgKGZpbGUpIHtcclxuXHRcdFx0Y29uc3QgbGVhZiA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWFmKGZhbHNlKTtcclxuXHRcdFx0YXdhaXQgbGVhZi5vcGVuRmlsZShmaWxlLCB7XHJcblx0XHRcdFx0ZVN0YXRlOiB7XHJcblx0XHRcdFx0XHRsaW5lOiB0aGlzLnRhc2subGluZSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzZXRTZWxlY3RlZChzZWxlY3RlZDogYm9vbGVhbikge1xyXG5cdFx0aWYgKHNlbGVjdGVkKSB7XHJcblx0XHRcdHRoaXMuZWxlbWVudC5jbGFzc0xpc3QuYWRkKFwic2VsZWN0ZWRcIik7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLmVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShcInNlbGVjdGVkXCIpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0b251bmxvYWQoKSB7XHJcblx0XHQvLyBSZWxlYXNlIGVkaXRvciBmcm9tIG1hbmFnZXIgaWYgdGhpcyB0YXNrIHdhcyBiZWluZyBlZGl0ZWRcclxuXHRcdGlmIChcclxuXHRcdFx0VGFza0xpc3RJdGVtQ29tcG9uZW50LmVkaXRvck1hbmFnZXI/Lmhhc0FjdGl2ZUVkaXRvcih0aGlzLnRhc2suaWQpXHJcblx0XHQpIHtcclxuXHRcdFx0VGFza0xpc3RJdGVtQ29tcG9uZW50LmVkaXRvck1hbmFnZXIucmVsZWFzZUVkaXRvcih0aGlzLnRhc2suaWQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuZWxlbWVudC5kZXRhY2goKTtcclxuXHR9XHJcbn1cclxuIl19