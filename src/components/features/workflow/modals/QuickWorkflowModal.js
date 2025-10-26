import { Modal, Setting, Notice, ButtonComponent, } from "obsidian";
import { t } from '@/translations/helper';
/**
 * Quick workflow creation modal for streamlined workflow setup
 */
export class QuickWorkflowModal extends Modal {
    constructor(app, plugin, onSave) {
        super(app);
        this.templateType = "custom";
        // Predefined workflow templates
        this.templates = {
            simple: {
                name: t("Simple Linear Workflow"),
                description: t("A basic linear workflow with sequential stages"),
                stages: [
                    { id: "todo", name: t("To Do"), type: "linear" },
                    { id: "in_progress", name: t("In Progress"), type: "linear" },
                    { id: "done", name: t("Done"), type: "terminal" },
                ],
            },
            project: {
                name: t("Project Management"),
                description: t("Standard project management workflow"),
                stages: [
                    { id: "planning", name: t("Planning"), type: "linear" },
                    {
                        id: "development",
                        name: t("Development"),
                        type: "cycle",
                        subStages: [
                            { id: "coding", name: t("Coding") },
                            { id: "testing", name: t("Testing") },
                        ],
                    },
                    { id: "review", name: t("Review"), type: "linear" },
                    { id: "completed", name: t("Completed"), type: "terminal" },
                ],
            },
            research: {
                name: t("Research Process"),
                description: t("Academic or professional research workflow"),
                stages: [
                    { id: "literature_review", name: t("Literature Review"), type: "linear" },
                    { id: "data_collection", name: t("Data Collection"), type: "cycle" },
                    { id: "analysis", name: t("Analysis"), type: "cycle" },
                    { id: "writing", name: t("Writing"), type: "linear" },
                    { id: "published", name: t("Published"), type: "terminal" },
                ],
            },
            custom: {
                name: t("Custom Workflow"),
                description: t("Create a custom workflow from scratch"),
                stages: [],
            },
        };
        this.plugin = plugin;
        this.onSave = onSave;
        this.workflow = {
            id: "",
            name: "",
            description: "",
            stages: [],
            metadata: {
                version: "1.0",
                created: new Date().toISOString().split("T")[0],
                lastModified: new Date().toISOString().split("T")[0],
            },
        };
    }
    onOpen() {
        const { contentEl, titleEl } = this;
        this.modalEl.toggleClass("quick-workflow-modal", true);
        titleEl.setText(t("Quick Workflow Creation"));
        this.createTemplateSelection(contentEl);
        this.createWorkflowForm(contentEl);
        this.createButtons(contentEl);
    }
    createTemplateSelection(container) {
        const templateSection = container.createDiv({ cls: "workflow-template-section" });
        new Setting(templateSection)
            .setName(t("Workflow Template"))
            .setDesc(t("Choose a template to start with or create a custom workflow"))
            .addDropdown((dropdown) => {
            Object.entries(this.templates).forEach(([key, template]) => {
                dropdown.addOption(key, template.name);
            });
            dropdown.setValue(this.templateType).onChange((value) => {
                this.templateType = value;
                this.applyTemplate();
                this.refreshForm();
            });
        });
        // Template description
        const descContainer = templateSection.createDiv({ cls: "template-description" });
        this.updateTemplateDescription(descContainer);
    }
    createWorkflowForm(container) {
        const formSection = container.createDiv({ cls: "workflow-form-section" });
        // Basic workflow info
        new Setting(formSection)
            .setName(t("Workflow Name"))
            .setDesc(t("A descriptive name for your workflow"))
            .addText((text) => {
            text.setValue(this.workflow.name || "")
                .setPlaceholder(t("Enter workflow name"))
                .onChange((value) => {
                this.workflow.name = value;
                // Auto-generate ID if not manually set
                if (!this.workflow.id || this.workflow.id === this.generateIdFromName(this.workflow.name || "")) {
                    this.workflow.id = this.generateIdFromName(value);
                }
            });
        });
        new Setting(formSection)
            .setName(t("Workflow ID"))
            .setDesc(t("Unique identifier (auto-generated from name)"))
            .addText((text) => {
            text.setValue(this.workflow.id || "")
                .setPlaceholder("workflow_id")
                .onChange((value) => {
                this.workflow.id = value;
            });
        });
        new Setting(formSection)
            .setName(t("Description"))
            .setDesc(t("Optional description of the workflow purpose"))
            .addTextArea((textarea) => {
            textarea
                .setValue(this.workflow.description || "")
                .setPlaceholder(t("Describe your workflow..."))
                .onChange((value) => {
                this.workflow.description = value;
            });
            textarea.inputEl.rows = 2;
        });
        // Stages preview
        this.createStagesPreview(formSection);
    }
    createStagesPreview(container) {
        const stagesSection = container.createDiv({ cls: "workflow-stages-preview" });
        const stagesHeader = new Setting(stagesSection)
            .setName(t("Workflow Stages"))
            .setDesc(t("Preview of workflow stages (edit after creation for advanced options)"));
        stagesHeader.addButton((button) => {
            button
                .setButtonText(t("Add Stage"))
                .setIcon("plus")
                .onClick(() => {
                this.addQuickStage();
            });
        });
        this.renderStagesPreview(stagesSection);
    }
    renderStagesPreview(container) {
        // Clear existing preview
        const existingPreview = container.querySelector(".stages-preview-list");
        if (existingPreview) {
            existingPreview.remove();
        }
        if (!this.workflow.stages || this.workflow.stages.length === 0) {
            container.createDiv({
                cls: "no-stages-message",
                text: t("No stages defined. Choose a template or add stages manually."),
            });
            return;
        }
        const stagesList = container.createDiv({ cls: "stages-preview-list" });
        this.workflow.stages.forEach((stage, index) => {
            const stageItem = stagesList.createDiv({ cls: "stage-preview-item" });
            const stageInfo = stageItem.createDiv({ cls: "stage-info" });
            stageInfo.createSpan({ cls: "stage-name", text: stage.name });
            stageInfo.createSpan({ cls: "stage-type", text: `(${stage.type})` });
            const stageActions = stageItem.createDiv({ cls: "stage-actions" });
            // Remove button
            const removeBtn = new ButtonComponent(stageActions);
            removeBtn
                .setIcon("trash")
                .setTooltip(t("Remove stage"))
                .onClick(() => {
                var _a;
                (_a = this.workflow.stages) === null || _a === void 0 ? void 0 : _a.splice(index, 1);
                this.renderStagesPreview(container);
            });
        });
    }
    createButtons(container) {
        const buttonContainer = container.createDiv({ cls: "workflow-modal-buttons" });
        const cancelButton = buttonContainer.createEl("button", {
            text: t("Cancel"),
            cls: "workflow-cancel-button",
        });
        cancelButton.addEventListener("click", () => this.close());
        const saveButton = buttonContainer.createEl("button", {
            text: t("Create Workflow"),
            cls: "workflow-save-button mod-cta",
        });
        saveButton.addEventListener("click", () => this.handleSave());
    }
    applyTemplate() {
        const template = this.templates[this.templateType];
        if (template) {
            this.workflow.name = template.name;
            this.workflow.id = this.generateIdFromName(template.name);
            this.workflow.description = template.description;
            this.workflow.stages = JSON.parse(JSON.stringify(template.stages));
        }
    }
    updateTemplateDescription(container) {
        container.empty();
        const template = this.templates[this.templateType];
        if (template) {
            container.createEl("p", {
                cls: "template-desc-text",
                text: template.description,
            });
        }
    }
    refreshForm() {
        this.contentEl.empty();
        this.createTemplateSelection(this.contentEl);
        this.createWorkflowForm(this.contentEl);
        this.createButtons(this.contentEl);
    }
    addQuickStage() {
        if (!this.workflow.stages) {
            this.workflow.stages = [];
        }
        const stageName = `Stage ${this.workflow.stages.length + 1}`;
        const newStage = {
            id: this.generateIdFromName(stageName),
            name: stageName,
            type: "linear",
        };
        this.workflow.stages.push(newStage);
        this.renderStagesPreview(this.contentEl.querySelector(".workflow-stages-preview"));
    }
    generateIdFromName(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, "")
            .replace(/\s+/g, "_")
            .substring(0, 30);
    }
    handleSave() {
        if (!this.workflow.name || !this.workflow.id) {
            new Notice(t("Please provide a workflow name and ID"));
            return;
        }
        if (!this.workflow.stages || this.workflow.stages.length === 0) {
            new Notice(t("Please add at least one stage to the workflow"));
            return;
        }
        // Ensure the workflow has all required properties
        const completeWorkflow = {
            id: this.workflow.id,
            name: this.workflow.name,
            description: this.workflow.description || "",
            stages: this.workflow.stages,
            metadata: this.workflow.metadata || {
                version: "1.0",
                created: new Date().toISOString().split("T")[0],
                lastModified: new Date().toISOString().split("T")[0],
            },
        };
        this.onSave(completeWorkflow);
        this.close();
    }
    onClose() {
        this.contentEl.empty();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUXVpY2tXb3JrZmxvd01vZGFsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiUXVpY2tXb3JrZmxvd01vZGFsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFFTixLQUFLLEVBQ0wsT0FBTyxFQUNQLE1BQU0sRUFDTixlQUFlLEdBRWYsTUFBTSxVQUFVLENBQUM7QUFHbEIsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRTFDOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGtCQUFtQixTQUFRLEtBQUs7SUFxRDVDLFlBQ0MsR0FBUSxFQUNSLE1BQTZCLEVBQzdCLE1BQThDO1FBRTlDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQXREWixpQkFBWSxHQUFXLFFBQVEsQ0FBQztRQUVoQyxnQ0FBZ0M7UUFDeEIsY0FBUyxHQUFHO1lBQ25CLE1BQU0sRUFBRTtnQkFDUCxJQUFJLEVBQUUsQ0FBQyxDQUFDLHdCQUF3QixDQUFDO2dCQUNqQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLGdEQUFnRCxDQUFDO2dCQUNoRSxNQUFNLEVBQUU7b0JBQ1AsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLFFBQWlCLEVBQUU7b0JBQ3pELEVBQUUsRUFBRSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFpQixFQUFFO29CQUN0RSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsVUFBbUIsRUFBRTtpQkFDMUQ7YUFDRDtZQUNELE9BQU8sRUFBRTtnQkFDUixJQUFJLEVBQUUsQ0FBQyxDQUFDLG9CQUFvQixDQUFDO2dCQUM3QixXQUFXLEVBQUUsQ0FBQyxDQUFDLHNDQUFzQyxDQUFDO2dCQUN0RCxNQUFNLEVBQUU7b0JB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U0FDRCxDQUFDO1FBRUYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQzlCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNkLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN4QixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xyXG5cdEFwcCxcclxuXHRNb2RhbCxcclxuXHRTZXR0aW5nLFxyXG5cdE5vdGljZSxcclxuXHRCdXR0b25Db21wb25lbnQsXHJcblx0RHJvcGRvd25Db21wb25lbnQsXHJcbn0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSAnQC9pbmRleCc7XHJcbmltcG9ydCB7IFdvcmtmbG93RGVmaW5pdGlvbiwgV29ya2Zsb3dTdGFnZSB9IGZyb20gJ0AvY29tbW9uL3NldHRpbmctZGVmaW5pdGlvbic7XHJcbmltcG9ydCB7IHQgfSBmcm9tICdAL3RyYW5zbGF0aW9ucy9oZWxwZXInO1xyXG5cclxuLyoqXHJcbiAqIFF1aWNrIHdvcmtmbG93IGNyZWF0aW9uIG1vZGFsIGZvciBzdHJlYW1saW5lZCB3b3JrZmxvdyBzZXR1cFxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFF1aWNrV29ya2Zsb3dNb2RhbCBleHRlbmRzIE1vZGFsIHtcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbjtcclxuXHRvblNhdmU6ICh3b3JrZmxvdzogV29ya2Zsb3dEZWZpbml0aW9uKSA9PiB2b2lkO1xyXG5cdHdvcmtmbG93OiBQYXJ0aWFsPFdvcmtmbG93RGVmaW5pdGlvbj47XHJcblx0dGVtcGxhdGVUeXBlOiBzdHJpbmcgPSBcImN1c3RvbVwiO1xyXG5cclxuXHQvLyBQcmVkZWZpbmVkIHdvcmtmbG93IHRlbXBsYXRlc1xyXG5cdHByaXZhdGUgdGVtcGxhdGVzID0ge1xyXG5cdFx0c2ltcGxlOiB7XHJcblx0XHRcdG5hbWU6IHQoXCJTaW1wbGUgTGluZWFyIFdvcmtmbG93XCIpLFxyXG5cdFx0XHRkZXNjcmlwdGlvbjogdChcIkEgYmFzaWMgbGluZWFyIHdvcmtmbG93IHdpdGggc2VxdWVudGlhbCBzdGFnZXNcIiksXHJcblx0XHRcdHN0YWdlczogW1xyXG5cdFx0XHRcdHsgaWQ6IFwidG9kb1wiLCBuYW1lOiB0KFwiVG8gRG9cIiksIHR5cGU6IFwibGluZWFyXCIgYXMgY29uc3QgfSxcclxuXHRcdFx0XHR7IGlkOiBcImluX3Byb2dyZXNzXCIsIG5hbWU6IHQoXCJJbiBQcm9ncmVzc1wiKSwgdHlwZTogXCJsaW5lYXJcIiBhcyBjb25zdCB9LFxyXG5cdFx0XHRcdHsgaWQ6IFwiZG9uZVwiLCBuYW1lOiB0KFwiRG9uZVwiKSwgdHlwZTogXCJ0ZXJtaW5hbFwiIGFzIGNvbnN0IH0sXHJcblx0XHRcdF0sXHJcblx0XHR9LFxyXG5cdFx0cHJvamVjdDoge1xyXG5cdFx0XHRuYW1lOiB0KFwiUHJvamVjdCBNYW5hZ2VtZW50XCIpLFxyXG5cdFx0XHRkZXNjcmlwdGlvbjogdChcIlN0YW5kYXJkIHByb2plY3QgbWFuYWdlbWVudCB3b3JrZmxvd1wiKSxcclxuXHRcdFx0c3RhZ2VzOiBbXHJcblx0XHRcdFx0eyBpZDogXCJwbGFubmluZ1wiLCBuYW1lOiB0KFwiUGxhbm5pbmdcIiksIHR5cGU6IFwibGluZWFyXCIgYXMgY29uc3QgfSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRpZDogXCJkZXZlbG9wbWVudFwiLFxyXG5cdFx0XHRcdFx0bmFtZTogdChcIkRldmVsb3BtZW50XCIpLFxyXG5cdFx0XHRcdFx0dHlwZTogXCJjeWNsZVwiIGFzIGNvbnN0LFxyXG5cdFx0XHRcdFx0c3ViU3RhZ2VzOiBbXHJcblx0XHRcdFx0XHRcdHsgaWQ6IFwiY29kaW5nXCIsIG5hbWU6IHQoXCJDb2RpbmdcIikgfSxcclxuXHRcdFx0XHRcdFx0eyBpZDogXCJ0ZXN0aW5nXCIsIG5hbWU6IHQoXCJUZXN0aW5nXCIpIH0sXHJcblx0XHRcdFx0XHRdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0eyBpZDogXCJyZXZpZXdcIiwgbmFtZTogdChcIlJldmlld1wiKSwgdHlwZTogXCJsaW5lYXJcIiBhcyBjb25zdCB9LFxyXG5cdFx0XHRcdHsgaWQ6IFwiY29tcGxldGVkXCIsIG5hbWU6IHQoXCJDb21wbGV0ZWRcIiksIHR5cGU6IFwidGVybWluYWxcIiBhcyBjb25zdCB9LFxyXG5cdFx0XHRdLFxyXG5cdFx0fSxcclxuXHRcdHJlc2VhcmNoOiB7XHJcblx0XHRcdG5hbWU6IHQoXCJSZXNlYXJjaCBQcm9jZXNzXCIpLFxyXG5cdFx0XHRkZXNjcmlwdGlvbjogdChcIkFjYWRlbWljIG9yIHByb2Zlc3Npb25hbCByZXNlYXJjaCB3b3JrZmxvd1wiKSxcclxuXHRcdFx0c3RhZ2VzOiBbXHJcblx0XHRcdFx0eyBpZDogXCJsaXRlcmF0dXJlX3Jldmlld1wiLCBuYW1lOiB0KFwiTGl0ZXJhdHVyZSBSZXZpZXdcIiksIHR5cGU6IFwibGluZWFyXCIgYXMgY29uc3QgfSxcclxuXHRcdFx0XHR7IGlkOiBcImRhdGFfY29sbGVjdGlvblwiLCBuYW1lOiB0KFwiRGF0YSBDb2xsZWN0aW9uXCIpLCB0eXBlOiBcImN5Y2xlXCIgYXMgY29uc3QgfSxcclxuXHRcdFx0XHR7IGlkOiBcImFuYWx5c2lzXCIsIG5hbWU6IHQoXCJBbmFseXNpc1wiKSwgdHlwZTogXCJjeWNsZVwiIGFzIGNvbnN0IH0sXHJcblx0XHRcdFx0eyBpZDogXCJ3cml0aW5nXCIsIG5hbWU6IHQoXCJXcml0aW5nXCIpLCB0eXBlOiBcImxpbmVhclwiIGFzIGNvbnN0IH0sXHJcblx0XHRcdFx0eyBpZDogXCJwdWJsaXNoZWRcIiwgbmFtZTogdChcIlB1Ymxpc2hlZFwiKSwgdHlwZTogXCJ0ZXJtaW5hbFwiIGFzIGNvbnN0IH0sXHJcblx0XHRcdF0sXHJcblx0XHR9LFxyXG5cdFx0Y3VzdG9tOiB7XHJcblx0XHRcdG5hbWU6IHQoXCJDdXN0b20gV29ya2Zsb3dcIiksXHJcblx0XHRcdGRlc2NyaXB0aW9uOiB0KFwiQ3JlYXRlIGEgY3VzdG9tIHdvcmtmbG93IGZyb20gc2NyYXRjaFwiKSxcclxuXHRcdFx0c3RhZ2VzOiBbXSxcclxuXHRcdH0sXHJcblx0fTtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRhcHA6IEFwcCxcclxuXHRcdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0b25TYXZlOiAod29ya2Zsb3c6IFdvcmtmbG93RGVmaW5pdGlvbikgPT4gdm9pZFxyXG5cdCkge1xyXG5cdFx0c3VwZXIoYXBwKTtcclxuXHRcdHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG5cdFx0dGhpcy5vblNhdmUgPSBvblNhdmU7XHJcblx0XHR0aGlzLndvcmtmbG93ID0ge1xyXG5cdFx0XHRpZDogXCJcIixcclxuXHRcdFx0bmFtZTogXCJcIixcclxuXHRcdFx0ZGVzY3JpcHRpb246IFwiXCIsXHJcblx0XHRcdHN0YWdlczogW10sXHJcblx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0dmVyc2lvbjogXCIxLjBcIixcclxuXHRcdFx0XHRjcmVhdGVkOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc3BsaXQoXCJUXCIpWzBdLFxyXG5cdFx0XHRcdGxhc3RNb2RpZmllZDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNwbGl0KFwiVFwiKVswXSxcclxuXHRcdFx0fSxcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHRvbk9wZW4oKSB7XHJcblx0XHRjb25zdCB7IGNvbnRlbnRFbCwgdGl0bGVFbCB9ID0gdGhpcztcclxuXHRcdHRoaXMubW9kYWxFbC50b2dnbGVDbGFzcyhcInF1aWNrLXdvcmtmbG93LW1vZGFsXCIsIHRydWUpO1xyXG5cclxuXHRcdHRpdGxlRWwuc2V0VGV4dCh0KFwiUXVpY2sgV29ya2Zsb3cgQ3JlYXRpb25cIikpO1xyXG5cclxuXHRcdHRoaXMuY3JlYXRlVGVtcGxhdGVTZWxlY3Rpb24oY29udGVudEVsKTtcclxuXHRcdHRoaXMuY3JlYXRlV29ya2Zsb3dGb3JtKGNvbnRlbnRFbCk7XHJcblx0XHR0aGlzLmNyZWF0ZUJ1dHRvbnMoY29udGVudEVsKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY3JlYXRlVGVtcGxhdGVTZWxlY3Rpb24oY29udGFpbmVyOiBIVE1MRWxlbWVudCkge1xyXG5cdFx0Y29uc3QgdGVtcGxhdGVTZWN0aW9uID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJ3b3JrZmxvdy10ZW1wbGF0ZS1zZWN0aW9uXCIgfSk7XHJcblxyXG5cdFx0bmV3IFNldHRpbmcodGVtcGxhdGVTZWN0aW9uKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiV29ya2Zsb3cgVGVtcGxhdGVcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJDaG9vc2UgYSB0ZW1wbGF0ZSB0byBzdGFydCB3aXRoIG9yIGNyZWF0ZSBhIGN1c3RvbSB3b3JrZmxvd1wiKSlcclxuXHRcdFx0LmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xyXG5cdFx0XHRcdE9iamVjdC5lbnRyaWVzKHRoaXMudGVtcGxhdGVzKS5mb3JFYWNoKChba2V5LCB0ZW1wbGF0ZV0pID0+IHtcclxuXHRcdFx0XHRcdGRyb3Bkb3duLmFkZE9wdGlvbihrZXksIHRlbXBsYXRlLm5hbWUpO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRkcm9wZG93bi5zZXRWYWx1ZSh0aGlzLnRlbXBsYXRlVHlwZSkub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLnRlbXBsYXRlVHlwZSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0dGhpcy5hcHBseVRlbXBsYXRlKCk7XHJcblx0XHRcdFx0XHR0aGlzLnJlZnJlc2hGb3JtKCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdC8vIFRlbXBsYXRlIGRlc2NyaXB0aW9uXHJcblx0XHRjb25zdCBkZXNjQ29udGFpbmVyID0gdGVtcGxhdGVTZWN0aW9uLmNyZWF0ZURpdih7IGNsczogXCJ0ZW1wbGF0ZS1kZXNjcmlwdGlvblwiIH0pO1xyXG5cdFx0dGhpcy51cGRhdGVUZW1wbGF0ZURlc2NyaXB0aW9uKGRlc2NDb250YWluZXIpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVXb3JrZmxvd0Zvcm0oY29udGFpbmVyOiBIVE1MRWxlbWVudCkge1xyXG5cdFx0Y29uc3QgZm9ybVNlY3Rpb24gPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcIndvcmtmbG93LWZvcm0tc2VjdGlvblwiIH0pO1xyXG5cclxuXHRcdC8vIEJhc2ljIHdvcmtmbG93IGluZm9cclxuXHRcdG5ldyBTZXR0aW5nKGZvcm1TZWN0aW9uKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiV29ya2Zsb3cgTmFtZVwiKSlcclxuXHRcdFx0LnNldERlc2ModChcIkEgZGVzY3JpcHRpdmUgbmFtZSBmb3IgeW91ciB3b3JrZmxvd1wiKSlcclxuXHRcdFx0LmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0XHR0ZXh0LnNldFZhbHVlKHRoaXMud29ya2Zsb3cubmFtZSB8fCBcIlwiKVxyXG5cdFx0XHRcdFx0LnNldFBsYWNlaG9sZGVyKHQoXCJFbnRlciB3b3JrZmxvdyBuYW1lXCIpKVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLndvcmtmbG93Lm5hbWUgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0Ly8gQXV0by1nZW5lcmF0ZSBJRCBpZiBub3QgbWFudWFsbHkgc2V0XHJcblx0XHRcdFx0XHRcdGlmICghdGhpcy53b3JrZmxvdy5pZCB8fCB0aGlzLndvcmtmbG93LmlkID09PSB0aGlzLmdlbmVyYXRlSWRGcm9tTmFtZSh0aGlzLndvcmtmbG93Lm5hbWUgfHwgXCJcIikpIHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLndvcmtmbG93LmlkID0gdGhpcy5nZW5lcmF0ZUlkRnJvbU5hbWUodmFsdWUpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoZm9ybVNlY3Rpb24pXHJcblx0XHRcdC5zZXROYW1lKHQoXCJXb3JrZmxvdyBJRFwiKSlcclxuXHRcdFx0LnNldERlc2ModChcIlVuaXF1ZSBpZGVudGlmaWVyIChhdXRvLWdlbmVyYXRlZCBmcm9tIG5hbWUpXCIpKVxyXG5cdFx0XHQuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHRcdHRleHQuc2V0VmFsdWUodGhpcy53b3JrZmxvdy5pZCB8fCBcIlwiKVxyXG5cdFx0XHRcdFx0LnNldFBsYWNlaG9sZGVyKFwid29ya2Zsb3dfaWRcIilcclxuXHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy53b3JrZmxvdy5pZCA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdG5ldyBTZXR0aW5nKGZvcm1TZWN0aW9uKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiRGVzY3JpcHRpb25cIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJPcHRpb25hbCBkZXNjcmlwdGlvbiBvZiB0aGUgd29ya2Zsb3cgcHVycG9zZVwiKSlcclxuXHRcdFx0LmFkZFRleHRBcmVhKCh0ZXh0YXJlYSkgPT4ge1xyXG5cdFx0XHRcdHRleHRhcmVhXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUodGhpcy53b3JrZmxvdy5kZXNjcmlwdGlvbiB8fCBcIlwiKVxyXG5cdFx0XHRcdFx0LnNldFBsYWNlaG9sZGVyKHQoXCJEZXNjcmliZSB5b3VyIHdvcmtmbG93Li4uXCIpKVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLndvcmtmbG93LmRlc2NyaXB0aW9uID0gdmFsdWU7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR0ZXh0YXJlYS5pbnB1dEVsLnJvd3MgPSAyO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHQvLyBTdGFnZXMgcHJldmlld1xyXG5cdFx0dGhpcy5jcmVhdGVTdGFnZXNQcmV2aWV3KGZvcm1TZWN0aW9uKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY3JlYXRlU3RhZ2VzUHJldmlldyhjb250YWluZXI6IEhUTUxFbGVtZW50KSB7XHJcblx0XHRjb25zdCBzdGFnZXNTZWN0aW9uID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJ3b3JrZmxvdy1zdGFnZXMtcHJldmlld1wiIH0pO1xyXG5cdFx0XHJcblx0XHRjb25zdCBzdGFnZXNIZWFkZXIgPSBuZXcgU2V0dGluZyhzdGFnZXNTZWN0aW9uKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiV29ya2Zsb3cgU3RhZ2VzXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyh0KFwiUHJldmlldyBvZiB3b3JrZmxvdyBzdGFnZXMgKGVkaXQgYWZ0ZXIgY3JlYXRpb24gZm9yIGFkdmFuY2VkIG9wdGlvbnMpXCIpKTtcclxuXHJcblx0XHRzdGFnZXNIZWFkZXIuYWRkQnV0dG9uKChidXR0b24pID0+IHtcclxuXHRcdFx0YnV0dG9uXHJcblx0XHRcdFx0LnNldEJ1dHRvblRleHQodChcIkFkZCBTdGFnZVwiKSlcclxuXHRcdFx0XHQuc2V0SWNvbihcInBsdXNcIilcclxuXHRcdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLmFkZFF1aWNrU3RhZ2UoKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMucmVuZGVyU3RhZ2VzUHJldmlldyhzdGFnZXNTZWN0aW9uKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyU3RhZ2VzUHJldmlldyhjb250YWluZXI6IEhUTUxFbGVtZW50KSB7XHJcblx0XHQvLyBDbGVhciBleGlzdGluZyBwcmV2aWV3XHJcblx0XHRjb25zdCBleGlzdGluZ1ByZXZpZXcgPSBjb250YWluZXIucXVlcnlTZWxlY3RvcihcIi5zdGFnZXMtcHJldmlldy1saXN0XCIpO1xyXG5cdFx0aWYgKGV4aXN0aW5nUHJldmlldykge1xyXG5cdFx0XHRleGlzdGluZ1ByZXZpZXcucmVtb3ZlKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKCF0aGlzLndvcmtmbG93LnN0YWdlcyB8fCB0aGlzLndvcmtmbG93LnN0YWdlcy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0Y29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcIm5vLXN0YWdlcy1tZXNzYWdlXCIsXHJcblx0XHRcdFx0dGV4dDogdChcIk5vIHN0YWdlcyBkZWZpbmVkLiBDaG9vc2UgYSB0ZW1wbGF0ZSBvciBhZGQgc3RhZ2VzIG1hbnVhbGx5LlwiKSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBzdGFnZXNMaXN0ID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzdGFnZXMtcHJldmlldy1saXN0XCIgfSk7XHJcblxyXG5cdFx0dGhpcy53b3JrZmxvdy5zdGFnZXMuZm9yRWFjaCgoc3RhZ2UsIGluZGV4KSA9PiB7XHJcblx0XHRcdGNvbnN0IHN0YWdlSXRlbSA9IHN0YWdlc0xpc3QuY3JlYXRlRGl2KHsgY2xzOiBcInN0YWdlLXByZXZpZXctaXRlbVwiIH0pO1xyXG5cdFx0XHRcclxuXHRcdFx0Y29uc3Qgc3RhZ2VJbmZvID0gc3RhZ2VJdGVtLmNyZWF0ZURpdih7IGNsczogXCJzdGFnZS1pbmZvXCIgfSk7XHJcblx0XHRcdHN0YWdlSW5mby5jcmVhdGVTcGFuKHsgY2xzOiBcInN0YWdlLW5hbWVcIiwgdGV4dDogc3RhZ2UubmFtZSB9KTtcclxuXHRcdFx0c3RhZ2VJbmZvLmNyZWF0ZVNwYW4oeyBjbHM6IFwic3RhZ2UtdHlwZVwiLCB0ZXh0OiBgKCR7c3RhZ2UudHlwZX0pYCB9KTtcclxuXHJcblx0XHRcdGNvbnN0IHN0YWdlQWN0aW9ucyA9IHN0YWdlSXRlbS5jcmVhdGVEaXYoeyBjbHM6IFwic3RhZ2UtYWN0aW9uc1wiIH0pO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gUmVtb3ZlIGJ1dHRvblxyXG5cdFx0XHRjb25zdCByZW1vdmVCdG4gPSBuZXcgQnV0dG9uQ29tcG9uZW50KHN0YWdlQWN0aW9ucyk7XHJcblx0XHRcdHJlbW92ZUJ0blxyXG5cdFx0XHRcdC5zZXRJY29uKFwidHJhc2hcIilcclxuXHRcdFx0XHQuc2V0VG9vbHRpcCh0KFwiUmVtb3ZlIHN0YWdlXCIpKVxyXG5cdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMud29ya2Zsb3cuc3RhZ2VzPy5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0XHRcdFx0dGhpcy5yZW5kZXJTdGFnZXNQcmV2aWV3KGNvbnRhaW5lcik7XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY3JlYXRlQnV0dG9ucyhjb250YWluZXI6IEhUTUxFbGVtZW50KSB7XHJcblx0XHRjb25zdCBidXR0b25Db250YWluZXIgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcIndvcmtmbG93LW1vZGFsLWJ1dHRvbnNcIiB9KTtcclxuXHJcblx0XHRjb25zdCBjYW5jZWxCdXR0b24gPSBidXR0b25Db250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFwiQ2FuY2VsXCIpLFxyXG5cdFx0XHRjbHM6IFwid29ya2Zsb3ctY2FuY2VsLWJ1dHRvblwiLFxyXG5cdFx0fSk7XHJcblx0XHRjYW5jZWxCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuY2xvc2UoKSk7XHJcblxyXG5cdFx0Y29uc3Qgc2F2ZUJ1dHRvbiA9IGJ1dHRvbkNvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXCJDcmVhdGUgV29ya2Zsb3dcIiksXHJcblx0XHRcdGNsczogXCJ3b3JrZmxvdy1zYXZlLWJ1dHRvbiBtb2QtY3RhXCIsXHJcblx0XHR9KTtcclxuXHRcdHNhdmVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuaGFuZGxlU2F2ZSgpKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXBwbHlUZW1wbGF0ZSgpIHtcclxuXHRcdGNvbnN0IHRlbXBsYXRlID0gdGhpcy50ZW1wbGF0ZXNbdGhpcy50ZW1wbGF0ZVR5cGUgYXMga2V5b2YgdHlwZW9mIHRoaXMudGVtcGxhdGVzXTtcclxuXHRcdGlmICh0ZW1wbGF0ZSkge1xyXG5cdFx0XHR0aGlzLndvcmtmbG93Lm5hbWUgPSB0ZW1wbGF0ZS5uYW1lO1xyXG5cdFx0XHR0aGlzLndvcmtmbG93LmlkID0gdGhpcy5nZW5lcmF0ZUlkRnJvbU5hbWUodGVtcGxhdGUubmFtZSk7XHJcblx0XHRcdHRoaXMud29ya2Zsb3cuZGVzY3JpcHRpb24gPSB0ZW1wbGF0ZS5kZXNjcmlwdGlvbjtcclxuXHRcdFx0dGhpcy53b3JrZmxvdy5zdGFnZXMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRlbXBsYXRlLnN0YWdlcykpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSB1cGRhdGVUZW1wbGF0ZURlc2NyaXB0aW9uKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpIHtcclxuXHRcdGNvbnRhaW5lci5lbXB0eSgpO1xyXG5cdFx0Y29uc3QgdGVtcGxhdGUgPSB0aGlzLnRlbXBsYXRlc1t0aGlzLnRlbXBsYXRlVHlwZSBhcyBrZXlvZiB0eXBlb2YgdGhpcy50ZW1wbGF0ZXNdO1xyXG5cdFx0aWYgKHRlbXBsYXRlKSB7XHJcblx0XHRcdGNvbnRhaW5lci5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHRcdGNsczogXCJ0ZW1wbGF0ZS1kZXNjLXRleHRcIixcclxuXHRcdFx0XHR0ZXh0OiB0ZW1wbGF0ZS5kZXNjcmlwdGlvbixcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlZnJlc2hGb3JtKCkge1xyXG5cdFx0dGhpcy5jb250ZW50RWwuZW1wdHkoKTtcclxuXHRcdHRoaXMuY3JlYXRlVGVtcGxhdGVTZWxlY3Rpb24odGhpcy5jb250ZW50RWwpO1xyXG5cdFx0dGhpcy5jcmVhdGVXb3JrZmxvd0Zvcm0odGhpcy5jb250ZW50RWwpO1xyXG5cdFx0dGhpcy5jcmVhdGVCdXR0b25zKHRoaXMuY29udGVudEVsKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYWRkUXVpY2tTdGFnZSgpIHtcclxuXHRcdGlmICghdGhpcy53b3JrZmxvdy5zdGFnZXMpIHtcclxuXHRcdFx0dGhpcy53b3JrZmxvdy5zdGFnZXMgPSBbXTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBzdGFnZU5hbWUgPSBgU3RhZ2UgJHt0aGlzLndvcmtmbG93LnN0YWdlcy5sZW5ndGggKyAxfWA7XHJcblx0XHRjb25zdCBuZXdTdGFnZTogV29ya2Zsb3dTdGFnZSA9IHtcclxuXHRcdFx0aWQ6IHRoaXMuZ2VuZXJhdGVJZEZyb21OYW1lKHN0YWdlTmFtZSksXHJcblx0XHRcdG5hbWU6IHN0YWdlTmFtZSxcclxuXHRcdFx0dHlwZTogXCJsaW5lYXJcIixcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy53b3JrZmxvdy5zdGFnZXMucHVzaChuZXdTdGFnZSk7XHJcblx0XHR0aGlzLnJlbmRlclN0YWdlc1ByZXZpZXcodGhpcy5jb250ZW50RWwucXVlcnlTZWxlY3RvcihcIi53b3JrZmxvdy1zdGFnZXMtcHJldmlld1wiKSBhcyBIVE1MRWxlbWVudCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdlbmVyYXRlSWRGcm9tTmFtZShuYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIG5hbWVcclxuXHRcdFx0LnRvTG93ZXJDYXNlKClcclxuXHRcdFx0LnJlcGxhY2UoL1teYS16MC05XFxzXS9nLCBcIlwiKVxyXG5cdFx0XHQucmVwbGFjZSgvXFxzKy9nLCBcIl9cIilcclxuXHRcdFx0LnN1YnN0cmluZygwLCAzMCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGhhbmRsZVNhdmUoKSB7XHJcblx0XHRpZiAoIXRoaXMud29ya2Zsb3cubmFtZSB8fCAhdGhpcy53b3JrZmxvdy5pZCkge1xyXG5cdFx0XHRuZXcgTm90aWNlKHQoXCJQbGVhc2UgcHJvdmlkZSBhIHdvcmtmbG93IG5hbWUgYW5kIElEXCIpKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICghdGhpcy53b3JrZmxvdy5zdGFnZXMgfHwgdGhpcy53b3JrZmxvdy5zdGFnZXMubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdG5ldyBOb3RpY2UodChcIlBsZWFzZSBhZGQgYXQgbGVhc3Qgb25lIHN0YWdlIHRvIHRoZSB3b3JrZmxvd1wiKSk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBFbnN1cmUgdGhlIHdvcmtmbG93IGhhcyBhbGwgcmVxdWlyZWQgcHJvcGVydGllc1xyXG5cdFx0Y29uc3QgY29tcGxldGVXb3JrZmxvdzogV29ya2Zsb3dEZWZpbml0aW9uID0ge1xyXG5cdFx0XHRpZDogdGhpcy53b3JrZmxvdy5pZCxcclxuXHRcdFx0bmFtZTogdGhpcy53b3JrZmxvdy5uYW1lLFxyXG5cdFx0XHRkZXNjcmlwdGlvbjogdGhpcy53b3JrZmxvdy5kZXNjcmlwdGlvbiB8fCBcIlwiLFxyXG5cdFx0XHRzdGFnZXM6IHRoaXMud29ya2Zsb3cuc3RhZ2VzLFxyXG5cdFx0XHRtZXRhZGF0YTogdGhpcy53b3JrZmxvdy5tZXRhZGF0YSB8fCB7XHJcblx0XHRcdFx0dmVyc2lvbjogXCIxLjBcIixcclxuXHRcdFx0XHRjcmVhdGVkOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc3BsaXQoXCJUXCIpWzBdLFxyXG5cdFx0XHRcdGxhc3RNb2RpZmllZDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNwbGl0KFwiVFwiKVswXSxcclxuXHRcdFx0fSxcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5vblNhdmUoY29tcGxldGVXb3JrZmxvdyk7XHJcblx0XHR0aGlzLmNsb3NlKCk7XHJcblx0fVxyXG5cclxuXHRvbkNsb3NlKCkge1xyXG5cdFx0dGhpcy5jb250ZW50RWwuZW1wdHkoKTtcclxuXHR9XHJcbn1cclxuIl19