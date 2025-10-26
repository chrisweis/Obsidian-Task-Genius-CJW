import { __awaiter } from "tslib";
import { Component } from "obsidian";
import { getViewSettingOrDefault, } from "@/common/setting-definition";
import { KanbanComponent } from "@/components/features/kanban/kanban";
import { CalendarComponent } from "@/components/features/calendar";
import { GanttComponent } from "@/components/features/gantt/gantt";
import { TaskPropertyTwoColumnView } from "@/components/features/task/view/TaskPropertyTwoColumnView";
import { ForecastComponent } from "@/components/features/task/view/forecast";
import { TableViewAdapter } from "@/components/features/table/TableViewAdapter";
import { QuadrantComponent } from "@/components/features/quadrant/quadrant";
// 视图组件工厂
class ViewComponentFactory {
    static createComponent(viewType, viewId, app, plugin, parentEl, handlers) {
        var _a, _b;
        const viewConfig = getViewSettingOrDefault(plugin, viewId);
        switch (viewType) {
            case "kanban":
                return new KanbanComponent(app, plugin, parentEl, [], {
                    onTaskStatusUpdate: handlers.onTaskStatusUpdate,
                    onTaskSelected: handlers.onTaskSelected,
                    onTaskCompleted: handlers.onTaskCompleted,
                    onTaskContextMenu: handlers.onTaskContextMenu,
                }, viewId);
            case "calendar":
                return new CalendarComponent(app, plugin, parentEl, [], {
                    onTaskSelected: handlers.onTaskSelected,
                    onTaskCompleted: handlers.onTaskCompleted,
                    onEventContextMenu: handlers.onEventContextMenu,
                }, viewId);
            case "gantt":
                return new GanttComponent(plugin, parentEl, {
                    onTaskSelected: handlers.onTaskSelected,
                    onTaskCompleted: handlers.onTaskCompleted,
                    onTaskContextMenu: handlers.onTaskContextMenu,
                }, viewId);
            case "twocolumn":
                if (((_a = viewConfig.specificConfig) === null || _a === void 0 ? void 0 : _a.viewType) === "twocolumn") {
                    return new TaskPropertyTwoColumnView(parentEl, app, plugin, viewConfig.specificConfig, viewId);
                }
                return null;
            case "forecast":
                return new ForecastComponent(parentEl, app, plugin, {
                    onTaskSelected: handlers.onTaskSelected,
                    onTaskCompleted: handlers.onTaskCompleted,
                    onTaskContextMenu: handlers.onTaskContextMenu,
                    onTaskUpdate: handlers.onTaskUpdate,
                });
            case "table":
                if (((_b = viewConfig.specificConfig) === null || _b === void 0 ? void 0 : _b.viewType) === "table") {
                    return new TableViewAdapter(app, plugin, parentEl, viewConfig.specificConfig, {
                        onTaskSelected: handlers.onTaskSelected,
                        onTaskCompleted: handlers.onTaskCompleted,
                        onTaskContextMenu: handlers.onTaskContextMenu,
                        onTaskUpdated: (task) => __awaiter(this, void 0, void 0, function* () {
                            // Handle task updates through WriteAPI
                            if (plugin.writeAPI) {
                                const result = yield plugin.writeAPI.updateTask({
                                    taskId: task.id,
                                    updates: task,
                                });
                                if (!result.success) {
                                    console.error("Failed to update task:", result.error);
                                }
                            }
                            else {
                                console.error("WriteAPI not available");
                            }
                        }),
                    });
                }
                return null;
            case "quadrant":
                return new QuadrantComponent(app, plugin, parentEl, [], {
                    onTaskStatusUpdate: handlers.onTaskStatusUpdate,
                    onTaskSelected: handlers.onTaskSelected,
                    onTaskCompleted: handlers.onTaskCompleted,
                    onTaskContextMenu: handlers.onTaskContextMenu,
                    onTaskUpdated: (task) => __awaiter(this, void 0, void 0, function* () {
                        // Handle task updates through WriteAPI
                        if (plugin.writeAPI) {
                            const result = yield plugin.writeAPI.updateTask({
                                taskId: task.id,
                                updates: task,
                            });
                            if (!result.success) {
                                console.error("Failed to update task:", result.error);
                            }
                        }
                        else {
                            console.error("WriteAPI not available");
                        }
                    }),
                }, viewId);
            default:
                return null;
        }
    }
}
// 统一的视图组件管理器
export class ViewComponentManager extends Component {
    constructor(parentComponent, app, plugin, parentEl, handlers) {
        super();
        this.components = new Map();
        this.parentComponent = parentComponent;
        this.app = app;
        this.plugin = plugin;
        this.parentEl = parentEl;
        this.handlers = handlers;
    }
    /**
     * 获取或创建指定视图的组件
     */
    getOrCreateComponent(viewId) {
        var _a;
        // 如果组件已存在，直接返回
        if (this.components.has(viewId)) {
            return this.components.get(viewId);
        }
        // 获取视图配置
        const viewConfig = getViewSettingOrDefault(this.plugin, viewId);
        const specificViewType = (_a = viewConfig.specificConfig) === null || _a === void 0 ? void 0 : _a.viewType;
        // 确定视图类型
        let viewType = null;
        if (specificViewType) {
            viewType = specificViewType;
        }
        else if ([
            "calendar",
            "kanban",
            "gantt",
            "forecast",
            "table",
            "quadrant",
        ].includes(viewId)) {
            viewType = viewId;
        }
        if (!viewType) {
            return null; // 不是特殊视图类型
        }
        // 创建新组件
        const component = ViewComponentFactory.createComponent(viewType, viewId, this.app, this.plugin, this.parentEl, this.handlers);
        if (component) {
            // 添加到父组件管理
            if (component instanceof Component) {
                this.parentComponent.addChild(component);
            }
            // 初始化组件
            if (component.load) {
                component.load();
            }
            // 默认隐藏
            component.containerEl.hide();
            // 缓存组件
            this.components.set(viewId, component);
        }
        return component;
    }
    /**
     * 隐藏所有组件
     */
    hideAllComponents() {
        this.components.forEach((component) => {
            component.containerEl.hide();
        });
    }
    /**
     * 显示指定视图的组件
     */
    showComponent(viewId) {
        const component = this.getOrCreateComponent(viewId);
        if (component) {
            component.containerEl.show();
        }
        return component;
    }
    /**
     * 检查是否为特殊视图
     */
    isSpecialView(viewId) {
        var _a;
        const viewConfig = getViewSettingOrDefault(this.plugin, viewId);
        const specificViewType = (_a = viewConfig.specificConfig) === null || _a === void 0 ? void 0 : _a.viewType;
        console.log("isSpecialView", viewId, specificViewType, ["calendar", "kanban", "gantt", "forecast", "table"].includes(viewId));
        return !!(specificViewType ||
            ["calendar", "kanban", "gantt", "forecast", "table"].includes(viewId));
    }
    /**
     * 清理所有组件
     */
    cleanup() {
        this.components.forEach((component) => {
            if (component instanceof Component) {
                this.parentComponent.removeChild(component);
            }
            if (component.unload) {
                component.unload();
            }
        });
        this.components.clear();
    }
    /**
     * 获取所有组件的迭代器（用于批量操作）
     */
    getAllComponents() {
        return this.components.entries();
    }
    onunload() {
        this.cleanup();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVmlld0NvbXBvbmVudE1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJWaWV3Q29tcG9uZW50TWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFPLFNBQVMsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUcxQyxPQUFPLEVBRU4sdUJBQXVCLEdBQ3ZCLE1BQU0sNkJBQTZCLENBQUM7QUFDckMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxpQkFBaUIsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNsRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDbkUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDdEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDN0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDaEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUF5QjVFLFNBQVM7QUFDVCxNQUFNLG9CQUFvQjtJQUN6QixNQUFNLENBQUMsZUFBZSxDQUNyQixRQUFnQixFQUNoQixNQUFjLEVBQ2QsR0FBUSxFQUNSLE1BQTZCLEVBQzdCLFFBQXFCLEVBQ3JCLFFBQTJCOztRQUUzQixNQUFNLFVBQVUsR0FBRyx1QkFBdUIsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFM0QsUUFBUSxRQUFRLEVBQUU7WUFDakIsS0FBSyxRQUFRO2dCQUNaLE9BQU8sSUFBSSxlQUFlLENBQ3pCLEdBQUcsRUFDSCxNQUFNLEVBQ04sUUFBUSxFQUNSLEVBQUUsRUFDRjtvQkFDQyxrQkFBa0IsRUFBRSxRQUFRLENBQUMsa0JBQWtCO29CQUMvQyxjQUFjLEVBQUUsUUFBUSxDQUFDLGNBQWM7b0JBQ3ZDLGVBQWUsRUFBRSxRQUFRLENBQUMsZUFB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QUNILENBQUM7SUFFRDs7T0FFRztJQUNILE9BQU87UUFDTixJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFO1lBQ3JDLElBQUksU0FBUyxZQUFZLFNBQVMsRUFBRTtnQkFDbkMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7YUFDNUM7WUFDRCxJQUFJLFNBQVMsQ0FBQyxNQUFNLEVBQUU7Z0JBQ3JCLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQzthQUNuQjtRQUNGLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN6QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxnQkFBZ0I7UUFDZixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDbEMsQ0FBQztJQUVELFFBQVE7UUFDUCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDaEIsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwLCBDb21wb25lbnQgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgVGFzayB9IGZyb20gXCJAL3R5cGVzL3Rhc2tcIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5pbXBvcnQge1xyXG5cdFZpZXdNb2RlLFxyXG5cdGdldFZpZXdTZXR0aW5nT3JEZWZhdWx0LFxyXG59IGZyb20gXCJAL2NvbW1vbi9zZXR0aW5nLWRlZmluaXRpb25cIjtcclxuaW1wb3J0IHsgS2FuYmFuQ29tcG9uZW50IH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy9rYW5iYW4va2FuYmFuXCI7XHJcbmltcG9ydCB7IENhbGVuZGFyQ29tcG9uZW50LCBDYWxlbmRhckV2ZW50IH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy9jYWxlbmRhclwiO1xyXG5pbXBvcnQgeyBHYW50dENvbXBvbmVudCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvZ2FudHQvZ2FudHRcIjtcclxuaW1wb3J0IHsgVGFza1Byb3BlcnR5VHdvQ29sdW1uVmlldyB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay92aWV3L1Rhc2tQcm9wZXJ0eVR3b0NvbHVtblZpZXdcIjtcclxuaW1wb3J0IHsgRm9yZWNhc3RDb21wb25lbnQgfSBmcm9tIFwiQC9jb21wb25lbnRzL2ZlYXR1cmVzL3Rhc2svdmlldy9mb3JlY2FzdFwiO1xyXG5pbXBvcnQgeyBUYWJsZVZpZXdBZGFwdGVyIH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy90YWJsZS9UYWJsZVZpZXdBZGFwdGVyXCI7XHJcbmltcG9ydCB7IFF1YWRyYW50Q29tcG9uZW50IH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy9xdWFkcmFudC9xdWFkcmFudFwiO1xyXG5cclxuLy8g5a6a5LmJ6KeG5Zu+57uE5Lu255qE6YCa55So5o6l5Y+jXHJcbmludGVyZmFjZSBWaWV3Q29tcG9uZW50SW50ZXJmYWNlIHtcclxuXHRjb250YWluZXJFbDogSFRNTEVsZW1lbnQ7XHJcblx0c2V0VGFza3M/OiAodGFza3M6IFRhc2tbXSwgYWxsVGFza3M/OiBUYXNrW10pID0+IHZvaWQ7XHJcblx0dXBkYXRlVGFza3M/OiAodGFza3M6IFRhc2tbXSkgPT4gdm9pZDtcclxuXHRzZXRWaWV3TW9kZT86ICh2aWV3SWQ6IFZpZXdNb2RlLCBwcm9qZWN0Pzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZDtcclxuXHRsb2FkPzogKCkgPT4gdm9pZDtcclxuXHR1bmxvYWQ/OiAoKSA9PiB2b2lkO1xyXG59XHJcblxyXG4vLyDlrprkuYnkuovku7blpITnkIblmajmjqXlj6NcclxuaW50ZXJmYWNlIFZpZXdFdmVudEhhbmRsZXJzIHtcclxuXHRvblRhc2tTZWxlY3RlZD86ICh0YXNrOiBUYXNrIHwgbnVsbCkgPT4gdm9pZDtcclxuXHRvblRhc2tDb21wbGV0ZWQ/OiAodGFzazogVGFzaykgPT4gdm9pZDtcclxuXHRvblRhc2tDb250ZXh0TWVudT86IChldmVudDogTW91c2VFdmVudCwgdGFzazogVGFzaykgPT4gdm9pZDtcclxuXHRvblRhc2tTdGF0dXNVcGRhdGU/OiAoXHJcblx0XHR0YXNrSWQ6IHN0cmluZyxcclxuXHRcdG5ld1N0YXR1c01hcms6IHN0cmluZyxcclxuXHQpID0+IFByb21pc2U8dm9pZD47XHJcblx0b25FdmVudENvbnRleHRNZW51PzogKGV2OiBNb3VzZUV2ZW50LCBldmVudDogQ2FsZW5kYXJFdmVudCkgPT4gdm9pZDtcclxuXHRvblRhc2tVcGRhdGU/OiAob3JpZ2luYWxUYXNrOiBUYXNrLCB1cGRhdGVkVGFzazogVGFzaykgPT4gUHJvbWlzZTx2b2lkPjtcclxufVxyXG5cclxuLy8g6KeG5Zu+57uE5Lu25bel5Y6CXHJcbmNsYXNzIFZpZXdDb21wb25lbnRGYWN0b3J5IHtcclxuXHRzdGF0aWMgY3JlYXRlQ29tcG9uZW50KFxyXG5cdFx0dmlld1R5cGU6IHN0cmluZyxcclxuXHRcdHZpZXdJZDogc3RyaW5nLFxyXG5cdFx0YXBwOiBBcHAsXHJcblx0XHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdHBhcmVudEVsOiBIVE1MRWxlbWVudCxcclxuXHRcdGhhbmRsZXJzOiBWaWV3RXZlbnRIYW5kbGVycyxcclxuXHQpOiBWaWV3Q29tcG9uZW50SW50ZXJmYWNlIHwgbnVsbCB7XHJcblx0XHRjb25zdCB2aWV3Q29uZmlnID0gZ2V0Vmlld1NldHRpbmdPckRlZmF1bHQocGx1Z2luLCB2aWV3SWQpO1xyXG5cclxuXHRcdHN3aXRjaCAodmlld1R5cGUpIHtcclxuXHRcdFx0Y2FzZSBcImthbmJhblwiOlxyXG5cdFx0XHRcdHJldHVybiBuZXcgS2FuYmFuQ29tcG9uZW50KFxyXG5cdFx0XHRcdFx0YXBwLFxyXG5cdFx0XHRcdFx0cGx1Z2luLFxyXG5cdFx0XHRcdFx0cGFyZW50RWwsXHJcblx0XHRcdFx0XHRbXSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0b25UYXNrU3RhdHVzVXBkYXRlOiBoYW5kbGVycy5vblRhc2tTdGF0dXNVcGRhdGUsXHJcblx0XHRcdFx0XHRcdG9uVGFza1NlbGVjdGVkOiBoYW5kbGVycy5vblRhc2tTZWxlY3RlZCxcclxuXHRcdFx0XHRcdFx0b25UYXNrQ29tcGxldGVkOiBoYW5kbGVycy5vblRhc2tDb21wbGV0ZWQsXHJcblx0XHRcdFx0XHRcdG9uVGFza0NvbnRleHRNZW51OiBoYW5kbGVycy5vblRhc2tDb250ZXh0TWVudSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR2aWV3SWQsXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdGNhc2UgXCJjYWxlbmRhclwiOlxyXG5cdFx0XHRcdHJldHVybiBuZXcgQ2FsZW5kYXJDb21wb25lbnQoXHJcblx0XHRcdFx0XHRhcHAsXHJcblx0XHRcdFx0XHRwbHVnaW4sXHJcblx0XHRcdFx0XHRwYXJlbnRFbCxcclxuXHRcdFx0XHRcdFtdLFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRvblRhc2tTZWxlY3RlZDogaGFuZGxlcnMub25UYXNrU2VsZWN0ZWQsXHJcblx0XHRcdFx0XHRcdG9uVGFza0NvbXBsZXRlZDogaGFuZGxlcnMub25UYXNrQ29tcGxldGVkLFxyXG5cdFx0XHRcdFx0XHRvbkV2ZW50Q29udGV4dE1lbnU6IGhhbmRsZXJzLm9uRXZlbnRDb250ZXh0TWVudSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR2aWV3SWQsXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdGNhc2UgXCJnYW50dFwiOlxyXG5cdFx0XHRcdHJldHVybiBuZXcgR2FudHRDb21wb25lbnQoXHJcblx0XHRcdFx0XHRwbHVnaW4sXHJcblx0XHRcdFx0XHRwYXJlbnRFbCxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0b25UYXNrU2VsZWN0ZWQ6IGhhbmRsZXJzLm9uVGFza1NlbGVjdGVkLFxyXG5cdFx0XHRcdFx0XHRvblRhc2tDb21wbGV0ZWQ6IGhhbmRsZXJzLm9uVGFza0NvbXBsZXRlZCxcclxuXHRcdFx0XHRcdFx0b25UYXNrQ29udGV4dE1lbnU6IGhhbmRsZXJzLm9uVGFza0NvbnRleHRNZW51LFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHZpZXdJZCxcclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0Y2FzZSBcInR3b2NvbHVtblwiOlxyXG5cdFx0XHRcdGlmICh2aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnPy52aWV3VHlwZSA9PT0gXCJ0d29jb2x1bW5cIikge1xyXG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBUYXNrUHJvcGVydHlUd29Db2x1bW5WaWV3KFxyXG5cdFx0XHRcdFx0XHRwYXJlbnRFbCxcclxuXHRcdFx0XHRcdFx0YXBwLFxyXG5cdFx0XHRcdFx0XHRwbHVnaW4sXHJcblx0XHRcdFx0XHRcdHZpZXdDb25maWcuc3BlY2lmaWNDb25maWcsXHJcblx0XHRcdFx0XHRcdHZpZXdJZCxcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHJldHVybiBudWxsO1xyXG5cclxuXHRcdFx0Y2FzZSBcImZvcmVjYXN0XCI6XHJcblx0XHRcdFx0cmV0dXJuIG5ldyBGb3JlY2FzdENvbXBvbmVudChwYXJlbnRFbCwgYXBwLCBwbHVnaW4sIHtcclxuXHRcdFx0XHRcdG9uVGFza1NlbGVjdGVkOiBoYW5kbGVycy5vblRhc2tTZWxlY3RlZCxcclxuXHRcdFx0XHRcdG9uVGFza0NvbXBsZXRlZDogaGFuZGxlcnMub25UYXNrQ29tcGxldGVkLFxyXG5cdFx0XHRcdFx0b25UYXNrQ29udGV4dE1lbnU6IGhhbmRsZXJzLm9uVGFza0NvbnRleHRNZW51LFxyXG5cdFx0XHRcdFx0b25UYXNrVXBkYXRlOiBoYW5kbGVycy5vblRhc2tVcGRhdGUsXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjYXNlIFwidGFibGVcIjpcclxuXHRcdFx0XHRpZiAodmlld0NvbmZpZy5zcGVjaWZpY0NvbmZpZz8udmlld1R5cGUgPT09IFwidGFibGVcIikge1xyXG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBUYWJsZVZpZXdBZGFwdGVyKFxyXG5cdFx0XHRcdFx0XHRhcHAsXHJcblx0XHRcdFx0XHRcdHBsdWdpbixcclxuXHRcdFx0XHRcdFx0cGFyZW50RWwsXHJcblx0XHRcdFx0XHRcdHZpZXdDb25maWcuc3BlY2lmaWNDb25maWcsXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRvblRhc2tTZWxlY3RlZDogaGFuZGxlcnMub25UYXNrU2VsZWN0ZWQsXHJcblx0XHRcdFx0XHRcdFx0b25UYXNrQ29tcGxldGVkOiBoYW5kbGVycy5vblRhc2tDb21wbGV0ZWQsXHJcblx0XHRcdFx0XHRcdFx0b25UYXNrQ29udGV4dE1lbnU6IGhhbmRsZXJzLm9uVGFza0NvbnRleHRNZW51LFxyXG5cdFx0XHRcdFx0XHRcdG9uVGFza1VwZGF0ZWQ6IGFzeW5jICh0YXNrOiBUYXNrKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHQvLyBIYW5kbGUgdGFzayB1cGRhdGVzIHRocm91Z2ggV3JpdGVBUElcclxuXHRcdFx0XHRcdFx0XHRcdGlmIChwbHVnaW4ud3JpdGVBUEkpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgcmVzdWx0ID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRhd2FpdCBwbHVnaW4ud3JpdGVBUEkudXBkYXRlVGFzayh7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0YXNrSWQ6IHRhc2suaWQsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR1cGRhdGVzOiB0YXNrLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFwiRmFpbGVkIHRvIHVwZGF0ZSB0YXNrOlwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0cmVzdWx0LmVycm9yLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJXcml0ZUFQSSBub3QgYXZhaWxhYmxlXCIpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHJcblx0XHRcdGNhc2UgXCJxdWFkcmFudFwiOlxyXG5cdFx0XHRcdHJldHVybiBuZXcgUXVhZHJhbnRDb21wb25lbnQoXHJcblx0XHRcdFx0XHRhcHAsXHJcblx0XHRcdFx0XHRwbHVnaW4sXHJcblx0XHRcdFx0XHRwYXJlbnRFbCxcclxuXHRcdFx0XHRcdFtdLFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRvblRhc2tTdGF0dXNVcGRhdGU6IGhhbmRsZXJzLm9uVGFza1N0YXR1c1VwZGF0ZSxcclxuXHRcdFx0XHRcdFx0b25UYXNrU2VsZWN0ZWQ6IGhhbmRsZXJzLm9uVGFza1NlbGVjdGVkLFxyXG5cdFx0XHRcdFx0XHRvblRhc2tDb21wbGV0ZWQ6IGhhbmRsZXJzLm9uVGFza0NvbXBsZXRlZCxcclxuXHRcdFx0XHRcdFx0b25UYXNrQ29udGV4dE1lbnU6IGhhbmRsZXJzLm9uVGFza0NvbnRleHRNZW51LFxyXG5cdFx0XHRcdFx0XHRvblRhc2tVcGRhdGVkOiBhc3luYyAodGFzazogVGFzaykgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdC8vIEhhbmRsZSB0YXNrIHVwZGF0ZXMgdGhyb3VnaCBXcml0ZUFQSVxyXG5cdFx0XHRcdFx0XHRcdGlmIChwbHVnaW4ud3JpdGVBUEkpIHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHBsdWdpbi53cml0ZUFQSS51cGRhdGVUYXNrKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0dGFza0lkOiB0YXNrLmlkLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHVwZGF0ZXM6IHRhc2ssXHJcblx0XHRcdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKCFyZXN1bHQuc3VjY2Vzcykge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmVycm9yKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFwiRmFpbGVkIHRvIHVwZGF0ZSB0YXNrOlwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJlc3VsdC5lcnJvcixcclxuXHRcdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcIldyaXRlQVBJIG5vdCBhdmFpbGFibGVcIik7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHZpZXdJZCxcclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbi8vIOe7n+S4gOeahOinhuWbvue7hOS7tueuoeeQhuWZqFxyXG5leHBvcnQgY2xhc3MgVmlld0NvbXBvbmVudE1hbmFnZXIgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdHByaXZhdGUgY29tcG9uZW50czogTWFwPHN0cmluZywgVmlld0NvbXBvbmVudEludGVyZmFjZT4gPSBuZXcgTWFwKCk7XHJcblx0cHJpdmF0ZSBwYXJlbnRDb21wb25lbnQ6IENvbXBvbmVudDtcclxuXHRwcml2YXRlIGFwcDogQXBwO1xyXG5cdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblx0cHJpdmF0ZSBwYXJlbnRFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBoYW5kbGVyczogVmlld0V2ZW50SGFuZGxlcnM7XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cGFyZW50Q29tcG9uZW50OiBDb21wb25lbnQsXHJcblx0XHRhcHA6IEFwcCxcclxuXHRcdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0cGFyZW50RWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0aGFuZGxlcnM6IFZpZXdFdmVudEhhbmRsZXJzLFxyXG5cdCkge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMucGFyZW50Q29tcG9uZW50ID0gcGFyZW50Q29tcG9uZW50O1xyXG5cdFx0dGhpcy5hcHAgPSBhcHA7XHJcblx0XHR0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuXHRcdHRoaXMucGFyZW50RWwgPSBwYXJlbnRFbDtcclxuXHRcdHRoaXMuaGFuZGxlcnMgPSBoYW5kbGVycztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIOiOt+WPluaIluWIm+W7uuaMh+WumuinhuWbvueahOe7hOS7tlxyXG5cdCAqL1xyXG5cdGdldE9yQ3JlYXRlQ29tcG9uZW50KHZpZXdJZDogc3RyaW5nKTogVmlld0NvbXBvbmVudEludGVyZmFjZSB8IG51bGwge1xyXG5cdFx0Ly8g5aaC5p6c57uE5Lu25bey5a2Y5Zyo77yM55u05o6l6L+U5ZueXHJcblx0XHRpZiAodGhpcy5jb21wb25lbnRzLmhhcyh2aWV3SWQpKSB7XHJcblx0XHRcdHJldHVybiB0aGlzLmNvbXBvbmVudHMuZ2V0KHZpZXdJZCkhO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIOiOt+WPluinhuWbvumFjee9rlxyXG5cdFx0Y29uc3Qgdmlld0NvbmZpZyA9IGdldFZpZXdTZXR0aW5nT3JEZWZhdWx0KHRoaXMucGx1Z2luLCB2aWV3SWQpO1xyXG5cdFx0Y29uc3Qgc3BlY2lmaWNWaWV3VHlwZSA9IHZpZXdDb25maWcuc3BlY2lmaWNDb25maWc/LnZpZXdUeXBlO1xyXG5cclxuXHRcdC8vIOehruWumuinhuWbvuexu+Wei1xyXG5cdFx0bGV0IHZpZXdUeXBlOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcclxuXHRcdGlmIChzcGVjaWZpY1ZpZXdUeXBlKSB7XHJcblx0XHRcdHZpZXdUeXBlID0gc3BlY2lmaWNWaWV3VHlwZTtcclxuXHRcdH0gZWxzZSBpZiAoXHJcblx0XHRcdFtcclxuXHRcdFx0XHRcImNhbGVuZGFyXCIsXHJcblx0XHRcdFx0XCJrYW5iYW5cIixcclxuXHRcdFx0XHRcImdhbnR0XCIsXHJcblx0XHRcdFx0XCJmb3JlY2FzdFwiLFxyXG5cdFx0XHRcdFwidGFibGVcIixcclxuXHRcdFx0XHRcInF1YWRyYW50XCIsXHJcblx0XHRcdF0uaW5jbHVkZXModmlld0lkKVxyXG5cdFx0KSB7XHJcblx0XHRcdHZpZXdUeXBlID0gdmlld0lkO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICghdmlld1R5cGUpIHtcclxuXHRcdFx0cmV0dXJuIG51bGw7IC8vIOS4jeaYr+eJueauiuinhuWbvuexu+Wei1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIOWIm+W7uuaWsOe7hOS7tlxyXG5cdFx0Y29uc3QgY29tcG9uZW50ID0gVmlld0NvbXBvbmVudEZhY3RvcnkuY3JlYXRlQ29tcG9uZW50KFxyXG5cdFx0XHR2aWV3VHlwZSxcclxuXHRcdFx0dmlld0lkLFxyXG5cdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdHRoaXMucGFyZW50RWwsXHJcblx0XHRcdHRoaXMuaGFuZGxlcnMsXHJcblx0XHQpO1xyXG5cclxuXHRcdGlmIChjb21wb25lbnQpIHtcclxuXHRcdFx0Ly8g5re75Yqg5Yiw54i257uE5Lu2566h55CGXHJcblx0XHRcdGlmIChjb21wb25lbnQgaW5zdGFuY2VvZiBDb21wb25lbnQpIHtcclxuXHRcdFx0XHR0aGlzLnBhcmVudENvbXBvbmVudC5hZGRDaGlsZChjb21wb25lbnQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyDliJ3lp4vljJbnu4Tku7ZcclxuXHRcdFx0aWYgKGNvbXBvbmVudC5sb2FkKSB7XHJcblx0XHRcdFx0Y29tcG9uZW50LmxvYWQoKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8g6buY6K6k6ZqQ6JePXHJcblx0XHRcdGNvbXBvbmVudC5jb250YWluZXJFbC5oaWRlKCk7XHJcblxyXG5cdFx0XHQvLyDnvJPlrZjnu4Tku7ZcclxuXHRcdFx0dGhpcy5jb21wb25lbnRzLnNldCh2aWV3SWQsIGNvbXBvbmVudCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGNvbXBvbmVudDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIOmakOiXj+aJgOaciee7hOS7tlxyXG5cdCAqL1xyXG5cdGhpZGVBbGxDb21wb25lbnRzKCk6IHZvaWQge1xyXG5cdFx0dGhpcy5jb21wb25lbnRzLmZvckVhY2goKGNvbXBvbmVudCkgPT4ge1xyXG5cdFx0XHRjb21wb25lbnQuY29udGFpbmVyRWwuaGlkZSgpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiDmmL7npLrmjIflrprop4blm77nmoTnu4Tku7ZcclxuXHQgKi9cclxuXHRzaG93Q29tcG9uZW50KHZpZXdJZDogc3RyaW5nKTogVmlld0NvbXBvbmVudEludGVyZmFjZSB8IG51bGwge1xyXG5cdFx0Y29uc3QgY29tcG9uZW50ID0gdGhpcy5nZXRPckNyZWF0ZUNvbXBvbmVudCh2aWV3SWQpO1xyXG5cdFx0aWYgKGNvbXBvbmVudCkge1xyXG5cdFx0XHRjb21wb25lbnQuY29udGFpbmVyRWwuc2hvdygpO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIGNvbXBvbmVudDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIOajgOafpeaYr+WQpuS4uueJueauiuinhuWbvlxyXG5cdCAqL1xyXG5cdGlzU3BlY2lhbFZpZXcodmlld0lkOiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHRcdGNvbnN0IHZpZXdDb25maWcgPSBnZXRWaWV3U2V0dGluZ09yRGVmYXVsdCh0aGlzLnBsdWdpbiwgdmlld0lkKTtcclxuXHRcdGNvbnN0IHNwZWNpZmljVmlld1R5cGUgPSB2aWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnPy52aWV3VHlwZTtcclxuXHJcblx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XCJpc1NwZWNpYWxWaWV3XCIsXHJcblx0XHRcdHZpZXdJZCxcclxuXHRcdFx0c3BlY2lmaWNWaWV3VHlwZSxcclxuXHRcdFx0W1wiY2FsZW5kYXJcIiwgXCJrYW5iYW5cIiwgXCJnYW50dFwiLCBcImZvcmVjYXN0XCIsIFwidGFibGVcIl0uaW5jbHVkZXMoXHJcblx0XHRcdFx0dmlld0lkLFxyXG5cdFx0XHQpLFxyXG5cdFx0KTtcclxuXHJcblx0XHRyZXR1cm4gISEoXHJcblx0XHRcdHNwZWNpZmljVmlld1R5cGUgfHxcclxuXHRcdFx0W1wiY2FsZW5kYXJcIiwgXCJrYW5iYW5cIiwgXCJnYW50dFwiLCBcImZvcmVjYXN0XCIsIFwidGFibGVcIl0uaW5jbHVkZXMoXHJcblx0XHRcdFx0dmlld0lkLFxyXG5cdFx0XHQpXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICog5riF55CG5omA5pyJ57uE5Lu2XHJcblx0ICovXHJcblx0Y2xlYW51cCgpOiB2b2lkIHtcclxuXHRcdHRoaXMuY29tcG9uZW50cy5mb3JFYWNoKChjb21wb25lbnQpID0+IHtcclxuXHRcdFx0aWYgKGNvbXBvbmVudCBpbnN0YW5jZW9mIENvbXBvbmVudCkge1xyXG5cdFx0XHRcdHRoaXMucGFyZW50Q29tcG9uZW50LnJlbW92ZUNoaWxkKGNvbXBvbmVudCk7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKGNvbXBvbmVudC51bmxvYWQpIHtcclxuXHRcdFx0XHRjb21wb25lbnQudW5sb2FkKCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdFx0dGhpcy5jb21wb25lbnRzLmNsZWFyKCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiDojrflj5bmiYDmnInnu4Tku7bnmoTov63ku6PlmajvvIjnlKjkuo7mibnph4/mk43kvZzvvIlcclxuXHQgKi9cclxuXHRnZXRBbGxDb21wb25lbnRzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8W3N0cmluZywgVmlld0NvbXBvbmVudEludGVyZmFjZV0+IHtcclxuXHRcdHJldHVybiB0aGlzLmNvbXBvbmVudHMuZW50cmllcygpO1xyXG5cdH1cclxuXHJcblx0b251bmxvYWQoKTogdm9pZCB7XHJcblx0XHR0aGlzLmNsZWFudXAoKTtcclxuXHR9XHJcbn1cclxuIl19