import { __awaiter } from "tslib";
import { Modal, ButtonComponent } from "obsidian";
import { t } from "@/translations/helper";
import "@/styles/modal.css";
/**
 * A modal for configuring list of strings with add/remove functionality
 * Used for settings that need multiple string values like headings, tags, etc.
 */
export class ListConfigModal extends Modal {
    constructor(plugin, params) {
        super(plugin.app);
        this.plugin = plugin;
        this.params = params;
        this.currentValues = [...params.values];
    }
    onOpen() {
        return __awaiter(this, void 0, void 0, function* () {
            this.titleEl.setText(this.params.title);
            this.contentEl.addClass("list-config-modal");
            // Description
            this.contentEl.createEl("p", {
                text: this.params.description,
                cls: "list-config-description",
            });
            // List container
            this.listContainer = this.contentEl.createDiv({
                cls: "list-config-container",
            });
            // Render the initial list
            this.renderList();
            // Buttons container
            const buttonsContainer = this.contentEl.createDiv({
                cls: "modal-button-container",
            });
            // Add item button
            new ButtonComponent(buttonsContainer)
                .setButtonText(t("Add Item"))
                .setIcon("plus")
                .onClick(() => {
                this.currentValues.push("");
                this.renderList();
                // Focus the new input
                const inputs = this.listContainer.querySelectorAll("input");
                const lastInput = inputs[inputs.length - 1];
                if (lastInput) {
                    lastInput.focus();
                }
            });
            // Save button
            new ButtonComponent(buttonsContainer)
                .setButtonText(t("Save"))
                .setCta()
                .onClick(() => {
                // Filter out empty values
                const cleanValues = this.currentValues
                    .map((v) => v.trim())
                    .filter((v) => v.length > 0);
                this.params.onSave(cleanValues);
                this.close();
            });
            // Cancel button
            new ButtonComponent(buttonsContainer)
                .setButtonText(t("Cancel"))
                .onClick(() => {
                this.close();
            });
        });
    }
    renderList() {
        this.listContainer.empty();
        if (this.currentValues.length === 0) {
            const emptyState = this.listContainer.createDiv({
                cls: "list-config-empty",
            });
            emptyState.createEl("p", {
                text: t("No items configured. Click 'Add Item' to get started."),
                cls: "list-config-empty-text",
            });
            return;
        }
        this.currentValues.forEach((value, index) => {
            const itemContainer = this.listContainer.createDiv({
                cls: "list-config-item",
            });
            // Input field
            const input = itemContainer.createEl("input", {
                type: "text",
                value: value,
                placeholder: this.params.placeholder || t("Enter value"),
                cls: "list-config-input",
            });
            input.addEventListener("input", (e) => {
                const target = e.target;
                this.currentValues[index] = target.value;
            });
            // Delete button
            const deleteBtn = itemContainer.createEl("button", {
                cls: "list-config-delete-btn",
                attr: {
                    "aria-label": t("Delete item"),
                    title: t("Delete this item"),
                },
            });
            deleteBtn.createEl("span", {
                text: "×",
                cls: "list-config-delete-icon",
            });
            deleteBtn.addEventListener("click", () => {
                this.currentValues.splice(index, 1);
                this.renderList();
            });
        });
    }
    onClose() {
        this.contentEl.empty();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTGlzdENvbmZpZ01vZGFsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiTGlzdENvbmZpZ01vZGFsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBQUUsS0FBSyxFQUFXLGVBQWUsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUUzRCxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDMUMsT0FBTyxvQkFBb0IsQ0FBQztBQVU1Qjs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sZUFBZ0IsU0FBUSxLQUFLO0lBTXpDLFlBQVksTUFBNkIsRUFBRSxNQUE2QjtRQUN2RSxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2xCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxhQUFhLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBRUssTUFBTTs7WUFDWCxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3hDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLENBQUM7WUFFN0MsY0FBYztZQUNkLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRTtnQkFDNUIsSUFBSSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVztnQkFDN0IsR0FBRyxFQUFFLHlCQUF5QjthQUM5QixDQUFDLENBQUM7WUFFSCxpQkFBaUI7WUFDakIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQztnQkFDN0MsR0FBRyxFQUFFLHVCQUF1QjthQUM1QixDQUFDLENBQUM7WUFFSCwwQkFBMEI7WUFDMUIsSUFBSSxDQUFDLFVBQVUs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SSxDQUFDLENBQUMsYUFBYSxDQUFDO2dCQUN4RCxHQUFHLEVBQUUsbUJBQW1CO2FBQ3hCLENBQUMsQ0FBQztZQUVILEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDckMsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQTBCLENBQUM7Z0JBQzVDLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQztZQUMxQyxDQUFDLENBQUMsQ0FBQztZQUVILGdCQUFnQjtZQUNoQixNQUFNLFNBQVMsR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRTtnQkFDbEQsR0FBRyxFQUFFLHdCQUF3QjtnQkFDN0IsSUFBSSxFQUFFO29CQUNMLFlBQVksRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDO29CQUM5QixLQUFLLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixDQUFDO2lCQUM1QjthQUNELENBQUMsQ0FBQztZQUNILFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFO2dCQUMxQixJQUFJLEVBQUUsR0FBRztnQkFDVCxHQUFHLEVBQUUseUJBQXlCO2FBQzlCLENBQUMsQ0FBQztZQUVILFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO2dCQUN4QyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNuQixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3hCLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1vZGFsLCBTZXR0aW5nLCBCdXR0b25Db21wb25lbnQgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgXCJAL3N0eWxlcy9tb2RhbC5jc3NcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTGlzdENvbmZpZ01vZGFsUGFyYW1zIHtcclxuXHR0aXRsZTogc3RyaW5nO1xyXG5cdGRlc2NyaXB0aW9uOiBzdHJpbmcgfCBEb2N1bWVudEZyYWdtZW50O1xyXG5cdHBsYWNlaG9sZGVyPzogc3RyaW5nO1xyXG5cdHZhbHVlczogc3RyaW5nW107XHJcblx0b25TYXZlOiAodmFsdWVzOiBzdHJpbmdbXSkgPT4gdm9pZDtcclxufVxyXG5cclxuLyoqXHJcbiAqIEEgbW9kYWwgZm9yIGNvbmZpZ3VyaW5nIGxpc3Qgb2Ygc3RyaW5ncyB3aXRoIGFkZC9yZW1vdmUgZnVuY3Rpb25hbGl0eVxyXG4gKiBVc2VkIGZvciBzZXR0aW5ncyB0aGF0IG5lZWQgbXVsdGlwbGUgc3RyaW5nIHZhbHVlcyBsaWtlIGhlYWRpbmdzLCB0YWdzLCBldGMuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgTGlzdENvbmZpZ01vZGFsIGV4dGVuZHMgTW9kYWwge1xyXG5cdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblx0cHJpdmF0ZSBwYXJhbXM6IExpc3RDb25maWdNb2RhbFBhcmFtcztcclxuXHRwcml2YXRlIGN1cnJlbnRWYWx1ZXM6IHN0cmluZ1tdO1xyXG5cdHByaXZhdGUgbGlzdENvbnRhaW5lcjogSFRNTEVsZW1lbnQ7XHJcblxyXG5cdGNvbnN0cnVjdG9yKHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLCBwYXJhbXM6IExpc3RDb25maWdNb2RhbFBhcmFtcykge1xyXG5cdFx0c3VwZXIocGx1Z2luLmFwcCk7XHJcblx0XHR0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuXHRcdHRoaXMucGFyYW1zID0gcGFyYW1zO1xyXG5cdFx0dGhpcy5jdXJyZW50VmFsdWVzID0gWy4uLnBhcmFtcy52YWx1ZXNdO1xyXG5cdH1cclxuXHJcblx0YXN5bmMgb25PcGVuKCkge1xyXG5cdFx0dGhpcy50aXRsZUVsLnNldFRleHQodGhpcy5wYXJhbXMudGl0bGUpO1xyXG5cdFx0dGhpcy5jb250ZW50RWwuYWRkQ2xhc3MoXCJsaXN0LWNvbmZpZy1tb2RhbFwiKTtcclxuXHJcblx0XHQvLyBEZXNjcmlwdGlvblxyXG5cdFx0dGhpcy5jb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHtcclxuXHRcdFx0dGV4dDogdGhpcy5wYXJhbXMuZGVzY3JpcHRpb24sXHJcblx0XHRcdGNsczogXCJsaXN0LWNvbmZpZy1kZXNjcmlwdGlvblwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gTGlzdCBjb250YWluZXJcclxuXHRcdHRoaXMubGlzdENvbnRhaW5lciA9IHRoaXMuY29udGVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJsaXN0LWNvbmZpZy1jb250YWluZXJcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFJlbmRlciB0aGUgaW5pdGlhbCBsaXN0XHJcblx0XHR0aGlzLnJlbmRlckxpc3QoKTtcclxuXHJcblx0XHQvLyBCdXR0b25zIGNvbnRhaW5lclxyXG5cdFx0Y29uc3QgYnV0dG9uc0NvbnRhaW5lciA9IHRoaXMuY29udGVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJtb2RhbC1idXR0b24tY29udGFpbmVyXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBBZGQgaXRlbSBidXR0b25cclxuXHRcdG5ldyBCdXR0b25Db21wb25lbnQoYnV0dG9uc0NvbnRhaW5lcilcclxuXHRcdFx0LnNldEJ1dHRvblRleHQodChcIkFkZCBJdGVtXCIpKVxyXG5cdFx0XHQuc2V0SWNvbihcInBsdXNcIilcclxuXHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMuY3VycmVudFZhbHVlcy5wdXNoKFwiXCIpO1xyXG5cdFx0XHRcdHRoaXMucmVuZGVyTGlzdCgpO1xyXG5cdFx0XHRcdC8vIEZvY3VzIHRoZSBuZXcgaW5wdXRcclxuXHRcdFx0XHRjb25zdCBpbnB1dHMgPSB0aGlzLmxpc3RDb250YWluZXIucXVlcnlTZWxlY3RvckFsbChcImlucHV0XCIpO1xyXG5cdFx0XHRcdGNvbnN0IGxhc3RJbnB1dCA9IGlucHV0c1tpbnB1dHMubGVuZ3RoIC0gMV0gYXMgSFRNTElucHV0RWxlbWVudDtcclxuXHRcdFx0XHRpZiAobGFzdElucHV0KSB7XHJcblx0XHRcdFx0XHRsYXN0SW5wdXQuZm9jdXMoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdC8vIFNhdmUgYnV0dG9uXHJcblx0XHRuZXcgQnV0dG9uQ29tcG9uZW50KGJ1dHRvbnNDb250YWluZXIpXHJcblx0XHRcdC5zZXRCdXR0b25UZXh0KHQoXCJTYXZlXCIpKVxyXG5cdFx0XHQuc2V0Q3RhKClcclxuXHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdC8vIEZpbHRlciBvdXQgZW1wdHkgdmFsdWVzXHJcblx0XHRcdFx0Y29uc3QgY2xlYW5WYWx1ZXMgPSB0aGlzLmN1cnJlbnRWYWx1ZXNcclxuXHRcdFx0XHRcdC5tYXAoKHYpID0+IHYudHJpbSgpKVxyXG5cdFx0XHRcdFx0LmZpbHRlcigodikgPT4gdi5sZW5ndGggPiAwKTtcclxuXHRcdFx0XHR0aGlzLnBhcmFtcy5vblNhdmUoY2xlYW5WYWx1ZXMpO1xyXG5cdFx0XHRcdHRoaXMuY2xvc2UoKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ2FuY2VsIGJ1dHRvblxyXG5cdFx0bmV3IEJ1dHRvbkNvbXBvbmVudChidXR0b25zQ29udGFpbmVyKVxyXG5cdFx0XHQuc2V0QnV0dG9uVGV4dCh0KFwiQ2FuY2VsXCIpKVxyXG5cdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyTGlzdCgpIHtcclxuXHRcdHRoaXMubGlzdENvbnRhaW5lci5lbXB0eSgpO1xyXG5cclxuXHRcdGlmICh0aGlzLmN1cnJlbnRWYWx1ZXMubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdGNvbnN0IGVtcHR5U3RhdGUgPSB0aGlzLmxpc3RDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwibGlzdC1jb25maWctZW1wdHlcIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdGVtcHR5U3RhdGUuY3JlYXRlRWwoXCJwXCIsIHtcclxuXHRcdFx0XHR0ZXh0OiB0KFxyXG5cdFx0XHRcdFx0XCJObyBpdGVtcyBjb25maWd1cmVkLiBDbGljayAnQWRkIEl0ZW0nIHRvIGdldCBzdGFydGVkLlwiXHJcblx0XHRcdFx0KSxcclxuXHRcdFx0XHRjbHM6IFwibGlzdC1jb25maWctZW1wdHktdGV4dFwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuY3VycmVudFZhbHVlcy5mb3JFYWNoKCh2YWx1ZSwgaW5kZXgpID0+IHtcclxuXHRcdFx0Y29uc3QgaXRlbUNvbnRhaW5lciA9IHRoaXMubGlzdENvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJsaXN0LWNvbmZpZy1pdGVtXCIsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gSW5wdXQgZmllbGRcclxuXHRcdFx0Y29uc3QgaW5wdXQgPSBpdGVtQ29udGFpbmVyLmNyZWF0ZUVsKFwiaW5wdXRcIiwge1xyXG5cdFx0XHRcdHR5cGU6IFwidGV4dFwiLFxyXG5cdFx0XHRcdHZhbHVlOiB2YWx1ZSxcclxuXHRcdFx0XHRwbGFjZWhvbGRlcjogdGhpcy5wYXJhbXMucGxhY2Vob2xkZXIgfHwgdChcIkVudGVyIHZhbHVlXCIpLFxyXG5cdFx0XHRcdGNsczogXCJsaXN0LWNvbmZpZy1pbnB1dFwiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJpbnB1dFwiLCAoZSkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IHRhcmdldCA9IGUudGFyZ2V0IGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcblx0XHRcdFx0dGhpcy5jdXJyZW50VmFsdWVzW2luZGV4XSA9IHRhcmdldC52YWx1ZTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBEZWxldGUgYnV0dG9uXHJcblx0XHRcdGNvbnN0IGRlbGV0ZUJ0biA9IGl0ZW1Db250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHRcdGNsczogXCJsaXN0LWNvbmZpZy1kZWxldGUtYnRuXCIsXHJcblx0XHRcdFx0YXR0cjoge1xyXG5cdFx0XHRcdFx0XCJhcmlhLWxhYmVsXCI6IHQoXCJEZWxldGUgaXRlbVwiKSxcclxuXHRcdFx0XHRcdHRpdGxlOiB0KFwiRGVsZXRlIHRoaXMgaXRlbVwiKSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0ZGVsZXRlQnRuLmNyZWF0ZUVsKFwic3BhblwiLCB7XHJcblx0XHRcdFx0dGV4dDogXCLDl1wiLFxyXG5cdFx0XHRcdGNsczogXCJsaXN0LWNvbmZpZy1kZWxldGUtaWNvblwiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGRlbGV0ZUJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMuY3VycmVudFZhbHVlcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0XHRcdHRoaXMucmVuZGVyTGlzdCgpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0b25DbG9zZSgpIHtcclxuXHRcdHRoaXMuY29udGVudEVsLmVtcHR5KCk7XHJcblx0fVxyXG59XHJcbiJdfQ==