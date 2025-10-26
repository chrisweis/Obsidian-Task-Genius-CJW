import { __awaiter } from "tslib";
import { Component } from "obsidian";
import { TaskListItemComponent } from "./listItem";
import { TaskTreeItemComponent } from "./treeItem";
import { t } from "@/translations/helper";
export class TaskListRendererComponent extends Component {
    constructor(parent, // Parent component to manage child lifecycle
    containerEl, // The HTML element to render tasks into
    plugin, app, context // Context identifier (e.g., "projects", "review")
    ) {
        super();
        this.parent = parent;
        this.containerEl = containerEl;
        this.plugin = plugin;
        this.app = app;
        this.context = context;
        this.taskComponents = [];
        this.treeComponents = [];
        this.allTasksMap = new Map(); // Store the full map
        // Add this renderer as a child of the parent component
        parent.addChild(this);
    }
    /**
     * Renders the list of tasks, clearing previous content by default.
     * Can optionally append tasks instead of clearing.
     * @param tasks - The list of tasks specific to this section/view.
     * @param isTreeView - Whether to render as a tree or a flat list.
     * @param allTasksMap - OPTIONAL: Map of all tasks for tree view context. Required if isTreeView is true.
     * @param emptyMessage - Message to display if tasks array is empty.
     * @param append - If true, appends tasks without clearing existing ones. Defaults to false.
     */
    renderTasks(tasks, isTreeView, allTasksMap, // Make it optional but required for tree view
    emptyMessage = t("No tasks found."), append = false) {
        if (!append) {
            this.cleanupComponents();
            this.containerEl.empty();
        }
        if (tasks.length === 0 && !append) {
            this.renderEmptyState(emptyMessage);
            return;
        }
        // Store the map if provided (primarily for tree view)
        if (allTasksMap) {
            this.allTasksMap = allTasksMap;
        }
        else if (isTreeView) {
            // Fallback: if tree view is requested but no map provided, build it from section tasks
            // This might lead to incomplete trees if parents are outside the section.
            console.warn("TaskListRendererComponent: allTasksMap not provided for tree view. Tree may be incomplete.");
            this.allTasksMap = new Map(tasks.map((task) => [task.id, task]));
        }
        if (isTreeView) {
            if (!this.allTasksMap || this.allTasksMap.size === 0) {
                console.error("TaskListRendererComponent: Cannot render tree view without allTasksMap.");
                this.renderEmptyState("Error: Task data unavailable for tree view."); // Show error
                return;
            }
            this.renderTreeView(tasks, this.allTasksMap); // Pass the map
        }
        else {
            this.renderListView(tasks);
        }
    }
    renderListView(tasks) {
        const fragment = document.createDocumentFragment();
        tasks.forEach((task) => {
            const taskComponent = new TaskListItemComponent(task, this.context, this.app, this.plugin);
            // Set up event handlers
            taskComponent.onTaskSelected = (selectedTask) => {
                if (this.onTaskSelected) {
                    this.onTaskSelected(selectedTask);
                }
            };
            taskComponent.onTaskCompleted = (completedTask) => {
                if (this.onTaskCompleted) {
                    this.onTaskCompleted(completedTask);
                }
            };
            taskComponent.onTaskUpdate = (originalTask, updatedTask) => __awaiter(this, void 0, void 0, function* () {
                console.log("TaskListRendererComponent onTaskUpdate", this.onTaskUpdate, originalTask.content, updatedTask.content);
                if (this.onTaskUpdate) {
                    console.log("TaskListRendererComponent onTaskUpdate", originalTask.content, updatedTask.content);
                    yield this.onTaskUpdate(originalTask, updatedTask);
                }
            });
            taskComponent.onTaskContextMenu = (event, task) => {
                if (this.onTaskContextMenu) {
                    this.onTaskContextMenu(event, task);
                }
            };
            // Load component and add to parent's children
            this.parent.addChild(taskComponent);
            taskComponent.load();
            // Add element to fragment
            fragment.appendChild(taskComponent.element);
            // Store for later cleanup
            this.taskComponents.push(taskComponent);
        });
        this.containerEl.appendChild(fragment);
    }
    renderTreeView(sectionTasks, allTasksMap) {
        const fragment = document.createDocumentFragment();
        const sectionTaskIds = new Set(sectionTasks.map((t) => t.id)); // IDs of tasks belonging to this section
        // --- Determine Root Tasks for Rendering ---
        // Helper function to mark subtree as processed
        const markSubtreeAsProcessed = (rootTask, sectionTaskIds, processedTaskIds) => {
            if (sectionTaskIds.has(rootTask.id)) {
                processedTaskIds.add(rootTask.id);
            }
            if (rootTask.metadata.children) {
                rootTask.metadata.children.forEach((childId) => {
                    const childTask = allTasksMap.get(childId);
                    if (childTask) {
                        markSubtreeAsProcessed(childTask, sectionTaskIds, processedTaskIds);
                    }
                });
            }
        };
        // Identify true root tasks to avoid duplicate rendering
        const rootTasksToRender = [];
        const processedTaskIds = new Set();
        for (const task of sectionTasks) {
            // Skip already processed tasks
            if (processedTaskIds.has(task.id)) {
                continue;
            }
            // Check if this is a root task (no parent or parent not in current section)
            if (!task.metadata.parent ||
                !sectionTaskIds.has(task.metadata.parent)) {
                // This is a root task
                let actualRoot = task;
                // If has parent but parent not in current section, find the complete root
                if (task.metadata.parent) {
                    let currentTask = task;
                    while (currentTask.metadata.parent &&
                        !sectionTaskIds.has(currentTask.metadata.parent)) {
                        const parentTask = allTasksMap.get(currentTask.metadata.parent);
                        if (!parentTask) {
                            console.warn(`Parent task ${currentTask.metadata.parent} not found in allTasksMap.`);
                            break;
                        }
                        actualRoot = parentTask;
                        currentTask = parentTask;
                    }
                }
                // Add root task to render list if not already added
                if (!rootTasksToRender.some((t) => t.id === actualRoot.id)) {
                    rootTasksToRender.push(actualRoot);
                }
                // Mark entire subtree as processed to avoid duplicate rendering
                markSubtreeAsProcessed(actualRoot, sectionTaskIds, processedTaskIds);
            }
        }
        // Optional: Sort root tasks (e.g., by line number)
        rootTasksToRender.sort((a, b) => a.line - b.line);
        // --- Render Tree Items ---
        rootTasksToRender.forEach((rootTask) => {
            // Find direct children of this root task using the *full* map
            const directChildren = [];
            if (rootTask.metadata.children) {
                rootTask.metadata.children.forEach((childId) => {
                    const childTask = allTasksMap.get(childId);
                    if (childTask) {
                        directChildren.push(childTask);
                    }
                    else {
                        console.warn(`Child task ${childId} (parent: ${rootTask.id}) not found in allTasksMap.`);
                    }
                });
            }
            // Optional: Sort direct children
            directChildren.sort((a, b) => a.line - b.line);
            const treeComponent = new TaskTreeItemComponent(rootTask, this.context, this.app, 0, // Root level is 0
            directChildren, // Pass the actual children from the full map
            allTasksMap, // Pass the full map for recursive building
            this.plugin);
            // Set up event handlers
            treeComponent.onTaskSelected = (selectedTask) => {
                if (this.onTaskSelected)
                    this.onTaskSelected(selectedTask);
            };
            treeComponent.onTaskCompleted = (task) => {
                if (this.onTaskCompleted)
                    this.onTaskCompleted(task);
            };
            treeComponent.onTaskUpdate = (originalTask, updatedTask) => __awaiter(this, void 0, void 0, function* () {
                if (this.onTaskUpdate) {
                    yield this.onTaskUpdate(originalTask, updatedTask);
                }
            });
            treeComponent.onTaskContextMenu = (event, task) => {
                if (this.onTaskContextMenu)
                    this.onTaskContextMenu(event, task);
            };
            this.parent.addChild(treeComponent); // Use the parent component passed in constructor
            treeComponent.load();
            fragment.appendChild(treeComponent.element);
            this.treeComponents.push(treeComponent); // Store for cleanup
        });
        this.containerEl.appendChild(fragment);
    }
    renderEmptyState(message) {
        this.containerEl.empty(); // Ensure container is empty
        const emptyEl = this.containerEl.createDiv({
            cls: `${this.context}-empty-state`, // Generic and specific class
        });
        emptyEl.setText(message);
    }
    /**
     * Updates a specific task's visual representation if it's currently rendered.
     * Now uses allTasksMap for context if needed.
     * @param updatedTask - The task data that has changed.
     */
    updateTask(updatedTask) {
        // Update the task in the stored map first
        if (this.allTasksMap.has(updatedTask.id)) {
            this.allTasksMap.set(updatedTask.id, updatedTask);
        }
        // Try updating in list view components
        const listItemComponent = this.taskComponents.find((c) => c.getTask().id === updatedTask.id);
        if (listItemComponent) {
            listItemComponent.updateTask(updatedTask);
            return;
        }
        // Try updating in tree view components
        for (const treeComp of this.treeComponents) {
            if (treeComp.getTask().id === updatedTask.id) {
                treeComp.updateTask(updatedTask);
                return;
            }
            else {
                // updateTaskRecursively is defined in TaskTreeItemComponent
                const updatedInChildren = treeComp.updateTaskRecursively(updatedTask);
                if (updatedInChildren) {
                    return;
                }
            }
        }
        // If the task wasn't found in the rendered components (e.g., it's an ancestor
        // rendered implicitly in tree view), we might not need to do anything visually here,
        // as the child component update should handle changes.
        // However, if the update could change the structure (e.g., parent link), a full re-render
        // might be safer in some cases, but let's avoid that for performance unless necessary.
    }
    /**
     * Cleans up all rendered task components (list and tree).
     * Should be called before rendering new tasks (unless appending).
     */
    cleanupComponents() {
        this.taskComponents.forEach((component) => {
            this.parent.removeChild(component); // Use parent's removeChild
        });
        this.taskComponents = [];
        this.treeComponents.forEach((component) => {
            this.parent.removeChild(component); // Use parent's removeChild
        });
        this.treeComponents = [];
    }
    onunload() {
        // Cleanup components when the renderer itself is unloaded
        this.cleanupComponents();
        // The containerEl is managed by the parent component, so we don't remove it here.
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGFza0xpc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJUYXNrTGlzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFPLFNBQVMsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUUxQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDbkQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRW5ELE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUcxQyxNQUFNLE9BQU8seUJBQTBCLFNBQVEsU0FBUztJQVd2RCxZQUNTLE1BQWlCLEVBQUUsNkNBQTZDO0lBQ2hFLFdBQXdCLEVBQUUsd0NBQXdDO0lBQ2xFLE1BQTZCLEVBQzdCLEdBQVEsRUFDUixPQUFlLENBQUMsa0RBQWtEOztRQUUxRSxLQUFLLEVBQUUsQ0FBQztRQU5BLFdBQU0sR0FBTixNQUFNLENBQVc7UUFDakIsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFDeEIsV0FBTSxHQUFOLE1BQU0sQ0FBdUI7UUFDN0IsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUNSLFlBQU8sR0FBUCxPQUFPLENBQVE7UUFmaEIsbUJBQWMsR0FBNEIsRUFBRSxDQUFDO1FBQzdDLG1CQUFjLEdBQTRCLEVBQUUsQ0FBQztRQUM3QyxnQkFBVyxHQUFzQixJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMscUJBQXFCO1FBZ0J4RSx1REFBdUQ7UUFDdkQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN2QixDQUFDO0lBRUQ7Ozs7Ozs7O09BUUc7SUFDSSxXQUFXLENBQ2pCLEtBQWEsRUFDYixVQUFtQixFQUNuQixXQUE4QixFQUFFLDhDQUE4QztJQUM5RSxlQUF1QixDQUFDLENBQUMsaUJBQWlCLENBQUMsRUFDM0MsU0FBa0IsS0FBSztRQUV2QixJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ1osSUFBSSxDQUFDLGlCQUFpQixFQUFF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UUFDMUQsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDekIsa0ZBQWtGO0lBQ25GLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcCwgQ29tcG9uZW50IH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiQC90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7IFRhc2tMaXN0SXRlbUNvbXBvbmVudCB9IGZyb20gXCIuL2xpc3RJdGVtXCI7XHJcbmltcG9ydCB7IFRhc2tUcmVlSXRlbUNvbXBvbmVudCB9IGZyb20gXCIuL3RyZWVJdGVtXCI7XHJcbmltcG9ydCB7IHRhc2tzVG9UcmVlIH0gZnJvbSBcIkAvdXRpbHMvdWkvdHJlZS12aWV3LXV0aWxzXCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBUYXNrTGlzdFJlbmRlcmVyQ29tcG9uZW50IGV4dGVuZHMgQ29tcG9uZW50IHtcclxuXHRwcml2YXRlIHRhc2tDb21wb25lbnRzOiBUYXNrTGlzdEl0ZW1Db21wb25lbnRbXSA9IFtdO1xyXG5cdHByaXZhdGUgdHJlZUNvbXBvbmVudHM6IFRhc2tUcmVlSXRlbUNvbXBvbmVudFtdID0gW107XHJcblx0cHJpdmF0ZSBhbGxUYXNrc01hcDogTWFwPHN0cmluZywgVGFzaz4gPSBuZXcgTWFwKCk7IC8vIFN0b3JlIHRoZSBmdWxsIG1hcFxyXG5cclxuXHQvLyBFdmVudCBoYW5kbGVycyB0byBiZSBzZXQgYnkgdGhlIHBhcmVudCBjb21wb25lbnRcclxuXHRwdWJsaWMgb25UYXNrU2VsZWN0ZWQ6ICh0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdHB1YmxpYyBvblRhc2tDb21wbGV0ZWQ6ICh0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdHB1YmxpYyBvblRhc2tVcGRhdGU6ICh0YXNrOiBUYXNrLCB1cGRhdGVkVGFzazogVGFzaykgPT4gUHJvbWlzZTx2b2lkPjtcclxuXHRwdWJsaWMgb25UYXNrQ29udGV4dE1lbnU6IChldmVudDogTW91c2VFdmVudCwgdGFzazogVGFzaykgPT4gdm9pZDtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwcml2YXRlIHBhcmVudDogQ29tcG9uZW50LCAvLyBQYXJlbnQgY29tcG9uZW50IHRvIG1hbmFnZSBjaGlsZCBsaWZlY3ljbGVcclxuXHRcdHByaXZhdGUgY29udGFpbmVyRWw6IEhUTUxFbGVtZW50LCAvLyBUaGUgSFRNTCBlbGVtZW50IHRvIHJlbmRlciB0YXNrcyBpbnRvXHJcblx0XHRwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0cHJpdmF0ZSBhcHA6IEFwcCxcclxuXHRcdHByaXZhdGUgY29udGV4dDogc3RyaW5nIC8vIENvbnRleHQgaWRlbnRpZmllciAoZS5nLiwgXCJwcm9qZWN0c1wiLCBcInJldmlld1wiKVxyXG5cdCkge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdC8vIEFkZCB0aGlzIHJlbmRlcmVyIGFzIGEgY2hpbGQgb2YgdGhlIHBhcmVudCBjb21wb25lbnRcclxuXHRcdHBhcmVudC5hZGRDaGlsZCh0aGlzKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbmRlcnMgdGhlIGxpc3Qgb2YgdGFza3MsIGNsZWFyaW5nIHByZXZpb3VzIGNvbnRlbnQgYnkgZGVmYXVsdC5cclxuXHQgKiBDYW4gb3B0aW9uYWxseSBhcHBlbmQgdGFza3MgaW5zdGVhZCBvZiBjbGVhcmluZy5cclxuXHQgKiBAcGFyYW0gdGFza3MgLSBUaGUgbGlzdCBvZiB0YXNrcyBzcGVjaWZpYyB0byB0aGlzIHNlY3Rpb24vdmlldy5cclxuXHQgKiBAcGFyYW0gaXNUcmVlVmlldyAtIFdoZXRoZXIgdG8gcmVuZGVyIGFzIGEgdHJlZSBvciBhIGZsYXQgbGlzdC5cclxuXHQgKiBAcGFyYW0gYWxsVGFza3NNYXAgLSBPUFRJT05BTDogTWFwIG9mIGFsbCB0YXNrcyBmb3IgdHJlZSB2aWV3IGNvbnRleHQuIFJlcXVpcmVkIGlmIGlzVHJlZVZpZXcgaXMgdHJ1ZS5cclxuXHQgKiBAcGFyYW0gZW1wdHlNZXNzYWdlIC0gTWVzc2FnZSB0byBkaXNwbGF5IGlmIHRhc2tzIGFycmF5IGlzIGVtcHR5LlxyXG5cdCAqIEBwYXJhbSBhcHBlbmQgLSBJZiB0cnVlLCBhcHBlbmRzIHRhc2tzIHdpdGhvdXQgY2xlYXJpbmcgZXhpc3Rpbmcgb25lcy4gRGVmYXVsdHMgdG8gZmFsc2UuXHJcblx0ICovXHJcblx0cHVibGljIHJlbmRlclRhc2tzKFxyXG5cdFx0dGFza3M6IFRhc2tbXSxcclxuXHRcdGlzVHJlZVZpZXc6IGJvb2xlYW4sXHJcblx0XHRhbGxUYXNrc01hcDogTWFwPHN0cmluZywgVGFzaz4sIC8vIE1ha2UgaXQgb3B0aW9uYWwgYnV0IHJlcXVpcmVkIGZvciB0cmVlIHZpZXdcclxuXHRcdGVtcHR5TWVzc2FnZTogc3RyaW5nID0gdChcIk5vIHRhc2tzIGZvdW5kLlwiKSxcclxuXHRcdGFwcGVuZDogYm9vbGVhbiA9IGZhbHNlXHJcblx0KSB7XHJcblx0XHRpZiAoIWFwcGVuZCkge1xyXG5cdFx0XHR0aGlzLmNsZWFudXBDb21wb25lbnRzKCk7XHJcblx0XHRcdHRoaXMuY29udGFpbmVyRWwuZW1wdHkoKTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAodGFza3MubGVuZ3RoID09PSAwICYmICFhcHBlbmQpIHtcclxuXHRcdFx0dGhpcy5yZW5kZXJFbXB0eVN0YXRlKGVtcHR5TWVzc2FnZSk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTdG9yZSB0aGUgbWFwIGlmIHByb3ZpZGVkIChwcmltYXJpbHkgZm9yIHRyZWUgdmlldylcclxuXHRcdGlmIChhbGxUYXNrc01hcCkge1xyXG5cdFx0XHR0aGlzLmFsbFRhc2tzTWFwID0gYWxsVGFza3NNYXA7XHJcblx0XHR9IGVsc2UgaWYgKGlzVHJlZVZpZXcpIHtcclxuXHRcdFx0Ly8gRmFsbGJhY2s6IGlmIHRyZWUgdmlldyBpcyByZXF1ZXN0ZWQgYnV0IG5vIG1hcCBwcm92aWRlZCwgYnVpbGQgaXQgZnJvbSBzZWN0aW9uIHRhc2tzXHJcblx0XHRcdC8vIFRoaXMgbWlnaHQgbGVhZCB0byBpbmNvbXBsZXRlIHRyZWVzIGlmIHBhcmVudHMgYXJlIG91dHNpZGUgdGhlIHNlY3Rpb24uXHJcblx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcIlRhc2tMaXN0UmVuZGVyZXJDb21wb25lbnQ6IGFsbFRhc2tzTWFwIG5vdCBwcm92aWRlZCBmb3IgdHJlZSB2aWV3LiBUcmVlIG1heSBiZSBpbmNvbXBsZXRlLlwiXHJcblx0XHRcdCk7XHJcblx0XHRcdHRoaXMuYWxsVGFza3NNYXAgPSBuZXcgTWFwKHRhc2tzLm1hcCgodGFzaykgPT4gW3Rhc2suaWQsIHRhc2tdKSk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKGlzVHJlZVZpZXcpIHtcclxuXHRcdFx0aWYgKCF0aGlzLmFsbFRhc2tzTWFwIHx8IHRoaXMuYWxsVGFza3NNYXAuc2l6ZSA9PT0gMCkge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXHJcblx0XHRcdFx0XHRcIlRhc2tMaXN0UmVuZGVyZXJDb21wb25lbnQ6IENhbm5vdCByZW5kZXIgdHJlZSB2aWV3IHdpdGhvdXQgYWxsVGFza3NNYXAuXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHRoaXMucmVuZGVyRW1wdHlTdGF0ZShcclxuXHRcdFx0XHRcdFwiRXJyb3I6IFRhc2sgZGF0YSB1bmF2YWlsYWJsZSBmb3IgdHJlZSB2aWV3LlwiXHJcblx0XHRcdFx0KTsgLy8gU2hvdyBlcnJvclxyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGlzLnJlbmRlclRyZWVWaWV3KHRhc2tzLCB0aGlzLmFsbFRhc2tzTWFwKTsgLy8gUGFzcyB0aGUgbWFwXHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLnJlbmRlckxpc3RWaWV3KHRhc2tzKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyTGlzdFZpZXcodGFza3M6IFRhc2tbXSkge1xyXG5cdFx0Y29uc3QgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XHJcblx0XHR0YXNrcy5mb3JFYWNoKCh0YXNrKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRhc2tDb21wb25lbnQgPSBuZXcgVGFza0xpc3RJdGVtQ29tcG9uZW50KFxyXG5cdFx0XHRcdHRhc2ssXHJcblx0XHRcdFx0dGhpcy5jb250ZXh0LFxyXG5cdFx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBTZXQgdXAgZXZlbnQgaGFuZGxlcnNcclxuXHRcdFx0dGFza0NvbXBvbmVudC5vblRhc2tTZWxlY3RlZCA9IChzZWxlY3RlZFRhc2spID0+IHtcclxuXHRcdFx0XHRpZiAodGhpcy5vblRhc2tTZWxlY3RlZCkge1xyXG5cdFx0XHRcdFx0dGhpcy5vblRhc2tTZWxlY3RlZChzZWxlY3RlZFRhc2spO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHRcdFx0dGFza0NvbXBvbmVudC5vblRhc2tDb21wbGV0ZWQgPSAoY29tcGxldGVkVGFzaykgPT4ge1xyXG5cdFx0XHRcdGlmICh0aGlzLm9uVGFza0NvbXBsZXRlZCkge1xyXG5cdFx0XHRcdFx0dGhpcy5vblRhc2tDb21wbGV0ZWQoY29tcGxldGVkVGFzayk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cdFx0XHR0YXNrQ29tcG9uZW50Lm9uVGFza1VwZGF0ZSA9IGFzeW5jIChvcmlnaW5hbFRhc2ssIHVwZGF0ZWRUYXNrKSA9PiB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcIlRhc2tMaXN0UmVuZGVyZXJDb21wb25lbnQgb25UYXNrVXBkYXRlXCIsXHJcblx0XHRcdFx0XHR0aGlzLm9uVGFza1VwZGF0ZSxcclxuXHRcdFx0XHRcdG9yaWdpbmFsVGFzay5jb250ZW50LFxyXG5cdFx0XHRcdFx0dXBkYXRlZFRhc2suY29udGVudFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0aWYgKHRoaXMub25UYXNrVXBkYXRlKSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdFx0XCJUYXNrTGlzdFJlbmRlcmVyQ29tcG9uZW50IG9uVGFza1VwZGF0ZVwiLFxyXG5cdFx0XHRcdFx0XHRvcmlnaW5hbFRhc2suY29udGVudCxcclxuXHRcdFx0XHRcdFx0dXBkYXRlZFRhc2suY29udGVudFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdGF3YWl0IHRoaXMub25UYXNrVXBkYXRlKG9yaWdpbmFsVGFzaywgdXBkYXRlZFRhc2spO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHRcdFx0dGFza0NvbXBvbmVudC5vblRhc2tDb250ZXh0TWVudSA9IChldmVudCwgdGFzaykgPT4ge1xyXG5cdFx0XHRcdGlmICh0aGlzLm9uVGFza0NvbnRleHRNZW51KSB7XHJcblx0XHRcdFx0XHR0aGlzLm9uVGFza0NvbnRleHRNZW51KGV2ZW50LCB0YXNrKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBMb2FkIGNvbXBvbmVudCBhbmQgYWRkIHRvIHBhcmVudCdzIGNoaWxkcmVuXHJcblx0XHRcdHRoaXMucGFyZW50LmFkZENoaWxkKHRhc2tDb21wb25lbnQpO1xyXG5cdFx0XHR0YXNrQ29tcG9uZW50LmxvYWQoKTtcclxuXHJcblx0XHRcdC8vIEFkZCBlbGVtZW50IHRvIGZyYWdtZW50XHJcblx0XHRcdGZyYWdtZW50LmFwcGVuZENoaWxkKHRhc2tDb21wb25lbnQuZWxlbWVudCk7XHJcblxyXG5cdFx0XHQvLyBTdG9yZSBmb3IgbGF0ZXIgY2xlYW51cFxyXG5cdFx0XHR0aGlzLnRhc2tDb21wb25lbnRzLnB1c2godGFza0NvbXBvbmVudCk7XHJcblx0XHR9KTtcclxuXHRcdHRoaXMuY29udGFpbmVyRWwuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSByZW5kZXJUcmVlVmlldyhcclxuXHRcdHNlY3Rpb25UYXNrczogVGFza1tdLFxyXG5cdFx0YWxsVGFza3NNYXA6IE1hcDxzdHJpbmcsIFRhc2s+XHJcblx0KSB7XHJcblx0XHRjb25zdCBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcclxuXHRcdGNvbnN0IHNlY3Rpb25UYXNrSWRzID0gbmV3IFNldChzZWN0aW9uVGFza3MubWFwKCh0KSA9PiB0LmlkKSk7IC8vIElEcyBvZiB0YXNrcyBiZWxvbmdpbmcgdG8gdGhpcyBzZWN0aW9uXHJcblxyXG5cdFx0Ly8gLS0tIERldGVybWluZSBSb290IFRhc2tzIGZvciBSZW5kZXJpbmcgLS0tXHJcblx0XHQvLyBIZWxwZXIgZnVuY3Rpb24gdG8gbWFyayBzdWJ0cmVlIGFzIHByb2Nlc3NlZFxyXG5cdFx0Y29uc3QgbWFya1N1YnRyZWVBc1Byb2Nlc3NlZCA9IChcclxuXHRcdFx0cm9vdFRhc2s6IFRhc2ssXHJcblx0XHRcdHNlY3Rpb25UYXNrSWRzOiBTZXQ8c3RyaW5nPixcclxuXHRcdFx0cHJvY2Vzc2VkVGFza0lkczogU2V0PHN0cmluZz5cclxuXHRcdCkgPT4ge1xyXG5cdFx0XHRpZiAoc2VjdGlvblRhc2tJZHMuaGFzKHJvb3RUYXNrLmlkKSkge1xyXG5cdFx0XHRcdHByb2Nlc3NlZFRhc2tJZHMuYWRkKHJvb3RUYXNrLmlkKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKHJvb3RUYXNrLm1ldGFkYXRhLmNoaWxkcmVuKSB7XHJcblx0XHRcdFx0cm9vdFRhc2subWV0YWRhdGEuY2hpbGRyZW4uZm9yRWFjaCgoY2hpbGRJZCkgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc3QgY2hpbGRUYXNrID0gYWxsVGFza3NNYXAuZ2V0KGNoaWxkSWQpO1xyXG5cdFx0XHRcdFx0aWYgKGNoaWxkVGFzaykge1xyXG5cdFx0XHRcdFx0XHRtYXJrU3VidHJlZUFzUHJvY2Vzc2VkKFxyXG5cdFx0XHRcdFx0XHRcdGNoaWxkVGFzayxcclxuXHRcdFx0XHRcdFx0XHRzZWN0aW9uVGFza0lkcyxcclxuXHRcdFx0XHRcdFx0XHRwcm9jZXNzZWRUYXNrSWRzXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gSWRlbnRpZnkgdHJ1ZSByb290IHRhc2tzIHRvIGF2b2lkIGR1cGxpY2F0ZSByZW5kZXJpbmdcclxuXHRcdGNvbnN0IHJvb3RUYXNrc1RvUmVuZGVyOiBUYXNrW10gPSBbXTtcclxuXHRcdGNvbnN0IHByb2Nlc3NlZFRhc2tJZHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuXHJcblx0XHRmb3IgKGNvbnN0IHRhc2sgb2Ygc2VjdGlvblRhc2tzKSB7XHJcblx0XHRcdC8vIFNraXAgYWxyZWFkeSBwcm9jZXNzZWQgdGFza3NcclxuXHRcdFx0aWYgKHByb2Nlc3NlZFRhc2tJZHMuaGFzKHRhc2suaWQpKSB7XHJcblx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENoZWNrIGlmIHRoaXMgaXMgYSByb290IHRhc2sgKG5vIHBhcmVudCBvciBwYXJlbnQgbm90IGluIGN1cnJlbnQgc2VjdGlvbilcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdCF0YXNrLm1ldGFkYXRhLnBhcmVudCB8fFxyXG5cdFx0XHRcdCFzZWN0aW9uVGFza0lkcy5oYXModGFzay5tZXRhZGF0YS5wYXJlbnQpXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdC8vIFRoaXMgaXMgYSByb290IHRhc2tcclxuXHRcdFx0XHRsZXQgYWN0dWFsUm9vdCA9IHRhc2s7XHJcblxyXG5cdFx0XHRcdC8vIElmIGhhcyBwYXJlbnQgYnV0IHBhcmVudCBub3QgaW4gY3VycmVudCBzZWN0aW9uLCBmaW5kIHRoZSBjb21wbGV0ZSByb290XHJcblx0XHRcdFx0aWYgKHRhc2subWV0YWRhdGEucGFyZW50KSB7XHJcblx0XHRcdFx0XHRsZXQgY3VycmVudFRhc2sgPSB0YXNrO1xyXG5cdFx0XHRcdFx0d2hpbGUgKFxyXG5cdFx0XHRcdFx0XHRjdXJyZW50VGFzay5tZXRhZGF0YS5wYXJlbnQgJiZcclxuXHRcdFx0XHRcdFx0IXNlY3Rpb25UYXNrSWRzLmhhcyhjdXJyZW50VGFzay5tZXRhZGF0YS5wYXJlbnQpXHJcblx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgcGFyZW50VGFzayA9IGFsbFRhc2tzTWFwLmdldChcclxuXHRcdFx0XHRcdFx0XHRjdXJyZW50VGFzay5tZXRhZGF0YS5wYXJlbnRcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0aWYgKCFwYXJlbnRUYXNrKSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0XHRcdFx0YFBhcmVudCB0YXNrICR7Y3VycmVudFRhc2subWV0YWRhdGEucGFyZW50fSBub3QgZm91bmQgaW4gYWxsVGFza3NNYXAuYFxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0YWN0dWFsUm9vdCA9IHBhcmVudFRhc2s7XHJcblx0XHRcdFx0XHRcdGN1cnJlbnRUYXNrID0gcGFyZW50VGFzaztcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIEFkZCByb290IHRhc2sgdG8gcmVuZGVyIGxpc3QgaWYgbm90IGFscmVhZHkgYWRkZWRcclxuXHRcdFx0XHRpZiAoIXJvb3RUYXNrc1RvUmVuZGVyLnNvbWUoKHQpID0+IHQuaWQgPT09IGFjdHVhbFJvb3QuaWQpKSB7XHJcblx0XHRcdFx0XHRyb290VGFza3NUb1JlbmRlci5wdXNoKGFjdHVhbFJvb3QpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gTWFyayBlbnRpcmUgc3VidHJlZSBhcyBwcm9jZXNzZWQgdG8gYXZvaWQgZHVwbGljYXRlIHJlbmRlcmluZ1xyXG5cdFx0XHRcdG1hcmtTdWJ0cmVlQXNQcm9jZXNzZWQoXHJcblx0XHRcdFx0XHRhY3R1YWxSb290LFxyXG5cdFx0XHRcdFx0c2VjdGlvblRhc2tJZHMsXHJcblx0XHRcdFx0XHRwcm9jZXNzZWRUYXNrSWRzXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIE9wdGlvbmFsOiBTb3J0IHJvb3QgdGFza3MgKGUuZy4sIGJ5IGxpbmUgbnVtYmVyKVxyXG5cdFx0cm9vdFRhc2tzVG9SZW5kZXIuc29ydCgoYSwgYikgPT4gYS5saW5lIC0gYi5saW5lKTtcclxuXHJcblx0XHQvLyAtLS0gUmVuZGVyIFRyZWUgSXRlbXMgLS0tXHJcblx0XHRyb290VGFza3NUb1JlbmRlci5mb3JFYWNoKChyb290VGFzaykgPT4ge1xyXG5cdFx0XHQvLyBGaW5kIGRpcmVjdCBjaGlsZHJlbiBvZiB0aGlzIHJvb3QgdGFzayB1c2luZyB0aGUgKmZ1bGwqIG1hcFxyXG5cdFx0XHRjb25zdCBkaXJlY3RDaGlsZHJlbjogVGFza1tdID0gW107XHJcblx0XHRcdGlmIChyb290VGFzay5tZXRhZGF0YS5jaGlsZHJlbikge1xyXG5cdFx0XHRcdHJvb3RUYXNrLm1ldGFkYXRhLmNoaWxkcmVuLmZvckVhY2goKGNoaWxkSWQ6IHN0cmluZykgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc3QgY2hpbGRUYXNrID0gYWxsVGFza3NNYXAuZ2V0KGNoaWxkSWQpO1xyXG5cdFx0XHRcdFx0aWYgKGNoaWxkVGFzaykge1xyXG5cdFx0XHRcdFx0XHRkaXJlY3RDaGlsZHJlbi5wdXNoKGNoaWxkVGFzayk7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRcdFx0YENoaWxkIHRhc2sgJHtjaGlsZElkfSAocGFyZW50OiAke3Jvb3RUYXNrLmlkfSkgbm90IGZvdW5kIGluIGFsbFRhc2tzTWFwLmBcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0XHQvLyBPcHRpb25hbDogU29ydCBkaXJlY3QgY2hpbGRyZW5cclxuXHRcdFx0ZGlyZWN0Q2hpbGRyZW4uc29ydCgoYSwgYikgPT4gYS5saW5lIC0gYi5saW5lKTtcclxuXHJcblx0XHRcdGNvbnN0IHRyZWVDb21wb25lbnQgPSBuZXcgVGFza1RyZWVJdGVtQ29tcG9uZW50KFxyXG5cdFx0XHRcdHJvb3RUYXNrLFxyXG5cdFx0XHRcdHRoaXMuY29udGV4dCxcclxuXHRcdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0XHQwLCAvLyBSb290IGxldmVsIGlzIDBcclxuXHRcdFx0XHRkaXJlY3RDaGlsZHJlbiwgLy8gUGFzcyB0aGUgYWN0dWFsIGNoaWxkcmVuIGZyb20gdGhlIGZ1bGwgbWFwXHJcblx0XHRcdFx0YWxsVGFza3NNYXAsIC8vIFBhc3MgdGhlIGZ1bGwgbWFwIGZvciByZWN1cnNpdmUgYnVpbGRpbmdcclxuXHRcdFx0XHR0aGlzLnBsdWdpblxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gU2V0IHVwIGV2ZW50IGhhbmRsZXJzXHJcblx0XHRcdHRyZWVDb21wb25lbnQub25UYXNrU2VsZWN0ZWQgPSAoc2VsZWN0ZWRUYXNrKSA9PiB7XHJcblx0XHRcdFx0aWYgKHRoaXMub25UYXNrU2VsZWN0ZWQpIHRoaXMub25UYXNrU2VsZWN0ZWQoc2VsZWN0ZWRUYXNrKTtcclxuXHRcdFx0fTtcclxuXHRcdFx0dHJlZUNvbXBvbmVudC5vblRhc2tDb21wbGV0ZWQgPSAodGFzaykgPT4ge1xyXG5cdFx0XHRcdGlmICh0aGlzLm9uVGFza0NvbXBsZXRlZCkgdGhpcy5vblRhc2tDb21wbGV0ZWQodGFzayk7XHJcblx0XHRcdH07XHJcblx0XHRcdHRyZWVDb21wb25lbnQub25UYXNrVXBkYXRlID0gYXN5bmMgKG9yaWdpbmFsVGFzaywgdXBkYXRlZFRhc2spID0+IHtcclxuXHRcdFx0XHRpZiAodGhpcy5vblRhc2tVcGRhdGUpIHtcclxuXHRcdFx0XHRcdGF3YWl0IHRoaXMub25UYXNrVXBkYXRlKG9yaWdpbmFsVGFzaywgdXBkYXRlZFRhc2spO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHRcdFx0dHJlZUNvbXBvbmVudC5vblRhc2tDb250ZXh0TWVudSA9IChldmVudCwgdGFzaykgPT4ge1xyXG5cdFx0XHRcdGlmICh0aGlzLm9uVGFza0NvbnRleHRNZW51KSB0aGlzLm9uVGFza0NvbnRleHRNZW51KGV2ZW50LCB0YXNrKTtcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHRoaXMucGFyZW50LmFkZENoaWxkKHRyZWVDb21wb25lbnQpOyAvLyBVc2UgdGhlIHBhcmVudCBjb21wb25lbnQgcGFzc2VkIGluIGNvbnN0cnVjdG9yXHJcblx0XHRcdHRyZWVDb21wb25lbnQubG9hZCgpO1xyXG5cdFx0XHRmcmFnbWVudC5hcHBlbmRDaGlsZCh0cmVlQ29tcG9uZW50LmVsZW1lbnQpO1xyXG5cdFx0XHR0aGlzLnRyZWVDb21wb25lbnRzLnB1c2godHJlZUNvbXBvbmVudCk7IC8vIFN0b3JlIGZvciBjbGVhbnVwXHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLmFwcGVuZENoaWxkKGZyYWdtZW50KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyRW1wdHlTdGF0ZShtZXNzYWdlOiBzdHJpbmcpIHtcclxuXHRcdHRoaXMuY29udGFpbmVyRWwuZW1wdHkoKTsgLy8gRW5zdXJlIGNvbnRhaW5lciBpcyBlbXB0eVxyXG5cdFx0Y29uc3QgZW1wdHlFbCA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBgJHt0aGlzLmNvbnRleHR9LWVtcHR5LXN0YXRlYCwgLy8gR2VuZXJpYyBhbmQgc3BlY2lmaWMgY2xhc3NcclxuXHRcdH0pO1xyXG5cdFx0ZW1wdHlFbC5zZXRUZXh0KG1lc3NhZ2UpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlcyBhIHNwZWNpZmljIHRhc2sncyB2aXN1YWwgcmVwcmVzZW50YXRpb24gaWYgaXQncyBjdXJyZW50bHkgcmVuZGVyZWQuXHJcblx0ICogTm93IHVzZXMgYWxsVGFza3NNYXAgZm9yIGNvbnRleHQgaWYgbmVlZGVkLlxyXG5cdCAqIEBwYXJhbSB1cGRhdGVkVGFzayAtIFRoZSB0YXNrIGRhdGEgdGhhdCBoYXMgY2hhbmdlZC5cclxuXHQgKi9cclxuXHRwdWJsaWMgdXBkYXRlVGFzayh1cGRhdGVkVGFzazogVGFzaykge1xyXG5cdFx0Ly8gVXBkYXRlIHRoZSB0YXNrIGluIHRoZSBzdG9yZWQgbWFwIGZpcnN0XHJcblx0XHRpZiAodGhpcy5hbGxUYXNrc01hcC5oYXModXBkYXRlZFRhc2suaWQpKSB7XHJcblx0XHRcdHRoaXMuYWxsVGFza3NNYXAuc2V0KHVwZGF0ZWRUYXNrLmlkLCB1cGRhdGVkVGFzayk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVHJ5IHVwZGF0aW5nIGluIGxpc3QgdmlldyBjb21wb25lbnRzXHJcblx0XHRjb25zdCBsaXN0SXRlbUNvbXBvbmVudCA9IHRoaXMudGFza0NvbXBvbmVudHMuZmluZChcclxuXHRcdFx0KGMpID0+IGMuZ2V0VGFzaygpLmlkID09PSB1cGRhdGVkVGFzay5pZFxyXG5cdFx0KTtcclxuXHRcdGlmIChsaXN0SXRlbUNvbXBvbmVudCkge1xyXG5cdFx0XHRsaXN0SXRlbUNvbXBvbmVudC51cGRhdGVUYXNrKHVwZGF0ZWRUYXNrKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFRyeSB1cGRhdGluZyBpbiB0cmVlIHZpZXcgY29tcG9uZW50c1xyXG5cdFx0Zm9yIChjb25zdCB0cmVlQ29tcCBvZiB0aGlzLnRyZWVDb21wb25lbnRzKSB7XHJcblx0XHRcdGlmICh0cmVlQ29tcC5nZXRUYXNrKCkuaWQgPT09IHVwZGF0ZWRUYXNrLmlkKSB7XHJcblx0XHRcdFx0dHJlZUNvbXAudXBkYXRlVGFzayh1cGRhdGVkVGFzayk7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIHVwZGF0ZVRhc2tSZWN1cnNpdmVseSBpcyBkZWZpbmVkIGluIFRhc2tUcmVlSXRlbUNvbXBvbmVudFxyXG5cdFx0XHRcdGNvbnN0IHVwZGF0ZWRJbkNoaWxkcmVuID1cclxuXHRcdFx0XHRcdHRyZWVDb21wLnVwZGF0ZVRhc2tSZWN1cnNpdmVseSh1cGRhdGVkVGFzayk7XHJcblx0XHRcdFx0aWYgKHVwZGF0ZWRJbkNoaWxkcmVuKSB7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSWYgdGhlIHRhc2sgd2Fzbid0IGZvdW5kIGluIHRoZSByZW5kZXJlZCBjb21wb25lbnRzIChlLmcuLCBpdCdzIGFuIGFuY2VzdG9yXHJcblx0XHQvLyByZW5kZXJlZCBpbXBsaWNpdGx5IGluIHRyZWUgdmlldyksIHdlIG1pZ2h0IG5vdCBuZWVkIHRvIGRvIGFueXRoaW5nIHZpc3VhbGx5IGhlcmUsXHJcblx0XHQvLyBhcyB0aGUgY2hpbGQgY29tcG9uZW50IHVwZGF0ZSBzaG91bGQgaGFuZGxlIGNoYW5nZXMuXHJcblx0XHQvLyBIb3dldmVyLCBpZiB0aGUgdXBkYXRlIGNvdWxkIGNoYW5nZSB0aGUgc3RydWN0dXJlIChlLmcuLCBwYXJlbnQgbGluayksIGEgZnVsbCByZS1yZW5kZXJcclxuXHRcdC8vIG1pZ2h0IGJlIHNhZmVyIGluIHNvbWUgY2FzZXMsIGJ1dCBsZXQncyBhdm9pZCB0aGF0IGZvciBwZXJmb3JtYW5jZSB1bmxlc3MgbmVjZXNzYXJ5LlxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2xlYW5zIHVwIGFsbCByZW5kZXJlZCB0YXNrIGNvbXBvbmVudHMgKGxpc3QgYW5kIHRyZWUpLlxyXG5cdCAqIFNob3VsZCBiZSBjYWxsZWQgYmVmb3JlIHJlbmRlcmluZyBuZXcgdGFza3MgKHVubGVzcyBhcHBlbmRpbmcpLlxyXG5cdCAqL1xyXG5cdHB1YmxpYyBjbGVhbnVwQ29tcG9uZW50cygpIHtcclxuXHRcdHRoaXMudGFza0NvbXBvbmVudHMuZm9yRWFjaCgoY29tcG9uZW50KSA9PiB7XHJcblx0XHRcdHRoaXMucGFyZW50LnJlbW92ZUNoaWxkKGNvbXBvbmVudCk7IC8vIFVzZSBwYXJlbnQncyByZW1vdmVDaGlsZFxyXG5cdFx0fSk7XHJcblx0XHR0aGlzLnRhc2tDb21wb25lbnRzID0gW107XHJcblxyXG5cdFx0dGhpcy50cmVlQ29tcG9uZW50cy5mb3JFYWNoKChjb21wb25lbnQpID0+IHtcclxuXHRcdFx0dGhpcy5wYXJlbnQucmVtb3ZlQ2hpbGQoY29tcG9uZW50KTsgLy8gVXNlIHBhcmVudCdzIHJlbW92ZUNoaWxkXHJcblx0XHR9KTtcclxuXHRcdHRoaXMudHJlZUNvbXBvbmVudHMgPSBbXTtcclxuXHR9XHJcblxyXG5cdG9udW5sb2FkKCkge1xyXG5cdFx0Ly8gQ2xlYW51cCBjb21wb25lbnRzIHdoZW4gdGhlIHJlbmRlcmVyIGl0c2VsZiBpcyB1bmxvYWRlZFxyXG5cdFx0dGhpcy5jbGVhbnVwQ29tcG9uZW50cygpO1xyXG5cdFx0Ly8gVGhlIGNvbnRhaW5lckVsIGlzIG1hbmFnZWQgYnkgdGhlIHBhcmVudCBjb21wb25lbnQsIHNvIHdlIGRvbid0IHJlbW92ZSBpdCBoZXJlLlxyXG5cdH1cclxufVxyXG4iXX0=