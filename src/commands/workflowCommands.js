import { Notice, Menu } from "obsidian";
import { QuickWorkflowModal } from "../components/features/workflow/modals/QuickWorkflowModal";
import { WorkflowDefinitionModal } from "../components/features/workflow/modals/WorkflowDefinitionModal";
import { analyzeTaskStructure, convertTaskStructureToWorkflow, createWorkflowStartingTask, convertCurrentTaskToWorkflowRoot, suggestWorkflowFromExisting, } from "../core/workflow-converter";
import { t } from "../translations/helper";
/**
 * Command to create a quick workflow
 */
export function createQuickWorkflowCommand(checking, editor, ctx, plugin) {
    if (checking) {
        return plugin.settings.workflow.enableWorkflow;
    }
    new QuickWorkflowModal(plugin.app, plugin, (workflow) => {
        // Add the workflow to settings
        plugin.settings.workflow.definitions.push(workflow);
        plugin.saveSettings();
        new Notice(t("Workflow created successfully"));
    }).open();
    return true;
}
/**
 * Command to convert current task structure to workflow template
 */
export function convertTaskToWorkflowCommand(checking, editor, ctx, plugin) {
    if (checking) {
        if (!plugin.settings.workflow.enableWorkflow)
            return false;
        // Check if cursor is on or near a task
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);
        return line.match(/^\s*[-*+] \[(.)\]/) !== null;
    }
    const cursor = editor.getCursor();
    const structure = analyzeTaskStructure(editor, cursor);
    if (!structure || !structure.isTask) {
        new Notice(t("No task structure found at cursor position"));
        return false;
    }
    // Check for existing similar workflows
    const suggestion = suggestWorkflowFromExisting(structure, plugin.settings.workflow.definitions);
    if (suggestion) {
        // Show a choice between using existing pattern or creating new
        const menu = new Menu();
        menu.addItem((item) => {
            item.setTitle(t("Use similar existing workflow"))
                .setIcon("copy")
                .onClick(() => {
                createWorkflowFromStructure(structure, suggestion.name, suggestion.id, plugin);
            });
        });
        menu.addItem((item) => {
            item.setTitle(t("Create new workflow"))
                .setIcon("plus")
                .onClick(() => {
                promptForWorkflowDetails(structure, plugin);
            });
        });
        menu.showAtMouseEvent(window.event);
    }
    else {
        promptForWorkflowDetails(structure, plugin);
    }
    return true;
}
/**
 * Command to start a workflow at current position
 */
export function startWorkflowHereCommand(checking, editor, ctx, plugin) {
    if (checking) {
        return plugin.settings.workflow.enableWorkflow &&
            plugin.settings.workflow.definitions.length > 0;
    }
    const workflows = plugin.settings.workflow.definitions;
    if (workflows.length === 0) {
        new Notice(t("No workflows defined. Create a workflow first."));
        return false;
    }
    if (workflows.length === 1) {
        // If only one workflow, use it directly
        const cursor = editor.getCursor();
        createWorkflowStartingTask(editor, cursor, workflows[0], plugin);
        new Notice(t("Workflow task created"));
    }
    else {
        // Show workflow selection menu
        const menu = new Menu();
        workflows.forEach((workflow) => {
            menu.addItem((item) => {
                item.setTitle(workflow.name)
                    .setIcon("workflow")
                    .onClick(() => {
                    const cursor = editor.getCursor();
                    createWorkflowStartingTask(editor, cursor, workflow, plugin);
                    new Notice(t("Workflow task created"));
                });
            });
        });
        menu.showAtMouseEvent(window.event);
    }
    return true;
}
/**
 * Command to convert current task to workflow root
 */
export function convertToWorkflowRootCommand(checking, editor, ctx, plugin) {
    if (checking) {
        if (!plugin.settings.workflow.enableWorkflow)
            return false;
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);
        const taskMatch = line.match(/^\s*[-*+] \[(.)\]/);
        // Check if it's a task and doesn't already have a workflow tag
        return taskMatch !== null && !line.includes("#workflow/");
    }
    const workflows = plugin.settings.workflow.definitions;
    if (workflows.length === 0) {
        new Notice(t("No workflows defined. Create a workflow first."));
        return false;
    }
    const cursor = editor.getCursor();
    if (workflows.length === 1) {
        // If only one workflow, use it directly
        const success = convertCurrentTaskToWorkflowRoot(editor, cursor, workflows[0].id);
        if (success) {
            new Notice(t("Task converted to workflow root"));
        }
        else {
            new Notice(t("Failed to convert task"));
        }
    }
    else {
        // Show workflow selection menu
        const menu = new Menu();
        workflows.forEach((workflow) => {
            menu.addItem((item) => {
                item.setTitle(workflow.name)
                    .setIcon("workflow")
                    .onClick(() => {
                    const success = convertCurrentTaskToWorkflowRoot(editor, cursor, workflow.id);
                    if (success) {
                        new Notice(t("Task converted to workflow root"));
                    }
                    else {
                        new Notice(t("Failed to convert task"));
                    }
                });
            });
        });
        menu.showAtMouseEvent(window.event);
    }
    return true;
}
/**
 * Command to duplicate an existing workflow
 */
export function duplicateWorkflowCommand(checking, editor, ctx, plugin) {
    if (checking) {
        return plugin.settings.workflow.enableWorkflow &&
            plugin.settings.workflow.definitions.length > 0;
    }
    const workflows = plugin.settings.workflow.definitions;
    if (workflows.length === 0) {
        new Notice(t("No workflows to duplicate"));
        return false;
    }
    // Show workflow selection menu for duplication
    const menu = new Menu();
    workflows.forEach((workflow) => {
        menu.addItem((item) => {
            item.setTitle(t("Duplicate") + ": " + workflow.name)
                .setIcon("copy")
                .onClick(() => {
                const duplicatedWorkflow = Object.assign(Object.assign({}, workflow), { id: workflow.id + "_copy", name: workflow.name + " (Copy)", metadata: Object.assign(Object.assign({}, workflow.metadata), { created: new Date().toISOString().split("T")[0], lastModified: new Date().toISOString().split("T")[0] }) });
                // Open the workflow definition modal for editing
                new WorkflowDefinitionModal(plugin.app, plugin, duplicatedWorkflow, (editedWorkflow) => {
                    plugin.settings.workflow.definitions.push(editedWorkflow);
                    plugin.saveSettings();
                    new Notice(t("Workflow duplicated and saved"));
                }).open();
            });
        });
    });
    menu.showAtMouseEvent(window.event);
    return true;
}
/**
 * Helper function to prompt for workflow details
 */
function promptForWorkflowDetails(structure, plugin) {
    // Create a simple prompt for workflow name
    const workflowName = structure.content + " Workflow";
    const workflowId = workflowName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, "_")
        .substring(0, 30);
    createWorkflowFromStructure(structure, workflowName, workflowId, plugin);
}
/**
 * Helper function to create workflow from structure
 */
function createWorkflowFromStructure(structure, name, id, plugin) {
    const workflow = convertTaskStructureToWorkflow(structure, name, id);
    // Open the workflow definition modal for review and editing
    new WorkflowDefinitionModal(plugin.app, plugin, workflow, (finalWorkflow) => {
        plugin.settings.workflow.definitions.push(finalWorkflow);
        plugin.saveSettings();
        new Notice(t("Workflow created from task structure"));
    }).open();
}
/**
 * Command to show workflow quick actions menu
 */
export function showWorkflowQuickActionsCommand(checking, editor, ctx, plugin) {
    if (checking) {
        return plugin.settings.workflow.enableWorkflow;
    }
    const menu = new Menu();
    // Quick workflow creation
    menu.addItem((item) => {
        item.setTitle(t("Create Quick Workflow"))
            .setIcon("plus-circle")
            .onClick(() => {
            createQuickWorkflowCommand(false, editor, ctx, plugin);
        });
    });
    // Convert task to workflow
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    if (line.match(/^\s*[-*+] \[(.)\]/)) {
        menu.addItem((item) => {
            item.setTitle(t("Convert Task to Workflow"))
                .setIcon("convert")
                .onClick(() => {
                convertTaskToWorkflowCommand(false, editor, ctx, plugin);
            });
        });
        if (!line.includes("#workflow/")) {
            menu.addItem((item) => {
                item.setTitle(t("Convert to Workflow Root"))
                    .setIcon("workflow")
                    .onClick(() => {
                    convertToWorkflowRootCommand(false, editor, ctx, plugin);
                });
            });
        }
    }
    // Start workflow here
    menu.addItem((item) => {
        item.setTitle(t("Start Workflow Here"))
            .setIcon("play")
            .onClick(() => {
            startWorkflowHereCommand(false, editor, ctx, plugin);
        });
    });
    // Duplicate workflow
    if (plugin.settings.workflow.definitions.length > 0) {
        menu.addItem((item) => {
            item.setTitle(t("Duplicate Workflow"))
                .setIcon("copy")
                .onClick(() => {
                duplicateWorkflowCommand(false, editor, ctx, plugin);
            });
        });
    }
    menu.showAtMouseEvent(window.event);
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2Zsb3dDb21tYW5kcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIndvcmtmbG93Q29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUEwQyxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBRWhGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQy9GLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQ3pHLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsOEJBQThCLEVBQzlCLDBCQUEwQixFQUMxQixnQ0FBZ0MsRUFDaEMsMkJBQTJCLEdBQzNCLE1BQU0sNEJBQTRCLENBQUM7QUFDcEMsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBRTNDOztHQUVHO0FBQ0gsTUFBTSxVQUFVLDBCQUEwQixDQUN6QyxRQUFpQixFQUNqQixNQUFjLEVBQ2QsR0FBb0MsRUFDcEMsTUFBNkI7SUFFN0IsSUFBSSxRQUFRLEVBQUU7UUFDYixPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQztLQUMvQztJQUVELElBQUksa0JBQWtCLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRTtRQUN2RCwrQkFBK0I7UUFDL0IsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwRCxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDdEIsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQztJQUNoRCxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUVWLE9BQU8sSUFBSSxDQUFDO0FBQ2IsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLDRCQUE0QixDQUMzQyxR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QUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDdEQsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztLQUNIO0lBRUQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxLQUFtQixDQUFDLENBQUM7SUFDbEQsT0FBTyxJQUFJLENBQUM7QUFDYixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRWRpdG9yLCBNYXJrZG93blZpZXcsIE1hcmtkb3duRmlsZUluZm8sIE5vdGljZSwgTWVudSB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCIuLi9pbmRleFwiO1xyXG5pbXBvcnQgeyBRdWlja1dvcmtmbG93TW9kYWwgfSBmcm9tIFwiLi4vY29tcG9uZW50cy9mZWF0dXJlcy93b3JrZmxvdy9tb2RhbHMvUXVpY2tXb3JrZmxvd01vZGFsXCI7XHJcbmltcG9ydCB7IFdvcmtmbG93RGVmaW5pdGlvbk1vZGFsIH0gZnJvbSBcIi4uL2NvbXBvbmVudHMvZmVhdHVyZXMvd29ya2Zsb3cvbW9kYWxzL1dvcmtmbG93RGVmaW5pdGlvbk1vZGFsXCI7XHJcbmltcG9ydCB7XHJcblx0YW5hbHl6ZVRhc2tTdHJ1Y3R1cmUsXHJcblx0Y29udmVydFRhc2tTdHJ1Y3R1cmVUb1dvcmtmbG93LFxyXG5cdGNyZWF0ZVdvcmtmbG93U3RhcnRpbmdUYXNrLFxyXG5cdGNvbnZlcnRDdXJyZW50VGFza1RvV29ya2Zsb3dSb290LFxyXG5cdHN1Z2dlc3RXb3JrZmxvd0Zyb21FeGlzdGluZyxcclxufSBmcm9tIFwiLi4vY29yZS93b3JrZmxvdy1jb252ZXJ0ZXJcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCIuLi90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcblxyXG4vKipcclxuICogQ29tbWFuZCB0byBjcmVhdGUgYSBxdWljayB3b3JrZmxvd1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVF1aWNrV29ya2Zsb3dDb21tYW5kKFxyXG5cdGNoZWNraW5nOiBib29sZWFuLFxyXG5cdGVkaXRvcjogRWRpdG9yLFxyXG5cdGN0eDogTWFya2Rvd25WaWV3IHwgTWFya2Rvd25GaWxlSW5mbyxcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpblxyXG4pOiBib29sZWFuIHtcclxuXHRpZiAoY2hlY2tpbmcpIHtcclxuXHRcdHJldHVybiBwbHVnaW4uc2V0dGluZ3Mud29ya2Zsb3cuZW5hYmxlV29ya2Zsb3c7XHJcblx0fVxyXG5cclxuXHRuZXcgUXVpY2tXb3JrZmxvd01vZGFsKHBsdWdpbi5hcHAsIHBsdWdpbiwgKHdvcmtmbG93KSA9PiB7XHJcblx0XHQvLyBBZGQgdGhlIHdvcmtmbG93IHRvIHNldHRpbmdzXHJcblx0XHRwbHVnaW4uc2V0dGluZ3Mud29ya2Zsb3cuZGVmaW5pdGlvbnMucHVzaCh3b3JrZmxvdyk7XHJcblx0XHRwbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRuZXcgTm90aWNlKHQoXCJXb3JrZmxvdyBjcmVhdGVkIHN1Y2Nlc3NmdWxseVwiKSk7XHJcblx0fSkub3BlbigpO1xyXG5cclxuXHRyZXR1cm4gdHJ1ZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbW1hbmQgdG8gY29udmVydCBjdXJyZW50IHRhc2sgc3RydWN0dXJlIHRvIHdvcmtmbG93IHRlbXBsYXRlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY29udmVydFRhc2tUb1dvcmtmbG93Q29tbWFuZChcclxuXHRjaGVja2luZzogYm9vbGVhbixcclxuXHRlZGl0b3I6IEVkaXRvcixcclxuXHRjdHg6IE1hcmtkb3duVmlldyB8IE1hcmtkb3duRmlsZUluZm8sXHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW5cclxuKTogYm9vbGVhbiB7XHJcblx0aWYgKGNoZWNraW5nKSB7XHJcblx0XHRpZiAoIXBsdWdpbi5zZXR0aW5ncy53b3JrZmxvdy5lbmFibGVXb3JrZmxvdykgcmV0dXJuIGZhbHNlO1xyXG5cdFx0XHJcblx0XHQvLyBDaGVjayBpZiBjdXJzb3IgaXMgb24gb3IgbmVhciBhIHRhc2tcclxuXHRcdGNvbnN0IGN1cnNvciA9IGVkaXRvci5nZXRDdXJzb3IoKTtcclxuXHRcdGNvbnN0IGxpbmUgPSBlZGl0b3IuZ2V0TGluZShjdXJzb3IubGluZSk7XHJcblx0XHRyZXR1cm4gbGluZS5tYXRjaCgvXlxccypbLSorXSBcXFsoLilcXF0vKSAhPT0gbnVsbDtcclxuXHR9XHJcblxyXG5cdGNvbnN0IGN1cnNvciA9IGVkaXRvci5nZXRDdXJzb3IoKTtcclxuXHRjb25zdCBzdHJ1Y3R1cmUgPSBhbmFseXplVGFza1N0cnVjdHVyZShlZGl0b3IsIGN1cnNvcik7XHJcblx0XHJcblx0aWYgKCFzdHJ1Y3R1cmUgfHwgIXN0cnVjdHVyZS5pc1Rhc2spIHtcclxuXHRcdG5ldyBOb3RpY2UodChcIk5vIHRhc2sgc3RydWN0dXJlIGZvdW5kIGF0IGN1cnNvciBwb3NpdGlvblwiKSk7XHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblx0fVxyXG5cclxuXHQvLyBDaGVjayBmb3IgZXhpc3Rpbmcgc2ltaWxhciB3b3JrZmxvd3NcclxuXHRjb25zdCBzdWdnZXN0aW9uID0gc3VnZ2VzdFdvcmtmbG93RnJvbUV4aXN0aW5nKFxyXG5cdFx0c3RydWN0dXJlLFxyXG5cdFx0cGx1Z2luLnNldHRpbmdzLndvcmtmbG93LmRlZmluaXRpb25zXHJcblx0KTtcclxuXHJcblx0aWYgKHN1Z2dlc3Rpb24pIHtcclxuXHRcdC8vIFNob3cgYSBjaG9pY2UgYmV0d2VlbiB1c2luZyBleGlzdGluZyBwYXR0ZXJuIG9yIGNyZWF0aW5nIG5ld1xyXG5cdFx0Y29uc3QgbWVudSA9IG5ldyBNZW51KCk7XHJcblx0XHRcclxuXHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJVc2Ugc2ltaWxhciBleGlzdGluZyB3b3JrZmxvd1wiKSlcclxuXHRcdFx0XHQuc2V0SWNvbihcImNvcHlcIilcclxuXHRcdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRjcmVhdGVXb3JrZmxvd0Zyb21TdHJ1Y3R1cmUoc3RydWN0dXJlLCBzdWdnZXN0aW9uLm5hbWUsIHN1Z2dlc3Rpb24uaWQsIHBsdWdpbik7XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0aXRlbS5zZXRUaXRsZSh0KFwiQ3JlYXRlIG5ldyB3b3JrZmxvd1wiKSlcclxuXHRcdFx0XHQuc2V0SWNvbihcInBsdXNcIilcclxuXHRcdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRwcm9tcHRGb3JXb3JrZmxvd0RldGFpbHMoc3RydWN0dXJlLCBwbHVnaW4pO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0bWVudS5zaG93QXRNb3VzZUV2ZW50KHdpbmRvdy5ldmVudCBhcyBNb3VzZUV2ZW50KTtcclxuXHR9IGVsc2Uge1xyXG5cdFx0cHJvbXB0Rm9yV29ya2Zsb3dEZXRhaWxzKHN0cnVjdHVyZSwgcGx1Z2luKTtcclxuXHR9XHJcblxyXG5cdHJldHVybiB0cnVlO1xyXG59XHJcblxyXG4vKipcclxuICogQ29tbWFuZCB0byBzdGFydCBhIHdvcmtmbG93IGF0IGN1cnJlbnQgcG9zaXRpb25cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBzdGFydFdvcmtmbG93SGVyZUNvbW1hbmQoXHJcblx0Y2hlY2tpbmc6IGJvb2xlYW4sXHJcblx0ZWRpdG9yOiBFZGl0b3IsXHJcblx0Y3R4OiBNYXJrZG93blZpZXcgfCBNYXJrZG93bkZpbGVJbmZvLFxyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luXHJcbik6IGJvb2xlYW4ge1xyXG5cdGlmIChjaGVja2luZykge1xyXG5cdFx0cmV0dXJuIHBsdWdpbi5zZXR0aW5ncy53b3JrZmxvdy5lbmFibGVXb3JrZmxvdyAmJiBcclxuXHRcdFx0ICAgcGx1Z2luLnNldHRpbmdzLndvcmtmbG93LmRlZmluaXRpb25zLmxlbmd0aCA+IDA7XHJcblx0fVxyXG5cclxuXHRjb25zdCB3b3JrZmxvd3MgPSBwbHVnaW4uc2V0dGluZ3Mud29ya2Zsb3cuZGVmaW5pdGlvbnM7XHJcblx0XHJcblx0aWYgKHdvcmtmbG93cy5sZW5ndGggPT09IDApIHtcclxuXHRcdG5ldyBOb3RpY2UodChcIk5vIHdvcmtmbG93cyBkZWZpbmVkLiBDcmVhdGUgYSB3b3JrZmxvdyBmaXJzdC5cIikpO1xyXG5cdFx0cmV0dXJuIGZhbHNlO1xyXG5cdH1cclxuXHJcblx0aWYgKHdvcmtmbG93cy5sZW5ndGggPT09IDEpIHtcclxuXHRcdC8vIElmIG9ubHkgb25lIHdvcmtmbG93LCB1c2UgaXQgZGlyZWN0bHlcclxuXHRcdGNvbnN0IGN1cnNvciA9IGVkaXRvci5nZXRDdXJzb3IoKTtcclxuXHRcdGNyZWF0ZVdvcmtmbG93U3RhcnRpbmdUYXNrKGVkaXRvciwgY3Vyc29yLCB3b3JrZmxvd3NbMF0sIHBsdWdpbik7XHJcblx0XHRuZXcgTm90aWNlKHQoXCJXb3JrZmxvdyB0YXNrIGNyZWF0ZWRcIikpO1xyXG5cdH0gZWxzZSB7XHJcblx0XHQvLyBTaG93IHdvcmtmbG93IHNlbGVjdGlvbiBtZW51XHJcblx0XHRjb25zdCBtZW51ID0gbmV3IE1lbnUoKTtcclxuXHRcdFxyXG5cdFx0d29ya2Zsb3dzLmZvckVhY2goKHdvcmtmbG93KSA9PiB7XHJcblx0XHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRcdGl0ZW0uc2V0VGl0bGUod29ya2Zsb3cubmFtZSlcclxuXHRcdFx0XHRcdC5zZXRJY29uKFwid29ya2Zsb3dcIilcclxuXHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgY3Vyc29yID0gZWRpdG9yLmdldEN1cnNvcigpO1xyXG5cdFx0XHRcdFx0XHRjcmVhdGVXb3JrZmxvd1N0YXJ0aW5nVGFzayhlZGl0b3IsIGN1cnNvciwgd29ya2Zsb3csIHBsdWdpbik7XHJcblx0XHRcdFx0XHRcdG5ldyBOb3RpY2UodChcIldvcmtmbG93IHRhc2sgY3JlYXRlZFwiKSk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRtZW51LnNob3dBdE1vdXNlRXZlbnQod2luZG93LmV2ZW50IGFzIE1vdXNlRXZlbnQpO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIHRydWU7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb21tYW5kIHRvIGNvbnZlcnQgY3VycmVudCB0YXNrIHRvIHdvcmtmbG93IHJvb3RcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0VG9Xb3JrZmxvd1Jvb3RDb21tYW5kKFxyXG5cdGNoZWNraW5nOiBib29sZWFuLFxyXG5cdGVkaXRvcjogRWRpdG9yLFxyXG5cdGN0eDogTWFya2Rvd25WaWV3IHwgTWFya2Rvd25GaWxlSW5mbyxcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpblxyXG4pOiBib29sZWFuIHtcclxuXHRpZiAoY2hlY2tpbmcpIHtcclxuXHRcdGlmICghcGx1Z2luLnNldHRpbmdzLndvcmtmbG93LmVuYWJsZVdvcmtmbG93KSByZXR1cm4gZmFsc2U7XHJcblx0XHRcclxuXHRcdGNvbnN0IGN1cnNvciA9IGVkaXRvci5nZXRDdXJzb3IoKTtcclxuXHRcdGNvbnN0IGxpbmUgPSBlZGl0b3IuZ2V0TGluZShjdXJzb3IubGluZSk7XHJcblx0XHRjb25zdCB0YXNrTWF0Y2ggPSBsaW5lLm1hdGNoKC9eXFxzKlstKitdIFxcWyguKVxcXS8pO1xyXG5cdFx0XHJcblx0XHQvLyBDaGVjayBpZiBpdCdzIGEgdGFzayBhbmQgZG9lc24ndCBhbHJlYWR5IGhhdmUgYSB3b3JrZmxvdyB0YWdcclxuXHRcdHJldHVybiB0YXNrTWF0Y2ggIT09IG51bGwgJiYgIWxpbmUuaW5jbHVkZXMoXCIjd29ya2Zsb3cvXCIpO1xyXG5cdH1cclxuXHJcblx0Y29uc3Qgd29ya2Zsb3dzID0gcGx1Z2luLnNldHRpbmdzLndvcmtmbG93LmRlZmluaXRpb25zO1xyXG5cdFxyXG5cdGlmICh3b3JrZmxvd3MubGVuZ3RoID09PSAwKSB7XHJcblx0XHRuZXcgTm90aWNlKHQoXCJObyB3b3JrZmxvd3MgZGVmaW5lZC4gQ3JlYXRlIGEgd29ya2Zsb3cgZmlyc3QuXCIpKTtcclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHR9XHJcblxyXG5cdGNvbnN0IGN1cnNvciA9IGVkaXRvci5nZXRDdXJzb3IoKTtcclxuXHRcclxuXHRpZiAod29ya2Zsb3dzLmxlbmd0aCA9PT0gMSkge1xyXG5cdFx0Ly8gSWYgb25seSBvbmUgd29ya2Zsb3csIHVzZSBpdCBkaXJlY3RseVxyXG5cdFx0Y29uc3Qgc3VjY2VzcyA9IGNvbnZlcnRDdXJyZW50VGFza1RvV29ya2Zsb3dSb290KGVkaXRvciwgY3Vyc29yLCB3b3JrZmxvd3NbMF0uaWQpO1xyXG5cdFx0aWYgKHN1Y2Nlc3MpIHtcclxuXHRcdFx0bmV3IE5vdGljZSh0KFwiVGFzayBjb252ZXJ0ZWQgdG8gd29ya2Zsb3cgcm9vdFwiKSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRuZXcgTm90aWNlKHQoXCJGYWlsZWQgdG8gY29udmVydCB0YXNrXCIpKTtcclxuXHRcdH1cclxuXHR9IGVsc2Uge1xyXG5cdFx0Ly8gU2hvdyB3b3JrZmxvdyBzZWxlY3Rpb24gbWVudVxyXG5cdFx0Y29uc3QgbWVudSA9IG5ldyBNZW51KCk7XHJcblx0XHRcclxuXHRcdHdvcmtmbG93cy5mb3JFYWNoKCh3b3JrZmxvdykgPT4ge1xyXG5cdFx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRpdGVtLnNldFRpdGxlKHdvcmtmbG93Lm5hbWUpXHJcblx0XHRcdFx0XHQuc2V0SWNvbihcIndvcmtmbG93XCIpXHJcblx0XHRcdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IHN1Y2Nlc3MgPSBjb252ZXJ0Q3VycmVudFRhc2tUb1dvcmtmbG93Um9vdChlZGl0b3IsIGN1cnNvciwgd29ya2Zsb3cuaWQpO1xyXG5cdFx0XHRcdFx0XHRpZiAoc3VjY2Vzcykge1xyXG5cdFx0XHRcdFx0XHRcdG5ldyBOb3RpY2UodChcIlRhc2sgY29udmVydGVkIHRvIHdvcmtmbG93IHJvb3RcIikpO1xyXG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdG5ldyBOb3RpY2UodChcIkZhaWxlZCB0byBjb252ZXJ0IHRhc2tcIikpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRtZW51LnNob3dBdE1vdXNlRXZlbnQod2luZG93LmV2ZW50IGFzIE1vdXNlRXZlbnQpO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIHRydWU7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb21tYW5kIHRvIGR1cGxpY2F0ZSBhbiBleGlzdGluZyB3b3JrZmxvd1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGR1cGxpY2F0ZVdvcmtmbG93Q29tbWFuZChcclxuXHRjaGVja2luZzogYm9vbGVhbixcclxuXHRlZGl0b3I6IEVkaXRvcixcclxuXHRjdHg6IE1hcmtkb3duVmlldyB8IE1hcmtkb3duRmlsZUluZm8sXHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW5cclxuKTogYm9vbGVhbiB7XHJcblx0aWYgKGNoZWNraW5nKSB7XHJcblx0XHRyZXR1cm4gcGx1Z2luLnNldHRpbmdzLndvcmtmbG93LmVuYWJsZVdvcmtmbG93ICYmIFxyXG5cdFx0XHQgICBwbHVnaW4uc2V0dGluZ3Mud29ya2Zsb3cuZGVmaW5pdGlvbnMubGVuZ3RoID4gMDtcclxuXHR9XHJcblxyXG5cdGNvbnN0IHdvcmtmbG93cyA9IHBsdWdpbi5zZXR0aW5ncy53b3JrZmxvdy5kZWZpbml0aW9ucztcclxuXHRcclxuXHRpZiAod29ya2Zsb3dzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0bmV3IE5vdGljZSh0KFwiTm8gd29ya2Zsb3dzIHRvIGR1cGxpY2F0ZVwiKSk7XHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblx0fVxyXG5cclxuXHQvLyBTaG93IHdvcmtmbG93IHNlbGVjdGlvbiBtZW51IGZvciBkdXBsaWNhdGlvblxyXG5cdGNvbnN0IG1lbnUgPSBuZXcgTWVudSgpO1xyXG5cdFxyXG5cdHdvcmtmbG93cy5mb3JFYWNoKCh3b3JrZmxvdykgPT4ge1xyXG5cdFx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdGl0ZW0uc2V0VGl0bGUodChcIkR1cGxpY2F0ZVwiKSArIFwiOiBcIiArIHdvcmtmbG93Lm5hbWUpXHJcblx0XHRcdFx0LnNldEljb24oXCJjb3B5XCIpXHJcblx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc3QgZHVwbGljYXRlZFdvcmtmbG93ID0ge1xyXG5cdFx0XHRcdFx0XHQuLi53b3JrZmxvdyxcclxuXHRcdFx0XHRcdFx0aWQ6IHdvcmtmbG93LmlkICsgXCJfY29weVwiLFxyXG5cdFx0XHRcdFx0XHRuYW1lOiB3b3JrZmxvdy5uYW1lICsgXCIgKENvcHkpXCIsXHJcblx0XHRcdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRcdFx0Li4ud29ya2Zsb3cubWV0YWRhdGEsXHJcblx0XHRcdFx0XHRcdFx0Y3JlYXRlZDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNwbGl0KFwiVFwiKVswXSxcclxuXHRcdFx0XHRcdFx0XHRsYXN0TW9kaWZpZWQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5zcGxpdChcIlRcIilbMF0sXHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdFx0Ly8gT3BlbiB0aGUgd29ya2Zsb3cgZGVmaW5pdGlvbiBtb2RhbCBmb3IgZWRpdGluZ1xyXG5cdFx0XHRcdFx0bmV3IFdvcmtmbG93RGVmaW5pdGlvbk1vZGFsKFxyXG5cdFx0XHRcdFx0XHRwbHVnaW4uYXBwLFxyXG5cdFx0XHRcdFx0XHRwbHVnaW4sXHJcblx0XHRcdFx0XHRcdGR1cGxpY2F0ZWRXb3JrZmxvdyxcclxuXHRcdFx0XHRcdFx0KGVkaXRlZFdvcmtmbG93KSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLndvcmtmbG93LmRlZmluaXRpb25zLnB1c2goZWRpdGVkV29ya2Zsb3cpO1xyXG5cdFx0XHRcdFx0XHRcdHBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHRcdFx0XHRuZXcgTm90aWNlKHQoXCJXb3JrZmxvdyBkdXBsaWNhdGVkIGFuZCBzYXZlZFwiKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdCkub3BlbigpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdG1lbnUuc2hvd0F0TW91c2VFdmVudCh3aW5kb3cuZXZlbnQgYXMgTW91c2VFdmVudCk7XHJcblx0cmV0dXJuIHRydWU7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBIZWxwZXIgZnVuY3Rpb24gdG8gcHJvbXB0IGZvciB3b3JrZmxvdyBkZXRhaWxzXHJcbiAqL1xyXG5mdW5jdGlvbiBwcm9tcHRGb3JXb3JrZmxvd0RldGFpbHMoc3RydWN0dXJlOiBhbnksIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luKSB7XHJcblx0Ly8gQ3JlYXRlIGEgc2ltcGxlIHByb21wdCBmb3Igd29ya2Zsb3cgbmFtZVxyXG5cdGNvbnN0IHdvcmtmbG93TmFtZSA9IHN0cnVjdHVyZS5jb250ZW50ICsgXCIgV29ya2Zsb3dcIjtcclxuXHRjb25zdCB3b3JrZmxvd0lkID0gd29ya2Zsb3dOYW1lXHJcblx0XHQudG9Mb3dlckNhc2UoKVxyXG5cdFx0LnJlcGxhY2UoL1teYS16MC05XFxzXS9nLCBcIlwiKVxyXG5cdFx0LnJlcGxhY2UoL1xccysvZywgXCJfXCIpXHJcblx0XHQuc3Vic3RyaW5nKDAsIDMwKTtcclxuXHJcblx0Y3JlYXRlV29ya2Zsb3dGcm9tU3RydWN0dXJlKHN0cnVjdHVyZSwgd29ya2Zsb3dOYW1lLCB3b3JrZmxvd0lkLCBwbHVnaW4pO1xyXG59XHJcblxyXG4vKipcclxuICogSGVscGVyIGZ1bmN0aW9uIHRvIGNyZWF0ZSB3b3JrZmxvdyBmcm9tIHN0cnVjdHVyZVxyXG4gKi9cclxuZnVuY3Rpb24gY3JlYXRlV29ya2Zsb3dGcm9tU3RydWN0dXJlKFxyXG5cdHN0cnVjdHVyZTogYW55LFxyXG5cdG5hbWU6IHN0cmluZyxcclxuXHRpZDogc3RyaW5nLFxyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luXHJcbikge1xyXG5cdGNvbnN0IHdvcmtmbG93ID0gY29udmVydFRhc2tTdHJ1Y3R1cmVUb1dvcmtmbG93KHN0cnVjdHVyZSwgbmFtZSwgaWQpO1xyXG5cdFxyXG5cdC8vIE9wZW4gdGhlIHdvcmtmbG93IGRlZmluaXRpb24gbW9kYWwgZm9yIHJldmlldyBhbmQgZWRpdGluZ1xyXG5cdG5ldyBXb3JrZmxvd0RlZmluaXRpb25Nb2RhbChcclxuXHRcdHBsdWdpbi5hcHAsXHJcblx0XHRwbHVnaW4sXHJcblx0XHR3b3JrZmxvdyxcclxuXHRcdChmaW5hbFdvcmtmbG93KSA9PiB7XHJcblx0XHRcdHBsdWdpbi5zZXR0aW5ncy53b3JrZmxvdy5kZWZpbml0aW9ucy5wdXNoKGZpbmFsV29ya2Zsb3cpO1xyXG5cdFx0XHRwbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdG5ldyBOb3RpY2UodChcIldvcmtmbG93IGNyZWF0ZWQgZnJvbSB0YXNrIHN0cnVjdHVyZVwiKSk7XHJcblx0XHR9XHJcblx0KS5vcGVuKCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb21tYW5kIHRvIHNob3cgd29ya2Zsb3cgcXVpY2sgYWN0aW9ucyBtZW51XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gc2hvd1dvcmtmbG93UXVpY2tBY3Rpb25zQ29tbWFuZChcclxuXHRjaGVja2luZzogYm9vbGVhbixcclxuXHRlZGl0b3I6IEVkaXRvcixcclxuXHRjdHg6IE1hcmtkb3duVmlldyB8IE1hcmtkb3duRmlsZUluZm8sXHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW5cclxuKTogYm9vbGVhbiB7XHJcblx0aWYgKGNoZWNraW5nKSB7XHJcblx0XHRyZXR1cm4gcGx1Z2luLnNldHRpbmdzLndvcmtmbG93LmVuYWJsZVdvcmtmbG93O1xyXG5cdH1cclxuXHJcblx0Y29uc3QgbWVudSA9IG5ldyBNZW51KCk7XHJcblxyXG5cdC8vIFF1aWNrIHdvcmtmbG93IGNyZWF0aW9uXHJcblx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRpdGVtLnNldFRpdGxlKHQoXCJDcmVhdGUgUXVpY2sgV29ya2Zsb3dcIikpXHJcblx0XHRcdC5zZXRJY29uKFwicGx1cy1jaXJjbGVcIilcclxuXHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdGNyZWF0ZVF1aWNrV29ya2Zsb3dDb21tYW5kKGZhbHNlLCBlZGl0b3IsIGN0eCwgcGx1Z2luKTtcclxuXHRcdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdC8vIENvbnZlcnQgdGFzayB0byB3b3JrZmxvd1xyXG5cdGNvbnN0IGN1cnNvciA9IGVkaXRvci5nZXRDdXJzb3IoKTtcclxuXHRjb25zdCBsaW5lID0gZWRpdG9yLmdldExpbmUoY3Vyc29yLmxpbmUpO1xyXG5cdGlmIChsaW5lLm1hdGNoKC9eXFxzKlstKitdIFxcWyguKVxcXS8pKSB7XHJcblx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0aXRlbS5zZXRUaXRsZSh0KFwiQ29udmVydCBUYXNrIHRvIFdvcmtmbG93XCIpKVxyXG5cdFx0XHRcdC5zZXRJY29uKFwiY29udmVydFwiKVxyXG5cdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdGNvbnZlcnRUYXNrVG9Xb3JrZmxvd0NvbW1hbmQoZmFsc2UsIGVkaXRvciwgY3R4LCBwbHVnaW4pO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aWYgKCFsaW5lLmluY2x1ZGVzKFwiI3dvcmtmbG93L1wiKSkge1xyXG5cdFx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJDb252ZXJ0IHRvIFdvcmtmbG93IFJvb3RcIikpXHJcblx0XHRcdFx0XHQuc2V0SWNvbihcIndvcmtmbG93XCIpXHJcblx0XHRcdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRcdGNvbnZlcnRUb1dvcmtmbG93Um9vdENvbW1hbmQoZmFsc2UsIGVkaXRvciwgY3R4LCBwbHVnaW4pO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gU3RhcnQgd29ya2Zsb3cgaGVyZVxyXG5cdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0aXRlbS5zZXRUaXRsZSh0KFwiU3RhcnQgV29ya2Zsb3cgSGVyZVwiKSlcclxuXHRcdFx0LnNldEljb24oXCJwbGF5XCIpXHJcblx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRzdGFydFdvcmtmbG93SGVyZUNvbW1hbmQoZmFsc2UsIGVkaXRvciwgY3R4LCBwbHVnaW4pO1xyXG5cdFx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0Ly8gRHVwbGljYXRlIHdvcmtmbG93XHJcblx0aWYgKHBsdWdpbi5zZXR0aW5ncy53b3JrZmxvdy5kZWZpbml0aW9ucy5sZW5ndGggPiAwKSB7XHJcblx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0aXRlbS5zZXRUaXRsZSh0KFwiRHVwbGljYXRlIFdvcmtmbG93XCIpKVxyXG5cdFx0XHRcdC5zZXRJY29uKFwiY29weVwiKVxyXG5cdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdGR1cGxpY2F0ZVdvcmtmbG93Q29tbWFuZChmYWxzZSwgZWRpdG9yLCBjdHgsIHBsdWdpbik7XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdG1lbnUuc2hvd0F0TW91c2VFdmVudCh3aW5kb3cuZXZlbnQgYXMgTW91c2VFdmVudCk7XHJcblx0cmV0dXJuIHRydWU7XHJcbn1cclxuIl19