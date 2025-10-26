import { __awaiter } from "tslib";
import { ItemView } from "obsidian";
import { onTaskSelected } from "@/components/features/fluent/events/ui-event";
import { TaskDetailsComponent } from "@/components/features/task/view/details";
import { t } from "@/translations/helper";
export const TG_RIGHT_DETAIL_VIEW_TYPE = "tg-right-detail";
export class RightDetailView extends ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin;
    }
    getViewType() {
        return TG_RIGHT_DETAIL_VIEW_TYPE;
    }
    getDisplayText() {
        return "Task Genius" + t("Details");
    }
    getIcon() {
        return "panel-right-dashed";
    }
    onOpen() {
        return __awaiter(this, void 0, void 0, function* () {
            const el = this.containerEl.children[1];
            el.empty();
            this.rootEl = el.createDiv({ cls: "tg-right-detail-view" });
            // Mount TaskDetailsComponent
            this.details = new TaskDetailsComponent(this.rootEl, this.app, this.plugin);
            this.addChild(this.details);
            // this.details.onload();
            // Wire callbacks to WriteAPI
            this.details.onTaskUpdate = (originalTask, updatedTask) => __awaiter(this, void 0, void 0, function* () {
                if (!this.plugin.writeAPI)
                    return;
                yield this.plugin.writeAPI.updateTask({ taskId: originalTask.id, updates: updatedTask });
            });
            this.details.onTaskToggleComplete = (task) => __awaiter(this, void 0, void 0, function* () {
                if (!this.plugin.writeAPI)
                    return;
                yield this.plugin.writeAPI.updateTaskStatus({ taskId: task.id, completed: !task.completed });
            });
            // Subscribe to cross-view task selection
            this.registerEvent(onTaskSelected(this.app, (payload) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                // Filter by active workspace correctly
                console.log(this.app, payload);
                try {
                    const activeId = (_a = this.plugin.workspaceManager) === null || _a === void 0 ? void 0 : _a.getActiveWorkspace().id;
                    console.log(activeId, payload.workspaceId);
                    if (payload.workspaceId && activeId && payload.workspaceId !== activeId)
                        return;
                }
                catch (_c) {
                }
                // Reveal this leaf on selection
                if (payload.taskId)
                    this.app.workspace.revealLeaf(this.leaf);
                if (!payload.taskId) {
                    this.details.showTaskDetails(null);
                    return;
                }
                try {
                    const repo = (_b = this.plugin.dataflowOrchestrator) === null || _b === void 0 ? void 0 : _b.getRepository();
                    const task = repo && (yield repo.getTaskById(payload.taskId));
                    console.log(task);
                    if (task)
                        this.details.showTaskDetails(task);
                }
                catch (e) {
                    console.warn("[TG] RightDetailView failed to load task", e);
                }
            })));
        });
    }
    onClose() {
        return __awaiter(this, void 0, void 0, function* () {
            // cleanup handled by Component lifecycle
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmlnaHREZXRhaWxWaWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiUmlnaHREZXRhaWxWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBQUUsUUFBUSxFQUFpQixNQUFNLFVBQVUsQ0FBQztBQUVuRCxPQUFPLEVBQUUsY0FBYyxFQUF3QixNQUFNLDhDQUE4QyxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUcxQyxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxpQkFBMEIsQ0FBQztBQUVwRSxNQUFNLE9BQU8sZUFBZ0IsU0FBUSxRQUFRO0lBSTVDLFlBQVksSUFBbUIsRUFBVSxNQUE2QjtRQUNyRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFENEIsV0FBTSxHQUFOLE1BQU0sQ0FBdUI7SUFFdEUsQ0FBQztJQUVELFdBQVc7UUFDVixPQUFPLHlCQUF5QixDQUFDO0lBQ2xDLENBQUM7SUFFRCxjQUFjO1FBQ2IsT0FBTyxhQUFhLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFFRCxPQUFPO1FBQ04sT0FBTyxvQkFBb0IsQ0FBQztJQUM3QixDQUFDO0lBRUssTUFBTTs7WUFDWCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4QyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWCxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBQyxHQUFHLEVBQUUsc0JBQXNCLEVBQUMsQ0FBQyxDQUFDO1lBRTFELDZCQUE2QjtZQUM3QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksb0JBQW9CLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM1RSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM1Qix5QkFBeUI7WUFFekIsNkJBQTZCO1lBQzdCLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxHQUFHLENBQU8sWUFBWSxFQUFFLFdBQVcsRUFBRSxFQUFFO2dCQUMvRCxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRO29CQUFFLE9BQU87Z0JBQ2xDLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxFQUFFLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBQyxDQUFDLENBQUM7WUFDeEYsQ0FBQyxDQUFBLENBQUM7WUFDRixJQUFJLENBQUMsT0FBTyxDQUFDLG9CQUFvQixHQUFHLENBQU8sSUFBSSxFQUFFLEVBQUU7Z0JBQ2xELElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVE7b0JBQUUsT0FBTztnQkFDbEMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLFNBQVMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDO1lBQzVGLENBQUMsQ0FBQSxDQUFDO1lBRUYseUNBQXlDO1lBQ3pDLElBQUksQ0FBQyxhQUFhLENBQ2pCLGNBQWMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQU8sT0FBNkIsRUFBRSxFQUFFOztnQkFDaEUsdUNBQXVDO2dCQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQy9CLElBQUk7b0JBQ0gsTUFBTSxRQUFRLEdBQUcsTUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQiwwQ0FBRSxrQkFBa0IsR0FBRyxFQUFFLENBQUM7b0JBQ3ZFLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztvQkFDM0MsSUFBSSxPQUFPLENBQUMsV0FBVyxJQUFJLFFBQVEsSUFBSSxPQUFPLENBQUMsV0FBVyxLQUFLLFFBQVE7d0JBQUUsT0FBTztpQkFDaEY7Z0JBQUMsV0FBTTtpQkFDUDtnQkFFRCxnQ0FBZ0M7Z0JBQ2hDLElBQUksT0FBTyxDQUFDLE1BQU07b0JBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFFN0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUU7b0JBQ3BCLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLElBQWEsQ0FBQyxDQUFDO29CQUM1QyxPQUFPO2lCQUNQO2dCQUNELElBQUk7b0JBQ0gsTUFBTSxJQUFJLEdBQUcsTUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLG9CQUFvQiwwQ0FBRSxhQUFhLEVBQUUsQ0FBQztvQkFDL0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsTUFBTyxJQUFZLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO29CQUV2RSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUNsQixJQUFJLElBQUk7d0JBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQzdDO2dCQUFDLE9BQU8sQ0FBQyxFQUFFO29CQUNYLE9BQU8sQ0FBQyxJQUFJLENBQUMsMENBQTBDLEVBQUUsQ0FBQyxDQUFDLENBQUM7aUJBQzVEO1lBQ0YsQ0FBQyxDQUFBLENBQUMsQ0FDRixDQUFDO1FBQ0gsQ0FBQztLQUFBO0lBRUssT0FBTzs7WUFDWix5Q0FBeUM7UUFDMUMsQ0FBQztLQUFBO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBJdGVtVmlldywgV29ya3NwYWNlTGVhZiB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgdHlwZSBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjtcclxuaW1wb3J0IHsgb25UYXNrU2VsZWN0ZWQsIFRhc2tTZWxlY3Rpb25QYXlsb2FkIH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy9mbHVlbnQvZXZlbnRzL3VpLWV2ZW50XCI7XHJcbmltcG9ydCB7IFRhc2tEZXRhaWxzQ29tcG9uZW50IH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy90YXNrL3ZpZXcvZGV0YWlsc1wiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5cclxuXHJcbmV4cG9ydCBjb25zdCBUR19SSUdIVF9ERVRBSUxfVklFV19UWVBFID0gXCJ0Zy1yaWdodC1kZXRhaWxcIiBhcyBjb25zdDtcclxuXHJcbmV4cG9ydCBjbGFzcyBSaWdodERldGFpbFZpZXcgZXh0ZW5kcyBJdGVtVmlldyB7XHJcblx0cHJpdmF0ZSByb290RWwhOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIGRldGFpbHMhOiBUYXNrRGV0YWlsc0NvbXBvbmVudDtcclxuXHJcblx0Y29uc3RydWN0b3IobGVhZjogV29ya3NwYWNlTGVhZiwgcHJpdmF0ZSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbikge1xyXG5cdFx0c3VwZXIobGVhZik7XHJcblx0fVxyXG5cclxuXHRnZXRWaWV3VHlwZSgpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIFRHX1JJR0hUX0RFVEFJTF9WSUVXX1RZUEU7XHJcblx0fVxyXG5cclxuXHRnZXREaXNwbGF5VGV4dCgpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIFwiVGFzayBHZW5pdXNcIiArIHQoXCJEZXRhaWxzXCIpO1xyXG5cdH1cclxuXHJcblx0Z2V0SWNvbigpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIFwicGFuZWwtcmlnaHQtZGFzaGVkXCI7XHJcblx0fVxyXG5cclxuXHRhc3luYyBvbk9wZW4oKSB7XHJcblx0XHRjb25zdCBlbCA9IHRoaXMuY29udGFpbmVyRWwuY2hpbGRyZW5bMV07XHJcblx0XHRlbC5lbXB0eSgpO1xyXG5cdFx0dGhpcy5yb290RWwgPSBlbC5jcmVhdGVEaXYoe2NsczogXCJ0Zy1yaWdodC1kZXRhaWwtdmlld1wifSk7XHJcblxyXG5cdFx0Ly8gTW91bnQgVGFza0RldGFpbHNDb21wb25lbnRcclxuXHRcdHRoaXMuZGV0YWlscyA9IG5ldyBUYXNrRGV0YWlsc0NvbXBvbmVudCh0aGlzLnJvb3RFbCwgdGhpcy5hcHAsIHRoaXMucGx1Z2luKTtcclxuXHRcdHRoaXMuYWRkQ2hpbGQodGhpcy5kZXRhaWxzKTtcclxuXHRcdC8vIHRoaXMuZGV0YWlscy5vbmxvYWQoKTtcclxuXHJcblx0XHQvLyBXaXJlIGNhbGxiYWNrcyB0byBXcml0ZUFQSVxyXG5cdFx0dGhpcy5kZXRhaWxzLm9uVGFza1VwZGF0ZSA9IGFzeW5jIChvcmlnaW5hbFRhc2ssIHVwZGF0ZWRUYXNrKSA9PiB7XHJcblx0XHRcdGlmICghdGhpcy5wbHVnaW4ud3JpdGVBUEkpIHJldHVybjtcclxuXHRcdFx0YXdhaXQgdGhpcy5wbHVnaW4ud3JpdGVBUEkudXBkYXRlVGFzayh7dGFza0lkOiBvcmlnaW5hbFRhc2suaWQsIHVwZGF0ZXM6IHVwZGF0ZWRUYXNrfSk7XHJcblx0XHR9O1xyXG5cdFx0dGhpcy5kZXRhaWxzLm9uVGFza1RvZ2dsZUNvbXBsZXRlID0gYXN5bmMgKHRhc2spID0+IHtcclxuXHRcdFx0aWYgKCF0aGlzLnBsdWdpbi53cml0ZUFQSSkgcmV0dXJuO1xyXG5cdFx0XHRhd2FpdCB0aGlzLnBsdWdpbi53cml0ZUFQSS51cGRhdGVUYXNrU3RhdHVzKHt0YXNrSWQ6IHRhc2suaWQsIGNvbXBsZXRlZDogIXRhc2suY29tcGxldGVkfSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIFN1YnNjcmliZSB0byBjcm9zcy12aWV3IHRhc2sgc2VsZWN0aW9uXHJcblx0XHR0aGlzLnJlZ2lzdGVyRXZlbnQoXHJcblx0XHRcdG9uVGFza1NlbGVjdGVkKHRoaXMuYXBwLCBhc3luYyAocGF5bG9hZDogVGFza1NlbGVjdGlvblBheWxvYWQpID0+IHtcclxuXHRcdFx0XHQvLyBGaWx0ZXIgYnkgYWN0aXZlIHdvcmtzcGFjZSBjb3JyZWN0bHlcclxuXHRcdFx0XHRjb25zb2xlLmxvZyh0aGlzLmFwcCwgcGF5bG9hZCk7XHJcblx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdGNvbnN0IGFjdGl2ZUlkID0gdGhpcy5wbHVnaW4ud29ya3NwYWNlTWFuYWdlcj8uZ2V0QWN0aXZlV29ya3NwYWNlKCkuaWQ7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhhY3RpdmVJZCwgcGF5bG9hZC53b3Jrc3BhY2VJZCk7XHJcblx0XHRcdFx0XHRpZiAocGF5bG9hZC53b3Jrc3BhY2VJZCAmJiBhY3RpdmVJZCAmJiBwYXlsb2FkLndvcmtzcGFjZUlkICE9PSBhY3RpdmVJZCkgcmV0dXJuO1xyXG5cdFx0XHRcdH0gY2F0Y2gge1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gUmV2ZWFsIHRoaXMgbGVhZiBvbiBzZWxlY3Rpb25cclxuXHRcdFx0XHRpZiAocGF5bG9hZC50YXNrSWQpIHRoaXMuYXBwLndvcmtzcGFjZS5yZXZlYWxMZWFmKHRoaXMubGVhZik7XHJcblxyXG5cdFx0XHRcdGlmICghcGF5bG9hZC50YXNrSWQpIHtcclxuXHRcdFx0XHRcdHRoaXMuZGV0YWlscy5zaG93VGFza0RldGFpbHMobnVsbCBhcyBuZXZlcik7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRjb25zdCByZXBvID0gdGhpcy5wbHVnaW4uZGF0YWZsb3dPcmNoZXN0cmF0b3I/LmdldFJlcG9zaXRvcnkoKTtcclxuXHRcdFx0XHRcdGNvbnN0IHRhc2sgPSByZXBvICYmIChhd2FpdCAocmVwbyBhcyBhbnkpLmdldFRhc2tCeUlkKHBheWxvYWQudGFza0lkKSk7XHJcblxyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2codGFzayk7XHJcblx0XHRcdFx0XHRpZiAodGFzaykgdGhpcy5kZXRhaWxzLnNob3dUYXNrRGV0YWlscyh0YXNrKTtcclxuXHRcdFx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLndhcm4oXCJbVEddIFJpZ2h0RGV0YWlsVmlldyBmYWlsZWQgdG8gbG9hZCB0YXNrXCIsIGUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSlcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHRhc3luYyBvbkNsb3NlKCkge1xyXG5cdFx0Ly8gY2xlYW51cCBoYW5kbGVkIGJ5IENvbXBvbmVudCBsaWZlY3ljbGVcclxuXHR9XHJcbn1cclxuXHJcbiJdfQ==