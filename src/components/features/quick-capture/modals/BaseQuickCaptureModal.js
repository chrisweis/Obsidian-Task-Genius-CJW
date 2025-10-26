import { __awaiter } from "tslib";
import { Modal, TFile, Notice, moment, ButtonComponent, setIcon, } from "obsidian";
import { saveCapture, processDateTemplates, } from "@/utils/file/file-operations";
import { t } from "@/translations/helper";
import { SuggestManager } from "@/components/ui/suggest";
/**
 * Base class for all Quick Capture modals
 * Provides shared functionality and state management
 */
const LAST_USED_MODE_KEY = "task-genius.lastUsedQuickCaptureMode";
export class BaseQuickCaptureModal extends Modal {
    constructor(app, plugin, initialMode = "checkbox", metadata) {
        var _a, _b, _c, _d, _e;
        super(app);
        this.markdownEditor = null;
        this.capturedContent = "";
        this.taskMetadata = {};
        this.inlineModeAvailable = true;
        this.fileModeAvailable = false;
        // UI Elements
        this.headerContainer = null;
        this.contentContainer = null;
        this.footerContainer = null;
        // Settings
        this.tempTargetFilePath = "";
        this.preferMetadataFormat = "tasks";
        this.keepOpenAfterCapture = false;
        this.plugin = plugin;
        this.currentMode = initialMode;
        const scopeControls = (_a = this.plugin.settings.fileFilter) === null || _a === void 0 ? void 0 : _a.scopeControls;
        this.inlineModeAvailable =
            (scopeControls === null || scopeControls === void 0 ? void 0 : scopeControls.inlineTasksEnabled) !== false;
        this.fileModeAvailable =
            ((_c = (_b = this.plugin.settings.fileSource) === null || _b === void 0 ? void 0 : _b.enabled) !== null && _c !== void 0 ? _c : false) &&
                (scopeControls === null || scopeControls === void 0 ? void 0 : scopeControls.fileTasksEnabled) !== false;
        if (!scopeControls) {
            this.inlineModeAvailable = true;
            this.fileModeAvailable =
                (_e = (_d = this.plugin.settings.fileSource) === null || _d === void 0 ? void 0 : _d.enabled) !== null && _e !== void 0 ? _e : false;
        }
        if (!this.inlineModeAvailable && !this.fileModeAvailable) {
            this.inlineModeAvailable = true;
        }
        // Initialize suggest manager
        this.suggestManager = new SuggestManager(app, plugin);
        // Initialize metadata
        if (metadata) {
            this.taskMetadata = metadata;
            // Auto-switch to file mode if location is file
            if (metadata.location === "file") {
                this.currentMode = "file";
            }
        }
        // If FileSource is disabled, force mode to checkbox
        if (this.currentMode === "file" && !this.fileModeAvailable) {
            this.currentMode = "checkbox";
        }
        else if (this.currentMode === "checkbox" &&
            !this.inlineModeAvailable &&
            this.fileModeAvailable) {
            this.currentMode = "file";
        }
        // Initialize settings
        this.preferMetadataFormat = this.plugin.settings.preferMetadataFormat;
        this.keepOpenAfterCapture =
            this.plugin.settings.quickCapture.keepOpenAfterCapture || false;
        // Initialize target file path
        this.initializeTargetFile();
    }
    /**
     * Initialize target file based on settings
     */
    initializeTargetFile() {
        const settings = this.plugin.settings.quickCapture;
        if (this.taskMetadata.location === "file" &&
            this.taskMetadata.customFileName) {
            this.tempTargetFilePath = this.taskMetadata.customFileName;
        }
        else if (settings.targetType === "daily-note") {
            const dateStr = moment().format(settings.dailyNoteSettings.format);
            const pathWithDate = settings.dailyNoteSettings.folder
                ? `${settings.dailyNoteSettings.folder}/${dateStr}.md`
                : `${dateStr}.md`;
            this.tempTargetFilePath = this.sanitizeFilePath(pathWithDate);
        }
        else {
            this.tempTargetFilePath = settings.targetFile;
        }
    }
    /**
     * Called when the modal is opened
     */
    onOpen() {
        const { contentEl } = this;
        this.modalEl.toggleClass("quick-capture-modal", true);
        this.modalEl.toggleClass(`quick-capture-${this.currentMode}`, true);
        // Start managing suggests
        this.suggestManager.startManaging();
        // Create base UI structure
        this.createBaseUI(contentEl);
        // Let subclasses create their UI (should create editor container)
        this.createUI();
        // Initialize editor and other components after UI is created
        this.initializeComponents();
    }
    /**
     * Create base UI structure
     */
    createBaseUI(contentEl) {
        // Create header container
        this.titleEl.toggleClass("quick-capture-header", true);
        this.headerContainer = this.titleEl;
        this.createHeader();
        // Create content container
        this.contentContainer = contentEl.createDiv({
            cls: "quick-capture-content",
        });
        // Create footer container
        this.footerContainer = contentEl.createDiv({
            cls: "quick-capture-footer",
        });
        this.createFooter();
    }
    /**
     * Create header with save strategy switcher and clear button
     */
    createHeader() {
        if (!this.headerContainer)
            return;
        // Left side: Save strategy tabs with ARIA attributes
        const tabContainer = this.headerContainer.createDiv({
            cls: "quick-capture-tabs",
            attr: {
                role: "tablist",
                "aria-label": t("Save mode selection"),
            },
        });
        // Checkbox mode button (save as checkbox task)
        if (this.inlineModeAvailable) {
            const checkboxButton = new ButtonComponent(tabContainer)
                .setClass("quick-capture-tab")
                .onClick(() => this.switchMode("checkbox"));
            checkboxButton.buttonEl.toggleClass("clickable-icon", true);
            const checkboxButtonEl = checkboxButton.buttonEl;
            checkboxButtonEl.setAttribute("role", "tab");
            checkboxButtonEl.setAttribute("aria-selected", String(this.currentMode === "checkbox"));
            checkboxButtonEl.setAttribute("aria-controls", "quick-capture-content");
            checkboxButtonEl.setAttribute("data-mode", "checkbox");
            if (this.currentMode === "checkbox") {
                checkboxButton.setClass("active");
            }
            // Manually create spans for icon and text
            checkboxButtonEl.empty();
            const checkboxIconSpan = checkboxButtonEl.createSpan({
                cls: "quick-capture-tab-icon",
            });
            setIcon(checkboxIconSpan, "check-square");
            checkboxButtonEl.createSpan({
                text: t("Checkbox"),
                cls: "quick-capture-tab-text",
            });
        }
        // File mode button (save as file) - only when FileSource is enabled
        if (this.fileModeAvailable) {
            const fileButton = new ButtonComponent(tabContainer)
                .setClass("quick-capture-tab")
                .onClick(() => this.switchMode("file"));
            fileButton.buttonEl.toggleClass("clickable-icon", true);
            const fileButtonEl = fileButton.buttonEl;
            fileButtonEl.setAttribute("role", "tab");
            fileButtonEl.setAttribute("aria-selected", String(this.currentMode === "file"));
            fileButtonEl.setAttribute("aria-controls", "quick-capture-content");
            fileButtonEl.setAttribute("data-mode", "file");
            if (this.currentMode === "file") {
                fileButton.setClass("active");
            }
            fileButtonEl.empty();
            const fileIconSpan = fileButtonEl.createSpan({
                cls: "quick-capture-tab-icon",
            });
            setIcon(fileIconSpan, "file-plus");
            fileButtonEl.createSpan({
                text: t("File"),
                cls: "quick-capture-tab-text",
            });
        }
        if (!(this.fileModeAvailable && this.inlineModeAvailable)) {
            tabContainer.classList.add("is-hidden");
            tabContainer.setAttribute("aria-hidden", "true");
        }
        // Right side: Clear button with improved styling
        if (this.fileModeAvailable && this.inlineModeAvailable) {
            const clearButton = this.headerContainer.createEl("button", {
                text: t("Clear"),
                cls: ["quick-capture-clear", "clickable-icon"],
                attr: {
                    "aria-label": t("Clear all content"),
                    type: "button",
                },
            });
            clearButton.addEventListener("click", () => this.handleClear());
        }
    }
    /**
     * Create footer with continue and action buttons
     */
    createFooter() {
        if (!this.footerContainer)
            return;
        // Left side: Continue creating button
        const leftContainer = this.footerContainer.createDiv({
            cls: "quick-capture-footer-left",
        });
        const continueButton = leftContainer.createEl("button", {
            text: t("Continue & New"),
            cls: "quick-capture-continue",
        });
        continueButton.addEventListener("click", () => this.handleContinueCreate());
        // Right side: Main action buttons
        const rightContainer = this.footerContainer.createDiv({
            cls: "quick-capture-footer-right",
        });
        // Save/Create button
        const submitButton = rightContainer.createEl("button", {
            text: this.currentMode === "file" ? t("Save as File") : t("Add Task"),
            cls: "mod-cta",
        });
        submitButton.addEventListener("click", () => this.handleSubmit());
        // Cancel button
        const cancelButton = rightContainer.createEl("button", {
            text: t("Cancel"),
        });
        cancelButton.addEventListener("click", () => this.close());
    }
    /**
     * Switch to a different mode
     */
    switchMode(mode) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            if (mode === this.currentMode)
                return;
            // Prevent switching to unsupported modes
            if (mode === "file" && !this.fileModeAvailable) {
                new Notice(t("File Task is disabled. Enable FileSource in Settings to use File mode."));
                return;
            }
            if (mode === "checkbox" && !this.inlineModeAvailable) {
                return;
            }
            // Save current state
            const savedContent = this.capturedContent;
            const savedMetadata = Object.assign({}, this.taskMetadata);
            // Update mode
            this.currentMode = mode;
            // Persist last used mode to local storage
            try {
                this.app.saveLocalStorage(LAST_USED_MODE_KEY, mode);
            }
            catch (_c) {
            }
            // Update modal classes
            this.modalEl.removeClass("quick-capture-checkbox", "quick-capture-file");
            this.modalEl.addClass(`quick-capture-${mode}`);
            // Update tab active states
            const tabs = (_a = this.headerContainer) === null || _a === void 0 ? void 0 : _a.querySelectorAll(".quick-capture-tab");
            tabs === null || tabs === void 0 ? void 0 : tabs.forEach((tab) => {
                tab.removeClass("active");
                const tabMode = tab.getAttribute("data-mode");
                if (tabMode === mode) {
                    tab.addClass("active");
                }
                tab.setAttribute("aria-selected", String(tabMode === mode));
            });
            // Update only the target display instead of recreating everything
            this.updateTargetDisplay();
            // Restore metadata
            this.taskMetadata = savedMetadata;
            // Update button text
            const submitButton = (_b = this.footerContainer) === null || _b === void 0 ? void 0 : _b.querySelector(".mod-cta");
            if (submitButton) {
                submitButton.setText(mode === "file" ? t("Save as File") : t("Add Task"));
            }
        });
    }
    /**
     * Handle clear action
     */
    handleClear() {
        var _a, _b;
        // Clear content
        this.capturedContent = "";
        if (this.markdownEditor) {
            this.markdownEditor.set("", false);
        }
        // Clear metadata but keep location settings
        const location = this.taskMetadata.location;
        const targetFile = this.taskMetadata.targetFile;
        this.taskMetadata = {
            location,
            targetFile,
        };
        // Reset any UI elements
        this.resetUIElements();
        // Focus editor
        (_b = (_a = this.markdownEditor) === null || _a === void 0 ? void 0 : _a.editor) === null || _b === void 0 ? void 0 : _b.focus();
    }
    /**
     * Handle continue & create new
     */
    handleContinueCreate() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // First, save the current task
            const content = this.capturedContent.trim() ||
                ((_a = this.markdownEditor) === null || _a === void 0 ? void 0 : _a.value.trim()) ||
                "";
            if (!content) {
                new Notice(t("Nothing to capture"));
                return;
            }
            try {
                yield this.saveContent(content);
                new Notice(t("Captured successfully"));
                // Clear for next task but keep settings
                this.handleClear();
            }
            catch (error) {
                new Notice(`${t("Failed to save:")} ${error}`);
            }
        });
    }
    /**
     * Handle submit action
     */
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
                yield this.saveContent(content);
                new Notice(this.currentMode === "file"
                    ? t("File saved successfully")
                    : t("Task added successfully"));
                if (!this.keepOpenAfterCapture) {
                    this.close();
                }
                else {
                    this.handleClear();
                }
            }
            catch (error) {
                new Notice(`${t("Failed to save:")} ${error}`);
            }
        });
    }
    /**
     * Save content based on current mode and settings
     */
    saveContent(content) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            let processedContent = this.processContentWithMetadata(content);
            let targetFile = this.tempTargetFilePath;
            // Handle file mode
            if (this.currentMode === "file" && this.taskMetadata.customFileName) {
                targetFile = processDateTemplates(this.taskMetadata.customFileName);
                if (!targetFile.endsWith(".md")) {
                    targetFile += ".md";
                }
                // Prefix default folder when configured and FileSource is enabled
                const defaultFolder = (_b = (_a = this.plugin.settings.quickCapture.createFileMode) === null || _a === void 0 ? void 0 : _a.defaultFolder) === null || _b === void 0 ? void 0 : _b.trim();
                if (((_d = (_c = this.plugin.settings) === null || _c === void 0 ? void 0 : _c.fileSource) === null || _d === void 0 ? void 0 : _d.enabled) &&
                    defaultFolder &&
                    !targetFile.includes("/")) {
                    targetFile = this.sanitizeFilePath(`${defaultFolder}/${targetFile}`);
                }
                processedContent = yield this.buildFileModeContent(content, processedContent);
            }
            // Convert location/targetType to valid QuickCaptureOptions type
            let targetType = "fixed";
            if (this.taskMetadata.location === "daily-note") {
                targetType = "daily-note";
            }
            else if (this.taskMetadata.location === "file" ||
                this.taskMetadata.location === "fixed") {
                targetType = "fixed";
            }
            else if (this.plugin.settings.quickCapture.targetType === "daily-note") {
                targetType = "daily-note";
            }
            else {
                targetType = "fixed"; // Default to fixed for custom-file or any other type
            }
            const captureOptions = Object.assign(Object.assign({}, this.plugin.settings.quickCapture), { targetFile,
                targetType, 
                // For file mode, always replace
                appendToFile: this.currentMode === "file"
                    ? "replace"
                    : this.plugin.settings.quickCapture.appendToFile });
            yield saveCapture(this.app, processedContent, captureOptions);
        });
    }
    /**
     * Sanitize file path
     */
    sanitizeFilePath(filePath) {
        const pathParts = filePath.split("/");
        const sanitizedParts = pathParts.map((part, index) => {
            if (index === pathParts.length - 1) {
                return this.sanitizeFilename(part);
            }
            return part
                .replace(/[<>:"|*?\\]/g, "-")
                .replace(/\s+/g, " ")
                .trim();
        });
        return sanitizedParts.join("/");
    }
    /**
     * Sanitize filename
     */
    /**
     * Map UI status (symbol or text) to textual metadata
     */
    mapStatusToText(status) {
        if (!status)
            return "not-started";
        if (status.length > 1)
            return status; // already textual
        switch (status) {
            case "x":
            case "X":
                return "completed";
            case "/":
            case ">":
                return "in-progress";
            case "?":
                return "planned";
            case "-":
                return "cancelled";
            case " ":
            default:
                return "not-started";
        }
    }
    buildFileModeContent(rawContent, processedContent, options = {}) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const createFileMode = this.plugin.settings.quickCapture.createFileMode;
            const useTemplate = !!(createFileMode === null || createFileMode === void 0 ? void 0 : createFileMode.useTemplate);
            if (useTemplate) {
                const templatePath = (_a = createFileMode === null || createFileMode === void 0 ? void 0 : createFileMode.templateFile) === null || _a === void 0 ? void 0 : _a.trim();
                if (templatePath) {
                    const templateFile = this.app.vault.getAbstractFileByPath(templatePath);
                    if (templateFile instanceof TFile) {
                        try {
                            const templateContent = yield this.app.vault.read(templateFile);
                            const merged = this.mergeContentIntoTemplate(templateContent, processedContent);
                            return this.ensureMinimalFrontmatter(merged);
                        }
                        catch (error) {
                            console.error("Failed to read quick capture template:", error);
                            if (!options.preview) {
                                new Notice(`${t("Failed to read template file:")} ${templatePath}`);
                            }
                        }
                    }
                    else if (!options.preview) {
                        new Notice(`${t("Template file not found:")} ${templatePath}`);
                    }
                }
                else if (!options.preview) {
                    new Notice(t("Template file is not configured for Quick Capture file mode."));
                }
            }
            const hasFrontmatter = processedContent
                .trimStart()
                .startsWith("---");
            if (useTemplate && hasFrontmatter) {
                return processedContent;
            }
            if (useTemplate) {
                return this.ensureMinimalFrontmatter(processedContent);
            }
            return this.buildFullFrontmatter(processedContent, rawContent);
        });
    }
    mergeContentIntoTemplate(templateContent, captureContent) {
        if (!templateContent) {
            return captureContent;
        }
        const placeholderRegex = /\{\{\s*CONTENT\s*\}\}/gi;
        if (placeholderRegex.test(templateContent)) {
            return templateContent.replace(placeholderRegex, captureContent);
        }
        const trimmedTemplate = templateContent.trimEnd();
        const separator = trimmedTemplate ? "\n\n" : "";
        return `${trimmedTemplate}${separator}${captureContent}`;
    }
    ensureMinimalFrontmatter(content) {
        const trimmed = content.trimStart();
        if (trimmed.startsWith("---")) {
            return content;
        }
        const statusText = this.mapStatusToText(this.taskMetadata.status);
        return `---\nstatus: ${JSON.stringify(statusText)}\n---\n\n${content}`;
    }
    buildFullFrontmatter(processedContent, rawContent) {
        var _a;
        const trimmed = processedContent.trimStart();
        if (trimmed.startsWith("---")) {
            return processedContent;
        }
        const statusText = this.mapStatusToText(this.taskMetadata.status);
        const startDate = this.taskMetadata.startDate
            ? this.formatDate(this.taskMetadata.startDate)
            : undefined;
        const dueDate = this.taskMetadata.dueDate
            ? this.formatDate(this.taskMetadata.dueDate)
            : undefined;
        const scheduledDate = this.taskMetadata.scheduledDate
            ? this.formatDate(this.taskMetadata.scheduledDate)
            : undefined;
        const priorityVal = this.taskMetadata.priority !== undefined &&
            this.taskMetadata.priority !== null
            ? String(this.taskMetadata.priority)
            : undefined;
        const projectVal = this.taskMetadata.project || undefined;
        const contextVal = this.taskMetadata.context || undefined;
        const repeatVal = this.taskMetadata.recurrence || undefined;
        const writeContentTags = !!((_a = this.plugin.settings.quickCapture.createFileMode) === null || _a === void 0 ? void 0 : _a.writeContentTagsToFrontmatter);
        const mergedTags = writeContentTags
            ? this.extractTagsFromContentForFrontmatter(rawContent)
            : [];
        const yamlLines = [];
        yamlLines.push(`status: ${JSON.stringify(statusText)}`);
        if (dueDate)
            yamlLines.push(`dueDate: ${JSON.stringify(dueDate)}`);
        if (startDate)
            yamlLines.push(`startDate: ${JSON.stringify(startDate)}`);
        if (scheduledDate)
            yamlLines.push(`scheduledDate: ${JSON.stringify(scheduledDate)}`);
        if (priorityVal)
            yamlLines.push(`priority: ${JSON.stringify(priorityVal)}`);
        if (projectVal)
            yamlLines.push(`project: ${JSON.stringify(projectVal)}`);
        if (contextVal)
            yamlLines.push(`context: ${JSON.stringify(contextVal)}`);
        if (repeatVal)
            yamlLines.push(`repeat: ${JSON.stringify(repeatVal)}`);
        if (mergedTags.length > 0) {
            yamlLines.push(`tags: [${mergedTags
                .map((t) => JSON.stringify(t))
                .join(", ")}]`);
        }
        return `---\n${yamlLines.join("\n")}\n---\n\n${processedContent}`;
    }
    /**
     * Extract #tags from content for frontmatter tags array
     * Simple regex scan; remove leading '#', dedupe
     */
    extractTagsFromContentForFrontmatter(content) {
        if (!content)
            return [];
        const tagRegex = /(^|\s)#([A-Za-z0-9_\/-]+)/g;
        const results = new Set();
        let match;
        while ((match = tagRegex.exec(content)) !== null) {
            const tag = match[2];
            if (tag)
                results.add(tag);
        }
        return Array.from(results);
    }
    sanitizeFilename(filename) {
        return filename
            .replace(/[<>:"|*?\\]/g, "-")
            .replace(/\s+/g, " ")
            .trim();
    }
    /**
     * Format date
     */
    formatDate(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }
    /**
     * Parse date
     */
    parseDate(dateString) {
        const [year, month, day] = dateString.split("-").map(Number);
        return new Date(year, month - 1, day);
    }
    /**
     * Called when the modal is closed
     */
    onClose() {
        // Stop managing suggests
        this.suggestManager.stopManaging();
        // Clean up editor
        if (this.markdownEditor) {
            this.markdownEditor.destroy();
            this.markdownEditor = null;
        }
        // Clear content
        this.contentEl.empty();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQmFzZVF1aWNrQ2FwdHVyZU1vZGFsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQmFzZVF1aWNrQ2FwdHVyZU1vZGFsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBRU4sS0FBSyxFQUNMLEtBQUssRUFDTCxNQUFNLEVBQ04sTUFBTSxFQUNOLGVBQWUsRUFDZixPQUFPLEdBQ1AsTUFBTSxVQUFVLENBQUM7QUFFbEIsT0FBTyxFQUNOLFdBQVcsRUFDWCxvQkFBb0IsR0FDcEIsTUFBTSw4QkFBOEIsQ0FBQztBQUN0QyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDMUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBZ0N6RDs7O0dBR0c7QUFDSCxNQUFNLGtCQUFrQixHQUFHLHNDQUFzQyxDQUFDO0FBRWxFLE1BQU0sT0FBZ0IscUJBQXNCLFNBQVEsS0FBSztJQW9CeEQsWUFDQyxHQUFRLEVBQ1IsTUFBNkIsRUFDN0IsY0FBZ0MsVUFBVSxFQUMxQyxRQUF1Qjs7UUFFdkIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBeEJGLG1CQUFjLEdBQW9DLElBQUksQ0FBQztRQUN2RCxvQkFBZSxHQUFXLEVBQUUsQ0FBQztRQUM3QixpQkFBWSxHQUFpQixFQUFFLENBQUM7UUFHaEMsd0JBQW1CLEdBQVksSUFBSSxDQUFDO1FBQ3BDLHNCQUFpQixHQUFZLEtBQUssQ0FBQztRQUU3QyxjQUFjO1FBQ0osb0JBQWUsR0FBdUIsSUFBSSxDQUFDO1FBQzNDLHFCQUFnQixHQUF1QixJQUFJLENBQUM7UUFDNUMsb0JBQWUsR0FBdUIsSUFBSSxDQUFDO1FBRXJELFdBQVc7UUFDRCx1QkFBa0IsR0FBVyxFQUFFLENBQUM7UUFDaEMseUJBQW9CLEdBQXlCLE9BQU8sQ0FBQztRQUNyRCx5QkFBb0IsR0FBWSxLQUFLLENBQUM7UUFTL0MsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIs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QUNoRCxDQUFDO0lBRUQ7O09BRUc7SUFDTyxTQUFTLENBQUMsVUFBa0I7UUFDckMsTUFBTSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDN0QsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxPQUFPO1FBQ04seUJBQXlCO1FBQ3pCLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLENBQUM7UUFFbkMsa0JBQWtCO1FBQ2xCLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRTtZQUN4QixJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzlCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO1NBQzNCO1FBRUQsZ0JBQWdCO1FBQ2hCLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDeEIsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcclxuXHRBcHAsXHJcblx0TW9kYWwsXHJcblx0VEZpbGUsXHJcblx0Tm90aWNlLFxyXG5cdG1vbWVudCxcclxuXHRCdXR0b25Db21wb25lbnQsXHJcblx0c2V0SWNvbixcclxufSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5pbXBvcnQge1xyXG5cdHNhdmVDYXB0dXJlLFxyXG5cdHByb2Nlc3NEYXRlVGVtcGxhdGVzLFxyXG59IGZyb20gXCJAL3V0aWxzL2ZpbGUvZmlsZS1vcGVyYXRpb25zXCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCB7IFN1Z2dlc3RNYW5hZ2VyIH0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9zdWdnZXN0XCI7XHJcbmltcG9ydCB7IEVtYmVkZGFibGVNYXJrZG93bkVkaXRvciB9IGZyb20gXCJAL2VkaXRvci1leHRlbnNpb25zL2NvcmUvbWFya2Rvd24tZWRpdG9yXCI7XHJcblxyXG4vKipcclxuICogUXVpY2sgY2FwdHVyZSBzYXZlIHN0cmF0ZWd5IHR5cGVzXHJcbiAqL1xyXG5leHBvcnQgdHlwZSBRdWlja0NhcHR1cmVNb2RlID0gXCJjaGVja2JveFwiIHwgXCJmaWxlXCI7XHJcblxyXG4vKipcclxuICogVGFzayBtZXRhZGF0YSBpbnRlcmZhY2VcclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgVGFza01ldGFkYXRhIHtcclxuXHRzdGFydERhdGU/OiBEYXRlO1xyXG5cdGR1ZURhdGU/OiBEYXRlO1xyXG5cdHNjaGVkdWxlZERhdGU/OiBEYXRlO1xyXG5cdHByaW9yaXR5PzogbnVtYmVyO1xyXG5cdHByb2plY3Q/OiBzdHJpbmc7XHJcblx0Y29udGV4dD86IHN0cmluZztcclxuXHRyZWN1cnJlbmNlPzogc3RyaW5nO1xyXG5cdHN0YXR1cz86IHN0cmluZztcclxuXHR0YWdzPzogc3RyaW5nW107XHJcblx0bG9jYXRpb24/OiBcImZpeGVkXCIgfCBcImRhaWx5LW5vdGVcIiB8IFwiZmlsZVwiO1xyXG5cdHRhcmdldEZpbGU/OiBzdHJpbmc7XHJcblx0Y3VzdG9tRmlsZU5hbWU/OiBzdHJpbmc7XHJcblx0Ly8gVHJhY2sgd2hpY2ggZmllbGRzIHdlcmUgbWFudWFsbHkgc2V0IGJ5IHVzZXJcclxuXHRtYW51YWxseVNldD86IHtcclxuXHRcdHN0YXJ0RGF0ZT86IGJvb2xlYW47XHJcblx0XHRkdWVEYXRlPzogYm9vbGVhbjtcclxuXHRcdHNjaGVkdWxlZERhdGU/OiBib29sZWFuO1xyXG5cdH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBCYXNlIGNsYXNzIGZvciBhbGwgUXVpY2sgQ2FwdHVyZSBtb2RhbHNcclxuICogUHJvdmlkZXMgc2hhcmVkIGZ1bmN0aW9uYWxpdHkgYW5kIHN0YXRlIG1hbmFnZW1lbnRcclxuICovXHJcbmNvbnN0IExBU1RfVVNFRF9NT0RFX0tFWSA9IFwidGFzay1nZW5pdXMubGFzdFVzZWRRdWlja0NhcHR1cmVNb2RlXCI7XHJcblxyXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQmFzZVF1aWNrQ2FwdHVyZU1vZGFsIGV4dGVuZHMgTW9kYWwge1xyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luO1xyXG5cdHByb3RlY3RlZCBtYXJrZG93bkVkaXRvcjogRW1iZWRkYWJsZU1hcmtkb3duRWRpdG9yIHwgbnVsbCA9IG51bGw7XHJcblx0cHJvdGVjdGVkIGNhcHR1cmVkQ29udGVudDogc3RyaW5nID0gXCJcIjtcclxuXHRwcm90ZWN0ZWQgdGFza01ldGFkYXRhOiBUYXNrTWV0YWRhdGEgPSB7fTtcclxuXHRwcm90ZWN0ZWQgY3VycmVudE1vZGU6IFF1aWNrQ2FwdHVyZU1vZGU7XHJcblx0cHJvdGVjdGVkIHN1Z2dlc3RNYW5hZ2VyOiBTdWdnZXN0TWFuYWdlcjtcclxuXHRwcm90ZWN0ZWQgaW5saW5lTW9kZUF2YWlsYWJsZTogYm9vbGVhbiA9IHRydWU7XHJcblx0cHJvdGVjdGVkIGZpbGVNb2RlQXZhaWxhYmxlOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG5cdC8vIFVJIEVsZW1lbnRzXHJcblx0cHJvdGVjdGVkIGhlYWRlckNvbnRhaW5lcjogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHRwcm90ZWN0ZWQgY29udGVudENvbnRhaW5lcjogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHRwcm90ZWN0ZWQgZm9vdGVyQ29udGFpbmVyOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xyXG5cclxuXHQvLyBTZXR0aW5nc1xyXG5cdHByb3RlY3RlZCB0ZW1wVGFyZ2V0RmlsZVBhdGg6IHN0cmluZyA9IFwiXCI7XHJcblx0cHJvdGVjdGVkIHByZWZlck1ldGFkYXRhRm9ybWF0OiBcImRhdGF2aWV3XCIgfCBcInRhc2tzXCIgPSBcInRhc2tzXCI7XHJcblx0cHJvdGVjdGVkIGtlZXBPcGVuQWZ0ZXJDYXB0dXJlOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0YXBwOiBBcHAsXHJcblx0XHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdGluaXRpYWxNb2RlOiBRdWlja0NhcHR1cmVNb2RlID0gXCJjaGVja2JveFwiLFxyXG5cdFx0bWV0YWRhdGE/OiBUYXNrTWV0YWRhdGFcclxuXHQpIHtcclxuXHRcdHN1cGVyKGFwcCk7XHJcblx0XHR0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuXHRcdHRoaXMuY3VycmVudE1vZGUgPSBpbml0aWFsTW9kZTtcclxuXHJcblx0XHRjb25zdCBzY29wZUNvbnRyb2xzID1cclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuZmlsZUZpbHRlcj8uc2NvcGVDb250cm9scztcclxuXHRcdHRoaXMuaW5saW5lTW9kZUF2YWlsYWJsZSA9XHJcblx0XHRcdHNjb3BlQ29udHJvbHM/LmlubGluZVRhc2tzRW5hYmxlZCAhPT0gZmFsc2U7XHJcblx0XHR0aGlzLmZpbGVNb2RlQXZhaWxhYmxlID1cclxuXHRcdFx0KHRoaXMucGx1Z2luLnNldHRpbmdzLmZpbGVTb3VyY2U/LmVuYWJsZWQgPz8gZmFsc2UpICYmXHJcblx0XHRcdHNjb3BlQ29udHJvbHM/LmZpbGVUYXNrc0VuYWJsZWQgIT09IGZhbHNlO1xyXG5cdFx0aWYgKCFzY29wZUNvbnRyb2xzKSB7XHJcblx0XHRcdHRoaXMuaW5saW5lTW9kZUF2YWlsYWJsZSA9IHRydWU7XHJcblx0XHRcdHRoaXMuZmlsZU1vZGVBdmFpbGFibGUgPVxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLmZpbGVTb3VyY2U/LmVuYWJsZWQgPz8gZmFsc2U7XHJcblx0XHR9XHJcblx0XHRpZiAoIXRoaXMuaW5saW5lTW9kZUF2YWlsYWJsZSAmJiAhdGhpcy5maWxlTW9kZUF2YWlsYWJsZSkge1xyXG5cdFx0XHR0aGlzLmlubGluZU1vZGVBdmFpbGFibGUgPSB0cnVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgc3VnZ2VzdCBtYW5hZ2VyXHJcblx0XHR0aGlzLnN1Z2dlc3RNYW5hZ2VyID0gbmV3IFN1Z2dlc3RNYW5hZ2VyKGFwcCwgcGx1Z2luKTtcclxuXHJcblx0XHQvLyBJbml0aWFsaXplIG1ldGFkYXRhXHJcblx0XHRpZiAobWV0YWRhdGEpIHtcclxuXHRcdFx0dGhpcy50YXNrTWV0YWRhdGEgPSBtZXRhZGF0YTtcclxuXHRcdFx0Ly8gQXV0by1zd2l0Y2ggdG8gZmlsZSBtb2RlIGlmIGxvY2F0aW9uIGlzIGZpbGVcclxuXHRcdFx0aWYgKG1ldGFkYXRhLmxvY2F0aW9uID09PSBcImZpbGVcIikge1xyXG5cdFx0XHRcdHRoaXMuY3VycmVudE1vZGUgPSBcImZpbGVcIjtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIElmIEZpbGVTb3VyY2UgaXMgZGlzYWJsZWQsIGZvcmNlIG1vZGUgdG8gY2hlY2tib3hcclxuXHRcdGlmICh0aGlzLmN1cnJlbnRNb2RlID09PSBcImZpbGVcIiAmJiAhdGhpcy5maWxlTW9kZUF2YWlsYWJsZSkge1xyXG5cdFx0XHR0aGlzLmN1cnJlbnRNb2RlID0gXCJjaGVja2JveFwiO1xyXG5cdFx0fSBlbHNlIGlmIChcclxuXHRcdFx0dGhpcy5jdXJyZW50TW9kZSA9PT0gXCJjaGVja2JveFwiICYmXHJcblx0XHRcdCF0aGlzLmlubGluZU1vZGVBdmFpbGFibGUgJiZcclxuXHRcdFx0dGhpcy5maWxlTW9kZUF2YWlsYWJsZVxyXG5cdFx0KSB7XHJcblx0XHRcdHRoaXMuY3VycmVudE1vZGUgPSBcImZpbGVcIjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBJbml0aWFsaXplIHNldHRpbmdzXHJcblx0XHR0aGlzLnByZWZlck1ldGFkYXRhRm9ybWF0ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucHJlZmVyTWV0YWRhdGFGb3JtYXQ7XHJcblx0XHR0aGlzLmtlZXBPcGVuQWZ0ZXJDYXB0dXJlID1cclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLmtlZXBPcGVuQWZ0ZXJDYXB0dXJlIHx8IGZhbHNlO1xyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgdGFyZ2V0IGZpbGUgcGF0aFxyXG5cdFx0dGhpcy5pbml0aWFsaXplVGFyZ2V0RmlsZSgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSW5pdGlhbGl6ZSB0YXJnZXQgZmlsZSBiYXNlZCBvbiBzZXR0aW5nc1xyXG5cdCAqL1xyXG5cdHByb3RlY3RlZCBpbml0aWFsaXplVGFyZ2V0RmlsZSgpOiB2b2lkIHtcclxuXHRcdGNvbnN0IHNldHRpbmdzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlO1xyXG5cclxuXHRcdGlmIChcclxuXHRcdFx0dGhpcy50YXNrTWV0YWRhdGEubG9jYXRpb24gPT09IFwiZmlsZVwiICYmXHJcblx0XHRcdHRoaXMudGFza01ldGFkYXRhLmN1c3RvbUZpbGVOYW1lXHJcblx0XHQpIHtcclxuXHRcdFx0dGhpcy50ZW1wVGFyZ2V0RmlsZVBhdGggPSB0aGlzLnRhc2tNZXRhZGF0YS5jdXN0b21GaWxlTmFtZTtcclxuXHRcdH0gZWxzZSBpZiAoc2V0dGluZ3MudGFyZ2V0VHlwZSA9PT0gXCJkYWlseS1ub3RlXCIpIHtcclxuXHRcdFx0Y29uc3QgZGF0ZVN0ciA9IG1vbWVudCgpLmZvcm1hdChzZXR0aW5ncy5kYWlseU5vdGVTZXR0aW5ncy5mb3JtYXQpO1xyXG5cdFx0XHRjb25zdCBwYXRoV2l0aERhdGUgPSBzZXR0aW5ncy5kYWlseU5vdGVTZXR0aW5ncy5mb2xkZXJcclxuXHRcdFx0XHQ/IGAke3NldHRpbmdzLmRhaWx5Tm90ZVNldHRpbmdzLmZvbGRlcn0vJHtkYXRlU3RyfS5tZGBcclxuXHRcdFx0XHQ6IGAke2RhdGVTdHJ9Lm1kYDtcclxuXHRcdFx0dGhpcy50ZW1wVGFyZ2V0RmlsZVBhdGggPSB0aGlzLnNhbml0aXplRmlsZVBhdGgocGF0aFdpdGhEYXRlKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMudGVtcFRhcmdldEZpbGVQYXRoID0gc2V0dGluZ3MudGFyZ2V0RmlsZTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENhbGxlZCB3aGVuIHRoZSBtb2RhbCBpcyBvcGVuZWRcclxuXHQgKi9cclxuXHRvbk9wZW4oKSB7XHJcblx0XHRjb25zdCB7Y29udGVudEVsfSA9IHRoaXM7XHJcblx0XHR0aGlzLm1vZGFsRWwudG9nZ2xlQ2xhc3MoXCJxdWljay1jYXB0dXJlLW1vZGFsXCIsIHRydWUpO1xyXG5cdFx0dGhpcy5tb2RhbEVsLnRvZ2dsZUNsYXNzKGBxdWljay1jYXB0dXJlLSR7dGhpcy5jdXJyZW50TW9kZX1gLCB0cnVlKTtcclxuXHJcblx0XHQvLyBTdGFydCBtYW5hZ2luZyBzdWdnZXN0c1xyXG5cdFx0dGhpcy5zdWdnZXN0TWFuYWdlci5zdGFydE1hbmFnaW5nKCk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGJhc2UgVUkgc3RydWN0dXJlXHJcblx0XHR0aGlzLmNyZWF0ZUJhc2VVSShjb250ZW50RWwpO1xyXG5cclxuXHRcdC8vIExldCBzdWJjbGFzc2VzIGNyZWF0ZSB0aGVpciBVSSAoc2hvdWxkIGNyZWF0ZSBlZGl0b3IgY29udGFpbmVyKVxyXG5cdFx0dGhpcy5jcmVhdGVVSSgpO1xyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgZWRpdG9yIGFuZCBvdGhlciBjb21wb25lbnRzIGFmdGVyIFVJIGlzIGNyZWF0ZWRcclxuXHRcdHRoaXMuaW5pdGlhbGl6ZUNvbXBvbmVudHMoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZSBiYXNlIFVJIHN0cnVjdHVyZVxyXG5cdCAqL1xyXG5cdHByb3RlY3RlZCBjcmVhdGVCYXNlVUkoY29udGVudEVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xyXG5cdFx0Ly8gQ3JlYXRlIGhlYWRlciBjb250YWluZXJcclxuXHRcdHRoaXMudGl0bGVFbC50b2dnbGVDbGFzcyhcInF1aWNrLWNhcHR1cmUtaGVhZGVyXCIsIHRydWUpO1xyXG5cdFx0dGhpcy5oZWFkZXJDb250YWluZXIgPSB0aGlzLnRpdGxlRWw7XHJcblx0XHR0aGlzLmNyZWF0ZUhlYWRlcigpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBjb250ZW50IGNvbnRhaW5lclxyXG5cdFx0dGhpcy5jb250ZW50Q29udGFpbmVyID0gY29udGVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJxdWljay1jYXB0dXJlLWNvbnRlbnRcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBmb290ZXIgY29udGFpbmVyXHJcblx0XHR0aGlzLmZvb3RlckNvbnRhaW5lciA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwicXVpY2stY2FwdHVyZS1mb290ZXJcIixcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy5jcmVhdGVGb290ZXIoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZSBoZWFkZXIgd2l0aCBzYXZlIHN0cmF0ZWd5IHN3aXRjaGVyIGFuZCBjbGVhciBidXR0b25cclxuXHQgKi9cclxuXHRwcm90ZWN0ZWQgY3JlYXRlSGVhZGVyKCk6IHZvaWQge1xyXG5cdFx0aWYgKCF0aGlzLmhlYWRlckNvbnRhaW5lcikgcmV0dXJuO1xyXG5cclxuXHRcdC8vIExlZnQgc2lkZTogU2F2ZSBzdHJhdGVneSB0YWJzIHdpdGggQVJJQSBhdHRyaWJ1dGVzXHJcblx0XHRjb25zdCB0YWJDb250YWluZXIgPSB0aGlzLmhlYWRlckNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwicXVpY2stY2FwdHVyZS10YWJzXCIsXHJcblx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHRyb2xlOiBcInRhYmxpc3RcIixcclxuXHRcdFx0XHRcImFyaWEtbGFiZWxcIjogdChcIlNhdmUgbW9kZSBzZWxlY3Rpb25cIiksXHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDaGVja2JveCBtb2RlIGJ1dHRvbiAoc2F2ZSBhcyBjaGVja2JveCB0YXNrKVxyXG5cdFx0aWYgKHRoaXMuaW5saW5lTW9kZUF2YWlsYWJsZSkge1xyXG5cdFx0XHRjb25zdCBjaGVja2JveEJ1dHRvbiA9IG5ldyBCdXR0b25Db21wb25lbnQodGFiQ29udGFpbmVyKVxyXG5cdFx0XHRcdC5zZXRDbGFzcyhcInF1aWNrLWNhcHR1cmUtdGFiXCIpXHJcblx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4gdGhpcy5zd2l0Y2hNb2RlKFwiY2hlY2tib3hcIikpO1xyXG5cclxuXHRcdFx0Y2hlY2tib3hCdXR0b24uYnV0dG9uRWwudG9nZ2xlQ2xhc3MoXCJjbGlja2FibGUtaWNvblwiLCB0cnVlKTtcclxuXHJcblx0XHRcdGNvbnN0IGNoZWNrYm94QnV0dG9uRWwgPSBjaGVja2JveEJ1dHRvbi5idXR0b25FbDtcclxuXHRcdFx0Y2hlY2tib3hCdXR0b25FbC5zZXRBdHRyaWJ1dGUoXCJyb2xlXCIsIFwidGFiXCIpO1xyXG5cdFx0XHRjaGVja2JveEJ1dHRvbkVsLnNldEF0dHJpYnV0ZShcclxuXHRcdFx0XHRcImFyaWEtc2VsZWN0ZWRcIixcclxuXHRcdFx0XHRTdHJpbmcodGhpcy5jdXJyZW50TW9kZSA9PT0gXCJjaGVja2JveFwiKVxyXG5cdFx0XHQpO1xyXG5cdFx0XHRjaGVja2JveEJ1dHRvbkVsLnNldEF0dHJpYnV0ZShcclxuXHRcdFx0XHRcImFyaWEtY29udHJvbHNcIixcclxuXHRcdFx0XHRcInF1aWNrLWNhcHR1cmUtY29udGVudFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdGNoZWNrYm94QnV0dG9uRWwuc2V0QXR0cmlidXRlKFwiZGF0YS1tb2RlXCIsIFwiY2hlY2tib3hcIik7XHJcblxyXG5cdFx0XHRpZiAodGhpcy5jdXJyZW50TW9kZSA9PT0gXCJjaGVja2JveFwiKSB7XHJcblx0XHRcdFx0Y2hlY2tib3hCdXR0b24uc2V0Q2xhc3MoXCJhY3RpdmVcIik7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIE1hbnVhbGx5IGNyZWF0ZSBzcGFucyBmb3IgaWNvbiBhbmQgdGV4dFxyXG5cdFx0XHRjaGVja2JveEJ1dHRvbkVsLmVtcHR5KCk7XHJcblx0XHRcdGNvbnN0IGNoZWNrYm94SWNvblNwYW4gPSBjaGVja2JveEJ1dHRvbkVsLmNyZWF0ZVNwYW4oe1xyXG5cdFx0XHRcdGNsczogXCJxdWljay1jYXB0dXJlLXRhYi1pY29uXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRzZXRJY29uKGNoZWNrYm94SWNvblNwYW4sIFwiY2hlY2stc3F1YXJlXCIpO1xyXG5cdFx0XHRjaGVja2JveEJ1dHRvbkVsLmNyZWF0ZVNwYW4oe1xyXG5cdFx0XHRcdHRleHQ6IHQoXCJDaGVja2JveFwiKSxcclxuXHRcdFx0XHRjbHM6IFwicXVpY2stY2FwdHVyZS10YWItdGV4dFwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBGaWxlIG1vZGUgYnV0dG9uIChzYXZlIGFzIGZpbGUpIC0gb25seSB3aGVuIEZpbGVTb3VyY2UgaXMgZW5hYmxlZFxyXG5cdFx0aWYgKHRoaXMuZmlsZU1vZGVBdmFpbGFibGUpIHtcclxuXHRcdFx0Y29uc3QgZmlsZUJ1dHRvbiA9IG5ldyBCdXR0b25Db21wb25lbnQodGFiQ29udGFpbmVyKVxyXG5cdFx0XHRcdC5zZXRDbGFzcyhcInF1aWNrLWNhcHR1cmUtdGFiXCIpXHJcblx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4gdGhpcy5zd2l0Y2hNb2RlKFwiZmlsZVwiKSk7XHJcblxyXG5cdFx0XHRmaWxlQnV0dG9uLmJ1dHRvbkVsLnRvZ2dsZUNsYXNzKFwiY2xpY2thYmxlLWljb25cIiwgdHJ1ZSk7XHJcblxyXG5cdFx0XHRjb25zdCBmaWxlQnV0dG9uRWwgPSBmaWxlQnV0dG9uLmJ1dHRvbkVsO1xyXG5cdFx0XHRmaWxlQnV0dG9uRWwuc2V0QXR0cmlidXRlKFwicm9sZVwiLCBcInRhYlwiKTtcclxuXHRcdFx0ZmlsZUJ1dHRvbkVsLnNldEF0dHJpYnV0ZShcclxuXHRcdFx0XHRcImFyaWEtc2VsZWN0ZWRcIixcclxuXHRcdFx0XHRTdHJpbmcodGhpcy5jdXJyZW50TW9kZSA9PT0gXCJmaWxlXCIpXHJcblx0XHRcdCk7XHJcblx0XHRcdGZpbGVCdXR0b25FbC5zZXRBdHRyaWJ1dGUoXCJhcmlhLWNvbnRyb2xzXCIsIFwicXVpY2stY2FwdHVyZS1jb250ZW50XCIpO1xyXG5cdFx0XHRmaWxlQnV0dG9uRWwuc2V0QXR0cmlidXRlKFwiZGF0YS1tb2RlXCIsIFwiZmlsZVwiKTtcclxuXHJcblx0XHRcdGlmICh0aGlzLmN1cnJlbnRNb2RlID09PSBcImZpbGVcIikge1xyXG5cdFx0XHRcdGZpbGVCdXR0b24uc2V0Q2xhc3MoXCJhY3RpdmVcIik7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGZpbGVCdXR0b25FbC5lbXB0eSgpO1xyXG5cdFx0XHRjb25zdCBmaWxlSWNvblNwYW4gPSBmaWxlQnV0dG9uRWwuY3JlYXRlU3Bhbih7XHJcblx0XHRcdFx0Y2xzOiBcInF1aWNrLWNhcHR1cmUtdGFiLWljb25cIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdHNldEljb24oZmlsZUljb25TcGFuLCBcImZpbGUtcGx1c1wiKTtcclxuXHRcdFx0ZmlsZUJ1dHRvbkVsLmNyZWF0ZVNwYW4oe1xyXG5cdFx0XHRcdHRleHQ6IHQoXCJGaWxlXCIpLFxyXG5cdFx0XHRcdGNsczogXCJxdWljay1jYXB0dXJlLXRhYi10ZXh0XCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICghKHRoaXMuZmlsZU1vZGVBdmFpbGFibGUgJiYgdGhpcy5pbmxpbmVNb2RlQXZhaWxhYmxlKSkge1xyXG5cdFx0XHR0YWJDb250YWluZXIuY2xhc3NMaXN0LmFkZChcImlzLWhpZGRlblwiKTtcclxuXHRcdFx0dGFiQ29udGFpbmVyLnNldEF0dHJpYnV0ZShcImFyaWEtaGlkZGVuXCIsIFwidHJ1ZVwiKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBSaWdodCBzaWRlOiBDbGVhciBidXR0b24gd2l0aCBpbXByb3ZlZCBzdHlsaW5nXHJcblx0XHRpZiAodGhpcy5maWxlTW9kZUF2YWlsYWJsZSAmJiB0aGlzLmlubGluZU1vZGVBdmFpbGFibGUpIHtcclxuXHRcdFx0Y29uc3QgY2xlYXJCdXR0b24gPSB0aGlzLmhlYWRlckNvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdFx0dGV4dDogdChcIkNsZWFyXCIpLFxyXG5cdFx0XHRcdGNsczogW1wicXVpY2stY2FwdHVyZS1jbGVhclwiLCBcImNsaWNrYWJsZS1pY29uXCJdLFxyXG5cdFx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHRcdFwiYXJpYS1sYWJlbFwiOiB0KFwiQ2xlYXIgYWxsIGNvbnRlbnRcIiksXHJcblx0XHRcdFx0XHR0eXBlOiBcImJ1dHRvblwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRjbGVhckJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5oYW5kbGVDbGVhcigpKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZSBmb290ZXIgd2l0aCBjb250aW51ZSBhbmQgYWN0aW9uIGJ1dHRvbnNcclxuXHQgKi9cclxuXHRwcm90ZWN0ZWQgY3JlYXRlRm9vdGVyKCk6IHZvaWQge1xyXG5cdFx0aWYgKCF0aGlzLmZvb3RlckNvbnRhaW5lcikgcmV0dXJuO1xyXG5cclxuXHRcdC8vIExlZnQgc2lkZTogQ29udGludWUgY3JlYXRpbmcgYnV0dG9uXHJcblx0XHRjb25zdCBsZWZ0Q29udGFpbmVyID0gdGhpcy5mb290ZXJDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInF1aWNrLWNhcHR1cmUtZm9vdGVyLWxlZnRcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IGNvbnRpbnVlQnV0dG9uID0gbGVmdENvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXCJDb250aW51ZSAmIE5ld1wiKSxcclxuXHRcdFx0Y2xzOiBcInF1aWNrLWNhcHR1cmUtY29udGludWVcIixcclxuXHRcdH0pO1xyXG5cdFx0Y29udGludWVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+XHJcblx0XHRcdHRoaXMuaGFuZGxlQ29udGludWVDcmVhdGUoKVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBSaWdodCBzaWRlOiBNYWluIGFjdGlvbiBidXR0b25zXHJcblx0XHRjb25zdCByaWdodENvbnRhaW5lciA9IHRoaXMuZm9vdGVyQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJxdWljay1jYXB0dXJlLWZvb3Rlci1yaWdodFwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gU2F2ZS9DcmVhdGUgYnV0dG9uXHJcblx0XHRjb25zdCBzdWJtaXRCdXR0b24gPSByaWdodENvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdHRleHQ6XHJcblx0XHRcdFx0dGhpcy5jdXJyZW50TW9kZSA9PT0gXCJmaWxlXCIgPyB0KFwiU2F2ZSBhcyBGaWxlXCIpIDogdChcIkFkZCBUYXNrXCIpLFxyXG5cdFx0XHRjbHM6IFwibW9kLWN0YVwiLFxyXG5cdFx0fSk7XHJcblx0XHRzdWJtaXRCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuaGFuZGxlU3VibWl0KCkpO1xyXG5cclxuXHRcdC8vIENhbmNlbCBidXR0b25cclxuXHRcdGNvbnN0IGNhbmNlbEJ1dHRvbiA9IHJpZ2h0Q29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0dGV4dDogdChcIkNhbmNlbFwiKSxcclxuXHRcdH0pO1xyXG5cdFx0Y2FuY2VsQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmNsb3NlKCkpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU3dpdGNoIHRvIGEgZGlmZmVyZW50IG1vZGVcclxuXHQgKi9cclxuXHRwcm90ZWN0ZWQgYXN5bmMgc3dpdGNoTW9kZShtb2RlOiBRdWlja0NhcHR1cmVNb2RlKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRpZiAobW9kZSA9PT0gdGhpcy5jdXJyZW50TW9kZSkgcmV0dXJuO1xyXG5cdFx0Ly8gUHJldmVudCBzd2l0Y2hpbmcgdG8gdW5zdXBwb3J0ZWQgbW9kZXNcclxuXHRcdGlmIChtb2RlID09PSBcImZpbGVcIiAmJiAhdGhpcy5maWxlTW9kZUF2YWlsYWJsZSkge1xyXG5cdFx0XHRuZXcgTm90aWNlKFxyXG5cdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcIkZpbGUgVGFzayBpcyBkaXNhYmxlZC4gRW5hYmxlIEZpbGVTb3VyY2UgaW4gU2V0dGluZ3MgdG8gdXNlIEZpbGUgbW9kZS5cIlxyXG5cdFx0XHRcdClcclxuXHRcdFx0KTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0aWYgKG1vZGUgPT09IFwiY2hlY2tib3hcIiAmJiAhdGhpcy5pbmxpbmVNb2RlQXZhaWxhYmxlKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTYXZlIGN1cnJlbnQgc3RhdGVcclxuXHRcdGNvbnN0IHNhdmVkQ29udGVudCA9IHRoaXMuY2FwdHVyZWRDb250ZW50O1xyXG5cdFx0Y29uc3Qgc2F2ZWRNZXRhZGF0YSA9IHsuLi50aGlzLnRhc2tNZXRhZGF0YX07XHJcblxyXG5cdFx0Ly8gVXBkYXRlIG1vZGVcclxuXHRcdHRoaXMuY3VycmVudE1vZGUgPSBtb2RlO1xyXG5cdFx0Ly8gUGVyc2lzdCBsYXN0IHVzZWQgbW9kZSB0byBsb2NhbCBzdG9yYWdlXHJcblx0XHR0cnkge1xyXG5cdFx0XHR0aGlzLmFwcC5zYXZlTG9jYWxTdG9yYWdlKExBU1RfVVNFRF9NT0RFX0tFWSwgbW9kZSk7XHJcblx0XHR9IGNhdGNoIHtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBVcGRhdGUgbW9kYWwgY2xhc3Nlc1xyXG5cdFx0dGhpcy5tb2RhbEVsLnJlbW92ZUNsYXNzKFxyXG5cdFx0XHRcInF1aWNrLWNhcHR1cmUtY2hlY2tib3hcIixcclxuXHRcdFx0XCJxdWljay1jYXB0dXJlLWZpbGVcIlxyXG5cdFx0KTtcclxuXHRcdHRoaXMubW9kYWxFbC5hZGRDbGFzcyhgcXVpY2stY2FwdHVyZS0ke21vZGV9YCk7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHRhYiBhY3RpdmUgc3RhdGVzXHJcblx0XHRjb25zdCB0YWJzID1cclxuXHRcdFx0dGhpcy5oZWFkZXJDb250YWluZXI/LnF1ZXJ5U2VsZWN0b3JBbGwoXCIucXVpY2stY2FwdHVyZS10YWJcIik7XHJcblx0XHR0YWJzPy5mb3JFYWNoKCh0YWIpID0+IHtcclxuXHRcdFx0dGFiLnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpO1xyXG5cdFx0XHRjb25zdCB0YWJNb2RlID0gdGFiLmdldEF0dHJpYnV0ZShcImRhdGEtbW9kZVwiKTtcclxuXHRcdFx0aWYgKHRhYk1vZGUgPT09IG1vZGUpIHtcclxuXHRcdFx0XHR0YWIuYWRkQ2xhc3MoXCJhY3RpdmVcIik7XHJcblx0XHRcdH1cclxuXHRcdFx0dGFiLnNldEF0dHJpYnV0ZShcImFyaWEtc2VsZWN0ZWRcIiwgU3RyaW5nKHRhYk1vZGUgPT09IG1vZGUpKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSBvbmx5IHRoZSB0YXJnZXQgZGlzcGxheSBpbnN0ZWFkIG9mIHJlY3JlYXRpbmcgZXZlcnl0aGluZ1xyXG5cdFx0dGhpcy51cGRhdGVUYXJnZXREaXNwbGF5KCk7XHJcblxyXG5cdFx0Ly8gUmVzdG9yZSBtZXRhZGF0YVxyXG5cdFx0dGhpcy50YXNrTWV0YWRhdGEgPSBzYXZlZE1ldGFkYXRhO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSBidXR0b24gdGV4dFxyXG5cdFx0Y29uc3Qgc3VibWl0QnV0dG9uID0gdGhpcy5mb290ZXJDb250YWluZXI/LnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFwiLm1vZC1jdGFcIlxyXG5cdFx0KSBhcyBIVE1MQnV0dG9uRWxlbWVudDtcclxuXHRcdGlmIChzdWJtaXRCdXR0b24pIHtcclxuXHRcdFx0c3VibWl0QnV0dG9uLnNldFRleHQoXHJcblx0XHRcdFx0bW9kZSA9PT0gXCJmaWxlXCIgPyB0KFwiU2F2ZSBhcyBGaWxlXCIpIDogdChcIkFkZCBUYXNrXCIpXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBIYW5kbGUgY2xlYXIgYWN0aW9uXHJcblx0ICovXHJcblx0cHJvdGVjdGVkIGhhbmRsZUNsZWFyKCk6IHZvaWQge1xyXG5cdFx0Ly8gQ2xlYXIgY29udGVudFxyXG5cdFx0dGhpcy5jYXB0dXJlZENvbnRlbnQgPSBcIlwiO1xyXG5cdFx0aWYgKHRoaXMubWFya2Rvd25FZGl0b3IpIHtcclxuXHRcdFx0dGhpcy5tYXJrZG93bkVkaXRvci5zZXQoXCJcIiwgZmFsc2UpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENsZWFyIG1ldGFkYXRhIGJ1dCBrZWVwIGxvY2F0aW9uIHNldHRpbmdzXHJcblx0XHRjb25zdCBsb2NhdGlvbiA9IHRoaXMudGFza01ldGFkYXRhLmxvY2F0aW9uO1xyXG5cdFx0Y29uc3QgdGFyZ2V0RmlsZSA9IHRoaXMudGFza01ldGFkYXRhLnRhcmdldEZpbGU7XHJcblx0XHR0aGlzLnRhc2tNZXRhZGF0YSA9IHtcclxuXHRcdFx0bG9jYXRpb24sXHJcblx0XHRcdHRhcmdldEZpbGUsXHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIFJlc2V0IGFueSBVSSBlbGVtZW50c1xyXG5cdFx0dGhpcy5yZXNldFVJRWxlbWVudHMoKTtcclxuXHJcblx0XHQvLyBGb2N1cyBlZGl0b3JcclxuXHRcdHRoaXMubWFya2Rvd25FZGl0b3I/LmVkaXRvcj8uZm9jdXMoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSBjb250aW51ZSAmIGNyZWF0ZSBuZXdcclxuXHQgKi9cclxuXHRwcm90ZWN0ZWQgYXN5bmMgaGFuZGxlQ29udGludWVDcmVhdGUoKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHQvLyBGaXJzdCwgc2F2ZSB0aGUgY3VycmVudCB0YXNrXHJcblx0XHRjb25zdCBjb250ZW50ID1cclxuXHRcdFx0dGhpcy5jYXB0dXJlZENvbnRlbnQudHJpbSgpIHx8XHJcblx0XHRcdHRoaXMubWFya2Rvd25FZGl0b3I/LnZhbHVlLnRyaW0oKSB8fFxyXG5cdFx0XHRcIlwiO1xyXG5cclxuXHRcdGlmICghY29udGVudCkge1xyXG5cdFx0XHRuZXcgTm90aWNlKHQoXCJOb3RoaW5nIHRvIGNhcHR1cmVcIikpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0YXdhaXQgdGhpcy5zYXZlQ29udGVudChjb250ZW50KTtcclxuXHRcdFx0bmV3IE5vdGljZSh0KFwiQ2FwdHVyZWQgc3VjY2Vzc2Z1bGx5XCIpKTtcclxuXHJcblx0XHRcdC8vIENsZWFyIGZvciBuZXh0IHRhc2sgYnV0IGtlZXAgc2V0dGluZ3NcclxuXHRcdFx0dGhpcy5oYW5kbGVDbGVhcigpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0bmV3IE5vdGljZShgJHt0KFwiRmFpbGVkIHRvIHNhdmU6XCIpfSAke2Vycm9yfWApO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSGFuZGxlIHN1Ym1pdCBhY3Rpb25cclxuXHQgKi9cclxuXHRwcm90ZWN0ZWQgYXN5bmMgaGFuZGxlU3VibWl0KCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Y29uc3QgY29udGVudCA9XHJcblx0XHRcdHRoaXMuY2FwdHVyZWRDb250ZW50LnRyaW0oKSB8fFxyXG5cdFx0XHR0aGlzLm1hcmtkb3duRWRpdG9yPy52YWx1ZS50cmltKCkgfHxcclxuXHRcdFx0XCJcIjtcclxuXHJcblx0XHRpZiAoIWNvbnRlbnQpIHtcclxuXHRcdFx0bmV3IE5vdGljZSh0KFwiTm90aGluZyB0byBjYXB0dXJlXCIpKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdGF3YWl0IHRoaXMuc2F2ZUNvbnRlbnQoY29udGVudCk7XHJcblx0XHRcdG5ldyBOb3RpY2UoXHJcblx0XHRcdFx0dGhpcy5jdXJyZW50TW9kZSA9PT0gXCJmaWxlXCJcclxuXHRcdFx0XHRcdD8gdChcIkZpbGUgc2F2ZWQgc3VjY2Vzc2Z1bGx5XCIpXHJcblx0XHRcdFx0XHQ6IHQoXCJUYXNrIGFkZGVkIHN1Y2Nlc3NmdWxseVwiKVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0aWYgKCF0aGlzLmtlZXBPcGVuQWZ0ZXJDYXB0dXJlKSB7XHJcblx0XHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMuaGFuZGxlQ2xlYXIoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0bmV3IE5vdGljZShgJHt0KFwiRmFpbGVkIHRvIHNhdmU6XCIpfSAke2Vycm9yfWApO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2F2ZSBjb250ZW50IGJhc2VkIG9uIGN1cnJlbnQgbW9kZSBhbmQgc2V0dGluZ3NcclxuXHQgKi9cclxuXHRwcm90ZWN0ZWQgYXN5bmMgc2F2ZUNvbnRlbnQoY29udGVudDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRsZXQgcHJvY2Vzc2VkQ29udGVudCA9IHRoaXMucHJvY2Vzc0NvbnRlbnRXaXRoTWV0YWRhdGEoY29udGVudCk7XHJcblxyXG5cdFx0bGV0IHRhcmdldEZpbGUgPSB0aGlzLnRlbXBUYXJnZXRGaWxlUGF0aDtcclxuXHJcblx0XHQvLyBIYW5kbGUgZmlsZSBtb2RlXHJcblx0XHRpZiAodGhpcy5jdXJyZW50TW9kZSA9PT0gXCJmaWxlXCIgJiYgdGhpcy50YXNrTWV0YWRhdGEuY3VzdG9tRmlsZU5hbWUpIHtcclxuXHRcdFx0dGFyZ2V0RmlsZSA9IHByb2Nlc3NEYXRlVGVtcGxhdGVzKHRoaXMudGFza01ldGFkYXRhLmN1c3RvbUZpbGVOYW1lKTtcclxuXHRcdFx0aWYgKCF0YXJnZXRGaWxlLmVuZHNXaXRoKFwiLm1kXCIpKSB7XHJcblx0XHRcdFx0dGFyZ2V0RmlsZSArPSBcIi5tZFwiO1xyXG5cdFx0XHR9XHJcblx0XHRcdC8vIFByZWZpeCBkZWZhdWx0IGZvbGRlciB3aGVuIGNvbmZpZ3VyZWQgYW5kIEZpbGVTb3VyY2UgaXMgZW5hYmxlZFxyXG5cdFx0XHRjb25zdCBkZWZhdWx0Rm9sZGVyID1cclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUuY3JlYXRlRmlsZU1vZGU/LmRlZmF1bHRGb2xkZXI/LnRyaW0oKTtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzPy5maWxlU291cmNlPy5lbmFibGVkICYmXHJcblx0XHRcdFx0ZGVmYXVsdEZvbGRlciAmJlxyXG5cdFx0XHRcdCF0YXJnZXRGaWxlLmluY2x1ZGVzKFwiL1wiKVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHR0YXJnZXRGaWxlID0gdGhpcy5zYW5pdGl6ZUZpbGVQYXRoKFxyXG5cdFx0XHRcdFx0YCR7ZGVmYXVsdEZvbGRlcn0vJHt0YXJnZXRGaWxlfWBcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHByb2Nlc3NlZENvbnRlbnQgPSBhd2FpdCB0aGlzLmJ1aWxkRmlsZU1vZGVDb250ZW50KFxyXG5cdFx0XHRcdGNvbnRlbnQsXHJcblx0XHRcdFx0cHJvY2Vzc2VkQ29udGVudFxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENvbnZlcnQgbG9jYXRpb24vdGFyZ2V0VHlwZSB0byB2YWxpZCBRdWlja0NhcHR1cmVPcHRpb25zIHR5cGVcclxuXHRcdGxldCB0YXJnZXRUeXBlOiBcImZpeGVkXCIgfCBcImRhaWx5LW5vdGVcIiB8IHVuZGVmaW5lZCA9IFwiZml4ZWRcIjtcclxuXHRcdGlmICh0aGlzLnRhc2tNZXRhZGF0YS5sb2NhdGlvbiA9PT0gXCJkYWlseS1ub3RlXCIpIHtcclxuXHRcdFx0dGFyZ2V0VHlwZSA9IFwiZGFpbHktbm90ZVwiO1xyXG5cdFx0fSBlbHNlIGlmIChcclxuXHRcdFx0dGhpcy50YXNrTWV0YWRhdGEubG9jYXRpb24gPT09IFwiZmlsZVwiIHx8XHJcblx0XHRcdHRoaXMudGFza01ldGFkYXRhLmxvY2F0aW9uID09PSBcImZpeGVkXCJcclxuXHRcdCkge1xyXG5cdFx0XHR0YXJnZXRUeXBlID0gXCJmaXhlZFwiO1xyXG5cdFx0fSBlbHNlIGlmIChcclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLnRhcmdldFR5cGUgPT09IFwiZGFpbHktbm90ZVwiXHJcblx0XHQpIHtcclxuXHRcdFx0dGFyZ2V0VHlwZSA9IFwiZGFpbHktbm90ZVwiO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGFyZ2V0VHlwZSA9IFwiZml4ZWRcIjsgLy8gRGVmYXVsdCB0byBmaXhlZCBmb3IgY3VzdG9tLWZpbGUgb3IgYW55IG90aGVyIHR5cGVcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBjYXB0dXJlT3B0aW9ucyA9IHtcclxuXHRcdFx0Li4udGhpcy5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLFxyXG5cdFx0XHR0YXJnZXRGaWxlLFxyXG5cdFx0XHR0YXJnZXRUeXBlLFxyXG5cdFx0XHQvLyBGb3IgZmlsZSBtb2RlLCBhbHdheXMgcmVwbGFjZVxyXG5cdFx0XHRhcHBlbmRUb0ZpbGU6XHJcblx0XHRcdFx0dGhpcy5jdXJyZW50TW9kZSA9PT0gXCJmaWxlXCJcclxuXHRcdFx0XHRcdD8gKFwicmVwbGFjZVwiIGFzIGNvbnN0KVxyXG5cdFx0XHRcdFx0OiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUuYXBwZW5kVG9GaWxlLFxyXG5cdFx0fTtcclxuXHJcblx0XHRhd2FpdCBzYXZlQ2FwdHVyZSh0aGlzLmFwcCwgcHJvY2Vzc2VkQ29udGVudCwgY2FwdHVyZU9wdGlvbnMpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUHJvY2VzcyBjb250ZW50IHdpdGggbWV0YWRhdGFcclxuXHQgKi9cclxuXHRwcm90ZWN0ZWQgYWJzdHJhY3QgcHJvY2Vzc0NvbnRlbnRXaXRoTWV0YWRhdGEoY29udGVudDogc3RyaW5nKTogc3RyaW5nO1xyXG5cclxuXHQvKipcclxuXHQgKiBDcmVhdGUgVUkgLSBzdWJjbGFzc2VzIHNob3VsZCBjcmVhdGUgdGhlaXIgVUkgaGVyZVxyXG5cdCAqL1xyXG5cdHByb3RlY3RlZCBhYnN0cmFjdCBjcmVhdGVVSSgpOiB2b2lkO1xyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgdGFyZ2V0IGRpc3BsYXkgd2hlbiBtb2RlIGNoYW5nZXNcclxuXHQgKi9cclxuXHRwcm90ZWN0ZWQgYWJzdHJhY3QgdXBkYXRlVGFyZ2V0RGlzcGxheSgpOiB2b2lkO1xyXG5cclxuXHQvKipcclxuXHQgKiBJbml0aWFsaXplIGNvbXBvbmVudHMgYWZ0ZXIgVUkgY3JlYXRpb25cclxuXHQgKi9cclxuXHRwcm90ZWN0ZWQgYWJzdHJhY3QgaW5pdGlhbGl6ZUNvbXBvbmVudHMoKTogdm9pZDtcclxuXHJcblx0LyoqXHJcblx0ICogUmVzZXQgVUkgZWxlbWVudHMgdG8gZGVmYXVsdCBzdGF0ZVxyXG5cdCAqL1xyXG5cdHByb3RlY3RlZCBhYnN0cmFjdCByZXNldFVJRWxlbWVudHMoKTogdm9pZDtcclxuXHJcblx0LyoqXHJcblx0ICogU2FuaXRpemUgZmlsZSBwYXRoXHJcblx0ICovXHJcblx0cHJvdGVjdGVkIHNhbml0aXplRmlsZVBhdGgoZmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHRjb25zdCBwYXRoUGFydHMgPSBmaWxlUGF0aC5zcGxpdChcIi9cIik7XHJcblx0XHRjb25zdCBzYW5pdGl6ZWRQYXJ0cyA9IHBhdGhQYXJ0cy5tYXAoKHBhcnQsIGluZGV4KSA9PiB7XHJcblx0XHRcdGlmIChpbmRleCA9PT0gcGF0aFBhcnRzLmxlbmd0aCAtIDEpIHtcclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5zYW5pdGl6ZUZpbGVuYW1lKHBhcnQpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBwYXJ0XHJcblx0XHRcdFx0LnJlcGxhY2UoL1s8PjpcInwqP1xcXFxdL2csIFwiLVwiKVxyXG5cdFx0XHRcdC5yZXBsYWNlKC9cXHMrL2csIFwiIFwiKVxyXG5cdFx0XHRcdC50cmltKCk7XHJcblx0XHR9KTtcclxuXHRcdHJldHVybiBzYW5pdGl6ZWRQYXJ0cy5qb2luKFwiL1wiKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNhbml0aXplIGZpbGVuYW1lXHJcblx0ICovXHJcblxyXG5cdC8qKlxyXG5cdCAqIE1hcCBVSSBzdGF0dXMgKHN5bWJvbCBvciB0ZXh0KSB0byB0ZXh0dWFsIG1ldGFkYXRhXHJcblx0ICovXHJcblx0cHJvdGVjdGVkIG1hcFN0YXR1c1RvVGV4dChzdGF0dXM/OiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0aWYgKCFzdGF0dXMpIHJldHVybiBcIm5vdC1zdGFydGVkXCI7XHJcblx0XHRpZiAoc3RhdHVzLmxlbmd0aCA+IDEpIHJldHVybiBzdGF0dXM7IC8vIGFscmVhZHkgdGV4dHVhbFxyXG5cdFx0c3dpdGNoIChzdGF0dXMpIHtcclxuXHRcdFx0Y2FzZSBcInhcIjpcclxuXHRcdFx0Y2FzZSBcIlhcIjpcclxuXHRcdFx0XHRyZXR1cm4gXCJjb21wbGV0ZWRcIjtcclxuXHRcdFx0Y2FzZSBcIi9cIjpcclxuXHRcdFx0Y2FzZSBcIj5cIjpcclxuXHRcdFx0XHRyZXR1cm4gXCJpbi1wcm9ncmVzc1wiO1xyXG5cdFx0XHRjYXNlIFwiP1wiOlxyXG5cdFx0XHRcdHJldHVybiBcInBsYW5uZWRcIjtcclxuXHRcdFx0Y2FzZSBcIi1cIjpcclxuXHRcdFx0XHRyZXR1cm4gXCJjYW5jZWxsZWRcIjtcclxuXHRcdFx0Y2FzZSBcIiBcIjpcclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRyZXR1cm4gXCJub3Qtc3RhcnRlZFwiO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJvdGVjdGVkIGFzeW5jIGJ1aWxkRmlsZU1vZGVDb250ZW50KFxyXG5cdFx0cmF3Q29udGVudDogc3RyaW5nLFxyXG5cdFx0cHJvY2Vzc2VkQ29udGVudDogc3RyaW5nLFxyXG5cdFx0b3B0aW9uczogeyBwcmV2aWV3PzogYm9vbGVhbiB9ID0ge31cclxuXHQpOiBQcm9taXNlPHN0cmluZz4ge1xyXG5cdFx0Y29uc3QgY3JlYXRlRmlsZU1vZGUgPVxyXG5cdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUuY3JlYXRlRmlsZU1vZGU7XHJcblx0XHRjb25zdCB1c2VUZW1wbGF0ZSA9ICEhY3JlYXRlRmlsZU1vZGU/LnVzZVRlbXBsYXRlO1xyXG5cclxuXHRcdGlmICh1c2VUZW1wbGF0ZSkge1xyXG5cdFx0XHRjb25zdCB0ZW1wbGF0ZVBhdGggPSBjcmVhdGVGaWxlTW9kZT8udGVtcGxhdGVGaWxlPy50cmltKCk7XHJcblx0XHRcdGlmICh0ZW1wbGF0ZVBhdGgpIHtcclxuXHRcdFx0XHRjb25zdCB0ZW1wbGF0ZUZpbGUgPVxyXG5cdFx0XHRcdFx0dGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHRlbXBsYXRlUGF0aCk7XHJcblx0XHRcdFx0aWYgKHRlbXBsYXRlRmlsZSBpbnN0YW5jZW9mIFRGaWxlKSB7XHJcblx0XHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0XHRjb25zdCB0ZW1wbGF0ZUNvbnRlbnQgPVxyXG5cdFx0XHRcdFx0XHRcdGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQodGVtcGxhdGVGaWxlKTtcclxuXHRcdFx0XHRcdFx0Y29uc3QgbWVyZ2VkID0gdGhpcy5tZXJnZUNvbnRlbnRJbnRvVGVtcGxhdGUoXHJcblx0XHRcdFx0XHRcdFx0dGVtcGxhdGVDb250ZW50LFxyXG5cdFx0XHRcdFx0XHRcdHByb2Nlc3NlZENvbnRlbnRcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuZW5zdXJlTWluaW1hbEZyb250bWF0dGVyKG1lcmdlZCk7XHJcblx0XHRcdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmVycm9yKFxyXG5cdFx0XHRcdFx0XHRcdFwiRmFpbGVkIHRvIHJlYWQgcXVpY2sgY2FwdHVyZSB0ZW1wbGF0ZTpcIixcclxuXHRcdFx0XHRcdFx0XHRlcnJvclxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRpZiAoIW9wdGlvbnMucHJldmlldykge1xyXG5cdFx0XHRcdFx0XHRcdG5ldyBOb3RpY2UoXHJcblx0XHRcdFx0XHRcdFx0XHRgJHt0KFwiRmFpbGVkIHRvIHJlYWQgdGVtcGxhdGUgZmlsZTpcIil9ICR7dGVtcGxhdGVQYXRofWBcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSBlbHNlIGlmICghb3B0aW9ucy5wcmV2aWV3KSB7XHJcblx0XHRcdFx0XHRuZXcgTm90aWNlKFxyXG5cdFx0XHRcdFx0XHRgJHt0KFwiVGVtcGxhdGUgZmlsZSBub3QgZm91bmQ6XCIpfSAke3RlbXBsYXRlUGF0aH1gXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIGlmICghb3B0aW9ucy5wcmV2aWV3KSB7XHJcblx0XHRcdFx0bmV3IE5vdGljZShcclxuXHRcdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcdFwiVGVtcGxhdGUgZmlsZSBpcyBub3QgY29uZmlndXJlZCBmb3IgUXVpY2sgQ2FwdHVyZSBmaWxlIG1vZGUuXCJcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgaGFzRnJvbnRtYXR0ZXIgPSBwcm9jZXNzZWRDb250ZW50XHJcblx0XHRcdC50cmltU3RhcnQoKVxyXG5cdFx0XHQuc3RhcnRzV2l0aChcIi0tLVwiKTtcclxuXHRcdGlmICh1c2VUZW1wbGF0ZSAmJiBoYXNGcm9udG1hdHRlcikge1xyXG5cdFx0XHRyZXR1cm4gcHJvY2Vzc2VkQ29udGVudDtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAodXNlVGVtcGxhdGUpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMuZW5zdXJlTWluaW1hbEZyb250bWF0dGVyKHByb2Nlc3NlZENvbnRlbnQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0aGlzLmJ1aWxkRnVsbEZyb250bWF0dGVyKHByb2Nlc3NlZENvbnRlbnQsIHJhd0NvbnRlbnQpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBtZXJnZUNvbnRlbnRJbnRvVGVtcGxhdGUoXHJcblx0XHR0ZW1wbGF0ZUNvbnRlbnQ6IHN0cmluZyxcclxuXHRcdGNhcHR1cmVDb250ZW50OiBzdHJpbmdcclxuXHQpOiBzdHJpbmcge1xyXG5cdFx0aWYgKCF0ZW1wbGF0ZUNvbnRlbnQpIHtcclxuXHRcdFx0cmV0dXJuIGNhcHR1cmVDb250ZW50O1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHBsYWNlaG9sZGVyUmVnZXggPSAvXFx7XFx7XFxzKkNPTlRFTlRcXHMqXFx9XFx9L2dpO1xyXG5cdFx0aWYgKHBsYWNlaG9sZGVyUmVnZXgudGVzdCh0ZW1wbGF0ZUNvbnRlbnQpKSB7XHJcblx0XHRcdHJldHVybiB0ZW1wbGF0ZUNvbnRlbnQucmVwbGFjZShwbGFjZWhvbGRlclJlZ2V4LCBjYXB0dXJlQ29udGVudCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgdHJpbW1lZFRlbXBsYXRlID0gdGVtcGxhdGVDb250ZW50LnRyaW1FbmQoKTtcclxuXHRcdGNvbnN0IHNlcGFyYXRvciA9IHRyaW1tZWRUZW1wbGF0ZSA/IFwiXFxuXFxuXCIgOiBcIlwiO1xyXG5cdFx0cmV0dXJuIGAke3RyaW1tZWRUZW1wbGF0ZX0ke3NlcGFyYXRvcn0ke2NhcHR1cmVDb250ZW50fWA7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGVuc3VyZU1pbmltYWxGcm9udG1hdHRlcihjb250ZW50OiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgdHJpbW1lZCA9IGNvbnRlbnQudHJpbVN0YXJ0KCk7XHJcblx0XHRpZiAodHJpbW1lZC5zdGFydHNXaXRoKFwiLS0tXCIpKSB7XHJcblx0XHRcdHJldHVybiBjb250ZW50O1xyXG5cdFx0fVxyXG5cdFx0Y29uc3Qgc3RhdHVzVGV4dCA9IHRoaXMubWFwU3RhdHVzVG9UZXh0KHRoaXMudGFza01ldGFkYXRhLnN0YXR1cyk7XHJcblx0XHRyZXR1cm4gYC0tLVxcbnN0YXR1czogJHtKU09OLnN0cmluZ2lmeShcclxuXHRcdFx0c3RhdHVzVGV4dFxyXG5cdFx0KX1cXG4tLS1cXG5cXG4ke2NvbnRlbnR9YDtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYnVpbGRGdWxsRnJvbnRtYXR0ZXIoXHJcblx0XHRwcm9jZXNzZWRDb250ZW50OiBzdHJpbmcsXHJcblx0XHRyYXdDb250ZW50OiBzdHJpbmdcclxuXHQpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgdHJpbW1lZCA9IHByb2Nlc3NlZENvbnRlbnQudHJpbVN0YXJ0KCk7XHJcblx0XHRpZiAodHJpbW1lZC5zdGFydHNXaXRoKFwiLS0tXCIpKSB7XHJcblx0XHRcdHJldHVybiBwcm9jZXNzZWRDb250ZW50O1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHN0YXR1c1RleHQgPSB0aGlzLm1hcFN0YXR1c1RvVGV4dCh0aGlzLnRhc2tNZXRhZGF0YS5zdGF0dXMpO1xyXG5cdFx0Y29uc3Qgc3RhcnREYXRlID0gdGhpcy50YXNrTWV0YWRhdGEuc3RhcnREYXRlXHJcblx0XHRcdD8gdGhpcy5mb3JtYXREYXRlKHRoaXMudGFza01ldGFkYXRhLnN0YXJ0RGF0ZSlcclxuXHRcdFx0OiB1bmRlZmluZWQ7XHJcblx0XHRjb25zdCBkdWVEYXRlID0gdGhpcy50YXNrTWV0YWRhdGEuZHVlRGF0ZVxyXG5cdFx0XHQ/IHRoaXMuZm9ybWF0RGF0ZSh0aGlzLnRhc2tNZXRhZGF0YS5kdWVEYXRlKVxyXG5cdFx0XHQ6IHVuZGVmaW5lZDtcclxuXHRcdGNvbnN0IHNjaGVkdWxlZERhdGUgPSB0aGlzLnRhc2tNZXRhZGF0YS5zY2hlZHVsZWREYXRlXHJcblx0XHRcdD8gdGhpcy5mb3JtYXREYXRlKHRoaXMudGFza01ldGFkYXRhLnNjaGVkdWxlZERhdGUpXHJcblx0XHRcdDogdW5kZWZpbmVkO1xyXG5cdFx0Y29uc3QgcHJpb3JpdHlWYWwgPVxyXG5cdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS5wcmlvcml0eSAhPT0gdW5kZWZpbmVkICYmXHJcblx0XHRcdHRoaXMudGFza01ldGFkYXRhLnByaW9yaXR5ICE9PSBudWxsXHJcblx0XHRcdFx0PyBTdHJpbmcodGhpcy50YXNrTWV0YWRhdGEucHJpb3JpdHkpXHJcblx0XHRcdFx0OiB1bmRlZmluZWQ7XHJcblx0XHRjb25zdCBwcm9qZWN0VmFsID0gdGhpcy50YXNrTWV0YWRhdGEucHJvamVjdCB8fCB1bmRlZmluZWQ7XHJcblx0XHRjb25zdCBjb250ZXh0VmFsID0gdGhpcy50YXNrTWV0YWRhdGEuY29udGV4dCB8fCB1bmRlZmluZWQ7XHJcblx0XHRjb25zdCByZXBlYXRWYWwgPSB0aGlzLnRhc2tNZXRhZGF0YS5yZWN1cnJlbmNlIHx8IHVuZGVmaW5lZDtcclxuXHRcdGNvbnN0IHdyaXRlQ29udGVudFRhZ3MgPVxyXG5cdFx0XHQhIXRoaXMucGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZS5jcmVhdGVGaWxlTW9kZVxyXG5cdFx0XHRcdD8ud3JpdGVDb250ZW50VGFnc1RvRnJvbnRtYXR0ZXI7XHJcblx0XHRjb25zdCBtZXJnZWRUYWdzID0gd3JpdGVDb250ZW50VGFnc1xyXG5cdFx0XHQ/IHRoaXMuZXh0cmFjdFRhZ3NGcm9tQ29udGVudEZvckZyb250bWF0dGVyKHJhd0NvbnRlbnQpXHJcblx0XHRcdDogW107XHJcblxyXG5cdFx0Y29uc3QgeWFtbExpbmVzOiBzdHJpbmdbXSA9IFtdO1xyXG5cdFx0eWFtbExpbmVzLnB1c2goYHN0YXR1czogJHtKU09OLnN0cmluZ2lmeShzdGF0dXNUZXh0KX1gKTtcclxuXHRcdGlmIChkdWVEYXRlKSB5YW1sTGluZXMucHVzaChgZHVlRGF0ZTogJHtKU09OLnN0cmluZ2lmeShkdWVEYXRlKX1gKTtcclxuXHRcdGlmIChzdGFydERhdGUpIHlhbWxMaW5lcy5wdXNoKGBzdGFydERhdGU6ICR7SlNPTi5zdHJpbmdpZnkoc3RhcnREYXRlKX1gKTtcclxuXHRcdGlmIChzY2hlZHVsZWREYXRlKVxyXG5cdFx0XHR5YW1sTGluZXMucHVzaChgc2NoZWR1bGVkRGF0ZTogJHtKU09OLnN0cmluZ2lmeShzY2hlZHVsZWREYXRlKX1gKTtcclxuXHRcdGlmIChwcmlvcml0eVZhbClcclxuXHRcdFx0eWFtbExpbmVzLnB1c2goYHByaW9yaXR5OiAke0pTT04uc3RyaW5naWZ5KHByaW9yaXR5VmFsKX1gKTtcclxuXHRcdGlmIChwcm9qZWN0VmFsKSB5YW1sTGluZXMucHVzaChgcHJvamVjdDogJHtKU09OLnN0cmluZ2lmeShwcm9qZWN0VmFsKX1gKTtcclxuXHRcdGlmIChjb250ZXh0VmFsKSB5YW1sTGluZXMucHVzaChgY29udGV4dDogJHtKU09OLnN0cmluZ2lmeShjb250ZXh0VmFsKX1gKTtcclxuXHRcdGlmIChyZXBlYXRWYWwpIHlhbWxMaW5lcy5wdXNoKGByZXBlYXQ6ICR7SlNPTi5zdHJpbmdpZnkocmVwZWF0VmFsKX1gKTtcclxuXHRcdGlmIChtZXJnZWRUYWdzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0eWFtbExpbmVzLnB1c2goXHJcblx0XHRcdFx0YHRhZ3M6IFske21lcmdlZFRhZ3NcclxuXHRcdFx0XHRcdC5tYXAoKHQpID0+IEpTT04uc3RyaW5naWZ5KHQpKVxyXG5cdFx0XHRcdFx0LmpvaW4oXCIsIFwiKX1dYFxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBgLS0tXFxuJHt5YW1sTGluZXMuam9pbihcIlxcblwiKX1cXG4tLS1cXG5cXG4ke3Byb2Nlc3NlZENvbnRlbnR9YDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEV4dHJhY3QgI3RhZ3MgZnJvbSBjb250ZW50IGZvciBmcm9udG1hdHRlciB0YWdzIGFycmF5XHJcblx0ICogU2ltcGxlIHJlZ2V4IHNjYW47IHJlbW92ZSBsZWFkaW5nICcjJywgZGVkdXBlXHJcblx0ICovXHJcblx0cHJvdGVjdGVkIGV4dHJhY3RUYWdzRnJvbUNvbnRlbnRGb3JGcm9udG1hdHRlcihjb250ZW50OiBzdHJpbmcpOiBzdHJpbmdbXSB7XHJcblx0XHRpZiAoIWNvbnRlbnQpIHJldHVybiBbXTtcclxuXHRcdGNvbnN0IHRhZ1JlZ2V4ID0gLyhefFxccykjKFtBLVphLXowLTlfXFwvLV0rKS9nO1xyXG5cdFx0Y29uc3QgcmVzdWx0cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG5cdFx0bGV0IG1hdGNoOiBSZWdFeHBFeGVjQXJyYXkgfCBudWxsO1xyXG5cdFx0d2hpbGUgKChtYXRjaCA9IHRhZ1JlZ2V4LmV4ZWMoY29udGVudCkpICE9PSBudWxsKSB7XHJcblx0XHRcdGNvbnN0IHRhZyA9IG1hdGNoWzJdO1xyXG5cdFx0XHRpZiAodGFnKSByZXN1bHRzLmFkZCh0YWcpO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIEFycmF5LmZyb20ocmVzdWx0cyk7XHJcblx0fVxyXG5cclxuXHRwcm90ZWN0ZWQgc2FuaXRpemVGaWxlbmFtZShmaWxlbmFtZTogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdHJldHVybiBmaWxlbmFtZVxyXG5cdFx0XHQucmVwbGFjZSgvWzw+OlwifCo/XFxcXF0vZywgXCItXCIpXHJcblx0XHRcdC5yZXBsYWNlKC9cXHMrL2csIFwiIFwiKVxyXG5cdFx0XHQudHJpbSgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRm9ybWF0IGRhdGVcclxuXHQgKi9cclxuXHRwcm90ZWN0ZWQgZm9ybWF0RGF0ZShkYXRlOiBEYXRlKTogc3RyaW5nIHtcclxuXHRcdHJldHVybiBgJHtkYXRlLmdldEZ1bGxZZWFyKCl9LSR7U3RyaW5nKGRhdGUuZ2V0TW9udGgoKSArIDEpLnBhZFN0YXJ0KFxyXG5cdFx0XHQyLFxyXG5cdFx0XHRcIjBcIlxyXG5cdFx0KX0tJHtTdHJpbmcoZGF0ZS5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIFwiMFwiKX1gO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUGFyc2UgZGF0ZVxyXG5cdCAqL1xyXG5cdHByb3RlY3RlZCBwYXJzZURhdGUoZGF0ZVN0cmluZzogc3RyaW5nKTogRGF0ZSB7XHJcblx0XHRjb25zdCBbeWVhciwgbW9udGgsIGRheV0gPSBkYXRlU3RyaW5nLnNwbGl0KFwiLVwiKS5tYXAoTnVtYmVyKTtcclxuXHRcdHJldHVybiBuZXcgRGF0ZSh5ZWFyLCBtb250aCAtIDEsIGRheSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDYWxsZWQgd2hlbiB0aGUgbW9kYWwgaXMgY2xvc2VkXHJcblx0ICovXHJcblx0b25DbG9zZSgpIHtcclxuXHRcdC8vIFN0b3AgbWFuYWdpbmcgc3VnZ2VzdHNcclxuXHRcdHRoaXMuc3VnZ2VzdE1hbmFnZXIuc3RvcE1hbmFnaW5nKCk7XHJcblxyXG5cdFx0Ly8gQ2xlYW4gdXAgZWRpdG9yXHJcblx0XHRpZiAodGhpcy5tYXJrZG93bkVkaXRvcikge1xyXG5cdFx0XHR0aGlzLm1hcmtkb3duRWRpdG9yLmRlc3Ryb3koKTtcclxuXHRcdFx0dGhpcy5tYXJrZG93bkVkaXRvciA9IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2xlYXIgY29udGVudFxyXG5cdFx0dGhpcy5jb250ZW50RWwuZW1wdHkoKTtcclxuXHR9XHJcbn1cclxuIl19