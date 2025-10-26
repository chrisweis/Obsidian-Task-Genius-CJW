import { Modal, Setting, Notice, setIcon, } from "obsidian";
import { t } from "@/translations/helper";
import { attachIconMenu } from "@/components/ui/menus/IconMenu";
import { ConfirmModal } from "@/components/ui/modals/ConfirmModal";
import { TaskFilterComponent, } from "@/components/features/task/filter/ViewTaskFilter";
export class ViewConfigModal extends Modal {
    constructor(app, plugin, initialViewConfig, // Null for creating
    initialFilterRule, // Null for creating
    onSave, sourceViewForCopy, // 新增：可选的源视图用于拷贝
    sourceViewIdentifierForCopy) {
        var _a, _b, _c;
        super(app);
        this.isCopyMode = false;
        this.sourceViewId = null;
        this.copySourceIdentifier = null;
        this.hasChanges = false;
        // Advanced filter component
        this.taskFilterComponent = null;
        this.advancedFilterContainer = null;
        this.filterChangeHandler = null;
        this.plugin = plugin;
        this.isCreate = initialViewConfig === null;
        const resolvedCopySource = sourceViewForCopy !== null && sourceViewForCopy !== void 0 ? sourceViewForCopy : (sourceViewIdentifierForCopy
            ? this.plugin.settings.viewConfiguration.find((view) => view.id === sourceViewIdentifierForCopy)
            : undefined);
        this.isCopyMode =
            sourceViewForCopy !== undefined ||
                sourceViewIdentifierForCopy !== undefined;
        this.sourceViewId =
            (_b = (_a = resolvedCopySource === null || resolvedCopySource === void 0 ? void 0 : resolvedCopySource.id) !== null && _a !== void 0 ? _a : sourceViewIdentifierForCopy) !== null && _b !== void 0 ? _b : null;
        this.copySourceIdentifier =
            (_c = sourceViewIdentifierForCopy !== null && sourceViewIdentifierForCopy !== void 0 ? sourceViewIdentifierForCopy : resolvedCopySource === null || resolvedCopySource === void 0 ? void 0 : resolvedCopySource.id) !== null && _c !== void 0 ? _c : null;
        if (this.isCreate) {
            const newId = `custom_${Date.now()}`;
            if (this.isCopyMode && resolvedCopySource) {
                // 拷贝模式：基于源视图创建新视图
                this.viewConfig = Object.assign(Object.assign({}, JSON.parse(JSON.stringify(resolvedCopySource))), { id: newId, name: t("Copy of ") + resolvedCopySource.name, type: "custom" });
                // Apply default region if not set (for backward compatibility)
                if (!this.viewConfig.region) {
                    const bottomViewIds = [
                        "habit",
                        "calendar",
                        "gantt",
                        "kanban",
                    ];
                    this.viewConfig.region = bottomViewIds.includes(resolvedCopySource.id)
                        ? "bottom"
                        : "top";
                }
                // 如果源视图有过滤规则，也拷贝过来
                this.viewFilterRule = resolvedCopySource.filterRules
                    ? JSON.parse(JSON.stringify(resolvedCopySource.filterRules))
                    : initialFilterRule || {};
            }
            else {
                // 普通创建模式
                this.viewConfig = {
                    id: newId,
                    name: t("New custom view"),
                    icon: "list-plus",
                    type: "custom",
                    visible: true,
                    hideCompletedAndAbandonedTasks: false,
                    filterBlanks: false,
                    sortCriteria: [],
                    region: "top", // Default new custom views to top
                };
                this.viewFilterRule = initialFilterRule || {}; // Start with empty rules or provided defaults
            }
        }
        else {
            // Deep copy to avoid modifying original objects until save
            this.viewConfig = JSON.parse(JSON.stringify(initialViewConfig));
            this.viewFilterRule = JSON.parse(JSON.stringify(initialFilterRule || {}));
            // Make sure sortCriteria exists
            if (!this.viewConfig.sortCriteria) {
                this.viewConfig.sortCriteria = [];
            }
            // Apply default region if not set (for backward compatibility)
            if (!this.viewConfig.region) {
                const bottomViewIds = ["habit", "calendar", "gantt", "kanban"];
                this.viewConfig.region = bottomViewIds.includes(this.viewConfig.id)
                    ? "bottom"
                    : "top";
            }
        }
        if (this.isCopyMode) {
            this.applyTwoColumnPresetIfNeeded(resolvedCopySource);
        }
        // Store original values for change detection
        this.originalViewConfig = JSON.stringify(this.viewConfig);
        this.originalViewFilterRule = JSON.stringify(this.viewFilterRule);
        this.onSave = onSave;
    }
    applyTwoColumnPresetIfNeeded(sourceConfig) {
        var _a, _b, _c;
        if (!this.isCopyMode) {
            return;
        }
        const hasTwoColumnConfig = ((_a = this.viewConfig.specificConfig) === null || _a === void 0 ? void 0 : _a.viewType) === "twocolumn";
        const preset = this.buildTwoColumnPreset((_c = (_b = this.copySourceIdentifier) !== null && _b !== void 0 ? _b : sourceConfig === null || sourceConfig === void 0 ? void 0 : sourceConfig.id) !== null && _c !== void 0 ? _c : null, sourceConfig);
        if (!preset) {
            return;
        }
        if (hasTwoColumnConfig) {
            // Already a two column view; ensure task property aligns with preset if missing
            const currentConfig = this.viewConfig.specificConfig;
            if (!currentConfig.taskPropertyKey) {
                currentConfig.taskPropertyKey = preset.taskPropertyKey;
            }
            return;
        }
        this.viewConfig.specificConfig = preset;
    }
    buildTwoColumnPreset(sourceIdentifier, sourceConfig) {
        var _a, _b;
        if (!sourceIdentifier && !sourceConfig) {
            return null;
        }
        const identifier = (_b = (_a = sourceIdentifier !== null && sourceIdentifier !== void 0 ? sourceIdentifier : sourceConfig === null || sourceConfig === void 0 ? void 0 : sourceConfig.id) !== null && _a !== void 0 ? _a : sourceConfig === null || sourceConfig === void 0 ? void 0 : sourceConfig.name) !== null && _b !== void 0 ? _b : null;
        if (!identifier) {
            return null;
        }
        const normalized = identifier.toLowerCase();
        let propertyKey = null;
        const directKey = normalized.startsWith("twocolumn:") ||
            normalized.startsWith("two-column:") ||
            normalized.startsWith("property:");
        if (directKey) {
            const [, rawKey] = normalized.split(":");
            if (rawKey) {
                propertyKey = rawKey;
            }
        }
        if (!propertyKey) {
            if (normalized.includes("tag")) {
                propertyKey = "tags";
            }
            else if (normalized.includes("review")) {
                propertyKey = "project";
            }
            else if (normalized.includes("project")) {
                propertyKey = "project";
            }
            else if (normalized.includes("context")) {
                propertyKey = "context";
            }
            else if (normalized.includes("priority")) {
                propertyKey = "priority";
            }
            else if (normalized.includes("status")) {
                propertyKey = "status";
            }
            else if (normalized.includes("due")) {
                propertyKey = "dueDate";
            }
            else if (normalized.includes("schedule")) {
                propertyKey = "scheduledDate";
            }
            else if (normalized.includes("start")) {
                propertyKey = "startDate";
            }
            else if (normalized.includes("file")) {
                propertyKey = "filePath";
            }
        }
        if (!propertyKey) {
            return null;
        }
        let leftColumnTitle = this.resolveLeftColumnTitle(propertyKey, normalized, sourceConfig);
        const rightColumnTitle = t("Tasks");
        let multiSelectText = t("selected items");
        let emptyStateText = t("No items selected");
        switch (propertyKey) {
            case "project":
                multiSelectText = t("projects selected");
                if (normalized.includes("review")) {
                    emptyStateText = t("Select a project to review its tasks.");
                    leftColumnTitle = t("Review Projects");
                }
                else {
                    emptyStateText = t("Select a project to see related tasks");
                    leftColumnTitle = t("Projects");
                }
                break;
            case "tags":
                leftColumnTitle = t("Tags");
                multiSelectText = t("tags selected");
                emptyStateText = t("Select a tag to see related tasks");
                break;
            case "context":
                leftColumnTitle = t("Contexts");
                break;
            case "priority":
                leftColumnTitle = t("Priority");
                break;
            case "status":
                leftColumnTitle = t("Status");
                break;
            case "dueDate":
                leftColumnTitle = t("Due Date");
                break;
            case "scheduledDate":
                leftColumnTitle = t("Scheduled Date");
                break;
            case "startDate":
                leftColumnTitle = t("Start Date");
                break;
            case "filePath":
                leftColumnTitle = t("Files");
                break;
        }
        return {
            viewType: "twocolumn",
            taskPropertyKey: propertyKey,
            leftColumnTitle,
            rightColumnDefaultTitle: rightColumnTitle,
            multiSelectText,
            emptyStateText,
        };
    }
    resolveLeftColumnTitle(propertyKey, normalizedIdentifier, sourceConfig) {
        if (propertyKey === "project" && normalizedIdentifier.includes("review")) {
            return t("Review Projects");
        }
        if (propertyKey === "project") {
            return t("Projects");
        }
        if (propertyKey === "tags") {
            return t("Tags");
        }
        if (propertyKey === "context") {
            return t("Contexts");
        }
        if (propertyKey === "priority") {
            return t("Priority");
        }
        if (propertyKey === "status") {
            return t("Status");
        }
        if (propertyKey === "dueDate") {
            return t("Due Date");
        }
        if (propertyKey === "scheduledDate") {
            return t("Scheduled Date");
        }
        if (propertyKey === "startDate") {
            return t("Start Date");
        }
        if (propertyKey === "filePath") {
            return t("Files");
        }
        if (sourceConfig === null || sourceConfig === void 0 ? void 0 : sourceConfig.name) {
            return sourceConfig.name;
        }
        return t("Items");
    }
    onOpen() {
        this.display();
    }
    display() {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const { contentEl } = this;
        contentEl.empty();
        this.modalEl.toggleClass("task-genius-view-config-modal", true);
        const days = [
            { value: -1, name: t("Locale Default") },
            {
                value: 0,
                name: new Intl.DateTimeFormat(window.navigator.language, {
                    weekday: "long",
                }).format(new Date(2024, 0, 7)),
            },
            {
                value: 1,
                name: new Intl.DateTimeFormat(window.navigator.language, {
                    weekday: "long",
                }).format(new Date(2024, 0, 8)),
            },
            {
                value: 2,
                name: new Intl.DateTimeFormat(window.navigator.language, {
                    weekday: "long",
                }).format(new Date(2024, 0, 9)),
            },
            {
                value: 3,
                name: new Intl.DateTimeFormat(window.navigator.language, {
                    weekday: "long",
                }).format(new Date(2024, 0, 10)),
            },
            {
                value: 4,
                name: new Intl.DateTimeFormat(window.navigator.language, {
                    weekday: "long",
                }).format(new Date(2024, 0, 11)),
            },
            {
                value: 5,
                name: new Intl.DateTimeFormat(window.navigator.language, {
                    weekday: "long",
                }).format(new Date(2024, 0, 12)),
            },
            {
                value: 6,
                name: new Intl.DateTimeFormat(window.navigator.language, {
                    weekday: "long",
                }).format(new Date(2024, 0, 13)),
            }, // Saturday (2024-01-13 is Saturday)
        ];
        // 设置标题，区分不同模式
        let title;
        if (this.isCreate) {
            if (this.isCopyMode) {
                title = t("Copy view: ") + (this.sourceViewId || "Unknown");
            }
            else {
                title = t("Create custom view");
            }
        }
        else {
            title = t("Edit view: ") + this.viewConfig.name;
        }
        this.titleEl.setText(title);
        // 在拷贝模式下显示源视图信息
        if (this.isCopyMode && this.sourceViewId) {
            const sourceViewConfig = this.plugin.settings.viewConfiguration.find((v) => v.id === this.sourceViewId);
            if (sourceViewConfig) {
                const infoEl = contentEl.createDiv({ cls: "copy-mode-info" });
                infoEl.createEl("p", {
                    text: t("Creating a copy based on: ") + sourceViewConfig.name,
                    cls: "setting-item-description",
                });
                infoEl.createEl("p", {
                    text: t("You can modify all settings below. The original view will remain unchanged."),
                    cls: "setting-item-description",
                });
            }
        }
        // --- Basic View Settings ---
        new Setting(contentEl).setName(t("View Name")).addText((text) => {
            this.nameInput = text;
            text.setValue(this.viewConfig.name).setPlaceholder(t("My Custom Task View"));
            text.onChange(() => this.checkForChanges());
        });
        new Setting(contentEl)
            .setName(t("Icon name"))
            .setDesc(t("Enter any Lucide icon name (e.g., list-checks, filter, inbox)"))
            .addText((text) => {
            text.inputEl.hide();
            this.iconInput = text;
            text.setValue(this.viewConfig.icon).setPlaceholder("list-plus");
            text.onChange(() => this.checkForChanges());
        })
            .addButton((btn) => {
            try {
                btn.setIcon(this.viewConfig.icon);
            }
            catch (e) {
                console.error("Error setting icon:", e);
            }
            attachIconMenu(btn, {
                containerEl: this.modalEl,
                plugin: this.plugin,
                onIconSelected: (iconId) => {
                    this.viewConfig.icon = iconId;
                    this.checkForChanges();
                    try {
                        setIcon(btn.buttonEl, iconId);
                    }
                    catch (e) {
                        console.error("Error setting icon:", e);
                    }
                    this.iconInput.setValue(iconId);
                },
            });
        });
        // Add Region setting for sidebar position
        // Default to 'bottom' for specific views for backward compatibility
        const bottomViewIds = ["habit", "calendar", "gantt", "kanban"];
        const defaultRegion = bottomViewIds.includes(this.viewConfig.id)
            ? "bottom"
            : "top";
        new Setting(contentEl)
            .setName(t("Sidebar Position"))
            .setDesc(t("Choose where this view appears in the sidebar. Views in the bottom section are visually separated from top section views."))
            .addDropdown((dropdown) => {
            dropdown
                .addOption("top", t("Top Section"))
                .addOption("bottom", t("Bottom Section"))
                .setValue(this.viewConfig.region || defaultRegion)
                .onChange((value) => {
                this.viewConfig.region = value;
                this.checkForChanges();
            });
        });
        // 检查是否为日历视图（原始ID或拷贝的日历视图）
        const isCalendarView = this.viewConfig.id === "calendar" ||
            (this.isCopyMode && this.sourceViewId === "calendar") ||
            ((_a = this.viewConfig.specificConfig) === null || _a === void 0 ? void 0 : _a.viewType) === "calendar";
        // 检查是否为看板视图（原始ID或拷贝的看板视图）
        const isKanbanView = this.viewConfig.id === "kanban" ||
            (this.isCopyMode && this.sourceViewId === "kanban") ||
            ((_b = this.viewConfig.specificConfig) === null || _b === void 0 ? void 0 : _b.viewType) === "kanban";
        // 检查是否为预测视图（原始ID或拷贝的预测视图）
        const isForecastView = this.viewConfig.id === "forecast" ||
            (this.isCopyMode && this.sourceViewId === "forecast") ||
            ((_c = this.viewConfig.specificConfig) === null || _c === void 0 ? void 0 : _c.viewType) === "forecast";
        // 检查是否为四象限视图（原始ID或拷贝的四象限视图）
        const isQuadrantView = this.viewConfig.id === "quadrant" ||
            (this.isCopyMode && this.sourceViewId === "quadrant") ||
            ((_d = this.viewConfig.specificConfig) === null || _d === void 0 ? void 0 : _d.viewType) === "quadrant";
        if (isCalendarView) {
            new Setting(contentEl)
                .setName(t("First day of week"))
                .setDesc(t("Overrides the locale default for calendar views."))
                .addDropdown((dropdown) => {
                var _a, _b;
                days.forEach((day) => {
                    dropdown.addOption(String(day.value), day.name);
                });
                let initialValue = -1; // Default to 'Locale Default'
                if (((_a = this.viewConfig.specificConfig) === null || _a === void 0 ? void 0 : _a.viewType) === "calendar") {
                    initialValue =
                        (_b = this.viewConfig
                            .specificConfig.firstDayOfWeek) !== null && _b !== void 0 ? _b : -1;
                }
                dropdown.setValue(String(initialValue));
                dropdown.onChange((value) => {
                    const numValue = parseInt(value);
                    const newFirstDayOfWeek = numValue === -1 ? undefined : numValue;
                    if (!this.viewConfig.specificConfig ||
                        this.viewConfig.specificConfig.viewType !==
                            "calendar") {
                        this.viewConfig.specificConfig = {
                            viewType: "calendar",
                            firstDayOfWeek: newFirstDayOfWeek,
                        };
                    }
                    else {
                        this.viewConfig
                            .specificConfig.firstDayOfWeek = newFirstDayOfWeek;
                    }
                    this.checkForChanges();
                });
            });
            // Add weekend hiding toggle for calendar view
            new Setting(contentEl)
                .setName(t("Hide weekends"))
                .setDesc(t("Hide weekend columns (Saturday and Sunday) in calendar views."))
                .addToggle((toggle) => {
                var _a, _b;
                const currentValue = (_b = (_a = this.viewConfig
                    .specificConfig) === null || _a === void 0 ? void 0 : _a.hideWeekends) !== null && _b !== void 0 ? _b : false;
                toggle.setValue(currentValue);
                toggle.onChange((value) => {
                    if (!this.viewConfig.specificConfig ||
                        this.viewConfig.specificConfig.viewType !==
                            "calendar") {
                        this.viewConfig.specificConfig = {
                            viewType: "calendar",
                            firstDayOfWeek: undefined,
                            hideWeekends: value,
                        };
                    }
                    else {
                        this.viewConfig
                            .specificConfig.hideWeekends = value;
                    }
                    this.checkForChanges();
                });
            });
        }
        else if (isKanbanView) {
            new Setting(contentEl)
                .setName(t("Group by"))
                .setDesc(t("Select which task property to use for creating columns"))
                .addDropdown((dropdown) => {
                var _a;
                dropdown
                    .addOption("status", t("Status"))
                    .addOption("priority", t("Priority"))
                    .addOption("tags", t("Tags"))
                    .addOption("project", t("Project"))
                    .addOption("dueDate", t("Due Date"))
                    .addOption("scheduledDate", t("Scheduled Date"))
                    .addOption("startDate", t("Start Date"))
                    .addOption("context", t("Context"))
                    .addOption("filePath", t("File Path"))
                    .setValue(((_a = this.viewConfig
                    .specificConfig) === null || _a === void 0 ? void 0 : _a.groupBy) || "status")
                    .onChange((value) => {
                    if (!this.viewConfig.specificConfig ||
                        this.viewConfig.specificConfig.viewType !==
                            "kanban") {
                        this.viewConfig.specificConfig = {
                            viewType: "kanban",
                            showCheckbox: true,
                            hideEmptyColumns: false,
                            defaultSortField: "priority",
                            defaultSortOrder: "desc",
                            groupBy: value,
                        };
                    }
                    else {
                        this.viewConfig
                            .specificConfig.groupBy = value;
                    }
                    this.checkForChanges();
                    // Refresh the modal to show/hide custom columns settings
                    this.display();
                });
            });
            new Setting(contentEl)
                .setName(t("Show checkbox"))
                .setDesc(t("Show a checkbox for each task in the kanban view."))
                .addToggle((toggle) => {
                var _a;
                toggle.setValue((_a = this.viewConfig.specificConfig) === null || _a === void 0 ? void 0 : _a.showCheckbox);
                toggle.onChange((value) => {
                    if (!this.viewConfig.specificConfig ||
                        this.viewConfig.specificConfig.viewType !== "kanban") {
                        this.viewConfig.specificConfig = {
                            viewType: "kanban",
                            showCheckbox: value,
                            hideEmptyColumns: false,
                            defaultSortField: "priority",
                            defaultSortOrder: "desc",
                            groupBy: "status",
                        };
                    }
                    else {
                        this.viewConfig
                            .specificConfig.showCheckbox = value;
                    }
                    this.checkForChanges();
                });
            });
            new Setting(contentEl)
                .setName(t("Hide empty columns"))
                .setDesc(t("Hide columns that have no tasks."))
                .addToggle((toggle) => {
                var _a;
                toggle.setValue((_a = this.viewConfig.specificConfig) === null || _a === void 0 ? void 0 : _a.hideEmptyColumns);
                toggle.onChange((value) => {
                    if (!this.viewConfig.specificConfig ||
                        this.viewConfig.specificConfig.viewType !== "kanban") {
                        this.viewConfig.specificConfig = {
                            viewType: "kanban",
                            showCheckbox: true,
                            hideEmptyColumns: value,
                            defaultSortField: "priority",
                            defaultSortOrder: "desc",
                            groupBy: "status",
                        };
                    }
                    else {
                        this.viewConfig
                            .specificConfig.hideEmptyColumns = value;
                    }
                    this.checkForChanges();
                });
            });
            new Setting(contentEl)
                .setName(t("Default sort field"))
                .setDesc(t("Default field to sort tasks by within each column."))
                .addDropdown((dropdown) => {
                var _a;
                dropdown
                    .addOption("priority", t("Priority"))
                    .addOption("dueDate", t("Due Date"))
                    .addOption("scheduledDate", t("Scheduled Date"))
                    .addOption("startDate", t("Start Date"))
                    .addOption("createdDate", t("Created Date"))
                    .setValue(((_a = this.viewConfig
                    .specificConfig) === null || _a === void 0 ? void 0 : _a.defaultSortField) || "priority")
                    .onChange((value) => {
                    if (!this.viewConfig.specificConfig ||
                        this.viewConfig.specificConfig.viewType !==
                            "kanban") {
                        this.viewConfig.specificConfig = {
                            viewType: "kanban",
                            showCheckbox: true,
                            hideEmptyColumns: false,
                            defaultSortField: value,
                            defaultSortOrder: "desc",
                            groupBy: "status",
                        };
                    }
                    else {
                        this.viewConfig
                            .specificConfig.defaultSortField = value;
                    }
                    this.checkForChanges();
                });
            });
            new Setting(contentEl)
                .setName(t("Default sort order"))
                .setDesc(t("Default order to sort tasks within each column."))
                .addDropdown((dropdown) => {
                var _a;
                dropdown
                    .addOption("asc", t("Ascending"))
                    .addOption("desc", t("Descending"))
                    .setValue(((_a = this.viewConfig
                    .specificConfig) === null || _a === void 0 ? void 0 : _a.defaultSortOrder) || "desc")
                    .onChange((value) => {
                    if (!this.viewConfig.specificConfig ||
                        this.viewConfig.specificConfig.viewType !==
                            "kanban") {
                        this.viewConfig.specificConfig = {
                            viewType: "kanban",
                            showCheckbox: true,
                            hideEmptyColumns: false,
                            defaultSortField: "priority",
                            defaultSortOrder: value,
                            groupBy: "status",
                        };
                    }
                    else {
                        this.viewConfig
                            .specificConfig.defaultSortOrder = value;
                    }
                    this.checkForChanges();
                });
            });
            // Custom columns configuration for non-status grouping
            const kanbanConfig = this.viewConfig
                .specificConfig;
            if ((kanbanConfig === null || kanbanConfig === void 0 ? void 0 : kanbanConfig.groupBy) && kanbanConfig.groupBy !== "status") {
                new Setting(contentEl)
                    .setName(t("Custom Columns"))
                    .setDesc(t("Configure custom columns for the selected grouping property"))
                    .setHeading();
                const columnsContainer = contentEl.createDiv({
                    cls: "kanban-columns-container",
                });
                const refreshColumnsList = () => {
                    columnsContainer.empty();
                    // Ensure customColumns exists
                    if (!kanbanConfig.customColumns) {
                        kanbanConfig.customColumns = [];
                    }
                    const columns = kanbanConfig.customColumns;
                    if (columns.length === 0) {
                        columnsContainer.createEl("p", {
                            text: t("No custom columns defined. Add columns below."),
                            cls: "setting-item-description",
                        });
                    }
                    columns.forEach((column, index) => {
                        const columnSetting = new Setting(columnsContainer)
                            .setClass("kanban-column-row")
                            .addText((text) => {
                            text.setValue(column.title)
                                .setPlaceholder(t("Column Title"))
                                .onChange((value) => {
                                if (kanbanConfig.customColumns) {
                                    kanbanConfig.customColumns[index].title = value;
                                    this.checkForChanges();
                                }
                            });
                        })
                            .addText((text) => {
                            var _a;
                            text.setValue(((_a = column.value) === null || _a === void 0 ? void 0 : _a.toString()) || "")
                                .setPlaceholder(t("Value"))
                                .onChange((value) => {
                                if (kanbanConfig.customColumns) {
                                    // Handle different value types based on groupBy
                                    let parsedValue = value;
                                    if (kanbanConfig.groupBy ===
                                        "priority" &&
                                        value) {
                                        const numValue = parseInt(value);
                                        parsedValue = isNaN(numValue)
                                            ? value
                                            : numValue;
                                    }
                                    kanbanConfig.customColumns[index].value = parsedValue;
                                    this.checkForChanges();
                                }
                            });
                        });
                        // Controls for reordering and deleting
                        columnSetting.addExtraButton((button) => {
                            button
                                .setIcon("arrow-up")
                                .setTooltip(t("Move Up"))
                                .setDisabled(index === 0)
                                .onClick(() => {
                                if (index > 0 &&
                                    kanbanConfig.customColumns) {
                                    const item = kanbanConfig.customColumns.splice(index, 1)[0];
                                    kanbanConfig.customColumns.splice(index - 1, 0, item);
                                    // Update order values
                                    kanbanConfig.customColumns.forEach((col, i) => {
                                        col.order = i;
                                    });
                                    this.checkForChanges();
                                    refreshColumnsList();
                                }
                            });
                        });
                        columnSetting.addExtraButton((button) => {
                            button
                                .setIcon("arrow-down")
                                .setTooltip(t("Move Down"))
                                .setDisabled(index === columns.length - 1)
                                .onClick(() => {
                                if (index < columns.length - 1 &&
                                    kanbanConfig.customColumns) {
                                    const item = kanbanConfig.customColumns.splice(index, 1)[0];
                                    kanbanConfig.customColumns.splice(index + 1, 0, item);
                                    // Update order values
                                    kanbanConfig.customColumns.forEach((col, i) => {
                                        col.order = i;
                                    });
                                    this.checkForChanges();
                                    refreshColumnsList();
                                }
                            });
                        });
                        columnSetting.addExtraButton((button) => {
                            button
                                .setIcon("trash")
                                .setTooltip(t("Remove Column"))
                                .onClick(() => {
                                if (kanbanConfig.customColumns) {
                                    kanbanConfig.customColumns.splice(index, 1);
                                    // Update order values
                                    kanbanConfig.customColumns.forEach((col, i) => {
                                        col.order = i;
                                    });
                                    this.checkForChanges();
                                    refreshColumnsList();
                                }
                            });
                            button.extraSettingsEl.addClass("mod-warning");
                        });
                    });
                    // Button to add a new column
                    new Setting(columnsContainer)
                        .addButton((button) => {
                        button
                            .setButtonText(t("Add Column"))
                            .setCta()
                            .onClick(() => {
                            if (!kanbanConfig.customColumns) {
                                kanbanConfig.customColumns = [];
                            }
                            const newColumn = {
                                id: `column_${Date.now()}`,
                                title: t("New Column"),
                                value: "",
                                order: kanbanConfig.customColumns
                                    .length,
                            };
                            kanbanConfig.customColumns.push(newColumn);
                            this.checkForChanges();
                            refreshColumnsList();
                        });
                    })
                        .addButton((button) => {
                        button
                            .setButtonText(t("Reset Columns"))
                            .onClick(() => {
                            if (kanbanConfig.customColumns) {
                                kanbanConfig.customColumns = [];
                                this.checkForChanges();
                                refreshColumnsList();
                            }
                        });
                    });
                };
                refreshColumnsList();
            }
        }
        else if (isForecastView) {
            new Setting(contentEl)
                .setName(t("First day of week"))
                .setDesc(t("Overrides the locale default for forecast views."))
                .addDropdown((dropdown) => {
                var _a, _b;
                days.forEach((day) => {
                    dropdown.addOption(String(day.value), day.name);
                });
                let initialValue = -1; // Default to 'Locale Default'
                if (((_a = this.viewConfig.specificConfig) === null || _a === void 0 ? void 0 : _a.viewType) === "forecast") {
                    initialValue =
                        (_b = this.viewConfig
                            .specificConfig.firstDayOfWeek) !== null && _b !== void 0 ? _b : -1;
                }
                dropdown.setValue(String(initialValue));
                dropdown.onChange((value) => {
                    const numValue = parseInt(value);
                    const newFirstDayOfWeek = numValue === -1 ? undefined : numValue;
                    if (!this.viewConfig.specificConfig ||
                        this.viewConfig.specificConfig.viewType !==
                            "forecast") {
                        this.viewConfig.specificConfig = {
                            viewType: "forecast",
                            firstDayOfWeek: newFirstDayOfWeek,
                        };
                    }
                    else {
                        this.viewConfig
                            .specificConfig.firstDayOfWeek = newFirstDayOfWeek;
                    }
                    this.checkForChanges();
                });
            });
            // Add weekend hiding toggle for forecast view
            new Setting(contentEl)
                .setName(t("Hide weekends"))
                .setDesc(t("Hide weekend columns (Saturday and Sunday) in forecast calendar."))
                .addToggle((toggle) => {
                var _a, _b;
                const currentValue = (_b = (_a = this.viewConfig
                    .specificConfig) === null || _a === void 0 ? void 0 : _a.hideWeekends) !== null && _b !== void 0 ? _b : false;
                toggle.setValue(currentValue);
                toggle.onChange((value) => {
                    if (!this.viewConfig.specificConfig ||
                        this.viewConfig.specificConfig.viewType !==
                            "forecast") {
                        this.viewConfig.specificConfig = {
                            viewType: "forecast",
                            firstDayOfWeek: undefined,
                            hideWeekends: value,
                        };
                    }
                    else {
                        this.viewConfig
                            .specificConfig.hideWeekends = value;
                    }
                    this.checkForChanges();
                });
            });
        }
        else if (isQuadrantView) {
            new Setting(contentEl)
                .setName(t("Quadrant Classification Method"))
                .setDesc(t("Choose how to classify tasks into quadrants"))
                .addToggle((toggle) => {
                var _a, _b;
                const currentValue = (_b = (_a = this.viewConfig
                    .specificConfig) === null || _a === void 0 ? void 0 : _a.usePriorityForClassification) !== null && _b !== void 0 ? _b : false;
                toggle.setValue(currentValue);
                toggle.onChange((value) => {
                    if (!this.viewConfig.specificConfig ||
                        this.viewConfig.specificConfig.viewType !==
                            "quadrant") {
                        this.viewConfig.specificConfig = {
                            viewType: "quadrant",
                            hideEmptyQuadrants: false,
                            autoUpdatePriority: true,
                            autoUpdateTags: true,
                            showTaskCount: true,
                            defaultSortField: "priority",
                            defaultSortOrder: "desc",
                            urgentTag: "#urgent",
                            importantTag: "#important",
                            urgentThresholdDays: 3,
                            usePriorityForClassification: value,
                            urgentPriorityThreshold: 4,
                            importantPriorityThreshold: 3,
                            customQuadrantColors: false,
                            quadrantColors: {
                                urgentImportant: "#dc3545",
                                notUrgentImportant: "#28a745",
                                urgentNotImportant: "#ffc107",
                                notUrgentNotImportant: "#6c757d",
                            },
                        };
                    }
                    else {
                        this.viewConfig
                            .specificConfig.usePriorityForClassification = value;
                    }
                    this.checkForChanges();
                    // Refresh the modal to show/hide relevant settings
                    this.display();
                });
            });
            const quadrantConfig = this.viewConfig
                .specificConfig;
            const usePriorityClassification = (_e = quadrantConfig === null || quadrantConfig === void 0 ? void 0 : quadrantConfig.usePriorityForClassification) !== null && _e !== void 0 ? _e : false;
            if (usePriorityClassification) {
                // Priority-based classification settings
                new Setting(contentEl)
                    .setName(t("Urgent Priority Threshold"))
                    .setDesc(t("Tasks with priority >= this value are considered urgent (1-5)"))
                    .addSlider((slider) => {
                    var _a;
                    slider
                        .setLimits(1, 5, 1)
                        .setValue((_a = quadrantConfig === null || quadrantConfig === void 0 ? void 0 : quadrantConfig.urgentPriorityThreshold) !== null && _a !== void 0 ? _a : 4)
                        .setDynamicTooltip()
                        .onChange((value) => {
                        var _a;
                        if (((_a = this.viewConfig.specificConfig) === null || _a === void 0 ? void 0 : _a.viewType) ===
                            "quadrant") {
                            this.viewConfig
                                .specificConfig.urgentPriorityThreshold = value;
                            this.checkForChanges();
                        }
                    });
                });
                new Setting(contentEl)
                    .setName(t("Important Priority Threshold"))
                    .setDesc(t("Tasks with priority >= this value are considered important (1-5)"))
                    .addSlider((slider) => {
                    var _a;
                    slider
                        .setLimits(1, 5, 1)
                        .setValue((_a = quadrantConfig === null || quadrantConfig === void 0 ? void 0 : quadrantConfig.importantPriorityThreshold) !== null && _a !== void 0 ? _a : 3)
                        .setDynamicTooltip()
                        .onChange((value) => {
                        var _a;
                        if (((_a = this.viewConfig.specificConfig) === null || _a === void 0 ? void 0 : _a.viewType) ===
                            "quadrant") {
                            this.viewConfig
                                .specificConfig.importantPriorityThreshold = value;
                            this.checkForChanges();
                        }
                    });
                });
            }
            else {
                // Tag-based classification settings
                new Setting(contentEl)
                    .setName(t("Urgent Tag"))
                    .setDesc(t("Tag to identify urgent tasks (e.g., #urgent, #fire)"))
                    .addText((text) => {
                    var _a;
                    text.setValue((_a = quadrantConfig === null || quadrantConfig === void 0 ? void 0 : quadrantConfig.urgentTag) !== null && _a !== void 0 ? _a : "#urgent")
                        .setPlaceholder("#urgent")
                        .onChange((value) => {
                        var _a;
                        if (((_a = this.viewConfig.specificConfig) === null || _a === void 0 ? void 0 : _a.viewType) ===
                            "quadrant") {
                            this.viewConfig
                                .specificConfig.urgentTag = value;
                            this.checkForChanges();
                        }
                    });
                });
                new Setting(contentEl)
                    .setName(t("Important Tag"))
                    .setDesc(t("Tag to identify important tasks (e.g., #important, #key)"))
                    .addText((text) => {
                    var _a;
                    text.setValue((_a = quadrantConfig === null || quadrantConfig === void 0 ? void 0 : quadrantConfig.importantTag) !== null && _a !== void 0 ? _a : "#important")
                        .setPlaceholder("#important")
                        .onChange((value) => {
                        var _a;
                        if (((_a = this.viewConfig.specificConfig) === null || _a === void 0 ? void 0 : _a.viewType) ===
                            "quadrant") {
                            this.viewConfig
                                .specificConfig.importantTag = value;
                            this.checkForChanges();
                        }
                    });
                });
                new Setting(contentEl)
                    .setName(t("Urgent Threshold Days"))
                    .setDesc(t("Tasks due within this many days are considered urgent"))
                    .addSlider((slider) => {
                    var _a;
                    slider
                        .setLimits(1, 14, 1)
                        .setValue((_a = quadrantConfig === null || quadrantConfig === void 0 ? void 0 : quadrantConfig.urgentThresholdDays) !== null && _a !== void 0 ? _a : 3)
                        .setDynamicTooltip()
                        .onChange((value) => {
                        var _a;
                        if (((_a = this.viewConfig.specificConfig) === null || _a === void 0 ? void 0 : _a.viewType) ===
                            "quadrant") {
                            this.viewConfig
                                .specificConfig.urgentThresholdDays = value;
                            this.checkForChanges();
                        }
                    });
                });
            }
            // Common quadrant settings
            new Setting(contentEl)
                .setName(t("Auto Update Priority"))
                .setDesc(t("Automatically update task priority when moved between quadrants"))
                .addToggle((toggle) => {
                var _a;
                toggle
                    .setValue((_a = quadrantConfig === null || quadrantConfig === void 0 ? void 0 : quadrantConfig.autoUpdatePriority) !== null && _a !== void 0 ? _a : true)
                    .onChange((value) => {
                    var _a;
                    if (((_a = this.viewConfig.specificConfig) === null || _a === void 0 ? void 0 : _a.viewType) ===
                        "quadrant") {
                        this.viewConfig
                            .specificConfig.autoUpdatePriority = value;
                        this.checkForChanges();
                    }
                });
            });
            new Setting(contentEl)
                .setName(t("Auto Update Tags"))
                .setDesc(t("Automatically add/remove urgent/important tags when moved between quadrants"))
                .addToggle((toggle) => {
                var _a;
                toggle
                    .setValue((_a = quadrantConfig === null || quadrantConfig === void 0 ? void 0 : quadrantConfig.autoUpdateTags) !== null && _a !== void 0 ? _a : true)
                    .onChange((value) => {
                    var _a;
                    if (((_a = this.viewConfig.specificConfig) === null || _a === void 0 ? void 0 : _a.viewType) ===
                        "quadrant") {
                        this.viewConfig
                            .specificConfig.autoUpdateTags = value;
                        this.checkForChanges();
                    }
                });
            });
            new Setting(contentEl)
                .setName(t("Hide Empty Quadrants"))
                .setDesc(t("Hide quadrants that have no tasks"))
                .addToggle((toggle) => {
                var _a;
                toggle
                    .setValue((_a = quadrantConfig === null || quadrantConfig === void 0 ? void 0 : quadrantConfig.hideEmptyQuadrants) !== null && _a !== void 0 ? _a : false)
                    .onChange((value) => {
                    var _a;
                    if (((_a = this.viewConfig.specificConfig) === null || _a === void 0 ? void 0 : _a.viewType) ===
                        "quadrant") {
                        this.viewConfig
                            .specificConfig.hideEmptyQuadrants = value;
                        this.checkForChanges();
                    }
                });
            });
        }
        // Two Column View specific config
        if (this.isCreate ||
            ((_f = this.viewConfig.specificConfig) === null || _f === void 0 ? void 0 : _f.viewType) === "twocolumn" ||
            this.viewConfig.type === "custom" // 自定义视图总是可以切换布局
        ) {
            // For custom views, allow changing view type even in edit mode
            // 对于自定义视图，编辑模式下也允许切换视图类型
            if ((this.isCreate && !this.isCopyMode) ||
                this.viewConfig.type === "custom") {
                new Setting(contentEl)
                    .setName(t("View type"))
                    .setDesc(t("Select the type of view to create"))
                    .addDropdown((dropdown) => {
                    var _a;
                    dropdown
                        .addOption("standard", t("Standard view"))
                        .addOption("twocolumn", t("Two column view"))
                        .setValue(((_a = this.viewConfig.specificConfig) === null || _a === void 0 ? void 0 : _a.viewType) ===
                        "twocolumn"
                        ? "twocolumn"
                        : "standard")
                        .onChange((value) => {
                        if (value === "twocolumn") {
                            // Create a new TwoColumnSpecificConfig
                            this.viewConfig.specificConfig = {
                                viewType: "twocolumn",
                                taskPropertyKey: "tags",
                                leftColumnTitle: t("Items"),
                                rightColumnDefaultTitle: t("Tasks"),
                                multiSelectText: t("selected items"),
                                emptyStateText: t("No items selected"),
                            };
                        }
                        else {
                            // Remove specificConfig if not needed
                            delete this.viewConfig.specificConfig;
                        }
                        this.checkForChanges();
                        // Refresh the modal to show/hide the two column specific settings
                        this.display();
                    });
                });
            }
            // Only show TwoColumn specific settings if the view type is twocolumn
            if (((_g = this.viewConfig.specificConfig) === null || _g === void 0 ? void 0 : _g.viewType) === "twocolumn") {
                new Setting(contentEl)
                    .setName(t("Two column view settings"))
                    .setHeading();
                // Task Property Key selector
                new Setting(contentEl)
                    .setName(t("Group by task property"))
                    .setDesc(t("Select which task property to use for left column grouping"))
                    .addDropdown((dropdown) => {
                    dropdown
                        .addOption("tags", t("Tags"))
                        .addOption("project", t("Project"))
                        .addOption("priority", t("Priority"))
                        .addOption("context", t("Context"))
                        .addOption("status", t("Status"))
                        .addOption("dueDate", t("Due Date"))
                        .addOption("scheduledDate", t("Scheduled Date"))
                        .addOption("startDate", t("Start Date"))
                        .addOption("filePath", t("File Path"))
                        .setValue(this.viewConfig
                        .specificConfig.taskPropertyKey || "tags")
                        .onChange((value) => {
                        var _a;
                        if (((_a = this.viewConfig.specificConfig) === null || _a === void 0 ? void 0 : _a.viewType) ===
                            "twocolumn") {
                            this.viewConfig
                                .specificConfig.taskPropertyKey = value;
                            // Set appropriate default titles based on the selected property
                            if (!this.leftColumnTitleInput.getValue()) {
                                let title = t("Items");
                                switch (value) {
                                    case "tags":
                                        title = t("Tags");
                                        break;
                                    case "project":
                                        title = t("Projects");
                                        break;
                                    case "priority":
                                        title = t("Priorities");
                                        break;
                                    case "context":
                                        title = t("Contexts");
                                        break;
                                    case "status":
                                        title = t("Status");
                                        break;
                                    case "dueDate":
                                        title = t("Due Dates");
                                        break;
                                    case "scheduledDate":
                                        title = t("Scheduled Dates");
                                        break;
                                    case "startDate":
                                        title = t("Start Dates");
                                        break;
                                    case "filePath":
                                        title = t("Files");
                                        break;
                                }
                                this.leftColumnTitleInput.setValue(title);
                                this.viewConfig
                                    .specificConfig.leftColumnTitle = title;
                            }
                            this.checkForChanges();
                        }
                    });
                });
                // Left Column Title
                new Setting(contentEl)
                    .setName(t("Left column title"))
                    .setDesc(t("Title for the left column (items list)"))
                    .addText((text) => {
                    this.leftColumnTitleInput = text;
                    text.setValue(this.viewConfig
                        .specificConfig.leftColumnTitle || t("Items"));
                    text.onChange((value) => {
                        var _a;
                        if (((_a = this.viewConfig.specificConfig) === null || _a === void 0 ? void 0 : _a.viewType) ===
                            "twocolumn") {
                            this.viewConfig
                                .specificConfig.leftColumnTitle = value;
                            this.checkForChanges();
                        }
                    });
                });
                // Right Column Title
                new Setting(contentEl)
                    .setName(t("Right column title"))
                    .setDesc(t("Default title for the right column (tasks list)"))
                    .addText((text) => {
                    this.rightColumnTitleInput = text;
                    text.setValue(this.viewConfig
                        .specificConfig.rightColumnDefaultTitle || t("Tasks"));
                    text.onChange((value) => {
                        var _a;
                        if (((_a = this.viewConfig.specificConfig) === null || _a === void 0 ? void 0 : _a.viewType) ===
                            "twocolumn") {
                            this.viewConfig
                                .specificConfig.rightColumnDefaultTitle = value;
                            this.checkForChanges();
                        }
                    });
                });
                // Multi-select Text
                new Setting(contentEl)
                    .setName(t("Multi-select Text"))
                    .setDesc(t("Text to show when multiple items are selected"))
                    .addText((text) => {
                    this.multiSelectTextInput = text;
                    text.setValue(this.viewConfig
                        .specificConfig.multiSelectText || t("selected items"));
                    text.onChange((value) => {
                        var _a;
                        if (((_a = this.viewConfig.specificConfig) === null || _a === void 0 ? void 0 : _a.viewType) ===
                            "twocolumn") {
                            this.viewConfig
                                .specificConfig.multiSelectText = value;
                            this.checkForChanges();
                        }
                    });
                });
                // Empty State Text
                new Setting(contentEl)
                    .setName(t("Empty state text"))
                    .setDesc(t("Text to show when no items are selected"))
                    .addText((text) => {
                    this.emptyStateTextInput = text;
                    text.setValue(this.viewConfig
                        .specificConfig.emptyStateText || t("No items selected"));
                    text.onChange((value) => {
                        var _a;
                        if (((_a = this.viewConfig.specificConfig) === null || _a === void 0 ? void 0 : _a.viewType) ===
                            "twocolumn") {
                            this.viewConfig
                                .specificConfig.emptyStateText = value;
                            this.checkForChanges();
                        }
                    });
                });
            }
        }
        // --- Filter Rules ---
        new Setting(contentEl).setName(t("Filter Rules")).setHeading();
        new Setting(contentEl)
            .setName(t("Hide completed and abandoned tasks"))
            .setDesc(t("Hide completed and abandoned tasks in this view."))
            .addToggle((toggle) => {
            toggle.setValue(this.viewConfig.hideCompletedAndAbandonedTasks);
            toggle.onChange((value) => {
                this.viewConfig.hideCompletedAndAbandonedTasks = value;
                this.checkForChanges();
            });
        });
        new Setting(contentEl)
            .setName(t("Filter blanks"))
            .setDesc(t("Filter out blank tasks in this view."))
            .addToggle((toggle) => {
            toggle.setValue(this.viewConfig.filterBlanks);
            toggle.onChange((value) => {
                this.viewConfig.filterBlanks = value;
                this.checkForChanges();
            });
        });
        // --- Advanced Filter Section ---
        new Setting(contentEl)
            .setName(t("Advanced Filtering"))
            .setDesc(t("Use advanced multi-group filtering with complex conditions"))
            .addToggle((toggle) => {
            const hasAdvancedFilter = !!this.viewFilterRule.advancedFilter;
            console.log("Initial advanced filter state:", hasAdvancedFilter, this.viewFilterRule.advancedFilter);
            toggle.setValue(hasAdvancedFilter);
            toggle.onChange((value) => {
                console.log("Advanced filter toggle changed to:", value);
                if (value) {
                    // Enable advanced filtering
                    if (!this.viewFilterRule.advancedFilter) {
                        this.viewFilterRule.advancedFilter = {
                            rootCondition: "any",
                            filterGroups: [],
                        };
                        console.log("Created new advanced filter:", this.viewFilterRule.advancedFilter);
                    }
                    this.setupAdvancedFilter();
                }
                else {
                    // Disable advanced filtering
                    console.log("Disabling advanced filter");
                    delete this.viewFilterRule.advancedFilter;
                    this.cleanupAdvancedFilter();
                }
                this.checkForChanges();
            });
        });
        // Container for advanced filter component
        this.advancedFilterContainer = contentEl.createDiv({
            cls: "advanced-filter-container",
        });
        // Initialize advanced filter if it exists
        if (this.viewFilterRule.advancedFilter) {
            this.setupAdvancedFilter();
        }
        else {
            // Hide the container initially if no advanced filter
            this.advancedFilterContainer.style.display = "none";
        }
        if (!["kanban", "gantt", "calendar"].includes(((_h = this.viewConfig.specificConfig) === null || _h === void 0 ? void 0 : _h.viewType) || "")) {
            new Setting(contentEl)
                .setName(t("Sort Criteria"))
                .setDesc(t("Define the order in which tasks should be sorted. Criteria are applied sequentially."))
                .setHeading();
            const criteriaContainer = contentEl.createDiv({
                cls: "sort-criteria-container",
            });
            const refreshCriteriaList = () => {
                criteriaContainer.empty();
                // Ensure viewConfig.sortCriteria exists
                if (!this.viewConfig.sortCriteria) {
                    this.viewConfig.sortCriteria = [];
                }
                const criteria = this.viewConfig.sortCriteria;
                if (criteria.length === 0) {
                    criteriaContainer.createEl("p", {
                        text: t("No sort criteria defined. Add criteria below."),
                        cls: "setting-item-description",
                    });
                }
                criteria.forEach((criterion, index) => {
                    const criterionSetting = new Setting(criteriaContainer)
                        .setClass("sort-criterion-row")
                        .addDropdown((dropdown) => {
                        dropdown
                            .addOption("status", t("Status"))
                            .addOption("priority", t("Priority"))
                            .addOption("dueDate", t("Due Date"))
                            .addOption("startDate", t("Start Date"))
                            .addOption("scheduledDate", t("Scheduled Date"))
                            .addOption("content", t("Content"))
                            .setValue(criterion.field)
                            .onChange((value) => {
                            if (this.viewConfig.sortCriteria) {
                                this.viewConfig.sortCriteria[index].field = value;
                                this.checkForChanges();
                            }
                        });
                    })
                        .addDropdown((dropdown) => {
                        dropdown
                            .addOption("asc", t("Ascending"))
                            .addOption("desc", t("Descending"))
                            .setValue(criterion.order)
                            .onChange((value) => {
                            if (this.viewConfig.sortCriteria) {
                                this.viewConfig.sortCriteria[index].order = value;
                                this.checkForChanges();
                            }
                        });
                        // Add tooltips explaining what asc/desc means for each field type if possible
                        if (criterion.field === "priority") {
                            dropdown.selectEl.title = t("Ascending: High -> Low -> None. Descending: None -> Low -> High");
                        }
                        else if ([
                            "dueDate",
                            "startDate",
                            "scheduledDate",
                        ].includes(criterion.field)) {
                            dropdown.selectEl.title = t("Ascending: Earlier -> Later -> None. Descending: None -> Later -> Earlier");
                        }
                        else if (criterion.field === "status") {
                            dropdown.selectEl.title = t("Ascending respects status order (Overdue first). Descending reverses it.");
                        }
                        else {
                            dropdown.selectEl.title = t("Ascending: A-Z. Descending: Z-A");
                        }
                    });
                    // Controls for reordering and deleting
                    criterionSetting.addExtraButton((button) => {
                        button
                            .setIcon("arrow-up")
                            .setTooltip(t("Move Up"))
                            .setDisabled(index === 0)
                            .onClick(() => {
                            if (index > 0 && this.viewConfig.sortCriteria) {
                                const item = this.viewConfig.sortCriteria.splice(index, 1)[0];
                                this.viewConfig.sortCriteria.splice(index - 1, 0, item);
                                this.checkForChanges();
                                refreshCriteriaList();
                            }
                        });
                    });
                    criterionSetting.addExtraButton((button) => {
                        button
                            .setIcon("arrow-down")
                            .setTooltip(t("Move Down"))
                            .setDisabled(index === criteria.length - 1)
                            .onClick(() => {
                            if (index < criteria.length - 1 &&
                                this.viewConfig.sortCriteria) {
                                const item = this.viewConfig.sortCriteria.splice(index, 1)[0];
                                this.viewConfig.sortCriteria.splice(index + 1, 0, item);
                                this.checkForChanges();
                                refreshCriteriaList();
                            }
                        });
                    });
                    criterionSetting.addExtraButton((button) => {
                        button
                            .setIcon("trash")
                            .setTooltip(t("Remove Criterion"))
                            .onClick(() => {
                            if (this.viewConfig.sortCriteria) {
                                this.viewConfig.sortCriteria.splice(index, 1);
                                this.checkForChanges();
                                refreshCriteriaList();
                            }
                        });
                        // Add class to the container element of the extra button
                        button.extraSettingsEl.addClass("mod-warning");
                    });
                });
                // Button to add a new criterion
                new Setting(criteriaContainer)
                    .addButton((button) => {
                    button
                        .setButtonText(t("Add Sort Criterion"))
                        .setCta()
                        .onClick(() => {
                        const newCriterion = {
                            field: "status",
                            order: "asc",
                        };
                        if (!this.viewConfig.sortCriteria) {
                            this.viewConfig.sortCriteria = [];
                        }
                        this.viewConfig.sortCriteria.push(newCriterion);
                        this.checkForChanges();
                        refreshCriteriaList();
                    });
                })
                    .addButton((button) => {
                    // Button to reset to defaults
                    button
                        .setButtonText(t("Reset to Defaults"))
                        .onClick(() => {
                        // Optional: Add confirmation dialog here
                        this.viewConfig.sortCriteria = []; // Use spread to copy
                        this.checkForChanges();
                        refreshCriteriaList();
                    });
                });
            };
            refreshCriteriaList();
        }
        // --- First Day of Week ---
        // --- Action Buttons ---
        new Setting(contentEl)
            .addButton((button) => {
            button
                .setButtonText(t("Save"))
                .setCta()
                .onClick(() => {
                this.saveChanges();
            });
        })
            .addButton((button) => {
            button.setButtonText(t("Cancel")).onClick(() => {
                this.close();
            });
        });
    }
    parseStringToArray(input) {
        if (!input || input.trim() === "")
            return [];
        return input
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s !== "");
    }
    checkForChanges() {
        const currentConfig = JSON.stringify(this.viewConfig);
        const currentFilterRule = JSON.stringify(this.getCurrentFilterRule());
        this.hasChanges =
            currentConfig !== this.originalViewConfig ||
                currentFilterRule !== this.originalViewFilterRule;
    }
    getCurrentFilterRule() {
        const rules = {};
        // Get advanced filter state if available
        if (this.taskFilterComponent) {
            try {
                const currentFilterState = this.taskFilterComponent.getFilterState();
                if (currentFilterState &&
                    currentFilterState.filterGroups.length > 0) {
                    rules.advancedFilter = currentFilterState;
                }
            }
            catch (error) {
                console.warn("Error getting current filter state:", error);
            }
        }
        else if (this.viewFilterRule.advancedFilter) {
            // Preserve existing advanced filter if component is not loaded
            rules.advancedFilter = this.viewFilterRule.advancedFilter;
        }
        return rules;
    }
    saveChanges() {
        // Update viewConfig
        this.viewConfig.name =
            this.nameInput.getValue().trim() || t("Unnamed View");
        this.viewConfig.icon = this.iconInput.getValue().trim() || "list";
        // Update viewFilterRule
        this.viewFilterRule = this.getCurrentFilterRule();
        // Reset change tracking state
        this.originalViewConfig = JSON.stringify(this.viewConfig);
        this.originalViewFilterRule = JSON.stringify(this.viewFilterRule);
        this.hasChanges = false;
        // Call the onSave callback
        this.onSave(this.viewConfig, this.viewFilterRule);
        this.close();
        new Notice(t("View configuration saved."));
    }
    close() {
        if (this.hasChanges) {
            new ConfirmModal(this.plugin, {
                title: t("Unsaved Changes"),
                message: t("You have unsaved changes. Save before closing?"),
                confirmText: t("Save"),
                cancelText: t("Cancel"),
                onConfirm: (confirmed) => {
                    if (confirmed) {
                        this.saveChanges();
                        return;
                    }
                    super.close();
                },
            }).open();
        }
        else {
            super.close();
        }
    }
    onClose() {
        // Clean up the advanced filter component
        this.cleanupAdvancedFilter();
        const { contentEl } = this;
        contentEl.empty();
    }
    // 添加saveSettingsUpdate方法
    saveSettingsUpdate() {
        this.checkForChanges();
    }
    setupAdvancedFilter() {
        if (!this.advancedFilterContainer)
            return;
        console.log("Setting up advanced filter...");
        // Clean up existing component if any
        this.cleanupAdvancedFilter();
        // Create the TaskFilterComponent with view-config leafId to prevent affecting live filters
        this.taskFilterComponent = new TaskFilterComponent(this.advancedFilterContainer, this.app, `view-config-${this.viewConfig.id}`, // 使用 view-config- 前缀确保不影响实时筛选器
        this.plugin);
        console.log("TaskFilterComponent created:", this.taskFilterComponent);
        // 保存现有的过滤器状态
        const existingFilterState = this.viewFilterRule.advancedFilter
            ? JSON.parse(JSON.stringify(this.viewFilterRule.advancedFilter))
            : {
                rootCondition: "any",
                filterGroups: [],
            };
        console.log("Filter state for view config:", existingFilterState);
        // 预先保存空的筛选器状态到localStorage，防止加载意外的状态
        this.app.saveLocalStorage(`task-genius-view-filter-view-config-${this.viewConfig.id}`, existingFilterState);
        // 手动调用 onload
        this.taskFilterComponent.onload();
        console.log("TaskFilterComponent onload called");
        // 立即加载视图配置的过滤器状态
        console.log("Loading view config filter state:", existingFilterState);
        this.taskFilterComponent.loadFilterState(existingFilterState);
        // Set up event listener for filter changes
        this.filterChangeHandler = (filterState, leafId) => {
            // 只处理来自当前ViewConfig筛选器的变化
            if (this.taskFilterComponent &&
                leafId === `view-config-${this.viewConfig.id}`) {
                console.log("Filter changed in view config modal:", filterState);
                this.viewFilterRule.advancedFilter = filterState;
                this.checkForChanges();
            }
        };
        this.app.workspace.on("task-genius:filter-changed", this.filterChangeHandler);
        // Show the container
        this.advancedFilterContainer.style.display = "block";
        console.log("Advanced filter container should now be visible");
    }
    cleanupAdvancedFilter() {
        if (this.taskFilterComponent) {
            try {
                // Manually unload the component
                this.taskFilterComponent.onunload();
            }
            catch (error) {
                console.warn("Error unloading task filter component:", error);
            }
            this.taskFilterComponent = null;
        }
        if (this.advancedFilterContainer) {
            this.advancedFilterContainer.empty();
            this.advancedFilterContainer.style.display = "none";
        }
        if (this.filterChangeHandler) {
            this.app.workspace.off("task-genius:filter-changed", this.filterChangeHandler);
            this.filterChangeHandler = null;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVmlld0NvbmZpZ01vZGFsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiVmlld0NvbmZpZ01vZGFsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFFTixLQUFLLEVBQ0wsT0FBTyxFQUdQLE1BQU0sRUFFTixPQUFPLEdBQ1AsTUFBTSxVQUFVLENBQUM7QUFDbEIsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBbUIxQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ25FLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSxrREFBa0QsQ0FBQztBQUUxRCxNQUFNLE9BQU8sZUFBZ0IsU0FBUSxLQUFLO0lBK0J6QyxZQUNDLEdBQVEsRUFDUixNQUE2QixFQUM3QixpQkFBb0MsRUFBRSxvQkFBb0I7SUFDMUQsaUJBQXdDLEVBQUUsb0JBQW9CO0lBQzlELE1BQTJELEVBQzNELGlCQUE4QixFQUFFLGdCQUFnQjtJQUNoRCwyQkFBb0M7O1FBRXBDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQW5DSixlQUFVLEdBQVksS0FBSyxDQUFDO1FBQzVCLGlCQUFZLEdBQWtCLElBQUksQ0FBQztRQUNuQyx5QkFBb0IsR0FBa0IsSUFBSSxDQUFDO1FBSTNDLGVBQVUsR0FBWSxLQUFLLENBQUM7UUFFcEMsNEJBQTRCO1FBQ3BCLHdCQUFtQixHQUErQixJQUFJLENBQUM7UUFDdkQsNEJBQXVCLEdBQXVCLElBQUksQ0FBQztRQUNuRCx3QkFBbUIsR0FFakIsSUFBSSxDQUFDO1FBdUJkLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxRQUFRLEdBQUcsaUJBQWlCLEtBQUssSUFBSSxDQUFDO1FBRTNDLE1BQU0sa0JBQWtCLEdBQ3ZCLGlCQUFpQixhQUFqQixpQkFBaUIsY0FBakIsaUJBQWlC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QUMsRUFBRTtZQUN4QztnQkFDQyxLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLEVBQUUsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFO29CQUN4RCxPQUFPLEVBQUUsTUFBTTtpQkFDZixDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDL0I7WUFDRDtnQkFDQyxLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLEVBQUUsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFO29CQUN4RCxPQUFPLEVBQUUsTUFBTTtpQkFDZixDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDL0I7WUFDRDtnQkFDQyxLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLEVBQUUsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFO29CQUN4RCxPQUFPLEVBQUUsTUFBTTtpQkFDZixDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDL0I7WUFDRDtnQkFDQyxLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLEVBQUUsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFO29CQUN4RCxPQUFPLEVBQUUsTUFBTTtpQkFDZixDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7YUFDaEM7WUFDRDtnQkFDQyxLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLEVBQUUsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFO29CQUN4RCxPQUFPLEVBQUUsTUFBTTtpQkFDZixDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7YUFDaEM7WUFDRDtnQkFDQyxLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLEVBQUUsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFO29CQUN4RCxPQUFPLEVBQUUsTUFBTTtpQkFDZixDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7YUFDaEM7WUFDRDtnQkFDQyxLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLEVBQUUsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFO29CQUN4RCxPQUFPLEVBQUUsTUFBTTtpQkFDZixDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7YUFDaEMsRUFBRSxvQ0FBb0M7U0FDdkMsQ0FBQztRQUVGLGNBQWM7UUFDZCxJQUFJLEtBQWEsQ0FBQztRQUNsQixJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDbEIsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUNwQixLQUFLLEdBQUcsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksSUFBSSxTQUFTLENBQUMsQ0FBQzthQUM1RDtpQkFBTTtnQkFDTixLQUFLLEdBQUcsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUM7YUFDaEM7U0FDRDthQUFNO1lBQ04sS0FBSyxHQUFHLENBQUMsQ0FBQyxhQUFhLENBQUMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztTQUNoRDtRQUNELElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRTVCLGdCQUFnQjtRQUNoQixJQUFJLElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRTtZQUN6QyxNQUFNLGdCQUFnQixHQUNyQixJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQzFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLElBQUksQ0FBQyxZQUFZLENBQ2pDLENBQUM7WUFDSCxJQUFJLGdCQUFnQixFQUFFO2dCQUNyQixNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLGdCQUFnQixFQUFFLENBQUMsQ0FBQztnQkFDOUQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7b0JBQ3BCLElBQUksRUFDSCxDQUFDLENBQUMsNEJBQTRCLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJO29CQUN4RCxHQUFHLEVBQUUsMEJBQTBCO2lCQUMvQixDQUFDLENBQUM7Z0JBQ0gsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7b0JBQ3BCLElBQUksRUFBRSxDQUFDLENBQ04sNkVBQTZFLENBQzdFO29CQUNELEdBQUcsRUFBRSwwQkFBMEI7aUJBQy9CLENBQUMsQ0FBQzthQUNIO1NBQ0Q7UUFFRCw4QkFBOEI7UUFDOUIsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQy9ELElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxjQUFjLENBQ2pELENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUN4QixDQUFDO1lBQ0YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQztRQUM3QyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQzthQUNwQixPQUFPLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDO2FBQ3ZCLE9BQU8sQ0FDUCxDQUFDLENBQ0EsK0RBQStELENBQy9ELENBQ0Q7YUFDQSxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUNqQixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3BCLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDaEUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQztRQUM3QyxDQUFDLENBQUM7YUFDRCxTQUFTLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUNsQixJQUFJO2dCQUNILEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNsQztZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNYLE9BQU8sQ0FBQyxLQUFLLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDeEM7WUFDRCxjQUFjLENBQUMsR0FBRyxFQUFFO2dCQUNuQixXQUFXLEVBQUUsSUFBSSxDQUFDLE9BQU87Z0JBQ3pCLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtnQkFDbkIsY0FBYyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7b0JBQzFCLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQztvQkFDOUIsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO29CQUN2QixJQUFJO3dCQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO3FCQUM5QjtvQkFBQyxPQUFPLENBQUMsRUFBRTt3QkFDWCxPQUFPLENBQUMsS0FBSyxDQUFDLHFCQUFxQixFQUFFLENBQUMsQ0FBQyxDQUFDO3FCQUN4QztvQkFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDakMsQ0FBQzthQUNELENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUosMENBQTBDO1FBQzFDLG9FQUFvRTtRQUNwRSxNQUFNLGFBQWEsR0FBRyxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQy9ELE1BQU0sYUFBYSxHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDL0QsQ0FBQyxDQUFDLFFBQVE7WUFDVixDQUFDLENBQUMsS0FBSyxDQUFDO1FBRVQsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDO2FBQ3BCLE9BQU8sQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQzthQUM5QixPQUFPLENBQ1AsQ0FBQyxDQUNBLDJIQUEySCxDQUMzSCxDQUNEO2FBQ0EsV0FBVyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDekIsUUFBUTtpQkFDTixTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQztpQkFDbEMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztpQkFDeEMsUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxJQUFJLGFBQWEsQ0FBQztpQkFDakQsUUFBUSxDQUFDLENBQUMsS0FBdUIsRUFBRSxFQUFFO2dCQUNyQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7Z0JBQy9CLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN4QixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUosMEJBQTBCO1FBQzFCLE1BQU0sY0FBYyxHQUNuQixJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsS0FBSyxVQUFVO1lBQ2pDLENBQUMsSUFBSSxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsWUFBWSxLQUFLLFVBQVUsQ0FBQztZQUNyRCxDQUFBLE1BQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLDBDQUFFLFFBQVEsTUFBSyxVQUFVLENBQUM7UUFFekQsMEJBQTBCO1FBQzFCLE1BQU0sWUFBWSxHQUNqQixJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsS0FBSyxRQUFRO1lBQy9CLENBQUMsSUFBSSxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsWUFBWSxLQUFLLFFBQVEsQ0FBQztZQUNuRCxDQUFBLE1BQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLDBDQUFFLFFBQVEsTUFBSyxRQUFRLENBQUM7UUFFdkQsMEJBQTBCO1FBQzFCLE1BQU0sY0FBYyxHQUNuQixJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsS0FBSyxVQUFVO1lBQ2pDLENBQUMsSUFBSSxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsWUFBWSxLQUFLLFVBQVUsQ0FBQztZQUNyRCxDQUFBLE1BQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLDBDQUFFLFFBQVEsTUFBSyxVQUFVLENBQUM7UUFFekQsNEJBQTRCO1FBQzVCLE1BQU0sY0FBYyxHQUNuQixJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsS0FBSyxVQUFVO1lBQ2pDLENBQUMsSUFBSSxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsWUFBWSxLQUFLLFVBQVUsQ0FBQztZQUNyRCxDQUFBLE1BQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLDBDQUFFLFFBQVEsTUFBSyxVQUFVLENBQUM7UUFFekQsSUFBSSxjQUFjLEVBQUU7WUFDbkIsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDO2lCQUNwQixPQUFPLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUM7aUJBQy9CLE9BQU8sQ0FBQyxDQUFDLENBQUMsa0RBQWtELENBQUMsQ0FBQztpQkFDOUQsV0FBVyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7O2dCQUN6QixJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7b0JBQ3BCLFFBQVEsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2pELENBQUMsQ0FBQyxDQUFDO2dCQUVILElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsOEJBQThCO2dCQUNyRCxJQUNDLENBQUEsTUFBQSxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsMENBQUUsUUFBUSxNQUFLLFVBQVUsRUFDdEQ7b0JBQ0QsWUFBWTt3QkFDWCxNQUNDLElBQUksQ0FBQyxVQUFVOzZCQUNiLGNBQ0YsQ0FBQyxjQUFjLG1DQUFJLENBQUMsQ0FBQyxDQUFDO2lCQUN4QjtnQkFDRCxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO2dCQUV4QyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7b0JBQzNCLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDakMsTUFBTSxpQkFBaUIsR0FDdEIsUUFBUSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztvQkFFeEMsSUFDQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYzt3QkFDL0IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsUUFBUTs0QkFDdEMsVUFBVSxFQUNWO3dCQUNELElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxHQUFHOzRCQUNoQyxRQUFRLEVBQUUsVUFBVTs0QkFDcEIsY0FBYyxFQUFFLGlCQUFpQjt5QkFDakMsQ0FBQztxQkFDRjt5QkFBTTt3QkFFTCxJQUFJLENBQUMsVUFBVTs2QkFDYixjQUNGLENBQUMsY0FBYyxHQUFHLGlCQUFpQixDQUFDO3FCQUNyQztvQkFDRCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ3hCLENBQUMsQ0FBQyxDQUFDO1lBQ0osQ0FBQyxDQUFDLENBQUM7WUFFSiw4Q0FBOEM7WUFDOUMsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDO2lCQUNwQixPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDO2lCQUMzQixPQUFPLENBQ1AsQ0FBQyxDQUNBLCtEQUErRCxDQUMvRCxDQUNEO2lCQUNBLFNBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFOztnQkFDckIsTUFBTSxZQUFZLEdBQ2pCLE1BQUEsTUFDQyxJQUFJLENBQUMsVUFBVTtxQkFDYixjQUNGLDBDQUFFLFlBQVksbUNBQUksS0FBSyxDQUFDO2dCQUMxQixNQUFNLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUM5QixNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7b0JBQ3pCLElBQ0MsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWM7d0JBQy9CLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLFFBQVE7NEJBQ3RDLFVBQVUsRUFDVjt3QkFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsR0FBRzs0QkFDaEMsUUFBUSxFQUFFLFVBQVU7NEJBQ3BCLGNBQWMsRUFBRSxTQUFTOzRCQUN6QixZQUFZLEVBQUUsS0FBSzt5QkFDbkIsQ0FBQztxQkFDRjt5QkFBTTt3QkFFTCxJQUFJLENBQUMsVUFBVTs2QkFDYixjQUNGLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQztxQkFDdkI7b0JBQ0QsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUN4QixDQUFDLENBQUMsQ0FBQztZQUNKLENBQUMsQ0FBQyxDQUFDO1NBQ0o7YUFBTSxJQUFJLFlBQVksRUFBRTtZQUN4QixJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUM7aUJBQ3BCLE9BQU8sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7aUJBQ3RCLE9BQU8sQ0FDUCxDQUFDLENBQUMsd0RBQXdELENBQUMsQ0FDM0Q7aUJBQ0EsV0FBVyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7O2dCQUN6QixRQUFRO3FCQUNOLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO3FCQUNoQyxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztxQkFDcEMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7cUJBQzVCLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO3FCQUNsQyxTQUFTLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztxQkFDbkMsU0FBUyxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztxQkFDL0MsU0FBUyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUM7cUJBQ3ZDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO3FCQUNsQyxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztxQkFDckMsUUFBUSxDQUNSLENBQUEsTUFDQyxJQUFJLENBQUMsVUFBVTtxQkFDYixjQUNGLDBDQUFFLE9BQU8sS0FBSSxRQUFRLENBQ3RCO3FCQUNBLFFBQVEsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO29CQUNuQixJQUNDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjO3dCQUMvQixJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxRQUFROzRCQUN0QyxRQUFRLEVBQ1I7d0JBQ0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEdBQUc7NEJBQ2hDLFFBQVEsRUFBRSxRQUFROzRCQUNsQixZQUFZLEVBQUUsSUFBSTs0QkFDbEIsZ0JBQWdCLEVBQUUsS0FBSzs0QkFDdkIsZ0JBQWdCLEVBQUUsVUFBVTs0QkFDNUIsZ0JBQWdCLEVBQUUsTUFBTTs0QkFDeEIsT0FBTyxFQUFFLEtBQVk7eUJBQ3JCLENBQUM7cUJBQ0Y7eUJBQU07d0JBRUwsSUFBSSxDQUFDLFVBQVU7NkJBQ2IsY0FDRixDQUFDLE9BQU8sR0FBRyxLQUFZLENBQUM7cUJBQ3pCO29CQUNELElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztvQkFDdkIseURBQXlEO29CQUN6RCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2hCLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUM7WUFFSixJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUM7aUJBQ3BCLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUM7aUJBQzNCLE9BQU8sQ0FBQyxDQUFDLENBQUMsbURBQW1ELENBQUMsQ0FBQztpQkFDL0QsU0FBUyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7O2dCQUNyQixNQUFNLENBQUMsUUFBUSxDQUNkLE1BQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUF1QywwQ0FDckQsWUFBdUIsQ0FDMUIsQ0FBQztnQkFDRixNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7b0JBQ3pCLElBQ0MsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWM7d0JBQy9CLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLFFBQVEsS0FBSyxRQUFRLEVBQ25EO3dCQUNELElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxHQUFHOzRCQUNoQyxRQUFRLEVBQUUsUUFBUTs0QkFDbEIsWUFBWSxFQUFFLEtBQUs7NEJBQ25CLGdCQUFnQixFQUFFLEtBQUs7NEJBQ3ZCLGdCQUFnQixFQUFFLFVBQVU7NEJBQzVCLGdCQUFnQixFQUFFLE1BQU07NEJBQ3hCLE9BQU8sRUFBRSxRQUFRO3lCQUNqQixDQUFDO3FCQUNGO3lCQUFNO3dCQUVMLElBQUksQ0FBQyxVQUFVOzZCQUNiLGNBQ0YsQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFDO3FCQUN2QjtvQkFDRCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ3hCLENBQUMsQ0FBQyxDQUFDO1lBQ0osQ0FBQyxDQUFDLENBQUM7WUFFSixJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUM7aUJBQ3BCLE9BQU8sQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQztpQkFDaEMsT0FBTyxDQUFDLENBQUMsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO2lCQUM5QyxTQUFTLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTs7Z0JBQ3JCLE1BQU0sQ0FBQyxRQUFRLENBQ2QsTUFBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQXVDLDBDQUNyRCxnQkFBMkIsQ0FDOUIsQ0FBQztnQkFDRixNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7b0JBQ3pCLElBQ0MsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWM7d0JBQy9CLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLFFBQVEsS0FBSyxRQUFRLEVBQ25EO3dCQUNELElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxHQUFHOzRCQUNoQyxRQUFRLEVBQUUsUUFBUTs0QkFDbEIsWUFBWSxFQUFFLElBQUk7NEJBQ2xCLGdCQUFnQixFQUFFLEtBQUs7NEJBQ3ZCLGdCQUFnQixFQUFFLFVBQVU7NEJBQzVCLGdCQUFnQixFQUFFLE1BQU07NEJBQ3hCLE9BQU8sRUFBRSxRQUFRO3lCQUNqQixDQUFDO3FCQUNGO3lCQUFNO3dCQUVMLElBQUksQ0FBQyxVQUFVOzZCQUNiLGNBQ0YsQ0FBQyxnQkFBZ0IsR0FBRyxLQUFLLENBQUM7cUJBQzNCO29CQUNELElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDeEIsQ0FBQyxDQUFDLENBQUM7WUFDSixDQUFDLENBQUMsQ0FBQztZQUVKLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQztpQkFDcEIsT0FBTyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO2lCQUNoQyxPQUFPLENBQ1AsQ0FBQyxDQUFDLG9EQUFvRCxDQUFDLENBQ3ZEO2lCQUNBLFdBQVcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFOztnQkFDekIsUUFBUTtxQkFDTixTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztxQkFDcEMsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7cUJBQ25DLFNBQVMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUM7cUJBQy9DLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDO3FCQUN2QyxTQUFTLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQztxQkFDM0MsUUFBUSxDQUNSLENBQUEsTUFDQyxJQUFJLENBQUMsVUFBVTtxQkFDYixjQUNGLDBDQUFFLGdCQUFnQixLQUFJLFVBQVUsQ0FDakM7cUJBQ0EsUUFBUSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7b0JBQ25CLElBQ0MsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWM7d0JBQy9CLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLFFBQVE7NEJBQ3RDLFFBQVEsRUFDUjt3QkFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsR0FBRzs0QkFDaEMsUUFBUSxFQUFFLFFBQVE7NEJBQ2xCLFlBQVksRUFBRSxJQUFJOzRCQUNsQixnQkFBZ0IsRUFBRSxLQUFLOzRCQUN2QixnQkFBZ0IsRUFBRSxLQUFZOzRCQUM5QixnQkFBZ0IsRUFBRSxNQUFNOzRCQUN4QixPQUFPLEVBQUUsUUFBUTt5QkFDakIsQ0FBQztxQkFDRjt5QkFBTTt3QkFFTCxJQUFJLENBQUMsVUFBVTs2QkFDYixjQUNGLENBQUMsZ0JBQWdCLEdBQUcsS0FBWSxDQUFDO3FCQUNsQztvQkFDRCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ3hCLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUM7WUFFSixJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUM7aUJBQ3BCLE9BQU8sQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQztpQkFDaEMsT0FBTyxDQUFDLENBQUMsQ0FBQyxpREFBaUQsQ0FBQyxDQUFDO2lCQUM3RCxXQUFXLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTs7Z0JBQ3pCLFFBQVE7cUJBQ04sU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7cUJBQ2hDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDO3FCQUNsQyxRQUFRLENBQ1IsQ0FBQSxNQUNDLElBQUksQ0FBQyxVQUFVO3FCQUNiLGNBQ0YsMENBQUUsZ0JBQWdCLEtBQUksTUFBTSxDQUM3QjtxQkFDQSxRQUFRLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtvQkFDbkIsSUFDQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYzt3QkFDL0IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsUUFBUTs0QkFDdEMsUUFBUSxFQUNSO3dCQUNELElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxHQUFHOzRCQUNoQyxRQUFRLEVBQUUsUUFBUTs0QkFDbEIsWUFBWSxFQUFFLElBQUk7NEJBQ2xCLGdCQUFnQixFQUFFLEtBQUs7NEJBQ3ZCLGdCQUFnQixFQUFFLFVBQVU7NEJBQzVCLGdCQUFnQixFQUFFLEtBQVk7NEJBQzlCLE9BQU8sRUFBRSxRQUFRO3lCQUNqQixDQUFDO3FCQUNGO3lCQUFNO3dCQUVMLElBQUksQ0FBQyxVQUFVOzZCQUNiLGNBQ0YsQ0FBQyxnQkFBZ0IsR0FBRyxLQUFZLENBQUM7cUJBQ2xDO29CQUNELElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDeEIsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztZQUVKLHVEQUF1RDtZQUN2RCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsVUFBVTtpQkFDbEMsY0FBc0MsQ0FBQztZQUN6QyxJQUFJLENBQUEsWUFBWSxhQUFaLFlBQVksdUJBQVosWUFBWSxDQUFFLE9BQU8sS0FBSSxZQUFZLENBQUMsT0FBTyxLQUFLLFFBQVEsRUFBRTtnQkFDL0QsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDO3FCQUNwQixPQUFPLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUM7cUJBQzVCLE9BQU8sQ0FDUCxDQUFDLENBQ0EsNkRBQTZELENBQzdELENBQ0Q7cUJBQ0EsVUFBVSxFQUFFLENBQUM7Z0JBRWYsTUFBTSxnQkFBZ0IsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDO29CQUM1QyxHQUFHLEVBQUUsMEJBQTBCO2lCQUMvQixDQUFDLENBQUM7Z0JBRUgsTUFBTSxrQkFBa0IsR0FBRyxHQUFHLEVBQUU7b0JBQy9CLGdCQUFnQixDQUFDLEtBQUssRUFBRSxDQUFDO29CQUV6Qiw4QkFBOEI7b0JBQzlCLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFO3dCQUNoQyxZQUFZLENBQUMsYUFBYSxHQUFHLEVBQUUsQ0FBQztxQkFDaEM7b0JBRUQsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLGFBQWEsQ0FBQztvQkFFM0MsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTt3QkFDekIsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRTs0QkFDOUIsSUFBSSxFQUFFLENBQUMsQ0FDTiwrQ0FBK0MsQ0FDL0M7NEJBQ0QsR0FBRyxFQUFFLDBCQUEwQjt5QkFDL0IsQ0FBQyxDQUFDO3FCQUNIO29CQUVELE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUU7d0JBQ2pDLE1BQU0sYUFBYSxHQUFHLElBQUksT0FBTyxDQUFDLGdCQUFnQixDQUFDOzZCQUNqRCxRQUFRLENBQUMsbUJBQW1CLENBQUM7NkJBQzdCLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFOzRCQUNqQixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7aUNBQ3pCLGNBQWMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUM7aUNBQ2pDLFFBQVEsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO2dDQUNuQixJQUFJLFlBQVksQ0FBQyxhQUFhLEVBQUU7b0NBQy9CLFlBQVksQ0FBQyxhQUFhLENBQ3pCLEtBQUssQ0FDTCxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7b0NBQ2hCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztpQ0FDdkI7NEJBQ0YsQ0FBQyxDQUFDLENBQUM7d0JBQ0wsQ0FBQyxDQUFDOzZCQUNELE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFOzs0QkFDakIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBLE1BQUEsTUFBTSxDQUFDLEtBQUssMENBQUUsUUFBUSxFQUFFLEtBQUksRUFBRSxDQUFDO2lDQUMzQyxjQUFjLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2lDQUMxQixRQUFRLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQ0FDbkIsSUFBSSxZQUFZLENBQUMsYUFBYSxFQUFFO29DQUMvQixnREFBZ0Q7b0NBQ2hELElBQUksV0FBVyxHQUdMLEtBQUssQ0FBQztvQ0FDaEIsSUFDQyxZQUFZLENBQUMsT0FBTzt3Q0FDbkIsVUFBVTt3Q0FDWCxLQUFLLEVBQ0o7d0NBQ0QsTUFBTSxRQUFRLEdBQ2IsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO3dDQUNqQixXQUFXLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQzs0Q0FDNUIsQ0FBQyxDQUFDLEtBQUs7NENBQ1AsQ0FBQyxDQUFDLFFBQVEsQ0FBQztxQ0FDWjtvQ0FDRCxZQUFZLENBQUMsYUFBYSxDQUN6QixLQUFLLENBQ0wsQ0FBQyxLQUFLLEdBQUcsV0FBVyxDQUFDO29DQUN0QixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7aUNBQ3ZCOzRCQUNGLENBQUMsQ0FBQyxDQUFDO3dCQUNMLENBQUMsQ0FBQyxDQUFDO3dCQUVKLHVDQUF1Qzt3QkFDdkMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFOzRCQUN2QyxNQUFNO2lDQUNKLE9BQU8sQ0FBQyxVQUFVLENBQUM7aUNBQ25CLFVBQVUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7aUNBQ3hCLFdBQVcsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDO2lDQUN4QixPQUFPLENBQUMsR0FBRyxFQUFFO2dDQUNiLElBQ0MsS0FBSyxHQUFHLENBQUM7b0NBQ1QsWUFBWSxDQUFDLGFBQWEsRUFDekI7b0NBQ0QsTUFBTSxJQUFJLEdBQ1QsWUFBWSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQ2hDLEtBQUssRUFDTCxDQUFDLENBQ0QsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQ0FDTixZQUFZLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FDaEMsS0FBSyxHQUFHLENBQUMsRUFDVCxDQUFDLEVBQ0QsSUFBSSxDQUNKLENBQUM7b0NBQ0Ysc0JBQXNCO29DQUN0QixZQUFZLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FDakMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUU7d0NBQ1YsR0FBRyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7b0NBQ2YsQ0FBQyxDQUNELENBQUM7b0NBQ0YsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO29DQUN2QixrQkFBa0IsRUFBRSxDQUFDO2lDQUNyQjs0QkFDRixDQUFDLENBQUMsQ0FBQzt3QkFDTCxDQUFDLENBQUMsQ0FBQzt3QkFDSCxhQUFhLENBQUMsY0FBYyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7NEJBQ3ZDLE1BQU07aUNBQ0osT0FBTyxDQUFDLFlBQVksQ0FBQztpQ0FDckIsVUFBVSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztpQ0FDMUIsV0FBVyxDQUFDLEtBQUssS0FBSyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztpQ0FDekMsT0FBTyxDQUFDLEdBQUcsRUFBRTtnQ0FDYixJQUNDLEtBQUssR0FBRyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUM7b0NBQzFCLFlBQVksQ0FBQyxhQUFhLEVBQ3pCO29DQUNELE1BQU0sSUFBSSxHQUNULFlBQVksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUNoQyxLQUFLLEVBQ0wsQ0FBQyxDQUNELENBQUMsQ0FBQyxDQUFDLENBQUM7b0NBQ04sWUFBWSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQ2hDLEtBQUssR0FBRyxDQUFDLEVBQ1QsQ0FBQyxFQUNELElBQUksQ0FDSixDQUFDO29DQUNGLHNCQUFzQjtvQ0FDdEIsWUFBWSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQ2pDLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFO3dDQUNWLEdBQUcsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO29DQUNmLENBQUMsQ0FDRCxDQUFDO29DQUNGLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztvQ0FDdkIsa0JBQWtCLEVBQUUsQ0FBQztpQ0FDckI7NEJBQ0YsQ0FBQyxDQUFDLENBQUM7d0JBQ0wsQ0FBQyxDQUFDLENBQUM7d0JBQ0gsYUFBYSxDQUFDLGNBQWMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFOzRCQUN2QyxNQUFNO2lDQUNKLE9BQU8sQ0FBQyxPQUFPLENBQUM7aUNBQ2hCLFVBQVUsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUM7aUNBQzlCLE9BQU8sQ0FBQyxHQUFHLEVBQUU7Z0NBQ2IsSUFBSSxZQUFZLENBQUMsYUFBYSxFQUFFO29DQUMvQixZQUFZLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FDaEMsS0FBSyxFQUNMLENBQUMsQ0FDRCxDQUFDO29DQUNGLHNCQUFzQjtvQ0FDdEIsWUFBWSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQ2pDLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFO3dDQUNWLEdBQUcsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO29DQUNmLENBQUMsQ0FDRCxDQUFDO29DQUNGLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztvQ0FDdkIsa0JBQWtCLEVBQUUsQ0FBQztpQ0FDckI7NEJBQ0YsQ0FBQyxDQUFDLENBQUM7NEJBQ0osTUFBTSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUM7d0JBQ2hELENBQUMsQ0FBQyxDQUFDO29CQUNKLENBQUMsQ0FBQyxDQUFDO29CQUVILDZCQUE2QjtvQkFDN0IsSUFBSSxPQUFPLENBQUMsZ0JBQWdCLENBQUM7eUJBQzNCLFNBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO3dCQUNyQixNQUFNOzZCQUNKLGFBQWEsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUM7NkJBQzlCLE1BQU0sRUFBRTs2QkFDUixPQUFPLENBQUMsR0FBRyxFQUFFOzRCQUNiLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFO2dDQUNoQyxZQUFZLENBQUMsYUFBYSxHQUFHLEVBQUUsQ0FBQzs2QkFDaEM7NEJBQ0QsTUFBTSxTQUFTLEdBQUc7Z0NBQ2pCLEVBQUUsRUFBRSxVQUFVLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRTtnQ0FDMUIsS0FBSyxFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUM7Z0NBQ3RCLEtBQUssRUFBRSxFQUFFO2dDQUNULEtBQUssRUFBRSxZQUFZLENBQUMsYUFBYTtxQ0FDL0IsTUFBTTs2QkFDUixDQUFDOzRCQUNGLFlBQVksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDOzRCQUMzQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7NEJBQ3ZCLGtCQUFrQixFQUFFLENBQUM7d0JBQ3RCLENBQUMsQ0FBQyxDQUFDO29CQUNMLENBQUMsQ0FBQzt5QkFDRCxTQUFTLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTt3QkFDckIsTUFBTTs2QkFDSixhQUFhLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDOzZCQUNqQyxPQUFPLENBQUMsR0FBRyxFQUFFOzRCQUNiLElBQUksWUFBWSxDQUFDLGFBQWEsRUFBRTtnQ0FDL0IsWUFBWSxDQUFDLGFBQWEsR0FBRyxFQUFFLENBQUM7Z0NBQ2hDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQ0FDdkIsa0JBQWtCLEVBQUUsQ0FBQzs2QkFDckI7d0JBQ0YsQ0FBQyxDQUFDLENBQUM7b0JBQ0wsQ0FBQyxDQUFDLENBQUM7Z0JBQ0wsQ0FBQyxDQUFDO2dCQUVGLGtCQUFrQixFQUFFLENBQUM7YUFDckI7U0FDRDthQUFNLElBQUksY0FBYyxFQUFFO1lBQzFCLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQztpQkFDcEIsT0FBTyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO2lCQUMvQixPQUFPLENBQUMsQ0FBQyxDQUFDLGtEQUFrRCxDQUFDLENBQUM7aUJBQzlELFdBQVcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFOztnQkFDekIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO29CQUNwQixRQUFRLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNqRCxDQUFDLENBQUMsQ0FBQztnQkFFSCxJQUFJLFlBQVksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLDhCQUE4QjtnQkFDckQsSUFDQyxDQUFBLE1BQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLDBDQUFFLFFBQVEsTUFBSyxVQUFVLEVBQ3REO29CQUNELFlBQVk7d0JBQ1gsTUFDQyxJQUFJLENBQUMsVUFBVTs2QkFDYixjQUNGLENBQUMsY0FBYyxtQ0FBSSxDQUFDLENBQUMsQ0FBQztpQkFDeEI7Z0JBQ0QsUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztnQkFFeEMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO29CQUMzQixNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQ2pDLE1BQU0saUJBQWlCLEdBQ3RCLFFBQVEsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7b0JBRXhDLElBQ0MsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWM7d0JBQy9CLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLFFBQVE7NEJBQ3RDLFVBQVUsRUFDVjt3QkFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsR0FBRzs0QkFDaEMsUUFBUSxFQUFFLFVBQVU7NEJBQ3BCLGNBQWMsRUFBRSxpQkFBaUI7eUJBQ2pDLENBQUM7cUJBQ0Y7eUJBQU07d0JBRUwsSUFBSSxDQUFDLFVBQVU7NkJBQ2IsY0FDRixDQUFDLGNBQWMsR0FBRyxpQkFBaUIsQ0FBQztxQkFDckM7b0JBQ0QsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUN4QixDQUFDLENBQUMsQ0FBQztZQUNKLENBQUMsQ0FBQyxDQUFDO1lBRUosOENBQThDO1lBQzlDLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQztpQkFDcEIsT0FBTyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQztpQkFDM0IsT0FBTyxDQUNQLENBQUMsQ0FDQSxrRUFBa0UsQ0FDbEUsQ0FDRDtpQkFDQSxTQUFTLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTs7Z0JBQ3JCLE1BQU0sWUFBWSxHQUNqQixNQUFBLE1BQ0MsSUFBSSxDQUFDLFVBQVU7cUJBQ2IsY0FDRiwwQ0FBRSxZQUFZLG1DQUFJLEtBQUssQ0FBQztnQkFDMUIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFDOUIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO29CQUN6QixJQUNDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjO3dCQUMvQixJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxRQUFROzRCQUN0QyxVQUFVLEVBQ1Y7d0JBQ0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEdBQUc7NEJBQ2hDLFFBQVEsRUFBRSxVQUFVOzRCQUNwQixjQUFjLEVBQUUsU0FBUzs0QkFDekIsWUFBWSxFQUFFLEtBQUs7eUJBQ25CLENBQUM7cUJBQ0Y7eUJBQU07d0JBRUwsSUFBSSxDQUFDLFVBQVU7NkJBQ2IsY0FDRixDQUFDLFlBQVksR0FBRyxLQUFLLENBQUM7cUJBQ3ZCO29CQUNELElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDeEIsQ0FBQyxDQUFDLENBQUM7WUFDSixDQUFDLENBQUMsQ0FBQztTQUNKO2FBQU0sSUFBSSxjQUFjLEVBQUU7WUFDMUIsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDO2lCQUNwQixPQUFPLENBQUMsQ0FBQyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7aUJBQzVDLE9BQU8sQ0FBQyxDQUFDLENBQUMsNkNBQTZDLENBQUMsQ0FBQztpQkFDekQsU0FBUyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7O2dCQUNyQixNQUFNLFlBQVksR0FDakIsTUFBQSxNQUNDLElBQUksQ0FBQyxVQUFVO3FCQUNiLGNBQ0YsMENBQUUsNEJBQTRCLG1DQUFJLEtBQUssQ0FBQztnQkFDMUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFDOUIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO29CQUN6QixJQUNDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjO3dCQUMvQixJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxRQUFROzRCQUN0QyxVQUFVLEVBQ1Y7d0JBQ0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEdBQUc7NEJBQ2hDLFFBQVEsRUFBRSxVQUFVOzRCQUNwQixrQkFBa0IsRUFBRSxLQUFLOzRCQUN6QixrQkFBa0IsRUFBRSxJQUFJOzRCQUN4QixjQUFjLEVBQUUsSUFBSTs0QkFDcEIsYUFBYSxFQUFFLElBQUk7NEJBQ25CLGdCQUFnQixFQUFFLFVBQVU7NEJBQzVCLGdCQUFnQixFQUFFLE1BQU07NEJBQ3hCLFNBQVMsRUFBRSxTQUFTOzRCQUNwQixZQUFZLEVBQUUsWUFBWTs0QkFDMUIsbUJBQW1CLEVBQUUsQ0FBQzs0QkFDdEIsNEJBQTRCLEVBQUUsS0FBSzs0QkFDbkMsdUJBQXVCLEVBQUUsQ0FBQzs0QkFDMUIsMEJBQTBCLEVBQUUsQ0FBQzs0QkFDN0Isb0JBQW9CLEVBQUUsS0FBSzs0QkFDM0IsY0FBYyxFQUFFO2dDQUNmLGVBQWUsRUFBRSxTQUFTO2dDQUMxQixrQkFBa0IsRUFBRSxTQUFTO2dDQUM3QixrQkFBa0IsRUFBRSxTQUFTO2dDQUM3QixxQkFBcUIsRUFBRSxTQUFTOzZCQUNoQzt5QkFDRCxDQUFDO3FCQUNGO3lCQUFNO3dCQUVMLElBQUksQ0FBQyxVQUFVOzZCQUNiLGNBQ0YsQ0FBQyw0QkFBNEIsR0FBRyxLQUFLLENBQUM7cUJBQ3ZDO29CQUNELElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztvQkFDdkIsbURBQW1EO29CQUNuRCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2hCLENBQUMsQ0FBQyxDQUFDO1lBQ0osQ0FBQyxDQUFDLENBQUM7WUFFSixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsVUFBVTtpQkFDcEMsY0FBd0MsQ0FBQztZQUMzQyxNQUFNLHlCQUF5QixHQUM5QixNQUFBLGNBQWMsYUFBZCxjQUFjLHVCQUFkLGNBQWMsQ0FBRSw0QkFBNEIsbUNBQUksS0FBSyxDQUFDO1lBRXZELElBQUkseUJBQXlCLEVBQUU7Z0JBQzlCLHlDQUF5QztnQkFDekMsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDO3FCQUNwQixPQUFPLENBQUMsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUM7cUJBQ3ZDLE9BQU8sQ0FDUCxDQUFDLENBQ0EsK0RBQStELENBQy9ELENBQ0Q7cUJBQ0EsU0FBUyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7O29CQUNyQixNQUFNO3lCQUNKLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQzt5QkFDbEIsUUFBUSxDQUNSLE1BQUEsY0FBYyxhQUFkLGNBQWMsdUJBQWQsY0FBYyxDQUFFLHVCQUF1QixtQ0FBSSxDQUFDLENBQzVDO3lCQUNBLGlCQUFpQixFQUFFO3lCQUNuQixRQUFRLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTs7d0JBQ25CLElBQ0MsQ0FBQSxNQUFBLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYywwQ0FBRSxRQUFROzRCQUN4QyxVQUFVLEVBQ1Q7NEJBRUEsSUFBSSxDQUFDLFVBQVU7aUNBQ2IsY0FDRixDQUFDLHVCQUF1QixHQUFHLEtBQUssQ0FBQzs0QkFDbEMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO3lCQUN2QjtvQkFDRixDQUFDLENBQUMsQ0FBQztnQkFDTCxDQUFDLENBQUMsQ0FBQztnQkFFSixJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUM7cUJBQ3BCLE9BQU8sQ0FBQyxDQUFDLENBQUMsOEJBQThCLENBQUMsQ0FBQztxQkFDMUMsT0FBTyxDQUNQLENBQUMsQ0FDQSxrRUFBa0UsQ0FDbEUsQ0FDRDtxQkFDQSxTQUFTLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTs7b0JBQ3JCLE1BQU07eUJBQ0osU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO3lCQUNsQixRQUFRLENBQ1IsTUFBQSxjQUFjLGFBQWQsY0FBYyx1QkFBZCxjQUFjLENBQUUsMEJBQTBCLG1DQUFJLENBQUMsQ0FDL0M7eUJBQ0EsaUJBQWlCLEVBQUU7eUJBQ25CLFFBQVEsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFOzt3QkFDbkIsSUFDQyxDQUFBLE1BQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLDBDQUFFLFFBQVE7NEJBQ3hDLFVBQVUsRUFDVDs0QkFFQSxJQUFJLENBQUMsVUFBVTtpQ0FDYixjQUNGLENBQUMsMEJBQTBCLEdBQUcsS0FBSyxDQUFDOzRCQUNyQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7eUJBQ3ZCO29CQUNGLENBQUMsQ0FBQyxDQUFDO2dCQUNMLENBQUMsQ0FBQyxDQUFDO2FBQ0o7aUJBQU07Z0JBQ04sb0NBQW9DO2dCQUNwQyxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUM7cUJBQ3BCLE9BQU8sQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUM7cUJBQ3hCLE9BQU8sQ0FDUCxDQUFDLENBQ0EscURBQXFELENBQ3JELENBQ0Q7cUJBQ0EsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7O29CQUNqQixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQUEsY0FBYyxhQUFkLGNBQWMsdUJBQWQsY0FBYyxDQUFFLFNBQVMsbUNBQUksU0FBUyxDQUFDO3lCQUNuRCxjQUFjLENBQUMsU0FBUyxDQUFDO3lCQUN6QixRQUFRLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTs7d0JBQ25CLElBQ0MsQ0FBQSxNQUFBLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYywwQ0FBRSxRQUFROzRCQUN4QyxVQUFVLEVBQ1Q7NEJBRUEsSUFBSSxDQUFDLFVBQVU7aUNBQ2IsY0FDRixDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7NEJBQ3BCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQzt5QkFDdkI7b0JBQ0YsQ0FBQyxDQUFDLENBQUM7Z0JBQ0wsQ0FBQyxDQUFDLENBQUM7Z0JBRUosSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDO3FCQUNwQixPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDO3FCQUMzQixPQUFPLENBQ1AsQ0FBQyxDQUNBLDBEQUEwRCxDQUMxRCxDQUNEO3FCQUNBLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFOztvQkFDakIsSUFBSSxDQUFDLFFBQVEsQ0FDWixNQUFBLGNBQWMsYUFBZCxjQUFjLHVCQUFkLGNBQWMsQ0FBRSxZQUFZLG1DQUFJLFlBQVksQ0FDNUM7eUJBQ0MsY0FBYyxDQUFDLFlBQVksQ0FBQzt5QkFDNUIsUUFBUSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7O3dCQUNuQixJQUNDLENBQUEsTUFBQSxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsMENBQUUsUUFBUTs0QkFDeEMsVUFBVSxFQUNUOzRCQUVBLElBQUksQ0FBQyxVQUFVO2lDQUNiLGNBQ0YsQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFDOzRCQUN2QixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7eUJBQ3ZCO29CQUNGLENBQUMsQ0FBQyxDQUFDO2dCQUNMLENBQUMsQ0FBQyxDQUFDO2dCQUVKLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQztxQkFDcEIsT0FBTyxDQUFDLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO3FCQUNuQyxPQUFPLENBQ1AsQ0FBQyxDQUNBLHVEQUF1RCxDQUN2RCxDQUNEO3FCQUNBLFNBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFOztvQkFDckIsTUFBTTt5QkFDSixTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7eUJBQ25CLFFBQVEsQ0FBQyxNQUFBLGNBQWMsYUFBZCxjQUFjLHVCQUFkLGNBQWMsQ0FBRSxtQkFBbUIsbUNBQUksQ0FBQyxDQUFDO3lCQUNsRCxpQkFBaUIsRUFBRTt5QkFDbkIsUUFBUSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7O3dCQUNuQixJQUNDLENBQUEsTUFBQSxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsMENBQUUsUUFBUTs0QkFDeEMsVUFBVSxFQUNUOzRCQUVBLElBQUksQ0FBQyxVQUFVO2lDQUNiLGNBQ0YsQ0FBQyxtQkFBbUIsR0FBRyxLQUFLLENBQUM7NEJBQzlCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQzt5QkFDdkI7b0JBQ0YsQ0FBQyxDQUFDLENBQUM7Z0JBQ0wsQ0FBQyxDQUFDLENBQUM7YUFDSjtZQUVELDJCQUEyQjtZQUMzQixJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUM7aUJBQ3BCLE9BQU8sQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsQ0FBQztpQkFDbEMsT0FBTyxDQUNQLENBQUMsQ0FDQSxpRUFBaUUsQ0FDakUsQ0FDRDtpQkFDQSxTQUFTLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTs7Z0JBQ3JCLE1BQU07cUJBQ0osUUFBUSxDQUFDLE1BQUEsY0FBYyxhQUFkLGNBQWMsdUJBQWQsY0FBYyxDQUFFLGtCQUFrQixtQ0FBSSxJQUFJLENBQUM7cUJBQ3BELFFBQVEsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFOztvQkFDbkIsSUFDQyxDQUFBLE1BQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLDBDQUFFLFFBQVE7d0JBQ3hDLFVBQVUsRUFDVDt3QkFFQSxJQUFJLENBQUMsVUFBVTs2QkFDYixjQUNGLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxDQUFDO3dCQUM3QixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7cUJBQ3ZCO2dCQUNGLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUM7WUFFSixJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUM7aUJBQ3BCLE9BQU8sQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQztpQkFDOUIsT0FBTyxDQUNQLENBQUMsQ0FDQSw2RUFBNkUsQ0FDN0UsQ0FDRDtpQkFDQSxTQUFTLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTs7Z0JBQ3JCLE1BQU07cUJBQ0osUUFBUSxDQUFDLE1BQUEsY0FBYyxhQUFkLGNBQWMsdUJBQWQsY0FBYyxDQUFFLGNBQWMsbUNBQUksSUFBSSxDQUFDO3FCQUNoRCxRQUFRLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTs7b0JBQ25CLElBQ0MsQ0FBQSxNQUFBLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYywwQ0FBRSxRQUFRO3dCQUN4QyxVQUFVLEVBQ1Q7d0JBRUEsSUFBSSxDQUFDLFVBQVU7NkJBQ2IsY0FDRixDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUM7d0JBQ3pCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztxQkFDdkI7Z0JBQ0YsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztZQUVKLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQztpQkFDcEIsT0FBTyxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO2lCQUNsQyxPQUFPLENBQUMsQ0FBQyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7aUJBQy9DLFNBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFOztnQkFDckIsTUFBTTtxQkFDSixRQUFRLENBQUMsTUFBQSxjQUFjLGFBQWQsY0FBYyx1QkFBZCxjQUFjLENBQUUsa0JBQWtCLG1DQUFJLEtBQUssQ0FBQztxQkFDckQsUUFBUSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7O29CQUNuQixJQUNDLENBQUEsTUFBQSxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsMENBQUUsUUFBUTt3QkFDeEMsVUFBVSxFQUNUO3dCQUVBLElBQUksQ0FBQyxVQUFVOzZCQUNiLGNBQ0YsQ0FBQyxrQkFBa0IsR0FBRyxLQUFLLENBQUM7d0JBQzdCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztxQkFDdkI7Z0JBQ0YsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztTQUNKO1FBRUQsa0NBQWtDO1FBQ2xDLElBQ0MsSUFBSSxDQUFDLFFBQVE7WUFDYixDQUFBLE1BQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLDBDQUFFLFFBQVEsTUFBSyxXQUFXO1lBQ3hELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxnQkFBZ0I7VUFDakQ7WUFDRCwrREFBK0Q7WUFDL0QseUJBQXlCO1lBQ3pCLElBQ0MsQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQztnQkFDbkMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUNoQztnQkFDRCxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUM7cUJBQ3BCLE9BQU8sQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7cUJBQ3ZCLE9BQU8sQ0FBQyxDQUFDLENBQUMsbUNBQW1DLENBQUMsQ0FBQztxQkFDL0MsV0FBVyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7O29CQUN6QixRQUFRO3lCQUNOLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDO3lCQUN6QyxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO3lCQUM1QyxRQUFRLENBQ1IsQ0FBQSxNQUFBLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYywwQ0FBRSxRQUFRO3dCQUN2QyxXQUFXO3dCQUNYLENBQUMsQ0FBQyxXQUFXO3dCQUNiLENBQUMsQ0FBQyxVQUFVLENBQ2I7eUJBQ0EsUUFBUSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7d0JBQ25CLElBQUksS0FBSyxLQUFLLFdBQVcsRUFBRTs0QkFDMUIsdUNBQXVDOzRCQUN2QyxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsR0FBRztnQ0FDaEMsUUFBUSxFQUFFLFdBQVc7Z0NBQ3JCLGVBQWUsRUFBRSxNQUFNO2dDQUN2QixlQUFlLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQztnQ0FDM0IsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQztnQ0FDbkMsZUFBZSxFQUFFLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQztnQ0FDcEMsY0FBYyxFQUFFLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQzs2QkFDdEMsQ0FBQzt5QkFDRjs2QkFBTTs0QkFDTixzQ0FBc0M7NEJBQ3RDLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUM7eUJBQ3RDO3dCQUNELElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQzt3QkFFdkIsa0VBQWtFO3dCQUNsRSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2hCLENBQUMsQ0FBQyxDQUFDO2dCQUNMLENBQUMsQ0FBQyxDQUFDO2FBQ0o7WUFFRCxzRUFBc0U7WUFDdEUsSUFBSSxDQUFBLE1BQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLDBDQUFFLFFBQVEsTUFBSyxXQUFXLEVBQUU7Z0JBQzdELElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQztxQkFDcEIsT0FBTyxDQUFDLENBQUMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO3FCQUN0QyxVQUFVLEVBQUUsQ0FBQztnQkFFZiw2QkFBNkI7Z0JBQzdCLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQztxQkFDcEIsT0FBTyxDQUFDLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO3FCQUNwQyxPQUFPLENBQ1AsQ0FBQyxDQUNBLDREQUE0RCxDQUM1RCxDQUNEO3FCQUNBLFdBQVcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO29CQUN6QixRQUFRO3lCQUNOLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO3lCQUM1QixTQUFTLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQzt5QkFDbEMsU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7eUJBQ3BDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO3lCQUNsQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQzt5QkFDaEMsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7eUJBQ25DLFNBQVMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUM7eUJBQy9DLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDO3lCQUN2QyxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQzt5QkFDckMsUUFBUSxDQUVQLElBQUksQ0FBQyxVQUFVO3lCQUNiLGNBQ0YsQ0FBQyxlQUFlLElBQUksTUFBTSxDQUMzQjt5QkFDQSxRQUFRLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTs7d0JBQ25CLElBQ0MsQ0FBQSxNQUFBLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYywwQ0FBRSxRQUFROzRCQUN4QyxXQUFXLEVBQ1Y7NEJBRUEsSUFBSSxDQUFDLFVBQVU7aUNBQ2IsY0FDRixDQUFDLGVBQWUsR0FBRyxLQUFLLENBQUM7NEJBRTFCLGdFQUFnRTs0QkFDaEUsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsRUFBRTtnQ0FDMUMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dDQUN2QixRQUFRLEtBQUssRUFBRTtvQ0FDZCxLQUFLLE1BQU07d0NBQ1YsS0FBSyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQzt3Q0FDbEIsTUFBTTtvQ0FDUCxLQUFLLFNBQVM7d0NBQ2IsS0FBSyxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQzt3Q0FDdEIsTUFBTTtvQ0FDUCxLQUFLLFVBQVU7d0NBQ2QsS0FBSyxHQUFHLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQzt3Q0FDeEIsTUFBTTtvQ0FDUCxLQUFLLFNBQVM7d0NBQ2IsS0FBSyxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQzt3Q0FDdEIsTUFBTTtvQ0FDUCxLQUFLLFFBQVE7d0NBQ1osS0FBSyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQzt3Q0FDcEIsTUFBTTtvQ0FDUCxLQUFLLFNBQVM7d0NBQ2IsS0FBSyxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQzt3Q0FDdkIsTUFBTTtvQ0FDUCxLQUFLLGVBQWU7d0NBQ25CLEtBQUssR0FBRyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQzt3Q0FDN0IsTUFBTTtvQ0FDUCxLQUFLLFdBQVc7d0NBQ2YsS0FBSyxHQUFHLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQzt3Q0FDekIsTUFBTTtvQ0FDUCxLQUFLLFVBQVU7d0NBQ2QsS0FBSyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQzt3Q0FDbkIsTUFBTTtpQ0FDUDtnQ0FDRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUNqQyxLQUFLLENBQ0wsQ0FBQztnQ0FFRCxJQUFJLENBQUMsVUFBVTtxQ0FDYixjQUNGLENBQUMsZUFBZSxHQUFHLEtBQUssQ0FBQzs2QkFDMUI7NEJBRUQsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO3lCQUN2QjtvQkFDRixDQUFDLENBQUMsQ0FBQztnQkFDTCxDQUFDLENBQUMsQ0FBQztnQkFFSixvQkFBb0I7Z0JBQ3BCLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQztxQkFDcEIsT0FBTyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO3FCQUMvQixPQUFPLENBQUMsQ0FBQyxDQUFDLHdDQUF3QyxDQUFDLENBQUM7cUJBQ3BELE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO29CQUNqQixJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDO29CQUNqQyxJQUFJLENBQUMsUUFBUSxDQUVYLElBQUksQ0FBQyxVQUFVO3lCQUNiLGNBQ0YsQ0FBQyxlQUFlLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUMvQixDQUFDO29CQUNGLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTs7d0JBQ3ZCLElBQ0MsQ0FBQSxNQUFBLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYywwQ0FBRSxRQUFROzRCQUN4QyxXQUFXLEVBQ1Y7NEJBRUEsSUFBSSxDQUFDLFVBQVU7aUNBQ2IsY0FDRixDQUFDLGVBQWUsR0FBRyxLQUFLLENBQUM7NEJBQzFCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQzt5QkFDdkI7b0JBQ0YsQ0FBQyxDQUFDLENBQUM7Z0JBQ0osQ0FBQyxDQUFDLENBQUM7Z0JBRUoscUJBQXFCO2dCQUNyQixJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUM7cUJBQ3BCLE9BQU8sQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQztxQkFDaEMsT0FBTyxDQUNQLENBQUMsQ0FBQyxpREFBaUQsQ0FBQyxDQUNwRDtxQkFDQSxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtvQkFDakIsSUFBSSxDQUFDLHFCQUFxQixHQUFHLElBQUksQ0FBQztvQkFDbEMsSUFBSSxDQUFDLFFBQVEsQ0FFWCxJQUFJLENBQUMsVUFBVTt5QkFDYixjQUNGLENBQUMsdUJBQXVCLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUN2QyxDQUFDO29CQUNGLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTs7d0JBQ3ZCLElBQ0MsQ0FBQSxNQUFBLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYywwQ0FBRSxRQUFROzRCQUN4QyxXQUFXLEVBQ1Y7NEJBRUEsSUFBSSxDQUFDLFVBQVU7aUNBQ2IsY0FDRixDQUFDLHVCQUF1QixHQUFHLEtBQUssQ0FBQzs0QkFDbEMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO3lCQUN2QjtvQkFDRixDQUFDLENBQUMsQ0FBQztnQkFDSixDQUFDLENBQUMsQ0FBQztnQkFFSixvQkFBb0I7Z0JBQ3BCLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQztxQkFDcEIsT0FBTyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO3FCQUMvQixPQUFPLENBQUMsQ0FBQyxDQUFDLCtDQUErQyxDQUFDLENBQUM7cUJBQzNELE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO29CQUNqQixJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDO29CQUNqQyxJQUFJLENBQUMsUUFBUSxDQUVYLElBQUksQ0FBQyxVQUFVO3lCQUNiLGNBQ0YsQ0FBQyxlQUFlLElBQUksQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQ3hDLENBQUM7b0JBQ0YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFOzt3QkFDdkIsSUFDQyxDQUFBLE1BQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLDBDQUFFLFFBQVE7NEJBQ3hDLFdBQVcsRUFDVjs0QkFFQSxJQUFJLENBQUMsVUFBVTtpQ0FDYixjQUNGLENBQUMsZUFBZSxHQUFHLEtBQUssQ0FBQzs0QkFDMUIsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO3lCQUN2QjtvQkFDRixDQUFDLENBQUMsQ0FBQztnQkFDSixDQUFDLENBQUMsQ0FBQztnQkFFSixtQkFBbUI7Z0JBQ25CLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQztxQkFDcEIsT0FBTyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO3FCQUM5QixPQUFPLENBQUMsQ0FBQyxDQUFDLHlDQUF5QyxDQUFDLENBQUM7cUJBQ3JELE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO29CQUNqQixJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDO29CQUNoQyxJQUFJLENBQUMsUUFBUSxDQUVYLElBQUksQ0FBQyxVQUFVO3lCQUNiLGNBQ0YsQ0FBQyxjQUFjLElBQUksQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQzFDLENBQUM7b0JBQ0YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFOzt3QkFDdkIsSUFDQyxDQUFBLE1BQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLDBDQUFFLFFBQVE7NEJBQ3hDLFdBQVcsRUFDVjs0QkFFQSxJQUFJLENBQUMsVUFBVTtpQ0FDYixjQUNGLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQzs0QkFDekIsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO3lCQUN2QjtvQkFDRixDQUFDLENBQUMsQ0FBQztnQkFDSixDQUFDLENBQUMsQ0FBQzthQUNKO1NBQ0Q7UUFFRCx1QkFBdUI7UUFDdkIsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBRS9ELElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQzthQUNwQixPQUFPLENBQUMsQ0FBQyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7YUFDaEQsT0FBTyxDQUFDLENBQUMsQ0FBQyxrREFBa0QsQ0FBQyxDQUFDO2FBQzlELFNBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ3JCLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1lBQ2hFLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDekIsSUFBSSxDQUFDLFVBQVUsQ0FBQyw4QkFBOEIsR0FBRyxLQUFLLENBQUM7Z0JBQ3ZELElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN4QixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDO2FBQ3BCLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUM7YUFDM0IsT0FBTyxDQUFDLENBQUMsQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO2FBQ2xELFNBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ3JCLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUM5QyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ3pCLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQztnQkFDckMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3hCLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSixrQ0FBa0M7UUFDbEMsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDO2FBQ3BCLE9BQU8sQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQzthQUNoQyxPQUFPLENBQ1AsQ0FBQyxDQUFDLDREQUE0RCxDQUFDLENBQy9EO2FBQ0EsU0FBUyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDckIsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUM7WUFDL0QsT0FBTyxDQUFDLEdBQUcsQ0FDVixnQ0FBZ0MsRUFDaEMsaUJBQWlCLEVBQ2pCLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUNsQyxDQUFDO1lBQ0YsTUFBTSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQ25DLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDekIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQ0FBb0MsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDekQsSUFBSSxLQUFLLEVBQUU7b0JBQ1YsNEJBQTRCO29CQUM1QixJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLEVBQUU7d0JBQ3hDLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxHQUFHOzRCQUNwQyxhQUFhLEVBQUUsS0FBSzs0QkFDcEIsWUFBWSxFQUFFLEVBQUU7eUJBQ2hCLENBQUM7d0JBQ0YsT0FBTyxDQUFDLEdBQUcsQ0FDViw4QkFBOEIsRUFDOUIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQ2xDLENBQUM7cUJBQ0Y7b0JBQ0QsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7aUJBQzNCO3FCQUFNO29CQUNOLDZCQUE2QjtvQkFDN0IsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO29CQUN6QyxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDO29CQUMxQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztpQkFDN0I7Z0JBQ0QsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3hCLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSiwwQ0FBMEM7UUFDMUMsSUFBSSxDQUFDLHVCQUF1QixHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUM7WUFDbEQsR0FBRyxFQUFFLDJCQUEyQjtTQUNoQyxDQUFDLENBQUM7UUFFSCwwQ0FBMEM7UUFDMUMsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRTtZQUN2QyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztTQUMzQjthQUFNO1lBQ04scURBQXFEO1lBQ3JELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztTQUNwRDtRQUVELElBQ0MsQ0FBQyxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUMsUUFBUSxDQUN4QyxDQUFBLE1BQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLDBDQUFFLFFBQVEsS0FBSSxFQUFFLENBQzlDLEVBQ0E7WUFDRCxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUM7aUJBQ3BCLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUM7aUJBQzNCLE9BQU8sQ0FDUCxDQUFDLENBQ0Esc0ZBQXNGLENBQ3RGLENBQ0Q7aUJBQ0EsVUFBVSxFQUFFLENBQUM7WUFFZixNQUFNLGlCQUFpQixHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUM7Z0JBQzdDLEdBQUcsRUFBRSx5QkFBeUI7YUFDOUIsQ0FBQyxDQUFDO1lBRUgsTUFBTSxtQkFBbUIsR0FBRyxHQUFHLEVBQUU7Z0JBQ2hDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUUxQix3Q0FBd0M7Z0JBQ3hDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRTtvQkFDbEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLEdBQUcsRUFBRSxDQUFDO2lCQUNsQztnQkFFRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQztnQkFFOUMsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtvQkFDMUIsaUJBQWlCLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRTt3QkFDL0IsSUFBSSxFQUFFLENBQUMsQ0FDTiwrQ0FBK0MsQ0FDL0M7d0JBQ0QsR0FBRyxFQUFFLDBCQUEwQjtxQkFDL0IsQ0FBQyxDQUFDO2lCQUNIO2dCQUVELFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUF3QixFQUFFLEtBQWEsRUFBRSxFQUFFO29CQUM1RCxNQUFNLGdCQUFnQixHQUFHLElBQUksT0FBTyxDQUFDLGlCQUFpQixDQUFDO3lCQUNyRCxRQUFRLENBQUMsb0JBQW9CLENBQUM7eUJBQzlCLFdBQVcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO3dCQUN6QixRQUFROzZCQUNOLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDOzZCQUNoQyxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQzs2QkFDcEMsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7NkJBQ25DLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDOzZCQUN2QyxTQUFTLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDOzZCQUMvQyxTQUFTLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQzs2QkFDbEMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUM7NkJBQ3pCLFFBQVEsQ0FBQyxDQUFDLEtBQTZCLEVBQUUsRUFBRTs0QkFDM0MsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRTtnQ0FDakMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQzNCLEtBQUssQ0FDTCxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7Z0NBQ2hCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQzs2QkFDdkI7d0JBQ0YsQ0FBQyxDQUFDLENBQUM7b0JBQ0wsQ0FBQyxDQUFDO3lCQUNELFdBQVcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO3dCQUN6QixRQUFROzZCQUNOLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDOzZCQUNoQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQzs2QkFDbEMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUM7NkJBQ3pCLFFBQVEsQ0FBQyxDQUFDLEtBQTZCLEVBQUUsRUFBRTs0QkFDM0MsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRTtnQ0FDakMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQzNCLEtBQUssQ0FDTCxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7Z0NBQ2hCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQzs2QkFDdkI7d0JBQ0YsQ0FBQyxDQUFDLENBQUM7d0JBQ0osOEVBQThFO3dCQUM5RSxJQUFJLFNBQVMsQ0FBQyxLQUFLLEtBQUssVUFBVSxFQUFFOzRCQUNuQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQzFCLGlFQUFpRSxDQUNqRSxDQUFDO3lCQUNGOzZCQUFNLElBQ047NEJBQ0MsU0FBUzs0QkFDVCxXQUFXOzRCQUNYLGVBQWU7eUJBQ2YsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUMxQjs0QkFDRCxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQzFCLDJFQUEyRSxDQUMzRSxDQUFDO3lCQUNGOzZCQUFNLElBQUksU0FBUyxDQUFDLEtBQUssS0FBSyxRQUFRLEVBQUU7NEJBQ3hDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FDMUIsMEVBQTBFLENBQzFFLENBQUM7eUJBQ0Y7NkJBQU07NEJBQ04sUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUMxQixpQ0FBaUMsQ0FDakMsQ0FBQzt5QkFDRjtvQkFDRixDQUFDLENBQUMsQ0FBQztvQkFFSix1Q0FBdUM7b0JBQ3ZDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO3dCQUMxQyxNQUFNOzZCQUNKLE9BQU8sQ0FBQyxVQUFVLENBQUM7NkJBQ25CLFVBQVUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7NkJBQ3hCLFdBQVcsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDOzZCQUN4QixPQUFPLENBQUMsR0FBRyxFQUFFOzRCQUNiLElBQUksS0FBSyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRTtnQ0FDOUMsTUFBTSxJQUFJLEdBQ1QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUNsQyxLQUFLLEVBQ0wsQ0FBQyxDQUNELENBQUMsQ0FBQyxDQUFDLENBQUM7Z0NBQ04sSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUNsQyxLQUFLLEdBQUcsQ0FBQyxFQUNULENBQUMsRUFDRCxJQUFJLENBQ0osQ0FBQztnQ0FDRixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7Z0NBQ3ZCLG1CQUFtQixFQUFFLENBQUM7NkJBQ3RCO3dCQUNGLENBQUMsQ0FBQyxDQUFDO29CQUNMLENBQUMsQ0FBQyxDQUFDO29CQUNILGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO3dCQUMxQyxNQUFNOzZCQUNKLE9BQU8sQ0FBQyxZQUFZLENBQUM7NkJBQ3JCLFVBQVUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7NkJBQzFCLFdBQVcsQ0FBQyxLQUFLLEtBQUssUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7NkJBQzFDLE9BQU8sQ0FBQyxHQUFHLEVBQUU7NEJBQ2IsSUFDQyxLQUFLLEdBQUcsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDO2dDQUMzQixJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksRUFDM0I7Z0NBQ0QsTUFBTSxJQUFJLEdBQ1QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUNsQyxLQUFLLEVBQ0wsQ0FBQyxDQUNELENBQUMsQ0FBQyxDQUFDLENBQUM7Z0NBQ04sSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUNsQyxLQUFLLEdBQUcsQ0FBQyxFQUNULENBQUMsRUFDRCxJQUFJLENBQ0osQ0FBQztnQ0FDRixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7Z0NBQ3ZCLG1CQUFtQixFQUFFLENBQUM7NkJBQ3RCO3dCQUNGLENBQUMsQ0FBQyxDQUFDO29CQUNMLENBQUMsQ0FBQyxDQUFDO29CQUNILGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO3dCQUMxQyxNQUFNOzZCQUNKLE9BQU8sQ0FBQyxPQUFPLENBQUM7NkJBQ2hCLFVBQVUsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQzs2QkFDakMsT0FBTyxDQUFDLEdBQUcsRUFBRTs0QkFDYixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFO2dDQUNqQyxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQ2xDLEtBQUssRUFDTCxDQUFDLENBQ0QsQ0FBQztnQ0FDRixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7Z0NBQ3ZCLG1CQUFtQixFQUFFLENBQUM7NkJBQ3RCO3dCQUNGLENBQUMsQ0FBQyxDQUFDO3dCQUNKLHlEQUF5RDt3QkFDekQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUM7b0JBQ2hELENBQUMsQ0FBQyxDQUFDO2dCQUNKLENBQUMsQ0FBQyxDQUFDO2dCQUVILGdDQUFnQztnQkFDaEMsSUFBSSxPQUFPLENBQUMsaUJBQWlCLENBQUM7cUJBQzVCLFNBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO29CQUNyQixNQUFNO3lCQUNKLGFBQWEsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQzt5QkFDdEMsTUFBTSxFQUFFO3lCQUNSLE9BQU8sQ0FBQyxHQUFHLEVBQUU7d0JBQ2IsTUFBTSxZQUFZLEdBQWtCOzRCQUNuQyxLQUFLLEVBQUUsUUFBUTs0QkFDZixLQUFLLEVBQUUsS0FBSzt5QkFDWixDQUFDO3dCQUNGLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRTs0QkFDbEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLEdBQUcsRUFBRSxDQUFDO3lCQUNsQzt3QkFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7d0JBQ2hELElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQzt3QkFDdkIsbUJBQW1CLEVBQUUsQ0FBQztvQkFDdkIsQ0FBQyxDQUFDLENBQUM7Z0JBQ0wsQ0FBQyxDQUFDO3FCQUNELFNBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO29CQUNyQiw4QkFBOEI7b0JBQzlCLE1BQU07eUJBQ0osYUFBYSxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO3lCQUNyQyxPQUFPLENBQUMsR0FBRyxFQUFFO3dCQUNiLHlDQUF5Qzt3QkFDekMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLEdBQUcsRUFBRSxDQUFDLENBQUMscUJBQXFCO3dCQUN4RCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7d0JBQ3ZCLG1CQUFtQixFQUFFLENBQUM7b0JBQ3ZCLENBQUMsQ0FBQyxDQUFDO2dCQUNMLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDO1lBRUYsbUJBQW1CLEVBQUUsQ0FBQztTQUN0QjtRQUVELDRCQUE0QjtRQUU1Qix5QkFBeUI7UUFDekIsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDO2FBQ3BCLFNBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ3JCLE1BQU07aUJBQ0osYUFBYSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztpQkFDeEIsTUFBTSxFQUFFO2lCQUNSLE9BQU8sQ0FBQyxHQUFHLEVBQUU7Z0JBQ2IsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3BCLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDO2FBQ0QsU0FBUyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDckIsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFO2dCQUM5QyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDZCxDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLGtCQUFrQixDQUFDLEtBQWE7UUFDdkMsSUFBSSxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRTtZQUFFLE9BQU8sRUFBRSxDQUFDO1FBQzdDLE9BQU8sS0FBSzthQUNWLEtBQUssQ0FBQyxHQUFHLENBQUM7YUFDVixHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQzthQUNwQixNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUMzQixDQUFDO0lBRU8sZUFBZTtRQUN0QixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN0RCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQztRQUN0RSxJQUFJLENBQUMsVUFBVTtZQUNkLGFBQWEsS0FBSyxJQUFJLENBQUMsa0JBQWtCO2dCQUN6QyxpQkFBaUIsS0FBSyxJQUFJLENBQUMsc0JBQXNCLENBQUM7SUFDcEQsQ0FBQztJQUVPLG9CQUFvQjtRQUMzQixNQUFNLEtBQUssR0FBbUIsRUFBRSxDQUFDO1FBRWpDLHlDQUF5QztRQUN6QyxJQUFJLElBQUksQ0FBQyxtQkFBbUIsRUFBRTtZQUM3QixJQUFJO2dCQUNILE1BQU0sa0JBQWtCLEdBQ3ZCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDM0MsSUFDQyxrQkFBa0I7b0JBQ2xCLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUN6QztvQkFDRCxLQUFLLENBQUMsY0FBYyxHQUFHLGtCQUFrQixDQUFDO2lCQUMxQzthQUNEO1lBQUMsT0FBTyxLQUFLLEVBQUU7Z0JBQ2YsT0FBTyxDQUFDLElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxLQUFLLENBQUMsQ0FBQzthQUMzRDtTQUNEO2FBQU0sSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRTtZQUM5QywrREFBK0Q7WUFDL0QsS0FBSyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQztTQUMxRDtRQUVELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVPLFdBQVc7UUFDbEIsb0JBQW9CO1FBQ3BCLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSTtZQUNuQixJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUN2RCxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLE1BQU0sQ0FBQztRQUVsRSx3QkFBd0I7UUFDeEIsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUVsRCw4QkFBOEI7UUFDOUIsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzFELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNsRSxJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQztRQUV4QiwyQkFBMkI7UUFDM0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNsRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDYixJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ3BCLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7Z0JBQzdCLEtBQUssRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUM7Z0JBQzNCLE9BQU8sRUFBRSxDQUFDLENBQUMsZ0RBQWdELENBQUM7Z0JBQzVELFdBQVcsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDO2dCQUN0QixVQUFVLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQztnQkFDdkIsU0FBUyxFQUFFLENBQUMsU0FBa0IsRUFBRSxFQUFFO29CQUNqQyxJQUFJLFNBQVMsRUFBRTt3QkFDZCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7d0JBQ25CLE9BQU87cUJBQ1A7b0JBQ0QsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNmLENBQUM7YUFDRCxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7U0FDVjthQUFNO1lBQ04sS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO1NBQ2Q7SUFDRixDQUFDO0lBRUQsT0FBTztRQUNOLHlDQUF5QztRQUN6QyxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUU3QixNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBQzNCLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNuQixDQUFDO0lBRUQseUJBQXlCO0lBQ2pCLGtCQUFrQjtRQUN6QixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDeEIsQ0FBQztJQUVPLG1CQUFtQjtRQUMxQixJQUFJLENBQUMsSUFBSSxDQUFDLHVCQUF1QjtZQUFFLE9BQU87UUFFMUMsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1FBRTdDLHFDQUFxQztRQUNyQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUU3QiwyRkFBMkY7UUFDM0YsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksbUJBQW1CLENBQ2pELElBQUksQ0FBQyx1QkFBdUIsRUFDNUIsSUFBSSxDQUFDLEdBQUcsRUFDUixlQUFlLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLEVBQUUsK0JBQStCO1FBQ3BFLElBQUksQ0FBQyxNQUFNLENBQ1gsQ0FBQztRQUVGLE9BQU8sQ0FBQyxHQUFHLENBQUMsOEJBQThCLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFFdEUsYUFBYTtRQUNiLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjO1lBQzdELENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUNoRSxDQUFDLENBQUM7Z0JBQ0EsYUFBYSxFQUFFLEtBQWM7Z0JBQzdCLFlBQVksRUFBRSxFQUFFO2FBQ2hCLENBQUM7UUFFSixPQUFPLENBQUMsR0FBRyxDQUFDLCtCQUErQixFQUFFLG1CQUFtQixDQUFDLENBQUM7UUFFbEUscUNBQXFDO1FBQ3JDLElBQUksQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQ3hCLHVDQUF1QyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxFQUMzRCxtQkFBbUIsQ0FDbkIsQ0FBQztRQUVGLGNBQWM7UUFDZCxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxFQUFFLENBQUM7UUFFbEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO1FBRWpELGlCQUFpQjtRQUNqQixPQUFPLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxFQUFFLG1CQUFtQixDQUFDLENBQUM7UUFDdEUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBRTlELDJDQUEyQztRQUMzQyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsQ0FDMUIsV0FBNEIsRUFDNUIsTUFBZSxFQUNkLEVBQUU7WUFDSCwwQkFBMEI7WUFDMUIsSUFDQyxJQUFJLENBQUMsbUJBQW1CO2dCQUN4QixNQUFNLEtBQUssZUFBZSxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxFQUM3QztnQkFDRCxPQUFPLENBQUMsR0FBRyxDQUNWLHNDQUFzQyxFQUN0QyxXQUFXLENBQ1gsQ0FBQztnQkFDRixJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsR0FBRyxXQUFXLENBQUM7Z0JBQ2pELElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQzthQUN2QjtRQUNGLENBQUMsQ0FBQztRQUVGLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FDcEIsNEJBQTRCLEVBQzVCLElBQUksQ0FBQyxtQkFBbUIsQ0FDeEIsQ0FBQztRQUVGLHFCQUFxQjtRQUNyQixJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFDckQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpREFBaUQsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFTyxxQkFBcUI7UUFDNUIsSUFBSSxJQUFJLENBQUMsbUJBQW1CLEVBQUU7WUFDN0IsSUFBSTtnQkFDSCxnQ0FBZ0M7Z0JBQ2hDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQzthQUNwQztZQUFDLE9BQU8sS0FBSyxFQUFFO2dCQUNmLE9BQU8sQ0FBQyxJQUFJLENBQUMsd0NBQXdDLEVBQUUsS0FBSyxDQUFDLENBQUM7YUFDOUQ7WUFDRCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDO1NBQ2hDO1FBRUQsSUFBSSxJQUFJLENBQUMsdUJBQXVCLEVBQUU7WUFDakMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3JDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztTQUNwRDtRQUVELElBQUksSUFBSSxDQUFDLG1CQUFtQixFQUFFO1lBQzdCLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FDckIsNEJBQTRCLEVBQzVCLElBQUksQ0FBQyxtQkFBbUIsQ0FDeEIsQ0FBQztZQUNGLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUM7U0FDaEM7SUFDRixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xyXG5cdEFwcCxcclxuXHRNb2RhbCxcclxuXHRTZXR0aW5nLFxyXG5cdFRleHRDb21wb25lbnQsXHJcblx0QnV0dG9uQ29tcG9uZW50LFxyXG5cdE5vdGljZSxcclxuXHRtb21lbnQsXHJcblx0c2V0SWNvbixcclxufSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHtcclxuXHRDYWxlbmRhclNwZWNpZmljQ29uZmlnLFxyXG5cdEthbmJhblNwZWNpZmljQ29uZmlnLFxyXG5cdEdhbnR0U3BlY2lmaWNDb25maWcsXHJcblx0VHdvQ29sdW1uU3BlY2lmaWNDb25maWcsXHJcblx0U3BlY2lmaWNWaWV3Q29uZmlnLFxyXG5cdFZpZXdDb25maWcsXHJcblx0Vmlld0ZpbHRlclJ1bGUsXHJcblx0Vmlld01vZGUsXHJcblx0Rm9yZWNhc3RTcGVjaWZpY0NvbmZpZyxcclxuXHRRdWFkcmFudFNwZWNpZmljQ29uZmlnLFxyXG5cdERhdGVFeGlzdFR5cGUsXHJcblx0UHJvcGVydHlFeGlzdFR5cGUsXHJcblx0REVGQVVMVF9TRVRUSU5HUyxcclxuXHRTb3J0Q3JpdGVyaW9uLFxyXG59IGZyb20gXCJAL2NvbW1vbi9zZXR0aW5nLWRlZmluaXRpb25cIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5pbXBvcnQgeyBGb2xkZXJTdWdnZXN0IH0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9pbnB1dHMvQXV0b0NvbXBsZXRlXCI7XHJcbmltcG9ydCB7IGF0dGFjaEljb25NZW51IH0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9tZW51cy9JY29uTWVudVwiO1xyXG5pbXBvcnQgeyBDb25maXJtTW9kYWwgfSBmcm9tIFwiQC9jb21wb25lbnRzL3VpL21vZGFscy9Db25maXJtTW9kYWxcIjtcclxuaW1wb3J0IHtcclxuXHRUYXNrRmlsdGVyQ29tcG9uZW50LFxyXG5cdFJvb3RGaWx0ZXJTdGF0ZSxcclxufSBmcm9tIFwiQC9jb21wb25lbnRzL2ZlYXR1cmVzL3Rhc2svZmlsdGVyL1ZpZXdUYXNrRmlsdGVyXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgVmlld0NvbmZpZ01vZGFsIGV4dGVuZHMgTW9kYWwge1xyXG5cdHByaXZhdGUgdmlld0NvbmZpZzogVmlld0NvbmZpZztcclxuXHRwcml2YXRlIHZpZXdGaWx0ZXJSdWxlOiBWaWV3RmlsdGVyUnVsZTtcclxuXHRwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luO1xyXG5cdHByaXZhdGUgaXNDcmVhdGU6IGJvb2xlYW47XHJcblx0cHJpdmF0ZSBpc0NvcHlNb2RlOiBib29sZWFuID0gZmFsc2U7XHJcblx0cHJpdmF0ZSBzb3VyY2VWaWV3SWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgY29weVNvdXJjZUlkZW50aWZpZXI6IHN0cmluZyB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgb25TYXZlOiAoY29uZmlnOiBWaWV3Q29uZmlnLCBydWxlczogVmlld0ZpbHRlclJ1bGUpID0+IHZvaWQ7XHJcblx0cHJpdmF0ZSBvcmlnaW5hbFZpZXdDb25maWc6IHN0cmluZztcclxuXHRwcml2YXRlIG9yaWdpbmFsVmlld0ZpbHRlclJ1bGU6IHN0cmluZztcclxuXHRwcml2YXRlIGhhc0NoYW5nZXM6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcblx0Ly8gQWR2YW5jZWQgZmlsdGVyIGNvbXBvbmVudFxyXG5cdHByaXZhdGUgdGFza0ZpbHRlckNvbXBvbmVudDogVGFza0ZpbHRlckNvbXBvbmVudCB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgYWR2YW5jZWRGaWx0ZXJDb250YWluZXI6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBmaWx0ZXJDaGFuZ2VIYW5kbGVyOlxyXG5cdFx0fCAoKGZpbHRlclN0YXRlOiBSb290RmlsdGVyU3RhdGUsIGxlYWZJZD86IHN0cmluZykgPT4gdm9pZClcclxuXHRcdHwgbnVsbCA9IG51bGw7XHJcblxyXG5cdC8vIFJlZmVyZW5jZXMgdG8gaW5wdXQgY29tcG9uZW50cyB0byByZWFkIHZhbHVlcyBsYXRlclxyXG5cdHByaXZhdGUgbmFtZUlucHV0OiBUZXh0Q29tcG9uZW50O1xyXG5cdHByaXZhdGUgaWNvbklucHV0OiBUZXh0Q29tcG9uZW50O1xyXG5cclxuXHQvLyBUd29Db2x1bW5WaWV3IHNwZWNpZmljIHNldHRpbmdzXHJcblx0cHJpdmF0ZSB0YXNrUHJvcGVydHlLZXlJbnB1dDogVGV4dENvbXBvbmVudDtcclxuXHRwcml2YXRlIGxlZnRDb2x1bW5UaXRsZUlucHV0OiBUZXh0Q29tcG9uZW50O1xyXG5cdHByaXZhdGUgcmlnaHRDb2x1bW5UaXRsZUlucHV0OiBUZXh0Q29tcG9uZW50O1xyXG5cdHByaXZhdGUgbXVsdGlTZWxlY3RUZXh0SW5wdXQ6IFRleHRDb21wb25lbnQ7XHJcblx0cHJpdmF0ZSBlbXB0eVN0YXRlVGV4dElucHV0OiBUZXh0Q29tcG9uZW50O1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdGFwcDogQXBwLFxyXG5cdFx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRpbml0aWFsVmlld0NvbmZpZzogVmlld0NvbmZpZyB8IG51bGwsIC8vIE51bGwgZm9yIGNyZWF0aW5nXHJcblx0XHRpbml0aWFsRmlsdGVyUnVsZTogVmlld0ZpbHRlclJ1bGUgfCBudWxsLCAvLyBOdWxsIGZvciBjcmVhdGluZ1xyXG5cdFx0b25TYXZlOiAoY29uZmlnOiBWaWV3Q29uZmlnLCBydWxlczogVmlld0ZpbHRlclJ1bGUpID0+IHZvaWQsXHJcblx0XHRzb3VyY2VWaWV3Rm9yQ29weT86IFZpZXdDb25maWcsIC8vIOaWsOWinu+8muWPr+mAieeahOa6kOinhuWbvueUqOS6juaLt+i0nVxyXG5cdFx0c291cmNlVmlld0lkZW50aWZpZXJGb3JDb3B5Pzogc3RyaW5nLCAvLyDmlrDlop7vvJrlj6/pgInnmoTmupDop4blm77moIfor4ZcclxuXHQpIHtcclxuXHRcdHN1cGVyKGFwcCk7XHJcblx0XHR0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuXHRcdHRoaXMuaXNDcmVhdGUgPSBpbml0aWFsVmlld0NvbmZpZyA9PT0gbnVsbDtcclxuXHJcblx0XHRjb25zdCByZXNvbHZlZENvcHlTb3VyY2UgPVxyXG5cdFx0XHRzb3VyY2VWaWV3Rm9yQ29weSA/P1xyXG5cdFx0XHQoc291cmNlVmlld0lkZW50aWZpZXJGb3JDb3B5XHJcblx0XHRcdFx0PyB0aGlzLnBsdWdpbi5zZXR0aW5ncy52aWV3Q29uZmlndXJhdGlvbi5maW5kKFxyXG5cdFx0XHRcdFx0XHQodmlldykgPT4gdmlldy5pZCA9PT0gc291cmNlVmlld0lkZW50aWZpZXJGb3JDb3B5LFxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdDogdW5kZWZpbmVkKTtcclxuXHJcblx0XHR0aGlzLmlzQ29weU1vZGUgPVxyXG5cdFx0XHRzb3VyY2VWaWV3Rm9yQ29weSAhPT0gdW5kZWZpbmVkIHx8XHJcblx0XHRcdHNvdXJjZVZpZXdJZGVudGlmaWVyRm9yQ29weSAhPT0gdW5kZWZpbmVkO1xyXG5cclxuXHRcdHRoaXMuc291cmNlVmlld0lkID1cclxuXHRcdFx0cmVzb2x2ZWRDb3B5U291cmNlPy5pZCA/PyBzb3VyY2VWaWV3SWRlbnRpZmllckZvckNvcHkgPz8gbnVsbDtcclxuXHRcdHRoaXMuY29weVNvdXJjZUlkZW50aWZpZXIgPVxyXG5cdFx0XHRzb3VyY2VWaWV3SWRlbnRpZmllckZvckNvcHkgPz8gcmVzb2x2ZWRDb3B5U291cmNlPy5pZCA/PyBudWxsO1xyXG5cclxuXHRcdGlmICh0aGlzLmlzQ3JlYXRlKSB7XHJcblx0XHRcdGNvbnN0IG5ld0lkID0gYGN1c3RvbV8ke0RhdGUubm93KCl9YDtcclxuXHJcblx0XHRcdGlmICh0aGlzLmlzQ29weU1vZGUgJiYgcmVzb2x2ZWRDb3B5U291cmNlKSB7XHJcblx0XHRcdFx0Ly8g5ou36LSd5qih5byP77ya5Z+65LqO5rqQ6KeG5Zu+5Yib5bu65paw6KeG5Zu+XHJcblx0XHRcdFx0dGhpcy52aWV3Q29uZmlnID0ge1xyXG5cdFx0XHRcdFx0Li4uSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShyZXNvbHZlZENvcHlTb3VyY2UpKSwgLy8g5rex5ou36LSd5rqQ6KeG5Zu+6YWN572uXHJcblx0XHRcdFx0XHRpZDogbmV3SWQsIC8vIOS9v+eUqOaWsOeahElEXHJcblx0XHRcdFx0XHRuYW1lOiB0KFwiQ29weSBvZiBcIikgKyByZXNvbHZlZENvcHlTb3VyY2UubmFtZSwgLy8g5L+u5pS55ZCN56ewXHJcblx0XHRcdFx0XHR0eXBlOiBcImN1c3RvbVwiLCAvLyDnoa7kv53nsbvlnovkuLroh6rlrprkuYlcclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHQvLyBBcHBseSBkZWZhdWx0IHJlZ2lvbiBpZiBub3Qgc2V0IChmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSlcclxuXHRcdFx0XHRpZiAoIXRoaXMudmlld0NvbmZpZy5yZWdpb24pIHtcclxuXHRcdFx0XHRcdGNvbnN0IGJvdHRvbVZpZXdJZHMgPSBbXHJcblx0XHRcdFx0XHRcdFwiaGFiaXRcIixcclxuXHRcdFx0XHRcdFx0XCJjYWxlbmRhclwiLFxyXG5cdFx0XHRcdFx0XHRcImdhbnR0XCIsXHJcblx0XHRcdFx0XHRcdFwia2FuYmFuXCIsXHJcblx0XHRcdFx0XHRdO1xyXG5cdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnLnJlZ2lvbiA9IGJvdHRvbVZpZXdJZHMuaW5jbHVkZXMoXHJcblx0XHRcdFx0XHRcdHJlc29sdmVkQ29weVNvdXJjZS5pZCxcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0PyBcImJvdHRvbVwiXHJcblx0XHRcdFx0XHRcdDogXCJ0b3BcIjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIOWmguaenOa6kOinhuWbvuaciei/h+a7pOinhOWIme+8jOS5n+aLt+i0nei/h+adpVxyXG5cdFx0XHRcdHRoaXMudmlld0ZpbHRlclJ1bGUgPSByZXNvbHZlZENvcHlTb3VyY2UuZmlsdGVyUnVsZXNcclxuXHRcdFx0XHRcdD8gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShyZXNvbHZlZENvcHlTb3VyY2UuZmlsdGVyUnVsZXMpKVxyXG5cdFx0XHRcdFx0OiBpbml0aWFsRmlsdGVyUnVsZSB8fCB7fTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyDmma7pgJrliJvlu7rmqKHlvI9cclxuXHRcdFx0XHR0aGlzLnZpZXdDb25maWcgPSB7XHJcblx0XHRcdFx0XHRpZDogbmV3SWQsXHJcblx0XHRcdFx0XHRuYW1lOiB0KFwiTmV3IGN1c3RvbSB2aWV3XCIpLFxyXG5cdFx0XHRcdFx0aWNvbjogXCJsaXN0LXBsdXNcIixcclxuXHRcdFx0XHRcdHR5cGU6IFwiY3VzdG9tXCIsXHJcblx0XHRcdFx0XHR2aXNpYmxlOiB0cnVlLFxyXG5cdFx0XHRcdFx0aGlkZUNvbXBsZXRlZEFuZEFiYW5kb25lZFRhc2tzOiBmYWxzZSxcclxuXHRcdFx0XHRcdGZpbHRlckJsYW5rczogZmFsc2UsXHJcblx0XHRcdFx0XHRzb3J0Q3JpdGVyaWE6IFtdLCAvLyBJbml0aWFsaXplIHNvcnQgY3JpdGVyaWEgYXMgYW4gZW1wdHkgYXJyYXlcclxuXHRcdFx0XHRcdHJlZ2lvbjogXCJ0b3BcIiwgLy8gRGVmYXVsdCBuZXcgY3VzdG9tIHZpZXdzIHRvIHRvcFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0dGhpcy52aWV3RmlsdGVyUnVsZSA9IGluaXRpYWxGaWx0ZXJSdWxlIHx8IHt9OyAvLyBTdGFydCB3aXRoIGVtcHR5IHJ1bGVzIG9yIHByb3ZpZGVkIGRlZmF1bHRzXHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIERlZXAgY29weSB0byBhdm9pZCBtb2RpZnlpbmcgb3JpZ2luYWwgb2JqZWN0cyB1bnRpbCBzYXZlXHJcblx0XHRcdHRoaXMudmlld0NvbmZpZyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoaW5pdGlhbFZpZXdDb25maWcpKTtcclxuXHRcdFx0dGhpcy52aWV3RmlsdGVyUnVsZSA9IEpTT04ucGFyc2UoXHJcblx0XHRcdFx0SlNPTi5zdHJpbmdpZnkoaW5pdGlhbEZpbHRlclJ1bGUgfHwge30pLFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gTWFrZSBzdXJlIHNvcnRDcml0ZXJpYSBleGlzdHNcclxuXHRcdFx0aWYgKCF0aGlzLnZpZXdDb25maWcuc29ydENyaXRlcmlhKSB7XHJcblx0XHRcdFx0dGhpcy52aWV3Q29uZmlnLnNvcnRDcml0ZXJpYSA9IFtdO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBBcHBseSBkZWZhdWx0IHJlZ2lvbiBpZiBub3Qgc2V0IChmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSlcclxuXHRcdFx0aWYgKCF0aGlzLnZpZXdDb25maWcucmVnaW9uKSB7XHJcblx0XHRcdFx0Y29uc3QgYm90dG9tVmlld0lkcyA9IFtcImhhYml0XCIsIFwiY2FsZW5kYXJcIiwgXCJnYW50dFwiLCBcImthbmJhblwiXTtcclxuXHRcdFx0XHR0aGlzLnZpZXdDb25maWcucmVnaW9uID0gYm90dG9tVmlld0lkcy5pbmNsdWRlcyhcclxuXHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZy5pZCxcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0XHQ/IFwiYm90dG9tXCJcclxuXHRcdFx0XHRcdDogXCJ0b3BcIjtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0aGlzLmlzQ29weU1vZGUpIHtcclxuXHRcdFx0dGhpcy5hcHBseVR3b0NvbHVtblByZXNldElmTmVlZGVkKHJlc29sdmVkQ29weVNvdXJjZSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU3RvcmUgb3JpZ2luYWwgdmFsdWVzIGZvciBjaGFuZ2UgZGV0ZWN0aW9uXHJcblx0XHR0aGlzLm9yaWdpbmFsVmlld0NvbmZpZyA9IEpTT04uc3RyaW5naWZ5KHRoaXMudmlld0NvbmZpZyk7XHJcblx0XHR0aGlzLm9yaWdpbmFsVmlld0ZpbHRlclJ1bGUgPSBKU09OLnN0cmluZ2lmeSh0aGlzLnZpZXdGaWx0ZXJSdWxlKTtcclxuXHJcblx0XHR0aGlzLm9uU2F2ZSA9IG9uU2F2ZTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXBwbHlUd29Db2x1bW5QcmVzZXRJZk5lZWRlZChcclxuXHRcdHNvdXJjZUNvbmZpZz86IFZpZXdDb25maWcsXHJcblx0KTogdm9pZCB7XHJcblx0XHRpZiAoIXRoaXMuaXNDb3B5TW9kZSkge1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgaGFzVHdvQ29sdW1uQ29uZmlnID1cclxuXHRcdFx0dGhpcy52aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnPy52aWV3VHlwZSA9PT0gXCJ0d29jb2x1bW5cIjtcclxuXHJcblx0XHRjb25zdCBwcmVzZXQgPSB0aGlzLmJ1aWxkVHdvQ29sdW1uUHJlc2V0KFxyXG5cdFx0XHR0aGlzLmNvcHlTb3VyY2VJZGVudGlmaWVyID8/IHNvdXJjZUNvbmZpZz8uaWQgPz8gbnVsbCxcclxuXHRcdFx0c291cmNlQ29uZmlnLFxyXG5cdFx0KTtcclxuXHJcblx0XHRpZiAoIXByZXNldCkge1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKGhhc1R3b0NvbHVtbkNvbmZpZykge1xyXG5cdFx0XHQvLyBBbHJlYWR5IGEgdHdvIGNvbHVtbiB2aWV3OyBlbnN1cmUgdGFzayBwcm9wZXJ0eSBhbGlnbnMgd2l0aCBwcmVzZXQgaWYgbWlzc2luZ1xyXG5cdFx0XHRjb25zdCBjdXJyZW50Q29uZmlnID1cclxuXHRcdFx0XHR0aGlzLnZpZXdDb25maWcuc3BlY2lmaWNDb25maWcgYXMgVHdvQ29sdW1uU3BlY2lmaWNDb25maWc7XHJcblx0XHRcdGlmICghY3VycmVudENvbmZpZy50YXNrUHJvcGVydHlLZXkpIHtcclxuXHRcdFx0XHRjdXJyZW50Q29uZmlnLnRhc2tQcm9wZXJ0eUtleSA9IHByZXNldC50YXNrUHJvcGVydHlLZXk7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMudmlld0NvbmZpZy5zcGVjaWZpY0NvbmZpZyA9IHByZXNldDtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYnVpbGRUd29Db2x1bW5QcmVzZXQoXHJcblx0XHRzb3VyY2VJZGVudGlmaWVyOiBzdHJpbmcgfCBudWxsLFxyXG5cdFx0c291cmNlQ29uZmlnPzogVmlld0NvbmZpZyxcclxuXHQpOiBUd29Db2x1bW5TcGVjaWZpY0NvbmZpZyB8IG51bGwge1xyXG5cdFx0aWYgKCFzb3VyY2VJZGVudGlmaWVyICYmICFzb3VyY2VDb25maWcpIHtcclxuXHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgaWRlbnRpZmllciA9XHJcblx0XHRcdHNvdXJjZUlkZW50aWZpZXIgPz9cclxuXHRcdFx0c291cmNlQ29uZmlnPy5pZCA/P1xyXG5cdFx0XHRzb3VyY2VDb25maWc/Lm5hbWUgPz9cclxuXHRcdFx0bnVsbDtcclxuXHJcblx0XHRpZiAoIWlkZW50aWZpZXIpIHtcclxuXHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3Qgbm9ybWFsaXplZCA9IGlkZW50aWZpZXIudG9Mb3dlckNhc2UoKTtcclxuXHJcblx0XHRsZXQgcHJvcGVydHlLZXk6IHN0cmluZyB8IG51bGwgPSBudWxsO1xyXG5cclxuXHRcdGNvbnN0IGRpcmVjdEtleSA9XHJcblx0XHRcdG5vcm1hbGl6ZWQuc3RhcnRzV2l0aChcInR3b2NvbHVtbjpcIikgfHxcclxuXHRcdFx0bm9ybWFsaXplZC5zdGFydHNXaXRoKFwidHdvLWNvbHVtbjpcIikgfHxcclxuXHRcdFx0bm9ybWFsaXplZC5zdGFydHNXaXRoKFwicHJvcGVydHk6XCIpO1xyXG5cdFx0aWYgKGRpcmVjdEtleSkge1xyXG5cdFx0XHRjb25zdCBbLCByYXdLZXldID0gbm9ybWFsaXplZC5zcGxpdChcIjpcIik7XHJcblx0XHRcdGlmIChyYXdLZXkpIHtcclxuXHRcdFx0XHRwcm9wZXJ0eUtleSA9IHJhd0tleTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGlmICghcHJvcGVydHlLZXkpIHtcclxuXHRcdFx0aWYgKG5vcm1hbGl6ZWQuaW5jbHVkZXMoXCJ0YWdcIikpIHtcclxuXHRcdFx0XHRwcm9wZXJ0eUtleSA9IFwidGFnc1wiO1xyXG5cdFx0XHR9IGVsc2UgaWYgKG5vcm1hbGl6ZWQuaW5jbHVkZXMoXCJyZXZpZXdcIikpIHtcclxuXHRcdFx0XHRwcm9wZXJ0eUtleSA9IFwicHJvamVjdFwiO1xyXG5cdFx0XHR9IGVsc2UgaWYgKG5vcm1hbGl6ZWQuaW5jbHVkZXMoXCJwcm9qZWN0XCIpKSB7XHJcblx0XHRcdFx0cHJvcGVydHlLZXkgPSBcInByb2plY3RcIjtcclxuXHRcdFx0fSBlbHNlIGlmIChub3JtYWxpemVkLmluY2x1ZGVzKFwiY29udGV4dFwiKSkge1xyXG5cdFx0XHRcdHByb3BlcnR5S2V5ID0gXCJjb250ZXh0XCI7XHJcblx0XHRcdH0gZWxzZSBpZiAobm9ybWFsaXplZC5pbmNsdWRlcyhcInByaW9yaXR5XCIpKSB7XHJcblx0XHRcdFx0cHJvcGVydHlLZXkgPSBcInByaW9yaXR5XCI7XHJcblx0XHRcdH0gZWxzZSBpZiAobm9ybWFsaXplZC5pbmNsdWRlcyhcInN0YXR1c1wiKSkge1xyXG5cdFx0XHRcdHByb3BlcnR5S2V5ID0gXCJzdGF0dXNcIjtcclxuXHRcdFx0fSBlbHNlIGlmIChub3JtYWxpemVkLmluY2x1ZGVzKFwiZHVlXCIpKSB7XHJcblx0XHRcdFx0cHJvcGVydHlLZXkgPSBcImR1ZURhdGVcIjtcclxuXHRcdFx0fSBlbHNlIGlmIChub3JtYWxpemVkLmluY2x1ZGVzKFwic2NoZWR1bGVcIikpIHtcclxuXHRcdFx0XHRwcm9wZXJ0eUtleSA9IFwic2NoZWR1bGVkRGF0ZVwiO1xyXG5cdFx0XHR9IGVsc2UgaWYgKG5vcm1hbGl6ZWQuaW5jbHVkZXMoXCJzdGFydFwiKSkge1xyXG5cdFx0XHRcdHByb3BlcnR5S2V5ID0gXCJzdGFydERhdGVcIjtcclxuXHRcdFx0fSBlbHNlIGlmIChub3JtYWxpemVkLmluY2x1ZGVzKFwiZmlsZVwiKSkge1xyXG5cdFx0XHRcdHByb3BlcnR5S2V5ID0gXCJmaWxlUGF0aFwiO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKCFwcm9wZXJ0eUtleSkge1xyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHJcblx0XHRsZXQgbGVmdENvbHVtblRpdGxlID0gdGhpcy5yZXNvbHZlTGVmdENvbHVtblRpdGxlKFxyXG5cdFx0XHRwcm9wZXJ0eUtleSxcclxuXHRcdFx0bm9ybWFsaXplZCxcclxuXHRcdFx0c291cmNlQ29uZmlnLFxyXG5cdFx0KTtcclxuXHRcdGNvbnN0IHJpZ2h0Q29sdW1uVGl0bGUgPSB0KFwiVGFza3NcIik7XHJcblx0XHRsZXQgbXVsdGlTZWxlY3RUZXh0ID0gdChcInNlbGVjdGVkIGl0ZW1zXCIpO1xyXG5cdFx0bGV0IGVtcHR5U3RhdGVUZXh0ID0gdChcIk5vIGl0ZW1zIHNlbGVjdGVkXCIpO1xyXG5cclxuXHRcdHN3aXRjaCAocHJvcGVydHlLZXkpIHtcclxuXHRcdFx0Y2FzZSBcInByb2plY3RcIjpcclxuXHRcdFx0XHRtdWx0aVNlbGVjdFRleHQgPSB0KFwicHJvamVjdHMgc2VsZWN0ZWRcIik7XHJcblx0XHRcdFx0aWYgKG5vcm1hbGl6ZWQuaW5jbHVkZXMoXCJyZXZpZXdcIikpIHtcclxuXHRcdFx0XHRcdGVtcHR5U3RhdGVUZXh0ID0gdChcclxuXHRcdFx0XHRcdFx0XCJTZWxlY3QgYSBwcm9qZWN0IHRvIHJldmlldyBpdHMgdGFza3MuXCIsXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0bGVmdENvbHVtblRpdGxlID0gdChcIlJldmlldyBQcm9qZWN0c1wiKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0ZW1wdHlTdGF0ZVRleHQgPSB0KFwiU2VsZWN0IGEgcHJvamVjdCB0byBzZWUgcmVsYXRlZCB0YXNrc1wiKTtcclxuXHRcdFx0XHRcdGxlZnRDb2x1bW5UaXRsZSA9IHQoXCJQcm9qZWN0c1wiKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgXCJ0YWdzXCI6XHJcblx0XHRcdFx0bGVmdENvbHVtblRpdGxlID0gdChcIlRhZ3NcIik7XHJcblx0XHRcdFx0bXVsdGlTZWxlY3RUZXh0ID0gdChcInRhZ3Mgc2VsZWN0ZWRcIik7XHJcblx0XHRcdFx0ZW1wdHlTdGF0ZVRleHQgPSB0KFwiU2VsZWN0IGEgdGFnIHRvIHNlZSByZWxhdGVkIHRhc2tzXCIpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwiY29udGV4dFwiOlxyXG5cdFx0XHRcdGxlZnRDb2x1bW5UaXRsZSA9IHQoXCJDb250ZXh0c1wiKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBcInByaW9yaXR5XCI6XHJcblx0XHRcdFx0bGVmdENvbHVtblRpdGxlID0gdChcIlByaW9yaXR5XCIpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwic3RhdHVzXCI6XHJcblx0XHRcdFx0bGVmdENvbHVtblRpdGxlID0gdChcIlN0YXR1c1wiKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBcImR1ZURhdGVcIjpcclxuXHRcdFx0XHRsZWZ0Q29sdW1uVGl0bGUgPSB0KFwiRHVlIERhdGVcIik7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgXCJzY2hlZHVsZWREYXRlXCI6XHJcblx0XHRcdFx0bGVmdENvbHVtblRpdGxlID0gdChcIlNjaGVkdWxlZCBEYXRlXCIpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwic3RhcnREYXRlXCI6XHJcblx0XHRcdFx0bGVmdENvbHVtblRpdGxlID0gdChcIlN0YXJ0IERhdGVcIik7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgXCJmaWxlUGF0aFwiOlxyXG5cdFx0XHRcdGxlZnRDb2x1bW5UaXRsZSA9IHQoXCJGaWxlc1wiKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHR2aWV3VHlwZTogXCJ0d29jb2x1bW5cIixcclxuXHRcdFx0dGFza1Byb3BlcnR5S2V5OiBwcm9wZXJ0eUtleSxcclxuXHRcdFx0bGVmdENvbHVtblRpdGxlLFxyXG5cdFx0XHRyaWdodENvbHVtbkRlZmF1bHRUaXRsZTogcmlnaHRDb2x1bW5UaXRsZSxcclxuXHRcdFx0bXVsdGlTZWxlY3RUZXh0LFxyXG5cdFx0XHRlbXB0eVN0YXRlVGV4dCxcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlc29sdmVMZWZ0Q29sdW1uVGl0bGUoXHJcblx0XHRwcm9wZXJ0eUtleTogc3RyaW5nLFxyXG5cdFx0bm9ybWFsaXplZElkZW50aWZpZXI6IHN0cmluZyxcclxuXHRcdHNvdXJjZUNvbmZpZz86IFZpZXdDb25maWcsXHJcblx0KTogc3RyaW5nIHtcclxuXHRcdGlmIChwcm9wZXJ0eUtleSA9PT0gXCJwcm9qZWN0XCIgJiYgbm9ybWFsaXplZElkZW50aWZpZXIuaW5jbHVkZXMoXCJyZXZpZXdcIikpIHtcclxuXHRcdFx0cmV0dXJuIHQoXCJSZXZpZXcgUHJvamVjdHNcIik7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHByb3BlcnR5S2V5ID09PSBcInByb2plY3RcIikge1xyXG5cdFx0XHRyZXR1cm4gdChcIlByb2plY3RzXCIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChwcm9wZXJ0eUtleSA9PT0gXCJ0YWdzXCIpIHtcclxuXHRcdFx0cmV0dXJuIHQoXCJUYWdzXCIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChwcm9wZXJ0eUtleSA9PT0gXCJjb250ZXh0XCIpIHtcclxuXHRcdFx0cmV0dXJuIHQoXCJDb250ZXh0c1wiKTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAocHJvcGVydHlLZXkgPT09IFwicHJpb3JpdHlcIikge1xyXG5cdFx0XHRyZXR1cm4gdChcIlByaW9yaXR5XCIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChwcm9wZXJ0eUtleSA9PT0gXCJzdGF0dXNcIikge1xyXG5cdFx0XHRyZXR1cm4gdChcIlN0YXR1c1wiKTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAocHJvcGVydHlLZXkgPT09IFwiZHVlRGF0ZVwiKSB7XHJcblx0XHRcdHJldHVybiB0KFwiRHVlIERhdGVcIik7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHByb3BlcnR5S2V5ID09PSBcInNjaGVkdWxlZERhdGVcIikge1xyXG5cdFx0XHRyZXR1cm4gdChcIlNjaGVkdWxlZCBEYXRlXCIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChwcm9wZXJ0eUtleSA9PT0gXCJzdGFydERhdGVcIikge1xyXG5cdFx0XHRyZXR1cm4gdChcIlN0YXJ0IERhdGVcIik7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHByb3BlcnR5S2V5ID09PSBcImZpbGVQYXRoXCIpIHtcclxuXHRcdFx0cmV0dXJuIHQoXCJGaWxlc1wiKTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoc291cmNlQ29uZmlnPy5uYW1lKSB7XHJcblx0XHRcdHJldHVybiBzb3VyY2VDb25maWcubmFtZTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdChcIkl0ZW1zXCIpO1xyXG5cdH1cclxuXHJcblx0b25PcGVuKCkge1xyXG5cdFx0dGhpcy5kaXNwbGF5KCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGRpc3BsYXkoKSB7XHJcblx0XHRjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcclxuXHRcdGNvbnRlbnRFbC5lbXB0eSgpO1xyXG5cdFx0dGhpcy5tb2RhbEVsLnRvZ2dsZUNsYXNzKFwidGFzay1nZW5pdXMtdmlldy1jb25maWctbW9kYWxcIiwgdHJ1ZSk7XHJcblxyXG5cdFx0Y29uc3QgZGF5cyA9IFtcclxuXHRcdFx0eyB2YWx1ZTogLTEsIG5hbWU6IHQoXCJMb2NhbGUgRGVmYXVsdFwiKSB9LCAvLyBVc2UgLTEgb3IgdW5kZWZpbmVkIGFzIHNlbnRpbmVsXHJcblx0XHRcdHtcclxuXHRcdFx0XHR2YWx1ZTogMCxcclxuXHRcdFx0XHRuYW1lOiBuZXcgSW50bC5EYXRlVGltZUZvcm1hdCh3aW5kb3cubmF2aWdhdG9yLmxhbmd1YWdlLCB7XHJcblx0XHRcdFx0XHR3ZWVrZGF5OiBcImxvbmdcIixcclxuXHRcdFx0XHR9KS5mb3JtYXQobmV3IERhdGUoMjAyNCwgMCwgNykpLFxyXG5cdFx0XHR9LCAvLyBTdW5kYXkgKDIwMjQtMDEtMDcgaXMgU3VuZGF5KVxyXG5cdFx0XHR7XHJcblx0XHRcdFx0dmFsdWU6IDEsXHJcblx0XHRcdFx0bmFtZTogbmV3IEludGwuRGF0ZVRpbWVGb3JtYXQod2luZG93Lm5hdmlnYXRvci5sYW5ndWFnZSwge1xyXG5cdFx0XHRcdFx0d2Vla2RheTogXCJsb25nXCIsXHJcblx0XHRcdFx0fSkuZm9ybWF0KG5ldyBEYXRlKDIwMjQsIDAsIDgpKSxcclxuXHRcdFx0fSwgLy8gTW9uZGF5ICgyMDI0LTAxLTA4IGlzIE1vbmRheSlcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHZhbHVlOiAyLFxyXG5cdFx0XHRcdG5hbWU6IG5ldyBJbnRsLkRhdGVUaW1lRm9ybWF0KHdpbmRvdy5uYXZpZ2F0b3IubGFuZ3VhZ2UsIHtcclxuXHRcdFx0XHRcdHdlZWtkYXk6IFwibG9uZ1wiLFxyXG5cdFx0XHRcdH0pLmZvcm1hdChuZXcgRGF0ZSgyMDI0LCAwLCA5KSksXHJcblx0XHRcdH0sIC8vIFR1ZXNkYXkgKDIwMjQtMDEtMDkgaXMgVHVlc2RheSlcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHZhbHVlOiAzLFxyXG5cdFx0XHRcdG5hbWU6IG5ldyBJbnRsLkRhdGVUaW1lRm9ybWF0KHdpbmRvdy5uYXZpZ2F0b3IubGFuZ3VhZ2UsIHtcclxuXHRcdFx0XHRcdHdlZWtkYXk6IFwibG9uZ1wiLFxyXG5cdFx0XHRcdH0pLmZvcm1hdChuZXcgRGF0ZSgyMDI0LCAwLCAxMCkpLFxyXG5cdFx0XHR9LCAvLyBXZWRuZXNkYXkgKDIwMjQtMDEtMTAgaXMgV2VkbmVzZGF5KVxyXG5cdFx0XHR7XHJcblx0XHRcdFx0dmFsdWU6IDQsXHJcblx0XHRcdFx0bmFtZTogbmV3IEludGwuRGF0ZVRpbWVGb3JtYXQod2luZG93Lm5hdmlnYXRvci5sYW5ndWFnZSwge1xyXG5cdFx0XHRcdFx0d2Vla2RheTogXCJsb25nXCIsXHJcblx0XHRcdFx0fSkuZm9ybWF0KG5ldyBEYXRlKDIwMjQsIDAsIDExKSksXHJcblx0XHRcdH0sIC8vIFRodXJzZGF5ICgyMDI0LTAxLTExIGlzIFRodXJzZGF5KVxyXG5cdFx0XHR7XHJcblx0XHRcdFx0dmFsdWU6IDUsXHJcblx0XHRcdFx0bmFtZTogbmV3IEludGwuRGF0ZVRpbWVGb3JtYXQod2luZG93Lm5hdmlnYXRvci5sYW5ndWFnZSwge1xyXG5cdFx0XHRcdFx0d2Vla2RheTogXCJsb25nXCIsXHJcblx0XHRcdFx0fSkuZm9ybWF0KG5ldyBEYXRlKDIwMjQsIDAsIDEyKSksXHJcblx0XHRcdH0sIC8vIEZyaWRheSAoMjAyNC0wMS0xMiBpcyBGcmlkYXkpXHJcblx0XHRcdHtcclxuXHRcdFx0XHR2YWx1ZTogNixcclxuXHRcdFx0XHRuYW1lOiBuZXcgSW50bC5EYXRlVGltZUZvcm1hdCh3aW5kb3cubmF2aWdhdG9yLmxhbmd1YWdlLCB7XHJcblx0XHRcdFx0XHR3ZWVrZGF5OiBcImxvbmdcIixcclxuXHRcdFx0XHR9KS5mb3JtYXQobmV3IERhdGUoMjAyNCwgMCwgMTMpKSxcclxuXHRcdFx0fSwgLy8gU2F0dXJkYXkgKDIwMjQtMDEtMTMgaXMgU2F0dXJkYXkpXHJcblx0XHRdO1xyXG5cclxuXHRcdC8vIOiuvue9ruagh+mimO+8jOWMuuWIhuS4jeWQjOaooeW8j1xyXG5cdFx0bGV0IHRpdGxlOiBzdHJpbmc7XHJcblx0XHRpZiAodGhpcy5pc0NyZWF0ZSkge1xyXG5cdFx0XHRpZiAodGhpcy5pc0NvcHlNb2RlKSB7XHJcblx0XHRcdFx0dGl0bGUgPSB0KFwiQ29weSB2aWV3OiBcIikgKyAodGhpcy5zb3VyY2VWaWV3SWQgfHwgXCJVbmtub3duXCIpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRpdGxlID0gdChcIkNyZWF0ZSBjdXN0b20gdmlld1wiKTtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGl0bGUgPSB0KFwiRWRpdCB2aWV3OiBcIikgKyB0aGlzLnZpZXdDb25maWcubmFtZTtcclxuXHRcdH1cclxuXHRcdHRoaXMudGl0bGVFbC5zZXRUZXh0KHRpdGxlKTtcclxuXHJcblx0XHQvLyDlnKjmi7fotJ3mqKHlvI/kuIvmmL7npLrmupDop4blm77kv6Hmga9cclxuXHRcdGlmICh0aGlzLmlzQ29weU1vZGUgJiYgdGhpcy5zb3VyY2VWaWV3SWQpIHtcclxuXHRcdFx0Y29uc3Qgc291cmNlVmlld0NvbmZpZyA9XHJcblx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3Mudmlld0NvbmZpZ3VyYXRpb24uZmluZChcclxuXHRcdFx0XHRcdCh2KSA9PiB2LmlkID09PSB0aGlzLnNvdXJjZVZpZXdJZCxcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRpZiAoc291cmNlVmlld0NvbmZpZykge1xyXG5cdFx0XHRcdGNvbnN0IGluZm9FbCA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwiY29weS1tb2RlLWluZm9cIiB9KTtcclxuXHRcdFx0XHRpbmZvRWwuY3JlYXRlRWwoXCJwXCIsIHtcclxuXHRcdFx0XHRcdHRleHQ6XHJcblx0XHRcdFx0XHRcdHQoXCJDcmVhdGluZyBhIGNvcHkgYmFzZWQgb246IFwiKSArIHNvdXJjZVZpZXdDb25maWcubmFtZSxcclxuXHRcdFx0XHRcdGNsczogXCJzZXR0aW5nLWl0ZW0tZGVzY3JpcHRpb25cIixcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRpbmZvRWwuY3JlYXRlRWwoXCJwXCIsIHtcclxuXHRcdFx0XHRcdHRleHQ6IHQoXHJcblx0XHRcdFx0XHRcdFwiWW91IGNhbiBtb2RpZnkgYWxsIHNldHRpbmdzIGJlbG93LiBUaGUgb3JpZ2luYWwgdmlldyB3aWxsIHJlbWFpbiB1bmNoYW5nZWQuXCIsXHJcblx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0Y2xzOiBcInNldHRpbmctaXRlbS1kZXNjcmlwdGlvblwiLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gLS0tIEJhc2ljIFZpZXcgU2V0dGluZ3MgLS0tXHJcblx0XHRuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUodChcIlZpZXcgTmFtZVwiKSkuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHR0aGlzLm5hbWVJbnB1dCA9IHRleHQ7XHJcblx0XHRcdHRleHQuc2V0VmFsdWUodGhpcy52aWV3Q29uZmlnLm5hbWUpLnNldFBsYWNlaG9sZGVyKFxyXG5cdFx0XHRcdHQoXCJNeSBDdXN0b20gVGFzayBWaWV3XCIpLFxyXG5cdFx0XHQpO1xyXG5cdFx0XHR0ZXh0Lm9uQ2hhbmdlKCgpID0+IHRoaXMuY2hlY2tGb3JDaGFuZ2VzKCkpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGVudEVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiSWNvbiBuYW1lXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XCJFbnRlciBhbnkgTHVjaWRlIGljb24gbmFtZSAoZS5nLiwgbGlzdC1jaGVja3MsIGZpbHRlciwgaW5ib3gpXCIsXHJcblx0XHRcdFx0KSxcclxuXHRcdFx0KVxyXG5cdFx0XHQuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHRcdHRleHQuaW5wdXRFbC5oaWRlKCk7XHJcblx0XHRcdFx0dGhpcy5pY29uSW5wdXQgPSB0ZXh0O1xyXG5cdFx0XHRcdHRleHQuc2V0VmFsdWUodGhpcy52aWV3Q29uZmlnLmljb24pLnNldFBsYWNlaG9sZGVyKFwibGlzdC1wbHVzXCIpO1xyXG5cdFx0XHRcdHRleHQub25DaGFuZ2UoKCkgPT4gdGhpcy5jaGVja0ZvckNoYW5nZXMoKSk7XHJcblx0XHRcdH0pXHJcblx0XHRcdC5hZGRCdXR0b24oKGJ0bikgPT4ge1xyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRidG4uc2V0SWNvbih0aGlzLnZpZXdDb25maWcuaWNvbik7XHJcblx0XHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIHNldHRpbmcgaWNvbjpcIiwgZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGF0dGFjaEljb25NZW51KGJ0biwge1xyXG5cdFx0XHRcdFx0Y29udGFpbmVyRWw6IHRoaXMubW9kYWxFbCxcclxuXHRcdFx0XHRcdHBsdWdpbjogdGhpcy5wbHVnaW4sXHJcblx0XHRcdFx0XHRvbkljb25TZWxlY3RlZDogKGljb25JZCkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWcuaWNvbiA9IGljb25JZDtcclxuXHRcdFx0XHRcdFx0dGhpcy5jaGVja0ZvckNoYW5nZXMoKTtcclxuXHRcdFx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdFx0XHRzZXRJY29uKGJ0bi5idXR0b25FbCwgaWNvbklkKTtcclxuXHRcdFx0XHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFcnJvciBzZXR0aW5nIGljb246XCIsIGUpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdHRoaXMuaWNvbklucHV0LnNldFZhbHVlKGljb25JZCk7XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHQvLyBBZGQgUmVnaW9uIHNldHRpbmcgZm9yIHNpZGViYXIgcG9zaXRpb25cclxuXHRcdC8vIERlZmF1bHQgdG8gJ2JvdHRvbScgZm9yIHNwZWNpZmljIHZpZXdzIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XHJcblx0XHRjb25zdCBib3R0b21WaWV3SWRzID0gW1wiaGFiaXRcIiwgXCJjYWxlbmRhclwiLCBcImdhbnR0XCIsIFwia2FuYmFuXCJdO1xyXG5cdFx0Y29uc3QgZGVmYXVsdFJlZ2lvbiA9IGJvdHRvbVZpZXdJZHMuaW5jbHVkZXModGhpcy52aWV3Q29uZmlnLmlkKVxyXG5cdFx0XHQ/IFwiYm90dG9tXCJcclxuXHRcdFx0OiBcInRvcFwiO1xyXG5cclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcclxuXHRcdFx0LnNldE5hbWUodChcIlNpZGViYXIgUG9zaXRpb25cIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcIkNob29zZSB3aGVyZSB0aGlzIHZpZXcgYXBwZWFycyBpbiB0aGUgc2lkZWJhci4gVmlld3MgaW4gdGhlIGJvdHRvbSBzZWN0aW9uIGFyZSB2aXN1YWxseSBzZXBhcmF0ZWQgZnJvbSB0b3Agc2VjdGlvbiB2aWV3cy5cIixcclxuXHRcdFx0XHQpLFxyXG5cdFx0XHQpXHJcblx0XHRcdC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcclxuXHRcdFx0XHRkcm9wZG93blxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcInRvcFwiLCB0KFwiVG9wIFNlY3Rpb25cIikpXHJcblx0XHRcdFx0XHQuYWRkT3B0aW9uKFwiYm90dG9tXCIsIHQoXCJCb3R0b20gU2VjdGlvblwiKSlcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZSh0aGlzLnZpZXdDb25maWcucmVnaW9uIHx8IGRlZmF1bHRSZWdpb24pXHJcblx0XHRcdFx0XHQub25DaGFuZ2UoKHZhbHVlOiBcInRvcFwiIHwgXCJib3R0b21cIikgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWcucmVnaW9uID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdHRoaXMuY2hlY2tGb3JDaGFuZ2VzKCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8g5qOA5p+l5piv5ZCm5Li65pel5Y6G6KeG5Zu+77yI5Y6f5aeLSUTmiJbmi7fotJ3nmoTml6Xljobop4blm77vvIlcclxuXHRcdGNvbnN0IGlzQ2FsZW5kYXJWaWV3ID1cclxuXHRcdFx0dGhpcy52aWV3Q29uZmlnLmlkID09PSBcImNhbGVuZGFyXCIgfHxcclxuXHRcdFx0KHRoaXMuaXNDb3B5TW9kZSAmJiB0aGlzLnNvdXJjZVZpZXdJZCA9PT0gXCJjYWxlbmRhclwiKSB8fFxyXG5cdFx0XHR0aGlzLnZpZXdDb25maWcuc3BlY2lmaWNDb25maWc/LnZpZXdUeXBlID09PSBcImNhbGVuZGFyXCI7XHJcblxyXG5cdFx0Ly8g5qOA5p+l5piv5ZCm5Li655yL5p2/6KeG5Zu+77yI5Y6f5aeLSUTmiJbmi7fotJ3nmoTnnIvmnb/op4blm77vvIlcclxuXHRcdGNvbnN0IGlzS2FuYmFuVmlldyA9XHJcblx0XHRcdHRoaXMudmlld0NvbmZpZy5pZCA9PT0gXCJrYW5iYW5cIiB8fFxyXG5cdFx0XHQodGhpcy5pc0NvcHlNb2RlICYmIHRoaXMuc291cmNlVmlld0lkID09PSBcImthbmJhblwiKSB8fFxyXG5cdFx0XHR0aGlzLnZpZXdDb25maWcuc3BlY2lmaWNDb25maWc/LnZpZXdUeXBlID09PSBcImthbmJhblwiO1xyXG5cclxuXHRcdC8vIOajgOafpeaYr+WQpuS4uumihOa1i+inhuWbvu+8iOWOn+Wni0lE5oiW5ou36LSd55qE6aKE5rWL6KeG5Zu+77yJXHJcblx0XHRjb25zdCBpc0ZvcmVjYXN0VmlldyA9XHJcblx0XHRcdHRoaXMudmlld0NvbmZpZy5pZCA9PT0gXCJmb3JlY2FzdFwiIHx8XHJcblx0XHRcdCh0aGlzLmlzQ29weU1vZGUgJiYgdGhpcy5zb3VyY2VWaWV3SWQgPT09IFwiZm9yZWNhc3RcIikgfHxcclxuXHRcdFx0dGhpcy52aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnPy52aWV3VHlwZSA9PT0gXCJmb3JlY2FzdFwiO1xyXG5cclxuXHRcdC8vIOajgOafpeaYr+WQpuS4uuWbm+ixoemZkOinhuWbvu+8iOWOn+Wni0lE5oiW5ou36LSd55qE5Zub6LGh6ZmQ6KeG5Zu+77yJXHJcblx0XHRjb25zdCBpc1F1YWRyYW50VmlldyA9XHJcblx0XHRcdHRoaXMudmlld0NvbmZpZy5pZCA9PT0gXCJxdWFkcmFudFwiIHx8XHJcblx0XHRcdCh0aGlzLmlzQ29weU1vZGUgJiYgdGhpcy5zb3VyY2VWaWV3SWQgPT09IFwicXVhZHJhbnRcIikgfHxcclxuXHRcdFx0dGhpcy52aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnPy52aWV3VHlwZSA9PT0gXCJxdWFkcmFudFwiO1xyXG5cclxuXHRcdGlmIChpc0NhbGVuZGFyVmlldykge1xyXG5cdFx0XHRuZXcgU2V0dGluZyhjb250ZW50RWwpXHJcblx0XHRcdFx0LnNldE5hbWUodChcIkZpcnN0IGRheSBvZiB3ZWVrXCIpKVxyXG5cdFx0XHRcdC5zZXREZXNjKHQoXCJPdmVycmlkZXMgdGhlIGxvY2FsZSBkZWZhdWx0IGZvciBjYWxlbmRhciB2aWV3cy5cIikpXHJcblx0XHRcdFx0LmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xyXG5cdFx0XHRcdFx0ZGF5cy5mb3JFYWNoKChkYXkpID0+IHtcclxuXHRcdFx0XHRcdFx0ZHJvcGRvd24uYWRkT3B0aW9uKFN0cmluZyhkYXkudmFsdWUpLCBkYXkubmFtZSk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRsZXQgaW5pdGlhbFZhbHVlID0gLTE7IC8vIERlZmF1bHQgdG8gJ0xvY2FsZSBEZWZhdWx0J1xyXG5cdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWcuc3BlY2lmaWNDb25maWc/LnZpZXdUeXBlID09PSBcImNhbGVuZGFyXCJcclxuXHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRpbml0aWFsVmFsdWUgPVxyXG5cdFx0XHRcdFx0XHRcdChcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdFx0XHQuc3BlY2lmaWNDb25maWcgYXMgQ2FsZW5kYXJTcGVjaWZpY0NvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdCkuZmlyc3REYXlPZldlZWsgPz8gLTE7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRkcm9wZG93bi5zZXRWYWx1ZShTdHJpbmcoaW5pdGlhbFZhbHVlKSk7XHJcblxyXG5cdFx0XHRcdFx0ZHJvcGRvd24ub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IG51bVZhbHVlID0gcGFyc2VJbnQodmFsdWUpO1xyXG5cdFx0XHRcdFx0XHRjb25zdCBuZXdGaXJzdERheU9mV2VlayA9XHJcblx0XHRcdFx0XHRcdFx0bnVtVmFsdWUgPT09IC0xID8gdW5kZWZpbmVkIDogbnVtVmFsdWU7XHJcblxyXG5cdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0IXRoaXMudmlld0NvbmZpZy5zcGVjaWZpY0NvbmZpZyB8fFxyXG5cdFx0XHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZy5zcGVjaWZpY0NvbmZpZy52aWV3VHlwZSAhPT1cclxuXHRcdFx0XHRcdFx0XHRcdFwiY2FsZW5kYXJcIlxyXG5cdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWcuc3BlY2lmaWNDb25maWcgPSB7XHJcblx0XHRcdFx0XHRcdFx0XHR2aWV3VHlwZTogXCJjYWxlbmRhclwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0Zmlyc3REYXlPZldlZWs6IG5ld0ZpcnN0RGF5T2ZXZWVrLFxyXG5cdFx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0KFxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnXHJcblx0XHRcdFx0XHRcdFx0XHRcdC5zcGVjaWZpY0NvbmZpZyBhcyBDYWxlbmRhclNwZWNpZmljQ29uZmlnXHJcblx0XHRcdFx0XHRcdFx0KS5maXJzdERheU9mV2VlayA9IG5ld0ZpcnN0RGF5T2ZXZWVrO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdHRoaXMuY2hlY2tGb3JDaGFuZ2VzKCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIEFkZCB3ZWVrZW5kIGhpZGluZyB0b2dnbGUgZm9yIGNhbGVuZGFyIHZpZXdcclxuXHRcdFx0bmV3IFNldHRpbmcoY29udGVudEVsKVxyXG5cdFx0XHRcdC5zZXROYW1lKHQoXCJIaWRlIHdlZWtlbmRzXCIpKVxyXG5cdFx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFx0XCJIaWRlIHdlZWtlbmQgY29sdW1ucyAoU2F0dXJkYXkgYW5kIFN1bmRheSkgaW4gY2FsZW5kYXIgdmlld3MuXCIsXHJcblx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdClcclxuXHRcdFx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcclxuXHRcdFx0XHRcdGNvbnN0IGN1cnJlbnRWYWx1ZSA9XHJcblx0XHRcdFx0XHRcdChcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWdcclxuXHRcdFx0XHRcdFx0XHRcdC5zcGVjaWZpY0NvbmZpZyBhcyBDYWxlbmRhclNwZWNpZmljQ29uZmlnXHJcblx0XHRcdFx0XHRcdCk/LmhpZGVXZWVrZW5kcyA/PyBmYWxzZTtcclxuXHRcdFx0XHRcdHRvZ2dsZS5zZXRWYWx1ZShjdXJyZW50VmFsdWUpO1xyXG5cdFx0XHRcdFx0dG9nZ2xlLm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0IXRoaXMudmlld0NvbmZpZy5zcGVjaWZpY0NvbmZpZyB8fFxyXG5cdFx0XHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZy5zcGVjaWZpY0NvbmZpZy52aWV3VHlwZSAhPT1cclxuXHRcdFx0XHRcdFx0XHRcdFwiY2FsZW5kYXJcIlxyXG5cdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWcuc3BlY2lmaWNDb25maWcgPSB7XHJcblx0XHRcdFx0XHRcdFx0XHR2aWV3VHlwZTogXCJjYWxlbmRhclwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0Zmlyc3REYXlPZldlZWs6IHVuZGVmaW5lZCxcclxuXHRcdFx0XHRcdFx0XHRcdGhpZGVXZWVrZW5kczogdmFsdWUsXHJcblx0XHRcdFx0XHRcdFx0fTtcclxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHQoXHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWdcclxuXHRcdFx0XHRcdFx0XHRcdFx0LnNwZWNpZmljQ29uZmlnIGFzIENhbGVuZGFyU3BlY2lmaWNDb25maWdcclxuXHRcdFx0XHRcdFx0XHQpLmhpZGVXZWVrZW5kcyA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdHRoaXMuY2hlY2tGb3JDaGFuZ2VzKCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdH0gZWxzZSBpZiAoaXNLYW5iYW5WaWV3KSB7XHJcblx0XHRcdG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcclxuXHRcdFx0XHQuc2V0TmFtZSh0KFwiR3JvdXAgYnlcIikpXHJcblx0XHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0XHR0KFwiU2VsZWN0IHdoaWNoIHRhc2sgcHJvcGVydHkgdG8gdXNlIGZvciBjcmVhdGluZyBjb2x1bW5zXCIpLFxyXG5cdFx0XHRcdClcclxuXHRcdFx0XHQuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XHJcblx0XHRcdFx0XHRkcm9wZG93blxyXG5cdFx0XHRcdFx0XHQuYWRkT3B0aW9uKFwic3RhdHVzXCIsIHQoXCJTdGF0dXNcIikpXHJcblx0XHRcdFx0XHRcdC5hZGRPcHRpb24oXCJwcmlvcml0eVwiLCB0KFwiUHJpb3JpdHlcIikpXHJcblx0XHRcdFx0XHRcdC5hZGRPcHRpb24oXCJ0YWdzXCIsIHQoXCJUYWdzXCIpKVxyXG5cdFx0XHRcdFx0XHQuYWRkT3B0aW9uKFwicHJvamVjdFwiLCB0KFwiUHJvamVjdFwiKSlcclxuXHRcdFx0XHRcdFx0LmFkZE9wdGlvbihcImR1ZURhdGVcIiwgdChcIkR1ZSBEYXRlXCIpKVxyXG5cdFx0XHRcdFx0XHQuYWRkT3B0aW9uKFwic2NoZWR1bGVkRGF0ZVwiLCB0KFwiU2NoZWR1bGVkIERhdGVcIikpXHJcblx0XHRcdFx0XHRcdC5hZGRPcHRpb24oXCJzdGFydERhdGVcIiwgdChcIlN0YXJ0IERhdGVcIikpXHJcblx0XHRcdFx0XHRcdC5hZGRPcHRpb24oXCJjb250ZXh0XCIsIHQoXCJDb250ZXh0XCIpKVxyXG5cdFx0XHRcdFx0XHQuYWRkT3B0aW9uKFwiZmlsZVBhdGhcIiwgdChcIkZpbGUgUGF0aFwiKSlcclxuXHRcdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRcdChcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdFx0XHQuc3BlY2lmaWNDb25maWcgYXMgS2FuYmFuU3BlY2lmaWNDb25maWdcclxuXHRcdFx0XHRcdFx0XHQpPy5ncm91cEJ5IHx8IFwic3RhdHVzXCIsXHJcblx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHRcdCF0aGlzLnZpZXdDb25maWcuc3BlY2lmaWNDb25maWcgfHxcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZy5zcGVjaWZpY0NvbmZpZy52aWV3VHlwZSAhPT1cclxuXHRcdFx0XHRcdFx0XHRcdFx0XCJrYW5iYW5cIlxyXG5cdFx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnID0ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR2aWV3VHlwZTogXCJrYW5iYW5cIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0c2hvd0NoZWNrYm94OiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRoaWRlRW1wdHlDb2x1bW5zOiBmYWxzZSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0ZGVmYXVsdFNvcnRGaWVsZDogXCJwcmlvcml0eVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRkZWZhdWx0U29ydE9yZGVyOiBcImRlc2NcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0Z3JvdXBCeTogdmFsdWUgYXMgYW55LFxyXG5cdFx0XHRcdFx0XHRcdFx0fTtcclxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdFx0KFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWdcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQuc3BlY2lmaWNDb25maWcgYXMgS2FuYmFuU3BlY2lmaWNDb25maWdcclxuXHRcdFx0XHRcdFx0XHRcdCkuZ3JvdXBCeSA9IHZhbHVlIGFzIGFueTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5jaGVja0ZvckNoYW5nZXMoKTtcclxuXHRcdFx0XHRcdFx0XHQvLyBSZWZyZXNoIHRoZSBtb2RhbCB0byBzaG93L2hpZGUgY3VzdG9tIGNvbHVtbnMgc2V0dGluZ3NcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmRpc3BsYXkoKTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRuZXcgU2V0dGluZyhjb250ZW50RWwpXHJcblx0XHRcdFx0LnNldE5hbWUodChcIlNob3cgY2hlY2tib3hcIikpXHJcblx0XHRcdFx0LnNldERlc2ModChcIlNob3cgYSBjaGVja2JveCBmb3IgZWFjaCB0YXNrIGluIHRoZSBrYW5iYW4gdmlldy5cIikpXHJcblx0XHRcdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XHJcblx0XHRcdFx0XHR0b2dnbGUuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRcdCh0aGlzLnZpZXdDb25maWcuc3BlY2lmaWNDb25maWcgYXMgS2FuYmFuU3BlY2lmaWNDb25maWcpXHJcblx0XHRcdFx0XHRcdFx0Py5zaG93Q2hlY2tib3ggYXMgYm9vbGVhbixcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR0b2dnbGUub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHQhdGhpcy52aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnIHx8XHJcblx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnLnZpZXdUeXBlICE9PSBcImthbmJhblwiXHJcblx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZy5zcGVjaWZpY0NvbmZpZyA9IHtcclxuXHRcdFx0XHRcdFx0XHRcdHZpZXdUeXBlOiBcImthbmJhblwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0c2hvd0NoZWNrYm94OiB2YWx1ZSxcclxuXHRcdFx0XHRcdFx0XHRcdGhpZGVFbXB0eUNvbHVtbnM6IGZhbHNlLFxyXG5cdFx0XHRcdFx0XHRcdFx0ZGVmYXVsdFNvcnRGaWVsZDogXCJwcmlvcml0eVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0ZGVmYXVsdFNvcnRPcmRlcjogXCJkZXNjXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRncm91cEJ5OiBcInN0YXR1c1wiLFxyXG5cdFx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0KFxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnXHJcblx0XHRcdFx0XHRcdFx0XHRcdC5zcGVjaWZpY0NvbmZpZyBhcyBLYW5iYW5TcGVjaWZpY0NvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdCkuc2hvd0NoZWNrYm94ID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0dGhpcy5jaGVja0ZvckNoYW5nZXMoKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0bmV3IFNldHRpbmcoY29udGVudEVsKVxyXG5cdFx0XHRcdC5zZXROYW1lKHQoXCJIaWRlIGVtcHR5IGNvbHVtbnNcIikpXHJcblx0XHRcdFx0LnNldERlc2ModChcIkhpZGUgY29sdW1ucyB0aGF0IGhhdmUgbm8gdGFza3MuXCIpKVxyXG5cdFx0XHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xyXG5cdFx0XHRcdFx0dG9nZ2xlLnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHQodGhpcy52aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnIGFzIEthbmJhblNwZWNpZmljQ29uZmlnKVxyXG5cdFx0XHRcdFx0XHRcdD8uaGlkZUVtcHR5Q29sdW1ucyBhcyBib29sZWFuLFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdHRvZ2dsZS5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdCF0aGlzLnZpZXdDb25maWcuc3BlY2lmaWNDb25maWcgfHxcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWcuc3BlY2lmaWNDb25maWcudmlld1R5cGUgIT09IFwia2FuYmFuXCJcclxuXHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnID0ge1xyXG5cdFx0XHRcdFx0XHRcdFx0dmlld1R5cGU6IFwia2FuYmFuXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRzaG93Q2hlY2tib3g6IHRydWUsXHJcblx0XHRcdFx0XHRcdFx0XHRoaWRlRW1wdHlDb2x1bW5zOiB2YWx1ZSxcclxuXHRcdFx0XHRcdFx0XHRcdGRlZmF1bHRTb3J0RmllbGQ6IFwicHJpb3JpdHlcIixcclxuXHRcdFx0XHRcdFx0XHRcdGRlZmF1bHRTb3J0T3JkZXI6IFwiZGVzY1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0Z3JvdXBCeTogXCJzdGF0dXNcIixcclxuXHRcdFx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdChcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdFx0XHQuc3BlY2lmaWNDb25maWcgYXMgS2FuYmFuU3BlY2lmaWNDb25maWdcclxuXHRcdFx0XHRcdFx0XHQpLmhpZGVFbXB0eUNvbHVtbnMgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR0aGlzLmNoZWNrRm9yQ2hhbmdlcygpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRuZXcgU2V0dGluZyhjb250ZW50RWwpXHJcblx0XHRcdFx0LnNldE5hbWUodChcIkRlZmF1bHQgc29ydCBmaWVsZFwiKSlcclxuXHRcdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHRcdHQoXCJEZWZhdWx0IGZpZWxkIHRvIHNvcnQgdGFza3MgYnkgd2l0aGluIGVhY2ggY29sdW1uLlwiKSxcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0LmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xyXG5cdFx0XHRcdFx0ZHJvcGRvd25cclxuXHRcdFx0XHRcdFx0LmFkZE9wdGlvbihcInByaW9yaXR5XCIsIHQoXCJQcmlvcml0eVwiKSlcclxuXHRcdFx0XHRcdFx0LmFkZE9wdGlvbihcImR1ZURhdGVcIiwgdChcIkR1ZSBEYXRlXCIpKVxyXG5cdFx0XHRcdFx0XHQuYWRkT3B0aW9uKFwic2NoZWR1bGVkRGF0ZVwiLCB0KFwiU2NoZWR1bGVkIERhdGVcIikpXHJcblx0XHRcdFx0XHRcdC5hZGRPcHRpb24oXCJzdGFydERhdGVcIiwgdChcIlN0YXJ0IERhdGVcIikpXHJcblx0XHRcdFx0XHRcdC5hZGRPcHRpb24oXCJjcmVhdGVkRGF0ZVwiLCB0KFwiQ3JlYXRlZCBEYXRlXCIpKVxyXG5cdFx0XHRcdFx0XHQuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRcdFx0KFxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnXHJcblx0XHRcdFx0XHRcdFx0XHRcdC5zcGVjaWZpY0NvbmZpZyBhcyBLYW5iYW5TcGVjaWZpY0NvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdCk/LmRlZmF1bHRTb3J0RmllbGQgfHwgXCJwcmlvcml0eVwiLFxyXG5cdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0XHQhdGhpcy52aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnIHx8XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWcuc3BlY2lmaWNDb25maWcudmlld1R5cGUgIT09XHJcblx0XHRcdFx0XHRcdFx0XHRcdFwia2FuYmFuXCJcclxuXHRcdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZy5zcGVjaWZpY0NvbmZpZyA9IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dmlld1R5cGU6IFwia2FuYmFuXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdHNob3dDaGVja2JveDogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0aGlkZUVtcHR5Q29sdW1uczogZmFsc2UsXHJcblx0XHRcdFx0XHRcdFx0XHRcdGRlZmF1bHRTb3J0RmllbGQ6IHZhbHVlIGFzIGFueSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0ZGVmYXVsdFNvcnRPcmRlcjogXCJkZXNjXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdGdyb3VwQnk6IFwic3RhdHVzXCIsXHJcblx0XHRcdFx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0XHQoXHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdC5zcGVjaWZpY0NvbmZpZyBhcyBLYW5iYW5TcGVjaWZpY0NvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdFx0KS5kZWZhdWx0U29ydEZpZWxkID0gdmFsdWUgYXMgYW55O1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR0aGlzLmNoZWNrRm9yQ2hhbmdlcygpO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcclxuXHRcdFx0XHQuc2V0TmFtZSh0KFwiRGVmYXVsdCBzb3J0IG9yZGVyXCIpKVxyXG5cdFx0XHRcdC5zZXREZXNjKHQoXCJEZWZhdWx0IG9yZGVyIHRvIHNvcnQgdGFza3Mgd2l0aGluIGVhY2ggY29sdW1uLlwiKSlcclxuXHRcdFx0XHQuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XHJcblx0XHRcdFx0XHRkcm9wZG93blxyXG5cdFx0XHRcdFx0XHQuYWRkT3B0aW9uKFwiYXNjXCIsIHQoXCJBc2NlbmRpbmdcIikpXHJcblx0XHRcdFx0XHRcdC5hZGRPcHRpb24oXCJkZXNjXCIsIHQoXCJEZXNjZW5kaW5nXCIpKVxyXG5cdFx0XHRcdFx0XHQuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRcdFx0KFxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnXHJcblx0XHRcdFx0XHRcdFx0XHRcdC5zcGVjaWZpY0NvbmZpZyBhcyBLYW5iYW5TcGVjaWZpY0NvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdCk/LmRlZmF1bHRTb3J0T3JkZXIgfHwgXCJkZXNjXCIsXHJcblx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHRcdCF0aGlzLnZpZXdDb25maWcuc3BlY2lmaWNDb25maWcgfHxcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZy5zcGVjaWZpY0NvbmZpZy52aWV3VHlwZSAhPT1cclxuXHRcdFx0XHRcdFx0XHRcdFx0XCJrYW5iYW5cIlxyXG5cdFx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnID0ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR2aWV3VHlwZTogXCJrYW5iYW5cIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0c2hvd0NoZWNrYm94OiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRoaWRlRW1wdHlDb2x1bW5zOiBmYWxzZSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0ZGVmYXVsdFNvcnRGaWVsZDogXCJwcmlvcml0eVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRkZWZhdWx0U29ydE9yZGVyOiB2YWx1ZSBhcyBhbnksXHJcblx0XHRcdFx0XHRcdFx0XHRcdGdyb3VwQnk6IFwic3RhdHVzXCIsXHJcblx0XHRcdFx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0XHQoXHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdC5zcGVjaWZpY0NvbmZpZyBhcyBLYW5iYW5TcGVjaWZpY0NvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdFx0KS5kZWZhdWx0U29ydE9yZGVyID0gdmFsdWUgYXMgYW55O1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR0aGlzLmNoZWNrRm9yQ2hhbmdlcygpO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIEN1c3RvbSBjb2x1bW5zIGNvbmZpZ3VyYXRpb24gZm9yIG5vbi1zdGF0dXMgZ3JvdXBpbmdcclxuXHRcdFx0Y29uc3Qga2FuYmFuQ29uZmlnID0gdGhpcy52aWV3Q29uZmlnXHJcblx0XHRcdFx0LnNwZWNpZmljQ29uZmlnIGFzIEthbmJhblNwZWNpZmljQ29uZmlnO1xyXG5cdFx0XHRpZiAoa2FuYmFuQ29uZmlnPy5ncm91cEJ5ICYmIGthbmJhbkNvbmZpZy5ncm91cEJ5ICE9PSBcInN0YXR1c1wiKSB7XHJcblx0XHRcdFx0bmV3IFNldHRpbmcoY29udGVudEVsKVxyXG5cdFx0XHRcdFx0LnNldE5hbWUodChcIkN1c3RvbSBDb2x1bW5zXCIpKVxyXG5cdFx0XHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcdFx0XCJDb25maWd1cmUgY3VzdG9tIGNvbHVtbnMgZm9yIHRoZSBzZWxlY3RlZCBncm91cGluZyBwcm9wZXJ0eVwiLFxyXG5cdFx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0LnNldEhlYWRpbmcoKTtcclxuXHJcblx0XHRcdFx0Y29uc3QgY29sdW1uc0NvbnRhaW5lciA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdFx0Y2xzOiBcImthbmJhbi1jb2x1bW5zLWNvbnRhaW5lclwiLFxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRjb25zdCByZWZyZXNoQ29sdW1uc0xpc3QgPSAoKSA9PiB7XHJcblx0XHRcdFx0XHRjb2x1bW5zQ29udGFpbmVyLmVtcHR5KCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gRW5zdXJlIGN1c3RvbUNvbHVtbnMgZXhpc3RzXHJcblx0XHRcdFx0XHRpZiAoIWthbmJhbkNvbmZpZy5jdXN0b21Db2x1bW5zKSB7XHJcblx0XHRcdFx0XHRcdGthbmJhbkNvbmZpZy5jdXN0b21Db2x1bW5zID0gW107XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Y29uc3QgY29sdW1ucyA9IGthbmJhbkNvbmZpZy5jdXN0b21Db2x1bW5zO1xyXG5cclxuXHRcdFx0XHRcdGlmIChjb2x1bW5zLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRcdFx0XHRjb2x1bW5zQ29udGFpbmVyLmNyZWF0ZUVsKFwicFwiLCB7XHJcblx0XHRcdFx0XHRcdFx0dGV4dDogdChcclxuXHRcdFx0XHRcdFx0XHRcdFwiTm8gY3VzdG9tIGNvbHVtbnMgZGVmaW5lZC4gQWRkIGNvbHVtbnMgYmVsb3cuXCIsXHJcblx0XHRcdFx0XHRcdFx0KSxcclxuXHRcdFx0XHRcdFx0XHRjbHM6IFwic2V0dGluZy1pdGVtLWRlc2NyaXB0aW9uXCIsXHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdGNvbHVtbnMuZm9yRWFjaCgoY29sdW1uLCBpbmRleCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBjb2x1bW5TZXR0aW5nID0gbmV3IFNldHRpbmcoY29sdW1uc0NvbnRhaW5lcilcclxuXHRcdFx0XHRcdFx0XHQuc2V0Q2xhc3MoXCJrYW5iYW4tY29sdW1uLXJvd1wiKVxyXG5cdFx0XHRcdFx0XHRcdC5hZGRUZXh0KCh0ZXh0KSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHR0ZXh0LnNldFZhbHVlKGNvbHVtbi50aXRsZSlcclxuXHRcdFx0XHRcdFx0XHRcdFx0LnNldFBsYWNlaG9sZGVyKHQoXCJDb2x1bW4gVGl0bGVcIikpXHJcblx0XHRcdFx0XHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRpZiAoa2FuYmFuQ29uZmlnLmN1c3RvbUNvbHVtbnMpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGthbmJhbkNvbmZpZy5jdXN0b21Db2x1bW5zW1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRpbmRleFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XS50aXRsZSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5jaGVja0ZvckNoYW5nZXMoKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0XHRcdFx0LmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdHRleHQuc2V0VmFsdWUoY29sdW1uLnZhbHVlPy50b1N0cmluZygpIHx8IFwiXCIpXHJcblx0XHRcdFx0XHRcdFx0XHRcdC5zZXRQbGFjZWhvbGRlcih0KFwiVmFsdWVcIikpXHJcblx0XHRcdFx0XHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRpZiAoa2FuYmFuQ29uZmlnLmN1c3RvbUNvbHVtbnMpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8vIEhhbmRsZSBkaWZmZXJlbnQgdmFsdWUgdHlwZXMgYmFzZWQgb24gZ3JvdXBCeVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0bGV0IHBhcnNlZFZhbHVlOlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR8IHN0cmluZ1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR8IG51bWJlclxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR8IG51bGwgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0a2FuYmFuQ29uZmlnLmdyb3VwQnkgPT09XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XCJwcmlvcml0eVwiICYmXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHZhbHVlXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgbnVtVmFsdWUgPVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHBhcnNlSW50KHZhbHVlKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0cGFyc2VkVmFsdWUgPSBpc05hTihudW1WYWx1ZSlcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQ/IHZhbHVlXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0OiBudW1WYWx1ZTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGthbmJhbkNvbmZpZy5jdXN0b21Db2x1bW5zW1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRpbmRleFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XS52YWx1ZSA9IHBhcnNlZFZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5jaGVja0ZvckNoYW5nZXMoKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gQ29udHJvbHMgZm9yIHJlb3JkZXJpbmcgYW5kIGRlbGV0aW5nXHJcblx0XHRcdFx0XHRcdGNvbHVtblNldHRpbmcuYWRkRXh0cmFCdXR0b24oKGJ1dHRvbikgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdGJ1dHRvblxyXG5cdFx0XHRcdFx0XHRcdFx0LnNldEljb24oXCJhcnJvdy11cFwiKVxyXG5cdFx0XHRcdFx0XHRcdFx0LnNldFRvb2x0aXAodChcIk1vdmUgVXBcIikpXHJcblx0XHRcdFx0XHRcdFx0XHQuc2V0RGlzYWJsZWQoaW5kZXggPT09IDApXHJcblx0XHRcdFx0XHRcdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRpbmRleCA+IDAgJiZcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRrYW5iYW5Db25maWcuY3VzdG9tQ29sdW1uc1xyXG5cdFx0XHRcdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBpdGVtID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGthbmJhbkNvbmZpZy5jdXN0b21Db2x1bW5zLnNwbGljZShcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0aW5kZXgsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdDEsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQpWzBdO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGthbmJhbkNvbmZpZy5jdXN0b21Db2x1bW5zLnNwbGljZShcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGluZGV4IC0gMSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdDAsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRpdGVtLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gVXBkYXRlIG9yZGVyIHZhbHVlc1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGthbmJhbkNvbmZpZy5jdXN0b21Db2x1bW5zLmZvckVhY2goXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQoY29sLCBpKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNvbC5vcmRlciA9IGk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5jaGVja0ZvckNoYW5nZXMoKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZWZyZXNoQ29sdW1uc0xpc3QoKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRjb2x1bW5TZXR0aW5nLmFkZEV4dHJhQnV0dG9uKChidXR0b24pID0+IHtcclxuXHRcdFx0XHRcdFx0XHRidXR0b25cclxuXHRcdFx0XHRcdFx0XHRcdC5zZXRJY29uKFwiYXJyb3ctZG93blwiKVxyXG5cdFx0XHRcdFx0XHRcdFx0LnNldFRvb2x0aXAodChcIk1vdmUgRG93blwiKSlcclxuXHRcdFx0XHRcdFx0XHRcdC5zZXREaXNhYmxlZChpbmRleCA9PT0gY29sdW1ucy5sZW5ndGggLSAxKVxyXG5cdFx0XHRcdFx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0aW5kZXggPCBjb2x1bW5zLmxlbmd0aCAtIDEgJiZcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRrYW5iYW5Db25maWcuY3VzdG9tQ29sdW1uc1xyXG5cdFx0XHRcdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBpdGVtID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGthbmJhbkNvbmZpZy5jdXN0b21Db2x1bW5zLnNwbGljZShcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0aW5kZXgsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdDEsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQpWzBdO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGthbmJhbkNvbmZpZy5jdXN0b21Db2x1bW5zLnNwbGljZShcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGluZGV4ICsgMSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdDAsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRpdGVtLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gVXBkYXRlIG9yZGVyIHZhbHVlc1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGthbmJhbkNvbmZpZy5jdXN0b21Db2x1bW5zLmZvckVhY2goXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQoY29sLCBpKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNvbC5vcmRlciA9IGk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5jaGVja0ZvckNoYW5nZXMoKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZWZyZXNoQ29sdW1uc0xpc3QoKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRjb2x1bW5TZXR0aW5nLmFkZEV4dHJhQnV0dG9uKChidXR0b24pID0+IHtcclxuXHRcdFx0XHRcdFx0XHRidXR0b25cclxuXHRcdFx0XHRcdFx0XHRcdC5zZXRJY29uKFwidHJhc2hcIilcclxuXHRcdFx0XHRcdFx0XHRcdC5zZXRUb29sdGlwKHQoXCJSZW1vdmUgQ29sdW1uXCIpKVxyXG5cdFx0XHRcdFx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoa2FuYmFuQ29uZmlnLmN1c3RvbUNvbHVtbnMpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRrYW5iYW5Db25maWcuY3VzdG9tQ29sdW1ucy5zcGxpY2UoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRpbmRleCxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdDEsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBVcGRhdGUgb3JkZXIgdmFsdWVzXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0a2FuYmFuQ29uZmlnLmN1c3RvbUNvbHVtbnMuZm9yRWFjaChcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdChjb2wsIGkpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y29sLm9yZGVyID0gaTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmNoZWNrRm9yQ2hhbmdlcygpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJlZnJlc2hDb2x1bW5zTGlzdCgpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0XHRidXR0b24uZXh0cmFTZXR0aW5nc0VsLmFkZENsYXNzKFwibW9kLXdhcm5pbmdcIik7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gQnV0dG9uIHRvIGFkZCBhIG5ldyBjb2x1bW5cclxuXHRcdFx0XHRcdG5ldyBTZXR0aW5nKGNvbHVtbnNDb250YWluZXIpXHJcblx0XHRcdFx0XHRcdC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdGJ1dHRvblxyXG5cdFx0XHRcdFx0XHRcdFx0LnNldEJ1dHRvblRleHQodChcIkFkZCBDb2x1bW5cIikpXHJcblx0XHRcdFx0XHRcdFx0XHQuc2V0Q3RhKClcclxuXHRcdFx0XHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKCFrYW5iYW5Db25maWcuY3VzdG9tQ29sdW1ucykge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGthbmJhbkNvbmZpZy5jdXN0b21Db2x1bW5zID0gW107XHJcblx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgbmV3Q29sdW1uID0ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGlkOiBgY29sdW1uXyR7RGF0ZS5ub3coKX1gLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRpdGxlOiB0KFwiTmV3IENvbHVtblwiKSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR2YWx1ZTogXCJcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRvcmRlcjoga2FuYmFuQ29uZmlnLmN1c3RvbUNvbHVtbnNcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdC5sZW5ndGgsXHJcblx0XHRcdFx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHRcdFx0XHRcdGthbmJhbkNvbmZpZy5jdXN0b21Db2x1bW5zLnB1c2gobmV3Q29sdW1uKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5jaGVja0ZvckNoYW5nZXMoKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0cmVmcmVzaENvbHVtbnNMaXN0KCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0fSlcclxuXHRcdFx0XHRcdFx0LmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0YnV0dG9uXHJcblx0XHRcdFx0XHRcdFx0XHQuc2V0QnV0dG9uVGV4dCh0KFwiUmVzZXQgQ29sdW1uc1wiKSlcclxuXHRcdFx0XHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKGthbmJhbkNvbmZpZy5jdXN0b21Db2x1bW5zKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0a2FuYmFuQ29uZmlnLmN1c3RvbUNvbHVtbnMgPSBbXTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmNoZWNrRm9yQ2hhbmdlcygpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJlZnJlc2hDb2x1bW5zTGlzdCgpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0cmVmcmVzaENvbHVtbnNMaXN0KCk7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSBpZiAoaXNGb3JlY2FzdFZpZXcpIHtcclxuXHRcdFx0bmV3IFNldHRpbmcoY29udGVudEVsKVxyXG5cdFx0XHRcdC5zZXROYW1lKHQoXCJGaXJzdCBkYXkgb2Ygd2Vla1wiKSlcclxuXHRcdFx0XHQuc2V0RGVzYyh0KFwiT3ZlcnJpZGVzIHRoZSBsb2NhbGUgZGVmYXVsdCBmb3IgZm9yZWNhc3Qgdmlld3MuXCIpKVxyXG5cdFx0XHRcdC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcclxuXHRcdFx0XHRcdGRheXMuZm9yRWFjaCgoZGF5KSA9PiB7XHJcblx0XHRcdFx0XHRcdGRyb3Bkb3duLmFkZE9wdGlvbihTdHJpbmcoZGF5LnZhbHVlKSwgZGF5Lm5hbWUpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0bGV0IGluaXRpYWxWYWx1ZSA9IC0xOyAvLyBEZWZhdWx0IHRvICdMb2NhbGUgRGVmYXVsdCdcclxuXHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnPy52aWV3VHlwZSA9PT0gXCJmb3JlY2FzdFwiXHJcblx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0aW5pdGlhbFZhbHVlID1cclxuXHRcdFx0XHRcdFx0XHQoXHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWdcclxuXHRcdFx0XHRcdFx0XHRcdFx0LnNwZWNpZmljQ29uZmlnIGFzIEZvcmVjYXN0U3BlY2lmaWNDb25maWdcclxuXHRcdFx0XHRcdFx0XHQpLmZpcnN0RGF5T2ZXZWVrID8/IC0xO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0ZHJvcGRvd24uc2V0VmFsdWUoU3RyaW5nKGluaXRpYWxWYWx1ZSkpO1xyXG5cclxuXHRcdFx0XHRcdGRyb3Bkb3duLm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBudW1WYWx1ZSA9IHBhcnNlSW50KHZhbHVlKTtcclxuXHRcdFx0XHRcdFx0Y29uc3QgbmV3Rmlyc3REYXlPZldlZWsgPVxyXG5cdFx0XHRcdFx0XHRcdG51bVZhbHVlID09PSAtMSA/IHVuZGVmaW5lZCA6IG51bVZhbHVlO1xyXG5cclxuXHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdCF0aGlzLnZpZXdDb25maWcuc3BlY2lmaWNDb25maWcgfHxcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWcuc3BlY2lmaWNDb25maWcudmlld1R5cGUgIT09XHJcblx0XHRcdFx0XHRcdFx0XHRcImZvcmVjYXN0XCJcclxuXHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnID0ge1xyXG5cdFx0XHRcdFx0XHRcdFx0dmlld1R5cGU6IFwiZm9yZWNhc3RcIixcclxuXHRcdFx0XHRcdFx0XHRcdGZpcnN0RGF5T2ZXZWVrOiBuZXdGaXJzdERheU9mV2VlayxcclxuXHRcdFx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdChcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdFx0XHQuc3BlY2lmaWNDb25maWcgYXMgRm9yZWNhc3RTcGVjaWZpY0NvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdCkuZmlyc3REYXlPZldlZWsgPSBuZXdGaXJzdERheU9mV2VlaztcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR0aGlzLmNoZWNrRm9yQ2hhbmdlcygpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBBZGQgd2Vla2VuZCBoaWRpbmcgdG9nZ2xlIGZvciBmb3JlY2FzdCB2aWV3XHJcblx0XHRcdG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcclxuXHRcdFx0XHQuc2V0TmFtZSh0KFwiSGlkZSB3ZWVrZW5kc1wiKSlcclxuXHRcdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcdFwiSGlkZSB3ZWVrZW5kIGNvbHVtbnMgKFNhdHVyZGF5IGFuZCBTdW5kYXkpIGluIGZvcmVjYXN0IGNhbGVuZGFyLlwiLFxyXG5cdFx0XHRcdFx0KSxcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XHJcblx0XHRcdFx0XHRjb25zdCBjdXJyZW50VmFsdWUgPVxyXG5cdFx0XHRcdFx0XHQoXHJcblx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnXHJcblx0XHRcdFx0XHRcdFx0XHQuc3BlY2lmaWNDb25maWcgYXMgRm9yZWNhc3RTcGVjaWZpY0NvbmZpZ1xyXG5cdFx0XHRcdFx0XHQpPy5oaWRlV2Vla2VuZHMgPz8gZmFsc2U7XHJcblx0XHRcdFx0XHR0b2dnbGUuc2V0VmFsdWUoY3VycmVudFZhbHVlKTtcclxuXHRcdFx0XHRcdHRvZ2dsZS5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdCF0aGlzLnZpZXdDb25maWcuc3BlY2lmaWNDb25maWcgfHxcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWcuc3BlY2lmaWNDb25maWcudmlld1R5cGUgIT09XHJcblx0XHRcdFx0XHRcdFx0XHRcImZvcmVjYXN0XCJcclxuXHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnID0ge1xyXG5cdFx0XHRcdFx0XHRcdFx0dmlld1R5cGU6IFwiZm9yZWNhc3RcIixcclxuXHRcdFx0XHRcdFx0XHRcdGZpcnN0RGF5T2ZXZWVrOiB1bmRlZmluZWQsXHJcblx0XHRcdFx0XHRcdFx0XHRoaWRlV2Vla2VuZHM6IHZhbHVlLFxyXG5cdFx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0KFxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnXHJcblx0XHRcdFx0XHRcdFx0XHRcdC5zcGVjaWZpY0NvbmZpZyBhcyBGb3JlY2FzdFNwZWNpZmljQ29uZmlnXHJcblx0XHRcdFx0XHRcdFx0KS5oaWRlV2Vla2VuZHMgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR0aGlzLmNoZWNrRm9yQ2hhbmdlcygpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9IGVsc2UgaWYgKGlzUXVhZHJhbnRWaWV3KSB7XHJcblx0XHRcdG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcclxuXHRcdFx0XHQuc2V0TmFtZSh0KFwiUXVhZHJhbnQgQ2xhc3NpZmljYXRpb24gTWV0aG9kXCIpKVxyXG5cdFx0XHRcdC5zZXREZXNjKHQoXCJDaG9vc2UgaG93IHRvIGNsYXNzaWZ5IHRhc2tzIGludG8gcXVhZHJhbnRzXCIpKVxyXG5cdFx0XHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc3QgY3VycmVudFZhbHVlID1cclxuXHRcdFx0XHRcdFx0KFxyXG5cdFx0XHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdFx0LnNwZWNpZmljQ29uZmlnIGFzIFF1YWRyYW50U3BlY2lmaWNDb25maWdcclxuXHRcdFx0XHRcdFx0KT8udXNlUHJpb3JpdHlGb3JDbGFzc2lmaWNhdGlvbiA/PyBmYWxzZTtcclxuXHRcdFx0XHRcdHRvZ2dsZS5zZXRWYWx1ZShjdXJyZW50VmFsdWUpO1xyXG5cdFx0XHRcdFx0dG9nZ2xlLm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0IXRoaXMudmlld0NvbmZpZy5zcGVjaWZpY0NvbmZpZyB8fFxyXG5cdFx0XHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZy5zcGVjaWZpY0NvbmZpZy52aWV3VHlwZSAhPT1cclxuXHRcdFx0XHRcdFx0XHRcdFwicXVhZHJhbnRcIlxyXG5cdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWcuc3BlY2lmaWNDb25maWcgPSB7XHJcblx0XHRcdFx0XHRcdFx0XHR2aWV3VHlwZTogXCJxdWFkcmFudFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0aGlkZUVtcHR5UXVhZHJhbnRzOiBmYWxzZSxcclxuXHRcdFx0XHRcdFx0XHRcdGF1dG9VcGRhdGVQcmlvcml0eTogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0XHRcdGF1dG9VcGRhdGVUYWdzOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRcdFx0c2hvd1Rhc2tDb3VudDogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0XHRcdGRlZmF1bHRTb3J0RmllbGQ6IFwicHJpb3JpdHlcIixcclxuXHRcdFx0XHRcdFx0XHRcdGRlZmF1bHRTb3J0T3JkZXI6IFwiZGVzY1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dXJnZW50VGFnOiBcIiN1cmdlbnRcIixcclxuXHRcdFx0XHRcdFx0XHRcdGltcG9ydGFudFRhZzogXCIjaW1wb3J0YW50XCIsXHJcblx0XHRcdFx0XHRcdFx0XHR1cmdlbnRUaHJlc2hvbGREYXlzOiAzLFxyXG5cdFx0XHRcdFx0XHRcdFx0dXNlUHJpb3JpdHlGb3JDbGFzc2lmaWNhdGlvbjogdmFsdWUsXHJcblx0XHRcdFx0XHRcdFx0XHR1cmdlbnRQcmlvcml0eVRocmVzaG9sZDogNCxcclxuXHRcdFx0XHRcdFx0XHRcdGltcG9ydGFudFByaW9yaXR5VGhyZXNob2xkOiAzLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y3VzdG9tUXVhZHJhbnRDb2xvcnM6IGZhbHNlLFxyXG5cdFx0XHRcdFx0XHRcdFx0cXVhZHJhbnRDb2xvcnM6IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dXJnZW50SW1wb3J0YW50OiBcIiNkYzM1NDVcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0bm90VXJnZW50SW1wb3J0YW50OiBcIiMyOGE3NDVcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0dXJnZW50Tm90SW1wb3J0YW50OiBcIiNmZmMxMDdcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0bm90VXJnZW50Tm90SW1wb3J0YW50OiBcIiM2Yzc1N2RcIixcclxuXHRcdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0fTtcclxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHQoXHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWdcclxuXHRcdFx0XHRcdFx0XHRcdFx0LnNwZWNpZmljQ29uZmlnIGFzIFF1YWRyYW50U3BlY2lmaWNDb25maWdcclxuXHRcdFx0XHRcdFx0XHQpLnVzZVByaW9yaXR5Rm9yQ2xhc3NpZmljYXRpb24gPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR0aGlzLmNoZWNrRm9yQ2hhbmdlcygpO1xyXG5cdFx0XHRcdFx0XHQvLyBSZWZyZXNoIHRoZSBtb2RhbCB0byBzaG93L2hpZGUgcmVsZXZhbnQgc2V0dGluZ3NcclxuXHRcdFx0XHRcdFx0dGhpcy5kaXNwbGF5KCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IHF1YWRyYW50Q29uZmlnID0gdGhpcy52aWV3Q29uZmlnXHJcblx0XHRcdFx0LnNwZWNpZmljQ29uZmlnIGFzIFF1YWRyYW50U3BlY2lmaWNDb25maWc7XHJcblx0XHRcdGNvbnN0IHVzZVByaW9yaXR5Q2xhc3NpZmljYXRpb24gPVxyXG5cdFx0XHRcdHF1YWRyYW50Q29uZmlnPy51c2VQcmlvcml0eUZvckNsYXNzaWZpY2F0aW9uID8/IGZhbHNlO1xyXG5cclxuXHRcdFx0aWYgKHVzZVByaW9yaXR5Q2xhc3NpZmljYXRpb24pIHtcclxuXHRcdFx0XHQvLyBQcmlvcml0eS1iYXNlZCBjbGFzc2lmaWNhdGlvbiBzZXR0aW5nc1xyXG5cdFx0XHRcdG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcclxuXHRcdFx0XHRcdC5zZXROYW1lKHQoXCJVcmdlbnQgUHJpb3JpdHkgVGhyZXNob2xkXCIpKVxyXG5cdFx0XHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcdFx0XCJUYXNrcyB3aXRoIHByaW9yaXR5ID49IHRoaXMgdmFsdWUgYXJlIGNvbnNpZGVyZWQgdXJnZW50ICgxLTUpXCIsXHJcblx0XHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHQuYWRkU2xpZGVyKChzbGlkZXIpID0+IHtcclxuXHRcdFx0XHRcdFx0c2xpZGVyXHJcblx0XHRcdFx0XHRcdFx0LnNldExpbWl0cygxLCA1LCAxKVxyXG5cdFx0XHRcdFx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdFx0XHRcdHF1YWRyYW50Q29uZmlnPy51cmdlbnRQcmlvcml0eVRocmVzaG9sZCA/PyA0LFxyXG5cdFx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0XHQuc2V0RHluYW1pY1Rvb2x0aXAoKVxyXG5cdFx0XHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnPy52aWV3VHlwZSA9PT1cclxuXHRcdFx0XHRcdFx0XHRcdFx0XCJxdWFkcmFudFwiXHJcblx0XHRcdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0KFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0LnNwZWNpZmljQ29uZmlnIGFzIFF1YWRyYW50U3BlY2lmaWNDb25maWdcclxuXHRcdFx0XHRcdFx0XHRcdFx0KS51cmdlbnRQcmlvcml0eVRocmVzaG9sZCA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmNoZWNrRm9yQ2hhbmdlcygpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcclxuXHRcdFx0XHRcdC5zZXROYW1lKHQoXCJJbXBvcnRhbnQgUHJpb3JpdHkgVGhyZXNob2xkXCIpKVxyXG5cdFx0XHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcdFx0XCJUYXNrcyB3aXRoIHByaW9yaXR5ID49IHRoaXMgdmFsdWUgYXJlIGNvbnNpZGVyZWQgaW1wb3J0YW50ICgxLTUpXCIsXHJcblx0XHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHQuYWRkU2xpZGVyKChzbGlkZXIpID0+IHtcclxuXHRcdFx0XHRcdFx0c2xpZGVyXHJcblx0XHRcdFx0XHRcdFx0LnNldExpbWl0cygxLCA1LCAxKVxyXG5cdFx0XHRcdFx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdFx0XHRcdHF1YWRyYW50Q29uZmlnPy5pbXBvcnRhbnRQcmlvcml0eVRocmVzaG9sZCA/PyAzLFxyXG5cdFx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0XHQuc2V0RHluYW1pY1Rvb2x0aXAoKVxyXG5cdFx0XHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnPy52aWV3VHlwZSA9PT1cclxuXHRcdFx0XHRcdFx0XHRcdFx0XCJxdWFkcmFudFwiXHJcblx0XHRcdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0KFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0LnNwZWNpZmljQ29uZmlnIGFzIFF1YWRyYW50U3BlY2lmaWNDb25maWdcclxuXHRcdFx0XHRcdFx0XHRcdFx0KS5pbXBvcnRhbnRQcmlvcml0eVRocmVzaG9sZCA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmNoZWNrRm9yQ2hhbmdlcygpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gVGFnLWJhc2VkIGNsYXNzaWZpY2F0aW9uIHNldHRpbmdzXHJcblx0XHRcdFx0bmV3IFNldHRpbmcoY29udGVudEVsKVxyXG5cdFx0XHRcdFx0LnNldE5hbWUodChcIlVyZ2VudCBUYWdcIikpXHJcblx0XHRcdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFx0XHRcIlRhZyB0byBpZGVudGlmeSB1cmdlbnQgdGFza3MgKGUuZy4sICN1cmdlbnQsICNmaXJlKVwiLFxyXG5cdFx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0LmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0XHRcdFx0dGV4dC5zZXRWYWx1ZShxdWFkcmFudENvbmZpZz8udXJnZW50VGFnID8/IFwiI3VyZ2VudFwiKVxyXG5cdFx0XHRcdFx0XHRcdC5zZXRQbGFjZWhvbGRlcihcIiN1cmdlbnRcIilcclxuXHRcdFx0XHRcdFx0XHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZy5zcGVjaWZpY0NvbmZpZz8udmlld1R5cGUgPT09XHJcblx0XHRcdFx0XHRcdFx0XHRcdFwicXVhZHJhbnRcIlxyXG5cdFx0XHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdChcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWdcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdC5zcGVjaWZpY0NvbmZpZyBhcyBRdWFkcmFudFNwZWNpZmljQ29uZmlnXHJcblx0XHRcdFx0XHRcdFx0XHRcdCkudXJnZW50VGFnID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuY2hlY2tGb3JDaGFuZ2VzKCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0bmV3IFNldHRpbmcoY29udGVudEVsKVxyXG5cdFx0XHRcdFx0LnNldE5hbWUodChcIkltcG9ydGFudCBUYWdcIikpXHJcblx0XHRcdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFx0XHRcIlRhZyB0byBpZGVudGlmeSBpbXBvcnRhbnQgdGFza3MgKGUuZy4sICNpbXBvcnRhbnQsICNrZXkpXCIsXHJcblx0XHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHQuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0ZXh0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRcdHF1YWRyYW50Q29uZmlnPy5pbXBvcnRhbnRUYWcgPz8gXCIjaW1wb3J0YW50XCIsXHJcblx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0XHQuc2V0UGxhY2Vob2xkZXIoXCIjaW1wb3J0YW50XCIpXHJcblx0XHRcdFx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWcuc3BlY2lmaWNDb25maWc/LnZpZXdUeXBlID09PVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcInF1YWRyYW50XCJcclxuXHRcdFx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHQoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQuc3BlY2lmaWNDb25maWcgYXMgUXVhZHJhbnRTcGVjaWZpY0NvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdFx0XHQpLmltcG9ydGFudFRhZyA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmNoZWNrRm9yQ2hhbmdlcygpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcclxuXHRcdFx0XHRcdC5zZXROYW1lKHQoXCJVcmdlbnQgVGhyZXNob2xkIERheXNcIikpXHJcblx0XHRcdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFx0XHRcIlRhc2tzIGR1ZSB3aXRoaW4gdGhpcyBtYW55IGRheXMgYXJlIGNvbnNpZGVyZWQgdXJnZW50XCIsXHJcblx0XHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHQuYWRkU2xpZGVyKChzbGlkZXIpID0+IHtcclxuXHRcdFx0XHRcdFx0c2xpZGVyXHJcblx0XHRcdFx0XHRcdFx0LnNldExpbWl0cygxLCAxNCwgMSlcclxuXHRcdFx0XHRcdFx0XHQuc2V0VmFsdWUocXVhZHJhbnRDb25maWc/LnVyZ2VudFRocmVzaG9sZERheXMgPz8gMylcclxuXHRcdFx0XHRcdFx0XHQuc2V0RHluYW1pY1Rvb2x0aXAoKVxyXG5cdFx0XHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnPy52aWV3VHlwZSA9PT1cclxuXHRcdFx0XHRcdFx0XHRcdFx0XCJxdWFkcmFudFwiXHJcblx0XHRcdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0KFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0LnNwZWNpZmljQ29uZmlnIGFzIFF1YWRyYW50U3BlY2lmaWNDb25maWdcclxuXHRcdFx0XHRcdFx0XHRcdFx0KS51cmdlbnRUaHJlc2hvbGREYXlzID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuY2hlY2tGb3JDaGFuZ2VzKCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ29tbW9uIHF1YWRyYW50IHNldHRpbmdzXHJcblx0XHRcdG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcclxuXHRcdFx0XHQuc2V0TmFtZSh0KFwiQXV0byBVcGRhdGUgUHJpb3JpdHlcIikpXHJcblx0XHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XHRcIkF1dG9tYXRpY2FsbHkgdXBkYXRlIHRhc2sgcHJpb3JpdHkgd2hlbiBtb3ZlZCBiZXR3ZWVuIHF1YWRyYW50c1wiLFxyXG5cdFx0XHRcdFx0KSxcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XHJcblx0XHRcdFx0XHR0b2dnbGVcclxuXHRcdFx0XHRcdFx0LnNldFZhbHVlKHF1YWRyYW50Q29uZmlnPy5hdXRvVXBkYXRlUHJpb3JpdHkgPz8gdHJ1ZSlcclxuXHRcdFx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZy5zcGVjaWZpY0NvbmZpZz8udmlld1R5cGUgPT09XHJcblx0XHRcdFx0XHRcdFx0XHRcInF1YWRyYW50XCJcclxuXHRcdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdChcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0LnNwZWNpZmljQ29uZmlnIGFzIFF1YWRyYW50U3BlY2lmaWNDb25maWdcclxuXHRcdFx0XHRcdFx0XHRcdCkuYXV0b1VwZGF0ZVByaW9yaXR5ID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLmNoZWNrRm9yQ2hhbmdlcygpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRuZXcgU2V0dGluZyhjb250ZW50RWwpXHJcblx0XHRcdFx0LnNldE5hbWUodChcIkF1dG8gVXBkYXRlIFRhZ3NcIikpXHJcblx0XHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XHRcIkF1dG9tYXRpY2FsbHkgYWRkL3JlbW92ZSB1cmdlbnQvaW1wb3J0YW50IHRhZ3Mgd2hlbiBtb3ZlZCBiZXR3ZWVuIHF1YWRyYW50c1wiLFxyXG5cdFx0XHRcdFx0KSxcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XHJcblx0XHRcdFx0XHR0b2dnbGVcclxuXHRcdFx0XHRcdFx0LnNldFZhbHVlKHF1YWRyYW50Q29uZmlnPy5hdXRvVXBkYXRlVGFncyA/PyB0cnVlKVxyXG5cdFx0XHRcdFx0XHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnPy52aWV3VHlwZSA9PT1cclxuXHRcdFx0XHRcdFx0XHRcdFwicXVhZHJhbnRcIlxyXG5cdFx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0KFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWdcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQuc3BlY2lmaWNDb25maWcgYXMgUXVhZHJhbnRTcGVjaWZpY0NvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdFx0KS5hdXRvVXBkYXRlVGFncyA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5jaGVja0ZvckNoYW5nZXMoKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0bmV3IFNldHRpbmcoY29udGVudEVsKVxyXG5cdFx0XHRcdC5zZXROYW1lKHQoXCJIaWRlIEVtcHR5IFF1YWRyYW50c1wiKSlcclxuXHRcdFx0XHQuc2V0RGVzYyh0KFwiSGlkZSBxdWFkcmFudHMgdGhhdCBoYXZlIG5vIHRhc2tzXCIpKVxyXG5cdFx0XHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xyXG5cdFx0XHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0XHRcdC5zZXRWYWx1ZShxdWFkcmFudENvbmZpZz8uaGlkZUVtcHR5UXVhZHJhbnRzID8/IGZhbHNlKVxyXG5cdFx0XHRcdFx0XHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnPy52aWV3VHlwZSA9PT1cclxuXHRcdFx0XHRcdFx0XHRcdFwicXVhZHJhbnRcIlxyXG5cdFx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0KFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWdcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQuc3BlY2lmaWNDb25maWcgYXMgUXVhZHJhbnRTcGVjaWZpY0NvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdFx0KS5oaWRlRW1wdHlRdWFkcmFudHMgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMuY2hlY2tGb3JDaGFuZ2VzKCk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBUd28gQ29sdW1uIFZpZXcgc3BlY2lmaWMgY29uZmlnXHJcblx0XHRpZiAoXHJcblx0XHRcdHRoaXMuaXNDcmVhdGUgfHxcclxuXHRcdFx0dGhpcy52aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnPy52aWV3VHlwZSA9PT0gXCJ0d29jb2x1bW5cIiB8fFxyXG5cdFx0XHR0aGlzLnZpZXdDb25maWcudHlwZSA9PT0gXCJjdXN0b21cIiAvLyDoh6rlrprkuYnop4blm77mgLvmmK/lj6/ku6XliIfmjaLluIPlsYBcclxuXHRcdCkge1xyXG5cdFx0XHQvLyBGb3IgY3VzdG9tIHZpZXdzLCBhbGxvdyBjaGFuZ2luZyB2aWV3IHR5cGUgZXZlbiBpbiBlZGl0IG1vZGVcclxuXHRcdFx0Ly8g5a+55LqO6Ieq5a6a5LmJ6KeG5Zu+77yM57yW6L6R5qih5byP5LiL5Lmf5YWB6K645YiH5o2i6KeG5Zu+57G75Z6LXHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHQodGhpcy5pc0NyZWF0ZSAmJiAhdGhpcy5pc0NvcHlNb2RlKSB8fFxyXG5cdFx0XHRcdHRoaXMudmlld0NvbmZpZy50eXBlID09PSBcImN1c3RvbVwiXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcclxuXHRcdFx0XHRcdC5zZXROYW1lKHQoXCJWaWV3IHR5cGVcIikpXHJcblx0XHRcdFx0XHQuc2V0RGVzYyh0KFwiU2VsZWN0IHRoZSB0eXBlIG9mIHZpZXcgdG8gY3JlYXRlXCIpKVxyXG5cdFx0XHRcdFx0LmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xyXG5cdFx0XHRcdFx0XHRkcm9wZG93blxyXG5cdFx0XHRcdFx0XHRcdC5hZGRPcHRpb24oXCJzdGFuZGFyZFwiLCB0KFwiU3RhbmRhcmQgdmlld1wiKSlcclxuXHRcdFx0XHRcdFx0XHQuYWRkT3B0aW9uKFwidHdvY29sdW1uXCIsIHQoXCJUd28gY29sdW1uIHZpZXdcIikpXHJcblx0XHRcdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnPy52aWV3VHlwZSA9PT1cclxuXHRcdFx0XHRcdFx0XHRcdFx0XCJ0d29jb2x1bW5cIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ/IFwidHdvY29sdW1uXCJcclxuXHRcdFx0XHRcdFx0XHRcdFx0OiBcInN0YW5kYXJkXCIsXHJcblx0XHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdGlmICh2YWx1ZSA9PT0gXCJ0d29jb2x1bW5cIikge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBDcmVhdGUgYSBuZXcgVHdvQ29sdW1uU3BlY2lmaWNDb25maWdcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnID0ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHZpZXdUeXBlOiBcInR3b2NvbHVtblwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRhc2tQcm9wZXJ0eUtleTogXCJ0YWdzXCIsIC8vIERlZmF1bHQgdG8gdGFnc1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGxlZnRDb2x1bW5UaXRsZTogdChcIkl0ZW1zXCIpLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJpZ2h0Q29sdW1uRGVmYXVsdFRpdGxlOiB0KFwiVGFza3NcIiksXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0bXVsdGlTZWxlY3RUZXh0OiB0KFwic2VsZWN0ZWQgaXRlbXNcIiksXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZW1wdHlTdGF0ZVRleHQ6IHQoXCJObyBpdGVtcyBzZWxlY3RlZFwiKSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0fTtcclxuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdC8vIFJlbW92ZSBzcGVjaWZpY0NvbmZpZyBpZiBub3QgbmVlZGVkXHJcblx0XHRcdFx0XHRcdFx0XHRcdGRlbGV0ZSB0aGlzLnZpZXdDb25maWcuc3BlY2lmaWNDb25maWc7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLmNoZWNrRm9yQ2hhbmdlcygpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdC8vIFJlZnJlc2ggdGhlIG1vZGFsIHRvIHNob3cvaGlkZSB0aGUgdHdvIGNvbHVtbiBzcGVjaWZpYyBzZXR0aW5nc1xyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5kaXNwbGF5KCk7XHJcblx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gT25seSBzaG93IFR3b0NvbHVtbiBzcGVjaWZpYyBzZXR0aW5ncyBpZiB0aGUgdmlldyB0eXBlIGlzIHR3b2NvbHVtblxyXG5cdFx0XHRpZiAodGhpcy52aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnPy52aWV3VHlwZSA9PT0gXCJ0d29jb2x1bW5cIikge1xyXG5cdFx0XHRcdG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcclxuXHRcdFx0XHRcdC5zZXROYW1lKHQoXCJUd28gY29sdW1uIHZpZXcgc2V0dGluZ3NcIikpXHJcblx0XHRcdFx0XHQuc2V0SGVhZGluZygpO1xyXG5cclxuXHRcdFx0XHQvLyBUYXNrIFByb3BlcnR5IEtleSBzZWxlY3RvclxyXG5cdFx0XHRcdG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcclxuXHRcdFx0XHRcdC5zZXROYW1lKHQoXCJHcm91cCBieSB0YXNrIHByb3BlcnR5XCIpKVxyXG5cdFx0XHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcdFx0XCJTZWxlY3Qgd2hpY2ggdGFzayBwcm9wZXJ0eSB0byB1c2UgZm9yIGxlZnQgY29sdW1uIGdyb3VwaW5nXCIsXHJcblx0XHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHQuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XHJcblx0XHRcdFx0XHRcdGRyb3Bkb3duXHJcblx0XHRcdFx0XHRcdFx0LmFkZE9wdGlvbihcInRhZ3NcIiwgdChcIlRhZ3NcIikpXHJcblx0XHRcdFx0XHRcdFx0LmFkZE9wdGlvbihcInByb2plY3RcIiwgdChcIlByb2plY3RcIikpXHJcblx0XHRcdFx0XHRcdFx0LmFkZE9wdGlvbihcInByaW9yaXR5XCIsIHQoXCJQcmlvcml0eVwiKSlcclxuXHRcdFx0XHRcdFx0XHQuYWRkT3B0aW9uKFwiY29udGV4dFwiLCB0KFwiQ29udGV4dFwiKSlcclxuXHRcdFx0XHRcdFx0XHQuYWRkT3B0aW9uKFwic3RhdHVzXCIsIHQoXCJTdGF0dXNcIikpXHJcblx0XHRcdFx0XHRcdFx0LmFkZE9wdGlvbihcImR1ZURhdGVcIiwgdChcIkR1ZSBEYXRlXCIpKVxyXG5cdFx0XHRcdFx0XHRcdC5hZGRPcHRpb24oXCJzY2hlZHVsZWREYXRlXCIsIHQoXCJTY2hlZHVsZWQgRGF0ZVwiKSlcclxuXHRcdFx0XHRcdFx0XHQuYWRkT3B0aW9uKFwic3RhcnREYXRlXCIsIHQoXCJTdGFydCBEYXRlXCIpKVxyXG5cdFx0XHRcdFx0XHRcdC5hZGRPcHRpb24oXCJmaWxlUGF0aFwiLCB0KFwiRmlsZSBQYXRoXCIpKVxyXG5cdFx0XHRcdFx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdFx0XHRcdChcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0LnNwZWNpZmljQ29uZmlnIGFzIFR3b0NvbHVtblNwZWNpZmljQ29uZmlnXHJcblx0XHRcdFx0XHRcdFx0XHQpLnRhc2tQcm9wZXJ0eUtleSB8fCBcInRhZ3NcIixcclxuXHRcdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWcuc3BlY2lmaWNDb25maWc/LnZpZXdUeXBlID09PVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcInR3b2NvbHVtblwiXHJcblx0XHRcdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0KFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0LnNwZWNpZmljQ29uZmlnIGFzIFR3b0NvbHVtblNwZWNpZmljQ29uZmlnXHJcblx0XHRcdFx0XHRcdFx0XHRcdCkudGFza1Byb3BlcnR5S2V5ID0gdmFsdWU7XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBTZXQgYXBwcm9wcmlhdGUgZGVmYXVsdCB0aXRsZXMgYmFzZWQgb24gdGhlIHNlbGVjdGVkIHByb3BlcnR5XHJcblx0XHRcdFx0XHRcdFx0XHRcdGlmICghdGhpcy5sZWZ0Q29sdW1uVGl0bGVJbnB1dC5nZXRWYWx1ZSgpKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0bGV0IHRpdGxlID0gdChcIkl0ZW1zXCIpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHN3aXRjaCAodmFsdWUpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNhc2UgXCJ0YWdzXCI6XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHRpdGxlID0gdChcIlRhZ3NcIik7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y2FzZSBcInByb2plY3RcIjpcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0dGl0bGUgPSB0KFwiUHJvamVjdHNcIik7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y2FzZSBcInByaW9yaXR5XCI6XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHRpdGxlID0gdChcIlByaW9yaXRpZXNcIik7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y2FzZSBcImNvbnRleHRcIjpcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0dGl0bGUgPSB0KFwiQ29udGV4dHNcIik7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y2FzZSBcInN0YXR1c1wiOlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0aXRsZSA9IHQoXCJTdGF0dXNcIik7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y2FzZSBcImR1ZURhdGVcIjpcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0dGl0bGUgPSB0KFwiRHVlIERhdGVzXCIpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNhc2UgXCJzY2hlZHVsZWREYXRlXCI6XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHRpdGxlID0gdChcIlNjaGVkdWxlZCBEYXRlc1wiKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjYXNlIFwic3RhcnREYXRlXCI6XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHRpdGxlID0gdChcIlN0YXJ0IERhdGVzXCIpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNhc2UgXCJmaWxlUGF0aFwiOlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0aXRsZSA9IHQoXCJGaWxlc1wiKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMubGVmdENvbHVtblRpdGxlSW5wdXQuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0aXRsZSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdChcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQuc3BlY2lmaWNDb25maWcgYXMgVHdvQ29sdW1uU3BlY2lmaWNDb25maWdcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQpLmxlZnRDb2x1bW5UaXRsZSA9IHRpdGxlO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmNoZWNrRm9yQ2hhbmdlcygpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIExlZnQgQ29sdW1uIFRpdGxlXHJcblx0XHRcdFx0bmV3IFNldHRpbmcoY29udGVudEVsKVxyXG5cdFx0XHRcdFx0LnNldE5hbWUodChcIkxlZnQgY29sdW1uIHRpdGxlXCIpKVxyXG5cdFx0XHRcdFx0LnNldERlc2ModChcIlRpdGxlIGZvciB0aGUgbGVmdCBjb2x1bW4gKGl0ZW1zIGxpc3QpXCIpKVxyXG5cdFx0XHRcdFx0LmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5sZWZ0Q29sdW1uVGl0bGVJbnB1dCA9IHRleHQ7XHJcblx0XHRcdFx0XHRcdHRleHQuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRcdFx0KFxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnXHJcblx0XHRcdFx0XHRcdFx0XHRcdC5zcGVjaWZpY0NvbmZpZyBhcyBUd29Db2x1bW5TcGVjaWZpY0NvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdCkubGVmdENvbHVtblRpdGxlIHx8IHQoXCJJdGVtc1wiKSxcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0dGV4dC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWcuc3BlY2lmaWNDb25maWc/LnZpZXdUeXBlID09PVxyXG5cdFx0XHRcdFx0XHRcdFx0XCJ0d29jb2x1bW5cIlxyXG5cdFx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0KFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWdcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQuc3BlY2lmaWNDb25maWcgYXMgVHdvQ29sdW1uU3BlY2lmaWNDb25maWdcclxuXHRcdFx0XHRcdFx0XHRcdCkubGVmdENvbHVtblRpdGxlID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLmNoZWNrRm9yQ2hhbmdlcygpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gUmlnaHQgQ29sdW1uIFRpdGxlXHJcblx0XHRcdFx0bmV3IFNldHRpbmcoY29udGVudEVsKVxyXG5cdFx0XHRcdFx0LnNldE5hbWUodChcIlJpZ2h0IGNvbHVtbiB0aXRsZVwiKSlcclxuXHRcdFx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdFx0XHR0KFwiRGVmYXVsdCB0aXRsZSBmb3IgdGhlIHJpZ2h0IGNvbHVtbiAodGFza3MgbGlzdClcIiksXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHQuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnJpZ2h0Q29sdW1uVGl0bGVJbnB1dCA9IHRleHQ7XHJcblx0XHRcdFx0XHRcdHRleHQuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRcdFx0KFxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnXHJcblx0XHRcdFx0XHRcdFx0XHRcdC5zcGVjaWZpY0NvbmZpZyBhcyBUd29Db2x1bW5TcGVjaWZpY0NvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdCkucmlnaHRDb2x1bW5EZWZhdWx0VGl0bGUgfHwgdChcIlRhc2tzXCIpLFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHR0ZXh0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZy5zcGVjaWZpY0NvbmZpZz8udmlld1R5cGUgPT09XHJcblx0XHRcdFx0XHRcdFx0XHRcInR3b2NvbHVtblwiXHJcblx0XHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0XHQoXHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdC5zcGVjaWZpY0NvbmZpZyBhcyBUd29Db2x1bW5TcGVjaWZpY0NvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdFx0KS5yaWdodENvbHVtbkRlZmF1bHRUaXRsZSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5jaGVja0ZvckNoYW5nZXMoKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIE11bHRpLXNlbGVjdCBUZXh0XHJcblx0XHRcdFx0bmV3IFNldHRpbmcoY29udGVudEVsKVxyXG5cdFx0XHRcdFx0LnNldE5hbWUodChcIk11bHRpLXNlbGVjdCBUZXh0XCIpKVxyXG5cdFx0XHRcdFx0LnNldERlc2ModChcIlRleHQgdG8gc2hvdyB3aGVuIG11bHRpcGxlIGl0ZW1zIGFyZSBzZWxlY3RlZFwiKSlcclxuXHRcdFx0XHRcdC5hZGRUZXh0KCh0ZXh0KSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMubXVsdGlTZWxlY3RUZXh0SW5wdXQgPSB0ZXh0O1xyXG5cdFx0XHRcdFx0XHR0ZXh0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRcdChcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdFx0XHQuc3BlY2lmaWNDb25maWcgYXMgVHdvQ29sdW1uU3BlY2lmaWNDb25maWdcclxuXHRcdFx0XHRcdFx0XHQpLm11bHRpU2VsZWN0VGV4dCB8fCB0KFwic2VsZWN0ZWQgaXRlbXNcIiksXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdHRleHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnPy52aWV3VHlwZSA9PT1cclxuXHRcdFx0XHRcdFx0XHRcdFwidHdvY29sdW1uXCJcclxuXHRcdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdChcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0LnNwZWNpZmljQ29uZmlnIGFzIFR3b0NvbHVtblNwZWNpZmljQ29uZmlnXHJcblx0XHRcdFx0XHRcdFx0XHQpLm11bHRpU2VsZWN0VGV4dCA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5jaGVja0ZvckNoYW5nZXMoKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIEVtcHR5IFN0YXRlIFRleHRcclxuXHRcdFx0XHRuZXcgU2V0dGluZyhjb250ZW50RWwpXHJcblx0XHRcdFx0XHQuc2V0TmFtZSh0KFwiRW1wdHkgc3RhdGUgdGV4dFwiKSlcclxuXHRcdFx0XHRcdC5zZXREZXNjKHQoXCJUZXh0IHRvIHNob3cgd2hlbiBubyBpdGVtcyBhcmUgc2VsZWN0ZWRcIikpXHJcblx0XHRcdFx0XHQuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLmVtcHR5U3RhdGVUZXh0SW5wdXQgPSB0ZXh0O1xyXG5cdFx0XHRcdFx0XHR0ZXh0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRcdChcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdFx0XHQuc3BlY2lmaWNDb25maWcgYXMgVHdvQ29sdW1uU3BlY2lmaWNDb25maWdcclxuXHRcdFx0XHRcdFx0XHQpLmVtcHR5U3RhdGVUZXh0IHx8IHQoXCJObyBpdGVtcyBzZWxlY3RlZFwiKSxcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0dGV4dC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWcuc3BlY2lmaWNDb25maWc/LnZpZXdUeXBlID09PVxyXG5cdFx0XHRcdFx0XHRcdFx0XCJ0d29jb2x1bW5cIlxyXG5cdFx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0KFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWdcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQuc3BlY2lmaWNDb25maWcgYXMgVHdvQ29sdW1uU3BlY2lmaWNDb25maWdcclxuXHRcdFx0XHRcdFx0XHRcdCkuZW1wdHlTdGF0ZVRleHQgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMuY2hlY2tGb3JDaGFuZ2VzKCk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gLS0tIEZpbHRlciBSdWxlcyAtLS1cclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZSh0KFwiRmlsdGVyIFJ1bGVzXCIpKS5zZXRIZWFkaW5nKCk7XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGVudEVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiSGlkZSBjb21wbGV0ZWQgYW5kIGFiYW5kb25lZCB0YXNrc1wiKSlcclxuXHRcdFx0LnNldERlc2ModChcIkhpZGUgY29tcGxldGVkIGFuZCBhYmFuZG9uZWQgdGFza3MgaW4gdGhpcyB2aWV3LlwiKSlcclxuXHRcdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XHJcblx0XHRcdFx0dG9nZ2xlLnNldFZhbHVlKHRoaXMudmlld0NvbmZpZy5oaWRlQ29tcGxldGVkQW5kQWJhbmRvbmVkVGFza3MpO1xyXG5cdFx0XHRcdHRvZ2dsZS5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZy5oaWRlQ29tcGxldGVkQW5kQWJhbmRvbmVkVGFza3MgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdHRoaXMuY2hlY2tGb3JDaGFuZ2VzKCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcclxuXHRcdFx0LnNldE5hbWUodChcIkZpbHRlciBibGFua3NcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJGaWx0ZXIgb3V0IGJsYW5rIHRhc2tzIGluIHRoaXMgdmlldy5cIikpXHJcblx0XHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xyXG5cdFx0XHRcdHRvZ2dsZS5zZXRWYWx1ZSh0aGlzLnZpZXdDb25maWcuZmlsdGVyQmxhbmtzKTtcclxuXHRcdFx0XHR0b2dnbGUub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWcuZmlsdGVyQmxhbmtzID0gdmFsdWU7XHJcblx0XHRcdFx0XHR0aGlzLmNoZWNrRm9yQ2hhbmdlcygpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHQvLyAtLS0gQWR2YW5jZWQgRmlsdGVyIFNlY3Rpb24gLS0tXHJcblx0XHRuZXcgU2V0dGluZyhjb250ZW50RWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJBZHZhbmNlZCBGaWx0ZXJpbmdcIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdHQoXCJVc2UgYWR2YW5jZWQgbXVsdGktZ3JvdXAgZmlsdGVyaW5nIHdpdGggY29tcGxleCBjb25kaXRpb25zXCIpLFxyXG5cdFx0XHQpXHJcblx0XHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IGhhc0FkdmFuY2VkRmlsdGVyID0gISF0aGlzLnZpZXdGaWx0ZXJSdWxlLmFkdmFuY2VkRmlsdGVyO1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XCJJbml0aWFsIGFkdmFuY2VkIGZpbHRlciBzdGF0ZTpcIixcclxuXHRcdFx0XHRcdGhhc0FkdmFuY2VkRmlsdGVyLFxyXG5cdFx0XHRcdFx0dGhpcy52aWV3RmlsdGVyUnVsZS5hZHZhbmNlZEZpbHRlcixcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHRvZ2dsZS5zZXRWYWx1ZShoYXNBZHZhbmNlZEZpbHRlcik7XHJcblx0XHRcdFx0dG9nZ2xlLm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXCJBZHZhbmNlZCBmaWx0ZXIgdG9nZ2xlIGNoYW5nZWQgdG86XCIsIHZhbHVlKTtcclxuXHRcdFx0XHRcdGlmICh2YWx1ZSkge1xyXG5cdFx0XHRcdFx0XHQvLyBFbmFibGUgYWR2YW5jZWQgZmlsdGVyaW5nXHJcblx0XHRcdFx0XHRcdGlmICghdGhpcy52aWV3RmlsdGVyUnVsZS5hZHZhbmNlZEZpbHRlcikge1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMudmlld0ZpbHRlclJ1bGUuYWR2YW5jZWRGaWx0ZXIgPSB7XHJcblx0XHRcdFx0XHRcdFx0XHRyb290Q29uZGl0aW9uOiBcImFueVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0ZmlsdGVyR3JvdXBzOiBbXSxcclxuXHRcdFx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRcdFx0XCJDcmVhdGVkIG5ldyBhZHZhbmNlZCBmaWx0ZXI6XCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdGaWx0ZXJSdWxlLmFkdmFuY2VkRmlsdGVyLFxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0dGhpcy5zZXR1cEFkdmFuY2VkRmlsdGVyKCk7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHQvLyBEaXNhYmxlIGFkdmFuY2VkIGZpbHRlcmluZ1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIkRpc2FibGluZyBhZHZhbmNlZCBmaWx0ZXJcIik7XHJcblx0XHRcdFx0XHRcdGRlbGV0ZSB0aGlzLnZpZXdGaWx0ZXJSdWxlLmFkdmFuY2VkRmlsdGVyO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmNsZWFudXBBZHZhbmNlZEZpbHRlcigpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0dGhpcy5jaGVja0ZvckNoYW5nZXMoKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ29udGFpbmVyIGZvciBhZHZhbmNlZCBmaWx0ZXIgY29tcG9uZW50XHJcblx0XHR0aGlzLmFkdmFuY2VkRmlsdGVyQ29udGFpbmVyID0gY29udGVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJhZHZhbmNlZC1maWx0ZXItY29udGFpbmVyXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBJbml0aWFsaXplIGFkdmFuY2VkIGZpbHRlciBpZiBpdCBleGlzdHNcclxuXHRcdGlmICh0aGlzLnZpZXdGaWx0ZXJSdWxlLmFkdmFuY2VkRmlsdGVyKSB7XHJcblx0XHRcdHRoaXMuc2V0dXBBZHZhbmNlZEZpbHRlcigpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gSGlkZSB0aGUgY29udGFpbmVyIGluaXRpYWxseSBpZiBubyBhZHZhbmNlZCBmaWx0ZXJcclxuXHRcdFx0dGhpcy5hZHZhbmNlZEZpbHRlckNvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKFxyXG5cdFx0XHQhW1wia2FuYmFuXCIsIFwiZ2FudHRcIiwgXCJjYWxlbmRhclwiXS5pbmNsdWRlcyhcclxuXHRcdFx0XHR0aGlzLnZpZXdDb25maWcuc3BlY2lmaWNDb25maWc/LnZpZXdUeXBlIHx8IFwiXCIsXHJcblx0XHRcdClcclxuXHRcdCkge1xyXG5cdFx0XHRuZXcgU2V0dGluZyhjb250ZW50RWwpXHJcblx0XHRcdFx0LnNldE5hbWUodChcIlNvcnQgQ3JpdGVyaWFcIikpXHJcblx0XHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XHRcIkRlZmluZSB0aGUgb3JkZXIgaW4gd2hpY2ggdGFza3Mgc2hvdWxkIGJlIHNvcnRlZC4gQ3JpdGVyaWEgYXJlIGFwcGxpZWQgc2VxdWVudGlhbGx5LlwiLFxyXG5cdFx0XHRcdFx0KSxcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0LnNldEhlYWRpbmcoKTtcclxuXHJcblx0XHRcdGNvbnN0IGNyaXRlcmlhQ29udGFpbmVyID0gY29udGVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcInNvcnQtY3JpdGVyaWEtY29udGFpbmVyXCIsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVmcmVzaENyaXRlcmlhTGlzdCA9ICgpID0+IHtcclxuXHRcdFx0XHRjcml0ZXJpYUNvbnRhaW5lci5lbXB0eSgpO1xyXG5cclxuXHRcdFx0XHQvLyBFbnN1cmUgdmlld0NvbmZpZy5zb3J0Q3JpdGVyaWEgZXhpc3RzXHJcblx0XHRcdFx0aWYgKCF0aGlzLnZpZXdDb25maWcuc29ydENyaXRlcmlhKSB7XHJcblx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWcuc29ydENyaXRlcmlhID0gW107XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRjb25zdCBjcml0ZXJpYSA9IHRoaXMudmlld0NvbmZpZy5zb3J0Q3JpdGVyaWE7XHJcblxyXG5cdFx0XHRcdGlmIChjcml0ZXJpYS5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0XHRcdGNyaXRlcmlhQ29udGFpbmVyLmNyZWF0ZUVsKFwicFwiLCB7XHJcblx0XHRcdFx0XHRcdHRleHQ6IHQoXHJcblx0XHRcdFx0XHRcdFx0XCJObyBzb3J0IGNyaXRlcmlhIGRlZmluZWQuIEFkZCBjcml0ZXJpYSBiZWxvdy5cIixcclxuXHRcdFx0XHRcdFx0KSxcclxuXHRcdFx0XHRcdFx0Y2xzOiBcInNldHRpbmctaXRlbS1kZXNjcmlwdGlvblwiLFxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRjcml0ZXJpYS5mb3JFYWNoKChjcml0ZXJpb246IFNvcnRDcml0ZXJpb24sIGluZGV4OiBudW1iZXIpID0+IHtcclxuXHRcdFx0XHRcdGNvbnN0IGNyaXRlcmlvblNldHRpbmcgPSBuZXcgU2V0dGluZyhjcml0ZXJpYUNvbnRhaW5lcilcclxuXHRcdFx0XHRcdFx0LnNldENsYXNzKFwic29ydC1jcml0ZXJpb24tcm93XCIpXHJcblx0XHRcdFx0XHRcdC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcclxuXHRcdFx0XHRcdFx0XHRkcm9wZG93blxyXG5cdFx0XHRcdFx0XHRcdFx0LmFkZE9wdGlvbihcInN0YXR1c1wiLCB0KFwiU3RhdHVzXCIpKVxyXG5cdFx0XHRcdFx0XHRcdFx0LmFkZE9wdGlvbihcInByaW9yaXR5XCIsIHQoXCJQcmlvcml0eVwiKSlcclxuXHRcdFx0XHRcdFx0XHRcdC5hZGRPcHRpb24oXCJkdWVEYXRlXCIsIHQoXCJEdWUgRGF0ZVwiKSlcclxuXHRcdFx0XHRcdFx0XHRcdC5hZGRPcHRpb24oXCJzdGFydERhdGVcIiwgdChcIlN0YXJ0IERhdGVcIikpXHJcblx0XHRcdFx0XHRcdFx0XHQuYWRkT3B0aW9uKFwic2NoZWR1bGVkRGF0ZVwiLCB0KFwiU2NoZWR1bGVkIERhdGVcIikpXHJcblx0XHRcdFx0XHRcdFx0XHQuYWRkT3B0aW9uKFwiY29udGVudFwiLCB0KFwiQ29udGVudFwiKSlcclxuXHRcdFx0XHRcdFx0XHRcdC5zZXRWYWx1ZShjcml0ZXJpb24uZmllbGQpXHJcblx0XHRcdFx0XHRcdFx0XHQub25DaGFuZ2UoKHZhbHVlOiBTb3J0Q3JpdGVyaW9uW1wiZmllbGRcIl0pID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKHRoaXMudmlld0NvbmZpZy5zb3J0Q3JpdGVyaWEpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWcuc29ydENyaXRlcmlhW1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0aW5kZXhcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRdLmZpZWxkID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5jaGVja0ZvckNoYW5nZXMoKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0XHRcdC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcclxuXHRcdFx0XHRcdFx0XHRkcm9wZG93blxyXG5cdFx0XHRcdFx0XHRcdFx0LmFkZE9wdGlvbihcImFzY1wiLCB0KFwiQXNjZW5kaW5nXCIpKVxyXG5cdFx0XHRcdFx0XHRcdFx0LmFkZE9wdGlvbihcImRlc2NcIiwgdChcIkRlc2NlbmRpbmdcIikpXHJcblx0XHRcdFx0XHRcdFx0XHQuc2V0VmFsdWUoY3JpdGVyaW9uLm9yZGVyKVxyXG5cdFx0XHRcdFx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZTogU29ydENyaXRlcmlvbltcIm9yZGVyXCJdKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGlmICh0aGlzLnZpZXdDb25maWcuc29ydENyaXRlcmlhKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnLnNvcnRDcml0ZXJpYVtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGluZGV4XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XS5vcmRlciA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuY2hlY2tGb3JDaGFuZ2VzKCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRcdC8vIEFkZCB0b29sdGlwcyBleHBsYWluaW5nIHdoYXQgYXNjL2Rlc2MgbWVhbnMgZm9yIGVhY2ggZmllbGQgdHlwZSBpZiBwb3NzaWJsZVxyXG5cdFx0XHRcdFx0XHRcdGlmIChjcml0ZXJpb24uZmllbGQgPT09IFwicHJpb3JpdHlcIikge1xyXG5cdFx0XHRcdFx0XHRcdFx0ZHJvcGRvd24uc2VsZWN0RWwudGl0bGUgPSB0KFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcIkFzY2VuZGluZzogSGlnaCAtPiBMb3cgLT4gTm9uZS4gRGVzY2VuZGluZzogTm9uZSAtPiBMb3cgLT4gSGlnaFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKFxyXG5cdFx0XHRcdFx0XHRcdFx0W1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcImR1ZURhdGVcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0XCJzdGFydERhdGVcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0XCJzY2hlZHVsZWREYXRlXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRdLmluY2x1ZGVzKGNyaXRlcmlvbi5maWVsZClcclxuXHRcdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdGRyb3Bkb3duLnNlbGVjdEVsLnRpdGxlID0gdChcclxuXHRcdFx0XHRcdFx0XHRcdFx0XCJBc2NlbmRpbmc6IEVhcmxpZXIgLT4gTGF0ZXIgLT4gTm9uZS4gRGVzY2VuZGluZzogTm9uZSAtPiBMYXRlciAtPiBFYXJsaWVyXCIsXHJcblx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoY3JpdGVyaW9uLmZpZWxkID09PSBcInN0YXR1c1wiKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRkcm9wZG93bi5zZWxlY3RFbC50aXRsZSA9IHQoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFwiQXNjZW5kaW5nIHJlc3BlY3RzIHN0YXR1cyBvcmRlciAoT3ZlcmR1ZSBmaXJzdCkuIERlc2NlbmRpbmcgcmV2ZXJzZXMgaXQuXCIsXHJcblx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0XHRkcm9wZG93bi5zZWxlY3RFbC50aXRsZSA9IHQoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFwiQXNjZW5kaW5nOiBBLVouIERlc2NlbmRpbmc6IFotQVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdC8vIENvbnRyb2xzIGZvciByZW9yZGVyaW5nIGFuZCBkZWxldGluZ1xyXG5cdFx0XHRcdFx0Y3JpdGVyaW9uU2V0dGluZy5hZGRFeHRyYUJ1dHRvbigoYnV0dG9uKSA9PiB7XHJcblx0XHRcdFx0XHRcdGJ1dHRvblxyXG5cdFx0XHRcdFx0XHRcdC5zZXRJY29uKFwiYXJyb3ctdXBcIilcclxuXHRcdFx0XHRcdFx0XHQuc2V0VG9vbHRpcCh0KFwiTW92ZSBVcFwiKSlcclxuXHRcdFx0XHRcdFx0XHQuc2V0RGlzYWJsZWQoaW5kZXggPT09IDApXHJcblx0XHRcdFx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKGluZGV4ID4gMCAmJiB0aGlzLnZpZXdDb25maWcuc29ydENyaXRlcmlhKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IGl0ZW0gPVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZy5zb3J0Q3JpdGVyaWEuc3BsaWNlKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0aW5kZXgsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQxLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdClbMF07XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZy5zb3J0Q3JpdGVyaWEuc3BsaWNlKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGluZGV4IC0gMSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQwLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGl0ZW0sXHJcblx0XHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuY2hlY2tGb3JDaGFuZ2VzKCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHJlZnJlc2hDcml0ZXJpYUxpc3QoKTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0Y3JpdGVyaW9uU2V0dGluZy5hZGRFeHRyYUJ1dHRvbigoYnV0dG9uKSA9PiB7XHJcblx0XHRcdFx0XHRcdGJ1dHRvblxyXG5cdFx0XHRcdFx0XHRcdC5zZXRJY29uKFwiYXJyb3ctZG93blwiKVxyXG5cdFx0XHRcdFx0XHRcdC5zZXRUb29sdGlwKHQoXCJNb3ZlIERvd25cIikpXHJcblx0XHRcdFx0XHRcdFx0LnNldERpc2FibGVkKGluZGV4ID09PSBjcml0ZXJpYS5sZW5ndGggLSAxKVxyXG5cdFx0XHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHRcdFx0aW5kZXggPCBjcml0ZXJpYS5sZW5ndGggLSAxICYmXHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMudmlld0NvbmZpZy5zb3J0Q3JpdGVyaWFcclxuXHRcdFx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBpdGVtID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWcuc29ydENyaXRlcmlhLnNwbGljZShcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGluZGV4LFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0MSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQpWzBdO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWcuc29ydENyaXRlcmlhLnNwbGljZShcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRpbmRleCArIDEsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0MCxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRpdGVtLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmNoZWNrRm9yQ2hhbmdlcygpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRyZWZyZXNoQ3JpdGVyaWFMaXN0KCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdGNyaXRlcmlvblNldHRpbmcuYWRkRXh0cmFCdXR0b24oKGJ1dHRvbikgPT4ge1xyXG5cdFx0XHRcdFx0XHRidXR0b25cclxuXHRcdFx0XHRcdFx0XHQuc2V0SWNvbihcInRyYXNoXCIpXHJcblx0XHRcdFx0XHRcdFx0LnNldFRvb2x0aXAodChcIlJlbW92ZSBDcml0ZXJpb25cIikpXHJcblx0XHRcdFx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKHRoaXMudmlld0NvbmZpZy5zb3J0Q3JpdGVyaWEpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnLnNvcnRDcml0ZXJpYS5zcGxpY2UoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0aW5kZXgsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0MSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5jaGVja0ZvckNoYW5nZXMoKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0cmVmcmVzaENyaXRlcmlhTGlzdCgpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHQvLyBBZGQgY2xhc3MgdG8gdGhlIGNvbnRhaW5lciBlbGVtZW50IG9mIHRoZSBleHRyYSBidXR0b25cclxuXHRcdFx0XHRcdFx0YnV0dG9uLmV4dHJhU2V0dGluZ3NFbC5hZGRDbGFzcyhcIm1vZC13YXJuaW5nXCIpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIEJ1dHRvbiB0byBhZGQgYSBuZXcgY3JpdGVyaW9uXHJcblx0XHRcdFx0bmV3IFNldHRpbmcoY3JpdGVyaWFDb250YWluZXIpXHJcblx0XHRcdFx0XHQuYWRkQnV0dG9uKChidXR0b24pID0+IHtcclxuXHRcdFx0XHRcdFx0YnV0dG9uXHJcblx0XHRcdFx0XHRcdFx0LnNldEJ1dHRvblRleHQodChcIkFkZCBTb3J0IENyaXRlcmlvblwiKSlcclxuXHRcdFx0XHRcdFx0XHQuc2V0Q3RhKClcclxuXHRcdFx0XHRcdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBuZXdDcml0ZXJpb246IFNvcnRDcml0ZXJpb24gPSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGZpZWxkOiBcInN0YXR1c1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRvcmRlcjogXCJhc2NcIixcclxuXHRcdFx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHRcdFx0XHRpZiAoIXRoaXMudmlld0NvbmZpZy5zb3J0Q3JpdGVyaWEpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnLnNvcnRDcml0ZXJpYSA9IFtdO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy52aWV3Q29uZmlnLnNvcnRDcml0ZXJpYS5wdXNoKG5ld0NyaXRlcmlvbik7XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLmNoZWNrRm9yQ2hhbmdlcygpO1xyXG5cdFx0XHRcdFx0XHRcdFx0cmVmcmVzaENyaXRlcmlhTGlzdCgpO1xyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSlcclxuXHRcdFx0XHRcdC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xyXG5cdFx0XHRcdFx0XHQvLyBCdXR0b24gdG8gcmVzZXQgdG8gZGVmYXVsdHNcclxuXHRcdFx0XHRcdFx0YnV0dG9uXHJcblx0XHRcdFx0XHRcdFx0LnNldEJ1dHRvblRleHQodChcIlJlc2V0IHRvIERlZmF1bHRzXCIpKVxyXG5cdFx0XHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdC8vIE9wdGlvbmFsOiBBZGQgY29uZmlybWF0aW9uIGRpYWxvZyBoZXJlXHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnZpZXdDb25maWcuc29ydENyaXRlcmlhID0gW107IC8vIFVzZSBzcHJlYWQgdG8gY29weVxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5jaGVja0ZvckNoYW5nZXMoKTtcclxuXHRcdFx0XHRcdFx0XHRcdHJlZnJlc2hDcml0ZXJpYUxpc3QoKTtcclxuXHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0cmVmcmVzaENyaXRlcmlhTGlzdCgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIC0tLSBGaXJzdCBEYXkgb2YgV2VlayAtLS1cclxuXHJcblx0XHQvLyAtLS0gQWN0aW9uIEJ1dHRvbnMgLS0tXHJcblx0XHRuZXcgU2V0dGluZyhjb250ZW50RWwpXHJcblx0XHRcdC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xyXG5cdFx0XHRcdGJ1dHRvblxyXG5cdFx0XHRcdFx0LnNldEJ1dHRvblRleHQodChcIlNhdmVcIikpXHJcblx0XHRcdFx0XHQuc2V0Q3RhKClcclxuXHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5zYXZlQ2hhbmdlcygpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pXHJcblx0XHRcdC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xyXG5cdFx0XHRcdGJ1dHRvbi5zZXRCdXR0b25UZXh0KHQoXCJDYW5jZWxcIikpLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcGFyc2VTdHJpbmdUb0FycmF5KGlucHV0OiBzdHJpbmcpOiBzdHJpbmdbXSB7XHJcblx0XHRpZiAoIWlucHV0IHx8IGlucHV0LnRyaW0oKSA9PT0gXCJcIikgcmV0dXJuIFtdO1xyXG5cdFx0cmV0dXJuIGlucHV0XHJcblx0XHRcdC5zcGxpdChcIixcIilcclxuXHRcdFx0Lm1hcCgocykgPT4gcy50cmltKCkpXHJcblx0XHRcdC5maWx0ZXIoKHMpID0+IHMgIT09IFwiXCIpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjaGVja0ZvckNoYW5nZXMoKSB7XHJcblx0XHRjb25zdCBjdXJyZW50Q29uZmlnID0gSlNPTi5zdHJpbmdpZnkodGhpcy52aWV3Q29uZmlnKTtcclxuXHRcdGNvbnN0IGN1cnJlbnRGaWx0ZXJSdWxlID0gSlNPTi5zdHJpbmdpZnkodGhpcy5nZXRDdXJyZW50RmlsdGVyUnVsZSgpKTtcclxuXHRcdHRoaXMuaGFzQ2hhbmdlcyA9XHJcblx0XHRcdGN1cnJlbnRDb25maWcgIT09IHRoaXMub3JpZ2luYWxWaWV3Q29uZmlnIHx8XHJcblx0XHRcdGN1cnJlbnRGaWx0ZXJSdWxlICE9PSB0aGlzLm9yaWdpbmFsVmlld0ZpbHRlclJ1bGU7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldEN1cnJlbnRGaWx0ZXJSdWxlKCk6IFZpZXdGaWx0ZXJSdWxlIHtcclxuXHRcdGNvbnN0IHJ1bGVzOiBWaWV3RmlsdGVyUnVsZSA9IHt9O1xyXG5cclxuXHRcdC8vIEdldCBhZHZhbmNlZCBmaWx0ZXIgc3RhdGUgaWYgYXZhaWxhYmxlXHJcblx0XHRpZiAodGhpcy50YXNrRmlsdGVyQ29tcG9uZW50KSB7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Y29uc3QgY3VycmVudEZpbHRlclN0YXRlID1cclxuXHRcdFx0XHRcdHRoaXMudGFza0ZpbHRlckNvbXBvbmVudC5nZXRGaWx0ZXJTdGF0ZSgpO1xyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdGN1cnJlbnRGaWx0ZXJTdGF0ZSAmJlxyXG5cdFx0XHRcdFx0Y3VycmVudEZpbHRlclN0YXRlLmZpbHRlckdyb3Vwcy5sZW5ndGggPiAwXHJcblx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRydWxlcy5hZHZhbmNlZEZpbHRlciA9IGN1cnJlbnRGaWx0ZXJTdGF0ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Y29uc29sZS53YXJuKFwiRXJyb3IgZ2V0dGluZyBjdXJyZW50IGZpbHRlciBzdGF0ZTpcIiwgZXJyb3IpO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2UgaWYgKHRoaXMudmlld0ZpbHRlclJ1bGUuYWR2YW5jZWRGaWx0ZXIpIHtcclxuXHRcdFx0Ly8gUHJlc2VydmUgZXhpc3RpbmcgYWR2YW5jZWQgZmlsdGVyIGlmIGNvbXBvbmVudCBpcyBub3QgbG9hZGVkXHJcblx0XHRcdHJ1bGVzLmFkdmFuY2VkRmlsdGVyID0gdGhpcy52aWV3RmlsdGVyUnVsZS5hZHZhbmNlZEZpbHRlcjtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gcnVsZXM7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHNhdmVDaGFuZ2VzKCkge1xyXG5cdFx0Ly8gVXBkYXRlIHZpZXdDb25maWdcclxuXHRcdHRoaXMudmlld0NvbmZpZy5uYW1lID1cclxuXHRcdFx0dGhpcy5uYW1lSW5wdXQuZ2V0VmFsdWUoKS50cmltKCkgfHwgdChcIlVubmFtZWQgVmlld1wiKTtcclxuXHRcdHRoaXMudmlld0NvbmZpZy5pY29uID0gdGhpcy5pY29uSW5wdXQuZ2V0VmFsdWUoKS50cmltKCkgfHwgXCJsaXN0XCI7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHZpZXdGaWx0ZXJSdWxlXHJcblx0XHR0aGlzLnZpZXdGaWx0ZXJSdWxlID0gdGhpcy5nZXRDdXJyZW50RmlsdGVyUnVsZSgpO1xyXG5cclxuXHRcdC8vIFJlc2V0IGNoYW5nZSB0cmFja2luZyBzdGF0ZVxyXG5cdFx0dGhpcy5vcmlnaW5hbFZpZXdDb25maWcgPSBKU09OLnN0cmluZ2lmeSh0aGlzLnZpZXdDb25maWcpO1xyXG5cdFx0dGhpcy5vcmlnaW5hbFZpZXdGaWx0ZXJSdWxlID0gSlNPTi5zdHJpbmdpZnkodGhpcy52aWV3RmlsdGVyUnVsZSk7XHJcblx0XHR0aGlzLmhhc0NoYW5nZXMgPSBmYWxzZTtcclxuXHJcblx0XHQvLyBDYWxsIHRoZSBvblNhdmUgY2FsbGJhY2tcclxuXHRcdHRoaXMub25TYXZlKHRoaXMudmlld0NvbmZpZywgdGhpcy52aWV3RmlsdGVyUnVsZSk7XHJcblx0XHR0aGlzLmNsb3NlKCk7XHJcblx0XHRuZXcgTm90aWNlKHQoXCJWaWV3IGNvbmZpZ3VyYXRpb24gc2F2ZWQuXCIpKTtcclxuXHR9XHJcblxyXG5cdGNsb3NlKCkge1xyXG5cdFx0aWYgKHRoaXMuaGFzQ2hhbmdlcykge1xyXG5cdFx0XHRuZXcgQ29uZmlybU1vZGFsKHRoaXMucGx1Z2luLCB7XHJcblx0XHRcdFx0dGl0bGU6IHQoXCJVbnNhdmVkIENoYW5nZXNcIiksXHJcblx0XHRcdFx0bWVzc2FnZTogdChcIllvdSBoYXZlIHVuc2F2ZWQgY2hhbmdlcy4gU2F2ZSBiZWZvcmUgY2xvc2luZz9cIiksXHJcblx0XHRcdFx0Y29uZmlybVRleHQ6IHQoXCJTYXZlXCIpLFxyXG5cdFx0XHRcdGNhbmNlbFRleHQ6IHQoXCJDYW5jZWxcIiksXHJcblx0XHRcdFx0b25Db25maXJtOiAoY29uZmlybWVkOiBib29sZWFuKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAoY29uZmlybWVkKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMuc2F2ZUNoYW5nZXMoKTtcclxuXHRcdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0c3VwZXIuY2xvc2UoKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KS5vcGVuKCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRzdXBlci5jbG9zZSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0b25DbG9zZSgpIHtcclxuXHRcdC8vIENsZWFuIHVwIHRoZSBhZHZhbmNlZCBmaWx0ZXIgY29tcG9uZW50XHJcblx0XHR0aGlzLmNsZWFudXBBZHZhbmNlZEZpbHRlcigpO1xyXG5cclxuXHRcdGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xyXG5cdFx0Y29udGVudEVsLmVtcHR5KCk7XHJcblx0fVxyXG5cclxuXHQvLyDmt7vliqBzYXZlU2V0dGluZ3NVcGRhdGXmlrnms5VcclxuXHRwcml2YXRlIHNhdmVTZXR0aW5nc1VwZGF0ZSgpIHtcclxuXHRcdHRoaXMuY2hlY2tGb3JDaGFuZ2VzKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHNldHVwQWR2YW5jZWRGaWx0ZXIoKSB7XHJcblx0XHRpZiAoIXRoaXMuYWR2YW5jZWRGaWx0ZXJDb250YWluZXIpIHJldHVybjtcclxuXHJcblx0XHRjb25zb2xlLmxvZyhcIlNldHRpbmcgdXAgYWR2YW5jZWQgZmlsdGVyLi4uXCIpO1xyXG5cclxuXHRcdC8vIENsZWFuIHVwIGV4aXN0aW5nIGNvbXBvbmVudCBpZiBhbnlcclxuXHRcdHRoaXMuY2xlYW51cEFkdmFuY2VkRmlsdGVyKCk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIHRoZSBUYXNrRmlsdGVyQ29tcG9uZW50IHdpdGggdmlldy1jb25maWcgbGVhZklkIHRvIHByZXZlbnQgYWZmZWN0aW5nIGxpdmUgZmlsdGVyc1xyXG5cdFx0dGhpcy50YXNrRmlsdGVyQ29tcG9uZW50ID0gbmV3IFRhc2tGaWx0ZXJDb21wb25lbnQoXHJcblx0XHRcdHRoaXMuYWR2YW5jZWRGaWx0ZXJDb250YWluZXIsXHJcblx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHRgdmlldy1jb25maWctJHt0aGlzLnZpZXdDb25maWcuaWR9YCwgLy8g5L2/55SoIHZpZXctY29uZmlnLSDliY3nvIDnoa7kv53kuI3lvbHlk43lrp7ml7bnrZvpgInlmahcclxuXHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHQpO1xyXG5cclxuXHRcdGNvbnNvbGUubG9nKFwiVGFza0ZpbHRlckNvbXBvbmVudCBjcmVhdGVkOlwiLCB0aGlzLnRhc2tGaWx0ZXJDb21wb25lbnQpO1xyXG5cclxuXHRcdC8vIOS/neWtmOeOsOacieeahOi/h+a7pOWZqOeKtuaAgVxyXG5cdFx0Y29uc3QgZXhpc3RpbmdGaWx0ZXJTdGF0ZSA9IHRoaXMudmlld0ZpbHRlclJ1bGUuYWR2YW5jZWRGaWx0ZXJcclxuXHRcdFx0PyBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMudmlld0ZpbHRlclJ1bGUuYWR2YW5jZWRGaWx0ZXIpKVxyXG5cdFx0XHQ6IHtcclxuXHRcdFx0XHRcdHJvb3RDb25kaXRpb246IFwiYW55XCIgYXMgY29uc3QsXHJcblx0XHRcdFx0XHRmaWx0ZXJHcm91cHM6IFtdLFxyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0Y29uc29sZS5sb2coXCJGaWx0ZXIgc3RhdGUgZm9yIHZpZXcgY29uZmlnOlwiLCBleGlzdGluZ0ZpbHRlclN0YXRlKTtcclxuXHJcblx0XHQvLyDpooTlhYjkv53lrZjnqbrnmoTnrZvpgInlmajnirbmgIHliLBsb2NhbFN0b3JhZ2XvvIzpmLLmraLliqDovb3mhI/lpJbnmoTnirbmgIFcclxuXHRcdHRoaXMuYXBwLnNhdmVMb2NhbFN0b3JhZ2UoXHJcblx0XHRcdGB0YXNrLWdlbml1cy12aWV3LWZpbHRlci12aWV3LWNvbmZpZy0ke3RoaXMudmlld0NvbmZpZy5pZH1gLFxyXG5cdFx0XHRleGlzdGluZ0ZpbHRlclN0YXRlLFxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyDmiYvliqjosIPnlKggb25sb2FkXHJcblx0XHR0aGlzLnRhc2tGaWx0ZXJDb21wb25lbnQub25sb2FkKCk7XHJcblxyXG5cdFx0Y29uc29sZS5sb2coXCJUYXNrRmlsdGVyQ29tcG9uZW50IG9ubG9hZCBjYWxsZWRcIik7XHJcblxyXG5cdFx0Ly8g56uL5Y2z5Yqg6L296KeG5Zu+6YWN572u55qE6L+H5ruk5Zmo54q25oCBXHJcblx0XHRjb25zb2xlLmxvZyhcIkxvYWRpbmcgdmlldyBjb25maWcgZmlsdGVyIHN0YXRlOlwiLCBleGlzdGluZ0ZpbHRlclN0YXRlKTtcclxuXHRcdHRoaXMudGFza0ZpbHRlckNvbXBvbmVudC5sb2FkRmlsdGVyU3RhdGUoZXhpc3RpbmdGaWx0ZXJTdGF0ZSk7XHJcblxyXG5cdFx0Ly8gU2V0IHVwIGV2ZW50IGxpc3RlbmVyIGZvciBmaWx0ZXIgY2hhbmdlc1xyXG5cdFx0dGhpcy5maWx0ZXJDaGFuZ2VIYW5kbGVyID0gKFxyXG5cdFx0XHRmaWx0ZXJTdGF0ZTogUm9vdEZpbHRlclN0YXRlLFxyXG5cdFx0XHRsZWFmSWQ/OiBzdHJpbmcsXHJcblx0XHQpID0+IHtcclxuXHRcdFx0Ly8g5Y+q5aSE55CG5p2l6Ieq5b2T5YmNVmlld0NvbmZpZ+etm+mAieWZqOeahOWPmOWMllxyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0dGhpcy50YXNrRmlsdGVyQ29tcG9uZW50ICYmXHJcblx0XHRcdFx0bGVhZklkID09PSBgdmlldy1jb25maWctJHt0aGlzLnZpZXdDb25maWcuaWR9YFxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdFwiRmlsdGVyIGNoYW5nZWQgaW4gdmlldyBjb25maWcgbW9kYWw6XCIsXHJcblx0XHRcdFx0XHRmaWx0ZXJTdGF0ZSxcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHRoaXMudmlld0ZpbHRlclJ1bGUuYWR2YW5jZWRGaWx0ZXIgPSBmaWx0ZXJTdGF0ZTtcclxuXHRcdFx0XHR0aGlzLmNoZWNrRm9yQ2hhbmdlcygpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuYXBwLndvcmtzcGFjZS5vbihcclxuXHRcdFx0XCJ0YXNrLWdlbml1czpmaWx0ZXItY2hhbmdlZFwiLFxyXG5cdFx0XHR0aGlzLmZpbHRlckNoYW5nZUhhbmRsZXIsXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIFNob3cgdGhlIGNvbnRhaW5lclxyXG5cdFx0dGhpcy5hZHZhbmNlZEZpbHRlckNvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xyXG5cdFx0Y29uc29sZS5sb2coXCJBZHZhbmNlZCBmaWx0ZXIgY29udGFpbmVyIHNob3VsZCBub3cgYmUgdmlzaWJsZVwiKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY2xlYW51cEFkdmFuY2VkRmlsdGVyKCkge1xyXG5cdFx0aWYgKHRoaXMudGFza0ZpbHRlckNvbXBvbmVudCkge1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdC8vIE1hbnVhbGx5IHVubG9hZCB0aGUgY29tcG9uZW50XHJcblx0XHRcdFx0dGhpcy50YXNrRmlsdGVyQ29tcG9uZW50Lm9udW5sb2FkKCk7XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Y29uc29sZS53YXJuKFwiRXJyb3IgdW5sb2FkaW5nIHRhc2sgZmlsdGVyIGNvbXBvbmVudDpcIiwgZXJyb3IpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHRoaXMudGFza0ZpbHRlckNvbXBvbmVudCA9IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHRoaXMuYWR2YW5jZWRGaWx0ZXJDb250YWluZXIpIHtcclxuXHRcdFx0dGhpcy5hZHZhbmNlZEZpbHRlckNvbnRhaW5lci5lbXB0eSgpO1xyXG5cdFx0XHR0aGlzLmFkdmFuY2VkRmlsdGVyQ29udGFpbmVyLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAodGhpcy5maWx0ZXJDaGFuZ2VIYW5kbGVyKSB7XHJcblx0XHRcdHRoaXMuYXBwLndvcmtzcGFjZS5vZmYoXHJcblx0XHRcdFx0XCJ0YXNrLWdlbml1czpmaWx0ZXItY2hhbmdlZFwiLFxyXG5cdFx0XHRcdHRoaXMuZmlsdGVyQ2hhbmdlSGFuZGxlcixcclxuXHRcdFx0KTtcclxuXHRcdFx0dGhpcy5maWx0ZXJDaGFuZ2VIYW5kbGVyID0gbnVsbDtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuIl19