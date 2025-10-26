import { setIcon } from "obsidian";
import { t } from "@/translations/helper";
import "@/styles/tag-view.css";
import "@/styles/view-two-column-base.css";
import { TaskListRendererComponent } from "./TaskList";
import { TwoColumnViewBase } from "./TwoColumnViewBase";
export class TagViewComponent extends TwoColumnViewBase {
    constructor(parentEl, app, plugin) {
        // 配置基类需要的参数
        const config = {
            classNamePrefix: "tags",
            leftColumnTitle: "Tags",
            rightColumnDefaultTitle: "Tasks",
            multiSelectText: "tags selected",
            emptyStateText: "Select a tag to see related tasks",
            rendererContext: "tags",
            itemIcon: "hash",
        };
        super(parentEl, app, plugin, config);
        // 特定于标签视图的状态
        this.allTagsMap = new Map(); // 标签 -> 任务ID集合
        this.tagSections = []; // 仅在多选且非树模式下使用
    }
    /**
     * Normalize a tag to ensure it has a # prefix
     * @param tag The tag to normalize
     * @returns Normalized tag with # prefix
     */
    normalizeTag(tag) {
        if (typeof tag !== 'string') {
            return tag;
        }
        // Trim whitespace
        const trimmed = tag.trim();
        // If empty or already starts with #, return as is
        if (!trimmed || trimmed.startsWith('#')) {
            return trimmed;
        }
        // Add # prefix
        return `#${trimmed}`;
    }
    /**
     * 重写基类中的索引构建方法，为标签创建索引
     */
    buildItemsIndex() {
        // 清除已有索引
        this.allTagsMap.clear();
        // 为每个任务的标签建立索引
        this.allTasks.forEach((task) => {
            if (task.metadata.tags && task.metadata.tags.length > 0) {
                task.metadata.tags.forEach((tag) => {
                    var _a;
                    // 跳过非字符串类型的标签
                    if (typeof tag !== "string") {
                        return;
                    }
                    // 规范化标签格式
                    const normalizedTag = this.normalizeTag(tag);
                    if (!this.allTagsMap.has(normalizedTag)) {
                        this.allTagsMap.set(normalizedTag, new Set());
                    }
                    (_a = this.allTagsMap.get(normalizedTag)) === null || _a === void 0 ? void 0 : _a.add(task.id);
                });
            }
        });
        // 更新标签计数
        if (this.countEl) {
            this.countEl.setText(`${this.allTagsMap.size} tags`);
        }
    }
    /**
     * 重写基类中的列表渲染方法，为标签创建层级视图
     */
    renderItemsList() {
        // 清空现有列表
        this.itemsListEl.empty();
        // 按字母排序标签
        const sortedTags = Array.from(this.allTagsMap.keys()).sort();
        // 创建层级结构
        const tagHierarchy = {};
        sortedTags.forEach((tag) => {
            const parts = tag.split("/");
            let current = tagHierarchy;
            parts.forEach((part, index) => {
                if (!current[part]) {
                    current[part] = {
                        _tasks: new Set(),
                        _path: parts.slice(0, index + 1).join("/"),
                    };
                }
                // 添加任务到此层级
                const taskIds = this.allTagsMap.get(tag);
                if (taskIds) {
                    taskIds.forEach((id) => current[part]._tasks.add(id));
                }
                current = current[part];
            });
        });
        // 渲染层级结构
        this.renderTagHierarchy(tagHierarchy, this.itemsListEl, 0);
    }
    /**
     * 递归渲染标签层级结构
     */
    renderTagHierarchy(node, parentEl, level) {
        // 按字母排序键，但排除元数据属性
        const keys = Object.keys(node)
            .filter((k) => !k.startsWith("_"))
            .sort();
        keys.forEach((key) => {
            const childNode = node[key];
            const fullPath = childNode._path;
            const taskCount = childNode._tasks.size;
            // 创建标签项
            const tagItem = parentEl.createDiv({
                cls: "tag-list-item",
                attr: {
                    "data-tag": fullPath,
                    "aria-label": fullPath,
                },
            });
            // 基于层级添加缩进
            if (level > 0) {
                const indentEl = tagItem.createDiv({
                    cls: "tag-indent",
                });
                indentEl.style.width = `${level * 20}px`;
            }
            // 标签图标和颜色
            const tagIconEl = tagItem.createDiv({
                cls: "tag-icon",
            });
            setIcon(tagIconEl, "hash");
            // 标签名称和计数
            const tagNameEl = tagItem.createDiv({
                cls: "tag-name",
            });
            tagNameEl.setText(key.replace("#", ""));
            const tagCountEl = tagItem.createDiv({
                cls: "tag-count",
            });
            tagCountEl.setText(taskCount.toString());
            // 存储完整标签路径
            tagItem.dataset.tag = fullPath;
            // 检查此标签是否已被选中
            if (this.selectedItems.items.includes(fullPath)) {
                tagItem.classList.add("selected");
            }
            // 添加点击处理
            this.registerDomEvent(tagItem, "click", (e) => {
                this.handleItemSelection(fullPath, e.ctrlKey || e.metaKey);
            });
            // 如果此节点有子节点，递归渲染它们
            const hasChildren = Object.keys(childNode).filter((k) => !k.startsWith("_"))
                .length > 0;
            if (hasChildren) {
                // 创建子项容器
                const childrenContainer = parentEl.createDiv({
                    cls: "tag-children",
                });
                // 渲染子项
                this.renderTagHierarchy(childNode, childrenContainer, level + 1);
            }
        });
    }
    /**
     * 更新基于所选标签的任务
     */
    updateSelectedTasks() {
        if (this.selectedItems.items.length === 0) {
            this.cleanupRenderers();
            this.renderEmptyTaskList(t(this.config.emptyStateText));
            return;
        }
        // 获取拥有任意选中标签的任务（OR逻辑）
        const taskSets = this.selectedItems.items.map((tag) => {
            // 为每个选中的标签，包含来自子标签的任务
            const matchingTasks = new Set();
            // 添加直接匹配
            const directMatches = this.allTagsMap.get(tag);
            if (directMatches) {
                directMatches.forEach((id) => matchingTasks.add(id));
            }
            // 添加来自子标签的匹配（以父标签路径开头的标签）
            this.allTagsMap.forEach((taskIds, childTag) => {
                if (childTag !== tag && childTag.startsWith(tag + "/")) {
                    taskIds.forEach((id) => matchingTasks.add(id));
                }
            });
            return matchingTasks;
        });
        if (taskSets.length === 0) {
            this.filteredTasks = [];
        }
        else {
            // 联合所有集合（OR逻辑）
            const resultTaskIds = new Set();
            // 合并所有集合
            taskSets.forEach((set) => {
                set.forEach((id) => resultTaskIds.add(id));
            });
            // 将任务ID转换为实际任务对象
            this.filteredTasks = this.allTasks.filter((task) => resultTaskIds.has(task.id));
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
        }
        // 决定是创建分区还是渲染平面/树状视图
        if (!this.isTreeView && this.selectedItems.items.length > 1) {
            this.createTagSections();
        }
        else {
            // 直接渲染，不分区
            this.tagSections = [];
            this.renderTaskList();
        }
    }
    /**
     * 创建标签分区（多选非树模式下使用）
     */
    createTagSections() {
        // 清除先前的分区及其渲染器
        this.cleanupRenderers();
        this.tagSections = [];
        // 按照匹配的选中标签分组任务（包括子标签）
        const tagTaskMap = new Map();
        this.selectedItems.items.forEach((tag) => {
            const tasksForThisTagBranch = this.filteredTasks.filter((task) => {
                if (!task.metadata.tags)
                    return false;
                return task.metadata.tags.some((taskTag) => 
                // 跳过非字符串类型的标签
                typeof taskTag === "string" &&
                    (taskTag === tag || taskTag.startsWith(tag + "/")));
            });
            if (tasksForThisTagBranch.length > 0) {
                tagTaskMap.set(tag, tasksForThisTagBranch);
            }
        });
        // 创建分区对象
        tagTaskMap.forEach((tasks, tag) => {
            this.tagSections.push({
                tag: tag,
                tasks: tasks,
                isExpanded: true,
            });
        });
        // 按标签名称排序分区
        this.tagSections.sort((a, b) => a.tag.localeCompare(b.tag));
        // 更新任务列表视图
        this.renderTagSections();
    }
    /**
     * 渲染标签分区（多选模式下）
     */
    renderTagSections() {
        // 更新标题
        let title = t(this.config.rightColumnDefaultTitle);
        if (this.selectedItems.items.length > 1) {
            title = `${this.selectedItems.items.length} ${t(this.config.multiSelectText)}`;
        }
        const countText = `${this.filteredTasks.length} ${t("tasks")}`;
        this.updateTaskListHeader(title, countText);
        // 渲染每个分区
        this.taskListContainerEl.empty();
        this.tagSections.forEach((section) => {
            const sectionEl = this.taskListContainerEl.createDiv({
                cls: "task-tag-section",
            });
            // 分区标题
            const headerEl = sectionEl.createDiv({ cls: "tag-section-header" });
            const toggleEl = headerEl.createDiv({ cls: "section-toggle" });
            setIcon(toggleEl, section.isExpanded ? "chevron-down" : "chevron-right");
            const titleEl = headerEl.createDiv({ cls: "section-title" });
            titleEl.setText(`#${section.tag.replace("#", "")}`);
            const countEl = headerEl.createDiv({ cls: "section-count" });
            countEl.setText(`${section.tasks.length}`);
            // 任务容器
            const taskListEl = sectionEl.createDiv({ cls: "section-tasks" });
            if (!section.isExpanded) {
                taskListEl.hide();
            }
            section.renderer = new TaskListRendererComponent(this, taskListEl, this.plugin, this.app, this.config.rendererContext);
            section.renderer.onTaskSelected = this.onTaskSelected;
            section.renderer.onTaskCompleted = this.onTaskCompleted;
            section.renderer.onTaskContextMenu = this.onTaskContextMenu;
            // 渲染此分区的任务（分区内始终使用列表视图）
            section.renderer.renderTasks(section.tasks, this.isTreeView, this.allTasksMap, t("No tasks found for this tag."));
            // 注册切换事件
            this.registerDomEvent(headerEl, "click", () => {
                section.isExpanded = !section.isExpanded;
                setIcon(toggleEl, section.isExpanded ? "chevron-down" : "chevron-right");
                section.isExpanded ? taskListEl.show() : taskListEl.hide();
            });
        });
    }
    /**
     * 清理渲染器，重写基类实现以处理分区
     */
    cleanupRenderers() {
        // 调用父类的渲染器清理
        super.cleanupRenderers();
        // 清理分区渲染器
        this.tagSections.forEach((section) => {
            if (section.renderer) {
                this.removeChild(section.renderer);
                section.renderer = undefined;
            }
        });
    }
    /**
     * 渲染任务列表，重写以支持分区模式
     */
    renderTaskList() {
        // 决定渲染模式：分区、平面或树状
        const useSections = !this.isTreeView &&
            this.tagSections.length > 0 &&
            this.selectedItems.items.length > 1;
        if (useSections) {
            this.renderTagSections();
        }
        else {
            // 调用父类实现的标准渲染
            super.renderTaskList();
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
            // 检查标签是否变化，需要重新构建/渲染
            const tagsChanged = !oldTask.metadata.tags ||
                !updatedTask.metadata.tags ||
                oldTask.metadata.tags.join(",") !==
                    updatedTask.metadata.tags.join(",");
            if (tagsChanged) {
                needsFullRefresh = true;
            }
            this.allTasks[taskIndex] = updatedTask;
        }
        else {
            this.allTasks.push(updatedTask);
            needsFullRefresh = true; // 新任务，需要完全刷新
        }
        // 如果标签变化或任务是新的，重建索引并完全刷新UI
        if (needsFullRefresh) {
            this.buildItemsIndex();
            this.renderItemsList(); // 更新左侧边栏
            this.updateSelectedTasks(); // 重新计算过滤后的任务并重新渲染右侧面板
        }
        else {
            // 否则，仅更新过滤列表中的任务
            const filteredIndex = this.filteredTasks.findIndex((t) => t.id === updatedTask.id);
            if (filteredIndex !== -1) {
                this.filteredTasks[filteredIndex] = updatedTask;
                // 找到正确的渲染器（主要或分区）并更新任务
                if (this.taskRenderer) {
                    this.taskRenderer.updateTask(updatedTask);
                }
                else {
                    // 检查分区模式
                    this.tagSections.forEach((section) => {
                        var _a, _b;
                        // 检查任务是否属于此分区的标签分支
                        if ((_a = updatedTask.metadata.tags) === null || _a === void 0 ? void 0 : _a.some((taskTag) => 
                        // 跳过非字符串类型的标签
                        typeof taskTag === "string" &&
                            (taskTag === section.tag ||
                                taskTag.startsWith(section.tag + "/")))) {
                            // 检查任务是否实际存在于此分区的列表中
                            if (section.tasks.some((t) => t.id === updatedTask.id)) {
                                (_b = section.renderer) === null || _b === void 0 ? void 0 : _b.updateTask(updatedTask);
                            }
                        }
                    });
                }
            }
            else {
                // 由于更新，任务可能变为可见/不可见，需要重新过滤
                this.updateSelectedTasks();
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGFnVmlld0NvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlRhZ1ZpZXdDb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFPLE9BQU8sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUV4QyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDMUMsT0FBTyx1QkFBdUIsQ0FBQztBQUMvQixPQUFPLG1DQUFtQyxDQUFDO0FBQzNDLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUV2RCxPQUFPLEVBQUUsaUJBQWlCLEVBQXVCLE1BQU0scUJBQXFCLENBQUM7QUFVN0UsTUFBTSxPQUFPLGdCQUFpQixTQUFRLGlCQUF5QjtJQUs5RCxZQUNDLFFBQXFCLEVBQ3JCLEdBQVEsRUFDUixNQUE2QjtRQUU3QixZQUFZO1FBQ1osTUFBTSxNQUFNLEdBQXdCO1lBQ25DLGVBQWUsRUFBRSxNQUFNO1lBQ3ZCLGVBQWUsRUFBRSxNQUFNO1lBQ3ZCLHVCQUF1QixFQUFFLE9BQU87WUFDaEMsZUFBZSxFQUFFLGVBQWU7WUFDaEMsY0FBYyxFQUFFLG1DQUFtQztZQUNuRCxlQUFlLEVBQUUsTUFBTTtZQUN2QixRQUFRLEVBQUUsTUFBTTtTQUNoQixDQUFDO1FBRUYsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBcEJ0QyxhQUFhO1FBQ0wsZUFBVSxHQUE2QixJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsZUFBZTtRQUNqRSxnQkFBVyxHQUFpQixFQUFFLENBQUMsQ0FBQyxlQUFlO0lBbUJ2RCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNLLFlBQVksQ0FBQyxHQUFXO1FBQy9CLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxFQUFFO1lBQzVCLE9BQU8sR0FBRyxDQUFDO1NBQ1g7UUFFRCxrQkFBa0I7UUFDbEIsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO1FBRTNCLGtEQUFrRDtRQUNsRCxJQUFJLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDeEMsT0FBTyxPQUFPLENBQUM7U0FDZjtRQUVELGVBQWU7UUFDZixPQUFPLElBQUksT0FBTyxFQUFFLENBQUM7SUFDdEIsQ0FBQztJQUVEOztPQUVHO0lBQ08sZUFBZTtRQUN4QixTQUFTO1FBQ1QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUV4QixlQUFlO1FBQ2YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUM5QixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7Z0JBQ3hELElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFOztvQkFDbEMsY0FBYztvQkFDZCxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBRTt3QkFDNUIsT0FBTztxQkFDUDtvQkFFRCxVQUFVO29CQUNWLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBRTdDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsRUFBRTt3QkFDeEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQztxQkFDOUM7b0JBQ0QsTUFBQSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsMENBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDbEQsQ0FBQyxDQUFDLENBQUM7YUFDSDtRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsU0FBUztRQUNULElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNqQixJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxPQUFPLENBQUMsQ0FBQztTQUNyRDtJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNPLGVBQWU7UUFDeEIsU0FBUztRQUNULElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFekIsVUFBVTtRQUNWLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBRTdELFNBQVM7UUFDVCxNQUFNLFlBQVksR0FBd0IsRUFBRSxDQUFDO1FBRTdDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUMxQixNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzdCLElBQUksT0FBTyxHQUFHLFlBQVksQ0FBQztZQUUzQixLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFO2dCQUM3QixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUNuQixPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUc7d0JBQ2YsTUFBTSxFQUFFLElBQUksR0FBRyxFQUFFO3dCQUNqQixLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7cUJBQzFDLENBQUM7aUJBQ0Y7Z0JBRUQsV0FBVztnQkFDWCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDekMsSUFBSSxPQUFPLEVBQUU7b0JBQ1osT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztpQkFDdEQ7Z0JBRUQsT0FBTyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN6QixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUgsU0FBUztRQUNULElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM1RCxDQUFDO0lBRUQ7O09BRUc7SUFDSyxrQkFBa0IsQ0FDekIsSUFBeUIsRUFDekIsUUFBcUIsRUFDckIsS0FBYTtRQUViLGtCQUFrQjtRQUNsQixNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQzthQUM1QixNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNqQyxJQUFJLEVBQUUsQ0FBQztRQUVULElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUNwQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDNUIsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQztZQUNqQyxNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztZQUV4QyxRQUFRO1lBQ1IsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQztnQkFDbEMsR0FBRyxFQUFFLGVBQWU7Z0JBQ3BCLElBQUksRUFBRTtvQkFDTCxVQUFVLEVBQUUsUUFBUTtvQkFDcEIsWUFBWSxFQUFFLFFBQVE7aUJBQ3RCO2FBQ0QsQ0FBQyxDQUFDO1lBRUgsV0FBVztZQUNYLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRTtnQkFDZCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDO29CQUNsQyxHQUFHLEVBQUUsWUFBWTtpQkFDakIsQ0FBQyxDQUFDO2dCQUNILFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLEdBQUcsS0FBSyxHQUFHLEVBQUUsSUFBSSxDQUFDO2FBQ3pDO1lBRUQsVUFBVTtZQUNWLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUM7Z0JBQ25DLEdBQUcsRUFBRSxVQUFVO2FBQ2YsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUUzQixVQUFVO1lBQ1YsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQztnQkFDbkMsR0FBRyxFQUFFLFVBQVU7YUFDZixDQUFDLENBQUM7WUFDSCxTQUFTLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFeEMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQztnQkFDcEMsR0FBRyxFQUFFLFdBQVc7YUFDaEIsQ0FBQyxDQUFDO1lBQ0gsVUFBVSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUV6QyxXQUFXO1lBQ1gsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEdBQUcsUUFBUSxDQUFDO1lBRS9CLGNBQWM7WUFDZCxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDaEQsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7YUFDbEM7WUFFRCxTQUFTO1lBQ1QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDN0MsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM1RCxDQUFDLENBQUMsQ0FBQztZQUVILG1CQUFtQjtZQUNuQixNQUFNLFdBQVcsR0FDaEIsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDdEQsTUFBTSxHQUFHLENBQUMsQ0FBQztZQUNkLElBQUksV0FBVyxFQUFFO2dCQUNoQixTQUFTO2dCQUNULE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQztvQkFDNUMsR0FBRyxFQUFFLGNBQWM7aUJBQ25CLENBQUMsQ0FBQztnQkFFSCxPQUFPO2dCQUNQLElBQUksQ0FBQyxrQkFBa0IsQ0FDdEIsU0FBUyxFQUNULGlCQUFpQixFQUNqQixLQUFLLEdBQUcsQ0FBQyxDQUNULENBQUM7YUFDRjtRQUNGLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ08sbUJBQW1CO1FBQzVCLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUMxQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztZQUN4RCxPQUFPO1NBQ1A7UUFFRCxzQkFBc0I7UUFDdEIsTUFBTSxRQUFRLEdBQWtCLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ3BFLHNCQUFzQjtZQUN0QixNQUFNLGFBQWEsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1lBRXhDLFNBQVM7WUFDVCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMvQyxJQUFJLGFBQWEsRUFBRTtnQkFDbEIsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ3JEO1lBRUQsMEJBQTBCO1lBQzFCLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxFQUFFO2dCQUM3QyxJQUFJLFFBQVEsS0FBSyxHQUFHLElBQUksUUFBUSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEVBQUU7b0JBQ3ZELE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztpQkFDL0M7WUFDRixDQUFDLENBQUMsQ0FBQztZQUVILE9BQU8sYUFBYSxDQUFDO1FBQ3RCLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUMxQixJQUFJLENBQUMsYUFBYSxHQUFHLEVBQUUsQ0FBQztTQUN4QjthQUFNO1lBQ04sZUFBZTtZQUNmLE1BQU0sYUFBYSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7WUFFeEMsU0FBUztZQUNULFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtnQkFDeEIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzVDLENBQUMsQ0FBQyxDQUFDO1lBRUgsaUJBQWlCO1lBQ2pCLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUNsRCxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FDMUIsQ0FBQztZQUVGLGNBQWM7WUFDZCxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDaEMsVUFBVTtnQkFDVixJQUFJLENBQUMsQ0FBQyxTQUFTLEtBQUssQ0FBQyxDQUFDLFNBQVMsRUFBRTtvQkFDaEMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUM1QjtnQkFFRCxjQUFjO2dCQUNkLE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDO2dCQUMzQyxJQUFJLFNBQVMsS0FBSyxTQUFTLEVBQUU7b0JBQzVCLE9BQU8sU0FBUyxHQUFHLFNBQVMsQ0FBQztpQkFDN0I7Z0JBRUQsZUFBZTtnQkFDZixNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sSUFBSSxNQUFNLENBQUMsZ0JBQWdCLENBQUM7Z0JBQy9ELE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxJQUFJLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztnQkFDL0QsT0FBTyxRQUFRLEdBQUcsUUFBUSxDQUFDO1lBQzVCLENBQUMsQ0FBQyxDQUFDO1NBQ0g7UUFFRCxxQkFBcUI7UUFDckIsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUM1RCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztTQUN6QjthQUFNO1lBQ04sV0FBVztZQUNYLElBQUksQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztTQUN0QjtJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNLLGlCQUFpQjtRQUN4QixlQUFlO1FBQ2YsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDeEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUM7UUFFdEIsdUJBQXVCO1FBQ3ZCLE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBQzdDLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ3hDLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFDaEUsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSTtvQkFBRSxPQUFPLEtBQUssQ0FBQztnQkFDdEMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQzdCLENBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsY0FBYztnQkFDZCxPQUFPLE9BQU8sS0FBSyxRQUFRO29CQUMzQixDQUFDLE9BQU8sS0FBSyxHQUFHLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FDbkQsQ0FBQztZQUNILENBQUMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxxQkFBcUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUNyQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO2FBQzNDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxTQUFTO1FBQ1QsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUNqQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQztnQkFDckIsR0FBRyxFQUFFLEdBQUc7Z0JBQ1IsS0FBSyxFQUFFLEtBQUs7Z0JBQ1osVUFBVSxFQUFFLElBQUk7YUFDaEIsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxZQUFZO1FBQ1osSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUU1RCxXQUFXO1FBQ1gsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7SUFDMUIsQ0FBQztJQUVEOztPQUVHO0lBQ0ssaUJBQWlCO1FBQ3hCLE9BQU87UUFDUCxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQ25ELElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUN4QyxLQUFLLEdBQUcsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUM5QyxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FDM0IsRUFBRSxDQUFDO1NBQ0o7UUFDRCxNQUFNLFNBQVMsR0FBRyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQy9ELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFNUMsU0FBUztRQUNULElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNqQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ3BDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUM7Z0JBQ3BELEdBQUcsRUFBRSxrQkFBa0I7YUFDdkIsQ0FBQyxDQUFDO1lBRUgsT0FBTztZQUNQLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDO1lBQ3BFLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO1lBQy9ELE9BQU8sQ0FDTixRQUFRLEVBQ1IsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQ3JELENBQUM7WUFDRixNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLGVBQWUsRUFBRSxDQUFDLENBQUM7WUFDN0QsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDcEQsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxlQUFlLEVBQUUsQ0FBQyxDQUFDO1lBQzdELE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFFM0MsT0FBTztZQUNQLE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUsZUFBZSxFQUFFLENBQUMsQ0FBQztZQUNqRSxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRTtnQkFDeEIsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO2FBQ2xCO1lBRUQsT0FBTyxDQUFDLFFBQVEsR0FBRyxJQUFJLHlCQUF5QixDQUMvQyxJQUFJLEVBQ0osVUFBVSxFQUNWLElBQUksQ0FBQyxNQUFNLEVBQ1gsSUFBSSxDQUFDLEdBQUcsRUFDUixJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FDM0IsQ0FBQztZQUNGLE9BQU8sQ0FBQyxRQUFRLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUM7WUFDdEQsT0FBTyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQztZQUN4RCxPQUFPLENBQUMsUUFBUSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztZQUU1RCx3QkFBd0I7WUFDeEIsT0FBTyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQzNCLE9BQU8sQ0FBQyxLQUFLLEVBQ2IsSUFBSSxDQUFDLFVBQVUsRUFDZixJQUFJLENBQUMsV0FBVyxFQUNoQixDQUFDLENBQUMsOEJBQThCLENBQUMsQ0FDakMsQ0FBQztZQUVGLFNBQVM7WUFDVCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQzdDLE9BQU8sQ0FBQyxVQUFVLEdBQUcsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDO2dCQUN6QyxPQUFPLENBQ04sUUFBUSxFQUNSLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUNyRCxDQUFDO2dCQUNGLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzVELENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDTyxnQkFBZ0I7UUFDekIsYUFBYTtRQUNiLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBRXpCLFVBQVU7UUFDVixJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ3BDLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRTtnQkFDckIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ25DLE9BQU8sQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFDO2FBQzdCO1FBQ0YsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDTyxjQUFjO1FBQ3ZCLGtCQUFrQjtRQUNsQixNQUFNLFdBQVcsR0FDaEIsQ0FBQyxJQUFJLENBQUMsVUFBVTtZQUNoQixJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDO1lBQzNCLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFFckMsSUFBSSxXQUFXLEVBQUU7WUFDaEIsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7U0FDekI7YUFBTTtZQUNOLGNBQWM7WUFDZCxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUM7U0FDdkI7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSSxVQUFVLENBQUMsV0FBaUI7UUFDbEMsSUFBSSxnQkFBZ0IsR0FBRyxLQUFLLENBQUM7UUFDN0IsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQ3hDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLFdBQVcsQ0FBQyxFQUFFLENBQzlCLENBQUM7UUFFRixJQUFJLFNBQVMsS0FBSyxDQUFDLENBQUMsRUFBRTtZQUNyQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3pDLHFCQUFxQjtZQUNyQixNQUFNLFdBQVcsR0FDaEIsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUk7Z0JBQ3RCLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJO2dCQUMxQixPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO29CQUM5QixXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFFdEMsSUFBSSxXQUFXLEVBQUU7Z0JBQ2hCLGdCQUFnQixHQUFHLElBQUksQ0FBQzthQUN4QjtZQUNELElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEdBQUcsV0FBVyxDQUFDO1NBQ3ZDO2FBQU07WUFDTixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNoQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsQ0FBQyxhQUFhO1NBQ3RDO1FBRUQsMkJBQTJCO1FBQzNCLElBQUksZ0JBQWdCLEVBQUU7WUFDckIsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLFNBQVM7WUFDakMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxzQkFBc0I7U0FDbEQ7YUFBTTtZQUNOLGlCQUFpQjtZQUNqQixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FDakQsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssV0FBVyxDQUFDLEVBQUUsQ0FDOUIsQ0FBQztZQUNGLElBQUksYUFBYSxLQUFLLENBQUMsQ0FBQyxFQUFFO2dCQUN6QixJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxHQUFHLFdBQVcsQ0FBQztnQkFFaEQsdUJBQXVCO2dCQUN2QixJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUU7b0JBQ3RCLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO2lCQUMxQztxQkFBTTtvQkFDTixTQUFTO29CQUNULElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7O3dCQUNwQyxtQkFBbUI7d0JBQ25CLElBQ0MsTUFBQSxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksMENBQUUsSUFBSSxDQUM5QixDQUFDLE9BQWUsRUFBRSxFQUFFO3dCQUNuQixjQUFjO3dCQUNkLE9BQU8sT0FBTyxLQUFLLFFBQVE7NEJBQzNCLENBQUMsT0FBTyxLQUFLLE9BQU8sQ0FBQyxHQUFHO2dDQUN2QixPQUFPLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FDeEMsRUFDQTs0QkFDRCxxQkFBcUI7NEJBQ3JCLElBQ0MsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQ2pCLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLFdBQVcsQ0FBQyxFQUFFLENBQzlCLEVBQ0E7Z0NBQ0QsTUFBQSxPQUFPLENBQUMsUUFBUSwwQ0FBRSxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7NkJBQzFDO3lCQUNEO29CQUNGLENBQUMsQ0FBQyxDQUFDO2lCQUNIO2FBQ0Q7aUJBQU07Z0JBQ04sMkJBQTJCO2dCQUMzQixJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQzthQUMzQjtTQUNEO0lBQ0YsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwLCBzZXRJY29uIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiQC90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCBcIkAvc3R5bGVzL3RhZy12aWV3LmNzc1wiO1xyXG5pbXBvcnQgXCJAL3N0eWxlcy92aWV3LXR3by1jb2x1bW4tYmFzZS5jc3NcIjtcclxuaW1wb3J0IHsgVGFza0xpc3RSZW5kZXJlckNvbXBvbmVudCB9IGZyb20gXCIuL1Rhc2tMaXN0XCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjtcclxuaW1wb3J0IHsgVHdvQ29sdW1uVmlld0Jhc2UsIFR3b0NvbHVtblZpZXdDb25maWcgfSBmcm9tIFwiLi9Ud29Db2x1bW5WaWV3QmFzZVwiO1xyXG5cclxuLy8g55So5LqO5a2Y5YKo5qCH562+6IqC55qE5pWw5o2u57uT5p6EXHJcbmludGVyZmFjZSBUYWdTZWN0aW9uIHtcclxuXHR0YWc6IHN0cmluZztcclxuXHR0YXNrczogVGFza1tdO1xyXG5cdGlzRXhwYW5kZWQ6IGJvb2xlYW47XHJcblx0cmVuZGVyZXI/OiBUYXNrTGlzdFJlbmRlcmVyQ29tcG9uZW50O1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVGFnVmlld0NvbXBvbmVudCBleHRlbmRzIFR3b0NvbHVtblZpZXdCYXNlPHN0cmluZz4ge1xyXG5cdC8vIOeJueWumuS6juagh+etvuinhuWbvueahOeKtuaAgVxyXG5cdHByaXZhdGUgYWxsVGFnc01hcDogTWFwPHN0cmluZywgU2V0PHN0cmluZz4+ID0gbmV3IE1hcCgpOyAvLyDmoIfnrb4gLT4g5Lu75YqhSUTpm4blkIhcclxuXHRwcml2YXRlIHRhZ1NlY3Rpb25zOiBUYWdTZWN0aW9uW10gPSBbXTsgLy8g5LuF5Zyo5aSa6YCJ5LiU6Z2e5qCR5qih5byP5LiL5L2/55SoXHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cGFyZW50RWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0YXBwOiBBcHAsXHJcblx0XHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpblxyXG5cdCkge1xyXG5cdFx0Ly8g6YWN572u5Z+657G76ZyA6KaB55qE5Y+C5pWwXHJcblx0XHRjb25zdCBjb25maWc6IFR3b0NvbHVtblZpZXdDb25maWcgPSB7XHJcblx0XHRcdGNsYXNzTmFtZVByZWZpeDogXCJ0YWdzXCIsXHJcblx0XHRcdGxlZnRDb2x1bW5UaXRsZTogXCJUYWdzXCIsXHJcblx0XHRcdHJpZ2h0Q29sdW1uRGVmYXVsdFRpdGxlOiBcIlRhc2tzXCIsXHJcblx0XHRcdG11bHRpU2VsZWN0VGV4dDogXCJ0YWdzIHNlbGVjdGVkXCIsXHJcblx0XHRcdGVtcHR5U3RhdGVUZXh0OiBcIlNlbGVjdCBhIHRhZyB0byBzZWUgcmVsYXRlZCB0YXNrc1wiLFxyXG5cdFx0XHRyZW5kZXJlckNvbnRleHQ6IFwidGFnc1wiLFxyXG5cdFx0XHRpdGVtSWNvbjogXCJoYXNoXCIsXHJcblx0XHR9O1xyXG5cclxuXHRcdHN1cGVyKHBhcmVudEVsLCBhcHAsIHBsdWdpbiwgY29uZmlnKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIE5vcm1hbGl6ZSBhIHRhZyB0byBlbnN1cmUgaXQgaGFzIGEgIyBwcmVmaXhcclxuXHQgKiBAcGFyYW0gdGFnIFRoZSB0YWcgdG8gbm9ybWFsaXplXHJcblx0ICogQHJldHVybnMgTm9ybWFsaXplZCB0YWcgd2l0aCAjIHByZWZpeFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgbm9ybWFsaXplVGFnKHRhZzogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdGlmICh0eXBlb2YgdGFnICE9PSAnc3RyaW5nJykge1xyXG5cdFx0XHRyZXR1cm4gdGFnO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvLyBUcmltIHdoaXRlc3BhY2VcclxuXHRcdGNvbnN0IHRyaW1tZWQgPSB0YWcudHJpbSgpO1xyXG5cdFx0XHJcblx0XHQvLyBJZiBlbXB0eSBvciBhbHJlYWR5IHN0YXJ0cyB3aXRoICMsIHJldHVybiBhcyBpc1xyXG5cdFx0aWYgKCF0cmltbWVkIHx8IHRyaW1tZWQuc3RhcnRzV2l0aCgnIycpKSB7XHJcblx0XHRcdHJldHVybiB0cmltbWVkO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvLyBBZGQgIyBwcmVmaXhcclxuXHRcdHJldHVybiBgIyR7dHJpbW1lZH1gO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICog6YeN5YaZ5Z+657G75Lit55qE57Si5byV5p6E5bu65pa55rOV77yM5Li65qCH562+5Yib5bu657Si5byVXHJcblx0ICovXHJcblx0cHJvdGVjdGVkIGJ1aWxkSXRlbXNJbmRleCgpOiB2b2lkIHtcclxuXHRcdC8vIOa4hemZpOW3suaciee0ouW8lVxyXG5cdFx0dGhpcy5hbGxUYWdzTWFwLmNsZWFyKCk7XHJcblxyXG5cdFx0Ly8g5Li65q+P5Liq5Lu75Yqh55qE5qCH562+5bu656uL57Si5byVXHJcblx0XHR0aGlzLmFsbFRhc2tzLmZvckVhY2goKHRhc2spID0+IHtcclxuXHRcdFx0aWYgKHRhc2subWV0YWRhdGEudGFncyAmJiB0YXNrLm1ldGFkYXRhLnRhZ3MubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdHRhc2subWV0YWRhdGEudGFncy5mb3JFYWNoKCh0YWcpID0+IHtcclxuXHRcdFx0XHRcdC8vIOi3s+i/h+mdnuWtl+espuS4suexu+Wei+eahOagh+etvlxyXG5cdFx0XHRcdFx0aWYgKHR5cGVvZiB0YWcgIT09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIOinhOiMg+WMluagh+etvuagvOW8j1xyXG5cdFx0XHRcdFx0Y29uc3Qgbm9ybWFsaXplZFRhZyA9IHRoaXMubm9ybWFsaXplVGFnKHRhZyk7XHJcblxyXG5cdFx0XHRcdFx0aWYgKCF0aGlzLmFsbFRhZ3NNYXAuaGFzKG5vcm1hbGl6ZWRUYWcpKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMuYWxsVGFnc01hcC5zZXQobm9ybWFsaXplZFRhZywgbmV3IFNldCgpKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdHRoaXMuYWxsVGFnc01hcC5nZXQobm9ybWFsaXplZFRhZyk/LmFkZCh0YXNrLmlkKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8g5pu05paw5qCH562+6K6h5pWwXHJcblx0XHRpZiAodGhpcy5jb3VudEVsKSB7XHJcblx0XHRcdHRoaXMuY291bnRFbC5zZXRUZXh0KGAke3RoaXMuYWxsVGFnc01hcC5zaXplfSB0YWdzYCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiDph43lhpnln7rnsbvkuK3nmoTliJfooajmuLLmn5Pmlrnms5XvvIzkuLrmoIfnrb7liJvlu7rlsYLnuqfop4blm75cclxuXHQgKi9cclxuXHRwcm90ZWN0ZWQgcmVuZGVySXRlbXNMaXN0KCk6IHZvaWQge1xyXG5cdFx0Ly8g5riF56m6546w5pyJ5YiX6KGoXHJcblx0XHR0aGlzLml0ZW1zTGlzdEVsLmVtcHR5KCk7XHJcblxyXG5cdFx0Ly8g5oyJ5a2X5q+N5o6S5bqP5qCH562+XHJcblx0XHRjb25zdCBzb3J0ZWRUYWdzID0gQXJyYXkuZnJvbSh0aGlzLmFsbFRhZ3NNYXAua2V5cygpKS5zb3J0KCk7XHJcblxyXG5cdFx0Ly8g5Yib5bu65bGC57qn57uT5p6EXHJcblx0XHRjb25zdCB0YWdIaWVyYXJjaHk6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcclxuXHJcblx0XHRzb3J0ZWRUYWdzLmZvckVhY2goKHRhZykgPT4ge1xyXG5cdFx0XHRjb25zdCBwYXJ0cyA9IHRhZy5zcGxpdChcIi9cIik7XHJcblx0XHRcdGxldCBjdXJyZW50ID0gdGFnSGllcmFyY2h5O1xyXG5cclxuXHRcdFx0cGFydHMuZm9yRWFjaCgocGFydCwgaW5kZXgpID0+IHtcclxuXHRcdFx0XHRpZiAoIWN1cnJlbnRbcGFydF0pIHtcclxuXHRcdFx0XHRcdGN1cnJlbnRbcGFydF0gPSB7XHJcblx0XHRcdFx0XHRcdF90YXNrczogbmV3IFNldCgpLFxyXG5cdFx0XHRcdFx0XHRfcGF0aDogcGFydHMuc2xpY2UoMCwgaW5kZXggKyAxKS5qb2luKFwiL1wiKSxcclxuXHRcdFx0XHRcdH07XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyDmt7vliqDku7vliqHliLDmraTlsYLnuqdcclxuXHRcdFx0XHRjb25zdCB0YXNrSWRzID0gdGhpcy5hbGxUYWdzTWFwLmdldCh0YWcpO1xyXG5cdFx0XHRcdGlmICh0YXNrSWRzKSB7XHJcblx0XHRcdFx0XHR0YXNrSWRzLmZvckVhY2goKGlkKSA9PiBjdXJyZW50W3BhcnRdLl90YXNrcy5hZGQoaWQpKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGN1cnJlbnQgPSBjdXJyZW50W3BhcnRdO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIOa4suafk+Wxgue6p+e7k+aehFxyXG5cdFx0dGhpcy5yZW5kZXJUYWdIaWVyYXJjaHkodGFnSGllcmFyY2h5LCB0aGlzLml0ZW1zTGlzdEVsLCAwKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIOmAkuW9kua4suafk+agh+etvuWxgue6p+e7k+aehFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgcmVuZGVyVGFnSGllcmFyY2h5KFxyXG5cdFx0bm9kZTogUmVjb3JkPHN0cmluZywgYW55PixcclxuXHRcdHBhcmVudEVsOiBIVE1MRWxlbWVudCxcclxuXHRcdGxldmVsOiBudW1iZXJcclxuXHQpIHtcclxuXHRcdC8vIOaMieWtl+avjeaOkuW6j+mUru+8jOS9huaOkumZpOWFg+aVsOaNruWxnuaAp1xyXG5cdFx0Y29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKG5vZGUpXHJcblx0XHRcdC5maWx0ZXIoKGspID0+ICFrLnN0YXJ0c1dpdGgoXCJfXCIpKVxyXG5cdFx0XHQuc29ydCgpO1xyXG5cclxuXHRcdGtleXMuZm9yRWFjaCgoa2V5KSA9PiB7XHJcblx0XHRcdGNvbnN0IGNoaWxkTm9kZSA9IG5vZGVba2V5XTtcclxuXHRcdFx0Y29uc3QgZnVsbFBhdGggPSBjaGlsZE5vZGUuX3BhdGg7XHJcblx0XHRcdGNvbnN0IHRhc2tDb3VudCA9IGNoaWxkTm9kZS5fdGFza3Muc2l6ZTtcclxuXHJcblx0XHRcdC8vIOWIm+W7uuagh+etvumhuVxyXG5cdFx0XHRjb25zdCB0YWdJdGVtID0gcGFyZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwidGFnLWxpc3QtaXRlbVwiLFxyXG5cdFx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHRcdFwiZGF0YS10YWdcIjogZnVsbFBhdGgsXHJcblx0XHRcdFx0XHRcImFyaWEtbGFiZWxcIjogZnVsbFBhdGgsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyDln7rkuo7lsYLnuqfmt7vliqDnvKnov5tcclxuXHRcdFx0aWYgKGxldmVsID4gMCkge1xyXG5cdFx0XHRcdGNvbnN0IGluZGVudEVsID0gdGFnSXRlbS5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdFx0Y2xzOiBcInRhZy1pbmRlbnRcIixcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRpbmRlbnRFbC5zdHlsZS53aWR0aCA9IGAke2xldmVsICogMjB9cHhgO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyDmoIfnrb7lm77moIflkozpopzoibJcclxuXHRcdFx0Y29uc3QgdGFnSWNvbkVsID0gdGFnSXRlbS5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJ0YWctaWNvblwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0c2V0SWNvbih0YWdJY29uRWwsIFwiaGFzaFwiKTtcclxuXHJcblx0XHRcdC8vIOagh+etvuWQjeensOWSjOiuoeaVsFxyXG5cdFx0XHRjb25zdCB0YWdOYW1lRWwgPSB0YWdJdGVtLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcInRhZy1uYW1lXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHR0YWdOYW1lRWwuc2V0VGV4dChrZXkucmVwbGFjZShcIiNcIiwgXCJcIikpO1xyXG5cclxuXHRcdFx0Y29uc3QgdGFnQ291bnRFbCA9IHRhZ0l0ZW0uY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwidGFnLWNvdW50XCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHR0YWdDb3VudEVsLnNldFRleHQodGFza0NvdW50LnRvU3RyaW5nKCkpO1xyXG5cclxuXHRcdFx0Ly8g5a2Y5YKo5a6M5pW05qCH562+6Lev5b6EXHJcblx0XHRcdHRhZ0l0ZW0uZGF0YXNldC50YWcgPSBmdWxsUGF0aDtcclxuXHJcblx0XHRcdC8vIOajgOafpeatpOagh+etvuaYr+WQpuW3suiiq+mAieS4rVxyXG5cdFx0XHRpZiAodGhpcy5zZWxlY3RlZEl0ZW1zLml0ZW1zLmluY2x1ZGVzKGZ1bGxQYXRoKSkge1xyXG5cdFx0XHRcdHRhZ0l0ZW0uY2xhc3NMaXN0LmFkZChcInNlbGVjdGVkXCIpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyDmt7vliqDngrnlh7vlpITnkIZcclxuXHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KHRhZ0l0ZW0sIFwiY2xpY2tcIiwgKGUpID0+IHtcclxuXHRcdFx0XHR0aGlzLmhhbmRsZUl0ZW1TZWxlY3Rpb24oZnVsbFBhdGgsIGUuY3RybEtleSB8fCBlLm1ldGFLZXkpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIOWmguaenOatpOiKgueCueacieWtkOiKgueCue+8jOmAkuW9kua4suafk+Wug+S7rFxyXG5cdFx0XHRjb25zdCBoYXNDaGlsZHJlbiA9XHJcblx0XHRcdFx0T2JqZWN0LmtleXMoY2hpbGROb2RlKS5maWx0ZXIoKGspID0+ICFrLnN0YXJ0c1dpdGgoXCJfXCIpKVxyXG5cdFx0XHRcdFx0Lmxlbmd0aCA+IDA7XHJcblx0XHRcdGlmIChoYXNDaGlsZHJlbikge1xyXG5cdFx0XHRcdC8vIOWIm+W7uuWtkOmhueWuueWZqFxyXG5cdFx0XHRcdGNvbnN0IGNoaWxkcmVuQ29udGFpbmVyID0gcGFyZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRcdGNsczogXCJ0YWctY2hpbGRyZW5cIixcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8g5riy5p+T5a2Q6aG5XHJcblx0XHRcdFx0dGhpcy5yZW5kZXJUYWdIaWVyYXJjaHkoXHJcblx0XHRcdFx0XHRjaGlsZE5vZGUsXHJcblx0XHRcdFx0XHRjaGlsZHJlbkNvbnRhaW5lcixcclxuXHRcdFx0XHRcdGxldmVsICsgMVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICog5pu05paw5Z+65LqO5omA6YCJ5qCH562+55qE5Lu75YqhXHJcblx0ICovXHJcblx0cHJvdGVjdGVkIHVwZGF0ZVNlbGVjdGVkVGFza3MoKTogdm9pZCB7XHJcblx0XHRpZiAodGhpcy5zZWxlY3RlZEl0ZW1zLml0ZW1zLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHR0aGlzLmNsZWFudXBSZW5kZXJlcnMoKTtcclxuXHRcdFx0dGhpcy5yZW5kZXJFbXB0eVRhc2tMaXN0KHQodGhpcy5jb25maWcuZW1wdHlTdGF0ZVRleHQpKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIOiOt+WPluaLpeacieS7u+aEj+mAieS4reagh+etvueahOS7u+WKoe+8iE9S6YC76L6R77yJXHJcblx0XHRjb25zdCB0YXNrU2V0czogU2V0PHN0cmluZz5bXSA9IHRoaXMuc2VsZWN0ZWRJdGVtcy5pdGVtcy5tYXAoKHRhZykgPT4ge1xyXG5cdFx0XHQvLyDkuLrmr4/kuKrpgInkuK3nmoTmoIfnrb7vvIzljIXlkKvmnaXoh6rlrZDmoIfnrb7nmoTku7vliqFcclxuXHRcdFx0Y29uc3QgbWF0Y2hpbmdUYXNrcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG5cclxuXHRcdFx0Ly8g5re75Yqg55u05o6l5Yy56YWNXHJcblx0XHRcdGNvbnN0IGRpcmVjdE1hdGNoZXMgPSB0aGlzLmFsbFRhZ3NNYXAuZ2V0KHRhZyk7XHJcblx0XHRcdGlmIChkaXJlY3RNYXRjaGVzKSB7XHJcblx0XHRcdFx0ZGlyZWN0TWF0Y2hlcy5mb3JFYWNoKChpZCkgPT4gbWF0Y2hpbmdUYXNrcy5hZGQoaWQpKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8g5re75Yqg5p2l6Ieq5a2Q5qCH562+55qE5Yy56YWN77yI5Lul54i25qCH562+6Lev5b6E5byA5aS055qE5qCH562+77yJXHJcblx0XHRcdHRoaXMuYWxsVGFnc01hcC5mb3JFYWNoKCh0YXNrSWRzLCBjaGlsZFRhZykgPT4ge1xyXG5cdFx0XHRcdGlmIChjaGlsZFRhZyAhPT0gdGFnICYmIGNoaWxkVGFnLnN0YXJ0c1dpdGgodGFnICsgXCIvXCIpKSB7XHJcblx0XHRcdFx0XHR0YXNrSWRzLmZvckVhY2goKGlkKSA9PiBtYXRjaGluZ1Rhc2tzLmFkZChpZCkpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRyZXR1cm4gbWF0Y2hpbmdUYXNrcztcclxuXHRcdH0pO1xyXG5cclxuXHRcdGlmICh0YXNrU2V0cy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0dGhpcy5maWx0ZXJlZFRhc2tzID0gW107XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyDogZTlkIjmiYDmnInpm4blkIjvvIhPUumAu+i+ke+8iVxyXG5cdFx0XHRjb25zdCByZXN1bHRUYXNrSWRzID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcblxyXG5cdFx0XHQvLyDlkIjlubbmiYDmnInpm4blkIhcclxuXHRcdFx0dGFza1NldHMuZm9yRWFjaCgoc2V0KSA9PiB7XHJcblx0XHRcdFx0c2V0LmZvckVhY2goKGlkKSA9PiByZXN1bHRUYXNrSWRzLmFkZChpZCkpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIOWwhuS7u+WKoUlE6L2s5o2i5Li65a6e6ZmF5Lu75Yqh5a+56LGhXHJcblx0XHRcdHRoaXMuZmlsdGVyZWRUYXNrcyA9IHRoaXMuYWxsVGFza3MuZmlsdGVyKCh0YXNrKSA9PlxyXG5cdFx0XHRcdHJlc3VsdFRhc2tJZHMuaGFzKHRhc2suaWQpXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyDmjInkvJjlhYjnuqflkozmiKrmraLml6XmnJ/mjpLluo9cclxuXHRcdFx0dGhpcy5maWx0ZXJlZFRhc2tzLnNvcnQoKGEsIGIpID0+IHtcclxuXHRcdFx0XHQvLyDpppblhYjmjInlrozmiJDnirbmgIFcclxuXHRcdFx0XHRpZiAoYS5jb21wbGV0ZWQgIT09IGIuY29tcGxldGVkKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gYS5jb21wbGV0ZWQgPyAxIDogLTE7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyDnhLblkI7mjInkvJjlhYjnuqfvvIjpq5jliLDkvY7vvIlcclxuXHRcdFx0XHRjb25zdCBwcmlvcml0eUEgPSBhLm1ldGFkYXRhLnByaW9yaXR5IHx8IDA7XHJcblx0XHRcdFx0Y29uc3QgcHJpb3JpdHlCID0gYi5tZXRhZGF0YS5wcmlvcml0eSB8fCAwO1xyXG5cdFx0XHRcdGlmIChwcmlvcml0eUEgIT09IHByaW9yaXR5Qikge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHByaW9yaXR5QiAtIHByaW9yaXR5QTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIOeEtuWQjuaMieaIquatouaXpeacn++8iOaXqeWIsOaZmu+8iVxyXG5cdFx0XHRcdGNvbnN0IGR1ZURhdGVBID0gYS5tZXRhZGF0YS5kdWVEYXRlIHx8IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSO1xyXG5cdFx0XHRcdGNvbnN0IGR1ZURhdGVCID0gYi5tZXRhZGF0YS5kdWVEYXRlIHx8IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSO1xyXG5cdFx0XHRcdHJldHVybiBkdWVEYXRlQSAtIGR1ZURhdGVCO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyDlhrPlrprmmK/liJvlu7rliIbljLrov5jmmK/muLLmn5PlubPpnaIv5qCR54q26KeG5Zu+XHJcblx0XHRpZiAoIXRoaXMuaXNUcmVlVmlldyAmJiB0aGlzLnNlbGVjdGVkSXRlbXMuaXRlbXMubGVuZ3RoID4gMSkge1xyXG5cdFx0XHR0aGlzLmNyZWF0ZVRhZ1NlY3Rpb25zKCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyDnm7TmjqXmuLLmn5PvvIzkuI3liIbljLpcclxuXHRcdFx0dGhpcy50YWdTZWN0aW9ucyA9IFtdO1xyXG5cdFx0XHR0aGlzLnJlbmRlclRhc2tMaXN0KCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiDliJvlu7rmoIfnrb7liIbljLrvvIjlpJrpgInpnZ7moJHmqKHlvI/kuIvkvb/nlKjvvIlcclxuXHQgKi9cclxuXHRwcml2YXRlIGNyZWF0ZVRhZ1NlY3Rpb25zKCk6IHZvaWQge1xyXG5cdFx0Ly8g5riF6Zmk5YWI5YmN55qE5YiG5Yy65Y+K5YW25riy5p+T5ZmoXHJcblx0XHR0aGlzLmNsZWFudXBSZW5kZXJlcnMoKTtcclxuXHRcdHRoaXMudGFnU2VjdGlvbnMgPSBbXTtcclxuXHJcblx0XHQvLyDmjInnhafljLnphY3nmoTpgInkuK3moIfnrb7liIbnu4Tku7vliqHvvIjljIXmi6zlrZDmoIfnrb7vvIlcclxuXHRcdGNvbnN0IHRhZ1Rhc2tNYXAgPSBuZXcgTWFwPHN0cmluZywgVGFza1tdPigpO1xyXG5cdFx0dGhpcy5zZWxlY3RlZEl0ZW1zLml0ZW1zLmZvckVhY2goKHRhZykgPT4ge1xyXG5cdFx0XHRjb25zdCB0YXNrc0ZvclRoaXNUYWdCcmFuY2ggPSB0aGlzLmZpbHRlcmVkVGFza3MuZmlsdGVyKCh0YXNrKSA9PiB7XHJcblx0XHRcdFx0aWYgKCF0YXNrLm1ldGFkYXRhLnRhZ3MpIHJldHVybiBmYWxzZTtcclxuXHRcdFx0XHRyZXR1cm4gdGFzay5tZXRhZGF0YS50YWdzLnNvbWUoXHJcblx0XHRcdFx0XHQodGFza1RhZykgPT5cclxuXHRcdFx0XHRcdFx0Ly8g6Lez6L+H6Z2e5a2X56ym5Liy57G75Z6L55qE5qCH562+XHJcblx0XHRcdFx0XHRcdHR5cGVvZiB0YXNrVGFnID09PSBcInN0cmluZ1wiICYmXHJcblx0XHRcdFx0XHRcdCh0YXNrVGFnID09PSB0YWcgfHwgdGFza1RhZy5zdGFydHNXaXRoKHRhZyArIFwiL1wiKSlcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGlmICh0YXNrc0ZvclRoaXNUYWdCcmFuY2gubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdHRhZ1Rhc2tNYXAuc2V0KHRhZywgdGFza3NGb3JUaGlzVGFnQnJhbmNoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8g5Yib5bu65YiG5Yy65a+56LGhXHJcblx0XHR0YWdUYXNrTWFwLmZvckVhY2goKHRhc2tzLCB0YWcpID0+IHtcclxuXHRcdFx0dGhpcy50YWdTZWN0aW9ucy5wdXNoKHtcclxuXHRcdFx0XHR0YWc6IHRhZyxcclxuXHRcdFx0XHR0YXNrczogdGFza3MsXHJcblx0XHRcdFx0aXNFeHBhbmRlZDogdHJ1ZSxcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyDmjInmoIfnrb7lkI3np7DmjpLluo/liIbljLpcclxuXHRcdHRoaXMudGFnU2VjdGlvbnMuc29ydCgoYSwgYikgPT4gYS50YWcubG9jYWxlQ29tcGFyZShiLnRhZykpO1xyXG5cclxuXHRcdC8vIOabtOaWsOS7u+WKoeWIl+ihqOinhuWbvlxyXG5cdFx0dGhpcy5yZW5kZXJUYWdTZWN0aW9ucygpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICog5riy5p+T5qCH562+5YiG5Yy677yI5aSa6YCJ5qih5byP5LiL77yJXHJcblx0ICovXHJcblx0cHJpdmF0ZSByZW5kZXJUYWdTZWN0aW9ucygpOiB2b2lkIHtcclxuXHRcdC8vIOabtOaWsOagh+mimFxyXG5cdFx0bGV0IHRpdGxlID0gdCh0aGlzLmNvbmZpZy5yaWdodENvbHVtbkRlZmF1bHRUaXRsZSk7XHJcblx0XHRpZiAodGhpcy5zZWxlY3RlZEl0ZW1zLml0ZW1zLmxlbmd0aCA+IDEpIHtcclxuXHRcdFx0dGl0bGUgPSBgJHt0aGlzLnNlbGVjdGVkSXRlbXMuaXRlbXMubGVuZ3RofSAke3QoXHJcblx0XHRcdFx0dGhpcy5jb25maWcubXVsdGlTZWxlY3RUZXh0XHJcblx0XHRcdCl9YDtcclxuXHRcdH1cclxuXHRcdGNvbnN0IGNvdW50VGV4dCA9IGAke3RoaXMuZmlsdGVyZWRUYXNrcy5sZW5ndGh9ICR7dChcInRhc2tzXCIpfWA7XHJcblx0XHR0aGlzLnVwZGF0ZVRhc2tMaXN0SGVhZGVyKHRpdGxlLCBjb3VudFRleHQpO1xyXG5cclxuXHRcdC8vIOa4suafk+avj+S4quWIhuWMulxyXG5cdFx0dGhpcy50YXNrTGlzdENvbnRhaW5lckVsLmVtcHR5KCk7XHJcblx0XHR0aGlzLnRhZ1NlY3Rpb25zLmZvckVhY2goKHNlY3Rpb24pID0+IHtcclxuXHRcdFx0Y29uc3Qgc2VjdGlvbkVsID0gdGhpcy50YXNrTGlzdENvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcInRhc2stdGFnLXNlY3Rpb25cIixcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyDliIbljLrmoIfpophcclxuXHRcdFx0Y29uc3QgaGVhZGVyRWwgPSBzZWN0aW9uRWwuY3JlYXRlRGl2KHsgY2xzOiBcInRhZy1zZWN0aW9uLWhlYWRlclwiIH0pO1xyXG5cdFx0XHRjb25zdCB0b2dnbGVFbCA9IGhlYWRlckVsLmNyZWF0ZURpdih7IGNsczogXCJzZWN0aW9uLXRvZ2dsZVwiIH0pO1xyXG5cdFx0XHRzZXRJY29uKFxyXG5cdFx0XHRcdHRvZ2dsZUVsLFxyXG5cdFx0XHRcdHNlY3Rpb24uaXNFeHBhbmRlZCA/IFwiY2hldnJvbi1kb3duXCIgOiBcImNoZXZyb24tcmlnaHRcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRjb25zdCB0aXRsZUVsID0gaGVhZGVyRWwuY3JlYXRlRGl2KHsgY2xzOiBcInNlY3Rpb24tdGl0bGVcIiB9KTtcclxuXHRcdFx0dGl0bGVFbC5zZXRUZXh0KGAjJHtzZWN0aW9uLnRhZy5yZXBsYWNlKFwiI1wiLCBcIlwiKX1gKTtcclxuXHRcdFx0Y29uc3QgY291bnRFbCA9IGhlYWRlckVsLmNyZWF0ZURpdih7IGNsczogXCJzZWN0aW9uLWNvdW50XCIgfSk7XHJcblx0XHRcdGNvdW50RWwuc2V0VGV4dChgJHtzZWN0aW9uLnRhc2tzLmxlbmd0aH1gKTtcclxuXHJcblx0XHRcdC8vIOS7u+WKoeWuueWZqFxyXG5cdFx0XHRjb25zdCB0YXNrTGlzdEVsID0gc2VjdGlvbkVsLmNyZWF0ZURpdih7IGNsczogXCJzZWN0aW9uLXRhc2tzXCIgfSk7XHJcblx0XHRcdGlmICghc2VjdGlvbi5pc0V4cGFuZGVkKSB7XHJcblx0XHRcdFx0dGFza0xpc3RFbC5oaWRlKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHNlY3Rpb24ucmVuZGVyZXIgPSBuZXcgVGFza0xpc3RSZW5kZXJlckNvbXBvbmVudChcclxuXHRcdFx0XHR0aGlzLFxyXG5cdFx0XHRcdHRhc2tMaXN0RWwsXHJcblx0XHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0dGhpcy5jb25maWcucmVuZGVyZXJDb250ZXh0XHJcblx0XHRcdCk7XHJcblx0XHRcdHNlY3Rpb24ucmVuZGVyZXIub25UYXNrU2VsZWN0ZWQgPSB0aGlzLm9uVGFza1NlbGVjdGVkO1xyXG5cdFx0XHRzZWN0aW9uLnJlbmRlcmVyLm9uVGFza0NvbXBsZXRlZCA9IHRoaXMub25UYXNrQ29tcGxldGVkO1xyXG5cdFx0XHRzZWN0aW9uLnJlbmRlcmVyLm9uVGFza0NvbnRleHRNZW51ID0gdGhpcy5vblRhc2tDb250ZXh0TWVudTtcclxuXHJcblx0XHRcdC8vIOa4suafk+atpOWIhuWMuueahOS7u+WKoe+8iOWIhuWMuuWGheWni+e7iOS9v+eUqOWIl+ihqOinhuWbvu+8iVxyXG5cdFx0XHRzZWN0aW9uLnJlbmRlcmVyLnJlbmRlclRhc2tzKFxyXG5cdFx0XHRcdHNlY3Rpb24udGFza3MsXHJcblx0XHRcdFx0dGhpcy5pc1RyZWVWaWV3LFxyXG5cdFx0XHRcdHRoaXMuYWxsVGFza3NNYXAsXHJcblx0XHRcdFx0dChcIk5vIHRhc2tzIGZvdW5kIGZvciB0aGlzIHRhZy5cIilcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIOazqOWGjOWIh+aNouS6i+S7tlxyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoaGVhZGVyRWwsIFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdHNlY3Rpb24uaXNFeHBhbmRlZCA9ICFzZWN0aW9uLmlzRXhwYW5kZWQ7XHJcblx0XHRcdFx0c2V0SWNvbihcclxuXHRcdFx0XHRcdHRvZ2dsZUVsLFxyXG5cdFx0XHRcdFx0c2VjdGlvbi5pc0V4cGFuZGVkID8gXCJjaGV2cm9uLWRvd25cIiA6IFwiY2hldnJvbi1yaWdodFwiXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRzZWN0aW9uLmlzRXhwYW5kZWQgPyB0YXNrTGlzdEVsLnNob3coKSA6IHRhc2tMaXN0RWwuaGlkZSgpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICog5riF55CG5riy5p+T5Zmo77yM6YeN5YaZ5Z+657G75a6e546w5Lul5aSE55CG5YiG5Yy6XHJcblx0ICovXHJcblx0cHJvdGVjdGVkIGNsZWFudXBSZW5kZXJlcnMoKTogdm9pZCB7XHJcblx0XHQvLyDosIPnlKjniLbnsbvnmoTmuLLmn5PlmajmuIXnkIZcclxuXHRcdHN1cGVyLmNsZWFudXBSZW5kZXJlcnMoKTtcclxuXHJcblx0XHQvLyDmuIXnkIbliIbljLrmuLLmn5PlmahcclxuXHRcdHRoaXMudGFnU2VjdGlvbnMuZm9yRWFjaCgoc2VjdGlvbikgPT4ge1xyXG5cdFx0XHRpZiAoc2VjdGlvbi5yZW5kZXJlcikge1xyXG5cdFx0XHRcdHRoaXMucmVtb3ZlQ2hpbGQoc2VjdGlvbi5yZW5kZXJlcik7XHJcblx0XHRcdFx0c2VjdGlvbi5yZW5kZXJlciA9IHVuZGVmaW5lZDtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiDmuLLmn5Pku7vliqHliJfooajvvIzph43lhpnku6XmlK/mjIHliIbljLrmqKHlvI9cclxuXHQgKi9cclxuXHRwcm90ZWN0ZWQgcmVuZGVyVGFza0xpc3QoKTogdm9pZCB7XHJcblx0XHQvLyDlhrPlrprmuLLmn5PmqKHlvI/vvJrliIbljLrjgIHlubPpnaLmiJbmoJHnirZcclxuXHRcdGNvbnN0IHVzZVNlY3Rpb25zID1cclxuXHRcdFx0IXRoaXMuaXNUcmVlVmlldyAmJlxyXG5cdFx0XHR0aGlzLnRhZ1NlY3Rpb25zLmxlbmd0aCA+IDAgJiZcclxuXHRcdFx0dGhpcy5zZWxlY3RlZEl0ZW1zLml0ZW1zLmxlbmd0aCA+IDE7XHJcblxyXG5cdFx0aWYgKHVzZVNlY3Rpb25zKSB7XHJcblx0XHRcdHRoaXMucmVuZGVyVGFnU2VjdGlvbnMoKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIOiwg+eUqOeItuexu+WunueOsOeahOagh+WHhua4suafk1xyXG5cdFx0XHRzdXBlci5yZW5kZXJUYXNrTGlzdCgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICog5pu05paw5Lu75YqhXHJcblx0ICovXHJcblx0cHVibGljIHVwZGF0ZVRhc2sodXBkYXRlZFRhc2s6IFRhc2spOiB2b2lkIHtcclxuXHRcdGxldCBuZWVkc0Z1bGxSZWZyZXNoID0gZmFsc2U7XHJcblx0XHRjb25zdCB0YXNrSW5kZXggPSB0aGlzLmFsbFRhc2tzLmZpbmRJbmRleChcclxuXHRcdFx0KHQpID0+IHQuaWQgPT09IHVwZGF0ZWRUYXNrLmlkXHJcblx0XHQpO1xyXG5cclxuXHRcdGlmICh0YXNrSW5kZXggIT09IC0xKSB7XHJcblx0XHRcdGNvbnN0IG9sZFRhc2sgPSB0aGlzLmFsbFRhc2tzW3Rhc2tJbmRleF07XHJcblx0XHRcdC8vIOajgOafpeagh+etvuaYr+WQpuWPmOWMlu+8jOmcgOimgemHjeaWsOaehOW7ui/muLLmn5NcclxuXHRcdFx0Y29uc3QgdGFnc0NoYW5nZWQgPVxyXG5cdFx0XHRcdCFvbGRUYXNrLm1ldGFkYXRhLnRhZ3MgfHxcclxuXHRcdFx0XHQhdXBkYXRlZFRhc2subWV0YWRhdGEudGFncyB8fFxyXG5cdFx0XHRcdG9sZFRhc2subWV0YWRhdGEudGFncy5qb2luKFwiLFwiKSAhPT1cclxuXHRcdFx0XHRcdHVwZGF0ZWRUYXNrLm1ldGFkYXRhLnRhZ3Muam9pbihcIixcIik7XHJcblxyXG5cdFx0XHRpZiAodGFnc0NoYW5nZWQpIHtcclxuXHRcdFx0XHRuZWVkc0Z1bGxSZWZyZXNoID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGlzLmFsbFRhc2tzW3Rhc2tJbmRleF0gPSB1cGRhdGVkVGFzaztcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMuYWxsVGFza3MucHVzaCh1cGRhdGVkVGFzayk7XHJcblx0XHRcdG5lZWRzRnVsbFJlZnJlc2ggPSB0cnVlOyAvLyDmlrDku7vliqHvvIzpnIDopoHlrozlhajliLfmlrBcclxuXHRcdH1cclxuXHJcblx0XHQvLyDlpoLmnpzmoIfnrb7lj5jljJbmiJbku7vliqHmmK/mlrDnmoTvvIzph43lu7rntKLlvJXlubblrozlhajliLfmlrBVSVxyXG5cdFx0aWYgKG5lZWRzRnVsbFJlZnJlc2gpIHtcclxuXHRcdFx0dGhpcy5idWlsZEl0ZW1zSW5kZXgoKTtcclxuXHRcdFx0dGhpcy5yZW5kZXJJdGVtc0xpc3QoKTsgLy8g5pu05paw5bem5L6n6L655qCPXHJcblx0XHRcdHRoaXMudXBkYXRlU2VsZWN0ZWRUYXNrcygpOyAvLyDph43mlrDorqHnrpfov4fmu6TlkI7nmoTku7vliqHlubbph43mlrDmuLLmn5Plj7PkvqfpnaLmnb9cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIOWQpuWIme+8jOS7heabtOaWsOi/h+a7pOWIl+ihqOS4reeahOS7u+WKoVxyXG5cdFx0XHRjb25zdCBmaWx0ZXJlZEluZGV4ID0gdGhpcy5maWx0ZXJlZFRhc2tzLmZpbmRJbmRleChcclxuXHRcdFx0XHQodCkgPT4gdC5pZCA9PT0gdXBkYXRlZFRhc2suaWRcclxuXHRcdFx0KTtcclxuXHRcdFx0aWYgKGZpbHRlcmVkSW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0dGhpcy5maWx0ZXJlZFRhc2tzW2ZpbHRlcmVkSW5kZXhdID0gdXBkYXRlZFRhc2s7XHJcblxyXG5cdFx0XHRcdC8vIOaJvuWIsOato+ehrueahOa4suafk+WZqO+8iOS4u+imgeaIluWIhuWMuu+8ieW5tuabtOaWsOS7u+WKoVxyXG5cdFx0XHRcdGlmICh0aGlzLnRhc2tSZW5kZXJlcikge1xyXG5cdFx0XHRcdFx0dGhpcy50YXNrUmVuZGVyZXIudXBkYXRlVGFzayh1cGRhdGVkVGFzayk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdC8vIOajgOafpeWIhuWMuuaooeW8j1xyXG5cdFx0XHRcdFx0dGhpcy50YWdTZWN0aW9ucy5mb3JFYWNoKChzZWN0aW9uKSA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIOajgOafpeS7u+WKoeaYr+WQpuWxnuS6juatpOWIhuWMuueahOagh+etvuWIhuaUr1xyXG5cdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0dXBkYXRlZFRhc2subWV0YWRhdGEudGFncz8uc29tZShcclxuXHRcdFx0XHRcdFx0XHRcdCh0YXNrVGFnOiBzdHJpbmcpID0+XHJcblx0XHRcdFx0XHRcdFx0XHRcdC8vIOi3s+i/h+mdnuWtl+espuS4suexu+Wei+eahOagh+etvlxyXG5cdFx0XHRcdFx0XHRcdFx0XHR0eXBlb2YgdGFza1RhZyA9PT0gXCJzdHJpbmdcIiAmJlxyXG5cdFx0XHRcdFx0XHRcdFx0XHQodGFza1RhZyA9PT0gc2VjdGlvbi50YWcgfHxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0YXNrVGFnLnN0YXJ0c1dpdGgoc2VjdGlvbi50YWcgKyBcIi9cIikpXHJcblx0XHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHQvLyDmo4Dmn6Xku7vliqHmmK/lkKblrp7pmYXlrZjlnKjkuo7mraTliIbljLrnmoTliJfooajkuK1cclxuXHRcdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0XHRzZWN0aW9uLnRhc2tzLnNvbWUoXHJcblx0XHRcdFx0XHRcdFx0XHRcdCh0KSA9PiB0LmlkID09PSB1cGRhdGVkVGFzay5pZFxyXG5cdFx0XHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0c2VjdGlvbi5yZW5kZXJlcj8udXBkYXRlVGFzayh1cGRhdGVkVGFzayk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8g55Sx5LqO5pu05paw77yM5Lu75Yqh5Y+v6IO95Y+Y5Li65Y+v6KeBL+S4jeWPr+inge+8jOmcgOimgemHjeaWsOi/h+a7pFxyXG5cdFx0XHRcdHRoaXMudXBkYXRlU2VsZWN0ZWRUYXNrcygpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG59XHJcbiJdfQ==