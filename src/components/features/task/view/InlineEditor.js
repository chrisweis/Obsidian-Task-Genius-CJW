import { __awaiter } from "tslib";
import { Component, debounce, setIcon, Menu } from "obsidian";
import { ContextSuggest, ProjectSuggest, TagSuggest, } from "@/components/ui/inputs/AutoComplete";
import { clearAllMarks } from "@/components/ui/renderers/MarkdownRenderer";
import { createEmbeddableMarkdownEditor, } from "@/editor-extensions/core/markdown-editor";
import "@/styles/inline-editor.css";
import { getEffectiveProject, isProjectReadonly, } from "@/utils/task/task-operations";
import { t } from "@/translations/helper";
import { sanitizePriorityForClass } from "@/utils/task/priority-utils";
import { OnCompletionModal } from "@/components/features/on-completion/OnCompletionModal";
import { localDateStringToTimestamp } from "@/utils/date/date-display-helper";
export class InlineEditor extends Component {
    constructor(app, plugin, task, options) {
        super();
        this.app = app;
        this.plugin = plugin;
        this.isEditing = false;
        this.originalTask = null;
        this.isSaving = false;
        // Edit elements - only created when needed
        this.contentInput = null;
        this.embeddedEditor = null;
        this.activeInput = null;
        this.activeSuggest = null;
        // Debounced save function - only created when needed
        this.debouncedSave = null;
        // Performance optimization: reuse event handlers
        this.boundHandlers = {
            stopPropagation: (e) => e.stopPropagation(),
            handleKeydown: (e) => this.handleKeydown(e),
            handleBlur: (e) => this.handleBlur(e),
            handleInput: (e) => this.handleInput(e),
        };
        // Don't clone task until editing starts - saves memory
        this.task = task;
        this.options = options;
    }
    onload() {
        // Only create container when component loads
        this.containerEl = createDiv({ cls: "inline-editor" });
    }
    /**
     * Initialize editing state - called only when editing starts
     */
    initializeEditingState() {
        // Force cleanup any previous editing state
        if (this.isEditing) {
            console.warn("Editor already in editing state, forcing cleanup");
            this.cleanupEditors();
        }
        // Reset states
        this.isEditing = false;
        this.isSaving = false;
        // Create debounced save function
        this.debouncedSave = debounce(() => __awaiter(this, void 0, void 0, function* () {
            yield this.saveTask();
        }), 800);
        // Store original task state for potential restoration - deep clone to avoid reference issues
        this.originalTask = Object.assign(Object.assign({}, this.task), { metadata: Object.assign({}, this.task.metadata) });
    }
    /**
     * Show inline editor for task content
     */
    showContentEditor(targetEl) {
        this.initializeEditingState();
        this.isEditing = true;
        targetEl.empty();
        // Extract the text content from the original markdown
        let editableContent = clearAllMarks(this.task.content);
        // If content is empty, try to extract from originalMarkdown
        if (!editableContent && this.task.originalMarkdown) {
            const markdownWithoutMarker = this.task.originalMarkdown.replace(/^\s*[-*+]\s*\[[^\]]*\]\s*/, "");
            editableContent = clearAllMarks(markdownWithoutMarker).trim();
        }
        // If still empty, use clearAllMarks on the content
        if (!editableContent && this.task.content) {
            editableContent = clearAllMarks(this.task.content).trim();
        }
        if (this.options.useEmbeddedEditor) {
            this.createEmbeddedEditor(targetEl, editableContent || "");
        }
        else {
            this.createTextareaEditor(targetEl, editableContent || "");
        }
    }
    createEmbeddedEditor(targetEl, content) {
        // Create container for the embedded editor
        const editorContainer = targetEl.createDiv({
            cls: "inline-embedded-editor-container",
        });
        // Prevent event bubbling
        this.registerDomEvent(editorContainer, "click", this.boundHandlers.stopPropagation);
        this.registerDomEvent(editorContainer, "mousedown", this.boundHandlers.stopPropagation);
        try {
            this.embeddedEditor = createEmbeddableMarkdownEditor(this.app, editorContainer, {
                value: content,
                placeholder: "Enter task content...",
                cls: "inline-embedded-editor",
                onEnter: (editor, mod, shift) => {
                    // Save and exit on Enter (regardless of shift)
                    this.finishContentEdit(targetEl).catch(console.error);
                    return true;
                },
                onEscape: (editor) => {
                    this.cancelContentEdit(targetEl);
                },
                onBlur: () => {
                    this.finishContentEdit(targetEl).catch(console.error);
                },
                onChange: () => {
                    var _a;
                    // Update task content immediately but don't save
                    this.task.content = ((_a = this.embeddedEditor) === null || _a === void 0 ? void 0 : _a.value) || "";
                },
            });
            // Focus the editor with better timing
            this.focusEditor();
        }
        catch (error) {
            console.error("Failed to create embedded editor, falling back to textarea:", error);
            // Fallback to textarea if embedded editor fails
            editorContainer.remove();
            this.createTextareaEditor(targetEl, content);
        }
    }
    createTextareaEditor(targetEl, content) {
        // Create content editor
        this.contentInput = targetEl.createEl("textarea", {
            cls: "inline-content-editor",
        });
        // Prevent event bubbling
        this.registerDomEvent(this.contentInput, "click", this.boundHandlers.stopPropagation);
        this.registerDomEvent(this.contentInput, "mousedown", this.boundHandlers.stopPropagation);
        // Set the value after creation
        this.contentInput.value = content;
        // Auto-resize textarea
        this.autoResizeTextarea(this.contentInput);
        // Focus and select all text
        this.contentInput.focus();
        this.contentInput.select();
        // Register events with optimized handlers
        this.registerDomEvent(this.contentInput, "input", this.boundHandlers.handleInput);
        this.registerDomEvent(this.contentInput, "blur", this.boundHandlers.handleBlur);
        this.registerDomEvent(this.contentInput, "keydown", this.boundHandlers.handleKeydown);
    }
    /**
     * Show inline editor for metadata field
     */
    showMetadataEditor(targetEl, fieldType, currentValue) {
        this.initializeEditingState();
        this.isEditing = true;
        targetEl.empty();
        const editorContainer = targetEl.createDiv({
            cls: "inline-metadata-editor",
        });
        // Prevent event bubbling at container level
        this.registerDomEvent(editorContainer, "click", this.boundHandlers.stopPropagation);
        this.registerDomEvent(editorContainer, "mousedown", this.boundHandlers.stopPropagation);
        switch (fieldType) {
            case "project":
                this.createProjectEditor(editorContainer, currentValue);
                break;
            case "tags":
                this.createTagsEditor(editorContainer, currentValue);
                break;
            case "context":
                this.createContextEditor(editorContainer, currentValue);
                break;
            case "dueDate":
            case "startDate":
            case "scheduledDate":
            case "cancelledDate":
            case "completedDate":
                this.createDateEditor(editorContainer, fieldType, currentValue);
                break;
            case "priority":
                this.createPriorityEditor(editorContainer, currentValue);
                break;
            case "recurrence":
                this.createRecurrenceEditor(editorContainer, currentValue);
                break;
            case "onCompletion":
                this.createOnCompletionEditor(editorContainer, currentValue);
                break;
            case "dependsOn":
                this.createDependsOnEditor(editorContainer, currentValue);
                break;
            case "id":
                this.createIdEditor(editorContainer, currentValue);
                break;
        }
    }
    /**
     * Show add metadata button
     */
    showAddMetadataButton(targetEl) {
        const addBtn = targetEl.createEl("button", {
            cls: "add-metadata-btn",
            attr: { "aria-label": "Add metadata" },
        });
        setIcon(addBtn, "plus");
        this.registerDomEvent(addBtn, "click", (e) => {
            e.stopPropagation();
            this.showMetadataMenu(addBtn);
        });
    }
    createProjectEditor(container, currentValue) {
        // Get effective project and readonly status
        const effectiveProject = getEffectiveProject(this.task);
        const isReadonly = isProjectReadonly(this.task);
        const input = container.createEl("input", {
            type: "text",
            cls: "inline-project-input",
            value: effectiveProject || "",
            placeholder: "Enter project name",
        });
        // Add visual indicator for tgProject - only show if no user-set project exists
        if (this.task.metadata.tgProject &&
            (!this.task.metadata.project || !this.task.metadata.project.trim())) {
            const tgProject = this.task.metadata.tgProject;
            const indicator = container.createDiv({
                cls: "project-source-indicator inline-indicator",
            });
            // Create indicator text based on tgProject type
            let indicatorText = "";
            let indicatorIcon = "";
            switch (tgProject.type) {
                case "path":
                    indicatorText = t("Auto from path");
                    indicatorIcon = "📁";
                    break;
                case "metadata":
                    indicatorText = t("Auto from metadata");
                    indicatorIcon = "📄";
                    break;
                case "config":
                    indicatorText = t("Auto from config");
                    indicatorIcon = "⚙️";
                    break;
                default:
                    indicatorText = t("Auto-assigned");
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
                input.disabled = true;
                input.title = t("This project is automatically assigned and cannot be changed");
            }
            else {
                indicator.addClass("override-indicator");
                input.title = t("You can override the auto-assigned project");
            }
        }
        this.activeInput = input;
        // Prevent event bubbling on input element
        this.registerDomEvent(input, "click", this.boundHandlers.stopPropagation);
        this.registerDomEvent(input, "mousedown", this.boundHandlers.stopPropagation);
        const updateProject = (value) => {
            // Only update project if it's not a read-only tgProject
            if (!isReadonly) {
                this.task.metadata.project = value || undefined;
            }
        };
        this.setupInputEvents(input, updateProject, "project");
        // Add autocomplete only if not readonly
        if (!isReadonly) {
            this.activeSuggest = new ProjectSuggest(this.app, input, this.plugin);
        }
        // Focus and select
        input.focus();
        input.select();
    }
    createTagsEditor(container, currentValue) {
        const input = container.createEl("input", {
            type: "text",
            cls: "inline-tags-input",
            value: currentValue || "",
            placeholder: "Enter tags (comma separated)",
        });
        this.activeInput = input;
        // Prevent event bubbling on input element
        this.registerDomEvent(input, "click", this.boundHandlers.stopPropagation);
        this.registerDomEvent(input, "mousedown", this.boundHandlers.stopPropagation);
        const updateTags = (value) => {
            this.task.metadata.tags = value
                ? value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter((tag) => tag)
                : [];
        };
        this.setupInputEvents(input, updateTags, "tags");
        // Add autocomplete
        this.activeSuggest = new TagSuggest(this.app, input, this.plugin);
        // Focus and select
        input.focus();
        input.select();
    }
    createContextEditor(container, currentValue) {
        const input = container.createEl("input", {
            type: "text",
            cls: "inline-context-input",
            value: currentValue || "",
            placeholder: "Enter context",
        });
        this.activeInput = input;
        // Prevent event bubbling on input element
        this.registerDomEvent(input, "click", this.boundHandlers.stopPropagation);
        this.registerDomEvent(input, "mousedown", this.boundHandlers.stopPropagation);
        const updateContext = (value) => {
            this.task.metadata.context = value || undefined;
        };
        this.setupInputEvents(input, updateContext, "context");
        // Add autocomplete
        this.activeSuggest = new ContextSuggest(this.app, input, this.plugin);
        // Focus and select
        input.focus();
        input.select();
    }
    createDateEditor(container, fieldType, currentValue) {
        const input = container.createEl("input", {
            type: "date",
            cls: "inline-date-input",
            value: currentValue || "",
        });
        this.activeInput = input;
        // Prevent event bubbling on input element
        this.registerDomEvent(input, "click", this.boundHandlers.stopPropagation);
        this.registerDomEvent(input, "mousedown", this.boundHandlers.stopPropagation);
        const updateDate = (value) => {
            if (value) {
                // Store dates consistently at UTC noon
                const ts = localDateStringToTimestamp(value);
                this.task.metadata[fieldType] = ts;
            }
            else {
                this.task.metadata[fieldType] = undefined;
            }
        };
        this.setupInputEvents(input, updateDate, fieldType);
        // Focus
        input.focus();
    }
    createPriorityEditor(container, currentValue) {
        const select = container.createEl("select", {
            cls: "inline-priority-select",
        });
        // Prevent event bubbling on select element
        this.registerDomEvent(select, "click", this.boundHandlers.stopPropagation);
        this.registerDomEvent(select, "mousedown", this.boundHandlers.stopPropagation);
        // Add priority options
        const options = [
            { value: "", text: "None" },
            { value: "1", text: "⏬️ Lowest" },
            { value: "2", text: "🔽 Low" },
            { value: "3", text: "🔼 Medium" },
            { value: "4", text: "⏫ High" },
            { value: "5", text: "🔺 Highest" },
        ];
        options.forEach((option) => {
            const optionEl = select.createEl("option", {
                value: option.value,
                text: option.text,
            });
        });
        select.value = currentValue || "";
        this.activeInput = select;
        const updatePriority = (value) => {
            this.task.metadata.priority = value ? parseInt(value) : undefined;
        };
        this.setupInputEvents(select, updatePriority, "priority");
        // Focus
        select.focus();
    }
    createRecurrenceEditor(container, currentValue) {
        const input = container.createEl("input", {
            type: "text",
            cls: "inline-recurrence-input",
            value: currentValue || "",
            placeholder: "e.g. every day, every 2 weeks",
        });
        this.activeInput = input;
        // Prevent event bubbling on input element
        this.registerDomEvent(input, "click", this.boundHandlers.stopPropagation);
        this.registerDomEvent(input, "mousedown", this.boundHandlers.stopPropagation);
        const updateRecurrence = (value) => {
            this.task.metadata.recurrence = value || undefined;
        };
        this.setupInputEvents(input, updateRecurrence, "recurrence");
        // Focus and select
        input.focus();
        input.select();
    }
    createOnCompletionEditor(container, currentValue) {
        const buttonContainer = container.createDiv({
            cls: "inline-oncompletion-button-container",
        });
        // Prevent event bubbling on container
        this.registerDomEvent(buttonContainer, "click", this.boundHandlers.stopPropagation);
        this.registerDomEvent(buttonContainer, "mousedown", this.boundHandlers.stopPropagation);
        // Create a simple button to show current value and open modal
        const configButton = buttonContainer.createEl("button", {
            cls: "inline-oncompletion-config-button",
            text: currentValue ||
                this.task.metadata.onCompletion ||
                t("Configure..."),
        });
        // Add click handler to open modal
        this.registerDomEvent(configButton, "click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.openOnCompletionModal(container, currentValue);
        });
        // Set up keyboard handling
        this.registerDomEvent(buttonContainer, "keydown", (e) => {
            var _a;
            if (e.key === "Escape") {
                const targetEl = (_a = buttonContainer.closest(".inline-metadata-editor")) === null || _a === void 0 ? void 0 : _a.parentElement;
                if (targetEl) {
                    this.cancelMetadataEdit(targetEl);
                }
            }
            else if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                this.openOnCompletionModal(container, currentValue);
            }
        });
        // Focus the button
        configButton.focus();
    }
    openOnCompletionModal(container, currentValue) {
        return __awaiter(this, void 0, void 0, function* () {
            const modal = new OnCompletionModal(this.app, this.plugin, {
                initialValue: currentValue || this.task.metadata.onCompletion || "",
                onSave: (value) => {
                    var _a, _b;
                    // Update the task metadata
                    this.task.metadata.onCompletion = value || undefined;
                    // Update the button text
                    const button = container.querySelector(".inline-oncompletion-config-button");
                    if (button) {
                        button.textContent = value || t("Configure...");
                    }
                    // Trigger debounced save
                    (_a = this.debouncedSave) === null || _a === void 0 ? void 0 : _a.call(this);
                    // Finish the metadata edit
                    const targetEl = (_b = container.closest(".inline-metadata-editor")) === null || _b === void 0 ? void 0 : _b.parentElement;
                    if (targetEl) {
                        this.finishMetadataEdit(targetEl, "onCompletion").catch(console.error);
                    }
                },
                onCancel: () => {
                    var _a;
                    // Finish the metadata edit without saving
                    const targetEl = (_a = container.closest(".inline-metadata-editor")) === null || _a === void 0 ? void 0 : _a.parentElement;
                    if (targetEl) {
                        this.cancelMetadataEdit(targetEl);
                    }
                },
            });
            modal.open();
        });
    }
    createDependsOnEditor(container, currentValue) {
        const input = container.createEl("input", {
            type: "text",
            cls: "inline-dependson-input",
            value: currentValue ||
                (this.task.metadata.dependsOn
                    ? this.task.metadata.dependsOn.join(", ")
                    : ""),
            placeholder: "Task IDs separated by commas",
        });
        this.activeInput = input;
        // Prevent event bubbling on input element
        this.registerDomEvent(input, "click", this.boundHandlers.stopPropagation);
        this.registerDomEvent(input, "mousedown", this.boundHandlers.stopPropagation);
        const updateDependsOn = (value) => {
            if (value.trim()) {
                this.task.metadata.dependsOn = value
                    .split(",")
                    .map((id) => id.trim())
                    .filter((id) => id.length > 0);
            }
            else {
                this.task.metadata.dependsOn = undefined;
            }
        };
        this.setupInputEvents(input, updateDependsOn, "dependsOn");
        // Focus and select
        input.focus();
        input.select();
    }
    createIdEditor(container, currentValue) {
        const input = container.createEl("input", {
            type: "text",
            cls: "inline-id-input",
            value: currentValue || this.task.metadata.id || "",
            placeholder: "Unique task identifier",
        });
        this.activeInput = input;
        // Prevent event bubbling on input element
        this.registerDomEvent(input, "click", this.boundHandlers.stopPropagation);
        this.registerDomEvent(input, "mousedown", this.boundHandlers.stopPropagation);
        const updateId = (value) => {
            this.task.metadata.id = value || undefined;
        };
        this.setupInputEvents(input, updateId, "id");
        // Focus and select
        input.focus();
        input.select();
    }
    setupInputEvents(input, updateCallback, fieldType) {
        // Store the field type for later use
        input._fieldType = fieldType;
        input._updateCallback = updateCallback;
        // For date inputs, only save on blur or Enter key, not on input change
        const isDateField = fieldType &&
            [
                "dueDate",
                "startDate",
                "scheduledDate",
                "cancelledDate",
                "completedDate",
            ].includes(fieldType);
        if (isDateField) {
            // For date inputs, update the value but don't trigger save on input
            this.registerDomEvent(input, "input", (e) => {
                const target = e.target;
                const updateCallback = target._updateCallback;
                if (updateCallback) {
                    updateCallback(target.value);
                    // Don't call debouncedSave here for date fields
                }
            });
        }
        else {
            // For non-date inputs, use the regular handler that includes debounced save
            this.registerDomEvent(input, "input", this.boundHandlers.handleInput);
        }
        this.registerDomEvent(input, "blur", this.boundHandlers.handleBlur);
        this.registerDomEvent(input, "keydown", this.boundHandlers.handleKeydown);
    }
    // Optimized event handlers
    handleInput(e) {
        var _a;
        const target = e.target;
        if (target === this.contentInput) {
            // Auto-resize textarea
            this.autoResizeTextarea(target);
            // Update task content immediately but don't save
            this.task.content = target.value;
        }
        else if (target === this.activeInput) {
            // Handle metadata input
            const updateCallback = target._updateCallback;
            if (updateCallback) {
                updateCallback(target.value);
                (_a = this.debouncedSave) === null || _a === void 0 ? void 0 : _a.call(this);
            }
        }
    }
    handleBlur(e) {
        var _a, _b;
        const target = e.target;
        // Check if focus is moving to another element within our editor
        const relatedTarget = e.relatedTarget;
        if (relatedTarget && ((_a = this.containerEl) === null || _a === void 0 ? void 0 : _a.contains(relatedTarget))) {
            return; // Don't finish edit if focus is staying within our editor
        }
        // For content editing, finish the edit
        if (target === this.contentInput && this.isEditing) {
            const contentEl = target.closest(".task-item-content");
            if (contentEl) {
                this.finishContentEdit(contentEl).catch(console.error);
            }
            return;
        }
        // For metadata editing, finish the specific metadata edit
        if (target === this.activeInput && this.isEditing) {
            const fieldType = target._fieldType;
            const targetEl = (_b = target.closest(".inline-metadata-editor")) === null || _b === void 0 ? void 0 : _b.parentElement;
            if (targetEl && fieldType) {
                this.finishMetadataEdit(targetEl, fieldType).catch(console.error);
            }
        }
    }
    handleKeydown(e) {
        var _a, _b;
        if (e.key === "Escape") {
            const target = e.target;
            if (target === this.contentInput) {
                const contentEl = target.closest(".task-item-content");
                if (contentEl) {
                    this.cancelContentEdit(contentEl);
                }
            }
            else if (target === this.activeInput) {
                const targetEl = (_a = target.closest(".inline-metadata-editor")) === null || _a === void 0 ? void 0 : _a.parentElement;
                if (targetEl) {
                    this.cancelMetadataEdit(targetEl);
                }
            }
        }
        else if (e.key === "Enter" && !e.shiftKey) {
            const target = e.target;
            if (target === this.activeInput) {
                e.preventDefault();
                const fieldType = target._fieldType;
                const targetEl = (_b = target.closest(".inline-metadata-editor")) === null || _b === void 0 ? void 0 : _b.parentElement;
                if (targetEl && fieldType) {
                    this.finishMetadataEdit(targetEl, fieldType).catch(console.error);
                }
            }
            // For content editing, let the embedded editor handle Enter
        }
    }
    autoResizeTextarea(textarea) {
        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + "px";
    }
    focusEditor() {
        // Use requestAnimationFrame for better timing
        requestAnimationFrame(() => {
            var _a;
            if ((_a = this.embeddedEditor) === null || _a === void 0 ? void 0 : _a.activeCM) {
                this.embeddedEditor.activeCM.focus();
                // Select all text
                this.embeddedEditor.activeCM.dispatch({
                    selection: {
                        anchor: 0,
                        head: this.embeddedEditor.value.length,
                    },
                });
            }
        });
    }
    showMetadataMenu(buttonEl) {
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
                        this.showMetadataEditor(buttonEl.parentElement, field.key);
                    });
                });
            });
        }
        menu.showAtPosition({
            x: buttonEl.getBoundingClientRect().left,
            y: buttonEl.getBoundingClientRect().bottom,
        });
    }
    saveTask() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEditing || !this.originalTask || this.isSaving) {
                return false;
            }
            // Check if there are actual changes
            const hasChanges = this.hasTaskChanges(this.originalTask, this.task);
            if (!hasChanges) {
                return true;
            }
            this.isSaving = true;
            try {
                console.log("[InlineEditor] Calling onTaskUpdate:", this.originalTask.content, "->", this.task.content);
                yield this.options.onTaskUpdate(this.originalTask, this.task);
                this.originalTask = Object.assign(Object.assign({}, this.task), { metadata: Object.assign({}, this.task.metadata) });
                return true;
            }
            catch (error) {
                console.error("Failed to save task:", error);
                // Revert changes on error
                this.task = Object.assign(Object.assign({}, this.originalTask), { metadata: Object.assign({}, this.originalTask.metadata) });
                return false;
            }
            finally {
                this.isSaving = false;
            }
        });
    }
    hasTaskChanges(originalTask, updatedTask) {
        // Compare content (top-level property)
        if (originalTask.content !== updatedTask.content) {
            return true;
        }
        // Compare metadata properties
        const metadataProps = [
            "project",
            "tags",
            "context",
            "priority",
            "dueDate",
            "startDate",
            "scheduledDate",
            "cancelledDate",
            "completedDate",
            "recurrence",
        ];
        for (const prop of metadataProps) {
            const originalValue = originalTask.metadata[prop];
            const updatedValue = updatedTask.metadata[prop];
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
    finishContentEdit(targetEl) {
        return __awaiter(this, void 0, void 0, function* () {
            // Prevent multiple concurrent saves
            if (this.isSaving) {
                console.log("Save already in progress, waiting...");
                // Wait for current save to complete
                while (this.isSaving) {
                    yield new Promise((resolve) => setTimeout(resolve, 50));
                }
            }
            // Get final content from the appropriate editor
            if (this.embeddedEditor) {
                this.task.content = this.embeddedEditor.value;
            }
            else if (this.contentInput) {
                this.task.content = this.contentInput.value;
            }
            // Save the task and wait for completion
            const saveSuccess = yield this.saveTask();
            console.log("save success", saveSuccess);
            if (!saveSuccess) {
                console.error("Failed to save task, not finishing edit");
                return;
            }
            // Only proceed with cleanup after successful save
            this.isEditing = false;
            // Clean up embedded editor
            this.cleanupEditors();
            // Notify parent component to restore content display
            // Pass the updated task so parent can update its reference
            if (this.options.onContentEditFinished) {
                this.options.onContentEditFinished(targetEl, this.task);
            }
            else {
                // Fallback: just set text content
                targetEl.textContent = this.task.content;
            }
            // Release this editor back to the manager
            this.releaseFromManager();
        });
    }
    cancelContentEdit(targetEl) {
        this.isEditing = false;
        // Revert changes
        if (this.originalTask) {
            this.task.content = this.originalTask.content;
        }
        // Clean up embedded editor
        this.cleanupEditors();
        // Notify parent component to restore content display
        if (this.options.onContentEditFinished) {
            this.options.onContentEditFinished(targetEl, this.task);
        }
        else {
            // Fallback: just set text content
            targetEl.textContent = this.task.content;
        }
        // Release this editor back to the manager
        this.releaseFromManager();
    }
    finishMetadataEdit(targetEl, fieldType) {
        return __awaiter(this, void 0, void 0, function* () {
            // Prevent multiple concurrent saves
            if (this.isSaving) {
                console.log("Save already in progress, waiting...");
                while (this.isSaving) {
                    yield new Promise((resolve) => setTimeout(resolve, 50));
                }
            }
            // Save the task and wait for completion
            const saveSuccess = yield this.saveTask();
            if (!saveSuccess) {
                console.error("Failed to save task metadata, not finishing edit");
                return;
            }
            // Clean up editors first
            this.cleanupEditors();
            // Reset editing state
            this.isEditing = false;
            this.originalTask = null;
            // Restore the metadata display
            targetEl.empty();
            this.restoreMetadataDisplay(targetEl, fieldType);
            // Notify parent component about metadata edit completion
            if (this.options.onMetadataEditFinished) {
                this.options.onMetadataEditFinished(targetEl, this.task, fieldType);
            }
            // Release this editor back to the manager
            this.releaseFromManager();
        });
    }
    cancelMetadataEdit(targetEl) {
        // Get field type before cleanup
        const fieldType = this.activeInput
            ? this.activeInput._fieldType
            : null;
        // Revert changes
        if (this.originalTask) {
            this.task = Object.assign(Object.assign({}, this.originalTask), { metadata: Object.assign({}, this.originalTask.metadata) });
        }
        // Clean up editors first
        this.cleanupEditors();
        // Reset editing state
        this.isEditing = false;
        this.originalTask = null;
        // Restore the original metadata display
        if (fieldType) {
            targetEl.empty();
            this.restoreMetadataDisplay(targetEl, fieldType);
        }
        // Notify parent component about metadata edit completion (even if cancelled)
        if (this.options.onMetadataEditFinished && fieldType) {
            this.options.onMetadataEditFinished(targetEl, this.task, fieldType);
        }
        // Release this editor back to the manager
        this.releaseFromManager();
    }
    restoreMetadataDisplay(targetEl, fieldType) {
        // Restore the appropriate metadata display based on field type
        switch (fieldType) {
            case "project":
                if (this.task.metadata.project) {
                    targetEl.textContent =
                        this.task.metadata.project.split("/").pop() ||
                            this.task.metadata.project;
                    targetEl.className = "task-project";
                }
                break;
            case "tags":
                if (this.task.metadata.tags &&
                    this.task.metadata.tags.length > 0) {
                    targetEl.className = "task-tags-container";
                    this.task.metadata.tags
                        .filter((tag) => !tag.startsWith("#project"))
                        .forEach((tag) => {
                        const tagEl = targetEl.createEl("span", {
                            cls: "task-tag",
                            text: tag.startsWith("#") ? tag : `#${tag}`,
                        });
                    });
                }
                break;
            case "context":
                if (this.task.metadata.context) {
                    targetEl.textContent = this.task.metadata.context;
                    targetEl.className = "task-context";
                }
                break;
            case "dueDate":
            case "startDate":
            case "scheduledDate":
            case "cancelledDate":
            case "completedDate":
                const dateValue = this.task.metadata[fieldType];
                if (dateValue) {
                    const date = new Date(dateValue);
                    targetEl.textContent = date.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    });
                    targetEl.className = `task-date task-${fieldType}`;
                }
                break;
            case "recurrence":
                if (this.task.metadata.recurrence) {
                    targetEl.textContent = this.task.metadata.recurrence;
                    targetEl.className = "task-date task-recurrence";
                }
                break;
            case "priority":
                if (this.task.metadata.priority) {
                    targetEl.textContent = "!".repeat(this.task.metadata.priority);
                    const sanitizedPriority = sanitizePriorityForClass(this.task.metadata.priority);
                    targetEl.className = sanitizedPriority
                        ? `task-priority priority-${sanitizedPriority}`
                        : "task-priority";
                }
                break;
            case "onCompletion":
                if (this.task.metadata.onCompletion) {
                    targetEl.textContent = this.task.metadata.onCompletion;
                    targetEl.className = "task-oncompletion";
                }
                break;
            case "dependsOn":
                if (this.task.metadata.dependsOn &&
                    this.task.metadata.dependsOn.length > 0) {
                    targetEl.textContent =
                        this.task.metadata.dependsOn.join(", ");
                    targetEl.className = "task-dependson";
                }
                break;
            case "id":
                if (this.task.metadata.id) {
                    targetEl.textContent = this.task.metadata.id;
                    targetEl.className = "task-id";
                }
                break;
        }
    }
    cleanupEditors() {
        // Clean up embedded editor
        if (this.embeddedEditor) {
            this.embeddedEditor.destroy();
            this.embeddedEditor = null;
        }
        // Clean up active input and suggest
        if (this.activeSuggest) {
            // Clean up suggest if it has a cleanup method
            if (typeof this.activeSuggest.close === "function") {
                this.activeSuggest.close();
            }
            this.activeSuggest = null;
        }
        this.activeInput = null;
        this.contentInput = null;
        // Clean up debounced save function
        this.debouncedSave = null;
    }
    isCurrentlyEditing() {
        return this.isEditing;
    }
    getUpdatedTask() {
        return this.task;
    }
    /**
     * Update the task and options for reusing this editor instance
     */
    updateTask(task, options) {
        this.task = task;
        this.options = options;
        this.originalTask = null; // Reset original task
        this.isEditing = false;
        this.cleanupEditors();
    }
    /**
     * Reset the editor state for pooling
     */
    reset() {
        this.isEditing = false;
        this.originalTask = null;
        this.isSaving = false;
        this.cleanupEditors();
        // Reset task to a clean state
        this.task = {};
    }
    onunload() {
        this.cleanupEditors();
        if (this.containerEl) {
            this.containerEl.remove();
        }
    }
    /**
     * Release this editor back to the manager
     */
    releaseFromManager() {
        // Reset all editing states to ensure clean state for next use
        this.isEditing = false;
        this.originalTask = null;
        this.isSaving = false;
        // This will be called by the component that owns the editor manager
        // The actual release to manager will be handled by the calling component
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSW5saW5lRWRpdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiSW5saW5lRWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBQU8sU0FBUyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBR25FLE9BQU8sRUFDTixjQUFjLEVBQ2QsY0FBYyxFQUNkLFVBQVUsR0FDVixNQUFNLHFDQUFxQyxDQUFDO0FBQzdDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRSxPQUFPLEVBQ04sOEJBQThCLEdBRTlCLE1BQU0sMENBQTBDLENBQUM7QUFDbEQsT0FBTyw0QkFBNEIsQ0FBQztBQUNwQyxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLGlCQUFpQixHQUNqQixNQUFNLDhCQUE4QixDQUFDO0FBQ3RDLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUMxQyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN2RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQWM5RSxNQUFNLE9BQU8sWUFBYSxTQUFRLFNBQVM7SUEwQjFDLFlBQ1MsR0FBUSxFQUNSLE1BQTZCLEVBQ3JDLElBQVUsRUFDVixPQUE0QjtRQUU1QixLQUFLLEVBQUUsQ0FBQztRQUxBLFFBQUcsR0FBSCxHQUFHLENBQUs7UUFDUixXQUFNLEdBQU4sTUFBTSxDQUF1QjtRQXhCOUIsY0FBUyxHQUFZLEtBQUssQ0FBQztRQUMzQixpQkFBWSxHQUFnQixJQUFJLENBQUM7UUFDakMsYUFBUSxHQUFZLEtBQUssQ0FBQztRQUVsQywyQ0FBMkM7UUFDbkMsaUJBQVksR0FBK0IsSUFBSSxDQUFDO1FBQ2hELG1CQUFjLEdBQW9DLElBQUksQ0FBQztRQUN2RCxn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QkFBc0I7UUFDaEQsSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7UUFDdkIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ3ZCLENBQUM7SUFFRDs7T0FFRztJQUNJLEtBQUs7UUFDWCxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztRQUN2QixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztRQUN6QixJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQztRQUN0QixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDdEIsOEJBQThCO1FBQzlCLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBVSxDQUFDO0lBQ3hCLENBQUM7SUFFRCxRQUFRO1FBQ1AsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRXRCLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRTtZQUNyQixJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDO1NBQzFCO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0ssa0JBQWtCO1FBQ3pCLDhEQUE4RDtRQUM5RCxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztRQUN2QixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztRQUN6QixJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQztRQUV0QixvRUFBb0U7UUFDcEUseUVBQXlFO0lBQzFFLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcCwgQ29tcG9uZW50LCBkZWJvdW5jZSwgc2V0SWNvbiwgTWVudSB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBTdGFuZGFyZFRhc2tNZXRhZGF0YSwgVGFzayB9IGZyb20gXCJAL3R5cGVzL3Rhc2tcIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5pbXBvcnQge1xyXG5cdENvbnRleHRTdWdnZXN0LFxyXG5cdFByb2plY3RTdWdnZXN0LFxyXG5cdFRhZ1N1Z2dlc3QsXHJcbn0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9pbnB1dHMvQXV0b0NvbXBsZXRlXCI7XHJcbmltcG9ydCB7IGNsZWFyQWxsTWFya3MgfSBmcm9tIFwiQC9jb21wb25lbnRzL3VpL3JlbmRlcmVycy9NYXJrZG93blJlbmRlcmVyXCI7XHJcbmltcG9ydCB7XHJcblx0Y3JlYXRlRW1iZWRkYWJsZU1hcmtkb3duRWRpdG9yLFxyXG5cdEVtYmVkZGFibGVNYXJrZG93bkVkaXRvcixcclxufSBmcm9tIFwiQC9lZGl0b3ItZXh0ZW5zaW9ucy9jb3JlL21hcmtkb3duLWVkaXRvclwiO1xyXG5pbXBvcnQgXCJAL3N0eWxlcy9pbmxpbmUtZWRpdG9yLmNzc1wiO1xyXG5pbXBvcnQge1xyXG5cdGdldEVmZmVjdGl2ZVByb2plY3QsXHJcblx0aXNQcm9qZWN0UmVhZG9ubHksXHJcbn0gZnJvbSBcIkAvdXRpbHMvdGFzay90YXNrLW9wZXJhdGlvbnNcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHsgc2FuaXRpemVQcmlvcml0eUZvckNsYXNzIH0gZnJvbSBcIkAvdXRpbHMvdGFzay9wcmlvcml0eS11dGlsc1wiO1xyXG5pbXBvcnQgeyBPbkNvbXBsZXRpb25Nb2RhbCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvb24tY29tcGxldGlvbi9PbkNvbXBsZXRpb25Nb2RhbFwiO1xyXG5pbXBvcnQgeyBsb2NhbERhdGVTdHJpbmdUb1RpbWVzdGFtcCB9IGZyb20gXCJAL3V0aWxzL2RhdGUvZGF0ZS1kaXNwbGF5LWhlbHBlclwiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJbmxpbmVFZGl0b3JPcHRpb25zIHtcclxuXHRvblRhc2tVcGRhdGU6ICh0YXNrOiBUYXNrLCB1cGRhdGVkVGFzazogVGFzaykgPT4gUHJvbWlzZTx2b2lkPjtcclxuXHRvbkNvbnRlbnRFZGl0RmluaXNoZWQ/OiAodGFyZ2V0RWw6IEhUTUxFbGVtZW50LCB0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdG9uTWV0YWRhdGFFZGl0RmluaXNoZWQ/OiAoXHJcblx0XHR0YXJnZXRFbDogSFRNTEVsZW1lbnQsXHJcblx0XHR0YXNrOiBUYXNrLFxyXG5cdFx0ZmllbGRUeXBlOiBzdHJpbmdcclxuXHQpID0+IHZvaWQ7XHJcblx0b25DYW5jZWw/OiAoKSA9PiB2b2lkO1xyXG5cdHVzZUVtYmVkZGVkRWRpdG9yPzogYm9vbGVhbjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIElubGluZUVkaXRvciBleHRlbmRzIENvbXBvbmVudCB7XHJcblx0cHJpdmF0ZSBjb250YWluZXJFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSB0YXNrOiBUYXNrO1xyXG5cdHByaXZhdGUgb3B0aW9uczogSW5saW5lRWRpdG9yT3B0aW9ucztcclxuXHRwcml2YXRlIGlzRWRpdGluZzogYm9vbGVhbiA9IGZhbHNlO1xyXG5cdHByaXZhdGUgb3JpZ2luYWxUYXNrOiBUYXNrIHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBpc1NhdmluZzogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuXHQvLyBFZGl0IGVsZW1lbnRzIC0gb25seSBjcmVhdGVkIHdoZW4gbmVlZGVkXHJcblx0cHJpdmF0ZSBjb250ZW50SW5wdXQ6IEhUTUxUZXh0QXJlYUVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIGVtYmVkZGVkRWRpdG9yOiBFbWJlZGRhYmxlTWFya2Rvd25FZGl0b3IgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIGFjdGl2ZUlucHV0OiBIVE1MSW5wdXRFbGVtZW50IHwgSFRNTFNlbGVjdEVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIGFjdGl2ZVN1Z2dlc3Q6IFByb2plY3RTdWdnZXN0IHwgVGFnU3VnZ2VzdCB8IENvbnRleHRTdWdnZXN0IHwgbnVsbCA9XHJcblx0XHRudWxsO1xyXG5cclxuXHQvLyBEZWJvdW5jZWQgc2F2ZSBmdW5jdGlvbiAtIG9ubHkgY3JlYXRlZCB3aGVuIG5lZWRlZFxyXG5cdHByaXZhdGUgZGVib3VuY2VkU2F2ZTogKCgpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XHJcblxyXG5cdC8vIFBlcmZvcm1hbmNlIG9wdGltaXphdGlvbjogcmV1c2UgZXZlbnQgaGFuZGxlcnNcclxuXHRwcml2YXRlIGJvdW5kSGFuZGxlcnMgPSB7XHJcblx0XHRzdG9wUHJvcGFnYXRpb246IChlOiBFdmVudCkgPT4gZS5zdG9wUHJvcGFnYXRpb24oKSxcclxuXHRcdGhhbmRsZUtleWRvd246IChlOiBLZXlib2FyZEV2ZW50KSA9PiB0aGlzLmhhbmRsZUtleWRvd24oZSksXHJcblx0XHRoYW5kbGVCbHVyOiAoZTogRm9jdXNFdmVudCkgPT4gdGhpcy5oYW5kbGVCbHVyKGUpLFxyXG5cdFx0aGFuZGxlSW5wdXQ6IChlOiBFdmVudCkgPT4gdGhpcy5oYW5kbGVJbnB1dChlKSxcclxuXHR9O1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHByaXZhdGUgYXBwOiBBcHAsXHJcblx0XHRwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0dGFzazogVGFzayxcclxuXHRcdG9wdGlvbnM6IElubGluZUVkaXRvck9wdGlvbnNcclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHQvLyBEb24ndCBjbG9uZSB0YXNrIHVudGlsIGVkaXRpbmcgc3RhcnRzIC0gc2F2ZXMgbWVtb3J5XHJcblx0XHR0aGlzLnRhc2sgPSB0YXNrO1xyXG5cdFx0dGhpcy5vcHRpb25zID0gb3B0aW9ucztcclxuXHR9XHJcblxyXG5cdG9ubG9hZCgpIHtcclxuXHRcdC8vIE9ubHkgY3JlYXRlIGNvbnRhaW5lciB3aGVuIGNvbXBvbmVudCBsb2Fkc1xyXG5cdFx0dGhpcy5jb250YWluZXJFbCA9IGNyZWF0ZURpdih7IGNsczogXCJpbmxpbmUtZWRpdG9yXCIgfSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBJbml0aWFsaXplIGVkaXRpbmcgc3RhdGUgLSBjYWxsZWQgb25seSB3aGVuIGVkaXRpbmcgc3RhcnRzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBpbml0aWFsaXplRWRpdGluZ1N0YXRlKCk6IHZvaWQge1xyXG5cdFx0Ly8gRm9yY2UgY2xlYW51cCBhbnkgcHJldmlvdXMgZWRpdGluZyBzdGF0ZVxyXG5cdFx0aWYgKHRoaXMuaXNFZGl0aW5nKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcIkVkaXRvciBhbHJlYWR5IGluIGVkaXRpbmcgc3RhdGUsIGZvcmNpbmcgY2xlYW51cFwiKTtcclxuXHRcdFx0dGhpcy5jbGVhbnVwRWRpdG9ycygpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlc2V0IHN0YXRlc1xyXG5cdFx0dGhpcy5pc0VkaXRpbmcgPSBmYWxzZTtcclxuXHRcdHRoaXMuaXNTYXZpbmcgPSBmYWxzZTtcclxuXHJcblx0XHQvLyBDcmVhdGUgZGVib3VuY2VkIHNhdmUgZnVuY3Rpb25cclxuXHRcdHRoaXMuZGVib3VuY2VkU2F2ZSA9IGRlYm91bmNlKGFzeW5jICgpID0+IHtcclxuXHRcdFx0YXdhaXQgdGhpcy5zYXZlVGFzaygpO1xyXG5cdFx0fSwgODAwKTtcclxuXHJcblx0XHQvLyBTdG9yZSBvcmlnaW5hbCB0YXNrIHN0YXRlIGZvciBwb3RlbnRpYWwgcmVzdG9yYXRpb24gLSBkZWVwIGNsb25lIHRvIGF2b2lkIHJlZmVyZW5jZSBpc3N1ZXNcclxuXHRcdHRoaXMub3JpZ2luYWxUYXNrID0ge1xyXG5cdFx0XHQuLi50aGlzLnRhc2ssXHJcblx0XHRcdG1ldGFkYXRhOiB7IC4uLnRoaXMudGFzay5tZXRhZGF0YSB9LFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNob3cgaW5saW5lIGVkaXRvciBmb3IgdGFzayBjb250ZW50XHJcblx0ICovXHJcblx0cHVibGljIHNob3dDb250ZW50RWRpdG9yKHRhcmdldEVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xyXG5cdFx0dGhpcy5pbml0aWFsaXplRWRpdGluZ1N0YXRlKCk7XHJcblx0XHR0aGlzLmlzRWRpdGluZyA9IHRydWU7XHJcblxyXG5cdFx0dGFyZ2V0RWwuZW1wdHkoKTtcclxuXHJcblx0XHQvLyBFeHRyYWN0IHRoZSB0ZXh0IGNvbnRlbnQgZnJvbSB0aGUgb3JpZ2luYWwgbWFya2Rvd25cclxuXHRcdGxldCBlZGl0YWJsZUNvbnRlbnQgPSBjbGVhckFsbE1hcmtzKHRoaXMudGFzay5jb250ZW50KTtcclxuXHJcblx0XHQvLyBJZiBjb250ZW50IGlzIGVtcHR5LCB0cnkgdG8gZXh0cmFjdCBmcm9tIG9yaWdpbmFsTWFya2Rvd25cclxuXHRcdGlmICghZWRpdGFibGVDb250ZW50ICYmIHRoaXMudGFzay5vcmlnaW5hbE1hcmtkb3duKSB7XHJcblx0XHRcdGNvbnN0IG1hcmtkb3duV2l0aG91dE1hcmtlciA9IHRoaXMudGFzay5vcmlnaW5hbE1hcmtkb3duLnJlcGxhY2UoXHJcblx0XHRcdFx0L15cXHMqWy0qK11cXHMqXFxbW15cXF1dKlxcXVxccyovLFxyXG5cdFx0XHRcdFwiXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0ZWRpdGFibGVDb250ZW50ID0gY2xlYXJBbGxNYXJrcyhtYXJrZG93bldpdGhvdXRNYXJrZXIpLnRyaW0oKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBJZiBzdGlsbCBlbXB0eSwgdXNlIGNsZWFyQWxsTWFya3Mgb24gdGhlIGNvbnRlbnRcclxuXHRcdGlmICghZWRpdGFibGVDb250ZW50ICYmIHRoaXMudGFzay5jb250ZW50KSB7XHJcblx0XHRcdGVkaXRhYmxlQ29udGVudCA9IGNsZWFyQWxsTWFya3ModGhpcy50YXNrLmNvbnRlbnQpLnRyaW0oKTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAodGhpcy5vcHRpb25zLnVzZUVtYmVkZGVkRWRpdG9yKSB7XHJcblx0XHRcdHRoaXMuY3JlYXRlRW1iZWRkZWRFZGl0b3IodGFyZ2V0RWwsIGVkaXRhYmxlQ29udGVudCB8fCBcIlwiKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMuY3JlYXRlVGV4dGFyZWFFZGl0b3IodGFyZ2V0RWwsIGVkaXRhYmxlQ29udGVudCB8fCBcIlwiKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY3JlYXRlRW1iZWRkZWRFZGl0b3IodGFyZ2V0RWw6IEhUTUxFbGVtZW50LCBjb250ZW50OiBzdHJpbmcpOiB2b2lkIHtcclxuXHRcdC8vIENyZWF0ZSBjb250YWluZXIgZm9yIHRoZSBlbWJlZGRlZCBlZGl0b3JcclxuXHRcdGNvbnN0IGVkaXRvckNvbnRhaW5lciA9IHRhcmdldEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJpbmxpbmUtZW1iZWRkZWQtZWRpdG9yLWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gUHJldmVudCBldmVudCBidWJibGluZ1xyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KFxyXG5cdFx0XHRlZGl0b3JDb250YWluZXIsXHJcblx0XHRcdFwiY2xpY2tcIixcclxuXHRcdFx0dGhpcy5ib3VuZEhhbmRsZXJzLnN0b3BQcm9wYWdhdGlvblxyXG5cdFx0KTtcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChcclxuXHRcdFx0ZWRpdG9yQ29udGFpbmVyLFxyXG5cdFx0XHRcIm1vdXNlZG93blwiLFxyXG5cdFx0XHR0aGlzLmJvdW5kSGFuZGxlcnMuc3RvcFByb3BhZ2F0aW9uXHJcblx0XHQpO1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdHRoaXMuZW1iZWRkZWRFZGl0b3IgPSBjcmVhdGVFbWJlZGRhYmxlTWFya2Rvd25FZGl0b3IoXHJcblx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0ZWRpdG9yQ29udGFpbmVyLFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHZhbHVlOiBjb250ZW50LFxyXG5cdFx0XHRcdFx0cGxhY2Vob2xkZXI6IFwiRW50ZXIgdGFzayBjb250ZW50Li4uXCIsXHJcblx0XHRcdFx0XHRjbHM6IFwiaW5saW5lLWVtYmVkZGVkLWVkaXRvclwiLFxyXG5cdFx0XHRcdFx0b25FbnRlcjogKGVkaXRvcjogYW55LCBtb2Q6IGFueSwgc2hpZnQ6IGFueSkgPT4ge1xyXG5cdFx0XHRcdFx0XHQvLyBTYXZlIGFuZCBleGl0IG9uIEVudGVyIChyZWdhcmRsZXNzIG9mIHNoaWZ0KVxyXG5cdFx0XHRcdFx0XHR0aGlzLmZpbmlzaENvbnRlbnRFZGl0KHRhcmdldEVsKS5jYXRjaChjb25zb2xlLmVycm9yKTtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0b25Fc2NhcGU6IChlZGl0b3I6IGFueSkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLmNhbmNlbENvbnRlbnRFZGl0KHRhcmdldEVsKTtcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRvbkJsdXI6ICgpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5maW5pc2hDb250ZW50RWRpdCh0YXJnZXRFbCkuY2F0Y2goY29uc29sZS5lcnJvcik7XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0b25DaGFuZ2U6ICgpID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8gVXBkYXRlIHRhc2sgY29udGVudCBpbW1lZGlhdGVseSBidXQgZG9uJ3Qgc2F2ZVxyXG5cdFx0XHRcdFx0XHR0aGlzLnRhc2suY29udGVudCA9IHRoaXMuZW1iZWRkZWRFZGl0b3I/LnZhbHVlIHx8IFwiXCI7XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH1cclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIEZvY3VzIHRoZSBlZGl0b3Igd2l0aCBiZXR0ZXIgdGltaW5nXHJcblx0XHRcdHRoaXMuZm9jdXNFZGl0b3IoKTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXHJcblx0XHRcdFx0XCJGYWlsZWQgdG8gY3JlYXRlIGVtYmVkZGVkIGVkaXRvciwgZmFsbGluZyBiYWNrIHRvIHRleHRhcmVhOlwiLFxyXG5cdFx0XHRcdGVycm9yXHJcblx0XHRcdCk7XHJcblx0XHRcdC8vIEZhbGxiYWNrIHRvIHRleHRhcmVhIGlmIGVtYmVkZGVkIGVkaXRvciBmYWlsc1xyXG5cdFx0XHRlZGl0b3JDb250YWluZXIucmVtb3ZlKCk7XHJcblx0XHRcdHRoaXMuY3JlYXRlVGV4dGFyZWFFZGl0b3IodGFyZ2V0RWwsIGNvbnRlbnQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVUZXh0YXJlYUVkaXRvcih0YXJnZXRFbDogSFRNTEVsZW1lbnQsIGNvbnRlbnQ6IHN0cmluZyk6IHZvaWQge1xyXG5cdFx0Ly8gQ3JlYXRlIGNvbnRlbnQgZWRpdG9yXHJcblx0XHR0aGlzLmNvbnRlbnRJbnB1dCA9IHRhcmdldEVsLmNyZWF0ZUVsKFwidGV4dGFyZWFcIiwge1xyXG5cdFx0XHRjbHM6IFwiaW5saW5lLWNvbnRlbnQtZWRpdG9yXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBQcmV2ZW50IGV2ZW50IGJ1YmJsaW5nXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoXHJcblx0XHRcdHRoaXMuY29udGVudElucHV0LFxyXG5cdFx0XHRcImNsaWNrXCIsXHJcblx0XHRcdHRoaXMuYm91bmRIYW5kbGVycy5zdG9wUHJvcGFnYXRpb25cclxuXHRcdCk7XHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoXHJcblx0XHRcdHRoaXMuY29udGVudElucHV0LFxyXG5cdFx0XHRcIm1vdXNlZG93blwiLFxyXG5cdFx0XHR0aGlzLmJvdW5kSGFuZGxlcnMuc3RvcFByb3BhZ2F0aW9uXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIFNldCB0aGUgdmFsdWUgYWZ0ZXIgY3JlYXRpb25cclxuXHRcdHRoaXMuY29udGVudElucHV0LnZhbHVlID0gY29udGVudDtcclxuXHJcblx0XHQvLyBBdXRvLXJlc2l6ZSB0ZXh0YXJlYVxyXG5cdFx0dGhpcy5hdXRvUmVzaXplVGV4dGFyZWEodGhpcy5jb250ZW50SW5wdXQpO1xyXG5cclxuXHRcdC8vIEZvY3VzIGFuZCBzZWxlY3QgYWxsIHRleHRcclxuXHRcdHRoaXMuY29udGVudElucHV0LmZvY3VzKCk7XHJcblx0XHR0aGlzLmNvbnRlbnRJbnB1dC5zZWxlY3QoKTtcclxuXHJcblx0XHQvLyBSZWdpc3RlciBldmVudHMgd2l0aCBvcHRpbWl6ZWQgaGFuZGxlcnNcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChcclxuXHRcdFx0dGhpcy5jb250ZW50SW5wdXQsXHJcblx0XHRcdFwiaW5wdXRcIixcclxuXHRcdFx0dGhpcy5ib3VuZEhhbmRsZXJzLmhhbmRsZUlucHV0XHJcblx0XHQpO1xyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KFxyXG5cdFx0XHR0aGlzLmNvbnRlbnRJbnB1dCxcclxuXHRcdFx0XCJibHVyXCIsXHJcblx0XHRcdHRoaXMuYm91bmRIYW5kbGVycy5oYW5kbGVCbHVyXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KFxyXG5cdFx0XHR0aGlzLmNvbnRlbnRJbnB1dCxcclxuXHRcdFx0XCJrZXlkb3duXCIsXHJcblx0XHRcdHRoaXMuYm91bmRIYW5kbGVycy5oYW5kbGVLZXlkb3duXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2hvdyBpbmxpbmUgZWRpdG9yIGZvciBtZXRhZGF0YSBmaWVsZFxyXG5cdCAqL1xyXG5cdHB1YmxpYyBzaG93TWV0YWRhdGFFZGl0b3IoXHJcblx0XHR0YXJnZXRFbDogSFRNTEVsZW1lbnQsXHJcblx0XHRmaWVsZFR5cGU6XHJcblx0XHRcdHwgXCJwcm9qZWN0XCJcclxuXHRcdFx0fCBcInRhZ3NcIlxyXG5cdFx0XHR8IFwiY29udGV4dFwiXHJcblx0XHRcdHwgXCJkdWVEYXRlXCJcclxuXHRcdFx0fCBcInN0YXJ0RGF0ZVwiXHJcblx0XHRcdHwgXCJzY2hlZHVsZWREYXRlXCJcclxuXHRcdFx0fCBcImNhbmNlbGxlZERhdGVcIlxyXG5cdFx0XHR8IFwiY29tcGxldGVkRGF0ZVwiXHJcblx0XHRcdHwgXCJwcmlvcml0eVwiXHJcblx0XHRcdHwgXCJyZWN1cnJlbmNlXCJcclxuXHRcdFx0fCBcIm9uQ29tcGxldGlvblwiXHJcblx0XHRcdHwgXCJkZXBlbmRzT25cIlxyXG5cdFx0XHR8IFwiaWRcIixcclxuXHRcdGN1cnJlbnRWYWx1ZT86IHN0cmluZ1xyXG5cdCk6IHZvaWQge1xyXG5cdFx0dGhpcy5pbml0aWFsaXplRWRpdGluZ1N0YXRlKCk7XHJcblx0XHR0aGlzLmlzRWRpdGluZyA9IHRydWU7XHJcblxyXG5cdFx0dGFyZ2V0RWwuZW1wdHkoKTtcclxuXHJcblx0XHRjb25zdCBlZGl0b3JDb250YWluZXIgPSB0YXJnZXRFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiaW5saW5lLW1ldGFkYXRhLWVkaXRvclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gUHJldmVudCBldmVudCBidWJibGluZyBhdCBjb250YWluZXIgbGV2ZWxcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChcclxuXHRcdFx0ZWRpdG9yQ29udGFpbmVyLFxyXG5cdFx0XHRcImNsaWNrXCIsXHJcblx0XHRcdHRoaXMuYm91bmRIYW5kbGVycy5zdG9wUHJvcGFnYXRpb25cclxuXHRcdCk7XHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoXHJcblx0XHRcdGVkaXRvckNvbnRhaW5lcixcclxuXHRcdFx0XCJtb3VzZWRvd25cIixcclxuXHRcdFx0dGhpcy5ib3VuZEhhbmRsZXJzLnN0b3BQcm9wYWdhdGlvblxyXG5cdFx0KTtcclxuXHJcblx0XHRzd2l0Y2ggKGZpZWxkVHlwZSkge1xyXG5cdFx0XHRjYXNlIFwicHJvamVjdFwiOlxyXG5cdFx0XHRcdHRoaXMuY3JlYXRlUHJvamVjdEVkaXRvcihlZGl0b3JDb250YWluZXIsIGN1cnJlbnRWYWx1ZSk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgXCJ0YWdzXCI6XHJcblx0XHRcdFx0dGhpcy5jcmVhdGVUYWdzRWRpdG9yKGVkaXRvckNvbnRhaW5lciwgY3VycmVudFZhbHVlKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBcImNvbnRleHRcIjpcclxuXHRcdFx0XHR0aGlzLmNyZWF0ZUNvbnRleHRFZGl0b3IoZWRpdG9yQ29udGFpbmVyLCBjdXJyZW50VmFsdWUpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwiZHVlRGF0ZVwiOlxyXG5cdFx0XHRjYXNlIFwic3RhcnREYXRlXCI6XHJcblx0XHRcdGNhc2UgXCJzY2hlZHVsZWREYXRlXCI6XHJcblx0XHRcdGNhc2UgXCJjYW5jZWxsZWREYXRlXCI6XHJcblx0XHRcdGNhc2UgXCJjb21wbGV0ZWREYXRlXCI6XHJcblx0XHRcdFx0dGhpcy5jcmVhdGVEYXRlRWRpdG9yKGVkaXRvckNvbnRhaW5lciwgZmllbGRUeXBlLCBjdXJyZW50VmFsdWUpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwicHJpb3JpdHlcIjpcclxuXHRcdFx0XHR0aGlzLmNyZWF0ZVByaW9yaXR5RWRpdG9yKGVkaXRvckNvbnRhaW5lciwgY3VycmVudFZhbHVlKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBcInJlY3VycmVuY2VcIjpcclxuXHRcdFx0XHR0aGlzLmNyZWF0ZVJlY3VycmVuY2VFZGl0b3IoZWRpdG9yQ29udGFpbmVyLCBjdXJyZW50VmFsdWUpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwib25Db21wbGV0aW9uXCI6XHJcblx0XHRcdFx0dGhpcy5jcmVhdGVPbkNvbXBsZXRpb25FZGl0b3IoZWRpdG9yQ29udGFpbmVyLCBjdXJyZW50VmFsdWUpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwiZGVwZW5kc09uXCI6XHJcblx0XHRcdFx0dGhpcy5jcmVhdGVEZXBlbmRzT25FZGl0b3IoZWRpdG9yQ29udGFpbmVyLCBjdXJyZW50VmFsdWUpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwiaWRcIjpcclxuXHRcdFx0XHR0aGlzLmNyZWF0ZUlkRWRpdG9yKGVkaXRvckNvbnRhaW5lciwgY3VycmVudFZhbHVlKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNob3cgYWRkIG1ldGFkYXRhIGJ1dHRvblxyXG5cdCAqL1xyXG5cdHB1YmxpYyBzaG93QWRkTWV0YWRhdGFCdXR0b24odGFyZ2V0RWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHRjb25zdCBhZGRCdG4gPSB0YXJnZXRFbC5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdGNsczogXCJhZGQtbWV0YWRhdGEtYnRuXCIsXHJcblx0XHRcdGF0dHI6IHsgXCJhcmlhLWxhYmVsXCI6IFwiQWRkIG1ldGFkYXRhXCIgfSxcclxuXHRcdH0pO1xyXG5cdFx0c2V0SWNvbihhZGRCdG4sIFwicGx1c1wiKTtcclxuXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoYWRkQnRuLCBcImNsaWNrXCIsIChlKSA9PiB7XHJcblx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblx0XHRcdHRoaXMuc2hvd01ldGFkYXRhTWVudShhZGRCdG4pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNyZWF0ZVByb2plY3RFZGl0b3IoXHJcblx0XHRjb250YWluZXI6IEhUTUxFbGVtZW50LFxyXG5cdFx0Y3VycmVudFZhbHVlPzogc3RyaW5nXHJcblx0KTogdm9pZCB7XHJcblx0XHQvLyBHZXQgZWZmZWN0aXZlIHByb2plY3QgYW5kIHJlYWRvbmx5IHN0YXR1c1xyXG5cdFx0Y29uc3QgZWZmZWN0aXZlUHJvamVjdCA9IGdldEVmZmVjdGl2ZVByb2plY3QodGhpcy50YXNrKTtcclxuXHRcdGNvbnN0IGlzUmVhZG9ubHkgPSBpc1Byb2plY3RSZWFkb25seSh0aGlzLnRhc2spO1xyXG5cclxuXHRcdGNvbnN0IGlucHV0ID0gY29udGFpbmVyLmNyZWF0ZUVsKFwiaW5wdXRcIiwge1xyXG5cdFx0XHR0eXBlOiBcInRleHRcIixcclxuXHRcdFx0Y2xzOiBcImlubGluZS1wcm9qZWN0LWlucHV0XCIsXHJcblx0XHRcdHZhbHVlOiBlZmZlY3RpdmVQcm9qZWN0IHx8IFwiXCIsXHJcblx0XHRcdHBsYWNlaG9sZGVyOiBcIkVudGVyIHByb2plY3QgbmFtZVwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQWRkIHZpc3VhbCBpbmRpY2F0b3IgZm9yIHRnUHJvamVjdCAtIG9ubHkgc2hvdyBpZiBubyB1c2VyLXNldCBwcm9qZWN0IGV4aXN0c1xyXG5cdFx0aWYgKFxyXG5cdFx0XHR0aGlzLnRhc2subWV0YWRhdGEudGdQcm9qZWN0ICYmXHJcblx0XHRcdCghdGhpcy50YXNrLm1ldGFkYXRhLnByb2plY3QgfHwgIXRoaXMudGFzay5tZXRhZGF0YS5wcm9qZWN0LnRyaW0oKSlcclxuXHRcdCkge1xyXG5cdFx0XHRjb25zdCB0Z1Byb2plY3QgPSB0aGlzLnRhc2subWV0YWRhdGEudGdQcm9qZWN0O1xyXG5cdFx0XHRjb25zdCBpbmRpY2F0b3IgPSBjb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwicHJvamVjdC1zb3VyY2UtaW5kaWNhdG9yIGlubGluZS1pbmRpY2F0b3JcIixcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBDcmVhdGUgaW5kaWNhdG9yIHRleHQgYmFzZWQgb24gdGdQcm9qZWN0IHR5cGVcclxuXHRcdFx0bGV0IGluZGljYXRvclRleHQgPSBcIlwiO1xyXG5cdFx0XHRsZXQgaW5kaWNhdG9ySWNvbiA9IFwiXCI7XHJcblxyXG5cdFx0XHRzd2l0Y2ggKHRnUHJvamVjdC50eXBlKSB7XHJcblx0XHRcdFx0Y2FzZSBcInBhdGhcIjpcclxuXHRcdFx0XHRcdGluZGljYXRvclRleHQgPSB0KFwiQXV0byBmcm9tIHBhdGhcIik7XHJcblx0XHRcdFx0XHRpbmRpY2F0b3JJY29uID0gXCLwn5OBXCI7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIFwibWV0YWRhdGFcIjpcclxuXHRcdFx0XHRcdGluZGljYXRvclRleHQgPSB0KFwiQXV0byBmcm9tIG1ldGFkYXRhXCIpO1xyXG5cdFx0XHRcdFx0aW5kaWNhdG9ySWNvbiA9IFwi8J+ThFwiO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBcImNvbmZpZ1wiOlxyXG5cdFx0XHRcdFx0aW5kaWNhdG9yVGV4dCA9IHQoXCJBdXRvIGZyb20gY29uZmlnXCIpO1xyXG5cdFx0XHRcdFx0aW5kaWNhdG9ySWNvbiA9IFwi4pqZ77iPXCI7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdFx0aW5kaWNhdG9yVGV4dCA9IHQoXCJBdXRvLWFzc2lnbmVkXCIpO1xyXG5cdFx0XHRcdFx0aW5kaWNhdG9ySWNvbiA9IFwi8J+Ul1wiO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpbmRpY2F0b3IuY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdFx0XHRjbHM6IFwiaW5kaWNhdG9yLWljb25cIixcclxuXHRcdFx0XHR0ZXh0OiBpbmRpY2F0b3JJY29uLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0aW5kaWNhdG9yLmNyZWF0ZUVsKFwic3BhblwiLCB7XHJcblx0XHRcdFx0Y2xzOiBcImluZGljYXRvci10ZXh0XCIsXHJcblx0XHRcdFx0dGV4dDogaW5kaWNhdG9yVGV4dCxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRpZiAoaXNSZWFkb25seSkge1xyXG5cdFx0XHRcdGluZGljYXRvci5hZGRDbGFzcyhcInJlYWRvbmx5LWluZGljYXRvclwiKTtcclxuXHRcdFx0XHRpbnB1dC5kaXNhYmxlZCA9IHRydWU7XHJcblx0XHRcdFx0aW5wdXQudGl0bGUgPSB0KFxyXG5cdFx0XHRcdFx0XCJUaGlzIHByb2plY3QgaXMgYXV0b21hdGljYWxseSBhc3NpZ25lZCBhbmQgY2Fubm90IGJlIGNoYW5nZWRcIlxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0aW5kaWNhdG9yLmFkZENsYXNzKFwib3ZlcnJpZGUtaW5kaWNhdG9yXCIpO1xyXG5cdFx0XHRcdGlucHV0LnRpdGxlID0gdChcIllvdSBjYW4gb3ZlcnJpZGUgdGhlIGF1dG8tYXNzaWduZWQgcHJvamVjdFwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuYWN0aXZlSW5wdXQgPSBpbnB1dDtcclxuXHJcblx0XHQvLyBQcmV2ZW50IGV2ZW50IGJ1YmJsaW5nIG9uIGlucHV0IGVsZW1lbnRcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChcclxuXHRcdFx0aW5wdXQsXHJcblx0XHRcdFwiY2xpY2tcIixcclxuXHRcdFx0dGhpcy5ib3VuZEhhbmRsZXJzLnN0b3BQcm9wYWdhdGlvblxyXG5cdFx0KTtcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChcclxuXHRcdFx0aW5wdXQsXHJcblx0XHRcdFwibW91c2Vkb3duXCIsXHJcblx0XHRcdHRoaXMuYm91bmRIYW5kbGVycy5zdG9wUHJvcGFnYXRpb25cclxuXHRcdCk7XHJcblxyXG5cdFx0Y29uc3QgdXBkYXRlUHJvamVjdCA9ICh2YWx1ZTogc3RyaW5nKSA9PiB7XHJcblx0XHRcdC8vIE9ubHkgdXBkYXRlIHByb2plY3QgaWYgaXQncyBub3QgYSByZWFkLW9ubHkgdGdQcm9qZWN0XHJcblx0XHRcdGlmICghaXNSZWFkb25seSkge1xyXG5cdFx0XHRcdHRoaXMudGFzay5tZXRhZGF0YS5wcm9qZWN0ID0gdmFsdWUgfHwgdW5kZWZpbmVkO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuc2V0dXBJbnB1dEV2ZW50cyhpbnB1dCwgdXBkYXRlUHJvamVjdCwgXCJwcm9qZWN0XCIpO1xyXG5cclxuXHRcdC8vIEFkZCBhdXRvY29tcGxldGUgb25seSBpZiBub3QgcmVhZG9ubHlcclxuXHRcdGlmICghaXNSZWFkb25seSkge1xyXG5cdFx0XHR0aGlzLmFjdGl2ZVN1Z2dlc3QgPSBuZXcgUHJvamVjdFN1Z2dlc3QoXHJcblx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0aW5wdXQsXHJcblx0XHRcdFx0dGhpcy5wbHVnaW5cclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBGb2N1cyBhbmQgc2VsZWN0XHJcblx0XHRpbnB1dC5mb2N1cygpO1xyXG5cdFx0aW5wdXQuc2VsZWN0KCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNyZWF0ZVRhZ3NFZGl0b3IoXHJcblx0XHRjb250YWluZXI6IEhUTUxFbGVtZW50LFxyXG5cdFx0Y3VycmVudFZhbHVlPzogc3RyaW5nXHJcblx0KTogdm9pZCB7XHJcblx0XHRjb25zdCBpbnB1dCA9IGNvbnRhaW5lci5jcmVhdGVFbChcImlucHV0XCIsIHtcclxuXHRcdFx0dHlwZTogXCJ0ZXh0XCIsXHJcblx0XHRcdGNsczogXCJpbmxpbmUtdGFncy1pbnB1dFwiLFxyXG5cdFx0XHR2YWx1ZTogY3VycmVudFZhbHVlIHx8IFwiXCIsXHJcblx0XHRcdHBsYWNlaG9sZGVyOiBcIkVudGVyIHRhZ3MgKGNvbW1hIHNlcGFyYXRlZClcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuYWN0aXZlSW5wdXQgPSBpbnB1dDtcclxuXHJcblx0XHQvLyBQcmV2ZW50IGV2ZW50IGJ1YmJsaW5nIG9uIGlucHV0IGVsZW1lbnRcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChcclxuXHRcdFx0aW5wdXQsXHJcblx0XHRcdFwiY2xpY2tcIixcclxuXHRcdFx0dGhpcy5ib3VuZEhhbmRsZXJzLnN0b3BQcm9wYWdhdGlvblxyXG5cdFx0KTtcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChcclxuXHRcdFx0aW5wdXQsXHJcblx0XHRcdFwibW91c2Vkb3duXCIsXHJcblx0XHRcdHRoaXMuYm91bmRIYW5kbGVycy5zdG9wUHJvcGFnYXRpb25cclxuXHRcdCk7XHJcblxyXG5cdFx0Y29uc3QgdXBkYXRlVGFncyA9ICh2YWx1ZTogc3RyaW5nKSA9PiB7XHJcblx0XHRcdHRoaXMudGFzay5tZXRhZGF0YS50YWdzID0gdmFsdWVcclxuXHRcdFx0XHQ/IHZhbHVlXHJcblx0XHRcdFx0XHRcdC5zcGxpdChcIixcIilcclxuXHRcdFx0XHRcdFx0Lm1hcCgodGFnKSA9PiB0YWcudHJpbSgpKVxyXG5cdFx0XHRcdFx0XHQuZmlsdGVyKCh0YWcpID0+IHRhZylcclxuXHRcdFx0XHQ6IFtdO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLnNldHVwSW5wdXRFdmVudHMoaW5wdXQsIHVwZGF0ZVRhZ3MsIFwidGFnc1wiKTtcclxuXHJcblx0XHQvLyBBZGQgYXV0b2NvbXBsZXRlXHJcblx0XHR0aGlzLmFjdGl2ZVN1Z2dlc3QgPSBuZXcgVGFnU3VnZ2VzdCh0aGlzLmFwcCwgaW5wdXQsIHRoaXMucGx1Z2luKTtcclxuXHJcblx0XHQvLyBGb2N1cyBhbmQgc2VsZWN0XHJcblx0XHRpbnB1dC5mb2N1cygpO1xyXG5cdFx0aW5wdXQuc2VsZWN0KCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNyZWF0ZUNvbnRleHRFZGl0b3IoXHJcblx0XHRjb250YWluZXI6IEhUTUxFbGVtZW50LFxyXG5cdFx0Y3VycmVudFZhbHVlPzogc3RyaW5nXHJcblx0KTogdm9pZCB7XHJcblx0XHRjb25zdCBpbnB1dCA9IGNvbnRhaW5lci5jcmVhdGVFbChcImlucHV0XCIsIHtcclxuXHRcdFx0dHlwZTogXCJ0ZXh0XCIsXHJcblx0XHRcdGNsczogXCJpbmxpbmUtY29udGV4dC1pbnB1dFwiLFxyXG5cdFx0XHR2YWx1ZTogY3VycmVudFZhbHVlIHx8IFwiXCIsXHJcblx0XHRcdHBsYWNlaG9sZGVyOiBcIkVudGVyIGNvbnRleHRcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuYWN0aXZlSW5wdXQgPSBpbnB1dDtcclxuXHJcblx0XHQvLyBQcmV2ZW50IGV2ZW50IGJ1YmJsaW5nIG9uIGlucHV0IGVsZW1lbnRcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChcclxuXHRcdFx0aW5wdXQsXHJcblx0XHRcdFwiY2xpY2tcIixcclxuXHRcdFx0dGhpcy5ib3VuZEhhbmRsZXJzLnN0b3BQcm9wYWdhdGlvblxyXG5cdFx0KTtcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChcclxuXHRcdFx0aW5wdXQsXHJcblx0XHRcdFwibW91c2Vkb3duXCIsXHJcblx0XHRcdHRoaXMuYm91bmRIYW5kbGVycy5zdG9wUHJvcGFnYXRpb25cclxuXHRcdCk7XHJcblxyXG5cdFx0Y29uc3QgdXBkYXRlQ29udGV4dCA9ICh2YWx1ZTogc3RyaW5nKSA9PiB7XHJcblx0XHRcdHRoaXMudGFzay5tZXRhZGF0YS5jb250ZXh0ID0gdmFsdWUgfHwgdW5kZWZpbmVkO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLnNldHVwSW5wdXRFdmVudHMoaW5wdXQsIHVwZGF0ZUNvbnRleHQsIFwiY29udGV4dFwiKTtcclxuXHJcblx0XHQvLyBBZGQgYXV0b2NvbXBsZXRlXHJcblx0XHR0aGlzLmFjdGl2ZVN1Z2dlc3QgPSBuZXcgQ29udGV4dFN1Z2dlc3QodGhpcy5hcHAsIGlucHV0LCB0aGlzLnBsdWdpbik7XHJcblxyXG5cdFx0Ly8gRm9jdXMgYW5kIHNlbGVjdFxyXG5cdFx0aW5wdXQuZm9jdXMoKTtcclxuXHRcdGlucHV0LnNlbGVjdCgpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVEYXRlRWRpdG9yKFxyXG5cdFx0Y29udGFpbmVyOiBIVE1MRWxlbWVudCxcclxuXHRcdGZpZWxkVHlwZTpcclxuXHRcdFx0fCBcImR1ZURhdGVcIlxyXG5cdFx0XHR8IFwic3RhcnREYXRlXCJcclxuXHRcdFx0fCBcInNjaGVkdWxlZERhdGVcIlxyXG5cdFx0XHR8IFwiY2FuY2VsbGVkRGF0ZVwiXHJcblx0XHRcdHwgXCJjb21wbGV0ZWREYXRlXCIsXHJcblx0XHRjdXJyZW50VmFsdWU/OiBzdHJpbmdcclxuXHQpOiB2b2lkIHtcclxuXHRcdGNvbnN0IGlucHV0ID0gY29udGFpbmVyLmNyZWF0ZUVsKFwiaW5wdXRcIiwge1xyXG5cdFx0XHR0eXBlOiBcImRhdGVcIixcclxuXHRcdFx0Y2xzOiBcImlubGluZS1kYXRlLWlucHV0XCIsXHJcblx0XHRcdHZhbHVlOiBjdXJyZW50VmFsdWUgfHwgXCJcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuYWN0aXZlSW5wdXQgPSBpbnB1dDtcclxuXHJcblx0XHQvLyBQcmV2ZW50IGV2ZW50IGJ1YmJsaW5nIG9uIGlucHV0IGVsZW1lbnRcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChcclxuXHRcdFx0aW5wdXQsXHJcblx0XHRcdFwiY2xpY2tcIixcclxuXHRcdFx0dGhpcy5ib3VuZEhhbmRsZXJzLnN0b3BQcm9wYWdhdGlvblxyXG5cdFx0KTtcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChcclxuXHRcdFx0aW5wdXQsXHJcblx0XHRcdFwibW91c2Vkb3duXCIsXHJcblx0XHRcdHRoaXMuYm91bmRIYW5kbGVycy5zdG9wUHJvcGFnYXRpb25cclxuXHRcdCk7XHJcblxyXG5cdFx0Y29uc3QgdXBkYXRlRGF0ZSA9ICh2YWx1ZTogc3RyaW5nKSA9PiB7XHJcblx0XHRcdGlmICh2YWx1ZSkge1xyXG5cdFx0XHRcdC8vIFN0b3JlIGRhdGVzIGNvbnNpc3RlbnRseSBhdCBVVEMgbm9vblxyXG5cdFx0XHRcdGNvbnN0IHRzID0gbG9jYWxEYXRlU3RyaW5nVG9UaW1lc3RhbXAodmFsdWUpO1xyXG5cdFx0XHRcdHRoaXMudGFzay5tZXRhZGF0YVtmaWVsZFR5cGVdID0gdHM7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGhpcy50YXNrLm1ldGFkYXRhW2ZpZWxkVHlwZV0gPSB1bmRlZmluZWQ7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5zZXR1cElucHV0RXZlbnRzKGlucHV0LCB1cGRhdGVEYXRlLCBmaWVsZFR5cGUpO1xyXG5cclxuXHRcdC8vIEZvY3VzXHJcblx0XHRpbnB1dC5mb2N1cygpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVQcmlvcml0eUVkaXRvcihcclxuXHRcdGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXHJcblx0XHRjdXJyZW50VmFsdWU/OiBzdHJpbmdcclxuXHQpOiB2b2lkIHtcclxuXHRcdGNvbnN0IHNlbGVjdCA9IGNvbnRhaW5lci5jcmVhdGVFbChcInNlbGVjdFwiLCB7XHJcblx0XHRcdGNsczogXCJpbmxpbmUtcHJpb3JpdHktc2VsZWN0XCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBQcmV2ZW50IGV2ZW50IGJ1YmJsaW5nIG9uIHNlbGVjdCBlbGVtZW50XHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoXHJcblx0XHRcdHNlbGVjdCxcclxuXHRcdFx0XCJjbGlja1wiLFxyXG5cdFx0XHR0aGlzLmJvdW5kSGFuZGxlcnMuc3RvcFByb3BhZ2F0aW9uXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KFxyXG5cdFx0XHRzZWxlY3QsXHJcblx0XHRcdFwibW91c2Vkb3duXCIsXHJcblx0XHRcdHRoaXMuYm91bmRIYW5kbGVycy5zdG9wUHJvcGFnYXRpb25cclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gQWRkIHByaW9yaXR5IG9wdGlvbnNcclxuXHRcdGNvbnN0IG9wdGlvbnMgPSBbXHJcblx0XHRcdHsgdmFsdWU6IFwiXCIsIHRleHQ6IFwiTm9uZVwiIH0sXHJcblx0XHRcdHsgdmFsdWU6IFwiMVwiLCB0ZXh0OiBcIuKPrO+4jyBMb3dlc3RcIiB9LFxyXG5cdFx0XHR7IHZhbHVlOiBcIjJcIiwgdGV4dDogXCLwn5S9IExvd1wiIH0sXHJcblx0XHRcdHsgdmFsdWU6IFwiM1wiLCB0ZXh0OiBcIvCflLwgTWVkaXVtXCIgfSxcclxuXHRcdFx0eyB2YWx1ZTogXCI0XCIsIHRleHQ6IFwi4o+rIEhpZ2hcIiB9LFxyXG5cdFx0XHR7IHZhbHVlOiBcIjVcIiwgdGV4dDogXCLwn5S6IEhpZ2hlc3RcIiB9LFxyXG5cdFx0XTtcclxuXHJcblx0XHRvcHRpb25zLmZvckVhY2goKG9wdGlvbikgPT4ge1xyXG5cdFx0XHRjb25zdCBvcHRpb25FbCA9IHNlbGVjdC5jcmVhdGVFbChcIm9wdGlvblwiLCB7XHJcblx0XHRcdFx0dmFsdWU6IG9wdGlvbi52YWx1ZSxcclxuXHRcdFx0XHR0ZXh0OiBvcHRpb24udGV4dCxcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRzZWxlY3QudmFsdWUgPSBjdXJyZW50VmFsdWUgfHwgXCJcIjtcclxuXHRcdHRoaXMuYWN0aXZlSW5wdXQgPSBzZWxlY3Q7XHJcblxyXG5cdFx0Y29uc3QgdXBkYXRlUHJpb3JpdHkgPSAodmFsdWU6IHN0cmluZykgPT4ge1xyXG5cdFx0XHR0aGlzLnRhc2subWV0YWRhdGEucHJpb3JpdHkgPSB2YWx1ZSA/IHBhcnNlSW50KHZhbHVlKSA6IHVuZGVmaW5lZDtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5zZXR1cElucHV0RXZlbnRzKHNlbGVjdCwgdXBkYXRlUHJpb3JpdHksIFwicHJpb3JpdHlcIik7XHJcblxyXG5cdFx0Ly8gRm9jdXNcclxuXHRcdHNlbGVjdC5mb2N1cygpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVSZWN1cnJlbmNlRWRpdG9yKFxyXG5cdFx0Y29udGFpbmVyOiBIVE1MRWxlbWVudCxcclxuXHRcdGN1cnJlbnRWYWx1ZT86IHN0cmluZ1xyXG5cdCk6IHZvaWQge1xyXG5cdFx0Y29uc3QgaW5wdXQgPSBjb250YWluZXIuY3JlYXRlRWwoXCJpbnB1dFwiLCB7XHJcblx0XHRcdHR5cGU6IFwidGV4dFwiLFxyXG5cdFx0XHRjbHM6IFwiaW5saW5lLXJlY3VycmVuY2UtaW5wdXRcIixcclxuXHRcdFx0dmFsdWU6IGN1cnJlbnRWYWx1ZSB8fCBcIlwiLFxyXG5cdFx0XHRwbGFjZWhvbGRlcjogXCJlLmcuIGV2ZXJ5IGRheSwgZXZlcnkgMiB3ZWVrc1wiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5hY3RpdmVJbnB1dCA9IGlucHV0O1xyXG5cclxuXHRcdC8vIFByZXZlbnQgZXZlbnQgYnViYmxpbmcgb24gaW5wdXQgZWxlbWVudFxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KFxyXG5cdFx0XHRpbnB1dCxcclxuXHRcdFx0XCJjbGlja1wiLFxyXG5cdFx0XHR0aGlzLmJvdW5kSGFuZGxlcnMuc3RvcFByb3BhZ2F0aW9uXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KFxyXG5cdFx0XHRpbnB1dCxcclxuXHRcdFx0XCJtb3VzZWRvd25cIixcclxuXHRcdFx0dGhpcy5ib3VuZEhhbmRsZXJzLnN0b3BQcm9wYWdhdGlvblxyXG5cdFx0KTtcclxuXHJcblx0XHRjb25zdCB1cGRhdGVSZWN1cnJlbmNlID0gKHZhbHVlOiBzdHJpbmcpID0+IHtcclxuXHRcdFx0dGhpcy50YXNrLm1ldGFkYXRhLnJlY3VycmVuY2UgPSB2YWx1ZSB8fCB1bmRlZmluZWQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuc2V0dXBJbnB1dEV2ZW50cyhpbnB1dCwgdXBkYXRlUmVjdXJyZW5jZSwgXCJyZWN1cnJlbmNlXCIpO1xyXG5cclxuXHRcdC8vIEZvY3VzIGFuZCBzZWxlY3RcclxuXHRcdGlucHV0LmZvY3VzKCk7XHJcblx0XHRpbnB1dC5zZWxlY3QoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY3JlYXRlT25Db21wbGV0aW9uRWRpdG9yKFxyXG5cdFx0Y29udGFpbmVyOiBIVE1MRWxlbWVudCxcclxuXHRcdGN1cnJlbnRWYWx1ZT86IHN0cmluZ1xyXG5cdCk6IHZvaWQge1xyXG5cdFx0Y29uc3QgYnV0dG9uQ29udGFpbmVyID0gY29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJpbmxpbmUtb25jb21wbGV0aW9uLWJ1dHRvbi1jb250YWluZXJcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFByZXZlbnQgZXZlbnQgYnViYmxpbmcgb24gY29udGFpbmVyXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoXHJcblx0XHRcdGJ1dHRvbkNvbnRhaW5lcixcclxuXHRcdFx0XCJjbGlja1wiLFxyXG5cdFx0XHR0aGlzLmJvdW5kSGFuZGxlcnMuc3RvcFByb3BhZ2F0aW9uXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KFxyXG5cdFx0XHRidXR0b25Db250YWluZXIsXHJcblx0XHRcdFwibW91c2Vkb3duXCIsXHJcblx0XHRcdHRoaXMuYm91bmRIYW5kbGVycy5zdG9wUHJvcGFnYXRpb25cclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGEgc2ltcGxlIGJ1dHRvbiB0byBzaG93IGN1cnJlbnQgdmFsdWUgYW5kIG9wZW4gbW9kYWxcclxuXHRcdGNvbnN0IGNvbmZpZ0J1dHRvbiA9IGJ1dHRvbkNvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdGNsczogXCJpbmxpbmUtb25jb21wbGV0aW9uLWNvbmZpZy1idXR0b25cIixcclxuXHRcdFx0dGV4dDpcclxuXHRcdFx0XHRjdXJyZW50VmFsdWUgfHxcclxuXHRcdFx0XHR0aGlzLnRhc2subWV0YWRhdGEub25Db21wbGV0aW9uIHx8XHJcblx0XHRcdFx0dChcIkNvbmZpZ3VyZS4uLlwiKSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEFkZCBjbGljayBoYW5kbGVyIHRvIG9wZW4gbW9kYWxcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChjb25maWdCdXR0b24sIFwiY2xpY2tcIiwgKGUpID0+IHtcclxuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cdFx0XHR0aGlzLm9wZW5PbkNvbXBsZXRpb25Nb2RhbChjb250YWluZXIsIGN1cnJlbnRWYWx1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBTZXQgdXAga2V5Ym9hcmQgaGFuZGxpbmdcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChidXR0b25Db250YWluZXIsIFwia2V5ZG93blwiLCAoZSkgPT4ge1xyXG5cdFx0XHRpZiAoZS5rZXkgPT09IFwiRXNjYXBlXCIpIHtcclxuXHRcdFx0XHRjb25zdCB0YXJnZXRFbCA9IGJ1dHRvbkNvbnRhaW5lci5jbG9zZXN0KFxyXG5cdFx0XHRcdFx0XCIuaW5saW5lLW1ldGFkYXRhLWVkaXRvclwiXHJcblx0XHRcdFx0KT8ucGFyZW50RWxlbWVudCBhcyBIVE1MRWxlbWVudDtcclxuXHRcdFx0XHRpZiAodGFyZ2V0RWwpIHtcclxuXHRcdFx0XHRcdHRoaXMuY2FuY2VsTWV0YWRhdGFFZGl0KHRhcmdldEVsKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSBpZiAoZS5rZXkgPT09IFwiRW50ZXJcIiAmJiAhZS5zaGlmdEtleSkge1xyXG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0XHR0aGlzLm9wZW5PbkNvbXBsZXRpb25Nb2RhbChjb250YWluZXIsIGN1cnJlbnRWYWx1ZSk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEZvY3VzIHRoZSBidXR0b25cclxuXHRcdGNvbmZpZ0J1dHRvbi5mb2N1cygpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBvcGVuT25Db21wbGV0aW9uTW9kYWwoXHJcblx0XHRjb250YWluZXI6IEhUTUxFbGVtZW50LFxyXG5cdFx0Y3VycmVudFZhbHVlPzogc3RyaW5nXHJcblx0KTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRjb25zdCBtb2RhbCA9IG5ldyBPbkNvbXBsZXRpb25Nb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4sIHtcclxuXHRcdFx0aW5pdGlhbFZhbHVlOiBjdXJyZW50VmFsdWUgfHwgdGhpcy50YXNrLm1ldGFkYXRhLm9uQ29tcGxldGlvbiB8fCBcIlwiLFxyXG5cdFx0XHRvblNhdmU6ICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdC8vIFVwZGF0ZSB0aGUgdGFzayBtZXRhZGF0YVxyXG5cdFx0XHRcdHRoaXMudGFzay5tZXRhZGF0YS5vbkNvbXBsZXRpb24gPSB2YWx1ZSB8fCB1bmRlZmluZWQ7XHJcblxyXG5cdFx0XHRcdC8vIFVwZGF0ZSB0aGUgYnV0dG9uIHRleHRcclxuXHRcdFx0XHRjb25zdCBidXR0b24gPSBjb250YWluZXIucXVlcnlTZWxlY3RvcihcclxuXHRcdFx0XHRcdFwiLmlubGluZS1vbmNvbXBsZXRpb24tY29uZmlnLWJ1dHRvblwiXHJcblx0XHRcdFx0KSBhcyBIVE1MRWxlbWVudDtcclxuXHRcdFx0XHRpZiAoYnV0dG9uKSB7XHJcblx0XHRcdFx0XHRidXR0b24udGV4dENvbnRlbnQgPSB2YWx1ZSB8fCB0KFwiQ29uZmlndXJlLi4uXCIpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gVHJpZ2dlciBkZWJvdW5jZWQgc2F2ZVxyXG5cdFx0XHRcdHRoaXMuZGVib3VuY2VkU2F2ZT8uKCk7XHJcblxyXG5cdFx0XHRcdC8vIEZpbmlzaCB0aGUgbWV0YWRhdGEgZWRpdFxyXG5cdFx0XHRcdGNvbnN0IHRhcmdldEVsID0gY29udGFpbmVyLmNsb3Nlc3QoXCIuaW5saW5lLW1ldGFkYXRhLWVkaXRvclwiKVxyXG5cdFx0XHRcdFx0Py5wYXJlbnRFbGVtZW50IGFzIEhUTUxFbGVtZW50O1xyXG5cdFx0XHRcdGlmICh0YXJnZXRFbCkge1xyXG5cdFx0XHRcdFx0dGhpcy5maW5pc2hNZXRhZGF0YUVkaXQodGFyZ2V0RWwsIFwib25Db21wbGV0aW9uXCIpLmNhdGNoKFxyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmVycm9yXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSxcclxuXHRcdFx0b25DYW5jZWw6ICgpID0+IHtcclxuXHRcdFx0XHQvLyBGaW5pc2ggdGhlIG1ldGFkYXRhIGVkaXQgd2l0aG91dCBzYXZpbmdcclxuXHRcdFx0XHRjb25zdCB0YXJnZXRFbCA9IGNvbnRhaW5lci5jbG9zZXN0KFwiLmlubGluZS1tZXRhZGF0YS1lZGl0b3JcIilcclxuXHRcdFx0XHRcdD8ucGFyZW50RWxlbWVudCBhcyBIVE1MRWxlbWVudDtcclxuXHRcdFx0XHRpZiAodGFyZ2V0RWwpIHtcclxuXHRcdFx0XHRcdHRoaXMuY2FuY2VsTWV0YWRhdGFFZGl0KHRhcmdldEVsKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHJcblx0XHRtb2RhbC5vcGVuKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNyZWF0ZURlcGVuZHNPbkVkaXRvcihcclxuXHRcdGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXHJcblx0XHRjdXJyZW50VmFsdWU/OiBzdHJpbmdcclxuXHQpOiB2b2lkIHtcclxuXHRcdGNvbnN0IGlucHV0ID0gY29udGFpbmVyLmNyZWF0ZUVsKFwiaW5wdXRcIiwge1xyXG5cdFx0XHR0eXBlOiBcInRleHRcIixcclxuXHRcdFx0Y2xzOiBcImlubGluZS1kZXBlbmRzb24taW5wdXRcIixcclxuXHRcdFx0dmFsdWU6XHJcblx0XHRcdFx0Y3VycmVudFZhbHVlIHx8XHJcblx0XHRcdFx0KHRoaXMudGFzay5tZXRhZGF0YS5kZXBlbmRzT25cclxuXHRcdFx0XHRcdD8gdGhpcy50YXNrLm1ldGFkYXRhLmRlcGVuZHNPbi5qb2luKFwiLCBcIilcclxuXHRcdFx0XHRcdDogXCJcIiksXHJcblx0XHRcdHBsYWNlaG9sZGVyOiBcIlRhc2sgSURzIHNlcGFyYXRlZCBieSBjb21tYXNcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuYWN0aXZlSW5wdXQgPSBpbnB1dDtcclxuXHJcblx0XHQvLyBQcmV2ZW50IGV2ZW50IGJ1YmJsaW5nIG9uIGlucHV0IGVsZW1lbnRcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChcclxuXHRcdFx0aW5wdXQsXHJcblx0XHRcdFwiY2xpY2tcIixcclxuXHRcdFx0dGhpcy5ib3VuZEhhbmRsZXJzLnN0b3BQcm9wYWdhdGlvblxyXG5cdFx0KTtcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChcclxuXHRcdFx0aW5wdXQsXHJcblx0XHRcdFwibW91c2Vkb3duXCIsXHJcblx0XHRcdHRoaXMuYm91bmRIYW5kbGVycy5zdG9wUHJvcGFnYXRpb25cclxuXHRcdCk7XHJcblxyXG5cdFx0Y29uc3QgdXBkYXRlRGVwZW5kc09uID0gKHZhbHVlOiBzdHJpbmcpID0+IHtcclxuXHRcdFx0aWYgKHZhbHVlLnRyaW0oKSkge1xyXG5cdFx0XHRcdHRoaXMudGFzay5tZXRhZGF0YS5kZXBlbmRzT24gPSB2YWx1ZVxyXG5cdFx0XHRcdFx0LnNwbGl0KFwiLFwiKVxyXG5cdFx0XHRcdFx0Lm1hcCgoaWQpID0+IGlkLnRyaW0oKSlcclxuXHRcdFx0XHRcdC5maWx0ZXIoKGlkKSA9PiBpZC5sZW5ndGggPiAwKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0aGlzLnRhc2subWV0YWRhdGEuZGVwZW5kc09uID0gdW5kZWZpbmVkO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuc2V0dXBJbnB1dEV2ZW50cyhpbnB1dCwgdXBkYXRlRGVwZW5kc09uLCBcImRlcGVuZHNPblwiKTtcclxuXHJcblx0XHQvLyBGb2N1cyBhbmQgc2VsZWN0XHJcblx0XHRpbnB1dC5mb2N1cygpO1xyXG5cdFx0aW5wdXQuc2VsZWN0KCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNyZWF0ZUlkRWRpdG9yKFxyXG5cdFx0Y29udGFpbmVyOiBIVE1MRWxlbWVudCxcclxuXHRcdGN1cnJlbnRWYWx1ZT86IHN0cmluZ1xyXG5cdCk6IHZvaWQge1xyXG5cdFx0Y29uc3QgaW5wdXQgPSBjb250YWluZXIuY3JlYXRlRWwoXCJpbnB1dFwiLCB7XHJcblx0XHRcdHR5cGU6IFwidGV4dFwiLFxyXG5cdFx0XHRjbHM6IFwiaW5saW5lLWlkLWlucHV0XCIsXHJcblx0XHRcdHZhbHVlOiBjdXJyZW50VmFsdWUgfHwgdGhpcy50YXNrLm1ldGFkYXRhLmlkIHx8IFwiXCIsXHJcblx0XHRcdHBsYWNlaG9sZGVyOiBcIlVuaXF1ZSB0YXNrIGlkZW50aWZpZXJcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuYWN0aXZlSW5wdXQgPSBpbnB1dDtcclxuXHJcblx0XHQvLyBQcmV2ZW50IGV2ZW50IGJ1YmJsaW5nIG9uIGlucHV0IGVsZW1lbnRcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChcclxuXHRcdFx0aW5wdXQsXHJcblx0XHRcdFwiY2xpY2tcIixcclxuXHRcdFx0dGhpcy5ib3VuZEhhbmRsZXJzLnN0b3BQcm9wYWdhdGlvblxyXG5cdFx0KTtcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChcclxuXHRcdFx0aW5wdXQsXHJcblx0XHRcdFwibW91c2Vkb3duXCIsXHJcblx0XHRcdHRoaXMuYm91bmRIYW5kbGVycy5zdG9wUHJvcGFnYXRpb25cclxuXHRcdCk7XHJcblxyXG5cdFx0Y29uc3QgdXBkYXRlSWQgPSAodmFsdWU6IHN0cmluZykgPT4ge1xyXG5cdFx0XHR0aGlzLnRhc2subWV0YWRhdGEuaWQgPSB2YWx1ZSB8fCB1bmRlZmluZWQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuc2V0dXBJbnB1dEV2ZW50cyhpbnB1dCwgdXBkYXRlSWQsIFwiaWRcIik7XHJcblxyXG5cdFx0Ly8gRm9jdXMgYW5kIHNlbGVjdFxyXG5cdFx0aW5wdXQuZm9jdXMoKTtcclxuXHRcdGlucHV0LnNlbGVjdCgpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBzZXR1cElucHV0RXZlbnRzKFxyXG5cdFx0aW5wdXQ6IEhUTUxJbnB1dEVsZW1lbnQgfCBIVE1MU2VsZWN0RWxlbWVudCB8IEhUTUxUZXh0QXJlYUVsZW1lbnQsXHJcblx0XHR1cGRhdGVDYWxsYmFjazogKHZhbHVlOiBzdHJpbmcpID0+IHZvaWQsXHJcblx0XHRmaWVsZFR5cGU/OiBzdHJpbmdcclxuXHQpOiB2b2lkIHtcclxuXHRcdC8vIFN0b3JlIHRoZSBmaWVsZCB0eXBlIGZvciBsYXRlciB1c2VcclxuXHRcdChpbnB1dCBhcyBhbnkpLl9maWVsZFR5cGUgPSBmaWVsZFR5cGU7XHJcblx0XHQoaW5wdXQgYXMgYW55KS5fdXBkYXRlQ2FsbGJhY2sgPSB1cGRhdGVDYWxsYmFjaztcclxuXHJcblx0XHQvLyBGb3IgZGF0ZSBpbnB1dHMsIG9ubHkgc2F2ZSBvbiBibHVyIG9yIEVudGVyIGtleSwgbm90IG9uIGlucHV0IGNoYW5nZVxyXG5cdFx0Y29uc3QgaXNEYXRlRmllbGQgPVxyXG5cdFx0XHRmaWVsZFR5cGUgJiZcclxuXHRcdFx0W1xyXG5cdFx0XHRcdFwiZHVlRGF0ZVwiLFxyXG5cdFx0XHRcdFwic3RhcnREYXRlXCIsXHJcblx0XHRcdFx0XCJzY2hlZHVsZWREYXRlXCIsXHJcblx0XHRcdFx0XCJjYW5jZWxsZWREYXRlXCIsXHJcblx0XHRcdFx0XCJjb21wbGV0ZWREYXRlXCIsXHJcblx0XHRcdF0uaW5jbHVkZXMoZmllbGRUeXBlKTtcclxuXHJcblx0XHRpZiAoaXNEYXRlRmllbGQpIHtcclxuXHRcdFx0Ly8gRm9yIGRhdGUgaW5wdXRzLCB1cGRhdGUgdGhlIHZhbHVlIGJ1dCBkb24ndCB0cmlnZ2VyIHNhdmUgb24gaW5wdXRcclxuXHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGlucHV0LCBcImlucHV0XCIsIChlOiBFdmVudCkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IHRhcmdldCA9IGUudGFyZ2V0IGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcblx0XHRcdFx0Y29uc3QgdXBkYXRlQ2FsbGJhY2sgPSAodGFyZ2V0IGFzIGFueSkuX3VwZGF0ZUNhbGxiYWNrO1xyXG5cdFx0XHRcdGlmICh1cGRhdGVDYWxsYmFjaykge1xyXG5cdFx0XHRcdFx0dXBkYXRlQ2FsbGJhY2sodGFyZ2V0LnZhbHVlKTtcclxuXHRcdFx0XHRcdC8vIERvbid0IGNhbGwgZGVib3VuY2VkU2F2ZSBoZXJlIGZvciBkYXRlIGZpZWxkc1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBGb3Igbm9uLWRhdGUgaW5wdXRzLCB1c2UgdGhlIHJlZ3VsYXIgaGFuZGxlciB0aGF0IGluY2x1ZGVzIGRlYm91bmNlZCBzYXZlXHJcblx0XHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChcclxuXHRcdFx0XHRpbnB1dCxcclxuXHRcdFx0XHRcImlucHV0XCIsXHJcblx0XHRcdFx0dGhpcy5ib3VuZEhhbmRsZXJzLmhhbmRsZUlucHV0XHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGlucHV0LCBcImJsdXJcIiwgdGhpcy5ib3VuZEhhbmRsZXJzLmhhbmRsZUJsdXIpO1xyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KFxyXG5cdFx0XHRpbnB1dCxcclxuXHRcdFx0XCJrZXlkb3duXCIsXHJcblx0XHRcdHRoaXMuYm91bmRIYW5kbGVycy5oYW5kbGVLZXlkb3duXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0Ly8gT3B0aW1pemVkIGV2ZW50IGhhbmRsZXJzXHJcblx0cHJpdmF0ZSBoYW5kbGVJbnB1dChlOiBFdmVudCk6IHZvaWQge1xyXG5cdFx0Y29uc3QgdGFyZ2V0ID0gZS50YXJnZXQgYXMgSFRNTElucHV0RWxlbWVudCB8IEhUTUxUZXh0QXJlYUVsZW1lbnQ7XHJcblxyXG5cdFx0aWYgKHRhcmdldCA9PT0gdGhpcy5jb250ZW50SW5wdXQpIHtcclxuXHRcdFx0Ly8gQXV0by1yZXNpemUgdGV4dGFyZWFcclxuXHRcdFx0dGhpcy5hdXRvUmVzaXplVGV4dGFyZWEodGFyZ2V0IGFzIEhUTUxUZXh0QXJlYUVsZW1lbnQpO1xyXG5cdFx0XHQvLyBVcGRhdGUgdGFzayBjb250ZW50IGltbWVkaWF0ZWx5IGJ1dCBkb24ndCBzYXZlXHJcblx0XHRcdHRoaXMudGFzay5jb250ZW50ID0gdGFyZ2V0LnZhbHVlO1xyXG5cdFx0fSBlbHNlIGlmICh0YXJnZXQgPT09IHRoaXMuYWN0aXZlSW5wdXQpIHtcclxuXHRcdFx0Ly8gSGFuZGxlIG1ldGFkYXRhIGlucHV0XHJcblx0XHRcdGNvbnN0IHVwZGF0ZUNhbGxiYWNrID0gKHRhcmdldCBhcyBhbnkpLl91cGRhdGVDYWxsYmFjaztcclxuXHRcdFx0aWYgKHVwZGF0ZUNhbGxiYWNrKSB7XHJcblx0XHRcdFx0dXBkYXRlQ2FsbGJhY2sodGFyZ2V0LnZhbHVlKTtcclxuXHRcdFx0XHR0aGlzLmRlYm91bmNlZFNhdmU/LigpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGhhbmRsZUJsdXIoZTogRm9jdXNFdmVudCk6IHZvaWQge1xyXG5cdFx0Y29uc3QgdGFyZ2V0ID0gZS50YXJnZXQgYXNcclxuXHRcdFx0fCBIVE1MSW5wdXRFbGVtZW50XHJcblx0XHRcdHwgSFRNTFNlbGVjdEVsZW1lbnRcclxuXHRcdFx0fCBIVE1MVGV4dEFyZWFFbGVtZW50O1xyXG5cclxuXHRcdC8vIENoZWNrIGlmIGZvY3VzIGlzIG1vdmluZyB0byBhbm90aGVyIGVsZW1lbnQgd2l0aGluIG91ciBlZGl0b3JcclxuXHRcdGNvbnN0IHJlbGF0ZWRUYXJnZXQgPSBlLnJlbGF0ZWRUYXJnZXQgYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRpZiAocmVsYXRlZFRhcmdldCAmJiB0aGlzLmNvbnRhaW5lckVsPy5jb250YWlucyhyZWxhdGVkVGFyZ2V0KSkge1xyXG5cdFx0XHRyZXR1cm47IC8vIERvbid0IGZpbmlzaCBlZGl0IGlmIGZvY3VzIGlzIHN0YXlpbmcgd2l0aGluIG91ciBlZGl0b3JcclxuXHRcdH1cclxuXHJcblx0XHQvLyBGb3IgY29udGVudCBlZGl0aW5nLCBmaW5pc2ggdGhlIGVkaXRcclxuXHRcdGlmICh0YXJnZXQgPT09IHRoaXMuY29udGVudElucHV0ICYmIHRoaXMuaXNFZGl0aW5nKSB7XHJcblx0XHRcdGNvbnN0IGNvbnRlbnRFbCA9IHRhcmdldC5jbG9zZXN0KFxyXG5cdFx0XHRcdFwiLnRhc2staXRlbS1jb250ZW50XCJcclxuXHRcdFx0KSBhcyBIVE1MRWxlbWVudDtcclxuXHRcdFx0aWYgKGNvbnRlbnRFbCkge1xyXG5cdFx0XHRcdHRoaXMuZmluaXNoQ29udGVudEVkaXQoY29udGVudEVsKS5jYXRjaChjb25zb2xlLmVycm9yKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRm9yIG1ldGFkYXRhIGVkaXRpbmcsIGZpbmlzaCB0aGUgc3BlY2lmaWMgbWV0YWRhdGEgZWRpdFxyXG5cdFx0aWYgKHRhcmdldCA9PT0gdGhpcy5hY3RpdmVJbnB1dCAmJiB0aGlzLmlzRWRpdGluZykge1xyXG5cdFx0XHRjb25zdCBmaWVsZFR5cGUgPSAodGFyZ2V0IGFzIGFueSkuX2ZpZWxkVHlwZTtcclxuXHRcdFx0Y29uc3QgdGFyZ2V0RWwgPSB0YXJnZXQuY2xvc2VzdChcIi5pbmxpbmUtbWV0YWRhdGEtZWRpdG9yXCIpXHJcblx0XHRcdFx0Py5wYXJlbnRFbGVtZW50IGFzIEhUTUxFbGVtZW50O1xyXG5cdFx0XHRpZiAodGFyZ2V0RWwgJiYgZmllbGRUeXBlKSB7XHJcblx0XHRcdFx0dGhpcy5maW5pc2hNZXRhZGF0YUVkaXQodGFyZ2V0RWwsIGZpZWxkVHlwZSkuY2F0Y2goXHJcblx0XHRcdFx0XHRjb25zb2xlLmVycm9yXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBoYW5kbGVLZXlkb3duKGU6IEtleWJvYXJkRXZlbnQpOiB2b2lkIHtcclxuXHRcdGlmIChlLmtleSA9PT0gXCJFc2NhcGVcIikge1xyXG5cdFx0XHRjb25zdCB0YXJnZXQgPSBlLnRhcmdldCBhcyBIVE1MRWxlbWVudDtcclxuXHJcblx0XHRcdGlmICh0YXJnZXQgPT09IHRoaXMuY29udGVudElucHV0KSB7XHJcblx0XHRcdFx0Y29uc3QgY29udGVudEVsID0gdGFyZ2V0LmNsb3Nlc3QoXHJcblx0XHRcdFx0XHRcIi50YXNrLWl0ZW0tY29udGVudFwiXHJcblx0XHRcdFx0KSBhcyBIVE1MRWxlbWVudDtcclxuXHRcdFx0XHRpZiAoY29udGVudEVsKSB7XHJcblx0XHRcdFx0XHR0aGlzLmNhbmNlbENvbnRlbnRFZGl0KGNvbnRlbnRFbCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2UgaWYgKHRhcmdldCA9PT0gdGhpcy5hY3RpdmVJbnB1dCkge1xyXG5cdFx0XHRcdGNvbnN0IHRhcmdldEVsID0gdGFyZ2V0LmNsb3Nlc3QoXCIuaW5saW5lLW1ldGFkYXRhLWVkaXRvclwiKVxyXG5cdFx0XHRcdFx0Py5wYXJlbnRFbGVtZW50IGFzIEhUTUxFbGVtZW50O1xyXG5cdFx0XHRcdGlmICh0YXJnZXRFbCkge1xyXG5cdFx0XHRcdFx0dGhpcy5jYW5jZWxNZXRhZGF0YUVkaXQodGFyZ2V0RWwpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIGlmIChlLmtleSA9PT0gXCJFbnRlclwiICYmICFlLnNoaWZ0S2V5KSB7XHJcblx0XHRcdGNvbnN0IHRhcmdldCA9IGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xyXG5cclxuXHRcdFx0aWYgKHRhcmdldCA9PT0gdGhpcy5hY3RpdmVJbnB1dCkge1xyXG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0XHRjb25zdCBmaWVsZFR5cGUgPSAodGFyZ2V0IGFzIGFueSkuX2ZpZWxkVHlwZTtcclxuXHRcdFx0XHRjb25zdCB0YXJnZXRFbCA9IHRhcmdldC5jbG9zZXN0KFwiLmlubGluZS1tZXRhZGF0YS1lZGl0b3JcIilcclxuXHRcdFx0XHRcdD8ucGFyZW50RWxlbWVudCBhcyBIVE1MRWxlbWVudDtcclxuXHRcdFx0XHRpZiAodGFyZ2V0RWwgJiYgZmllbGRUeXBlKSB7XHJcblx0XHRcdFx0XHR0aGlzLmZpbmlzaE1ldGFkYXRhRWRpdCh0YXJnZXRFbCwgZmllbGRUeXBlKS5jYXRjaChcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvclxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gRm9yIGNvbnRlbnQgZWRpdGluZywgbGV0IHRoZSBlbWJlZGRlZCBlZGl0b3IgaGFuZGxlIEVudGVyXHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGF1dG9SZXNpemVUZXh0YXJlYSh0ZXh0YXJlYTogSFRNTFRleHRBcmVhRWxlbWVudCk6IHZvaWQge1xyXG5cdFx0dGV4dGFyZWEuc3R5bGUuaGVpZ2h0ID0gXCJhdXRvXCI7XHJcblx0XHR0ZXh0YXJlYS5zdHlsZS5oZWlnaHQgPSB0ZXh0YXJlYS5zY3JvbGxIZWlnaHQgKyBcInB4XCI7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGZvY3VzRWRpdG9yKCk6IHZvaWQge1xyXG5cdFx0Ly8gVXNlIHJlcXVlc3RBbmltYXRpb25GcmFtZSBmb3IgYmV0dGVyIHRpbWluZ1xyXG5cdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcclxuXHRcdFx0aWYgKHRoaXMuZW1iZWRkZWRFZGl0b3I/LmFjdGl2ZUNNKSB7XHJcblx0XHRcdFx0dGhpcy5lbWJlZGRlZEVkaXRvci5hY3RpdmVDTS5mb2N1cygpO1xyXG5cdFx0XHRcdC8vIFNlbGVjdCBhbGwgdGV4dFxyXG5cdFx0XHRcdHRoaXMuZW1iZWRkZWRFZGl0b3IuYWN0aXZlQ00uZGlzcGF0Y2goe1xyXG5cdFx0XHRcdFx0c2VsZWN0aW9uOiB7XHJcblx0XHRcdFx0XHRcdGFuY2hvcjogMCxcclxuXHRcdFx0XHRcdFx0aGVhZDogdGhpcy5lbWJlZGRlZEVkaXRvci52YWx1ZS5sZW5ndGgsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc2hvd01ldGFkYXRhTWVudShidXR0b25FbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdGNvbnN0IG1lbnUgPSBuZXcgTWVudSgpO1xyXG5cclxuXHRcdGNvbnN0IGF2YWlsYWJsZUZpZWxkcyA9IFtcclxuXHRcdFx0eyBrZXk6IFwicHJvamVjdFwiLCBsYWJlbDogXCJQcm9qZWN0XCIsIGljb246IFwiZm9sZGVyXCIgfSxcclxuXHRcdFx0eyBrZXk6IFwidGFnc1wiLCBsYWJlbDogXCJUYWdzXCIsIGljb246IFwidGFnXCIgfSxcclxuXHRcdFx0eyBrZXk6IFwiY29udGV4dFwiLCBsYWJlbDogXCJDb250ZXh0XCIsIGljb246IFwiYXQtc2lnblwiIH0sXHJcblx0XHRcdHsga2V5OiBcImR1ZURhdGVcIiwgbGFiZWw6IFwiRHVlIERhdGVcIiwgaWNvbjogXCJjYWxlbmRhclwiIH0sXHJcblx0XHRcdHsga2V5OiBcInN0YXJ0RGF0ZVwiLCBsYWJlbDogXCJTdGFydCBEYXRlXCIsIGljb246IFwicGxheVwiIH0sXHJcblx0XHRcdHsga2V5OiBcInNjaGVkdWxlZERhdGVcIiwgbGFiZWw6IFwiU2NoZWR1bGVkIERhdGVcIiwgaWNvbjogXCJjbG9ja1wiIH0sXHJcblx0XHRcdHsga2V5OiBcImNhbmNlbGxlZERhdGVcIiwgbGFiZWw6IFwiQ2FuY2VsbGVkIERhdGVcIiwgaWNvbjogXCJ4XCIgfSxcclxuXHRcdFx0eyBrZXk6IFwiY29tcGxldGVkRGF0ZVwiLCBsYWJlbDogXCJDb21wbGV0ZWQgRGF0ZVwiLCBpY29uOiBcImNoZWNrXCIgfSxcclxuXHRcdFx0eyBrZXk6IFwicHJpb3JpdHlcIiwgbGFiZWw6IFwiUHJpb3JpdHlcIiwgaWNvbjogXCJhbGVydC10cmlhbmdsZVwiIH0sXHJcblx0XHRcdHsga2V5OiBcInJlY3VycmVuY2VcIiwgbGFiZWw6IFwiUmVjdXJyZW5jZVwiLCBpY29uOiBcInJlcGVhdFwiIH0sXHJcblx0XHRcdHsga2V5OiBcIm9uQ29tcGxldGlvblwiLCBsYWJlbDogXCJPbiBDb21wbGV0aW9uXCIsIGljb246IFwiZmxhZ1wiIH0sXHJcblx0XHRcdHsga2V5OiBcImRlcGVuZHNPblwiLCBsYWJlbDogXCJEZXBlbmRzIE9uXCIsIGljb246IFwibGlua1wiIH0sXHJcblx0XHRcdHsga2V5OiBcImlkXCIsIGxhYmVsOiBcIlRhc2sgSURcIiwgaWNvbjogXCJoYXNoXCIgfSxcclxuXHRcdF07XHJcblxyXG5cdFx0Ly8gRmlsdGVyIG91dCBmaWVsZHMgdGhhdCBhbHJlYWR5IGhhdmUgdmFsdWVzXHJcblx0XHRjb25zdCBmaWVsZHNUb1Nob3cgPSBhdmFpbGFibGVGaWVsZHMuZmlsdGVyKChmaWVsZCkgPT4ge1xyXG5cdFx0XHRzd2l0Y2ggKGZpZWxkLmtleSkge1xyXG5cdFx0XHRcdGNhc2UgXCJwcm9qZWN0XCI6XHJcblx0XHRcdFx0XHRyZXR1cm4gIXRoaXMudGFzay5tZXRhZGF0YS5wcm9qZWN0O1xyXG5cdFx0XHRcdGNhc2UgXCJ0YWdzXCI6XHJcblx0XHRcdFx0XHRyZXR1cm4gKFxyXG5cdFx0XHRcdFx0XHQhdGhpcy50YXNrLm1ldGFkYXRhLnRhZ3MgfHxcclxuXHRcdFx0XHRcdFx0dGhpcy50YXNrLm1ldGFkYXRhLnRhZ3MubGVuZ3RoID09PSAwXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdGNhc2UgXCJjb250ZXh0XCI6XHJcblx0XHRcdFx0XHRyZXR1cm4gIXRoaXMudGFzay5tZXRhZGF0YS5jb250ZXh0O1xyXG5cdFx0XHRcdGNhc2UgXCJkdWVEYXRlXCI6XHJcblx0XHRcdFx0XHRyZXR1cm4gIXRoaXMudGFzay5tZXRhZGF0YS5kdWVEYXRlO1xyXG5cdFx0XHRcdGNhc2UgXCJzdGFydERhdGVcIjpcclxuXHRcdFx0XHRcdHJldHVybiAhdGhpcy50YXNrLm1ldGFkYXRhLnN0YXJ0RGF0ZTtcclxuXHRcdFx0XHRjYXNlIFwic2NoZWR1bGVkRGF0ZVwiOlxyXG5cdFx0XHRcdFx0cmV0dXJuICF0aGlzLnRhc2subWV0YWRhdGEuc2NoZWR1bGVkRGF0ZTtcclxuXHRcdFx0XHRjYXNlIFwiY2FuY2VsbGVkRGF0ZVwiOlxyXG5cdFx0XHRcdFx0cmV0dXJuICF0aGlzLnRhc2subWV0YWRhdGEuY2FuY2VsbGVkRGF0ZTtcclxuXHRcdFx0XHRjYXNlIFwiY29tcGxldGVkRGF0ZVwiOlxyXG5cdFx0XHRcdFx0cmV0dXJuICF0aGlzLnRhc2subWV0YWRhdGEuY29tcGxldGVkRGF0ZTtcclxuXHRcdFx0XHRjYXNlIFwicHJpb3JpdHlcIjpcclxuXHRcdFx0XHRcdHJldHVybiAhdGhpcy50YXNrLm1ldGFkYXRhLnByaW9yaXR5O1xyXG5cdFx0XHRcdGNhc2UgXCJyZWN1cnJlbmNlXCI6XHJcblx0XHRcdFx0XHRyZXR1cm4gIXRoaXMudGFzay5tZXRhZGF0YS5yZWN1cnJlbmNlO1xyXG5cdFx0XHRcdGNhc2UgXCJvbkNvbXBsZXRpb25cIjpcclxuXHRcdFx0XHRcdHJldHVybiAhdGhpcy50YXNrLm1ldGFkYXRhLm9uQ29tcGxldGlvbjtcclxuXHRcdFx0XHRjYXNlIFwiZGVwZW5kc09uXCI6XHJcblx0XHRcdFx0XHRyZXR1cm4gKFxyXG5cdFx0XHRcdFx0XHQhdGhpcy50YXNrLm1ldGFkYXRhLmRlcGVuZHNPbiB8fFxyXG5cdFx0XHRcdFx0XHR0aGlzLnRhc2subWV0YWRhdGEuZGVwZW5kc09uLmxlbmd0aCA9PT0gMFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRjYXNlIFwiaWRcIjpcclxuXHRcdFx0XHRcdHJldHVybiAhdGhpcy50YXNrLm1ldGFkYXRhLmlkO1xyXG5cdFx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gSWYgbm8gZmllbGRzIGFyZSBhdmFpbGFibGUgdG8gYWRkLCBzaG93IGEgbWVzc2FnZVxyXG5cdFx0aWYgKGZpZWxkc1RvU2hvdy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdFx0aXRlbS5zZXRUaXRsZShcclxuXHRcdFx0XHRcdFwiQWxsIG1ldGFkYXRhIGZpZWxkcyBhcmUgYWxyZWFkeSBzZXRcIlxyXG5cdFx0XHRcdCkuc2V0RGlzYWJsZWQodHJ1ZSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0ZmllbGRzVG9TaG93LmZvckVhY2goKGZpZWxkKSA9PiB7XHJcblx0XHRcdFx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdFx0XHRpdGVtLnNldFRpdGxlKGZpZWxkLmxhYmVsKVxyXG5cdFx0XHRcdFx0XHQuc2V0SWNvbihmaWVsZC5pY29uKVxyXG5cdFx0XHRcdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5zaG93TWV0YWRhdGFFZGl0b3IoXHJcblx0XHRcdFx0XHRcdFx0XHRidXR0b25FbC5wYXJlbnRFbGVtZW50ISxcclxuXHRcdFx0XHRcdFx0XHRcdGZpZWxkLmtleSBhcyBhbnlcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0bWVudS5zaG93QXRQb3NpdGlvbih7XHJcblx0XHRcdHg6IGJ1dHRvbkVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmxlZnQsXHJcblx0XHRcdHk6IGJ1dHRvbkVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmJvdHRvbSxcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBzYXZlVGFzaygpOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuXHRcdGlmICghdGhpcy5pc0VkaXRpbmcgfHwgIXRoaXMub3JpZ2luYWxUYXNrIHx8IHRoaXMuaXNTYXZpbmcpIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENoZWNrIGlmIHRoZXJlIGFyZSBhY3R1YWwgY2hhbmdlc1xyXG5cdFx0Y29uc3QgaGFzQ2hhbmdlcyA9IHRoaXMuaGFzVGFza0NoYW5nZXModGhpcy5vcmlnaW5hbFRhc2ssIHRoaXMudGFzayk7XHJcblx0XHRpZiAoIWhhc0NoYW5nZXMpIHtcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5pc1NhdmluZyA9IHRydWU7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcIltJbmxpbmVFZGl0b3JdIENhbGxpbmcgb25UYXNrVXBkYXRlOlwiLFxyXG5cdFx0XHRcdHRoaXMub3JpZ2luYWxUYXNrLmNvbnRlbnQsXHJcblx0XHRcdFx0XCItPlwiLFxyXG5cdFx0XHRcdHRoaXMudGFzay5jb250ZW50XHJcblx0XHRcdCk7XHJcblx0XHRcdGF3YWl0IHRoaXMub3B0aW9ucy5vblRhc2tVcGRhdGUodGhpcy5vcmlnaW5hbFRhc2ssIHRoaXMudGFzayk7XHJcblx0XHRcdHRoaXMub3JpZ2luYWxUYXNrID0ge1xyXG5cdFx0XHRcdC4uLnRoaXMudGFzayxcclxuXHRcdFx0XHRtZXRhZGF0YTogeyAuLi50aGlzLnRhc2subWV0YWRhdGEgfSxcclxuXHRcdFx0fTtcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIHNhdmUgdGFzazpcIiwgZXJyb3IpO1xyXG5cdFx0XHQvLyBSZXZlcnQgY2hhbmdlcyBvbiBlcnJvclxyXG5cdFx0XHR0aGlzLnRhc2sgPSB7XHJcblx0XHRcdFx0Li4udGhpcy5vcmlnaW5hbFRhc2ssXHJcblx0XHRcdFx0bWV0YWRhdGE6IHsgLi4udGhpcy5vcmlnaW5hbFRhc2subWV0YWRhdGEgfSxcclxuXHRcdFx0fTtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fSBmaW5hbGx5IHtcclxuXHRcdFx0dGhpcy5pc1NhdmluZyA9IGZhbHNlO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBoYXNUYXNrQ2hhbmdlcyhvcmlnaW5hbFRhc2s6IFRhc2ssIHVwZGF0ZWRUYXNrOiBUYXNrKTogYm9vbGVhbiB7XHJcblx0XHQvLyBDb21wYXJlIGNvbnRlbnQgKHRvcC1sZXZlbCBwcm9wZXJ0eSlcclxuXHRcdGlmIChvcmlnaW5hbFRhc2suY29udGVudCAhPT0gdXBkYXRlZFRhc2suY29udGVudCkge1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDb21wYXJlIG1ldGFkYXRhIHByb3BlcnRpZXNcclxuXHRcdGNvbnN0IG1ldGFkYXRhUHJvcHMgPSBbXHJcblx0XHRcdFwicHJvamVjdFwiLFxyXG5cdFx0XHRcInRhZ3NcIixcclxuXHRcdFx0XCJjb250ZXh0XCIsXHJcblx0XHRcdFwicHJpb3JpdHlcIixcclxuXHRcdFx0XCJkdWVEYXRlXCIsXHJcblx0XHRcdFwic3RhcnREYXRlXCIsXHJcblx0XHRcdFwic2NoZWR1bGVkRGF0ZVwiLFxyXG5cdFx0XHRcImNhbmNlbGxlZERhdGVcIixcclxuXHRcdFx0XCJjb21wbGV0ZWREYXRlXCIsXHJcblx0XHRcdFwicmVjdXJyZW5jZVwiLFxyXG5cdFx0XTtcclxuXHJcblx0XHRmb3IgKGNvbnN0IHByb3Agb2YgbWV0YWRhdGFQcm9wcykge1xyXG5cdFx0XHRjb25zdCBvcmlnaW5hbFZhbHVlID0gKFxyXG5cdFx0XHRcdG9yaWdpbmFsVGFzay5tZXRhZGF0YSBhcyBTdGFuZGFyZFRhc2tNZXRhZGF0YVxyXG5cdFx0XHQpW3Byb3AgYXMga2V5b2YgU3RhbmRhcmRUYXNrTWV0YWRhdGFdO1xyXG5cdFx0XHRjb25zdCB1cGRhdGVkVmFsdWUgPSAodXBkYXRlZFRhc2subWV0YWRhdGEgYXMgU3RhbmRhcmRUYXNrTWV0YWRhdGEpW1xyXG5cdFx0XHRcdHByb3AgYXMga2V5b2YgU3RhbmRhcmRUYXNrTWV0YWRhdGFcclxuXHRcdFx0XTtcclxuXHJcblx0XHRcdC8vIEhhbmRsZSBhcnJheSBjb21wYXJpc29uIGZvciB0YWdzXHJcblx0XHRcdGlmIChwcm9wID09PSBcInRhZ3NcIikge1xyXG5cdFx0XHRcdGNvbnN0IG9yaWdpbmFsVGFncyA9IEFycmF5LmlzQXJyYXkob3JpZ2luYWxWYWx1ZSlcclxuXHRcdFx0XHRcdD8gb3JpZ2luYWxWYWx1ZVxyXG5cdFx0XHRcdFx0OiBbXTtcclxuXHRcdFx0XHRjb25zdCB1cGRhdGVkVGFncyA9IEFycmF5LmlzQXJyYXkodXBkYXRlZFZhbHVlKVxyXG5cdFx0XHRcdFx0PyB1cGRhdGVkVmFsdWVcclxuXHRcdFx0XHRcdDogW107XHJcblxyXG5cdFx0XHRcdGlmIChvcmlnaW5hbFRhZ3MubGVuZ3RoICE9PSB1cGRhdGVkVGFncy5sZW5ndGgpIHtcclxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBvcmlnaW5hbFRhZ3MubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRcdGlmIChvcmlnaW5hbFRhZ3NbaV0gIT09IHVwZGF0ZWRUYWdzW2ldKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBTaW1wbGUgdmFsdWUgY29tcGFyaXNvblxyXG5cdFx0XHRcdGlmIChvcmlnaW5hbFZhbHVlICE9PSB1cGRhdGVkVmFsdWUpIHtcclxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgZmluaXNoQ29udGVudEVkaXQodGFyZ2V0RWw6IEhUTUxFbGVtZW50KTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHQvLyBQcmV2ZW50IG11bHRpcGxlIGNvbmN1cnJlbnQgc2F2ZXNcclxuXHRcdGlmICh0aGlzLmlzU2F2aW5nKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiU2F2ZSBhbHJlYWR5IGluIHByb2dyZXNzLCB3YWl0aW5nLi4uXCIpO1xyXG5cdFx0XHQvLyBXYWl0IGZvciBjdXJyZW50IHNhdmUgdG8gY29tcGxldGVcclxuXHRcdFx0d2hpbGUgKHRoaXMuaXNTYXZpbmcpIHtcclxuXHRcdFx0XHRhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gc2V0VGltZW91dChyZXNvbHZlLCA1MCkpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gR2V0IGZpbmFsIGNvbnRlbnQgZnJvbSB0aGUgYXBwcm9wcmlhdGUgZWRpdG9yXHJcblx0XHRpZiAodGhpcy5lbWJlZGRlZEVkaXRvcikge1xyXG5cdFx0XHR0aGlzLnRhc2suY29udGVudCA9IHRoaXMuZW1iZWRkZWRFZGl0b3IudmFsdWU7XHJcblx0XHR9IGVsc2UgaWYgKHRoaXMuY29udGVudElucHV0KSB7XHJcblx0XHRcdHRoaXMudGFzay5jb250ZW50ID0gdGhpcy5jb250ZW50SW5wdXQudmFsdWU7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU2F2ZSB0aGUgdGFzayBhbmQgd2FpdCBmb3IgY29tcGxldGlvblxyXG5cdFx0Y29uc3Qgc2F2ZVN1Y2Nlc3MgPSBhd2FpdCB0aGlzLnNhdmVUYXNrKCk7XHJcblxyXG5cdFx0Y29uc29sZS5sb2coXCJzYXZlIHN1Y2Nlc3NcIiwgc2F2ZVN1Y2Nlc3MpO1xyXG5cclxuXHRcdGlmICghc2F2ZVN1Y2Nlc3MpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBzYXZlIHRhc2ssIG5vdCBmaW5pc2hpbmcgZWRpdFwiKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIE9ubHkgcHJvY2VlZCB3aXRoIGNsZWFudXAgYWZ0ZXIgc3VjY2Vzc2Z1bCBzYXZlXHJcblx0XHR0aGlzLmlzRWRpdGluZyA9IGZhbHNlO1xyXG5cclxuXHRcdC8vIENsZWFuIHVwIGVtYmVkZGVkIGVkaXRvclxyXG5cdFx0dGhpcy5jbGVhbnVwRWRpdG9ycygpO1xyXG5cclxuXHRcdC8vIE5vdGlmeSBwYXJlbnQgY29tcG9uZW50IHRvIHJlc3RvcmUgY29udGVudCBkaXNwbGF5XHJcblx0XHQvLyBQYXNzIHRoZSB1cGRhdGVkIHRhc2sgc28gcGFyZW50IGNhbiB1cGRhdGUgaXRzIHJlZmVyZW5jZVxyXG5cdFx0aWYgKHRoaXMub3B0aW9ucy5vbkNvbnRlbnRFZGl0RmluaXNoZWQpIHtcclxuXHRcdFx0dGhpcy5vcHRpb25zLm9uQ29udGVudEVkaXRGaW5pc2hlZCh0YXJnZXRFbCwgdGhpcy50YXNrKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIEZhbGxiYWNrOiBqdXN0IHNldCB0ZXh0IGNvbnRlbnRcclxuXHRcdFx0dGFyZ2V0RWwudGV4dENvbnRlbnQgPSB0aGlzLnRhc2suY29udGVudDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZWxlYXNlIHRoaXMgZWRpdG9yIGJhY2sgdG8gdGhlIG1hbmFnZXJcclxuXHRcdHRoaXMucmVsZWFzZUZyb21NYW5hZ2VyKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNhbmNlbENvbnRlbnRFZGl0KHRhcmdldEVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xyXG5cdFx0dGhpcy5pc0VkaXRpbmcgPSBmYWxzZTtcclxuXHRcdC8vIFJldmVydCBjaGFuZ2VzXHJcblx0XHRpZiAodGhpcy5vcmlnaW5hbFRhc2spIHtcclxuXHRcdFx0dGhpcy50YXNrLmNvbnRlbnQgPSB0aGlzLm9yaWdpbmFsVGFzay5jb250ZW50O1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENsZWFuIHVwIGVtYmVkZGVkIGVkaXRvclxyXG5cdFx0dGhpcy5jbGVhbnVwRWRpdG9ycygpO1xyXG5cclxuXHRcdC8vIE5vdGlmeSBwYXJlbnQgY29tcG9uZW50IHRvIHJlc3RvcmUgY29udGVudCBkaXNwbGF5XHJcblx0XHRpZiAodGhpcy5vcHRpb25zLm9uQ29udGVudEVkaXRGaW5pc2hlZCkge1xyXG5cdFx0XHR0aGlzLm9wdGlvbnMub25Db250ZW50RWRpdEZpbmlzaGVkKHRhcmdldEVsLCB0aGlzLnRhc2spO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gRmFsbGJhY2s6IGp1c3Qgc2V0IHRleHQgY29udGVudFxyXG5cdFx0XHR0YXJnZXRFbC50ZXh0Q29udGVudCA9IHRoaXMudGFzay5jb250ZW50O1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlbGVhc2UgdGhpcyBlZGl0b3IgYmFjayB0byB0aGUgbWFuYWdlclxyXG5cdFx0dGhpcy5yZWxlYXNlRnJvbU1hbmFnZXIoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgZmluaXNoTWV0YWRhdGFFZGl0KFxyXG5cdFx0dGFyZ2V0RWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0ZmllbGRUeXBlOiBzdHJpbmdcclxuXHQpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdC8vIFByZXZlbnQgbXVsdGlwbGUgY29uY3VycmVudCBzYXZlc1xyXG5cdFx0aWYgKHRoaXMuaXNTYXZpbmcpIHtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJTYXZlIGFscmVhZHkgaW4gcHJvZ3Jlc3MsIHdhaXRpbmcuLi5cIik7XHJcblx0XHRcdHdoaWxlICh0aGlzLmlzU2F2aW5nKSB7XHJcblx0XHRcdFx0YXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNTApKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFNhdmUgdGhlIHRhc2sgYW5kIHdhaXQgZm9yIGNvbXBsZXRpb25cclxuXHRcdGNvbnN0IHNhdmVTdWNjZXNzID0gYXdhaXQgdGhpcy5zYXZlVGFzaygpO1xyXG5cclxuXHRcdGlmICghc2F2ZVN1Y2Nlc3MpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBzYXZlIHRhc2sgbWV0YWRhdGEsIG5vdCBmaW5pc2hpbmcgZWRpdFwiKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENsZWFuIHVwIGVkaXRvcnMgZmlyc3RcclxuXHRcdHRoaXMuY2xlYW51cEVkaXRvcnMoKTtcclxuXHJcblx0XHQvLyBSZXNldCBlZGl0aW5nIHN0YXRlXHJcblx0XHR0aGlzLmlzRWRpdGluZyA9IGZhbHNlO1xyXG5cdFx0dGhpcy5vcmlnaW5hbFRhc2sgPSBudWxsO1xyXG5cclxuXHRcdC8vIFJlc3RvcmUgdGhlIG1ldGFkYXRhIGRpc3BsYXlcclxuXHRcdHRhcmdldEVsLmVtcHR5KCk7XHJcblx0XHR0aGlzLnJlc3RvcmVNZXRhZGF0YURpc3BsYXkodGFyZ2V0RWwsIGZpZWxkVHlwZSk7XHJcblxyXG5cdFx0Ly8gTm90aWZ5IHBhcmVudCBjb21wb25lbnQgYWJvdXQgbWV0YWRhdGEgZWRpdCBjb21wbGV0aW9uXHJcblx0XHRpZiAodGhpcy5vcHRpb25zLm9uTWV0YWRhdGFFZGl0RmluaXNoZWQpIHtcclxuXHRcdFx0dGhpcy5vcHRpb25zLm9uTWV0YWRhdGFFZGl0RmluaXNoZWQodGFyZ2V0RWwsIHRoaXMudGFzaywgZmllbGRUeXBlKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZWxlYXNlIHRoaXMgZWRpdG9yIGJhY2sgdG8gdGhlIG1hbmFnZXJcclxuXHRcdHRoaXMucmVsZWFzZUZyb21NYW5hZ2VyKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNhbmNlbE1ldGFkYXRhRWRpdCh0YXJnZXRFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdC8vIEdldCBmaWVsZCB0eXBlIGJlZm9yZSBjbGVhbnVwXHJcblx0XHRjb25zdCBmaWVsZFR5cGUgPSB0aGlzLmFjdGl2ZUlucHV0XHJcblx0XHRcdD8gKHRoaXMuYWN0aXZlSW5wdXQgYXMgYW55KS5fZmllbGRUeXBlXHJcblx0XHRcdDogbnVsbDtcclxuXHJcblx0XHQvLyBSZXZlcnQgY2hhbmdlc1xyXG5cdFx0aWYgKHRoaXMub3JpZ2luYWxUYXNrKSB7XHJcblx0XHRcdHRoaXMudGFzayA9IHtcclxuXHRcdFx0XHQuLi50aGlzLm9yaWdpbmFsVGFzayxcclxuXHRcdFx0XHRtZXRhZGF0YTogeyAuLi50aGlzLm9yaWdpbmFsVGFzay5tZXRhZGF0YSB9LFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENsZWFuIHVwIGVkaXRvcnMgZmlyc3RcclxuXHRcdHRoaXMuY2xlYW51cEVkaXRvcnMoKTtcclxuXHJcblx0XHQvLyBSZXNldCBlZGl0aW5nIHN0YXRlXHJcblx0XHR0aGlzLmlzRWRpdGluZyA9IGZhbHNlO1xyXG5cdFx0dGhpcy5vcmlnaW5hbFRhc2sgPSBudWxsO1xyXG5cclxuXHRcdC8vIFJlc3RvcmUgdGhlIG9yaWdpbmFsIG1ldGFkYXRhIGRpc3BsYXlcclxuXHRcdGlmIChmaWVsZFR5cGUpIHtcclxuXHRcdFx0dGFyZ2V0RWwuZW1wdHkoKTtcclxuXHRcdFx0dGhpcy5yZXN0b3JlTWV0YWRhdGFEaXNwbGF5KHRhcmdldEVsLCBmaWVsZFR5cGUpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIE5vdGlmeSBwYXJlbnQgY29tcG9uZW50IGFib3V0IG1ldGFkYXRhIGVkaXQgY29tcGxldGlvbiAoZXZlbiBpZiBjYW5jZWxsZWQpXHJcblx0XHRpZiAodGhpcy5vcHRpb25zLm9uTWV0YWRhdGFFZGl0RmluaXNoZWQgJiYgZmllbGRUeXBlKSB7XHJcblx0XHRcdHRoaXMub3B0aW9ucy5vbk1ldGFkYXRhRWRpdEZpbmlzaGVkKHRhcmdldEVsLCB0aGlzLnRhc2ssIGZpZWxkVHlwZSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUmVsZWFzZSB0aGlzIGVkaXRvciBiYWNrIHRvIHRoZSBtYW5hZ2VyXHJcblx0XHR0aGlzLnJlbGVhc2VGcm9tTWFuYWdlcigpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSByZXN0b3JlTWV0YWRhdGFEaXNwbGF5KFxyXG5cdFx0dGFyZ2V0RWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0ZmllbGRUeXBlOiBzdHJpbmdcclxuXHQpOiB2b2lkIHtcclxuXHRcdC8vIFJlc3RvcmUgdGhlIGFwcHJvcHJpYXRlIG1ldGFkYXRhIGRpc3BsYXkgYmFzZWQgb24gZmllbGQgdHlwZVxyXG5cdFx0c3dpdGNoIChmaWVsZFR5cGUpIHtcclxuXHRcdFx0Y2FzZSBcInByb2plY3RcIjpcclxuXHRcdFx0XHRpZiAodGhpcy50YXNrLm1ldGFkYXRhLnByb2plY3QpIHtcclxuXHRcdFx0XHRcdHRhcmdldEVsLnRleHRDb250ZW50ID1cclxuXHRcdFx0XHRcdFx0dGhpcy50YXNrLm1ldGFkYXRhLnByb2plY3Quc3BsaXQoXCIvXCIpLnBvcCgpIHx8XHJcblx0XHRcdFx0XHRcdHRoaXMudGFzay5tZXRhZGF0YS5wcm9qZWN0O1xyXG5cdFx0XHRcdFx0dGFyZ2V0RWwuY2xhc3NOYW1lID0gXCJ0YXNrLXByb2plY3RcIjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgXCJ0YWdzXCI6XHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0dGhpcy50YXNrLm1ldGFkYXRhLnRhZ3MgJiZcclxuXHRcdFx0XHRcdHRoaXMudGFzay5tZXRhZGF0YS50YWdzLmxlbmd0aCA+IDBcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdHRhcmdldEVsLmNsYXNzTmFtZSA9IFwidGFzay10YWdzLWNvbnRhaW5lclwiO1xyXG5cdFx0XHRcdFx0dGhpcy50YXNrLm1ldGFkYXRhLnRhZ3NcclxuXHRcdFx0XHRcdFx0LmZpbHRlcigodGFnKSA9PiAhdGFnLnN0YXJ0c1dpdGgoXCIjcHJvamVjdFwiKSlcclxuXHRcdFx0XHRcdFx0LmZvckVhY2goKHRhZykgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHRhZ0VsID0gdGFyZ2V0RWwuY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdFx0XHRcdFx0XHRcdGNsczogXCJ0YXNrLXRhZ1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dGV4dDogdGFnLnN0YXJ0c1dpdGgoXCIjXCIpID8gdGFnIDogYCMke3RhZ31gLFxyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgXCJjb250ZXh0XCI6XHJcblx0XHRcdFx0aWYgKHRoaXMudGFzay5tZXRhZGF0YS5jb250ZXh0KSB7XHJcblx0XHRcdFx0XHR0YXJnZXRFbC50ZXh0Q29udGVudCA9IHRoaXMudGFzay5tZXRhZGF0YS5jb250ZXh0O1xyXG5cdFx0XHRcdFx0dGFyZ2V0RWwuY2xhc3NOYW1lID0gXCJ0YXNrLWNvbnRleHRcIjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgXCJkdWVEYXRlXCI6XHJcblx0XHRcdGNhc2UgXCJzdGFydERhdGVcIjpcclxuXHRcdFx0Y2FzZSBcInNjaGVkdWxlZERhdGVcIjpcclxuXHRcdFx0Y2FzZSBcImNhbmNlbGxlZERhdGVcIjpcclxuXHRcdFx0Y2FzZSBcImNvbXBsZXRlZERhdGVcIjpcclxuXHRcdFx0XHRjb25zdCBkYXRlVmFsdWUgPSAodGhpcy50YXNrLm1ldGFkYXRhIGFzIFN0YW5kYXJkVGFza01ldGFkYXRhKVtcclxuXHRcdFx0XHRcdGZpZWxkVHlwZVxyXG5cdFx0XHRcdF0gYXMgbnVtYmVyO1xyXG5cdFx0XHRcdGlmIChkYXRlVmFsdWUpIHtcclxuXHRcdFx0XHRcdGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShkYXRlVmFsdWUpO1xyXG5cdFx0XHRcdFx0dGFyZ2V0RWwudGV4dENvbnRlbnQgPSBkYXRlLnRvTG9jYWxlRGF0ZVN0cmluZyhcImVuLVVTXCIsIHtcclxuXHRcdFx0XHRcdFx0eWVhcjogXCJudW1lcmljXCIsXHJcblx0XHRcdFx0XHRcdG1vbnRoOiBcImxvbmdcIixcclxuXHRcdFx0XHRcdFx0ZGF5OiBcIm51bWVyaWNcIixcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0dGFyZ2V0RWwuY2xhc3NOYW1lID0gYHRhc2stZGF0ZSB0YXNrLSR7ZmllbGRUeXBlfWA7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwicmVjdXJyZW5jZVwiOlxyXG5cdFx0XHRcdGlmICh0aGlzLnRhc2subWV0YWRhdGEucmVjdXJyZW5jZSkge1xyXG5cdFx0XHRcdFx0dGFyZ2V0RWwudGV4dENvbnRlbnQgPSB0aGlzLnRhc2subWV0YWRhdGEucmVjdXJyZW5jZTtcclxuXHRcdFx0XHRcdHRhcmdldEVsLmNsYXNzTmFtZSA9IFwidGFzay1kYXRlIHRhc2stcmVjdXJyZW5jZVwiO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBcInByaW9yaXR5XCI6XHJcblx0XHRcdFx0aWYgKHRoaXMudGFzay5tZXRhZGF0YS5wcmlvcml0eSkge1xyXG5cdFx0XHRcdFx0dGFyZ2V0RWwudGV4dENvbnRlbnQgPSBcIiFcIi5yZXBlYXQoXHJcblx0XHRcdFx0XHRcdHRoaXMudGFzay5tZXRhZGF0YS5wcmlvcml0eVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdGNvbnN0IHNhbml0aXplZFByaW9yaXR5ID0gc2FuaXRpemVQcmlvcml0eUZvckNsYXNzKFxyXG5cdFx0XHRcdFx0XHR0aGlzLnRhc2subWV0YWRhdGEucHJpb3JpdHlcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR0YXJnZXRFbC5jbGFzc05hbWUgPSBzYW5pdGl6ZWRQcmlvcml0eVxyXG5cdFx0XHRcdFx0XHQ/IGB0YXNrLXByaW9yaXR5IHByaW9yaXR5LSR7c2FuaXRpemVkUHJpb3JpdHl9YFxyXG5cdFx0XHRcdFx0XHQ6IFwidGFzay1wcmlvcml0eVwiO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBcIm9uQ29tcGxldGlvblwiOlxyXG5cdFx0XHRcdGlmICh0aGlzLnRhc2subWV0YWRhdGEub25Db21wbGV0aW9uKSB7XHJcblx0XHRcdFx0XHR0YXJnZXRFbC50ZXh0Q29udGVudCA9IHRoaXMudGFzay5tZXRhZGF0YS5vbkNvbXBsZXRpb247XHJcblx0XHRcdFx0XHR0YXJnZXRFbC5jbGFzc05hbWUgPSBcInRhc2stb25jb21wbGV0aW9uXCI7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwiZGVwZW5kc09uXCI6XHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0dGhpcy50YXNrLm1ldGFkYXRhLmRlcGVuZHNPbiAmJlxyXG5cdFx0XHRcdFx0dGhpcy50YXNrLm1ldGFkYXRhLmRlcGVuZHNPbi5sZW5ndGggPiAwXHJcblx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHR0YXJnZXRFbC50ZXh0Q29udGVudCA9XHJcblx0XHRcdFx0XHRcdHRoaXMudGFzay5tZXRhZGF0YS5kZXBlbmRzT24uam9pbihcIiwgXCIpO1xyXG5cdFx0XHRcdFx0dGFyZ2V0RWwuY2xhc3NOYW1lID0gXCJ0YXNrLWRlcGVuZHNvblwiO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBcImlkXCI6XHJcblx0XHRcdFx0aWYgKHRoaXMudGFzay5tZXRhZGF0YS5pZCkge1xyXG5cdFx0XHRcdFx0dGFyZ2V0RWwudGV4dENvbnRlbnQgPSB0aGlzLnRhc2subWV0YWRhdGEuaWQ7XHJcblx0XHRcdFx0XHR0YXJnZXRFbC5jbGFzc05hbWUgPSBcInRhc2staWRcIjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNsZWFudXBFZGl0b3JzKCk6IHZvaWQge1xyXG5cdFx0Ly8gQ2xlYW4gdXAgZW1iZWRkZWQgZWRpdG9yXHJcblx0XHRpZiAodGhpcy5lbWJlZGRlZEVkaXRvcikge1xyXG5cdFx0XHR0aGlzLmVtYmVkZGVkRWRpdG9yLmRlc3Ryb3koKTtcclxuXHRcdFx0dGhpcy5lbWJlZGRlZEVkaXRvciA9IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2xlYW4gdXAgYWN0aXZlIGlucHV0IGFuZCBzdWdnZXN0XHJcblx0XHRpZiAodGhpcy5hY3RpdmVTdWdnZXN0KSB7XHJcblx0XHRcdC8vIENsZWFuIHVwIHN1Z2dlc3QgaWYgaXQgaGFzIGEgY2xlYW51cCBtZXRob2RcclxuXHRcdFx0aWYgKHR5cGVvZiB0aGlzLmFjdGl2ZVN1Z2dlc3QuY2xvc2UgPT09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHRcdHRoaXMuYWN0aXZlU3VnZ2VzdC5jbG9zZSgpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHRoaXMuYWN0aXZlU3VnZ2VzdCA9IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5hY3RpdmVJbnB1dCA9IG51bGw7XHJcblx0XHR0aGlzLmNvbnRlbnRJbnB1dCA9IG51bGw7XHJcblxyXG5cdFx0Ly8gQ2xlYW4gdXAgZGVib3VuY2VkIHNhdmUgZnVuY3Rpb25cclxuXHRcdHRoaXMuZGVib3VuY2VkU2F2ZSA9IG51bGw7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgaXNDdXJyZW50bHlFZGl0aW5nKCk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIHRoaXMuaXNFZGl0aW5nO1xyXG5cdH1cclxuXHJcblx0cHVibGljIGdldFVwZGF0ZWRUYXNrKCk6IFRhc2sge1xyXG5cdFx0cmV0dXJuIHRoaXMudGFzaztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSB0aGUgdGFzayBhbmQgb3B0aW9ucyBmb3IgcmV1c2luZyB0aGlzIGVkaXRvciBpbnN0YW5jZVxyXG5cdCAqL1xyXG5cdHB1YmxpYyB1cGRhdGVUYXNrKHRhc2s6IFRhc2ssIG9wdGlvbnM6IElubGluZUVkaXRvck9wdGlvbnMpOiB2b2lkIHtcclxuXHRcdHRoaXMudGFzayA9IHRhc2s7XHJcblx0XHR0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xyXG5cdFx0dGhpcy5vcmlnaW5hbFRhc2sgPSBudWxsOyAvLyBSZXNldCBvcmlnaW5hbCB0YXNrXHJcblx0XHR0aGlzLmlzRWRpdGluZyA9IGZhbHNlO1xyXG5cdFx0dGhpcy5jbGVhbnVwRWRpdG9ycygpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVzZXQgdGhlIGVkaXRvciBzdGF0ZSBmb3IgcG9vbGluZ1xyXG5cdCAqL1xyXG5cdHB1YmxpYyByZXNldCgpOiB2b2lkIHtcclxuXHRcdHRoaXMuaXNFZGl0aW5nID0gZmFsc2U7XHJcblx0XHR0aGlzLm9yaWdpbmFsVGFzayA9IG51bGw7XHJcblx0XHR0aGlzLmlzU2F2aW5nID0gZmFsc2U7XHJcblx0XHR0aGlzLmNsZWFudXBFZGl0b3JzKCk7XHJcblx0XHQvLyBSZXNldCB0YXNrIHRvIGEgY2xlYW4gc3RhdGVcclxuXHRcdHRoaXMudGFzayA9IHt9IGFzIFRhc2s7XHJcblx0fVxyXG5cclxuXHRvbnVubG9hZCgpIHtcclxuXHRcdHRoaXMuY2xlYW51cEVkaXRvcnMoKTtcclxuXHJcblx0XHRpZiAodGhpcy5jb250YWluZXJFbCkge1xyXG5cdFx0XHR0aGlzLmNvbnRhaW5lckVsLnJlbW92ZSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVsZWFzZSB0aGlzIGVkaXRvciBiYWNrIHRvIHRoZSBtYW5hZ2VyXHJcblx0ICovXHJcblx0cHJpdmF0ZSByZWxlYXNlRnJvbU1hbmFnZXIoKTogdm9pZCB7XHJcblx0XHQvLyBSZXNldCBhbGwgZWRpdGluZyBzdGF0ZXMgdG8gZW5zdXJlIGNsZWFuIHN0YXRlIGZvciBuZXh0IHVzZVxyXG5cdFx0dGhpcy5pc0VkaXRpbmcgPSBmYWxzZTtcclxuXHRcdHRoaXMub3JpZ2luYWxUYXNrID0gbnVsbDtcclxuXHRcdHRoaXMuaXNTYXZpbmcgPSBmYWxzZTtcclxuXHJcblx0XHQvLyBUaGlzIHdpbGwgYmUgY2FsbGVkIGJ5IHRoZSBjb21wb25lbnQgdGhhdCBvd25zIHRoZSBlZGl0b3IgbWFuYWdlclxyXG5cdFx0Ly8gVGhlIGFjdHVhbCByZWxlYXNlIHRvIG1hbmFnZXIgd2lsbCBiZSBoYW5kbGVkIGJ5IHRoZSBjYWxsaW5nIGNvbXBvbmVudFxyXG5cdH1cclxufVxyXG4iXX0=