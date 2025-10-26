import { Modal, setIcon } from "obsidian";
export class IframeModal extends Modal {
    constructor(app, url, title) {
        super(app);
        this.url = url;
        this.title = title;
    }
    onOpen() {
        if (this.title) {
            this.titleEl.setText(this.title);
        }
        // Add external link button to header
        const headerActions = this.titleEl;
        if (headerActions) {
            const externalLinkBtn = headerActions.createEl('button', {
                cls: 'clickable-icon task-genius-external-link-btn',
                attr: {
                    'aria-label': 'Open in external browser',
                    'title': 'Open in external browser'
                }
            });
            // Add icon using Obsidian's setIcon
            setIcon(externalLinkBtn, 'external-link');
            externalLinkBtn.addEventListener('click', () => {
                window.open(this.url, '_blank');
            });
        }
        const { contentEl } = this;
        this.modalEl.toggleClass("task-genius-iframe-modal", true);
        contentEl.empty();
        const container = contentEl.createDiv({ cls: "iframe-modal-container" });
        container.setAttr("style", "width: 100%; height: 80vh; display: flex;");
        const iframe = container.createEl("iframe");
        iframe.setAttr("src", this.url);
        iframe.setAttr("style", "flex: 1; border: none; width: 100%; height: 100%;");
    }
    onClose() {
        this.contentEl.empty();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSWZyYW1lTW9kYWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJJZnJhbWVNb2RhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQU8sS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUUvQyxNQUFNLE9BQU8sV0FBWSxTQUFRLEtBQUs7SUFJckMsWUFBWSxHQUFRLEVBQUUsR0FBVyxFQUFFLEtBQWM7UUFDaEQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ1gsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7UUFDZixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztJQUNwQixDQUFDO0lBRUQsTUFBTTtRQUNMLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNmLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUNqQztRQUVELHFDQUFxQztRQUNyQyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ25DLElBQUksYUFBYSxFQUFFO1lBQ2xCLE1BQU0sZUFBZSxHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFO2dCQUN4RCxHQUFHLEVBQUUsOENBQThDO2dCQUNuRCxJQUFJLEVBQUU7b0JBQ0wsWUFBWSxFQUFFLDBCQUEwQjtvQkFDeEMsT0FBTyxFQUFFLDBCQUEwQjtpQkFDbkM7YUFDRCxDQUFDLENBQUM7WUFFSCxvQ0FBb0M7WUFDcEMsT0FBTyxDQUFDLGVBQWUsRUFBRSxlQUFlLENBQUMsQ0FBQztZQUUxQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtnQkFDOUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ2pDLENBQUMsQ0FBQyxDQUFDO1NBQ0g7UUFFRCxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBQzNCLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLDBCQUEwQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzNELFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUVsQixNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLHdCQUF3QixFQUFFLENBQUMsQ0FBQztRQUN6RSxTQUFTLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSwyQ0FBMkMsQ0FBQyxDQUFDO1FBRXhFLE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDNUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLG1EQUFtRCxDQUFDLENBQUM7SUFDOUUsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3hCLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcCwgTW9kYWwsIHNldEljb24gfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBJZnJhbWVNb2RhbCBleHRlbmRzIE1vZGFsIHtcclxuXHRwcml2YXRlIHVybDogc3RyaW5nO1xyXG5cdHByaXZhdGUgdGl0bGU/OiBzdHJpbmc7XHJcblxyXG5cdGNvbnN0cnVjdG9yKGFwcDogQXBwLCB1cmw6IHN0cmluZywgdGl0bGU/OiBzdHJpbmcpIHtcclxuXHRcdHN1cGVyKGFwcCk7XHJcblx0XHR0aGlzLnVybCA9IHVybDtcclxuXHRcdHRoaXMudGl0bGUgPSB0aXRsZTtcclxuXHR9XHJcblxyXG5cdG9uT3BlbigpIHtcclxuXHRcdGlmICh0aGlzLnRpdGxlKSB7XHJcblx0XHRcdHRoaXMudGl0bGVFbC5zZXRUZXh0KHRoaXMudGl0bGUpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFkZCBleHRlcm5hbCBsaW5rIGJ1dHRvbiB0byBoZWFkZXJcclxuXHRcdGNvbnN0IGhlYWRlckFjdGlvbnMgPSB0aGlzLnRpdGxlRWw7XHJcblx0XHRpZiAoaGVhZGVyQWN0aW9ucykge1xyXG5cdFx0XHRjb25zdCBleHRlcm5hbExpbmtCdG4gPSBoZWFkZXJBY3Rpb25zLmNyZWF0ZUVsKCdidXR0b24nLCB7XHJcblx0XHRcdFx0Y2xzOiAnY2xpY2thYmxlLWljb24gdGFzay1nZW5pdXMtZXh0ZXJuYWwtbGluay1idG4nLFxyXG5cdFx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHRcdCdhcmlhLWxhYmVsJzogJ09wZW4gaW4gZXh0ZXJuYWwgYnJvd3NlcicsXHJcblx0XHRcdFx0XHQndGl0bGUnOiAnT3BlbiBpbiBleHRlcm5hbCBicm93c2VyJ1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBBZGQgaWNvbiB1c2luZyBPYnNpZGlhbidzIHNldEljb25cclxuXHRcdFx0c2V0SWNvbihleHRlcm5hbExpbmtCdG4sICdleHRlcm5hbC1saW5rJyk7XHJcblx0XHRcdFxyXG5cdFx0XHRleHRlcm5hbExpbmtCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XHJcblx0XHRcdFx0d2luZG93Lm9wZW4odGhpcy51cmwsICdfYmxhbmsnKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcblx0XHR0aGlzLm1vZGFsRWwudG9nZ2xlQ2xhc3MoXCJ0YXNrLWdlbml1cy1pZnJhbWUtbW9kYWxcIiwgdHJ1ZSk7XHJcblx0XHRjb250ZW50RWwuZW1wdHkoKTtcclxuXHJcblx0XHRjb25zdCBjb250YWluZXIgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcImlmcmFtZS1tb2RhbC1jb250YWluZXJcIiB9KTtcclxuXHRcdGNvbnRhaW5lci5zZXRBdHRyKFwic3R5bGVcIiwgXCJ3aWR0aDogMTAwJTsgaGVpZ2h0OiA4MHZoOyBkaXNwbGF5OiBmbGV4O1wiKTtcclxuXHJcblx0XHRjb25zdCBpZnJhbWUgPSBjb250YWluZXIuY3JlYXRlRWwoXCJpZnJhbWVcIik7XHJcblx0XHRpZnJhbWUuc2V0QXR0cihcInNyY1wiLCB0aGlzLnVybCk7XHJcblx0XHRpZnJhbWUuc2V0QXR0cihcInN0eWxlXCIsIFwiZmxleDogMTsgYm9yZGVyOiBub25lOyB3aWR0aDogMTAwJTsgaGVpZ2h0OiAxMDAlO1wiKTtcclxuXHR9XHJcblxyXG5cdG9uQ2xvc2UoKSB7XHJcblx0XHR0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xyXG5cdH1cclxufVxyXG5cclxuIl19