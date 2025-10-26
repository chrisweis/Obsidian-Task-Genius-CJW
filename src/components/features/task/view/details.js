import { __awaiter } from "tslib";
import { Component, ExtraButtonComponent, DropdownComponent, TextComponent, debounce, Platform, } from "obsidian";
import "@/styles/task-details.css";
import { t } from "@/translations/helper";
import { clearAllMarks } from "@/components/ui/renderers/MarkdownRenderer";
import { StatusComponent } from "@/components/ui/feedback/StatusIndicator";
import { ContextSuggest, ProjectSuggest, TagSuggest, } from "@/components/ui/inputs/AutoComplete";
import { getEffectiveProject, isProjectReadonly, } from "@/utils/task/task-operations";
import { OnCompletionConfigurator } from "@/components/features/on-completion/OnCompletionConfigurator";
import { timestampToLocalDateString, localDateStringToTimestamp, } from "@/utils/date/date-display-helper";
function getStatus(task, settings) {
    const status = Object.keys(settings.taskStatuses).find((key) => {
        return settings.taskStatuses[key]
            .split("|")
            .includes(task.status);
    });
    const statusTextMap = {
        notStarted: "Not Started",
        abandoned: "Abandoned",
        planned: "Planned",
        completed: "Completed",
        inProgress: "In Progress",
    };
    return statusTextMap[status] || "No status";
}
export function getStatusText(status, settings) {
    const statusTextMap = {
        notStarted: "Not Started",
        abandoned: "Abandoned",
        planned: "Planned",
        completed: "Completed",
        inProgress: "In Progress",
    };
    return statusTextMap[status] || "No status";
}
function mapTextStatusToSymbol(status) {
    var _a;
    if (!status)
        return " ";
    if (status.length === 1)
        return status; // already a symbol mark
    const map = {
        completed: "x",
        done: "x",
        finished: "x",
        "in-progress": "/",
        "in progress": "/",
        doing: "/",
        planned: "?",
        todo: "?",
        cancelled: "-",
        canceled: "-",
        "not-started": " ",
        "not started": " ",
    };
    const key = status.toLowerCase();
    return (_a = map[key]) !== null && _a !== void 0 ? _a : status;
}
export function createTaskCheckbox(status, task, container) {
    const checkbox = container.createEl("input", {
        cls: "task-list-item-checkbox",
        type: "checkbox",
    });
    const symbol = mapTextStatusToSymbol(status);
    checkbox.dataset.task = symbol;
    checkbox.checked = symbol !== " ";
    return checkbox;
}
export class TaskDetailsComponent extends Component {
    constructor(parentEl, app, plugin) {
        super();
        this.parentEl = parentEl;
        this.app = app;
        this.plugin = plugin;
        this.currentTask = null;
        this.isVisible = true;
        this.isEditing = false;
        this.editFormEl = null;
    }
    onload() {
        // Create details container
        this.containerEl = this.parentEl.createDiv({
            cls: "task-details",
        });
        // Initial empty state
        this.showEmptyState();
    }
    showEmptyState() {
        this.containerEl.empty();
        const emptyEl = this.containerEl.createDiv({ cls: "details-empty" });
        emptyEl.setText(t("Select a task to view details"));
    }
    getTaskStatus() {
        var _a;
        return ((_a = this.currentTask) === null || _a === void 0 ? void 0 : _a.status) || "";
    }
    showTaskDetails(task) {
        console.log("showTaskDetails", task);
        if (!task) {
            this.currentTask = null;
            this.showEmptyState();
            return;
        }
        this.currentTask = task;
        this.isEditing = false;
        // Clear existing content
        this.containerEl.empty();
        // Create details header
        const headerEl = this.containerEl.createDiv({ cls: "details-header" });
        headerEl.setText(t("Task Details"));
        // Only show close button on mobile or if explicitly requested
        if (Platform.isPhone ||
            this.containerEl.closest(".tg-fluent-container")) {
            headerEl.createEl("div", {
                cls: "details-close-btn",
            }, (el) => {
                new ExtraButtonComponent(el).setIcon("x").onClick(() => {
                    this.toggleDetailsVisibility &&
                        this.toggleDetailsVisibility(false);
                });
            });
        }
        // Create content container
        this.contentEl = this.containerEl.createDiv({ cls: "details-content" });
        // Task name
        const nameEl = this.contentEl.createEl("h2", { cls: "details-name" });
        nameEl.setText(clearAllMarks(task.content));
        // Task status
        this.contentEl.createDiv({ cls: "details-status-container" }, (el) => {
            const labelEl = el.createDiv({ cls: "details-status-label" });
            labelEl.setText(t("Status"));
            const statusEl = el.createDiv({ cls: "details-status" });
            statusEl.setText(getStatus(task, this.plugin.settings));
        });
        const statusComponent = new StatusComponent(this.plugin, this.contentEl, task, {
            onTaskUpdate: this.onTaskUpdate,
        });
        this.addChild(statusComponent);
        // // Task metadata
        const metaEl = this.contentEl.createDiv({ cls: "details-metadata" });
        // // Add metadata fields
        // if (task.metadata.project) {
        // 	this.addMetadataField(metaEl, "Project", task.metadata.project);
        // }
        // if (task.metadata.dueDate) {
        // 	const dueDateText = new Date(task.metadata.dueDate).toLocaleDateString();
        // 	this.addMetadataField(metaEl, "Due Date", dueDateText);
        // }
        // if (task.metadata.startDate) {
        // 	const startDateText = new Date(task.metadata.startDate).toLocaleDateString();
        // 	this.addMetadataField(metaEl, "Start Date", startDateText);
        // }
        // if (task.metadata.scheduledDate) {
        // 	const scheduledDateText = new Date(
        // 		task.metadata.scheduledDate
        // 	).toLocaleDateString();
        // 	this.addMetadataField(metaEl, "Scheduled Date", scheduledDateText);
        // }
        // if (task.metadata.completedDate) {
        // 	const completedDateText = new Date(
        // 		task.metadata.completedDate
        // 	).toLocaleDateString();
        // 	this.addMetadataField(metaEl, "Completed", completedDateText);
        // }
        // if (task.metadata.priority) {
        // 	let priorityText = "Low";
        // 	switch (task.metadata.priority) {
        // 		case 1:
        // 			priorityText = "Lowest";
        // 			break;
        // 		case 2:
        // 			priorityText = "Low";
        // 			break;
        // 		case 3:
        // 			priorityText = "Medium";
        // 			break;
        // 		case 4:
        // 			priorityText = "High";
        // 			break;
        // 		case 5:
        // 			priorityText = "Highest";
        // 			break;
        // 		default:
        // 			priorityText = "Low";
        // 	}
        // 	this.addMetadataField(metaEl, "Priority", priorityText);
        // }
        // if (task.metadata.tags && task.metadata.tags.length > 0) {
        // 	this.addMetadataField(metaEl, "Tags", task.metadata.tags.join(", "));
        // }
        // if (task.metadata.context) {
        // 	this.addMetadataField(metaEl, "Context", task.metadata.context);
        // }
        // if (task.metadata.recurrence) {
        // 	this.addMetadataField(metaEl, "Recurrence", task.metadata.recurrence);
        // }
        // Task file location
        this.addMetadataField(metaEl, t("File"), task.filePath);
        // Add action controls
        const actionsEl = this.contentEl.createDiv({ cls: "details-actions" });
        // Edit in panel button
        this.showEditForm(task);
        // Edit in file button
        const editInFileBtn = actionsEl.createEl("button", {
            cls: "details-edit-file-btn",
        });
        editInFileBtn.setText(t("Edit in File"));
        this.registerDomEvent(editInFileBtn, "click", () => {
            if (this.onTaskEdit) {
                this.onTaskEdit(task);
            }
            else {
                this.editTask(task);
            }
        });
        // Toggle completion button
        const toggleBtn = actionsEl.createEl("button", {
            cls: "details-toggle-btn",
        });
        toggleBtn.setText(task.completed ? t("Mark Incomplete") : t("Mark Complete"));
        this.registerDomEvent(toggleBtn, "click", () => {
            if (this.onTaskToggleComplete) {
                this.onTaskToggleComplete(task);
            }
        });
    }
    showEditForm(task) {
        if (!task)
            return;
        this.isEditing = true;
        // Create edit form
        this.editFormEl = this.contentEl.createDiv({
            cls: "details-edit-form",
        });
        // Task content/title
        const contentField = this.createFormField(this.editFormEl, t("Task Title"));
        const contentInput = new TextComponent(contentField);
        console.log("contentInput", contentInput, task.content);
        contentInput.setValue(clearAllMarks(task.content));
        contentInput.inputEl.addClass("details-edit-content");
        // Project dropdown
        const projectField = this.createFormField(this.editFormEl, t("Project"));
        // Get effective project and readonly status
        const effectiveProject = getEffectiveProject(task);
        const isReadonly = isProjectReadonly(task);
        const projectInput = new TextComponent(projectField);
        projectInput.setValue(effectiveProject || "");
        // Add visual indicator for tgProject - only show if no user-set project exists
        if (task.metadata.tgProject &&
            (!task.metadata.project || !task.metadata.project.trim())) {
            const tgProject = task.metadata.tgProject;
            const indicator = projectField.createDiv({
                cls: "project-source-indicator",
            });
            // Create indicator text based on tgProject type
            let indicatorText = "";
            let indicatorIcon = "";
            switch (tgProject.type) {
                case "path":
                    indicatorText =
                        t("Auto-assigned from path") + `: ${tgProject.source}`;
                    indicatorIcon = "📁";
                    break;
                case "metadata":
                    indicatorText =
                        t("Auto-assigned from file metadata") +
                            `: ${tgProject.source}`;
                    indicatorIcon = "📄";
                    break;
                case "config":
                    indicatorText =
                        t("Auto-assigned from config file") +
                            `: ${tgProject.source}`;
                    indicatorIcon = "⚙️";
                    break;
                default:
                    indicatorText =
                        t("Auto-assigned") + `: ${tgProject.source}`;
                    indicatorIcon = "🔗";
            }
            indicator.createEl("span", {
                cls: "indicator-icon",
                text: indicatorIcon,
            });
            indicator.createEl("span", {
                cls: "indicator-text",
                text: indicatorText,
            });
            if (isReadonly) {
                indicator.addClass("readonly-indicator");
                projectInput.setDisabled(true);
                projectField.createDiv({
                    cls: "field-description readonly-description",
                    text: t("This project is automatically assigned and cannot be changed"),
                });
            }
            else {
                indicator.addClass("override-indicator");
                projectField.createDiv({
                    cls: "field-description override-description",
                    text: t("You can override the auto-assigned project by entering a different value"),
                });
            }
        }
        new ProjectSuggest(this.app, projectInput.inputEl, this.plugin);
        // Tags field
        const tagsField = this.createFormField(this.editFormEl, t("Tags"));
        const tagsInput = new TextComponent(tagsField);
        console.log("tagsInput", tagsInput, task.metadata.tags);
        // Remove # prefix from tags when displaying them
        tagsInput.setValue(task.metadata.tags
            ? task.metadata.tags
                .map((tag) => tag.startsWith("#") ? tag.slice(1) : tag)
                .join(", ")
            : "");
        tagsField
            .createSpan({ cls: "field-description" })
            .setText(t("Comma separated") + " " + t("e.g. #tag1, #tag2, #tag3"));
        new TagSuggest(this.app, tagsInput.inputEl, this.plugin);
        // Context field
        const contextField = this.createFormField(this.editFormEl, t("Context"));
        const contextInput = new TextComponent(contextField);
        contextInput.setValue(task.metadata.context || "");
        new ContextSuggest(this.app, contextInput.inputEl, this.plugin);
        // Priority dropdown
        const priorityField = this.createFormField(this.editFormEl, t("Priority"));
        const priorityDropdown = new DropdownComponent(priorityField);
        priorityDropdown.addOption("", t("None"));
        priorityDropdown.addOption("1", "⏬️ " + t("Lowest"));
        priorityDropdown.addOption("2", "🔽 " + t("Low"));
        priorityDropdown.addOption("3", "🔼 " + t("Medium"));
        priorityDropdown.addOption("4", "⏫ " + t("High"));
        priorityDropdown.addOption("5", "🔺 " + t("Highest"));
        if (task.metadata.priority) {
            priorityDropdown.setValue(task.metadata.priority.toString());
        }
        else {
            priorityDropdown.setValue("");
        }
        // Due date
        const dueDateField = this.createFormField(this.editFormEl, t("Due Date"));
        const dueDateInput = dueDateField.createEl("input", {
            type: "date",
            cls: "date-input",
        });
        if (task.metadata.dueDate) {
            // Use helper to correctly display UTC noon timestamp as local date
            dueDateInput.value = timestampToLocalDateString(task.metadata.dueDate);
        } // Start date
        const startDateField = this.createFormField(this.editFormEl, t("Start Date"));
        const startDateInput = startDateField.createEl("input", {
            type: "date",
            cls: "date-input",
        });
        if (task.metadata.startDate) {
            // Use helper to correctly display UTC noon timestamp as local date
            startDateInput.value = timestampToLocalDateString(task.metadata.startDate);
        }
        // Scheduled date
        const scheduledDateField = this.createFormField(this.editFormEl, t("Scheduled Date"));
        const scheduledDateInput = scheduledDateField.createEl("input", {
            type: "date",
            cls: "date-input",
        });
        if (task.metadata.scheduledDate) {
            // Use helper to correctly display UTC noon timestamp as local date
            scheduledDateInput.value = timestampToLocalDateString(task.metadata.scheduledDate);
        }
        // Cancelled date
        const cancelledDateField = this.createFormField(this.editFormEl, t("Cancelled Date"));
        const cancelledDateInput = cancelledDateField.createEl("input", {
            type: "date",
            cls: "date-input",
        });
        if (task.metadata.cancelledDate) {
            // Use helper to correctly display UTC noon timestamp as local date
            cancelledDateInput.value = timestampToLocalDateString(task.metadata.cancelledDate);
        }
        // On completion action
        const onCompletionField = this.createFormField(this.editFormEl, t("On Completion"));
        // Create a debounced save function
        const saveTask = debounce(() => __awaiter(this, void 0, void 0, function* () {
            // Create updated task object
            const updatedTask = Object.assign({}, task);
            // Update task properties
            const newContent = contentInput.getValue();
            updatedTask.content = newContent;
            // Update metadata properties
            const metadata = Object.assign({}, updatedTask.metadata);
            // Parse and update project - Only update if not readonly tgProject
            const projectValue = projectInput.getValue();
            if (!isReadonly) {
                metadata.project = projectValue || undefined;
            }
            else {
                // Preserve original project metadata for readonly tgProject
                metadata.project = task.metadata.project;
            }
            // Parse and update tags (remove # prefix if present)
            const tagsValue = tagsInput.getValue();
            metadata.tags = tagsValue
                ? tagsValue
                    .split(",")
                    .map((tag) => tag.trim())
                    .map((tag) => tag.startsWith("#") ? tag.slice(1) : tag) // Remove # prefix if present
                    .filter((tag) => tag)
                : [];
            // Update context
            const contextValue = contextInput.getValue();
            metadata.context = contextValue || undefined;
            // Parse and update priority
            const priorityValue = priorityDropdown.getValue();
            metadata.priority = priorityValue
                ? parseInt(priorityValue)
                : undefined;
            // Parse dates and check if they've changed
            const dueDateValue = dueDateInput.value;
            if (dueDateValue) {
                // Use helper to convert local date string to UTC noon timestamp
                const newDueDate = localDateStringToTimestamp(dueDateValue);
                // Only update if the date has changed or is different from the original
                if (task.metadata.dueDate !== newDueDate) {
                    metadata.dueDate = newDueDate;
                }
                else {
                    metadata.dueDate = task.metadata.dueDate;
                }
            }
            else if (!dueDateValue && task.metadata.dueDate) {
                // Only update if field was cleared and previously had a value
                metadata.dueDate = undefined;
            }
            else {
                // Keep original value if both are empty/undefined
                metadata.dueDate = task.metadata.dueDate;
            }
            const startDateValue = startDateInput.value;
            if (startDateValue) {
                // Use helper to convert local date string to UTC noon timestamp
                const newStartDate = localDateStringToTimestamp(startDateValue);
                // Only update if the date has changed or is different from the original
                if (task.metadata.startDate !== newStartDate) {
                    metadata.startDate = newStartDate;
                }
                else {
                    metadata.startDate = task.metadata.startDate;
                }
            }
            else if (!startDateValue && task.metadata.startDate) {
                // Only update if field was cleared and previously had a value
                metadata.startDate = undefined;
            }
            else {
                // Keep original value if both are empty/undefined
                metadata.startDate = task.metadata.startDate;
            }
            const scheduledDateValue = scheduledDateInput.value;
            if (scheduledDateValue) {
                // Use helper to convert local date string to UTC noon timestamp
                const newScheduledDate = localDateStringToTimestamp(scheduledDateValue);
                // Only update if the date has changed or is different from the original
                if (task.metadata.scheduledDate !== newScheduledDate) {
                    metadata.scheduledDate = newScheduledDate;
                }
                else {
                    metadata.scheduledDate = task.metadata.scheduledDate;
                }
            }
            else if (!scheduledDateValue && task.metadata.scheduledDate) {
                // Only update if field was cleared and previously had a value
                metadata.scheduledDate = undefined;
            }
            else {
                // Keep original value if both are empty/undefined
                metadata.scheduledDate = task.metadata.scheduledDate;
            }
            const cancelledDateValue = cancelledDateInput.value;
            if (cancelledDateValue) {
                // Use helper to convert local date string to UTC noon timestamp
                const newCancelledDate = localDateStringToTimestamp(cancelledDateValue);
                // Only update if the date has changed or is different from the original
                if (task.metadata.cancelledDate !== newCancelledDate) {
                    metadata.cancelledDate = newCancelledDate;
                }
                else {
                    metadata.cancelledDate = task.metadata.cancelledDate;
                }
            }
            else if (!cancelledDateValue && task.metadata.cancelledDate) {
                // Only update if field was cleared and previously had a value
                metadata.cancelledDate = undefined;
            }
            else {
                // Keep original value if both are empty/undefined
                metadata.cancelledDate = task.metadata.cancelledDate;
            }
            // onCompletion is now handled by OnCompletionConfigurator
            // Update dependencies
            const dependsOnValue = dependsOnInput.getValue();
            metadata.dependsOn = dependsOnValue
                ? dependsOnValue
                    .split(",")
                    .map((id) => id.trim())
                    .filter((id) => id)
                : undefined;
            const onCompletionValue = onCompletionConfigurator.getValue();
            metadata.onCompletion = onCompletionValue || undefined;
            // Update task ID
            const taskIdValue = taskIdInput.getValue();
            metadata.id = taskIdValue || undefined;
            // Update recurrence
            const recurrenceValue = recurrenceInput.getValue();
            metadata.recurrence = recurrenceValue || undefined;
            // Assign updated metadata back to task
            updatedTask.metadata = metadata;
            // Check if any task data has changed before updating
            const hasChanges = this.hasTaskChanges(task, updatedTask);
            // Call the update callback only if there are changes
            if (this.onTaskUpdate && hasChanges) {
                try {
                    yield this.onTaskUpdate(task, updatedTask);
                    // 更新本地引用并立即重绘详情，避免显示“上一次”的值
                    this.currentTask = updatedTask;
                    this.isEditing = false;
                    this.showTaskDetails(updatedTask);
                }
                catch (error) {
                    console.error("Failed to update task:", error);
                    // TODO: Show error message to user
                }
            }
        }), 800); // 1500ms debounce time - allow time for multi-field editing
        // Use OnCompletionConfigurator directly
        const onCompletionConfigurator = new OnCompletionConfigurator(onCompletionField, this.plugin, {
            initialValue: task.metadata.onCompletion || "",
            onChange: (value) => {
                console.log(value, "onCompletion value changed");
                // Use smarter save logic: allow basic configurations to save immediately
                // and allow partial configurations for complex types
                const config = onCompletionConfigurator.getConfig();
                const shouldSave = this.shouldTriggerOnCompletionSave(config, value);
                if (shouldSave) {
                    // Trigger save - the saveTask function will get the latest value
                    // from onCompletionConfigurator.getValue() to avoid data races
                    saveTask();
                }
            },
            onValidationChange: (isValid, error) => {
                // Show validation feedback
                const existingMessage = onCompletionField.querySelector(".oncompletion-validation-message");
                if (existingMessage) {
                    existingMessage.remove();
                }
                if (error) {
                    const messageEl = onCompletionField.createDiv({
                        cls: "oncompletion-validation-message error",
                        text: error,
                    });
                }
                else if (isValid) {
                    const messageEl = onCompletionField.createDiv({
                        cls: "oncompletion-validation-message success",
                        text: t("Configuration is valid"),
                    });
                }
            },
        });
        this.addChild(onCompletionConfigurator);
        // Dependencies
        const dependsOnField = this.createFormField(this.editFormEl, t("Depends On"));
        const dependsOnInput = new TextComponent(dependsOnField);
        dependsOnInput.setValue(Array.isArray(task.metadata.dependsOn)
            ? task.metadata.dependsOn.join(", ")
            : task.metadata.dependsOn || "");
        dependsOnField
            .createSpan({ cls: "field-description" })
            .setText(t("Comma-separated list of task IDs this task depends on"));
        // Task ID
        const taskIdField = this.createFormField(this.editFormEl, t("Task ID"));
        const taskIdInput = new TextComponent(taskIdField);
        taskIdInput.setValue(task.metadata.id || "");
        taskIdField
            .createSpan({ cls: "field-description" })
            .setText(t("Unique identifier for this task"));
        // Recurrence pattern
        const recurrenceField = this.createFormField(this.editFormEl, t("Recurrence"));
        const recurrenceInput = new TextComponent(recurrenceField);
        recurrenceInput.setValue(task.metadata.recurrence || "");
        recurrenceField
            .createSpan({ cls: "field-description" })
            .setText(t("e.g. every day, every 2 weeks"));
        // Register blur events for all input elements
        const registerBlurEvent = (el) => {
            this.registerDomEvent(el, "blur", () => {
                saveTask();
            });
        };
        // Register change events for date inputs
        const registerDateChangeEvent = (el) => {
            this.registerDomEvent(el, "change", () => {
                saveTask();
            });
        };
        // Register all input elements
        registerBlurEvent(contentInput.inputEl);
        registerBlurEvent(projectInput.inputEl);
        registerBlurEvent(tagsInput.inputEl);
        registerBlurEvent(contextInput.inputEl);
        registerBlurEvent(priorityDropdown.selectEl);
        // Remove blur events for date inputs to prevent duplicate saves
        // registerBlurEvent(dueDateInput);
        // registerBlurEvent(startDateInput);
        // registerBlurEvent(scheduledDateInput);
        // onCompletion input is now handled by OnCompletionConfigurator or in fallback
        registerBlurEvent(dependsOnInput.inputEl);
        registerBlurEvent(taskIdInput.inputEl);
        registerBlurEvent(recurrenceInput.inputEl);
        // Register change events for date inputs
        registerDateChangeEvent(dueDateInput);
        registerDateChangeEvent(startDateInput);
        registerDateChangeEvent(scheduledDateInput);
        registerDateChangeEvent(cancelledDateInput);
    }
    hasTaskChanges(originalTask, updatedTask) {
        // For FileTask objects, we need to avoid comparing the sourceEntry property
        // which contains circular references that can't be JSON.stringify'd
        const isFileTask = "isFileTask" in originalTask && originalTask.isFileTask;
        if (isFileTask) {
            // Compare all properties except sourceEntry for FileTask
            const originalCopy = Object.assign({}, originalTask);
            const updatedCopy = Object.assign({}, updatedTask);
            // Remove sourceEntry from comparison for FileTask
            if ("sourceEntry" in originalCopy) {
                delete originalCopy.sourceEntry;
            }
            if ("sourceEntry" in updatedCopy) {
                delete updatedCopy.sourceEntry;
            }
            try {
                return (JSON.stringify(originalCopy) !== JSON.stringify(updatedCopy));
            }
            catch (error) {
                console.warn("Failed to compare tasks with JSON.stringify, falling back to property comparison:", error);
                return this.compareTaskProperties(originalTask, updatedTask);
            }
        }
        else {
            // For regular Task objects, use JSON.stringify comparison
            try {
                return (JSON.stringify(originalTask) !== JSON.stringify(updatedTask));
            }
            catch (error) {
                console.warn("Failed to compare tasks with JSON.stringify, falling back to property comparison:", error);
                return this.compareTaskProperties(originalTask, updatedTask);
            }
        }
    }
    compareTaskProperties(originalTask, updatedTask) {
        // Compare key properties that can be edited in the form
        const compareProps = [
            "content",
            "originalMarkdown",
            "project",
            "tags",
            "context",
            "priority",
            "dueDate",
            "startDate",
            "scheduledDate",
            "cancelledDate",
            "onCompletion",
            "dependsOn",
            "id",
            "recurrence",
        ];
        for (const prop of compareProps) {
            const originalValue = originalTask[prop];
            const updatedValue = updatedTask[prop];
            // Handle array comparison for tags
            if (prop === "tags") {
                const originalTags = Array.isArray(originalValue)
                    ? originalValue
                    : [];
                const updatedTags = Array.isArray(updatedValue)
                    ? updatedValue
                    : [];
                if (originalTags.length !== updatedTags.length) {
                    return true;
                }
                for (let i = 0; i < originalTags.length; i++) {
                    if (originalTags[i] !== updatedTags[i]) {
                        return true;
                    }
                }
            }
            else {
                // Simple value comparison
                if (originalValue !== updatedValue) {
                    return true;
                }
            }
        }
        return false;
    }
    createFormField(container, label) {
        const fieldEl = container.createDiv({ cls: "details-form-field" });
        fieldEl.createDiv({ cls: "details-form-label", text: label });
        return fieldEl.createDiv({ cls: "details-form-input" });
    }
    addMetadataField(container, label, value) {
        const fieldEl = container.createDiv({ cls: "metadata-field" });
        const labelEl = fieldEl.createDiv({ cls: "metadata-label" });
        labelEl.setText(label);
        const valueEl = fieldEl.createDiv({ cls: "metadata-value" });
        valueEl.setText(value);
    }
    editTask(task) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof task === "object" && "isFileTask" in task) {
                const fileTask = task;
                const file = this.app.vault.getFileByPath(fileTask.sourceEntry.file.path);
                if (!file)
                    return;
                const leaf = this.app.workspace.getLeaf(true);
                yield leaf.openFile(file);
                const editor = (_a = this.app.workspace.activeEditor) === null || _a === void 0 ? void 0 : _a.editor;
                if (editor) {
                    editor.setCursor({ line: fileTask.line || 0, ch: 0 });
                    editor.focus();
                }
                return;
            }
            // Get the file from the vault
            const file = this.app.vault.getFileByPath(task.filePath);
            if (!file)
                return;
            // Open the file
            const leaf = this.app.workspace.getLeaf(false);
            yield leaf.openFile(file);
            // Try to set the cursor at the task's line
            const editor = (_b = this.app.workspace.activeEditor) === null || _b === void 0 ? void 0 : _b.editor;
            if (editor) {
                editor.setCursor({ line: task.line || 0, ch: 0 });
                editor.focus();
            }
        });
    }
    setVisible(visible) {
        this.isVisible = visible;
        if (visible) {
            this.containerEl.show();
            this.containerEl.addClass("visible");
            this.containerEl.removeClass("hidden");
        }
        else {
            this.containerEl.addClass("hidden");
            this.containerEl.removeClass("visible");
            // Optionally hide with animation, then truly hide
            setTimeout(() => {
                if (!this.isVisible) {
                    this.containerEl.hide();
                }
            }, 300); // match animation duration of 0.3s
        }
    }
    getCurrentTask() {
        return this.currentTask;
    }
    isCurrentlyEditing() {
        return this.isEditing;
    }
    shouldTriggerOnCompletionSave(config, value) {
        // Don't save if value is empty
        if (!value || !value.trim()) {
            return false;
        }
        // Don't save if no config (invalid state)
        if (!config) {
            return false;
        }
        // For basic action types, allow immediate save
        if (config.type === "delete" ||
            config.type === "keep" ||
            config.type === "archive" ||
            config.type === "duplicate") {
            return true;
        }
        // For complex types, allow save if we have partial but meaningful config
        if (config.type === "complete") {
            // Allow save for "complete:" even without taskIds
            return value.startsWith("complete:");
        }
        if (config.type === "move") {
            // Allow save for "move:" even without targetFile
            return value.startsWith("move:");
        }
        // Default: allow save if value is not empty
        return true;
    }
    onunload() {
        this.containerEl.empty();
        this.containerEl.remove();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV0YWlscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRldGFpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFDTixTQUFTLEVBQ1Qsb0JBQW9CLEVBR3BCLGlCQUFpQixFQUNqQixhQUFhLEVBSWIsUUFBUSxFQUNSLFFBQVEsR0FDUixNQUFNLFVBQVUsQ0FBQztBQUlsQixPQUFPLDJCQUEyQixDQUFDO0FBQ25DLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUMxQyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzNFLE9BQU8sRUFDTixjQUFjLEVBQ2QsY0FBYyxFQUNkLFVBQVUsR0FDVixNQUFNLHFDQUFxQyxDQUFDO0FBRTdDLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsaUJBQWlCLEdBQ2pCLE1BQU0sOEJBQThCLENBQUM7QUFDdEMsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDeEcsT0FBTyxFQUNOLDBCQUEwQixFQUMxQiwwQkFBMEIsR0FDMUIsTUFBTSxrQ0FBa0MsQ0FBQztBQUUxQyxTQUFTLFNBQVMsQ0FBQyxJQUFVLEVBQUUsUUFBaUM7SUFDL0QsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7UUFDOUQsT0FBTyxRQUFRLENBQUMsWUFBWSxDQUFDLEdBQXlDLENBQUM7YUFDckUsS0FBSyxDQUFDLEdBQUcsQ0FBQzthQUNWLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDekIsQ0FBQyxDQUFDLENBQUM7SUFFSCxNQUFNLGFBQWEsR0FBRztRQUNyQixVQUFVLEVBQUUsYUFBYTtRQUN6QixTQUFTLEVBQUUsV0FBVztRQUN0QixPQUFPLEVBQUUsU0FBUztRQUNsQixTQUFTLEVBQUUsV0FBVztRQUN0QixVQUFVLEVBQUUsYUFBYTtLQUN6QixDQUFDO0lBRUYsT0FBTyxhQUFhLENBQUMsTUFBb0MsQ0FBQyxJQUFJLFdBQVcsQ0FBQztBQUMzRSxDQUFDO0FBRUQsTUFBTSxVQUFVLGFBQWEsQ0FDNUIsTUFBYyxFQUNkLFFBQWlDO0lBRWpDLE1BQU0sYUFBYSxHQUFHO1FBQ3JCLFVBQVUsRUFBRSxhQUFhO1FBQ3pCLFNBQVMsRUFBRSxXQUFXO1FBQ3RCLE9BQU8sRUFBRSxTQUFTO1FBQ2xCLFNBQVMsRUFBRSxXQUFXO1FBQ3RCLFVBQVUsRUFBRSxhQUFhO0tBQ3pCLENBQUM7SUFFRixPQUFPLGFBQWEsQ0FBQyxNQUFvQyxDQUFDLElBQUksV0FBVyxDQUFDO0FBQzNFLENBQUM7QUFFRCxTQUFTLHFCQUFxQixDQUFDLE1BQWM7O0lBQzVDLElBQUksQ0FBQyxNQUFNO1FBQUUsT0FBTyxHQUFHLENBQUM7SUFDeEIsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUM7UUFBRSxPQUFPLE1BQU0sQ0FBQyxDQUFDLHdCQUF3QjtJQUNoRSxNQUFNLEdBQUcsR0FBMkI7UUFDbkMsU0FBUyxFQUFFLEdBQUc7UUFDZCxJQUFJLEVBQUUsR0FBRztRQUNULFFBQVEsRUFBRSxHQUFHO1FBQ2IsYUFBYSxFQUFFLEdBQUc7UUFDbEIsYUFBYSxFQUFFLEdBQUc7UUFDbEIsS0FBSyxFQUFFLEdBQUc7UUFDVixPQUFPLEVBQUUsR0FBRztRQUNaLElBQUksRUFBRSxHQUFHO1FBQ1QsU0FBUyxFQUFFLEdBQUc7UUFDZCxRQUFRLEVBQUUsR0FBRztRQUNiLGFBQWEsRUFBRSxHQUFHO1FBQ2xCLGFBQWEsRUFBRSxHQUFHO0tBQ2xCLENBQUM7SUFDRixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDakMsT0FBTyxNQUFBLEdBQUcsQ0FBQyxHQUFHLENBQUMsbUNBQUksTUFBTSxDQUFDO0FBQzNCLENBQUM7QUFFRCxNQUFNLFVBQVUsa0JBQWtCLENBQ2pDLE1BQWMsRUFDZCxJQUFVLEVBQ1YsU0FBc0I7SUFFdEIsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUU7UUFDNUMsR0FBRyxFQUFFLHlCQUF5QjtRQUM5QixJQUFJLEVBQUUsVUFBVTtLQUNoQixDQUFDLENBQUM7SUFDSCxNQUFNLE1BQU0sR0FBRyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM3QyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxNQUFNLENBQUM7SUFDL0IsUUFBUSxDQUFDLE9BQU8sR0FBRyxNQUFNLEtBQUssR0FBRyxDQUFDO0lBRWxDLE9BQU8sUUFBUSxDQUFDO0FBQ2pCLENBQUM7QUFFRCxNQUFNLE9BQU8sb0JBQXFCLFNBQVEsU0FBUztJQWVsRCxZQUNTLFFBQXFCLEVBQ3JCLEdBQVEsRUFDUixNQUE2QjtRQUVyQyxLQUFLLEVBQUUsQ0FBQztRQUpBLGFBQVEsR0FBUixRQUFRLENBQWE7UUFDckIsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUNSLFdBQU0sR0FBTixNQUFNLENBQXVCO1FBZi9CLGdCQUFXLEdBQWdCLElBQUksQ0FBQztRQUMvQixjQUFTLEdBQVksSUFBSSxDQUFDO1FBQzFCLGNBQVMsR0FBWSxLQUFLLENBQUM7UUFDM0IsZUFBVSxHQUF1QixJQUFJLENBQUM7SUFlOUMsQ0FBQztJQUVELE1BQU07UUFDTCwyQkFBMkI7UUFDM0IsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQztZQUMxQyxHQUFHLEVBQUUsY0FBYztTQUNuQixDQUFDLENBQUM7UUFFSCxzQkFBc0I7UUFDdEIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ3ZCLENBQUM7SUFFTyxjQUFjO1FBQ3JCLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFekIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUsZUFBZSxFQUFFLENBQUMsQ0FBQztRQUNyRSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUVPLGFBQWE7O1FBQ3BCLE9BQU8sQ0FBQSxNQUFBLElBQUksQ0FBQyxXQUFXLDBDQUFFLE1BQU0sS0FBSSxFQUFFLENBQUM7SUFDdkMsQ0FBQztJQUVNLGVBQWUsQ0FBQyxJQUFVO1FBQ2hDLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLElBQUksRUFBRTtZQUNWLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN0QixPQUFPO1NBQ1A7UUFFRCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztRQUN4QixJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztRQUV2Qix5QkFBeUI7UUFDekIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUV6Qix3QkFBd0I7UUFDeEIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZFLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7UUFFcEMsOERBQThEO1FBQzlELElBQ0MsUUFBUSxDQUFDLE9BQU87WUFDaEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsc0JBQXNCLENBQUMsRUFDL0M7WUFDRCxRQUFRLENBQUMsUUFBUSxDQUNoQixLQUFLLEVBQ0w7Z0JBQ0MsR0FBRyxFQUFFLG1CQUFtQjthQUN4QixFQUNELENBQUMsRUFBRSxFQUFFLEVBQUU7Z0JBQ04sSUFBSSxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRTtvQkFDdEQsSUFBSSxDQUFDLHVCQUF1Qjt3QkFDM0IsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUN0QyxDQUFDLENBQUMsQ0FBQztZQUNKLENBQUMsQ0FDRCxDQUFDO1NBQ0Y7UUFFRCwyQkFBMkI7UUFDM0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxpQkFBaUIsRUFBRSxDQUFDLENBQUM7UUFFeEUsWUFBWTtRQUNaLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEdBQUcsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBQ3RFLE1BQU0sQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBRTVDLGNBQWM7UUFDZCxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSwwQkFBMEIsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUU7WUFDcEUsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxzQkFBc0IsRUFBRSxDQUFDLENBQUM7WUFDOUQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUU3QixNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLGdCQUFnQixFQUFFLENBQUMsQ0FBQztZQUN6RCxRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ3pELENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxlQUFlLEdBQUcsSUFBSSxlQUFlLENBQzFDLElBQUksQ0FBQyxNQUFNLEVBQ1gsSUFBSSxDQUFDLFNBQVMsRUFDZCxJQUFJLEVBQ0o7WUFDQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7U0FDL0IsQ0FDRCxDQUFDO1FBRUYsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUUvQixtQkFBbUI7UUFDbkIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO1FBRXJFLHlCQUF5QjtRQUN6QiwrQkFBK0I7UUFDL0Isb0VBQW9FO1FBQ3BFLElBQUk7UUFFSiwrQkFBK0I7UUFDL0IsNkVBQTZFO1FBQzdFLDJEQUEyRDtRQUMzRCxJQUFJO1FBRUosaUNBQWlDO1FBQ2pDLGlGQUFpRjtRQUNqRiwrREFBK0Q7UUFDL0QsSUFBSTtRQUVKLHFDQUFxQztRQUNyQyx1Q0FBdUM7UUFDdkMsZ0NBQWdDO1FBQ2hDLDJCQUEyQjtRQUMzQix1RUFBdUU7UUFDdkUsSUFBSTtRQUVKLHFDQUFxQztRQUNyQyx1Q0FBdUM7UUFDdkMsZ0NBQWdDO1FBQ2hDLDJCQUEyQjtRQUMzQixrRUFBa0U7UUFDbEUsSUFBSTtRQUVKLGdDQUFnQztRQUNoQyw2QkFBNkI7UUFDN0IscUNBQXFDO1FBQ3JDLFlBQVk7UUFDWiw4QkFBOEI7UUFDOUIsWUFBWTtRQUNaLFlBQVk7UUFDWiwyQkFBMkI7UUFDM0IsWUFBWTtRQUNaLFlBQVk7UUFDWiw4QkFBOEI7UUFDOUIsWUFBWTtRQUNaLFlBQVk7UUFDWiw0QkFBNEI7UUFDNUIsWUFBWTtRQUNaLFlBQVk7UUFDWiwrQkFBK0I7UUFDL0IsWUFBWTtRQUNaLGFBQWE7UUFDYiwyQkFBMkI7UUFDM0IsS0FBSztRQUNMLDREQUE0RDtRQUM1RCxJQUFJO1FBRUosNkRBQTZEO1FBQzdELHlFQUF5RTtRQUN6RSxJQUFJO1FBRUosK0JBQStCO1FBQy9CLG9FQUFvRTtRQUNwRSxJQUFJO1FBRUosa0NBQWtDO1FBQ2xDLDBFQUEwRTtRQUMxRSxJQUFJO1FBRUoscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUV4RCxzQkFBc0I7UUFDdEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO1FBRXZFLHVCQUF1QjtRQUN2QixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXhCLHNCQUFzQjtRQUN0QixNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRTtZQUNsRCxHQUFHLEVBQUUsdUJBQXVCO1NBQzVCLENBQUMsQ0FBQztRQUNILGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7UUFFekMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFO1lBQ2xELElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRTtnQkFDcEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUN0QjtpQkFBTTtnQkFDTixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3BCO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCwyQkFBMkI7UUFDM0IsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUU7WUFDOUMsR0FBRyxFQUFFLG9CQUFvQjtTQUN6QixDQUFDLENBQUM7UUFDSCxTQUFTLENBQUMsT0FBTyxDQUNoQixJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUMxRCxDQUFDO1FBRUYsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFO1lBQzlDLElBQUksSUFBSSxDQUFDLG9CQUFvQixFQUFFO2dCQUM5QixJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDaEM7UUFDRixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTyxZQUFZLENBQUMsSUFBVTtRQUM5QixJQUFJLENBQUMsSUFBSTtZQUFFLE9BQU87UUFFbEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7UUFFdEIsbUJBQW1CO1FBQ25CLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUM7WUFDMUMsR0FBRyxFQUFFLG1CQUFtQjtTQUN4QixDQUFDLENBQUM7UUFFSCxxQkFBcUI7UUFDckIsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FDeEMsSUFBSSxDQUFDLFVBQVUsRUFDZixDQUFDLENBQUMsWUFBWSxDQUFDLENBQ2YsQ0FBQztRQUNGLE1BQU0sWUFBWSxHQUFHLElBQUksYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3JELE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDeEQsWUFBWSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDbkQsWUFBWSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUV0RCxtQkFBbUI7UUFDbkIsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FDeEMsSUFBSSxDQUFDLFVBQVUsRUFDZixDQUFDLENBQUMsU0FBUyxDQUFDLENBQ1osQ0FBQztRQUVGLDRDQUE0QztRQUM1QyxNQUFNLGdCQUFnQixHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25ELE1BQU0sVUFBVSxHQUFHLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTNDLE1BQU0sWUFBWSxHQUFHLElBQUksYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3JELFlBQVksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLElBQUksRUFBRSxDQUFDLENBQUM7UUFFOUMsK0VBQStFO1FBQy9FLElBQ0MsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTO1lBQ3ZCLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQ3hEO1lBQ0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUM7WUFDMUMsTUFBTSxTQUFTLEdBQUcsWUFBWSxDQUFDLFNBQVMsQ0FBQztnQkFDeEMsR0FBRyxFQUFFLDBCQUEwQjthQUMvQixDQUFDLENBQUM7WUFFSCxnREFBZ0Q7WUFDaEQsSUFBSSxhQUFhLEdBQUcsRUFBRSxDQUFDO1lBQ3ZCLElBQUksYUFBYSxHQUFHLEVBQUUsQ0FBQztZQUV2QixRQUFRLFNBQVMsQ0FBQyxJQUFJLEVBQUU7Z0JBQ3ZCLEtBQUssTUFBTTtvQkFDVixhQUFhO3dCQUNaLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLEtBQUssU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUN4RCxhQUFhLEdBQUcsSUFBSSxDQUFDO29CQUNyQixNQUFNO2dCQUNQLEtBQUssVUFBVTtvQkFDZCxhQUFhO3dCQUNaLENBQUMsQ0FBQyxrQ0FBa0MsQ0FBQzs0QkFDckMsS0FBSyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ3pCLGFBQWEsR0FBRyxJQUFJLENBQUM7b0JBQ3JCLE1BQU07Z0JBQ1AsS0FBSyxRQUFRO29CQUNaLGFBQWE7d0JBQ1osQ0FBQyxDQUFDLGdDQUFnQyxDQUFDOzRCQUNuQyxLQUFLLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDekIsYUFBYSxHQUFHLElBQUksQ0FBQztvQkFDckIsTUFBTTtnQkFDUDtvQkFDQyxhQUFhO3dCQUNaLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxLQUFLLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDOUMsYUFBYSxHQUFHLElBQUksQ0FBQzthQUN0QjtZQUVELFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFO2dCQUMxQixHQUFHLEVBQUUsZ0JBQWdCO2dCQUNyQixJQUFJLEVBQUUsYUFBYTthQUNuQixDQUFDLENBQUM7WUFDSCxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRTtnQkFDMUIsR0FBRyxFQUFFLGdCQUFnQjtnQkFDckIsSUFBSSxFQUFFLGFBQWE7YUFDbkIsQ0FBQyxDQUFDO1lBRUgsSUFBSSxVQUFVLEVBQUU7Z0JBQ2YsU0FBUyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO2dCQUN6QyxZQUFZLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMvQixZQUFZLENBQUMsU0FBUyxDQUFDO29CQUN0QixHQUFHLEVBQUUsd0NBQXdDO29CQUM3QyxJQUFJLEVBQUUsQ0FBQyxDQUNOLDhEQUE4RCxDQUM5RDtpQkFDRCxDQUFDLENBQUM7YUFDSDtpQkFBTTtnQkFDTixTQUFTLENBQUMsUUFBUSxDQUFDLG9CQUFvQixDQUFDLENBQUM7Z0JBQ3pDLFlBQVksQ0FBQyxTQUFTLENBQUM7b0JBQ3RCLEdBQUcsRUFBRSx3Q0FBd0M7b0JBQzdDLElBQUksRUFBRSxDQUFDLENBQ04sMEVBQTBFLENBQzFFO2lCQUNELENBQUMsQ0FBQzthQUNIO1NBQ0Q7UUFFRCxJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLFlBQVksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRWhFLGFBQWE7UUFDYixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDbkUsTUFBTSxTQUFTLEdBQUcsSUFBSSxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDL0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDeEQsaURBQWlEO1FBQ2pELFNBQVMsQ0FBQyxRQUFRLENBQ2pCLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSTtZQUNqQixDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJO2lCQUNqQixHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUNaLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FDeEM7aUJBQ0EsSUFBSSxDQUFDLElBQUksQ0FBQztZQUNiLENBQUMsQ0FBQyxFQUFFLENBQ0wsQ0FBQztRQUNGLFNBQVM7YUFDUCxVQUFVLENBQUMsRUFBRSxHQUFHLEVBQUUsbUJBQW1CLEVBQUUsQ0FBQzthQUN4QyxPQUFPLENBQ1AsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQywwQkFBMEIsQ0FBQyxDQUMxRCxDQUFDO1FBRUgsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUV6RCxnQkFBZ0I7UUFDaEIsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FDeEMsSUFBSSxDQUFDLFVBQVUsRUFDZixDQUFDLENBQUMsU0FBUyxDQUFDLENBQ1osQ0FBQztRQUNGLE1BQU0sWUFBWSxHQUFHLElBQUksYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3JELFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDLENBQUM7UUFFbkQsSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxZQUFZLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVoRSxvQkFBb0I7UUFDcEIsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FDekMsSUFBSSxDQUFDLFVBQVUsRUFDZixDQUFDLENBQUMsVUFBVSxDQUFDLENBQ2IsQ0FBQztRQUNGLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUM5RCxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQzFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ3JELGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ2xELGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ3JELGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ2xELGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ3RELElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUU7WUFDM0IsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7U0FDN0Q7YUFBTTtZQUNOLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUM5QjtRQUVELFdBQVc7UUFDWCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsZUFBZSxDQUN4QyxJQUFJLENBQUMsVUFBVSxFQUNmLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FDYixDQUFDO1FBQ0YsTUFBTSxZQUFZLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUU7WUFDbkQsSUFBSSxFQUFFLE1BQU07WUFDWixHQUFHLEVBQUUsWUFBWTtTQUNqQixDQUFDLENBQUM7UUFDSCxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFO1lBQzFCLG1FQUFtRTtZQUNuRSxZQUFZLENBQUMsS0FBSyxHQUFHLDBCQUEwQixDQUM5QyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FDckIsQ0FBQztTQUNGLENBQUMsYUFBYTtRQUNmLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQzFDLElBQUksQ0FBQyxVQUFVLEVBQ2YsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUNmLENBQUM7UUFDRixNQUFNLGNBQWMsR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRTtZQUN2RCxJQUFJLEVBQUUsTUFBTTtZQUNaLEdBQUcsRUFBRSxZQUFZO1NBQ2pCLENBQUMsQ0FBQztRQUNILElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUU7WUFDNUIsbUVBQW1FO1lBQ25FLGNBQWMsQ0FBQyxLQUFLLEdBQUcsMEJBQTBCLENBQ2hELElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUN2QixDQUFDO1NBQ0Y7UUFFRCxpQkFBaUI7UUFDakIsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUM5QyxJQUFJLENBQUMsVUFBVSxFQUNmLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUNuQixDQUFDO1FBQ0YsTUFBTSxrQkFBa0IsR0FBRyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFO1lBQy9ELElBQUksRUFBRSxNQUFNO1lBQ1osR0FBRyxFQUFFLFlBQVk7U0FDakIsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRTtZQUNoQyxtRUFBbUU7WUFDbkUsa0JBQWtCLENBQUMsS0FBSyxHQUFHLDBCQUEwQixDQUNwRCxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FDM0IsQ0FBQztTQUNGO1FBRUQsaUJBQWlCO1FBQ2pCLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FDOUMsSUFBSSxDQUFDLFVBQVUsRUFDZixDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FDbkIsQ0FBQztRQUNGLE1BQU0sa0JBQWtCLEdBQUcsa0JBQWtCLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRTtZQUMvRCxJQUFJLEVBQUUsTUFBTTtZQUNaLEdBQUcsRUFBRSxZQUFZO1NBQ2pCLENBQUMsQ0FBQztRQUNILElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUU7WUFDaEMsbUVBQW1FO1lBQ25FLGtCQUFrQixDQUFDLEtBQUssR0FBRywwQkFBMEIsQ0FDcEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQzNCLENBQUM7U0FDRjtRQUVELHVCQUF1QjtRQUN2QixNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxlQUFlLENBQzdDLElBQUksQ0FBQyxVQUFVLEVBQ2YsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUNsQixDQUFDO1FBRUYsbUNBQW1DO1FBQ25DLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxHQUFTLEVBQUU7WUFDcEMsNkJBQTZCO1lBQzdCLE1BQU0sV0FBVyxxQkFBYyxJQUFJLENBQUUsQ0FBQztZQUV0Qyx5QkFBeUI7WUFDekIsTUFBTSxVQUFVLEdBQUcsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQzNDLFdBQVcsQ0FBQyxPQUFPLEdBQUcsVUFBVSxDQUFDO1lBRWpDLDZCQUE2QjtZQUM3QixNQUFNLFFBQVEscUJBQVEsV0FBVyxDQUFDLFFBQVEsQ0FBRSxDQUFDO1lBRTdDLG1FQUFtRTtZQUNuRSxNQUFNLFlBQVksR0FBRyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDN0MsSUFBSSxDQUFDLFVBQVUsRUFBRTtnQkFDaEIsUUFBUSxDQUFDLE9BQU8sR0FBRyxZQUFZLElBQUksU0FBUyxDQUFDO2FBQzdDO2lCQUFNO2dCQUNOLDREQUE0RDtnQkFDNUQsUUFBUSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQzthQUN6QztZQUVELHFEQUFxRDtZQUNyRCxNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDdkMsUUFBUSxDQUFDLElBQUksR0FBRyxTQUFTO2dCQUN4QixDQUFDLENBQUMsU0FBUztxQkFDUixLQUFLLENBQUMsR0FBRyxDQUFDO3FCQUNWLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO3FCQUN4QixHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUNaLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FDeEMsQ0FBQyw2QkFBNkI7cUJBQzlCLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDO2dCQUN2QixDQUFDLENBQUMsRUFBRSxDQUFDO1lBRU4saUJBQWlCO1lBQ2pCLE1BQU0sWUFBWSxHQUFHLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUM3QyxRQUFRLENBQUMsT0FBTyxHQUFHLFlBQVksSUFBSSxTQUFTLENBQUM7WUFFN0MsNEJBQTRCO1lBQzVCLE1BQU0sYUFBYSxHQUFHLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2xELFFBQVEsQ0FBQyxRQUFRLEdBQUcsYUFBYTtnQkFDaEMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUM7Z0JBQ3pCLENBQUMsQ0FBQyxTQUFTLENBQUM7WUFFYiwyQ0FBMkM7WUFDM0MsTUFBTSxZQUFZLEdBQUcsWUFBWSxDQUFDLEtBQUssQ0FBQztZQUN4QyxJQUFJLFlBQVksRUFBRTtnQkFDakIsZ0VBQWdFO2dCQUNoRSxNQUFNLFVBQVUsR0FBRywwQkFBMEIsQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFDNUQsd0VBQXdFO2dCQUN4RSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxLQUFLLFVBQVUsRUFBRTtvQkFDekMsUUFBUSxDQUFDLE9BQU8sR0FBRyxVQUFVLENBQUM7aUJBQzlCO3FCQUFNO29CQUNOLFFBQVEsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7aUJBQ3pDO2FBQ0Q7aUJBQU0sSUFBSSxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRTtnQkFDbEQsOERBQThEO2dCQUM5RCxRQUFRLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQzthQUM3QjtpQkFBTTtnQkFDTixrREFBa0Q7Z0JBQ2xELFFBQVEsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7YUFDekM7WUFFRCxNQUFNLGNBQWMsR0FBRyxjQUFjLENBQUMsS0FBSyxDQUFDO1lBQzVDLElBQUksY0FBYyxFQUFFO2dCQUNuQixnRUFBZ0U7Z0JBQ2hFLE1BQU0sWUFBWSxHQUFHLDBCQUEwQixDQUFDLGNBQWMsQ0FBQyxDQUFDO2dCQUNoRSx3RUFBd0U7Z0JBQ3hFLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEtBQUssWUFBWSxFQUFFO29CQUM3QyxRQUFRLENBQUMsU0FBUyxHQUFHLFlBQVksQ0FBQztpQkFDbEM7cUJBQU07b0JBQ04sUUFBUSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQztpQkFDN0M7YUFDRDtpQkFBTSxJQUFJLENBQUMsY0FBYyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFO2dCQUN0RCw4REFBOEQ7Z0JBQzlELFFBQVEsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO2FBQy9CO2lCQUFNO2dCQUNOLGtEQUFrRDtnQkFDbEQsUUFBUSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQzthQUM3QztZQUVELE1BQU0sa0JBQWtCLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxDQUFDO1lBQ3BELElBQUksa0JBQWtCLEVBQUU7Z0JBQ3ZCLGdFQUFnRTtnQkFDaEUsTUFBTSxnQkFBZ0IsR0FDckIsMEJBQTBCLENBQUMsa0JBQWtCLENBQUMsQ0FBQztnQkFDaEQsd0VBQXdFO2dCQUN4RSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxLQUFLLGdCQUFnQixFQUFFO29CQUNyRCxRQUFRLENBQUMsYUFBYSxHQUFHLGdCQUFnQixDQUFDO2lCQUMxQztxQkFBTTtvQkFDTixRQUFRLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDO2lCQUNyRDthQUNEO2lCQUFNLElBQUksQ0FBQyxrQkFBa0IsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRTtnQkFDOUQsOERBQThEO2dCQUM5RCxRQUFRLENBQUMsYUFBYSxHQUFHLFNBQVMsQ0FBQzthQUNuQztpQkFBTTtnQkFDTixrREFBa0Q7Z0JBQ2xELFFBQVEsQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUM7YUFDckQ7WUFFRCxNQUFNLGtCQUFrQixHQUFHLGtCQUFrQixDQUFDLEtBQUssQ0FBQztZQUNwRCxJQUFJLGtCQUFrQixFQUFFO2dCQUN2QixnRUFBZ0U7Z0JBQ2hFLE1BQU0sZ0JBQWdCLEdBQ3JCLDBCQUEwQixDQUFDLGtCQUFrQixDQUFDLENBQUM7Z0JBQ2hELHdFQUF3RTtnQkFDeEUsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsS0FBSyxnQkFBZ0IsRUFBRTtvQkFDckQsUUFBUSxDQUFDLGFBQWEsR0FBRyxnQkFBZ0IsQ0FBQztpQkFDMUM7cUJBQU07b0JBQ04sUUFBUSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQztpQkFDckQ7YUFDRDtpQkFBTSxJQUFJLENBQUMsa0JBQWtCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUU7Z0JBQzlELDhEQUE4RDtnQkFDOUQsUUFBUSxDQUFDLGFBQWEsR0FBRyxTQUFTLENBQUM7YUFDbkM7aUJBQU07Z0JBQ04sa0RBQWtEO2dCQUNsRCxRQUFRLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDO2FBQ3JEO1lBRUQsMERBQTBEO1lBRTFELHNCQUFzQjtZQUN0QixNQUFNLGNBQWMsR0FBRyxjQUFjLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDakQsUUFBUSxDQUFDLFNBQVMsR0FBRyxjQUFjO2dCQUNsQyxDQUFDLENBQUMsY0FBYztxQkFDYixLQUFLLENBQUMsR0FBRyxDQUFDO3FCQUNWLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO3FCQUN0QixNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQztnQkFDckIsQ0FBQyxDQUFDLFNBQVMsQ0FBQztZQUViLE1BQU0saUJBQWlCLEdBQUcsd0JBQXdCLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDOUQsUUFBUSxDQUFDLFlBQVksR0FBRyxpQkFBaUIsSUFBSSxTQUFTLENBQUM7WUFFdkQsaUJBQWlCO1lBQ2pCLE1BQU0sV0FBVyxHQUFHLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUMzQyxRQUFRLENBQUMsRUFBRSxHQUFHLFdBQVcsSUFBSSxTQUFTLENBQUM7WUFFdkMsb0JBQW9CO1lBQ3BCLE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNuRCxRQUFRLENBQUMsVUFBVSxHQUFHLGVBQWUsSUFBSSxTQUFTLENBQUM7WUFFbkQsdUNBQXVDO1lBQ3ZDLFdBQVcsQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1lBRWhDLHFEQUFxRDtZQUNyRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztZQUUxRCxxREFBcUQ7WUFDckQsSUFBSSxJQUFJLENBQUMsWUFBWSxJQUFJLFVBQVUsRUFBRTtnQkFDcEMsSUFBSTtvQkFDSCxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO29CQUUzQyw0QkFBNEI7b0JBQzVCLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO29CQUMvQixJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztvQkFDdkIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsQ0FBQztpQkFDbEM7Z0JBQUMsT0FBTyxLQUFLLEVBQUU7b0JBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxLQUFLLENBQUMsQ0FBQztvQkFDL0MsbUNBQW1DO2lCQUNuQzthQUNEO1FBQ0YsQ0FBQyxDQUFBLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyw0REFBNEQ7UUFFckUsd0NBQXdDO1FBQ3hDLE1BQU0sd0JBQXdCLEdBQUcsSUFBSSx3QkFBd0IsQ0FDNUQsaUJBQWlCLEVBQ2pCLElBQUksQ0FBQyxNQUFNLEVBQ1g7WUFDQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLElBQUksRUFBRTtZQUM5QyxRQUFRLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDbkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztnQkFDakQseUVBQXlFO2dCQUN6RSxxREFBcUQ7Z0JBQ3JELE1BQU0sTUFBTSxHQUFHLHdCQUF3QixDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNwRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsNkJBQTZCLENBQ3BELE1BQU0sRUFDTixLQUFLLENBQ0wsQ0FBQztnQkFFRixJQUFJLFVBQVUsRUFBRTtvQkFDZixpRUFBaUU7b0JBQ2pFLCtEQUErRDtvQkFDL0QsUUFBUSxFQUFFLENBQUM7aUJBQ1g7WUFDRixDQUFDO1lBQ0Qsa0JBQWtCLEVBQUUsQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUU7Z0JBQ3RDLDJCQUEyQjtnQkFDM0IsTUFBTSxlQUFlLEdBQUcsaUJBQWlCLENBQUMsYUFBYSxDQUN0RCxrQ0FBa0MsQ0FDbEMsQ0FBQztnQkFDRixJQUFJLGVBQWUsRUFBRTtvQkFDcEIsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDO2lCQUN6QjtnQkFFRCxJQUFJLEtBQUssRUFBRTtvQkFDVixNQUFNLFNBQVMsR0FBRyxpQkFBaUIsQ0FBQyxTQUFTLENBQUM7d0JBQzdDLEdBQUcsRUFBRSx1Q0FBdUM7d0JBQzVDLElBQUksRUFBRSxLQUFLO3FCQUNYLENBQUMsQ0FBQztpQkFDSDtxQkFBTSxJQUFJLE9BQU8sRUFBRTtvQkFDbkIsTUFBTSxTQUFTLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxDQUFDO3dCQUM3QyxHQUFHLEVBQUUseUNBQXlDO3dCQUM5QyxJQUFJLEVBQUUsQ0FBQyxDQUFDLHdCQUF3QixDQUFDO3FCQUNqQyxDQUFDLENBQUM7aUJBQ0g7WUFDRixDQUFDO1NBQ0QsQ0FDRCxDQUFDO1FBRUYsSUFBSSxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBRXhDLGVBQWU7UUFDZixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUMxQyxJQUFJLENBQUMsVUFBVSxFQUNmLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FDZixDQUFDO1FBQ0YsTUFBTSxjQUFjLEdBQUcsSUFBSSxhQUFhLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDekQsY0FBYyxDQUFDLFFBQVEsQ0FDdEIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQztZQUNyQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztZQUNwQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLElBQUksRUFBRSxDQUNoQyxDQUFDO1FBQ0YsY0FBYzthQUNaLFVBQVUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxtQkFBbUIsRUFBRSxDQUFDO2FBQ3hDLE9BQU8sQ0FDUCxDQUFDLENBQUMsdURBQXVELENBQUMsQ0FDMUQsQ0FBQztRQUVILFVBQVU7UUFDVixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDeEUsTUFBTSxXQUFXLEdBQUcsSUFBSSxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDbkQsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUM3QyxXQUFXO2FBQ1QsVUFBVSxDQUFDLEVBQUUsR0FBRyxFQUFFLG1CQUFtQixFQUFFLENBQUM7YUFDeEMsT0FBTyxDQUFDLENBQUMsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLENBQUM7UUFFaEQscUJBQXFCO1FBQ3JCLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQzNDLElBQUksQ0FBQyxVQUFVLEVBQ2YsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUNmLENBQUM7UUFDRixNQUFNLGVBQWUsR0FBRyxJQUFJLGFBQWEsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUMzRCxlQUFlLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELGVBQWU7YUFDYixVQUFVLENBQUMsRUFBRSxHQUFHLEVBQUUsbUJBQW1CLEVBQUUsQ0FBQzthQUN4QyxPQUFPLENBQUMsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQztRQUU5Qyw4Q0FBOEM7UUFDOUMsTUFBTSxpQkFBaUIsR0FBRyxDQUN6QixFQUF3QyxFQUN2QyxFQUFFO1lBQ0gsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFO2dCQUN0QyxRQUFRLEVBQUUsQ0FBQztZQUNaLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDO1FBRUYseUNBQXlDO1FBQ3pDLE1BQU0sdUJBQXVCLEdBQUcsQ0FBQyxFQUFvQixFQUFFLEVBQUU7WUFDeEQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFO2dCQUN4QyxRQUFRLEVBQUUsQ0FBQztZQUNaLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDO1FBRUYsOEJBQThCO1FBQzlCLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN4QyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDeEMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3JDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN4QyxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM3QyxnRUFBZ0U7UUFDaEUsbUNBQW1DO1FBQ25DLHFDQUFxQztRQUNyQyx5Q0FBeUM7UUFDekMsK0VBQStFO1FBQy9FLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMxQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdkMsaUJBQWlCLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRTNDLHlDQUF5QztRQUN6Qyx1QkFBdUIsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN0Qyx1QkFBdUIsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUN4Qyx1QkFBdUIsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQzVDLHVCQUF1QixDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUVPLGNBQWMsQ0FDckIsWUFBNkIsRUFDN0IsV0FBNEI7UUFFNUIsNEVBQTRFO1FBQzVFLG9FQUFvRTtRQUNwRSxNQUFNLFVBQVUsR0FDZixZQUFZLElBQUksWUFBWSxJQUFJLFlBQVksQ0FBQyxVQUFVLENBQUM7UUFFekQsSUFBSSxVQUFVLEVBQUU7WUFDZix5REFBeUQ7WUFDekQsTUFBTSxZQUFZLHFCQUFRLFlBQVksQ0FBRSxDQUFDO1lBQ3pDLE1BQU0sV0FBVyxxQkFBUSxXQUFXLENBQUUsQ0FBQztZQUV2QyxrREFBa0Q7WUFDbEQsSUFBSSxhQUFhLElBQUksWUFBWSxFQUFFO2dCQUNsQyxPQUFRLFlBQW9CLENBQUMsV0FBVyxDQUFDO2FBQ3pDO1lBQ0QsSUFBSSxhQUFhLElBQUksV0FBVyxFQUFFO2dCQUNqQyxPQUFRLFdBQW1CLENBQUMsV0FBVyxDQUFDO2FBQ3hDO1lBRUQsSUFBSTtnQkFDSCxPQUFPLENBQ04sSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsS0FBSyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUM1RCxDQUFDO2FBQ0Y7WUFBQyxPQUFPLEtBQUssRUFBRTtnQkFDZixPQUFPLENBQUMsSUFBSSxDQUNYLG1GQUFtRixFQUNuRixLQUFLLENBQ0wsQ0FBQztnQkFDRixPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxZQUFZLEVBQUUsV0FBVyxDQUFDLENBQUM7YUFDN0Q7U0FDRDthQUFNO1lBQ04sMERBQTBEO1lBQzFELElBQUk7Z0JBQ0gsT0FBTyxDQUNOLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEtBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FDNUQsQ0FBQzthQUNGO1lBQUMsT0FBTyxLQUFLLEVBQUU7Z0JBQ2YsT0FBTyxDQUFDLElBQUksQ0FDWCxtRkFBbUYsRUFDbkYsS0FBSyxDQUNMLENBQUM7Z0JBQ0YsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFDO2FBQzdEO1NBQ0Q7SUFDRixDQUFDO0lBRU8scUJBQXFCLENBQzVCLFlBQTZCLEVBQzdCLFdBQTRCO1FBRTVCLHdEQUF3RDtRQUN4RCxNQUFNLFlBQVksR0FBRztZQUNwQixTQUFTO1lBQ1Qsa0JBQWtCO1lBQ2xCLFNBQVM7WUFDVCxNQUFNO1lBQ04sU0FBUztZQUNULFVBQVU7WUFDVixTQUFTO1lBQ1QsV0FBVztZQUNYLGVBQWU7WUFDZixlQUFlO1lBQ2YsY0FBYztZQUNkLFdBQVc7WUFDWCxJQUFJO1lBQ0osWUFBWTtTQUNaLENBQUM7UUFFRixLQUFLLE1BQU0sSUFBSSxJQUFJLFlBQVksRUFBRTtZQUNoQyxNQUFNLGFBQWEsR0FBSSxZQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xELE1BQU0sWUFBWSxHQUFJLFdBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFaEQsbUNBQW1DO1lBQ25DLElBQUksSUFBSSxLQUFLLE1BQU0sRUFBRTtnQkFDcEIsTUFBTSxZQUFZLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUM7b0JBQ2hELENBQUMsQ0FBQyxhQUFhO29CQUNmLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ04sTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUM7b0JBQzlDLENBQUMsQ0FBQyxZQUFZO29CQUNkLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBRU4sSUFBSSxZQUFZLENBQUMsTUFBTSxLQUFLLFdBQVcsQ0FBQyxNQUFNLEVBQUU7b0JBQy9DLE9BQU8sSUFBSSxDQUFDO2lCQUNaO2dCQUVELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO29CQUM3QyxJQUFJLFlBQVksQ0FBQyxDQUFDLENBQUMsS0FBSyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUU7d0JBQ3ZDLE9BQU8sSUFBSSxDQUFDO3FCQUNaO2lCQUNEO2FBQ0Q7aUJBQU07Z0JBQ04sMEJBQTBCO2dCQUMxQixJQUFJLGFBQWEsS0FBSyxZQUFZLEVBQUU7b0JBQ25DLE9BQU8sSUFBSSxDQUFDO2lCQUNaO2FBQ0Q7U0FDRDtRQUVELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVPLGVBQWUsQ0FDdEIsU0FBc0IsRUFDdEIsS0FBYTtRQUViLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDO1FBRW5FLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUsb0JBQW9CLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFFOUQsT0FBTyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLG9CQUFvQixFQUFFLENBQUMsQ0FBQztJQUN6RCxDQUFDO0lBRU8sZ0JBQWdCLENBQ3ZCLFNBQXNCLEVBQ3RCLEtBQWEsRUFDYixLQUFhO1FBRWIsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLENBQUM7UUFFL0QsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLENBQUM7UUFDN0QsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUV2QixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLGdCQUFnQixFQUFFLENBQUMsQ0FBQztRQUM3RCxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3hCLENBQUM7SUFFYSxRQUFRLENBQUMsSUFBcUI7OztZQUMzQyxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsSUFBSSxZQUFZLElBQUksSUFBSSxFQUFFO2dCQUNyRCxNQUFNLFFBQVEsR0FBRyxJQUFnQixDQUFDO2dCQUNsQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQ3hDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FDOUIsQ0FBQztnQkFDRixJQUFJLENBQUMsSUFBSTtvQkFBRSxPQUFPO2dCQUNsQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzlDLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDMUIsTUFBTSxNQUFNLEdBQUcsTUFBQSxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxZQUFZLDBDQUFFLE1BQU0sQ0FBQztnQkFDdkQsSUFBSSxNQUFNLEVBQUU7b0JBQ1gsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDdEQsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO2lCQUNmO2dCQUNELE9BQU87YUFDUDtZQUVELDhCQUE4QjtZQUM5QixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3pELElBQUksQ0FBQyxJQUFJO2dCQUFFLE9BQU87WUFFbEIsZ0JBQWdCO1lBQ2hCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUMvQyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFMUIsMkNBQTJDO1lBQzNDLE1BQU0sTUFBTSxHQUFHLE1BQUEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsWUFBWSwwQ0FBRSxNQUFNLENBQUM7WUFDdkQsSUFBSSxNQUFNLEVBQUU7Z0JBQ1gsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDbEQsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO2FBQ2Y7O0tBQ0Q7SUFFTSxVQUFVLENBQUMsT0FBZ0I7UUFDakMsSUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUM7UUFFekIsSUFBSSxPQUFPLEVBQUU7WUFDWixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3JDLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ3ZDO2FBQU07WUFDTixJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNwQyxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUV4QyxrREFBa0Q7WUFDbEQsVUFBVSxDQUFDLEdBQUcsRUFBRTtnQkFDZixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRTtvQkFDcEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztpQkFDeEI7WUFDRixDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxtQ0FBbUM7U0FDNUM7SUFDRixDQUFDO0lBRU0sY0FBYztRQUNwQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUM7SUFDekIsQ0FBQztJQUVNLGtCQUFrQjtRQUN4QixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7SUFDdkIsQ0FBQztJQUVPLDZCQUE2QixDQUFDLE1BQVcsRUFBRSxLQUFhO1FBQy9ELCtCQUErQjtRQUMvQixJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQzVCLE9BQU8sS0FBSyxDQUFDO1NBQ2I7UUFFRCwwQ0FBMEM7UUFDMUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNaLE9BQU8sS0FBSyxDQUFDO1NBQ2I7UUFFRCwrQ0FBK0M7UUFDL0MsSUFDQyxNQUFNLENBQUMsSUFBSSxLQUFLLFFBQVE7WUFDeEIsTUFBTSxDQUFDLElBQUksS0FBSyxNQUFNO1lBQ3RCLE1BQU0sQ0FBQyxJQUFJLEtBQUssU0FBUztZQUN6QixNQUFNLENBQUMsSUFBSSxLQUFLLFdBQVcsRUFDMUI7WUFDRCxPQUFPLElBQUksQ0FBQztTQUNaO1FBRUQseUVBQXlFO1FBQ3pFLElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxVQUFVLEVBQUU7WUFDL0Isa0RBQWtEO1lBQ2xELE9BQU8sS0FBSyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztTQUNyQztRQUVELElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUU7WUFDM0IsaURBQWlEO1lBQ2pELE9BQU8sS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUNqQztRQUVELDRDQUE0QztRQUM1QyxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxRQUFRO1FBQ1AsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN6QixJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQzNCLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XHJcblx0Q29tcG9uZW50LFxyXG5cdEV4dHJhQnV0dG9uQ29tcG9uZW50LFxyXG5cdFRGaWxlLFxyXG5cdEJ1dHRvbkNvbXBvbmVudCxcclxuXHREcm9wZG93bkNvbXBvbmVudCxcclxuXHRUZXh0Q29tcG9uZW50LFxyXG5cdG1vbWVudCxcclxuXHRBcHAsXHJcblx0TWVudSxcclxuXHRkZWJvdW5jZSxcclxuXHRQbGF0Zm9ybSxcclxufSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgVGFzayB9IGZyb20gXCJAL3R5cGVzL3Rhc2tcIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5pbXBvcnQgeyBUYXNrUHJvZ3Jlc3NCYXJTZXR0aW5ncyB9IGZyb20gXCJAL2NvbW1vbi9zZXR0aW5nLWRlZmluaXRpb25cIjtcclxuaW1wb3J0IFwiQC9zdHlsZXMvdGFzay1kZXRhaWxzLmNzc1wiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgeyBjbGVhckFsbE1hcmtzIH0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9yZW5kZXJlcnMvTWFya2Rvd25SZW5kZXJlclwiO1xyXG5pbXBvcnQgeyBTdGF0dXNDb21wb25lbnQgfSBmcm9tIFwiQC9jb21wb25lbnRzL3VpL2ZlZWRiYWNrL1N0YXR1c0luZGljYXRvclwiO1xyXG5pbXBvcnQge1xyXG5cdENvbnRleHRTdWdnZXN0LFxyXG5cdFByb2plY3RTdWdnZXN0LFxyXG5cdFRhZ1N1Z2dlc3QsXHJcbn0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9pbnB1dHMvQXV0b0NvbXBsZXRlXCI7XHJcbmltcG9ydCB7IEZpbGVUYXNrIH0gZnJvbSBcIkAvdHlwZXMvZmlsZS10YXNrXCI7XHJcbmltcG9ydCB7XHJcblx0Z2V0RWZmZWN0aXZlUHJvamVjdCxcclxuXHRpc1Byb2plY3RSZWFkb25seSxcclxufSBmcm9tIFwiQC91dGlscy90YXNrL3Rhc2stb3BlcmF0aW9uc1wiO1xyXG5pbXBvcnQgeyBPbkNvbXBsZXRpb25Db25maWd1cmF0b3IgfSBmcm9tIFwiQC9jb21wb25lbnRzL2ZlYXR1cmVzL29uLWNvbXBsZXRpb24vT25Db21wbGV0aW9uQ29uZmlndXJhdG9yXCI7XHJcbmltcG9ydCB7XHJcblx0dGltZXN0YW1wVG9Mb2NhbERhdGVTdHJpbmcsXHJcblx0bG9jYWxEYXRlU3RyaW5nVG9UaW1lc3RhbXAsXHJcbn0gZnJvbSBcIkAvdXRpbHMvZGF0ZS9kYXRlLWRpc3BsYXktaGVscGVyXCI7XHJcblxyXG5mdW5jdGlvbiBnZXRTdGF0dXModGFzazogVGFzaywgc2V0dGluZ3M6IFRhc2tQcm9ncmVzc0JhclNldHRpbmdzKSB7XHJcblx0Y29uc3Qgc3RhdHVzID0gT2JqZWN0LmtleXMoc2V0dGluZ3MudGFza1N0YXR1c2VzKS5maW5kKChrZXkpID0+IHtcclxuXHRcdHJldHVybiBzZXR0aW5ncy50YXNrU3RhdHVzZXNba2V5IGFzIGtleW9mIHR5cGVvZiBzZXR0aW5ncy50YXNrU3RhdHVzZXNdXHJcblx0XHRcdC5zcGxpdChcInxcIilcclxuXHRcdFx0LmluY2x1ZGVzKHRhc2suc3RhdHVzKTtcclxuXHR9KTtcclxuXHJcblx0Y29uc3Qgc3RhdHVzVGV4dE1hcCA9IHtcclxuXHRcdG5vdFN0YXJ0ZWQ6IFwiTm90IFN0YXJ0ZWRcIixcclxuXHRcdGFiYW5kb25lZDogXCJBYmFuZG9uZWRcIixcclxuXHRcdHBsYW5uZWQ6IFwiUGxhbm5lZFwiLFxyXG5cdFx0Y29tcGxldGVkOiBcIkNvbXBsZXRlZFwiLFxyXG5cdFx0aW5Qcm9ncmVzczogXCJJbiBQcm9ncmVzc1wiLFxyXG5cdH07XHJcblxyXG5cdHJldHVybiBzdGF0dXNUZXh0TWFwW3N0YXR1cyBhcyBrZXlvZiB0eXBlb2Ygc3RhdHVzVGV4dE1hcF0gfHwgXCJObyBzdGF0dXNcIjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0YXR1c1RleHQoXHJcblx0c3RhdHVzOiBzdHJpbmcsXHJcblx0c2V0dGluZ3M6IFRhc2tQcm9ncmVzc0JhclNldHRpbmdzXHJcbikge1xyXG5cdGNvbnN0IHN0YXR1c1RleHRNYXAgPSB7XHJcblx0XHRub3RTdGFydGVkOiBcIk5vdCBTdGFydGVkXCIsXHJcblx0XHRhYmFuZG9uZWQ6IFwiQWJhbmRvbmVkXCIsXHJcblx0XHRwbGFubmVkOiBcIlBsYW5uZWRcIixcclxuXHRcdGNvbXBsZXRlZDogXCJDb21wbGV0ZWRcIixcclxuXHRcdGluUHJvZ3Jlc3M6IFwiSW4gUHJvZ3Jlc3NcIixcclxuXHR9O1xyXG5cclxuXHRyZXR1cm4gc3RhdHVzVGV4dE1hcFtzdGF0dXMgYXMga2V5b2YgdHlwZW9mIHN0YXR1c1RleHRNYXBdIHx8IFwiTm8gc3RhdHVzXCI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1hcFRleHRTdGF0dXNUb1N5bWJvbChzdGF0dXM6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0aWYgKCFzdGF0dXMpIHJldHVybiBcIiBcIjtcclxuXHRpZiAoc3RhdHVzLmxlbmd0aCA9PT0gMSkgcmV0dXJuIHN0YXR1czsgLy8gYWxyZWFkeSBhIHN5bWJvbCBtYXJrXHJcblx0Y29uc3QgbWFwOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xyXG5cdFx0Y29tcGxldGVkOiBcInhcIixcclxuXHRcdGRvbmU6IFwieFwiLFxyXG5cdFx0ZmluaXNoZWQ6IFwieFwiLFxyXG5cdFx0XCJpbi1wcm9ncmVzc1wiOiBcIi9cIixcclxuXHRcdFwiaW4gcHJvZ3Jlc3NcIjogXCIvXCIsXHJcblx0XHRkb2luZzogXCIvXCIsXHJcblx0XHRwbGFubmVkOiBcIj9cIixcclxuXHRcdHRvZG86IFwiP1wiLFxyXG5cdFx0Y2FuY2VsbGVkOiBcIi1cIixcclxuXHRcdGNhbmNlbGVkOiBcIi1cIixcclxuXHRcdFwibm90LXN0YXJ0ZWRcIjogXCIgXCIsXHJcblx0XHRcIm5vdCBzdGFydGVkXCI6IFwiIFwiLFxyXG5cdH07XHJcblx0Y29uc3Qga2V5ID0gc3RhdHVzLnRvTG93ZXJDYXNlKCk7XHJcblx0cmV0dXJuIG1hcFtrZXldID8/IHN0YXR1cztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVRhc2tDaGVja2JveChcclxuXHRzdGF0dXM6IHN0cmluZyxcclxuXHR0YXNrOiBUYXNrLFxyXG5cdGNvbnRhaW5lcjogSFRNTEVsZW1lbnRcclxuKSB7XHJcblx0Y29uc3QgY2hlY2tib3ggPSBjb250YWluZXIuY3JlYXRlRWwoXCJpbnB1dFwiLCB7XHJcblx0XHRjbHM6IFwidGFzay1saXN0LWl0ZW0tY2hlY2tib3hcIixcclxuXHRcdHR5cGU6IFwiY2hlY2tib3hcIixcclxuXHR9KTtcclxuXHRjb25zdCBzeW1ib2wgPSBtYXBUZXh0U3RhdHVzVG9TeW1ib2woc3RhdHVzKTtcclxuXHRjaGVja2JveC5kYXRhc2V0LnRhc2sgPSBzeW1ib2w7XHJcblx0Y2hlY2tib3guY2hlY2tlZCA9IHN5bWJvbCAhPT0gXCIgXCI7XHJcblxyXG5cdHJldHVybiBjaGVja2JveDtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFRhc2tEZXRhaWxzQ29tcG9uZW50IGV4dGVuZHMgQ29tcG9uZW50IHtcclxuXHRwdWJsaWMgY29udGFpbmVyRWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgY29udGVudEVsOiBIVE1MRWxlbWVudDtcclxuXHRwdWJsaWMgY3VycmVudFRhc2s6IFRhc2sgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIGlzVmlzaWJsZTogYm9vbGVhbiA9IHRydWU7XHJcblx0cHJpdmF0ZSBpc0VkaXRpbmc6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHRwcml2YXRlIGVkaXRGb3JtRWw6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcblxyXG5cdC8vIEV2ZW50c1xyXG5cdHB1YmxpYyBvblRhc2tFZGl0OiAodGFzazogVGFzaykgPT4gdm9pZDtcclxuXHRwdWJsaWMgb25UYXNrVXBkYXRlOiAodGFzazogVGFzaywgdXBkYXRlZFRhc2s6IFRhc2spID0+IFByb21pc2U8dm9pZD47XHJcblx0cHVibGljIG9uVGFza1RvZ2dsZUNvbXBsZXRlOiAodGFzazogVGFzaykgPT4gdm9pZDtcclxuXHJcblx0cHVibGljIHRvZ2dsZURldGFpbHNWaXNpYmlsaXR5OiAodmlzaWJsZTogYm9vbGVhbikgPT4gdm9pZDtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwcml2YXRlIHBhcmVudEVsOiBIVE1MRWxlbWVudCxcclxuXHRcdHByaXZhdGUgYXBwOiBBcHAsXHJcblx0XHRwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luXHJcblx0KSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdH1cclxuXHJcblx0b25sb2FkKCkge1xyXG5cdFx0Ly8gQ3JlYXRlIGRldGFpbHMgY29udGFpbmVyXHJcblx0XHR0aGlzLmNvbnRhaW5lckVsID0gdGhpcy5wYXJlbnRFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwidGFzay1kZXRhaWxzXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBJbml0aWFsIGVtcHR5IHN0YXRlXHJcblx0XHR0aGlzLnNob3dFbXB0eVN0YXRlKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHNob3dFbXB0eVN0YXRlKCkge1xyXG5cdFx0dGhpcy5jb250YWluZXJFbC5lbXB0eSgpO1xyXG5cclxuXHRcdGNvbnN0IGVtcHR5RWwgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdih7IGNsczogXCJkZXRhaWxzLWVtcHR5XCIgfSk7XHJcblx0XHRlbXB0eUVsLnNldFRleHQodChcIlNlbGVjdCBhIHRhc2sgdG8gdmlldyBkZXRhaWxzXCIpKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZ2V0VGFza1N0YXR1cygpIHtcclxuXHRcdHJldHVybiB0aGlzLmN1cnJlbnRUYXNrPy5zdGF0dXMgfHwgXCJcIjtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzaG93VGFza0RldGFpbHModGFzazogVGFzaykge1xyXG5cdFx0Y29uc29sZS5sb2coXCJzaG93VGFza0RldGFpbHNcIiwgdGFzayk7XHJcblx0XHRpZiAoIXRhc2spIHtcclxuXHRcdFx0dGhpcy5jdXJyZW50VGFzayA9IG51bGw7XHJcblx0XHRcdHRoaXMuc2hvd0VtcHR5U3RhdGUoKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuY3VycmVudFRhc2sgPSB0YXNrO1xyXG5cdFx0dGhpcy5pc0VkaXRpbmcgPSBmYWxzZTtcclxuXHJcblx0XHQvLyBDbGVhciBleGlzdGluZyBjb250ZW50XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLmVtcHR5KCk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGRldGFpbHMgaGVhZGVyXHJcblx0XHRjb25zdCBoZWFkZXJFbCA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KHsgY2xzOiBcImRldGFpbHMtaGVhZGVyXCIgfSk7XHJcblx0XHRoZWFkZXJFbC5zZXRUZXh0KHQoXCJUYXNrIERldGFpbHNcIikpO1xyXG5cclxuXHRcdC8vIE9ubHkgc2hvdyBjbG9zZSBidXR0b24gb24gbW9iaWxlIG9yIGlmIGV4cGxpY2l0bHkgcmVxdWVzdGVkXHJcblx0XHRpZiAoXHJcblx0XHRcdFBsYXRmb3JtLmlzUGhvbmUgfHxcclxuXHRcdFx0dGhpcy5jb250YWluZXJFbC5jbG9zZXN0KFwiLnRnLWZsdWVudC1jb250YWluZXJcIilcclxuXHRcdCkge1xyXG5cdFx0XHRoZWFkZXJFbC5jcmVhdGVFbChcclxuXHRcdFx0XHRcImRpdlwiLFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGNsczogXCJkZXRhaWxzLWNsb3NlLWJ0blwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0KGVsKSA9PiB7XHJcblx0XHRcdFx0XHRuZXcgRXh0cmFCdXR0b25Db21wb25lbnQoZWwpLnNldEljb24oXCJ4XCIpLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnRvZ2dsZURldGFpbHNWaXNpYmlsaXR5ICYmXHJcblx0XHRcdFx0XHRcdFx0dGhpcy50b2dnbGVEZXRhaWxzVmlzaWJpbGl0eShmYWxzZSk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGNvbnRlbnQgY29udGFpbmVyXHJcblx0XHR0aGlzLmNvbnRlbnRFbCA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KHsgY2xzOiBcImRldGFpbHMtY29udGVudFwiIH0pO1xyXG5cclxuXHRcdC8vIFRhc2sgbmFtZVxyXG5cdFx0Y29uc3QgbmFtZUVsID0gdGhpcy5jb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IGNsczogXCJkZXRhaWxzLW5hbWVcIiB9KTtcclxuXHRcdG5hbWVFbC5zZXRUZXh0KGNsZWFyQWxsTWFya3ModGFzay5jb250ZW50KSk7XHJcblxyXG5cdFx0Ly8gVGFzayBzdGF0dXNcclxuXHRcdHRoaXMuY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJkZXRhaWxzLXN0YXR1cy1jb250YWluZXJcIiB9LCAoZWwpID0+IHtcclxuXHRcdFx0Y29uc3QgbGFiZWxFbCA9IGVsLmNyZWF0ZURpdih7IGNsczogXCJkZXRhaWxzLXN0YXR1cy1sYWJlbFwiIH0pO1xyXG5cdFx0XHRsYWJlbEVsLnNldFRleHQodChcIlN0YXR1c1wiKSk7XHJcblxyXG5cdFx0XHRjb25zdCBzdGF0dXNFbCA9IGVsLmNyZWF0ZURpdih7IGNsczogXCJkZXRhaWxzLXN0YXR1c1wiIH0pO1xyXG5cdFx0XHRzdGF0dXNFbC5zZXRUZXh0KGdldFN0YXR1cyh0YXNrLCB0aGlzLnBsdWdpbi5zZXR0aW5ncykpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3Qgc3RhdHVzQ29tcG9uZW50ID0gbmV3IFN0YXR1c0NvbXBvbmVudChcclxuXHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdHRoaXMuY29udGVudEVsLFxyXG5cdFx0XHR0YXNrLFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0b25UYXNrVXBkYXRlOiB0aGlzLm9uVGFza1VwZGF0ZSxcclxuXHRcdFx0fVxyXG5cdFx0KTtcclxuXHJcblx0XHR0aGlzLmFkZENoaWxkKHN0YXR1c0NvbXBvbmVudCk7XHJcblxyXG5cdFx0Ly8gLy8gVGFzayBtZXRhZGF0YVxyXG5cdFx0Y29uc3QgbWV0YUVsID0gdGhpcy5jb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcImRldGFpbHMtbWV0YWRhdGFcIiB9KTtcclxuXHJcblx0XHQvLyAvLyBBZGQgbWV0YWRhdGEgZmllbGRzXHJcblx0XHQvLyBpZiAodGFzay5tZXRhZGF0YS5wcm9qZWN0KSB7XHJcblx0XHQvLyBcdHRoaXMuYWRkTWV0YWRhdGFGaWVsZChtZXRhRWwsIFwiUHJvamVjdFwiLCB0YXNrLm1ldGFkYXRhLnByb2plY3QpO1xyXG5cdFx0Ly8gfVxyXG5cclxuXHRcdC8vIGlmICh0YXNrLm1ldGFkYXRhLmR1ZURhdGUpIHtcclxuXHRcdC8vIFx0Y29uc3QgZHVlRGF0ZVRleHQgPSBuZXcgRGF0ZSh0YXNrLm1ldGFkYXRhLmR1ZURhdGUpLnRvTG9jYWxlRGF0ZVN0cmluZygpO1xyXG5cdFx0Ly8gXHR0aGlzLmFkZE1ldGFkYXRhRmllbGQobWV0YUVsLCBcIkR1ZSBEYXRlXCIsIGR1ZURhdGVUZXh0KTtcclxuXHRcdC8vIH1cclxuXHJcblx0XHQvLyBpZiAodGFzay5tZXRhZGF0YS5zdGFydERhdGUpIHtcclxuXHRcdC8vIFx0Y29uc3Qgc3RhcnREYXRlVGV4dCA9IG5ldyBEYXRlKHRhc2subWV0YWRhdGEuc3RhcnREYXRlKS50b0xvY2FsZURhdGVTdHJpbmcoKTtcclxuXHRcdC8vIFx0dGhpcy5hZGRNZXRhZGF0YUZpZWxkKG1ldGFFbCwgXCJTdGFydCBEYXRlXCIsIHN0YXJ0RGF0ZVRleHQpO1xyXG5cdFx0Ly8gfVxyXG5cclxuXHRcdC8vIGlmICh0YXNrLm1ldGFkYXRhLnNjaGVkdWxlZERhdGUpIHtcclxuXHRcdC8vIFx0Y29uc3Qgc2NoZWR1bGVkRGF0ZVRleHQgPSBuZXcgRGF0ZShcclxuXHRcdC8vIFx0XHR0YXNrLm1ldGFkYXRhLnNjaGVkdWxlZERhdGVcclxuXHRcdC8vIFx0KS50b0xvY2FsZURhdGVTdHJpbmcoKTtcclxuXHRcdC8vIFx0dGhpcy5hZGRNZXRhZGF0YUZpZWxkKG1ldGFFbCwgXCJTY2hlZHVsZWQgRGF0ZVwiLCBzY2hlZHVsZWREYXRlVGV4dCk7XHJcblx0XHQvLyB9XHJcblxyXG5cdFx0Ly8gaWYgKHRhc2subWV0YWRhdGEuY29tcGxldGVkRGF0ZSkge1xyXG5cdFx0Ly8gXHRjb25zdCBjb21wbGV0ZWREYXRlVGV4dCA9IG5ldyBEYXRlKFxyXG5cdFx0Ly8gXHRcdHRhc2subWV0YWRhdGEuY29tcGxldGVkRGF0ZVxyXG5cdFx0Ly8gXHQpLnRvTG9jYWxlRGF0ZVN0cmluZygpO1xyXG5cdFx0Ly8gXHR0aGlzLmFkZE1ldGFkYXRhRmllbGQobWV0YUVsLCBcIkNvbXBsZXRlZFwiLCBjb21wbGV0ZWREYXRlVGV4dCk7XHJcblx0XHQvLyB9XHJcblxyXG5cdFx0Ly8gaWYgKHRhc2subWV0YWRhdGEucHJpb3JpdHkpIHtcclxuXHRcdC8vIFx0bGV0IHByaW9yaXR5VGV4dCA9IFwiTG93XCI7XHJcblx0XHQvLyBcdHN3aXRjaCAodGFzay5tZXRhZGF0YS5wcmlvcml0eSkge1xyXG5cdFx0Ly8gXHRcdGNhc2UgMTpcclxuXHRcdC8vIFx0XHRcdHByaW9yaXR5VGV4dCA9IFwiTG93ZXN0XCI7XHJcblx0XHQvLyBcdFx0XHRicmVhaztcclxuXHRcdC8vIFx0XHRjYXNlIDI6XHJcblx0XHQvLyBcdFx0XHRwcmlvcml0eVRleHQgPSBcIkxvd1wiO1xyXG5cdFx0Ly8gXHRcdFx0YnJlYWs7XHJcblx0XHQvLyBcdFx0Y2FzZSAzOlxyXG5cdFx0Ly8gXHRcdFx0cHJpb3JpdHlUZXh0ID0gXCJNZWRpdW1cIjtcclxuXHRcdC8vIFx0XHRcdGJyZWFrO1xyXG5cdFx0Ly8gXHRcdGNhc2UgNDpcclxuXHRcdC8vIFx0XHRcdHByaW9yaXR5VGV4dCA9IFwiSGlnaFwiO1xyXG5cdFx0Ly8gXHRcdFx0YnJlYWs7XHJcblx0XHQvLyBcdFx0Y2FzZSA1OlxyXG5cdFx0Ly8gXHRcdFx0cHJpb3JpdHlUZXh0ID0gXCJIaWdoZXN0XCI7XHJcblx0XHQvLyBcdFx0XHRicmVhaztcclxuXHRcdC8vIFx0XHRkZWZhdWx0OlxyXG5cdFx0Ly8gXHRcdFx0cHJpb3JpdHlUZXh0ID0gXCJMb3dcIjtcclxuXHRcdC8vIFx0fVxyXG5cdFx0Ly8gXHR0aGlzLmFkZE1ldGFkYXRhRmllbGQobWV0YUVsLCBcIlByaW9yaXR5XCIsIHByaW9yaXR5VGV4dCk7XHJcblx0XHQvLyB9XHJcblxyXG5cdFx0Ly8gaWYgKHRhc2subWV0YWRhdGEudGFncyAmJiB0YXNrLm1ldGFkYXRhLnRhZ3MubGVuZ3RoID4gMCkge1xyXG5cdFx0Ly8gXHR0aGlzLmFkZE1ldGFkYXRhRmllbGQobWV0YUVsLCBcIlRhZ3NcIiwgdGFzay5tZXRhZGF0YS50YWdzLmpvaW4oXCIsIFwiKSk7XHJcblx0XHQvLyB9XHJcblxyXG5cdFx0Ly8gaWYgKHRhc2subWV0YWRhdGEuY29udGV4dCkge1xyXG5cdFx0Ly8gXHR0aGlzLmFkZE1ldGFkYXRhRmllbGQobWV0YUVsLCBcIkNvbnRleHRcIiwgdGFzay5tZXRhZGF0YS5jb250ZXh0KTtcclxuXHRcdC8vIH1cclxuXHJcblx0XHQvLyBpZiAodGFzay5tZXRhZGF0YS5yZWN1cnJlbmNlKSB7XHJcblx0XHQvLyBcdHRoaXMuYWRkTWV0YWRhdGFGaWVsZChtZXRhRWwsIFwiUmVjdXJyZW5jZVwiLCB0YXNrLm1ldGFkYXRhLnJlY3VycmVuY2UpO1xyXG5cdFx0Ly8gfVxyXG5cclxuXHRcdC8vIFRhc2sgZmlsZSBsb2NhdGlvblxyXG5cdFx0dGhpcy5hZGRNZXRhZGF0YUZpZWxkKG1ldGFFbCwgdChcIkZpbGVcIiksIHRhc2suZmlsZVBhdGgpO1xyXG5cclxuXHRcdC8vIEFkZCBhY3Rpb24gY29udHJvbHNcclxuXHRcdGNvbnN0IGFjdGlvbnNFbCA9IHRoaXMuY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJkZXRhaWxzLWFjdGlvbnNcIiB9KTtcclxuXHJcblx0XHQvLyBFZGl0IGluIHBhbmVsIGJ1dHRvblxyXG5cdFx0dGhpcy5zaG93RWRpdEZvcm0odGFzayk7XHJcblxyXG5cdFx0Ly8gRWRpdCBpbiBmaWxlIGJ1dHRvblxyXG5cdFx0Y29uc3QgZWRpdEluRmlsZUJ0biA9IGFjdGlvbnNFbC5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdGNsczogXCJkZXRhaWxzLWVkaXQtZmlsZS1idG5cIixcclxuXHRcdH0pO1xyXG5cdFx0ZWRpdEluRmlsZUJ0bi5zZXRUZXh0KHQoXCJFZGl0IGluIEZpbGVcIikpO1xyXG5cclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChlZGl0SW5GaWxlQnRuLCBcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0aWYgKHRoaXMub25UYXNrRWRpdCkge1xyXG5cdFx0XHRcdHRoaXMub25UYXNrRWRpdCh0YXNrKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0aGlzLmVkaXRUYXNrKHRhc2spO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBUb2dnbGUgY29tcGxldGlvbiBidXR0b25cclxuXHRcdGNvbnN0IHRvZ2dsZUJ0biA9IGFjdGlvbnNFbC5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdGNsczogXCJkZXRhaWxzLXRvZ2dsZS1idG5cIixcclxuXHRcdH0pO1xyXG5cdFx0dG9nZ2xlQnRuLnNldFRleHQoXHJcblx0XHRcdHRhc2suY29tcGxldGVkID8gdChcIk1hcmsgSW5jb21wbGV0ZVwiKSA6IHQoXCJNYXJrIENvbXBsZXRlXCIpXHJcblx0XHQpO1xyXG5cclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudCh0b2dnbGVCdG4sIFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRpZiAodGhpcy5vblRhc2tUb2dnbGVDb21wbGV0ZSkge1xyXG5cdFx0XHRcdHRoaXMub25UYXNrVG9nZ2xlQ29tcGxldGUodGFzayk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBzaG93RWRpdEZvcm0odGFzazogVGFzaykge1xyXG5cdFx0aWYgKCF0YXNrKSByZXR1cm47XHJcblxyXG5cdFx0dGhpcy5pc0VkaXRpbmcgPSB0cnVlO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBlZGl0IGZvcm1cclxuXHRcdHRoaXMuZWRpdEZvcm1FbCA9IHRoaXMuY29udGVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJkZXRhaWxzLWVkaXQtZm9ybVwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gVGFzayBjb250ZW50L3RpdGxlXHJcblx0XHRjb25zdCBjb250ZW50RmllbGQgPSB0aGlzLmNyZWF0ZUZvcm1GaWVsZChcclxuXHRcdFx0dGhpcy5lZGl0Rm9ybUVsLFxyXG5cdFx0XHR0KFwiVGFzayBUaXRsZVwiKVxyXG5cdFx0KTtcclxuXHRcdGNvbnN0IGNvbnRlbnRJbnB1dCA9IG5ldyBUZXh0Q29tcG9uZW50KGNvbnRlbnRGaWVsZCk7XHJcblx0XHRjb25zb2xlLmxvZyhcImNvbnRlbnRJbnB1dFwiLCBjb250ZW50SW5wdXQsIHRhc2suY29udGVudCk7XHJcblx0XHRjb250ZW50SW5wdXQuc2V0VmFsdWUoY2xlYXJBbGxNYXJrcyh0YXNrLmNvbnRlbnQpKTtcclxuXHRcdGNvbnRlbnRJbnB1dC5pbnB1dEVsLmFkZENsYXNzKFwiZGV0YWlscy1lZGl0LWNvbnRlbnRcIik7XHJcblxyXG5cdFx0Ly8gUHJvamVjdCBkcm9wZG93blxyXG5cdFx0Y29uc3QgcHJvamVjdEZpZWxkID0gdGhpcy5jcmVhdGVGb3JtRmllbGQoXHJcblx0XHRcdHRoaXMuZWRpdEZvcm1FbCxcclxuXHRcdFx0dChcIlByb2plY3RcIilcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gR2V0IGVmZmVjdGl2ZSBwcm9qZWN0IGFuZCByZWFkb25seSBzdGF0dXNcclxuXHRcdGNvbnN0IGVmZmVjdGl2ZVByb2plY3QgPSBnZXRFZmZlY3RpdmVQcm9qZWN0KHRhc2spO1xyXG5cdFx0Y29uc3QgaXNSZWFkb25seSA9IGlzUHJvamVjdFJlYWRvbmx5KHRhc2spO1xyXG5cclxuXHRcdGNvbnN0IHByb2plY3RJbnB1dCA9IG5ldyBUZXh0Q29tcG9uZW50KHByb2plY3RGaWVsZCk7XHJcblx0XHRwcm9qZWN0SW5wdXQuc2V0VmFsdWUoZWZmZWN0aXZlUHJvamVjdCB8fCBcIlwiKTtcclxuXHJcblx0XHQvLyBBZGQgdmlzdWFsIGluZGljYXRvciBmb3IgdGdQcm9qZWN0IC0gb25seSBzaG93IGlmIG5vIHVzZXItc2V0IHByb2plY3QgZXhpc3RzXHJcblx0XHRpZiAoXHJcblx0XHRcdHRhc2subWV0YWRhdGEudGdQcm9qZWN0ICYmXHJcblx0XHRcdCghdGFzay5tZXRhZGF0YS5wcm9qZWN0IHx8ICF0YXNrLm1ldGFkYXRhLnByb2plY3QudHJpbSgpKVxyXG5cdFx0KSB7XHJcblx0XHRcdGNvbnN0IHRnUHJvamVjdCA9IHRhc2subWV0YWRhdGEudGdQcm9qZWN0O1xyXG5cdFx0XHRjb25zdCBpbmRpY2F0b3IgPSBwcm9qZWN0RmllbGQuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwicHJvamVjdC1zb3VyY2UtaW5kaWNhdG9yXCIsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIGluZGljYXRvciB0ZXh0IGJhc2VkIG9uIHRnUHJvamVjdCB0eXBlXHJcblx0XHRcdGxldCBpbmRpY2F0b3JUZXh0ID0gXCJcIjtcclxuXHRcdFx0bGV0IGluZGljYXRvckljb24gPSBcIlwiO1xyXG5cclxuXHRcdFx0c3dpdGNoICh0Z1Byb2plY3QudHlwZSkge1xyXG5cdFx0XHRcdGNhc2UgXCJwYXRoXCI6XHJcblx0XHRcdFx0XHRpbmRpY2F0b3JUZXh0ID1cclxuXHRcdFx0XHRcdFx0dChcIkF1dG8tYXNzaWduZWQgZnJvbSBwYXRoXCIpICsgYDogJHt0Z1Byb2plY3Quc291cmNlfWA7XHJcblx0XHRcdFx0XHRpbmRpY2F0b3JJY29uID0gXCLwn5OBXCI7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIFwibWV0YWRhdGFcIjpcclxuXHRcdFx0XHRcdGluZGljYXRvclRleHQgPVxyXG5cdFx0XHRcdFx0XHR0KFwiQXV0by1hc3NpZ25lZCBmcm9tIGZpbGUgbWV0YWRhdGFcIikgK1xyXG5cdFx0XHRcdFx0XHRgOiAke3RnUHJvamVjdC5zb3VyY2V9YDtcclxuXHRcdFx0XHRcdGluZGljYXRvckljb24gPSBcIvCfk4RcIjtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJjb25maWdcIjpcclxuXHRcdFx0XHRcdGluZGljYXRvclRleHQgPVxyXG5cdFx0XHRcdFx0XHR0KFwiQXV0by1hc3NpZ25lZCBmcm9tIGNvbmZpZyBmaWxlXCIpICtcclxuXHRcdFx0XHRcdFx0YDogJHt0Z1Byb2plY3Quc291cmNlfWA7XHJcblx0XHRcdFx0XHRpbmRpY2F0b3JJY29uID0gXCLimpnvuI9cIjtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0XHRpbmRpY2F0b3JUZXh0ID1cclxuXHRcdFx0XHRcdFx0dChcIkF1dG8tYXNzaWduZWRcIikgKyBgOiAke3RnUHJvamVjdC5zb3VyY2V9YDtcclxuXHRcdFx0XHRcdGluZGljYXRvckljb24gPSBcIvCflJdcIjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aW5kaWNhdG9yLmNyZWF0ZUVsKFwic3BhblwiLCB7XHJcblx0XHRcdFx0Y2xzOiBcImluZGljYXRvci1pY29uXCIsXHJcblx0XHRcdFx0dGV4dDogaW5kaWNhdG9ySWNvbixcclxuXHRcdFx0fSk7XHJcblx0XHRcdGluZGljYXRvci5jcmVhdGVFbChcInNwYW5cIiwge1xyXG5cdFx0XHRcdGNsczogXCJpbmRpY2F0b3ItdGV4dFwiLFxyXG5cdFx0XHRcdHRleHQ6IGluZGljYXRvclRleHQsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0aWYgKGlzUmVhZG9ubHkpIHtcclxuXHRcdFx0XHRpbmRpY2F0b3IuYWRkQ2xhc3MoXCJyZWFkb25seS1pbmRpY2F0b3JcIik7XHJcblx0XHRcdFx0cHJvamVjdElucHV0LnNldERpc2FibGVkKHRydWUpO1xyXG5cdFx0XHRcdHByb2plY3RGaWVsZC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdFx0Y2xzOiBcImZpZWxkLWRlc2NyaXB0aW9uIHJlYWRvbmx5LWRlc2NyaXB0aW9uXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiB0KFxyXG5cdFx0XHRcdFx0XHRcIlRoaXMgcHJvamVjdCBpcyBhdXRvbWF0aWNhbGx5IGFzc2lnbmVkIGFuZCBjYW5ub3QgYmUgY2hhbmdlZFwiXHJcblx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGluZGljYXRvci5hZGRDbGFzcyhcIm92ZXJyaWRlLWluZGljYXRvclwiKTtcclxuXHRcdFx0XHRwcm9qZWN0RmllbGQuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRcdGNsczogXCJmaWVsZC1kZXNjcmlwdGlvbiBvdmVycmlkZS1kZXNjcmlwdGlvblwiLFxyXG5cdFx0XHRcdFx0dGV4dDogdChcclxuXHRcdFx0XHRcdFx0XCJZb3UgY2FuIG92ZXJyaWRlIHRoZSBhdXRvLWFzc2lnbmVkIHByb2plY3QgYnkgZW50ZXJpbmcgYSBkaWZmZXJlbnQgdmFsdWVcIlxyXG5cdFx0XHRcdFx0KSxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdG5ldyBQcm9qZWN0U3VnZ2VzdCh0aGlzLmFwcCwgcHJvamVjdElucHV0LmlucHV0RWwsIHRoaXMucGx1Z2luKTtcclxuXHJcblx0XHQvLyBUYWdzIGZpZWxkXHJcblx0XHRjb25zdCB0YWdzRmllbGQgPSB0aGlzLmNyZWF0ZUZvcm1GaWVsZCh0aGlzLmVkaXRGb3JtRWwsIHQoXCJUYWdzXCIpKTtcclxuXHRcdGNvbnN0IHRhZ3NJbnB1dCA9IG5ldyBUZXh0Q29tcG9uZW50KHRhZ3NGaWVsZCk7XHJcblx0XHRjb25zb2xlLmxvZyhcInRhZ3NJbnB1dFwiLCB0YWdzSW5wdXQsIHRhc2subWV0YWRhdGEudGFncyk7XHJcblx0XHQvLyBSZW1vdmUgIyBwcmVmaXggZnJvbSB0YWdzIHdoZW4gZGlzcGxheWluZyB0aGVtXHJcblx0XHR0YWdzSW5wdXQuc2V0VmFsdWUoXHJcblx0XHRcdHRhc2subWV0YWRhdGEudGFnc1xyXG5cdFx0XHRcdD8gdGFzay5tZXRhZGF0YS50YWdzXHJcblx0XHRcdFx0XHRcdC5tYXAoKHRhZykgPT5cclxuXHRcdFx0XHRcdFx0XHR0YWcuc3RhcnRzV2l0aChcIiNcIikgPyB0YWcuc2xpY2UoMSkgOiB0YWdcclxuXHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHQuam9pbihcIiwgXCIpXHJcblx0XHRcdFx0OiBcIlwiXHJcblx0XHQpO1xyXG5cdFx0dGFnc0ZpZWxkXHJcblx0XHRcdC5jcmVhdGVTcGFuKHsgY2xzOiBcImZpZWxkLWRlc2NyaXB0aW9uXCIgfSlcclxuXHRcdFx0LnNldFRleHQoXHJcblx0XHRcdFx0dChcIkNvbW1hIHNlcGFyYXRlZFwiKSArIFwiIFwiICsgdChcImUuZy4gI3RhZzEsICN0YWcyLCAjdGFnM1wiKVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdG5ldyBUYWdTdWdnZXN0KHRoaXMuYXBwLCB0YWdzSW5wdXQuaW5wdXRFbCwgdGhpcy5wbHVnaW4pO1xyXG5cclxuXHRcdC8vIENvbnRleHQgZmllbGRcclxuXHRcdGNvbnN0IGNvbnRleHRGaWVsZCA9IHRoaXMuY3JlYXRlRm9ybUZpZWxkKFxyXG5cdFx0XHR0aGlzLmVkaXRGb3JtRWwsXHJcblx0XHRcdHQoXCJDb250ZXh0XCIpXHJcblx0XHQpO1xyXG5cdFx0Y29uc3QgY29udGV4dElucHV0ID0gbmV3IFRleHRDb21wb25lbnQoY29udGV4dEZpZWxkKTtcclxuXHRcdGNvbnRleHRJbnB1dC5zZXRWYWx1ZSh0YXNrLm1ldGFkYXRhLmNvbnRleHQgfHwgXCJcIik7XHJcblxyXG5cdFx0bmV3IENvbnRleHRTdWdnZXN0KHRoaXMuYXBwLCBjb250ZXh0SW5wdXQuaW5wdXRFbCwgdGhpcy5wbHVnaW4pO1xyXG5cclxuXHRcdC8vIFByaW9yaXR5IGRyb3Bkb3duXHJcblx0XHRjb25zdCBwcmlvcml0eUZpZWxkID0gdGhpcy5jcmVhdGVGb3JtRmllbGQoXHJcblx0XHRcdHRoaXMuZWRpdEZvcm1FbCxcclxuXHRcdFx0dChcIlByaW9yaXR5XCIpXHJcblx0XHQpO1xyXG5cdFx0Y29uc3QgcHJpb3JpdHlEcm9wZG93biA9IG5ldyBEcm9wZG93bkNvbXBvbmVudChwcmlvcml0eUZpZWxkKTtcclxuXHRcdHByaW9yaXR5RHJvcGRvd24uYWRkT3B0aW9uKFwiXCIsIHQoXCJOb25lXCIpKTtcclxuXHRcdHByaW9yaXR5RHJvcGRvd24uYWRkT3B0aW9uKFwiMVwiLCBcIuKPrO+4jyBcIiArIHQoXCJMb3dlc3RcIikpO1xyXG5cdFx0cHJpb3JpdHlEcm9wZG93bi5hZGRPcHRpb24oXCIyXCIsIFwi8J+UvSBcIiArIHQoXCJMb3dcIikpO1xyXG5cdFx0cHJpb3JpdHlEcm9wZG93bi5hZGRPcHRpb24oXCIzXCIsIFwi8J+UvCBcIiArIHQoXCJNZWRpdW1cIikpO1xyXG5cdFx0cHJpb3JpdHlEcm9wZG93bi5hZGRPcHRpb24oXCI0XCIsIFwi4o+rIFwiICsgdChcIkhpZ2hcIikpO1xyXG5cdFx0cHJpb3JpdHlEcm9wZG93bi5hZGRPcHRpb24oXCI1XCIsIFwi8J+UuiBcIiArIHQoXCJIaWdoZXN0XCIpKTtcclxuXHRcdGlmICh0YXNrLm1ldGFkYXRhLnByaW9yaXR5KSB7XHJcblx0XHRcdHByaW9yaXR5RHJvcGRvd24uc2V0VmFsdWUodGFzay5tZXRhZGF0YS5wcmlvcml0eS50b1N0cmluZygpKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHByaW9yaXR5RHJvcGRvd24uc2V0VmFsdWUoXCJcIik7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRHVlIGRhdGVcclxuXHRcdGNvbnN0IGR1ZURhdGVGaWVsZCA9IHRoaXMuY3JlYXRlRm9ybUZpZWxkKFxyXG5cdFx0XHR0aGlzLmVkaXRGb3JtRWwsXHJcblx0XHRcdHQoXCJEdWUgRGF0ZVwiKVxyXG5cdFx0KTtcclxuXHRcdGNvbnN0IGR1ZURhdGVJbnB1dCA9IGR1ZURhdGVGaWVsZC5jcmVhdGVFbChcImlucHV0XCIsIHtcclxuXHRcdFx0dHlwZTogXCJkYXRlXCIsXHJcblx0XHRcdGNsczogXCJkYXRlLWlucHV0XCIsXHJcblx0XHR9KTtcclxuXHRcdGlmICh0YXNrLm1ldGFkYXRhLmR1ZURhdGUpIHtcclxuXHRcdFx0Ly8gVXNlIGhlbHBlciB0byBjb3JyZWN0bHkgZGlzcGxheSBVVEMgbm9vbiB0aW1lc3RhbXAgYXMgbG9jYWwgZGF0ZVxyXG5cdFx0XHRkdWVEYXRlSW5wdXQudmFsdWUgPSB0aW1lc3RhbXBUb0xvY2FsRGF0ZVN0cmluZyhcclxuXHRcdFx0XHR0YXNrLm1ldGFkYXRhLmR1ZURhdGVcclxuXHRcdFx0KTtcclxuXHRcdH0gLy8gU3RhcnQgZGF0ZVxyXG5cdFx0Y29uc3Qgc3RhcnREYXRlRmllbGQgPSB0aGlzLmNyZWF0ZUZvcm1GaWVsZChcclxuXHRcdFx0dGhpcy5lZGl0Rm9ybUVsLFxyXG5cdFx0XHR0KFwiU3RhcnQgRGF0ZVwiKVxyXG5cdFx0KTtcclxuXHRcdGNvbnN0IHN0YXJ0RGF0ZUlucHV0ID0gc3RhcnREYXRlRmllbGQuY3JlYXRlRWwoXCJpbnB1dFwiLCB7XHJcblx0XHRcdHR5cGU6IFwiZGF0ZVwiLFxyXG5cdFx0XHRjbHM6IFwiZGF0ZS1pbnB1dFwiLFxyXG5cdFx0fSk7XHJcblx0XHRpZiAodGFzay5tZXRhZGF0YS5zdGFydERhdGUpIHtcclxuXHRcdFx0Ly8gVXNlIGhlbHBlciB0byBjb3JyZWN0bHkgZGlzcGxheSBVVEMgbm9vbiB0aW1lc3RhbXAgYXMgbG9jYWwgZGF0ZVxyXG5cdFx0XHRzdGFydERhdGVJbnB1dC52YWx1ZSA9IHRpbWVzdGFtcFRvTG9jYWxEYXRlU3RyaW5nKFxyXG5cdFx0XHRcdHRhc2subWV0YWRhdGEuc3RhcnREYXRlXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU2NoZWR1bGVkIGRhdGVcclxuXHRcdGNvbnN0IHNjaGVkdWxlZERhdGVGaWVsZCA9IHRoaXMuY3JlYXRlRm9ybUZpZWxkKFxyXG5cdFx0XHR0aGlzLmVkaXRGb3JtRWwsXHJcblx0XHRcdHQoXCJTY2hlZHVsZWQgRGF0ZVwiKVxyXG5cdFx0KTtcclxuXHRcdGNvbnN0IHNjaGVkdWxlZERhdGVJbnB1dCA9IHNjaGVkdWxlZERhdGVGaWVsZC5jcmVhdGVFbChcImlucHV0XCIsIHtcclxuXHRcdFx0dHlwZTogXCJkYXRlXCIsXHJcblx0XHRcdGNsczogXCJkYXRlLWlucHV0XCIsXHJcblx0XHR9KTtcclxuXHRcdGlmICh0YXNrLm1ldGFkYXRhLnNjaGVkdWxlZERhdGUpIHtcclxuXHRcdFx0Ly8gVXNlIGhlbHBlciB0byBjb3JyZWN0bHkgZGlzcGxheSBVVEMgbm9vbiB0aW1lc3RhbXAgYXMgbG9jYWwgZGF0ZVxyXG5cdFx0XHRzY2hlZHVsZWREYXRlSW5wdXQudmFsdWUgPSB0aW1lc3RhbXBUb0xvY2FsRGF0ZVN0cmluZyhcclxuXHRcdFx0XHR0YXNrLm1ldGFkYXRhLnNjaGVkdWxlZERhdGVcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDYW5jZWxsZWQgZGF0ZVxyXG5cdFx0Y29uc3QgY2FuY2VsbGVkRGF0ZUZpZWxkID0gdGhpcy5jcmVhdGVGb3JtRmllbGQoXHJcblx0XHRcdHRoaXMuZWRpdEZvcm1FbCxcclxuXHRcdFx0dChcIkNhbmNlbGxlZCBEYXRlXCIpXHJcblx0XHQpO1xyXG5cdFx0Y29uc3QgY2FuY2VsbGVkRGF0ZUlucHV0ID0gY2FuY2VsbGVkRGF0ZUZpZWxkLmNyZWF0ZUVsKFwiaW5wdXRcIiwge1xyXG5cdFx0XHR0eXBlOiBcImRhdGVcIixcclxuXHRcdFx0Y2xzOiBcImRhdGUtaW5wdXRcIixcclxuXHRcdH0pO1xyXG5cdFx0aWYgKHRhc2subWV0YWRhdGEuY2FuY2VsbGVkRGF0ZSkge1xyXG5cdFx0XHQvLyBVc2UgaGVscGVyIHRvIGNvcnJlY3RseSBkaXNwbGF5IFVUQyBub29uIHRpbWVzdGFtcCBhcyBsb2NhbCBkYXRlXHJcblx0XHRcdGNhbmNlbGxlZERhdGVJbnB1dC52YWx1ZSA9IHRpbWVzdGFtcFRvTG9jYWxEYXRlU3RyaW5nKFxyXG5cdFx0XHRcdHRhc2subWV0YWRhdGEuY2FuY2VsbGVkRGF0ZVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIE9uIGNvbXBsZXRpb24gYWN0aW9uXHJcblx0XHRjb25zdCBvbkNvbXBsZXRpb25GaWVsZCA9IHRoaXMuY3JlYXRlRm9ybUZpZWxkKFxyXG5cdFx0XHR0aGlzLmVkaXRGb3JtRWwsXHJcblx0XHRcdHQoXCJPbiBDb21wbGV0aW9uXCIpXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBhIGRlYm91bmNlZCBzYXZlIGZ1bmN0aW9uXHJcblx0XHRjb25zdCBzYXZlVGFzayA9IGRlYm91bmNlKGFzeW5jICgpID0+IHtcclxuXHRcdFx0Ly8gQ3JlYXRlIHVwZGF0ZWQgdGFzayBvYmplY3RcclxuXHRcdFx0Y29uc3QgdXBkYXRlZFRhc2s6IFRhc2sgPSB7IC4uLnRhc2sgfTtcclxuXHJcblx0XHRcdC8vIFVwZGF0ZSB0YXNrIHByb3BlcnRpZXNcclxuXHRcdFx0Y29uc3QgbmV3Q29udGVudCA9IGNvbnRlbnRJbnB1dC5nZXRWYWx1ZSgpO1xyXG5cdFx0XHR1cGRhdGVkVGFzay5jb250ZW50ID0gbmV3Q29udGVudDtcclxuXHJcblx0XHRcdC8vIFVwZGF0ZSBtZXRhZGF0YSBwcm9wZXJ0aWVzXHJcblx0XHRcdGNvbnN0IG1ldGFkYXRhID0geyAuLi51cGRhdGVkVGFzay5tZXRhZGF0YSB9O1xyXG5cclxuXHRcdFx0Ly8gUGFyc2UgYW5kIHVwZGF0ZSBwcm9qZWN0IC0gT25seSB1cGRhdGUgaWYgbm90IHJlYWRvbmx5IHRnUHJvamVjdFxyXG5cdFx0XHRjb25zdCBwcm9qZWN0VmFsdWUgPSBwcm9qZWN0SW5wdXQuZ2V0VmFsdWUoKTtcclxuXHRcdFx0aWYgKCFpc1JlYWRvbmx5KSB7XHJcblx0XHRcdFx0bWV0YWRhdGEucHJvamVjdCA9IHByb2plY3RWYWx1ZSB8fCB1bmRlZmluZWQ7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gUHJlc2VydmUgb3JpZ2luYWwgcHJvamVjdCBtZXRhZGF0YSBmb3IgcmVhZG9ubHkgdGdQcm9qZWN0XHJcblx0XHRcdFx0bWV0YWRhdGEucHJvamVjdCA9IHRhc2subWV0YWRhdGEucHJvamVjdDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gUGFyc2UgYW5kIHVwZGF0ZSB0YWdzIChyZW1vdmUgIyBwcmVmaXggaWYgcHJlc2VudClcclxuXHRcdFx0Y29uc3QgdGFnc1ZhbHVlID0gdGFnc0lucHV0LmdldFZhbHVlKCk7XHJcblx0XHRcdG1ldGFkYXRhLnRhZ3MgPSB0YWdzVmFsdWVcclxuXHRcdFx0XHQ/IHRhZ3NWYWx1ZVxyXG5cdFx0XHRcdFx0XHQuc3BsaXQoXCIsXCIpXHJcblx0XHRcdFx0XHRcdC5tYXAoKHRhZykgPT4gdGFnLnRyaW0oKSlcclxuXHRcdFx0XHRcdFx0Lm1hcCgodGFnKSA9PlxyXG5cdFx0XHRcdFx0XHRcdHRhZy5zdGFydHNXaXRoKFwiI1wiKSA/IHRhZy5zbGljZSgxKSA6IHRhZ1xyXG5cdFx0XHRcdFx0XHQpIC8vIFJlbW92ZSAjIHByZWZpeCBpZiBwcmVzZW50XHJcblx0XHRcdFx0XHRcdC5maWx0ZXIoKHRhZykgPT4gdGFnKVxyXG5cdFx0XHRcdDogW107XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgY29udGV4dFxyXG5cdFx0XHRjb25zdCBjb250ZXh0VmFsdWUgPSBjb250ZXh0SW5wdXQuZ2V0VmFsdWUoKTtcclxuXHRcdFx0bWV0YWRhdGEuY29udGV4dCA9IGNvbnRleHRWYWx1ZSB8fCB1bmRlZmluZWQ7XHJcblxyXG5cdFx0XHQvLyBQYXJzZSBhbmQgdXBkYXRlIHByaW9yaXR5XHJcblx0XHRcdGNvbnN0IHByaW9yaXR5VmFsdWUgPSBwcmlvcml0eURyb3Bkb3duLmdldFZhbHVlKCk7XHJcblx0XHRcdG1ldGFkYXRhLnByaW9yaXR5ID0gcHJpb3JpdHlWYWx1ZVxyXG5cdFx0XHRcdD8gcGFyc2VJbnQocHJpb3JpdHlWYWx1ZSlcclxuXHRcdFx0XHQ6IHVuZGVmaW5lZDtcclxuXHJcblx0XHRcdC8vIFBhcnNlIGRhdGVzIGFuZCBjaGVjayBpZiB0aGV5J3ZlIGNoYW5nZWRcclxuXHRcdFx0Y29uc3QgZHVlRGF0ZVZhbHVlID0gZHVlRGF0ZUlucHV0LnZhbHVlO1xyXG5cdFx0XHRpZiAoZHVlRGF0ZVZhbHVlKSB7XHJcblx0XHRcdFx0Ly8gVXNlIGhlbHBlciB0byBjb252ZXJ0IGxvY2FsIGRhdGUgc3RyaW5nIHRvIFVUQyBub29uIHRpbWVzdGFtcFxyXG5cdFx0XHRcdGNvbnN0IG5ld0R1ZURhdGUgPSBsb2NhbERhdGVTdHJpbmdUb1RpbWVzdGFtcChkdWVEYXRlVmFsdWUpO1xyXG5cdFx0XHRcdC8vIE9ubHkgdXBkYXRlIGlmIHRoZSBkYXRlIGhhcyBjaGFuZ2VkIG9yIGlzIGRpZmZlcmVudCBmcm9tIHRoZSBvcmlnaW5hbFxyXG5cdFx0XHRcdGlmICh0YXNrLm1ldGFkYXRhLmR1ZURhdGUgIT09IG5ld0R1ZURhdGUpIHtcclxuXHRcdFx0XHRcdG1ldGFkYXRhLmR1ZURhdGUgPSBuZXdEdWVEYXRlO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRtZXRhZGF0YS5kdWVEYXRlID0gdGFzay5tZXRhZGF0YS5kdWVEYXRlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIGlmICghZHVlRGF0ZVZhbHVlICYmIHRhc2subWV0YWRhdGEuZHVlRGF0ZSkge1xyXG5cdFx0XHRcdC8vIE9ubHkgdXBkYXRlIGlmIGZpZWxkIHdhcyBjbGVhcmVkIGFuZCBwcmV2aW91c2x5IGhhZCBhIHZhbHVlXHJcblx0XHRcdFx0bWV0YWRhdGEuZHVlRGF0ZSA9IHVuZGVmaW5lZDtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBLZWVwIG9yaWdpbmFsIHZhbHVlIGlmIGJvdGggYXJlIGVtcHR5L3VuZGVmaW5lZFxyXG5cdFx0XHRcdG1ldGFkYXRhLmR1ZURhdGUgPSB0YXNrLm1ldGFkYXRhLmR1ZURhdGU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IHN0YXJ0RGF0ZVZhbHVlID0gc3RhcnREYXRlSW5wdXQudmFsdWU7XHJcblx0XHRcdGlmIChzdGFydERhdGVWYWx1ZSkge1xyXG5cdFx0XHRcdC8vIFVzZSBoZWxwZXIgdG8gY29udmVydCBsb2NhbCBkYXRlIHN0cmluZyB0byBVVEMgbm9vbiB0aW1lc3RhbXBcclxuXHRcdFx0XHRjb25zdCBuZXdTdGFydERhdGUgPSBsb2NhbERhdGVTdHJpbmdUb1RpbWVzdGFtcChzdGFydERhdGVWYWx1ZSk7XHJcblx0XHRcdFx0Ly8gT25seSB1cGRhdGUgaWYgdGhlIGRhdGUgaGFzIGNoYW5nZWQgb3IgaXMgZGlmZmVyZW50IGZyb20gdGhlIG9yaWdpbmFsXHJcblx0XHRcdFx0aWYgKHRhc2subWV0YWRhdGEuc3RhcnREYXRlICE9PSBuZXdTdGFydERhdGUpIHtcclxuXHRcdFx0XHRcdG1ldGFkYXRhLnN0YXJ0RGF0ZSA9IG5ld1N0YXJ0RGF0ZTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0bWV0YWRhdGEuc3RhcnREYXRlID0gdGFzay5tZXRhZGF0YS5zdGFydERhdGU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2UgaWYgKCFzdGFydERhdGVWYWx1ZSAmJiB0YXNrLm1ldGFkYXRhLnN0YXJ0RGF0ZSkge1xyXG5cdFx0XHRcdC8vIE9ubHkgdXBkYXRlIGlmIGZpZWxkIHdhcyBjbGVhcmVkIGFuZCBwcmV2aW91c2x5IGhhZCBhIHZhbHVlXHJcblx0XHRcdFx0bWV0YWRhdGEuc3RhcnREYXRlID0gdW5kZWZpbmVkO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIEtlZXAgb3JpZ2luYWwgdmFsdWUgaWYgYm90aCBhcmUgZW1wdHkvdW5kZWZpbmVkXHJcblx0XHRcdFx0bWV0YWRhdGEuc3RhcnREYXRlID0gdGFzay5tZXRhZGF0YS5zdGFydERhdGU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IHNjaGVkdWxlZERhdGVWYWx1ZSA9IHNjaGVkdWxlZERhdGVJbnB1dC52YWx1ZTtcclxuXHRcdFx0aWYgKHNjaGVkdWxlZERhdGVWYWx1ZSkge1xyXG5cdFx0XHRcdC8vIFVzZSBoZWxwZXIgdG8gY29udmVydCBsb2NhbCBkYXRlIHN0cmluZyB0byBVVEMgbm9vbiB0aW1lc3RhbXBcclxuXHRcdFx0XHRjb25zdCBuZXdTY2hlZHVsZWREYXRlID1cclxuXHRcdFx0XHRcdGxvY2FsRGF0ZVN0cmluZ1RvVGltZXN0YW1wKHNjaGVkdWxlZERhdGVWYWx1ZSk7XHJcblx0XHRcdFx0Ly8gT25seSB1cGRhdGUgaWYgdGhlIGRhdGUgaGFzIGNoYW5nZWQgb3IgaXMgZGlmZmVyZW50IGZyb20gdGhlIG9yaWdpbmFsXHJcblx0XHRcdFx0aWYgKHRhc2subWV0YWRhdGEuc2NoZWR1bGVkRGF0ZSAhPT0gbmV3U2NoZWR1bGVkRGF0ZSkge1xyXG5cdFx0XHRcdFx0bWV0YWRhdGEuc2NoZWR1bGVkRGF0ZSA9IG5ld1NjaGVkdWxlZERhdGU7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdG1ldGFkYXRhLnNjaGVkdWxlZERhdGUgPSB0YXNrLm1ldGFkYXRhLnNjaGVkdWxlZERhdGU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2UgaWYgKCFzY2hlZHVsZWREYXRlVmFsdWUgJiYgdGFzay5tZXRhZGF0YS5zY2hlZHVsZWREYXRlKSB7XHJcblx0XHRcdFx0Ly8gT25seSB1cGRhdGUgaWYgZmllbGQgd2FzIGNsZWFyZWQgYW5kIHByZXZpb3VzbHkgaGFkIGEgdmFsdWVcclxuXHRcdFx0XHRtZXRhZGF0YS5zY2hlZHVsZWREYXRlID0gdW5kZWZpbmVkO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIEtlZXAgb3JpZ2luYWwgdmFsdWUgaWYgYm90aCBhcmUgZW1wdHkvdW5kZWZpbmVkXHJcblx0XHRcdFx0bWV0YWRhdGEuc2NoZWR1bGVkRGF0ZSA9IHRhc2subWV0YWRhdGEuc2NoZWR1bGVkRGF0ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgY2FuY2VsbGVkRGF0ZVZhbHVlID0gY2FuY2VsbGVkRGF0ZUlucHV0LnZhbHVlO1xyXG5cdFx0XHRpZiAoY2FuY2VsbGVkRGF0ZVZhbHVlKSB7XHJcblx0XHRcdFx0Ly8gVXNlIGhlbHBlciB0byBjb252ZXJ0IGxvY2FsIGRhdGUgc3RyaW5nIHRvIFVUQyBub29uIHRpbWVzdGFtcFxyXG5cdFx0XHRcdGNvbnN0IG5ld0NhbmNlbGxlZERhdGUgPVxyXG5cdFx0XHRcdFx0bG9jYWxEYXRlU3RyaW5nVG9UaW1lc3RhbXAoY2FuY2VsbGVkRGF0ZVZhbHVlKTtcclxuXHRcdFx0XHQvLyBPbmx5IHVwZGF0ZSBpZiB0aGUgZGF0ZSBoYXMgY2hhbmdlZCBvciBpcyBkaWZmZXJlbnQgZnJvbSB0aGUgb3JpZ2luYWxcclxuXHRcdFx0XHRpZiAodGFzay5tZXRhZGF0YS5jYW5jZWxsZWREYXRlICE9PSBuZXdDYW5jZWxsZWREYXRlKSB7XHJcblx0XHRcdFx0XHRtZXRhZGF0YS5jYW5jZWxsZWREYXRlID0gbmV3Q2FuY2VsbGVkRGF0ZTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0bWV0YWRhdGEuY2FuY2VsbGVkRGF0ZSA9IHRhc2subWV0YWRhdGEuY2FuY2VsbGVkRGF0ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSBpZiAoIWNhbmNlbGxlZERhdGVWYWx1ZSAmJiB0YXNrLm1ldGFkYXRhLmNhbmNlbGxlZERhdGUpIHtcclxuXHRcdFx0XHQvLyBPbmx5IHVwZGF0ZSBpZiBmaWVsZCB3YXMgY2xlYXJlZCBhbmQgcHJldmlvdXNseSBoYWQgYSB2YWx1ZVxyXG5cdFx0XHRcdG1ldGFkYXRhLmNhbmNlbGxlZERhdGUgPSB1bmRlZmluZWQ7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gS2VlcCBvcmlnaW5hbCB2YWx1ZSBpZiBib3RoIGFyZSBlbXB0eS91bmRlZmluZWRcclxuXHRcdFx0XHRtZXRhZGF0YS5jYW5jZWxsZWREYXRlID0gdGFzay5tZXRhZGF0YS5jYW5jZWxsZWREYXRlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBvbkNvbXBsZXRpb24gaXMgbm93IGhhbmRsZWQgYnkgT25Db21wbGV0aW9uQ29uZmlndXJhdG9yXHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgZGVwZW5kZW5jaWVzXHJcblx0XHRcdGNvbnN0IGRlcGVuZHNPblZhbHVlID0gZGVwZW5kc09uSW5wdXQuZ2V0VmFsdWUoKTtcclxuXHRcdFx0bWV0YWRhdGEuZGVwZW5kc09uID0gZGVwZW5kc09uVmFsdWVcclxuXHRcdFx0XHQ/IGRlcGVuZHNPblZhbHVlXHJcblx0XHRcdFx0XHRcdC5zcGxpdChcIixcIilcclxuXHRcdFx0XHRcdFx0Lm1hcCgoaWQpID0+IGlkLnRyaW0oKSlcclxuXHRcdFx0XHRcdFx0LmZpbHRlcigoaWQpID0+IGlkKVxyXG5cdFx0XHRcdDogdW5kZWZpbmVkO1xyXG5cclxuXHRcdFx0Y29uc3Qgb25Db21wbGV0aW9uVmFsdWUgPSBvbkNvbXBsZXRpb25Db25maWd1cmF0b3IuZ2V0VmFsdWUoKTtcclxuXHRcdFx0bWV0YWRhdGEub25Db21wbGV0aW9uID0gb25Db21wbGV0aW9uVmFsdWUgfHwgdW5kZWZpbmVkO1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIHRhc2sgSURcclxuXHRcdFx0Y29uc3QgdGFza0lkVmFsdWUgPSB0YXNrSWRJbnB1dC5nZXRWYWx1ZSgpO1xyXG5cdFx0XHRtZXRhZGF0YS5pZCA9IHRhc2tJZFZhbHVlIHx8IHVuZGVmaW5lZDtcclxuXHJcblx0XHRcdC8vIFVwZGF0ZSByZWN1cnJlbmNlXHJcblx0XHRcdGNvbnN0IHJlY3VycmVuY2VWYWx1ZSA9IHJlY3VycmVuY2VJbnB1dC5nZXRWYWx1ZSgpO1xyXG5cdFx0XHRtZXRhZGF0YS5yZWN1cnJlbmNlID0gcmVjdXJyZW5jZVZhbHVlIHx8IHVuZGVmaW5lZDtcclxuXHJcblx0XHRcdC8vIEFzc2lnbiB1cGRhdGVkIG1ldGFkYXRhIGJhY2sgdG8gdGFza1xyXG5cdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YSA9IG1ldGFkYXRhO1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgaWYgYW55IHRhc2sgZGF0YSBoYXMgY2hhbmdlZCBiZWZvcmUgdXBkYXRpbmdcclxuXHRcdFx0Y29uc3QgaGFzQ2hhbmdlcyA9IHRoaXMuaGFzVGFza0NoYW5nZXModGFzaywgdXBkYXRlZFRhc2spO1xyXG5cclxuXHRcdFx0Ly8gQ2FsbCB0aGUgdXBkYXRlIGNhbGxiYWNrIG9ubHkgaWYgdGhlcmUgYXJlIGNoYW5nZXNcclxuXHRcdFx0aWYgKHRoaXMub25UYXNrVXBkYXRlICYmIGhhc0NoYW5nZXMpIHtcclxuXHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0YXdhaXQgdGhpcy5vblRhc2tVcGRhdGUodGFzaywgdXBkYXRlZFRhc2spO1xyXG5cclxuXHRcdFx0XHRcdC8vIOabtOaWsOacrOWcsOW8leeUqOW5tueri+WNs+mHjee7mOivpuaDhe+8jOmBv+WFjeaYvuekuuKAnOS4iuS4gOasoeKAneeahOWAvFxyXG5cdFx0XHRcdFx0dGhpcy5jdXJyZW50VGFzayA9IHVwZGF0ZWRUYXNrO1xyXG5cdFx0XHRcdFx0dGhpcy5pc0VkaXRpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHRcdHRoaXMuc2hvd1Rhc2tEZXRhaWxzKHVwZGF0ZWRUYXNrKTtcclxuXHRcdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkZhaWxlZCB0byB1cGRhdGUgdGFzazpcIiwgZXJyb3IpO1xyXG5cdFx0XHRcdFx0Ly8gVE9ETzogU2hvdyBlcnJvciBtZXNzYWdlIHRvIHVzZXJcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0sIDgwMCk7IC8vIDE1MDBtcyBkZWJvdW5jZSB0aW1lIC0gYWxsb3cgdGltZSBmb3IgbXVsdGktZmllbGQgZWRpdGluZ1xyXG5cclxuXHRcdC8vIFVzZSBPbkNvbXBsZXRpb25Db25maWd1cmF0b3IgZGlyZWN0bHlcclxuXHRcdGNvbnN0IG9uQ29tcGxldGlvbkNvbmZpZ3VyYXRvciA9IG5ldyBPbkNvbXBsZXRpb25Db25maWd1cmF0b3IoXHJcblx0XHRcdG9uQ29tcGxldGlvbkZpZWxkLFxyXG5cdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGluaXRpYWxWYWx1ZTogdGFzay5tZXRhZGF0YS5vbkNvbXBsZXRpb24gfHwgXCJcIixcclxuXHRcdFx0XHRvbkNoYW5nZTogKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyh2YWx1ZSwgXCJvbkNvbXBsZXRpb24gdmFsdWUgY2hhbmdlZFwiKTtcclxuXHRcdFx0XHRcdC8vIFVzZSBzbWFydGVyIHNhdmUgbG9naWM6IGFsbG93IGJhc2ljIGNvbmZpZ3VyYXRpb25zIHRvIHNhdmUgaW1tZWRpYXRlbHlcclxuXHRcdFx0XHRcdC8vIGFuZCBhbGxvdyBwYXJ0aWFsIGNvbmZpZ3VyYXRpb25zIGZvciBjb21wbGV4IHR5cGVzXHJcblx0XHRcdFx0XHRjb25zdCBjb25maWcgPSBvbkNvbXBsZXRpb25Db25maWd1cmF0b3IuZ2V0Q29uZmlnKCk7XHJcblx0XHRcdFx0XHRjb25zdCBzaG91bGRTYXZlID0gdGhpcy5zaG91bGRUcmlnZ2VyT25Db21wbGV0aW9uU2F2ZShcclxuXHRcdFx0XHRcdFx0Y29uZmlnLFxyXG5cdFx0XHRcdFx0XHR2YWx1ZVxyXG5cdFx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0XHRpZiAoc2hvdWxkU2F2ZSkge1xyXG5cdFx0XHRcdFx0XHQvLyBUcmlnZ2VyIHNhdmUgLSB0aGUgc2F2ZVRhc2sgZnVuY3Rpb24gd2lsbCBnZXQgdGhlIGxhdGVzdCB2YWx1ZVxyXG5cdFx0XHRcdFx0XHQvLyBmcm9tIG9uQ29tcGxldGlvbkNvbmZpZ3VyYXRvci5nZXRWYWx1ZSgpIHRvIGF2b2lkIGRhdGEgcmFjZXNcclxuXHRcdFx0XHRcdFx0c2F2ZVRhc2soKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uVmFsaWRhdGlvbkNoYW5nZTogKGlzVmFsaWQsIGVycm9yKSA9PiB7XHJcblx0XHRcdFx0XHQvLyBTaG93IHZhbGlkYXRpb24gZmVlZGJhY2tcclxuXHRcdFx0XHRcdGNvbnN0IGV4aXN0aW5nTWVzc2FnZSA9IG9uQ29tcGxldGlvbkZpZWxkLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFx0XHRcdFwiLm9uY29tcGxldGlvbi12YWxpZGF0aW9uLW1lc3NhZ2VcIlxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdGlmIChleGlzdGluZ01lc3NhZ2UpIHtcclxuXHRcdFx0XHRcdFx0ZXhpc3RpbmdNZXNzYWdlLnJlbW92ZSgpO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdGlmIChlcnJvcikge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBtZXNzYWdlRWwgPSBvbkNvbXBsZXRpb25GaWVsZC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdFx0XHRcdGNsczogXCJvbmNvbXBsZXRpb24tdmFsaWRhdGlvbi1tZXNzYWdlIGVycm9yXCIsXHJcblx0XHRcdFx0XHRcdFx0dGV4dDogZXJyb3IsXHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSBlbHNlIGlmIChpc1ZhbGlkKSB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IG1lc3NhZ2VFbCA9IG9uQ29tcGxldGlvbkZpZWxkLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0XHRcdFx0Y2xzOiBcIm9uY29tcGxldGlvbi12YWxpZGF0aW9uLW1lc3NhZ2Ugc3VjY2Vzc1wiLFxyXG5cdFx0XHRcdFx0XHRcdHRleHQ6IHQoXCJDb25maWd1cmF0aW9uIGlzIHZhbGlkXCIpLFxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cclxuXHRcdHRoaXMuYWRkQ2hpbGQob25Db21wbGV0aW9uQ29uZmlndXJhdG9yKTtcclxuXHJcblx0XHQvLyBEZXBlbmRlbmNpZXNcclxuXHRcdGNvbnN0IGRlcGVuZHNPbkZpZWxkID0gdGhpcy5jcmVhdGVGb3JtRmllbGQoXHJcblx0XHRcdHRoaXMuZWRpdEZvcm1FbCxcclxuXHRcdFx0dChcIkRlcGVuZHMgT25cIilcclxuXHRcdCk7XHJcblx0XHRjb25zdCBkZXBlbmRzT25JbnB1dCA9IG5ldyBUZXh0Q29tcG9uZW50KGRlcGVuZHNPbkZpZWxkKTtcclxuXHRcdGRlcGVuZHNPbklucHV0LnNldFZhbHVlKFxyXG5cdFx0XHRBcnJheS5pc0FycmF5KHRhc2subWV0YWRhdGEuZGVwZW5kc09uKVxyXG5cdFx0XHRcdD8gdGFzay5tZXRhZGF0YS5kZXBlbmRzT24uam9pbihcIiwgXCIpXHJcblx0XHRcdFx0OiB0YXNrLm1ldGFkYXRhLmRlcGVuZHNPbiB8fCBcIlwiXHJcblx0XHQpO1xyXG5cdFx0ZGVwZW5kc09uRmllbGRcclxuXHRcdFx0LmNyZWF0ZVNwYW4oeyBjbHM6IFwiZmllbGQtZGVzY3JpcHRpb25cIiB9KVxyXG5cdFx0XHQuc2V0VGV4dChcclxuXHRcdFx0XHR0KFwiQ29tbWEtc2VwYXJhdGVkIGxpc3Qgb2YgdGFzayBJRHMgdGhpcyB0YXNrIGRlcGVuZHMgb25cIilcclxuXHRcdFx0KTtcclxuXHJcblx0XHQvLyBUYXNrIElEXHJcblx0XHRjb25zdCB0YXNrSWRGaWVsZCA9IHRoaXMuY3JlYXRlRm9ybUZpZWxkKHRoaXMuZWRpdEZvcm1FbCwgdChcIlRhc2sgSURcIikpO1xyXG5cdFx0Y29uc3QgdGFza0lkSW5wdXQgPSBuZXcgVGV4dENvbXBvbmVudCh0YXNrSWRGaWVsZCk7XHJcblx0XHR0YXNrSWRJbnB1dC5zZXRWYWx1ZSh0YXNrLm1ldGFkYXRhLmlkIHx8IFwiXCIpO1xyXG5cdFx0dGFza0lkRmllbGRcclxuXHRcdFx0LmNyZWF0ZVNwYW4oeyBjbHM6IFwiZmllbGQtZGVzY3JpcHRpb25cIiB9KVxyXG5cdFx0XHQuc2V0VGV4dCh0KFwiVW5pcXVlIGlkZW50aWZpZXIgZm9yIHRoaXMgdGFza1wiKSk7XHJcblxyXG5cdFx0Ly8gUmVjdXJyZW5jZSBwYXR0ZXJuXHJcblx0XHRjb25zdCByZWN1cnJlbmNlRmllbGQgPSB0aGlzLmNyZWF0ZUZvcm1GaWVsZChcclxuXHRcdFx0dGhpcy5lZGl0Rm9ybUVsLFxyXG5cdFx0XHR0KFwiUmVjdXJyZW5jZVwiKVxyXG5cdFx0KTtcclxuXHRcdGNvbnN0IHJlY3VycmVuY2VJbnB1dCA9IG5ldyBUZXh0Q29tcG9uZW50KHJlY3VycmVuY2VGaWVsZCk7XHJcblx0XHRyZWN1cnJlbmNlSW5wdXQuc2V0VmFsdWUodGFzay5tZXRhZGF0YS5yZWN1cnJlbmNlIHx8IFwiXCIpO1xyXG5cdFx0cmVjdXJyZW5jZUZpZWxkXHJcblx0XHRcdC5jcmVhdGVTcGFuKHsgY2xzOiBcImZpZWxkLWRlc2NyaXB0aW9uXCIgfSlcclxuXHRcdFx0LnNldFRleHQodChcImUuZy4gZXZlcnkgZGF5LCBldmVyeSAyIHdlZWtzXCIpKTtcclxuXHJcblx0XHQvLyBSZWdpc3RlciBibHVyIGV2ZW50cyBmb3IgYWxsIGlucHV0IGVsZW1lbnRzXHJcblx0XHRjb25zdCByZWdpc3RlckJsdXJFdmVudCA9IChcclxuXHRcdFx0ZWw6IEhUTUxJbnB1dEVsZW1lbnQgfCBIVE1MU2VsZWN0RWxlbWVudFxyXG5cdFx0KSA9PiB7XHJcblx0XHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChlbCwgXCJibHVyXCIsICgpID0+IHtcclxuXHRcdFx0XHRzYXZlVGFzaygpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gUmVnaXN0ZXIgY2hhbmdlIGV2ZW50cyBmb3IgZGF0ZSBpbnB1dHNcclxuXHRcdGNvbnN0IHJlZ2lzdGVyRGF0ZUNoYW5nZUV2ZW50ID0gKGVsOiBIVE1MSW5wdXRFbGVtZW50KSA9PiB7XHJcblx0XHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChlbCwgXCJjaGFuZ2VcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdHNhdmVUYXNrKCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBSZWdpc3RlciBhbGwgaW5wdXQgZWxlbWVudHNcclxuXHRcdHJlZ2lzdGVyQmx1ckV2ZW50KGNvbnRlbnRJbnB1dC5pbnB1dEVsKTtcclxuXHRcdHJlZ2lzdGVyQmx1ckV2ZW50KHByb2plY3RJbnB1dC5pbnB1dEVsKTtcclxuXHRcdHJlZ2lzdGVyQmx1ckV2ZW50KHRhZ3NJbnB1dC5pbnB1dEVsKTtcclxuXHRcdHJlZ2lzdGVyQmx1ckV2ZW50KGNvbnRleHRJbnB1dC5pbnB1dEVsKTtcclxuXHRcdHJlZ2lzdGVyQmx1ckV2ZW50KHByaW9yaXR5RHJvcGRvd24uc2VsZWN0RWwpO1xyXG5cdFx0Ly8gUmVtb3ZlIGJsdXIgZXZlbnRzIGZvciBkYXRlIGlucHV0cyB0byBwcmV2ZW50IGR1cGxpY2F0ZSBzYXZlc1xyXG5cdFx0Ly8gcmVnaXN0ZXJCbHVyRXZlbnQoZHVlRGF0ZUlucHV0KTtcclxuXHRcdC8vIHJlZ2lzdGVyQmx1ckV2ZW50KHN0YXJ0RGF0ZUlucHV0KTtcclxuXHRcdC8vIHJlZ2lzdGVyQmx1ckV2ZW50KHNjaGVkdWxlZERhdGVJbnB1dCk7XHJcblx0XHQvLyBvbkNvbXBsZXRpb24gaW5wdXQgaXMgbm93IGhhbmRsZWQgYnkgT25Db21wbGV0aW9uQ29uZmlndXJhdG9yIG9yIGluIGZhbGxiYWNrXHJcblx0XHRyZWdpc3RlckJsdXJFdmVudChkZXBlbmRzT25JbnB1dC5pbnB1dEVsKTtcclxuXHRcdHJlZ2lzdGVyQmx1ckV2ZW50KHRhc2tJZElucHV0LmlucHV0RWwpO1xyXG5cdFx0cmVnaXN0ZXJCbHVyRXZlbnQocmVjdXJyZW5jZUlucHV0LmlucHV0RWwpO1xyXG5cclxuXHRcdC8vIFJlZ2lzdGVyIGNoYW5nZSBldmVudHMgZm9yIGRhdGUgaW5wdXRzXHJcblx0XHRyZWdpc3RlckRhdGVDaGFuZ2VFdmVudChkdWVEYXRlSW5wdXQpO1xyXG5cdFx0cmVnaXN0ZXJEYXRlQ2hhbmdlRXZlbnQoc3RhcnREYXRlSW5wdXQpO1xyXG5cdFx0cmVnaXN0ZXJEYXRlQ2hhbmdlRXZlbnQoc2NoZWR1bGVkRGF0ZUlucHV0KTtcclxuXHRcdHJlZ2lzdGVyRGF0ZUNoYW5nZUV2ZW50KGNhbmNlbGxlZERhdGVJbnB1dCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGhhc1Rhc2tDaGFuZ2VzKFxyXG5cdFx0b3JpZ2luYWxUYXNrOiBUYXNrIHwgRmlsZVRhc2ssXHJcblx0XHR1cGRhdGVkVGFzazogVGFzayB8IEZpbGVUYXNrXHJcblx0KTogYm9vbGVhbiB7XHJcblx0XHQvLyBGb3IgRmlsZVRhc2sgb2JqZWN0cywgd2UgbmVlZCB0byBhdm9pZCBjb21wYXJpbmcgdGhlIHNvdXJjZUVudHJ5IHByb3BlcnR5XHJcblx0XHQvLyB3aGljaCBjb250YWlucyBjaXJjdWxhciByZWZlcmVuY2VzIHRoYXQgY2FuJ3QgYmUgSlNPTi5zdHJpbmdpZnknZFxyXG5cdFx0Y29uc3QgaXNGaWxlVGFzayA9XHJcblx0XHRcdFwiaXNGaWxlVGFza1wiIGluIG9yaWdpbmFsVGFzayAmJiBvcmlnaW5hbFRhc2suaXNGaWxlVGFzaztcclxuXHJcblx0XHRpZiAoaXNGaWxlVGFzaykge1xyXG5cdFx0XHQvLyBDb21wYXJlIGFsbCBwcm9wZXJ0aWVzIGV4Y2VwdCBzb3VyY2VFbnRyeSBmb3IgRmlsZVRhc2tcclxuXHRcdFx0Y29uc3Qgb3JpZ2luYWxDb3B5ID0geyAuLi5vcmlnaW5hbFRhc2sgfTtcclxuXHRcdFx0Y29uc3QgdXBkYXRlZENvcHkgPSB7IC4uLnVwZGF0ZWRUYXNrIH07XHJcblxyXG5cdFx0XHQvLyBSZW1vdmUgc291cmNlRW50cnkgZnJvbSBjb21wYXJpc29uIGZvciBGaWxlVGFza1xyXG5cdFx0XHRpZiAoXCJzb3VyY2VFbnRyeVwiIGluIG9yaWdpbmFsQ29weSkge1xyXG5cdFx0XHRcdGRlbGV0ZSAob3JpZ2luYWxDb3B5IGFzIGFueSkuc291cmNlRW50cnk7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKFwic291cmNlRW50cnlcIiBpbiB1cGRhdGVkQ29weSkge1xyXG5cdFx0XHRcdGRlbGV0ZSAodXBkYXRlZENvcHkgYXMgYW55KS5zb3VyY2VFbnRyeTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRyZXR1cm4gKFxyXG5cdFx0XHRcdFx0SlNPTi5zdHJpbmdpZnkob3JpZ2luYWxDb3B5KSAhPT0gSlNPTi5zdHJpbmdpZnkodXBkYXRlZENvcHkpXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRcIkZhaWxlZCB0byBjb21wYXJlIHRhc2tzIHdpdGggSlNPTi5zdHJpbmdpZnksIGZhbGxpbmcgYmFjayB0byBwcm9wZXJ0eSBjb21wYXJpc29uOlwiLFxyXG5cdFx0XHRcdFx0ZXJyb3JcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHJldHVybiB0aGlzLmNvbXBhcmVUYXNrUHJvcGVydGllcyhvcmlnaW5hbFRhc2ssIHVwZGF0ZWRUYXNrKTtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gRm9yIHJlZ3VsYXIgVGFzayBvYmplY3RzLCB1c2UgSlNPTi5zdHJpbmdpZnkgY29tcGFyaXNvblxyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdHJldHVybiAoXHJcblx0XHRcdFx0XHRKU09OLnN0cmluZ2lmeShvcmlnaW5hbFRhc2spICE9PSBKU09OLnN0cmluZ2lmeSh1cGRhdGVkVGFzaylcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcdFwiRmFpbGVkIHRvIGNvbXBhcmUgdGFza3Mgd2l0aCBKU09OLnN0cmluZ2lmeSwgZmFsbGluZyBiYWNrIHRvIHByb3BlcnR5IGNvbXBhcmlzb246XCIsXHJcblx0XHRcdFx0XHRlcnJvclxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuY29tcGFyZVRhc2tQcm9wZXJ0aWVzKG9yaWdpbmFsVGFzaywgdXBkYXRlZFRhc2spO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNvbXBhcmVUYXNrUHJvcGVydGllcyhcclxuXHRcdG9yaWdpbmFsVGFzazogVGFzayB8IEZpbGVUYXNrLFxyXG5cdFx0dXBkYXRlZFRhc2s6IFRhc2sgfCBGaWxlVGFza1xyXG5cdCk6IGJvb2xlYW4ge1xyXG5cdFx0Ly8gQ29tcGFyZSBrZXkgcHJvcGVydGllcyB0aGF0IGNhbiBiZSBlZGl0ZWQgaW4gdGhlIGZvcm1cclxuXHRcdGNvbnN0IGNvbXBhcmVQcm9wcyA9IFtcclxuXHRcdFx0XCJjb250ZW50XCIsXHJcblx0XHRcdFwib3JpZ2luYWxNYXJrZG93blwiLFxyXG5cdFx0XHRcInByb2plY3RcIixcclxuXHRcdFx0XCJ0YWdzXCIsXHJcblx0XHRcdFwiY29udGV4dFwiLFxyXG5cdFx0XHRcInByaW9yaXR5XCIsXHJcblx0XHRcdFwiZHVlRGF0ZVwiLFxyXG5cdFx0XHRcInN0YXJ0RGF0ZVwiLFxyXG5cdFx0XHRcInNjaGVkdWxlZERhdGVcIixcclxuXHRcdFx0XCJjYW5jZWxsZWREYXRlXCIsXHJcblx0XHRcdFwib25Db21wbGV0aW9uXCIsXHJcblx0XHRcdFwiZGVwZW5kc09uXCIsXHJcblx0XHRcdFwiaWRcIixcclxuXHRcdFx0XCJyZWN1cnJlbmNlXCIsXHJcblx0XHRdO1xyXG5cclxuXHRcdGZvciAoY29uc3QgcHJvcCBvZiBjb21wYXJlUHJvcHMpIHtcclxuXHRcdFx0Y29uc3Qgb3JpZ2luYWxWYWx1ZSA9IChvcmlnaW5hbFRhc2sgYXMgYW55KVtwcm9wXTtcclxuXHRcdFx0Y29uc3QgdXBkYXRlZFZhbHVlID0gKHVwZGF0ZWRUYXNrIGFzIGFueSlbcHJvcF07XHJcblxyXG5cdFx0XHQvLyBIYW5kbGUgYXJyYXkgY29tcGFyaXNvbiBmb3IgdGFnc1xyXG5cdFx0XHRpZiAocHJvcCA9PT0gXCJ0YWdzXCIpIHtcclxuXHRcdFx0XHRjb25zdCBvcmlnaW5hbFRhZ3MgPSBBcnJheS5pc0FycmF5KG9yaWdpbmFsVmFsdWUpXHJcblx0XHRcdFx0XHQ/IG9yaWdpbmFsVmFsdWVcclxuXHRcdFx0XHRcdDogW107XHJcblx0XHRcdFx0Y29uc3QgdXBkYXRlZFRhZ3MgPSBBcnJheS5pc0FycmF5KHVwZGF0ZWRWYWx1ZSlcclxuXHRcdFx0XHRcdD8gdXBkYXRlZFZhbHVlXHJcblx0XHRcdFx0XHQ6IFtdO1xyXG5cclxuXHRcdFx0XHRpZiAob3JpZ2luYWxUYWdzLmxlbmd0aCAhPT0gdXBkYXRlZFRhZ3MubGVuZ3RoKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgb3JpZ2luYWxUYWdzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0XHRpZiAob3JpZ2luYWxUYWdzW2ldICE9PSB1cGRhdGVkVGFnc1tpXSkge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gU2ltcGxlIHZhbHVlIGNvbXBhcmlzb25cclxuXHRcdFx0XHRpZiAob3JpZ2luYWxWYWx1ZSAhPT0gdXBkYXRlZFZhbHVlKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNyZWF0ZUZvcm1GaWVsZChcclxuXHRcdGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXHJcblx0XHRsYWJlbDogc3RyaW5nXHJcblx0KTogSFRNTEVsZW1lbnQge1xyXG5cdFx0Y29uc3QgZmllbGRFbCA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwiZGV0YWlscy1mb3JtLWZpZWxkXCIgfSk7XHJcblxyXG5cdFx0ZmllbGRFbC5jcmVhdGVEaXYoeyBjbHM6IFwiZGV0YWlscy1mb3JtLWxhYmVsXCIsIHRleHQ6IGxhYmVsIH0pO1xyXG5cclxuXHRcdHJldHVybiBmaWVsZEVsLmNyZWF0ZURpdih7IGNsczogXCJkZXRhaWxzLWZvcm0taW5wdXRcIiB9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYWRkTWV0YWRhdGFGaWVsZChcclxuXHRcdGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXHJcblx0XHRsYWJlbDogc3RyaW5nLFxyXG5cdFx0dmFsdWU6IHN0cmluZ1xyXG5cdCkge1xyXG5cdFx0Y29uc3QgZmllbGRFbCA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwibWV0YWRhdGEtZmllbGRcIiB9KTtcclxuXHJcblx0XHRjb25zdCBsYWJlbEVsID0gZmllbGRFbC5jcmVhdGVEaXYoeyBjbHM6IFwibWV0YWRhdGEtbGFiZWxcIiB9KTtcclxuXHRcdGxhYmVsRWwuc2V0VGV4dChsYWJlbCk7XHJcblxyXG5cdFx0Y29uc3QgdmFsdWVFbCA9IGZpZWxkRWwuY3JlYXRlRGl2KHsgY2xzOiBcIm1ldGFkYXRhLXZhbHVlXCIgfSk7XHJcblx0XHR2YWx1ZUVsLnNldFRleHQodmFsdWUpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBlZGl0VGFzayh0YXNrOiBUYXNrIHwgRmlsZVRhc2spIHtcclxuXHRcdGlmICh0eXBlb2YgdGFzayA9PT0gXCJvYmplY3RcIiAmJiBcImlzRmlsZVRhc2tcIiBpbiB0YXNrKSB7XHJcblx0XHRcdGNvbnN0IGZpbGVUYXNrID0gdGFzayBhcyBGaWxlVGFzaztcclxuXHRcdFx0Y29uc3QgZmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEZpbGVCeVBhdGgoXHJcblx0XHRcdFx0ZmlsZVRhc2suc291cmNlRW50cnkuZmlsZS5wYXRoXHJcblx0XHRcdCk7XHJcblx0XHRcdGlmICghZmlsZSkgcmV0dXJuO1xyXG5cdFx0XHRjb25zdCBsZWFmID0gdGhpcy5hcHAud29ya3NwYWNlLmdldExlYWYodHJ1ZSk7XHJcblx0XHRcdGF3YWl0IGxlYWYub3BlbkZpbGUoZmlsZSk7XHJcblx0XHRcdGNvbnN0IGVkaXRvciA9IHRoaXMuYXBwLndvcmtzcGFjZS5hY3RpdmVFZGl0b3I/LmVkaXRvcjtcclxuXHRcdFx0aWYgKGVkaXRvcikge1xyXG5cdFx0XHRcdGVkaXRvci5zZXRDdXJzb3IoeyBsaW5lOiBmaWxlVGFzay5saW5lIHx8IDAsIGNoOiAwIH0pO1xyXG5cdFx0XHRcdGVkaXRvci5mb2N1cygpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBHZXQgdGhlIGZpbGUgZnJvbSB0aGUgdmF1bHRcclxuXHRcdGNvbnN0IGZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRGaWxlQnlQYXRoKHRhc2suZmlsZVBhdGgpO1xyXG5cdFx0aWYgKCFmaWxlKSByZXR1cm47XHJcblxyXG5cdFx0Ly8gT3BlbiB0aGUgZmlsZVxyXG5cdFx0Y29uc3QgbGVhZiA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWFmKGZhbHNlKTtcclxuXHRcdGF3YWl0IGxlYWYub3BlbkZpbGUoZmlsZSk7XHJcblxyXG5cdFx0Ly8gVHJ5IHRvIHNldCB0aGUgY3Vyc29yIGF0IHRoZSB0YXNrJ3MgbGluZVxyXG5cdFx0Y29uc3QgZWRpdG9yID0gdGhpcy5hcHAud29ya3NwYWNlLmFjdGl2ZUVkaXRvcj8uZWRpdG9yO1xyXG5cdFx0aWYgKGVkaXRvcikge1xyXG5cdFx0XHRlZGl0b3Iuc2V0Q3Vyc29yKHsgbGluZTogdGFzay5saW5lIHx8IDAsIGNoOiAwIH0pO1xyXG5cdFx0XHRlZGl0b3IuZm9jdXMoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzZXRWaXNpYmxlKHZpc2libGU6IGJvb2xlYW4pIHtcclxuXHRcdHRoaXMuaXNWaXNpYmxlID0gdmlzaWJsZTtcclxuXHJcblx0XHRpZiAodmlzaWJsZSkge1xyXG5cdFx0XHR0aGlzLmNvbnRhaW5lckVsLnNob3coKTtcclxuXHRcdFx0dGhpcy5jb250YWluZXJFbC5hZGRDbGFzcyhcInZpc2libGVcIik7XHJcblx0XHRcdHRoaXMuY29udGFpbmVyRWwucmVtb3ZlQ2xhc3MoXCJoaWRkZW5cIik7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLmNvbnRhaW5lckVsLmFkZENsYXNzKFwiaGlkZGVuXCIpO1xyXG5cdFx0XHR0aGlzLmNvbnRhaW5lckVsLnJlbW92ZUNsYXNzKFwidmlzaWJsZVwiKTtcclxuXHJcblx0XHRcdC8vIE9wdGlvbmFsbHkgaGlkZSB3aXRoIGFuaW1hdGlvbiwgdGhlbiB0cnVseSBoaWRlXHJcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdGlmICghdGhpcy5pc1Zpc2libGUpIHtcclxuXHRcdFx0XHRcdHRoaXMuY29udGFpbmVyRWwuaGlkZSgpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSwgMzAwKTsgLy8gbWF0Y2ggYW5pbWF0aW9uIGR1cmF0aW9uIG9mIDAuM3NcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHB1YmxpYyBnZXRDdXJyZW50VGFzaygpOiBUYXNrIHwgbnVsbCB7XHJcblx0XHRyZXR1cm4gdGhpcy5jdXJyZW50VGFzaztcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBpc0N1cnJlbnRseUVkaXRpbmcoKTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gdGhpcy5pc0VkaXRpbmc7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHNob3VsZFRyaWdnZXJPbkNvbXBsZXRpb25TYXZlKGNvbmZpZzogYW55LCB2YWx1ZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0XHQvLyBEb24ndCBzYXZlIGlmIHZhbHVlIGlzIGVtcHR5XHJcblx0XHRpZiAoIXZhbHVlIHx8ICF2YWx1ZS50cmltKCkpIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIERvbid0IHNhdmUgaWYgbm8gY29uZmlnIChpbnZhbGlkIHN0YXRlKVxyXG5cdFx0aWYgKCFjb25maWcpIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEZvciBiYXNpYyBhY3Rpb24gdHlwZXMsIGFsbG93IGltbWVkaWF0ZSBzYXZlXHJcblx0XHRpZiAoXHJcblx0XHRcdGNvbmZpZy50eXBlID09PSBcImRlbGV0ZVwiIHx8XHJcblx0XHRcdGNvbmZpZy50eXBlID09PSBcImtlZXBcIiB8fFxyXG5cdFx0XHRjb25maWcudHlwZSA9PT0gXCJhcmNoaXZlXCIgfHxcclxuXHRcdFx0Y29uZmlnLnR5cGUgPT09IFwiZHVwbGljYXRlXCJcclxuXHRcdCkge1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBGb3IgY29tcGxleCB0eXBlcywgYWxsb3cgc2F2ZSBpZiB3ZSBoYXZlIHBhcnRpYWwgYnV0IG1lYW5pbmdmdWwgY29uZmlnXHJcblx0XHRpZiAoY29uZmlnLnR5cGUgPT09IFwiY29tcGxldGVcIikge1xyXG5cdFx0XHQvLyBBbGxvdyBzYXZlIGZvciBcImNvbXBsZXRlOlwiIGV2ZW4gd2l0aG91dCB0YXNrSWRzXHJcblx0XHRcdHJldHVybiB2YWx1ZS5zdGFydHNXaXRoKFwiY29tcGxldGU6XCIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChjb25maWcudHlwZSA9PT0gXCJtb3ZlXCIpIHtcclxuXHRcdFx0Ly8gQWxsb3cgc2F2ZSBmb3IgXCJtb3ZlOlwiIGV2ZW4gd2l0aG91dCB0YXJnZXRGaWxlXHJcblx0XHRcdHJldHVybiB2YWx1ZS5zdGFydHNXaXRoKFwibW92ZTpcIik7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRGVmYXVsdDogYWxsb3cgc2F2ZSBpZiB2YWx1ZSBpcyBub3QgZW1wdHlcclxuXHRcdHJldHVybiB0cnVlO1xyXG5cdH1cclxuXHJcblx0b251bmxvYWQoKSB7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLmVtcHR5KCk7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLnJlbW92ZSgpO1xyXG5cdH1cclxufVxyXG4iXX0=