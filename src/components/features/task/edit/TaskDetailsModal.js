/**
 * Task Details Modal Component
 * Used in mobile environments to display the full task details and editing interface.
 */
import { __awaiter, __rest } from "tslib";
import { Modal, ButtonComponent } from "obsidian";
import { TaskMetadataEditor } from "./MetadataEditor";
import { t } from "@/translations/helper";
export class TaskDetailsModal extends Modal {
    constructor(app, plugin, task, onTaskUpdated) {
        super(app);
        this.task = task;
        this.plugin = plugin;
        this.onTaskUpdated = onTaskUpdated || (() => __awaiter(this, void 0, void 0, function* () { }));
        // Set modal style
        this.modalEl.addClass("task-details-modal");
        this.titleEl.setText(t("Edit Task"));
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        // Create metadata editor, use full mode
        this.metadataEditor = new TaskMetadataEditor(contentEl, this.app, this.plugin, false // Full mode, not compact mode
        );
        // Initialize editor and display task
        this.metadataEditor.onload();
        this.metadataEditor.showTask(this.task);
        new ButtonComponent(this.contentEl)
            .setIcon("check")
            .setTooltip(t("Save"))
            .onClick(() => __awaiter(this, void 0, void 0, function* () {
            yield this.onTaskUpdated(this.task);
            this.close();
        }));
        // Listen for metadata change events
        this.metadataEditor.onMetadataChange = (event) => __awaiter(this, void 0, void 0, function* () {
            // Determine if the field is a top-level task property or metadata property
            const topLevelFields = ["status", "completed", "content"];
            const isTopLevelField = topLevelFields.includes(event.field);
            // Create a base task object with the updated field
            const updatedTask = Object.assign(Object.assign({}, this.task), { line: this.task.line - 1, id: `${this.task.filePath}-L${this.task.line - 1}` });
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
            this.task = updatedTask;
        });
    }
    onClose() {
        const { contentEl } = this;
        if (this.metadataEditor) {
            this.metadataEditor.onunload();
        }
        contentEl.empty();
    }
    /**
     * Updates a task field.
     */
    updateTaskField(field, value) {
        if (field in this.task) {
            this.task[field] = value;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGFza0RldGFpbHNNb2RhbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlRhc2tEZXRhaWxzTW9kYWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztHQUdHOztBQUVILE9BQU8sRUFBTyxLQUFLLEVBQXVCLGVBQWUsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUc1RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFMUMsTUFBTSxPQUFPLGdCQUFpQixTQUFRLEtBQUs7SUFNMUMsWUFDQyxHQUFRLEVBQ1IsTUFBNkIsRUFDN0IsSUFBVSxFQUNWLGFBQTZDO1FBRTdDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNYLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxJQUFJLENBQUMsR0FBUyxFQUFFLGdEQUFFLENBQUMsQ0FBQSxDQUFDLENBQUM7UUFFdkQsa0JBQWtCO1FBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDNUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDdEMsQ0FBQztJQUVELE1BQU07UUFDTCxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBQzNCLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUVsQix3Q0FBd0M7UUFDeEMsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLGtCQUFrQixDQUMzQyxTQUFTLEVBQ1QsSUFBSSxDQUFDLEdBQUcsRUFDUixJQUFJLENBQUMsTUFBTSxFQUNYLEtBQUssQ0FBQyw4QkFBOEI7U0FDcEMsQ0FBQztRQUVGLHFDQUFxQztR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QU0sS0FJRixXQUFXLENBQUMsUUFBUSxFQUpsQixFQUNMLGFBQWEsRUFDYixhQUFhLE9BRVUsRUFEcEIsb0JBQW9CLGNBSGxCLGtDQUlMLENBQXVCLENBQUM7Z0JBQ3pCLFdBQVcsQ0FBQyxRQUFRLEdBQUcsb0JBQW9CLENBQUM7YUFDNUM7WUFFRCxJQUFJLENBQUMsSUFBSSxHQUFHLFdBQVcsQ0FBQztRQUN6QixDQUFDLENBQUEsQ0FBQztJQUNILENBQUM7SUFFRCxPQUFPO1FBQ04sTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQztRQUMzQixJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUU7WUFDeEIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztTQUMvQjtRQUNELFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNuQixDQUFDO0lBRUQ7O09BRUc7SUFDSyxlQUFlLENBQUMsS0FBYSxFQUFFLEtBQVU7UUFDaEQsSUFBSSxLQUFLLElBQUksSUFBSSxDQUFDLElBQUksRUFBRTtZQUN0QixJQUFJLENBQUMsSUFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQztTQUNsQztJQUNGLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBUYXNrIERldGFpbHMgTW9kYWwgQ29tcG9uZW50XHJcbiAqIFVzZWQgaW4gbW9iaWxlIGVudmlyb25tZW50cyB0byBkaXNwbGF5IHRoZSBmdWxsIHRhc2sgZGV0YWlscyBhbmQgZWRpdGluZyBpbnRlcmZhY2UuXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQXBwLCBNb2RhbCwgVEZpbGUsIE1hcmtkb3duVmlldywgQnV0dG9uQ29tcG9uZW50IH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiQC90eXBlcy90YXNrXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjtcclxuaW1wb3J0IHsgVGFza01ldGFkYXRhRWRpdG9yIH0gZnJvbSBcIi4vTWV0YWRhdGFFZGl0b3JcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBUYXNrRGV0YWlsc01vZGFsIGV4dGVuZHMgTW9kYWwge1xyXG5cdHByaXZhdGUgdGFzazogVGFzaztcclxuXHRwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luO1xyXG5cdHByaXZhdGUgbWV0YWRhdGFFZGl0b3I6IFRhc2tNZXRhZGF0YUVkaXRvcjtcclxuXHRwcml2YXRlIG9uVGFza1VwZGF0ZWQ6ICh0YXNrOiBUYXNrKSA9PiBQcm9taXNlPHZvaWQ+O1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdGFwcDogQXBwLFxyXG5cdFx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHR0YXNrOiBUYXNrLFxyXG5cdFx0b25UYXNrVXBkYXRlZD86ICh0YXNrOiBUYXNrKSA9PiBQcm9taXNlPHZvaWQ+XHJcblx0KSB7XHJcblx0XHRzdXBlcihhcHApO1xyXG5cdFx0dGhpcy50YXNrID0gdGFzaztcclxuXHRcdHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG5cdFx0dGhpcy5vblRhc2tVcGRhdGVkID0gb25UYXNrVXBkYXRlZCB8fCAoYXN5bmMgKCkgPT4ge30pO1xyXG5cclxuXHRcdC8vIFNldCBtb2RhbCBzdHlsZVxyXG5cdFx0dGhpcy5tb2RhbEVsLmFkZENsYXNzKFwidGFzay1kZXRhaWxzLW1vZGFsXCIpO1xyXG5cdFx0dGhpcy50aXRsZUVsLnNldFRleHQodChcIkVkaXQgVGFza1wiKSk7XHJcblx0fVxyXG5cclxuXHRvbk9wZW4oKSB7XHJcblx0XHRjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcclxuXHRcdGNvbnRlbnRFbC5lbXB0eSgpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBtZXRhZGF0YSBlZGl0b3IsIHVzZSBmdWxsIG1vZGVcclxuXHRcdHRoaXMubWV0YWRhdGFFZGl0b3IgPSBuZXcgVGFza01ldGFkYXRhRWRpdG9yKFxyXG5cdFx0XHRjb250ZW50RWwsXHJcblx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0ZmFsc2UgLy8gRnVsbCBtb2RlLCBub3QgY29tcGFjdCBtb2RlXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgZWRpdG9yIGFuZCBkaXNwbGF5IHRhc2tcclxuXHRcdHRoaXMubWV0YWRhdGFFZGl0b3Iub25sb2FkKCk7XHJcblx0XHR0aGlzLm1ldGFkYXRhRWRpdG9yLnNob3dUYXNrKHRoaXMudGFzayk7XHJcblxyXG5cdFx0bmV3IEJ1dHRvbkNvbXBvbmVudCh0aGlzLmNvbnRlbnRFbClcclxuXHRcdFx0LnNldEljb24oXCJjaGVja1wiKVxyXG5cdFx0XHQuc2V0VG9vbHRpcCh0KFwiU2F2ZVwiKSlcclxuXHRcdFx0Lm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRcdGF3YWl0IHRoaXMub25UYXNrVXBkYXRlZCh0aGlzLnRhc2spO1xyXG5cdFx0XHRcdHRoaXMuY2xvc2UoKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gTGlzdGVuIGZvciBtZXRhZGF0YSBjaGFuZ2UgZXZlbnRzXHJcblx0XHR0aGlzLm1ldGFkYXRhRWRpdG9yLm9uTWV0YWRhdGFDaGFuZ2UgPSBhc3luYyAoZXZlbnQpID0+IHtcclxuXHRcdFx0Ly8gRGV0ZXJtaW5lIGlmIHRoZSBmaWVsZCBpcyBhIHRvcC1sZXZlbCB0YXNrIHByb3BlcnR5IG9yIG1ldGFkYXRhIHByb3BlcnR5XHJcblx0XHRcdGNvbnN0IHRvcExldmVsRmllbGRzID0gW1wic3RhdHVzXCIsIFwiY29tcGxldGVkXCIsIFwiY29udGVudFwiXTtcclxuXHRcdFx0Y29uc3QgaXNUb3BMZXZlbEZpZWxkID0gdG9wTGV2ZWxGaWVsZHMuaW5jbHVkZXMoZXZlbnQuZmllbGQpO1xyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIGEgYmFzZSB0YXNrIG9iamVjdCB3aXRoIHRoZSB1cGRhdGVkIGZpZWxkXHJcblx0XHRcdGNvbnN0IHVwZGF0ZWRUYXNrID0ge1xyXG5cdFx0XHRcdC4uLnRoaXMudGFzayxcclxuXHRcdFx0XHRsaW5lOiB0aGlzLnRhc2subGluZSAtIDEsXHJcblx0XHRcdFx0aWQ6IGAke3RoaXMudGFzay5maWxlUGF0aH0tTCR7dGhpcy50YXNrLmxpbmUgLSAxfWAsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRpZiAoaXNUb3BMZXZlbEZpZWxkKSB7XHJcblx0XHRcdFx0Ly8gVXBkYXRlIHRvcC1sZXZlbCB0YXNrIHByb3BlcnR5XHJcblx0XHRcdFx0KHVwZGF0ZWRUYXNrIGFzIGFueSlbZXZlbnQuZmllbGRdID0gZXZlbnQudmFsdWU7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gVXBkYXRlIG1ldGFkYXRhIHByb3BlcnR5XHJcblx0XHRcdFx0dXBkYXRlZFRhc2subWV0YWRhdGEgPSB7XHJcblx0XHRcdFx0XHQuLi50aGlzLnRhc2subWV0YWRhdGEsXHJcblx0XHRcdFx0XHRbZXZlbnQuZmllbGRdOiBldmVudC52YWx1ZSxcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBIYW5kbGUgc3BlY2lhbCBzdGF0dXMgZmllbGQgbG9naWNcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdGV2ZW50LmZpZWxkID09PSBcInN0YXR1c1wiICYmXHJcblx0XHRcdFx0KGV2ZW50LnZhbHVlID09PSBcInhcIiB8fCBldmVudC52YWx1ZSA9PT0gXCJYXCIpXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHVwZGF0ZWRUYXNrLmNvbXBsZXRlZCA9IHRydWU7XHJcblx0XHRcdFx0dXBkYXRlZFRhc2subWV0YWRhdGEgPSB7XHJcblx0XHRcdFx0XHQuLi51cGRhdGVkVGFzay5tZXRhZGF0YSxcclxuXHRcdFx0XHRcdGNvbXBsZXRlZERhdGU6IERhdGUubm93KCksXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHQvLyBSZW1vdmUgY2FuY2VsbGVkIGRhdGUgaWYgdGFzayBpcyBjb21wbGV0ZWRcclxuXHRcdFx0XHRjb25zdCB7IGNhbmNlbGxlZERhdGUsIC4uLm1ldGFkYXRhV2l0aG91dENhbmNlbGxlZERhdGUgfSA9XHJcblx0XHRcdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YTtcclxuXHRcdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YSA9IG1ldGFkYXRhV2l0aG91dENhbmNlbGxlZERhdGU7XHJcblx0XHRcdH0gZWxzZSBpZiAoZXZlbnQuZmllbGQgPT09IFwic3RhdHVzXCIgJiYgZXZlbnQudmFsdWUgPT09IFwiLVwiKSB7XHJcblx0XHRcdFx0Ly8gSWYgc3RhdHVzIGlzIGNoYW5naW5nIHRvIGNhbmNlbGxlZCwgbWFyayBhcyBub3QgY29tcGxldGVkIGFuZCBhZGQgY2FuY2VsbGVkIGRhdGVcclxuXHRcdFx0XHR1cGRhdGVkVGFzay5jb21wbGV0ZWQgPSBmYWxzZTtcclxuXHRcdFx0XHRjb25zdCB7IGNvbXBsZXRlZERhdGUsIC4uLm1ldGFkYXRhV2l0aG91dENvbXBsZXRlZERhdGUgfSA9XHJcblx0XHRcdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YTtcclxuXHRcdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YSA9IHtcclxuXHRcdFx0XHRcdC4uLm1ldGFkYXRhV2l0aG91dENvbXBsZXRlZERhdGUsXHJcblx0XHRcdFx0XHRjYW5jZWxsZWREYXRlOiBEYXRlLm5vdygpLFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH0gZWxzZSBpZiAoZXZlbnQuZmllbGQgPT09IFwic3RhdHVzXCIpIHtcclxuXHRcdFx0XHQvLyBJZiBzdGF0dXMgaXMgY2hhbmdpbmcgdG8gc29tZXRoaW5nIGVsc2UsIG1hcmsgYXMgbm90IGNvbXBsZXRlZFxyXG5cdFx0XHRcdHVwZGF0ZWRUYXNrLmNvbXBsZXRlZCA9IGZhbHNlO1xyXG5cdFx0XHRcdGNvbnN0IHtcclxuXHRcdFx0XHRcdGNvbXBsZXRlZERhdGUsXHJcblx0XHRcdFx0XHRjYW5jZWxsZWREYXRlLFxyXG5cdFx0XHRcdFx0Li4ubWV0YWRhdGFXaXRob3V0RGF0ZXNcclxuXHRcdFx0XHR9ID0gdXBkYXRlZFRhc2subWV0YWRhdGE7XHJcblx0XHRcdFx0dXBkYXRlZFRhc2subWV0YWRhdGEgPSBtZXRhZGF0YVdpdGhvdXREYXRlcztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dGhpcy50YXNrID0gdXBkYXRlZFRhc2s7XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0b25DbG9zZSgpIHtcclxuXHRcdGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xyXG5cdFx0aWYgKHRoaXMubWV0YWRhdGFFZGl0b3IpIHtcclxuXHRcdFx0dGhpcy5tZXRhZGF0YUVkaXRvci5vbnVubG9hZCgpO1xyXG5cdFx0fVxyXG5cdFx0Y29udGVudEVsLmVtcHR5KCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGVzIGEgdGFzayBmaWVsZC5cclxuXHQgKi9cclxuXHRwcml2YXRlIHVwZGF0ZVRhc2tGaWVsZChmaWVsZDogc3RyaW5nLCB2YWx1ZTogYW55KSB7XHJcblx0XHRpZiAoZmllbGQgaW4gdGhpcy50YXNrKSB7XHJcblx0XHRcdCh0aGlzLnRhc2sgYXMgYW55KVtmaWVsZF0gPSB2YWx1ZTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuIl19