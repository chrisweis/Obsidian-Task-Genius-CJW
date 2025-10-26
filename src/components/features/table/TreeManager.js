import { Component } from "obsidian";
import { sortTasks } from "@/commands/sortTaskCommands";
import { t } from "@/translations/helper";
/**
 * Tree manager component responsible for handling hierarchical task display
 */
export class TreeManager extends Component {
    constructor(columns, pluginSettings) {
        super();
        this.expandedNodes = new Set();
        this.treeNodes = new Map();
        this.columns = [];
        this.currentSortField = "";
        this.currentSortOrder = "asc";
        this.columns = columns;
        this.pluginSettings = pluginSettings;
    }
    onload() {
        // Initialize tree manager
    }
    onunload() {
        this.cleanup();
    }
    /**
     * Update columns configuration
     */
    updateColumns(columns) {
        this.columns = columns;
    }
    /**
     * Build tree structure from flat task list with sorting support
     */
    buildTreeRows(tasks, sortField, sortOrder) {
        // Update sort parameters if provided
        if (sortField !== undefined) {
            this.currentSortField = sortField;
        }
        if (sortOrder !== undefined) {
            this.currentSortOrder = sortOrder;
        }
        // First, build the tree structure
        const rootNodes = this.buildTreeStructure(tasks);
        // Then, flatten it into table rows with proper hierarchy
        const rows = [];
        this.flattenTreeNodes(rootNodes, rows, 0);
        return rows;
    }
    /**
     * Build tree structure from tasks
     */
    buildTreeStructure(tasks) {
        this.treeNodes.clear();
        const taskMap = new Map();
        const rootNodes = [];
        // Create task map for quick lookup
        tasks.forEach((task) => {
            taskMap.set(task.id, task);
        });
        // Create tree nodes
        tasks.forEach((task) => {
            const node = {
                task,
                children: [],
                level: 0,
                expanded: this.expandedNodes.has(task.id),
            };
            this.treeNodes.set(task.id, node);
        });
        // Build parent-child relationships
        tasks.forEach((task) => {
            const node = this.treeNodes.get(task.id);
            if (!node)
                return;
            if (task.metadata.parent &&
                this.treeNodes.has(task.metadata.parent)) {
                // This task has a parent
                const parentNode = this.treeNodes.get(task.metadata.parent);
                if (parentNode) {
                    parentNode.children.push(node);
                    node.parent = parentNode;
                }
            }
            else {
                // This is a root node
                rootNodes.push(node);
            }
        });
        // Calculate levels
        this.calculateLevels(rootNodes, 0);
        // Sort tree nodes recursively using centralized sorting function
        this.sortTreeNodes(rootNodes);
        return rootNodes;
    }
    /**
     * Calculate levels for tree nodes
     */
    calculateLevels(nodes, level) {
        nodes.forEach((node) => {
            node.level = level;
            if (node.children.length > 0) {
                this.calculateLevels(node.children, level + 1);
            }
        });
    }
    /**
     * Sort tree nodes recursively using centralized sorting function
     */
    sortTreeNodes(nodes) {
        if (nodes.length === 0)
            return;
        // Extract tasks from nodes for sorting
        const tasks = nodes.map((node) => node.task);
        // Apply sorting using centralized function
        let sortedTasks;
        if (!this.currentSortField || !this.pluginSettings) {
            // Default sorting: priority desc, then creation date desc
            const defaultCriteria = [
                { field: "priority", order: "desc" },
                { field: "createdDate", order: "desc" },
            ];
            sortedTasks = this.pluginSettings
                ? sortTasks(tasks, defaultCriteria, this.pluginSettings)
                : this.fallbackSort(tasks);
        }
        else {
            // Apply the specified sorting
            const sortCriteria = [
                {
                    field: this.currentSortField,
                    order: this.currentSortOrder,
                },
            ];
            sortedTasks = sortTasks(tasks, sortCriteria, this.pluginSettings);
        }
        // Reorder nodes based on sorted tasks
        const taskToNodeMap = new Map();
        nodes.forEach((node) => {
            taskToNodeMap.set(node.task.id, node);
        });
        // Clear the original nodes array and repopulate with sorted order
        nodes.length = 0;
        sortedTasks.forEach((task) => {
            const node = taskToNodeMap.get(task.id);
            if (node) {
                nodes.push(node);
            }
        });
        // Recursively sort children with the same criteria
        nodes.forEach((node) => {
            if (node.children.length > 0) {
                this.sortTreeNodes(node.children);
            }
        });
    }
    /**
     * Fallback sorting when plugin settings are not available
     */
    fallbackSort(tasks) {
        return [...tasks].sort((a, b) => {
            var _a, _b, _c, _d, _e, _f;
            // 优先级比较（高优先级在前）
            const priorityDiff = ((_a = b.metadata.priority) !== null && _a !== void 0 ? _a : 0) - ((_b = a.metadata.priority) !== null && _b !== void 0 ? _b : 0);
            if (priorityDiff !== 0) {
                return priorityDiff;
            }
            // 创建日期比较（新任务在前）
            const createdDiff = ((_c = b.metadata.createdDate) !== null && _c !== void 0 ? _c : 0) - ((_d = a.metadata.createdDate) !== null && _d !== void 0 ? _d : 0);
            if (createdDiff !== 0) {
                return createdDiff;
            }
            // 如果优先级和创建日期都相同，按内容字母顺序排序
            const contentA = ((_e = a.content) === null || _e === void 0 ? void 0 : _e.trim()) || "";
            const contentB = ((_f = b.content) === null || _f === void 0 ? void 0 : _f.trim()) || "";
            return contentA.localeCompare(contentB);
        });
    }
    /**
     * Flatten tree nodes into table rows
     */
    flattenTreeNodes(nodes, rows, level) {
        nodes.forEach((node) => {
            // Create table row for this node
            const row = {
                id: node.task.id,
                task: node.task,
                level: node.level,
                expanded: node.expanded,
                hasChildren: node.children.length > 0,
                cells: this.createCellsForNode(node, rows.length + 1),
            };
            rows.push(row);
            // If node is expanded and has children, add children recursively
            if (node.expanded && node.children.length > 0) {
                this.flattenTreeNodes(node.children, rows, level + 1);
            }
        });
    }
    /**
     * Create table cells for a tree node using the same logic as TableView
     */
    createCellsForNode(node, rowNumber) {
        const task = node.task;
        return this.columns.map((column) => {
            var _a, _b, _c;
            let value;
            let displayValue;
            switch (column.id) {
                case "rowNumber":
                    value = rowNumber;
                    displayValue = rowNumber.toString();
                    break;
                case "status":
                    value = task.status;
                    displayValue = this.formatStatus(task.status);
                    break;
                case "content":
                    value = task.content;
                    displayValue = task.content;
                    break;
                case "priority":
                    const metadata = task.metadata || {};
                    value = metadata.priority;
                    displayValue = this.formatPriority(metadata.priority);
                    break;
                case "dueDate":
                    const metadataDue = task.metadata || {};
                    value = metadataDue.dueDate;
                    displayValue = this.formatDate(metadataDue.dueDate);
                    break;
                case "startDate":
                    const metadataStart = task.metadata || {};
                    value = metadataStart.startDate;
                    displayValue = this.formatDate(metadataStart.startDate);
                    break;
                case "scheduledDate":
                    const metadataScheduled = task.metadata || {};
                    value = metadataScheduled.scheduledDate;
                    displayValue = this.formatDate(metadataScheduled.scheduledDate);
                    break;
                case "createdDate":
                    value = task.metadata.createdDate;
                    displayValue = this.formatDate(task.metadata.createdDate);
                    break;
                case "completedDate":
                    value = task.metadata.completedDate;
                    displayValue = this.formatDate(task.metadata.completedDate);
                    break;
                case "tags":
                    value = task.metadata.tags;
                    displayValue = ((_a = task.metadata.tags) === null || _a === void 0 ? void 0 : _a.join(", ")) || "";
                    break;
                case "project":
                    value = task.metadata.project;
                    displayValue = task.metadata.project || "";
                    break;
                case "context":
                    value = task.metadata.context;
                    displayValue = task.metadata.context || "";
                    break;
                case "recurrence":
                    value = task.metadata.recurrence;
                    displayValue = task.metadata.recurrence || "";
                    break;
                case "estimatedTime":
                    value = task.metadata.estimatedTime;
                    displayValue =
                        ((_b = task.metadata.estimatedTime) === null || _b === void 0 ? void 0 : _b.toString()) || "";
                    break;
                case "actualTime":
                    value = task.metadata.actualTime;
                    displayValue = ((_c = task.metadata.actualTime) === null || _c === void 0 ? void 0 : _c.toString()) || "";
                    break;
                case "filePath":
                    value = task.filePath;
                    displayValue = this.formatFilePath(task.filePath);
                    break;
                default:
                    value = "";
                    displayValue = "";
            }
            return {
                columnId: column.id,
                value: value,
                displayValue: displayValue,
                editable: column.id !== "rowNumber" && column.id !== "filePath",
            };
        });
    }
    /**
     * Toggle node expansion
     */
    toggleNodeExpansion(taskId) {
        const node = this.treeNodes.get(taskId);
        if (!node || node.children.length === 0) {
            return false;
        }
        node.expanded = !node.expanded;
        if (node.expanded) {
            this.expandedNodes.add(taskId);
        }
        else {
            this.expandedNodes.delete(taskId);
        }
        return true;
    }
    /**
     * Expand all nodes
     */
    expandAll() {
        this.treeNodes.forEach((node, taskId) => {
            if (node.children.length > 0) {
                node.expanded = true;
                this.expandedNodes.add(taskId);
            }
        });
    }
    /**
     * Collapse all nodes
     */
    collapseAll() {
        this.treeNodes.forEach((node, taskId) => {
            node.expanded = false;
            this.expandedNodes.delete(taskId);
        });
    }
    /**
     * Get expanded state of a node
     */
    isNodeExpanded(taskId) {
        return this.expandedNodes.has(taskId);
    }
    /**
     * Get all descendant task IDs for a given task
     */
    getDescendantIds(taskId) {
        const node = this.treeNodes.get(taskId);
        if (!node)
            return [];
        const descendants = [];
        this.collectDescendantIds(node, descendants);
        return descendants;
    }
    /**
     * Recursively collect descendant IDs
     */
    collectDescendantIds(node, descendants) {
        node.children.forEach((child) => {
            descendants.push(child.task.id);
            this.collectDescendantIds(child, descendants);
        });
    }
    /**
     * Get parent task ID for a given task
     */
    getParentId(taskId) {
        var _a;
        const node = this.treeNodes.get(taskId);
        return ((_a = node === null || node === void 0 ? void 0 : node.parent) === null || _a === void 0 ? void 0 : _a.task.id) || null;
    }
    /**
     * Get all sibling task IDs for a given task
     */
    getSiblingIds(taskId) {
        const node = this.treeNodes.get(taskId);
        if (!node)
            return [];
        const siblings = node.parent ? node.parent.children : [];
        return siblings
            .filter((sibling) => sibling.task.id !== taskId)
            .map((sibling) => sibling.task.id);
    }
    /**
     * Check if a task can be moved to a new parent
     */
    canMoveTask(taskId, newParentId) {
        // Can't move to itself
        if (taskId === newParentId)
            return false;
        // Can't move to one of its descendants
        if (newParentId &&
            this.getDescendantIds(taskId).includes(newParentId)) {
            return false;
        }
        return true;
    }
    /**
     * Move a task to a new parent
     */
    moveTask(taskId, newParentId) {
        if (!this.canMoveTask(taskId, newParentId)) {
            return false;
        }
        const node = this.treeNodes.get(taskId);
        if (!node)
            return false;
        // Remove from current parent
        if (node.parent) {
            const index = node.parent.children.indexOf(node);
            if (index > -1) {
                node.parent.children.splice(index, 1);
            }
        }
        // Add to new parent
        if (newParentId) {
            const newParent = this.treeNodes.get(newParentId);
            if (newParent) {
                newParent.children.push(node);
                node.parent = newParent;
            }
        }
        else {
            node.parent = undefined;
        }
        // Update task's parent property
        node.task.metadata.parent = newParentId || undefined;
        return true;
    }
    // Formatting methods (same as TableView)
    formatStatus(status) {
        const statusMap = {
            " ": t("Not Started"),
            x: t("Completed"),
            X: t("Completed"),
            "/": t("In Progress"),
            ">": t("In Progress"),
            "-": t("Abandoned"),
            "?": t("Planned"),
        };
        return statusMap[status] || status;
    }
    formatPriority(priority) {
        if (!priority)
            return "";
        const priorityMap = {
            5: t("Highest"),
            4: t("High"),
            3: t("Medium"),
            2: t("Low"),
            1: t("Lowest"),
        };
        return priorityMap[priority] || priority.toString();
    }
    formatDate(timestamp) {
        if (!timestamp)
            return "";
        return new Date(timestamp).toLocaleDateString();
    }
    formatFilePath(filePath) {
        // Extract just the filename
        const parts = filePath.split("/");
        return parts[parts.length - 1].replace(/\.md$/, "");
    }
    /**
     * Clean up resources
     */
    cleanup() {
        this.expandedNodes.clear();
        this.treeNodes.clear();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHJlZU1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJUcmVlTWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBSXJDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN4RCxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFMUM7O0dBRUc7QUFDSCxNQUFNLE9BQU8sV0FBWSxTQUFRLFNBQVM7SUFRekMsWUFBWSxPQUFzQixFQUFFLGNBQW9CO1FBQ3ZELEtBQUssRUFBRSxDQUFDO1FBUkQsa0JBQWEsR0FBZ0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUN2QyxjQUFTLEdBQTBCLElBQUksR0FBRyxFQUFFLENBQUM7UUFDN0MsWUFBTyxHQUFrQixFQUFFLENBQUM7UUFDNUIscUJBQWdCLEdBQVcsRUFBRSxDQUFDO1FBQzlCLHFCQUFnQixHQUFtQixLQUFLLENBQUM7UUFLaEQsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFDdkIsSUFBSSxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUM7SUFDdEMsQ0FBQztJQUVELE1BQU07UUFDTCwwQkFBMEI7SUFDM0IsQ0FBQztJQUVELFFBQVE7UUFDUCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDaEIsQ0FBQztJQUVEOztPQUVHO0lBQ0ksYUFBYSxDQUFDLE9BQXNCO1FBQzFDLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO0lBQ3hCLENBQUM7SUFFRDs7T0FFRztJQUNJLGFBQWEsQ0FDbkIsS0FBYSxFQUNiLFNBQWtCLEVBQ2xCLFNBQTBCO1FBRTFCLHFDQUFxQztRQUNyQyxJQUFJLFNBQVMsS0FBSyxTQUFTLEVBQUU7WUFDNUIsSUFBSSxDQUFDLGdCQUFnQixHQUFHLFNBQVMsQ0FBQztTQUNsQztRQUNELElBQUksU0FBUyxLQUFLLFNBQVMsRUFBRTtZ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Q0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lBRUQ7O09BRUc7SUFDSyxPQUFPO1FBQ2QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUMzQixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3hCLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbXBvbmVudCB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBUYXNrIH0gZnJvbSBcIkAvdHlwZXMvdGFza1wiO1xyXG5pbXBvcnQgeyBUcmVlTm9kZSwgVGFibGVSb3csIFRhYmxlQ2VsbCwgVGFibGVDb2x1bW4gfSBmcm9tIFwiLi9UYWJsZVR5cGVzXCI7XHJcbmltcG9ydCB7IFNvcnRDcml0ZXJpb24gfSBmcm9tIFwiQC9jb21tb24vc2V0dGluZy1kZWZpbml0aW9uXCI7XHJcbmltcG9ydCB7IHNvcnRUYXNrcyB9IGZyb20gXCJAL2NvbW1hbmRzL3NvcnRUYXNrQ29tbWFuZHNcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuXHJcbi8qKlxyXG4gKiBUcmVlIG1hbmFnZXIgY29tcG9uZW50IHJlc3BvbnNpYmxlIGZvciBoYW5kbGluZyBoaWVyYXJjaGljYWwgdGFzayBkaXNwbGF5XHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgVHJlZU1hbmFnZXIgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdHByaXZhdGUgZXhwYW5kZWROb2RlczogU2V0PHN0cmluZz4gPSBuZXcgU2V0KCk7XHJcblx0cHJpdmF0ZSB0cmVlTm9kZXM6IE1hcDxzdHJpbmcsIFRyZWVOb2RlPiA9IG5ldyBNYXAoKTtcclxuXHRwcml2YXRlIGNvbHVtbnM6IFRhYmxlQ29sdW1uW10gPSBbXTtcclxuXHRwcml2YXRlIGN1cnJlbnRTb3J0RmllbGQ6IHN0cmluZyA9IFwiXCI7XHJcblx0cHJpdmF0ZSBjdXJyZW50U29ydE9yZGVyOiBcImFzY1wiIHwgXCJkZXNjXCIgPSBcImFzY1wiO1xyXG5cdHByaXZhdGUgcGx1Z2luU2V0dGluZ3M6IGFueTsgLy8gUGx1Z2luIHNldHRpbmdzIGZvciBzb3J0aW5nXHJcblxyXG5cdGNvbnN0cnVjdG9yKGNvbHVtbnM6IFRhYmxlQ29sdW1uW10sIHBsdWdpblNldHRpbmdzPzogYW55KSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5jb2x1bW5zID0gY29sdW1ucztcclxuXHRcdHRoaXMucGx1Z2luU2V0dGluZ3MgPSBwbHVnaW5TZXR0aW5ncztcclxuXHR9XHJcblxyXG5cdG9ubG9hZCgpIHtcclxuXHRcdC8vIEluaXRpYWxpemUgdHJlZSBtYW5hZ2VyXHJcblx0fVxyXG5cclxuXHRvbnVubG9hZCgpIHtcclxuXHRcdHRoaXMuY2xlYW51cCgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIGNvbHVtbnMgY29uZmlndXJhdGlvblxyXG5cdCAqL1xyXG5cdHB1YmxpYyB1cGRhdGVDb2x1bW5zKGNvbHVtbnM6IFRhYmxlQ29sdW1uW10pIHtcclxuXHRcdHRoaXMuY29sdW1ucyA9IGNvbHVtbnM7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBCdWlsZCB0cmVlIHN0cnVjdHVyZSBmcm9tIGZsYXQgdGFzayBsaXN0IHdpdGggc29ydGluZyBzdXBwb3J0XHJcblx0ICovXHJcblx0cHVibGljIGJ1aWxkVHJlZVJvd3MoXHJcblx0XHR0YXNrczogVGFza1tdLFxyXG5cdFx0c29ydEZpZWxkPzogc3RyaW5nLFxyXG5cdFx0c29ydE9yZGVyPzogXCJhc2NcIiB8IFwiZGVzY1wiXHJcblx0KTogVGFibGVSb3dbXSB7XHJcblx0XHQvLyBVcGRhdGUgc29ydCBwYXJhbWV0ZXJzIGlmIHByb3ZpZGVkXHJcblx0XHRpZiAoc29ydEZpZWxkICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0dGhpcy5jdXJyZW50U29ydEZpZWxkID0gc29ydEZpZWxkO1xyXG5cdFx0fVxyXG5cdFx0aWYgKHNvcnRPcmRlciAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdHRoaXMuY3VycmVudFNvcnRPcmRlciA9IHNvcnRPcmRlcjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBGaXJzdCwgYnVpbGQgdGhlIHRyZWUgc3RydWN0dXJlXHJcblx0XHRjb25zdCByb290Tm9kZXMgPSB0aGlzLmJ1aWxkVHJlZVN0cnVjdHVyZSh0YXNrcyk7XHJcblxyXG5cdFx0Ly8gVGhlbiwgZmxhdHRlbiBpdCBpbnRvIHRhYmxlIHJvd3Mgd2l0aCBwcm9wZXIgaGllcmFyY2h5XHJcblx0XHRjb25zdCByb3dzOiBUYWJsZVJvd1tdID0gW107XHJcblx0XHR0aGlzLmZsYXR0ZW5UcmVlTm9kZXMocm9vdE5vZGVzLCByb3dzLCAwKTtcclxuXHJcblx0XHRyZXR1cm4gcm93cztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEJ1aWxkIHRyZWUgc3RydWN0dXJlIGZyb20gdGFza3NcclxuXHQgKi9cclxuXHRwcml2YXRlIGJ1aWxkVHJlZVN0cnVjdHVyZSh0YXNrczogVGFza1tdKTogVHJlZU5vZGVbXSB7XHJcblx0XHR0aGlzLnRyZWVOb2Rlcy5jbGVhcigpO1xyXG5cdFx0Y29uc3QgdGFza01hcCA9IG5ldyBNYXA8c3RyaW5nLCBUYXNrPigpO1xyXG5cdFx0Y29uc3Qgcm9vdE5vZGVzOiBUcmVlTm9kZVtdID0gW107XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIHRhc2sgbWFwIGZvciBxdWljayBsb29rdXBcclxuXHRcdHRhc2tzLmZvckVhY2goKHRhc2spID0+IHtcclxuXHRcdFx0dGFza01hcC5zZXQodGFzay5pZCwgdGFzayk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDcmVhdGUgdHJlZSBub2Rlc1xyXG5cdFx0dGFza3MuZm9yRWFjaCgodGFzaykgPT4ge1xyXG5cdFx0XHRjb25zdCBub2RlOiBUcmVlTm9kZSA9IHtcclxuXHRcdFx0XHR0YXNrLFxyXG5cdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRsZXZlbDogMCxcclxuXHRcdFx0XHRleHBhbmRlZDogdGhpcy5leHBhbmRlZE5vZGVzLmhhcyh0YXNrLmlkKSxcclxuXHRcdFx0fTtcclxuXHRcdFx0dGhpcy50cmVlTm9kZXMuc2V0KHRhc2suaWQsIG5vZGUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQnVpbGQgcGFyZW50LWNoaWxkIHJlbGF0aW9uc2hpcHNcclxuXHRcdHRhc2tzLmZvckVhY2goKHRhc2spID0+IHtcclxuXHRcdFx0Y29uc3Qgbm9kZSA9IHRoaXMudHJlZU5vZGVzLmdldCh0YXNrLmlkKTtcclxuXHRcdFx0aWYgKCFub2RlKSByZXR1cm47XHJcblxyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0dGFzay5tZXRhZGF0YS5wYXJlbnQgJiZcclxuXHRcdFx0XHR0aGlzLnRyZWVOb2Rlcy5oYXModGFzay5tZXRhZGF0YS5wYXJlbnQpXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdC8vIFRoaXMgdGFzayBoYXMgYSBwYXJlbnRcclxuXHRcdFx0XHRjb25zdCBwYXJlbnROb2RlID0gdGhpcy50cmVlTm9kZXMuZ2V0KHRhc2subWV0YWRhdGEucGFyZW50KTtcclxuXHRcdFx0XHRpZiAocGFyZW50Tm9kZSkge1xyXG5cdFx0XHRcdFx0cGFyZW50Tm9kZS5jaGlsZHJlbi5wdXNoKG5vZGUpO1xyXG5cdFx0XHRcdFx0bm9kZS5wYXJlbnQgPSBwYXJlbnROb2RlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBUaGlzIGlzIGEgcm9vdCBub2RlXHJcblx0XHRcdFx0cm9vdE5vZGVzLnB1c2gobm9kZSk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIENhbGN1bGF0ZSBsZXZlbHNcclxuXHRcdHRoaXMuY2FsY3VsYXRlTGV2ZWxzKHJvb3ROb2RlcywgMCk7XHJcblxyXG5cdFx0Ly8gU29ydCB0cmVlIG5vZGVzIHJlY3Vyc2l2ZWx5IHVzaW5nIGNlbnRyYWxpemVkIHNvcnRpbmcgZnVuY3Rpb25cclxuXHRcdHRoaXMuc29ydFRyZWVOb2Rlcyhyb290Tm9kZXMpO1xyXG5cclxuXHRcdHJldHVybiByb290Tm9kZXM7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDYWxjdWxhdGUgbGV2ZWxzIGZvciB0cmVlIG5vZGVzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjYWxjdWxhdGVMZXZlbHMobm9kZXM6IFRyZWVOb2RlW10sIGxldmVsOiBudW1iZXIpIHtcclxuXHRcdG5vZGVzLmZvckVhY2goKG5vZGUpID0+IHtcclxuXHRcdFx0bm9kZS5sZXZlbCA9IGxldmVsO1xyXG5cdFx0XHRpZiAobm9kZS5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0dGhpcy5jYWxjdWxhdGVMZXZlbHMobm9kZS5jaGlsZHJlbiwgbGV2ZWwgKyAxKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTb3J0IHRyZWUgbm9kZXMgcmVjdXJzaXZlbHkgdXNpbmcgY2VudHJhbGl6ZWQgc29ydGluZyBmdW5jdGlvblxyXG5cdCAqL1xyXG5cdHByaXZhdGUgc29ydFRyZWVOb2Rlcyhub2RlczogVHJlZU5vZGVbXSkge1xyXG5cdFx0aWYgKG5vZGVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xyXG5cclxuXHRcdC8vIEV4dHJhY3QgdGFza3MgZnJvbSBub2RlcyBmb3Igc29ydGluZ1xyXG5cdFx0Y29uc3QgdGFza3MgPSBub2Rlcy5tYXAoKG5vZGUpID0+IG5vZGUudGFzayk7XHJcblxyXG5cdFx0Ly8gQXBwbHkgc29ydGluZyB1c2luZyBjZW50cmFsaXplZCBmdW5jdGlvblxyXG5cdFx0bGV0IHNvcnRlZFRhc2tzOiBUYXNrW107XHJcblx0XHRpZiAoIXRoaXMuY3VycmVudFNvcnRGaWVsZCB8fCAhdGhpcy5wbHVnaW5TZXR0aW5ncykge1xyXG5cdFx0XHQvLyBEZWZhdWx0IHNvcnRpbmc6IHByaW9yaXR5IGRlc2MsIHRoZW4gY3JlYXRpb24gZGF0ZSBkZXNjXHJcblx0XHRcdGNvbnN0IGRlZmF1bHRDcml0ZXJpYTogU29ydENyaXRlcmlvbltdID0gW1xyXG5cdFx0XHRcdHsgZmllbGQ6IFwicHJpb3JpdHlcIiwgb3JkZXI6IFwiZGVzY1wiIH0sXHJcblx0XHRcdFx0eyBmaWVsZDogXCJjcmVhdGVkRGF0ZVwiLCBvcmRlcjogXCJkZXNjXCIgfSxcclxuXHRcdFx0XTtcclxuXHRcdFx0c29ydGVkVGFza3MgPSB0aGlzLnBsdWdpblNldHRpbmdzXHJcblx0XHRcdFx0PyBzb3J0VGFza3ModGFza3MsIGRlZmF1bHRDcml0ZXJpYSwgdGhpcy5wbHVnaW5TZXR0aW5ncylcclxuXHRcdFx0XHQ6IHRoaXMuZmFsbGJhY2tTb3J0KHRhc2tzKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIEFwcGx5IHRoZSBzcGVjaWZpZWQgc29ydGluZ1xyXG5cdFx0XHRjb25zdCBzb3J0Q3JpdGVyaWE6IFNvcnRDcml0ZXJpb25bXSA9IFtcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRmaWVsZDogdGhpcy5jdXJyZW50U29ydEZpZWxkIGFzIGFueSxcclxuXHRcdFx0XHRcdG9yZGVyOiB0aGlzLmN1cnJlbnRTb3J0T3JkZXIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XTtcclxuXHRcdFx0c29ydGVkVGFza3MgPSBzb3J0VGFza3ModGFza3MsIHNvcnRDcml0ZXJpYSwgdGhpcy5wbHVnaW5TZXR0aW5ncyk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUmVvcmRlciBub2RlcyBiYXNlZCBvbiBzb3J0ZWQgdGFza3NcclxuXHRcdGNvbnN0IHRhc2tUb05vZGVNYXAgPSBuZXcgTWFwPHN0cmluZywgVHJlZU5vZGU+KCk7XHJcblx0XHRub2Rlcy5mb3JFYWNoKChub2RlKSA9PiB7XHJcblx0XHRcdHRhc2tUb05vZGVNYXAuc2V0KG5vZGUudGFzay5pZCwgbm9kZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDbGVhciB0aGUgb3JpZ2luYWwgbm9kZXMgYXJyYXkgYW5kIHJlcG9wdWxhdGUgd2l0aCBzb3J0ZWQgb3JkZXJcclxuXHRcdG5vZGVzLmxlbmd0aCA9IDA7XHJcblx0XHRzb3J0ZWRUYXNrcy5mb3JFYWNoKCh0YXNrKSA9PiB7XHJcblx0XHRcdGNvbnN0IG5vZGUgPSB0YXNrVG9Ob2RlTWFwLmdldCh0YXNrLmlkKTtcclxuXHRcdFx0aWYgKG5vZGUpIHtcclxuXHRcdFx0XHRub2Rlcy5wdXNoKG5vZGUpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBSZWN1cnNpdmVseSBzb3J0IGNoaWxkcmVuIHdpdGggdGhlIHNhbWUgY3JpdGVyaWFcclxuXHRcdG5vZGVzLmZvckVhY2goKG5vZGUpID0+IHtcclxuXHRcdFx0aWYgKG5vZGUuY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdHRoaXMuc29ydFRyZWVOb2Rlcyhub2RlLmNoaWxkcmVuKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBGYWxsYmFjayBzb3J0aW5nIHdoZW4gcGx1Z2luIHNldHRpbmdzIGFyZSBub3QgYXZhaWxhYmxlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBmYWxsYmFja1NvcnQodGFza3M6IFRhc2tbXSk6IFRhc2tbXSB7XHJcblx0XHRyZXR1cm4gWy4uLnRhc2tzXS5zb3J0KChhLCBiKSA9PiB7XHJcblx0XHRcdC8vIOS8mOWFiOe6p+avlOi+g++8iOmrmOS8mOWFiOe6p+WcqOWJje+8iVxyXG5cdFx0XHRjb25zdCBwcmlvcml0eURpZmYgPVxyXG5cdFx0XHRcdChiLm1ldGFkYXRhLnByaW9yaXR5ID8/IDApIC0gKGEubWV0YWRhdGEucHJpb3JpdHkgPz8gMCk7XHJcblx0XHRcdGlmIChwcmlvcml0eURpZmYgIT09IDApIHtcclxuXHRcdFx0XHRyZXR1cm4gcHJpb3JpdHlEaWZmO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyDliJvlu7rml6XmnJ/mr5TovoPvvIjmlrDku7vliqHlnKjliY3vvIlcclxuXHRcdFx0Y29uc3QgY3JlYXRlZERpZmYgPVxyXG5cdFx0XHRcdChiLm1ldGFkYXRhLmNyZWF0ZWREYXRlID8/IDApIC0gKGEubWV0YWRhdGEuY3JlYXRlZERhdGUgPz8gMCk7XHJcblx0XHRcdGlmIChjcmVhdGVkRGlmZiAhPT0gMCkge1xyXG5cdFx0XHRcdHJldHVybiBjcmVhdGVkRGlmZjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8g5aaC5p6c5LyY5YWI57qn5ZKM5Yib5bu65pel5pyf6YO955u45ZCM77yM5oyJ5YaF5a655a2X5q+N6aG65bqP5o6S5bqPXHJcblx0XHRcdGNvbnN0IGNvbnRlbnRBID0gYS5jb250ZW50Py50cmltKCkgfHwgXCJcIjtcclxuXHRcdFx0Y29uc3QgY29udGVudEIgPSBiLmNvbnRlbnQ/LnRyaW0oKSB8fCBcIlwiO1xyXG5cdFx0XHRyZXR1cm4gY29udGVudEEubG9jYWxlQ29tcGFyZShjb250ZW50Qik7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEZsYXR0ZW4gdHJlZSBub2RlcyBpbnRvIHRhYmxlIHJvd3NcclxuXHQgKi9cclxuXHRwcml2YXRlIGZsYXR0ZW5UcmVlTm9kZXMoXHJcblx0XHRub2RlczogVHJlZU5vZGVbXSxcclxuXHRcdHJvd3M6IFRhYmxlUm93W10sXHJcblx0XHRsZXZlbDogbnVtYmVyXHJcblx0KSB7XHJcblx0XHRub2Rlcy5mb3JFYWNoKChub2RlKSA9PiB7XHJcblx0XHRcdC8vIENyZWF0ZSB0YWJsZSByb3cgZm9yIHRoaXMgbm9kZVxyXG5cdFx0XHRjb25zdCByb3c6IFRhYmxlUm93ID0ge1xyXG5cdFx0XHRcdGlkOiBub2RlLnRhc2suaWQsXHJcblx0XHRcdFx0dGFzazogbm9kZS50YXNrLFxyXG5cdFx0XHRcdGxldmVsOiBub2RlLmxldmVsLFxyXG5cdFx0XHRcdGV4cGFuZGVkOiBub2RlLmV4cGFuZGVkLFxyXG5cdFx0XHRcdGhhc0NoaWxkcmVuOiBub2RlLmNoaWxkcmVuLmxlbmd0aCA+IDAsXHJcblx0XHRcdFx0Y2VsbHM6IHRoaXMuY3JlYXRlQ2VsbHNGb3JOb2RlKG5vZGUsIHJvd3MubGVuZ3RoICsgMSksXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRyb3dzLnB1c2gocm93KTtcclxuXHJcblx0XHRcdC8vIElmIG5vZGUgaXMgZXhwYW5kZWQgYW5kIGhhcyBjaGlsZHJlbiwgYWRkIGNoaWxkcmVuIHJlY3Vyc2l2ZWx5XHJcblx0XHRcdGlmIChub2RlLmV4cGFuZGVkICYmIG5vZGUuY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdHRoaXMuZmxhdHRlblRyZWVOb2Rlcyhub2RlLmNoaWxkcmVuLCByb3dzLCBsZXZlbCArIDEpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZSB0YWJsZSBjZWxscyBmb3IgYSB0cmVlIG5vZGUgdXNpbmcgdGhlIHNhbWUgbG9naWMgYXMgVGFibGVWaWV3XHJcblx0ICovXHJcblx0cHJpdmF0ZSBjcmVhdGVDZWxsc0Zvck5vZGUobm9kZTogVHJlZU5vZGUsIHJvd051bWJlcjogbnVtYmVyKTogVGFibGVDZWxsW10ge1xyXG5cdFx0Y29uc3QgdGFzayA9IG5vZGUudGFzaztcclxuXHJcblx0XHRyZXR1cm4gdGhpcy5jb2x1bW5zLm1hcCgoY29sdW1uKSA9PiB7XHJcblx0XHRcdGxldCB2YWx1ZTogYW55O1xyXG5cdFx0XHRsZXQgZGlzcGxheVZhbHVlOiBzdHJpbmc7XHJcblxyXG5cdFx0XHRzd2l0Y2ggKGNvbHVtbi5pZCkge1xyXG5cdFx0XHRcdGNhc2UgXCJyb3dOdW1iZXJcIjpcclxuXHRcdFx0XHRcdHZhbHVlID0gcm93TnVtYmVyO1xyXG5cdFx0XHRcdFx0ZGlzcGxheVZhbHVlID0gcm93TnVtYmVyLnRvU3RyaW5nKCk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIFwic3RhdHVzXCI6XHJcblx0XHRcdFx0XHR2YWx1ZSA9IHRhc2suc3RhdHVzO1xyXG5cdFx0XHRcdFx0ZGlzcGxheVZhbHVlID0gdGhpcy5mb3JtYXRTdGF0dXModGFzay5zdGF0dXMpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBcImNvbnRlbnRcIjpcclxuXHRcdFx0XHRcdHZhbHVlID0gdGFzay5jb250ZW50O1xyXG5cdFx0XHRcdFx0ZGlzcGxheVZhbHVlID0gdGFzay5jb250ZW50O1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBcInByaW9yaXR5XCI6XHJcblx0XHRcdFx0XHRjb25zdCBtZXRhZGF0YSA9IHRhc2subWV0YWRhdGEgfHwge307XHJcblx0XHRcdFx0XHR2YWx1ZSA9IG1ldGFkYXRhLnByaW9yaXR5O1xyXG5cdFx0XHRcdFx0ZGlzcGxheVZhbHVlID0gdGhpcy5mb3JtYXRQcmlvcml0eShtZXRhZGF0YS5wcmlvcml0eSk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIFwiZHVlRGF0ZVwiOlxyXG5cdFx0XHRcdFx0Y29uc3QgbWV0YWRhdGFEdWUgPSB0YXNrLm1ldGFkYXRhIHx8IHt9O1xyXG5cdFx0XHRcdFx0dmFsdWUgPSBtZXRhZGF0YUR1ZS5kdWVEYXRlO1xyXG5cdFx0XHRcdFx0ZGlzcGxheVZhbHVlID0gdGhpcy5mb3JtYXREYXRlKG1ldGFkYXRhRHVlLmR1ZURhdGUpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBcInN0YXJ0RGF0ZVwiOlxyXG5cdFx0XHRcdFx0Y29uc3QgbWV0YWRhdGFTdGFydCA9IHRhc2subWV0YWRhdGEgfHwge307XHJcblx0XHRcdFx0XHR2YWx1ZSA9IG1ldGFkYXRhU3RhcnQuc3RhcnREYXRlO1xyXG5cdFx0XHRcdFx0ZGlzcGxheVZhbHVlID0gdGhpcy5mb3JtYXREYXRlKG1ldGFkYXRhU3RhcnQuc3RhcnREYXRlKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJzY2hlZHVsZWREYXRlXCI6XHJcblx0XHRcdFx0XHRjb25zdCBtZXRhZGF0YVNjaGVkdWxlZCA9IHRhc2subWV0YWRhdGEgfHwge307XHJcblx0XHRcdFx0XHR2YWx1ZSA9IG1ldGFkYXRhU2NoZWR1bGVkLnNjaGVkdWxlZERhdGU7XHJcblx0XHRcdFx0XHRkaXNwbGF5VmFsdWUgPSB0aGlzLmZvcm1hdERhdGUoXHJcblx0XHRcdFx0XHRcdG1ldGFkYXRhU2NoZWR1bGVkLnNjaGVkdWxlZERhdGVcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIFwiY3JlYXRlZERhdGVcIjpcclxuXHRcdFx0XHRcdHZhbHVlID0gdGFzay5tZXRhZGF0YS5jcmVhdGVkRGF0ZTtcclxuXHRcdFx0XHRcdGRpc3BsYXlWYWx1ZSA9IHRoaXMuZm9ybWF0RGF0ZSh0YXNrLm1ldGFkYXRhLmNyZWF0ZWREYXRlKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJjb21wbGV0ZWREYXRlXCI6XHJcblx0XHRcdFx0XHR2YWx1ZSA9IHRhc2subWV0YWRhdGEuY29tcGxldGVkRGF0ZTtcclxuXHRcdFx0XHRcdGRpc3BsYXlWYWx1ZSA9IHRoaXMuZm9ybWF0RGF0ZSh0YXNrLm1ldGFkYXRhLmNvbXBsZXRlZERhdGUpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBcInRhZ3NcIjpcclxuXHRcdFx0XHRcdHZhbHVlID0gdGFzay5tZXRhZGF0YS50YWdzO1xyXG5cdFx0XHRcdFx0ZGlzcGxheVZhbHVlID0gdGFzay5tZXRhZGF0YS50YWdzPy5qb2luKFwiLCBcIikgfHwgXCJcIjtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJwcm9qZWN0XCI6XHJcblx0XHRcdFx0XHR2YWx1ZSA9IHRhc2subWV0YWRhdGEucHJvamVjdDtcclxuXHRcdFx0XHRcdGRpc3BsYXlWYWx1ZSA9IHRhc2subWV0YWRhdGEucHJvamVjdCB8fCBcIlwiO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBcImNvbnRleHRcIjpcclxuXHRcdFx0XHRcdHZhbHVlID0gdGFzay5tZXRhZGF0YS5jb250ZXh0O1xyXG5cdFx0XHRcdFx0ZGlzcGxheVZhbHVlID0gdGFzay5tZXRhZGF0YS5jb250ZXh0IHx8IFwiXCI7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIFwicmVjdXJyZW5jZVwiOlxyXG5cdFx0XHRcdFx0dmFsdWUgPSB0YXNrLm1ldGFkYXRhLnJlY3VycmVuY2U7XHJcblx0XHRcdFx0XHRkaXNwbGF5VmFsdWUgPSB0YXNrLm1ldGFkYXRhLnJlY3VycmVuY2UgfHwgXCJcIjtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJlc3RpbWF0ZWRUaW1lXCI6XHJcblx0XHRcdFx0XHR2YWx1ZSA9IHRhc2subWV0YWRhdGEuZXN0aW1hdGVkVGltZTtcclxuXHRcdFx0XHRcdGRpc3BsYXlWYWx1ZSA9XHJcblx0XHRcdFx0XHRcdHRhc2subWV0YWRhdGEuZXN0aW1hdGVkVGltZT8udG9TdHJpbmcoKSB8fCBcIlwiO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBcImFjdHVhbFRpbWVcIjpcclxuXHRcdFx0XHRcdHZhbHVlID0gdGFzay5tZXRhZGF0YS5hY3R1YWxUaW1lO1xyXG5cdFx0XHRcdFx0ZGlzcGxheVZhbHVlID0gdGFzay5tZXRhZGF0YS5hY3R1YWxUaW1lPy50b1N0cmluZygpIHx8IFwiXCI7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIFwiZmlsZVBhdGhcIjpcclxuXHRcdFx0XHRcdHZhbHVlID0gdGFzay5maWxlUGF0aDtcclxuXHRcdFx0XHRcdGRpc3BsYXlWYWx1ZSA9IHRoaXMuZm9ybWF0RmlsZVBhdGgodGFzay5maWxlUGF0aCk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdFx0dmFsdWUgPSBcIlwiO1xyXG5cdFx0XHRcdFx0ZGlzcGxheVZhbHVlID0gXCJcIjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRjb2x1bW5JZDogY29sdW1uLmlkLFxyXG5cdFx0XHRcdHZhbHVlOiB2YWx1ZSxcclxuXHRcdFx0XHRkaXNwbGF5VmFsdWU6IGRpc3BsYXlWYWx1ZSxcclxuXHRcdFx0XHRlZGl0YWJsZTogY29sdW1uLmlkICE9PSBcInJvd051bWJlclwiICYmIGNvbHVtbi5pZCAhPT0gXCJmaWxlUGF0aFwiLFxyXG5cdFx0XHR9O1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBUb2dnbGUgbm9kZSBleHBhbnNpb25cclxuXHQgKi9cclxuXHRwdWJsaWMgdG9nZ2xlTm9kZUV4cGFuc2lvbih0YXNrSWQ6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0Y29uc3Qgbm9kZSA9IHRoaXMudHJlZU5vZGVzLmdldCh0YXNrSWQpO1xyXG5cdFx0aWYgKCFub2RlIHx8IG5vZGUuY2hpbGRyZW4ubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHRub2RlLmV4cGFuZGVkID0gIW5vZGUuZXhwYW5kZWQ7XHJcblxyXG5cdFx0aWYgKG5vZGUuZXhwYW5kZWQpIHtcclxuXHRcdFx0dGhpcy5leHBhbmRlZE5vZGVzLmFkZCh0YXNrSWQpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy5leHBhbmRlZE5vZGVzLmRlbGV0ZSh0YXNrSWQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0cnVlO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRXhwYW5kIGFsbCBub2Rlc1xyXG5cdCAqL1xyXG5cdHB1YmxpYyBleHBhbmRBbGwoKSB7XHJcblx0XHR0aGlzLnRyZWVOb2Rlcy5mb3JFYWNoKChub2RlLCB0YXNrSWQpID0+IHtcclxuXHRcdFx0aWYgKG5vZGUuY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdG5vZGUuZXhwYW5kZWQgPSB0cnVlO1xyXG5cdFx0XHRcdHRoaXMuZXhwYW5kZWROb2Rlcy5hZGQodGFza0lkKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDb2xsYXBzZSBhbGwgbm9kZXNcclxuXHQgKi9cclxuXHRwdWJsaWMgY29sbGFwc2VBbGwoKSB7XHJcblx0XHR0aGlzLnRyZWVOb2Rlcy5mb3JFYWNoKChub2RlLCB0YXNrSWQpID0+IHtcclxuXHRcdFx0bm9kZS5leHBhbmRlZCA9IGZhbHNlO1xyXG5cdFx0XHR0aGlzLmV4cGFuZGVkTm9kZXMuZGVsZXRlKHRhc2tJZCk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBleHBhbmRlZCBzdGF0ZSBvZiBhIG5vZGVcclxuXHQgKi9cclxuXHRwdWJsaWMgaXNOb2RlRXhwYW5kZWQodGFza0lkOiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiB0aGlzLmV4cGFuZGVkTm9kZXMuaGFzKHRhc2tJZCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgYWxsIGRlc2NlbmRhbnQgdGFzayBJRHMgZm9yIGEgZ2l2ZW4gdGFza1xyXG5cdCAqL1xyXG5cdHB1YmxpYyBnZXREZXNjZW5kYW50SWRzKHRhc2tJZDogc3RyaW5nKTogc3RyaW5nW10ge1xyXG5cdFx0Y29uc3Qgbm9kZSA9IHRoaXMudHJlZU5vZGVzLmdldCh0YXNrSWQpO1xyXG5cdFx0aWYgKCFub2RlKSByZXR1cm4gW107XHJcblxyXG5cdFx0Y29uc3QgZGVzY2VuZGFudHM6IHN0cmluZ1tdID0gW107XHJcblx0XHR0aGlzLmNvbGxlY3REZXNjZW5kYW50SWRzKG5vZGUsIGRlc2NlbmRhbnRzKTtcclxuXHRcdHJldHVybiBkZXNjZW5kYW50cztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlY3Vyc2l2ZWx5IGNvbGxlY3QgZGVzY2VuZGFudCBJRHNcclxuXHQgKi9cclxuXHRwcml2YXRlIGNvbGxlY3REZXNjZW5kYW50SWRzKG5vZGU6IFRyZWVOb2RlLCBkZXNjZW5kYW50czogc3RyaW5nW10pIHtcclxuXHRcdG5vZGUuY2hpbGRyZW4uZm9yRWFjaCgoY2hpbGQpID0+IHtcclxuXHRcdFx0ZGVzY2VuZGFudHMucHVzaChjaGlsZC50YXNrLmlkKTtcclxuXHRcdFx0dGhpcy5jb2xsZWN0RGVzY2VuZGFudElkcyhjaGlsZCwgZGVzY2VuZGFudHMpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgcGFyZW50IHRhc2sgSUQgZm9yIGEgZ2l2ZW4gdGFza1xyXG5cdCAqL1xyXG5cdHB1YmxpYyBnZXRQYXJlbnRJZCh0YXNrSWQ6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xyXG5cdFx0Y29uc3Qgbm9kZSA9IHRoaXMudHJlZU5vZGVzLmdldCh0YXNrSWQpO1xyXG5cdFx0cmV0dXJuIG5vZGU/LnBhcmVudD8udGFzay5pZCB8fCBudWxsO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGFsbCBzaWJsaW5nIHRhc2sgSURzIGZvciBhIGdpdmVuIHRhc2tcclxuXHQgKi9cclxuXHRwdWJsaWMgZ2V0U2libGluZ0lkcyh0YXNrSWQ6IHN0cmluZyk6IHN0cmluZ1tdIHtcclxuXHRcdGNvbnN0IG5vZGUgPSB0aGlzLnRyZWVOb2Rlcy5nZXQodGFza0lkKTtcclxuXHRcdGlmICghbm9kZSkgcmV0dXJuIFtdO1xyXG5cclxuXHRcdGNvbnN0IHNpYmxpbmdzID0gbm9kZS5wYXJlbnQgPyBub2RlLnBhcmVudC5jaGlsZHJlbiA6IFtdO1xyXG5cdFx0cmV0dXJuIHNpYmxpbmdzXHJcblx0XHRcdC5maWx0ZXIoKHNpYmxpbmcpID0+IHNpYmxpbmcudGFzay5pZCAhPT0gdGFza0lkKVxyXG5cdFx0XHQubWFwKChzaWJsaW5nKSA9PiBzaWJsaW5nLnRhc2suaWQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgYSB0YXNrIGNhbiBiZSBtb3ZlZCB0byBhIG5ldyBwYXJlbnRcclxuXHQgKi9cclxuXHRwdWJsaWMgY2FuTW92ZVRhc2sodGFza0lkOiBzdHJpbmcsIG5ld1BhcmVudElkOiBzdHJpbmcgfCBudWxsKTogYm9vbGVhbiB7XHJcblx0XHQvLyBDYW4ndCBtb3ZlIHRvIGl0c2VsZlxyXG5cdFx0aWYgKHRhc2tJZCA9PT0gbmV3UGFyZW50SWQpIHJldHVybiBmYWxzZTtcclxuXHJcblx0XHQvLyBDYW4ndCBtb3ZlIHRvIG9uZSBvZiBpdHMgZGVzY2VuZGFudHNcclxuXHRcdGlmIChcclxuXHRcdFx0bmV3UGFyZW50SWQgJiZcclxuXHRcdFx0dGhpcy5nZXREZXNjZW5kYW50SWRzKHRhc2tJZCkuaW5jbHVkZXMobmV3UGFyZW50SWQpXHJcblx0XHQpIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0cnVlO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTW92ZSBhIHRhc2sgdG8gYSBuZXcgcGFyZW50XHJcblx0ICovXHJcblx0cHVibGljIG1vdmVUYXNrKHRhc2tJZDogc3RyaW5nLCBuZXdQYXJlbnRJZDogc3RyaW5nIHwgbnVsbCk6IGJvb2xlYW4ge1xyXG5cdFx0aWYgKCF0aGlzLmNhbk1vdmVUYXNrKHRhc2tJZCwgbmV3UGFyZW50SWQpKSB7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBub2RlID0gdGhpcy50cmVlTm9kZXMuZ2V0KHRhc2tJZCk7XHJcblx0XHRpZiAoIW5vZGUpIHJldHVybiBmYWxzZTtcclxuXHJcblx0XHQvLyBSZW1vdmUgZnJvbSBjdXJyZW50IHBhcmVudFxyXG5cdFx0aWYgKG5vZGUucGFyZW50KSB7XHJcblx0XHRcdGNvbnN0IGluZGV4ID0gbm9kZS5wYXJlbnQuY2hpbGRyZW4uaW5kZXhPZihub2RlKTtcclxuXHRcdFx0aWYgKGluZGV4ID4gLTEpIHtcclxuXHRcdFx0XHRub2RlLnBhcmVudC5jaGlsZHJlbi5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWRkIHRvIG5ldyBwYXJlbnRcclxuXHRcdGlmIChuZXdQYXJlbnRJZCkge1xyXG5cdFx0XHRjb25zdCBuZXdQYXJlbnQgPSB0aGlzLnRyZWVOb2Rlcy5nZXQobmV3UGFyZW50SWQpO1xyXG5cdFx0XHRpZiAobmV3UGFyZW50KSB7XHJcblx0XHRcdFx0bmV3UGFyZW50LmNoaWxkcmVuLnB1c2gobm9kZSk7XHJcblx0XHRcdFx0bm9kZS5wYXJlbnQgPSBuZXdQYXJlbnQ7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdG5vZGUucGFyZW50ID0gdW5kZWZpbmVkO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFVwZGF0ZSB0YXNrJ3MgcGFyZW50IHByb3BlcnR5XHJcblx0XHRub2RlLnRhc2subWV0YWRhdGEucGFyZW50ID0gbmV3UGFyZW50SWQgfHwgdW5kZWZpbmVkO1xyXG5cclxuXHRcdHJldHVybiB0cnVlO1xyXG5cdH1cclxuXHJcblx0Ly8gRm9ybWF0dGluZyBtZXRob2RzIChzYW1lIGFzIFRhYmxlVmlldylcclxuXHRwcml2YXRlIGZvcm1hdFN0YXR1cyhzdGF0dXM6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHRjb25zdCBzdGF0dXNNYXA6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XHJcblx0XHRcdFwiIFwiOiB0KFwiTm90IFN0YXJ0ZWRcIiksXHJcblx0XHRcdHg6IHQoXCJDb21wbGV0ZWRcIiksXHJcblx0XHRcdFg6IHQoXCJDb21wbGV0ZWRcIiksXHJcblx0XHRcdFwiL1wiOiB0KFwiSW4gUHJvZ3Jlc3NcIiksXHJcblx0XHRcdFwiPlwiOiB0KFwiSW4gUHJvZ3Jlc3NcIiksXHJcblx0XHRcdFwiLVwiOiB0KFwiQWJhbmRvbmVkXCIpLFxyXG5cdFx0XHRcIj9cIjogdChcIlBsYW5uZWRcIiksXHJcblx0XHR9O1xyXG5cdFx0cmV0dXJuIHN0YXR1c01hcFtzdGF0dXNdIHx8IHN0YXR1cztcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZm9ybWF0UHJpb3JpdHkocHJpb3JpdHk/OiBudW1iZXIpOiBzdHJpbmcge1xyXG5cdFx0aWYgKCFwcmlvcml0eSkgcmV0dXJuIFwiXCI7XHJcblx0XHRjb25zdCBwcmlvcml0eU1hcDogUmVjb3JkPG51bWJlciwgc3RyaW5nPiA9IHtcclxuXHRcdFx0NTogdChcIkhpZ2hlc3RcIiksXHJcblx0XHRcdDQ6IHQoXCJIaWdoXCIpLFxyXG5cdFx0XHQzOiB0KFwiTWVkaXVtXCIpLFxyXG5cdFx0XHQyOiB0KFwiTG93XCIpLFxyXG5cdFx0XHQxOiB0KFwiTG93ZXN0XCIpLFxyXG5cdFx0fTtcclxuXHRcdHJldHVybiBwcmlvcml0eU1hcFtwcmlvcml0eV0gfHwgcHJpb3JpdHkudG9TdHJpbmcoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZm9ybWF0RGF0ZSh0aW1lc3RhbXA/OiBudW1iZXIpOiBzdHJpbmcge1xyXG5cdFx0aWYgKCF0aW1lc3RhbXApIHJldHVybiBcIlwiO1xyXG5cdFx0cmV0dXJuIG5ldyBEYXRlKHRpbWVzdGFtcCkudG9Mb2NhbGVEYXRlU3RyaW5nKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGZvcm1hdEZpbGVQYXRoKGZpbGVQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0Ly8gRXh0cmFjdCBqdXN0IHRoZSBmaWxlbmFtZVxyXG5cdFx0Y29uc3QgcGFydHMgPSBmaWxlUGF0aC5zcGxpdChcIi9cIik7XHJcblx0XHRyZXR1cm4gcGFydHNbcGFydHMubGVuZ3RoIC0gMV0ucmVwbGFjZSgvXFwubWQkLywgXCJcIik7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDbGVhbiB1cCByZXNvdXJjZXNcclxuXHQgKi9cclxuXHRwcml2YXRlIGNsZWFudXAoKSB7XHJcblx0XHR0aGlzLmV4cGFuZGVkTm9kZXMuY2xlYXIoKTtcclxuXHRcdHRoaXMudHJlZU5vZGVzLmNsZWFyKCk7XHJcblx0fVxyXG59XHJcbiJdfQ==