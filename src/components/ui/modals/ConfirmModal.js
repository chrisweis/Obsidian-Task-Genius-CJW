import { __awaiter } from "tslib";
import { ButtonComponent, Modal, MarkdownRenderer } from "obsidian";
import "@/styles/modal.css";
export class ConfirmModal extends Modal {
    constructor(plugin, params) {
        super(plugin.app);
        this.params = params;
        this.plugin = plugin;
    }
    onOpen() {
        return __awaiter(this, void 0, void 0, function* () {
            this.titleEl.setText(this.params.title);
            // Check if message contains newlines to determine if Markdown rendering is needed
            if (this.params.message.includes('\n')) {
                // Use MarkdownRenderer for multi-line content
                yield MarkdownRenderer.render(this.plugin.app, this.params.message, this.contentEl, '', this.plugin);
            }
            else {
                // Use setText for single-line content
                this.contentEl.setText(this.params.message);
            }
            const buttonsContainer = this.contentEl.createEl("div", {
                cls: "confirm-modal-buttons",
            });
            new ButtonComponent(buttonsContainer)
                .setButtonText(this.params.confirmText)
                .setCta()
                .onClick(() => {
                this.params.onConfirm(true);
                this.close();
            });
            new ButtonComponent(buttonsContainer)
                .setButtonText(this.params.cancelText)
                .setCta()
                .onClick(() => {
                this.params.onConfirm(false);
                this.close();
            });
        });
    }
    onClose() {
        this.contentEl.empty();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29uZmlybU1vZGFsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQ29uZmlybU1vZGFsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBQU8sZUFBZSxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUV6RSxPQUFPLG9CQUFvQixDQUFDO0FBRTVCLE1BQU0sT0FBTyxZQUFhLFNBQVEsS0FBSztJQUd0QyxZQUNDLE1BQTZCLEVBQ3RCLE1BTU47UUFFRCxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBUlgsV0FBTSxHQUFOLE1BQU0sQ0FNWjtRQUdELElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3RCLENBQUM7SUFFSyxNQUFNOztZQUNYLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFeEMsa0ZBQWtGO1lBQ2xGLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUN2Qyw4Q0FBOEM7Z0JBQzlDLE1BQU0sZ0JBQWdCLENBQUMsTUFBTSxDQUM1QixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFDZixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFDbkIsSUFBSSxDQUFDLFNBQVMsRUFDZCxFQUFFLEVBQ0YsSUFBSSxDQUFDLE1BQU0sQ0FDWCxDQUFDO2FBQ0Y7aUJBQU07Z0JBQ04sc0NBQXNDO2dCQUN0QyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQzVDO1lBRUQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUU7Z0JBQ3ZELEdBQUcsRUFBRSx1QkFBdUI7YUFDNUIsQ0FBQyxDQUFDO1lBRUgsSUFBSSxlQUFlLENBQUMsZ0JBQWdCLENBQUM7aUJBQ25DLGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQztpQkFDdEMsTUFBTSxFQUFFO2lCQUNSLE9BQU8sQ0FBQyxHQUFHLEVBQUU7Z0JBQ2IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzVCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxDQUFDO1lBRUosSUFBSSxlQUFlLENBQUMsZ0JBQWdCLENBQUM7aUJBQ25DLGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztpQkFDckMsTUFBTSxFQUFFO2lCQUNSLE9BQU8sQ0FBQyxHQUFHLEVBQUU7Z0JBQ2IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQzdCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNkLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztLQUFBO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDeEIsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwLCBCdXR0b25Db21wb25lbnQsIE1vZGFsLCBNYXJrZG93blJlbmRlcmVyIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjtcclxuaW1wb3J0IFwiQC9zdHlsZXMvbW9kYWwuY3NzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgQ29uZmlybU1vZGFsIGV4dGVuZHMgTW9kYWwge1xyXG5cdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRwdWJsaWMgcGFyYW1zOiB7XHJcblx0XHRcdHRpdGxlOiBzdHJpbmc7XHJcblx0XHRcdG1lc3NhZ2U6IHN0cmluZztcclxuXHRcdFx0Y29uZmlybVRleHQ6IHN0cmluZztcclxuXHRcdFx0Y2FuY2VsVGV4dDogc3RyaW5nO1xyXG5cdFx0XHRvbkNvbmZpcm06IChjb25maXJtZWQ6IGJvb2xlYW4pID0+IHZvaWQ7XHJcblx0XHR9XHJcblx0KSB7XHJcblx0XHRzdXBlcihwbHVnaW4uYXBwKTtcclxuXHRcdHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG5cdH1cclxuXHJcblx0YXN5bmMgb25PcGVuKCkge1xyXG5cdFx0dGhpcy50aXRsZUVsLnNldFRleHQodGhpcy5wYXJhbXMudGl0bGUpO1xyXG5cclxuXHRcdC8vIENoZWNrIGlmIG1lc3NhZ2UgY29udGFpbnMgbmV3bGluZXMgdG8gZGV0ZXJtaW5lIGlmIE1hcmtkb3duIHJlbmRlcmluZyBpcyBuZWVkZWRcclxuXHRcdGlmICh0aGlzLnBhcmFtcy5tZXNzYWdlLmluY2x1ZGVzKCdcXG4nKSkge1xyXG5cdFx0XHQvLyBVc2UgTWFya2Rvd25SZW5kZXJlciBmb3IgbXVsdGktbGluZSBjb250ZW50XHJcblx0XHRcdGF3YWl0IE1hcmtkb3duUmVuZGVyZXIucmVuZGVyKFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLmFwcCxcclxuXHRcdFx0XHR0aGlzLnBhcmFtcy5tZXNzYWdlLFxyXG5cdFx0XHRcdHRoaXMuY29udGVudEVsLFxyXG5cdFx0XHRcdCcnLFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luXHJcblx0XHRcdCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBVc2Ugc2V0VGV4dCBmb3Igc2luZ2xlLWxpbmUgY29udGVudFxyXG5cdFx0XHR0aGlzLmNvbnRlbnRFbC5zZXRUZXh0KHRoaXMucGFyYW1zLm1lc3NhZ2UpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IGJ1dHRvbnNDb250YWluZXIgPSB0aGlzLmNvbnRlbnRFbC5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdGNsczogXCJjb25maXJtLW1vZGFsLWJ1dHRvbnNcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdG5ldyBCdXR0b25Db21wb25lbnQoYnV0dG9uc0NvbnRhaW5lcilcclxuXHRcdFx0LnNldEJ1dHRvblRleHQodGhpcy5wYXJhbXMuY29uZmlybVRleHQpXHJcblx0XHRcdC5zZXRDdGEoKVxyXG5cdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5wYXJhbXMub25Db25maXJtKHRydWUpO1xyXG5cdFx0XHRcdHRoaXMuY2xvc2UoKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0bmV3IEJ1dHRvbkNvbXBvbmVudChidXR0b25zQ29udGFpbmVyKVxyXG5cdFx0XHQuc2V0QnV0dG9uVGV4dCh0aGlzLnBhcmFtcy5jYW5jZWxUZXh0KVxyXG5cdFx0XHQuc2V0Q3RhKClcclxuXHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMucGFyYW1zLm9uQ29uZmlybShmYWxzZSk7XHJcblx0XHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0XHR9KTtcclxuXHR9XHJcblxyXG5cdG9uQ2xvc2UoKSB7XHJcblx0XHR0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xyXG5cdH1cclxufVxyXG4iXX0=