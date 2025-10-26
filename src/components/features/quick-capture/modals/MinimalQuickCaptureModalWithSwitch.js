import { Menu, setIcon } from "obsidian";
import { createEmbeddableMarkdownEditor } from "@/editor-extensions/core/markdown-editor";
import { t } from "@/translations/helper";
import { ConfigurableTaskParser } from "@/dataflow/core/ConfigurableTaskParser";
import { clearAllMarks } from "@/components/ui/renderers/MarkdownRenderer";
import { BaseQuickCaptureModal, } from "./BaseQuickCaptureModal";
import { moment } from "obsidian";
import { processDateTemplates } from "@/utils/file/file-operations";
import { FileSuggest } from "@/components/ui/inputs/AutoComplete";
/**
 * Minimal Quick Capture Modal extending the base class
 */
export class MinimalQuickCaptureModal extends BaseQuickCaptureModal {
    constructor(app, plugin) {
        // Default to checkbox mode for task creation
        super(app, plugin, "checkbox");
        // UI Elements
        this.dateButton = null;
        this.priorityButton = null;
        this.locationButton = null;
        this.tagButton = null;
        this.universalSuggest = null;
        this.fileSuggest = null;
        // UI element references
        this.targetIndicator = null;
        this.fileNameInput = null;
        this.targetFileEl = null;
        this.editorContainer = null;
        this.minimalSuggest = plugin.minimalQuickCaptureSuggest;
        // Initialize default metadata for checkbox mode
        const targetType = this.plugin.settings.quickCapture.targetType;
        this.taskMetadata.location =
            (targetType === "custom-file" ? "file" : targetType) || "fixed";
        this.taskMetadata.targetFile = this.getTargetFile();
    }
    onOpen() {
        // Store modal instance reference for suggest system
        this.modalEl.__minimalQuickCaptureModal = this;
        this.modalEl.toggleClass('tg-minimal-capture-modal', true);
        // Set up the suggest system
        if (this.minimalSuggest) {
            this.minimalSuggest.setMinimalMode(true);
        }
        super.onOpen();
    }
    /**
     * Initialize components after UI creation
     */
    initializeComponents() {
        // Setup markdown editor only if not already initialized
        if (this.contentContainer && !this.markdownEditor) {
            const editorContainer = this.contentContainer.querySelector(".quick-capture-minimal-editor");
            if (editorContainer) {
                this.setupMarkdownEditor(editorContainer);
            }
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
        // Restore content if exists
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
        // Target indicator (shows destination or file name)
        const targetContainer = this.contentContainer.createDiv({
            cls: "quick-capture-minimal-target-container",
        });
        this.targetIndicator = targetContainer.createDiv({
            cls: "quick-capture-minimal-target",
        });
        // Editor container - same for both modes
        const editorWrapper = this.contentContainer.createDiv({
            cls: "quick-capture-minimal-editor-container",
        });
        this.editorContainer = editorWrapper.createDiv({
            cls: "quick-capture-modal-editor quick-capture-minimal-editor",
        });
        // Quick action buttons container (only for checkbox mode)
        const buttonsContainer = this.contentContainer.createDiv({
            cls: "quick-capture-minimal-quick-actions",
        });
        this.createQuickActionButtons(buttonsContainer);
        // Update target display based on initial mode
        this.updateTargetDisplay();
    }
    /**
     * Update target display based on current mode
     */
    updateTargetDisplay() {
        var _a, _b, _c, _d, _e, _f;
        if (!this.targetIndicator)
            return;
        this.targetIndicator.empty();
        if (this.currentMode === "checkbox") {
            // Show editable target file for checkbox mode
            const label = this.targetIndicator.createSpan({
                cls: "quick-capture-target-label",
                text: t("To: "),
            });
            // Create contenteditable element for target file path
            this.targetFileEl = this.targetIndicator.createEl("div", {
                cls: "quick-capture-target",
                attr: {
                    contenteditable: "true",
                    spellcheck: "false",
                },
                text: this.tempTargetFilePath,
            });
            // Add FileSuggest for file selection
            this.fileSuggest = new FileSuggest(this.app, this.targetFileEl, this.plugin.settings.quickCapture, (file) => {
                var _a, _b;
                this.targetFileEl.textContent = file.path;
                this.tempTargetFilePath = file.path;
                this.taskMetadata.targetFile = file.path;
                (_b = (_a = this.markdownEditor) === null || _a === void 0 ? void 0 : _a.editor) === null || _b === void 0 ? void 0 : _b.focus();
            });
            // Update tempTargetFilePath when manually edited
            this.targetFileEl.addEventListener("blur", () => {
                if (this.targetFileEl) {
                    this.tempTargetFilePath = this.targetFileEl.textContent || "";
                    this.taskMetadata.targetFile = this.tempTargetFilePath;
                }
            });
            // Show quick action buttons
            const buttonsContainer = (_a = this.contentContainer) === null || _a === void 0 ? void 0 : _a.querySelector(".quick-capture-minimal-quick-actions");
            if (buttonsContainer) {
                buttonsContainer.style.display = "flex";
            }
        }
        else {
            // Show file name input for file mode with resolved path
            const label = this.targetIndicator.createSpan({
                cls: "quick-capture-target-label",
                text: t("Save as: "),
            });
            // Get the template value and resolve it immediately
            const templateValue = this.taskMetadata.customFileName || this.plugin.settings.quickCapture.defaultFileNameTemplate || "{{DATE:YYYY-MM-DD}} - ";
            let resolvedPath = processDateTemplates(templateValue);
            // Add default folder if configured
            const defaultFolder = (_c = (_b = this.plugin.settings.quickCapture.createFileMode) === null || _b === void 0 ? void 0 : _b.defaultFolder) === null || _c === void 0 ? void 0 : _c.trim();
            if (((_e = (_d = this.plugin.settings) === null || _d === void 0 ? void 0 : _d.fileSource) === null || _e === void 0 ? void 0 : _e.enabled) &&
                defaultFolder &&
                !resolvedPath.includes("/")) {
                resolvedPath = `${defaultFolder}/${resolvedPath}`;
            }
            // Add .md extension if not present
            if (!resolvedPath.endsWith(".md")) {
                resolvedPath += ".md";
            }
            // Create input with resolved path (editable)
            this.fileNameInput = this.targetIndicator.createEl("input", {
                cls: "quick-capture-minimal-file-input",
                attr: {
                    type: "text",
                    placeholder: t("Enter file name..."),
                    value: resolvedPath,
                },
            });
            // Update the customFileName when input changes
            this.fileNameInput.addEventListener("input", () => {
                if (this.fileNameInput) {
                    this.taskMetadata.customFileName = this.fileNameInput.value;
                }
            });
            // Keep quick action buttons visible in file mode
            const buttonsContainer = (_f = this.contentContainer) === null || _f === void 0 ? void 0 : _f.querySelector(".quick-capture-minimal-quick-actions");
            if (buttonsContainer) {
                buttonsContainer.style.display = "flex";
            }
        }
    }
    /**
     * Create quick action buttons
     */
    createQuickActionButtons(container) {
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
        this.tagButton.addEventListener("click", () => {
        });
        this.updateButtonState(this.tagButton, !!(this.taskMetadata.tags && this.taskMetadata.tags.length > 0));
    }
    /**
     * Setup markdown editor
     */
    setupMarkdownEditor(container) {
        setTimeout(() => {
            var _a, _b;
            this.markdownEditor = createEmbeddableMarkdownEditor(this.app, container, {
                placeholder: t("Enter your content..."),
                singleLine: false,
                onEnter: (editor, mod, shift) => {
                    // Cmd/Ctrl+Enter always submits
                    if (mod) {
                        this.handleSubmit();
                        return true;
                    }
                    // In checkbox mode, plain Enter also submits for quick capture
                    if (this.currentMode === "checkbox" && !shift) {
                        this.handleSubmit();
                        return true;
                    }
                    // In file mode or shift+enter, create new line
                    return false;
                },
                onEscape: (editor) => {
                    this.close();
                },
                onChange: (update) => {
                    var _a;
                    this.capturedContent = ((_a = this.markdownEditor) === null || _a === void 0 ? void 0 : _a.value) || "";
                    // Parse content and update button states only in checkbox mode
                    if (this.currentMode === "checkbox") {
                        this.parseContentAndUpdateButtons();
                    }
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
     * Update button state
     */
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
    // Date picker methods
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
                // TODO: Implement full date picker integration
            });
        });
        // Show menu
        if (coords) {
            this.showMenuAtCoords(menu, coords.left, coords.top);
        }
        else if (this.dateButton) {
            const rect = this.dateButton.getBoundingClientRect();
            this.showMenuAtCoords(menu, rect.left, rect.bottom + 5);
        }
    }
    // Priority menu methods
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
        // Show menu
        if (coords) {
            this.showMenuAtCoords(menu, coords.left, coords.top);
        }
        else if (this.priorityButton) {
            const rect = this.priorityButton.getBoundingClientRect();
            this.showMenuAtCoords(menu, rect.left, rect.bottom + 5);
        }
    }
    // Location menu methods
    showLocationMenuAtCursor(cursorCoords, cursor) {
        this.showLocationMenu(cursor, cursorCoords);
    }
    showLocationMenu(cursor, coords) {
        var _a, _b;
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
        // Only show custom file option when FileSource is enabled
        if ((_b = (_a = this.plugin.settings) === null || _a === void 0 ? void 0 : _a.fileSource) === null || _b === void 0 ? void 0 : _b.enabled) {
            menu.addItem((item) => {
                item.setTitle(t("Custom file"));
                item.setIcon("file-plus");
                item.onClick(() => {
                    this.taskMetadata.location = "file";
                    // Switch to file mode for custom file creation
                    this.switchMode("file");
                    // If called from suggest, replace the 📁 with custom file text
                    if (cursor && this.markdownEditor) {
                        this.replaceAtCursor(cursor, t("Custom file"));
                    }
                });
            });
        }
        // Show menu
        if (coords) {
            this.showMenuAtCoords(menu, coords.left, coords.top);
        }
        else if (this.locationButton) {
            const rect = this.locationButton.getBoundingClientRect();
            this.showMenuAtCoords(menu, rect.left, rect.bottom + 5);
        }
    }
    // Tag selector methods
    showTagSelectorAtCursor(cursorCoords, cursor) {
        // TODO: Implement tag selector
    }
    /**
     * Replace text at cursor position
     */
    replaceAtCursor(cursor, replacement) {
        if (!this.markdownEditor)
            return;
        // Replace the character at cursor position using CodeMirror API
        const cm = this.markdownEditor.editor.cm;
        if (cm && cm.replaceRange) {
            cm.replaceRange(replacement, { line: cursor.line, ch: cursor.ch - 1 }, cursor);
        }
    }
    /**
     * Get target file
     */
    getTargetFile() {
        const settings = this.plugin.settings.quickCapture;
        if (this.taskMetadata.location === "daily-note") {
            return this.getDailyNoteFile();
        }
        return settings.targetFile;
    }
    /**
     * Get daily note file
     */
    getDailyNoteFile() {
        const settings = this.plugin.settings.quickCapture.dailyNoteSettings;
        const dateStr = moment().format(settings.format);
        return settings.folder
            ? `${settings.folder}/${dateStr}.md`
            : `${dateStr}.md`;
    }
    /**
     * Process content with metadata based on save strategy
     */
    processContentWithMetadata(content) {
        if (!content.trim())
            return "";
        // For file mode, just return content as-is
        if (this.currentMode === "file") {
            return content;
        }
        // For checkbox mode, format as tasks
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
        // Add metadata for checkbox mode
        return this.addMetadataToContent(processedLines.join("\n"));
    }
    /**
     * Add metadata to content
     */
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
    /**
     * Parse content and update button states
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
            const parser = new ConfigurableTaskParser({});
            // Extract metadata and tags
            const [cleanedContent, metadata, tags] = parser.extractMetadataAndTags(content);
            // Update taskMetadata based on parsed content
            if (metadata.dueDate) {
                this.taskMetadata.dueDate = new Date(metadata.dueDate);
            }
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
            if (tags && tags.length > 0) {
                if (!this.taskMetadata.tags) {
                    this.taskMetadata.tags = [];
                }
                // Merge new tags with existing ones
                tags.forEach((tag) => {
                    if (!this.taskMetadata.tags.includes(tag)) {
                        this.taskMetadata.tags.push(tag);
                    }
                });
            }
            // Update button states
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
            // On error, still update button states
            this.updateButtonState(this.dateButton, !!this.taskMetadata.dueDate);
            this.updateButtonState(this.priorityButton, !!this.taskMetadata.priority);
            this.updateButtonState(this.tagButton, !!(this.taskMetadata.tags && this.taskMetadata.tags.length > 0));
            this.updateButtonState(this.locationButton, !!(this.taskMetadata.location || this.taskMetadata.targetFile));
        }
    }
    /**
     * Reset UI elements
     */
    resetUIElements() {
        // Reset button states
        if (this.dateButton)
            this.updateButtonState(this.dateButton, false);
        if (this.priorityButton)
            this.updateButtonState(this.priorityButton, false);
        if (this.tagButton)
            this.updateButtonState(this.tagButton, false);
        if (this.locationButton)
            this.updateButtonState(this.locationButton, false);
    }
    /**
     * Clean up on close
     */
    onClose() {
        // Clean up universal suggest
        if (this.universalSuggest) {
            this.universalSuggest.disable();
            this.universalSuggest = null;
        }
        // Clean up file suggest
        if (this.fileSuggest) {
            this.fileSuggest.close();
            this.fileSuggest = null;
        }
        // Clean up suggest
        if (this.minimalSuggest) {
            this.minimalSuggest.setMinimalMode(false);
        }
        // Clean up modal reference
        delete this.modalEl.__minimalQuickCaptureModal;
        super.onClose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWluaW1hbFF1aWNrQ2FwdHVyZU1vZGFsV2l0aFN3aXRjaC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIk1pbmltYWxRdWlja0NhcHR1cmVNb2RhbFdpdGhTd2l0Y2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFlLElBQUksRUFBRSxPQUFPLEVBQWtCLE1BQU0sVUFBVSxDQUFDO0FBQ3RFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRTFGLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUcxQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNoRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDM0UsT0FBTyxFQUNOLHFCQUFxQixHQUdyQixNQUFNLHlCQUF5QixDQUFDO0FBQ2pDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDbEMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDcEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRWxFOztHQUVHO0FBQ0gsTUFBTSxPQUFPLHdCQUF5QixTQUFRLHFCQUFxQjtJQWtCbEUsWUFBWSxHQUFRLEVBQUUsTUFBNkI7UUFDbEQsNkNBQTZDO1FBQzdDLEtBQUssQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBbkJoQyxjQUFjO1FBQ04sZUFBVSxHQUE2QixJQUFJLENBQUM7UUFDNUMsbUJBQWMsR0FBNkIsSUFBSSxDQUFDO1FBQ2hELG1CQUFjLEdBQTZCLElBQUksQ0FBQztRQUNoRCxjQUFTLEdBQTZCLElBQUksQ0FBQztRQUkzQyxxQkFBZ0IsR0FBa0MsSUFBSSxDQUFDO1FBQ3ZELGdCQUFXLEdBQXVCLElBQUksQ0FBQztRQUUvQyx3QkFBd0I7UUFDaEIsb0JBQWUsR0FBdUIs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QixDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDcEQsSUFBSSxJQUFJLENBQUMsU0FBUztZQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2xFLElBQUksSUFBSSxDQUFDLGNBQWM7WUFDdEIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUVEOztPQUVHO0lBQ0gsT0FBTztRQUNOLDZCQUE2QjtRQUM3QixJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtZQUMxQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDaEMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQztTQUM3QjtRQUVELHdCQUF3QjtRQUN4QixJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUU7WUFDckIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztTQUN4QjtRQUVELG1CQUFtQjtRQUNuQixJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUU7WUFDeEIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDMUM7UUFFRCwyQkFBMkI7UUFDM0IsT0FBUSxJQUFJLENBQUMsT0FBZSxDQUFDLDBCQUEwQixDQUFDO1FBRXhELEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHAsIE5vdGljZSwgTWVudSwgc2V0SWNvbiwgRWRpdG9yUG9zaXRpb24gfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgY3JlYXRlRW1iZWRkYWJsZU1hcmtkb3duRWRpdG9yIH0gZnJvbSBcIkAvZWRpdG9yLWV4dGVuc2lvbnMvY29yZS9tYXJrZG93bi1lZGl0b3JcIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgeyBNaW5pbWFsUXVpY2tDYXB0dXJlU3VnZ2VzdCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvcXVpY2stY2FwdHVyZS9zdWdnZXN0L01pbmltYWxRdWlja0NhcHR1cmVTdWdnZXN0XCI7XHJcbmltcG9ydCB7IFVuaXZlcnNhbEVkaXRvclN1Z2dlc3QgfSBmcm9tIFwiQC9jb21wb25lbnRzL3VpL3N1Z2dlc3RcIjtcclxuaW1wb3J0IHsgQ29uZmlndXJhYmxlVGFza1BhcnNlciB9IGZyb20gXCJAL2RhdGFmbG93L2NvcmUvQ29uZmlndXJhYmxlVGFza1BhcnNlclwiO1xyXG5pbXBvcnQgeyBjbGVhckFsbE1hcmtzIH0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9yZW5kZXJlcnMvTWFya2Rvd25SZW5kZXJlclwiO1xyXG5pbXBvcnQge1xyXG5cdEJhc2VRdWlja0NhcHR1cmVNb2RhbCxcclxuXHRRdWlja0NhcHR1cmVNb2RlLFxyXG5cdFRhc2tNZXRhZGF0YSxcclxufSBmcm9tIFwiLi9CYXNlUXVpY2tDYXB0dXJlTW9kYWxcIjtcclxuaW1wb3J0IHsgbW9tZW50IH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IHByb2Nlc3NEYXRlVGVtcGxhdGVzIH0gZnJvbSBcIkAvdXRpbHMvZmlsZS9maWxlLW9wZXJhdGlvbnNcIjtcclxuaW1wb3J0IHsgRmlsZVN1Z2dlc3QgfSBmcm9tIFwiQC9jb21wb25lbnRzL3VpL2lucHV0cy9BdXRvQ29tcGxldGVcIjtcclxuXHJcbi8qKlxyXG4gKiBNaW5pbWFsIFF1aWNrIENhcHR1cmUgTW9kYWwgZXh0ZW5kaW5nIHRoZSBiYXNlIGNsYXNzXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgTWluaW1hbFF1aWNrQ2FwdHVyZU1vZGFsIGV4dGVuZHMgQmFzZVF1aWNrQ2FwdHVyZU1vZGFsIHtcclxuXHQvLyBVSSBFbGVtZW50c1xyXG5cdHByaXZhdGUgZGF0ZUJ1dHRvbjogSFRNTEJ1dHRvbkVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIHByaW9yaXR5QnV0dG9uOiBIVE1MQnV0dG9uRWxlbWVudCB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgbG9jYXRpb25CdXR0b246IEhUTUxCdXR0b25FbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSB0YWdCdXR0b246IEhUTUxCdXR0b25FbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcblxyXG5cdC8vIFN1Z2dlc3QgaW5zdGFuY2VzXHJcblx0cHJpdmF0ZSBtaW5pbWFsU3VnZ2VzdDogTWluaW1hbFF1aWNrQ2FwdHVyZVN1Z2dlc3Q7XHJcblx0cHJpdmF0ZSB1bml2ZXJzYWxTdWdnZXN0OiBVbml2ZXJzYWxFZGl0b3JTdWdnZXN0IHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBmaWxlU3VnZ2VzdDogRmlsZVN1Z2dlc3QgfCBudWxsID0gbnVsbDtcclxuXHJcblx0Ly8gVUkgZWxlbWVudCByZWZlcmVuY2VzXHJcblx0cHJpdmF0ZSB0YXJnZXRJbmRpY2F0b3I6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBmaWxlTmFtZUlucHV0OiBIVE1MSW5wdXRFbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSB0YXJnZXRGaWxlRWw6IEhUTUxEaXZFbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBlZGl0b3JDb250YWluZXI6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcblxyXG5cdGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbikge1xyXG5cdFx0Ly8gRGVmYXVsdCB0byBjaGVja2JveCBtb2RlIGZvciB0YXNrIGNyZWF0aW9uXHJcblx0XHRzdXBlcihhcHAsIHBsdWdpbiwgXCJjaGVja2JveFwiKTtcclxuXHJcblx0XHR0aGlzLm1pbmltYWxTdWdnZXN0ID0gcGx1Z2luLm1pbmltYWxRdWlja0NhcHR1cmVTdWdnZXN0O1xyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgZGVmYXVsdCBtZXRhZGF0YSBmb3IgY2hlY2tib3ggbW9kZVxyXG5cdFx0Y29uc3QgdGFyZ2V0VHlwZSA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZS50YXJnZXRUeXBlO1xyXG5cdFx0dGhpcy50YXNrTWV0YWRhdGEubG9jYXRpb24gPVxyXG5cdFx0XHQodGFyZ2V0VHlwZSA9PT0gXCJjdXN0b20tZmlsZVwiID8gXCJmaWxlXCIgOiB0YXJnZXRUeXBlKSB8fCBcImZpeGVkXCI7XHJcblx0XHR0aGlzLnRhc2tNZXRhZGF0YS50YXJnZXRGaWxlID0gdGhpcy5nZXRUYXJnZXRGaWxlKCk7XHJcblx0fVxyXG5cclxuXHRvbk9wZW4oKSB7XHJcblx0XHQvLyBTdG9yZSBtb2RhbCBpbnN0YW5jZSByZWZlcmVuY2UgZm9yIHN1Z2dlc3Qgc3lzdGVtXHJcblx0XHQodGhpcy5tb2RhbEVsIGFzIGFueSkuX19taW5pbWFsUXVpY2tDYXB0dXJlTW9kYWwgPSB0aGlzO1xyXG5cdFx0dGhpcy5tb2RhbEVsLnRvZ2dsZUNsYXNzKCd0Zy1taW5pbWFsLWNhcHR1cmUtbW9kYWwnLCB0cnVlKTtcclxuXHJcblx0XHQvLyBTZXQgdXAgdGhlIHN1Z2dlc3Qgc3lzdGVtXHJcblx0XHRpZiAodGhpcy5taW5pbWFsU3VnZ2VzdCkge1xyXG5cdFx0XHR0aGlzLm1pbmltYWxTdWdnZXN0LnNldE1pbmltYWxNb2RlKHRydWUpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHN1cGVyLm9uT3BlbigpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSW5pdGlhbGl6ZSBjb21wb25lbnRzIGFmdGVyIFVJIGNyZWF0aW9uXHJcblx0ICovXHJcblx0cHJvdGVjdGVkIGluaXRpYWxpemVDb21wb25lbnRzKCk6IHZvaWQge1xyXG5cdFx0Ly8gU2V0dXAgbWFya2Rvd24gZWRpdG9yIG9ubHkgaWYgbm90IGFscmVhZHkgaW5pdGlhbGl6ZWRcclxuXHRcdGlmICh0aGlzLmNvbnRlbnRDb250YWluZXIgJiYgIXRoaXMubWFya2Rvd25FZGl0b3IpIHtcclxuXHRcdFx0Y29uc3QgZWRpdG9yQ29udGFpbmVyID0gdGhpcy5jb250ZW50Q29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFx0XCIucXVpY2stY2FwdHVyZS1taW5pbWFsLWVkaXRvclwiXHJcblx0XHRcdCkgYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRcdGlmIChlZGl0b3JDb250YWluZXIpIHtcclxuXHRcdFx0XHR0aGlzLnNldHVwTWFya2Rvd25FZGl0b3IoZWRpdG9yQ29udGFpbmVyKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gRW5hYmxlIHVuaXZlcnNhbCBzdWdnZXN0IGZvciBtaW5pbWFsIG1vZGFsIGFmdGVyIGVkaXRvciBpcyBjcmVhdGVkXHJcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdGlmICh0aGlzLm1hcmtkb3duRWRpdG9yPy5lZGl0b3I/LmVkaXRvcikge1xyXG5cdFx0XHRcdFx0dGhpcy51bml2ZXJzYWxTdWdnZXN0ID1cclxuXHRcdFx0XHRcdFx0dGhpcy5zdWdnZXN0TWFuYWdlci5lbmFibGVGb3JNaW5pbWFsTW9kYWwoXHJcblx0XHRcdFx0XHRcdFx0dGhpcy5tYXJrZG93bkVkaXRvci5lZGl0b3IuZWRpdG9yXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR0aGlzLnVuaXZlcnNhbFN1Z2dlc3QuZW5hYmxlKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LCAxMDApO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlc3RvcmUgY29udGVudCBpZiBleGlzdHNcclxuXHRcdGlmICh0aGlzLm1hcmtkb3duRWRpdG9yICYmIHRoaXMuY2FwdHVyZWRDb250ZW50KSB7XHJcblx0XHRcdHRoaXMubWFya2Rvd25FZGl0b3Iuc2V0KHRoaXMuY2FwdHVyZWRDb250ZW50LCBmYWxzZSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDcmVhdGUgVUkgLSBjb25zaXN0ZW50IGxheW91dCBmb3IgYm90aCBtb2Rlc1xyXG5cdCAqL1xyXG5cdHByb3RlY3RlZCBjcmVhdGVVSSgpOiB2b2lkIHtcclxuXHRcdGlmICghdGhpcy5jb250ZW50Q29udGFpbmVyKSByZXR1cm47XHJcblxyXG5cdFx0Ly8gVGFyZ2V0IGluZGljYXRvciAoc2hvd3MgZGVzdGluYXRpb24gb3IgZmlsZSBuYW1lKVxyXG5cdFx0Y29uc3QgdGFyZ2V0Q29udGFpbmVyID0gdGhpcy5jb250ZW50Q29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJxdWljay1jYXB0dXJlLW1pbmltYWwtdGFyZ2V0LWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy50YXJnZXRJbmRpY2F0b3IgPSB0YXJnZXRDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInF1aWNrLWNhcHR1cmUtbWluaW1hbC10YXJnZXRcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEVkaXRvciBjb250YWluZXIgLSBzYW1lIGZvciBib3RoIG1vZGVzXHJcblx0XHRjb25zdCBlZGl0b3JXcmFwcGVyID0gdGhpcy5jb250ZW50Q29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJxdWljay1jYXB0dXJlLW1pbmltYWwtZWRpdG9yLWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5lZGl0b3JDb250YWluZXIgPSBlZGl0b3JXcmFwcGVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJxdWljay1jYXB0dXJlLW1vZGFsLWVkaXRvciBxdWljay1jYXB0dXJlLW1pbmltYWwtZWRpdG9yXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBRdWljayBhY3Rpb24gYnV0dG9ucyBjb250YWluZXIgKG9ubHkgZm9yIGNoZWNrYm94IG1vZGUpXHJcblx0XHRjb25zdCBidXR0b25zQ29udGFpbmVyID0gdGhpcy5jb250ZW50Q29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJxdWljay1jYXB0dXJlLW1pbmltYWwtcXVpY2stYWN0aW9uc1wiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5jcmVhdGVRdWlja0FjdGlvbkJ1dHRvbnMoYnV0dG9uc0NvbnRhaW5lcik7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHRhcmdldCBkaXNwbGF5IGJhc2VkIG9uIGluaXRpYWwgbW9kZVxyXG5cdFx0dGhpcy51cGRhdGVUYXJnZXREaXNwbGF5KCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgdGFyZ2V0IGRpc3BsYXkgYmFzZWQgb24gY3VycmVudCBtb2RlXHJcblx0ICovXHJcblx0cHJvdGVjdGVkIHVwZGF0ZVRhcmdldERpc3BsYXkoKTogdm9pZCB7XHJcblx0XHRpZiAoIXRoaXMudGFyZ2V0SW5kaWNhdG9yKSByZXR1cm47XHJcblxyXG5cdFx0dGhpcy50YXJnZXRJbmRpY2F0b3IuZW1wdHkoKTtcclxuXHJcblx0XHRpZiAodGhpcy5jdXJyZW50TW9kZSA9PT0gXCJjaGVja2JveFwiKSB7XHJcblx0XHRcdC8vIFNob3cgZWRpdGFibGUgdGFyZ2V0IGZpbGUgZm9yIGNoZWNrYm94IG1vZGVcclxuXHRcdFx0Y29uc3QgbGFiZWwgPSB0aGlzLnRhcmdldEluZGljYXRvci5jcmVhdGVTcGFuKHtcclxuXHRcdFx0XHRjbHM6IFwicXVpY2stY2FwdHVyZS10YXJnZXQtbGFiZWxcIixcclxuXHRcdFx0XHR0ZXh0OiB0KFwiVG86IFwiKSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBDcmVhdGUgY29udGVudGVkaXRhYmxlIGVsZW1lbnQgZm9yIHRhcmdldCBmaWxlIHBhdGhcclxuXHRcdFx0dGhpcy50YXJnZXRGaWxlRWwgPSB0aGlzLnRhcmdldEluZGljYXRvci5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdFx0Y2xzOiBcInF1aWNrLWNhcHR1cmUtdGFyZ2V0XCIsXHJcblx0XHRcdFx0YXR0cjoge1xyXG5cdFx0XHRcdFx0Y29udGVudGVkaXRhYmxlOiBcInRydWVcIixcclxuXHRcdFx0XHRcdHNwZWxsY2hlY2s6IFwiZmFsc2VcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHRleHQ6IHRoaXMudGVtcFRhcmdldEZpbGVQYXRoLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIEFkZCBGaWxlU3VnZ2VzdCBmb3IgZmlsZSBzZWxlY3Rpb25cclxuXHRcdFx0dGhpcy5maWxlU3VnZ2VzdCA9IG5ldyBGaWxlU3VnZ2VzdChcclxuXHRcdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0XHR0aGlzLnRhcmdldEZpbGVFbCxcclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUsXHJcblx0XHRcdFx0KGZpbGUpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMudGFyZ2V0RmlsZUVsIS50ZXh0Q29udGVudCA9IGZpbGUucGF0aDtcclxuXHRcdFx0XHRcdHRoaXMudGVtcFRhcmdldEZpbGVQYXRoID0gZmlsZS5wYXRoO1xyXG5cdFx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEudGFyZ2V0RmlsZSA9IGZpbGUucGF0aDtcclxuXHRcdFx0XHRcdHRoaXMubWFya2Rvd25FZGl0b3I/LmVkaXRvcj8uZm9jdXMoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgdGVtcFRhcmdldEZpbGVQYXRoIHdoZW4gbWFudWFsbHkgZWRpdGVkXHJcblx0XHRcdHRoaXMudGFyZ2V0RmlsZUVsLmFkZEV2ZW50TGlzdGVuZXIoXCJibHVyXCIsICgpID0+IHtcclxuXHRcdFx0XHRpZiAodGhpcy50YXJnZXRGaWxlRWwpIHtcclxuXHRcdFx0XHRcdHRoaXMudGVtcFRhcmdldEZpbGVQYXRoID0gdGhpcy50YXJnZXRGaWxlRWwudGV4dENvbnRlbnQgfHwgXCJcIjtcclxuXHRcdFx0XHRcdHRoaXMudGFza01ldGFkYXRhLnRhcmdldEZpbGUgPSB0aGlzLnRlbXBUYXJnZXRGaWxlUGF0aDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gU2hvdyBxdWljayBhY3Rpb24gYnV0dG9uc1xyXG5cdFx0XHRjb25zdCBidXR0b25zQ29udGFpbmVyID0gdGhpcy5jb250ZW50Q29udGFpbmVyPy5xdWVyeVNlbGVjdG9yKFwiLnF1aWNrLWNhcHR1cmUtbWluaW1hbC1xdWljay1hY3Rpb25zXCIpO1xyXG5cdFx0XHRpZiAoYnV0dG9uc0NvbnRhaW5lcikge1xyXG5cdFx0XHRcdChidXR0b25zQ29udGFpbmVyIGFzIEhUTUxFbGVtZW50KS5zdHlsZS5kaXNwbGF5ID0gXCJmbGV4XCI7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIFNob3cgZmlsZSBuYW1lIGlucHV0IGZvciBmaWxlIG1vZGUgd2l0aCByZXNvbHZlZCBwYXRoXHJcblx0XHRcdGNvbnN0IGxhYmVsID0gdGhpcy50YXJnZXRJbmRpY2F0b3IuY3JlYXRlU3Bhbih7XHJcblx0XHRcdFx0Y2xzOiBcInF1aWNrLWNhcHR1cmUtdGFyZ2V0LWxhYmVsXCIsXHJcblx0XHRcdFx0dGV4dDogdChcIlNhdmUgYXM6IFwiKSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBHZXQgdGhlIHRlbXBsYXRlIHZhbHVlIGFuZCByZXNvbHZlIGl0IGltbWVkaWF0ZWx5XHJcblx0XHRcdGNvbnN0IHRlbXBsYXRlVmFsdWUgPSB0aGlzLnRhc2tNZXRhZGF0YS5jdXN0b21GaWxlTmFtZSB8fCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUuZGVmYXVsdEZpbGVOYW1lVGVtcGxhdGUgfHwgXCJ7e0RBVEU6WVlZWS1NTS1ERH19IC0gXCI7XHJcblx0XHRcdGxldCByZXNvbHZlZFBhdGggPSBwcm9jZXNzRGF0ZVRlbXBsYXRlcyh0ZW1wbGF0ZVZhbHVlKTtcclxuXHJcblx0XHRcdC8vIEFkZCBkZWZhdWx0IGZvbGRlciBpZiBjb25maWd1cmVkXHJcblx0XHRcdGNvbnN0IGRlZmF1bHRGb2xkZXIgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUuY3JlYXRlRmlsZU1vZGU/LmRlZmF1bHRGb2xkZXI/LnRyaW0oKTtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzPy5maWxlU291cmNlPy5lbmFibGVkICYmXHJcblx0XHRcdFx0ZGVmYXVsdEZvbGRlciAmJlxyXG5cdFx0XHRcdCFyZXNvbHZlZFBhdGguaW5jbHVkZXMoXCIvXCIpXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHJlc29sdmVkUGF0aCA9IGAke2RlZmF1bHRGb2xkZXJ9LyR7cmVzb2x2ZWRQYXRofWA7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEFkZCAubWQgZXh0ZW5zaW9uIGlmIG5vdCBwcmVzZW50XHJcblx0XHRcdGlmICghcmVzb2x2ZWRQYXRoLmVuZHNXaXRoKFwiLm1kXCIpKSB7XHJcblx0XHRcdFx0cmVzb2x2ZWRQYXRoICs9IFwiLm1kXCI7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENyZWF0ZSBpbnB1dCB3aXRoIHJlc29sdmVkIHBhdGggKGVkaXRhYmxlKVxyXG5cdFx0XHR0aGlzLmZpbGVOYW1lSW5wdXQgPSB0aGlzLnRhcmdldEluZGljYXRvci5jcmVhdGVFbChcImlucHV0XCIsIHtcclxuXHRcdFx0XHRjbHM6IFwicXVpY2stY2FwdHVyZS1taW5pbWFsLWZpbGUtaW5wdXRcIixcclxuXHRcdFx0XHRhdHRyOiB7XHJcblx0XHRcdFx0XHR0eXBlOiBcInRleHRcIixcclxuXHRcdFx0XHRcdHBsYWNlaG9sZGVyOiB0KFwiRW50ZXIgZmlsZSBuYW1lLi4uXCIpLFxyXG5cdFx0XHRcdFx0dmFsdWU6IHJlc29sdmVkUGF0aCxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIFVwZGF0ZSB0aGUgY3VzdG9tRmlsZU5hbWUgd2hlbiBpbnB1dCBjaGFuZ2VzXHJcblx0XHRcdHRoaXMuZmlsZU5hbWVJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiaW5wdXRcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdGlmICh0aGlzLmZpbGVOYW1lSW5wdXQpIHtcclxuXHRcdFx0XHRcdHRoaXMudGFza01ldGFkYXRhLmN1c3RvbUZpbGVOYW1lID0gdGhpcy5maWxlTmFtZUlucHV0LnZhbHVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBLZWVwIHF1aWNrIGFjdGlvbiBidXR0b25zIHZpc2libGUgaW4gZmlsZSBtb2RlXHJcblx0XHRcdGNvbnN0IGJ1dHRvbnNDb250YWluZXIgPSB0aGlzLmNvbnRlbnRDb250YWluZXI/LnF1ZXJ5U2VsZWN0b3IoXCIucXVpY2stY2FwdHVyZS1taW5pbWFsLXF1aWNrLWFjdGlvbnNcIik7XHJcblx0XHRcdGlmIChidXR0b25zQ29udGFpbmVyKSB7XHJcblx0XHRcdFx0KGJ1dHRvbnNDb250YWluZXIgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLmRpc3BsYXkgPSBcImZsZXhcIjtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ3JlYXRlIHF1aWNrIGFjdGlvbiBidXR0b25zXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjcmVhdGVRdWlja0FjdGlvbkJ1dHRvbnMoY29udGFpbmVyOiBIVE1MRWxlbWVudCk6IHZvaWQge1xyXG5cdFx0Y29uc3QgbGVmdENvbnRhaW5lciA9IGNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwicXVpY2stYWN0aW9ucy1sZWZ0XCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLmRhdGVCdXR0b24gPSBsZWZ0Q29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0Y2xzOiBbXCJxdWljay1hY3Rpb24tYnV0dG9uXCIsIFwiY2xpY2thYmxlLWljb25cIl0sXHJcblx0XHRcdGF0dHI6IHtcImFyaWEtbGFiZWxcIjogdChcIlNldCBkYXRlXCIpfSxcclxuXHRcdH0pO1xyXG5cdFx0c2V0SWNvbih0aGlzLmRhdGVCdXR0b24sIFwiY2FsZW5kYXJcIik7XHJcblx0XHR0aGlzLmRhdGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuc2hvd0RhdGVQaWNrZXIoKSk7XHJcblx0XHR0aGlzLnVwZGF0ZUJ1dHRvblN0YXRlKHRoaXMuZGF0ZUJ1dHRvbiwgISF0aGlzLnRhc2tNZXRhZGF0YS5kdWVEYXRlKTtcclxuXHJcblx0XHR0aGlzLnByaW9yaXR5QnV0dG9uID0gbGVmdENvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdGNsczogW1wicXVpY2stYWN0aW9uLWJ1dHRvblwiLCBcImNsaWNrYWJsZS1pY29uXCJdLFxyXG5cdFx0XHRhdHRyOiB7XCJhcmlhLWxhYmVsXCI6IHQoXCJTZXQgcHJpb3JpdHlcIil9LFxyXG5cdFx0fSk7XHJcblx0XHRzZXRJY29uKHRoaXMucHJpb3JpdHlCdXR0b24sIFwiemFwXCIpO1xyXG5cdFx0dGhpcy5wcmlvcml0eUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT5cclxuXHRcdFx0dGhpcy5zaG93UHJpb3JpdHlNZW51KClcclxuXHRcdCk7XHJcblx0XHR0aGlzLnVwZGF0ZUJ1dHRvblN0YXRlKFxyXG5cdFx0XHR0aGlzLnByaW9yaXR5QnV0dG9uLFxyXG5cdFx0XHQhIXRoaXMudGFza01ldGFkYXRhLnByaW9yaXR5XHJcblx0XHQpO1xyXG5cclxuXHRcdHRoaXMubG9jYXRpb25CdXR0b24gPSBsZWZ0Q29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0Y2xzOiBbXCJxdWljay1hY3Rpb24tYnV0dG9uXCIsIFwiY2xpY2thYmxlLWljb25cIl0sXHJcblx0XHRcdGF0dHI6IHtcImFyaWEtbGFiZWxcIjogdChcIlNldCBsb2NhdGlvblwiKX0sXHJcblx0XHR9KTtcclxuXHRcdHNldEljb24odGhpcy5sb2NhdGlvbkJ1dHRvbiwgXCJmb2xkZXJcIik7XHJcblx0XHR0aGlzLmxvY2F0aW9uQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PlxyXG5cdFx0XHR0aGlzLnNob3dMb2NhdGlvbk1lbnUoKVxyXG5cdFx0KTtcclxuXHRcdHRoaXMudXBkYXRlQnV0dG9uU3RhdGUoXHJcblx0XHRcdHRoaXMubG9jYXRpb25CdXR0b24sXHJcblx0XHRcdHRoaXMudGFza01ldGFkYXRhLmxvY2F0aW9uICE9PVxyXG5cdFx0XHQodGhpcy5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLnRhcmdldFR5cGUgfHwgXCJmaXhlZFwiKVxyXG5cdFx0KTtcclxuXHJcblx0XHR0aGlzLnRhZ0J1dHRvbiA9IGxlZnRDb250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHRjbHM6IFtcInF1aWNrLWFjdGlvbi1idXR0b25cIiwgXCJjbGlja2FibGUtaWNvblwiXSxcclxuXHRcdFx0YXR0cjoge1wiYXJpYS1sYWJlbFwiOiB0KFwiQWRkIHRhZ3NcIil9LFxyXG5cdFx0fSk7XHJcblx0XHRzZXRJY29uKHRoaXMudGFnQnV0dG9uLCBcInRhZ1wiKTtcclxuXHRcdHRoaXMudGFnQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHR9KTtcclxuXHRcdHRoaXMudXBkYXRlQnV0dG9uU3RhdGUoXHJcblx0XHRcdHRoaXMudGFnQnV0dG9uLFxyXG5cdFx0XHQhISh0aGlzLnRhc2tNZXRhZGF0YS50YWdzICYmIHRoaXMudGFza01ldGFkYXRhLnRhZ3MubGVuZ3RoID4gMClcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTZXR1cCBtYXJrZG93biBlZGl0b3JcclxuXHQgKi9cclxuXHRwcml2YXRlIHNldHVwTWFya2Rvd25FZGl0b3IoY29udGFpbmVyOiBIVE1MRWxlbWVudCk6IHZvaWQge1xyXG5cdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdHRoaXMubWFya2Rvd25FZGl0b3IgPSBjcmVhdGVFbWJlZGRhYmxlTWFya2Rvd25FZGl0b3IoXHJcblx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0Y29udGFpbmVyLFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHBsYWNlaG9sZGVyOiB0KFwiRW50ZXIgeW91ciBjb250ZW50Li4uXCIpLFxyXG5cdFx0XHRcdFx0c2luZ2xlTGluZTogZmFsc2UsIC8vIEFsbG93IG11bHRpbGluZSBmb3IgYm90aCBtb2Rlc1xyXG5cclxuXHRcdFx0XHRcdG9uRW50ZXI6IChlZGl0b3IsIG1vZCwgc2hpZnQpID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8gQ21kL0N0cmwrRW50ZXIgYWx3YXlzIHN1Ym1pdHNcclxuXHRcdFx0XHRcdFx0aWYgKG1vZCkge1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMuaGFuZGxlU3VibWl0KCk7XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0Ly8gSW4gY2hlY2tib3ggbW9kZSwgcGxhaW4gRW50ZXIgYWxzbyBzdWJtaXRzIGZvciBxdWljayBjYXB0dXJlXHJcblx0XHRcdFx0XHRcdGlmICh0aGlzLmN1cnJlbnRNb2RlID09PSBcImNoZWNrYm94XCIgJiYgIXNoaWZ0KSB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5oYW5kbGVTdWJtaXQoKTtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHQvLyBJbiBmaWxlIG1vZGUgb3Igc2hpZnQrZW50ZXIsIGNyZWF0ZSBuZXcgbGluZVxyXG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdFx0XHR9LFxyXG5cclxuXHRcdFx0XHRcdG9uRXNjYXBlOiAoZWRpdG9yKSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMuY2xvc2UoKTtcclxuXHRcdFx0XHRcdH0sXHJcblxyXG5cdFx0XHRcdFx0b25DaGFuZ2U6ICh1cGRhdGUpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5jYXB0dXJlZENvbnRlbnQgPSB0aGlzLm1hcmtkb3duRWRpdG9yPy52YWx1ZSB8fCBcIlwiO1xyXG5cdFx0XHRcdFx0XHQvLyBQYXJzZSBjb250ZW50IGFuZCB1cGRhdGUgYnV0dG9uIHN0YXRlcyBvbmx5IGluIGNoZWNrYm94IG1vZGVcclxuXHRcdFx0XHRcdFx0aWYgKHRoaXMuY3VycmVudE1vZGUgPT09IFwiY2hlY2tib3hcIikge1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMucGFyc2VDb250ZW50QW5kVXBkYXRlQnV0dG9ucygpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH1cclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIEZvY3VzIHRoZSBlZGl0b3JcclxuXHRcdFx0dGhpcy5tYXJrZG93bkVkaXRvcj8uZWRpdG9yPy5mb2N1cygpO1xyXG5cclxuXHRcdFx0Ly8gUmVzdG9yZSBjb250ZW50IGlmIGV4aXN0c1xyXG5cdFx0XHRpZiAodGhpcy5jYXB0dXJlZENvbnRlbnQgJiYgdGhpcy5tYXJrZG93bkVkaXRvcikge1xyXG5cdFx0XHRcdHRoaXMubWFya2Rvd25FZGl0b3Iuc2V0KHRoaXMuY2FwdHVyZWRDb250ZW50LCBmYWxzZSk7XHJcblx0XHRcdH1cclxuXHRcdH0sIDUwKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBidXR0b24gc3RhdGVcclxuXHQgKi9cclxuXHRwcml2YXRlIHVwZGF0ZUJ1dHRvblN0YXRlKFxyXG5cdFx0YnV0dG9uOiBIVE1MQnV0dG9uRWxlbWVudCxcclxuXHRcdGlzQWN0aXZlOiBib29sZWFuXHJcblx0KTogdm9pZCB7XHJcblx0XHRpZiAoaXNBY3RpdmUpIHtcclxuXHRcdFx0YnV0dG9uLmFkZENsYXNzKFwiYWN0aXZlXCIpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0YnV0dG9uLnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2hvdyBtZW51IGF0IHNwZWNpZmllZCBjb29yZGluYXRlc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgc2hvd01lbnVBdENvb3JkcyhtZW51OiBNZW51LCB4OiBudW1iZXIsIHk6IG51bWJlcik6IHZvaWQge1xyXG5cdFx0bWVudS5zaG93QXRNb3VzZUV2ZW50KFxyXG5cdFx0XHRuZXcgTW91c2VFdmVudChcImNsaWNrXCIsIHtcclxuXHRcdFx0XHRjbGllbnRYOiB4LFxyXG5cdFx0XHRcdGNsaWVudFk6IHksXHJcblx0XHRcdH0pXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0Ly8gRGF0ZSBwaWNrZXIgbWV0aG9kc1xyXG5cdHB1YmxpYyBzaG93RGF0ZVBpY2tlckF0Q3Vyc29yKGN1cnNvckNvb3JkczogYW55LCBjdXJzb3I6IEVkaXRvclBvc2l0aW9uKSB7XHJcblx0XHR0aGlzLnNob3dEYXRlUGlja2VyKGN1cnNvciwgY3Vyc29yQ29vcmRzKTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzaG93RGF0ZVBpY2tlcihjdXJzb3I/OiBFZGl0b3JQb3NpdGlvbiwgY29vcmRzPzogYW55KSB7XHJcblx0XHRjb25zdCBxdWlja0RhdGVzID0gW1xyXG5cdFx0XHR7bGFiZWw6IHQoXCJUb21vcnJvd1wiKSwgZGF0ZTogbW9tZW50KCkuYWRkKDEsIFwiZGF5XCIpLnRvRGF0ZSgpfSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGxhYmVsOiB0KFwiRGF5IGFmdGVyIHRvbW9ycm93XCIpLFxyXG5cdFx0XHRcdGRhdGU6IG1vbWVudCgpLmFkZCgyLCBcImRheVwiKS50b0RhdGUoKSxcclxuXHRcdFx0fSxcclxuXHRcdFx0e2xhYmVsOiB0KFwiTmV4dCB3ZWVrXCIpLCBkYXRlOiBtb21lbnQoKS5hZGQoMSwgXCJ3ZWVrXCIpLnRvRGF0ZSgpfSxcclxuXHRcdFx0e2xhYmVsOiB0KFwiTmV4dCBtb250aFwiKSwgZGF0ZTogbW9tZW50KCkuYWRkKDEsIFwibW9udGhcIikudG9EYXRlKCl9LFxyXG5cdFx0XTtcclxuXHJcblx0XHRjb25zdCBtZW51ID0gbmV3IE1lbnUoKTtcclxuXHJcblx0XHRxdWlja0RhdGVzLmZvckVhY2goKHF1aWNrRGF0ZSkgPT4ge1xyXG5cdFx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRpdGVtLnNldFRpdGxlKHF1aWNrRGF0ZS5sYWJlbCk7XHJcblx0XHRcdFx0aXRlbS5zZXRJY29uKFwiY2FsZW5kYXJcIik7XHJcblx0XHRcdFx0aXRlbS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMudGFza01ldGFkYXRhLmR1ZURhdGUgPSBxdWlja0RhdGUuZGF0ZTtcclxuXHRcdFx0XHRcdHRoaXMudXBkYXRlQnV0dG9uU3RhdGUodGhpcy5kYXRlQnV0dG9uISwgdHJ1ZSk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gSWYgY2FsbGVkIGZyb20gc3VnZ2VzdCwgcmVwbGFjZSB0aGUgfiB3aXRoIGRhdGUgdGV4dFxyXG5cdFx0XHRcdFx0aWYgKGN1cnNvciAmJiB0aGlzLm1hcmtkb3duRWRpdG9yKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMucmVwbGFjZUF0Q3Vyc29yKFxyXG5cdFx0XHRcdFx0XHRcdGN1cnNvcixcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmZvcm1hdERhdGUocXVpY2tEYXRlLmRhdGUpXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0bWVudS5hZGRTZXBhcmF0b3IoKTtcclxuXHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJDaG9vc2UgZGF0ZS4uLlwiKSk7XHJcblx0XHRcdGl0ZW0uc2V0SWNvbihcImNhbGVuZGFyLWRheXNcIik7XHJcblx0XHRcdGl0ZW0ub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0Ly8gVE9ETzogSW1wbGVtZW50IGZ1bGwgZGF0ZSBwaWNrZXIgaW50ZWdyYXRpb25cclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBTaG93IG1lbnVcclxuXHRcdGlmIChjb29yZHMpIHtcclxuXHRcdFx0dGhpcy5zaG93TWVudUF0Q29vcmRzKG1lbnUsIGNvb3Jkcy5sZWZ0LCBjb29yZHMudG9wKTtcclxuXHRcdH0gZWxzZSBpZiAodGhpcy5kYXRlQnV0dG9uKSB7XHJcblx0XHRcdGNvbnN0IHJlY3QgPSB0aGlzLmRhdGVCdXR0b24uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcblx0XHRcdHRoaXMuc2hvd01lbnVBdENvb3JkcyhtZW51LCByZWN0LmxlZnQsIHJlY3QuYm90dG9tICsgNSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBQcmlvcml0eSBtZW51IG1ldGhvZHNcclxuXHRwdWJsaWMgc2hvd1ByaW9yaXR5TWVudUF0Q3Vyc29yKGN1cnNvckNvb3JkczogYW55LCBjdXJzb3I6IEVkaXRvclBvc2l0aW9uKSB7XHJcblx0XHR0aGlzLnNob3dQcmlvcml0eU1lbnUoY3Vyc29yLCBjdXJzb3JDb29yZHMpO1xyXG5cdH1cclxuXHJcblx0cHVibGljIHNob3dQcmlvcml0eU1lbnUoY3Vyc29yPzogRWRpdG9yUG9zaXRpb24sIGNvb3Jkcz86IGFueSkge1xyXG5cdFx0Y29uc3QgcHJpb3JpdGllcyA9IFtcclxuXHRcdFx0e2xldmVsOiA1LCBsYWJlbDogdChcIkhpZ2hlc3RcIiksIGljb246IFwi8J+UulwifSxcclxuXHRcdFx0e2xldmVsOiA0LCBsYWJlbDogdChcIkhpZ2hcIiksIGljb246IFwi4o+rXCJ9LFxyXG5cdFx0XHR7bGV2ZWw6IDMsIGxhYmVsOiB0KFwiTWVkaXVtXCIpLCBpY29uOiBcIvCflLxcIn0sXHJcblx0XHRcdHtsZXZlbDogMiwgbGFiZWw6IHQoXCJMb3dcIiksIGljb246IFwi8J+UvVwifSxcclxuXHRcdFx0e2xldmVsOiAxLCBsYWJlbDogdChcIkxvd2VzdFwiKSwgaWNvbjogXCLij6xcIn0sXHJcblx0XHRdO1xyXG5cclxuXHRcdGNvbnN0IG1lbnUgPSBuZXcgTWVudSgpO1xyXG5cclxuXHRcdHByaW9yaXRpZXMuZm9yRWFjaCgocHJpb3JpdHkpID0+IHtcclxuXHRcdFx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdFx0aXRlbS5zZXRUaXRsZShgJHtwcmlvcml0eS5pY29ufSAke3ByaW9yaXR5LmxhYmVsfWApO1xyXG5cdFx0XHRcdGl0ZW0ub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS5wcmlvcml0eSA9IHByaW9yaXR5LmxldmVsO1xyXG5cdFx0XHRcdFx0dGhpcy51cGRhdGVCdXR0b25TdGF0ZSh0aGlzLnByaW9yaXR5QnV0dG9uISwgdHJ1ZSk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gSWYgY2FsbGVkIGZyb20gc3VnZ2VzdCwgcmVwbGFjZSB0aGUgISB3aXRoIHByaW9yaXR5IGljb25cclxuXHRcdFx0XHRcdGlmIChjdXJzb3IgJiYgdGhpcy5tYXJrZG93bkVkaXRvcikge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnJlcGxhY2VBdEN1cnNvcihjdXJzb3IsIHByaW9yaXR5Lmljb24pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFNob3cgbWVudVxyXG5cdFx0aWYgKGNvb3Jkcykge1xyXG5cdFx0XHR0aGlzLnNob3dNZW51QXRDb29yZHMobWVudSwgY29vcmRzLmxlZnQsIGNvb3Jkcy50b3ApO1xyXG5cdFx0fSBlbHNlIGlmICh0aGlzLnByaW9yaXR5QnV0dG9uKSB7XHJcblx0XHRcdGNvbnN0IHJlY3QgPSB0aGlzLnByaW9yaXR5QnV0dG9uLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG5cdFx0XHR0aGlzLnNob3dNZW51QXRDb29yZHMobWVudSwgcmVjdC5sZWZ0LCByZWN0LmJvdHRvbSArIDUpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gTG9jYXRpb24gbWVudSBtZXRob2RzXHJcblx0cHVibGljIHNob3dMb2NhdGlvbk1lbnVBdEN1cnNvcihjdXJzb3JDb29yZHM6IGFueSwgY3Vyc29yOiBFZGl0b3JQb3NpdGlvbikge1xyXG5cdFx0dGhpcy5zaG93TG9jYXRpb25NZW51KGN1cnNvciwgY3Vyc29yQ29vcmRzKTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzaG93TG9jYXRpb25NZW51KGN1cnNvcj86IEVkaXRvclBvc2l0aW9uLCBjb29yZHM/OiBhbnkpIHtcclxuXHRcdGNvbnN0IG1lbnUgPSBuZXcgTWVudSgpO1xyXG5cclxuXHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJGaXhlZCBsb2NhdGlvblwiKSk7XHJcblx0XHRcdGl0ZW0uc2V0SWNvbihcImZpbGVcIik7XHJcblx0XHRcdGl0ZW0ub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEubG9jYXRpb24gPSBcImZpeGVkXCI7XHJcblx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEudGFyZ2V0RmlsZSA9XHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUudGFyZ2V0RmlsZTtcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZUJ1dHRvblN0YXRlKFxyXG5cdFx0XHRcdFx0dGhpcy5sb2NhdGlvbkJ1dHRvbiEsXHJcblx0XHRcdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS5sb2NhdGlvbiAhPT1cclxuXHRcdFx0XHRcdCh0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUudGFyZ2V0VHlwZSB8fFxyXG5cdFx0XHRcdFx0XHRcImZpeGVkXCIpXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0Ly8gSWYgY2FsbGVkIGZyb20gc3VnZ2VzdCwgcmVwbGFjZSB0aGUg8J+TgSB3aXRoIGZpbGUgdGV4dFxyXG5cdFx0XHRcdGlmIChjdXJzb3IgJiYgdGhpcy5tYXJrZG93bkVkaXRvcikge1xyXG5cdFx0XHRcdFx0dGhpcy5yZXBsYWNlQXRDdXJzb3IoY3Vyc29yLCB0KFwiRml4ZWQgbG9jYXRpb25cIikpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0aXRlbS5zZXRUaXRsZSh0KFwiRGFpbHkgbm90ZVwiKSk7XHJcblx0XHRcdGl0ZW0uc2V0SWNvbihcImNhbGVuZGFyXCIpO1xyXG5cdFx0XHRpdGVtLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMudGFza01ldGFkYXRhLmxvY2F0aW9uID0gXCJkYWlseS1ub3RlXCI7XHJcblx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEudGFyZ2V0RmlsZSA9IHRoaXMuZ2V0RGFpbHlOb3RlRmlsZSgpO1xyXG5cdFx0XHRcdHRoaXMudXBkYXRlQnV0dG9uU3RhdGUoXHJcblx0XHRcdFx0XHR0aGlzLmxvY2F0aW9uQnV0dG9uISxcclxuXHRcdFx0XHRcdHRoaXMudGFza01ldGFkYXRhLmxvY2F0aW9uICE9PVxyXG5cdFx0XHRcdFx0KHRoaXMucGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZT8udGFyZ2V0VHlwZSB8fFxyXG5cdFx0XHRcdFx0XHRcImZpeGVkXCIpXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0Ly8gSWYgY2FsbGVkIGZyb20gc3VnZ2VzdCwgcmVwbGFjZSB0aGUg8J+TgSB3aXRoIGRhaWx5IG5vdGUgdGV4dFxyXG5cdFx0XHRcdGlmIChjdXJzb3IgJiYgdGhpcy5tYXJrZG93bkVkaXRvcikge1xyXG5cdFx0XHRcdFx0dGhpcy5yZXBsYWNlQXRDdXJzb3IoY3Vyc29yLCB0KFwiRGFpbHkgbm90ZVwiKSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIE9ubHkgc2hvdyBjdXN0b20gZmlsZSBvcHRpb24gd2hlbiBGaWxlU291cmNlIGlzIGVuYWJsZWRcclxuXHRcdGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncz8uZmlsZVNvdXJjZT8uZW5hYmxlZCkge1xyXG5cdFx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJDdXN0b20gZmlsZVwiKSk7XHJcblx0XHRcdFx0aXRlbS5zZXRJY29uKFwiZmlsZS1wbHVzXCIpO1xyXG5cdFx0XHRcdGl0ZW0ub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS5sb2NhdGlvbiA9IFwiZmlsZVwiO1xyXG5cdFx0XHRcdFx0Ly8gU3dpdGNoIHRvIGZpbGUgbW9kZSBmb3IgY3VzdG9tIGZpbGUgY3JlYXRpb25cclxuXHRcdFx0XHRcdHRoaXMuc3dpdGNoTW9kZShcImZpbGVcIik7XHJcblx0XHRcdFx0XHQvLyBJZiBjYWxsZWQgZnJvbSBzdWdnZXN0LCByZXBsYWNlIHRoZSDwn5OBIHdpdGggY3VzdG9tIGZpbGUgdGV4dFxyXG5cdFx0XHRcdFx0aWYgKGN1cnNvciAmJiB0aGlzLm1hcmtkb3duRWRpdG9yKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMucmVwbGFjZUF0Q3Vyc29yKGN1cnNvciwgdChcIkN1c3RvbSBmaWxlXCIpKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU2hvdyBtZW51XHJcblx0XHRpZiAoY29vcmRzKSB7XHJcblx0XHRcdHRoaXMuc2hvd01lbnVBdENvb3JkcyhtZW51LCBjb29yZHMubGVmdCwgY29vcmRzLnRvcCk7XHJcblx0XHR9IGVsc2UgaWYgKHRoaXMubG9jYXRpb25CdXR0b24pIHtcclxuXHRcdFx0Y29uc3QgcmVjdCA9IHRoaXMubG9jYXRpb25CdXR0b24uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcblx0XHRcdHRoaXMuc2hvd01lbnVBdENvb3JkcyhtZW51LCByZWN0LmxlZnQsIHJlY3QuYm90dG9tICsgNSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBUYWcgc2VsZWN0b3IgbWV0aG9kc1xyXG5cdHB1YmxpYyBzaG93VGFnU2VsZWN0b3JBdEN1cnNvcihjdXJzb3JDb29yZHM6IGFueSwgY3Vyc29yOiBFZGl0b3JQb3NpdGlvbikge1xyXG5cdFx0Ly8gVE9ETzogSW1wbGVtZW50IHRhZyBzZWxlY3RvclxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVwbGFjZSB0ZXh0IGF0IGN1cnNvciBwb3NpdGlvblxyXG5cdCAqL1xyXG5cdHByaXZhdGUgcmVwbGFjZUF0Q3Vyc29yKGN1cnNvcjogRWRpdG9yUG9zaXRpb24sIHJlcGxhY2VtZW50OiBzdHJpbmcpIHtcclxuXHRcdGlmICghdGhpcy5tYXJrZG93bkVkaXRvcikgcmV0dXJuO1xyXG5cclxuXHRcdC8vIFJlcGxhY2UgdGhlIGNoYXJhY3RlciBhdCBjdXJzb3IgcG9zaXRpb24gdXNpbmcgQ29kZU1pcnJvciBBUElcclxuXHRcdGNvbnN0IGNtID0gKHRoaXMubWFya2Rvd25FZGl0b3IuZWRpdG9yIGFzIGFueSkuY207XHJcblx0XHRpZiAoY20gJiYgY20ucmVwbGFjZVJhbmdlKSB7XHJcblx0XHRcdGNtLnJlcGxhY2VSYW5nZShcclxuXHRcdFx0XHRyZXBsYWNlbWVudCxcclxuXHRcdFx0XHR7bGluZTogY3Vyc29yLmxpbmUsIGNoOiBjdXJzb3IuY2ggLSAxfSxcclxuXHRcdFx0XHRjdXJzb3JcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0YXJnZXQgZmlsZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZ2V0VGFyZ2V0RmlsZSgpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3Qgc2V0dGluZ3MgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmU7XHJcblx0XHRpZiAodGhpcy50YXNrTWV0YWRhdGEubG9jYXRpb24gPT09IFwiZGFpbHktbm90ZVwiKSB7XHJcblx0XHRcdHJldHVybiB0aGlzLmdldERhaWx5Tm90ZUZpbGUoKTtcclxuXHRcdH1cclxuXHRcdHJldHVybiBzZXR0aW5ncy50YXJnZXRGaWxlO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGRhaWx5IG5vdGUgZmlsZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZ2V0RGFpbHlOb3RlRmlsZSgpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3Qgc2V0dGluZ3MgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUuZGFpbHlOb3RlU2V0dGluZ3M7XHJcblx0XHRjb25zdCBkYXRlU3RyID0gbW9tZW50KCkuZm9ybWF0KHNldHRpbmdzLmZvcm1hdCk7XHJcblx0XHRyZXR1cm4gc2V0dGluZ3MuZm9sZGVyXHJcblx0XHRcdD8gYCR7c2V0dGluZ3MuZm9sZGVyfS8ke2RhdGVTdHJ9Lm1kYFxyXG5cdFx0XHQ6IGAke2RhdGVTdHJ9Lm1kYDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFByb2Nlc3MgY29udGVudCB3aXRoIG1ldGFkYXRhIGJhc2VkIG9uIHNhdmUgc3RyYXRlZ3lcclxuXHQgKi9cclxuXHRwcm90ZWN0ZWQgcHJvY2Vzc0NvbnRlbnRXaXRoTWV0YWRhdGEoY29udGVudDogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdGlmICghY29udGVudC50cmltKCkpIHJldHVybiBcIlwiO1xyXG5cclxuXHRcdC8vIEZvciBmaWxlIG1vZGUsIGp1c3QgcmV0dXJuIGNvbnRlbnQgYXMtaXNcclxuXHRcdGlmICh0aGlzLmN1cnJlbnRNb2RlID09PSBcImZpbGVcIikge1xyXG5cdFx0XHRyZXR1cm4gY29udGVudDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBGb3IgY2hlY2tib3ggbW9kZSwgZm9ybWF0IGFzIHRhc2tzXHJcblx0XHRjb25zdCBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoXCJcXG5cIik7XHJcblx0XHRjb25zdCBwcm9jZXNzZWRMaW5lcyA9IGxpbmVzLm1hcCgobGluZSkgPT4ge1xyXG5cdFx0XHRjb25zdCB0cmltbWVkID0gbGluZS50cmltKCk7XHJcblx0XHRcdGlmICh0cmltbWVkICYmICF0cmltbWVkLnN0YXJ0c1dpdGgoXCItIFtcIikpIHtcclxuXHRcdFx0XHQvLyBVc2UgY2xlYXJBbGxNYXJrcyB0byBjb21wbGV0ZWx5IGNsZWFuIHRoZSBjb250ZW50XHJcblx0XHRcdFx0Y29uc3QgY2xlYW5lZENvbnRlbnQgPSBjbGVhckFsbE1hcmtzKHRyaW1tZWQpO1xyXG5cdFx0XHRcdHJldHVybiBgLSBbIF0gJHtjbGVhbmVkQ29udGVudH1gO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBsaW5lO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQWRkIG1ldGFkYXRhIGZvciBjaGVja2JveCBtb2RlXHJcblx0XHRyZXR1cm4gdGhpcy5hZGRNZXRhZGF0YVRvQ29udGVudChwcm9jZXNzZWRMaW5lcy5qb2luKFwiXFxuXCIpKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEFkZCBtZXRhZGF0YSB0byBjb250ZW50XHJcblx0ICovXHJcblx0cHJpdmF0ZSBhZGRNZXRhZGF0YVRvQ29udGVudChjb250ZW50OiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgbWV0YWRhdGE6IHN0cmluZ1tdID0gW107XHJcblxyXG5cdFx0Ly8gQWRkIGRhdGUgbWV0YWRhdGFcclxuXHRcdGlmICh0aGlzLnRhc2tNZXRhZGF0YS5kdWVEYXRlKSB7XHJcblx0XHRcdG1ldGFkYXRhLnB1c2goYPCfk4UgJHt0aGlzLmZvcm1hdERhdGUodGhpcy50YXNrTWV0YWRhdGEuZHVlRGF0ZSl9YCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWRkIHByaW9yaXR5IG1ldGFkYXRhXHJcblx0XHRpZiAodGhpcy50YXNrTWV0YWRhdGEucHJpb3JpdHkpIHtcclxuXHRcdFx0Y29uc3QgcHJpb3JpdHlJY29ucyA9IFtcIuKPrFwiLCBcIvCflL1cIiwgXCLwn5S8XCIsIFwi4o+rXCIsIFwi8J+UulwiXTtcclxuXHRcdFx0bWV0YWRhdGEucHVzaChwcmlvcml0eUljb25zW3RoaXMudGFza01ldGFkYXRhLnByaW9yaXR5IC0gMV0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFkZCB0YWdzXHJcblx0XHRpZiAodGhpcy50YXNrTWV0YWRhdGEudGFncyAmJiB0aGlzLnRhc2tNZXRhZGF0YS50YWdzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0bWV0YWRhdGEucHVzaCguLi50aGlzLnRhc2tNZXRhZGF0YS50YWdzLm1hcCgodGFnKSA9PiBgIyR7dGFnfWApKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGQgbWV0YWRhdGEgdG8gY29udGVudFxyXG5cdFx0aWYgKG1ldGFkYXRhLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0cmV0dXJuIGAke2NvbnRlbnR9ICR7bWV0YWRhdGEuam9pbihcIiBcIil9YDtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gY29udGVudDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFBhcnNlIGNvbnRlbnQgYW5kIHVwZGF0ZSBidXR0b24gc3RhdGVzXHJcblx0ICovXHJcblx0cHVibGljIHBhcnNlQ29udGVudEFuZFVwZGF0ZUJ1dHRvbnMoKTogdm9pZCB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBjb250ZW50ID0gdGhpcy5jYXB0dXJlZENvbnRlbnQudHJpbSgpO1xyXG5cdFx0XHRpZiAoIWNvbnRlbnQpIHtcclxuXHRcdFx0XHQvLyBVcGRhdGUgYnV0dG9uIHN0YXRlcyBiYXNlZCBvbiBleGlzdGluZyB0YXNrTWV0YWRhdGFcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZUJ1dHRvblN0YXRlKFxyXG5cdFx0XHRcdFx0dGhpcy5kYXRlQnV0dG9uISxcclxuXHRcdFx0XHRcdCEhdGhpcy50YXNrTWV0YWRhdGEuZHVlRGF0ZVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0dGhpcy51cGRhdGVCdXR0b25TdGF0ZShcclxuXHRcdFx0XHRcdHRoaXMucHJpb3JpdHlCdXR0b24hLFxyXG5cdFx0XHRcdFx0ISF0aGlzLnRhc2tNZXRhZGF0YS5wcmlvcml0eVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0dGhpcy51cGRhdGVCdXR0b25TdGF0ZShcclxuXHRcdFx0XHRcdHRoaXMudGFnQnV0dG9uISxcclxuXHRcdFx0XHRcdCEhKFxyXG5cdFx0XHRcdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS50YWdzICYmXHJcblx0XHRcdFx0XHRcdHRoaXMudGFza01ldGFkYXRhLnRhZ3MubGVuZ3RoID4gMFxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0dGhpcy51cGRhdGVCdXR0b25TdGF0ZShcclxuXHRcdFx0XHRcdHRoaXMubG9jYXRpb25CdXR0b24hLFxyXG5cdFx0XHRcdFx0ISEoXHJcblx0XHRcdFx0XHRcdHRoaXMudGFza01ldGFkYXRhLmxvY2F0aW9uIHx8XHJcblx0XHRcdFx0XHRcdHRoaXMudGFza01ldGFkYXRhLnRhcmdldEZpbGVcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIGEgcGFyc2VyIHRvIGV4dHJhY3QgbWV0YWRhdGFcclxuXHRcdFx0Y29uc3QgcGFyc2VyID0gbmV3IENvbmZpZ3VyYWJsZVRhc2tQYXJzZXIoe30pO1xyXG5cclxuXHRcdFx0Ly8gRXh0cmFjdCBtZXRhZGF0YSBhbmQgdGFnc1xyXG5cdFx0XHRjb25zdCBbY2xlYW5lZENvbnRlbnQsIG1ldGFkYXRhLCB0YWdzXSA9XHJcblx0XHRcdFx0cGFyc2VyLmV4dHJhY3RNZXRhZGF0YUFuZFRhZ3MoY29udGVudCk7XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgdGFza01ldGFkYXRhIGJhc2VkIG9uIHBhcnNlZCBjb250ZW50XHJcblx0XHRcdGlmIChtZXRhZGF0YS5kdWVEYXRlKSB7XHJcblx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEuZHVlRGF0ZSA9IG5ldyBEYXRlKG1ldGFkYXRhLmR1ZURhdGUpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAobWV0YWRhdGEucHJpb3JpdHkpIHtcclxuXHRcdFx0XHRjb25zdCBwcmlvcml0eU1hcDogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHtcclxuXHRcdFx0XHRcdGhpZ2hlc3Q6IDUsXHJcblx0XHRcdFx0XHRoaWdoOiA0LFxyXG5cdFx0XHRcdFx0bWVkaXVtOiAzLFxyXG5cdFx0XHRcdFx0bG93OiAyLFxyXG5cdFx0XHRcdFx0bG93ZXN0OiAxLFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEucHJpb3JpdHkgPVxyXG5cdFx0XHRcdFx0cHJpb3JpdHlNYXBbbWV0YWRhdGEucHJpb3JpdHldIHx8IDM7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmICh0YWdzICYmIHRhZ3MubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdGlmICghdGhpcy50YXNrTWV0YWRhdGEudGFncykge1xyXG5cdFx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEudGFncyA9IFtdO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvLyBNZXJnZSBuZXcgdGFncyB3aXRoIGV4aXN0aW5nIG9uZXNcclxuXHRcdFx0XHR0YWdzLmZvckVhY2goKHRhZykgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKCF0aGlzLnRhc2tNZXRhZGF0YS50YWdzIS5pbmNsdWRlcyh0YWcpKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMudGFza01ldGFkYXRhLnRhZ3MhLnB1c2godGFnKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIGJ1dHRvbiBzdGF0ZXNcclxuXHRcdFx0dGhpcy51cGRhdGVCdXR0b25TdGF0ZShcclxuXHRcdFx0XHR0aGlzLmRhdGVCdXR0b24hLFxyXG5cdFx0XHRcdCEhdGhpcy50YXNrTWV0YWRhdGEuZHVlRGF0ZVxyXG5cdFx0XHQpO1xyXG5cdFx0XHR0aGlzLnVwZGF0ZUJ1dHRvblN0YXRlKFxyXG5cdFx0XHRcdHRoaXMucHJpb3JpdHlCdXR0b24hLFxyXG5cdFx0XHRcdCEhdGhpcy50YXNrTWV0YWRhdGEucHJpb3JpdHlcclxuXHRcdFx0KTtcclxuXHRcdFx0dGhpcy51cGRhdGVCdXR0b25TdGF0ZShcclxuXHRcdFx0XHR0aGlzLnRhZ0J1dHRvbiEsXHJcblx0XHRcdFx0ISEodGhpcy50YXNrTWV0YWRhdGEudGFncyAmJiB0aGlzLnRhc2tNZXRhZGF0YS50YWdzLmxlbmd0aCA+IDApXHJcblx0XHRcdCk7XHJcblx0XHRcdHRoaXMudXBkYXRlQnV0dG9uU3RhdGUoXHJcblx0XHRcdFx0dGhpcy5sb2NhdGlvbkJ1dHRvbiEsXHJcblx0XHRcdFx0ISEoXHJcblx0XHRcdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS5sb2NhdGlvbiB8fFxyXG5cdFx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEudGFyZ2V0RmlsZSB8fFxyXG5cdFx0XHRcdFx0bWV0YWRhdGEucHJvamVjdCB8fFxyXG5cdFx0XHRcdFx0bWV0YWRhdGEubG9jYXRpb25cclxuXHRcdFx0XHQpXHJcblx0XHRcdCk7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRXJyb3IgcGFyc2luZyBjb250ZW50OlwiLCBlcnJvcik7XHJcblx0XHRcdC8vIE9uIGVycm9yLCBzdGlsbCB1cGRhdGUgYnV0dG9uIHN0YXRlc1xyXG5cdFx0XHR0aGlzLnVwZGF0ZUJ1dHRvblN0YXRlKFxyXG5cdFx0XHRcdHRoaXMuZGF0ZUJ1dHRvbiEsXHJcblx0XHRcdFx0ISF0aGlzLnRhc2tNZXRhZGF0YS5kdWVEYXRlXHJcblx0XHRcdCk7XHJcblx0XHRcdHRoaXMudXBkYXRlQnV0dG9uU3RhdGUoXHJcblx0XHRcdFx0dGhpcy5wcmlvcml0eUJ1dHRvbiEsXHJcblx0XHRcdFx0ISF0aGlzLnRhc2tNZXRhZGF0YS5wcmlvcml0eVxyXG5cdFx0XHQpO1xyXG5cdFx0XHR0aGlzLnVwZGF0ZUJ1dHRvblN0YXRlKFxyXG5cdFx0XHRcdHRoaXMudGFnQnV0dG9uISxcclxuXHRcdFx0XHQhISh0aGlzLnRhc2tNZXRhZGF0YS50YWdzICYmIHRoaXMudGFza01ldGFkYXRhLnRhZ3MubGVuZ3RoID4gMClcclxuXHRcdFx0KTtcclxuXHRcdFx0dGhpcy51cGRhdGVCdXR0b25TdGF0ZShcclxuXHRcdFx0XHR0aGlzLmxvY2F0aW9uQnV0dG9uISxcclxuXHRcdFx0XHQhISh0aGlzLnRhc2tNZXRhZGF0YS5sb2NhdGlvbiB8fCB0aGlzLnRhc2tNZXRhZGF0YS50YXJnZXRGaWxlKVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVzZXQgVUkgZWxlbWVudHNcclxuXHQgKi9cclxuXHRwcm90ZWN0ZWQgcmVzZXRVSUVsZW1lbnRzKCk6IHZvaWQge1xyXG5cdFx0Ly8gUmVzZXQgYnV0dG9uIHN0YXRlc1xyXG5cdFx0aWYgKHRoaXMuZGF0ZUJ1dHRvbikgdGhpcy51cGRhdGVCdXR0b25TdGF0ZSh0aGlzLmRhdGVCdXR0b24sIGZhbHNlKTtcclxuXHRcdGlmICh0aGlzLnByaW9yaXR5QnV0dG9uKVxyXG5cdFx0XHR0aGlzLnVwZGF0ZUJ1dHRvblN0YXRlKHRoaXMucHJpb3JpdHlCdXR0b24sIGZhbHNlKTtcclxuXHRcdGlmICh0aGlzLnRhZ0J1dHRvbikgdGhpcy51cGRhdGVCdXR0b25TdGF0ZSh0aGlzLnRhZ0J1dHRvbiwgZmFsc2UpO1xyXG5cdFx0aWYgKHRoaXMubG9jYXRpb25CdXR0b24pXHJcblx0XHRcdHRoaXMudXBkYXRlQnV0dG9uU3RhdGUodGhpcy5sb2NhdGlvbkJ1dHRvbiwgZmFsc2UpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2xlYW4gdXAgb24gY2xvc2VcclxuXHQgKi9cclxuXHRvbkNsb3NlKCkge1xyXG5cdFx0Ly8gQ2xlYW4gdXAgdW5pdmVyc2FsIHN1Z2dlc3RcclxuXHRcdGlmICh0aGlzLnVuaXZlcnNhbFN1Z2dlc3QpIHtcclxuXHRcdFx0dGhpcy51bml2ZXJzYWxTdWdnZXN0LmRpc2FibGUoKTtcclxuXHRcdFx0dGhpcy51bml2ZXJzYWxTdWdnZXN0ID0gbnVsbDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDbGVhbiB1cCBmaWxlIHN1Z2dlc3RcclxuXHRcdGlmICh0aGlzLmZpbGVTdWdnZXN0KSB7XHJcblx0XHRcdHRoaXMuZmlsZVN1Z2dlc3QuY2xvc2UoKTtcclxuXHRcdFx0dGhpcy5maWxlU3VnZ2VzdCA9IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2xlYW4gdXAgc3VnZ2VzdFxyXG5cdFx0aWYgKHRoaXMubWluaW1hbFN1Z2dlc3QpIHtcclxuXHRcdFx0dGhpcy5taW5pbWFsU3VnZ2VzdC5zZXRNaW5pbWFsTW9kZShmYWxzZSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2xlYW4gdXAgbW9kYWwgcmVmZXJlbmNlXHJcblx0XHRkZWxldGUgKHRoaXMubW9kYWxFbCBhcyBhbnkpLl9fbWluaW1hbFF1aWNrQ2FwdHVyZU1vZGFsO1xyXG5cclxuXHRcdHN1cGVyLm9uQ2xvc2UoKTtcclxuXHR9XHJcbn1cclxuIl19