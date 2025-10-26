import { Modal, Setting } from "obsidian";
import { t } from '@/translations/helper';
import { StageEditModal } from '@/components/features/workflow/modals/StageEditModal';
export class WorkflowDefinitionModal extends Modal {
    constructor(app, plugin, workflow, onSave) {
        super(app);
        this.plugin = plugin;
        this.workflow = JSON.parse(JSON.stringify(workflow)); // Deep copy to avoid direct mutation
        this.onSave = onSave;
    }
    onOpen() {
        const { contentEl, titleEl } = this;
        this.modalEl.toggleClass("modal-workflow-definition", true);
        titleEl.setText(this.workflow.id
            ? t("Edit Workflow") + ": " + this.workflow.name
            : t("Create New Workflow"));
        // Basic workflow information
        const formContainer = contentEl.createDiv({ cls: "workflow-form" });
        new Setting(formContainer)
            .setName(t("Workflow name"))
            .setDesc(t("A descriptive name for the workflow"))
            .addText((text) => {
            text.setValue(this.workflow.name || "").onChange((value) => {
                this.workflow.name = value;
            });
        });
        new Setting(formContainer)
            .setName(t("Workflow ID"))
            .setDesc(t("A unique identifier for the workflow (used in tags)"))
            .addText((text) => {
            text.setValue(this.workflow.id || "")
                .setPlaceholder("unique_id")
                .onChange((value) => {
                this.workflow.id = value;
            });
        });
        new Setting(formContainer)
            .setName(t("Description"))
            .setDesc(t("Optional description for the workflow"))
            .addTextArea((textarea) => {
            textarea
                .setValue(this.workflow.description || "")
                .setPlaceholder(t("Describe the purpose and use of this workflow..."))
                .onChange((value) => {
                this.workflow.description = value;
            });
            textarea.inputEl.rows = 3;
            textarea.inputEl.cols = 40;
        });
        // Stages section
        const stagesSection = contentEl.createDiv({
            cls: "workflow-stages-section",
        });
        const stagesHeading = stagesSection.createEl("h2", {
            text: t("Workflow Stages"),
        });
        const stagesContainer = stagesSection.createDiv({
            cls: "workflow-stages-container",
        });
        // Function to render the stages list
        const renderStages = () => {
            stagesContainer.empty();
            if (!this.workflow.stages || this.workflow.stages.length === 0) {
                stagesContainer.createEl("p", {
                    text: t("No stages defined yet. Add a stage to get started."),
                    cls: "no-stages-message",
                });
            }
            else {
                // Create a sortable list of stages
                const stagesList = stagesContainer.createEl("ul", {
                    cls: "workflow-stages-list",
                });
                this.workflow.stages.forEach((stage, index) => {
                    const stageItem = stagesList.createEl("li", {
                        cls: "workflow-stage-item",
                    });
                    // Create a setting for each stage
                    const stageSetting = new Setting(stageItem)
                        .setName(stage.name)
                        .setDesc(stage.type);
                    stageSetting.settingEl.toggleClass([
                        "workflow-stage-type-cycle",
                        "workflow-stage-type-linear",
                        "workflow-stage-type-parallel",
                        "workflow-stage-type-conditional",
                        "workflow-stage-type-custom",
                    ].includes(stage.type)
                        ? stage.type
                        : "workflow-stage-type-unknown", true);
                    // Edit button
                    stageSetting.addExtraButton((button) => {
                        button
                            .setIcon("pencil")
                            .setTooltip(t("Edit"))
                            .onClick(() => {
                            new StageEditModal(this.app, stage, this.workflow.stages, (updatedStage) => {
                                this.workflow.stages[index] =
                                    updatedStage;
                                renderStages();
                            }).open();
                        });
                    });
                    // Move up button (if not first)
                    if (index > 0) {
                        stageSetting.addExtraButton((button) => {
                            button
                                .setIcon("arrow-up")
                                .setTooltip(t("Move up"))
                                .onClick(() => {
                                // Swap with previous stage
                                [
                                    this.workflow.stages[index - 1],
                                    this.workflow.stages[index],
                                ] = [
                                    this.workflow.stages[index],
                                    this.workflow.stages[index - 1],
                                ];
                                renderStages();
                            });
                        });
                    }
                    // Move down button (if not last)
                    if (index < this.workflow.stages.length - 1) {
                        stageSetting.addExtraButton((button) => {
                            button
                                .setIcon("arrow-down")
                                .setTooltip(t("Move down"))
                                .onClick(() => {
                                // Swap with next stage
                                [
                                    this.workflow.stages[index],
                                    this.workflow.stages[index + 1],
                                ] = [
                                    this.workflow.stages[index + 1],
                                    this.workflow.stages[index],
                                ];
                                renderStages();
                            });
                        });
                    }
                    // Delete button
                    stageSetting.addExtraButton((button) => {
                        button
                            .setIcon("trash")
                            .setTooltip(t("Delete"))
                            .onClick(() => {
                            // Remove the stage
                            this.workflow.stages.splice(index, 1);
                            renderStages();
                        });
                    });
                    // If this stage has substages, show them
                    if (stage.type === "cycle" &&
                        stage.subStages &&
                        stage.subStages.length > 0) {
                        const subStagesList = stageItem.createEl("div", {
                            cls: "workflow-substages-list",
                        });
                        stage.subStages.forEach((subStage, index) => {
                            const subStageItem = subStagesList.createEl("div", {
                                cls: "substage-item",
                            });
                            const subStageSettingsContainer = subStageItem.createDiv({
                                cls: "substage-settings-container",
                            });
                            // Create a single Setting for the entire substage
                            const setting = new Setting(subStageSettingsContainer);
                            setting.setName(t("Sub-stage") + " " + (index + 1));
                            // Add name text field
                            setting.addText((text) => {
                                text.setValue(subStage.name || "")
                                    .setPlaceholder(t("Sub-stage name"))
                                    .onChange((value) => {
                                    subStage.name = value;
                                });
                            });
                            // Add ID text field
                            setting.addText((text) => {
                                text.setValue(subStage.id || "")
                                    .setPlaceholder(t("Sub-stage ID"))
                                    .onChange((value) => {
                                    subStage.id = value;
                                });
                            });
                            // Add next stage dropdown if needed
                            if (this.workflow.stages.length > 1) {
                                setting.addDropdown((dropdown) => {
                                    var _a;
                                    dropdown.selectEl.addClass("substage-next-select");
                                    // Add label before dropdown
                                    const labelEl = createSpan({
                                        text: t("Next: "),
                                        cls: "setting-dropdown-label",
                                    });
                                    (_a = dropdown.selectEl.parentElement) === null || _a === void 0 ? void 0 : _a.insertBefore(labelEl, dropdown.selectEl);
                                    // Add all other sub-stages as options
                                    this.workflow.stages.forEach((s) => {
                                        if (s.id !== subStage.id) {
                                            dropdown.addOption(s.id, s.name);
                                        }
                                    });
                                    // Set the current value
                                    if (subStage.next) {
                                        dropdown.setValue(subStage.next);
                                    }
                                    // Handle changes
                                    dropdown.onChange((value) => {
                                        subStage.next = value;
                                    });
                                });
                            }
                            // Add remove button
                            setting.addExtraButton((button) => {
                                button.setIcon("trash").onClick(() => {
                                    this.workflow.stages.splice(index, 1);
                                    renderStages();
                                });
                            });
                        });
                    }
                });
            }
            // Add button for new sub-stage
            const addStageButton = stagesContainer.createEl("button", {
                cls: "workflow-add-stage-button",
                text: t("Add Sub-stage"),
            });
            addStageButton.addEventListener("click", () => {
                if (!this.workflow.stages) {
                    this.workflow.stages = [];
                }
                // Create a new sub-stage
                const newSubStage = {
                    id: this.generateUniqueId(),
                    name: t("New Sub-stage"),
                };
                // If there are existing sub-stages, set the next property
                if (this.workflow.stages.length > 0) {
                    // Get the last sub-stage
                    const lastSubStage = this.workflow.stages[this.workflow.stages.length - 1];
                    // Set the last sub-stage's next property to the new sub-stage
                    if (lastSubStage) {
                        // Ensure lastSubStage has a next property
                        if (!("next" in lastSubStage)) {
                            // Add next property if it doesn't exist
                            lastSubStage.next = newSubStage.id;
                        }
                        else {
                            lastSubStage.next = newSubStage.id;
                        }
                    }
                    // Set the new sub-stage's next property to the first sub-stage (cycle)
                    if (this.workflow.stages[0]) {
                        newSubStage.next = this.workflow.stages[0].id;
                    }
                }
                this.workflow.stages.push(newSubStage);
                renderStages();
            });
        };
        // Initial render of stages
        renderStages();
        // Save and Cancel buttons
        const buttonContainer = contentEl.createDiv({
            cls: "workflow-buttons",
        });
        const cancelButton = buttonContainer.createEl("button", {
            text: t("Cancel"),
            cls: "workflow-cancel-button",
        });
        cancelButton.addEventListener("click", () => {
            this.close();
        });
        const saveButton = buttonContainer.createEl("button", {
            text: t("Save"),
            cls: "workflow-save-button mod-cta",
        });
        saveButton.addEventListener("click", () => {
            // Update the lastModified date
            if (!this.workflow.metadata) {
                this.workflow.metadata = {};
            }
            this.workflow.metadata.lastModified = new Date()
                .toISOString()
                .split("T")[0];
            // Call the onSave callback
            this.onSave(this.workflow);
            this.close();
        });
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
    generateUniqueId() {
        return (Date.now().toString(36) + Math.random().toString(36).substring(2, 9));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV29ya2Zsb3dEZWZpbml0aW9uTW9kYWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJXb3JrZmxvd0RlZmluaXRpb25Nb2RhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsS0FBSyxFQUFPLE9BQU8sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUcvQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDMUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRXRGLE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxLQUFLO0lBS2pELFlBQ0MsR0FBUSxFQUNSLE1BQTZCLEVBQzdCLFFBQWEsRUFDYixNQUErQjtRQUUvQixLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDWCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMscUNBQXFDO1FBQzNGLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxNQUFNO1FBQ0wsTUFBTSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFFcEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDNUQsT0FBTyxDQUFDLE9BQU8sQ0FDZCxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDZixDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUk7WUFDaEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUMzQixDQUFDO1FBRUYsNkJBQTZCO1FBQzdCLE1BQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQyxT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RUgsTUFBTSxVQUFVLEdBQUcsZUFBZSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUU7WUFDckQsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUM7WUFDZixHQUFHLEVBQUUsOEJBQThCO1NBQ25DLENBQUMsQ0FBQztRQUNILFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO1lBQ3pDLCtCQUErQjtZQUMvQixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUU7Z0JBQzVCLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQzthQUM1QjtZQUNELElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFlBQVksR0FBRyxJQUFJLElBQUksRUFBRTtpQkFDOUMsV0FBVyxFQUFFO2lCQUNiLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVoQiwyQkFBMkI7WUFDM0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDM0IsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2QsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsT0FBTztRQUNOLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFDM0IsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ25CLENBQUM7SUFFRCxnQkFBZ0I7UUFDZixPQUFPLENBQ04sSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3BFLENBQUM7SUFDSCxDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNb2RhbCwgQXBwLCBTZXR0aW5nIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSAnQC9pbmRleCc7XHJcbmltcG9ydCB7IFdvcmtmbG93U3RhZ2UgfSBmcm9tICdAL2NvbW1vbi9zZXR0aW5nLWRlZmluaXRpb24nO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSAnQC90cmFuc2xhdGlvbnMvaGVscGVyJztcclxuaW1wb3J0IHsgU3RhZ2VFZGl0TW9kYWwgfSBmcm9tICdAL2NvbXBvbmVudHMvZmVhdHVyZXMvd29ya2Zsb3cvbW9kYWxzL1N0YWdlRWRpdE1vZGFsJztcclxuXHJcbmV4cG9ydCBjbGFzcyBXb3JrZmxvd0RlZmluaXRpb25Nb2RhbCBleHRlbmRzIE1vZGFsIHtcclxuXHR3b3JrZmxvdzogYW55O1xyXG5cdG9uU2F2ZTogKHdvcmtmbG93OiBhbnkpID0+IHZvaWQ7XHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0YXBwOiBBcHAsXHJcblx0XHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdHdvcmtmbG93OiBhbnksXHJcblx0XHRvblNhdmU6ICh3b3JrZmxvdzogYW55KSA9PiB2b2lkXHJcblx0KSB7XHJcblx0XHRzdXBlcihhcHApO1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0XHR0aGlzLndvcmtmbG93ID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh3b3JrZmxvdykpOyAvLyBEZWVwIGNvcHkgdG8gYXZvaWQgZGlyZWN0IG11dGF0aW9uXHJcblx0XHR0aGlzLm9uU2F2ZSA9IG9uU2F2ZTtcclxuXHR9XHJcblxyXG5cdG9uT3BlbigpIHtcclxuXHRcdGNvbnN0IHsgY29udGVudEVsLCB0aXRsZUVsIH0gPSB0aGlzO1xyXG5cclxuXHRcdHRoaXMubW9kYWxFbC50b2dnbGVDbGFzcyhcIm1vZGFsLXdvcmtmbG93LWRlZmluaXRpb25cIiwgdHJ1ZSk7XHJcblx0XHR0aXRsZUVsLnNldFRleHQoXHJcblx0XHRcdHRoaXMud29ya2Zsb3cuaWRcclxuXHRcdFx0XHQ/IHQoXCJFZGl0IFdvcmtmbG93XCIpICsgXCI6IFwiICsgdGhpcy53b3JrZmxvdy5uYW1lXHJcblx0XHRcdFx0OiB0KFwiQ3JlYXRlIE5ldyBXb3JrZmxvd1wiKVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBCYXNpYyB3b3JrZmxvdyBpbmZvcm1hdGlvblxyXG5cdFx0Y29uc3QgZm9ybUNvbnRhaW5lciA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwid29ya2Zsb3ctZm9ybVwiIH0pO1xyXG5cclxuXHRcdG5ldyBTZXR0aW5nKGZvcm1Db250YWluZXIpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJXb3JrZmxvdyBuYW1lXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyh0KFwiQSBkZXNjcmlwdGl2ZSBuYW1lIGZvciB0aGUgd29ya2Zsb3dcIikpXHJcblx0XHRcdC5hZGRUZXh0KCh0ZXh0KSA9PiB7XHJcblx0XHRcdFx0dGV4dC5zZXRWYWx1ZSh0aGlzLndvcmtmbG93Lm5hbWUgfHwgXCJcIikub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLndvcmtmbG93Lm5hbWUgPSB2YWx1ZTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoZm9ybUNvbnRhaW5lcilcclxuXHRcdFx0LnNldE5hbWUodChcIldvcmtmbG93IElEXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyh0KFwiQSB1bmlxdWUgaWRlbnRpZmllciBmb3IgdGhlIHdvcmtmbG93ICh1c2VkIGluIHRhZ3MpXCIpKVxyXG5cdFx0XHQuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHRcdHRleHQuc2V0VmFsdWUodGhpcy53b3JrZmxvdy5pZCB8fCBcIlwiKVxyXG5cdFx0XHRcdFx0LnNldFBsYWNlaG9sZGVyKFwidW5pcXVlX2lkXCIpXHJcblx0XHRcdFx0XHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMud29ya2Zsb3cuaWQgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRuZXcgU2V0dGluZyhmb3JtQ29udGFpbmVyKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiRGVzY3JpcHRpb25cIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJPcHRpb25hbCBkZXNjcmlwdGlvbiBmb3IgdGhlIHdvcmtmbG93XCIpKVxyXG5cdFx0XHQuYWRkVGV4dEFyZWEoKHRleHRhcmVhKSA9PiB7XHJcblx0XHRcdFx0dGV4dGFyZWFcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZSh0aGlzLndvcmtmbG93LmRlc2NyaXB0aW9uIHx8IFwiXCIpXHJcblx0XHRcdFx0XHQuc2V0UGxhY2Vob2xkZXIoXHJcblx0XHRcdFx0XHRcdHQoXCJEZXNjcmliZSB0aGUgcHVycG9zZSBhbmQgdXNlIG9mIHRoaXMgd29ya2Zsb3cuLi5cIilcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy53b3JrZmxvdy5kZXNjcmlwdGlvbiA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdHRleHRhcmVhLmlucHV0RWwucm93cyA9IDM7XHJcblx0XHRcdFx0dGV4dGFyZWEuaW5wdXRFbC5jb2xzID0gNDA7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdC8vIFN0YWdlcyBzZWN0aW9uXHJcblx0XHRjb25zdCBzdGFnZXNTZWN0aW9uID0gY29udGVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ3b3JrZmxvdy1zdGFnZXMtc2VjdGlvblwiLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCBzdGFnZXNIZWFkaW5nID0gc3RhZ2VzU2VjdGlvbi5jcmVhdGVFbChcImgyXCIsIHtcclxuXHRcdFx0dGV4dDogdChcIldvcmtmbG93IFN0YWdlc1wiKSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IHN0YWdlc0NvbnRhaW5lciA9IHN0YWdlc1NlY3Rpb24uY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcIndvcmtmbG93LXN0YWdlcy1jb250YWluZXJcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEZ1bmN0aW9uIHRvIHJlbmRlciB0aGUgc3RhZ2VzIGxpc3RcclxuXHRcdGNvbnN0IHJlbmRlclN0YWdlcyA9ICgpID0+IHtcclxuXHRcdFx0c3RhZ2VzQ29udGFpbmVyLmVtcHR5KCk7XHJcblxyXG5cdFx0XHRpZiAoIXRoaXMud29ya2Zsb3cuc3RhZ2VzIHx8IHRoaXMud29ya2Zsb3cuc3RhZ2VzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRcdHN0YWdlc0NvbnRhaW5lci5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHRcdFx0dGV4dDogdChcclxuXHRcdFx0XHRcdFx0XCJObyBzdGFnZXMgZGVmaW5lZCB5ZXQuIEFkZCBhIHN0YWdlIHRvIGdldCBzdGFydGVkLlwiXHJcblx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0Y2xzOiBcIm5vLXN0YWdlcy1tZXNzYWdlXCIsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gQ3JlYXRlIGEgc29ydGFibGUgbGlzdCBvZiBzdGFnZXNcclxuXHRcdFx0XHRjb25zdCBzdGFnZXNMaXN0ID0gc3RhZ2VzQ29udGFpbmVyLmNyZWF0ZUVsKFwidWxcIiwge1xyXG5cdFx0XHRcdFx0Y2xzOiBcIndvcmtmbG93LXN0YWdlcy1saXN0XCIsXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdHRoaXMud29ya2Zsb3cuc3RhZ2VzLmZvckVhY2goKHN0YWdlOiBhbnksIGluZGV4OiBudW1iZXIpID0+IHtcclxuXHRcdFx0XHRcdGNvbnN0IHN0YWdlSXRlbSA9IHN0YWdlc0xpc3QuY3JlYXRlRWwoXCJsaVwiLCB7XHJcblx0XHRcdFx0XHRcdGNsczogXCJ3b3JrZmxvdy1zdGFnZS1pdGVtXCIsXHJcblx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHQvLyBDcmVhdGUgYSBzZXR0aW5nIGZvciBlYWNoIHN0YWdlXHJcblx0XHRcdFx0XHRjb25zdCBzdGFnZVNldHRpbmcgPSBuZXcgU2V0dGluZyhzdGFnZUl0ZW0pXHJcblx0XHRcdFx0XHRcdC5zZXROYW1lKHN0YWdlLm5hbWUpXHJcblx0XHRcdFx0XHRcdC5zZXREZXNjKHN0YWdlLnR5cGUpO1xyXG5cclxuXHRcdFx0XHRcdHN0YWdlU2V0dGluZy5zZXR0aW5nRWwudG9nZ2xlQ2xhc3MoXHJcblx0XHRcdFx0XHRcdFtcclxuXHRcdFx0XHRcdFx0XHRcIndvcmtmbG93LXN0YWdlLXR5cGUtY3ljbGVcIixcclxuXHRcdFx0XHRcdFx0XHRcIndvcmtmbG93LXN0YWdlLXR5cGUtbGluZWFyXCIsXHJcblx0XHRcdFx0XHRcdFx0XCJ3b3JrZmxvdy1zdGFnZS10eXBlLXBhcmFsbGVsXCIsXHJcblx0XHRcdFx0XHRcdFx0XCJ3b3JrZmxvdy1zdGFnZS10eXBlLWNvbmRpdGlvbmFsXCIsXHJcblx0XHRcdFx0XHRcdFx0XCJ3b3JrZmxvdy1zdGFnZS10eXBlLWN1c3RvbVwiLFxyXG5cdFx0XHRcdFx0XHRdLmluY2x1ZGVzKHN0YWdlLnR5cGUpXHJcblx0XHRcdFx0XHRcdFx0PyBzdGFnZS50eXBlXHJcblx0XHRcdFx0XHRcdFx0OiBcIndvcmtmbG93LXN0YWdlLXR5cGUtdW5rbm93blwiLFxyXG5cdFx0XHRcdFx0XHR0cnVlXHJcblx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdC8vIEVkaXQgYnV0dG9uXHJcblx0XHRcdFx0XHRzdGFnZVNldHRpbmcuYWRkRXh0cmFCdXR0b24oKGJ1dHRvbikgPT4ge1xyXG5cdFx0XHRcdFx0XHRidXR0b25cclxuXHRcdFx0XHRcdFx0XHQuc2V0SWNvbihcInBlbmNpbFwiKVxyXG5cdFx0XHRcdFx0XHRcdC5zZXRUb29sdGlwKHQoXCJFZGl0XCIpKVxyXG5cdFx0XHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdG5ldyBTdGFnZUVkaXRNb2RhbChcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0XHRcdFx0XHRcdHN0YWdlLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLndvcmtmbG93LnN0YWdlcyxcclxuXHRcdFx0XHRcdFx0XHRcdFx0KHVwZGF0ZWRTdGFnZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMud29ya2Zsb3cuc3RhZ2VzW2luZGV4XSA9XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR1cGRhdGVkU3RhZ2U7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0cmVuZGVyU3RhZ2VzKCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdCkub3BlbigpO1xyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gTW92ZSB1cCBidXR0b24gKGlmIG5vdCBmaXJzdClcclxuXHRcdFx0XHRcdGlmIChpbmRleCA+IDApIHtcclxuXHRcdFx0XHRcdFx0c3RhZ2VTZXR0aW5nLmFkZEV4dHJhQnV0dG9uKChidXR0b24pID0+IHtcclxuXHRcdFx0XHRcdFx0XHRidXR0b25cclxuXHRcdFx0XHRcdFx0XHRcdC5zZXRJY29uKFwiYXJyb3ctdXBcIilcclxuXHRcdFx0XHRcdFx0XHRcdC5zZXRUb29sdGlwKHQoXCJNb3ZlIHVwXCIpKVxyXG5cdFx0XHRcdFx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBTd2FwIHdpdGggcHJldmlvdXMgc3RhZ2VcclxuXHRcdFx0XHRcdFx0XHRcdFx0W1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMud29ya2Zsb3cuc3RhZ2VzW2luZGV4IC0gMV0sXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0dGhpcy53b3JrZmxvdy5zdGFnZXNbaW5kZXhdLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRdID0gW1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMud29ya2Zsb3cuc3RhZ2VzW2luZGV4XSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0aGlzLndvcmtmbG93LnN0YWdlc1tpbmRleCAtIDFdLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRdO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRyZW5kZXJTdGFnZXMoKTtcclxuXHRcdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBNb3ZlIGRvd24gYnV0dG9uIChpZiBub3QgbGFzdClcclxuXHRcdFx0XHRcdGlmIChpbmRleCA8IHRoaXMud29ya2Zsb3cuc3RhZ2VzLmxlbmd0aCAtIDEpIHtcclxuXHRcdFx0XHRcdFx0c3RhZ2VTZXR0aW5nLmFkZEV4dHJhQnV0dG9uKChidXR0b24pID0+IHtcclxuXHRcdFx0XHRcdFx0XHRidXR0b25cclxuXHRcdFx0XHRcdFx0XHRcdC5zZXRJY29uKFwiYXJyb3ctZG93blwiKVxyXG5cdFx0XHRcdFx0XHRcdFx0LnNldFRvb2x0aXAodChcIk1vdmUgZG93blwiKSlcclxuXHRcdFx0XHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gU3dhcCB3aXRoIG5leHQgc3RhZ2VcclxuXHRcdFx0XHRcdFx0XHRcdFx0W1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMud29ya2Zsb3cuc3RhZ2VzW2luZGV4XSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0aGlzLndvcmtmbG93LnN0YWdlc1tpbmRleCArIDFdLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRdID0gW1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMud29ya2Zsb3cuc3RhZ2VzW2luZGV4ICsgMV0sXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0dGhpcy53b3JrZmxvdy5zdGFnZXNbaW5kZXhdLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRdO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRyZW5kZXJTdGFnZXMoKTtcclxuXHRcdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBEZWxldGUgYnV0dG9uXHJcblx0XHRcdFx0XHRzdGFnZVNldHRpbmcuYWRkRXh0cmFCdXR0b24oKGJ1dHRvbikgPT4ge1xyXG5cdFx0XHRcdFx0XHRidXR0b25cclxuXHRcdFx0XHRcdFx0XHQuc2V0SWNvbihcInRyYXNoXCIpXHJcblx0XHRcdFx0XHRcdFx0LnNldFRvb2x0aXAodChcIkRlbGV0ZVwiKSlcclxuXHRcdFx0XHRcdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHQvLyBSZW1vdmUgdGhlIHN0YWdlXHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLndvcmtmbG93LnN0YWdlcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0XHRcdFx0XHRcdFx0cmVuZGVyU3RhZ2VzKCk7XHJcblx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHQvLyBJZiB0aGlzIHN0YWdlIGhhcyBzdWJzdGFnZXMsIHNob3cgdGhlbVxyXG5cdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRzdGFnZS50eXBlID09PSBcImN5Y2xlXCIgJiZcclxuXHRcdFx0XHRcdFx0c3RhZ2Uuc3ViU3RhZ2VzICYmXHJcblx0XHRcdFx0XHRcdHN0YWdlLnN1YlN0YWdlcy5sZW5ndGggPiAwXHJcblx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0Y29uc3Qgc3ViU3RhZ2VzTGlzdCA9IHN0YWdlSXRlbS5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdFx0XHRcdFx0Y2xzOiBcIndvcmtmbG93LXN1YnN0YWdlcy1saXN0XCIsXHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdFx0c3RhZ2Uuc3ViU3RhZ2VzLmZvckVhY2goXHJcblx0XHRcdFx0XHRcdFx0KHN1YlN0YWdlOiBhbnksIGluZGV4OiBudW1iZXIpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IHN1YlN0YWdlSXRlbSA9IHN1YlN0YWdlc0xpc3QuY3JlYXRlRWwoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFwiZGl2XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRjbHM6IFwic3Vic3RhZ2UtaXRlbVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IHN1YlN0YWdlU2V0dGluZ3NDb250YWluZXIgPVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRzdWJTdGFnZUl0ZW0uY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRjbHM6IFwic3Vic3RhZ2Utc2V0dGluZ3MtY29udGFpbmVyXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdC8vIENyZWF0ZSBhIHNpbmdsZSBTZXR0aW5nIGZvciB0aGUgZW50aXJlIHN1YnN0YWdlXHJcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBzZXR0aW5nID0gbmV3IFNldHRpbmcoXHJcblx0XHRcdFx0XHRcdFx0XHRcdHN1YlN0YWdlU2V0dGluZ3NDb250YWluZXJcclxuXHRcdFx0XHRcdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0c2V0dGluZy5zZXROYW1lKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR0KFwiU3ViLXN0YWdlXCIpICsgXCIgXCIgKyAoaW5kZXggKyAxKVxyXG5cdFx0XHRcdFx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0XHRcdFx0XHQvLyBBZGQgbmFtZSB0ZXh0IGZpZWxkXHJcblx0XHRcdFx0XHRcdFx0XHRzZXR0aW5nLmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGV4dC5zZXRWYWx1ZShzdWJTdGFnZS5uYW1lIHx8IFwiXCIpXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0LnNldFBsYWNlaG9sZGVyKHQoXCJTdWItc3RhZ2UgbmFtZVwiKSlcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRzdWJTdGFnZS5uYW1lID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRcdFx0XHQvLyBBZGQgSUQgdGV4dCBmaWVsZFxyXG5cdFx0XHRcdFx0XHRcdFx0c2V0dGluZy5hZGRUZXh0KCh0ZXh0KSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRleHQuc2V0VmFsdWUoc3ViU3RhZ2UuaWQgfHwgXCJcIilcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQuc2V0UGxhY2Vob2xkZXIodChcIlN1Yi1zdGFnZSBJRFwiKSlcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRzdWJTdGFnZS5pZCA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0Ly8gQWRkIG5leHQgc3RhZ2UgZHJvcGRvd24gaWYgbmVlZGVkXHJcblx0XHRcdFx0XHRcdFx0XHRpZiAodGhpcy53b3JrZmxvdy5zdGFnZXMubGVuZ3RoID4gMSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRzZXR0aW5nLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGRyb3Bkb3duLnNlbGVjdEVsLmFkZENsYXNzKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XCJzdWJzdGFnZS1uZXh0LXNlbGVjdFwiXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gQWRkIGxhYmVsIGJlZm9yZSBkcm9wZG93blxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IGxhYmVsRWwgPSBjcmVhdGVTcGFuKHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHRleHQ6IHQoXCJOZXh0OiBcIiksXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjbHM6IFwic2V0dGluZy1kcm9wZG93bi1sYWJlbFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGRyb3Bkb3duLnNlbGVjdEVsLnBhcmVudEVsZW1lbnQ/Lmluc2VydEJlZm9yZShcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGxhYmVsRWwsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRkcm9wZG93bi5zZWxlY3RFbFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdC8vIEFkZCBhbGwgb3RoZXIgc3ViLXN0YWdlcyBhcyBvcHRpb25zXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0dGhpcy53b3JrZmxvdy5zdGFnZXMuZm9yRWFjaChcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdChzOiBXb3JrZmxvd1N0YWdlKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGlmIChzLmlkICE9PSBzdWJTdGFnZS5pZCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGRyb3Bkb3duLmFkZE9wdGlvbihcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHMuaWQsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRzLm5hbWVcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gU2V0IHRoZSBjdXJyZW50IHZhbHVlXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0aWYgKHN1YlN0YWdlLm5leHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGRyb3Bkb3duLnNldFZhbHVlKHN1YlN0YWdlLm5leHQpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gSGFuZGxlIGNoYW5nZXNcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRkcm9wZG93bi5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHN1YlN0YWdlLm5leHQgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0Ly8gQWRkIHJlbW92ZSBidXR0b25cclxuXHRcdFx0XHRcdFx0XHRcdHNldHRpbmcuYWRkRXh0cmFCdXR0b24oKGJ1dHRvbikgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRidXR0b24uc2V0SWNvbihcInRyYXNoXCIpLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMud29ya2Zsb3cuc3RhZ2VzLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0cmVuZGVyU3RhZ2VzKCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBBZGQgYnV0dG9uIGZvciBuZXcgc3ViLXN0YWdlXHJcblx0XHRcdGNvbnN0IGFkZFN0YWdlQnV0dG9uID0gc3RhZ2VzQ29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0XHRjbHM6IFwid29ya2Zsb3ctYWRkLXN0YWdlLWJ1dHRvblwiLFxyXG5cdFx0XHRcdHRleHQ6IHQoXCJBZGQgU3ViLXN0YWdlXCIpLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0YWRkU3RhZ2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0XHRpZiAoIXRoaXMud29ya2Zsb3cuc3RhZ2VzKSB7XHJcblx0XHRcdFx0XHR0aGlzLndvcmtmbG93LnN0YWdlcyA9IFtdO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gQ3JlYXRlIGEgbmV3IHN1Yi1zdGFnZVxyXG5cdFx0XHRcdGNvbnN0IG5ld1N1YlN0YWdlOiB7XHJcblx0XHRcdFx0XHRpZDogc3RyaW5nO1xyXG5cdFx0XHRcdFx0bmFtZTogc3RyaW5nO1xyXG5cdFx0XHRcdFx0bmV4dD86IHN0cmluZztcclxuXHRcdFx0XHR9ID0ge1xyXG5cdFx0XHRcdFx0aWQ6IHRoaXMuZ2VuZXJhdGVVbmlxdWVJZCgpLFxyXG5cdFx0XHRcdFx0bmFtZTogdChcIk5ldyBTdWItc3RhZ2VcIiksXHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0Ly8gSWYgdGhlcmUgYXJlIGV4aXN0aW5nIHN1Yi1zdGFnZXMsIHNldCB0aGUgbmV4dCBwcm9wZXJ0eVxyXG5cdFx0XHRcdGlmICh0aGlzLndvcmtmbG93LnN0YWdlcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0XHQvLyBHZXQgdGhlIGxhc3Qgc3ViLXN0YWdlXHJcblx0XHRcdFx0XHRjb25zdCBsYXN0U3ViU3RhZ2UgPVxyXG5cdFx0XHRcdFx0XHR0aGlzLndvcmtmbG93LnN0YWdlc1t0aGlzLndvcmtmbG93LnN0YWdlcy5sZW5ndGggLSAxXTtcclxuXHJcblx0XHRcdFx0XHQvLyBTZXQgdGhlIGxhc3Qgc3ViLXN0YWdlJ3MgbmV4dCBwcm9wZXJ0eSB0byB0aGUgbmV3IHN1Yi1zdGFnZVxyXG5cdFx0XHRcdFx0aWYgKGxhc3RTdWJTdGFnZSkge1xyXG5cdFx0XHRcdFx0XHQvLyBFbnN1cmUgbGFzdFN1YlN0YWdlIGhhcyBhIG5leHQgcHJvcGVydHlcclxuXHRcdFx0XHRcdFx0aWYgKCEoXCJuZXh0XCIgaW4gbGFzdFN1YlN0YWdlKSkge1xyXG5cdFx0XHRcdFx0XHRcdC8vIEFkZCBuZXh0IHByb3BlcnR5IGlmIGl0IGRvZXNuJ3QgZXhpc3RcclxuXHRcdFx0XHRcdFx0XHQobGFzdFN1YlN0YWdlIGFzIGFueSkubmV4dCA9IG5ld1N1YlN0YWdlLmlkO1xyXG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdGxhc3RTdWJTdGFnZS5uZXh0ID0gbmV3U3ViU3RhZ2UuaWQ7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBTZXQgdGhlIG5ldyBzdWItc3RhZ2UncyBuZXh0IHByb3BlcnR5IHRvIHRoZSBmaXJzdCBzdWItc3RhZ2UgKGN5Y2xlKVxyXG5cdFx0XHRcdFx0aWYgKHRoaXMud29ya2Zsb3cuc3RhZ2VzWzBdKSB7XHJcblx0XHRcdFx0XHRcdG5ld1N1YlN0YWdlLm5leHQgPSB0aGlzLndvcmtmbG93LnN0YWdlc1swXS5pZDtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHRoaXMud29ya2Zsb3cuc3RhZ2VzLnB1c2gobmV3U3ViU3RhZ2UpO1xyXG5cdFx0XHRcdHJlbmRlclN0YWdlcygpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gSW5pdGlhbCByZW5kZXIgb2Ygc3RhZ2VzXHJcblx0XHRyZW5kZXJTdGFnZXMoKTtcclxuXHJcblx0XHQvLyBTYXZlIGFuZCBDYW5jZWwgYnV0dG9uc1xyXG5cdFx0Y29uc3QgYnV0dG9uQ29udGFpbmVyID0gY29udGVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ3b3JrZmxvdy1idXR0b25zXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCBjYW5jZWxCdXR0b24gPSBidXR0b25Db250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFwiQ2FuY2VsXCIpLFxyXG5cdFx0XHRjbHM6IFwid29ya2Zsb3ctY2FuY2VsLWJ1dHRvblwiLFxyXG5cdFx0fSk7XHJcblx0XHRjYW5jZWxCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3Qgc2F2ZUJ1dHRvbiA9IGJ1dHRvbkNvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXCJTYXZlXCIpLFxyXG5cdFx0XHRjbHM6IFwid29ya2Zsb3ctc2F2ZS1idXR0b24gbW9kLWN0YVwiLFxyXG5cdFx0fSk7XHJcblx0XHRzYXZlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdC8vIFVwZGF0ZSB0aGUgbGFzdE1vZGlmaWVkIGRhdGVcclxuXHRcdFx0aWYgKCF0aGlzLndvcmtmbG93Lm1ldGFkYXRhKSB7XHJcblx0XHRcdFx0dGhpcy53b3JrZmxvdy5tZXRhZGF0YSA9IHt9O1xyXG5cdFx0XHR9XHJcblx0XHRcdHRoaXMud29ya2Zsb3cubWV0YWRhdGEubGFzdE1vZGlmaWVkID0gbmV3IERhdGUoKVxyXG5cdFx0XHRcdC50b0lTT1N0cmluZygpXHJcblx0XHRcdFx0LnNwbGl0KFwiVFwiKVswXTtcclxuXHJcblx0XHRcdC8vIENhbGwgdGhlIG9uU2F2ZSBjYWxsYmFja1xyXG5cdFx0XHR0aGlzLm9uU2F2ZSh0aGlzLndvcmtmbG93KTtcclxuXHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRvbkNsb3NlKCkge1xyXG5cdFx0Y29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcblx0XHRjb250ZW50RWwuZW1wdHkoKTtcclxuXHR9XHJcblxyXG5cdGdlbmVyYXRlVW5pcXVlSWQoKTogc3RyaW5nIHtcclxuXHRcdHJldHVybiAoXHJcblx0XHRcdERhdGUubm93KCkudG9TdHJpbmcoMzYpICsgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDIsIDkpXHJcblx0XHQpO1xyXG5cdH1cclxufVxyXG4iXX0=