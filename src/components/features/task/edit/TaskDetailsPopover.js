/**
 * Task Details Popover Component
 * Used in desktop environments to display task details in a menu popover.
 */
import { __awaiter, __rest } from "tslib";
import { debounce, Component, } from "obsidian";
import { createPopper } from "@popperjs/core";
import { TaskMetadataEditor } from "./MetadataEditor";
import { t } from "@/translations/helper";
export class TaskDetailsPopover extends Component {
    constructor(app, plugin, task) {
        super();
        this.popoverRef = null;
        this.popperInstance = null;
        this.debounceUpdateTask = debounce((task) => __awaiter(this, void 0, void 0, function* () {
            // Use WriteAPI if dataflow is enabled
            if (this.plugin.writeAPI) {
                const result = yield this.plugin.writeAPI.updateTask({
                    taskId: task.id,
                    updates: task
                });
                if (!result.success) {
                    console.error("Failed to update task:", result.error);
                }
            }
            else {
                console.error("WriteAPI not available");
            }
        }), 200);
        this.clickOutside = (e) => {
            if (this.popoverRef && !this.popoverRef.contains(e.target)) {
                this.close();
            }
        };
        this.scrollHandler = (e) => {
            if (this.popoverRef) {
                if (e.target instanceof Node &&
                    this.popoverRef.contains(e.target)) {
                    const targetElement = e.target;
                    if (targetElement.scrollHeight > targetElement.clientHeight ||
                        targetElement.scrollWidth > targetElement.clientWidth) {
                        // If the scroll event is within the popover and the popover itself is scrollable,
                        // do not close it. This allows scrolling within the popover content.
                        return;
                    }
                }
                // For other scroll events (e.g., scrolling the main window), close the popover.
                this.close();
            }
        };
        this.app = app;
        this.plugin = plugin;
        this.task = task;
        this.win = app.workspace.containerEl.win || window;
        // Determine a reasonable scroll parent.
        const scrollEl = app.workspace.containerEl.closest(".cm-scroller");
        if (scrollEl instanceof HTMLElement) {
            this.scrollParent = scrollEl;
        }
        else {
            this.scrollParent = this.win;
        }
    }
    /**
     * Shows the task details popover at the given position.
     */
    showAtPosition(position) {
        if (this.popoverRef) {
            this.close();
        }
        // Create content container
        const contentEl = createDiv({ cls: "task-popover-content" });
        // Create metadata editor, use compact mode
        this.metadataEditor = new TaskMetadataEditor(contentEl, this.app, this.plugin, true // Compact mode
        );
        // Initialize editor and display task
        this.metadataEditor.onload();
        this.metadataEditor.showTask(this.task);
        // Listen for metadata change events
        this.metadataEditor.onMetadataChange = (event) => __awaiter(this, void 0, void 0, function* () {
            // Determine if the field is a top-level task property or metadata property
            const topLevelFields = ["status", "completed", "content"];
            const isTopLevelField = topLevelFields.includes(event.field);
            // Create a base task object with the updated field
            const updatedTask = Object.assign({}, this.task);
            if (isTopLevelField) {
                // Update top-level task property
                updatedTask[event.field] = event.value;
            }
            else {
                // Update metadata property
                updatedTask.metadata = Object.assign(Object.assign({}, this.task.metadata), { [event.field]: event.value });
            }
            // Handle special status field logic
            if (event.field === "status" &&
                (event.value === "x" || event.value === "X")) {
                updatedTask.completed = true;
                updatedTask.metadata = Object.assign(Object.assign({}, updatedTask.metadata), { completedDate: Date.now() });
                // Remove cancelled date if task is completed
                const _a = updatedTask.metadata, { cancelledDate } = _a, metadataWithoutCancelledDate = __rest(_a, ["cancelledDate"]);
                updatedTask.metadata = metadataWithoutCancelledDate;
            }
            else if (event.field === "status" && event.value === "-") {
                // If status is changing to cancelled, mark as not completed and add cancelled date
                updatedTask.completed = false;
                const _b = updatedTask.metadata, { completedDate } = _b, metadataWithoutCompletedDate = __rest(_b, ["completedDate"]);
                updatedTask.metadata = Object.assign(Object.assign({}, metadataWithoutCompletedDate), { cancelledDate: Date.now() });
            }
            else if (event.field === "status") {
                // If status is changing to something else, mark as not completed
                updatedTask.completed = false;
                const _c = updatedTask.metadata, { completedDate, cancelledDate } = _c, metadataWithoutDates = __rest(_c, ["completedDate", "cancelledDate"]);
                updatedTask.metadata = metadataWithoutDates;
            }
            // Update the internal task reference
            this.task = updatedTask;
            // Update the task with all changes
            this.debounceUpdateTask(updatedTask);
        });
        // Create the popover
        this.popoverRef = this.app.workspace.containerEl.createDiv({
            cls: "task-details-popover tg-menu bm-menu", // Borrowing some classes from IconMenu
        });
        this.popoverRef.appendChild(contentEl);
        // Add a title bar to the popover
        const titleBar = this.popoverRef.createDiv({
            cls: "tg-popover-titlebar",
            text: t("Task Details"),
        });
        // Prepend titleBar to popoverRef so it's at the top
        this.popoverRef.insertBefore(titleBar, this.popoverRef.firstChild);
        document.body.appendChild(this.popoverRef);
        // Create a virtual element for Popper.js
        const virtualElement = {
            getBoundingClientRect: () => ({
                width: 0,
                height: 0,
                top: position.y,
                right: position.x,
                bottom: position.y,
                left: position.x,
                x: position.x,
                y: position.y,
                toJSON: function () {
                    return this;
                },
            }),
        };
        if (this.popoverRef) {
            this.popperInstance = createPopper(virtualElement, this.popoverRef, {
                placement: "bottom-start",
                modifiers: [
                    {
                        name: "offset",
                        options: {
                            offset: [0, 8], // Offset the popover slightly
                        },
                    },
                    {
                        name: "preventOverflow",
                        options: {
                            padding: 10, // Padding from viewport edges
                        },
                    },
                    {
                        name: "flip",
                        options: {
                            fallbackPlacements: [
                                "top-start",
                                "right-start",
                                "left-start",
                            ],
                            padding: 10,
                        },
                    },
                ],
            });
        }
        // Use timeout to ensure popover is rendered before adding listeners
        this.win.setTimeout(() => {
            this.win.addEventListener("click", this.clickOutside);
            this.scrollParent.addEventListener("scroll", this.scrollHandler, true); // Use capture for scroll
        }, 10);
    }
    /**
     * Closes the popover.
     */
    close() {
        if (this.popperInstance) {
            this.popperInstance.destroy();
            this.popperInstance = null;
        }
        if (this.popoverRef) {
            this.popoverRef.remove();
            this.popoverRef = null;
        }
        this.win.removeEventListener("click", this.clickOutside);
        this.scrollParent.removeEventListener("scroll", this.scrollHandler, true);
        if (this.metadataEditor) {
            this.metadataEditor.onunload();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGFza0RldGFpbHNQb3BvdmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiVGFza0RldGFpbHNQb3BvdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7R0FHRzs7QUFFSCxPQUFPLEVBRU4sUUFBUSxFQUdSLFNBQVMsR0FFVCxNQUFNLFVBQVUsQ0FBQztBQUNsQixPQUFPLEVBQUUsWUFBWSxFQUE4QixNQUFNLGdCQUFnQixDQUFDO0FBRzFFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUUxQyxNQUFNLE9BQU8sa0JBQ1osU0FBUSxTQUFTO0lBWWpCLFlBQVksR0FBUSxFQUFFLE1BQTZCLEVBQUUsSUFBVTtRQUM5RCxLQUFLLEVBQUUsQ0FBQztRQVBELGVBQVUsR0FBMEIsSUFBSSxDQUFDO1FBSXpDLG1CQUFjLEdBQTBCLElBQUksQ0FBQztRQWlCckQsdUJBQWtCLEdBQUcsUUFBUSxDQUFDLENBQU8sSUFBVSxFQUFFLEVBQUU7WUFDbEQsc0NBQXNDO1lBQ3RDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUU7Z0JBQ3pCLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDO29CQUNwRCxNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQUU7b0JBQ2YsT0FBTyxFQUFFLElBQUk7aUJBQ2IsQ0FBQyxDQUFDO2dCQUNILElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFO29CQUNwQixPQUFPLENBQUMsS0FBSyxDQUFDLHdCQUF3QixFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztpQkFDdEQ7YUFDRDtpQkFBTTtnQkFDTixPQUFPLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUM7YUFDeEM7UUFDRixDQUFDLENBQUEsRUFBRSxHQUFHLENBQUMsQ0FBQztR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SSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FDakMsUUFBUSxFQUNSLElBQUksQ0FBQyxhQUFhLEVBQ2xCLElBQUksQ0FDSixDQUFDLENBQUMseUJBQXlCO1FBQzdCLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNSLENBQUM7SUE2QkQ7O09BRUc7SUFDSCxLQUFLO1FBQ0osSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFO1lBQ3hCLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDOUIsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7U0FDM0I7UUFFRCxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUU7WUFDcEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztTQUN2QjtRQUVELElBQUksQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN6RCxJQUFJLENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUNwQyxRQUFRLEVBQ1IsSUFBSSxDQUFDLGFBQWEsRUFDbEIsSUFBSSxDQUNKLENBQUM7UUFFRixJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUU7WUFDeEIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztTQUMvQjtJQUNGLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBUYXNrIERldGFpbHMgUG9wb3ZlciBDb21wb25lbnRcclxuICogVXNlZCBpbiBkZXNrdG9wIGVudmlyb25tZW50cyB0byBkaXNwbGF5IHRhc2sgZGV0YWlscyBpbiBhIG1lbnUgcG9wb3Zlci5cclxuICovXHJcblxyXG5pbXBvcnQge1xyXG5cdEFwcCxcclxuXHRkZWJvdW5jZSxcclxuXHRNYXJrZG93blZpZXcsXHJcblx0VEZpbGUsXHJcblx0Q29tcG9uZW50LFxyXG5cdENsb3NlYWJsZUNvbXBvbmVudCxcclxufSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgY3JlYXRlUG9wcGVyLCBJbnN0YW5jZSBhcyBQb3BwZXJJbnN0YW5jZSB9IGZyb20gXCJAcG9wcGVyanMvY29yZVwiO1xyXG5pbXBvcnQgeyBUYXNrIH0gZnJvbSBcIkAvdHlwZXMvdGFza1wiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7IFRhc2tNZXRhZGF0YUVkaXRvciB9IGZyb20gXCIuL01ldGFkYXRhRWRpdG9yXCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgVGFza0RldGFpbHNQb3BvdmVyXHJcblx0ZXh0ZW5kcyBDb21wb25lbnRcclxuXHRpbXBsZW1lbnRzIENsb3NlYWJsZUNvbXBvbmVudFxyXG57XHJcblx0cHJpdmF0ZSB0YXNrOiBUYXNrO1xyXG5cdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblx0cHJpdmF0ZSBhcHA6IEFwcDtcclxuXHRwcml2YXRlIHBvcG92ZXJSZWY6IEhUTUxEaXZFbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBtZXRhZGF0YUVkaXRvcjogVGFza01ldGFkYXRhRWRpdG9yO1xyXG5cdHByaXZhdGUgd2luOiBXaW5kb3c7XHJcblx0cHJpdmF0ZSBzY3JvbGxQYXJlbnQ6IEhUTUxFbGVtZW50IHwgV2luZG93O1xyXG5cdHByaXZhdGUgcG9wcGVySW5zdGFuY2U6IFBvcHBlckluc3RhbmNlIHwgbnVsbCA9IG51bGw7XHJcblxyXG5cdGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbiwgdGFzazogVGFzaykge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMuYXBwID0gYXBwO1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0XHR0aGlzLnRhc2sgPSB0YXNrO1xyXG5cdFx0dGhpcy53aW4gPSBhcHAud29ya3NwYWNlLmNvbnRhaW5lckVsLndpbiB8fCB3aW5kb3c7XHJcblx0XHQvLyBEZXRlcm1pbmUgYSByZWFzb25hYmxlIHNjcm9sbCBwYXJlbnQuXHJcblx0XHRjb25zdCBzY3JvbGxFbCA9IGFwcC53b3Jrc3BhY2UuY29udGFpbmVyRWwuY2xvc2VzdChcIi5jbS1zY3JvbGxlclwiKTtcclxuXHRcdGlmIChzY3JvbGxFbCBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XHJcblx0XHRcdHRoaXMuc2Nyb2xsUGFyZW50ID0gc2Nyb2xsRWw7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLnNjcm9sbFBhcmVudCA9IHRoaXMud2luO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0ZGVib3VuY2VVcGRhdGVUYXNrID0gZGVib3VuY2UoYXN5bmMgKHRhc2s6IFRhc2spID0+IHtcclxuXHRcdC8vIFVzZSBXcml0ZUFQSSBpZiBkYXRhZmxvdyBpcyBlbmFibGVkXHJcblx0XHRpZiAodGhpcy5wbHVnaW4ud3JpdGVBUEkpIHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5wbHVnaW4ud3JpdGVBUEkudXBkYXRlVGFzayh7XHJcblx0XHRcdFx0dGFza0lkOiB0YXNrLmlkLFxyXG5cdFx0XHRcdHVwZGF0ZXM6IHRhc2tcclxuXHRcdFx0fSk7XHJcblx0XHRcdGlmICghcmVzdWx0LnN1Y2Nlc3MpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIHVwZGF0ZSB0YXNrOlwiLCByZXN1bHQuZXJyb3IpO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiV3JpdGVBUEkgbm90IGF2YWlsYWJsZVwiKTtcclxuXHRcdH1cclxuXHR9LCAyMDApO1xyXG5cclxuXHQvKipcclxuXHQgKiBTaG93cyB0aGUgdGFzayBkZXRhaWxzIHBvcG92ZXIgYXQgdGhlIGdpdmVuIHBvc2l0aW9uLlxyXG5cdCAqL1xyXG5cdHNob3dBdFBvc2l0aW9uKHBvc2l0aW9uOiB7IHg6IG51bWJlcjsgeTogbnVtYmVyIH0pIHtcclxuXHRcdGlmICh0aGlzLnBvcG92ZXJSZWYpIHtcclxuXHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENyZWF0ZSBjb250ZW50IGNvbnRhaW5lclxyXG5cdFx0Y29uc3QgY29udGVudEVsID0gY3JlYXRlRGl2KHsgY2xzOiBcInRhc2stcG9wb3Zlci1jb250ZW50XCIgfSk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIG1ldGFkYXRhIGVkaXRvciwgdXNlIGNvbXBhY3QgbW9kZVxyXG5cdFx0dGhpcy5tZXRhZGF0YUVkaXRvciA9IG5ldyBUYXNrTWV0YWRhdGFFZGl0b3IoXHJcblx0XHRcdGNvbnRlbnRFbCxcclxuXHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHR0cnVlIC8vIENvbXBhY3QgbW9kZVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBJbml0aWFsaXplIGVkaXRvciBhbmQgZGlzcGxheSB0YXNrXHJcblx0XHR0aGlzLm1ldGFkYXRhRWRpdG9yLm9ubG9hZCgpO1xyXG5cdFx0dGhpcy5tZXRhZGF0YUVkaXRvci5zaG93VGFzayh0aGlzLnRhc2spO1xyXG5cclxuXHRcdC8vIExpc3RlbiBmb3IgbWV0YWRhdGEgY2hhbmdlIGV2ZW50c1xyXG5cdFx0dGhpcy5tZXRhZGF0YUVkaXRvci5vbk1ldGFkYXRhQ2hhbmdlID0gYXN5bmMgKGV2ZW50KSA9PiB7XHJcblx0XHRcdC8vIERldGVybWluZSBpZiB0aGUgZmllbGQgaXMgYSB0b3AtbGV2ZWwgdGFzayBwcm9wZXJ0eSBvciBtZXRhZGF0YSBwcm9wZXJ0eVxyXG5cdFx0XHRjb25zdCB0b3BMZXZlbEZpZWxkcyA9IFtcInN0YXR1c1wiLCBcImNvbXBsZXRlZFwiLCBcImNvbnRlbnRcIl07XHJcblx0XHRcdGNvbnN0IGlzVG9wTGV2ZWxGaWVsZCA9IHRvcExldmVsRmllbGRzLmluY2x1ZGVzKGV2ZW50LmZpZWxkKTtcclxuXHJcblx0XHRcdC8vIENyZWF0ZSBhIGJhc2UgdGFzayBvYmplY3Qgd2l0aCB0aGUgdXBkYXRlZCBmaWVsZFxyXG5cdFx0XHRjb25zdCB1cGRhdGVkVGFzayA9IHsgLi4udGhpcy50YXNrIH07XHJcblxyXG5cdFx0XHRpZiAoaXNUb3BMZXZlbEZpZWxkKSB7XHJcblx0XHRcdFx0Ly8gVXBkYXRlIHRvcC1sZXZlbCB0YXNrIHByb3BlcnR5XHJcblx0XHRcdFx0KHVwZGF0ZWRUYXNrIGFzIGFueSlbZXZlbnQuZmllbGRdID0gZXZlbnQudmFsdWU7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gVXBkYXRlIG1ldGFkYXRhIHByb3BlcnR5XHJcblx0XHRcdFx0dXBkYXRlZFRhc2subWV0YWRhdGEgPSB7XHJcblx0XHRcdFx0XHQuLi50aGlzLnRhc2subWV0YWRhdGEsXHJcblx0XHRcdFx0XHRbZXZlbnQuZmllbGRdOiBldmVudC52YWx1ZSxcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBIYW5kbGUgc3BlY2lhbCBzdGF0dXMgZmllbGQgbG9naWNcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdGV2ZW50LmZpZWxkID09PSBcInN0YXR1c1wiICYmXHJcblx0XHRcdFx0KGV2ZW50LnZhbHVlID09PSBcInhcIiB8fCBldmVudC52YWx1ZSA9PT0gXCJYXCIpXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHVwZGF0ZWRUYXNrLmNvbXBsZXRlZCA9IHRydWU7XHJcblx0XHRcdFx0dXBkYXRlZFRhc2subWV0YWRhdGEgPSB7XHJcblx0XHRcdFx0XHQuLi51cGRhdGVkVGFzay5tZXRhZGF0YSxcclxuXHRcdFx0XHRcdGNvbXBsZXRlZERhdGU6IERhdGUubm93KCksXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHQvLyBSZW1vdmUgY2FuY2VsbGVkIGRhdGUgaWYgdGFzayBpcyBjb21wbGV0ZWRcclxuXHRcdFx0XHRjb25zdCB7IGNhbmNlbGxlZERhdGUsIC4uLm1ldGFkYXRhV2l0aG91dENhbmNlbGxlZERhdGUgfSA9XHJcblx0XHRcdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YTtcclxuXHRcdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YSA9IG1ldGFkYXRhV2l0aG91dENhbmNlbGxlZERhdGU7XHJcblx0XHRcdH0gZWxzZSBpZiAoZXZlbnQuZmllbGQgPT09IFwic3RhdHVzXCIgJiYgZXZlbnQudmFsdWUgPT09IFwiLVwiKSB7XHJcblx0XHRcdFx0Ly8gSWYgc3RhdHVzIGlzIGNoYW5naW5nIHRvIGNhbmNlbGxlZCwgbWFyayBhcyBub3QgY29tcGxldGVkIGFuZCBhZGQgY2FuY2VsbGVkIGRhdGVcclxuXHRcdFx0XHR1cGRhdGVkVGFzay5jb21wbGV0ZWQgPSBmYWxzZTtcclxuXHRcdFx0XHRjb25zdCB7IGNvbXBsZXRlZERhdGUsIC4uLm1ldGFkYXRhV2l0aG91dENvbXBsZXRlZERhdGUgfSA9XHJcblx0XHRcdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YTtcclxuXHRcdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YSA9IHtcclxuXHRcdFx0XHRcdC4uLm1ldGFkYXRhV2l0aG91dENvbXBsZXRlZERhdGUsXHJcblx0XHRcdFx0XHRjYW5jZWxsZWREYXRlOiBEYXRlLm5vdygpLFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH0gZWxzZSBpZiAoZXZlbnQuZmllbGQgPT09IFwic3RhdHVzXCIpIHtcclxuXHRcdFx0XHQvLyBJZiBzdGF0dXMgaXMgY2hhbmdpbmcgdG8gc29tZXRoaW5nIGVsc2UsIG1hcmsgYXMgbm90IGNvbXBsZXRlZFxyXG5cdFx0XHRcdHVwZGF0ZWRUYXNrLmNvbXBsZXRlZCA9IGZhbHNlO1xyXG5cdFx0XHRcdGNvbnN0IHtcclxuXHRcdFx0XHRcdGNvbXBsZXRlZERhdGUsXHJcblx0XHRcdFx0XHRjYW5jZWxsZWREYXRlLFxyXG5cdFx0XHRcdFx0Li4ubWV0YWRhdGFXaXRob3V0RGF0ZXNcclxuXHRcdFx0XHR9ID0gdXBkYXRlZFRhc2subWV0YWRhdGE7XHJcblx0XHRcdFx0dXBkYXRlZFRhc2subWV0YWRhdGEgPSBtZXRhZGF0YVdpdGhvdXREYXRlcztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIHRoZSBpbnRlcm5hbCB0YXNrIHJlZmVyZW5jZVxyXG5cdFx0XHR0aGlzLnRhc2sgPSB1cGRhdGVkVGFzaztcclxuXHJcblx0XHRcdC8vIFVwZGF0ZSB0aGUgdGFzayB3aXRoIGFsbCBjaGFuZ2VzXHJcblx0XHRcdHRoaXMuZGVib3VuY2VVcGRhdGVUYXNrKHVwZGF0ZWRUYXNrKTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIHRoZSBwb3BvdmVyXHJcblx0XHR0aGlzLnBvcG92ZXJSZWYgPSB0aGlzLmFwcC53b3Jrc3BhY2UuY29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInRhc2stZGV0YWlscy1wb3BvdmVyIHRnLW1lbnUgYm0tbWVudVwiLCAvLyBCb3Jyb3dpbmcgc29tZSBjbGFzc2VzIGZyb20gSWNvbk1lbnVcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy5wb3BvdmVyUmVmLmFwcGVuZENoaWxkKGNvbnRlbnRFbCk7XHJcblxyXG5cdFx0Ly8gQWRkIGEgdGl0bGUgYmFyIHRvIHRoZSBwb3BvdmVyXHJcblx0XHRjb25zdCB0aXRsZUJhciA9IHRoaXMucG9wb3ZlclJlZi5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwidGctcG9wb3Zlci10aXRsZWJhclwiLFxyXG5cdFx0XHR0ZXh0OiB0KFwiVGFzayBEZXRhaWxzXCIpLFxyXG5cdFx0fSk7XHJcblx0XHQvLyBQcmVwZW5kIHRpdGxlQmFyIHRvIHBvcG92ZXJSZWYgc28gaXQncyBhdCB0aGUgdG9wXHJcblx0XHR0aGlzLnBvcG92ZXJSZWYuaW5zZXJ0QmVmb3JlKHRpdGxlQmFyLCB0aGlzLnBvcG92ZXJSZWYuZmlyc3RDaGlsZCk7XHJcblxyXG5cdFx0ZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLnBvcG92ZXJSZWYpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBhIHZpcnR1YWwgZWxlbWVudCBmb3IgUG9wcGVyLmpzXHJcblx0XHRjb25zdCB2aXJ0dWFsRWxlbWVudCA9IHtcclxuXHRcdFx0Z2V0Qm91bmRpbmdDbGllbnRSZWN0OiAoKSA9PiAoe1xyXG5cdFx0XHRcdHdpZHRoOiAwLFxyXG5cdFx0XHRcdGhlaWdodDogMCxcclxuXHRcdFx0XHR0b3A6IHBvc2l0aW9uLnksXHJcblx0XHRcdFx0cmlnaHQ6IHBvc2l0aW9uLngsXHJcblx0XHRcdFx0Ym90dG9tOiBwb3NpdGlvbi55LFxyXG5cdFx0XHRcdGxlZnQ6IHBvc2l0aW9uLngsXHJcblx0XHRcdFx0eDogcG9zaXRpb24ueCxcclxuXHRcdFx0XHR5OiBwb3NpdGlvbi55LFxyXG5cdFx0XHRcdHRvSlNPTjogZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHRoaXM7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSksXHJcblx0XHR9O1xyXG5cclxuXHRcdGlmICh0aGlzLnBvcG92ZXJSZWYpIHtcclxuXHRcdFx0dGhpcy5wb3BwZXJJbnN0YW5jZSA9IGNyZWF0ZVBvcHBlcihcclxuXHRcdFx0XHR2aXJ0dWFsRWxlbWVudCxcclxuXHRcdFx0XHR0aGlzLnBvcG92ZXJSZWYsXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0cGxhY2VtZW50OiBcImJvdHRvbS1zdGFydFwiLFxyXG5cdFx0XHRcdFx0bW9kaWZpZXJzOiBbXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRuYW1lOiBcIm9mZnNldFwiLFxyXG5cdFx0XHRcdFx0XHRcdG9wdGlvbnM6IHtcclxuXHRcdFx0XHRcdFx0XHRcdG9mZnNldDogWzAsIDhdLCAvLyBPZmZzZXQgdGhlIHBvcG92ZXIgc2xpZ2h0bHlcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0bmFtZTogXCJwcmV2ZW50T3ZlcmZsb3dcIixcclxuXHRcdFx0XHRcdFx0XHRvcHRpb25zOiB7XHJcblx0XHRcdFx0XHRcdFx0XHRwYWRkaW5nOiAxMCwgLy8gUGFkZGluZyBmcm9tIHZpZXdwb3J0IGVkZ2VzXHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdG5hbWU6IFwiZmxpcFwiLFxyXG5cdFx0XHRcdFx0XHRcdG9wdGlvbnM6IHtcclxuXHRcdFx0XHRcdFx0XHRcdGZhbGxiYWNrUGxhY2VtZW50czogW1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcInRvcC1zdGFydFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcInJpZ2h0LXN0YXJ0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFwibGVmdC1zdGFydFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XSxcclxuXHRcdFx0XHRcdFx0XHRcdHBhZGRpbmc6IDEwLFxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRdLFxyXG5cdFx0XHRcdH1cclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBVc2UgdGltZW91dCB0byBlbnN1cmUgcG9wb3ZlciBpcyByZW5kZXJlZCBiZWZvcmUgYWRkaW5nIGxpc3RlbmVyc1xyXG5cdFx0dGhpcy53aW4uc2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdHRoaXMud2luLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCB0aGlzLmNsaWNrT3V0c2lkZSk7XHJcblx0XHRcdHRoaXMuc2Nyb2xsUGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoXHJcblx0XHRcdFx0XCJzY3JvbGxcIixcclxuXHRcdFx0XHR0aGlzLnNjcm9sbEhhbmRsZXIsXHJcblx0XHRcdFx0dHJ1ZVxyXG5cdFx0XHQpOyAvLyBVc2UgY2FwdHVyZSBmb3Igc2Nyb2xsXHJcblx0XHR9LCAxMCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNsaWNrT3V0c2lkZSA9IChlOiBNb3VzZUV2ZW50KSA9PiB7XHJcblx0XHRpZiAodGhpcy5wb3BvdmVyUmVmICYmICF0aGlzLnBvcG92ZXJSZWYuY29udGFpbnMoZS50YXJnZXQgYXMgTm9kZSkpIHtcclxuXHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHByaXZhdGUgc2Nyb2xsSGFuZGxlciA9IChlOiBFdmVudCkgPT4ge1xyXG5cdFx0aWYgKHRoaXMucG9wb3ZlclJlZikge1xyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0ZS50YXJnZXQgaW5zdGFuY2VvZiBOb2RlICYmXHJcblx0XHRcdFx0dGhpcy5wb3BvdmVyUmVmLmNvbnRhaW5zKGUudGFyZ2V0KVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRjb25zdCB0YXJnZXRFbGVtZW50ID0gZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0dGFyZ2V0RWxlbWVudC5zY3JvbGxIZWlnaHQgPiB0YXJnZXRFbGVtZW50LmNsaWVudEhlaWdodCB8fFxyXG5cdFx0XHRcdFx0dGFyZ2V0RWxlbWVudC5zY3JvbGxXaWR0aCA+IHRhcmdldEVsZW1lbnQuY2xpZW50V2lkdGhcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdC8vIElmIHRoZSBzY3JvbGwgZXZlbnQgaXMgd2l0aGluIHRoZSBwb3BvdmVyIGFuZCB0aGUgcG9wb3ZlciBpdHNlbGYgaXMgc2Nyb2xsYWJsZSxcclxuXHRcdFx0XHRcdC8vIGRvIG5vdCBjbG9zZSBpdC4gVGhpcyBhbGxvd3Mgc2Nyb2xsaW5nIHdpdGhpbiB0aGUgcG9wb3ZlciBjb250ZW50LlxyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHQvLyBGb3Igb3RoZXIgc2Nyb2xsIGV2ZW50cyAoZS5nLiwgc2Nyb2xsaW5nIHRoZSBtYWluIHdpbmRvdyksIGNsb3NlIHRoZSBwb3BvdmVyLlxyXG5cdFx0XHR0aGlzLmNsb3NlKCk7XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0LyoqXHJcblx0ICogQ2xvc2VzIHRoZSBwb3BvdmVyLlxyXG5cdCAqL1xyXG5cdGNsb3NlKCkge1xyXG5cdFx0aWYgKHRoaXMucG9wcGVySW5zdGFuY2UpIHtcclxuXHRcdFx0dGhpcy5wb3BwZXJJbnN0YW5jZS5kZXN0cm95KCk7XHJcblx0XHRcdHRoaXMucG9wcGVySW5zdGFuY2UgPSBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0aGlzLnBvcG92ZXJSZWYpIHtcclxuXHRcdFx0dGhpcy5wb3BvdmVyUmVmLnJlbW92ZSgpO1xyXG5cdFx0XHR0aGlzLnBvcG92ZXJSZWYgPSBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMud2luLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCB0aGlzLmNsaWNrT3V0c2lkZSk7XHJcblx0XHR0aGlzLnNjcm9sbFBhcmVudC5yZW1vdmVFdmVudExpc3RlbmVyKFxyXG5cdFx0XHRcInNjcm9sbFwiLFxyXG5cdFx0XHR0aGlzLnNjcm9sbEhhbmRsZXIsXHJcblx0XHRcdHRydWVcclxuXHRcdCk7XHJcblxyXG5cdFx0aWYgKHRoaXMubWV0YWRhdGFFZGl0b3IpIHtcclxuXHRcdFx0dGhpcy5tZXRhZGF0YUVkaXRvci5vbnVubG9hZCgpO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG4iXX0=