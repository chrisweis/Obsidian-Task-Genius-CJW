import { __awaiter } from "tslib";
import { Notice, MarkdownView, editorInfoField, moment, Menu, setIcon, } from "obsidian";
import { StateField, StateEffect, Facet } from "@codemirror/state";
import { showPanel } from "@codemirror/view";
import { createEmbeddableMarkdownEditor, } from "./markdown-editor";
import { saveCapture } from "@/utils/file/file-operations";
import { t } from "@/translations/helper";
import "@/styles/quick-capture.css";
import { FileSuggest } from "@/components/ui/inputs/AutoComplete";
import { QuickCaptureSuggest } from "@/editor-extensions/autocomplete/task-metadata-suggest";
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
// Effect to toggle the quick capture panel
export const toggleQuickCapture = StateEffect.define();
// Define a state field to track whether the panel is open
export const quickCaptureState = StateField.define({
    create: () => false,
    update(value, tr) {
        var _a;
        for (let e of tr.effects) {
            if (e.is(toggleQuickCapture)) {
                if ((_a = tr.state.field(editorInfoField)) === null || _a === void 0 ? void 0 : _a.file) {
                    value = e.value;
                }
            }
        }
        return value;
    },
    provide: (field) => showPanel.from(field, (active) => active ? createQuickCapturePanel : null),
});
const handleCancel = (view, app) => {
    view.dispatch({
        effects: toggleQuickCapture.of(false),
    });
    // Focus back to the original active editor
    setTimeout(() => {
        const activeLeaf = app.workspace.activeLeaf;
        if (activeLeaf &&
            activeLeaf.view instanceof MarkdownView &&
            activeLeaf.view.editor &&
            !activeLeaf.view.editor.hasFocus()) {
            activeLeaf.view.editor.focus();
        }
    }, 10);
};
const handleSubmit = (view, app, markdownEditor, options, selectedTargetPath, taskMetadata) => __awaiter(void 0, void 0, void 0, function* () {
    if (!markdownEditor)
        return;
    let content = markdownEditor.value.trim();
    if (!content) {
        new Notice(t("Nothing to capture"));
        return;
    }
    // Add metadata to content if present
    if (taskMetadata) {
        const metadata = [];
        // Add date metadata
        if (taskMetadata.dueDate) {
            metadata.push(`📅 ${moment(taskMetadata.dueDate).format("YYYY-MM-DD")}`);
        }
        // Add priority metadata
        if (taskMetadata.priority) {
            const priorityIcons = ["⏬", "🔽", "🔼", "⏫", "🔺"];
            metadata.push(priorityIcons[taskMetadata.priority - 1]);
        }
        // Add tags
        if (taskMetadata.tags && taskMetadata.tags.length > 0) {
            metadata.push(...taskMetadata.tags.map(tag => `#${tag}`));
        }
        // Append metadata to content
        if (metadata.length > 0) {
            content = `${content} ${metadata.join(" ")}`;
        }
    }
    // Add task prefix if enabled
    if (options.autoAddTaskPrefix !== false) { // Default to true
        const prefix = options.taskPrefix || "- [ ]";
        // Check if content doesn't already start with a task or list prefix
        const taskPrefixes = ["- [ ]", "- [x]", "- [X]", "- [/]", "- [-]", "- [>]", "- ", "* ", "+ "];
        const hasPrefix = taskPrefixes.some(p => content.trimStart().startsWith(p));
        if (!hasPrefix) {
            // Handle multi-line content
            const lines = content.split("\n");
            content = lines.map(line => {
                // Only add prefix to non-empty lines
                if (line.trim()) {
                    return `${prefix} ${line.trim()}`;
                }
                return line;
            }).join("\n");
        }
    }
    try {
        // Use the processed target path or determine based on target type
        const modifiedOptions = Object.assign(Object.assign({}, options), { targetFile: selectedTargetPath });
        yield saveCapture(app, content, modifiedOptions);
        // Clear the editor
        markdownEditor.set("", false);
        // Optionally close the panel after successful capture
        view.dispatch({
            effects: toggleQuickCapture.of(false),
        });
        // Show success message with appropriate file path
        let displayPath = selectedTargetPath;
        if (options.targetType === "daily-note" && options.dailyNoteSettings) {
            const dateStr = moment().format(options.dailyNoteSettings.format);
            // For daily notes, the format might include path separators (e.g., YYYY-MM/YYYY-MM-DD)
            // We need to preserve the path structure and only sanitize the final filename
            const pathWithDate = options.dailyNoteSettings.folder
                ? `${options.dailyNoteSettings.folder}/${dateStr}.md`
                : `${dateStr}.md`;
            displayPath = sanitizeFilePath(pathWithDate);
        }
        new Notice(`${t("Captured successfully to")} ${displayPath}`);
    }
    catch (error) {
        new Notice(`${t("Failed to save:")} ${error}`);
    }
});
// Facet to provide configuration options for the quick capture
export const quickCaptureOptions = Facet.define({
    combine: (values) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
        return {
            targetFile: ((_a = values.find((v) => v.targetFile)) === null || _a === void 0 ? void 0 : _a.targetFile) ||
                "Quick capture.md",
            placeholder: ((_b = values.find((v) => v.placeholder)) === null || _b === void 0 ? void 0 : _b.placeholder) ||
                t("Capture thoughts, tasks, or ideas..."),
            appendToFile: (_d = (_c = values.find((v) => v.appendToFile !== undefined)) === null || _c === void 0 ? void 0 : _c.appendToFile) !== null && _d !== void 0 ? _d : "append",
            targetType: (_f = (_e = values.find((v) => v.targetType)) === null || _e === void 0 ? void 0 : _e.targetType) !== null && _f !== void 0 ? _f : "fixed",
            targetHeading: (_h = (_g = values.find((v) => v.targetHeading)) === null || _g === void 0 ? void 0 : _g.targetHeading) !== null && _h !== void 0 ? _h : "",
            dailyNoteSettings: (_k = (_j = values.find((v) => v.dailyNoteSettings)) === null || _j === void 0 ? void 0 : _j.dailyNoteSettings) !== null && _k !== void 0 ? _k : {
                format: "YYYY-MM-DD",
                folder: "",
                template: "",
            },
            autoAddTaskPrefix: (_m = (_l = values.find((v) => v.autoAddTaskPrefix !== undefined)) === null || _l === void 0 ? void 0 : _l.autoAddTaskPrefix) !== null && _m !== void 0 ? _m : true,
            taskPrefix: (_p = (_o = values.find((v) => v.taskPrefix)) === null || _o === void 0 ? void 0 : _o.taskPrefix) !== null && _p !== void 0 ? _p : "- [ ]",
        };
    },
});
// Helper function to show menu at specified coordinates
function showMenuAtCoords(menu, x, y) {
    menu.showAtMouseEvent(new MouseEvent("click", {
        clientX: x,
        clientY: y,
    }));
}
// Create the quick capture panel
function createQuickCapturePanel(view) {
    const dom = createDiv({
        cls: "quick-capture-panel",
    });
    const app = view.state.facet(appFacet);
    const options = view.state.facet(quickCaptureOptions);
    // Determine target file path based on target type
    let selectedTargetPath;
    if (options.targetType === "daily-note" && options.dailyNoteSettings) {
        const dateStr = moment().format(options.dailyNoteSettings.format || "YYYY-MM-DD");
        // Build the daily note path correctly
        let dailyNotePath = dateStr + ".md";
        if (options.dailyNoteSettings.folder && options.dailyNoteSettings.folder.trim() !== "") {
            // Remove trailing slash if present
            const folder = options.dailyNoteSettings.folder.replace(/\/$/, "");
            dailyNotePath = `${folder}/${dateStr}.md`;
        }
        selectedTargetPath = dailyNotePath;
    }
    else {
        selectedTargetPath = options.targetFile || "Quick Capture.md";
    }
    // Create header with title and target selection
    const headerContainer = dom.createEl("div", {
        cls: "quick-capture-header-container",
    });
    // "Capture to" label
    headerContainer.createEl("span", {
        cls: "quick-capture-title",
        text: t("Capture to"),
    });
    // Create the target file element (always editable)
    const targetFileEl = headerContainer.createEl("div", {
        cls: "quick-capture-target",
        attr: {
            contenteditable: "true",
            spellcheck: "false",
        },
        text: selectedTargetPath,
    });
    // Handle manual edits to the target element
    // Track input events for real-time updates
    targetFileEl.addEventListener("input", () => {
        selectedTargetPath = targetFileEl.textContent || "";
    });
    // Also handle blur for when user clicks away
    targetFileEl.addEventListener("blur", () => {
        var _a;
        const newPath = (_a = targetFileEl.textContent) === null || _a === void 0 ? void 0 : _a.trim();
        if (newPath) {
            selectedTargetPath = newPath;
            // Ensure .md extension if not present
            if (!selectedTargetPath.endsWith(".md")) {
                selectedTargetPath += ".md";
                targetFileEl.textContent = selectedTargetPath;
            }
        }
        else {
            // If empty, restore to default
            selectedTargetPath = options.targetFile || "Quick Capture.md";
            targetFileEl.textContent = selectedTargetPath;
        }
    });
    // Handle Enter key to confirm edit (will set up after editor is created)
    // Quick action buttons container - add directly to header
    const quickActionsContainer = headerContainer.createEl("div", {
        cls: "quick-capture-actions",
    });
    // Task metadata state
    let taskMetadata = {};
    // Date button
    const dateButton = quickActionsContainer.createEl("button", {
        cls: ["quick-action-button", "clickable-icon"],
        attr: { "aria-label": t("Set date") },
    });
    setIcon(dateButton, "calendar");
    // Priority button  
    const priorityButton = quickActionsContainer.createEl("button", {
        cls: ["quick-action-button", "clickable-icon"],
        attr: { "aria-label": t("Set priority") },
    });
    setIcon(priorityButton, "zap");
    // Tags button
    const tagsButton = quickActionsContainer.createEl("button", {
        cls: ["quick-action-button", "clickable-icon"],
        attr: { "aria-label": t("Add tags") },
    });
    setIcon(tagsButton, "tag");
    // Helper function to update button state
    const updateButtonState = (button, isActive) => {
        if (isActive) {
            button.addClass("active");
        }
        else {
            button.removeClass("active");
        }
    };
    const editorDiv = dom.createEl("div", {
        cls: "quick-capture-editor",
    });
    let markdownEditor = null;
    // Create an instance of the embedded markdown editor
    setTimeout(() => {
        var _a;
        markdownEditor = createEmbeddableMarkdownEditor(app, editorDiv, {
            placeholder: options.placeholder,
            onEnter: (editor, mod, shift) => {
                if (mod) {
                    // Submit on Cmd/Ctrl+Enter
                    handleSubmit(view, app, markdownEditor, options, selectedTargetPath, taskMetadata);
                    return true;
                }
                // Allow normal Enter key behavior
                return false;
            },
            onEscape: (editor) => {
                // Close the panel on Escape and focus back to the original active editor
                handleCancel(view, app);
            },
            onSubmit: (editor) => {
                handleSubmit(view, app, markdownEditor, options, selectedTargetPath);
            },
        });
        // Focus the editor when it's created
        (_a = markdownEditor === null || markdownEditor === void 0 ? void 0 : markdownEditor.editor) === null || _a === void 0 ? void 0 : _a.focus();
        // Now set up the Enter key handler for target field
        targetFileEl.addEventListener("keydown", (e) => {
            var _a;
            if (e.key === "Enter") {
                e.preventDefault();
                targetFileEl.blur();
                // Focus back to editor
                (_a = markdownEditor === null || markdownEditor === void 0 ? void 0 : markdownEditor.editor) === null || _a === void 0 ? void 0 : _a.focus();
            }
        });
        // Activate the suggest system for this editor
        const plugin = view.state.facet(pluginFacet);
        if (plugin.quickCaptureSuggest && (markdownEditor === null || markdownEditor === void 0 ? void 0 : markdownEditor.editor)) {
            plugin.quickCaptureSuggest.setQuickCaptureContext(true, taskMetadata, updateButtonState, {
                dateButton,
                priorityButton,
                tagsButton
            }, (newPath) => {
                // Update the selected target path
                selectedTargetPath = newPath;
                // Update the display
                if (targetFileEl) {
                    targetFileEl.textContent = newPath;
                }
            });
        }
        markdownEditor.scope.register(["Alt"], "c", (e) => {
            e.preventDefault();
            if (!markdownEditor)
                return false;
            if (markdownEditor.value.trim() === "") {
                handleCancel(view, app);
                return true;
            }
            else {
                handleSubmit(view, app, markdownEditor, options, selectedTargetPath);
            }
            return true;
        });
        // Only register Alt+X for fixed file type
        if (options.targetType === "fixed") {
            markdownEditor.scope.register(["Alt"], "x", (e) => {
                e.preventDefault();
                targetFileEl.focus();
                return true;
            });
        }
        // Register keyboard shortcuts for quick actions
        markdownEditor.scope.register(["Alt"], "d", (e) => {
            e.preventDefault();
            dateButton.click();
            return true;
        });
        markdownEditor.scope.register(["Alt"], "p", (e) => {
            e.preventDefault();
            priorityButton.click();
            return true;
        });
        markdownEditor.scope.register(["Alt"], "t", (e) => {
            e.preventDefault();
            tagsButton.click();
            return true;
        });
    }, 10); // Small delay to ensure the DOM is ready
    // Button container for actions
    const buttonContainer = dom.createEl("div", {
        cls: "quick-capture-buttons",
    });
    const submitButton = buttonContainer.createEl("button", {
        cls: "quick-capture-submit mod-cta",
        text: t("Capture"),
    });
    submitButton.addEventListener("click", () => {
        handleSubmit(view, app, markdownEditor, options, selectedTargetPath);
    });
    const cancelButton = buttonContainer.createEl("button", {
        cls: "quick-capture-cancel mod-destructive",
        text: t("Cancel"),
    });
    cancelButton.addEventListener("click", () => {
        view.dispatch({
            effects: toggleQuickCapture.of(false),
        });
    });
    // Only add file suggest for fixed file type
    if (options.targetType === "fixed") {
        new FileSuggest(app, targetFileEl, options, (file) => {
            var _a;
            targetFileEl.textContent = file.path;
            selectedTargetPath = file.path;
            // Focus current editor
            (_a = markdownEditor === null || markdownEditor === void 0 ? void 0 : markdownEditor.editor) === null || _a === void 0 ? void 0 : _a.focus();
        });
    }
    // Date button click handler
    dateButton.addEventListener("click", () => {
        const quickDates = [
            { label: t("Today"), date: moment().toDate() },
            { label: t("Tomorrow"), date: moment().add(1, "day").toDate() },
            { label: t("Next week"), date: moment().add(1, "week").toDate() },
            { label: t("Next month"), date: moment().add(1, "month").toDate() },
        ];
        const menu = new Menu();
        quickDates.forEach((quickDate) => {
            menu.addItem((item) => {
                item.setTitle(quickDate.label);
                item.setIcon("calendar");
                item.onClick(() => {
                    var _a;
                    taskMetadata.dueDate = quickDate.date;
                    updateButtonState(dateButton, true);
                    // Focus back to editor
                    (_a = markdownEditor === null || markdownEditor === void 0 ? void 0 : markdownEditor.editor) === null || _a === void 0 ? void 0 : _a.focus();
                });
            });
        });
        menu.addSeparator();
        menu.addItem((item) => {
            item.setTitle(t("Clear date"));
            item.setIcon("x");
            item.onClick(() => {
                var _a;
                delete taskMetadata.dueDate;
                updateButtonState(dateButton, false);
                (_a = markdownEditor === null || markdownEditor === void 0 ? void 0 : markdownEditor.editor) === null || _a === void 0 ? void 0 : _a.focus();
            });
        });
        const rect = dateButton.getBoundingClientRect();
        showMenuAtCoords(menu, rect.left, rect.bottom + 5);
    });
    // Priority button click handler
    priorityButton.addEventListener("click", () => {
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
                    var _a;
                    taskMetadata.priority = priority.level;
                    updateButtonState(priorityButton, true);
                    (_a = markdownEditor === null || markdownEditor === void 0 ? void 0 : markdownEditor.editor) === null || _a === void 0 ? void 0 : _a.focus();
                });
            });
        });
        menu.addSeparator();
        menu.addItem((item) => {
            item.setTitle(t("Clear priority"));
            item.setIcon("x");
            item.onClick(() => {
                var _a;
                delete taskMetadata.priority;
                updateButtonState(priorityButton, false);
                (_a = markdownEditor === null || markdownEditor === void 0 ? void 0 : markdownEditor.editor) === null || _a === void 0 ? void 0 : _a.focus();
            });
        });
        const rect = priorityButton.getBoundingClientRect();
        showMenuAtCoords(menu, rect.left, rect.bottom + 5);
    });
    // Tags button click handler
    tagsButton.addEventListener("click", () => {
        const menu = new Menu();
        // Add common tags as quick options
        const commonTags = ["important", "urgent", "todo", "review", "idea", "question"];
        commonTags.forEach((tag) => {
            var _a;
            const isActive = (_a = taskMetadata.tags) === null || _a === void 0 ? void 0 : _a.includes(tag);
            menu.addItem((item) => {
                item.setTitle(isActive ? `✓ #${tag}` : `#${tag}`);
                item.setIcon("tag");
                item.onClick(() => {
                    var _a;
                    if (!taskMetadata.tags) {
                        taskMetadata.tags = [];
                    }
                    if (isActive) {
                        // Remove tag
                        taskMetadata.tags = taskMetadata.tags.filter(t => t !== tag);
                        if (taskMetadata.tags.length === 0) {
                            delete taskMetadata.tags;
                            updateButtonState(tagsButton, false);
                        }
                    }
                    else {
                        // Add tag
                        taskMetadata.tags.push(tag);
                        updateButtonState(tagsButton, true);
                    }
                    (_a = markdownEditor === null || markdownEditor === void 0 ? void 0 : markdownEditor.editor) === null || _a === void 0 ? void 0 : _a.focus();
                });
            });
        });
        menu.addSeparator();
        menu.addItem((item) => {
            item.setTitle(t("Clear all tags"));
            item.setIcon("x");
            item.onClick(() => {
                var _a;
                delete taskMetadata.tags;
                updateButtonState(tagsButton, false);
                (_a = markdownEditor === null || markdownEditor === void 0 ? void 0 : markdownEditor.editor) === null || _a === void 0 ? void 0 : _a.focus();
            });
        });
        const rect = tagsButton.getBoundingClientRect();
        showMenuAtCoords(menu, rect.left, rect.bottom + 5);
    });
    return {
        dom,
        top: false,
        // Update method gets called on every editor update
        update: (update) => {
            // Implement if needed to update panel content based on editor state
        },
        // Destroy method gets called when the panel is removed
        destroy: () => {
            // Deactivate the suggest system
            const plugin = view.state.facet(pluginFacet);
            if (plugin.quickCaptureSuggest) {
                plugin.quickCaptureSuggest.setQuickCaptureContext(false);
            }
            markdownEditor === null || markdownEditor === void 0 ? void 0 : markdownEditor.destroy();
            markdownEditor = null;
        },
    };
}
// Facets to make app and plugin instances available to the panel
export const appFacet = Facet.define({
    combine: (values) => values[0],
});
export const pluginFacet = Facet.define({
    combine: (values) => values[0],
});
// Create the extension to enable quick capture in an editor
export function quickCaptureExtension(app, plugin) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    // Create and register the suggest system
    if (!plugin.quickCaptureSuggest) {
        plugin.quickCaptureSuggest = new QuickCaptureSuggest(app, plugin);
        plugin.registerEditorSuggest(plugin.quickCaptureSuggest);
    }
    return [
        quickCaptureState,
        quickCaptureOptions.of({
            targetFile: ((_a = plugin.settings.quickCapture) === null || _a === void 0 ? void 0 : _a.targetFile) || "Quick Capture.md",
            placeholder: ((_b = plugin.settings.quickCapture) === null || _b === void 0 ? void 0 : _b.placeholder) ||
                t("Capture thoughts, tasks, or ideas..."),
            appendToFile: (_d = (_c = plugin.settings.quickCapture) === null || _c === void 0 ? void 0 : _c.appendToFile) !== null && _d !== void 0 ? _d : "append",
            targetType: (_f = (_e = plugin.settings.quickCapture) === null || _e === void 0 ? void 0 : _e.targetType) !== null && _f !== void 0 ? _f : "fixed",
            targetHeading: (_h = (_g = plugin.settings.quickCapture) === null || _g === void 0 ? void 0 : _g.targetHeading) !== null && _h !== void 0 ? _h : "",
            dailyNoteSettings: (_k = (_j = plugin.settings.quickCapture) === null || _j === void 0 ? void 0 : _j.dailyNoteSettings) !== null && _k !== void 0 ? _k : {
                format: "YYYY-MM-DD",
                folder: "",
                template: "",
            },
            autoAddTaskPrefix: (_m = (_l = plugin.settings.quickCapture) === null || _l === void 0 ? void 0 : _l.autoAddTaskPrefix) !== null && _m !== void 0 ? _m : true,
            taskPrefix: (_p = (_o = plugin.settings.quickCapture) === null || _o === void 0 ? void 0 : _o.taskPrefix) !== null && _p !== void 0 ? _p : "- [ ]",
        }),
        appFacet.of(app),
        pluginFacet.of(plugin),
    ];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2stY2FwdHVyZS1wYW5lbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInF1aWNrLWNhcHR1cmUtcGFuZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFHTixNQUFNLEVBQ04sWUFBWSxFQU1aLGVBQWUsRUFDZixNQUFNLEVBQ04sSUFBSSxFQUNKLE9BQU8sR0FFUCxNQUFNLFVBQVUsQ0FBQztBQUNsQixPQUFPLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNuRSxPQUFPLEVBQWMsU0FBUyxFQUFxQixNQUFNLGtCQUFrQixDQUFDO0FBQzVFLE9BQU8sRUFDTiw4QkFBOEIsR0FFOUIsTUFBTSxtQkFBbUIsQ0FBQztBQUUzQixPQUFPLEVBQUUsV0FBVyxFQUF3QixNQUFNLDhCQUE4QixDQUFDO0FBQ2pGLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUMxQyxPQUFPLDRCQUE0QixDQUFDO0FBQ3BDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUU3Rjs7Ozs7R0FLRztBQUNILFNBQVMsZ0JBQWdCLENBQUMsUUFBZ0I7SUFDekMsdUZBQXVGO0lBQ3ZGLE9BQU8sUUFBUTtTQUNiLE9BQU8sQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLENBQUMsaUNBQWlDO1NBQzlELE9BQU8sQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsdUJBQXVCO1NBQzVDLElBQUksRUFBRSxDQUFDLENBQUMscUNBQXFDO0FBQ2hELENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsU0FBUyxnQkFBZ0IsQ0FBQyxRQUFnQjtJQUN6QyxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3RDLHlFQUF5RTtJQUN6RSxNQUFNLGNBQWMs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RCxXQUFXLEVBQ1YsQ0FBQSxNQUFBLE1BQU0sQ0FBQyxRQUFRLENBQUMsWUFBWSwwQ0FBRSxXQUFXO2dCQUN6QyxDQUFDLENBQUMsc0NBQXNDLENBQUM7WUFDMUMsWUFBWSxFQUNYLE1BQUEsTUFBQSxNQUFNLENBQUMsUUFBUSxDQUFDLFlBQVksMENBQUUsWUFBWSxtQ0FBSSxRQUFRO1lBQ3ZELFVBQVUsRUFBRSxNQUFBLE1BQUEsTUFBTSxDQUFDLFFBQVEsQ0FBQyxZQUFZLDBDQUFFLFVBQVUsbUNBQUksT0FBTztZQUMvRCxhQUFhLEVBQUUsTUFBQSxNQUFBLE1BQU0sQ0FBQyxRQUFRLENBQUMsWUFBWSwwQ0FBRSxhQUFhLG1DQUFJLEVBQUU7WUFDaEUsaUJBQWlCLEVBQUUsTUFBQSxNQUFBLE1BQU0sQ0FBQyxRQUFRLENBQUMsWUFBWSwwQ0FDNUMsaUJBQWlCLG1DQUFJO2dCQUN2QixNQUFNLEVBQUUsWUFBWTtnQkFDcEIsTUFBTSxFQUFFLEVBQUU7Z0JBQ1YsUUFBUSxFQUFFLEVBQUU7YUFDWjtZQUNELGlCQUFpQixFQUNoQixNQUFBLE1BQUEsTUFBTSxDQUFDLFFBQVEsQ0FBQyxZQUFZLDBDQUFFLGlCQUFpQixtQ0FBSSxJQUFJO1lBQ3hELFVBQVUsRUFDVCxNQUFBLE1BQUEsTUFBTSxDQUFDLFFBQVEsQ0FBQyxZQUFZLDBDQUFFLFVBQVUsbUNBQUksT0FBTztTQUNwRCxDQUFDO1FBQ0YsUUFBUSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUM7UUFDaEIsV0FBVyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUM7S0FDdEIsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xyXG5cdEFwcCxcclxuXHRURmlsZSxcclxuXHROb3RpY2UsXHJcblx0TWFya2Rvd25WaWV3LFxyXG5cdFdvcmtzcGFjZUxlYWYsXHJcblx0U2NvcGUsXHJcblx0QWJzdHJhY3RJbnB1dFN1Z2dlc3QsXHJcblx0cHJlcGFyZUZ1enp5U2VhcmNoLFxyXG5cdGdldEZyb250TWF0dGVySW5mbyxcclxuXHRlZGl0b3JJbmZvRmllbGQsXHJcblx0bW9tZW50LFxyXG5cdE1lbnUsXHJcblx0c2V0SWNvbixcclxuXHRFZGl0b3JQb3NpdGlvbixcclxufSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgU3RhdGVGaWVsZCwgU3RhdGVFZmZlY3QsIEZhY2V0IH0gZnJvbSBcIkBjb2RlbWlycm9yL3N0YXRlXCI7XHJcbmltcG9ydCB7IEVkaXRvclZpZXcsIHNob3dQYW5lbCwgVmlld1VwZGF0ZSwgUGFuZWwgfSBmcm9tIFwiQGNvZGVtaXJyb3Ivdmlld1wiO1xyXG5pbXBvcnQge1xyXG5cdGNyZWF0ZUVtYmVkZGFibGVNYXJrZG93bkVkaXRvcixcclxuXHRFbWJlZGRhYmxlTWFya2Rvd25FZGl0b3IsXHJcbn0gZnJvbSBcIi4vbWFya2Rvd24tZWRpdG9yXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIi4uLy4uL2luZGV4XCI7XHJcbmltcG9ydCB7IHNhdmVDYXB0dXJlLCBwcm9jZXNzRGF0ZVRlbXBsYXRlcyB9IGZyb20gXCJAL3V0aWxzL2ZpbGUvZmlsZS1vcGVyYXRpb25zXCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCBcIkAvc3R5bGVzL3F1aWNrLWNhcHR1cmUuY3NzXCI7XHJcbmltcG9ydCB7IEZpbGVTdWdnZXN0IH0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9pbnB1dHMvQXV0b0NvbXBsZXRlXCI7XHJcbmltcG9ydCB7IFF1aWNrQ2FwdHVyZVN1Z2dlc3QgfSBmcm9tIFwiQC9lZGl0b3ItZXh0ZW5zaW9ucy9hdXRvY29tcGxldGUvdGFzay1tZXRhZGF0YS1zdWdnZXN0XCI7XHJcblxyXG4vKipcclxuICogU2FuaXRpemUgZmlsZW5hbWUgYnkgcmVwbGFjaW5nIHVuc2FmZSBjaGFyYWN0ZXJzIHdpdGggc2FmZSBhbHRlcm5hdGl2ZXNcclxuICogVGhpcyBmdW5jdGlvbiBvbmx5IHNhbml0aXplcyB0aGUgZmlsZW5hbWUgcGFydCwgbm90IGRpcmVjdG9yeSBzZXBhcmF0b3JzXHJcbiAqIEBwYXJhbSBmaWxlbmFtZSAtIFRoZSBmaWxlbmFtZSB0byBzYW5pdGl6ZVxyXG4gKiBAcmV0dXJucyBUaGUgc2FuaXRpemVkIGZpbGVuYW1lXHJcbiAqL1xyXG5mdW5jdGlvbiBzYW5pdGl6ZUZpbGVuYW1lKGZpbGVuYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdC8vIFJlcGxhY2UgdW5zYWZlIGNoYXJhY3RlcnMgd2l0aCBzYWZlIGFsdGVybmF0aXZlcywgYnV0IGtlZXAgZm9yd2FyZCBzbGFzaGVzIGZvciBwYXRoc1xyXG5cdHJldHVybiBmaWxlbmFtZVxyXG5cdFx0LnJlcGxhY2UoL1s8PjpcInwqP1xcXFxdL2csIFwiLVwiKSAvLyBSZXBsYWNlIHVuc2FmZSBjaGFycyB3aXRoIGRhc2hcclxuXHRcdC5yZXBsYWNlKC9cXHMrL2csIFwiIFwiKSAvLyBOb3JtYWxpemUgd2hpdGVzcGFjZVxyXG5cdFx0LnRyaW0oKTsgLy8gUmVtb3ZlIGxlYWRpbmcvdHJhaWxpbmcgd2hpdGVzcGFjZVxyXG59XHJcblxyXG4vKipcclxuICogU2FuaXRpemUgYSBmaWxlIHBhdGggYnkgc2FuaXRpemluZyBvbmx5IHRoZSBmaWxlbmFtZSBwYXJ0IHdoaWxlIHByZXNlcnZpbmcgZGlyZWN0b3J5IHN0cnVjdHVyZVxyXG4gKiBAcGFyYW0gZmlsZVBhdGggLSBUaGUgZmlsZSBwYXRoIHRvIHNhbml0aXplXHJcbiAqIEByZXR1cm5zIFRoZSBzYW5pdGl6ZWQgZmlsZSBwYXRoXHJcbiAqL1xyXG5mdW5jdGlvbiBzYW5pdGl6ZUZpbGVQYXRoKGZpbGVQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdGNvbnN0IHBhdGhQYXJ0cyA9IGZpbGVQYXRoLnNwbGl0KFwiL1wiKTtcclxuXHQvLyBTYW5pdGl6ZSBlYWNoIHBhcnQgb2YgdGhlIHBhdGggZXhjZXB0IHByZXNlcnZlIHRoZSBkaXJlY3Rvcnkgc3RydWN0dXJlXHJcblx0Y29uc3Qgc2FuaXRpemVkUGFydHMgPSBwYXRoUGFydHMubWFwKChwYXJ0LCBpbmRleCkgPT4ge1xyXG5cdFx0Ly8gRm9yIHRoZSBsYXN0IHBhcnQgKGZpbGVuYW1lKSwgd2UgY2FuIGJlIG1vcmUgcmVzdHJpY3RpdmVcclxuXHRcdGlmIChpbmRleCA9PT0gcGF0aFBhcnRzLmxlbmd0aCAtIDEpIHtcclxuXHRcdFx0cmV0dXJuIHNhbml0aXplRmlsZW5hbWUocGFydCk7XHJcblx0XHR9XHJcblx0XHQvLyBGb3IgZGlyZWN0b3J5IG5hbWVzLCB3ZSBzdGlsbCBuZWVkIHRvIGF2b2lkIHByb2JsZW1hdGljIGNoYXJhY3RlcnMgYnV0IGNhbiBiZSBsZXNzIHJlc3RyaWN0aXZlXHJcblx0XHRyZXR1cm4gcGFydFxyXG5cdFx0XHQucmVwbGFjZSgvWzw+OlwifCo/XFxcXF0vZywgXCItXCIpXHJcblx0XHRcdC5yZXBsYWNlKC9cXHMrL2csIFwiIFwiKVxyXG5cdFx0XHQudHJpbSgpO1xyXG5cdH0pO1xyXG5cdHJldHVybiBzYW5pdGl6ZWRQYXJ0cy5qb2luKFwiL1wiKTtcclxufVxyXG5cclxuLy8gRWZmZWN0IHRvIHRvZ2dsZSB0aGUgcXVpY2sgY2FwdHVyZSBwYW5lbFxyXG5leHBvcnQgY29uc3QgdG9nZ2xlUXVpY2tDYXB0dXJlID0gU3RhdGVFZmZlY3QuZGVmaW5lPGJvb2xlYW4+KCk7XHJcblxyXG4vLyBEZWZpbmUgYSBzdGF0ZSBmaWVsZCB0byB0cmFjayB3aGV0aGVyIHRoZSBwYW5lbCBpcyBvcGVuXHJcbmV4cG9ydCBjb25zdCBxdWlja0NhcHR1cmVTdGF0ZSA9IFN0YXRlRmllbGQuZGVmaW5lPGJvb2xlYW4+KHtcclxuXHRjcmVhdGU6ICgpID0+IGZhbHNlLFxyXG5cdHVwZGF0ZSh2YWx1ZSwgdHIpIHtcclxuXHRcdGZvciAobGV0IGUgb2YgdHIuZWZmZWN0cykge1xyXG5cdFx0XHRpZiAoZS5pcyh0b2dnbGVRdWlja0NhcHR1cmUpKSB7XHJcblx0XHRcdFx0aWYgKHRyLnN0YXRlLmZpZWxkKGVkaXRvckluZm9GaWVsZCk/LmZpbGUpIHtcclxuXHRcdFx0XHRcdHZhbHVlID0gZS52YWx1ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiB2YWx1ZTtcclxuXHR9LFxyXG5cdHByb3ZpZGU6IChmaWVsZCkgPT5cclxuXHRcdHNob3dQYW5lbC5mcm9tKGZpZWxkLCAoYWN0aXZlKSA9PlxyXG5cdFx0XHRhY3RpdmUgPyBjcmVhdGVRdWlja0NhcHR1cmVQYW5lbCA6IG51bGxcclxuXHRcdCksXHJcbn0pO1xyXG5cclxuLy8gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgcXVpY2sgY2FwdHVyZSBwYW5lbFxyXG5leHBvcnQgaW50ZXJmYWNlIFF1aWNrQ2FwdHVyZU9wdGlvbnMge1xyXG5cdHRhcmdldEZpbGU/OiBzdHJpbmc7XHJcblx0cGxhY2Vob2xkZXI/OiBzdHJpbmc7XHJcblx0YXBwZW5kVG9GaWxlPzogXCJhcHBlbmRcIiB8IFwicHJlcGVuZFwiIHwgXCJyZXBsYWNlXCI7XHJcblx0Ly8gTmV3IG9wdGlvbnMgZm9yIGVuaGFuY2VkIHF1aWNrIGNhcHR1cmVcclxuXHR0YXJnZXRUeXBlPzogXCJmaXhlZFwiIHwgXCJkYWlseS1ub3RlXCIgfCBcImN1c3RvbS1maWxlXCI7XHJcblx0dGFyZ2V0SGVhZGluZz86IHN0cmluZztcclxuXHRkYWlseU5vdGVTZXR0aW5ncz86IHtcclxuXHRcdGZvcm1hdDogc3RyaW5nO1xyXG5cdFx0Zm9sZGVyOiBzdHJpbmc7XHJcblx0XHR0ZW1wbGF0ZTogc3RyaW5nO1xyXG5cdH07XHJcblx0Ly8gVGFzayBwcmVmaXggc2V0dGluZ3NcclxuXHRhdXRvQWRkVGFza1ByZWZpeD86IGJvb2xlYW47XHJcblx0dGFza1ByZWZpeD86IHN0cmluZztcclxufVxyXG5cclxuLy8gVGFzayBtZXRhZGF0YSBmb3IgcXVpY2sgY2FwdHVyZVxyXG5pbnRlcmZhY2UgVGFza01ldGFkYXRhIHtcclxuXHRkdWVEYXRlPzogRGF0ZTtcclxuXHRzY2hlZHVsZWREYXRlPzogRGF0ZTtcclxuXHRwcmlvcml0eT86IG51bWJlcjtcclxuXHR0YWdzPzogc3RyaW5nW107XHJcbn1cclxuXHJcbmNvbnN0IGhhbmRsZUNhbmNlbCA9ICh2aWV3OiBFZGl0b3JWaWV3LCBhcHA6IEFwcCkgPT4ge1xyXG5cdHZpZXcuZGlzcGF0Y2goe1xyXG5cdFx0ZWZmZWN0czogdG9nZ2xlUXVpY2tDYXB0dXJlLm9mKGZhbHNlKSxcclxuXHR9KTtcclxuXHJcblx0Ly8gRm9jdXMgYmFjayB0byB0aGUgb3JpZ2luYWwgYWN0aXZlIGVkaXRvclxyXG5cdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0Y29uc3QgYWN0aXZlTGVhZiA9IGFwcC53b3Jrc3BhY2UuYWN0aXZlTGVhZiBhcyBXb3Jrc3BhY2VMZWFmO1xyXG5cdFx0aWYgKFxyXG5cdFx0XHRhY3RpdmVMZWFmICYmXHJcblx0XHRcdGFjdGl2ZUxlYWYudmlldyBpbnN0YW5jZW9mIE1hcmtkb3duVmlldyAmJlxyXG5cdFx0XHRhY3RpdmVMZWFmLnZpZXcuZWRpdG9yICYmXHJcblx0XHRcdCFhY3RpdmVMZWFmLnZpZXcuZWRpdG9yLmhhc0ZvY3VzKClcclxuXHRcdCkge1xyXG5cdFx0XHRhY3RpdmVMZWFmLnZpZXcuZWRpdG9yLmZvY3VzKCk7XHJcblx0XHR9XHJcblx0fSwgMTApO1xyXG59O1xyXG5cclxuY29uc3QgaGFuZGxlU3VibWl0ID0gYXN5bmMgKFxyXG5cdHZpZXc6IEVkaXRvclZpZXcsXHJcblx0YXBwOiBBcHAsXHJcblx0bWFya2Rvd25FZGl0b3I6IEVtYmVkZGFibGVNYXJrZG93bkVkaXRvciB8IG51bGwsXHJcblx0b3B0aW9uczogUXVpY2tDYXB0dXJlT3B0aW9ucyxcclxuXHRzZWxlY3RlZFRhcmdldFBhdGg6IHN0cmluZyxcclxuXHR0YXNrTWV0YWRhdGE/OiBUYXNrTWV0YWRhdGFcclxuKSA9PiB7XHJcblx0aWYgKCFtYXJrZG93bkVkaXRvcikgcmV0dXJuO1xyXG5cclxuXHRsZXQgY29udGVudCA9IG1hcmtkb3duRWRpdG9yLnZhbHVlLnRyaW0oKTtcclxuXHRpZiAoIWNvbnRlbnQpIHtcclxuXHRcdG5ldyBOb3RpY2UodChcIk5vdGhpbmcgdG8gY2FwdHVyZVwiKSk7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cclxuXHQvLyBBZGQgbWV0YWRhdGEgdG8gY29udGVudCBpZiBwcmVzZW50XHJcblx0aWYgKHRhc2tNZXRhZGF0YSkge1xyXG5cdFx0Y29uc3QgbWV0YWRhdGE6IHN0cmluZ1tdID0gW107XHJcblx0XHRcclxuXHRcdC8vIEFkZCBkYXRlIG1ldGFkYXRhXHJcblx0XHRpZiAodGFza01ldGFkYXRhLmR1ZURhdGUpIHtcclxuXHRcdFx0bWV0YWRhdGEucHVzaChg8J+ThSAke21vbWVudCh0YXNrTWV0YWRhdGEuZHVlRGF0ZSkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKX1gKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Ly8gQWRkIHByaW9yaXR5IG1ldGFkYXRhXHJcblx0XHRpZiAodGFza01ldGFkYXRhLnByaW9yaXR5KSB7XHJcblx0XHRcdGNvbnN0IHByaW9yaXR5SWNvbnMgPSBbXCLij6xcIiwgXCLwn5S9XCIsIFwi8J+UvFwiLCBcIuKPq1wiLCBcIvCflLpcIl07XHJcblx0XHRcdG1ldGFkYXRhLnB1c2gocHJpb3JpdHlJY29uc1t0YXNrTWV0YWRhdGEucHJpb3JpdHkgLSAxXSk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdC8vIEFkZCB0YWdzXHJcblx0XHRpZiAodGFza01ldGFkYXRhLnRhZ3MgJiYgdGFza01ldGFkYXRhLnRhZ3MubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRtZXRhZGF0YS5wdXNoKC4uLnRhc2tNZXRhZGF0YS50YWdzLm1hcCh0YWcgPT4gYCMke3RhZ31gKSk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdC8vIEFwcGVuZCBtZXRhZGF0YSB0byBjb250ZW50XHJcblx0XHRpZiAobWV0YWRhdGEubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRjb250ZW50ID0gYCR7Y29udGVudH0gJHttZXRhZGF0YS5qb2luKFwiIFwiKX1gO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRcclxuXHQvLyBBZGQgdGFzayBwcmVmaXggaWYgZW5hYmxlZFxyXG5cdGlmIChvcHRpb25zLmF1dG9BZGRUYXNrUHJlZml4ICE9PSBmYWxzZSkgeyAvLyBEZWZhdWx0IHRvIHRydWVcclxuXHRcdGNvbnN0IHByZWZpeCA9IG9wdGlvbnMudGFza1ByZWZpeCB8fCBcIi0gWyBdXCI7XHJcblx0XHQvLyBDaGVjayBpZiBjb250ZW50IGRvZXNuJ3QgYWxyZWFkeSBzdGFydCB3aXRoIGEgdGFzayBvciBsaXN0IHByZWZpeFxyXG5cdFx0Y29uc3QgdGFza1ByZWZpeGVzID0gW1wiLSBbIF1cIiwgXCItIFt4XVwiLCBcIi0gW1hdXCIsIFwiLSBbL11cIiwgXCItIFstXVwiLCBcIi0gWz5dXCIsIFwiLSBcIiwgXCIqIFwiLCBcIisgXCJdO1xyXG5cdFx0Y29uc3QgaGFzUHJlZml4ID0gdGFza1ByZWZpeGVzLnNvbWUocCA9PiBjb250ZW50LnRyaW1TdGFydCgpLnN0YXJ0c1dpdGgocCkpO1xyXG5cdFx0XHJcblx0XHRpZiAoIWhhc1ByZWZpeCkge1xyXG5cdFx0XHQvLyBIYW5kbGUgbXVsdGktbGluZSBjb250ZW50XHJcblx0XHRcdGNvbnN0IGxpbmVzID0gY29udGVudC5zcGxpdChcIlxcblwiKTtcclxuXHRcdFx0Y29udGVudCA9IGxpbmVzLm1hcChsaW5lID0+IHtcclxuXHRcdFx0XHQvLyBPbmx5IGFkZCBwcmVmaXggdG8gbm9uLWVtcHR5IGxpbmVzXHJcblx0XHRcdFx0aWYgKGxpbmUudHJpbSgpKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gYCR7cHJlZml4fSAke2xpbmUudHJpbSgpfWA7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHJldHVybiBsaW5lO1xyXG5cdFx0XHR9KS5qb2luKFwiXFxuXCIpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0dHJ5IHtcclxuXHRcdC8vIFVzZSB0aGUgcHJvY2Vzc2VkIHRhcmdldCBwYXRoIG9yIGRldGVybWluZSBiYXNlZCBvbiB0YXJnZXQgdHlwZVxyXG5cdFx0Y29uc3QgbW9kaWZpZWRPcHRpb25zID0ge1xyXG5cdFx0XHQuLi5vcHRpb25zLFxyXG5cdFx0XHR0YXJnZXRGaWxlOiBzZWxlY3RlZFRhcmdldFBhdGgsXHJcblx0XHR9O1xyXG5cclxuXHRcdGF3YWl0IHNhdmVDYXB0dXJlKGFwcCwgY29udGVudCwgbW9kaWZpZWRPcHRpb25zKTtcclxuXHRcdC8vIENsZWFyIHRoZSBlZGl0b3JcclxuXHRcdG1hcmtkb3duRWRpdG9yLnNldChcIlwiLCBmYWxzZSk7XHJcblxyXG5cdFx0Ly8gT3B0aW9uYWxseSBjbG9zZSB0aGUgcGFuZWwgYWZ0ZXIgc3VjY2Vzc2Z1bCBjYXB0dXJlXHJcblx0XHR2aWV3LmRpc3BhdGNoKHtcclxuXHRcdFx0ZWZmZWN0czogdG9nZ2xlUXVpY2tDYXB0dXJlLm9mKGZhbHNlKSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFNob3cgc3VjY2VzcyBtZXNzYWdlIHdpdGggYXBwcm9wcmlhdGUgZmlsZSBwYXRoXHJcblx0XHRsZXQgZGlzcGxheVBhdGggPSBzZWxlY3RlZFRhcmdldFBhdGg7XHJcblx0XHRpZiAob3B0aW9ucy50YXJnZXRUeXBlID09PSBcImRhaWx5LW5vdGVcIiAmJiBvcHRpb25zLmRhaWx5Tm90ZVNldHRpbmdzKSB7XHJcblx0XHRcdGNvbnN0IGRhdGVTdHIgPSBtb21lbnQoKS5mb3JtYXQob3B0aW9ucy5kYWlseU5vdGVTZXR0aW5ncy5mb3JtYXQpO1xyXG5cdFx0XHQvLyBGb3IgZGFpbHkgbm90ZXMsIHRoZSBmb3JtYXQgbWlnaHQgaW5jbHVkZSBwYXRoIHNlcGFyYXRvcnMgKGUuZy4sIFlZWVktTU0vWVlZWS1NTS1ERClcclxuXHRcdFx0Ly8gV2UgbmVlZCB0byBwcmVzZXJ2ZSB0aGUgcGF0aCBzdHJ1Y3R1cmUgYW5kIG9ubHkgc2FuaXRpemUgdGhlIGZpbmFsIGZpbGVuYW1lXHJcblx0XHRcdGNvbnN0IHBhdGhXaXRoRGF0ZSA9IG9wdGlvbnMuZGFpbHlOb3RlU2V0dGluZ3MuZm9sZGVyXHJcblx0XHRcdFx0PyBgJHtvcHRpb25zLmRhaWx5Tm90ZVNldHRpbmdzLmZvbGRlcn0vJHtkYXRlU3RyfS5tZGBcclxuXHRcdFx0XHQ6IGAke2RhdGVTdHJ9Lm1kYDtcclxuXHRcdFx0ZGlzcGxheVBhdGggPSBzYW5pdGl6ZUZpbGVQYXRoKHBhdGhXaXRoRGF0ZSk7XHJcblx0XHR9XHJcblxyXG5cdFx0bmV3IE5vdGljZShgJHt0KFwiQ2FwdHVyZWQgc3VjY2Vzc2Z1bGx5IHRvXCIpfSAke2Rpc3BsYXlQYXRofWApO1xyXG5cdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRuZXcgTm90aWNlKGAke3QoXCJGYWlsZWQgdG8gc2F2ZTpcIil9ICR7ZXJyb3J9YCk7XHJcblx0fVxyXG59O1xyXG5cclxuLy8gRmFjZXQgdG8gcHJvdmlkZSBjb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBxdWljayBjYXB0dXJlXHJcbmV4cG9ydCBjb25zdCBxdWlja0NhcHR1cmVPcHRpb25zID0gRmFjZXQuZGVmaW5lPFxyXG5cdFF1aWNrQ2FwdHVyZU9wdGlvbnMsXHJcblx0UXVpY2tDYXB0dXJlT3B0aW9uc1xyXG4+KHtcclxuXHRjb21iaW5lOiAodmFsdWVzKSA9PiB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHR0YXJnZXRGaWxlOlxyXG5cdFx0XHRcdHZhbHVlcy5maW5kKCh2KSA9PiB2LnRhcmdldEZpbGUpPy50YXJnZXRGaWxlIHx8XHJcblx0XHRcdFx0XCJRdWljayBjYXB0dXJlLm1kXCIsXHJcblx0XHRcdHBsYWNlaG9sZGVyOlxyXG5cdFx0XHRcdHZhbHVlcy5maW5kKCh2KSA9PiB2LnBsYWNlaG9sZGVyKT8ucGxhY2Vob2xkZXIgfHxcclxuXHRcdFx0XHR0KFwiQ2FwdHVyZSB0aG91Z2h0cywgdGFza3MsIG9yIGlkZWFzLi4uXCIpLFxyXG5cdFx0XHRhcHBlbmRUb0ZpbGU6XHJcblx0XHRcdFx0dmFsdWVzLmZpbmQoKHYpID0+IHYuYXBwZW5kVG9GaWxlICE9PSB1bmRlZmluZWQpXHJcblx0XHRcdFx0XHQ/LmFwcGVuZFRvRmlsZSA/PyBcImFwcGVuZFwiLFxyXG5cdFx0XHR0YXJnZXRUeXBlOiB2YWx1ZXMuZmluZCgodikgPT4gdi50YXJnZXRUeXBlKT8udGFyZ2V0VHlwZSA/PyBcImZpeGVkXCIsXHJcblx0XHRcdHRhcmdldEhlYWRpbmc6XHJcblx0XHRcdFx0dmFsdWVzLmZpbmQoKHYpID0+IHYudGFyZ2V0SGVhZGluZyk/LnRhcmdldEhlYWRpbmcgPz8gXCJcIixcclxuXHRcdFx0ZGFpbHlOb3RlU2V0dGluZ3M6IHZhbHVlcy5maW5kKCh2KSA9PiB2LmRhaWx5Tm90ZVNldHRpbmdzKVxyXG5cdFx0XHRcdD8uZGFpbHlOb3RlU2V0dGluZ3MgPz8ge1xyXG5cdFx0XHRcdGZvcm1hdDogXCJZWVlZLU1NLUREXCIsXHJcblx0XHRcdFx0Zm9sZGVyOiBcIlwiLFxyXG5cdFx0XHRcdHRlbXBsYXRlOiBcIlwiLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHRhdXRvQWRkVGFza1ByZWZpeDogdmFsdWVzLmZpbmQoKHYpID0+IHYuYXV0b0FkZFRhc2tQcmVmaXggIT09IHVuZGVmaW5lZClcclxuXHRcdFx0XHQ/LmF1dG9BZGRUYXNrUHJlZml4ID8/IHRydWUsXHJcblx0XHRcdHRhc2tQcmVmaXg6IHZhbHVlcy5maW5kKCh2KSA9PiB2LnRhc2tQcmVmaXgpPy50YXNrUHJlZml4ID8/IFwiLSBbIF1cIixcclxuXHRcdH07XHJcblx0fSxcclxufSk7XHJcblxyXG4vLyBIZWxwZXIgZnVuY3Rpb24gdG8gc2hvdyBtZW51IGF0IHNwZWNpZmllZCBjb29yZGluYXRlc1xyXG5mdW5jdGlvbiBzaG93TWVudUF0Q29vcmRzKG1lbnU6IE1lbnUsIHg6IG51bWJlciwgeTogbnVtYmVyKTogdm9pZCB7XHJcblx0bWVudS5zaG93QXRNb3VzZUV2ZW50KFxyXG5cdFx0bmV3IE1vdXNlRXZlbnQoXCJjbGlja1wiLCB7XHJcblx0XHRcdGNsaWVudFg6IHgsXHJcblx0XHRcdGNsaWVudFk6IHksXHJcblx0XHR9KVxyXG5cdCk7XHJcbn1cclxuXHJcbi8vIENyZWF0ZSB0aGUgcXVpY2sgY2FwdHVyZSBwYW5lbFxyXG5mdW5jdGlvbiBjcmVhdGVRdWlja0NhcHR1cmVQYW5lbCh2aWV3OiBFZGl0b3JWaWV3KTogUGFuZWwge1xyXG5cdGNvbnN0IGRvbSA9IGNyZWF0ZURpdih7XHJcblx0XHRjbHM6IFwicXVpY2stY2FwdHVyZS1wYW5lbFwiLFxyXG5cdH0pO1xyXG5cclxuXHRjb25zdCBhcHAgPSB2aWV3LnN0YXRlLmZhY2V0KGFwcEZhY2V0KTtcclxuXHRjb25zdCBvcHRpb25zID0gdmlldy5zdGF0ZS5mYWNldChxdWlja0NhcHR1cmVPcHRpb25zKTtcclxuXHJcblx0Ly8gRGV0ZXJtaW5lIHRhcmdldCBmaWxlIHBhdGggYmFzZWQgb24gdGFyZ2V0IHR5cGVcclxuXHRsZXQgc2VsZWN0ZWRUYXJnZXRQYXRoOiBzdHJpbmc7XHJcblx0aWYgKG9wdGlvbnMudGFyZ2V0VHlwZSA9PT0gXCJkYWlseS1ub3RlXCIgJiYgb3B0aW9ucy5kYWlseU5vdGVTZXR0aW5ncykge1xyXG5cdFx0Y29uc3QgZGF0ZVN0ciA9IG1vbWVudCgpLmZvcm1hdChvcHRpb25zLmRhaWx5Tm90ZVNldHRpbmdzLmZvcm1hdCB8fCBcIllZWVktTU0tRERcIik7XHJcblx0XHQvLyBCdWlsZCB0aGUgZGFpbHkgbm90ZSBwYXRoIGNvcnJlY3RseVxyXG5cdFx0bGV0IGRhaWx5Tm90ZVBhdGggPSBkYXRlU3RyICsgXCIubWRcIjtcclxuXHRcdGlmIChvcHRpb25zLmRhaWx5Tm90ZVNldHRpbmdzLmZvbGRlciAmJiBvcHRpb25zLmRhaWx5Tm90ZVNldHRpbmdzLmZvbGRlci50cmltKCkgIT09IFwiXCIpIHtcclxuXHRcdFx0Ly8gUmVtb3ZlIHRyYWlsaW5nIHNsYXNoIGlmIHByZXNlbnRcclxuXHRcdFx0Y29uc3QgZm9sZGVyID0gb3B0aW9ucy5kYWlseU5vdGVTZXR0aW5ncy5mb2xkZXIucmVwbGFjZSgvXFwvJC8sIFwiXCIpO1xyXG5cdFx0XHRkYWlseU5vdGVQYXRoID0gYCR7Zm9sZGVyfS8ke2RhdGVTdHJ9Lm1kYDtcclxuXHRcdH1cclxuXHRcdHNlbGVjdGVkVGFyZ2V0UGF0aCA9IGRhaWx5Tm90ZVBhdGg7XHJcblx0fSBlbHNlIHtcclxuXHRcdHNlbGVjdGVkVGFyZ2V0UGF0aCA9IG9wdGlvbnMudGFyZ2V0RmlsZSB8fCBcIlF1aWNrIENhcHR1cmUubWRcIjtcclxuXHR9XHJcblxyXG5cdC8vIENyZWF0ZSBoZWFkZXIgd2l0aCB0aXRsZSBhbmQgdGFyZ2V0IHNlbGVjdGlvblxyXG5cdGNvbnN0IGhlYWRlckNvbnRhaW5lciA9IGRvbS5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRjbHM6IFwicXVpY2stY2FwdHVyZS1oZWFkZXItY29udGFpbmVyXCIsXHJcblx0fSk7XHJcblxyXG5cdC8vIFwiQ2FwdHVyZSB0b1wiIGxhYmVsXHJcblx0aGVhZGVyQ29udGFpbmVyLmNyZWF0ZUVsKFwic3BhblwiLCB7XHJcblx0XHRjbHM6IFwicXVpY2stY2FwdHVyZS10aXRsZVwiLFxyXG5cdFx0dGV4dDogdChcIkNhcHR1cmUgdG9cIiksXHJcblx0fSk7XHJcblxyXG5cdC8vIENyZWF0ZSB0aGUgdGFyZ2V0IGZpbGUgZWxlbWVudCAoYWx3YXlzIGVkaXRhYmxlKVxyXG5cdGNvbnN0IHRhcmdldEZpbGVFbCA9IGhlYWRlckNvbnRhaW5lci5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRjbHM6IFwicXVpY2stY2FwdHVyZS10YXJnZXRcIixcclxuXHRcdGF0dHI6IHtcclxuXHRcdFx0Y29udGVudGVkaXRhYmxlOiBcInRydWVcIixcclxuXHRcdFx0c3BlbGxjaGVjazogXCJmYWxzZVwiLFxyXG5cdFx0fSxcclxuXHRcdHRleHQ6IHNlbGVjdGVkVGFyZ2V0UGF0aCxcclxuXHR9KTtcclxuXHJcblx0Ly8gSGFuZGxlIG1hbnVhbCBlZGl0cyB0byB0aGUgdGFyZ2V0IGVsZW1lbnRcclxuXHQvLyBUcmFjayBpbnB1dCBldmVudHMgZm9yIHJlYWwtdGltZSB1cGRhdGVzXHJcblx0dGFyZ2V0RmlsZUVsLmFkZEV2ZW50TGlzdGVuZXIoXCJpbnB1dFwiLCAoKSA9PiB7XHJcblx0XHRzZWxlY3RlZFRhcmdldFBhdGggPSB0YXJnZXRGaWxlRWwudGV4dENvbnRlbnQgfHwgXCJcIjtcclxuXHR9KTtcclxuXHRcclxuXHQvLyBBbHNvIGhhbmRsZSBibHVyIGZvciB3aGVuIHVzZXIgY2xpY2tzIGF3YXlcclxuXHR0YXJnZXRGaWxlRWwuYWRkRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgKCkgPT4ge1xyXG5cdFx0Y29uc3QgbmV3UGF0aCA9IHRhcmdldEZpbGVFbC50ZXh0Q29udGVudD8udHJpbSgpO1xyXG5cdFx0aWYgKG5ld1BhdGgpIHtcclxuXHRcdFx0c2VsZWN0ZWRUYXJnZXRQYXRoID0gbmV3UGF0aDtcclxuXHRcdFx0Ly8gRW5zdXJlIC5tZCBleHRlbnNpb24gaWYgbm90IHByZXNlbnRcclxuXHRcdFx0aWYgKCFzZWxlY3RlZFRhcmdldFBhdGguZW5kc1dpdGgoXCIubWRcIikpIHtcclxuXHRcdFx0XHRzZWxlY3RlZFRhcmdldFBhdGggKz0gXCIubWRcIjtcclxuXHRcdFx0XHR0YXJnZXRGaWxlRWwudGV4dENvbnRlbnQgPSBzZWxlY3RlZFRhcmdldFBhdGg7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIElmIGVtcHR5LCByZXN0b3JlIHRvIGRlZmF1bHRcclxuXHRcdFx0c2VsZWN0ZWRUYXJnZXRQYXRoID0gb3B0aW9ucy50YXJnZXRGaWxlIHx8IFwiUXVpY2sgQ2FwdHVyZS5tZFwiO1xyXG5cdFx0XHR0YXJnZXRGaWxlRWwudGV4dENvbnRlbnQgPSBzZWxlY3RlZFRhcmdldFBhdGg7XHJcblx0XHR9XHJcblx0fSk7XHJcblx0XHJcblx0Ly8gSGFuZGxlIEVudGVyIGtleSB0byBjb25maXJtIGVkaXQgKHdpbGwgc2V0IHVwIGFmdGVyIGVkaXRvciBpcyBjcmVhdGVkKVxyXG5cclxuXHQvLyBRdWljayBhY3Rpb24gYnV0dG9ucyBjb250YWluZXIgLSBhZGQgZGlyZWN0bHkgdG8gaGVhZGVyXHJcblx0Y29uc3QgcXVpY2tBY3Rpb25zQ29udGFpbmVyID0gaGVhZGVyQ29udGFpbmVyLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdGNsczogXCJxdWljay1jYXB0dXJlLWFjdGlvbnNcIixcclxuXHR9KTtcclxuXHJcblx0Ly8gVGFzayBtZXRhZGF0YSBzdGF0ZVxyXG5cdGxldCB0YXNrTWV0YWRhdGE6IFRhc2tNZXRhZGF0YSA9IHt9O1xyXG5cclxuXHQvLyBEYXRlIGJ1dHRvblxyXG5cdGNvbnN0IGRhdGVCdXR0b24gPSBxdWlja0FjdGlvbnNDb250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0Y2xzOiBbXCJxdWljay1hY3Rpb24tYnV0dG9uXCIsIFwiY2xpY2thYmxlLWljb25cIl0sXHJcblx0XHRhdHRyOiB7IFwiYXJpYS1sYWJlbFwiOiB0KFwiU2V0IGRhdGVcIikgfSxcclxuXHR9KTtcclxuXHRzZXRJY29uKGRhdGVCdXR0b24sIFwiY2FsZW5kYXJcIik7XHJcblxyXG5cdC8vIFByaW9yaXR5IGJ1dHRvbiAgXHJcblx0Y29uc3QgcHJpb3JpdHlCdXR0b24gPSBxdWlja0FjdGlvbnNDb250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0Y2xzOiBbXCJxdWljay1hY3Rpb24tYnV0dG9uXCIsIFwiY2xpY2thYmxlLWljb25cIl0sXHJcblx0XHRhdHRyOiB7IFwiYXJpYS1sYWJlbFwiOiB0KFwiU2V0IHByaW9yaXR5XCIpIH0sXHJcblx0fSk7XHJcblx0c2V0SWNvbihwcmlvcml0eUJ1dHRvbiwgXCJ6YXBcIik7XHJcblxyXG5cdC8vIFRhZ3MgYnV0dG9uXHJcblx0Y29uc3QgdGFnc0J1dHRvbiA9IHF1aWNrQWN0aW9uc0NvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRjbHM6IFtcInF1aWNrLWFjdGlvbi1idXR0b25cIiwgXCJjbGlja2FibGUtaWNvblwiXSxcclxuXHRcdGF0dHI6IHsgXCJhcmlhLWxhYmVsXCI6IHQoXCJBZGQgdGFnc1wiKSB9LFxyXG5cdH0pO1xyXG5cdHNldEljb24odGFnc0J1dHRvbiwgXCJ0YWdcIik7XHJcblxyXG5cdC8vIEhlbHBlciBmdW5jdGlvbiB0byB1cGRhdGUgYnV0dG9uIHN0YXRlXHJcblx0Y29uc3QgdXBkYXRlQnV0dG9uU3RhdGUgPSAoYnV0dG9uOiBIVE1MQnV0dG9uRWxlbWVudCwgaXNBY3RpdmU6IGJvb2xlYW4pID0+IHtcclxuXHRcdGlmIChpc0FjdGl2ZSkge1xyXG5cdFx0XHRidXR0b24uYWRkQ2xhc3MoXCJhY3RpdmVcIik7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRidXR0b24ucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIik7XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0Y29uc3QgZWRpdG9yRGl2ID0gZG9tLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdGNsczogXCJxdWljay1jYXB0dXJlLWVkaXRvclwiLFxyXG5cdH0pO1xyXG5cclxuXHRsZXQgbWFya2Rvd25FZGl0b3I6IEVtYmVkZGFibGVNYXJrZG93bkVkaXRvciB8IG51bGwgPSBudWxsO1xyXG5cclxuXHQvLyBDcmVhdGUgYW4gaW5zdGFuY2Ugb2YgdGhlIGVtYmVkZGVkIG1hcmtkb3duIGVkaXRvclxyXG5cdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0bWFya2Rvd25FZGl0b3IgPSBjcmVhdGVFbWJlZGRhYmxlTWFya2Rvd25FZGl0b3IoYXBwLCBlZGl0b3JEaXYsIHtcclxuXHRcdFx0cGxhY2Vob2xkZXI6IG9wdGlvbnMucGxhY2Vob2xkZXIsXHJcblxyXG5cdFx0XHRvbkVudGVyOiAoZWRpdG9yLCBtb2QsIHNoaWZ0KSA9PiB7XHJcblx0XHRcdFx0aWYgKG1vZCkge1xyXG5cdFx0XHRcdFx0Ly8gU3VibWl0IG9uIENtZC9DdHJsK0VudGVyXHJcblx0XHRcdFx0XHRoYW5kbGVTdWJtaXQoXHJcblx0XHRcdFx0XHRcdHZpZXcsXHJcblx0XHRcdFx0XHRcdGFwcCxcclxuXHRcdFx0XHRcdFx0bWFya2Rvd25FZGl0b3IsXHJcblx0XHRcdFx0XHRcdG9wdGlvbnMsXHJcblx0XHRcdFx0XHRcdHNlbGVjdGVkVGFyZ2V0UGF0aCxcclxuXHRcdFx0XHRcdFx0dGFza01ldGFkYXRhXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIEFsbG93IG5vcm1hbCBFbnRlciBrZXkgYmVoYXZpb3JcclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdH0sXHJcblxyXG5cdFx0XHRvbkVzY2FwZTogKGVkaXRvcikgPT4ge1xyXG5cdFx0XHRcdC8vIENsb3NlIHRoZSBwYW5lbCBvbiBFc2NhcGUgYW5kIGZvY3VzIGJhY2sgdG8gdGhlIG9yaWdpbmFsIGFjdGl2ZSBlZGl0b3JcclxuXHRcdFx0XHRoYW5kbGVDYW5jZWwodmlldywgYXBwKTtcclxuXHRcdFx0fSxcclxuXHJcblx0XHRcdG9uU3VibWl0OiAoZWRpdG9yKSA9PiB7XHJcblx0XHRcdFx0aGFuZGxlU3VibWl0KFxyXG5cdFx0XHRcdFx0dmlldyxcclxuXHRcdFx0XHRcdGFwcCxcclxuXHRcdFx0XHRcdG1hcmtkb3duRWRpdG9yLFxyXG5cdFx0XHRcdFx0b3B0aW9ucyxcclxuXHRcdFx0XHRcdHNlbGVjdGVkVGFyZ2V0UGF0aFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBGb2N1cyB0aGUgZWRpdG9yIHdoZW4gaXQncyBjcmVhdGVkXHJcblx0XHRtYXJrZG93bkVkaXRvcj8uZWRpdG9yPy5mb2N1cygpO1xyXG5cdFx0XHJcblx0XHQvLyBOb3cgc2V0IHVwIHRoZSBFbnRlciBrZXkgaGFuZGxlciBmb3IgdGFyZ2V0IGZpZWxkXHJcblx0XHR0YXJnZXRGaWxlRWwuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgKGU6IEtleWJvYXJkRXZlbnQpID0+IHtcclxuXHRcdFx0aWYgKGUua2V5ID09PSBcIkVudGVyXCIpIHtcclxuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0dGFyZ2V0RmlsZUVsLmJsdXIoKTtcclxuXHRcdFx0XHQvLyBGb2N1cyBiYWNrIHRvIGVkaXRvclxyXG5cdFx0XHRcdG1hcmtkb3duRWRpdG9yPy5lZGl0b3I/LmZvY3VzKCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEFjdGl2YXRlIHRoZSBzdWdnZXN0IHN5c3RlbSBmb3IgdGhpcyBlZGl0b3JcclxuXHRcdGNvbnN0IHBsdWdpbiA9IHZpZXcuc3RhdGUuZmFjZXQocGx1Z2luRmFjZXQpO1xyXG5cdFx0aWYgKHBsdWdpbi5xdWlja0NhcHR1cmVTdWdnZXN0ICYmIG1hcmtkb3duRWRpdG9yPy5lZGl0b3IpIHtcclxuXHRcdFx0cGx1Z2luLnF1aWNrQ2FwdHVyZVN1Z2dlc3Quc2V0UXVpY2tDYXB0dXJlQ29udGV4dChcclxuXHRcdFx0XHR0cnVlLFxyXG5cdFx0XHRcdHRhc2tNZXRhZGF0YSxcclxuXHRcdFx0XHR1cGRhdGVCdXR0b25TdGF0ZSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRkYXRlQnV0dG9uLFxyXG5cdFx0XHRcdFx0cHJpb3JpdHlCdXR0b24sXHJcblx0XHRcdFx0XHR0YWdzQnV0dG9uXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHQobmV3UGF0aDogc3RyaW5nKSA9PiB7XHJcblx0XHRcdFx0XHQvLyBVcGRhdGUgdGhlIHNlbGVjdGVkIHRhcmdldCBwYXRoXHJcblx0XHRcdFx0XHRzZWxlY3RlZFRhcmdldFBhdGggPSBuZXdQYXRoO1xyXG5cdFx0XHRcdFx0Ly8gVXBkYXRlIHRoZSBkaXNwbGF5XHJcblx0XHRcdFx0XHRpZiAodGFyZ2V0RmlsZUVsKSB7XHJcblx0XHRcdFx0XHRcdHRhcmdldEZpbGVFbC50ZXh0Q29udGVudCA9IG5ld1BhdGg7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdG1hcmtkb3duRWRpdG9yLnNjb3BlLnJlZ2lzdGVyKFtcIkFsdFwiXSwgXCJjXCIsIChlOiBLZXlib2FyZEV2ZW50KSA9PiB7XHJcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0aWYgKCFtYXJrZG93bkVkaXRvcikgcmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRpZiAobWFya2Rvd25FZGl0b3IudmFsdWUudHJpbSgpID09PSBcIlwiKSB7XHJcblx0XHRcdFx0aGFuZGxlQ2FuY2VsKHZpZXcsIGFwcCk7XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0aGFuZGxlU3VibWl0KFxyXG5cdFx0XHRcdFx0dmlldyxcclxuXHRcdFx0XHRcdGFwcCxcclxuXHRcdFx0XHRcdG1hcmtkb3duRWRpdG9yLFxyXG5cdFx0XHRcdFx0b3B0aW9ucyxcclxuXHRcdFx0XHRcdHNlbGVjdGVkVGFyZ2V0UGF0aFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBPbmx5IHJlZ2lzdGVyIEFsdCtYIGZvciBmaXhlZCBmaWxlIHR5cGVcclxuXHRcdGlmIChvcHRpb25zLnRhcmdldFR5cGUgPT09IFwiZml4ZWRcIikge1xyXG5cdFx0XHRtYXJrZG93bkVkaXRvci5zY29wZS5yZWdpc3RlcihbXCJBbHRcIl0sIFwieFwiLCAoZTogS2V5Ym9hcmRFdmVudCkgPT4ge1xyXG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0XHR0YXJnZXRGaWxlRWwuZm9jdXMoKTtcclxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUmVnaXN0ZXIga2V5Ym9hcmQgc2hvcnRjdXRzIGZvciBxdWljayBhY3Rpb25zXHJcblx0XHRtYXJrZG93bkVkaXRvci5zY29wZS5yZWdpc3RlcihbXCJBbHRcIl0sIFwiZFwiLCAoZTogS2V5Ym9hcmRFdmVudCkgPT4ge1xyXG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdGRhdGVCdXR0b24uY2xpY2soKTtcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9KTtcclxuXHJcblx0XHRtYXJrZG93bkVkaXRvci5zY29wZS5yZWdpc3RlcihbXCJBbHRcIl0sIFwicFwiLCAoZTogS2V5Ym9hcmRFdmVudCkgPT4ge1xyXG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdHByaW9yaXR5QnV0dG9uLmNsaWNrKCk7XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0bWFya2Rvd25FZGl0b3Iuc2NvcGUucmVnaXN0ZXIoW1wiQWx0XCJdLCBcInRcIiwgKGU6IEtleWJvYXJkRXZlbnQpID0+IHtcclxuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHR0YWdzQnV0dG9uLmNsaWNrKCk7XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fSk7XHJcblx0fSwgMTApOyAvLyBTbWFsbCBkZWxheSB0byBlbnN1cmUgdGhlIERPTSBpcyByZWFkeVxyXG5cclxuXHQvLyBCdXR0b24gY29udGFpbmVyIGZvciBhY3Rpb25zXHJcblx0Y29uc3QgYnV0dG9uQ29udGFpbmVyID0gZG9tLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdGNsczogXCJxdWljay1jYXB0dXJlLWJ1dHRvbnNcIixcclxuXHR9KTtcclxuXHJcblx0Y29uc3Qgc3VibWl0QnV0dG9uID0gYnV0dG9uQ29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdGNsczogXCJxdWljay1jYXB0dXJlLXN1Ym1pdCBtb2QtY3RhXCIsXHJcblx0XHR0ZXh0OiB0KFwiQ2FwdHVyZVwiKSxcclxuXHR9KTtcclxuXHRzdWJtaXRCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdGhhbmRsZVN1Ym1pdCh2aWV3LCBhcHAsIG1hcmtkb3duRWRpdG9yLCBvcHRpb25zLCBzZWxlY3RlZFRhcmdldFBhdGgpO1xyXG5cdH0pO1xyXG5cclxuXHRjb25zdCBjYW5jZWxCdXR0b24gPSBidXR0b25Db250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0Y2xzOiBcInF1aWNrLWNhcHR1cmUtY2FuY2VsIG1vZC1kZXN0cnVjdGl2ZVwiLFxyXG5cdFx0dGV4dDogdChcIkNhbmNlbFwiKSxcclxuXHR9KTtcclxuXHRjYW5jZWxCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdHZpZXcuZGlzcGF0Y2goe1xyXG5cdFx0XHRlZmZlY3RzOiB0b2dnbGVRdWlja0NhcHR1cmUub2YoZmFsc2UpLFxyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdC8vIE9ubHkgYWRkIGZpbGUgc3VnZ2VzdCBmb3IgZml4ZWQgZmlsZSB0eXBlXHJcblx0aWYgKG9wdGlvbnMudGFyZ2V0VHlwZSA9PT0gXCJmaXhlZFwiKSB7XHJcblx0XHRuZXcgRmlsZVN1Z2dlc3QoYXBwLCB0YXJnZXRGaWxlRWwsIG9wdGlvbnMsIChmaWxlOiBURmlsZSkgPT4ge1xyXG5cdFx0XHR0YXJnZXRGaWxlRWwudGV4dENvbnRlbnQgPSBmaWxlLnBhdGg7XHJcblx0XHRcdHNlbGVjdGVkVGFyZ2V0UGF0aCA9IGZpbGUucGF0aDtcclxuXHRcdFx0Ly8gRm9jdXMgY3VycmVudCBlZGl0b3JcclxuXHRcdFx0bWFya2Rvd25FZGl0b3I/LmVkaXRvcj8uZm9jdXMoKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gRGF0ZSBidXR0b24gY2xpY2sgaGFuZGxlclxyXG5cdGRhdGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdGNvbnN0IHF1aWNrRGF0ZXMgPSBbXHJcblx0XHRcdHsgbGFiZWw6IHQoXCJUb2RheVwiKSwgZGF0ZTogbW9tZW50KCkudG9EYXRlKCkgfSxcclxuXHRcdFx0eyBsYWJlbDogdChcIlRvbW9ycm93XCIpLCBkYXRlOiBtb21lbnQoKS5hZGQoMSwgXCJkYXlcIikudG9EYXRlKCkgfSxcclxuXHRcdFx0eyBsYWJlbDogdChcIk5leHQgd2Vla1wiKSwgZGF0ZTogbW9tZW50KCkuYWRkKDEsIFwid2Vla1wiKS50b0RhdGUoKSB9LFxyXG5cdFx0XHR7IGxhYmVsOiB0KFwiTmV4dCBtb250aFwiKSwgZGF0ZTogbW9tZW50KCkuYWRkKDEsIFwibW9udGhcIikudG9EYXRlKCkgfSxcclxuXHRcdF07XHJcblxyXG5cdFx0Y29uc3QgbWVudSA9IG5ldyBNZW51KCk7XHJcblxyXG5cdFx0cXVpY2tEYXRlcy5mb3JFYWNoKChxdWlja0RhdGUpID0+IHtcclxuXHRcdFx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdFx0aXRlbS5zZXRUaXRsZShxdWlja0RhdGUubGFiZWwpO1xyXG5cdFx0XHRcdGl0ZW0uc2V0SWNvbihcImNhbGVuZGFyXCIpO1xyXG5cdFx0XHRcdGl0ZW0ub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHR0YXNrTWV0YWRhdGEuZHVlRGF0ZSA9IHF1aWNrRGF0ZS5kYXRlO1xyXG5cdFx0XHRcdFx0dXBkYXRlQnV0dG9uU3RhdGUoZGF0ZUJ1dHRvbiwgdHJ1ZSk7XHJcblx0XHRcdFx0XHQvLyBGb2N1cyBiYWNrIHRvIGVkaXRvclxyXG5cdFx0XHRcdFx0bWFya2Rvd25FZGl0b3I/LmVkaXRvcj8uZm9jdXMoKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRtZW51LmFkZFNlcGFyYXRvcigpO1xyXG5cdFx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdGl0ZW0uc2V0VGl0bGUodChcIkNsZWFyIGRhdGVcIikpO1xyXG5cdFx0XHRpdGVtLnNldEljb24oXCJ4XCIpO1xyXG5cdFx0XHRpdGVtLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdGRlbGV0ZSB0YXNrTWV0YWRhdGEuZHVlRGF0ZTtcclxuXHRcdFx0XHR1cGRhdGVCdXR0b25TdGF0ZShkYXRlQnV0dG9uLCBmYWxzZSk7XHJcblx0XHRcdFx0bWFya2Rvd25FZGl0b3I/LmVkaXRvcj8uZm9jdXMoKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCByZWN0ID0gZGF0ZUJ1dHRvbi5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuXHRcdHNob3dNZW51QXRDb29yZHMobWVudSwgcmVjdC5sZWZ0LCByZWN0LmJvdHRvbSArIDUpO1xyXG5cdH0pO1xyXG5cclxuXHQvLyBQcmlvcml0eSBidXR0b24gY2xpY2sgaGFuZGxlclxyXG5cdHByaW9yaXR5QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRjb25zdCBwcmlvcml0aWVzID0gW1xyXG5cdFx0XHR7IGxldmVsOiA1LCBsYWJlbDogdChcIkhpZ2hlc3RcIiksIGljb246IFwi8J+UulwiIH0sXHJcblx0XHRcdHsgbGV2ZWw6IDQsIGxhYmVsOiB0KFwiSGlnaFwiKSwgaWNvbjogXCLij6tcIiB9LFxyXG5cdFx0XHR7IGxldmVsOiAzLCBsYWJlbDogdChcIk1lZGl1bVwiKSwgaWNvbjogXCLwn5S8XCIgfSxcclxuXHRcdFx0eyBsZXZlbDogMiwgbGFiZWw6IHQoXCJMb3dcIiksIGljb246IFwi8J+UvVwiIH0sXHJcblx0XHRcdHsgbGV2ZWw6IDEsIGxhYmVsOiB0KFwiTG93ZXN0XCIpLCBpY29uOiBcIuKPrFwiIH0sXHJcblx0XHRdO1xyXG5cclxuXHRcdGNvbnN0IG1lbnUgPSBuZXcgTWVudSgpO1xyXG5cclxuXHRcdHByaW9yaXRpZXMuZm9yRWFjaCgocHJpb3JpdHkpID0+IHtcclxuXHRcdFx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdFx0aXRlbS5zZXRUaXRsZShgJHtwcmlvcml0eS5pY29ufSAke3ByaW9yaXR5LmxhYmVsfWApO1xyXG5cdFx0XHRcdGl0ZW0ub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHR0YXNrTWV0YWRhdGEucHJpb3JpdHkgPSBwcmlvcml0eS5sZXZlbDtcclxuXHRcdFx0XHRcdHVwZGF0ZUJ1dHRvblN0YXRlKHByaW9yaXR5QnV0dG9uLCB0cnVlKTtcclxuXHRcdFx0XHRcdG1hcmtkb3duRWRpdG9yPy5lZGl0b3I/LmZvY3VzKCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0bWVudS5hZGRTZXBhcmF0b3IoKTtcclxuXHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJDbGVhciBwcmlvcml0eVwiKSk7XHJcblx0XHRcdGl0ZW0uc2V0SWNvbihcInhcIik7XHJcblx0XHRcdGl0ZW0ub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0ZGVsZXRlIHRhc2tNZXRhZGF0YS5wcmlvcml0eTtcclxuXHRcdFx0XHR1cGRhdGVCdXR0b25TdGF0ZShwcmlvcml0eUJ1dHRvbiwgZmFsc2UpO1xyXG5cdFx0XHRcdG1hcmtkb3duRWRpdG9yPy5lZGl0b3I/LmZvY3VzKCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgcmVjdCA9IHByaW9yaXR5QnV0dG9uLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG5cdFx0c2hvd01lbnVBdENvb3JkcyhtZW51LCByZWN0LmxlZnQsIHJlY3QuYm90dG9tICsgNSk7XHJcblx0fSk7XHJcblxyXG5cdC8vIFRhZ3MgYnV0dG9uIGNsaWNrIGhhbmRsZXJcclxuXHR0YWdzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRjb25zdCBtZW51ID0gbmV3IE1lbnUoKTtcclxuXHRcdFxyXG5cdFx0Ly8gQWRkIGNvbW1vbiB0YWdzIGFzIHF1aWNrIG9wdGlvbnNcclxuXHRcdGNvbnN0IGNvbW1vblRhZ3MgPSBbXCJpbXBvcnRhbnRcIiwgXCJ1cmdlbnRcIiwgXCJ0b2RvXCIsIFwicmV2aWV3XCIsIFwiaWRlYVwiLCBcInF1ZXN0aW9uXCJdO1xyXG5cdFx0XHJcblx0XHRjb21tb25UYWdzLmZvckVhY2goKHRhZykgPT4ge1xyXG5cdFx0XHRjb25zdCBpc0FjdGl2ZSA9IHRhc2tNZXRhZGF0YS50YWdzPy5pbmNsdWRlcyh0YWcpO1xyXG5cdFx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRpdGVtLnNldFRpdGxlKGlzQWN0aXZlID8gYOKckyAjJHt0YWd9YCA6IGAjJHt0YWd9YCk7XHJcblx0XHRcdFx0aXRlbS5zZXRJY29uKFwidGFnXCIpO1xyXG5cdFx0XHRcdGl0ZW0ub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAoIXRhc2tNZXRhZGF0YS50YWdzKSB7XHJcblx0XHRcdFx0XHRcdHRhc2tNZXRhZGF0YS50YWdzID0gW107XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRpZiAoaXNBY3RpdmUpIHtcclxuXHRcdFx0XHRcdFx0Ly8gUmVtb3ZlIHRhZ1xyXG5cdFx0XHRcdFx0XHR0YXNrTWV0YWRhdGEudGFncyA9IHRhc2tNZXRhZGF0YS50YWdzLmZpbHRlcih0ID0+IHQgIT09IHRhZyk7XHJcblx0XHRcdFx0XHRcdGlmICh0YXNrTWV0YWRhdGEudGFncy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0XHRcdFx0XHRkZWxldGUgdGFza01ldGFkYXRhLnRhZ3M7XHJcblx0XHRcdFx0XHRcdFx0dXBkYXRlQnV0dG9uU3RhdGUodGFnc0J1dHRvbiwgZmFsc2UpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHQvLyBBZGQgdGFnXHJcblx0XHRcdFx0XHRcdHRhc2tNZXRhZGF0YS50YWdzLnB1c2godGFnKTtcclxuXHRcdFx0XHRcdFx0dXBkYXRlQnV0dG9uU3RhdGUodGFnc0J1dHRvbiwgdHJ1ZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRtYXJrZG93bkVkaXRvcj8uZWRpdG9yPy5mb2N1cygpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdFx0XHJcblx0XHRtZW51LmFkZFNlcGFyYXRvcigpO1xyXG5cdFx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdGl0ZW0uc2V0VGl0bGUodChcIkNsZWFyIGFsbCB0YWdzXCIpKTtcclxuXHRcdFx0aXRlbS5zZXRJY29uKFwieFwiKTtcclxuXHRcdFx0aXRlbS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRkZWxldGUgdGFza01ldGFkYXRhLnRhZ3M7XHJcblx0XHRcdFx0dXBkYXRlQnV0dG9uU3RhdGUodGFnc0J1dHRvbiwgZmFsc2UpO1xyXG5cdFx0XHRcdG1hcmtkb3duRWRpdG9yPy5lZGl0b3I/LmZvY3VzKCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0XHRcclxuXHRcdGNvbnN0IHJlY3QgPSB0YWdzQnV0dG9uLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG5cdFx0c2hvd01lbnVBdENvb3JkcyhtZW51LCByZWN0LmxlZnQsIHJlY3QuYm90dG9tICsgNSk7XHJcblx0fSk7XHJcblxyXG5cdHJldHVybiB7XHJcblx0XHRkb20sXHJcblx0XHR0b3A6IGZhbHNlLFxyXG5cdFx0Ly8gVXBkYXRlIG1ldGhvZCBnZXRzIGNhbGxlZCBvbiBldmVyeSBlZGl0b3IgdXBkYXRlXHJcblx0XHR1cGRhdGU6ICh1cGRhdGU6IFZpZXdVcGRhdGUpID0+IHtcclxuXHRcdFx0Ly8gSW1wbGVtZW50IGlmIG5lZWRlZCB0byB1cGRhdGUgcGFuZWwgY29udGVudCBiYXNlZCBvbiBlZGl0b3Igc3RhdGVcclxuXHRcdH0sXHJcblx0XHQvLyBEZXN0cm95IG1ldGhvZCBnZXRzIGNhbGxlZCB3aGVuIHRoZSBwYW5lbCBpcyByZW1vdmVkXHJcblx0XHRkZXN0cm95OiAoKSA9PiB7XHJcblx0XHRcdC8vIERlYWN0aXZhdGUgdGhlIHN1Z2dlc3Qgc3lzdGVtXHJcblx0XHRcdGNvbnN0IHBsdWdpbiA9IHZpZXcuc3RhdGUuZmFjZXQocGx1Z2luRmFjZXQpO1xyXG5cdFx0XHRpZiAocGx1Z2luLnF1aWNrQ2FwdHVyZVN1Z2dlc3QpIHtcclxuXHRcdFx0XHRwbHVnaW4ucXVpY2tDYXB0dXJlU3VnZ2VzdC5zZXRRdWlja0NhcHR1cmVDb250ZXh0KGZhbHNlKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0bWFya2Rvd25FZGl0b3I/LmRlc3Ryb3koKTtcclxuXHRcdFx0bWFya2Rvd25FZGl0b3IgPSBudWxsO1xyXG5cdFx0fSxcclxuXHR9O1xyXG59XHJcblxyXG4vLyBGYWNldHMgdG8gbWFrZSBhcHAgYW5kIHBsdWdpbiBpbnN0YW5jZXMgYXZhaWxhYmxlIHRvIHRoZSBwYW5lbFxyXG5leHBvcnQgY29uc3QgYXBwRmFjZXQgPSBGYWNldC5kZWZpbmU8QXBwLCBBcHA+KHtcclxuXHRjb21iaW5lOiAodmFsdWVzKSA9PiB2YWx1ZXNbMF0sXHJcbn0pO1xyXG5cclxuZXhwb3J0IGNvbnN0IHBsdWdpbkZhY2V0ID0gRmFjZXQuZGVmaW5lPFxyXG5cdFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRUYXNrUHJvZ3Jlc3NCYXJQbHVnaW5cclxuPih7XHJcblx0Y29tYmluZTogKHZhbHVlcykgPT4gdmFsdWVzWzBdLFxyXG59KTtcclxuXHJcbi8vIENyZWF0ZSB0aGUgZXh0ZW5zaW9uIHRvIGVuYWJsZSBxdWljayBjYXB0dXJlIGluIGFuIGVkaXRvclxyXG5leHBvcnQgZnVuY3Rpb24gcXVpY2tDYXB0dXJlRXh0ZW5zaW9uKGFwcDogQXBwLCBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbikge1xyXG5cdC8vIENyZWF0ZSBhbmQgcmVnaXN0ZXIgdGhlIHN1Z2dlc3Qgc3lzdGVtXHJcblx0aWYgKCFwbHVnaW4ucXVpY2tDYXB0dXJlU3VnZ2VzdCkge1xyXG5cdFx0cGx1Z2luLnF1aWNrQ2FwdHVyZVN1Z2dlc3QgPSBuZXcgUXVpY2tDYXB0dXJlU3VnZ2VzdChhcHAsIHBsdWdpbik7XHJcblx0XHRwbHVnaW4ucmVnaXN0ZXJFZGl0b3JTdWdnZXN0KHBsdWdpbi5xdWlja0NhcHR1cmVTdWdnZXN0KTtcclxuXHR9XHJcblx0XHJcblx0cmV0dXJuIFtcclxuXHRcdHF1aWNrQ2FwdHVyZVN0YXRlLFxyXG5cdFx0cXVpY2tDYXB0dXJlT3B0aW9ucy5vZih7XHJcblx0XHRcdHRhcmdldEZpbGU6XHJcblx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZT8udGFyZ2V0RmlsZSB8fCBcIlF1aWNrIENhcHR1cmUubWRcIixcclxuXHRcdFx0cGxhY2Vob2xkZXI6XHJcblx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZT8ucGxhY2Vob2xkZXIgfHxcclxuXHRcdFx0XHR0KFwiQ2FwdHVyZSB0aG91Z2h0cywgdGFza3MsIG9yIGlkZWFzLi4uXCIpLFxyXG5cdFx0XHRhcHBlbmRUb0ZpbGU6XHJcblx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZT8uYXBwZW5kVG9GaWxlID8/IFwiYXBwZW5kXCIsXHJcblx0XHRcdHRhcmdldFR5cGU6IHBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmU/LnRhcmdldFR5cGUgPz8gXCJmaXhlZFwiLFxyXG5cdFx0XHR0YXJnZXRIZWFkaW5nOiBwbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlPy50YXJnZXRIZWFkaW5nID8/IFwiXCIsXHJcblx0XHRcdGRhaWx5Tm90ZVNldHRpbmdzOiBwbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlXHJcblx0XHRcdFx0Py5kYWlseU5vdGVTZXR0aW5ncyA/PyB7XHJcblx0XHRcdFx0Zm9ybWF0OiBcIllZWVktTU0tRERcIixcclxuXHRcdFx0XHRmb2xkZXI6IFwiXCIsXHJcblx0XHRcdFx0dGVtcGxhdGU6IFwiXCIsXHJcblx0XHRcdH0sXHJcblx0XHRcdGF1dG9BZGRUYXNrUHJlZml4OlxyXG5cdFx0XHRcdHBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmU/LmF1dG9BZGRUYXNrUHJlZml4ID8/IHRydWUsXHJcblx0XHRcdHRhc2tQcmVmaXg6XHJcblx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZT8udGFza1ByZWZpeCA/PyBcIi0gWyBdXCIsXHJcblx0XHR9KSxcclxuXHRcdGFwcEZhY2V0Lm9mKGFwcCksXHJcblx0XHRwbHVnaW5GYWNldC5vZihwbHVnaW4pLFxyXG5cdF07XHJcbn1cclxuIl19