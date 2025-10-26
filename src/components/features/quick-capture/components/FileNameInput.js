import { AbstractInputSuggest, } from "obsidian";
import { t } from "@/translations/helper";
import { processDateTemplates } from "@/utils/file/file-operations";
/**
 * File name suggest for quick capture file creation mode
 */
export class FileNameSuggest extends AbstractInputSuggest {
    constructor(app, textInputEl, currentFolder) {
        super(app, textInputEl);
        this.currentFolder = "";
        this.fileTemplates = [
            "{{DATE:YYYY-MM-DD}} - Meeting Notes",
            "{{DATE:YYYY-MM-DD}} - Daily Log",
            "{{DATE:YYYY-MM-DD}} - Task List",
            "Project - {{DATE:YYYY-MM}}",
            "Notes - {{DATE:YYYY-MM-DD-HHmm}}",
        ];
        this.textInputEl = textInputEl;
        this.currentFolder = currentFolder || "";
    }
    /**
     * Get suggestions based on input
     */
    getSuggestions(inputStr) {
        const files = this.app.vault.getMarkdownFiles();
        const lowerInputStr = inputStr.toLowerCase();
        const suggestions = [];
        // Filter files in current folder
        const folderFiles = files.filter((file) => {
            if (this.currentFolder && !file.path.startsWith(this.currentFolder)) {
                return false;
            }
            return file.basename.toLowerCase().contains(lowerInputStr);
        });
        // Add matching files
        suggestions.push(...folderFiles.slice(0, 5));
        return suggestions;
    }
    /**
     * Render a suggestion
     */
    renderSuggestion(file, el) {
        var _a;
        el.setText(file.basename);
        el.createDiv({
            cls: "suggestion-folder",
            text: ((_a = file.parent) === null || _a === void 0 ? void 0 : _a.path) || "/",
        });
    }
    /**
     * Select a suggestion
     */
    selectSuggestion(file) {
        this.textInputEl.value = file.basename;
        this.textInputEl.trigger("input");
        this.close();
    }
}
/**
 * File name input component with template support
 */
export class FileNameInput {
    constructor(app, container, options) {
        this.inputEl = null;
        this.suggest = null;
        this.templateButtons = null;
        this.app = app;
        this.container = container;
        this.onChange = options === null || options === void 0 ? void 0 : options.onChange;
        this.render(options);
    }
    /**
     * Render the component
     */
    render(options) {
        // Create input container
        const inputContainer = this.container.createDiv({
            cls: "file-name-input-container",
        });
        // Label
        inputContainer.createEl("label", {
            text: t("File Name"),
            cls: "file-name-label",
        });
        // Input field with default template applied
        const defaultValue = processDateTemplates((options === null || options === void 0 ? void 0 : options.defaultValue) || "{{DATE:YYYY-MM-DD}}");
        this.inputEl = inputContainer.createEl("input", {
            type: "text",
            cls: "file-name-input",
            placeholder: (options === null || options === void 0 ? void 0 : options.placeholder) || t("Enter file name..."),
            value: defaultValue,
        });
        // Add suggest
        this.suggest = new FileNameSuggest(this.app, this.inputEl, options === null || options === void 0 ? void 0 : options.currentFolder);
        // Template buttons
        this.createTemplateButtons();
        // Event listeners
        this.inputEl.addEventListener("input", () => {
            if (this.onChange) {
                this.onChange(this.getValue());
            }
        });
    }
    /**
     * Create template buttons
     */
    createTemplateButtons() {
        this.templateButtons = this.container.createDiv({
            cls: "file-name-templates",
        });
        const templatesLabel = this.templateButtons.createDiv({
            cls: "templates-label",
            text: t("Quick Templates:"),
        });
        const buttonContainer = this.templateButtons.createDiv({
            cls: "template-buttons",
        });
        const templates = [
            { label: t("Today's Note"), template: "{{DATE:YYYY-MM-DD}}" },
            { label: t("Meeting"), template: "{{DATE:YYYY-MM-DD}} - Meeting" },
            { label: t("Project"), template: "Project - {{DATE:YYYY-MM}}" },
            { label: t("Task List"), template: "{{DATE:YYYY-MM-DD}} - Tasks" },
        ];
        templates.forEach((tmpl) => {
            const button = buttonContainer.createEl("button", {
                text: tmpl.label,
                cls: "template-button",
            });
            button.addEventListener("click", () => {
                if (this.inputEl) {
                    // Process template immediately
                    const processedValue = processDateTemplates(tmpl.template);
                    this.inputEl.value = processedValue;
                    if (this.onChange) {
                        this.onChange(this.getValue());
                    }
                    this.inputEl.focus();
                }
            });
        });
    }
    /**
     * Get the current value
     */
    getValue() {
        if (!this.inputEl)
            return "";
        // Just return the value directly since templates are already processed
        return this.inputEl.value;
    }
    /**
     * Set the value
     */
    setValue(value) {
        if (this.inputEl) {
            this.inputEl.value = value;
        }
    }
    /**
     * Clear the input
     */
    clear() {
        this.setValue("");
    }
    /**
     * Focus the input
     */
    focus() {
        var _a;
        (_a = this.inputEl) === null || _a === void 0 ? void 0 : _a.focus();
    }
    /**
     * Destroy the component
     */
    destroy() {
        var _a;
        (_a = this.suggest) === null || _a === void 0 ? void 0 : _a.close();
        this.container.empty();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmlsZU5hbWVJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkZpbGVOYW1lSW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUdOLG9CQUFvQixHQUdwQixNQUFNLFVBQVUsQ0FBQztBQUNsQixPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDMUMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFcEU7O0dBRUc7QUFDSCxNQUFNLE9BQU8sZUFBZ0IsU0FBUSxvQkFBMkI7SUFXL0QsWUFBWSxHQUFRLEVBQUUsV0FBNkIsRUFBRSxhQUFzQjtRQUMxRSxLQUFLLENBQUMsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBWGpCLGtCQUFhLEdBQVcsRUFBRSxDQUFDO1FBQzNCLGtCQUFhLEdBQWE7WUFDakMscUNBQXFDO1lBQ3JDLGlDQUFpQztZQUNqQyxpQ0FBaUM7WUFDakMsNEJBQTRCO1lBQzVCLGtDQUFrQztTQUNsQyxDQUFDO1FBS0QsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7UUFDL0IsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLElBQUksRUFBRSxDQUFDO0lBQzFDLENBQUM7SUFFRDs7T0FFRztJQUNILGNBQWMsQ0FBQyxRQUFnQjtRQUM5QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ2hELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUM3QyxNQUFNLFdBQVcsR0FBWSxFQUFFLENBQUM7UUFFaEMsaUNBQWlDO1FBQ2pDLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUN6QyxJQUFJLElBQUksQ0FBQyxhQUFhLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENB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LE9BQU87O1FBQ04sTUFBQSxJQUFJLENBQUMsT0FBTywwQ0FBRSxLQUFLLEVBQUUsQ0FBQztRQUN0QixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3hCLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XHJcblx0QXBwLFxyXG5cdFRGaWxlLFxyXG5cdEFic3RyYWN0SW5wdXRTdWdnZXN0LFxyXG5cdHByZXBhcmVGdXp6eVNlYXJjaCxcclxuXHRTZWFyY2hSZXN1bHQsXHJcbn0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCB7IHByb2Nlc3NEYXRlVGVtcGxhdGVzIH0gZnJvbSBcIkAvdXRpbHMvZmlsZS9maWxlLW9wZXJhdGlvbnNcIjtcclxuXHJcbi8qKlxyXG4gKiBGaWxlIG5hbWUgc3VnZ2VzdCBmb3IgcXVpY2sgY2FwdHVyZSBmaWxlIGNyZWF0aW9uIG1vZGVcclxuICovXHJcbmV4cG9ydCBjbGFzcyBGaWxlTmFtZVN1Z2dlc3QgZXh0ZW5kcyBBYnN0cmFjdElucHV0U3VnZ2VzdDxURmlsZT4ge1xyXG5cdHByaXZhdGUgY3VycmVudEZvbGRlcjogc3RyaW5nID0gXCJcIjtcclxuXHRwcml2YXRlIGZpbGVUZW1wbGF0ZXM6IHN0cmluZ1tdID0gW1xyXG5cdFx0XCJ7e0RBVEU6WVlZWS1NTS1ERH19IC0gTWVldGluZyBOb3Rlc1wiLFxyXG5cdFx0XCJ7e0RBVEU6WVlZWS1NTS1ERH19IC0gRGFpbHkgTG9nXCIsXHJcblx0XHRcInt7REFURTpZWVlZLU1NLUREfX0gLSBUYXNrIExpc3RcIixcclxuXHRcdFwiUHJvamVjdCAtIHt7REFURTpZWVlZLU1NfX1cIixcclxuXHRcdFwiTm90ZXMgLSB7e0RBVEU6WVlZWS1NTS1ERC1ISG1tfX1cIixcclxuXHRdO1xyXG5cdHByb3RlY3RlZCB0ZXh0SW5wdXRFbDogSFRNTElucHV0RWxlbWVudDtcclxuXHJcblx0Y29uc3RydWN0b3IoYXBwOiBBcHAsIHRleHRJbnB1dEVsOiBIVE1MSW5wdXRFbGVtZW50LCBjdXJyZW50Rm9sZGVyPzogc3RyaW5nKSB7XHJcblx0XHRzdXBlcihhcHAsIHRleHRJbnB1dEVsKTtcclxuXHRcdHRoaXMudGV4dElucHV0RWwgPSB0ZXh0SW5wdXRFbDtcclxuXHRcdHRoaXMuY3VycmVudEZvbGRlciA9IGN1cnJlbnRGb2xkZXIgfHwgXCJcIjtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBzdWdnZXN0aW9ucyBiYXNlZCBvbiBpbnB1dFxyXG5cdCAqL1xyXG5cdGdldFN1Z2dlc3Rpb25zKGlucHV0U3RyOiBzdHJpbmcpOiBURmlsZVtdIHtcclxuXHRcdGNvbnN0IGZpbGVzID0gdGhpcy5hcHAudmF1bHQuZ2V0TWFya2Rvd25GaWxlcygpO1xyXG5cdFx0Y29uc3QgbG93ZXJJbnB1dFN0ciA9IGlucHV0U3RyLnRvTG93ZXJDYXNlKCk7XHJcblx0XHRjb25zdCBzdWdnZXN0aW9uczogVEZpbGVbXSA9IFtdO1xyXG5cclxuXHRcdC8vIEZpbHRlciBmaWxlcyBpbiBjdXJyZW50IGZvbGRlclxyXG5cdFx0Y29uc3QgZm9sZGVyRmlsZXMgPSBmaWxlcy5maWx0ZXIoKGZpbGUpID0+IHtcclxuXHRcdFx0aWYgKHRoaXMuY3VycmVudEZvbGRlciAmJiAhZmlsZS5wYXRoLnN0YXJ0c1dpdGgodGhpcy5jdXJyZW50Rm9sZGVyKSkge1xyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gZmlsZS5iYXNlbmFtZS50b0xvd2VyQ2FzZSgpLmNvbnRhaW5zKGxvd2VySW5wdXRTdHIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQWRkIG1hdGNoaW5nIGZpbGVzXHJcblx0XHRzdWdnZXN0aW9ucy5wdXNoKC4uLmZvbGRlckZpbGVzLnNsaWNlKDAsIDUpKTtcclxuXHJcblx0XHRyZXR1cm4gc3VnZ2VzdGlvbnM7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW5kZXIgYSBzdWdnZXN0aW9uXHJcblx0ICovXHJcblx0cmVuZGVyU3VnZ2VzdGlvbihmaWxlOiBURmlsZSwgZWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHRlbC5zZXRUZXh0KGZpbGUuYmFzZW5hbWUpO1xyXG5cdFx0ZWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInN1Z2dlc3Rpb24tZm9sZGVyXCIsXHJcblx0XHRcdHRleHQ6IGZpbGUucGFyZW50Py5wYXRoIHx8IFwiL1wiLFxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTZWxlY3QgYSBzdWdnZXN0aW9uXHJcblx0ICovXHJcblx0c2VsZWN0U3VnZ2VzdGlvbihmaWxlOiBURmlsZSk6IHZvaWQge1xyXG5cdFx0dGhpcy50ZXh0SW5wdXRFbC52YWx1ZSA9IGZpbGUuYmFzZW5hbWU7XHJcblx0XHR0aGlzLnRleHRJbnB1dEVsLnRyaWdnZXIoXCJpbnB1dFwiKTtcclxuXHRcdHRoaXMuY2xvc2UoKTtcclxuXHR9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBGaWxlIG5hbWUgaW5wdXQgY29tcG9uZW50IHdpdGggdGVtcGxhdGUgc3VwcG9ydFxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIEZpbGVOYW1lSW5wdXQge1xyXG5cdHByaXZhdGUgY29udGFpbmVyOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIGlucHV0RWw6IEhUTUxJbnB1dEVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIHN1Z2dlc3Q6IEZpbGVOYW1lU3VnZ2VzdCB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgdGVtcGxhdGVCdXR0b25zOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgYXBwOiBBcHA7XHJcblx0cHJpdmF0ZSBvbkNoYW5nZT86ICh2YWx1ZTogc3RyaW5nKSA9PiB2b2lkO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdGFwcDogQXBwLFxyXG5cdFx0Y29udGFpbmVyOiBIVE1MRWxlbWVudCxcclxuXHRcdG9wdGlvbnM/OiB7XHJcblx0XHRcdHBsYWNlaG9sZGVyPzogc3RyaW5nO1xyXG5cdFx0XHRkZWZhdWx0VmFsdWU/OiBzdHJpbmc7XHJcblx0XHRcdGN1cnJlbnRGb2xkZXI/OiBzdHJpbmc7XHJcblx0XHRcdG9uQ2hhbmdlPzogKHZhbHVlOiBzdHJpbmcpID0+IHZvaWQ7XHJcblx0XHR9XHJcblx0KSB7XHJcblx0XHR0aGlzLmFwcCA9IGFwcDtcclxuXHRcdHRoaXMuY29udGFpbmVyID0gY29udGFpbmVyO1xyXG5cdFx0dGhpcy5vbkNoYW5nZSA9IG9wdGlvbnM/Lm9uQ2hhbmdlO1xyXG5cclxuXHRcdHRoaXMucmVuZGVyKG9wdGlvbnMpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVuZGVyIHRoZSBjb21wb25lbnRcclxuXHQgKi9cclxuXHRwcml2YXRlIHJlbmRlcihvcHRpb25zPzoge1xyXG5cdFx0cGxhY2Vob2xkZXI/OiBzdHJpbmc7XHJcblx0XHRkZWZhdWx0VmFsdWU/OiBzdHJpbmc7XHJcblx0XHRjdXJyZW50Rm9sZGVyPzogc3RyaW5nO1xyXG5cdH0pOiB2b2lkIHtcclxuXHRcdC8vIENyZWF0ZSBpbnB1dCBjb250YWluZXJcclxuXHRcdGNvbnN0IGlucHV0Q29udGFpbmVyID0gdGhpcy5jb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZpbGUtbmFtZS1pbnB1dC1jb250YWluZXJcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIExhYmVsXHJcblx0XHRpbnB1dENvbnRhaW5lci5jcmVhdGVFbChcImxhYmVsXCIsIHtcclxuXHRcdFx0dGV4dDogdChcIkZpbGUgTmFtZVwiKSxcclxuXHRcdFx0Y2xzOiBcImZpbGUtbmFtZS1sYWJlbFwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gSW5wdXQgZmllbGQgd2l0aCBkZWZhdWx0IHRlbXBsYXRlIGFwcGxpZWRcclxuXHRcdGNvbnN0IGRlZmF1bHRWYWx1ZSA9IHByb2Nlc3NEYXRlVGVtcGxhdGVzKG9wdGlvbnM/LmRlZmF1bHRWYWx1ZSB8fCBcInt7REFURTpZWVlZLU1NLUREfX1cIik7XHJcblx0XHR0aGlzLmlucHV0RWwgPSBpbnB1dENvbnRhaW5lci5jcmVhdGVFbChcImlucHV0XCIsIHtcclxuXHRcdFx0dHlwZTogXCJ0ZXh0XCIsXHJcblx0XHRcdGNsczogXCJmaWxlLW5hbWUtaW5wdXRcIixcclxuXHRcdFx0cGxhY2Vob2xkZXI6IG9wdGlvbnM/LnBsYWNlaG9sZGVyIHx8IHQoXCJFbnRlciBmaWxlIG5hbWUuLi5cIiksXHJcblx0XHRcdHZhbHVlOiBkZWZhdWx0VmFsdWUsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBBZGQgc3VnZ2VzdFxyXG5cdFx0dGhpcy5zdWdnZXN0ID0gbmV3IEZpbGVOYW1lU3VnZ2VzdCh0aGlzLmFwcCwgdGhpcy5pbnB1dEVsLCBvcHRpb25zPy5jdXJyZW50Rm9sZGVyKTtcclxuXHJcblx0XHQvLyBUZW1wbGF0ZSBidXR0b25zXHJcblx0XHR0aGlzLmNyZWF0ZVRlbXBsYXRlQnV0dG9ucygpO1xyXG5cclxuXHRcdC8vIEV2ZW50IGxpc3RlbmVyc1xyXG5cdFx0dGhpcy5pbnB1dEVsLmFkZEV2ZW50TGlzdGVuZXIoXCJpbnB1dFwiLCAoKSA9PiB7XHJcblx0XHRcdGlmICh0aGlzLm9uQ2hhbmdlKSB7XHJcblx0XHRcdFx0dGhpcy5vbkNoYW5nZSh0aGlzLmdldFZhbHVlKCkpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZSB0ZW1wbGF0ZSBidXR0b25zXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjcmVhdGVUZW1wbGF0ZUJ1dHRvbnMoKTogdm9pZCB7XHJcblx0XHR0aGlzLnRlbXBsYXRlQnV0dG9ucyA9IHRoaXMuY29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmaWxlLW5hbWUtdGVtcGxhdGVzXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCB0ZW1wbGF0ZXNMYWJlbCA9IHRoaXMudGVtcGxhdGVCdXR0b25zLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ0ZW1wbGF0ZXMtbGFiZWxcIixcclxuXHRcdFx0dGV4dDogdChcIlF1aWNrIFRlbXBsYXRlczpcIiksXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCBidXR0b25Db250YWluZXIgPSB0aGlzLnRlbXBsYXRlQnV0dG9ucy5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwidGVtcGxhdGUtYnV0dG9uc1wiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgdGVtcGxhdGVzID0gW1xyXG5cdFx0XHR7IGxhYmVsOiB0KFwiVG9kYXkncyBOb3RlXCIpLCB0ZW1wbGF0ZTogXCJ7e0RBVEU6WVlZWS1NTS1ERH19XCIgfSxcclxuXHRcdFx0eyBsYWJlbDogdChcIk1lZXRpbmdcIiksIHRlbXBsYXRlOiBcInt7REFURTpZWVlZLU1NLUREfX0gLSBNZWV0aW5nXCIgfSxcclxuXHRcdFx0eyBsYWJlbDogdChcIlByb2plY3RcIiksIHRlbXBsYXRlOiBcIlByb2plY3QgLSB7e0RBVEU6WVlZWS1NTX19XCIgfSxcclxuXHRcdFx0eyBsYWJlbDogdChcIlRhc2sgTGlzdFwiKSwgdGVtcGxhdGU6IFwie3tEQVRFOllZWVktTU0tRER9fSAtIFRhc2tzXCIgfSxcclxuXHRcdF07XHJcblxyXG5cdFx0dGVtcGxhdGVzLmZvckVhY2goKHRtcGwpID0+IHtcclxuXHRcdFx0Y29uc3QgYnV0dG9uID0gYnV0dG9uQ29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0XHR0ZXh0OiB0bXBsLmxhYmVsLFxyXG5cdFx0XHRcdGNsczogXCJ0ZW1wbGF0ZS1idXR0b25cIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdGJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdGlmICh0aGlzLmlucHV0RWwpIHtcclxuXHRcdFx0XHRcdC8vIFByb2Nlc3MgdGVtcGxhdGUgaW1tZWRpYXRlbHlcclxuXHRcdFx0XHRcdGNvbnN0IHByb2Nlc3NlZFZhbHVlID0gcHJvY2Vzc0RhdGVUZW1wbGF0ZXModG1wbC50ZW1wbGF0ZSk7XHJcblx0XHRcdFx0XHR0aGlzLmlucHV0RWwudmFsdWUgPSBwcm9jZXNzZWRWYWx1ZTtcclxuXHRcdFx0XHRcdGlmICh0aGlzLm9uQ2hhbmdlKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMub25DaGFuZ2UodGhpcy5nZXRWYWx1ZSgpKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdHRoaXMuaW5wdXRFbC5mb2N1cygpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0aGUgY3VycmVudCB2YWx1ZVxyXG5cdCAqL1xyXG5cdGdldFZhbHVlKCk6IHN0cmluZyB7XHJcblx0XHRpZiAoIXRoaXMuaW5wdXRFbCkgcmV0dXJuIFwiXCI7XHJcblx0XHQvLyBKdXN0IHJldHVybiB0aGUgdmFsdWUgZGlyZWN0bHkgc2luY2UgdGVtcGxhdGVzIGFyZSBhbHJlYWR5IHByb2Nlc3NlZFxyXG5cdFx0cmV0dXJuIHRoaXMuaW5wdXRFbC52YWx1ZTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNldCB0aGUgdmFsdWVcclxuXHQgKi9cclxuXHRzZXRWYWx1ZSh2YWx1ZTogc3RyaW5nKTogdm9pZCB7XHJcblx0XHRpZiAodGhpcy5pbnB1dEVsKSB7XHJcblx0XHRcdHRoaXMuaW5wdXRFbC52YWx1ZSA9IHZhbHVlO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2xlYXIgdGhlIGlucHV0XHJcblx0ICovXHJcblx0Y2xlYXIoKTogdm9pZCB7XHJcblx0XHR0aGlzLnNldFZhbHVlKFwiXCIpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRm9jdXMgdGhlIGlucHV0XHJcblx0ICovXHJcblx0Zm9jdXMoKTogdm9pZCB7XHJcblx0XHR0aGlzLmlucHV0RWw/LmZvY3VzKCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBEZXN0cm95IHRoZSBjb21wb25lbnRcclxuXHQgKi9cclxuXHRkZXN0cm95KCk6IHZvaWQge1xyXG5cdFx0dGhpcy5zdWdnZXN0Py5jbG9zZSgpO1xyXG5cdFx0dGhpcy5jb250YWluZXIuZW1wdHkoKTtcclxuXHR9XHJcbn0iXX0=