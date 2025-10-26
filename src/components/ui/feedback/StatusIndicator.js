import { ExtraButtonComponent, Menu, setIcon } from "obsidian";
import { Component } from "obsidian";
import { createTaskCheckbox, getStatusText } from "@/components/features/task/view/details";
import { t } from "@/translations/helper";
export class StatusComponent extends Component {
    constructor(plugin, containerEl, task, params) {
        super();
        this.plugin = plugin;
        this.containerEl = containerEl;
        this.task = task;
        this.params = params;
    }
    onload() {
        this.containerEl.createDiv({ cls: "details-status-selector" }, (el) => {
            let containerEl = el;
            if (this.params.type === "quick-capture") {
                el.createEl("div", {
                    cls: "quick-capture-status-selector-label",
                    text: t("Status"),
                });
                containerEl = el.createDiv({
                    cls: "quick-capture-status-selector",
                });
            }
            const allStatuses = Object.keys(this.plugin.settings.taskStatuses).map((status) => {
                return {
                    status: status,
                    text: this.plugin.settings.taskStatuses[status].split("|")[0],
                }; // Get the first status from each group
            });
            // Create five side-by-side status elements
            allStatuses.forEach((status) => {
                const statusEl = containerEl.createEl("div", {
                    cls: "status-option" +
                        (status.text === this.task.status
                            ? " current"
                            : ""),
                    attr: {
                        "aria-label": getStatusText(status.status, this.plugin.settings),
                    },
                });
                // Create checkbox-like element or icon for the status
                let interactiveElement = statusEl;
                if (this.plugin.settings.enableTaskGeniusIcons) {
                    setIcon(interactiveElement, status.status);
                }
                else {
                    // Create checkbox-like element for the status
                    interactiveElement = createTaskCheckbox(status.text, Object.assign(Object.assign({}, this.task), { status: status.text }), statusEl);
                }
                this.registerDomEvent(interactiveElement, "click", (evt) => {
                    var _a, _b, _c, _d;
                    evt.stopPropagation();
                    evt.preventDefault();
                    const options = Object.assign(Object.assign({}, this.task), { status: status.text });
                    if (status.text === "x" && !this.task.completed) {
                        options.completed = true;
                        options.metadata.completedDate = new Date().getTime();
                    }
                    (_b = (_a = this.params).onTaskUpdate) === null || _b === void 0 ? void 0 : _b.call(_a, this.task, options);
                    (_d = (_c = this.params).onTaskStatusSelected) === null || _d === void 0 ? void 0 : _d.call(_c, status.text);
                    // Update the current task status to reflect the change
                    this.task = Object.assign(Object.assign({}, this.task), { status: status.text });
                    // Update the visual state
                    this.containerEl.querySelectorAll('.status-option').forEach(el => {
                        el.removeClass('current');
                    });
                    statusEl.addClass('current');
                });
            });
            const moreStatus = el.createEl("div", {
                cls: "more-status",
            });
            const moreStatusBtn = new ExtraButtonComponent(moreStatus)
                .setIcon("ellipsis")
                .onClick(() => {
                var _a;
                const menu = new Menu();
                // Get unique statuses from taskStatusMarks
                const statusMarks = this.plugin.settings.taskStatusMarks;
                const uniqueStatuses = new Map();
                // Build a map of unique mark -> status name to avoid duplicates
                for (const status of Object.keys(statusMarks)) {
                    const mark = statusMarks[status];
                    // If this mark is not already in the map, add it
                    // This ensures each mark appears only once in the menu
                    if (!Array.from(uniqueStatuses.values()).includes(mark)) {
                        uniqueStatuses.set(status, mark);
                    }
                }
                // Create menu items from unique statuses
                for (const [status, mark] of uniqueStatuses) {
                    menu.addItem((item) => {
                        // Map marks to their corresponding icon names
                        const markToIcon = {
                            " ": "notStarted",
                            "/": "inProgress",
                            "x": "completed",
                            "-": "abandoned",
                            "?": "planned",
                            ">": "inProgress",
                            "X": "completed",
                        };
                        const iconName = markToIcon[mark];
                        if (this.plugin.settings.enableTaskGeniusIcons && iconName) {
                            // Use icon in menu
                            item.titleEl.createEl("span", {
                                cls: "status-option-icon",
                            }, (el) => {
                                setIcon(el, iconName);
                            });
                        }
                        else {
                            // Use checkbox in menu
                            item.titleEl.createEl("span", {
                                cls: "status-option-checkbox",
                            }, (el) => {
                                createTaskCheckbox(mark, this.task, el);
                            });
                        }
                        item.titleEl.createEl("span", {
                            cls: "status-option",
                            text: status,
                        });
                        item.onClick(() => {
                            var _a, _b, _c, _d;
                            (_b = (_a = this.params).onTaskUpdate) === null || _b === void 0 ? void 0 : _b.call(_a, this.task, Object.assign(Object.assign({}, this.task), { status: mark }));
                            (_d = (_c = this.params).onTaskStatusSelected) === null || _d === void 0 ? void 0 : _d.call(_c, mark);
                        });
                    });
                }
                const rect = (_a = moreStatusBtn.extraSettingsEl) === null || _a === void 0 ? void 0 : _a.getBoundingClientRect();
                if (rect) {
                    menu.showAtPosition({
                        x: rect.left,
                        y: rect.bottom + 10,
                    });
                }
            });
        });
    }
    getTaskStatus() {
        return this.task.status || "";
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3RhdHVzSW5kaWNhdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiU3RhdHVzSW5kaWNhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFHckMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVGLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUUxQyxNQUFNLE9BQU8sZUFBZ0IsU0FBUSxTQUFTO0lBQzdDLFlBQ1MsTUFBNkIsRUFDN0IsV0FBd0IsRUFDeEIsSUFBVSxFQUNWLE1BSVA7UUFFRCxLQUFLLEVBQUUsQ0FBQztRQVRBLFdBQU0sR0FBTixNQUFNLENBQXVCO1FBQzdCLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBQ3hCLFNBQUksR0FBSixJQUFJLENBQU07UUFDVixXQUFNLEdBQU4sTUFBTSxDQUliO0lBR0YsQ0FBQztJQUVELE1BQU07UUFDTCxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSx5QkFBeUIsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUU7WUFDckUsSUFBSSxXQUFXLEdBQUcsRUFBRSxDQUFDO1lBQ3JCLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssZUFBZSxFQUFFO2dCQUN6QyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRTtvQkFDbEIsR0FBRyxFQUFFLHFDQUFxQztvQkFDMUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUM7aUJBQ2pCLENBQUMsQ0FBQztnQkFFSCxXQUFXLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQztvQkFDMUIsR0FBRyxFQUFFLCtCQUErQjtpQkFDcEMsQ0FBQyxDQUFD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TUFBTSxFQUFFLElBQUksSUFDWCxDQUFDOzRCQUNILE1BQUEsTUFBQSxJQUFJLENBQUMsTUFBTSxFQUFDLG9CQUFvQixtREFBRyxJQUFJLENBQUMsQ0FBQzt3QkFDMUMsQ0FBQyxDQUFDLENBQUM7b0JBQ0osQ0FBQyxDQUFDLENBQUM7aUJBQ0g7Z0JBQ0QsTUFBTSxJQUFJLEdBQ1QsTUFBQSxhQUFhLENBQUMsZUFBZSwwQ0FBRSxxQkFBcUIsRUFBRSxDQUFDO2dCQUN4RCxJQUFJLElBQUksRUFBRTtvQkFDVCxJQUFJLENBQUMsY0FBYyxDQUFDO3dCQUNuQixDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUk7d0JBQ1osQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRTtxQkFDbkIsQ0FBQyxDQUFDO2lCQUNIO1lBQ0YsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTyxhQUFhO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksRUFBRSxDQUFDO0lBQy9CLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEV4dHJhQnV0dG9uQ29tcG9uZW50LCBNZW51LCBzZXRJY29uIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IENvbXBvbmVudCB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiQC90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7IGNyZWF0ZVRhc2tDaGVja2JveCwgZ2V0U3RhdHVzVGV4dCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay92aWV3L2RldGFpbHNcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBTdGF0dXNDb21wb25lbnQgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cHJpdmF0ZSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdHByaXZhdGUgY29udGFpbmVyRWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0cHJpdmF0ZSB0YXNrOiBUYXNrLFxyXG5cdFx0cHJpdmF0ZSBwYXJhbXM6IHtcclxuXHRcdFx0dHlwZT86IFwidGFzay12aWV3XCIgfCBcInF1aWNrLWNhcHR1cmVcIjtcclxuXHRcdFx0b25UYXNrVXBkYXRlPzogKHRhc2s6IFRhc2ssIHVwZGF0ZWRUYXNrOiBUYXNrKSA9PiBQcm9taXNlPHZvaWQ+O1xyXG5cdFx0XHRvblRhc2tTdGF0dXNTZWxlY3RlZD86IChzdGF0dXM6IHN0cmluZykgPT4gdm9pZDtcclxuXHRcdH1cclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0fVxyXG5cclxuXHRvbmxvYWQoKTogdm9pZCB7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdih7IGNsczogXCJkZXRhaWxzLXN0YXR1cy1zZWxlY3RvclwiIH0sIChlbCkgPT4ge1xyXG5cdFx0XHRsZXQgY29udGFpbmVyRWwgPSBlbDtcclxuXHRcdFx0aWYgKHRoaXMucGFyYW1zLnR5cGUgPT09IFwicXVpY2stY2FwdHVyZVwiKSB7XHJcblx0XHRcdFx0ZWwuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHRcdFx0Y2xzOiBcInF1aWNrLWNhcHR1cmUtc3RhdHVzLXNlbGVjdG9yLWxhYmVsXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiB0KFwiU3RhdHVzXCIpLFxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRjb250YWluZXJFbCA9IGVsLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0XHRjbHM6IFwicXVpY2stY2FwdHVyZS1zdGF0dXMtc2VsZWN0b3JcIixcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgYWxsU3RhdHVzZXMgPSBPYmplY3Qua2V5cyhcclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXNrU3RhdHVzZXNcclxuXHRcdFx0KS5tYXAoKHN0YXR1cykgPT4ge1xyXG5cdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRzdGF0dXM6IHN0YXR1cyxcclxuXHRcdFx0XHRcdHRleHQ6IHRoaXMucGx1Z2luLnNldHRpbmdzLnRhc2tTdGF0dXNlc1tcclxuXHRcdFx0XHRcdFx0c3RhdHVzIGFzIGtleW9mIHR5cGVvZiB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXNrU3RhdHVzZXNcclxuXHRcdFx0XHRcdF0uc3BsaXQoXCJ8XCIpWzBdLFxyXG5cdFx0XHRcdH07IC8vIEdldCB0aGUgZmlyc3Qgc3RhdHVzIGZyb20gZWFjaCBncm91cFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIENyZWF0ZSBmaXZlIHNpZGUtYnktc2lkZSBzdGF0dXMgZWxlbWVudHNcclxuXHRcdFx0YWxsU3RhdHVzZXMuZm9yRWFjaCgoc3RhdHVzKSA9PiB7XHJcblx0XHRcdFx0Y29uc3Qgc3RhdHVzRWwgPSBjb250YWluZXJFbC5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdFx0XHRjbHM6XHJcblx0XHRcdFx0XHRcdFwic3RhdHVzLW9wdGlvblwiICtcclxuXHRcdFx0XHRcdFx0KHN0YXR1cy50ZXh0ID09PSB0aGlzLnRhc2suc3RhdHVzXHJcblx0XHRcdFx0XHRcdFx0PyBcIiBjdXJyZW50XCJcclxuXHRcdFx0XHRcdFx0XHQ6IFwiXCIpLFxyXG5cdFx0XHRcdFx0YXR0cjoge1xyXG5cdFx0XHRcdFx0XHRcImFyaWEtbGFiZWxcIjogZ2V0U3RhdHVzVGV4dChcclxuXHRcdFx0XHRcdFx0XHRzdGF0dXMuc3RhdHVzLFxyXG5cdFx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzXHJcblx0XHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyBDcmVhdGUgY2hlY2tib3gtbGlrZSBlbGVtZW50IG9yIGljb24gZm9yIHRoZSBzdGF0dXNcclxuXHRcdFx0XHRsZXQgaW50ZXJhY3RpdmVFbGVtZW50OiBIVE1MRWxlbWVudCA9IHN0YXR1c0VsO1xyXG5cdFx0XHRcdGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbmFibGVUYXNrR2VuaXVzSWNvbnMpIHtcclxuXHRcdFx0XHRcdHNldEljb24oaW50ZXJhY3RpdmVFbGVtZW50LCBzdGF0dXMuc3RhdHVzKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0Ly8gQ3JlYXRlIGNoZWNrYm94LWxpa2UgZWxlbWVudCBmb3IgdGhlIHN0YXR1c1xyXG5cdFx0XHRcdFx0aW50ZXJhY3RpdmVFbGVtZW50ID0gY3JlYXRlVGFza0NoZWNrYm94KFxyXG5cdFx0XHRcdFx0XHRzdGF0dXMudGV4dCxcclxuXHRcdFx0XHRcdFx0eyAuLi50aGlzLnRhc2ssIHN0YXR1czogc3RhdHVzLnRleHQgfSBhcyBhbnksXHJcblx0XHRcdFx0XHRcdHN0YXR1c0VsXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGludGVyYWN0aXZlRWxlbWVudCwgXCJjbGlja1wiLCAoZXZ0KSA9PiB7XHJcblx0XHRcdFx0XHRldnQuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblx0XHRcdFx0XHRldnQucHJldmVudERlZmF1bHQoKTtcclxuXHJcblx0XHRcdFx0XHRjb25zdCBvcHRpb25zID0ge1xyXG5cdFx0XHRcdFx0XHQuLi50aGlzLnRhc2ssXHJcblx0XHRcdFx0XHRcdHN0YXR1czogc3RhdHVzLnRleHQsXHJcblx0XHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRcdGlmIChzdGF0dXMudGV4dCA9PT0gXCJ4XCIgJiYgIXRoaXMudGFzay5jb21wbGV0ZWQpIHtcclxuXHRcdFx0XHRcdFx0b3B0aW9ucy5jb21wbGV0ZWQgPSB0cnVlO1xyXG5cdFx0XHRcdFx0XHRvcHRpb25zLm1ldGFkYXRhLmNvbXBsZXRlZERhdGUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHR0aGlzLnBhcmFtcy5vblRhc2tVcGRhdGU/Lih0aGlzLnRhc2ssIG9wdGlvbnMpO1xyXG5cdFx0XHRcdFx0dGhpcy5wYXJhbXMub25UYXNrU3RhdHVzU2VsZWN0ZWQ/LihzdGF0dXMudGV4dCk7XHJcblx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdC8vIFVwZGF0ZSB0aGUgY3VycmVudCB0YXNrIHN0YXR1cyB0byByZWZsZWN0IHRoZSBjaGFuZ2VcclxuXHRcdFx0XHRcdHRoaXMudGFzayA9IHsgLi4udGhpcy50YXNrLCBzdGF0dXM6IHN0YXR1cy50ZXh0IH07XHJcblx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdC8vIFVwZGF0ZSB0aGUgdmlzdWFsIHN0YXRlXHJcblx0XHRcdFx0XHR0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoJy5zdGF0dXMtb3B0aW9uJykuZm9yRWFjaChlbCA9PiB7XHJcblx0XHRcdFx0XHRcdGVsLnJlbW92ZUNsYXNzKCdjdXJyZW50Jyk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdHN0YXR1c0VsLmFkZENsYXNzKCdjdXJyZW50Jyk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgbW9yZVN0YXR1cyA9IGVsLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0XHRjbHM6IFwibW9yZS1zdGF0dXNcIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdGNvbnN0IG1vcmVTdGF0dXNCdG4gPSBuZXcgRXh0cmFCdXR0b25Db21wb25lbnQobW9yZVN0YXR1cylcclxuXHRcdFx0XHQuc2V0SWNvbihcImVsbGlwc2lzXCIpXHJcblx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc3QgbWVudSA9IG5ldyBNZW51KCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gR2V0IHVuaXF1ZSBzdGF0dXNlcyBmcm9tIHRhc2tTdGF0dXNNYXJrc1xyXG5cdFx0XHRcdFx0Y29uc3Qgc3RhdHVzTWFya3MgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXNrU3RhdHVzTWFya3M7XHJcblx0XHRcdFx0XHRjb25zdCB1bmlxdWVTdGF0dXNlcyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gQnVpbGQgYSBtYXAgb2YgdW5pcXVlIG1hcmsgLT4gc3RhdHVzIG5hbWUgdG8gYXZvaWQgZHVwbGljYXRlc1xyXG5cdFx0XHRcdFx0Zm9yIChjb25zdCBzdGF0dXMgb2YgT2JqZWN0LmtleXMoc3RhdHVzTWFya3MpKSB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IG1hcmsgPVxyXG5cdFx0XHRcdFx0XHRcdHN0YXR1c01hcmtzW3N0YXR1cyBhcyBrZXlvZiB0eXBlb2Ygc3RhdHVzTWFya3NdO1xyXG5cdFx0XHRcdFx0XHQvLyBJZiB0aGlzIG1hcmsgaXMgbm90IGFscmVhZHkgaW4gdGhlIG1hcCwgYWRkIGl0XHJcblx0XHRcdFx0XHRcdC8vIFRoaXMgZW5zdXJlcyBlYWNoIG1hcmsgYXBwZWFycyBvbmx5IG9uY2UgaW4gdGhlIG1lbnVcclxuXHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdCFBcnJheS5mcm9tKHVuaXF1ZVN0YXR1c2VzLnZhbHVlcygpKS5pbmNsdWRlcyhtYXJrKVxyXG5cdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHR1bmlxdWVTdGF0dXNlcy5zZXQoc3RhdHVzLCBtYXJrKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIENyZWF0ZSBtZW51IGl0ZW1zIGZyb20gdW5pcXVlIHN0YXR1c2VzXHJcblx0XHRcdFx0XHRmb3IgKGNvbnN0IFtzdGF0dXMsIG1hcmtdIG9mIHVuaXF1ZVN0YXR1c2VzKSB7XHJcblx0XHRcdFx0XHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdC8vIE1hcCBtYXJrcyB0byB0aGVpciBjb3JyZXNwb25kaW5nIGljb24gbmFtZXNcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBtYXJrVG9JY29uOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XCIgXCI6IFwibm90U3RhcnRlZFwiLCAgICAgLy8gRW1wdHkvc3BhY2UgZm9yIG5vdCBzdGFydGVkXHJcblx0XHRcdFx0XHRcdFx0XHRcIi9cIjogXCJpblByb2dyZXNzXCIsICAgICAvLyBGb3J3YXJkIHNsYXNoIGZvciBpbiBwcm9ncmVzcyAgXHJcblx0XHRcdFx0XHRcdFx0XHRcInhcIjogXCJjb21wbGV0ZWRcIiwgICAgICAvLyB4IGZvciBjb21wbGV0ZWRcclxuXHRcdFx0XHRcdFx0XHRcdFwiLVwiOiBcImFiYW5kb25lZFwiLCAgICAgIC8vIERhc2ggZm9yIGFiYW5kb25lZFxyXG5cdFx0XHRcdFx0XHRcdFx0XCI/XCI6IFwicGxhbm5lZFwiLCAgICAgICAgIC8vIFF1ZXN0aW9uIG1hcmsgZm9yIHBsYW5uZWRcclxuXHRcdFx0XHRcdFx0XHRcdFwiPlwiOiBcImluUHJvZ3Jlc3NcIixcclxuXHRcdFx0XHRcdFx0XHRcdFwiWFwiOiBcImNvbXBsZXRlZFwiLFxyXG5cdFx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgaWNvbk5hbWUgPSBtYXJrVG9JY29uW21hcmtdO1xyXG5cdFx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHRcdGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbmFibGVUYXNrR2VuaXVzSWNvbnMgJiYgaWNvbk5hbWUpIHtcclxuXHRcdFx0XHRcdFx0XHRcdC8vIFVzZSBpY29uIGluIG1lbnVcclxuXHRcdFx0XHRcdFx0XHRcdGl0ZW0udGl0bGVFbC5jcmVhdGVFbChcclxuXHRcdFx0XHRcdFx0XHRcdFx0XCJzcGFuXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRjbHM6IFwic3RhdHVzLW9wdGlvbi1pY29uXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0XHRcdChlbCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHNldEljb24oZWwsIGljb25OYW1lKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdFx0Ly8gVXNlIGNoZWNrYm94IGluIG1lbnVcclxuXHRcdFx0XHRcdFx0XHRcdGl0ZW0udGl0bGVFbC5jcmVhdGVFbChcclxuXHRcdFx0XHRcdFx0XHRcdFx0XCJzcGFuXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRjbHM6IFwic3RhdHVzLW9wdGlvbi1jaGVja2JveFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdFx0XHQoZWwpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRjcmVhdGVUYXNrQ2hlY2tib3gobWFyaywgdGhpcy50YXNrLCBlbCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdGl0ZW0udGl0bGVFbC5jcmVhdGVFbChcInNwYW5cIiwge1xyXG5cdFx0XHRcdFx0XHRcdFx0Y2xzOiBcInN0YXR1cy1vcHRpb25cIixcclxuXHRcdFx0XHRcdFx0XHRcdHRleHQ6IHN0YXR1cyxcclxuXHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0XHRpdGVtLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5wYXJhbXMub25UYXNrVXBkYXRlPy4odGhpcy50YXNrLCB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdC4uLnRoaXMudGFzayxcclxuXHRcdFx0XHRcdFx0XHRcdFx0c3RhdHVzOiBtYXJrLFxyXG5cdFx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnBhcmFtcy5vblRhc2tTdGF0dXNTZWxlY3RlZD8uKG1hcmspO1xyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGNvbnN0IHJlY3QgPVxyXG5cdFx0XHRcdFx0XHRtb3JlU3RhdHVzQnRuLmV4dHJhU2V0dGluZ3NFbD8uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcblx0XHRcdFx0XHRpZiAocmVjdCkge1xyXG5cdFx0XHRcdFx0XHRtZW51LnNob3dBdFBvc2l0aW9uKHtcclxuXHRcdFx0XHRcdFx0XHR4OiByZWN0LmxlZnQsXHJcblx0XHRcdFx0XHRcdFx0eTogcmVjdC5ib3R0b20gKyAxMCxcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZ2V0VGFza1N0YXR1cygpIHtcclxuXHRcdHJldHVybiB0aGlzLnRhc2suc3RhdHVzIHx8IFwiXCI7XHJcblx0fVxyXG59XHJcbiJdfQ==