import { setIcon } from "obsidian";
import { timestampToLocalDateString } from "@/utils/date/date-display-helper";
import { TwoColumnViewBase } from "./TwoColumnViewBase";
import { t } from "@/translations/helper";
import "@/styles/property-view.css";
import { getEffectiveProject } from "@/utils/task/task-operations";
/**
 * A two-column view that displays task properties in the left column
 * and related tasks in the right column.
 */
export class TaskPropertyTwoColumnView extends TwoColumnViewBase {
    constructor(parentEl, app, plugin, viewConfig, viewId) {
        // Create the base configuration for the two-column view
        const config = {
            classNamePrefix: "task-property",
            leftColumnTitle: viewConfig.leftColumnTitle,
            rightColumnDefaultTitle: viewConfig.rightColumnDefaultTitle,
            multiSelectText: viewConfig.multiSelectText,
            emptyStateText: viewConfig.emptyStateText,
            rendererContext: "task-property-view",
            itemIcon: getIconForProperty(viewConfig.taskPropertyKey),
        };
        super(parentEl, app, plugin, config);
        this.viewConfig = viewConfig;
        this.viewId = viewId;
        this.propertyValueMap = new Map();
        this.sortedPropertyValues = [];
        this.propertyKey = viewConfig.taskPropertyKey;
    }
    /**
     * Build index of tasks by the selected property
     */
    buildItemsIndex() {
        var _a, _b;
        // Clear existing index
        this.propertyValueMap.clear();
        // Group tasks by the selected property
        for (const task of this.allTasks) {
            const values = this.getPropertyValues(task);
            // If no values found, add to a special "None" category
            if (!values || values.length === 0) {
                const noneKey = t("None");
                if (!this.propertyValueMap.has(noneKey)) {
                    this.propertyValueMap.set(noneKey, []);
                }
                (_a = this.propertyValueMap.get(noneKey)) === null || _a === void 0 ? void 0 : _a.push(task);
                continue;
            }
            // Add task to each of its property values
            for (const value of values) {
                const normalizedValue = String(value);
                if (!this.propertyValueMap.has(normalizedValue)) {
                    this.propertyValueMap.set(normalizedValue, []);
                }
                (_b = this.propertyValueMap.get(normalizedValue)) === null || _b === void 0 ? void 0 : _b.push(task);
            }
        }
        // Sort the property values
        this.sortedPropertyValues = Array.from(this.propertyValueMap.keys()).sort((a, b) => this.getSortValue(a).localeCompare(this.getSortValue(b)));
    }
    /**
     * Get sort value for a property value
     * Special handling for certain property types
     */
    getSortValue(value) {
        // Special handling for priorities
        if (this.propertyKey === "priority") {
            // Sort numerically, with undefined priority last
            if (value === t("None"))
                return "999"; // None goes last
            return value.padStart(3, "0"); // Pad with zeros for correct numeric sorting
        }
        // For dates, convert to timestamp
        if (["dueDate", "startDate", "scheduledDate"].includes(this.propertyKey)) {
            if (value === t("None"))
                return "9999-12-31"; // None goes last
            return value;
        }
        return value;
    }
    /**
     * Extract values for the selected property from a task
     */
    getPropertyValues(task) {
        switch (this.propertyKey) {
            case "tags":
                return task.metadata.tags || [];
            case "project":
                const effectiveProject = getEffectiveProject(task);
                return effectiveProject ? [effectiveProject] : [];
            case "priority":
                return task.metadata.priority !== undefined
                    ? [task.metadata.priority.toString()]
                    : [];
            case "context":
                return task.metadata.context ? [task.metadata.context] : [];
            case "status":
                return [task.status || ""];
            case "dueDate":
                return task.metadata.dueDate
                    ? [this.formatDate(task.metadata.dueDate)]
                    : [];
            case "startDate":
                return task.metadata.startDate
                    ? [this.formatDate(task.metadata.startDate)]
                    : [];
            case "scheduledDate":
                return task.metadata.scheduledDate
                    ? [this.formatDate(task.metadata.scheduledDate)]
                    : [];
            case "cancelledDate":
                return task.metadata.cancelledDate
                    ? [this.formatDate(task.metadata.cancelledDate)]
                    : [];
            case "filePath":
                // Extract just the filename without path and extension
                const pathParts = task.filePath.split("/");
                const fileName = pathParts[pathParts.length - 1].replace(/\.[^/.]+$/, "");
                return [fileName];
            default:
                return [];
        }
    }
    /**
     * Format date as YYYY-MM-DD
     */
    formatDate(timestamp) {
        return timestampToLocalDateString(timestamp);
    }
    /**
     * Render the list of property values in the left column
     */
    renderItemsList() {
        this.itemsListEl.empty();
        // Update the empty state if no property values exist
        if (this.sortedPropertyValues.length === 0) {
            const emptyEl = this.itemsListEl.createDiv({
                cls: "task-property-empty-state",
            });
            emptyEl.setText(t("No items found"));
            return;
        }
        // Create a list item for each property value
        for (const value of this.sortedPropertyValues) {
            const tasks = this.propertyValueMap.get(value) || [];
            const itemEl = this.itemsListEl.createDiv({
                cls: "task-property-list-item",
            });
            // Add selection highlighting
            if (this.selectedItems.items.includes(value)) {
                itemEl.addClass("selected");
            }
            // Create the item with icon and count
            const iconEl = itemEl.createSpan({
                cls: "task-property-icon",
            });
            setIcon(iconEl, this.config.itemIcon);
            const nameEl = itemEl.createSpan({
                cls: "task-property-name",
                text: this.formatDisplayValue(value),
            });
            const countEl = itemEl.createSpan({
                cls: "task-property-count",
                text: String(tasks.length),
            });
            // Handle item selection
            this.registerDomEvent(itemEl, "click", (event) => {
                // Using Ctrl/Cmd key allows multi-select
                const isCtrlPressed = event.ctrlKey || event.metaKey;
                this.handleItemSelection(value, isCtrlPressed);
                this.renderItemsList(); // Refresh to update selection visuals
            });
        }
    }
    /**
     * Format display value based on property type
     */
    formatDisplayValue(value) {
        if (this.propertyKey === "priority") {
            switch (value) {
                case "1":
                    return t("High Priority");
                case "2":
                    return t("Medium Priority");
                case "3":
                    return t("Low Priority");
                default:
                    return value;
            }
        }
        // For dates, could add "Today", "Tomorrow", etc.
        if (["dueDate", "startDate", "scheduledDate", "cancelledDate"].includes(this.propertyKey)) {
            const today = this.formatDate(Date.now());
            if (value === today)
                return t("Today");
        }
        return value;
    }
    /**
     * Update tasks shown in the right column based on selected property values
     */
    updateSelectedTasks() {
        // Get tasks for the selected property values
        this.filteredTasks = [];
        // If no selection, show all tasks (or empty)
        if (this.selectedItems.items.length === 0) {
            this.cleanupRenderers();
            this.renderEmptyTaskList(t(this.config.emptyStateText));
            return;
        }
        // Gather tasks from all selected property values
        for (const value of this.selectedItems.items) {
            const tasks = this.propertyValueMap.get(value) || [];
            // Avoid adding duplicates
            for (const task of tasks) {
                if (!this.filteredTasks.some((t) => t.id === task.id)) {
                    this.filteredTasks.push(task);
                }
            }
        }
        // Remember tasks in selection state for other methods
        this.selectedItems.tasks = this.filteredTasks;
        // Render the task list
        this.renderTaskList();
    }
    /**
     * Handle task updates by rebuilding the affected parts of the index
     */
    updateTask(updatedTask) {
        var _a, _b;
        // Find if the task was previously indexed
        let oldValues = [];
        for (const [value, tasks] of this.propertyValueMap) {
            if (tasks.some((task) => task.id === updatedTask.id)) {
                oldValues.push(value);
            }
        }
        // Remove the task from its old property values
        for (const value of oldValues) {
            const tasks = this.propertyValueMap.get(value) || [];
            this.propertyValueMap.set(value, tasks.filter((task) => task.id !== updatedTask.id));
            // If no tasks left for this value, remove the property value
            if (((_a = this.propertyValueMap.get(value)) === null || _a === void 0 ? void 0 : _a.length) === 0) {
                this.propertyValueMap.delete(value);
                this.sortedPropertyValues = this.sortedPropertyValues.filter((v) => v !== value);
            }
        }
        // Add the task to its new property values
        const newValues = this.getPropertyValues(updatedTask);
        for (const value of newValues) {
            const normalizedValue = String(value);
            if (!this.propertyValueMap.has(normalizedValue)) {
                this.propertyValueMap.set(normalizedValue, []);
                this.sortedPropertyValues.push(normalizedValue);
                // Resort the property values
                this.sortedPropertyValues.sort((a, b) => this.getSortValue(a).localeCompare(this.getSortValue(b)));
            }
            (_b = this.propertyValueMap.get(normalizedValue)) === null || _b === void 0 ? void 0 : _b.push(updatedTask);
        }
        // If the task is in the filtered tasks, update it there too
        const taskIndex = this.filteredTasks.findIndex((task) => task.id === updatedTask.id);
        if (taskIndex >= 0) {
            this.filteredTasks[taskIndex] = updatedTask;
        }
        // Update the task in the allTasks array too
        const allTaskIndex = this.allTasks.findIndex((task) => task.id === updatedTask.id);
        if (allTaskIndex >= 0) {
            this.allTasks[allTaskIndex] = updatedTask;
        }
        // Re-render the UI to reflect changes
        this.renderItemsList();
        if (this.filteredTasks.length > 0) {
            this.renderTaskList();
        }
    }
    /**
     * Get the view ID associated with this component
     */
    getViewId() {
        return this.viewId || "";
    }
}
/**
 * Get an appropriate icon name for a property type
 */
function getIconForProperty(propertyKey) {
    switch (propertyKey) {
        case "tags":
            return "tag";
        case "project":
            return "folder";
        case "priority":
            return "alert-triangle";
        case "context":
            return "at-sign";
        case "status":
            return "check-square";
        case "dueDate":
            return "calendar";
        case "startDate":
            return "play";
        case "scheduledDate":
            return "calendar-clock";
        case "filePath":
            return "file";
        default:
            return "list";
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGFza1Byb3BlcnR5VHdvQ29sdW1uVmlldy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlRhc2tQcm9wZXJ0eVR3b0NvbHVtblZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFPLE9BQU8sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUN4QyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUU5RSxPQUFPLEVBQUUsaUJBQWlCLEVBQXVCLE1BQU0scUJBQXFCLENBQUM7QUFDN0UsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRzFDLE9BQU8sNEJBQTRCLENBQUM7QUFDcEMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFbkU7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLHlCQUEwQixTQUFRLGlCQUF5QjtJQUt2RSxZQUNDLFFBQXFCLEVBQ3JCLEdBQVEsRUFDUixNQUE2QixFQUNyQixVQUFtQyxFQUNuQyxNQUFlO1FBRXZCLHdEQUF3RDtRQUN4RCxNQUFNLE1BQU0sR0FBd0I7WUFDbkMsZUFBZSxFQUFFLGVBQWU7WUFDaEMsZUFBZSxFQUFFLFVBQVUsQ0FBQyxlQUFlO1lBQzNDLHVCQUF1QixFQUFFLFVBQVUsQ0FBQyx1QkFBdUI7WUFDM0QsZUFBZSxFQUFFLFVBQVUsQ0FBQyxlQUFlO1lBQzNDLGNBQWMsRUFBRSxVQUFVLENBQUMsY0FBYztZQUN6QyxlQUFlLEVBQUUsb0JBQW9CO1lBQ3JDLFFBQVEsRUFBRSxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDO1NBQ3hELENBQUM7UUFFRixLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFkN0IsZUFBVSxHQUFWLFVBQVUsQ0FBeUI7UUFDbkMsV0FBTSxHQUFOLE1BQU0sQ0FBUztRQVRoQixxQkFBZ0IsR0FBd0IsSUFBSSxHQUFHLEVBQUUsQ0FB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O0dBRUc7QUFDSCxTQUFTLGtCQUFrQixDQUFDLFdBQW1CO0lBQzlDLFFBQVEsV0FBVyxFQUFFO1FBQ3BCLEtBQUssTUFBTTtZQUNWLE9BQU8sS0FBSyxDQUFDO1FBQ2QsS0FBSyxTQUFTO1lBQ2IsT0FBTyxRQUFRLENBQUM7UUFDakIsS0FBSyxVQUFVO1lBQ2QsT0FBTyxnQkFBZ0IsQ0FBQztRQUN6QixLQUFLLFNBQVM7WUFDYixPQUFPLFNBQVMsQ0FBQztRQUNsQixLQUFLLFFBQVE7WUFDWixPQUFPLGNBQWMsQ0FBQztRQUN2QixLQUFLLFNBQVM7WUFDYixPQUFPLFVBQVUsQ0FBQztRQUNuQixLQUFLLFdBQVc7WUFDZixPQUFPLE1BQU0sQ0FBQztRQUNmLEtBQUssZUFBZTtZQUNuQixPQUFPLGdCQUFnQixDQUFDO1FBQ3pCLEtBQUssVUFBVTtZQUNkLE9BQU8sTUFBTSxDQUFDO1FBQ2Y7WUFDQyxPQUFPLE1BQU0sQ0FBQztLQUNmO0FBQ0YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcCwgc2V0SWNvbiB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyB0aW1lc3RhbXBUb0xvY2FsRGF0ZVN0cmluZyB9IGZyb20gXCJAL3V0aWxzL2RhdGUvZGF0ZS1kaXNwbGF5LWhlbHBlclwiO1xyXG5pbXBvcnQgeyBUYXNrIH0gZnJvbSBcIkAvdHlwZXMvdGFza1wiO1xyXG5pbXBvcnQgeyBUd29Db2x1bW5WaWV3QmFzZSwgVHdvQ29sdW1uVmlld0NvbmZpZyB9IGZyb20gXCIuL1R3b0NvbHVtblZpZXdCYXNlXCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjtcclxuaW1wb3J0IHsgVHdvQ29sdW1uU3BlY2lmaWNDb25maWcgfSBmcm9tIFwiQC9jb21tb24vc2V0dGluZy1kZWZpbml0aW9uXCI7XHJcbmltcG9ydCBcIkAvc3R5bGVzL3Byb3BlcnR5LXZpZXcuY3NzXCI7XHJcbmltcG9ydCB7IGdldEVmZmVjdGl2ZVByb2plY3QgfSBmcm9tIFwiQC91dGlscy90YXNrL3Rhc2stb3BlcmF0aW9uc1wiO1xyXG5cclxuLyoqXHJcbiAqIEEgdHdvLWNvbHVtbiB2aWV3IHRoYXQgZGlzcGxheXMgdGFzayBwcm9wZXJ0aWVzIGluIHRoZSBsZWZ0IGNvbHVtblxyXG4gKiBhbmQgcmVsYXRlZCB0YXNrcyBpbiB0aGUgcmlnaHQgY29sdW1uLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFRhc2tQcm9wZXJ0eVR3b0NvbHVtblZpZXcgZXh0ZW5kcyBUd29Db2x1bW5WaWV3QmFzZTxzdHJpbmc+IHtcclxuXHRwcml2YXRlIHByb3BlcnR5VmFsdWVNYXA6IE1hcDxzdHJpbmcsIFRhc2tbXT4gPSBuZXcgTWFwKCk7XHJcblx0cHJpdmF0ZSBwcm9wZXJ0eUtleTogc3RyaW5nO1xyXG5cdHByaXZhdGUgc29ydGVkUHJvcGVydHlWYWx1ZXM6IHN0cmluZ1tdID0gW107XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cGFyZW50RWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0YXBwOiBBcHAsXHJcblx0XHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdHByaXZhdGUgdmlld0NvbmZpZzogVHdvQ29sdW1uU3BlY2lmaWNDb25maWcsXHJcblx0XHRwcml2YXRlIHZpZXdJZD86IHN0cmluZ1xyXG5cdCkge1xyXG5cdFx0Ly8gQ3JlYXRlIHRoZSBiYXNlIGNvbmZpZ3VyYXRpb24gZm9yIHRoZSB0d28tY29sdW1uIHZpZXdcclxuXHRcdGNvbnN0IGNvbmZpZzogVHdvQ29sdW1uVmlld0NvbmZpZyA9IHtcclxuXHRcdFx0Y2xhc3NOYW1lUHJlZml4OiBcInRhc2stcHJvcGVydHlcIixcclxuXHRcdFx0bGVmdENvbHVtblRpdGxlOiB2aWV3Q29uZmlnLmxlZnRDb2x1bW5UaXRsZSxcclxuXHRcdFx0cmlnaHRDb2x1bW5EZWZhdWx0VGl0bGU6IHZpZXdDb25maWcucmlnaHRDb2x1bW5EZWZhdWx0VGl0bGUsXHJcblx0XHRcdG11bHRpU2VsZWN0VGV4dDogdmlld0NvbmZpZy5tdWx0aVNlbGVjdFRleHQsXHJcblx0XHRcdGVtcHR5U3RhdGVUZXh0OiB2aWV3Q29uZmlnLmVtcHR5U3RhdGVUZXh0LFxyXG5cdFx0XHRyZW5kZXJlckNvbnRleHQ6IFwidGFzay1wcm9wZXJ0eS12aWV3XCIsXHJcblx0XHRcdGl0ZW1JY29uOiBnZXRJY29uRm9yUHJvcGVydHkodmlld0NvbmZpZy50YXNrUHJvcGVydHlLZXkpLFxyXG5cdFx0fTtcclxuXHJcblx0XHRzdXBlcihwYXJlbnRFbCwgYXBwLCBwbHVnaW4sIGNvbmZpZyk7XHJcblx0XHR0aGlzLnByb3BlcnR5S2V5ID0gdmlld0NvbmZpZy50YXNrUHJvcGVydHlLZXk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBCdWlsZCBpbmRleCBvZiB0YXNrcyBieSB0aGUgc2VsZWN0ZWQgcHJvcGVydHlcclxuXHQgKi9cclxuXHRwcm90ZWN0ZWQgYnVpbGRJdGVtc0luZGV4KCk6IHZvaWQge1xyXG5cdFx0Ly8gQ2xlYXIgZXhpc3RpbmcgaW5kZXhcclxuXHRcdHRoaXMucHJvcGVydHlWYWx1ZU1hcC5jbGVhcigpO1xyXG5cclxuXHRcdC8vIEdyb3VwIHRhc2tzIGJ5IHRoZSBzZWxlY3RlZCBwcm9wZXJ0eVxyXG5cdFx0Zm9yIChjb25zdCB0YXNrIG9mIHRoaXMuYWxsVGFza3MpIHtcclxuXHRcdFx0Y29uc3QgdmFsdWVzID0gdGhpcy5nZXRQcm9wZXJ0eVZhbHVlcyh0YXNrKTtcclxuXHJcblx0XHRcdC8vIElmIG5vIHZhbHVlcyBmb3VuZCwgYWRkIHRvIGEgc3BlY2lhbCBcIk5vbmVcIiBjYXRlZ29yeVxyXG5cdFx0XHRpZiAoIXZhbHVlcyB8fCB2YWx1ZXMubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdFx0Y29uc3Qgbm9uZUtleSA9IHQoXCJOb25lXCIpO1xyXG5cdFx0XHRcdGlmICghdGhpcy5wcm9wZXJ0eVZhbHVlTWFwLmhhcyhub25lS2V5KSkge1xyXG5cdFx0XHRcdFx0dGhpcy5wcm9wZXJ0eVZhbHVlTWFwLnNldChub25lS2V5LCBbXSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHRoaXMucHJvcGVydHlWYWx1ZU1hcC5nZXQobm9uZUtleSk/LnB1c2godGFzayk7XHJcblx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEFkZCB0YXNrIHRvIGVhY2ggb2YgaXRzIHByb3BlcnR5IHZhbHVlc1xyXG5cdFx0XHRmb3IgKGNvbnN0IHZhbHVlIG9mIHZhbHVlcykge1xyXG5cdFx0XHRcdGNvbnN0IG5vcm1hbGl6ZWRWYWx1ZSA9IFN0cmluZyh2YWx1ZSk7XHJcblx0XHRcdFx0aWYgKCF0aGlzLnByb3BlcnR5VmFsdWVNYXAuaGFzKG5vcm1hbGl6ZWRWYWx1ZSkpIHtcclxuXHRcdFx0XHRcdHRoaXMucHJvcGVydHlWYWx1ZU1hcC5zZXQobm9ybWFsaXplZFZhbHVlLCBbXSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHRoaXMucHJvcGVydHlWYWx1ZU1hcC5nZXQobm9ybWFsaXplZFZhbHVlKT8ucHVzaCh0YXNrKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFNvcnQgdGhlIHByb3BlcnR5IHZhbHVlc1xyXG5cdFx0dGhpcy5zb3J0ZWRQcm9wZXJ0eVZhbHVlcyA9IEFycmF5LmZyb20oXHJcblx0XHRcdHRoaXMucHJvcGVydHlWYWx1ZU1hcC5rZXlzKClcclxuXHRcdCkuc29ydCgoYSwgYikgPT5cclxuXHRcdFx0dGhpcy5nZXRTb3J0VmFsdWUoYSkubG9jYWxlQ29tcGFyZSh0aGlzLmdldFNvcnRWYWx1ZShiKSlcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgc29ydCB2YWx1ZSBmb3IgYSBwcm9wZXJ0eSB2YWx1ZVxyXG5cdCAqIFNwZWNpYWwgaGFuZGxpbmcgZm9yIGNlcnRhaW4gcHJvcGVydHkgdHlwZXNcclxuXHQgKi9cclxuXHRwcml2YXRlIGdldFNvcnRWYWx1ZSh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIHByaW9yaXRpZXNcclxuXHRcdGlmICh0aGlzLnByb3BlcnR5S2V5ID09PSBcInByaW9yaXR5XCIpIHtcclxuXHRcdFx0Ly8gU29ydCBudW1lcmljYWxseSwgd2l0aCB1bmRlZmluZWQgcHJpb3JpdHkgbGFzdFxyXG5cdFx0XHRpZiAodmFsdWUgPT09IHQoXCJOb25lXCIpKSByZXR1cm4gXCI5OTlcIjsgLy8gTm9uZSBnb2VzIGxhc3RcclxuXHRcdFx0cmV0dXJuIHZhbHVlLnBhZFN0YXJ0KDMsIFwiMFwiKTsgLy8gUGFkIHdpdGggemVyb3MgZm9yIGNvcnJlY3QgbnVtZXJpYyBzb3J0aW5nXHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRm9yIGRhdGVzLCBjb252ZXJ0IHRvIHRpbWVzdGFtcFxyXG5cdFx0aWYgKFxyXG5cdFx0XHRbXCJkdWVEYXRlXCIsIFwic3RhcnREYXRlXCIsIFwic2NoZWR1bGVkRGF0ZVwiXS5pbmNsdWRlcyh0aGlzLnByb3BlcnR5S2V5KVxyXG5cdFx0KSB7XHJcblx0XHRcdGlmICh2YWx1ZSA9PT0gdChcIk5vbmVcIikpIHJldHVybiBcIjk5OTktMTItMzFcIjsgLy8gTm9uZSBnb2VzIGxhc3RcclxuXHRcdFx0cmV0dXJuIHZhbHVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB2YWx1ZTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEV4dHJhY3QgdmFsdWVzIGZvciB0aGUgc2VsZWN0ZWQgcHJvcGVydHkgZnJvbSBhIHRhc2tcclxuXHQgKi9cclxuXHRwcml2YXRlIGdldFByb3BlcnR5VmFsdWVzKHRhc2s6IFRhc2spOiBhbnlbXSB7XHJcblx0XHRzd2l0Y2ggKHRoaXMucHJvcGVydHlLZXkpIHtcclxuXHRcdFx0Y2FzZSBcInRhZ3NcIjpcclxuXHRcdFx0XHRyZXR1cm4gdGFzay5tZXRhZGF0YS50YWdzIHx8IFtdO1xyXG5cdFx0XHRjYXNlIFwicHJvamVjdFwiOlxyXG5cdFx0XHRcdGNvbnN0IGVmZmVjdGl2ZVByb2plY3QgPSBnZXRFZmZlY3RpdmVQcm9qZWN0KHRhc2spO1xyXG5cdFx0XHRcdHJldHVybiBlZmZlY3RpdmVQcm9qZWN0ID8gW2VmZmVjdGl2ZVByb2plY3RdIDogW107XHJcblx0XHRcdGNhc2UgXCJwcmlvcml0eVwiOlxyXG5cdFx0XHRcdHJldHVybiB0YXNrLm1ldGFkYXRhLnByaW9yaXR5ICE9PSB1bmRlZmluZWRcclxuXHRcdFx0XHRcdD8gW3Rhc2subWV0YWRhdGEucHJpb3JpdHkudG9TdHJpbmcoKV1cclxuXHRcdFx0XHRcdDogW107XHJcblx0XHRcdGNhc2UgXCJjb250ZXh0XCI6XHJcblx0XHRcdFx0cmV0dXJuIHRhc2subWV0YWRhdGEuY29udGV4dCA/IFt0YXNrLm1ldGFkYXRhLmNvbnRleHRdIDogW107XHJcblx0XHRcdGNhc2UgXCJzdGF0dXNcIjpcclxuXHRcdFx0XHRyZXR1cm4gW3Rhc2suc3RhdHVzIHx8IFwiXCJdO1xyXG5cdFx0XHRjYXNlIFwiZHVlRGF0ZVwiOlxyXG5cdFx0XHRcdHJldHVybiB0YXNrLm1ldGFkYXRhLmR1ZURhdGVcclxuXHRcdFx0XHRcdD8gW3RoaXMuZm9ybWF0RGF0ZSh0YXNrLm1ldGFkYXRhLmR1ZURhdGUpXVxyXG5cdFx0XHRcdFx0OiBbXTtcclxuXHRcdFx0Y2FzZSBcInN0YXJ0RGF0ZVwiOlxyXG5cdFx0XHRcdHJldHVybiB0YXNrLm1ldGFkYXRhLnN0YXJ0RGF0ZVxyXG5cdFx0XHRcdFx0PyBbdGhpcy5mb3JtYXREYXRlKHRhc2subWV0YWRhdGEuc3RhcnREYXRlKV1cclxuXHRcdFx0XHRcdDogW107XHJcblx0XHRcdGNhc2UgXCJzY2hlZHVsZWREYXRlXCI6XHJcblx0XHRcdFx0cmV0dXJuIHRhc2subWV0YWRhdGEuc2NoZWR1bGVkRGF0ZVxyXG5cdFx0XHRcdFx0PyBbdGhpcy5mb3JtYXREYXRlKHRhc2subWV0YWRhdGEuc2NoZWR1bGVkRGF0ZSldXHJcblx0XHRcdFx0XHQ6IFtdO1xyXG5cdFx0XHRjYXNlIFwiY2FuY2VsbGVkRGF0ZVwiOlxyXG5cdFx0XHRcdHJldHVybiB0YXNrLm1ldGFkYXRhLmNhbmNlbGxlZERhdGVcclxuXHRcdFx0XHRcdD8gW3RoaXMuZm9ybWF0RGF0ZSh0YXNrLm1ldGFkYXRhLmNhbmNlbGxlZERhdGUpXVxyXG5cdFx0XHRcdFx0OiBbXTtcclxuXHRcdFx0Y2FzZSBcImZpbGVQYXRoXCI6XHJcblx0XHRcdFx0Ly8gRXh0cmFjdCBqdXN0IHRoZSBmaWxlbmFtZSB3aXRob3V0IHBhdGggYW5kIGV4dGVuc2lvblxyXG5cdFx0XHRcdGNvbnN0IHBhdGhQYXJ0cyA9IHRhc2suZmlsZVBhdGguc3BsaXQoXCIvXCIpO1xyXG5cdFx0XHRcdGNvbnN0IGZpbGVOYW1lID0gcGF0aFBhcnRzW3BhdGhQYXJ0cy5sZW5ndGggLSAxXS5yZXBsYWNlKFxyXG5cdFx0XHRcdFx0L1xcLlteLy5dKyQvLFxyXG5cdFx0XHRcdFx0XCJcIlxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0cmV0dXJuIFtmaWxlTmFtZV07XHJcblx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0cmV0dXJuIFtdO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRm9ybWF0IGRhdGUgYXMgWVlZWS1NTS1ERFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZm9ybWF0RGF0ZSh0aW1lc3RhbXA6IG51bWJlcik6IHN0cmluZyB7XHJcblx0XHRyZXR1cm4gdGltZXN0YW1wVG9Mb2NhbERhdGVTdHJpbmcodGltZXN0YW1wKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbmRlciB0aGUgbGlzdCBvZiBwcm9wZXJ0eSB2YWx1ZXMgaW4gdGhlIGxlZnQgY29sdW1uXHJcblx0ICovXHJcblx0cHJvdGVjdGVkIHJlbmRlckl0ZW1zTGlzdCgpOiB2b2lkIHtcclxuXHRcdHRoaXMuaXRlbXNMaXN0RWwuZW1wdHkoKTtcclxuXHJcblx0XHQvLyBVcGRhdGUgdGhlIGVtcHR5IHN0YXRlIGlmIG5vIHByb3BlcnR5IHZhbHVlcyBleGlzdFxyXG5cdFx0aWYgKHRoaXMuc29ydGVkUHJvcGVydHlWYWx1ZXMubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdGNvbnN0IGVtcHR5RWwgPSB0aGlzLml0ZW1zTGlzdEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcInRhc2stcHJvcGVydHktZW1wdHktc3RhdGVcIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdGVtcHR5RWwuc2V0VGV4dCh0KFwiTm8gaXRlbXMgZm91bmRcIikpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGEgbGlzdCBpdGVtIGZvciBlYWNoIHByb3BlcnR5IHZhbHVlXHJcblx0XHRmb3IgKGNvbnN0IHZhbHVlIG9mIHRoaXMuc29ydGVkUHJvcGVydHlWYWx1ZXMpIHtcclxuXHRcdFx0Y29uc3QgdGFza3MgPSB0aGlzLnByb3BlcnR5VmFsdWVNYXAuZ2V0KHZhbHVlKSB8fCBbXTtcclxuXHRcdFx0Y29uc3QgaXRlbUVsID0gdGhpcy5pdGVtc0xpc3RFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJ0YXNrLXByb3BlcnR5LWxpc3QtaXRlbVwiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIEFkZCBzZWxlY3Rpb24gaGlnaGxpZ2h0aW5nXHJcblx0XHRcdGlmICh0aGlzLnNlbGVjdGVkSXRlbXMuaXRlbXMuaW5jbHVkZXModmFsdWUpKSB7XHJcblx0XHRcdFx0aXRlbUVsLmFkZENsYXNzKFwic2VsZWN0ZWRcIik7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENyZWF0ZSB0aGUgaXRlbSB3aXRoIGljb24gYW5kIGNvdW50XHJcblx0XHRcdGNvbnN0IGljb25FbCA9IGl0ZW1FbC5jcmVhdGVTcGFuKHtcclxuXHRcdFx0XHRjbHM6IFwidGFzay1wcm9wZXJ0eS1pY29uXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRzZXRJY29uKGljb25FbCwgdGhpcy5jb25maWcuaXRlbUljb24pO1xyXG5cclxuXHRcdFx0Y29uc3QgbmFtZUVsID0gaXRlbUVsLmNyZWF0ZVNwYW4oe1xyXG5cdFx0XHRcdGNsczogXCJ0YXNrLXByb3BlcnR5LW5hbWVcIixcclxuXHRcdFx0XHR0ZXh0OiB0aGlzLmZvcm1hdERpc3BsYXlWYWx1ZSh2YWx1ZSksXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgY291bnRFbCA9IGl0ZW1FbC5jcmVhdGVTcGFuKHtcclxuXHRcdFx0XHRjbHM6IFwidGFzay1wcm9wZXJ0eS1jb3VudFwiLFxyXG5cdFx0XHRcdHRleHQ6IFN0cmluZyh0YXNrcy5sZW5ndGgpLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIEhhbmRsZSBpdGVtIHNlbGVjdGlvblxyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoaXRlbUVsLCBcImNsaWNrXCIsIChldmVudDogTW91c2VFdmVudCkgPT4ge1xyXG5cdFx0XHRcdC8vIFVzaW5nIEN0cmwvQ21kIGtleSBhbGxvd3MgbXVsdGktc2VsZWN0XHJcblx0XHRcdFx0Y29uc3QgaXNDdHJsUHJlc3NlZCA9IGV2ZW50LmN0cmxLZXkgfHwgZXZlbnQubWV0YUtleTtcclxuXHRcdFx0XHR0aGlzLmhhbmRsZUl0ZW1TZWxlY3Rpb24odmFsdWUsIGlzQ3RybFByZXNzZWQpO1xyXG5cdFx0XHRcdHRoaXMucmVuZGVySXRlbXNMaXN0KCk7IC8vIFJlZnJlc2ggdG8gdXBkYXRlIHNlbGVjdGlvbiB2aXN1YWxzXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRm9ybWF0IGRpc3BsYXkgdmFsdWUgYmFzZWQgb24gcHJvcGVydHkgdHlwZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZm9ybWF0RGlzcGxheVZhbHVlKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0aWYgKHRoaXMucHJvcGVydHlLZXkgPT09IFwicHJpb3JpdHlcIikge1xyXG5cdFx0XHRzd2l0Y2ggKHZhbHVlKSB7XHJcblx0XHRcdFx0Y2FzZSBcIjFcIjpcclxuXHRcdFx0XHRcdHJldHVybiB0KFwiSGlnaCBQcmlvcml0eVwiKTtcclxuXHRcdFx0XHRjYXNlIFwiMlwiOlxyXG5cdFx0XHRcdFx0cmV0dXJuIHQoXCJNZWRpdW0gUHJpb3JpdHlcIik7XHJcblx0XHRcdFx0Y2FzZSBcIjNcIjpcclxuXHRcdFx0XHRcdHJldHVybiB0KFwiTG93IFByaW9yaXR5XCIpO1xyXG5cdFx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0XHRyZXR1cm4gdmFsdWU7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBGb3IgZGF0ZXMsIGNvdWxkIGFkZCBcIlRvZGF5XCIsIFwiVG9tb3Jyb3dcIiwgZXRjLlxyXG5cdFx0aWYgKFxyXG5cdFx0XHRbXCJkdWVEYXRlXCIsIFwic3RhcnREYXRlXCIsIFwic2NoZWR1bGVkRGF0ZVwiLCBcImNhbmNlbGxlZERhdGVcIl0uaW5jbHVkZXMoXHJcblx0XHRcdFx0dGhpcy5wcm9wZXJ0eUtleVxyXG5cdFx0XHQpXHJcblx0XHQpIHtcclxuXHRcdFx0Y29uc3QgdG9kYXkgPSB0aGlzLmZvcm1hdERhdGUoRGF0ZS5ub3coKSk7XHJcblx0XHRcdGlmICh2YWx1ZSA9PT0gdG9kYXkpIHJldHVybiB0KFwiVG9kYXlcIik7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHZhbHVlO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIHRhc2tzIHNob3duIGluIHRoZSByaWdodCBjb2x1bW4gYmFzZWQgb24gc2VsZWN0ZWQgcHJvcGVydHkgdmFsdWVzXHJcblx0ICovXHJcblx0cHJvdGVjdGVkIHVwZGF0ZVNlbGVjdGVkVGFza3MoKTogdm9pZCB7XHJcblx0XHQvLyBHZXQgdGFza3MgZm9yIHRoZSBzZWxlY3RlZCBwcm9wZXJ0eSB2YWx1ZXNcclxuXHRcdHRoaXMuZmlsdGVyZWRUYXNrcyA9IFtdO1xyXG5cclxuXHRcdC8vIElmIG5vIHNlbGVjdGlvbiwgc2hvdyBhbGwgdGFza3MgKG9yIGVtcHR5KVxyXG5cdFx0aWYgKHRoaXMuc2VsZWN0ZWRJdGVtcy5pdGVtcy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0dGhpcy5jbGVhbnVwUmVuZGVyZXJzKCk7XHJcblx0XHRcdHRoaXMucmVuZGVyRW1wdHlUYXNrTGlzdCh0KHRoaXMuY29uZmlnLmVtcHR5U3RhdGVUZXh0KSk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBHYXRoZXIgdGFza3MgZnJvbSBhbGwgc2VsZWN0ZWQgcHJvcGVydHkgdmFsdWVzXHJcblx0XHRmb3IgKGNvbnN0IHZhbHVlIG9mIHRoaXMuc2VsZWN0ZWRJdGVtcy5pdGVtcykge1xyXG5cdFx0XHRjb25zdCB0YXNrcyA9IHRoaXMucHJvcGVydHlWYWx1ZU1hcC5nZXQodmFsdWUpIHx8IFtdO1xyXG5cclxuXHRcdFx0Ly8gQXZvaWQgYWRkaW5nIGR1cGxpY2F0ZXNcclxuXHRcdFx0Zm9yIChjb25zdCB0YXNrIG9mIHRhc2tzKSB7XHJcblx0XHRcdFx0aWYgKCF0aGlzLmZpbHRlcmVkVGFza3Muc29tZSgodCkgPT4gdC5pZCA9PT0gdGFzay5pZCkpIHtcclxuXHRcdFx0XHRcdHRoaXMuZmlsdGVyZWRUYXNrcy5wdXNoKHRhc2spO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlbWVtYmVyIHRhc2tzIGluIHNlbGVjdGlvbiBzdGF0ZSBmb3Igb3RoZXIgbWV0aG9kc1xyXG5cdFx0dGhpcy5zZWxlY3RlZEl0ZW1zLnRhc2tzID0gdGhpcy5maWx0ZXJlZFRhc2tzO1xyXG5cclxuXHRcdC8vIFJlbmRlciB0aGUgdGFzayBsaXN0XHJcblx0XHR0aGlzLnJlbmRlclRhc2tMaXN0KCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBIYW5kbGUgdGFzayB1cGRhdGVzIGJ5IHJlYnVpbGRpbmcgdGhlIGFmZmVjdGVkIHBhcnRzIG9mIHRoZSBpbmRleFxyXG5cdCAqL1xyXG5cdHB1YmxpYyB1cGRhdGVUYXNrKHVwZGF0ZWRUYXNrOiBUYXNrKTogdm9pZCB7XHJcblx0XHQvLyBGaW5kIGlmIHRoZSB0YXNrIHdhcyBwcmV2aW91c2x5IGluZGV4ZWRcclxuXHRcdGxldCBvbGRWYWx1ZXM6IHN0cmluZ1tdID0gW107XHJcblx0XHRmb3IgKGNvbnN0IFt2YWx1ZSwgdGFza3NdIG9mIHRoaXMucHJvcGVydHlWYWx1ZU1hcCkge1xyXG5cdFx0XHRpZiAodGFza3Muc29tZSgodGFzaykgPT4gdGFzay5pZCA9PT0gdXBkYXRlZFRhc2suaWQpKSB7XHJcblx0XHRcdFx0b2xkVmFsdWVzLnB1c2godmFsdWUpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIHRoZSB0YXNrIGZyb20gaXRzIG9sZCBwcm9wZXJ0eSB2YWx1ZXNcclxuXHRcdGZvciAoY29uc3QgdmFsdWUgb2Ygb2xkVmFsdWVzKSB7XHJcblx0XHRcdGNvbnN0IHRhc2tzID0gdGhpcy5wcm9wZXJ0eVZhbHVlTWFwLmdldCh2YWx1ZSkgfHwgW107XHJcblx0XHRcdHRoaXMucHJvcGVydHlWYWx1ZU1hcC5zZXQoXHJcblx0XHRcdFx0dmFsdWUsXHJcblx0XHRcdFx0dGFza3MuZmlsdGVyKCh0YXNrKSA9PiB0YXNrLmlkICE9PSB1cGRhdGVkVGFzay5pZClcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIElmIG5vIHRhc2tzIGxlZnQgZm9yIHRoaXMgdmFsdWUsIHJlbW92ZSB0aGUgcHJvcGVydHkgdmFsdWVcclxuXHRcdFx0aWYgKHRoaXMucHJvcGVydHlWYWx1ZU1hcC5nZXQodmFsdWUpPy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0XHR0aGlzLnByb3BlcnR5VmFsdWVNYXAuZGVsZXRlKHZhbHVlKTtcclxuXHRcdFx0XHR0aGlzLnNvcnRlZFByb3BlcnR5VmFsdWVzID0gdGhpcy5zb3J0ZWRQcm9wZXJ0eVZhbHVlcy5maWx0ZXIoXHJcblx0XHRcdFx0XHQodikgPT4gdiAhPT0gdmFsdWVcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWRkIHRoZSB0YXNrIHRvIGl0cyBuZXcgcHJvcGVydHkgdmFsdWVzXHJcblx0XHRjb25zdCBuZXdWYWx1ZXMgPSB0aGlzLmdldFByb3BlcnR5VmFsdWVzKHVwZGF0ZWRUYXNrKTtcclxuXHRcdGZvciAoY29uc3QgdmFsdWUgb2YgbmV3VmFsdWVzKSB7XHJcblx0XHRcdGNvbnN0IG5vcm1hbGl6ZWRWYWx1ZSA9IFN0cmluZyh2YWx1ZSk7XHJcblx0XHRcdGlmICghdGhpcy5wcm9wZXJ0eVZhbHVlTWFwLmhhcyhub3JtYWxpemVkVmFsdWUpKSB7XHJcblx0XHRcdFx0dGhpcy5wcm9wZXJ0eVZhbHVlTWFwLnNldChub3JtYWxpemVkVmFsdWUsIFtdKTtcclxuXHRcdFx0XHR0aGlzLnNvcnRlZFByb3BlcnR5VmFsdWVzLnB1c2gobm9ybWFsaXplZFZhbHVlKTtcclxuXHRcdFx0XHQvLyBSZXNvcnQgdGhlIHByb3BlcnR5IHZhbHVlc1xyXG5cdFx0XHRcdHRoaXMuc29ydGVkUHJvcGVydHlWYWx1ZXMuc29ydCgoYSwgYikgPT5cclxuXHRcdFx0XHRcdHRoaXMuZ2V0U29ydFZhbHVlKGEpLmxvY2FsZUNvbXBhcmUodGhpcy5nZXRTb3J0VmFsdWUoYikpXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGlzLnByb3BlcnR5VmFsdWVNYXAuZ2V0KG5vcm1hbGl6ZWRWYWx1ZSk/LnB1c2godXBkYXRlZFRhc2spO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIElmIHRoZSB0YXNrIGlzIGluIHRoZSBmaWx0ZXJlZCB0YXNrcywgdXBkYXRlIGl0IHRoZXJlIHRvb1xyXG5cdFx0Y29uc3QgdGFza0luZGV4ID0gdGhpcy5maWx0ZXJlZFRhc2tzLmZpbmRJbmRleChcclxuXHRcdFx0KHRhc2spID0+IHRhc2suaWQgPT09IHVwZGF0ZWRUYXNrLmlkXHJcblx0XHQpO1xyXG5cdFx0aWYgKHRhc2tJbmRleCA+PSAwKSB7XHJcblx0XHRcdHRoaXMuZmlsdGVyZWRUYXNrc1t0YXNrSW5kZXhdID0gdXBkYXRlZFRhc2s7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHRoZSB0YXNrIGluIHRoZSBhbGxUYXNrcyBhcnJheSB0b29cclxuXHRcdGNvbnN0IGFsbFRhc2tJbmRleCA9IHRoaXMuYWxsVGFza3MuZmluZEluZGV4KFxyXG5cdFx0XHQodGFzaykgPT4gdGFzay5pZCA9PT0gdXBkYXRlZFRhc2suaWRcclxuXHRcdCk7XHJcblx0XHRpZiAoYWxsVGFza0luZGV4ID49IDApIHtcclxuXHRcdFx0dGhpcy5hbGxUYXNrc1thbGxUYXNrSW5kZXhdID0gdXBkYXRlZFRhc2s7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUmUtcmVuZGVyIHRoZSBVSSB0byByZWZsZWN0IGNoYW5nZXNcclxuXHRcdHRoaXMucmVuZGVySXRlbXNMaXN0KCk7XHJcblx0XHRpZiAodGhpcy5maWx0ZXJlZFRhc2tzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0dGhpcy5yZW5kZXJUYXNrTGlzdCgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHRoZSB2aWV3IElEIGFzc29jaWF0ZWQgd2l0aCB0aGlzIGNvbXBvbmVudFxyXG5cdCAqL1xyXG5cdHB1YmxpYyBnZXRWaWV3SWQoKTogc3RyaW5nIHtcclxuXHRcdHJldHVybiB0aGlzLnZpZXdJZCB8fCBcIlwiO1xyXG5cdH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCBhbiBhcHByb3ByaWF0ZSBpY29uIG5hbWUgZm9yIGEgcHJvcGVydHkgdHlwZVxyXG4gKi9cclxuZnVuY3Rpb24gZ2V0SWNvbkZvclByb3BlcnR5KHByb3BlcnR5S2V5OiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdHN3aXRjaCAocHJvcGVydHlLZXkpIHtcclxuXHRcdGNhc2UgXCJ0YWdzXCI6XHJcblx0XHRcdHJldHVybiBcInRhZ1wiO1xyXG5cdFx0Y2FzZSBcInByb2plY3RcIjpcclxuXHRcdFx0cmV0dXJuIFwiZm9sZGVyXCI7XHJcblx0XHRjYXNlIFwicHJpb3JpdHlcIjpcclxuXHRcdFx0cmV0dXJuIFwiYWxlcnQtdHJpYW5nbGVcIjtcclxuXHRcdGNhc2UgXCJjb250ZXh0XCI6XHJcblx0XHRcdHJldHVybiBcImF0LXNpZ25cIjtcclxuXHRcdGNhc2UgXCJzdGF0dXNcIjpcclxuXHRcdFx0cmV0dXJuIFwiY2hlY2stc3F1YXJlXCI7XHJcblx0XHRjYXNlIFwiZHVlRGF0ZVwiOlxyXG5cdFx0XHRyZXR1cm4gXCJjYWxlbmRhclwiO1xyXG5cdFx0Y2FzZSBcInN0YXJ0RGF0ZVwiOlxyXG5cdFx0XHRyZXR1cm4gXCJwbGF5XCI7XHJcblx0XHRjYXNlIFwic2NoZWR1bGVkRGF0ZVwiOlxyXG5cdFx0XHRyZXR1cm4gXCJjYWxlbmRhci1jbG9ja1wiO1xyXG5cdFx0Y2FzZSBcImZpbGVQYXRoXCI6XHJcblx0XHRcdHJldHVybiBcImZpbGVcIjtcclxuXHRcdGRlZmF1bHQ6XHJcblx0XHRcdHJldHVybiBcImxpc3RcIjtcclxuXHR9XHJcbn1cclxuIl19