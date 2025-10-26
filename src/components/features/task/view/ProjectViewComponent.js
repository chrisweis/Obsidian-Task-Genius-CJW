import { setIcon } from "obsidian";
import { t } from "@/translations/helper";
import "@/styles/project-view.css";
import "@/styles/view-two-column-base.css";
import "@/styles/project-tree.css";
import { TwoColumnViewBase } from "./TwoColumnViewBase";
import { ProjectTreeComponent } from "./ProjectTreeComponent";
import { buildProjectTreeFromTasks } from "@/core/project-tree-builder";
import { filterTasksByProjectPaths } from "@/core/project-filter";
import { getEffectiveProject } from "@/utils/task/task-operations";
export class ProjectViewComponent extends TwoColumnViewBase {
    constructor(parentEl, app, plugin) {
        // 配置基类需要的参数
        const config = {
            classNamePrefix: "projects",
            leftColumnTitle: "Projects",
            rightColumnDefaultTitle: "Tasks",
            multiSelectText: "projects selected",
            emptyStateText: "Select a project to see related tasks",
            rendererContext: "projects",
            itemIcon: "folder",
        };
        super(parentEl, app, plugin, config);
        // 特定于项目视图的状态
        this.allProjectsMap = new Map(); // 项目 -> 任务ID集合
        this.projectTree = null; // 项目树结构
        this.projectTreeComponent = null; // 树组件
        this.viewMode = 'list'; // 视图模式
    }
    /**
     * 重写基类中的索引构建方法，为项目创建索引
     */
    buildItemsIndex() {
        // 清除现有索引
        this.allProjectsMap.clear();
        // 为每个任务的项目建立索引，使用 getEffectiveProject 统一获取项目名
        this.allTasks.forEach((task) => {
            var _a;
            const projectName = getEffectiveProject(task);
            if (projectName) {
                if (!this.allProjectsMap.has(projectName)) {
                    this.allProjectsMap.set(projectName, new Set());
                }
                (_a = this.allProjectsMap.get(projectName)) === null || _a === void 0 ? void 0 : _a.add(task.id);
            }
        });
        // 构建项目树结构
        const separator = this.plugin.settings.projectPathSeparator || "/";
        this.projectTree = buildProjectTreeFromTasks(this.allTasks, separator);
        // 更新项目计数
        if (this.countEl) {
            const projectCount = this.projectTree ? this.projectTree.children.length : this.allProjectsMap.size;
            this.countEl.setText(`${projectCount} projects`);
        }
    }
    /**
     * 重写基类中的列表渲染方法，为项目创建列表
     */
    renderItemsList() {
        // 清空现有列表
        this.itemsListEl.empty();
        // 根据视图模式渲染
        if (this.viewMode === 'tree' && this.projectTree) {
            // 渲染树状视图
            this.renderTreeView();
        }
        else {
            // 渲染列表视图
            this.renderListView();
        }
    }
    /**
     * 渲染列表视图
     */
    renderListView() {
        // 按字母排序项目
        const sortedProjects = Array.from(this.allProjectsMap.keys()).sort();
        // 渲染每个项目
        sortedProjects.forEach((project) => {
            var _a;
            // 获取此项目的任务数量
            const taskCount = ((_a = this.allProjectsMap.get(project)) === null || _a === void 0 ? void 0 : _a.size) || 0;
            // 创建项目项
            const projectItem = this.itemsListEl.createDiv({
                cls: "project-list-item",
            });
            // 项目图标
            const projectIconEl = projectItem.createDiv({
                cls: "project-icon",
            });
            setIcon(projectIconEl, "folder");
            // 项目名称
            const projectNameEl = projectItem.createDiv({
                cls: "project-name",
            });
            projectNameEl.setText(project);
            // 任务计数徽章
            const countEl = projectItem.createDiv({
                cls: "project-count",
            });
            countEl.setText(taskCount.toString());
            // 存储项目名称作为数据属性
            projectItem.dataset.project = project;
            // 检查此项目是否已被选中
            if (this.selectedItems.items.includes(project)) {
                projectItem.classList.add("selected");
            }
            // 添加点击处理
            this.registerDomEvent(projectItem, "click", (e) => {
                this.handleItemSelection(project, e.ctrlKey || e.metaKey);
            });
        });
        // 如果没有项目，添加空状态
        if (sortedProjects.length === 0) {
            const emptyEl = this.itemsListEl.createDiv({
                cls: "projects-empty-state",
            });
            emptyEl.setText(t("No projects found"));
        }
    }
    /**
     * 渲染树状视图
     */
    renderTreeView() {
        // 清理旧的树组件
        if (this.projectTreeComponent) {
            this.removeChild(this.projectTreeComponent);
            this.projectTreeComponent = null;
        }
        // 创建新的树组件
        this.projectTreeComponent = new ProjectTreeComponent(this.itemsListEl, this.app, this.plugin);
        // 设置事件处理
        this.projectTreeComponent.onNodeSelected = (selectedPaths, tasks) => {
            // 更新选中的项目
            this.selectedItems.items = Array.from(selectedPaths);
            this.filteredTasks = tasks;
            this.renderTaskList();
        };
        this.projectTreeComponent.onMultiSelectToggled = (isMultiSelect) => {
            this.selectedItems.isMultiSelect = isMultiSelect;
        };
        // 加载组件
        this.addChild(this.projectTreeComponent);
        // 构建树
        this.projectTreeComponent.buildTree(this.allTasks);
        // 恢复之前的选择
        if (this.selectedItems.items.length > 0) {
            this.projectTreeComponent.setSelectedPaths(new Set(this.selectedItems.items));
        }
    }
    /**
     * 切换视图模式
     */
    toggleViewMode() {
        this.viewMode = this.viewMode === 'list' ? 'tree' : 'list';
        // 重新渲染列表
        this.renderItemsList();
        // 保存用户偏好
        this.saveViewModePreference();
    }
    /**
     * 保存视图模式偏好
     */
    saveViewModePreference() {
        try {
            localStorage.setItem('task-progress-bar-project-view-mode', this.viewMode);
        }
        catch (error) {
            console.warn('Failed to save view mode preference:', error);
        }
    }
    /**
     * 加载视图模式偏好
     */
    loadViewModePreference() {
        try {
            const savedMode = localStorage.getItem('task-progress-bar-project-view-mode');
            if (savedMode === 'tree' || savedMode === 'list') {
                this.viewMode = savedMode;
            }
        }
        catch (error) {
            console.warn('Failed to load view mode preference:', error);
        }
    }
    /**
     * 更新基于所选项目的任务
     */
    updateSelectedTasks() {
        if (this.selectedItems.items.length === 0) {
            this.cleanupRenderers();
            this.renderEmptyTaskList(t(this.config.emptyStateText));
            return;
        }
        // 根据视图模式使用不同的筛选逻辑
        if (this.viewMode === 'tree' && this.projectTree) {
            // 树状模式：使用包含式筛选（选父含子）
            const separator = this.plugin.settings.projectPathSeparator || "/";
            this.filteredTasks = filterTasksByProjectPaths(this.allTasks, this.selectedItems.items, separator);
        }
        else {
            // 列表模式：保持原有逻辑
            // 获取来自所有选中项目的任务（OR逻辑）
            const resultTaskIds = new Set();
            // 合并所有选中项目的任务ID集
            this.selectedItems.items.forEach((project) => {
                const taskIds = this.allProjectsMap.get(project);
                if (taskIds) {
                    taskIds.forEach((id) => resultTaskIds.add(id));
                }
            });
            // 将任务ID转换为实际任务对象
            this.filteredTasks = this.allTasks.filter((task) => resultTaskIds.has(task.id));
        }
        // 按优先级和截止日期排序
        this.filteredTasks.sort((a, b) => {
            // 首先按完成状态
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            // 然后按优先级（高到低）
            const priorityA = a.metadata.priority || 0;
            const priorityB = b.metadata.priority || 0;
            if (priorityA !== priorityB) {
                return priorityB - priorityA;
            }
            // 然后按截止日期（早到晚）
            const dueDateA = a.metadata.dueDate || Number.MAX_SAFE_INTEGER;
            const dueDateB = b.metadata.dueDate || Number.MAX_SAFE_INTEGER;
            return dueDateA - dueDateB;
        });
        // 更新任务列表
        this.renderTaskList();
    }
    /**
     * 重写 onload 以加载视图模式偏好
     */
    onload() {
        // 加载视图模式偏好
        this.loadViewModePreference();
        // 调用父类的 onload
        super.onload();
        // 在 onload 完成后添加视图切换按钮
        this.addViewToggleButton();
    }
    /**
     * 添加视图切换按钮
     */
    addViewToggleButton() {
        // 确保 leftHeaderEl 存在
        if (this.leftHeaderEl) {
            // 查找多选按钮
            const multiSelectBtn = this.leftHeaderEl.querySelector('.projects-multi-select-btn');
            // 创建视图切换按钮
            const viewToggleBtn = this.leftHeaderEl.createDiv({
                cls: 'projects-view-toggle-btn'
            });
            // 如果找到多选按钮，将视图切换按钮插入到它后面
            if (multiSelectBtn && multiSelectBtn.parentNode) {
                multiSelectBtn.parentNode.insertBefore(viewToggleBtn, multiSelectBtn.nextSibling);
            }
            setIcon(viewToggleBtn, this.viewMode === 'tree' ? 'git-branch' : 'list');
            viewToggleBtn.setAttribute('aria-label', t('Toggle tree/list view'));
            viewToggleBtn.setAttribute('title', t('Toggle tree/list view'));
            this.registerDomEvent(viewToggleBtn, 'click', () => {
                this.toggleViewMode();
                // 更新按钮图标
                setIcon(viewToggleBtn, this.viewMode === 'tree' ? 'git-branch' : 'list');
            });
        }
    }
    /**
     * 更新任务
     */
    updateTask(updatedTask) {
        let needsFullRefresh = false;
        const taskIndex = this.allTasks.findIndex((t) => t.id === updatedTask.id);
        if (taskIndex !== -1) {
            const oldTask = this.allTasks[taskIndex];
            // 检查项目分配是否更改，这会影响侧边栏/过滤
            if (oldTask.metadata.project !== updatedTask.metadata.project) {
                needsFullRefresh = true;
            }
            this.allTasks[taskIndex] = updatedTask;
        }
        else {
            // 任务可能是新的，添加并刷新
            this.allTasks.push(updatedTask);
            needsFullRefresh = true;
        }
        // 如果项目更改或任务是新的，重建索引并完全刷新UI
        if (needsFullRefresh) {
            this.buildItemsIndex();
            this.renderItemsList(); // 更新左侧边栏
            this.updateSelectedTasks(); // 重新计算过滤后的任务并重新渲染右侧面板
        }
        else {
            // 否则，只更新过滤列表中的任务和渲染器
            const filteredIndex = this.filteredTasks.findIndex((t) => t.id === updatedTask.id);
            if (filteredIndex !== -1) {
                this.filteredTasks[filteredIndex] = updatedTask;
                // 请求渲染器更新特定组件
                if (this.taskRenderer) {
                    this.taskRenderer.updateTask(updatedTask);
                }
                // 可选：如果排序标准变化，重新排序然后重新渲染
                // this.renderTaskList();
            }
            else {
                // 任务可能由于更新而变为可见，需要重新过滤
                this.updateSelectedTasks();
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUHJvamVjdFZpZXdDb21wb25lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJQcm9qZWN0Vmlld0NvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQU8sT0FBTyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBRXhDLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUMxQyxPQUFPLDJCQUEyQixDQUFDO0FBQ25DLE9BQU8sbUNBQW1DLENBQUM7QUFDM0MsT0FBTywyQkFBMkIsQ0FBQztBQUVuQyxPQUFPLEVBQUUsaUJBQWlCLEVBQXVCLE1BQU0scUJBQXFCLENBQUM7QUFDN0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFFOUQsT0FBTyxFQUFFLHlCQUF5QixFQUFrQixNQUFNLDZCQUE2QixDQUFDO0FBQ3hGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2xFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRW5FLE1BQU0sT0FBTyxvQkFBcUIsU0FBUSxpQkFBeUI7SUFPbEUsWUFDQyxRQUFxQixFQUNyQixHQUFRLEVBQ1IsTUFBNkI7UUFFN0IsWUFBWTtRQUNaLE1BQU0sTUFBTSxHQUF3QjtZQUNuQyxlQUFlLEVBQUUsVUFBVTtZQUMzQixlQUFlLEVBQUUsVUFBVTtZQUMzQix1QkFBdUIsRUFBRSxPQUFPO1lBQ2hDLGVBQWUsRUFBRSxtQkFBbUI7WUFDcEMsY0FBYyxFQUFFLHVDQUF1QztZQUN2RCxlQUFlLEVBQUUsVUFBVTtZQUMzQixRQUFRLEVBQUUsUUFBUTtTQUNsQixDQUFDO1FBRUYsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBdEJ0QyxhQUFhO1FBQ0wsbUJBQWMsR0FBNkIsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLGVBQWU7UUFDckUsZ0JBQVcsR0FBcUMsSUFBSSxDQUFDLENBQUMsUUFBUTtRQUM5RCx5QkFBb0IsR0FBZ0MsSUFBSSxDQUFDLENBQUMsTUFBTTtRQUNoRSxhQUFRLEdBQW9CLE1BQU0sQ0FBQyxDQUFDLE9BQU87SUFtQm5ELENBQUM7SUFFRDs7T0FFRztJQUNPLGVBQWU7UUFDeEIsU0FBUztRQUNULElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFNUIsOENBQThDO1FBQzlDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7O1lBQzlCLE1BQU0sV0FBVyxHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzlDLElBQUksV0FBVyxFQUFFO2dCQUNoQixJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEVBQUU7b0JBQzFDLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUM7aUJBQ2hEO2dCQUNELE1BQUEsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLDBDQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDbkQ7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILFVBQVU7UUFDVixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsSUFBSSxHQUFHLENBQUM7UUFDbkUsSUFBSSxDQUFDLFdBQVcsR0FBRyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRXZFLFNBQVM7UUFDVCxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDakIsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQztZQUNwRyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLFlBQVksV0FBVyxDQUFDLENBQUM7U0FDakQ7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDTyxlQUFlO1FBQ3hCLFNBQVM7UUFDVCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRXpCLFdBQVc7UUFDWCxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssTUFBTSxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUU7WUFDakQsU0FBUztZQUNULElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztTQUN0QjthQUFNO1lBQ04sU0FBUztZQUNULElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztTQUN0QjtJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNLLGNBQWM7UUFDckIsVUFBVTtRQUNWLE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBRXJFLFNBQVM7UUFDVCxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7O1lBQ2xDLGFBQWE7WUFDYixNQUFNLFNBQVMsR0FBRyxDQUFBLE1BQUEsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLDBDQUFFLElBQUksS0FBSSxDQUFDLENBQUM7WUFFOUQsUUFBUTtZQUNSLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDO2dCQUM5QyxHQUFHLEVBQUUsbUJBQW1CO2FBQ3hCLENBQUMsQ0FBQztZQUVILE9BQU87WUFDUCxNQUFNLGFBQWEsR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFDO2dCQUMzQyxHQUFHLEVBQUUsY0FBYzthQUNuQixDQUFDLENBQUM7WUFDSCxPQUFPLENBQUMsYUFBYSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBRWpDLE9BQU87WUFDUCxNQUFNLGFBQWEsR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFDO2dCQUMzQyxHQUFHLEVBQUUsY0FBYzthQUNuQixDQUFDLENBQUM7WUFDSCxhQUFhLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRS9CLFNBQVM7WUFDVCxNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFDO2dCQUNyQyxHQUFHLEVBQUUsZUFBZTthQUNwQixDQUFDLENBQUM7WUFDSCxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBRXRDLGVBQWU7WUFDZixXQUFXLENBQUMsT0FBTyxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7WUFFdEMsY0FBYztZQUNkLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUMvQyxXQUFXLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQzthQUN0QztZQUVELFNBQVM7WUFDVCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUNqRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzNELENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxlQUFlO1FBQ2YsSUFBSSxjQUFjLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUNoQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQztnQkFDMUMsR0FBRyxFQUFFLHNCQUFzQjthQUMzQixDQUFDLENBQUM7WUFDSCxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7U0FDeEM7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSyxjQUFjO1FBQ3JCLFVBQVU7UUFDVixJQUFJLElBQUksQ0FBQyxvQkFBb0IsRUFBRTtZQUM5QixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1lBQzVDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUM7U0FDakM7UUFFRCxVQUFVO1FBQ1YsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksb0JBQW9CLENBQ25ELElBQUksQ0FBQyxXQUFXLEVBQ2hCLElBQUksQ0FBQyxHQUFHLEVBQ1IsSUFBSSxDQUFDLE1BQU0sQ0FDWCxDQUFDO1FBRUYsU0FBUztRQUNULElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLEdBQUcsQ0FBQyxhQUFhLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFDbkUsVUFBVTtZQUNWLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDckQsSUFBSSxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUM7WUFDM0IsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3ZCLENBQUMsQ0FBQztRQUVGLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxvQkFBb0IsR0FBRyxDQUFDLGFBQWEsRUFBRSxFQUFFO1lBQ2xFLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxHQUFHLGFBQWEsQ0FBQztRQUNsRCxDQUFDLENBQUM7UUFFRixPQUFPO1FBQ1AsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUV6QyxNQUFNO1FBQ04sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFbkQsVUFBVTtRQUNWLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUN4QyxJQUFJLENBQUMsb0JBQW9CLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1NBQzlFO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0ksY0FBYztRQUNwQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUUzRCxTQUFTO1FBQ1QsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBRXZCLFNBQVM7UUFDVCxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztJQUMvQixDQUFDO0lBRUQ7O09BRUc7SUFDSyxzQkFBc0I7UUFDN0IsSUFBSTtZQUNILFlBQVksQ0FBQyxPQUFPLENBQ25CLHFDQUFxQyxFQUNyQyxJQUFJLENBQUMsUUFBUSxDQUNiLENBQUM7U0FDRjtRQUFDLE9BQU8sS0FBSyxFQUFFO1lBQ2YsT0FBTyxDQUFDLElBQUksQ0FBQyxzQ0FBc0MsRUFBRSxLQUFLLENBQUMsQ0FBQztTQUM1RDtJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNLLHNCQUFzQjtRQUM3QixJQUFJO1lBQ0gsTUFBTSxTQUFTLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDO1lBQzlFLElBQUksU0FBUyxLQUFLLE1BQU0sSUFBSSxTQUFTLEtBQUssTUFBTSxFQUFFO2dCQUNqRCxJQUFJLENBQUMsUUFBUSxHQUFHLFNBQVMsQ0FBQzthQUMxQjtTQUNEO1FBQUMsT0FBTyxLQUFLLEVBQUU7WUFDZixPQUFPLENBQUMsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQzVEO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ08sbUJBQW1CO1FBQzVCLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUMxQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztZQUN4RCxPQUFPO1NBQ1A7UUFFRCxrQkFBa0I7UUFDbEIsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLE1BQU0sSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFO1lBQ2pELHFCQUFxQjtZQUNyQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsSUFBSSxHQUFHLENBQUM7WUFDbkUsSUFBSSxDQUFDLGFBQWEsR0FBRyx5QkFBeUIsQ0FDN0MsSUFBSSxDQUFDLFFBQVEsRUFDYixJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssRUFDeEIsU0FBUyxDQUNULENBQUM7U0FDRjthQUFNO1lBQ04sY0FBYztZQUNkLHNCQUFzQjtZQUN0QixNQUFNLGFBQWEsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1lBRXhDLGlCQUFpQjtZQUNqQixJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQkFDNUMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ2pELElBQUksT0FBTyxFQUFFO29CQUNaLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztpQkFDL0M7WUFDRixDQUFDLENBQUMsQ0FBQztZQUVILGlCQUFpQjtZQUNqQixJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FDbEQsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQzFCLENBQUM7U0FDRjtRQUVELGNBQWM7UUFDZCxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNoQyxVQUFVO1lBQ1YsSUFBSSxDQUFDLENBQUMsU0FBUyxLQUFLLENBQUMsQ0FBQyxTQUFTLEVBQUU7Z0JBQ2hDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUM1QjtZQUVELGNBQWM7WUFDZCxNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUM7WUFDM0MsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDO1lBQzNDLElBQUksU0FBUyxLQUFLLFNBQVMsRUFBRTtnQkFDNUIsT0FBTyxTQUFTLEdBQUcsU0FBUyxDQUFDO2FBQzdCO1lBRUQsZUFBZTtZQUNmLE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxJQUFJLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztZQUMvRCxNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sSUFBSSxNQUFNLENBQUMsZ0JBQWdCLENBQUM7WUFDL0QsT0FBTyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQzVCLENBQUMsQ0FBQyxDQUFDO1FBRUgsU0FBUztRQUNULElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxNQUFNO1FBQ0wsV0FBVztRQUNYLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBRTlCLGVBQWU7UUFDZixLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7UUFFZix1QkFBdUI7UUFDdkIsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7SUFDNUIsQ0FBQztJQUVEOztPQUVHO0lBQ0ssbUJBQW1CO1FBQzFCLHFCQUFxQjtRQUNyQixJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUU7WUFDdEIsU0FBUztZQUNULE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLDRCQUE0QixDQUFDLENBQUM7WUFFckYsV0FBVztZQUNYLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDO2dCQUNqRCxHQUFHLEVBQUUsMEJBQTBCO2FBQy9CLENBQUMsQ0FBQztZQUVILHlCQUF5QjtZQUN6QixJQUFJLGNBQWMsSUFBSSxjQUFjLENBQUMsVUFBVSxFQUFFO2dCQUNoRCxjQUFjLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxhQUFhLEVBQUUsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDO2FBQ2xGO1lBRUQsT0FBTyxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsUUFBUSxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN6RSxhQUFhLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDO1lBQ3JFLGFBQWEsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUM7WUFFaEUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFO2dCQUNsRCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQ3RCLFNBQVM7Z0JBQ1QsT0FBTyxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsUUFBUSxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMxRSxDQUFDLENBQUMsQ0FBQztTQUNIO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0ksVUFBVSxDQUFDLFdBQWlCO1FBQ2xDLElBQUksZ0JBQWdCLEdBQUcsS0FBSyxDQUFDO1FBQzdCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUN4QyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxXQUFXLENBQUMsRUFBRSxDQUM5QixDQUFDO1FBRUYsSUFBSSxTQUFTLEtBQUssQ0FBQyxDQUFDLEVBQUU7WUFDckIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN6Qyx3QkFBd0I7WUFDeEIsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLE9BQU8sS0FBSyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRTtnQkFDOUQsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO2FBQ3hCO1lBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsR0FBRyxXQUFXLENBQUM7U0FDdkM7YUFBTTtZQUNOLGdCQUFnQjtZQUNoQixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNoQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7U0FDeEI7UUFFRCwyQkFBMkI7UUFDM0IsSUFBSSxnQkFBZ0IsRUFBRTtZQUNyQixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsU0FBUztZQUNqQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLHNCQUFzQjtTQUNsRDthQUFNO1lBQ04scUJBQXFCO1lBQ3JCLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUNqRCxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxXQUFXLENBQUMsRUFBRSxDQUM5QixDQUFDO1lBQ0YsSUFBSSxhQUFhLEtBQUssQ0FBQyxDQUFDLEVBQUU7Z0JBQ3pCLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLEdBQUcsV0FBVyxDQUFDO2dCQUNoRCxjQUFjO2dCQUNkLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRTtvQkFDdEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7aUJBQzFDO2dCQUNELHlCQUF5QjtnQkFDekIseUJBQXlCO2FBQ3pCO2lCQUFNO2dCQUNOLHVCQUF1QjtnQkFDdkIsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7YUFDM0I7U0FDRDtJQUNGLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcCwgc2V0SWNvbiB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBUYXNrIH0gZnJvbSBcIkAvdHlwZXMvdGFza1wiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgXCJAL3N0eWxlcy9wcm9qZWN0LXZpZXcuY3NzXCI7XHJcbmltcG9ydCBcIkAvc3R5bGVzL3ZpZXctdHdvLWNvbHVtbi1iYXNlLmNzc1wiO1xyXG5pbXBvcnQgXCJAL3N0eWxlcy9wcm9qZWN0LXRyZWUuY3NzXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjtcclxuaW1wb3J0IHsgVHdvQ29sdW1uVmlld0Jhc2UsIFR3b0NvbHVtblZpZXdDb25maWcgfSBmcm9tIFwiLi9Ud29Db2x1bW5WaWV3QmFzZVwiO1xyXG5pbXBvcnQgeyBQcm9qZWN0VHJlZUNvbXBvbmVudCB9IGZyb20gXCIuL1Byb2plY3RUcmVlQ29tcG9uZW50XCI7XHJcbmltcG9ydCB7IFRyZWVOb2RlLCBQcm9qZWN0Tm9kZURhdGEgfSBmcm9tIFwiQC90eXBlcy90cmVlXCI7XHJcbmltcG9ydCB7IGJ1aWxkUHJvamVjdFRyZWVGcm9tVGFza3MsIGZpbmROb2RlQnlQYXRoIH0gZnJvbSBcIkAvY29yZS9wcm9qZWN0LXRyZWUtYnVpbGRlclwiO1xyXG5pbXBvcnQgeyBmaWx0ZXJUYXNrc0J5UHJvamVjdFBhdGhzIH0gZnJvbSBcIkAvY29yZS9wcm9qZWN0LWZpbHRlclwiO1xyXG5pbXBvcnQgeyBnZXRFZmZlY3RpdmVQcm9qZWN0IH0gZnJvbSBcIkAvdXRpbHMvdGFzay90YXNrLW9wZXJhdGlvbnNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBQcm9qZWN0Vmlld0NvbXBvbmVudCBleHRlbmRzIFR3b0NvbHVtblZpZXdCYXNlPHN0cmluZz4ge1xyXG5cdC8vIOeJueWumuS6jumhueebruinhuWbvueahOeKtuaAgVxyXG5cdHByaXZhdGUgYWxsUHJvamVjdHNNYXA6IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PiA9IG5ldyBNYXAoKTsgLy8g6aG555uuIC0+IOS7u+WKoUlE6ZuG5ZCIXHJcblx0cHJpdmF0ZSBwcm9qZWN0VHJlZTogVHJlZU5vZGU8UHJvamVjdE5vZGVEYXRhPiB8IG51bGwgPSBudWxsOyAvLyDpobnnm67moJHnu5PmnoRcclxuXHRwcml2YXRlIHByb2plY3RUcmVlQ29tcG9uZW50OiBQcm9qZWN0VHJlZUNvbXBvbmVudCB8IG51bGwgPSBudWxsOyAvLyDmoJHnu4Tku7ZcclxuXHRwcml2YXRlIHZpZXdNb2RlOiAnbGlzdCcgfCAndHJlZScgPSAnbGlzdCc7IC8vIOinhuWbvuaooeW8j1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHBhcmVudEVsOiBIVE1MRWxlbWVudCxcclxuXHRcdGFwcDogQXBwLFxyXG5cdFx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW5cclxuXHQpIHtcclxuXHRcdC8vIOmFjee9ruWfuuexu+mcgOimgeeahOWPguaVsFxyXG5cdFx0Y29uc3QgY29uZmlnOiBUd29Db2x1bW5WaWV3Q29uZmlnID0ge1xyXG5cdFx0XHRjbGFzc05hbWVQcmVmaXg6IFwicHJvamVjdHNcIixcclxuXHRcdFx0bGVmdENvbHVtblRpdGxlOiBcIlByb2plY3RzXCIsXHJcblx0XHRcdHJpZ2h0Q29sdW1uRGVmYXVsdFRpdGxlOiBcIlRhc2tzXCIsXHJcblx0XHRcdG11bHRpU2VsZWN0VGV4dDogXCJwcm9qZWN0cyBzZWxlY3RlZFwiLFxyXG5cdFx0XHRlbXB0eVN0YXRlVGV4dDogXCJTZWxlY3QgYSBwcm9qZWN0IHRvIHNlZSByZWxhdGVkIHRhc2tzXCIsXHJcblx0XHRcdHJlbmRlcmVyQ29udGV4dDogXCJwcm9qZWN0c1wiLFxyXG5cdFx0XHRpdGVtSWNvbjogXCJmb2xkZXJcIixcclxuXHRcdH07XHJcblxyXG5cdFx0c3VwZXIocGFyZW50RWwsIGFwcCwgcGx1Z2luLCBjb25maWcpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICog6YeN5YaZ5Z+657G75Lit55qE57Si5byV5p6E5bu65pa55rOV77yM5Li66aG555uu5Yib5bu657Si5byVXHJcblx0ICovXHJcblx0cHJvdGVjdGVkIGJ1aWxkSXRlbXNJbmRleCgpOiB2b2lkIHtcclxuXHRcdC8vIOa4hemZpOeOsOaciee0ouW8lVxyXG5cdFx0dGhpcy5hbGxQcm9qZWN0c01hcC5jbGVhcigpO1xyXG5cclxuXHRcdC8vIOS4uuavj+S4quS7u+WKoeeahOmhueebruW7uueri+e0ouW8le+8jOS9v+eUqCBnZXRFZmZlY3RpdmVQcm9qZWN0IOe7n+S4gOiOt+WPlumhueebruWQjVxyXG5cdFx0dGhpcy5hbGxUYXNrcy5mb3JFYWNoKCh0YXNrKSA9PiB7XHJcblx0XHRcdGNvbnN0IHByb2plY3ROYW1lID0gZ2V0RWZmZWN0aXZlUHJvamVjdCh0YXNrKTtcclxuXHRcdFx0aWYgKHByb2plY3ROYW1lKSB7XHJcblx0XHRcdFx0aWYgKCF0aGlzLmFsbFByb2plY3RzTWFwLmhhcyhwcm9qZWN0TmFtZSkpIHtcclxuXHRcdFx0XHRcdHRoaXMuYWxsUHJvamVjdHNNYXAuc2V0KHByb2plY3ROYW1lLCBuZXcgU2V0KCkpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHR0aGlzLmFsbFByb2plY3RzTWFwLmdldChwcm9qZWN0TmFtZSk/LmFkZCh0YXNrLmlkKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8g5p6E5bu66aG555uu5qCR57uT5p6EXHJcblx0XHRjb25zdCBzZXBhcmF0b3IgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0UGF0aFNlcGFyYXRvciB8fCBcIi9cIjtcclxuXHRcdHRoaXMucHJvamVjdFRyZWUgPSBidWlsZFByb2plY3RUcmVlRnJvbVRhc2tzKHRoaXMuYWxsVGFza3MsIHNlcGFyYXRvcik7XHJcblxyXG5cdFx0Ly8g5pu05paw6aG555uu6K6h5pWwXHJcblx0XHRpZiAodGhpcy5jb3VudEVsKSB7XHJcblx0XHRcdGNvbnN0IHByb2plY3RDb3VudCA9IHRoaXMucHJvamVjdFRyZWUgPyB0aGlzLnByb2plY3RUcmVlLmNoaWxkcmVuLmxlbmd0aCA6IHRoaXMuYWxsUHJvamVjdHNNYXAuc2l6ZTtcclxuXHRcdFx0dGhpcy5jb3VudEVsLnNldFRleHQoYCR7cHJvamVjdENvdW50fSBwcm9qZWN0c2ApO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICog6YeN5YaZ5Z+657G75Lit55qE5YiX6KGo5riy5p+T5pa55rOV77yM5Li66aG555uu5Yib5bu65YiX6KGoXHJcblx0ICovXHJcblx0cHJvdGVjdGVkIHJlbmRlckl0ZW1zTGlzdCgpOiB2b2lkIHtcclxuXHRcdC8vIOa4heepuueOsOacieWIl+ihqFxyXG5cdFx0dGhpcy5pdGVtc0xpc3RFbC5lbXB0eSgpO1xyXG5cclxuXHRcdC8vIOagueaNruinhuWbvuaooeW8j+a4suafk1xyXG5cdFx0aWYgKHRoaXMudmlld01vZGUgPT09ICd0cmVlJyAmJiB0aGlzLnByb2plY3RUcmVlKSB7XHJcblx0XHRcdC8vIOa4suafk+agkeeKtuinhuWbvlxyXG5cdFx0XHR0aGlzLnJlbmRlclRyZWVWaWV3KCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyDmuLLmn5PliJfooajop4blm75cclxuXHRcdFx0dGhpcy5yZW5kZXJMaXN0VmlldygpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICog5riy5p+T5YiX6KGo6KeG5Zu+XHJcblx0ICovXHJcblx0cHJpdmF0ZSByZW5kZXJMaXN0VmlldygpOiB2b2lkIHtcclxuXHRcdC8vIOaMieWtl+avjeaOkuW6j+mhueebrlxyXG5cdFx0Y29uc3Qgc29ydGVkUHJvamVjdHMgPSBBcnJheS5mcm9tKHRoaXMuYWxsUHJvamVjdHNNYXAua2V5cygpKS5zb3J0KCk7XHJcblxyXG5cdFx0Ly8g5riy5p+T5q+P5Liq6aG555uuXHJcblx0XHRzb3J0ZWRQcm9qZWN0cy5mb3JFYWNoKChwcm9qZWN0KSA9PiB7XHJcblx0XHRcdC8vIOiOt+WPluatpOmhueebrueahOS7u+WKoeaVsOmHj1xyXG5cdFx0XHRjb25zdCB0YXNrQ291bnQgPSB0aGlzLmFsbFByb2plY3RzTWFwLmdldChwcm9qZWN0KT8uc2l6ZSB8fCAwO1xyXG5cclxuXHRcdFx0Ly8g5Yib5bu66aG555uu6aG5XHJcblx0XHRcdGNvbnN0IHByb2plY3RJdGVtID0gdGhpcy5pdGVtc0xpc3RFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJwcm9qZWN0LWxpc3QtaXRlbVwiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIOmhueebruWbvuagh1xyXG5cdFx0XHRjb25zdCBwcm9qZWN0SWNvbkVsID0gcHJvamVjdEl0ZW0uY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwicHJvamVjdC1pY29uXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRzZXRJY29uKHByb2plY3RJY29uRWwsIFwiZm9sZGVyXCIpO1xyXG5cclxuXHRcdFx0Ly8g6aG555uu5ZCN56ewXHJcblx0XHRcdGNvbnN0IHByb2plY3ROYW1lRWwgPSBwcm9qZWN0SXRlbS5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJwcm9qZWN0LW5hbWVcIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdHByb2plY3ROYW1lRWwuc2V0VGV4dChwcm9qZWN0KTtcclxuXHJcblx0XHRcdC8vIOS7u+WKoeiuoeaVsOW+veeroFxyXG5cdFx0XHRjb25zdCBjb3VudEVsID0gcHJvamVjdEl0ZW0uY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwicHJvamVjdC1jb3VudFwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0Y291bnRFbC5zZXRUZXh0KHRhc2tDb3VudC50b1N0cmluZygpKTtcclxuXHJcblx0XHRcdC8vIOWtmOWCqOmhueebruWQjeensOS9nOS4uuaVsOaNruWxnuaAp1xyXG5cdFx0XHRwcm9qZWN0SXRlbS5kYXRhc2V0LnByb2plY3QgPSBwcm9qZWN0O1xyXG5cclxuXHRcdFx0Ly8g5qOA5p+l5q2k6aG555uu5piv5ZCm5bey6KKr6YCJ5LitXHJcblx0XHRcdGlmICh0aGlzLnNlbGVjdGVkSXRlbXMuaXRlbXMuaW5jbHVkZXMocHJvamVjdCkpIHtcclxuXHRcdFx0XHRwcm9qZWN0SXRlbS5jbGFzc0xpc3QuYWRkKFwic2VsZWN0ZWRcIik7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIOa3u+WKoOeCueWHu+WkhOeQhlxyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQocHJvamVjdEl0ZW0sIFwiY2xpY2tcIiwgKGUpID0+IHtcclxuXHRcdFx0XHR0aGlzLmhhbmRsZUl0ZW1TZWxlY3Rpb24ocHJvamVjdCwgZS5jdHJsS2V5IHx8IGUubWV0YUtleSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8g5aaC5p6c5rKh5pyJ6aG555uu77yM5re75Yqg56m654q25oCBXHJcblx0XHRpZiAoc29ydGVkUHJvamVjdHMubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdGNvbnN0IGVtcHR5RWwgPSB0aGlzLml0ZW1zTGlzdEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcInByb2plY3RzLWVtcHR5LXN0YXRlXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRlbXB0eUVsLnNldFRleHQodChcIk5vIHByb2plY3RzIGZvdW5kXCIpKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIOa4suafk+agkeeKtuinhuWbvlxyXG5cdCAqL1xyXG5cdHByaXZhdGUgcmVuZGVyVHJlZVZpZXcoKTogdm9pZCB7XHJcblx0XHQvLyDmuIXnkIbml6fnmoTmoJHnu4Tku7ZcclxuXHRcdGlmICh0aGlzLnByb2plY3RUcmVlQ29tcG9uZW50KSB7XHJcblx0XHRcdHRoaXMucmVtb3ZlQ2hpbGQodGhpcy5wcm9qZWN0VHJlZUNvbXBvbmVudCk7XHJcblx0XHRcdHRoaXMucHJvamVjdFRyZWVDb21wb25lbnQgPSBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIOWIm+W7uuaWsOeahOagkee7hOS7tlxyXG5cdFx0dGhpcy5wcm9qZWN0VHJlZUNvbXBvbmVudCA9IG5ldyBQcm9qZWN0VHJlZUNvbXBvbmVudChcclxuXHRcdFx0dGhpcy5pdGVtc0xpc3RFbCxcclxuXHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdHRoaXMucGx1Z2luXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIOiuvue9ruS6i+S7tuWkhOeQhlxyXG5cdFx0dGhpcy5wcm9qZWN0VHJlZUNvbXBvbmVudC5vbk5vZGVTZWxlY3RlZCA9IChzZWxlY3RlZFBhdGhzLCB0YXNrcykgPT4ge1xyXG5cdFx0XHQvLyDmm7TmlrDpgInkuK3nmoTpobnnm65cclxuXHRcdFx0dGhpcy5zZWxlY3RlZEl0ZW1zLml0ZW1zID0gQXJyYXkuZnJvbShzZWxlY3RlZFBhdGhzKTtcclxuXHRcdFx0dGhpcy5maWx0ZXJlZFRhc2tzID0gdGFza3M7XHJcblx0XHRcdHRoaXMucmVuZGVyVGFza0xpc3QoKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5wcm9qZWN0VHJlZUNvbXBvbmVudC5vbk11bHRpU2VsZWN0VG9nZ2xlZCA9IChpc011bHRpU2VsZWN0KSA9PiB7XHJcblx0XHRcdHRoaXMuc2VsZWN0ZWRJdGVtcy5pc011bHRpU2VsZWN0ID0gaXNNdWx0aVNlbGVjdDtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8g5Yqg6L2957uE5Lu2XHJcblx0XHR0aGlzLmFkZENoaWxkKHRoaXMucHJvamVjdFRyZWVDb21wb25lbnQpO1xyXG5cdFx0XHJcblx0XHQvLyDmnoTlu7rmoJFcclxuXHRcdHRoaXMucHJvamVjdFRyZWVDb21wb25lbnQuYnVpbGRUcmVlKHRoaXMuYWxsVGFza3MpO1xyXG5cdFx0XHJcblx0XHQvLyDmgaLlpI3kuYvliY3nmoTpgInmi6lcclxuXHRcdGlmICh0aGlzLnNlbGVjdGVkSXRlbXMuaXRlbXMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHR0aGlzLnByb2plY3RUcmVlQ29tcG9uZW50LnNldFNlbGVjdGVkUGF0aHMobmV3IFNldCh0aGlzLnNlbGVjdGVkSXRlbXMuaXRlbXMpKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIOWIh+aNouinhuWbvuaooeW8j1xyXG5cdCAqL1xyXG5cdHB1YmxpYyB0b2dnbGVWaWV3TW9kZSgpOiB2b2lkIHtcclxuXHRcdHRoaXMudmlld01vZGUgPSB0aGlzLnZpZXdNb2RlID09PSAnbGlzdCcgPyAndHJlZScgOiAnbGlzdCc7XHJcblx0XHRcclxuXHRcdC8vIOmHjeaWsOa4suafk+WIl+ihqFxyXG5cdFx0dGhpcy5yZW5kZXJJdGVtc0xpc3QoKTtcclxuXHRcdFxyXG5cdFx0Ly8g5L+d5a2Y55So5oi35YGP5aW9XHJcblx0XHR0aGlzLnNhdmVWaWV3TW9kZVByZWZlcmVuY2UoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIOS/neWtmOinhuWbvuaooeW8j+WBj+WlvVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgc2F2ZVZpZXdNb2RlUHJlZmVyZW5jZSgpOiB2b2lkIHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGxvY2FsU3RvcmFnZS5zZXRJdGVtKFxyXG5cdFx0XHRcdCd0YXNrLXByb2dyZXNzLWJhci1wcm9qZWN0LXZpZXctbW9kZScsXHJcblx0XHRcdFx0dGhpcy52aWV3TW9kZVxyXG5cdFx0XHQpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKCdGYWlsZWQgdG8gc2F2ZSB2aWV3IG1vZGUgcHJlZmVyZW5jZTonLCBlcnJvcik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiDliqDovb3op4blm77mqKHlvI/lgY/lpb1cclxuXHQgKi9cclxuXHRwcml2YXRlIGxvYWRWaWV3TW9kZVByZWZlcmVuY2UoKTogdm9pZCB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBzYXZlZE1vZGUgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgndGFzay1wcm9ncmVzcy1iYXItcHJvamVjdC12aWV3LW1vZGUnKTtcclxuXHRcdFx0aWYgKHNhdmVkTW9kZSA9PT0gJ3RyZWUnIHx8IHNhdmVkTW9kZSA9PT0gJ2xpc3QnKSB7XHJcblx0XHRcdFx0dGhpcy52aWV3TW9kZSA9IHNhdmVkTW9kZTtcclxuXHRcdFx0fVxyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKCdGYWlsZWQgdG8gbG9hZCB2aWV3IG1vZGUgcHJlZmVyZW5jZTonLCBlcnJvcik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiDmm7TmlrDln7rkuo7miYDpgInpobnnm67nmoTku7vliqFcclxuXHQgKi9cclxuXHRwcm90ZWN0ZWQgdXBkYXRlU2VsZWN0ZWRUYXNrcygpOiB2b2lkIHtcclxuXHRcdGlmICh0aGlzLnNlbGVjdGVkSXRlbXMuaXRlbXMubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdHRoaXMuY2xlYW51cFJlbmRlcmVycygpO1xyXG5cdFx0XHR0aGlzLnJlbmRlckVtcHR5VGFza0xpc3QodCh0aGlzLmNvbmZpZy5lbXB0eVN0YXRlVGV4dCkpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8g5qC55o2u6KeG5Zu+5qih5byP5L2/55So5LiN5ZCM55qE562b6YCJ6YC76L6RXHJcblx0XHRpZiAodGhpcy52aWV3TW9kZSA9PT0gJ3RyZWUnICYmIHRoaXMucHJvamVjdFRyZWUpIHtcclxuXHRcdFx0Ly8g5qCR54q25qih5byP77ya5L2/55So5YyF5ZCr5byP562b6YCJ77yI6YCJ54i25ZCr5a2Q77yJXHJcblx0XHRcdGNvbnN0IHNlcGFyYXRvciA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnByb2plY3RQYXRoU2VwYXJhdG9yIHx8IFwiL1wiO1xyXG5cdFx0XHR0aGlzLmZpbHRlcmVkVGFza3MgPSBmaWx0ZXJUYXNrc0J5UHJvamVjdFBhdGhzKFxyXG5cdFx0XHRcdHRoaXMuYWxsVGFza3MsXHJcblx0XHRcdFx0dGhpcy5zZWxlY3RlZEl0ZW1zLml0ZW1zLFxyXG5cdFx0XHRcdHNlcGFyYXRvclxyXG5cdFx0XHQpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8g5YiX6KGo5qih5byP77ya5L+d5oyB5Y6f5pyJ6YC76L6RXHJcblx0XHRcdC8vIOiOt+WPluadpeiHquaJgOaciemAieS4remhueebrueahOS7u+WKoe+8iE9S6YC76L6R77yJXHJcblx0XHRcdGNvbnN0IHJlc3VsdFRhc2tJZHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuXHJcblx0XHRcdC8vIOWQiOW5tuaJgOaciemAieS4remhueebrueahOS7u+WKoUlE6ZuGXHJcblx0XHRcdHRoaXMuc2VsZWN0ZWRJdGVtcy5pdGVtcy5mb3JFYWNoKChwcm9qZWN0KSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgdGFza0lkcyA9IHRoaXMuYWxsUHJvamVjdHNNYXAuZ2V0KHByb2plY3QpO1xyXG5cdFx0XHRcdGlmICh0YXNrSWRzKSB7XHJcblx0XHRcdFx0XHR0YXNrSWRzLmZvckVhY2goKGlkKSA9PiByZXN1bHRUYXNrSWRzLmFkZChpZCkpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyDlsIbku7vliqFJROi9rOaNouS4uuWunumZheS7u+WKoeWvueixoVxyXG5cdFx0XHR0aGlzLmZpbHRlcmVkVGFza3MgPSB0aGlzLmFsbFRhc2tzLmZpbHRlcigodGFzaykgPT5cclxuXHRcdFx0XHRyZXN1bHRUYXNrSWRzLmhhcyh0YXNrLmlkKVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIOaMieS8mOWFiOe6p+WSjOaIquatouaXpeacn+aOkuW6j1xyXG5cdFx0dGhpcy5maWx0ZXJlZFRhc2tzLnNvcnQoKGEsIGIpID0+IHtcclxuXHRcdFx0Ly8g6aaW5YWI5oyJ5a6M5oiQ54q25oCBXHJcblx0XHRcdGlmIChhLmNvbXBsZXRlZCAhPT0gYi5jb21wbGV0ZWQpIHtcclxuXHRcdFx0XHRyZXR1cm4gYS5jb21wbGV0ZWQgPyAxIDogLTE7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIOeEtuWQjuaMieS8mOWFiOe6p++8iOmrmOWIsOS9ju+8iVxyXG5cdFx0XHRjb25zdCBwcmlvcml0eUEgPSBhLm1ldGFkYXRhLnByaW9yaXR5IHx8IDA7XHJcblx0XHRcdGNvbnN0IHByaW9yaXR5QiA9IGIubWV0YWRhdGEucHJpb3JpdHkgfHwgMDtcclxuXHRcdFx0aWYgKHByaW9yaXR5QSAhPT0gcHJpb3JpdHlCKSB7XHJcblx0XHRcdFx0cmV0dXJuIHByaW9yaXR5QiAtIHByaW9yaXR5QTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8g54S25ZCO5oyJ5oiq5q2i5pel5pyf77yI5pep5Yiw5pma77yJXHJcblx0XHRcdGNvbnN0IGR1ZURhdGVBID0gYS5tZXRhZGF0YS5kdWVEYXRlIHx8IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSO1xyXG5cdFx0XHRjb25zdCBkdWVEYXRlQiA9IGIubWV0YWRhdGEuZHVlRGF0ZSB8fCBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUjtcclxuXHRcdFx0cmV0dXJuIGR1ZURhdGVBIC0gZHVlRGF0ZUI7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyDmm7TmlrDku7vliqHliJfooahcclxuXHRcdHRoaXMucmVuZGVyVGFza0xpc3QoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIOmHjeWGmSBvbmxvYWQg5Lul5Yqg6L296KeG5Zu+5qih5byP5YGP5aW9XHJcblx0ICovXHJcblx0b25sb2FkKCk6IHZvaWQge1xyXG5cdFx0Ly8g5Yqg6L296KeG5Zu+5qih5byP5YGP5aW9XHJcblx0XHR0aGlzLmxvYWRWaWV3TW9kZVByZWZlcmVuY2UoKTtcclxuXHRcdFxyXG5cdFx0Ly8g6LCD55So54i257G755qEIG9ubG9hZFxyXG5cdFx0c3VwZXIub25sb2FkKCk7XHJcblx0XHRcclxuXHRcdC8vIOWcqCBvbmxvYWQg5a6M5oiQ5ZCO5re75Yqg6KeG5Zu+5YiH5o2i5oyJ6ZKuXHJcblx0XHR0aGlzLmFkZFZpZXdUb2dnbGVCdXR0b24oKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIOa3u+WKoOinhuWbvuWIh+aNouaMiemSrlxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYWRkVmlld1RvZ2dsZUJ1dHRvbigpOiB2b2lkIHtcclxuXHRcdC8vIOehruS/nSBsZWZ0SGVhZGVyRWwg5a2Y5ZyoXHJcblx0XHRpZiAodGhpcy5sZWZ0SGVhZGVyRWwpIHtcclxuXHRcdFx0Ly8g5p+l5om+5aSa6YCJ5oyJ6ZKuXHJcblx0XHRcdGNvbnN0IG11bHRpU2VsZWN0QnRuID0gdGhpcy5sZWZ0SGVhZGVyRWwucXVlcnlTZWxlY3RvcignLnByb2plY3RzLW11bHRpLXNlbGVjdC1idG4nKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIOWIm+W7uuinhuWbvuWIh+aNouaMiemSrlxyXG5cdFx0XHRjb25zdCB2aWV3VG9nZ2xlQnRuID0gdGhpcy5sZWZ0SGVhZGVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6ICdwcm9qZWN0cy12aWV3LXRvZ2dsZS1idG4nXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8g5aaC5p6c5om+5Yiw5aSa6YCJ5oyJ6ZKu77yM5bCG6KeG5Zu+5YiH5o2i5oyJ6ZKu5o+S5YWl5Yiw5a6D5ZCO6Z2iXHJcblx0XHRcdGlmIChtdWx0aVNlbGVjdEJ0biAmJiBtdWx0aVNlbGVjdEJ0bi5wYXJlbnROb2RlKSB7XHJcblx0XHRcdFx0bXVsdGlTZWxlY3RCdG4ucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodmlld1RvZ2dsZUJ0biwgbXVsdGlTZWxlY3RCdG4ubmV4dFNpYmxpbmcpO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRzZXRJY29uKHZpZXdUb2dnbGVCdG4sIHRoaXMudmlld01vZGUgPT09ICd0cmVlJyA/ICdnaXQtYnJhbmNoJyA6ICdsaXN0Jyk7XHJcblx0XHRcdHZpZXdUb2dnbGVCdG4uc2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJywgdCgnVG9nZ2xlIHRyZWUvbGlzdCB2aWV3JykpO1xyXG5cdFx0XHR2aWV3VG9nZ2xlQnRuLnNldEF0dHJpYnV0ZSgndGl0bGUnLCB0KCdUb2dnbGUgdHJlZS9saXN0IHZpZXcnKSk7XHJcblx0XHRcdFxyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQodmlld1RvZ2dsZUJ0biwgJ2NsaWNrJywgKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMudG9nZ2xlVmlld01vZGUoKTtcclxuXHRcdFx0XHQvLyDmm7TmlrDmjInpkq7lm77moIdcclxuXHRcdFx0XHRzZXRJY29uKHZpZXdUb2dnbGVCdG4sIHRoaXMudmlld01vZGUgPT09ICd0cmVlJyA/ICdnaXQtYnJhbmNoJyA6ICdsaXN0Jyk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICog5pu05paw5Lu75YqhXHJcblx0ICovXHJcblx0cHVibGljIHVwZGF0ZVRhc2sodXBkYXRlZFRhc2s6IFRhc2spOiB2b2lkIHtcclxuXHRcdGxldCBuZWVkc0Z1bGxSZWZyZXNoID0gZmFsc2U7XHJcblx0XHRjb25zdCB0YXNrSW5kZXggPSB0aGlzLmFsbFRhc2tzLmZpbmRJbmRleChcclxuXHRcdFx0KHQpID0+IHQuaWQgPT09IHVwZGF0ZWRUYXNrLmlkXHJcblx0XHQpO1xyXG5cclxuXHRcdGlmICh0YXNrSW5kZXggIT09IC0xKSB7XHJcblx0XHRcdGNvbnN0IG9sZFRhc2sgPSB0aGlzLmFsbFRhc2tzW3Rhc2tJbmRleF07XHJcblx0XHRcdC8vIOajgOafpemhueebruWIhumFjeaYr+WQpuabtOaUue+8jOi/meS8muW9seWTjeS+p+i+ueagjy/ov4fmu6RcclxuXHRcdFx0aWYgKG9sZFRhc2subWV0YWRhdGEucHJvamVjdCAhPT0gdXBkYXRlZFRhc2subWV0YWRhdGEucHJvamVjdCkge1xyXG5cdFx0XHRcdG5lZWRzRnVsbFJlZnJlc2ggPSB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHRcdHRoaXMuYWxsVGFza3NbdGFza0luZGV4XSA9IHVwZGF0ZWRUYXNrO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8g5Lu75Yqh5Y+v6IO95piv5paw55qE77yM5re75Yqg5bm25Yi35pawXHJcblx0XHRcdHRoaXMuYWxsVGFza3MucHVzaCh1cGRhdGVkVGFzayk7XHJcblx0XHRcdG5lZWRzRnVsbFJlZnJlc2ggPSB0cnVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIOWmguaenOmhueebruabtOaUueaIluS7u+WKoeaYr+aWsOeahO+8jOmHjeW7uue0ouW8leW5tuWujOWFqOWIt+aWsFVJXHJcblx0XHRpZiAobmVlZHNGdWxsUmVmcmVzaCkge1xyXG5cdFx0XHR0aGlzLmJ1aWxkSXRlbXNJbmRleCgpO1xyXG5cdFx0XHR0aGlzLnJlbmRlckl0ZW1zTGlzdCgpOyAvLyDmm7TmlrDlt6bkvqfovrnmoI9cclxuXHRcdFx0dGhpcy51cGRhdGVTZWxlY3RlZFRhc2tzKCk7IC8vIOmHjeaWsOiuoeeul+i/h+a7pOWQjueahOS7u+WKoeW5tumHjeaWsOa4suafk+WPs+S+p+mdouadv1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8g5ZCm5YiZ77yM5Y+q5pu05paw6L+H5ruk5YiX6KGo5Lit55qE5Lu75Yqh5ZKM5riy5p+T5ZmoXHJcblx0XHRcdGNvbnN0IGZpbHRlcmVkSW5kZXggPSB0aGlzLmZpbHRlcmVkVGFza3MuZmluZEluZGV4KFxyXG5cdFx0XHRcdCh0KSA9PiB0LmlkID09PSB1cGRhdGVkVGFzay5pZFxyXG5cdFx0XHQpO1xyXG5cdFx0XHRpZiAoZmlsdGVyZWRJbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHR0aGlzLmZpbHRlcmVkVGFza3NbZmlsdGVyZWRJbmRleF0gPSB1cGRhdGVkVGFzaztcclxuXHRcdFx0XHQvLyDor7fmsYLmuLLmn5Plmajmm7TmlrDnibnlrprnu4Tku7ZcclxuXHRcdFx0XHRpZiAodGhpcy50YXNrUmVuZGVyZXIpIHtcclxuXHRcdFx0XHRcdHRoaXMudGFza1JlbmRlcmVyLnVwZGF0ZVRhc2sodXBkYXRlZFRhc2spO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvLyDlj6/pgInvvJrlpoLmnpzmjpLluo/moIflh4blj5jljJbvvIzph43mlrDmjpLluo/nhLblkI7ph43mlrDmuLLmn5NcclxuXHRcdFx0XHQvLyB0aGlzLnJlbmRlclRhc2tMaXN0KCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8g5Lu75Yqh5Y+v6IO955Sx5LqO5pu05paw6ICM5Y+Y5Li65Y+v6KeB77yM6ZyA6KaB6YeN5paw6L+H5rukXHJcblx0XHRcdFx0dGhpcy51cGRhdGVTZWxlY3RlZFRhc2tzKCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcbn1cclxuIl19