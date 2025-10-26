/**
 * FileTaskSettings - UI component for File Task configuration
 *
 * Provides a settings interface for configuring how files can be recognized
 * and treated as tasks with various strategies and options.
 */
import { __awaiter } from "tslib";
import { Setting, Notice } from "obsidian";
import { t } from "@/translations/helper";
import { ListConfigModal } from "@/components/ui/modals/ListConfigModal";
export function createFileSourceSettings(containerEl, plugin, options = {}) {
    var _a;
    const config = (_a = plugin.settings) === null || _a === void 0 ? void 0 : _a.fileSource;
    if (!config) {
        console.warn("[FileSourceSettings] Missing fileSource configuration on plugin settings");
        return;
    }
    // Main FileSource enable/disable toggle
    if (options.showEnableToggle !== false) {
        createEnableToggle(containerEl, plugin, config);
    }
    if (config.enabled) {
        // Recognition strategies section
        createRecognitionStrategiesSection(containerEl, plugin, config);
        // File task properties section
        createFileTaskPropertiesSection(containerEl, plugin, config);
        // Status mapping section
        createStatusMappingSection(containerEl, plugin, config);
        // Performance section
        createPerformanceSection(containerEl, plugin, config);
        // Advanced section
        createAdvancedSection(containerEl, plugin, config);
    }
}
/**
 * Create the main enable/disable toggle
 */
function createEnableToggle(containerEl, plugin, config) {
    // Don't create duplicate header since we're now embedded in IndexSettingsTab
    new Setting(containerEl)
        .setName(t("Enable File Task"))
        .setDesc(t("Allow files to be recognized and treated as tasks based on their metadata, tags, or file paths. This provides advanced recognition strategies beyond simple metadata parsing."))
        .addToggle((toggle) => toggle.setValue(config.enabled).onChange((value) => __awaiter(this, void 0, void 0, function* () {
        plugin.settings.fileSource.enabled = value;
        yield plugin.saveSettings();
        // Refresh the settings display
        containerEl.empty();
        createFileSourceSettings(containerEl, plugin);
    })));
}
/**
 * Create recognition strategies section
 */
function createRecognitionStrategiesSection(containerEl, plugin, config) {
    new Setting(containerEl)
        .setHeading()
        .setName(t("Recognition Strategies"))
        .setDesc(t("Configure how files are recognized as tasks. At least one strategy must be enabled."));
    // Metadata strategy
    const metadataContainer = containerEl.createDiv("file-source-strategy-container");
    new Setting(metadataContainer)
        .setName(t("Metadata-based Recognition"))
        .setDesc(t("Recognize files as tasks if they have specific frontmatter fields"))
        .addToggle((toggle) => toggle
        .setValue(config.recognitionStrategies.metadata.enabled)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        plugin.settings.fileSource.recognitionStrategies.metadata.enabled =
            value;
        yield plugin.saveSettings();
        // Refresh to show/hide fields
        containerEl.empty();
        createFileSourceSettings(containerEl, plugin);
    })));
    if (config.recognitionStrategies.metadata.enabled) {
        new Setting(metadataContainer)
            .setName(t("Task Fields"))
            .setDesc(t("Configure metadata fields that indicate a file should be treated as a task (e.g., dueDate, status, priority)"))
            .addButton((button) => {
            const getTaskFields = () => {
                var _a;
                return ((_a = config.recognitionStrategies.metadata.taskFields) !== null && _a !== void 0 ? _a : []);
            };
            const updateButtonText = () => {
                const fields = getTaskFields();
                if (fields.length === 0) {
                    button.setButtonText(t("Configure Task Fields"));
                }
                else {
                    button.setButtonText(t("{{count}} field(s) configured", {
                        interpolation: {
                            count: fields.length.toString(),
                        },
                    }));
                }
            };
            updateButtonText();
            button.onClick(() => {
                new ListConfigModal(plugin, {
                    title: t("Configure Task Fields"),
                    description: t("Add metadata fields that indicate a file should be treated as a task (e.g., dueDate, status, priority)"),
                    placeholder: t("Enter metadata field name"),
                    values: getTaskFields(),
                    onSave: (values) => __awaiter(this, void 0, void 0, function* () {
                        plugin.settings.fileSource.recognitionStrategies.metadata.taskFields =
                            values;
                        yield plugin.saveSettings();
                        updateButtonText();
                        new Notice(t("Task fields updated. Rebuild the task index to apply to existing files."), 6000);
                    }),
                }).open();
            });
        });
        new Setting(metadataContainer)
            .setName(t("Require All Fields"))
            .setDesc(t("Require all specified fields to be present (otherwise any field is sufficient)"))
            .addToggle((toggle) => toggle
            .setValue(config.recognitionStrategies.metadata.requireAllFields)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            plugin.settings.fileSource.recognitionStrategies.metadata.requireAllFields =
                value;
            yield plugin.saveSettings();
        })));
    }
    // Tag strategy
    const tagContainer = containerEl.createDiv("file-source-strategy-container");
    new Setting(tagContainer)
        .setName(t("Tag-based Recognition"))
        .setDesc(t("Recognize files as tasks if they have specific tags"))
        .addToggle((toggle) => toggle
        .setValue(config.recognitionStrategies.tags.enabled)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        plugin.settings.fileSource.recognitionStrategies.tags.enabled =
            value;
        yield plugin.saveSettings();
        // Refresh to show/hide fields
        containerEl.empty();
        createFileSourceSettings(containerEl, plugin);
    })));
    if (config.recognitionStrategies.tags.enabled) {
        new Setting(tagContainer)
            .setName(t("Task Tags"))
            .setDesc(t("Configure tags that indicate a file should be treated as a task (e.g., #task, #todo, #actionable)"))
            .addButton((button) => {
            const getTaskTags = () => {
                var _a;
                return (_a = config.recognitionStrategies.tags.taskTags) !== null && _a !== void 0 ? _a : [];
            };
            const updateButtonText = () => {
                const tags = getTaskTags();
                if (tags.length === 0) {
                    button.setButtonText(t("Configure Task Tags"));
                }
                else {
                    button.setButtonText(t("{{count}} tag(s) configured", {
                        interpolation: {
                            count: tags.length.toString(),
                        },
                    }));
                }
            };
            updateButtonText();
            button.onClick(() => {
                new ListConfigModal(plugin, {
                    title: t("Configure Task Tags"),
                    description: t("Add tags that indicate a file should be treated as a task (e.g., #task, #todo, #actionable)"),
                    placeholder: t("Enter tag (e.g., #task)"),
                    values: getTaskTags(),
                    onSave: (values) => __awaiter(this, void 0, void 0, function* () {
                        plugin.settings.fileSource.recognitionStrategies.tags.taskTags =
                            values;
                        yield plugin.saveSettings();
                        updateButtonText();
                        new Notice(t("Task tags updated. Rebuild the task index to apply to existing files."), 6000);
                    }),
                }).open();
            });
        });
        new Setting(tagContainer)
            .setName(t("Tag Matching Mode"))
            .setDesc(t("How tags should be matched against file tags"))
            .addDropdown((dropdown) => dropdown
            .addOption("exact", t("Exact match"))
            .addOption("prefix", t("Prefix match"))
            .addOption("contains", t("Contains match"))
            .setValue(config.recognitionStrategies.tags.matchMode)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            plugin.settings.fileSource.recognitionStrategies.tags.matchMode =
                value;
            yield plugin.saveSettings();
        })));
    }
    // Path strategy
    const pathContainer = containerEl.createDiv("file-source-strategy-container");
    new Setting(pathContainer)
        .setName(t("Path-based Recognition"))
        .setDesc(t("Recognize files as tasks based on their file path"))
        .addToggle((toggle) => toggle
        .setValue(config.recognitionStrategies.paths.enabled)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        plugin.settings.fileSource.recognitionStrategies.paths.enabled =
            value;
        yield plugin.saveSettings();
        // Refresh settings interface
        containerEl.empty();
        createFileSourceSettings(containerEl, plugin);
    })));
    if (config.recognitionStrategies.paths.enabled) {
        new Setting(pathContainer)
            .setName(t("Task Paths"))
            .setDesc(t("Configure paths that contain task files (e.g., Projects/, Tasks/2024/, Work/TODO/)"))
            .addButton((button) => {
            const getTaskPaths = () => {
                var _a;
                return (_a = config.recognitionStrategies.paths.taskPaths) !== null && _a !== void 0 ? _a : [];
            };
            const updateButtonText = () => {
                const paths = getTaskPaths();
                if (paths.length === 0) {
                    button.setButtonText(t("Configure Task Paths"));
                }
                else {
                    button.setButtonText(t("{{count}} path(s) configured", {
                        interpolation: {
                            count: paths.length.toString(),
                        },
                    }));
                }
            };
            updateButtonText();
            button.onClick(() => {
                new ListConfigModal(plugin, {
                    title: t("Configure Task Paths"),
                    description: t("Add paths that contain task files (e.g., Projects/, Tasks/2024/, Work/TODO/)"),
                    placeholder: t("Enter path (e.g., Projects/, Tasks/**/*.md)"),
                    values: getTaskPaths(),
                    onSave: (values) => __awaiter(this, void 0, void 0, function* () {
                        plugin.settings.fileSource.recognitionStrategies.paths.taskPaths =
                            values;
                        yield plugin.saveSettings();
                        updateButtonText();
                        new Notice(t("Task paths updated. Rebuild the task index to apply to existing files."), 6000);
                    }),
                }).open();
            });
        });
        new Setting(pathContainer)
            .setName(t("Path Matching Mode"))
            .setDesc(t("How paths should be matched"))
            .addDropdown((dropdown) => dropdown
            .addOption("prefix", t("Prefix (e.g., Projects/ matches Projects/App.md)"))
            .addOption("glob", t("Glob pattern (e.g., Projects/**/*.md)"))
            .addOption("regex", t("Regular expression (advanced)"))
            .setValue(config.recognitionStrategies.paths.matchMode)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            plugin.settings.fileSource.recognitionStrategies.paths.matchMode =
                value;
            yield plugin.saveSettings();
            // Refresh to show updated examples
            containerEl.empty();
            createFileSourceSettings(containerEl, plugin);
        })));
        // Add examples based on current mode
        const examples = pathContainer.createDiv("setting-item-description");
        const currentMode = config.recognitionStrategies.paths.matchMode;
        let exampleText = "";
        switch (currentMode) {
            case "prefix":
                exampleText =
                    t("Examples:") +
                        "\n" +
                        "• Projects/ → " +
                        t("matches all files under Projects folder") +
                        "\n" +
                        "• Tasks/2024/ → " +
                        t("matches all files under Tasks/2024 folder");
                break;
            case "glob":
                exampleText =
                    t("Examples:") +
                        "\n" +
                        "• Projects/**/*.md → " +
                        t("all .md files in Projects and subfolders") +
                        "\n" +
                        "• Tasks/*.task.md → " +
                        t("files ending with .task.md in Tasks folder") +
                        "\n" +
                        "• Work/*/TODO.md → " +
                        t("TODO.md in any direct subfolder of Work");
                break;
            case "regex":
                exampleText =
                    t("Examples:") +
                        "\n" +
                        "• ^Projects/.*\\.md$ → " +
                        t("all .md files in Projects folder") +
                        "\n" +
                        "• ^Tasks/\\d{4}-\\d{2}-\\d{2} → " +
                        t("files starting with date in Tasks");
                break;
        }
        examples.createEl("pre", {
            text: exampleText,
            attr: { style: "font-size: 0.9em; color: var(--text-muted);" },
        });
    }
}
/**
 * Create file task properties section
 */
function createFileTaskPropertiesSection(containerEl, plugin, config) {
    new Setting(containerEl)
        .setHeading()
        .setName(t("Task Properties for Files"));
    new Setting(containerEl)
        .setName(t("Task Title Source"))
        .setDesc(t("What should be used as the task title when a file becomes a task"))
        .addDropdown((dropdown) => dropdown
        .addOption("filename", t("Filename"))
        .addOption("title", t("Frontmatter title"))
        .addOption("h1", t("First H1 heading"))
        .addOption("custom", t("Custom metadata field"))
        .setValue(config.fileTaskProperties.contentSource)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        plugin.settings.fileSource.fileTaskProperties.contentSource =
            value;
        yield plugin.saveSettings();
        // Refresh to show/hide custom field input
        containerEl.empty();
        createFileSourceSettings(containerEl, plugin);
    })));
    if (config.fileTaskProperties.contentSource === "custom") {
        new Setting(containerEl)
            .setName(t("Custom Content Field"))
            .setDesc(t("Name of the metadata field to use as task content"))
            .addText((text) => text
            .setPlaceholder("taskContent")
            .setValue(config.fileTaskProperties.customContentField || "")
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            plugin.settings.fileSource.fileTaskProperties.customContentField =
                value;
            yield plugin.saveSettings();
        })));
    }
    if (config.fileTaskProperties.contentSource === "filename") {
        new Setting(containerEl)
            .setName(t("Strip File Extension"))
            .setDesc(t("Remove the .md extension from filename when using as task content"))
            .addToggle((toggle) => toggle
            .setValue(config.fileTaskProperties.stripExtension)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            plugin.settings.fileSource.fileTaskProperties.stripExtension =
                value;
            yield plugin.saveSettings();
        })));
    }
    new Setting(containerEl)
        .setName(t("Prefer Frontmatter Title"))
        .setDesc(t("When updating task content, prefer updating frontmatter title over renaming the file. This protects the original filename."))
        .addToggle((toggle) => toggle
        .setValue(config.fileTaskProperties.preferFrontmatterTitle)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        plugin.settings.fileSource.fileTaskProperties.preferFrontmatterTitle =
            value;
        yield plugin.saveSettings();
    })));
    new Setting(containerEl)
        .setName(t("Default Task Status"))
        .setDesc(t("Default status for newly created file tasks"))
        .addText((text) => text
        .setPlaceholder(" ")
        .setValue(config.fileTaskProperties.defaultStatus)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        plugin.settings.fileSource.fileTaskProperties.defaultStatus =
            value;
        yield plugin.saveSettings();
    })));
}
/**
 * Create status mapping section
 */
function createStatusMappingSection(containerEl, plugin, config) {
    new Setting(containerEl)
        .setName(t("Status Mapping"))
        .setDesc(t("Map between human-readable metadata values (e.g., 'completed') and task symbols (e.g., 'x')."));
    new Setting(containerEl)
        .setName(t("Enable Status Mapping"))
        .setDesc(t("Automatically convert between metadata status values and task symbols"))
        .addToggle((toggle) => {
        var _a;
        return toggle
            .setValue(((_a = config.statusMapping) === null || _a === void 0 ? void 0 : _a.enabled) || false)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            if (!config.statusMapping) {
                config.statusMapping = {
                    enabled: false,
                    metadataToSymbol: {},
                    symbolToMetadata: {},
                    autoDetect: false,
                    caseSensitive: false,
                };
            }
            plugin.settings.fileSource.statusMapping.enabled = value;
            yield plugin.saveSettings();
            // Refresh to show/hide mapping options
            containerEl.empty();
            createFileSourceSettings(containerEl, plugin);
        }));
    });
    if (config.statusMapping && config.statusMapping.enabled) {
        // Sync mapping from Task Status Settings
        new Setting(containerEl)
            .setName(t("Sync from Task Status Settings"))
            .setDesc(t("Populate FileSource status mapping from your checkbox status configuration"))
            .addButton((button) => button
            .setButtonText(t("Sync now"))
            .setCta()
            .onClick(() => __awaiter(this, void 0, void 0, function* () {
            try {
                const orchestrator = plugin
                    .dataflowOrchestrator;
                if (orchestrator === null || orchestrator === void 0 ? void 0 : orchestrator.updateSettings) {
                    // Delegate to orchestrator so in-memory FileSource mapping syncs immediately
                    orchestrator.updateSettings(plugin.settings);
                    new Notice(t("FileSource status mapping synced"));
                }
                else {
                    // Fallback: derive symbol->metadata mapping from Task Status settings
                    const taskStatuses = (plugin.settings
                        .taskStatuses || {});
                    const symbolToType = {};
                    for (const [type, symbols] of Object.entries(taskStatuses)) {
                        const list = String(symbols)
                            .split("|")
                            .filter(Boolean);
                        for (const sym of list) {
                            if (sym === "/>") {
                                symbolToType["/"] = type;
                                symbolToType[">"] = type;
                                continue;
                            }
                            if (sym.length === 1)
                                symbolToType[sym] = type;
                            else {
                                for (const ch of sym)
                                    symbolToType[ch] = type;
                            }
                        }
                    }
                    const typeToMetadata = {
                        completed: "completed",
                        inProgress: "in-progress",
                        planned: "planned",
                        abandoned: "cancelled",
                        notStarted: "not-started",
                    };
                    plugin.settings.fileSource.statusMapping =
                        plugin.settings.fileSource
                            .statusMapping || {
                            enabled: true,
                            metadataToSymbol: {},
                            symbolToMetadata: {},
                            autoDetect: true,
                            caseSensitive: false,
                        };
                    plugin.settings.fileSource.statusMapping.symbolToMetadata =
                        {};
                    for (const [symbol, type] of Object.entries(symbolToType)) {
                        const md = typeToMetadata[type];
                        if (md)
                            plugin.settings.fileSource.statusMapping.symbolToMetadata[symbol] = md;
                    }
                    yield plugin.saveSettings();
                    new Notice(t("FileSource status mapping synced"));
                }
            }
            catch (e) {
                console.error("Failed to sync FileSource status mapping:", e);
                new Notice(t("Failed to sync mapping"));
            }
        })));
        new Setting(containerEl)
            .setName(t("Case Sensitive Matching"))
            .setDesc(t("Enable case-sensitive matching for status values"))
            .addToggle((toggle) => toggle
            .setValue(config.statusMapping.caseSensitive)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            plugin.settings.fileSource.statusMapping.caseSensitive =
                value;
            yield plugin.saveSettings();
        })));
        new Setting(containerEl)
            .setName(t("Auto-detect Status Mappings"))
            .setDesc(t("Automatically sync with task status configuration"))
            .addToggle((toggle) => toggle
            .setValue(config.statusMapping.autoDetect)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            plugin.settings.fileSource.statusMapping.autoDetect =
                value;
            yield plugin.saveSettings();
        })));
        // Common status mappings display
        const mappingsContainer = containerEl.createDiv("file-source-status-mappings");
        mappingsContainer.createEl("h5", { text: t("Common Mappings") });
        const mappingsList = mappingsContainer.createEl("div", {
            cls: "status-mapping-list",
        });
        // Show some example mappings
        const examples = [
            { metadata: "completed", symbol: "x" },
            { metadata: "in-progress", symbol: "/" },
            { metadata: "planned", symbol: "?" },
            { metadata: "cancelled", symbol: "-" },
            { metadata: "not-started", symbol: " " },
        ];
        const table = mappingsList.createEl("table", {
            cls: "status-mapping-table",
        });
        const thead = table.createEl("thead");
        const headerRow = thead.createEl("tr");
        headerRow.createEl("th", { text: t("Metadata Value") });
        headerRow.createEl("th", { text: "→" });
        headerRow.createEl("th", { text: t("Task Symbol") });
        const tbody = table.createEl("tbody");
        examples.forEach((example) => {
            const row = tbody.createEl("tr");
            row.createEl("td", { text: example.metadata });
            row.createEl("td", { text: "→" });
            row.createEl("td", {
                text: example.symbol === " " ? "(space)" : example.symbol,
            });
        });
        // Add custom mapping management UI
        containerEl.createEl("h5", { text: t("Custom Mappings") });
        const customMappingDesc = containerEl.createEl("p");
        customMappingDesc.textContent = t("Add custom status mappings for your workflow.");
        // Add mapping input
        new Setting(containerEl)
            .setName(t("Add Custom Mapping"))
            .setDesc(t("Enter metadata value and symbol (e.g., 'done:x')"))
            .addText((text) => text.setPlaceholder("done:x").onChange((value) => __awaiter(this, void 0, void 0, function* () {
            if (value.includes(":")) {
                const [metadata, symbol] = value.split(":", 2);
                if (metadata && symbol) {
                    plugin.settings.fileSource.statusMapping.metadataToSymbol[metadata] = symbol;
                    // Also update reverse mapping if not exists
                    if (!plugin.settings.fileSource.statusMapping
                        .symbolToMetadata[symbol]) {
                        plugin.settings.fileSource.statusMapping.symbolToMetadata[symbol] = metadata;
                    }
                    yield plugin.saveSettings();
                    text.setValue("");
                }
            }
        })))
            .addButton((button) => button
            .setButtonText(t("Add"))
            .setCta()
            .onClick(() => {
            // Trigger the text change event with the current value
            const textInput = containerEl.querySelector(".setting-item:last-child input[type='text']");
            if (textInput) {
                textInput.dispatchEvent(new Event("change"));
            }
        }));
        // Note about Task Status Settings integration
        const integrationNote = containerEl.createDiv("setting-item-description");
        integrationNote.createEl("strong", { text: t("Note:") });
        integrationNote.createEl("span", {
            text: " " +
                t("Status mappings work with your Task Status Settings. ") +
                t("The symbols defined here should match those in your checkbox status configuration."),
        });
    }
}
/**
 * Create performance section
 */
function createPerformanceSection(containerEl, plugin, config) {
    new Setting(containerEl).setHeading().setName(t("Performance"));
    new Setting(containerEl)
        .setName(t("Enable Caching"))
        .setDesc(t("Cache file task results to improve performance"))
        .addToggle((toggle) => toggle
        .setValue(config.performance.enableCaching)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        plugin.settings.fileSource.performance.enableCaching =
            value;
        yield plugin.saveSettings();
    })));
    // Note: Worker Processing setting has been moved to IndexSettingsTab.ts > Performance Configuration section
    // This avoids duplication and provides centralized control for all worker processing
    new Setting(containerEl)
        .setName(t("Cache TTL"))
        .setDesc(t("Time-to-live for cached results in milliseconds (default: 300000 = 5 minutes)"))
        .addText((text) => text
        .setPlaceholder("300000")
        .setValue(String(config.performance.cacheTTL || 300000))
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        const ttl = parseInt(value) || 300000;
        plugin.settings.fileSource.performance.cacheTTL = ttl;
        yield plugin.saveSettings();
    })));
}
/**
 * Create advanced section
 */
function createAdvancedSection(containerEl, plugin, config) {
    new Setting(containerEl).setHeading().setName(t("Advanced"));
    // Statistics section
    const statsContainer = containerEl.createDiv("file-source-stats");
    statsContainer.createEl("h5", { text: t("File Task Status") });
    const statusText = config.enabled
        ? t("File Task is enabled and monitoring files")
        : t("File Task is disabled");
    statsContainer.createEl("p", { text: statusText });
    if (config.enabled) {
        const strategiesText = getEnabledStrategiesText(config);
        statsContainer.createEl("p", {
            text: t("Active strategies: ") + strategiesText,
        });
    }
}
/**
 * Get text description of enabled strategies
 */
function getEnabledStrategiesText(config) {
    const enabled = [];
    if (config.recognitionStrategies.metadata.enabled)
        enabled.push(t("Metadata"));
    if (config.recognitionStrategies.tags.enabled)
        enabled.push(t("Tags"));
    if (config.recognitionStrategies.templates.enabled)
        enabled.push(t("Templates"));
    if (config.recognitionStrategies.paths.enabled)
        enabled.push(t("Paths"));
    return enabled.length > 0 ? enabled.join(", ") : t("None");
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmlsZVNvdXJjZVNldHRpbmdzU2VjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkZpbGVTb3VyY2VTZXR0aW5nc1NlY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7O0dBS0c7O0FBRUgsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFHM0MsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQVN6RSxNQUFNLFVBQVUsd0JBQXdCLENBQ3ZDLFdBQXdCLEVBQ3hCLE1BQTZCLEVBQzdCLFVBQXFDLEVBQUU7O0lBRXZDLE1BQU0sTUFBTSxHQUFHLE1BQUEsTUFBTSxDQUFDLFFBQVEsMENBQUUsVUFBVSxDQUFDO0lBRTNDLElBQUksQ0FBQyxNQUFNLEVBQUU7UUFDWixPQUFPLENBQUMsSUFBSSxDQUNYLDBFQUEwRSxDQUMxRSxDQUFDO1FBQ0YsT0FBTztLQUNQO0lBRUQsd0NBQXdDO0lBQ3hDLElBQUksT0FBTyxDQUFDLGdCQUFnQixLQUFLLEtBQUssRUFBRTtRQUN2QyxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0tBQ2hEO0lBRUQsSUFBSSxNQUFNLENBQUMsT0FBTyxFQUFFO1FBQ25CLGlDQUFpQztRQUNqQyxrQ0FBa0MsQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRWhFLCtCQUErQjtRQUMvQiwrQkFBK0IsQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRTdELHlCQUF5QjtRQUN6QiwwQkFBMEIsQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRXhELHNCQUFzQjtRQUN0Qix3QkFBd0IsQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FB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USxDQUFDLEdBQUcsRUFBRTtZQUM1QixJQUFJLEVBQUUsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLEdBQUcsY0FBYztTQUMvQyxDQUFDLENBQUM7S0FDSDtBQUNGLENBQUM7QUFFRDs7R0FFRztBQUNILFNBQVMsd0JBQXdCLENBQUMsTUFBK0I7SUFDaEUsTUFBTSxPQUFPLEdBQWEsRUFBRSxDQUFDO0lBRTdCLElBQUksTUFBTSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxPQUFPO1FBQ2hELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDN0IsSUFBSSxNQUFNLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLE9BQU87UUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ3ZFLElBQUksTUFBTSxDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxPQUFPO1FBQ2pELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDOUIsSUFBSSxNQUFNLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLE9BQU87UUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBRXpFLE9BQU8sT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM1RCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEZpbGVUYXNrU2V0dGluZ3MgLSBVSSBjb21wb25lbnQgZm9yIEZpbGUgVGFzayBjb25maWd1cmF0aW9uXHJcbiAqXHJcbiAqIFByb3ZpZGVzIGEgc2V0dGluZ3MgaW50ZXJmYWNlIGZvciBjb25maWd1cmluZyBob3cgZmlsZXMgY2FuIGJlIHJlY29nbml6ZWRcclxuICogYW5kIHRyZWF0ZWQgYXMgdGFza3Mgd2l0aCB2YXJpb3VzIHN0cmF0ZWdpZXMgYW5kIG9wdGlvbnMuXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgU2V0dGluZywgTm90aWNlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB0eXBlIFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5pbXBvcnQgdHlwZSB7IEZpbGVTb3VyY2VDb25maWd1cmF0aW9uIH0gZnJvbSBcIkAvdHlwZXMvZmlsZS1zb3VyY2VcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHsgTGlzdENvbmZpZ01vZGFsIH0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9tb2RhbHMvTGlzdENvbmZpZ01vZGFsXCI7XHJcblxyXG4vKipcclxuICogQ3JlYXRlIEZpbGUgVGFzayBzZXR0aW5ncyBVSVxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBGaWxlU291cmNlU2V0dGluZ3NPcHRpb25zIHtcclxuXHRzaG93RW5hYmxlVG9nZ2xlPzogYm9vbGVhbjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUZpbGVTb3VyY2VTZXR0aW5ncyhcclxuXHRjb250YWluZXJFbDogSFRNTEVsZW1lbnQsXHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0b3B0aW9uczogRmlsZVNvdXJjZVNldHRpbmdzT3B0aW9ucyA9IHt9XHJcbik6IHZvaWQge1xyXG5cdGNvbnN0IGNvbmZpZyA9IHBsdWdpbi5zZXR0aW5ncz8uZmlsZVNvdXJjZTtcclxuXHJcblx0aWYgKCFjb25maWcpIHtcclxuXHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XCJbRmlsZVNvdXJjZVNldHRpbmdzXSBNaXNzaW5nIGZpbGVTb3VyY2UgY29uZmlndXJhdGlvbiBvbiBwbHVnaW4gc2V0dGluZ3NcIlxyXG5cdFx0KTtcclxuXHRcdHJldHVybjtcclxuXHR9XHJcblxyXG5cdC8vIE1haW4gRmlsZVNvdXJjZSBlbmFibGUvZGlzYWJsZSB0b2dnbGVcclxuXHRpZiAob3B0aW9ucy5zaG93RW5hYmxlVG9nZ2xlICE9PSBmYWxzZSkge1xyXG5cdFx0Y3JlYXRlRW5hYmxlVG9nZ2xlKGNvbnRhaW5lckVsLCBwbHVnaW4sIGNvbmZpZyk7XHJcblx0fVxyXG5cclxuXHRpZiAoY29uZmlnLmVuYWJsZWQpIHtcclxuXHRcdC8vIFJlY29nbml0aW9uIHN0cmF0ZWdpZXMgc2VjdGlvblxyXG5cdFx0Y3JlYXRlUmVjb2duaXRpb25TdHJhdGVnaWVzU2VjdGlvbihjb250YWluZXJFbCwgcGx1Z2luLCBjb25maWcpO1xyXG5cclxuXHRcdC8vIEZpbGUgdGFzayBwcm9wZXJ0aWVzIHNlY3Rpb25cclxuXHRcdGNyZWF0ZUZpbGVUYXNrUHJvcGVydGllc1NlY3Rpb24oY29udGFpbmVyRWwsIHBsdWdpbiwgY29uZmlnKTtcclxuXHJcblx0XHQvLyBTdGF0dXMgbWFwcGluZyBzZWN0aW9uXHJcblx0XHRjcmVhdGVTdGF0dXNNYXBwaW5nU2VjdGlvbihjb250YWluZXJFbCwgcGx1Z2luLCBjb25maWcpO1xyXG5cclxuXHRcdC8vIFBlcmZvcm1hbmNlIHNlY3Rpb25cclxuXHRcdGNyZWF0ZVBlcmZvcm1hbmNlU2VjdGlvbihjb250YWluZXJFbCwgcGx1Z2luLCBjb25maWcpO1xyXG5cclxuXHRcdC8vIEFkdmFuY2VkIHNlY3Rpb25cclxuXHRcdGNyZWF0ZUFkdmFuY2VkU2VjdGlvbihjb250YWluZXJFbCwgcGx1Z2luLCBjb25maWcpO1xyXG5cdH1cclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSB0aGUgbWFpbiBlbmFibGUvZGlzYWJsZSB0b2dnbGVcclxuICovXHJcbmZ1bmN0aW9uIGNyZWF0ZUVuYWJsZVRvZ2dsZShcclxuXHRjb250YWluZXJFbDogSFRNTEVsZW1lbnQsXHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0Y29uZmlnOiBGaWxlU291cmNlQ29uZmlndXJhdGlvblxyXG4pOiB2b2lkIHtcclxuXHQvLyBEb24ndCBjcmVhdGUgZHVwbGljYXRlIGhlYWRlciBzaW5jZSB3ZSdyZSBub3cgZW1iZWRkZWQgaW4gSW5kZXhTZXR0aW5nc1RhYlxyXG5cclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJFbmFibGUgRmlsZSBUYXNrXCIpKVxyXG5cdFx0LnNldERlc2MoXHJcblx0XHRcdHQoXHJcblx0XHRcdFx0XCJBbGxvdyBmaWxlcyB0byBiZSByZWNvZ25pemVkIGFuZCB0cmVhdGVkIGFzIHRhc2tzIGJhc2VkIG9uIHRoZWlyIG1ldGFkYXRhLCB0YWdzLCBvciBmaWxlIHBhdGhzLiBUaGlzIHByb3ZpZGVzIGFkdmFuY2VkIHJlY29nbml0aW9uIHN0cmF0ZWdpZXMgYmV5b25kIHNpbXBsZSBtZXRhZGF0YSBwYXJzaW5nLlwiXHJcblx0XHRcdClcclxuXHRcdClcclxuXHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT5cclxuXHRcdFx0dG9nZ2xlLnNldFZhbHVlKGNvbmZpZy5lbmFibGVkKS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRwbHVnaW4uc2V0dGluZ3MuZmlsZVNvdXJjZS5lbmFibGVkID0gdmFsdWU7XHJcblx0XHRcdFx0YXdhaXQgcGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cclxuXHRcdFx0XHQvLyBSZWZyZXNoIHRoZSBzZXR0aW5ncyBkaXNwbGF5XHJcblx0XHRcdFx0Y29udGFpbmVyRWwuZW1wdHkoKTtcclxuXHRcdFx0XHRjcmVhdGVGaWxlU291cmNlU2V0dGluZ3MoY29udGFpbmVyRWwsIHBsdWdpbik7XHJcblx0XHRcdH0pXHJcblx0XHQpO1xyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlIHJlY29nbml0aW9uIHN0cmF0ZWdpZXMgc2VjdGlvblxyXG4gKi9cclxuZnVuY3Rpb24gY3JlYXRlUmVjb2duaXRpb25TdHJhdGVnaWVzU2VjdGlvbihcclxuXHRjb250YWluZXJFbDogSFRNTEVsZW1lbnQsXHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0Y29uZmlnOiBGaWxlU291cmNlQ29uZmlndXJhdGlvblxyXG4pOiB2b2lkIHtcclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXRIZWFkaW5nKClcclxuXHRcdC5zZXROYW1lKHQoXCJSZWNvZ25pdGlvbiBTdHJhdGVnaWVzXCIpKVxyXG5cdFx0LnNldERlc2MoXHJcblx0XHRcdHQoXHJcblx0XHRcdFx0XCJDb25maWd1cmUgaG93IGZpbGVzIGFyZSByZWNvZ25pemVkIGFzIHRhc2tzLiBBdCBsZWFzdCBvbmUgc3RyYXRlZ3kgbXVzdCBiZSBlbmFibGVkLlwiXHJcblx0XHRcdClcclxuXHRcdCk7XHJcblxyXG5cdC8vIE1ldGFkYXRhIHN0cmF0ZWd5XHJcblx0Y29uc3QgbWV0YWRhdGFDb250YWluZXIgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoXHJcblx0XHRcImZpbGUtc291cmNlLXN0cmF0ZWd5LWNvbnRhaW5lclwiXHJcblx0KTtcclxuXHJcblx0bmV3IFNldHRpbmcobWV0YWRhdGFDb250YWluZXIpXHJcblx0XHQuc2V0TmFtZSh0KFwiTWV0YWRhdGEtYmFzZWQgUmVjb2duaXRpb25cIikpXHJcblx0XHQuc2V0RGVzYyhcclxuXHRcdFx0dChcclxuXHRcdFx0XHRcIlJlY29nbml6ZSBmaWxlcyBhcyB0YXNrcyBpZiB0aGV5IGhhdmUgc3BlY2lmaWMgZnJvbnRtYXR0ZXIgZmllbGRzXCJcclxuXHRcdFx0KVxyXG5cdFx0KVxyXG5cdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxyXG5cdFx0XHR0b2dnbGVcclxuXHRcdFx0XHQuc2V0VmFsdWUoY29uZmlnLnJlY29nbml0aW9uU3RyYXRlZ2llcy5tZXRhZGF0YS5lbmFibGVkKVxyXG5cdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdHBsdWdpbi5zZXR0aW5ncy5maWxlU291cmNlLnJlY29nbml0aW9uU3RyYXRlZ2llcy5tZXRhZGF0YS5lbmFibGVkID1cclxuXHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRhd2FpdCBwbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0XHQvLyBSZWZyZXNoIHRvIHNob3cvaGlkZSBmaWVsZHNcclxuXHRcdFx0XHRcdGNvbnRhaW5lckVsLmVtcHR5KCk7XHJcblx0XHRcdFx0XHRjcmVhdGVGaWxlU291cmNlU2V0dGluZ3MoY29udGFpbmVyRWwsIHBsdWdpbik7XHJcblx0XHRcdFx0fSlcclxuXHRcdCk7XHJcblxyXG5cdGlmIChjb25maWcucmVjb2duaXRpb25TdHJhdGVnaWVzLm1ldGFkYXRhLmVuYWJsZWQpIHtcclxuXHRcdG5ldyBTZXR0aW5nKG1ldGFkYXRhQ29udGFpbmVyKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiVGFzayBGaWVsZHNcIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcIkNvbmZpZ3VyZSBtZXRhZGF0YSBmaWVsZHMgdGhhdCBpbmRpY2F0ZSBhIGZpbGUgc2hvdWxkIGJlIHRyZWF0ZWQgYXMgYSB0YXNrIChlLmcuLCBkdWVEYXRlLCBzdGF0dXMsIHByaW9yaXR5KVwiXHJcblx0XHRcdFx0KVxyXG5cdFx0XHQpXHJcblx0XHRcdC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IGdldFRhc2tGaWVsZHMgPSAoKSA9PiB7XHJcblx0XHRcdFx0XHRyZXR1cm4gKFxyXG5cdFx0XHRcdFx0XHRjb25maWcucmVjb2duaXRpb25TdHJhdGVnaWVzLm1ldGFkYXRhLnRhc2tGaWVsZHMgPz8gW11cclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0Y29uc3QgdXBkYXRlQnV0dG9uVGV4dCA9ICgpID0+IHtcclxuXHRcdFx0XHRcdGNvbnN0IGZpZWxkcyA9IGdldFRhc2tGaWVsZHMoKTtcclxuXHRcdFx0XHRcdGlmIChmaWVsZHMubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdFx0XHRcdGJ1dHRvbi5zZXRCdXR0b25UZXh0KHQoXCJDb25maWd1cmUgVGFzayBGaWVsZHNcIikpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0YnV0dG9uLnNldEJ1dHRvblRleHQoXHJcblx0XHRcdFx0XHRcdFx0dChcInt7Y291bnR9fSBmaWVsZChzKSBjb25maWd1cmVkXCIsIHtcclxuXHRcdFx0XHRcdFx0XHRcdGludGVycG9sYXRpb246IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y291bnQ6IGZpZWxkcy5sZW5ndGgudG9TdHJpbmcoKSxcclxuXHRcdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0fSlcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHR1cGRhdGVCdXR0b25UZXh0KCk7XHJcblx0XHRcdFx0YnV0dG9uLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0bmV3IExpc3RDb25maWdNb2RhbChwbHVnaW4sIHtcclxuXHRcdFx0XHRcdFx0dGl0bGU6IHQoXCJDb25maWd1cmUgVGFzayBGaWVsZHNcIiksXHJcblx0XHRcdFx0XHRcdGRlc2NyaXB0aW9uOiB0KFxyXG5cdFx0XHRcdFx0XHRcdFwiQWRkIG1ldGFkYXRhIGZpZWxkcyB0aGF0IGluZGljYXRlIGEgZmlsZSBzaG91bGQgYmUgdHJlYXRlZCBhcyBhIHRhc2sgKGUuZy4sIGR1ZURhdGUsIHN0YXR1cywgcHJpb3JpdHkpXCJcclxuXHRcdFx0XHRcdFx0KSxcclxuXHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6IHQoXCJFbnRlciBtZXRhZGF0YSBmaWVsZCBuYW1lXCIpLFxyXG5cdFx0XHRcdFx0XHR2YWx1ZXM6IGdldFRhc2tGaWVsZHMoKSxcclxuXHRcdFx0XHRcdFx0b25TYXZlOiBhc3luYyAodmFsdWVzKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLmZpbGVTb3VyY2UucmVjb2duaXRpb25TdHJhdGVnaWVzLm1ldGFkYXRhLnRhc2tGaWVsZHMgPVxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWVzO1xyXG5cdFx0XHRcdFx0XHRcdGF3YWl0IHBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHRcdFx0XHR1cGRhdGVCdXR0b25UZXh0KCk7XHJcblx0XHRcdFx0XHRcdFx0bmV3IE5vdGljZShcclxuXHRcdFx0XHRcdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFwiVGFzayBmaWVsZHMgdXBkYXRlZC4gUmVidWlsZCB0aGUgdGFzayBpbmRleCB0byBhcHBseSB0byBleGlzdGluZyBmaWxlcy5cIlxyXG5cdFx0XHRcdFx0XHRcdFx0KSxcclxuXHRcdFx0XHRcdFx0XHRcdDYwMDBcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0fSkub3BlbigpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRuZXcgU2V0dGluZyhtZXRhZGF0YUNvbnRhaW5lcilcclxuXHRcdFx0LnNldE5hbWUodChcIlJlcXVpcmUgQWxsIEZpZWxkc1wiKSlcclxuXHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFwiUmVxdWlyZSBhbGwgc3BlY2lmaWVkIGZpZWxkcyB0byBiZSBwcmVzZW50IChvdGhlcndpc2UgYW55IGZpZWxkIGlzIHN1ZmZpY2llbnQpXCJcclxuXHRcdFx0XHQpXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxyXG5cdFx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRjb25maWcucmVjb2duaXRpb25TdHJhdGVnaWVzLm1ldGFkYXRhLnJlcXVpcmVBbGxGaWVsZHNcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLmZpbGVTb3VyY2UucmVjb2duaXRpb25TdHJhdGVnaWVzLm1ldGFkYXRhLnJlcXVpcmVBbGxGaWVsZHMgPVxyXG5cdFx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRhd2FpdCBwbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHQpO1xyXG5cdH1cclxuXHJcblx0Ly8gVGFnIHN0cmF0ZWd5XHJcblx0Y29uc3QgdGFnQ29udGFpbmVyID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KFxyXG5cdFx0XCJmaWxlLXNvdXJjZS1zdHJhdGVneS1jb250YWluZXJcIlxyXG5cdCk7XHJcblxyXG5cdG5ldyBTZXR0aW5nKHRhZ0NvbnRhaW5lcilcclxuXHRcdC5zZXROYW1lKHQoXCJUYWctYmFzZWQgUmVjb2duaXRpb25cIikpXHJcblx0XHQuc2V0RGVzYyh0KFwiUmVjb2duaXplIGZpbGVzIGFzIHRhc2tzIGlmIHRoZXkgaGF2ZSBzcGVjaWZpYyB0YWdzXCIpKVxyXG5cdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxyXG5cdFx0XHR0b2dnbGVcclxuXHRcdFx0XHQuc2V0VmFsdWUoY29uZmlnLnJlY29nbml0aW9uU3RyYXRlZ2llcy50YWdzLmVuYWJsZWQpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLmZpbGVTb3VyY2UucmVjb2duaXRpb25TdHJhdGVnaWVzLnRhZ3MuZW5hYmxlZCA9XHJcblx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0YXdhaXQgcGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdFx0Ly8gUmVmcmVzaCB0byBzaG93L2hpZGUgZmllbGRzXHJcblx0XHRcdFx0XHRjb250YWluZXJFbC5lbXB0eSgpO1xyXG5cdFx0XHRcdFx0Y3JlYXRlRmlsZVNvdXJjZVNldHRpbmdzKGNvbnRhaW5lckVsLCBwbHVnaW4pO1xyXG5cdFx0XHRcdH0pXHJcblx0XHQpO1xyXG5cclxuXHRpZiAoY29uZmlnLnJlY29nbml0aW9uU3RyYXRlZ2llcy50YWdzLmVuYWJsZWQpIHtcclxuXHRcdG5ldyBTZXR0aW5nKHRhZ0NvbnRhaW5lcilcclxuXHRcdFx0LnNldE5hbWUodChcIlRhc2sgVGFnc1wiKSlcclxuXHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFwiQ29uZmlndXJlIHRhZ3MgdGhhdCBpbmRpY2F0ZSBhIGZpbGUgc2hvdWxkIGJlIHRyZWF0ZWQgYXMgYSB0YXNrIChlLmcuLCAjdGFzaywgI3RvZG8sICNhY3Rpb25hYmxlKVwiXHJcblx0XHRcdFx0KVxyXG5cdFx0XHQpXHJcblx0XHRcdC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IGdldFRhc2tUYWdzID0gKCkgPT4ge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGNvbmZpZy5yZWNvZ25pdGlvblN0cmF0ZWdpZXMudGFncy50YXNrVGFncyA/PyBbXTtcclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRjb25zdCB1cGRhdGVCdXR0b25UZXh0ID0gKCkgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc3QgdGFncyA9IGdldFRhc2tUYWdzKCk7XHJcblx0XHRcdFx0XHRpZiAodGFncy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0XHRcdFx0YnV0dG9uLnNldEJ1dHRvblRleHQodChcIkNvbmZpZ3VyZSBUYXNrIFRhZ3NcIikpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0YnV0dG9uLnNldEJ1dHRvblRleHQoXHJcblx0XHRcdFx0XHRcdFx0dChcInt7Y291bnR9fSB0YWcocykgY29uZmlndXJlZFwiLCB7XHJcblx0XHRcdFx0XHRcdFx0XHRpbnRlcnBvbGF0aW9uOiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGNvdW50OiB0YWdzLmxlbmd0aC50b1N0cmluZygpLFxyXG5cdFx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdHVwZGF0ZUJ1dHRvblRleHQoKTtcclxuXHRcdFx0XHRidXR0b24ub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRuZXcgTGlzdENvbmZpZ01vZGFsKHBsdWdpbiwge1xyXG5cdFx0XHRcdFx0XHR0aXRsZTogdChcIkNvbmZpZ3VyZSBUYXNrIFRhZ3NcIiksXHJcblx0XHRcdFx0XHRcdGRlc2NyaXB0aW9uOiB0KFxyXG5cdFx0XHRcdFx0XHRcdFwiQWRkIHRhZ3MgdGhhdCBpbmRpY2F0ZSBhIGZpbGUgc2hvdWxkIGJlIHRyZWF0ZWQgYXMgYSB0YXNrIChlLmcuLCAjdGFzaywgI3RvZG8sICNhY3Rpb25hYmxlKVwiXHJcblx0XHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyOiB0KFwiRW50ZXIgdGFnIChlLmcuLCAjdGFzaylcIiksXHJcblx0XHRcdFx0XHRcdHZhbHVlczogZ2V0VGFza1RhZ3MoKSxcclxuXHRcdFx0XHRcdFx0b25TYXZlOiBhc3luYyAodmFsdWVzKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLmZpbGVTb3VyY2UucmVjb2duaXRpb25TdHJhdGVnaWVzLnRhZ3MudGFza1RhZ3MgPVxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWVzO1xyXG5cdFx0XHRcdFx0XHRcdGF3YWl0IHBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHRcdFx0XHR1cGRhdGVCdXR0b25UZXh0KCk7XHJcblx0XHRcdFx0XHRcdFx0bmV3IE5vdGljZShcclxuXHRcdFx0XHRcdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFwiVGFzayB0YWdzIHVwZGF0ZWQuIFJlYnVpbGQgdGhlIHRhc2sgaW5kZXggdG8gYXBwbHkgdG8gZXhpc3RpbmcgZmlsZXMuXCJcclxuXHRcdFx0XHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHRcdFx0XHQ2MDAwXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdH0pLm9wZW4oKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0bmV3IFNldHRpbmcodGFnQ29udGFpbmVyKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiVGFnIE1hdGNoaW5nIE1vZGVcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJIb3cgdGFncyBzaG91bGQgYmUgbWF0Y2hlZCBhZ2FpbnN0IGZpbGUgdGFnc1wiKSlcclxuXHRcdFx0LmFkZERyb3Bkb3duKChkcm9wZG93bikgPT5cclxuXHRcdFx0XHRkcm9wZG93blxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcImV4YWN0XCIsIHQoXCJFeGFjdCBtYXRjaFwiKSlcclxuXHRcdFx0XHRcdC5hZGRPcHRpb24oXCJwcmVmaXhcIiwgdChcIlByZWZpeCBtYXRjaFwiKSlcclxuXHRcdFx0XHRcdC5hZGRPcHRpb24oXCJjb250YWluc1wiLCB0KFwiQ29udGFpbnMgbWF0Y2hcIikpXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUoY29uZmlnLnJlY29nbml0aW9uU3RyYXRlZ2llcy50YWdzLm1hdGNoTW9kZSlcclxuXHRcdFx0XHRcdC5vbkNoYW5nZShcclxuXHRcdFx0XHRcdFx0YXN5bmMgKHZhbHVlOiBcImV4YWN0XCIgfCBcInByZWZpeFwiIHwgXCJjb250YWluc1wiKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLmZpbGVTb3VyY2UucmVjb2duaXRpb25TdHJhdGVnaWVzLnRhZ3MubWF0Y2hNb2RlID1cclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdGF3YWl0IHBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHQpO1xyXG5cdH1cclxuXHJcblx0Ly8gUGF0aCBzdHJhdGVneVxyXG5cdGNvbnN0IHBhdGhDb250YWluZXIgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoXHJcblx0XHRcImZpbGUtc291cmNlLXN0cmF0ZWd5LWNvbnRhaW5lclwiXHJcblx0KTtcclxuXHJcblx0bmV3IFNldHRpbmcocGF0aENvbnRhaW5lcilcclxuXHRcdC5zZXROYW1lKHQoXCJQYXRoLWJhc2VkIFJlY29nbml0aW9uXCIpKVxyXG5cdFx0LnNldERlc2ModChcIlJlY29nbml6ZSBmaWxlcyBhcyB0YXNrcyBiYXNlZCBvbiB0aGVpciBmaWxlIHBhdGhcIikpXHJcblx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+XHJcblx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdC5zZXRWYWx1ZShjb25maWcucmVjb2duaXRpb25TdHJhdGVnaWVzLnBhdGhzLmVuYWJsZWQpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLmZpbGVTb3VyY2UucmVjb2duaXRpb25TdHJhdGVnaWVzLnBhdGhzLmVuYWJsZWQgPVxyXG5cdFx0XHRcdFx0XHR2YWx1ZTtcclxuXHRcdFx0XHRcdGF3YWl0IHBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHRcdC8vIFJlZnJlc2ggc2V0dGluZ3MgaW50ZXJmYWNlXHJcblx0XHRcdFx0XHRjb250YWluZXJFbC5lbXB0eSgpO1xyXG5cdFx0XHRcdFx0Y3JlYXRlRmlsZVNvdXJjZVNldHRpbmdzKGNvbnRhaW5lckVsLCBwbHVnaW4pO1xyXG5cdFx0XHRcdH0pXHJcblx0XHQpO1xyXG5cclxuXHRpZiAoY29uZmlnLnJlY29nbml0aW9uU3RyYXRlZ2llcy5wYXRocy5lbmFibGVkKSB7XHJcblx0XHRuZXcgU2V0dGluZyhwYXRoQ29udGFpbmVyKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiVGFzayBQYXRoc1wiKSlcclxuXHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFwiQ29uZmlndXJlIHBhdGhzIHRoYXQgY29udGFpbiB0YXNrIGZpbGVzIChlLmcuLCBQcm9qZWN0cy8sIFRhc2tzLzIwMjQvLCBXb3JrL1RPRE8vKVwiXHJcblx0XHRcdFx0KVxyXG5cdFx0XHQpXHJcblx0XHRcdC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IGdldFRhc2tQYXRocyA9ICgpID0+IHtcclxuXHRcdFx0XHRcdHJldHVybiBjb25maWcucmVjb2duaXRpb25TdHJhdGVnaWVzLnBhdGhzLnRhc2tQYXRocyA/PyBbXTtcclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRjb25zdCB1cGRhdGVCdXR0b25UZXh0ID0gKCkgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc3QgcGF0aHMgPSBnZXRUYXNrUGF0aHMoKTtcclxuXHRcdFx0XHRcdGlmIChwYXRocy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0XHRcdFx0YnV0dG9uLnNldEJ1dHRvblRleHQodChcIkNvbmZpZ3VyZSBUYXNrIFBhdGhzXCIpKTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdGJ1dHRvbi5zZXRCdXR0b25UZXh0KFxyXG5cdFx0XHRcdFx0XHRcdHQoXCJ7e2NvdW50fX0gcGF0aChzKSBjb25maWd1cmVkXCIsIHtcclxuXHRcdFx0XHRcdFx0XHRcdGludGVycG9sYXRpb246IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y291bnQ6IHBhdGhzLmxlbmd0aC50b1N0cmluZygpLFxyXG5cdFx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdHVwZGF0ZUJ1dHRvblRleHQoKTtcclxuXHRcdFx0XHRidXR0b24ub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRuZXcgTGlzdENvbmZpZ01vZGFsKHBsdWdpbiwge1xyXG5cdFx0XHRcdFx0XHR0aXRsZTogdChcIkNvbmZpZ3VyZSBUYXNrIFBhdGhzXCIpLFxyXG5cdFx0XHRcdFx0XHRkZXNjcmlwdGlvbjogdChcclxuXHRcdFx0XHRcdFx0XHRcIkFkZCBwYXRocyB0aGF0IGNvbnRhaW4gdGFzayBmaWxlcyAoZS5nLiwgUHJvamVjdHMvLCBUYXNrcy8yMDI0LywgV29yay9UT0RPLylcIlxyXG5cdFx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0XHRwbGFjZWhvbGRlcjogdChcclxuXHRcdFx0XHRcdFx0XHRcIkVudGVyIHBhdGggKGUuZy4sIFByb2plY3RzLywgVGFza3MvKiovKi5tZClcIlxyXG5cdFx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0XHR2YWx1ZXM6IGdldFRhc2tQYXRocygpLFxyXG5cdFx0XHRcdFx0XHRvblNhdmU6IGFzeW5jICh2YWx1ZXMpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRwbHVnaW4uc2V0dGluZ3MuZmlsZVNvdXJjZS5yZWNvZ25pdGlvblN0cmF0ZWdpZXMucGF0aHMudGFza1BhdGhzID1cclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlcztcclxuXHRcdFx0XHRcdFx0XHRhd2FpdCBwbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0XHRcdFx0dXBkYXRlQnV0dG9uVGV4dCgpO1xyXG5cdFx0XHRcdFx0XHRcdG5ldyBOb3RpY2UoXHJcblx0XHRcdFx0XHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcIlRhc2sgcGF0aHMgdXBkYXRlZC4gUmVidWlsZCB0aGUgdGFzayBpbmRleCB0byBhcHBseSB0byBleGlzdGluZyBmaWxlcy5cIlxyXG5cdFx0XHRcdFx0XHRcdFx0KSxcclxuXHRcdFx0XHRcdFx0XHRcdDYwMDBcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0fSkub3BlbigpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRuZXcgU2V0dGluZyhwYXRoQ29udGFpbmVyKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiUGF0aCBNYXRjaGluZyBNb2RlXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyh0KFwiSG93IHBhdGhzIHNob3VsZCBiZSBtYXRjaGVkXCIpKVxyXG5cdFx0XHQuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PlxyXG5cdFx0XHRcdGRyb3Bkb3duXHJcblx0XHRcdFx0XHQuYWRkT3B0aW9uKFxyXG5cdFx0XHRcdFx0XHRcInByZWZpeFwiLFxyXG5cdFx0XHRcdFx0XHR0KFwiUHJlZml4IChlLmcuLCBQcm9qZWN0cy8gbWF0Y2hlcyBQcm9qZWN0cy9BcHAubWQpXCIpXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHQuYWRkT3B0aW9uKFxyXG5cdFx0XHRcdFx0XHRcImdsb2JcIixcclxuXHRcdFx0XHRcdFx0dChcIkdsb2IgcGF0dGVybiAoZS5nLiwgUHJvamVjdHMvKiovKi5tZClcIilcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdC5hZGRPcHRpb24oXCJyZWdleFwiLCB0KFwiUmVndWxhciBleHByZXNzaW9uIChhZHZhbmNlZClcIikpXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUoY29uZmlnLnJlY29nbml0aW9uU3RyYXRlZ2llcy5wYXRocy5tYXRjaE1vZGUpXHJcblx0XHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlOiBcInByZWZpeFwiIHwgXCJyZWdleFwiIHwgXCJnbG9iXCIpID0+IHtcclxuXHRcdFx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLmZpbGVTb3VyY2UucmVjb2duaXRpb25TdHJhdGVnaWVzLnBhdGhzLm1hdGNoTW9kZSA9XHJcblx0XHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRcdGF3YWl0IHBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHRcdFx0Ly8gUmVmcmVzaCB0byBzaG93IHVwZGF0ZWQgZXhhbXBsZXNcclxuXHRcdFx0XHRcdFx0Y29udGFpbmVyRWwuZW1wdHkoKTtcclxuXHRcdFx0XHRcdFx0Y3JlYXRlRmlsZVNvdXJjZVNldHRpbmdzKGNvbnRhaW5lckVsLCBwbHVnaW4pO1xyXG5cdFx0XHRcdFx0fSlcclxuXHRcdFx0KTtcclxuXHJcblx0XHQvLyBBZGQgZXhhbXBsZXMgYmFzZWQgb24gY3VycmVudCBtb2RlXHJcblx0XHRjb25zdCBleGFtcGxlcyA9IHBhdGhDb250YWluZXIuY3JlYXRlRGl2KFwic2V0dGluZy1pdGVtLWRlc2NyaXB0aW9uXCIpO1xyXG5cclxuXHRcdGNvbnN0IGN1cnJlbnRNb2RlID0gY29uZmlnLnJlY29nbml0aW9uU3RyYXRlZ2llcy5wYXRocy5tYXRjaE1vZGU7XHJcblx0XHRsZXQgZXhhbXBsZVRleHQgPSBcIlwiO1xyXG5cclxuXHRcdHN3aXRjaCAoY3VycmVudE1vZGUpIHtcclxuXHRcdFx0Y2FzZSBcInByZWZpeFwiOlxyXG5cdFx0XHRcdGV4YW1wbGVUZXh0ID1cclxuXHRcdFx0XHRcdHQoXCJFeGFtcGxlczpcIikgK1xyXG5cdFx0XHRcdFx0XCJcXG5cIiArXHJcblx0XHRcdFx0XHRcIuKAoiBQcm9qZWN0cy8g4oaSIFwiICtcclxuXHRcdFx0XHRcdHQoXCJtYXRjaGVzIGFsbCBmaWxlcyB1bmRlciBQcm9qZWN0cyBmb2xkZXJcIikgK1xyXG5cdFx0XHRcdFx0XCJcXG5cIiArXHJcblx0XHRcdFx0XHRcIuKAoiBUYXNrcy8yMDI0LyDihpIgXCIgK1xyXG5cdFx0XHRcdFx0dChcIm1hdGNoZXMgYWxsIGZpbGVzIHVuZGVyIFRhc2tzLzIwMjQgZm9sZGVyXCIpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwiZ2xvYlwiOlxyXG5cdFx0XHRcdGV4YW1wbGVUZXh0ID1cclxuXHRcdFx0XHRcdHQoXCJFeGFtcGxlczpcIikgK1xyXG5cdFx0XHRcdFx0XCJcXG5cIiArXHJcblx0XHRcdFx0XHRcIuKAoiBQcm9qZWN0cy8qKi8qLm1kIOKGkiBcIiArXHJcblx0XHRcdFx0XHR0KFwiYWxsIC5tZCBmaWxlcyBpbiBQcm9qZWN0cyBhbmQgc3ViZm9sZGVyc1wiKSArXHJcblx0XHRcdFx0XHRcIlxcblwiICtcclxuXHRcdFx0XHRcdFwi4oCiIFRhc2tzLyoudGFzay5tZCDihpIgXCIgK1xyXG5cdFx0XHRcdFx0dChcImZpbGVzIGVuZGluZyB3aXRoIC50YXNrLm1kIGluIFRhc2tzIGZvbGRlclwiKSArXHJcblx0XHRcdFx0XHRcIlxcblwiICtcclxuXHRcdFx0XHRcdFwi4oCiIFdvcmsvKi9UT0RPLm1kIOKGkiBcIiArXHJcblx0XHRcdFx0XHR0KFwiVE9ETy5tZCBpbiBhbnkgZGlyZWN0IHN1YmZvbGRlciBvZiBXb3JrXCIpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwicmVnZXhcIjpcclxuXHRcdFx0XHRleGFtcGxlVGV4dCA9XHJcblx0XHRcdFx0XHR0KFwiRXhhbXBsZXM6XCIpICtcclxuXHRcdFx0XHRcdFwiXFxuXCIgK1xyXG5cdFx0XHRcdFx0XCLigKIgXlByb2plY3RzLy4qXFxcXC5tZCQg4oaSIFwiICtcclxuXHRcdFx0XHRcdHQoXCJhbGwgLm1kIGZpbGVzIGluIFByb2plY3RzIGZvbGRlclwiKSArXHJcblx0XHRcdFx0XHRcIlxcblwiICtcclxuXHRcdFx0XHRcdFwi4oCiIF5UYXNrcy9cXFxcZHs0fS1cXFxcZHsyfS1cXFxcZHsyfSDihpIgXCIgK1xyXG5cdFx0XHRcdFx0dChcImZpbGVzIHN0YXJ0aW5nIHdpdGggZGF0ZSBpbiBUYXNrc1wiKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHJcblx0XHRleGFtcGxlcy5jcmVhdGVFbChcInByZVwiLCB7XHJcblx0XHRcdHRleHQ6IGV4YW1wbGVUZXh0LFxyXG5cdFx0XHRhdHRyOiB7IHN0eWxlOiBcImZvbnQtc2l6ZTogMC45ZW07IGNvbG9yOiB2YXIoLS10ZXh0LW11dGVkKTtcIiB9LFxyXG5cdFx0fSk7XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlIGZpbGUgdGFzayBwcm9wZXJ0aWVzIHNlY3Rpb25cclxuICovXHJcbmZ1bmN0aW9uIGNyZWF0ZUZpbGVUYXNrUHJvcGVydGllc1NlY3Rpb24oXHJcblx0Y29udGFpbmVyRWw6IEhUTUxFbGVtZW50LFxyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdGNvbmZpZzogRmlsZVNvdXJjZUNvbmZpZ3VyYXRpb25cclxuKTogdm9pZCB7XHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0SGVhZGluZygpXHJcblx0XHQuc2V0TmFtZSh0KFwiVGFzayBQcm9wZXJ0aWVzIGZvciBGaWxlc1wiKSk7XHJcblxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIlRhc2sgVGl0bGUgU291cmNlXCIpKVxyXG5cdFx0LnNldERlc2MoXHJcblx0XHRcdHQoXHJcblx0XHRcdFx0XCJXaGF0IHNob3VsZCBiZSB1c2VkIGFzIHRoZSB0YXNrIHRpdGxlIHdoZW4gYSBmaWxlIGJlY29tZXMgYSB0YXNrXCJcclxuXHRcdFx0KVxyXG5cdFx0KVxyXG5cdFx0LmFkZERyb3Bkb3duKChkcm9wZG93bikgPT5cclxuXHRcdFx0ZHJvcGRvd25cclxuXHRcdFx0XHQuYWRkT3B0aW9uKFwiZmlsZW5hbWVcIiwgdChcIkZpbGVuYW1lXCIpKVxyXG5cdFx0XHRcdC5hZGRPcHRpb24oXCJ0aXRsZVwiLCB0KFwiRnJvbnRtYXR0ZXIgdGl0bGVcIikpXHJcblx0XHRcdFx0LmFkZE9wdGlvbihcImgxXCIsIHQoXCJGaXJzdCBIMSBoZWFkaW5nXCIpKVxyXG5cdFx0XHRcdC5hZGRPcHRpb24oXCJjdXN0b21cIiwgdChcIkN1c3RvbSBtZXRhZGF0YSBmaWVsZFwiKSlcclxuXHRcdFx0XHQuc2V0VmFsdWUoY29uZmlnLmZpbGVUYXNrUHJvcGVydGllcy5jb250ZW50U291cmNlKVxyXG5cdFx0XHRcdC5vbkNoYW5nZShcclxuXHRcdFx0XHRcdGFzeW5jICh2YWx1ZTogXCJmaWxlbmFtZVwiIHwgXCJ0aXRsZVwiIHwgXCJoMVwiIHwgXCJjdXN0b21cIikgPT4ge1xyXG5cdFx0XHRcdFx0XHRwbHVnaW4uc2V0dGluZ3MuZmlsZVNvdXJjZS5maWxlVGFza1Byb3BlcnRpZXMuY29udGVudFNvdXJjZSA9XHJcblx0XHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRcdGF3YWl0IHBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIFJlZnJlc2ggdG8gc2hvdy9oaWRlIGN1c3RvbSBmaWVsZCBpbnB1dFxyXG5cdFx0XHRcdFx0XHRjb250YWluZXJFbC5lbXB0eSgpO1xyXG5cdFx0XHRcdFx0XHRjcmVhdGVGaWxlU291cmNlU2V0dGluZ3MoY29udGFpbmVyRWwsIHBsdWdpbik7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0KVxyXG5cdFx0KTtcclxuXHJcblx0aWYgKGNvbmZpZy5maWxlVGFza1Byb3BlcnRpZXMuY29udGVudFNvdXJjZSA9PT0gXCJjdXN0b21cIikge1xyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJDdXN0b20gQ29udGVudCBGaWVsZFwiKSlcclxuXHRcdFx0LnNldERlc2ModChcIk5hbWUgb2YgdGhlIG1ldGFkYXRhIGZpZWxkIHRvIHVzZSBhcyB0YXNrIGNvbnRlbnRcIikpXHJcblx0XHRcdC5hZGRUZXh0KCh0ZXh0KSA9PlxyXG5cdFx0XHRcdHRleHRcclxuXHRcdFx0XHRcdC5zZXRQbGFjZWhvbGRlcihcInRhc2tDb250ZW50XCIpXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRcdGNvbmZpZy5maWxlVGFza1Byb3BlcnRpZXMuY3VzdG9tQ29udGVudEZpZWxkIHx8IFwiXCJcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLmZpbGVTb3VyY2UuZmlsZVRhc2tQcm9wZXJ0aWVzLmN1c3RvbUNvbnRlbnRGaWVsZCA9XHJcblx0XHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRcdGF3YWl0IHBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdCk7XHJcblx0fVxyXG5cclxuXHRpZiAoY29uZmlnLmZpbGVUYXNrUHJvcGVydGllcy5jb250ZW50U291cmNlID09PSBcImZpbGVuYW1lXCIpIHtcclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiU3RyaXAgRmlsZSBFeHRlbnNpb25cIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcIlJlbW92ZSB0aGUgLm1kIGV4dGVuc2lvbiBmcm9tIGZpbGVuYW1lIHdoZW4gdXNpbmcgYXMgdGFzayBjb250ZW50XCJcclxuXHRcdFx0XHQpXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxyXG5cdFx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKGNvbmZpZy5maWxlVGFza1Byb3BlcnRpZXMuc3RyaXBFeHRlbnNpb24pXHJcblx0XHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdHBsdWdpbi5zZXR0aW5ncy5maWxlU291cmNlLmZpbGVUYXNrUHJvcGVydGllcy5zdHJpcEV4dGVuc2lvbiA9XHJcblx0XHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRcdGF3YWl0IHBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdCk7XHJcblx0fVxyXG5cclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJQcmVmZXIgRnJvbnRtYXR0ZXIgVGl0bGVcIikpXHJcblx0XHQuc2V0RGVzYyhcclxuXHRcdFx0dChcclxuXHRcdFx0XHRcIldoZW4gdXBkYXRpbmcgdGFzayBjb250ZW50LCBwcmVmZXIgdXBkYXRpbmcgZnJvbnRtYXR0ZXIgdGl0bGUgb3ZlciByZW5hbWluZyB0aGUgZmlsZS4gVGhpcyBwcm90ZWN0cyB0aGUgb3JpZ2luYWwgZmlsZW5hbWUuXCJcclxuXHRcdFx0KVxyXG5cdFx0KVxyXG5cdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxyXG5cdFx0XHR0b2dnbGVcclxuXHRcdFx0XHQuc2V0VmFsdWUoY29uZmlnLmZpbGVUYXNrUHJvcGVydGllcy5wcmVmZXJGcm9udG1hdHRlclRpdGxlKVxyXG5cdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdHBsdWdpbi5zZXR0aW5ncy5maWxlU291cmNlLmZpbGVUYXNrUHJvcGVydGllcy5wcmVmZXJGcm9udG1hdHRlclRpdGxlID1cclxuXHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRhd2FpdCBwbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0fSlcclxuXHRcdCk7XHJcblxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIkRlZmF1bHQgVGFzayBTdGF0dXNcIikpXHJcblx0XHQuc2V0RGVzYyh0KFwiRGVmYXVsdCBzdGF0dXMgZm9yIG5ld2x5IGNyZWF0ZWQgZmlsZSB0YXNrc1wiKSlcclxuXHRcdC5hZGRUZXh0KCh0ZXh0KSA9PlxyXG5cdFx0XHR0ZXh0XHJcblx0XHRcdFx0LnNldFBsYWNlaG9sZGVyKFwiIFwiKVxyXG5cdFx0XHRcdC5zZXRWYWx1ZShjb25maWcuZmlsZVRhc2tQcm9wZXJ0aWVzLmRlZmF1bHRTdGF0dXMpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLmZpbGVTb3VyY2UuZmlsZVRhc2tQcm9wZXJ0aWVzLmRlZmF1bHRTdGF0dXMgPVxyXG5cdFx0XHRcdFx0XHR2YWx1ZTtcclxuXHRcdFx0XHRcdGF3YWl0IHBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHR9KVxyXG5cdFx0KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSBzdGF0dXMgbWFwcGluZyBzZWN0aW9uXHJcbiAqL1xyXG5mdW5jdGlvbiBjcmVhdGVTdGF0dXNNYXBwaW5nU2VjdGlvbihcclxuXHRjb250YWluZXJFbDogSFRNTEVsZW1lbnQsXHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0Y29uZmlnOiBGaWxlU291cmNlQ29uZmlndXJhdGlvblxyXG4pOiB2b2lkIHtcclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJTdGF0dXMgTWFwcGluZ1wiKSlcclxuXHRcdC5zZXREZXNjKFxyXG5cdFx0XHR0KFxyXG5cdFx0XHRcdFwiTWFwIGJldHdlZW4gaHVtYW4tcmVhZGFibGUgbWV0YWRhdGEgdmFsdWVzIChlLmcuLCAnY29tcGxldGVkJykgYW5kIHRhc2sgc3ltYm9scyAoZS5nLiwgJ3gnKS5cIlxyXG5cdFx0XHQpXHJcblx0XHQpO1xyXG5cclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJFbmFibGUgU3RhdHVzIE1hcHBpbmdcIikpXHJcblx0XHQuc2V0RGVzYyhcclxuXHRcdFx0dChcclxuXHRcdFx0XHRcIkF1dG9tYXRpY2FsbHkgY29udmVydCBiZXR3ZWVuIG1ldGFkYXRhIHN0YXR1cyB2YWx1ZXMgYW5kIHRhc2sgc3ltYm9sc1wiXHJcblx0XHRcdClcclxuXHRcdClcclxuXHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT5cclxuXHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0LnNldFZhbHVlKGNvbmZpZy5zdGF0dXNNYXBwaW5nPy5lbmFibGVkIHx8IGZhbHNlKVxyXG5cdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdGlmICghY29uZmlnLnN0YXR1c01hcHBpbmcpIHtcclxuXHRcdFx0XHRcdFx0Y29uZmlnLnN0YXR1c01hcHBpbmcgPSB7XHJcblx0XHRcdFx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdFx0XHRcdFx0bWV0YWRhdGFUb1N5bWJvbDoge30sXHJcblx0XHRcdFx0XHRcdFx0c3ltYm9sVG9NZXRhZGF0YToge30sXHJcblx0XHRcdFx0XHRcdFx0YXV0b0RldGVjdDogZmFsc2UsXHJcblx0XHRcdFx0XHRcdFx0Y2FzZVNlbnNpdGl2ZTogZmFsc2UsXHJcblx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLmZpbGVTb3VyY2Uuc3RhdHVzTWFwcGluZy5lbmFibGVkID0gdmFsdWU7XHJcblx0XHRcdFx0XHRhd2FpdCBwbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gUmVmcmVzaCB0byBzaG93L2hpZGUgbWFwcGluZyBvcHRpb25zXHJcblx0XHRcdFx0XHRjb250YWluZXJFbC5lbXB0eSgpO1xyXG5cdFx0XHRcdFx0Y3JlYXRlRmlsZVNvdXJjZVNldHRpbmdzKGNvbnRhaW5lckVsLCBwbHVnaW4pO1xyXG5cdFx0XHRcdH0pXHJcblx0XHQpO1xyXG5cclxuXHRpZiAoY29uZmlnLnN0YXR1c01hcHBpbmcgJiYgY29uZmlnLnN0YXR1c01hcHBpbmcuZW5hYmxlZCkge1xyXG5cdFx0Ly8gU3luYyBtYXBwaW5nIGZyb20gVGFzayBTdGF0dXMgU2V0dGluZ3NcclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiU3luYyBmcm9tIFRhc2sgU3RhdHVzIFNldHRpbmdzXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XCJQb3B1bGF0ZSBGaWxlU291cmNlIHN0YXR1cyBtYXBwaW5nIGZyb20geW91ciBjaGVja2JveCBzdGF0dXMgY29uZmlndXJhdGlvblwiXHJcblx0XHRcdFx0KVxyXG5cdFx0XHQpXHJcblx0XHRcdC5hZGRCdXR0b24oKGJ1dHRvbikgPT5cclxuXHRcdFx0XHRidXR0b25cclxuXHRcdFx0XHRcdC5zZXRCdXR0b25UZXh0KHQoXCJTeW5jIG5vd1wiKSlcclxuXHRcdFx0XHRcdC5zZXRDdGEoKVxyXG5cdFx0XHRcdFx0Lm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IG9yY2hlc3RyYXRvciA9IChwbHVnaW4gYXMgYW55KVxyXG5cdFx0XHRcdFx0XHRcdFx0LmRhdGFmbG93T3JjaGVzdHJhdG9yO1xyXG5cdFx0XHRcdFx0XHRcdGlmIChvcmNoZXN0cmF0b3I/LnVwZGF0ZVNldHRpbmdzKSB7XHJcblx0XHRcdFx0XHRcdFx0XHQvLyBEZWxlZ2F0ZSB0byBvcmNoZXN0cmF0b3Igc28gaW4tbWVtb3J5IEZpbGVTb3VyY2UgbWFwcGluZyBzeW5jcyBpbW1lZGlhdGVseVxyXG5cdFx0XHRcdFx0XHRcdFx0b3JjaGVzdHJhdG9yLnVwZGF0ZVNldHRpbmdzKHBsdWdpbi5zZXR0aW5ncyk7XHJcblx0XHRcdFx0XHRcdFx0XHRuZXcgTm90aWNlKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR0KFwiRmlsZVNvdXJjZSBzdGF0dXMgbWFwcGluZyBzeW5jZWRcIilcclxuXHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRcdC8vIEZhbGxiYWNrOiBkZXJpdmUgc3ltYm9sLT5tZXRhZGF0YSBtYXBwaW5nIGZyb20gVGFzayBTdGF0dXMgc2V0dGluZ3NcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IHRhc2tTdGF0dXNlcyA9IChwbHVnaW4uc2V0dGluZ3NcclxuXHRcdFx0XHRcdFx0XHRcdFx0LnRhc2tTdGF0dXNlcyB8fCB7fSkgYXMgUmVjb3JkPFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRzdHJpbmcsXHJcblx0XHRcdFx0XHRcdFx0XHRcdHN0cmluZ1xyXG5cdFx0XHRcdFx0XHRcdFx0PjtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IHN5bWJvbFRvVHlwZTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xyXG5cdFx0XHRcdFx0XHRcdFx0Zm9yIChjb25zdCBbdHlwZSwgc3ltYm9sc10gb2YgT2JqZWN0LmVudHJpZXMoXHJcblx0XHRcdFx0XHRcdFx0XHRcdHRhc2tTdGF0dXNlc1xyXG5cdFx0XHRcdFx0XHRcdFx0KSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBsaXN0ID0gU3RyaW5nKHN5bWJvbHMpXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0LnNwbGl0KFwifFwiKVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdC5maWx0ZXIoQm9vbGVhbik7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGZvciAoY29uc3Qgc3ltIG9mIGxpc3QpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRpZiAoc3ltID09PSBcIi8+XCIpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHN5bWJvbFRvVHlwZVtcIi9cIl0gPSB0eXBlO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0c3ltYm9sVG9UeXBlW1wiPlwiXSA9IHR5cGU7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0aWYgKHN5bS5sZW5ndGggPT09IDEpXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRzeW1ib2xUb1R5cGVbc3ltXSA9IHR5cGU7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRmb3IgKGNvbnN0IGNoIG9mIHN5bSlcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0c3ltYm9sVG9UeXBlW2NoXSA9IHR5cGU7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHRjb25zdCB0eXBlVG9NZXRhZGF0YTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y29tcGxldGVkOiBcImNvbXBsZXRlZFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRpblByb2dyZXNzOiBcImluLXByb2dyZXNzXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdHBsYW5uZWQ6IFwicGxhbm5lZFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRhYmFuZG9uZWQ6IFwiY2FuY2VsbGVkXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdG5vdFN0YXJ0ZWQ6IFwibm90LXN0YXJ0ZWRcIixcclxuXHRcdFx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHRcdFx0XHRwbHVnaW4uc2V0dGluZ3MuZmlsZVNvdXJjZS5zdGF0dXNNYXBwaW5nID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLmZpbGVTb3VyY2VcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQuc3RhdHVzTWFwcGluZyB8fCB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRtZXRhZGF0YVRvU3ltYm9sOiB7fSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRzeW1ib2xUb01ldGFkYXRhOiB7fSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRhdXRvRGV0ZWN0OiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGNhc2VTZW5zaXRpdmU6IGZhbHNlLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLmZpbGVTb3VyY2Uuc3RhdHVzTWFwcGluZy5zeW1ib2xUb01ldGFkYXRhID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0e307XHJcblx0XHRcdFx0XHRcdFx0XHRmb3IgKGNvbnN0IFtzeW1ib2wsIHR5cGVdIG9mIE9iamVjdC5lbnRyaWVzKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRzeW1ib2xUb1R5cGVcclxuXHRcdFx0XHRcdFx0XHRcdCkpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgbWQgPSB0eXBlVG9NZXRhZGF0YVt0eXBlXTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKG1kKVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHBsdWdpbi5zZXR0aW5ncy5maWxlU291cmNlLnN0YXR1c01hcHBpbmcuc3ltYm9sVG9NZXRhZGF0YVtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHN5bWJvbFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdF0gPSBtZDtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdGF3YWl0IHBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHRcdFx0XHRcdG5ldyBOb3RpY2UoXHJcblx0XHRcdFx0XHRcdFx0XHRcdHQoXCJGaWxlU291cmNlIHN0YXR1cyBtYXBwaW5nIHN5bmNlZFwiKVxyXG5cdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmVycm9yKFxyXG5cdFx0XHRcdFx0XHRcdFx0XCJGYWlsZWQgdG8gc3luYyBGaWxlU291cmNlIHN0YXR1cyBtYXBwaW5nOlwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0ZVxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0bmV3IE5vdGljZSh0KFwiRmFpbGVkIHRvIHN5bmMgbWFwcGluZ1wiKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJDYXNlIFNlbnNpdGl2ZSBNYXRjaGluZ1wiKSlcclxuXHRcdFx0LnNldERlc2ModChcIkVuYWJsZSBjYXNlLXNlbnNpdGl2ZSBtYXRjaGluZyBmb3Igc3RhdHVzIHZhbHVlc1wiKSlcclxuXHRcdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxyXG5cdFx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKGNvbmZpZy5zdGF0dXNNYXBwaW5nLmNhc2VTZW5zaXRpdmUpXHJcblx0XHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdHBsdWdpbi5zZXR0aW5ncy5maWxlU291cmNlLnN0YXR1c01hcHBpbmcuY2FzZVNlbnNpdGl2ZSA9XHJcblx0XHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRcdGF3YWl0IHBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJBdXRvLWRldGVjdCBTdGF0dXMgTWFwcGluZ3NcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJBdXRvbWF0aWNhbGx5IHN5bmMgd2l0aCB0YXNrIHN0YXR1cyBjb25maWd1cmF0aW9uXCIpKVxyXG5cdFx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+XHJcblx0XHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUoY29uZmlnLnN0YXR1c01hcHBpbmcuYXV0b0RldGVjdClcclxuXHRcdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLmZpbGVTb3VyY2Uuc3RhdHVzTWFwcGluZy5hdXRvRGV0ZWN0ID1cclxuXHRcdFx0XHRcdFx0XHR2YWx1ZTtcclxuXHRcdFx0XHRcdFx0YXdhaXQgcGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdFx0fSlcclxuXHRcdFx0KTtcclxuXHJcblx0XHQvLyBDb21tb24gc3RhdHVzIG1hcHBpbmdzIGRpc3BsYXlcclxuXHRcdGNvbnN0IG1hcHBpbmdzQ29udGFpbmVyID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KFxyXG5cdFx0XHRcImZpbGUtc291cmNlLXN0YXR1cy1tYXBwaW5nc1wiXHJcblx0XHQpO1xyXG5cdFx0bWFwcGluZ3NDb250YWluZXIuY3JlYXRlRWwoXCJoNVwiLCB7IHRleHQ6IHQoXCJDb21tb24gTWFwcGluZ3NcIikgfSk7XHJcblxyXG5cdFx0Y29uc3QgbWFwcGluZ3NMaXN0ID0gbWFwcGluZ3NDb250YWluZXIuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHRjbHM6IFwic3RhdHVzLW1hcHBpbmctbGlzdFwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gU2hvdyBzb21lIGV4YW1wbGUgbWFwcGluZ3NcclxuXHRcdGNvbnN0IGV4YW1wbGVzID0gW1xyXG5cdFx0XHR7IG1ldGFkYXRhOiBcImNvbXBsZXRlZFwiLCBzeW1ib2w6IFwieFwiIH0sXHJcblx0XHRcdHsgbWV0YWRhdGE6IFwiaW4tcHJvZ3Jlc3NcIiwgc3ltYm9sOiBcIi9cIiB9LFxyXG5cdFx0XHR7IG1ldGFkYXRhOiBcInBsYW5uZWRcIiwgc3ltYm9sOiBcIj9cIiB9LFxyXG5cdFx0XHR7IG1ldGFkYXRhOiBcImNhbmNlbGxlZFwiLCBzeW1ib2w6IFwiLVwiIH0sXHJcblx0XHRcdHsgbWV0YWRhdGE6IFwibm90LXN0YXJ0ZWRcIiwgc3ltYm9sOiBcIiBcIiB9LFxyXG5cdFx0XTtcclxuXHJcblx0XHRjb25zdCB0YWJsZSA9IG1hcHBpbmdzTGlzdC5jcmVhdGVFbChcInRhYmxlXCIsIHtcclxuXHRcdFx0Y2xzOiBcInN0YXR1cy1tYXBwaW5nLXRhYmxlXCIsXHJcblx0XHR9KTtcclxuXHRcdGNvbnN0IHRoZWFkID0gdGFibGUuY3JlYXRlRWwoXCJ0aGVhZFwiKTtcclxuXHRcdGNvbnN0IGhlYWRlclJvdyA9IHRoZWFkLmNyZWF0ZUVsKFwidHJcIik7XHJcblx0XHRoZWFkZXJSb3cuY3JlYXRlRWwoXCJ0aFwiLCB7IHRleHQ6IHQoXCJNZXRhZGF0YSBWYWx1ZVwiKSB9KTtcclxuXHRcdGhlYWRlclJvdy5jcmVhdGVFbChcInRoXCIsIHsgdGV4dDogXCLihpJcIiB9KTtcclxuXHRcdGhlYWRlclJvdy5jcmVhdGVFbChcInRoXCIsIHsgdGV4dDogdChcIlRhc2sgU3ltYm9sXCIpIH0pO1xyXG5cclxuXHRcdGNvbnN0IHRib2R5ID0gdGFibGUuY3JlYXRlRWwoXCJ0Ym9keVwiKTtcclxuXHRcdGV4YW1wbGVzLmZvckVhY2goKGV4YW1wbGUpID0+IHtcclxuXHRcdFx0Y29uc3Qgcm93ID0gdGJvZHkuY3JlYXRlRWwoXCJ0clwiKTtcclxuXHRcdFx0cm93LmNyZWF0ZUVsKFwidGRcIiwgeyB0ZXh0OiBleGFtcGxlLm1ldGFkYXRhIH0pO1xyXG5cdFx0XHRyb3cuY3JlYXRlRWwoXCJ0ZFwiLCB7IHRleHQ6IFwi4oaSXCIgfSk7XHJcblx0XHRcdHJvdy5jcmVhdGVFbChcInRkXCIsIHtcclxuXHRcdFx0XHR0ZXh0OiBleGFtcGxlLnN5bWJvbCA9PT0gXCIgXCIgPyBcIihzcGFjZSlcIiA6IGV4YW1wbGUuc3ltYm9sLFxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEFkZCBjdXN0b20gbWFwcGluZyBtYW5hZ2VtZW50IFVJXHJcblx0XHRjb250YWluZXJFbC5jcmVhdGVFbChcImg1XCIsIHsgdGV4dDogdChcIkN1c3RvbSBNYXBwaW5nc1wiKSB9KTtcclxuXHJcblx0XHRjb25zdCBjdXN0b21NYXBwaW5nRGVzYyA9IGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiKTtcclxuXHRcdGN1c3RvbU1hcHBpbmdEZXNjLnRleHRDb250ZW50ID0gdChcclxuXHRcdFx0XCJBZGQgY3VzdG9tIHN0YXR1cyBtYXBwaW5ncyBmb3IgeW91ciB3b3JrZmxvdy5cIlxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBBZGQgbWFwcGluZyBpbnB1dFxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJBZGQgQ3VzdG9tIE1hcHBpbmdcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJFbnRlciBtZXRhZGF0YSB2YWx1ZSBhbmQgc3ltYm9sIChlLmcuLCAnZG9uZTp4JylcIikpXHJcblx0XHRcdC5hZGRUZXh0KCh0ZXh0KSA9PlxyXG5cdFx0XHRcdHRleHQuc2V0UGxhY2Vob2xkZXIoXCJkb25lOnhcIikub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAodmFsdWUuaW5jbHVkZXMoXCI6XCIpKSB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IFttZXRhZGF0YSwgc3ltYm9sXSA9IHZhbHVlLnNwbGl0KFwiOlwiLCAyKTtcclxuXHRcdFx0XHRcdFx0aWYgKG1ldGFkYXRhICYmIHN5bWJvbCkge1xyXG5cdFx0XHRcdFx0XHRcdHBsdWdpbi5zZXR0aW5ncy5maWxlU291cmNlLnN0YXR1c01hcHBpbmcubWV0YWRhdGFUb1N5bWJvbFtcclxuXHRcdFx0XHRcdFx0XHRcdG1ldGFkYXRhXHJcblx0XHRcdFx0XHRcdFx0XSA9IHN5bWJvbDtcclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gQWxzbyB1cGRhdGUgcmV2ZXJzZSBtYXBwaW5nIGlmIG5vdCBleGlzdHNcclxuXHRcdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0XHQhcGx1Z2luLnNldHRpbmdzLmZpbGVTb3VyY2Uuc3RhdHVzTWFwcGluZ1xyXG5cdFx0XHRcdFx0XHRcdFx0XHQuc3ltYm9sVG9NZXRhZGF0YVtzeW1ib2xdXHJcblx0XHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRwbHVnaW4uc2V0dGluZ3MuZmlsZVNvdXJjZS5zdGF0dXNNYXBwaW5nLnN5bWJvbFRvTWV0YWRhdGFbXHJcblx0XHRcdFx0XHRcdFx0XHRcdHN5bWJvbFxyXG5cdFx0XHRcdFx0XHRcdFx0XSA9IG1ldGFkYXRhO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0YXdhaXQgcGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdFx0XHRcdHRleHQuc2V0VmFsdWUoXCJcIik7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KVxyXG5cdFx0XHQpXHJcblx0XHRcdC5hZGRCdXR0b24oKGJ1dHRvbikgPT5cclxuXHRcdFx0XHRidXR0b25cclxuXHRcdFx0XHRcdC5zZXRCdXR0b25UZXh0KHQoXCJBZGRcIikpXHJcblx0XHRcdFx0XHQuc2V0Q3RhKClcclxuXHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8gVHJpZ2dlciB0aGUgdGV4dCBjaGFuZ2UgZXZlbnQgd2l0aCB0aGUgY3VycmVudCB2YWx1ZVxyXG5cdFx0XHRcdFx0XHRjb25zdCB0ZXh0SW5wdXQgPSBjb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRcdFx0XHRcdFwiLnNldHRpbmctaXRlbTpsYXN0LWNoaWxkIGlucHV0W3R5cGU9J3RleHQnXVwiXHJcblx0XHRcdFx0XHRcdCkgYXMgSFRNTElucHV0RWxlbWVudDtcclxuXHRcdFx0XHRcdFx0aWYgKHRleHRJbnB1dCkge1xyXG5cdFx0XHRcdFx0XHRcdHRleHRJbnB1dC5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudChcImNoYW5nZVwiKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0Ly8gTm90ZSBhYm91dCBUYXNrIFN0YXR1cyBTZXR0aW5ncyBpbnRlZ3JhdGlvblxyXG5cdFx0Y29uc3QgaW50ZWdyYXRpb25Ob3RlID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KFxyXG5cdFx0XHRcInNldHRpbmctaXRlbS1kZXNjcmlwdGlvblwiXHJcblx0XHQpO1xyXG5cdFx0aW50ZWdyYXRpb25Ob3RlLmNyZWF0ZUVsKFwic3Ryb25nXCIsIHsgdGV4dDogdChcIk5vdGU6XCIpIH0pO1xyXG5cdFx0aW50ZWdyYXRpb25Ob3RlLmNyZWF0ZUVsKFwic3BhblwiLCB7XHJcblx0XHRcdHRleHQ6XHJcblx0XHRcdFx0XCIgXCIgK1xyXG5cdFx0XHRcdHQoXCJTdGF0dXMgbWFwcGluZ3Mgd29yayB3aXRoIHlvdXIgVGFzayBTdGF0dXMgU2V0dGluZ3MuIFwiKSArXHJcblx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFwiVGhlIHN5bWJvbHMgZGVmaW5lZCBoZXJlIHNob3VsZCBtYXRjaCB0aG9zZSBpbiB5b3VyIGNoZWNrYm94IHN0YXR1cyBjb25maWd1cmF0aW9uLlwiXHJcblx0XHRcdFx0KSxcclxuXHRcdH0pO1xyXG5cdH1cclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSBwZXJmb3JtYW5jZSBzZWN0aW9uXHJcbiAqL1xyXG5mdW5jdGlvbiBjcmVhdGVQZXJmb3JtYW5jZVNlY3Rpb24oXHJcblx0Y29udGFpbmVyRWw6IEhUTUxFbGVtZW50LFxyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdGNvbmZpZzogRmlsZVNvdXJjZUNvbmZpZ3VyYXRpb25cclxuKTogdm9pZCB7XHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpLnNldEhlYWRpbmcoKS5zZXROYW1lKHQoXCJQZXJmb3JtYW5jZVwiKSk7XHJcblxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIkVuYWJsZSBDYWNoaW5nXCIpKVxyXG5cdFx0LnNldERlc2ModChcIkNhY2hlIGZpbGUgdGFzayByZXN1bHRzIHRvIGltcHJvdmUgcGVyZm9ybWFuY2VcIikpXHJcblx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+XHJcblx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdC5zZXRWYWx1ZShjb25maWcucGVyZm9ybWFuY2UuZW5hYmxlQ2FjaGluZylcclxuXHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRwbHVnaW4uc2V0dGluZ3MuZmlsZVNvdXJjZS5wZXJmb3JtYW5jZS5lbmFibGVDYWNoaW5nID1cclxuXHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRhd2FpdCBwbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0fSlcclxuXHRcdCk7XHJcblxyXG5cdC8vIE5vdGU6IFdvcmtlciBQcm9jZXNzaW5nIHNldHRpbmcgaGFzIGJlZW4gbW92ZWQgdG8gSW5kZXhTZXR0aW5nc1RhYi50cyA+IFBlcmZvcm1hbmNlIENvbmZpZ3VyYXRpb24gc2VjdGlvblxyXG5cdC8vIFRoaXMgYXZvaWRzIGR1cGxpY2F0aW9uIGFuZCBwcm92aWRlcyBjZW50cmFsaXplZCBjb250cm9sIGZvciBhbGwgd29ya2VyIHByb2Nlc3NpbmdcclxuXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiQ2FjaGUgVFRMXCIpKVxyXG5cdFx0LnNldERlc2MoXHJcblx0XHRcdHQoXHJcblx0XHRcdFx0XCJUaW1lLXRvLWxpdmUgZm9yIGNhY2hlZCByZXN1bHRzIGluIG1pbGxpc2Vjb25kcyAoZGVmYXVsdDogMzAwMDAwID0gNSBtaW51dGVzKVwiXHJcblx0XHRcdClcclxuXHRcdClcclxuXHRcdC5hZGRUZXh0KCh0ZXh0KSA9PlxyXG5cdFx0XHR0ZXh0XHJcblx0XHRcdFx0LnNldFBsYWNlaG9sZGVyKFwiMzAwMDAwXCIpXHJcblx0XHRcdFx0LnNldFZhbHVlKFN0cmluZyhjb25maWcucGVyZm9ybWFuY2UuY2FjaGVUVEwgfHwgMzAwMDAwKSlcclxuXHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRjb25zdCB0dGwgPSBwYXJzZUludCh2YWx1ZSkgfHwgMzAwMDAwO1xyXG5cdFx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLmZpbGVTb3VyY2UucGVyZm9ybWFuY2UuY2FjaGVUVEwgPSB0dGw7XHJcblx0XHRcdFx0XHRhd2FpdCBwbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0fSlcclxuXHRcdCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgYWR2YW5jZWQgc2VjdGlvblxyXG4gKi9cclxuZnVuY3Rpb24gY3JlYXRlQWR2YW5jZWRTZWN0aW9uKFxyXG5cdGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCxcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRjb25maWc6IEZpbGVTb3VyY2VDb25maWd1cmF0aW9uXHJcbik6IHZvaWQge1xyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKS5zZXRIZWFkaW5nKCkuc2V0TmFtZSh0KFwiQWR2YW5jZWRcIikpO1xyXG5cclxuXHQvLyBTdGF0aXN0aWNzIHNlY3Rpb25cclxuXHRjb25zdCBzdGF0c0NvbnRhaW5lciA9IGNvbnRhaW5lckVsLmNyZWF0ZURpdihcImZpbGUtc291cmNlLXN0YXRzXCIpO1xyXG5cdHN0YXRzQ29udGFpbmVyLmNyZWF0ZUVsKFwiaDVcIiwgeyB0ZXh0OiB0KFwiRmlsZSBUYXNrIFN0YXR1c1wiKSB9KTtcclxuXHJcblx0Y29uc3Qgc3RhdHVzVGV4dCA9IGNvbmZpZy5lbmFibGVkXHJcblx0XHQ/IHQoXCJGaWxlIFRhc2sgaXMgZW5hYmxlZCBhbmQgbW9uaXRvcmluZyBmaWxlc1wiKVxyXG5cdFx0OiB0KFwiRmlsZSBUYXNrIGlzIGRpc2FibGVkXCIpO1xyXG5cclxuXHRzdGF0c0NvbnRhaW5lci5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBzdGF0dXNUZXh0IH0pO1xyXG5cclxuXHRpZiAoY29uZmlnLmVuYWJsZWQpIHtcclxuXHRcdGNvbnN0IHN0cmF0ZWdpZXNUZXh0ID0gZ2V0RW5hYmxlZFN0cmF0ZWdpZXNUZXh0KGNvbmZpZyk7XHJcblx0XHRzdGF0c0NvbnRhaW5lci5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFwiQWN0aXZlIHN0cmF0ZWdpZXM6IFwiKSArIHN0cmF0ZWdpZXNUZXh0LFxyXG5cdFx0fSk7XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICogR2V0IHRleHQgZGVzY3JpcHRpb24gb2YgZW5hYmxlZCBzdHJhdGVnaWVzXHJcbiAqL1xyXG5mdW5jdGlvbiBnZXRFbmFibGVkU3RyYXRlZ2llc1RleHQoY29uZmlnOiBGaWxlU291cmNlQ29uZmlndXJhdGlvbik6IHN0cmluZyB7XHJcblx0Y29uc3QgZW5hYmxlZDogc3RyaW5nW10gPSBbXTtcclxuXHJcblx0aWYgKGNvbmZpZy5yZWNvZ25pdGlvblN0cmF0ZWdpZXMubWV0YWRhdGEuZW5hYmxlZClcclxuXHRcdGVuYWJsZWQucHVzaCh0KFwiTWV0YWRhdGFcIikpO1xyXG5cdGlmIChjb25maWcucmVjb2duaXRpb25TdHJhdGVnaWVzLnRhZ3MuZW5hYmxlZCkgZW5hYmxlZC5wdXNoKHQoXCJUYWdzXCIpKTtcclxuXHRpZiAoY29uZmlnLnJlY29nbml0aW9uU3RyYXRlZ2llcy50ZW1wbGF0ZXMuZW5hYmxlZClcclxuXHRcdGVuYWJsZWQucHVzaCh0KFwiVGVtcGxhdGVzXCIpKTtcclxuXHRpZiAoY29uZmlnLnJlY29nbml0aW9uU3RyYXRlZ2llcy5wYXRocy5lbmFibGVkKSBlbmFibGVkLnB1c2godChcIlBhdGhzXCIpKTtcclxuXHJcblx0cmV0dXJuIGVuYWJsZWQubGVuZ3RoID4gMCA/IGVuYWJsZWQuam9pbihcIiwgXCIpIDogdChcIk5vbmVcIik7XHJcbn1cclxuIl19