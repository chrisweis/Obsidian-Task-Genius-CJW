/**
 * DataflowBridge - MCP Bridge implementation using the new Dataflow architecture
 * Provides the same interface as TaskManagerBridge but uses QueryAPI for data access
 */
import { __awaiter } from "tslib";
import { moment } from "obsidian";
export class DataflowBridge {
    constructor(plugin, queryAPI, writeAPI) {
        this.plugin = plugin;
        this.queryAPI = queryAPI;
        this.writeAPI = writeAPI;
    }
    /**
     * Query tasks with flexible filtering
     */
    queryTasks(params) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let tasks = yield this.queryAPI.getAllTasks();
                // Apply filters
                if (params.filter) {
                    const { completed, project, tags, priority, context } = params.filter;
                    if (completed !== undefined) {
                        tasks = tasks.filter(t => t.completed === completed);
                    }
                    if (project) {
                        tasks = tasks.filter(t => {
                            var _a, _b, _c;
                            const p = ((_a = t.metadata) === null || _a === void 0 ? void 0 : _a.project) || ((_c = (_b = t.metadata) === null || _b === void 0 ? void 0 : _b.tgProject) === null || _c === void 0 ? void 0 : _c.name);
                            return p === project;
                        });
                    }
                    if (tags && tags.length > 0) {
                        tasks = tasks.filter(t => {
                            var _a;
                            const taskTags = ((_a = t.metadata) === null || _a === void 0 ? void 0 : _a.tags) || [];
                            return tags.some(tag => taskTags.includes(tag));
                        });
                    }
                    if (priority !== undefined) {
                        tasks = tasks.filter(t => { var _a; return ((_a = t.metadata) === null || _a === void 0 ? void 0 : _a.priority) === priority; });
                    }
                    if (context) {
                        tasks = tasks.filter(t => { var _a; return ((_a = t.metadata) === null || _a === void 0 ? void 0 : _a.context) === context; });
                    }
                }
                // Apply sorting
                if (params.sort) {
                    const { field, order } = params.sort;
                    tasks.sort((a, b) => {
                        let aVal = a;
                        let bVal = b;
                        // Navigate nested fields
                        const fieldParts = field.split(".");
                        for (const part of fieldParts) {
                            aVal = aVal === null || aVal === void 0 ? void 0 : aVal[part];
                            bVal = bVal === null || bVal === void 0 ? void 0 : bVal[part];
                        }
                        // Handle null/undefined
                        if (aVal === null || aVal === undefined)
                            return 1;
                        if (bVal === null || bVal === undefined)
                            return -1;
                        // Compare
                        if (aVal < bVal)
                            return order === "asc" ? -1 : 1;
                        if (aVal > bVal)
                            return order === "asc" ? 1 : -1;
                        return 0;
                    });
                }
                // Apply pagination
                const total = tasks.length;
                const offset = params.offset || 0;
                const limit = params.limit || 100;
                tasks = tasks.slice(offset, offset + limit);
                return { tasks, total };
            }
            catch (error) {
                console.error("DataflowBridge: Error querying tasks:", error);
                return { tasks: [], total: 0 };
            }
        });
    }
    /**
     * Query tasks for a specific project
     */
    queryProjectTasks(project) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const tasks = yield this.queryAPI.getTasksByProject(project);
                return { tasks };
            }
            catch (error) {
                console.error("DataflowBridge: Error querying project tasks:", error);
                return { tasks: [] };
            }
        });
    }
    /**
     * Query tasks for a specific context
     */
    queryContextTasks(context) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const tasks = yield this.queryAPI.getAllTasks();
                const filtered = tasks.filter(t => { var _a; return ((_a = t.metadata) === null || _a === void 0 ? void 0 : _a.context) === context; });
                return { tasks: filtered };
            }
            catch (error) {
                console.error("DataflowBridge: Error querying context tasks:", error);
                return { tasks: [] };
            }
        });
    }
    /**
     * Query tasks by priority
     */
    queryByPriority(priority, limit) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const tasks = yield this.queryAPI.getAllTasks();
                const filtered = tasks
                    .filter(t => { var _a; return ((_a = t.metadata) === null || _a === void 0 ? void 0 : _a.priority) === priority; })
                    .slice(0, limit || 100);
                return { tasks: filtered };
            }
            catch (error) {
                console.error("DataflowBridge: Error querying by priority:", error);
                return { tasks: [] };
            }
        });
    }
    /**
     * Query tasks by date range
     */
    queryByDate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const fromMs = params.from ? moment(params.from).valueOf() : undefined;
                const toMs = params.to ? moment(params.to).valueOf() : undefined;
                const tasks = yield this.queryAPI.getTasksByDateRange({
                    from: fromMs,
                    to: toMs,
                    field: params.dateType || "due"
                });
                return { tasks: tasks.slice(0, params.limit || 100) };
            }
            catch (error) {
                console.error("DataflowBridge: Error querying by date:", error);
                return { tasks: [] };
            }
        });
    }
    /**
     * Search tasks by text query
     */
    searchTasks(params) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const tasks = yield this.queryAPI.getAllTasks();
                const query = params.query.toLowerCase();
                const searchIn = params.searchIn || ["content", "tags", "project", "context"];
                const filtered = tasks.filter(task => {
                    var _a, _b, _c, _d, _e, _f, _g;
                    for (const field of searchIn) {
                        switch (field) {
                            case "content":
                                if ((_a = task.content) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(query))
                                    return true;
                                break;
                            case "tags":
                                const tags = ((_b = task.metadata) === null || _b === void 0 ? void 0 : _b.tags) || [];
                                if (tags.some(tag => tag.toLowerCase().includes(query)))
                                    return true;
                                break;
                            case "project":
                                const p = ((_c = task.metadata) === null || _c === void 0 ? void 0 : _c.project) || ((_e = (_d = task.metadata) === null || _d === void 0 ? void 0 : _d.tgProject) === null || _e === void 0 ? void 0 : _e.name);
                                if (p === null || p === void 0 ? void 0 : p.toLowerCase().includes(query))
                                    return true;
                                break;
                            case "context":
                                if ((_g = (_f = task.metadata) === null || _f === void 0 ? void 0 : _f.context) === null || _g === void 0 ? void 0 : _g.toLowerCase().includes(query))
                                    return true;
                                break;
                        }
                    }
                    return false;
                });
                return { tasks: filtered.slice(0, params.limit || 100) };
            }
            catch (error) {
                console.error("DataflowBridge: Error searching tasks:", error);
                return { tasks: [] };
            }
        });
    }
    /**
     * List all metadata (tags, projects, contexts)
     */
    listAllTagsProjectsContexts() {
        try {
            // Since this is synchronous in TaskManagerBridge, we need to handle it differently
            // For now, return empty arrays - this would need to be refactored to be async
            console.warn("DataflowBridge: listAllTagsProjectsContexts needs async refactoring");
            return { tags: [], projects: [], contexts: [] };
        }
        catch (error) {
            console.error("DataflowBridge: Error listing metadata:", error);
            return { tags: [], projects: [], contexts: [] };
        }
    }
    /**
     * List tasks for a period
     */
    listTasksForPeriod(params) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const baseMoment = moment(params.date);
                let from;
                let to;
                switch (params.period) {
                    case "day":
                        from = baseMoment.clone().startOf("day");
                        to = baseMoment.clone().endOf("day");
                        break;
                    case "month":
                        from = baseMoment.clone().startOf("month");
                        to = baseMoment.clone().endOf("month");
                        break;
                    case "year":
                        from = baseMoment.clone().startOf("year");
                        to = baseMoment.clone().endOf("year");
                        break;
                }
                const tasks = yield this.queryAPI.getTasksByDateRange({
                    from: from.valueOf(),
                    to: to.valueOf(),
                    field: params.dateType || "due"
                });
                return { tasks: tasks.slice(0, params.limit || 100) };
            }
            catch (error) {
                console.error("DataflowBridge: Error listing tasks for period:", error);
                return { tasks: [] };
            }
        });
    }
    /**
     * List tasks in date range
     */
    listTasksInRange(params) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const tasks = yield this.queryAPI.getTasksByDateRange({
                    from: moment(params.from).valueOf(),
                    to: moment(params.to).valueOf(),
                    field: params.dateType || "due"
                });
                return { tasks: tasks.slice(0, params.limit || 100) };
            }
            catch (error) {
                console.error("DataflowBridge: Error listing tasks in range:", error);
                return { tasks: [] };
            }
        });
    }
    // Write operations using WriteAPI
    createTask(args) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.writeAPI.createTask(args);
        });
    }
    updateTask(args) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.writeAPI.updateTask(args);
        });
    }
    deleteTask(args) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.writeAPI.deleteTask(args);
        });
    }
    updateTaskStatus(args) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.writeAPI.updateTaskStatus(args);
        });
    }
    batchUpdateTaskStatus(args) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.writeAPI.batchUpdateTaskStatus(args);
        });
    }
    postponeTasks(args) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.writeAPI.postponeTasks(args);
        });
    }
    batchUpdateText(args) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.writeAPI.batchUpdateText(args);
        });
    }
    batchCreateSubtasks(args) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.writeAPI.batchCreateSubtasks(args);
        });
    }
    createTaskInDailyNote(args) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.writeAPI.createTaskInDailyNote(args);
        });
    }
    addProjectTaskToQuickCapture(args) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.writeAPI.addProjectTaskToQuickCapture(args);
        });
    }
    batchCreateTasks(args) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = {
                success: true,
                created: 0,
                errors: []
            };
            for (let i = 0; i < args.tasks.length; i++) {
                const task = args.tasks[i];
                try {
                    // Use defaultFilePath if task doesn't specify filePath
                    const taskArgs = Object.assign(Object.assign({}, task), { filePath: task.filePath || args.defaultFilePath });
                    const result = yield this.writeAPI.createTask(taskArgs);
                    if (result.success) {
                        results.created++;
                    }
                    else {
                        results.errors.push(`Task ${i + 1}: ${result.error || 'Failed to create'}`);
                    }
                }
                catch (error) {
                    results.success = false;
                    results.errors.push(`Task ${i + 1}: ${error.message}`);
                }
            }
            return results;
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGF0YWZsb3dCcmlkZ2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJEYXRhZmxvd0JyaWRnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0dBR0c7O0FBTUgsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQVNsQyxNQUFNLE9BQU8sY0FBYztJQUkxQixZQUNTLE1BQTZCLEVBQ3JDLFFBQWtCLEVBQ2xCLFFBQWtCO1FBRlYsV0FBTSxHQUFOLE1BQU0sQ0FBdUI7UUFJckMsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7SUFDMUIsQ0FBQztJQUVEOztPQUVHO0lBQ0csVUFBVSxDQUFDLE1BY2hCOztZQUNBLElBQUk7Z0JBQ0gsSUFBSSxLQUFLLEdBQUcsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUU5QyxnQkFBZ0I7Z0JBQ2hCLElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRTtvQkFDbEIsTUFBTSxFQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO29CQUVwRSxJQUFJLFNBQVMsS0FBSyxTQUFTLEVBQUU7d0JBQzVCLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsS0FBSyxTQUFTLENBQUMsQ0FBQztxQkFDckQ7b0JBRUQsSUFBSSxPQUFPLEVBQUU7d0JBQ1osS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUU7OzRCQUN4QixNQUFNLENBQUMsR0FBRyxDQUFBLE1BQUEsQ0FBQyxDQUFDLFFBQVEsMENBQUUsT0FBTyxNQUFJLE1BQUEsTUFBQyxDQUFDLENBQUMsUUFBZ0IsMENBQUUsU0FBUywwQ0FBRSxJQUFJLENBQUEsQ0FB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Q0FBQyxDQUFDO2lCQUN2RDthQUNEO1lBRUQsT0FBTyxPQUFPLENBQUM7UUFDaEIsQ0FBQztLQUFBO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogRGF0YWZsb3dCcmlkZ2UgLSBNQ1AgQnJpZGdlIGltcGxlbWVudGF0aW9uIHVzaW5nIHRoZSBuZXcgRGF0YWZsb3cgYXJjaGl0ZWN0dXJlXHJcbiAqIFByb3ZpZGVzIHRoZSBzYW1lIGludGVyZmFjZSBhcyBUYXNrTWFuYWdlckJyaWRnZSBidXQgdXNlcyBRdWVyeUFQSSBmb3IgZGF0YSBhY2Nlc3NcclxuICovXHJcblxyXG5pbXBvcnQgeyBRdWVyeUFQSSB9IGZyb20gXCJAL2RhdGFmbG93L2FwaS9RdWVyeUFQSVwiO1xyXG5pbXBvcnQgeyBXcml0ZUFQSSB9IGZyb20gXCJAL2RhdGFmbG93L2FwaS9Xcml0ZUFQSVwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiQC90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7IG1vbWVudCB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQge1xyXG5cdFVwZGF0ZVRhc2tBcmdzLFxyXG5cdERlbGV0ZVRhc2tBcmdzLFxyXG5cdENyZWF0ZVRhc2tBcmdzLFxyXG5cdEJhdGNoVXBkYXRlVGV4dEFyZ3MsXHJcblx0QmF0Y2hDcmVhdGVTdWJ0YXNrc0FyZ3MsXHJcbn0gZnJvbSBcIi4uL3R5cGVzL21jcFwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIERhdGFmbG93QnJpZGdlIHtcclxuXHRwcml2YXRlIHF1ZXJ5QVBJOiBRdWVyeUFQSTtcclxuXHRwcml2YXRlIHdyaXRlQVBJOiBXcml0ZUFQSTtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0cXVlcnlBUEk6IFF1ZXJ5QVBJLFxyXG5cdFx0d3JpdGVBUEk6IFdyaXRlQVBJXHJcblx0KSB7XHJcblx0XHR0aGlzLnF1ZXJ5QVBJID0gcXVlcnlBUEk7XHJcblx0XHR0aGlzLndyaXRlQVBJID0gd3JpdGVBUEk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBRdWVyeSB0YXNrcyB3aXRoIGZsZXhpYmxlIGZpbHRlcmluZ1xyXG5cdCAqL1xyXG5cdGFzeW5jIHF1ZXJ5VGFza3MocGFyYW1zOiB7XHJcblx0XHRmaWx0ZXI/OiB7XHJcblx0XHRcdGNvbXBsZXRlZD86IGJvb2xlYW47XHJcblx0XHRcdHByb2plY3Q/OiBzdHJpbmc7XHJcblx0XHRcdHRhZ3M/OiBzdHJpbmdbXTtcclxuXHRcdFx0cHJpb3JpdHk/OiBudW1iZXI7XHJcblx0XHRcdGNvbnRleHQ/OiBzdHJpbmc7XHJcblx0XHR9O1xyXG5cdFx0bGltaXQ/OiBudW1iZXI7XHJcblx0XHRvZmZzZXQ/OiBudW1iZXI7XHJcblx0XHRzb3J0Pzoge1xyXG5cdFx0XHRmaWVsZDogc3RyaW5nO1xyXG5cdFx0XHRvcmRlcjogXCJhc2NcIiB8IFwiZGVzY1wiO1xyXG5cdFx0fTtcclxuXHR9KTogUHJvbWlzZTx7IHRhc2tzOiBUYXNrW107IHRvdGFsOiBudW1iZXIgfT4ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0bGV0IHRhc2tzID0gYXdhaXQgdGhpcy5xdWVyeUFQSS5nZXRBbGxUYXNrcygpO1xyXG5cclxuXHRcdFx0Ly8gQXBwbHkgZmlsdGVyc1xyXG5cdFx0XHRpZiAocGFyYW1zLmZpbHRlcikge1xyXG5cdFx0XHRcdGNvbnN0IHtjb21wbGV0ZWQsIHByb2plY3QsIHRhZ3MsIHByaW9yaXR5LCBjb250ZXh0fSA9IHBhcmFtcy5maWx0ZXI7XHJcblxyXG5cdFx0XHRcdGlmIChjb21wbGV0ZWQgIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdFx0dGFza3MgPSB0YXNrcy5maWx0ZXIodCA9PiB0LmNvbXBsZXRlZCA9PT0gY29tcGxldGVkKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGlmIChwcm9qZWN0KSB7XHJcblx0XHRcdFx0XHR0YXNrcyA9IHRhc2tzLmZpbHRlcih0ID0+IHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgcCA9IHQubWV0YWRhdGE/LnByb2plY3QgfHwgKHQubWV0YWRhdGEgYXMgYW55KT8udGdQcm9qZWN0Py5uYW1lO1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gcCA9PT0gcHJvamVjdDtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0aWYgKHRhZ3MgJiYgdGFncy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0XHR0YXNrcyA9IHRhc2tzLmZpbHRlcih0ID0+IHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgdGFza1RhZ3MgPSB0Lm1ldGFkYXRhPy50YWdzIHx8IFtdO1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gdGFncy5zb21lKHRhZyA9PiB0YXNrVGFncy5pbmNsdWRlcyh0YWcpKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0aWYgKHByaW9yaXR5ICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0XHRcdHRhc2tzID0gdGFza3MuZmlsdGVyKHQgPT4gdC5tZXRhZGF0YT8ucHJpb3JpdHkgPT09IHByaW9yaXR5KTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGlmIChjb250ZXh0KSB7XHJcblx0XHRcdFx0XHR0YXNrcyA9IHRhc2tzLmZpbHRlcih0ID0+IHQubWV0YWRhdGE/LmNvbnRleHQgPT09IGNvbnRleHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQXBwbHkgc29ydGluZ1xyXG5cdFx0XHRpZiAocGFyYW1zLnNvcnQpIHtcclxuXHRcdFx0XHRjb25zdCB7ZmllbGQsIG9yZGVyfSA9IHBhcmFtcy5zb3J0O1xyXG5cdFx0XHRcdHRhc2tzLnNvcnQoKGEsIGIpID0+IHtcclxuXHRcdFx0XHRcdGxldCBhVmFsOiBhbnkgPSBhO1xyXG5cdFx0XHRcdFx0bGV0IGJWYWw6IGFueSA9IGI7XHJcblxyXG5cdFx0XHRcdFx0Ly8gTmF2aWdhdGUgbmVzdGVkIGZpZWxkc1xyXG5cdFx0XHRcdFx0Y29uc3QgZmllbGRQYXJ0cyA9IGZpZWxkLnNwbGl0KFwiLlwiKTtcclxuXHRcdFx0XHRcdGZvciAoY29uc3QgcGFydCBvZiBmaWVsZFBhcnRzKSB7XHJcblx0XHRcdFx0XHRcdGFWYWwgPSBhVmFsPy5bcGFydF07XHJcblx0XHRcdFx0XHRcdGJWYWwgPSBiVmFsPy5bcGFydF07XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gSGFuZGxlIG51bGwvdW5kZWZpbmVkXHJcblx0XHRcdFx0XHRpZiAoYVZhbCA9PT0gbnVsbCB8fCBhVmFsID09PSB1bmRlZmluZWQpIHJldHVybiAxO1xyXG5cdFx0XHRcdFx0aWYgKGJWYWwgPT09IG51bGwgfHwgYlZhbCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gLTE7XHJcblxyXG5cdFx0XHRcdFx0Ly8gQ29tcGFyZVxyXG5cdFx0XHRcdFx0aWYgKGFWYWwgPCBiVmFsKSByZXR1cm4gb3JkZXIgPT09IFwiYXNjXCIgPyAtMSA6IDE7XHJcblx0XHRcdFx0XHRpZiAoYVZhbCA+IGJWYWwpIHJldHVybiBvcmRlciA9PT0gXCJhc2NcIiA/IDEgOiAtMTtcclxuXHRcdFx0XHRcdHJldHVybiAwO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBBcHBseSBwYWdpbmF0aW9uXHJcblx0XHRcdGNvbnN0IHRvdGFsID0gdGFza3MubGVuZ3RoO1xyXG5cdFx0XHRjb25zdCBvZmZzZXQgPSBwYXJhbXMub2Zmc2V0IHx8IDA7XHJcblx0XHRcdGNvbnN0IGxpbWl0ID0gcGFyYW1zLmxpbWl0IHx8IDEwMDtcclxuXHRcdFx0dGFza3MgPSB0YXNrcy5zbGljZShvZmZzZXQsIG9mZnNldCArIGxpbWl0KTtcclxuXHJcblx0XHRcdHJldHVybiB7dGFza3MsIHRvdGFsfTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJEYXRhZmxvd0JyaWRnZTogRXJyb3IgcXVlcnlpbmcgdGFza3M6XCIsIGVycm9yKTtcclxuXHRcdFx0cmV0dXJuIHt0YXNrczogW10sIHRvdGFsOiAwfTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFF1ZXJ5IHRhc2tzIGZvciBhIHNwZWNpZmljIHByb2plY3RcclxuXHQgKi9cclxuXHRhc3luYyBxdWVyeVByb2plY3RUYXNrcyhwcm9qZWN0OiBzdHJpbmcpOiBQcm9taXNlPHsgdGFza3M6IFRhc2tbXSB9PiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCB0YXNrcyA9IGF3YWl0IHRoaXMucXVlcnlBUEkuZ2V0VGFza3NCeVByb2plY3QocHJvamVjdCk7XHJcblx0XHRcdHJldHVybiB7dGFza3N9O1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkRhdGFmbG93QnJpZGdlOiBFcnJvciBxdWVyeWluZyBwcm9qZWN0IHRhc2tzOlwiLCBlcnJvcik7XHJcblx0XHRcdHJldHVybiB7dGFza3M6IFtdfTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFF1ZXJ5IHRhc2tzIGZvciBhIHNwZWNpZmljIGNvbnRleHRcclxuXHQgKi9cclxuXHRhc3luYyBxdWVyeUNvbnRleHRUYXNrcyhjb250ZXh0OiBzdHJpbmcpOiBQcm9taXNlPHsgdGFza3M6IFRhc2tbXSB9PiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCB0YXNrcyA9IGF3YWl0IHRoaXMucXVlcnlBUEkuZ2V0QWxsVGFza3MoKTtcclxuXHRcdFx0Y29uc3QgZmlsdGVyZWQgPSB0YXNrcy5maWx0ZXIodCA9PiB0Lm1ldGFkYXRhPy5jb250ZXh0ID09PSBjb250ZXh0KTtcclxuXHRcdFx0cmV0dXJuIHt0YXNrczogZmlsdGVyZWR9O1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkRhdGFmbG93QnJpZGdlOiBFcnJvciBxdWVyeWluZyBjb250ZXh0IHRhc2tzOlwiLCBlcnJvcik7XHJcblx0XHRcdHJldHVybiB7dGFza3M6IFtdfTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFF1ZXJ5IHRhc2tzIGJ5IHByaW9yaXR5XHJcblx0ICovXHJcblx0YXN5bmMgcXVlcnlCeVByaW9yaXR5KHByaW9yaXR5OiBudW1iZXIsIGxpbWl0PzogbnVtYmVyKTogUHJvbWlzZTx7IHRhc2tzOiBUYXNrW10gfT4ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgdGFza3MgPSBhd2FpdCB0aGlzLnF1ZXJ5QVBJLmdldEFsbFRhc2tzKCk7XHJcblx0XHRcdGNvbnN0IGZpbHRlcmVkID0gdGFza3NcclxuXHRcdFx0XHQuZmlsdGVyKHQgPT4gdC5tZXRhZGF0YT8ucHJpb3JpdHkgPT09IHByaW9yaXR5KVxyXG5cdFx0XHRcdC5zbGljZSgwLCBsaW1pdCB8fCAxMDApO1xyXG5cdFx0XHRyZXR1cm4ge3Rhc2tzOiBmaWx0ZXJlZH07XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRGF0YWZsb3dCcmlkZ2U6IEVycm9yIHF1ZXJ5aW5nIGJ5IHByaW9yaXR5OlwiLCBlcnJvcik7XHJcblx0XHRcdHJldHVybiB7dGFza3M6IFtdfTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFF1ZXJ5IHRhc2tzIGJ5IGRhdGUgcmFuZ2VcclxuXHQgKi9cclxuXHRhc3luYyBxdWVyeUJ5RGF0ZShwYXJhbXM6IHtcclxuXHRcdGRhdGVUeXBlOiBcImR1ZVwiIHwgXCJzdGFydFwiIHwgXCJzY2hlZHVsZWRcIjtcclxuXHRcdGZyb20/OiBzdHJpbmc7XHJcblx0XHR0bz86IHN0cmluZztcclxuXHRcdGxpbWl0PzogbnVtYmVyO1xyXG5cdH0pOiBQcm9taXNlPHsgdGFza3M6IFRhc2tbXSB9PiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBmcm9tTXMgPSBwYXJhbXMuZnJvbSA/IG1vbWVudChwYXJhbXMuZnJvbSkudmFsdWVPZigpIDogdW5kZWZpbmVkO1xyXG5cdFx0XHRjb25zdCB0b01zID0gcGFyYW1zLnRvID8gbW9tZW50KHBhcmFtcy50bykudmFsdWVPZigpIDogdW5kZWZpbmVkO1xyXG5cclxuXHRcdFx0Y29uc3QgdGFza3MgPSBhd2FpdCB0aGlzLnF1ZXJ5QVBJLmdldFRhc2tzQnlEYXRlUmFuZ2Uoe1xyXG5cdFx0XHRcdGZyb206IGZyb21NcyxcclxuXHRcdFx0XHR0bzogdG9NcyxcclxuXHRcdFx0XHRmaWVsZDogcGFyYW1zLmRhdGVUeXBlIHx8IFwiZHVlXCJcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRyZXR1cm4ge3Rhc2tzOiB0YXNrcy5zbGljZSgwLCBwYXJhbXMubGltaXQgfHwgMTAwKX07XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRGF0YWZsb3dCcmlkZ2U6IEVycm9yIHF1ZXJ5aW5nIGJ5IGRhdGU6XCIsIGVycm9yKTtcclxuXHRcdFx0cmV0dXJuIHt0YXNrczogW119O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2VhcmNoIHRhc2tzIGJ5IHRleHQgcXVlcnlcclxuXHQgKi9cclxuXHRhc3luYyBzZWFyY2hUYXNrcyhwYXJhbXM6IHtcclxuXHRcdHF1ZXJ5OiBzdHJpbmc7XHJcblx0XHRzZWFyY2hJbj86IHN0cmluZ1tdO1xyXG5cdFx0bGltaXQ/OiBudW1iZXI7XHJcblx0fSk6IFByb21pc2U8eyB0YXNrczogVGFza1tdIH0+IHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IHRhc2tzID0gYXdhaXQgdGhpcy5xdWVyeUFQSS5nZXRBbGxUYXNrcygpO1xyXG5cdFx0XHRjb25zdCBxdWVyeSA9IHBhcmFtcy5xdWVyeS50b0xvd2VyQ2FzZSgpO1xyXG5cdFx0XHRjb25zdCBzZWFyY2hJbiA9IHBhcmFtcy5zZWFyY2hJbiB8fCBbXCJjb250ZW50XCIsIFwidGFnc1wiLCBcInByb2plY3RcIiwgXCJjb250ZXh0XCJdO1xyXG5cclxuXHRcdFx0Y29uc3QgZmlsdGVyZWQgPSB0YXNrcy5maWx0ZXIodGFzayA9PiB7XHJcblx0XHRcdFx0Zm9yIChjb25zdCBmaWVsZCBvZiBzZWFyY2hJbikge1xyXG5cdFx0XHRcdFx0c3dpdGNoIChmaWVsZCkge1xyXG5cdFx0XHRcdFx0XHRjYXNlIFwiY29udGVudFwiOlxyXG5cdFx0XHRcdFx0XHRcdGlmICh0YXNrLmNvbnRlbnQ/LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMocXVlcnkpKSByZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFx0Y2FzZSBcInRhZ3NcIjpcclxuXHRcdFx0XHRcdFx0XHRjb25zdCB0YWdzID0gdGFzay5tZXRhZGF0YT8udGFncyB8fCBbXTtcclxuXHRcdFx0XHRcdFx0XHRpZiAodGFncy5zb21lKHRhZyA9PiB0YWcudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhxdWVyeSkpKSByZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFx0Y2FzZSBcInByb2plY3RcIjpcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBwID0gdGFzay5tZXRhZGF0YT8ucHJvamVjdCB8fCAodGFzay5tZXRhZGF0YSBhcyBhbnkpPy50Z1Byb2plY3Q/Lm5hbWU7XHJcblx0XHRcdFx0XHRcdFx0aWYgKHA/LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMocXVlcnkpKSByZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFx0Y2FzZSBcImNvbnRleHRcIjpcclxuXHRcdFx0XHRcdFx0XHRpZiAodGFzay5tZXRhZGF0YT8uY29udGV4dD8udG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhxdWVyeSkpIHJldHVybiB0cnVlO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0cmV0dXJuIHt0YXNrczogZmlsdGVyZWQuc2xpY2UoMCwgcGFyYW1zLmxpbWl0IHx8IDEwMCl9O1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkRhdGFmbG93QnJpZGdlOiBFcnJvciBzZWFyY2hpbmcgdGFza3M6XCIsIGVycm9yKTtcclxuXHRcdFx0cmV0dXJuIHt0YXNrczogW119O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTGlzdCBhbGwgbWV0YWRhdGEgKHRhZ3MsIHByb2plY3RzLCBjb250ZXh0cylcclxuXHQgKi9cclxuXHRsaXN0QWxsVGFnc1Byb2plY3RzQ29udGV4dHMoKToge1xyXG5cdFx0dGFnczogc3RyaW5nW107XHJcblx0XHRwcm9qZWN0czogc3RyaW5nW107XHJcblx0XHRjb250ZXh0czogc3RyaW5nW107XHJcblx0fSB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBTaW5jZSB0aGlzIGlzIHN5bmNocm9ub3VzIGluIFRhc2tNYW5hZ2VyQnJpZGdlLCB3ZSBuZWVkIHRvIGhhbmRsZSBpdCBkaWZmZXJlbnRseVxyXG5cdFx0XHQvLyBGb3Igbm93LCByZXR1cm4gZW1wdHkgYXJyYXlzIC0gdGhpcyB3b3VsZCBuZWVkIHRvIGJlIHJlZmFjdG9yZWQgdG8gYmUgYXN5bmNcclxuXHRcdFx0Y29uc29sZS53YXJuKFwiRGF0YWZsb3dCcmlkZ2U6IGxpc3RBbGxUYWdzUHJvamVjdHNDb250ZXh0cyBuZWVkcyBhc3luYyByZWZhY3RvcmluZ1wiKTtcclxuXHRcdFx0cmV0dXJuIHt0YWdzOiBbXSwgcHJvamVjdHM6IFtdLCBjb250ZXh0czogW119O1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkRhdGFmbG93QnJpZGdlOiBFcnJvciBsaXN0aW5nIG1ldGFkYXRhOlwiLCBlcnJvcik7XHJcblx0XHRcdHJldHVybiB7dGFnczogW10sIHByb2plY3RzOiBbXSwgY29udGV4dHM6IFtdfTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIExpc3QgdGFza3MgZm9yIGEgcGVyaW9kXHJcblx0ICovXHJcblx0YXN5bmMgbGlzdFRhc2tzRm9yUGVyaW9kKHBhcmFtczoge1xyXG5cdFx0cGVyaW9kOiBcImRheVwiIHwgXCJtb250aFwiIHwgXCJ5ZWFyXCI7XHJcblx0XHRkYXRlOiBzdHJpbmc7XHJcblx0XHRkYXRlVHlwZT86IFwiZHVlXCIgfCBcInN0YXJ0XCIgfCBcInNjaGVkdWxlZFwiO1xyXG5cdFx0bGltaXQ/OiBudW1iZXI7XHJcblx0fSk6IFByb21pc2U8eyB0YXNrczogVGFza1tdIH0+IHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IGJhc2VNb21lbnQgPSBtb21lbnQocGFyYW1zLmRhdGUpO1xyXG5cdFx0XHRsZXQgZnJvbTogbW9tZW50Lk1vbWVudDtcclxuXHRcdFx0bGV0IHRvOiBtb21lbnQuTW9tZW50O1xyXG5cclxuXHRcdFx0c3dpdGNoIChwYXJhbXMucGVyaW9kKSB7XHJcblx0XHRcdFx0Y2FzZSBcImRheVwiOlxyXG5cdFx0XHRcdFx0ZnJvbSA9IGJhc2VNb21lbnQuY2xvbmUoKS5zdGFydE9mKFwiZGF5XCIpO1xyXG5cdFx0XHRcdFx0dG8gPSBiYXNlTW9tZW50LmNsb25lKCkuZW5kT2YoXCJkYXlcIik7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIFwibW9udGhcIjpcclxuXHRcdFx0XHRcdGZyb20gPSBiYXNlTW9tZW50LmNsb25lKCkuc3RhcnRPZihcIm1vbnRoXCIpO1xyXG5cdFx0XHRcdFx0dG8gPSBiYXNlTW9tZW50LmNsb25lKCkuZW5kT2YoXCJtb250aFwiKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJ5ZWFyXCI6XHJcblx0XHRcdFx0XHRmcm9tID0gYmFzZU1vbWVudC5jbG9uZSgpLnN0YXJ0T2YoXCJ5ZWFyXCIpO1xyXG5cdFx0XHRcdFx0dG8gPSBiYXNlTW9tZW50LmNsb25lKCkuZW5kT2YoXCJ5ZWFyXCIpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IHRhc2tzID0gYXdhaXQgdGhpcy5xdWVyeUFQSS5nZXRUYXNrc0J5RGF0ZVJhbmdlKHtcclxuXHRcdFx0XHRmcm9tOiBmcm9tLnZhbHVlT2YoKSxcclxuXHRcdFx0XHR0bzogdG8udmFsdWVPZigpLFxyXG5cdFx0XHRcdGZpZWxkOiBwYXJhbXMuZGF0ZVR5cGUgfHwgXCJkdWVcIlxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHJldHVybiB7dGFza3M6IHRhc2tzLnNsaWNlKDAsIHBhcmFtcy5saW1pdCB8fCAxMDApfTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJEYXRhZmxvd0JyaWRnZTogRXJyb3IgbGlzdGluZyB0YXNrcyBmb3IgcGVyaW9kOlwiLCBlcnJvcik7XHJcblx0XHRcdHJldHVybiB7dGFza3M6IFtdfTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIExpc3QgdGFza3MgaW4gZGF0ZSByYW5nZVxyXG5cdCAqL1xyXG5cdGFzeW5jIGxpc3RUYXNrc0luUmFuZ2UocGFyYW1zOiB7XHJcblx0XHRmcm9tOiBzdHJpbmc7XHJcblx0XHR0bzogc3RyaW5nO1xyXG5cdFx0ZGF0ZVR5cGU/OiBcImR1ZVwiIHwgXCJzdGFydFwiIHwgXCJzY2hlZHVsZWRcIjtcclxuXHRcdGxpbWl0PzogbnVtYmVyO1xyXG5cdH0pOiBQcm9taXNlPHsgdGFza3M6IFRhc2tbXSB9PiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCB0YXNrcyA9IGF3YWl0IHRoaXMucXVlcnlBUEkuZ2V0VGFza3NCeURhdGVSYW5nZSh7XHJcblx0XHRcdFx0ZnJvbTogbW9tZW50KHBhcmFtcy5mcm9tKS52YWx1ZU9mKCksXHJcblx0XHRcdFx0dG86IG1vbWVudChwYXJhbXMudG8pLnZhbHVlT2YoKSxcclxuXHRcdFx0XHRmaWVsZDogcGFyYW1zLmRhdGVUeXBlIHx8IFwiZHVlXCJcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRyZXR1cm4ge3Rhc2tzOiB0YXNrcy5zbGljZSgwLCBwYXJhbXMubGltaXQgfHwgMTAwKX07XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRGF0YWZsb3dCcmlkZ2U6IEVycm9yIGxpc3RpbmcgdGFza3MgaW4gcmFuZ2U6XCIsIGVycm9yKTtcclxuXHRcdFx0cmV0dXJuIHt0YXNrczogW119O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gV3JpdGUgb3BlcmF0aW9ucyB1c2luZyBXcml0ZUFQSVxyXG5cclxuXHRhc3luYyBjcmVhdGVUYXNrKGFyZ3M6IENyZWF0ZVRhc2tBcmdzKTogUHJvbWlzZTxhbnk+IHtcclxuXHRcdHJldHVybiB0aGlzLndyaXRlQVBJLmNyZWF0ZVRhc2soYXJncyk7XHJcblx0fVxyXG5cclxuXHRhc3luYyB1cGRhdGVUYXNrKGFyZ3M6IFVwZGF0ZVRhc2tBcmdzKTogUHJvbWlzZTxhbnk+IHtcclxuXHRcdHJldHVybiB0aGlzLndyaXRlQVBJLnVwZGF0ZVRhc2soYXJncyk7XHJcblx0fVxyXG5cclxuXHRhc3luYyBkZWxldGVUYXNrKGFyZ3M6IERlbGV0ZVRhc2tBcmdzKTogUHJvbWlzZTxhbnk+IHtcclxuXHRcdHJldHVybiB0aGlzLndyaXRlQVBJLmRlbGV0ZVRhc2soYXJncyk7XHJcblx0fVxyXG5cclxuXHRhc3luYyB1cGRhdGVUYXNrU3RhdHVzKGFyZ3M6IHsgdGFza0lkOiBzdHJpbmc7IHN0YXR1cz86IHN0cmluZzsgY29tcGxldGVkPzogYm9vbGVhbiB9KTogUHJvbWlzZTxhbnk+IHtcclxuXHRcdHJldHVybiB0aGlzLndyaXRlQVBJLnVwZGF0ZVRhc2tTdGF0dXMoYXJncyk7XHJcblx0fVxyXG5cclxuXHRhc3luYyBiYXRjaFVwZGF0ZVRhc2tTdGF0dXMoYXJnczogeyB0YXNrSWRzOiBzdHJpbmdbXTsgc3RhdHVzPzogc3RyaW5nOyBjb21wbGV0ZWQ/OiBib29sZWFuIH0pOiBQcm9taXNlPGFueT4ge1xyXG5cdFx0cmV0dXJuIHRoaXMud3JpdGVBUEkuYmF0Y2hVcGRhdGVUYXNrU3RhdHVzKGFyZ3MpO1xyXG5cdH1cclxuXHJcblx0YXN5bmMgcG9zdHBvbmVUYXNrcyhhcmdzOiB7IHRhc2tJZHM6IHN0cmluZ1tdOyBuZXdEYXRlOiBzdHJpbmcgfSk6IFByb21pc2U8YW55PiB7XHJcblx0XHRyZXR1cm4gdGhpcy53cml0ZUFQSS5wb3N0cG9uZVRhc2tzKGFyZ3MpO1xyXG5cdH1cclxuXHJcblx0YXN5bmMgYmF0Y2hVcGRhdGVUZXh0KGFyZ3M6IEJhdGNoVXBkYXRlVGV4dEFyZ3MpOiBQcm9taXNlPGFueT4ge1xyXG5cdFx0cmV0dXJuIHRoaXMud3JpdGVBUEkuYmF0Y2hVcGRhdGVUZXh0KGFyZ3MpO1xyXG5cdH1cclxuXHJcblx0YXN5bmMgYmF0Y2hDcmVhdGVTdWJ0YXNrcyhhcmdzOiBCYXRjaENyZWF0ZVN1YnRhc2tzQXJncyk6IFByb21pc2U8YW55PiB7XHJcblx0XHRyZXR1cm4gdGhpcy53cml0ZUFQSS5iYXRjaENyZWF0ZVN1YnRhc2tzKGFyZ3MpO1xyXG5cdH1cclxuXHJcblx0YXN5bmMgY3JlYXRlVGFza0luRGFpbHlOb3RlKGFyZ3M6IENyZWF0ZVRhc2tBcmdzICYgeyBoZWFkaW5nPzogc3RyaW5nIH0pOiBQcm9taXNlPGFueT4ge1xyXG5cdFx0cmV0dXJuIHRoaXMud3JpdGVBUEkuY3JlYXRlVGFza0luRGFpbHlOb3RlKGFyZ3MpO1xyXG5cdH1cclxuXHJcblxyXG5cdGFzeW5jIGFkZFByb2plY3RUYXNrVG9RdWlja0NhcHR1cmUoYXJnczoge1xyXG5cdFx0Y29udGVudDogc3RyaW5nO1xyXG5cdFx0cHJvamVjdDogc3RyaW5nO1xyXG5cdFx0dGFncz86IHN0cmluZ1tdO1xyXG5cdFx0cHJpb3JpdHk/OiBudW1iZXI7XHJcblx0XHRkdWVEYXRlPzogc3RyaW5nO1xyXG5cdFx0c3RhcnREYXRlPzogc3RyaW5nO1xyXG5cdFx0Y29udGV4dD86IHN0cmluZztcclxuXHRcdGhlYWRpbmc/OiBzdHJpbmc7XHJcblx0XHRjb21wbGV0ZWQ/OiBib29sZWFuO1xyXG5cdFx0Y29tcGxldGVkRGF0ZT86IHN0cmluZztcclxuXHR9KTogUHJvbWlzZTxhbnk+IHtcclxuXHRcdHJldHVybiB0aGlzLndyaXRlQVBJLmFkZFByb2plY3RUYXNrVG9RdWlja0NhcHR1cmUoYXJncyk7XHJcblx0fVxyXG5cclxuXHRhc3luYyBiYXRjaENyZWF0ZVRhc2tzKGFyZ3M6IHsgdGFza3M6IENyZWF0ZVRhc2tBcmdzW107IGRlZmF1bHRGaWxlUGF0aD86IHN0cmluZyB9KTogUHJvbWlzZTx7XHJcblx0XHRzdWNjZXNzOiBib29sZWFuO1xyXG5cdFx0Y3JlYXRlZDogbnVtYmVyO1xyXG5cdFx0ZXJyb3JzOiBzdHJpbmdbXVxyXG5cdH0+IHtcclxuXHRcdGNvbnN0IHJlc3VsdHMgPSB7XHJcblx0XHRcdHN1Y2Nlc3M6IHRydWUsXHJcblx0XHRcdGNyZWF0ZWQ6IDAsXHJcblx0XHRcdGVycm9yczogW10gYXMgc3RyaW5nW11cclxuXHRcdH07XHJcblxyXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBhcmdzLnRhc2tzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGNvbnN0IHRhc2sgPSBhcmdzLnRhc2tzW2ldO1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdC8vIFVzZSBkZWZhdWx0RmlsZVBhdGggaWYgdGFzayBkb2Vzbid0IHNwZWNpZnkgZmlsZVBhdGhcclxuXHRcdFx0XHRjb25zdCB0YXNrQXJnczogQ3JlYXRlVGFza0FyZ3MgPSB7XHJcblx0XHRcdFx0XHQuLi50YXNrLFxyXG5cdFx0XHRcdFx0ZmlsZVBhdGg6IHRhc2suZmlsZVBhdGggfHwgYXJncy5kZWZhdWx0RmlsZVBhdGhcclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLndyaXRlQVBJLmNyZWF0ZVRhc2sodGFza0FyZ3MpO1xyXG5cdFx0XHRcdGlmIChyZXN1bHQuc3VjY2Vzcykge1xyXG5cdFx0XHRcdFx0cmVzdWx0cy5jcmVhdGVkKys7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHJlc3VsdHMuZXJyb3JzLnB1c2goYFRhc2sgJHtpICsgMX06ICR7cmVzdWx0LmVycm9yIHx8ICdGYWlsZWQgdG8gY3JlYXRlJ31gKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuXHRcdFx0XHRyZXN1bHRzLnN1Y2Nlc3MgPSBmYWxzZTtcclxuXHRcdFx0XHRyZXN1bHRzLmVycm9ycy5wdXNoKGBUYXNrICR7aSArIDF9OiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gcmVzdWx0cztcclxuXHR9XHJcbn1cclxuIl19