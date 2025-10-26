import { Component } from "obsidian";
import { TreeComponent } from "@/components/ui/tree/TreeComponent";
import { buildProjectTreeFromTasks, findNodeByPath } from "@/core/project-tree-builder";
/**
 * Project tree component for hierarchical project display
 */
export class ProjectTreeComponent extends Component {
    constructor(parentEl, app, plugin) {
        super();
        this.parentEl = parentEl;
        this.app = app;
        this.plugin = plugin;
        this.projectTree = null;
        this.allTasks = [];
    }
    onload() {
        // Create tree component with project-specific configuration
        this.treeComponent = new TreeComponent(this.parentEl, {
            classPrefix: 'project-tree',
            indentSize: 24,
            showToggle: true,
            enableSelection: true,
            enableMultiSelect: true,
            stateKey: 'task-genius-project-tree-state',
            autoExpandLevel: 1,
            renderContent: (node, contentEl) => {
                // Project name
                const nameEl = contentEl.createSpan({
                    cls: "project-tree-item-name",
                    text: node.name
                });
                // Task count badges
                const countsEl = contentEl.createSpan({
                    cls: "project-tree-item-counts"
                });
                // Calculate completed count for this node
                const calculateCompletedCount = (taskIds) => {
                    let completed = 0;
                    taskIds.forEach(taskId => {
                        const task = this.allTasks.find(t => t.id === taskId);
                        if (task && this.isTaskCompleted(task)) {
                            completed++;
                        }
                    });
                    return completed;
                };
                // Direct task count
                if (node.data.directTaskCount > 0) {
                    const directCompleted = calculateCompletedCount(node.data.directTaskIds);
                    const directCountEl = countsEl.createSpan({
                        cls: "project-tree-item-count-direct",
                    });
                    if (this.plugin.settings.addProgressBarToProjectsView) {
                        directCountEl.setText(`${directCompleted}/${node.data.directTaskCount}`);
                        directCountEl.dataset.completed = directCompleted.toString();
                        directCountEl.dataset.total = node.data.directTaskCount.toString();
                        if (directCompleted === node.data.directTaskCount) {
                            directCountEl.classList.add("all-completed");
                        }
                        else if (directCompleted > 0) {
                            directCountEl.classList.add("partially-completed");
                        }
                    }
                    else {
                        directCountEl.setText(node.data.directTaskCount.toString());
                    }
                }
                // Total task count (if has children)
                if (node.children.length > 0 && node.data.totalTaskCount > node.data.directTaskCount) {
                    const totalCompleted = calculateCompletedCount(node.data.allTaskIds);
                    const totalCountEl = countsEl.createSpan({
                        cls: "project-tree-item-count-total",
                    });
                    if (this.plugin.settings.addProgressBarToProjectsView) {
                        totalCountEl.setText(`${totalCompleted}/${node.data.totalTaskCount}`);
                        totalCountEl.dataset.completed = totalCompleted.toString();
                        totalCountEl.dataset.total = node.data.totalTaskCount.toString();
                        if (totalCompleted === node.data.totalTaskCount) {
                            totalCountEl.classList.add("all-completed");
                        }
                        else if (totalCompleted > 0) {
                            totalCountEl.classList.add("partially-completed");
                        }
                    }
                    else {
                        totalCountEl.setText(node.data.totalTaskCount.toString());
                    }
                }
            },
            iconResolver: (node) => {
                // Use different icons based on node state
                if (node.children.length > 0) {
                    return node.isExpanded ? "folder-open" : "folder";
                }
                return "file";
            },
            onNodeSelected: (selectedNodes) => {
                // Get tasks for selected nodes
                const tasks = this.getTasksForSelection(selectedNodes);
                // Trigger event
                if (this.onNodeSelected) {
                    this.onNodeSelected(selectedNodes, tasks);
                }
            },
            onMultiSelectToggled: (isMultiSelect) => {
                if (this.onMultiSelectToggled) {
                    this.onMultiSelectToggled(isMultiSelect);
                }
            }
        });
        this.addChild(this.treeComponent);
        this.treeComponent.load();
    }
    /**
     * Build tree from tasks
     */
    buildTree(tasks) {
        this.allTasks = tasks;
        // Build project tree
        const separator = this.plugin.settings.projectPathSeparator || "/";
        this.projectTree = buildProjectTreeFromTasks(tasks, separator);
        // Set tree in component
        if (this.projectTree) {
            this.treeComponent.setTree(this.projectTree);
        }
    }
    /**
     * Set the project tree directly (instead of building from tasks)
     */
    setTree(tree, tasks) {
        this.projectTree = tree;
        this.allTasks = tasks;
        // Set tree in component
        this.treeComponent.setTree(tree);
    }
    /**
     * Check if a task is completed based on plugin settings
     */
    isTaskCompleted(task) {
        var _a, _b, _c, _d, _e, _f, _g;
        // If task is marked as completed in the task object
        if (task.completed) {
            return true;
        }
        const mark = task.status;
        if (!mark) {
            return false;
        }
        // Priority 1: If useOnlyCountMarks is enabled
        if ((_a = this.plugin) === null || _a === void 0 ? void 0 : _a.settings.useOnlyCountMarks) {
            const onlyCountMarks = ((_c = (_b = this.plugin) === null || _b === void 0 ? void 0 : _b.settings.onlyCountTaskMarks) === null || _c === void 0 ? void 0 : _c.split("|")) || [];
            return onlyCountMarks.includes(mark);
        }
        // Priority 2: If the mark is in excludeTaskMarks, don't count it
        if (((_d = this.plugin) === null || _d === void 0 ? void 0 : _d.settings.excludeTaskMarks) &&
            this.plugin.settings.excludeTaskMarks.includes(mark)) {
            return false;
        }
        // Priority 3: Check against the task statuses
        const completedMarks = ((_g = (_f = (_e = this.plugin) === null || _e === void 0 ? void 0 : _e.settings.taskStatuses) === null || _f === void 0 ? void 0 : _f.completed) === null || _g === void 0 ? void 0 : _g.split("|")) || [
            "x",
            "X",
        ];
        return completedMarks.includes(mark);
    }
    /**
     * Get tasks for current selection (includes child nodes)
     */
    getTasksForSelection(selectedNodes) {
        if (!this.projectTree || selectedNodes.size === 0) {
            return [];
        }
        // Collect all task IDs from selected nodes and their children
        const taskIds = new Set();
        for (const nodePath of selectedNodes) {
            const node = findNodeByPath(this.projectTree, nodePath);
            if (node) {
                // Add all tasks from this node (includes children)
                node.data.allTaskIds.forEach(id => taskIds.add(id));
            }
        }
        // Filter tasks by collected IDs
        return this.allTasks.filter(task => taskIds.has(task.id));
    }
    /**
     * Set multi-select mode
     */
    setMultiSelectMode(enabled) {
        this.treeComponent.setMultiSelectMode(enabled);
    }
    /**
     * Get selected paths
     */
    getSelectedPaths() {
        return this.treeComponent.getSelectedPaths();
    }
    /**
     * Set selected paths
     */
    setSelectedPaths(paths) {
        this.treeComponent.setSelectedPaths(paths);
    }
    /**
     * Clear selection
     */
    clearSelection() {
        this.treeComponent.clearSelection();
    }
    /**
     * Expand all nodes
     */
    expandAll() {
        this.treeComponent.expandAll();
    }
    /**
     * Collapse all nodes
     */
    collapseAll() {
        this.treeComponent.collapseAll();
    }
    onunload() {
        // The tree component will be cleaned up automatically
        // as it's added as a child component
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUHJvamVjdFRyZWVDb21wb25lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJQcm9qZWN0VHJlZUNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFPLE1BQU0sVUFBVSxDQUFDO0FBRTFDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUVuRSxPQUFPLEVBQ04seUJBQXlCLEVBQ3pCLGNBQWMsRUFFZCxNQUFNLDZCQUE2QixDQUFDO0FBR3JDOztHQUVHO0FBQ0gsTUFBTSxPQUFPLG9CQUFxQixTQUFRLFNBQVM7SUFTbEQsWUFDUyxRQUFxQixFQUNyQixHQUFRLEVBQ1IsTUFBNkI7UUFFckMsS0FBSyxFQUFFLENBQUM7UUFKQSxhQUFRLEdBQVIsUUFBUSxDQUFhO1FBQ3JCLFFBQUcsR0FBSCxHQUFHLENBQUs7UUFDUixXQUFNLEdBQU4sTUFBTSxDQUF1QjtRQVY5QixnQkFBVyxHQUFxQyxJQUFJLENBQUM7UUFDckQsYUFBUSxHQUFXLEVBQUUsQ0FBQztJQVk5QixDQUFDO0lBRUQsTUFBTTtRQUNMLDREQUE0RDtRQUM1RCxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksYUFBYSxDQUNyQyxJQUFJLENBQUMsUUFBUSxFQUNiO1lBQ0MsV0FBVyxFQUFFLGNBQWM7WUFDM0IsVUFBVSxFQUFFLEVBQUU7WUFDZCxVQUFVLEVBQUUsSUFBSTtZQUNoQixlQUFlLEVBQUUsSUFBSTtZQUNyQixpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLFFBQVEsRUFBRSxnQ0FBZ0M7WUFDMUMsZUFBZSxFQUFFLENBQUM7WUFFbEIsYUFBYSxFQUFFLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxFQUFFO2dCQUNsQyxlQUFlO2dCQUNmLE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUM7b0JBQ25DLEdBQUcsRUFBRSx3QkFBd0I7b0JBQzdCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtpQkFD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REFBbUQ7Z0JBQ25ELElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzthQUNwRDtTQUNEO1FBRUQsZ0NBQWdDO1FBQ2hDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFFRDs7T0FFRztJQUNJLGtCQUFrQixDQUFDLE9BQWdCO1FBQ3pDLElBQUksQ0FBQyxhQUFhLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDaEQsQ0FBQztJQUVEOztPQUVHO0lBQ0ksZ0JBQWdCO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0lBQzlDLENBQUM7SUFFRDs7T0FFRztJQUNJLGdCQUFnQixDQUFDLEtBQWtCO1FBQ3pDLElBQUksQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVEOztPQUVHO0lBQ0ksY0FBYztRQUNwQixJQUFJLENBQUMsYUFBYSxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ3JDLENBQUM7SUFFRDs7T0FFRztJQUNJLFNBQVM7UUFDZixJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ2hDLENBQUM7SUFFRDs7T0FFRztJQUNJLFdBQVc7UUFDakIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUNsQyxDQUFDO0lBRUQsUUFBUTtRQUNQLHNEQUFzRDtRQUN0RCxxQ0FBcUM7SUFDdEMsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBBcHAgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgVHJlZU5vZGUsIFByb2plY3ROb2RlRGF0YSB9IGZyb20gXCJAL3R5cGVzL3RyZWVcIjtcclxuaW1wb3J0IHsgVHJlZUNvbXBvbmVudCB9IGZyb20gXCJAL2NvbXBvbmVudHMvdWkvdHJlZS9UcmVlQ29tcG9uZW50XCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiQC90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7IFxyXG5cdGJ1aWxkUHJvamVjdFRyZWVGcm9tVGFza3MsIFxyXG5cdGZpbmROb2RlQnlQYXRoLCBcclxuXHRnZXRBbGxEZXNjZW5kYW50c1xyXG59IGZyb20gXCJAL2NvcmUvcHJvamVjdC10cmVlLWJ1aWxkZXJcIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5cclxuLyoqXHJcbiAqIFByb2plY3QgdHJlZSBjb21wb25lbnQgZm9yIGhpZXJhcmNoaWNhbCBwcm9qZWN0IGRpc3BsYXlcclxuICovXHJcbmV4cG9ydCBjbGFzcyBQcm9qZWN0VHJlZUNvbXBvbmVudCBleHRlbmRzIENvbXBvbmVudCB7XHJcblx0cHJpdmF0ZSB0cmVlQ29tcG9uZW50OiBUcmVlQ29tcG9uZW50PFByb2plY3ROb2RlRGF0YT47XHJcblx0cHJpdmF0ZSBwcm9qZWN0VHJlZTogVHJlZU5vZGU8UHJvamVjdE5vZGVEYXRhPiB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgYWxsVGFza3M6IFRhc2tbXSA9IFtdO1xyXG5cdFxyXG5cdC8vIEV2ZW50c1xyXG5cdHB1YmxpYyBvbk5vZGVTZWxlY3RlZD86IChzZWxlY3RlZE5vZGVzOiBTZXQ8c3RyaW5nPiwgdGFza3M6IFRhc2tbXSkgPT4gdm9pZDtcclxuXHRwdWJsaWMgb25NdWx0aVNlbGVjdFRvZ2dsZWQ/OiAoaXNNdWx0aVNlbGVjdDogYm9vbGVhbikgPT4gdm9pZDtcclxuXHRcclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHByaXZhdGUgcGFyZW50RWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0cHJpdmF0ZSBhcHA6IEFwcCxcclxuXHRcdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW5cclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0fVxyXG5cdFxyXG5cdG9ubG9hZCgpOiB2b2lkIHtcclxuXHRcdC8vIENyZWF0ZSB0cmVlIGNvbXBvbmVudCB3aXRoIHByb2plY3Qtc3BlY2lmaWMgY29uZmlndXJhdGlvblxyXG5cdFx0dGhpcy50cmVlQ29tcG9uZW50ID0gbmV3IFRyZWVDb21wb25lbnQ8UHJvamVjdE5vZGVEYXRhPihcclxuXHRcdFx0dGhpcy5wYXJlbnRFbCxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNsYXNzUHJlZml4OiAncHJvamVjdC10cmVlJyxcclxuXHRcdFx0XHRpbmRlbnRTaXplOiAyNCwgLy8g5L2/55So56iN5aSn55qE57yp6L+b5Lul6YCC5bqU6aG555uu5bGC57qnXHJcblx0XHRcdFx0c2hvd1RvZ2dsZTogdHJ1ZSxcclxuXHRcdFx0XHRlbmFibGVTZWxlY3Rpb246IHRydWUsXHJcblx0XHRcdFx0ZW5hYmxlTXVsdGlTZWxlY3Q6IHRydWUsXHJcblx0XHRcdFx0c3RhdGVLZXk6ICd0YXNrLWdlbml1cy1wcm9qZWN0LXRyZWUtc3RhdGUnLFxyXG5cdFx0XHRcdGF1dG9FeHBhbmRMZXZlbDogMSxcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRyZW5kZXJDb250ZW50OiAobm9kZSwgY29udGVudEVsKSA9PiB7XHJcblx0XHRcdFx0XHQvLyBQcm9qZWN0IG5hbWVcclxuXHRcdFx0XHRcdGNvbnN0IG5hbWVFbCA9IGNvbnRlbnRFbC5jcmVhdGVTcGFuKHtcclxuXHRcdFx0XHRcdFx0Y2xzOiBcInByb2plY3QtdHJlZS1pdGVtLW5hbWVcIixcclxuXHRcdFx0XHRcdFx0dGV4dDogbm9kZS5uYW1lXHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0Ly8gVGFzayBjb3VudCBiYWRnZXNcclxuXHRcdFx0XHRcdGNvbnN0IGNvdW50c0VsID0gY29udGVudEVsLmNyZWF0ZVNwYW4oe1xyXG5cdFx0XHRcdFx0XHRjbHM6IFwicHJvamVjdC10cmVlLWl0ZW0tY291bnRzXCJcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0XHQvLyBDYWxjdWxhdGUgY29tcGxldGVkIGNvdW50IGZvciB0aGlzIG5vZGVcclxuXHRcdFx0XHRcdGNvbnN0IGNhbGN1bGF0ZUNvbXBsZXRlZENvdW50ID0gKHRhc2tJZHM6IFNldDxzdHJpbmc+KSA9PiB7XHJcblx0XHRcdFx0XHRcdGxldCBjb21wbGV0ZWQgPSAwO1xyXG5cdFx0XHRcdFx0XHR0YXNrSWRzLmZvckVhY2godGFza0lkID0+IHtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCB0YXNrID0gdGhpcy5hbGxUYXNrcy5maW5kKHQgPT4gdC5pZCA9PT0gdGFza0lkKTtcclxuXHRcdFx0XHRcdFx0XHRpZiAodGFzayAmJiB0aGlzLmlzVGFza0NvbXBsZXRlZCh0YXNrKSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29tcGxldGVkKys7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIGNvbXBsZXRlZDtcclxuXHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdC8vIERpcmVjdCB0YXNrIGNvdW50XHJcblx0XHRcdFx0XHRpZiAobm9kZS5kYXRhLmRpcmVjdFRhc2tDb3VudCA+IDApIHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgZGlyZWN0Q29tcGxldGVkID0gY2FsY3VsYXRlQ29tcGxldGVkQ291bnQobm9kZS5kYXRhLmRpcmVjdFRhc2tJZHMpO1xyXG5cdFx0XHRcdFx0XHRjb25zdCBkaXJlY3RDb3VudEVsID0gY291bnRzRWwuY3JlYXRlU3Bhbih7XHJcblx0XHRcdFx0XHRcdFx0Y2xzOiBcInByb2plY3QtdHJlZS1pdGVtLWNvdW50LWRpcmVjdFwiLFxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5hZGRQcm9ncmVzc0JhclRvUHJvamVjdHNWaWV3KSB7XHJcblx0XHRcdFx0XHRcdFx0ZGlyZWN0Q291bnRFbC5zZXRUZXh0KGAke2RpcmVjdENvbXBsZXRlZH0vJHtub2RlLmRhdGEuZGlyZWN0VGFza0NvdW50fWApO1xyXG5cdFx0XHRcdFx0XHRcdGRpcmVjdENvdW50RWwuZGF0YXNldC5jb21wbGV0ZWQgPSBkaXJlY3RDb21wbGV0ZWQudG9TdHJpbmcoKTtcclxuXHRcdFx0XHRcdFx0XHRkaXJlY3RDb3VudEVsLmRhdGFzZXQudG90YWwgPSBub2RlLmRhdGEuZGlyZWN0VGFza0NvdW50LnRvU3RyaW5nKCk7XHJcblx0XHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdFx0aWYgKGRpcmVjdENvbXBsZXRlZCA9PT0gbm9kZS5kYXRhLmRpcmVjdFRhc2tDb3VudCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0ZGlyZWN0Q291bnRFbC5jbGFzc0xpc3QuYWRkKFwiYWxsLWNvbXBsZXRlZFwiKTtcclxuXHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKGRpcmVjdENvbXBsZXRlZCA+IDApIHtcclxuXHRcdFx0XHRcdFx0XHRcdGRpcmVjdENvdW50RWwuY2xhc3NMaXN0LmFkZChcInBhcnRpYWxseS1jb21wbGV0ZWRcIik7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdGRpcmVjdENvdW50RWwuc2V0VGV4dChub2RlLmRhdGEuZGlyZWN0VGFza0NvdW50LnRvU3RyaW5nKCkpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdC8vIFRvdGFsIHRhc2sgY291bnQgKGlmIGhhcyBjaGlsZHJlbilcclxuXHRcdFx0XHRcdGlmIChub2RlLmNoaWxkcmVuLmxlbmd0aCA+IDAgJiYgbm9kZS5kYXRhLnRvdGFsVGFza0NvdW50ID4gbm9kZS5kYXRhLmRpcmVjdFRhc2tDb3VudCkge1xyXG5cdFx0XHRcdFx0XHRjb25zdCB0b3RhbENvbXBsZXRlZCA9IGNhbGN1bGF0ZUNvbXBsZXRlZENvdW50KG5vZGUuZGF0YS5hbGxUYXNrSWRzKTtcclxuXHRcdFx0XHRcdFx0Y29uc3QgdG90YWxDb3VudEVsID0gY291bnRzRWwuY3JlYXRlU3Bhbih7XHJcblx0XHRcdFx0XHRcdFx0Y2xzOiBcInByb2plY3QtdHJlZS1pdGVtLWNvdW50LXRvdGFsXCIsXHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0aWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmFkZFByb2dyZXNzQmFyVG9Qcm9qZWN0c1ZpZXcpIHtcclxuXHRcdFx0XHRcdFx0XHR0b3RhbENvdW50RWwuc2V0VGV4dChgJHt0b3RhbENvbXBsZXRlZH0vJHtub2RlLmRhdGEudG90YWxUYXNrQ291bnR9YCk7XHJcblx0XHRcdFx0XHRcdFx0dG90YWxDb3VudEVsLmRhdGFzZXQuY29tcGxldGVkID0gdG90YWxDb21wbGV0ZWQudG9TdHJpbmcoKTtcclxuXHRcdFx0XHRcdFx0XHR0b3RhbENvdW50RWwuZGF0YXNldC50b3RhbCA9IG5vZGUuZGF0YS50b3RhbFRhc2tDb3VudC50b1N0cmluZygpO1xyXG5cdFx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHRcdGlmICh0b3RhbENvbXBsZXRlZCA9PT0gbm9kZS5kYXRhLnRvdGFsVGFza0NvdW50KSB7XHJcblx0XHRcdFx0XHRcdFx0XHR0b3RhbENvdW50RWwuY2xhc3NMaXN0LmFkZChcImFsbC1jb21wbGV0ZWRcIik7XHJcblx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmICh0b3RhbENvbXBsZXRlZCA+IDApIHtcclxuXHRcdFx0XHRcdFx0XHRcdHRvdGFsQ291bnRFbC5jbGFzc0xpc3QuYWRkKFwicGFydGlhbGx5LWNvbXBsZXRlZFwiKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0dG90YWxDb3VudEVsLnNldFRleHQobm9kZS5kYXRhLnRvdGFsVGFza0NvdW50LnRvU3RyaW5nKCkpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRpY29uUmVzb2x2ZXI6IChub2RlKSA9PiB7XHJcblx0XHRcdFx0XHQvLyBVc2UgZGlmZmVyZW50IGljb25zIGJhc2VkIG9uIG5vZGUgc3RhdGVcclxuXHRcdFx0XHRcdGlmIChub2RlLmNoaWxkcmVuLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIG5vZGUuaXNFeHBhbmRlZCA/IFwiZm9sZGVyLW9wZW5cIiA6IFwiZm9sZGVyXCI7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRyZXR1cm4gXCJmaWxlXCI7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRvbk5vZGVTZWxlY3RlZDogKHNlbGVjdGVkTm9kZXMpID0+IHtcclxuXHRcdFx0XHRcdC8vIEdldCB0YXNrcyBmb3Igc2VsZWN0ZWQgbm9kZXNcclxuXHRcdFx0XHRcdGNvbnN0IHRhc2tzID0gdGhpcy5nZXRUYXNrc0ZvclNlbGVjdGlvbihzZWxlY3RlZE5vZGVzKTtcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0Ly8gVHJpZ2dlciBldmVudFxyXG5cdFx0XHRcdFx0aWYgKHRoaXMub25Ob2RlU2VsZWN0ZWQpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5vbk5vZGVTZWxlY3RlZChzZWxlY3RlZE5vZGVzLCB0YXNrcyk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRvbk11bHRpU2VsZWN0VG9nZ2xlZDogKGlzTXVsdGlTZWxlY3QpID0+IHtcclxuXHRcdFx0XHRcdGlmICh0aGlzLm9uTXVsdGlTZWxlY3RUb2dnbGVkKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMub25NdWx0aVNlbGVjdFRvZ2dsZWQoaXNNdWx0aVNlbGVjdCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cdFx0XHJcblx0XHR0aGlzLmFkZENoaWxkKHRoaXMudHJlZUNvbXBvbmVudCk7XHJcblx0XHR0aGlzLnRyZWVDb21wb25lbnQubG9hZCgpO1xyXG5cdH1cclxuXHRcclxuXHQvKipcclxuXHQgKiBCdWlsZCB0cmVlIGZyb20gdGFza3NcclxuXHQgKi9cclxuXHRwdWJsaWMgYnVpbGRUcmVlKHRhc2tzOiBUYXNrW10pOiB2b2lkIHtcclxuXHRcdHRoaXMuYWxsVGFza3MgPSB0YXNrcztcclxuXHRcdFxyXG5cdFx0Ly8gQnVpbGQgcHJvamVjdCB0cmVlXHJcblx0XHRjb25zdCBzZXBhcmF0b3IgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0UGF0aFNlcGFyYXRvciB8fCBcIi9cIjtcclxuXHRcdHRoaXMucHJvamVjdFRyZWUgPSBidWlsZFByb2plY3RUcmVlRnJvbVRhc2tzKHRhc2tzLCBzZXBhcmF0b3IpO1xyXG5cdFx0XHJcblx0XHQvLyBTZXQgdHJlZSBpbiBjb21wb25lbnRcclxuXHRcdGlmICh0aGlzLnByb2plY3RUcmVlKSB7XHJcblx0XHRcdHRoaXMudHJlZUNvbXBvbmVudC5zZXRUcmVlKHRoaXMucHJvamVjdFRyZWUpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRcclxuXHQvKipcclxuXHQgKiBTZXQgdGhlIHByb2plY3QgdHJlZSBkaXJlY3RseSAoaW5zdGVhZCBvZiBidWlsZGluZyBmcm9tIHRhc2tzKVxyXG5cdCAqL1xyXG5cdHB1YmxpYyBzZXRUcmVlKHRyZWU6IFRyZWVOb2RlPFByb2plY3ROb2RlRGF0YT4sIHRhc2tzOiBUYXNrW10pOiB2b2lkIHtcclxuXHRcdHRoaXMucHJvamVjdFRyZWUgPSB0cmVlO1xyXG5cdFx0dGhpcy5hbGxUYXNrcyA9IHRhc2tzO1xyXG5cdFx0XHJcblx0XHQvLyBTZXQgdHJlZSBpbiBjb21wb25lbnRcclxuXHRcdHRoaXMudHJlZUNvbXBvbmVudC5zZXRUcmVlKHRyZWUpO1xyXG5cdH1cclxuXHRcclxuXHQvKipcclxuXHQgKiBDaGVjayBpZiBhIHRhc2sgaXMgY29tcGxldGVkIGJhc2VkIG9uIHBsdWdpbiBzZXR0aW5nc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgaXNUYXNrQ29tcGxldGVkKHRhc2s6IFRhc2spOiBib29sZWFuIHtcclxuXHRcdC8vIElmIHRhc2sgaXMgbWFya2VkIGFzIGNvbXBsZXRlZCBpbiB0aGUgdGFzayBvYmplY3RcclxuXHRcdGlmICh0YXNrLmNvbXBsZXRlZCkge1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBtYXJrID0gdGFzay5zdGF0dXM7XHJcblx0XHRpZiAoIW1hcmspIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFByaW9yaXR5IDE6IElmIHVzZU9ubHlDb3VudE1hcmtzIGlzIGVuYWJsZWRcclxuXHRcdGlmICh0aGlzLnBsdWdpbj8uc2V0dGluZ3MudXNlT25seUNvdW50TWFya3MpIHtcclxuXHRcdFx0Y29uc3Qgb25seUNvdW50TWFya3MgPVxyXG5cdFx0XHRcdHRoaXMucGx1Z2luPy5zZXR0aW5ncy5vbmx5Q291bnRUYXNrTWFya3M/LnNwbGl0KFwifFwiKSB8fCBbXTtcclxuXHRcdFx0cmV0dXJuIG9ubHlDb3VudE1hcmtzLmluY2x1ZGVzKG1hcmspO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFByaW9yaXR5IDI6IElmIHRoZSBtYXJrIGlzIGluIGV4Y2x1ZGVUYXNrTWFya3MsIGRvbid0IGNvdW50IGl0XHJcblx0XHRpZiAoXHJcblx0XHRcdHRoaXMucGx1Z2luPy5zZXR0aW5ncy5leGNsdWRlVGFza01hcmtzICYmXHJcblx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLmV4Y2x1ZGVUYXNrTWFya3MuaW5jbHVkZXMobWFyaylcclxuXHRcdCkge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUHJpb3JpdHkgMzogQ2hlY2sgYWdhaW5zdCB0aGUgdGFzayBzdGF0dXNlc1xyXG5cdFx0Y29uc3QgY29tcGxldGVkTWFya3MgPVxyXG5cdFx0XHR0aGlzLnBsdWdpbj8uc2V0dGluZ3MudGFza1N0YXR1c2VzPy5jb21wbGV0ZWQ/LnNwbGl0KFwifFwiKSB8fCBbXHJcblx0XHRcdFx0XCJ4XCIsXHJcblx0XHRcdFx0XCJYXCIsXHJcblx0XHRcdF07XHJcblx0XHRyZXR1cm4gY29tcGxldGVkTWFya3MuaW5jbHVkZXMobWFyayk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgdGFza3MgZm9yIGN1cnJlbnQgc2VsZWN0aW9uIChpbmNsdWRlcyBjaGlsZCBub2RlcylcclxuXHQgKi9cclxuXHRwcml2YXRlIGdldFRhc2tzRm9yU2VsZWN0aW9uKHNlbGVjdGVkTm9kZXM6IFNldDxzdHJpbmc+KTogVGFza1tdIHtcclxuXHRcdGlmICghdGhpcy5wcm9qZWN0VHJlZSB8fCBzZWxlY3RlZE5vZGVzLnNpemUgPT09IDApIHtcclxuXHRcdFx0cmV0dXJuIFtdO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvLyBDb2xsZWN0IGFsbCB0YXNrIElEcyBmcm9tIHNlbGVjdGVkIG5vZGVzIGFuZCB0aGVpciBjaGlsZHJlblxyXG5cdFx0Y29uc3QgdGFza0lkcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG5cdFx0XHJcblx0XHRmb3IgKGNvbnN0IG5vZGVQYXRoIG9mIHNlbGVjdGVkTm9kZXMpIHtcclxuXHRcdFx0Y29uc3Qgbm9kZSA9IGZpbmROb2RlQnlQYXRoKHRoaXMucHJvamVjdFRyZWUsIG5vZGVQYXRoKTtcclxuXHRcdFx0aWYgKG5vZGUpIHtcclxuXHRcdFx0XHQvLyBBZGQgYWxsIHRhc2tzIGZyb20gdGhpcyBub2RlIChpbmNsdWRlcyBjaGlsZHJlbilcclxuXHRcdFx0XHRub2RlLmRhdGEuYWxsVGFza0lkcy5mb3JFYWNoKGlkID0+IHRhc2tJZHMuYWRkKGlkKSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Ly8gRmlsdGVyIHRhc2tzIGJ5IGNvbGxlY3RlZCBJRHNcclxuXHRcdHJldHVybiB0aGlzLmFsbFRhc2tzLmZpbHRlcih0YXNrID0+IHRhc2tJZHMuaGFzKHRhc2suaWQpKTtcclxuXHR9XHJcblx0XHJcblx0LyoqXHJcblx0ICogU2V0IG11bHRpLXNlbGVjdCBtb2RlXHJcblx0ICovXHJcblx0cHVibGljIHNldE11bHRpU2VsZWN0TW9kZShlbmFibGVkOiBib29sZWFuKTogdm9pZCB7XHJcblx0XHR0aGlzLnRyZWVDb21wb25lbnQuc2V0TXVsdGlTZWxlY3RNb2RlKGVuYWJsZWQpO1xyXG5cdH1cclxuXHRcclxuXHQvKipcclxuXHQgKiBHZXQgc2VsZWN0ZWQgcGF0aHNcclxuXHQgKi9cclxuXHRwdWJsaWMgZ2V0U2VsZWN0ZWRQYXRocygpOiBTZXQ8c3RyaW5nPiB7XHJcblx0XHRyZXR1cm4gdGhpcy50cmVlQ29tcG9uZW50LmdldFNlbGVjdGVkUGF0aHMoKTtcclxuXHR9XHJcblx0XHJcblx0LyoqXHJcblx0ICogU2V0IHNlbGVjdGVkIHBhdGhzXHJcblx0ICovXHJcblx0cHVibGljIHNldFNlbGVjdGVkUGF0aHMocGF0aHM6IFNldDxzdHJpbmc+KTogdm9pZCB7XHJcblx0XHR0aGlzLnRyZWVDb21wb25lbnQuc2V0U2VsZWN0ZWRQYXRocyhwYXRocyk7XHJcblx0fVxyXG5cdFxyXG5cdC8qKlxyXG5cdCAqIENsZWFyIHNlbGVjdGlvblxyXG5cdCAqL1xyXG5cdHB1YmxpYyBjbGVhclNlbGVjdGlvbigpOiB2b2lkIHtcclxuXHRcdHRoaXMudHJlZUNvbXBvbmVudC5jbGVhclNlbGVjdGlvbigpO1xyXG5cdH1cclxuXHRcclxuXHQvKipcclxuXHQgKiBFeHBhbmQgYWxsIG5vZGVzXHJcblx0ICovXHJcblx0cHVibGljIGV4cGFuZEFsbCgpOiB2b2lkIHtcclxuXHRcdHRoaXMudHJlZUNvbXBvbmVudC5leHBhbmRBbGwoKTtcclxuXHR9XHJcblx0XHJcblx0LyoqXHJcblx0ICogQ29sbGFwc2UgYWxsIG5vZGVzXHJcblx0ICovXHJcblx0cHVibGljIGNvbGxhcHNlQWxsKCk6IHZvaWQge1xyXG5cdFx0dGhpcy50cmVlQ29tcG9uZW50LmNvbGxhcHNlQWxsKCk7XHJcblx0fVxyXG5cdFxyXG5cdG9udW5sb2FkKCk6IHZvaWQge1xyXG5cdFx0Ly8gVGhlIHRyZWUgY29tcG9uZW50IHdpbGwgYmUgY2xlYW5lZCB1cCBhdXRvbWF0aWNhbGx5XHJcblx0XHQvLyBhcyBpdCdzIGFkZGVkIGFzIGEgY2hpbGQgY29tcG9uZW50XHJcblx0fVxyXG59Il19