import { Component } from "obsidian";
import { TableView } from "./TableView";
/**
 * Table view adapter to make TableView compatible with ViewComponentManager
 */
export class TableViewAdapter extends Component {
    constructor(app, plugin, parentEl, config, callbacks) {
        super();
        this.app = app;
        this.plugin = plugin;
        this.parentEl = parentEl;
        this.config = config;
        this.callbacks = callbacks;
        // Create container
        this.containerEl = this.parentEl.createDiv("table-view-adapter");
        // Create table view with all callbacks
        this.tableView = new TableView(this.app, this.plugin, this.containerEl, this.config, {
            onTaskSelected: this.callbacks.onTaskSelected,
            onTaskCompleted: this.callbacks.onTaskCompleted,
            onTaskContextMenu: this.callbacks.onTaskContextMenu,
            onTaskUpdated: this.callbacks.onTaskUpdated,
        });
    }
    onload() {
        this.addChild(this.tableView);
        this.tableView.load();
    }
    onunload() {
        this.tableView.unload();
        this.removeChild(this.tableView);
    }
    /**
     * Update tasks in the table view
     */
    updateTasks(tasks) {
        this.tableView.updateTasks(tasks);
    }
    /**
     * Set tasks (alias for updateTasks for compatibility)
     */
    setTasks(tasks, allTasks) {
        this.updateTasks(tasks);
    }
    /**
     * Toggle tree view mode
     */
    toggleTreeView() {
        this.tableView.toggleTreeView();
    }
    /**
     * Get selected tasks
     */
    getSelectedTasks() {
        return this.tableView.getSelectedTasks();
    }
    /**
     * Clear selection
     */
    clearSelection() {
        this.tableView.clearSelection();
    }
    /**
     * Export table data
     */
    exportData() {
        return this.tableView.exportData();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGFibGVWaWV3QWRhcHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlRhYmxlVmlld0FkYXB0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFNBQVMsRUFBTyxNQUFNLFVBQVUsQ0FBQztBQUUxQyxPQUFPLEVBQUUsU0FBUyxFQUFzQixNQUFNLGFBQWEsQ0FBQztBQUk1RDs7R0FFRztBQUNILE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxTQUFTO0lBSTlDLFlBQ1MsR0FBUSxFQUNSLE1BQTZCLEVBQzdCLFFBQXFCLEVBQ3JCLE1BQTJCLEVBQzNCLFNBQTZCO1FBRXJDLEtBQUssRUFBRSxDQUFDO1FBTkEsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUNSLFdBQU0sR0FBTixNQUFNLENBQXVCO1FBQzdCLGFBQVEsR0FBUixRQUFRLENBQWE7UUFDckIsV0FBTSxHQUFOLE1BQU0sQ0FBcUI7UUFDM0IsY0FBUyxHQUFULFNBQVMsQ0FBb0I7UUFJckMsbUJBQW1CO1FBQ25CLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUVqRSx1Q0FBdUM7UUFDdkMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLFNBQVMsQ0FDN0IsSUFBSSxDQUFDLEdBQUcsRUFDUixJQUFJLENBQUMsTUFBTSxFQUNYLElBQUksQ0FBQyxXQUFXLEVBQ2hCLElBQUksQ0FBQyxNQUFNLEVBQ1g7WUFDQyxjQUFjLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjO1lBQzdDLGVBQWUsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLGVBQWU7WUFDL0MsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUI7WUFDbkQsYUFBYSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYTtTQUMzQyxDQUNELENBQUM7SUFDSCxDQUFDO0lBRUQsTUFBTTtRQUNMLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzlCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDdkIsQ0FBQztJQUVELFFBQVE7UUFDUCxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3hCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFRDs7T0FFRztJQUNJLFdBQVcsQ0FBQyxLQUFhO1FBQy9CLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFFRDs7T0FFRztJQUNJLFFBQVEsQ0FBQyxLQUFhLEVBQUUsUUFBaUI7UUFDL0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN6QixDQUFDO0lBRUQ7O09BRUc7SUFDSSxjQUFjO1FBQ3BCLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDakMsQ0FBQztJQUVEOztPQUVHO0lBQ0ksZ0JBQWdCO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0lBQzFDLENBQUM7SUFFRDs7T0FFRztJQUNJLGNBQWM7UUFDcEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUNqQyxDQUFDO0lBRUQ7O09BRUc7SUFDSSxVQUFVO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUNwQyxDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQsIEFwcCB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBUYXNrIH0gZnJvbSBcIkAvdHlwZXMvdGFza1wiO1xyXG5pbXBvcnQgeyBUYWJsZVZpZXcsIFRhYmxlVmlld0NhbGxiYWNrcyB9IGZyb20gXCIuL1RhYmxlVmlld1wiO1xyXG5pbXBvcnQgeyBUYWJsZVNwZWNpZmljQ29uZmlnIH0gZnJvbSBcIi4uLy4uLy4uL2NvbW1vbi9zZXR0aW5nLWRlZmluaXRpb25cIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5cclxuLyoqXHJcbiAqIFRhYmxlIHZpZXcgYWRhcHRlciB0byBtYWtlIFRhYmxlVmlldyBjb21wYXRpYmxlIHdpdGggVmlld0NvbXBvbmVudE1hbmFnZXJcclxuICovXHJcbmV4cG9ydCBjbGFzcyBUYWJsZVZpZXdBZGFwdGVyIGV4dGVuZHMgQ29tcG9uZW50IHtcclxuXHRwdWJsaWMgY29udGFpbmVyRWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgdGFibGVWaWV3OiBUYWJsZVZpZXc7XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cHJpdmF0ZSBhcHA6IEFwcCxcclxuXHRcdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRwcml2YXRlIHBhcmVudEVsOiBIVE1MRWxlbWVudCxcclxuXHRcdHByaXZhdGUgY29uZmlnOiBUYWJsZVNwZWNpZmljQ29uZmlnLFxyXG5cdFx0cHJpdmF0ZSBjYWxsYmFja3M6IFRhYmxlVmlld0NhbGxiYWNrc1xyXG5cdCkge1xyXG5cdFx0c3VwZXIoKTtcclxuXHJcblx0XHQvLyBDcmVhdGUgY29udGFpbmVyXHJcblx0XHR0aGlzLmNvbnRhaW5lckVsID0gdGhpcy5wYXJlbnRFbC5jcmVhdGVEaXYoXCJ0YWJsZS12aWV3LWFkYXB0ZXJcIik7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIHRhYmxlIHZpZXcgd2l0aCBhbGwgY2FsbGJhY2tzXHJcblx0XHR0aGlzLnRhYmxlVmlldyA9IG5ldyBUYWJsZVZpZXcoXHJcblx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0dGhpcy5jb250YWluZXJFbCxcclxuXHRcdFx0dGhpcy5jb25maWcsXHJcblx0XHRcdHtcclxuXHRcdFx0XHRvblRhc2tTZWxlY3RlZDogdGhpcy5jYWxsYmFja3Mub25UYXNrU2VsZWN0ZWQsXHJcblx0XHRcdFx0b25UYXNrQ29tcGxldGVkOiB0aGlzLmNhbGxiYWNrcy5vblRhc2tDb21wbGV0ZWQsXHJcblx0XHRcdFx0b25UYXNrQ29udGV4dE1lbnU6IHRoaXMuY2FsbGJhY2tzLm9uVGFza0NvbnRleHRNZW51LFxyXG5cdFx0XHRcdG9uVGFza1VwZGF0ZWQ6IHRoaXMuY2FsbGJhY2tzLm9uVGFza1VwZGF0ZWQsXHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHRvbmxvYWQoKSB7XHJcblx0XHR0aGlzLmFkZENoaWxkKHRoaXMudGFibGVWaWV3KTtcclxuXHRcdHRoaXMudGFibGVWaWV3LmxvYWQoKTtcclxuXHR9XHJcblxyXG5cdG9udW5sb2FkKCkge1xyXG5cdFx0dGhpcy50YWJsZVZpZXcudW5sb2FkKCk7XHJcblx0XHR0aGlzLnJlbW92ZUNoaWxkKHRoaXMudGFibGVWaWV3KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSB0YXNrcyBpbiB0aGUgdGFibGUgdmlld1xyXG5cdCAqL1xyXG5cdHB1YmxpYyB1cGRhdGVUYXNrcyh0YXNrczogVGFza1tdKSB7XHJcblx0XHR0aGlzLnRhYmxlVmlldy51cGRhdGVUYXNrcyh0YXNrcyk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTZXQgdGFza3MgKGFsaWFzIGZvciB1cGRhdGVUYXNrcyBmb3IgY29tcGF0aWJpbGl0eSlcclxuXHQgKi9cclxuXHRwdWJsaWMgc2V0VGFza3ModGFza3M6IFRhc2tbXSwgYWxsVGFza3M/OiBUYXNrW10pIHtcclxuXHRcdHRoaXMudXBkYXRlVGFza3ModGFza3MpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVG9nZ2xlIHRyZWUgdmlldyBtb2RlXHJcblx0ICovXHJcblx0cHVibGljIHRvZ2dsZVRyZWVWaWV3KCkge1xyXG5cdFx0dGhpcy50YWJsZVZpZXcudG9nZ2xlVHJlZVZpZXcoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBzZWxlY3RlZCB0YXNrc1xyXG5cdCAqL1xyXG5cdHB1YmxpYyBnZXRTZWxlY3RlZFRhc2tzKCk6IFRhc2tbXSB7XHJcblx0XHRyZXR1cm4gdGhpcy50YWJsZVZpZXcuZ2V0U2VsZWN0ZWRUYXNrcygpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2xlYXIgc2VsZWN0aW9uXHJcblx0ICovXHJcblx0cHVibGljIGNsZWFyU2VsZWN0aW9uKCkge1xyXG5cdFx0dGhpcy50YWJsZVZpZXcuY2xlYXJTZWxlY3Rpb24oKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEV4cG9ydCB0YWJsZSBkYXRhXHJcblx0ICovXHJcblx0cHVibGljIGV4cG9ydERhdGEoKTogYW55W10ge1xyXG5cdFx0cmV0dXJuIHRoaXMudGFibGVWaWV3LmV4cG9ydERhdGEoKTtcclxuXHR9XHJcbn1cclxuIl19