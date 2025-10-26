import { Component } from "obsidian";
import { t } from "@/translations/helper";
import { DatePickerPopover } from "@/components/ui/date-picker/DatePickerPopover";
import { ContextSuggest, ProjectSuggest, TagSuggest } from "@/components/ui/inputs/AutoComplete";
/**
 * Table editor component responsible for inline cell editing
 */
export class TableEditor extends Component {
    constructor(app, plugin, config, callbacks) {
        super();
        this.app = app;
        this.plugin = plugin;
        this.config = config;
        this.callbacks = callbacks;
        this.currentEditCell = null;
        this.currentInput = null;
        this.currentRowId = "";
        this.currentColumnId = "";
        this.originalValue = null;
    }
    onload() {
        this.setupGlobalEventListeners();
    }
    onunload() {
        this.cancelEdit();
    }
    /**
     * Start editing a cell
     */
    startEdit(rowId, columnId, cellEl) {
        // Cancel any existing edit
        this.cancelEdit();
        this.currentEditCell = cellEl;
        this.currentRowId = rowId;
        this.currentColumnId = columnId;
        this.originalValue = this.extractCellValue(cellEl, columnId);
        // Create appropriate input element based on column type
        const input = this.createInputElement(columnId, this.originalValue);
        if (!input)
            return;
        this.currentInput = input;
        // Replace cell content with input
        cellEl.empty();
        cellEl.appendChild(input);
        cellEl.addClass("editing");
        // Focus and select input
        input.focus();
        if (input instanceof HTMLInputElement) {
            input.select();
        }
        // Setup input event listeners
        this.setupInputEventListeners(input);
    }
    /**
     * Save the current edit
     */
    saveEdit() {
        if (!this.currentInput || !this.currentEditCell)
            return;
        const newValue = this.getInputValue(this.currentInput, this.currentColumnId);
        // Validate the new value
        if (!this.validateValue(newValue, this.currentColumnId)) {
            this.showValidationError();
            return;
        }
        // Notify parent component of the change
        this.callbacks.onCellEdit(this.currentRowId, this.currentColumnId, newValue);
        // Clean up
        this.finishEdit();
        this.callbacks.onEditComplete();
    }
    /**
     * Cancel the current edit
     */
    cancelEdit() {
        if (!this.currentEditCell)
            return;
        // Restore original content
        this.restoreCellContent();
        this.finishEdit();
        this.callbacks.onEditCancel();
    }
    /**
     * Create appropriate input element based on column type
     */
    createInputElement(columnId, currentValue) {
        switch (columnId) {
            case "status":
                return this.createStatusSelect(currentValue);
            case "priority":
                return this.createPrioritySelect(currentValue);
            case "dueDate":
            case "startDate":
            case "scheduledDate":
                return this.createDateInput(currentValue);
            case "tags":
                return this.createTagsInput(currentValue);
            case "content":
                return this.createTextInput(currentValue, true); // Multiline for content
            case "project":
                return this.createProjectInput(currentValue);
            case "context":
                return this.createContextInput(currentValue);
            default:
                return this.createTextInput(currentValue, false);
        }
    }
    /**
     * Create status select dropdown
     */
    createStatusSelect(currentValue) {
        const select = document.createElement("select");
        select.className = "task-table-status-select";
        const statusOptions = [
            { value: " ", label: t("Not Started") },
            { value: "/", label: t("In Progress") },
            { value: "x", label: t("Completed") },
            { value: "-", label: t("Abandoned") },
            { value: "?", label: t("Planned") },
        ];
        statusOptions.forEach((option) => {
            const optionEl = document.createElement("option");
            optionEl.value = option.value;
            optionEl.textContent = option.label;
            optionEl.selected = option.value === currentValue;
            select.appendChild(optionEl);
        });
        return select;
    }
    /**
     * Create priority select dropdown
     */
    createPrioritySelect(currentValue) {
        const select = document.createElement("select");
        select.className = "task-table-priority-select";
        const priorityOptions = [
            { value: "", label: t("No Priority") },
            { value: "1", label: t("High Priority") },
            { value: "2", label: t("Medium Priority") },
            { value: "3", label: t("Low Priority") },
        ];
        priorityOptions.forEach((option) => {
            const optionEl = document.createElement("option");
            optionEl.value = option.value;
            optionEl.textContent = option.label;
            optionEl.selected = option.value === String(currentValue || "");
            select.appendChild(optionEl);
        });
        return select;
    }
    /**
     * Create date input
     */
    createDateInput(currentValue) {
        const input = createEl("input", {
            type: "text",
            cls: "task-table-date-input",
            placeholder: t("Click to select date"),
            attr: {
                readOnly: true,
            },
        });
        if (currentValue) {
            const date = new Date(currentValue);
            input.value = date.toLocaleDateString();
        }
        // Add click handler to open date picker
        this.registerDomEvent(input, "click", (e) => {
            e.stopPropagation();
            this.openDatePicker(input, currentValue);
        });
        return input;
    }
    /**
     * Open date picker popover
     */
    openDatePicker(input, currentValue) {
        const initialDate = currentValue
            ? new Date(currentValue).toISOString().split("T")[0]
            : undefined;
        const popover = new DatePickerPopover(this.app, this.plugin, initialDate);
        popover.onDateSelected = (dateStr) => {
            if (dateStr) {
                const date = new Date(dateStr);
                input.value = date.toLocaleDateString();
                input.dataset.timestamp = date.getTime().toString();
            }
            else {
                input.value = "";
                delete input.dataset.timestamp;
            }
            popover.close();
        };
        // Position the popover near the input
        const rect = input.getBoundingClientRect();
        popover.showAtPosition({
            x: rect.left,
            y: rect.bottom + 5,
        });
    }
    /**
     * Create tags input
     */
    createTagsInput(currentValue) {
        const input = document.createElement("input");
        input.type = "text";
        input.className = "task-table-tags-input";
        input.placeholder = t("Enter tags separated by commas");
        if (currentValue && Array.isArray(currentValue)) {
            input.value = currentValue.join(", ");
        }
        // Add tags autocomplete
        new TagSuggest(this.app, input, this.plugin);
        return input;
    }
    /**
     * Create text input
     */
    createTextInput(currentValue, multiline = false) {
        const input = document.createElement("input");
        input.type = "text";
        input.className = "task-table-text-input";
        input.value = currentValue || "";
        if (multiline) {
            input.className += " multiline";
        }
        return input;
    }
    /**
     * Create project input with autocomplete
     */
    createProjectInput(currentValue) {
        const input = this.createTextInput(currentValue, false);
        input.className += " task-table-project-input";
        input.placeholder = t("Enter project name");
        // Add project autocomplete
        new ProjectSuggest(this.app, input, this.plugin);
        return input;
    }
    /**
     * Create context input with autocomplete
     */
    createContextInput(currentValue) {
        const input = this.createTextInput(currentValue, false);
        input.className += " task-table-context-input";
        input.placeholder = t("Enter context");
        // Add context autocomplete
        new ContextSuggest(this.app, input, this.plugin);
        return input;
    }
    /**
     * Get value from input element
     */
    getInputValue(input, columnId) {
        switch (columnId) {
            case "status":
                return input.value;
            case "priority":
                return input.value ? parseInt(input.value) : undefined;
            case "dueDate":
            case "startDate":
            case "scheduledDate":
                // For date inputs, check if we have a timestamp in dataset
                if (input instanceof HTMLInputElement &&
                    input.dataset.timestamp) {
                    return parseInt(input.dataset.timestamp);
                }
                // Fallback to parsing the display value
                return input.value
                    ? new Date(input.value).getTime()
                    : undefined;
            case "tags":
                return input.value
                    ? input.value
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter((tag) => tag)
                    : [];
            default:
                return input.value;
        }
    }
    /**
     * Extract current value from cell element
     */
    extractCellValue(cellEl, columnId) {
        // This is a simplified extraction - in a real implementation,
        // you might want to store the original value in a data attribute
        const textContent = cellEl.textContent || "";
        switch (columnId) {
            case "status":
                // Extract status symbol from the cell
                const statusMap = {
                    [t("Not Started")]: " ",
                    [t("Completed")]: "x",
                    [t("In Progress")]: "/",
                    [t("Abandoned")]: "-",
                    [t("Planned")]: "?",
                };
                return statusMap[textContent] || " ";
            case "priority":
                const priorityMap = {
                    [t("High")]: 1,
                    [t("Medium")]: 2,
                    [t("Low")]: 3,
                };
                return priorityMap[textContent] || undefined;
            case "tags":
                // Extract tags from tag chips
                const tagChips = cellEl.querySelectorAll(".task-table-tag-chip");
                return Array.from(tagChips).map((chip) => chip.textContent || "");
            default:
                return textContent;
        }
    }
    /**
     * Validate input value
     */
    validateValue(value, columnId) {
        switch (columnId) {
            case "priority":
                return (value === undefined ||
                    (typeof value === "number" && value >= 1 && value <= 3));
            case "dueDate":
            case "startDate":
            case "scheduledDate":
                return (value === undefined ||
                    (typeof value === "number" && !isNaN(value)));
            case "content":
                return typeof value === "string" && value.trim().length > 0;
            default:
                return true;
        }
    }
    /**
     * Show validation error
     */
    showValidationError() {
        if (!this.currentInput)
            return;
        this.currentInput.addClass("error");
        this.currentInput.title = t("Invalid value");
        // Remove error styling after a delay
        setTimeout(() => {
            if (this.currentInput) {
                this.currentInput.removeClass("error");
                this.currentInput.title = "";
            }
        }, 3000);
    }
    /**
     * Setup input event listeners
     */
    setupInputEventListeners(input) {
        // Save on Enter key
        this.registerDomEvent(input, "keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                this.saveEdit();
            }
            else if (e.key === "Escape") {
                e.preventDefault();
                this.cancelEdit();
            }
        });
        // Save on blur (focus lost)
        this.registerDomEvent(input, "blur", () => {
            // Small delay to allow for other events to process
            setTimeout(() => {
                if (this.currentInput === input) {
                    this.saveEdit();
                }
            }, 100);
        });
        // Prevent event bubbling
        this.registerDomEvent(input, "click", (e) => {
            e.stopPropagation();
        });
    }
    /**
     * Setup global event listeners
     */
    setupGlobalEventListeners() {
        // Cancel edit on outside click
        this.registerDomEvent(document, "click", (e) => {
            if (this.currentEditCell &&
                !this.currentEditCell.contains(e.target)) {
                this.saveEdit();
            }
        });
    }
    /**
     * Restore original cell content
     */
    restoreCellContent() {
        if (!this.currentEditCell)
            return;
        // This is a simplified restoration - in a real implementation,
        // you might want to re-render the cell with the original value
        this.currentEditCell.textContent = String(this.originalValue || "");
        this.currentEditCell.removeClass("editing");
    }
    /**
     * Finish editing and clean up
     */
    finishEdit() {
        if (this.currentEditCell) {
            this.currentEditCell.removeClass("editing");
        }
        this.currentEditCell = null;
        this.currentInput = null;
        this.currentRowId = "";
        this.currentColumnId = "";
        this.originalValue = null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGFibGVFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJUYWJsZUVkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFPLE1BQU0sVUFBVSxDQUFDO0FBSTFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUMxQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNsRixPQUFPLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxVQUFVLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUVqRzs7R0FFRztBQUNILE1BQU0sT0FBTyxXQUFZLFNBQVEsU0FBUztJQU96QyxZQUNTLEdBQVEsRUFDUixNQUE2QixFQUM3QixNQUEyQixFQUMzQixTQUEwQjtRQUVsQyxLQUFLLEVBQUUsQ0FBQztRQUxBLFFBQUcsR0FBSCxHQUFHLENBQUs7UUFDUixXQUFNLEdBQU4sTUFBTSxDQUF1QjtRQUM3QixXQUFNLEdBQU4sTUFBTSxDQUFxQjtRQUMzQixjQUFTLEdBQVQsU0FBUyxDQUFpQjtRQVYzQixvQkFBZSxHQUF1QixJQUFJLENBQUM7UUFDM0MsaUJBQVksR0FBZ0QsSUFBSSxDQUFDO1FBQ2pFLGlCQUFZLEdBQUcsRUFBRSxDQUFDO1FBQ2xCLG9CQUFlLEdBQUcsRUFBRSxDQUFDO1FBQ3JCLGtCQUFhLEdBQVEsSUFBSSxDQUFDO0lBU2xDLENBQUM7SUFFRCxNQUFNO1FBQ0wsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUM7SUFDbEMsQ0FBQztJQUVELFFBQVE7UUFDUCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDbkIsQ0FBQztJQUVEOztPQUVHO0lBQ0ksU0FBUyxDQUFDLEtBQWEsRUFBRSxRQUFnQixFQUFFLE1BQW1CO1FBQ3BFLDJCQUEyQjtRQUMzQixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFFbEIsSUFBSSxDQUFDLGVBQWUsR0FBRyxNQUFNLENBQUM7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QkFBZ0IsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDOUMsSUFDQyxJQUFJLENBQUMsZUFBZTtnQkFDcEIsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBYyxDQUFDLEVBQy9DO2dCQUNELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQzthQUNoQjtRQUNGLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ0ssa0JBQWtCO1FBQ3pCLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZTtZQUFFLE9BQU87UUFFbEMsK0RBQStEO1FBQy9ELCtEQUErRDtRQUMvRCxJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNwRSxJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRUQ7O09BRUc7SUFDSyxVQUFVO1FBQ2pCLElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRTtZQUN6QixJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztTQUM1QztRQUVELElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO1FBQzVCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxZQUFZLEdBQUcsRUFBRSxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxlQUFlLEdBQUcsRUFBRSxDQUFDO1FBQzFCLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO0lBQzNCLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbXBvbmVudCwgQXBwIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFRhYmxlU3BlY2lmaWNDb25maWcgfSBmcm9tIFwiQC9jb21tb24vc2V0dGluZy1kZWZpbml0aW9uXCI7XHJcbmltcG9ydCB7IEVkaXRvckNhbGxiYWNrcyB9IGZyb20gXCIuL1RhYmxlVHlwZXNcIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgeyBEYXRlUGlja2VyUG9wb3ZlciB9IGZyb20gXCJAL2NvbXBvbmVudHMvdWkvZGF0ZS1waWNrZXIvRGF0ZVBpY2tlclBvcG92ZXJcIjtcclxuaW1wb3J0IHsgQ29udGV4dFN1Z2dlc3QsIFByb2plY3RTdWdnZXN0LCBUYWdTdWdnZXN0IH0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9pbnB1dHMvQXV0b0NvbXBsZXRlXCI7XHJcblxyXG4vKipcclxuICogVGFibGUgZWRpdG9yIGNvbXBvbmVudCByZXNwb25zaWJsZSBmb3IgaW5saW5lIGNlbGwgZWRpdGluZ1xyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFRhYmxlRWRpdG9yIGV4dGVuZHMgQ29tcG9uZW50IHtcclxuXHRwcml2YXRlIGN1cnJlbnRFZGl0Q2VsbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIGN1cnJlbnRJbnB1dDogSFRNTElucHV0RWxlbWVudCB8IEhUTUxTZWxlY3RFbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBjdXJyZW50Um93SWQgPSBcIlwiO1xyXG5cdHByaXZhdGUgY3VycmVudENvbHVtbklkID0gXCJcIjtcclxuXHRwcml2YXRlIG9yaWdpbmFsVmFsdWU6IGFueSA9IG51bGw7XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cHJpdmF0ZSBhcHA6IEFwcCxcclxuXHRcdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRwcml2YXRlIGNvbmZpZzogVGFibGVTcGVjaWZpY0NvbmZpZyxcclxuXHRcdHByaXZhdGUgY2FsbGJhY2tzOiBFZGl0b3JDYWxsYmFja3NcclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0fVxyXG5cclxuXHRvbmxvYWQoKSB7XHJcblx0XHR0aGlzLnNldHVwR2xvYmFsRXZlbnRMaXN0ZW5lcnMoKTtcclxuXHR9XHJcblxyXG5cdG9udW5sb2FkKCkge1xyXG5cdFx0dGhpcy5jYW5jZWxFZGl0KCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTdGFydCBlZGl0aW5nIGEgY2VsbFxyXG5cdCAqL1xyXG5cdHB1YmxpYyBzdGFydEVkaXQocm93SWQ6IHN0cmluZywgY29sdW1uSWQ6IHN0cmluZywgY2VsbEVsOiBIVE1MRWxlbWVudCkge1xyXG5cdFx0Ly8gQ2FuY2VsIGFueSBleGlzdGluZyBlZGl0XHJcblx0XHR0aGlzLmNhbmNlbEVkaXQoKTtcclxuXHJcblx0XHR0aGlzLmN1cnJlbnRFZGl0Q2VsbCA9IGNlbGxFbDtcclxuXHRcdHRoaXMuY3VycmVudFJvd0lkID0gcm93SWQ7XHJcblx0XHR0aGlzLmN1cnJlbnRDb2x1bW5JZCA9IGNvbHVtbklkO1xyXG5cdFx0dGhpcy5vcmlnaW5hbFZhbHVlID0gdGhpcy5leHRyYWN0Q2VsbFZhbHVlKGNlbGxFbCwgY29sdW1uSWQpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBhcHByb3ByaWF0ZSBpbnB1dCBlbGVtZW50IGJhc2VkIG9uIGNvbHVtbiB0eXBlXHJcblx0XHRjb25zdCBpbnB1dCA9IHRoaXMuY3JlYXRlSW5wdXRFbGVtZW50KGNvbHVtbklkLCB0aGlzLm9yaWdpbmFsVmFsdWUpO1xyXG5cdFx0aWYgKCFpbnB1dCkgcmV0dXJuO1xyXG5cclxuXHRcdHRoaXMuY3VycmVudElucHV0ID0gaW5wdXQ7XHJcblxyXG5cdFx0Ly8gUmVwbGFjZSBjZWxsIGNvbnRlbnQgd2l0aCBpbnB1dFxyXG5cdFx0Y2VsbEVsLmVtcHR5KCk7XHJcblx0XHRjZWxsRWwuYXBwZW5kQ2hpbGQoaW5wdXQpO1xyXG5cdFx0Y2VsbEVsLmFkZENsYXNzKFwiZWRpdGluZ1wiKTtcclxuXHJcblx0XHQvLyBGb2N1cyBhbmQgc2VsZWN0IGlucHV0XHJcblx0XHRpbnB1dC5mb2N1cygpO1xyXG5cdFx0aWYgKGlucHV0IGluc3RhbmNlb2YgSFRNTElucHV0RWxlbWVudCkge1xyXG5cdFx0XHRpbnB1dC5zZWxlY3QoKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTZXR1cCBpbnB1dCBldmVudCBsaXN0ZW5lcnNcclxuXHRcdHRoaXMuc2V0dXBJbnB1dEV2ZW50TGlzdGVuZXJzKGlucHV0KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNhdmUgdGhlIGN1cnJlbnQgZWRpdFxyXG5cdCAqL1xyXG5cdHB1YmxpYyBzYXZlRWRpdCgpIHtcclxuXHRcdGlmICghdGhpcy5jdXJyZW50SW5wdXQgfHwgIXRoaXMuY3VycmVudEVkaXRDZWxsKSByZXR1cm47XHJcblxyXG5cdFx0Y29uc3QgbmV3VmFsdWUgPSB0aGlzLmdldElucHV0VmFsdWUoXHJcblx0XHRcdHRoaXMuY3VycmVudElucHV0LFxyXG5cdFx0XHR0aGlzLmN1cnJlbnRDb2x1bW5JZFxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBWYWxpZGF0ZSB0aGUgbmV3IHZhbHVlXHJcblx0XHRpZiAoIXRoaXMudmFsaWRhdGVWYWx1ZShuZXdWYWx1ZSwgdGhpcy5jdXJyZW50Q29sdW1uSWQpKSB7XHJcblx0XHRcdHRoaXMuc2hvd1ZhbGlkYXRpb25FcnJvcigpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gTm90aWZ5IHBhcmVudCBjb21wb25lbnQgb2YgdGhlIGNoYW5nZVxyXG5cdFx0dGhpcy5jYWxsYmFja3Mub25DZWxsRWRpdChcclxuXHRcdFx0dGhpcy5jdXJyZW50Um93SWQsXHJcblx0XHRcdHRoaXMuY3VycmVudENvbHVtbklkLFxyXG5cdFx0XHRuZXdWYWx1ZVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBDbGVhbiB1cFxyXG5cdFx0dGhpcy5maW5pc2hFZGl0KCk7XHJcblx0XHR0aGlzLmNhbGxiYWNrcy5vbkVkaXRDb21wbGV0ZSgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2FuY2VsIHRoZSBjdXJyZW50IGVkaXRcclxuXHQgKi9cclxuXHRwdWJsaWMgY2FuY2VsRWRpdCgpIHtcclxuXHRcdGlmICghdGhpcy5jdXJyZW50RWRpdENlbGwpIHJldHVybjtcclxuXHJcblx0XHQvLyBSZXN0b3JlIG9yaWdpbmFsIGNvbnRlbnRcclxuXHRcdHRoaXMucmVzdG9yZUNlbGxDb250ZW50KCk7XHJcblx0XHR0aGlzLmZpbmlzaEVkaXQoKTtcclxuXHRcdHRoaXMuY2FsbGJhY2tzLm9uRWRpdENhbmNlbCgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ3JlYXRlIGFwcHJvcHJpYXRlIGlucHV0IGVsZW1lbnQgYmFzZWQgb24gY29sdW1uIHR5cGVcclxuXHQgKi9cclxuXHRwcml2YXRlIGNyZWF0ZUlucHV0RWxlbWVudChcclxuXHRcdGNvbHVtbklkOiBzdHJpbmcsXHJcblx0XHRjdXJyZW50VmFsdWU6IGFueVxyXG5cdCk6IEhUTUxJbnB1dEVsZW1lbnQgfCBIVE1MU2VsZWN0RWxlbWVudCB8IG51bGwge1xyXG5cdFx0c3dpdGNoIChjb2x1bW5JZCkge1xyXG5cdFx0XHRjYXNlIFwic3RhdHVzXCI6XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuY3JlYXRlU3RhdHVzU2VsZWN0KGN1cnJlbnRWYWx1ZSk7XHJcblx0XHRcdGNhc2UgXCJwcmlvcml0eVwiOlxyXG5cdFx0XHRcdHJldHVybiB0aGlzLmNyZWF0ZVByaW9yaXR5U2VsZWN0KGN1cnJlbnRWYWx1ZSk7XHJcblx0XHRcdGNhc2UgXCJkdWVEYXRlXCI6XHJcblx0XHRcdGNhc2UgXCJzdGFydERhdGVcIjpcclxuXHRcdFx0Y2FzZSBcInNjaGVkdWxlZERhdGVcIjpcclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5jcmVhdGVEYXRlSW5wdXQoY3VycmVudFZhbHVlKTtcclxuXHRcdFx0Y2FzZSBcInRhZ3NcIjpcclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5jcmVhdGVUYWdzSW5wdXQoY3VycmVudFZhbHVlKTtcclxuXHRcdFx0Y2FzZSBcImNvbnRlbnRcIjpcclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5jcmVhdGVUZXh0SW5wdXQoY3VycmVudFZhbHVlLCB0cnVlKTsgLy8gTXVsdGlsaW5lIGZvciBjb250ZW50XHJcblx0XHRcdGNhc2UgXCJwcm9qZWN0XCI6XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuY3JlYXRlUHJvamVjdElucHV0KGN1cnJlbnRWYWx1ZSk7XHJcblx0XHRcdGNhc2UgXCJjb250ZXh0XCI6XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuY3JlYXRlQ29udGV4dElucHV0KGN1cnJlbnRWYWx1ZSk7XHJcblx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuY3JlYXRlVGV4dElucHV0KGN1cnJlbnRWYWx1ZSwgZmFsc2UpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ3JlYXRlIHN0YXR1cyBzZWxlY3QgZHJvcGRvd25cclxuXHQgKi9cclxuXHRwcml2YXRlIGNyZWF0ZVN0YXR1c1NlbGVjdChjdXJyZW50VmFsdWU6IHN0cmluZyk6IEhUTUxTZWxlY3RFbGVtZW50IHtcclxuXHRcdGNvbnN0IHNlbGVjdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzZWxlY3RcIik7XHJcblx0XHRzZWxlY3QuY2xhc3NOYW1lID0gXCJ0YXNrLXRhYmxlLXN0YXR1cy1zZWxlY3RcIjtcclxuXHJcblx0XHRjb25zdCBzdGF0dXNPcHRpb25zID0gW1xyXG5cdFx0XHR7dmFsdWU6IFwiIFwiLCBsYWJlbDogdChcIk5vdCBTdGFydGVkXCIpfSxcclxuXHRcdFx0e3ZhbHVlOiBcIi9cIiwgbGFiZWw6IHQoXCJJbiBQcm9ncmVzc1wiKX0sXHJcblx0XHRcdHt2YWx1ZTogXCJ4XCIsIGxhYmVsOiB0KFwiQ29tcGxldGVkXCIpfSxcclxuXHRcdFx0e3ZhbHVlOiBcIi1cIiwgbGFiZWw6IHQoXCJBYmFuZG9uZWRcIil9LFxyXG5cdFx0XHR7dmFsdWU6IFwiP1wiLCBsYWJlbDogdChcIlBsYW5uZWRcIil9LFxyXG5cdFx0XTtcclxuXHJcblx0XHRzdGF0dXNPcHRpb25zLmZvckVhY2goKG9wdGlvbikgPT4ge1xyXG5cdFx0XHRjb25zdCBvcHRpb25FbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJvcHRpb25cIik7XHJcblx0XHRcdG9wdGlvbkVsLnZhbHVlID0gb3B0aW9uLnZhbHVlO1xyXG5cdFx0XHRvcHRpb25FbC50ZXh0Q29udGVudCA9IG9wdGlvbi5sYWJlbDtcclxuXHRcdFx0b3B0aW9uRWwuc2VsZWN0ZWQgPSBvcHRpb24udmFsdWUgPT09IGN1cnJlbnRWYWx1ZTtcclxuXHRcdFx0c2VsZWN0LmFwcGVuZENoaWxkKG9wdGlvbkVsKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBzZWxlY3Q7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDcmVhdGUgcHJpb3JpdHkgc2VsZWN0IGRyb3Bkb3duXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjcmVhdGVQcmlvcml0eVNlbGVjdChjdXJyZW50VmFsdWU6IG51bWJlcik6IEhUTUxTZWxlY3RFbGVtZW50IHtcclxuXHRcdGNvbnN0IHNlbGVjdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzZWxlY3RcIik7XHJcblx0XHRzZWxlY3QuY2xhc3NOYW1lID0gXCJ0YXNrLXRhYmxlLXByaW9yaXR5LXNlbGVjdFwiO1xyXG5cclxuXHRcdGNvbnN0IHByaW9yaXR5T3B0aW9ucyA9IFtcclxuXHRcdFx0e3ZhbHVlOiBcIlwiLCBsYWJlbDogdChcIk5vIFByaW9yaXR5XCIpfSxcclxuXHRcdFx0e3ZhbHVlOiBcIjFcIiwgbGFiZWw6IHQoXCJIaWdoIFByaW9yaXR5XCIpfSxcclxuXHRcdFx0e3ZhbHVlOiBcIjJcIiwgbGFiZWw6IHQoXCJNZWRpdW0gUHJpb3JpdHlcIil9LFxyXG5cdFx0XHR7dmFsdWU6IFwiM1wiLCBsYWJlbDogdChcIkxvdyBQcmlvcml0eVwiKX0sXHJcblx0XHRdO1xyXG5cclxuXHRcdHByaW9yaXR5T3B0aW9ucy5mb3JFYWNoKChvcHRpb24pID0+IHtcclxuXHRcdFx0Y29uc3Qgb3B0aW9uRWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwib3B0aW9uXCIpO1xyXG5cdFx0XHRvcHRpb25FbC52YWx1ZSA9IG9wdGlvbi52YWx1ZTtcclxuXHRcdFx0b3B0aW9uRWwudGV4dENvbnRlbnQgPSBvcHRpb24ubGFiZWw7XHJcblx0XHRcdG9wdGlvbkVsLnNlbGVjdGVkID0gb3B0aW9uLnZhbHVlID09PSBTdHJpbmcoY3VycmVudFZhbHVlIHx8IFwiXCIpO1xyXG5cdFx0XHRzZWxlY3QuYXBwZW5kQ2hpbGQob3B0aW9uRWwpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIHNlbGVjdDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZSBkYXRlIGlucHV0XHJcblx0ICovXHJcblx0cHJpdmF0ZSBjcmVhdGVEYXRlSW5wdXQoY3VycmVudFZhbHVlOiBudW1iZXIpOiBIVE1MSW5wdXRFbGVtZW50IHtcclxuXHRcdGNvbnN0IGlucHV0ID0gY3JlYXRlRWwoXCJpbnB1dFwiLCB7XHJcblx0XHRcdHR5cGU6IFwidGV4dFwiLFxyXG5cdFx0XHRjbHM6IFwidGFzay10YWJsZS1kYXRlLWlucHV0XCIsXHJcblx0XHRcdHBsYWNlaG9sZGVyOiB0KFwiQ2xpY2sgdG8gc2VsZWN0IGRhdGVcIiksXHJcblx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHRyZWFkT25seTogdHJ1ZSxcclxuXHRcdFx0fSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGlmIChjdXJyZW50VmFsdWUpIHtcclxuXHRcdFx0Y29uc3QgZGF0ZSA9IG5ldyBEYXRlKGN1cnJlbnRWYWx1ZSk7XHJcblx0XHRcdGlucHV0LnZhbHVlID0gZGF0ZS50b0xvY2FsZURhdGVTdHJpbmcoKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGQgY2xpY2sgaGFuZGxlciB0byBvcGVuIGRhdGUgcGlja2VyXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoaW5wdXQsIFwiY2xpY2tcIiwgKGUpID0+IHtcclxuXHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHRcdFx0dGhpcy5vcGVuRGF0ZVBpY2tlcihpbnB1dCwgY3VycmVudFZhbHVlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBpbnB1dDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIE9wZW4gZGF0ZSBwaWNrZXIgcG9wb3ZlclxyXG5cdCAqL1xyXG5cdHByaXZhdGUgb3BlbkRhdGVQaWNrZXIoaW5wdXQ6IEhUTUxJbnB1dEVsZW1lbnQsIGN1cnJlbnRWYWx1ZT86IG51bWJlcikge1xyXG5cdFx0Y29uc3QgaW5pdGlhbERhdGUgPSBjdXJyZW50VmFsdWVcclxuXHRcdFx0PyBuZXcgRGF0ZShjdXJyZW50VmFsdWUpLnRvSVNPU3RyaW5nKCkuc3BsaXQoXCJUXCIpWzBdXHJcblx0XHRcdDogdW5kZWZpbmVkO1xyXG5cclxuXHRcdGNvbnN0IHBvcG92ZXIgPSBuZXcgRGF0ZVBpY2tlclBvcG92ZXIoXHJcblx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0aW5pdGlhbERhdGVcclxuXHRcdCk7XHJcblxyXG5cdFx0cG9wb3Zlci5vbkRhdGVTZWxlY3RlZCA9IChkYXRlU3RyOiBzdHJpbmcgfCBudWxsKSA9PiB7XHJcblx0XHRcdGlmIChkYXRlU3RyKSB7XHJcblx0XHRcdFx0Y29uc3QgZGF0ZSA9IG5ldyBEYXRlKGRhdGVTdHIpO1xyXG5cdFx0XHRcdGlucHV0LnZhbHVlID0gZGF0ZS50b0xvY2FsZURhdGVTdHJpbmcoKTtcclxuXHRcdFx0XHRpbnB1dC5kYXRhc2V0LnRpbWVzdGFtcCA9IGRhdGUuZ2V0VGltZSgpLnRvU3RyaW5nKCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0aW5wdXQudmFsdWUgPSBcIlwiO1xyXG5cdFx0XHRcdGRlbGV0ZSBpbnB1dC5kYXRhc2V0LnRpbWVzdGFtcDtcclxuXHRcdFx0fVxyXG5cdFx0XHRwb3BvdmVyLmNsb3NlKCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIFBvc2l0aW9uIHRoZSBwb3BvdmVyIG5lYXIgdGhlIGlucHV0XHJcblx0XHRjb25zdCByZWN0ID0gaW5wdXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcblx0XHRwb3BvdmVyLnNob3dBdFBvc2l0aW9uKHtcclxuXHRcdFx0eDogcmVjdC5sZWZ0LFxyXG5cdFx0XHR5OiByZWN0LmJvdHRvbSArIDUsXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZSB0YWdzIGlucHV0XHJcblx0ICovXHJcblx0cHJpdmF0ZSBjcmVhdGVUYWdzSW5wdXQoY3VycmVudFZhbHVlOiBzdHJpbmdbXSk6IEhUTUxJbnB1dEVsZW1lbnQge1xyXG5cdFx0Y29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIik7XHJcblx0XHRpbnB1dC50eXBlID0gXCJ0ZXh0XCI7XHJcblx0XHRpbnB1dC5jbGFzc05hbWUgPSBcInRhc2stdGFibGUtdGFncy1pbnB1dFwiO1xyXG5cdFx0aW5wdXQucGxhY2Vob2xkZXIgPSB0KFwiRW50ZXIgdGFncyBzZXBhcmF0ZWQgYnkgY29tbWFzXCIpO1xyXG5cclxuXHRcdGlmIChjdXJyZW50VmFsdWUgJiYgQXJyYXkuaXNBcnJheShjdXJyZW50VmFsdWUpKSB7XHJcblx0XHRcdGlucHV0LnZhbHVlID0gY3VycmVudFZhbHVlLmpvaW4oXCIsIFwiKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGQgdGFncyBhdXRvY29tcGxldGVcclxuXHRcdG5ldyBUYWdTdWdnZXN0KHRoaXMuYXBwLCBpbnB1dCwgdGhpcy5wbHVnaW4pO1xyXG5cclxuXHRcdHJldHVybiBpbnB1dDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZSB0ZXh0IGlucHV0XHJcblx0ICovXHJcblx0cHJpdmF0ZSBjcmVhdGVUZXh0SW5wdXQoXHJcblx0XHRjdXJyZW50VmFsdWU6IHN0cmluZyxcclxuXHRcdG11bHRpbGluZTogYm9vbGVhbiA9IGZhbHNlXHJcblx0KTogSFRNTElucHV0RWxlbWVudCB7XHJcblx0XHRjb25zdCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKTtcclxuXHRcdGlucHV0LnR5cGUgPSBcInRleHRcIjtcclxuXHRcdGlucHV0LmNsYXNzTmFtZSA9IFwidGFzay10YWJsZS10ZXh0LWlucHV0XCI7XHJcblx0XHRpbnB1dC52YWx1ZSA9IGN1cnJlbnRWYWx1ZSB8fCBcIlwiO1xyXG5cclxuXHRcdGlmIChtdWx0aWxpbmUpIHtcclxuXHRcdFx0aW5wdXQuY2xhc3NOYW1lICs9IFwiIG11bHRpbGluZVwiO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBpbnB1dDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZSBwcm9qZWN0IGlucHV0IHdpdGggYXV0b2NvbXBsZXRlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjcmVhdGVQcm9qZWN0SW5wdXQoY3VycmVudFZhbHVlOiBzdHJpbmcpOiBIVE1MSW5wdXRFbGVtZW50IHtcclxuXHRcdGNvbnN0IGlucHV0ID0gdGhpcy5jcmVhdGVUZXh0SW5wdXQoY3VycmVudFZhbHVlLCBmYWxzZSk7XHJcblx0XHRpbnB1dC5jbGFzc05hbWUgKz0gXCIgdGFzay10YWJsZS1wcm9qZWN0LWlucHV0XCI7XHJcblx0XHRpbnB1dC5wbGFjZWhvbGRlciA9IHQoXCJFbnRlciBwcm9qZWN0IG5hbWVcIik7XHJcblxyXG5cdFx0Ly8gQWRkIHByb2plY3QgYXV0b2NvbXBsZXRlXHJcblx0XHRuZXcgUHJvamVjdFN1Z2dlc3QodGhpcy5hcHAsIGlucHV0LCB0aGlzLnBsdWdpbik7XHJcblxyXG5cdFx0cmV0dXJuIGlucHV0O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ3JlYXRlIGNvbnRleHQgaW5wdXQgd2l0aCBhdXRvY29tcGxldGVcclxuXHQgKi9cclxuXHRwcml2YXRlIGNyZWF0ZUNvbnRleHRJbnB1dChjdXJyZW50VmFsdWU6IHN0cmluZyk6IEhUTUxJbnB1dEVsZW1lbnQge1xyXG5cdFx0Y29uc3QgaW5wdXQgPSB0aGlzLmNyZWF0ZVRleHRJbnB1dChjdXJyZW50VmFsdWUsIGZhbHNlKTtcclxuXHRcdGlucHV0LmNsYXNzTmFtZSArPSBcIiB0YXNrLXRhYmxlLWNvbnRleHQtaW5wdXRcIjtcclxuXHRcdGlucHV0LnBsYWNlaG9sZGVyID0gdChcIkVudGVyIGNvbnRleHRcIik7XHJcblxyXG5cdFx0Ly8gQWRkIGNvbnRleHQgYXV0b2NvbXBsZXRlXHJcblx0XHRuZXcgQ29udGV4dFN1Z2dlc3QodGhpcy5hcHAsIGlucHV0LCB0aGlzLnBsdWdpbik7XHJcblxyXG5cdFx0cmV0dXJuIGlucHV0O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHZhbHVlIGZyb20gaW5wdXQgZWxlbWVudFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZ2V0SW5wdXRWYWx1ZShcclxuXHRcdGlucHV0OiBIVE1MSW5wdXRFbGVtZW50IHwgSFRNTFNlbGVjdEVsZW1lbnQsXHJcblx0XHRjb2x1bW5JZDogc3RyaW5nXHJcblx0KTogYW55IHtcclxuXHRcdHN3aXRjaCAoY29sdW1uSWQpIHtcclxuXHRcdFx0Y2FzZSBcInN0YXR1c1wiOlxyXG5cdFx0XHRcdHJldHVybiBpbnB1dC52YWx1ZTtcclxuXHRcdFx0Y2FzZSBcInByaW9yaXR5XCI6XHJcblx0XHRcdFx0cmV0dXJuIGlucHV0LnZhbHVlID8gcGFyc2VJbnQoaW5wdXQudmFsdWUpIDogdW5kZWZpbmVkO1xyXG5cdFx0XHRjYXNlIFwiZHVlRGF0ZVwiOlxyXG5cdFx0XHRjYXNlIFwic3RhcnREYXRlXCI6XHJcblx0XHRcdGNhc2UgXCJzY2hlZHVsZWREYXRlXCI6XHJcblx0XHRcdFx0Ly8gRm9yIGRhdGUgaW5wdXRzLCBjaGVjayBpZiB3ZSBoYXZlIGEgdGltZXN0YW1wIGluIGRhdGFzZXRcclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRpbnB1dCBpbnN0YW5jZW9mIEhUTUxJbnB1dEVsZW1lbnQgJiZcclxuXHRcdFx0XHRcdGlucHV0LmRhdGFzZXQudGltZXN0YW1wXHJcblx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gcGFyc2VJbnQoaW5wdXQuZGF0YXNldC50aW1lc3RhbXApO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvLyBGYWxsYmFjayB0byBwYXJzaW5nIHRoZSBkaXNwbGF5IHZhbHVlXHJcblx0XHRcdFx0cmV0dXJuIGlucHV0LnZhbHVlXHJcblx0XHRcdFx0XHQ/IG5ldyBEYXRlKGlucHV0LnZhbHVlKS5nZXRUaW1lKClcclxuXHRcdFx0XHRcdDogdW5kZWZpbmVkO1xyXG5cdFx0XHRjYXNlIFwidGFnc1wiOlxyXG5cdFx0XHRcdHJldHVybiBpbnB1dC52YWx1ZVxyXG5cdFx0XHRcdFx0PyBpbnB1dC52YWx1ZVxyXG5cdFx0XHRcdFx0XHQuc3BsaXQoXCIsXCIpXHJcblx0XHRcdFx0XHRcdC5tYXAoKHRhZykgPT4gdGFnLnRyaW0oKSlcclxuXHRcdFx0XHRcdFx0LmZpbHRlcigodGFnKSA9PiB0YWcpXHJcblx0XHRcdFx0XHQ6IFtdO1xyXG5cdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdHJldHVybiBpbnB1dC52YWx1ZTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEV4dHJhY3QgY3VycmVudCB2YWx1ZSBmcm9tIGNlbGwgZWxlbWVudFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZXh0cmFjdENlbGxWYWx1ZShjZWxsRWw6IEhUTUxFbGVtZW50LCBjb2x1bW5JZDogc3RyaW5nKTogYW55IHtcclxuXHRcdC8vIFRoaXMgaXMgYSBzaW1wbGlmaWVkIGV4dHJhY3Rpb24gLSBpbiBhIHJlYWwgaW1wbGVtZW50YXRpb24sXHJcblx0XHQvLyB5b3UgbWlnaHQgd2FudCB0byBzdG9yZSB0aGUgb3JpZ2luYWwgdmFsdWUgaW4gYSBkYXRhIGF0dHJpYnV0ZVxyXG5cdFx0Y29uc3QgdGV4dENvbnRlbnQgPSBjZWxsRWwudGV4dENvbnRlbnQgfHwgXCJcIjtcclxuXHJcblx0XHRzd2l0Y2ggKGNvbHVtbklkKSB7XHJcblx0XHRcdGNhc2UgXCJzdGF0dXNcIjpcclxuXHRcdFx0XHQvLyBFeHRyYWN0IHN0YXR1cyBzeW1ib2wgZnJvbSB0aGUgY2VsbFxyXG5cdFx0XHRcdGNvbnN0IHN0YXR1c01hcDogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcclxuXHRcdFx0XHRcdFt0KFwiTm90IFN0YXJ0ZWRcIildOiBcIiBcIixcclxuXHRcdFx0XHRcdFt0KFwiQ29tcGxldGVkXCIpXTogXCJ4XCIsXHJcblx0XHRcdFx0XHRbdChcIkluIFByb2dyZXNzXCIpXTogXCIvXCIsXHJcblx0XHRcdFx0XHRbdChcIkFiYW5kb25lZFwiKV06IFwiLVwiLFxyXG5cdFx0XHRcdFx0W3QoXCJQbGFubmVkXCIpXTogXCI/XCIsXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHRyZXR1cm4gc3RhdHVzTWFwW3RleHRDb250ZW50XSB8fCBcIiBcIjtcclxuXHRcdFx0Y2FzZSBcInByaW9yaXR5XCI6XHJcblx0XHRcdFx0Y29uc3QgcHJpb3JpdHlNYXA6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7XHJcblx0XHRcdFx0XHRbdChcIkhpZ2hcIildOiAxLFxyXG5cdFx0XHRcdFx0W3QoXCJNZWRpdW1cIildOiAyLFxyXG5cdFx0XHRcdFx0W3QoXCJMb3dcIildOiAzLFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0cmV0dXJuIHByaW9yaXR5TWFwW3RleHRDb250ZW50XSB8fCB1bmRlZmluZWQ7XHJcblx0XHRcdGNhc2UgXCJ0YWdzXCI6XHJcblx0XHRcdFx0Ly8gRXh0cmFjdCB0YWdzIGZyb20gdGFnIGNoaXBzXHJcblx0XHRcdFx0Y29uc3QgdGFnQ2hpcHMgPSBjZWxsRWwucXVlcnlTZWxlY3RvckFsbChcclxuXHRcdFx0XHRcdFwiLnRhc2stdGFibGUtdGFnLWNoaXBcIlxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0cmV0dXJuIEFycmF5LmZyb20odGFnQ2hpcHMpLm1hcChcclxuXHRcdFx0XHRcdChjaGlwKSA9PiBjaGlwLnRleHRDb250ZW50IHx8IFwiXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdHJldHVybiB0ZXh0Q29udGVudDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFZhbGlkYXRlIGlucHV0IHZhbHVlXHJcblx0ICovXHJcblx0cHJpdmF0ZSB2YWxpZGF0ZVZhbHVlKHZhbHVlOiBhbnksIGNvbHVtbklkOiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHRcdHN3aXRjaCAoY29sdW1uSWQpIHtcclxuXHRcdFx0Y2FzZSBcInByaW9yaXR5XCI6XHJcblx0XHRcdFx0cmV0dXJuIChcclxuXHRcdFx0XHRcdHZhbHVlID09PSB1bmRlZmluZWQgfHxcclxuXHRcdFx0XHRcdCh0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIgJiYgdmFsdWUgPj0gMSAmJiB2YWx1ZSA8PSAzKVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdGNhc2UgXCJkdWVEYXRlXCI6XHJcblx0XHRcdGNhc2UgXCJzdGFydERhdGVcIjpcclxuXHRcdFx0Y2FzZSBcInNjaGVkdWxlZERhdGVcIjpcclxuXHRcdFx0XHRyZXR1cm4gKFxyXG5cdFx0XHRcdFx0dmFsdWUgPT09IHVuZGVmaW5lZCB8fFxyXG5cdFx0XHRcdFx0KHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIiAmJiAhaXNOYU4odmFsdWUpKVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdGNhc2UgXCJjb250ZW50XCI6XHJcblx0XHRcdFx0cmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIiAmJiB2YWx1ZS50cmltKCkubGVuZ3RoID4gMDtcclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNob3cgdmFsaWRhdGlvbiBlcnJvclxyXG5cdCAqL1xyXG5cdHByaXZhdGUgc2hvd1ZhbGlkYXRpb25FcnJvcigpIHtcclxuXHRcdGlmICghdGhpcy5jdXJyZW50SW5wdXQpIHJldHVybjtcclxuXHJcblx0XHR0aGlzLmN1cnJlbnRJbnB1dC5hZGRDbGFzcyhcImVycm9yXCIpO1xyXG5cdFx0dGhpcy5jdXJyZW50SW5wdXQudGl0bGUgPSB0KFwiSW52YWxpZCB2YWx1ZVwiKTtcclxuXHJcblx0XHQvLyBSZW1vdmUgZXJyb3Igc3R5bGluZyBhZnRlciBhIGRlbGF5XHJcblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0aWYgKHRoaXMuY3VycmVudElucHV0KSB7XHJcblx0XHRcdFx0dGhpcy5jdXJyZW50SW5wdXQucmVtb3ZlQ2xhc3MoXCJlcnJvclwiKTtcclxuXHRcdFx0XHR0aGlzLmN1cnJlbnRJbnB1dC50aXRsZSA9IFwiXCI7XHJcblx0XHRcdH1cclxuXHRcdH0sIDMwMDApO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2V0dXAgaW5wdXQgZXZlbnQgbGlzdGVuZXJzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBzZXR1cElucHV0RXZlbnRMaXN0ZW5lcnMoXHJcblx0XHRpbnB1dDogSFRNTElucHV0RWxlbWVudCB8IEhUTUxTZWxlY3RFbGVtZW50XHJcblx0KSB7XHJcblx0XHQvLyBTYXZlIG9uIEVudGVyIGtleVxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGlucHV0LCBcImtleWRvd25cIiwgKGU6IEtleWJvYXJkRXZlbnQpID0+IHtcclxuXHRcdFx0aWYgKGUua2V5ID09PSBcIkVudGVyXCIpIHtcclxuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0dGhpcy5zYXZlRWRpdCgpO1xyXG5cdFx0XHR9IGVsc2UgaWYgKGUua2V5ID09PSBcIkVzY2FwZVwiKSB7XHJcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRcdHRoaXMuY2FuY2VsRWRpdCgpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBTYXZlIG9uIGJsdXIgKGZvY3VzIGxvc3QpXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoaW5wdXQsIFwiYmx1clwiLCAoKSA9PiB7XHJcblx0XHRcdC8vIFNtYWxsIGRlbGF5IHRvIGFsbG93IGZvciBvdGhlciBldmVudHMgdG8gcHJvY2Vzc1xyXG5cdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRpZiAodGhpcy5jdXJyZW50SW5wdXQgPT09IGlucHV0KSB7XHJcblx0XHRcdFx0XHR0aGlzLnNhdmVFZGl0KCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LCAxMDApO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gUHJldmVudCBldmVudCBidWJibGluZ1xyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGlucHV0LCBcImNsaWNrXCIsIChlKSA9PiB7XHJcblx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNldHVwIGdsb2JhbCBldmVudCBsaXN0ZW5lcnNcclxuXHQgKi9cclxuXHRwcml2YXRlIHNldHVwR2xvYmFsRXZlbnRMaXN0ZW5lcnMoKSB7XHJcblx0XHQvLyBDYW5jZWwgZWRpdCBvbiBvdXRzaWRlIGNsaWNrXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZG9jdW1lbnQsIFwiY2xpY2tcIiwgKGUpID0+IHtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHRoaXMuY3VycmVudEVkaXRDZWxsICYmXHJcblx0XHRcdFx0IXRoaXMuY3VycmVudEVkaXRDZWxsLmNvbnRhaW5zKGUudGFyZ2V0IGFzIE5vZGUpXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHRoaXMuc2F2ZUVkaXQoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZXN0b3JlIG9yaWdpbmFsIGNlbGwgY29udGVudFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgcmVzdG9yZUNlbGxDb250ZW50KCkge1xyXG5cdFx0aWYgKCF0aGlzLmN1cnJlbnRFZGl0Q2VsbCkgcmV0dXJuO1xyXG5cclxuXHRcdC8vIFRoaXMgaXMgYSBzaW1wbGlmaWVkIHJlc3RvcmF0aW9uIC0gaW4gYSByZWFsIGltcGxlbWVudGF0aW9uLFxyXG5cdFx0Ly8geW91IG1pZ2h0IHdhbnQgdG8gcmUtcmVuZGVyIHRoZSBjZWxsIHdpdGggdGhlIG9yaWdpbmFsIHZhbHVlXHJcblx0XHR0aGlzLmN1cnJlbnRFZGl0Q2VsbC50ZXh0Q29udGVudCA9IFN0cmluZyh0aGlzLm9yaWdpbmFsVmFsdWUgfHwgXCJcIik7XHJcblx0XHR0aGlzLmN1cnJlbnRFZGl0Q2VsbC5yZW1vdmVDbGFzcyhcImVkaXRpbmdcIik7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBGaW5pc2ggZWRpdGluZyBhbmQgY2xlYW4gdXBcclxuXHQgKi9cclxuXHRwcml2YXRlIGZpbmlzaEVkaXQoKSB7XHJcblx0XHRpZiAodGhpcy5jdXJyZW50RWRpdENlbGwpIHtcclxuXHRcdFx0dGhpcy5jdXJyZW50RWRpdENlbGwucmVtb3ZlQ2xhc3MoXCJlZGl0aW5nXCIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuY3VycmVudEVkaXRDZWxsID0gbnVsbDtcclxuXHRcdHRoaXMuY3VycmVudElucHV0ID0gbnVsbDtcclxuXHRcdHRoaXMuY3VycmVudFJvd0lkID0gXCJcIjtcclxuXHRcdHRoaXMuY3VycmVudENvbHVtbklkID0gXCJcIjtcclxuXHRcdHRoaXMub3JpZ2luYWxWYWx1ZSA9IG51bGw7XHJcblx0fVxyXG59XHJcbiJdfQ==