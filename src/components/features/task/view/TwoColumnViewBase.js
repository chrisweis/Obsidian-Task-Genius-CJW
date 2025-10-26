import { __awaiter } from "tslib";
import { Component, setIcon, ExtraButtonComponent, Platform, } from "obsidian";
import { TaskListRendererComponent } from "./TaskList";
import { t } from "@/translations/helper";
import { getInitialViewMode, saveViewMode } from "@/utils/ui/view-mode-utils";
import "@/styles/view.css";
/**
 * 双栏视图组件基类
 */
export class TwoColumnViewBase extends Component {
    constructor(parentEl, app, plugin, config) {
        super();
        this.parentEl = parentEl;
        this.app = app;
        this.plugin = plugin;
        this.config = config;
        // Child components
        this.taskRenderer = null;
        // State
        this.allTasks = [];
        this.filteredTasks = [];
        this.selectedItems = {
            items: [],
            tasks: [],
            isMultiSelect: false,
        };
        this.isTreeView = false;
        this.onTaskContextMenu = () => { };
        this.allTasksMap = new Map();
    }
    onload() {
        // 创建主容器
        this.containerEl = this.parentEl.createDiv({
            cls: `${this.config.classNamePrefix}-container`,
        });
        // 创建内容容器
        const contentContainer = this.containerEl.createDiv({
            cls: `${this.config.classNamePrefix}-content`,
        });
        // 左栏：创建项目列表
        this.createLeftColumn(contentContainer);
        // 右栏：创建任务列表
        this.createRightColumn(contentContainer);
        // 初始化视图模式
        this.initializeViewMode();
        // 初始化任务渲染器
        this.initializeTaskRenderer();
    }
    createLeftColumn(parentEl) {
        this.leftColumnEl = parentEl.createDiv({
            cls: `${this.config.classNamePrefix}-left-column`,
        });
        // 左栏标题区
        this.leftHeaderEl = this.leftColumnEl.createDiv({
            cls: `${this.config.classNamePrefix}-sidebar-header`,
        });
        const headerTitle = this.leftHeaderEl.createDiv({
            cls: `${this.config.classNamePrefix}-sidebar-title`,
            text: t(this.config.leftColumnTitle),
        });
        // 添加多选切换按钮
        const multiSelectBtn = this.leftHeaderEl.createDiv({
            cls: `${this.config.classNamePrefix}-multi-select-btn`,
        });
        setIcon(multiSelectBtn, "list-plus");
        multiSelectBtn.setAttribute("aria-label", t("Toggle multi-select"));
        this.registerDomEvent(multiSelectBtn, "click", () => {
            this.toggleMultiSelect();
        });
        // 移动端添加关闭按钮
        if (Platform.isPhone) {
            const closeBtn = this.leftHeaderEl.createDiv({
                cls: `${this.config.classNamePrefix}-sidebar-close`,
            });
            new ExtraButtonComponent(closeBtn).setIcon("x").onClick(() => {
                this.toggleLeftColumnVisibility(false);
            });
        }
        // 项目列表容器
        this.itemsListEl = this.leftColumnEl.createDiv({
            cls: `${this.config.classNamePrefix}-sidebar-list`,
        });
    }
    createRightColumn(parentEl) {
        this.rightColumnEl = parentEl.createDiv({
            cls: `${this.config.classNamePrefix}-right-column`,
        });
        // 任务列表标题区
        this.rightHeaderEl = this.rightColumnEl.createDiv({
            cls: `${this.config.classNamePrefix}-task-header`,
        });
        // 移动端添加侧边栏切换按钮
        if (Platform.isPhone) {
            this.rightHeaderEl.createEl("div", {
                cls: `${this.config.classNamePrefix}-sidebar-toggle`,
            }, (el) => {
                new ExtraButtonComponent(el)
                    .setIcon("sidebar")
                    .onClick(() => {
                    this.toggleLeftColumnVisibility();
                });
            });
        }
        const taskTitleEl = this.rightHeaderEl.createDiv({
            cls: `${this.config.classNamePrefix}-task-title`,
        });
        taskTitleEl.setText(t(this.config.rightColumnDefaultTitle));
        const taskCountEl = this.rightHeaderEl.createDiv({
            cls: `${this.config.classNamePrefix}-task-count`,
        });
        taskCountEl.setText(`0 ${t("tasks")}`);
        // 添加视图切换按钮
        const viewToggleBtn = this.rightHeaderEl.createDiv({
            cls: "view-toggle-btn",
        });
        setIcon(viewToggleBtn, "list");
        viewToggleBtn.setAttribute("aria-label", t("Toggle list/tree view"));
        this.registerDomEvent(viewToggleBtn, "click", () => {
            this.toggleViewMode();
        });
        // 任务列表容器
        this.taskListContainerEl = this.rightColumnEl.createDiv({
            cls: `${this.config.classNamePrefix}-task-list`,
        });
    }
    initializeTaskRenderer() {
        this.taskRenderer = new TaskListRendererComponent(this, this.taskListContainerEl, this.plugin, this.app, this.config.rendererContext);
        // 连接事件处理器
        this.taskRenderer.onTaskSelected = (task) => {
            if (this.onTaskSelected)
                this.onTaskSelected(task);
        };
        this.taskRenderer.onTaskCompleted = (task) => {
            if (this.onTaskCompleted)
                this.onTaskCompleted(task);
        };
        this.taskRenderer.onTaskUpdate = (originalTask, updatedTask) => __awaiter(this, void 0, void 0, function* () {
            if (this.onTaskUpdate) {
                yield this.onTaskUpdate(originalTask, updatedTask);
            }
        });
        this.taskRenderer.onTaskContextMenu = (event, task) => {
            if (this.onTaskContextMenu)
                this.onTaskContextMenu(event, task);
        };
    }
    setTasks(tasks) {
        this.allTasks = tasks;
        this.buildItemsIndex();
        this.renderItemsList();
        // 如果已选择项目，更新任务
        if (this.selectedItems.items.length > 0) {
            this.updateSelectedTasks();
        }
        else {
            this.cleanupRenderers();
            this.renderEmptyTaskList(t(this.config.emptyStateText));
        }
    }
    /**
     * Handle item selection
     * @param item Selected item
     * @param isCtrlPressed Whether Ctrl key is pressed (multi-select)
     */
    handleItemSelection(item, isCtrlPressed) {
        if (this.selectedItems.isMultiSelect || isCtrlPressed) {
            // Multi-select mode
            const index = this.selectedItems.items.indexOf(item);
            if (index === -1) {
                // Add selection
                this.selectedItems.items.push(item);
            }
            else {
                // Remove selection
                this.selectedItems.items.splice(index, 1);
            }
            // If no items selected and not in multi-select mode, reset view
            if (this.selectedItems.items.length === 0 &&
                !this.selectedItems.isMultiSelect) {
                this.cleanupRenderers();
                this.renderEmptyTaskList(t(this.config.emptyStateText));
                return;
            }
        }
        else {
            // Single-select mode
            this.selectedItems.items = [item];
        }
        // Update tasks based on selection
        this.updateSelectedTasks();
        // Hide sidebar after selection on mobile
        if (Platform.isPhone) {
            this.toggleLeftColumnVisibility(false);
        }
    }
    /**
     * Toggle multi-select mode
     */
    toggleMultiSelect() {
        this.selectedItems.isMultiSelect = !this.selectedItems.isMultiSelect;
        // 更新UI以反映多选模式
        if (this.selectedItems.isMultiSelect) {
            this.containerEl.classList.add("multi-select-mode");
        }
        else {
            this.containerEl.classList.remove("multi-select-mode");
            // If no items selected, reset view
            if (this.selectedItems.items.length === 0) {
                this.cleanupRenderers();
                this.renderEmptyTaskList(t(this.config.emptyStateText));
            }
        }
    }
    /**
     * Initialize view mode from saved state or global default
     */
    initializeViewMode() {
        var _a;
        // Use a default view ID for two-column views
        const viewId = this.config.classNamePrefix.replace("-", "");
        this.isTreeView = getInitialViewMode(this.app, this.plugin, viewId);
        // Update the toggle button icon to match the initial state
        const viewToggleBtn = (_a = this.rightColumnEl) === null || _a === void 0 ? void 0 : _a.querySelector(".view-toggle-btn");
        if (viewToggleBtn) {
            setIcon(viewToggleBtn, this.isTreeView ? "git-branch" : "list");
        }
    }
    /**
     * Toggle view mode (list/tree)
     */
    toggleViewMode() {
        this.isTreeView = !this.isTreeView;
        // Update toggle button icon
        const viewToggleBtn = this.rightColumnEl.querySelector(".view-toggle-btn");
        if (viewToggleBtn) {
            setIcon(viewToggleBtn, this.isTreeView ? "git-branch" : "list");
        }
        // Save the new view mode state
        const viewId = this.config.classNamePrefix.replace("-", "");
        saveViewMode(this.app, viewId, this.isTreeView);
        // 使用新模式重新渲染任务列表
        this.renderTaskList();
    }
    /**
     * Update task list header
     */
    updateTaskListHeader(title, countText) {
        const taskHeaderEl = this.rightColumnEl.querySelector(`.${this.config.classNamePrefix}-task-title`);
        if (taskHeaderEl) {
            taskHeaderEl.textContent = title;
        }
        const taskCountEl = this.rightColumnEl.querySelector(`.${this.config.classNamePrefix}-task-count`);
        if (taskCountEl) {
            taskCountEl.textContent = countText;
        }
    }
    /**
     * Clean up renderers
     */
    cleanupRenderers() {
        if (this.taskRenderer) {
            // Simple reset instead of full deletion to reuse
            this.taskListContainerEl.empty();
        }
    }
    /**
     * Render task list
     */
    renderTaskList() {
        // Update title
        let title = t(this.config.rightColumnDefaultTitle);
        if (this.selectedItems.items.length === 1) {
            title = String(this.selectedItems.items[0]);
        }
        else if (this.selectedItems.items.length > 1) {
            title = `${this.selectedItems.items.length} ${t(this.config.multiSelectText)}`;
        }
        const countText = `${this.filteredTasks.length} ${t("tasks")}`;
        this.updateTaskListHeader(title, countText);
        console.log("filteredTasks", this.filteredTasks, this.isTreeView);
        this.allTasksMap = new Map(this.allTasks.map((task) => [task.id, task]));
        // Use renderer to display tasks
        if (this.taskRenderer) {
            this.taskRenderer.renderTasks(this.filteredTasks, this.isTreeView, this.allTasksMap, t("No tasks in the selected items"));
        }
    }
    /**
     * 渲染空任务列表
     */
    renderEmptyTaskList(message) {
        this.cleanupRenderers();
        this.taskListContainerEl.empty();
        // 显示消息
        const emptyEl = this.taskListContainerEl.createDiv({
            cls: `${this.config.classNamePrefix}-empty-state`,
        });
        emptyEl.setText(message);
    }
    onunload() {
        this.containerEl.empty();
        this.containerEl.remove();
    }
    /**
     * 切换左侧栏可见性（支持动画）
     */
    toggleLeftColumnVisibility(visible) {
        if (visible === undefined) {
            // 根据当前状态切换
            visible = !this.leftColumnEl.hasClass("is-visible");
        }
        if (visible) {
            this.leftColumnEl.addClass("is-visible");
            this.leftColumnEl.show();
        }
        else {
            this.leftColumnEl.removeClass("is-visible");
            // 等待动画完成后隐藏
            setTimeout(() => {
                if (!this.leftColumnEl.hasClass("is-visible")) {
                    this.leftColumnEl.hide();
                }
            }, 300); // 匹配CSS过渡持续时间
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHdvQ29sdW1uVmlld0Jhc2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJUd29Db2x1bW5WaWV3QmFzZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUVOLFNBQVMsRUFDVCxPQUFPLEVBQ1Asb0JBQW9CLEVBQ3BCLFFBQVEsR0FDUixNQUFNLFVBQVUsQ0FBQztBQUVsQixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDdkQsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRTFDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxZQUFZLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUM5RSxPQUFPLG1CQUFtQixDQUFDO0FBK0IzQjs7R0FFRztBQUNILE1BQU0sT0FBZ0IsaUJBQW9DLFNBQVEsU0FBUztJQWtDMUUsWUFDVyxRQUFxQixFQUNyQixHQUFRLEVBQ1IsTUFBNkIsRUFDN0IsTUFBMkI7UUFFckMsS0FBSyxFQUFFLENBQUM7UUFMRSxhQUFRLEdBQVIsUUFBUSxDQUFhO1FBQ3JCLFFBQUcsR0FBSCxHQUFHLENBQUs7UUFDUixXQUFNLEdBQU4sTUFBTSxDQUF1QjtRQUM3QixXQUFNLEdBQU4sTUFBTSxDQUFxQjtRQTFCdEMsbUJBQW1CO1FBQ1QsaUJBQVksR0FBcUMsSUFBSSxDQUFDO1FBRWhFLFFBQVE7UUFDRSxhQUFRLEdBQVcsRUFBRSxDQUFDO1FBQ3RCLGtCQUFhLEdBQVcsRUFBRSxDQUFDO1FBQzNCLGtCQUFhLEdBQXFCO1lBQzNDLEtBQUssRUFBRSxFQUFFO1lBQ1QsS0FBSyxFQUFFLEVBQUU7WUFDVCxhQUFhLEVBQUUsS0FBSztTQUNwQixDQUFDO1FBQ1EsZUFBVSxHQUFZLEtBQUssQ0FBQztRQU0vQixzQkFBaUIsR0FDdkIsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDO1FBRUEsZ0JBQVcsR0FBc0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztJQVNyRCxDQUFDO0lBRUQsTUFBTTtR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QztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcclxuXHRBcHAsXHJcblx0Q29tcG9uZW50LFxyXG5cdHNldEljb24sXHJcblx0RXh0cmFCdXR0b25Db21wb25lbnQsXHJcblx0UGxhdGZvcm0sXHJcbn0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiQC90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7IFRhc2tMaXN0UmVuZGVyZXJDb21wb25lbnQgfSBmcm9tIFwiLi9UYXNrTGlzdFwiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7IGdldEluaXRpYWxWaWV3TW9kZSwgc2F2ZVZpZXdNb2RlIH0gZnJvbSBcIkAvdXRpbHMvdWkvdmlldy1tb2RlLXV0aWxzXCI7XHJcbmltcG9ydCBcIkAvc3R5bGVzL3ZpZXcuY3NzXCI7XHJcblxyXG4vKipcclxuICog5Y+M5qCP57uE5Lu255qE5Z+656GA5o6l5Y+j6YWN572uXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIFR3b0NvbHVtblZpZXdDb25maWcge1xyXG5cdC8vIOWPjOagj+inhuWbvueahOWFg+e0oOexu+WQjeWJjee8gFxyXG5cdGNsYXNzTmFtZVByZWZpeDogc3RyaW5nO1xyXG5cdC8vIOW3puS+p+agj+eahOagh+mimFxyXG5cdGxlZnRDb2x1bW5UaXRsZTogc3RyaW5nO1xyXG5cdC8vIOWPs+S+p+agj+m7mOiupOagh+mimFxyXG5cdHJpZ2h0Q29sdW1uRGVmYXVsdFRpdGxlOiBzdHJpbmc7XHJcblx0Ly8g5aSa6YCJ5qih5byP55qE5paH5pysXHJcblx0bXVsdGlTZWxlY3RUZXh0OiBzdHJpbmc7XHJcblx0Ly8g56m654q25oCB5pi+56S65paH5pysXHJcblx0ZW1wdHlTdGF0ZVRleHQ6IHN0cmluZztcclxuXHQvLyDku7vliqHmmL7npLrljLrnmoTkuIrkuIvmlofvvIjnlKjkuo7kvKDnu5lUYXNrTGlzdFJlbmRlcmVyQ29tcG9uZW5077yJXHJcblx0cmVuZGVyZXJDb250ZXh0OiBzdHJpbmc7XHJcblx0Ly8g6aG555uu5Zu+5qCHXHJcblx0aXRlbUljb246IHN0cmluZztcclxufVxyXG5cclxuLyoqXHJcbiAqIOmAieS4remhueeKtuaAgeaOpeWPo1xyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBTZWxlY3RlZEl0ZW1zPFQ+IHtcclxuXHRpdGVtczogVFtdOyAvLyDpgInkuK3nmoTpobnvvIjmoIfnrb7miJbpobnnm67vvIlcclxuXHR0YXNrczogVGFza1tdOyAvLyDnm7jlhbPogZTnmoTku7vliqFcclxuXHRpc011bHRpU2VsZWN0OiBib29sZWFuOyAvLyDmmK/lkKblpITkuo7lpJrpgInmqKHlvI9cclxufVxyXG5cclxuLyoqXHJcbiAqIOWPjOagj+inhuWbvue7hOS7tuWfuuexu1xyXG4gKi9cclxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFR3b0NvbHVtblZpZXdCYXNlPFQgZXh0ZW5kcyBzdHJpbmc+IGV4dGVuZHMgQ29tcG9uZW50IHtcclxuXHQvLyBVSSBFbGVtZW50c1xyXG5cdHB1YmxpYyBjb250YWluZXJFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJvdGVjdGVkIGxlZnRDb2x1bW5FbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJvdGVjdGVkIHJpZ2h0Q29sdW1uRWw6IEhUTUxFbGVtZW50O1xyXG5cdHByb3RlY3RlZCB0aXRsZUVsOiBIVE1MRWxlbWVudDtcclxuXHRwcm90ZWN0ZWQgY291bnRFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJvdGVjdGVkIGxlZnRIZWFkZXJFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJvdGVjdGVkIGl0ZW1zTGlzdEVsOiBIVE1MRWxlbWVudDtcclxuXHRwcm90ZWN0ZWQgcmlnaHRIZWFkZXJFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJvdGVjdGVkIHRhc2tMaXN0Q29udGFpbmVyRWw6IEhUTUxFbGVtZW50O1xyXG5cclxuXHQvLyBDaGlsZCBjb21wb25lbnRzXHJcblx0cHJvdGVjdGVkIHRhc2tSZW5kZXJlcjogVGFza0xpc3RSZW5kZXJlckNvbXBvbmVudCB8IG51bGwgPSBudWxsO1xyXG5cclxuXHQvLyBTdGF0ZVxyXG5cdHByb3RlY3RlZCBhbGxUYXNrczogVGFza1tdID0gW107XHJcblx0cHJvdGVjdGVkIGZpbHRlcmVkVGFza3M6IFRhc2tbXSA9IFtdO1xyXG5cdHByb3RlY3RlZCBzZWxlY3RlZEl0ZW1zOiBTZWxlY3RlZEl0ZW1zPFQ+ID0ge1xyXG5cdFx0aXRlbXM6IFtdLFxyXG5cdFx0dGFza3M6IFtdLFxyXG5cdFx0aXNNdWx0aVNlbGVjdDogZmFsc2UsXHJcblx0fTtcclxuXHRwcm90ZWN0ZWQgaXNUcmVlVmlldzogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuXHQvLyBFdmVudHNcclxuXHRwdWJsaWMgb25UYXNrU2VsZWN0ZWQ6ICh0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdHB1YmxpYyBvblRhc2tDb21wbGV0ZWQ6ICh0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdHB1YmxpYyBvblRhc2tVcGRhdGU6ICh0YXNrOiBUYXNrLCB1cGRhdGVkVGFzazogVGFzaykgPT4gUHJvbWlzZTx2b2lkPjtcclxuXHRwdWJsaWMgb25UYXNrQ29udGV4dE1lbnU6IChldmVudDogTW91c2VFdmVudCwgdGFzazogVGFzaykgPT4gdm9pZCA9XHJcblx0XHQoKSA9PiB7fTtcclxuXHJcblx0cHJvdGVjdGVkIGFsbFRhc2tzTWFwOiBNYXA8c3RyaW5nLCBUYXNrPiA9IG5ldyBNYXAoKTtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwcm90ZWN0ZWQgcGFyZW50RWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0cHJvdGVjdGVkIGFwcDogQXBwLFxyXG5cdFx0cHJvdGVjdGVkIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0cHJvdGVjdGVkIGNvbmZpZzogVHdvQ29sdW1uVmlld0NvbmZpZ1xyXG5cdCkge1xyXG5cdFx0c3VwZXIoKTtcclxuXHR9XHJcblxyXG5cdG9ubG9hZCgpIHtcclxuXHRcdC8vIOWIm+W7uuS4u+WuueWZqFxyXG5cdFx0dGhpcy5jb250YWluZXJFbCA9IHRoaXMucGFyZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBgJHt0aGlzLmNvbmZpZy5jbGFzc05hbWVQcmVmaXh9LWNvbnRhaW5lcmAsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyDliJvlu7rlhoXlrrnlrrnlmahcclxuXHRcdGNvbnN0IGNvbnRlbnRDb250YWluZXIgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogYCR7dGhpcy5jb25maWcuY2xhc3NOYW1lUHJlZml4fS1jb250ZW50YCxcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIOW3puagj++8muWIm+W7uumhueebruWIl+ihqFxyXG5cdFx0dGhpcy5jcmVhdGVMZWZ0Q29sdW1uKGNvbnRlbnRDb250YWluZXIpO1xyXG5cclxuXHRcdC8vIOWPs+agj++8muWIm+W7uuS7u+WKoeWIl+ihqFxyXG5cdFx0dGhpcy5jcmVhdGVSaWdodENvbHVtbihjb250ZW50Q29udGFpbmVyKTtcclxuXHJcblx0XHQvLyDliJ3lp4vljJbop4blm77mqKHlvI9cclxuXHRcdHRoaXMuaW5pdGlhbGl6ZVZpZXdNb2RlKCk7XHJcblxyXG5cdFx0Ly8g5Yid5aeL5YyW5Lu75Yqh5riy5p+T5ZmoXHJcblx0XHR0aGlzLmluaXRpYWxpemVUYXNrUmVuZGVyZXIoKTtcclxuXHR9XHJcblxyXG5cdHByb3RlY3RlZCBjcmVhdGVMZWZ0Q29sdW1uKHBhcmVudEVsOiBIVE1MRWxlbWVudCkge1xyXG5cdFx0dGhpcy5sZWZ0Q29sdW1uRWwgPSBwYXJlbnRFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IGAke3RoaXMuY29uZmlnLmNsYXNzTmFtZVByZWZpeH0tbGVmdC1jb2x1bW5gLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8g5bem5qCP5qCH6aKY5Yy6XHJcblx0XHR0aGlzLmxlZnRIZWFkZXJFbCA9IHRoaXMubGVmdENvbHVtbkVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogYCR7dGhpcy5jb25maWcuY2xhc3NOYW1lUHJlZml4fS1zaWRlYmFyLWhlYWRlcmAsXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCBoZWFkZXJUaXRsZSA9IHRoaXMubGVmdEhlYWRlckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogYCR7dGhpcy5jb25maWcuY2xhc3NOYW1lUHJlZml4fS1zaWRlYmFyLXRpdGxlYCxcclxuXHRcdFx0dGV4dDogdCh0aGlzLmNvbmZpZy5sZWZ0Q29sdW1uVGl0bGUpLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8g5re75Yqg5aSa6YCJ5YiH5o2i5oyJ6ZKuXHJcblx0XHRjb25zdCBtdWx0aVNlbGVjdEJ0biA9IHRoaXMubGVmdEhlYWRlckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogYCR7dGhpcy5jb25maWcuY2xhc3NOYW1lUHJlZml4fS1tdWx0aS1zZWxlY3QtYnRuYCxcclxuXHRcdH0pO1xyXG5cdFx0c2V0SWNvbihtdWx0aVNlbGVjdEJ0biwgXCJsaXN0LXBsdXNcIik7XHJcblx0XHRtdWx0aVNlbGVjdEJ0bi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIHQoXCJUb2dnbGUgbXVsdGktc2VsZWN0XCIpKTtcclxuXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQobXVsdGlTZWxlY3RCdG4sIFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHR0aGlzLnRvZ2dsZU11bHRpU2VsZWN0KCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyDnp7vliqjnq6/mt7vliqDlhbPpl63mjInpkq5cclxuXHRcdGlmIChQbGF0Zm9ybS5pc1Bob25lKSB7XHJcblx0XHRcdGNvbnN0IGNsb3NlQnRuID0gdGhpcy5sZWZ0SGVhZGVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IGAke3RoaXMuY29uZmlnLmNsYXNzTmFtZVByZWZpeH0tc2lkZWJhci1jbG9zZWAsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0bmV3IEV4dHJhQnV0dG9uQ29tcG9uZW50KGNsb3NlQnRuKS5zZXRJY29uKFwieFwiKS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHR0aGlzLnRvZ2dsZUxlZnRDb2x1bW5WaXNpYmlsaXR5KGZhbHNlKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8g6aG555uu5YiX6KGo5a655ZmoXHJcblx0XHR0aGlzLml0ZW1zTGlzdEVsID0gdGhpcy5sZWZ0Q29sdW1uRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBgJHt0aGlzLmNvbmZpZy5jbGFzc05hbWVQcmVmaXh9LXNpZGViYXItbGlzdGAsXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByb3RlY3RlZCBjcmVhdGVSaWdodENvbHVtbihwYXJlbnRFbDogSFRNTEVsZW1lbnQpIHtcclxuXHRcdHRoaXMucmlnaHRDb2x1bW5FbCA9IHBhcmVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogYCR7dGhpcy5jb25maWcuY2xhc3NOYW1lUHJlZml4fS1yaWdodC1jb2x1bW5gLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8g5Lu75Yqh5YiX6KGo5qCH6aKY5Yy6XHJcblx0XHR0aGlzLnJpZ2h0SGVhZGVyRWwgPSB0aGlzLnJpZ2h0Q29sdW1uRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBgJHt0aGlzLmNvbmZpZy5jbGFzc05hbWVQcmVmaXh9LXRhc2staGVhZGVyYCxcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIOenu+WKqOerr+a3u+WKoOS+p+i+ueagj+WIh+aNouaMiemSrlxyXG5cdFx0aWYgKFBsYXRmb3JtLmlzUGhvbmUpIHtcclxuXHRcdFx0dGhpcy5yaWdodEhlYWRlckVsLmNyZWF0ZUVsKFxyXG5cdFx0XHRcdFwiZGl2XCIsXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0Y2xzOiBgJHt0aGlzLmNvbmZpZy5jbGFzc05hbWVQcmVmaXh9LXNpZGViYXItdG9nZ2xlYCxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdChlbCkgPT4ge1xyXG5cdFx0XHRcdFx0bmV3IEV4dHJhQnV0dG9uQ29tcG9uZW50KGVsKVxyXG5cdFx0XHRcdFx0XHQuc2V0SWNvbihcInNpZGViYXJcIilcclxuXHRcdFx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMudG9nZ2xlTGVmdENvbHVtblZpc2liaWxpdHkoKTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHRhc2tUaXRsZUVsID0gdGhpcy5yaWdodEhlYWRlckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogYCR7dGhpcy5jb25maWcuY2xhc3NOYW1lUHJlZml4fS10YXNrLXRpdGxlYCxcclxuXHRcdH0pO1xyXG5cdFx0dGFza1RpdGxlRWwuc2V0VGV4dCh0KHRoaXMuY29uZmlnLnJpZ2h0Q29sdW1uRGVmYXVsdFRpdGxlKSk7XHJcblxyXG5cdFx0Y29uc3QgdGFza0NvdW50RWwgPSB0aGlzLnJpZ2h0SGVhZGVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBgJHt0aGlzLmNvbmZpZy5jbGFzc05hbWVQcmVmaXh9LXRhc2stY291bnRgLFxyXG5cdFx0fSk7XHJcblx0XHR0YXNrQ291bnRFbC5zZXRUZXh0KGAwICR7dChcInRhc2tzXCIpfWApO1xyXG5cclxuXHRcdC8vIOa3u+WKoOinhuWbvuWIh+aNouaMiemSrlxyXG5cdFx0Y29uc3Qgdmlld1RvZ2dsZUJ0biA9IHRoaXMucmlnaHRIZWFkZXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwidmlldy10b2dnbGUtYnRuXCIsXHJcblx0XHR9KTtcclxuXHRcdHNldEljb24odmlld1RvZ2dsZUJ0biwgXCJsaXN0XCIpO1xyXG5cdFx0dmlld1RvZ2dsZUJ0bi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIHQoXCJUb2dnbGUgbGlzdC90cmVlIHZpZXdcIikpO1xyXG5cclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudCh2aWV3VG9nZ2xlQnRuLCBcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0dGhpcy50b2dnbGVWaWV3TW9kZSgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8g5Lu75Yqh5YiX6KGo5a655ZmoXHJcblx0XHR0aGlzLnRhc2tMaXN0Q29udGFpbmVyRWwgPSB0aGlzLnJpZ2h0Q29sdW1uRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBgJHt0aGlzLmNvbmZpZy5jbGFzc05hbWVQcmVmaXh9LXRhc2stbGlzdGAsXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByb3RlY3RlZCBpbml0aWFsaXplVGFza1JlbmRlcmVyKCkge1xyXG5cdFx0dGhpcy50YXNrUmVuZGVyZXIgPSBuZXcgVGFza0xpc3RSZW5kZXJlckNvbXBvbmVudChcclxuXHRcdFx0dGhpcyxcclxuXHRcdFx0dGhpcy50YXNrTGlzdENvbnRhaW5lckVsLFxyXG5cdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdHRoaXMuY29uZmlnLnJlbmRlcmVyQ29udGV4dFxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyDov57mjqXkuovku7blpITnkIblmahcclxuXHRcdHRoaXMudGFza1JlbmRlcmVyLm9uVGFza1NlbGVjdGVkID0gKHRhc2spID0+IHtcclxuXHRcdFx0aWYgKHRoaXMub25UYXNrU2VsZWN0ZWQpIHRoaXMub25UYXNrU2VsZWN0ZWQodGFzayk7XHJcblx0XHR9O1xyXG5cdFx0dGhpcy50YXNrUmVuZGVyZXIub25UYXNrQ29tcGxldGVkID0gKHRhc2spID0+IHtcclxuXHRcdFx0aWYgKHRoaXMub25UYXNrQ29tcGxldGVkKSB0aGlzLm9uVGFza0NvbXBsZXRlZCh0YXNrKTtcclxuXHRcdH07XHJcblx0XHR0aGlzLnRhc2tSZW5kZXJlci5vblRhc2tVcGRhdGUgPSBhc3luYyAob3JpZ2luYWxUYXNrLCB1cGRhdGVkVGFzaykgPT4ge1xyXG5cdFx0XHRpZiAodGhpcy5vblRhc2tVcGRhdGUpIHtcclxuXHRcdFx0XHRhd2FpdCB0aGlzLm9uVGFza1VwZGF0ZShvcmlnaW5hbFRhc2ssIHVwZGF0ZWRUYXNrKTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHRcdHRoaXMudGFza1JlbmRlcmVyLm9uVGFza0NvbnRleHRNZW51ID0gKGV2ZW50LCB0YXNrKSA9PiB7XHJcblx0XHRcdGlmICh0aGlzLm9uVGFza0NvbnRleHRNZW51KSB0aGlzLm9uVGFza0NvbnRleHRNZW51KGV2ZW50LCB0YXNrKTtcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgc2V0VGFza3ModGFza3M6IFRhc2tbXSkge1xyXG5cdFx0dGhpcy5hbGxUYXNrcyA9IHRhc2tzO1xyXG5cdFx0dGhpcy5idWlsZEl0ZW1zSW5kZXgoKTtcclxuXHRcdHRoaXMucmVuZGVySXRlbXNMaXN0KCk7XHJcblxyXG5cdFx0Ly8g5aaC5p6c5bey6YCJ5oup6aG555uu77yM5pu05paw5Lu75YqhXHJcblx0XHRpZiAodGhpcy5zZWxlY3RlZEl0ZW1zLml0ZW1zLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0dGhpcy51cGRhdGVTZWxlY3RlZFRhc2tzKCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLmNsZWFudXBSZW5kZXJlcnMoKTtcclxuXHRcdFx0dGhpcy5yZW5kZXJFbXB0eVRhc2tMaXN0KHQodGhpcy5jb25maWcuZW1wdHlTdGF0ZVRleHQpKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIOaehOW7uumhueebrue0ouW8lVxyXG5cdCAqIOWtkOexu+mcgOimgeWunueOsOi/meS4quaWueazleS7peWfuuS6juW9k+WJjeS7u+WKoeaehOW7uuiHquW3seeahOe0ouW8lVxyXG5cdCAqL1xyXG5cdHByb3RlY3RlZCBhYnN0cmFjdCBidWlsZEl0ZW1zSW5kZXgoKTogdm9pZDtcclxuXHJcblx0LyoqXHJcblx0ICog5riy5p+T5bem5L6n5qCP6aG555uu5YiX6KGoXHJcblx0ICog5a2Q57G76ZyA6KaB5a6e546w6L+Z5Liq5pa55rOV5Lul5riy5p+T6Ieq5bex55qE5p2h55uuXHJcblx0ICovXHJcblx0cHJvdGVjdGVkIGFic3RyYWN0IHJlbmRlckl0ZW1zTGlzdCgpOiB2b2lkO1xyXG5cclxuXHQvKipcclxuXHQgKiBIYW5kbGUgaXRlbSBzZWxlY3Rpb25cclxuXHQgKiBAcGFyYW0gaXRlbSBTZWxlY3RlZCBpdGVtXHJcblx0ICogQHBhcmFtIGlzQ3RybFByZXNzZWQgV2hldGhlciBDdHJsIGtleSBpcyBwcmVzc2VkIChtdWx0aS1zZWxlY3QpXHJcblx0ICovXHJcblx0cHJvdGVjdGVkIGhhbmRsZUl0ZW1TZWxlY3Rpb24oaXRlbTogVCwgaXNDdHJsUHJlc3NlZDogYm9vbGVhbikge1xyXG5cdFx0aWYgKHRoaXMuc2VsZWN0ZWRJdGVtcy5pc011bHRpU2VsZWN0IHx8IGlzQ3RybFByZXNzZWQpIHtcclxuXHRcdFx0Ly8gTXVsdGktc2VsZWN0IG1vZGVcclxuXHRcdFx0Y29uc3QgaW5kZXggPSB0aGlzLnNlbGVjdGVkSXRlbXMuaXRlbXMuaW5kZXhPZihpdGVtKTtcclxuXHRcdFx0aWYgKGluZGV4ID09PSAtMSkge1xyXG5cdFx0XHRcdC8vIEFkZCBzZWxlY3Rpb25cclxuXHRcdFx0XHR0aGlzLnNlbGVjdGVkSXRlbXMuaXRlbXMucHVzaChpdGVtKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBSZW1vdmUgc2VsZWN0aW9uXHJcblx0XHRcdFx0dGhpcy5zZWxlY3RlZEl0ZW1zLml0ZW1zLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIElmIG5vIGl0ZW1zIHNlbGVjdGVkIGFuZCBub3QgaW4gbXVsdGktc2VsZWN0IG1vZGUsIHJlc2V0IHZpZXdcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHRoaXMuc2VsZWN0ZWRJdGVtcy5pdGVtcy5sZW5ndGggPT09IDAgJiZcclxuXHRcdFx0XHQhdGhpcy5zZWxlY3RlZEl0ZW1zLmlzTXVsdGlTZWxlY3RcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0dGhpcy5jbGVhbnVwUmVuZGVyZXJzKCk7XHJcblx0XHRcdFx0dGhpcy5yZW5kZXJFbXB0eVRhc2tMaXN0KHQodGhpcy5jb25maWcuZW1wdHlTdGF0ZVRleHQpKTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIFNpbmdsZS1zZWxlY3QgbW9kZVxyXG5cdFx0XHR0aGlzLnNlbGVjdGVkSXRlbXMuaXRlbXMgPSBbaXRlbV07XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHRhc2tzIGJhc2VkIG9uIHNlbGVjdGlvblxyXG5cdFx0dGhpcy51cGRhdGVTZWxlY3RlZFRhc2tzKCk7XHJcblxyXG5cdFx0Ly8gSGlkZSBzaWRlYmFyIGFmdGVyIHNlbGVjdGlvbiBvbiBtb2JpbGVcclxuXHRcdGlmIChQbGF0Zm9ybS5pc1Bob25lKSB7XHJcblx0XHRcdHRoaXMudG9nZ2xlTGVmdENvbHVtblZpc2liaWxpdHkoZmFsc2UpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVG9nZ2xlIG11bHRpLXNlbGVjdCBtb2RlXHJcblx0ICovXHJcblx0cHJvdGVjdGVkIHRvZ2dsZU11bHRpU2VsZWN0KCkge1xyXG5cdFx0dGhpcy5zZWxlY3RlZEl0ZW1zLmlzTXVsdGlTZWxlY3QgPSAhdGhpcy5zZWxlY3RlZEl0ZW1zLmlzTXVsdGlTZWxlY3Q7XHJcblxyXG5cdFx0Ly8g5pu05pawVUnku6Xlj43mmKDlpJrpgInmqKHlvI9cclxuXHRcdGlmICh0aGlzLnNlbGVjdGVkSXRlbXMuaXNNdWx0aVNlbGVjdCkge1xyXG5cdFx0XHR0aGlzLmNvbnRhaW5lckVsLmNsYXNzTGlzdC5hZGQoXCJtdWx0aS1zZWxlY3QtbW9kZVwiKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMuY29udGFpbmVyRWwuY2xhc3NMaXN0LnJlbW92ZShcIm11bHRpLXNlbGVjdC1tb2RlXCIpO1xyXG5cclxuXHRcdFx0Ly8gSWYgbm8gaXRlbXMgc2VsZWN0ZWQsIHJlc2V0IHZpZXdcclxuXHRcdFx0aWYgKHRoaXMuc2VsZWN0ZWRJdGVtcy5pdGVtcy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0XHR0aGlzLmNsZWFudXBSZW5kZXJlcnMoKTtcclxuXHRcdFx0XHR0aGlzLnJlbmRlckVtcHR5VGFza0xpc3QodCh0aGlzLmNvbmZpZy5lbXB0eVN0YXRlVGV4dCkpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBJbml0aWFsaXplIHZpZXcgbW9kZSBmcm9tIHNhdmVkIHN0YXRlIG9yIGdsb2JhbCBkZWZhdWx0XHJcblx0ICovXHJcblx0cHJvdGVjdGVkIGluaXRpYWxpemVWaWV3TW9kZSgpIHtcclxuXHRcdC8vIFVzZSBhIGRlZmF1bHQgdmlldyBJRCBmb3IgdHdvLWNvbHVtbiB2aWV3c1xyXG5cdFx0Y29uc3Qgdmlld0lkID0gdGhpcy5jb25maWcuY2xhc3NOYW1lUHJlZml4LnJlcGxhY2UoXCItXCIsIFwiXCIpO1xyXG5cdFx0dGhpcy5pc1RyZWVWaWV3ID0gZ2V0SW5pdGlhbFZpZXdNb2RlKHRoaXMuYXBwLCB0aGlzLnBsdWdpbiwgdmlld0lkKTtcclxuXHJcblx0XHQvLyBVcGRhdGUgdGhlIHRvZ2dsZSBidXR0b24gaWNvbiB0byBtYXRjaCB0aGUgaW5pdGlhbCBzdGF0ZVxyXG5cdFx0Y29uc3Qgdmlld1RvZ2dsZUJ0biA9IHRoaXMucmlnaHRDb2x1bW5FbD8ucXVlcnlTZWxlY3RvcihcclxuXHRcdFx0XCIudmlldy10b2dnbGUtYnRuXCJcclxuXHRcdCkgYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRpZiAodmlld1RvZ2dsZUJ0bikge1xyXG5cdFx0XHRzZXRJY29uKHZpZXdUb2dnbGVCdG4sIHRoaXMuaXNUcmVlVmlldyA/IFwiZ2l0LWJyYW5jaFwiIDogXCJsaXN0XCIpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVG9nZ2xlIHZpZXcgbW9kZSAobGlzdC90cmVlKVxyXG5cdCAqL1xyXG5cdHByb3RlY3RlZCB0b2dnbGVWaWV3TW9kZSgpIHtcclxuXHRcdHRoaXMuaXNUcmVlVmlldyA9ICF0aGlzLmlzVHJlZVZpZXc7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHRvZ2dsZSBidXR0b24gaWNvblxyXG5cdFx0Y29uc3Qgdmlld1RvZ2dsZUJ0biA9IHRoaXMucmlnaHRDb2x1bW5FbC5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRcIi52aWV3LXRvZ2dsZS1idG5cIlxyXG5cdFx0KSBhcyBIVE1MRWxlbWVudDtcclxuXHRcdGlmICh2aWV3VG9nZ2xlQnRuKSB7XHJcblx0XHRcdHNldEljb24odmlld1RvZ2dsZUJ0biwgdGhpcy5pc1RyZWVWaWV3ID8gXCJnaXQtYnJhbmNoXCIgOiBcImxpc3RcIik7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU2F2ZSB0aGUgbmV3IHZpZXcgbW9kZSBzdGF0ZVxyXG5cdFx0Y29uc3Qgdmlld0lkID0gdGhpcy5jb25maWcuY2xhc3NOYW1lUHJlZml4LnJlcGxhY2UoXCItXCIsIFwiXCIpO1xyXG5cdFx0c2F2ZVZpZXdNb2RlKHRoaXMuYXBwLCB2aWV3SWQsIHRoaXMuaXNUcmVlVmlldyk7XHJcblxyXG5cdFx0Ly8g5L2/55So5paw5qih5byP6YeN5paw5riy5p+T5Lu75Yqh5YiX6KGoXHJcblx0XHR0aGlzLnJlbmRlclRhc2tMaXN0KCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgdGFza3MgcmVsYXRlZCB0byBzZWxlY3RlZCBpdGVtc1xyXG5cdCAqIFN1YmNsYXNzZXMgbmVlZCB0byBpbXBsZW1lbnQgdGhpcyBtZXRob2QgdG8gZmlsdGVyIHRhc2tzIGJhc2VkIG9uIHNlbGVjdGVkIGl0ZW1zXHJcblx0ICovXHJcblx0cHJvdGVjdGVkIGFic3RyYWN0IHVwZGF0ZVNlbGVjdGVkVGFza3MoKTogdm9pZDtcclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIHRhc2sgbGlzdCBoZWFkZXJcclxuXHQgKi9cclxuXHRwcm90ZWN0ZWQgdXBkYXRlVGFza0xpc3RIZWFkZXIodGl0bGU6IHN0cmluZywgY291bnRUZXh0OiBzdHJpbmcpIHtcclxuXHRcdGNvbnN0IHRhc2tIZWFkZXJFbCA9IHRoaXMucmlnaHRDb2x1bW5FbC5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRgLiR7dGhpcy5jb25maWcuY2xhc3NOYW1lUHJlZml4fS10YXNrLXRpdGxlYFxyXG5cdFx0KTtcclxuXHRcdGlmICh0YXNrSGVhZGVyRWwpIHtcclxuXHRcdFx0dGFza0hlYWRlckVsLnRleHRDb250ZW50ID0gdGl0bGU7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgdGFza0NvdW50RWwgPSB0aGlzLnJpZ2h0Q29sdW1uRWwucXVlcnlTZWxlY3RvcihcclxuXHRcdFx0YC4ke3RoaXMuY29uZmlnLmNsYXNzTmFtZVByZWZpeH0tdGFzay1jb3VudGBcclxuXHRcdCk7XHJcblx0XHRpZiAodGFza0NvdW50RWwpIHtcclxuXHRcdFx0dGFza0NvdW50RWwudGV4dENvbnRlbnQgPSBjb3VudFRleHQ7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDbGVhbiB1cCByZW5kZXJlcnNcclxuXHQgKi9cclxuXHRwcm90ZWN0ZWQgY2xlYW51cFJlbmRlcmVycygpIHtcclxuXHRcdGlmICh0aGlzLnRhc2tSZW5kZXJlcikge1xyXG5cdFx0XHQvLyBTaW1wbGUgcmVzZXQgaW5zdGVhZCBvZiBmdWxsIGRlbGV0aW9uIHRvIHJldXNlXHJcblx0XHRcdHRoaXMudGFza0xpc3RDb250YWluZXJFbC5lbXB0eSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVuZGVyIHRhc2sgbGlzdFxyXG5cdCAqL1xyXG5cdHByb3RlY3RlZCByZW5kZXJUYXNrTGlzdCgpIHtcclxuXHRcdC8vIFVwZGF0ZSB0aXRsZVxyXG5cdFx0bGV0IHRpdGxlID0gdCh0aGlzLmNvbmZpZy5yaWdodENvbHVtbkRlZmF1bHRUaXRsZSk7XHJcblx0XHRpZiAodGhpcy5zZWxlY3RlZEl0ZW1zLml0ZW1zLmxlbmd0aCA9PT0gMSkge1xyXG5cdFx0XHR0aXRsZSA9IFN0cmluZyh0aGlzLnNlbGVjdGVkSXRlbXMuaXRlbXNbMF0pO1xyXG5cdFx0fSBlbHNlIGlmICh0aGlzLnNlbGVjdGVkSXRlbXMuaXRlbXMubGVuZ3RoID4gMSkge1xyXG5cdFx0XHR0aXRsZSA9IGAke3RoaXMuc2VsZWN0ZWRJdGVtcy5pdGVtcy5sZW5ndGh9ICR7dChcclxuXHRcdFx0XHR0aGlzLmNvbmZpZy5tdWx0aVNlbGVjdFRleHRcclxuXHRcdFx0KX1gO1xyXG5cdFx0fVxyXG5cdFx0Y29uc3QgY291bnRUZXh0ID0gYCR7dGhpcy5maWx0ZXJlZFRhc2tzLmxlbmd0aH0gJHt0KFwidGFza3NcIil9YDtcclxuXHRcdHRoaXMudXBkYXRlVGFza0xpc3RIZWFkZXIodGl0bGUsIGNvdW50VGV4dCk7XHJcblxyXG5cdFx0Y29uc29sZS5sb2coXCJmaWx0ZXJlZFRhc2tzXCIsIHRoaXMuZmlsdGVyZWRUYXNrcywgdGhpcy5pc1RyZWVWaWV3KTtcclxuXHRcdHRoaXMuYWxsVGFza3NNYXAgPSBuZXcgTWFwKFxyXG5cdFx0XHR0aGlzLmFsbFRhc2tzLm1hcCgodGFzaykgPT4gW3Rhc2suaWQsIHRhc2tdKVxyXG5cdFx0KTtcclxuXHRcdC8vIFVzZSByZW5kZXJlciB0byBkaXNwbGF5IHRhc2tzXHJcblx0XHRpZiAodGhpcy50YXNrUmVuZGVyZXIpIHtcclxuXHRcdFx0dGhpcy50YXNrUmVuZGVyZXIucmVuZGVyVGFza3MoXHJcblx0XHRcdFx0dGhpcy5maWx0ZXJlZFRhc2tzLFxyXG5cdFx0XHRcdHRoaXMuaXNUcmVlVmlldyxcclxuXHRcdFx0XHR0aGlzLmFsbFRhc2tzTWFwLFxyXG5cdFx0XHRcdHQoXCJObyB0YXNrcyBpbiB0aGUgc2VsZWN0ZWQgaXRlbXNcIilcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIOa4suafk+epuuS7u+WKoeWIl+ihqFxyXG5cdCAqL1xyXG5cdHByb3RlY3RlZCByZW5kZXJFbXB0eVRhc2tMaXN0KG1lc3NhZ2U6IHN0cmluZykge1xyXG5cdFx0dGhpcy5jbGVhbnVwUmVuZGVyZXJzKCk7XHJcblx0XHR0aGlzLnRhc2tMaXN0Q29udGFpbmVyRWwuZW1wdHkoKTtcclxuXHJcblx0XHQvLyDmmL7npLrmtojmga9cclxuXHRcdGNvbnN0IGVtcHR5RWwgPSB0aGlzLnRhc2tMaXN0Q29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBgJHt0aGlzLmNvbmZpZy5jbGFzc05hbWVQcmVmaXh9LWVtcHR5LXN0YXRlYCxcclxuXHRcdH0pO1xyXG5cdFx0ZW1wdHlFbC5zZXRUZXh0KG1lc3NhZ2UpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICog5pu05paw5Y2V5Liq5Lu75YqhXHJcblx0ICog5a2Q57G76ZyA6KaB5aSE55CG5Lu75Yqh5pu05paw5a+55YW257Si5byV55qE5b2x5ZONXHJcblx0ICovXHJcblx0cHVibGljIGFic3RyYWN0IHVwZGF0ZVRhc2sodXBkYXRlZFRhc2s6IFRhc2spOiB2b2lkO1xyXG5cclxuXHRvbnVubG9hZCgpIHtcclxuXHRcdHRoaXMuY29udGFpbmVyRWwuZW1wdHkoKTtcclxuXHRcdHRoaXMuY29udGFpbmVyRWwucmVtb3ZlKCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiDliIfmjaLlt6bkvqfmoI/lj6/op4HmgKfvvIjmlK/mjIHliqjnlLvvvIlcclxuXHQgKi9cclxuXHRwcm90ZWN0ZWQgdG9nZ2xlTGVmdENvbHVtblZpc2liaWxpdHkodmlzaWJsZT86IGJvb2xlYW4pIHtcclxuXHRcdGlmICh2aXNpYmxlID09PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0Ly8g5qC55o2u5b2T5YmN54q25oCB5YiH5o2iXHJcblx0XHRcdHZpc2libGUgPSAhdGhpcy5sZWZ0Q29sdW1uRWwuaGFzQ2xhc3MoXCJpcy12aXNpYmxlXCIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh2aXNpYmxlKSB7XHJcblx0XHRcdHRoaXMubGVmdENvbHVtbkVsLmFkZENsYXNzKFwiaXMtdmlzaWJsZVwiKTtcclxuXHRcdFx0dGhpcy5sZWZ0Q29sdW1uRWwuc2hvdygpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy5sZWZ0Q29sdW1uRWwucmVtb3ZlQ2xhc3MoXCJpcy12aXNpYmxlXCIpO1xyXG5cclxuXHRcdFx0Ly8g562J5b6F5Yqo55S75a6M5oiQ5ZCO6ZqQ6JePXHJcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdGlmICghdGhpcy5sZWZ0Q29sdW1uRWwuaGFzQ2xhc3MoXCJpcy12aXNpYmxlXCIpKSB7XHJcblx0XHRcdFx0XHR0aGlzLmxlZnRDb2x1bW5FbC5oaWRlKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LCAzMDApOyAvLyDljLnphY1DU1Pov4fmuKHmjIHnu63ml7bpl7RcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuIl19