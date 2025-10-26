import { Component, setIcon } from "obsidian";
import { t } from "@/translations/helper";
/**
 * Table header component for displaying task count, controls, and column toggles
 */
export class TableHeader extends Component {
    constructor(containerEl, callbacks = {}) {
        super();
        this.containerEl = containerEl;
        this.taskCount = 0;
        this.isTreeMode = false;
        this.availableColumns = [];
        this.callbacks = callbacks;
    }
    onload() {
        this.render();
    }
    onunload() {
        if (this.headerEl) {
            this.headerEl.remove();
        }
    }
    /**
     * Update task count display
     */
    updateTaskCount(count) {
        this.taskCount = count;
        this.updateTaskCountDisplay();
    }
    /**
     * Update tree mode state
     */
    updateTreeMode(enabled) {
        this.isTreeMode = enabled;
        this.updateTreeModeDisplay();
    }
    /**
     * Update available columns
     */
    updateColumns(columns) {
        this.availableColumns = columns;
        this.updateColumnToggles();
    }
    /**
     * Render the header component
     */
    render() {
        this.headerEl = this.containerEl.createDiv("task-table-header-bar");
        // Left section - Task count and info
        const leftSection = this.headerEl.createDiv("table-header-left");
        this.createTaskCountDisplay(leftSection);
        // Right section - Controls
        const rightSection = this.headerEl.createDiv("table-header-right");
        this.createControls(rightSection);
    }
    /**
     * Create task count display
     */
    createTaskCountDisplay(container) {
        const countContainer = container.createDiv("task-count-container");
        const countIcon = countContainer.createSpan("task-count-icon");
        setIcon(countIcon, "list-checks");
        const countText = countContainer.createSpan("task-count-text");
        countText.textContent = this.getTaskCountText();
        countText.dataset.countElement = "true";
    }
    /**
     * Get formatted task count text
     */
    getTaskCountText() {
        if (this.taskCount === 0) {
            return t("No tasks");
        }
        else if (this.taskCount === 1) {
            return t("1 task");
        }
        else {
            return `${this.taskCount} ${t("tasks")}`;
        }
    }
    /**
     * Update task count display
     */
    updateTaskCountDisplay() {
        const countElement = this.headerEl.querySelector("[data-count-element]");
        if (countElement) {
            countElement.textContent = this.getTaskCountText();
        }
    }
    /**
     * Create control buttons
     */
    createControls(container) {
        const controlsContainer = container.createDiv("table-controls-container");
        // Tree mode toggle
        this.treeModeBtn = controlsContainer.createEl("button", "table-control-btn tree-mode-btn");
        const treeModeIcon = this.treeModeBtn.createSpan("tree-mode-icon");
        this.updateTreeModeButton();
        this.registerDomEvent(this.treeModeBtn, "click", () => {
            this.toggleTreeMode();
        });
        // Column visibility dropdown
        const columnDropdown = controlsContainer.createDiv("column-dropdown");
        this.columnBtn = columnDropdown.createEl("button", "table-control-btn column-btn");
        const columnIcon = this.columnBtn.createSpan("column-icon");
        setIcon(columnIcon, "eye");
        const columnText = this.columnBtn.createSpan("column-text");
        columnText.textContent = t("Columns");
        const dropdownArrow = this.columnBtn.createSpan("dropdown-arrow");
        setIcon(dropdownArrow, "chevron-down");
        this.columnBtn.title = t("Toggle column visibility");
        const columnMenu = columnDropdown.createDiv("column-dropdown-menu");
        columnMenu.style.display = "none";
        this.registerDomEvent(this.columnBtn, "click", (e) => {
            e.stopPropagation();
            const isVisible = columnMenu.style.display !== "none";
            columnMenu.style.display = isVisible ? "none" : "block";
        });
        // Close dropdown when clicking outside
        this.registerDomEvent(document, "click", () => {
            columnMenu.style.display = "none";
        });
        // Store column menu for later updates
        this.updateColumnDropdown(columnMenu);
    }
    /**
     * Update tree mode button appearance
     */
    updateTreeModeButton() {
        if (!this.treeModeBtn)
            return;
        const icon = this.treeModeBtn.querySelector(".tree-mode-icon");
        if (icon) {
            icon.empty();
            setIcon(icon, this.isTreeMode ? "git-branch" : "list");
            this.treeModeBtn.title = this.isTreeMode
                ? t("Switch to List Mode")
                : t("Switch to Tree Mode");
            this.treeModeBtn.toggleClass("active", this.isTreeMode);
        }
    }
    /**
     * Update tree mode display
     */
    updateTreeModeDisplay() {
        this.updateTreeModeButton();
    }
    /**
     * Toggle tree mode
     */
    toggleTreeMode() {
        this.isTreeMode = !this.isTreeMode;
        this.updateTreeModeDisplay();
        if (this.callbacks.onTreeModeToggle) {
            this.callbacks.onTreeModeToggle(this.isTreeMode);
        }
    }
    /**
     * Update column toggles
     */
    updateColumnToggles() {
        const columnMenu = this.headerEl.querySelector(".column-dropdown-menu");
        if (columnMenu) {
            this.createColumnToggles(columnMenu);
        }
    }
    /**
     * Create column toggle checkboxes
     */
    createColumnToggles(container) {
        container.empty();
        this.availableColumns.forEach((column) => {
            const toggleItem = container.createDiv("column-toggle-item");
            const checkbox = toggleItem.createEl("input", "column-toggle-checkbox");
            checkbox.type = "checkbox";
            checkbox.checked = column.visible;
            checkbox.id = `column-toggle-${column.id}`;
            const label = toggleItem.createEl("label", "column-toggle-label");
            label.htmlFor = checkbox.id;
            label.textContent = column.title;
            this.registerDomEvent(checkbox, "change", () => {
                if (this.callbacks.onColumnToggle) {
                    this.callbacks.onColumnToggle(column.id, checkbox.checked);
                }
            });
        });
    }
    /**
     * Update column dropdown
     */
    updateColumnDropdown(columnMenu) {
        this.createColumnToggles(columnMenu);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGFibGVIZWFkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJUYWJsZUhlYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUM5QyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFRMUM7O0dBRUc7QUFDSCxNQUFNLE9BQU8sV0FBWSxTQUFRLFNBQVM7SUFjekMsWUFDUyxXQUF3QixFQUNoQyxZQUFrQyxFQUFFO1FBRXBDLEtBQUssRUFBRSxDQUFDO1FBSEEsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFiekIsY0FBUyxHQUFXLENBQUMsQ0FBQztRQUN0QixlQUFVLEdBQVksS0FBSyxDQUFDO1FBQzVCLHFCQUFnQixHQUluQixFQUFFLENBQUM7UUFXUCxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztJQUM1QixDQUFDO0lBRUQsTUFBTTtRQUNMLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNmLENBQUM7SUFFRCxRQUFRO1FBQ1AsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ2xCLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7U0FDdkI7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSSxlQUFlLENBQUMsS0FBYTtRQUNuQyxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztRQUN2QixJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztJQUMvQixDQUFDO0lBRUQ7O09BRUc7SUFDSSxjQUFjLENBQUMsT0FBZ0I7UUFDckMsSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUM7UUFDMUIsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUVEOztPQUVHO0lBQ0ksYUFBYSxDQUNuQixPQUErRDtRQUUvRCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsT0FBTyxDQUFDO1FBQ2hDLElBQUks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Q0FBQyxVQUF1QjtRQUNuRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDdEMsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBzZXRJY29uIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFRhYmxlSGVhZGVyQ2FsbGJhY2tzIHtcclxuXHRvblRyZWVNb2RlVG9nZ2xlPzogKGVuYWJsZWQ6IGJvb2xlYW4pID0+IHZvaWQ7XHJcblx0b25SZWZyZXNoPzogKCkgPT4gdm9pZDtcclxuXHRvbkNvbHVtblRvZ2dsZT86IChjb2x1bW5JZDogc3RyaW5nLCB2aXNpYmxlOiBib29sZWFuKSA9PiB2b2lkO1xyXG59XHJcblxyXG4vKipcclxuICogVGFibGUgaGVhZGVyIGNvbXBvbmVudCBmb3IgZGlzcGxheWluZyB0YXNrIGNvdW50LCBjb250cm9scywgYW5kIGNvbHVtbiB0b2dnbGVzXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgVGFibGVIZWFkZXIgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdHByaXZhdGUgaGVhZGVyRWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgdGFza0NvdW50OiBudW1iZXIgPSAwO1xyXG5cdHByaXZhdGUgaXNUcmVlTW9kZTogYm9vbGVhbiA9IGZhbHNlO1xyXG5cdHByaXZhdGUgYXZhaWxhYmxlQ29sdW1uczogQXJyYXk8e1xyXG5cdFx0aWQ6IHN0cmluZztcclxuXHRcdHRpdGxlOiBzdHJpbmc7XHJcblx0XHR2aXNpYmxlOiBib29sZWFuO1xyXG5cdH0+ID0gW107XHJcblx0cHJpdmF0ZSBjYWxsYmFja3M6IFRhYmxlSGVhZGVyQ2FsbGJhY2tzO1xyXG5cdHByaXZhdGUgdHJlZU1vZGVCdG46IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgcmVmcmVzaEJ0bjogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBjb2x1bW5CdG46IEhUTUxFbGVtZW50O1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHByaXZhdGUgY29udGFpbmVyRWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0Y2FsbGJhY2tzOiBUYWJsZUhlYWRlckNhbGxiYWNrcyA9IHt9XHJcblx0KSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5jYWxsYmFja3MgPSBjYWxsYmFja3M7XHJcblx0fVxyXG5cclxuXHRvbmxvYWQoKSB7XHJcblx0XHR0aGlzLnJlbmRlcigpO1xyXG5cdH1cclxuXHJcblx0b251bmxvYWQoKSB7XHJcblx0XHRpZiAodGhpcy5oZWFkZXJFbCkge1xyXG5cdFx0XHR0aGlzLmhlYWRlckVsLnJlbW92ZSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIHRhc2sgY291bnQgZGlzcGxheVxyXG5cdCAqL1xyXG5cdHB1YmxpYyB1cGRhdGVUYXNrQ291bnQoY291bnQ6IG51bWJlcikge1xyXG5cdFx0dGhpcy50YXNrQ291bnQgPSBjb3VudDtcclxuXHRcdHRoaXMudXBkYXRlVGFza0NvdW50RGlzcGxheSgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIHRyZWUgbW9kZSBzdGF0ZVxyXG5cdCAqL1xyXG5cdHB1YmxpYyB1cGRhdGVUcmVlTW9kZShlbmFibGVkOiBib29sZWFuKSB7XHJcblx0XHR0aGlzLmlzVHJlZU1vZGUgPSBlbmFibGVkO1xyXG5cdFx0dGhpcy51cGRhdGVUcmVlTW9kZURpc3BsYXkoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBhdmFpbGFibGUgY29sdW1uc1xyXG5cdCAqL1xyXG5cdHB1YmxpYyB1cGRhdGVDb2x1bW5zKFxyXG5cdFx0Y29sdW1uczogQXJyYXk8eyBpZDogc3RyaW5nOyB0aXRsZTogc3RyaW5nOyB2aXNpYmxlOiBib29sZWFuIH0+XHJcblx0KSB7XHJcblx0XHR0aGlzLmF2YWlsYWJsZUNvbHVtbnMgPSBjb2x1bW5zO1xyXG5cdFx0dGhpcy51cGRhdGVDb2x1bW5Ub2dnbGVzKCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW5kZXIgdGhlIGhlYWRlciBjb21wb25lbnRcclxuXHQgKi9cclxuXHRwcml2YXRlIHJlbmRlcigpIHtcclxuXHRcdHRoaXMuaGVhZGVyRWwgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdihcInRhc2stdGFibGUtaGVhZGVyLWJhclwiKTtcclxuXHJcblx0XHQvLyBMZWZ0IHNlY3Rpb24gLSBUYXNrIGNvdW50IGFuZCBpbmZvXHJcblx0XHRjb25zdCBsZWZ0U2VjdGlvbiA9IHRoaXMuaGVhZGVyRWwuY3JlYXRlRGl2KFwidGFibGUtaGVhZGVyLWxlZnRcIik7XHJcblx0XHR0aGlzLmNyZWF0ZVRhc2tDb3VudERpc3BsYXkobGVmdFNlY3Rpb24pO1xyXG5cclxuXHRcdC8vIFJpZ2h0IHNlY3Rpb24gLSBDb250cm9sc1xyXG5cdFx0Y29uc3QgcmlnaHRTZWN0aW9uID0gdGhpcy5oZWFkZXJFbC5jcmVhdGVEaXYoXCJ0YWJsZS1oZWFkZXItcmlnaHRcIik7XHJcblx0XHR0aGlzLmNyZWF0ZUNvbnRyb2xzKHJpZ2h0U2VjdGlvbik7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDcmVhdGUgdGFzayBjb3VudCBkaXNwbGF5XHJcblx0ICovXHJcblx0cHJpdmF0ZSBjcmVhdGVUYXNrQ291bnREaXNwbGF5KGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpIHtcclxuXHRcdGNvbnN0IGNvdW50Q29udGFpbmVyID0gY29udGFpbmVyLmNyZWF0ZURpdihcInRhc2stY291bnQtY29udGFpbmVyXCIpO1xyXG5cclxuXHRcdGNvbnN0IGNvdW50SWNvbiA9IGNvdW50Q29udGFpbmVyLmNyZWF0ZVNwYW4oXCJ0YXNrLWNvdW50LWljb25cIik7XHJcblx0XHRzZXRJY29uKGNvdW50SWNvbiwgXCJsaXN0LWNoZWNrc1wiKTtcclxuXHJcblx0XHRjb25zdCBjb3VudFRleHQgPSBjb3VudENvbnRhaW5lci5jcmVhdGVTcGFuKFwidGFzay1jb3VudC10ZXh0XCIpO1xyXG5cdFx0Y291bnRUZXh0LnRleHRDb250ZW50ID0gdGhpcy5nZXRUYXNrQ291bnRUZXh0KCk7XHJcblx0XHRjb3VudFRleHQuZGF0YXNldC5jb3VudEVsZW1lbnQgPSBcInRydWVcIjtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBmb3JtYXR0ZWQgdGFzayBjb3VudCB0ZXh0XHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZXRUYXNrQ291bnRUZXh0KCk6IHN0cmluZyB7XHJcblx0XHRpZiAodGhpcy50YXNrQ291bnQgPT09IDApIHtcclxuXHRcdFx0cmV0dXJuIHQoXCJObyB0YXNrc1wiKTtcclxuXHRcdH0gZWxzZSBpZiAodGhpcy50YXNrQ291bnQgPT09IDEpIHtcclxuXHRcdFx0cmV0dXJuIHQoXCIxIHRhc2tcIik7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRyZXR1cm4gYCR7dGhpcy50YXNrQ291bnR9ICR7dChcInRhc2tzXCIpfWA7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgdGFzayBjb3VudCBkaXNwbGF5XHJcblx0ICovXHJcblx0cHJpdmF0ZSB1cGRhdGVUYXNrQ291bnREaXNwbGF5KCkge1xyXG5cdFx0Y29uc3QgY291bnRFbGVtZW50ID0gdGhpcy5oZWFkZXJFbC5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRcIltkYXRhLWNvdW50LWVsZW1lbnRdXCJcclxuXHRcdCk7XHJcblx0XHRpZiAoY291bnRFbGVtZW50KSB7XHJcblx0XHRcdGNvdW50RWxlbWVudC50ZXh0Q29udGVudCA9IHRoaXMuZ2V0VGFza0NvdW50VGV4dCgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ3JlYXRlIGNvbnRyb2wgYnV0dG9uc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgY3JlYXRlQ29udHJvbHMoY29udGFpbmVyOiBIVE1MRWxlbWVudCkge1xyXG5cdFx0Y29uc3QgY29udHJvbHNDb250YWluZXIgPSBjb250YWluZXIuY3JlYXRlRGl2KFxyXG5cdFx0XHRcInRhYmxlLWNvbnRyb2xzLWNvbnRhaW5lclwiXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIFRyZWUgbW9kZSB0b2dnbGVcclxuXHRcdHRoaXMudHJlZU1vZGVCdG4gPSBjb250cm9sc0NvbnRhaW5lci5jcmVhdGVFbChcclxuXHRcdFx0XCJidXR0b25cIixcclxuXHRcdFx0XCJ0YWJsZS1jb250cm9sLWJ0biB0cmVlLW1vZGUtYnRuXCJcclxuXHRcdCk7XHJcblxyXG5cdFx0Y29uc3QgdHJlZU1vZGVJY29uID0gdGhpcy50cmVlTW9kZUJ0bi5jcmVhdGVTcGFuKFwidHJlZS1tb2RlLWljb25cIik7XHJcblxyXG5cdFx0dGhpcy51cGRhdGVUcmVlTW9kZUJ1dHRvbigpO1xyXG5cclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudCh0aGlzLnRyZWVNb2RlQnRuLCBcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0dGhpcy50b2dnbGVUcmVlTW9kZSgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ29sdW1uIHZpc2liaWxpdHkgZHJvcGRvd25cclxuXHRcdGNvbnN0IGNvbHVtbkRyb3Bkb3duID0gY29udHJvbHNDb250YWluZXIuY3JlYXRlRGl2KFwiY29sdW1uLWRyb3Bkb3duXCIpO1xyXG5cdFx0dGhpcy5jb2x1bW5CdG4gPSBjb2x1bW5Ecm9wZG93bi5jcmVhdGVFbChcclxuXHRcdFx0XCJidXR0b25cIixcclxuXHRcdFx0XCJ0YWJsZS1jb250cm9sLWJ0biBjb2x1bW4tYnRuXCJcclxuXHRcdCk7XHJcblxyXG5cdFx0Y29uc3QgY29sdW1uSWNvbiA9IHRoaXMuY29sdW1uQnRuLmNyZWF0ZVNwYW4oXCJjb2x1bW4taWNvblwiKTtcclxuXHRcdHNldEljb24oY29sdW1uSWNvbiwgXCJleWVcIik7XHJcblxyXG5cdFx0Y29uc3QgY29sdW1uVGV4dCA9IHRoaXMuY29sdW1uQnRuLmNyZWF0ZVNwYW4oXCJjb2x1bW4tdGV4dFwiKTtcclxuXHRcdGNvbHVtblRleHQudGV4dENvbnRlbnQgPSB0KFwiQ29sdW1uc1wiKTtcclxuXHJcblx0XHRjb25zdCBkcm9wZG93bkFycm93ID0gdGhpcy5jb2x1bW5CdG4uY3JlYXRlU3BhbihcImRyb3Bkb3duLWFycm93XCIpO1xyXG5cdFx0c2V0SWNvbihkcm9wZG93bkFycm93LCBcImNoZXZyb24tZG93blwiKTtcclxuXHJcblx0XHR0aGlzLmNvbHVtbkJ0bi50aXRsZSA9IHQoXCJUb2dnbGUgY29sdW1uIHZpc2liaWxpdHlcIik7XHJcblxyXG5cdFx0Y29uc3QgY29sdW1uTWVudSA9IGNvbHVtbkRyb3Bkb3duLmNyZWF0ZURpdihcImNvbHVtbi1kcm9wZG93bi1tZW51XCIpO1xyXG5cdFx0Y29sdW1uTWVudS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcblxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KHRoaXMuY29sdW1uQnRuLCBcImNsaWNrXCIsIChlKSA9PiB7XHJcblx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblx0XHRcdGNvbnN0IGlzVmlzaWJsZSA9IGNvbHVtbk1lbnUuc3R5bGUuZGlzcGxheSAhPT0gXCJub25lXCI7XHJcblx0XHRcdGNvbHVtbk1lbnUuc3R5bGUuZGlzcGxheSA9IGlzVmlzaWJsZSA/IFwibm9uZVwiIDogXCJibG9ja1wiO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ2xvc2UgZHJvcGRvd24gd2hlbiBjbGlja2luZyBvdXRzaWRlXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZG9jdW1lbnQsIFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb2x1bW5NZW51LnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFN0b3JlIGNvbHVtbiBtZW51IGZvciBsYXRlciB1cGRhdGVzXHJcblx0XHR0aGlzLnVwZGF0ZUNvbHVtbkRyb3Bkb3duKGNvbHVtbk1lbnUpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIHRyZWUgbW9kZSBidXR0b24gYXBwZWFyYW5jZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgdXBkYXRlVHJlZU1vZGVCdXR0b24oKSB7XHJcblx0XHRpZiAoIXRoaXMudHJlZU1vZGVCdG4pIHJldHVybjtcclxuXHJcblx0XHRjb25zdCBpY29uID0gdGhpcy50cmVlTW9kZUJ0bi5xdWVyeVNlbGVjdG9yKFwiLnRyZWUtbW9kZS1pY29uXCIpO1xyXG5cclxuXHRcdGlmIChpY29uKSB7XHJcblx0XHRcdGljb24uZW1wdHkoKTtcclxuXHRcdFx0c2V0SWNvbihcclxuXHRcdFx0XHRpY29uIGFzIEhUTUxFbGVtZW50LFxyXG5cdFx0XHRcdHRoaXMuaXNUcmVlTW9kZSA/IFwiZ2l0LWJyYW5jaFwiIDogXCJsaXN0XCJcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdHRoaXMudHJlZU1vZGVCdG4udGl0bGUgPSB0aGlzLmlzVHJlZU1vZGVcclxuXHRcdFx0XHQ/IHQoXCJTd2l0Y2ggdG8gTGlzdCBNb2RlXCIpXHJcblx0XHRcdFx0OiB0KFwiU3dpdGNoIHRvIFRyZWUgTW9kZVwiKTtcclxuXHJcblx0XHRcdHRoaXMudHJlZU1vZGVCdG4udG9nZ2xlQ2xhc3MoXCJhY3RpdmVcIiwgdGhpcy5pc1RyZWVNb2RlKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSB0cmVlIG1vZGUgZGlzcGxheVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgdXBkYXRlVHJlZU1vZGVEaXNwbGF5KCkge1xyXG5cdFx0dGhpcy51cGRhdGVUcmVlTW9kZUJ1dHRvbigpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVG9nZ2xlIHRyZWUgbW9kZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgdG9nZ2xlVHJlZU1vZGUoKSB7XHJcblx0XHR0aGlzLmlzVHJlZU1vZGUgPSAhdGhpcy5pc1RyZWVNb2RlO1xyXG5cdFx0dGhpcy51cGRhdGVUcmVlTW9kZURpc3BsYXkoKTtcclxuXHJcblx0XHRpZiAodGhpcy5jYWxsYmFja3Mub25UcmVlTW9kZVRvZ2dsZSkge1xyXG5cdFx0XHR0aGlzLmNhbGxiYWNrcy5vblRyZWVNb2RlVG9nZ2xlKHRoaXMuaXNUcmVlTW9kZSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgY29sdW1uIHRvZ2dsZXNcclxuXHQgKi9cclxuXHRwcml2YXRlIHVwZGF0ZUNvbHVtblRvZ2dsZXMoKSB7XHJcblx0XHRjb25zdCBjb2x1bW5NZW51ID0gdGhpcy5oZWFkZXJFbC5xdWVyeVNlbGVjdG9yKFwiLmNvbHVtbi1kcm9wZG93bi1tZW51XCIpO1xyXG5cdFx0aWYgKGNvbHVtbk1lbnUpIHtcclxuXHRcdFx0dGhpcy5jcmVhdGVDb2x1bW5Ub2dnbGVzKGNvbHVtbk1lbnUgYXMgSFRNTEVsZW1lbnQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ3JlYXRlIGNvbHVtbiB0b2dnbGUgY2hlY2tib3hlc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgY3JlYXRlQ29sdW1uVG9nZ2xlcyhjb250YWluZXI6IEhUTUxFbGVtZW50KSB7XHJcblx0XHRjb250YWluZXIuZW1wdHkoKTtcclxuXHJcblx0XHR0aGlzLmF2YWlsYWJsZUNvbHVtbnMuZm9yRWFjaCgoY29sdW1uKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRvZ2dsZUl0ZW0gPSBjb250YWluZXIuY3JlYXRlRGl2KFwiY29sdW1uLXRvZ2dsZS1pdGVtXCIpO1xyXG5cclxuXHRcdFx0Y29uc3QgY2hlY2tib3ggPSB0b2dnbGVJdGVtLmNyZWF0ZUVsKFxyXG5cdFx0XHRcdFwiaW5wdXRcIixcclxuXHRcdFx0XHRcImNvbHVtbi10b2dnbGUtY2hlY2tib3hcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRjaGVja2JveC50eXBlID0gXCJjaGVja2JveFwiO1xyXG5cdFx0XHRjaGVja2JveC5jaGVja2VkID0gY29sdW1uLnZpc2libGU7XHJcblx0XHRcdGNoZWNrYm94LmlkID0gYGNvbHVtbi10b2dnbGUtJHtjb2x1bW4uaWR9YDtcclxuXHJcblx0XHRcdGNvbnN0IGxhYmVsID0gdG9nZ2xlSXRlbS5jcmVhdGVFbChcImxhYmVsXCIsIFwiY29sdW1uLXRvZ2dsZS1sYWJlbFwiKTtcclxuXHRcdFx0bGFiZWwuaHRtbEZvciA9IGNoZWNrYm94LmlkO1xyXG5cdFx0XHRsYWJlbC50ZXh0Q29udGVudCA9IGNvbHVtbi50aXRsZTtcclxuXHJcblx0XHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChjaGVja2JveCwgXCJjaGFuZ2VcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdGlmICh0aGlzLmNhbGxiYWNrcy5vbkNvbHVtblRvZ2dsZSkge1xyXG5cdFx0XHRcdFx0dGhpcy5jYWxsYmFja3Mub25Db2x1bW5Ub2dnbGUoY29sdW1uLmlkLCBjaGVja2JveC5jaGVja2VkKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgY29sdW1uIGRyb3Bkb3duXHJcblx0ICovXHJcblx0cHJpdmF0ZSB1cGRhdGVDb2x1bW5Ecm9wZG93bihjb2x1bW5NZW51OiBIVE1MRWxlbWVudCkge1xyXG5cdFx0dGhpcy5jcmVhdGVDb2x1bW5Ub2dnbGVzKGNvbHVtbk1lbnUpO1xyXG5cdH1cclxufVxyXG4iXX0=