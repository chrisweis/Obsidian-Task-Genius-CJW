import { __awaiter } from "tslib";
import { Setting, } from "obsidian";
import { createEmbeddableMarkdownEditor, } from "@/editor-extensions/core/markdown-editor";
import { FileSuggest } from "@/components/ui/inputs/AutoComplete";
import { t } from "@/translations/helper";
import { MarkdownRendererComponent } from "@/components/ui/renderers/MarkdownRenderer";
import { StatusComponent } from "@/components/ui/feedback/StatusIndicator";
import { ContextSuggest, ProjectSuggest, } from "@/components/ui/inputs/AutoComplete";
import { TimeParsingService, DEFAULT_TIME_PARSING_CONFIG, } from "@/services/time-parsing-service";
import { BaseQuickCaptureModal, } from "./BaseQuickCaptureModal";
import { FileNameInput } from "../components/FileNameInput";
const LAST_USED_MODE_KEY = "task-genius.lastUsedQuickCaptureMode";
/**
 * Enhanced Quick Capture Modal extending the base class
 */
export class QuickCaptureModal extends BaseQuickCaptureModal {
    constructor(app, plugin, metadata, useFullFeaturedMode = false) {
        // Determine initial mode from local storage, default to checkbox
        let initialMode = "checkbox";
        try {
            const stored = app.loadLocalStorage(LAST_USED_MODE_KEY);
            if (stored === "checkbox" || stored === "file")
                initialMode = stored;
        }
        catch (_a) { }
        super(app, plugin, initialMode, metadata);
        // Full mode specific elements
        this.previewContainerEl = null;
        this.previewMarkdownEl = null;
        this.previewPlainEl = null;
        this.markdownRenderer = null;
        this.universalSuggest = null;
        // File name input for file creation mode
        this.fileNameInput = null;
        // UI element references
        this.targetSectionContainer = null;
        this.configPanel = null;
        this.metadataContainer = null;
        // Initialize time parsing service
        this.timeParsingService = new TimeParsingService(this.plugin.settings.timeParsing || DEFAULT_TIME_PARSING_CONFIG);
    }
    /**
     * Initialize components after UI creation
     */
    initializeComponents() {
        // Setup markdown editor only if not already initialized
        if (this.contentContainer && !this.markdownEditor) {
            const editorContainer = this.contentContainer.querySelector(".quick-capture-modal-editor");
            if (editorContainer) {
                this.setupMarkdownEditor(editorContainer);
            }
            // Enable universal suggest after editor is created
            setTimeout(() => {
                var _a, _b;
                if ((_b = (_a = this.markdownEditor) === null || _a === void 0 ? void 0 : _a.editor) === null || _b === void 0 ? void 0 : _b.editor) {
                    this.universalSuggest =
                        this.suggestManager.enableForQuickCaptureModal(this.markdownEditor.editor.editor);
                    this.universalSuggest.enable();
                }
            }, 100);
        }
        // Restore content if switching modes
        if (this.markdownEditor && this.capturedContent) {
            this.markdownEditor.set(this.capturedContent, false);
        }
    }
    /**
     * Create UI - consistent layout for both modes
     */
    createUI() {
        if (!this.contentContainer)
            return;
        // Create a layout container with two panels
        const layoutContainer = this.contentContainer.createDiv({
            cls: "quick-capture-layout",
        });
        // Create left panel for configuration
        const configPanel = layoutContainer.createDiv({
            cls: "quick-capture-config-panel",
        });
        // Create right panel for editor
        const editorPanel = layoutContainer.createDiv({
            cls: "quick-capture-editor-panel",
        });
        // Store config panel reference for updating
        this.configPanel = configPanel;
        // Create target section (will be updated based on mode)
        this.createTargetSection(configPanel);
        // Task metadata configuration (always shown)
        this.metadataContainer = configPanel.createDiv({
            cls: "quick-capture-metadata-container",
        });
        this.createTaskMetadataConfig(this.metadataContainer);
        // Create editor in right panel
        editorPanel.createDiv({
            text: this.currentMode === "file"
                ? t("File Content")
                : t("Task Content"),
            cls: "quick-capture-section-title",
        });
        const editorContainer = editorPanel.createDiv({
            cls: "quick-capture-modal-editor",
        });
        // Preview container (available for both modes)
        this.previewContainerEl = editorPanel.createDiv({
            cls: "preview-container",
        });
        // Create separate containers for markdown (checkbox mode) and plain text (file mode)
        this.previewMarkdownEl = this.previewContainerEl.createDiv({
            cls: "preview-markdown",
        });
        this.previewPlainEl = this.previewContainerEl.createEl("pre", {
            cls: "preview-plain tg-file-preview",
        });
        // Only instantiate MarkdownRenderer in checkbox mode
        if (this.currentMode === "checkbox") {
            this.markdownRenderer = new MarkdownRendererComponent(this.app, this.previewMarkdownEl, "", false);
        }
        // Set initial visibility based on mode
        if (this.previewMarkdownEl && this.previewPlainEl) {
            this.previewMarkdownEl.style.display =
                this.currentMode === "checkbox" ? "block" : "none";
            this.previewPlainEl.style.display =
                this.currentMode === "checkbox" ? "none" : "block";
        }
    }
    /**
     * Create target section that will be updated based on mode
     */
    createTargetSection(container) {
        this.targetSectionContainer = container.createDiv({
            cls: "quick-capture-target-container",
        });
        // Initial display based on current mode
        this.updateTargetDisplay();
    }
    /**
     * Update target display based on current mode
     */
    updateTargetDisplay() {
        var _a;
        if (!this.targetSectionContainer)
            return;
        // Clear existing content
        this.targetSectionContainer.empty();
        if (this.currentMode === "checkbox") {
            // Checkbox mode: "Capture to: [target file]"
            this.createTargetFileSelector(this.targetSectionContainer);
        }
        else {
            // File mode: "Capture as: [file name input]"
            this.createFileNameSelector(this.targetSectionContainer);
        }
        // Update metadata section visibility
        if (this.metadataContainer) {
            this.metadataContainer.style.display = "block";
            if (this.metadataContainer.children.length === 0) {
                this.createTaskMetadataConfig(this.metadataContainer);
            }
        }
        // Update editor title
        const editorTitle = (_a = this.contentContainer) === null || _a === void 0 ? void 0 : _a.querySelector(".quick-capture-section-title");
        if (editorTitle) {
            editorTitle.setText(this.currentMode === "file"
                ? t("File Content")
                : t("Task Content"));
        }
        // Update preview visibility by toggling child containers
        if (this.previewMarkdownEl && this.previewPlainEl) {
            this.previewMarkdownEl.style.display =
                this.currentMode === "checkbox" ? "block" : "none";
            this.previewPlainEl.style.display =
                this.currentMode === "checkbox" ? "none" : "block";
        }
        // Ensure preview refresh after switching mode/target
        this.updatePreview();
    }
    /**
     * Create file name selector for file mode
     */
    createFileNameSelector(container) {
        var _a;
        const fileNameContainer = container;
        fileNameContainer.createDiv({
            text: t("Capture as:"),
            cls: "quick-capture-section-title",
        });
        // Destroy previous file name input if exists
        if (this.fileNameInput) {
            this.fileNameInput.destroy();
            this.fileNameInput = null;
        }
        // Create new file name input
        this.fileNameInput = new FileNameInput(this.app, fileNameContainer, {
            placeholder: t("Enter file name..."),
            defaultValue: this.plugin.settings.quickCapture.defaultFileNameTemplate ||
                "{{DATE:YYYY-MM-DD}} - ",
            currentFolder: (_a = this.plugin.settings.quickCapture.createFileMode) === null || _a === void 0 ? void 0 : _a.defaultFolder,
            onChange: (value) => {
                this.taskMetadata.customFileName = value;
            },
        });
        // Set initial value if exists
        if (this.taskMetadata.customFileName) {
            this.fileNameInput.setValue(this.taskMetadata.customFileName);
        }
    }
    /**
     * Create target file selector
     */
    createTargetFileSelector(container) {
        const targetFileContainer = container.createDiv({
            cls: "quick-capture-target-container",
        });
        targetFileContainer.createDiv({
            text: t("Capture to:"),
            cls: "quick-capture-section-title",
        });
        const targetFileEl = targetFileContainer.createEl("div", {
            cls: "quick-capture-target",
            attr: {
                contenteditable: this.plugin.settings.quickCapture.targetType === "fixed"
                    ? "true"
                    : "false",
                spellcheck: "false",
            },
            text: this.tempTargetFilePath,
        });
        // Only add file suggest for fixed file type
        if (this.plugin.settings.quickCapture.targetType === "fixed") {
            new FileSuggest(this.app, targetFileEl, this.plugin.settings.quickCapture, (file) => {
                var _a, _b;
                targetFileEl.textContent = file.path;
                this.tempTargetFilePath = file.path;
                (_b = (_a = this.markdownEditor) === null || _a === void 0 ? void 0 : _a.editor) === null || _b === void 0 ? void 0 : _b.focus();
            });
        }
    }
    /**
     * Create task metadata configuration
     */
    createTaskMetadataConfig(container) {
        container.createDiv({
            text: t("Task Properties"),
            cls: "quick-capture-section-title",
        });
        // Status component
        const statusComponent = new StatusComponent(this.plugin, container, {
            status: this.taskMetadata.status,
        }, {
            type: "quick-capture",
            onTaskStatusSelected: (status) => {
                this.taskMetadata.status = status;
                this.updatePreview();
            },
        });
        statusComponent.load();
        // Date inputs
        this.createDateInputs(container);
        // Priority selector
        this.createPrioritySelector(container);
        // Project input
        this.createProjectInput(container);
        // Context input
        this.createContextInput(container);
        // Recurrence input
        this.createRecurrenceInput(container);
    }
    /**
     * Create date inputs
     */
    createDateInputs(container) {
        // Start Date
        new Setting(container).setName(t("Start Date")).addText((text) => {
            text.setPlaceholder("YYYY-MM-DD")
                .setValue(this.taskMetadata.startDate
                ? this.formatDate(this.taskMetadata.startDate)
                : "")
                .onChange((value) => {
                if (value) {
                    this.taskMetadata.startDate = this.parseDate(value);
                    this.markAsManuallySet("startDate");
                }
                else {
                    this.taskMetadata.startDate = undefined;
                    if (this.taskMetadata.manuallySet) {
                        this.taskMetadata.manuallySet.startDate = false;
                    }
                }
                this.updatePreview();
            });
            text.inputEl.type = "date";
            this.startDateInput = text.inputEl;
        });
        // Due Date
        new Setting(container).setName(t("Due Date")).addText((text) => {
            text.setPlaceholder("YYYY-MM-DD")
                .setValue(this.taskMetadata.dueDate
                ? this.formatDate(this.taskMetadata.dueDate)
                : "")
                .onChange((value) => {
                if (value) {
                    this.taskMetadata.dueDate = this.parseDate(value);
                    this.markAsManuallySet("dueDate");
                }
                else {
                    this.taskMetadata.dueDate = undefined;
                    if (this.taskMetadata.manuallySet) {
                        this.taskMetadata.manuallySet.dueDate = false;
                    }
                }
                this.updatePreview();
            });
            text.inputEl.type = "date";
            this.dueDateInput = text.inputEl;
        });
        // Scheduled Date
        new Setting(container).setName(t("Scheduled Date")).addText((text) => {
            text.setPlaceholder("YYYY-MM-DD")
                .setValue(this.taskMetadata.scheduledDate
                ? this.formatDate(this.taskMetadata.scheduledDate)
                : "")
                .onChange((value) => {
                if (value) {
                    this.taskMetadata.scheduledDate = this.parseDate(value);
                    this.markAsManuallySet("scheduledDate");
                }
                else {
                    this.taskMetadata.scheduledDate = undefined;
                    if (this.taskMetadata.manuallySet) {
                        this.taskMetadata.manuallySet.scheduledDate = false;
                    }
                }
                this.updatePreview();
            });
            text.inputEl.type = "date";
            this.scheduledDateInput = text.inputEl;
        });
    }
    /**
     * Create priority selector
     */
    createPrioritySelector(container) {
        new Setting(container)
            .setName(t("Priority"))
            .addDropdown((dropdown) => {
            var _a;
            dropdown
                .addOption("", t("None"))
                .addOption("5", t("Highest"))
                .addOption("4", t("High"))
                .addOption("3", t("Medium"))
                .addOption("2", t("Low"))
                .addOption("1", t("Lowest"))
                .setValue(((_a = this.taskMetadata.priority) === null || _a === void 0 ? void 0 : _a.toString()) || "")
                .onChange((value) => {
                this.taskMetadata.priority = value
                    ? parseInt(value)
                    : undefined;
                this.updatePreview();
            });
        });
    }
    /**
     * Create project input
     */
    createProjectInput(container) {
        new Setting(container).setName(t("Project")).addText((text) => {
            new ProjectSuggest(this.app, text.inputEl, this.plugin);
            text.setPlaceholder(t("Project name"))
                .setValue(this.taskMetadata.project || "")
                .onChange((value) => {
                this.taskMetadata.project = value || undefined;
                this.updatePreview();
            });
        });
    }
    /**
     * Create context input
     */
    createContextInput(container) {
        new Setting(container).setName(t("Context")).addText((text) => {
            new ContextSuggest(this.app, text.inputEl, this.plugin);
            text.setPlaceholder(t("Context"))
                .setValue(this.taskMetadata.context || "")
                .onChange((value) => {
                this.taskMetadata.context = value || undefined;
                this.updatePreview();
            });
        });
    }
    /**
     * Create recurrence input
     */
    createRecurrenceInput(container) {
        new Setting(container).setName(t("Recurrence")).addText((text) => {
            text.setPlaceholder(t("e.g., every day, every week"))
                .setValue(this.taskMetadata.recurrence || "")
                .onChange((value) => {
                this.taskMetadata.recurrence = value || undefined;
                this.updatePreview();
            });
        });
    }
    /**
     * Setup markdown editor
     */
    setupMarkdownEditor(container) {
        setTimeout(() => {
            var _a, _b;
            this.markdownEditor = createEmbeddableMarkdownEditor(this.app, container, {
                placeholder: this.plugin.settings.quickCapture.placeholder,
                singleLine: this.currentMode === "checkbox",
                onEnter: (editor, mod, shift) => {
                    if (mod) {
                        this.handleSubmit();
                        return true;
                    }
                    // In checkbox mode, Enter submits
                    if (this.currentMode === "checkbox") {
                        this.handleSubmit();
                        return true;
                    }
                    return false;
                },
                onEscape: (editor) => {
                    this.close();
                },
                onSubmit: (editor) => {
                    this.handleSubmit();
                },
                onChange: (update) => {
                    var _a;
                    this.capturedContent = ((_a = this.markdownEditor) === null || _a === void 0 ? void 0 : _a.value) || "";
                    // Clear previous debounce timer
                    if (this.parseDebounceTimer) {
                        clearTimeout(this.parseDebounceTimer);
                    }
                    // Debounce time parsing for both modes
                    this.parseDebounceTimer = window.setTimeout(() => {
                        this.performRealTimeParsing();
                    }, 300);
                    // Update preview in both modes
                    this.updatePreview();
                },
            });
            // Focus the editor
            (_b = (_a = this.markdownEditor) === null || _a === void 0 ? void 0 : _a.editor) === null || _b === void 0 ? void 0 : _b.focus();
            // Restore content if exists
            if (this.capturedContent && this.markdownEditor) {
                this.markdownEditor.set(this.capturedContent, false);
            }
        }, 50);
    }
    /**
     * Update preview
     */
    updatePreview() {
        if (this.currentMode === "checkbox") {
            if (this.markdownRenderer) {
                this.markdownRenderer.render(this.processContentWithMetadata(this.capturedContent));
            }
        }
        else {
            if (this.previewPlainEl) {
                const snapshot = this.capturedContent;
                void this.computeFileModePreviewContent(snapshot).then((finalContent) => {
                    if (this.previewPlainEl &&
                        this.capturedContent === snapshot) {
                        this.previewPlainEl.textContent = finalContent;
                    }
                });
            }
        }
    }
    /**
     * Build preview content for file mode by mirroring saveContent's file-mode processing
     */
    computeFileModePreviewContent(content) {
        return __awaiter(this, void 0, void 0, function* () {
            const processedContent = this.processContentWithMetadata(content);
            return this.buildFileModeContent(content, processedContent, {
                preview: true,
            });
        });
    }
    /**
     * Process content with metadata
     */
    processContentWithMetadata(content) {
        var _a;
        // For file mode, just return content as-is
        if (this.currentMode === "file") {
            return content;
        }
        // Split content into lines
        const lines = content.split("\n");
        const processedLines = [];
        for (const line of lines) {
            if (!line.trim()) {
                processedLines.push(line);
                continue;
            }
            // Parse time expressions for this line
            const lineParseResult = this.timeParsingService.parseTimeExpressionsForLine(line);
            const cleanedLine = lineParseResult.cleanedLine;
            // Check for indentation
            const indentMatch = line.match(/^(\s+)/);
            const isSubTask = indentMatch && indentMatch[1].length > 0;
            // Check if line is already a task or list item
            const isTaskOrList = cleanedLine
                .trim()
                .match(/^(-|\d+\.|\*|\+)(\s+\[[^\]\[]+\])?/);
            if (isSubTask) {
                // Don't add metadata to sub-tasks
                const originalIndent = indentMatch[1];
                processedLines.push(originalIndent +
                    this.cleanTemporaryMarks(cleanedLine.trim()));
            }
            else if (isTaskOrList) {
                // Process as task
                if (cleanedLine.trim().match(/^(-|\d+\.|\*|\+)\s+\[[^\]]+\]/)) {
                    processedLines.push(this.addLineMetadataToTask(cleanedLine, lineParseResult));
                }
                else {
                    // Convert to task
                    const listPrefix = (_a = cleanedLine
                        .trim()
                        .match(/^(-|\d+\.|\*|\+)/)) === null || _a === void 0 ? void 0 : _a[0];
                    const restOfLine = this.cleanTemporaryMarks(cleanedLine
                        .trim()
                        .substring((listPrefix === null || listPrefix === void 0 ? void 0 : listPrefix.length) || 0)
                        .trim());
                    const statusMark = this.taskMetadata.status || " ";
                    const taskLine = `${listPrefix} [${statusMark}] ${restOfLine}`;
                    processedLines.push(this.addLineMetadataToTask(taskLine, lineParseResult));
                }
            }
            else {
                // Convert to task
                const statusMark = this.taskMetadata.status || " ";
                const cleanedContent = this.cleanTemporaryMarks(cleanedLine);
                const taskLine = `- [${statusMark}] ${cleanedContent}`;
                processedLines.push(this.addLineMetadataToTask(taskLine, lineParseResult));
            }
        }
        return processedLines.join("\n");
    }
    /**
     * Add line metadata to task
     */
    addLineMetadataToTask(taskLine, lineParseResult) {
        const metadata = this.generateLineMetadata(lineParseResult);
        if (!metadata)
            return taskLine;
        return `${taskLine} ${metadata}`.trim();
    }
    /**
     * Generate line metadata
     */
    generateLineMetadata(lineParseResult) {
        var _a, _b;
        const metadata = [];
        const useDataviewFormat = this.preferMetadataFormat === "dataview";
        // Use line-specific dates first, fall back to global metadata
        const startDate = lineParseResult.startDate || this.taskMetadata.startDate;
        const dueDate = lineParseResult.dueDate || this.taskMetadata.dueDate;
        const scheduledDate = lineParseResult.scheduledDate || this.taskMetadata.scheduledDate;
        // Add dates
        if (startDate) {
            const formattedDate = this.formatDate(startDate);
            metadata.push(useDataviewFormat
                ? `[start:: ${formattedDate}]`
                : `🛫 ${formattedDate}`);
        }
        if (dueDate) {
            const formattedDate = this.formatDate(dueDate);
            metadata.push(useDataviewFormat
                ? `[due:: ${formattedDate}]`
                : `📅 ${formattedDate}`);
        }
        if (scheduledDate) {
            const formattedDate = this.formatDate(scheduledDate);
            metadata.push(useDataviewFormat
                ? `[scheduled:: ${formattedDate}]`
                : `⏳ ${formattedDate}`);
        }
        // Add priority
        if (this.taskMetadata.priority) {
            if (useDataviewFormat) {
                const priorityMap = {
                    5: "highest",
                    4: "high",
                    3: "medium",
                    2: "low",
                    1: "lowest",
                };
                metadata.push(`[priority:: ${priorityMap[this.taskMetadata.priority]}]`);
            }
            else {
                const priorityIcons = ["⏬", "🔽", "🔼", "⏫", "🔺"];
                metadata.push(priorityIcons[this.taskMetadata.priority - 1]);
            }
        }
        // Add project
        if (this.taskMetadata.project) {
            const projectPrefix = ((_a = this.plugin.settings.projectTagPrefix) === null || _a === void 0 ? void 0 : _a[this.plugin.settings.preferMetadataFormat]) || "project";
            metadata.push(useDataviewFormat
                ? `[${projectPrefix}:: ${this.taskMetadata.project}]`
                : `#${projectPrefix}/${this.taskMetadata.project}`);
        }
        // Add context
        if (this.taskMetadata.context) {
            const contextPrefix = ((_b = this.plugin.settings.contextTagPrefix) === null || _b === void 0 ? void 0 : _b[this.plugin.settings.preferMetadataFormat]) || "@";
            metadata.push(useDataviewFormat
                ? `[context:: ${this.taskMetadata.context}]`
                : `${contextPrefix}${this.taskMetadata.context}`);
        }
        // Add recurrence
        if (this.taskMetadata.recurrence) {
            metadata.push(useDataviewFormat
                ? `[repeat:: ${this.taskMetadata.recurrence}]`
                : `🔁 ${this.taskMetadata.recurrence}`);
        }
        return metadata.join(" ");
    }
    /**
     * Clean temporary marks
     */
    cleanTemporaryMarks(content) {
        let cleaned = content;
        cleaned = cleaned.replace(/\s*!\s*/g, " ");
        cleaned = cleaned.replace(/\s*~\s*/g, " ");
        cleaned = cleaned.replace(/\s*[🔺⏫🔼🔽⏬️]\s*/g, " ");
        cleaned = cleaned.replace(/\s*[📅🛫⏳✅➕❌]\s*/g, " ");
        cleaned = cleaned.replace(/\s*[📁🏠🏢🏪🏫🏬🏭🏯🏰]\s*/g, " ");
        cleaned = cleaned.replace(/\s*[🆔⛔🏁🔁]\s*/g, " ");
        cleaned = cleaned.replace(/\s*@\w*\s*/g, " ");
        cleaned = cleaned.replace(/\s*target:\s*/gi, " ");
        cleaned = cleaned.replace(/\s+/g, " ").trim();
        return cleaned;
    }
    /**
     * Perform real-time parsing
     */
    performRealTimeParsing() {
        if (!this.capturedContent)
            return;
        const lines = this.capturedContent.split("\n");
        const lineParseResults = this.timeParsingService.parseTimeExpressionsPerLine(lines);
        // Aggregate dates from all lines
        let aggregatedStartDate;
        let aggregatedDueDate;
        let aggregatedScheduledDate;
        for (const lineResult of lineParseResults) {
            if (lineResult.startDate && !aggregatedStartDate) {
                aggregatedStartDate = lineResult.startDate;
            }
            if (lineResult.dueDate && !aggregatedDueDate) {
                aggregatedDueDate = lineResult.dueDate;
            }
            if (lineResult.scheduledDate && !aggregatedScheduledDate) {
                aggregatedScheduledDate = lineResult.scheduledDate;
            }
        }
        // Update metadata (only if not manually set)
        if (aggregatedStartDate && !this.isManuallySet("startDate")) {
            this.taskMetadata.startDate = aggregatedStartDate;
            if (this.startDateInput) {
                this.startDateInput.value =
                    this.formatDate(aggregatedStartDate);
            }
        }
        if (aggregatedDueDate && !this.isManuallySet("dueDate")) {
            this.taskMetadata.dueDate = aggregatedDueDate;
            if (this.dueDateInput) {
                this.dueDateInput.value = this.formatDate(aggregatedDueDate);
            }
        }
        if (aggregatedScheduledDate && !this.isManuallySet("scheduledDate")) {
            this.taskMetadata.scheduledDate = aggregatedScheduledDate;
            if (this.scheduledDateInput) {
                this.scheduledDateInput.value = this.formatDate(aggregatedScheduledDate);
            }
        }
    }
    /**
     * Check if metadata field was manually set
     */
    isManuallySet(field) {
        var _a;
        return ((_a = this.taskMetadata.manuallySet) === null || _a === void 0 ? void 0 : _a[field]) || false;
    }
    /**
     * Mark metadata field as manually set
     */
    markAsManuallySet(field) {
        if (!this.taskMetadata.manuallySet) {
            this.taskMetadata.manuallySet = {};
        }
        this.taskMetadata.manuallySet[field] = true;
    }
    /**
     * Reset UI elements
     */
    resetUIElements() {
        // Reset date inputs
        if (this.startDateInput)
            this.startDateInput.value = "";
        if (this.dueDateInput)
            this.dueDateInput.value = "";
        if (this.scheduledDateInput)
            this.scheduledDateInput.value = "";
        // Clear file name input
        if (this.fileNameInput) {
            this.fileNameInput.clear();
        }
        // Clear preview
        if (this.previewContainerEl) {
            this.previewContainerEl.empty();
        }
    }
    /**
     * Called when modal is closed
     */
    onClose() {
        // Save last used mode if enabled
        if (this.plugin.settings.quickCapture.rememberLastMode) {
            this.plugin.settings.quickCapture.lastUsedMode = this.currentMode;
            this.plugin.saveSettings();
        }
        // Clean up
        if (this.universalSuggest) {
            this.universalSuggest.disable();
            this.universalSuggest = null;
        }
        if (this.parseDebounceTimer) {
            clearTimeout(this.parseDebounceTimer);
        }
        if (this.markdownRenderer) {
            this.markdownRenderer.unload();
            this.markdownRenderer = null;
        }
        if (this.fileNameInput) {
            this.fileNameInput.destroy();
            this.fileNameInput = null;
        }
        super.onClose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUXVpY2tDYXB0dXJlTW9kYWxXaXRoU3dpdGNoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiUXVpY2tDYXB0dXJlTW9kYWxXaXRoU3dpdGNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBRU4sT0FBTyxHQU1QLE1BQU0sVUFBVSxDQUFDO0FBQ2xCLE9BQU8sRUFDTiw4QkFBOEIsR0FFOUIsTUFBTSwwQ0FBMEMsQ0FBQztBQUVsRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEUsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzFDLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUUzRSxPQUFPLEVBQ04sY0FBYyxFQUNkLGNBQWMsR0FDZCxNQUFNLHFDQUFxQyxDQUFDO0FBQzdDLE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsMkJBQTJCLEdBRTNCLE1BQU0saUNBQWlDLENBQUM7QUFFekMsT0FBTyxFQUNOLHFCQUFxQixHQUdyQixNQUFNLHlCQUF5QixDQUFDO0FBQ2pDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUU1RCxNQUFNLGtCQUFrQixHQUFHLHNDQUFzQyxDQUFDO0FBRWxFOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGlCQUFrQixTQUFRLHFCQUFxQjtJQXlCM0QsWUFDQyxHQUFRLEVBQ1IsTUFBNkIsRUFDN0IsUUFBdUIsRUFDdkIsc0JBQStCLEtBQUs7UUFFcEMsaUVBQWlFO1FBQ2pFLElBQUksV0FBVyxHQUFxQixVQUFVLENBQUM7UUFDL0MsSUFBSTtZQUNILE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBa0IsQ0FBQztZQUN6RSxJQUFJLE1BQU0sS0FBSyxVQUFVLElBQUksTUFBTSxLQUFLLE1BQU07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QUVEOztPQUVHO0lBQ0gsT0FBTztRQUNOLGlDQUFpQztRQUNqQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRTtZQUN2RCxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7WUFDbEUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztTQUMzQjtRQUVELFdBQVc7UUFDWCxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtZQUMxQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDaEMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQztTQUM3QjtRQUVELElBQUksSUFBSSxDQUFDLGtCQUFrQixFQUFFO1lBQzVCLFlBQVksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztTQUN0QztRQUVELElBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFO1lBQzFCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO1NBQzdCO1FBRUQsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFO1lBQ3ZCLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7U0FDMUI7UUFFRCxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDakIsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcclxuXHRBcHAsXHJcblx0U2V0dGluZyxcclxuXHRURmlsZSxcclxuXHROb3RpY2UsXHJcblx0UGxhdGZvcm0sXHJcblx0TWFya2Rvd25SZW5kZXJlcixcclxuXHRtb21lbnQsXHJcbn0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7XHJcblx0Y3JlYXRlRW1iZWRkYWJsZU1hcmtkb3duRWRpdG9yLFxyXG5cdEVtYmVkZGFibGVNYXJrZG93bkVkaXRvcixcclxufSBmcm9tIFwiQC9lZGl0b3ItZXh0ZW5zaW9ucy9jb3JlL21hcmtkb3duLWVkaXRvclwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7IEZpbGVTdWdnZXN0IH0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9pbnB1dHMvQXV0b0NvbXBsZXRlXCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCB7IE1hcmtkb3duUmVuZGVyZXJDb21wb25lbnQgfSBmcm9tIFwiQC9jb21wb25lbnRzL3VpL3JlbmRlcmVycy9NYXJrZG93blJlbmRlcmVyXCI7XHJcbmltcG9ydCB7IFN0YXR1c0NvbXBvbmVudCB9IGZyb20gXCJAL2NvbXBvbmVudHMvdWkvZmVlZGJhY2svU3RhdHVzSW5kaWNhdG9yXCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiQC90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7XHJcblx0Q29udGV4dFN1Z2dlc3QsXHJcblx0UHJvamVjdFN1Z2dlc3QsXHJcbn0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9pbnB1dHMvQXV0b0NvbXBsZXRlXCI7XHJcbmltcG9ydCB7XHJcblx0VGltZVBhcnNpbmdTZXJ2aWNlLFxyXG5cdERFRkFVTFRfVElNRV9QQVJTSU5HX0NPTkZJRyxcclxuXHRMaW5lUGFyc2VSZXN1bHQsXHJcbn0gZnJvbSBcIkAvc2VydmljZXMvdGltZS1wYXJzaW5nLXNlcnZpY2VcIjtcclxuaW1wb3J0IHsgVW5pdmVyc2FsRWRpdG9yU3VnZ2VzdCB9IGZyb20gXCJAL2NvbXBvbmVudHMvdWkvc3VnZ2VzdFwiO1xyXG5pbXBvcnQge1xyXG5cdEJhc2VRdWlja0NhcHR1cmVNb2RhbCxcclxuXHRRdWlja0NhcHR1cmVNb2RlLFxyXG5cdFRhc2tNZXRhZGF0YSxcclxufSBmcm9tIFwiLi9CYXNlUXVpY2tDYXB0dXJlTW9kYWxcIjtcclxuaW1wb3J0IHsgRmlsZU5hbWVJbnB1dCB9IGZyb20gXCIuLi9jb21wb25lbnRzL0ZpbGVOYW1lSW5wdXRcIjtcclxuXHJcbmNvbnN0IExBU1RfVVNFRF9NT0RFX0tFWSA9IFwidGFzay1nZW5pdXMubGFzdFVzZWRRdWlja0NhcHR1cmVNb2RlXCI7XHJcblxyXG4vKipcclxuICogRW5oYW5jZWQgUXVpY2sgQ2FwdHVyZSBNb2RhbCBleHRlbmRpbmcgdGhlIGJhc2UgY2xhc3NcclxuICovXHJcbmV4cG9ydCBjbGFzcyBRdWlja0NhcHR1cmVNb2RhbCBleHRlbmRzIEJhc2VRdWlja0NhcHR1cmVNb2RhbCB7XHJcblx0Ly8gRnVsbCBtb2RlIHNwZWNpZmljIGVsZW1lbnRzXHJcblx0cHJpdmF0ZSBwcmV2aWV3Q29udGFpbmVyRWw6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBwcmV2aWV3TWFya2Rvd25FbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIHByZXZpZXdQbGFpbkVsOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgbWFya2Rvd25SZW5kZXJlcjogTWFya2Rvd25SZW5kZXJlckNvbXBvbmVudCB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgdGltZVBhcnNpbmdTZXJ2aWNlOiBUaW1lUGFyc2luZ1NlcnZpY2U7XHJcblx0cHJpdmF0ZSB1bml2ZXJzYWxTdWdnZXN0OiBVbml2ZXJzYWxFZGl0b3JTdWdnZXN0IHwgbnVsbCA9IG51bGw7XHJcblxyXG5cdC8vIERhdGUgaW5wdXQgcmVmZXJlbmNlc1xyXG5cdHByaXZhdGUgc3RhcnREYXRlSW5wdXQ/OiBIVE1MSW5wdXRFbGVtZW50O1xyXG5cdHByaXZhdGUgZHVlRGF0ZUlucHV0PzogSFRNTElucHV0RWxlbWVudDtcclxuXHRwcml2YXRlIHNjaGVkdWxlZERhdGVJbnB1dD86IEhUTUxJbnB1dEVsZW1lbnQ7XHJcblxyXG5cdC8vIEZpbGUgbmFtZSBpbnB1dCBmb3IgZmlsZSBjcmVhdGlvbiBtb2RlXHJcblx0cHJpdmF0ZSBmaWxlTmFtZUlucHV0OiBGaWxlTmFtZUlucHV0IHwgbnVsbCA9IG51bGw7XHJcblxyXG5cdC8vIFVJIGVsZW1lbnQgcmVmZXJlbmNlc1xyXG5cdHByaXZhdGUgdGFyZ2V0U2VjdGlvbkNvbnRhaW5lcjogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIGNvbmZpZ1BhbmVsOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgbWV0YWRhdGFDb250YWluZXI6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcblxyXG5cdC8vIERlYm91bmNlIHRpbWVyIGZvciByZWFsLXRpbWUgcGFyc2luZ1xyXG5cdHByaXZhdGUgcGFyc2VEZWJvdW5jZVRpbWVyPzogbnVtYmVyO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdGFwcDogQXBwLFxyXG5cdFx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRtZXRhZGF0YT86IFRhc2tNZXRhZGF0YSxcclxuXHRcdHVzZUZ1bGxGZWF0dXJlZE1vZGU6IGJvb2xlYW4gPSBmYWxzZVxyXG5cdCkge1xyXG5cdFx0Ly8gRGV0ZXJtaW5lIGluaXRpYWwgbW9kZSBmcm9tIGxvY2FsIHN0b3JhZ2UsIGRlZmF1bHQgdG8gY2hlY2tib3hcclxuXHRcdGxldCBpbml0aWFsTW9kZTogUXVpY2tDYXB0dXJlTW9kZSA9IFwiY2hlY2tib3hcIjtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IHN0b3JlZCA9IGFwcC5sb2FkTG9jYWxTdG9yYWdlKExBU1RfVVNFRF9NT0RFX0tFWSkgYXMgc3RyaW5nIHwgbnVsbDtcclxuXHRcdFx0aWYgKHN0b3JlZCA9PT0gXCJjaGVja2JveFwiIHx8IHN0b3JlZCA9PT0gXCJmaWxlXCIpIGluaXRpYWxNb2RlID0gc3RvcmVkO1xyXG5cdFx0fSBjYXRjaCB7fVxyXG5cclxuXHRcdHN1cGVyKGFwcCwgcGx1Z2luLCBpbml0aWFsTW9kZSwgbWV0YWRhdGEpO1xyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgdGltZSBwYXJzaW5nIHNlcnZpY2VcclxuXHRcdHRoaXMudGltZVBhcnNpbmdTZXJ2aWNlID0gbmV3IFRpbWVQYXJzaW5nU2VydmljZShcclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MudGltZVBhcnNpbmcgfHwgREVGQVVMVF9USU1FX1BBUlNJTkdfQ09ORklHXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSW5pdGlhbGl6ZSBjb21wb25lbnRzIGFmdGVyIFVJIGNyZWF0aW9uXHJcblx0ICovXHJcblx0cHJvdGVjdGVkIGluaXRpYWxpemVDb21wb25lbnRzKCk6IHZvaWQge1xyXG5cdFx0Ly8gU2V0dXAgbWFya2Rvd24gZWRpdG9yIG9ubHkgaWYgbm90IGFscmVhZHkgaW5pdGlhbGl6ZWRcclxuXHRcdGlmICh0aGlzLmNvbnRlbnRDb250YWluZXIgJiYgIXRoaXMubWFya2Rvd25FZGl0b3IpIHtcclxuXHRcdFx0Y29uc3QgZWRpdG9yQ29udGFpbmVyID0gdGhpcy5jb250ZW50Q29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFx0XCIucXVpY2stY2FwdHVyZS1tb2RhbC1lZGl0b3JcIlxyXG5cdFx0XHQpIGFzIEhUTUxFbGVtZW50O1xyXG5cdFx0XHRpZiAoZWRpdG9yQ29udGFpbmVyKSB7XHJcblx0XHRcdFx0dGhpcy5zZXR1cE1hcmtkb3duRWRpdG9yKGVkaXRvckNvbnRhaW5lcik7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEVuYWJsZSB1bml2ZXJzYWwgc3VnZ2VzdCBhZnRlciBlZGl0b3IgaXMgY3JlYXRlZFxyXG5cdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRpZiAodGhpcy5tYXJrZG93bkVkaXRvcj8uZWRpdG9yPy5lZGl0b3IpIHtcclxuXHRcdFx0XHRcdHRoaXMudW5pdmVyc2FsU3VnZ2VzdCA9XHJcblx0XHRcdFx0XHRcdHRoaXMuc3VnZ2VzdE1hbmFnZXIuZW5hYmxlRm9yUXVpY2tDYXB0dXJlTW9kYWwoXHJcblx0XHRcdFx0XHRcdFx0dGhpcy5tYXJrZG93bkVkaXRvci5lZGl0b3IuZWRpdG9yXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR0aGlzLnVuaXZlcnNhbFN1Z2dlc3QuZW5hYmxlKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LCAxMDApO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlc3RvcmUgY29udGVudCBpZiBzd2l0Y2hpbmcgbW9kZXNcclxuXHRcdGlmICh0aGlzLm1hcmtkb3duRWRpdG9yICYmIHRoaXMuY2FwdHVyZWRDb250ZW50KSB7XHJcblx0XHRcdHRoaXMubWFya2Rvd25FZGl0b3Iuc2V0KHRoaXMuY2FwdHVyZWRDb250ZW50LCBmYWxzZSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDcmVhdGUgVUkgLSBjb25zaXN0ZW50IGxheW91dCBmb3IgYm90aCBtb2Rlc1xyXG5cdCAqL1xyXG5cdHByb3RlY3RlZCBjcmVhdGVVSSgpOiB2b2lkIHtcclxuXHRcdGlmICghdGhpcy5jb250ZW50Q29udGFpbmVyKSByZXR1cm47XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGEgbGF5b3V0IGNvbnRhaW5lciB3aXRoIHR3byBwYW5lbHNcclxuXHRcdGNvbnN0IGxheW91dENvbnRhaW5lciA9IHRoaXMuY29udGVudENvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwicXVpY2stY2FwdHVyZS1sYXlvdXRcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBsZWZ0IHBhbmVsIGZvciBjb25maWd1cmF0aW9uXHJcblx0XHRjb25zdCBjb25maWdQYW5lbCA9IGxheW91dENvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwicXVpY2stY2FwdHVyZS1jb25maWctcGFuZWxcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIENyZWF0ZSByaWdodCBwYW5lbCBmb3IgZWRpdG9yXHJcblx0XHRjb25zdCBlZGl0b3JQYW5lbCA9IGxheW91dENvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwicXVpY2stY2FwdHVyZS1lZGl0b3ItcGFuZWxcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFN0b3JlIGNvbmZpZyBwYW5lbCByZWZlcmVuY2UgZm9yIHVwZGF0aW5nXHJcblx0XHR0aGlzLmNvbmZpZ1BhbmVsID0gY29uZmlnUGFuZWw7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIHRhcmdldCBzZWN0aW9uICh3aWxsIGJlIHVwZGF0ZWQgYmFzZWQgb24gbW9kZSlcclxuXHRcdHRoaXMuY3JlYXRlVGFyZ2V0U2VjdGlvbihjb25maWdQYW5lbCk7XHJcblxyXG5cdFx0Ly8gVGFzayBtZXRhZGF0YSBjb25maWd1cmF0aW9uIChhbHdheXMgc2hvd24pXHJcblx0XHR0aGlzLm1ldGFkYXRhQ29udGFpbmVyID0gY29uZmlnUGFuZWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInF1aWNrLWNhcHR1cmUtbWV0YWRhdGEtY29udGFpbmVyXCIsXHJcblx0XHR9KTtcclxuXHRcdHRoaXMuY3JlYXRlVGFza01ldGFkYXRhQ29uZmlnKHRoaXMubWV0YWRhdGFDb250YWluZXIpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBlZGl0b3IgaW4gcmlnaHQgcGFuZWxcclxuXHRcdGVkaXRvclBhbmVsLmNyZWF0ZURpdih7XHJcblx0XHRcdHRleHQ6XHJcblx0XHRcdFx0dGhpcy5jdXJyZW50TW9kZSA9PT0gXCJmaWxlXCJcclxuXHRcdFx0XHRcdD8gdChcIkZpbGUgQ29udGVudFwiKVxyXG5cdFx0XHRcdFx0OiB0KFwiVGFzayBDb250ZW50XCIpLFxyXG5cdFx0XHRjbHM6IFwicXVpY2stY2FwdHVyZS1zZWN0aW9uLXRpdGxlXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCBlZGl0b3JDb250YWluZXIgPSBlZGl0b3JQYW5lbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwicXVpY2stY2FwdHVyZS1tb2RhbC1lZGl0b3JcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFByZXZpZXcgY29udGFpbmVyIChhdmFpbGFibGUgZm9yIGJvdGggbW9kZXMpXHJcblx0XHR0aGlzLnByZXZpZXdDb250YWluZXJFbCA9IGVkaXRvclBhbmVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJwcmV2aWV3LWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIHNlcGFyYXRlIGNvbnRhaW5lcnMgZm9yIG1hcmtkb3duIChjaGVja2JveCBtb2RlKSBhbmQgcGxhaW4gdGV4dCAoZmlsZSBtb2RlKVxyXG5cdFx0dGhpcy5wcmV2aWV3TWFya2Rvd25FbCA9IHRoaXMucHJldmlld0NvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJwcmV2aWV3LW1hcmtkb3duXCIsXHJcblx0XHR9KTtcclxuXHRcdHRoaXMucHJldmlld1BsYWluRWwgPSB0aGlzLnByZXZpZXdDb250YWluZXJFbC5jcmVhdGVFbChcInByZVwiLCB7XHJcblx0XHRcdGNsczogXCJwcmV2aWV3LXBsYWluIHRnLWZpbGUtcHJldmlld1wiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gT25seSBpbnN0YW50aWF0ZSBNYXJrZG93blJlbmRlcmVyIGluIGNoZWNrYm94IG1vZGVcclxuXHRcdGlmICh0aGlzLmN1cnJlbnRNb2RlID09PSBcImNoZWNrYm94XCIpIHtcclxuXHRcdFx0dGhpcy5tYXJrZG93blJlbmRlcmVyID0gbmV3IE1hcmtkb3duUmVuZGVyZXJDb21wb25lbnQoXHJcblx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0dGhpcy5wcmV2aWV3TWFya2Rvd25FbCxcclxuXHRcdFx0XHRcIlwiLFxyXG5cdFx0XHRcdGZhbHNlXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU2V0IGluaXRpYWwgdmlzaWJpbGl0eSBiYXNlZCBvbiBtb2RlXHJcblx0XHRpZiAodGhpcy5wcmV2aWV3TWFya2Rvd25FbCAmJiB0aGlzLnByZXZpZXdQbGFpbkVsKSB7XHJcblx0XHRcdHRoaXMucHJldmlld01hcmtkb3duRWwuc3R5bGUuZGlzcGxheSA9XHJcblx0XHRcdFx0dGhpcy5jdXJyZW50TW9kZSA9PT0gXCJjaGVja2JveFwiID8gXCJibG9ja1wiIDogXCJub25lXCI7XHJcblx0XHRcdHRoaXMucHJldmlld1BsYWluRWwuc3R5bGUuZGlzcGxheSA9XHJcblx0XHRcdFx0dGhpcy5jdXJyZW50TW9kZSA9PT0gXCJjaGVja2JveFwiID8gXCJub25lXCIgOiBcImJsb2NrXCI7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDcmVhdGUgdGFyZ2V0IHNlY3Rpb24gdGhhdCB3aWxsIGJlIHVwZGF0ZWQgYmFzZWQgb24gbW9kZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgY3JlYXRlVGFyZ2V0U2VjdGlvbihjb250YWluZXI6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHR0aGlzLnRhcmdldFNlY3Rpb25Db250YWluZXIgPSBjb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInF1aWNrLWNhcHR1cmUtdGFyZ2V0LWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gSW5pdGlhbCBkaXNwbGF5IGJhc2VkIG9uIGN1cnJlbnQgbW9kZVxyXG5cdFx0dGhpcy51cGRhdGVUYXJnZXREaXNwbGF5KCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgdGFyZ2V0IGRpc3BsYXkgYmFzZWQgb24gY3VycmVudCBtb2RlXHJcblx0ICovXHJcblx0cHJvdGVjdGVkIHVwZGF0ZVRhcmdldERpc3BsYXkoKTogdm9pZCB7XHJcblx0XHRpZiAoIXRoaXMudGFyZ2V0U2VjdGlvbkNvbnRhaW5lcikgcmV0dXJuO1xyXG5cclxuXHRcdC8vIENsZWFyIGV4aXN0aW5nIGNvbnRlbnRcclxuXHRcdHRoaXMudGFyZ2V0U2VjdGlvbkNvbnRhaW5lci5lbXB0eSgpO1xyXG5cclxuXHRcdGlmICh0aGlzLmN1cnJlbnRNb2RlID09PSBcImNoZWNrYm94XCIpIHtcclxuXHRcdFx0Ly8gQ2hlY2tib3ggbW9kZTogXCJDYXB0dXJlIHRvOiBbdGFyZ2V0IGZpbGVdXCJcclxuXHRcdFx0dGhpcy5jcmVhdGVUYXJnZXRGaWxlU2VsZWN0b3IodGhpcy50YXJnZXRTZWN0aW9uQ29udGFpbmVyKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIEZpbGUgbW9kZTogXCJDYXB0dXJlIGFzOiBbZmlsZSBuYW1lIGlucHV0XVwiXHJcblx0XHRcdHRoaXMuY3JlYXRlRmlsZU5hbWVTZWxlY3Rvcih0aGlzLnRhcmdldFNlY3Rpb25Db250YWluZXIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFVwZGF0ZSBtZXRhZGF0YSBzZWN0aW9uIHZpc2liaWxpdHlcclxuXHRcdGlmICh0aGlzLm1ldGFkYXRhQ29udGFpbmVyKSB7XHJcblx0XHRcdHRoaXMubWV0YWRhdGFDb250YWluZXIuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcclxuXHRcdFx0aWYgKHRoaXMubWV0YWRhdGFDb250YWluZXIuY2hpbGRyZW4ubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdFx0dGhpcy5jcmVhdGVUYXNrTWV0YWRhdGFDb25maWcodGhpcy5tZXRhZGF0YUNvbnRhaW5lcik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBVcGRhdGUgZWRpdG9yIHRpdGxlXHJcblx0XHRjb25zdCBlZGl0b3JUaXRsZSA9IHRoaXMuY29udGVudENvbnRhaW5lcj8ucXVlcnlTZWxlY3RvcihcclxuXHRcdFx0XCIucXVpY2stY2FwdHVyZS1zZWN0aW9uLXRpdGxlXCJcclxuXHRcdCk7XHJcblx0XHRpZiAoZWRpdG9yVGl0bGUpIHtcclxuXHRcdFx0ZWRpdG9yVGl0bGUuc2V0VGV4dChcclxuXHRcdFx0XHR0aGlzLmN1cnJlbnRNb2RlID09PSBcImZpbGVcIlxyXG5cdFx0XHRcdFx0PyB0KFwiRmlsZSBDb250ZW50XCIpXHJcblx0XHRcdFx0XHQ6IHQoXCJUYXNrIENvbnRlbnRcIilcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBVcGRhdGUgcHJldmlldyB2aXNpYmlsaXR5IGJ5IHRvZ2dsaW5nIGNoaWxkIGNvbnRhaW5lcnNcclxuXHRcdGlmICh0aGlzLnByZXZpZXdNYXJrZG93bkVsICYmIHRoaXMucHJldmlld1BsYWluRWwpIHtcclxuXHRcdFx0dGhpcy5wcmV2aWV3TWFya2Rvd25FbC5zdHlsZS5kaXNwbGF5ID1cclxuXHRcdFx0XHR0aGlzLmN1cnJlbnRNb2RlID09PSBcImNoZWNrYm94XCIgPyBcImJsb2NrXCIgOiBcIm5vbmVcIjtcclxuXHRcdFx0dGhpcy5wcmV2aWV3UGxhaW5FbC5zdHlsZS5kaXNwbGF5ID1cclxuXHRcdFx0XHR0aGlzLmN1cnJlbnRNb2RlID09PSBcImNoZWNrYm94XCIgPyBcIm5vbmVcIiA6IFwiYmxvY2tcIjtcclxuXHRcdH1cclxuXHRcdC8vIEVuc3VyZSBwcmV2aWV3IHJlZnJlc2ggYWZ0ZXIgc3dpdGNoaW5nIG1vZGUvdGFyZ2V0XHJcblx0XHR0aGlzLnVwZGF0ZVByZXZpZXcoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZSBmaWxlIG5hbWUgc2VsZWN0b3IgZm9yIGZpbGUgbW9kZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgY3JlYXRlRmlsZU5hbWVTZWxlY3Rvcihjb250YWluZXI6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHRjb25zdCBmaWxlTmFtZUNvbnRhaW5lciA9IGNvbnRhaW5lcjtcclxuXHJcblx0XHRmaWxlTmFtZUNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHR0ZXh0OiB0KFwiQ2FwdHVyZSBhczpcIiksXHJcblx0XHRcdGNsczogXCJxdWljay1jYXB0dXJlLXNlY3Rpb24tdGl0bGVcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIERlc3Ryb3kgcHJldmlvdXMgZmlsZSBuYW1lIGlucHV0IGlmIGV4aXN0c1xyXG5cdFx0aWYgKHRoaXMuZmlsZU5hbWVJbnB1dCkge1xyXG5cdFx0XHR0aGlzLmZpbGVOYW1lSW5wdXQuZGVzdHJveSgpO1xyXG5cdFx0XHR0aGlzLmZpbGVOYW1lSW5wdXQgPSBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENyZWF0ZSBuZXcgZmlsZSBuYW1lIGlucHV0XHJcblx0XHR0aGlzLmZpbGVOYW1lSW5wdXQgPSBuZXcgRmlsZU5hbWVJbnB1dCh0aGlzLmFwcCwgZmlsZU5hbWVDb250YWluZXIsIHtcclxuXHRcdFx0cGxhY2Vob2xkZXI6IHQoXCJFbnRlciBmaWxlIG5hbWUuLi5cIiksXHJcblx0XHRcdGRlZmF1bHRWYWx1ZTpcclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUuZGVmYXVsdEZpbGVOYW1lVGVtcGxhdGUgfHxcclxuXHRcdFx0XHRcInt7REFURTpZWVlZLU1NLUREfX0gLSBcIixcclxuXHRcdFx0Y3VycmVudEZvbGRlcjpcclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUuY3JlYXRlRmlsZU1vZGU/LmRlZmF1bHRGb2xkZXIsXHJcblx0XHRcdG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcclxuXHRcdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS5jdXN0b21GaWxlTmFtZSA9IHZhbHVlO1xyXG5cdFx0XHR9LFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gU2V0IGluaXRpYWwgdmFsdWUgaWYgZXhpc3RzXHJcblx0XHRpZiAodGhpcy50YXNrTWV0YWRhdGEuY3VzdG9tRmlsZU5hbWUpIHtcclxuXHRcdFx0dGhpcy5maWxlTmFtZUlucHV0LnNldFZhbHVlKHRoaXMudGFza01ldGFkYXRhLmN1c3RvbUZpbGVOYW1lKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZSB0YXJnZXQgZmlsZSBzZWxlY3RvclxyXG5cdCAqL1xyXG5cdHByaXZhdGUgY3JlYXRlVGFyZ2V0RmlsZVNlbGVjdG9yKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdGNvbnN0IHRhcmdldEZpbGVDb250YWluZXIgPSBjb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInF1aWNrLWNhcHR1cmUtdGFyZ2V0LWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGFyZ2V0RmlsZUNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHR0ZXh0OiB0KFwiQ2FwdHVyZSB0bzpcIiksXHJcblx0XHRcdGNsczogXCJxdWljay1jYXB0dXJlLXNlY3Rpb24tdGl0bGVcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IHRhcmdldEZpbGVFbCA9IHRhcmdldEZpbGVDb250YWluZXIuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHRjbHM6IFwicXVpY2stY2FwdHVyZS10YXJnZXRcIixcclxuXHRcdFx0YXR0cjoge1xyXG5cdFx0XHRcdGNvbnRlbnRlZGl0YWJsZTpcclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZS50YXJnZXRUeXBlID09PSBcImZpeGVkXCJcclxuXHRcdFx0XHRcdFx0PyBcInRydWVcIlxyXG5cdFx0XHRcdFx0XHQ6IFwiZmFsc2VcIixcclxuXHRcdFx0XHRzcGVsbGNoZWNrOiBcImZhbHNlXCIsXHJcblx0XHRcdH0sXHJcblx0XHRcdHRleHQ6IHRoaXMudGVtcFRhcmdldEZpbGVQYXRoLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gT25seSBhZGQgZmlsZSBzdWdnZXN0IGZvciBmaXhlZCBmaWxlIHR5cGVcclxuXHRcdGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUudGFyZ2V0VHlwZSA9PT0gXCJmaXhlZFwiKSB7XHJcblx0XHRcdG5ldyBGaWxlU3VnZ2VzdChcclxuXHRcdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0XHR0YXJnZXRGaWxlRWwsXHJcblx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLFxyXG5cdFx0XHRcdChmaWxlOiBURmlsZSkgPT4ge1xyXG5cdFx0XHRcdFx0dGFyZ2V0RmlsZUVsLnRleHRDb250ZW50ID0gZmlsZS5wYXRoO1xyXG5cdFx0XHRcdFx0dGhpcy50ZW1wVGFyZ2V0RmlsZVBhdGggPSBmaWxlLnBhdGg7XHJcblx0XHRcdFx0XHR0aGlzLm1hcmtkb3duRWRpdG9yPy5lZGl0b3I/LmZvY3VzKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ3JlYXRlIHRhc2sgbWV0YWRhdGEgY29uZmlndXJhdGlvblxyXG5cdCAqL1xyXG5cdHByaXZhdGUgY3JlYXRlVGFza01ldGFkYXRhQ29uZmlnKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdGNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHR0ZXh0OiB0KFwiVGFzayBQcm9wZXJ0aWVzXCIpLFxyXG5cdFx0XHRjbHM6IFwicXVpY2stY2FwdHVyZS1zZWN0aW9uLXRpdGxlXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBTdGF0dXMgY29tcG9uZW50XHJcblx0XHRjb25zdCBzdGF0dXNDb21wb25lbnQgPSBuZXcgU3RhdHVzQ29tcG9uZW50KFxyXG5cdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0Y29udGFpbmVyLFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0c3RhdHVzOiB0aGlzLnRhc2tNZXRhZGF0YS5zdGF0dXMsXHJcblx0XHRcdH0gYXMgVGFzayxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHR5cGU6IFwicXVpY2stY2FwdHVyZVwiLFxyXG5cdFx0XHRcdG9uVGFza1N0YXR1c1NlbGVjdGVkOiAoc3RhdHVzOiBzdHJpbmcpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMudGFza01ldGFkYXRhLnN0YXR1cyA9IHN0YXR1cztcclxuXHRcdFx0XHRcdHRoaXMudXBkYXRlUHJldmlldygpO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblx0XHRzdGF0dXNDb21wb25lbnQubG9hZCgpO1xyXG5cclxuXHRcdC8vIERhdGUgaW5wdXRzXHJcblx0XHR0aGlzLmNyZWF0ZURhdGVJbnB1dHMoY29udGFpbmVyKTtcclxuXHJcblx0XHQvLyBQcmlvcml0eSBzZWxlY3RvclxyXG5cdFx0dGhpcy5jcmVhdGVQcmlvcml0eVNlbGVjdG9yKGNvbnRhaW5lcik7XHJcblxyXG5cdFx0Ly8gUHJvamVjdCBpbnB1dFxyXG5cdFx0dGhpcy5jcmVhdGVQcm9qZWN0SW5wdXQoY29udGFpbmVyKTtcclxuXHJcblx0XHQvLyBDb250ZXh0IGlucHV0XHJcblx0XHR0aGlzLmNyZWF0ZUNvbnRleHRJbnB1dChjb250YWluZXIpO1xyXG5cclxuXHRcdC8vIFJlY3VycmVuY2UgaW5wdXRcclxuXHRcdHRoaXMuY3JlYXRlUmVjdXJyZW5jZUlucHV0KGNvbnRhaW5lcik7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDcmVhdGUgZGF0ZSBpbnB1dHNcclxuXHQgKi9cclxuXHRwcml2YXRlIGNyZWF0ZURhdGVJbnB1dHMoY29udGFpbmVyOiBIVE1MRWxlbWVudCk6IHZvaWQge1xyXG5cdFx0Ly8gU3RhcnQgRGF0ZVxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyKS5zZXROYW1lKHQoXCJTdGFydCBEYXRlXCIpKS5hZGRUZXh0KCh0ZXh0KSA9PiB7XHJcblx0XHRcdHRleHQuc2V0UGxhY2Vob2xkZXIoXCJZWVlZLU1NLUREXCIpXHJcblx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEuc3RhcnREYXRlXHJcblx0XHRcdFx0XHRcdD8gdGhpcy5mb3JtYXREYXRlKHRoaXMudGFza01ldGFkYXRhLnN0YXJ0RGF0ZSlcclxuXHRcdFx0XHRcdFx0OiBcIlwiXHJcblx0XHRcdFx0KVxyXG5cdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdGlmICh2YWx1ZSkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS5zdGFydERhdGUgPSB0aGlzLnBhcnNlRGF0ZSh2YWx1ZSk7XHJcblx0XHRcdFx0XHRcdHRoaXMubWFya0FzTWFudWFsbHlTZXQoXCJzdGFydERhdGVcIik7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS5zdGFydERhdGUgPSB1bmRlZmluZWQ7XHJcblx0XHRcdFx0XHRcdGlmICh0aGlzLnRhc2tNZXRhZGF0YS5tYW51YWxseVNldCkge1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMudGFza01ldGFkYXRhLm1hbnVhbGx5U2V0LnN0YXJ0RGF0ZSA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR0aGlzLnVwZGF0ZVByZXZpZXcoKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0dGV4dC5pbnB1dEVsLnR5cGUgPSBcImRhdGVcIjtcclxuXHRcdFx0dGhpcy5zdGFydERhdGVJbnB1dCA9IHRleHQuaW5wdXRFbDtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIER1ZSBEYXRlXHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXIpLnNldE5hbWUodChcIkR1ZSBEYXRlXCIpKS5hZGRUZXh0KCh0ZXh0KSA9PiB7XHJcblx0XHRcdHRleHQuc2V0UGxhY2Vob2xkZXIoXCJZWVlZLU1NLUREXCIpXHJcblx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEuZHVlRGF0ZVxyXG5cdFx0XHRcdFx0XHQ/IHRoaXMuZm9ybWF0RGF0ZSh0aGlzLnRhc2tNZXRhZGF0YS5kdWVEYXRlKVxyXG5cdFx0XHRcdFx0XHQ6IFwiXCJcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKHZhbHVlKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMudGFza01ldGFkYXRhLmR1ZURhdGUgPSB0aGlzLnBhcnNlRGF0ZSh2YWx1ZSk7XHJcblx0XHRcdFx0XHRcdHRoaXMubWFya0FzTWFudWFsbHlTZXQoXCJkdWVEYXRlXCIpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEuZHVlRGF0ZSA9IHVuZGVmaW5lZDtcclxuXHRcdFx0XHRcdFx0aWYgKHRoaXMudGFza01ldGFkYXRhLm1hbnVhbGx5U2V0KSB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEubWFudWFsbHlTZXQuZHVlRGF0ZSA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR0aGlzLnVwZGF0ZVByZXZpZXcoKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0dGV4dC5pbnB1dEVsLnR5cGUgPSBcImRhdGVcIjtcclxuXHRcdFx0dGhpcy5kdWVEYXRlSW5wdXQgPSB0ZXh0LmlucHV0RWw7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBTY2hlZHVsZWQgRGF0ZVxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyKS5zZXROYW1lKHQoXCJTY2hlZHVsZWQgRGF0ZVwiKSkuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHR0ZXh0LnNldFBsYWNlaG9sZGVyKFwiWVlZWS1NTS1ERFwiKVxyXG5cdFx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdHRoaXMudGFza01ldGFkYXRhLnNjaGVkdWxlZERhdGVcclxuXHRcdFx0XHRcdFx0PyB0aGlzLmZvcm1hdERhdGUodGhpcy50YXNrTWV0YWRhdGEuc2NoZWR1bGVkRGF0ZSlcclxuXHRcdFx0XHRcdFx0OiBcIlwiXHJcblx0XHRcdFx0KVxyXG5cdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdGlmICh2YWx1ZSkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS5zY2hlZHVsZWREYXRlID0gdGhpcy5wYXJzZURhdGUodmFsdWUpO1xyXG5cdFx0XHRcdFx0XHR0aGlzLm1hcmtBc01hbnVhbGx5U2V0KFwic2NoZWR1bGVkRGF0ZVwiKTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdHRoaXMudGFza01ldGFkYXRhLnNjaGVkdWxlZERhdGUgPSB1bmRlZmluZWQ7XHJcblx0XHRcdFx0XHRcdGlmICh0aGlzLnRhc2tNZXRhZGF0YS5tYW51YWxseVNldCkge1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMudGFza01ldGFkYXRhLm1hbnVhbGx5U2V0LnNjaGVkdWxlZERhdGUgPSBmYWxzZTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0dGhpcy51cGRhdGVQcmV2aWV3KCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdHRleHQuaW5wdXRFbC50eXBlID0gXCJkYXRlXCI7XHJcblx0XHRcdHRoaXMuc2NoZWR1bGVkRGF0ZUlucHV0ID0gdGV4dC5pbnB1dEVsO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDcmVhdGUgcHJpb3JpdHkgc2VsZWN0b3JcclxuXHQgKi9cclxuXHRwcml2YXRlIGNyZWF0ZVByaW9yaXR5U2VsZWN0b3IoY29udGFpbmVyOiBIVE1MRWxlbWVudCk6IHZvaWQge1xyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiUHJpb3JpdHlcIikpXHJcblx0XHRcdC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcclxuXHRcdFx0XHRkcm9wZG93blxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcIlwiLCB0KFwiTm9uZVwiKSlcclxuXHRcdFx0XHRcdC5hZGRPcHRpb24oXCI1XCIsIHQoXCJIaWdoZXN0XCIpKVxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcIjRcIiwgdChcIkhpZ2hcIikpXHJcblx0XHRcdFx0XHQuYWRkT3B0aW9uKFwiM1wiLCB0KFwiTWVkaXVtXCIpKVxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcIjJcIiwgdChcIkxvd1wiKSlcclxuXHRcdFx0XHRcdC5hZGRPcHRpb24oXCIxXCIsIHQoXCJMb3dlc3RcIikpXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUodGhpcy50YXNrTWV0YWRhdGEucHJpb3JpdHk/LnRvU3RyaW5nKCkgfHwgXCJcIilcclxuXHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEucHJpb3JpdHkgPSB2YWx1ZVxyXG5cdFx0XHRcdFx0XHRcdD8gcGFyc2VJbnQodmFsdWUpXHJcblx0XHRcdFx0XHRcdFx0OiB1bmRlZmluZWQ7XHJcblx0XHRcdFx0XHRcdHRoaXMudXBkYXRlUHJldmlldygpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ3JlYXRlIHByb2plY3QgaW5wdXRcclxuXHQgKi9cclxuXHRwcml2YXRlIGNyZWF0ZVByb2plY3RJbnB1dChjb250YWluZXI6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXIpLnNldE5hbWUodChcIlByb2plY3RcIikpLmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0bmV3IFByb2plY3RTdWdnZXN0KHRoaXMuYXBwLCB0ZXh0LmlucHV0RWwsIHRoaXMucGx1Z2luKTtcclxuXHRcdFx0dGV4dC5zZXRQbGFjZWhvbGRlcih0KFwiUHJvamVjdCBuYW1lXCIpKVxyXG5cdFx0XHRcdC5zZXRWYWx1ZSh0aGlzLnRhc2tNZXRhZGF0YS5wcm9qZWN0IHx8IFwiXCIpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEucHJvamVjdCA9IHZhbHVlIHx8IHVuZGVmaW5lZDtcclxuXHRcdFx0XHRcdHRoaXMudXBkYXRlUHJldmlldygpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDcmVhdGUgY29udGV4dCBpbnB1dFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgY3JlYXRlQ29udGV4dElucHV0KGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lcikuc2V0TmFtZSh0KFwiQ29udGV4dFwiKSkuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHRuZXcgQ29udGV4dFN1Z2dlc3QodGhpcy5hcHAsIHRleHQuaW5wdXRFbCwgdGhpcy5wbHVnaW4pO1xyXG5cdFx0XHR0ZXh0LnNldFBsYWNlaG9sZGVyKHQoXCJDb250ZXh0XCIpKVxyXG5cdFx0XHRcdC5zZXRWYWx1ZSh0aGlzLnRhc2tNZXRhZGF0YS5jb250ZXh0IHx8IFwiXCIpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEuY29udGV4dCA9IHZhbHVlIHx8IHVuZGVmaW5lZDtcclxuXHRcdFx0XHRcdHRoaXMudXBkYXRlUHJldmlldygpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDcmVhdGUgcmVjdXJyZW5jZSBpbnB1dFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgY3JlYXRlUmVjdXJyZW5jZUlucHV0KGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lcikuc2V0TmFtZSh0KFwiUmVjdXJyZW5jZVwiKSkuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHR0ZXh0LnNldFBsYWNlaG9sZGVyKHQoXCJlLmcuLCBldmVyeSBkYXksIGV2ZXJ5IHdlZWtcIikpXHJcblx0XHRcdFx0LnNldFZhbHVlKHRoaXMudGFza01ldGFkYXRhLnJlY3VycmVuY2UgfHwgXCJcIilcclxuXHRcdFx0XHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS5yZWN1cnJlbmNlID0gdmFsdWUgfHwgdW5kZWZpbmVkO1xyXG5cdFx0XHRcdFx0dGhpcy51cGRhdGVQcmV2aWV3KCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNldHVwIG1hcmtkb3duIGVkaXRvclxyXG5cdCAqL1xyXG5cdHByaXZhdGUgc2V0dXBNYXJrZG93bkVkaXRvcihjb250YWluZXI6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0dGhpcy5tYXJrZG93bkVkaXRvciA9IGNyZWF0ZUVtYmVkZGFibGVNYXJrZG93bkVkaXRvcihcclxuXHRcdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0XHRjb250YWluZXIsXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0cGxhY2Vob2xkZXI6IHRoaXMucGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZS5wbGFjZWhvbGRlcixcclxuXHRcdFx0XHRcdHNpbmdsZUxpbmU6IHRoaXMuY3VycmVudE1vZGUgPT09IFwiY2hlY2tib3hcIixcclxuXHJcblx0XHRcdFx0XHRvbkVudGVyOiAoZWRpdG9yLCBtb2QsIHNoaWZ0KSA9PiB7XHJcblx0XHRcdFx0XHRcdGlmIChtb2QpIHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmhhbmRsZVN1Ym1pdCgpO1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdC8vIEluIGNoZWNrYm94IG1vZGUsIEVudGVyIHN1Ym1pdHNcclxuXHRcdFx0XHRcdFx0aWYgKHRoaXMuY3VycmVudE1vZGUgPT09IFwiY2hlY2tib3hcIikge1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMuaGFuZGxlU3VibWl0KCk7XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdFx0fSxcclxuXHJcblx0XHRcdFx0XHRvbkVzY2FwZTogKGVkaXRvcikgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLmNsb3NlKCk7XHJcblx0XHRcdFx0XHR9LFxyXG5cclxuXHRcdFx0XHRcdG9uU3VibWl0OiAoZWRpdG9yKSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMuaGFuZGxlU3VibWl0KCk7XHJcblx0XHRcdFx0XHR9LFxyXG5cclxuXHRcdFx0XHRcdG9uQ2hhbmdlOiAodXBkYXRlKSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMuY2FwdHVyZWRDb250ZW50ID0gdGhpcy5tYXJrZG93bkVkaXRvcj8udmFsdWUgfHwgXCJcIjtcclxuXHJcblx0XHRcdFx0XHRcdC8vIENsZWFyIHByZXZpb3VzIGRlYm91bmNlIHRpbWVyXHJcblx0XHRcdFx0XHRcdGlmICh0aGlzLnBhcnNlRGVib3VuY2VUaW1lcikge1xyXG5cdFx0XHRcdFx0XHRcdGNsZWFyVGltZW91dCh0aGlzLnBhcnNlRGVib3VuY2VUaW1lcik7XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdC8vIERlYm91bmNlIHRpbWUgcGFyc2luZyBmb3IgYm90aCBtb2Rlc1xyXG5cdFx0XHRcdFx0XHR0aGlzLnBhcnNlRGVib3VuY2VUaW1lciA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnBlcmZvcm1SZWFsVGltZVBhcnNpbmcoKTtcclxuXHRcdFx0XHRcdFx0fSwgMzAwKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIFVwZGF0ZSBwcmV2aWV3IGluIGJvdGggbW9kZXNcclxuXHRcdFx0XHRcdFx0dGhpcy51cGRhdGVQcmV2aWV3KCk7XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH1cclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIEZvY3VzIHRoZSBlZGl0b3JcclxuXHRcdFx0dGhpcy5tYXJrZG93bkVkaXRvcj8uZWRpdG9yPy5mb2N1cygpO1xyXG5cclxuXHRcdFx0Ly8gUmVzdG9yZSBjb250ZW50IGlmIGV4aXN0c1xyXG5cdFx0XHRpZiAodGhpcy5jYXB0dXJlZENvbnRlbnQgJiYgdGhpcy5tYXJrZG93bkVkaXRvcikge1xyXG5cdFx0XHRcdHRoaXMubWFya2Rvd25FZGl0b3Iuc2V0KHRoaXMuY2FwdHVyZWRDb250ZW50LCBmYWxzZSk7XHJcblx0XHRcdH1cclxuXHRcdH0sIDUwKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBwcmV2aWV3XHJcblx0ICovXHJcblx0cHJpdmF0ZSB1cGRhdGVQcmV2aWV3KCk6IHZvaWQge1xyXG5cdFx0aWYgKHRoaXMuY3VycmVudE1vZGUgPT09IFwiY2hlY2tib3hcIikge1xyXG5cdFx0XHRpZiAodGhpcy5tYXJrZG93blJlbmRlcmVyKSB7XHJcblx0XHRcdFx0dGhpcy5tYXJrZG93blJlbmRlcmVyLnJlbmRlcihcclxuXHRcdFx0XHRcdHRoaXMucHJvY2Vzc0NvbnRlbnRXaXRoTWV0YWRhdGEodGhpcy5jYXB0dXJlZENvbnRlbnQpXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0aWYgKHRoaXMucHJldmlld1BsYWluRWwpIHtcclxuXHRcdFx0XHRjb25zdCBzbmFwc2hvdCA9IHRoaXMuY2FwdHVyZWRDb250ZW50O1xyXG5cdFx0XHRcdHZvaWQgdGhpcy5jb21wdXRlRmlsZU1vZGVQcmV2aWV3Q29udGVudChzbmFwc2hvdCkudGhlbihcclxuXHRcdFx0XHRcdChmaW5hbENvbnRlbnQpID0+IHtcclxuXHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdHRoaXMucHJldmlld1BsYWluRWwgJiZcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmNhcHR1cmVkQ29udGVudCA9PT0gc25hcHNob3RcclxuXHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5wcmV2aWV3UGxhaW5FbC50ZXh0Q29udGVudCA9IGZpbmFsQ29udGVudDtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEJ1aWxkIHByZXZpZXcgY29udGVudCBmb3IgZmlsZSBtb2RlIGJ5IG1pcnJvcmluZyBzYXZlQ29udGVudCdzIGZpbGUtbW9kZSBwcm9jZXNzaW5nXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhc3luYyBjb21wdXRlRmlsZU1vZGVQcmV2aWV3Q29udGVudChcclxuXHRcdGNvbnRlbnQ6IHN0cmluZ1xyXG5cdCk6IFByb21pc2U8c3RyaW5nPiB7XHJcblx0XHRjb25zdCBwcm9jZXNzZWRDb250ZW50ID0gdGhpcy5wcm9jZXNzQ29udGVudFdpdGhNZXRhZGF0YShjb250ZW50KTtcclxuXHRcdHJldHVybiB0aGlzLmJ1aWxkRmlsZU1vZGVDb250ZW50KGNvbnRlbnQsIHByb2Nlc3NlZENvbnRlbnQsIHtcclxuXHRcdFx0cHJldmlldzogdHJ1ZSxcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUHJvY2VzcyBjb250ZW50IHdpdGggbWV0YWRhdGFcclxuXHQgKi9cclxuXHRwcm90ZWN0ZWQgcHJvY2Vzc0NvbnRlbnRXaXRoTWV0YWRhdGEoY29udGVudDogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdC8vIEZvciBmaWxlIG1vZGUsIGp1c3QgcmV0dXJuIGNvbnRlbnQgYXMtaXNcclxuXHRcdGlmICh0aGlzLmN1cnJlbnRNb2RlID09PSBcImZpbGVcIikge1xyXG5cdFx0XHRyZXR1cm4gY29udGVudDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTcGxpdCBjb250ZW50IGludG8gbGluZXNcclxuXHRcdGNvbnN0IGxpbmVzID0gY29udGVudC5zcGxpdChcIlxcblwiKTtcclxuXHRcdGNvbnN0IHByb2Nlc3NlZExpbmVzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuXHRcdGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xyXG5cdFx0XHRpZiAoIWxpbmUudHJpbSgpKSB7XHJcblx0XHRcdFx0cHJvY2Vzc2VkTGluZXMucHVzaChsaW5lKTtcclxuXHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gUGFyc2UgdGltZSBleHByZXNzaW9ucyBmb3IgdGhpcyBsaW5lXHJcblx0XHRcdGNvbnN0IGxpbmVQYXJzZVJlc3VsdCA9XHJcblx0XHRcdFx0dGhpcy50aW1lUGFyc2luZ1NlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnNGb3JMaW5lKGxpbmUpO1xyXG5cdFx0XHRjb25zdCBjbGVhbmVkTGluZSA9IGxpbmVQYXJzZVJlc3VsdC5jbGVhbmVkTGluZTtcclxuXHJcblx0XHRcdC8vIENoZWNrIGZvciBpbmRlbnRhdGlvblxyXG5cdFx0XHRjb25zdCBpbmRlbnRNYXRjaCA9IGxpbmUubWF0Y2goL14oXFxzKykvKTtcclxuXHRcdFx0Y29uc3QgaXNTdWJUYXNrID0gaW5kZW50TWF0Y2ggJiYgaW5kZW50TWF0Y2hbMV0ubGVuZ3RoID4gMDtcclxuXHJcblx0XHRcdC8vIENoZWNrIGlmIGxpbmUgaXMgYWxyZWFkeSBhIHRhc2sgb3IgbGlzdCBpdGVtXHJcblx0XHRcdGNvbnN0IGlzVGFza09yTGlzdCA9IGNsZWFuZWRMaW5lXHJcblx0XHRcdFx0LnRyaW0oKVxyXG5cdFx0XHRcdC5tYXRjaCgvXigtfFxcZCtcXC58XFwqfFxcKykoXFxzK1xcW1teXFxdXFxbXStcXF0pPy8pO1xyXG5cclxuXHRcdFx0aWYgKGlzU3ViVGFzaykge1xyXG5cdFx0XHRcdC8vIERvbid0IGFkZCBtZXRhZGF0YSB0byBzdWItdGFza3NcclxuXHRcdFx0XHRjb25zdCBvcmlnaW5hbEluZGVudCA9IGluZGVudE1hdGNoWzFdO1xyXG5cdFx0XHRcdHByb2Nlc3NlZExpbmVzLnB1c2goXHJcblx0XHRcdFx0XHRvcmlnaW5hbEluZGVudCArXHJcblx0XHRcdFx0XHRcdHRoaXMuY2xlYW5UZW1wb3JhcnlNYXJrcyhjbGVhbmVkTGluZS50cmltKCkpXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fSBlbHNlIGlmIChpc1Rhc2tPckxpc3QpIHtcclxuXHRcdFx0XHQvLyBQcm9jZXNzIGFzIHRhc2tcclxuXHRcdFx0XHRpZiAoY2xlYW5lZExpbmUudHJpbSgpLm1hdGNoKC9eKC18XFxkK1xcLnxcXCp8XFwrKVxccytcXFtbXlxcXV0rXFxdLykpIHtcclxuXHRcdFx0XHRcdHByb2Nlc3NlZExpbmVzLnB1c2goXHJcblx0XHRcdFx0XHRcdHRoaXMuYWRkTGluZU1ldGFkYXRhVG9UYXNrKGNsZWFuZWRMaW5lLCBsaW5lUGFyc2VSZXN1bHQpXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHQvLyBDb252ZXJ0IHRvIHRhc2tcclxuXHRcdFx0XHRcdGNvbnN0IGxpc3RQcmVmaXggPSBjbGVhbmVkTGluZVxyXG5cdFx0XHRcdFx0XHQudHJpbSgpXHJcblx0XHRcdFx0XHRcdC5tYXRjaCgvXigtfFxcZCtcXC58XFwqfFxcKykvKT8uWzBdO1xyXG5cdFx0XHRcdFx0Y29uc3QgcmVzdE9mTGluZSA9IHRoaXMuY2xlYW5UZW1wb3JhcnlNYXJrcyhcclxuXHRcdFx0XHRcdFx0Y2xlYW5lZExpbmVcclxuXHRcdFx0XHRcdFx0XHQudHJpbSgpXHJcblx0XHRcdFx0XHRcdFx0LnN1YnN0cmluZyhsaXN0UHJlZml4Py5sZW5ndGggfHwgMClcclxuXHRcdFx0XHRcdFx0XHQudHJpbSgpXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0Y29uc3Qgc3RhdHVzTWFyayA9IHRoaXMudGFza01ldGFkYXRhLnN0YXR1cyB8fCBcIiBcIjtcclxuXHRcdFx0XHRcdGNvbnN0IHRhc2tMaW5lID0gYCR7bGlzdFByZWZpeH0gWyR7c3RhdHVzTWFya31dICR7cmVzdE9mTGluZX1gO1xyXG5cdFx0XHRcdFx0cHJvY2Vzc2VkTGluZXMucHVzaChcclxuXHRcdFx0XHRcdFx0dGhpcy5hZGRMaW5lTWV0YWRhdGFUb1Rhc2sodGFza0xpbmUsIGxpbmVQYXJzZVJlc3VsdClcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIENvbnZlcnQgdG8gdGFza1xyXG5cdFx0XHRcdGNvbnN0IHN0YXR1c01hcmsgPSB0aGlzLnRhc2tNZXRhZGF0YS5zdGF0dXMgfHwgXCIgXCI7XHJcblx0XHRcdFx0Y29uc3QgY2xlYW5lZENvbnRlbnQgPSB0aGlzLmNsZWFuVGVtcG9yYXJ5TWFya3MoY2xlYW5lZExpbmUpO1xyXG5cdFx0XHRcdGNvbnN0IHRhc2tMaW5lID0gYC0gWyR7c3RhdHVzTWFya31dICR7Y2xlYW5lZENvbnRlbnR9YDtcclxuXHRcdFx0XHRwcm9jZXNzZWRMaW5lcy5wdXNoKFxyXG5cdFx0XHRcdFx0dGhpcy5hZGRMaW5lTWV0YWRhdGFUb1Rhc2sodGFza0xpbmUsIGxpbmVQYXJzZVJlc3VsdClcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHByb2Nlc3NlZExpbmVzLmpvaW4oXCJcXG5cIik7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBBZGQgbGluZSBtZXRhZGF0YSB0byB0YXNrXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhZGRMaW5lTWV0YWRhdGFUb1Rhc2soXHJcblx0XHR0YXNrTGluZTogc3RyaW5nLFxyXG5cdFx0bGluZVBhcnNlUmVzdWx0OiBMaW5lUGFyc2VSZXN1bHRcclxuXHQpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgbWV0YWRhdGEgPSB0aGlzLmdlbmVyYXRlTGluZU1ldGFkYXRhKGxpbmVQYXJzZVJlc3VsdCk7XHJcblx0XHRpZiAoIW1ldGFkYXRhKSByZXR1cm4gdGFza0xpbmU7XHJcblx0XHRyZXR1cm4gYCR7dGFza0xpbmV9ICR7bWV0YWRhdGF9YC50cmltKCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZW5lcmF0ZSBsaW5lIG1ldGFkYXRhXHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZW5lcmF0ZUxpbmVNZXRhZGF0YShsaW5lUGFyc2VSZXN1bHQ6IExpbmVQYXJzZVJlc3VsdCk6IHN0cmluZyB7XHJcblx0XHRjb25zdCBtZXRhZGF0YTogc3RyaW5nW10gPSBbXTtcclxuXHRcdGNvbnN0IHVzZURhdGF2aWV3Rm9ybWF0ID0gdGhpcy5wcmVmZXJNZXRhZGF0YUZvcm1hdCA9PT0gXCJkYXRhdmlld1wiO1xyXG5cclxuXHRcdC8vIFVzZSBsaW5lLXNwZWNpZmljIGRhdGVzIGZpcnN0LCBmYWxsIGJhY2sgdG8gZ2xvYmFsIG1ldGFkYXRhXHJcblx0XHRjb25zdCBzdGFydERhdGUgPVxyXG5cdFx0XHRsaW5lUGFyc2VSZXN1bHQuc3RhcnREYXRlIHx8IHRoaXMudGFza01ldGFkYXRhLnN0YXJ0RGF0ZTtcclxuXHRcdGNvbnN0IGR1ZURhdGUgPSBsaW5lUGFyc2VSZXN1bHQuZHVlRGF0ZSB8fCB0aGlzLnRhc2tNZXRhZGF0YS5kdWVEYXRlO1xyXG5cdFx0Y29uc3Qgc2NoZWR1bGVkRGF0ZSA9XHJcblx0XHRcdGxpbmVQYXJzZVJlc3VsdC5zY2hlZHVsZWREYXRlIHx8IHRoaXMudGFza01ldGFkYXRhLnNjaGVkdWxlZERhdGU7XHJcblxyXG5cdFx0Ly8gQWRkIGRhdGVzXHJcblx0XHRpZiAoc3RhcnREYXRlKSB7XHJcblx0XHRcdGNvbnN0IGZvcm1hdHRlZERhdGUgPSB0aGlzLmZvcm1hdERhdGUoc3RhcnREYXRlKTtcclxuXHRcdFx0bWV0YWRhdGEucHVzaChcclxuXHRcdFx0XHR1c2VEYXRhdmlld0Zvcm1hdFxyXG5cdFx0XHRcdFx0PyBgW3N0YXJ0OjogJHtmb3JtYXR0ZWREYXRlfV1gXHJcblx0XHRcdFx0XHQ6IGDwn5urICR7Zm9ybWF0dGVkRGF0ZX1gXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblx0XHRpZiAoZHVlRGF0ZSkge1xyXG5cdFx0XHRjb25zdCBmb3JtYXR0ZWREYXRlID0gdGhpcy5mb3JtYXREYXRlKGR1ZURhdGUpO1xyXG5cdFx0XHRtZXRhZGF0YS5wdXNoKFxyXG5cdFx0XHRcdHVzZURhdGF2aWV3Rm9ybWF0XHJcblx0XHRcdFx0XHQ/IGBbZHVlOjogJHtmb3JtYXR0ZWREYXRlfV1gXHJcblx0XHRcdFx0XHQ6IGDwn5OFICR7Zm9ybWF0dGVkRGF0ZX1gXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblx0XHRpZiAoc2NoZWR1bGVkRGF0ZSkge1xyXG5cdFx0XHRjb25zdCBmb3JtYXR0ZWREYXRlID0gdGhpcy5mb3JtYXREYXRlKHNjaGVkdWxlZERhdGUpO1xyXG5cdFx0XHRtZXRhZGF0YS5wdXNoKFxyXG5cdFx0XHRcdHVzZURhdGF2aWV3Rm9ybWF0XHJcblx0XHRcdFx0XHQ/IGBbc2NoZWR1bGVkOjogJHtmb3JtYXR0ZWREYXRlfV1gXHJcblx0XHRcdFx0XHQ6IGDij7MgJHtmb3JtYXR0ZWREYXRlfWBcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGQgcHJpb3JpdHlcclxuXHRcdGlmICh0aGlzLnRhc2tNZXRhZGF0YS5wcmlvcml0eSkge1xyXG5cdFx0XHRpZiAodXNlRGF0YXZpZXdGb3JtYXQpIHtcclxuXHRcdFx0XHRjb25zdCBwcmlvcml0eU1hcDogeyBba2V5OiBudW1iZXJdOiBzdHJpbmcgfSA9IHtcclxuXHRcdFx0XHRcdDU6IFwiaGlnaGVzdFwiLFxyXG5cdFx0XHRcdFx0NDogXCJoaWdoXCIsXHJcblx0XHRcdFx0XHQzOiBcIm1lZGl1bVwiLFxyXG5cdFx0XHRcdFx0MjogXCJsb3dcIixcclxuXHRcdFx0XHRcdDE6IFwibG93ZXN0XCIsXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHRtZXRhZGF0YS5wdXNoKFxyXG5cdFx0XHRcdFx0YFtwcmlvcml0eTo6ICR7cHJpb3JpdHlNYXBbdGhpcy50YXNrTWV0YWRhdGEucHJpb3JpdHldfV1gXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRjb25zdCBwcmlvcml0eUljb25zID0gW1wi4o+sXCIsIFwi8J+UvVwiLCBcIvCflLxcIiwgXCLij6tcIiwgXCLwn5S6XCJdO1xyXG5cdFx0XHRcdG1ldGFkYXRhLnB1c2gocHJpb3JpdHlJY29uc1t0aGlzLnRhc2tNZXRhZGF0YS5wcmlvcml0eSAtIDFdKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFkZCBwcm9qZWN0XHJcblx0XHRpZiAodGhpcy50YXNrTWV0YWRhdGEucHJvamVjdCkge1xyXG5cdFx0XHRjb25zdCBwcm9qZWN0UHJlZml4ID1cclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0VGFnUHJlZml4Py5bXHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcmVmZXJNZXRhZGF0YUZvcm1hdFxyXG5cdFx0XHRcdF0gfHwgXCJwcm9qZWN0XCI7XHJcblx0XHRcdG1ldGFkYXRhLnB1c2goXHJcblx0XHRcdFx0dXNlRGF0YXZpZXdGb3JtYXRcclxuXHRcdFx0XHRcdD8gYFske3Byb2plY3RQcmVmaXh9OjogJHt0aGlzLnRhc2tNZXRhZGF0YS5wcm9qZWN0fV1gXHJcblx0XHRcdFx0XHQ6IGAjJHtwcm9qZWN0UHJlZml4fS8ke3RoaXMudGFza01ldGFkYXRhLnByb2plY3R9YFxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFkZCBjb250ZXh0XHJcblx0XHRpZiAodGhpcy50YXNrTWV0YWRhdGEuY29udGV4dCkge1xyXG5cdFx0XHRjb25zdCBjb250ZXh0UHJlZml4ID1cclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb250ZXh0VGFnUHJlZml4Py5bXHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcmVmZXJNZXRhZGF0YUZvcm1hdFxyXG5cdFx0XHRcdF0gfHwgXCJAXCI7XHJcblx0XHRcdG1ldGFkYXRhLnB1c2goXHJcblx0XHRcdFx0dXNlRGF0YXZpZXdGb3JtYXRcclxuXHRcdFx0XHRcdD8gYFtjb250ZXh0OjogJHt0aGlzLnRhc2tNZXRhZGF0YS5jb250ZXh0fV1gXHJcblx0XHRcdFx0XHQ6IGAke2NvbnRleHRQcmVmaXh9JHt0aGlzLnRhc2tNZXRhZGF0YS5jb250ZXh0fWBcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGQgcmVjdXJyZW5jZVxyXG5cdFx0aWYgKHRoaXMudGFza01ldGFkYXRhLnJlY3VycmVuY2UpIHtcclxuXHRcdFx0bWV0YWRhdGEucHVzaChcclxuXHRcdFx0XHR1c2VEYXRhdmlld0Zvcm1hdFxyXG5cdFx0XHRcdFx0PyBgW3JlcGVhdDo6ICR7dGhpcy50YXNrTWV0YWRhdGEucmVjdXJyZW5jZX1dYFxyXG5cdFx0XHRcdFx0OiBg8J+UgSAke3RoaXMudGFza01ldGFkYXRhLnJlY3VycmVuY2V9YFxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBtZXRhZGF0YS5qb2luKFwiIFwiKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsZWFuIHRlbXBvcmFyeSBtYXJrc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgY2xlYW5UZW1wb3JhcnlNYXJrcyhjb250ZW50OiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0bGV0IGNsZWFuZWQgPSBjb250ZW50O1xyXG5cdFx0Y2xlYW5lZCA9IGNsZWFuZWQucmVwbGFjZSgvXFxzKiFcXHMqL2csIFwiIFwiKTtcclxuXHRcdGNsZWFuZWQgPSBjbGVhbmVkLnJlcGxhY2UoL1xccyp+XFxzKi9nLCBcIiBcIik7XHJcblx0XHRjbGVhbmVkID0gY2xlYW5lZC5yZXBsYWNlKC9cXHMqW/CflLrij6vwn5S88J+UveKPrO+4j11cXHMqL2csIFwiIFwiKTtcclxuXHRcdGNsZWFuZWQgPSBjbGVhbmVkLnJlcGxhY2UoL1xccypb8J+ThfCfm6vij7PinIXinpXinYxdXFxzKi9nLCBcIiBcIik7XHJcblx0XHRjbGVhbmVkID0gY2xlYW5lZC5yZXBsYWNlKC9cXHMqW/Cfk4Hwn4+g8J+PovCfj6rwn4+r8J+PrPCfj63wn4+v8J+PsF1cXHMqL2csIFwiIFwiKTtcclxuXHRcdGNsZWFuZWQgPSBjbGVhbmVkLnJlcGxhY2UoL1xccypb8J+GlOKblPCfj4Hwn5SBXVxccyovZywgXCIgXCIpO1xyXG5cdFx0Y2xlYW5lZCA9IGNsZWFuZWQucmVwbGFjZSgvXFxzKkBcXHcqXFxzKi9nLCBcIiBcIik7XHJcblx0XHRjbGVhbmVkID0gY2xlYW5lZC5yZXBsYWNlKC9cXHMqdGFyZ2V0OlxccyovZ2ksIFwiIFwiKTtcclxuXHRcdGNsZWFuZWQgPSBjbGVhbmVkLnJlcGxhY2UoL1xccysvZywgXCIgXCIpLnRyaW0oKTtcclxuXHRcdHJldHVybiBjbGVhbmVkO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUGVyZm9ybSByZWFsLXRpbWUgcGFyc2luZ1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgcGVyZm9ybVJlYWxUaW1lUGFyc2luZygpOiB2b2lkIHtcclxuXHRcdGlmICghdGhpcy5jYXB0dXJlZENvbnRlbnQpIHJldHVybjtcclxuXHJcblx0XHRjb25zdCBsaW5lcyA9IHRoaXMuY2FwdHVyZWRDb250ZW50LnNwbGl0KFwiXFxuXCIpO1xyXG5cdFx0Y29uc3QgbGluZVBhcnNlUmVzdWx0cyA9XHJcblx0XHRcdHRoaXMudGltZVBhcnNpbmdTZXJ2aWNlLnBhcnNlVGltZUV4cHJlc3Npb25zUGVyTGluZShsaW5lcyk7XHJcblxyXG5cdFx0Ly8gQWdncmVnYXRlIGRhdGVzIGZyb20gYWxsIGxpbmVzXHJcblx0XHRsZXQgYWdncmVnYXRlZFN0YXJ0RGF0ZTogRGF0ZSB8IHVuZGVmaW5lZDtcclxuXHRcdGxldCBhZ2dyZWdhdGVkRHVlRGF0ZTogRGF0ZSB8IHVuZGVmaW5lZDtcclxuXHRcdGxldCBhZ2dyZWdhdGVkU2NoZWR1bGVkRGF0ZTogRGF0ZSB8IHVuZGVmaW5lZDtcclxuXHJcblx0XHRmb3IgKGNvbnN0IGxpbmVSZXN1bHQgb2YgbGluZVBhcnNlUmVzdWx0cykge1xyXG5cdFx0XHRpZiAobGluZVJlc3VsdC5zdGFydERhdGUgJiYgIWFnZ3JlZ2F0ZWRTdGFydERhdGUpIHtcclxuXHRcdFx0XHRhZ2dyZWdhdGVkU3RhcnREYXRlID0gbGluZVJlc3VsdC5zdGFydERhdGU7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKGxpbmVSZXN1bHQuZHVlRGF0ZSAmJiAhYWdncmVnYXRlZER1ZURhdGUpIHtcclxuXHRcdFx0XHRhZ2dyZWdhdGVkRHVlRGF0ZSA9IGxpbmVSZXN1bHQuZHVlRGF0ZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAobGluZVJlc3VsdC5zY2hlZHVsZWREYXRlICYmICFhZ2dyZWdhdGVkU2NoZWR1bGVkRGF0ZSkge1xyXG5cdFx0XHRcdGFnZ3JlZ2F0ZWRTY2hlZHVsZWREYXRlID0gbGluZVJlc3VsdC5zY2hlZHVsZWREYXRlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVXBkYXRlIG1ldGFkYXRhIChvbmx5IGlmIG5vdCBtYW51YWxseSBzZXQpXHJcblx0XHRpZiAoYWdncmVnYXRlZFN0YXJ0RGF0ZSAmJiAhdGhpcy5pc01hbnVhbGx5U2V0KFwic3RhcnREYXRlXCIpKSB7XHJcblx0XHRcdHRoaXMudGFza01ldGFkYXRhLnN0YXJ0RGF0ZSA9IGFnZ3JlZ2F0ZWRTdGFydERhdGU7XHJcblx0XHRcdGlmICh0aGlzLnN0YXJ0RGF0ZUlucHV0KSB7XHJcblx0XHRcdFx0dGhpcy5zdGFydERhdGVJbnB1dC52YWx1ZSA9XHJcblx0XHRcdFx0XHR0aGlzLmZvcm1hdERhdGUoYWdncmVnYXRlZFN0YXJ0RGF0ZSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGlmIChhZ2dyZWdhdGVkRHVlRGF0ZSAmJiAhdGhpcy5pc01hbnVhbGx5U2V0KFwiZHVlRGF0ZVwiKSkge1xyXG5cdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS5kdWVEYXRlID0gYWdncmVnYXRlZER1ZURhdGU7XHJcblx0XHRcdGlmICh0aGlzLmR1ZURhdGVJbnB1dCkge1xyXG5cdFx0XHRcdHRoaXMuZHVlRGF0ZUlucHV0LnZhbHVlID0gdGhpcy5mb3JtYXREYXRlKGFnZ3JlZ2F0ZWREdWVEYXRlKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0aWYgKGFnZ3JlZ2F0ZWRTY2hlZHVsZWREYXRlICYmICF0aGlzLmlzTWFudWFsbHlTZXQoXCJzY2hlZHVsZWREYXRlXCIpKSB7XHJcblx0XHRcdHRoaXMudGFza01ldGFkYXRhLnNjaGVkdWxlZERhdGUgPSBhZ2dyZWdhdGVkU2NoZWR1bGVkRGF0ZTtcclxuXHRcdFx0aWYgKHRoaXMuc2NoZWR1bGVkRGF0ZUlucHV0KSB7XHJcblx0XHRcdFx0dGhpcy5zY2hlZHVsZWREYXRlSW5wdXQudmFsdWUgPSB0aGlzLmZvcm1hdERhdGUoXHJcblx0XHRcdFx0XHRhZ2dyZWdhdGVkU2NoZWR1bGVkRGF0ZVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGlmIG1ldGFkYXRhIGZpZWxkIHdhcyBtYW51YWxseSBzZXRcclxuXHQgKi9cclxuXHRwcml2YXRlIGlzTWFudWFsbHlTZXQoXHJcblx0XHRmaWVsZDogXCJzdGFydERhdGVcIiB8IFwiZHVlRGF0ZVwiIHwgXCJzY2hlZHVsZWREYXRlXCJcclxuXHQpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiB0aGlzLnRhc2tNZXRhZGF0YS5tYW51YWxseVNldD8uW2ZpZWxkXSB8fCBmYWxzZTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIE1hcmsgbWV0YWRhdGEgZmllbGQgYXMgbWFudWFsbHkgc2V0XHJcblx0ICovXHJcblx0cHJpdmF0ZSBtYXJrQXNNYW51YWxseVNldChcclxuXHRcdGZpZWxkOiBcInN0YXJ0RGF0ZVwiIHwgXCJkdWVEYXRlXCIgfCBcInNjaGVkdWxlZERhdGVcIlxyXG5cdCk6IHZvaWQge1xyXG5cdFx0aWYgKCF0aGlzLnRhc2tNZXRhZGF0YS5tYW51YWxseVNldCkge1xyXG5cdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS5tYW51YWxseVNldCA9IHt9O1xyXG5cdFx0fVxyXG5cdFx0dGhpcy50YXNrTWV0YWRhdGEubWFudWFsbHlTZXRbZmllbGRdID0gdHJ1ZTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlc2V0IFVJIGVsZW1lbnRzXHJcblx0ICovXHJcblx0cHJvdGVjdGVkIHJlc2V0VUlFbGVtZW50cygpOiB2b2lkIHtcclxuXHRcdC8vIFJlc2V0IGRhdGUgaW5wdXRzXHJcblx0XHRpZiAodGhpcy5zdGFydERhdGVJbnB1dCkgdGhpcy5zdGFydERhdGVJbnB1dC52YWx1ZSA9IFwiXCI7XHJcblx0XHRpZiAodGhpcy5kdWVEYXRlSW5wdXQpIHRoaXMuZHVlRGF0ZUlucHV0LnZhbHVlID0gXCJcIjtcclxuXHRcdGlmICh0aGlzLnNjaGVkdWxlZERhdGVJbnB1dCkgdGhpcy5zY2hlZHVsZWREYXRlSW5wdXQudmFsdWUgPSBcIlwiO1xyXG5cclxuXHRcdC8vIENsZWFyIGZpbGUgbmFtZSBpbnB1dFxyXG5cdFx0aWYgKHRoaXMuZmlsZU5hbWVJbnB1dCkge1xyXG5cdFx0XHR0aGlzLmZpbGVOYW1lSW5wdXQuY2xlYXIoKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDbGVhciBwcmV2aWV3XHJcblx0XHRpZiAodGhpcy5wcmV2aWV3Q29udGFpbmVyRWwpIHtcclxuXHRcdFx0dGhpcy5wcmV2aWV3Q29udGFpbmVyRWwuZW1wdHkoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENhbGxlZCB3aGVuIG1vZGFsIGlzIGNsb3NlZFxyXG5cdCAqL1xyXG5cdG9uQ2xvc2UoKSB7XHJcblx0XHQvLyBTYXZlIGxhc3QgdXNlZCBtb2RlIGlmIGVuYWJsZWRcclxuXHRcdGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUucmVtZW1iZXJMYXN0TW9kZSkge1xyXG5cdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUubGFzdFVzZWRNb2RlID0gdGhpcy5jdXJyZW50TW9kZTtcclxuXHRcdFx0dGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2xlYW4gdXBcclxuXHRcdGlmICh0aGlzLnVuaXZlcnNhbFN1Z2dlc3QpIHtcclxuXHRcdFx0dGhpcy51bml2ZXJzYWxTdWdnZXN0LmRpc2FibGUoKTtcclxuXHRcdFx0dGhpcy51bml2ZXJzYWxTdWdnZXN0ID0gbnVsbDtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAodGhpcy5wYXJzZURlYm91bmNlVGltZXIpIHtcclxuXHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMucGFyc2VEZWJvdW5jZVRpbWVyKTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAodGhpcy5tYXJrZG93blJlbmRlcmVyKSB7XHJcblx0XHRcdHRoaXMubWFya2Rvd25SZW5kZXJlci51bmxvYWQoKTtcclxuXHRcdFx0dGhpcy5tYXJrZG93blJlbmRlcmVyID0gbnVsbDtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAodGhpcy5maWxlTmFtZUlucHV0KSB7XHJcblx0XHRcdHRoaXMuZmlsZU5hbWVJbnB1dC5kZXN0cm95KCk7XHJcblx0XHRcdHRoaXMuZmlsZU5hbWVJbnB1dCA9IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0c3VwZXIub25DbG9zZSgpO1xyXG5cdH1cclxufVxyXG4iXX0=