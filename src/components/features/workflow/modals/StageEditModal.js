import { Modal, Setting, DropdownComponent, ExtraButtonComponent, } from "obsidian";
import { t } from '@/translations/helper';
// Stage edit modal
export class StageEditModal extends Modal {
    constructor(app, stage, allStages, onSave) {
        super(app);
        this.stage = JSON.parse(JSON.stringify(stage)); // Deep copy
        this.allStages = allStages;
        this.onSave = onSave;
        // Initialize the renderStageTypeSettings as a no-op function that will be replaced in onOpen
        this.renderStageTypeSettings = () => { };
    }
    onOpen() {
        const { contentEl, titleEl } = this;
        this.modalEl.toggleClass("modal-stage-definition", true);
        titleEl.setText(t("Edit Stage"));
        // Basic stage information
        new Setting(contentEl)
            .setName(t("Stage name"))
            .setDesc(t("A descriptive name for this workflow stage"))
            .addText((text) => {
            text.setValue(this.stage.name || "")
                .setPlaceholder(t("Stage name"))
                .onChange((value) => {
                this.stage.name = value;
            });
        });
        new Setting(contentEl)
            .setName(t("Stage ID"))
            .setDesc(t("A unique identifier for the stage (used in tags)"))
            .addText((text) => {
            text.setValue(this.stage.id || "")
                .setPlaceholder("stage_id")
                .onChange((value) => {
                this.stage.id = value;
            });
        });
        new Setting(contentEl)
            .setName(t("Stage type"))
            .setDesc(t("The type of this workflow stage"))
            .addDropdown((dropdown) => {
            dropdown
                .addOption("linear", t("Linear (sequential)"))
                .addOption("cycle", t("Cycle (repeatable)"))
                .addOption("terminal", t("Terminal (end stage)"))
                .setValue(this.stage.type || "linear")
                .onChange((value) => {
                this.stage.type = value;
                // If changing to/from cycle, update the UI
                this.renderStageTypeSettings();
            });
        });
        // Container for type-specific settings
        const typeSettingsContainer = contentEl.createDiv({
            cls: "stage-type-settings",
        });
        // Function to render type-specific settings
        const renderTypeSettings = () => {
            typeSettingsContainer.empty();
            if (this.stage.type === "linear" || this.stage.type === "cycle") {
                // For linear and cycle stages, show next stage options
                if (this.allStages.length > 0) {
                    new Setting(typeSettingsContainer)
                        .setName(t("Next stage"))
                        .setDesc(t("The stage to proceed to after this one"))
                        .addDropdown((dropdown) => {
                        // Add all other stages as options
                        this.allStages.forEach((s) => {
                            if (s.id !== this.stage.id) {
                                dropdown.addOption(s.id, s.name);
                            }
                        });
                        // Set current value if it exists
                        if (typeof this.stage.next === "string" &&
                            this.stage.next) {
                            dropdown.setValue(this.stage.next);
                        }
                        dropdown.onChange((value) => {
                            this.stage.next = value;
                        });
                    });
                }
                // For cycle stages, add subStages
                if (this.stage.type === "cycle") {
                    // SubStages section
                    const subStagesSection = typeSettingsContainer.createDiv({
                        cls: "substages-section",
                    });
                    new Setting(subStagesSection)
                        .setName(t("Sub-stages"))
                        .setDesc(t("Define cycle sub-stages (optional)"));
                    const subStagesContainer = subStagesSection.createDiv({
                        cls: "substages-container",
                    });
                    // Function to render sub-stages
                    const renderSubStages = () => {
                        subStagesContainer.empty();
                        if (!this.stage.subStages ||
                            this.stage.subStages.length === 0) {
                            subStagesContainer.createEl("p", {
                                text: t("No sub-stages defined yet."),
                                cls: "no-substages-message",
                            });
                        }
                        else {
                            const subStagesList = subStagesContainer.createEl("ul", {
                                cls: "substages-list",
                            });
                            this.stage.subStages.forEach((subStage, index) => {
                                const subStageItem = subStagesList.createEl("li", {
                                    cls: "substage-item",
                                });
                                const subStageNameContainer = subStageItem.createDiv({
                                    cls: "substage-name-container",
                                });
                                // Name
                                const nameInput = subStageNameContainer.createEl("input", {
                                    type: "text",
                                    value: subStage.name || "",
                                    placeholder: t("Sub-stage name"),
                                });
                                nameInput.addEventListener("change", () => {
                                    subStage.name = nameInput.value;
                                });
                                // ID
                                const idInput = subStageNameContainer.createEl("input", {
                                    type: "text",
                                    value: subStage.id || "",
                                    placeholder: t("Sub-stage ID"),
                                });
                                idInput.addEventListener("change", () => {
                                    subStage.id = idInput.value;
                                });
                                // Next sub-stage dropdown (if more than one sub-stage)
                                if (this.stage.subStages.length > 1) {
                                    const nextContainer = subStageNameContainer.createDiv({
                                        cls: "substage-next-container",
                                    });
                                    nextContainer.createEl("span", {
                                        text: t("Next: "),
                                    });
                                    const dropdown = new DropdownComponent(nextContainer);
                                    // Add all other sub-stages as options
                                    this.stage.subStages.forEach((s) => {
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
                                }
                                subStageItem.createEl("div", {}, (el) => {
                                    const button = new ExtraButtonComponent(el)
                                        .setIcon("trash")
                                        .setTooltip(t("Remove"))
                                        .onClick(() => {
                                        this.stage.subStages.splice(index, 1);
                                        renderSubStages();
                                    });
                                    button.extraSettingsEl.toggleClass("substage-remove-button", true);
                                });
                            });
                        }
                        // Add button for new sub-stage
                        const addSubStageButton = subStagesContainer.createEl("button", {
                            cls: "add-substage-button",
                            text: t("Add Sub-stage"),
                        });
                        addSubStageButton.addEventListener("click", () => {
                            if (!this.stage.subStages) {
                                this.stage.subStages = [];
                            }
                            // Create a new sub-stage with proper typing
                            const newSubStage = {
                                id: this.generateUniqueId(),
                                name: t("New Sub-stage"),
                            };
                            // If there are existing sub-stages, set the next property
                            if (this.stage.subStages.length > 0) {
                                // Get the last sub-stage
                                const lastSubStage = this.stage.subStages[this.stage.subStages.length - 1];
                                // Set the last sub-stage's next property to the new sub-stage
                                if (lastSubStage) {
                                    // Ensure lastSubStage has a next property
                                    if (!("next" in lastSubStage)) {
                                        // Add next property if it doesn't exist
                                        lastSubStage.next =
                                            newSubStage.id;
                                    }
                                    else {
                                        lastSubStage.next = newSubStage.id;
                                    }
                                }
                                // Set the new sub-stage's next property to the first sub-stage (cycle)
                                if (this.stage.subStages[0]) {
                                    newSubStage.next =
                                        this.stage.subStages[0].id;
                                }
                            }
                            this.stage.subStages.push(newSubStage);
                            renderSubStages();
                        });
                    };
                    // Initial render of sub-stages
                    renderSubStages();
                }
                // Can proceed to section (additional stages that can follow this one)
                const canProceedToSection = typeSettingsContainer.createDiv({
                    cls: "can-proceed-to-section",
                });
                new Setting(canProceedToSection)
                    .setName(t("Can proceed to"))
                    .setDesc(t("Additional stages that can follow this one (for right-click menu)"));
                const canProceedToContainer = canProceedToSection.createDiv({
                    cls: "can-proceed-to-container",
                });
                // Function to render canProceedTo options
                const renderCanProceedTo = () => {
                    canProceedToContainer.empty();
                    if (!this.stage.canProceedTo ||
                        this.stage.canProceedTo.length === 0) {
                        canProceedToContainer.createEl("p", {
                            text: t("No additional destination stages defined."),
                            cls: "no-can-proceed-message",
                        });
                    }
                    else {
                        const canProceedList = canProceedToContainer.createEl("ul", {
                            cls: "can-proceed-list",
                        });
                        this.stage.canProceedTo.forEach((stageId, index) => {
                            // Find the corresponding stage
                            const targetStage = this.allStages.find((s) => s.id === stageId);
                            if (targetStage) {
                                const proceedItem = canProceedList.createEl("li", {
                                    cls: "can-proceed-item",
                                });
                                const setting = new Setting(proceedItem).setName(targetStage.name);
                                // Remove button
                                setting.addExtraButton((button) => {
                                    button
                                        .setIcon("trash")
                                        .setTooltip(t("Remove"))
                                        .onClick(() => {
                                        this.stage.canProceedTo.splice(index, 1);
                                        renderCanProceedTo();
                                    });
                                });
                            }
                        });
                    }
                    // Add dropdown to add new destination
                    if (this.allStages.length > 0) {
                        const addContainer = canProceedToContainer.createDiv({
                            cls: "add-can-proceed-container",
                        });
                        let dropdown;
                        addContainer.createEl("div", {
                            cls: "add-can-proceed-select",
                        }, (el) => {
                            dropdown = new DropdownComponent(el);
                            this.allStages.forEach((s) => {
                                if (s.id !== this.stage.id &&
                                    (!this.stage.canProceedTo ||
                                        !this.stage.canProceedTo.includes(s.id))) {
                                    dropdown.addOption(s.id, s.name);
                                }
                            });
                        });
                        // Add all other stages as options (that aren't already in canProceedTo)
                        const addButton = addContainer.createEl("button", {
                            cls: "add-can-proceed-button",
                            text: t("Add"),
                        });
                        addButton.addEventListener("click", () => {
                            if (dropdown.selectEl.value) {
                                if (!this.stage.canProceedTo) {
                                    this.stage.canProceedTo = [];
                                }
                                this.stage.canProceedTo.push(dropdown.selectEl.value);
                                renderCanProceedTo();
                            }
                        });
                    }
                };
                // Initial render of canProceedTo
                renderCanProceedTo();
            }
        };
        // Method to re-render the stage type settings when the type changes
        this.renderStageTypeSettings = renderTypeSettings;
        // Initial render of type settings
        renderTypeSettings();
        // Save and Cancel buttons
        const buttonContainer = contentEl.createDiv({ cls: "stage-buttons" });
        const cancelButton = buttonContainer.createEl("button", {
            text: t("Cancel"),
            cls: "stage-cancel-button",
        });
        cancelButton.addEventListener("click", () => {
            this.close();
        });
        const saveButton = buttonContainer.createEl("button", {
            text: t("Save"),
            cls: "stage-save-button mod-cta",
        });
        saveButton.addEventListener("click", () => {
            // Validate the stage before saving
            if (!this.stage.name || !this.stage.id) {
                // Show error
                const errorMsg = contentEl.createDiv({
                    cls: "stage-error-message",
                    text: t("Name and ID are required."),
                });
                // Remove after 3 seconds
                setTimeout(() => {
                    errorMsg.remove();
                }, 3000);
                return;
            }
            // Call the onSave callback
            this.onSave(this.stage);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3RhZ2VFZGl0TW9kYWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJTdGFnZUVkaXRNb2RhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ04sS0FBSyxFQUVMLE9BQU8sRUFDUCxpQkFBaUIsRUFDakIsb0JBQW9CLEdBQ3BCLE1BQU0sVUFBVSxDQUFDO0FBQ2xCLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUUxQyxtQkFBbUI7QUFDbkIsTUFBTSxPQUFPLGNBQWUsU0FBUSxLQUFLO0lBTXhDLFlBQ0MsR0FBUSxFQUNSLEtBQVUsRUFDVixTQUFnQixFQUNoQixNQUE0QjtRQUU1QixLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDWCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWTtRQUM1RCxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUMzQixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQiw2RkFBNkY7UUFDN0YsSUFBSSxDQUFDLHVCQUF1QixHQUFHLEdBQUcsRUFBRSxHQUFFLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBRUQsTUFBTTtRQUNMLE1BQU0sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBRXBDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLHdCQUF3QixFQUFFLElBQUksQ0FBQyxDQUFDO1FBRXpELE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFFakMsMEJBQTBCO1FBQzFCLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQzthQUNwQixPQUFPLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDO2FBQ3hCLE9BQU8sQ0FBQyxDQUFDLENBQUMsNENBQTRDLENBQUMs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Q0FBQztZQUN4QixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxPQUFPO1FBQ04sTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQztRQUMzQixTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDbkIsQ0FBQztJQUVELGdCQUFnQjtRQUNmLE9BQU8sQ0FDTixJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDcEUsQ0FBQztJQUNILENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XHJcblx0TW9kYWwsXHJcblx0QXBwLFxyXG5cdFNldHRpbmcsXHJcblx0RHJvcGRvd25Db21wb25lbnQsXHJcblx0RXh0cmFCdXR0b25Db21wb25lbnQsXHJcbn0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tICdAL3RyYW5zbGF0aW9ucy9oZWxwZXInO1xyXG5cclxuLy8gU3RhZ2UgZWRpdCBtb2RhbFxyXG5leHBvcnQgY2xhc3MgU3RhZ2VFZGl0TW9kYWwgZXh0ZW5kcyBNb2RhbCB7XHJcblx0c3RhZ2U6IGFueTtcclxuXHRhbGxTdGFnZXM6IGFueVtdO1xyXG5cdG9uU2F2ZTogKHN0YWdlOiBhbnkpID0+IHZvaWQ7XHJcblx0cmVuZGVyU3RhZ2VUeXBlU2V0dGluZ3M6ICgpID0+IHZvaWQ7XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0YXBwOiBBcHAsXHJcblx0XHRzdGFnZTogYW55LFxyXG5cdFx0YWxsU3RhZ2VzOiBhbnlbXSxcclxuXHRcdG9uU2F2ZTogKHN0YWdlOiBhbnkpID0+IHZvaWRcclxuXHQpIHtcclxuXHRcdHN1cGVyKGFwcCk7XHJcblx0XHR0aGlzLnN0YWdlID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzdGFnZSkpOyAvLyBEZWVwIGNvcHlcclxuXHRcdHRoaXMuYWxsU3RhZ2VzID0gYWxsU3RhZ2VzO1xyXG5cdFx0dGhpcy5vblNhdmUgPSBvblNhdmU7XHJcblx0XHQvLyBJbml0aWFsaXplIHRoZSByZW5kZXJTdGFnZVR5cGVTZXR0aW5ncyBhcyBhIG5vLW9wIGZ1bmN0aW9uIHRoYXQgd2lsbCBiZSByZXBsYWNlZCBpbiBvbk9wZW5cclxuXHRcdHRoaXMucmVuZGVyU3RhZ2VUeXBlU2V0dGluZ3MgPSAoKSA9PiB7fTtcclxuXHR9XHJcblxyXG5cdG9uT3BlbigpIHtcclxuXHRcdGNvbnN0IHsgY29udGVudEVsLCB0aXRsZUVsIH0gPSB0aGlzO1xyXG5cclxuXHRcdHRoaXMubW9kYWxFbC50b2dnbGVDbGFzcyhcIm1vZGFsLXN0YWdlLWRlZmluaXRpb25cIiwgdHJ1ZSk7XHJcblxyXG5cdFx0dGl0bGVFbC5zZXRUZXh0KHQoXCJFZGl0IFN0YWdlXCIpKTtcclxuXHJcblx0XHQvLyBCYXNpYyBzdGFnZSBpbmZvcm1hdGlvblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGVudEVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiU3RhZ2UgbmFtZVwiKSlcclxuXHRcdFx0LnNldERlc2ModChcIkEgZGVzY3JpcHRpdmUgbmFtZSBmb3IgdGhpcyB3b3JrZmxvdyBzdGFnZVwiKSlcclxuXHRcdFx0LmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0XHR0ZXh0LnNldFZhbHVlKHRoaXMuc3RhZ2UubmFtZSB8fCBcIlwiKVxyXG5cdFx0XHRcdFx0LnNldFBsYWNlaG9sZGVyKHQoXCJTdGFnZSBuYW1lXCIpKVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnN0YWdlLm5hbWUgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRuZXcgU2V0dGluZyhjb250ZW50RWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJTdGFnZSBJRFwiKSlcclxuXHRcdFx0LnNldERlc2ModChcIkEgdW5pcXVlIGlkZW50aWZpZXIgZm9yIHRoZSBzdGFnZSAodXNlZCBpbiB0YWdzKVwiKSlcclxuXHRcdFx0LmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0XHR0ZXh0LnNldFZhbHVlKHRoaXMuc3RhZ2UuaWQgfHwgXCJcIilcclxuXHRcdFx0XHRcdC5zZXRQbGFjZWhvbGRlcihcInN0YWdlX2lkXCIpXHJcblx0XHRcdFx0XHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMuc3RhZ2UuaWQgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRuZXcgU2V0dGluZyhjb250ZW50RWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJTdGFnZSB0eXBlXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyh0KFwiVGhlIHR5cGUgb2YgdGhpcyB3b3JrZmxvdyBzdGFnZVwiKSlcclxuXHRcdFx0LmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xyXG5cdFx0XHRcdGRyb3Bkb3duXHJcblx0XHRcdFx0XHQuYWRkT3B0aW9uKFwibGluZWFyXCIsIHQoXCJMaW5lYXIgKHNlcXVlbnRpYWwpXCIpKVxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcImN5Y2xlXCIsIHQoXCJDeWNsZSAocmVwZWF0YWJsZSlcIikpXHJcblx0XHRcdFx0XHQuYWRkT3B0aW9uKFwidGVybWluYWxcIiwgdChcIlRlcm1pbmFsIChlbmQgc3RhZ2UpXCIpKVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKHRoaXMuc3RhZ2UudHlwZSB8fCBcImxpbmVhclwiKVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZTogXCJsaW5lYXJcIiB8IFwiY3ljbGVcIiB8IFwidGVybWluYWxcIikgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnN0YWdlLnR5cGUgPSB2YWx1ZTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIElmIGNoYW5naW5nIHRvL2Zyb20gY3ljbGUsIHVwZGF0ZSB0aGUgVUlcclxuXHRcdFx0XHRcdFx0dGhpcy5yZW5kZXJTdGFnZVR5cGVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdC8vIENvbnRhaW5lciBmb3IgdHlwZS1zcGVjaWZpYyBzZXR0aW5nc1xyXG5cdFx0Y29uc3QgdHlwZVNldHRpbmdzQ29udGFpbmVyID0gY29udGVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJzdGFnZS10eXBlLXNldHRpbmdzXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBGdW5jdGlvbiB0byByZW5kZXIgdHlwZS1zcGVjaWZpYyBzZXR0aW5nc1xyXG5cdFx0Y29uc3QgcmVuZGVyVHlwZVNldHRpbmdzID0gKCkgPT4ge1xyXG5cdFx0XHR0eXBlU2V0dGluZ3NDb250YWluZXIuZW1wdHkoKTtcclxuXHJcblx0XHRcdGlmICh0aGlzLnN0YWdlLnR5cGUgPT09IFwibGluZWFyXCIgfHwgdGhpcy5zdGFnZS50eXBlID09PSBcImN5Y2xlXCIpIHtcclxuXHRcdFx0XHQvLyBGb3IgbGluZWFyIGFuZCBjeWNsZSBzdGFnZXMsIHNob3cgbmV4dCBzdGFnZSBvcHRpb25zXHJcblx0XHRcdFx0aWYgKHRoaXMuYWxsU3RhZ2VzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRcdG5ldyBTZXR0aW5nKHR5cGVTZXR0aW5nc0NvbnRhaW5lcilcclxuXHRcdFx0XHRcdFx0LnNldE5hbWUodChcIk5leHQgc3RhZ2VcIikpXHJcblx0XHRcdFx0XHRcdC5zZXREZXNjKHQoXCJUaGUgc3RhZ2UgdG8gcHJvY2VlZCB0byBhZnRlciB0aGlzIG9uZVwiKSlcclxuXHRcdFx0XHRcdFx0LmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdC8vIEFkZCBhbGwgb3RoZXIgc3RhZ2VzIGFzIG9wdGlvbnNcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmFsbFN0YWdlcy5mb3JFYWNoKChzKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRpZiAocy5pZCAhPT0gdGhpcy5zdGFnZS5pZCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRkcm9wZG93bi5hZGRPcHRpb24ocy5pZCwgcy5uYW1lKTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gU2V0IGN1cnJlbnQgdmFsdWUgaWYgaXQgZXhpc3RzXHJcblx0XHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdFx0dHlwZW9mIHRoaXMuc3RhZ2UubmV4dCA9PT0gXCJzdHJpbmdcIiAmJlxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5zdGFnZS5uZXh0XHJcblx0XHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRkcm9wZG93bi5zZXRWYWx1ZSh0aGlzLnN0YWdlLm5leHQpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0ZHJvcGRvd24ub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnN0YWdlLm5leHQgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBGb3IgY3ljbGUgc3RhZ2VzLCBhZGQgc3ViU3RhZ2VzXHJcblx0XHRcdFx0aWYgKHRoaXMuc3RhZ2UudHlwZSA9PT0gXCJjeWNsZVwiKSB7XHJcblx0XHRcdFx0XHQvLyBTdWJTdGFnZXMgc2VjdGlvblxyXG5cdFx0XHRcdFx0Y29uc3Qgc3ViU3RhZ2VzU2VjdGlvbiA9IHR5cGVTZXR0aW5nc0NvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdFx0XHRjbHM6IFwic3Vic3RhZ2VzLXNlY3Rpb25cIixcclxuXHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdG5ldyBTZXR0aW5nKHN1YlN0YWdlc1NlY3Rpb24pXHJcblx0XHRcdFx0XHRcdC5zZXROYW1lKHQoXCJTdWItc3RhZ2VzXCIpKVxyXG5cdFx0XHRcdFx0XHQuc2V0RGVzYyh0KFwiRGVmaW5lIGN5Y2xlIHN1Yi1zdGFnZXMgKG9wdGlvbmFsKVwiKSk7XHJcblxyXG5cdFx0XHRcdFx0Y29uc3Qgc3ViU3RhZ2VzQ29udGFpbmVyID0gc3ViU3RhZ2VzU2VjdGlvbi5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdFx0XHRjbHM6IFwic3Vic3RhZ2VzLWNvbnRhaW5lclwiLFxyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gRnVuY3Rpb24gdG8gcmVuZGVyIHN1Yi1zdGFnZXNcclxuXHRcdFx0XHRcdGNvbnN0IHJlbmRlclN1YlN0YWdlcyA9ICgpID0+IHtcclxuXHRcdFx0XHRcdFx0c3ViU3RhZ2VzQ29udGFpbmVyLmVtcHR5KCk7XHJcblxyXG5cdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0IXRoaXMuc3RhZ2Uuc3ViU3RhZ2VzIHx8XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5zdGFnZS5zdWJTdGFnZXMubGVuZ3RoID09PSAwXHJcblx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdHN1YlN0YWdlc0NvbnRhaW5lci5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHRcdFx0XHRcdFx0dGV4dDogdChcIk5vIHN1Yi1zdGFnZXMgZGVmaW5lZCB5ZXQuXCIpLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2xzOiBcIm5vLXN1YnN0YWdlcy1tZXNzYWdlXCIsXHJcblx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3Qgc3ViU3RhZ2VzTGlzdCA9IHN1YlN0YWdlc0NvbnRhaW5lci5jcmVhdGVFbChcclxuXHRcdFx0XHRcdFx0XHRcdFwidWxcIixcclxuXHRcdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y2xzOiBcInN1YnN0YWdlcy1saXN0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0XHRcdFx0dGhpcy5zdGFnZS5zdWJTdGFnZXMuZm9yRWFjaChcclxuXHRcdFx0XHRcdFx0XHRcdChzdWJTdGFnZTogYW55LCBpbmRleDogbnVtYmVyKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IHN1YlN0YWdlSXRlbSA9IHN1YlN0YWdlc0xpc3QuY3JlYXRlRWwoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XCJsaVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNsczogXCJzdWJzdGFnZS1pdGVtXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc3Qgc3ViU3RhZ2VOYW1lQ29udGFpbmVyID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRzdWJTdGFnZUl0ZW0uY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNsczogXCJzdWJzdGFnZS1uYW1lLWNvbnRhaW5lclwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gTmFtZVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBuYW1lSW5wdXQgPVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHN1YlN0YWdlTmFtZUNvbnRhaW5lci5jcmVhdGVFbChcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0dHlwZTogXCJ0ZXh0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHZhbHVlOiBzdWJTdGFnZS5uYW1lIHx8IFwiXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyOlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHQoXCJTdWItc3RhZ2UgbmFtZVwiKSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRuYW1lSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0c3ViU3RhZ2UubmFtZSA9IG5hbWVJbnB1dC52YWx1ZTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBJRFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBpZElucHV0ID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRzdWJTdGFnZU5hbWVDb250YWluZXIuY3JlYXRlRWwoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHR5cGU6IFwidGV4dFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR2YWx1ZTogc3ViU3RhZ2UuaWQgfHwgXCJcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6IHQoXCJTdWItc3RhZ2UgSURcIiksXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0aWRJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsICgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRzdWJTdGFnZS5pZCA9IGlkSW5wdXQudmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gTmV4dCBzdWItc3RhZ2UgZHJvcGRvd24gKGlmIG1vcmUgdGhhbiBvbmUgc3ViLXN0YWdlKVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAodGhpcy5zdGFnZS5zdWJTdGFnZXMubGVuZ3RoID4gMSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IG5leHRDb250YWluZXIgPVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0c3ViU3RhZ2VOYW1lQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNsczogXCJzdWJzdGFnZS1uZXh0LWNvbnRhaW5lclwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0bmV4dENvbnRhaW5lci5jcmVhdGVFbChcInNwYW5cIiwge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0dGV4dDogdChcIk5leHQ6IFwiKSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgZHJvcGRvd24gPSBuZXcgRHJvcGRvd25Db21wb25lbnQoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRuZXh0Q29udGFpbmVyXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gQWRkIGFsbCBvdGhlciBzdWItc3RhZ2VzIGFzIG9wdGlvbnNcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnN0YWdlLnN1YlN0YWdlcy5mb3JFYWNoKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0KHM6IGFueSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRpZiAocy5pZCAhPT0gc3ViU3RhZ2UuaWQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRkcm9wZG93bi5hZGRPcHRpb24oXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRzLmlkLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0cy5uYW1lXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdC8vIFNldCB0aGUgY3VycmVudCB2YWx1ZVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGlmIChzdWJTdGFnZS5uZXh0KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRkcm9wZG93bi5zZXRWYWx1ZShzdWJTdGFnZS5uZXh0KTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdC8vIEhhbmRsZSBjaGFuZ2VzXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZHJvcGRvd24ub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRzdWJTdGFnZS5uZXh0ID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0XHRcdHN1YlN0YWdlSXRlbS5jcmVhdGVFbChcImRpdlwiLCB7fSwgKGVsKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgYnV0dG9uID0gbmV3IEV4dHJhQnV0dG9uQ29tcG9uZW50KFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZWxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQuc2V0SWNvbihcInRyYXNoXCIpXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQuc2V0VG9vbHRpcCh0KFwiUmVtb3ZlXCIpKVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnN0YWdlLnN1YlN0YWdlcy5zcGxpY2UoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0aW5kZXgsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0MVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRyZW5kZXJTdWJTdGFnZXMoKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRidXR0b24uZXh0cmFTZXR0aW5nc0VsLnRvZ2dsZUNsYXNzKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XCJzdWJzdGFnZS1yZW1vdmUtYnV0dG9uXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0cnVlXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0Ly8gQWRkIGJ1dHRvbiBmb3IgbmV3IHN1Yi1zdGFnZVxyXG5cdFx0XHRcdFx0XHRjb25zdCBhZGRTdWJTdGFnZUJ1dHRvbiA9IHN1YlN0YWdlc0NvbnRhaW5lci5jcmVhdGVFbChcclxuXHRcdFx0XHRcdFx0XHRcImJ1dHRvblwiLFxyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdGNsczogXCJhZGQtc3Vic3RhZ2UtYnV0dG9uXCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0ZXh0OiB0KFwiQWRkIFN1Yi1zdGFnZVwiKSxcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdGFkZFN1YlN0YWdlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0aWYgKCF0aGlzLnN0YWdlLnN1YlN0YWdlcykge1xyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5zdGFnZS5zdWJTdGFnZXMgPSBbXTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdC8vIENyZWF0ZSBhIG5ldyBzdWItc3RhZ2Ugd2l0aCBwcm9wZXIgdHlwaW5nXHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgbmV3U3ViU3RhZ2U6IHtcclxuXHRcdFx0XHRcdFx0XHRcdGlkOiBzdHJpbmc7XHJcblx0XHRcdFx0XHRcdFx0XHRuYW1lOiBzdHJpbmc7XHJcblx0XHRcdFx0XHRcdFx0XHRuZXh0Pzogc3RyaW5nO1xyXG5cdFx0XHRcdFx0XHRcdH0gPSB7XHJcblx0XHRcdFx0XHRcdFx0XHRpZDogdGhpcy5nZW5lcmF0ZVVuaXF1ZUlkKCksXHJcblx0XHRcdFx0XHRcdFx0XHRuYW1lOiB0KFwiTmV3IFN1Yi1zdGFnZVwiKSxcclxuXHRcdFx0XHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyBJZiB0aGVyZSBhcmUgZXhpc3Rpbmcgc3ViLXN0YWdlcywgc2V0IHRoZSBuZXh0IHByb3BlcnR5XHJcblx0XHRcdFx0XHRcdFx0aWYgKHRoaXMuc3RhZ2Uuc3ViU3RhZ2VzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRcdFx0XHRcdC8vIEdldCB0aGUgbGFzdCBzdWItc3RhZ2VcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IGxhc3RTdWJTdGFnZSA9XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuc3RhZ2Uuc3ViU3RhZ2VzW1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuc3RhZ2Uuc3ViU3RhZ2VzLmxlbmd0aCAtIDFcclxuXHRcdFx0XHRcdFx0XHRcdFx0XTtcclxuXHJcblx0XHRcdFx0XHRcdFx0XHQvLyBTZXQgdGhlIGxhc3Qgc3ViLXN0YWdlJ3MgbmV4dCBwcm9wZXJ0eSB0byB0aGUgbmV3IHN1Yi1zdGFnZVxyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKGxhc3RTdWJTdGFnZSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBFbnN1cmUgbGFzdFN1YlN0YWdlIGhhcyBhIG5leHQgcHJvcGVydHlcclxuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKCEoXCJuZXh0XCIgaW4gbGFzdFN1YlN0YWdlKSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdC8vIEFkZCBuZXh0IHByb3BlcnR5IGlmIGl0IGRvZXNuJ3QgZXhpc3RcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQobGFzdFN1YlN0YWdlIGFzIGFueSkubmV4dCA9XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRuZXdTdWJTdGFnZS5pZDtcclxuXHRcdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRsYXN0U3ViU3RhZ2UubmV4dCA9IG5ld1N1YlN0YWdlLmlkO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0Ly8gU2V0IHRoZSBuZXcgc3ViLXN0YWdlJ3MgbmV4dCBwcm9wZXJ0eSB0byB0aGUgZmlyc3Qgc3ViLXN0YWdlIChjeWNsZSlcclxuXHRcdFx0XHRcdFx0XHRcdGlmICh0aGlzLnN0YWdlLnN1YlN0YWdlc1swXSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRuZXdTdWJTdGFnZS5uZXh0ID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnN0YWdlLnN1YlN0YWdlc1swXS5pZDtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdHRoaXMuc3RhZ2Uuc3ViU3RhZ2VzLnB1c2gobmV3U3ViU3RhZ2UpO1xyXG5cdFx0XHRcdFx0XHRcdHJlbmRlclN1YlN0YWdlcygpO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdFx0Ly8gSW5pdGlhbCByZW5kZXIgb2Ygc3ViLXN0YWdlc1xyXG5cdFx0XHRcdFx0cmVuZGVyU3ViU3RhZ2VzKCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBDYW4gcHJvY2VlZCB0byBzZWN0aW9uIChhZGRpdGlvbmFsIHN0YWdlcyB0aGF0IGNhbiBmb2xsb3cgdGhpcyBvbmUpXHJcblx0XHRcdFx0Y29uc3QgY2FuUHJvY2VlZFRvU2VjdGlvbiA9IHR5cGVTZXR0aW5nc0NvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdFx0Y2xzOiBcImNhbi1wcm9jZWVkLXRvLXNlY3Rpb25cIixcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0bmV3IFNldHRpbmcoY2FuUHJvY2VlZFRvU2VjdGlvbilcclxuXHRcdFx0XHRcdC5zZXROYW1lKHQoXCJDYW4gcHJvY2VlZCB0b1wiKSlcclxuXHRcdFx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XHRcdFwiQWRkaXRpb25hbCBzdGFnZXMgdGhhdCBjYW4gZm9sbG93IHRoaXMgb25lIChmb3IgcmlnaHQtY2xpY2sgbWVudSlcIlxyXG5cdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRjb25zdCBjYW5Qcm9jZWVkVG9Db250YWluZXIgPSBjYW5Qcm9jZWVkVG9TZWN0aW9uLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0XHRjbHM6IFwiY2FuLXByb2NlZWQtdG8tY29udGFpbmVyXCIsXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIEZ1bmN0aW9uIHRvIHJlbmRlciBjYW5Qcm9jZWVkVG8gb3B0aW9uc1xyXG5cdFx0XHRcdGNvbnN0IHJlbmRlckNhblByb2NlZWRUbyA9ICgpID0+IHtcclxuXHRcdFx0XHRcdGNhblByb2NlZWRUb0NvbnRhaW5lci5lbXB0eSgpO1xyXG5cclxuXHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0IXRoaXMuc3RhZ2UuY2FuUHJvY2VlZFRvIHx8XHJcblx0XHRcdFx0XHRcdHRoaXMuc3RhZ2UuY2FuUHJvY2VlZFRvLmxlbmd0aCA9PT0gMFxyXG5cdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdGNhblByb2NlZWRUb0NvbnRhaW5lci5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHRcdFx0XHRcdHRleHQ6IHQoXHJcblx0XHRcdFx0XHRcdFx0XHRcIk5vIGFkZGl0aW9uYWwgZGVzdGluYXRpb24gc3RhZ2VzIGRlZmluZWQuXCJcclxuXHRcdFx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0XHRcdGNsczogXCJuby1jYW4tcHJvY2VlZC1tZXNzYWdlXCIsXHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgY2FuUHJvY2VlZExpc3QgPSBjYW5Qcm9jZWVkVG9Db250YWluZXIuY3JlYXRlRWwoXHJcblx0XHRcdFx0XHRcdFx0XCJ1bFwiLFxyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdGNsczogXCJjYW4tcHJvY2VlZC1saXN0XCIsXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdFx0dGhpcy5zdGFnZS5jYW5Qcm9jZWVkVG8uZm9yRWFjaChcclxuXHRcdFx0XHRcdFx0XHQoc3RhZ2VJZDogc3RyaW5nLCBpbmRleDogbnVtYmVyKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHQvLyBGaW5kIHRoZSBjb3JyZXNwb25kaW5nIHN0YWdlXHJcblx0XHRcdFx0XHRcdFx0XHRjb25zdCB0YXJnZXRTdGFnZSA9IHRoaXMuYWxsU3RhZ2VzLmZpbmQoXHJcblx0XHRcdFx0XHRcdFx0XHRcdChzKSA9PiBzLmlkID09PSBzdGFnZUlkXHJcblx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdGlmICh0YXJnZXRTdGFnZSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBwcm9jZWVkSXRlbSA9IGNhblByb2NlZWRMaXN0LmNyZWF0ZUVsKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFwibGlcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjbHM6IFwiY2FuLXByb2NlZWQtaXRlbVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IHNldHRpbmcgPSBuZXcgU2V0dGluZyhcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRwcm9jZWVkSXRlbVxyXG5cdFx0XHRcdFx0XHRcdFx0XHQpLnNldE5hbWUodGFyZ2V0U3RhZ2UubmFtZSk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBSZW1vdmUgYnV0dG9uXHJcblx0XHRcdFx0XHRcdFx0XHRcdHNldHRpbmcuYWRkRXh0cmFCdXR0b24oKGJ1dHRvbikgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGJ1dHRvblxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0LnNldEljb24oXCJ0cmFzaFwiKVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0LnNldFRvb2x0aXAodChcIlJlbW92ZVwiKSlcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5zdGFnZS5jYW5Qcm9jZWVkVG8uc3BsaWNlKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGluZGV4LFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdDFcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0cmVuZGVyQ2FuUHJvY2VlZFRvKCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIEFkZCBkcm9wZG93biB0byBhZGQgbmV3IGRlc3RpbmF0aW9uXHJcblx0XHRcdFx0XHRpZiAodGhpcy5hbGxTdGFnZXMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBhZGRDb250YWluZXIgPSBjYW5Qcm9jZWVkVG9Db250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRcdFx0XHRjbHM6IFwiYWRkLWNhbi1wcm9jZWVkLWNvbnRhaW5lclwiLFxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRcdGxldCBkcm9wZG93bjogRHJvcGRvd25Db21wb25lbnQ7XHJcblxyXG5cdFx0XHRcdFx0XHRhZGRDb250YWluZXIuY3JlYXRlRWwoXHJcblx0XHRcdFx0XHRcdFx0XCJkaXZcIixcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRjbHM6IFwiYWRkLWNhbi1wcm9jZWVkLXNlbGVjdFwiLFxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0KGVsKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRkcm9wZG93biA9IG5ldyBEcm9wZG93bkNvbXBvbmVudChlbCk7XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLmFsbFN0YWdlcy5mb3JFYWNoKChzKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRzLmlkICE9PSB0aGlzLnN0YWdlLmlkICYmXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0KCF0aGlzLnN0YWdlLmNhblByb2NlZWRUbyB8fFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0IXRoaXMuc3RhZ2UuY2FuUHJvY2VlZFRvLmluY2x1ZGVzKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRzLmlkXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQpKVxyXG5cdFx0XHRcdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRkcm9wZG93bi5hZGRPcHRpb24ocy5pZCwgcy5uYW1lKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gQWRkIGFsbCBvdGhlciBzdGFnZXMgYXMgb3B0aW9ucyAodGhhdCBhcmVuJ3QgYWxyZWFkeSBpbiBjYW5Qcm9jZWVkVG8pXHJcblxyXG5cdFx0XHRcdFx0XHRjb25zdCBhZGRCdXR0b24gPSBhZGRDb250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHRcdFx0XHRcdGNsczogXCJhZGQtY2FuLXByb2NlZWQtYnV0dG9uXCIsXHJcblx0XHRcdFx0XHRcdFx0dGV4dDogdChcIkFkZFwiKSxcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdGFkZEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdGlmIChkcm9wZG93bi5zZWxlY3RFbC52YWx1ZSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKCF0aGlzLnN0YWdlLmNhblByb2NlZWRUbykge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnN0YWdlLmNhblByb2NlZWRUbyA9IFtdO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5zdGFnZS5jYW5Qcm9jZWVkVG8ucHVzaChcclxuXHRcdFx0XHRcdFx0XHRcdFx0ZHJvcGRvd24uc2VsZWN0RWwudmFsdWVcclxuXHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0XHRyZW5kZXJDYW5Qcm9jZWVkVG8oKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdC8vIEluaXRpYWwgcmVuZGVyIG9mIGNhblByb2NlZWRUb1xyXG5cdFx0XHRcdHJlbmRlckNhblByb2NlZWRUbygpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIE1ldGhvZCB0byByZS1yZW5kZXIgdGhlIHN0YWdlIHR5cGUgc2V0dGluZ3Mgd2hlbiB0aGUgdHlwZSBjaGFuZ2VzXHJcblx0XHR0aGlzLnJlbmRlclN0YWdlVHlwZVNldHRpbmdzID0gcmVuZGVyVHlwZVNldHRpbmdzO1xyXG5cclxuXHRcdC8vIEluaXRpYWwgcmVuZGVyIG9mIHR5cGUgc2V0dGluZ3NcclxuXHRcdHJlbmRlclR5cGVTZXR0aW5ncygpO1xyXG5cclxuXHRcdC8vIFNhdmUgYW5kIENhbmNlbCBidXR0b25zXHJcblx0XHRjb25zdCBidXR0b25Db250YWluZXIgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInN0YWdlLWJ1dHRvbnNcIiB9KTtcclxuXHJcblx0XHRjb25zdCBjYW5jZWxCdXR0b24gPSBidXR0b25Db250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFwiQ2FuY2VsXCIpLFxyXG5cdFx0XHRjbHM6IFwic3RhZ2UtY2FuY2VsLWJ1dHRvblwiLFxyXG5cdFx0fSk7XHJcblx0XHRjYW5jZWxCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3Qgc2F2ZUJ1dHRvbiA9IGJ1dHRvbkNvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXCJTYXZlXCIpLFxyXG5cdFx0XHRjbHM6IFwic3RhZ2Utc2F2ZS1idXR0b24gbW9kLWN0YVwiLFxyXG5cdFx0fSk7XHJcblx0XHRzYXZlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdC8vIFZhbGlkYXRlIHRoZSBzdGFnZSBiZWZvcmUgc2F2aW5nXHJcblx0XHRcdGlmICghdGhpcy5zdGFnZS5uYW1lIHx8ICF0aGlzLnN0YWdlLmlkKSB7XHJcblx0XHRcdFx0Ly8gU2hvdyBlcnJvclxyXG5cdFx0XHRcdGNvbnN0IGVycm9yTXNnID0gY29udGVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0XHRjbHM6IFwic3RhZ2UtZXJyb3ItbWVzc2FnZVwiLFxyXG5cdFx0XHRcdFx0dGV4dDogdChcIk5hbWUgYW5kIElEIGFyZSByZXF1aXJlZC5cIiksXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIFJlbW92ZSBhZnRlciAzIHNlY29uZHNcclxuXHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRcdGVycm9yTXNnLnJlbW92ZSgpO1xyXG5cdFx0XHRcdH0sIDMwMDApO1xyXG5cclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENhbGwgdGhlIG9uU2F2ZSBjYWxsYmFja1xyXG5cdFx0XHR0aGlzLm9uU2F2ZSh0aGlzLnN0YWdlKTtcclxuXHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRvbkNsb3NlKCkge1xyXG5cdFx0Y29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcblx0XHRjb250ZW50RWwuZW1wdHkoKTtcclxuXHR9XHJcblxyXG5cdGdlbmVyYXRlVW5pcXVlSWQoKTogc3RyaW5nIHtcclxuXHRcdHJldHVybiAoXHJcblx0XHRcdERhdGUubm93KCkudG9TdHJpbmcoMzYpICsgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDIsIDkpXHJcblx0XHQpO1xyXG5cdH1cclxufVxyXG4iXX0=