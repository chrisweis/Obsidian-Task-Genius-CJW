import { __awaiter } from "tslib";
import { Modal, Setting, Notice, Platform, moment, } from "obsidian";
import { createEmbeddableMarkdownEditor, } from "@/editor-extensions/core/markdown-editor";
import { saveCapture, } from "@/utils/file/file-operations";
import { FileSuggest } from "@/components/ui/inputs/AutoComplete";
import { t } from "@/translations/helper";
import { MarkdownRendererComponent } from "@/components/ui/renderers/MarkdownRenderer";
import { StatusComponent } from "@/components/ui/feedback/StatusIndicator";
import { ContextSuggest, ProjectSuggest, } from "@/components/ui/inputs/AutoComplete";
import { TimeParsingService, DEFAULT_TIME_PARSING_CONFIG, } from "@/services/time-parsing-service";
import { SuggestManager, } from "@/components/ui/suggest";
/**
 * Sanitize filename by replacing unsafe characters with safe alternatives
 * This function only sanitizes the filename part, not directory separators
 * @param filename - The filename to sanitize
 * @returns The sanitized filename
 */
function sanitizeFilename(filename) {
    // Replace unsafe characters with safe alternatives, but keep forward slashes for paths
    return filename
        .replace(/[<>:"|*?\\]/g, "-") // Replace unsafe chars with dash
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim(); // Remove leading/trailing whitespace
}
/**
 * Sanitize a file path by sanitizing only the filename part while preserving directory structure
 * @param filePath - The file path to sanitize
 * @returns The sanitized file path
 */
function sanitizeFilePath(filePath) {
    const pathParts = filePath.split("/");
    // Sanitize each part of the path except preserve the directory structure
    const sanitizedParts = pathParts.map((part, index) => {
        // For the last part (filename), we can be more restrictive
        if (index === pathParts.length - 1) {
            return sanitizeFilename(part);
        }
        // For directory names, we still need to avoid problematic characters but can be less restrictive
        return part
            .replace(/[<>:"|*?\\]/g, "-")
            .replace(/\s+/g, " ")
            .trim();
    });
    return sanitizedParts.join("/");
}
export class QuickCaptureModal extends Modal {
    constructor(app, plugin, metadata, useFullFeaturedMode = false) {
        super(app);
        this.markdownEditor = null;
        this.capturedContent = "";
        this.tempTargetFilePath = "";
        this.taskMetadata = {};
        this.useFullFeaturedMode = false;
        this.previewContainerEl = null;
        this.markdownRenderer = null;
        this.preferMetadataFormat = "tasks";
        this.universalSuggest = null;
        this.plugin = plugin;
        // Initialize suggest manager
        this.suggestManager = new SuggestManager(app, plugin);
        // Initialize target file path based on target type
        if (this.plugin.settings.quickCapture.targetType === "daily-note") {
            const dateStr = moment().format(this.plugin.settings.quickCapture.dailyNoteSettings.format);
            // For daily notes, the format might include path separators (e.g., YYYY-MM/YYYY-MM-DD)
            // We need to preserve the path structure and only sanitize the final filename
            const pathWithDate = this.plugin.settings.quickCapture
                .dailyNoteSettings.folder
                ? `${this.plugin.settings.quickCapture.dailyNoteSettings.folder}/${dateStr}.md`
                : `${dateStr}.md`;
            this.tempTargetFilePath = sanitizeFilePath(pathWithDate);
        }
        else {
            this.tempTargetFilePath =
                this.plugin.settings.quickCapture.targetFile;
        }
        this.preferMetadataFormat = this.plugin.settings.preferMetadataFormat;
        // Initialize time parsing service
        this.timeParsingService = new TimeParsingService(this.plugin.settings.timeParsing || DEFAULT_TIME_PARSING_CONFIG);
        if (metadata) {
            this.taskMetadata = metadata;
        }
        this.useFullFeaturedMode = useFullFeaturedMode && !Platform.isPhone;
    }
    onOpen() {
        const { contentEl } = this;
        this.modalEl.toggleClass("quick-capture-modal", true);
        // Start managing suggests with high priority
        this.suggestManager.startManaging();
        if (this.useFullFeaturedMode) {
            this.modalEl.toggleClass(["quick-capture-modal", "full"], true);
            this.createFullFeaturedModal(contentEl);
        }
        else {
            this.createSimpleModal(contentEl);
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
    createSimpleModal(contentEl) {
        this.titleEl.createDiv({
            text: t("Capture to"),
        });
        const targetFileEl = this.titleEl.createEl("div", {
            cls: "quick-capture-target",
            attr: {
                contenteditable: this.plugin.settings.quickCapture.targetType === "fixed"
                    ? "true"
                    : "false",
                spellcheck: "false",
            },
            text: this.tempTargetFilePath,
        });
        // Create container for the editor
        const editorContainer = contentEl.createDiv({
            cls: "quick-capture-modal-editor",
        });
        this.setupMarkdownEditor(editorContainer, targetFileEl);
        // Create button container
        const buttonContainer = contentEl.createDiv({
            cls: "quick-capture-modal-buttons",
        });
        // Create the buttons
        const submitButton = buttonContainer.createEl("button", {
            text: t("Capture"),
            cls: "mod-cta",
        });
        submitButton.addEventListener("click", () => this.handleSubmit());
        const cancelButton = buttonContainer.createEl("button", {
            text: t("Cancel"),
        });
        cancelButton.addEventListener("click", () => this.close());
        // Only add file suggest for fixed file type
        if (this.plugin.settings.quickCapture.targetType === "fixed") {
            new FileSuggest(this.app, targetFileEl, this.plugin.settings.quickCapture, (file) => {
                var _a, _b;
                targetFileEl.textContent = file.path;
                this.tempTargetFilePath = file.path;
                // Focus current editor
                (_b = (_a = this.markdownEditor) === null || _a === void 0 ? void 0 : _a.editor) === null || _b === void 0 ? void 0 : _b.focus();
            });
        }
    }
    createFullFeaturedModal(contentEl) {
        // Create a layout container with two panels
        const layoutContainer = contentEl.createDiv({
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
        // Target file selector
        const targetFileContainer = configPanel.createDiv({
            cls: "quick-capture-target-container",
        });
        targetFileContainer.createDiv({
            text: t("Target File:"),
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
        // Task metadata configuration
        configPanel.createDiv({
            text: t("Task Properties"),
            cls: "quick-capture-section-title",
        });
        // // Parsed time expressions display
        // const parsedTimeContainer = configPanel.createDiv({
        // 	cls: "quick-capture-parsed-time",
        // });
        // const parsedTimeTitle = parsedTimeContainer.createDiv({
        // 	text: t("Parsed Time Expressions"),
        // 	cls: "quick-capture-section-subtitle",
        // });
        // this.parsedTimeDisplayEl = parsedTimeContainer.createDiv({
        // 	cls: "quick-capture-parsed-time-display",
        // });
        const statusComponent = new StatusComponent(this.plugin, configPanel, {
            status: this.taskMetadata.status,
        }, {
            type: "quick-capture",
            onTaskStatusSelected: (status) => {
                this.taskMetadata.status = status;
                this.updatePreview();
            },
        });
        statusComponent.load();
        // Start Date
        new Setting(configPanel).setName(t("Start Date")).addText((text) => {
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
                    // Reset manual flag when cleared
                    if (this.taskMetadata.manuallySet) {
                        this.taskMetadata.manuallySet.startDate = false;
                    }
                }
                this.updatePreview();
            });
            text.inputEl.type = "date";
            // Store reference for updating from parsed dates
            this.startDateInput = text.inputEl;
        });
        // Due Date
        new Setting(configPanel).setName(t("Due Date")).addText((text) => {
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
                    // Reset manual flag when cleared
                    if (this.taskMetadata.manuallySet) {
                        this.taskMetadata.manuallySet.dueDate = false;
                    }
                }
                this.updatePreview();
            });
            text.inputEl.type = "date";
            // Store reference for updating from parsed dates
            this.dueDateInput = text.inputEl;
        });
        // Scheduled Date
        new Setting(configPanel)
            .setName(t("Scheduled Date"))
            .addText((text) => {
            text.setPlaceholder("YYYY-MM-DD")
                .setValue(this.taskMetadata.scheduledDate
                ? this.formatDate(this.taskMetadata.scheduledDate)
                : "")
                .onChange((value) => {
                if (value) {
                    this.taskMetadata.scheduledDate =
                        this.parseDate(value);
                    this.markAsManuallySet("scheduledDate");
                }
                else {
                    this.taskMetadata.scheduledDate = undefined;
                    // Reset manual flag when cleared
                    if (this.taskMetadata.manuallySet) {
                        this.taskMetadata.manuallySet.scheduledDate =
                            false;
                    }
                }
                this.updatePreview();
            });
            text.inputEl.type = "date";
            // Store reference for updating from parsed dates
            this.scheduledDateInput = text.inputEl;
        });
        // Priority
        new Setting(configPanel)
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
        // Project
        new Setting(configPanel).setName(t("Project")).addText((text) => {
            new ProjectSuggest(this.app, text.inputEl, this.plugin);
            text.setPlaceholder(t("Project name"))
                .setValue(this.taskMetadata.project || "")
                .onChange((value) => {
                this.taskMetadata.project = value || undefined;
                this.updatePreview();
            });
        });
        // Context
        new Setting(configPanel).setName(t("Context")).addText((text) => {
            new ContextSuggest(this.app, text.inputEl, this.plugin);
            text.setPlaceholder(t("Context"))
                .setValue(this.taskMetadata.context || "")
                .onChange((value) => {
                this.taskMetadata.context = value || undefined;
                this.updatePreview();
            });
        });
        // Recurrence
        new Setting(configPanel).setName(t("Recurrence")).addText((text) => {
            text.setPlaceholder(t("e.g., every day, every week"))
                .setValue(this.taskMetadata.recurrence || "")
                .onChange((value) => {
                this.taskMetadata.recurrence = value || undefined;
                this.updatePreview();
            });
        });
        // Create editor container in the right panel
        const editorContainer = editorPanel.createDiv({
            cls: "quick-capture-modal-editor",
        });
        editorPanel.createDiv({
            text: t("Task Content"),
            cls: "quick-capture-section-title",
        });
        this.previewContainerEl = editorPanel.createDiv({
            cls: "preview-container",
        });
        this.markdownRenderer = new MarkdownRendererComponent(this.app, this.previewContainerEl, "", false);
        this.setupMarkdownEditor(editorContainer);
        // Create button container
        const buttonContainer = contentEl.createDiv({
            cls: "quick-capture-modal-buttons",
        });
        // Create the buttons
        const submitButton = buttonContainer.createEl("button", {
            text: t("Capture"),
            cls: "mod-cta",
        });
        submitButton.addEventListener("click", () => this.handleSubmit());
        const cancelButton = buttonContainer.createEl("button", {
            text: t("Cancel"),
        });
        cancelButton.addEventListener("click", () => this.close());
    }
    updatePreview() {
        var _a;
        if (this.previewContainerEl) {
            (_a = this.markdownRenderer) === null || _a === void 0 ? void 0 : _a.render(this.processContentWithMetadata(this.capturedContent));
        }
    }
    setupMarkdownEditor(container, targetFileEl) {
        // Create the markdown editor with our EmbeddableMarkdownEditor
        setTimeout(() => {
            var _a, _b, _c, _d;
            this.markdownEditor = createEmbeddableMarkdownEditor(this.app, container, {
                placeholder: this.plugin.settings.quickCapture.placeholder,
                onEnter: (editor, mod, shift) => {
                    if (mod) {
                        // Submit on Cmd/Ctrl+Enter
                        this.handleSubmit();
                        return true;
                    }
                    // Allow normal Enter key behavior
                    return false;
                },
                onEscape: (editor) => {
                    // Close the modal on Escape
                    this.close();
                },
                onSubmit: (editor) => {
                    this.handleSubmit();
                },
                onChange: (update) => {
                    var _a;
                    // Handle changes if needed
                    this.capturedContent = ((_a = this.markdownEditor) === null || _a === void 0 ? void 0 : _a.value) || "";
                    // Clear previous debounce timer
                    if (this.parseDebounceTimer) {
                        clearTimeout(this.parseDebounceTimer);
                    }
                    // Debounce time parsing to avoid excessive parsing on rapid typing
                    this.parseDebounceTimer = window.setTimeout(() => {
                        this.performRealTimeParsing();
                    }, 300); // 300ms debounce
                    // Update preview immediately for better responsiveness
                    if (this.updatePreview) {
                        this.updatePreview();
                    }
                },
            });
            (_a = this.markdownEditor) === null || _a === void 0 ? void 0 : _a.scope.register(["Alt"], "c", (e) => {
                e.preventDefault();
                if (!this.markdownEditor)
                    return false;
                if (this.markdownEditor.value.trim() === "") {
                    this.close();
                    return true;
                }
                else {
                    this.handleSubmit();
                }
                return true;
            });
            if (targetFileEl) {
                (_b = this.markdownEditor) === null || _b === void 0 ? void 0 : _b.scope.register(["Alt"], "x", (e) => {
                    e.preventDefault();
                    // Only allow focus on target file if it's editable (fixed file type)
                    if (this.plugin.settings.quickCapture.targetType ===
                        "fixed") {
                        targetFileEl.focus();
                    }
                    return true;
                });
            }
            // Focus the editor when it's created
            (_d = (_c = this.markdownEditor) === null || _c === void 0 ? void 0 : _c.editor) === null || _d === void 0 ? void 0 : _d.focus();
        }, 50);
    }
    handleSubmit() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const content = this.capturedContent.trim() ||
                ((_a = this.markdownEditor) === null || _a === void 0 ? void 0 : _a.value.trim()) ||
                "";
            if (!content) {
                new Notice(t("Nothing to capture"));
                return;
            }
            try {
                const processedContent = this.processContentWithMetadata(content);
                // Create options with current settings
                const captureOptions = Object.assign(Object.assign({}, this.plugin.settings.quickCapture), { targetFile: this.tempTargetFilePath });
                yield saveCapture(this.app, processedContent, captureOptions);
                new Notice(t("Captured successfully"));
                this.close();
            }
            catch (error) {
                new Notice(`${t("Failed to save:")} ${error}`);
            }
        });
    }
    processContentWithMetadata(content) {
        var _a;
        // Step 1: Split content into lines FIRST to preserve line structure
        const lines = content.split("\n");
        const processedLines = [];
        const indentationRegex = /^(\s+)/;
        // Step 2: Process each line individually
        for (const line of lines) {
            if (!line.trim()) {
                processedLines.push(line);
                continue;
            }
            // Step 3: Parse time expressions for THIS line only
            const lineParseResult = this.timeParsingService.parseTimeExpressionsForLine(line);
            // Step 4: Use cleaned line content (with time expressions removed from this line)
            const cleanedLine = lineParseResult.cleanedLine;
            // Step 5: Check for indentation to identify sub-tasks
            const indentMatch = line.match(indentationRegex);
            const isSubTask = indentMatch && indentMatch[1].length > 0;
            // Step 6: Check if line is already a task or a list item
            const isTaskOrList = cleanedLine
                .trim()
                .match(/^(-|\d+\.|\*|\+)(\s+\[[^\]\[]+\])?/);
            if (isSubTask) {
                // Don't add metadata to sub-tasks, but still clean time expressions
                // Preserve the original indentation from the original line
                const originalIndent = indentMatch[1];
                const cleanedContent = this.cleanTemporaryMarks(cleanedLine.trim());
                processedLines.push(originalIndent + cleanedContent);
            }
            else if (isTaskOrList) {
                // If it's a task, add line-specific metadata
                if (cleanedLine.trim().match(/^(-|\d+\.|\*|\+)\s+\[[^\]]+\]/)) {
                    processedLines.push(this.addLineMetadataToTask(cleanedLine, lineParseResult));
                }
                else {
                    // If it's a list item but not a task, convert to task and add line-specific metadata
                    const listPrefix = (_a = cleanedLine
                        .trim()
                        .match(/^(-|\d+\.|\*|\+)/)) === null || _a === void 0 ? void 0 : _a[0];
                    const restOfLine = this.cleanTemporaryMarks(cleanedLine
                        .trim()
                        .substring((listPrefix === null || listPrefix === void 0 ? void 0 : listPrefix.length) || 0)
                        .trim());
                    // Use the specified status or default to empty checkbox
                    const statusMark = this.taskMetadata.status || " ";
                    const taskLine = `${listPrefix} [${statusMark}] ${restOfLine}`;
                    processedLines.push(this.addLineMetadataToTask(taskLine, lineParseResult));
                }
            }
            else {
                // Not a list item or task, convert to task and add line-specific metadata
                // Use the specified status or default to empty checkbox
                const statusMark = this.taskMetadata.status || " ";
                const cleanedContent = this.cleanTemporaryMarks(cleanedLine);
                const taskLine = `- [${statusMark}] ${cleanedContent}`;
                processedLines.push(this.addLineMetadataToTask(taskLine, lineParseResult));
            }
        }
        return processedLines.join("\n");
    }
    addMetadataToTask(taskLine) {
        const metadata = this.generateMetadataString();
        if (!metadata)
            return taskLine;
        return `${taskLine} ${metadata}`.trim();
    }
    /**
     * Add line-specific metadata to a task line
     * @param taskLine - The task line to add metadata to
     * @param lineParseResult - Parse result for this specific line
     * @returns Task line with line-specific metadata
     */
    addLineMetadataToTask(taskLine, lineParseResult) {
        const metadata = this.generateLineMetadata(lineParseResult);
        if (!metadata)
            return taskLine;
        return `${taskLine} ${metadata}`.trim();
    }
    /**
     * Generate metadata string for a specific line using line-specific dates
     * @param lineParseResult - Parse result for this specific line
     * @returns Metadata string for this line
     */
    generateLineMetadata(lineParseResult) {
        var _a, _b, _c, _d;
        const metadata = [];
        const useDataviewFormat = this.preferMetadataFormat === "dataview";
        // Use line-specific dates first, fall back to global metadata
        const startDate = lineParseResult.startDate || this.taskMetadata.startDate;
        const dueDate = lineParseResult.dueDate || this.taskMetadata.dueDate;
        const scheduledDate = lineParseResult.scheduledDate || this.taskMetadata.scheduledDate;
        // Format dates to strings in YYYY-MM-DD format
        if (startDate) {
            const formattedStartDate = this.formatDate(startDate);
            metadata.push(useDataviewFormat
                ? `[start:: ${formattedStartDate}]`
                : `🛫 ${formattedStartDate}`);
        }
        if (dueDate) {
            const formattedDueDate = this.formatDate(dueDate);
            metadata.push(useDataviewFormat
                ? `[due:: ${formattedDueDate}]`
                : `📅 ${formattedDueDate}`);
        }
        if (scheduledDate) {
            const formattedScheduledDate = this.formatDate(scheduledDate);
            metadata.push(useDataviewFormat
                ? `[scheduled:: ${formattedScheduledDate}]`
                : `⏳ ${formattedScheduledDate}`);
        }
        // Add priority if set (use global metadata)
        if (this.taskMetadata.priority) {
            if (useDataviewFormat) {
                // 使用 dataview 格式
                let priorityValue;
                switch (this.taskMetadata.priority) {
                    case 5:
                        priorityValue = "highest";
                        break;
                    case 4:
                        priorityValue = "high";
                        break;
                    case 3:
                        priorityValue = "medium";
                        break;
                    case 2:
                        priorityValue = "low";
                        break;
                    case 1:
                        priorityValue = "lowest";
                        break;
                    default:
                        priorityValue = this.taskMetadata.priority;
                }
                metadata.push(`[priority:: ${priorityValue}]`);
            }
            else {
                // 使用 emoji 格式
                let priorityMarker = "";
                switch (this.taskMetadata.priority) {
                    case 5:
                        priorityMarker = "🔺";
                        break; // Highest
                    case 4:
                        priorityMarker = "⏫";
                        break; // High
                    case 3:
                        priorityMarker = "🔼";
                        break; // Medium
                    case 2:
                        priorityMarker = "🔽";
                        break; // Low
                    case 1:
                        priorityMarker = "⏬";
                        break; // Lowest
                }
                if (priorityMarker) {
                    metadata.push(priorityMarker);
                }
            }
        }
        // Add project if set (use global metadata)
        if (this.taskMetadata.project) {
            if (useDataviewFormat) {
                const projectPrefix = ((_a = this.plugin.settings.projectTagPrefix) === null || _a === void 0 ? void 0 : _a[this.plugin.settings.preferMetadataFormat]) || "project";
                metadata.push(`[${projectPrefix}:: ${this.taskMetadata.project}]`);
            }
            else {
                const projectPrefix = ((_b = this.plugin.settings.projectTagPrefix) === null || _b === void 0 ? void 0 : _b[this.plugin.settings.preferMetadataFormat]) || "project";
                metadata.push(`#${projectPrefix}/${this.taskMetadata.project}`);
            }
        }
        // Add context if set (use global metadata)
        if (this.taskMetadata.context) {
            if (useDataviewFormat) {
                const contextPrefix = ((_c = this.plugin.settings.contextTagPrefix) === null || _c === void 0 ? void 0 : _c[this.plugin.settings.preferMetadataFormat]) || "context";
                metadata.push(`[${contextPrefix}:: ${this.taskMetadata.context}]`);
            }
            else {
                const contextPrefix = ((_d = this.plugin.settings.contextTagPrefix) === null || _d === void 0 ? void 0 : _d[this.plugin.settings.preferMetadataFormat]) || "@";
                metadata.push(`${contextPrefix}${this.taskMetadata.context}`);
            }
        }
        // Add recurrence if set (use global metadata)
        if (this.taskMetadata.recurrence) {
            metadata.push(useDataviewFormat
                ? `[repeat:: ${this.taskMetadata.recurrence}]`
                : `🔁 ${this.taskMetadata.recurrence}`);
        }
        return metadata.join(" ");
    }
    generateMetadataString() {
        const metadata = [];
        const useDataviewFormat = this.preferMetadataFormat === "dataview";
        // Format dates to strings in YYYY-MM-DD format
        if (this.taskMetadata.startDate) {
            const formattedStartDate = this.formatDate(this.taskMetadata.startDate);
            metadata.push(useDataviewFormat
                ? `[start:: ${formattedStartDate}]`
                : `🛫 ${formattedStartDate}`);
        }
        if (this.taskMetadata.dueDate) {
            const formattedDueDate = this.formatDate(this.taskMetadata.dueDate);
            metadata.push(useDataviewFormat
                ? `[due:: ${formattedDueDate}]`
                : `📅 ${formattedDueDate}`);
        }
        if (this.taskMetadata.scheduledDate) {
            const formattedScheduledDate = this.formatDate(this.taskMetadata.scheduledDate);
            metadata.push(useDataviewFormat
                ? `[scheduled:: ${formattedScheduledDate}]`
                : `⏳ ${formattedScheduledDate}`);
        }
        // Add priority if set
        if (this.taskMetadata.priority) {
            if (useDataviewFormat) {
                // 使用 dataview 格式
                let priorityValue;
                switch (this.taskMetadata.priority) {
                    case 5:
                        priorityValue = "highest";
                        break;
                    case 4:
                        priorityValue = "high";
                        break;
                    case 3:
                        priorityValue = "medium";
                        break;
                    case 2:
                        priorityValue = "low";
                        break;
                    case 1:
                        priorityValue = "lowest";
                        break;
                    default:
                        priorityValue = this.taskMetadata.priority;
                }
                metadata.push(`[priority:: ${priorityValue}]`);
            }
            else {
                // 使用 emoji 格式
                let priorityMarker = "";
                switch (this.taskMetadata.priority) {
                    case 5:
                        priorityMarker = "🔺";
                        break; // Highest
                    case 4:
                        priorityMarker = "⏫";
                        break; // High
                    case 3:
                        priorityMarker = "🔼";
                        break; // Medium
                    case 2:
                        priorityMarker = "🔽";
                        break; // Low
                    case 1:
                        priorityMarker = "⏬";
                        break; // Lowest
                }
                if (priorityMarker) {
                    metadata.push(priorityMarker);
                }
            }
        }
        // Add project if set
        if (this.taskMetadata.project) {
            if (useDataviewFormat) {
                const projectPrefix = this.plugin.settings.projectTagPrefix[this.plugin.settings.preferMetadataFormat] || "project";
                metadata.push(`[${projectPrefix}:: ${this.taskMetadata.project}]`);
            }
            else {
                const projectPrefix = this.plugin.settings.projectTagPrefix[this.plugin.settings.preferMetadataFormat] || "project";
                metadata.push(`#${projectPrefix}/${this.taskMetadata.project}`);
            }
        }
        // Add context if set
        if (this.taskMetadata.context) {
            if (useDataviewFormat) {
                const contextPrefix = this.plugin.settings.contextTagPrefix[this.plugin.settings.preferMetadataFormat] || "context";
                metadata.push(`[${contextPrefix}:: ${this.taskMetadata.context}]`);
            }
            else {
                const contextPrefix = this.plugin.settings.contextTagPrefix[this.plugin.settings.preferMetadataFormat] || "@";
                metadata.push(`${contextPrefix}${this.taskMetadata.context}`);
            }
        }
        // Add recurrence if set
        if (this.taskMetadata.recurrence) {
            metadata.push(useDataviewFormat
                ? `[repeat:: ${this.taskMetadata.recurrence}]`
                : `🔁 ${this.taskMetadata.recurrence}`);
        }
        return metadata.join(" ");
    }
    formatDate(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }
    parseDate(dateString) {
        const [year, month, day] = dateString.split("-").map(Number);
        return new Date(year, month - 1, day); // month is 0-indexed in JavaScript Date
    }
    /**
     * Check if a metadata field was manually set by the user
     * @param field - The field name to check
     * @returns True if the field was manually set
     */
    isManuallySet(field) {
        var _a;
        return ((_a = this.taskMetadata.manuallySet) === null || _a === void 0 ? void 0 : _a[field]) || false;
    }
    /**
     * Mark a metadata field as manually set
     * @param field - The field name to mark
     */
    markAsManuallySet(field) {
        if (!this.taskMetadata.manuallySet) {
            this.taskMetadata.manuallySet = {};
        }
        this.taskMetadata.manuallySet[field] = true;
    }
    /**
     * Clean temporary marks from user input that might conflict with formal metadata
     */
    cleanTemporaryMarks(content) {
        let cleaned = content;
        // Remove standalone exclamation marks that users might type for priority
        cleaned = cleaned.replace(/\s*!\s*/g, " ");
        // Remove standalone tilde marks that users might type for date
        cleaned = cleaned.replace(/\s*~\s*/g, " ");
        // Remove standalone priority symbols that users might type
        cleaned = cleaned.replace(/\s*[🔺⏫🔼🔽⏬️]\s*/g, " ");
        // Remove standalone date symbols that users might type
        cleaned = cleaned.replace(/\s*[📅🛫⏳✅➕❌]\s*/g, " ");
        // Remove location/folder symbols that users might type
        cleaned = cleaned.replace(/\s*[📁🏠🏢🏪🏫🏬🏭🏯🏰]\s*/g, " ");
        // Remove other metadata symbols that users might type
        cleaned = cleaned.replace(/\s*[🆔⛔🏁🔁]\s*/g, " ");
        // Remove target/location prefix patterns (like @location, target:)
        cleaned = cleaned.replace(/\s*@\w*\s*/g, " ");
        cleaned = cleaned.replace(/\s*target:\s*/gi, " ");
        // Clean up multiple spaces and trim
        cleaned = cleaned.replace(/\s+/g, " ").trim();
        return cleaned;
    }
    /**
     * Perform real-time parsing with debouncing
     */
    performRealTimeParsing() {
        if (!this.capturedContent)
            return;
        // Parse each line separately to get per-line results
        const lines = this.capturedContent.split("\n");
        const lineParseResults = this.timeParsingService.parseTimeExpressionsPerLine(lines);
        // Aggregate dates from all lines to update global metadata (only if not manually set)
        let aggregatedStartDate;
        let aggregatedDueDate;
        let aggregatedScheduledDate;
        // Find the first occurrence of each date type across all lines
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
        // Update task metadata with aggregated dates (only if not manually set)
        if (aggregatedStartDate && !this.isManuallySet("startDate")) {
            this.taskMetadata.startDate = aggregatedStartDate;
            // Update UI input field
            if (this.startDateInput) {
                this.startDateInput.value =
                    this.formatDate(aggregatedStartDate);
            }
        }
        if (aggregatedDueDate && !this.isManuallySet("dueDate")) {
            this.taskMetadata.dueDate = aggregatedDueDate;
            // Update UI input field
            if (this.dueDateInput) {
                this.dueDateInput.value = this.formatDate(aggregatedDueDate);
            }
        }
        if (aggregatedScheduledDate && !this.isManuallySet("scheduledDate")) {
            this.taskMetadata.scheduledDate = aggregatedScheduledDate;
            // Update UI input field
            if (this.scheduledDateInput) {
                this.scheduledDateInput.value = this.formatDate(aggregatedScheduledDate);
            }
        }
    }
    /**
     * Update the parsed time expressions display
     * @param parseResult - The result from time parsing
     */
    // updateParsedTimeDisplay(parseResult: ParsedTimeResult): void {
    // 	if (!this.parsedTimeDisplayEl) return;
    // 	this.parsedTimeDisplayEl.empty();
    // 	if (parseResult.parsedExpressions.length === 0) {
    // 		this.parsedTimeDisplayEl.createDiv({
    // 			text: t("No time expressions found"),
    // 			cls: "quick-capture-no-expressions",
    // 		});
    // 		return;
    // 	}
    // 	parseResult.parsedExpressions.forEach((expression, index) => {
    // 		const expressionEl = this.parsedTimeDisplayEl!.createDiv({
    // 			cls: "quick-capture-expression-item",
    // 		});
    // 		const textEl = expressionEl.createSpan({
    // 			text: `"${expression.text}"`,
    // 			cls: "quick-capture-expression-text",
    // 		});
    // 		const arrowEl = expressionEl.createSpan({
    // 			text: " → ",
    // 			cls: "quick-capture-expression-arrow",
    // 		});
    // 		const dateEl = expressionEl.createSpan({
    // 			text: this.formatDate(expression.date),
    // 			cls: "quick-capture-expression-date",
    // 		});
    // 		const typeEl = expressionEl.createSpan({
    // 			text: ` (${expression.type})`,
    // 			cls: `quick-capture-expression-type quick-capture-type-${expression.type}`,
    // 		});
    // 	});
    // }
    onClose() {
        const { contentEl } = this;
        // Clean up universal suggest
        if (this.universalSuggest) {
            this.universalSuggest.disable();
            this.universalSuggest = null;
        }
        // Stop managing suggests and restore original order
        this.suggestManager.stopManaging();
        // Clear debounce timer
        if (this.parseDebounceTimer) {
            clearTimeout(this.parseDebounceTimer);
            this.parseDebounceTimer = undefined;
        }
        // Clean up the markdown editor
        if (this.markdownEditor) {
            this.markdownEditor.destroy();
            this.markdownEditor = null;
        }
        // Clear the content
        contentEl.empty();
        if (this.markdownRenderer) {
            this.markdownRenderer.unload();
            this.markdownRenderer = null;
        }
    }
    /**
     * Update TimeParsingService configuration when settings change
     */
    updateTimeParsingSettings(timeParsingConfig) {
        if (this.timeParsingService) {
            this.timeParsingService.updateConfig(timeParsingConfig);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUXVpY2tDYXB0dXJlTW9kYWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJRdWlja0NhcHR1cmVNb2RhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUVOLEtBQUssRUFDTCxPQUFPLEVBRVAsTUFBTSxFQUNOLFFBQVEsRUFFUixNQUFNLEdBQ04sTUFBTSxVQUFVLENBQUM7QUFDbEIsT0FBTyxFQUNOLDhCQUE4QixHQUU5QixNQUFNLDBDQUEwQyxDQUFDO0FBRWxELE9BQU8sRUFDTixXQUFXLEdBRVgsTUFBTSw4QkFBOEIsQ0FBQztBQUN0QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEUsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzFDLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUUzRSxPQUFPLEVBQ04sY0FBYyxFQUNkLGNBQWMsR0FDZCxNQUFNLHFDQUFxQyxDQUFDO0FBQzdDLE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsMkJBQTJCLEdBRzNCLE1BQU0saUNBQWlDLENBQUM7QUFDekMsT0FBTyxFQUNOLGNBQWMsR0FFZCxNQUFNLHlCQUF5QixDQUFDO0FBbUJqQzs7Ozs7R0FLRztBQUNILFNBQVMsZ0JBQWdCLENBQUMsUUFBZ0I7SUFDekMsdUZBQXVGO0lBQ3ZGLE9BQU8sUUFBUTtTQUNiLE9BQU8sQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLENBQUMsaUNBQWlDO1NBQzlELE9BQU8sQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsdUJBQXVCO1NBQzVDLElBQUksRUFBRSxDQUFDLENBQUMscUNBQXFDO0FBQ2hELENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsU0FBUyxnQkFBZ0IsQ0FBQyxRQUFnQjtJQUN6QyxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMs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QUksQ0FBQztRQUUzQiw2QkFBNkI7UUFDN0IsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUU7WUFDMUIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7U0FDN0I7UUFFRCxvREFBb0Q7UUFDcEQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUVuQyx1QkFBdUI7UUFDdkIsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUU7WUFDNUIsWUFBWSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBQ3RDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxTQUFTLENBQUM7U0FDcEM7UUFFRCwrQkFBK0I7UUFDL0IsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFO1lBQ3hCLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDOUIsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7U0FDM0I7UUFFRCxvQkFBb0I7UUFDcEIsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRWxCLElBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFO1lBQzFCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO1NBQzdCO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0gseUJBQXlCLENBQUMsaUJBQXNCO1FBQy9DLElBQUksSUFBSSxDQUFDLGtCQUFrQixFQUFFO1lBQzVCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsQ0FBQztTQUN4RDtJQUNGLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XHJcblx0QXBwLFxyXG5cdE1vZGFsLFxyXG5cdFNldHRpbmcsXHJcblx0VEZpbGUsXHJcblx0Tm90aWNlLFxyXG5cdFBsYXRmb3JtLFxyXG5cdE1hcmtkb3duUmVuZGVyZXIsXHJcblx0bW9tZW50LFxyXG59IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQge1xyXG5cdGNyZWF0ZUVtYmVkZGFibGVNYXJrZG93bkVkaXRvcixcclxuXHRFbWJlZGRhYmxlTWFya2Rvd25FZGl0b3IsXHJcbn0gZnJvbSBcIkAvZWRpdG9yLWV4dGVuc2lvbnMvY29yZS9tYXJrZG93bi1lZGl0b3JcIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5pbXBvcnQge1xyXG5cdHNhdmVDYXB0dXJlLFxyXG5cdHByb2Nlc3NEYXRlVGVtcGxhdGVzLFxyXG59IGZyb20gXCJAL3V0aWxzL2ZpbGUvZmlsZS1vcGVyYXRpb25zXCI7XHJcbmltcG9ydCB7IEZpbGVTdWdnZXN0IH0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9pbnB1dHMvQXV0b0NvbXBsZXRlXCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCB7IE1hcmtkb3duUmVuZGVyZXJDb21wb25lbnQgfSBmcm9tIFwiQC9jb21wb25lbnRzL3VpL3JlbmRlcmVycy9NYXJrZG93blJlbmRlcmVyXCI7XHJcbmltcG9ydCB7IFN0YXR1c0NvbXBvbmVudCB9IGZyb20gXCJAL2NvbXBvbmVudHMvdWkvZmVlZGJhY2svU3RhdHVzSW5kaWNhdG9yXCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiQC90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7XHJcblx0Q29udGV4dFN1Z2dlc3QsXHJcblx0UHJvamVjdFN1Z2dlc3QsXHJcbn0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9pbnB1dHMvQXV0b0NvbXBsZXRlXCI7XHJcbmltcG9ydCB7XHJcblx0VGltZVBhcnNpbmdTZXJ2aWNlLFxyXG5cdERFRkFVTFRfVElNRV9QQVJTSU5HX0NPTkZJRyxcclxuXHRQYXJzZWRUaW1lUmVzdWx0LFxyXG5cdExpbmVQYXJzZVJlc3VsdCxcclxufSBmcm9tIFwiQC9zZXJ2aWNlcy90aW1lLXBhcnNpbmctc2VydmljZVwiO1xyXG5pbXBvcnQge1xyXG5cdFN1Z2dlc3RNYW5hZ2VyLFxyXG5cdFVuaXZlcnNhbEVkaXRvclN1Z2dlc3QsXHJcbn0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9zdWdnZXN0XCI7XHJcblxyXG5pbnRlcmZhY2UgVGFza01ldGFkYXRhIHtcclxuXHRzdGFydERhdGU/OiBEYXRlO1xyXG5cdGR1ZURhdGU/OiBEYXRlO1xyXG5cdHNjaGVkdWxlZERhdGU/OiBEYXRlO1xyXG5cdHByaW9yaXR5PzogbnVtYmVyO1xyXG5cdHByb2plY3Q/OiBzdHJpbmc7XHJcblx0Y29udGV4dD86IHN0cmluZztcclxuXHRyZWN1cnJlbmNlPzogc3RyaW5nO1xyXG5cdHN0YXR1cz86IHN0cmluZztcclxuXHQvLyBUcmFjayB3aGljaCBmaWVsZHMgd2VyZSBtYW51YWxseSBzZXQgYnkgdXNlclxyXG5cdG1hbnVhbGx5U2V0Pzoge1xyXG5cdFx0c3RhcnREYXRlPzogYm9vbGVhbjtcclxuXHRcdGR1ZURhdGU/OiBib29sZWFuO1xyXG5cdFx0c2NoZWR1bGVkRGF0ZT86IGJvb2xlYW47XHJcblx0fTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNhbml0aXplIGZpbGVuYW1lIGJ5IHJlcGxhY2luZyB1bnNhZmUgY2hhcmFjdGVycyB3aXRoIHNhZmUgYWx0ZXJuYXRpdmVzXHJcbiAqIFRoaXMgZnVuY3Rpb24gb25seSBzYW5pdGl6ZXMgdGhlIGZpbGVuYW1lIHBhcnQsIG5vdCBkaXJlY3Rvcnkgc2VwYXJhdG9yc1xyXG4gKiBAcGFyYW0gZmlsZW5hbWUgLSBUaGUgZmlsZW5hbWUgdG8gc2FuaXRpemVcclxuICogQHJldHVybnMgVGhlIHNhbml0aXplZCBmaWxlbmFtZVxyXG4gKi9cclxuZnVuY3Rpb24gc2FuaXRpemVGaWxlbmFtZShmaWxlbmFtZTogc3RyaW5nKTogc3RyaW5nIHtcclxuXHQvLyBSZXBsYWNlIHVuc2FmZSBjaGFyYWN0ZXJzIHdpdGggc2FmZSBhbHRlcm5hdGl2ZXMsIGJ1dCBrZWVwIGZvcndhcmQgc2xhc2hlcyBmb3IgcGF0aHNcclxuXHRyZXR1cm4gZmlsZW5hbWVcclxuXHRcdC5yZXBsYWNlKC9bPD46XCJ8Kj9cXFxcXS9nLCBcIi1cIikgLy8gUmVwbGFjZSB1bnNhZmUgY2hhcnMgd2l0aCBkYXNoXHJcblx0XHQucmVwbGFjZSgvXFxzKy9nLCBcIiBcIikgLy8gTm9ybWFsaXplIHdoaXRlc3BhY2VcclxuXHRcdC50cmltKCk7IC8vIFJlbW92ZSBsZWFkaW5nL3RyYWlsaW5nIHdoaXRlc3BhY2VcclxufVxyXG5cclxuLyoqXHJcbiAqIFNhbml0aXplIGEgZmlsZSBwYXRoIGJ5IHNhbml0aXppbmcgb25seSB0aGUgZmlsZW5hbWUgcGFydCB3aGlsZSBwcmVzZXJ2aW5nIGRpcmVjdG9yeSBzdHJ1Y3R1cmVcclxuICogQHBhcmFtIGZpbGVQYXRoIC0gVGhlIGZpbGUgcGF0aCB0byBzYW5pdGl6ZVxyXG4gKiBAcmV0dXJucyBUaGUgc2FuaXRpemVkIGZpbGUgcGF0aFxyXG4gKi9cclxuZnVuY3Rpb24gc2FuaXRpemVGaWxlUGF0aChmaWxlUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRjb25zdCBwYXRoUGFydHMgPSBmaWxlUGF0aC5zcGxpdChcIi9cIik7XHJcblx0Ly8gU2FuaXRpemUgZWFjaCBwYXJ0IG9mIHRoZSBwYXRoIGV4Y2VwdCBwcmVzZXJ2ZSB0aGUgZGlyZWN0b3J5IHN0cnVjdHVyZVxyXG5cdGNvbnN0IHNhbml0aXplZFBhcnRzID0gcGF0aFBhcnRzLm1hcCgocGFydCwgaW5kZXgpID0+IHtcclxuXHRcdC8vIEZvciB0aGUgbGFzdCBwYXJ0IChmaWxlbmFtZSksIHdlIGNhbiBiZSBtb3JlIHJlc3RyaWN0aXZlXHJcblx0XHRpZiAoaW5kZXggPT09IHBhdGhQYXJ0cy5sZW5ndGggLSAxKSB7XHJcblx0XHRcdHJldHVybiBzYW5pdGl6ZUZpbGVuYW1lKHBhcnQpO1xyXG5cdFx0fVxyXG5cdFx0Ly8gRm9yIGRpcmVjdG9yeSBuYW1lcywgd2Ugc3RpbGwgbmVlZCB0byBhdm9pZCBwcm9ibGVtYXRpYyBjaGFyYWN0ZXJzIGJ1dCBjYW4gYmUgbGVzcyByZXN0cmljdGl2ZVxyXG5cdFx0cmV0dXJuIHBhcnRcclxuXHRcdFx0LnJlcGxhY2UoL1s8PjpcInwqP1xcXFxdL2csIFwiLVwiKVxyXG5cdFx0XHQucmVwbGFjZSgvXFxzKy9nLCBcIiBcIilcclxuXHRcdFx0LnRyaW0oKTtcclxuXHR9KTtcclxuXHRyZXR1cm4gc2FuaXRpemVkUGFydHMuam9pbihcIi9cIik7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBRdWlja0NhcHR1cmVNb2RhbCBleHRlbmRzIE1vZGFsIHtcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbjtcclxuXHRtYXJrZG93bkVkaXRvcjogRW1iZWRkYWJsZU1hcmtkb3duRWRpdG9yIHwgbnVsbCA9IG51bGw7XHJcblx0Y2FwdHVyZWRDb250ZW50OiBzdHJpbmcgPSBcIlwiO1xyXG5cclxuXHR0ZW1wVGFyZ2V0RmlsZVBhdGg6IHN0cmluZyA9IFwiXCI7XHJcblx0dGFza01ldGFkYXRhOiBUYXNrTWV0YWRhdGEgPSB7fTtcclxuXHR1c2VGdWxsRmVhdHVyZWRNb2RlOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG5cdHByZXZpZXdDb250YWluZXJFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHRtYXJrZG93blJlbmRlcmVyOiBNYXJrZG93blJlbmRlcmVyQ29tcG9uZW50IHwgbnVsbCA9IG51bGw7XHJcblxyXG5cdHByZWZlck1ldGFkYXRhRm9ybWF0OiBcImRhdGF2aWV3XCIgfCBcInRhc2tzXCIgPSBcInRhc2tzXCI7XHJcblx0dGltZVBhcnNpbmdTZXJ2aWNlOiBUaW1lUGFyc2luZ1NlcnZpY2U7XHJcblxyXG5cdC8vIFJlZmVyZW5jZXMgdG8gZGF0ZSBpbnB1dCBlbGVtZW50cyBmb3IgdXBkYXRpbmcgZnJvbSBwYXJzZWQgZGF0ZXNcclxuXHRzdGFydERhdGVJbnB1dD86IEhUTUxJbnB1dEVsZW1lbnQ7XHJcblx0ZHVlRGF0ZUlucHV0PzogSFRNTElucHV0RWxlbWVudDtcclxuXHRzY2hlZHVsZWREYXRlSW5wdXQ/OiBIVE1MSW5wdXRFbGVtZW50O1xyXG5cclxuXHQvLyBSZWZlcmVuY2UgdG8gcGFyc2VkIHRpbWUgZXhwcmVzc2lvbnMgZGlzcGxheVxyXG5cdHBhcnNlZFRpbWVEaXNwbGF5RWw/OiBIVE1MRWxlbWVudDtcclxuXHJcblx0Ly8gRGVib3VuY2UgdGltZXIgZm9yIHJlYWwtdGltZSBwYXJzaW5nXHJcblx0cHJpdmF0ZSBwYXJzZURlYm91bmNlVGltZXI/OiBudW1iZXI7XHJcblxyXG5cdC8vIFN1Z2dlc3QgbWFuYWdlbWVudFxyXG5cdHByaXZhdGUgc3VnZ2VzdE1hbmFnZXI6IFN1Z2dlc3RNYW5hZ2VyO1xyXG5cdHByaXZhdGUgdW5pdmVyc2FsU3VnZ2VzdDogVW5pdmVyc2FsRWRpdG9yU3VnZ2VzdCB8IG51bGwgPSBudWxsO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdGFwcDogQXBwLFxyXG5cdFx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRtZXRhZGF0YT86IFRhc2tNZXRhZGF0YSxcclxuXHRcdHVzZUZ1bGxGZWF0dXJlZE1vZGU6IGJvb2xlYW4gPSBmYWxzZVxyXG5cdCkge1xyXG5cdFx0c3VwZXIoYXBwKTtcclxuXHRcdHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgc3VnZ2VzdCBtYW5hZ2VyXHJcblx0XHR0aGlzLnN1Z2dlc3RNYW5hZ2VyID0gbmV3IFN1Z2dlc3RNYW5hZ2VyKGFwcCwgcGx1Z2luKTtcclxuXHJcblx0XHQvLyBJbml0aWFsaXplIHRhcmdldCBmaWxlIHBhdGggYmFzZWQgb24gdGFyZ2V0IHR5cGVcclxuXHRcdGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUudGFyZ2V0VHlwZSA9PT0gXCJkYWlseS1ub3RlXCIpIHtcclxuXHRcdFx0Y29uc3QgZGF0ZVN0ciA9IG1vbWVudCgpLmZvcm1hdChcclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUuZGFpbHlOb3RlU2V0dGluZ3MuZm9ybWF0XHJcblx0XHRcdCk7XHJcblx0XHRcdC8vIEZvciBkYWlseSBub3RlcywgdGhlIGZvcm1hdCBtaWdodCBpbmNsdWRlIHBhdGggc2VwYXJhdG9ycyAoZS5nLiwgWVlZWS1NTS9ZWVlZLU1NLUREKVxyXG5cdFx0XHQvLyBXZSBuZWVkIHRvIHByZXNlcnZlIHRoZSBwYXRoIHN0cnVjdHVyZSBhbmQgb25seSBzYW5pdGl6ZSB0aGUgZmluYWwgZmlsZW5hbWVcclxuXHRcdFx0Y29uc3QgcGF0aFdpdGhEYXRlID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlXHJcblx0XHRcdFx0LmRhaWx5Tm90ZVNldHRpbmdzLmZvbGRlclxyXG5cdFx0XHRcdD8gYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLmRhaWx5Tm90ZVNldHRpbmdzLmZvbGRlcn0vJHtkYXRlU3RyfS5tZGBcclxuXHRcdFx0XHQ6IGAke2RhdGVTdHJ9Lm1kYDtcclxuXHRcdFx0dGhpcy50ZW1wVGFyZ2V0RmlsZVBhdGggPSBzYW5pdGl6ZUZpbGVQYXRoKHBhdGhXaXRoRGF0ZSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLnRlbXBUYXJnZXRGaWxlUGF0aCA9XHJcblx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLnRhcmdldEZpbGU7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5wcmVmZXJNZXRhZGF0YUZvcm1hdCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnByZWZlck1ldGFkYXRhRm9ybWF0O1xyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgdGltZSBwYXJzaW5nIHNlcnZpY2VcclxuXHRcdHRoaXMudGltZVBhcnNpbmdTZXJ2aWNlID0gbmV3IFRpbWVQYXJzaW5nU2VydmljZShcclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MudGltZVBhcnNpbmcgfHwgREVGQVVMVF9USU1FX1BBUlNJTkdfQ09ORklHXHJcblx0XHQpO1xyXG5cclxuXHRcdGlmIChtZXRhZGF0YSkge1xyXG5cdFx0XHR0aGlzLnRhc2tNZXRhZGF0YSA9IG1ldGFkYXRhO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMudXNlRnVsbEZlYXR1cmVkTW9kZSA9IHVzZUZ1bGxGZWF0dXJlZE1vZGUgJiYgIVBsYXRmb3JtLmlzUGhvbmU7XHJcblx0fVxyXG5cclxuXHRvbk9wZW4oKSB7XHJcblx0XHRjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcclxuXHRcdHRoaXMubW9kYWxFbC50b2dnbGVDbGFzcyhcInF1aWNrLWNhcHR1cmUtbW9kYWxcIiwgdHJ1ZSk7XHJcblxyXG5cdFx0Ly8gU3RhcnQgbWFuYWdpbmcgc3VnZ2VzdHMgd2l0aCBoaWdoIHByaW9yaXR5XHJcblx0XHR0aGlzLnN1Z2dlc3RNYW5hZ2VyLnN0YXJ0TWFuYWdpbmcoKTtcclxuXHJcblx0XHRpZiAodGhpcy51c2VGdWxsRmVhdHVyZWRNb2RlKSB7XHJcblx0XHRcdHRoaXMubW9kYWxFbC50b2dnbGVDbGFzcyhbXCJxdWljay1jYXB0dXJlLW1vZGFsXCIsIFwiZnVsbFwiXSwgdHJ1ZSk7XHJcblx0XHRcdHRoaXMuY3JlYXRlRnVsbEZlYXR1cmVkTW9kYWwoY29udGVudEVsKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMuY3JlYXRlU2ltcGxlTW9kYWwoY29udGVudEVsKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBFbmFibGUgdW5pdmVyc2FsIHN1Z2dlc3QgYWZ0ZXIgZWRpdG9yIGlzIGNyZWF0ZWRcclxuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRpZiAodGhpcy5tYXJrZG93bkVkaXRvcj8uZWRpdG9yPy5lZGl0b3IpIHtcclxuXHRcdFx0XHR0aGlzLnVuaXZlcnNhbFN1Z2dlc3QgPVxyXG5cdFx0XHRcdFx0dGhpcy5zdWdnZXN0TWFuYWdlci5lbmFibGVGb3JRdWlja0NhcHR1cmVNb2RhbChcclxuXHRcdFx0XHRcdFx0dGhpcy5tYXJrZG93bkVkaXRvci5lZGl0b3IuZWRpdG9yXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdHRoaXMudW5pdmVyc2FsU3VnZ2VzdC5lbmFibGUoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSwgMTAwKTtcclxuXHR9XHJcblxyXG5cdGNyZWF0ZVNpbXBsZU1vZGFsKGNvbnRlbnRFbDogSFRNTEVsZW1lbnQpIHtcclxuXHRcdHRoaXMudGl0bGVFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHR0ZXh0OiB0KFwiQ2FwdHVyZSB0b1wiKSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IHRhcmdldEZpbGVFbCA9IHRoaXMudGl0bGVFbC5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdGNsczogXCJxdWljay1jYXB0dXJlLXRhcmdldFwiLFxyXG5cdFx0XHRhdHRyOiB7XHJcblx0XHRcdFx0Y29udGVudGVkaXRhYmxlOlxyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLnRhcmdldFR5cGUgPT09IFwiZml4ZWRcIlxyXG5cdFx0XHRcdFx0XHQ/IFwidHJ1ZVwiXHJcblx0XHRcdFx0XHRcdDogXCJmYWxzZVwiLFxyXG5cdFx0XHRcdHNwZWxsY2hlY2s6IFwiZmFsc2VcIixcclxuXHRcdFx0fSxcclxuXHRcdFx0dGV4dDogdGhpcy50ZW1wVGFyZ2V0RmlsZVBhdGgsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDcmVhdGUgY29udGFpbmVyIGZvciB0aGUgZWRpdG9yXHJcblx0XHRjb25zdCBlZGl0b3JDb250YWluZXIgPSBjb250ZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInF1aWNrLWNhcHR1cmUtbW9kYWwtZWRpdG9yXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLnNldHVwTWFya2Rvd25FZGl0b3IoZWRpdG9yQ29udGFpbmVyLCB0YXJnZXRGaWxlRWwpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBidXR0b24gY29udGFpbmVyXHJcblx0XHRjb25zdCBidXR0b25Db250YWluZXIgPSBjb250ZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInF1aWNrLWNhcHR1cmUtbW9kYWwtYnV0dG9uc1wiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIHRoZSBidXR0b25zXHJcblx0XHRjb25zdCBzdWJtaXRCdXR0b24gPSBidXR0b25Db250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFwiQ2FwdHVyZVwiKSxcclxuXHRcdFx0Y2xzOiBcIm1vZC1jdGFcIixcclxuXHRcdH0pO1xyXG5cdFx0c3VibWl0QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmhhbmRsZVN1Ym1pdCgpKTtcclxuXHJcblx0XHRjb25zdCBjYW5jZWxCdXR0b24gPSBidXR0b25Db250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFwiQ2FuY2VsXCIpLFxyXG5cdFx0fSk7XHJcblx0XHRjYW5jZWxCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuY2xvc2UoKSk7XHJcblxyXG5cdFx0Ly8gT25seSBhZGQgZmlsZSBzdWdnZXN0IGZvciBmaXhlZCBmaWxlIHR5cGVcclxuXHRcdGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUudGFyZ2V0VHlwZSA9PT0gXCJmaXhlZFwiKSB7XHJcblx0XHRcdG5ldyBGaWxlU3VnZ2VzdChcclxuXHRcdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0XHR0YXJnZXRGaWxlRWwsXHJcblx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLFxyXG5cdFx0XHRcdChmaWxlOiBURmlsZSkgPT4ge1xyXG5cdFx0XHRcdFx0dGFyZ2V0RmlsZUVsLnRleHRDb250ZW50ID0gZmlsZS5wYXRoO1xyXG5cdFx0XHRcdFx0dGhpcy50ZW1wVGFyZ2V0RmlsZVBhdGggPSBmaWxlLnBhdGg7XHJcblx0XHRcdFx0XHQvLyBGb2N1cyBjdXJyZW50IGVkaXRvclxyXG5cdFx0XHRcdFx0dGhpcy5tYXJrZG93bkVkaXRvcj8uZWRpdG9yPy5mb2N1cygpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGNyZWF0ZUZ1bGxGZWF0dXJlZE1vZGFsKGNvbnRlbnRFbDogSFRNTEVsZW1lbnQpIHtcclxuXHRcdC8vIENyZWF0ZSBhIGxheW91dCBjb250YWluZXIgd2l0aCB0d28gcGFuZWxzXHJcblx0XHRjb25zdCBsYXlvdXRDb250YWluZXIgPSBjb250ZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInF1aWNrLWNhcHR1cmUtbGF5b3V0XCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDcmVhdGUgbGVmdCBwYW5lbCBmb3IgY29uZmlndXJhdGlvblxyXG5cdFx0Y29uc3QgY29uZmlnUGFuZWwgPSBsYXlvdXRDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInF1aWNrLWNhcHR1cmUtY29uZmlnLXBhbmVsXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDcmVhdGUgcmlnaHQgcGFuZWwgZm9yIGVkaXRvclxyXG5cdFx0Y29uc3QgZWRpdG9yUGFuZWwgPSBsYXlvdXRDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInF1aWNrLWNhcHR1cmUtZWRpdG9yLXBhbmVsXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBUYXJnZXQgZmlsZSBzZWxlY3RvclxyXG5cdFx0Y29uc3QgdGFyZ2V0RmlsZUNvbnRhaW5lciA9IGNvbmZpZ1BhbmVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJxdWljay1jYXB0dXJlLXRhcmdldC1jb250YWluZXJcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRhcmdldEZpbGVDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0dGV4dDogdChcIlRhcmdldCBGaWxlOlwiKSxcclxuXHRcdFx0Y2xzOiBcInF1aWNrLWNhcHR1cmUtc2VjdGlvbi10aXRsZVwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgdGFyZ2V0RmlsZUVsID0gdGFyZ2V0RmlsZUNvbnRhaW5lci5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdGNsczogXCJxdWljay1jYXB0dXJlLXRhcmdldFwiLFxyXG5cdFx0XHRhdHRyOiB7XHJcblx0XHRcdFx0Y29udGVudGVkaXRhYmxlOlxyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLnRhcmdldFR5cGUgPT09IFwiZml4ZWRcIlxyXG5cdFx0XHRcdFx0XHQ/IFwidHJ1ZVwiXHJcblx0XHRcdFx0XHRcdDogXCJmYWxzZVwiLFxyXG5cdFx0XHRcdHNwZWxsY2hlY2s6IFwiZmFsc2VcIixcclxuXHRcdFx0fSxcclxuXHRcdFx0dGV4dDogdGhpcy50ZW1wVGFyZ2V0RmlsZVBhdGgsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBPbmx5IGFkZCBmaWxlIHN1Z2dlc3QgZm9yIGZpeGVkIGZpbGUgdHlwZVxyXG5cdFx0aWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZS50YXJnZXRUeXBlID09PSBcImZpeGVkXCIpIHtcclxuXHRcdFx0bmV3IEZpbGVTdWdnZXN0KFxyXG5cdFx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHRcdHRhcmdldEZpbGVFbCxcclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUsXHJcblx0XHRcdFx0KGZpbGU6IFRGaWxlKSA9PiB7XHJcblx0XHRcdFx0XHR0YXJnZXRGaWxlRWwudGV4dENvbnRlbnQgPSBmaWxlLnBhdGg7XHJcblx0XHRcdFx0XHR0aGlzLnRlbXBUYXJnZXRGaWxlUGF0aCA9IGZpbGUucGF0aDtcclxuXHRcdFx0XHRcdHRoaXMubWFya2Rvd25FZGl0b3I/LmVkaXRvcj8uZm9jdXMoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVGFzayBtZXRhZGF0YSBjb25maWd1cmF0aW9uXHJcblx0XHRjb25maWdQYW5lbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHR0ZXh0OiB0KFwiVGFzayBQcm9wZXJ0aWVzXCIpLFxyXG5cdFx0XHRjbHM6IFwicXVpY2stY2FwdHVyZS1zZWN0aW9uLXRpdGxlXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyAvLyBQYXJzZWQgdGltZSBleHByZXNzaW9ucyBkaXNwbGF5XHJcblx0XHQvLyBjb25zdCBwYXJzZWRUaW1lQ29udGFpbmVyID0gY29uZmlnUGFuZWwuY3JlYXRlRGl2KHtcclxuXHRcdC8vIFx0Y2xzOiBcInF1aWNrLWNhcHR1cmUtcGFyc2VkLXRpbWVcIixcclxuXHRcdC8vIH0pO1xyXG5cclxuXHRcdC8vIGNvbnN0IHBhcnNlZFRpbWVUaXRsZSA9IHBhcnNlZFRpbWVDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdC8vIFx0dGV4dDogdChcIlBhcnNlZCBUaW1lIEV4cHJlc3Npb25zXCIpLFxyXG5cdFx0Ly8gXHRjbHM6IFwicXVpY2stY2FwdHVyZS1zZWN0aW9uLXN1YnRpdGxlXCIsXHJcblx0XHQvLyB9KTtcclxuXHJcblx0XHQvLyB0aGlzLnBhcnNlZFRpbWVEaXNwbGF5RWwgPSBwYXJzZWRUaW1lQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHQvLyBcdGNsczogXCJxdWljay1jYXB0dXJlLXBhcnNlZC10aW1lLWRpc3BsYXlcIixcclxuXHRcdC8vIH0pO1xyXG5cclxuXHRcdGNvbnN0IHN0YXR1c0NvbXBvbmVudCA9IG5ldyBTdGF0dXNDb21wb25lbnQoXHJcblx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHRjb25maWdQYW5lbCxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHN0YXR1czogdGhpcy50YXNrTWV0YWRhdGEuc3RhdHVzLFxyXG5cdFx0XHR9IGFzIFRhc2ssXHJcblx0XHRcdHtcclxuXHRcdFx0XHR0eXBlOiBcInF1aWNrLWNhcHR1cmVcIixcclxuXHRcdFx0XHRvblRhc2tTdGF0dXNTZWxlY3RlZDogKHN0YXR1czogc3RyaW5nKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS5zdGF0dXMgPSBzdGF0dXM7XHJcblx0XHRcdFx0XHR0aGlzLnVwZGF0ZVByZXZpZXcoKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cdFx0c3RhdHVzQ29tcG9uZW50LmxvYWQoKTtcclxuXHJcblx0XHQvLyBTdGFydCBEYXRlXHJcblx0XHRuZXcgU2V0dGluZyhjb25maWdQYW5lbCkuc2V0TmFtZSh0KFwiU3RhcnQgRGF0ZVwiKSkuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHR0ZXh0LnNldFBsYWNlaG9sZGVyKFwiWVlZWS1NTS1ERFwiKVxyXG5cdFx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdHRoaXMudGFza01ldGFkYXRhLnN0YXJ0RGF0ZVxyXG5cdFx0XHRcdFx0XHQ/IHRoaXMuZm9ybWF0RGF0ZSh0aGlzLnRhc2tNZXRhZGF0YS5zdGFydERhdGUpXHJcblx0XHRcdFx0XHRcdDogXCJcIlxyXG5cdFx0XHRcdClcclxuXHRcdFx0XHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAodmFsdWUpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEuc3RhcnREYXRlID0gdGhpcy5wYXJzZURhdGUodmFsdWUpO1xyXG5cdFx0XHRcdFx0XHR0aGlzLm1hcmtBc01hbnVhbGx5U2V0KFwic3RhcnREYXRlXCIpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEuc3RhcnREYXRlID0gdW5kZWZpbmVkO1xyXG5cdFx0XHRcdFx0XHQvLyBSZXNldCBtYW51YWwgZmxhZyB3aGVuIGNsZWFyZWRcclxuXHRcdFx0XHRcdFx0aWYgKHRoaXMudGFza01ldGFkYXRhLm1hbnVhbGx5U2V0KSB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEubWFudWFsbHlTZXQuc3RhcnREYXRlID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdHRoaXMudXBkYXRlUHJldmlldygpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR0ZXh0LmlucHV0RWwudHlwZSA9IFwiZGF0ZVwiO1xyXG5cdFx0XHQvLyBTdG9yZSByZWZlcmVuY2UgZm9yIHVwZGF0aW5nIGZyb20gcGFyc2VkIGRhdGVzXHJcblx0XHRcdHRoaXMuc3RhcnREYXRlSW5wdXQgPSB0ZXh0LmlucHV0RWw7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBEdWUgRGF0ZVxyXG5cdFx0bmV3IFNldHRpbmcoY29uZmlnUGFuZWwpLnNldE5hbWUodChcIkR1ZSBEYXRlXCIpKS5hZGRUZXh0KCh0ZXh0KSA9PiB7XHJcblx0XHRcdHRleHQuc2V0UGxhY2Vob2xkZXIoXCJZWVlZLU1NLUREXCIpXHJcblx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEuZHVlRGF0ZVxyXG5cdFx0XHRcdFx0XHQ/IHRoaXMuZm9ybWF0RGF0ZSh0aGlzLnRhc2tNZXRhZGF0YS5kdWVEYXRlKVxyXG5cdFx0XHRcdFx0XHQ6IFwiXCJcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKHZhbHVlKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMudGFza01ldGFkYXRhLmR1ZURhdGUgPSB0aGlzLnBhcnNlRGF0ZSh2YWx1ZSk7XHJcblx0XHRcdFx0XHRcdHRoaXMubWFya0FzTWFudWFsbHlTZXQoXCJkdWVEYXRlXCIpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEuZHVlRGF0ZSA9IHVuZGVmaW5lZDtcclxuXHRcdFx0XHRcdFx0Ly8gUmVzZXQgbWFudWFsIGZsYWcgd2hlbiBjbGVhcmVkXHJcblx0XHRcdFx0XHRcdGlmICh0aGlzLnRhc2tNZXRhZGF0YS5tYW51YWxseVNldCkge1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMudGFza01ldGFkYXRhLm1hbnVhbGx5U2V0LmR1ZURhdGUgPSBmYWxzZTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0dGhpcy51cGRhdGVQcmV2aWV3KCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdHRleHQuaW5wdXRFbC50eXBlID0gXCJkYXRlXCI7XHJcblx0XHRcdC8vIFN0b3JlIHJlZmVyZW5jZSBmb3IgdXBkYXRpbmcgZnJvbSBwYXJzZWQgZGF0ZXNcclxuXHRcdFx0dGhpcy5kdWVEYXRlSW5wdXQgPSB0ZXh0LmlucHV0RWw7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBTY2hlZHVsZWQgRGF0ZVxyXG5cdFx0bmV3IFNldHRpbmcoY29uZmlnUGFuZWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJTY2hlZHVsZWQgRGF0ZVwiKSlcclxuXHRcdFx0LmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0XHR0ZXh0LnNldFBsYWNlaG9sZGVyKFwiWVlZWS1NTS1ERFwiKVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS5zY2hlZHVsZWREYXRlXHJcblx0XHRcdFx0XHRcdFx0PyB0aGlzLmZvcm1hdERhdGUodGhpcy50YXNrTWV0YWRhdGEuc2NoZWR1bGVkRGF0ZSlcclxuXHRcdFx0XHRcdFx0XHQ6IFwiXCJcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0aWYgKHZhbHVlKSB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEuc2NoZWR1bGVkRGF0ZSA9XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnBhcnNlRGF0ZSh2YWx1ZSk7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5tYXJrQXNNYW51YWxseVNldChcInNjaGVkdWxlZERhdGVcIik7XHJcblx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEuc2NoZWR1bGVkRGF0ZSA9IHVuZGVmaW5lZDtcclxuXHRcdFx0XHRcdFx0XHQvLyBSZXNldCBtYW51YWwgZmxhZyB3aGVuIGNsZWFyZWRcclxuXHRcdFx0XHRcdFx0XHRpZiAodGhpcy50YXNrTWV0YWRhdGEubWFudWFsbHlTZXQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMudGFza01ldGFkYXRhLm1hbnVhbGx5U2V0LnNjaGVkdWxlZERhdGUgPVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRmYWxzZTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0dGhpcy51cGRhdGVQcmV2aWV3KCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR0ZXh0LmlucHV0RWwudHlwZSA9IFwiZGF0ZVwiO1xyXG5cdFx0XHRcdC8vIFN0b3JlIHJlZmVyZW5jZSBmb3IgdXBkYXRpbmcgZnJvbSBwYXJzZWQgZGF0ZXNcclxuXHRcdFx0XHR0aGlzLnNjaGVkdWxlZERhdGVJbnB1dCA9IHRleHQuaW5wdXRFbDtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gUHJpb3JpdHlcclxuXHRcdG5ldyBTZXR0aW5nKGNvbmZpZ1BhbmVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiUHJpb3JpdHlcIikpXHJcblx0XHRcdC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcclxuXHRcdFx0XHRkcm9wZG93blxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcIlwiLCB0KFwiTm9uZVwiKSlcclxuXHRcdFx0XHRcdC5hZGRPcHRpb24oXCI1XCIsIHQoXCJIaWdoZXN0XCIpKVxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcIjRcIiwgdChcIkhpZ2hcIikpXHJcblx0XHRcdFx0XHQuYWRkT3B0aW9uKFwiM1wiLCB0KFwiTWVkaXVtXCIpKVxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcIjJcIiwgdChcIkxvd1wiKSlcclxuXHRcdFx0XHRcdC5hZGRPcHRpb24oXCIxXCIsIHQoXCJMb3dlc3RcIikpXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUodGhpcy50YXNrTWV0YWRhdGEucHJpb3JpdHk/LnRvU3RyaW5nKCkgfHwgXCJcIilcclxuXHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEucHJpb3JpdHkgPSB2YWx1ZVxyXG5cdFx0XHRcdFx0XHRcdD8gcGFyc2VJbnQodmFsdWUpXHJcblx0XHRcdFx0XHRcdFx0OiB1bmRlZmluZWQ7XHJcblx0XHRcdFx0XHRcdHRoaXMudXBkYXRlUHJldmlldygpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdC8vIFByb2plY3RcclxuXHRcdG5ldyBTZXR0aW5nKGNvbmZpZ1BhbmVsKS5zZXROYW1lKHQoXCJQcm9qZWN0XCIpKS5hZGRUZXh0KCh0ZXh0KSA9PiB7XHJcblx0XHRcdG5ldyBQcm9qZWN0U3VnZ2VzdCh0aGlzLmFwcCwgdGV4dC5pbnB1dEVsLCB0aGlzLnBsdWdpbik7XHJcblx0XHRcdHRleHQuc2V0UGxhY2Vob2xkZXIodChcIlByb2plY3QgbmFtZVwiKSlcclxuXHRcdFx0XHQuc2V0VmFsdWUodGhpcy50YXNrTWV0YWRhdGEucHJvamVjdCB8fCBcIlwiKVxyXG5cdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMudGFza01ldGFkYXRhLnByb2plY3QgPSB2YWx1ZSB8fCB1bmRlZmluZWQ7XHJcblx0XHRcdFx0XHR0aGlzLnVwZGF0ZVByZXZpZXcoKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIENvbnRleHRcclxuXHRcdG5ldyBTZXR0aW5nKGNvbmZpZ1BhbmVsKS5zZXROYW1lKHQoXCJDb250ZXh0XCIpKS5hZGRUZXh0KCh0ZXh0KSA9PiB7XHJcblx0XHRcdG5ldyBDb250ZXh0U3VnZ2VzdCh0aGlzLmFwcCwgdGV4dC5pbnB1dEVsLCB0aGlzLnBsdWdpbik7XHJcblx0XHRcdHRleHQuc2V0UGxhY2Vob2xkZXIodChcIkNvbnRleHRcIikpXHJcblx0XHRcdFx0LnNldFZhbHVlKHRoaXMudGFza01ldGFkYXRhLmNvbnRleHQgfHwgXCJcIilcclxuXHRcdFx0XHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS5jb250ZXh0ID0gdmFsdWUgfHwgdW5kZWZpbmVkO1xyXG5cdFx0XHRcdFx0dGhpcy51cGRhdGVQcmV2aWV3KCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBSZWN1cnJlbmNlXHJcblx0XHRuZXcgU2V0dGluZyhjb25maWdQYW5lbCkuc2V0TmFtZSh0KFwiUmVjdXJyZW5jZVwiKSkuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHR0ZXh0LnNldFBsYWNlaG9sZGVyKHQoXCJlLmcuLCBldmVyeSBkYXksIGV2ZXJ5IHdlZWtcIikpXHJcblx0XHRcdFx0LnNldFZhbHVlKHRoaXMudGFza01ldGFkYXRhLnJlY3VycmVuY2UgfHwgXCJcIilcclxuXHRcdFx0XHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS5yZWN1cnJlbmNlID0gdmFsdWUgfHwgdW5kZWZpbmVkO1xyXG5cdFx0XHRcdFx0dGhpcy51cGRhdGVQcmV2aWV3KCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDcmVhdGUgZWRpdG9yIGNvbnRhaW5lciBpbiB0aGUgcmlnaHQgcGFuZWxcclxuXHRcdGNvbnN0IGVkaXRvckNvbnRhaW5lciA9IGVkaXRvclBhbmVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJxdWljay1jYXB0dXJlLW1vZGFsLWVkaXRvclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0ZWRpdG9yUGFuZWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0dGV4dDogdChcIlRhc2sgQ29udGVudFwiKSxcclxuXHRcdFx0Y2xzOiBcInF1aWNrLWNhcHR1cmUtc2VjdGlvbi10aXRsZVwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5wcmV2aWV3Q29udGFpbmVyRWwgPSBlZGl0b3JQYW5lbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwicHJldmlldy1jb250YWluZXJcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMubWFya2Rvd25SZW5kZXJlciA9IG5ldyBNYXJrZG93blJlbmRlcmVyQ29tcG9uZW50KFxyXG5cdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0dGhpcy5wcmV2aWV3Q29udGFpbmVyRWwsXHJcblx0XHRcdFwiXCIsXHJcblx0XHRcdGZhbHNlXHJcblx0XHQpO1xyXG5cclxuXHRcdHRoaXMuc2V0dXBNYXJrZG93bkVkaXRvcihlZGl0b3JDb250YWluZXIpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBidXR0b24gY29udGFpbmVyXHJcblx0XHRjb25zdCBidXR0b25Db250YWluZXIgPSBjb250ZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInF1aWNrLWNhcHR1cmUtbW9kYWwtYnV0dG9uc1wiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIHRoZSBidXR0b25zXHJcblx0XHRjb25zdCBzdWJtaXRCdXR0b24gPSBidXR0b25Db250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFwiQ2FwdHVyZVwiKSxcclxuXHRcdFx0Y2xzOiBcIm1vZC1jdGFcIixcclxuXHRcdH0pO1xyXG5cdFx0c3VibWl0QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmhhbmRsZVN1Ym1pdCgpKTtcclxuXHJcblx0XHRjb25zdCBjYW5jZWxCdXR0b24gPSBidXR0b25Db250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFwiQ2FuY2VsXCIpLFxyXG5cdFx0fSk7XHJcblx0XHRjYW5jZWxCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuY2xvc2UoKSk7XHJcblx0fVxyXG5cclxuXHR1cGRhdGVQcmV2aWV3KCkge1xyXG5cdFx0aWYgKHRoaXMucHJldmlld0NvbnRhaW5lckVsKSB7XHJcblx0XHRcdHRoaXMubWFya2Rvd25SZW5kZXJlcj8ucmVuZGVyKFxyXG5cdFx0XHRcdHRoaXMucHJvY2Vzc0NvbnRlbnRXaXRoTWV0YWRhdGEodGhpcy5jYXB0dXJlZENvbnRlbnQpXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRzZXR1cE1hcmtkb3duRWRpdG9yKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIHRhcmdldEZpbGVFbD86IEhUTUxFbGVtZW50KSB7XHJcblx0XHQvLyBDcmVhdGUgdGhlIG1hcmtkb3duIGVkaXRvciB3aXRoIG91ciBFbWJlZGRhYmxlTWFya2Rvd25FZGl0b3JcclxuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHR0aGlzLm1hcmtkb3duRWRpdG9yID0gY3JlYXRlRW1iZWRkYWJsZU1hcmtkb3duRWRpdG9yKFxyXG5cdFx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHRcdGNvbnRhaW5lcixcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRwbGFjZWhvbGRlcjogdGhpcy5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLnBsYWNlaG9sZGVyLFxyXG5cclxuXHRcdFx0XHRcdG9uRW50ZXI6IChlZGl0b3IsIG1vZCwgc2hpZnQpID0+IHtcclxuXHRcdFx0XHRcdFx0aWYgKG1vZCkge1xyXG5cdFx0XHRcdFx0XHRcdC8vIFN1Ym1pdCBvbiBDbWQvQ3RybCtFbnRlclxyXG5cdFx0XHRcdFx0XHRcdHRoaXMuaGFuZGxlU3VibWl0KCk7XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0Ly8gQWxsb3cgbm9ybWFsIEVudGVyIGtleSBiZWhhdmlvclxyXG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdFx0XHR9LFxyXG5cclxuXHRcdFx0XHRcdG9uRXNjYXBlOiAoZWRpdG9yKSA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIENsb3NlIHRoZSBtb2RhbCBvbiBFc2NhcGVcclxuXHRcdFx0XHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0XHRcdFx0fSxcclxuXHJcblx0XHRcdFx0XHRvblN1Ym1pdDogKGVkaXRvcikgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLmhhbmRsZVN1Ym1pdCgpO1xyXG5cdFx0XHRcdFx0fSxcclxuXHJcblx0XHRcdFx0XHRvbkNoYW5nZTogKHVwZGF0ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHQvLyBIYW5kbGUgY2hhbmdlcyBpZiBuZWVkZWRcclxuXHRcdFx0XHRcdFx0dGhpcy5jYXB0dXJlZENvbnRlbnQgPSB0aGlzLm1hcmtkb3duRWRpdG9yPy52YWx1ZSB8fCBcIlwiO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gQ2xlYXIgcHJldmlvdXMgZGVib3VuY2UgdGltZXJcclxuXHRcdFx0XHRcdFx0aWYgKHRoaXMucGFyc2VEZWJvdW5jZVRpbWVyKSB7XHJcblx0XHRcdFx0XHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMucGFyc2VEZWJvdW5jZVRpbWVyKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0Ly8gRGVib3VuY2UgdGltZSBwYXJzaW5nIHRvIGF2b2lkIGV4Y2Vzc2l2ZSBwYXJzaW5nIG9uIHJhcGlkIHR5cGluZ1xyXG5cdFx0XHRcdFx0XHR0aGlzLnBhcnNlRGVib3VuY2VUaW1lciA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnBlcmZvcm1SZWFsVGltZVBhcnNpbmcoKTtcclxuXHRcdFx0XHRcdFx0fSwgMzAwKTsgLy8gMzAwbXMgZGVib3VuY2VcclxuXHJcblx0XHRcdFx0XHRcdC8vIFVwZGF0ZSBwcmV2aWV3IGltbWVkaWF0ZWx5IGZvciBiZXR0ZXIgcmVzcG9uc2l2ZW5lc3NcclxuXHRcdFx0XHRcdFx0aWYgKHRoaXMudXBkYXRlUHJldmlldykge1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMudXBkYXRlUHJldmlldygpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH1cclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdHRoaXMubWFya2Rvd25FZGl0b3I/LnNjb3BlLnJlZ2lzdGVyKFxyXG5cdFx0XHRcdFtcIkFsdFwiXSxcclxuXHRcdFx0XHRcImNcIixcclxuXHRcdFx0XHQoZTogS2V5Ym9hcmRFdmVudCkgPT4ge1xyXG5cdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRcdFx0aWYgKCF0aGlzLm1hcmtkb3duRWRpdG9yKSByZXR1cm4gZmFsc2U7XHJcblx0XHRcdFx0XHRpZiAodGhpcy5tYXJrZG93bkVkaXRvci52YWx1ZS50cmltKCkgPT09IFwiXCIpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdHRoaXMuaGFuZGxlU3VibWl0KCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRpZiAodGFyZ2V0RmlsZUVsKSB7XHJcblx0XHRcdFx0dGhpcy5tYXJrZG93bkVkaXRvcj8uc2NvcGUucmVnaXN0ZXIoXHJcblx0XHRcdFx0XHRbXCJBbHRcIl0sXHJcblx0XHRcdFx0XHRcInhcIixcclxuXHRcdFx0XHRcdChlOiBLZXlib2FyZEV2ZW50KSA9PiB7XHJcblx0XHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0XHRcdFx0Ly8gT25seSBhbGxvdyBmb2N1cyBvbiB0YXJnZXQgZmlsZSBpZiBpdCdzIGVkaXRhYmxlIChmaXhlZCBmaWxlIHR5cGUpXHJcblx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUudGFyZ2V0VHlwZSA9PT1cclxuXHRcdFx0XHRcdFx0XHRcImZpeGVkXCJcclxuXHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0dGFyZ2V0RmlsZUVsLmZvY3VzKCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gRm9jdXMgdGhlIGVkaXRvciB3aGVuIGl0J3MgY3JlYXRlZFxyXG5cdFx0XHR0aGlzLm1hcmtkb3duRWRpdG9yPy5lZGl0b3I/LmZvY3VzKCk7XHJcblx0XHR9LCA1MCk7XHJcblx0fVxyXG5cclxuXHRhc3luYyBoYW5kbGVTdWJtaXQoKSB7XHJcblx0XHRjb25zdCBjb250ZW50ID1cclxuXHRcdFx0dGhpcy5jYXB0dXJlZENvbnRlbnQudHJpbSgpIHx8XHJcblx0XHRcdHRoaXMubWFya2Rvd25FZGl0b3I/LnZhbHVlLnRyaW0oKSB8fFxyXG5cdFx0XHRcIlwiO1xyXG5cclxuXHRcdGlmICghY29udGVudCkge1xyXG5cdFx0XHRuZXcgTm90aWNlKHQoXCJOb3RoaW5nIHRvIGNhcHR1cmVcIikpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgcHJvY2Vzc2VkQ29udGVudCA9IHRoaXMucHJvY2Vzc0NvbnRlbnRXaXRoTWV0YWRhdGEoY29udGVudCk7XHJcblxyXG5cdFx0XHQvLyBDcmVhdGUgb3B0aW9ucyB3aXRoIGN1cnJlbnQgc2V0dGluZ3NcclxuXHRcdFx0Y29uc3QgY2FwdHVyZU9wdGlvbnMgPSB7XHJcblx0XHRcdFx0Li4udGhpcy5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLFxyXG5cdFx0XHRcdHRhcmdldEZpbGU6IHRoaXMudGVtcFRhcmdldEZpbGVQYXRoLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0YXdhaXQgc2F2ZUNhcHR1cmUodGhpcy5hcHAsIHByb2Nlc3NlZENvbnRlbnQsIGNhcHR1cmVPcHRpb25zKTtcclxuXHRcdFx0bmV3IE5vdGljZSh0KFwiQ2FwdHVyZWQgc3VjY2Vzc2Z1bGx5XCIpKTtcclxuXHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0bmV3IE5vdGljZShgJHt0KFwiRmFpbGVkIHRvIHNhdmU6XCIpfSAke2Vycm9yfWApO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJvY2Vzc0NvbnRlbnRXaXRoTWV0YWRhdGEoY29udGVudDogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdC8vIFN0ZXAgMTogU3BsaXQgY29udGVudCBpbnRvIGxpbmVzIEZJUlNUIHRvIHByZXNlcnZlIGxpbmUgc3RydWN0dXJlXHJcblx0XHRjb25zdCBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoXCJcXG5cIik7XHJcblx0XHRjb25zdCBwcm9jZXNzZWRMaW5lczogc3RyaW5nW10gPSBbXTtcclxuXHRcdGNvbnN0IGluZGVudGF0aW9uUmVnZXggPSAvXihcXHMrKS87XHJcblxyXG5cdFx0Ly8gU3RlcCAyOiBQcm9jZXNzIGVhY2ggbGluZSBpbmRpdmlkdWFsbHlcclxuXHRcdGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xyXG5cdFx0XHRpZiAoIWxpbmUudHJpbSgpKSB7XHJcblx0XHRcdFx0cHJvY2Vzc2VkTGluZXMucHVzaChsaW5lKTtcclxuXHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gU3RlcCAzOiBQYXJzZSB0aW1lIGV4cHJlc3Npb25zIGZvciBUSElTIGxpbmUgb25seVxyXG5cdFx0XHRjb25zdCBsaW5lUGFyc2VSZXN1bHQgPVxyXG5cdFx0XHRcdHRoaXMudGltZVBhcnNpbmdTZXJ2aWNlLnBhcnNlVGltZUV4cHJlc3Npb25zRm9yTGluZShsaW5lKTtcclxuXHJcblx0XHRcdC8vIFN0ZXAgNDogVXNlIGNsZWFuZWQgbGluZSBjb250ZW50ICh3aXRoIHRpbWUgZXhwcmVzc2lvbnMgcmVtb3ZlZCBmcm9tIHRoaXMgbGluZSlcclxuXHRcdFx0Y29uc3QgY2xlYW5lZExpbmUgPSBsaW5lUGFyc2VSZXN1bHQuY2xlYW5lZExpbmU7XHJcblxyXG5cdFx0XHQvLyBTdGVwIDU6IENoZWNrIGZvciBpbmRlbnRhdGlvbiB0byBpZGVudGlmeSBzdWItdGFza3NcclxuXHRcdFx0Y29uc3QgaW5kZW50TWF0Y2ggPSBsaW5lLm1hdGNoKGluZGVudGF0aW9uUmVnZXgpO1xyXG5cdFx0XHRjb25zdCBpc1N1YlRhc2sgPSBpbmRlbnRNYXRjaCAmJiBpbmRlbnRNYXRjaFsxXS5sZW5ndGggPiAwO1xyXG5cclxuXHRcdFx0Ly8gU3RlcCA2OiBDaGVjayBpZiBsaW5lIGlzIGFscmVhZHkgYSB0YXNrIG9yIGEgbGlzdCBpdGVtXHJcblx0XHRcdGNvbnN0IGlzVGFza09yTGlzdCA9IGNsZWFuZWRMaW5lXHJcblx0XHRcdFx0LnRyaW0oKVxyXG5cdFx0XHRcdC5tYXRjaCgvXigtfFxcZCtcXC58XFwqfFxcKykoXFxzK1xcW1teXFxdXFxbXStcXF0pPy8pO1xyXG5cclxuXHRcdFx0aWYgKGlzU3ViVGFzaykge1xyXG5cdFx0XHRcdC8vIERvbid0IGFkZCBtZXRhZGF0YSB0byBzdWItdGFza3MsIGJ1dCBzdGlsbCBjbGVhbiB0aW1lIGV4cHJlc3Npb25zXHJcblx0XHRcdFx0Ly8gUHJlc2VydmUgdGhlIG9yaWdpbmFsIGluZGVudGF0aW9uIGZyb20gdGhlIG9yaWdpbmFsIGxpbmVcclxuXHRcdFx0XHRjb25zdCBvcmlnaW5hbEluZGVudCA9IGluZGVudE1hdGNoWzFdO1xyXG5cdFx0XHRcdGNvbnN0IGNsZWFuZWRDb250ZW50ID0gdGhpcy5jbGVhblRlbXBvcmFyeU1hcmtzKFxyXG5cdFx0XHRcdFx0Y2xlYW5lZExpbmUudHJpbSgpXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRwcm9jZXNzZWRMaW5lcy5wdXNoKG9yaWdpbmFsSW5kZW50ICsgY2xlYW5lZENvbnRlbnQpO1xyXG5cdFx0XHR9IGVsc2UgaWYgKGlzVGFza09yTGlzdCkge1xyXG5cdFx0XHRcdC8vIElmIGl0J3MgYSB0YXNrLCBhZGQgbGluZS1zcGVjaWZpYyBtZXRhZGF0YVxyXG5cdFx0XHRcdGlmIChjbGVhbmVkTGluZS50cmltKCkubWF0Y2goL14oLXxcXGQrXFwufFxcKnxcXCspXFxzK1xcW1teXFxdXStcXF0vKSkge1xyXG5cdFx0XHRcdFx0cHJvY2Vzc2VkTGluZXMucHVzaChcclxuXHRcdFx0XHRcdFx0dGhpcy5hZGRMaW5lTWV0YWRhdGFUb1Rhc2soY2xlYW5lZExpbmUsIGxpbmVQYXJzZVJlc3VsdClcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdC8vIElmIGl0J3MgYSBsaXN0IGl0ZW0gYnV0IG5vdCBhIHRhc2ssIGNvbnZlcnQgdG8gdGFzayBhbmQgYWRkIGxpbmUtc3BlY2lmaWMgbWV0YWRhdGFcclxuXHRcdFx0XHRcdGNvbnN0IGxpc3RQcmVmaXggPSBjbGVhbmVkTGluZVxyXG5cdFx0XHRcdFx0XHQudHJpbSgpXHJcblx0XHRcdFx0XHRcdC5tYXRjaCgvXigtfFxcZCtcXC58XFwqfFxcKykvKT8uWzBdO1xyXG5cdFx0XHRcdFx0Y29uc3QgcmVzdE9mTGluZSA9IHRoaXMuY2xlYW5UZW1wb3JhcnlNYXJrcyhcclxuXHRcdFx0XHRcdFx0Y2xlYW5lZExpbmVcclxuXHRcdFx0XHRcdFx0XHQudHJpbSgpXHJcblx0XHRcdFx0XHRcdFx0LnN1YnN0cmluZyhsaXN0UHJlZml4Py5sZW5ndGggfHwgMClcclxuXHRcdFx0XHRcdFx0XHQudHJpbSgpXHJcblx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdC8vIFVzZSB0aGUgc3BlY2lmaWVkIHN0YXR1cyBvciBkZWZhdWx0IHRvIGVtcHR5IGNoZWNrYm94XHJcblx0XHRcdFx0XHRjb25zdCBzdGF0dXNNYXJrID0gdGhpcy50YXNrTWV0YWRhdGEuc3RhdHVzIHx8IFwiIFwiO1xyXG5cdFx0XHRcdFx0Y29uc3QgdGFza0xpbmUgPSBgJHtsaXN0UHJlZml4fSBbJHtzdGF0dXNNYXJrfV0gJHtyZXN0T2ZMaW5lfWA7XHJcblx0XHRcdFx0XHRwcm9jZXNzZWRMaW5lcy5wdXNoKFxyXG5cdFx0XHRcdFx0XHR0aGlzLmFkZExpbmVNZXRhZGF0YVRvVGFzayh0YXNrTGluZSwgbGluZVBhcnNlUmVzdWx0KVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gTm90IGEgbGlzdCBpdGVtIG9yIHRhc2ssIGNvbnZlcnQgdG8gdGFzayBhbmQgYWRkIGxpbmUtc3BlY2lmaWMgbWV0YWRhdGFcclxuXHRcdFx0XHQvLyBVc2UgdGhlIHNwZWNpZmllZCBzdGF0dXMgb3IgZGVmYXVsdCB0byBlbXB0eSBjaGVja2JveFxyXG5cdFx0XHRcdGNvbnN0IHN0YXR1c01hcmsgPSB0aGlzLnRhc2tNZXRhZGF0YS5zdGF0dXMgfHwgXCIgXCI7XHJcblx0XHRcdFx0Y29uc3QgY2xlYW5lZENvbnRlbnQgPSB0aGlzLmNsZWFuVGVtcG9yYXJ5TWFya3MoY2xlYW5lZExpbmUpO1xyXG5cdFx0XHRcdGNvbnN0IHRhc2tMaW5lID0gYC0gWyR7c3RhdHVzTWFya31dICR7Y2xlYW5lZENvbnRlbnR9YDtcclxuXHRcdFx0XHRwcm9jZXNzZWRMaW5lcy5wdXNoKFxyXG5cdFx0XHRcdFx0dGhpcy5hZGRMaW5lTWV0YWRhdGFUb1Rhc2sodGFza0xpbmUsIGxpbmVQYXJzZVJlc3VsdClcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHByb2Nlc3NlZExpbmVzLmpvaW4oXCJcXG5cIik7XHJcblx0fVxyXG5cclxuXHRhZGRNZXRhZGF0YVRvVGFzayh0YXNrTGluZTogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IG1ldGFkYXRhID0gdGhpcy5nZW5lcmF0ZU1ldGFkYXRhU3RyaW5nKCk7XHJcblx0XHRpZiAoIW1ldGFkYXRhKSByZXR1cm4gdGFza0xpbmU7XHJcblxyXG5cdFx0cmV0dXJuIGAke3Rhc2tMaW5lfSAke21ldGFkYXRhfWAudHJpbSgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQWRkIGxpbmUtc3BlY2lmaWMgbWV0YWRhdGEgdG8gYSB0YXNrIGxpbmVcclxuXHQgKiBAcGFyYW0gdGFza0xpbmUgLSBUaGUgdGFzayBsaW5lIHRvIGFkZCBtZXRhZGF0YSB0b1xyXG5cdCAqIEBwYXJhbSBsaW5lUGFyc2VSZXN1bHQgLSBQYXJzZSByZXN1bHQgZm9yIHRoaXMgc3BlY2lmaWMgbGluZVxyXG5cdCAqIEByZXR1cm5zIFRhc2sgbGluZSB3aXRoIGxpbmUtc3BlY2lmaWMgbWV0YWRhdGFcclxuXHQgKi9cclxuXHRhZGRMaW5lTWV0YWRhdGFUb1Rhc2soXHJcblx0XHR0YXNrTGluZTogc3RyaW5nLFxyXG5cdFx0bGluZVBhcnNlUmVzdWx0OiBMaW5lUGFyc2VSZXN1bHRcclxuXHQpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgbWV0YWRhdGEgPSB0aGlzLmdlbmVyYXRlTGluZU1ldGFkYXRhKGxpbmVQYXJzZVJlc3VsdCk7XHJcblx0XHRpZiAoIW1ldGFkYXRhKSByZXR1cm4gdGFza0xpbmU7XHJcblxyXG5cdFx0cmV0dXJuIGAke3Rhc2tMaW5lfSAke21ldGFkYXRhfWAudHJpbSgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2VuZXJhdGUgbWV0YWRhdGEgc3RyaW5nIGZvciBhIHNwZWNpZmljIGxpbmUgdXNpbmcgbGluZS1zcGVjaWZpYyBkYXRlc1xyXG5cdCAqIEBwYXJhbSBsaW5lUGFyc2VSZXN1bHQgLSBQYXJzZSByZXN1bHQgZm9yIHRoaXMgc3BlY2lmaWMgbGluZVxyXG5cdCAqIEByZXR1cm5zIE1ldGFkYXRhIHN0cmluZyBmb3IgdGhpcyBsaW5lXHJcblx0ICovXHJcblx0Z2VuZXJhdGVMaW5lTWV0YWRhdGEobGluZVBhcnNlUmVzdWx0OiBMaW5lUGFyc2VSZXN1bHQpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgbWV0YWRhdGE6IHN0cmluZ1tdID0gW107XHJcblx0XHRjb25zdCB1c2VEYXRhdmlld0Zvcm1hdCA9IHRoaXMucHJlZmVyTWV0YWRhdGFGb3JtYXQgPT09IFwiZGF0YXZpZXdcIjtcclxuXHJcblx0XHQvLyBVc2UgbGluZS1zcGVjaWZpYyBkYXRlcyBmaXJzdCwgZmFsbCBiYWNrIHRvIGdsb2JhbCBtZXRhZGF0YVxyXG5cdFx0Y29uc3Qgc3RhcnREYXRlID1cclxuXHRcdFx0bGluZVBhcnNlUmVzdWx0LnN0YXJ0RGF0ZSB8fCB0aGlzLnRhc2tNZXRhZGF0YS5zdGFydERhdGU7XHJcblx0XHRjb25zdCBkdWVEYXRlID0gbGluZVBhcnNlUmVzdWx0LmR1ZURhdGUgfHwgdGhpcy50YXNrTWV0YWRhdGEuZHVlRGF0ZTtcclxuXHRcdGNvbnN0IHNjaGVkdWxlZERhdGUgPVxyXG5cdFx0XHRsaW5lUGFyc2VSZXN1bHQuc2NoZWR1bGVkRGF0ZSB8fCB0aGlzLnRhc2tNZXRhZGF0YS5zY2hlZHVsZWREYXRlO1xyXG5cclxuXHRcdC8vIEZvcm1hdCBkYXRlcyB0byBzdHJpbmdzIGluIFlZWVktTU0tREQgZm9ybWF0XHJcblx0XHRpZiAoc3RhcnREYXRlKSB7XHJcblx0XHRcdGNvbnN0IGZvcm1hdHRlZFN0YXJ0RGF0ZSA9IHRoaXMuZm9ybWF0RGF0ZShzdGFydERhdGUpO1xyXG5cdFx0XHRtZXRhZGF0YS5wdXNoKFxyXG5cdFx0XHRcdHVzZURhdGF2aWV3Rm9ybWF0XHJcblx0XHRcdFx0XHQ/IGBbc3RhcnQ6OiAke2Zvcm1hdHRlZFN0YXJ0RGF0ZX1dYFxyXG5cdFx0XHRcdFx0OiBg8J+bqyAke2Zvcm1hdHRlZFN0YXJ0RGF0ZX1gXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKGR1ZURhdGUpIHtcclxuXHRcdFx0Y29uc3QgZm9ybWF0dGVkRHVlRGF0ZSA9IHRoaXMuZm9ybWF0RGF0ZShkdWVEYXRlKTtcclxuXHRcdFx0bWV0YWRhdGEucHVzaChcclxuXHRcdFx0XHR1c2VEYXRhdmlld0Zvcm1hdFxyXG5cdFx0XHRcdFx0PyBgW2R1ZTo6ICR7Zm9ybWF0dGVkRHVlRGF0ZX1dYFxyXG5cdFx0XHRcdFx0OiBg8J+ThSAke2Zvcm1hdHRlZER1ZURhdGV9YFxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChzY2hlZHVsZWREYXRlKSB7XHJcblx0XHRcdGNvbnN0IGZvcm1hdHRlZFNjaGVkdWxlZERhdGUgPSB0aGlzLmZvcm1hdERhdGUoc2NoZWR1bGVkRGF0ZSk7XHJcblx0XHRcdG1ldGFkYXRhLnB1c2goXHJcblx0XHRcdFx0dXNlRGF0YXZpZXdGb3JtYXRcclxuXHRcdFx0XHRcdD8gYFtzY2hlZHVsZWQ6OiAke2Zvcm1hdHRlZFNjaGVkdWxlZERhdGV9XWBcclxuXHRcdFx0XHRcdDogYOKPsyAke2Zvcm1hdHRlZFNjaGVkdWxlZERhdGV9YFxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFkZCBwcmlvcml0eSBpZiBzZXQgKHVzZSBnbG9iYWwgbWV0YWRhdGEpXHJcblx0XHRpZiAodGhpcy50YXNrTWV0YWRhdGEucHJpb3JpdHkpIHtcclxuXHRcdFx0aWYgKHVzZURhdGF2aWV3Rm9ybWF0KSB7XHJcblx0XHRcdFx0Ly8g5L2/55SoIGRhdGF2aWV3IOagvOW8j1xyXG5cdFx0XHRcdGxldCBwcmlvcml0eVZhbHVlOiBzdHJpbmcgfCBudW1iZXI7XHJcblx0XHRcdFx0c3dpdGNoICh0aGlzLnRhc2tNZXRhZGF0YS5wcmlvcml0eSkge1xyXG5cdFx0XHRcdFx0Y2FzZSA1OlxyXG5cdFx0XHRcdFx0XHRwcmlvcml0eVZhbHVlID0gXCJoaWdoZXN0XCI7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSA0OlxyXG5cdFx0XHRcdFx0XHRwcmlvcml0eVZhbHVlID0gXCJoaWdoXCI7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSAzOlxyXG5cdFx0XHRcdFx0XHRwcmlvcml0eVZhbHVlID0gXCJtZWRpdW1cIjtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIDI6XHJcblx0XHRcdFx0XHRcdHByaW9yaXR5VmFsdWUgPSBcImxvd1wiO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgMTpcclxuXHRcdFx0XHRcdFx0cHJpb3JpdHlWYWx1ZSA9IFwibG93ZXN0XCI7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRcdFx0cHJpb3JpdHlWYWx1ZSA9IHRoaXMudGFza01ldGFkYXRhLnByaW9yaXR5O1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRtZXRhZGF0YS5wdXNoKGBbcHJpb3JpdHk6OiAke3ByaW9yaXR5VmFsdWV9XWApO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIOS9v+eUqCBlbW9qaSDmoLzlvI9cclxuXHRcdFx0XHRsZXQgcHJpb3JpdHlNYXJrZXIgPSBcIlwiO1xyXG5cdFx0XHRcdHN3aXRjaCAodGhpcy50YXNrTWV0YWRhdGEucHJpb3JpdHkpIHtcclxuXHRcdFx0XHRcdGNhc2UgNTpcclxuXHRcdFx0XHRcdFx0cHJpb3JpdHlNYXJrZXIgPSBcIvCflLpcIjtcclxuXHRcdFx0XHRcdFx0YnJlYWs7IC8vIEhpZ2hlc3RcclxuXHRcdFx0XHRcdGNhc2UgNDpcclxuXHRcdFx0XHRcdFx0cHJpb3JpdHlNYXJrZXIgPSBcIuKPq1wiO1xyXG5cdFx0XHRcdFx0XHRicmVhazsgLy8gSGlnaFxyXG5cdFx0XHRcdFx0Y2FzZSAzOlxyXG5cdFx0XHRcdFx0XHRwcmlvcml0eU1hcmtlciA9IFwi8J+UvFwiO1xyXG5cdFx0XHRcdFx0XHRicmVhazsgLy8gTWVkaXVtXHJcblx0XHRcdFx0XHRjYXNlIDI6XHJcblx0XHRcdFx0XHRcdHByaW9yaXR5TWFya2VyID0gXCLwn5S9XCI7XHJcblx0XHRcdFx0XHRcdGJyZWFrOyAvLyBMb3dcclxuXHRcdFx0XHRcdGNhc2UgMTpcclxuXHRcdFx0XHRcdFx0cHJpb3JpdHlNYXJrZXIgPSBcIuKPrFwiO1xyXG5cdFx0XHRcdFx0XHRicmVhazsgLy8gTG93ZXN0XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGlmIChwcmlvcml0eU1hcmtlcikge1xyXG5cdFx0XHRcdFx0bWV0YWRhdGEucHVzaChwcmlvcml0eU1hcmtlcik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWRkIHByb2plY3QgaWYgc2V0ICh1c2UgZ2xvYmFsIG1ldGFkYXRhKVxyXG5cdFx0aWYgKHRoaXMudGFza01ldGFkYXRhLnByb2plY3QpIHtcclxuXHRcdFx0aWYgKHVzZURhdGF2aWV3Rm9ybWF0KSB7XHJcblx0XHRcdFx0Y29uc3QgcHJvamVjdFByZWZpeCA9XHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0VGFnUHJlZml4Py5bXHJcblx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnByZWZlck1ldGFkYXRhRm9ybWF0XHJcblx0XHRcdFx0XHRdIHx8IFwicHJvamVjdFwiO1xyXG5cdFx0XHRcdG1ldGFkYXRhLnB1c2goXHJcblx0XHRcdFx0XHRgWyR7cHJvamVjdFByZWZpeH06OiAke3RoaXMudGFza01ldGFkYXRhLnByb2plY3R9XWBcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGNvbnN0IHByb2plY3RQcmVmaXggPVxyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvamVjdFRhZ1ByZWZpeD8uW1xyXG5cdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcmVmZXJNZXRhZGF0YUZvcm1hdFxyXG5cdFx0XHRcdFx0XSB8fCBcInByb2plY3RcIjtcclxuXHRcdFx0XHRtZXRhZGF0YS5wdXNoKGAjJHtwcm9qZWN0UHJlZml4fS8ke3RoaXMudGFza01ldGFkYXRhLnByb2plY3R9YCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGQgY29udGV4dCBpZiBzZXQgKHVzZSBnbG9iYWwgbWV0YWRhdGEpXHJcblx0XHRpZiAodGhpcy50YXNrTWV0YWRhdGEuY29udGV4dCkge1xyXG5cdFx0XHRpZiAodXNlRGF0YXZpZXdGb3JtYXQpIHtcclxuXHRcdFx0XHRjb25zdCBjb250ZXh0UHJlZml4ID1cclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbnRleHRUYWdQcmVmaXg/LltcclxuXHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucHJlZmVyTWV0YWRhdGFGb3JtYXRcclxuXHRcdFx0XHRcdF0gfHwgXCJjb250ZXh0XCI7XHJcblx0XHRcdFx0bWV0YWRhdGEucHVzaChcclxuXHRcdFx0XHRcdGBbJHtjb250ZXh0UHJlZml4fTo6ICR7dGhpcy50YXNrTWV0YWRhdGEuY29udGV4dH1dYFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Y29uc3QgY29udGV4dFByZWZpeCA9XHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb250ZXh0VGFnUHJlZml4Py5bXHJcblx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnByZWZlck1ldGFkYXRhRm9ybWF0XHJcblx0XHRcdFx0XHRdIHx8IFwiQFwiO1xyXG5cdFx0XHRcdG1ldGFkYXRhLnB1c2goYCR7Y29udGV4dFByZWZpeH0ke3RoaXMudGFza01ldGFkYXRhLmNvbnRleHR9YCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGQgcmVjdXJyZW5jZSBpZiBzZXQgKHVzZSBnbG9iYWwgbWV0YWRhdGEpXHJcblx0XHRpZiAodGhpcy50YXNrTWV0YWRhdGEucmVjdXJyZW5jZSkge1xyXG5cdFx0XHRtZXRhZGF0YS5wdXNoKFxyXG5cdFx0XHRcdHVzZURhdGF2aWV3Rm9ybWF0XHJcblx0XHRcdFx0XHQ/IGBbcmVwZWF0OjogJHt0aGlzLnRhc2tNZXRhZGF0YS5yZWN1cnJlbmNlfV1gXHJcblx0XHRcdFx0XHQ6IGDwn5SBICR7dGhpcy50YXNrTWV0YWRhdGEucmVjdXJyZW5jZX1gXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIG1ldGFkYXRhLmpvaW4oXCIgXCIpO1xyXG5cdH1cclxuXHJcblx0Z2VuZXJhdGVNZXRhZGF0YVN0cmluZygpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgbWV0YWRhdGE6IHN0cmluZ1tdID0gW107XHJcblx0XHRjb25zdCB1c2VEYXRhdmlld0Zvcm1hdCA9IHRoaXMucHJlZmVyTWV0YWRhdGFGb3JtYXQgPT09IFwiZGF0YXZpZXdcIjtcclxuXHJcblx0XHQvLyBGb3JtYXQgZGF0ZXMgdG8gc3RyaW5ncyBpbiBZWVlZLU1NLUREIGZvcm1hdFxyXG5cdFx0aWYgKHRoaXMudGFza01ldGFkYXRhLnN0YXJ0RGF0ZSkge1xyXG5cdFx0XHRjb25zdCBmb3JtYXR0ZWRTdGFydERhdGUgPSB0aGlzLmZvcm1hdERhdGUoXHJcblx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEuc3RhcnREYXRlXHJcblx0XHRcdCk7XHJcblx0XHRcdG1ldGFkYXRhLnB1c2goXHJcblx0XHRcdFx0dXNlRGF0YXZpZXdGb3JtYXRcclxuXHRcdFx0XHRcdD8gYFtzdGFydDo6ICR7Zm9ybWF0dGVkU3RhcnREYXRlfV1gXHJcblx0XHRcdFx0XHQ6IGDwn5urICR7Zm9ybWF0dGVkU3RhcnREYXRlfWBcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAodGhpcy50YXNrTWV0YWRhdGEuZHVlRGF0ZSkge1xyXG5cdFx0XHRjb25zdCBmb3JtYXR0ZWREdWVEYXRlID0gdGhpcy5mb3JtYXREYXRlKHRoaXMudGFza01ldGFkYXRhLmR1ZURhdGUpO1xyXG5cdFx0XHRtZXRhZGF0YS5wdXNoKFxyXG5cdFx0XHRcdHVzZURhdGF2aWV3Rm9ybWF0XHJcblx0XHRcdFx0XHQ/IGBbZHVlOjogJHtmb3JtYXR0ZWREdWVEYXRlfV1gXHJcblx0XHRcdFx0XHQ6IGDwn5OFICR7Zm9ybWF0dGVkRHVlRGF0ZX1gXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHRoaXMudGFza01ldGFkYXRhLnNjaGVkdWxlZERhdGUpIHtcclxuXHRcdFx0Y29uc3QgZm9ybWF0dGVkU2NoZWR1bGVkRGF0ZSA9IHRoaXMuZm9ybWF0RGF0ZShcclxuXHRcdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS5zY2hlZHVsZWREYXRlXHJcblx0XHRcdCk7XHJcblx0XHRcdG1ldGFkYXRhLnB1c2goXHJcblx0XHRcdFx0dXNlRGF0YXZpZXdGb3JtYXRcclxuXHRcdFx0XHRcdD8gYFtzY2hlZHVsZWQ6OiAke2Zvcm1hdHRlZFNjaGVkdWxlZERhdGV9XWBcclxuXHRcdFx0XHRcdDogYOKPsyAke2Zvcm1hdHRlZFNjaGVkdWxlZERhdGV9YFxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFkZCBwcmlvcml0eSBpZiBzZXRcclxuXHRcdGlmICh0aGlzLnRhc2tNZXRhZGF0YS5wcmlvcml0eSkge1xyXG5cdFx0XHRpZiAodXNlRGF0YXZpZXdGb3JtYXQpIHtcclxuXHRcdFx0XHQvLyDkvb/nlKggZGF0YXZpZXcg5qC85byPXHJcblx0XHRcdFx0bGV0IHByaW9yaXR5VmFsdWU6IHN0cmluZyB8IG51bWJlcjtcclxuXHRcdFx0XHRzd2l0Y2ggKHRoaXMudGFza01ldGFkYXRhLnByaW9yaXR5KSB7XHJcblx0XHRcdFx0XHRjYXNlIDU6XHJcblx0XHRcdFx0XHRcdHByaW9yaXR5VmFsdWUgPSBcImhpZ2hlc3RcIjtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIDQ6XHJcblx0XHRcdFx0XHRcdHByaW9yaXR5VmFsdWUgPSBcImhpZ2hcIjtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIDM6XHJcblx0XHRcdFx0XHRcdHByaW9yaXR5VmFsdWUgPSBcIm1lZGl1bVwiO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgMjpcclxuXHRcdFx0XHRcdFx0cHJpb3JpdHlWYWx1ZSA9IFwibG93XCI7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSAxOlxyXG5cdFx0XHRcdFx0XHRwcmlvcml0eVZhbHVlID0gXCJsb3dlc3RcIjtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdFx0XHRwcmlvcml0eVZhbHVlID0gdGhpcy50YXNrTWV0YWRhdGEucHJpb3JpdHk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdG1ldGFkYXRhLnB1c2goYFtwcmlvcml0eTo6ICR7cHJpb3JpdHlWYWx1ZX1dYCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8g5L2/55SoIGVtb2ppIOagvOW8j1xyXG5cdFx0XHRcdGxldCBwcmlvcml0eU1hcmtlciA9IFwiXCI7XHJcblx0XHRcdFx0c3dpdGNoICh0aGlzLnRhc2tNZXRhZGF0YS5wcmlvcml0eSkge1xyXG5cdFx0XHRcdFx0Y2FzZSA1OlxyXG5cdFx0XHRcdFx0XHRwcmlvcml0eU1hcmtlciA9IFwi8J+UulwiO1xyXG5cdFx0XHRcdFx0XHRicmVhazsgLy8gSGlnaGVzdFxyXG5cdFx0XHRcdFx0Y2FzZSA0OlxyXG5cdFx0XHRcdFx0XHRwcmlvcml0eU1hcmtlciA9IFwi4o+rXCI7XHJcblx0XHRcdFx0XHRcdGJyZWFrOyAvLyBIaWdoXHJcblx0XHRcdFx0XHRjYXNlIDM6XHJcblx0XHRcdFx0XHRcdHByaW9yaXR5TWFya2VyID0gXCLwn5S8XCI7XHJcblx0XHRcdFx0XHRcdGJyZWFrOyAvLyBNZWRpdW1cclxuXHRcdFx0XHRcdGNhc2UgMjpcclxuXHRcdFx0XHRcdFx0cHJpb3JpdHlNYXJrZXIgPSBcIvCflL1cIjtcclxuXHRcdFx0XHRcdFx0YnJlYWs7IC8vIExvd1xyXG5cdFx0XHRcdFx0Y2FzZSAxOlxyXG5cdFx0XHRcdFx0XHRwcmlvcml0eU1hcmtlciA9IFwi4o+sXCI7XHJcblx0XHRcdFx0XHRcdGJyZWFrOyAvLyBMb3dlc3RcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aWYgKHByaW9yaXR5TWFya2VyKSB7XHJcblx0XHRcdFx0XHRtZXRhZGF0YS5wdXNoKHByaW9yaXR5TWFya2VyKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGQgcHJvamVjdCBpZiBzZXRcclxuXHRcdGlmICh0aGlzLnRhc2tNZXRhZGF0YS5wcm9qZWN0KSB7XHJcblx0XHRcdGlmICh1c2VEYXRhdmlld0Zvcm1hdCkge1xyXG5cdFx0XHRcdGNvbnN0IHByb2plY3RQcmVmaXggPVxyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvamVjdFRhZ1ByZWZpeFtcclxuXHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucHJlZmVyTWV0YWRhdGFGb3JtYXRcclxuXHRcdFx0XHRcdF0gfHwgXCJwcm9qZWN0XCI7XHJcblx0XHRcdFx0bWV0YWRhdGEucHVzaChcclxuXHRcdFx0XHRcdGBbJHtwcm9qZWN0UHJlZml4fTo6ICR7dGhpcy50YXNrTWV0YWRhdGEucHJvamVjdH1dYFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Y29uc3QgcHJvamVjdFByZWZpeCA9XHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0VGFnUHJlZml4W1xyXG5cdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcmVmZXJNZXRhZGF0YUZvcm1hdFxyXG5cdFx0XHRcdFx0XSB8fCBcInByb2plY3RcIjtcclxuXHRcdFx0XHRtZXRhZGF0YS5wdXNoKGAjJHtwcm9qZWN0UHJlZml4fS8ke3RoaXMudGFza01ldGFkYXRhLnByb2plY3R9YCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGQgY29udGV4dCBpZiBzZXRcclxuXHRcdGlmICh0aGlzLnRhc2tNZXRhZGF0YS5jb250ZXh0KSB7XHJcblx0XHRcdGlmICh1c2VEYXRhdmlld0Zvcm1hdCkge1xyXG5cdFx0XHRcdGNvbnN0IGNvbnRleHRQcmVmaXggPVxyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuY29udGV4dFRhZ1ByZWZpeFtcclxuXHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucHJlZmVyTWV0YWRhdGFGb3JtYXRcclxuXHRcdFx0XHRcdF0gfHwgXCJjb250ZXh0XCI7XHJcblx0XHRcdFx0bWV0YWRhdGEucHVzaChcclxuXHRcdFx0XHRcdGBbJHtjb250ZXh0UHJlZml4fTo6ICR7dGhpcy50YXNrTWV0YWRhdGEuY29udGV4dH1dYFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Y29uc3QgY29udGV4dFByZWZpeCA9XHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb250ZXh0VGFnUHJlZml4W1xyXG5cdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcmVmZXJNZXRhZGF0YUZvcm1hdFxyXG5cdFx0XHRcdFx0XSB8fCBcIkBcIjtcclxuXHRcdFx0XHRtZXRhZGF0YS5wdXNoKGAke2NvbnRleHRQcmVmaXh9JHt0aGlzLnRhc2tNZXRhZGF0YS5jb250ZXh0fWApO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWRkIHJlY3VycmVuY2UgaWYgc2V0XHJcblx0XHRpZiAodGhpcy50YXNrTWV0YWRhdGEucmVjdXJyZW5jZSkge1xyXG5cdFx0XHRtZXRhZGF0YS5wdXNoKFxyXG5cdFx0XHRcdHVzZURhdGF2aWV3Rm9ybWF0XHJcblx0XHRcdFx0XHQ/IGBbcmVwZWF0OjogJHt0aGlzLnRhc2tNZXRhZGF0YS5yZWN1cnJlbmNlfV1gXHJcblx0XHRcdFx0XHQ6IGDwn5SBICR7dGhpcy50YXNrTWV0YWRhdGEucmVjdXJyZW5jZX1gXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIG1ldGFkYXRhLmpvaW4oXCIgXCIpO1xyXG5cdH1cclxuXHJcblx0Zm9ybWF0RGF0ZShkYXRlOiBEYXRlKTogc3RyaW5nIHtcclxuXHRcdHJldHVybiBgJHtkYXRlLmdldEZ1bGxZZWFyKCl9LSR7U3RyaW5nKGRhdGUuZ2V0TW9udGgoKSArIDEpLnBhZFN0YXJ0KFxyXG5cdFx0XHQyLFxyXG5cdFx0XHRcIjBcIlxyXG5cdFx0KX0tJHtTdHJpbmcoZGF0ZS5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIFwiMFwiKX1gO1xyXG5cdH1cclxuXHJcblx0cGFyc2VEYXRlKGRhdGVTdHJpbmc6IHN0cmluZyk6IERhdGUge1xyXG5cdFx0Y29uc3QgW3llYXIsIG1vbnRoLCBkYXldID0gZGF0ZVN0cmluZy5zcGxpdChcIi1cIikubWFwKE51bWJlcik7XHJcblx0XHRyZXR1cm4gbmV3IERhdGUoeWVhciwgbW9udGggLSAxLCBkYXkpOyAvLyBtb250aCBpcyAwLWluZGV4ZWQgaW4gSmF2YVNjcmlwdCBEYXRlXHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDaGVjayBpZiBhIG1ldGFkYXRhIGZpZWxkIHdhcyBtYW51YWxseSBzZXQgYnkgdGhlIHVzZXJcclxuXHQgKiBAcGFyYW0gZmllbGQgLSBUaGUgZmllbGQgbmFtZSB0byBjaGVja1xyXG5cdCAqIEByZXR1cm5zIFRydWUgaWYgdGhlIGZpZWxkIHdhcyBtYW51YWxseSBzZXRcclxuXHQgKi9cclxuXHRpc01hbnVhbGx5U2V0KGZpZWxkOiBcInN0YXJ0RGF0ZVwiIHwgXCJkdWVEYXRlXCIgfCBcInNjaGVkdWxlZERhdGVcIik6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIHRoaXMudGFza01ldGFkYXRhLm1hbnVhbGx5U2V0Py5bZmllbGRdIHx8IGZhbHNlO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTWFyayBhIG1ldGFkYXRhIGZpZWxkIGFzIG1hbnVhbGx5IHNldFxyXG5cdCAqIEBwYXJhbSBmaWVsZCAtIFRoZSBmaWVsZCBuYW1lIHRvIG1hcmtcclxuXHQgKi9cclxuXHRtYXJrQXNNYW51YWxseVNldChmaWVsZDogXCJzdGFydERhdGVcIiB8IFwiZHVlRGF0ZVwiIHwgXCJzY2hlZHVsZWREYXRlXCIpOiB2b2lkIHtcclxuXHRcdGlmICghdGhpcy50YXNrTWV0YWRhdGEubWFudWFsbHlTZXQpIHtcclxuXHRcdFx0dGhpcy50YXNrTWV0YWRhdGEubWFudWFsbHlTZXQgPSB7fTtcclxuXHRcdH1cclxuXHRcdHRoaXMudGFza01ldGFkYXRhLm1hbnVhbGx5U2V0W2ZpZWxkXSA9IHRydWU7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDbGVhbiB0ZW1wb3JhcnkgbWFya3MgZnJvbSB1c2VyIGlucHV0IHRoYXQgbWlnaHQgY29uZmxpY3Qgd2l0aCBmb3JtYWwgbWV0YWRhdGFcclxuXHQgKi9cclxuXHRwcml2YXRlIGNsZWFuVGVtcG9yYXJ5TWFya3MoY29udGVudDogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdGxldCBjbGVhbmVkID0gY29udGVudDtcclxuXHJcblx0XHQvLyBSZW1vdmUgc3RhbmRhbG9uZSBleGNsYW1hdGlvbiBtYXJrcyB0aGF0IHVzZXJzIG1pZ2h0IHR5cGUgZm9yIHByaW9yaXR5XHJcblx0XHRjbGVhbmVkID0gY2xlYW5lZC5yZXBsYWNlKC9cXHMqIVxccyovZywgXCIgXCIpO1xyXG5cclxuXHRcdC8vIFJlbW92ZSBzdGFuZGFsb25lIHRpbGRlIG1hcmtzIHRoYXQgdXNlcnMgbWlnaHQgdHlwZSBmb3IgZGF0ZVxyXG5cdFx0Y2xlYW5lZCA9IGNsZWFuZWQucmVwbGFjZSgvXFxzKn5cXHMqL2csIFwiIFwiKTtcclxuXHJcblx0XHQvLyBSZW1vdmUgc3RhbmRhbG9uZSBwcmlvcml0eSBzeW1ib2xzIHRoYXQgdXNlcnMgbWlnaHQgdHlwZVxyXG5cdFx0Y2xlYW5lZCA9IGNsZWFuZWQucmVwbGFjZSgvXFxzKlvwn5S64o+r8J+UvPCflL3ij6zvuI9dXFxzKi9nLCBcIiBcIik7XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIHN0YW5kYWxvbmUgZGF0ZSBzeW1ib2xzIHRoYXQgdXNlcnMgbWlnaHQgdHlwZVxyXG5cdFx0Y2xlYW5lZCA9IGNsZWFuZWQucmVwbGFjZSgvXFxzKlvwn5OF8J+bq+KPs+KcheKeleKdjF1cXHMqL2csIFwiIFwiKTtcclxuXHJcblx0XHQvLyBSZW1vdmUgbG9jYXRpb24vZm9sZGVyIHN5bWJvbHMgdGhhdCB1c2VycyBtaWdodCB0eXBlXHJcblx0XHRjbGVhbmVkID0gY2xlYW5lZC5yZXBsYWNlKC9cXHMqW/Cfk4Hwn4+g8J+PovCfj6rwn4+r8J+PrPCfj63wn4+v8J+PsF1cXHMqL2csIFwiIFwiKTtcclxuXHJcblx0XHQvLyBSZW1vdmUgb3RoZXIgbWV0YWRhdGEgc3ltYm9scyB0aGF0IHVzZXJzIG1pZ2h0IHR5cGVcclxuXHRcdGNsZWFuZWQgPSBjbGVhbmVkLnJlcGxhY2UoL1xccypb8J+GlOKblPCfj4Hwn5SBXVxccyovZywgXCIgXCIpO1xyXG5cclxuXHRcdC8vIFJlbW92ZSB0YXJnZXQvbG9jYXRpb24gcHJlZml4IHBhdHRlcm5zIChsaWtlIEBsb2NhdGlvbiwgdGFyZ2V0OilcclxuXHRcdGNsZWFuZWQgPSBjbGVhbmVkLnJlcGxhY2UoL1xccypAXFx3KlxccyovZywgXCIgXCIpO1xyXG5cdFx0Y2xlYW5lZCA9IGNsZWFuZWQucmVwbGFjZSgvXFxzKnRhcmdldDpcXHMqL2dpLCBcIiBcIik7XHJcblxyXG5cdFx0Ly8gQ2xlYW4gdXAgbXVsdGlwbGUgc3BhY2VzIGFuZCB0cmltXHJcblx0XHRjbGVhbmVkID0gY2xlYW5lZC5yZXBsYWNlKC9cXHMrL2csIFwiIFwiKS50cmltKCk7XHJcblxyXG5cdFx0cmV0dXJuIGNsZWFuZWQ7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBQZXJmb3JtIHJlYWwtdGltZSBwYXJzaW5nIHdpdGggZGVib3VuY2luZ1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgcGVyZm9ybVJlYWxUaW1lUGFyc2luZygpOiB2b2lkIHtcclxuXHRcdGlmICghdGhpcy5jYXB0dXJlZENvbnRlbnQpIHJldHVybjtcclxuXHJcblx0XHQvLyBQYXJzZSBlYWNoIGxpbmUgc2VwYXJhdGVseSB0byBnZXQgcGVyLWxpbmUgcmVzdWx0c1xyXG5cdFx0Y29uc3QgbGluZXMgPSB0aGlzLmNhcHR1cmVkQ29udGVudC5zcGxpdChcIlxcblwiKTtcclxuXHRcdGNvbnN0IGxpbmVQYXJzZVJlc3VsdHMgPVxyXG5cdFx0XHR0aGlzLnRpbWVQYXJzaW5nU2VydmljZS5wYXJzZVRpbWVFeHByZXNzaW9uc1BlckxpbmUobGluZXMpO1xyXG5cclxuXHRcdC8vIEFnZ3JlZ2F0ZSBkYXRlcyBmcm9tIGFsbCBsaW5lcyB0byB1cGRhdGUgZ2xvYmFsIG1ldGFkYXRhIChvbmx5IGlmIG5vdCBtYW51YWxseSBzZXQpXHJcblx0XHRsZXQgYWdncmVnYXRlZFN0YXJ0RGF0ZTogRGF0ZSB8IHVuZGVmaW5lZDtcclxuXHRcdGxldCBhZ2dyZWdhdGVkRHVlRGF0ZTogRGF0ZSB8IHVuZGVmaW5lZDtcclxuXHRcdGxldCBhZ2dyZWdhdGVkU2NoZWR1bGVkRGF0ZTogRGF0ZSB8IHVuZGVmaW5lZDtcclxuXHJcblx0XHQvLyBGaW5kIHRoZSBmaXJzdCBvY2N1cnJlbmNlIG9mIGVhY2ggZGF0ZSB0eXBlIGFjcm9zcyBhbGwgbGluZXNcclxuXHRcdGZvciAoY29uc3QgbGluZVJlc3VsdCBvZiBsaW5lUGFyc2VSZXN1bHRzKSB7XHJcblx0XHRcdGlmIChsaW5lUmVzdWx0LnN0YXJ0RGF0ZSAmJiAhYWdncmVnYXRlZFN0YXJ0RGF0ZSkge1xyXG5cdFx0XHRcdGFnZ3JlZ2F0ZWRTdGFydERhdGUgPSBsaW5lUmVzdWx0LnN0YXJ0RGF0ZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAobGluZVJlc3VsdC5kdWVEYXRlICYmICFhZ2dyZWdhdGVkRHVlRGF0ZSkge1xyXG5cdFx0XHRcdGFnZ3JlZ2F0ZWREdWVEYXRlID0gbGluZVJlc3VsdC5kdWVEYXRlO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChsaW5lUmVzdWx0LnNjaGVkdWxlZERhdGUgJiYgIWFnZ3JlZ2F0ZWRTY2hlZHVsZWREYXRlKSB7XHJcblx0XHRcdFx0YWdncmVnYXRlZFNjaGVkdWxlZERhdGUgPSBsaW5lUmVzdWx0LnNjaGVkdWxlZERhdGU7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBVcGRhdGUgdGFzayBtZXRhZGF0YSB3aXRoIGFnZ3JlZ2F0ZWQgZGF0ZXMgKG9ubHkgaWYgbm90IG1hbnVhbGx5IHNldClcclxuXHRcdGlmIChhZ2dyZWdhdGVkU3RhcnREYXRlICYmICF0aGlzLmlzTWFudWFsbHlTZXQoXCJzdGFydERhdGVcIikpIHtcclxuXHRcdFx0dGhpcy50YXNrTWV0YWRhdGEuc3RhcnREYXRlID0gYWdncmVnYXRlZFN0YXJ0RGF0ZTtcclxuXHRcdFx0Ly8gVXBkYXRlIFVJIGlucHV0IGZpZWxkXHJcblx0XHRcdGlmICh0aGlzLnN0YXJ0RGF0ZUlucHV0KSB7XHJcblx0XHRcdFx0dGhpcy5zdGFydERhdGVJbnB1dC52YWx1ZSA9XHJcblx0XHRcdFx0XHR0aGlzLmZvcm1hdERhdGUoYWdncmVnYXRlZFN0YXJ0RGF0ZSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGlmIChhZ2dyZWdhdGVkRHVlRGF0ZSAmJiAhdGhpcy5pc01hbnVhbGx5U2V0KFwiZHVlRGF0ZVwiKSkge1xyXG5cdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS5kdWVEYXRlID0gYWdncmVnYXRlZER1ZURhdGU7XHJcblx0XHRcdC8vIFVwZGF0ZSBVSSBpbnB1dCBmaWVsZFxyXG5cdFx0XHRpZiAodGhpcy5kdWVEYXRlSW5wdXQpIHtcclxuXHRcdFx0XHR0aGlzLmR1ZURhdGVJbnB1dC52YWx1ZSA9IHRoaXMuZm9ybWF0RGF0ZShhZ2dyZWdhdGVkRHVlRGF0ZSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGlmIChhZ2dyZWdhdGVkU2NoZWR1bGVkRGF0ZSAmJiAhdGhpcy5pc01hbnVhbGx5U2V0KFwic2NoZWR1bGVkRGF0ZVwiKSkge1xyXG5cdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS5zY2hlZHVsZWREYXRlID0gYWdncmVnYXRlZFNjaGVkdWxlZERhdGU7XHJcblx0XHRcdC8vIFVwZGF0ZSBVSSBpbnB1dCBmaWVsZFxyXG5cdFx0XHRpZiAodGhpcy5zY2hlZHVsZWREYXRlSW5wdXQpIHtcclxuXHRcdFx0XHR0aGlzLnNjaGVkdWxlZERhdGVJbnB1dC52YWx1ZSA9IHRoaXMuZm9ybWF0RGF0ZShcclxuXHRcdFx0XHRcdGFnZ3JlZ2F0ZWRTY2hlZHVsZWREYXRlXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIHRoZSBwYXJzZWQgdGltZSBleHByZXNzaW9ucyBkaXNwbGF5XHJcblx0ICogQHBhcmFtIHBhcnNlUmVzdWx0IC0gVGhlIHJlc3VsdCBmcm9tIHRpbWUgcGFyc2luZ1xyXG5cdCAqL1xyXG5cdC8vIHVwZGF0ZVBhcnNlZFRpbWVEaXNwbGF5KHBhcnNlUmVzdWx0OiBQYXJzZWRUaW1lUmVzdWx0KTogdm9pZCB7XHJcblx0Ly8gXHRpZiAoIXRoaXMucGFyc2VkVGltZURpc3BsYXlFbCkgcmV0dXJuO1xyXG5cclxuXHQvLyBcdHRoaXMucGFyc2VkVGltZURpc3BsYXlFbC5lbXB0eSgpO1xyXG5cclxuXHQvLyBcdGlmIChwYXJzZVJlc3VsdC5wYXJzZWRFeHByZXNzaW9ucy5sZW5ndGggPT09IDApIHtcclxuXHQvLyBcdFx0dGhpcy5wYXJzZWRUaW1lRGlzcGxheUVsLmNyZWF0ZURpdih7XHJcblx0Ly8gXHRcdFx0dGV4dDogdChcIk5vIHRpbWUgZXhwcmVzc2lvbnMgZm91bmRcIiksXHJcblx0Ly8gXHRcdFx0Y2xzOiBcInF1aWNrLWNhcHR1cmUtbm8tZXhwcmVzc2lvbnNcIixcclxuXHQvLyBcdFx0fSk7XHJcblx0Ly8gXHRcdHJldHVybjtcclxuXHQvLyBcdH1cclxuXHJcblx0Ly8gXHRwYXJzZVJlc3VsdC5wYXJzZWRFeHByZXNzaW9ucy5mb3JFYWNoKChleHByZXNzaW9uLCBpbmRleCkgPT4ge1xyXG5cdC8vIFx0XHRjb25zdCBleHByZXNzaW9uRWwgPSB0aGlzLnBhcnNlZFRpbWVEaXNwbGF5RWwhLmNyZWF0ZURpdih7XHJcblx0Ly8gXHRcdFx0Y2xzOiBcInF1aWNrLWNhcHR1cmUtZXhwcmVzc2lvbi1pdGVtXCIsXHJcblx0Ly8gXHRcdH0pO1xyXG5cclxuXHQvLyBcdFx0Y29uc3QgdGV4dEVsID0gZXhwcmVzc2lvbkVsLmNyZWF0ZVNwYW4oe1xyXG5cdC8vIFx0XHRcdHRleHQ6IGBcIiR7ZXhwcmVzc2lvbi50ZXh0fVwiYCxcclxuXHQvLyBcdFx0XHRjbHM6IFwicXVpY2stY2FwdHVyZS1leHByZXNzaW9uLXRleHRcIixcclxuXHQvLyBcdFx0fSk7XHJcblxyXG5cdC8vIFx0XHRjb25zdCBhcnJvd0VsID0gZXhwcmVzc2lvbkVsLmNyZWF0ZVNwYW4oe1xyXG5cdC8vIFx0XHRcdHRleHQ6IFwiIOKGkiBcIixcclxuXHQvLyBcdFx0XHRjbHM6IFwicXVpY2stY2FwdHVyZS1leHByZXNzaW9uLWFycm93XCIsXHJcblx0Ly8gXHRcdH0pO1xyXG5cclxuXHQvLyBcdFx0Y29uc3QgZGF0ZUVsID0gZXhwcmVzc2lvbkVsLmNyZWF0ZVNwYW4oe1xyXG5cdC8vIFx0XHRcdHRleHQ6IHRoaXMuZm9ybWF0RGF0ZShleHByZXNzaW9uLmRhdGUpLFxyXG5cdC8vIFx0XHRcdGNsczogXCJxdWljay1jYXB0dXJlLWV4cHJlc3Npb24tZGF0ZVwiLFxyXG5cdC8vIFx0XHR9KTtcclxuXHJcblx0Ly8gXHRcdGNvbnN0IHR5cGVFbCA9IGV4cHJlc3Npb25FbC5jcmVhdGVTcGFuKHtcclxuXHQvLyBcdFx0XHR0ZXh0OiBgICgke2V4cHJlc3Npb24udHlwZX0pYCxcclxuXHQvLyBcdFx0XHRjbHM6IGBxdWljay1jYXB0dXJlLWV4cHJlc3Npb24tdHlwZSBxdWljay1jYXB0dXJlLXR5cGUtJHtleHByZXNzaW9uLnR5cGV9YCxcclxuXHQvLyBcdFx0fSk7XHJcblx0Ly8gXHR9KTtcclxuXHQvLyB9XHJcblxyXG5cdG9uQ2xvc2UoKSB7XHJcblx0XHRjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcclxuXHJcblx0XHQvLyBDbGVhbiB1cCB1bml2ZXJzYWwgc3VnZ2VzdFxyXG5cdFx0aWYgKHRoaXMudW5pdmVyc2FsU3VnZ2VzdCkge1xyXG5cdFx0XHR0aGlzLnVuaXZlcnNhbFN1Z2dlc3QuZGlzYWJsZSgpO1xyXG5cdFx0XHR0aGlzLnVuaXZlcnNhbFN1Z2dlc3QgPSBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFN0b3AgbWFuYWdpbmcgc3VnZ2VzdHMgYW5kIHJlc3RvcmUgb3JpZ2luYWwgb3JkZXJcclxuXHRcdHRoaXMuc3VnZ2VzdE1hbmFnZXIuc3RvcE1hbmFnaW5nKCk7XHJcblxyXG5cdFx0Ly8gQ2xlYXIgZGVib3VuY2UgdGltZXJcclxuXHRcdGlmICh0aGlzLnBhcnNlRGVib3VuY2VUaW1lcikge1xyXG5cdFx0XHRjbGVhclRpbWVvdXQodGhpcy5wYXJzZURlYm91bmNlVGltZXIpO1xyXG5cdFx0XHR0aGlzLnBhcnNlRGVib3VuY2VUaW1lciA9IHVuZGVmaW5lZDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDbGVhbiB1cCB0aGUgbWFya2Rvd24gZWRpdG9yXHJcblx0XHRpZiAodGhpcy5tYXJrZG93bkVkaXRvcikge1xyXG5cdFx0XHR0aGlzLm1hcmtkb3duRWRpdG9yLmRlc3Ryb3koKTtcclxuXHRcdFx0dGhpcy5tYXJrZG93bkVkaXRvciA9IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2xlYXIgdGhlIGNvbnRlbnRcclxuXHRcdGNvbnRlbnRFbC5lbXB0eSgpO1xyXG5cclxuXHRcdGlmICh0aGlzLm1hcmtkb3duUmVuZGVyZXIpIHtcclxuXHRcdFx0dGhpcy5tYXJrZG93blJlbmRlcmVyLnVubG9hZCgpO1xyXG5cdFx0XHR0aGlzLm1hcmtkb3duUmVuZGVyZXIgPSBudWxsO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIFRpbWVQYXJzaW5nU2VydmljZSBjb25maWd1cmF0aW9uIHdoZW4gc2V0dGluZ3MgY2hhbmdlXHJcblx0ICovXHJcblx0dXBkYXRlVGltZVBhcnNpbmdTZXR0aW5ncyh0aW1lUGFyc2luZ0NvbmZpZzogYW55KTogdm9pZCB7XHJcblx0XHRpZiAodGhpcy50aW1lUGFyc2luZ1NlcnZpY2UpIHtcclxuXHRcdFx0dGhpcy50aW1lUGFyc2luZ1NlcnZpY2UudXBkYXRlQ29uZmlnKHRpbWVQYXJzaW5nQ29uZmlnKTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuIl19