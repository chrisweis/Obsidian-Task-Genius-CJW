import { __awaiter } from "tslib";
import { Setting } from "obsidian";
import { DEFAULT_SETTINGS, } from "@/common/setting-definition";
import { t } from "@/translations/helper";
export function renderTaskHandlerSettingsTab(settingTab, containerEl) {
    new Setting(containerEl)
        .setName(t("Task Gutter"))
        .setDesc(t("Configure the task gutter."))
        .setHeading();
    new Setting(containerEl)
        .setName(t("Enable task gutter"))
        .setDesc(t("Toggle this to enable the task gutter."))
        .addToggle((toggle) => {
        toggle.setValue(settingTab.plugin.settings.taskGutter.enableTaskGutter);
        toggle.onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.taskGutter.enableTaskGutter = value;
            settingTab.applySettingsUpdate();
        }));
    });
    // Add Completed Task Mover settings
    new Setting(containerEl).setName(t("Completed Task Mover")).setHeading();
    new Setting(containerEl)
        .setName(t("Enable completed task mover"))
        .setDesc(t("Toggle this to enable commands for moving completed tasks to another file."))
        .addToggle((toggle) => toggle
        .setValue(settingTab.plugin.settings.completedTaskMover
        .enableCompletedTaskMover)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        settingTab.plugin.settings.completedTaskMover.enableCompletedTaskMover =
            value;
        settingTab.applySettingsUpdate();
        setTimeout(() => {
            settingTab.display();
        }, 200);
    })));
    if (settingTab.plugin.settings.completedTaskMover.enableCompletedTaskMover) {
        new Setting(containerEl)
            .setName(t("Task marker type"))
            .setDesc(t("Choose what type of marker to add to moved tasks"))
            .addDropdown((dropdown) => {
            dropdown
                .addOption("version", "Version marker")
                .addOption("date", "Date marker")
                .addOption("custom", "Custom marker")
                .setValue(settingTab.plugin.settings.completedTaskMover
                .taskMarkerType)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                settingTab.plugin.settings.completedTaskMover.taskMarkerType =
                    value;
                settingTab.applySettingsUpdate();
            }));
        });
        // Show specific settings based on marker type
        const markerType = settingTab.plugin.settings.completedTaskMover.taskMarkerType;
        if (markerType === "version") {
            new Setting(containerEl)
                .setName(t("Version marker text"))
                .setDesc(t("Text to append to tasks when moved (e.g., 'version 1.0')"))
                .addText((text) => text
                .setPlaceholder("version 1.0")
                .setValue(settingTab.plugin.settings.completedTaskMover
                .versionMarker)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                settingTab.plugin.settings.completedTaskMover.versionMarker =
                    value;
                settingTab.applySettingsUpdate();
            })));
        }
        else if (markerType === "date") {
            new Setting(containerEl)
                .setName(t("Date marker text"))
                .setDesc(t("Text to append to tasks when moved (e.g., 'archived on 2023-12-31')"))
                .addText((text) => text
                .setPlaceholder("archived on {{date}}")
                .setValue(settingTab.plugin.settings.completedTaskMover
                .dateMarker)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                settingTab.plugin.settings.completedTaskMover.dateMarker =
                    value;
                settingTab.applySettingsUpdate();
            })));
        }
        else if (markerType === "custom") {
            new Setting(containerEl)
                .setName(t("Custom marker text"))
                .setDesc(t("Use {{DATE:format}} for date formatting (e.g., {{DATE:YYYY-MM-DD}}"))
                .addText((text) => text
                .setPlaceholder("moved {{DATE:YYYY-MM-DD HH:mm}}")
                .setValue(settingTab.plugin.settings.completedTaskMover
                .customMarker)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                settingTab.plugin.settings.completedTaskMover.customMarker =
                    value;
                settingTab.applySettingsUpdate();
            })));
        }
        new Setting(containerEl)
            .setName(t("Treat abandoned tasks as completed"))
            .setDesc(t("If enabled, abandoned tasks will be treated as completed."))
            .addToggle((toggle) => {
            toggle.setValue(settingTab.plugin.settings.completedTaskMover
                .treatAbandonedAsCompleted);
            toggle.onChange((value) => {
                settingTab.plugin.settings.completedTaskMover.treatAbandonedAsCompleted =
                    value;
                settingTab.applySettingsUpdate();
            });
        });
        new Setting(containerEl)
            .setName(t("Complete all moved tasks"))
            .setDesc(t("If enabled, all moved tasks will be marked as completed."))
            .addToggle((toggle) => {
            toggle.setValue(settingTab.plugin.settings.completedTaskMover
                .completeAllMovedTasks);
            toggle.onChange((value) => {
                settingTab.plugin.settings.completedTaskMover.completeAllMovedTasks =
                    value;
                settingTab.applySettingsUpdate();
            });
        });
        new Setting(containerEl)
            .setName(t("With current file link"))
            .setDesc(t("A link to the current file will be added to the parent task of the moved tasks."))
            .addToggle((toggle) => {
            toggle.setValue(settingTab.plugin.settings.completedTaskMover
                .withCurrentFileLink);
            toggle.onChange((value) => {
                settingTab.plugin.settings.completedTaskMover.withCurrentFileLink =
                    value;
                settingTab.applySettingsUpdate();
            });
        });
        // Auto-move settings for completed tasks
        new Setting(containerEl)
            .setName(t("Enable auto-move for completed tasks"))
            .setDesc(t("Automatically move completed tasks to a default file without manual selection."))
            .addToggle((toggle) => {
            toggle.setValue(settingTab.plugin.settings.completedTaskMover.enableAutoMove);
            toggle.onChange((value) => {
                settingTab.plugin.settings.completedTaskMover.enableAutoMove =
                    value;
                settingTab.applySettingsUpdate();
                settingTab.display(); // Refresh to show/hide auto-move settings
            });
        });
        if (settingTab.plugin.settings.completedTaskMover.enableAutoMove) {
            new Setting(containerEl)
                .setName(t("Default target file"))
                .setDesc(t("Default file to move completed tasks to (e.g., 'Archive.md')"))
                .addText((text) => text
                .setPlaceholder("Archive.md")
                .setValue(settingTab.plugin.settings.completedTaskMover
                .defaultTargetFile)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                settingTab.plugin.settings.completedTaskMover.defaultTargetFile =
                    value;
                settingTab.applySettingsUpdate();
            })));
            new Setting(containerEl)
                .setName(t("Default insertion mode"))
                .setDesc(t("Where to insert completed tasks in the target file"))
                .addDropdown((dropdown) => {
                dropdown
                    .addOption("beginning", t("Beginning of file"))
                    .addOption("end", t("End of file"))
                    .addOption("after-heading", t("After heading"))
                    .setValue(settingTab.plugin.settings.completedTaskMover
                    .defaultInsertionMode)
                    .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                    settingTab.plugin.settings.completedTaskMover.defaultInsertionMode =
                        value;
                    settingTab.applySettingsUpdate();
                    settingTab.display(); // Refresh to show/hide heading setting
                }));
            });
            if (settingTab.plugin.settings.completedTaskMover
                .defaultInsertionMode === "after-heading") {
                new Setting(containerEl)
                    .setName(t("Default heading name"))
                    .setDesc(t("Heading name to insert tasks after (will be created if it doesn't exist)"))
                    .addText((text) => text
                    .setPlaceholder("Completed Tasks")
                    .setValue(settingTab.plugin.settings.completedTaskMover
                    .defaultHeadingName)
                    .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                    settingTab.plugin.settings.completedTaskMover.defaultHeadingName =
                        value;
                    settingTab.applySettingsUpdate();
                })));
            }
        }
    }
    // Add Incomplete Task Mover settings
    new Setting(containerEl).setName(t("Incomplete Task Mover")).setHeading();
    new Setting(containerEl)
        .setName(t("Enable incomplete task mover"))
        .setDesc(t("Toggle this to enable commands for moving incomplete tasks to another file."))
        .addToggle((toggle) => toggle
        .setValue(settingTab.plugin.settings.completedTaskMover
        .enableIncompletedTaskMover)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        settingTab.plugin.settings.completedTaskMover.enableIncompletedTaskMover =
            value;
        settingTab.applySettingsUpdate();
    })));
    if (settingTab.plugin.settings.completedTaskMover.enableIncompletedTaskMover) {
        new Setting(containerEl)
            .setName(t("Incomplete task marker type"))
            .setDesc(t("Choose what type of marker to add to moved incomplete tasks"))
            .addDropdown((dropdown) => {
            dropdown
                .addOption("version", "Version marker")
                .addOption("date", "Date marker")
                .addOption("custom", "Custom marker")
                .setValue(settingTab.plugin.settings.completedTaskMover
                .incompletedTaskMarkerType)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                settingTab.plugin.settings.completedTaskMover.incompletedTaskMarkerType =
                    value;
                settingTab.applySettingsUpdate();
            }));
        });
        // Show specific settings based on marker type
        const incompletedMarkerType = settingTab.plugin.settings.completedTaskMover
            .incompletedTaskMarkerType;
        if (incompletedMarkerType === "version") {
            new Setting(containerEl)
                .setName(t("Incomplete version marker text"))
                .setDesc(t("Text to append to incomplete tasks when moved (e.g., 'version 1.0')"))
                .addText((text) => text
                .setPlaceholder("version 1.0")
                .setValue(settingTab.plugin.settings.completedTaskMover
                .incompletedVersionMarker)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                settingTab.plugin.settings.completedTaskMover.incompletedVersionMarker =
                    value;
                settingTab.applySettingsUpdate();
            })));
        }
        else if (incompletedMarkerType === "date") {
            new Setting(containerEl)
                .setName(t("Incomplete date marker text"))
                .setDesc(t("Text to append to incomplete tasks when moved (e.g., 'moved on 2023-12-31')"))
                .addText((text) => text
                .setPlaceholder("moved on {{date}}")
                .setValue(settingTab.plugin.settings.completedTaskMover
                .incompletedDateMarker)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                settingTab.plugin.settings.completedTaskMover.incompletedDateMarker =
                    value;
                settingTab.applySettingsUpdate();
            })));
        }
        else if (incompletedMarkerType === "custom") {
            new Setting(containerEl)
                .setName(t("Incomplete custom marker text"))
                .setDesc(t("Use {{DATE:format}} for date formatting (e.g., {{DATE:YYYY-MM-DD}}"))
                .addText((text) => text
                .setPlaceholder("moved {{DATE:YYYY-MM-DD HH:mm}}")
                .setValue(settingTab.plugin.settings.completedTaskMover
                .incompletedCustomMarker)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                settingTab.plugin.settings.completedTaskMover.incompletedCustomMarker =
                    value;
                settingTab.applySettingsUpdate();
            })));
        }
        new Setting(containerEl)
            .setName(t("With current file link for incomplete tasks"))
            .setDesc(t("A link to the current file will be added to the parent task of the moved incomplete tasks."))
            .addToggle((toggle) => {
            toggle.setValue(settingTab.plugin.settings.completedTaskMover
                .withCurrentFileLinkForIncompleted);
            toggle.onChange((value) => {
                settingTab.plugin.settings.completedTaskMover.withCurrentFileLinkForIncompleted =
                    value;
                settingTab.applySettingsUpdate();
            });
        });
        // Auto-move settings for incomplete tasks
        new Setting(containerEl)
            .setName(t("Enable auto-move for incomplete tasks"))
            .setDesc(t("Automatically move incomplete tasks to a default file without manual selection."))
            .addToggle((toggle) => {
            toggle.setValue(settingTab.plugin.settings.completedTaskMover
                .enableIncompletedAutoMove);
            toggle.onChange((value) => {
                settingTab.plugin.settings.completedTaskMover.enableIncompletedAutoMove =
                    value;
                settingTab.applySettingsUpdate();
                settingTab.display(); // Refresh to show/hide auto-move settings
            });
        });
        if (settingTab.plugin.settings.completedTaskMover
            .enableIncompletedAutoMove) {
            new Setting(containerEl)
                .setName(t("Default target file for incomplete tasks"))
                .setDesc(t("Default file to move incomplete tasks to (e.g., 'Backlog.md')"))
                .addText((text) => text
                .setPlaceholder("Backlog.md")
                .setValue(settingTab.plugin.settings.completedTaskMover
                .incompletedDefaultTargetFile)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                settingTab.plugin.settings.completedTaskMover.incompletedDefaultTargetFile =
                    value;
                settingTab.applySettingsUpdate();
            })));
            new Setting(containerEl)
                .setName(t("Default insertion mode for incomplete tasks"))
                .setDesc(t("Where to insert incomplete tasks in the target file"))
                .addDropdown((dropdown) => {
                dropdown
                    .addOption("beginning", t("Beginning of file"))
                    .addOption("end", t("End of file"))
                    .addOption("after-heading", t("After heading"))
                    .setValue(settingTab.plugin.settings.completedTaskMover
                    .incompletedDefaultInsertionMode)
                    .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                    settingTab.plugin.settings.completedTaskMover.incompletedDefaultInsertionMode =
                        value;
                    settingTab.applySettingsUpdate();
                    settingTab.display(); // Refresh to show/hide heading setting
                }));
            });
            if (settingTab.plugin.settings.completedTaskMover
                .incompletedDefaultInsertionMode === "after-heading") {
                new Setting(containerEl)
                    .setName(t("Default heading name for incomplete tasks"))
                    .setDesc(t("Heading name to insert incomplete tasks after (will be created if it doesn't exist)"))
                    .addText((text) => text
                    .setPlaceholder("Incomplete Tasks")
                    .setValue(settingTab.plugin.settings.completedTaskMover
                    .incompletedDefaultHeadingName)
                    .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                    settingTab.plugin.settings.completedTaskMover.incompletedDefaultHeadingName =
                        value;
                    settingTab.applySettingsUpdate();
                })));
            }
        }
    }
    // --- Task Sorting Settings ---
    new Setting(containerEl)
        .setName(t("Task Sorting"))
        .setDesc(t("Configure how tasks are sorted in the document."))
        .setHeading();
    new Setting(containerEl)
        .setName(t("Enable Task Sorting"))
        .setDesc(t("Toggle this to enable commands for sorting tasks."))
        .addToggle((toggle) => {
        toggle
            .setValue(settingTab.plugin.settings.sortTasks)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.sortTasks = value;
            settingTab.applySettingsUpdate();
            // Refresh the settings display to show/hide criteria section
            settingTab.display(); // Or just this section if optimized
        }));
    });
    if (settingTab.plugin.settings.sortTasks) {
        new Setting(containerEl)
            .setName(t("Sort Criteria"))
            .setDesc(t("Define the order in which tasks should be sorted. Criteria are applied sequentially."))
            .setHeading();
        const criteriaContainer = containerEl.createDiv({
            cls: "sort-criteria-container",
        });
        const refreshCriteriaList = () => {
            criteriaContainer.empty();
            const criteria = settingTab.plugin.settings.sortCriteria || [];
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
                        .addOption("lineNumber", t("Line Number"))
                        .setValue(criterion.field)
                        .onChange((value) => {
                        settingTab.plugin.settings.sortCriteria[index].field = value;
                        settingTab.applySettingsUpdate();
                    });
                })
                    .addDropdown((dropdown) => {
                    dropdown
                        .addOption("asc", t("Ascending")) // Ascending might mean different things (e.g., High -> Low for priority)
                        .addOption("desc", t("Descending")) // Descending might mean different things (e.g., Low -> High for priority)
                        .setValue(criterion.order)
                        .onChange((value) => {
                        settingTab.plugin.settings.sortCriteria[index].order = value;
                        settingTab.applySettingsUpdate();
                    });
                    // Add tooltips explaining what asc/desc means for each field type if possible
                    if (criterion.field === "priority") {
                        dropdown.selectEl.title = t("Ascending: High -> Low -> None. Descending: None -> Low -> High");
                    }
                    else if (["dueDate", "startDate", "scheduledDate"].includes(criterion.field)) {
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
                        if (index > 0) {
                            const item = settingTab.plugin.settings.sortCriteria.splice(index, 1)[0];
                            settingTab.plugin.settings.sortCriteria.splice(index - 1, 0, item);
                            settingTab.applySettingsUpdate();
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
                        if (index < criteria.length - 1) {
                            const item = settingTab.plugin.settings.sortCriteria.splice(index, 1)[0];
                            settingTab.plugin.settings.sortCriteria.splice(index + 1, 0, item);
                            settingTab.applySettingsUpdate();
                            refreshCriteriaList();
                        }
                    });
                });
                criterionSetting.addExtraButton((button) => {
                    button
                        .setIcon("trash")
                        .setTooltip(t("Remove Criterion"))
                        .onClick(() => {
                        settingTab.plugin.settings.sortCriteria.splice(index, 1);
                        settingTab.applySettingsUpdate();
                        refreshCriteriaList();
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
                    if (!settingTab.plugin.settings.sortCriteria) {
                        settingTab.plugin.settings.sortCriteria = [];
                    }
                    settingTab.plugin.settings.sortCriteria.push(newCriterion);
                    settingTab.applySettingsUpdate();
                    refreshCriteriaList();
                });
            })
                .addButton((button) => {
                // Button to reset to defaults
                button.setButtonText(t("Reset to Defaults")).onClick(() => {
                    // Optional: Add confirmation dialog here
                    settingTab.plugin.settings.sortCriteria = [
                        ...DEFAULT_SETTINGS.sortCriteria,
                    ]; // Use spread to copy
                    settingTab.applySettingsUpdate();
                    refreshCriteriaList();
                });
            });
        };
        refreshCriteriaList(); // Initial render
    }
    // Add OnCompletion settings
    new Setting(containerEl).setName(t("On Completion")).setHeading();
    new Setting(containerEl)
        .setName(t("Enable OnCompletion"))
        .setDesc(t("Enable automatic actions when tasks are completed"))
        .addToggle((toggle) => toggle
        .setValue(settingTab.plugin.settings.onCompletion.enableOnCompletion)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        settingTab.plugin.settings.onCompletion.enableOnCompletion =
            value;
        settingTab.applySettingsUpdate();
        settingTab.display(); // Refresh to show/hide onCompletion settings
    })));
    if (settingTab.plugin.settings.onCompletion.enableOnCompletion) {
        new Setting(containerEl)
            .setName(t("Default Archive File"))
            .setDesc(t("Default file for archive action"))
            .addText((text) => text
            .setPlaceholder("Archive/Completed Tasks.md")
            .setValue(settingTab.plugin.settings.onCompletion.defaultArchiveFile)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.onCompletion.defaultArchiveFile =
                value;
            settingTab.applySettingsUpdate();
        })));
        new Setting(containerEl)
            .setName(t("Default Archive Section"))
            .setDesc(t("Default section for archive action"))
            .addText((text) => text
            .setPlaceholder("Completed Tasks")
            .setValue(settingTab.plugin.settings.onCompletion.defaultArchiveSection)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.onCompletion.defaultArchiveSection =
                value;
            settingTab.applySettingsUpdate();
        })));
        new Setting(containerEl)
            .setName(t("Show Advanced Options"))
            .setDesc(t("Show advanced configuration options in task editors"))
            .addToggle((toggle) => toggle
            .setValue(settingTab.plugin.settings.onCompletion.showAdvancedOptions)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.onCompletion.showAdvancedOptions =
                value;
            settingTab.applySettingsUpdate();
        })));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGFza0hhbmRsZXJTZXR0aW5nc1RhYi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlRhc2tIYW5kbGVyU2V0dGluZ3NUYWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDbkMsT0FBTyxFQUVOLGdCQUFnQixHQUNoQixNQUFNLDZCQUE2QixDQUFDO0FBRXJDLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUUxQyxNQUFNLFVBQVUsNEJBQTRCLENBQzNDLFVBQXFDLEVBQ3JDLFdBQXdCO0lBRXhCLElBQUksT0FBTyxDQUFDLFdBQVcsQ0FBQztTQUN0QixPQUFPLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1NBQ3pCLE9BQU8sQ0FBQyxDQUFDLENBQUMsNEJBQTRCLENBQUMsQ0FBQztTQUN4QyxVQUFVLEVBQUUsQ0FBQztJQUVmLElBQUksT0FBTyxDQUFDLFdBQVcsQ0FBQztTQUN0QixPQUFPLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUM7U0FDaEMsT0FBTyxDQUFDLENBQUMsQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDO1NBQ3BELFNBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1FBQ3JCLE1BQU0sQ0FBQyxRQUFRLENBQ2QsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUN0RCxDQUFDO1FBQ0YsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFPLEtBQUssRUFBRSxFQUFFO1lBQy9CLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsR0FBRyxLQUFLLENBQUM7WUFDL0QsVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDbEMsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUosb0NBQW9DO0lBQ3BDLElBQUksT0FBTyxDQUFD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RTtZQUN6QixVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMscUJBQXFCO2dCQUM1RCxLQUFLLENBQUM7WUFDUCxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUNsQyxDQUFDLENBQUEsQ0FBQyxDQUNILENBQUM7UUFFSCxJQUFJLE9BQU8sQ0FBQyxXQUFXLENBQUM7YUFDdEIsT0FBTyxDQUFDLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO2FBQ25DLE9BQU8sQ0FBQyxDQUFDLENBQUMscURBQXFELENBQUMsQ0FBQzthQUNqRSxTQUFTLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUNyQixNQUFNO2FBQ0osUUFBUSxDQUNSLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsQ0FDM0Q7YUFDQSxRQUFRLENBQUMsQ0FBTyxLQUFLLEVBQUUsRUFBRTtZQUN6QixVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsbUJBQW1CO2dCQUMxRCxLQUFLLENBQUM7WUFDUCxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUNsQyxDQUFDLENBQUEsQ0FBQyxDQUNILENBQUM7S0FDSDtBQUNGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTZXR0aW5nIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7XHJcblx0U29ydENyaXRlcmlvbixcclxuXHRERUZBVUxUX1NFVFRJTkdTLFxyXG59IGZyb20gXCJAL2NvbW1vbi9zZXR0aW5nLWRlZmluaXRpb25cIjtcclxuaW1wb3J0IHsgVGFza1Byb2dyZXNzQmFyU2V0dGluZ1RhYiB9IGZyb20gXCJAL3NldHRpbmdcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJUYXNrSGFuZGxlclNldHRpbmdzVGFiKFxyXG5cdHNldHRpbmdUYWI6IFRhc2tQcm9ncmVzc0JhclNldHRpbmdUYWIsXHJcblx0Y29udGFpbmVyRWw6IEhUTUxFbGVtZW50XHJcbikge1xyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIlRhc2sgR3V0dGVyXCIpKVxyXG5cdFx0LnNldERlc2ModChcIkNvbmZpZ3VyZSB0aGUgdGFzayBndXR0ZXIuXCIpKVxyXG5cdFx0LnNldEhlYWRpbmcoKTtcclxuXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiRW5hYmxlIHRhc2sgZ3V0dGVyXCIpKVxyXG5cdFx0LnNldERlc2ModChcIlRvZ2dsZSB0aGlzIHRvIGVuYWJsZSB0aGUgdGFzayBndXR0ZXIuXCIpKVxyXG5cdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XHJcblx0XHRcdHRvZ2dsZS5zZXRWYWx1ZShcclxuXHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy50YXNrR3V0dGVyLmVuYWJsZVRhc2tHdXR0ZXJcclxuXHRcdFx0KTtcclxuXHRcdFx0dG9nZ2xlLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnRhc2tHdXR0ZXIuZW5hYmxlVGFza0d1dHRlciA9IHZhbHVlO1xyXG5cdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHQvLyBBZGQgQ29tcGxldGVkIFRhc2sgTW92ZXIgc2V0dGluZ3NcclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZSh0KFwiQ29tcGxldGVkIFRhc2sgTW92ZXJcIikpLnNldEhlYWRpbmcoKTtcclxuXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiRW5hYmxlIGNvbXBsZXRlZCB0YXNrIG1vdmVyXCIpKVxyXG5cdFx0LnNldERlc2MoXHJcblx0XHRcdHQoXHJcblx0XHRcdFx0XCJUb2dnbGUgdGhpcyB0byBlbmFibGUgY29tbWFuZHMgZm9yIG1vdmluZyBjb21wbGV0ZWQgdGFza3MgdG8gYW5vdGhlciBmaWxlLlwiXHJcblx0XHRcdClcclxuXHRcdClcclxuXHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT5cclxuXHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuY29tcGxldGVkVGFza01vdmVyXHJcblx0XHRcdFx0XHRcdC5lbmFibGVDb21wbGV0ZWRUYXNrTW92ZXJcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuY29tcGxldGVkVGFza01vdmVyLmVuYWJsZUNvbXBsZXRlZFRhc2tNb3ZlciA9XHJcblx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblxyXG5cdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIuZGlzcGxheSgpO1xyXG5cdFx0XHRcdFx0fSwgMjAwKTtcclxuXHRcdFx0XHR9KVxyXG5cdFx0KTtcclxuXHJcblx0aWYgKFxyXG5cdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuY29tcGxldGVkVGFza01vdmVyLmVuYWJsZUNvbXBsZXRlZFRhc2tNb3ZlclxyXG5cdCkge1xyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJUYXNrIG1hcmtlciB0eXBlXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyh0KFwiQ2hvb3NlIHdoYXQgdHlwZSBvZiBtYXJrZXIgdG8gYWRkIHRvIG1vdmVkIHRhc2tzXCIpKVxyXG5cdFx0XHQuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XHJcblx0XHRcdFx0ZHJvcGRvd25cclxuXHRcdFx0XHRcdC5hZGRPcHRpb24oXCJ2ZXJzaW9uXCIsIFwiVmVyc2lvbiBtYXJrZXJcIilcclxuXHRcdFx0XHRcdC5hZGRPcHRpb24oXCJkYXRlXCIsIFwiRGF0ZSBtYXJrZXJcIilcclxuXHRcdFx0XHRcdC5hZGRPcHRpb24oXCJjdXN0b21cIiwgXCJDdXN0b20gbWFya2VyXCIpXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmNvbXBsZXRlZFRhc2tNb3ZlclxyXG5cdFx0XHRcdFx0XHRcdC50YXNrTWFya2VyVHlwZVxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZTogXCJ2ZXJzaW9uXCIgfCBcImRhdGVcIiB8IFwiY3VzdG9tXCIpID0+IHtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuY29tcGxldGVkVGFza01vdmVyLnRhc2tNYXJrZXJUeXBlID1cclxuXHRcdFx0XHRcdFx0XHR2YWx1ZTtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gU2hvdyBzcGVjaWZpYyBzZXR0aW5ncyBiYXNlZCBvbiBtYXJrZXIgdHlwZVxyXG5cdFx0Y29uc3QgbWFya2VyVHlwZSA9XHJcblx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmNvbXBsZXRlZFRhc2tNb3Zlci50YXNrTWFya2VyVHlwZTtcclxuXHJcblx0XHRpZiAobWFya2VyVHlwZSA9PT0gXCJ2ZXJzaW9uXCIpIHtcclxuXHRcdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdFx0LnNldE5hbWUodChcIlZlcnNpb24gbWFya2VyIHRleHRcIikpXHJcblx0XHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XHRcIlRleHQgdG8gYXBwZW5kIHRvIHRhc2tzIHdoZW4gbW92ZWQgKGUuZy4sICd2ZXJzaW9uIDEuMCcpXCJcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0LmFkZFRleHQoKHRleHQpID0+XHJcblx0XHRcdFx0XHR0ZXh0XHJcblx0XHRcdFx0XHRcdC5zZXRQbGFjZWhvbGRlcihcInZlcnNpb24gMS4wXCIpXHJcblx0XHRcdFx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5jb21wbGV0ZWRUYXNrTW92ZXJcclxuXHRcdFx0XHRcdFx0XHRcdC52ZXJzaW9uTWFya2VyXHJcblx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmNvbXBsZXRlZFRhc2tNb3Zlci52ZXJzaW9uTWFya2VyID1cclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdCk7XHJcblx0XHR9IGVsc2UgaWYgKG1hcmtlclR5cGUgPT09IFwiZGF0ZVwiKSB7XHJcblx0XHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHRcdC5zZXROYW1lKHQoXCJEYXRlIG1hcmtlciB0ZXh0XCIpKVxyXG5cdFx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFx0XCJUZXh0IHRvIGFwcGVuZCB0byB0YXNrcyB3aGVuIG1vdmVkIChlLmcuLCAnYXJjaGl2ZWQgb24gMjAyMy0xMi0zMScpXCJcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0LmFkZFRleHQoKHRleHQpID0+XHJcblx0XHRcdFx0XHR0ZXh0XHJcblx0XHRcdFx0XHRcdC5zZXRQbGFjZWhvbGRlcihcImFyY2hpdmVkIG9uIHt7ZGF0ZX19XCIpXHJcblx0XHRcdFx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5jb21wbGV0ZWRUYXNrTW92ZXJcclxuXHRcdFx0XHRcdFx0XHRcdC5kYXRlTWFya2VyXHJcblx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmNvbXBsZXRlZFRhc2tNb3Zlci5kYXRlTWFya2VyID1cclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdCk7XHJcblx0XHR9IGVsc2UgaWYgKG1hcmtlclR5cGUgPT09IFwiY3VzdG9tXCIpIHtcclxuXHRcdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdFx0LnNldE5hbWUodChcIkN1c3RvbSBtYXJrZXIgdGV4dFwiKSlcclxuXHRcdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcdFwiVXNlIHt7REFURTpmb3JtYXR9fSBmb3IgZGF0ZSBmb3JtYXR0aW5nIChlLmcuLCB7e0RBVEU6WVlZWS1NTS1ERH19XCJcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0LmFkZFRleHQoKHRleHQpID0+XHJcblx0XHRcdFx0XHR0ZXh0XHJcblx0XHRcdFx0XHRcdC5zZXRQbGFjZWhvbGRlcihcIm1vdmVkIHt7REFURTpZWVlZLU1NLUREIEhIOm1tfX1cIilcclxuXHRcdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmNvbXBsZXRlZFRhc2tNb3ZlclxyXG5cdFx0XHRcdFx0XHRcdFx0LmN1c3RvbU1hcmtlclxyXG5cdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5jb21wbGV0ZWRUYXNrTW92ZXIuY3VzdG9tTWFya2VyID1cclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJUcmVhdCBhYmFuZG9uZWQgdGFza3MgYXMgY29tcGxldGVkXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHR0KFwiSWYgZW5hYmxlZCwgYWJhbmRvbmVkIHRhc2tzIHdpbGwgYmUgdHJlYXRlZCBhcyBjb21wbGV0ZWQuXCIpXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XHJcblx0XHRcdFx0dG9nZ2xlLnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuY29tcGxldGVkVGFza01vdmVyXHJcblx0XHRcdFx0XHRcdC50cmVhdEFiYW5kb25lZEFzQ29tcGxldGVkXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHR0b2dnbGUub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5jb21wbGV0ZWRUYXNrTW92ZXIudHJlYXRBYmFuZG9uZWRBc0NvbXBsZXRlZCA9XHJcblx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiQ29tcGxldGUgYWxsIG1vdmVkIHRhc2tzXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHR0KFwiSWYgZW5hYmxlZCwgYWxsIG1vdmVkIHRhc2tzIHdpbGwgYmUgbWFya2VkIGFzIGNvbXBsZXRlZC5cIilcclxuXHRcdFx0KVxyXG5cdFx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcclxuXHRcdFx0XHR0b2dnbGUuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5jb21wbGV0ZWRUYXNrTW92ZXJcclxuXHRcdFx0XHRcdFx0LmNvbXBsZXRlQWxsTW92ZWRUYXNrc1xyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0dG9nZ2xlLm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuY29tcGxldGVkVGFza01vdmVyLmNvbXBsZXRlQWxsTW92ZWRUYXNrcyA9XHJcblx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiV2l0aCBjdXJyZW50IGZpbGUgbGlua1wiKSlcclxuXHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFwiQSBsaW5rIHRvIHRoZSBjdXJyZW50IGZpbGUgd2lsbCBiZSBhZGRlZCB0byB0aGUgcGFyZW50IHRhc2sgb2YgdGhlIG1vdmVkIHRhc2tzLlwiXHJcblx0XHRcdFx0KVxyXG5cdFx0XHQpXHJcblx0XHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xyXG5cdFx0XHRcdHRvZ2dsZS5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmNvbXBsZXRlZFRhc2tNb3ZlclxyXG5cdFx0XHRcdFx0XHQud2l0aEN1cnJlbnRGaWxlTGlua1xyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0dG9nZ2xlLm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuY29tcGxldGVkVGFza01vdmVyLndpdGhDdXJyZW50RmlsZUxpbmsgPVxyXG5cdFx0XHRcdFx0XHR2YWx1ZTtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHQvLyBBdXRvLW1vdmUgc2V0dGluZ3MgZm9yIGNvbXBsZXRlZCB0YXNrc1xyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJFbmFibGUgYXV0by1tb3ZlIGZvciBjb21wbGV0ZWQgdGFza3NcIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcIkF1dG9tYXRpY2FsbHkgbW92ZSBjb21wbGV0ZWQgdGFza3MgdG8gYSBkZWZhdWx0IGZpbGUgd2l0aG91dCBtYW51YWwgc2VsZWN0aW9uLlwiXHJcblx0XHRcdFx0KVxyXG5cdFx0XHQpXHJcblx0XHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xyXG5cdFx0XHRcdHRvZ2dsZS5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmNvbXBsZXRlZFRhc2tNb3Zlci5lbmFibGVBdXRvTW92ZVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0dG9nZ2xlLm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuY29tcGxldGVkVGFza01vdmVyLmVuYWJsZUF1dG9Nb3ZlID1cclxuXHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIuZGlzcGxheSgpOyAvLyBSZWZyZXNoIHRvIHNob3cvaGlkZSBhdXRvLW1vdmUgc2V0dGluZ3NcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0aWYgKHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmNvbXBsZXRlZFRhc2tNb3Zlci5lbmFibGVBdXRvTW92ZSkge1xyXG5cdFx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0XHQuc2V0TmFtZSh0KFwiRGVmYXVsdCB0YXJnZXQgZmlsZVwiKSlcclxuXHRcdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcdFwiRGVmYXVsdCBmaWxlIHRvIG1vdmUgY29tcGxldGVkIHRhc2tzIHRvIChlLmcuLCAnQXJjaGl2ZS5tZCcpXCJcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0LmFkZFRleHQoKHRleHQpID0+XHJcblx0XHRcdFx0XHR0ZXh0XHJcblx0XHRcdFx0XHRcdC5zZXRQbGFjZWhvbGRlcihcIkFyY2hpdmUubWRcIilcclxuXHRcdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmNvbXBsZXRlZFRhc2tNb3ZlclxyXG5cdFx0XHRcdFx0XHRcdFx0LmRlZmF1bHRUYXJnZXRGaWxlXHJcblx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmNvbXBsZXRlZFRhc2tNb3Zlci5kZWZhdWx0VGFyZ2V0RmlsZSA9XHJcblx0XHRcdFx0XHRcdFx0XHR2YWx1ZTtcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdFx0fSlcclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdFx0LnNldE5hbWUodChcIkRlZmF1bHQgaW5zZXJ0aW9uIG1vZGVcIikpXHJcblx0XHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0XHR0KFwiV2hlcmUgdG8gaW5zZXJ0IGNvbXBsZXRlZCB0YXNrcyBpbiB0aGUgdGFyZ2V0IGZpbGVcIilcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0LmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xyXG5cdFx0XHRcdFx0ZHJvcGRvd25cclxuXHRcdFx0XHRcdFx0LmFkZE9wdGlvbihcImJlZ2lubmluZ1wiLCB0KFwiQmVnaW5uaW5nIG9mIGZpbGVcIikpXHJcblx0XHRcdFx0XHRcdC5hZGRPcHRpb24oXCJlbmRcIiwgdChcIkVuZCBvZiBmaWxlXCIpKVxyXG5cdFx0XHRcdFx0XHQuYWRkT3B0aW9uKFwiYWZ0ZXItaGVhZGluZ1wiLCB0KFwiQWZ0ZXIgaGVhZGluZ1wiKSlcclxuXHRcdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmNvbXBsZXRlZFRhc2tNb3ZlclxyXG5cdFx0XHRcdFx0XHRcdFx0LmRlZmF1bHRJbnNlcnRpb25Nb2RlXHJcblx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0Lm9uQ2hhbmdlKFxyXG5cdFx0XHRcdFx0XHRcdGFzeW5jIChcclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlOiBcImJlZ2lubmluZ1wiIHwgXCJlbmRcIiB8IFwiYWZ0ZXItaGVhZGluZ1wiXHJcblx0XHRcdFx0XHRcdFx0KSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5jb21wbGV0ZWRUYXNrTW92ZXIuZGVmYXVsdEluc2VydGlvbk1vZGUgPVxyXG5cdFx0XHRcdFx0XHRcdFx0XHR2YWx1ZTtcclxuXHRcdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5kaXNwbGF5KCk7IC8vIFJlZnJlc2ggdG8gc2hvdy9oaWRlIGhlYWRpbmcgc2V0dGluZ1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5jb21wbGV0ZWRUYXNrTW92ZXJcclxuXHRcdFx0XHRcdC5kZWZhdWx0SW5zZXJ0aW9uTW9kZSA9PT0gXCJhZnRlci1oZWFkaW5nXCJcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdFx0XHQuc2V0TmFtZSh0KFwiRGVmYXVsdCBoZWFkaW5nIG5hbWVcIikpXHJcblx0XHRcdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFx0XHRcIkhlYWRpbmcgbmFtZSB0byBpbnNlcnQgdGFza3MgYWZ0ZXIgKHdpbGwgYmUgY3JlYXRlZCBpZiBpdCBkb2Vzbid0IGV4aXN0KVwiXHJcblx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdC5hZGRUZXh0KCh0ZXh0KSA9PlxyXG5cdFx0XHRcdFx0XHR0ZXh0XHJcblx0XHRcdFx0XHRcdFx0LnNldFBsYWNlaG9sZGVyKFwiQ29tcGxldGVkIFRhc2tzXCIpXHJcblx0XHRcdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuY29tcGxldGVkVGFza01vdmVyXHJcblx0XHRcdFx0XHRcdFx0XHRcdC5kZWZhdWx0SGVhZGluZ05hbWVcclxuXHRcdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuY29tcGxldGVkVGFza01vdmVyLmRlZmF1bHRIZWFkaW5nTmFtZSA9XHJcblx0XHRcdFx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHRcdFx0fSlcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIEFkZCBJbmNvbXBsZXRlIFRhc2sgTW92ZXIgc2V0dGluZ3NcclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZSh0KFwiSW5jb21wbGV0ZSBUYXNrIE1vdmVyXCIpKS5zZXRIZWFkaW5nKCk7XHJcblxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIkVuYWJsZSBpbmNvbXBsZXRlIHRhc2sgbW92ZXJcIikpXHJcblx0XHQuc2V0RGVzYyhcclxuXHRcdFx0dChcclxuXHRcdFx0XHRcIlRvZ2dsZSB0aGlzIHRvIGVuYWJsZSBjb21tYW5kcyBmb3IgbW92aW5nIGluY29tcGxldGUgdGFza3MgdG8gYW5vdGhlciBmaWxlLlwiXHJcblx0XHRcdClcclxuXHRcdClcclxuXHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT5cclxuXHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuY29tcGxldGVkVGFza01vdmVyXHJcblx0XHRcdFx0XHRcdC5lbmFibGVJbmNvbXBsZXRlZFRhc2tNb3ZlclxyXG5cdFx0XHRcdClcclxuXHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5jb21wbGV0ZWRUYXNrTW92ZXIuZW5hYmxlSW5jb21wbGV0ZWRUYXNrTW92ZXIgPVxyXG5cdFx0XHRcdFx0XHR2YWx1ZTtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdH0pXHJcblx0XHQpO1xyXG5cclxuXHRpZiAoXHJcblx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5jb21wbGV0ZWRUYXNrTW92ZXIuZW5hYmxlSW5jb21wbGV0ZWRUYXNrTW92ZXJcclxuXHQpIHtcclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiSW5jb21wbGV0ZSB0YXNrIG1hcmtlciB0eXBlXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHR0KFwiQ2hvb3NlIHdoYXQgdHlwZSBvZiBtYXJrZXIgdG8gYWRkIHRvIG1vdmVkIGluY29tcGxldGUgdGFza3NcIilcclxuXHRcdFx0KVxyXG5cdFx0XHQuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XHJcblx0XHRcdFx0ZHJvcGRvd25cclxuXHRcdFx0XHRcdC5hZGRPcHRpb24oXCJ2ZXJzaW9uXCIsIFwiVmVyc2lvbiBtYXJrZXJcIilcclxuXHRcdFx0XHRcdC5hZGRPcHRpb24oXCJkYXRlXCIsIFwiRGF0ZSBtYXJrZXJcIilcclxuXHRcdFx0XHRcdC5hZGRPcHRpb24oXCJjdXN0b21cIiwgXCJDdXN0b20gbWFya2VyXCIpXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmNvbXBsZXRlZFRhc2tNb3ZlclxyXG5cdFx0XHRcdFx0XHRcdC5pbmNvbXBsZXRlZFRhc2tNYXJrZXJUeXBlXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlOiBcInZlcnNpb25cIiB8IFwiZGF0ZVwiIHwgXCJjdXN0b21cIikgPT4ge1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5jb21wbGV0ZWRUYXNrTW92ZXIuaW5jb21wbGV0ZWRUYXNrTWFya2VyVHlwZSA9XHJcblx0XHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdC8vIFNob3cgc3BlY2lmaWMgc2V0dGluZ3MgYmFzZWQgb24gbWFya2VyIHR5cGVcclxuXHRcdGNvbnN0IGluY29tcGxldGVkTWFya2VyVHlwZSA9XHJcblx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmNvbXBsZXRlZFRhc2tNb3ZlclxyXG5cdFx0XHRcdC5pbmNvbXBsZXRlZFRhc2tNYXJrZXJUeXBlO1xyXG5cclxuXHRcdGlmIChpbmNvbXBsZXRlZE1hcmtlclR5cGUgPT09IFwidmVyc2lvblwiKSB7XHJcblx0XHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHRcdC5zZXROYW1lKHQoXCJJbmNvbXBsZXRlIHZlcnNpb24gbWFya2VyIHRleHRcIikpXHJcblx0XHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XHRcIlRleHQgdG8gYXBwZW5kIHRvIGluY29tcGxldGUgdGFza3Mgd2hlbiBtb3ZlZCAoZS5nLiwgJ3ZlcnNpb24gMS4wJylcIlxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdClcclxuXHRcdFx0XHQuYWRkVGV4dCgodGV4dCkgPT5cclxuXHRcdFx0XHRcdHRleHRcclxuXHRcdFx0XHRcdFx0LnNldFBsYWNlaG9sZGVyKFwidmVyc2lvbiAxLjBcIilcclxuXHRcdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmNvbXBsZXRlZFRhc2tNb3ZlclxyXG5cdFx0XHRcdFx0XHRcdFx0LmluY29tcGxldGVkVmVyc2lvbk1hcmtlclxyXG5cdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5jb21wbGV0ZWRUYXNrTW92ZXIuaW5jb21wbGV0ZWRWZXJzaW9uTWFya2VyID1cclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdCk7XHJcblx0XHR9IGVsc2UgaWYgKGluY29tcGxldGVkTWFya2VyVHlwZSA9PT0gXCJkYXRlXCIpIHtcclxuXHRcdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdFx0LnNldE5hbWUodChcIkluY29tcGxldGUgZGF0ZSBtYXJrZXIgdGV4dFwiKSlcclxuXHRcdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcdFwiVGV4dCB0byBhcHBlbmQgdG8gaW5jb21wbGV0ZSB0YXNrcyB3aGVuIG1vdmVkIChlLmcuLCAnbW92ZWQgb24gMjAyMy0xMi0zMScpXCJcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0LmFkZFRleHQoKHRleHQpID0+XHJcblx0XHRcdFx0XHR0ZXh0XHJcblx0XHRcdFx0XHRcdC5zZXRQbGFjZWhvbGRlcihcIm1vdmVkIG9uIHt7ZGF0ZX19XCIpXHJcblx0XHRcdFx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5jb21wbGV0ZWRUYXNrTW92ZXJcclxuXHRcdFx0XHRcdFx0XHRcdC5pbmNvbXBsZXRlZERhdGVNYXJrZXJcclxuXHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuY29tcGxldGVkVGFza01vdmVyLmluY29tcGxldGVkRGF0ZU1hcmtlciA9XHJcblx0XHRcdFx0XHRcdFx0XHR2YWx1ZTtcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdFx0fSlcclxuXHRcdFx0XHQpO1xyXG5cdFx0fSBlbHNlIGlmIChpbmNvbXBsZXRlZE1hcmtlclR5cGUgPT09IFwiY3VzdG9tXCIpIHtcclxuXHRcdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdFx0LnNldE5hbWUodChcIkluY29tcGxldGUgY3VzdG9tIG1hcmtlciB0ZXh0XCIpKVxyXG5cdFx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFx0XCJVc2Uge3tEQVRFOmZvcm1hdH19IGZvciBkYXRlIGZvcm1hdHRpbmcgKGUuZy4sIHt7REFURTpZWVlZLU1NLUREfX1cIlxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdClcclxuXHRcdFx0XHQuYWRkVGV4dCgodGV4dCkgPT5cclxuXHRcdFx0XHRcdHRleHRcclxuXHRcdFx0XHRcdFx0LnNldFBsYWNlaG9sZGVyKFwibW92ZWQge3tEQVRFOllZWVktTU0tREQgSEg6bW19fVwiKVxyXG5cdFx0XHRcdFx0XHQuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuY29tcGxldGVkVGFza01vdmVyXHJcblx0XHRcdFx0XHRcdFx0XHQuaW5jb21wbGV0ZWRDdXN0b21NYXJrZXJcclxuXHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuY29tcGxldGVkVGFza01vdmVyLmluY29tcGxldGVkQ3VzdG9tTWFya2VyID1cclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJXaXRoIGN1cnJlbnQgZmlsZSBsaW5rIGZvciBpbmNvbXBsZXRlIHRhc2tzXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XCJBIGxpbmsgdG8gdGhlIGN1cnJlbnQgZmlsZSB3aWxsIGJlIGFkZGVkIHRvIHRoZSBwYXJlbnQgdGFzayBvZiB0aGUgbW92ZWQgaW5jb21wbGV0ZSB0YXNrcy5cIlxyXG5cdFx0XHRcdClcclxuXHRcdFx0KVxyXG5cdFx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcclxuXHRcdFx0XHR0b2dnbGUuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5jb21wbGV0ZWRUYXNrTW92ZXJcclxuXHRcdFx0XHRcdFx0LndpdGhDdXJyZW50RmlsZUxpbmtGb3JJbmNvbXBsZXRlZFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0dG9nZ2xlLm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuY29tcGxldGVkVGFza01vdmVyLndpdGhDdXJyZW50RmlsZUxpbmtGb3JJbmNvbXBsZXRlZCA9XHJcblx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdC8vIEF1dG8tbW92ZSBzZXR0aW5ncyBmb3IgaW5jb21wbGV0ZSB0YXNrc1xyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJFbmFibGUgYXV0by1tb3ZlIGZvciBpbmNvbXBsZXRlIHRhc2tzXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XCJBdXRvbWF0aWNhbGx5IG1vdmUgaW5jb21wbGV0ZSB0YXNrcyB0byBhIGRlZmF1bHQgZmlsZSB3aXRob3V0IG1hbnVhbCBzZWxlY3Rpb24uXCJcclxuXHRcdFx0XHQpXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XHJcblx0XHRcdFx0dG9nZ2xlLnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuY29tcGxldGVkVGFza01vdmVyXHJcblx0XHRcdFx0XHRcdC5lbmFibGVJbmNvbXBsZXRlZEF1dG9Nb3ZlXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHR0b2dnbGUub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5jb21wbGV0ZWRUYXNrTW92ZXIuZW5hYmxlSW5jb21wbGV0ZWRBdXRvTW92ZSA9XHJcblx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLmRpc3BsYXkoKTsgLy8gUmVmcmVzaCB0byBzaG93L2hpZGUgYXV0by1tb3ZlIHNldHRpbmdzXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdGlmIChcclxuXHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuY29tcGxldGVkVGFza01vdmVyXHJcblx0XHRcdFx0LmVuYWJsZUluY29tcGxldGVkQXV0b01vdmVcclxuXHRcdCkge1xyXG5cdFx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0XHQuc2V0TmFtZSh0KFwiRGVmYXVsdCB0YXJnZXQgZmlsZSBmb3IgaW5jb21wbGV0ZSB0YXNrc1wiKSlcclxuXHRcdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcdFwiRGVmYXVsdCBmaWxlIHRvIG1vdmUgaW5jb21wbGV0ZSB0YXNrcyB0byAoZS5nLiwgJ0JhY2tsb2cubWQnKVwiXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdFx0KVxyXG5cdFx0XHRcdC5hZGRUZXh0KCh0ZXh0KSA9PlxyXG5cdFx0XHRcdFx0dGV4dFxyXG5cdFx0XHRcdFx0XHQuc2V0UGxhY2Vob2xkZXIoXCJCYWNrbG9nLm1kXCIpXHJcblx0XHRcdFx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5jb21wbGV0ZWRUYXNrTW92ZXJcclxuXHRcdFx0XHRcdFx0XHRcdC5pbmNvbXBsZXRlZERlZmF1bHRUYXJnZXRGaWxlXHJcblx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmNvbXBsZXRlZFRhc2tNb3Zlci5pbmNvbXBsZXRlZERlZmF1bHRUYXJnZXRGaWxlID1cclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0XHQuc2V0TmFtZSh0KFwiRGVmYXVsdCBpbnNlcnRpb24gbW9kZSBmb3IgaW5jb21wbGV0ZSB0YXNrc1wiKSlcclxuXHRcdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHRcdHQoXCJXaGVyZSB0byBpbnNlcnQgaW5jb21wbGV0ZSB0YXNrcyBpbiB0aGUgdGFyZ2V0IGZpbGVcIilcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0LmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xyXG5cdFx0XHRcdFx0ZHJvcGRvd25cclxuXHRcdFx0XHRcdFx0LmFkZE9wdGlvbihcImJlZ2lubmluZ1wiLCB0KFwiQmVnaW5uaW5nIG9mIGZpbGVcIikpXHJcblx0XHRcdFx0XHRcdC5hZGRPcHRpb24oXCJlbmRcIiwgdChcIkVuZCBvZiBmaWxlXCIpKVxyXG5cdFx0XHRcdFx0XHQuYWRkT3B0aW9uKFwiYWZ0ZXItaGVhZGluZ1wiLCB0KFwiQWZ0ZXIgaGVhZGluZ1wiKSlcclxuXHRcdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmNvbXBsZXRlZFRhc2tNb3ZlclxyXG5cdFx0XHRcdFx0XHRcdFx0LmluY29tcGxldGVkRGVmYXVsdEluc2VydGlvbk1vZGVcclxuXHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHQub25DaGFuZ2UoXHJcblx0XHRcdFx0XHRcdFx0YXN5bmMgKFxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWU6IFwiYmVnaW5uaW5nXCIgfCBcImVuZFwiIHwgXCJhZnRlci1oZWFkaW5nXCJcclxuXHRcdFx0XHRcdFx0XHQpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmNvbXBsZXRlZFRhc2tNb3Zlci5pbmNvbXBsZXRlZERlZmF1bHRJbnNlcnRpb25Nb2RlID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIuZGlzcGxheSgpOyAvLyBSZWZyZXNoIHRvIHNob3cvaGlkZSBoZWFkaW5nIHNldHRpbmdcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuY29tcGxldGVkVGFza01vdmVyXHJcblx0XHRcdFx0XHQuaW5jb21wbGV0ZWREZWZhdWx0SW5zZXJ0aW9uTW9kZSA9PT0gXCJhZnRlci1oZWFkaW5nXCJcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdFx0XHQuc2V0TmFtZSh0KFwiRGVmYXVsdCBoZWFkaW5nIG5hbWUgZm9yIGluY29tcGxldGUgdGFza3NcIikpXHJcblx0XHRcdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFx0XHRcIkhlYWRpbmcgbmFtZSB0byBpbnNlcnQgaW5jb21wbGV0ZSB0YXNrcyBhZnRlciAod2lsbCBiZSBjcmVhdGVkIGlmIGl0IGRvZXNuJ3QgZXhpc3QpXCJcclxuXHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0LmFkZFRleHQoKHRleHQpID0+XHJcblx0XHRcdFx0XHRcdHRleHRcclxuXHRcdFx0XHRcdFx0XHQuc2V0UGxhY2Vob2xkZXIoXCJJbmNvbXBsZXRlIFRhc2tzXCIpXHJcblx0XHRcdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuY29tcGxldGVkVGFza01vdmVyXHJcblx0XHRcdFx0XHRcdFx0XHRcdC5pbmNvbXBsZXRlZERlZmF1bHRIZWFkaW5nTmFtZVxyXG5cdFx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5jb21wbGV0ZWRUYXNrTW92ZXIuaW5jb21wbGV0ZWREZWZhdWx0SGVhZGluZ05hbWUgPVxyXG5cdFx0XHRcdFx0XHRcdFx0XHR2YWx1ZTtcclxuXHRcdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyAtLS0gVGFzayBTb3J0aW5nIFNldHRpbmdzIC0tLVxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIlRhc2sgU29ydGluZ1wiKSlcclxuXHRcdC5zZXREZXNjKHQoXCJDb25maWd1cmUgaG93IHRhc2tzIGFyZSBzb3J0ZWQgaW4gdGhlIGRvY3VtZW50LlwiKSlcclxuXHRcdC5zZXRIZWFkaW5nKCk7XHJcblxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIkVuYWJsZSBUYXNrIFNvcnRpbmdcIikpXHJcblx0XHQuc2V0RGVzYyh0KFwiVG9nZ2xlIHRoaXMgdG8gZW5hYmxlIGNvbW1hbmRzIGZvciBzb3J0aW5nIHRhc2tzLlwiKSlcclxuXHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xyXG5cdFx0XHR0b2dnbGVcclxuXHRcdFx0XHQuc2V0VmFsdWUoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3Muc29ydFRhc2tzKVxyXG5cdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnNvcnRUYXNrcyA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHQvLyBSZWZyZXNoIHRoZSBzZXR0aW5ncyBkaXNwbGF5IHRvIHNob3cvaGlkZSBjcml0ZXJpYSBzZWN0aW9uXHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLmRpc3BsYXkoKTsgLy8gT3IganVzdCB0aGlzIHNlY3Rpb24gaWYgb3B0aW1pemVkXHJcblx0XHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0aWYgKHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnNvcnRUYXNrcykge1xyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJTb3J0IENyaXRlcmlhXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XCJEZWZpbmUgdGhlIG9yZGVyIGluIHdoaWNoIHRhc2tzIHNob3VsZCBiZSBzb3J0ZWQuIENyaXRlcmlhIGFyZSBhcHBsaWVkIHNlcXVlbnRpYWxseS5cIlxyXG5cdFx0XHRcdClcclxuXHRcdFx0KVxyXG5cdFx0XHQuc2V0SGVhZGluZygpO1xyXG5cclxuXHRcdGNvbnN0IGNyaXRlcmlhQ29udGFpbmVyID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInNvcnQtY3JpdGVyaWEtY29udGFpbmVyXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCByZWZyZXNoQ3JpdGVyaWFMaXN0ID0gKCkgPT4ge1xyXG5cdFx0XHRjcml0ZXJpYUNvbnRhaW5lci5lbXB0eSgpO1xyXG5cdFx0XHRjb25zdCBjcml0ZXJpYSA9IHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnNvcnRDcml0ZXJpYSB8fCBbXTtcclxuXHJcblx0XHRcdGlmIChjcml0ZXJpYS5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0XHRjcml0ZXJpYUNvbnRhaW5lci5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHRcdFx0dGV4dDogdChcIk5vIHNvcnQgY3JpdGVyaWEgZGVmaW5lZC4gQWRkIGNyaXRlcmlhIGJlbG93LlwiKSxcclxuXHRcdFx0XHRcdGNsczogXCJzZXR0aW5nLWl0ZW0tZGVzY3JpcHRpb25cIixcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y3JpdGVyaWEuZm9yRWFjaCgoY3JpdGVyaW9uLCBpbmRleCkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IGNyaXRlcmlvblNldHRpbmcgPSBuZXcgU2V0dGluZyhjcml0ZXJpYUNvbnRhaW5lcilcclxuXHRcdFx0XHRcdC5zZXRDbGFzcyhcInNvcnQtY3JpdGVyaW9uLXJvd1wiKVxyXG5cdFx0XHRcdFx0LmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xyXG5cdFx0XHRcdFx0XHRkcm9wZG93blxyXG5cdFx0XHRcdFx0XHRcdC5hZGRPcHRpb24oXCJzdGF0dXNcIiwgdChcIlN0YXR1c1wiKSlcclxuXHRcdFx0XHRcdFx0XHQuYWRkT3B0aW9uKFwicHJpb3JpdHlcIiwgdChcIlByaW9yaXR5XCIpKVxyXG5cdFx0XHRcdFx0XHRcdC5hZGRPcHRpb24oXCJkdWVEYXRlXCIsIHQoXCJEdWUgRGF0ZVwiKSlcclxuXHRcdFx0XHRcdFx0XHQuYWRkT3B0aW9uKFwic3RhcnREYXRlXCIsIHQoXCJTdGFydCBEYXRlXCIpKVxyXG5cdFx0XHRcdFx0XHRcdC5hZGRPcHRpb24oXCJzY2hlZHVsZWREYXRlXCIsIHQoXCJTY2hlZHVsZWQgRGF0ZVwiKSlcclxuXHRcdFx0XHRcdFx0XHQuYWRkT3B0aW9uKFwiY29udGVudFwiLCB0KFwiQ29udGVudFwiKSlcclxuXHRcdFx0XHRcdFx0XHQuYWRkT3B0aW9uKFwibGluZU51bWJlclwiLCB0KFwiTGluZSBOdW1iZXJcIikpXHJcblx0XHRcdFx0XHRcdFx0LnNldFZhbHVlKGNyaXRlcmlvbi5maWVsZClcclxuXHRcdFx0XHRcdFx0XHQub25DaGFuZ2UoKHZhbHVlOiBTb3J0Q3JpdGVyaW9uW1wiZmllbGRcIl0pID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnNvcnRDcml0ZXJpYVtcclxuXHRcdFx0XHRcdFx0XHRcdFx0aW5kZXhcclxuXHRcdFx0XHRcdFx0XHRcdF0uZmllbGQgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSlcclxuXHRcdFx0XHRcdC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcclxuXHRcdFx0XHRcdFx0ZHJvcGRvd25cclxuXHRcdFx0XHRcdFx0XHQuYWRkT3B0aW9uKFwiYXNjXCIsIHQoXCJBc2NlbmRpbmdcIikpIC8vIEFzY2VuZGluZyBtaWdodCBtZWFuIGRpZmZlcmVudCB0aGluZ3MgKGUuZy4sIEhpZ2ggLT4gTG93IGZvciBwcmlvcml0eSlcclxuXHRcdFx0XHRcdFx0XHQuYWRkT3B0aW9uKFwiZGVzY1wiLCB0KFwiRGVzY2VuZGluZ1wiKSkgLy8gRGVzY2VuZGluZyBtaWdodCBtZWFuIGRpZmZlcmVudCB0aGluZ3MgKGUuZy4sIExvdyAtPiBIaWdoIGZvciBwcmlvcml0eSlcclxuXHRcdFx0XHRcdFx0XHQuc2V0VmFsdWUoY3JpdGVyaW9uLm9yZGVyKVxyXG5cdFx0XHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWU6IFNvcnRDcml0ZXJpb25bXCJvcmRlclwiXSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3Muc29ydENyaXRlcmlhW1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRpbmRleFxyXG5cdFx0XHRcdFx0XHRcdFx0XS5vcmRlciA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdC8vIEFkZCB0b29sdGlwcyBleHBsYWluaW5nIHdoYXQgYXNjL2Rlc2MgbWVhbnMgZm9yIGVhY2ggZmllbGQgdHlwZSBpZiBwb3NzaWJsZVxyXG5cdFx0XHRcdFx0XHRpZiAoY3JpdGVyaW9uLmZpZWxkID09PSBcInByaW9yaXR5XCIpIHtcclxuXHRcdFx0XHRcdFx0XHRkcm9wZG93bi5zZWxlY3RFbC50aXRsZSA9IHQoXHJcblx0XHRcdFx0XHRcdFx0XHRcIkFzY2VuZGluZzogSGlnaCAtPiBMb3cgLT4gTm9uZS4gRGVzY2VuZGluZzogTm9uZSAtPiBMb3cgLT4gSGlnaFwiXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0fSBlbHNlIGlmIChcclxuXHRcdFx0XHRcdFx0XHRbXCJkdWVEYXRlXCIsIFwic3RhcnREYXRlXCIsIFwic2NoZWR1bGVkRGF0ZVwiXS5pbmNsdWRlcyhcclxuXHRcdFx0XHRcdFx0XHRcdGNyaXRlcmlvbi5maWVsZFxyXG5cdFx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0ZHJvcGRvd24uc2VsZWN0RWwudGl0bGUgPSB0KFxyXG5cdFx0XHRcdFx0XHRcdFx0XCJBc2NlbmRpbmc6IEVhcmxpZXIgLT4gTGF0ZXIgLT4gTm9uZS4gRGVzY2VuZGluZzogTm9uZSAtPiBMYXRlciAtPiBFYXJsaWVyXCJcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKGNyaXRlcmlvbi5maWVsZCA9PT0gXCJzdGF0dXNcIikge1xyXG5cdFx0XHRcdFx0XHRcdGRyb3Bkb3duLnNlbGVjdEVsLnRpdGxlID0gdChcclxuXHRcdFx0XHRcdFx0XHRcdFwiQXNjZW5kaW5nIHJlc3BlY3RzIHN0YXR1cyBvcmRlciAoT3ZlcmR1ZSBmaXJzdCkuIERlc2NlbmRpbmcgcmV2ZXJzZXMgaXQuXCJcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdGRyb3Bkb3duLnNlbGVjdEVsLnRpdGxlID0gdChcclxuXHRcdFx0XHRcdFx0XHRcdFwiQXNjZW5kaW5nOiBBLVouIERlc2NlbmRpbmc6IFotQVwiXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIENvbnRyb2xzIGZvciByZW9yZGVyaW5nIGFuZCBkZWxldGluZ1xyXG5cdFx0XHRcdGNyaXRlcmlvblNldHRpbmcuYWRkRXh0cmFCdXR0b24oKGJ1dHRvbikgPT4ge1xyXG5cdFx0XHRcdFx0YnV0dG9uXHJcblx0XHRcdFx0XHRcdC5zZXRJY29uKFwiYXJyb3ctdXBcIilcclxuXHRcdFx0XHRcdFx0LnNldFRvb2x0aXAodChcIk1vdmUgVXBcIikpXHJcblx0XHRcdFx0XHRcdC5zZXREaXNhYmxlZChpbmRleCA9PT0gMClcclxuXHRcdFx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdGlmIChpbmRleCA+IDApIHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IGl0ZW0gPVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5zb3J0Q3JpdGVyaWEuc3BsaWNlKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGluZGV4LFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdDFcclxuXHRcdFx0XHRcdFx0XHRcdFx0KVswXTtcclxuXHRcdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnNvcnRDcml0ZXJpYS5zcGxpY2UoXHJcblx0XHRcdFx0XHRcdFx0XHRcdGluZGV4IC0gMSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0MCxcclxuXHRcdFx0XHRcdFx0XHRcdFx0aXRlbVxyXG5cdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHRcdFx0cmVmcmVzaENyaXRlcmlhTGlzdCgpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0Y3JpdGVyaW9uU2V0dGluZy5hZGRFeHRyYUJ1dHRvbigoYnV0dG9uKSA9PiB7XHJcblx0XHRcdFx0XHRidXR0b25cclxuXHRcdFx0XHRcdFx0LnNldEljb24oXCJhcnJvdy1kb3duXCIpXHJcblx0XHRcdFx0XHRcdC5zZXRUb29sdGlwKHQoXCJNb3ZlIERvd25cIikpXHJcblx0XHRcdFx0XHRcdC5zZXREaXNhYmxlZChpbmRleCA9PT0gY3JpdGVyaWEubGVuZ3RoIC0gMSlcclxuXHRcdFx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdGlmIChpbmRleCA8IGNyaXRlcmlhLmxlbmd0aCAtIDEpIHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IGl0ZW0gPVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5zb3J0Q3JpdGVyaWEuc3BsaWNlKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGluZGV4LFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdDFcclxuXHRcdFx0XHRcdFx0XHRcdFx0KVswXTtcclxuXHRcdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnNvcnRDcml0ZXJpYS5zcGxpY2UoXHJcblx0XHRcdFx0XHRcdFx0XHRcdGluZGV4ICsgMSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0MCxcclxuXHRcdFx0XHRcdFx0XHRcdFx0aXRlbVxyXG5cdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHRcdFx0cmVmcmVzaENyaXRlcmlhTGlzdCgpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0Y3JpdGVyaW9uU2V0dGluZy5hZGRFeHRyYUJ1dHRvbigoYnV0dG9uKSA9PiB7XHJcblx0XHRcdFx0XHRidXR0b25cclxuXHRcdFx0XHRcdFx0LnNldEljb24oXCJ0cmFzaFwiKVxyXG5cdFx0XHRcdFx0XHQuc2V0VG9vbHRpcCh0KFwiUmVtb3ZlIENyaXRlcmlvblwiKSlcclxuXHRcdFx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnNvcnRDcml0ZXJpYS5zcGxpY2UoXHJcblx0XHRcdFx0XHRcdFx0XHRpbmRleCxcclxuXHRcdFx0XHRcdFx0XHRcdDFcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHRcdHJlZnJlc2hDcml0ZXJpYUxpc3QoKTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHQvLyBBZGQgY2xhc3MgdG8gdGhlIGNvbnRhaW5lciBlbGVtZW50IG9mIHRoZSBleHRyYSBidXR0b25cclxuXHRcdFx0XHRcdGJ1dHRvbi5leHRyYVNldHRpbmdzRWwuYWRkQ2xhc3MoXCJtb2Qtd2FybmluZ1wiKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBCdXR0b24gdG8gYWRkIGEgbmV3IGNyaXRlcmlvblxyXG5cdFx0XHRuZXcgU2V0dGluZyhjcml0ZXJpYUNvbnRhaW5lcilcclxuXHRcdFx0XHQuYWRkQnV0dG9uKChidXR0b24pID0+IHtcclxuXHRcdFx0XHRcdGJ1dHRvblxyXG5cdFx0XHRcdFx0XHQuc2V0QnV0dG9uVGV4dCh0KFwiQWRkIFNvcnQgQ3JpdGVyaW9uXCIpKVxyXG5cdFx0XHRcdFx0XHQuc2V0Q3RhKClcclxuXHRcdFx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IG5ld0NyaXRlcmlvbjogU29ydENyaXRlcmlvbiA9IHtcclxuXHRcdFx0XHRcdFx0XHRcdGZpZWxkOiBcInN0YXR1c1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0b3JkZXI6IFwiYXNjXCIsXHJcblx0XHRcdFx0XHRcdFx0fTtcclxuXHRcdFx0XHRcdFx0XHRpZiAoIXNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnNvcnRDcml0ZXJpYSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3Muc29ydENyaXRlcmlhID0gW107XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnNvcnRDcml0ZXJpYS5wdXNoKFxyXG5cdFx0XHRcdFx0XHRcdFx0bmV3Q3JpdGVyaW9uXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdFx0XHRyZWZyZXNoQ3JpdGVyaWFMaXN0KCk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0pXHJcblx0XHRcdFx0LmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XHJcblx0XHRcdFx0XHQvLyBCdXR0b24gdG8gcmVzZXQgdG8gZGVmYXVsdHNcclxuXHRcdFx0XHRcdGJ1dHRvbi5zZXRCdXR0b25UZXh0KHQoXCJSZXNldCB0byBEZWZhdWx0c1wiKSkub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIE9wdGlvbmFsOiBBZGQgY29uZmlybWF0aW9uIGRpYWxvZyBoZXJlXHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnNvcnRDcml0ZXJpYSA9IFtcclxuXHRcdFx0XHRcdFx0XHQuLi5ERUZBVUxUX1NFVFRJTkdTLnNvcnRDcml0ZXJpYSxcclxuXHRcdFx0XHRcdFx0XTsgLy8gVXNlIHNwcmVhZCB0byBjb3B5XHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHRyZWZyZXNoQ3JpdGVyaWFMaXN0KCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdH07XHJcblxyXG5cdFx0cmVmcmVzaENyaXRlcmlhTGlzdCgpOyAvLyBJbml0aWFsIHJlbmRlclxyXG5cdH1cclxuXHJcblx0Ly8gQWRkIE9uQ29tcGxldGlvbiBzZXR0aW5nc1xyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKHQoXCJPbiBDb21wbGV0aW9uXCIpKS5zZXRIZWFkaW5nKCk7XHJcblxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIkVuYWJsZSBPbkNvbXBsZXRpb25cIikpXHJcblx0XHQuc2V0RGVzYyh0KFwiRW5hYmxlIGF1dG9tYXRpYyBhY3Rpb25zIHdoZW4gdGFza3MgYXJlIGNvbXBsZXRlZFwiKSlcclxuXHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT5cclxuXHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3Mub25Db21wbGV0aW9uLmVuYWJsZU9uQ29tcGxldGlvblxyXG5cdFx0XHRcdClcclxuXHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5vbkNvbXBsZXRpb24uZW5hYmxlT25Db21wbGV0aW9uID1cclxuXHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIuZGlzcGxheSgpOyAvLyBSZWZyZXNoIHRvIHNob3cvaGlkZSBvbkNvbXBsZXRpb24gc2V0dGluZ3NcclxuXHRcdFx0XHR9KVxyXG5cdFx0KTtcclxuXHJcblx0aWYgKHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLm9uQ29tcGxldGlvbi5lbmFibGVPbkNvbXBsZXRpb24pIHtcclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiRGVmYXVsdCBBcmNoaXZlIEZpbGVcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJEZWZhdWx0IGZpbGUgZm9yIGFyY2hpdmUgYWN0aW9uXCIpKVxyXG5cdFx0XHQuYWRkVGV4dCgodGV4dCkgPT5cclxuXHRcdFx0XHR0ZXh0XHJcblx0XHRcdFx0XHQuc2V0UGxhY2Vob2xkZXIoXCJBcmNoaXZlL0NvbXBsZXRlZCBUYXNrcy5tZFwiKVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5vbkNvbXBsZXRpb24uZGVmYXVsdEFyY2hpdmVGaWxlXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLm9uQ29tcGxldGlvbi5kZWZhdWx0QXJjaGl2ZUZpbGUgPVxyXG5cdFx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJEZWZhdWx0IEFyY2hpdmUgU2VjdGlvblwiKSlcclxuXHRcdFx0LnNldERlc2ModChcIkRlZmF1bHQgc2VjdGlvbiBmb3IgYXJjaGl2ZSBhY3Rpb25cIikpXHJcblx0XHRcdC5hZGRUZXh0KCh0ZXh0KSA9PlxyXG5cdFx0XHRcdHRleHRcclxuXHRcdFx0XHRcdC5zZXRQbGFjZWhvbGRlcihcIkNvbXBsZXRlZCBUYXNrc1wiKVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5vbkNvbXBsZXRpb24uZGVmYXVsdEFyY2hpdmVTZWN0aW9uXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLm9uQ29tcGxldGlvbi5kZWZhdWx0QXJjaGl2ZVNlY3Rpb24gPVxyXG5cdFx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJTaG93IEFkdmFuY2VkIE9wdGlvbnNcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJTaG93IGFkdmFuY2VkIGNvbmZpZ3VyYXRpb24gb3B0aW9ucyBpbiB0YXNrIGVkaXRvcnNcIikpXHJcblx0XHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT5cclxuXHRcdFx0XHR0b2dnbGVcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3Mub25Db21wbGV0aW9uLnNob3dBZHZhbmNlZE9wdGlvbnNcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3Mub25Db21wbGV0aW9uLnNob3dBZHZhbmNlZE9wdGlvbnMgPVxyXG5cdFx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdCk7XHJcblx0fVxyXG59XHJcbiJdfQ==