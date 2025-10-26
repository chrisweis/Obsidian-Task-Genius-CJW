import { __awaiter } from "tslib";
import { Setting, Notice, setIcon } from "obsidian";
import { t } from "@/translations/helper";
import { SingleFolderSuggest } from "@/components/ui/inputs/AutoComplete";
import { ConfirmModal } from "@/components/ui/modals/ConfirmModal";
import { ListConfigModal } from "@/components/ui/modals/ListConfigModal";
import { createFileSourceSettings } from "../components/FileSourceSettingsSection";
/**
 * Renders the Index Settings tab that consolidates all indexing-related settings
 * including Inline Tasks, File Tasks, and Project detection
 */
export function renderIndexSettingsTab(settingTab, containerEl) {
    // Main heading
    new Setting(containerEl)
        .setName(t("Index & Task Source Configuration"))
        .setDesc(t("Configure how Task Genius discovers and indexes tasks from various sources including inline tasks, file metadata, and projects."))
        .setHeading();
    // ========================================
    // SECTION 0: Core Architecture Configuration
    // ========================================
    new Setting(containerEl)
        .setName(t("Enable Indexer"))
        .addToggle((toggle) => {
        var _a;
        toggle.setValue((_a = settingTab.plugin.settings.enableIndexer) !== null && _a !== void 0 ? _a : true);
        toggle.onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.enableIndexer = value;
            settingTab.applySettingsUpdate();
            settingTab.display(); // Refresh settings display
            // Show restart notice
            new Notice(t("Please restart Obsidian for the Indexer change to take effect."), 8000);
        }));
    });
    // ========================================
    // SECTION 1: Task Source Configuration
    // ========================================
    const scopeControls = ensureScopeControls(settingTab.plugin.settings);
    const taskSourceWrapper = containerEl.createDiv({
        cls: "tg-index-task-source-wrapper",
    });
    const switcherRow = taskSourceWrapper.createDiv({
        cls: "fluent-view-tabs tg-index-task-source-switcher",
    });
    const inlineSwitcherButton = switcherRow.createEl("button", {
        cls: "fluent-view-tab clickable-icon",
    });
    const inlineTabIcon = inlineSwitcherButton.createSpan({
        cls: "fluent-view-tab-icon",
    });
    setIcon(inlineTabIcon, "check-square");
    inlineSwitcherButton.createSpan({ cls: "fluent-view-tab-label" }).setText(t("Checkbox Tasks"));
    const fileSwitcherButton = switcherRow.createEl("button", {
        cls: "fluent-view-tab clickable-icon",
    });
    const fileTabIcon = fileSwitcherButton.createSpan({
        cls: "fluent-view-tab-icon",
    });
    setIcon(fileTabIcon, "file-text");
    fileSwitcherButton.createSpan({ cls: "fluent-view-tab-label" }).setText(t("File Tasks"));
    const sourcePanels = taskSourceWrapper.createDiv({
        cls: "tg-index-task-source-panels",
    });
    const inlineContainer = sourcePanels.createDiv({
        cls: "tg-index-task-source-panel",
    });
    const fileContainer = sourcePanels.createDiv({
        cls: "tg-index-task-source-panel",
    });
    // Inline task configuration content is rendered into inlineContainer
    (() => {
        let containerEl = inlineContainer;
        const inlineContentEnabled = scopeControls.inlineTasksEnabled !== false;
        new Setting(containerEl)
            .setName(t("Enable checkbox tasks"))
            .setDesc(t("Index markdown checkbox tasks. Disable this if you only want to use file-based or external task sources."))
            .addToggle((toggle) => {
            toggle.setValue(inlineContentEnabled);
            toggle.onChange((value) => {
                const controls = ensureScopeControls(settingTab.plugin.settings);
                controls.inlineTasksEnabled = value;
                settingTab.applySettingsUpdate();
                if (!value) {
                    new Notice(t("Checkbox task indexing disabled. The index will prune inline tasks shortly."), 6000);
                }
                updateInlineBodyState(value);
            });
        });
        const inlineBodyEl = containerEl.createDiv({
            cls: "tg-source-settings-body",
        });
        const updateInlineBodyState = (enabled) => {
            inlineBodyEl.classList.toggle("tg-source-disabled", !enabled);
        };
        updateInlineBodyState(inlineContentEnabled);
        containerEl = inlineBodyEl;
        new Setting(containerEl)
            .setName(t("Inline task parsing"))
            .setDesc(t("Configure how tasks are parsed from markdown content."))
            .setHeading();
        new Setting(containerEl)
            .setName(t("Prefer metadata format of task"))
            .setDesc(t("You can choose dataview format or tasks format, that will influence both index and save format."))
            .addDropdown((dropdown) => {
            dropdown
                .addOption("dataview", "Dataview")
                .addOption("tasks", "Tasks")
                .setValue(settingTab.plugin.settings.preferMetadataFormat)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                settingTab.plugin.settings.preferMetadataFormat = value;
                settingTab.applySettingsUpdate();
                // Re-render the settings to update prefix configuration UI
                setTimeout(() => {
                    settingTab.display();
                }, 200);
            }));
        });
        // Date Format Configuration
        new Setting(containerEl)
            .setName(t("Enable custom date formats"))
            .setDesc(t("Enable custom date format patterns for parsing dates. When enabled, the parser will try your custom formats before falling back to default formats."))
            .addToggle((toggle) => {
            var _a;
            toggle
                .setValue((_a = settingTab.plugin.settings.enableCustomDateFormats) !== null && _a !== void 0 ? _a : false)
                .onChange((value) => {
                settingTab.plugin.settings.enableCustomDateFormats = value;
                settingTab.applySettingsUpdate();
                settingTab.display(); // Refresh to show/hide custom formats settings
            });
        });
        if (settingTab.plugin.settings.enableCustomDateFormats) {
            new Setting(containerEl)
                .setName(t("Custom date formats"))
                .setDesc(t("Configure custom date format patterns."))
                .addButton((button) => {
                const getCustomFormats = () => {
                    var _a;
                    return (_a = settingTab.plugin.settings.customDateFormats) !== null && _a !== void 0 ? _a : [];
                };
                const updateButtonText = () => {
                    const formats = getCustomFormats();
                    if (formats.length === 0) {
                        button.setButtonText(t("Configure Date Formats"));
                    }
                    else {
                        button.setButtonText(t("{{count}} format(s) configured", {
                            interpolation: {
                                count: formats.length.toString(),
                            },
                        }));
                    }
                };
                updateButtonText();
                button.onClick(() => {
                    new ListConfigModal(settingTab.plugin, {
                        title: t("Configure Custom Date Formats"),
                        description: t("Add custom date format patterns. Date patterns: yyyy (4-digit year), yy (2-digit year), MM (2-digit month), M (1-2 digit month), dd (2-digit day), d (1-2 digit day), MMM (short month name), MMMM (full month name). Time patterns: HH (2-digit hour), mm (2-digit minute), ss (2-digit second). Use single quotes for literals (e.g., 'T' for ISO format)."),
                        placeholder: t("Enter date format (e.g., yyyy-MM-dd or yyyyMMdd_HHmmss)"),
                        values: getCustomFormats(),
                        onSave: (values) => {
                            settingTab.plugin.settings.customDateFormats =
                                values;
                            settingTab.applySettingsUpdate();
                            updateButtonText();
                            new Notice(t("Date formats updated. The parser will now recognize these custom formats."), 6000);
                        },
                    }).open();
                });
            });
            // Add example dates section
            const examplesContainer = containerEl.createDiv({
                cls: "task-genius-date-examples",
            });
            examplesContainer.createEl("h4", {
                text: t("Format Examples:"),
                cls: "task-genius-examples-header",
            });
            const exampleFormats = [
                { format: "yyyy-MM-dd", example: "2025-08-16" },
                { format: "dd/MM/yyyy", example: "16/08/2025" },
                { format: "MM-dd-yyyy", example: "08-16-2025" },
                { format: "yyyy.MM.dd", example: "2025.08.16" },
                { format: "yyyyMMdd", example: "20250816" },
                { format: "yyyyMMdd_HHmmss", example: "20250816_144403" },
                { format: "yyyyMMddHHmmss", example: "20250816144403" },
                { format: "yyyy-MM-dd'T'HH:mm", example: "2025-08-16T14:44" },
                { format: "dd MMM yyyy", example: "16 Aug 2025" },
                { format: "MMM dd, yyyy", example: "Aug 16, 2025" },
                { format: "yyyy年MM月dd日", example: "2025年08月16日" },
            ];
            const table = examplesContainer.createEl("table", {
                cls: "task-genius-date-examples-table",
            });
            const headerRow = table.createEl("tr");
            headerRow.createEl("th", { text: t("Format Pattern") });
            headerRow.createEl("th", { text: t("Example") });
            exampleFormats.forEach(({ format, example }) => {
                const row = table.createEl("tr");
                row.createEl("td", { text: format });
                row.createEl("td", { text: example });
            });
        }
        // Get current metadata format to show appropriate settings
        const isDataviewFormat = settingTab.plugin.settings.preferMetadataFormat === "dataview";
        // Project tag prefix
        new Setting(containerEl)
            .setName(t("Project tag prefix"))
            .setDesc(isDataviewFormat
            ? t("Customize the prefix used for project tags in dataview format (e.g., 'project' for [project:: myproject]). Changes require reindexing.")
            : t("Customize the prefix used for project tags (e.g., 'project' for #project/myproject). Changes require reindexing."))
            .addText((text) => {
            text.setPlaceholder("project")
                .setValue(settingTab.plugin.settings.projectTagPrefix[settingTab.plugin.settings.preferMetadataFormat])
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                settingTab.plugin.settings.projectTagPrefix[settingTab.plugin.settings.preferMetadataFormat] = value || "project";
                settingTab.applySettingsUpdate();
            }));
        });
        // Context tag prefix with special handling
        new Setting(containerEl)
            .setName(t("Context tag prefix"))
            .setDesc(isDataviewFormat
            ? t("Customize the prefix used for context tags in dataview format (e.g., 'context' for [context:: home]). Changes require reindexing.")
            : t("Customize the prefix used for context tags (e.g., '@home' for @home). Changes require reindexing."))
            .addText((text) => {
            text.setPlaceholder("context")
                .setValue(settingTab.plugin.settings.contextTagPrefix[settingTab.plugin.settings.preferMetadataFormat])
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                settingTab.plugin.settings.contextTagPrefix[settingTab.plugin.settings.preferMetadataFormat] = value || (isDataviewFormat ? "context" : "@");
                settingTab.applySettingsUpdate();
            }));
        });
        new Setting(containerEl)
            .setName(t("Ignore all tasks behind heading"))
            .setDesc(t("Configure headings to ignore. Tasks under these headings will be excluded from indexing."))
            .addButton((button) => {
            const getIgnoreHeadings = () => {
                const value = settingTab.plugin.settings.ignoreHeading || "";
                return value
                    .split(",")
                    .map((h) => h.trim())
                    .filter((h) => h);
            };
            const updateButtonText = () => {
                const headings = getIgnoreHeadings();
                if (headings.length === 0) {
                    button.setButtonText(t("Configure Ignore Headings"));
                }
                else {
                    button.setButtonText(t("{{count}} heading(s) configured", {
                        interpolation: {
                            count: headings.length.toString(),
                        },
                    }));
                }
            };
            updateButtonText();
            button.onClick(() => {
                new ListConfigModal(settingTab.plugin, {
                    title: t("Configure Ignore Headings"),
                    description: t("Add headings to ignore. Tasks under these headings will be excluded from indexing. Examples: '## Project', '## Inbox', '# Archive'"),
                    placeholder: t("Enter heading (e.g., ## Inbox)"),
                    values: getIgnoreHeadings(),
                    onSave: (values) => {
                        settingTab.plugin.settings.ignoreHeading =
                            values.join(", ");
                        settingTab.applySettingsUpdate();
                        updateButtonText();
                        new Notice(t("Heading filters updated. Rebuild the task index to apply to existing tasks."), 6000);
                    },
                }).open();
            });
        });
        new Setting(containerEl)
            .setName(t("Focus all tasks behind heading"))
            .setDesc(t("Configure headings to focus on. Only tasks under these headings will be included in indexing."))
            .addButton((button) => {
            const getFocusHeadings = () => {
                const value = settingTab.plugin.settings.focusHeading || "";
                return value
                    .split(",")
                    .map((h) => h.trim())
                    .filter((h) => h);
            };
            const updateButtonText = () => {
                const headings = getFocusHeadings();
                if (headings.length === 0) {
                    button.setButtonText(t("Configure Focus Headings"));
                }
                else {
                    button.setButtonText(t("{{count}} heading(s) configured", {
                        interpolation: {
                            count: headings.length.toString(),
                        },
                    }));
                }
            };
            updateButtonText();
            button.onClick(() => {
                new ListConfigModal(settingTab.plugin, {
                    title: t("Configure Focus Headings"),
                    description: t("Add headings to focus on. Only tasks under these headings will be included in indexing. Examples: '## Project', '## Inbox', '# Tasks'"),
                    placeholder: t("Enter heading (e.g., ## Tasks)"),
                    values: getFocusHeadings(),
                    onSave: (values) => {
                        settingTab.plugin.settings.focusHeading =
                            values.join(", ");
                        settingTab.applySettingsUpdate();
                        updateButtonText();
                        new Notice(t("Heading filters updated. Rebuild the task index to apply to existing tasks."), 6000);
                    },
                }).open();
            });
        });
        new Setting(containerEl)
            .setName(t("Use daily note path as date"))
            .setDesc(t("If enabled, the daily note path will be used as the date for tasks."))
            .addToggle((toggle) => {
            toggle.setValue(settingTab.plugin.settings.useDailyNotePathAsDate);
            toggle.onChange((value) => {
                settingTab.plugin.settings.useDailyNotePathAsDate = value;
                settingTab.applySettingsUpdate();
                setTimeout(() => {
                    settingTab.display();
                }, 200);
            });
        });
        if (settingTab.plugin.settings.useDailyNotePathAsDate) {
            const descFragment = document.createDocumentFragment();
            descFragment.createEl("div", {
                text: t("Task Genius will use moment.js and also this format to parse the daily note path."),
            });
            descFragment.createEl("div", {
                text: t("You need to set `yyyy` instead of `YYYY` in the format string. And `dd` instead of `DD`."),
            });
            new Setting(containerEl)
                .setName(t("Daily note format"))
                .setDesc(descFragment)
                .addText((text) => {
                text.setValue(settingTab.plugin.settings.dailyNoteFormat);
                text.onChange((value) => {
                    settingTab.plugin.settings.dailyNoteFormat = value;
                    settingTab.applySettingsUpdate();
                });
            });
            new Setting(containerEl)
                .setName(t("Daily note path"))
                .setDesc(t("Select the folder that contains the daily note."))
                .addText((text) => {
                new SingleFolderSuggest(settingTab.app, text.inputEl, settingTab.plugin);
                text.setValue(settingTab.plugin.settings.dailyNotePath);
                text.onChange((value) => {
                    settingTab.plugin.settings.dailyNotePath = value;
                    settingTab.applySettingsUpdate();
                });
            });
            new Setting(containerEl)
                .setName(t("Use as date type"))
                .setDesc(t("You can choose due, start, or scheduled as the date type for tasks."))
                .addDropdown((dropdown) => {
                dropdown
                    .addOption("due", t("Due"))
                    .addOption("start", t("Start"))
                    .addOption("scheduled", t("Scheduled"))
                    .setValue(settingTab.plugin.settings.useAsDateType)
                    .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                    settingTab.plugin.settings.useAsDateType = value;
                    settingTab.applySettingsUpdate();
                }));
            });
        }
        // File Metadata Inheritance Settings
        new Setting(containerEl)
            .setName(t("File Metadata Inheritance"))
            .setDesc(t("Configure how tasks inherit metadata from file frontmatter"))
            .setHeading();
        new Setting(containerEl)
            .setName(t("Enable file metadata inheritance"))
            .setDesc(t("Allow tasks to inherit metadata properties from their file's frontmatter"))
            .addToggle((toggle) => toggle
            .setValue(settingTab.plugin.settings.fileMetadataInheritance.enabled)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.fileMetadataInheritance.enabled = value;
            settingTab.applySettingsUpdate();
            new ConfirmModal(settingTab.plugin, {
                title: t("Reindex"),
                message: t("This change affects how tasks inherit metadata from files. Rebuild the index now so changes take effect immediately?"),
                confirmText: t("Reindex"),
                cancelText: t("Cancel"),
                onConfirm: (confirmed) => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    if (!confirmed)
                        return;
                    try {
                        new Notice(t("Clearing task cache and rebuilding index..."));
                        yield ((_a = settingTab.plugin.dataflowOrchestrator) === null || _a === void 0 ? void 0 : _a.onSettingsChange(["parser"]));
                        new Notice(t("Task index completely rebuilt"));
                    }
                    catch (error) {
                        console.error("Failed to reindex after inheritance setting change:", error);
                        new Notice(t("Failed to reindex tasks"));
                    }
                }),
            }).open();
            setTimeout(() => {
                settingTab.display();
            }, 200);
        })));
        if (settingTab.plugin.settings.fileMetadataInheritance.enabled) {
            new Setting(containerEl)
                .setName(t("Inherit from frontmatter"))
                .setDesc(t("Tasks inherit metadata properties like priority, context, etc. from file frontmatter when not explicitly set on the task"))
                .addToggle((toggle) => toggle
                .setValue(settingTab.plugin.settings.fileMetadataInheritance
                .inheritFromFrontmatter)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                settingTab.plugin.settings.fileMetadataInheritance.inheritFromFrontmatter = value;
                settingTab.applySettingsUpdate();
                new ConfirmModal(settingTab.plugin, {
                    title: t("Reindex"),
                    message: t("This change affects how tasks inherit metadata from files. Rebuild the index now so changes take effect immediately?"),
                    confirmText: t("Reindex"),
                    cancelText: t("Cancel"),
                    onConfirm: (confirmed) => __awaiter(this, void 0, void 0, function* () {
                        var _b;
                        if (!confirmed)
                            return;
                        try {
                            new Notice(t("Clearing task cache and rebuilding index..."));
                            yield ((_b = settingTab.plugin.dataflowOrchestrator) === null || _b === void 0 ? void 0 : _b.onSettingsChange(["parser"]));
                            new Notice(t("Task index completely rebuilt"));
                        }
                        catch (error) {
                            console.error("Failed to reindex after inheritance setting change:", error);
                            new Notice(t("Failed to reindex tasks"));
                        }
                    }),
                }).open();
            })));
            new Setting(containerEl)
                .setName(t("Inherit from frontmatter for subtasks"))
                .setDesc(t("Allow subtasks to inherit metadata from file frontmatter. When disabled, only top-level tasks inherit file metadata"))
                .addToggle((toggle) => toggle
                .setValue(settingTab.plugin.settings.fileMetadataInheritance
                .inheritFromFrontmatterForSubtasks)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                settingTab.plugin.settings.fileMetadataInheritance.inheritFromFrontmatterForSubtasks = value;
                settingTab.applySettingsUpdate();
                new ConfirmModal(settingTab.plugin, {
                    title: t("Reindex"),
                    message: t("This change affects how tasks inherit metadata from files. Rebuild the index now so changes take effect immediately?"),
                    confirmText: t("Reindex"),
                    cancelText: t("Cancel"),
                    onConfirm: (confirmed) => __awaiter(this, void 0, void 0, function* () {
                        var _c;
                        if (!confirmed)
                            return;
                        try {
                            new Notice(t("Clearing task cache and rebuilding index..."));
                            yield ((_c = settingTab.plugin.dataflowOrchestrator) === null || _c === void 0 ? void 0 : _c.onSettingsChange(["parser"]));
                            new Notice(t("Task index completely rebuilt"));
                        }
                        catch (error) {
                            console.error("Failed to reindex after inheritance setting change:", error);
                            new Notice(t("Failed to reindex tasks"));
                        }
                    }),
                }).open();
            })));
        }
    })();
    // ========================================
    // SECTION 2: File Task Configuration
    // ========================================
    (() => {
        const containerEl = fileContainer;
        const fileSourceSettings = settingTab.plugin.settings.fileSource;
        const fileTasksEnabled = scopeControls.fileTasksEnabled !== false &&
            Boolean(fileSourceSettings === null || fileSourceSettings === void 0 ? void 0 : fileSourceSettings.enabled);
        new Setting(containerEl)
            .setName(t("Enable file tasks"))
            .setDesc(t("Allow Task Genius to recognize files as tasks using metadata, tags, or templates."))
            .addToggle((toggle) => {
            toggle.setValue(fileTasksEnabled);
            toggle.onChange((value) => {
                const controls = ensureScopeControls(settingTab.plugin.settings);
                controls.fileTasksEnabled = value;
                if (!settingTab.plugin.settings.fileSource) {
                    settingTab.plugin.settings.fileSource = {
                        enabled: value,
                    };
                }
                else {
                    settingTab.plugin.settings.fileSource.enabled = value;
                }
                settingTab.applySettingsUpdate();
                updateFileBodyState(value);
                renderFileSourceSection();
                if (!value) {
                    new Notice(t("File task recognition disabled. Existing file tasks will be pruned shortly."), 6000);
                }
            });
        });
        const fileBodyEl = containerEl.createDiv({
            cls: "tg-source-settings-body",
        });
        const updateFileBodyState = (enabled) => {
            fileBodyEl.classList.toggle("tg-source-disabled", !enabled);
        };
        updateFileBodyState(fileTasksEnabled);
        const fileSettingsContainer = fileBodyEl;
        new Setting(fileSettingsContainer)
            .setName(t("File Task Configuration"))
            .setDesc(t("Configure how files can be recognized and treated as tasks with various strategies."))
            .setHeading();
        const fileSourceContainerEl = fileSettingsContainer.createDiv("file-source-container");
        const renderFileSourceSection = () => {
            var _a;
            fileSourceContainerEl.empty();
            if ((_a = settingTab.plugin.settings.fileSource) === null || _a === void 0 ? void 0 : _a.enabled) {
                createFileSourceSettings(fileSourceContainerEl, settingTab.plugin, {
                    showEnableToggle: false,
                });
            }
            else {
                fileSourceContainerEl.createDiv({
                    cls: "setting-item-description",
                    text: t("File tasks are disabled. Enable them to configure recognition strategies."),
                });
            }
        };
        renderFileSourceSection();
    })();
    const setActiveTaskSourcePanel = (panel) => {
        inlineContainer.toggleAttribute("hidden", panel !== "inline");
        fileContainer.toggleAttribute("hidden", panel !== "file");
        inlineSwitcherButton.classList.toggle("is-active", panel === "inline");
        fileSwitcherButton.classList.toggle("is-active", panel === "file");
    };
    const initialPanel = scopeControls.inlineTasksEnabled === false &&
        scopeControls.fileTasksEnabled !== false
        ? "file"
        : "inline";
    setActiveTaskSourcePanel(initialPanel);
    inlineSwitcherButton.addEventListener("click", () => setActiveTaskSourcePanel("inline"));
    fileSwitcherButton.addEventListener("click", () => setActiveTaskSourcePanel("file"));
    // ========================================
    // SECTION 3: Performance Settings
    // ========================================
    new Setting(containerEl)
        .setName(t("Performance Configuration"))
        .setDesc(t("Configure performance-related indexing settings"))
        .setHeading();
    new Setting(containerEl)
        .setName(t("Enable worker processing"))
        .setDesc(t("Use background worker for file parsing to improve performance. Recommended for large vaults."))
        .addToggle((toggle) => {
        var _a, _b, _c;
        // Use the new fileSource.performance.enableWorkerProcessing setting
        toggle.setValue((_c = (_b = (_a = settingTab.plugin.settings.fileSource) === null || _a === void 0 ? void 0 : _a.performance) === null || _b === void 0 ? void 0 : _b.enableWorkerProcessing) !== null && _c !== void 0 ? _c : true);
        toggle.onChange((value) => {
            // Ensure fileSource and performance objects exist
            if (!settingTab.plugin.settings.fileSource) {
                // Initialize with minimal required properties
                settingTab.plugin.settings.fileSource = {
                    enabled: false,
                    performance: {
                        enableWorkerProcessing: true,
                        enableCaching: true,
                        cacheTTL: 300000,
                    },
                };
            }
            if (!settingTab.plugin.settings.fileSource.performance) {
                settingTab.plugin.settings.fileSource.performance = {
                    enableWorkerProcessing: true,
                    enableCaching: true,
                    cacheTTL: 300000,
                };
            }
            // Update the setting
            settingTab.plugin.settings.fileSource.performance.enableWorkerProcessing =
                value;
            // Also update the legacy fileParsingConfig for backward compatibility
            if (settingTab.plugin.settings.fileParsingConfig) {
                settingTab.plugin.settings.fileParsingConfig.enableWorkerProcessing =
                    value;
            }
            settingTab.applySettingsUpdate();
        });
    });
    // ========================================
    // SECTION 5: Index Maintenance
    // ========================================
    new Setting(containerEl)
        .setName(t("Index Maintenance"))
        .setDesc(t("Tools for managing and rebuilding the task index"))
        .setHeading();
    new Setting(containerEl)
        .setName(t("Rebuild index"))
        .setDesc(t("Force a complete rebuild of the task index. Use this if you notice missing or incorrect tasks."))
        .setClass("mod-warning")
        .addButton((button) => {
        button.setButtonText(t("Rebuild")).onClick(() => __awaiter(this, void 0, void 0, function* () {
            new ConfirmModal(settingTab.plugin, {
                title: t("Reindex"),
                message: t("Are you sure you want to force reindex all tasks?"),
                confirmText: t("Reindex"),
                cancelText: t("Cancel"),
                onConfirm: (confirmed) => __awaiter(this, void 0, void 0, function* () {
                    if (!confirmed)
                        return;
                    try {
                        new Notice(t("Clearing task cache and rebuilding index..."));
                        if (settingTab.plugin.dataflowOrchestrator) {
                            yield settingTab.plugin.dataflowOrchestrator.rebuild();
                        }
                        new Notice(t("Task index completely rebuilt"));
                    }
                    catch (error) {
                        console.error("Failed to force reindex tasks:", error);
                        new Notice(t("Failed to force reindex tasks"));
                    }
                }),
            }).open();
        }));
    });
}
function ensureScopeControls(settings) {
    var _a, _b, _c, _d, _e;
    const scopeControls = (_a = settings.fileFilter.scopeControls) !== null && _a !== void 0 ? _a : (settings.fileFilter.scopeControls = {
        inlineTasksEnabled: true,
        fileTasksEnabled: (_c = (_b = settings.fileSource) === null || _b === void 0 ? void 0 : _b.enabled) !== null && _c !== void 0 ? _c : false,
    });
    if (scopeControls.inlineTasksEnabled === undefined) {
        scopeControls.inlineTasksEnabled = true;
    }
    if (scopeControls.fileTasksEnabled === undefined) {
        scopeControls.fileTasksEnabled = (_e = (_d = settings.fileSource) === null || _d === void 0 ? void 0 : _d.enabled) !== null && _e !== void 0 ? _e : false;
    }
    return scopeControls;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSW5kZXhTZXR0aW5nc1RhYi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkluZGV4U2V0dGluZ3NUYWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUVwRCxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDMUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQU1uRjs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsc0JBQXNCLENBQ3JDLFVBQXFDLEVBQ3JDLFdBQXdCO0lBRXhCLGVBQWU7SUFDZixJQUFJLE9BQU8sQ0FBQyxXQUFXLENBQUM7U0FDdEIsT0FBTyxDQUFDLENBQUMsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO1NBQy9DLE9BQU8sQ0FDUCxDQUFDLENBQ0EsaUlBQWlJLENBQ2pJLENBQ0Q7U0FDQSxVQUFVLEVBQUUsQ0FBQztJQUVmLDJDQUEyQztJQUMzQyw2Q0FBNkM7SUFDN0MsMkNBQTJDO0lBQzNDLElBQUksT0FBTyxDQUFDLFdBQVcsQ0FBQztTQUN0QixPQUFPLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUM7U0FDNUIsU0FBUyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7O1FBQ3JCLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBQSxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxhQUFhLG1DQUFJLElBQUksQ0FBQyxDQUFDO1FBQ2xFLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBTyxLQUFLLEVBQUUsRUFBRTtZQUMvQixVQUFVLENBQUMs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Y29uIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFRhc2tQcm9ncmVzc0JhclNldHRpbmdUYWIgfSBmcm9tIFwiQC9zZXR0aW5nXCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCB7IFNpbmdsZUZvbGRlclN1Z2dlc3QgfSBmcm9tIFwiQC9jb21wb25lbnRzL3VpL2lucHV0cy9BdXRvQ29tcGxldGVcIjtcclxuaW1wb3J0IHsgQ29uZmlybU1vZGFsIH0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9tb2RhbHMvQ29uZmlybU1vZGFsXCI7XHJcbmltcG9ydCB7IExpc3RDb25maWdNb2RhbCB9IGZyb20gXCJAL2NvbXBvbmVudHMvdWkvbW9kYWxzL0xpc3RDb25maWdNb2RhbFwiO1xyXG5pbXBvcnQgeyBjcmVhdGVGaWxlU291cmNlU2V0dGluZ3MgfSBmcm9tIFwiLi4vY29tcG9uZW50cy9GaWxlU291cmNlU2V0dGluZ3NTZWN0aW9uXCI7XHJcbmltcG9ydCB0eXBlIHtcclxuXHRGaWxlRmlsdGVyU2NvcGVDb250cm9scyxcclxuXHRUYXNrUHJvZ3Jlc3NCYXJTZXR0aW5ncyxcclxufSBmcm9tIFwiQC9jb21tb24vc2V0dGluZy1kZWZpbml0aW9uXCI7XHJcblxyXG4vKipcclxuICogUmVuZGVycyB0aGUgSW5kZXggU2V0dGluZ3MgdGFiIHRoYXQgY29uc29saWRhdGVzIGFsbCBpbmRleGluZy1yZWxhdGVkIHNldHRpbmdzXHJcbiAqIGluY2x1ZGluZyBJbmxpbmUgVGFza3MsIEZpbGUgVGFza3MsIGFuZCBQcm9qZWN0IGRldGVjdGlvblxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlckluZGV4U2V0dGluZ3NUYWIoXHJcblx0c2V0dGluZ1RhYjogVGFza1Byb2dyZXNzQmFyU2V0dGluZ1RhYixcclxuXHRjb250YWluZXJFbDogSFRNTEVsZW1lbnRcclxuKSB7XHJcblx0Ly8gTWFpbiBoZWFkaW5nXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiSW5kZXggJiBUYXNrIFNvdXJjZSBDb25maWd1cmF0aW9uXCIpKVxyXG5cdFx0LnNldERlc2MoXHJcblx0XHRcdHQoXHJcblx0XHRcdFx0XCJDb25maWd1cmUgaG93IFRhc2sgR2VuaXVzIGRpc2NvdmVycyBhbmQgaW5kZXhlcyB0YXNrcyBmcm9tIHZhcmlvdXMgc291cmNlcyBpbmNsdWRpbmcgaW5saW5lIHRhc2tzLCBmaWxlIG1ldGFkYXRhLCBhbmQgcHJvamVjdHMuXCJcclxuXHRcdFx0KVxyXG5cdFx0KVxyXG5cdFx0LnNldEhlYWRpbmcoKTtcclxuXHJcblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cdC8vIFNFQ1RJT04gMDogQ29yZSBBcmNoaXRlY3R1cmUgQ29uZmlndXJhdGlvblxyXG5cdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJFbmFibGUgSW5kZXhlclwiKSlcclxuXHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xyXG5cdFx0XHR0b2dnbGUuc2V0VmFsdWUoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZW5hYmxlSW5kZXhlciA/PyB0cnVlKTtcclxuXHRcdFx0dG9nZ2xlLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmVuYWJsZUluZGV4ZXIgPSB2YWx1ZTtcclxuXHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRzZXR0aW5nVGFiLmRpc3BsYXkoKTsgLy8gUmVmcmVzaCBzZXR0aW5ncyBkaXNwbGF5XHJcblxyXG5cdFx0XHRcdC8vIFNob3cgcmVzdGFydCBub3RpY2VcclxuXHRcdFx0XHRuZXcgTm90aWNlKFxyXG5cdFx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFx0XCJQbGVhc2UgcmVzdGFydCBPYnNpZGlhbiBmb3IgdGhlIEluZGV4ZXIgY2hhbmdlIHRvIHRha2UgZWZmZWN0LlwiXHJcblx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0ODAwMFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuXHQvLyBTRUNUSU9OIDE6IFRhc2sgU291cmNlIENvbmZpZ3VyYXRpb25cclxuXHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcblx0Y29uc3Qgc2NvcGVDb250cm9scyA9IGVuc3VyZVNjb3BlQ29udHJvbHMoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MpO1xyXG5cclxuXHRjb25zdCB0YXNrU291cmNlV3JhcHBlciA9IGNvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRjbHM6IFwidGctaW5kZXgtdGFzay1zb3VyY2Utd3JhcHBlclwiLFxyXG5cdH0pO1xyXG5cdGNvbnN0IHN3aXRjaGVyUm93ID0gdGFza1NvdXJjZVdyYXBwZXIuY3JlYXRlRGl2KHtcclxuXHRcdGNsczogXCJmbHVlbnQtdmlldy10YWJzIHRnLWluZGV4LXRhc2stc291cmNlLXN3aXRjaGVyXCIsXHJcblx0fSk7XHJcblx0Y29uc3QgaW5saW5lU3dpdGNoZXJCdXR0b24gPSBzd2l0Y2hlclJvdy5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRjbHM6IFwiZmx1ZW50LXZpZXctdGFiIGNsaWNrYWJsZS1pY29uXCIsXHJcblx0fSk7XHJcblx0Y29uc3QgaW5saW5lVGFiSWNvbiA9IGlubGluZVN3aXRjaGVyQnV0dG9uLmNyZWF0ZVNwYW4oe1xyXG5cdFx0Y2xzOiBcImZsdWVudC12aWV3LXRhYi1pY29uXCIsXHJcblx0fSk7XHJcblx0c2V0SWNvbihpbmxpbmVUYWJJY29uLCBcImNoZWNrLXNxdWFyZVwiKTtcclxuXHRpbmxpbmVTd2l0Y2hlckJ1dHRvbi5jcmVhdGVTcGFuKHtjbHM6IFwiZmx1ZW50LXZpZXctdGFiLWxhYmVsXCJ9KS5zZXRUZXh0KFxyXG5cdFx0dChcIkNoZWNrYm94IFRhc2tzXCIpXHJcblx0KTtcclxuXHJcblx0Y29uc3QgZmlsZVN3aXRjaGVyQnV0dG9uID0gc3dpdGNoZXJSb3cuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0Y2xzOiBcImZsdWVudC12aWV3LXRhYiBjbGlja2FibGUtaWNvblwiLFxyXG5cdH0pO1xyXG5cdGNvbnN0IGZpbGVUYWJJY29uID0gZmlsZVN3aXRjaGVyQnV0dG9uLmNyZWF0ZVNwYW4oe1xyXG5cdFx0Y2xzOiBcImZsdWVudC12aWV3LXRhYi1pY29uXCIsXHJcblx0fSk7XHJcblx0c2V0SWNvbihmaWxlVGFiSWNvbiwgXCJmaWxlLXRleHRcIik7XHJcblx0ZmlsZVN3aXRjaGVyQnV0dG9uLmNyZWF0ZVNwYW4oe2NsczogXCJmbHVlbnQtdmlldy10YWItbGFiZWxcIn0pLnNldFRleHQoXHJcblx0XHR0KFwiRmlsZSBUYXNrc1wiKVxyXG5cdCk7XHJcblxyXG5cdGNvbnN0IHNvdXJjZVBhbmVscyA9IHRhc2tTb3VyY2VXcmFwcGVyLmNyZWF0ZURpdih7XHJcblx0XHRjbHM6IFwidGctaW5kZXgtdGFzay1zb3VyY2UtcGFuZWxzXCIsXHJcblx0fSk7XHJcblx0Y29uc3QgaW5saW5lQ29udGFpbmVyID0gc291cmNlUGFuZWxzLmNyZWF0ZURpdih7XHJcblx0XHRjbHM6IFwidGctaW5kZXgtdGFzay1zb3VyY2UtcGFuZWxcIixcclxuXHR9KTtcclxuXHRjb25zdCBmaWxlQ29udGFpbmVyID0gc291cmNlUGFuZWxzLmNyZWF0ZURpdih7XHJcblx0XHRjbHM6IFwidGctaW5kZXgtdGFzay1zb3VyY2UtcGFuZWxcIixcclxuXHR9KTtcclxuXHJcblx0Ly8gSW5saW5lIHRhc2sgY29uZmlndXJhdGlvbiBjb250ZW50IGlzIHJlbmRlcmVkIGludG8gaW5saW5lQ29udGFpbmVyXHJcblx0KCgpID0+IHtcclxuXHRcdGxldCBjb250YWluZXJFbDogSFRNTEVsZW1lbnQgPSBpbmxpbmVDb250YWluZXI7XHJcblx0XHRjb25zdCBpbmxpbmVDb250ZW50RW5hYmxlZCA9XHJcblx0XHRcdHNjb3BlQ29udHJvbHMuaW5saW5lVGFza3NFbmFibGVkICE9PSBmYWxzZTtcclxuXHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0LnNldE5hbWUodChcIkVuYWJsZSBjaGVja2JveCB0YXNrc1wiKSlcclxuXHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFwiSW5kZXggbWFya2Rvd24gY2hlY2tib3ggdGFza3MuIERpc2FibGUgdGhpcyBpZiB5b3Ugb25seSB3YW50IHRvIHVzZSBmaWxlLWJhc2VkIG9yIGV4dGVybmFsIHRhc2sgc291cmNlcy5cIlxyXG5cdFx0XHRcdClcclxuXHRcdFx0KVxyXG5cdFx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcclxuXHRcdFx0XHR0b2dnbGUuc2V0VmFsdWUoaW5saW5lQ29udGVudEVuYWJsZWQpO1xyXG5cdFx0XHRcdHRvZ2dsZS5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdGNvbnN0IGNvbnRyb2xzID0gZW5zdXJlU2NvcGVDb250cm9scyhcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3NcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRjb250cm9scy5pbmxpbmVUYXNrc0VuYWJsZWQgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0aWYgKCF2YWx1ZSkge1xyXG5cdFx0XHRcdFx0XHRuZXcgTm90aWNlKFxyXG5cdFx0XHRcdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcdFx0XHRcIkNoZWNrYm94IHRhc2sgaW5kZXhpbmcgZGlzYWJsZWQuIFRoZSBpbmRleCB3aWxsIHBydW5lIGlubGluZSB0YXNrcyBzaG9ydGx5LlwiXHJcblx0XHRcdFx0XHRcdFx0KSxcclxuXHRcdFx0XHRcdFx0XHQ2MDAwXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR1cGRhdGVJbmxpbmVCb2R5U3RhdGUodmFsdWUpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRjb25zdCBpbmxpbmVCb2R5RWwgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwidGctc291cmNlLXNldHRpbmdzLWJvZHlcIixcclxuXHRcdH0pO1xyXG5cdFx0Y29uc3QgdXBkYXRlSW5saW5lQm9keVN0YXRlID0gKGVuYWJsZWQ6IGJvb2xlYW4pID0+IHtcclxuXHRcdFx0aW5saW5lQm9keUVsLmNsYXNzTGlzdC50b2dnbGUoXCJ0Zy1zb3VyY2UtZGlzYWJsZWRcIiwgIWVuYWJsZWQpO1xyXG5cdFx0fTtcclxuXHRcdHVwZGF0ZUlubGluZUJvZHlTdGF0ZShpbmxpbmVDb250ZW50RW5hYmxlZCk7XHJcblx0XHRjb250YWluZXJFbCA9IGlubGluZUJvZHlFbDtcclxuXHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0LnNldE5hbWUodChcIklubGluZSB0YXNrIHBhcnNpbmdcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJDb25maWd1cmUgaG93IHRhc2tzIGFyZSBwYXJzZWQgZnJvbSBtYXJrZG93biBjb250ZW50LlwiKSlcclxuXHRcdFx0LnNldEhlYWRpbmcoKTtcclxuXHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0LnNldE5hbWUodChcIlByZWZlciBtZXRhZGF0YSBmb3JtYXQgb2YgdGFza1wiKSlcclxuXHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFwiWW91IGNhbiBjaG9vc2UgZGF0YXZpZXcgZm9ybWF0IG9yIHRhc2tzIGZvcm1hdCwgdGhhdCB3aWxsIGluZmx1ZW5jZSBib3RoIGluZGV4IGFuZCBzYXZlIGZvcm1hdC5cIlxyXG5cdFx0XHRcdClcclxuXHRcdFx0KVxyXG5cdFx0XHQuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XHJcblx0XHRcdFx0ZHJvcGRvd25cclxuXHRcdFx0XHRcdC5hZGRPcHRpb24oXCJkYXRhdmlld1wiLCBcIkRhdGF2aWV3XCIpXHJcblx0XHRcdFx0XHQuYWRkT3B0aW9uKFwidGFza3NcIiwgXCJUYXNrc1wiKVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByZWZlck1ldGFkYXRhRm9ybWF0KVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcmVmZXJNZXRhZGF0YUZvcm1hdCA9IHZhbHVlIGFzXHJcblx0XHRcdFx0XHRcdFx0fCBcImRhdGF2aWV3XCJcclxuXHRcdFx0XHRcdFx0XHR8IFwidGFza3NcIjtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHRcdC8vIFJlLXJlbmRlciB0aGUgc2V0dGluZ3MgdG8gdXBkYXRlIHByZWZpeCBjb25maWd1cmF0aW9uIFVJXHJcblx0XHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIuZGlzcGxheSgpO1xyXG5cdFx0XHRcdFx0XHR9LCAyMDApO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdC8vIERhdGUgRm9ybWF0IENvbmZpZ3VyYXRpb25cclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiRW5hYmxlIGN1c3RvbSBkYXRlIGZvcm1hdHNcIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcIkVuYWJsZSBjdXN0b20gZGF0ZSBmb3JtYXQgcGF0dGVybnMgZm9yIHBhcnNpbmcgZGF0ZXMuIFdoZW4gZW5hYmxlZCwgdGhlIHBhcnNlciB3aWxsIHRyeSB5b3VyIGN1c3RvbSBmb3JtYXRzIGJlZm9yZSBmYWxsaW5nIGJhY2sgdG8gZGVmYXVsdCBmb3JtYXRzLlwiXHJcblx0XHRcdFx0KVxyXG5cdFx0XHQpXHJcblx0XHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xyXG5cdFx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5lbmFibGVDdXN0b21EYXRlRm9ybWF0cyA/PyBmYWxzZVxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5lbmFibGVDdXN0b21EYXRlRm9ybWF0cyA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5kaXNwbGF5KCk7IC8vIFJlZnJlc2ggdG8gc2hvdy9oaWRlIGN1c3RvbSBmb3JtYXRzIHNldHRpbmdzXHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0aWYgKHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmVuYWJsZUN1c3RvbURhdGVGb3JtYXRzKSB7XHJcblx0XHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHRcdC5zZXROYW1lKHQoXCJDdXN0b20gZGF0ZSBmb3JtYXRzXCIpKVxyXG5cdFx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFx0XCJDb25maWd1cmUgY3VzdG9tIGRhdGUgZm9ybWF0IHBhdHRlcm5zLlwiXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdFx0KVxyXG5cdFx0XHRcdC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc3QgZ2V0Q3VzdG9tRm9ybWF0cyA9ICgpID0+IHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmN1c3RvbURhdGVGb3JtYXRzID8/IFtdO1xyXG5cdFx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0XHRjb25zdCB1cGRhdGVCdXR0b25UZXh0ID0gKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBmb3JtYXRzID0gZ2V0Q3VzdG9tRm9ybWF0cygpO1xyXG5cdFx0XHRcdFx0XHRpZiAoZm9ybWF0cy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0XHRcdFx0XHRidXR0b24uc2V0QnV0dG9uVGV4dCh0KFwiQ29uZmlndXJlIERhdGUgRm9ybWF0c1wiKSk7XHJcblx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0YnV0dG9uLnNldEJ1dHRvblRleHQoXHJcblx0XHRcdFx0XHRcdFx0XHR0KFwie3tjb3VudH19IGZvcm1hdChzKSBjb25maWd1cmVkXCIsIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0aW50ZXJwb2xhdGlvbjoge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGNvdW50OiBmb3JtYXRzLmxlbmd0aC50b1N0cmluZygpLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdFx0fSlcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRcdHVwZGF0ZUJ1dHRvblRleHQoKTtcclxuXHRcdFx0XHRcdGJ1dHRvbi5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0bmV3IExpc3RDb25maWdNb2RhbChzZXR0aW5nVGFiLnBsdWdpbiwge1xyXG5cdFx0XHRcdFx0XHRcdHRpdGxlOiB0KFwiQ29uZmlndXJlIEN1c3RvbSBEYXRlIEZvcm1hdHNcIiksXHJcblx0XHRcdFx0XHRcdFx0ZGVzY3JpcHRpb246IHQoXHJcblx0XHRcdFx0XHRcdFx0XHRcIkFkZCBjdXN0b20gZGF0ZSBmb3JtYXQgcGF0dGVybnMuIERhdGUgcGF0dGVybnM6IHl5eXkgKDQtZGlnaXQgeWVhciksIHl5ICgyLWRpZ2l0IHllYXIpLCBNTSAoMi1kaWdpdCBtb250aCksIE0gKDEtMiBkaWdpdCBtb250aCksIGRkICgyLWRpZ2l0IGRheSksIGQgKDEtMiBkaWdpdCBkYXkpLCBNTU0gKHNob3J0IG1vbnRoIG5hbWUpLCBNTU1NIChmdWxsIG1vbnRoIG5hbWUpLiBUaW1lIHBhdHRlcm5zOiBISCAoMi1kaWdpdCBob3VyKSwgbW0gKDItZGlnaXQgbWludXRlKSwgc3MgKDItZGlnaXQgc2Vjb25kKS4gVXNlIHNpbmdsZSBxdW90ZXMgZm9yIGxpdGVyYWxzIChlLmcuLCAnVCcgZm9yIElTTyBmb3JtYXQpLlwiXHJcblx0XHRcdFx0XHRcdFx0KSxcclxuXHRcdFx0XHRcdFx0XHRwbGFjZWhvbGRlcjogdChcclxuXHRcdFx0XHRcdFx0XHRcdFwiRW50ZXIgZGF0ZSBmb3JtYXQgKGUuZy4sIHl5eXktTU0tZGQgb3IgeXl5eU1NZGRfSEhtbXNzKVwiXHJcblx0XHRcdFx0XHRcdFx0KSxcclxuXHRcdFx0XHRcdFx0XHR2YWx1ZXM6IGdldEN1c3RvbUZvcm1hdHMoKSxcclxuXHRcdFx0XHRcdFx0XHRvblNhdmU6ICh2YWx1ZXMpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmN1c3RvbURhdGVGb3JtYXRzID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0dmFsdWVzO1xyXG5cdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHRcdFx0XHR1cGRhdGVCdXR0b25UZXh0KCk7XHJcblx0XHRcdFx0XHRcdFx0XHRuZXcgTm90aWNlKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFwiRGF0ZSBmb3JtYXRzIHVwZGF0ZWQuIFRoZSBwYXJzZXIgd2lsbCBub3cgcmVjb2duaXplIHRoZXNlIGN1c3RvbSBmb3JtYXRzLlwiXHJcblx0XHRcdFx0XHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHRcdFx0XHRcdDYwMDBcclxuXHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0fSkub3BlbigpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBBZGQgZXhhbXBsZSBkYXRlcyBzZWN0aW9uXHJcblx0XHRcdGNvbnN0IGV4YW1wbGVzQ29udGFpbmVyID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwidGFzay1nZW5pdXMtZGF0ZS1leGFtcGxlc1wiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGV4YW1wbGVzQ29udGFpbmVyLmNyZWF0ZUVsKFwiaDRcIiwge1xyXG5cdFx0XHRcdHRleHQ6IHQoXCJGb3JtYXQgRXhhbXBsZXM6XCIpLFxyXG5cdFx0XHRcdGNsczogXCJ0YXNrLWdlbml1cy1leGFtcGxlcy1oZWFkZXJcIixcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCBleGFtcGxlRm9ybWF0cyA9IFtcclxuXHRcdFx0XHR7Zm9ybWF0OiBcInl5eXktTU0tZGRcIiwgZXhhbXBsZTogXCIyMDI1LTA4LTE2XCJ9LFxyXG5cdFx0XHRcdHtmb3JtYXQ6IFwiZGQvTU0veXl5eVwiLCBleGFtcGxlOiBcIjE2LzA4LzIwMjVcIn0sXHJcblx0XHRcdFx0e2Zvcm1hdDogXCJNTS1kZC15eXl5XCIsIGV4YW1wbGU6IFwiMDgtMTYtMjAyNVwifSxcclxuXHRcdFx0XHR7Zm9ybWF0OiBcInl5eXkuTU0uZGRcIiwgZXhhbXBsZTogXCIyMDI1LjA4LjE2XCJ9LFxyXG5cdFx0XHRcdHtmb3JtYXQ6IFwieXl5eU1NZGRcIiwgZXhhbXBsZTogXCIyMDI1MDgxNlwifSxcclxuXHRcdFx0XHR7Zm9ybWF0OiBcInl5eXlNTWRkX0hIbW1zc1wiLCBleGFtcGxlOiBcIjIwMjUwODE2XzE0NDQwM1wifSxcclxuXHRcdFx0XHR7Zm9ybWF0OiBcInl5eXlNTWRkSEhtbXNzXCIsIGV4YW1wbGU6IFwiMjAyNTA4MTYxNDQ0MDNcIn0sXHJcblx0XHRcdFx0e2Zvcm1hdDogXCJ5eXl5LU1NLWRkJ1QnSEg6bW1cIiwgZXhhbXBsZTogXCIyMDI1LTA4LTE2VDE0OjQ0XCJ9LFxyXG5cdFx0XHRcdHtmb3JtYXQ6IFwiZGQgTU1NIHl5eXlcIiwgZXhhbXBsZTogXCIxNiBBdWcgMjAyNVwifSxcclxuXHRcdFx0XHR7Zm9ybWF0OiBcIk1NTSBkZCwgeXl5eVwiLCBleGFtcGxlOiBcIkF1ZyAxNiwgMjAyNVwifSxcclxuXHRcdFx0XHR7Zm9ybWF0OiBcInl5eXnlubRNTeaciGRk5pelXCIsIGV4YW1wbGU6IFwiMjAyNeW5tDA45pyIMTbml6VcIn0sXHJcblx0XHRcdF07XHJcblxyXG5cdFx0XHRjb25zdCB0YWJsZSA9IGV4YW1wbGVzQ29udGFpbmVyLmNyZWF0ZUVsKFwidGFibGVcIiwge1xyXG5cdFx0XHRcdGNsczogXCJ0YXNrLWdlbml1cy1kYXRlLWV4YW1wbGVzLXRhYmxlXCIsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgaGVhZGVyUm93ID0gdGFibGUuY3JlYXRlRWwoXCJ0clwiKTtcclxuXHRcdFx0aGVhZGVyUm93LmNyZWF0ZUVsKFwidGhcIiwge3RleHQ6IHQoXCJGb3JtYXQgUGF0dGVyblwiKX0pO1xyXG5cdFx0XHRoZWFkZXJSb3cuY3JlYXRlRWwoXCJ0aFwiLCB7dGV4dDogdChcIkV4YW1wbGVcIil9KTtcclxuXHJcblx0XHRcdGV4YW1wbGVGb3JtYXRzLmZvckVhY2goKHtmb3JtYXQsIGV4YW1wbGV9KSA9PiB7XHJcblx0XHRcdFx0Y29uc3Qgcm93ID0gdGFibGUuY3JlYXRlRWwoXCJ0clwiKTtcclxuXHRcdFx0XHRyb3cuY3JlYXRlRWwoXCJ0ZFwiLCB7dGV4dDogZm9ybWF0fSk7XHJcblx0XHRcdFx0cm93LmNyZWF0ZUVsKFwidGRcIiwge3RleHQ6IGV4YW1wbGV9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gR2V0IGN1cnJlbnQgbWV0YWRhdGEgZm9ybWF0IHRvIHNob3cgYXBwcm9wcmlhdGUgc2V0dGluZ3NcclxuXHRcdGNvbnN0IGlzRGF0YXZpZXdGb3JtYXQgPVxyXG5cdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcmVmZXJNZXRhZGF0YUZvcm1hdCA9PT0gXCJkYXRhdmlld1wiO1xyXG5cclxuXHRcdC8vIFByb2plY3QgdGFnIHByZWZpeFxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJQcm9qZWN0IHRhZyBwcmVmaXhcIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdGlzRGF0YXZpZXdGb3JtYXRcclxuXHRcdFx0XHRcdD8gdChcclxuXHRcdFx0XHRcdFx0XCJDdXN0b21pemUgdGhlIHByZWZpeCB1c2VkIGZvciBwcm9qZWN0IHRhZ3MgaW4gZGF0YXZpZXcgZm9ybWF0IChlLmcuLCAncHJvamVjdCcgZm9yIFtwcm9qZWN0OjogbXlwcm9qZWN0XSkuIENoYW5nZXMgcmVxdWlyZSByZWluZGV4aW5nLlwiXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHQ6IHQoXHJcblx0XHRcdFx0XHRcdFwiQ3VzdG9taXplIHRoZSBwcmVmaXggdXNlZCBmb3IgcHJvamVjdCB0YWdzIChlLmcuLCAncHJvamVjdCcgZm9yICNwcm9qZWN0L215cHJvamVjdCkuIENoYW5nZXMgcmVxdWlyZSByZWluZGV4aW5nLlwiXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0XHR0ZXh0LnNldFBsYWNlaG9sZGVyKFwicHJvamVjdFwiKVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0VGFnUHJlZml4W1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByZWZlck1ldGFkYXRhRm9ybWF0XHJcblx0XHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0VGFnUHJlZml4W1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByZWZlck1ldGFkYXRhRm9ybWF0XHJcblx0XHRcdFx0XHRcdFx0XSA9IHZhbHVlIHx8IFwicHJvamVjdFwiO1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHQvLyBDb250ZXh0IHRhZyBwcmVmaXggd2l0aCBzcGVjaWFsIGhhbmRsaW5nXHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0LnNldE5hbWUodChcIkNvbnRleHQgdGFnIHByZWZpeFwiKSlcclxuXHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0aXNEYXRhdmlld0Zvcm1hdFxyXG5cdFx0XHRcdFx0PyB0KFxyXG5cdFx0XHRcdFx0XHRcIkN1c3RvbWl6ZSB0aGUgcHJlZml4IHVzZWQgZm9yIGNvbnRleHQgdGFncyBpbiBkYXRhdmlldyBmb3JtYXQgKGUuZy4sICdjb250ZXh0JyBmb3IgW2NvbnRleHQ6OiBob21lXSkuIENoYW5nZXMgcmVxdWlyZSByZWluZGV4aW5nLlwiXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHQ6IHQoXHJcblx0XHRcdFx0XHRcdFwiQ3VzdG9taXplIHRoZSBwcmVmaXggdXNlZCBmb3IgY29udGV4dCB0YWdzIChlLmcuLCAnQGhvbWUnIGZvciBAaG9tZSkuIENoYW5nZXMgcmVxdWlyZSByZWluZGV4aW5nLlwiXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0XHR0ZXh0LnNldFBsYWNlaG9sZGVyKFwiY29udGV4dFwiKVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5jb250ZXh0VGFnUHJlZml4W1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByZWZlck1ldGFkYXRhRm9ybWF0XHJcblx0XHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5jb250ZXh0VGFnUHJlZml4W1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByZWZlck1ldGFkYXRhRm9ybWF0XHJcblx0XHRcdFx0XHRcdFx0XSA9IHZhbHVlIHx8IChpc0RhdGF2aWV3Rm9ybWF0ID8gXCJjb250ZXh0XCIgOiBcIkBcIik7XHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiSWdub3JlIGFsbCB0YXNrcyBiZWhpbmQgaGVhZGluZ1wiKSlcclxuXHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFwiQ29uZmlndXJlIGhlYWRpbmdzIHRvIGlnbm9yZS4gVGFza3MgdW5kZXIgdGhlc2UgaGVhZGluZ3Mgd2lsbCBiZSBleGNsdWRlZCBmcm9tIGluZGV4aW5nLlwiXHJcblx0XHRcdFx0KVxyXG5cdFx0XHQpXHJcblx0XHRcdC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IGdldElnbm9yZUhlYWRpbmdzID0gKCkgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc3QgdmFsdWUgPSBzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5pZ25vcmVIZWFkaW5nIHx8IFwiXCI7XHJcblx0XHRcdFx0XHRyZXR1cm4gdmFsdWVcclxuXHRcdFx0XHRcdFx0LnNwbGl0KFwiLFwiKVxyXG5cdFx0XHRcdFx0XHQubWFwKChoKSA9PiBoLnRyaW0oKSlcclxuXHRcdFx0XHRcdFx0LmZpbHRlcigoaCkgPT4gaCk7XHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0Y29uc3QgdXBkYXRlQnV0dG9uVGV4dCA9ICgpID0+IHtcclxuXHRcdFx0XHRcdGNvbnN0IGhlYWRpbmdzID0gZ2V0SWdub3JlSGVhZGluZ3MoKTtcclxuXHRcdFx0XHRcdGlmIChoZWFkaW5ncy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0XHRcdFx0YnV0dG9uLnNldEJ1dHRvblRleHQodChcIkNvbmZpZ3VyZSBJZ25vcmUgSGVhZGluZ3NcIikpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0YnV0dG9uLnNldEJ1dHRvblRleHQoXHJcblx0XHRcdFx0XHRcdFx0dChcInt7Y291bnR9fSBoZWFkaW5nKHMpIGNvbmZpZ3VyZWRcIiwge1xyXG5cdFx0XHRcdFx0XHRcdFx0aW50ZXJwb2xhdGlvbjoge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRjb3VudDogaGVhZGluZ3MubGVuZ3RoLnRvU3RyaW5nKCksXHJcblx0XHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0dXBkYXRlQnV0dG9uVGV4dCgpO1xyXG5cdFx0XHRcdGJ1dHRvbi5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdG5ldyBMaXN0Q29uZmlnTW9kYWwoc2V0dGluZ1RhYi5wbHVnaW4sIHtcclxuXHRcdFx0XHRcdFx0dGl0bGU6IHQoXCJDb25maWd1cmUgSWdub3JlIEhlYWRpbmdzXCIpLFxyXG5cdFx0XHRcdFx0XHRkZXNjcmlwdGlvbjogdChcclxuXHRcdFx0XHRcdFx0XHRcIkFkZCBoZWFkaW5ncyB0byBpZ25vcmUuIFRhc2tzIHVuZGVyIHRoZXNlIGhlYWRpbmdzIHdpbGwgYmUgZXhjbHVkZWQgZnJvbSBpbmRleGluZy4gRXhhbXBsZXM6ICcjIyBQcm9qZWN0JywgJyMjIEluYm94JywgJyMgQXJjaGl2ZSdcIlxyXG5cdFx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0XHRwbGFjZWhvbGRlcjogdChcIkVudGVyIGhlYWRpbmcgKGUuZy4sICMjIEluYm94KVwiKSxcclxuXHRcdFx0XHRcdFx0dmFsdWVzOiBnZXRJZ25vcmVIZWFkaW5ncygpLFxyXG5cdFx0XHRcdFx0XHRvblNhdmU6ICh2YWx1ZXMpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5pZ25vcmVIZWFkaW5nID1cclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlcy5qb2luKFwiLCBcIik7XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHRcdFx0dXBkYXRlQnV0dG9uVGV4dCgpO1xyXG5cdFx0XHRcdFx0XHRcdG5ldyBOb3RpY2UoXHJcblx0XHRcdFx0XHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcIkhlYWRpbmcgZmlsdGVycyB1cGRhdGVkLiBSZWJ1aWxkIHRoZSB0YXNrIGluZGV4IHRvIGFwcGx5IHRvIGV4aXN0aW5nIHRhc2tzLlwiXHJcblx0XHRcdFx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0XHRcdFx0NjAwMFxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR9KS5vcGVuKCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiRm9jdXMgYWxsIHRhc2tzIGJlaGluZCBoZWFkaW5nXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XCJDb25maWd1cmUgaGVhZGluZ3MgdG8gZm9jdXMgb24uIE9ubHkgdGFza3MgdW5kZXIgdGhlc2UgaGVhZGluZ3Mgd2lsbCBiZSBpbmNsdWRlZCBpbiBpbmRleGluZy5cIlxyXG5cdFx0XHRcdClcclxuXHRcdFx0KVxyXG5cdFx0XHQuYWRkQnV0dG9uKChidXR0b24pID0+IHtcclxuXHRcdFx0XHRjb25zdCBnZXRGb2N1c0hlYWRpbmdzID0gKCkgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc3QgdmFsdWUgPSBzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5mb2N1c0hlYWRpbmcgfHwgXCJcIjtcclxuXHRcdFx0XHRcdHJldHVybiB2YWx1ZVxyXG5cdFx0XHRcdFx0XHQuc3BsaXQoXCIsXCIpXHJcblx0XHRcdFx0XHRcdC5tYXAoKGgpID0+IGgudHJpbSgpKVxyXG5cdFx0XHRcdFx0XHQuZmlsdGVyKChoKSA9PiBoKTtcclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRjb25zdCB1cGRhdGVCdXR0b25UZXh0ID0gKCkgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc3QgaGVhZGluZ3MgPSBnZXRGb2N1c0hlYWRpbmdzKCk7XHJcblx0XHRcdFx0XHRpZiAoaGVhZGluZ3MubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdFx0XHRcdGJ1dHRvbi5zZXRCdXR0b25UZXh0KHQoXCJDb25maWd1cmUgRm9jdXMgSGVhZGluZ3NcIikpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0YnV0dG9uLnNldEJ1dHRvblRleHQoXHJcblx0XHRcdFx0XHRcdFx0dChcInt7Y291bnR9fSBoZWFkaW5nKHMpIGNvbmZpZ3VyZWRcIiwge1xyXG5cdFx0XHRcdFx0XHRcdFx0aW50ZXJwb2xhdGlvbjoge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRjb3VudDogaGVhZGluZ3MubGVuZ3RoLnRvU3RyaW5nKCksXHJcblx0XHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0dXBkYXRlQnV0dG9uVGV4dCgpO1xyXG5cdFx0XHRcdGJ1dHRvbi5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdG5ldyBMaXN0Q29uZmlnTW9kYWwoc2V0dGluZ1RhYi5wbHVnaW4sIHtcclxuXHRcdFx0XHRcdFx0dGl0bGU6IHQoXCJDb25maWd1cmUgRm9jdXMgSGVhZGluZ3NcIiksXHJcblx0XHRcdFx0XHRcdGRlc2NyaXB0aW9uOiB0KFxyXG5cdFx0XHRcdFx0XHRcdFwiQWRkIGhlYWRpbmdzIHRvIGZvY3VzIG9uLiBPbmx5IHRhc2tzIHVuZGVyIHRoZXNlIGhlYWRpbmdzIHdpbGwgYmUgaW5jbHVkZWQgaW4gaW5kZXhpbmcuIEV4YW1wbGVzOiAnIyMgUHJvamVjdCcsICcjIyBJbmJveCcsICcjIFRhc2tzJ1wiXHJcblx0XHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyOiB0KFwiRW50ZXIgaGVhZGluZyAoZS5nLiwgIyMgVGFza3MpXCIpLFxyXG5cdFx0XHRcdFx0XHR2YWx1ZXM6IGdldEZvY3VzSGVhZGluZ3MoKSxcclxuXHRcdFx0XHRcdFx0b25TYXZlOiAodmFsdWVzKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZm9jdXNIZWFkaW5nID1cclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlcy5qb2luKFwiLCBcIik7XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHRcdFx0dXBkYXRlQnV0dG9uVGV4dCgpO1xyXG5cdFx0XHRcdFx0XHRcdG5ldyBOb3RpY2UoXHJcblx0XHRcdFx0XHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcIkhlYWRpbmcgZmlsdGVycyB1cGRhdGVkLiBSZWJ1aWxkIHRoZSB0YXNrIGluZGV4IHRvIGFwcGx5IHRvIGV4aXN0aW5nIHRhc2tzLlwiXHJcblx0XHRcdFx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0XHRcdFx0NjAwMFxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR9KS5vcGVuKCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiVXNlIGRhaWx5IG5vdGUgcGF0aCBhcyBkYXRlXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XCJJZiBlbmFibGVkLCB0aGUgZGFpbHkgbm90ZSBwYXRoIHdpbGwgYmUgdXNlZCBhcyB0aGUgZGF0ZSBmb3IgdGFza3MuXCJcclxuXHRcdFx0XHQpXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XHJcblx0XHRcdFx0dG9nZ2xlLnNldFZhbHVlKHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnVzZURhaWx5Tm90ZVBhdGhBc0RhdGUpO1xyXG5cdFx0XHRcdHRvZ2dsZS5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnVzZURhaWx5Tm90ZVBhdGhBc0RhdGUgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cclxuXHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmRpc3BsYXkoKTtcclxuXHRcdFx0XHRcdH0sIDIwMCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdGlmIChzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy51c2VEYWlseU5vdGVQYXRoQXNEYXRlKSB7XHJcblx0XHRcdGNvbnN0IGRlc2NGcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcclxuXHRcdFx0ZGVzY0ZyYWdtZW50LmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0XHR0ZXh0OiB0KFxyXG5cdFx0XHRcdFx0XCJUYXNrIEdlbml1cyB3aWxsIHVzZSBtb21lbnQuanMgYW5kIGFsc28gdGhpcyBmb3JtYXQgdG8gcGFyc2UgdGhlIGRhaWx5IG5vdGUgcGF0aC5cIlxyXG5cdFx0XHRcdCksXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRkZXNjRnJhZ21lbnQuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHRcdHRleHQ6IHQoXHJcblx0XHRcdFx0XHRcIllvdSBuZWVkIHRvIHNldCBgeXl5eWAgaW5zdGVhZCBvZiBgWVlZWWAgaW4gdGhlIGZvcm1hdCBzdHJpbmcuIEFuZCBgZGRgIGluc3RlYWQgb2YgYEREYC5cIlxyXG5cdFx0XHRcdCksXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0XHQuc2V0TmFtZSh0KFwiRGFpbHkgbm90ZSBmb3JtYXRcIikpXHJcblx0XHRcdFx0LnNldERlc2MoZGVzY0ZyYWdtZW50KVxyXG5cdFx0XHRcdC5hZGRUZXh0KCh0ZXh0KSA9PiB7XHJcblx0XHRcdFx0XHR0ZXh0LnNldFZhbHVlKHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmRhaWx5Tm90ZUZvcm1hdCk7XHJcblx0XHRcdFx0XHR0ZXh0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5kYWlseU5vdGVGb3JtYXQgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHRcdC5zZXROYW1lKHQoXCJEYWlseSBub3RlIHBhdGhcIikpXHJcblx0XHRcdFx0LnNldERlc2ModChcIlNlbGVjdCB0aGUgZm9sZGVyIHRoYXQgY29udGFpbnMgdGhlIGRhaWx5IG5vdGUuXCIpKVxyXG5cdFx0XHRcdC5hZGRUZXh0KCh0ZXh0KSA9PiB7XHJcblx0XHRcdFx0XHRuZXcgU2luZ2xlRm9sZGVyU3VnZ2VzdChcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHAsXHJcblx0XHRcdFx0XHRcdHRleHQuaW5wdXRFbCxcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW5cclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR0ZXh0LnNldFZhbHVlKHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmRhaWx5Tm90ZVBhdGgpO1xyXG5cdFx0XHRcdFx0dGV4dC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZGFpbHlOb3RlUGF0aCA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdFx0LnNldE5hbWUodChcIlVzZSBhcyBkYXRlIHR5cGVcIikpXHJcblx0XHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XHRcIllvdSBjYW4gY2hvb3NlIGR1ZSwgc3RhcnQsIG9yIHNjaGVkdWxlZCBhcyB0aGUgZGF0ZSB0eXBlIGZvciB0YXNrcy5cIlxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdClcclxuXHRcdFx0XHQuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XHJcblx0XHRcdFx0XHRkcm9wZG93blxyXG5cdFx0XHRcdFx0XHQuYWRkT3B0aW9uKFwiZHVlXCIsIHQoXCJEdWVcIikpXHJcblx0XHRcdFx0XHRcdC5hZGRPcHRpb24oXCJzdGFydFwiLCB0KFwiU3RhcnRcIikpXHJcblx0XHRcdFx0XHRcdC5hZGRPcHRpb24oXCJzY2hlZHVsZWRcIiwgdChcIlNjaGVkdWxlZFwiKSlcclxuXHRcdFx0XHRcdFx0LnNldFZhbHVlKHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnVzZUFzRGF0ZVR5cGUpXHJcblx0XHRcdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy51c2VBc0RhdGVUeXBlID0gdmFsdWUgYXNcclxuXHRcdFx0XHRcdFx0XHRcdHwgXCJkdWVcIlxyXG5cdFx0XHRcdFx0XHRcdFx0fCBcInN0YXJ0XCJcclxuXHRcdFx0XHRcdFx0XHRcdHwgXCJzY2hlZHVsZWRcIjtcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRmlsZSBNZXRhZGF0YSBJbmhlcml0YW5jZSBTZXR0aW5nc1xyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJGaWxlIE1ldGFkYXRhIEluaGVyaXRhbmNlXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHR0KFwiQ29uZmlndXJlIGhvdyB0YXNrcyBpbmhlcml0IG1ldGFkYXRhIGZyb20gZmlsZSBmcm9udG1hdHRlclwiKVxyXG5cdFx0XHQpXHJcblx0XHRcdC5zZXRIZWFkaW5nKCk7XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJFbmFibGUgZmlsZSBtZXRhZGF0YSBpbmhlcml0YW5jZVwiKSlcclxuXHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFwiQWxsb3cgdGFza3MgdG8gaW5oZXJpdCBtZXRhZGF0YSBwcm9wZXJ0aWVzIGZyb20gdGhlaXIgZmlsZSdzIGZyb250bWF0dGVyXCJcclxuXHRcdFx0XHQpXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxyXG5cdFx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5maWxlTWV0YWRhdGFJbmhlcml0YW5jZS5lbmFibGVkXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmZpbGVNZXRhZGF0YUluaGVyaXRhbmNlLmVuYWJsZWQgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblxyXG5cdFx0XHRcdFx0XHRuZXcgQ29uZmlybU1vZGFsKHNldHRpbmdUYWIucGx1Z2luLCB7XHJcblx0XHRcdFx0XHRcdFx0dGl0bGU6IHQoXCJSZWluZGV4XCIpLFxyXG5cdFx0XHRcdFx0XHRcdG1lc3NhZ2U6IHQoXCJUaGlzIGNoYW5nZSBhZmZlY3RzIGhvdyB0YXNrcyBpbmhlcml0IG1ldGFkYXRhIGZyb20gZmlsZXMuIFJlYnVpbGQgdGhlIGluZGV4IG5vdyBzbyBjaGFuZ2VzIHRha2UgZWZmZWN0IGltbWVkaWF0ZWx5P1wiKSxcclxuXHRcdFx0XHRcdFx0XHRjb25maXJtVGV4dDogdChcIlJlaW5kZXhcIiksXHJcblx0XHRcdFx0XHRcdFx0Y2FuY2VsVGV4dDogdChcIkNhbmNlbFwiKSxcclxuXHRcdFx0XHRcdFx0XHRvbkNvbmZpcm06IGFzeW5jIChjb25maXJtZWQ6IGJvb2xlYW4pID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdGlmICghY29uZmlybWVkKSByZXR1cm47XHJcblx0XHRcdFx0XHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRuZXcgTm90aWNlKHQoXCJDbGVhcmluZyB0YXNrIGNhY2hlIGFuZCByZWJ1aWxkaW5nIGluZGV4Li4uXCIpKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0YXdhaXQgc2V0dGluZ1RhYi5wbHVnaW4uZGF0YWZsb3dPcmNoZXN0cmF0b3I/Lm9uU2V0dGluZ3NDaGFuZ2UoW1wicGFyc2VyXCJdKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0bmV3IE5vdGljZSh0KFwiVGFzayBpbmRleCBjb21wbGV0ZWx5IHJlYnVpbHRcIikpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkZhaWxlZCB0byByZWluZGV4IGFmdGVyIGluaGVyaXRhbmNlIHNldHRpbmcgY2hhbmdlOlwiLCBlcnJvcik7XHJcblx0XHRcdFx0XHRcdFx0XHRcdG5ldyBOb3RpY2UodChcIkZhaWxlZCB0byByZWluZGV4IHRhc2tzXCIpKTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHR9KS5vcGVuKCk7XHJcblxyXG5cdFx0XHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmRpc3BsYXkoKTtcclxuXHRcdFx0XHRcdFx0fSwgMjAwKTtcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0aWYgKHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmZpbGVNZXRhZGF0YUluaGVyaXRhbmNlLmVuYWJsZWQpIHtcclxuXHRcdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdFx0LnNldE5hbWUodChcIkluaGVyaXQgZnJvbSBmcm9udG1hdHRlclwiKSlcclxuXHRcdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcdFwiVGFza3MgaW5oZXJpdCBtZXRhZGF0YSBwcm9wZXJ0aWVzIGxpa2UgcHJpb3JpdHksIGNvbnRleHQsIGV0Yy4gZnJvbSBmaWxlIGZyb250bWF0dGVyIHdoZW4gbm90IGV4cGxpY2l0bHkgc2V0IG9uIHRoZSB0YXNrXCJcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxyXG5cdFx0XHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5maWxlTWV0YWRhdGFJbmhlcml0YW5jZVxyXG5cdFx0XHRcdFx0XHRcdFx0LmluaGVyaXRGcm9tRnJvbnRtYXR0ZXJcclxuXHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2UuaW5oZXJpdEZyb21Gcm9udG1hdHRlciA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRuZXcgQ29uZmlybU1vZGFsKHNldHRpbmdUYWIucGx1Z2luLCB7XHJcblx0XHRcdFx0XHRcdFx0XHR0aXRsZTogdChcIlJlaW5kZXhcIiksXHJcblx0XHRcdFx0XHRcdFx0XHRtZXNzYWdlOiB0KFwiVGhpcyBjaGFuZ2UgYWZmZWN0cyBob3cgdGFza3MgaW5oZXJpdCBtZXRhZGF0YSBmcm9tIGZpbGVzLiBSZWJ1aWxkIHRoZSBpbmRleCBub3cgc28gY2hhbmdlcyB0YWtlIGVmZmVjdCBpbW1lZGlhdGVseT9cIiksXHJcblx0XHRcdFx0XHRcdFx0XHRjb25maXJtVGV4dDogdChcIlJlaW5kZXhcIiksXHJcblx0XHRcdFx0XHRcdFx0XHRjYW5jZWxUZXh0OiB0KFwiQ2FuY2VsXCIpLFxyXG5cdFx0XHRcdFx0XHRcdFx0b25Db25maXJtOiBhc3luYyAoY29uZmlybWVkOiBib29sZWFuKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGlmICghY29uZmlybWVkKSByZXR1cm47XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0bmV3IE5vdGljZSh0KFwiQ2xlYXJpbmcgdGFzayBjYWNoZSBhbmQgcmVidWlsZGluZyBpbmRleC4uLlwiKSk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0YXdhaXQgc2V0dGluZ1RhYi5wbHVnaW4uZGF0YWZsb3dPcmNoZXN0cmF0b3I/Lm9uU2V0dGluZ3NDaGFuZ2UoW1wicGFyc2VyXCJdKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRuZXcgTm90aWNlKHQoXCJUYXNrIGluZGV4IGNvbXBsZXRlbHkgcmVidWlsdFwiKSk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkZhaWxlZCB0byByZWluZGV4IGFmdGVyIGluaGVyaXRhbmNlIHNldHRpbmcgY2hhbmdlOlwiLCBlcnJvcik7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0bmV3IE5vdGljZSh0KFwiRmFpbGVkIHRvIHJlaW5kZXggdGFza3NcIikpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdH0pLm9wZW4oKTtcclxuXHRcdFx0XHRcdFx0fSlcclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdFx0LnNldE5hbWUodChcIkluaGVyaXQgZnJvbSBmcm9udG1hdHRlciBmb3Igc3VidGFza3NcIikpXHJcblx0XHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XHRcIkFsbG93IHN1YnRhc2tzIHRvIGluaGVyaXQgbWV0YWRhdGEgZnJvbSBmaWxlIGZyb250bWF0dGVyLiBXaGVuIGRpc2FibGVkLCBvbmx5IHRvcC1sZXZlbCB0YXNrcyBpbmhlcml0IGZpbGUgbWV0YWRhdGFcIlxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdClcclxuXHRcdFx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+XHJcblx0XHRcdFx0XHR0b2dnbGVcclxuXHRcdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmZpbGVNZXRhZGF0YUluaGVyaXRhbmNlXHJcblx0XHRcdFx0XHRcdFx0XHQuaW5oZXJpdEZyb21Gcm9udG1hdHRlckZvclN1YnRhc2tzXHJcblx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmZpbGVNZXRhZGF0YUluaGVyaXRhbmNlLmluaGVyaXRGcm9tRnJvbnRtYXR0ZXJGb3JTdWJ0YXNrcyA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRuZXcgQ29uZmlybU1vZGFsKHNldHRpbmdUYWIucGx1Z2luLCB7XHJcblx0XHRcdFx0XHRcdFx0XHR0aXRsZTogdChcIlJlaW5kZXhcIiksXHJcblx0XHRcdFx0XHRcdFx0XHRtZXNzYWdlOiB0KFwiVGhpcyBjaGFuZ2UgYWZmZWN0cyBob3cgdGFza3MgaW5oZXJpdCBtZXRhZGF0YSBmcm9tIGZpbGVzLiBSZWJ1aWxkIHRoZSBpbmRleCBub3cgc28gY2hhbmdlcyB0YWtlIGVmZmVjdCBpbW1lZGlhdGVseT9cIiksXHJcblx0XHRcdFx0XHRcdFx0XHRjb25maXJtVGV4dDogdChcIlJlaW5kZXhcIiksXHJcblx0XHRcdFx0XHRcdFx0XHRjYW5jZWxUZXh0OiB0KFwiQ2FuY2VsXCIpLFxyXG5cdFx0XHRcdFx0XHRcdFx0b25Db25maXJtOiBhc3luYyAoY29uZmlybWVkOiBib29sZWFuKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGlmICghY29uZmlybWVkKSByZXR1cm47XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0bmV3IE5vdGljZSh0KFwiQ2xlYXJpbmcgdGFzayBjYWNoZSBhbmQgcmVidWlsZGluZyBpbmRleC4uLlwiKSk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0YXdhaXQgc2V0dGluZ1RhYi5wbHVnaW4uZGF0YWZsb3dPcmNoZXN0cmF0b3I/Lm9uU2V0dGluZ3NDaGFuZ2UoW1wicGFyc2VyXCJdKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRuZXcgTm90aWNlKHQoXCJUYXNrIGluZGV4IGNvbXBsZXRlbHkgcmVidWlsdFwiKSk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkZhaWxlZCB0byByZWluZGV4IGFmdGVyIGluaGVyaXRhbmNlIHNldHRpbmcgY2hhbmdlOlwiLCBlcnJvcik7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0bmV3IE5vdGljZSh0KFwiRmFpbGVkIHRvIHJlaW5kZXggdGFza3NcIikpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdH0pLm9wZW4oKTtcclxuXHRcdFx0XHRcdFx0fSlcclxuXHRcdFx0XHQpO1xyXG5cdFx0fVxyXG5cdH0pKCk7XHJcblxyXG5cdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuXHQvLyBTRUNUSU9OIDI6IEZpbGUgVGFzayBDb25maWd1cmF0aW9uXHJcblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cdCgoKSA9PiB7XHJcblx0XHRjb25zdCBjb250YWluZXJFbCA9IGZpbGVDb250YWluZXI7XHJcblx0XHRjb25zdCBmaWxlU291cmNlU2V0dGluZ3MgPSBzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5maWxlU291cmNlO1xyXG5cdFx0Y29uc3QgZmlsZVRhc2tzRW5hYmxlZCA9XHJcblx0XHRcdHNjb3BlQ29udHJvbHMuZmlsZVRhc2tzRW5hYmxlZCAhPT0gZmFsc2UgJiZcclxuXHRcdFx0Qm9vbGVhbihmaWxlU291cmNlU2V0dGluZ3M/LmVuYWJsZWQpO1xyXG5cclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiRW5hYmxlIGZpbGUgdGFza3NcIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcIkFsbG93IFRhc2sgR2VuaXVzIHRvIHJlY29nbml6ZSBmaWxlcyBhcyB0YXNrcyB1c2luZyBtZXRhZGF0YSwgdGFncywgb3IgdGVtcGxhdGVzLlwiXHJcblx0XHRcdFx0KVxyXG5cdFx0XHQpXHJcblx0XHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xyXG5cdFx0XHRcdHRvZ2dsZS5zZXRWYWx1ZShmaWxlVGFza3NFbmFibGVkKTtcclxuXHRcdFx0XHR0b2dnbGUub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRjb25zdCBjb250cm9scyA9IGVuc3VyZVNjb3BlQ29udHJvbHMoXHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0Y29udHJvbHMuZmlsZVRhc2tzRW5hYmxlZCA9IHZhbHVlO1xyXG5cclxuXHRcdFx0XHRcdGlmICghc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZmlsZVNvdXJjZSkge1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5maWxlU291cmNlID0ge1xyXG5cdFx0XHRcdFx0XHRcdGVuYWJsZWQ6IHZhbHVlLFxyXG5cdFx0XHRcdFx0XHR9IGFzIGFueTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmZpbGVTb3VyY2UuZW5hYmxlZCA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0dXBkYXRlRmlsZUJvZHlTdGF0ZSh2YWx1ZSk7XHJcblx0XHRcdFx0XHRyZW5kZXJGaWxlU291cmNlU2VjdGlvbigpO1xyXG5cdFx0XHRcdFx0aWYgKCF2YWx1ZSkge1xyXG5cdFx0XHRcdFx0XHRuZXcgTm90aWNlKFxyXG5cdFx0XHRcdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcdFx0XHRcIkZpbGUgdGFzayByZWNvZ25pdGlvbiBkaXNhYmxlZC4gRXhpc3RpbmcgZmlsZSB0YXNrcyB3aWxsIGJlIHBydW5lZCBzaG9ydGx5LlwiXHJcblx0XHRcdFx0XHRcdFx0KSxcclxuXHRcdFx0XHRcdFx0XHQ2MDAwXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IGZpbGVCb2R5RWwgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwidGctc291cmNlLXNldHRpbmdzLWJvZHlcIixcclxuXHRcdH0pO1xyXG5cdFx0Y29uc3QgdXBkYXRlRmlsZUJvZHlTdGF0ZSA9IChlbmFibGVkOiBib29sZWFuKSA9PiB7XHJcblx0XHRcdGZpbGVCb2R5RWwuY2xhc3NMaXN0LnRvZ2dsZShcInRnLXNvdXJjZS1kaXNhYmxlZFwiLCAhZW5hYmxlZCk7XHJcblx0XHR9O1xyXG5cdFx0dXBkYXRlRmlsZUJvZHlTdGF0ZShmaWxlVGFza3NFbmFibGVkKTtcclxuXHJcblx0XHRjb25zdCBmaWxlU2V0dGluZ3NDb250YWluZXIgPSBmaWxlQm9keUVsO1xyXG5cclxuXHRcdG5ldyBTZXR0aW5nKGZpbGVTZXR0aW5nc0NvbnRhaW5lcilcclxuXHRcdFx0LnNldE5hbWUodChcIkZpbGUgVGFzayBDb25maWd1cmF0aW9uXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XCJDb25maWd1cmUgaG93IGZpbGVzIGNhbiBiZSByZWNvZ25pemVkIGFuZCB0cmVhdGVkIGFzIHRhc2tzIHdpdGggdmFyaW91cyBzdHJhdGVnaWVzLlwiXHJcblx0XHRcdFx0KVxyXG5cdFx0XHQpXHJcblx0XHRcdC5zZXRIZWFkaW5nKCk7XHJcblxyXG5cdFx0Y29uc3QgZmlsZVNvdXJjZUNvbnRhaW5lckVsID0gZmlsZVNldHRpbmdzQ29udGFpbmVyLmNyZWF0ZURpdihcclxuXHRcdFx0XCJmaWxlLXNvdXJjZS1jb250YWluZXJcIlxyXG5cdFx0KTtcclxuXHJcblx0XHRjb25zdCByZW5kZXJGaWxlU291cmNlU2VjdGlvbiA9ICgpID0+IHtcclxuXHRcdFx0ZmlsZVNvdXJjZUNvbnRhaW5lckVsLmVtcHR5KCk7XHJcblx0XHRcdGlmIChzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5maWxlU291cmNlPy5lbmFibGVkKSB7XHJcblx0XHRcdFx0Y3JlYXRlRmlsZVNvdXJjZVNldHRpbmdzKGZpbGVTb3VyY2VDb250YWluZXJFbCwgc2V0dGluZ1RhYi5wbHVnaW4sIHtcclxuXHRcdFx0XHRcdHNob3dFbmFibGVUb2dnbGU6IGZhbHNlLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGZpbGVTb3VyY2VDb250YWluZXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdFx0Y2xzOiBcInNldHRpbmctaXRlbS1kZXNjcmlwdGlvblwiLFxyXG5cdFx0XHRcdFx0dGV4dDogdChcclxuXHRcdFx0XHRcdFx0XCJGaWxlIHRhc2tzIGFyZSBkaXNhYmxlZC4gRW5hYmxlIHRoZW0gdG8gY29uZmlndXJlIHJlY29nbml0aW9uIHN0cmF0ZWdpZXMuXCJcclxuXHRcdFx0XHRcdCksXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0cmVuZGVyRmlsZVNvdXJjZVNlY3Rpb24oKTtcclxuXHR9KSgpO1xyXG5cclxuXHRjb25zdCBzZXRBY3RpdmVUYXNrU291cmNlUGFuZWwgPSAocGFuZWw6IFwiaW5saW5lXCIgfCBcImZpbGVcIikgPT4ge1xyXG5cdFx0aW5saW5lQ29udGFpbmVyLnRvZ2dsZUF0dHJpYnV0ZShcImhpZGRlblwiLCBwYW5lbCAhPT0gXCJpbmxpbmVcIik7XHJcblx0XHRmaWxlQ29udGFpbmVyLnRvZ2dsZUF0dHJpYnV0ZShcImhpZGRlblwiLCBwYW5lbCAhPT0gXCJmaWxlXCIpO1xyXG5cdFx0aW5saW5lU3dpdGNoZXJCdXR0b24uY2xhc3NMaXN0LnRvZ2dsZShcImlzLWFjdGl2ZVwiLCBwYW5lbCA9PT0gXCJpbmxpbmVcIik7XHJcblx0XHRmaWxlU3dpdGNoZXJCdXR0b24uY2xhc3NMaXN0LnRvZ2dsZShcImlzLWFjdGl2ZVwiLCBwYW5lbCA9PT0gXCJmaWxlXCIpO1xyXG5cdH07XHJcblxyXG5cdGNvbnN0IGluaXRpYWxQYW5lbDogXCJpbmxpbmVcIiB8IFwiZmlsZVwiID1cclxuXHRcdHNjb3BlQ29udHJvbHMuaW5saW5lVGFza3NFbmFibGVkID09PSBmYWxzZSAmJlxyXG5cdFx0c2NvcGVDb250cm9scy5maWxlVGFza3NFbmFibGVkICE9PSBmYWxzZVxyXG5cdFx0XHQ/IFwiZmlsZVwiXHJcblx0XHRcdDogXCJpbmxpbmVcIjtcclxuXHJcblx0c2V0QWN0aXZlVGFza1NvdXJjZVBhbmVsKGluaXRpYWxQYW5lbCk7XHJcblxyXG5cdGlubGluZVN3aXRjaGVyQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PlxyXG5cdFx0c2V0QWN0aXZlVGFza1NvdXJjZVBhbmVsKFwiaW5saW5lXCIpXHJcblx0KTtcclxuXHRmaWxlU3dpdGNoZXJCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+XHJcblx0XHRzZXRBY3RpdmVUYXNrU291cmNlUGFuZWwoXCJmaWxlXCIpXHJcblx0KTtcclxuXHJcblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cdC8vIFNFQ1RJT04gMzogUGVyZm9ybWFuY2UgU2V0dGluZ3NcclxuXHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiUGVyZm9ybWFuY2UgQ29uZmlndXJhdGlvblwiKSlcclxuXHRcdC5zZXREZXNjKHQoXCJDb25maWd1cmUgcGVyZm9ybWFuY2UtcmVsYXRlZCBpbmRleGluZyBzZXR0aW5nc1wiKSlcclxuXHRcdC5zZXRIZWFkaW5nKCk7XHJcblxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIkVuYWJsZSB3b3JrZXIgcHJvY2Vzc2luZ1wiKSlcclxuXHRcdC5zZXREZXNjKFxyXG5cdFx0XHR0KFxyXG5cdFx0XHRcdFwiVXNlIGJhY2tncm91bmQgd29ya2VyIGZvciBmaWxlIHBhcnNpbmcgdG8gaW1wcm92ZSBwZXJmb3JtYW5jZS4gUmVjb21tZW5kZWQgZm9yIGxhcmdlIHZhdWx0cy5cIlxyXG5cdFx0XHQpXHJcblx0XHQpXHJcblx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcclxuXHRcdFx0Ly8gVXNlIHRoZSBuZXcgZmlsZVNvdXJjZS5wZXJmb3JtYW5jZS5lbmFibGVXb3JrZXJQcm9jZXNzaW5nIHNldHRpbmdcclxuXHRcdFx0dG9nZ2xlLnNldFZhbHVlKFxyXG5cdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmZpbGVTb3VyY2U/LnBlcmZvcm1hbmNlXHJcblx0XHRcdFx0XHQ/LmVuYWJsZVdvcmtlclByb2Nlc3NpbmcgPz8gdHJ1ZVxyXG5cdFx0XHQpO1xyXG5cdFx0XHR0b2dnbGUub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0Ly8gRW5zdXJlIGZpbGVTb3VyY2UgYW5kIHBlcmZvcm1hbmNlIG9iamVjdHMgZXhpc3RcclxuXHRcdFx0XHRpZiAoIXNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmZpbGVTb3VyY2UpIHtcclxuXHRcdFx0XHRcdC8vIEluaXRpYWxpemUgd2l0aCBtaW5pbWFsIHJlcXVpcmVkIHByb3BlcnRpZXNcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmZpbGVTb3VyY2UgPSB7XHJcblx0XHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdFx0XHRwZXJmb3JtYW5jZToge1xyXG5cdFx0XHRcdFx0XHRcdGVuYWJsZVdvcmtlclByb2Nlc3Npbmc6IHRydWUsXHJcblx0XHRcdFx0XHRcdFx0ZW5hYmxlQ2FjaGluZzogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0XHRjYWNoZVRUTDogMzAwMDAwLFxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0fSBhcyBhbnk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGlmICghc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZmlsZVNvdXJjZS5wZXJmb3JtYW5jZSkge1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZmlsZVNvdXJjZS5wZXJmb3JtYW5jZSA9IHtcclxuXHRcdFx0XHRcdFx0ZW5hYmxlV29ya2VyUHJvY2Vzc2luZzogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0ZW5hYmxlQ2FjaGluZzogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0Y2FjaGVUVEw6IDMwMDAwMCxcclxuXHRcdFx0XHRcdH07XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIFVwZGF0ZSB0aGUgc2V0dGluZ1xyXG5cdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmZpbGVTb3VyY2UucGVyZm9ybWFuY2UuZW5hYmxlV29ya2VyUHJvY2Vzc2luZyA9XHJcblx0XHRcdFx0XHR2YWx1ZTtcclxuXHJcblx0XHRcdFx0Ly8gQWxzbyB1cGRhdGUgdGhlIGxlZ2FjeSBmaWxlUGFyc2luZ0NvbmZpZyBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eVxyXG5cdFx0XHRcdGlmIChzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5maWxlUGFyc2luZ0NvbmZpZykge1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZmlsZVBhcnNpbmdDb25maWcuZW5hYmxlV29ya2VyUHJvY2Vzc2luZyA9XHJcblx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuXHQvLyBTRUNUSU9OIDU6IEluZGV4IE1haW50ZW5hbmNlXHJcblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIkluZGV4IE1haW50ZW5hbmNlXCIpKVxyXG5cdFx0LnNldERlc2ModChcIlRvb2xzIGZvciBtYW5hZ2luZyBhbmQgcmVidWlsZGluZyB0aGUgdGFzayBpbmRleFwiKSlcclxuXHRcdC5zZXRIZWFkaW5nKCk7XHJcblxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIlJlYnVpbGQgaW5kZXhcIikpXHJcblx0XHQuc2V0RGVzYyhcclxuXHRcdFx0dChcclxuXHRcdFx0XHRcIkZvcmNlIGEgY29tcGxldGUgcmVidWlsZCBvZiB0aGUgdGFzayBpbmRleC4gVXNlIHRoaXMgaWYgeW91IG5vdGljZSBtaXNzaW5nIG9yIGluY29ycmVjdCB0YXNrcy5cIlxyXG5cdFx0XHQpXHJcblx0XHQpXHJcblx0XHQuc2V0Q2xhc3MoXCJtb2Qtd2FybmluZ1wiKVxyXG5cdFx0LmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XHJcblx0XHRcdGJ1dHRvbi5zZXRCdXR0b25UZXh0KHQoXCJSZWJ1aWxkXCIpKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcclxuXHRcdFx0XHRuZXcgQ29uZmlybU1vZGFsKHNldHRpbmdUYWIucGx1Z2luLCB7XHJcblx0XHRcdFx0XHR0aXRsZTogdChcIlJlaW5kZXhcIiksXHJcblx0XHRcdFx0XHRtZXNzYWdlOiB0KFxyXG5cdFx0XHRcdFx0XHRcIkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBmb3JjZSByZWluZGV4IGFsbCB0YXNrcz9cIlxyXG5cdFx0XHRcdFx0KSxcclxuXHRcdFx0XHRcdGNvbmZpcm1UZXh0OiB0KFwiUmVpbmRleFwiKSxcclxuXHRcdFx0XHRcdGNhbmNlbFRleHQ6IHQoXCJDYW5jZWxcIiksXHJcblx0XHRcdFx0XHRvbkNvbmZpcm06IGFzeW5jIChjb25maXJtZWQ6IGJvb2xlYW4pID0+IHtcclxuXHRcdFx0XHRcdFx0aWYgKCFjb25maXJtZWQpIHJldHVybjtcclxuXHRcdFx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdFx0XHRuZXcgTm90aWNlKFxyXG5cdFx0XHRcdFx0XHRcdFx0dChcIkNsZWFyaW5nIHRhc2sgY2FjaGUgYW5kIHJlYnVpbGRpbmcgaW5kZXguLi5cIilcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdGlmIChzZXR0aW5nVGFiLnBsdWdpbi5kYXRhZmxvd09yY2hlc3RyYXRvcikge1xyXG5cdFx0XHRcdFx0XHRcdFx0YXdhaXQgc2V0dGluZ1RhYi5wbHVnaW4uZGF0YWZsb3dPcmNoZXN0cmF0b3IucmVidWlsZCgpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRuZXcgTm90aWNlKHQoXCJUYXNrIGluZGV4IGNvbXBsZXRlbHkgcmVidWlsdFwiKSk7XHJcblx0XHRcdFx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcclxuXHRcdFx0XHRcdFx0XHRcdFwiRmFpbGVkIHRvIGZvcmNlIHJlaW5kZXggdGFza3M6XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRlcnJvclxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0bmV3IE5vdGljZSh0KFwiRmFpbGVkIHRvIGZvcmNlIHJlaW5kZXggdGFza3NcIikpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0pLm9wZW4oKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZW5zdXJlU2NvcGVDb250cm9scyhcclxuXHRzZXR0aW5nczogVGFza1Byb2dyZXNzQmFyU2V0dGluZ3NcclxuKTogRmlsZUZpbHRlclNjb3BlQ29udHJvbHMge1xyXG5cdGNvbnN0IHNjb3BlQ29udHJvbHMgPVxyXG5cdFx0c2V0dGluZ3MuZmlsZUZpbHRlci5zY29wZUNvbnRyb2xzID8/XHJcblx0XHQoc2V0dGluZ3MuZmlsZUZpbHRlci5zY29wZUNvbnRyb2xzID0ge1xyXG5cdFx0XHRpbmxpbmVUYXNrc0VuYWJsZWQ6IHRydWUsXHJcblx0XHRcdGZpbGVUYXNrc0VuYWJsZWQ6IHNldHRpbmdzLmZpbGVTb3VyY2U/LmVuYWJsZWQgPz8gZmFsc2UsXHJcblx0XHR9KTtcclxuXHJcblx0aWYgKHNjb3BlQ29udHJvbHMuaW5saW5lVGFza3NFbmFibGVkID09PSB1bmRlZmluZWQpIHtcclxuXHRcdHNjb3BlQ29udHJvbHMuaW5saW5lVGFza3NFbmFibGVkID0gdHJ1ZTtcclxuXHR9XHJcblx0aWYgKHNjb3BlQ29udHJvbHMuZmlsZVRhc2tzRW5hYmxlZCA9PT0gdW5kZWZpbmVkKSB7XHJcblx0XHRzY29wZUNvbnRyb2xzLmZpbGVUYXNrc0VuYWJsZWQgPSBzZXR0aW5ncy5maWxlU291cmNlPy5lbmFibGVkID8/IGZhbHNlO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIHNjb3BlQ29udHJvbHM7XHJcbn1cclxuIl19