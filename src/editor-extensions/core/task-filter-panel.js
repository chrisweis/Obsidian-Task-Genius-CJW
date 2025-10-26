import { Keymap, Menu, Notice, Setting, debounce, editorEditorField, editorInfoField, moment, } from "obsidian";
import { StateField, StateEffect, Facet } from "@codemirror/state";
import { EditorView, showPanel, Decoration, } from "@codemirror/view";
import { parseAdvancedFilterQuery, evaluateFilterNode, parsePriorityFilterValue, } from "@/utils/task/filter-compatibility";
import { t } from "@/translations/helper";
import "@/styles/task-filter.css";
// Effect to toggle the filter panel
export const toggleTaskFilter = StateEffect.define();
// Effect to update active filter options
export const updateActiveFilters = StateEffect.define();
// Effect to update hidden task ranges
export const updateHiddenTaskRanges = StateEffect.define();
// Define a state field to track whether the panel is open
export const taskFilterState = StateField.define({
    create: () => false,
    update(value, tr) {
        var _a;
        for (let e of tr.effects) {
            if (e.is(toggleTaskFilter)) {
                if ((_a = tr.state.field(editorInfoField)) === null || _a === void 0 ? void 0 : _a.file) {
                    value = e.value;
                }
            }
        }
        return value;
    },
    provide: (field) => showPanel.from(field, (active) => active ? createTaskFilterPanel : null),
});
// Define a state field to track active filters for each editor view
export const activeFiltersState = StateField.define({
    create: () => (Object.assign({}, DEFAULT_FILTER_OPTIONS)),
    update(value, tr) {
        for (let e of tr.effects) {
            if (e.is(updateActiveFilters)) {
                value = e.value;
            }
        }
        return value;
    },
});
export const actionButtonState = StateField.define({
    create: (state) => {
        // Initialize as false, will be set to true once action button is added
        return false;
    },
    update(value, tr) {
        // Check if this is the first time we're loading
        if (!value) {
            setTimeout(() => {
                // Get the editor view from the transaction state
                const view = tr.state.field(editorInfoField);
                const editor = tr.state.field(editorEditorField);
                if (view &&
                    editor &&
                    (view === null || view === void 0 ? void 0 : view.file)) {
                    // @ts-ignore
                    if (view.filterAction) {
                        return true;
                    }
                    const plugin = tr.state.facet(pluginFacet);
                    // Add preset menu action button to the markdown view
                    const filterAction = view === null || view === void 0 ? void 0 : view.addAction("filter", t("Filter Tasks"), (event) => {
                        // Create dropdown menu for filter presets
                        const menu = new Menu();
                        const activeFilters = getActiveFiltersForView(editor);
                        if (activeFilters &&
                            checkFilterChanges(editor, plugin)) {
                            menu.addItem((item) => {
                                item.setTitle(t("Reset")).onClick(() => {
                                    editor === null || editor === void 0 ? void 0 : editor.dispatch({
                                        effects: updateActiveFilters.of(DEFAULT_FILTER_OPTIONS),
                                    });
                                    applyTaskFilters(editor, plugin);
                                    editor.dispatch({
                                        effects: toggleTaskFilter.of(false),
                                    });
                                });
                            });
                        }
                        menu.addItem((item) => {
                            item.setTitle(editor.state.field(taskFilterState)
                                ? t("Hide filter panel")
                                : t("Show filter panel")).onClick(() => {
                                editor === null || editor === void 0 ? void 0 : editor.dispatch({
                                    effects: toggleTaskFilter.of(!editor.state.field(taskFilterState)),
                                });
                            });
                        });
                        menu.addSeparator();
                        // Add presets from plugin settings
                        if (plugin &&
                            plugin.settings.taskFilter.presetTaskFilters) {
                            plugin.settings.taskFilter.presetTaskFilters.forEach((preset) => {
                                menu.addItem((item) => {
                                    item.setTitle(preset.name).onClick(() => {
                                        // Apply the selected preset
                                        if (editor) {
                                            editor.dispatch({
                                                effects: updateActiveFilters.of(Object.assign({}, preset.options)),
                                            });
                                            // Apply filters immediately
                                            applyTaskFilters(editor, plugin);
                                        }
                                    });
                                });
                            });
                        }
                        // Show the menu
                        menu.showAtMouseEvent(event);
                    });
                    plugin.register(() => {
                        filterAction.detach();
                        // @ts-ignore
                        view.filterAction = null;
                    });
                    // @ts-ignore
                    view.filterAction = filterAction;
                }
            }, 0);
            return true;
        }
        return value;
    },
});
// Define a state field to track hidden task ranges for each editor view
export const hiddenTaskRangesState = StateField.define({
    create: () => [],
    update(value, tr) {
        // Update if there's an explicit update effect
        for (let e of tr.effects) {
            if (e.is(updateHiddenTaskRanges)) {
                return e.value;
            }
        }
        // Otherwise, map ranges through document changes
        if (tr.docChanged) {
            value = value.map((range) => ({
                from: tr.changes.mapPos(range.from),
                to: tr.changes.mapPos(range.to),
            }));
        }
        return value;
    },
});
// Default filter options
export const DEFAULT_FILTER_OPTIONS = {
    includeCompleted: true,
    includeInProgress: true,
    includeAbandoned: true,
    includeNotStarted: true,
    includePlanned: true,
    includeParentTasks: true,
    includeChildTasks: true,
    includeSiblingTasks: false,
    advancedFilterQuery: "",
    filterMode: "INCLUDE",
};
// Facet to provide filter options
export const taskFilterOptions = Facet.define({
    combine: (values) => {
        // Start with default values
        const result = Object.assign({}, DEFAULT_FILTER_OPTIONS);
        // Combine all values, with later definitions overriding earlier ones
        for (const value of values) {
            Object.assign(result, value);
        }
        return result;
    },
});
// Ensure backward compatibility for older preset configurations that might use filterOutTasks
export function migrateOldFilterOptions(options) {
    // Create a new object with default options
    const migrated = Object.assign({}, DEFAULT_FILTER_OPTIONS);
    // Copy all valid properties from the old options
    Object.keys(DEFAULT_FILTER_OPTIONS).forEach((key) => {
        if (key in options && options[key] !== undefined) {
            migrated[key] = options[key];
        }
    });
    // Handle filterOutTasks to filterMode migration if needed
    if ("filterOutTasks" in options && options.filterMode === undefined) {
        migrated.filterMode = options.filterOutTasks ? "EXCLUDE" : "INCLUDE";
    }
    return migrated;
}
// Helper function to get filter option value safely with proper typing
function getFilterOption(options, key) {
    return options[key];
}
// Helper function to map local Task to the format expected by evaluateFilterNode
// Only includes fields actually used by evaluateFilterNode in filterUtils.ts
function mapTaskForFiltering(task) {
    let priorityValue = undefined;
    if (task.priority) {
        const parsedPriority = parsePriorityFilterValue(task.priority);
        if (parsedPriority !== null) {
            priorityValue = parsedPriority;
        }
    }
    let dueDateTimestamp = undefined;
    if (task.date) {
        // Try parsing various common formats, strict parsing
        const parsedDate = moment(task.date, [moment.ISO_8601, "YYYY-MM-DD", "DD.MM.YYYY", "MM/DD/YYYY"], true);
        if (parsedDate.isValid()) {
            dueDateTimestamp = parsedDate.valueOf(); // Get timestamp in ms
        }
        else {
            // Optional: Log parsing errors if needed
            // console.warn(`Could not parse date: ${task.date} for task: ${task.text}`);
        }
    }
    return {
        id: `${task.from}-${task.to}`,
        content: task.text,
        filePath: "",
        line: 0,
        completed: task.status === "completed",
        status: task.status,
        originalMarkdown: task.text,
        metadata: {
            tags: task.tags,
            priority: priorityValue,
            dueDate: dueDateTimestamp,
            children: [],
        },
    };
}
function checkFilterChanges(view, plugin) {
    // Get active filters from the state instead of the facet
    const options = getActiveFiltersForView(view);
    // Check if current filter options are the same as default options
    const isDefault = Object.keys(DEFAULT_FILTER_OPTIONS).every((key) => {
        return (options[key] ===
            DEFAULT_FILTER_OPTIONS[key]);
    });
    // Return whether there are any changes from default
    return !isDefault;
}
function filterPanelDisplay(view, dom, options, plugin) {
    // Get current active filters from state
    let activeFilters = getActiveFiltersForView(view);
    const debounceFilter = debounce((view, plugin) => {
        applyTaskFilters(view, plugin);
    }, 2000);
    // Create header with title
    const headerContainer = dom.createEl("div", {
        cls: "task-filter-header-container",
    });
    headerContainer.createEl("span", {
        cls: "task-filter-title",
        text: t("Filter Tasks"),
    });
    // Create the filter options section
    const filterOptionsDiv = dom.createEl("div", {
        cls: "task-filter-options",
    });
    // Add preset filter selector
    const presetContainer = filterOptionsDiv.createEl("div", {
        cls: "task-filter-preset-container",
    });
    const presetFilters = plugin.settings.taskFilter.presetTaskFilters || [];
    let d = null;
    if (presetFilters.length > 0) {
        new Setting(presetContainer)
            .setName(t("Preset filters"))
            .setDesc(t("Select a saved filter preset to apply"))
            .addDropdown((dropdown) => {
            // Add an empty option
            dropdown.addOption("", t("Select a preset..."));
            d = dropdown;
            // Add each preset as an option
            presetFilters.forEach((preset) => {
                dropdown.addOption(preset.id, preset.name);
            });
            dropdown.onChange((selectedId) => {
                if (selectedId) {
                    // Find the selected preset
                    const selectedPreset = presetFilters.find((p) => p.id === selectedId);
                    if (selectedPreset) {
                        // Apply the preset's filter options
                        activeFilters = Object.assign({}, selectedPreset.options);
                        // Update state with new active filters
                        view.dispatch({
                            effects: updateActiveFilters.of(Object.assign({}, activeFilters)),
                        });
                        // Update the UI to reflect the selected options
                        updateFilterUI();
                        // Apply the filters
                        applyTaskFilters(view, plugin);
                    }
                }
                else {
                    // Reset to default options
                    activeFilters = Object.assign({}, DEFAULT_FILTER_OPTIONS);
                    // Update state with new active filters
                    view.dispatch({
                        effects: updateActiveFilters.of(Object.assign({}, activeFilters)),
                    }); // Update the UI to reflect the selected options
                    updateFilterUI();
                    // Apply the filters
                    applyTaskFilters(view, plugin);
                }
            });
        });
    }
    // Add Advanced Filter Query Input
    const advancedSection = filterOptionsDiv.createEl("div", {
        cls: "task-filter-section",
    });
    let queryInput = null;
    // Text input for advanced filter
    new Setting(advancedSection)
        .setName(t("Query"))
        .setDesc(t("Use boolean operations: AND, OR, NOT. Example: 'text content AND #tag1 AND DATE:<2022-01-02 NOT PRIORITY:>=#B' - Supports >, <, =, >=, <=, != for PRIORITY and DATE."))
        .addText((text) => {
        queryInput = text;
        text.setValue(getFilterOption(options, "advancedFilterQuery")).onChange((value) => {
            activeFilters.advancedFilterQuery = value;
            // Update state with new active filters
            view.dispatch({
                effects: updateActiveFilters.of(Object.assign({}, activeFilters)),
            });
            debounceFilter(view, plugin);
        });
        text.inputEl.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                if (Keymap.isModEvent(event)) {
                    // Use Ctrl+Enter to switch to EXCLUDE mode
                    activeFilters.filterMode = "EXCLUDE";
                    // Update state with new active filters
                    view.dispatch({
                        effects: updateActiveFilters.of(Object.assign({}, activeFilters)),
                    });
                    debounceFilter(view, plugin);
                }
                else {
                    // Regular Enter uses INCLUDE mode
                    activeFilters.filterMode = "INCLUDE";
                    // Update state with new active filters
                    view.dispatch({
                        effects: updateActiveFilters.of(Object.assign({}, activeFilters)),
                    });
                    debounceFilter(view, plugin);
                }
            }
            else if (event.key === "Escape") {
                view.dispatch({ effects: toggleTaskFilter.of(false) });
            }
        });
        text.inputEl.toggleClass("task-filter-query-input", true);
    });
    // Add Filter Mode selector
    const filterModeSection = filterOptionsDiv.createEl("div", {
        cls: "task-filter-section",
    });
    let filterModeDropdown = null;
    new Setting(filterModeSection)
        .setName(t("Filter Mode"))
        .setDesc(t("Choose whether to include or exclude tasks that match the filters"))
        .addDropdown((dropdown) => {
        filterModeDropdown = dropdown;
        dropdown
            .addOption("INCLUDE", t("Show matching tasks"))
            .addOption("EXCLUDE", t("Hide matching tasks"))
            .setValue(getFilterOption(options, "filterMode"))
            .onChange((value) => {
            activeFilters.filterMode = value;
            // Update state with new active filters
            view.dispatch({
                effects: updateActiveFilters.of(Object.assign({}, activeFilters)),
            });
            applyTaskFilters(view, plugin);
        });
    });
    // Status filter checkboxes
    const statusSection = filterOptionsDiv.createEl("div", {
        cls: "task-filter-section",
    });
    new Setting(statusSection).setName(t("Checkbox Status")).setHeading();
    const statuses = [
        { id: "Completed", label: t("Completed") },
        { id: "InProgress", label: t("In Progress") },
        { id: "Abandoned", label: t("Abandoned") },
        { id: "NotStarted", label: t("Not Started") },
        { id: "Planned", label: t("Planned") },
    ];
    // Store status toggles for updating when preset is selected
    const statusToggles = {};
    for (const status of statuses) {
        const propName = `include${status.id}`;
        new Setting(statusSection).setName(status.label).addToggle((toggle) => {
            statusToggles[propName] = toggle;
            toggle
                .setValue(getFilterOption(options, propName))
                .onChange((value) => {
                activeFilters[propName] = value;
                // Update state with new active filters
                view.dispatch({
                    effects: updateActiveFilters.of(Object.assign({}, activeFilters)),
                });
                applyTaskFilters(view, plugin);
            });
        });
    }
    // Advanced filter options
    const relatedSection = filterOptionsDiv.createEl("div", {
        cls: "task-filter-section",
    });
    new Setting(relatedSection)
        .setName(t("Include Related Tasks"))
        .setHeading();
    // Parent/Child task inclusion options
    const relatedOptions = [
        { id: "ParentTasks", label: t("Parent Tasks") },
        { id: "ChildTasks", label: t("Child Tasks") },
        { id: "SiblingTasks", label: t("Sibling Tasks") },
    ];
    // Store related toggles for updating when preset is selected
    const relatedToggles = {};
    for (const option of relatedOptions) {
        const propName = `include${option.id}`;
        new Setting(relatedSection)
            .setName(option.label)
            .addToggle((toggle) => {
            relatedToggles[propName] = toggle;
            toggle
                .setValue(getFilterOption(options, propName))
                .onChange((value) => {
                activeFilters[propName] = value;
                // Update state with new active filters
                view.dispatch({
                    effects: updateActiveFilters.of(Object.assign({}, activeFilters)),
                });
                applyTaskFilters(view, plugin);
            });
        });
    }
    // Action buttons
    new Setting(dom)
        .addButton((button) => {
        button.setCta();
        button.setButtonText(t("Apply")).onClick(() => {
            applyTaskFilters(view, plugin);
        });
    })
        .addButton((button) => {
        button.setCta();
        button.setButtonText(t("Save")).onClick(() => {
            // Check if there are any changes to save
            if (checkFilterChanges(view, plugin)) {
                // Get current active filters from state
                const currentActiveFilters = getActiveFiltersForView(view);
                const newPreset = {
                    id: Date.now().toString() +
                        Math.random().toString(36).substr(2, 9),
                    name: t("New Preset"),
                    options: Object.assign({}, currentActiveFilters),
                };
                // Add to settings
                plugin.settings.taskFilter.presetTaskFilters.push(newPreset);
                plugin.saveSettings();
                new Notice(t("Preset saved"));
            }
            else {
                new Notice(t("No changes to save"));
            }
        });
    })
        .addButton((button) => {
        button.buttonEl.toggleClass("mod-destructive", true);
        button.setButtonText(t("Reset")).onClick(() => {
            resetTaskFilters(view);
            if (queryInput && queryInput.inputEl) {
                queryInput.inputEl.value = "";
            }
            activeFilters = Object.assign({}, DEFAULT_FILTER_OPTIONS);
            // Update state with new active filters
            view.dispatch({
                effects: updateActiveFilters.of(Object.assign({}, activeFilters)),
            }); // Update the UI to reflect the selected options
            updateFilterUI();
            if (d) {
                d.setValue("");
            }
            // Apply the filters
            applyTaskFilters(view, plugin);
        });
    })
        .addButton((button) => {
        button.buttonEl.toggleClass("mod-destructive", true);
        button.setButtonText(t("Close")).onClick(() => {
            view.dispatch({ effects: toggleTaskFilter.of(false) });
        });
    });
    // Function to update UI elements when a preset is selected
    function updateFilterUI() {
        const activeFilters = getActiveFiltersForView(view);
        // Update query input
        if (queryInput) {
            queryInput.setValue(activeFilters.advancedFilterQuery);
        }
        // Update filter mode dropdown if it exists
        if (filterModeDropdown) {
            filterModeDropdown.setValue(activeFilters.filterMode);
        }
        // Update status toggles
        for (const status of statuses) {
            const propName = `include${status.id}`;
            if (statusToggles[propName]) {
                statusToggles[propName].setValue(activeFilters[propName]);
            }
        }
        // Update related toggles
        for (const option of relatedOptions) {
            const propName = `include${option.id}`;
            if (relatedToggles[propName]) {
                relatedToggles[propName].setValue(activeFilters[propName]);
            }
        }
    }
    const focusInput = () => {
        if (queryInput && queryInput.inputEl) {
            queryInput.inputEl.focus();
        }
    };
    return { focusInput };
}
// Create the task filter panel
function createTaskFilterPanel(view) {
    const dom = createDiv({
        cls: "task-filter-panel",
    });
    const plugin = view.state.facet(pluginFacet);
    // Use the activeFiltersState instead of the taskFilterOptions
    // This ensures we're showing the actual current state for this editor
    const activeFilters = getActiveFiltersForView(view);
    const { focusInput } = filterPanelDisplay(view, dom, activeFilters, plugin);
    return {
        dom,
        top: true,
        mount: () => {
            focusInput();
        },
        update: (update) => {
            // Update panel content if needed
        },
        destroy: () => {
            // Clear any filters when the panel is closed
            // Use setTimeout to avoid dispatching during an update
            // setTimeout(() => {
            // 	resetTaskFilters(view);
            // }, 0);
        },
    };
}
// Apply the current task filters
function applyTaskFilters(view, plugin) {
    var _a, _b;
    // Get current active filters from state
    const activeFilters = getActiveFiltersForView(view);
    // Find tasks in the document
    const tasks = findAllTasks(view, plugin.settings.taskStatuses);
    // Build a map of matching tasks for quick lookup
    const matchingTaskIds = new Set();
    // Set for tasks that directly match primary filters
    const directMatchTaskIds = new Set();
    // Calculate new hidden task ranges
    let hiddenTaskRanges = [];
    // First identify tasks that pass status filters (mandatory)
    const statusFilteredTasks = [];
    tasks.forEach((task, index) => {
        // Check if task passes status filters
        const passesStatusFilter = (activeFilters.includeCompleted && task.status === "completed") ||
            (activeFilters.includeInProgress && task.status === "inProgress") ||
            (activeFilters.includeAbandoned && task.status === "abandoned") ||
            (activeFilters.includeNotStarted && task.status === "notStarted") ||
            (activeFilters.includePlanned && task.status === "planned");
        // Only process tasks that match status filters
        if (passesStatusFilter) {
            statusFilteredTasks.push({ task, index });
        }
    });
    // Then apply query filters to status-filtered tasks
    for (const { task, index } of statusFilteredTasks) {
        // Check advanced query if present
        let matchesQuery = true;
        if (activeFilters.advancedFilterQuery.trim() !== "") {
            try {
                const parseResult = parseAdvancedFilterQuery(activeFilters.advancedFilterQuery);
                const result = evaluateFilterNode(parseResult, mapTaskForFiltering(task));
                // Use the direct result, filter mode will be handled later
                matchesQuery = result;
            }
            catch (error) {
                console.error("Error evaluating advanced filter:", error);
            }
        }
        // If the task passes both status and query filters
        if (matchesQuery) {
            directMatchTaskIds.add(index);
            matchingTaskIds.add(index);
        }
    }
    // Now identify parent/child/sibling relationships only for tasks that match primary filters
    if (activeFilters.includeParentTasks ||
        activeFilters.includeChildTasks ||
        activeFilters.includeSiblingTasks) {
        for (let i = 0; i < tasks.length; i++) {
            if (directMatchTaskIds.has(i)) {
                const task = tasks[i];
                // Include parents if enabled AND they match status filters
                if (activeFilters.includeParentTasks) {
                    let parent = task.parentTask;
                    while (parent) {
                        // Only include parent if it matches status filters
                        if ((activeFilters.includeCompleted &&
                            parent.status === "completed") ||
                            (activeFilters.includeInProgress &&
                                parent.status === "inProgress") ||
                            (activeFilters.includeAbandoned &&
                                parent.status === "abandoned") ||
                            (activeFilters.includeNotStarted &&
                                parent.status === "notStarted") ||
                            (activeFilters.includePlanned &&
                                parent.status === "planned")) {
                            const parentIndex = tasks.indexOf(parent);
                            if (parentIndex !== -1) {
                                matchingTaskIds.add(parentIndex);
                            }
                        }
                        parent = parent.parentTask;
                    }
                }
                // Include children if enabled AND they match status filters
                if (activeFilters.includeChildTasks) {
                    const addChildren = (parentTask) => {
                        for (const child of parentTask.childTasks) {
                            // Only include child if it matches status filters
                            if ((activeFilters.includeCompleted &&
                                child.status === "completed") ||
                                (activeFilters.includeInProgress &&
                                    child.status === "inProgress") ||
                                (activeFilters.includeAbandoned &&
                                    child.status === "abandoned") ||
                                (activeFilters.includeNotStarted &&
                                    child.status === "notStarted") ||
                                (activeFilters.includePlanned &&
                                    child.status === "planned")) {
                                const childIndex = tasks.indexOf(child);
                                if (childIndex !== -1) {
                                    matchingTaskIds.add(childIndex);
                                    // Recursively add grandchildren
                                    addChildren(child);
                                }
                            }
                        }
                    };
                    addChildren(task);
                }
                // Include siblings if enabled AND they match status filters
                if (activeFilters.includeSiblingTasks && task.parentTask) {
                    for (const sibling of task.parentTask.childTasks) {
                        if (sibling !== task) {
                            // Only include sibling if it matches status filters
                            if ((activeFilters.includeCompleted &&
                                sibling.status === "completed") ||
                                (activeFilters.includeInProgress &&
                                    sibling.status === "inProgress") ||
                                (activeFilters.includeAbandoned &&
                                    sibling.status === "abandoned") ||
                                (activeFilters.includeNotStarted &&
                                    sibling.status === "notStarted") ||
                                (activeFilters.includePlanned &&
                                    sibling.status === "planned")) {
                                const siblingIndex = tasks.indexOf(sibling);
                                if (siblingIndex !== -1) {
                                    matchingTaskIds.add(siblingIndex);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    // Determine which tasks to hide based on the filter mode
    let tasksToHide;
    if (activeFilters.filterMode === "INCLUDE") {
        // In INCLUDE mode, hide tasks that don't match
        tasksToHide = tasks.filter((task, index) => !matchingTaskIds.has(index));
    }
    else {
        // In EXCLUDE mode, hide tasks that do match
        tasksToHide = tasks.filter((task, index) => matchingTaskIds.has(index));
    }
    // Store the ranges to hide
    hiddenTaskRanges = tasksToHide.map((task) => ({
        from: task.from,
        to: task.to,
    }));
    // Update hidden ranges in the state
    view.dispatch({
        effects: updateHiddenTaskRanges.of(hiddenTaskRanges),
    });
    (_b = (_a = view.state
        .field(editorInfoField)) === null || _a === void 0 ? void 0 : _a.filterAction) === null || _b === void 0 ? void 0 : _b.toggleClass("task-filter-active", checkFilterChanges(view, plugin));
    // Apply decorations to hide filtered tasks
    applyHiddenTaskDecorations(view, hiddenTaskRanges);
}
/**
 * Determines if a task should be hidden based on filter criteria
 * @param task The task to evaluate
 * @param filters The filter options to apply
 * @returns True if the task should be hidden, false otherwise
 */
function shouldHideTask(task, filters) {
    // First check status filters (these are non-negotiable)
    const passesStatusFilter = (filters.includeCompleted && task.status === "completed") ||
        (filters.includeInProgress && task.status === "inProgress") ||
        (filters.includeAbandoned && task.status === "abandoned") ||
        (filters.includeNotStarted && task.status === "notStarted") ||
        (filters.includePlanned && task.status === "planned");
    // If it doesn't pass status filter, always hide it
    if (!passesStatusFilter) {
        return true;
    }
    // Then check query filter if present
    if (filters.advancedFilterQuery.trim() !== "") {
        try {
            const parseResult = parseAdvancedFilterQuery(filters.advancedFilterQuery);
            const result = evaluateFilterNode(parseResult, mapTaskForFiltering(task));
            // Determine visibility based on filter mode
            const shouldShow = (filters.filterMode === "INCLUDE" && result) ||
                (filters.filterMode === "EXCLUDE" && !result);
            // If it doesn't meet display criteria, check if it should be shown due to relationships
            if (!shouldShow) {
                return !shouldShowDueToRelationships(task, filters);
            }
        }
        catch (error) {
            console.error("Error evaluating advanced filter:", error);
        }
    }
    return false;
}
/**
 * Determines if a task should be shown due to its relationships
 * despite failing query filter
 */
function shouldShowDueToRelationships(task, filters) {
    // Only consider relationships for tasks that pass status filters
    // Parent relationship
    if (filters.includeParentTasks && task.childTasks.length > 0) {
        if (hasMatchingDescendant(task, filters)) {
            return true;
        }
    }
    // Child relationship
    if (filters.includeChildTasks && task.parentTask) {
        // First check if parent passes status filter
        const parentPassesStatusFilter = (filters.includeCompleted &&
            task.parentTask.status === "completed") ||
            (filters.includeInProgress &&
                task.parentTask.status === "inProgress") ||
            (filters.includeAbandoned &&
                task.parentTask.status === "abandoned") ||
            (filters.includeNotStarted &&
                task.parentTask.status === "notStarted") ||
            (filters.includePlanned && task.parentTask.status === "planned");
        if (parentPassesStatusFilter) {
            // Then check query filter (if present)
            let parentPassesQueryFilter = true;
            if (filters.advancedFilterQuery.trim() !== "") {
                try {
                    const parseResult = parseAdvancedFilterQuery(filters.advancedFilterQuery);
                    const result = evaluateFilterNode(parseResult, mapTaskForFiltering(task.parentTask));
                    // Determine visibility based on filter mode
                    parentPassesQueryFilter =
                        (filters.filterMode === "INCLUDE" && result) ||
                            (filters.filterMode === "EXCLUDE" && !result);
                }
                catch (error) {
                    console.error("Error evaluating advanced filter:", error);
                }
            }
            if (parentPassesQueryFilter) {
                return true;
            }
        }
    }
    // Sibling relationship
    if (filters.includeSiblingTasks && task.parentTask) {
        for (const sibling of task.parentTask.childTasks) {
            if (sibling === task)
                continue; // Skip self
            // First check if sibling passes status filter
            const siblingPassesStatusFilter = (filters.includeCompleted && sibling.status === "completed") ||
                (filters.includeInProgress &&
                    sibling.status === "inProgress") ||
                (filters.includeAbandoned && sibling.status === "abandoned") ||
                (filters.includeNotStarted &&
                    sibling.status === "notStarted") ||
                (filters.includePlanned && sibling.status === "planned");
            if (siblingPassesStatusFilter) {
                // Then check query filter (if present)
                let siblingPassesQueryFilter = true;
                if (filters.advancedFilterQuery.trim() !== "") {
                    try {
                        const parseResult = parseAdvancedFilterQuery(filters.advancedFilterQuery);
                        const result = evaluateFilterNode(parseResult, mapTaskForFiltering(sibling));
                        // Determine visibility based on filter mode
                        siblingPassesQueryFilter =
                            (filters.filterMode === "INCLUDE" && result) ||
                                (filters.filterMode === "EXCLUDE" && !result);
                    }
                    catch (error) {
                        console.error("Error evaluating advanced filter:", error);
                    }
                }
                if (siblingPassesQueryFilter) {
                    return true;
                }
            }
        }
    }
    return false;
}
/**
 * Checks if a task has any descendant that matches the filter criteria
 * @param task The parent task to check
 * @param filters The filter options to apply
 * @returns True if any descendant matches the filter
 */
function hasMatchingDescendant(task, filters) {
    // Check each child task
    for (const child of task.childTasks) {
        // First check if child passes status filter (mandatory)
        const childPassesStatusFilter = (filters.includeCompleted && child.status === "completed") ||
            (filters.includeInProgress && child.status === "inProgress") ||
            (filters.includeAbandoned && child.status === "abandoned") ||
            (filters.includeNotStarted && child.status === "notStarted") ||
            (filters.includePlanned && child.status === "planned");
        if (childPassesStatusFilter) {
            // Then check query filter if present
            let childPassesQueryFilter = true;
            if (filters.advancedFilterQuery.trim() !== "") {
                try {
                    const parseResult = parseAdvancedFilterQuery(filters.advancedFilterQuery);
                    const result = evaluateFilterNode(parseResult, mapTaskForFiltering(child));
                    // Determine visibility based on filter mode
                    childPassesQueryFilter =
                        (filters.filterMode === "INCLUDE" && result) ||
                            (filters.filterMode === "EXCLUDE" && !result);
                }
                catch (error) {
                    console.error("Error evaluating advanced filter:", error);
                }
            }
            if (childPassesQueryFilter) {
                return true;
            }
        }
        // Recursively check grandchildren
        if (hasMatchingDescendant(child, filters)) {
            return true;
        }
    }
    return false;
}
// Apply decorations to hide filtered tasks
function applyHiddenTaskDecorations(view, ranges = []) {
    // Create decorations for hidden tasks
    const decorations = ranges.map((range) => {
        return Decoration.replace({
            inclusive: true,
            block: true,
        }).range(range.from, range.to);
    });
    // Apply the decorations
    if (decorations.length > 0) {
        view.dispatch({
            effects: filterTasksEffect.of(Decoration.none.update({
                add: decorations,
                filter: () => false,
            })),
        });
    }
    else {
        // Clear decorations if no tasks to hide
        view.dispatch({
            effects: filterTasksEffect.of(Decoration.none),
        });
    }
}
// State field to handle hidden task decorations
export const filterTasksEffect = StateEffect.define();
export const filterTasksField = StateField.define({
    create() {
        return Decoration.none;
    },
    update(decorations, tr) {
        decorations = decorations.map(tr.changes);
        for (const effect of tr.effects) {
            if (effect.is(filterTasksEffect)) {
                decorations = effect.value;
            }
        }
        return decorations;
    },
    provide(field) {
        return EditorView.decorations.from(field);
    },
});
// Facets to make app and plugin instances available to the panel
export const appFacet = Facet.define({
    combine: (values) => values[0],
});
export const pluginFacet = Facet.define({
    combine: (values) => values[0],
});
// Create the extension to enable task filtering in an editor
export function taskFilterExtension(plugin) {
    return [
        taskFilterState,
        activeFiltersState,
        hiddenTaskRangesState,
        actionButtonState,
        filterTasksField,
        taskFilterOptions.of(DEFAULT_FILTER_OPTIONS),
        pluginFacet.of(plugin),
    ];
}
/**
 * Gets the active filter options for a specific editor view
 * @param view The editor view to get active filters for
 * @returns The active filter options for the view
 */
export function getActiveFiltersForView(view) {
    if (view.state.field(activeFiltersState, false)) {
        const activeFilters = view.state.field(activeFiltersState);
        // Ensure the active filters are properly migrated
        return migrateOldFilterOptions(activeFilters);
    }
    return Object.assign({}, DEFAULT_FILTER_OPTIONS);
}
/**
 * Gets the hidden task ranges for a specific editor view
 * @param view The editor view to get hidden ranges for
 * @returns The array of hidden task ranges
 */
export function getHiddenTaskRangesForView(view) {
    if (view.state.field(hiddenTaskRangesState, false)) {
        return view.state.field(hiddenTaskRangesState);
    }
    return [];
}
// Reset all task filters
function resetTaskFilters(view) {
    var _a, _b;
    // Reset active filters to defaults in state
    view.dispatch({
        effects: [
            updateActiveFilters.of(Object.assign({}, DEFAULT_FILTER_OPTIONS)),
            updateHiddenTaskRanges.of([]),
        ],
    });
    (_b = (_a = view.state
        .field(editorInfoField)) === null || _a === void 0 ? void 0 : _a.filterAction) === null || _b === void 0 ? void 0 : _b.toggleClass("task-filter-active", false // Always false on reset
    );
    // Apply decorations to hide filtered tasks
    applyHiddenTaskDecorations(view, []);
}
// Find all tasks in the document and build the task hierarchy
function findAllTasks(view, taskStatusMarks) {
    const doc = view.state.doc;
    const tasks = [];
    const taskStack = [];
    // Extract status marks for matching
    const completedMarks = taskStatusMarks.completed.split("|");
    const inProgressMarks = taskStatusMarks.inProgress.split("|");
    const abandonedMarks = taskStatusMarks.abandoned.split("|");
    const notStartedMarks = taskStatusMarks.notStarted.split("|");
    const plannedMarks = taskStatusMarks.planned.split("|");
    // Simple regex to match task lines
    const taskRegex = /^(\s*)(-|\*|(\d+\.)) \[(.)\] (.*)$/gm;
    // Regex for extracting priorities (both letter format and emoji)
    const priorityRegex = /\[(#[A-Z])\]|(?:🔺|⏫|🔼|🔽|⏬️|🔴|🟠|🟡|🟢|🔵|⚪️|⚫️)/g;
    // Regex for extracting tags
    const tagRegex = /#([a-zA-Z0-9_\-/\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f\u3131-\uD79D]+)/g;
    // Regex for extracting dates (looking for YYYY-MM-DD format or other common date formats)
    const dateRegex = /\d{4}-\d{2}-\d{2}|\d{2}\.\d{2}\.\d{4}|\d{2}\/\d{2}\/\d{4}/g;
    // Search the document for task lines
    for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const lineText = line.text;
        // Reset the regex
        taskRegex.lastIndex = 0;
        let m;
        if ((m = taskRegex.exec(lineText))) {
            const indentation = m[1].length;
            const statusMark = m[4]; // The character inside brackets
            const taskText = m[5]; // The text after the checkbox
            // Determine task status based on the mark
            let status;
            // Match the status mark against our configured marks
            if (completedMarks.includes(statusMark)) {
                status = "completed";
            }
            else if (inProgressMarks.includes(statusMark)) {
                status = "inProgress";
            }
            else if (abandonedMarks.includes(statusMark)) {
                status = "abandoned";
            }
            else if (plannedMarks.includes(statusMark)) {
                status = "planned";
            }
            else {
                status = "notStarted";
            }
            // Extract priority
            priorityRegex.lastIndex = 0;
            const priorityMatch = priorityRegex.exec(taskText);
            let priority = priorityMatch ? priorityMatch[0] : undefined;
            // Extract tags
            tagRegex.lastIndex = 0;
            const tags = [];
            let tagMatch;
            while ((tagMatch = tagRegex.exec(taskText)) !== null) {
                tags.push(tagMatch[0]);
            }
            // Extract date
            dateRegex.lastIndex = 0;
            const dateMatch = dateRegex.exec(taskText);
            let date = dateMatch ? dateMatch[0] : undefined;
            // Create the task object
            const task = {
                from: line.from,
                to: line.to,
                text: taskText,
                status,
                indentation,
                childTasks: [],
                priority,
                date,
                tags,
            };
            // Fix: Build hierarchy - find the parent for this task
            // Pop items from stack until we find a potential parent with less indentation
            while (taskStack.length > 0 &&
                taskStack[taskStack.length - 1].indentation >= indentation) {
                taskStack.pop();
            }
            // If we still have items in the stack, the top item is our parent
            if (taskStack.length > 0) {
                const parent = taskStack[taskStack.length - 1];
                task.parentTask = parent;
                parent.childTasks.push(task);
            }
            // Add to the task list and stack
            tasks.push(task);
            taskStack.push(task);
        }
    }
    return tasks;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFzay1maWx0ZXItcGFuZWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0YXNrLWZpbHRlci1wYW5lbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBSU4sTUFBTSxFQUdOLElBQUksRUFDSixNQUFNLEVBQ04sT0FBTyxFQUdQLFFBQVEsRUFDUixpQkFBaUIsRUFDakIsZUFBZSxFQUNmLE1BQU0sR0FDTixNQUFNLFVBQVUsQ0FBQztBQUNsQixPQUFPLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQWUsTUFBTSxtQkFBbUIsQ0FBQztBQUNoRixPQUFPLEVBQ04sVUFBVSxFQUNWLFNBQVMsRUFHVCxVQUFVLEdBRVYsTUFBTSxrQkFBa0IsQ0FBQztBQUUxQixPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLGtCQUFrQixFQUNsQix3QkFBd0IsR0FDeEIsTUFBTSxtQ0FBbUMsQ0FBQztBQUMzQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFMUMsT0FBTywwQkFBMEIsQ0FBQztBQUVsQyxvQ0FBb0M7QUFDcEMsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBVyxDQUFDO0FBRTlELHlDQUF5QztBQUN6QyxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxXQUFXLENBQUMsTUFBTSxFQUFxQixDQUFDO0FBRTNFLHNDQUFzQztBQUN0QyxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FDbEMsV0FBVyxDQUFDLE1BQU0sRUFBdUMsQ0FBQztBQUUzRCwwREFBMEQ7QUFDMUQsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQVU7SUFDekQsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLEtBQUs7SUFDbkIsTUFBTSxDQUFDLEtBQUssRUFBRSxFQUFFOztRQUNmLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRTtZQUN6QixJQUFJLENB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UTtnQkFDZCxNQUFNO2dCQUNOLFdBQVc7Z0JBQ1gsVUFBVSxFQUFFLEVBQUU7Z0JBQ2QsUUFBUTtnQkFDUixJQUFJO2dCQUNKLElBQUk7YUFDSixDQUFDO1lBRUYsdURBQXVEO1lBQ3ZELDhFQUE4RTtZQUM5RSxPQUNDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQztnQkFDcEIsU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsV0FBVyxJQUFJLFdBQVcsRUFDekQ7Z0JBQ0QsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDO2FBQ2hCO1lBRUQsa0VBQWtFO1lBQ2xFLElBQUksU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7Z0JBQ3pCLE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUMvQyxJQUFJLENBQUMsVUFBVSxHQUFHLE1BQU0sQ0FBQztnQkFDekIsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDN0I7WUFFRCxpQ0FBaUM7WUFDakMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNqQixTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3JCO0tBQ0Q7SUFFRCxPQUFPLEtBQUssQ0FBQztBQUNkLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xyXG5cdEFwcCxcclxuXHREcm9wZG93bkNvbXBvbmVudCxcclxuXHRJdGVtVmlldyxcclxuXHRLZXltYXAsXHJcblx0TWFya2Rvd25GaWxlSW5mbyxcclxuXHRNYXJrZG93blZpZXcsXHJcblx0TWVudSxcclxuXHROb3RpY2UsXHJcblx0U2V0dGluZyxcclxuXHRUZXh0Q29tcG9uZW50LFxyXG5cdFZpZXcsXHJcblx0ZGVib3VuY2UsXHJcblx0ZWRpdG9yRWRpdG9yRmllbGQsXHJcblx0ZWRpdG9ySW5mb0ZpZWxkLFxyXG5cdG1vbWVudCxcclxufSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgU3RhdGVGaWVsZCwgU3RhdGVFZmZlY3QsIEZhY2V0LCBFZGl0b3JTdGF0ZSB9IGZyb20gXCJAY29kZW1pcnJvci9zdGF0ZVwiO1xyXG5pbXBvcnQge1xyXG5cdEVkaXRvclZpZXcsXHJcblx0c2hvd1BhbmVsLFxyXG5cdFZpZXdVcGRhdGUsXHJcblx0UGFuZWwsXHJcblx0RGVjb3JhdGlvbixcclxuXHREZWNvcmF0aW9uU2V0LFxyXG59IGZyb20gXCJAY29kZW1pcnJvci92aWV3XCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjtcclxuaW1wb3J0IHtcclxuXHRwYXJzZUFkdmFuY2VkRmlsdGVyUXVlcnksXHJcblx0ZXZhbHVhdGVGaWx0ZXJOb2RlLFxyXG5cdHBhcnNlUHJpb3JpdHlGaWx0ZXJWYWx1ZSxcclxufSBmcm9tIFwiQC91dGlscy90YXNrL2ZpbHRlci1jb21wYXRpYmlsaXR5XCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCB7IFRhc2sgYXMgVGFza0luZGV4VGFzayB9IGZyb20gXCJAL3R5cGVzL3Rhc2tcIjtcclxuaW1wb3J0IFwiQC9zdHlsZXMvdGFzay1maWx0ZXIuY3NzXCI7XHJcblxyXG4vLyBFZmZlY3QgdG8gdG9nZ2xlIHRoZSBmaWx0ZXIgcGFuZWxcclxuZXhwb3J0IGNvbnN0IHRvZ2dsZVRhc2tGaWx0ZXIgPSBTdGF0ZUVmZmVjdC5kZWZpbmU8Ym9vbGVhbj4oKTtcclxuXHJcbi8vIEVmZmVjdCB0byB1cGRhdGUgYWN0aXZlIGZpbHRlciBvcHRpb25zXHJcbmV4cG9ydCBjb25zdCB1cGRhdGVBY3RpdmVGaWx0ZXJzID0gU3RhdGVFZmZlY3QuZGVmaW5lPFRhc2tGaWx0ZXJPcHRpb25zPigpO1xyXG5cclxuLy8gRWZmZWN0IHRvIHVwZGF0ZSBoaWRkZW4gdGFzayByYW5nZXNcclxuZXhwb3J0IGNvbnN0IHVwZGF0ZUhpZGRlblRhc2tSYW5nZXMgPVxyXG5cdFN0YXRlRWZmZWN0LmRlZmluZTxBcnJheTx7IGZyb206IG51bWJlcjsgdG86IG51bWJlciB9Pj4oKTtcclxuXHJcbi8vIERlZmluZSBhIHN0YXRlIGZpZWxkIHRvIHRyYWNrIHdoZXRoZXIgdGhlIHBhbmVsIGlzIG9wZW5cclxuZXhwb3J0IGNvbnN0IHRhc2tGaWx0ZXJTdGF0ZSA9IFN0YXRlRmllbGQuZGVmaW5lPGJvb2xlYW4+KHtcclxuXHRjcmVhdGU6ICgpID0+IGZhbHNlLFxyXG5cdHVwZGF0ZSh2YWx1ZSwgdHIpIHtcclxuXHRcdGZvciAobGV0IGUgb2YgdHIuZWZmZWN0cykge1xyXG5cdFx0XHRpZiAoZS5pcyh0b2dnbGVUYXNrRmlsdGVyKSkge1xyXG5cdFx0XHRcdGlmICh0ci5zdGF0ZS5maWVsZChlZGl0b3JJbmZvRmllbGQpPy5maWxlKSB7XHJcblx0XHRcdFx0XHR2YWx1ZSA9IGUudmFsdWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdmFsdWU7XHJcblx0fSxcclxuXHRwcm92aWRlOiAoZmllbGQpID0+XHJcblx0XHRzaG93UGFuZWwuZnJvbShmaWVsZCwgKGFjdGl2ZSkgPT5cclxuXHRcdFx0YWN0aXZlID8gY3JlYXRlVGFza0ZpbHRlclBhbmVsIDogbnVsbFxyXG5cdFx0KSxcclxufSk7XHJcblxyXG4vLyBEZWZpbmUgYSBzdGF0ZSBmaWVsZCB0byB0cmFjayBhY3RpdmUgZmlsdGVycyBmb3IgZWFjaCBlZGl0b3Igdmlld1xyXG5leHBvcnQgY29uc3QgYWN0aXZlRmlsdGVyc1N0YXRlID0gU3RhdGVGaWVsZC5kZWZpbmU8VGFza0ZpbHRlck9wdGlvbnM+KHtcclxuXHRjcmVhdGU6ICgpID0+ICh7IC4uLkRFRkFVTFRfRklMVEVSX09QVElPTlMgfSksXHJcblx0dXBkYXRlKHZhbHVlLCB0cikge1xyXG5cdFx0Zm9yIChsZXQgZSBvZiB0ci5lZmZlY3RzKSB7XHJcblx0XHRcdGlmIChlLmlzKHVwZGF0ZUFjdGl2ZUZpbHRlcnMpKSB7XHJcblx0XHRcdFx0dmFsdWUgPSBlLnZhbHVlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdmFsdWU7XHJcblx0fSxcclxufSk7XHJcblxyXG5leHBvcnQgY29uc3QgYWN0aW9uQnV0dG9uU3RhdGUgPSBTdGF0ZUZpZWxkLmRlZmluZTxib29sZWFuPih7XHJcblx0Y3JlYXRlOiAoc3RhdGU6IEVkaXRvclN0YXRlKSA9PiB7XHJcblx0XHQvLyBJbml0aWFsaXplIGFzIGZhbHNlLCB3aWxsIGJlIHNldCB0byB0cnVlIG9uY2UgYWN0aW9uIGJ1dHRvbiBpcyBhZGRlZFxyXG5cdFx0cmV0dXJuIGZhbHNlO1xyXG5cdH0sXHJcblx0dXBkYXRlKHZhbHVlLCB0cikge1xyXG5cdFx0Ly8gQ2hlY2sgaWYgdGhpcyBpcyB0aGUgZmlyc3QgdGltZSB3ZSdyZSBsb2FkaW5nXHJcblx0XHRpZiAoIXZhbHVlKSB7XHJcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdC8vIEdldCB0aGUgZWRpdG9yIHZpZXcgZnJvbSB0aGUgdHJhbnNhY3Rpb24gc3RhdGVcclxuXHRcdFx0XHRjb25zdCB2aWV3ID0gdHIuc3RhdGUuZmllbGQoXHJcblx0XHRcdFx0XHRlZGl0b3JJbmZvRmllbGRcclxuXHRcdFx0XHQpIGFzIHVua25vd24gYXMgSXRlbVZpZXc7XHJcblx0XHRcdFx0Y29uc3QgZWRpdG9yID0gdHIuc3RhdGUuZmllbGQoZWRpdG9yRWRpdG9yRmllbGQpO1xyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdHZpZXcgJiZcclxuXHRcdFx0XHRcdGVkaXRvciAmJlxyXG5cdFx0XHRcdFx0KHZpZXcgYXMgdW5rbm93biBhcyBNYXJrZG93bkZpbGVJbmZvKT8uZmlsZVxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0Ly8gQHRzLWlnbm9yZVxyXG5cdFx0XHRcdFx0aWYgKHZpZXcuZmlsdGVyQWN0aW9uKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0Y29uc3QgcGx1Z2luID0gdHIuc3RhdGUuZmFjZXQocGx1Z2luRmFjZXQpO1xyXG5cdFx0XHRcdFx0Ly8gQWRkIHByZXNldCBtZW51IGFjdGlvbiBidXR0b24gdG8gdGhlIG1hcmtkb3duIHZpZXdcclxuXHRcdFx0XHRcdGNvbnN0IGZpbHRlckFjdGlvbiA9IHZpZXc/LmFkZEFjdGlvbihcclxuXHRcdFx0XHRcdFx0XCJmaWx0ZXJcIixcclxuXHRcdFx0XHRcdFx0dChcIkZpbHRlciBUYXNrc1wiKSxcclxuXHRcdFx0XHRcdFx0KGV2ZW50KSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gQ3JlYXRlIGRyb3Bkb3duIG1lbnUgZm9yIGZpbHRlciBwcmVzZXRzXHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgbWVudSA9IG5ldyBNZW51KCk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGFjdGl2ZUZpbHRlcnMgPVxyXG5cdFx0XHRcdFx0XHRcdFx0Z2V0QWN0aXZlRmlsdGVyc0ZvclZpZXcoZWRpdG9yKTtcclxuXHJcblx0XHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdFx0YWN0aXZlRmlsdGVycyAmJlxyXG5cdFx0XHRcdFx0XHRcdFx0Y2hlY2tGaWx0ZXJDaGFuZ2VzKGVkaXRvciwgcGx1Z2luKVxyXG5cdFx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGl0ZW0uc2V0VGl0bGUodChcIlJlc2V0XCIpKS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRlZGl0b3I/LmRpc3BhdGNoKHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGVmZmVjdHM6IHVwZGF0ZUFjdGl2ZUZpbHRlcnMub2YoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdERFRkFVTFRfRklMVEVSX09QVElPTlNcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0YXBwbHlUYXNrRmlsdGVycyhlZGl0b3IsIHBsdWdpbik7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZWRpdG9yLmRpc3BhdGNoKHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGVmZmVjdHM6IHRvZ2dsZVRhc2tGaWx0ZXIub2YoZmFsc2UpLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdGl0ZW0uc2V0VGl0bGUoXHJcblx0XHRcdFx0XHRcdFx0XHRcdGVkaXRvci5zdGF0ZS5maWVsZCh0YXNrRmlsdGVyU3RhdGUpXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0PyB0KFwiSGlkZSBmaWx0ZXIgcGFuZWxcIilcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQ6IHQoXCJTaG93IGZpbHRlciBwYW5lbFwiKVxyXG5cdFx0XHRcdFx0XHRcdFx0KS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0ZWRpdG9yPy5kaXNwYXRjaCh7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZWZmZWN0czogdG9nZ2xlVGFza0ZpbHRlci5vZihcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCFlZGl0b3Iuc3RhdGUuZmllbGQodGFza0ZpbHRlclN0YXRlKVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdG1lbnUuYWRkU2VwYXJhdG9yKCk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdC8vIEFkZCBwcmVzZXRzIGZyb20gcGx1Z2luIHNldHRpbmdzXHJcblx0XHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdFx0cGx1Z2luICYmXHJcblx0XHRcdFx0XHRcdFx0XHRwbHVnaW4uc2V0dGluZ3MudGFza0ZpbHRlci5wcmVzZXRUYXNrRmlsdGVyc1xyXG5cdFx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLnRhc2tGaWx0ZXIucHJlc2V0VGFza0ZpbHRlcnMuZm9yRWFjaChcclxuXHRcdFx0XHRcdFx0XHRcdFx0KHByZXNldCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0aXRlbS5zZXRUaXRsZShwcmVzZXQubmFtZSkub25DbGljayhcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0KCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8vIEFwcGx5IHRoZSBzZWxlY3RlZCBwcmVzZXRcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRpZiAoZWRpdG9yKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRlZGl0b3IuZGlzcGF0Y2goe1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRlZmZlY3RzOlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHVwZGF0ZUFjdGl2ZUZpbHRlcnMub2YoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdC4uLnByZXNldC5vcHRpb25zLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8vIEFwcGx5IGZpbHRlcnMgaW1tZWRpYXRlbHlcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGFwcGx5VGFza0ZpbHRlcnMoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGVkaXRvcixcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0cGx1Z2luXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdC8vIFNob3cgdGhlIG1lbnVcclxuXHRcdFx0XHRcdFx0XHRtZW51LnNob3dBdE1vdXNlRXZlbnQoZXZlbnQpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0cGx1Z2luLnJlZ2lzdGVyKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0ZmlsdGVyQWN0aW9uLmRldGFjaCgpO1xyXG5cdFx0XHRcdFx0XHQvLyBAdHMtaWdub3JlXHJcblx0XHRcdFx0XHRcdHZpZXcuZmlsdGVyQWN0aW9uID0gbnVsbDtcclxuXHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdC8vIEB0cy1pZ25vcmVcclxuXHRcdFx0XHRcdHZpZXcuZmlsdGVyQWN0aW9uID0gZmlsdGVyQWN0aW9uO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSwgMCk7XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHZhbHVlO1xyXG5cdH0sXHJcbn0pO1xyXG5cclxuLy8gRGVmaW5lIGEgc3RhdGUgZmllbGQgdG8gdHJhY2sgaGlkZGVuIHRhc2sgcmFuZ2VzIGZvciBlYWNoIGVkaXRvciB2aWV3XHJcbmV4cG9ydCBjb25zdCBoaWRkZW5UYXNrUmFuZ2VzU3RhdGUgPSBTdGF0ZUZpZWxkLmRlZmluZTxcclxuXHRBcnJheTx7IGZyb206IG51bWJlcjsgdG86IG51bWJlciB9PlxyXG4+KHtcclxuXHRjcmVhdGU6ICgpID0+IFtdLFxyXG5cdHVwZGF0ZSh2YWx1ZSwgdHIpIHtcclxuXHRcdC8vIFVwZGF0ZSBpZiB0aGVyZSdzIGFuIGV4cGxpY2l0IHVwZGF0ZSBlZmZlY3RcclxuXHRcdGZvciAobGV0IGUgb2YgdHIuZWZmZWN0cykge1xyXG5cdFx0XHRpZiAoZS5pcyh1cGRhdGVIaWRkZW5UYXNrUmFuZ2VzKSkge1xyXG5cdFx0XHRcdHJldHVybiBlLnZhbHVlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gT3RoZXJ3aXNlLCBtYXAgcmFuZ2VzIHRocm91Z2ggZG9jdW1lbnQgY2hhbmdlc1xyXG5cdFx0aWYgKHRyLmRvY0NoYW5nZWQpIHtcclxuXHRcdFx0dmFsdWUgPSB2YWx1ZS5tYXAoKHJhbmdlKSA9PiAoe1xyXG5cdFx0XHRcdGZyb206IHRyLmNoYW5nZXMubWFwUG9zKHJhbmdlLmZyb20pLFxyXG5cdFx0XHRcdHRvOiB0ci5jaGFuZ2VzLm1hcFBvcyhyYW5nZS50byksXHJcblx0XHRcdH0pKTtcclxuXHRcdH1cclxuXHRcdHJldHVybiB2YWx1ZTtcclxuXHR9LFxyXG59KTtcclxuXHJcbi8vIEludGVyZmFjZSBmb3IgZmlsdGVyIG9wdGlvbnNcclxuZXhwb3J0IGludGVyZmFjZSBUYXNrRmlsdGVyT3B0aW9ucyB7XHJcblx0Ly8gRmlsdGVyIHRhc2sgc3RhdHVzZXNcclxuXHRpbmNsdWRlQ29tcGxldGVkOiBib29sZWFuO1xyXG5cdGluY2x1ZGVJblByb2dyZXNzOiBib29sZWFuO1xyXG5cdGluY2x1ZGVBYmFuZG9uZWQ6IGJvb2xlYW47XHJcblx0aW5jbHVkZU5vdFN0YXJ0ZWQ6IGJvb2xlYW47XHJcblx0aW5jbHVkZVBsYW5uZWQ6IGJvb2xlYW47XHJcblxyXG5cdC8vIEluY2x1ZGUgcGFyZW50IGFuZCBjaGlsZCB0YXNrc1xyXG5cdGluY2x1ZGVQYXJlbnRUYXNrczogYm9vbGVhbjtcclxuXHRpbmNsdWRlQ2hpbGRUYXNrczogYm9vbGVhbjtcclxuXHRpbmNsdWRlU2libGluZ1Rhc2tzOiBib29sZWFuOyAvLyBOZXcgb3B0aW9uIGZvciBpbmNsdWRpbmcgc2libGluZyB0YXNrc1xyXG5cclxuXHQvLyBBZHZhbmNlZCBzZWFyY2ggcXVlcnlcclxuXHRhZHZhbmNlZEZpbHRlclF1ZXJ5OiBzdHJpbmc7XHJcblxyXG5cdC8vIEdsb2JhbCBmaWx0ZXIgbW9kZSAtIHRydWUgdG8gc2hvdyBtYXRjaGluZyB0YXNrcywgZmFsc2UgdG8gaGlkZSBtYXRjaGluZyB0YXNrc1xyXG5cdGZpbHRlck1vZGU6IFwiSU5DTFVERVwiIHwgXCJFWENMVURFXCI7XHJcbn1cclxuXHJcbi8vIERlZmF1bHQgZmlsdGVyIG9wdGlvbnNcclxuZXhwb3J0IGNvbnN0IERFRkFVTFRfRklMVEVSX09QVElPTlM6IFRhc2tGaWx0ZXJPcHRpb25zID0ge1xyXG5cdGluY2x1ZGVDb21wbGV0ZWQ6IHRydWUsXHJcblx0aW5jbHVkZUluUHJvZ3Jlc3M6IHRydWUsXHJcblx0aW5jbHVkZUFiYW5kb25lZDogdHJ1ZSxcclxuXHRpbmNsdWRlTm90U3RhcnRlZDogdHJ1ZSxcclxuXHRpbmNsdWRlUGxhbm5lZDogdHJ1ZSxcclxuXHJcblx0aW5jbHVkZVBhcmVudFRhc2tzOiB0cnVlLFxyXG5cdGluY2x1ZGVDaGlsZFRhc2tzOiB0cnVlLFxyXG5cdGluY2x1ZGVTaWJsaW5nVGFza3M6IGZhbHNlLCAvLyBEZWZhdWx0IHRvIGZhbHNlIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XHJcblxyXG5cdGFkdmFuY2VkRmlsdGVyUXVlcnk6IFwiXCIsXHJcblxyXG5cdGZpbHRlck1vZGU6IFwiSU5DTFVERVwiLFxyXG59O1xyXG5cclxuLy8gRmFjZXQgdG8gcHJvdmlkZSBmaWx0ZXIgb3B0aW9uc1xyXG5leHBvcnQgY29uc3QgdGFza0ZpbHRlck9wdGlvbnMgPSBGYWNldC5kZWZpbmU8XHJcblx0VGFza0ZpbHRlck9wdGlvbnMsXHJcblx0VGFza0ZpbHRlck9wdGlvbnNcclxuPih7XHJcblx0Y29tYmluZTogKHZhbHVlcykgPT4ge1xyXG5cdFx0Ly8gU3RhcnQgd2l0aCBkZWZhdWx0IHZhbHVlc1xyXG5cdFx0Y29uc3QgcmVzdWx0ID0geyAuLi5ERUZBVUxUX0ZJTFRFUl9PUFRJT05TIH07XHJcblxyXG5cdFx0Ly8gQ29tYmluZSBhbGwgdmFsdWVzLCB3aXRoIGxhdGVyIGRlZmluaXRpb25zIG92ZXJyaWRpbmcgZWFybGllciBvbmVzXHJcblx0XHRmb3IgKGNvbnN0IHZhbHVlIG9mIHZhbHVlcykge1xyXG5cdFx0XHRPYmplY3QuYXNzaWduKHJlc3VsdCwgdmFsdWUpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiByZXN1bHQ7XHJcblx0fSxcclxufSk7XHJcblxyXG4vLyBFbnN1cmUgYmFja3dhcmQgY29tcGF0aWJpbGl0eSBmb3Igb2xkZXIgcHJlc2V0IGNvbmZpZ3VyYXRpb25zIHRoYXQgbWlnaHQgdXNlIGZpbHRlck91dFRhc2tzXHJcbmV4cG9ydCBmdW5jdGlvbiBtaWdyYXRlT2xkRmlsdGVyT3B0aW9ucyhvcHRpb25zOiBhbnkpOiBUYXNrRmlsdGVyT3B0aW9ucyB7XHJcblx0Ly8gQ3JlYXRlIGEgbmV3IG9iamVjdCB3aXRoIGRlZmF1bHQgb3B0aW9uc1xyXG5cdGNvbnN0IG1pZ3JhdGVkID0geyAuLi5ERUZBVUxUX0ZJTFRFUl9PUFRJT05TIH07XHJcblxyXG5cdC8vIENvcHkgYWxsIHZhbGlkIHByb3BlcnRpZXMgZnJvbSB0aGUgb2xkIG9wdGlvbnNcclxuXHRPYmplY3Qua2V5cyhERUZBVUxUX0ZJTFRFUl9PUFRJT05TKS5mb3JFYWNoKChrZXkpID0+IHtcclxuXHRcdGlmIChrZXkgaW4gb3B0aW9ucyAmJiBvcHRpb25zW2tleV0gIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHQobWlncmF0ZWQgYXMgYW55KVtrZXldID0gb3B0aW9uc1trZXldO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHQvLyBIYW5kbGUgZmlsdGVyT3V0VGFza3MgdG8gZmlsdGVyTW9kZSBtaWdyYXRpb24gaWYgbmVlZGVkXHJcblx0aWYgKFwiZmlsdGVyT3V0VGFza3NcIiBpbiBvcHRpb25zICYmIG9wdGlvbnMuZmlsdGVyTW9kZSA9PT0gdW5kZWZpbmVkKSB7XHJcblx0XHRtaWdyYXRlZC5maWx0ZXJNb2RlID0gb3B0aW9ucy5maWx0ZXJPdXRUYXNrcyA/IFwiRVhDTFVERVwiIDogXCJJTkNMVURFXCI7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gbWlncmF0ZWQ7XHJcbn1cclxuXHJcbi8vIEhlbHBlciBmdW5jdGlvbiB0byBnZXQgZmlsdGVyIG9wdGlvbiB2YWx1ZSBzYWZlbHkgd2l0aCBwcm9wZXIgdHlwaW5nXHJcbmZ1bmN0aW9uIGdldEZpbHRlck9wdGlvbihcclxuXHRvcHRpb25zOiBUYXNrRmlsdGVyT3B0aW9ucyxcclxuXHRrZXk6IGtleW9mIFRhc2tGaWx0ZXJPcHRpb25zXHJcbik6IGFueSB7XHJcblx0cmV0dXJuIG9wdGlvbnNba2V5XTtcclxufVxyXG5cclxuLy8gRXh0ZW5kZWQgVGFzayBpbnRlcmZhY2Ugd2l0aCBhZGRpdGlvbmFsIHByb3BlcnRpZXMgZm9yIGZpbHRlcmluZ1xyXG5leHBvcnQgaW50ZXJmYWNlIFRhc2sge1xyXG5cdGZyb206IG51bWJlcjtcclxuXHR0bzogbnVtYmVyO1xyXG5cdHRleHQ6IHN0cmluZztcclxuXHRzdGF0dXM6IFwiY29tcGxldGVkXCIgfCBcImluUHJvZ3Jlc3NcIiB8IFwiYWJhbmRvbmVkXCIgfCBcIm5vdFN0YXJ0ZWRcIiB8IFwicGxhbm5lZFwiO1xyXG5cdGluZGVudGF0aW9uOiBudW1iZXI7XHJcblx0cGFyZW50VGFzaz86IFRhc2s7XHJcblx0Y2hpbGRUYXNrczogVGFza1tdO1xyXG5cdC8vIEFkZGVkIHByb3BlcnRpZXMgZm9yIGFkdmFuY2VkIGZpbHRlcmluZ1xyXG5cdHByaW9yaXR5Pzogc3RyaW5nOyAvLyBGb3JtYXQ6ICNBLCAjQiwgI0MsIGV0Yy4gb3IgZW1vamkgcHJpb3JpdGllc1xyXG5cdGRhdGU/OiBzdHJpbmc7IC8vIEFueSBkYXRlIGZvdW5kIGluIHRoZSB0YXNrXHJcblx0dGFnczogc3RyaW5nW107IC8vIEFsbCB0YWdzIGZvdW5kIGluIHRoZSB0YXNrXHJcbn1cclxuXHJcbi8vIEhlbHBlciBmdW5jdGlvbiB0byBtYXAgbG9jYWwgVGFzayB0byB0aGUgZm9ybWF0IGV4cGVjdGVkIGJ5IGV2YWx1YXRlRmlsdGVyTm9kZVxyXG4vLyBPbmx5IGluY2x1ZGVzIGZpZWxkcyBhY3R1YWxseSB1c2VkIGJ5IGV2YWx1YXRlRmlsdGVyTm9kZSBpbiBmaWx0ZXJVdGlscy50c1xyXG5mdW5jdGlvbiBtYXBUYXNrRm9yRmlsdGVyaW5nKHRhc2s6IFRhc2spOiBUYXNrSW5kZXhUYXNrIHtcclxuXHRsZXQgcHJpb3JpdHlWYWx1ZTogbnVtYmVyIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xyXG5cdGlmICh0YXNrLnByaW9yaXR5KSB7XHJcblx0XHRjb25zdCBwYXJzZWRQcmlvcml0eSA9IHBhcnNlUHJpb3JpdHlGaWx0ZXJWYWx1ZSh0YXNrLnByaW9yaXR5KTtcclxuXHRcdGlmIChwYXJzZWRQcmlvcml0eSAhPT0gbnVsbCkge1xyXG5cdFx0XHRwcmlvcml0eVZhbHVlID0gcGFyc2VkUHJpb3JpdHk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRsZXQgZHVlRGF0ZVRpbWVzdGFtcDogbnVtYmVyIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xyXG5cdGlmICh0YXNrLmRhdGUpIHtcclxuXHRcdC8vIFRyeSBwYXJzaW5nIHZhcmlvdXMgY29tbW9uIGZvcm1hdHMsIHN0cmljdCBwYXJzaW5nXHJcblx0XHRjb25zdCBwYXJzZWREYXRlID0gbW9tZW50KFxyXG5cdFx0XHR0YXNrLmRhdGUsXHJcblx0XHRcdFttb21lbnQuSVNPXzg2MDEsIFwiWVlZWS1NTS1ERFwiLCBcIkRELk1NLllZWVlcIiwgXCJNTS9ERC9ZWVlZXCJdLFxyXG5cdFx0XHR0cnVlXHJcblx0XHQpO1xyXG5cdFx0aWYgKHBhcnNlZERhdGUuaXNWYWxpZCgpKSB7XHJcblx0XHRcdGR1ZURhdGVUaW1lc3RhbXAgPSBwYXJzZWREYXRlLnZhbHVlT2YoKTsgLy8gR2V0IHRpbWVzdGFtcCBpbiBtc1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gT3B0aW9uYWw6IExvZyBwYXJzaW5nIGVycm9ycyBpZiBuZWVkZWRcclxuXHRcdFx0Ly8gY29uc29sZS53YXJuKGBDb3VsZCBub3QgcGFyc2UgZGF0ZTogJHt0YXNrLmRhdGV9IGZvciB0YXNrOiAke3Rhc2sudGV4dH1gKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJldHVybiB7XHJcblx0XHRpZDogYCR7dGFzay5mcm9tfS0ke3Rhc2sudG99YCxcclxuXHRcdGNvbnRlbnQ6IHRhc2sudGV4dCxcclxuXHRcdGZpbGVQYXRoOiBcIlwiLFxyXG5cdFx0bGluZTogMCxcclxuXHRcdGNvbXBsZXRlZDogdGFzay5zdGF0dXMgPT09IFwiY29tcGxldGVkXCIsXHJcblx0XHRzdGF0dXM6IHRhc2suc3RhdHVzLFxyXG5cdFx0b3JpZ2luYWxNYXJrZG93bjogdGFzay50ZXh0LFxyXG5cdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0dGFnczogdGFzay50YWdzLFxyXG5cdFx0XHRwcmlvcml0eTogcHJpb3JpdHlWYWx1ZSxcclxuXHRcdFx0ZHVlRGF0ZTogZHVlRGF0ZVRpbWVzdGFtcCxcclxuXHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0fSxcclxuXHR9IGFzIFRhc2tJbmRleFRhc2s7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNoZWNrRmlsdGVyQ2hhbmdlcyh2aWV3OiBFZGl0b3JWaWV3LCBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbikge1xyXG5cdC8vIEdldCBhY3RpdmUgZmlsdGVycyBmcm9tIHRoZSBzdGF0ZSBpbnN0ZWFkIG9mIHRoZSBmYWNldFxyXG5cdGNvbnN0IG9wdGlvbnMgPSBnZXRBY3RpdmVGaWx0ZXJzRm9yVmlldyh2aWV3KTtcclxuXHJcblx0Ly8gQ2hlY2sgaWYgY3VycmVudCBmaWx0ZXIgb3B0aW9ucyBhcmUgdGhlIHNhbWUgYXMgZGVmYXVsdCBvcHRpb25zXHJcblx0Y29uc3QgaXNEZWZhdWx0ID0gT2JqZWN0LmtleXMoREVGQVVMVF9GSUxURVJfT1BUSU9OUykuZXZlcnkoKGtleSkgPT4ge1xyXG5cdFx0cmV0dXJuIChcclxuXHRcdFx0b3B0aW9uc1trZXkgYXMga2V5b2YgVGFza0ZpbHRlck9wdGlvbnNdID09PVxyXG5cdFx0XHRERUZBVUxUX0ZJTFRFUl9PUFRJT05TW2tleSBhcyBrZXlvZiBUYXNrRmlsdGVyT3B0aW9uc11cclxuXHRcdCk7XHJcblx0fSk7XHJcblxyXG5cdC8vIFJldHVybiB3aGV0aGVyIHRoZXJlIGFyZSBhbnkgY2hhbmdlcyBmcm9tIGRlZmF1bHRcclxuXHRyZXR1cm4gIWlzRGVmYXVsdDtcclxufVxyXG5cclxuZnVuY3Rpb24gZmlsdGVyUGFuZWxEaXNwbGF5KFxyXG5cdHZpZXc6IEVkaXRvclZpZXcsXHJcblx0ZG9tOiBIVE1MRWxlbWVudCxcclxuXHRvcHRpb25zOiBUYXNrRmlsdGVyT3B0aW9ucyxcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpblxyXG4pIHtcclxuXHQvLyBHZXQgY3VycmVudCBhY3RpdmUgZmlsdGVycyBmcm9tIHN0YXRlXHJcblx0bGV0IGFjdGl2ZUZpbHRlcnMgPSBnZXRBY3RpdmVGaWx0ZXJzRm9yVmlldyh2aWV3KTtcclxuXHJcblx0Y29uc3QgZGVib3VuY2VGaWx0ZXIgPSBkZWJvdW5jZShcclxuXHRcdCh2aWV3OiBFZGl0b3JWaWV3LCBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbikgPT4ge1xyXG5cdFx0XHRhcHBseVRhc2tGaWx0ZXJzKHZpZXcsIHBsdWdpbik7XHJcblx0XHR9LFxyXG5cdFx0MjAwMFxyXG5cdCk7XHJcblxyXG5cdC8vIENyZWF0ZSBoZWFkZXIgd2l0aCB0aXRsZVxyXG5cdGNvbnN0IGhlYWRlckNvbnRhaW5lciA9IGRvbS5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRjbHM6IFwidGFzay1maWx0ZXItaGVhZGVyLWNvbnRhaW5lclwiLFxyXG5cdH0pO1xyXG5cclxuXHRoZWFkZXJDb250YWluZXIuY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdGNsczogXCJ0YXNrLWZpbHRlci10aXRsZVwiLFxyXG5cdFx0dGV4dDogdChcIkZpbHRlciBUYXNrc1wiKSxcclxuXHR9KTtcclxuXHJcblx0Ly8gQ3JlYXRlIHRoZSBmaWx0ZXIgb3B0aW9ucyBzZWN0aW9uXHJcblx0Y29uc3QgZmlsdGVyT3B0aW9uc0RpdiA9IGRvbS5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRjbHM6IFwidGFzay1maWx0ZXItb3B0aW9uc1wiLFxyXG5cdH0pO1xyXG5cclxuXHQvLyBBZGQgcHJlc2V0IGZpbHRlciBzZWxlY3RvclxyXG5cdGNvbnN0IHByZXNldENvbnRhaW5lciA9IGZpbHRlck9wdGlvbnNEaXYuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0Y2xzOiBcInRhc2stZmlsdGVyLXByZXNldC1jb250YWluZXJcIixcclxuXHR9KTtcclxuXHJcblx0Y29uc3QgcHJlc2V0RmlsdGVycyA9IHBsdWdpbi5zZXR0aW5ncy50YXNrRmlsdGVyLnByZXNldFRhc2tGaWx0ZXJzIHx8IFtdO1xyXG5cclxuXHRsZXQgZDogRHJvcGRvd25Db21wb25lbnQgfCBudWxsID0gbnVsbDtcclxuXHJcblx0aWYgKHByZXNldEZpbHRlcnMubGVuZ3RoID4gMCkge1xyXG5cdFx0bmV3IFNldHRpbmcocHJlc2V0Q29udGFpbmVyKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiUHJlc2V0IGZpbHRlcnNcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJTZWxlY3QgYSBzYXZlZCBmaWx0ZXIgcHJlc2V0IHRvIGFwcGx5XCIpKVxyXG5cdFx0XHQuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XHJcblx0XHRcdFx0Ly8gQWRkIGFuIGVtcHR5IG9wdGlvblxyXG5cdFx0XHRcdGRyb3Bkb3duLmFkZE9wdGlvbihcIlwiLCB0KFwiU2VsZWN0IGEgcHJlc2V0Li4uXCIpKTtcclxuXHRcdFx0XHRkID0gZHJvcGRvd247XHJcblx0XHRcdFx0Ly8gQWRkIGVhY2ggcHJlc2V0IGFzIGFuIG9wdGlvblxyXG5cdFx0XHRcdHByZXNldEZpbHRlcnMuZm9yRWFjaCgocHJlc2V0KSA9PiB7XHJcblx0XHRcdFx0XHRkcm9wZG93bi5hZGRPcHRpb24ocHJlc2V0LmlkLCBwcmVzZXQubmFtZSk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdGRyb3Bkb3duLm9uQ2hhbmdlKChzZWxlY3RlZElkKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAoc2VsZWN0ZWRJZCkge1xyXG5cdFx0XHRcdFx0XHQvLyBGaW5kIHRoZSBzZWxlY3RlZCBwcmVzZXRcclxuXHRcdFx0XHRcdFx0Y29uc3Qgc2VsZWN0ZWRQcmVzZXQgPSBwcmVzZXRGaWx0ZXJzLmZpbmQoXHJcblx0XHRcdFx0XHRcdFx0KHApID0+IHAuaWQgPT09IHNlbGVjdGVkSWRcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0aWYgKHNlbGVjdGVkUHJlc2V0KSB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gQXBwbHkgdGhlIHByZXNldCdzIGZpbHRlciBvcHRpb25zXHJcblx0XHRcdFx0XHRcdFx0YWN0aXZlRmlsdGVycyA9IHsgLi4uc2VsZWN0ZWRQcmVzZXQub3B0aW9ucyB9O1xyXG5cdFx0XHRcdFx0XHRcdC8vIFVwZGF0ZSBzdGF0ZSB3aXRoIG5ldyBhY3RpdmUgZmlsdGVyc1xyXG5cdFx0XHRcdFx0XHRcdHZpZXcuZGlzcGF0Y2goe1xyXG5cdFx0XHRcdFx0XHRcdFx0ZWZmZWN0czogdXBkYXRlQWN0aXZlRmlsdGVycy5vZih7XHJcblx0XHRcdFx0XHRcdFx0XHRcdC4uLmFjdGl2ZUZpbHRlcnMsXHJcblx0XHRcdFx0XHRcdFx0XHR9KSxcclxuXHRcdFx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gVXBkYXRlIHRoZSBVSSB0byByZWZsZWN0IHRoZSBzZWxlY3RlZCBvcHRpb25zXHJcblx0XHRcdFx0XHRcdFx0dXBkYXRlRmlsdGVyVUkoKTtcclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gQXBwbHkgdGhlIGZpbHRlcnNcclxuXHRcdFx0XHRcdFx0XHRhcHBseVRhc2tGaWx0ZXJzKHZpZXcsIHBsdWdpbik7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdC8vIFJlc2V0IHRvIGRlZmF1bHQgb3B0aW9uc1xyXG5cdFx0XHRcdFx0XHRhY3RpdmVGaWx0ZXJzID0geyAuLi5ERUZBVUxUX0ZJTFRFUl9PUFRJT05TIH07XHJcblx0XHRcdFx0XHRcdC8vIFVwZGF0ZSBzdGF0ZSB3aXRoIG5ldyBhY3RpdmUgZmlsdGVyc1xyXG5cdFx0XHRcdFx0XHR2aWV3LmRpc3BhdGNoKHtcclxuXHRcdFx0XHRcdFx0XHRlZmZlY3RzOiB1cGRhdGVBY3RpdmVGaWx0ZXJzLm9mKHtcclxuXHRcdFx0XHRcdFx0XHRcdC4uLmFjdGl2ZUZpbHRlcnMsXHJcblx0XHRcdFx0XHRcdFx0fSksXHJcblx0XHRcdFx0XHRcdH0pOyAvLyBVcGRhdGUgdGhlIFVJIHRvIHJlZmxlY3QgdGhlIHNlbGVjdGVkIG9wdGlvbnNcclxuXHRcdFx0XHRcdFx0dXBkYXRlRmlsdGVyVUkoKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIEFwcGx5IHRoZSBmaWx0ZXJzXHJcblx0XHRcdFx0XHRcdGFwcGx5VGFza0ZpbHRlcnModmlldywgcGx1Z2luKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyBBZGQgQWR2YW5jZWQgRmlsdGVyIFF1ZXJ5IElucHV0XHJcblx0Y29uc3QgYWR2YW5jZWRTZWN0aW9uID0gZmlsdGVyT3B0aW9uc0Rpdi5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRjbHM6IFwidGFzay1maWx0ZXItc2VjdGlvblwiLFxyXG5cdH0pO1xyXG5cclxuXHRsZXQgcXVlcnlJbnB1dDogVGV4dENvbXBvbmVudCB8IG51bGwgPSBudWxsO1xyXG5cclxuXHQvLyBUZXh0IGlucHV0IGZvciBhZHZhbmNlZCBmaWx0ZXJcclxuXHRuZXcgU2V0dGluZyhhZHZhbmNlZFNlY3Rpb24pXHJcblx0XHQuc2V0TmFtZSh0KFwiUXVlcnlcIikpXHJcblx0XHQuc2V0RGVzYyhcclxuXHRcdFx0dChcclxuXHRcdFx0XHRcIlVzZSBib29sZWFuIG9wZXJhdGlvbnM6IEFORCwgT1IsIE5PVC4gRXhhbXBsZTogJ3RleHQgY29udGVudCBBTkQgI3RhZzEgQU5EIERBVEU6PDIwMjItMDEtMDIgTk9UIFBSSU9SSVRZOj49I0InIC0gU3VwcG9ydHMgPiwgPCwgPSwgPj0sIDw9LCAhPSBmb3IgUFJJT1JJVFkgYW5kIERBVEUuXCJcclxuXHRcdFx0KVxyXG5cdFx0KVxyXG5cdFx0LmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0cXVlcnlJbnB1dCA9IHRleHQ7XHJcblx0XHRcdHRleHQuc2V0VmFsdWUoXHJcblx0XHRcdFx0Z2V0RmlsdGVyT3B0aW9uKG9wdGlvbnMsIFwiYWR2YW5jZWRGaWx0ZXJRdWVyeVwiKVxyXG5cdFx0XHQpLm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdGFjdGl2ZUZpbHRlcnMuYWR2YW5jZWRGaWx0ZXJRdWVyeSA9IHZhbHVlO1xyXG5cdFx0XHRcdC8vIFVwZGF0ZSBzdGF0ZSB3aXRoIG5ldyBhY3RpdmUgZmlsdGVyc1xyXG5cdFx0XHRcdHZpZXcuZGlzcGF0Y2goe1xyXG5cdFx0XHRcdFx0ZWZmZWN0czogdXBkYXRlQWN0aXZlRmlsdGVycy5vZih7IC4uLmFjdGl2ZUZpbHRlcnMgfSksXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0ZGVib3VuY2VGaWx0ZXIodmlldywgcGx1Z2luKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHR0ZXh0LmlucHV0RWwuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgKGV2ZW50KSA9PiB7XHJcblx0XHRcdFx0aWYgKGV2ZW50LmtleSA9PT0gXCJFbnRlclwiKSB7XHJcblx0XHRcdFx0XHRpZiAoS2V5bWFwLmlzTW9kRXZlbnQoZXZlbnQpKSB7XHJcblx0XHRcdFx0XHRcdC8vIFVzZSBDdHJsK0VudGVyIHRvIHN3aXRjaCB0byBFWENMVURFIG1vZGVcclxuXHRcdFx0XHRcdFx0YWN0aXZlRmlsdGVycy5maWx0ZXJNb2RlID0gXCJFWENMVURFXCI7XHJcblx0XHRcdFx0XHRcdC8vIFVwZGF0ZSBzdGF0ZSB3aXRoIG5ldyBhY3RpdmUgZmlsdGVyc1xyXG5cdFx0XHRcdFx0XHR2aWV3LmRpc3BhdGNoKHtcclxuXHRcdFx0XHRcdFx0XHRlZmZlY3RzOiB1cGRhdGVBY3RpdmVGaWx0ZXJzLm9mKHtcclxuXHRcdFx0XHRcdFx0XHRcdC4uLmFjdGl2ZUZpbHRlcnMsXHJcblx0XHRcdFx0XHRcdFx0fSksXHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRkZWJvdW5jZUZpbHRlcih2aWV3LCBwbHVnaW4pO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0Ly8gUmVndWxhciBFbnRlciB1c2VzIElOQ0xVREUgbW9kZVxyXG5cdFx0XHRcdFx0XHRhY3RpdmVGaWx0ZXJzLmZpbHRlck1vZGUgPSBcIklOQ0xVREVcIjtcclxuXHRcdFx0XHRcdFx0Ly8gVXBkYXRlIHN0YXRlIHdpdGggbmV3IGFjdGl2ZSBmaWx0ZXJzXHJcblx0XHRcdFx0XHRcdHZpZXcuZGlzcGF0Y2goe1xyXG5cdFx0XHRcdFx0XHRcdGVmZmVjdHM6IHVwZGF0ZUFjdGl2ZUZpbHRlcnMub2Yoe1xyXG5cdFx0XHRcdFx0XHRcdFx0Li4uYWN0aXZlRmlsdGVycyxcclxuXHRcdFx0XHRcdFx0XHR9KSxcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdGRlYm91bmNlRmlsdGVyKHZpZXcsIHBsdWdpbik7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSBlbHNlIGlmIChldmVudC5rZXkgPT09IFwiRXNjYXBlXCIpIHtcclxuXHRcdFx0XHRcdHZpZXcuZGlzcGF0Y2goeyBlZmZlY3RzOiB0b2dnbGVUYXNrRmlsdGVyLm9mKGZhbHNlKSB9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0dGV4dC5pbnB1dEVsLnRvZ2dsZUNsYXNzKFwidGFzay1maWx0ZXItcXVlcnktaW5wdXRcIiwgdHJ1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0Ly8gQWRkIEZpbHRlciBNb2RlIHNlbGVjdG9yXHJcblx0Y29uc3QgZmlsdGVyTW9kZVNlY3Rpb24gPSBmaWx0ZXJPcHRpb25zRGl2LmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdGNsczogXCJ0YXNrLWZpbHRlci1zZWN0aW9uXCIsXHJcblx0fSk7XHJcblxyXG5cdGxldCBmaWx0ZXJNb2RlRHJvcGRvd246IERyb3Bkb3duQ29tcG9uZW50IHwgbnVsbCA9IG51bGw7XHJcblxyXG5cdG5ldyBTZXR0aW5nKGZpbHRlck1vZGVTZWN0aW9uKVxyXG5cdFx0LnNldE5hbWUodChcIkZpbHRlciBNb2RlXCIpKVxyXG5cdFx0LnNldERlc2MoXHJcblx0XHRcdHQoXHJcblx0XHRcdFx0XCJDaG9vc2Ugd2hldGhlciB0byBpbmNsdWRlIG9yIGV4Y2x1ZGUgdGFza3MgdGhhdCBtYXRjaCB0aGUgZmlsdGVyc1wiXHJcblx0XHRcdClcclxuXHRcdClcclxuXHRcdC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcclxuXHRcdFx0ZmlsdGVyTW9kZURyb3Bkb3duID0gZHJvcGRvd247XHJcblx0XHRcdGRyb3Bkb3duXHJcblx0XHRcdFx0LmFkZE9wdGlvbihcIklOQ0xVREVcIiwgdChcIlNob3cgbWF0Y2hpbmcgdGFza3NcIikpXHJcblx0XHRcdFx0LmFkZE9wdGlvbihcIkVYQ0xVREVcIiwgdChcIkhpZGUgbWF0Y2hpbmcgdGFza3NcIikpXHJcblx0XHRcdFx0LnNldFZhbHVlKGdldEZpbHRlck9wdGlvbihvcHRpb25zLCBcImZpbHRlck1vZGVcIikpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZTogXCJJTkNMVURFXCIgfCBcIkVYQ0xVREVcIikgPT4ge1xyXG5cdFx0XHRcdFx0YWN0aXZlRmlsdGVycy5maWx0ZXJNb2RlID0gdmFsdWU7XHJcblx0XHRcdFx0XHQvLyBVcGRhdGUgc3RhdGUgd2l0aCBuZXcgYWN0aXZlIGZpbHRlcnNcclxuXHRcdFx0XHRcdHZpZXcuZGlzcGF0Y2goe1xyXG5cdFx0XHRcdFx0XHRlZmZlY3RzOiB1cGRhdGVBY3RpdmVGaWx0ZXJzLm9mKHsgLi4uYWN0aXZlRmlsdGVycyB9KSxcclxuXHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdGFwcGx5VGFza0ZpbHRlcnModmlldywgcGx1Z2luKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHQvLyBTdGF0dXMgZmlsdGVyIGNoZWNrYm94ZXNcclxuXHRjb25zdCBzdGF0dXNTZWN0aW9uID0gZmlsdGVyT3B0aW9uc0Rpdi5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRjbHM6IFwidGFzay1maWx0ZXItc2VjdGlvblwiLFxyXG5cdH0pO1xyXG5cclxuXHRuZXcgU2V0dGluZyhzdGF0dXNTZWN0aW9uKS5zZXROYW1lKHQoXCJDaGVja2JveCBTdGF0dXNcIikpLnNldEhlYWRpbmcoKTtcclxuXHJcblx0Y29uc3Qgc3RhdHVzZXMgPSBbXHJcblx0XHR7IGlkOiBcIkNvbXBsZXRlZFwiLCBsYWJlbDogdChcIkNvbXBsZXRlZFwiKSB9LFxyXG5cdFx0eyBpZDogXCJJblByb2dyZXNzXCIsIGxhYmVsOiB0KFwiSW4gUHJvZ3Jlc3NcIikgfSxcclxuXHRcdHsgaWQ6IFwiQWJhbmRvbmVkXCIsIGxhYmVsOiB0KFwiQWJhbmRvbmVkXCIpIH0sXHJcblx0XHR7IGlkOiBcIk5vdFN0YXJ0ZWRcIiwgbGFiZWw6IHQoXCJOb3QgU3RhcnRlZFwiKSB9LFxyXG5cdFx0eyBpZDogXCJQbGFubmVkXCIsIGxhYmVsOiB0KFwiUGxhbm5lZFwiKSB9LFxyXG5cdF07XHJcblxyXG5cdC8vIFN0b3JlIHN0YXR1cyB0b2dnbGVzIGZvciB1cGRhdGluZyB3aGVuIHByZXNldCBpcyBzZWxlY3RlZFxyXG5cdGNvbnN0IHN0YXR1c1RvZ2dsZXM6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcclxuXHJcblx0Zm9yIChjb25zdCBzdGF0dXMgb2Ygc3RhdHVzZXMpIHtcclxuXHRcdGNvbnN0IHByb3BOYW1lID0gYGluY2x1ZGUke3N0YXR1cy5pZH1gIGFzIGtleW9mIFRhc2tGaWx0ZXJPcHRpb25zO1xyXG5cclxuXHRcdG5ldyBTZXR0aW5nKHN0YXR1c1NlY3Rpb24pLnNldE5hbWUoc3RhdHVzLmxhYmVsKS5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xyXG5cdFx0XHRzdGF0dXNUb2dnbGVzW3Byb3BOYW1lXSA9IHRvZ2dsZTtcclxuXHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0LnNldFZhbHVlKGdldEZpbHRlck9wdGlvbihvcHRpb25zLCBwcm9wTmFtZSkpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZTogYm9vbGVhbikgPT4ge1xyXG5cdFx0XHRcdFx0KGFjdGl2ZUZpbHRlcnMgYXMgYW55KVtwcm9wTmFtZV0gPSB2YWx1ZTtcclxuXHRcdFx0XHRcdC8vIFVwZGF0ZSBzdGF0ZSB3aXRoIG5ldyBhY3RpdmUgZmlsdGVyc1xyXG5cdFx0XHRcdFx0dmlldy5kaXNwYXRjaCh7XHJcblx0XHRcdFx0XHRcdGVmZmVjdHM6IHVwZGF0ZUFjdGl2ZUZpbHRlcnMub2YoeyAuLi5hY3RpdmVGaWx0ZXJzIH0pLFxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRhcHBseVRhc2tGaWx0ZXJzKHZpZXcsIHBsdWdpbik7XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIEFkdmFuY2VkIGZpbHRlciBvcHRpb25zXHJcblx0Y29uc3QgcmVsYXRlZFNlY3Rpb24gPSBmaWx0ZXJPcHRpb25zRGl2LmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdGNsczogXCJ0YXNrLWZpbHRlci1zZWN0aW9uXCIsXHJcblx0fSk7XHJcblxyXG5cdG5ldyBTZXR0aW5nKHJlbGF0ZWRTZWN0aW9uKVxyXG5cdFx0LnNldE5hbWUodChcIkluY2x1ZGUgUmVsYXRlZCBUYXNrc1wiKSlcclxuXHRcdC5zZXRIZWFkaW5nKCk7XHJcblxyXG5cdC8vIFBhcmVudC9DaGlsZCB0YXNrIGluY2x1c2lvbiBvcHRpb25zXHJcblx0Y29uc3QgcmVsYXRlZE9wdGlvbnMgPSBbXHJcblx0XHR7IGlkOiBcIlBhcmVudFRhc2tzXCIsIGxhYmVsOiB0KFwiUGFyZW50IFRhc2tzXCIpIH0sXHJcblx0XHR7IGlkOiBcIkNoaWxkVGFza3NcIiwgbGFiZWw6IHQoXCJDaGlsZCBUYXNrc1wiKSB9LFxyXG5cdFx0eyBpZDogXCJTaWJsaW5nVGFza3NcIiwgbGFiZWw6IHQoXCJTaWJsaW5nIFRhc2tzXCIpIH0sXHJcblx0XTtcclxuXHJcblx0Ly8gU3RvcmUgcmVsYXRlZCB0b2dnbGVzIGZvciB1cGRhdGluZyB3aGVuIHByZXNldCBpcyBzZWxlY3RlZFxyXG5cdGNvbnN0IHJlbGF0ZWRUb2dnbGVzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge307XHJcblxyXG5cdGZvciAoY29uc3Qgb3B0aW9uIG9mIHJlbGF0ZWRPcHRpb25zKSB7XHJcblx0XHRjb25zdCBwcm9wTmFtZSA9IGBpbmNsdWRlJHtvcHRpb24uaWR9YCBhcyBrZXlvZiBUYXNrRmlsdGVyT3B0aW9ucztcclxuXHJcblx0XHRuZXcgU2V0dGluZyhyZWxhdGVkU2VjdGlvbilcclxuXHRcdFx0LnNldE5hbWUob3B0aW9uLmxhYmVsKVxyXG5cdFx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcclxuXHRcdFx0XHRyZWxhdGVkVG9nZ2xlc1twcm9wTmFtZV0gPSB0b2dnbGU7XHJcblx0XHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUoZ2V0RmlsdGVyT3B0aW9uKG9wdGlvbnMsIHByb3BOYW1lKSlcclxuXHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWU6IGJvb2xlYW4pID0+IHtcclxuXHRcdFx0XHRcdFx0KGFjdGl2ZUZpbHRlcnMgYXMgYW55KVtwcm9wTmFtZV0gPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0Ly8gVXBkYXRlIHN0YXRlIHdpdGggbmV3IGFjdGl2ZSBmaWx0ZXJzXHJcblx0XHRcdFx0XHRcdHZpZXcuZGlzcGF0Y2goe1xyXG5cdFx0XHRcdFx0XHRcdGVmZmVjdHM6IHVwZGF0ZUFjdGl2ZUZpbHRlcnMub2Yoe1xyXG5cdFx0XHRcdFx0XHRcdFx0Li4uYWN0aXZlRmlsdGVycyxcclxuXHRcdFx0XHRcdFx0XHR9KSxcclxuXHRcdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0XHRhcHBseVRhc2tGaWx0ZXJzKHZpZXcsIHBsdWdpbik7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyBBY3Rpb24gYnV0dG9uc1xyXG5cdG5ldyBTZXR0aW5nKGRvbSlcclxuXHRcdC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xyXG5cdFx0XHRidXR0b24uc2V0Q3RhKCk7XHJcblx0XHRcdGJ1dHRvbi5zZXRCdXR0b25UZXh0KHQoXCJBcHBseVwiKSkub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0YXBwbHlUYXNrRmlsdGVycyh2aWV3LCBwbHVnaW4pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pXHJcblx0XHQuYWRkQnV0dG9uKChidXR0b24pID0+IHtcclxuXHRcdFx0YnV0dG9uLnNldEN0YSgpO1xyXG5cdFx0XHRidXR0b24uc2V0QnV0dG9uVGV4dCh0KFwiU2F2ZVwiKSkub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0Ly8gQ2hlY2sgaWYgdGhlcmUgYXJlIGFueSBjaGFuZ2VzIHRvIHNhdmVcclxuXHRcdFx0XHRpZiAoY2hlY2tGaWx0ZXJDaGFuZ2VzKHZpZXcsIHBsdWdpbikpIHtcclxuXHRcdFx0XHRcdC8vIEdldCBjdXJyZW50IGFjdGl2ZSBmaWx0ZXJzIGZyb20gc3RhdGVcclxuXHRcdFx0XHRcdGNvbnN0IGN1cnJlbnRBY3RpdmVGaWx0ZXJzID0gZ2V0QWN0aXZlRmlsdGVyc0ZvclZpZXcodmlldyk7XHJcblxyXG5cdFx0XHRcdFx0Y29uc3QgbmV3UHJlc2V0ID0ge1xyXG5cdFx0XHRcdFx0XHRpZDpcclxuXHRcdFx0XHRcdFx0XHREYXRlLm5vdygpLnRvU3RyaW5nKCkgK1xyXG5cdFx0XHRcdFx0XHRcdE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA5KSxcclxuXHRcdFx0XHRcdFx0bmFtZTogdChcIk5ldyBQcmVzZXRcIiksXHJcblx0XHRcdFx0XHRcdG9wdGlvbnM6IHsgLi4uY3VycmVudEFjdGl2ZUZpbHRlcnMgfSxcclxuXHRcdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdFx0Ly8gQWRkIHRvIHNldHRpbmdzXHJcblx0XHRcdFx0XHRwbHVnaW4uc2V0dGluZ3MudGFza0ZpbHRlci5wcmVzZXRUYXNrRmlsdGVycy5wdXNoKFxyXG5cdFx0XHRcdFx0XHRuZXdQcmVzZXRcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRwbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblxyXG5cdFx0XHRcdFx0bmV3IE5vdGljZSh0KFwiUHJlc2V0IHNhdmVkXCIpKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0bmV3IE5vdGljZSh0KFwiTm8gY2hhbmdlcyB0byBzYXZlXCIpKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fSlcclxuXHRcdC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xyXG5cdFx0XHRidXR0b24uYnV0dG9uRWwudG9nZ2xlQ2xhc3MoXCJtb2QtZGVzdHJ1Y3RpdmVcIiwgdHJ1ZSk7XHJcblx0XHRcdGJ1dHRvbi5zZXRCdXR0b25UZXh0KHQoXCJSZXNldFwiKSkub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0cmVzZXRUYXNrRmlsdGVycyh2aWV3KTtcclxuXHJcblx0XHRcdFx0aWYgKHF1ZXJ5SW5wdXQgJiYgcXVlcnlJbnB1dC5pbnB1dEVsKSB7XHJcblx0XHRcdFx0XHRxdWVyeUlucHV0LmlucHV0RWwudmFsdWUgPSBcIlwiO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0YWN0aXZlRmlsdGVycyA9IHsgLi4uREVGQVVMVF9GSUxURVJfT1BUSU9OUyB9O1xyXG5cdFx0XHRcdC8vIFVwZGF0ZSBzdGF0ZSB3aXRoIG5ldyBhY3RpdmUgZmlsdGVyc1xyXG5cdFx0XHRcdHZpZXcuZGlzcGF0Y2goe1xyXG5cdFx0XHRcdFx0ZWZmZWN0czogdXBkYXRlQWN0aXZlRmlsdGVycy5vZih7XHJcblx0XHRcdFx0XHRcdC4uLmFjdGl2ZUZpbHRlcnMsXHJcblx0XHRcdFx0XHR9KSxcclxuXHRcdFx0XHR9KTsgLy8gVXBkYXRlIHRoZSBVSSB0byByZWZsZWN0IHRoZSBzZWxlY3RlZCBvcHRpb25zXHJcblx0XHRcdFx0dXBkYXRlRmlsdGVyVUkoKTtcclxuXHRcdFx0XHRpZiAoZCkge1xyXG5cdFx0XHRcdFx0ZC5zZXRWYWx1ZShcIlwiKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIEFwcGx5IHRoZSBmaWx0ZXJzXHJcblx0XHRcdFx0YXBwbHlUYXNrRmlsdGVycyh2aWV3LCBwbHVnaW4pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pXHJcblx0XHQuYWRkQnV0dG9uKChidXR0b24pID0+IHtcclxuXHRcdFx0YnV0dG9uLmJ1dHRvbkVsLnRvZ2dsZUNsYXNzKFwibW9kLWRlc3RydWN0aXZlXCIsIHRydWUpO1xyXG5cdFx0XHRidXR0b24uc2V0QnV0dG9uVGV4dCh0KFwiQ2xvc2VcIikpLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdHZpZXcuZGlzcGF0Y2goeyBlZmZlY3RzOiB0b2dnbGVUYXNrRmlsdGVyLm9mKGZhbHNlKSB9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0Ly8gRnVuY3Rpb24gdG8gdXBkYXRlIFVJIGVsZW1lbnRzIHdoZW4gYSBwcmVzZXQgaXMgc2VsZWN0ZWRcclxuXHRmdW5jdGlvbiB1cGRhdGVGaWx0ZXJVSSgpIHtcclxuXHRcdGNvbnN0IGFjdGl2ZUZpbHRlcnMgPSBnZXRBY3RpdmVGaWx0ZXJzRm9yVmlldyh2aWV3KTtcclxuXHRcdC8vIFVwZGF0ZSBxdWVyeSBpbnB1dFxyXG5cdFx0aWYgKHF1ZXJ5SW5wdXQpIHtcclxuXHRcdFx0cXVlcnlJbnB1dC5zZXRWYWx1ZShhY3RpdmVGaWx0ZXJzLmFkdmFuY2VkRmlsdGVyUXVlcnkpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFVwZGF0ZSBmaWx0ZXIgbW9kZSBkcm9wZG93biBpZiBpdCBleGlzdHNcclxuXHRcdGlmIChmaWx0ZXJNb2RlRHJvcGRvd24pIHtcclxuXHRcdFx0ZmlsdGVyTW9kZURyb3Bkb3duLnNldFZhbHVlKGFjdGl2ZUZpbHRlcnMuZmlsdGVyTW9kZSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHN0YXR1cyB0b2dnbGVzXHJcblx0XHRmb3IgKGNvbnN0IHN0YXR1cyBvZiBzdGF0dXNlcykge1xyXG5cdFx0XHRjb25zdCBwcm9wTmFtZSA9IGBpbmNsdWRlJHtzdGF0dXMuaWR9YCBhcyBrZXlvZiBUYXNrRmlsdGVyT3B0aW9ucztcclxuXHRcdFx0aWYgKHN0YXR1c1RvZ2dsZXNbcHJvcE5hbWVdKSB7XHJcblx0XHRcdFx0c3RhdHVzVG9nZ2xlc1twcm9wTmFtZV0uc2V0VmFsdWUoXHJcblx0XHRcdFx0XHQoYWN0aXZlRmlsdGVycyBhcyBhbnkpW3Byb3BOYW1lXVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBVcGRhdGUgcmVsYXRlZCB0b2dnbGVzXHJcblx0XHRmb3IgKGNvbnN0IG9wdGlvbiBvZiByZWxhdGVkT3B0aW9ucykge1xyXG5cdFx0XHRjb25zdCBwcm9wTmFtZSA9IGBpbmNsdWRlJHtvcHRpb24uaWR9YCBhcyBrZXlvZiBUYXNrRmlsdGVyT3B0aW9ucztcclxuXHRcdFx0aWYgKHJlbGF0ZWRUb2dnbGVzW3Byb3BOYW1lXSkge1xyXG5cdFx0XHRcdHJlbGF0ZWRUb2dnbGVzW3Byb3BOYW1lXS5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdChhY3RpdmVGaWx0ZXJzIGFzIGFueSlbcHJvcE5hbWVdXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Y29uc3QgZm9jdXNJbnB1dCA9ICgpID0+IHtcclxuXHRcdGlmIChxdWVyeUlucHV0ICYmIHF1ZXJ5SW5wdXQuaW5wdXRFbCkge1xyXG5cdFx0XHRxdWVyeUlucHV0LmlucHV0RWwuZm9jdXMoKTtcclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHRyZXR1cm4geyBmb2N1c0lucHV0IH07XHJcbn1cclxuXHJcbi8vIENyZWF0ZSB0aGUgdGFzayBmaWx0ZXIgcGFuZWxcclxuZnVuY3Rpb24gY3JlYXRlVGFza0ZpbHRlclBhbmVsKHZpZXc6IEVkaXRvclZpZXcpOiBQYW5lbCB7XHJcblx0Y29uc3QgZG9tID0gY3JlYXRlRGl2KHtcclxuXHRcdGNsczogXCJ0YXNrLWZpbHRlci1wYW5lbFwiLFxyXG5cdH0pO1xyXG5cclxuXHRjb25zdCBwbHVnaW4gPSB2aWV3LnN0YXRlLmZhY2V0KHBsdWdpbkZhY2V0KTtcclxuXHJcblx0Ly8gVXNlIHRoZSBhY3RpdmVGaWx0ZXJzU3RhdGUgaW5zdGVhZCBvZiB0aGUgdGFza0ZpbHRlck9wdGlvbnNcclxuXHQvLyBUaGlzIGVuc3VyZXMgd2UncmUgc2hvd2luZyB0aGUgYWN0dWFsIGN1cnJlbnQgc3RhdGUgZm9yIHRoaXMgZWRpdG9yXHJcblx0Y29uc3QgYWN0aXZlRmlsdGVycyA9IGdldEFjdGl2ZUZpbHRlcnNGb3JWaWV3KHZpZXcpO1xyXG5cclxuXHRjb25zdCB7IGZvY3VzSW5wdXQgfSA9IGZpbHRlclBhbmVsRGlzcGxheSh2aWV3LCBkb20sIGFjdGl2ZUZpbHRlcnMsIHBsdWdpbik7XHJcblxyXG5cdHJldHVybiB7XHJcblx0XHRkb20sXHJcblx0XHR0b3A6IHRydWUsXHJcblx0XHRtb3VudDogKCkgPT4ge1xyXG5cdFx0XHRmb2N1c0lucHV0KCk7XHJcblx0XHR9LFxyXG5cdFx0dXBkYXRlOiAodXBkYXRlOiBWaWV3VXBkYXRlKSA9PiB7XHJcblx0XHRcdC8vIFVwZGF0ZSBwYW5lbCBjb250ZW50IGlmIG5lZWRlZFxyXG5cdFx0fSxcclxuXHRcdGRlc3Ryb3k6ICgpID0+IHtcclxuXHRcdFx0Ly8gQ2xlYXIgYW55IGZpbHRlcnMgd2hlbiB0aGUgcGFuZWwgaXMgY2xvc2VkXHJcblx0XHRcdC8vIFVzZSBzZXRUaW1lb3V0IHRvIGF2b2lkIGRpc3BhdGNoaW5nIGR1cmluZyBhbiB1cGRhdGVcclxuXHRcdFx0Ly8gc2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdC8vIFx0cmVzZXRUYXNrRmlsdGVycyh2aWV3KTtcclxuXHRcdFx0Ly8gfSwgMCk7XHJcblx0XHR9LFxyXG5cdH07XHJcbn1cclxuXHJcbi8vIEFwcGx5IHRoZSBjdXJyZW50IHRhc2sgZmlsdGVyc1xyXG5mdW5jdGlvbiBhcHBseVRhc2tGaWx0ZXJzKHZpZXc6IEVkaXRvclZpZXcsIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luKSB7XHJcblx0Ly8gR2V0IGN1cnJlbnQgYWN0aXZlIGZpbHRlcnMgZnJvbSBzdGF0ZVxyXG5cdGNvbnN0IGFjdGl2ZUZpbHRlcnMgPSBnZXRBY3RpdmVGaWx0ZXJzRm9yVmlldyh2aWV3KTtcclxuXHJcblx0Ly8gRmluZCB0YXNrcyBpbiB0aGUgZG9jdW1lbnRcclxuXHRjb25zdCB0YXNrcyA9IGZpbmRBbGxUYXNrcyh2aWV3LCBwbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c2VzKTtcclxuXHJcblx0Ly8gQnVpbGQgYSBtYXAgb2YgbWF0Y2hpbmcgdGFza3MgZm9yIHF1aWNrIGxvb2t1cFxyXG5cdGNvbnN0IG1hdGNoaW5nVGFza0lkcyA9IG5ldyBTZXQ8bnVtYmVyPigpO1xyXG5cdC8vIFNldCBmb3IgdGFza3MgdGhhdCBkaXJlY3RseSBtYXRjaCBwcmltYXJ5IGZpbHRlcnNcclxuXHRjb25zdCBkaXJlY3RNYXRjaFRhc2tJZHMgPSBuZXcgU2V0PG51bWJlcj4oKTtcclxuXHJcblx0Ly8gQ2FsY3VsYXRlIG5ldyBoaWRkZW4gdGFzayByYW5nZXNcclxuXHRsZXQgaGlkZGVuVGFza1JhbmdlczogQXJyYXk8eyBmcm9tOiBudW1iZXI7IHRvOiBudW1iZXIgfT4gPSBbXTtcclxuXHJcblx0Ly8gRmlyc3QgaWRlbnRpZnkgdGFza3MgdGhhdCBwYXNzIHN0YXR1cyBmaWx0ZXJzIChtYW5kYXRvcnkpXHJcblx0Y29uc3Qgc3RhdHVzRmlsdGVyZWRUYXNrczogQXJyYXk8eyB0YXNrOiBUYXNrOyBpbmRleDogbnVtYmVyIH0+ID0gW107XHJcblx0dGFza3MuZm9yRWFjaCgodGFzaywgaW5kZXgpID0+IHtcclxuXHRcdC8vIENoZWNrIGlmIHRhc2sgcGFzc2VzIHN0YXR1cyBmaWx0ZXJzXHJcblx0XHRjb25zdCBwYXNzZXNTdGF0dXNGaWx0ZXIgPVxyXG5cdFx0XHQoYWN0aXZlRmlsdGVycy5pbmNsdWRlQ29tcGxldGVkICYmIHRhc2suc3RhdHVzID09PSBcImNvbXBsZXRlZFwiKSB8fFxyXG5cdFx0XHQoYWN0aXZlRmlsdGVycy5pbmNsdWRlSW5Qcm9ncmVzcyAmJiB0YXNrLnN0YXR1cyA9PT0gXCJpblByb2dyZXNzXCIpIHx8XHJcblx0XHRcdChhY3RpdmVGaWx0ZXJzLmluY2x1ZGVBYmFuZG9uZWQgJiYgdGFzay5zdGF0dXMgPT09IFwiYWJhbmRvbmVkXCIpIHx8XHJcblx0XHRcdChhY3RpdmVGaWx0ZXJzLmluY2x1ZGVOb3RTdGFydGVkICYmIHRhc2suc3RhdHVzID09PSBcIm5vdFN0YXJ0ZWRcIikgfHxcclxuXHRcdFx0KGFjdGl2ZUZpbHRlcnMuaW5jbHVkZVBsYW5uZWQgJiYgdGFzay5zdGF0dXMgPT09IFwicGxhbm5lZFwiKTtcclxuXHJcblx0XHQvLyBPbmx5IHByb2Nlc3MgdGFza3MgdGhhdCBtYXRjaCBzdGF0dXMgZmlsdGVyc1xyXG5cdFx0aWYgKHBhc3Nlc1N0YXR1c0ZpbHRlcikge1xyXG5cdFx0XHRzdGF0dXNGaWx0ZXJlZFRhc2tzLnB1c2goeyB0YXNrLCBpbmRleCB9KTtcclxuXHRcdH1cclxuXHR9KTtcclxuXHJcblx0Ly8gVGhlbiBhcHBseSBxdWVyeSBmaWx0ZXJzIHRvIHN0YXR1cy1maWx0ZXJlZCB0YXNrc1xyXG5cdGZvciAoY29uc3QgeyB0YXNrLCBpbmRleCB9IG9mIHN0YXR1c0ZpbHRlcmVkVGFza3MpIHtcclxuXHRcdC8vIENoZWNrIGFkdmFuY2VkIHF1ZXJ5IGlmIHByZXNlbnRcclxuXHRcdGxldCBtYXRjaGVzUXVlcnkgPSB0cnVlO1xyXG5cdFx0aWYgKGFjdGl2ZUZpbHRlcnMuYWR2YW5jZWRGaWx0ZXJRdWVyeS50cmltKCkgIT09IFwiXCIpIHtcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRjb25zdCBwYXJzZVJlc3VsdCA9IHBhcnNlQWR2YW5jZWRGaWx0ZXJRdWVyeShcclxuXHRcdFx0XHRcdGFjdGl2ZUZpbHRlcnMuYWR2YW5jZWRGaWx0ZXJRdWVyeVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gZXZhbHVhdGVGaWx0ZXJOb2RlKFxyXG5cdFx0XHRcdFx0cGFyc2VSZXN1bHQsXHJcblx0XHRcdFx0XHRtYXBUYXNrRm9yRmlsdGVyaW5nKHRhc2spIGFzIHVua25vd24gYXMgVGFza0luZGV4VGFza1xyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0Ly8gVXNlIHRoZSBkaXJlY3QgcmVzdWx0LCBmaWx0ZXIgbW9kZSB3aWxsIGJlIGhhbmRsZWQgbGF0ZXJcclxuXHRcdFx0XHRtYXRjaGVzUXVlcnkgPSByZXN1bHQ7XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIGV2YWx1YXRpbmcgYWR2YW5jZWQgZmlsdGVyOlwiLCBlcnJvcik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBJZiB0aGUgdGFzayBwYXNzZXMgYm90aCBzdGF0dXMgYW5kIHF1ZXJ5IGZpbHRlcnNcclxuXHRcdGlmIChtYXRjaGVzUXVlcnkpIHtcclxuXHRcdFx0ZGlyZWN0TWF0Y2hUYXNrSWRzLmFkZChpbmRleCk7XHJcblx0XHRcdG1hdGNoaW5nVGFza0lkcy5hZGQoaW5kZXgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gTm93IGlkZW50aWZ5IHBhcmVudC9jaGlsZC9zaWJsaW5nIHJlbGF0aW9uc2hpcHMgb25seSBmb3IgdGFza3MgdGhhdCBtYXRjaCBwcmltYXJ5IGZpbHRlcnNcclxuXHRpZiAoXHJcblx0XHRhY3RpdmVGaWx0ZXJzLmluY2x1ZGVQYXJlbnRUYXNrcyB8fFxyXG5cdFx0YWN0aXZlRmlsdGVycy5pbmNsdWRlQ2hpbGRUYXNrcyB8fFxyXG5cdFx0YWN0aXZlRmlsdGVycy5pbmNsdWRlU2libGluZ1Rhc2tzXHJcblx0KSB7XHJcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHRhc2tzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGlmIChkaXJlY3RNYXRjaFRhc2tJZHMuaGFzKGkpKSB7XHJcblx0XHRcdFx0Y29uc3QgdGFzayA9IHRhc2tzW2ldO1xyXG5cclxuXHRcdFx0XHQvLyBJbmNsdWRlIHBhcmVudHMgaWYgZW5hYmxlZCBBTkQgdGhleSBtYXRjaCBzdGF0dXMgZmlsdGVyc1xyXG5cdFx0XHRcdGlmIChhY3RpdmVGaWx0ZXJzLmluY2x1ZGVQYXJlbnRUYXNrcykge1xyXG5cdFx0XHRcdFx0bGV0IHBhcmVudCA9IHRhc2sucGFyZW50VGFzaztcclxuXHRcdFx0XHRcdHdoaWxlIChwYXJlbnQpIHtcclxuXHRcdFx0XHRcdFx0Ly8gT25seSBpbmNsdWRlIHBhcmVudCBpZiBpdCBtYXRjaGVzIHN0YXR1cyBmaWx0ZXJzXHJcblx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHQoYWN0aXZlRmlsdGVycy5pbmNsdWRlQ29tcGxldGVkICYmXHJcblx0XHRcdFx0XHRcdFx0XHRwYXJlbnQuc3RhdHVzID09PSBcImNvbXBsZXRlZFwiKSB8fFxyXG5cdFx0XHRcdFx0XHRcdChhY3RpdmVGaWx0ZXJzLmluY2x1ZGVJblByb2dyZXNzICYmXHJcblx0XHRcdFx0XHRcdFx0XHRwYXJlbnQuc3RhdHVzID09PSBcImluUHJvZ3Jlc3NcIikgfHxcclxuXHRcdFx0XHRcdFx0XHQoYWN0aXZlRmlsdGVycy5pbmNsdWRlQWJhbmRvbmVkICYmXHJcblx0XHRcdFx0XHRcdFx0XHRwYXJlbnQuc3RhdHVzID09PSBcImFiYW5kb25lZFwiKSB8fFxyXG5cdFx0XHRcdFx0XHRcdChhY3RpdmVGaWx0ZXJzLmluY2x1ZGVOb3RTdGFydGVkICYmXHJcblx0XHRcdFx0XHRcdFx0XHRwYXJlbnQuc3RhdHVzID09PSBcIm5vdFN0YXJ0ZWRcIikgfHxcclxuXHRcdFx0XHRcdFx0XHQoYWN0aXZlRmlsdGVycy5pbmNsdWRlUGxhbm5lZCAmJlxyXG5cdFx0XHRcdFx0XHRcdFx0cGFyZW50LnN0YXR1cyA9PT0gXCJwbGFubmVkXCIpXHJcblx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHBhcmVudEluZGV4ID0gdGFza3MuaW5kZXhPZihwYXJlbnQpO1xyXG5cdFx0XHRcdFx0XHRcdGlmIChwYXJlbnRJbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0XHRcdG1hdGNoaW5nVGFza0lkcy5hZGQocGFyZW50SW5kZXgpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRwYXJlbnQgPSBwYXJlbnQucGFyZW50VGFzaztcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIEluY2x1ZGUgY2hpbGRyZW4gaWYgZW5hYmxlZCBBTkQgdGhleSBtYXRjaCBzdGF0dXMgZmlsdGVyc1xyXG5cdFx0XHRcdGlmIChhY3RpdmVGaWx0ZXJzLmluY2x1ZGVDaGlsZFRhc2tzKSB7XHJcblx0XHRcdFx0XHRjb25zdCBhZGRDaGlsZHJlbiA9IChwYXJlbnRUYXNrOiBUYXNrKSA9PiB7XHJcblx0XHRcdFx0XHRcdGZvciAoY29uc3QgY2hpbGQgb2YgcGFyZW50VGFzay5jaGlsZFRhc2tzKSB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gT25seSBpbmNsdWRlIGNoaWxkIGlmIGl0IG1hdGNoZXMgc3RhdHVzIGZpbHRlcnNcclxuXHRcdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0XHQoYWN0aXZlRmlsdGVycy5pbmNsdWRlQ29tcGxldGVkICYmXHJcblx0XHRcdFx0XHRcdFx0XHRcdGNoaWxkLnN0YXR1cyA9PT0gXCJjb21wbGV0ZWRcIikgfHxcclxuXHRcdFx0XHRcdFx0XHRcdChhY3RpdmVGaWx0ZXJzLmluY2x1ZGVJblByb2dyZXNzICYmXHJcblx0XHRcdFx0XHRcdFx0XHRcdGNoaWxkLnN0YXR1cyA9PT0gXCJpblByb2dyZXNzXCIpIHx8XHJcblx0XHRcdFx0XHRcdFx0XHQoYWN0aXZlRmlsdGVycy5pbmNsdWRlQWJhbmRvbmVkICYmXHJcblx0XHRcdFx0XHRcdFx0XHRcdGNoaWxkLnN0YXR1cyA9PT0gXCJhYmFuZG9uZWRcIikgfHxcclxuXHRcdFx0XHRcdFx0XHRcdChhY3RpdmVGaWx0ZXJzLmluY2x1ZGVOb3RTdGFydGVkICYmXHJcblx0XHRcdFx0XHRcdFx0XHRcdGNoaWxkLnN0YXR1cyA9PT0gXCJub3RTdGFydGVkXCIpIHx8XHJcblx0XHRcdFx0XHRcdFx0XHQoYWN0aXZlRmlsdGVycy5pbmNsdWRlUGxhbm5lZCAmJlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRjaGlsZC5zdGF0dXMgPT09IFwicGxhbm5lZFwiKVxyXG5cdFx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgY2hpbGRJbmRleCA9IHRhc2tzLmluZGV4T2YoY2hpbGQpO1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKGNoaWxkSW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdG1hdGNoaW5nVGFza0lkcy5hZGQoY2hpbGRJbmRleCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdC8vIFJlY3Vyc2l2ZWx5IGFkZCBncmFuZGNoaWxkcmVuXHJcblx0XHRcdFx0XHRcdFx0XHRcdGFkZENoaWxkcmVuKGNoaWxkKTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdFx0YWRkQ2hpbGRyZW4odGFzayk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBJbmNsdWRlIHNpYmxpbmdzIGlmIGVuYWJsZWQgQU5EIHRoZXkgbWF0Y2ggc3RhdHVzIGZpbHRlcnNcclxuXHRcdFx0XHRpZiAoYWN0aXZlRmlsdGVycy5pbmNsdWRlU2libGluZ1Rhc2tzICYmIHRhc2sucGFyZW50VGFzaykge1xyXG5cdFx0XHRcdFx0Zm9yIChjb25zdCBzaWJsaW5nIG9mIHRhc2sucGFyZW50VGFzay5jaGlsZFRhc2tzKSB7XHJcblx0XHRcdFx0XHRcdGlmIChzaWJsaW5nICE9PSB0YXNrKSB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gT25seSBpbmNsdWRlIHNpYmxpbmcgaWYgaXQgbWF0Y2hlcyBzdGF0dXMgZmlsdGVyc1xyXG5cdFx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHRcdChhY3RpdmVGaWx0ZXJzLmluY2x1ZGVDb21wbGV0ZWQgJiZcclxuXHRcdFx0XHRcdFx0XHRcdFx0c2libGluZy5zdGF0dXMgPT09IFwiY29tcGxldGVkXCIpIHx8XHJcblx0XHRcdFx0XHRcdFx0XHQoYWN0aXZlRmlsdGVycy5pbmNsdWRlSW5Qcm9ncmVzcyAmJlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRzaWJsaW5nLnN0YXR1cyA9PT0gXCJpblByb2dyZXNzXCIpIHx8XHJcblx0XHRcdFx0XHRcdFx0XHQoYWN0aXZlRmlsdGVycy5pbmNsdWRlQWJhbmRvbmVkICYmXHJcblx0XHRcdFx0XHRcdFx0XHRcdHNpYmxpbmcuc3RhdHVzID09PSBcImFiYW5kb25lZFwiKSB8fFxyXG5cdFx0XHRcdFx0XHRcdFx0KGFjdGl2ZUZpbHRlcnMuaW5jbHVkZU5vdFN0YXJ0ZWQgJiZcclxuXHRcdFx0XHRcdFx0XHRcdFx0c2libGluZy5zdGF0dXMgPT09IFwibm90U3RhcnRlZFwiKSB8fFxyXG5cdFx0XHRcdFx0XHRcdFx0KGFjdGl2ZUZpbHRlcnMuaW5jbHVkZVBsYW5uZWQgJiZcclxuXHRcdFx0XHRcdFx0XHRcdFx0c2libGluZy5zdGF0dXMgPT09IFwicGxhbm5lZFwiKVxyXG5cdFx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3Qgc2libGluZ0luZGV4ID0gdGFza3MuaW5kZXhPZihzaWJsaW5nKTtcclxuXHRcdFx0XHRcdFx0XHRcdGlmIChzaWJsaW5nSW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdG1hdGNoaW5nVGFza0lkcy5hZGQoc2libGluZ0luZGV4KTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIERldGVybWluZSB3aGljaCB0YXNrcyB0byBoaWRlIGJhc2VkIG9uIHRoZSBmaWx0ZXIgbW9kZVxyXG5cdGxldCB0YXNrc1RvSGlkZTogVGFza1tdO1xyXG5cdGlmIChhY3RpdmVGaWx0ZXJzLmZpbHRlck1vZGUgPT09IFwiSU5DTFVERVwiKSB7XHJcblx0XHQvLyBJbiBJTkNMVURFIG1vZGUsIGhpZGUgdGFza3MgdGhhdCBkb24ndCBtYXRjaFxyXG5cdFx0dGFza3NUb0hpZGUgPSB0YXNrcy5maWx0ZXIoXHJcblx0XHRcdCh0YXNrLCBpbmRleCkgPT4gIW1hdGNoaW5nVGFza0lkcy5oYXMoaW5kZXgpXHJcblx0XHQpO1xyXG5cdH0gZWxzZSB7XHJcblx0XHQvLyBJbiBFWENMVURFIG1vZGUsIGhpZGUgdGFza3MgdGhhdCBkbyBtYXRjaFxyXG5cdFx0dGFza3NUb0hpZGUgPSB0YXNrcy5maWx0ZXIoKHRhc2ssIGluZGV4KSA9PiBtYXRjaGluZ1Rhc2tJZHMuaGFzKGluZGV4KSk7XHJcblx0fVxyXG5cclxuXHQvLyBTdG9yZSB0aGUgcmFuZ2VzIHRvIGhpZGVcclxuXHRoaWRkZW5UYXNrUmFuZ2VzID0gdGFza3NUb0hpZGUubWFwKCh0YXNrKSA9PiAoe1xyXG5cdFx0ZnJvbTogdGFzay5mcm9tLFxyXG5cdFx0dG86IHRhc2sudG8sXHJcblx0fSkpO1xyXG5cclxuXHQvLyBVcGRhdGUgaGlkZGVuIHJhbmdlcyBpbiB0aGUgc3RhdGVcclxuXHR2aWV3LmRpc3BhdGNoKHtcclxuXHRcdGVmZmVjdHM6IHVwZGF0ZUhpZGRlblRhc2tSYW5nZXMub2YoaGlkZGVuVGFza1JhbmdlcyksXHJcblx0fSk7XHJcblxyXG5cdHZpZXcuc3RhdGVcclxuXHRcdC5maWVsZChlZGl0b3JJbmZvRmllbGQpXHJcblx0XHQvLyBAdHMtaWdub3JlXHJcblx0XHQ/LmZpbHRlckFjdGlvbj8udG9nZ2xlQ2xhc3MoXHJcblx0XHRcdFwidGFzay1maWx0ZXItYWN0aXZlXCIsXHJcblx0XHRcdGNoZWNrRmlsdGVyQ2hhbmdlcyh2aWV3LCBwbHVnaW4pXHJcblx0XHQpO1xyXG5cclxuXHQvLyBBcHBseSBkZWNvcmF0aW9ucyB0byBoaWRlIGZpbHRlcmVkIHRhc2tzXHJcblx0YXBwbHlIaWRkZW5UYXNrRGVjb3JhdGlvbnModmlldywgaGlkZGVuVGFza1Jhbmdlcyk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZXRlcm1pbmVzIGlmIGEgdGFzayBzaG91bGQgYmUgaGlkZGVuIGJhc2VkIG9uIGZpbHRlciBjcml0ZXJpYVxyXG4gKiBAcGFyYW0gdGFzayBUaGUgdGFzayB0byBldmFsdWF0ZVxyXG4gKiBAcGFyYW0gZmlsdGVycyBUaGUgZmlsdGVyIG9wdGlvbnMgdG8gYXBwbHlcclxuICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgdGFzayBzaG91bGQgYmUgaGlkZGVuLCBmYWxzZSBvdGhlcndpc2VcclxuICovXHJcbmZ1bmN0aW9uIHNob3VsZEhpZGVUYXNrKHRhc2s6IFRhc2ssIGZpbHRlcnM6IFRhc2tGaWx0ZXJPcHRpb25zKTogYm9vbGVhbiB7XHJcblx0Ly8gRmlyc3QgY2hlY2sgc3RhdHVzIGZpbHRlcnMgKHRoZXNlIGFyZSBub24tbmVnb3RpYWJsZSlcclxuXHRjb25zdCBwYXNzZXNTdGF0dXNGaWx0ZXIgPVxyXG5cdFx0KGZpbHRlcnMuaW5jbHVkZUNvbXBsZXRlZCAmJiB0YXNrLnN0YXR1cyA9PT0gXCJjb21wbGV0ZWRcIikgfHxcclxuXHRcdChmaWx0ZXJzLmluY2x1ZGVJblByb2dyZXNzICYmIHRhc2suc3RhdHVzID09PSBcImluUHJvZ3Jlc3NcIikgfHxcclxuXHRcdChmaWx0ZXJzLmluY2x1ZGVBYmFuZG9uZWQgJiYgdGFzay5zdGF0dXMgPT09IFwiYWJhbmRvbmVkXCIpIHx8XHJcblx0XHQoZmlsdGVycy5pbmNsdWRlTm90U3RhcnRlZCAmJiB0YXNrLnN0YXR1cyA9PT0gXCJub3RTdGFydGVkXCIpIHx8XHJcblx0XHQoZmlsdGVycy5pbmNsdWRlUGxhbm5lZCAmJiB0YXNrLnN0YXR1cyA9PT0gXCJwbGFubmVkXCIpO1xyXG5cclxuXHQvLyBJZiBpdCBkb2Vzbid0IHBhc3Mgc3RhdHVzIGZpbHRlciwgYWx3YXlzIGhpZGUgaXRcclxuXHRpZiAoIXBhc3Nlc1N0YXR1c0ZpbHRlcikge1xyXG5cdFx0cmV0dXJuIHRydWU7XHJcblx0fVxyXG5cclxuXHQvLyBUaGVuIGNoZWNrIHF1ZXJ5IGZpbHRlciBpZiBwcmVzZW50XHJcblx0aWYgKGZpbHRlcnMuYWR2YW5jZWRGaWx0ZXJRdWVyeS50cmltKCkgIT09IFwiXCIpIHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IHBhcnNlUmVzdWx0ID0gcGFyc2VBZHZhbmNlZEZpbHRlclF1ZXJ5KFxyXG5cdFx0XHRcdGZpbHRlcnMuYWR2YW5jZWRGaWx0ZXJRdWVyeVxyXG5cdFx0XHQpO1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBldmFsdWF0ZUZpbHRlck5vZGUoXHJcblx0XHRcdFx0cGFyc2VSZXN1bHQsXHJcblx0XHRcdFx0bWFwVGFza0ZvckZpbHRlcmluZyh0YXNrKVxyXG5cdFx0XHQpO1xyXG5cdFx0XHQvLyBEZXRlcm1pbmUgdmlzaWJpbGl0eSBiYXNlZCBvbiBmaWx0ZXIgbW9kZVxyXG5cdFx0XHRjb25zdCBzaG91bGRTaG93ID1cclxuXHRcdFx0XHQoZmlsdGVycy5maWx0ZXJNb2RlID09PSBcIklOQ0xVREVcIiAmJiByZXN1bHQpIHx8XHJcblx0XHRcdFx0KGZpbHRlcnMuZmlsdGVyTW9kZSA9PT0gXCJFWENMVURFXCIgJiYgIXJlc3VsdCk7XHJcblxyXG5cdFx0XHQvLyBJZiBpdCBkb2Vzbid0IG1lZXQgZGlzcGxheSBjcml0ZXJpYSwgY2hlY2sgaWYgaXQgc2hvdWxkIGJlIHNob3duIGR1ZSB0byByZWxhdGlvbnNoaXBzXHJcblx0XHRcdGlmICghc2hvdWxkU2hvdykge1xyXG5cdFx0XHRcdHJldHVybiAhc2hvdWxkU2hvd0R1ZVRvUmVsYXRpb25zaGlwcyh0YXNrLCBmaWx0ZXJzKTtcclxuXHRcdFx0fVxyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIGV2YWx1YXRpbmcgYWR2YW5jZWQgZmlsdGVyOlwiLCBlcnJvcik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gZmFsc2U7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZXRlcm1pbmVzIGlmIGEgdGFzayBzaG91bGQgYmUgc2hvd24gZHVlIHRvIGl0cyByZWxhdGlvbnNoaXBzXHJcbiAqIGRlc3BpdGUgZmFpbGluZyBxdWVyeSBmaWx0ZXJcclxuICovXHJcbmZ1bmN0aW9uIHNob3VsZFNob3dEdWVUb1JlbGF0aW9uc2hpcHMoXHJcblx0dGFzazogVGFzayxcclxuXHRmaWx0ZXJzOiBUYXNrRmlsdGVyT3B0aW9uc1xyXG4pOiBib29sZWFuIHtcclxuXHQvLyBPbmx5IGNvbnNpZGVyIHJlbGF0aW9uc2hpcHMgZm9yIHRhc2tzIHRoYXQgcGFzcyBzdGF0dXMgZmlsdGVyc1xyXG5cdC8vIFBhcmVudCByZWxhdGlvbnNoaXBcclxuXHRpZiAoZmlsdGVycy5pbmNsdWRlUGFyZW50VGFza3MgJiYgdGFzay5jaGlsZFRhc2tzLmxlbmd0aCA+IDApIHtcclxuXHRcdGlmIChoYXNNYXRjaGluZ0Rlc2NlbmRhbnQodGFzaywgZmlsdGVycykpIHtcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBDaGlsZCByZWxhdGlvbnNoaXBcclxuXHRpZiAoZmlsdGVycy5pbmNsdWRlQ2hpbGRUYXNrcyAmJiB0YXNrLnBhcmVudFRhc2spIHtcclxuXHRcdC8vIEZpcnN0IGNoZWNrIGlmIHBhcmVudCBwYXNzZXMgc3RhdHVzIGZpbHRlclxyXG5cdFx0Y29uc3QgcGFyZW50UGFzc2VzU3RhdHVzRmlsdGVyID1cclxuXHRcdFx0KGZpbHRlcnMuaW5jbHVkZUNvbXBsZXRlZCAmJlxyXG5cdFx0XHRcdHRhc2sucGFyZW50VGFzay5zdGF0dXMgPT09IFwiY29tcGxldGVkXCIpIHx8XHJcblx0XHRcdChmaWx0ZXJzLmluY2x1ZGVJblByb2dyZXNzICYmXHJcblx0XHRcdFx0dGFzay5wYXJlbnRUYXNrLnN0YXR1cyA9PT0gXCJpblByb2dyZXNzXCIpIHx8XHJcblx0XHRcdChmaWx0ZXJzLmluY2x1ZGVBYmFuZG9uZWQgJiZcclxuXHRcdFx0XHR0YXNrLnBhcmVudFRhc2suc3RhdHVzID09PSBcImFiYW5kb25lZFwiKSB8fFxyXG5cdFx0XHQoZmlsdGVycy5pbmNsdWRlTm90U3RhcnRlZCAmJlxyXG5cdFx0XHRcdHRhc2sucGFyZW50VGFzay5zdGF0dXMgPT09IFwibm90U3RhcnRlZFwiKSB8fFxyXG5cdFx0XHQoZmlsdGVycy5pbmNsdWRlUGxhbm5lZCAmJiB0YXNrLnBhcmVudFRhc2suc3RhdHVzID09PSBcInBsYW5uZWRcIik7XHJcblxyXG5cdFx0aWYgKHBhcmVudFBhc3Nlc1N0YXR1c0ZpbHRlcikge1xyXG5cdFx0XHQvLyBUaGVuIGNoZWNrIHF1ZXJ5IGZpbHRlciAoaWYgcHJlc2VudClcclxuXHRcdFx0bGV0IHBhcmVudFBhc3Nlc1F1ZXJ5RmlsdGVyID0gdHJ1ZTtcclxuXHRcdFx0aWYgKGZpbHRlcnMuYWR2YW5jZWRGaWx0ZXJRdWVyeS50cmltKCkgIT09IFwiXCIpIHtcclxuXHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0Y29uc3QgcGFyc2VSZXN1bHQgPSBwYXJzZUFkdmFuY2VkRmlsdGVyUXVlcnkoXHJcblx0XHRcdFx0XHRcdGZpbHRlcnMuYWR2YW5jZWRGaWx0ZXJRdWVyeVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdGNvbnN0IHJlc3VsdCA9IGV2YWx1YXRlRmlsdGVyTm9kZShcclxuXHRcdFx0XHRcdFx0cGFyc2VSZXN1bHQsXHJcblx0XHRcdFx0XHRcdG1hcFRhc2tGb3JGaWx0ZXJpbmcodGFzay5wYXJlbnRUYXNrKVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdC8vIERldGVybWluZSB2aXNpYmlsaXR5IGJhc2VkIG9uIGZpbHRlciBtb2RlXHJcblx0XHRcdFx0XHRwYXJlbnRQYXNzZXNRdWVyeUZpbHRlciA9XHJcblx0XHRcdFx0XHRcdChmaWx0ZXJzLmZpbHRlck1vZGUgPT09IFwiSU5DTFVERVwiICYmIHJlc3VsdCkgfHxcclxuXHRcdFx0XHRcdFx0KGZpbHRlcnMuZmlsdGVyTW9kZSA9PT0gXCJFWENMVURFXCIgJiYgIXJlc3VsdCk7XHJcblx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFcnJvciBldmFsdWF0aW5nIGFkdmFuY2VkIGZpbHRlcjpcIiwgZXJyb3IpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKHBhcmVudFBhc3Nlc1F1ZXJ5RmlsdGVyKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIFNpYmxpbmcgcmVsYXRpb25zaGlwXHJcblx0aWYgKGZpbHRlcnMuaW5jbHVkZVNpYmxpbmdUYXNrcyAmJiB0YXNrLnBhcmVudFRhc2spIHtcclxuXHRcdGZvciAoY29uc3Qgc2libGluZyBvZiB0YXNrLnBhcmVudFRhc2suY2hpbGRUYXNrcykge1xyXG5cdFx0XHRpZiAoc2libGluZyA9PT0gdGFzaykgY29udGludWU7IC8vIFNraXAgc2VsZlxyXG5cclxuXHRcdFx0Ly8gRmlyc3QgY2hlY2sgaWYgc2libGluZyBwYXNzZXMgc3RhdHVzIGZpbHRlclxyXG5cdFx0XHRjb25zdCBzaWJsaW5nUGFzc2VzU3RhdHVzRmlsdGVyID1cclxuXHRcdFx0XHQoZmlsdGVycy5pbmNsdWRlQ29tcGxldGVkICYmIHNpYmxpbmcuc3RhdHVzID09PSBcImNvbXBsZXRlZFwiKSB8fFxyXG5cdFx0XHRcdChmaWx0ZXJzLmluY2x1ZGVJblByb2dyZXNzICYmXHJcblx0XHRcdFx0XHRzaWJsaW5nLnN0YXR1cyA9PT0gXCJpblByb2dyZXNzXCIpIHx8XHJcblx0XHRcdFx0KGZpbHRlcnMuaW5jbHVkZUFiYW5kb25lZCAmJiBzaWJsaW5nLnN0YXR1cyA9PT0gXCJhYmFuZG9uZWRcIikgfHxcclxuXHRcdFx0XHQoZmlsdGVycy5pbmNsdWRlTm90U3RhcnRlZCAmJlxyXG5cdFx0XHRcdFx0c2libGluZy5zdGF0dXMgPT09IFwibm90U3RhcnRlZFwiKSB8fFxyXG5cdFx0XHRcdChmaWx0ZXJzLmluY2x1ZGVQbGFubmVkICYmIHNpYmxpbmcuc3RhdHVzID09PSBcInBsYW5uZWRcIik7XHJcblxyXG5cdFx0XHRpZiAoc2libGluZ1Bhc3Nlc1N0YXR1c0ZpbHRlcikge1xyXG5cdFx0XHRcdC8vIFRoZW4gY2hlY2sgcXVlcnkgZmlsdGVyIChpZiBwcmVzZW50KVxyXG5cdFx0XHRcdGxldCBzaWJsaW5nUGFzc2VzUXVlcnlGaWx0ZXIgPSB0cnVlO1xyXG5cdFx0XHRcdGlmIChmaWx0ZXJzLmFkdmFuY2VkRmlsdGVyUXVlcnkudHJpbSgpICE9PSBcIlwiKSB7XHJcblx0XHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBwYXJzZVJlc3VsdCA9IHBhcnNlQWR2YW5jZWRGaWx0ZXJRdWVyeShcclxuXHRcdFx0XHRcdFx0XHRmaWx0ZXJzLmFkdmFuY2VkRmlsdGVyUXVlcnlcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gZXZhbHVhdGVGaWx0ZXJOb2RlKFxyXG5cdFx0XHRcdFx0XHRcdHBhcnNlUmVzdWx0LFxyXG5cdFx0XHRcdFx0XHRcdG1hcFRhc2tGb3JGaWx0ZXJpbmcoc2libGluZylcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0Ly8gRGV0ZXJtaW5lIHZpc2liaWxpdHkgYmFzZWQgb24gZmlsdGVyIG1vZGVcclxuXHRcdFx0XHRcdFx0c2libGluZ1Bhc3Nlc1F1ZXJ5RmlsdGVyID1cclxuXHRcdFx0XHRcdFx0XHQoZmlsdGVycy5maWx0ZXJNb2RlID09PSBcIklOQ0xVREVcIiAmJiByZXN1bHQpIHx8XHJcblx0XHRcdFx0XHRcdFx0KGZpbHRlcnMuZmlsdGVyTW9kZSA9PT0gXCJFWENMVURFXCIgJiYgIXJlc3VsdCk7XHJcblx0XHRcdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmVycm9yKFxyXG5cdFx0XHRcdFx0XHRcdFwiRXJyb3IgZXZhbHVhdGluZyBhZHZhbmNlZCBmaWx0ZXI6XCIsXHJcblx0XHRcdFx0XHRcdFx0ZXJyb3JcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGlmIChzaWJsaW5nUGFzc2VzUXVlcnlGaWx0ZXIpIHtcclxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIGZhbHNlO1xyXG59XHJcblxyXG4vKipcclxuICogQ2hlY2tzIGlmIGEgdGFzayBoYXMgYW55IGRlc2NlbmRhbnQgdGhhdCBtYXRjaGVzIHRoZSBmaWx0ZXIgY3JpdGVyaWFcclxuICogQHBhcmFtIHRhc2sgVGhlIHBhcmVudCB0YXNrIHRvIGNoZWNrXHJcbiAqIEBwYXJhbSBmaWx0ZXJzIFRoZSBmaWx0ZXIgb3B0aW9ucyB0byBhcHBseVxyXG4gKiBAcmV0dXJucyBUcnVlIGlmIGFueSBkZXNjZW5kYW50IG1hdGNoZXMgdGhlIGZpbHRlclxyXG4gKi9cclxuZnVuY3Rpb24gaGFzTWF0Y2hpbmdEZXNjZW5kYW50KFxyXG5cdHRhc2s6IFRhc2ssXHJcblx0ZmlsdGVyczogVGFza0ZpbHRlck9wdGlvbnNcclxuKTogYm9vbGVhbiB7XHJcblx0Ly8gQ2hlY2sgZWFjaCBjaGlsZCB0YXNrXHJcblx0Zm9yIChjb25zdCBjaGlsZCBvZiB0YXNrLmNoaWxkVGFza3MpIHtcclxuXHRcdC8vIEZpcnN0IGNoZWNrIGlmIGNoaWxkIHBhc3NlcyBzdGF0dXMgZmlsdGVyIChtYW5kYXRvcnkpXHJcblx0XHRjb25zdCBjaGlsZFBhc3Nlc1N0YXR1c0ZpbHRlciA9XHJcblx0XHRcdChmaWx0ZXJzLmluY2x1ZGVDb21wbGV0ZWQgJiYgY2hpbGQuc3RhdHVzID09PSBcImNvbXBsZXRlZFwiKSB8fFxyXG5cdFx0XHQoZmlsdGVycy5pbmNsdWRlSW5Qcm9ncmVzcyAmJiBjaGlsZC5zdGF0dXMgPT09IFwiaW5Qcm9ncmVzc1wiKSB8fFxyXG5cdFx0XHQoZmlsdGVycy5pbmNsdWRlQWJhbmRvbmVkICYmIGNoaWxkLnN0YXR1cyA9PT0gXCJhYmFuZG9uZWRcIikgfHxcclxuXHRcdFx0KGZpbHRlcnMuaW5jbHVkZU5vdFN0YXJ0ZWQgJiYgY2hpbGQuc3RhdHVzID09PSBcIm5vdFN0YXJ0ZWRcIikgfHxcclxuXHRcdFx0KGZpbHRlcnMuaW5jbHVkZVBsYW5uZWQgJiYgY2hpbGQuc3RhdHVzID09PSBcInBsYW5uZWRcIik7XHJcblxyXG5cdFx0aWYgKGNoaWxkUGFzc2VzU3RhdHVzRmlsdGVyKSB7XHJcblx0XHRcdC8vIFRoZW4gY2hlY2sgcXVlcnkgZmlsdGVyIGlmIHByZXNlbnRcclxuXHRcdFx0bGV0IGNoaWxkUGFzc2VzUXVlcnlGaWx0ZXIgPSB0cnVlO1xyXG5cdFx0XHRpZiAoZmlsdGVycy5hZHZhbmNlZEZpbHRlclF1ZXJ5LnRyaW0oKSAhPT0gXCJcIikge1xyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRjb25zdCBwYXJzZVJlc3VsdCA9IHBhcnNlQWR2YW5jZWRGaWx0ZXJRdWVyeShcclxuXHRcdFx0XHRcdFx0ZmlsdGVycy5hZHZhbmNlZEZpbHRlclF1ZXJ5XHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gZXZhbHVhdGVGaWx0ZXJOb2RlKFxyXG5cdFx0XHRcdFx0XHRwYXJzZVJlc3VsdCxcclxuXHRcdFx0XHRcdFx0bWFwVGFza0ZvckZpbHRlcmluZyhjaGlsZClcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHQvLyBEZXRlcm1pbmUgdmlzaWJpbGl0eSBiYXNlZCBvbiBmaWx0ZXIgbW9kZVxyXG5cdFx0XHRcdFx0Y2hpbGRQYXNzZXNRdWVyeUZpbHRlciA9XHJcblx0XHRcdFx0XHRcdChmaWx0ZXJzLmZpbHRlck1vZGUgPT09IFwiSU5DTFVERVwiICYmIHJlc3VsdCkgfHxcclxuXHRcdFx0XHRcdFx0KGZpbHRlcnMuZmlsdGVyTW9kZSA9PT0gXCJFWENMVURFXCIgJiYgIXJlc3VsdCk7XHJcblx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFcnJvciBldmFsdWF0aW5nIGFkdmFuY2VkIGZpbHRlcjpcIiwgZXJyb3IpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKGNoaWxkUGFzc2VzUXVlcnlGaWx0ZXIpIHtcclxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlY3Vyc2l2ZWx5IGNoZWNrIGdyYW5kY2hpbGRyZW5cclxuXHRcdGlmIChoYXNNYXRjaGluZ0Rlc2NlbmRhbnQoY2hpbGQsIGZpbHRlcnMpKSB7XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIGZhbHNlO1xyXG59XHJcblxyXG4vLyBBcHBseSBkZWNvcmF0aW9ucyB0byBoaWRlIGZpbHRlcmVkIHRhc2tzXHJcbmZ1bmN0aW9uIGFwcGx5SGlkZGVuVGFza0RlY29yYXRpb25zKFxyXG5cdHZpZXc6IEVkaXRvclZpZXcsXHJcblx0cmFuZ2VzOiBBcnJheTx7IGZyb206IG51bWJlcjsgdG86IG51bWJlciB9PiA9IFtdXHJcbikge1xyXG5cdC8vIENyZWF0ZSBkZWNvcmF0aW9ucyBmb3IgaGlkZGVuIHRhc2tzXHJcblx0Y29uc3QgZGVjb3JhdGlvbnMgPSByYW5nZXMubWFwKChyYW5nZSkgPT4ge1xyXG5cdFx0cmV0dXJuIERlY29yYXRpb24ucmVwbGFjZSh7XHJcblx0XHRcdGluY2x1c2l2ZTogdHJ1ZSxcclxuXHRcdFx0YmxvY2s6IHRydWUsXHJcblx0XHR9KS5yYW5nZShyYW5nZS5mcm9tLCByYW5nZS50byk7XHJcblx0fSk7XHJcblxyXG5cdC8vIEFwcGx5IHRoZSBkZWNvcmF0aW9uc1xyXG5cdGlmIChkZWNvcmF0aW9ucy5sZW5ndGggPiAwKSB7XHJcblx0XHR2aWV3LmRpc3BhdGNoKHtcclxuXHRcdFx0ZWZmZWN0czogZmlsdGVyVGFza3NFZmZlY3Qub2YoXHJcblx0XHRcdFx0RGVjb3JhdGlvbi5ub25lLnVwZGF0ZSh7XHJcblx0XHRcdFx0XHRhZGQ6IGRlY29yYXRpb25zLFxyXG5cdFx0XHRcdFx0ZmlsdGVyOiAoKSA9PiBmYWxzZSxcclxuXHRcdFx0XHR9KVxyXG5cdFx0XHQpLFxyXG5cdFx0fSk7XHJcblx0fSBlbHNlIHtcclxuXHRcdC8vIENsZWFyIGRlY29yYXRpb25zIGlmIG5vIHRhc2tzIHRvIGhpZGVcclxuXHRcdHZpZXcuZGlzcGF0Y2goe1xyXG5cdFx0XHRlZmZlY3RzOiBmaWx0ZXJUYXNrc0VmZmVjdC5vZihEZWNvcmF0aW9uLm5vbmUpLFxyXG5cdFx0fSk7XHJcblx0fVxyXG59XHJcblxyXG4vLyBTdGF0ZSBmaWVsZCB0byBoYW5kbGUgaGlkZGVuIHRhc2sgZGVjb3JhdGlvbnNcclxuZXhwb3J0IGNvbnN0IGZpbHRlclRhc2tzRWZmZWN0ID0gU3RhdGVFZmZlY3QuZGVmaW5lPERlY29yYXRpb25TZXQ+KCk7XHJcblxyXG5leHBvcnQgY29uc3QgZmlsdGVyVGFza3NGaWVsZCA9IFN0YXRlRmllbGQuZGVmaW5lPERlY29yYXRpb25TZXQ+KHtcclxuXHRjcmVhdGUoKSB7XHJcblx0XHRyZXR1cm4gRGVjb3JhdGlvbi5ub25lO1xyXG5cdH0sXHJcblx0dXBkYXRlKGRlY29yYXRpb25zLCB0cikge1xyXG5cdFx0ZGVjb3JhdGlvbnMgPSBkZWNvcmF0aW9ucy5tYXAodHIuY2hhbmdlcyk7XHJcblx0XHRmb3IgKGNvbnN0IGVmZmVjdCBvZiB0ci5lZmZlY3RzKSB7XHJcblx0XHRcdGlmIChlZmZlY3QuaXMoZmlsdGVyVGFza3NFZmZlY3QpKSB7XHJcblx0XHRcdFx0ZGVjb3JhdGlvbnMgPSBlZmZlY3QudmFsdWU7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiBkZWNvcmF0aW9ucztcclxuXHR9LFxyXG5cdHByb3ZpZGUoZmllbGQpIHtcclxuXHRcdHJldHVybiBFZGl0b3JWaWV3LmRlY29yYXRpb25zLmZyb20oZmllbGQpO1xyXG5cdH0sXHJcbn0pO1xyXG5cclxuLy8gRmFjZXRzIHRvIG1ha2UgYXBwIGFuZCBwbHVnaW4gaW5zdGFuY2VzIGF2YWlsYWJsZSB0byB0aGUgcGFuZWxcclxuZXhwb3J0IGNvbnN0IGFwcEZhY2V0ID0gRmFjZXQuZGVmaW5lPEFwcCwgQXBwPih7XHJcblx0Y29tYmluZTogKHZhbHVlcykgPT4gdmFsdWVzWzBdLFxyXG59KTtcclxuXHJcbmV4cG9ydCBjb25zdCBwbHVnaW5GYWNldCA9IEZhY2V0LmRlZmluZTxcclxuXHRUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0VGFza1Byb2dyZXNzQmFyUGx1Z2luXHJcbj4oe1xyXG5cdGNvbWJpbmU6ICh2YWx1ZXMpID0+IHZhbHVlc1swXSxcclxufSk7XHJcblxyXG4vLyBDcmVhdGUgdGhlIGV4dGVuc2lvbiB0byBlbmFibGUgdGFzayBmaWx0ZXJpbmcgaW4gYW4gZWRpdG9yXHJcbmV4cG9ydCBmdW5jdGlvbiB0YXNrRmlsdGVyRXh0ZW5zaW9uKHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luKSB7XHJcblx0cmV0dXJuIFtcclxuXHRcdHRhc2tGaWx0ZXJTdGF0ZSxcclxuXHRcdGFjdGl2ZUZpbHRlcnNTdGF0ZSxcclxuXHRcdGhpZGRlblRhc2tSYW5nZXNTdGF0ZSxcclxuXHRcdGFjdGlvbkJ1dHRvblN0YXRlLFxyXG5cdFx0ZmlsdGVyVGFza3NGaWVsZCxcclxuXHRcdHRhc2tGaWx0ZXJPcHRpb25zLm9mKERFRkFVTFRfRklMVEVSX09QVElPTlMpLFxyXG5cdFx0cGx1Z2luRmFjZXQub2YocGx1Z2luKSxcclxuXHRdO1xyXG59XHJcblxyXG4vKipcclxuICogR2V0cyB0aGUgYWN0aXZlIGZpbHRlciBvcHRpb25zIGZvciBhIHNwZWNpZmljIGVkaXRvciB2aWV3XHJcbiAqIEBwYXJhbSB2aWV3IFRoZSBlZGl0b3IgdmlldyB0byBnZXQgYWN0aXZlIGZpbHRlcnMgZm9yXHJcbiAqIEByZXR1cm5zIFRoZSBhY3RpdmUgZmlsdGVyIG9wdGlvbnMgZm9yIHRoZSB2aWV3XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWN0aXZlRmlsdGVyc0ZvclZpZXcodmlldzogRWRpdG9yVmlldyk6IFRhc2tGaWx0ZXJPcHRpb25zIHtcclxuXHRpZiAodmlldy5zdGF0ZS5maWVsZChhY3RpdmVGaWx0ZXJzU3RhdGUsIGZhbHNlKSkge1xyXG5cdFx0Y29uc3QgYWN0aXZlRmlsdGVycyA9IHZpZXcuc3RhdGUuZmllbGQoYWN0aXZlRmlsdGVyc1N0YXRlKTtcclxuXHRcdC8vIEVuc3VyZSB0aGUgYWN0aXZlIGZpbHRlcnMgYXJlIHByb3Blcmx5IG1pZ3JhdGVkXHJcblx0XHRyZXR1cm4gbWlncmF0ZU9sZEZpbHRlck9wdGlvbnMoYWN0aXZlRmlsdGVycyk7XHJcblx0fVxyXG5cdHJldHVybiB7IC4uLkRFRkFVTFRfRklMVEVSX09QVElPTlMgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdldHMgdGhlIGhpZGRlbiB0YXNrIHJhbmdlcyBmb3IgYSBzcGVjaWZpYyBlZGl0b3Igdmlld1xyXG4gKiBAcGFyYW0gdmlldyBUaGUgZWRpdG9yIHZpZXcgdG8gZ2V0IGhpZGRlbiByYW5nZXMgZm9yXHJcbiAqIEByZXR1cm5zIFRoZSBhcnJheSBvZiBoaWRkZW4gdGFzayByYW5nZXNcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRIaWRkZW5UYXNrUmFuZ2VzRm9yVmlldyhcclxuXHR2aWV3OiBFZGl0b3JWaWV3XHJcbik6IEFycmF5PHsgZnJvbTogbnVtYmVyOyB0bzogbnVtYmVyIH0+IHtcclxuXHRpZiAodmlldy5zdGF0ZS5maWVsZChoaWRkZW5UYXNrUmFuZ2VzU3RhdGUsIGZhbHNlKSkge1xyXG5cdFx0cmV0dXJuIHZpZXcuc3RhdGUuZmllbGQoaGlkZGVuVGFza1Jhbmdlc1N0YXRlKTtcclxuXHR9XHJcblx0cmV0dXJuIFtdO1xyXG59XHJcblxyXG4vLyBSZXNldCBhbGwgdGFzayBmaWx0ZXJzXHJcbmZ1bmN0aW9uIHJlc2V0VGFza0ZpbHRlcnModmlldzogRWRpdG9yVmlldykge1xyXG5cdC8vIFJlc2V0IGFjdGl2ZSBmaWx0ZXJzIHRvIGRlZmF1bHRzIGluIHN0YXRlXHJcblx0dmlldy5kaXNwYXRjaCh7XHJcblx0XHRlZmZlY3RzOiBbXHJcblx0XHRcdHVwZGF0ZUFjdGl2ZUZpbHRlcnMub2YoeyAuLi5ERUZBVUxUX0ZJTFRFUl9PUFRJT05TIH0pLFxyXG5cdFx0XHR1cGRhdGVIaWRkZW5UYXNrUmFuZ2VzLm9mKFtdKSxcclxuXHRcdF0sXHJcblx0fSk7XHJcblxyXG5cdHZpZXcuc3RhdGVcclxuXHRcdC5maWVsZChlZGl0b3JJbmZvRmllbGQpXHJcblx0XHQvLyBAdHMtaWdub3JlXHJcblx0XHQ/LmZpbHRlckFjdGlvbj8udG9nZ2xlQ2xhc3MoXHJcblx0XHRcdFwidGFzay1maWx0ZXItYWN0aXZlXCIsXHJcblx0XHRcdGZhbHNlIC8vIEFsd2F5cyBmYWxzZSBvbiByZXNldFxyXG5cdFx0KTtcclxuXHJcblx0Ly8gQXBwbHkgZGVjb3JhdGlvbnMgdG8gaGlkZSBmaWx0ZXJlZCB0YXNrc1xyXG5cdGFwcGx5SGlkZGVuVGFza0RlY29yYXRpb25zKHZpZXcsIFtdKTtcclxufVxyXG5cclxuLy8gRmluZCBhbGwgdGFza3MgaW4gdGhlIGRvY3VtZW50IGFuZCBidWlsZCB0aGUgdGFzayBoaWVyYXJjaHlcclxuZnVuY3Rpb24gZmluZEFsbFRhc2tzKFxyXG5cdHZpZXc6IEVkaXRvclZpZXcsXHJcblx0dGFza1N0YXR1c01hcmtzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XHJcbik6IFRhc2tbXSB7XHJcblx0Y29uc3QgZG9jID0gdmlldy5zdGF0ZS5kb2M7XHJcblx0Y29uc3QgdGFza3M6IFRhc2tbXSA9IFtdO1xyXG5cdGNvbnN0IHRhc2tTdGFjazogVGFza1tdID0gW107XHJcblxyXG5cdC8vIEV4dHJhY3Qgc3RhdHVzIG1hcmtzIGZvciBtYXRjaGluZ1xyXG5cdGNvbnN0IGNvbXBsZXRlZE1hcmtzID0gdGFza1N0YXR1c01hcmtzLmNvbXBsZXRlZC5zcGxpdChcInxcIik7XHJcblx0Y29uc3QgaW5Qcm9ncmVzc01hcmtzID0gdGFza1N0YXR1c01hcmtzLmluUHJvZ3Jlc3Muc3BsaXQoXCJ8XCIpO1xyXG5cdGNvbnN0IGFiYW5kb25lZE1hcmtzID0gdGFza1N0YXR1c01hcmtzLmFiYW5kb25lZC5zcGxpdChcInxcIik7XHJcblx0Y29uc3Qgbm90U3RhcnRlZE1hcmtzID0gdGFza1N0YXR1c01hcmtzLm5vdFN0YXJ0ZWQuc3BsaXQoXCJ8XCIpO1xyXG5cdGNvbnN0IHBsYW5uZWRNYXJrcyA9IHRhc2tTdGF0dXNNYXJrcy5wbGFubmVkLnNwbGl0KFwifFwiKTtcclxuXHJcblx0Ly8gU2ltcGxlIHJlZ2V4IHRvIG1hdGNoIHRhc2sgbGluZXNcclxuXHRjb25zdCB0YXNrUmVnZXggPSAvXihcXHMqKSgtfFxcKnwoXFxkK1xcLikpIFxcWyguKVxcXSAoLiopJC9nbTtcclxuXHJcblx0Ly8gUmVnZXggZm9yIGV4dHJhY3RpbmcgcHJpb3JpdGllcyAoYm90aCBsZXR0ZXIgZm9ybWF0IGFuZCBlbW9qaSlcclxuXHRjb25zdCBwcmlvcml0eVJlZ2V4ID1cclxuXHRcdC9cXFsoI1tBLVpdKVxcXXwoPzrwn5S6fOKPq3zwn5S8fPCflL184o+s77iPfPCflLR88J+foHzwn5+hfPCfn6J88J+UtXzimqrvuI984pqr77iPKS9nO1xyXG5cclxuXHQvLyBSZWdleCBmb3IgZXh0cmFjdGluZyB0YWdzXHJcblx0Y29uc3QgdGFnUmVnZXggPVxyXG5cdFx0LyMoW2EtekEtWjAtOV9cXC0vXFx1NGUwMC1cXHU5ZmE1XFx1MzA0MC1cXHUzMDlmXFx1MzBhMC1cXHUzMGZmXFx1MzQwMC1cXHU0ZGJmXFx1NGUwMC1cXHU5ZmZmXFx1ZjkwMC1cXHVmYWZmXFx1ZmY2Ni1cXHVmZjlmXFx1MzEzMS1cXHVENzlEXSspL2c7XHJcblxyXG5cdC8vIFJlZ2V4IGZvciBleHRyYWN0aW5nIGRhdGVzIChsb29raW5nIGZvciBZWVlZLU1NLUREIGZvcm1hdCBvciBvdGhlciBjb21tb24gZGF0ZSBmb3JtYXRzKVxyXG5cdGNvbnN0IGRhdGVSZWdleCA9XHJcblx0XHQvXFxkezR9LVxcZHsyfS1cXGR7Mn18XFxkezJ9XFwuXFxkezJ9XFwuXFxkezR9fFxcZHsyfVxcL1xcZHsyfVxcL1xcZHs0fS9nO1xyXG5cclxuXHQvLyBTZWFyY2ggdGhlIGRvY3VtZW50IGZvciB0YXNrIGxpbmVzXHJcblx0Zm9yIChsZXQgaSA9IDE7IGkgPD0gZG9jLmxpbmVzOyBpKyspIHtcclxuXHRcdGNvbnN0IGxpbmUgPSBkb2MubGluZShpKTtcclxuXHRcdGNvbnN0IGxpbmVUZXh0ID0gbGluZS50ZXh0O1xyXG5cclxuXHRcdC8vIFJlc2V0IHRoZSByZWdleFxyXG5cdFx0dGFza1JlZ2V4Lmxhc3RJbmRleCA9IDA7XHJcblx0XHRsZXQgbTtcclxuXHJcblx0XHRpZiAoKG0gPSB0YXNrUmVnZXguZXhlYyhsaW5lVGV4dCkpKSB7XHJcblx0XHRcdGNvbnN0IGluZGVudGF0aW9uID0gbVsxXS5sZW5ndGg7XHJcblx0XHRcdGNvbnN0IHN0YXR1c01hcmsgPSBtWzRdOyAvLyBUaGUgY2hhcmFjdGVyIGluc2lkZSBicmFja2V0c1xyXG5cdFx0XHRjb25zdCB0YXNrVGV4dCA9IG1bNV07IC8vIFRoZSB0ZXh0IGFmdGVyIHRoZSBjaGVja2JveFxyXG5cclxuXHRcdFx0Ly8gRGV0ZXJtaW5lIHRhc2sgc3RhdHVzIGJhc2VkIG9uIHRoZSBtYXJrXHJcblx0XHRcdGxldCBzdGF0dXM6XHJcblx0XHRcdFx0fCBcImNvbXBsZXRlZFwiXHJcblx0XHRcdFx0fCBcImluUHJvZ3Jlc3NcIlxyXG5cdFx0XHRcdHwgXCJhYmFuZG9uZWRcIlxyXG5cdFx0XHRcdHwgXCJub3RTdGFydGVkXCJcclxuXHRcdFx0XHR8IFwicGxhbm5lZFwiO1xyXG5cclxuXHRcdFx0Ly8gTWF0Y2ggdGhlIHN0YXR1cyBtYXJrIGFnYWluc3Qgb3VyIGNvbmZpZ3VyZWQgbWFya3NcclxuXHRcdFx0aWYgKGNvbXBsZXRlZE1hcmtzLmluY2x1ZGVzKHN0YXR1c01hcmspKSB7XHJcblx0XHRcdFx0c3RhdHVzID0gXCJjb21wbGV0ZWRcIjtcclxuXHRcdFx0fSBlbHNlIGlmIChpblByb2dyZXNzTWFya3MuaW5jbHVkZXMoc3RhdHVzTWFyaykpIHtcclxuXHRcdFx0XHRzdGF0dXMgPSBcImluUHJvZ3Jlc3NcIjtcclxuXHRcdFx0fSBlbHNlIGlmIChhYmFuZG9uZWRNYXJrcy5pbmNsdWRlcyhzdGF0dXNNYXJrKSkge1xyXG5cdFx0XHRcdHN0YXR1cyA9IFwiYWJhbmRvbmVkXCI7XHJcblx0XHRcdH0gZWxzZSBpZiAocGxhbm5lZE1hcmtzLmluY2x1ZGVzKHN0YXR1c01hcmspKSB7XHJcblx0XHRcdFx0c3RhdHVzID0gXCJwbGFubmVkXCI7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0c3RhdHVzID0gXCJub3RTdGFydGVkXCI7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEV4dHJhY3QgcHJpb3JpdHlcclxuXHRcdFx0cHJpb3JpdHlSZWdleC5sYXN0SW5kZXggPSAwO1xyXG5cdFx0XHRjb25zdCBwcmlvcml0eU1hdGNoID0gcHJpb3JpdHlSZWdleC5leGVjKHRhc2tUZXh0KTtcclxuXHRcdFx0bGV0IHByaW9yaXR5ID0gcHJpb3JpdHlNYXRjaCA/IHByaW9yaXR5TWF0Y2hbMF0gOiB1bmRlZmluZWQ7XHJcblxyXG5cdFx0XHQvLyBFeHRyYWN0IHRhZ3NcclxuXHRcdFx0dGFnUmVnZXgubGFzdEluZGV4ID0gMDtcclxuXHRcdFx0Y29uc3QgdGFnczogc3RyaW5nW10gPSBbXTtcclxuXHRcdFx0bGV0IHRhZ01hdGNoO1xyXG5cdFx0XHR3aGlsZSAoKHRhZ01hdGNoID0gdGFnUmVnZXguZXhlYyh0YXNrVGV4dCkpICE9PSBudWxsKSB7XHJcblx0XHRcdFx0dGFncy5wdXNoKHRhZ01hdGNoWzBdKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gRXh0cmFjdCBkYXRlXHJcblx0XHRcdGRhdGVSZWdleC5sYXN0SW5kZXggPSAwO1xyXG5cdFx0XHRjb25zdCBkYXRlTWF0Y2ggPSBkYXRlUmVnZXguZXhlYyh0YXNrVGV4dCk7XHJcblx0XHRcdGxldCBkYXRlID0gZGF0ZU1hdGNoID8gZGF0ZU1hdGNoWzBdIDogdW5kZWZpbmVkO1xyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIHRoZSB0YXNrIG9iamVjdFxyXG5cdFx0XHRjb25zdCB0YXNrOiBUYXNrID0ge1xyXG5cdFx0XHRcdGZyb206IGxpbmUuZnJvbSxcclxuXHRcdFx0XHR0bzogbGluZS50byxcclxuXHRcdFx0XHR0ZXh0OiB0YXNrVGV4dCxcclxuXHRcdFx0XHRzdGF0dXMsXHJcblx0XHRcdFx0aW5kZW50YXRpb24sXHJcblx0XHRcdFx0Y2hpbGRUYXNrczogW10sXHJcblx0XHRcdFx0cHJpb3JpdHksXHJcblx0XHRcdFx0ZGF0ZSxcclxuXHRcdFx0XHR0YWdzLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gRml4OiBCdWlsZCBoaWVyYXJjaHkgLSBmaW5kIHRoZSBwYXJlbnQgZm9yIHRoaXMgdGFza1xyXG5cdFx0XHQvLyBQb3AgaXRlbXMgZnJvbSBzdGFjayB1bnRpbCB3ZSBmaW5kIGEgcG90ZW50aWFsIHBhcmVudCB3aXRoIGxlc3MgaW5kZW50YXRpb25cclxuXHRcdFx0d2hpbGUgKFxyXG5cdFx0XHRcdHRhc2tTdGFjay5sZW5ndGggPiAwICYmXHJcblx0XHRcdFx0dGFza1N0YWNrW3Rhc2tTdGFjay5sZW5ndGggLSAxXS5pbmRlbnRhdGlvbiA+PSBpbmRlbnRhdGlvblxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHR0YXNrU3RhY2sucG9wKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIElmIHdlIHN0aWxsIGhhdmUgaXRlbXMgaW4gdGhlIHN0YWNrLCB0aGUgdG9wIGl0ZW0gaXMgb3VyIHBhcmVudFxyXG5cdFx0XHRpZiAodGFza1N0YWNrLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRjb25zdCBwYXJlbnQgPSB0YXNrU3RhY2tbdGFza1N0YWNrLmxlbmd0aCAtIDFdO1xyXG5cdFx0XHRcdHRhc2sucGFyZW50VGFzayA9IHBhcmVudDtcclxuXHRcdFx0XHRwYXJlbnQuY2hpbGRUYXNrcy5wdXNoKHRhc2spO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBBZGQgdG8gdGhlIHRhc2sgbGlzdCBhbmQgc3RhY2tcclxuXHRcdFx0dGFza3MucHVzaCh0YXNrKTtcclxuXHRcdFx0dGFza1N0YWNrLnB1c2godGFzayk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gdGFza3M7XHJcbn1cclxuIl19