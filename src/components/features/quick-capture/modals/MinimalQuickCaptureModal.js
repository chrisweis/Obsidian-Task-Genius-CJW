import { __awaiter } from "tslib";
import { Modal, Notice, moment, Menu, setIcon, } from "obsidian";
import { createEmbeddableMarkdownEditor, } from "@/editor-extensions/core/markdown-editor";
import { saveCapture, processDateTemplates } from "@/utils/file/file-operations";
import { t } from "@/translations/helper";
import { SuggestManager, } from "@/components/ui/suggest";
import { ConfigurableTaskParser } from "@/dataflow/core/ConfigurableTaskParser";
import { clearAllMarks } from "@/components/ui/renderers/MarkdownRenderer";
import { FileNameInput } from "../components/FileNameInput";
const LAST_USED_MODE_KEY = "task-genius.lastUsedQuickCaptureMode";
export class MinimalQuickCaptureModal extends Modal {
    constructor(app, plugin) {
        super(app);
        this.markdownEditor = null;
        this.capturedContent = "";
        this.taskMetadata = {};
        // Mode: 'checkbox' or 'file'
        this.currentMode = "checkbox";
        // UI Elements
        this.dateButton = null;
        this.priorityButton = null;
        this.locationButton = null;
        this.tagButton = null;
        this.modeTabsContainer = null;
        this.fileNameSection = null;
        this.fileNameInput = null;
        this.universalSuggest = null;
        this.plugin = plugin;
        this.minimalSuggest = plugin.minimalQuickCaptureSuggest;
        // Initialize suggest manager
        this.suggestManager = new SuggestManager(app, plugin);
        // Load last used mode from local storage
        try {
            const stored = this.app.loadLocalStorage(LAST_USED_MODE_KEY);
            if (stored === "checkbox" || stored === "file")
                this.currentMode = stored;
        }
        catch (_a) { }
        // Initialize default metadata with fallback
        const minimalSettings = this.plugin.settings.quickCapture.minimalModeSettings;
        this.taskMetadata.location =
            this.plugin.settings.quickCapture.targetType || "fixed";
        this.taskMetadata.targetFile = this.getTargetFile();
    }
    onOpen() {
        const { contentEl } = this;
        this.modalEl.addClass("quick-capture-modal");
        this.modalEl.addClass("minimal");
        // Store modal instance reference for suggest system
        this.modalEl.__minimalQuickCaptureModal = this;
        // Start managing suggests with high priority
        this.suggestManager.startManaging();
        // Set up the suggest system
        if (this.minimalSuggest) {
            this.minimalSuggest.setMinimalMode(true);
        }
        // Create the interface
        this.createMinimalInterface(contentEl);
        // Enable universal suggest for minimal modal after editor is created
        setTimeout(() => {
            var _a, _b;
            if ((_b = (_a = this.markdownEditor) === null || _a === void 0 ? void 0 : _a.editor) === null || _b === void 0 ? void 0 : _b.editor) {
                this.universalSuggest =
                    this.suggestManager.enableForMinimalModal(this.markdownEditor.editor.editor);
                this.universalSuggest.enable();
            }
        }, 100);
    }
    onClose() {
        // Clean up universal suggest
        if (this.universalSuggest) {
            this.universalSuggest.disable();
            this.universalSuggest = null;
        }
        // Stop managing suggests and restore original order
        this.suggestManager.stopManaging();
        // Clean up suggest
        if (this.minimalSuggest) {
            this.minimalSuggest.setMinimalMode(false);
        }
        // Clean up editor
        if (this.markdownEditor) {
            this.markdownEditor.destroy();
            this.markdownEditor = null;
        }
        // Clean up modal reference
        delete this.modalEl.__minimalQuickCaptureModal;
        // Clear content
        this.contentEl.empty();
    }
    createMinimalInterface(contentEl) {
        // Title
        this.titleEl.setText(t("Minimal Quick Capture"));
        // Mode tabs (checkbox | file)
        this.modeTabsContainer = contentEl.createDiv({ cls: "quick-capture-minimal-tabs" });
        const tabCheckbox = this.modeTabsContainer.createEl("button", { text: t("Task"), cls: "tab-btn" });
        const tabFile = this.modeTabsContainer.createEl("button", { text: t("File"), cls: "tab-btn" });
        const refreshTabs = () => {
            if (this.currentMode === "checkbox") {
                tabCheckbox.addClass("active");
                tabFile.removeClass("active");
            }
            else {
                tabFile.addClass("active");
                tabCheckbox.removeClass("active");
            }
            this.updateModeUI();
        };
        tabCheckbox.addEventListener("click", () => {
            this.currentMode = "checkbox";
            try {
                this.app.saveLocalStorage(LAST_USED_MODE_KEY, "checkbox");
            }
            catch (_a) { }
            refreshTabs();
        });
        tabFile.addEventListener("click", () => {
            this.currentMode = "file";
            try {
                this.app.saveLocalStorage(LAST_USED_MODE_KEY, "file");
            }
            catch (_a) { }
            refreshTabs();
        });
        refreshTabs();
        // Optional file name section (only for file mode)
        this.fileNameSection = contentEl.createDiv({ cls: "quick-capture-minimal-filename" });
        // Editor container
        const editorContainer = contentEl.createDiv({
            cls: "quick-capture-minimal-editor-container",
        });
        this.setupMarkdownEditor(editorContainer);
        // Bottom buttons container
        const buttonsContainer = contentEl.createDiv({
            cls: "quick-capture-minimal-buttons",
        });
        this.createQuickActionButtons(buttonsContainer);
        this.createMainButtons(buttonsContainer);
    }
    updateModeUI() {
        var _a;
        if (!this.fileNameSection)
            return;
        this.fileNameSection.empty();
        if (this.currentMode === "file") {
            this.fileNameSection.createDiv({ text: t("Capture as:"), cls: "quick-capture-section-title" });
            if (this.fileNameInput) {
                this.fileNameInput.destroy();
                this.fileNameInput = null;
            }
            this.fileNameInput = new FileNameInput(this.app, this.fileNameSection, {
                placeholder: t("Enter file name..."),
                defaultValue: this.plugin.settings.quickCapture.defaultFileNameTemplate ||
                    "{{DATE:YYYY-MM-DD}} - ",
                currentFolder: (_a = this.plugin.settings.quickCapture.createFileMode) === null || _a === void 0 ? void 0 : _a.defaultFolder,
                onChange: (value) => {
                    this.taskMetadata.targetFile = undefined; // not used in file mode
                    this.taskMetadata.customFileName = value;
                },
            });
        }
        else {
            if (this.fileNameInput) {
                this.fileNameInput.destroy();
                this.fileNameInput = null;
            }
        }
    }
    /** Extract #tags from content for frontmatter */
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
        return filename.replace(/[<>:"|*?\\]/g, "-").replace(/\s+/g, " ").trim();
    }
    sanitizeFilePath(filePath) {
        const parts = filePath.split("/");
        const sanitized = parts.map((part, idx) => idx === parts.length - 1 ? this.sanitizeFilename(part) : part.replace(/[<>:"|*?\\]/g, "-").replace(/\s+/g, " ").trim());
        return sanitized.join("/");
    }
    setupMarkdownEditor(container) {
        setTimeout(() => {
            var _a, _b;
            this.markdownEditor = createEmbeddableMarkdownEditor(this.app, container, {
                placeholder: this.currentMode === "file" ? t("Enter file content...") : t("Enter your task..."),
                singleLine: true,
                onEnter: (editor, mod, shift) => {
                    if (mod) {
                        // Submit on Cmd/Ctrl+Enter
                        this.handleSubmit();
                        return true;
                    }
                    // In minimal mode, Enter should also submit
                    this.handleSubmit();
                    return true;
                },
                onEscape: (editor) => {
                    this.close();
                },
                onChange: (update) => {
                    var _a;
                    this.capturedContent = ((_a = this.markdownEditor) === null || _a === void 0 ? void 0 : _a.value) || "";
                    // Parse content and update button states
                    this.parseContentAndUpdateButtons();
                },
            });
            // Focus the editor
            (_b = (_a = this.markdownEditor) === null || _a === void 0 ? void 0 : _a.editor) === null || _b === void 0 ? void 0 : _b.focus();
        }, 50);
    }
    createQuickActionButtons(container) {
        const settings = this.plugin.settings.quickCapture.minimalModeSettings || {};
        const leftContainer = container.createDiv({
            cls: "quick-actions-left",
        });
        this.dateButton = leftContainer.createEl("button", {
            cls: ["quick-action-button", "clickable-icon"],
            attr: { "aria-label": t("Set date") },
        });
        setIcon(this.dateButton, "calendar");
        this.dateButton.addEventListener("click", () => this.showDatePicker());
        this.updateButtonState(this.dateButton, !!this.taskMetadata.dueDate);
        this.priorityButton = leftContainer.createEl("button", {
            cls: ["quick-action-button", "clickable-icon"],
            attr: { "aria-label": t("Set priority") },
        });
        setIcon(this.priorityButton, "zap");
        this.priorityButton.addEventListener("click", () => this.showPriorityMenu());
        this.updateButtonState(this.priorityButton, !!this.taskMetadata.priority);
        this.locationButton = leftContainer.createEl("button", {
            cls: ["quick-action-button", "clickable-icon"],
            attr: { "aria-label": t("Set location") },
        });
        setIcon(this.locationButton, "folder");
        this.locationButton.addEventListener("click", () => this.showLocationMenu());
        this.updateButtonState(this.locationButton, this.taskMetadata.location !==
            (this.plugin.settings.quickCapture.targetType || "fixed"));
        this.tagButton = leftContainer.createEl("button", {
            cls: ["quick-action-button", "clickable-icon"],
            attr: { "aria-label": t("Add tags") },
        });
        setIcon(this.tagButton, "tag");
        this.tagButton.addEventListener("click", () => { });
        this.updateButtonState(this.tagButton, !!(this.taskMetadata.tags && this.taskMetadata.tags.length > 0));
    }
    createMainButtons(container) {
        const rightContainer = container.createDiv({
            cls: "quick-actions-right",
        });
        // Save button
        const saveButton = rightContainer.createEl("button", {
            text: t("Save"),
            cls: "mod-cta quick-action-save",
        });
        saveButton.addEventListener("click", () => this.handleSubmit());
    }
    updateButtonState(button, isActive) {
        if (isActive) {
            button.addClass("active");
        }
        else {
            button.removeClass("active");
        }
    }
    /**
     * Show menu at specified coordinates
     */
    showMenuAtCoords(menu, x, y) {
        menu.showAtMouseEvent(new MouseEvent("click", {
            clientX: x,
            clientY: y,
        }));
    }
    // Methods called by MinimalQuickCaptureSuggest
    showDatePickerAtCursor(cursorCoords, cursor) {
        this.showDatePicker(cursor, cursorCoords);
    }
    showDatePicker(cursor, coords) {
        const quickDates = [
            { label: t("Tomorrow"), date: moment().add(1, "day").toDate() },
            {
                label: t("Day after tomorrow"),
                date: moment().add(2, "day").toDate(),
            },
            { label: t("Next week"), date: moment().add(1, "week").toDate() },
            { label: t("Next month"), date: moment().add(1, "month").toDate() },
        ];
        const menu = new Menu();
        quickDates.forEach((quickDate) => {
            menu.addItem((item) => {
                item.setTitle(quickDate.label);
                item.setIcon("calendar");
                item.onClick(() => {
                    this.taskMetadata.dueDate = quickDate.date;
                    this.updateButtonState(this.dateButton, true);
                    // If called from suggest, replace the ~ with date text
                    if (cursor && this.markdownEditor) {
                        this.replaceAtCursor(cursor, this.formatDate(quickDate.date));
                    }
                });
            });
        });
        menu.addSeparator();
        menu.addItem((item) => {
            item.setTitle(t("Choose date..."));
            item.setIcon("calendar-days");
            item.onClick(() => {
                // Open full date picker
                // TODO: Implement full date picker integration
            });
        });
        // Show menu at cursor position if provided, otherwise at button
        if (coords) {
            this.showMenuAtCoords(menu, coords.left, coords.top);
        }
        else if (this.dateButton) {
            const rect = this.dateButton.getBoundingClientRect();
            this.showMenuAtCoords(menu, rect.left, rect.bottom + 5);
        }
    }
    showPriorityMenuAtCursor(cursorCoords, cursor) {
        this.showPriorityMenu(cursor, cursorCoords);
    }
    showPriorityMenu(cursor, coords) {
        const priorities = [
            { level: 5, label: t("Highest"), icon: "🔺" },
            { level: 4, label: t("High"), icon: "⏫" },
            { level: 3, label: t("Medium"), icon: "🔼" },
            { level: 2, label: t("Low"), icon: "🔽" },
            { level: 1, label: t("Lowest"), icon: "⏬" },
        ];
        const menu = new Menu();
        priorities.forEach((priority) => {
            menu.addItem((item) => {
                item.setTitle(`${priority.icon} ${priority.label}`);
                item.onClick(() => {
                    this.taskMetadata.priority = priority.level;
                    this.updateButtonState(this.priorityButton, true);
                    // If called from suggest, replace the ! with priority icon
                    if (cursor && this.markdownEditor) {
                        this.replaceAtCursor(cursor, priority.icon);
                    }
                });
            });
        });
        // Show menu at cursor position if provided, otherwise at button
        if (coords) {
            this.showMenuAtCoords(menu, coords.left, coords.top);
        }
        else if (this.priorityButton) {
            const rect = this.priorityButton.getBoundingClientRect();
            this.showMenuAtCoords(menu, rect.left, rect.bottom + 5);
        }
    }
    showLocationMenuAtCursor(cursorCoords, cursor) {
        this.showLocationMenu(cursor, cursorCoords);
    }
    showLocationMenu(cursor, coords) {
        const menu = new Menu();
        menu.addItem((item) => {
            item.setTitle(t("Fixed location"));
            item.setIcon("file");
            item.onClick(() => {
                this.taskMetadata.location = "fixed";
                this.taskMetadata.targetFile =
                    this.plugin.settings.quickCapture.targetFile;
                this.updateButtonState(this.locationButton, this.taskMetadata.location !==
                    (this.plugin.settings.quickCapture.targetType ||
                        "fixed"));
                // If called from suggest, replace the 📁 with file text
                if (cursor && this.markdownEditor) {
                    this.replaceAtCursor(cursor, t("Fixed location"));
                }
            });
        });
        menu.addItem((item) => {
            item.setTitle(t("Daily note"));
            item.setIcon("calendar");
            item.onClick(() => {
                var _a;
                this.taskMetadata.location = "daily-note";
                this.taskMetadata.targetFile = this.getDailyNoteFile();
                this.updateButtonState(this.locationButton, this.taskMetadata.location !==
                    (((_a = this.plugin.settings.quickCapture) === null || _a === void 0 ? void 0 : _a.targetType) ||
                        "fixed"));
                // If called from suggest, replace the 📁 with daily note text
                if (cursor && this.markdownEditor) {
                    this.replaceAtCursor(cursor, t("Daily note"));
                }
            });
        });
        // Show menu at cursor position if provided, otherwise at button
        if (coords) {
            this.showMenuAtCoords(menu, coords.left, coords.top);
        }
        else if (this.locationButton) {
            const rect = this.locationButton.getBoundingClientRect();
            this.showMenuAtCoords(menu, rect.left, rect.bottom + 5);
        }
    }
    showTagSelectorAtCursor(cursorCoords, cursor) { }
    replaceAtCursor(cursor, replacement) {
        if (!this.markdownEditor)
            return;
        // Replace the character at cursor position using CodeMirror API
        const cm = this.markdownEditor.editor.cm;
        if (cm && cm.replaceRange) {
            cm.replaceRange(replacement, { line: cursor.line, ch: cursor.ch - 1 }, cursor);
        }
    }
    getTargetFile() {
        const settings = this.plugin.settings.quickCapture;
        if (this.taskMetadata.location === "daily-note") {
            return this.getDailyNoteFile();
        }
        return settings.targetFile;
    }
    getDailyNoteFile() {
        const settings = this.plugin.settings.quickCapture.dailyNoteSettings;
        const dateStr = moment().format(settings.format);
        return settings.folder
            ? `${settings.folder}/${dateStr}.md`
            : `${dateStr}.md`;
    }
    formatDate(date) {
        return moment(date).format("YYYY-MM-DD");
    }
    processMinimalContent(content) {
        if (!content.trim())
            return "";
        const lines = content.split("\n");
        const processedLines = lines.map((line) => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith("- [")) {
                // Use clearAllMarks to completely clean the content
                const cleanedContent = clearAllMarks(trimmed);
                return `- [ ] ${cleanedContent}`;
            }
            return line;
        });
        return processedLines.join("\n");
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
    addMetadataToContent(content) {
        const metadata = [];
        // Add date metadata
        if (this.taskMetadata.dueDate) {
            metadata.push(`📅 ${this.formatDate(this.taskMetadata.dueDate)}`);
        }
        // Add priority metadata
        if (this.taskMetadata.priority) {
            const priorityIcons = ["⏬", "🔽", "🔼", "⏫", "🔺"];
            metadata.push(priorityIcons[this.taskMetadata.priority - 1]);
        }
        // Add tags
        if (this.taskMetadata.tags && this.taskMetadata.tags.length > 0) {
            metadata.push(...this.taskMetadata.tags.map((tag) => `#${tag}`));
        }
        // Add metadata to content
        if (metadata.length > 0) {
            return `${content} ${metadata.join(" ")}`;
        }
        return content;
    }
    handleSubmit() {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            const content = this.capturedContent.trim();
            if (!content) {
                new Notice(t("Nothing to capture"));
                return;
            }
            try {
                let processedContent = content;
                if (this.currentMode === "checkbox") {
                    // Task (checkbox) mode: wrap and add inline metadata
                    processedContent = this.processMinimalContent(content);
                    processedContent = this.addMetadataToContent(processedContent);
                    const captureOptions = Object.assign(Object.assign({}, this.plugin.settings.quickCapture), { targetFile: this.taskMetadata.targetFile || this.getTargetFile(), targetType: (this.taskMetadata.location || "fixed") });
                    yield saveCapture(this.app, processedContent, captureOptions);
                    new Notice(t("Captured successfully"));
                    this.close();
                    return;
                }
                // File mode: save as a new file (replace content) with frontmatter mirror logic
                const useTemplate = !!((_a = this.plugin.settings.quickCapture.createFileMode) === null || _a === void 0 ? void 0 : _a.useTemplate);
                const hasFrontmatter = processedContent.trimStart().startsWith("---");
                if (useTemplate) {
                    if (!hasFrontmatter) {
                        processedContent = `---\nstatus: ${JSON.stringify("not-started")}\n---\n\n${processedContent}`;
                    }
                }
                else {
                    if (!hasFrontmatter) {
                        const yamlLines = [];
                        yamlLines.push(`status: ${JSON.stringify("not-started")}`);
                        if (this.taskMetadata.dueDate) {
                            yamlLines.push(`dueDate: ${JSON.stringify(this.formatDate(this.taskMetadata.dueDate))}`);
                        }
                        if (this.taskMetadata.priority != null) {
                            yamlLines.push(`priority: ${JSON.stringify(String(this.taskMetadata.priority))}`);
                        }
                        const writeContentTags = !!((_b = this.plugin.settings.quickCapture.createFileMode) === null || _b === void 0 ? void 0 : _b.writeContentTagsToFrontmatter);
                        if (writeContentTags) {
                            const tags = this.extractTagsFromContentForFrontmatter(content);
                            if (tags.length > 0) {
                                yamlLines.push(`tags: [${tags.map((t) => JSON.stringify(t)).join(", ")}]`);
                            }
                        }
                        processedContent = `---\n${yamlLines.join("\n")}\n---\n\n${processedContent}`;
                    }
                }
                // Build target file path
                let targetFilePath = this.taskMetadata.customFileName;
                if (!targetFilePath || !targetFilePath.trim()) {
                    targetFilePath = this.plugin.settings.quickCapture.defaultFileNameTemplate || "{{DATE:YYYY-MM-DD}} - ";
                }
                targetFilePath = processDateTemplates(targetFilePath);
                if (!targetFilePath.endsWith(".md"))
                    targetFilePath += ".md";
                const defaultFolder = (_d = (_c = this.plugin.settings.quickCapture.createFileMode) === null || _c === void 0 ? void 0 : _c.defaultFolder) === null || _d === void 0 ? void 0 : _d.trim();
                if (defaultFolder && !targetFilePath.includes("/")) {
                    targetFilePath = this.sanitizeFilePath(`${defaultFolder}/${targetFilePath}`);
                }
                const captureOptions = Object.assign(Object.assign({}, this.plugin.settings.quickCapture), { targetFile: targetFilePath, targetType: "fixed", appendToFile: "replace" });
                yield saveCapture(this.app, processedContent, captureOptions);
                new Notice(t("Captured successfully"));
                this.close();
            }
            catch (error) {
                new Notice(`${t("Failed to save:")} ${error}`);
            }
        });
    }
    /**
     * Parse the content and update button states based on extracted metadata
     * Only update taskMetadata if actual marks exist in content, preserve manually set values
     */
    parseContentAndUpdateButtons() {
        try {
            const content = this.capturedContent.trim();
            if (!content) {
                // Update button states based on existing taskMetadata
                this.updateButtonState(this.dateButton, !!this.taskMetadata.dueDate);
                this.updateButtonState(this.priorityButton, !!this.taskMetadata.priority);
                this.updateButtonState(this.tagButton, !!(this.taskMetadata.tags &&
                    this.taskMetadata.tags.length > 0));
                this.updateButtonState(this.locationButton, !!(this.taskMetadata.location ||
                    this.taskMetadata.targetFile));
                return;
            }
            // Create a parser to extract metadata
            const parser = new ConfigurableTaskParser({
            // Use default configuration
            });
            // Extract metadata and tags
            const [cleanedContent, metadata, tags] = parser.extractMetadataAndTags(content);
            // Only update taskMetadata if we found actual marks in the content
            // This preserves manually set values from suggest system
            // Due date - only update if found in content
            if (metadata.dueDate) {
                this.taskMetadata.dueDate = new Date(metadata.dueDate);
            }
            // Don't delete existing dueDate if not found in content
            // Priority - only update if found in content
            if (metadata.priority) {
                const priorityMap = {
                    highest: 5,
                    high: 4,
                    medium: 3,
                    low: 2,
                    lowest: 1,
                };
                this.taskMetadata.priority =
                    priorityMap[metadata.priority] || 3;
            }
            // Don't delete existing priority if not found in content
            // Tags - only add new tags, don't replace existing ones
            if (tags && tags.length > 0) {
                if (!this.taskMetadata.tags) {
                    this.taskMetadata.tags = [];
                }
                // Merge new tags with existing ones, avoid duplicates
                tags.forEach((tag) => {
                    if (!this.taskMetadata.tags.includes(tag)) {
                        this.taskMetadata.tags.push(tag);
                    }
                });
            }
            // Update button states based on current taskMetadata
            this.updateButtonState(this.dateButton, !!this.taskMetadata.dueDate);
            this.updateButtonState(this.priorityButton, !!this.taskMetadata.priority);
            this.updateButtonState(this.tagButton, !!(this.taskMetadata.tags && this.taskMetadata.tags.length > 0));
            this.updateButtonState(this.locationButton, !!(this.taskMetadata.location ||
                this.taskMetadata.targetFile ||
                metadata.project ||
                metadata.location));
        }
        catch (error) {
            console.error("Error parsing content:", error);
            // On error, still update button states based on existing taskMetadata
            this.updateButtonState(this.dateButton, !!this.taskMetadata.dueDate);
            this.updateButtonState(this.priorityButton, !!this.taskMetadata.priority);
            this.updateButtonState(this.tagButton, !!(this.taskMetadata.tags && this.taskMetadata.tags.length > 0));
            this.updateButtonState(this.locationButton, !!(this.taskMetadata.location || this.taskMetadata.targetFile));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWluaW1hbFF1aWNrQ2FwdHVyZU1vZGFsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiTWluaW1hbFF1aWNrQ2FwdHVyZU1vZGFsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBRU4sS0FBSyxFQUNMLE1BQU0sRUFFTixNQUFNLEVBRU4sSUFBSSxFQUNKLE9BQU8sR0FDUCxNQUFNLFVBQVUsQ0FBQztBQUNsQixPQUFPLEVBQ04sOEJBQThCLEdBRTlCLE1BQU0sMENBQTBDLENBQUM7QUFFbEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ2pGLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUUxQyxPQUFPLEVBQ04sY0FBYyxHQUVkLE1BQU0seUJBQXlCLENBQUM7QUFDakMsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDaEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUU1RCxNQUFNLGtCQUFrQixHQUFHLHNDQUFzQyxDQUFDO0FBY2xFLE1BQU0sT0FBTyx3QkFBeUIsU0FBUSxLQUFLO0lBdUJsRCxZQUFZLEdBQVEsRUFBRSxNQUE2QjtRQUNsRCxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUF0QlosbUJBQWMsR0FBb0MsSUFBSSxDQUFDO1FBQ3ZELG9CQUFlLEdBQVcsRUFBRSxDQUFDO1FBQzdCLGlCQUFZLEdBQWlCLEVBQUUsQ0FBQztRQUVoQyw2QkFBNkI7UUFDckIsZ0JBQVcsR0FBd0IsVUFBVSxDQUFDO1FBRXRELGNBQWM7UUFDTixlQUFVLEdBQTZCLElBQUksQ0FBQztRQUM1QyxtQkFBYyxHQUE2QixJQUFJLENBQUM7UUFDaEQsbUJBQWMsR0FBNkIsSUFBSSxDQUFDO1FBQ2hELGNBQVMsR0FBNkIsSUFBSSxDQUFD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QUFzRTtZQUN0RSxJQUFJLENBQUMsaUJBQWlCLENBQ3JCLElBQUksQ0FBQyxVQUFXLEVBQ2hCLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FDM0IsQ0FBQztZQUNGLElBQUksQ0FBQyxpQkFBaUIsQ0FDckIsSUFBSSxDQUFDLGNBQWUsRUFDcEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUM1QixDQUFDO1lBQ0YsSUFBSSxDQUFDLGlCQUFpQixDQUNyQixJQUFJLENBQUMsU0FBVSxFQUNmLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FDL0QsQ0FBQztZQUNGLElBQUksQ0FBQyxpQkFBaUIsQ0FDckIsSUFBSSxDQUFDLGNBQWUsRUFDcEIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FDOUQsQ0FBQztTQUNGO0lBQ0YsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcclxuXHRBcHAsXHJcblx0TW9kYWwsXHJcblx0Tm90aWNlLFxyXG5cdFRGaWxlLFxyXG5cdG1vbWVudCxcclxuXHRFZGl0b3JQb3NpdGlvbixcclxuXHRNZW51LFxyXG5cdHNldEljb24sXHJcbn0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7XHJcblx0Y3JlYXRlRW1iZWRkYWJsZU1hcmtkb3duRWRpdG9yLFxyXG5cdEVtYmVkZGFibGVNYXJrZG93bkVkaXRvcixcclxufSBmcm9tIFwiQC9lZGl0b3ItZXh0ZW5zaW9ucy9jb3JlL21hcmtkb3duLWVkaXRvclwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7IHNhdmVDYXB0dXJlLCBwcm9jZXNzRGF0ZVRlbXBsYXRlcyB9IGZyb20gXCJAL3V0aWxzL2ZpbGUvZmlsZS1vcGVyYXRpb25zXCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCB7IE1pbmltYWxRdWlja0NhcHR1cmVTdWdnZXN0IH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy9xdWljay1jYXB0dXJlL3N1Z2dlc3QvTWluaW1hbFF1aWNrQ2FwdHVyZVN1Z2dlc3RcIjtcclxuaW1wb3J0IHtcclxuXHRTdWdnZXN0TWFuYWdlcixcclxuXHRVbml2ZXJzYWxFZGl0b3JTdWdnZXN0LFxyXG59IGZyb20gXCJAL2NvbXBvbmVudHMvdWkvc3VnZ2VzdFwiO1xyXG5pbXBvcnQgeyBDb25maWd1cmFibGVUYXNrUGFyc2VyIH0gZnJvbSBcIkAvZGF0YWZsb3cvY29yZS9Db25maWd1cmFibGVUYXNrUGFyc2VyXCI7XHJcbmltcG9ydCB7IGNsZWFyQWxsTWFya3MgfSBmcm9tIFwiQC9jb21wb25lbnRzL3VpL3JlbmRlcmVycy9NYXJrZG93blJlbmRlcmVyXCI7XHJcbmltcG9ydCB7IEZpbGVOYW1lSW5wdXQgfSBmcm9tIFwiLi4vY29tcG9uZW50cy9GaWxlTmFtZUlucHV0XCI7XHJcblxyXG5jb25zdCBMQVNUX1VTRURfTU9ERV9LRVkgPSBcInRhc2stZ2VuaXVzLmxhc3RVc2VkUXVpY2tDYXB0dXJlTW9kZVwiO1xyXG5cclxuaW50ZXJmYWNlIFRhc2tNZXRhZGF0YSB7XHJcblx0c3RhcnREYXRlPzogRGF0ZTtcclxuXHRkdWVEYXRlPzogRGF0ZTtcclxuXHRzY2hlZHVsZWREYXRlPzogRGF0ZTtcclxuXHRwcmlvcml0eT86IG51bWJlcjtcclxuXHRwcm9qZWN0Pzogc3RyaW5nO1xyXG5cdGNvbnRleHQ/OiBzdHJpbmc7XHJcblx0dGFncz86IHN0cmluZ1tdO1xyXG5cdGxvY2F0aW9uPzogXCJmaXhlZFwiIHwgXCJkYWlseS1ub3RlXCIgfCBcImN1c3RvbS1maWxlXCI7XHJcblx0dGFyZ2V0RmlsZT86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1pbmltYWxRdWlja0NhcHR1cmVNb2RhbCBleHRlbmRzIE1vZGFsIHtcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbjtcclxuXHRtYXJrZG93bkVkaXRvcjogRW1iZWRkYWJsZU1hcmtkb3duRWRpdG9yIHwgbnVsbCA9IG51bGw7XHJcblx0Y2FwdHVyZWRDb250ZW50OiBzdHJpbmcgPSBcIlwiO1xyXG5cdHRhc2tNZXRhZGF0YTogVGFza01ldGFkYXRhID0ge307XHJcblxyXG5cdC8vIE1vZGU6ICdjaGVja2JveCcgb3IgJ2ZpbGUnXHJcblx0cHJpdmF0ZSBjdXJyZW50TW9kZTogXCJjaGVja2JveFwiIHwgXCJmaWxlXCIgPSBcImNoZWNrYm94XCI7XHJcblxyXG5cdC8vIFVJIEVsZW1lbnRzXHJcblx0cHJpdmF0ZSBkYXRlQnV0dG9uOiBIVE1MQnV0dG9uRWxlbWVudCB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgcHJpb3JpdHlCdXR0b246IEhUTUxCdXR0b25FbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBsb2NhdGlvbkJ1dHRvbjogSFRNTEJ1dHRvbkVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIHRhZ0J1dHRvbjogSFRNTEJ1dHRvbkVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIG1vZGVUYWJzQ29udGFpbmVyOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgZmlsZU5hbWVTZWN0aW9uOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgZmlsZU5hbWVJbnB1dDogRmlsZU5hbWVJbnB1dCB8IG51bGwgPSBudWxsO1xyXG5cclxuXHQvLyBTdWdnZXN0IGluc3RhbmNlc1xyXG5cdHByaXZhdGUgbWluaW1hbFN1Z2dlc3Q6IE1pbmltYWxRdWlja0NhcHR1cmVTdWdnZXN0O1xyXG5cdHByaXZhdGUgc3VnZ2VzdE1hbmFnZXI6IFN1Z2dlc3RNYW5hZ2VyO1xyXG5cdHByaXZhdGUgdW5pdmVyc2FsU3VnZ2VzdDogVW5pdmVyc2FsRWRpdG9yU3VnZ2VzdCB8IG51bGwgPSBudWxsO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4pIHtcclxuXHRcdHN1cGVyKGFwcCk7XHJcblx0XHR0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuXHRcdHRoaXMubWluaW1hbFN1Z2dlc3QgPSBwbHVnaW4ubWluaW1hbFF1aWNrQ2FwdHVyZVN1Z2dlc3Q7XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBzdWdnZXN0IG1hbmFnZXJcclxuXHRcdHRoaXMuc3VnZ2VzdE1hbmFnZXIgPSBuZXcgU3VnZ2VzdE1hbmFnZXIoYXBwLCBwbHVnaW4pO1xyXG5cclxuXHRcdC8vIExvYWQgbGFzdCB1c2VkIG1vZGUgZnJvbSBsb2NhbCBzdG9yYWdlXHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBzdG9yZWQgPSB0aGlzLmFwcC5sb2FkTG9jYWxTdG9yYWdlKExBU1RfVVNFRF9NT0RFX0tFWSkgYXMgc3RyaW5nIHwgbnVsbDtcclxuXHRcdFx0aWYgKHN0b3JlZCA9PT0gXCJjaGVja2JveFwiIHx8IHN0b3JlZCA9PT0gXCJmaWxlXCIpIHRoaXMuY3VycmVudE1vZGUgPSBzdG9yZWQ7XHJcblx0XHR9IGNhdGNoIHt9XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBkZWZhdWx0IG1ldGFkYXRhIHdpdGggZmFsbGJhY2tcclxuXHRcdGNvbnN0IG1pbmltYWxTZXR0aW5ncyA9XHJcblx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZS5taW5pbWFsTW9kZVNldHRpbmdzO1xyXG5cdFx0dGhpcy50YXNrTWV0YWRhdGEubG9jYXRpb24gPVxyXG5cdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUudGFyZ2V0VHlwZSB8fCBcImZpeGVkXCI7XHJcblx0XHR0aGlzLnRhc2tNZXRhZGF0YS50YXJnZXRGaWxlID0gdGhpcy5nZXRUYXJnZXRGaWxlKCk7XHJcblx0fVxyXG5cclxuXHRvbk9wZW4oKSB7XHJcblx0XHRjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcclxuXHRcdHRoaXMubW9kYWxFbC5hZGRDbGFzcyhcInF1aWNrLWNhcHR1cmUtbW9kYWxcIik7XHJcblx0XHR0aGlzLm1vZGFsRWwuYWRkQ2xhc3MoXCJtaW5pbWFsXCIpO1xyXG5cclxuXHRcdC8vIFN0b3JlIG1vZGFsIGluc3RhbmNlIHJlZmVyZW5jZSBmb3Igc3VnZ2VzdCBzeXN0ZW1cclxuXHRcdCh0aGlzLm1vZGFsRWwgYXMgYW55KS5fX21pbmltYWxRdWlja0NhcHR1cmVNb2RhbCA9IHRoaXM7XHJcblxyXG5cdFx0Ly8gU3RhcnQgbWFuYWdpbmcgc3VnZ2VzdHMgd2l0aCBoaWdoIHByaW9yaXR5XHJcblx0XHR0aGlzLnN1Z2dlc3RNYW5hZ2VyLnN0YXJ0TWFuYWdpbmcoKTtcclxuXHJcblx0XHQvLyBTZXQgdXAgdGhlIHN1Z2dlc3Qgc3lzdGVtXHJcblx0XHRpZiAodGhpcy5taW5pbWFsU3VnZ2VzdCkge1xyXG5cdFx0XHR0aGlzLm1pbmltYWxTdWdnZXN0LnNldE1pbmltYWxNb2RlKHRydWUpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENyZWF0ZSB0aGUgaW50ZXJmYWNlXHJcblx0XHR0aGlzLmNyZWF0ZU1pbmltYWxJbnRlcmZhY2UoY29udGVudEVsKTtcclxuXHJcblx0XHQvLyBFbmFibGUgdW5pdmVyc2FsIHN1Z2dlc3QgZm9yIG1pbmltYWwgbW9kYWwgYWZ0ZXIgZWRpdG9yIGlzIGNyZWF0ZWRcclxuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRpZiAodGhpcy5tYXJrZG93bkVkaXRvcj8uZWRpdG9yPy5lZGl0b3IpIHtcclxuXHRcdFx0XHR0aGlzLnVuaXZlcnNhbFN1Z2dlc3QgPVxyXG5cdFx0XHRcdFx0dGhpcy5zdWdnZXN0TWFuYWdlci5lbmFibGVGb3JNaW5pbWFsTW9kYWwoXHJcblx0XHRcdFx0XHRcdHRoaXMubWFya2Rvd25FZGl0b3IuZWRpdG9yLmVkaXRvclxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR0aGlzLnVuaXZlcnNhbFN1Z2dlc3QuZW5hYmxlKCk7XHJcblx0XHRcdH1cclxuXHRcdH0sIDEwMCk7XHJcblx0fVxyXG5cclxuXHRvbkNsb3NlKCkge1xyXG5cdFx0Ly8gQ2xlYW4gdXAgdW5pdmVyc2FsIHN1Z2dlc3RcclxuXHRcdGlmICh0aGlzLnVuaXZlcnNhbFN1Z2dlc3QpIHtcclxuXHRcdFx0dGhpcy51bml2ZXJzYWxTdWdnZXN0LmRpc2FibGUoKTtcclxuXHRcdFx0dGhpcy51bml2ZXJzYWxTdWdnZXN0ID0gbnVsbDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTdG9wIG1hbmFnaW5nIHN1Z2dlc3RzIGFuZCByZXN0b3JlIG9yaWdpbmFsIG9yZGVyXHJcblx0XHR0aGlzLnN1Z2dlc3RNYW5hZ2VyLnN0b3BNYW5hZ2luZygpO1xyXG5cclxuXHRcdC8vIENsZWFuIHVwIHN1Z2dlc3RcclxuXHRcdGlmICh0aGlzLm1pbmltYWxTdWdnZXN0KSB7XHJcblx0XHRcdHRoaXMubWluaW1hbFN1Z2dlc3Quc2V0TWluaW1hbE1vZGUoZmFsc2UpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENsZWFuIHVwIGVkaXRvclxyXG5cdFx0aWYgKHRoaXMubWFya2Rvd25FZGl0b3IpIHtcclxuXHRcdFx0dGhpcy5tYXJrZG93bkVkaXRvci5kZXN0cm95KCk7XHJcblx0XHRcdHRoaXMubWFya2Rvd25FZGl0b3IgPSBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENsZWFuIHVwIG1vZGFsIHJlZmVyZW5jZVxyXG5cdFx0ZGVsZXRlICh0aGlzLm1vZGFsRWwgYXMgYW55KS5fX21pbmltYWxRdWlja0NhcHR1cmVNb2RhbDtcclxuXHJcblx0XHQvLyBDbGVhciBjb250ZW50XHJcblx0XHR0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVNaW5pbWFsSW50ZXJmYWNlKGNvbnRlbnRFbDogSFRNTEVsZW1lbnQpIHtcclxuXHRcdC8vIFRpdGxlXHJcblx0XHR0aGlzLnRpdGxlRWwuc2V0VGV4dCh0KFwiTWluaW1hbCBRdWljayBDYXB0dXJlXCIpKTtcclxuXHJcblx0XHQvLyBNb2RlIHRhYnMgKGNoZWNrYm94IHwgZmlsZSlcclxuXHRcdHRoaXMubW9kZVRhYnNDb250YWluZXIgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInF1aWNrLWNhcHR1cmUtbWluaW1hbC10YWJzXCIgfSk7XHJcblx0XHRjb25zdCB0YWJDaGVja2JveCA9IHRoaXMubW9kZVRhYnNDb250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiB0KFwiVGFza1wiKSwgY2xzOiBcInRhYi1idG5cIiB9KTtcclxuXHRcdGNvbnN0IHRhYkZpbGUgPSB0aGlzLm1vZGVUYWJzQ29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogdChcIkZpbGVcIiksIGNsczogXCJ0YWItYnRuXCIgfSk7XHJcblx0XHRjb25zdCByZWZyZXNoVGFicyA9ICgpID0+IHtcclxuXHRcdFx0aWYgKHRoaXMuY3VycmVudE1vZGUgPT09IFwiY2hlY2tib3hcIikge1xyXG5cdFx0XHRcdHRhYkNoZWNrYm94LmFkZENsYXNzKFwiYWN0aXZlXCIpO1xyXG5cdFx0XHRcdHRhYkZpbGUucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIik7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGFiRmlsZS5hZGRDbGFzcyhcImFjdGl2ZVwiKTtcclxuXHRcdFx0XHR0YWJDaGVja2JveC5yZW1vdmVDbGFzcyhcImFjdGl2ZVwiKTtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGlzLnVwZGF0ZU1vZGVVSSgpO1xyXG5cdFx0fTtcclxuXHRcdHRhYkNoZWNrYm94LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdHRoaXMuY3VycmVudE1vZGUgPSBcImNoZWNrYm94XCI7XHJcblx0XHRcdHRyeSB7IHRoaXMuYXBwLnNhdmVMb2NhbFN0b3JhZ2UoTEFTVF9VU0VEX01PREVfS0VZLCBcImNoZWNrYm94XCIpOyB9IGNhdGNoIHt9XHJcblx0XHRcdHJlZnJlc2hUYWJzKCk7XHJcblx0XHR9KTtcclxuXHRcdHRhYkZpbGUuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0dGhpcy5jdXJyZW50TW9kZSA9IFwiZmlsZVwiO1xyXG5cdFx0XHR0cnkgeyB0aGlzLmFwcC5zYXZlTG9jYWxTdG9yYWdlKExBU1RfVVNFRF9NT0RFX0tFWSwgXCJmaWxlXCIpOyB9IGNhdGNoIHt9XHJcblx0XHRcdHJlZnJlc2hUYWJzKCk7XHJcblx0XHR9KTtcclxuXHRcdHJlZnJlc2hUYWJzKCk7XHJcblxyXG5cdFx0Ly8gT3B0aW9uYWwgZmlsZSBuYW1lIHNlY3Rpb24gKG9ubHkgZm9yIGZpbGUgbW9kZSlcclxuXHRcdHRoaXMuZmlsZU5hbWVTZWN0aW9uID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJxdWljay1jYXB0dXJlLW1pbmltYWwtZmlsZW5hbWVcIiB9KTtcclxuXHJcblx0XHQvLyBFZGl0b3IgY29udGFpbmVyXHJcblx0XHRjb25zdCBlZGl0b3JDb250YWluZXIgPSBjb250ZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInF1aWNrLWNhcHR1cmUtbWluaW1hbC1lZGl0b3ItY29udGFpbmVyXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLnNldHVwTWFya2Rvd25FZGl0b3IoZWRpdG9yQ29udGFpbmVyKTtcclxuXHJcblx0XHQvLyBCb3R0b20gYnV0dG9ucyBjb250YWluZXJcclxuXHRcdGNvbnN0IGJ1dHRvbnNDb250YWluZXIgPSBjb250ZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInF1aWNrLWNhcHR1cmUtbWluaW1hbC1idXR0b25zXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLmNyZWF0ZVF1aWNrQWN0aW9uQnV0dG9ucyhidXR0b25zQ29udGFpbmVyKTtcclxuXHRcdHRoaXMuY3JlYXRlTWFpbkJ1dHRvbnMoYnV0dG9uc0NvbnRhaW5lcik7XHJcblx0fVxyXG5cclxuXHJcblx0XHRwcml2YXRlIHVwZGF0ZU1vZGVVSSgpIHtcclxuXHRcdFx0aWYgKCF0aGlzLmZpbGVOYW1lU2VjdGlvbikgcmV0dXJuO1xyXG5cdFx0XHR0aGlzLmZpbGVOYW1lU2VjdGlvbi5lbXB0eSgpO1xyXG5cdFx0XHRpZiAodGhpcy5jdXJyZW50TW9kZSA9PT0gXCJmaWxlXCIpIHtcclxuXHRcdFx0XHR0aGlzLmZpbGVOYW1lU2VjdGlvbi5jcmVhdGVEaXYoeyB0ZXh0OiB0KFwiQ2FwdHVyZSBhczpcIiksIGNsczogXCJxdWljay1jYXB0dXJlLXNlY3Rpb24tdGl0bGVcIiB9KTtcclxuXHRcdFx0XHRpZiAodGhpcy5maWxlTmFtZUlucHV0KSB7XHJcblx0XHRcdFx0XHR0aGlzLmZpbGVOYW1lSW5wdXQuZGVzdHJveSgpO1xyXG5cdFx0XHRcdFx0dGhpcy5maWxlTmFtZUlucHV0ID0gbnVsbDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0dGhpcy5maWxlTmFtZUlucHV0ID0gbmV3IEZpbGVOYW1lSW5wdXQodGhpcy5hcHAsIHRoaXMuZmlsZU5hbWVTZWN0aW9uLCB7XHJcblx0XHRcdFx0XHRwbGFjZWhvbGRlcjogdChcIkVudGVyIGZpbGUgbmFtZS4uLlwiKSxcclxuXHRcdFx0XHRcdGRlZmF1bHRWYWx1ZTpcclxuXHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLmRlZmF1bHRGaWxlTmFtZVRlbXBsYXRlIHx8XHJcblx0XHRcdFx0XHRcdFwie3tEQVRFOllZWVktTU0tRER9fSAtIFwiLFxyXG5cdFx0XHRcdFx0Y3VycmVudEZvbGRlcjpcclxuXHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLmNyZWF0ZUZpbGVNb2RlPy5kZWZhdWx0Rm9sZGVyLFxyXG5cdFx0XHRcdFx0b25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS50YXJnZXRGaWxlID0gdW5kZWZpbmVkOyAvLyBub3QgdXNlZCBpbiBmaWxlIG1vZGVcclxuXHRcdFx0XHRcdFx0KHRoaXMudGFza01ldGFkYXRhIGFzIGFueSkuY3VzdG9tRmlsZU5hbWUgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0aWYgKHRoaXMuZmlsZU5hbWVJbnB1dCkge1xyXG5cdFx0XHRcdFx0dGhpcy5maWxlTmFtZUlucHV0LmRlc3Ryb3koKTtcclxuXHRcdFx0XHRcdHRoaXMuZmlsZU5hbWVJbnB1dCA9IG51bGw7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0LyoqIEV4dHJhY3QgI3RhZ3MgZnJvbSBjb250ZW50IGZvciBmcm9udG1hdHRlciAqL1xyXG5cdFx0cHJpdmF0ZSBleHRyYWN0VGFnc0Zyb21Db250ZW50Rm9yRnJvbnRtYXR0ZXIoY29udGVudDogc3RyaW5nKTogc3RyaW5nW10ge1xyXG5cdFx0XHRpZiAoIWNvbnRlbnQpIHJldHVybiBbXTtcclxuXHRcdFx0Y29uc3QgdGFnUmVnZXggPSAvKF58XFxzKSMoW0EtWmEtejAtOV9cXC8tXSspL2c7XHJcblx0XHRcdGNvbnN0IHJlc3VsdHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuXHRcdFx0bGV0IG1hdGNoOiBSZWdFeHBFeGVjQXJyYXkgfCBudWxsO1xyXG5cdFx0XHR3aGlsZSAoKG1hdGNoID0gdGFnUmVnZXguZXhlYyhjb250ZW50KSkgIT09IG51bGwpIHtcclxuXHRcdFx0XHRjb25zdCB0YWcgPSBtYXRjaFsyXTtcclxuXHRcdFx0XHRpZiAodGFnKSByZXN1bHRzLmFkZCh0YWcpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBBcnJheS5mcm9tKHJlc3VsdHMpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHByaXZhdGUgc2FuaXRpemVGaWxlbmFtZShmaWxlbmFtZTogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdFx0cmV0dXJuIGZpbGVuYW1lLnJlcGxhY2UoL1s8PjpcInwqP1xcXFxdL2csIFwiLVwiKS5yZXBsYWNlKC9cXHMrL2csIFwiIFwiKS50cmltKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cHJpdmF0ZSBzYW5pdGl6ZUZpbGVQYXRoKGZpbGVQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0XHRjb25zdCBwYXJ0cyA9IGZpbGVQYXRoLnNwbGl0KFwiL1wiKTtcclxuXHRcdFx0Y29uc3Qgc2FuaXRpemVkID0gcGFydHMubWFwKChwYXJ0LCBpZHgpID0+XHJcblx0XHRcdFx0aWR4ID09PSBwYXJ0cy5sZW5ndGggLSAxID8gdGhpcy5zYW5pdGl6ZUZpbGVuYW1lKHBhcnQpIDogcGFydC5yZXBsYWNlKC9bPD46XCJ8Kj9cXFxcXS9nLCBcIi1cIikucmVwbGFjZSgvXFxzKy9nLCBcIiBcIikudHJpbSgpXHJcblx0XHRcdCk7XHJcblx0XHRcdHJldHVybiBzYW5pdGl6ZWQuam9pbihcIi9cIik7XHJcblx0XHR9XHJcblxyXG5cdHByaXZhdGUgc2V0dXBNYXJrZG93bkVkaXRvcihjb250YWluZXI6IEhUTUxFbGVtZW50KSB7XHJcblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0dGhpcy5tYXJrZG93bkVkaXRvciA9IGNyZWF0ZUVtYmVkZGFibGVNYXJrZG93bkVkaXRvcihcclxuXHRcdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0XHRjb250YWluZXIsXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0cGxhY2Vob2xkZXI6IHRoaXMuY3VycmVudE1vZGUgPT09IFwiZmlsZVwiID8gdChcIkVudGVyIGZpbGUgY29udGVudC4uLlwiKSA6IHQoXCJFbnRlciB5b3VyIHRhc2suLi5cIiksXHJcblx0XHRcdFx0XHRzaW5nbGVMaW5lOiB0cnVlLCAvLyBTaW5nbGUgbGluZSBtb2RlXHJcblxyXG5cdFx0XHRcdFx0b25FbnRlcjogKGVkaXRvciwgbW9kLCBzaGlmdCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRpZiAobW9kKSB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gU3VibWl0IG9uIENtZC9DdHJsK0VudGVyXHJcblx0XHRcdFx0XHRcdFx0dGhpcy5oYW5kbGVTdWJtaXQoKTtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHQvLyBJbiBtaW5pbWFsIG1vZGUsIEVudGVyIHNob3VsZCBhbHNvIHN1Ym1pdFxyXG5cdFx0XHRcdFx0XHR0aGlzLmhhbmRsZVN1Ym1pdCgpO1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHRcdH0sXHJcblxyXG5cdFx0XHRcdFx0b25Fc2NhcGU6IChlZGl0b3IpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0XHRcdFx0fSxcclxuXHJcblx0XHRcdFx0XHRvbkNoYW5nZTogKHVwZGF0ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLmNhcHR1cmVkQ29udGVudCA9IHRoaXMubWFya2Rvd25FZGl0b3I/LnZhbHVlIHx8IFwiXCI7XHJcblx0XHRcdFx0XHRcdC8vIFBhcnNlIGNvbnRlbnQgYW5kIHVwZGF0ZSBidXR0b24gc3RhdGVzXHJcblx0XHRcdFx0XHRcdHRoaXMucGFyc2VDb250ZW50QW5kVXBkYXRlQnV0dG9ucygpO1xyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9XHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBGb2N1cyB0aGUgZWRpdG9yXHJcblx0XHRcdHRoaXMubWFya2Rvd25FZGl0b3I/LmVkaXRvcj8uZm9jdXMoKTtcclxuXHRcdH0sIDUwKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY3JlYXRlUXVpY2tBY3Rpb25CdXR0b25zKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpIHtcclxuXHRcdGNvbnN0IHNldHRpbmdzID1cclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLm1pbmltYWxNb2RlU2V0dGluZ3MgfHwge307XHJcblx0XHRjb25zdCBsZWZ0Q29udGFpbmVyID0gY29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJxdWljay1hY3Rpb25zLWxlZnRcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuZGF0ZUJ1dHRvbiA9IGxlZnRDb250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHRjbHM6IFtcInF1aWNrLWFjdGlvbi1idXR0b25cIiwgXCJjbGlja2FibGUtaWNvblwiXSxcclxuXHRcdFx0YXR0cjogeyBcImFyaWEtbGFiZWxcIjogdChcIlNldCBkYXRlXCIpIH0sXHJcblx0XHR9KTtcclxuXHRcdHNldEljb24odGhpcy5kYXRlQnV0dG9uLCBcImNhbGVuZGFyXCIpO1xyXG5cdFx0dGhpcy5kYXRlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnNob3dEYXRlUGlja2VyKCkpO1xyXG5cdFx0dGhpcy51cGRhdGVCdXR0b25TdGF0ZSh0aGlzLmRhdGVCdXR0b24sICEhdGhpcy50YXNrTWV0YWRhdGEuZHVlRGF0ZSk7XHJcblxyXG5cdFx0dGhpcy5wcmlvcml0eUJ1dHRvbiA9IGxlZnRDb250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHRjbHM6IFtcInF1aWNrLWFjdGlvbi1idXR0b25cIiwgXCJjbGlja2FibGUtaWNvblwiXSxcclxuXHRcdFx0YXR0cjogeyBcImFyaWEtbGFiZWxcIjogdChcIlNldCBwcmlvcml0eVwiKSB9LFxyXG5cdFx0fSk7XHJcblx0XHRzZXRJY29uKHRoaXMucHJpb3JpdHlCdXR0b24sIFwiemFwXCIpO1xyXG5cdFx0dGhpcy5wcmlvcml0eUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT5cclxuXHRcdFx0dGhpcy5zaG93UHJpb3JpdHlNZW51KClcclxuXHRcdCk7XHJcblx0XHR0aGlzLnVwZGF0ZUJ1dHRvblN0YXRlKFxyXG5cdFx0XHR0aGlzLnByaW9yaXR5QnV0dG9uLFxyXG5cdFx0XHQhIXRoaXMudGFza01ldGFkYXRhLnByaW9yaXR5XHJcblx0XHQpO1xyXG5cclxuXHRcdHRoaXMubG9jYXRpb25CdXR0b24gPSBsZWZ0Q29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0Y2xzOiBbXCJxdWljay1hY3Rpb24tYnV0dG9uXCIsIFwiY2xpY2thYmxlLWljb25cIl0sXHJcblx0XHRcdGF0dHI6IHsgXCJhcmlhLWxhYmVsXCI6IHQoXCJTZXQgbG9jYXRpb25cIikgfSxcclxuXHRcdH0pO1xyXG5cdFx0c2V0SWNvbih0aGlzLmxvY2F0aW9uQnV0dG9uLCBcImZvbGRlclwiKTtcclxuXHRcdHRoaXMubG9jYXRpb25CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+XHJcblx0XHRcdHRoaXMuc2hvd0xvY2F0aW9uTWVudSgpXHJcblx0XHQpO1xyXG5cdFx0dGhpcy51cGRhdGVCdXR0b25TdGF0ZShcclxuXHRcdFx0dGhpcy5sb2NhdGlvbkJ1dHRvbixcclxuXHRcdFx0dGhpcy50YXNrTWV0YWRhdGEubG9jYXRpb24gIT09XHJcblx0XHRcdFx0KHRoaXMucGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZS50YXJnZXRUeXBlIHx8IFwiZml4ZWRcIilcclxuXHRcdCk7XHJcblxyXG5cdFx0dGhpcy50YWdCdXR0b24gPSBsZWZ0Q29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0Y2xzOiBbXCJxdWljay1hY3Rpb24tYnV0dG9uXCIsIFwiY2xpY2thYmxlLWljb25cIl0sXHJcblx0XHRcdGF0dHI6IHsgXCJhcmlhLWxhYmVsXCI6IHQoXCJBZGQgdGFnc1wiKSB9LFxyXG5cdFx0fSk7XHJcblx0XHRzZXRJY29uKHRoaXMudGFnQnV0dG9uLCBcInRhZ1wiKTtcclxuXHRcdHRoaXMudGFnQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7fSk7XHJcblx0XHR0aGlzLnVwZGF0ZUJ1dHRvblN0YXRlKFxyXG5cdFx0XHR0aGlzLnRhZ0J1dHRvbixcclxuXHRcdFx0ISEodGhpcy50YXNrTWV0YWRhdGEudGFncyAmJiB0aGlzLnRhc2tNZXRhZGF0YS50YWdzLmxlbmd0aCA+IDApXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVNYWluQnV0dG9ucyhjb250YWluZXI6IEhUTUxFbGVtZW50KSB7XHJcblx0XHRjb25zdCByaWdodENvbnRhaW5lciA9IGNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwicXVpY2stYWN0aW9ucy1yaWdodFwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gU2F2ZSBidXR0b25cclxuXHRcdGNvbnN0IHNhdmVCdXR0b24gPSByaWdodENvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXCJTYXZlXCIpLFxyXG5cdFx0XHRjbHM6IFwibW9kLWN0YSBxdWljay1hY3Rpb24tc2F2ZVwiLFxyXG5cdFx0fSk7XHJcblx0XHRzYXZlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmhhbmRsZVN1Ym1pdCgpKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgdXBkYXRlQnV0dG9uU3RhdGUoYnV0dG9uOiBIVE1MQnV0dG9uRWxlbWVudCwgaXNBY3RpdmU6IGJvb2xlYW4pIHtcclxuXHRcdGlmIChpc0FjdGl2ZSkge1xyXG5cdFx0XHRidXR0b24uYWRkQ2xhc3MoXCJhY3RpdmVcIik7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRidXR0b24ucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTaG93IG1lbnUgYXQgc3BlY2lmaWVkIGNvb3JkaW5hdGVzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBzaG93TWVudUF0Q29vcmRzKG1lbnU6IE1lbnUsIHg6IG51bWJlciwgeTogbnVtYmVyKTogdm9pZCB7XHJcblx0XHRtZW51LnNob3dBdE1vdXNlRXZlbnQoXHJcblx0XHRcdG5ldyBNb3VzZUV2ZW50KFwiY2xpY2tcIiwge1xyXG5cdFx0XHRcdGNsaWVudFg6IHgsXHJcblx0XHRcdFx0Y2xpZW50WTogeSxcclxuXHRcdFx0fSlcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvLyBNZXRob2RzIGNhbGxlZCBieSBNaW5pbWFsUXVpY2tDYXB0dXJlU3VnZ2VzdFxyXG5cdHB1YmxpYyBzaG93RGF0ZVBpY2tlckF0Q3Vyc29yKGN1cnNvckNvb3JkczogYW55LCBjdXJzb3I6IEVkaXRvclBvc2l0aW9uKSB7XHJcblx0XHR0aGlzLnNob3dEYXRlUGlja2VyKGN1cnNvciwgY3Vyc29yQ29vcmRzKTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzaG93RGF0ZVBpY2tlcihjdXJzb3I/OiBFZGl0b3JQb3NpdGlvbiwgY29vcmRzPzogYW55KSB7XHJcblx0XHRjb25zdCBxdWlja0RhdGVzID0gW1xyXG5cdFx0XHR7IGxhYmVsOiB0KFwiVG9tb3Jyb3dcIiksIGRhdGU6IG1vbWVudCgpLmFkZCgxLCBcImRheVwiKS50b0RhdGUoKSB9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0bGFiZWw6IHQoXCJEYXkgYWZ0ZXIgdG9tb3Jyb3dcIiksXHJcblx0XHRcdFx0ZGF0ZTogbW9tZW50KCkuYWRkKDIsIFwiZGF5XCIpLnRvRGF0ZSgpLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7IGxhYmVsOiB0KFwiTmV4dCB3ZWVrXCIpLCBkYXRlOiBtb21lbnQoKS5hZGQoMSwgXCJ3ZWVrXCIpLnRvRGF0ZSgpIH0sXHJcblx0XHRcdHsgbGFiZWw6IHQoXCJOZXh0IG1vbnRoXCIpLCBkYXRlOiBtb21lbnQoKS5hZGQoMSwgXCJtb250aFwiKS50b0RhdGUoKSB9LFxyXG5cdFx0XTtcclxuXHJcblx0XHRjb25zdCBtZW51ID0gbmV3IE1lbnUoKTtcclxuXHJcblx0XHRxdWlja0RhdGVzLmZvckVhY2goKHF1aWNrRGF0ZSkgPT4ge1xyXG5cdFx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRpdGVtLnNldFRpdGxlKHF1aWNrRGF0ZS5sYWJlbCk7XHJcblx0XHRcdFx0aXRlbS5zZXRJY29uKFwiY2FsZW5kYXJcIik7XHJcblx0XHRcdFx0aXRlbS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMudGFza01ldGFkYXRhLmR1ZURhdGUgPSBxdWlja0RhdGUuZGF0ZTtcclxuXHRcdFx0XHRcdHRoaXMudXBkYXRlQnV0dG9uU3RhdGUodGhpcy5kYXRlQnV0dG9uISwgdHJ1ZSk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gSWYgY2FsbGVkIGZyb20gc3VnZ2VzdCwgcmVwbGFjZSB0aGUgfiB3aXRoIGRhdGUgdGV4dFxyXG5cdFx0XHRcdFx0aWYgKGN1cnNvciAmJiB0aGlzLm1hcmtkb3duRWRpdG9yKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMucmVwbGFjZUF0Q3Vyc29yKFxyXG5cdFx0XHRcdFx0XHRcdGN1cnNvcixcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmZvcm1hdERhdGUocXVpY2tEYXRlLmRhdGUpXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0bWVudS5hZGRTZXBhcmF0b3IoKTtcclxuXHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJDaG9vc2UgZGF0ZS4uLlwiKSk7XHJcblx0XHRcdGl0ZW0uc2V0SWNvbihcImNhbGVuZGFyLWRheXNcIik7XHJcblx0XHRcdGl0ZW0ub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0Ly8gT3BlbiBmdWxsIGRhdGUgcGlja2VyXHJcblx0XHRcdFx0Ly8gVE9ETzogSW1wbGVtZW50IGZ1bGwgZGF0ZSBwaWNrZXIgaW50ZWdyYXRpb25cclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBTaG93IG1lbnUgYXQgY3Vyc29yIHBvc2l0aW9uIGlmIHByb3ZpZGVkLCBvdGhlcndpc2UgYXQgYnV0dG9uXHJcblx0XHRpZiAoY29vcmRzKSB7XHJcblx0XHRcdHRoaXMuc2hvd01lbnVBdENvb3JkcyhtZW51LCBjb29yZHMubGVmdCwgY29vcmRzLnRvcCk7XHJcblx0XHR9IGVsc2UgaWYgKHRoaXMuZGF0ZUJ1dHRvbikge1xyXG5cdFx0XHRjb25zdCByZWN0ID0gdGhpcy5kYXRlQnV0dG9uLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG5cdFx0XHR0aGlzLnNob3dNZW51QXRDb29yZHMobWVudSwgcmVjdC5sZWZ0LCByZWN0LmJvdHRvbSArIDUpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHVibGljIHNob3dQcmlvcml0eU1lbnVBdEN1cnNvcihjdXJzb3JDb29yZHM6IGFueSwgY3Vyc29yOiBFZGl0b3JQb3NpdGlvbikge1xyXG5cdFx0dGhpcy5zaG93UHJpb3JpdHlNZW51KGN1cnNvciwgY3Vyc29yQ29vcmRzKTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzaG93UHJpb3JpdHlNZW51KGN1cnNvcj86IEVkaXRvclBvc2l0aW9uLCBjb29yZHM/OiBhbnkpIHtcclxuXHRcdGNvbnN0IHByaW9yaXRpZXMgPSBbXHJcblx0XHRcdHsgbGV2ZWw6IDUsIGxhYmVsOiB0KFwiSGlnaGVzdFwiKSwgaWNvbjogXCLwn5S6XCIgfSxcclxuXHRcdFx0eyBsZXZlbDogNCwgbGFiZWw6IHQoXCJIaWdoXCIpLCBpY29uOiBcIuKPq1wiIH0sXHJcblx0XHRcdHsgbGV2ZWw6IDMsIGxhYmVsOiB0KFwiTWVkaXVtXCIpLCBpY29uOiBcIvCflLxcIiB9LFxyXG5cdFx0XHR7IGxldmVsOiAyLCBsYWJlbDogdChcIkxvd1wiKSwgaWNvbjogXCLwn5S9XCIgfSxcclxuXHRcdFx0eyBsZXZlbDogMSwgbGFiZWw6IHQoXCJMb3dlc3RcIiksIGljb246IFwi4o+sXCIgfSxcclxuXHRcdF07XHJcblxyXG5cdFx0Y29uc3QgbWVudSA9IG5ldyBNZW51KCk7XHJcblxyXG5cdFx0cHJpb3JpdGllcy5mb3JFYWNoKChwcmlvcml0eSkgPT4ge1xyXG5cdFx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRpdGVtLnNldFRpdGxlKGAke3ByaW9yaXR5Lmljb259ICR7cHJpb3JpdHkubGFiZWx9YCk7XHJcblx0XHRcdFx0aXRlbS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMudGFza01ldGFkYXRhLnByaW9yaXR5ID0gcHJpb3JpdHkubGV2ZWw7XHJcblx0XHRcdFx0XHR0aGlzLnVwZGF0ZUJ1dHRvblN0YXRlKHRoaXMucHJpb3JpdHlCdXR0b24hLCB0cnVlKTtcclxuXHJcblx0XHRcdFx0XHQvLyBJZiBjYWxsZWQgZnJvbSBzdWdnZXN0LCByZXBsYWNlIHRoZSAhIHdpdGggcHJpb3JpdHkgaWNvblxyXG5cdFx0XHRcdFx0aWYgKGN1cnNvciAmJiB0aGlzLm1hcmtkb3duRWRpdG9yKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMucmVwbGFjZUF0Q3Vyc29yKGN1cnNvciwgcHJpb3JpdHkuaWNvbik7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gU2hvdyBtZW51IGF0IGN1cnNvciBwb3NpdGlvbiBpZiBwcm92aWRlZCwgb3RoZXJ3aXNlIGF0IGJ1dHRvblxyXG5cdFx0aWYgKGNvb3Jkcykge1xyXG5cdFx0XHR0aGlzLnNob3dNZW51QXRDb29yZHMobWVudSwgY29vcmRzLmxlZnQsIGNvb3Jkcy50b3ApO1xyXG5cdFx0fSBlbHNlIGlmICh0aGlzLnByaW9yaXR5QnV0dG9uKSB7XHJcblx0XHRcdGNvbnN0IHJlY3QgPSB0aGlzLnByaW9yaXR5QnV0dG9uLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG5cdFx0XHR0aGlzLnNob3dNZW51QXRDb29yZHMobWVudSwgcmVjdC5sZWZ0LCByZWN0LmJvdHRvbSArIDUpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHVibGljIHNob3dMb2NhdGlvbk1lbnVBdEN1cnNvcihjdXJzb3JDb29yZHM6IGFueSwgY3Vyc29yOiBFZGl0b3JQb3NpdGlvbikge1xyXG5cdFx0dGhpcy5zaG93TG9jYXRpb25NZW51KGN1cnNvciwgY3Vyc29yQ29vcmRzKTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzaG93TG9jYXRpb25NZW51KGN1cnNvcj86IEVkaXRvclBvc2l0aW9uLCBjb29yZHM/OiBhbnkpIHtcclxuXHRcdGNvbnN0IG1lbnUgPSBuZXcgTWVudSgpO1xyXG5cclxuXHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJGaXhlZCBsb2NhdGlvblwiKSk7XHJcblx0XHRcdGl0ZW0uc2V0SWNvbihcImZpbGVcIik7XHJcblx0XHRcdGl0ZW0ub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEubG9jYXRpb24gPSBcImZpeGVkXCI7XHJcblx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEudGFyZ2V0RmlsZSA9XHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUudGFyZ2V0RmlsZTtcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZUJ1dHRvblN0YXRlKFxyXG5cdFx0XHRcdFx0dGhpcy5sb2NhdGlvbkJ1dHRvbiEsXHJcblx0XHRcdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS5sb2NhdGlvbiAhPT1cclxuXHRcdFx0XHRcdFx0KHRoaXMucGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZS50YXJnZXRUeXBlIHx8XHJcblx0XHRcdFx0XHRcdFx0XCJmaXhlZFwiKVxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdC8vIElmIGNhbGxlZCBmcm9tIHN1Z2dlc3QsIHJlcGxhY2UgdGhlIPCfk4Egd2l0aCBmaWxlIHRleHRcclxuXHRcdFx0XHRpZiAoY3Vyc29yICYmIHRoaXMubWFya2Rvd25FZGl0b3IpIHtcclxuXHRcdFx0XHRcdHRoaXMucmVwbGFjZUF0Q3Vyc29yKGN1cnNvciwgdChcIkZpeGVkIGxvY2F0aW9uXCIpKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdGl0ZW0uc2V0VGl0bGUodChcIkRhaWx5IG5vdGVcIikpO1xyXG5cdFx0XHRpdGVtLnNldEljb24oXCJjYWxlbmRhclwiKTtcclxuXHRcdFx0aXRlbS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS5sb2NhdGlvbiA9IFwiZGFpbHktbm90ZVwiO1xyXG5cdFx0XHRcdHRoaXMudGFza01ldGFkYXRhLnRhcmdldEZpbGUgPSB0aGlzLmdldERhaWx5Tm90ZUZpbGUoKTtcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZUJ1dHRvblN0YXRlKFxyXG5cdFx0XHRcdFx0dGhpcy5sb2NhdGlvbkJ1dHRvbiEsXHJcblx0XHRcdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS5sb2NhdGlvbiAhPT1cclxuXHRcdFx0XHRcdFx0KHRoaXMucGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZT8udGFyZ2V0VHlwZSB8fFxyXG5cdFx0XHRcdFx0XHRcdFwiZml4ZWRcIilcclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHQvLyBJZiBjYWxsZWQgZnJvbSBzdWdnZXN0LCByZXBsYWNlIHRoZSDwn5OBIHdpdGggZGFpbHkgbm90ZSB0ZXh0XHJcblx0XHRcdFx0aWYgKGN1cnNvciAmJiB0aGlzLm1hcmtkb3duRWRpdG9yKSB7XHJcblx0XHRcdFx0XHR0aGlzLnJlcGxhY2VBdEN1cnNvcihjdXJzb3IsIHQoXCJEYWlseSBub3RlXCIpKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gU2hvdyBtZW51IGF0IGN1cnNvciBwb3NpdGlvbiBpZiBwcm92aWRlZCwgb3RoZXJ3aXNlIGF0IGJ1dHRvblxyXG5cdFx0aWYgKGNvb3Jkcykge1xyXG5cdFx0XHR0aGlzLnNob3dNZW51QXRDb29yZHMobWVudSwgY29vcmRzLmxlZnQsIGNvb3Jkcy50b3ApO1xyXG5cdFx0fSBlbHNlIGlmICh0aGlzLmxvY2F0aW9uQnV0dG9uKSB7XHJcblx0XHRcdGNvbnN0IHJlY3QgPSB0aGlzLmxvY2F0aW9uQnV0dG9uLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG5cdFx0XHR0aGlzLnNob3dNZW51QXRDb29yZHMobWVudSwgcmVjdC5sZWZ0LCByZWN0LmJvdHRvbSArIDUpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHVibGljIHNob3dUYWdTZWxlY3RvckF0Q3Vyc29yKGN1cnNvckNvb3JkczogYW55LCBjdXJzb3I6IEVkaXRvclBvc2l0aW9uKSB7fVxyXG5cclxuXHRwcml2YXRlIHJlcGxhY2VBdEN1cnNvcihjdXJzb3I6IEVkaXRvclBvc2l0aW9uLCByZXBsYWNlbWVudDogc3RyaW5nKSB7XHJcblx0XHRpZiAoIXRoaXMubWFya2Rvd25FZGl0b3IpIHJldHVybjtcclxuXHJcblx0XHQvLyBSZXBsYWNlIHRoZSBjaGFyYWN0ZXIgYXQgY3Vyc29yIHBvc2l0aW9uIHVzaW5nIENvZGVNaXJyb3IgQVBJXHJcblx0XHRjb25zdCBjbSA9ICh0aGlzLm1hcmtkb3duRWRpdG9yLmVkaXRvciBhcyBhbnkpLmNtO1xyXG5cdFx0aWYgKGNtICYmIGNtLnJlcGxhY2VSYW5nZSkge1xyXG5cdFx0XHRjbS5yZXBsYWNlUmFuZ2UoXHJcblx0XHRcdFx0cmVwbGFjZW1lbnQsXHJcblx0XHRcdFx0eyBsaW5lOiBjdXJzb3IubGluZSwgY2g6IGN1cnNvci5jaCAtIDEgfSxcclxuXHRcdFx0XHRjdXJzb3JcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZ2V0VGFyZ2V0RmlsZSgpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3Qgc2V0dGluZ3MgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmU7XHJcblx0XHRpZiAodGhpcy50YXNrTWV0YWRhdGEubG9jYXRpb24gPT09IFwiZGFpbHktbm90ZVwiKSB7XHJcblx0XHRcdHJldHVybiB0aGlzLmdldERhaWx5Tm90ZUZpbGUoKTtcclxuXHRcdH1cclxuXHRcdHJldHVybiBzZXR0aW5ncy50YXJnZXRGaWxlO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBnZXREYWlseU5vdGVGaWxlKCk6IHN0cmluZyB7XHJcblx0XHRjb25zdCBzZXR0aW5ncyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZS5kYWlseU5vdGVTZXR0aW5ncztcclxuXHRcdGNvbnN0IGRhdGVTdHIgPSBtb21lbnQoKS5mb3JtYXQoc2V0dGluZ3MuZm9ybWF0KTtcclxuXHRcdHJldHVybiBzZXR0aW5ncy5mb2xkZXJcclxuXHRcdFx0PyBgJHtzZXR0aW5ncy5mb2xkZXJ9LyR7ZGF0ZVN0cn0ubWRgXHJcblx0XHRcdDogYCR7ZGF0ZVN0cn0ubWRgO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBmb3JtYXREYXRlKGRhdGU6IERhdGUpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIG1vbWVudChkYXRlKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBwcm9jZXNzTWluaW1hbENvbnRlbnQoY29udGVudDogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdGlmICghY29udGVudC50cmltKCkpIHJldHVybiBcIlwiO1xyXG5cclxuXHRcdGNvbnN0IGxpbmVzID0gY29udGVudC5zcGxpdChcIlxcblwiKTtcclxuXHRcdGNvbnN0IHByb2Nlc3NlZExpbmVzID0gbGluZXMubWFwKChsaW5lKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRyaW1tZWQgPSBsaW5lLnRyaW0oKTtcclxuXHRcdFx0aWYgKHRyaW1tZWQgJiYgIXRyaW1tZWQuc3RhcnRzV2l0aChcIi0gW1wiKSkge1xyXG5cdFx0XHRcdC8vIFVzZSBjbGVhckFsbE1hcmtzIHRvIGNvbXBsZXRlbHkgY2xlYW4gdGhlIGNvbnRlbnRcclxuXHRcdFx0XHRjb25zdCBjbGVhbmVkQ29udGVudCA9IGNsZWFyQWxsTWFya3ModHJpbW1lZCk7XHJcblx0XHRcdFx0cmV0dXJuIGAtIFsgXSAke2NsZWFuZWRDb250ZW50fWA7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIGxpbmU7XHJcblx0XHR9KTtcclxuXHRcdHJldHVybiBwcm9jZXNzZWRMaW5lcy5qb2luKFwiXFxuXCIpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2xlYW4gdGVtcG9yYXJ5IG1hcmtzIGZyb20gdXNlciBpbnB1dCB0aGF0IG1pZ2h0IGNvbmZsaWN0IHdpdGggZm9ybWFsIG1ldGFkYXRhXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjbGVhblRlbXBvcmFyeU1hcmtzKGNvbnRlbnQ6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHRsZXQgY2xlYW5lZCA9IGNvbnRlbnQ7XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIHN0YW5kYWxvbmUgZXhjbGFtYXRpb24gbWFya3MgdGhhdCB1c2VycyBtaWdodCB0eXBlIGZvciBwcmlvcml0eVxyXG5cdFx0Y2xlYW5lZCA9IGNsZWFuZWQucmVwbGFjZSgvXFxzKiFcXHMqL2csIFwiIFwiKTtcclxuXHJcblx0XHQvLyBSZW1vdmUgc3RhbmRhbG9uZSB0aWxkZSBtYXJrcyB0aGF0IHVzZXJzIG1pZ2h0IHR5cGUgZm9yIGRhdGVcclxuXHRcdGNsZWFuZWQgPSBjbGVhbmVkLnJlcGxhY2UoL1xccyp+XFxzKi9nLCBcIiBcIik7XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIHN0YW5kYWxvbmUgcHJpb3JpdHkgc3ltYm9scyB0aGF0IHVzZXJzIG1pZ2h0IHR5cGVcclxuXHRcdGNsZWFuZWQgPSBjbGVhbmVkLnJlcGxhY2UoL1xccypb8J+UuuKPq/CflLzwn5S94o+s77iPXVxccyovZywgXCIgXCIpO1xyXG5cclxuXHRcdC8vIFJlbW92ZSBzdGFuZGFsb25lIGRhdGUgc3ltYm9scyB0aGF0IHVzZXJzIG1pZ2h0IHR5cGVcclxuXHRcdGNsZWFuZWQgPSBjbGVhbmVkLnJlcGxhY2UoL1xccypb8J+ThfCfm6vij7PinIXinpXinYxdXFxzKi9nLCBcIiBcIik7XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIGxvY2F0aW9uL2ZvbGRlciBzeW1ib2xzIHRoYXQgdXNlcnMgbWlnaHQgdHlwZVxyXG5cdFx0Y2xlYW5lZCA9IGNsZWFuZWQucmVwbGFjZSgvXFxzKlvwn5OB8J+PoPCfj6Lwn4+q8J+Pq/Cfj6zwn4+t8J+Pr/Cfj7BdXFxzKi9nLCBcIiBcIik7XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIG90aGVyIG1ldGFkYXRhIHN5bWJvbHMgdGhhdCB1c2VycyBtaWdodCB0eXBlXHJcblx0XHRjbGVhbmVkID0gY2xlYW5lZC5yZXBsYWNlKC9cXHMqW/CfhpTim5Twn4+B8J+UgV1cXHMqL2csIFwiIFwiKTtcclxuXHJcblx0XHQvLyBSZW1vdmUgdGFyZ2V0L2xvY2F0aW9uIHByZWZpeCBwYXR0ZXJucyAobGlrZSBAbG9jYXRpb24sIHRhcmdldDopXHJcblx0XHRjbGVhbmVkID0gY2xlYW5lZC5yZXBsYWNlKC9cXHMqQFxcdypcXHMqL2csIFwiIFwiKTtcclxuXHRcdGNsZWFuZWQgPSBjbGVhbmVkLnJlcGxhY2UoL1xccyp0YXJnZXQ6XFxzKi9naSwgXCIgXCIpO1xyXG5cclxuXHRcdC8vIENsZWFuIHVwIG11bHRpcGxlIHNwYWNlcyBhbmQgdHJpbVxyXG5cdFx0Y2xlYW5lZCA9IGNsZWFuZWQucmVwbGFjZSgvXFxzKy9nLCBcIiBcIikudHJpbSgpO1xyXG5cclxuXHRcdHJldHVybiBjbGVhbmVkO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhZGRNZXRhZGF0YVRvQ29udGVudChjb250ZW50OiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgbWV0YWRhdGE6IHN0cmluZ1tdID0gW107XHJcblxyXG5cdFx0Ly8gQWRkIGRhdGUgbWV0YWRhdGFcclxuXHRcdGlmICh0aGlzLnRhc2tNZXRhZGF0YS5kdWVEYXRlKSB7XHJcblx0XHRcdG1ldGFkYXRhLnB1c2goYPCfk4UgJHt0aGlzLmZvcm1hdERhdGUodGhpcy50YXNrTWV0YWRhdGEuZHVlRGF0ZSl9YCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWRkIHByaW9yaXR5IG1ldGFkYXRhXHJcblx0XHRpZiAodGhpcy50YXNrTWV0YWRhdGEucHJpb3JpdHkpIHtcclxuXHRcdFx0Y29uc3QgcHJpb3JpdHlJY29ucyA9IFtcIuKPrFwiLCBcIvCflL1cIiwgXCLwn5S8XCIsIFwi4o+rXCIsIFwi8J+UulwiXTtcclxuXHRcdFx0bWV0YWRhdGEucHVzaChwcmlvcml0eUljb25zW3RoaXMudGFza01ldGFkYXRhLnByaW9yaXR5IC0gMV0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFkZCB0YWdzXHJcblx0XHRpZiAodGhpcy50YXNrTWV0YWRhdGEudGFncyAmJiB0aGlzLnRhc2tNZXRhZGF0YS50YWdzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0bWV0YWRhdGEucHVzaCguLi50aGlzLnRhc2tNZXRhZGF0YS50YWdzLm1hcCgodGFnKSA9PiBgIyR7dGFnfWApKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGQgbWV0YWRhdGEgdG8gY29udGVudFxyXG5cdFx0aWYgKG1ldGFkYXRhLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0cmV0dXJuIGAke2NvbnRlbnR9ICR7bWV0YWRhdGEuam9pbihcIiBcIil9YDtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gY29udGVudDtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgaGFuZGxlU3VibWl0KCkge1xyXG5cdFx0Y29uc3QgY29udGVudCA9IHRoaXMuY2FwdHVyZWRDb250ZW50LnRyaW0oKTtcclxuXHJcblx0XHRpZiAoIWNvbnRlbnQpIHtcclxuXHRcdFx0bmV3IE5vdGljZSh0KFwiTm90aGluZyB0byBjYXB0dXJlXCIpKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdGxldCBwcm9jZXNzZWRDb250ZW50ID0gY29udGVudDtcclxuXHJcblx0XHRcdGlmICh0aGlzLmN1cnJlbnRNb2RlID09PSBcImNoZWNrYm94XCIpIHtcclxuXHRcdFx0XHQvLyBUYXNrIChjaGVja2JveCkgbW9kZTogd3JhcCBhbmQgYWRkIGlubGluZSBtZXRhZGF0YVxyXG5cdFx0XHRcdHByb2Nlc3NlZENvbnRlbnQgPSB0aGlzLnByb2Nlc3NNaW5pbWFsQ29udGVudChjb250ZW50KTtcclxuXHRcdFx0XHRwcm9jZXNzZWRDb250ZW50ID0gdGhpcy5hZGRNZXRhZGF0YVRvQ29udGVudChwcm9jZXNzZWRDb250ZW50KTtcclxuXHJcblx0XHRcdFx0Y29uc3QgY2FwdHVyZU9wdGlvbnMgPSB7XHJcblx0XHRcdFx0XHQuLi50aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUsXHJcblx0XHRcdFx0XHR0YXJnZXRGaWxlOiB0aGlzLnRhc2tNZXRhZGF0YS50YXJnZXRGaWxlIHx8IHRoaXMuZ2V0VGFyZ2V0RmlsZSgpLFxyXG5cdFx0XHRcdFx0dGFyZ2V0VHlwZTogKHRoaXMudGFza01ldGFkYXRhLmxvY2F0aW9uIHx8IFwiZml4ZWRcIikgYXMgXCJmaXhlZFwiIHwgXCJkYWlseS1ub3RlXCIgfCBcImN1c3RvbS1maWxlXCIsXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHRhd2FpdCBzYXZlQ2FwdHVyZSh0aGlzLmFwcCwgcHJvY2Vzc2VkQ29udGVudCwgY2FwdHVyZU9wdGlvbnMpO1xyXG5cdFx0XHRcdG5ldyBOb3RpY2UodChcIkNhcHR1cmVkIHN1Y2Nlc3NmdWxseVwiKSk7XHJcblx0XHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gRmlsZSBtb2RlOiBzYXZlIGFzIGEgbmV3IGZpbGUgKHJlcGxhY2UgY29udGVudCkgd2l0aCBmcm9udG1hdHRlciBtaXJyb3IgbG9naWNcclxuXHRcdFx0Y29uc3QgdXNlVGVtcGxhdGUgPSAhIXRoaXMucGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZS5jcmVhdGVGaWxlTW9kZT8udXNlVGVtcGxhdGU7XHJcblx0XHRcdGNvbnN0IGhhc0Zyb250bWF0dGVyID0gcHJvY2Vzc2VkQ29udGVudC50cmltU3RhcnQoKS5zdGFydHNXaXRoKFwiLS0tXCIpO1xyXG5cdFx0XHRpZiAodXNlVGVtcGxhdGUpIHtcclxuXHRcdFx0XHRpZiAoIWhhc0Zyb250bWF0dGVyKSB7XHJcblx0XHRcdFx0XHRwcm9jZXNzZWRDb250ZW50ID0gYC0tLVxcbnN0YXR1czogJHtKU09OLnN0cmluZ2lmeShcIm5vdC1zdGFydGVkXCIpfVxcbi0tLVxcblxcbiR7cHJvY2Vzc2VkQ29udGVudH1gO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRpZiAoIWhhc0Zyb250bWF0dGVyKSB7XHJcblx0XHRcdFx0XHRjb25zdCB5YW1sTGluZXM6IHN0cmluZ1tdID0gW107XHJcblx0XHRcdFx0XHR5YW1sTGluZXMucHVzaChgc3RhdHVzOiAke0pTT04uc3RyaW5naWZ5KFwibm90LXN0YXJ0ZWRcIil9YCk7XHJcblx0XHRcdFx0XHRpZiAodGhpcy50YXNrTWV0YWRhdGEuZHVlRGF0ZSkge1xyXG5cdFx0XHRcdFx0XHR5YW1sTGluZXMucHVzaChgZHVlRGF0ZTogJHtKU09OLnN0cmluZ2lmeSh0aGlzLmZvcm1hdERhdGUodGhpcy50YXNrTWV0YWRhdGEuZHVlRGF0ZSkpfWApO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0aWYgKHRoaXMudGFza01ldGFkYXRhLnByaW9yaXR5ICE9IG51bGwpIHtcclxuXHRcdFx0XHRcdFx0eWFtbExpbmVzLnB1c2goYHByaW9yaXR5OiAke0pTT04uc3RyaW5naWZ5KFN0cmluZyh0aGlzLnRhc2tNZXRhZGF0YS5wcmlvcml0eSkpfWApO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0Y29uc3Qgd3JpdGVDb250ZW50VGFncyA9ICEhdGhpcy5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLmNyZWF0ZUZpbGVNb2RlPy53cml0ZUNvbnRlbnRUYWdzVG9Gcm9udG1hdHRlcjtcclxuXHRcdFx0XHRcdGlmICh3cml0ZUNvbnRlbnRUYWdzKSB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IHRhZ3MgPSB0aGlzLmV4dHJhY3RUYWdzRnJvbUNvbnRlbnRGb3JGcm9udG1hdHRlcihjb250ZW50KTtcclxuXHRcdFx0XHRcdFx0aWYgKHRhZ3MubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdFx0XHRcdHlhbWxMaW5lcy5wdXNoKGB0YWdzOiBbJHt0YWdzLm1hcCgodCkgPT4gSlNPTi5zdHJpbmdpZnkodCkpLmpvaW4oXCIsIFwiKX1dYCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdHByb2Nlc3NlZENvbnRlbnQgPSBgLS0tXFxuJHt5YW1sTGluZXMuam9pbihcIlxcblwiKX1cXG4tLS1cXG5cXG4ke3Byb2Nlc3NlZENvbnRlbnR9YDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEJ1aWxkIHRhcmdldCBmaWxlIHBhdGhcclxuXHRcdFx0bGV0IHRhcmdldEZpbGVQYXRoID0gKHRoaXMudGFza01ldGFkYXRhIGFzIGFueSkuY3VzdG9tRmlsZU5hbWUgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG5cdFx0XHRpZiAoIXRhcmdldEZpbGVQYXRoIHx8ICF0YXJnZXRGaWxlUGF0aC50cmltKCkpIHtcclxuXHRcdFx0XHR0YXJnZXRGaWxlUGF0aCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZS5kZWZhdWx0RmlsZU5hbWVUZW1wbGF0ZSB8fCBcInt7REFURTpZWVlZLU1NLUREfX0gLSBcIjtcclxuXHRcdFx0fVxyXG5cdFx0XHR0YXJnZXRGaWxlUGF0aCA9IHByb2Nlc3NEYXRlVGVtcGxhdGVzKHRhcmdldEZpbGVQYXRoKTtcclxuXHRcdFx0aWYgKCF0YXJnZXRGaWxlUGF0aC5lbmRzV2l0aChcIi5tZFwiKSkgdGFyZ2V0RmlsZVBhdGggKz0gXCIubWRcIjtcclxuXHRcdFx0Y29uc3QgZGVmYXVsdEZvbGRlciA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZS5jcmVhdGVGaWxlTW9kZT8uZGVmYXVsdEZvbGRlcj8udHJpbSgpO1xyXG5cdFx0XHRpZiAoZGVmYXVsdEZvbGRlciAmJiAhdGFyZ2V0RmlsZVBhdGguaW5jbHVkZXMoXCIvXCIpKSB7XHJcblx0XHRcdFx0dGFyZ2V0RmlsZVBhdGggPSB0aGlzLnNhbml0aXplRmlsZVBhdGgoYCR7ZGVmYXVsdEZvbGRlcn0vJHt0YXJnZXRGaWxlUGF0aH1gKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgY2FwdHVyZU9wdGlvbnMgPSB7XHJcblx0XHRcdFx0Li4udGhpcy5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLFxyXG5cdFx0XHRcdHRhcmdldEZpbGU6IHRhcmdldEZpbGVQYXRoLFxyXG5cdFx0XHRcdHRhcmdldFR5cGU6IFwiZml4ZWRcIiBhcyBjb25zdCxcclxuXHRcdFx0XHRhcHBlbmRUb0ZpbGU6IFwicmVwbGFjZVwiIGFzIGNvbnN0LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0YXdhaXQgc2F2ZUNhcHR1cmUodGhpcy5hcHAsIHByb2Nlc3NlZENvbnRlbnQsIGNhcHR1cmVPcHRpb25zKTtcclxuXHRcdFx0bmV3IE5vdGljZSh0KFwiQ2FwdHVyZWQgc3VjY2Vzc2Z1bGx5XCIpKTtcclxuXHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0bmV3IE5vdGljZShgJHt0KFwiRmFpbGVkIHRvIHNhdmU6XCIpfSAke2Vycm9yfWApO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUGFyc2UgdGhlIGNvbnRlbnQgYW5kIHVwZGF0ZSBidXR0b24gc3RhdGVzIGJhc2VkIG9uIGV4dHJhY3RlZCBtZXRhZGF0YVxyXG5cdCAqIE9ubHkgdXBkYXRlIHRhc2tNZXRhZGF0YSBpZiBhY3R1YWwgbWFya3MgZXhpc3QgaW4gY29udGVudCwgcHJlc2VydmUgbWFudWFsbHkgc2V0IHZhbHVlc1xyXG5cdCAqL1xyXG5cdHB1YmxpYyBwYXJzZUNvbnRlbnRBbmRVcGRhdGVCdXR0b25zKCk6IHZvaWQge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgY29udGVudCA9IHRoaXMuY2FwdHVyZWRDb250ZW50LnRyaW0oKTtcclxuXHRcdFx0aWYgKCFjb250ZW50KSB7XHJcblx0XHRcdFx0Ly8gVXBkYXRlIGJ1dHRvbiBzdGF0ZXMgYmFzZWQgb24gZXhpc3RpbmcgdGFza01ldGFkYXRhXHJcblx0XHRcdFx0dGhpcy51cGRhdGVCdXR0b25TdGF0ZShcclxuXHRcdFx0XHRcdHRoaXMuZGF0ZUJ1dHRvbiEsXHJcblx0XHRcdFx0XHQhIXRoaXMudGFza01ldGFkYXRhLmR1ZURhdGVcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHRoaXMudXBkYXRlQnV0dG9uU3RhdGUoXHJcblx0XHRcdFx0XHR0aGlzLnByaW9yaXR5QnV0dG9uISxcclxuXHRcdFx0XHRcdCEhdGhpcy50YXNrTWV0YWRhdGEucHJpb3JpdHlcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHRoaXMudXBkYXRlQnV0dG9uU3RhdGUoXHJcblx0XHRcdFx0XHR0aGlzLnRhZ0J1dHRvbiEsXHJcblx0XHRcdFx0XHQhIShcclxuXHRcdFx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEudGFncyAmJlxyXG5cdFx0XHRcdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS50YWdzLmxlbmd0aCA+IDBcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHRoaXMudXBkYXRlQnV0dG9uU3RhdGUoXHJcblx0XHRcdFx0XHR0aGlzLmxvY2F0aW9uQnV0dG9uISxcclxuXHRcdFx0XHRcdCEhKFxyXG5cdFx0XHRcdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS5sb2NhdGlvbiB8fFxyXG5cdFx0XHRcdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS50YXJnZXRGaWxlXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENyZWF0ZSBhIHBhcnNlciB0byBleHRyYWN0IG1ldGFkYXRhXHJcblx0XHRcdGNvbnN0IHBhcnNlciA9IG5ldyBDb25maWd1cmFibGVUYXNrUGFyc2VyKHtcclxuXHRcdFx0XHQvLyBVc2UgZGVmYXVsdCBjb25maWd1cmF0aW9uXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gRXh0cmFjdCBtZXRhZGF0YSBhbmQgdGFnc1xyXG5cdFx0XHRjb25zdCBbY2xlYW5lZENvbnRlbnQsIG1ldGFkYXRhLCB0YWdzXSA9XHJcblx0XHRcdFx0cGFyc2VyLmV4dHJhY3RNZXRhZGF0YUFuZFRhZ3MoY29udGVudCk7XHJcblxyXG5cdFx0XHQvLyBPbmx5IHVwZGF0ZSB0YXNrTWV0YWRhdGEgaWYgd2UgZm91bmQgYWN0dWFsIG1hcmtzIGluIHRoZSBjb250ZW50XHJcblx0XHRcdC8vIFRoaXMgcHJlc2VydmVzIG1hbnVhbGx5IHNldCB2YWx1ZXMgZnJvbSBzdWdnZXN0IHN5c3RlbVxyXG5cclxuXHRcdFx0Ly8gRHVlIGRhdGUgLSBvbmx5IHVwZGF0ZSBpZiBmb3VuZCBpbiBjb250ZW50XHJcblx0XHRcdGlmIChtZXRhZGF0YS5kdWVEYXRlKSB7XHJcblx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEuZHVlRGF0ZSA9IG5ldyBEYXRlKG1ldGFkYXRhLmR1ZURhdGUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdC8vIERvbid0IGRlbGV0ZSBleGlzdGluZyBkdWVEYXRlIGlmIG5vdCBmb3VuZCBpbiBjb250ZW50XHJcblxyXG5cdFx0XHQvLyBQcmlvcml0eSAtIG9ubHkgdXBkYXRlIGlmIGZvdW5kIGluIGNvbnRlbnRcclxuXHRcdFx0aWYgKG1ldGFkYXRhLnByaW9yaXR5KSB7XHJcblx0XHRcdFx0Y29uc3QgcHJpb3JpdHlNYXA6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7XHJcblx0XHRcdFx0XHRoaWdoZXN0OiA1LFxyXG5cdFx0XHRcdFx0aGlnaDogNCxcclxuXHRcdFx0XHRcdG1lZGl1bTogMyxcclxuXHRcdFx0XHRcdGxvdzogMixcclxuXHRcdFx0XHRcdGxvd2VzdDogMSxcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHRcdHRoaXMudGFza01ldGFkYXRhLnByaW9yaXR5ID1cclxuXHRcdFx0XHRcdHByaW9yaXR5TWFwW21ldGFkYXRhLnByaW9yaXR5XSB8fCAzO1xyXG5cdFx0XHR9XHJcblx0XHRcdC8vIERvbid0IGRlbGV0ZSBleGlzdGluZyBwcmlvcml0eSBpZiBub3QgZm91bmQgaW4gY29udGVudFxyXG5cclxuXHRcdFx0Ly8gVGFncyAtIG9ubHkgYWRkIG5ldyB0YWdzLCBkb24ndCByZXBsYWNlIGV4aXN0aW5nIG9uZXNcclxuXHRcdFx0aWYgKHRhZ3MgJiYgdGFncy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0aWYgKCF0aGlzLnRhc2tNZXRhZGF0YS50YWdzKSB7XHJcblx0XHRcdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS50YWdzID0gW107XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIE1lcmdlIG5ldyB0YWdzIHdpdGggZXhpc3Rpbmcgb25lcywgYXZvaWQgZHVwbGljYXRlc1xyXG5cdFx0XHRcdHRhZ3MuZm9yRWFjaCgodGFnKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAoIXRoaXMudGFza01ldGFkYXRhLnRhZ3MhLmluY2x1ZGVzKHRhZykpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEudGFncyEucHVzaCh0YWcpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgYnV0dG9uIHN0YXRlcyBiYXNlZCBvbiBjdXJyZW50IHRhc2tNZXRhZGF0YVxyXG5cdFx0XHR0aGlzLnVwZGF0ZUJ1dHRvblN0YXRlKFxyXG5cdFx0XHRcdHRoaXMuZGF0ZUJ1dHRvbiEsXHJcblx0XHRcdFx0ISF0aGlzLnRhc2tNZXRhZGF0YS5kdWVEYXRlXHJcblx0XHRcdCk7XHJcblx0XHRcdHRoaXMudXBkYXRlQnV0dG9uU3RhdGUoXHJcblx0XHRcdFx0dGhpcy5wcmlvcml0eUJ1dHRvbiEsXHJcblx0XHRcdFx0ISF0aGlzLnRhc2tNZXRhZGF0YS5wcmlvcml0eVxyXG5cdFx0XHQpO1xyXG5cdFx0XHR0aGlzLnVwZGF0ZUJ1dHRvblN0YXRlKFxyXG5cdFx0XHRcdHRoaXMudGFnQnV0dG9uISxcclxuXHRcdFx0XHQhISh0aGlzLnRhc2tNZXRhZGF0YS50YWdzICYmIHRoaXMudGFza01ldGFkYXRhLnRhZ3MubGVuZ3RoID4gMClcclxuXHRcdFx0KTtcclxuXHRcdFx0dGhpcy51cGRhdGVCdXR0b25TdGF0ZShcclxuXHRcdFx0XHR0aGlzLmxvY2F0aW9uQnV0dG9uISxcclxuXHRcdFx0XHQhIShcclxuXHRcdFx0XHRcdHRoaXMudGFza01ldGFkYXRhLmxvY2F0aW9uIHx8XHJcblx0XHRcdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS50YXJnZXRGaWxlIHx8XHJcblx0XHRcdFx0XHRtZXRhZGF0YS5wcm9qZWN0IHx8XHJcblx0XHRcdFx0XHRtZXRhZGF0YS5sb2NhdGlvblxyXG5cdFx0XHRcdClcclxuXHRcdFx0KTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFcnJvciBwYXJzaW5nIGNvbnRlbnQ6XCIsIGVycm9yKTtcclxuXHRcdFx0Ly8gT24gZXJyb3IsIHN0aWxsIHVwZGF0ZSBidXR0b24gc3RhdGVzIGJhc2VkIG9uIGV4aXN0aW5nIHRhc2tNZXRhZGF0YVxyXG5cdFx0XHR0aGlzLnVwZGF0ZUJ1dHRvblN0YXRlKFxyXG5cdFx0XHRcdHRoaXMuZGF0ZUJ1dHRvbiEsXHJcblx0XHRcdFx0ISF0aGlzLnRhc2tNZXRhZGF0YS5kdWVEYXRlXHJcblx0XHRcdCk7XHJcblx0XHRcdHRoaXMudXBkYXRlQnV0dG9uU3RhdGUoXHJcblx0XHRcdFx0dGhpcy5wcmlvcml0eUJ1dHRvbiEsXHJcblx0XHRcdFx0ISF0aGlzLnRhc2tNZXRhZGF0YS5wcmlvcml0eVxyXG5cdFx0XHQpO1xyXG5cdFx0XHR0aGlzLnVwZGF0ZUJ1dHRvblN0YXRlKFxyXG5cdFx0XHRcdHRoaXMudGFnQnV0dG9uISxcclxuXHRcdFx0XHQhISh0aGlzLnRhc2tNZXRhZGF0YS50YWdzICYmIHRoaXMudGFza01ldGFkYXRhLnRhZ3MubGVuZ3RoID4gMClcclxuXHRcdFx0KTtcclxuXHRcdFx0dGhpcy51cGRhdGVCdXR0b25TdGF0ZShcclxuXHRcdFx0XHR0aGlzLmxvY2F0aW9uQnV0dG9uISxcclxuXHRcdFx0XHQhISh0aGlzLnRhc2tNZXRhZGF0YS5sb2NhdGlvbiB8fCB0aGlzLnRhc2tNZXRhZGF0YS50YXJnZXRGaWxlKVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG4iXX0=