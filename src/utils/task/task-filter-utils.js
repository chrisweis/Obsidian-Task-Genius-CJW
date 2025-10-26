import { moment } from "obsidian";
import { getViewSettingOrDefault, } from "../../common/setting-definition";
import { hasProject } from "./task-operations";
/**
 * Parses a date filter string (e.g., 'today', 'next week', '2024-12-31')
 * and returns a moment object representing the start of that day.
 * Returns null if parsing fails.
 */
function parseDateFilterString(dateString) {
    if (!dateString)
        return null;
    const lowerCaseDate = dateString.toLowerCase().trim();
    let targetDate = moment(); // Default to today
    // Simple relative dates
    if (lowerCaseDate === "today") {
        // Already moment()
    }
    else if (lowerCaseDate === "tomorrow") {
        targetDate = moment().add(1, "day");
    }
    else if (lowerCaseDate === "yesterday") {
        targetDate = moment().subtract(1, "day");
    }
    else if (lowerCaseDate === "next week") {
        targetDate = moment().add(1, "week").startOf("week"); // Start of next week
    }
    else if (lowerCaseDate === "last week") {
        targetDate = moment().subtract(1, "week").startOf("week"); // Start of last week
    }
    else if (lowerCaseDate === "next month") {
        targetDate = moment().add(1, "month").startOf("month");
    }
    else if (lowerCaseDate === "last month") {
        targetDate = moment().subtract(1, "month").startOf("month");
    }
    else {
        // Try parsing as YYYY-MM-DD
        const parsed = moment(lowerCaseDate, "YYYY-MM-DD", true); // Strict parsing
        if (parsed.isValid()) {
            targetDate = parsed;
        }
        else {
            // Could add more complex parsing here (e.g., "in 3 days")
            console.warn(`Could not parse date filter string: ${dateString}`);
            return null;
        }
    }
    return targetDate.startOf("day");
}
/**
 * Checks if a task is not completed based on view settings and task status.
 *
 * @param plugin The plugin instance
 * @param task The task to check
 * @param viewId The current view mode
 * @returns true if the task is not completed according to view settings
 */
export function isNotCompleted(plugin, task, viewId) {
    const viewConfig = getViewSettingOrDefault(plugin, viewId);
    const abandonedStatus = plugin.settings.taskStatuses.abandoned.split("|");
    const completedStatus = plugin.settings.taskStatuses.completed.split("|");
    if (viewConfig.hideCompletedAndAbandonedTasks) {
        return (!task.completed &&
            !abandonedStatus.includes(task.status.toLowerCase()) &&
            !completedStatus.includes(task.status.toLowerCase()));
    }
    return true;
}
/**
 * Checks if a task is blank based on view settings and task content.
 *
 * @param plugin The plugin instance
 * @param task The task to check
 * @param viewId The current view mode
 * @returns true if the task is blank
 */
export function isBlank(plugin, task, viewId) {
    const viewConfig = getViewSettingOrDefault(plugin, viewId);
    if (viewConfig.filterBlanks) {
        return task.content.trim() !== "";
    }
    return true;
}
/**
 * 从RootFilterState应用过滤条件到任务列表
 * @param task 要过滤的任务
 * @param filterState 过滤状态
 * @returns 如果任务满足过滤条件则返回true
 */
export function applyAdvancedFilter(task, filterState) {
    // 如果没有过滤器组或过滤器组为空，返回所有任务
    if (!filterState.filterGroups || filterState.filterGroups.length === 0) {
        return true;
    }
    // 根据根条件确定如何组合过滤组
    const groupResults = filterState.filterGroups.map((group) => {
        return applyFilterGroup(task, group);
    });
    // 根据根条件组合结果
    if (filterState.rootCondition === "all") {
        return groupResults.every((result) => result);
    }
    else if (filterState.rootCondition === "any") {
        return groupResults.some((result) => result);
    }
    else if (filterState.rootCondition === "none") {
        return !groupResults.some((result) => result);
    }
    return true;
}
/**
 * 将过滤组应用于任务
 * @param task 要过滤的任务
 * @param group 过滤组
 * @returns 如果任务满足组条件则返回true
 */
function applyFilterGroup(task, group) {
    // 如果过滤器为空，返回所有任务
    if (!group.filters || group.filters.length === 0) {
        return true;
    }
    const filterResults = group.filters.map((filter) => {
        return applyFilter(task, filter);
    });
    // 根据组条件组合结果
    if (group.groupCondition === "all") {
        return filterResults.every((result) => result);
    }
    else if (group.groupCondition === "any") {
        return filterResults.some((result) => result);
    }
    else if (group.groupCondition === "none") {
        return !filterResults.some((result) => result);
    }
    return true;
}
/**
 * 将单个过滤器应用于任务
 * @param task 要过滤的任务
 * @param filter 过滤器
 * @returns 如果任务满足过滤条件则返回true
 */
function applyFilter(task, filter) {
    const { property, condition, value } = filter;
    // 对于空条件，始终返回true
    if (!condition) {
        return true;
    }
    switch (property) {
        case "content":
            return applyContentFilter(task.content, condition, value);
        case "status":
            return applyStatusFilter(task.status, condition, value);
        case "priority":
            return applyPriorityFilter(task.metadata.priority, condition, value);
        case "dueDate":
            return applyDateFilter(task.metadata.dueDate, condition, value);
        case "startDate":
            return applyDateFilter(task.metadata.startDate, condition, value);
        case "scheduledDate":
            return applyDateFilter(task.metadata.scheduledDate, condition, value);
        case "tags":
            return applyTagsFilter(task.metadata.tags, condition, value);
        case "filePath":
            return applyFilePathFilter(task.filePath, condition, value);
        case "project":
            return applyProjectFilter(task.metadata.project, condition, value);
        case "completed":
            return applyCompletedFilter(task.completed, condition);
        default:
            // 处理其他属性
            return true;
    }
}
/**
 * 内容过滤器实现
 */
function applyContentFilter(content, condition, value) {
    if (!content)
        content = "";
    if (!value)
        value = "";
    switch (condition) {
        case "contains":
            return content.toLowerCase().includes(value.toLowerCase());
        case "doesNotContain":
            return !content.toLowerCase().includes(value.toLowerCase());
        case "is":
            return content.toLowerCase() === value.toLowerCase();
        case "isNot":
            return content.toLowerCase() !== value.toLowerCase();
        case "startsWith":
            return content.toLowerCase().startsWith(value.toLowerCase());
        case "endsWith":
            return content.toLowerCase().endsWith(value.toLowerCase());
        case "isEmpty":
            return content.trim() === "";
        case "isNotEmpty":
            return content.trim() !== "";
        default:
            return true;
    }
}
/**
 * 状态过滤器实现
 */
function applyStatusFilter(status, condition, value) {
    if (!status)
        status = "";
    if (!value)
        value = "";
    switch (condition) {
        case "contains":
            return status.toLowerCase().includes(value.toLowerCase());
        case "doesNotContain":
            return !status.toLowerCase().includes(value.toLowerCase());
        case "is":
            return status.toLowerCase() === value.toLowerCase();
        case "isNot":
            return status.toLowerCase() !== value.toLowerCase();
        case "isEmpty":
            return status.trim() === "";
        case "isNotEmpty":
            return status.trim() !== "";
        default:
            return true;
    }
}
/**
 * 优先级过滤器实现
 */
function applyPriorityFilter(priority, condition, value) {
    // 如果没有设置优先级，将其视为0
    const taskPriority = typeof priority === "number" ? priority : 0;
    // 对于空值条件
    switch (condition) {
        case "isEmpty":
            return priority === undefined;
        case "isNotEmpty":
            return priority !== undefined;
    }
    if (!value)
        return true;
    // 尝试将值转换为数字
    let numValue;
    try {
        numValue = parseInt(value);
        if (isNaN(numValue))
            numValue = 0;
    }
    catch (_a) {
        numValue = 0;
    }
    switch (condition) {
        case "is":
            return taskPriority === numValue;
        case "isNot":
            return taskPriority !== numValue;
        default:
            return true;
    }
}
/**
 * 日期过滤器实现
 */
function applyDateFilter(date, condition, value) {
    // 处理空值条件
    switch (condition) {
        case "isEmpty":
            return date === undefined;
        case "isNotEmpty":
            return date !== undefined;
    }
    // 如果任务没有日期或过滤值为空，则匹配条件很特殊
    if (date === undefined || !value) {
        // 对于需要日期的条件，如果没有日期则不匹配
        if (["is", "isNot", ">", "<", ">=", "<="].includes(condition)) {
            return false;
        }
        return true;
    }
    // 解析日期
    const taskDate = moment(date).startOf("day");
    const filterDate = moment(value, "YYYY-MM-DD").startOf("day");
    if (!taskDate.isValid() || !filterDate.isValid()) {
        return false;
    }
    switch (condition) {
        case "is":
            return taskDate.isSame(filterDate, "day");
        case "isNot":
            return !taskDate.isSame(filterDate, "day");
        case ">":
            return taskDate.isAfter(filterDate, "day");
        case "<":
            return taskDate.isBefore(filterDate, "day");
        case ">=":
            return taskDate.isSameOrAfter(filterDate, "day");
        case "<=":
            return taskDate.isSameOrBefore(filterDate, "day");
        default:
            return true;
    }
}
/**
 * 标签过滤器实现
 */
function applyTagsFilter(tags, condition, value) {
    if (!tags)
        tags = [];
    if (!value)
        value = "";
    const lowerValue = value.toLowerCase();
    switch (condition) {
        case "contains":
            return tags.some((tag) => tag.toLowerCase().includes(lowerValue));
        case "doesNotContain":
            return !tags.some((tag) => tag.toLowerCase().includes(lowerValue));
        case "isEmpty":
            return tags.length === 0;
        case "isNotEmpty":
            return tags.length > 0;
        default:
            return true;
    }
}
/**
 * 文件路径过滤器实现
 */
function applyFilePathFilter(filePath, condition, value) {
    if (!filePath)
        filePath = "";
    if (!value)
        value = "";
    switch (condition) {
        case "contains":
            return filePath.toLowerCase().includes(value.toLowerCase());
        case "doesNotContain":
            return !filePath.toLowerCase().includes(value.toLowerCase());
        case "is":
            return filePath.toLowerCase() === value.toLowerCase();
        case "isNot":
            return filePath.toLowerCase() !== value.toLowerCase();
        case "startsWith":
            return filePath.toLowerCase().startsWith(value.toLowerCase());
        case "endsWith":
            return filePath.toLowerCase().endsWith(value.toLowerCase());
        case "isEmpty":
            return filePath.trim() === "";
        case "isNotEmpty":
            return filePath.trim() !== "";
        default:
            return true;
    }
}
/**
 * 项目过滤器实现
 */
function applyProjectFilter(project, condition, value) {
    const proj = (project !== null && project !== void 0 ? project : "").toLowerCase();
    const val = (value !== null && value !== void 0 ? value : "").toLowerCase();
    switch (condition) {
        case "contains":
            return proj.includes(val);
        case "doesNotContain":
            return !proj.includes(val);
        case "is":
            return proj === val;
        case "isNot":
            return proj !== val;
        case "startsWith":
            return proj.startsWith(val);
        case "endsWith":
            return proj.endsWith(val);
        case "isEmpty":
            return proj.trim() === "";
        case "isNotEmpty":
            return proj.trim() !== "";
        default:
            return true;
    }
}
/**
 * 完成状态过滤器实现
 */
function applyCompletedFilter(completed, condition) {
    switch (condition) {
        case "isTrue":
            return completed === true;
        case "isFalse":
            return completed === false;
        default:
            return true;
    }
}
/**
 * Centralized function to filter tasks based on view configuration and options.
 * Includes completion status filtering.
 */
export function filterTasks(allTasks, viewId, plugin, options = {}) {
    var _a, _b, _c;
    let filtered = [...allTasks];
    const viewConfig = getViewSettingOrDefault(plugin, viewId);
    const filterRules = viewConfig.filterRules || {};
    const globalFilterRules = plugin.settings.globalFilterRules || {};
    // --- 过滤 ICS 事件在不应展示的视图中（例如 inbox）---
    // ICS 事件应仅在日历/日程类视图（calendar/forecast）中展示
    const isCalendarView = viewId === "calendar" ||
        (typeof viewId === "string" && viewId.startsWith("calendar"));
    const isForecastView = viewId === "forecast" ||
        (typeof viewId === "string" && viewId.startsWith("forecast"));
    if (!isCalendarView && !isForecastView) {
        filtered = filtered.filter((task) => {
            var _a, _b, _c, _d;
            // 识别 ICS 事件任务（优先从 metadata.source 读取，兼容 legacy source 字段）
            const metaSourceType = (_c = (_b = (_a = task.metadata) === null || _a === void 0 ? void 0 : _a.source) === null || _b === void 0 ? void 0 : _b.type) !== null && _c !== void 0 ? _c : (_d = task.source) === null || _d === void 0 ? void 0 : _d.type;
            const isIcsTask = metaSourceType === "ics";
            // 非 ICS 保留；ICS 在此类视图中过滤掉
            return !isIcsTask;
        });
    }
    // --- 基本筛选：隐藏已完成和空白任务 ---
    // 注意：这些是基础过滤条件，始终应用
    if (viewConfig.hideCompletedAndAbandonedTasks) {
        filtered = filtered.filter((task) => !task.completed);
    }
    if (viewConfig.filterBlanks) {
        filtered = filtered.filter((task) => task.content.trim() !== "");
    }
    // --- 应用全局筛选器（如果存在） ---
    if (globalFilterRules.advancedFilter &&
        ((_a = globalFilterRules.advancedFilter.filterGroups) === null || _a === void 0 ? void 0 : _a.length) > 0) {
        console.log("应用全局筛选器:", globalFilterRules.advancedFilter);
        filtered = filtered.filter((task) => applyAdvancedFilter(task, globalFilterRules.advancedFilter));
    }
    // --- 应用视图配置中的基础高级过滤器（如果存在） ---
    if (filterRules.advancedFilter &&
        ((_b = filterRules.advancedFilter.filterGroups) === null || _b === void 0 ? void 0 : _b.length) > 0) {
        console.log("应用视图配置中的基础高级过滤器:", filterRules.advancedFilter);
        filtered = filtered.filter((task) => applyAdvancedFilter(task, filterRules.advancedFilter));
    }
    // --- 应用传入的实时高级过滤器（如果存在） ---
    if (options.advancedFilter &&
        ((_c = options.advancedFilter.filterGroups) === null || _c === void 0 ? void 0 : _c.length) > 0) {
        console.log("应用传入的实时高级过滤器:", options.advancedFilter);
        filtered = filtered.filter((task) => applyAdvancedFilter(task, options.advancedFilter));
        // 如果有实时高级过滤器，应用基本规则后直接返回
        // 应用 isNotCompleted 过滤器（基于视图配置的 hideCompletedAndAbandonedTasks）
        filtered = filtered.filter((task) => isNotCompleted(plugin, task, viewId));
        // 应用 isBlank 过滤器（基于视图配置的 filterBlanks）
        filtered = filtered.filter((task) => isBlank(plugin, task, viewId));
        // 应用通用文本搜索（来自选项）
        if (options.textQuery) {
            const textFilter = options.textQuery.toLowerCase();
            filtered = filtered.filter((task) => {
                var _a, _b, _c;
                return task.content.toLowerCase().includes(textFilter) ||
                    ((_a = task.metadata.project) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(textFilter)) ||
                    ((_b = task.metadata.context) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(textFilter)) ||
                    ((_c = task.metadata.tags) === null || _c === void 0 ? void 0 : _c.some((tag) => tag.toLowerCase().includes(textFilter)));
            });
        }
        // 有实时高级过滤器时，跳过应用默认视图逻辑和默认过滤规则
        return filtered;
    }
    // --- 以下是无高级过滤器时的默认行为 ---
    // --- Apply Filter Rules defined in ViewConfig ---
    if (filterRules.textContains) {
        const query = filterRules.textContains.toLowerCase();
        filtered = filtered.filter((task) => task.content.toLowerCase().includes(query));
    }
    if (filterRules.tagsInclude && filterRules.tagsInclude.length > 0) {
        filtered = filtered.filter((task) => {
            var _a;
            return (_a = filterRules.tagsInclude) === null || _a === void 0 ? void 0 : _a.some((tag) => task.metadata.tags.some((taskTag) => typeof taskTag === "string" && taskTag === tag));
        });
    }
    if (filterRules.tagsExclude && filterRules.tagsExclude.length > 0) {
        filtered = filtered.filter((task) => {
            if (!task.metadata.tags || task.metadata.tags.length === 0) {
                return true; // Keep tasks with no tags
            }
            // Convert task tags to lowercase for case-insensitive comparison
            const taskTagsLower = task.metadata.tags.map((tag) => tag.toLowerCase());
            // Check if any excluded tag is in the task's tags
            return !filterRules.tagsExclude.some((excludeTag) => {
                const tagLower = excludeTag.toLowerCase();
                return (taskTagsLower.includes(tagLower) ||
                    taskTagsLower.includes("#" + tagLower));
            });
        });
    }
    if (filterRules.project) {
        filtered = filtered.filter((task) => { var _a, _b; return ((_a = task.metadata.project) === null || _a === void 0 ? void 0 : _a.trim()) === ((_b = filterRules.project) === null || _b === void 0 ? void 0 : _b.trim()); });
    }
    if (filterRules.priority !== undefined) {
        filtered = filtered.filter((task) => {
            var _a, _b, _c;
            if (filterRules.priority === "none") {
                return task.metadata.priority === undefined;
            }
            else if ((_a = filterRules.priority) === null || _a === void 0 ? void 0 : _a.includes(",")) {
                return filterRules.priority
                    .split(",")
                    .includes(String((_b = task.metadata.priority) !== null && _b !== void 0 ? _b : 0));
            }
            else {
                return (task.metadata.priority ===
                    parseInt((_c = filterRules.priority) !== null && _c !== void 0 ? _c : "0"));
            }
        });
    }
    if (filterRules.statusInclude && filterRules.statusInclude.length > 0) {
        filtered = filtered.filter((task) => filterRules.statusInclude.includes(task.status));
    }
    if (filterRules.statusExclude && filterRules.statusExclude.length > 0) {
        filtered = filtered.filter((task) => !filterRules.statusExclude.includes(task.status));
    }
    // Path filters (Added based on content.ts logic)
    if (filterRules.pathIncludes) {
        const query = filterRules.pathIncludes
            .split(",")
            .filter((p) => p.trim() !== "")
            .map((p) => p.trim().toLowerCase());
        filtered = filtered.filter((task) => query.some((q) => task.filePath.toLowerCase().includes(q)));
    }
    if (filterRules.pathExcludes) {
        const query = filterRules.pathExcludes
            .split(",")
            .filter((p) => p.trim() !== "")
            .map((p) => p.trim().toLowerCase());
        filtered = filtered.filter((task) => {
            // Only exclude if ALL exclusion patterns are not found in the path
            return !query.some((q) => task.filePath.toLowerCase().includes(q));
        });
    }
    // --- Apply Date Filters from rules ---
    if (filterRules.dueDate) {
        const targetDueDate = parseDateFilterString(filterRules.dueDate);
        if (targetDueDate) {
            filtered = filtered.filter((task) => task.metadata.dueDate
                ? moment(task.metadata.dueDate).isSame(targetDueDate, "day")
                : false);
        }
    }
    if (filterRules.startDate) {
        const targetStartDate = parseDateFilterString(filterRules.startDate);
        if (targetStartDate) {
            filtered = filtered.filter((task) => task.metadata.startDate
                ? moment(task.metadata.startDate).isSame(targetStartDate, "day")
                : false);
        }
    }
    if (filterRules.scheduledDate) {
        const targetScheduledDate = parseDateFilterString(filterRules.scheduledDate);
        if (targetScheduledDate) {
            filtered = filtered.filter((task) => task.metadata.scheduledDate
                ? moment(task.metadata.scheduledDate).isSame(targetScheduledDate, "day")
                : false);
        }
    }
    // --- Apply Default View Logic (if no rules applied OR as overrides) ---
    // We only apply these if no specific rules were matched, OR if the view ID has hardcoded logic.
    // A better approach might be to represent *all* default views with filterRules in DEFAULT_SETTINGS.
    // For now, keep the switch for explicit default behaviours not covered by rules.
    if (Object.keys(filterRules).length === 0) {
        // Only apply default logic if no rules were defined for this view
        switch (viewId) {
            case "inbox": {
                filtered = filtered.filter((task) => !hasProject(task));
                break;
            }
            case "today": {
                const today = moment().startOf("day");
                const isToday = (d) => d ? moment(d).isSame(today, "day") : false;
                filtered = filtered.filter((task) => {
                    var _a, _b, _c;
                    return isToday((_a = task.metadata) === null || _a === void 0 ? void 0 : _a.dueDate) ||
                        isToday((_b = task.metadata) === null || _b === void 0 ? void 0 : _b.scheduledDate) ||
                        isToday((_c = task.metadata) === null || _c === void 0 ? void 0 : _c.startDate);
                });
                break;
            }
            case "upcoming": {
                const start = moment().startOf("day");
                const end = moment().add(7, "days").endOf("day");
                const inNext7Days = (d) => d
                    ? moment(d).isAfter(start, "day") &&
                        moment(d).isSameOrBefore(end, "day")
                    : false;
                filtered = filtered.filter((task) => {
                    var _a, _b, _c;
                    return inNext7Days((_a = task.metadata) === null || _a === void 0 ? void 0 : _a.dueDate) ||
                        inNext7Days((_b = task.metadata) === null || _b === void 0 ? void 0 : _b.scheduledDate) ||
                        inNext7Days((_c = task.metadata) === null || _c === void 0 ? void 0 : _c.startDate);
                });
                break;
            }
            case "flagged": {
                filtered = filtered.filter((task) => {
                    var _a, _b, _c, _d, _e;
                    return ((_a = task.metadata.priority) !== null && _a !== void 0 ? _a : 0) >= 3 ||
                        ((_c = (_b = task.metadata.tags) === null || _b === void 0 ? void 0 : _b.includes("flagged")) !== null && _c !== void 0 ? _c : false) ||
                        ((_e = (_d = task.metadata.tags) === null || _d === void 0 ? void 0 : _d.includes("#flagged")) !== null && _e !== void 0 ? _e : false);
                });
                break;
            }
            // Projects, Tags, Review logic are handled by their specific components / options
        }
    }
    // --- Apply `isNotCompleted` Filter ---
    // This uses the hideCompletedAndAbandonedTasks setting from the viewConfig
    filtered = filtered.filter((task) => isNotCompleted(plugin, task, viewId));
    // --- Apply `isBlank` Filter ---
    // This uses the filterBlanks setting from the viewConfig
    filtered = filtered.filter((task) => isBlank(plugin, task, viewId));
    // --- Apply General Text Search (from options) ---
    if (options.textQuery) {
        const textFilter = options.textQuery.toLowerCase();
        filtered = filtered.filter((task) => {
            var _a, _b, _c;
            return task.content.toLowerCase().includes(textFilter) ||
                ((_a = task.metadata.project) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(textFilter)) ||
                ((_b = task.metadata.context) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(textFilter)) ||
                ((_c = task.metadata.tags) === null || _c === void 0 ? void 0 : _c.some((tag) => tag.toLowerCase().includes(textFilter)));
        });
    }
    // --- Apply `hasDueDate` Filter ---
    if (filterRules.hasDueDate) {
        if (filterRules.hasDueDate === "any") {
            // Do nothing
        }
        else if (filterRules.hasDueDate === "hasDate") {
            filtered = filtered.filter((task) => task.metadata.dueDate);
        }
        else if (filterRules.hasDueDate === "noDate") {
            filtered = filtered.filter((task) => !task.metadata.dueDate);
        }
    }
    // --- Apply `hasStartDate` Filter ---
    if (filterRules.hasStartDate) {
        if (filterRules.hasStartDate === "any") {
            // Do nothing
        }
        else if (filterRules.hasStartDate === "hasDate") {
            filtered = filtered.filter((task) => task.metadata.startDate);
        }
        else if (filterRules.hasStartDate === "noDate") {
            filtered = filtered.filter((task) => !task.metadata.startDate);
        }
    }
    // --- Apply `hasScheduledDate` Filter ---
    if (filterRules.hasScheduledDate) {
        if (filterRules.hasScheduledDate === "any") {
            // Do nothing
        }
        else if (filterRules.hasScheduledDate === "hasDate") {
            filtered = filtered.filter((task) => task.metadata.scheduledDate);
        }
        else if (filterRules.hasScheduledDate === "noDate") {
            filtered = filtered.filter((task) => !task.metadata.scheduledDate);
        }
    }
    // --- Apply `hasCompletedDate` Filter ---
    if (filterRules.hasCompletedDate) {
        if (filterRules.hasCompletedDate === "any") {
            // Do nothing
        }
        else if (filterRules.hasCompletedDate === "hasDate") {
            filtered = filtered.filter((task) => task.metadata.completedDate);
        }
        else if (filterRules.hasCompletedDate === "noDate") {
            filtered = filtered.filter((task) => !task.metadata.completedDate);
        }
    }
    // --- Apply `hasRecurrence` Filter ---
    if (filterRules.hasRecurrence) {
        if (filterRules.hasRecurrence === "any") {
            // Do nothing
        }
        else if (filterRules.hasRecurrence === "hasProperty") {
            filtered = filtered.filter((task) => task.metadata.recurrence);
        }
        else if (filterRules.hasRecurrence === "noProperty") {
            filtered = filtered.filter((task) => !task.metadata.recurrence);
        }
    }
    // --- Apply `hasCreatedDate` Filter ---
    if (filterRules.hasCreatedDate) {
        if (filterRules.hasCreatedDate === "any") {
            // Do nothing
        }
        else if (filterRules.hasCreatedDate === "hasDate") {
            filtered = filtered.filter((task) => task.metadata.createdDate);
        }
        else if (filterRules.hasCreatedDate === "noDate") {
            filtered = filtered.filter((task) => !task.metadata.createdDate);
        }
    }
    return filtered;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFzay1maWx0ZXItdXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0YXNrLWZpbHRlci11dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBRWxDLE9BQU8sRUFFTix1QkFBdUIsR0FDdkIsTUFBTSxpQ0FBaUMsQ0FBQztBQVF6QyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFxQi9DOzs7O0dBSUc7QUFDSCxTQUFTLHFCQUFxQixDQUFDLFVBQWtCO0lBQ2hELElBQUksQ0FBQyxVQUFVO1FBQUUsT0FBTyxJQUFJLENBQUM7SUFDN0IsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3RELElBQUksVUFBVSxHQUFHLE1BQU0sRUFBRSxDQUFDLENBQUMsbUJBQW1CO0lBRTlDLHdCQUF3QjtJQUN4QixJQUFJLGFBQWEsS0FBSyxPQUFPLEVBQUU7UUFDOUIsbUJBQW1CO0tBQ25CO1NBQU0sSUFBSSxhQUFhLEtBQUssVUFBVSxFQUFFO1FBQ3hDLFVBQVUsR0FBRyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0tBQ3BDO1NBQU0sSUFBSSxhQUFhLEtBQUssV0FBVyxFQUFFO1FBQ3pDLFVBQVUsR0FBRyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0tBQ3pDO1NBQU0sSUFBSSxhQUFhLEtBQUssV0FBVyxFQUFFO1FBQ3pDLFVBQVUsR0FBRyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLHFCQUFxQjtLQUMzRTtTQUFNLElBQUksYUFBYSxLQUFLLFdBQVcsRUFBRTtRQUN6QyxVQUFVLEdBQUcsTUFBTSxFQUFF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LEVBQUU7WUFDdEQsUUFBUSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUNoRTtLQUNEO0lBRUQsd0NBQXdDO0lBQ3hDLElBQUksV0FBVyxDQUFDLGNBQWMsRUFBRTtRQUMvQixJQUFJLFdBQVcsQ0FBQyxjQUFjLEtBQUssS0FBSyxFQUFFO1lBQ3pDLGFBQWE7U0FDYjthQUFNLElBQUksV0FBVyxDQUFDLGNBQWMsS0FBSyxTQUFTLEVBQUU7WUFDcEQsUUFBUSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7U0FDaEU7YUFBTSxJQUFJLFdBQVcsQ0FBQyxjQUFjLEtBQUssUUFBUSxFQUFFO1lBQ25ELFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7U0FDakU7S0FDRDtJQUVELE9BQU8sUUFBUSxDQUFDO0FBQ2pCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBtb21lbnQgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgVGFzayB9IGZyb20gXCIuLi8uLi90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7XHJcblx0Vmlld01vZGUsXHJcblx0Z2V0Vmlld1NldHRpbmdPckRlZmF1bHQsXHJcbn0gZnJvbSBcIi4uLy4uL2NvbW1vbi9zZXR0aW5nLWRlZmluaXRpb25cIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiLi4vLi4vaW5kZXhcIjtcclxuaW1wb3J0IHsgc29ydFRhc2tzIH0gZnJvbSBcIkAvY29tbWFuZHMvc29ydFRhc2tDb21tYW5kc1wiO1xyXG5pbXBvcnQge1xyXG5cdEZpbHRlcixcclxuXHRGaWx0ZXJHcm91cCxcclxuXHRSb290RmlsdGVyU3RhdGUsXHJcbn0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy90YXNrL2ZpbHRlci9WaWV3VGFza0ZpbHRlclwiO1xyXG5pbXBvcnQgeyBoYXNQcm9qZWN0IH0gZnJvbSBcIi4vdGFzay1vcGVyYXRpb25zXCI7XHJcblxyXG4vLyDku45WaWV3VGFza0ZpbHRlci50c+WvvOWFpeebuOWFs+aOpeWPo1xyXG5cclxuaW50ZXJmYWNlIEZpbHRlck9wdGlvbnMge1xyXG5cdHRleHRRdWVyeT86IHN0cmluZztcclxuXHRzZWxlY3RlZERhdGU/OiBEYXRlOyAvLyBGb3IgZm9yZWNhc3QtbGlrZSBmaWx0ZXJpbmdcclxuXHQvLyBBZGQgb3RoZXIgcG90ZW50aWFsIG9wdGlvbnMgbmVlZGVkIGJ5IHNwZWNpZmljIHZpZXdzIGxhdGVyXHJcblx0Ly8gc2VsZWN0ZWRQcm9qZWN0Pzogc3RyaW5nO1xyXG5cdC8vIHNlbGVjdGVkVGFncz86IHN0cmluZ1tdO1xyXG5cclxuXHRzZXR0aW5ncz86IHtcclxuXHRcdHVzZURhaWx5Tm90ZVBhdGhBc0RhdGU6IGJvb2xlYW47XHJcblx0XHRkYWlseU5vdGVGb3JtYXQ6IHN0cmluZztcclxuXHRcdHVzZUFzRGF0ZVR5cGU6IFwiZHVlXCIgfCBcInN0YXJ0XCIgfCBcInNjaGVkdWxlZFwiO1xyXG5cdH07XHJcblxyXG5cdC8vIOa3u+WKoOmrmOe6p+i/h+a7pOWZqOmAiemhuVxyXG5cdGFkdmFuY2VkRmlsdGVyPzogUm9vdEZpbHRlclN0YXRlO1xyXG59XHJcblxyXG4vKipcclxuICogUGFyc2VzIGEgZGF0ZSBmaWx0ZXIgc3RyaW5nIChlLmcuLCAndG9kYXknLCAnbmV4dCB3ZWVrJywgJzIwMjQtMTItMzEnKVxyXG4gKiBhbmQgcmV0dXJucyBhIG1vbWVudCBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSBzdGFydCBvZiB0aGF0IGRheS5cclxuICogUmV0dXJucyBudWxsIGlmIHBhcnNpbmcgZmFpbHMuXHJcbiAqL1xyXG5mdW5jdGlvbiBwYXJzZURhdGVGaWx0ZXJTdHJpbmcoZGF0ZVN0cmluZzogc3RyaW5nKTogbW9tZW50Lk1vbWVudCB8IG51bGwge1xyXG5cdGlmICghZGF0ZVN0cmluZykgcmV0dXJuIG51bGw7XHJcblx0Y29uc3QgbG93ZXJDYXNlRGF0ZSA9IGRhdGVTdHJpbmcudG9Mb3dlckNhc2UoKS50cmltKCk7XHJcblx0bGV0IHRhcmdldERhdGUgPSBtb21lbnQoKTsgLy8gRGVmYXVsdCB0byB0b2RheVxyXG5cclxuXHQvLyBTaW1wbGUgcmVsYXRpdmUgZGF0ZXNcclxuXHRpZiAobG93ZXJDYXNlRGF0ZSA9PT0gXCJ0b2RheVwiKSB7XHJcblx0XHQvLyBBbHJlYWR5IG1vbWVudCgpXHJcblx0fSBlbHNlIGlmIChsb3dlckNhc2VEYXRlID09PSBcInRvbW9ycm93XCIpIHtcclxuXHRcdHRhcmdldERhdGUgPSBtb21lbnQoKS5hZGQoMSwgXCJkYXlcIik7XHJcblx0fSBlbHNlIGlmIChsb3dlckNhc2VEYXRlID09PSBcInllc3RlcmRheVwiKSB7XHJcblx0XHR0YXJnZXREYXRlID0gbW9tZW50KCkuc3VidHJhY3QoMSwgXCJkYXlcIik7XHJcblx0fSBlbHNlIGlmIChsb3dlckNhc2VEYXRlID09PSBcIm5leHQgd2Vla1wiKSB7XHJcblx0XHR0YXJnZXREYXRlID0gbW9tZW50KCkuYWRkKDEsIFwid2Vla1wiKS5zdGFydE9mKFwid2Vla1wiKTsgLy8gU3RhcnQgb2YgbmV4dCB3ZWVrXHJcblx0fSBlbHNlIGlmIChsb3dlckNhc2VEYXRlID09PSBcImxhc3Qgd2Vla1wiKSB7XHJcblx0XHR0YXJnZXREYXRlID0gbW9tZW50KCkuc3VidHJhY3QoMSwgXCJ3ZWVrXCIpLnN0YXJ0T2YoXCJ3ZWVrXCIpOyAvLyBTdGFydCBvZiBsYXN0IHdlZWtcclxuXHR9IGVsc2UgaWYgKGxvd2VyQ2FzZURhdGUgPT09IFwibmV4dCBtb250aFwiKSB7XHJcblx0XHR0YXJnZXREYXRlID0gbW9tZW50KCkuYWRkKDEsIFwibW9udGhcIikuc3RhcnRPZihcIm1vbnRoXCIpO1xyXG5cdH0gZWxzZSBpZiAobG93ZXJDYXNlRGF0ZSA9PT0gXCJsYXN0IG1vbnRoXCIpIHtcclxuXHRcdHRhcmdldERhdGUgPSBtb21lbnQoKS5zdWJ0cmFjdCgxLCBcIm1vbnRoXCIpLnN0YXJ0T2YoXCJtb250aFwiKTtcclxuXHR9IGVsc2Uge1xyXG5cdFx0Ly8gVHJ5IHBhcnNpbmcgYXMgWVlZWS1NTS1ERFxyXG5cdFx0Y29uc3QgcGFyc2VkID0gbW9tZW50KGxvd2VyQ2FzZURhdGUsIFwiWVlZWS1NTS1ERFwiLCB0cnVlKTsgLy8gU3RyaWN0IHBhcnNpbmdcclxuXHRcdGlmIChwYXJzZWQuaXNWYWxpZCgpKSB7XHJcblx0XHRcdHRhcmdldERhdGUgPSBwYXJzZWQ7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBDb3VsZCBhZGQgbW9yZSBjb21wbGV4IHBhcnNpbmcgaGVyZSAoZS5nLiwgXCJpbiAzIGRheXNcIilcclxuXHRcdFx0Y29uc29sZS53YXJuKGBDb3VsZCBub3QgcGFyc2UgZGF0ZSBmaWx0ZXIgc3RyaW5nOiAke2RhdGVTdHJpbmd9YCk7XHJcblx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIHRhcmdldERhdGUuc3RhcnRPZihcImRheVwiKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENoZWNrcyBpZiBhIHRhc2sgaXMgbm90IGNvbXBsZXRlZCBiYXNlZCBvbiB2aWV3IHNldHRpbmdzIGFuZCB0YXNrIHN0YXR1cy5cclxuICpcclxuICogQHBhcmFtIHBsdWdpbiBUaGUgcGx1Z2luIGluc3RhbmNlXHJcbiAqIEBwYXJhbSB0YXNrIFRoZSB0YXNrIHRvIGNoZWNrXHJcbiAqIEBwYXJhbSB2aWV3SWQgVGhlIGN1cnJlbnQgdmlldyBtb2RlXHJcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIHRhc2sgaXMgbm90IGNvbXBsZXRlZCBhY2NvcmRpbmcgdG8gdmlldyBzZXR0aW5nc1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGlzTm90Q29tcGxldGVkKFxyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdHRhc2s6IFRhc2ssXHJcblx0dmlld0lkOiBWaWV3TW9kZVxyXG4pOiBib29sZWFuIHtcclxuXHRjb25zdCB2aWV3Q29uZmlnID0gZ2V0Vmlld1NldHRpbmdPckRlZmF1bHQocGx1Z2luLCB2aWV3SWQpO1xyXG5cdGNvbnN0IGFiYW5kb25lZFN0YXR1cyA9IHBsdWdpbi5zZXR0aW5ncy50YXNrU3RhdHVzZXMuYWJhbmRvbmVkLnNwbGl0KFwifFwiKTtcclxuXHRjb25zdCBjb21wbGV0ZWRTdGF0dXMgPSBwbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c2VzLmNvbXBsZXRlZC5zcGxpdChcInxcIik7XHJcblxyXG5cdGlmICh2aWV3Q29uZmlnLmhpZGVDb21wbGV0ZWRBbmRBYmFuZG9uZWRUYXNrcykge1xyXG5cdFx0cmV0dXJuIChcclxuXHRcdFx0IXRhc2suY29tcGxldGVkICYmXHJcblx0XHRcdCFhYmFuZG9uZWRTdGF0dXMuaW5jbHVkZXModGFzay5zdGF0dXMudG9Mb3dlckNhc2UoKSkgJiZcclxuXHRcdFx0IWNvbXBsZXRlZFN0YXR1cy5pbmNsdWRlcyh0YXNrLnN0YXR1cy50b0xvd2VyQ2FzZSgpKVxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdHJldHVybiB0cnVlO1xyXG59XHJcblxyXG4vKipcclxuICogQ2hlY2tzIGlmIGEgdGFzayBpcyBibGFuayBiYXNlZCBvbiB2aWV3IHNldHRpbmdzIGFuZCB0YXNrIGNvbnRlbnQuXHJcbiAqXHJcbiAqIEBwYXJhbSBwbHVnaW4gVGhlIHBsdWdpbiBpbnN0YW5jZVxyXG4gKiBAcGFyYW0gdGFzayBUaGUgdGFzayB0byBjaGVja1xyXG4gKiBAcGFyYW0gdmlld0lkIFRoZSBjdXJyZW50IHZpZXcgbW9kZVxyXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSB0YXNrIGlzIGJsYW5rXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaXNCbGFuayhcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHR0YXNrOiBUYXNrLFxyXG5cdHZpZXdJZDogVmlld01vZGVcclxuKTogYm9vbGVhbiB7XHJcblx0Y29uc3Qgdmlld0NvbmZpZyA9IGdldFZpZXdTZXR0aW5nT3JEZWZhdWx0KHBsdWdpbiwgdmlld0lkKTtcclxuXHJcblx0aWYgKHZpZXdDb25maWcuZmlsdGVyQmxhbmtzKSB7XHJcblx0XHRyZXR1cm4gdGFzay5jb250ZW50LnRyaW0oKSAhPT0gXCJcIjtcclxuXHR9XHJcblxyXG5cdHJldHVybiB0cnVlO1xyXG59XHJcblxyXG4vKipcclxuICog5LuOUm9vdEZpbHRlclN0YXRl5bqU55So6L+H5ruk5p2h5Lu25Yiw5Lu75Yqh5YiX6KGoXHJcbiAqIEBwYXJhbSB0YXNrIOimgei/h+a7pOeahOS7u+WKoVxyXG4gKiBAcGFyYW0gZmlsdGVyU3RhdGUg6L+H5ruk54q25oCBXHJcbiAqIEByZXR1cm5zIOWmguaenOS7u+WKoea7oei2s+i/h+a7pOadoeS7tuWImei/lOWbnnRydWVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBhcHBseUFkdmFuY2VkRmlsdGVyKFxyXG5cdHRhc2s6IFRhc2ssXHJcblx0ZmlsdGVyU3RhdGU6IFJvb3RGaWx0ZXJTdGF0ZVxyXG4pOiBib29sZWFuIHtcclxuXHQvLyDlpoLmnpzmsqHmnInov4fmu6Tlmajnu4TmiJbov4fmu6Tlmajnu4TkuLrnqbrvvIzov5Tlm57miYDmnInku7vliqFcclxuXHRpZiAoIWZpbHRlclN0YXRlLmZpbHRlckdyb3VwcyB8fCBmaWx0ZXJTdGF0ZS5maWx0ZXJHcm91cHMubGVuZ3RoID09PSAwKSB7XHJcblx0XHRyZXR1cm4gdHJ1ZTtcclxuXHR9XHJcblxyXG5cdC8vIOagueaNruagueadoeS7tuehruWumuWmguS9lee7hOWQiOi/h+a7pOe7hFxyXG5cdGNvbnN0IGdyb3VwUmVzdWx0cyA9IGZpbHRlclN0YXRlLmZpbHRlckdyb3Vwcy5tYXAoKGdyb3VwKSA9PiB7XHJcblx0XHRyZXR1cm4gYXBwbHlGaWx0ZXJHcm91cCh0YXNrLCBncm91cCk7XHJcblx0fSk7XHJcblxyXG5cdC8vIOagueaNruagueadoeS7tue7hOWQiOe7k+aenFxyXG5cdGlmIChmaWx0ZXJTdGF0ZS5yb290Q29uZGl0aW9uID09PSBcImFsbFwiKSB7XHJcblx0XHRyZXR1cm4gZ3JvdXBSZXN1bHRzLmV2ZXJ5KChyZXN1bHQpID0+IHJlc3VsdCk7XHJcblx0fSBlbHNlIGlmIChmaWx0ZXJTdGF0ZS5yb290Q29uZGl0aW9uID09PSBcImFueVwiKSB7XHJcblx0XHRyZXR1cm4gZ3JvdXBSZXN1bHRzLnNvbWUoKHJlc3VsdCkgPT4gcmVzdWx0KTtcclxuXHR9IGVsc2UgaWYgKGZpbHRlclN0YXRlLnJvb3RDb25kaXRpb24gPT09IFwibm9uZVwiKSB7XHJcblx0XHRyZXR1cm4gIWdyb3VwUmVzdWx0cy5zb21lKChyZXN1bHQpID0+IHJlc3VsdCk7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gdHJ1ZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIOWwhui/h+a7pOe7hOW6lOeUqOS6juS7u+WKoVxyXG4gKiBAcGFyYW0gdGFzayDopoHov4fmu6TnmoTku7vliqFcclxuICogQHBhcmFtIGdyb3VwIOi/h+a7pOe7hFxyXG4gKiBAcmV0dXJucyDlpoLmnpzku7vliqHmu6HotrPnu4TmnaHku7bliJnov5Tlm550cnVlXHJcbiAqL1xyXG5mdW5jdGlvbiBhcHBseUZpbHRlckdyb3VwKHRhc2s6IFRhc2ssIGdyb3VwOiBGaWx0ZXJHcm91cCk6IGJvb2xlYW4ge1xyXG5cdC8vIOWmguaenOi/h+a7pOWZqOS4uuepuu+8jOi/lOWbnuaJgOacieS7u+WKoVxyXG5cdGlmICghZ3JvdXAuZmlsdGVycyB8fCBncm91cC5maWx0ZXJzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0cmV0dXJuIHRydWU7XHJcblx0fVxyXG5cclxuXHRjb25zdCBmaWx0ZXJSZXN1bHRzID0gZ3JvdXAuZmlsdGVycy5tYXAoKGZpbHRlcikgPT4ge1xyXG5cdFx0cmV0dXJuIGFwcGx5RmlsdGVyKHRhc2ssIGZpbHRlcik7XHJcblx0fSk7XHJcblxyXG5cdC8vIOagueaNrue7hOadoeS7tue7hOWQiOe7k+aenFxyXG5cdGlmIChncm91cC5ncm91cENvbmRpdGlvbiA9PT0gXCJhbGxcIikge1xyXG5cdFx0cmV0dXJuIGZpbHRlclJlc3VsdHMuZXZlcnkoKHJlc3VsdCkgPT4gcmVzdWx0KTtcclxuXHR9IGVsc2UgaWYgKGdyb3VwLmdyb3VwQ29uZGl0aW9uID09PSBcImFueVwiKSB7XHJcblx0XHRyZXR1cm4gZmlsdGVyUmVzdWx0cy5zb21lKChyZXN1bHQpID0+IHJlc3VsdCk7XHJcblx0fSBlbHNlIGlmIChncm91cC5ncm91cENvbmRpdGlvbiA9PT0gXCJub25lXCIpIHtcclxuXHRcdHJldHVybiAhZmlsdGVyUmVzdWx0cy5zb21lKChyZXN1bHQpID0+IHJlc3VsdCk7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gdHJ1ZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIOWwhuWNleS4qui/h+a7pOWZqOW6lOeUqOS6juS7u+WKoVxyXG4gKiBAcGFyYW0gdGFzayDopoHov4fmu6TnmoTku7vliqFcclxuICogQHBhcmFtIGZpbHRlciDov4fmu6TlmahcclxuICogQHJldHVybnMg5aaC5p6c5Lu75Yqh5ruh6Laz6L+H5ruk5p2h5Lu25YiZ6L+U5ZuedHJ1ZVxyXG4gKi9cclxuZnVuY3Rpb24gYXBwbHlGaWx0ZXIodGFzazogVGFzaywgZmlsdGVyOiBGaWx0ZXIpOiBib29sZWFuIHtcclxuXHRjb25zdCB7IHByb3BlcnR5LCBjb25kaXRpb24sIHZhbHVlIH0gPSBmaWx0ZXI7XHJcblxyXG5cdC8vIOWvueS6juepuuadoeS7tu+8jOWni+e7iOi/lOWbnnRydWVcclxuXHRpZiAoIWNvbmRpdGlvbikge1xyXG5cdFx0cmV0dXJuIHRydWU7XHJcblx0fVxyXG5cclxuXHRzd2l0Y2ggKHByb3BlcnR5KSB7XHJcblx0XHRjYXNlIFwiY29udGVudFwiOlxyXG5cdFx0XHRyZXR1cm4gYXBwbHlDb250ZW50RmlsdGVyKHRhc2suY29udGVudCwgY29uZGl0aW9uLCB2YWx1ZSk7XHJcblx0XHRjYXNlIFwic3RhdHVzXCI6XHJcblx0XHRcdHJldHVybiBhcHBseVN0YXR1c0ZpbHRlcih0YXNrLnN0YXR1cywgY29uZGl0aW9uLCB2YWx1ZSk7XHJcblx0XHRjYXNlIFwicHJpb3JpdHlcIjpcclxuXHRcdFx0cmV0dXJuIGFwcGx5UHJpb3JpdHlGaWx0ZXIoXHJcblx0XHRcdFx0dGFzay5tZXRhZGF0YS5wcmlvcml0eSxcclxuXHRcdFx0XHRjb25kaXRpb24sXHJcblx0XHRcdFx0dmFsdWVcclxuXHRcdFx0KTtcclxuXHRcdGNhc2UgXCJkdWVEYXRlXCI6XHJcblx0XHRcdHJldHVybiBhcHBseURhdGVGaWx0ZXIodGFzay5tZXRhZGF0YS5kdWVEYXRlLCBjb25kaXRpb24sIHZhbHVlKTtcclxuXHRcdGNhc2UgXCJzdGFydERhdGVcIjpcclxuXHRcdFx0cmV0dXJuIGFwcGx5RGF0ZUZpbHRlcih0YXNrLm1ldGFkYXRhLnN0YXJ0RGF0ZSwgY29uZGl0aW9uLCB2YWx1ZSk7XHJcblx0XHRjYXNlIFwic2NoZWR1bGVkRGF0ZVwiOlxyXG5cdFx0XHRyZXR1cm4gYXBwbHlEYXRlRmlsdGVyKFxyXG5cdFx0XHRcdHRhc2subWV0YWRhdGEuc2NoZWR1bGVkRGF0ZSxcclxuXHRcdFx0XHRjb25kaXRpb24sXHJcblx0XHRcdFx0dmFsdWVcclxuXHRcdFx0KTtcclxuXHRcdGNhc2UgXCJ0YWdzXCI6XHJcblx0XHRcdHJldHVybiBhcHBseVRhZ3NGaWx0ZXIodGFzay5tZXRhZGF0YS50YWdzLCBjb25kaXRpb24sIHZhbHVlKTtcclxuXHRcdGNhc2UgXCJmaWxlUGF0aFwiOlxyXG5cdFx0XHRyZXR1cm4gYXBwbHlGaWxlUGF0aEZpbHRlcih0YXNrLmZpbGVQYXRoLCBjb25kaXRpb24sIHZhbHVlKTtcclxuXHRcdGNhc2UgXCJwcm9qZWN0XCI6XHJcblx0XHRcdHJldHVybiBhcHBseVByb2plY3RGaWx0ZXIodGFzay5tZXRhZGF0YS5wcm9qZWN0LCBjb25kaXRpb24sIHZhbHVlKTtcclxuXHRcdGNhc2UgXCJjb21wbGV0ZWRcIjpcclxuXHRcdFx0cmV0dXJuIGFwcGx5Q29tcGxldGVkRmlsdGVyKHRhc2suY29tcGxldGVkLCBjb25kaXRpb24pO1xyXG5cdFx0ZGVmYXVsdDpcclxuXHRcdFx0Ly8g5aSE55CG5YW25LuW5bGe5oCnXHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdH1cclxufVxyXG5cclxuLyoqXHJcbiAqIOWGheWuuei/h+a7pOWZqOWunueOsFxyXG4gKi9cclxuZnVuY3Rpb24gYXBwbHlDb250ZW50RmlsdGVyKFxyXG5cdGNvbnRlbnQ6IHN0cmluZyxcclxuXHRjb25kaXRpb246IHN0cmluZyxcclxuXHR2YWx1ZT86IHN0cmluZ1xyXG4pOiBib29sZWFuIHtcclxuXHRpZiAoIWNvbnRlbnQpIGNvbnRlbnQgPSBcIlwiO1xyXG5cdGlmICghdmFsdWUpIHZhbHVlID0gXCJcIjtcclxuXHJcblx0c3dpdGNoIChjb25kaXRpb24pIHtcclxuXHRcdGNhc2UgXCJjb250YWluc1wiOlxyXG5cdFx0XHRyZXR1cm4gY29udGVudC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHZhbHVlLnRvTG93ZXJDYXNlKCkpO1xyXG5cdFx0Y2FzZSBcImRvZXNOb3RDb250YWluXCI6XHJcblx0XHRcdHJldHVybiAhY29udGVudC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHZhbHVlLnRvTG93ZXJDYXNlKCkpO1xyXG5cdFx0Y2FzZSBcImlzXCI6XHJcblx0XHRcdHJldHVybiBjb250ZW50LnRvTG93ZXJDYXNlKCkgPT09IHZhbHVlLnRvTG93ZXJDYXNlKCk7XHJcblx0XHRjYXNlIFwiaXNOb3RcIjpcclxuXHRcdFx0cmV0dXJuIGNvbnRlbnQudG9Mb3dlckNhc2UoKSAhPT0gdmFsdWUudG9Mb3dlckNhc2UoKTtcclxuXHRcdGNhc2UgXCJzdGFydHNXaXRoXCI6XHJcblx0XHRcdHJldHVybiBjb250ZW50LnRvTG93ZXJDYXNlKCkuc3RhcnRzV2l0aCh2YWx1ZS50b0xvd2VyQ2FzZSgpKTtcclxuXHRcdGNhc2UgXCJlbmRzV2l0aFwiOlxyXG5cdFx0XHRyZXR1cm4gY29udGVudC50b0xvd2VyQ2FzZSgpLmVuZHNXaXRoKHZhbHVlLnRvTG93ZXJDYXNlKCkpO1xyXG5cdFx0Y2FzZSBcImlzRW1wdHlcIjpcclxuXHRcdFx0cmV0dXJuIGNvbnRlbnQudHJpbSgpID09PSBcIlwiO1xyXG5cdFx0Y2FzZSBcImlzTm90RW1wdHlcIjpcclxuXHRcdFx0cmV0dXJuIGNvbnRlbnQudHJpbSgpICE9PSBcIlwiO1xyXG5cdFx0ZGVmYXVsdDpcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICog54q25oCB6L+H5ruk5Zmo5a6e546wXHJcbiAqL1xyXG5mdW5jdGlvbiBhcHBseVN0YXR1c0ZpbHRlcihcclxuXHRzdGF0dXM6IHN0cmluZyxcclxuXHRjb25kaXRpb246IHN0cmluZyxcclxuXHR2YWx1ZT86IHN0cmluZ1xyXG4pOiBib29sZWFuIHtcclxuXHRpZiAoIXN0YXR1cykgc3RhdHVzID0gXCJcIjtcclxuXHRpZiAoIXZhbHVlKSB2YWx1ZSA9IFwiXCI7XHJcblxyXG5cdHN3aXRjaCAoY29uZGl0aW9uKSB7XHJcblx0XHRjYXNlIFwiY29udGFpbnNcIjpcclxuXHRcdFx0cmV0dXJuIHN0YXR1cy50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHZhbHVlLnRvTG93ZXJDYXNlKCkpO1xyXG5cdFx0Y2FzZSBcImRvZXNOb3RDb250YWluXCI6XHJcblx0XHRcdHJldHVybiAhc3RhdHVzLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXModmFsdWUudG9Mb3dlckNhc2UoKSk7XHJcblx0XHRjYXNlIFwiaXNcIjpcclxuXHRcdFx0cmV0dXJuIHN0YXR1cy50b0xvd2VyQ2FzZSgpID09PSB2YWx1ZS50b0xvd2VyQ2FzZSgpO1xyXG5cdFx0Y2FzZSBcImlzTm90XCI6XHJcblx0XHRcdHJldHVybiBzdGF0dXMudG9Mb3dlckNhc2UoKSAhPT0gdmFsdWUudG9Mb3dlckNhc2UoKTtcclxuXHRcdGNhc2UgXCJpc0VtcHR5XCI6XHJcblx0XHRcdHJldHVybiBzdGF0dXMudHJpbSgpID09PSBcIlwiO1xyXG5cdFx0Y2FzZSBcImlzTm90RW1wdHlcIjpcclxuXHRcdFx0cmV0dXJuIHN0YXR1cy50cmltKCkgIT09IFwiXCI7XHJcblx0XHRkZWZhdWx0OlxyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHR9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiDkvJjlhYjnuqfov4fmu6Tlmajlrp7njrBcclxuICovXHJcbmZ1bmN0aW9uIGFwcGx5UHJpb3JpdHlGaWx0ZXIoXHJcblx0cHJpb3JpdHk6IG51bWJlciB8IHVuZGVmaW5lZCxcclxuXHRjb25kaXRpb246IHN0cmluZyxcclxuXHR2YWx1ZT86IHN0cmluZ1xyXG4pOiBib29sZWFuIHtcclxuXHQvLyDlpoLmnpzmsqHmnInorr7nva7kvJjlhYjnuqfvvIzlsIblhbbop4bkuLowXHJcblx0Y29uc3QgdGFza1ByaW9yaXR5ID0gdHlwZW9mIHByaW9yaXR5ID09PSBcIm51bWJlclwiID8gcHJpb3JpdHkgOiAwO1xyXG5cclxuXHQvLyDlr7nkuo7nqbrlgLzmnaHku7ZcclxuXHRzd2l0Y2ggKGNvbmRpdGlvbikge1xyXG5cdFx0Y2FzZSBcImlzRW1wdHlcIjpcclxuXHRcdFx0cmV0dXJuIHByaW9yaXR5ID09PSB1bmRlZmluZWQ7XHJcblx0XHRjYXNlIFwiaXNOb3RFbXB0eVwiOlxyXG5cdFx0XHRyZXR1cm4gcHJpb3JpdHkgIT09IHVuZGVmaW5lZDtcclxuXHR9XHJcblxyXG5cdGlmICghdmFsdWUpIHJldHVybiB0cnVlO1xyXG5cclxuXHQvLyDlsJ3or5XlsIblgLzovazmjaLkuLrmlbDlrZdcclxuXHRsZXQgbnVtVmFsdWU6IG51bWJlcjtcclxuXHR0cnkge1xyXG5cdFx0bnVtVmFsdWUgPSBwYXJzZUludCh2YWx1ZSk7XHJcblx0XHRpZiAoaXNOYU4obnVtVmFsdWUpKSBudW1WYWx1ZSA9IDA7XHJcblx0fSBjYXRjaCB7XHJcblx0XHRudW1WYWx1ZSA9IDA7XHJcblx0fVxyXG5cclxuXHRzd2l0Y2ggKGNvbmRpdGlvbikge1xyXG5cdFx0Y2FzZSBcImlzXCI6XHJcblx0XHRcdHJldHVybiB0YXNrUHJpb3JpdHkgPT09IG51bVZhbHVlO1xyXG5cdFx0Y2FzZSBcImlzTm90XCI6XHJcblx0XHRcdHJldHVybiB0YXNrUHJpb3JpdHkgIT09IG51bVZhbHVlO1xyXG5cdFx0ZGVmYXVsdDpcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICog5pel5pyf6L+H5ruk5Zmo5a6e546wXHJcbiAqL1xyXG5mdW5jdGlvbiBhcHBseURhdGVGaWx0ZXIoXHJcblx0ZGF0ZTogbnVtYmVyIHwgdW5kZWZpbmVkLFxyXG5cdGNvbmRpdGlvbjogc3RyaW5nLFxyXG5cdHZhbHVlPzogc3RyaW5nXHJcbik6IGJvb2xlYW4ge1xyXG5cdC8vIOWkhOeQhuepuuWAvOadoeS7tlxyXG5cdHN3aXRjaCAoY29uZGl0aW9uKSB7XHJcblx0XHRjYXNlIFwiaXNFbXB0eVwiOlxyXG5cdFx0XHRyZXR1cm4gZGF0ZSA9PT0gdW5kZWZpbmVkO1xyXG5cdFx0Y2FzZSBcImlzTm90RW1wdHlcIjpcclxuXHRcdFx0cmV0dXJuIGRhdGUgIT09IHVuZGVmaW5lZDtcclxuXHR9XHJcblxyXG5cdC8vIOWmguaenOS7u+WKoeayoeacieaXpeacn+aIlui/h+a7pOWAvOS4uuepuu+8jOWImeWMuemFjeadoeS7tuW+iOeJueauilxyXG5cdGlmIChkYXRlID09PSB1bmRlZmluZWQgfHwgIXZhbHVlKSB7XHJcblx0XHQvLyDlr7nkuo7pnIDopoHml6XmnJ/nmoTmnaHku7bvvIzlpoLmnpzmsqHmnInml6XmnJ/liJnkuI3ljLnphY1cclxuXHRcdGlmIChbXCJpc1wiLCBcImlzTm90XCIsIFwiPlwiLCBcIjxcIiwgXCI+PVwiLCBcIjw9XCJdLmluY2x1ZGVzKGNvbmRpdGlvbikpIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRydWU7XHJcblx0fVxyXG5cclxuXHQvLyDop6PmnpDml6XmnJ9cclxuXHRjb25zdCB0YXNrRGF0ZSA9IG1vbWVudChkYXRlKS5zdGFydE9mKFwiZGF5XCIpO1xyXG5cdGNvbnN0IGZpbHRlckRhdGUgPSBtb21lbnQodmFsdWUsIFwiWVlZWS1NTS1ERFwiKS5zdGFydE9mKFwiZGF5XCIpO1xyXG5cclxuXHRpZiAoIXRhc2tEYXRlLmlzVmFsaWQoKSB8fCAhZmlsdGVyRGF0ZS5pc1ZhbGlkKCkpIHtcclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHR9XHJcblxyXG5cdHN3aXRjaCAoY29uZGl0aW9uKSB7XHJcblx0XHRjYXNlIFwiaXNcIjpcclxuXHRcdFx0cmV0dXJuIHRhc2tEYXRlLmlzU2FtZShmaWx0ZXJEYXRlLCBcImRheVwiKTtcclxuXHRcdGNhc2UgXCJpc05vdFwiOlxyXG5cdFx0XHRyZXR1cm4gIXRhc2tEYXRlLmlzU2FtZShmaWx0ZXJEYXRlLCBcImRheVwiKTtcclxuXHRcdGNhc2UgXCI+XCI6XHJcblx0XHRcdHJldHVybiB0YXNrRGF0ZS5pc0FmdGVyKGZpbHRlckRhdGUsIFwiZGF5XCIpO1xyXG5cdFx0Y2FzZSBcIjxcIjpcclxuXHRcdFx0cmV0dXJuIHRhc2tEYXRlLmlzQmVmb3JlKGZpbHRlckRhdGUsIFwiZGF5XCIpO1xyXG5cdFx0Y2FzZSBcIj49XCI6XHJcblx0XHRcdHJldHVybiB0YXNrRGF0ZS5pc1NhbWVPckFmdGVyKGZpbHRlckRhdGUsIFwiZGF5XCIpO1xyXG5cdFx0Y2FzZSBcIjw9XCI6XHJcblx0XHRcdHJldHVybiB0YXNrRGF0ZS5pc1NhbWVPckJlZm9yZShmaWx0ZXJEYXRlLCBcImRheVwiKTtcclxuXHRcdGRlZmF1bHQ6XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdH1cclxufVxyXG5cclxuLyoqXHJcbiAqIOagh+etvui/h+a7pOWZqOWunueOsFxyXG4gKi9cclxuZnVuY3Rpb24gYXBwbHlUYWdzRmlsdGVyKFxyXG5cdHRhZ3M6IHN0cmluZ1tdLFxyXG5cdGNvbmRpdGlvbjogc3RyaW5nLFxyXG5cdHZhbHVlPzogc3RyaW5nXHJcbik6IGJvb2xlYW4ge1xyXG5cdGlmICghdGFncykgdGFncyA9IFtdO1xyXG5cdGlmICghdmFsdWUpIHZhbHVlID0gXCJcIjtcclxuXHJcblx0Y29uc3QgbG93ZXJWYWx1ZSA9IHZhbHVlLnRvTG93ZXJDYXNlKCk7XHJcblxyXG5cdHN3aXRjaCAoY29uZGl0aW9uKSB7XHJcblx0XHRjYXNlIFwiY29udGFpbnNcIjpcclxuXHRcdFx0cmV0dXJuIHRhZ3Muc29tZSgodGFnKSA9PiB0YWcudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhsb3dlclZhbHVlKSk7XHJcblx0XHRjYXNlIFwiZG9lc05vdENvbnRhaW5cIjpcclxuXHRcdFx0cmV0dXJuICF0YWdzLnNvbWUoKHRhZykgPT4gdGFnLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMobG93ZXJWYWx1ZSkpO1xyXG5cdFx0Y2FzZSBcImlzRW1wdHlcIjpcclxuXHRcdFx0cmV0dXJuIHRhZ3MubGVuZ3RoID09PSAwO1xyXG5cdFx0Y2FzZSBcImlzTm90RW1wdHlcIjpcclxuXHRcdFx0cmV0dXJuIHRhZ3MubGVuZ3RoID4gMDtcclxuXHRcdGRlZmF1bHQ6XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdH1cclxufVxyXG5cclxuLyoqXHJcbiAqIOaWh+S7tui3r+W+hOi/h+a7pOWZqOWunueOsFxyXG4gKi9cclxuZnVuY3Rpb24gYXBwbHlGaWxlUGF0aEZpbHRlcihcclxuXHRmaWxlUGF0aDogc3RyaW5nLFxyXG5cdGNvbmRpdGlvbjogc3RyaW5nLFxyXG5cdHZhbHVlPzogc3RyaW5nXHJcbik6IGJvb2xlYW4ge1xyXG5cdGlmICghZmlsZVBhdGgpIGZpbGVQYXRoID0gXCJcIjtcclxuXHRpZiAoIXZhbHVlKSB2YWx1ZSA9IFwiXCI7XHJcblxyXG5cdHN3aXRjaCAoY29uZGl0aW9uKSB7XHJcblx0XHRjYXNlIFwiY29udGFpbnNcIjpcclxuXHRcdFx0cmV0dXJuIGZpbGVQYXRoLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXModmFsdWUudG9Mb3dlckNhc2UoKSk7XHJcblx0XHRjYXNlIFwiZG9lc05vdENvbnRhaW5cIjpcclxuXHRcdFx0cmV0dXJuICFmaWxlUGF0aC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHZhbHVlLnRvTG93ZXJDYXNlKCkpO1xyXG5cdFx0Y2FzZSBcImlzXCI6XHJcblx0XHRcdHJldHVybiBmaWxlUGF0aC50b0xvd2VyQ2FzZSgpID09PSB2YWx1ZS50b0xvd2VyQ2FzZSgpO1xyXG5cdFx0Y2FzZSBcImlzTm90XCI6XHJcblx0XHRcdHJldHVybiBmaWxlUGF0aC50b0xvd2VyQ2FzZSgpICE9PSB2YWx1ZS50b0xvd2VyQ2FzZSgpO1xyXG5cdFx0Y2FzZSBcInN0YXJ0c1dpdGhcIjpcclxuXHRcdFx0cmV0dXJuIGZpbGVQYXRoLnRvTG93ZXJDYXNlKCkuc3RhcnRzV2l0aCh2YWx1ZS50b0xvd2VyQ2FzZSgpKTtcclxuXHRcdGNhc2UgXCJlbmRzV2l0aFwiOlxyXG5cdFx0XHRyZXR1cm4gZmlsZVBhdGgudG9Mb3dlckNhc2UoKS5lbmRzV2l0aCh2YWx1ZS50b0xvd2VyQ2FzZSgpKTtcclxuXHRcdGNhc2UgXCJpc0VtcHR5XCI6XHJcblx0XHRcdHJldHVybiBmaWxlUGF0aC50cmltKCkgPT09IFwiXCI7XHJcblx0XHRjYXNlIFwiaXNOb3RFbXB0eVwiOlxyXG5cdFx0XHRyZXR1cm4gZmlsZVBhdGgudHJpbSgpICE9PSBcIlwiO1xyXG5cdFx0ZGVmYXVsdDpcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICog6aG555uu6L+H5ruk5Zmo5a6e546wXHJcbiAqL1xyXG5mdW5jdGlvbiBhcHBseVByb2plY3RGaWx0ZXIoXHJcblx0cHJvamVjdDogc3RyaW5nIHwgdW5kZWZpbmVkLFxyXG5cdGNvbmRpdGlvbjogc3RyaW5nLFxyXG5cdHZhbHVlPzogc3RyaW5nXHJcbik6IGJvb2xlYW4ge1xyXG5cdGNvbnN0IHByb2ogPSAocHJvamVjdCA/PyBcIlwiKS50b0xvd2VyQ2FzZSgpO1xyXG5cdGNvbnN0IHZhbCA9ICh2YWx1ZSA/PyBcIlwiKS50b0xvd2VyQ2FzZSgpO1xyXG5cclxuXHRzd2l0Y2ggKGNvbmRpdGlvbikge1xyXG5cdFx0Y2FzZSBcImNvbnRhaW5zXCI6XHJcblx0XHRcdHJldHVybiBwcm9qLmluY2x1ZGVzKHZhbCk7XHJcblx0XHRjYXNlIFwiZG9lc05vdENvbnRhaW5cIjpcclxuXHRcdFx0cmV0dXJuICFwcm9qLmluY2x1ZGVzKHZhbCk7XHJcblx0XHRjYXNlIFwiaXNcIjpcclxuXHRcdFx0cmV0dXJuIHByb2ogPT09IHZhbDtcclxuXHRcdGNhc2UgXCJpc05vdFwiOlxyXG5cdFx0XHRyZXR1cm4gcHJvaiAhPT0gdmFsO1xyXG5cdFx0Y2FzZSBcInN0YXJ0c1dpdGhcIjpcclxuXHRcdFx0cmV0dXJuIHByb2ouc3RhcnRzV2l0aCh2YWwpO1xyXG5cdFx0Y2FzZSBcImVuZHNXaXRoXCI6XHJcblx0XHRcdHJldHVybiBwcm9qLmVuZHNXaXRoKHZhbCk7XHJcblx0XHRjYXNlIFwiaXNFbXB0eVwiOlxyXG5cdFx0XHRyZXR1cm4gcHJvai50cmltKCkgPT09IFwiXCI7XHJcblx0XHRjYXNlIFwiaXNOb3RFbXB0eVwiOlxyXG5cdFx0XHRyZXR1cm4gcHJvai50cmltKCkgIT09IFwiXCI7XHJcblx0XHRkZWZhdWx0OlxyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHR9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiDlrozmiJDnirbmgIHov4fmu6Tlmajlrp7njrBcclxuICovXHJcbmZ1bmN0aW9uIGFwcGx5Q29tcGxldGVkRmlsdGVyKGNvbXBsZXRlZDogYm9vbGVhbiwgY29uZGl0aW9uOiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHRzd2l0Y2ggKGNvbmRpdGlvbikge1xyXG5cdFx0Y2FzZSBcImlzVHJ1ZVwiOlxyXG5cdFx0XHRyZXR1cm4gY29tcGxldGVkID09PSB0cnVlO1xyXG5cdFx0Y2FzZSBcImlzRmFsc2VcIjpcclxuXHRcdFx0cmV0dXJuIGNvbXBsZXRlZCA9PT0gZmFsc2U7XHJcblx0XHRkZWZhdWx0OlxyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHR9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDZW50cmFsaXplZCBmdW5jdGlvbiB0byBmaWx0ZXIgdGFza3MgYmFzZWQgb24gdmlldyBjb25maWd1cmF0aW9uIGFuZCBvcHRpb25zLlxyXG4gKiBJbmNsdWRlcyBjb21wbGV0aW9uIHN0YXR1cyBmaWx0ZXJpbmcuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyVGFza3MoXHJcblx0YWxsVGFza3M6IFRhc2tbXSxcclxuXHR2aWV3SWQ6IFZpZXdNb2RlLFxyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdG9wdGlvbnM6IEZpbHRlck9wdGlvbnMgPSB7fVxyXG4pOiBUYXNrW10ge1xyXG5cdGxldCBmaWx0ZXJlZCA9IFsuLi5hbGxUYXNrc107XHJcblx0Y29uc3Qgdmlld0NvbmZpZyA9IGdldFZpZXdTZXR0aW5nT3JEZWZhdWx0KHBsdWdpbiwgdmlld0lkKTtcclxuXHRjb25zdCBmaWx0ZXJSdWxlcyA9IHZpZXdDb25maWcuZmlsdGVyUnVsZXMgfHwge307XHJcblx0Y29uc3QgZ2xvYmFsRmlsdGVyUnVsZXMgPSBwbHVnaW4uc2V0dGluZ3MuZ2xvYmFsRmlsdGVyUnVsZXMgfHwge307XHJcblxyXG5cdC8vIC0tLSDov4fmu6QgSUNTIOS6i+S7tuWcqOS4jeW6lOWxleekuueahOinhuWbvuS4re+8iOS+i+WmgiBpbmJveO+8iS0tLVxyXG5cdC8vIElDUyDkuovku7blupTku4XlnKjml6XljoYv5pel56iL57G76KeG5Zu+77yIY2FsZW5kYXIvZm9yZWNhc3TvvInkuK3lsZXnpLpcclxuXHRjb25zdCBpc0NhbGVuZGFyVmlldyA9XHJcblx0XHR2aWV3SWQgPT09IFwiY2FsZW5kYXJcIiB8fFxyXG5cdFx0KHR5cGVvZiB2aWV3SWQgPT09IFwic3RyaW5nXCIgJiYgdmlld0lkLnN0YXJ0c1dpdGgoXCJjYWxlbmRhclwiKSk7XHJcblx0Y29uc3QgaXNGb3JlY2FzdFZpZXcgPVxyXG5cdFx0dmlld0lkID09PSBcImZvcmVjYXN0XCIgfHxcclxuXHRcdCh0eXBlb2Ygdmlld0lkID09PSBcInN0cmluZ1wiICYmIHZpZXdJZC5zdGFydHNXaXRoKFwiZm9yZWNhc3RcIikpO1xyXG5cclxuXHRpZiAoIWlzQ2FsZW5kYXJWaWV3ICYmICFpc0ZvcmVjYXN0Vmlldykge1xyXG5cdFx0ZmlsdGVyZWQgPSBmaWx0ZXJlZC5maWx0ZXIoKHRhc2spID0+IHtcclxuXHRcdFx0Ly8g6K+G5YirIElDUyDkuovku7bku7vliqHvvIjkvJjlhYjku44gbWV0YWRhdGEuc291cmNlIOivu+WPlu+8jOWFvOWuuSBsZWdhY3kgc291cmNlIOWtl+aute+8iVxyXG5cdFx0XHRjb25zdCBtZXRhU291cmNlVHlwZSA9XHJcblx0XHRcdFx0KHRhc2sgYXMgYW55KS5tZXRhZGF0YT8uc291cmNlPy50eXBlID8/XHJcblx0XHRcdFx0KHRhc2sgYXMgYW55KS5zb3VyY2U/LnR5cGU7XHJcblx0XHRcdGNvbnN0IGlzSWNzVGFzayA9IG1ldGFTb3VyY2VUeXBlID09PSBcImljc1wiO1xyXG5cdFx0XHQvLyDpnZ4gSUNTIOS/neeVme+8m0lDUyDlnKjmraTnsbvop4blm77kuK3ov4fmu6TmjolcclxuXHRcdFx0cmV0dXJuICFpc0ljc1Rhc2s7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIC0tLSDln7rmnKznrZvpgInvvJrpmpDol4/lt7LlrozmiJDlkoznqbrnmb3ku7vliqEgLS0tXHJcblx0Ly8g5rOo5oSP77ya6L+Z5Lqb5piv5Z+656GA6L+H5ruk5p2h5Lu277yM5aeL57uI5bqU55SoXHJcblx0aWYgKHZpZXdDb25maWcuaGlkZUNvbXBsZXRlZEFuZEFiYW5kb25lZFRhc2tzKSB7XHJcblx0XHRmaWx0ZXJlZCA9IGZpbHRlcmVkLmZpbHRlcigodGFzaykgPT4gIXRhc2suY29tcGxldGVkKTtcclxuXHR9XHJcblxyXG5cdGlmICh2aWV3Q29uZmlnLmZpbHRlckJsYW5rcykge1xyXG5cdFx0ZmlsdGVyZWQgPSBmaWx0ZXJlZC5maWx0ZXIoKHRhc2spID0+IHRhc2suY29udGVudC50cmltKCkgIT09IFwiXCIpO1xyXG5cdH1cclxuXHJcblx0Ly8gLS0tIOW6lOeUqOWFqOWxgOetm+mAieWZqO+8iOWmguaenOWtmOWcqO+8iSAtLS1cclxuXHRpZiAoXHJcblx0XHRnbG9iYWxGaWx0ZXJSdWxlcy5hZHZhbmNlZEZpbHRlciAmJlxyXG5cdFx0Z2xvYmFsRmlsdGVyUnVsZXMuYWR2YW5jZWRGaWx0ZXIuZmlsdGVyR3JvdXBzPy5sZW5ndGggPiAwXHJcblx0KSB7XHJcblx0XHRjb25zb2xlLmxvZyhcIuW6lOeUqOWFqOWxgOetm+mAieWZqDpcIiwgZ2xvYmFsRmlsdGVyUnVsZXMuYWR2YW5jZWRGaWx0ZXIpO1xyXG5cdFx0ZmlsdGVyZWQgPSBmaWx0ZXJlZC5maWx0ZXIoKHRhc2spID0+XHJcblx0XHRcdGFwcGx5QWR2YW5jZWRGaWx0ZXIodGFzaywgZ2xvYmFsRmlsdGVyUnVsZXMuYWR2YW5jZWRGaWx0ZXIhKVxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdC8vIC0tLSDlupTnlKjop4blm77phY3nva7kuK3nmoTln7rnoYDpq5jnuqfov4fmu6TlmajvvIjlpoLmnpzlrZjlnKjvvIkgLS0tXHJcblx0aWYgKFxyXG5cdFx0ZmlsdGVyUnVsZXMuYWR2YW5jZWRGaWx0ZXIgJiZcclxuXHRcdGZpbHRlclJ1bGVzLmFkdmFuY2VkRmlsdGVyLmZpbHRlckdyb3Vwcz8ubGVuZ3RoID4gMFxyXG5cdCkge1xyXG5cdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFwi5bqU55So6KeG5Zu+6YWN572u5Lit55qE5Z+656GA6auY57qn6L+H5ruk5ZmoOlwiLFxyXG5cdFx0XHRmaWx0ZXJSdWxlcy5hZHZhbmNlZEZpbHRlclxyXG5cdFx0KTtcclxuXHRcdGZpbHRlcmVkID0gZmlsdGVyZWQuZmlsdGVyKCh0YXNrKSA9PlxyXG5cdFx0XHRhcHBseUFkdmFuY2VkRmlsdGVyKHRhc2ssIGZpbHRlclJ1bGVzLmFkdmFuY2VkRmlsdGVyISlcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvLyAtLS0g5bqU55So5Lyg5YWl55qE5a6e5pe26auY57qn6L+H5ruk5Zmo77yI5aaC5p6c5a2Y5Zyo77yJIC0tLVxyXG5cdGlmIChcclxuXHRcdG9wdGlvbnMuYWR2YW5jZWRGaWx0ZXIgJiZcclxuXHRcdG9wdGlvbnMuYWR2YW5jZWRGaWx0ZXIuZmlsdGVyR3JvdXBzPy5sZW5ndGggPiAwXHJcblx0KSB7XHJcblx0XHRjb25zb2xlLmxvZyhcIuW6lOeUqOS8oOWFpeeahOWunuaXtumrmOe6p+i/h+a7pOWZqDpcIiwgb3B0aW9ucy5hZHZhbmNlZEZpbHRlcik7XHJcblx0XHRmaWx0ZXJlZCA9IGZpbHRlcmVkLmZpbHRlcigodGFzaykgPT5cclxuXHRcdFx0YXBwbHlBZHZhbmNlZEZpbHRlcih0YXNrLCBvcHRpb25zLmFkdmFuY2VkRmlsdGVyISlcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8g5aaC5p6c5pyJ5a6e5pe26auY57qn6L+H5ruk5Zmo77yM5bqU55So5Z+65pys6KeE5YiZ5ZCO55u05o6l6L+U5ZueXHJcblx0XHQvLyDlupTnlKggaXNOb3RDb21wbGV0ZWQg6L+H5ruk5Zmo77yI5Z+65LqO6KeG5Zu+6YWN572u55qEIGhpZGVDb21wbGV0ZWRBbmRBYmFuZG9uZWRUYXNrc++8iVxyXG5cdFx0ZmlsdGVyZWQgPSBmaWx0ZXJlZC5maWx0ZXIoKHRhc2spID0+XHJcblx0XHRcdGlzTm90Q29tcGxldGVkKHBsdWdpbiwgdGFzaywgdmlld0lkKVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyDlupTnlKggaXNCbGFuayDov4fmu6TlmajvvIjln7rkuo7op4blm77phY3nva7nmoQgZmlsdGVyQmxhbmtz77yJXHJcblx0XHRmaWx0ZXJlZCA9IGZpbHRlcmVkLmZpbHRlcigodGFzaykgPT4gaXNCbGFuayhwbHVnaW4sIHRhc2ssIHZpZXdJZCkpO1xyXG5cclxuXHRcdC8vIOW6lOeUqOmAmueUqOaWh+acrOaQnOe0ou+8iOadpeiHqumAiemhue+8iVxyXG5cdFx0aWYgKG9wdGlvbnMudGV4dFF1ZXJ5KSB7XHJcblx0XHRcdGNvbnN0IHRleHRGaWx0ZXIgPSBvcHRpb25zLnRleHRRdWVyeS50b0xvd2VyQ2FzZSgpO1xyXG5cdFx0XHRmaWx0ZXJlZCA9IGZpbHRlcmVkLmZpbHRlcihcclxuXHRcdFx0XHQodGFzaykgPT5cclxuXHRcdFx0XHRcdHRhc2suY29udGVudC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHRleHRGaWx0ZXIpIHx8XHJcblx0XHRcdFx0XHR0YXNrLm1ldGFkYXRhLnByb2plY3Q/LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXModGV4dEZpbHRlcikgfHxcclxuXHRcdFx0XHRcdHRhc2subWV0YWRhdGEuY29udGV4dD8udG9Mb3dlckNhc2UoKS5pbmNsdWRlcyh0ZXh0RmlsdGVyKSB8fFxyXG5cdFx0XHRcdFx0dGFzay5tZXRhZGF0YS50YWdzPy5zb21lKCh0YWcpID0+XHJcblx0XHRcdFx0XHRcdHRhZy50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHRleHRGaWx0ZXIpXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8g5pyJ5a6e5pe26auY57qn6L+H5ruk5Zmo5pe277yM6Lez6L+H5bqU55So6buY6K6k6KeG5Zu+6YC76L6R5ZKM6buY6K6k6L+H5ruk6KeE5YiZXHJcblx0XHRyZXR1cm4gZmlsdGVyZWQ7XHJcblx0fVxyXG5cclxuXHQvLyAtLS0g5Lul5LiL5piv5peg6auY57qn6L+H5ruk5Zmo5pe255qE6buY6K6k6KGM5Li6IC0tLVxyXG5cclxuXHQvLyAtLS0gQXBwbHkgRmlsdGVyIFJ1bGVzIGRlZmluZWQgaW4gVmlld0NvbmZpZyAtLS1cclxuXHRpZiAoZmlsdGVyUnVsZXMudGV4dENvbnRhaW5zKSB7XHJcblx0XHRjb25zdCBxdWVyeSA9IGZpbHRlclJ1bGVzLnRleHRDb250YWlucy50b0xvd2VyQ2FzZSgpO1xyXG5cdFx0ZmlsdGVyZWQgPSBmaWx0ZXJlZC5maWx0ZXIoKHRhc2spID0+XHJcblx0XHRcdHRhc2suY29udGVudC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHF1ZXJ5KVxyXG5cdFx0KTtcclxuXHR9XHJcblx0aWYgKGZpbHRlclJ1bGVzLnRhZ3NJbmNsdWRlICYmIGZpbHRlclJ1bGVzLnRhZ3NJbmNsdWRlLmxlbmd0aCA+IDApIHtcclxuXHRcdGZpbHRlcmVkID0gZmlsdGVyZWQuZmlsdGVyKCh0YXNrKSA9PlxyXG5cdFx0XHRmaWx0ZXJSdWxlcy50YWdzSW5jbHVkZT8uc29tZSgodGFnKSA9PlxyXG5cdFx0XHRcdHRhc2subWV0YWRhdGEudGFncy5zb21lKFxyXG5cdFx0XHRcdFx0KHRhc2tUYWcpID0+IHR5cGVvZiB0YXNrVGFnID09PSBcInN0cmluZ1wiICYmIHRhc2tUYWcgPT09IHRhZ1xyXG5cdFx0XHRcdClcclxuXHRcdFx0KVxyXG5cdFx0KTtcclxuXHR9XHJcblx0aWYgKGZpbHRlclJ1bGVzLnRhZ3NFeGNsdWRlICYmIGZpbHRlclJ1bGVzLnRhZ3NFeGNsdWRlLmxlbmd0aCA+IDApIHtcclxuXHRcdGZpbHRlcmVkID0gZmlsdGVyZWQuZmlsdGVyKCh0YXNrKSA9PiB7XHJcblx0XHRcdGlmICghdGFzay5tZXRhZGF0YS50YWdzIHx8IHRhc2subWV0YWRhdGEudGFncy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTsgLy8gS2VlcCB0YXNrcyB3aXRoIG5vIHRhZ3NcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ29udmVydCB0YXNrIHRhZ3MgdG8gbG93ZXJjYXNlIGZvciBjYXNlLWluc2Vuc2l0aXZlIGNvbXBhcmlzb25cclxuXHRcdFx0Y29uc3QgdGFza1RhZ3NMb3dlciA9IHRhc2subWV0YWRhdGEudGFncy5tYXAoKHRhZykgPT5cclxuXHRcdFx0XHR0YWcudG9Mb3dlckNhc2UoKVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgaWYgYW55IGV4Y2x1ZGVkIHRhZyBpcyBpbiB0aGUgdGFzaydzIHRhZ3NcclxuXHRcdFx0cmV0dXJuICFmaWx0ZXJSdWxlcy50YWdzRXhjbHVkZSEuc29tZSgoZXhjbHVkZVRhZykgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IHRhZ0xvd2VyID0gZXhjbHVkZVRhZy50b0xvd2VyQ2FzZSgpO1xyXG5cdFx0XHRcdHJldHVybiAoXHJcblx0XHRcdFx0XHR0YXNrVGFnc0xvd2VyLmluY2x1ZGVzKHRhZ0xvd2VyKSB8fFxyXG5cdFx0XHRcdFx0dGFza1RhZ3NMb3dlci5pbmNsdWRlcyhcIiNcIiArIHRhZ0xvd2VyKVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cdGlmIChmaWx0ZXJSdWxlcy5wcm9qZWN0KSB7XHJcblx0XHRmaWx0ZXJlZCA9IGZpbHRlcmVkLmZpbHRlcihcclxuXHRcdFx0KHRhc2spID0+XHJcblx0XHRcdFx0dGFzay5tZXRhZGF0YS5wcm9qZWN0Py50cmltKCkgPT09IGZpbHRlclJ1bGVzLnByb2plY3Q/LnRyaW0oKVxyXG5cdFx0KTtcclxuXHR9XHJcblx0aWYgKGZpbHRlclJ1bGVzLnByaW9yaXR5ICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdGZpbHRlcmVkID0gZmlsdGVyZWQuZmlsdGVyKCh0YXNrKSA9PiB7XHJcblx0XHRcdGlmIChmaWx0ZXJSdWxlcy5wcmlvcml0eSA9PT0gXCJub25lXCIpIHtcclxuXHRcdFx0XHRyZXR1cm4gdGFzay5tZXRhZGF0YS5wcmlvcml0eSA9PT0gdW5kZWZpbmVkO1xyXG5cdFx0XHR9IGVsc2UgaWYgKGZpbHRlclJ1bGVzLnByaW9yaXR5Py5pbmNsdWRlcyhcIixcIikpIHtcclxuXHRcdFx0XHRyZXR1cm4gZmlsdGVyUnVsZXMucHJpb3JpdHlcclxuXHRcdFx0XHRcdC5zcGxpdChcIixcIilcclxuXHRcdFx0XHRcdC5pbmNsdWRlcyhTdHJpbmcodGFzay5tZXRhZGF0YS5wcmlvcml0eSA/PyAwKSk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0cmV0dXJuIChcclxuXHRcdFx0XHRcdHRhc2subWV0YWRhdGEucHJpb3JpdHkgPT09XHJcblx0XHRcdFx0XHRwYXJzZUludChmaWx0ZXJSdWxlcy5wcmlvcml0eSA/PyBcIjBcIilcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblx0aWYgKGZpbHRlclJ1bGVzLnN0YXR1c0luY2x1ZGUgJiYgZmlsdGVyUnVsZXMuc3RhdHVzSW5jbHVkZS5sZW5ndGggPiAwKSB7XHJcblx0XHRmaWx0ZXJlZCA9IGZpbHRlcmVkLmZpbHRlcigodGFzaykgPT5cclxuXHRcdFx0ZmlsdGVyUnVsZXMuc3RhdHVzSW5jbHVkZSEuaW5jbHVkZXModGFzay5zdGF0dXMpXHJcblx0XHQpO1xyXG5cdH1cclxuXHRpZiAoZmlsdGVyUnVsZXMuc3RhdHVzRXhjbHVkZSAmJiBmaWx0ZXJSdWxlcy5zdGF0dXNFeGNsdWRlLmxlbmd0aCA+IDApIHtcclxuXHRcdGZpbHRlcmVkID0gZmlsdGVyZWQuZmlsdGVyKFxyXG5cdFx0XHQodGFzaykgPT4gIWZpbHRlclJ1bGVzLnN0YXR1c0V4Y2x1ZGUhLmluY2x1ZGVzKHRhc2suc3RhdHVzKVxyXG5cdFx0KTtcclxuXHR9XHJcblx0Ly8gUGF0aCBmaWx0ZXJzIChBZGRlZCBiYXNlZCBvbiBjb250ZW50LnRzIGxvZ2ljKVxyXG5cdGlmIChmaWx0ZXJSdWxlcy5wYXRoSW5jbHVkZXMpIHtcclxuXHRcdGNvbnN0IHF1ZXJ5ID0gZmlsdGVyUnVsZXMucGF0aEluY2x1ZGVzXHJcblx0XHRcdC5zcGxpdChcIixcIilcclxuXHRcdFx0LmZpbHRlcigocCkgPT4gcC50cmltKCkgIT09IFwiXCIpXHJcblx0XHRcdC5tYXAoKHApID0+IHAudHJpbSgpLnRvTG93ZXJDYXNlKCkpO1xyXG5cdFx0ZmlsdGVyZWQgPSBmaWx0ZXJlZC5maWx0ZXIoKHRhc2spID0+XHJcblx0XHRcdHF1ZXJ5LnNvbWUoKHEpID0+IHRhc2suZmlsZVBhdGgudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhxKSlcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHRpZiAoZmlsdGVyUnVsZXMucGF0aEV4Y2x1ZGVzKSB7XHJcblx0XHRjb25zdCBxdWVyeSA9IGZpbHRlclJ1bGVzLnBhdGhFeGNsdWRlc1xyXG5cdFx0XHQuc3BsaXQoXCIsXCIpXHJcblx0XHRcdC5maWx0ZXIoKHApID0+IHAudHJpbSgpICE9PSBcIlwiKVxyXG5cdFx0XHQubWFwKChwKSA9PiBwLnRyaW0oKS50b0xvd2VyQ2FzZSgpKTtcclxuXHRcdGZpbHRlcmVkID0gZmlsdGVyZWQuZmlsdGVyKCh0YXNrKSA9PiB7XHJcblx0XHRcdC8vIE9ubHkgZXhjbHVkZSBpZiBBTEwgZXhjbHVzaW9uIHBhdHRlcm5zIGFyZSBub3QgZm91bmQgaW4gdGhlIHBhdGhcclxuXHRcdFx0cmV0dXJuICFxdWVyeS5zb21lKChxKSA9PiB0YXNrLmZpbGVQYXRoLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMocSkpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyAtLS0gQXBwbHkgRGF0ZSBGaWx0ZXJzIGZyb20gcnVsZXMgLS0tXHJcblx0aWYgKGZpbHRlclJ1bGVzLmR1ZURhdGUpIHtcclxuXHRcdGNvbnN0IHRhcmdldER1ZURhdGUgPSBwYXJzZURhdGVGaWx0ZXJTdHJpbmcoZmlsdGVyUnVsZXMuZHVlRGF0ZSk7XHJcblx0XHRpZiAodGFyZ2V0RHVlRGF0ZSkge1xyXG5cdFx0XHRmaWx0ZXJlZCA9IGZpbHRlcmVkLmZpbHRlcigodGFzaykgPT5cclxuXHRcdFx0XHR0YXNrLm1ldGFkYXRhLmR1ZURhdGVcclxuXHRcdFx0XHRcdD8gbW9tZW50KHRhc2subWV0YWRhdGEuZHVlRGF0ZSkuaXNTYW1lKHRhcmdldER1ZURhdGUsIFwiZGF5XCIpXHJcblx0XHRcdFx0XHQ6IGZhbHNlXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblx0fVxyXG5cdGlmIChmaWx0ZXJSdWxlcy5zdGFydERhdGUpIHtcclxuXHRcdGNvbnN0IHRhcmdldFN0YXJ0RGF0ZSA9IHBhcnNlRGF0ZUZpbHRlclN0cmluZyhmaWx0ZXJSdWxlcy5zdGFydERhdGUpO1xyXG5cdFx0aWYgKHRhcmdldFN0YXJ0RGF0ZSkge1xyXG5cdFx0XHRmaWx0ZXJlZCA9IGZpbHRlcmVkLmZpbHRlcigodGFzaykgPT5cclxuXHRcdFx0XHR0YXNrLm1ldGFkYXRhLnN0YXJ0RGF0ZVxyXG5cdFx0XHRcdFx0PyBtb21lbnQodGFzay5tZXRhZGF0YS5zdGFydERhdGUpLmlzU2FtZShcclxuXHRcdFx0XHRcdFx0XHR0YXJnZXRTdGFydERhdGUsXHJcblx0XHRcdFx0XHRcdFx0XCJkYXlcIlxyXG5cdFx0XHRcdFx0ICApXHJcblx0XHRcdFx0XHQ6IGZhbHNlXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblx0fVxyXG5cdGlmIChmaWx0ZXJSdWxlcy5zY2hlZHVsZWREYXRlKSB7XHJcblx0XHRjb25zdCB0YXJnZXRTY2hlZHVsZWREYXRlID0gcGFyc2VEYXRlRmlsdGVyU3RyaW5nKFxyXG5cdFx0XHRmaWx0ZXJSdWxlcy5zY2hlZHVsZWREYXRlXHJcblx0XHQpO1xyXG5cdFx0aWYgKHRhcmdldFNjaGVkdWxlZERhdGUpIHtcclxuXHRcdFx0ZmlsdGVyZWQgPSBmaWx0ZXJlZC5maWx0ZXIoKHRhc2spID0+XHJcblx0XHRcdFx0dGFzay5tZXRhZGF0YS5zY2hlZHVsZWREYXRlXHJcblx0XHRcdFx0XHQ/IG1vbWVudCh0YXNrLm1ldGFkYXRhLnNjaGVkdWxlZERhdGUpLmlzU2FtZShcclxuXHRcdFx0XHRcdFx0XHR0YXJnZXRTY2hlZHVsZWREYXRlLFxyXG5cdFx0XHRcdFx0XHRcdFwiZGF5XCJcclxuXHRcdFx0XHRcdCAgKVxyXG5cdFx0XHRcdFx0OiBmYWxzZVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gLS0tIEFwcGx5IERlZmF1bHQgVmlldyBMb2dpYyAoaWYgbm8gcnVsZXMgYXBwbGllZCBPUiBhcyBvdmVycmlkZXMpIC0tLVxyXG5cdC8vIFdlIG9ubHkgYXBwbHkgdGhlc2UgaWYgbm8gc3BlY2lmaWMgcnVsZXMgd2VyZSBtYXRjaGVkLCBPUiBpZiB0aGUgdmlldyBJRCBoYXMgaGFyZGNvZGVkIGxvZ2ljLlxyXG5cdC8vIEEgYmV0dGVyIGFwcHJvYWNoIG1pZ2h0IGJlIHRvIHJlcHJlc2VudCAqYWxsKiBkZWZhdWx0IHZpZXdzIHdpdGggZmlsdGVyUnVsZXMgaW4gREVGQVVMVF9TRVRUSU5HUy5cclxuXHQvLyBGb3Igbm93LCBrZWVwIHRoZSBzd2l0Y2ggZm9yIGV4cGxpY2l0IGRlZmF1bHQgYmVoYXZpb3VycyBub3QgY292ZXJlZCBieSBydWxlcy5cclxuXHRpZiAoT2JqZWN0LmtleXMoZmlsdGVyUnVsZXMpLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0Ly8gT25seSBhcHBseSBkZWZhdWx0IGxvZ2ljIGlmIG5vIHJ1bGVzIHdlcmUgZGVmaW5lZCBmb3IgdGhpcyB2aWV3XHJcblx0XHRzd2l0Y2ggKHZpZXdJZCkge1xyXG5cdFx0XHRjYXNlIFwiaW5ib3hcIjoge1xyXG5cdFx0XHRcdGZpbHRlcmVkID0gZmlsdGVyZWQuZmlsdGVyKCh0YXNrKSA9PiAhaGFzUHJvamVjdCh0YXNrKSk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSBcInRvZGF5XCI6IHtcclxuXHRcdFx0XHRjb25zdCB0b2RheSA9IG1vbWVudCgpLnN0YXJ0T2YoXCJkYXlcIik7XHJcblx0XHRcdFx0Y29uc3QgaXNUb2RheSA9IChkPzogc3RyaW5nIHwgbnVtYmVyIHwgRGF0ZSkgPT5cclxuXHRcdFx0XHRcdGQgPyBtb21lbnQoZCkuaXNTYW1lKHRvZGF5LCBcImRheVwiKSA6IGZhbHNlO1xyXG5cdFx0XHRcdGZpbHRlcmVkID0gZmlsdGVyZWQuZmlsdGVyKFxyXG5cdFx0XHRcdFx0KHRhc2spID0+XHJcblx0XHRcdFx0XHRcdGlzVG9kYXkodGFzay5tZXRhZGF0YT8uZHVlRGF0ZSkgfHxcclxuXHRcdFx0XHRcdFx0aXNUb2RheSh0YXNrLm1ldGFkYXRhPy5zY2hlZHVsZWREYXRlKSB8fFxyXG5cdFx0XHRcdFx0XHRpc1RvZGF5KHRhc2subWV0YWRhdGE/LnN0YXJ0RGF0ZSlcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgXCJ1cGNvbWluZ1wiOiB7XHJcblx0XHRcdFx0Y29uc3Qgc3RhcnQgPSBtb21lbnQoKS5zdGFydE9mKFwiZGF5XCIpO1xyXG5cdFx0XHRcdGNvbnN0IGVuZCA9IG1vbWVudCgpLmFkZCg3LCBcImRheXNcIikuZW5kT2YoXCJkYXlcIik7XHJcblx0XHRcdFx0Y29uc3QgaW5OZXh0N0RheXMgPSAoZD86IHN0cmluZyB8IG51bWJlciB8IERhdGUpID0+XHJcblx0XHRcdFx0XHRkXHJcblx0XHRcdFx0XHRcdD8gbW9tZW50KGQpLmlzQWZ0ZXIoc3RhcnQsIFwiZGF5XCIpICYmXHJcblx0XHRcdFx0XHRcdCAgbW9tZW50KGQpLmlzU2FtZU9yQmVmb3JlKGVuZCwgXCJkYXlcIilcclxuXHRcdFx0XHRcdFx0OiBmYWxzZTtcclxuXHRcdFx0XHRmaWx0ZXJlZCA9IGZpbHRlcmVkLmZpbHRlcihcclxuXHRcdFx0XHRcdCh0YXNrKSA9PlxyXG5cdFx0XHRcdFx0XHRpbk5leHQ3RGF5cyh0YXNrLm1ldGFkYXRhPy5kdWVEYXRlKSB8fFxyXG5cdFx0XHRcdFx0XHRpbk5leHQ3RGF5cyh0YXNrLm1ldGFkYXRhPy5zY2hlZHVsZWREYXRlKSB8fFxyXG5cdFx0XHRcdFx0XHRpbk5leHQ3RGF5cyh0YXNrLm1ldGFkYXRhPy5zdGFydERhdGUpXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlIFwiZmxhZ2dlZFwiOiB7XHJcblx0XHRcdFx0ZmlsdGVyZWQgPSBmaWx0ZXJlZC5maWx0ZXIoXHJcblx0XHRcdFx0XHQodGFzaykgPT5cclxuXHRcdFx0XHRcdFx0KHRhc2subWV0YWRhdGEucHJpb3JpdHkgPz8gMCkgPj0gMyB8fFxyXG5cdFx0XHRcdFx0XHQodGFzay5tZXRhZGF0YS50YWdzPy5pbmNsdWRlcyhcImZsYWdnZWRcIikgPz8gZmFsc2UpIHx8XHJcblx0XHRcdFx0XHRcdCh0YXNrLm1ldGFkYXRhLnRhZ3M/LmluY2x1ZGVzKFwiI2ZsYWdnZWRcIikgPz8gZmFsc2UpXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHQvLyBQcm9qZWN0cywgVGFncywgUmV2aWV3IGxvZ2ljIGFyZSBoYW5kbGVkIGJ5IHRoZWlyIHNwZWNpZmljIGNvbXBvbmVudHMgLyBvcHRpb25zXHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyAtLS0gQXBwbHkgYGlzTm90Q29tcGxldGVkYCBGaWx0ZXIgLS0tXHJcblx0Ly8gVGhpcyB1c2VzIHRoZSBoaWRlQ29tcGxldGVkQW5kQWJhbmRvbmVkVGFza3Mgc2V0dGluZyBmcm9tIHRoZSB2aWV3Q29uZmlnXHJcblx0ZmlsdGVyZWQgPSBmaWx0ZXJlZC5maWx0ZXIoKHRhc2spID0+IGlzTm90Q29tcGxldGVkKHBsdWdpbiwgdGFzaywgdmlld0lkKSk7XHJcblxyXG5cdC8vIC0tLSBBcHBseSBgaXNCbGFua2AgRmlsdGVyIC0tLVxyXG5cdC8vIFRoaXMgdXNlcyB0aGUgZmlsdGVyQmxhbmtzIHNldHRpbmcgZnJvbSB0aGUgdmlld0NvbmZpZ1xyXG5cdGZpbHRlcmVkID0gZmlsdGVyZWQuZmlsdGVyKCh0YXNrKSA9PiBpc0JsYW5rKHBsdWdpbiwgdGFzaywgdmlld0lkKSk7XHJcblxyXG5cdC8vIC0tLSBBcHBseSBHZW5lcmFsIFRleHQgU2VhcmNoIChmcm9tIG9wdGlvbnMpIC0tLVxyXG5cdGlmIChvcHRpb25zLnRleHRRdWVyeSkge1xyXG5cdFx0Y29uc3QgdGV4dEZpbHRlciA9IG9wdGlvbnMudGV4dFF1ZXJ5LnRvTG93ZXJDYXNlKCk7XHJcblx0XHRmaWx0ZXJlZCA9IGZpbHRlcmVkLmZpbHRlcihcclxuXHRcdFx0KHRhc2spID0+XHJcblx0XHRcdFx0dGFzay5jb250ZW50LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXModGV4dEZpbHRlcikgfHxcclxuXHRcdFx0XHR0YXNrLm1ldGFkYXRhLnByb2plY3Q/LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXModGV4dEZpbHRlcikgfHxcclxuXHRcdFx0XHR0YXNrLm1ldGFkYXRhLmNvbnRleHQ/LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXModGV4dEZpbHRlcikgfHxcclxuXHRcdFx0XHR0YXNrLm1ldGFkYXRhLnRhZ3M/LnNvbWUoKHRhZykgPT5cclxuXHRcdFx0XHRcdHRhZy50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHRleHRGaWx0ZXIpXHJcblx0XHRcdFx0KVxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdC8vIC0tLSBBcHBseSBgaGFzRHVlRGF0ZWAgRmlsdGVyIC0tLVxyXG5cdGlmIChmaWx0ZXJSdWxlcy5oYXNEdWVEYXRlKSB7XHJcblx0XHRpZiAoZmlsdGVyUnVsZXMuaGFzRHVlRGF0ZSA9PT0gXCJhbnlcIikge1xyXG5cdFx0XHQvLyBEbyBub3RoaW5nXHJcblx0XHR9IGVsc2UgaWYgKGZpbHRlclJ1bGVzLmhhc0R1ZURhdGUgPT09IFwiaGFzRGF0ZVwiKSB7XHJcblx0XHRcdGZpbHRlcmVkID0gZmlsdGVyZWQuZmlsdGVyKCh0YXNrKSA9PiB0YXNrLm1ldGFkYXRhLmR1ZURhdGUpO1xyXG5cdFx0fSBlbHNlIGlmIChmaWx0ZXJSdWxlcy5oYXNEdWVEYXRlID09PSBcIm5vRGF0ZVwiKSB7XHJcblx0XHRcdGZpbHRlcmVkID0gZmlsdGVyZWQuZmlsdGVyKCh0YXNrKSA9PiAhdGFzay5tZXRhZGF0YS5kdWVEYXRlKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIC0tLSBBcHBseSBgaGFzU3RhcnREYXRlYCBGaWx0ZXIgLS0tXHJcblx0aWYgKGZpbHRlclJ1bGVzLmhhc1N0YXJ0RGF0ZSkge1xyXG5cdFx0aWYgKGZpbHRlclJ1bGVzLmhhc1N0YXJ0RGF0ZSA9PT0gXCJhbnlcIikge1xyXG5cdFx0XHQvLyBEbyBub3RoaW5nXHJcblx0XHR9IGVsc2UgaWYgKGZpbHRlclJ1bGVzLmhhc1N0YXJ0RGF0ZSA9PT0gXCJoYXNEYXRlXCIpIHtcclxuXHRcdFx0ZmlsdGVyZWQgPSBmaWx0ZXJlZC5maWx0ZXIoKHRhc2spID0+IHRhc2subWV0YWRhdGEuc3RhcnREYXRlKTtcclxuXHRcdH0gZWxzZSBpZiAoZmlsdGVyUnVsZXMuaGFzU3RhcnREYXRlID09PSBcIm5vRGF0ZVwiKSB7XHJcblx0XHRcdGZpbHRlcmVkID0gZmlsdGVyZWQuZmlsdGVyKCh0YXNrKSA9PiAhdGFzay5tZXRhZGF0YS5zdGFydERhdGUpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gLS0tIEFwcGx5IGBoYXNTY2hlZHVsZWREYXRlYCBGaWx0ZXIgLS0tXHJcblx0aWYgKGZpbHRlclJ1bGVzLmhhc1NjaGVkdWxlZERhdGUpIHtcclxuXHRcdGlmIChmaWx0ZXJSdWxlcy5oYXNTY2hlZHVsZWREYXRlID09PSBcImFueVwiKSB7XHJcblx0XHRcdC8vIERvIG5vdGhpbmdcclxuXHRcdH0gZWxzZSBpZiAoZmlsdGVyUnVsZXMuaGFzU2NoZWR1bGVkRGF0ZSA9PT0gXCJoYXNEYXRlXCIpIHtcclxuXHRcdFx0ZmlsdGVyZWQgPSBmaWx0ZXJlZC5maWx0ZXIoKHRhc2spID0+IHRhc2subWV0YWRhdGEuc2NoZWR1bGVkRGF0ZSk7XHJcblx0XHR9IGVsc2UgaWYgKGZpbHRlclJ1bGVzLmhhc1NjaGVkdWxlZERhdGUgPT09IFwibm9EYXRlXCIpIHtcclxuXHRcdFx0ZmlsdGVyZWQgPSBmaWx0ZXJlZC5maWx0ZXIoKHRhc2spID0+ICF0YXNrLm1ldGFkYXRhLnNjaGVkdWxlZERhdGUpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gLS0tIEFwcGx5IGBoYXNDb21wbGV0ZWREYXRlYCBGaWx0ZXIgLS0tXHJcblx0aWYgKGZpbHRlclJ1bGVzLmhhc0NvbXBsZXRlZERhdGUpIHtcclxuXHRcdGlmIChmaWx0ZXJSdWxlcy5oYXNDb21wbGV0ZWREYXRlID09PSBcImFueVwiKSB7XHJcblx0XHRcdC8vIERvIG5vdGhpbmdcclxuXHRcdH0gZWxzZSBpZiAoZmlsdGVyUnVsZXMuaGFzQ29tcGxldGVkRGF0ZSA9PT0gXCJoYXNEYXRlXCIpIHtcclxuXHRcdFx0ZmlsdGVyZWQgPSBmaWx0ZXJlZC5maWx0ZXIoKHRhc2spID0+IHRhc2subWV0YWRhdGEuY29tcGxldGVkRGF0ZSk7XHJcblx0XHR9IGVsc2UgaWYgKGZpbHRlclJ1bGVzLmhhc0NvbXBsZXRlZERhdGUgPT09IFwibm9EYXRlXCIpIHtcclxuXHRcdFx0ZmlsdGVyZWQgPSBmaWx0ZXJlZC5maWx0ZXIoKHRhc2spID0+ICF0YXNrLm1ldGFkYXRhLmNvbXBsZXRlZERhdGUpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gLS0tIEFwcGx5IGBoYXNSZWN1cnJlbmNlYCBGaWx0ZXIgLS0tXHJcblx0aWYgKGZpbHRlclJ1bGVzLmhhc1JlY3VycmVuY2UpIHtcclxuXHRcdGlmIChmaWx0ZXJSdWxlcy5oYXNSZWN1cnJlbmNlID09PSBcImFueVwiKSB7XHJcblx0XHRcdC8vIERvIG5vdGhpbmdcclxuXHRcdH0gZWxzZSBpZiAoZmlsdGVyUnVsZXMuaGFzUmVjdXJyZW5jZSA9PT0gXCJoYXNQcm9wZXJ0eVwiKSB7XHJcblx0XHRcdGZpbHRlcmVkID0gZmlsdGVyZWQuZmlsdGVyKCh0YXNrKSA9PiB0YXNrLm1ldGFkYXRhLnJlY3VycmVuY2UpO1xyXG5cdFx0fSBlbHNlIGlmIChmaWx0ZXJSdWxlcy5oYXNSZWN1cnJlbmNlID09PSBcIm5vUHJvcGVydHlcIikge1xyXG5cdFx0XHRmaWx0ZXJlZCA9IGZpbHRlcmVkLmZpbHRlcigodGFzaykgPT4gIXRhc2subWV0YWRhdGEucmVjdXJyZW5jZSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyAtLS0gQXBwbHkgYGhhc0NyZWF0ZWREYXRlYCBGaWx0ZXIgLS0tXHJcblx0aWYgKGZpbHRlclJ1bGVzLmhhc0NyZWF0ZWREYXRlKSB7XHJcblx0XHRpZiAoZmlsdGVyUnVsZXMuaGFzQ3JlYXRlZERhdGUgPT09IFwiYW55XCIpIHtcclxuXHRcdFx0Ly8gRG8gbm90aGluZ1xyXG5cdFx0fSBlbHNlIGlmIChmaWx0ZXJSdWxlcy5oYXNDcmVhdGVkRGF0ZSA9PT0gXCJoYXNEYXRlXCIpIHtcclxuXHRcdFx0ZmlsdGVyZWQgPSBmaWx0ZXJlZC5maWx0ZXIoKHRhc2spID0+IHRhc2subWV0YWRhdGEuY3JlYXRlZERhdGUpO1xyXG5cdFx0fSBlbHNlIGlmIChmaWx0ZXJSdWxlcy5oYXNDcmVhdGVkRGF0ZSA9PT0gXCJub0RhdGVcIikge1xyXG5cdFx0XHRmaWx0ZXJlZCA9IGZpbHRlcmVkLmZpbHRlcigodGFzaykgPT4gIXRhc2subWV0YWRhdGEuY3JlYXRlZERhdGUpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIGZpbHRlcmVkO1xyXG59XHJcbiJdfQ==