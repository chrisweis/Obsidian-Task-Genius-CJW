import { Modal } from "obsidian";
import { OnCompletionConfigurator, } from "./OnCompletionConfigurator";
import { t } from "@/translations/helper";
import "@/styles/onCompletion.css";
/**
 * Modal for configuring OnCompletion actions
 */
export class OnCompletionModal extends Modal {
    constructor(app, plugin, options) {
        super(app);
        this.currentValue = "";
        this.isValid = false;
        this.plugin = plugin;
        this.options = options;
        this.currentValue = options.initialValue || "";
        // Set modal properties
        this.modalEl.addClass("oncompletion-modal");
        this.titleEl.setText(t("Configure On Completion Action"));
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        // Create configurator container
        const configuratorContainer = contentEl.createDiv({
            cls: "oncompletion-modal-content",
        });
        // Initialize OnCompletionConfigurator
        const configuratorOptions = {
            initialValue: this.currentValue,
            onChange: (value) => {
                this.currentValue = value;
            },
            onValidationChange: (isValid, error) => {
                this.isValid = isValid;
                this.updateSaveButtonState();
            },
        };
        this.configurator = new OnCompletionConfigurator(configuratorContainer, this.plugin, configuratorOptions);
        this.configurator.onload();
        // Create button container
        const buttonContainer = contentEl.createDiv({
            cls: "oncompletion-modal-buttons",
        });
        // Save button
        const saveButton = buttonContainer.createEl("button", {
            text: t("Save"),
            cls: "mod-cta",
        });
        saveButton.addEventListener("click", () => this.handleSave());
        // Cancel button
        const cancelButton = buttonContainer.createEl("button", {
            text: t("Cancel"),
        });
        cancelButton.addEventListener("click", () => this.handleCancel());
        // Reset button
        const resetButton = buttonContainer.createEl("button", {
            text: t("Reset"),
        });
        resetButton.addEventListener("click", () => this.handleReset());
        // Store button references for state management
        this.saveButton = saveButton;
        this.resetButton = resetButton;
        // Set initial button state
        this.updateSaveButtonState();
    }
    updateSaveButtonState() {
        const saveButton = this.saveButton;
        if (saveButton) {
            saveButton.disabled =
                !this.isValid && this.currentValue.trim() !== "";
        }
    }
    handleSave() {
        if (this.options.onSave) {
            this.options.onSave(this.currentValue);
        }
        this.close();
    }
    handleCancel() {
        if (this.options.onCancel) {
            this.options.onCancel();
        }
        this.close();
    }
    handleReset() {
        this.currentValue = "";
        this.configurator.setValue("");
        this.updateSaveButtonState();
    }
    onClose() {
        const { contentEl } = this;
        if (this.configurator) {
            this.configurator.unload();
        }
        contentEl.empty();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT25Db21wbGV0aW9uTW9kYWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJPbkNvbXBsZXRpb25Nb2RhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQU8sS0FBSyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQ3RDLE9BQU8sRUFDTix3QkFBd0IsR0FFeEIsTUFBTSw0QkFBNEIsQ0FBQztBQUVwQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDMUMsT0FBTywyQkFBMkIsQ0FBQztBQVFuQzs7R0FFRztBQUNILE1BQU0sT0FBTyxpQkFBa0IsU0FBUSxLQUFLO0lBTzNDLFlBQ0MsR0FBUSxFQUNSLE1BQTZCLEVBQzdCLE9BQWlDO1FBRWpDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQVJKLGlCQUFZLEdBQVcsRUFBRSxDQUFDO1FBQzFCLFlBQU8sR0FBWSxLQUFLLENBQUM7UUFRaEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFDdkIsSUFBSSxDQUFDLFlBQVksR0FBRyxPQUFPLENBQUMsWUFBWSxJQUFJLEVBQUUsQ0FBQztRQUUvQyx1QkFBdUI7UUFDdkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUM1QyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZ0NBQWdDLENBQUMsQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFFRCxNQUFNO1FBQ0wsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQztRQUMzQixTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFbEIsZ0NBQWdDO1FBQ2hDLE1BQU0scUJBQXFCLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQztZQUNqRCxHQUFHLEVBQUUsNEJBQTRCO1NBQ2pDLENBQUMsQ0FBQztRQUVILHNDQUFzQztRQUN0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Q0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDL0IsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUVELE9BQU87UUFDTixNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBQzNCLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRTtZQUN0QixJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDO1NBQzNCO1FBQ0QsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ25CLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcCwgTW9kYWwgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHtcclxuXHRPbkNvbXBsZXRpb25Db25maWd1cmF0b3IsXHJcblx0T25Db21wbGV0aW9uQ29uZmlndXJhdG9yT3B0aW9ucyxcclxufSBmcm9tIFwiLi9PbkNvbXBsZXRpb25Db25maWd1cmF0b3JcIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgXCJAL3N0eWxlcy9vbkNvbXBsZXRpb24uY3NzXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE9uQ29tcGxldGlvbk1vZGFsT3B0aW9ucyB7XHJcblx0aW5pdGlhbFZhbHVlPzogc3RyaW5nO1xyXG5cdG9uU2F2ZTogKHZhbHVlOiBzdHJpbmcpID0+IHZvaWQ7XHJcblx0b25DYW5jZWw/OiAoKSA9PiB2b2lkO1xyXG59XHJcblxyXG4vKipcclxuICogTW9kYWwgZm9yIGNvbmZpZ3VyaW5nIE9uQ29tcGxldGlvbiBhY3Rpb25zXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgT25Db21wbGV0aW9uTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XHJcblx0cHJpdmF0ZSBjb25maWd1cmF0b3I6IE9uQ29tcGxldGlvbkNvbmZpZ3VyYXRvcjtcclxuXHRwcml2YXRlIG9wdGlvbnM6IE9uQ29tcGxldGlvbk1vZGFsT3B0aW9ucztcclxuXHRwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luO1xyXG5cdHByaXZhdGUgY3VycmVudFZhbHVlOiBzdHJpbmcgPSBcIlwiO1xyXG5cdHByaXZhdGUgaXNWYWxpZDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdGFwcDogQXBwLFxyXG5cdFx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRvcHRpb25zOiBPbkNvbXBsZXRpb25Nb2RhbE9wdGlvbnNcclxuXHQpIHtcclxuXHRcdHN1cGVyKGFwcCk7XHJcblx0XHR0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuXHRcdHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XHJcblx0XHR0aGlzLmN1cnJlbnRWYWx1ZSA9IG9wdGlvbnMuaW5pdGlhbFZhbHVlIHx8IFwiXCI7XHJcblxyXG5cdFx0Ly8gU2V0IG1vZGFsIHByb3BlcnRpZXNcclxuXHRcdHRoaXMubW9kYWxFbC5hZGRDbGFzcyhcIm9uY29tcGxldGlvbi1tb2RhbFwiKTtcclxuXHRcdHRoaXMudGl0bGVFbC5zZXRUZXh0KHQoXCJDb25maWd1cmUgT24gQ29tcGxldGlvbiBBY3Rpb25cIikpO1xyXG5cdH1cclxuXHJcblx0b25PcGVuKCkge1xyXG5cdFx0Y29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcblx0XHRjb250ZW50RWwuZW1wdHkoKTtcclxuXHJcblx0XHQvLyBDcmVhdGUgY29uZmlndXJhdG9yIGNvbnRhaW5lclxyXG5cdFx0Y29uc3QgY29uZmlndXJhdG9yQ29udGFpbmVyID0gY29udGVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJvbmNvbXBsZXRpb24tbW9kYWwtY29udGVudFwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBPbkNvbXBsZXRpb25Db25maWd1cmF0b3JcclxuXHRcdGNvbnN0IGNvbmZpZ3VyYXRvck9wdGlvbnM6IE9uQ29tcGxldGlvbkNvbmZpZ3VyYXRvck9wdGlvbnMgPSB7XHJcblx0XHRcdGluaXRpYWxWYWx1ZTogdGhpcy5jdXJyZW50VmFsdWUsXHJcblx0XHRcdG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcclxuXHRcdFx0XHR0aGlzLmN1cnJlbnRWYWx1ZSA9IHZhbHVlO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRvblZhbGlkYXRpb25DaGFuZ2U6IChpc1ZhbGlkLCBlcnJvcikgPT4ge1xyXG5cdFx0XHRcdHRoaXMuaXNWYWxpZCA9IGlzVmFsaWQ7XHJcblx0XHRcdFx0dGhpcy51cGRhdGVTYXZlQnV0dG9uU3RhdGUoKTtcclxuXHRcdFx0fSxcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5jb25maWd1cmF0b3IgPSBuZXcgT25Db21wbGV0aW9uQ29uZmlndXJhdG9yKFxyXG5cdFx0XHRjb25maWd1cmF0b3JDb250YWluZXIsXHJcblx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHRjb25maWd1cmF0b3JPcHRpb25zXHJcblx0XHQpO1xyXG5cclxuXHRcdHRoaXMuY29uZmlndXJhdG9yLm9ubG9hZCgpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBidXR0b24gY29udGFpbmVyXHJcblx0XHRjb25zdCBidXR0b25Db250YWluZXIgPSBjb250ZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcIm9uY29tcGxldGlvbi1tb2RhbC1idXR0b25zXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBTYXZlIGJ1dHRvblxyXG5cdFx0Y29uc3Qgc2F2ZUJ1dHRvbiA9IGJ1dHRvbkNvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXCJTYXZlXCIpLFxyXG5cdFx0XHRjbHM6IFwibW9kLWN0YVwiLFxyXG5cdFx0fSk7XHJcblx0XHRzYXZlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmhhbmRsZVNhdmUoKSk7XHJcblxyXG5cdFx0Ly8gQ2FuY2VsIGJ1dHRvblxyXG5cdFx0Y29uc3QgY2FuY2VsQnV0dG9uID0gYnV0dG9uQ29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0dGV4dDogdChcIkNhbmNlbFwiKSxcclxuXHRcdH0pO1xyXG5cdFx0Y2FuY2VsQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmhhbmRsZUNhbmNlbCgpKTtcclxuXHJcblx0XHQvLyBSZXNldCBidXR0b25cclxuXHRcdGNvbnN0IHJlc2V0QnV0dG9uID0gYnV0dG9uQ29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0dGV4dDogdChcIlJlc2V0XCIpLFxyXG5cdFx0fSk7XHJcblx0XHRyZXNldEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5oYW5kbGVSZXNldCgpKTtcclxuXHJcblx0XHQvLyBTdG9yZSBidXR0b24gcmVmZXJlbmNlcyBmb3Igc3RhdGUgbWFuYWdlbWVudFxyXG5cdFx0KHRoaXMgYXMgYW55KS5zYXZlQnV0dG9uID0gc2F2ZUJ1dHRvbjtcclxuXHRcdCh0aGlzIGFzIGFueSkucmVzZXRCdXR0b24gPSByZXNldEJ1dHRvbjtcclxuXHJcblx0XHQvLyBTZXQgaW5pdGlhbCBidXR0b24gc3RhdGVcclxuXHRcdHRoaXMudXBkYXRlU2F2ZUJ1dHRvblN0YXRlKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHVwZGF0ZVNhdmVCdXR0b25TdGF0ZSgpIHtcclxuXHRcdGNvbnN0IHNhdmVCdXR0b24gPSAodGhpcyBhcyBhbnkpLnNhdmVCdXR0b24gYXMgSFRNTEJ1dHRvbkVsZW1lbnQ7XHJcblx0XHRpZiAoc2F2ZUJ1dHRvbikge1xyXG5cdFx0XHRzYXZlQnV0dG9uLmRpc2FibGVkID1cclxuXHRcdFx0XHQhdGhpcy5pc1ZhbGlkICYmIHRoaXMuY3VycmVudFZhbHVlLnRyaW0oKSAhPT0gXCJcIjtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaGFuZGxlU2F2ZSgpIHtcclxuXHRcdGlmICh0aGlzLm9wdGlvbnMub25TYXZlKSB7XHJcblx0XHRcdHRoaXMub3B0aW9ucy5vblNhdmUodGhpcy5jdXJyZW50VmFsdWUpO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5jbG9zZSgpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBoYW5kbGVDYW5jZWwoKSB7XHJcblx0XHRpZiAodGhpcy5vcHRpb25zLm9uQ2FuY2VsKSB7XHJcblx0XHRcdHRoaXMub3B0aW9ucy5vbkNhbmNlbCgpO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5jbG9zZSgpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBoYW5kbGVSZXNldCgpIHtcclxuXHRcdHRoaXMuY3VycmVudFZhbHVlID0gXCJcIjtcclxuXHRcdHRoaXMuY29uZmlndXJhdG9yLnNldFZhbHVlKFwiXCIpO1xyXG5cdFx0dGhpcy51cGRhdGVTYXZlQnV0dG9uU3RhdGUoKTtcclxuXHR9XHJcblxyXG5cdG9uQ2xvc2UoKSB7XHJcblx0XHRjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcclxuXHRcdGlmICh0aGlzLmNvbmZpZ3VyYXRvcikge1xyXG5cdFx0XHR0aGlzLmNvbmZpZ3VyYXRvci51bmxvYWQoKTtcclxuXHRcdH1cclxuXHRcdGNvbnRlbnRFbC5lbXB0eSgpO1xyXG5cdH1cclxufVxyXG4iXX0=