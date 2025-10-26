import { __awaiter } from "tslib";
import { ItemView } from "obsidian";
import { FluentSidebar } from "@/components/features/fluent/components/FluentSidebar";
import { emitSidebarSelectionChanged, onSidebarSelectionChanged } from "@/components/features/fluent/events/ui-event";
import { t } from "@/translations/helper";
export const TG_LEFT_SIDEBAR_VIEW_TYPE = "tg-left-sidebar";
export class LeftSidebarView extends ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin;
    }
    getViewType() {
        return TG_LEFT_SIDEBAR_VIEW_TYPE;
    }
    getDisplayText() {
        return "Task Genius" + t("Sidebar");
    }
    getIcon() {
        return "panel-left-dashed";
    }
    onOpen() {
        return __awaiter(this, void 0, void 0, function* () {
            const el = this.containerEl.children[1];
            el.empty();
            this.rootEl = el.createDiv({ cls: "tg-left-sidebar-view" });
            // Mount existing V2Sidebar component and translate callbacks to cross-view events
            this.sidebar = new FluentSidebar(this.rootEl, this.plugin, 
            // Emit view navigation to main view
            (viewId) => {
                var _a;
                emitSidebarSelectionChanged(this.app, {
                    selectionType: "view",
                    selectionId: viewId,
                    source: "left",
                    workspaceId: (_a = this.plugin.workspaceManager) === null || _a === void 0 ? void 0 : _a.getActiveWorkspace().id,
                });
            }, 
            // Emit project-based filtering
            (projectId) => {
                var _a;
                emitSidebarSelectionChanged(this.app, {
                    selectionType: "project",
                    selectionId: projectId,
                    source: "left",
                    workspaceId: (_a = this.plugin.workspaceManager) === null || _a === void 0 ? void 0 : _a.getActiveWorkspace().id,
                });
            }, false);
            this.addChild(this.sidebar);
            this.sidebar.load();
            // Sync active highlight when main view changes (ignore events from left to prevent echo)
            this.registerEvent(onSidebarSelectionChanged(this.app, (payload) => {
                var _a, _b;
                const activeId = (_a = this.plugin.workspaceManager) === null || _a === void 0 ? void 0 : _a.getActiveWorkspace().id;
                if (payload.workspaceId && activeId && payload.workspaceId !== activeId)
                    return;
                if (payload.selectionType === "view" && payload.selectionId && payload.source === "main") {
                    (_b = this.sidebar) === null || _b === void 0 ? void 0 : _b.setActiveItem(payload.selectionId);
                }
            }));
        });
    }
    onClose() {
        return __awaiter(this, void 0, void 0, function* () {
            // cleanup is handled by Component lifecycle
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTGVmdFNpZGViYXJWaWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiTGVmdFNpZGViYXJWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBQUUsUUFBUSxFQUFpQixNQUFNLFVBQVUsQ0FBQztBQUVuRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDdEYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLHlCQUF5QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDdEgsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRzFDLE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLGlCQUEwQixDQUFDO0FBRXBFLE1BQU0sT0FBTyxlQUFnQixTQUFRLFFBQVE7SUFJNUMsWUFBWSxJQUFtQixFQUFVLE1BQTZCO1FBQ3JFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUQ0QixXQUFNLEdBQU4sTUFBTSxDQUF1QjtJQUV0RSxDQUFDO0lBRUQsV0FBVztRQUNWLE9BQU8seUJBQXlCLENBQUM7SUFDbEMsQ0FBQztJQUVELGNBQWM7UUFDYixPQUFPLGFBQWEsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVELE9BQU87UUFDTixPQUFPLG1CQUFtQixDQUFDO0lBQzVCLENBQUM7SUFFSyxNQUFNOztZQUNYLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNYLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFDLEdBQUcsRUFBRSxzQkFBc0IsRUFBQyxDQUFDLENBQUM7WUFFMUQsa0ZBQWtGO1lBQ2xGLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxhQUFhLENBQy9CLElBQUksQ0FBQyxNQUFNLEVBQ1gsSUFBSSxDQUFDLE1BQU07WUFDWCxvQ0FBb0M7WUFDcEMsQ0FBQyxNQUFjLEVBQUUsRUFBRTs7Z0JBQ2xCLDJCQUEyQixDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUU7b0JBQ3JDLGFBQWEsRUFBRSxNQUFNO29CQUNyQixXQUFXLEVBQUUsTUFBTTtvQkFDbkIsTUFBTSxFQUFFLE1BQU07b0JBQ2QsV0FBVyxFQUFFLE1BQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsMENBQUUsa0JBQWtCLEdBQUcsRUFBRTtpQkFDbEUsQ0FBQyxDQUFDO1lBQ0osQ0FBQztZQUNELCtCQUErQjtZQUMvQixDQUFDLFNBQWlCLEVBQUUsRUFBRTs7Z0JBQ3JCLDJCQUEyQixDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUU7b0JBQ3JDLGFBQWEsRUFBRSxTQUFTO29CQUN4QixXQUFXLEVBQUUsU0FBUztvQkFDdEIsTUFBTSxFQUFFLE1BQU07b0JBQ2QsV0FBVyxFQUFFLE1BQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsMENBQUUsa0JBQWtCLEdBQUcsRUFBRTtpQkFDbEUsQ0FBQyxDQUFDO1lBQ0osQ0FBQyxFQUNELEtBQUssQ0FDTCxDQUFDO1lBQ0YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDNUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNwQix5RkFBeUY7WUFDekYsSUFBSSxDQUFDLGFBQWEsQ0FDakIseUJBQXlCLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFOztnQkFDL0MsTUFBTSxRQUFRLEdBQUcsTUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQiwwQ0FBRSxrQkFBa0IsR0FBRyxFQUFFLENBQUM7Z0JBQ3ZFLElBQUksT0FBTyxDQUFDLFdBQVcsSUFBSSxRQUFRLElBQUksT0FBTyxDQUFDLFdBQVcsS0FBSyxRQUFRO29CQUFFLE9BQU87Z0JBQ2hGLElBQUksT0FBTyxDQUFDLGFBQWEsS0FBSyxNQUFNLElBQUksT0FBTyxDQUFDLFdBQVcsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLE1BQU0sRUFBRTtvQkFDekYsTUFBQSxJQUFJLENBQUMsT0FBTywwQ0FBRSxhQUFhLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO2lCQUNqRDtZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUM7UUFFSCxDQUFDO0tBQUE7SUFFSyxPQUFPOztZQUNaLDRDQUE0QztRQUM3QyxDQUFDO0tBQUE7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEl0ZW1WaWV3LCBXb3Jrc3BhY2VMZWFmIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB0eXBlIFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5pbXBvcnQgeyBGbHVlbnRTaWRlYmFyIH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy9mbHVlbnQvY29tcG9uZW50cy9GbHVlbnRTaWRlYmFyXCI7XHJcbmltcG9ydCB7IGVtaXRTaWRlYmFyU2VsZWN0aW9uQ2hhbmdlZCwgb25TaWRlYmFyU2VsZWN0aW9uQ2hhbmdlZCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvZmx1ZW50L2V2ZW50cy91aS1ldmVudFwiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5cclxuXHJcbmV4cG9ydCBjb25zdCBUR19MRUZUX1NJREVCQVJfVklFV19UWVBFID0gXCJ0Zy1sZWZ0LXNpZGViYXJcIiBhcyBjb25zdDtcclxuXHJcbmV4cG9ydCBjbGFzcyBMZWZ0U2lkZWJhclZpZXcgZXh0ZW5kcyBJdGVtVmlldyB7XHJcblx0cHJpdmF0ZSByb290RWwhOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIHNpZGViYXIhOiBGbHVlbnRTaWRlYmFyO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihsZWFmOiBXb3Jrc3BhY2VMZWFmLCBwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luKSB7XHJcblx0XHRzdXBlcihsZWFmKTtcclxuXHR9XHJcblxyXG5cdGdldFZpZXdUeXBlKCk6IHN0cmluZyB7XHJcblx0XHRyZXR1cm4gVEdfTEVGVF9TSURFQkFSX1ZJRVdfVFlQRTtcclxuXHR9XHJcblxyXG5cdGdldERpc3BsYXlUZXh0KCk6IHN0cmluZyB7XHJcblx0XHRyZXR1cm4gXCJUYXNrIEdlbml1c1wiICsgdChcIlNpZGViYXJcIik7XHJcblx0fVxyXG5cclxuXHRnZXRJY29uKCk6IHN0cmluZyB7XHJcblx0XHRyZXR1cm4gXCJwYW5lbC1sZWZ0LWRhc2hlZFwiO1xyXG5cdH1cclxuXHJcblx0YXN5bmMgb25PcGVuKCkge1xyXG5cdFx0Y29uc3QgZWwgPSB0aGlzLmNvbnRhaW5lckVsLmNoaWxkcmVuWzFdO1xyXG5cdFx0ZWwuZW1wdHkoKTtcclxuXHRcdHRoaXMucm9vdEVsID0gZWwuY3JlYXRlRGl2KHtjbHM6IFwidGctbGVmdC1zaWRlYmFyLXZpZXdcIn0pO1xyXG5cclxuXHRcdC8vIE1vdW50IGV4aXN0aW5nIFYyU2lkZWJhciBjb21wb25lbnQgYW5kIHRyYW5zbGF0ZSBjYWxsYmFja3MgdG8gY3Jvc3MtdmlldyBldmVudHNcclxuXHRcdHRoaXMuc2lkZWJhciA9IG5ldyBGbHVlbnRTaWRlYmFyKFxyXG5cdFx0XHR0aGlzLnJvb3RFbCxcclxuXHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdC8vIEVtaXQgdmlldyBuYXZpZ2F0aW9uIHRvIG1haW4gdmlld1xyXG5cdFx0XHQodmlld0lkOiBzdHJpbmcpID0+IHtcclxuXHRcdFx0XHRlbWl0U2lkZWJhclNlbGVjdGlvbkNoYW5nZWQodGhpcy5hcHAsIHtcclxuXHRcdFx0XHRcdHNlbGVjdGlvblR5cGU6IFwidmlld1wiLFxyXG5cdFx0XHRcdFx0c2VsZWN0aW9uSWQ6IHZpZXdJZCxcclxuXHRcdFx0XHRcdHNvdXJjZTogXCJsZWZ0XCIsXHJcblx0XHRcdFx0XHR3b3Jrc3BhY2VJZDogdGhpcy5wbHVnaW4ud29ya3NwYWNlTWFuYWdlcj8uZ2V0QWN0aXZlV29ya3NwYWNlKCkuaWQsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0sXHJcblx0XHRcdC8vIEVtaXQgcHJvamVjdC1iYXNlZCBmaWx0ZXJpbmdcclxuXHRcdFx0KHByb2plY3RJZDogc3RyaW5nKSA9PiB7XHJcblx0XHRcdFx0ZW1pdFNpZGViYXJTZWxlY3Rpb25DaGFuZ2VkKHRoaXMuYXBwLCB7XHJcblx0XHRcdFx0XHRzZWxlY3Rpb25UeXBlOiBcInByb2plY3RcIixcclxuXHRcdFx0XHRcdHNlbGVjdGlvbklkOiBwcm9qZWN0SWQsXHJcblx0XHRcdFx0XHRzb3VyY2U6IFwibGVmdFwiLFxyXG5cdFx0XHRcdFx0d29ya3NwYWNlSWQ6IHRoaXMucGx1Z2luLndvcmtzcGFjZU1hbmFnZXI/LmdldEFjdGl2ZVdvcmtzcGFjZSgpLmlkLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRmYWxzZVxyXG5cdFx0KTtcclxuXHRcdHRoaXMuYWRkQ2hpbGQodGhpcy5zaWRlYmFyKTtcclxuXHRcdHRoaXMuc2lkZWJhci5sb2FkKCk7XHJcblx0XHQvLyBTeW5jIGFjdGl2ZSBoaWdobGlnaHQgd2hlbiBtYWluIHZpZXcgY2hhbmdlcyAoaWdub3JlIGV2ZW50cyBmcm9tIGxlZnQgdG8gcHJldmVudCBlY2hvKVxyXG5cdFx0dGhpcy5yZWdpc3RlckV2ZW50KFxyXG5cdFx0XHRvblNpZGViYXJTZWxlY3Rpb25DaGFuZ2VkKHRoaXMuYXBwLCAocGF5bG9hZCkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IGFjdGl2ZUlkID0gdGhpcy5wbHVnaW4ud29ya3NwYWNlTWFuYWdlcj8uZ2V0QWN0aXZlV29ya3NwYWNlKCkuaWQ7XHJcblx0XHRcdFx0aWYgKHBheWxvYWQud29ya3NwYWNlSWQgJiYgYWN0aXZlSWQgJiYgcGF5bG9hZC53b3Jrc3BhY2VJZCAhPT0gYWN0aXZlSWQpIHJldHVybjtcclxuXHRcdFx0XHRpZiAocGF5bG9hZC5zZWxlY3Rpb25UeXBlID09PSBcInZpZXdcIiAmJiBwYXlsb2FkLnNlbGVjdGlvbklkICYmIHBheWxvYWQuc291cmNlID09PSBcIm1haW5cIikge1xyXG5cdFx0XHRcdFx0dGhpcy5zaWRlYmFyPy5zZXRBY3RpdmVJdGVtKHBheWxvYWQuc2VsZWN0aW9uSWQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSlcclxuXHRcdCk7XHJcblxyXG5cdH1cclxuXHJcblx0YXN5bmMgb25DbG9zZSgpIHtcclxuXHRcdC8vIGNsZWFudXAgaXMgaGFuZGxlZCBieSBDb21wb25lbnQgbGlmZWN5Y2xlXHJcblx0fVxyXG59XHJcblxyXG4iXX0=