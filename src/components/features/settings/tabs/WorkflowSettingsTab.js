import { __awaiter } from "tslib";
import { Setting, Modal } from "obsidian";
import { t } from "@/translations/helper";
import { WorkflowDefinitionModal } from "@/components/features/workflow/modals/WorkflowDefinitionModal";
import { generateUniqueId } from "@/utils/id-generator";
export function renderWorkflowSettingsTab(settingTab, containerEl) {
    new Setting(containerEl)
        .setName(t("Workflow"))
        .setDesc(t("Configure task workflows for project and process management"))
        .setHeading();
    new Setting(containerEl)
        .setName(t("Enable workflow"))
        .setDesc(t("Toggle to enable the workflow system for tasks"))
        .addToggle((toggle) => {
        toggle
            .setValue(settingTab.plugin.settings.workflow.enableWorkflow)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.workflow.enableWorkflow = value;
            settingTab.applySettingsUpdate();
            setTimeout(() => {
                settingTab.display();
            }, 200);
        }));
    });
    if (!settingTab.plugin.settings.workflow.enableWorkflow)
        return;
    new Setting(containerEl)
        .setName(t("Auto-add timestamp"))
        .setDesc(t("Automatically add a timestamp to the task when it is created"))
        .addToggle((toggle) => {
        toggle
            .setValue(settingTab.plugin.settings.workflow.autoAddTimestamp)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.workflow.autoAddTimestamp =
                value;
            settingTab.applySettingsUpdate();
            setTimeout(() => {
                settingTab.display();
            }, 200);
        }));
    });
    if (settingTab.plugin.settings.workflow.autoAddTimestamp) {
        let fragment = document.createDocumentFragment();
        fragment.createEl("span", {
            text: t("Timestamp format:"),
        });
        fragment.createEl("span", {
            text: "   ",
        });
        const span = fragment.createEl("span");
        new Setting(containerEl)
            .setName(t("Timestamp format"))
            .setDesc(fragment)
            .addMomentFormat((format) => {
            format.setSampleEl(span);
            format.setDefaultFormat(settingTab.plugin.settings.workflow.timestampFormat ||
                "YYYY-MM-DD HH:mm:ss");
            format
                .setValue(settingTab.plugin.settings.workflow.timestampFormat ||
                "YYYY-MM-DD HH:mm:ss")
                .onChange((value) => {
                settingTab.plugin.settings.workflow.timestampFormat =
                    value;
                settingTab.applySettingsUpdate();
                format.updateSample();
            });
        });
        new Setting(containerEl)
            .setName(t("Remove timestamp when moving to next stage"))
            .setDesc(t("Remove the timestamp from the current task when moving to the next stage"))
            .addToggle((toggle) => {
            toggle
                .setValue(settingTab.plugin.settings.workflow
                .removeTimestampOnTransition)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                settingTab.plugin.settings.workflow.removeTimestampOnTransition =
                    value;
                settingTab.applySettingsUpdate();
            }));
        });
        new Setting(containerEl)
            .setName(t("Calculate spent time"))
            .setDesc(t("Calculate and display the time spent on the task when moving to the next stage"))
            .addToggle((toggle) => {
            toggle
                .setValue(settingTab.plugin.settings.workflow.calculateSpentTime)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                settingTab.plugin.settings.workflow.calculateSpentTime =
                    value;
                settingTab.applySettingsUpdate();
                setTimeout(() => {
                    settingTab.display();
                }, 200);
            }));
        });
        if (settingTab.plugin.settings.workflow.calculateSpentTime) {
            let fragment = document.createDocumentFragment();
            fragment.createEl("span", {
                text: t("Format for spent time:"),
            });
            fragment.createEl("span", {
                text: "   ",
            });
            const span = fragment.createEl("span", {
                text: "HH:mm:ss",
            });
            fragment.createEl("span", {
                text: ".   ",
            });
            fragment.createEl("span", {
                text: t("Calculate spent time when move to next stage."),
            });
            new Setting(containerEl)
                .setName(t("Spent time format"))
                .setDesc(fragment)
                .addMomentFormat((format) => {
                format.setSampleEl(span);
                format.setDefaultFormat(settingTab.plugin.settings.workflow.spentTimeFormat ||
                    "HH:mm:ss");
                format
                    .setValue(settingTab.plugin.settings.workflow
                    .spentTimeFormat || "HH:mm:ss")
                    .onChange((value) => {
                    settingTab.plugin.settings.workflow.spentTimeFormat =
                        value;
                    settingTab.applySettingsUpdate();
                    format.updateSample();
                });
            });
            new Setting(containerEl)
                .setName(t("Calculate full spent time"))
                .setDesc(t("Calculate the full spent time from the start of the task to the last stage"))
                .addToggle((toggle) => {
                toggle
                    .setValue(settingTab.plugin.settings.workflow
                    .calculateFullSpentTime)
                    .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                    settingTab.plugin.settings.workflow.calculateFullSpentTime =
                        value;
                    settingTab.applySettingsUpdate();
                }));
            });
        }
    }
    new Setting(containerEl)
        .setName(t("Auto remove last stage marker"))
        .setDesc(t("Automatically remove the last stage marker when a task is completed"))
        .addToggle((toggle) => {
        toggle
            .setValue(settingTab.plugin.settings.workflow
            .autoRemoveLastStageMarker)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.workflow.autoRemoveLastStageMarker =
                value;
            settingTab.applySettingsUpdate();
        }));
    });
    new Setting(containerEl)
        .setName(t("Auto-add next task"))
        .setDesc(t("Automatically create a new task with the next stage when completing a task"))
        .addToggle((toggle) => {
        toggle
            .setValue(settingTab.plugin.settings.workflow.autoAddNextTask)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.workflow.autoAddNextTask = value;
            settingTab.applySettingsUpdate();
        }));
    });
    // Workflow definitions list
    new Setting(containerEl)
        .setName(t("Workflow definitions"))
        .setDesc(t("Configure workflow templates for different types of processes"));
    // Create a container for the workflow list
    const workflowContainer = containerEl.createDiv({
        cls: "workflow-container",
    });
    // Function to display workflow list
    const refreshWorkflowList = () => {
        // Clear the container
        workflowContainer.empty();
        const workflows = settingTab.plugin.settings.workflow.definitions;
        if (workflows.length === 0) {
            workflowContainer.createEl("div", {
                cls: "no-workflows-message",
                text: t("No workflow definitions created yet. Click 'Add New Workflow' to create one."),
            });
        }
        // Add each workflow in the list
        workflows.forEach((workflow, index) => {
            const workflowRow = workflowContainer.createDiv({
                cls: "workflow-row",
            });
            const workflowSetting = new Setting(workflowRow)
                .setName(workflow.name)
                .setDesc(workflow.description || "");
            // Add edit button
            workflowSetting.addExtraButton((button) => {
                button
                    .setIcon("pencil")
                    .setTooltip(t("Edit workflow"))
                    .onClick(() => {
                    new WorkflowDefinitionModal(settingTab.app, settingTab.plugin, workflow, (updatedWorkflow) => {
                        // Update the workflow
                        settingTab.plugin.settings.workflow.definitions[index] = updatedWorkflow;
                        settingTab.applySettingsUpdate();
                        refreshWorkflowList();
                    }).open();
                });
            });
            // Add delete button
            workflowSetting.addExtraButton((button) => {
                button
                    .setIcon("trash")
                    .setTooltip(t("Remove workflow"))
                    .onClick(() => {
                    // Show confirmation dialog
                    const modal = new Modal(settingTab.app);
                    modal.titleEl.setText(t("Delete workflow"));
                    const content = modal.contentEl.createDiv();
                    content.setText(t(`Are you sure you want to delete the '${workflow.name}' workflow?`));
                    const buttonContainer = modal.contentEl.createDiv({
                        cls: "tg-modal-button-container modal-button-container",
                    });
                    const cancelButton = buttonContainer.createEl("button");
                    cancelButton.setText(t("Cancel"));
                    cancelButton.addEventListener("click", () => {
                        modal.close();
                    });
                    const deleteButton = buttonContainer.createEl("button");
                    deleteButton.setText(t("Delete"));
                    deleteButton.addClass("mod-warning");
                    deleteButton.addEventListener("click", () => {
                        // Remove the workflow
                        settingTab.plugin.settings.workflow.definitions.splice(index, 1);
                        settingTab.applySettingsUpdate();
                        refreshWorkflowList();
                        modal.close();
                    });
                    modal.open();
                });
            });
            // Show stage information
            const stagesInfo = workflowRow.createDiv({
                cls: "workflow-stages-info",
            });
            if (workflow.stages.length > 0) {
                const stagesList = stagesInfo.createEl("ul");
                stagesList.addClass("workflow-stages-list");
                workflow.stages.forEach((stage) => {
                    const stageItem = stagesList.createEl("li");
                    stageItem.addClass("workflow-stage-item");
                    stageItem.addClass(`workflow-stage-type-${stage.type}`);
                    const stageName = stageItem.createSpan({
                        text: stage.name,
                    });
                    if (stage.type === "cycle") {
                        stageItem.addClass("workflow-stage-cycle");
                        stageName.addClass("workflow-stage-name-cycle");
                    }
                    else if (stage.type === "terminal") {
                        stageItem.addClass("workflow-stage-terminal");
                        stageName.addClass("workflow-stage-name-terminal");
                    }
                });
            }
        });
        // Add button to create a new workflow
        const addButtonContainer = workflowContainer.createDiv();
        new Setting(addButtonContainer).addButton((button) => {
            button
                .setButtonText(t("Add New Workflow"))
                .setCta()
                .onClick(() => {
                // Create a new empty workflow
                const newWorkflow = {
                    id: generateUniqueId(),
                    name: t("New Workflow"),
                    description: "",
                    stages: [],
                    metadata: {
                        version: "1.0",
                        created: new Date().toISOString().split("T")[0],
                        lastModified: new Date()
                            .toISOString()
                            .split("T")[0],
                    },
                };
                // Show the edit modal for the new workflow
                new WorkflowDefinitionModal(settingTab.app, settingTab.plugin, newWorkflow, (createdWorkflow) => {
                    // Add the workflow to the list
                    settingTab.plugin.settings.workflow.definitions.push(createdWorkflow);
                    settingTab.applySettingsUpdate();
                    refreshWorkflowList();
                }).open();
            });
        });
    };
    // Initial render of the workflow list
    refreshWorkflowList();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV29ya2Zsb3dTZXR0aW5nc1RhYi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIldvcmtmbG93U2V0dGluZ3NUYWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQzFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUUxQyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN4RyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUV4RCxNQUFNLFVBQVUseUJBQXlCLENBQ3hDLFVBQXFDLEVBQ3JDLFdBQXdCO0lBRXhCLElBQUksT0FBTyxDQUFDLFdBQVcsQ0FBQztTQUN0QixPQUFPLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQ3RCLE9BQU8sQ0FDUCxDQUFDLENBQUMsNkRBQTZELENBQUMsQ0FDaEU7U0FDQSxVQUFVLEVBQUUsQ0FBQztJQUVmLElBQUksT0FBTyxDQUFDLFdBQVcsQ0FBQztTQUN0QixPQUFPLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUM7U0FDN0IsT0FBTyxDQUFDLENBQUMsQ0FBQyxnREFBZ0QsQ0FBQyxDQUFDO1NBQzVELFNBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1FBQ3JCLE1BQU07YUFDSixRQUFRLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQzthQUM1RCxRQUFRLENBQUMsQ0FBTyxLQUFLLEVBQUUsRUFBRTtZQUN6QixVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQztZQUMzRCxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUVqQyxVQUFVLENBQUMsR0FBRyxFQUFFO2dCQUNmLFVBQVUsQ0FBQyxPQUFPLEVB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ZSxFQUFFLEVBQUU7b0JBQ25CLCtCQUErQjtvQkFDL0IsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQ25ELGVBQWUsQ0FDZixDQUFDO29CQUNGLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO29CQUNqQyxtQkFBbUIsRUFBRSxDQUFDO2dCQUN2QixDQUFDLENBQ0QsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNWLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUM7SUFFRixzQ0FBc0M7SUFDdEMsbUJBQW1CLEVBQUUsQ0FBQztBQUN2QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU2V0dGluZywgTW9kYWwgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHsgVGFza1Byb2dyZXNzQmFyU2V0dGluZ1RhYiB9IGZyb20gXCJAL3NldHRpbmdcIjtcclxuaW1wb3J0IHsgV29ya2Zsb3dEZWZpbml0aW9uTW9kYWwgfSBmcm9tIFwiQC9jb21wb25lbnRzL2ZlYXR1cmVzL3dvcmtmbG93L21vZGFscy9Xb3JrZmxvd0RlZmluaXRpb25Nb2RhbFwiO1xyXG5pbXBvcnQgeyBnZW5lcmF0ZVVuaXF1ZUlkIH0gZnJvbSBcIkAvdXRpbHMvaWQtZ2VuZXJhdG9yXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyV29ya2Zsb3dTZXR0aW5nc1RhYihcclxuXHRzZXR0aW5nVGFiOiBUYXNrUHJvZ3Jlc3NCYXJTZXR0aW5nVGFiLFxyXG5cdGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudFxyXG4pIHtcclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJXb3JrZmxvd1wiKSlcclxuXHRcdC5zZXREZXNjKFxyXG5cdFx0XHR0KFwiQ29uZmlndXJlIHRhc2sgd29ya2Zsb3dzIGZvciBwcm9qZWN0IGFuZCBwcm9jZXNzIG1hbmFnZW1lbnRcIilcclxuXHRcdClcclxuXHRcdC5zZXRIZWFkaW5nKCk7XHJcblxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIkVuYWJsZSB3b3JrZmxvd1wiKSlcclxuXHRcdC5zZXREZXNjKHQoXCJUb2dnbGUgdG8gZW5hYmxlIHRoZSB3b3JrZmxvdyBzeXN0ZW0gZm9yIHRhc2tzXCIpKVxyXG5cdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XHJcblx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdC5zZXRWYWx1ZShzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy53b3JrZmxvdy5lbmFibGVXb3JrZmxvdylcclxuXHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy53b3JrZmxvdy5lbmFibGVXb3JrZmxvdyA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblxyXG5cdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIuZGlzcGxheSgpO1xyXG5cdFx0XHRcdFx0fSwgMjAwKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRpZiAoIXNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLndvcmtmbG93LmVuYWJsZVdvcmtmbG93KSByZXR1cm47XHJcblxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIkF1dG8tYWRkIHRpbWVzdGFtcFwiKSlcclxuXHRcdC5zZXREZXNjKFxyXG5cdFx0XHR0KFwiQXV0b21hdGljYWxseSBhZGQgYSB0aW1lc3RhbXAgdG8gdGhlIHRhc2sgd2hlbiBpdCBpcyBjcmVhdGVkXCIpXHJcblx0XHQpXHJcblx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcclxuXHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0LnNldFZhbHVlKHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLndvcmtmbG93LmF1dG9BZGRUaW1lc3RhbXApXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3Mud29ya2Zsb3cuYXV0b0FkZFRpbWVzdGFtcCA9XHJcblx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblxyXG5cdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIuZGlzcGxheSgpO1xyXG5cdFx0XHRcdFx0fSwgMjAwKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRpZiAoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3Mud29ya2Zsb3cuYXV0b0FkZFRpbWVzdGFtcCkge1xyXG5cdFx0bGV0IGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xyXG5cdFx0ZnJhZ21lbnQuY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdFx0dGV4dDogdChcIlRpbWVzdGFtcCBmb3JtYXQ6XCIpLFxyXG5cdFx0fSk7XHJcblx0XHRmcmFnbWVudC5jcmVhdGVFbChcInNwYW5cIiwge1xyXG5cdFx0XHR0ZXh0OiBcIiAgIFwiLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCBzcGFuID0gZnJhZ21lbnQuY3JlYXRlRWwoXCJzcGFuXCIpO1xyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJUaW1lc3RhbXAgZm9ybWF0XCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhmcmFnbWVudClcclxuXHRcdFx0LmFkZE1vbWVudEZvcm1hdCgoZm9ybWF0KSA9PiB7XHJcblx0XHRcdFx0Zm9ybWF0LnNldFNhbXBsZUVsKHNwYW4pO1xyXG5cdFx0XHRcdGZvcm1hdC5zZXREZWZhdWx0Rm9ybWF0KFxyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3Mud29ya2Zsb3cudGltZXN0YW1wRm9ybWF0IHx8XHJcblx0XHRcdFx0XHRcdFwiWVlZWS1NTS1ERCBISDptbTpzc1wiXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRmb3JtYXRcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3Mud29ya2Zsb3cudGltZXN0YW1wRm9ybWF0IHx8XHJcblx0XHRcdFx0XHRcdFx0XCJZWVlZLU1NLUREIEhIOm1tOnNzXCJcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3Mud29ya2Zsb3cudGltZXN0YW1wRm9ybWF0ID1cclxuXHRcdFx0XHRcdFx0XHR2YWx1ZTtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblxyXG5cdFx0XHRcdFx0XHRmb3JtYXQudXBkYXRlU2FtcGxlKCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJSZW1vdmUgdGltZXN0YW1wIHdoZW4gbW92aW5nIHRvIG5leHQgc3RhZ2VcIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcIlJlbW92ZSB0aGUgdGltZXN0YW1wIGZyb20gdGhlIGN1cnJlbnQgdGFzayB3aGVuIG1vdmluZyB0byB0aGUgbmV4dCBzdGFnZVwiXHJcblx0XHRcdFx0KVxyXG5cdFx0XHQpXHJcblx0XHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xyXG5cdFx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy53b3JrZmxvd1xyXG5cdFx0XHRcdFx0XHRcdC5yZW1vdmVUaW1lc3RhbXBPblRyYW5zaXRpb25cclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3Mud29ya2Zsb3cucmVtb3ZlVGltZXN0YW1wT25UcmFuc2l0aW9uID1cclxuXHRcdFx0XHRcdFx0XHR2YWx1ZTtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJDYWxjdWxhdGUgc3BlbnQgdGltZVwiKSlcclxuXHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFwiQ2FsY3VsYXRlIGFuZCBkaXNwbGF5IHRoZSB0aW1lIHNwZW50IG9uIHRoZSB0YXNrIHdoZW4gbW92aW5nIHRvIHRoZSBuZXh0IHN0YWdlXCJcclxuXHRcdFx0XHQpXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XHJcblx0XHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLndvcmtmbG93LmNhbGN1bGF0ZVNwZW50VGltZVxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy53b3JrZmxvdy5jYWxjdWxhdGVTcGVudFRpbWUgPVxyXG5cdFx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHJcblx0XHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIuZGlzcGxheSgpO1xyXG5cdFx0XHRcdFx0XHR9LCAyMDApO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdGlmIChzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy53b3JrZmxvdy5jYWxjdWxhdGVTcGVudFRpbWUpIHtcclxuXHRcdFx0bGV0IGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xyXG5cdFx0XHRmcmFnbWVudC5jcmVhdGVFbChcInNwYW5cIiwge1xyXG5cdFx0XHRcdHRleHQ6IHQoXCJGb3JtYXQgZm9yIHNwZW50IHRpbWU6XCIpLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0ZnJhZ21lbnQuY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdFx0XHR0ZXh0OiBcIiAgIFwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0Y29uc3Qgc3BhbiA9IGZyYWdtZW50LmNyZWF0ZUVsKFwic3BhblwiLCB7XHJcblx0XHRcdFx0dGV4dDogXCJISDptbTpzc1wiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0ZnJhZ21lbnQuY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdFx0XHR0ZXh0OiBcIi4gICBcIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdGZyYWdtZW50LmNyZWF0ZUVsKFwic3BhblwiLCB7XHJcblx0XHRcdFx0dGV4dDogdChcIkNhbGN1bGF0ZSBzcGVudCB0aW1lIHdoZW4gbW92ZSB0byBuZXh0IHN0YWdlLlwiKSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHRcdC5zZXROYW1lKHQoXCJTcGVudCB0aW1lIGZvcm1hdFwiKSlcclxuXHRcdFx0XHQuc2V0RGVzYyhmcmFnbWVudClcclxuXHRcdFx0XHQuYWRkTW9tZW50Rm9ybWF0KChmb3JtYXQpID0+IHtcclxuXHRcdFx0XHRcdGZvcm1hdC5zZXRTYW1wbGVFbChzcGFuKTtcclxuXHRcdFx0XHRcdGZvcm1hdC5zZXREZWZhdWx0Rm9ybWF0KFxyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy53b3JrZmxvdy5zcGVudFRpbWVGb3JtYXQgfHxcclxuXHRcdFx0XHRcdFx0XHRcIkhIOm1tOnNzXCJcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRmb3JtYXRcclxuXHRcdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLndvcmtmbG93XHJcblx0XHRcdFx0XHRcdFx0XHQuc3BlbnRUaW1lRm9ybWF0IHx8IFwiSEg6bW06c3NcIlxyXG5cdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy53b3JrZmxvdy5zcGVudFRpbWVGb3JtYXQgPVxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdGZvcm1hdC51cGRhdGVTYW1wbGUoKTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0XHQuc2V0TmFtZSh0KFwiQ2FsY3VsYXRlIGZ1bGwgc3BlbnQgdGltZVwiKSlcclxuXHRcdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcdFwiQ2FsY3VsYXRlIHRoZSBmdWxsIHNwZW50IHRpbWUgZnJvbSB0aGUgc3RhcnQgb2YgdGhlIHRhc2sgdG8gdGhlIGxhc3Qgc3RhZ2VcIlxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdClcclxuXHRcdFx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcclxuXHRcdFx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdFx0XHQuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3Mud29ya2Zsb3dcclxuXHRcdFx0XHRcdFx0XHRcdC5jYWxjdWxhdGVGdWxsU3BlbnRUaW1lXHJcblx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLndvcmtmbG93LmNhbGN1bGF0ZUZ1bGxTcGVudFRpbWUgPVxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiQXV0byByZW1vdmUgbGFzdCBzdGFnZSBtYXJrZXJcIikpXHJcblx0XHQuc2V0RGVzYyhcclxuXHRcdFx0dChcclxuXHRcdFx0XHRcIkF1dG9tYXRpY2FsbHkgcmVtb3ZlIHRoZSBsYXN0IHN0YWdlIG1hcmtlciB3aGVuIGEgdGFzayBpcyBjb21wbGV0ZWRcIlxyXG5cdFx0XHQpXHJcblx0XHQpXHJcblx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcclxuXHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3Mud29ya2Zsb3dcclxuXHRcdFx0XHRcdFx0LmF1dG9SZW1vdmVMYXN0U3RhZ2VNYXJrZXJcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3Mud29ya2Zsb3cuYXV0b1JlbW92ZUxhc3RTdGFnZU1hcmtlciA9XHJcblx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiQXV0by1hZGQgbmV4dCB0YXNrXCIpKVxyXG5cdFx0LnNldERlc2MoXHJcblx0XHRcdHQoXHJcblx0XHRcdFx0XCJBdXRvbWF0aWNhbGx5IGNyZWF0ZSBhIG5ldyB0YXNrIHdpdGggdGhlIG5leHQgc3RhZ2Ugd2hlbiBjb21wbGV0aW5nIGEgdGFza1wiXHJcblx0XHRcdClcclxuXHRcdClcclxuXHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xyXG5cdFx0XHR0b2dnbGVcclxuXHRcdFx0XHQuc2V0VmFsdWUoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3Mud29ya2Zsb3cuYXV0b0FkZE5leHRUYXNrKVxyXG5cdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLndvcmtmbG93LmF1dG9BZGROZXh0VGFzayA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0Ly8gV29ya2Zsb3cgZGVmaW5pdGlvbnMgbGlzdFxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIldvcmtmbG93IGRlZmluaXRpb25zXCIpKVxyXG5cdFx0LnNldERlc2MoXHJcblx0XHRcdHQoXCJDb25maWd1cmUgd29ya2Zsb3cgdGVtcGxhdGVzIGZvciBkaWZmZXJlbnQgdHlwZXMgb2YgcHJvY2Vzc2VzXCIpXHJcblx0XHQpO1xyXG5cclxuXHQvLyBDcmVhdGUgYSBjb250YWluZXIgZm9yIHRoZSB3b3JrZmxvdyBsaXN0XHJcblx0Y29uc3Qgd29ya2Zsb3dDb250YWluZXIgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0Y2xzOiBcIndvcmtmbG93LWNvbnRhaW5lclwiLFxyXG5cdH0pO1xyXG5cclxuXHQvLyBGdW5jdGlvbiB0byBkaXNwbGF5IHdvcmtmbG93IGxpc3RcclxuXHRjb25zdCByZWZyZXNoV29ya2Zsb3dMaXN0ID0gKCkgPT4ge1xyXG5cdFx0Ly8gQ2xlYXIgdGhlIGNvbnRhaW5lclxyXG5cdFx0d29ya2Zsb3dDb250YWluZXIuZW1wdHkoKTtcclxuXHJcblx0XHRjb25zdCB3b3JrZmxvd3MgPSBzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy53b3JrZmxvdy5kZWZpbml0aW9ucztcclxuXHJcblx0XHRpZiAod29ya2Zsb3dzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHR3b3JrZmxvd0NvbnRhaW5lci5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdFx0Y2xzOiBcIm5vLXdvcmtmbG93cy1tZXNzYWdlXCIsXHJcblx0XHRcdFx0dGV4dDogdChcclxuXHRcdFx0XHRcdFwiTm8gd29ya2Zsb3cgZGVmaW5pdGlvbnMgY3JlYXRlZCB5ZXQuIENsaWNrICdBZGQgTmV3IFdvcmtmbG93JyB0byBjcmVhdGUgb25lLlwiXHJcblx0XHRcdFx0KSxcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWRkIGVhY2ggd29ya2Zsb3cgaW4gdGhlIGxpc3RcclxuXHRcdHdvcmtmbG93cy5mb3JFYWNoKCh3b3JrZmxvdywgaW5kZXgpID0+IHtcclxuXHRcdFx0Y29uc3Qgd29ya2Zsb3dSb3cgPSB3b3JrZmxvd0NvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJ3b3JrZmxvdy1yb3dcIixcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCB3b3JrZmxvd1NldHRpbmcgPSBuZXcgU2V0dGluZyh3b3JrZmxvd1JvdylcclxuXHRcdFx0XHQuc2V0TmFtZSh3b3JrZmxvdy5uYW1lKVxyXG5cdFx0XHRcdC5zZXREZXNjKHdvcmtmbG93LmRlc2NyaXB0aW9uIHx8IFwiXCIpO1xyXG5cclxuXHRcdFx0Ly8gQWRkIGVkaXQgYnV0dG9uXHJcblx0XHRcdHdvcmtmbG93U2V0dGluZy5hZGRFeHRyYUJ1dHRvbigoYnV0dG9uKSA9PiB7XHJcblx0XHRcdFx0YnV0dG9uXHJcblx0XHRcdFx0XHQuc2V0SWNvbihcInBlbmNpbFwiKVxyXG5cdFx0XHRcdFx0LnNldFRvb2x0aXAodChcIkVkaXQgd29ya2Zsb3dcIikpXHJcblx0XHRcdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRcdG5ldyBXb3JrZmxvd0RlZmluaXRpb25Nb2RhbChcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcCxcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbixcclxuXHRcdFx0XHRcdFx0XHR3b3JrZmxvdyxcclxuXHRcdFx0XHRcdFx0XHQodXBkYXRlZFdvcmtmbG93KSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHQvLyBVcGRhdGUgdGhlIHdvcmtmbG93XHJcblx0XHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy53b3JrZmxvdy5kZWZpbml0aW9uc1tcclxuXHRcdFx0XHRcdFx0XHRcdFx0aW5kZXhcclxuXHRcdFx0XHRcdFx0XHRcdF0gPSB1cGRhdGVkV29ya2Zsb3c7XHJcblx0XHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdFx0XHRcdHJlZnJlc2hXb3JrZmxvd0xpc3QoKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdCkub3BlbigpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQWRkIGRlbGV0ZSBidXR0b25cclxuXHRcdFx0d29ya2Zsb3dTZXR0aW5nLmFkZEV4dHJhQnV0dG9uKChidXR0b24pID0+IHtcclxuXHRcdFx0XHRidXR0b25cclxuXHRcdFx0XHRcdC5zZXRJY29uKFwidHJhc2hcIilcclxuXHRcdFx0XHRcdC5zZXRUb29sdGlwKHQoXCJSZW1vdmUgd29ya2Zsb3dcIikpXHJcblx0XHRcdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIFNob3cgY29uZmlybWF0aW9uIGRpYWxvZ1xyXG5cdFx0XHRcdFx0XHRjb25zdCBtb2RhbCA9IG5ldyBNb2RhbChzZXR0aW5nVGFiLmFwcCk7XHJcblx0XHRcdFx0XHRcdG1vZGFsLnRpdGxlRWwuc2V0VGV4dCh0KFwiRGVsZXRlIHdvcmtmbG93XCIpKTtcclxuXHJcblx0XHRcdFx0XHRcdGNvbnN0IGNvbnRlbnQgPSBtb2RhbC5jb250ZW50RWwuY3JlYXRlRGl2KCk7XHJcblx0XHRcdFx0XHRcdGNvbnRlbnQuc2V0VGV4dChcclxuXHRcdFx0XHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XHRcdFx0YEFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkZWxldGUgdGhlICcke3dvcmtmbG93Lm5hbWV9JyB3b3JrZmxvdz9gXHJcblx0XHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdFx0Y29uc3QgYnV0dG9uQ29udGFpbmVyID0gbW9kYWwuY29udGVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0XHRcdFx0Y2xzOiBcInRnLW1vZGFsLWJ1dHRvbi1jb250YWluZXIgbW9kYWwtYnV0dG9uLWNvbnRhaW5lclwiLFxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRcdGNvbnN0IGNhbmNlbEJ1dHRvbiA9IGJ1dHRvbkNvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiKTtcclxuXHRcdFx0XHRcdFx0Y2FuY2VsQnV0dG9uLnNldFRleHQodChcIkNhbmNlbFwiKSk7XHJcblx0XHRcdFx0XHRcdGNhbmNlbEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdG1vZGFsLmNsb3NlKCk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdFx0Y29uc3QgZGVsZXRlQnV0dG9uID0gYnV0dG9uQ29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIpO1xyXG5cdFx0XHRcdFx0XHRkZWxldGVCdXR0b24uc2V0VGV4dCh0KFwiRGVsZXRlXCIpKTtcclxuXHRcdFx0XHRcdFx0ZGVsZXRlQnV0dG9uLmFkZENsYXNzKFwibW9kLXdhcm5pbmdcIik7XHJcblx0XHRcdFx0XHRcdGRlbGV0ZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdC8vIFJlbW92ZSB0aGUgd29ya2Zsb3dcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy53b3JrZmxvdy5kZWZpbml0aW9ucy5zcGxpY2UoXHJcblx0XHRcdFx0XHRcdFx0XHRpbmRleCxcclxuXHRcdFx0XHRcdFx0XHRcdDFcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHRcdHJlZnJlc2hXb3JrZmxvd0xpc3QoKTtcclxuXHRcdFx0XHRcdFx0XHRtb2RhbC5jbG9zZSgpO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRcdG1vZGFsLm9wZW4oKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIFNob3cgc3RhZ2UgaW5mb3JtYXRpb25cclxuXHRcdFx0Y29uc3Qgc3RhZ2VzSW5mbyA9IHdvcmtmbG93Um93LmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcIndvcmtmbG93LXN0YWdlcy1pbmZvXCIsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0aWYgKHdvcmtmbG93LnN0YWdlcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0Y29uc3Qgc3RhZ2VzTGlzdCA9IHN0YWdlc0luZm8uY3JlYXRlRWwoXCJ1bFwiKTtcclxuXHRcdFx0XHRzdGFnZXNMaXN0LmFkZENsYXNzKFwid29ya2Zsb3ctc3RhZ2VzLWxpc3RcIik7XHJcblxyXG5cdFx0XHRcdHdvcmtmbG93LnN0YWdlcy5mb3JFYWNoKChzdGFnZSkgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc3Qgc3RhZ2VJdGVtID0gc3RhZ2VzTGlzdC5jcmVhdGVFbChcImxpXCIpO1xyXG5cdFx0XHRcdFx0c3RhZ2VJdGVtLmFkZENsYXNzKFwid29ya2Zsb3ctc3RhZ2UtaXRlbVwiKTtcclxuXHRcdFx0XHRcdHN0YWdlSXRlbS5hZGRDbGFzcyhgd29ya2Zsb3ctc3RhZ2UtdHlwZS0ke3N0YWdlLnR5cGV9YCk7XHJcblxyXG5cdFx0XHRcdFx0Y29uc3Qgc3RhZ2VOYW1lID0gc3RhZ2VJdGVtLmNyZWF0ZVNwYW4oe1xyXG5cdFx0XHRcdFx0XHR0ZXh0OiBzdGFnZS5uYW1lLFxyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0aWYgKHN0YWdlLnR5cGUgPT09IFwiY3ljbGVcIikge1xyXG5cdFx0XHRcdFx0XHRzdGFnZUl0ZW0uYWRkQ2xhc3MoXCJ3b3JrZmxvdy1zdGFnZS1jeWNsZVwiKTtcclxuXHRcdFx0XHRcdFx0c3RhZ2VOYW1lLmFkZENsYXNzKFwid29ya2Zsb3ctc3RhZ2UtbmFtZS1jeWNsZVwiKTtcclxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoc3RhZ2UudHlwZSA9PT0gXCJ0ZXJtaW5hbFwiKSB7XHJcblx0XHRcdFx0XHRcdHN0YWdlSXRlbS5hZGRDbGFzcyhcIndvcmtmbG93LXN0YWdlLXRlcm1pbmFsXCIpO1xyXG5cdFx0XHRcdFx0XHRzdGFnZU5hbWUuYWRkQ2xhc3MoXCJ3b3JrZmxvdy1zdGFnZS1uYW1lLXRlcm1pbmFsXCIpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBBZGQgYnV0dG9uIHRvIGNyZWF0ZSBhIG5ldyB3b3JrZmxvd1xyXG5cdFx0Y29uc3QgYWRkQnV0dG9uQ29udGFpbmVyID0gd29ya2Zsb3dDb250YWluZXIuY3JlYXRlRGl2KCk7XHJcblx0XHRuZXcgU2V0dGluZyhhZGRCdXR0b25Db250YWluZXIpLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XHJcblx0XHRcdGJ1dHRvblxyXG5cdFx0XHRcdC5zZXRCdXR0b25UZXh0KHQoXCJBZGQgTmV3IFdvcmtmbG93XCIpKVxyXG5cdFx0XHRcdC5zZXRDdGEoKVxyXG5cdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdC8vIENyZWF0ZSBhIG5ldyBlbXB0eSB3b3JrZmxvd1xyXG5cdFx0XHRcdFx0Y29uc3QgbmV3V29ya2Zsb3cgPSB7XHJcblx0XHRcdFx0XHRcdGlkOiBnZW5lcmF0ZVVuaXF1ZUlkKCksXHJcblx0XHRcdFx0XHRcdG5hbWU6IHQoXCJOZXcgV29ya2Zsb3dcIiksXHJcblx0XHRcdFx0XHRcdGRlc2NyaXB0aW9uOiBcIlwiLFxyXG5cdFx0XHRcdFx0XHRzdGFnZXM6IFtdLFxyXG5cdFx0XHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0XHRcdHZlcnNpb246IFwiMS4wXCIsXHJcblx0XHRcdFx0XHRcdFx0Y3JlYXRlZDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNwbGl0KFwiVFwiKVswXSxcclxuXHRcdFx0XHRcdFx0XHRsYXN0TW9kaWZpZWQ6IG5ldyBEYXRlKClcclxuXHRcdFx0XHRcdFx0XHRcdC50b0lTT1N0cmluZygpXHJcblx0XHRcdFx0XHRcdFx0XHQuc3BsaXQoXCJUXCIpWzBdLFxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0XHQvLyBTaG93IHRoZSBlZGl0IG1vZGFsIGZvciB0aGUgbmV3IHdvcmtmbG93XHJcblx0XHRcdFx0XHRuZXcgV29ya2Zsb3dEZWZpbml0aW9uTW9kYWwoXHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwLFxyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbixcclxuXHRcdFx0XHRcdFx0bmV3V29ya2Zsb3csXHJcblx0XHRcdFx0XHRcdChjcmVhdGVkV29ya2Zsb3cpID0+IHtcclxuXHRcdFx0XHRcdFx0XHQvLyBBZGQgdGhlIHdvcmtmbG93IHRvIHRoZSBsaXN0XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3Mud29ya2Zsb3cuZGVmaW5pdGlvbnMucHVzaChcclxuXHRcdFx0XHRcdFx0XHRcdGNyZWF0ZWRXb3JrZmxvd1xyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHRcdFx0cmVmcmVzaFdvcmtmbG93TGlzdCgpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHQpLm9wZW4oKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH07XHJcblxyXG5cdC8vIEluaXRpYWwgcmVuZGVyIG9mIHRoZSB3b3JrZmxvdyBsaXN0XHJcblx0cmVmcmVzaFdvcmtmbG93TGlzdCgpO1xyXG59XHJcbiJdfQ==