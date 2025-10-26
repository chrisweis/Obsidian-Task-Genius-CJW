import { __awaiter } from "tslib";
import { Modal, Setting } from "obsidian";
import { t } from "@/translations/helper";
import { migrateOldFilterOptions } from "@/editor-extensions/core/task-filter-panel";
import { generateUniqueId } from "@/utils/id-generator";
class PresetFilterModal extends Modal {
    constructor(app, preset, onSave) {
        super(app);
        this.preset = preset;
        this.onSave = onSave;
        // Migrate old preset options if needed
        if (this.preset && this.preset.options) {
            this.preset.options = migrateOldFilterOptions(this.preset.options);
        }
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        // Set modal title
        this.titleEl.setText(t("Edit Filter: ") + this.preset.name);
        // Create form for filter options
        new Setting(contentEl).setName(t("Filter name")).addText((text) => {
            text.setValue(this.preset.name).onChange((value) => {
                this.preset.name = value;
            });
        });
        // Task status section
        new Setting(contentEl)
            .setName(t("Checkbox Status"))
            .setDesc(t("Include or exclude tasks based on their status"));
        const statusOptions = [
            { id: "includeCompleted", name: t("Include Completed Tasks") },
            { id: "includeInProgress", name: t("Include In Progress Tasks") },
            { id: "includeAbandoned", name: t("Include Abandoned Tasks") },
            { id: "includeNotStarted", name: t("Include Not Started Tasks") },
            { id: "includePlanned", name: t("Include Planned Tasks") },
        ];
        for (const option of statusOptions) {
            new Setting(contentEl).setName(option.name).addToggle((toggle) => {
                toggle
                    .setValue(this.preset.options[option.id])
                    .onChange((value) => {
                    this.preset.options[option.id] = value;
                });
            });
        }
        // Related tasks section
        new Setting(contentEl)
            .setName(t("Related Tasks"))
            .setDesc(t("Include parent, child, and sibling tasks in the filter"));
        const relatedOptions = [
            { id: "includeParentTasks", name: t("Include Parent Tasks") },
            { id: "includeChildTasks", name: t("Include Child Tasks") },
            { id: "includeSiblingTasks", name: t("Include Sibling Tasks") },
        ];
        for (const option of relatedOptions) {
            new Setting(contentEl).setName(option.name).addToggle((toggle) => {
                toggle
                    .setValue(this.preset.options[option.id])
                    .onChange((value) => {
                    this.preset.options[option.id] = value;
                });
            });
        }
        // Advanced filter section
        new Setting(contentEl)
            .setName(t("Advanced Filter"))
            .setDesc(t("Use boolean operations: AND, OR, NOT. Example: 'text content AND #tag1'"));
        new Setting(contentEl)
            .setName(t("Filter query"))
            .setDesc(t("Use boolean operations: AND, OR, NOT. Example: 'text content AND #tag1'"))
            .addText((text) => {
            text.setValue(this.preset.options.advancedFilterQuery).onChange((value) => {
                this.preset.options.advancedFilterQuery = value;
            });
        });
        new Setting(contentEl)
            .setName(t("Filter Mode"))
            .setDesc(t("Choose whether to show or hide tasks that match the filters"))
            .addDropdown((dropdown) => {
            dropdown
                .addOption("INCLUDE", t("Show matching tasks"))
                .addOption("EXCLUDE", t("Hide matching tasks"))
                .setValue(this.preset.options.filterMode || "INCLUDE")
                .onChange((value) => {
                this.preset.options.filterMode = value;
            });
        });
        // Save and cancel buttons
        new Setting(contentEl)
            .addButton((button) => {
            button
                .setButtonText(t("Save"))
                .setCta()
                .onClick(() => {
                this.onSave();
                this.close();
            });
        })
            .addButton((button) => {
            button.setButtonText(t("Cancel")).onClick(() => {
                this.close();
            });
        });
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
export function renderTaskFilterSettingsTab(settingTab, containerEl) {
    new Setting(containerEl).setName(t("Task Filter")).setHeading();
    new Setting(containerEl)
        .setName(t("Enable Task Filter"))
        .setDesc(t("Toggle this to enable the task filter panel"))
        .addToggle((toggle) => {
        toggle
            .setValue(settingTab.plugin.settings.taskFilter.enableTaskFilter)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.taskFilter.enableTaskFilter =
                value;
            settingTab.applySettingsUpdate();
        }));
    });
    // Preset filters section
    new Setting(containerEl)
        .setName(t("Preset Filters"))
        .setDesc(t("Create and manage preset filters for quick access to commonly used task filters."));
    // Add a container for the preset filters
    const presetFiltersContainer = containerEl.createDiv({
        cls: "preset-filters-container",
    });
    // Function to refresh the preset filters list
    const refreshPresetFiltersList = () => {
        // Clear the container
        presetFiltersContainer.empty();
        // Get current preset filters
        const presetFilters = settingTab.plugin.settings.taskFilter.presetTaskFilters;
        if (presetFilters.length === 0) {
            presetFiltersContainer.createEl("div", {
                cls: "no-presets-message",
                text: t("No preset filters created yet. Click 'Add New Preset' to create one."),
            });
        }
        // Add each preset filter in the list
        presetFilters.forEach((preset, index) => {
            const presetRow = presetFiltersContainer.createDiv({
                cls: "preset-filter-row",
            });
            // Create the setting
            const presetSetting = new Setting(presetRow)
                .setName(`${t("Preset")} #${index + 1}`)
                .addText((text) => {
                text.setValue(preset.name)
                    .setPlaceholder(t("Preset name"))
                    .onChange((value) => {
                    preset.name = value;
                    settingTab.applySettingsUpdate();
                });
            });
            // Add buttons for editing, removing
            presetSetting.addExtraButton((button) => {
                button
                    .setIcon("pencil")
                    .setTooltip(t("Edit Filter"))
                    .onClick(() => {
                    // Show modal to edit filter options
                    new PresetFilterModal(settingTab.app, preset, () => {
                        settingTab.applySettingsUpdate();
                        refreshPresetFiltersList();
                    }).open();
                });
            });
            presetSetting.addExtraButton((button) => {
                button
                    .setIcon("trash")
                    .setTooltip(t("Remove"))
                    .onClick(() => {
                    // Remove the preset
                    presetFilters.splice(index, 1);
                    settingTab.applySettingsUpdate();
                    refreshPresetFiltersList();
                });
            });
        });
        // Add button to add new preset
        const addButtonContainer = presetFiltersContainer.createDiv();
        new Setting(addButtonContainer)
            .addButton((button) => {
            button
                .setButtonText(t("Add New Preset"))
                .setCta()
                .onClick(() => {
                // Add a new preset with default options
                const newPreset = {
                    id: generateUniqueId(),
                    name: t("New Filter"),
                    options: {
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
                    },
                };
                settingTab.plugin.settings.taskFilter.presetTaskFilters.push(newPreset);
                settingTab.applySettingsUpdate();
                // Open the edit modal for the new preset
                new PresetFilterModal(settingTab.app, newPreset, () => {
                    settingTab.applySettingsUpdate();
                    refreshPresetFiltersList();
                }).open();
                refreshPresetFiltersList();
            });
        })
            .addButton((button) => {
            button
                .setButtonText(t("Reset to Default Presets"))
                .onClick(() => {
                // Show confirmation modal
                const modal = new Modal(settingTab.app);
                modal.titleEl.setText(t("Reset to Default Presets"));
                const content = modal.contentEl.createDiv();
                content.setText(t("This will replace all your current presets with the default set. Are you sure?"));
                const buttonContainer = modal.contentEl.createDiv({
                    cls: "tg-modal-button-container modal-button-container",
                });
                const cancelButton = buttonContainer.createEl("button");
                cancelButton.setText(t("Cancel"));
                cancelButton.addEventListener("click", () => {
                    modal.close();
                });
                const confirmButton = buttonContainer.createEl("button");
                confirmButton.setText(t("Reset"));
                confirmButton.addClass("mod-warning");
                confirmButton.addEventListener("click", () => {
                    createDefaultPresetFilters(settingTab);
                    refreshPresetFiltersList();
                    modal.close();
                });
                modal.open();
            });
        });
    };
    // Initial render of the preset filters list
    refreshPresetFiltersList();
}
function createDefaultPresetFilters(settingTab) {
    // Clear existing presets if any
    settingTab.plugin.settings.taskFilter.presetTaskFilters = [];
    // Add default presets
    const defaultPresets = [
        {
            id: generateUniqueId(),
            name: t("Incomplete tasks"),
            options: {
                includeCompleted: false,
                includeInProgress: true,
                includeAbandoned: false,
                includeNotStarted: true,
                includePlanned: true,
                includeParentTasks: true,
                includeChildTasks: true,
                includeSiblingTasks: false,
                advancedFilterQuery: "",
                filterMode: "INCLUDE",
            },
        },
        {
            id: generateUniqueId(),
            name: t("In progress tasks"),
            options: {
                includeCompleted: false,
                includeInProgress: true,
                includeAbandoned: false,
                includeNotStarted: false,
                includePlanned: false,
                includeParentTasks: true,
                includeChildTasks: true,
                includeSiblingTasks: false,
                advancedFilterQuery: "",
                filterMode: "INCLUDE",
            },
        },
        {
            id: generateUniqueId(),
            name: t("Completed tasks"),
            options: {
                includeCompleted: true,
                includeInProgress: false,
                includeAbandoned: false,
                includeNotStarted: false,
                includePlanned: false,
                includeParentTasks: false,
                includeChildTasks: true,
                includeSiblingTasks: false,
                advancedFilterQuery: "",
                filterMode: "INCLUDE",
            },
        },
        {
            id: generateUniqueId(),
            name: t("All tasks"),
            options: {
                includeCompleted: true,
                includeInProgress: true,
                includeAbandoned: true,
                includeNotStarted: true,
                includePlanned: true,
                includeParentTasks: true,
                includeChildTasks: true,
                includeSiblingTasks: true,
                advancedFilterQuery: "",
                filterMode: "INCLUDE",
            },
        },
    ];
    // Add default presets to settings
    settingTab.plugin.settings.taskFilter.presetTaskFilters = defaultPresets;
    settingTab.applySettingsUpdate();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGFza0ZpbHRlclNldHRpbmdzVGFiLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiVGFza0ZpbHRlclNldHRpbmdzVGFiLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBQU8sS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUMvQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFMUMsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDckYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFFeEQsTUFBTSxpQkFBa0IsU0FBUSxLQUFLO0lBQ3BDLFlBQVksR0FBUSxFQUFVLE1BQVcsRUFBVSxNQUFrQjtRQUNwRSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFEa0IsV0FBTSxHQUFOLE1BQU0sQ0FBSztRQUFVLFdBQU0sR0FBTixNQUFNLENBQVk7UUFFcEUsdUNBQXVDO1FBQ3ZDLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRTtZQUN2QyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sR0FBRyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQ25FO0lBQ0YsQ0FBQztJQUVELE1BQU07UUFDTCxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBQzNCLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUVsQixrQkFBa0I7UUFDbEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFNUQsaUNBQWlDO1FBQ2pDLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENB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WUFDQyxFQUFFLEVBQUUsZ0JBQWdCLEVBQUU7WUFDdEIsSUFBSSxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUM7WUFDcEIsT0FBTyxFQUFFO2dCQUNSLGdCQUFnQixFQUFFLElBQUk7Z0JBQ3RCLGlCQUFpQixFQUFFLElBQUk7Z0JBQ3ZCLGdCQUFnQixFQUFFLElBQUk7Z0JBQ3RCLGlCQUFpQixFQUFFLElBQUk7Z0JBQ3ZCLGNBQWMsRUFBRSxJQUFJO2dCQUNwQixrQkFBa0IsRUFBRSxJQUFJO2dCQUN4QixpQkFBaUIsRUFBRSxJQUFJO2dCQUN2QixtQkFBbUIsRUFBRSxJQUFJO2dCQUN6QixtQkFBbUIsRUFBRSxFQUFFO2dCQUN2QixVQUFVLEVBQUUsU0FBa0M7YUFDOUM7U0FDRDtLQUNELENBQUM7SUFFRixrQ0FBa0M7SUFDbEMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLGlCQUFpQixHQUFHLGNBQWMsQ0FBQztJQUN6RSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztBQUNsQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwLCBNb2RhbCwgU2V0dGluZyB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgeyBUYXNrUHJvZ3Jlc3NCYXJTZXR0aW5nVGFiIH0gZnJvbSBcIkAvc2V0dGluZ1wiO1xyXG5pbXBvcnQgeyBtaWdyYXRlT2xkRmlsdGVyT3B0aW9ucyB9IGZyb20gXCJAL2VkaXRvci1leHRlbnNpb25zL2NvcmUvdGFzay1maWx0ZXItcGFuZWxcIjtcclxuaW1wb3J0IHsgZ2VuZXJhdGVVbmlxdWVJZCB9IGZyb20gXCJAL3V0aWxzL2lkLWdlbmVyYXRvclwiO1xyXG5cclxuY2xhc3MgUHJlc2V0RmlsdGVyTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XHJcblx0Y29uc3RydWN0b3IoYXBwOiBBcHAsIHByaXZhdGUgcHJlc2V0OiBhbnksIHByaXZhdGUgb25TYXZlOiAoKSA9PiB2b2lkKSB7XHJcblx0XHRzdXBlcihhcHApO1xyXG5cdFx0Ly8gTWlncmF0ZSBvbGQgcHJlc2V0IG9wdGlvbnMgaWYgbmVlZGVkXHJcblx0XHRpZiAodGhpcy5wcmVzZXQgJiYgdGhpcy5wcmVzZXQub3B0aW9ucykge1xyXG5cdFx0XHR0aGlzLnByZXNldC5vcHRpb25zID0gbWlncmF0ZU9sZEZpbHRlck9wdGlvbnModGhpcy5wcmVzZXQub3B0aW9ucyk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRvbk9wZW4oKSB7XHJcblx0XHRjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcclxuXHRcdGNvbnRlbnRFbC5lbXB0eSgpO1xyXG5cclxuXHRcdC8vIFNldCBtb2RhbCB0aXRsZVxyXG5cdFx0dGhpcy50aXRsZUVsLnNldFRleHQodChcIkVkaXQgRmlsdGVyOiBcIikgKyB0aGlzLnByZXNldC5uYW1lKTtcclxuXHJcblx0XHQvLyBDcmVhdGUgZm9ybSBmb3IgZmlsdGVyIG9wdGlvbnNcclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZSh0KFwiRmlsdGVyIG5hbWVcIikpLmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0dGV4dC5zZXRWYWx1ZSh0aGlzLnByZXNldC5uYW1lKS5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHR0aGlzLnByZXNldC5uYW1lID0gdmFsdWU7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gVGFzayBzdGF0dXMgc2VjdGlvblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGVudEVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiQ2hlY2tib3ggU3RhdHVzXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyh0KFwiSW5jbHVkZSBvciBleGNsdWRlIHRhc2tzIGJhc2VkIG9uIHRoZWlyIHN0YXR1c1wiKSk7XHJcblxyXG5cdFx0Y29uc3Qgc3RhdHVzT3B0aW9ucyA9IFtcclxuXHRcdFx0eyBpZDogXCJpbmNsdWRlQ29tcGxldGVkXCIsIG5hbWU6IHQoXCJJbmNsdWRlIENvbXBsZXRlZCBUYXNrc1wiKSB9LFxyXG5cdFx0XHR7IGlkOiBcImluY2x1ZGVJblByb2dyZXNzXCIsIG5hbWU6IHQoXCJJbmNsdWRlIEluIFByb2dyZXNzIFRhc2tzXCIpIH0sXHJcblx0XHRcdHsgaWQ6IFwiaW5jbHVkZUFiYW5kb25lZFwiLCBuYW1lOiB0KFwiSW5jbHVkZSBBYmFuZG9uZWQgVGFza3NcIikgfSxcclxuXHRcdFx0eyBpZDogXCJpbmNsdWRlTm90U3RhcnRlZFwiLCBuYW1lOiB0KFwiSW5jbHVkZSBOb3QgU3RhcnRlZCBUYXNrc1wiKSB9LFxyXG5cdFx0XHR7IGlkOiBcImluY2x1ZGVQbGFubmVkXCIsIG5hbWU6IHQoXCJJbmNsdWRlIFBsYW5uZWQgVGFza3NcIikgfSxcclxuXHRcdF07XHJcblxyXG5cdFx0Zm9yIChjb25zdCBvcHRpb24gb2Ygc3RhdHVzT3B0aW9ucykge1xyXG5cdFx0XHRuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUob3B0aW9uLm5hbWUpLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XHJcblx0XHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUodGhpcy5wcmVzZXQub3B0aW9uc1tvcHRpb24uaWRdKVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnByZXNldC5vcHRpb25zW29wdGlvbi5pZF0gPSB2YWx1ZTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZWxhdGVkIHRhc2tzIHNlY3Rpb25cclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcclxuXHRcdFx0LnNldE5hbWUodChcIlJlbGF0ZWQgVGFza3NcIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdHQoXCJJbmNsdWRlIHBhcmVudCwgY2hpbGQsIGFuZCBzaWJsaW5nIHRhc2tzIGluIHRoZSBmaWx0ZXJcIilcclxuXHRcdFx0KTtcclxuXHJcblx0XHRjb25zdCByZWxhdGVkT3B0aW9ucyA9IFtcclxuXHRcdFx0eyBpZDogXCJpbmNsdWRlUGFyZW50VGFza3NcIiwgbmFtZTogdChcIkluY2x1ZGUgUGFyZW50IFRhc2tzXCIpIH0sXHJcblx0XHRcdHsgaWQ6IFwiaW5jbHVkZUNoaWxkVGFza3NcIiwgbmFtZTogdChcIkluY2x1ZGUgQ2hpbGQgVGFza3NcIikgfSxcclxuXHRcdFx0eyBpZDogXCJpbmNsdWRlU2libGluZ1Rhc2tzXCIsIG5hbWU6IHQoXCJJbmNsdWRlIFNpYmxpbmcgVGFza3NcIikgfSxcclxuXHRcdF07XHJcblxyXG5cdFx0Zm9yIChjb25zdCBvcHRpb24gb2YgcmVsYXRlZE9wdGlvbnMpIHtcclxuXHRcdFx0bmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKG9wdGlvbi5uYW1lKS5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xyXG5cdFx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKHRoaXMucHJlc2V0Lm9wdGlvbnNbb3B0aW9uLmlkXSlcclxuXHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5wcmVzZXQub3B0aW9uc1tvcHRpb24uaWRdID0gdmFsdWU7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWR2YW5jZWQgZmlsdGVyIHNlY3Rpb25cclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcclxuXHRcdFx0LnNldE5hbWUodChcIkFkdmFuY2VkIEZpbHRlclwiKSlcclxuXHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFwiVXNlIGJvb2xlYW4gb3BlcmF0aW9uczogQU5ELCBPUiwgTk9ULiBFeGFtcGxlOiAndGV4dCBjb250ZW50IEFORCAjdGFnMSdcIlxyXG5cdFx0XHRcdClcclxuXHRcdFx0KTtcclxuXHJcblx0XHRuZXcgU2V0dGluZyhjb250ZW50RWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJGaWx0ZXIgcXVlcnlcIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcIlVzZSBib29sZWFuIG9wZXJhdGlvbnM6IEFORCwgT1IsIE5PVC4gRXhhbXBsZTogJ3RleHQgY29udGVudCBBTkQgI3RhZzEnXCJcclxuXHRcdFx0XHQpXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0XHR0ZXh0LnNldFZhbHVlKHRoaXMucHJlc2V0Lm9wdGlvbnMuYWR2YW5jZWRGaWx0ZXJRdWVyeSkub25DaGFuZ2UoXHJcblx0XHRcdFx0XHQodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5wcmVzZXQub3B0aW9ucy5hZHZhbmNlZEZpbHRlclF1ZXJ5ID0gdmFsdWU7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGVudEVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiRmlsdGVyIE1vZGVcIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdHQoXCJDaG9vc2Ugd2hldGhlciB0byBzaG93IG9yIGhpZGUgdGFza3MgdGhhdCBtYXRjaCB0aGUgZmlsdGVyc1wiKVxyXG5cdFx0XHQpXHJcblx0XHRcdC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcclxuXHRcdFx0XHRkcm9wZG93blxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcIklOQ0xVREVcIiwgdChcIlNob3cgbWF0Y2hpbmcgdGFza3NcIikpXHJcblx0XHRcdFx0XHQuYWRkT3B0aW9uKFwiRVhDTFVERVwiLCB0KFwiSGlkZSBtYXRjaGluZyB0YXNrc1wiKSlcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZSh0aGlzLnByZXNldC5vcHRpb25zLmZpbHRlck1vZGUgfHwgXCJJTkNMVURFXCIpXHJcblx0XHRcdFx0XHQub25DaGFuZ2UoKHZhbHVlOiBcIklOQ0xVREVcIiB8IFwiRVhDTFVERVwiKSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMucHJlc2V0Lm9wdGlvbnMuZmlsdGVyTW9kZSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdC8vIFNhdmUgYW5kIGNhbmNlbCBidXR0b25zXHJcblx0XHRuZXcgU2V0dGluZyhjb250ZW50RWwpXHJcblx0XHRcdC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xyXG5cdFx0XHRcdGJ1dHRvblxyXG5cdFx0XHRcdFx0LnNldEJ1dHRvblRleHQodChcIlNhdmVcIikpXHJcblx0XHRcdFx0XHQuc2V0Q3RhKClcclxuXHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5vblNhdmUoKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pXHJcblx0XHRcdC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xyXG5cdFx0XHRcdGJ1dHRvbi5zZXRCdXR0b25UZXh0KHQoXCJDYW5jZWxcIikpLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHR9XHJcblxyXG5cdG9uQ2xvc2UoKSB7XHJcblx0XHRjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcclxuXHRcdGNvbnRlbnRFbC5lbXB0eSgpO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlclRhc2tGaWx0ZXJTZXR0aW5nc1RhYihcclxuXHRzZXR0aW5nVGFiOiBUYXNrUHJvZ3Jlc3NCYXJTZXR0aW5nVGFiLFxyXG5cdGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudFxyXG4pIHtcclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZSh0KFwiVGFzayBGaWx0ZXJcIikpLnNldEhlYWRpbmcoKTtcclxuXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiRW5hYmxlIFRhc2sgRmlsdGVyXCIpKVxyXG5cdFx0LnNldERlc2ModChcIlRvZ2dsZSB0aGlzIHRvIGVuYWJsZSB0aGUgdGFzayBmaWx0ZXIgcGFuZWxcIikpXHJcblx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcclxuXHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudGFza0ZpbHRlci5lbmFibGVUYXNrRmlsdGVyXHJcblx0XHRcdFx0KVxyXG5cdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnRhc2tGaWx0ZXIuZW5hYmxlVGFza0ZpbHRlciA9XHJcblx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0Ly8gUHJlc2V0IGZpbHRlcnMgc2VjdGlvblxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIlByZXNldCBGaWx0ZXJzXCIpKVxyXG5cdFx0LnNldERlc2MoXHJcblx0XHRcdHQoXHJcblx0XHRcdFx0XCJDcmVhdGUgYW5kIG1hbmFnZSBwcmVzZXQgZmlsdGVycyBmb3IgcXVpY2sgYWNjZXNzIHRvIGNvbW1vbmx5IHVzZWQgdGFzayBmaWx0ZXJzLlwiXHJcblx0XHRcdClcclxuXHRcdCk7XHJcblxyXG5cdC8vIEFkZCBhIGNvbnRhaW5lciBmb3IgdGhlIHByZXNldCBmaWx0ZXJzXHJcblx0Y29uc3QgcHJlc2V0RmlsdGVyc0NvbnRhaW5lciA9IGNvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRjbHM6IFwicHJlc2V0LWZpbHRlcnMtY29udGFpbmVyXCIsXHJcblx0fSk7XHJcblxyXG5cdC8vIEZ1bmN0aW9uIHRvIHJlZnJlc2ggdGhlIHByZXNldCBmaWx0ZXJzIGxpc3RcclxuXHRjb25zdCByZWZyZXNoUHJlc2V0RmlsdGVyc0xpc3QgPSAoKSA9PiB7XHJcblx0XHQvLyBDbGVhciB0aGUgY29udGFpbmVyXHJcblx0XHRwcmVzZXRGaWx0ZXJzQ29udGFpbmVyLmVtcHR5KCk7XHJcblxyXG5cdFx0Ly8gR2V0IGN1cnJlbnQgcHJlc2V0IGZpbHRlcnNcclxuXHRcdGNvbnN0IHByZXNldEZpbHRlcnMgPVxyXG5cdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy50YXNrRmlsdGVyLnByZXNldFRhc2tGaWx0ZXJzO1xyXG5cclxuXHRcdGlmIChwcmVzZXRGaWx0ZXJzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRwcmVzZXRGaWx0ZXJzQ29udGFpbmVyLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0XHRjbHM6IFwibm8tcHJlc2V0cy1tZXNzYWdlXCIsXHJcblx0XHRcdFx0dGV4dDogdChcclxuXHRcdFx0XHRcdFwiTm8gcHJlc2V0IGZpbHRlcnMgY3JlYXRlZCB5ZXQuIENsaWNrICdBZGQgTmV3IFByZXNldCcgdG8gY3JlYXRlIG9uZS5cIlxyXG5cdFx0XHRcdCksXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFkZCBlYWNoIHByZXNldCBmaWx0ZXIgaW4gdGhlIGxpc3RcclxuXHRcdHByZXNldEZpbHRlcnMuZm9yRWFjaCgocHJlc2V0LCBpbmRleCkgPT4ge1xyXG5cdFx0XHRjb25zdCBwcmVzZXRSb3cgPSBwcmVzZXRGaWx0ZXJzQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcInByZXNldC1maWx0ZXItcm93XCIsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIHRoZSBzZXR0aW5nXHJcblx0XHRcdGNvbnN0IHByZXNldFNldHRpbmcgPSBuZXcgU2V0dGluZyhwcmVzZXRSb3cpXHJcblx0XHRcdFx0LnNldE5hbWUoYCR7dChcIlByZXNldFwiKX0gIyR7aW5kZXggKyAxfWApXHJcblx0XHRcdFx0LmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0XHRcdHRleHQuc2V0VmFsdWUocHJlc2V0Lm5hbWUpXHJcblx0XHRcdFx0XHRcdC5zZXRQbGFjZWhvbGRlcih0KFwiUHJlc2V0IG5hbWVcIikpXHJcblx0XHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRwcmVzZXQubmFtZSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIEFkZCBidXR0b25zIGZvciBlZGl0aW5nLCByZW1vdmluZ1xyXG5cdFx0XHRwcmVzZXRTZXR0aW5nLmFkZEV4dHJhQnV0dG9uKChidXR0b24pID0+IHtcclxuXHRcdFx0XHRidXR0b25cclxuXHRcdFx0XHRcdC5zZXRJY29uKFwicGVuY2lsXCIpXHJcblx0XHRcdFx0XHQuc2V0VG9vbHRpcCh0KFwiRWRpdCBGaWx0ZXJcIikpXHJcblx0XHRcdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIFNob3cgbW9kYWwgdG8gZWRpdCBmaWx0ZXIgb3B0aW9uc1xyXG5cdFx0XHRcdFx0XHRuZXcgUHJlc2V0RmlsdGVyTW9kYWwoc2V0dGluZ1RhYi5hcHAsIHByZXNldCwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHRcdHJlZnJlc2hQcmVzZXRGaWx0ZXJzTGlzdCgpO1xyXG5cdFx0XHRcdFx0XHR9KS5vcGVuKCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRwcmVzZXRTZXR0aW5nLmFkZEV4dHJhQnV0dG9uKChidXR0b24pID0+IHtcclxuXHRcdFx0XHRidXR0b25cclxuXHRcdFx0XHRcdC5zZXRJY29uKFwidHJhc2hcIilcclxuXHRcdFx0XHRcdC5zZXRUb29sdGlwKHQoXCJSZW1vdmVcIikpXHJcblx0XHRcdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIFJlbW92ZSB0aGUgcHJlc2V0XHJcblx0XHRcdFx0XHRcdHByZXNldEZpbHRlcnMuc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHRcdHJlZnJlc2hQcmVzZXRGaWx0ZXJzTGlzdCgpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQWRkIGJ1dHRvbiB0byBhZGQgbmV3IHByZXNldFxyXG5cdFx0Y29uc3QgYWRkQnV0dG9uQ29udGFpbmVyID0gcHJlc2V0RmlsdGVyc0NvbnRhaW5lci5jcmVhdGVEaXYoKTtcclxuXHRcdG5ldyBTZXR0aW5nKGFkZEJ1dHRvbkNvbnRhaW5lcilcclxuXHRcdFx0LmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XHJcblx0XHRcdFx0YnV0dG9uXHJcblx0XHRcdFx0XHQuc2V0QnV0dG9uVGV4dCh0KFwiQWRkIE5ldyBQcmVzZXRcIikpXHJcblx0XHRcdFx0XHQuc2V0Q3RhKClcclxuXHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8gQWRkIGEgbmV3IHByZXNldCB3aXRoIGRlZmF1bHQgb3B0aW9uc1xyXG5cdFx0XHRcdFx0XHRjb25zdCBuZXdQcmVzZXQgPSB7XHJcblx0XHRcdFx0XHRcdFx0aWQ6IGdlbmVyYXRlVW5pcXVlSWQoKSxcclxuXHRcdFx0XHRcdFx0XHRuYW1lOiB0KFwiTmV3IEZpbHRlclwiKSxcclxuXHRcdFx0XHRcdFx0XHRvcHRpb25zOiB7XHJcblx0XHRcdFx0XHRcdFx0XHRpbmNsdWRlQ29tcGxldGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRcdFx0aW5jbHVkZUluUHJvZ3Jlc3M6IHRydWUsXHJcblx0XHRcdFx0XHRcdFx0XHRpbmNsdWRlQWJhbmRvbmVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRcdFx0aW5jbHVkZU5vdFN0YXJ0ZWQ6IHRydWUsXHJcblx0XHRcdFx0XHRcdFx0XHRpbmNsdWRlUGxhbm5lZDogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0XHRcdGluY2x1ZGVQYXJlbnRUYXNrczogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0XHRcdGluY2x1ZGVDaGlsZFRhc2tzOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRcdFx0aW5jbHVkZVNpYmxpbmdUYXNrczogZmFsc2UsXHJcblx0XHRcdFx0XHRcdFx0XHRhZHZhbmNlZEZpbHRlclF1ZXJ5OiBcIlwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0ZmlsdGVyTW9kZTogXCJJTkNMVURFXCIgYXMgXCJJTkNMVURFXCIgfCBcIkVYQ0xVREVcIixcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudGFza0ZpbHRlci5wcmVzZXRUYXNrRmlsdGVycy5wdXNoKFxyXG5cdFx0XHRcdFx0XHRcdG5ld1ByZXNldFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIE9wZW4gdGhlIGVkaXQgbW9kYWwgZm9yIHRoZSBuZXcgcHJlc2V0XHJcblx0XHRcdFx0XHRcdG5ldyBQcmVzZXRGaWx0ZXJNb2RhbChzZXR0aW5nVGFiLmFwcCwgbmV3UHJlc2V0LCAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHRcdFx0cmVmcmVzaFByZXNldEZpbHRlcnNMaXN0KCk7XHJcblx0XHRcdFx0XHRcdH0pLm9wZW4oKTtcclxuXHJcblx0XHRcdFx0XHRcdHJlZnJlc2hQcmVzZXRGaWx0ZXJzTGlzdCgpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pXHJcblx0XHRcdC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xyXG5cdFx0XHRcdGJ1dHRvblxyXG5cdFx0XHRcdFx0LnNldEJ1dHRvblRleHQodChcIlJlc2V0IHRvIERlZmF1bHQgUHJlc2V0c1wiKSlcclxuXHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8gU2hvdyBjb25maXJtYXRpb24gbW9kYWxcclxuXHRcdFx0XHRcdFx0Y29uc3QgbW9kYWwgPSBuZXcgTW9kYWwoc2V0dGluZ1RhYi5hcHApO1xyXG5cdFx0XHRcdFx0XHRtb2RhbC50aXRsZUVsLnNldFRleHQodChcIlJlc2V0IHRvIERlZmF1bHQgUHJlc2V0c1wiKSk7XHJcblxyXG5cdFx0XHRcdFx0XHRjb25zdCBjb250ZW50ID0gbW9kYWwuY29udGVudEVsLmNyZWF0ZURpdigpO1xyXG5cdFx0XHRcdFx0XHRjb250ZW50LnNldFRleHQoXHJcblx0XHRcdFx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFx0XHRcdFwiVGhpcyB3aWxsIHJlcGxhY2UgYWxsIHlvdXIgY3VycmVudCBwcmVzZXRzIHdpdGggdGhlIGRlZmF1bHQgc2V0LiBBcmUgeW91IHN1cmU/XCJcclxuXHRcdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdFx0XHRjb25zdCBidXR0b25Db250YWluZXIgPSBtb2RhbC5jb250ZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRcdFx0XHRjbHM6IFwidGctbW9kYWwtYnV0dG9uLWNvbnRhaW5lciBtb2RhbC1idXR0b24tY29udGFpbmVyXCIsXHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdFx0Y29uc3QgY2FuY2VsQnV0dG9uID0gYnV0dG9uQ29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIpO1xyXG5cdFx0XHRcdFx0XHRjYW5jZWxCdXR0b24uc2V0VGV4dCh0KFwiQ2FuY2VsXCIpKTtcclxuXHRcdFx0XHRcdFx0Y2FuY2VsQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0bW9kYWwuY2xvc2UoKTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0XHRjb25zdCBjb25maXJtQnV0dG9uID1cclxuXHRcdFx0XHRcdFx0XHRidXR0b25Db250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIik7XHJcblx0XHRcdFx0XHRcdGNvbmZpcm1CdXR0b24uc2V0VGV4dCh0KFwiUmVzZXRcIikpO1xyXG5cdFx0XHRcdFx0XHRjb25maXJtQnV0dG9uLmFkZENsYXNzKFwibW9kLXdhcm5pbmdcIik7XHJcblx0XHRcdFx0XHRcdGNvbmZpcm1CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRjcmVhdGVEZWZhdWx0UHJlc2V0RmlsdGVycyhzZXR0aW5nVGFiKTtcclxuXHRcdFx0XHRcdFx0XHRyZWZyZXNoUHJlc2V0RmlsdGVyc0xpc3QoKTtcclxuXHRcdFx0XHRcdFx0XHRtb2RhbC5jbG9zZSgpO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRcdG1vZGFsLm9wZW4oKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHR9O1xyXG5cclxuXHQvLyBJbml0aWFsIHJlbmRlciBvZiB0aGUgcHJlc2V0IGZpbHRlcnMgbGlzdFxyXG5cdHJlZnJlc2hQcmVzZXRGaWx0ZXJzTGlzdCgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVEZWZhdWx0UHJlc2V0RmlsdGVycyhzZXR0aW5nVGFiOiBUYXNrUHJvZ3Jlc3NCYXJTZXR0aW5nVGFiKSB7XHJcblx0Ly8gQ2xlYXIgZXhpc3RpbmcgcHJlc2V0cyBpZiBhbnlcclxuXHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy50YXNrRmlsdGVyLnByZXNldFRhc2tGaWx0ZXJzID0gW107XHJcblxyXG5cdC8vIEFkZCBkZWZhdWx0IHByZXNldHNcclxuXHRjb25zdCBkZWZhdWx0UHJlc2V0cyA9IFtcclxuXHRcdHtcclxuXHRcdFx0aWQ6IGdlbmVyYXRlVW5pcXVlSWQoKSxcclxuXHRcdFx0bmFtZTogdChcIkluY29tcGxldGUgdGFza3NcIiksXHJcblx0XHRcdG9wdGlvbnM6IHtcclxuXHRcdFx0XHRpbmNsdWRlQ29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRpbmNsdWRlSW5Qcm9ncmVzczogdHJ1ZSxcclxuXHRcdFx0XHRpbmNsdWRlQWJhbmRvbmVkOiBmYWxzZSxcclxuXHRcdFx0XHRpbmNsdWRlTm90U3RhcnRlZDogdHJ1ZSxcclxuXHRcdFx0XHRpbmNsdWRlUGxhbm5lZDogdHJ1ZSxcclxuXHRcdFx0XHRpbmNsdWRlUGFyZW50VGFza3M6IHRydWUsXHJcblx0XHRcdFx0aW5jbHVkZUNoaWxkVGFza3M6IHRydWUsXHJcblx0XHRcdFx0aW5jbHVkZVNpYmxpbmdUYXNrczogZmFsc2UsXHJcblx0XHRcdFx0YWR2YW5jZWRGaWx0ZXJRdWVyeTogXCJcIixcclxuXHRcdFx0XHRmaWx0ZXJNb2RlOiBcIklOQ0xVREVcIiBhcyBcIklOQ0xVREVcIiB8IFwiRVhDTFVERVwiLFxyXG5cdFx0XHR9LFxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aWQ6IGdlbmVyYXRlVW5pcXVlSWQoKSxcclxuXHRcdFx0bmFtZTogdChcIkluIHByb2dyZXNzIHRhc2tzXCIpLFxyXG5cdFx0XHRvcHRpb25zOiB7XHJcblx0XHRcdFx0aW5jbHVkZUNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0aW5jbHVkZUluUHJvZ3Jlc3M6IHRydWUsXHJcblx0XHRcdFx0aW5jbHVkZUFiYW5kb25lZDogZmFsc2UsXHJcblx0XHRcdFx0aW5jbHVkZU5vdFN0YXJ0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdGluY2x1ZGVQbGFubmVkOiBmYWxzZSxcclxuXHRcdFx0XHRpbmNsdWRlUGFyZW50VGFza3M6IHRydWUsXHJcblx0XHRcdFx0aW5jbHVkZUNoaWxkVGFza3M6IHRydWUsXHJcblx0XHRcdFx0aW5jbHVkZVNpYmxpbmdUYXNrczogZmFsc2UsXHJcblx0XHRcdFx0YWR2YW5jZWRGaWx0ZXJRdWVyeTogXCJcIixcclxuXHRcdFx0XHRmaWx0ZXJNb2RlOiBcIklOQ0xVREVcIiBhcyBcIklOQ0xVREVcIiB8IFwiRVhDTFVERVwiLFxyXG5cdFx0XHR9LFxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aWQ6IGdlbmVyYXRlVW5pcXVlSWQoKSxcclxuXHRcdFx0bmFtZTogdChcIkNvbXBsZXRlZCB0YXNrc1wiKSxcclxuXHRcdFx0b3B0aW9uczoge1xyXG5cdFx0XHRcdGluY2x1ZGVDb21wbGV0ZWQ6IHRydWUsXHJcblx0XHRcdFx0aW5jbHVkZUluUHJvZ3Jlc3M6IGZhbHNlLFxyXG5cdFx0XHRcdGluY2x1ZGVBYmFuZG9uZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdGluY2x1ZGVOb3RTdGFydGVkOiBmYWxzZSxcclxuXHRcdFx0XHRpbmNsdWRlUGxhbm5lZDogZmFsc2UsXHJcblx0XHRcdFx0aW5jbHVkZVBhcmVudFRhc2tzOiBmYWxzZSxcclxuXHRcdFx0XHRpbmNsdWRlQ2hpbGRUYXNrczogdHJ1ZSxcclxuXHRcdFx0XHRpbmNsdWRlU2libGluZ1Rhc2tzOiBmYWxzZSxcclxuXHRcdFx0XHRhZHZhbmNlZEZpbHRlclF1ZXJ5OiBcIlwiLFxyXG5cdFx0XHRcdGZpbHRlck1vZGU6IFwiSU5DTFVERVwiIGFzIFwiSU5DTFVERVwiIHwgXCJFWENMVURFXCIsXHJcblx0XHRcdH0sXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRpZDogZ2VuZXJhdGVVbmlxdWVJZCgpLFxyXG5cdFx0XHRuYW1lOiB0KFwiQWxsIHRhc2tzXCIpLFxyXG5cdFx0XHRvcHRpb25zOiB7XHJcblx0XHRcdFx0aW5jbHVkZUNvbXBsZXRlZDogdHJ1ZSxcclxuXHRcdFx0XHRpbmNsdWRlSW5Qcm9ncmVzczogdHJ1ZSxcclxuXHRcdFx0XHRpbmNsdWRlQWJhbmRvbmVkOiB0cnVlLFxyXG5cdFx0XHRcdGluY2x1ZGVOb3RTdGFydGVkOiB0cnVlLFxyXG5cdFx0XHRcdGluY2x1ZGVQbGFubmVkOiB0cnVlLFxyXG5cdFx0XHRcdGluY2x1ZGVQYXJlbnRUYXNrczogdHJ1ZSxcclxuXHRcdFx0XHRpbmNsdWRlQ2hpbGRUYXNrczogdHJ1ZSxcclxuXHRcdFx0XHRpbmNsdWRlU2libGluZ1Rhc2tzOiB0cnVlLFxyXG5cdFx0XHRcdGFkdmFuY2VkRmlsdGVyUXVlcnk6IFwiXCIsXHJcblx0XHRcdFx0ZmlsdGVyTW9kZTogXCJJTkNMVURFXCIgYXMgXCJJTkNMVURFXCIgfCBcIkVYQ0xVREVcIixcclxuXHRcdFx0fSxcclxuXHRcdH0sXHJcblx0XTtcclxuXHJcblx0Ly8gQWRkIGRlZmF1bHQgcHJlc2V0cyB0byBzZXR0aW5nc1xyXG5cdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnRhc2tGaWx0ZXIucHJlc2V0VGFza0ZpbHRlcnMgPSBkZWZhdWx0UHJlc2V0cztcclxuXHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxufVxyXG4iXX0=