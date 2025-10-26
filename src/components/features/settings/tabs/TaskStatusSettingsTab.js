import { __awaiter } from "tslib";
import { Modal, setIcon, Setting } from "obsidian";
import { t } from "@/translations/helper";
import { allStatusCollections } from "@/common/task-status";
import { getTasksAPI } from "@/utils";
import { DEFAULT_SETTINGS, } from "@/common/setting-definition";
import * as taskStatusModule from "@/common/task-status";
export function renderTaskStatusSettingsTab(settingTab, containerEl) {
    new Setting(containerEl)
        .setName(t("Checkbox Status Settings"))
        .setDesc(t("Configure checkbox status settings"))
        .setHeading();
    // Check if Tasks plugin is installed and show compatibility warning
    const tasksAPI = getTasksAPI(settingTab.plugin);
    if (tasksAPI) {
        const warningBanner = containerEl.createDiv({
            cls: "tasks-compatibility-warning",
        });
        warningBanner.createEl("div", {
            cls: "tasks-warning-icon",
            text: "⚠️",
        });
        const warningContent = warningBanner.createDiv({
            cls: "tasks-warning-content",
        });
        warningContent.createEl("div", {
            cls: "tasks-warning-title",
            text: t("Tasks Plugin Detected"),
        });
        const warningText = warningContent.createEl("div", {
            cls: "tasks-warning-text",
        });
        warningText.createEl("span", {
            text: t("Current status management and date management may conflict with the Tasks plugin. Please check the "),
        });
        const compatibilityLink = warningText.createEl("a", {
            text: t("compatibility documentation"),
            href: "https://taskgenius.md/docs/compatibility",
        });
        compatibilityLink.setAttribute("target", "_blank");
        compatibilityLink.setAttribute("rel", "noopener noreferrer");
        warningText.createEl("span", {
            text: t(" for more information."),
        });
    }
    new Setting(containerEl)
        .setName(t("Auto complete parent checkbox"))
        .setDesc(t("Toggle this to allow this plugin to auto complete parent checkbox when all child tasks are completed."))
        .addToggle((toggle) => toggle
        .setValue(settingTab.plugin.settings.autoCompleteParent)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        settingTab.plugin.settings.autoCompleteParent = value;
        settingTab.applySettingsUpdate();
    })));
    new Setting(containerEl)
        .setName(t("Mark parent as 'In Progress' when partially complete"))
        .setDesc(t("When some but not all child tasks are completed, mark the parent checkbox as 'In Progress'. Only works when 'Auto complete parent' is enabled."))
        .addToggle((toggle) => toggle
        .setValue(settingTab.plugin.settings
        .markParentInProgressWhenPartiallyComplete)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        settingTab.plugin.settings.markParentInProgressWhenPartiallyComplete =
            value;
        settingTab.applySettingsUpdate();
    })));
    // Checkbox Status Settings
    new Setting(containerEl)
        .setName(t("Checkbox Status Settings"))
        .setDesc(t("Select a predefined checkbox status collection or customize your own"))
        .setHeading()
        .addDropdown((dropdown) => {
        dropdown.addOption("custom", "Custom");
        for (const statusCollection of allStatusCollections) {
            dropdown.addOption(statusCollection, statusCollection);
        }
        // Set default value to custom
        dropdown.setValue("custom");
        dropdown.onChange((value) => __awaiter(this, void 0, void 0, function* () {
            if (value === "custom") {
                return;
            }
            // Confirm before applying the theme
            const modal = new Modal(settingTab.app);
            modal.titleEl.setText(`Apply ${value} Theme?`);
            const content = modal.contentEl.createDiv();
            content.setText(`This will override your current checkbox status settings with the ${value} theme. Do you want to continue?`);
            const buttonContainer = modal.contentEl.createDiv({
                cls: "tg-modal-button-container modal-button-container",
            });
            const cancelButton = buttonContainer.createEl("button");
            cancelButton.setText(t("Cancel"));
            cancelButton.addEventListener("click", () => {
                dropdown.setValue("custom");
                modal.close();
            });
            const confirmButton = buttonContainer.createEl("button");
            confirmButton.setText(t("Apply Theme"));
            confirmButton.addClass("mod-cta");
            confirmButton.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
                modal.close();
                // Apply the selected theme's task statuses
                try {
                    // Get the function based on the selected theme
                    const functionName = value.toLowerCase() + "SupportedStatuses";
                    // Use type assertion for the dynamic function access
                    const getStatuses = taskStatusModule[functionName];
                    if (typeof getStatuses === "function") {
                        const statuses = getStatuses();
                        // Update cycle and marks
                        const cycle = settingTab.plugin.settings.taskStatusCycle;
                        const marks = settingTab.plugin.settings.taskStatusMarks;
                        const excludeMarks = settingTab.plugin.settings
                            .excludeMarksFromCycle;
                        // Clear existing cycle, marks and excludeMarks
                        cycle.length = 0;
                        Object.keys(marks).forEach((key) => delete marks[key]);
                        excludeMarks.length = 0;
                        // Add new statuses to cycle and marks
                        for (const [symbol, name, type] of statuses) {
                            const realName = name
                                .split("/")[0]
                                .trim();
                            // Add to cycle if not already included
                            if (!cycle.includes(realName)) {
                                cycle.push(realName);
                            }
                            // Add to marks
                            marks[realName] = symbol;
                            // Add to excludeMarks if not space or x
                            if (symbol !== " " && symbol !== "x") {
                                excludeMarks.push(realName);
                            }
                        }
                        // Also update the main taskStatuses object based on the theme
                        const statusMap = {
                            completed: [],
                            inProgress: [],
                            abandoned: [],
                            notStarted: [],
                            planned: [],
                        };
                        for (const [symbol, _, type] of statuses) {
                            if (type in statusMap) {
                                statusMap[type].push(symbol);
                            }
                        }
                        // Corrected loop and assignment for TaskStatusConfig here too
                        for (const type of Object.keys(statusMap)) {
                            if (type in
                                settingTab.plugin.settings
                                    .taskStatuses &&
                                statusMap[type] &&
                                statusMap[type].length > 0) {
                                settingTab.plugin.settings.taskStatuses[type] = statusMap[type].join("|");
                            }
                        }
                        // Save settings and refresh the display
                        settingTab.applySettingsUpdate();
                        settingTab.display();
                    }
                }
                catch (error) {
                    console.error("Failed to apply checkbox status theme:", error);
                }
            }));
            modal.open();
        }));
    });
    const completeFragment = createFragment();
    completeFragment.createEl("span", {
        cls: "tg-status-icon",
    }, (el) => {
        setIcon(el, "completed");
    });
    completeFragment.createEl("span", {
        cls: "tg-status-text",
    }, (el) => {
        el.setText(t("Completed"));
    });
    new Setting(containerEl)
        .setName(completeFragment)
        .setDesc(t('Characters in square brackets that represent completed tasks. Example: "x|X"'))
        .addText((text) => text
        .setPlaceholder(DEFAULT_SETTINGS.taskStatuses.completed)
        .setValue(settingTab.plugin.settings.taskStatuses.completed)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        settingTab.plugin.settings.taskStatuses.completed =
            value || DEFAULT_SETTINGS.taskStatuses.completed;
        settingTab.applySettingsUpdate();
        // Update Task Genius Icon Manager
        if (settingTab.plugin.taskGeniusIconManager) {
            settingTab.plugin.taskGeniusIconManager.update();
        }
    })));
    const plannedFragment = createFragment();
    plannedFragment.createEl("span", {
        cls: "tg-status-icon",
    }, (el) => {
        setIcon(el, "planned");
    });
    plannedFragment.createEl("span", {
        cls: "tg-status-text",
    }, (el) => {
        el.setText(t("Planned"));
    });
    new Setting(containerEl)
        .setName(plannedFragment)
        .setDesc(t('Characters in square brackets that represent planned tasks. Example: "?"'))
        .addText((text) => text
        .setPlaceholder(DEFAULT_SETTINGS.taskStatuses.planned)
        .setValue(settingTab.plugin.settings.taskStatuses.planned)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        settingTab.plugin.settings.taskStatuses.planned =
            value || DEFAULT_SETTINGS.taskStatuses.planned;
        settingTab.applySettingsUpdate();
        // Update Task Genius Icon Manager
        if (settingTab.plugin.taskGeniusIconManager) {
            settingTab.plugin.taskGeniusIconManager.update();
        }
    })));
    const inProgressFragment = createFragment();
    inProgressFragment.createEl("span", {
        cls: "tg-status-icon",
    }, (el) => {
        setIcon(el, "inProgress");
    });
    inProgressFragment.createEl("span", {
        cls: "tg-status-text",
    }, (el) => {
        el.setText(t("In Progress"));
    });
    new Setting(containerEl)
        .setName(inProgressFragment)
        .setDesc(t('Characters in square brackets that represent tasks in progress. Example: ">|/"'))
        .addText((text) => text
        .setPlaceholder(DEFAULT_SETTINGS.taskStatuses.inProgress)
        .setValue(settingTab.plugin.settings.taskStatuses.inProgress)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        settingTab.plugin.settings.taskStatuses.inProgress =
            value || DEFAULT_SETTINGS.taskStatuses.inProgress;
        settingTab.applySettingsUpdate();
        // Update Task Genius Icon Manager
        if (settingTab.plugin.taskGeniusIconManager) {
            settingTab.plugin.taskGeniusIconManager.update();
        }
    })));
    const abandonedFragment = createFragment();
    abandonedFragment.createEl("span", {
        cls: "tg-status-icon",
    }, (el) => {
        setIcon(el, "abandoned");
    });
    abandonedFragment.createEl("span", {
        cls: "tg-status-text",
    }, (el) => {
        el.setText(t("Abandoned"));
    });
    new Setting(containerEl)
        .setName(abandonedFragment)
        .setDesc(t('Characters in square brackets that represent abandoned tasks. Example: "-"'))
        .addText((text) => text
        .setPlaceholder(DEFAULT_SETTINGS.taskStatuses.abandoned)
        .setValue(settingTab.plugin.settings.taskStatuses.abandoned)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        settingTab.plugin.settings.taskStatuses.abandoned =
            value || DEFAULT_SETTINGS.taskStatuses.abandoned;
        settingTab.applySettingsUpdate();
        // Update Task Genius Icon Manager
        if (settingTab.plugin.taskGeniusIconManager) {
            settingTab.plugin.taskGeniusIconManager.update();
        }
    })));
    const notStartedFragment = createFragment();
    notStartedFragment.createEl("span", {
        cls: "tg-status-icon",
    }, (el) => {
        setIcon(el, "notStarted");
    });
    notStartedFragment.createEl("span", {
        cls: "tg-status-text",
    }, (el) => {
        el.setText(t("Not Started"));
    });
    new Setting(containerEl)
        .setName(notStartedFragment)
        .setDesc(t('Characters in square brackets that represent not started tasks. Default is space " "'))
        .addText((text) => text
        .setPlaceholder(DEFAULT_SETTINGS.taskStatuses.notStarted)
        .setValue(settingTab.plugin.settings.taskStatuses.notStarted)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        settingTab.plugin.settings.taskStatuses.notStarted =
            value || DEFAULT_SETTINGS.taskStatuses.notStarted;
        settingTab.applySettingsUpdate();
        // Update Task Genius Icon Manager
        if (settingTab.plugin.taskGeniusIconManager) {
            settingTab.plugin.taskGeniusIconManager.update();
        }
    })));
    new Setting(containerEl)
        .setName(t("Count other statuses as"))
        .setDesc(t('Select the status to count other statuses as. Default is "Not Started".'))
        .addDropdown((dropdown) => {
        dropdown.addOption("notStarted", "Not Started");
        dropdown.addOption("abandoned", "Abandoned");
        dropdown.addOption("planned", "Planned");
        dropdown.addOption("completed", "Completed");
        dropdown.addOption("inProgress", "In Progress");
        dropdown.setValue(settingTab.plugin.settings.countOtherStatusesAs || "notStarted");
        dropdown.onChange((value) => {
            settingTab.plugin.settings.countOtherStatusesAs = value;
            settingTab.applySettingsUpdate();
        });
    });
    // Task Counting Settings
    new Setting(containerEl)
        .setName(t("Task Counting Settings"))
        .setDesc(t("Configure which task markers to count or exclude"))
        .setHeading();
    new Setting(containerEl)
        .setName(t("Exclude specific task markers"))
        .setDesc(t('Specify task markers to exclude from counting. Example: "?|/"'))
        .addText((text) => text
        .setPlaceholder("")
        .setValue(settingTab.plugin.settings.excludeTaskMarks)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        settingTab.plugin.settings.excludeTaskMarks = value;
        settingTab.applySettingsUpdate();
    })));
    new Setting(containerEl)
        .setName(t("Only count specific task markers"))
        .setDesc(t("Toggle this to only count specific task markers"))
        .addToggle((toggle) => toggle
        .setValue(settingTab.plugin.settings.useOnlyCountMarks)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        settingTab.plugin.settings.useOnlyCountMarks = value;
        settingTab.applySettingsUpdate();
        setTimeout(() => {
            settingTab.display();
        }, 200);
    })));
    if (settingTab.plugin.settings.useOnlyCountMarks) {
        new Setting(containerEl)
            .setName(t("Specific task markers to count"))
            .setDesc(t('Specify which task markers to count. Example: "x|X|>|/"'))
            .addText((text) => text
            .setPlaceholder(DEFAULT_SETTINGS.onlyCountTaskMarks)
            .setValue(settingTab.plugin.settings.onlyCountTaskMarks)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            if (value.length === 0) {
                settingTab.plugin.settings.onlyCountTaskMarks =
                    DEFAULT_SETTINGS.onlyCountTaskMarks;
            }
            else {
                settingTab.plugin.settings.onlyCountTaskMarks =
                    value;
            }
            settingTab.applySettingsUpdate();
        })));
    }
    // Check Switcher section
    new Setting(containerEl).setName(t("Checkbox Switcher")).setHeading();
    new Setting(containerEl)
        .setName(t("Enable checkbox status switcher"))
        .setDesc(t("Enable/disable the ability to cycle through task states by clicking."))
        .addToggle((toggle) => {
        toggle
            .setValue(settingTab.plugin.settings.enableTaskStatusSwitcher)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.enableTaskStatusSwitcher = value;
            settingTab.applySettingsUpdate();
            setTimeout(() => {
                settingTab.display();
            }, 200);
        }));
    });
    if (settingTab.plugin.settings.enableTaskStatusSwitcher) {
        new Setting(containerEl)
            .setName(t("Task mark display style"))
            .setDesc(t("Choose how task marks are displayed: default checkboxes, custom text marks, or Task Genius icons."))
            .addDropdown((dropdown) => {
            dropdown.addOption("default", t("Default checkboxes"));
            dropdown.addOption("textmarks", t("Custom text marks"));
            dropdown.addOption("icons", t("Task Genius icons"));
            // Determine current value based on existing settings
            let currentValue = "default";
            if (settingTab.plugin.settings.enableTaskGeniusIcons) {
                currentValue = "icons";
            }
            else if (settingTab.plugin.settings.enableCustomTaskMarks) {
                currentValue = "textmarks";
            }
            dropdown.setValue(currentValue);
            dropdown.onChange((value) => __awaiter(this, void 0, void 0, function* () {
                // Reset all options first
                settingTab.plugin.settings.enableCustomTaskMarks = false;
                settingTab.plugin.settings.enableTaskGeniusIcons = false;
                // Set the selected option
                if (value === "textmarks") {
                    settingTab.plugin.settings.enableCustomTaskMarks = true;
                }
                else if (value === "icons") {
                    settingTab.plugin.settings.enableTaskGeniusIcons = true;
                }
                settingTab.applySettingsUpdate();
                // Update Task Genius Icon Manager
                if (settingTab.plugin.taskGeniusIconManager) {
                    settingTab.plugin.taskGeniusIconManager.update();
                }
                // Refresh display to show/hide dependent options
                setTimeout(() => {
                    settingTab.display();
                }, 200);
            }));
        });
        // Show text mark source mode option only when custom text marks are enabled
        if (settingTab.plugin.settings.enableCustomTaskMarks) {
            new Setting(containerEl)
                .setName(t("Enable text mark in source mode"))
                .setDesc(t("Make the text mark in source mode follow the checkbox status cycle when clicked."))
                .addToggle((toggle) => {
                toggle
                    .setValue(settingTab.plugin.settings
                    .enableTextMarkInSourceMode)
                    .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                    settingTab.plugin.settings.enableTextMarkInSourceMode =
                        value;
                    settingTab.applySettingsUpdate();
                }));
            });
        }
    }
    new Setting(containerEl)
        .setName(t("Enable cycle complete status"))
        .setDesc(t("Enable/disable the ability to automatically cycle through task states when pressing a mark."))
        .addToggle((toggle) => {
        toggle
            .setValue(settingTab.plugin.settings.enableCycleCompleteStatus)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.enableCycleCompleteStatus =
                value;
            settingTab.applySettingsUpdate();
            setTimeout(() => {
                settingTab.display();
            }, 200);
        }));
    });
    if (settingTab.plugin.settings.enableCycleCompleteStatus) {
        new Setting(containerEl)
            .setName(t("Task status cycle and marks"))
            .setDesc(t("Define task states and their corresponding marks. The order from top to bottom defines the cycling sequence."))
            .addDropdown((dropdown) => {
            dropdown.addOption("custom", "Custom");
            for (const statusCollection of allStatusCollections) {
                dropdown.addOption(statusCollection, statusCollection);
            }
            // Set default value to custom
            dropdown.setValue("custom");
            dropdown.onChange((value) => __awaiter(this, void 0, void 0, function* () {
                if (value === "custom") {
                    return;
                }
                // Confirm before applying the theme
                const modal = new Modal(settingTab.app);
                modal.titleEl.setText(`Apply ${value} Theme?`);
                const content = modal.contentEl.createDiv();
                content.setText(t(`This will override your current checkbox status settings with the selected theme. Do you want to continue?`));
                const buttonContainer = modal.contentEl.createDiv({
                    cls: "tg-modal-button-container modal-button-container",
                });
                const cancelButton = buttonContainer.createEl("button");
                cancelButton.setText(t("Cancel"));
                cancelButton.addEventListener("click", () => {
                    dropdown.setValue("custom");
                    modal.close();
                });
                const confirmButton = buttonContainer.createEl("button");
                confirmButton.setText(t("Apply Theme"));
                confirmButton.addClass("mod-cta");
                confirmButton.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
                    modal.close();
                    // Apply the selected theme's task statuses
                    try {
                        // Get the function based on the selected theme
                        const functionName = value.toLowerCase() + "SupportedStatuses";
                        // Use type assertion for the dynamic function access
                        const getStatuses = taskStatusModule[functionName];
                        if (typeof getStatuses === "function") {
                            const statuses = getStatuses();
                            // Update cycle and marks
                            const cycle = settingTab.plugin.settings.taskStatusCycle;
                            const marks = settingTab.plugin.settings.taskStatusMarks;
                            const excludeMarks = settingTab.plugin.settings
                                .excludeMarksFromCycle;
                            // Clear existing cycle, marks and excludeMarks
                            cycle.length = 0;
                            Object.keys(marks).forEach((key) => delete marks[key]);
                            excludeMarks.length = 0;
                            // Add new statuses to cycle and marks
                            for (const [symbol, name, type] of statuses) {
                                const realName = name
                                    .split("/")[0]
                                    .trim();
                                // Add to cycle if not already included
                                if (!cycle.includes(realName)) {
                                    cycle.push(realName);
                                }
                                // Add to marks
                                marks[realName] = symbol;
                                // Add to excludeMarks if not space or x
                                if (symbol !== " " && symbol !== "x") {
                                    excludeMarks.push(realName);
                                }
                            }
                            // Also update the main taskStatuses object based on the theme
                            const statusMap = {
                                completed: [],
                                inProgress: [],
                                abandoned: [],
                                notStarted: [],
                                planned: [],
                            };
                            for (const [symbol, _, type] of statuses) {
                                if (type in statusMap) {
                                    statusMap[type].push(symbol);
                                }
                            }
                            // Corrected loop and assignment for TaskStatusConfig here too
                            for (const type of Object.keys(statusMap)) {
                                if (type in
                                    settingTab.plugin.settings
                                        .taskStatuses &&
                                    statusMap[type] &&
                                    statusMap[type].length > 0) {
                                    settingTab.plugin.settings.taskStatuses[type] = statusMap[type].join("|");
                                }
                            }
                            // Save settings and refresh the display
                            settingTab.applySettingsUpdate();
                            settingTab.display();
                        }
                    }
                    catch (error) {
                        console.error("Failed to apply checkbox status theme:", error);
                    }
                }));
                modal.open();
            }));
        });
        // Create a container for the task states list
        const taskStatesContainer = containerEl.createDiv({
            cls: "task-states-container",
        });
        // Function to refresh the task states list
        const refreshTaskStatesList = () => {
            // Clear the container
            taskStatesContainer.empty();
            // Get current cycle and marks
            const cycle = settingTab.plugin.settings.taskStatusCycle;
            const marks = settingTab.plugin.settings.taskStatusMarks;
            // Initialize excludeMarksFromCycle if it doesn't exist
            if (!settingTab.plugin.settings.excludeMarksFromCycle) {
                settingTab.plugin.settings.excludeMarksFromCycle = [];
            }
            // Add each status in the cycle
            cycle.forEach((state, index) => {
                const stateRow = taskStatesContainer.createDiv({
                    cls: "task-state-row",
                });
                // Create the setting
                const stateSetting = new Setting(stateRow)
                    .setName(`Status #${index + 1}`)
                    .addText((text) => {
                    text.setValue(state)
                        .setPlaceholder(t("Status name"))
                        .onChange((value) => {
                        // Update the state name in both cycle and marks
                        const oldState = cycle[index];
                        cycle[index] = value;
                        // If the old state had a mark, preserve it with the new name
                        if (oldState in marks) {
                            marks[value] = marks[oldState];
                            delete marks[oldState];
                        }
                        settingTab.applySettingsUpdate();
                    });
                })
                    .addText((text) => {
                    text.setValue(marks[state] || " ")
                        .setPlaceholder("Mark")
                        .onChange((value) => {
                        // Only use the first character
                        const mark = value.trim().charAt(0) || " ";
                        marks[state] = mark;
                        settingTab.applySettingsUpdate();
                    });
                    text.inputEl.maxLength = 1;
                    text.inputEl.style.width = "40px";
                });
                // Add toggle for including in cycle
                stateSetting.addToggle((toggle) => {
                    toggle
                        .setTooltip(t("Include in cycle"))
                        .setValue(!settingTab.plugin.settings.excludeMarksFromCycle.includes(state))
                        .onChange((value) => {
                        if (!value) {
                            // Add to exclude list if not already there
                            if (!settingTab.plugin.settings.excludeMarksFromCycle.includes(state)) {
                                settingTab.plugin.settings.excludeMarksFromCycle.push(state);
                            }
                        }
                        else {
                            // Remove from exclude list
                            settingTab.plugin.settings.excludeMarksFromCycle =
                                settingTab.plugin.settings.excludeMarksFromCycle.filter((s) => s !== state);
                        }
                        settingTab.applySettingsUpdate();
                    });
                });
                // Add buttons for moving up/down and removing
                stateSetting.addExtraButton((button) => {
                    button
                        .setIcon("arrow-up")
                        .setTooltip(t("Move up"))
                        .onClick(() => {
                        if (index > 0) {
                            // Swap with the previous item
                            [cycle[index - 1], cycle[index]] = [
                                cycle[index],
                                cycle[index - 1],
                            ];
                            settingTab.applySettingsUpdate();
                            refreshTaskStatesList();
                        }
                    });
                    button.extraSettingsEl.style.marginRight = "0";
                });
                stateSetting.addExtraButton((button) => {
                    button
                        .setIcon("arrow-down")
                        .setTooltip(t("Move down"))
                        .onClick(() => {
                        if (index < cycle.length - 1) {
                            // Swap with the next item
                            [cycle[index], cycle[index + 1]] = [
                                cycle[index + 1],
                                cycle[index],
                            ];
                            settingTab.applySettingsUpdate();
                            refreshTaskStatesList();
                        }
                    });
                    button.extraSettingsEl.style.marginRight = "0";
                });
                stateSetting.addExtraButton((button) => {
                    button
                        .setIcon("trash")
                        .setTooltip(t("Remove"))
                        .onClick(() => {
                        // Remove from cycle
                        cycle.splice(index, 1);
                        delete marks[state];
                        settingTab.applySettingsUpdate();
                        refreshTaskStatesList();
                    });
                    button.extraSettingsEl.style.marginRight = "0";
                });
            });
            // Add button to add new status
            const addButtonContainer = taskStatesContainer.createDiv();
            new Setting(addButtonContainer).addButton((button) => {
                button
                    .setButtonText(t("Add Status"))
                    .setCta()
                    .onClick(() => {
                    // Add a new status to the cycle with a default mark
                    const newStatus = `STATUS_${cycle.length + 1}`;
                    cycle.push(newStatus);
                    marks[newStatus] = " ";
                    settingTab.applySettingsUpdate();
                    refreshTaskStatesList();
                });
            });
        };
        // Initial render of the task states list
        refreshTaskStatesList();
    }
    // Auto Date Manager Settings
    new Setting(containerEl)
        .setName(t("Auto Date Manager"))
        .setDesc(t("Automatically manage dates based on checkbox status changes"))
        .setHeading();
    new Setting(containerEl)
        .setName(t("Enable auto date manager"))
        .setDesc(t("Toggle this to enable automatic date management when checkbox status changes. Dates will be added/removed based on your preferred metadata format (Tasks emoji format or Dataview format)."))
        .addToggle((toggle) => toggle
        .setValue(settingTab.plugin.settings.autoDateManager.enabled)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        settingTab.plugin.settings.autoDateManager.enabled = value;
        settingTab.applySettingsUpdate();
        setTimeout(() => {
            settingTab.display();
        }, 200);
    })));
    if (settingTab.plugin.settings.autoDateManager.enabled) {
        new Setting(containerEl)
            .setName(t("Manage completion dates"))
            .setDesc(t("Automatically add completion dates when tasks are marked as completed, and remove them when changed to other statuses."))
            .addToggle((toggle) => toggle
            .setValue(settingTab.plugin.settings.autoDateManager
            .manageCompletedDate)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.autoDateManager.manageCompletedDate =
                value;
            settingTab.applySettingsUpdate();
        })));
        new Setting(containerEl)
            .setName(t("Manage start dates"))
            .setDesc(t("Automatically add start dates when tasks are marked as in progress, and remove them when changed to other statuses."))
            .addToggle((toggle) => toggle
            .setValue(settingTab.plugin.settings.autoDateManager
            .manageStartDate)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.autoDateManager.manageStartDate =
                value;
            settingTab.applySettingsUpdate();
        })));
        new Setting(containerEl)
            .setName(t("Manage cancelled dates"))
            .setDesc(t("Automatically add cancelled dates when tasks are marked as abandoned, and remove them when changed to other statuses."))
            .addToggle((toggle) => toggle
            .setValue(settingTab.plugin.settings.autoDateManager
            .manageCancelledDate)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.autoDateManager.manageCancelledDate =
                value;
            settingTab.applySettingsUpdate();
        })));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGFza1N0YXR1c1NldHRpbmdzVGFiLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiVGFza1N0YXR1c1NldHRpbmdzVGFiLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDbkQsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzFDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBRTVELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFDdEMsT0FBTyxFQUNOLGdCQUFnQixHQUVoQixNQUFNLDZCQUE2QixDQUFDO0FBQ3JDLE9BQU8sS0FBSyxnQkFBZ0IsTUFBTSxzQkFBc0IsQ0FBQztBQUV6RCxNQUFNLFVBQVUsMkJBQTJCLENBQzFDLFVBQXFDLEVBQ3JDLFdBQXdCO0lBRXhCLElBQUksT0FBTyxDQUFDLFdBQVcsQ0FBQztTQUN0QixPQUFPLENBQUMsQ0FBQyxDQUFDLDBCQUEwQixDQUFDLENBQUM7U0FDdEMsT0FBTyxDQUFDLENBQUMsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO1NBQ2hELFVBQVUsRUFBRSxDQUFDO0lBRWYsb0VBQW9FO0lBQ3BFLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDaEQsSUFBSSxRQUFRLEVBQUU7UUFDYixNQUFNLGFBQWEsR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFDO1lBQzNDLEdBQUcsRUFBRSw2QkFBNkI7U0FDbEMsQ0FBQyxDQUFDO1FBRUgsYUFBYSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUU7WUFDN0IsR0FBRyxFQUFFLG9CQUFvQjtZQUN6QixJQUFJLEVBQUUsSUFBSTtTQUNWLENBQUMsQ0FBQztRQUVILE1BQU0sY0FBYyxHQUFHLGFBQWEsQ0FBQyxTQUFTLENBQUM7WUFDOUMsR0FBRyxF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b3J0IHsgTW9kYWwsIHNldEljb24sIFNldHRpbmcgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHsgYWxsU3RhdHVzQ29sbGVjdGlvbnMgfSBmcm9tIFwiQC9jb21tb24vdGFzay1zdGF0dXNcIjtcclxuaW1wb3J0IHsgVGFza1Byb2dyZXNzQmFyU2V0dGluZ1RhYiB9IGZyb20gXCJAL3NldHRpbmdcIjtcclxuaW1wb3J0IHsgZ2V0VGFza3NBUEkgfSBmcm9tIFwiQC91dGlsc1wiO1xyXG5pbXBvcnQge1xyXG5cdERFRkFVTFRfU0VUVElOR1MsXHJcblx0VGFza1N0YXR1c0NvbmZpZyxcclxufSBmcm9tIFwiQC9jb21tb24vc2V0dGluZy1kZWZpbml0aW9uXCI7XHJcbmltcG9ydCAqIGFzIHRhc2tTdGF0dXNNb2R1bGUgZnJvbSBcIkAvY29tbW9uL3Rhc2stc3RhdHVzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyVGFza1N0YXR1c1NldHRpbmdzVGFiKFxyXG5cdHNldHRpbmdUYWI6IFRhc2tQcm9ncmVzc0JhclNldHRpbmdUYWIsXHJcblx0Y29udGFpbmVyRWw6IEhUTUxFbGVtZW50XHJcbikge1xyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIkNoZWNrYm94IFN0YXR1cyBTZXR0aW5nc1wiKSlcclxuXHRcdC5zZXREZXNjKHQoXCJDb25maWd1cmUgY2hlY2tib3ggc3RhdHVzIHNldHRpbmdzXCIpKVxyXG5cdFx0LnNldEhlYWRpbmcoKTtcclxuXHJcblx0Ly8gQ2hlY2sgaWYgVGFza3MgcGx1Z2luIGlzIGluc3RhbGxlZCBhbmQgc2hvdyBjb21wYXRpYmlsaXR5IHdhcm5pbmdcclxuXHRjb25zdCB0YXNrc0FQSSA9IGdldFRhc2tzQVBJKHNldHRpbmdUYWIucGx1Z2luKTtcclxuXHRpZiAodGFza3NBUEkpIHtcclxuXHRcdGNvbnN0IHdhcm5pbmdCYW5uZXIgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwidGFza3MtY29tcGF0aWJpbGl0eS13YXJuaW5nXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHR3YXJuaW5nQmFubmVyLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0Y2xzOiBcInRhc2tzLXdhcm5pbmctaWNvblwiLFxyXG5cdFx0XHR0ZXh0OiBcIuKaoO+4j1wiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3Qgd2FybmluZ0NvbnRlbnQgPSB3YXJuaW5nQmFubmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ0YXNrcy13YXJuaW5nLWNvbnRlbnRcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdHdhcm5pbmdDb250ZW50LmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0Y2xzOiBcInRhc2tzLXdhcm5pbmctdGl0bGVcIixcclxuXHRcdFx0dGV4dDogdChcIlRhc2tzIFBsdWdpbiBEZXRlY3RlZFwiKSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IHdhcm5pbmdUZXh0ID0gd2FybmluZ0NvbnRlbnQuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHRjbHM6IFwidGFza3Mtd2FybmluZy10ZXh0XCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHR3YXJuaW5nVGV4dC5jcmVhdGVFbChcInNwYW5cIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFxyXG5cdFx0XHRcdFwiQ3VycmVudCBzdGF0dXMgbWFuYWdlbWVudCBhbmQgZGF0ZSBtYW5hZ2VtZW50IG1heSBjb25mbGljdCB3aXRoIHRoZSBUYXNrcyBwbHVnaW4uIFBsZWFzZSBjaGVjayB0aGUgXCJcclxuXHRcdFx0KSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IGNvbXBhdGliaWxpdHlMaW5rID0gd2FybmluZ1RleHQuY3JlYXRlRWwoXCJhXCIsIHtcclxuXHRcdFx0dGV4dDogdChcImNvbXBhdGliaWxpdHkgZG9jdW1lbnRhdGlvblwiKSxcclxuXHRcdFx0aHJlZjogXCJodHRwczovL3Rhc2tnZW5pdXMubWQvZG9jcy9jb21wYXRpYmlsaXR5XCIsXHJcblx0XHR9KTtcclxuXHRcdGNvbXBhdGliaWxpdHlMaW5rLnNldEF0dHJpYnV0ZShcInRhcmdldFwiLCBcIl9ibGFua1wiKTtcclxuXHRcdGNvbXBhdGliaWxpdHlMaW5rLnNldEF0dHJpYnV0ZShcInJlbFwiLCBcIm5vb3BlbmVyIG5vcmVmZXJyZXJcIik7XHJcblxyXG5cdFx0d2FybmluZ1RleHQuY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdFx0dGV4dDogdChcIiBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cIiksXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIkF1dG8gY29tcGxldGUgcGFyZW50IGNoZWNrYm94XCIpKVxyXG5cdFx0LnNldERlc2MoXHJcblx0XHRcdHQoXHJcblx0XHRcdFx0XCJUb2dnbGUgdGhpcyB0byBhbGxvdyB0aGlzIHBsdWdpbiB0byBhdXRvIGNvbXBsZXRlIHBhcmVudCBjaGVja2JveCB3aGVuIGFsbCBjaGlsZCB0YXNrcyBhcmUgY29tcGxldGVkLlwiXHJcblx0XHRcdClcclxuXHRcdClcclxuXHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT5cclxuXHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0LnNldFZhbHVlKHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmF1dG9Db21wbGV0ZVBhcmVudClcclxuXHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5hdXRvQ29tcGxldGVQYXJlbnQgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdH0pXHJcblx0XHQpO1xyXG5cclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJNYXJrIHBhcmVudCBhcyAnSW4gUHJvZ3Jlc3MnIHdoZW4gcGFydGlhbGx5IGNvbXBsZXRlXCIpKVxyXG5cdFx0LnNldERlc2MoXHJcblx0XHRcdHQoXHJcblx0XHRcdFx0XCJXaGVuIHNvbWUgYnV0IG5vdCBhbGwgY2hpbGQgdGFza3MgYXJlIGNvbXBsZXRlZCwgbWFyayB0aGUgcGFyZW50IGNoZWNrYm94IGFzICdJbiBQcm9ncmVzcycuIE9ubHkgd29ya3Mgd2hlbiAnQXV0byBjb21wbGV0ZSBwYXJlbnQnIGlzIGVuYWJsZWQuXCJcclxuXHRcdFx0KVxyXG5cdFx0KVxyXG5cdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxyXG5cdFx0XHR0b2dnbGVcclxuXHRcdFx0XHQuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5nc1xyXG5cdFx0XHRcdFx0XHQubWFya1BhcmVudEluUHJvZ3Jlc3NXaGVuUGFydGlhbGx5Q29tcGxldGVcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MubWFya1BhcmVudEluUHJvZ3Jlc3NXaGVuUGFydGlhbGx5Q29tcGxldGUgPVxyXG5cdFx0XHRcdFx0XHR2YWx1ZTtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdH0pXHJcblx0XHQpO1xyXG5cclxuXHQvLyBDaGVja2JveCBTdGF0dXMgU2V0dGluZ3NcclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJDaGVja2JveCBTdGF0dXMgU2V0dGluZ3NcIikpXHJcblx0XHQuc2V0RGVzYyhcclxuXHRcdFx0dChcclxuXHRcdFx0XHRcIlNlbGVjdCBhIHByZWRlZmluZWQgY2hlY2tib3ggc3RhdHVzIGNvbGxlY3Rpb24gb3IgY3VzdG9taXplIHlvdXIgb3duXCJcclxuXHRcdFx0KVxyXG5cdFx0KVxyXG5cdFx0LnNldEhlYWRpbmcoKVxyXG5cdFx0LmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xyXG5cdFx0XHRkcm9wZG93bi5hZGRPcHRpb24oXCJjdXN0b21cIiwgXCJDdXN0b21cIik7XHJcblx0XHRcdGZvciAoY29uc3Qgc3RhdHVzQ29sbGVjdGlvbiBvZiBhbGxTdGF0dXNDb2xsZWN0aW9ucykge1xyXG5cdFx0XHRcdGRyb3Bkb3duLmFkZE9wdGlvbihzdGF0dXNDb2xsZWN0aW9uLCBzdGF0dXNDb2xsZWN0aW9uKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gU2V0IGRlZmF1bHQgdmFsdWUgdG8gY3VzdG9tXHJcblx0XHRcdGRyb3Bkb3duLnNldFZhbHVlKFwiY3VzdG9tXCIpO1xyXG5cclxuXHRcdFx0ZHJvcGRvd24ub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0aWYgKHZhbHVlID09PSBcImN1c3RvbVwiKSB7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBDb25maXJtIGJlZm9yZSBhcHBseWluZyB0aGUgdGhlbWVcclxuXHRcdFx0XHRjb25zdCBtb2RhbCA9IG5ldyBNb2RhbChzZXR0aW5nVGFiLmFwcCk7XHJcblx0XHRcdFx0bW9kYWwudGl0bGVFbC5zZXRUZXh0KGBBcHBseSAke3ZhbHVlfSBUaGVtZT9gKTtcclxuXHJcblx0XHRcdFx0Y29uc3QgY29udGVudCA9IG1vZGFsLmNvbnRlbnRFbC5jcmVhdGVEaXYoKTtcclxuXHRcdFx0XHRjb250ZW50LnNldFRleHQoXHJcblx0XHRcdFx0XHRgVGhpcyB3aWxsIG92ZXJyaWRlIHlvdXIgY3VycmVudCBjaGVja2JveCBzdGF0dXMgc2V0dGluZ3Mgd2l0aCB0aGUgJHt2YWx1ZX0gdGhlbWUuIERvIHlvdSB3YW50IHRvIGNvbnRpbnVlP2BcclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRjb25zdCBidXR0b25Db250YWluZXIgPSBtb2RhbC5jb250ZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRcdGNsczogXCJ0Zy1tb2RhbC1idXR0b24tY29udGFpbmVyIG1vZGFsLWJ1dHRvbi1jb250YWluZXJcIixcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Y29uc3QgY2FuY2VsQnV0dG9uID0gYnV0dG9uQ29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIpO1xyXG5cdFx0XHRcdGNhbmNlbEJ1dHRvbi5zZXRUZXh0KHQoXCJDYW5jZWxcIikpO1xyXG5cdFx0XHRcdGNhbmNlbEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0ZHJvcGRvd24uc2V0VmFsdWUoXCJjdXN0b21cIik7XHJcblx0XHRcdFx0XHRtb2RhbC5jbG9zZSgpO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRjb25zdCBjb25maXJtQnV0dG9uID0gYnV0dG9uQ29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIpO1xyXG5cdFx0XHRcdGNvbmZpcm1CdXR0b24uc2V0VGV4dCh0KFwiQXBwbHkgVGhlbWVcIikpO1xyXG5cdFx0XHRcdGNvbmZpcm1CdXR0b24uYWRkQ2xhc3MoXCJtb2QtY3RhXCIpO1xyXG5cdFx0XHRcdGNvbmZpcm1CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0XHRcdG1vZGFsLmNsb3NlKCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gQXBwbHkgdGhlIHNlbGVjdGVkIHRoZW1lJ3MgdGFzayBzdGF0dXNlc1xyXG5cdFx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdFx0Ly8gR2V0IHRoZSBmdW5jdGlvbiBiYXNlZCBvbiB0aGUgc2VsZWN0ZWQgdGhlbWVcclxuXHRcdFx0XHRcdFx0Y29uc3QgZnVuY3Rpb25OYW1lID1cclxuXHRcdFx0XHRcdFx0XHR2YWx1ZS50b0xvd2VyQ2FzZSgpICsgXCJTdXBwb3J0ZWRTdGF0dXNlc1wiO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gVXNlIHR5cGUgYXNzZXJ0aW9uIGZvciB0aGUgZHluYW1pYyBmdW5jdGlvbiBhY2Nlc3NcclxuXHRcdFx0XHRcdFx0Y29uc3QgZ2V0U3RhdHVzZXMgPSAodGFza1N0YXR1c01vZHVsZSBhcyBhbnkpW1xyXG5cdFx0XHRcdFx0XHRcdGZ1bmN0aW9uTmFtZVxyXG5cdFx0XHRcdFx0XHRdO1xyXG5cclxuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBnZXRTdGF0dXNlcyA9PT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3Qgc3RhdHVzZXMgPSBnZXRTdGF0dXNlcygpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyBVcGRhdGUgY3ljbGUgYW5kIG1hcmtzXHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgY3ljbGUgPVxyXG5cdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c0N5Y2xlO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IG1hcmtzID1cclxuXHRcdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnRhc2tTdGF0dXNNYXJrcztcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBleGNsdWRlTWFya3MgPVxyXG5cdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3NcclxuXHRcdFx0XHRcdFx0XHRcdFx0LmV4Y2x1ZGVNYXJrc0Zyb21DeWNsZTtcclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gQ2xlYXIgZXhpc3RpbmcgY3ljbGUsIG1hcmtzIGFuZCBleGNsdWRlTWFya3NcclxuXHRcdFx0XHRcdFx0XHRjeWNsZS5sZW5ndGggPSAwO1xyXG5cdFx0XHRcdFx0XHRcdE9iamVjdC5rZXlzKG1hcmtzKS5mb3JFYWNoKFxyXG5cdFx0XHRcdFx0XHRcdFx0KGtleSkgPT4gZGVsZXRlIG1hcmtzW2tleV1cclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdGV4Y2x1ZGVNYXJrcy5sZW5ndGggPSAwO1xyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyBBZGQgbmV3IHN0YXR1c2VzIHRvIGN5Y2xlIGFuZCBtYXJrc1xyXG5cdFx0XHRcdFx0XHRcdGZvciAoY29uc3QgW3N5bWJvbCwgbmFtZSwgdHlwZV0gb2Ygc3RhdHVzZXMpIHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IHJlYWxOYW1lID0gKG5hbWUgYXMgc3RyaW5nKVxyXG5cdFx0XHRcdFx0XHRcdFx0XHQuc3BsaXQoXCIvXCIpWzBdXHJcblx0XHRcdFx0XHRcdFx0XHRcdC50cmltKCk7XHJcblx0XHRcdFx0XHRcdFx0XHQvLyBBZGQgdG8gY3ljbGUgaWYgbm90IGFscmVhZHkgaW5jbHVkZWRcclxuXHRcdFx0XHRcdFx0XHRcdGlmICghY3ljbGUuaW5jbHVkZXMocmVhbE5hbWUpKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGN5Y2xlLnB1c2gocmVhbE5hbWUpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRcdC8vIEFkZCB0byBtYXJrc1xyXG5cdFx0XHRcdFx0XHRcdFx0bWFya3NbcmVhbE5hbWVdID0gc3ltYm9sO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdC8vIEFkZCB0byBleGNsdWRlTWFya3MgaWYgbm90IHNwYWNlIG9yIHhcclxuXHRcdFx0XHRcdFx0XHRcdGlmIChzeW1ib2wgIT09IFwiIFwiICYmIHN5bWJvbCAhPT0gXCJ4XCIpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0ZXhjbHVkZU1hcmtzLnB1c2gocmVhbE5hbWUpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gQWxzbyB1cGRhdGUgdGhlIG1haW4gdGFza1N0YXR1c2VzIG9iamVjdCBiYXNlZCBvbiB0aGUgdGhlbWVcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBzdGF0dXNNYXA6IFJlY29yZDxzdHJpbmcsIHN0cmluZ1tdPiA9IHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbXBsZXRlZDogW10sXHJcblx0XHRcdFx0XHRcdFx0XHRpblByb2dyZXNzOiBbXSxcclxuXHRcdFx0XHRcdFx0XHRcdGFiYW5kb25lZDogW10sXHJcblx0XHRcdFx0XHRcdFx0XHRub3RTdGFydGVkOiBbXSxcclxuXHRcdFx0XHRcdFx0XHRcdHBsYW5uZWQ6IFtdLFxyXG5cdFx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHRcdFx0Zm9yIChjb25zdCBbc3ltYm9sLCBfLCB0eXBlXSBvZiBzdGF0dXNlcykge1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKHR5cGUgaW4gc3RhdHVzTWFwKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHN0YXR1c01hcFtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0eXBlIGFzIGtleW9mIHR5cGVvZiBzdGF0dXNNYXBcclxuXHRcdFx0XHRcdFx0XHRcdFx0XS5wdXNoKHN5bWJvbCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdC8vIENvcnJlY3RlZCBsb29wIGFuZCBhc3NpZ25tZW50IGZvciBUYXNrU3RhdHVzQ29uZmlnIGhlcmUgdG9vXHJcblx0XHRcdFx0XHRcdFx0Zm9yIChjb25zdCB0eXBlIG9mIE9iamVjdC5rZXlzKHN0YXR1c01hcCkgYXMgQXJyYXk8XHJcblx0XHRcdFx0XHRcdFx0XHRrZXlvZiBUYXNrU3RhdHVzQ29uZmlnXHJcblx0XHRcdFx0XHRcdFx0Pikge1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR0eXBlIGluXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3NcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdC50YXNrU3RhdHVzZXMgJiZcclxuXHRcdFx0XHRcdFx0XHRcdFx0c3RhdHVzTWFwW3R5cGVdICYmXHJcblx0XHRcdFx0XHRcdFx0XHRcdHN0YXR1c01hcFt0eXBlXS5sZW5ndGggPiAwXHJcblx0XHRcdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c2VzW1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHR5cGVcclxuXHRcdFx0XHRcdFx0XHRcdFx0XSA9IHN0YXR1c01hcFt0eXBlXS5qb2luKFwifFwiKTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdC8vIFNhdmUgc2V0dGluZ3MgYW5kIHJlZnJlc2ggdGhlIGRpc3BsYXlcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmRpc3BsYXkoKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcclxuXHRcdFx0XHRcdFx0XHRcIkZhaWxlZCB0byBhcHBseSBjaGVja2JveCBzdGF0dXMgdGhlbWU6XCIsXHJcblx0XHRcdFx0XHRcdFx0ZXJyb3JcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0bW9kYWwub3BlbigpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRjb25zdCBjb21wbGV0ZUZyYWdtZW50ID0gY3JlYXRlRnJhZ21lbnQoKTtcclxuXHRjb21wbGV0ZUZyYWdtZW50LmNyZWF0ZUVsKFxyXG5cdFx0XCJzcGFuXCIsXHJcblx0XHR7XHJcblx0XHRcdGNsczogXCJ0Zy1zdGF0dXMtaWNvblwiLFxyXG5cdFx0fSxcclxuXHRcdChlbCkgPT4ge1xyXG5cdFx0XHRzZXRJY29uKGVsLCBcImNvbXBsZXRlZFwiKTtcclxuXHRcdH1cclxuXHQpO1xyXG5cclxuXHRjb21wbGV0ZUZyYWdtZW50LmNyZWF0ZUVsKFxyXG5cdFx0XCJzcGFuXCIsXHJcblx0XHR7XHJcblx0XHRcdGNsczogXCJ0Zy1zdGF0dXMtdGV4dFwiLFxyXG5cdFx0fSxcclxuXHRcdChlbCkgPT4ge1xyXG5cdFx0XHRlbC5zZXRUZXh0KHQoXCJDb21wbGV0ZWRcIikpO1xyXG5cdFx0fVxyXG5cdCk7XHJcblxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUoY29tcGxldGVGcmFnbWVudClcclxuXHRcdC5zZXREZXNjKFxyXG5cdFx0XHR0KFxyXG5cdFx0XHRcdCdDaGFyYWN0ZXJzIGluIHNxdWFyZSBicmFja2V0cyB0aGF0IHJlcHJlc2VudCBjb21wbGV0ZWQgdGFza3MuIEV4YW1wbGU6IFwieHxYXCInXHJcblx0XHRcdClcclxuXHRcdClcclxuXHRcdC5hZGRUZXh0KCh0ZXh0KSA9PlxyXG5cdFx0XHR0ZXh0XHJcblx0XHRcdFx0LnNldFBsYWNlaG9sZGVyKERFRkFVTFRfU0VUVElOR1MudGFza1N0YXR1c2VzLmNvbXBsZXRlZClcclxuXHRcdFx0XHQuc2V0VmFsdWUoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c2VzLmNvbXBsZXRlZClcclxuXHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy50YXNrU3RhdHVzZXMuY29tcGxldGVkID1cclxuXHRcdFx0XHRcdFx0dmFsdWUgfHwgREVGQVVMVF9TRVRUSU5HUy50YXNrU3RhdHVzZXMuY29tcGxldGVkO1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gVXBkYXRlIFRhc2sgR2VuaXVzIEljb24gTWFuYWdlclxyXG5cdFx0XHRcdFx0aWYgKHNldHRpbmdUYWIucGx1Z2luLnRhc2tHZW5pdXNJY29uTWFuYWdlcikge1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi50YXNrR2VuaXVzSWNvbk1hbmFnZXIudXBkYXRlKCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSlcclxuXHRcdCk7XHJcblxyXG5cdGNvbnN0IHBsYW5uZWRGcmFnbWVudCA9IGNyZWF0ZUZyYWdtZW50KCk7XHJcblx0cGxhbm5lZEZyYWdtZW50LmNyZWF0ZUVsKFxyXG5cdFx0XCJzcGFuXCIsXHJcblx0XHR7XHJcblx0XHRcdGNsczogXCJ0Zy1zdGF0dXMtaWNvblwiLFxyXG5cdFx0fSxcclxuXHRcdChlbCkgPT4ge1xyXG5cdFx0XHRzZXRJY29uKGVsLCBcInBsYW5uZWRcIik7XHJcblx0XHR9XHJcblx0KTtcclxuXHJcblx0cGxhbm5lZEZyYWdtZW50LmNyZWF0ZUVsKFxyXG5cdFx0XCJzcGFuXCIsXHJcblx0XHR7XHJcblx0XHRcdGNsczogXCJ0Zy1zdGF0dXMtdGV4dFwiLFxyXG5cdFx0fSxcclxuXHRcdChlbCkgPT4ge1xyXG5cdFx0XHRlbC5zZXRUZXh0KHQoXCJQbGFubmVkXCIpKTtcclxuXHRcdH1cclxuXHQpO1xyXG5cclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHBsYW5uZWRGcmFnbWVudClcclxuXHRcdC5zZXREZXNjKFxyXG5cdFx0XHR0KFxyXG5cdFx0XHRcdCdDaGFyYWN0ZXJzIGluIHNxdWFyZSBicmFja2V0cyB0aGF0IHJlcHJlc2VudCBwbGFubmVkIHRhc2tzLiBFeGFtcGxlOiBcIj9cIidcclxuXHRcdFx0KVxyXG5cdFx0KVxyXG5cdFx0LmFkZFRleHQoKHRleHQpID0+XHJcblx0XHRcdHRleHRcclxuXHRcdFx0XHQuc2V0UGxhY2Vob2xkZXIoREVGQVVMVF9TRVRUSU5HUy50YXNrU3RhdHVzZXMucGxhbm5lZClcclxuXHRcdFx0XHQuc2V0VmFsdWUoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c2VzLnBsYW5uZWQpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c2VzLnBsYW5uZWQgPVxyXG5cdFx0XHRcdFx0XHR2YWx1ZSB8fCBERUZBVUxUX1NFVFRJTkdTLnRhc2tTdGF0dXNlcy5wbGFubmVkO1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gVXBkYXRlIFRhc2sgR2VuaXVzIEljb24gTWFuYWdlclxyXG5cdFx0XHRcdFx0aWYgKHNldHRpbmdUYWIucGx1Z2luLnRhc2tHZW5pdXNJY29uTWFuYWdlcikge1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi50YXNrR2VuaXVzSWNvbk1hbmFnZXIudXBkYXRlKCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSlcclxuXHRcdCk7XHJcblxyXG5cdGNvbnN0IGluUHJvZ3Jlc3NGcmFnbWVudCA9IGNyZWF0ZUZyYWdtZW50KCk7XHJcblx0aW5Qcm9ncmVzc0ZyYWdtZW50LmNyZWF0ZUVsKFxyXG5cdFx0XCJzcGFuXCIsXHJcblx0XHR7XHJcblx0XHRcdGNsczogXCJ0Zy1zdGF0dXMtaWNvblwiLFxyXG5cdFx0fSxcclxuXHRcdChlbCkgPT4ge1xyXG5cdFx0XHRzZXRJY29uKGVsLCBcImluUHJvZ3Jlc3NcIik7XHJcblx0XHR9XHJcblx0KTtcclxuXHJcblx0aW5Qcm9ncmVzc0ZyYWdtZW50LmNyZWF0ZUVsKFxyXG5cdFx0XCJzcGFuXCIsXHJcblx0XHR7XHJcblx0XHRcdGNsczogXCJ0Zy1zdGF0dXMtdGV4dFwiLFxyXG5cdFx0fSxcclxuXHRcdChlbCkgPT4ge1xyXG5cdFx0XHRlbC5zZXRUZXh0KHQoXCJJbiBQcm9ncmVzc1wiKSk7XHJcblx0XHR9XHJcblx0KTtcclxuXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZShpblByb2dyZXNzRnJhZ21lbnQpXHJcblx0XHQuc2V0RGVzYyhcclxuXHRcdFx0dChcclxuXHRcdFx0XHQnQ2hhcmFjdGVycyBpbiBzcXVhcmUgYnJhY2tldHMgdGhhdCByZXByZXNlbnQgdGFza3MgaW4gcHJvZ3Jlc3MuIEV4YW1wbGU6IFwiPnwvXCInXHJcblx0XHRcdClcclxuXHRcdClcclxuXHRcdC5hZGRUZXh0KCh0ZXh0KSA9PlxyXG5cdFx0XHR0ZXh0XHJcblx0XHRcdFx0LnNldFBsYWNlaG9sZGVyKERFRkFVTFRfU0VUVElOR1MudGFza1N0YXR1c2VzLmluUHJvZ3Jlc3MpXHJcblx0XHRcdFx0LnNldFZhbHVlKHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnRhc2tTdGF0dXNlcy5pblByb2dyZXNzKVxyXG5cdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnRhc2tTdGF0dXNlcy5pblByb2dyZXNzID1cclxuXHRcdFx0XHRcdFx0dmFsdWUgfHwgREVGQVVMVF9TRVRUSU5HUy50YXNrU3RhdHVzZXMuaW5Qcm9ncmVzcztcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cclxuXHRcdFx0XHRcdC8vIFVwZGF0ZSBUYXNrIEdlbml1cyBJY29uIE1hbmFnZXJcclxuXHRcdFx0XHRcdGlmIChzZXR0aW5nVGFiLnBsdWdpbi50YXNrR2VuaXVzSWNvbk1hbmFnZXIpIHtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4udGFza0dlbml1c0ljb25NYW5hZ2VyLnVwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pXHJcblx0XHQpO1xyXG5cclxuXHRjb25zdCBhYmFuZG9uZWRGcmFnbWVudCA9IGNyZWF0ZUZyYWdtZW50KCk7XHJcblxyXG5cdGFiYW5kb25lZEZyYWdtZW50LmNyZWF0ZUVsKFxyXG5cdFx0XCJzcGFuXCIsXHJcblx0XHR7XHJcblx0XHRcdGNsczogXCJ0Zy1zdGF0dXMtaWNvblwiLFxyXG5cdFx0fSxcclxuXHRcdChlbCkgPT4ge1xyXG5cdFx0XHRzZXRJY29uKGVsLCBcImFiYW5kb25lZFwiKTtcclxuXHRcdH1cclxuXHQpO1xyXG5cclxuXHRhYmFuZG9uZWRGcmFnbWVudC5jcmVhdGVFbChcclxuXHRcdFwic3BhblwiLFxyXG5cdFx0e1xyXG5cdFx0XHRjbHM6IFwidGctc3RhdHVzLXRleHRcIixcclxuXHRcdH0sXHJcblx0XHQoZWwpID0+IHtcclxuXHRcdFx0ZWwuc2V0VGV4dCh0KFwiQWJhbmRvbmVkXCIpKTtcclxuXHRcdH1cclxuXHQpO1xyXG5cclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKGFiYW5kb25lZEZyYWdtZW50KVxyXG5cdFx0LnNldERlc2MoXHJcblx0XHRcdHQoXHJcblx0XHRcdFx0J0NoYXJhY3RlcnMgaW4gc3F1YXJlIGJyYWNrZXRzIHRoYXQgcmVwcmVzZW50IGFiYW5kb25lZCB0YXNrcy4gRXhhbXBsZTogXCItXCInXHJcblx0XHRcdClcclxuXHRcdClcclxuXHRcdC5hZGRUZXh0KCh0ZXh0KSA9PlxyXG5cdFx0XHR0ZXh0XHJcblx0XHRcdFx0LnNldFBsYWNlaG9sZGVyKERFRkFVTFRfU0VUVElOR1MudGFza1N0YXR1c2VzLmFiYW5kb25lZClcclxuXHRcdFx0XHQuc2V0VmFsdWUoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c2VzLmFiYW5kb25lZClcclxuXHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy50YXNrU3RhdHVzZXMuYWJhbmRvbmVkID1cclxuXHRcdFx0XHRcdFx0dmFsdWUgfHwgREVGQVVMVF9TRVRUSU5HUy50YXNrU3RhdHVzZXMuYWJhbmRvbmVkO1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gVXBkYXRlIFRhc2sgR2VuaXVzIEljb24gTWFuYWdlclxyXG5cdFx0XHRcdFx0aWYgKHNldHRpbmdUYWIucGx1Z2luLnRhc2tHZW5pdXNJY29uTWFuYWdlcikge1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi50YXNrR2VuaXVzSWNvbk1hbmFnZXIudXBkYXRlKCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSlcclxuXHRcdCk7XHJcblxyXG5cdGNvbnN0IG5vdFN0YXJ0ZWRGcmFnbWVudCA9IGNyZWF0ZUZyYWdtZW50KCk7XHJcblxyXG5cdG5vdFN0YXJ0ZWRGcmFnbWVudC5jcmVhdGVFbChcclxuXHRcdFwic3BhblwiLFxyXG5cdFx0e1xyXG5cdFx0XHRjbHM6IFwidGctc3RhdHVzLWljb25cIixcclxuXHRcdH0sXHJcblx0XHQoZWwpID0+IHtcclxuXHRcdFx0c2V0SWNvbihlbCwgXCJub3RTdGFydGVkXCIpO1xyXG5cdFx0fVxyXG5cdCk7XHJcblxyXG5cdG5vdFN0YXJ0ZWRGcmFnbWVudC5jcmVhdGVFbChcclxuXHRcdFwic3BhblwiLFxyXG5cdFx0e1xyXG5cdFx0XHRjbHM6IFwidGctc3RhdHVzLXRleHRcIixcclxuXHRcdH0sXHJcblx0XHQoZWwpID0+IHtcclxuXHRcdFx0ZWwuc2V0VGV4dCh0KFwiTm90IFN0YXJ0ZWRcIikpO1xyXG5cdFx0fVxyXG5cdCk7XHJcblxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUobm90U3RhcnRlZEZyYWdtZW50KVxyXG5cdFx0LnNldERlc2MoXHJcblx0XHRcdHQoXHJcblx0XHRcdFx0J0NoYXJhY3RlcnMgaW4gc3F1YXJlIGJyYWNrZXRzIHRoYXQgcmVwcmVzZW50IG5vdCBzdGFydGVkIHRhc2tzLiBEZWZhdWx0IGlzIHNwYWNlIFwiIFwiJ1xyXG5cdFx0XHQpXHJcblx0XHQpXHJcblx0XHQuYWRkVGV4dCgodGV4dCkgPT5cclxuXHRcdFx0dGV4dFxyXG5cdFx0XHRcdC5zZXRQbGFjZWhvbGRlcihERUZBVUxUX1NFVFRJTkdTLnRhc2tTdGF0dXNlcy5ub3RTdGFydGVkKVxyXG5cdFx0XHRcdC5zZXRWYWx1ZShzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy50YXNrU3RhdHVzZXMubm90U3RhcnRlZClcclxuXHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy50YXNrU3RhdHVzZXMubm90U3RhcnRlZCA9XHJcblx0XHRcdFx0XHRcdHZhbHVlIHx8IERFRkFVTFRfU0VUVElOR1MudGFza1N0YXR1c2VzLm5vdFN0YXJ0ZWQ7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHJcblx0XHRcdFx0XHQvLyBVcGRhdGUgVGFzayBHZW5pdXMgSWNvbiBNYW5hZ2VyXHJcblx0XHRcdFx0XHRpZiAoc2V0dGluZ1RhYi5wbHVnaW4udGFza0dlbml1c0ljb25NYW5hZ2VyKSB7XHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnRhc2tHZW5pdXNJY29uTWFuYWdlci51cGRhdGUoKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KVxyXG5cdFx0KTtcclxuXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiQ291bnQgb3RoZXIgc3RhdHVzZXMgYXNcIikpXHJcblx0XHQuc2V0RGVzYyhcclxuXHRcdFx0dChcclxuXHRcdFx0XHQnU2VsZWN0IHRoZSBzdGF0dXMgdG8gY291bnQgb3RoZXIgc3RhdHVzZXMgYXMuIERlZmF1bHQgaXMgXCJOb3QgU3RhcnRlZFwiLidcclxuXHRcdFx0KVxyXG5cdFx0KVxyXG5cdFx0LmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xyXG5cdFx0XHRkcm9wZG93bi5hZGRPcHRpb24oXCJub3RTdGFydGVkXCIsIFwiTm90IFN0YXJ0ZWRcIik7XHJcblx0XHRcdGRyb3Bkb3duLmFkZE9wdGlvbihcImFiYW5kb25lZFwiLCBcIkFiYW5kb25lZFwiKTtcclxuXHRcdFx0ZHJvcGRvd24uYWRkT3B0aW9uKFwicGxhbm5lZFwiLCBcIlBsYW5uZWRcIik7XHJcblx0XHRcdGRyb3Bkb3duLmFkZE9wdGlvbihcImNvbXBsZXRlZFwiLCBcIkNvbXBsZXRlZFwiKTtcclxuXHRcdFx0ZHJvcGRvd24uYWRkT3B0aW9uKFwiaW5Qcm9ncmVzc1wiLCBcIkluIFByb2dyZXNzXCIpO1xyXG5cdFx0XHRkcm9wZG93bi5zZXRWYWx1ZShcclxuXHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5jb3VudE90aGVyU3RhdHVzZXNBcyB8fCBcIm5vdFN0YXJ0ZWRcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRkcm9wZG93bi5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5jb3VudE90aGVyU3RhdHVzZXNBcyA9IHZhbHVlO1xyXG5cdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHQvLyBUYXNrIENvdW50aW5nIFNldHRpbmdzXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiVGFzayBDb3VudGluZyBTZXR0aW5nc1wiKSlcclxuXHRcdC5zZXREZXNjKHQoXCJDb25maWd1cmUgd2hpY2ggdGFzayBtYXJrZXJzIHRvIGNvdW50IG9yIGV4Y2x1ZGVcIikpXHJcblx0XHQuc2V0SGVhZGluZygpO1xyXG5cclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJFeGNsdWRlIHNwZWNpZmljIHRhc2sgbWFya2Vyc1wiKSlcclxuXHRcdC5zZXREZXNjKFxyXG5cdFx0XHR0KCdTcGVjaWZ5IHRhc2sgbWFya2VycyB0byBleGNsdWRlIGZyb20gY291bnRpbmcuIEV4YW1wbGU6IFwiP3wvXCInKVxyXG5cdFx0KVxyXG5cdFx0LmFkZFRleHQoKHRleHQpID0+XHJcblx0XHRcdHRleHRcclxuXHRcdFx0XHQuc2V0UGxhY2Vob2xkZXIoXCJcIilcclxuXHRcdFx0XHQuc2V0VmFsdWUoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZXhjbHVkZVRhc2tNYXJrcylcclxuXHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5leGNsdWRlVGFza01hcmtzID0gdmFsdWU7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHR9KVxyXG5cdFx0KTtcclxuXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiT25seSBjb3VudCBzcGVjaWZpYyB0YXNrIG1hcmtlcnNcIikpXHJcblx0XHQuc2V0RGVzYyh0KFwiVG9nZ2xlIHRoaXMgdG8gb25seSBjb3VudCBzcGVjaWZpYyB0YXNrIG1hcmtlcnNcIikpXHJcblx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+XHJcblx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdC5zZXRWYWx1ZShzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy51c2VPbmx5Q291bnRNYXJrcylcclxuXHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy51c2VPbmx5Q291bnRNYXJrcyA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblxyXG5cdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIuZGlzcGxheSgpO1xyXG5cdFx0XHRcdFx0fSwgMjAwKTtcclxuXHRcdFx0XHR9KVxyXG5cdFx0KTtcclxuXHJcblx0aWYgKHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnVzZU9ubHlDb3VudE1hcmtzKSB7XHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0LnNldE5hbWUodChcIlNwZWNpZmljIHRhc2sgbWFya2VycyB0byBjb3VudFwiKSlcclxuXHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0dCgnU3BlY2lmeSB3aGljaCB0YXNrIG1hcmtlcnMgdG8gY291bnQuIEV4YW1wbGU6IFwieHxYfD58L1wiJylcclxuXHRcdFx0KVxyXG5cdFx0XHQuYWRkVGV4dCgodGV4dCkgPT5cclxuXHRcdFx0XHR0ZXh0XHJcblx0XHRcdFx0XHQuc2V0UGxhY2Vob2xkZXIoREVGQVVMVF9TRVRUSU5HUy5vbmx5Q291bnRUYXNrTWFya3MpXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3Mub25seUNvdW50VGFza01hcmtzKVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRpZiAodmFsdWUubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3Mub25seUNvdW50VGFza01hcmtzID1cclxuXHRcdFx0XHRcdFx0XHRcdERFRkFVTFRfU0VUVElOR1Mub25seUNvdW50VGFza01hcmtzO1xyXG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLm9ubHlDb3VudFRhc2tNYXJrcyA9XHJcblx0XHRcdFx0XHRcdFx0XHR2YWx1ZTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdCk7XHJcblx0fVxyXG5cclxuXHQvLyBDaGVjayBTd2l0Y2hlciBzZWN0aW9uXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpLnNldE5hbWUodChcIkNoZWNrYm94IFN3aXRjaGVyXCIpKS5zZXRIZWFkaW5nKCk7XHJcblxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIkVuYWJsZSBjaGVja2JveCBzdGF0dXMgc3dpdGNoZXJcIikpXHJcblx0XHQuc2V0RGVzYyhcclxuXHRcdFx0dChcclxuXHRcdFx0XHRcIkVuYWJsZS9kaXNhYmxlIHRoZSBhYmlsaXR5IHRvIGN5Y2xlIHRocm91Z2ggdGFzayBzdGF0ZXMgYnkgY2xpY2tpbmcuXCJcclxuXHRcdFx0KVxyXG5cdFx0KVxyXG5cdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XHJcblx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdC5zZXRWYWx1ZShzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5lbmFibGVUYXNrU3RhdHVzU3dpdGNoZXIpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZW5hYmxlVGFza1N0YXR1c1N3aXRjaGVyID0gdmFsdWU7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHJcblx0XHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5kaXNwbGF5KCk7XHJcblx0XHRcdFx0XHR9LCAyMDApO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdGlmIChzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5lbmFibGVUYXNrU3RhdHVzU3dpdGNoZXIpIHtcclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiVGFzayBtYXJrIGRpc3BsYXkgc3R5bGVcIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcIkNob29zZSBob3cgdGFzayBtYXJrcyBhcmUgZGlzcGxheWVkOiBkZWZhdWx0IGNoZWNrYm94ZXMsIGN1c3RvbSB0ZXh0IG1hcmtzLCBvciBUYXNrIEdlbml1cyBpY29ucy5cIlxyXG5cdFx0XHRcdClcclxuXHRcdFx0KVxyXG5cdFx0XHQuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XHJcblx0XHRcdFx0ZHJvcGRvd24uYWRkT3B0aW9uKFwiZGVmYXVsdFwiLCB0KFwiRGVmYXVsdCBjaGVja2JveGVzXCIpKTtcclxuXHRcdFx0XHRkcm9wZG93bi5hZGRPcHRpb24oXCJ0ZXh0bWFya3NcIiwgdChcIkN1c3RvbSB0ZXh0IG1hcmtzXCIpKTtcclxuXHRcdFx0XHRkcm9wZG93bi5hZGRPcHRpb24oXCJpY29uc1wiLCB0KFwiVGFzayBHZW5pdXMgaWNvbnNcIikpO1xyXG5cclxuXHRcdFx0XHQvLyBEZXRlcm1pbmUgY3VycmVudCB2YWx1ZSBiYXNlZCBvbiBleGlzdGluZyBzZXR0aW5nc1xyXG5cdFx0XHRcdGxldCBjdXJyZW50VmFsdWUgPSBcImRlZmF1bHRcIjtcclxuXHRcdFx0XHRpZiAoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZW5hYmxlVGFza0dlbml1c0ljb25zKSB7XHJcblx0XHRcdFx0XHRjdXJyZW50VmFsdWUgPSBcImljb25zXCI7XHJcblx0XHRcdFx0fSBlbHNlIGlmIChzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5lbmFibGVDdXN0b21UYXNrTWFya3MpIHtcclxuXHRcdFx0XHRcdGN1cnJlbnRWYWx1ZSA9IFwidGV4dG1hcmtzXCI7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRkcm9wZG93bi5zZXRWYWx1ZShjdXJyZW50VmFsdWUpO1xyXG5cclxuXHRcdFx0XHRkcm9wZG93bi5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdC8vIFJlc2V0IGFsbCBvcHRpb25zIGZpcnN0XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5lbmFibGVDdXN0b21UYXNrTWFya3MgPSBmYWxzZTtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmVuYWJsZVRhc2tHZW5pdXNJY29ucyA9IGZhbHNlO1xyXG5cclxuXHRcdFx0XHRcdC8vIFNldCB0aGUgc2VsZWN0ZWQgb3B0aW9uXHJcblx0XHRcdFx0XHRpZiAodmFsdWUgPT09IFwidGV4dG1hcmtzXCIpIHtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZW5hYmxlQ3VzdG9tVGFza01hcmtzID0gdHJ1ZTtcclxuXHRcdFx0XHRcdH0gZWxzZSBpZiAodmFsdWUgPT09IFwiaWNvbnNcIikge1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5lbmFibGVUYXNrR2VuaXVzSWNvbnMgPSB0cnVlO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cclxuXHRcdFx0XHRcdC8vIFVwZGF0ZSBUYXNrIEdlbml1cyBJY29uIE1hbmFnZXJcclxuXHRcdFx0XHRcdGlmIChzZXR0aW5nVGFiLnBsdWdpbi50YXNrR2VuaXVzSWNvbk1hbmFnZXIpIHtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4udGFza0dlbml1c0ljb25NYW5hZ2VyLnVwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIFJlZnJlc2ggZGlzcGxheSB0byBzaG93L2hpZGUgZGVwZW5kZW50IG9wdGlvbnNcclxuXHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmRpc3BsYXkoKTtcclxuXHRcdFx0XHRcdH0sIDIwMCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdC8vIFNob3cgdGV4dCBtYXJrIHNvdXJjZSBtb2RlIG9wdGlvbiBvbmx5IHdoZW4gY3VzdG9tIHRleHQgbWFya3MgYXJlIGVuYWJsZWRcclxuXHRcdGlmIChzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5lbmFibGVDdXN0b21UYXNrTWFya3MpIHtcclxuXHRcdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdFx0LnNldE5hbWUodChcIkVuYWJsZSB0ZXh0IG1hcmsgaW4gc291cmNlIG1vZGVcIikpXHJcblx0XHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XHRcIk1ha2UgdGhlIHRleHQgbWFyayBpbiBzb3VyY2UgbW9kZSBmb2xsb3cgdGhlIGNoZWNrYm94IHN0YXR1cyBjeWNsZSB3aGVuIGNsaWNrZWQuXCJcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XHJcblx0XHRcdFx0XHR0b2dnbGVcclxuXHRcdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzXHJcblx0XHRcdFx0XHRcdFx0XHQuZW5hYmxlVGV4dE1hcmtJblNvdXJjZU1vZGVcclxuXHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZW5hYmxlVGV4dE1hcmtJblNvdXJjZU1vZGUgPVxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiRW5hYmxlIGN5Y2xlIGNvbXBsZXRlIHN0YXR1c1wiKSlcclxuXHRcdC5zZXREZXNjKFxyXG5cdFx0XHR0KFxyXG5cdFx0XHRcdFwiRW5hYmxlL2Rpc2FibGUgdGhlIGFiaWxpdHkgdG8gYXV0b21hdGljYWxseSBjeWNsZSB0aHJvdWdoIHRhc2sgc3RhdGVzIHdoZW4gcHJlc3NpbmcgYSBtYXJrLlwiXHJcblx0XHRcdClcclxuXHRcdClcclxuXHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xyXG5cdFx0XHR0b2dnbGVcclxuXHRcdFx0XHQuc2V0VmFsdWUoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZW5hYmxlQ3ljbGVDb21wbGV0ZVN0YXR1cylcclxuXHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5lbmFibGVDeWNsZUNvbXBsZXRlU3RhdHVzID1cclxuXHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHJcblx0XHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5kaXNwbGF5KCk7XHJcblx0XHRcdFx0XHR9LCAyMDApO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdGlmIChzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5lbmFibGVDeWNsZUNvbXBsZXRlU3RhdHVzKSB7XHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0LnNldE5hbWUodChcIlRhc2sgc3RhdHVzIGN5Y2xlIGFuZCBtYXJrc1wiKSlcclxuXHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFwiRGVmaW5lIHRhc2sgc3RhdGVzIGFuZCB0aGVpciBjb3JyZXNwb25kaW5nIG1hcmtzLiBUaGUgb3JkZXIgZnJvbSB0b3AgdG8gYm90dG9tIGRlZmluZXMgdGhlIGN5Y2xpbmcgc2VxdWVuY2UuXCJcclxuXHRcdFx0XHQpXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xyXG5cdFx0XHRcdGRyb3Bkb3duLmFkZE9wdGlvbihcImN1c3RvbVwiLCBcIkN1c3RvbVwiKTtcclxuXHRcdFx0XHRmb3IgKGNvbnN0IHN0YXR1c0NvbGxlY3Rpb24gb2YgYWxsU3RhdHVzQ29sbGVjdGlvbnMpIHtcclxuXHRcdFx0XHRcdGRyb3Bkb3duLmFkZE9wdGlvbihzdGF0dXNDb2xsZWN0aW9uLCBzdGF0dXNDb2xsZWN0aW9uKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIFNldCBkZWZhdWx0IHZhbHVlIHRvIGN1c3RvbVxyXG5cdFx0XHRcdGRyb3Bkb3duLnNldFZhbHVlKFwiY3VzdG9tXCIpO1xyXG5cclxuXHRcdFx0XHRkcm9wZG93bi5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdGlmICh2YWx1ZSA9PT0gXCJjdXN0b21cIikge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gQ29uZmlybSBiZWZvcmUgYXBwbHlpbmcgdGhlIHRoZW1lXHJcblx0XHRcdFx0XHRjb25zdCBtb2RhbCA9IG5ldyBNb2RhbChzZXR0aW5nVGFiLmFwcCk7XHJcblx0XHRcdFx0XHRtb2RhbC50aXRsZUVsLnNldFRleHQoYEFwcGx5ICR7dmFsdWV9IFRoZW1lP2ApO1xyXG5cclxuXHRcdFx0XHRcdGNvbnN0IGNvbnRlbnQgPSBtb2RhbC5jb250ZW50RWwuY3JlYXRlRGl2KCk7XHJcblx0XHRcdFx0XHRjb250ZW50LnNldFRleHQoXHJcblx0XHRcdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcdFx0YFRoaXMgd2lsbCBvdmVycmlkZSB5b3VyIGN1cnJlbnQgY2hlY2tib3ggc3RhdHVzIHNldHRpbmdzIHdpdGggdGhlIHNlbGVjdGVkIHRoZW1lLiBEbyB5b3Ugd2FudCB0byBjb250aW51ZT9gXHJcblx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdFx0Y29uc3QgYnV0dG9uQ29udGFpbmVyID0gbW9kYWwuY29udGVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0XHRcdGNsczogXCJ0Zy1tb2RhbC1idXR0b24tY29udGFpbmVyIG1vZGFsLWJ1dHRvbi1jb250YWluZXJcIixcclxuXHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdGNvbnN0IGNhbmNlbEJ1dHRvbiA9IGJ1dHRvbkNvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiKTtcclxuXHRcdFx0XHRcdGNhbmNlbEJ1dHRvbi5zZXRUZXh0KHQoXCJDYW5jZWxcIikpO1xyXG5cdFx0XHRcdFx0Y2FuY2VsQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdGRyb3Bkb3duLnNldFZhbHVlKFwiY3VzdG9tXCIpO1xyXG5cdFx0XHRcdFx0XHRtb2RhbC5jbG9zZSgpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0Y29uc3QgY29uZmlybUJ1dHRvbiA9IGJ1dHRvbkNvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiKTtcclxuXHRcdFx0XHRcdGNvbmZpcm1CdXR0b24uc2V0VGV4dCh0KFwiQXBwbHkgVGhlbWVcIikpO1xyXG5cdFx0XHRcdFx0Y29uZmlybUJ1dHRvbi5hZGRDbGFzcyhcIm1vZC1jdGFcIik7XHJcblx0XHRcdFx0XHRjb25maXJtQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdG1vZGFsLmNsb3NlKCk7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBBcHBseSB0aGUgc2VsZWN0ZWQgdGhlbWUncyB0YXNrIHN0YXR1c2VzXHJcblx0XHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gR2V0IHRoZSBmdW5jdGlvbiBiYXNlZCBvbiB0aGUgc2VsZWN0ZWQgdGhlbWVcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBmdW5jdGlvbk5hbWUgPVxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWUudG9Mb3dlckNhc2UoKSArIFwiU3VwcG9ydGVkU3RhdHVzZXNcIjtcclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gVXNlIHR5cGUgYXNzZXJ0aW9uIGZvciB0aGUgZHluYW1pYyBmdW5jdGlvbiBhY2Nlc3NcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBnZXRTdGF0dXNlcyA9ICh0YXNrU3RhdHVzTW9kdWxlIGFzIGFueSlbXHJcblx0XHRcdFx0XHRcdFx0XHRmdW5jdGlvbk5hbWVcclxuXHRcdFx0XHRcdFx0XHRdO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRpZiAodHlwZW9mIGdldFN0YXR1c2VzID09PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IHN0YXR1c2VzID0gZ2V0U3RhdHVzZXMoKTtcclxuXHJcblx0XHRcdFx0XHRcdFx0XHQvLyBVcGRhdGUgY3ljbGUgYW5kIG1hcmtzXHJcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBjeWNsZSA9XHJcblx0XHRcdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnRhc2tTdGF0dXNDeWNsZTtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IG1hcmtzID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c01hcmtzO1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgZXhjbHVkZU1hcmtzID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3NcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQuZXhjbHVkZU1hcmtzRnJvbUN5Y2xlO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdC8vIENsZWFyIGV4aXN0aW5nIGN5Y2xlLCBtYXJrcyBhbmQgZXhjbHVkZU1hcmtzXHJcblx0XHRcdFx0XHRcdFx0XHRjeWNsZS5sZW5ndGggPSAwO1xyXG5cdFx0XHRcdFx0XHRcdFx0T2JqZWN0LmtleXMobWFya3MpLmZvckVhY2goXHJcblx0XHRcdFx0XHRcdFx0XHRcdChrZXkpID0+IGRlbGV0ZSBtYXJrc1trZXldXHJcblx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdFx0ZXhjbHVkZU1hcmtzLmxlbmd0aCA9IDA7XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0Ly8gQWRkIG5ldyBzdGF0dXNlcyB0byBjeWNsZSBhbmQgbWFya3NcclxuXHRcdFx0XHRcdFx0XHRcdGZvciAoY29uc3QgW3N5bWJvbCwgbmFtZSwgdHlwZV0gb2Ygc3RhdHVzZXMpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgcmVhbE5hbWUgPSAobmFtZSBhcyBzdHJpbmcpXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0LnNwbGl0KFwiL1wiKVswXVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdC50cmltKCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdC8vIEFkZCB0byBjeWNsZSBpZiBub3QgYWxyZWFkeSBpbmNsdWRlZFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoIWN5Y2xlLmluY2x1ZGVzKHJlYWxOYW1lKSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGN5Y2xlLnB1c2gocmVhbE5hbWUpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBBZGQgdG8gbWFya3NcclxuXHRcdFx0XHRcdFx0XHRcdFx0bWFya3NbcmVhbE5hbWVdID0gc3ltYm9sO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gQWRkIHRvIGV4Y2x1ZGVNYXJrcyBpZiBub3Qgc3BhY2Ugb3IgeFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoc3ltYm9sICE9PSBcIiBcIiAmJiBzeW1ib2wgIT09IFwieFwiKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZXhjbHVkZU1hcmtzLnB1c2gocmVhbE5hbWUpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0Ly8gQWxzbyB1cGRhdGUgdGhlIG1haW4gdGFza1N0YXR1c2VzIG9iamVjdCBiYXNlZCBvbiB0aGUgdGhlbWVcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IHN0YXR1c01hcDogUmVjb3JkPHN0cmluZywgc3RyaW5nW10+ID0ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRjb21wbGV0ZWQ6IFtdLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRpblByb2dyZXNzOiBbXSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0YWJhbmRvbmVkOiBbXSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0bm90U3RhcnRlZDogW10sXHJcblx0XHRcdFx0XHRcdFx0XHRcdHBsYW5uZWQ6IFtdLFxyXG5cdFx0XHRcdFx0XHRcdFx0fTtcclxuXHRcdFx0XHRcdFx0XHRcdGZvciAoY29uc3QgW3N5bWJvbCwgXywgdHlwZV0gb2Ygc3RhdHVzZXMpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKHR5cGUgaW4gc3RhdHVzTWFwKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0c3RhdHVzTWFwW1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0dHlwZSBhcyBrZXlvZiB0eXBlb2Ygc3RhdHVzTWFwXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XS5wdXNoKHN5bWJvbCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdC8vIENvcnJlY3RlZCBsb29wIGFuZCBhc3NpZ25tZW50IGZvciBUYXNrU3RhdHVzQ29uZmlnIGhlcmUgdG9vXHJcblx0XHRcdFx0XHRcdFx0XHRmb3IgKGNvbnN0IHR5cGUgb2YgT2JqZWN0LmtleXMoXHJcblx0XHRcdFx0XHRcdFx0XHRcdHN0YXR1c01hcFxyXG5cdFx0XHRcdFx0XHRcdFx0KSBhcyBBcnJheTxrZXlvZiBUYXNrU3RhdHVzQ29uZmlnPikge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0dHlwZSBpblxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3NcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0LnRhc2tTdGF0dXNlcyAmJlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHN0YXR1c01hcFt0eXBlXSAmJlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHN0YXR1c01hcFt0eXBlXS5sZW5ndGggPiAwXHJcblx0XHRcdFx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnRhc2tTdGF0dXNlc1tcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHR5cGVcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRdID0gc3RhdHVzTWFwW3R5cGVdLmpvaW4oXCJ8XCIpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0Ly8gU2F2ZSBzZXR0aW5ncyBhbmQgcmVmcmVzaCB0aGUgZGlzcGxheVxyXG5cdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmRpc3BsYXkoKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcclxuXHRcdFx0XHRcdFx0XHRcdFwiRmFpbGVkIHRvIGFwcGx5IGNoZWNrYm94IHN0YXR1cyB0aGVtZTpcIixcclxuXHRcdFx0XHRcdFx0XHRcdGVycm9yXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0bW9kYWwub3BlbigpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHQvLyBDcmVhdGUgYSBjb250YWluZXIgZm9yIHRoZSB0YXNrIHN0YXRlcyBsaXN0XHJcblx0XHRjb25zdCB0YXNrU3RhdGVzQ29udGFpbmVyID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInRhc2stc3RhdGVzLWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gRnVuY3Rpb24gdG8gcmVmcmVzaCB0aGUgdGFzayBzdGF0ZXMgbGlzdFxyXG5cdFx0Y29uc3QgcmVmcmVzaFRhc2tTdGF0ZXNMaXN0ID0gKCkgPT4ge1xyXG5cdFx0XHQvLyBDbGVhciB0aGUgY29udGFpbmVyXHJcblx0XHRcdHRhc2tTdGF0ZXNDb250YWluZXIuZW1wdHkoKTtcclxuXHJcblx0XHRcdC8vIEdldCBjdXJyZW50IGN5Y2xlIGFuZCBtYXJrc1xyXG5cdFx0XHRjb25zdCBjeWNsZSA9IHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnRhc2tTdGF0dXNDeWNsZTtcclxuXHRcdFx0Y29uc3QgbWFya3MgPSBzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy50YXNrU3RhdHVzTWFya3M7XHJcblxyXG5cdFx0XHQvLyBJbml0aWFsaXplIGV4Y2x1ZGVNYXJrc0Zyb21DeWNsZSBpZiBpdCBkb2Vzbid0IGV4aXN0XHJcblx0XHRcdGlmICghc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZXhjbHVkZU1hcmtzRnJvbUN5Y2xlKSB7XHJcblx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZXhjbHVkZU1hcmtzRnJvbUN5Y2xlID0gW107XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEFkZCBlYWNoIHN0YXR1cyBpbiB0aGUgY3ljbGVcclxuXHRcdFx0Y3ljbGUuZm9yRWFjaCgoc3RhdGUsIGluZGV4KSA9PiB7XHJcblx0XHRcdFx0Y29uc3Qgc3RhdGVSb3cgPSB0YXNrU3RhdGVzQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0XHRjbHM6IFwidGFzay1zdGF0ZS1yb3dcIixcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gQ3JlYXRlIHRoZSBzZXR0aW5nXHJcblx0XHRcdFx0Y29uc3Qgc3RhdGVTZXR0aW5nID0gbmV3IFNldHRpbmcoc3RhdGVSb3cpXHJcblx0XHRcdFx0XHQuc2V0TmFtZShgU3RhdHVzICMke2luZGV4ICsgMX1gKVxyXG5cdFx0XHRcdFx0LmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0XHRcdFx0dGV4dC5zZXRWYWx1ZShzdGF0ZSlcclxuXHRcdFx0XHRcdFx0XHQuc2V0UGxhY2Vob2xkZXIodChcIlN0YXR1cyBuYW1lXCIpKVxyXG5cdFx0XHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdC8vIFVwZGF0ZSB0aGUgc3RhdGUgbmFtZSBpbiBib3RoIGN5Y2xlIGFuZCBtYXJrc1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3Qgb2xkU3RhdGUgPSBjeWNsZVtpbmRleF07XHJcblx0XHRcdFx0XHRcdFx0XHRjeWNsZVtpbmRleF0gPSB2YWx1ZTtcclxuXHJcblx0XHRcdFx0XHRcdFx0XHQvLyBJZiB0aGUgb2xkIHN0YXRlIGhhZCBhIG1hcmssIHByZXNlcnZlIGl0IHdpdGggdGhlIG5ldyBuYW1lXHJcblx0XHRcdFx0XHRcdFx0XHRpZiAob2xkU3RhdGUgaW4gbWFya3MpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0bWFya3NbdmFsdWVdID0gbWFya3Nbb2xkU3RhdGVdO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRkZWxldGUgbWFya3Nbb2xkU3RhdGVdO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSlcclxuXHRcdFx0XHRcdC5hZGRUZXh0KCh0ZXh0KSA9PiB7XHJcblx0XHRcdFx0XHRcdHRleHQuc2V0VmFsdWUobWFya3Nbc3RhdGVdIHx8IFwiIFwiKVxyXG5cdFx0XHRcdFx0XHRcdC5zZXRQbGFjZWhvbGRlcihcIk1hcmtcIilcclxuXHRcdFx0XHRcdFx0XHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHQvLyBPbmx5IHVzZSB0aGUgZmlyc3QgY2hhcmFjdGVyXHJcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBtYXJrID0gdmFsdWUudHJpbSgpLmNoYXJBdCgwKSB8fCBcIiBcIjtcclxuXHRcdFx0XHRcdFx0XHRcdG1hcmtzW3N0YXRlXSA9IG1hcms7XHJcblx0XHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0dGV4dC5pbnB1dEVsLm1heExlbmd0aCA9IDE7XHJcblx0XHRcdFx0XHRcdHRleHQuaW5wdXRFbC5zdHlsZS53aWR0aCA9IFwiNDBweFwiO1xyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIEFkZCB0b2dnbGUgZm9yIGluY2x1ZGluZyBpbiBjeWNsZVxyXG5cdFx0XHRcdHN0YXRlU2V0dGluZy5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xyXG5cdFx0XHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0XHRcdC5zZXRUb29sdGlwKHQoXCJJbmNsdWRlIGluIGN5Y2xlXCIpKVxyXG5cdFx0XHRcdFx0XHQuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRcdFx0IXNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmV4Y2x1ZGVNYXJrc0Zyb21DeWNsZS5pbmNsdWRlcyhcclxuXHRcdFx0XHRcdFx0XHRcdHN0YXRlXHJcblx0XHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRpZiAoIXZhbHVlKSB7XHJcblx0XHRcdFx0XHRcdFx0XHQvLyBBZGQgdG8gZXhjbHVkZSBsaXN0IGlmIG5vdCBhbHJlYWR5IHRoZXJlXHJcblx0XHRcdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0XHRcdCFzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5leGNsdWRlTWFya3NGcm9tQ3ljbGUuaW5jbHVkZXMoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0c3RhdGVcclxuXHRcdFx0XHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmV4Y2x1ZGVNYXJrc0Zyb21DeWNsZS5wdXNoKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHN0YXRlXHJcblx0XHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRcdC8vIFJlbW92ZSBmcm9tIGV4Y2x1ZGUgbGlzdFxyXG5cdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZXhjbHVkZU1hcmtzRnJvbUN5Y2xlID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZXhjbHVkZU1hcmtzRnJvbUN5Y2xlLmZpbHRlcihcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQocykgPT4gcyAhPT0gc3RhdGVcclxuXHRcdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyBBZGQgYnV0dG9ucyBmb3IgbW92aW5nIHVwL2Rvd24gYW5kIHJlbW92aW5nXHJcblx0XHRcdFx0c3RhdGVTZXR0aW5nLmFkZEV4dHJhQnV0dG9uKChidXR0b24pID0+IHtcclxuXHRcdFx0XHRcdGJ1dHRvblxyXG5cdFx0XHRcdFx0XHQuc2V0SWNvbihcImFycm93LXVwXCIpXHJcblx0XHRcdFx0XHRcdC5zZXRUb29sdGlwKHQoXCJNb3ZlIHVwXCIpKVxyXG5cdFx0XHRcdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0aWYgKGluZGV4ID4gMCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0Ly8gU3dhcCB3aXRoIHRoZSBwcmV2aW91cyBpdGVtXHJcblx0XHRcdFx0XHRcdFx0XHRbY3ljbGVbaW5kZXggLSAxXSwgY3ljbGVbaW5kZXhdXSA9IFtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y3ljbGVbaW5kZXhdLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRjeWNsZVtpbmRleCAtIDFdLFxyXG5cdFx0XHRcdFx0XHRcdFx0XTtcclxuXHRcdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHRcdFx0cmVmcmVzaFRhc2tTdGF0ZXNMaXN0KCk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdGJ1dHRvbi5leHRyYVNldHRpbmdzRWwuc3R5bGUubWFyZ2luUmlnaHQgPSBcIjBcIjtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0c3RhdGVTZXR0aW5nLmFkZEV4dHJhQnV0dG9uKChidXR0b24pID0+IHtcclxuXHRcdFx0XHRcdGJ1dHRvblxyXG5cdFx0XHRcdFx0XHQuc2V0SWNvbihcImFycm93LWRvd25cIilcclxuXHRcdFx0XHRcdFx0LnNldFRvb2x0aXAodChcIk1vdmUgZG93blwiKSlcclxuXHRcdFx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdGlmIChpbmRleCA8IGN5Y2xlLmxlbmd0aCAtIDEpIHtcclxuXHRcdFx0XHRcdFx0XHRcdC8vIFN3YXAgd2l0aCB0aGUgbmV4dCBpdGVtXHJcblx0XHRcdFx0XHRcdFx0XHRbY3ljbGVbaW5kZXhdLCBjeWNsZVtpbmRleCArIDFdXSA9IFtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y3ljbGVbaW5kZXggKyAxXSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y3ljbGVbaW5kZXhdLFxyXG5cdFx0XHRcdFx0XHRcdFx0XTtcclxuXHRcdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHRcdFx0cmVmcmVzaFRhc2tTdGF0ZXNMaXN0KCk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdGJ1dHRvbi5leHRyYVNldHRpbmdzRWwuc3R5bGUubWFyZ2luUmlnaHQgPSBcIjBcIjtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0c3RhdGVTZXR0aW5nLmFkZEV4dHJhQnV0dG9uKChidXR0b24pID0+IHtcclxuXHRcdFx0XHRcdGJ1dHRvblxyXG5cdFx0XHRcdFx0XHQuc2V0SWNvbihcInRyYXNoXCIpXHJcblx0XHRcdFx0XHRcdC5zZXRUb29sdGlwKHQoXCJSZW1vdmVcIikpXHJcblx0XHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHQvLyBSZW1vdmUgZnJvbSBjeWNsZVxyXG5cdFx0XHRcdFx0XHRcdGN5Y2xlLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdFx0XHRcdFx0ZGVsZXRlIG1hcmtzW3N0YXRlXTtcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdFx0XHRyZWZyZXNoVGFza1N0YXRlc0xpc3QoKTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRidXR0b24uZXh0cmFTZXR0aW5nc0VsLnN0eWxlLm1hcmdpblJpZ2h0ID0gXCIwXCI7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQWRkIGJ1dHRvbiB0byBhZGQgbmV3IHN0YXR1c1xyXG5cdFx0XHRjb25zdCBhZGRCdXR0b25Db250YWluZXIgPSB0YXNrU3RhdGVzQ29udGFpbmVyLmNyZWF0ZURpdigpO1xyXG5cdFx0XHRuZXcgU2V0dGluZyhhZGRCdXR0b25Db250YWluZXIpLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XHJcblx0XHRcdFx0YnV0dG9uXHJcblx0XHRcdFx0XHQuc2V0QnV0dG9uVGV4dCh0KFwiQWRkIFN0YXR1c1wiKSlcclxuXHRcdFx0XHRcdC5zZXRDdGEoKVxyXG5cdFx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHQvLyBBZGQgYSBuZXcgc3RhdHVzIHRvIHRoZSBjeWNsZSB3aXRoIGEgZGVmYXVsdCBtYXJrXHJcblx0XHRcdFx0XHRcdGNvbnN0IG5ld1N0YXR1cyA9IGBTVEFUVVNfJHtjeWNsZS5sZW5ndGggKyAxfWA7XHJcblx0XHRcdFx0XHRcdGN5Y2xlLnB1c2gobmV3U3RhdHVzKTtcclxuXHRcdFx0XHRcdFx0bWFya3NbbmV3U3RhdHVzXSA9IFwiIFwiO1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdFx0cmVmcmVzaFRhc2tTdGF0ZXNMaXN0KCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIEluaXRpYWwgcmVuZGVyIG9mIHRoZSB0YXNrIHN0YXRlcyBsaXN0XHJcblx0XHRyZWZyZXNoVGFza1N0YXRlc0xpc3QoKTtcclxuXHR9XHJcblxyXG5cdC8vIEF1dG8gRGF0ZSBNYW5hZ2VyIFNldHRpbmdzXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiQXV0byBEYXRlIE1hbmFnZXJcIikpXHJcblx0XHQuc2V0RGVzYyhcclxuXHRcdFx0dChcIkF1dG9tYXRpY2FsbHkgbWFuYWdlIGRhdGVzIGJhc2VkIG9uIGNoZWNrYm94IHN0YXR1cyBjaGFuZ2VzXCIpXHJcblx0XHQpXHJcblx0XHQuc2V0SGVhZGluZygpO1xyXG5cclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJFbmFibGUgYXV0byBkYXRlIG1hbmFnZXJcIikpXHJcblx0XHQuc2V0RGVzYyhcclxuXHRcdFx0dChcclxuXHRcdFx0XHRcIlRvZ2dsZSB0aGlzIHRvIGVuYWJsZSBhdXRvbWF0aWMgZGF0ZSBtYW5hZ2VtZW50IHdoZW4gY2hlY2tib3ggc3RhdHVzIGNoYW5nZXMuIERhdGVzIHdpbGwgYmUgYWRkZWQvcmVtb3ZlZCBiYXNlZCBvbiB5b3VyIHByZWZlcnJlZCBtZXRhZGF0YSBmb3JtYXQgKFRhc2tzIGVtb2ppIGZvcm1hdCBvciBEYXRhdmlldyBmb3JtYXQpLlwiXHJcblx0XHRcdClcclxuXHRcdClcclxuXHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT5cclxuXHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0LnNldFZhbHVlKHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmF1dG9EYXRlTWFuYWdlci5lbmFibGVkKVxyXG5cdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmF1dG9EYXRlTWFuYWdlci5lbmFibGVkID0gdmFsdWU7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmRpc3BsYXkoKTtcclxuXHRcdFx0XHRcdH0sIDIwMCk7XHJcblx0XHRcdFx0fSlcclxuXHRcdCk7XHJcblxyXG5cdGlmIChzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5hdXRvRGF0ZU1hbmFnZXIuZW5hYmxlZCkge1xyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJNYW5hZ2UgY29tcGxldGlvbiBkYXRlc1wiKSlcclxuXHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFwiQXV0b21hdGljYWxseSBhZGQgY29tcGxldGlvbiBkYXRlcyB3aGVuIHRhc2tzIGFyZSBtYXJrZWQgYXMgY29tcGxldGVkLCBhbmQgcmVtb3ZlIHRoZW0gd2hlbiBjaGFuZ2VkIHRvIG90aGVyIHN0YXR1c2VzLlwiXHJcblx0XHRcdFx0KVxyXG5cdFx0XHQpXHJcblx0XHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT5cclxuXHRcdFx0XHR0b2dnbGVcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuYXV0b0RhdGVNYW5hZ2VyXHJcblx0XHRcdFx0XHRcdFx0Lm1hbmFnZUNvbXBsZXRlZERhdGVcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuYXV0b0RhdGVNYW5hZ2VyLm1hbmFnZUNvbXBsZXRlZERhdGUgPVxyXG5cdFx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJNYW5hZ2Ugc3RhcnQgZGF0ZXNcIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcIkF1dG9tYXRpY2FsbHkgYWRkIHN0YXJ0IGRhdGVzIHdoZW4gdGFza3MgYXJlIG1hcmtlZCBhcyBpbiBwcm9ncmVzcywgYW5kIHJlbW92ZSB0aGVtIHdoZW4gY2hhbmdlZCB0byBvdGhlciBzdGF0dXNlcy5cIlxyXG5cdFx0XHRcdClcclxuXHRcdFx0KVxyXG5cdFx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+XHJcblx0XHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmF1dG9EYXRlTWFuYWdlclxyXG5cdFx0XHRcdFx0XHRcdC5tYW5hZ2VTdGFydERhdGVcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuYXV0b0RhdGVNYW5hZ2VyLm1hbmFnZVN0YXJ0RGF0ZSA9XHJcblx0XHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0fSlcclxuXHRcdFx0KTtcclxuXHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0LnNldE5hbWUodChcIk1hbmFnZSBjYW5jZWxsZWQgZGF0ZXNcIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcIkF1dG9tYXRpY2FsbHkgYWRkIGNhbmNlbGxlZCBkYXRlcyB3aGVuIHRhc2tzIGFyZSBtYXJrZWQgYXMgYWJhbmRvbmVkLCBhbmQgcmVtb3ZlIHRoZW0gd2hlbiBjaGFuZ2VkIHRvIG90aGVyIHN0YXR1c2VzLlwiXHJcblx0XHRcdFx0KVxyXG5cdFx0XHQpXHJcblx0XHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT5cclxuXHRcdFx0XHR0b2dnbGVcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuYXV0b0RhdGVNYW5hZ2VyXHJcblx0XHRcdFx0XHRcdFx0Lm1hbmFnZUNhbmNlbGxlZERhdGVcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuYXV0b0RhdGVNYW5hZ2VyLm1hbmFnZUNhbmNlbGxlZERhdGUgPVxyXG5cdFx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdCk7XHJcblx0fVxyXG59XHJcbiJdfQ==