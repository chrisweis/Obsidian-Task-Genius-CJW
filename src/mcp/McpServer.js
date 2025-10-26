/**
 * Simplified MCP Server implementation for Obsidian
 * Avoids external dependencies that can't be bundled
 */
import { __awaiter } from "tslib";
import { AuthMiddleware } from "./auth/AuthMiddleware";
import { DataflowBridge } from "./bridge/DataflowBridge";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const http = require("http");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const url = require("url");
export class McpServer {
    constructor(plugin, config) {
        this.plugin = plugin;
        this.config = config;
        this.isRunning = false;
        this.requestCount = 0;
        this.sessions = new Map();
        this.authMiddleware = new AuthMiddleware(config.authToken);
        // Always use DataflowBridge now
        const QueryAPI = require("../dataflow/api/QueryAPI").QueryAPI;
        const WriteAPI = require("../dataflow/api/WriteAPI").WriteAPI;
        const queryAPI = new QueryAPI(plugin.app, plugin.app.vault, plugin.app.metadataCache);
        // Create WriteAPI with getTaskById function from repository
        const getTaskById = (id) => queryAPI.getRepository().getTaskById(id);
        const writeAPI = new WriteAPI(plugin.app, plugin.app.vault, plugin.app.metadataCache, plugin, getTaskById);
        this.taskBridge = new DataflowBridge(plugin, queryAPI, writeAPI);
        console.log("MCP Server: Using DataflowBridge");
    }
    /**
     * Generate a simple session ID
     */
    generateSessionId() {
        return `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    }
    /**
     * Compute a vault-aware server name, e.g., "my-vault-tasks"
     */
    getServerName() {
        var _a, _b;
        try {
            const raw = ((_b = (_a = this.plugin.app.vault).getName) === null || _b === void 0 ? void 0 : _b.call(_a)) || "vault";
            const slug = String(raw)
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "");
            return `${slug}-tasks`;
        }
        catch (e) {
            return "obsidian-tasks";
        }
    }
    /**
     * Get prompt definitions
     */
    getPrompts() {
        return [
            {
                name: "daily_review",
                title: "Daily Task Review",
                description: "Review today's tasks and plan for tomorrow",
                arguments: [
                    {
                        name: "includeCompleted",
                        description: "Include completed tasks in the review",
                        required: false,
                    },
                ],
            },
            {
                name: "weekly_planning",
                title: "Weekly Planning",
                description: "Plan tasks for the upcoming week",
                arguments: [
                    {
                        name: "weekOffset",
                        description: "Week offset from current week (0 for this week, 1 for next week)",
                        required: false,
                    },
                ],
            },
            {
                name: "project_overview",
                title: "Project Overview",
                description: "Get an overview of all projects and their task counts",
                arguments: [],
            },
            {
                name: "overdue_tasks",
                title: "Overdue Tasks Summary",
                description: "List all overdue tasks organized by priority",
                arguments: [
                    {
                        name: "daysOverdue",
                        description: "Minimum days overdue to include",
                        required: false,
                    },
                ],
            },
            {
                name: "task_search",
                title: "Advanced Task Search",
                description: "Search for tasks with specific criteria",
                arguments: [
                    {
                        name: "query",
                        description: "Search query text",
                        required: true,
                    },
                    {
                        name: "project",
                        description: "Filter by project name",
                        required: false,
                    },
                    {
                        name: "priority",
                        description: "Filter by priority (1-5)",
                        required: false,
                    },
                ],
            },
        ];
    }
    /**
     * Get resource definitions
     */
    getResources() {
        // Return empty array for now - could be expanded to provide
        // vault statistics, task metrics, etc.
        return [];
    }
    /**
     * Get tool definitions
     */
    getTools() {
        return [
            {
                name: "update_task_status",
                title: "Update Task Status",
                description: "Update a single task's completion or status field.",
                inputSchema: {
                    type: "object",
                    properties: {
                        taskId: { type: "string" },
                        status: { type: "string", description: "Optional status mark to set instead of completed" },
                        completed: { type: "boolean", description: "Set completed true/false" },
                    },
                    required: ["taskId"],
                },
            },
            {
                name: "batch_update_task_status",
                title: "Batch Update Task Status",
                description: "Batch update completion/status for multiple tasks.",
                inputSchema: {
                    type: "object",
                    properties: {
                        taskIds: { type: "array", items: { type: "string" } },
                        status: { type: "string" },
                        completed: { type: "boolean" },
                    },
                    required: ["taskIds"],
                },
            },
            {
                name: "postpone_tasks",
                title: "Postpone Tasks",
                description: "Batch postpone tasks to a new due date (YYYY-MM-DD)",
                inputSchema: {
                    type: "object",
                    properties: {
                        taskIds: { type: "array", items: { type: "string" } },
                        newDate: { type: "string" },
                    },
                    required: ["taskIds", "newDate"],
                },
            },
            {
                name: "list_all_metadata",
                title: "List Tags/Projects/Contexts",
                description: "List all used tags, project names, and contexts.",
                inputSchema: { type: "object", properties: {} },
            },
            {
                name: "list_tasks_for_period",
                title: "List Tasks For Period",
                description: "List tasks for a day/month/year based on dateType (default: due).",
                inputSchema: {
                    type: "object",
                    properties: {
                        period: { type: "string", enum: ["day", "month", "year"] },
                        date: { type: "string", description: "Base date YYYY-MM-DD" },
                        dateType: { type: "string", enum: ["due", "start", "scheduled", "completed"], description: "Which date field to use" },
                        limit: { type: "number" },
                    },
                    required: ["period", "date"],
                },
            },
            {
                name: "list_tasks_in_range",
                title: "List Tasks In Range",
                description: "List tasks between from/to dates (default dateType: due).",
                inputSchema: {
                    type: "object",
                    properties: {
                        from: { type: "string" },
                        to: { type: "string" },
                        dateType: { type: "string", enum: ["due", "start", "scheduled", "completed"] },
                        limit: { type: "number" },
                    },
                    required: ["from", "to"],
                },
            },
            {
                name: "add_project_quick_capture",
                title: "Add Project Task to Quick Capture",
                description: "Add a project-tagged task to the Quick Capture target (fixed or daily note).",
                inputSchema: {
                    type: "object",
                    properties: {
                        content: { type: "string", description: "Task content text" },
                        project: { type: "string", description: "Project name to tag as +project" },
                        tags: { type: "array", items: { type: "string" } },
                        priority: { type: "number", minimum: 1, maximum: 5 },
                        dueDate: { type: "string" },
                        startDate: { type: "string" },
                        context: { type: "string" },
                        heading: { type: "string" },
                    },
                    required: ["content", "project"],
                },
            },
            {
                name: "create_task_in_daily_note",
                title: "Create Task in Daily Note",
                description: "Create a task in today's daily note. Creates the note if missing. Supports creating already-completed tasks for recording purposes.",
                inputSchema: {
                    type: "object",
                    properties: {
                        content: { type: "string", description: "Task content text" },
                        dueDate: { type: "string", description: "Due date YYYY-MM-DD" },
                        startDate: { type: "string", description: "Start date YYYY-MM-DD" },
                        priority: { type: "number", minimum: 1, maximum: 5 },
                        tags: { type: "array", items: { type: "string" } },
                        project: { type: "string" },
                        context: { type: "string" },
                        heading: { type: "string", description: "Optional heading to place task under" },
                        parent: { type: "string", description: "Optional parent task ID to create subtask under" },
                        completed: { type: "boolean", description: "Whether the task is already completed (for recording purposes)" },
                        completedDate: { type: "string", description: "Completion date YYYY-MM-DD (only used when completed is true)" },
                    },
                    required: ["content"],
                },
            },
            {
                name: "query_tasks",
                title: "Query Tasks",
                description: "Query tasks with filters and sorting options",
                inputSchema: {
                    type: "object",
                    properties: {
                        filter: {
                            type: "object",
                            properties: {
                                completed: { type: "boolean" },
                                project: { type: "string" },
                                context: { type: "string" },
                                priority: { type: "number", minimum: 1, maximum: 5 },
                                tags: { type: "array", items: { type: "string" } },
                            },
                        },
                        limit: { type: "number" },
                        offset: { type: "number" },
                        sort: {
                            type: "object",
                            properties: {
                                field: { type: "string" },
                                order: { type: "string", enum: ["asc", "desc"] },
                            },
                        },
                    },
                },
            },
            {
                name: "update_task",
                title: "Update Task",
                description: "Update a task by ID with new properties",
                inputSchema: {
                    type: "object",
                    properties: {
                        taskId: { type: "string" },
                        updates: { type: "object" },
                    },
                    required: ["taskId", "updates"],
                },
            },
            {
                name: "delete_task",
                title: "Delete Task",
                description: "Delete a task by ID",
                inputSchema: {
                    type: "object",
                    properties: {
                        taskId: { type: "string" },
                    },
                    required: ["taskId"],
                },
            },
            {
                name: "create_task",
                title: "Create Task",
                description: "Create a new task with specified properties. If the target file does not exist, it will be created automatically. Supports creating already-completed tasks for recording purposes.",
                inputSchema: {
                    type: "object",
                    properties: {
                        content: { type: "string", description: "Task content text" },
                        filePath: { type: "string", description: "Target markdown file path (e.g., Daily/2025-08-15.md). If omitted, uses active file." },
                        project: { type: "string", description: "Project name to append as +project" },
                        context: { type: "string", description: "Context name to append as @context" },
                        priority: { type: "number", minimum: 1, maximum: 5, description: "1-5 priority; adds ! markers" },
                        dueDate: { type: "string", description: "Due date YYYY-MM-DD (adds 📅 marker)" },
                        startDate: { type: "string", description: "Start date YYYY-MM-DD (adds 🛫 marker)" },
                        tags: { type: "array", items: { type: "string" }, description: "Array of tags (without #)" },
                        parent: { type: "string", description: "Parent task ID to create a subtask under" },
                        completed: { type: "boolean", description: "Whether the task is already completed (for recording purposes)" },
                        completedDate: { type: "string", description: "Completion date YYYY-MM-DD (only used when completed is true)" },
                    },
                    required: ["content"],
                },
            },
            {
                name: "query_project_tasks",
                title: "Query Project Tasks",
                description: "Get all tasks for a specific project",
                inputSchema: {
                    type: "object",
                    properties: {
                        project: { type: "string" },
                    },
                    required: ["project"],
                },
            },
            {
                name: "query_context_tasks",
                title: "Query Context Tasks",
                description: "Get all tasks for a specific context",
                inputSchema: {
                    type: "object",
                    properties: {
                        context: { type: "string" },
                    },
                    required: ["context"],
                },
            },
            {
                name: "query_by_priority",
                title: "Query by Priority",
                description: "Get tasks with a specific priority level",
                inputSchema: {
                    type: "object",
                    properties: {
                        priority: { type: "number", minimum: 1, maximum: 5 },
                        limit: { type: "number" },
                    },
                    required: ["priority"],
                },
            },
            {
                name: "query_by_due_date",
                title: "Query by Due Date",
                description: "Get tasks within a due date range",
                inputSchema: {
                    type: "object",
                    properties: {
                        from: { type: "string" },
                        to: { type: "string" },
                        limit: { type: "number" },
                    },
                },
            },
            {
                name: "query_by_start_date",
                title: "Query by Start Date",
                description: "Get tasks within a start date range",
                inputSchema: {
                    type: "object",
                    properties: {
                        from: { type: "string" },
                        to: { type: "string" },
                        limit: { type: "number" },
                    },
                },
            },
            {
                name: "batch_update_text",
                title: "Batch Update Text",
                description: "Find and replace text in multiple tasks",
                inputSchema: {
                    type: "object",
                    properties: {
                        taskIds: { type: "array", items: { type: "string" } },
                        findText: { type: "string" },
                        replaceText: { type: "string" },
                    },
                    required: ["taskIds", "findText", "replaceText"],
                },
            },
            {
                name: "batch_create_subtasks",
                title: "Batch Create Subtasks",
                description: "Create multiple subtasks under a parent task",
                inputSchema: {
                    type: "object",
                    properties: {
                        parentTaskId: { type: "string" },
                        subtasks: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    content: { type: "string" },
                                    priority: { type: "number", minimum: 1, maximum: 5 },
                                    dueDate: { type: "string" },
                                },
                                required: ["content"],
                            },
                        },
                    },
                    required: ["parentTaskId", "subtasks"],
                },
            },
            {
                name: "search_tasks",
                title: "Search Tasks",
                description: "Search tasks by text query across multiple fields",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string" },
                        limit: { type: "number" },
                        searchIn: {
                            type: "array",
                            items: {
                                type: "string",
                                enum: ["content", "tags", "project", "context"],
                            },
                        },
                    },
                    required: ["query"],
                },
            },
            {
                name: "batch_create_tasks",
                title: "Batch Create Tasks",
                description: "Create multiple tasks at once with optional default file path",
                inputSchema: {
                    type: "object",
                    properties: {
                        tasks: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    content: { type: "string", description: "Task content text" },
                                    filePath: { type: "string", description: "Target markdown file path (overrides defaultFilePath)" },
                                    project: { type: "string", description: "Project name to append as +project" },
                                    context: { type: "string", description: "Context name to append as @context" },
                                    priority: { type: "number", minimum: 1, maximum: 5, description: "1-5 priority; adds ! markers" },
                                    dueDate: { type: "string", description: "Due date YYYY-MM-DD (adds 📅 marker)" },
                                    startDate: { type: "string", description: "Start date YYYY-MM-DD (adds 🛫 marker)" },
                                    tags: { type: "array", items: { type: "string" }, description: "Array of tags (without #)" },
                                    parent: { type: "string", description: "Parent task ID to create a subtask under" },
                                    completed: { type: "boolean", description: "Whether the task is already completed (for recording purposes)" },
                                    completedDate: { type: "string", description: "Completion date YYYY-MM-DD (only used when completed is true)" },
                                },
                                required: ["content"],
                            },
                            description: "Array of tasks to create",
                        },
                        defaultFilePath: { type: "string", description: "Default file path for all tasks (can be overridden per task)" },
                    },
                    required: ["tasks"],
                },
            },
        ];
    }
    /**
     * Build prompt messages based on prompt name and arguments
     */
    buildPromptMessages(promptName, args) {
        const messages = [];
        switch (promptName) {
            case "daily_review":
                messages.push({
                    role: "user",
                    content: {
                        type: "text",
                        text: `Please help me review my tasks for today. ${(args === null || args === void 0 ? void 0 : args.includeCompleted) ? 'Include completed tasks in the review.' : 'Focus on pending tasks only.'} Provide a summary of:
1. What tasks are due today
2. What tasks are overdue
3. High priority items that need attention
4. Suggested next actions`
                    }
                });
                break;
            case "weekly_planning":
                const weekOffset = (args === null || args === void 0 ? void 0 : args.weekOffset) || 0;
                messages.push({
                    role: "user",
                    content: {
                        type: "text",
                        text: `Help me plan my tasks for ${weekOffset === 0 ? 'this week' : `week +${weekOffset}`}. Please:
1. List all tasks scheduled for the week
2. Identify any conflicts or overloaded days
3. Suggest task prioritization
4. Recommend which tasks could be rescheduled if needed`
                    }
                });
                break;
            case "project_overview":
                messages.push({
                    role: "user",
                    content: {
                        type: "text",
                        text: `Provide a comprehensive overview of all my projects including:
1. List of all active projects
2. Task count per project (pending vs completed)
3. Projects with upcoming deadlines
4. Projects that may need more attention
5. Overall project health assessment`
                    }
                });
                break;
            case "overdue_tasks":
                const daysOverdue = (args === null || args === void 0 ? void 0 : args.daysOverdue) || 0;
                messages.push({
                    role: "user",
                    content: {
                        type: "text",
                        text: `Show me all overdue tasks ${daysOverdue > 0 ? `that are at least ${daysOverdue} days overdue` : ''}. Please:
1. Group them by priority level
2. Highlight the most critical overdue items
3. Suggest which tasks to tackle first
4. Identify any tasks that might need to be rescheduled or cancelled`
                    }
                });
                break;
            case "task_search":
                const query = (args === null || args === void 0 ? void 0 : args.query) || "";
                const project = args === null || args === void 0 ? void 0 : args.project;
                const priority = args === null || args === void 0 ? void 0 : args.priority;
                let searchPrompt = `Search for tasks matching: "${query}"`;
                if (project)
                    searchPrompt += ` in project "${project}"`;
                if (priority)
                    searchPrompt += ` with priority ${priority}`;
                messages.push({
                    role: "user",
                    content: {
                        type: "text",
                        text: `${searchPrompt}. Please:
1. List all matching tasks with their details
2. Group them by relevance or category
3. Highlight the most important matches
4. Provide a summary of the search results`
                    }
                });
                break;
            default:
                messages.push({
                    role: "user",
                    content: {
                        type: "text",
                        text: `Execute the ${promptName} prompt with the provided arguments.`
                    }
                });
        }
        return messages;
    }
    /**
     * Execute a tool
     */
    executeTool(toolName, args) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Ensure data source is available before executing tools
                if ((_a = this.plugin.settings) === null || _a === void 0 ? void 0 : _a.enableIndexer) {
                    const queryAPI = new (require("../dataflow/api/QueryAPI").QueryAPI)(this.plugin.app, this.plugin.app.vault, this.plugin.app.metadataCache);
                    // Rebind bridge if it's not initialized yet
                    if (!this.taskBridge) {
                        const WriteAPI = require("../dataflow/api/WriteAPI").WriteAPI;
                        const getTaskById = (id) => queryAPI.getRepository().getTaskById(id);
                        const writeAPI = new WriteAPI(this.plugin.app, this.plugin.app.vault, this.plugin.app.metadataCache, this.plugin, getTaskById);
                        this.taskBridge = new DataflowBridge(this.plugin, queryAPI, writeAPI);
                    }
                }
                let result;
                switch (toolName) {
                    case "query_tasks":
                        result = yield this.taskBridge.queryTasks(args);
                        break;
                    case "update_task":
                        result = { error: "Not implemented in DataflowBridge" };
                        break;
                    case "delete_task":
                        result = { error: "Not implemented in DataflowBridge" };
                        break;
                    case "create_task":
                        result = { error: "Not implemented in DataflowBridge" };
                        break;
                    case "create_task_in_daily_note":
                        result = { error: "Not implemented in DataflowBridge" };
                        break;
                    case "query_project_tasks":
                        result = yield this.taskBridge.queryProjectTasks(args.project);
                        break;
                    case "query_context_tasks":
                        result = yield this.taskBridge.queryContextTasks(args.context);
                        break;
                    case "query_by_priority":
                        result = yield this.taskBridge.queryByPriority(args.priority, args.limit);
                        break;
                    case "query_by_due_date":
                        result = yield this.taskBridge.queryByDate({
                            dateType: "due",
                            from: args.from,
                            to: args.to,
                            limit: args.limit,
                        });
                        break;
                    case "query_by_start_date":
                        result = yield this.taskBridge.queryByDate({
                            dateType: "start",
                            from: args.from,
                            to: args.to,
                            limit: args.limit,
                        });
                        break;
                    case "batch_update_text":
                        result = { error: "Not implemented in DataflowBridge" };
                        break;
                    case "batch_create_subtasks":
                        result = { error: "Not implemented in DataflowBridge" };
                        break;
                    case "search_tasks":
                        result = yield this.taskBridge.searchTasks(args);
                        break;
                    case "batch_create_tasks":
                        result = yield this.taskBridge.batchCreateTasks(args);
                        break;
                    case "add_project_quick_capture":
                        result = { error: "Not implemented in DataflowBridge" };
                        break;
                    case "update_task_status":
                        result = { error: "Not implemented in DataflowBridge" };
                        break;
                    case "batch_update_task_status":
                        result = { error: "Not implemented in DataflowBridge" };
                        break;
                    case "postpone_tasks":
                        result = { error: "Not implemented in DataflowBridge" };
                        break;
                    case "list_all_metadata":
                        result = this.taskBridge.listAllTagsProjectsContexts();
                        break;
                    case "list_tasks_for_period":
                        result = yield this.taskBridge.listTasksForPeriod(args);
                        break;
                    case "list_tasks_in_range":
                        result = (_d = yield ((_c = (_b = this.taskBridge).listTasksInRange) === null || _c === void 0 ? void 0 : _c.call(_b, args))) !== null && _d !== void 0 ? _d : { error: "Not implemented in DataflowBridge" };
                        break;
                    default:
                        throw new Error(`Tool not found: ${toolName}`);
                }
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            }
            catch (error) {
                // Re-throw tool not found errors so they can be handled properly
                if (error.message.includes("Tool not found")) {
                    throw error;
                }
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({ success: false, error: error.message }, null, 2),
                        },
                    ],
                    isError: true,
                };
            }
        });
    }
    /**
     * Handle MCP protocol request
     */
    handleMcpRequest(request, sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { method, params, id } = request;
            try {
                // Update session last access if exists
                if (sessionId && this.sessions.has(sessionId)) {
                    const session = this.sessions.get(sessionId);
                    session.lastAccess = new Date();
                }
                // Handle different MCP methods
                switch (method) {
                    case "initialize":
                        // Always create new session for initialize
                        const newSessionId = this.generateSessionId();
                        this.sessions.set(newSessionId, {
                            created: new Date(),
                            lastAccess: new Date(),
                        });
                        // Return sessionId for header processing
                        return {
                            jsonrpc: "2.0",
                            id,
                            result: {
                                protocolVersion: "2025-06-18",
                                serverInfo: {
                                    name: "obsidian-task-genius",
                                    version: this.plugin.manifest.version,
                                },
                                capabilities: {
                                    tools: {},
                                    resources: {},
                                    prompts: {},
                                    sampling: {},
                                },
                            },
                            _sessionId: newSessionId, // Internal field for header processing
                        };
                    case "tools/list":
                        return {
                            jsonrpc: "2.0",
                            id,
                            result: {
                                tools: this.getTools(),
                            },
                        };
                    case "prompts/list":
                        return {
                            jsonrpc: "2.0",
                            id,
                            result: {
                                prompts: this.getPrompts(),
                            },
                        };
                    case "prompts/get":
                        const promptName = params === null || params === void 0 ? void 0 : params.name;
                        const prompts = this.getPrompts();
                        const prompt = prompts.find(p => p.name === promptName);
                        if (!prompt) {
                            return {
                                jsonrpc: "2.0",
                                id,
                                error: {
                                    code: -32602,
                                    message: `Prompt not found: ${promptName}`,
                                },
                            };
                        }
                        return {
                            jsonrpc: "2.0",
                            id,
                            result: Object.assign(Object.assign({}, prompt), { 
                                // Build the prompt template based on the prompt name
                                messages: this.buildPromptMessages(promptName, params === null || params === void 0 ? void 0 : params.arguments) }),
                        };
                    case "resources/list":
                        return {
                            jsonrpc: "2.0",
                            id,
                            result: {
                                resources: this.getResources(),
                            },
                        };
                    case "resources/read":
                        // Return error for now since we don't have resources
                        return {
                            jsonrpc: "2.0",
                            id,
                            error: {
                                code: -32602,
                                message: "No resources available",
                            },
                        };
                    case "tools/call":
                        const toolName = params === null || params === void 0 ? void 0 : params.name;
                        const toolArgs = (params === null || params === void 0 ? void 0 : params.arguments) || {};
                        try {
                            const result = yield this.executeTool(toolName, toolArgs);
                            return {
                                jsonrpc: "2.0",
                                id,
                                result,
                            };
                        }
                        catch (error) {
                            if (error.message.includes("Unknown tool") || error.message.includes("Tool not found")) {
                                return {
                                    jsonrpc: "2.0",
                                    id,
                                    error: {
                                        code: -32602,
                                        message: error.message,
                                    },
                                };
                            }
                            throw error;
                        }
                    default:
                        return {
                            jsonrpc: "2.0",
                            id,
                            error: {
                                code: -32601,
                                message: `Method not found: ${method}`,
                            },
                        };
                }
            }
            catch (error) {
                return {
                    jsonrpc: "2.0",
                    id,
                    error: {
                        code: -32603,
                        message: error.message,
                    },
                };
            }
        });
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isRunning) {
                console.log("MCP Server is already running");
                return;
            }
            // Create HTTP server
            this.httpServer = http.createServer((req, res) => __awaiter(this, void 0, void 0, function* () {
                // Enable CORS if configured
                if (this.config.enableCors) {
                    res.setHeader("Access-Control-Allow-Origin", "*");
                    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
                    // Allow both canonical and lowercase header spellings for robustness, including MCP-Protocol-Version
                    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, authorization, Mcp-Session-Id, mcp-session-id, Mcp-App-Id, mcp-app-id, MCP-Protocol-Version, mcp-protocol-version, Accept");
                    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
                }
                // Handle OPTIONS for CORS preflight
                if (req.method === "OPTIONS") {
                    res.statusCode = 200;
                    res.end();
                    return;
                }
                const parsedUrl = url.parse(req.url || "", true);
                const pathname = parsedUrl.pathname || "";
                // Health check endpoint
                if (pathname === "/health") {
                    res.statusCode = 200;
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({
                        status: "healthy",
                        uptime: this.startTime
                            ? Date.now() - this.startTime.getTime()
                            : 0,
                        requestCount: this.requestCount,
                        sessions: this.sessions.size,
                    }));
                    return;
                }
                // MCP endpoint (also handle root path for compatibility)
                if ((pathname === "/mcp") && req.method === "POST") {
                    // Validate Origin header for security (DNS rebinding protection)
                    const origin = req.headers.origin;
                    if (origin && !this.isOriginAllowed(origin)) {
                        res.statusCode = 403;
                        res.setHeader("Content-Type", "application/json");
                        res.end(JSON.stringify({
                            jsonrpc: "2.0",
                            id: null,
                            error: {
                                code: -32603,
                                message: "Forbidden: Origin not allowed",
                            },
                        }));
                        return;
                    }
                    // Check MCP-Protocol-Version header
                    const protocolVersion = req.headers["mcp-protocol-version"];
                    if (protocolVersion && protocolVersion !== "2024-11-05" && protocolVersion !== "2025-06-18") {
                        res.statusCode = 400;
                        res.setHeader("Content-Type", "application/json");
                        res.end(JSON.stringify({
                            jsonrpc: "2.0",
                            id: null,
                            error: {
                                code: -32602,
                                message: `Unsupported MCP-Protocol-Version: ${protocolVersion}`,
                            },
                        }));
                        return;
                    }
                    // Authenticate request
                    if (!this.authMiddleware.validateRequest(req)) {
                        res.statusCode = 401;
                        res.setHeader("Content-Type", "application/json");
                        res.end(JSON.stringify({
                            jsonrpc: "2.0",
                            id: null,
                            error: {
                                code: -32603,
                                message: "Unauthorized: Invalid or missing authentication token",
                            },
                        }));
                        return;
                    }
                    // Validate client app identity to avoid cross-vault confusion
                    const expectedAppId = this.plugin.app.appId;
                    const headerAppId = req.headers["mcp-app-id"] || "";
                    const bearerAppId = this.authMiddleware.getClientAppId(req);
                    const clientAppId = headerAppId || bearerAppId || "";
                    if (!clientAppId || clientAppId !== expectedAppId) {
                        res.statusCode = 400;
                        res.setHeader("Content-Type", "application/json");
                        res.end(JSON.stringify({
                            jsonrpc: "2.0",
                            id: null,
                            error: {
                                code: -32602,
                                message: "Invalid client app id",
                                data: {
                                    expectedAppId,
                                    received: clientAppId || null,
                                    source: headerAppId ? "header" : (bearerAppId ? "authorization" : "none")
                                }
                            },
                        }));
                        return;
                    }
                    this.requestCount++;
                    // Get session ID from headers
                    let sessionId = req.headers["mcp-session-id"];
                    // Handle request body
                    let body = "";
                    req.on("data", (chunk) => {
                        body += chunk.toString();
                    });
                    req.on("end", () => __awaiter(this, void 0, void 0, function* () {
                        let request;
                        try {
                            request = JSON.parse(body);
                        }
                        catch (parseError) {
                            res.statusCode = 400;
                            res.setHeader("Content-Type", "application/json");
                            res.end(JSON.stringify({
                                jsonrpc: "2.0",
                                error: {
                                    code: -32700,
                                    message: "Parse error: Invalid JSON",
                                },
                                id: null,
                            }));
                            return;
                        }
                        try {
                            // For non-initialize requests, validate session exists
                            if (request.method !== "initialize") {
                                if (!sessionId) {
                                    console.warn("Missing session ID for method:", request.method);
                                    res.statusCode = 200;
                                    res.setHeader("Content-Type", "application/json");
                                    res.end(JSON.stringify({
                                        jsonrpc: "2.0",
                                        id: request.id,
                                        error: {
                                            code: -32603,
                                            message: "Missing session ID. Initialize connection first.",
                                        },
                                    }));
                                    return;
                                }
                                if (!this.sessions.has(sessionId)) {
                                    console.warn("Invalid session ID:", sessionId);
                                    res.statusCode = 200;
                                    res.setHeader("Content-Type", "application/json");
                                    res.end(JSON.stringify({
                                        jsonrpc: "2.0",
                                        id: request.id,
                                        error: {
                                            code: -32603,
                                            message: "Invalid or expired session",
                                        },
                                    }));
                                    return;
                                }
                            }
                            // Handle MCP request
                            this.config.logLevel === "debug" && console.log("[MCP] <-", request);
                            const response = yield this.handleMcpRequest(request, sessionId);
                            this.config.logLevel === "debug" && console.log("[MCP] ->", response);
                            // Add session ID to response headers for initialize request
                            if (response._sessionId) {
                                res.setHeader("Mcp-Session-Id", response._sessionId);
                                // Remove internal field from response
                                delete response._sessionId;
                            }
                            res.statusCode = 200;
                            res.setHeader("Content-Type", "application/json");
                            res.end(JSON.stringify(response));
                        }
                        catch (error) {
                            console.error("MCP request error:", error);
                            res.statusCode = 500;
                            res.setHeader("Content-Type", "application/json");
                            res.end(JSON.stringify({
                                jsonrpc: "2.0",
                                error: {
                                    code: -32603,
                                    message: "Internal server error",
                                },
                                id: null,
                            }));
                        }
                    }));
                    return;
                }
                // SSE endpoint for notifications (simplified - just returns empty)
                if (pathname === "/mcp" && req.method === "GET") {
                    const sessionId = req.headers["mcp-session-id"];
                    // Make session validation optional for SSE
                    if (sessionId && !this.sessions.has(sessionId)) {
                        console.warn("SSE connection with invalid session ID:", sessionId);
                        // Continue anyway for compatibility
                    }
                    // Set up SSE headers
                    res.writeHead(200, {
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                    });
                    // Send initial connection message
                    res.write("data: {\"type\":\"connected\"}\n\n");
                    // Keep connection alive with heartbeat
                    const heartbeat = setInterval(() => {
                        res.write(": heartbeat\n\n");
                    }, 30000);
                    // Clean up on close
                    req.on("close", () => {
                        clearInterval(heartbeat);
                    });
                    return;
                }
                // Session termination
                if (pathname === "/mcp" && req.method === "DELETE") {
                    const sessionId = req.headers["mcp-session-id"];
                    if (sessionId && this.sessions.has(sessionId)) {
                        this.sessions.delete(sessionId);
                    }
                    res.statusCode = 204;
                    res.end();
                    return;
                }
                // Root endpoint for discovery - return simple server info (not JSON-RPC format)
                if (pathname === "/" && req.method === "GET") {
                    res.statusCode = 200;
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({
                        server: "Obsidian Task Genius MCP Server",
                        version: "1.0.0",
                        mcp_version: "2025-06-18",
                        endpoints: {
                            mcp: "/mcp",
                            health: "/health"
                        },
                        description: "MCP server for Obsidian task management"
                    }));
                    return;
                }
                // 404 for other routes
                res.statusCode = 404;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({
                    jsonrpc: "2.0",
                    id: null,
                    error: {
                        code: -32601,
                        message: `Path not found: ${pathname}`,
                    },
                }));
            }));
            // Start the server
            return new Promise((resolve, reject) => {
                try {
                    this.httpServer.listen({
                        port: this.config.port,
                        host: this.config.host,
                    }, () => {
                        this.isRunning = true;
                        this.startTime = new Date();
                        // Get actual port after binding (important when port is 0)
                        const address = this.httpServer.address();
                        this.actualPort = (address === null || address === void 0 ? void 0 : address.port) || this.config.port;
                        console.log(`MCP Server started on ${this.config.host}:${this.actualPort}`);
                        // Clean up old sessions periodically
                        setInterval(() => {
                            const now = Date.now();
                            for (const [id, session] of this.sessions) {
                                if (now - session.lastAccess.getTime() > 3600000) { // 1 hour
                                    this.sessions.delete(id);
                                }
                            }
                        }, 60000); // Check every minute
                        resolve();
                    });
                    this.httpServer.on("error", (error) => {
                        console.error("MCP Server error:", error);
                        this.isRunning = false;
                        reject(error);
                    });
                }
                catch (error) {
                    reject(error);
                }
            });
        });
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isRunning || !this.httpServer) {
                return;
            }
            // Clear sessions
            this.sessions.clear();
            // Close HTTP server
            return new Promise((resolve) => {
                this.httpServer.close(() => {
                    this.isRunning = false;
                    console.log("MCP Server stopped");
                    resolve();
                });
            });
        });
    }
    getStatus() {
        return {
            running: this.isRunning,
            port: this.actualPort || this.config.port,
            startTime: this.startTime,
            requestCount: this.requestCount,
            sessions: this.sessions.size,
        };
    }
    updateConfig(config) {
        if (config.authToken) {
            this.authMiddleware.updateToken(config.authToken);
        }
        Object.assign(this.config, config);
    }
    /**
     * Check if an origin is allowed (for DNS rebinding protection)
     */
    isOriginAllowed(origin) {
        // Allow local origins
        const allowedOrigins = [
            "http://localhost",
            "http://127.0.0.1",
            "https://localhost",
            "https://127.0.0.1",
            "app://obsidian.md",
            "obsidian://",
        ];
        // Check exact match or prefix match
        return allowedOrigins.some(allowed => origin === allowed || origin.startsWith(allowed + ":"));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWNwU2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiTWNwU2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7R0FHRzs7QUFHSCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDdkQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBSXpELDhEQUE4RDtBQUM5RCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0IsOERBQThEO0FBQzlELE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUUzQixNQUFNLE9BQU8sU0FBUztJQVVyQixZQUNTLE1BQTZCLEVBQzdCLE1BQXVCO1FBRHZCLFdBQU0sR0FBTixNQUFNLENBQXVCO1FBQzdCLFdBQU0sR0FBTixNQUFNLENBQWlCO1FBUnhCLGNBQVMsR0FBWSxLQUFLLENBQUM7UUFDM0IsaUJBQVksR0FBVyxDQUFDLENBQUM7UUFHekIsYUFBUSxHQUFxRCxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBTTlFLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxjQUFjLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzNELGdDQUFnQztRQUNoQyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxRQUFRLENBQUM7UUFDOUQsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLDBCQUEwQixDQUFDLENBQUMsUUFBUSxDQUFDO1FBQzlELE1BQU0sUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUN0Riw0REFBNEQ7UUFDNUQsTUFBTSxXQUFXLEdBQUcsQ0FBQyxFQUFVLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxhQUFh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U0FBUyxFQUFFO1lBQ3JCLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztTQUNsRDtRQUNELE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQ7O09BRUc7SUFDSyxlQUFlLENBQUMsTUFBYztRQUNyQyxzQkFBc0I7UUFDdEIsTUFBTSxjQUFjLEdBQUc7WUFDdEIsa0JBQWtCO1lBQ2xCLGtCQUFrQjtZQUNsQixtQkFBbUI7WUFDbkIsbUJBQW1CO1lBQ25CLG1CQUFtQjtZQUNuQixhQUFhO1NBQ2IsQ0FBQztRQUVGLG9DQUFvQztRQUNwQyxPQUFPLGNBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FDcEMsTUFBTSxLQUFLLE9BQU8sSUFBSSxNQUFNLENBQUMsVUFBVSxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUMsQ0FDdEQsQ0FBQztJQUNILENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBTaW1wbGlmaWVkIE1DUCBTZXJ2ZXIgaW1wbGVtZW50YXRpb24gZm9yIE9ic2lkaWFuXHJcbiAqIEF2b2lkcyBleHRlcm5hbCBkZXBlbmRlbmNpZXMgdGhhdCBjYW4ndCBiZSBidW5kbGVkXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgSW5jb21pbmdNZXNzYWdlLCBTZXJ2ZXJSZXNwb25zZSB9IGZyb20gXCJodHRwXCI7XHJcbmltcG9ydCB7IEF1dGhNaWRkbGV3YXJlIH0gZnJvbSBcIi4vYXV0aC9BdXRoTWlkZGxld2FyZVwiO1xyXG5pbXBvcnQgeyBEYXRhZmxvd0JyaWRnZSB9IGZyb20gXCIuL2JyaWRnZS9EYXRhZmxvd0JyaWRnZVwiO1xyXG5pbXBvcnQgeyBNY3BTZXJ2ZXJDb25maWcgfSBmcm9tIFwiLi90eXBlcy9tY3BcIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiLi4vaW5kZXhcIjtcclxuXHJcbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdmFyLXJlcXVpcmVzXHJcbmNvbnN0IGh0dHAgPSByZXF1aXJlKFwiaHR0cFwiKTtcclxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby12YXItcmVxdWlyZXNcclxuY29uc3QgdXJsID0gcmVxdWlyZShcInVybFwiKTtcclxuXHJcbmV4cG9ydCBjbGFzcyBNY3BTZXJ2ZXIge1xyXG5cdHByaXZhdGUgaHR0cFNlcnZlcjogYW55O1xyXG5cdHByaXZhdGUgYXV0aE1pZGRsZXdhcmU6IEF1dGhNaWRkbGV3YXJlO1xyXG5cdHByaXZhdGUgdGFza0JyaWRnZTogRGF0YWZsb3dCcmlkZ2U7XHJcblx0cHJpdmF0ZSBpc1J1bm5pbmc6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHRwcml2YXRlIHJlcXVlc3RDb3VudDogbnVtYmVyID0gMDtcclxuXHRwcml2YXRlIHN0YXJ0VGltZT86IERhdGU7XHJcblx0cHJpdmF0ZSBhY3R1YWxQb3J0PzogbnVtYmVyO1xyXG5cdHByaXZhdGUgc2Vzc2lvbnM6IE1hcDxzdHJpbmcsIHsgY3JlYXRlZDogRGF0ZTsgbGFzdEFjY2VzczogRGF0ZSB9PiA9IG5ldyBNYXAoKTtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0cHJpdmF0ZSBjb25maWc6IE1jcFNlcnZlckNvbmZpZ1xyXG5cdCkge1xyXG5cdFx0dGhpcy5hdXRoTWlkZGxld2FyZSA9IG5ldyBBdXRoTWlkZGxld2FyZShjb25maWcuYXV0aFRva2VuKTtcclxuXHRcdC8vIEFsd2F5cyB1c2UgRGF0YWZsb3dCcmlkZ2Ugbm93XHJcblx0XHRjb25zdCBRdWVyeUFQSSA9IHJlcXVpcmUoXCIuLi9kYXRhZmxvdy9hcGkvUXVlcnlBUElcIikuUXVlcnlBUEk7XHJcblx0XHRjb25zdCBXcml0ZUFQSSA9IHJlcXVpcmUoXCIuLi9kYXRhZmxvdy9hcGkvV3JpdGVBUElcIikuV3JpdGVBUEk7XHJcblx0XHRjb25zdCBxdWVyeUFQSSA9IG5ldyBRdWVyeUFQSShwbHVnaW4uYXBwLCBwbHVnaW4uYXBwLnZhdWx0LCBwbHVnaW4uYXBwLm1ldGFkYXRhQ2FjaGUpO1xyXG5cdFx0Ly8gQ3JlYXRlIFdyaXRlQVBJIHdpdGggZ2V0VGFza0J5SWQgZnVuY3Rpb24gZnJvbSByZXBvc2l0b3J5XHJcblx0XHRjb25zdCBnZXRUYXNrQnlJZCA9IChpZDogc3RyaW5nKSA9PiBxdWVyeUFQSS5nZXRSZXBvc2l0b3J5KCkuZ2V0VGFza0J5SWQoaWQpO1xyXG5cdFx0Y29uc3Qgd3JpdGVBUEkgPSBuZXcgV3JpdGVBUEkocGx1Z2luLmFwcCwgcGx1Z2luLmFwcC52YXVsdCwgcGx1Z2luLmFwcC5tZXRhZGF0YUNhY2hlLCBwbHVnaW4sIGdldFRhc2tCeUlkKTtcclxuXHRcdHRoaXMudGFza0JyaWRnZSA9IG5ldyBEYXRhZmxvd0JyaWRnZShwbHVnaW4sIHF1ZXJ5QVBJLCB3cml0ZUFQSSk7XHJcblx0XHRjb25zb2xlLmxvZyhcIk1DUCBTZXJ2ZXI6IFVzaW5nIERhdGFmbG93QnJpZGdlXCIpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2VuZXJhdGUgYSBzaW1wbGUgc2Vzc2lvbiBJRFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZ2VuZXJhdGVTZXNzaW9uSWQoKTogc3RyaW5nIHtcclxuXHRcdHJldHVybiBgc2Vzc2lvbi0ke0RhdGUubm93KCl9LSR7TWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDIsIDE1KX1gO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ29tcHV0ZSBhIHZhdWx0LWF3YXJlIHNlcnZlciBuYW1lLCBlLmcuLCBcIm15LXZhdWx0LXRhc2tzXCJcclxuXHQgKi9cclxuXHRwcml2YXRlIGdldFNlcnZlck5hbWUoKTogc3RyaW5nIHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IHJhdyA9IHRoaXMucGx1Z2luLmFwcC52YXVsdC5nZXROYW1lPy4oKSB8fCBcInZhdWx0XCI7XHJcblx0XHRcdGNvbnN0IHNsdWcgPSBTdHJpbmcocmF3KVxyXG5cdFx0XHRcdC50b0xvd2VyQ2FzZSgpXHJcblx0XHRcdFx0LnRyaW0oKVxyXG5cdFx0XHRcdC5yZXBsYWNlKC9bXmEtejAtOV0rL2csIFwiLVwiKVxyXG5cdFx0XHRcdC5yZXBsYWNlKC9eLSt8LSskL2csIFwiXCIpO1xyXG5cdFx0XHRyZXR1cm4gYCR7c2x1Z30tdGFza3NgO1xyXG5cdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRyZXR1cm4gXCJvYnNpZGlhbi10YXNrc1wiO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHByb21wdCBkZWZpbml0aW9uc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgZ2V0UHJvbXB0cygpOiBhbnlbXSB7XHJcblx0XHRyZXR1cm4gW1xyXG5cdFx0XHR7XHJcblx0XHRcdFx0bmFtZTogXCJkYWlseV9yZXZpZXdcIixcclxuXHRcdFx0XHR0aXRsZTogXCJEYWlseSBUYXNrIFJldmlld1wiLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBcIlJldmlldyB0b2RheSdzIHRhc2tzIGFuZCBwbGFuIGZvciB0b21vcnJvd1wiLFxyXG5cdFx0XHRcdGFyZ3VtZW50czogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiBcImluY2x1ZGVDb21wbGV0ZWRcIixcclxuXHRcdFx0XHRcdFx0ZGVzY3JpcHRpb246IFwiSW5jbHVkZSBjb21wbGV0ZWQgdGFza3MgaW4gdGhlIHJldmlld1wiLFxyXG5cdFx0XHRcdFx0XHRyZXF1aXJlZDogZmFsc2UsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdF0sXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRuYW1lOiBcIndlZWtseV9wbGFubmluZ1wiLFxyXG5cdFx0XHRcdHRpdGxlOiBcIldlZWtseSBQbGFubmluZ1wiLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBcIlBsYW4gdGFza3MgZm9yIHRoZSB1cGNvbWluZyB3ZWVrXCIsXHJcblx0XHRcdFx0YXJndW1lbnRzOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6IFwid2Vla09mZnNldFwiLFxyXG5cdFx0XHRcdFx0XHRkZXNjcmlwdGlvbjogXCJXZWVrIG9mZnNldCBmcm9tIGN1cnJlbnQgd2VlayAoMCBmb3IgdGhpcyB3ZWVrLCAxIGZvciBuZXh0IHdlZWspXCIsXHJcblx0XHRcdFx0XHRcdHJlcXVpcmVkOiBmYWxzZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XSxcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdG5hbWU6IFwicHJvamVjdF9vdmVydmlld1wiLFxyXG5cdFx0XHRcdHRpdGxlOiBcIlByb2plY3QgT3ZlcnZpZXdcIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogXCJHZXQgYW4gb3ZlcnZpZXcgb2YgYWxsIHByb2plY3RzIGFuZCB0aGVpciB0YXNrIGNvdW50c1wiLFxyXG5cdFx0XHRcdGFyZ3VtZW50czogW10sXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRuYW1lOiBcIm92ZXJkdWVfdGFza3NcIixcclxuXHRcdFx0XHR0aXRsZTogXCJPdmVyZHVlIFRhc2tzIFN1bW1hcnlcIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogXCJMaXN0IGFsbCBvdmVyZHVlIHRhc2tzIG9yZ2FuaXplZCBieSBwcmlvcml0eVwiLFxyXG5cdFx0XHRcdGFyZ3VtZW50czogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiBcImRheXNPdmVyZHVlXCIsXHJcblx0XHRcdFx0XHRcdGRlc2NyaXB0aW9uOiBcIk1pbmltdW0gZGF5cyBvdmVyZHVlIHRvIGluY2x1ZGVcIixcclxuXHRcdFx0XHRcdFx0cmVxdWlyZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0bmFtZTogXCJ0YXNrX3NlYXJjaFwiLFxyXG5cdFx0XHRcdHRpdGxlOiBcIkFkdmFuY2VkIFRhc2sgU2VhcmNoXCIsXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IFwiU2VhcmNoIGZvciB0YXNrcyB3aXRoIHNwZWNpZmljIGNyaXRlcmlhXCIsXHJcblx0XHRcdFx0YXJndW1lbnRzOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6IFwicXVlcnlcIixcclxuXHRcdFx0XHRcdFx0ZGVzY3JpcHRpb246IFwiU2VhcmNoIHF1ZXJ5IHRleHRcIixcclxuXHRcdFx0XHRcdFx0cmVxdWlyZWQ6IHRydWUsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiBcInByb2plY3RcIixcclxuXHRcdFx0XHRcdFx0ZGVzY3JpcHRpb246IFwiRmlsdGVyIGJ5IHByb2plY3QgbmFtZVwiLFxyXG5cdFx0XHRcdFx0XHRyZXF1aXJlZDogZmFsc2UsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiBcInByaW9yaXR5XCIsXHJcblx0XHRcdFx0XHRcdGRlc2NyaXB0aW9uOiBcIkZpbHRlciBieSBwcmlvcml0eSAoMS01KVwiLFxyXG5cdFx0XHRcdFx0XHRyZXF1aXJlZDogZmFsc2UsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdF0sXHJcblx0XHRcdH0sXHJcblx0XHRdO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHJlc291cmNlIGRlZmluaXRpb25zXHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZXRSZXNvdXJjZXMoKTogYW55W10ge1xyXG5cdFx0Ly8gUmV0dXJuIGVtcHR5IGFycmF5IGZvciBub3cgLSBjb3VsZCBiZSBleHBhbmRlZCB0byBwcm92aWRlXHJcblx0XHQvLyB2YXVsdCBzdGF0aXN0aWNzLCB0YXNrIG1ldHJpY3MsIGV0Yy5cclxuXHRcdHJldHVybiBbXTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0b29sIGRlZmluaXRpb25zXHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZXRUb29scygpOiBhbnlbXSB7XHJcblx0XHRyZXR1cm4gW1xyXG5cdFx0XHR7XHJcblx0XHRcdFx0bmFtZTogXCJ1cGRhdGVfdGFza19zdGF0dXNcIixcclxuXHRcdFx0XHR0aXRsZTogXCJVcGRhdGUgVGFzayBTdGF0dXNcIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogXCJVcGRhdGUgYSBzaW5nbGUgdGFzaydzIGNvbXBsZXRpb24gb3Igc3RhdHVzIGZpZWxkLlwiLFxyXG5cdFx0XHRcdGlucHV0U2NoZW1hOiB7XHJcblx0XHRcdFx0XHR0eXBlOiBcIm9iamVjdFwiLFxyXG5cdFx0XHRcdFx0cHJvcGVydGllczoge1xyXG5cdFx0XHRcdFx0XHR0YXNrSWQ6IHsgdHlwZTogXCJzdHJpbmdcIiB9LFxyXG5cdFx0XHRcdFx0XHRzdGF0dXM6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiT3B0aW9uYWwgc3RhdHVzIG1hcmsgdG8gc2V0IGluc3RlYWQgb2YgY29tcGxldGVkXCIgfSxcclxuXHRcdFx0XHRcdFx0Y29tcGxldGVkOiB7IHR5cGU6IFwiYm9vbGVhblwiLCBkZXNjcmlwdGlvbjogXCJTZXQgY29tcGxldGVkIHRydWUvZmFsc2VcIiB9LFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHJlcXVpcmVkOiBbXCJ0YXNrSWRcIl0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdG5hbWU6IFwiYmF0Y2hfdXBkYXRlX3Rhc2tfc3RhdHVzXCIsXHJcblx0XHRcdFx0dGl0bGU6IFwiQmF0Y2ggVXBkYXRlIFRhc2sgU3RhdHVzXCIsXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IFwiQmF0Y2ggdXBkYXRlIGNvbXBsZXRpb24vc3RhdHVzIGZvciBtdWx0aXBsZSB0YXNrcy5cIixcclxuXHRcdFx0XHRpbnB1dFNjaGVtYToge1xyXG5cdFx0XHRcdFx0dHlwZTogXCJvYmplY3RcIixcclxuXHRcdFx0XHRcdHByb3BlcnRpZXM6IHtcclxuXHRcdFx0XHRcdFx0dGFza0lkczogeyB0eXBlOiBcImFycmF5XCIsIGl0ZW1zOiB7IHR5cGU6IFwic3RyaW5nXCIgfSB9LFxyXG5cdFx0XHRcdFx0XHRzdGF0dXM6IHsgdHlwZTogXCJzdHJpbmdcIiB9LFxyXG5cdFx0XHRcdFx0XHRjb21wbGV0ZWQ6IHsgdHlwZTogXCJib29sZWFuXCIgfSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRyZXF1aXJlZDogW1widGFza0lkc1wiXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0bmFtZTogXCJwb3N0cG9uZV90YXNrc1wiLFxyXG5cdFx0XHRcdHRpdGxlOiBcIlBvc3Rwb25lIFRhc2tzXCIsXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IFwiQmF0Y2ggcG9zdHBvbmUgdGFza3MgdG8gYSBuZXcgZHVlIGRhdGUgKFlZWVktTU0tREQpXCIsXHJcblx0XHRcdFx0aW5wdXRTY2hlbWE6IHtcclxuXHRcdFx0XHRcdHR5cGU6IFwib2JqZWN0XCIsXHJcblx0XHRcdFx0XHRwcm9wZXJ0aWVzOiB7XHJcblx0XHRcdFx0XHRcdHRhc2tJZHM6IHsgdHlwZTogXCJhcnJheVwiLCBpdGVtczogeyB0eXBlOiBcInN0cmluZ1wiIH0gfSxcclxuXHRcdFx0XHRcdFx0bmV3RGF0ZTogeyB0eXBlOiBcInN0cmluZ1wiIH0sXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0cmVxdWlyZWQ6IFtcInRhc2tJZHNcIiwgXCJuZXdEYXRlXCJdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRuYW1lOiBcImxpc3RfYWxsX21ldGFkYXRhXCIsXHJcblx0XHRcdFx0dGl0bGU6IFwiTGlzdCBUYWdzL1Byb2plY3RzL0NvbnRleHRzXCIsXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IFwiTGlzdCBhbGwgdXNlZCB0YWdzLCBwcm9qZWN0IG5hbWVzLCBhbmQgY29udGV4dHMuXCIsXHJcblx0XHRcdFx0aW5wdXRTY2hlbWE6IHsgdHlwZTogXCJvYmplY3RcIiwgcHJvcGVydGllczoge30gfSxcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdG5hbWU6IFwibGlzdF90YXNrc19mb3JfcGVyaW9kXCIsXHJcblx0XHRcdFx0dGl0bGU6IFwiTGlzdCBUYXNrcyBGb3IgUGVyaW9kXCIsXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IFwiTGlzdCB0YXNrcyBmb3IgYSBkYXkvbW9udGgveWVhciBiYXNlZCBvbiBkYXRlVHlwZSAoZGVmYXVsdDogZHVlKS5cIixcclxuXHRcdFx0XHRpbnB1dFNjaGVtYToge1xyXG5cdFx0XHRcdFx0dHlwZTogXCJvYmplY3RcIixcclxuXHRcdFx0XHRcdHByb3BlcnRpZXM6IHtcclxuXHRcdFx0XHRcdFx0cGVyaW9kOiB7IHR5cGU6IFwic3RyaW5nXCIsIGVudW06IFtcImRheVwiLCBcIm1vbnRoXCIsIFwieWVhclwiXSB9LFxyXG5cdFx0XHRcdFx0XHRkYXRlOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIkJhc2UgZGF0ZSBZWVlZLU1NLUREXCIgfSxcclxuXHRcdFx0XHRcdFx0ZGF0ZVR5cGU6IHsgdHlwZTogXCJzdHJpbmdcIiwgZW51bTogW1wiZHVlXCIsIFwic3RhcnRcIiwgXCJzY2hlZHVsZWRcIiwgXCJjb21wbGV0ZWRcIl0sIGRlc2NyaXB0aW9uOiBcIldoaWNoIGRhdGUgZmllbGQgdG8gdXNlXCIgfSxcclxuXHRcdFx0XHRcdFx0bGltaXQ6IHsgdHlwZTogXCJudW1iZXJcIiB9LFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHJlcXVpcmVkOiBbXCJwZXJpb2RcIiwgXCJkYXRlXCJdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRuYW1lOiBcImxpc3RfdGFza3NfaW5fcmFuZ2VcIixcclxuXHRcdFx0XHR0aXRsZTogXCJMaXN0IFRhc2tzIEluIFJhbmdlXCIsXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IFwiTGlzdCB0YXNrcyBiZXR3ZWVuIGZyb20vdG8gZGF0ZXMgKGRlZmF1bHQgZGF0ZVR5cGU6IGR1ZSkuXCIsXHJcblx0XHRcdFx0aW5wdXRTY2hlbWE6IHtcclxuXHRcdFx0XHRcdHR5cGU6IFwib2JqZWN0XCIsXHJcblx0XHRcdFx0XHRwcm9wZXJ0aWVzOiB7XHJcblx0XHRcdFx0XHRcdGZyb206IHsgdHlwZTogXCJzdHJpbmdcIiB9LFxyXG5cdFx0XHRcdFx0XHR0bzogeyB0eXBlOiBcInN0cmluZ1wiIH0sXHJcblx0XHRcdFx0XHRcdGRhdGVUeXBlOiB7IHR5cGU6IFwic3RyaW5nXCIsIGVudW06IFtcImR1ZVwiLCBcInN0YXJ0XCIsIFwic2NoZWR1bGVkXCIsIFwiY29tcGxldGVkXCJdIH0sXHJcblx0XHRcdFx0XHRcdGxpbWl0OiB7IHR5cGU6IFwibnVtYmVyXCIgfSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRyZXF1aXJlZDogW1wiZnJvbVwiLCBcInRvXCJdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRuYW1lOiBcImFkZF9wcm9qZWN0X3F1aWNrX2NhcHR1cmVcIixcclxuXHRcdFx0XHR0aXRsZTogXCJBZGQgUHJvamVjdCBUYXNrIHRvIFF1aWNrIENhcHR1cmVcIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogXCJBZGQgYSBwcm9qZWN0LXRhZ2dlZCB0YXNrIHRvIHRoZSBRdWljayBDYXB0dXJlIHRhcmdldCAoZml4ZWQgb3IgZGFpbHkgbm90ZSkuXCIsXHJcblx0XHRcdFx0aW5wdXRTY2hlbWE6IHtcclxuXHRcdFx0XHRcdHR5cGU6IFwib2JqZWN0XCIsXHJcblx0XHRcdFx0XHRwcm9wZXJ0aWVzOiB7XHJcblx0XHRcdFx0XHRcdGNvbnRlbnQ6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiVGFzayBjb250ZW50IHRleHRcIiB9LFxyXG5cdFx0XHRcdFx0XHRwcm9qZWN0OiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIlByb2plY3QgbmFtZSB0byB0YWcgYXMgK3Byb2plY3RcIiB9LFxyXG5cdFx0XHRcdFx0XHR0YWdzOiB7IHR5cGU6IFwiYXJyYXlcIiwgaXRlbXM6IHsgdHlwZTogXCJzdHJpbmdcIiB9IH0sXHJcblx0XHRcdFx0XHRcdHByaW9yaXR5OiB7IHR5cGU6IFwibnVtYmVyXCIsIG1pbmltdW06IDEsIG1heGltdW06IDUgfSxcclxuXHRcdFx0XHRcdFx0ZHVlRGF0ZTogeyB0eXBlOiBcInN0cmluZ1wiIH0sXHJcblx0XHRcdFx0XHRcdHN0YXJ0RGF0ZTogeyB0eXBlOiBcInN0cmluZ1wiIH0sXHJcblx0XHRcdFx0XHRcdGNvbnRleHQ6IHsgdHlwZTogXCJzdHJpbmdcIiB9LFxyXG5cdFx0XHRcdFx0XHRoZWFkaW5nOiB7IHR5cGU6IFwic3RyaW5nXCIgfSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRyZXF1aXJlZDogW1wiY29udGVudFwiLCBcInByb2plY3RcIl0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdG5hbWU6IFwiY3JlYXRlX3Rhc2tfaW5fZGFpbHlfbm90ZVwiLFxyXG5cdFx0XHRcdHRpdGxlOiBcIkNyZWF0ZSBUYXNrIGluIERhaWx5IE5vdGVcIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogXCJDcmVhdGUgYSB0YXNrIGluIHRvZGF5J3MgZGFpbHkgbm90ZS4gQ3JlYXRlcyB0aGUgbm90ZSBpZiBtaXNzaW5nLiBTdXBwb3J0cyBjcmVhdGluZyBhbHJlYWR5LWNvbXBsZXRlZCB0YXNrcyBmb3IgcmVjb3JkaW5nIHB1cnBvc2VzLlwiLFxyXG5cdFx0XHRcdGlucHV0U2NoZW1hOiB7XHJcblx0XHRcdFx0XHR0eXBlOiBcIm9iamVjdFwiLFxyXG5cdFx0XHRcdFx0cHJvcGVydGllczoge1xyXG5cdFx0XHRcdFx0XHRjb250ZW50OiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIlRhc2sgY29udGVudCB0ZXh0XCIgfSxcclxuXHRcdFx0XHRcdFx0ZHVlRGF0ZTogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJEdWUgZGF0ZSBZWVlZLU1NLUREXCIgfSxcclxuXHRcdFx0XHRcdFx0c3RhcnREYXRlOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIlN0YXJ0IGRhdGUgWVlZWS1NTS1ERFwiIH0sXHJcblx0XHRcdFx0XHRcdHByaW9yaXR5OiB7IHR5cGU6IFwibnVtYmVyXCIsIG1pbmltdW06IDEsIG1heGltdW06IDUgfSxcclxuXHRcdFx0XHRcdFx0dGFnczogeyB0eXBlOiBcImFycmF5XCIsIGl0ZW1zOiB7IHR5cGU6IFwic3RyaW5nXCIgfSB9LFxyXG5cdFx0XHRcdFx0XHRwcm9qZWN0OiB7IHR5cGU6IFwic3RyaW5nXCIgfSxcclxuXHRcdFx0XHRcdFx0Y29udGV4dDogeyB0eXBlOiBcInN0cmluZ1wiIH0sXHJcblx0XHRcdFx0XHRcdGhlYWRpbmc6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiT3B0aW9uYWwgaGVhZGluZyB0byBwbGFjZSB0YXNrIHVuZGVyXCIgfSxcclxuXHRcdFx0XHRcdFx0cGFyZW50OiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIk9wdGlvbmFsIHBhcmVudCB0YXNrIElEIHRvIGNyZWF0ZSBzdWJ0YXNrIHVuZGVyXCIgfSxcclxuXHRcdFx0XHRcdFx0Y29tcGxldGVkOiB7IHR5cGU6IFwiYm9vbGVhblwiLCBkZXNjcmlwdGlvbjogXCJXaGV0aGVyIHRoZSB0YXNrIGlzIGFscmVhZHkgY29tcGxldGVkIChmb3IgcmVjb3JkaW5nIHB1cnBvc2VzKVwiIH0sXHJcblx0XHRcdFx0XHRcdGNvbXBsZXRlZERhdGU6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiQ29tcGxldGlvbiBkYXRlIFlZWVktTU0tREQgKG9ubHkgdXNlZCB3aGVuIGNvbXBsZXRlZCBpcyB0cnVlKVwiIH0sXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0cmVxdWlyZWQ6IFtcImNvbnRlbnRcIl0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdG5hbWU6IFwicXVlcnlfdGFza3NcIixcclxuXHRcdFx0XHR0aXRsZTogXCJRdWVyeSBUYXNrc1wiLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBcIlF1ZXJ5IHRhc2tzIHdpdGggZmlsdGVycyBhbmQgc29ydGluZyBvcHRpb25zXCIsXHJcblx0XHRcdFx0aW5wdXRTY2hlbWE6IHtcclxuXHRcdFx0XHRcdHR5cGU6IFwib2JqZWN0XCIsXHJcblx0XHRcdFx0XHRwcm9wZXJ0aWVzOiB7XHJcblx0XHRcdFx0XHRcdGZpbHRlcjoge1xyXG5cdFx0XHRcdFx0XHRcdHR5cGU6IFwib2JqZWN0XCIsXHJcblx0XHRcdFx0XHRcdFx0cHJvcGVydGllczoge1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29tcGxldGVkOiB7IHR5cGU6IFwiYm9vbGVhblwiIH0sXHJcblx0XHRcdFx0XHRcdFx0XHRwcm9qZWN0OiB7IHR5cGU6IFwic3RyaW5nXCIgfSxcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnRleHQ6IHsgdHlwZTogXCJzdHJpbmdcIiB9LFxyXG5cdFx0XHRcdFx0XHRcdFx0cHJpb3JpdHk6IHsgdHlwZTogXCJudW1iZXJcIiwgbWluaW11bTogMSwgbWF4aW11bTogNSB9LFxyXG5cdFx0XHRcdFx0XHRcdFx0dGFnczogeyB0eXBlOiBcImFycmF5XCIsIGl0ZW1zOiB7IHR5cGU6IFwic3RyaW5nXCIgfSB9LFxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdGxpbWl0OiB7IHR5cGU6IFwibnVtYmVyXCIgfSxcclxuXHRcdFx0XHRcdFx0b2Zmc2V0OiB7IHR5cGU6IFwibnVtYmVyXCIgfSxcclxuXHRcdFx0XHRcdFx0c29ydDoge1xyXG5cdFx0XHRcdFx0XHRcdHR5cGU6IFwib2JqZWN0XCIsXHJcblx0XHRcdFx0XHRcdFx0cHJvcGVydGllczoge1xyXG5cdFx0XHRcdFx0XHRcdFx0ZmllbGQ6IHsgdHlwZTogXCJzdHJpbmdcIiB9LFxyXG5cdFx0XHRcdFx0XHRcdFx0b3JkZXI6IHsgdHlwZTogXCJzdHJpbmdcIiwgZW51bTogW1wiYXNjXCIsIFwiZGVzY1wiXSB9LFxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRuYW1lOiBcInVwZGF0ZV90YXNrXCIsXHJcblx0XHRcdFx0dGl0bGU6IFwiVXBkYXRlIFRhc2tcIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogXCJVcGRhdGUgYSB0YXNrIGJ5IElEIHdpdGggbmV3IHByb3BlcnRpZXNcIixcclxuXHRcdFx0XHRpbnB1dFNjaGVtYToge1xyXG5cdFx0XHRcdFx0dHlwZTogXCJvYmplY3RcIixcclxuXHRcdFx0XHRcdHByb3BlcnRpZXM6IHtcclxuXHRcdFx0XHRcdFx0dGFza0lkOiB7IHR5cGU6IFwic3RyaW5nXCIgfSxcclxuXHRcdFx0XHRcdFx0dXBkYXRlczogeyB0eXBlOiBcIm9iamVjdFwiIH0sXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0cmVxdWlyZWQ6IFtcInRhc2tJZFwiLCBcInVwZGF0ZXNcIl0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdG5hbWU6IFwiZGVsZXRlX3Rhc2tcIixcclxuXHRcdFx0XHR0aXRsZTogXCJEZWxldGUgVGFza1wiLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBcIkRlbGV0ZSBhIHRhc2sgYnkgSURcIixcclxuXHRcdFx0XHRpbnB1dFNjaGVtYToge1xyXG5cdFx0XHRcdFx0dHlwZTogXCJvYmplY3RcIixcclxuXHRcdFx0XHRcdHByb3BlcnRpZXM6IHtcclxuXHRcdFx0XHRcdFx0dGFza0lkOiB7IHR5cGU6IFwic3RyaW5nXCIgfSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRyZXF1aXJlZDogW1widGFza0lkXCJdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRuYW1lOiBcImNyZWF0ZV90YXNrXCIsXHJcblx0XHRcdFx0dGl0bGU6IFwiQ3JlYXRlIFRhc2tcIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogXCJDcmVhdGUgYSBuZXcgdGFzayB3aXRoIHNwZWNpZmllZCBwcm9wZXJ0aWVzLiBJZiB0aGUgdGFyZ2V0IGZpbGUgZG9lcyBub3QgZXhpc3QsIGl0IHdpbGwgYmUgY3JlYXRlZCBhdXRvbWF0aWNhbGx5LiBTdXBwb3J0cyBjcmVhdGluZyBhbHJlYWR5LWNvbXBsZXRlZCB0YXNrcyBmb3IgcmVjb3JkaW5nIHB1cnBvc2VzLlwiLFxyXG5cdFx0XHRcdGlucHV0U2NoZW1hOiB7XHJcblx0XHRcdFx0XHR0eXBlOiBcIm9iamVjdFwiLFxyXG5cdFx0XHRcdFx0cHJvcGVydGllczoge1xyXG5cdFx0XHRcdFx0XHRjb250ZW50OiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIlRhc2sgY29udGVudCB0ZXh0XCIgfSxcclxuXHRcdFx0XHRcdFx0ZmlsZVBhdGg6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiVGFyZ2V0IG1hcmtkb3duIGZpbGUgcGF0aCAoZS5nLiwgRGFpbHkvMjAyNS0wOC0xNS5tZCkuIElmIG9taXR0ZWQsIHVzZXMgYWN0aXZlIGZpbGUuXCIgfSxcclxuXHRcdFx0XHRcdFx0cHJvamVjdDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJQcm9qZWN0IG5hbWUgdG8gYXBwZW5kIGFzICtwcm9qZWN0XCIgfSxcclxuXHRcdFx0XHRcdFx0Y29udGV4dDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJDb250ZXh0IG5hbWUgdG8gYXBwZW5kIGFzIEBjb250ZXh0XCIgfSxcclxuXHRcdFx0XHRcdFx0cHJpb3JpdHk6IHsgdHlwZTogXCJudW1iZXJcIiwgbWluaW11bTogMSwgbWF4aW11bTogNSwgZGVzY3JpcHRpb246IFwiMS01IHByaW9yaXR5OyBhZGRzICEgbWFya2Vyc1wiIH0sXHJcblx0XHRcdFx0XHRcdGR1ZURhdGU6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiRHVlIGRhdGUgWVlZWS1NTS1ERCAoYWRkcyDwn5OFIG1hcmtlcilcIiB9LFxyXG5cdFx0XHRcdFx0XHRzdGFydERhdGU6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiU3RhcnQgZGF0ZSBZWVlZLU1NLUREIChhZGRzIPCfm6sgbWFya2VyKVwiIH0sXHJcblx0XHRcdFx0XHRcdHRhZ3M6IHsgdHlwZTogXCJhcnJheVwiLCBpdGVtczogeyB0eXBlOiBcInN0cmluZ1wiIH0sIGRlc2NyaXB0aW9uOiBcIkFycmF5IG9mIHRhZ3MgKHdpdGhvdXQgIylcIiB9LFxyXG5cdFx0XHRcdFx0XHRwYXJlbnQ6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiUGFyZW50IHRhc2sgSUQgdG8gY3JlYXRlIGEgc3VidGFzayB1bmRlclwiIH0sXHJcblx0XHRcdFx0XHRcdGNvbXBsZXRlZDogeyB0eXBlOiBcImJvb2xlYW5cIiwgZGVzY3JpcHRpb246IFwiV2hldGhlciB0aGUgdGFzayBpcyBhbHJlYWR5IGNvbXBsZXRlZCAoZm9yIHJlY29yZGluZyBwdXJwb3NlcylcIiB9LFxyXG5cdFx0XHRcdFx0XHRjb21wbGV0ZWREYXRlOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIkNvbXBsZXRpb24gZGF0ZSBZWVlZLU1NLUREIChvbmx5IHVzZWQgd2hlbiBjb21wbGV0ZWQgaXMgdHJ1ZSlcIiB9LFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHJlcXVpcmVkOiBbXCJjb250ZW50XCJdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRuYW1lOiBcInF1ZXJ5X3Byb2plY3RfdGFza3NcIixcclxuXHRcdFx0XHR0aXRsZTogXCJRdWVyeSBQcm9qZWN0IFRhc2tzXCIsXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IFwiR2V0IGFsbCB0YXNrcyBmb3IgYSBzcGVjaWZpYyBwcm9qZWN0XCIsXHJcblx0XHRcdFx0aW5wdXRTY2hlbWE6IHtcclxuXHRcdFx0XHRcdHR5cGU6IFwib2JqZWN0XCIsXHJcblx0XHRcdFx0XHRwcm9wZXJ0aWVzOiB7XHJcblx0XHRcdFx0XHRcdHByb2plY3Q6IHsgdHlwZTogXCJzdHJpbmdcIiB9LFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHJlcXVpcmVkOiBbXCJwcm9qZWN0XCJdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRuYW1lOiBcInF1ZXJ5X2NvbnRleHRfdGFza3NcIixcclxuXHRcdFx0XHR0aXRsZTogXCJRdWVyeSBDb250ZXh0IFRhc2tzXCIsXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IFwiR2V0IGFsbCB0YXNrcyBmb3IgYSBzcGVjaWZpYyBjb250ZXh0XCIsXHJcblx0XHRcdFx0aW5wdXRTY2hlbWE6IHtcclxuXHRcdFx0XHRcdHR5cGU6IFwib2JqZWN0XCIsXHJcblx0XHRcdFx0XHRwcm9wZXJ0aWVzOiB7XHJcblx0XHRcdFx0XHRcdGNvbnRleHQ6IHsgdHlwZTogXCJzdHJpbmdcIiB9LFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHJlcXVpcmVkOiBbXCJjb250ZXh0XCJdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRuYW1lOiBcInF1ZXJ5X2J5X3ByaW9yaXR5XCIsXHJcblx0XHRcdFx0dGl0bGU6IFwiUXVlcnkgYnkgUHJpb3JpdHlcIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogXCJHZXQgdGFza3Mgd2l0aCBhIHNwZWNpZmljIHByaW9yaXR5IGxldmVsXCIsXHJcblx0XHRcdFx0aW5wdXRTY2hlbWE6IHtcclxuXHRcdFx0XHRcdHR5cGU6IFwib2JqZWN0XCIsXHJcblx0XHRcdFx0XHRwcm9wZXJ0aWVzOiB7XHJcblx0XHRcdFx0XHRcdHByaW9yaXR5OiB7IHR5cGU6IFwibnVtYmVyXCIsIG1pbmltdW06IDEsIG1heGltdW06IDUgfSxcclxuXHRcdFx0XHRcdFx0bGltaXQ6IHsgdHlwZTogXCJudW1iZXJcIiB9LFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHJlcXVpcmVkOiBbXCJwcmlvcml0eVwiXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0bmFtZTogXCJxdWVyeV9ieV9kdWVfZGF0ZVwiLFxyXG5cdFx0XHRcdHRpdGxlOiBcIlF1ZXJ5IGJ5IER1ZSBEYXRlXCIsXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IFwiR2V0IHRhc2tzIHdpdGhpbiBhIGR1ZSBkYXRlIHJhbmdlXCIsXHJcblx0XHRcdFx0aW5wdXRTY2hlbWE6IHtcclxuXHRcdFx0XHRcdHR5cGU6IFwib2JqZWN0XCIsXHJcblx0XHRcdFx0XHRwcm9wZXJ0aWVzOiB7XHJcblx0XHRcdFx0XHRcdGZyb206IHsgdHlwZTogXCJzdHJpbmdcIiB9LFxyXG5cdFx0XHRcdFx0XHR0bzogeyB0eXBlOiBcInN0cmluZ1wiIH0sXHJcblx0XHRcdFx0XHRcdGxpbWl0OiB7IHR5cGU6IFwibnVtYmVyXCIgfSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdG5hbWU6IFwicXVlcnlfYnlfc3RhcnRfZGF0ZVwiLFxyXG5cdFx0XHRcdHRpdGxlOiBcIlF1ZXJ5IGJ5IFN0YXJ0IERhdGVcIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogXCJHZXQgdGFza3Mgd2l0aGluIGEgc3RhcnQgZGF0ZSByYW5nZVwiLFxyXG5cdFx0XHRcdGlucHV0U2NoZW1hOiB7XHJcblx0XHRcdFx0XHR0eXBlOiBcIm9iamVjdFwiLFxyXG5cdFx0XHRcdFx0cHJvcGVydGllczoge1xyXG5cdFx0XHRcdFx0XHRmcm9tOiB7IHR5cGU6IFwic3RyaW5nXCIgfSxcclxuXHRcdFx0XHRcdFx0dG86IHsgdHlwZTogXCJzdHJpbmdcIiB9LFxyXG5cdFx0XHRcdFx0XHRsaW1pdDogeyB0eXBlOiBcIm51bWJlclwiIH0sXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRuYW1lOiBcImJhdGNoX3VwZGF0ZV90ZXh0XCIsXHJcblx0XHRcdFx0dGl0bGU6IFwiQmF0Y2ggVXBkYXRlIFRleHRcIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogXCJGaW5kIGFuZCByZXBsYWNlIHRleHQgaW4gbXVsdGlwbGUgdGFza3NcIixcclxuXHRcdFx0XHRpbnB1dFNjaGVtYToge1xyXG5cdFx0XHRcdFx0dHlwZTogXCJvYmplY3RcIixcclxuXHRcdFx0XHRcdHByb3BlcnRpZXM6IHtcclxuXHRcdFx0XHRcdFx0dGFza0lkczogeyB0eXBlOiBcImFycmF5XCIsIGl0ZW1zOiB7IHR5cGU6IFwic3RyaW5nXCIgfSB9LFxyXG5cdFx0XHRcdFx0XHRmaW5kVGV4dDogeyB0eXBlOiBcInN0cmluZ1wiIH0sXHJcblx0XHRcdFx0XHRcdHJlcGxhY2VUZXh0OiB7IHR5cGU6IFwic3RyaW5nXCIgfSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRyZXF1aXJlZDogW1widGFza0lkc1wiLCBcImZpbmRUZXh0XCIsIFwicmVwbGFjZVRleHRcIl0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdG5hbWU6IFwiYmF0Y2hfY3JlYXRlX3N1YnRhc2tzXCIsXHJcblx0XHRcdFx0dGl0bGU6IFwiQmF0Y2ggQ3JlYXRlIFN1YnRhc2tzXCIsXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IFwiQ3JlYXRlIG11bHRpcGxlIHN1YnRhc2tzIHVuZGVyIGEgcGFyZW50IHRhc2tcIixcclxuXHRcdFx0XHRpbnB1dFNjaGVtYToge1xyXG5cdFx0XHRcdFx0dHlwZTogXCJvYmplY3RcIixcclxuXHRcdFx0XHRcdHByb3BlcnRpZXM6IHtcclxuXHRcdFx0XHRcdFx0cGFyZW50VGFza0lkOiB7IHR5cGU6IFwic3RyaW5nXCIgfSxcclxuXHRcdFx0XHRcdFx0c3VidGFza3M6IHtcclxuXHRcdFx0XHRcdFx0XHR0eXBlOiBcImFycmF5XCIsXHJcblx0XHRcdFx0XHRcdFx0aXRlbXM6IHtcclxuXHRcdFx0XHRcdFx0XHRcdHR5cGU6IFwib2JqZWN0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRwcm9wZXJ0aWVzOiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnRlbnQ6IHsgdHlwZTogXCJzdHJpbmdcIiB9LFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRwcmlvcml0eTogeyB0eXBlOiBcIm51bWJlclwiLCBtaW5pbXVtOiAxLCBtYXhpbXVtOiA1IH0sXHJcblx0XHRcdFx0XHRcdFx0XHRcdGR1ZURhdGU6IHsgdHlwZTogXCJzdHJpbmdcIiB9LFxyXG5cdFx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHRcdHJlcXVpcmVkOiBbXCJjb250ZW50XCJdLFxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0cmVxdWlyZWQ6IFtcInBhcmVudFRhc2tJZFwiLCBcInN1YnRhc2tzXCJdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRuYW1lOiBcInNlYXJjaF90YXNrc1wiLFxyXG5cdFx0XHRcdHRpdGxlOiBcIlNlYXJjaCBUYXNrc1wiLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBcIlNlYXJjaCB0YXNrcyBieSB0ZXh0IHF1ZXJ5IGFjcm9zcyBtdWx0aXBsZSBmaWVsZHNcIixcclxuXHRcdFx0XHRpbnB1dFNjaGVtYToge1xyXG5cdFx0XHRcdFx0dHlwZTogXCJvYmplY3RcIixcclxuXHRcdFx0XHRcdHByb3BlcnRpZXM6IHtcclxuXHRcdFx0XHRcdFx0cXVlcnk6IHsgdHlwZTogXCJzdHJpbmdcIiB9LFxyXG5cdFx0XHRcdFx0XHRsaW1pdDogeyB0eXBlOiBcIm51bWJlclwiIH0sXHJcblx0XHRcdFx0XHRcdHNlYXJjaEluOiB7XHJcblx0XHRcdFx0XHRcdFx0dHlwZTogXCJhcnJheVwiLFxyXG5cdFx0XHRcdFx0XHRcdGl0ZW1zOiB7XHJcblx0XHRcdFx0XHRcdFx0XHR0eXBlOiBcInN0cmluZ1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0ZW51bTogW1wiY29udGVudFwiLCBcInRhZ3NcIiwgXCJwcm9qZWN0XCIsIFwiY29udGV4dFwiXSxcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHJlcXVpcmVkOiBbXCJxdWVyeVwiXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0bmFtZTogXCJiYXRjaF9jcmVhdGVfdGFza3NcIixcclxuXHRcdFx0XHR0aXRsZTogXCJCYXRjaCBDcmVhdGUgVGFza3NcIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogXCJDcmVhdGUgbXVsdGlwbGUgdGFza3MgYXQgb25jZSB3aXRoIG9wdGlvbmFsIGRlZmF1bHQgZmlsZSBwYXRoXCIsXHJcblx0XHRcdFx0aW5wdXRTY2hlbWE6IHtcclxuXHRcdFx0XHRcdHR5cGU6IFwib2JqZWN0XCIsXHJcblx0XHRcdFx0XHRwcm9wZXJ0aWVzOiB7XHJcblx0XHRcdFx0XHRcdHRhc2tzOiB7XHJcblx0XHRcdFx0XHRcdFx0dHlwZTogXCJhcnJheVwiLFxyXG5cdFx0XHRcdFx0XHRcdGl0ZW1zOiB7XHJcblx0XHRcdFx0XHRcdFx0XHR0eXBlOiBcIm9iamVjdFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0cHJvcGVydGllczoge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRjb250ZW50OiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIlRhc2sgY29udGVudCB0ZXh0XCIgfSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0ZmlsZVBhdGg6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiVGFyZ2V0IG1hcmtkb3duIGZpbGUgcGF0aCAob3ZlcnJpZGVzIGRlZmF1bHRGaWxlUGF0aClcIiB9LFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRwcm9qZWN0OiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIlByb2plY3QgbmFtZSB0byBhcHBlbmQgYXMgK3Byb2plY3RcIiB9LFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRjb250ZXh0OiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIkNvbnRleHQgbmFtZSB0byBhcHBlbmQgYXMgQGNvbnRleHRcIiB9LFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRwcmlvcml0eTogeyB0eXBlOiBcIm51bWJlclwiLCBtaW5pbXVtOiAxLCBtYXhpbXVtOiA1LCBkZXNjcmlwdGlvbjogXCIxLTUgcHJpb3JpdHk7IGFkZHMgISBtYXJrZXJzXCIgfSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0ZHVlRGF0ZTogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJEdWUgZGF0ZSBZWVlZLU1NLUREIChhZGRzIPCfk4UgbWFya2VyKVwiIH0sXHJcblx0XHRcdFx0XHRcdFx0XHRcdHN0YXJ0RGF0ZTogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJTdGFydCBkYXRlIFlZWVktTU0tREQgKGFkZHMg8J+bqyBtYXJrZXIpXCIgfSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGFnczogeyB0eXBlOiBcImFycmF5XCIsIGl0ZW1zOiB7IHR5cGU6IFwic3RyaW5nXCIgfSwgZGVzY3JpcHRpb246IFwiQXJyYXkgb2YgdGFncyAod2l0aG91dCAjKVwiIH0sXHJcblx0XHRcdFx0XHRcdFx0XHRcdHBhcmVudDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJQYXJlbnQgdGFzayBJRCB0byBjcmVhdGUgYSBzdWJ0YXNrIHVuZGVyXCIgfSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y29tcGxldGVkOiB7IHR5cGU6IFwiYm9vbGVhblwiLCBkZXNjcmlwdGlvbjogXCJXaGV0aGVyIHRoZSB0YXNrIGlzIGFscmVhZHkgY29tcGxldGVkIChmb3IgcmVjb3JkaW5nIHB1cnBvc2VzKVwiIH0sXHJcblx0XHRcdFx0XHRcdFx0XHRcdGNvbXBsZXRlZERhdGU6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiQ29tcGxldGlvbiBkYXRlIFlZWVktTU0tREQgKG9ubHkgdXNlZCB3aGVuIGNvbXBsZXRlZCBpcyB0cnVlKVwiIH0sXHJcblx0XHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdFx0cmVxdWlyZWQ6IFtcImNvbnRlbnRcIl0sXHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHRkZXNjcmlwdGlvbjogXCJBcnJheSBvZiB0YXNrcyB0byBjcmVhdGVcIixcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0ZGVmYXVsdEZpbGVQYXRoOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIkRlZmF1bHQgZmlsZSBwYXRoIGZvciBhbGwgdGFza3MgKGNhbiBiZSBvdmVycmlkZGVuIHBlciB0YXNrKVwiIH0sXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0cmVxdWlyZWQ6IFtcInRhc2tzXCJdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0sXHJcblx0XHRdO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQnVpbGQgcHJvbXB0IG1lc3NhZ2VzIGJhc2VkIG9uIHByb21wdCBuYW1lIGFuZCBhcmd1bWVudHNcclxuXHQgKi9cclxuXHRwcml2YXRlIGJ1aWxkUHJvbXB0TWVzc2FnZXMocHJvbXB0TmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBhbnlbXSB7XHJcblx0XHRjb25zdCBtZXNzYWdlcyA9IFtdO1xyXG5cdFx0XHJcblx0XHRzd2l0Y2ggKHByb21wdE5hbWUpIHtcclxuXHRcdFx0Y2FzZSBcImRhaWx5X3Jldmlld1wiOlxyXG5cdFx0XHRcdG1lc3NhZ2VzLnB1c2goe1xyXG5cdFx0XHRcdFx0cm9sZTogXCJ1c2VyXCIsXHJcblx0XHRcdFx0XHRjb250ZW50OiB7XHJcblx0XHRcdFx0XHRcdHR5cGU6IFwidGV4dFwiLFxyXG5cdFx0XHRcdFx0XHR0ZXh0OiBgUGxlYXNlIGhlbHAgbWUgcmV2aWV3IG15IHRhc2tzIGZvciB0b2RheS4gJHthcmdzPy5pbmNsdWRlQ29tcGxldGVkID8gJ0luY2x1ZGUgY29tcGxldGVkIHRhc2tzIGluIHRoZSByZXZpZXcuJyA6ICdGb2N1cyBvbiBwZW5kaW5nIHRhc2tzIG9ubHkuJ30gUHJvdmlkZSBhIHN1bW1hcnkgb2Y6XHJcbjEuIFdoYXQgdGFza3MgYXJlIGR1ZSB0b2RheVxyXG4yLiBXaGF0IHRhc2tzIGFyZSBvdmVyZHVlXHJcbjMuIEhpZ2ggcHJpb3JpdHkgaXRlbXMgdGhhdCBuZWVkIGF0dGVudGlvblxyXG40LiBTdWdnZXN0ZWQgbmV4dCBhY3Rpb25zYFxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRjYXNlIFwid2Vla2x5X3BsYW5uaW5nXCI6XHJcblx0XHRcdFx0Y29uc3Qgd2Vla09mZnNldCA9IGFyZ3M/LndlZWtPZmZzZXQgfHwgMDtcclxuXHRcdFx0XHRtZXNzYWdlcy5wdXNoKHtcclxuXHRcdFx0XHRcdHJvbGU6IFwidXNlclwiLFxyXG5cdFx0XHRcdFx0Y29udGVudDoge1xyXG5cdFx0XHRcdFx0XHR0eXBlOiBcInRleHRcIixcclxuXHRcdFx0XHRcdFx0dGV4dDogYEhlbHAgbWUgcGxhbiBteSB0YXNrcyBmb3IgJHt3ZWVrT2Zmc2V0ID09PSAwID8gJ3RoaXMgd2VlaycgOiBgd2VlayArJHt3ZWVrT2Zmc2V0fWB9LiBQbGVhc2U6XHJcbjEuIExpc3QgYWxsIHRhc2tzIHNjaGVkdWxlZCBmb3IgdGhlIHdlZWtcclxuMi4gSWRlbnRpZnkgYW55IGNvbmZsaWN0cyBvciBvdmVybG9hZGVkIGRheXNcclxuMy4gU3VnZ2VzdCB0YXNrIHByaW9yaXRpemF0aW9uXHJcbjQuIFJlY29tbWVuZCB3aGljaCB0YXNrcyBjb3VsZCBiZSByZXNjaGVkdWxlZCBpZiBuZWVkZWRgXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHJcblx0XHRcdGNhc2UgXCJwcm9qZWN0X292ZXJ2aWV3XCI6XHJcblx0XHRcdFx0bWVzc2FnZXMucHVzaCh7XHJcblx0XHRcdFx0XHRyb2xlOiBcInVzZXJcIixcclxuXHRcdFx0XHRcdGNvbnRlbnQ6IHtcclxuXHRcdFx0XHRcdFx0dHlwZTogXCJ0ZXh0XCIsXHJcblx0XHRcdFx0XHRcdHRleHQ6IGBQcm92aWRlIGEgY29tcHJlaGVuc2l2ZSBvdmVydmlldyBvZiBhbGwgbXkgcHJvamVjdHMgaW5jbHVkaW5nOlxyXG4xLiBMaXN0IG9mIGFsbCBhY3RpdmUgcHJvamVjdHNcclxuMi4gVGFzayBjb3VudCBwZXIgcHJvamVjdCAocGVuZGluZyB2cyBjb21wbGV0ZWQpXHJcbjMuIFByb2plY3RzIHdpdGggdXBjb21pbmcgZGVhZGxpbmVzXHJcbjQuIFByb2plY3RzIHRoYXQgbWF5IG5lZWQgbW9yZSBhdHRlbnRpb25cclxuNS4gT3ZlcmFsbCBwcm9qZWN0IGhlYWx0aCBhc3Nlc3NtZW50YFxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRjYXNlIFwib3ZlcmR1ZV90YXNrc1wiOlxyXG5cdFx0XHRcdGNvbnN0IGRheXNPdmVyZHVlID0gYXJncz8uZGF5c092ZXJkdWUgfHwgMDtcclxuXHRcdFx0XHRtZXNzYWdlcy5wdXNoKHtcclxuXHRcdFx0XHRcdHJvbGU6IFwidXNlclwiLFxyXG5cdFx0XHRcdFx0Y29udGVudDoge1xyXG5cdFx0XHRcdFx0XHR0eXBlOiBcInRleHRcIixcclxuXHRcdFx0XHRcdFx0dGV4dDogYFNob3cgbWUgYWxsIG92ZXJkdWUgdGFza3MgJHtkYXlzT3ZlcmR1ZSA+IDAgPyBgdGhhdCBhcmUgYXQgbGVhc3QgJHtkYXlzT3ZlcmR1ZX0gZGF5cyBvdmVyZHVlYCA6ICcnfS4gUGxlYXNlOlxyXG4xLiBHcm91cCB0aGVtIGJ5IHByaW9yaXR5IGxldmVsXHJcbjIuIEhpZ2hsaWdodCB0aGUgbW9zdCBjcml0aWNhbCBvdmVyZHVlIGl0ZW1zXHJcbjMuIFN1Z2dlc3Qgd2hpY2ggdGFza3MgdG8gdGFja2xlIGZpcnN0XHJcbjQuIElkZW50aWZ5IGFueSB0YXNrcyB0aGF0IG1pZ2h0IG5lZWQgdG8gYmUgcmVzY2hlZHVsZWQgb3IgY2FuY2VsbGVkYFxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRjYXNlIFwidGFza19zZWFyY2hcIjpcclxuXHRcdFx0XHRjb25zdCBxdWVyeSA9IGFyZ3M/LnF1ZXJ5IHx8IFwiXCI7XHJcblx0XHRcdFx0Y29uc3QgcHJvamVjdCA9IGFyZ3M/LnByb2plY3Q7XHJcblx0XHRcdFx0Y29uc3QgcHJpb3JpdHkgPSBhcmdzPy5wcmlvcml0eTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRsZXQgc2VhcmNoUHJvbXB0ID0gYFNlYXJjaCBmb3IgdGFza3MgbWF0Y2hpbmc6IFwiJHtxdWVyeX1cImA7XHJcblx0XHRcdFx0aWYgKHByb2plY3QpIHNlYXJjaFByb21wdCArPSBgIGluIHByb2plY3QgXCIke3Byb2plY3R9XCJgO1xyXG5cdFx0XHRcdGlmIChwcmlvcml0eSkgc2VhcmNoUHJvbXB0ICs9IGAgd2l0aCBwcmlvcml0eSAke3ByaW9yaXR5fWA7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0bWVzc2FnZXMucHVzaCh7XHJcblx0XHRcdFx0XHRyb2xlOiBcInVzZXJcIixcclxuXHRcdFx0XHRcdGNvbnRlbnQ6IHtcclxuXHRcdFx0XHRcdFx0dHlwZTogXCJ0ZXh0XCIsXHJcblx0XHRcdFx0XHRcdHRleHQ6IGAke3NlYXJjaFByb21wdH0uIFBsZWFzZTpcclxuMS4gTGlzdCBhbGwgbWF0Y2hpbmcgdGFza3Mgd2l0aCB0aGVpciBkZXRhaWxzXHJcbjIuIEdyb3VwIHRoZW0gYnkgcmVsZXZhbmNlIG9yIGNhdGVnb3J5XHJcbjMuIEhpZ2hsaWdodCB0aGUgbW9zdCBpbXBvcnRhbnQgbWF0Y2hlc1xyXG40LiBQcm92aWRlIGEgc3VtbWFyeSBvZiB0aGUgc2VhcmNoIHJlc3VsdHNgXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHJcblx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0bWVzc2FnZXMucHVzaCh7XHJcblx0XHRcdFx0XHRyb2xlOiBcInVzZXJcIixcclxuXHRcdFx0XHRcdGNvbnRlbnQ6IHtcclxuXHRcdFx0XHRcdFx0dHlwZTogXCJ0ZXh0XCIsXHJcblx0XHRcdFx0XHRcdHRleHQ6IGBFeGVjdXRlIHRoZSAke3Byb21wdE5hbWV9IHByb21wdCB3aXRoIHRoZSBwcm92aWRlZCBhcmd1bWVudHMuYFxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRyZXR1cm4gbWVzc2FnZXM7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFeGVjdXRlIGEgdG9vbFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgZXhlY3V0ZVRvb2wodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxhbnk+IHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdC8vIEVuc3VyZSBkYXRhIHNvdXJjZSBpcyBhdmFpbGFibGUgYmVmb3JlIGV4ZWN1dGluZyB0b29sc1xyXG5cdFx0XHRpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3M/LmVuYWJsZUluZGV4ZXIpIHtcclxuXHRcdFx0XHRjb25zdCBxdWVyeUFQSSA9IG5ldyAocmVxdWlyZShcIi4uL2RhdGFmbG93L2FwaS9RdWVyeUFQSVwiKS5RdWVyeUFQSSkodGhpcy5wbHVnaW4uYXBwLCB0aGlzLnBsdWdpbi5hcHAudmF1bHQsIHRoaXMucGx1Z2luLmFwcC5tZXRhZGF0YUNhY2hlKTtcclxuXHRcdFx0XHQvLyBSZWJpbmQgYnJpZGdlIGlmIGl0J3Mgbm90IGluaXRpYWxpemVkIHlldFxyXG5cdFx0XHRcdGlmICghdGhpcy50YXNrQnJpZGdlKSB7XHJcblx0XHRcdFx0XHRjb25zdCBXcml0ZUFQSSA9IHJlcXVpcmUoXCIuLi9kYXRhZmxvdy9hcGkvV3JpdGVBUElcIikuV3JpdGVBUEk7XHJcblx0XHRcdFx0XHRjb25zdCBnZXRUYXNrQnlJZCA9IChpZDogc3RyaW5nKSA9PiBxdWVyeUFQSS5nZXRSZXBvc2l0b3J5KCkuZ2V0VGFza0J5SWQoaWQpO1xyXG5cdFx0XHRcdFx0Y29uc3Qgd3JpdGVBUEkgPSBuZXcgV3JpdGVBUEkodGhpcy5wbHVnaW4uYXBwLCB0aGlzLnBsdWdpbi5hcHAudmF1bHQsIHRoaXMucGx1Z2luLmFwcC5tZXRhZGF0YUNhY2hlLCB0aGlzLnBsdWdpbiwgZ2V0VGFza0J5SWQpO1xyXG5cdFx0XHRcdFx0dGhpcy50YXNrQnJpZGdlID0gbmV3IERhdGFmbG93QnJpZGdlKHRoaXMucGx1Z2luLCBxdWVyeUFQSSwgd3JpdGVBUEkpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRsZXQgcmVzdWx0OiBhbnk7XHJcblxyXG5cdFx0XHRzd2l0Y2ggKHRvb2xOYW1lKSB7XHJcblx0XHRcdFx0Y2FzZSBcInF1ZXJ5X3Rhc2tzXCI6XHJcblx0XHRcdFx0XHRyZXN1bHQgPSBhd2FpdCB0aGlzLnRhc2tCcmlkZ2UucXVlcnlUYXNrcyhhcmdzKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJ1cGRhdGVfdGFza1wiOlxyXG5cdFx0XHRcdFx0cmVzdWx0ID0geyBlcnJvcjogXCJOb3QgaW1wbGVtZW50ZWQgaW4gRGF0YWZsb3dCcmlkZ2VcIiB9O1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBcImRlbGV0ZV90YXNrXCI6XHJcblx0XHRcdFx0XHRyZXN1bHQgPSB7IGVycm9yOiBcIk5vdCBpbXBsZW1lbnRlZCBpbiBEYXRhZmxvd0JyaWRnZVwiIH07XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIFwiY3JlYXRlX3Rhc2tcIjpcclxuXHRcdFx0XHRcdHJlc3VsdCA9IHsgZXJyb3I6IFwiTm90IGltcGxlbWVudGVkIGluIERhdGFmbG93QnJpZGdlXCIgfTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJjcmVhdGVfdGFza19pbl9kYWlseV9ub3RlXCI6XHJcblx0XHRcdFx0XHRyZXN1bHQgPSB7IGVycm9yOiBcIk5vdCBpbXBsZW1lbnRlZCBpbiBEYXRhZmxvd0JyaWRnZVwiIH07XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIFwicXVlcnlfcHJvamVjdF90YXNrc1wiOlxyXG5cdFx0XHRcdFx0cmVzdWx0ID0gYXdhaXQgdGhpcy50YXNrQnJpZGdlLnF1ZXJ5UHJvamVjdFRhc2tzKGFyZ3MucHJvamVjdCk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIFwicXVlcnlfY29udGV4dF90YXNrc1wiOlxyXG5cdFx0XHRcdFx0cmVzdWx0ID0gYXdhaXQgdGhpcy50YXNrQnJpZGdlLnF1ZXJ5Q29udGV4dFRhc2tzKGFyZ3MuY29udGV4dCk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIFwicXVlcnlfYnlfcHJpb3JpdHlcIjpcclxuXHRcdFx0XHRcdHJlc3VsdCA9IGF3YWl0IHRoaXMudGFza0JyaWRnZS5xdWVyeUJ5UHJpb3JpdHkoXHJcblx0XHRcdFx0XHRcdGFyZ3MucHJpb3JpdHksXHJcblx0XHRcdFx0XHRcdGFyZ3MubGltaXRcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIFwicXVlcnlfYnlfZHVlX2RhdGVcIjpcclxuXHRcdFx0XHRcdHJlc3VsdCA9IGF3YWl0IHRoaXMudGFza0JyaWRnZS5xdWVyeUJ5RGF0ZSh7XHJcblx0XHRcdFx0XHRcdGRhdGVUeXBlOiBcImR1ZVwiLFxyXG5cdFx0XHRcdFx0XHRmcm9tOiBhcmdzLmZyb20sXHJcblx0XHRcdFx0XHRcdHRvOiBhcmdzLnRvLFxyXG5cdFx0XHRcdFx0XHRsaW1pdDogYXJncy5saW1pdCxcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBcInF1ZXJ5X2J5X3N0YXJ0X2RhdGVcIjpcclxuXHRcdFx0XHRcdHJlc3VsdCA9IGF3YWl0IHRoaXMudGFza0JyaWRnZS5xdWVyeUJ5RGF0ZSh7XHJcblx0XHRcdFx0XHRcdGRhdGVUeXBlOiBcInN0YXJ0XCIsXHJcblx0XHRcdFx0XHRcdGZyb206IGFyZ3MuZnJvbSxcclxuXHRcdFx0XHRcdFx0dG86IGFyZ3MudG8sXHJcblx0XHRcdFx0XHRcdGxpbWl0OiBhcmdzLmxpbWl0LFxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIFwiYmF0Y2hfdXBkYXRlX3RleHRcIjpcclxuXHRcdFx0XHRcdHJlc3VsdCA9IHsgZXJyb3I6IFwiTm90IGltcGxlbWVudGVkIGluIERhdGFmbG93QnJpZGdlXCIgfTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJiYXRjaF9jcmVhdGVfc3VidGFza3NcIjpcclxuXHRcdFx0XHRcdHJlc3VsdCA9IHsgZXJyb3I6IFwiTm90IGltcGxlbWVudGVkIGluIERhdGFmbG93QnJpZGdlXCIgfTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJzZWFyY2hfdGFza3NcIjpcclxuXHRcdFx0XHRcdHJlc3VsdCA9IGF3YWl0IHRoaXMudGFza0JyaWRnZS5zZWFyY2hUYXNrcyhhcmdzKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJiYXRjaF9jcmVhdGVfdGFza3NcIjpcclxuXHRcdFx0XHRcdHJlc3VsdCA9IGF3YWl0IHRoaXMudGFza0JyaWRnZS5iYXRjaENyZWF0ZVRhc2tzKGFyZ3MpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBcImFkZF9wcm9qZWN0X3F1aWNrX2NhcHR1cmVcIjpcclxuXHRcdFx0XHRcdHJlc3VsdCA9IHsgZXJyb3I6IFwiTm90IGltcGxlbWVudGVkIGluIERhdGFmbG93QnJpZGdlXCIgfTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJ1cGRhdGVfdGFza19zdGF0dXNcIjpcclxuXHRcdFx0XHRcdHJlc3VsdCA9IHsgZXJyb3I6IFwiTm90IGltcGxlbWVudGVkIGluIERhdGFmbG93QnJpZGdlXCIgfTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJiYXRjaF91cGRhdGVfdGFza19zdGF0dXNcIjpcclxuXHRcdFx0XHRcdHJlc3VsdCA9IHsgZXJyb3I6IFwiTm90IGltcGxlbWVudGVkIGluIERhdGFmbG93QnJpZGdlXCIgfTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJwb3N0cG9uZV90YXNrc1wiOlxyXG5cdFx0XHRcdFx0cmVzdWx0ID0geyBlcnJvcjogXCJOb3QgaW1wbGVtZW50ZWQgaW4gRGF0YWZsb3dCcmlkZ2VcIiB9O1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBcImxpc3RfYWxsX21ldGFkYXRhXCI6XHJcblx0XHRcdFx0XHRyZXN1bHQgPSB0aGlzLnRhc2tCcmlkZ2UubGlzdEFsbFRhZ3NQcm9qZWN0c0NvbnRleHRzKCk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIFwibGlzdF90YXNrc19mb3JfcGVyaW9kXCI6XHJcblx0XHRcdFx0XHRyZXN1bHQgPSBhd2FpdCB0aGlzLnRhc2tCcmlkZ2UubGlzdFRhc2tzRm9yUGVyaW9kKGFyZ3MpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBcImxpc3RfdGFza3NfaW5fcmFuZ2VcIjpcclxuXHRcdFx0XHRcdHJlc3VsdCA9IGF3YWl0ICh0aGlzLnRhc2tCcmlkZ2UgYXMgYW55KS5saXN0VGFza3NJblJhbmdlPy4oYXJncykgPz8geyBlcnJvcjogXCJOb3QgaW1wbGVtZW50ZWQgaW4gRGF0YWZsb3dCcmlkZ2VcIiB9O1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihgVG9vbCBub3QgZm91bmQ6ICR7dG9vbE5hbWV9YCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0Y29udGVudDogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR0eXBlOiBcInRleHRcIixcclxuXHRcdFx0XHRcdFx0dGV4dDogSlNPTi5zdHJpbmdpZnkocmVzdWx0LCBudWxsLCAyKSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XSxcclxuXHRcdFx0fTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuXHRcdFx0Ly8gUmUtdGhyb3cgdG9vbCBub3QgZm91bmQgZXJyb3JzIHNvIHRoZXkgY2FuIGJlIGhhbmRsZWQgcHJvcGVybHlcclxuXHRcdFx0aWYgKGVycm9yLm1lc3NhZ2UuaW5jbHVkZXMoXCJUb29sIG5vdCBmb3VuZFwiKSkge1xyXG5cdFx0XHRcdHRocm93IGVycm9yO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0Y29udGVudDogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR0eXBlOiBcInRleHRcIixcclxuXHRcdFx0XHRcdFx0dGV4dDogSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSwgbnVsbCwgMiksXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdF0sXHJcblx0XHRcdFx0aXNFcnJvcjogdHJ1ZSxcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSBNQ1AgcHJvdG9jb2wgcmVxdWVzdFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgaGFuZGxlTWNwUmVxdWVzdChyZXF1ZXN0OiBhbnksIHNlc3Npb25JZD86IHN0cmluZyk6IFByb21pc2U8YW55PiB7XHJcblx0XHRjb25zdCB7IG1ldGhvZCwgcGFyYW1zLCBpZCB9ID0gcmVxdWVzdDtcclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBVcGRhdGUgc2Vzc2lvbiBsYXN0IGFjY2VzcyBpZiBleGlzdHNcclxuXHRcdFx0aWYgKHNlc3Npb25JZCAmJiB0aGlzLnNlc3Npb25zLmhhcyhzZXNzaW9uSWQpKSB7XHJcblx0XHRcdFx0Y29uc3Qgc2Vzc2lvbiA9IHRoaXMuc2Vzc2lvbnMuZ2V0KHNlc3Npb25JZCkhO1xyXG5cdFx0XHRcdHNlc3Npb24ubGFzdEFjY2VzcyA9IG5ldyBEYXRlKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEhhbmRsZSBkaWZmZXJlbnQgTUNQIG1ldGhvZHNcclxuXHRcdFx0c3dpdGNoIChtZXRob2QpIHtcclxuXHRcdFx0XHRjYXNlIFwiaW5pdGlhbGl6ZVwiOlxyXG5cdFx0XHRcdFx0Ly8gQWx3YXlzIGNyZWF0ZSBuZXcgc2Vzc2lvbiBmb3IgaW5pdGlhbGl6ZVxyXG5cdFx0XHRcdFx0Y29uc3QgbmV3U2Vzc2lvbklkID0gdGhpcy5nZW5lcmF0ZVNlc3Npb25JZCgpO1xyXG5cdFx0XHRcdFx0dGhpcy5zZXNzaW9ucy5zZXQobmV3U2Vzc2lvbklkLCB7XHJcblx0XHRcdFx0XHRcdGNyZWF0ZWQ6IG5ldyBEYXRlKCksXHJcblx0XHRcdFx0XHRcdGxhc3RBY2Nlc3M6IG5ldyBEYXRlKCksXHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdC8vIFJldHVybiBzZXNzaW9uSWQgZm9yIGhlYWRlciBwcm9jZXNzaW5nXHJcblx0XHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0XHRqc29ucnBjOiBcIjIuMFwiLFxyXG5cdFx0XHRcdFx0XHRpZCxcclxuXHRcdFx0XHRcdFx0cmVzdWx0OiB7XHJcblx0XHRcdFx0XHRcdFx0cHJvdG9jb2xWZXJzaW9uOiBcIjIwMjUtMDYtMThcIixcclxuXHRcdFx0XHRcdFx0XHRzZXJ2ZXJJbmZvOiB7XHJcblx0XHRcdFx0XHRcdFx0XHRuYW1lOiBcIm9ic2lkaWFuLXRhc2stZ2VuaXVzXCIsXHJcblx0XHRcdFx0XHRcdFx0XHR2ZXJzaW9uOiB0aGlzLnBsdWdpbi5tYW5pZmVzdC52ZXJzaW9uLFxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0Y2FwYWJpbGl0aWVzOiB7XHJcblx0XHRcdFx0XHRcdFx0XHR0b29sczoge30sXHJcblx0XHRcdFx0XHRcdFx0XHRyZXNvdXJjZXM6IHt9LFxyXG5cdFx0XHRcdFx0XHRcdFx0cHJvbXB0czoge30sXHJcblx0XHRcdFx0XHRcdFx0XHRzYW1wbGluZzoge30sXHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0X3Nlc3Npb25JZDogbmV3U2Vzc2lvbklkLCAgLy8gSW50ZXJuYWwgZmllbGQgZm9yIGhlYWRlciBwcm9jZXNzaW5nXHJcblx0XHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRjYXNlIFwidG9vbHMvbGlzdFwiOlxyXG5cdFx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdFx0anNvbnJwYzogXCIyLjBcIixcclxuXHRcdFx0XHRcdFx0aWQsXHJcblx0XHRcdFx0XHRcdHJlc3VsdDoge1xyXG5cdFx0XHRcdFx0XHRcdHRvb2xzOiB0aGlzLmdldFRvb2xzKCksXHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRjYXNlIFwicHJvbXB0cy9saXN0XCI6XHJcblx0XHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0XHRqc29ucnBjOiBcIjIuMFwiLFxyXG5cdFx0XHRcdFx0XHRpZCxcclxuXHRcdFx0XHRcdFx0cmVzdWx0OiB7XHJcblx0XHRcdFx0XHRcdFx0cHJvbXB0czogdGhpcy5nZXRQcm9tcHRzKCksXHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRjYXNlIFwicHJvbXB0cy9nZXRcIjpcclxuXHRcdFx0XHRcdGNvbnN0IHByb21wdE5hbWUgPSBwYXJhbXM/Lm5hbWU7XHJcblx0XHRcdFx0XHRjb25zdCBwcm9tcHRzID0gdGhpcy5nZXRQcm9tcHRzKCk7XHJcblx0XHRcdFx0XHRjb25zdCBwcm9tcHQgPSBwcm9tcHRzLmZpbmQocCA9PiBwLm5hbWUgPT09IHByb21wdE5hbWUpO1xyXG5cdFx0XHRcdFx0aWYgKCFwcm9tcHQpIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdFx0XHRqc29ucnBjOiBcIjIuMFwiLFxyXG5cdFx0XHRcdFx0XHRcdGlkLFxyXG5cdFx0XHRcdFx0XHRcdGVycm9yOiB7XHJcblx0XHRcdFx0XHRcdFx0XHRjb2RlOiAtMzI2MDIsXHJcblx0XHRcdFx0XHRcdFx0XHRtZXNzYWdlOiBgUHJvbXB0IG5vdCBmb3VuZDogJHtwcm9tcHROYW1lfWAsXHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0fTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRcdGpzb25ycGM6IFwiMi4wXCIsXHJcblx0XHRcdFx0XHRcdGlkLFxyXG5cdFx0XHRcdFx0XHRyZXN1bHQ6IHtcclxuXHRcdFx0XHRcdFx0XHQuLi5wcm9tcHQsXHJcblx0XHRcdFx0XHRcdFx0Ly8gQnVpbGQgdGhlIHByb21wdCB0ZW1wbGF0ZSBiYXNlZCBvbiB0aGUgcHJvbXB0IG5hbWVcclxuXHRcdFx0XHRcdFx0XHRtZXNzYWdlczogdGhpcy5idWlsZFByb21wdE1lc3NhZ2VzKHByb21wdE5hbWUsIHBhcmFtcz8uYXJndW1lbnRzKSxcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdGNhc2UgXCJyZXNvdXJjZXMvbGlzdFwiOlxyXG5cdFx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdFx0anNvbnJwYzogXCIyLjBcIixcclxuXHRcdFx0XHRcdFx0aWQsXHJcblx0XHRcdFx0XHRcdHJlc3VsdDoge1xyXG5cdFx0XHRcdFx0XHRcdHJlc291cmNlczogdGhpcy5nZXRSZXNvdXJjZXMoKSxcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdGNhc2UgXCJyZXNvdXJjZXMvcmVhZFwiOlxyXG5cdFx0XHRcdFx0Ly8gUmV0dXJuIGVycm9yIGZvciBub3cgc2luY2Ugd2UgZG9uJ3QgaGF2ZSByZXNvdXJjZXNcclxuXHRcdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRcdGpzb25ycGM6IFwiMi4wXCIsXHJcblx0XHRcdFx0XHRcdGlkLFxyXG5cdFx0XHRcdFx0XHRlcnJvcjoge1xyXG5cdFx0XHRcdFx0XHRcdGNvZGU6IC0zMjYwMixcclxuXHRcdFx0XHRcdFx0XHRtZXNzYWdlOiBcIk5vIHJlc291cmNlcyBhdmFpbGFibGVcIixcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdGNhc2UgXCJ0b29scy9jYWxsXCI6XHJcblx0XHRcdFx0XHRjb25zdCB0b29sTmFtZSA9IHBhcmFtcz8ubmFtZTtcclxuXHRcdFx0XHRcdGNvbnN0IHRvb2xBcmdzID0gcGFyYW1zPy5hcmd1bWVudHMgfHwge307XHJcblx0XHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmV4ZWN1dGVUb29sKHRvb2xOYW1lLCB0b29sQXJncyk7XHJcblx0XHRcdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRcdFx0anNvbnJwYzogXCIyLjBcIixcclxuXHRcdFx0XHRcdFx0XHRpZCxcclxuXHRcdFx0XHRcdFx0XHRyZXN1bHQsXHJcblx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHR9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcblx0XHRcdFx0XHRcdGlmIChlcnJvci5tZXNzYWdlLmluY2x1ZGVzKFwiVW5rbm93biB0b29sXCIpIHx8IGVycm9yLm1lc3NhZ2UuaW5jbHVkZXMoXCJUb29sIG5vdCBmb3VuZFwiKSkge1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRcdFx0XHRqc29ucnBjOiBcIjIuMFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0aWQsXHJcblx0XHRcdFx0XHRcdFx0XHRlcnJvcjoge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRjb2RlOiAtMzI2MDIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UsXHJcblx0XHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0dGhyb3cgZXJyb3I7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0XHRqc29ucnBjOiBcIjIuMFwiLFxyXG5cdFx0XHRcdFx0XHRpZCxcclxuXHRcdFx0XHRcdFx0ZXJyb3I6IHtcclxuXHRcdFx0XHRcdFx0XHRjb2RlOiAtMzI2MDEsXHJcblx0XHRcdFx0XHRcdFx0bWVzc2FnZTogYE1ldGhvZCBub3QgZm91bmQ6ICR7bWV0aG9kfWAsXHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblx0XHR9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0anNvbnJwYzogXCIyLjBcIixcclxuXHRcdFx0XHRpZCxcclxuXHRcdFx0XHRlcnJvcjoge1xyXG5cdFx0XHRcdFx0Y29kZTogLTMyNjAzLFxyXG5cdFx0XHRcdFx0bWVzc2FnZTogZXJyb3IubWVzc2FnZSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0YXN5bmMgc3RhcnQoKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRpZiAodGhpcy5pc1J1bm5pbmcpIHtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJNQ1AgU2VydmVyIGlzIGFscmVhZHkgcnVubmluZ1wiKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENyZWF0ZSBIVFRQIHNlcnZlclxyXG5cdFx0dGhpcy5odHRwU2VydmVyID0gaHR0cC5jcmVhdGVTZXJ2ZXIoXHJcblx0XHRcdGFzeW5jIChyZXE6IEluY29taW5nTWVzc2FnZSwgcmVzOiBTZXJ2ZXJSZXNwb25zZSkgPT4ge1xyXG5cdFx0XHRcdC8vIEVuYWJsZSBDT1JTIGlmIGNvbmZpZ3VyZWRcclxuXHRcdFx0XHRpZiAodGhpcy5jb25maWcuZW5hYmxlQ29ycykge1xyXG5cdFx0XHRcdFx0cmVzLnNldEhlYWRlcihcIkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpblwiLCBcIipcIik7XHJcblx0XHRcdFx0XHRyZXMuc2V0SGVhZGVyKFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kc1wiLCBcIkdFVCwgUE9TVCwgREVMRVRFLCBPUFRJT05TXCIpO1xyXG5cdFx0XHRcdFx0Ly8gQWxsb3cgYm90aCBjYW5vbmljYWwgYW5kIGxvd2VyY2FzZSBoZWFkZXIgc3BlbGxpbmdzIGZvciByb2J1c3RuZXNzLCBpbmNsdWRpbmcgTUNQLVByb3RvY29sLVZlcnNpb25cclxuXHRcdFx0XHRcdHJlcy5zZXRIZWFkZXIoXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzXCIsIFwiQ29udGVudC1UeXBlLCBBdXRob3JpemF0aW9uLCBhdXRob3JpemF0aW9uLCBNY3AtU2Vzc2lvbi1JZCwgbWNwLXNlc3Npb24taWQsIE1jcC1BcHAtSWQsIG1jcC1hcHAtaWQsIE1DUC1Qcm90b2NvbC1WZXJzaW9uLCBtY3AtcHJvdG9jb2wtdmVyc2lvbiwgQWNjZXB0XCIpO1xyXG5cdFx0XHRcdFx0cmVzLnNldEhlYWRlcihcIkFjY2Vzcy1Db250cm9sLUV4cG9zZS1IZWFkZXJzXCIsIFwiTWNwLVNlc3Npb24tSWRcIik7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBIYW5kbGUgT1BUSU9OUyBmb3IgQ09SUyBwcmVmbGlnaHRcclxuXHRcdFx0XHRpZiAocmVxLm1ldGhvZCA9PT0gXCJPUFRJT05TXCIpIHtcclxuXHRcdFx0XHRcdHJlcy5zdGF0dXNDb2RlID0gMjAwO1xyXG5cdFx0XHRcdFx0cmVzLmVuZCgpO1xyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Y29uc3QgcGFyc2VkVXJsID0gdXJsLnBhcnNlKHJlcS51cmwgfHwgXCJcIiwgdHJ1ZSk7XHJcblx0XHRcdFx0Y29uc3QgcGF0aG5hbWUgPSBwYXJzZWRVcmwucGF0aG5hbWUgfHwgXCJcIjtcclxuXHJcblx0XHRcdFx0Ly8gSGVhbHRoIGNoZWNrIGVuZHBvaW50XHJcblx0XHRcdFx0aWYgKHBhdGhuYW1lID09PSBcIi9oZWFsdGhcIikge1xyXG5cdFx0XHRcdFx0cmVzLnN0YXR1c0NvZGUgPSAyMDA7XHJcblx0XHRcdFx0XHRyZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuXHRcdFx0XHRcdHJlcy5lbmQoXHJcblx0XHRcdFx0XHRcdEpTT04uc3RyaW5naWZ5KHtcclxuXHRcdFx0XHRcdFx0XHRzdGF0dXM6IFwiaGVhbHRoeVwiLFxyXG5cdFx0XHRcdFx0XHRcdHVwdGltZTogdGhpcy5zdGFydFRpbWVcclxuXHRcdFx0XHRcdFx0XHRcdD8gRGF0ZS5ub3coKSAtIHRoaXMuc3RhcnRUaW1lLmdldFRpbWUoKVxyXG5cdFx0XHRcdFx0XHRcdFx0OiAwLFxyXG5cdFx0XHRcdFx0XHRcdHJlcXVlc3RDb3VudDogdGhpcy5yZXF1ZXN0Q291bnQsXHJcblx0XHRcdFx0XHRcdFx0c2Vzc2lvbnM6IHRoaXMuc2Vzc2lvbnMuc2l6ZSxcclxuXHRcdFx0XHRcdFx0fSlcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBNQ1AgZW5kcG9pbnQgKGFsc28gaGFuZGxlIHJvb3QgcGF0aCBmb3IgY29tcGF0aWJpbGl0eSlcclxuXHRcdFx0XHRpZiAoKHBhdGhuYW1lID09PSBcIi9tY3BcIikgJiYgcmVxLm1ldGhvZCA9PT0gXCJQT1NUXCIpIHtcclxuXHRcdFx0XHRcdC8vIFZhbGlkYXRlIE9yaWdpbiBoZWFkZXIgZm9yIHNlY3VyaXR5IChETlMgcmViaW5kaW5nIHByb3RlY3Rpb24pXHJcblx0XHRcdFx0XHRjb25zdCBvcmlnaW4gPSByZXEuaGVhZGVycy5vcmlnaW4gYXMgc3RyaW5nO1xyXG5cdFx0XHRcdFx0aWYgKG9yaWdpbiAmJiAhdGhpcy5pc09yaWdpbkFsbG93ZWQob3JpZ2luKSkge1xyXG5cdFx0XHRcdFx0XHRyZXMuc3RhdHVzQ29kZSA9IDQwMztcclxuXHRcdFx0XHRcdFx0cmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcblx0XHRcdFx0XHRcdHJlcy5lbmQoXHJcblx0XHRcdFx0XHRcdFx0SlNPTi5zdHJpbmdpZnkoe1xyXG5cdFx0XHRcdFx0XHRcdFx0anNvbnJwYzogXCIyLjBcIixcclxuXHRcdFx0XHRcdFx0XHRcdGlkOiBudWxsLFxyXG5cdFx0XHRcdFx0XHRcdFx0ZXJyb3I6IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y29kZTogLTMyNjAzLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRtZXNzYWdlOiBcIkZvcmJpZGRlbjogT3JpZ2luIG5vdCBhbGxvd2VkXCIsXHJcblx0XHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBDaGVjayBNQ1AtUHJvdG9jb2wtVmVyc2lvbiBoZWFkZXJcclxuXHRcdFx0XHRcdGNvbnN0IHByb3RvY29sVmVyc2lvbiA9IHJlcS5oZWFkZXJzW1wibWNwLXByb3RvY29sLXZlcnNpb25cIl0gYXMgc3RyaW5nO1xyXG5cdFx0XHRcdFx0aWYgKHByb3RvY29sVmVyc2lvbiAmJiBwcm90b2NvbFZlcnNpb24gIT09IFwiMjAyNC0xMS0wNVwiICYmIHByb3RvY29sVmVyc2lvbiAhPT0gXCIyMDI1LTA2LTE4XCIpIHtcclxuXHRcdFx0XHRcdFx0cmVzLnN0YXR1c0NvZGUgPSA0MDA7XHJcblx0XHRcdFx0XHRcdHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG5cdFx0XHRcdFx0XHRyZXMuZW5kKFxyXG5cdFx0XHRcdFx0XHRcdEpTT04uc3RyaW5naWZ5KHtcclxuXHRcdFx0XHRcdFx0XHRcdGpzb25ycGM6IFwiMi4wXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRpZDogbnVsbCxcclxuXHRcdFx0XHRcdFx0XHRcdGVycm9yOiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGNvZGU6IC0zMjYwMixcclxuXHRcdFx0XHRcdFx0XHRcdFx0bWVzc2FnZTogYFVuc3VwcG9ydGVkIE1DUC1Qcm90b2NvbC1WZXJzaW9uOiAke3Byb3RvY29sVmVyc2lvbn1gLFxyXG5cdFx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gQXV0aGVudGljYXRlIHJlcXVlc3RcclxuXHRcdFx0XHRcdGlmICghdGhpcy5hdXRoTWlkZGxld2FyZS52YWxpZGF0ZVJlcXVlc3QocmVxKSkge1xyXG5cdFx0XHRcdFx0XHRyZXMuc3RhdHVzQ29kZSA9IDQwMTtcclxuXHRcdFx0XHRcdFx0cmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcblx0XHRcdFx0XHRcdHJlcy5lbmQoXHJcblx0XHRcdFx0XHRcdFx0SlNPTi5zdHJpbmdpZnkoe1xyXG5cdFx0XHRcdFx0XHRcdFx0anNvbnJwYzogXCIyLjBcIixcclxuXHRcdFx0XHRcdFx0XHRcdGlkOiBudWxsLFxyXG5cdFx0XHRcdFx0XHRcdFx0ZXJyb3I6IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y29kZTogLTMyNjAzLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRtZXNzYWdlOiBcIlVuYXV0aG9yaXplZDogSW52YWxpZCBvciBtaXNzaW5nIGF1dGhlbnRpY2F0aW9uIHRva2VuXCIsXHJcblx0XHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBWYWxpZGF0ZSBjbGllbnQgYXBwIGlkZW50aXR5IHRvIGF2b2lkIGNyb3NzLXZhdWx0IGNvbmZ1c2lvblxyXG5cdFx0XHRcdFx0Y29uc3QgZXhwZWN0ZWRBcHBJZCA9IHRoaXMucGx1Z2luLmFwcC5hcHBJZDtcclxuXHRcdFx0XHRcdGNvbnN0IGhlYWRlckFwcElkID0gKHJlcS5oZWFkZXJzW1wibWNwLWFwcC1pZFwiXSBhcyBzdHJpbmcpIHx8IFwiXCI7XHJcblx0XHRcdFx0XHRjb25zdCBiZWFyZXJBcHBJZCA9IHRoaXMuYXV0aE1pZGRsZXdhcmUuZ2V0Q2xpZW50QXBwSWQocmVxKTtcclxuXHRcdFx0XHRcdGNvbnN0IGNsaWVudEFwcElkID0gaGVhZGVyQXBwSWQgfHwgYmVhcmVyQXBwSWQgfHwgXCJcIjtcclxuXHJcblx0XHRcdFx0XHRpZiAoIWNsaWVudEFwcElkIHx8IGNsaWVudEFwcElkICE9PSBleHBlY3RlZEFwcElkKSB7XHJcblx0XHRcdFx0XHRcdHJlcy5zdGF0dXNDb2RlID0gNDAwO1xyXG5cdFx0XHRcdFx0XHRyZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuXHRcdFx0XHRcdFx0cmVzLmVuZChcclxuXHRcdFx0XHRcdFx0XHRKU09OLnN0cmluZ2lmeSh7XHJcblx0XHRcdFx0XHRcdFx0XHRqc29ucnBjOiBcIjIuMFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0aWQ6IG51bGwsXHJcblx0XHRcdFx0XHRcdFx0XHRlcnJvcjoge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRjb2RlOiAtMzI2MDIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdG1lc3NhZ2U6IFwiSW52YWxpZCBjbGllbnQgYXBwIGlkXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGE6IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRleHBlY3RlZEFwcElkLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJlY2VpdmVkOiBjbGllbnRBcHBJZCB8fCBudWxsLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHNvdXJjZTogaGVhZGVyQXBwSWQgPyBcImhlYWRlclwiIDogKGJlYXJlckFwcElkID8gXCJhdXRob3JpemF0aW9uXCIgOiBcIm5vbmVcIilcclxuXHRcdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0dGhpcy5yZXF1ZXN0Q291bnQrKztcclxuXHJcblx0XHRcdFx0XHQvLyBHZXQgc2Vzc2lvbiBJRCBmcm9tIGhlYWRlcnNcclxuXHRcdFx0XHRcdGxldCBzZXNzaW9uSWQgPSByZXEuaGVhZGVyc1tcIm1jcC1zZXNzaW9uLWlkXCJdIGFzIHN0cmluZztcclxuXHJcblx0XHRcdFx0XHQvLyBIYW5kbGUgcmVxdWVzdCBib2R5XHJcblx0XHRcdFx0XHRsZXQgYm9keSA9IFwiXCI7XHJcblx0XHRcdFx0XHRyZXEub24oXCJkYXRhXCIsIChjaHVuaykgPT4ge1xyXG5cdFx0XHRcdFx0XHRib2R5ICs9IGNodW5rLnRvU3RyaW5nKCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRyZXEub24oXCJlbmRcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRsZXQgcmVxdWVzdDtcclxuXHRcdFx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdFx0XHRyZXF1ZXN0ID0gSlNPTi5wYXJzZShib2R5KTtcclxuXHRcdFx0XHRcdFx0fSBjYXRjaCAocGFyc2VFcnJvcjogYW55KSB7XHJcblx0XHRcdFx0XHRcdFx0cmVzLnN0YXR1c0NvZGUgPSA0MDA7XHJcblx0XHRcdFx0XHRcdFx0cmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcblx0XHRcdFx0XHRcdFx0cmVzLmVuZChcclxuXHRcdFx0XHRcdFx0XHRcdEpTT04uc3RyaW5naWZ5KHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0anNvbnJwYzogXCIyLjBcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0ZXJyb3I6IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRjb2RlOiAtMzI3MDAsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0bWVzc2FnZTogXCJQYXJzZSBlcnJvcjogSW52YWxpZCBKU09OXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0XHRcdGlkOiBudWxsLFxyXG5cdFx0XHRcdFx0XHRcdFx0fSlcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0XHQvLyBGb3Igbm9uLWluaXRpYWxpemUgcmVxdWVzdHMsIHZhbGlkYXRlIHNlc3Npb24gZXhpc3RzXHJcblx0XHRcdFx0XHRcdFx0aWYgKHJlcXVlc3QubWV0aG9kICE9PSBcImluaXRpYWxpemVcIikge1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKCFzZXNzaW9uSWQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS53YXJuKFwiTWlzc2luZyBzZXNzaW9uIElEIGZvciBtZXRob2Q6XCIsIHJlcXVlc3QubWV0aG9kKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0cmVzLnN0YXR1c0NvZGUgPSAyMDA7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRyZXMuZW5kKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdEpTT04uc3RyaW5naWZ5KHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGpzb25ycGM6IFwiMi4wXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRpZDogcmVxdWVzdC5pZCxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGVycm9yOiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNvZGU6IC0zMjYwMyxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0bWVzc2FnZTogXCJNaXNzaW5nIHNlc3Npb24gSUQuIEluaXRpYWxpemUgY29ubmVjdGlvbiBmaXJzdC5cIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0fSlcclxuXHRcdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKCF0aGlzLnNlc3Npb25zLmhhcyhzZXNzaW9uSWQpKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUud2FybihcIkludmFsaWQgc2Vzc2lvbiBJRDpcIiwgc2Vzc2lvbklkKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0cmVzLnN0YXR1c0NvZGUgPSAyMDA7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRyZXMuZW5kKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdEpTT04uc3RyaW5naWZ5KHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGpzb25ycGM6IFwiMi4wXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRpZDogcmVxdWVzdC5pZCxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGVycm9yOiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNvZGU6IC0zMjYwMyxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0bWVzc2FnZTogXCJJbnZhbGlkIG9yIGV4cGlyZWQgc2Vzc2lvblwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHRcdC8vIEhhbmRsZSBNQ1AgcmVxdWVzdFxyXG5cdFx0XHRcdFx0XHRcdHRoaXMuY29uZmlnLmxvZ0xldmVsID09PSBcImRlYnVnXCIgJiYgY29uc29sZS5sb2coXCJbTUNQXSA8LVwiLCByZXF1ZXN0KTtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuaGFuZGxlTWNwUmVxdWVzdChyZXF1ZXN0LCBzZXNzaW9uSWQpO1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMuY29uZmlnLmxvZ0xldmVsID09PSBcImRlYnVnXCIgJiYgY29uc29sZS5sb2coXCJbTUNQXSAtPlwiLCByZXNwb25zZSk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdC8vIEFkZCBzZXNzaW9uIElEIHRvIHJlc3BvbnNlIGhlYWRlcnMgZm9yIGluaXRpYWxpemUgcmVxdWVzdFxyXG5cdFx0XHRcdFx0XHRcdGlmIChyZXNwb25zZS5fc2Vzc2lvbklkKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRyZXMuc2V0SGVhZGVyKFwiTWNwLVNlc3Npb24tSWRcIiwgcmVzcG9uc2UuX3Nlc3Npb25JZCk7XHJcblx0XHRcdFx0XHRcdFx0XHQvLyBSZW1vdmUgaW50ZXJuYWwgZmllbGQgZnJvbSByZXNwb25zZVxyXG5cdFx0XHRcdFx0XHRcdFx0ZGVsZXRlIHJlc3BvbnNlLl9zZXNzaW9uSWQ7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRyZXMuc3RhdHVzQ29kZSA9IDIwMDtcclxuXHRcdFx0XHRcdFx0XHRyZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuXHRcdFx0XHRcdFx0XHRyZXMuZW5kKEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlKSk7XHJcblx0XHRcdFx0XHRcdH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmVycm9yKFwiTUNQIHJlcXVlc3QgZXJyb3I6XCIsIGVycm9yKTtcclxuXHRcdFx0XHRcdFx0XHRyZXMuc3RhdHVzQ29kZSA9IDUwMDtcclxuXHRcdFx0XHRcdFx0XHRyZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuXHRcdFx0XHRcdFx0XHRyZXMuZW5kKFxyXG5cdFx0XHRcdFx0XHRcdFx0SlNPTi5zdHJpbmdpZnkoe1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRqc29ucnBjOiBcIjIuMFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRlcnJvcjoge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGNvZGU6IC0zMjYwMyxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRtZXNzYWdlOiBcIkludGVybmFsIHNlcnZlciBlcnJvclwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRpZDogbnVsbCxcclxuXHRcdFx0XHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBTU0UgZW5kcG9pbnQgZm9yIG5vdGlmaWNhdGlvbnMgKHNpbXBsaWZpZWQgLSBqdXN0IHJldHVybnMgZW1wdHkpXHJcblx0XHRcdFx0aWYgKHBhdGhuYW1lID09PSBcIi9tY3BcIiAmJiByZXEubWV0aG9kID09PSBcIkdFVFwiKSB7XHJcblx0XHRcdFx0XHRjb25zdCBzZXNzaW9uSWQgPSByZXEuaGVhZGVyc1tcIm1jcC1zZXNzaW9uLWlkXCJdIGFzIHN0cmluZztcclxuXHRcdFx0XHRcdC8vIE1ha2Ugc2Vzc2lvbiB2YWxpZGF0aW9uIG9wdGlvbmFsIGZvciBTU0VcclxuXHRcdFx0XHRcdGlmIChzZXNzaW9uSWQgJiYgIXRoaXMuc2Vzc2lvbnMuaGFzKHNlc3Npb25JZCkpIHtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS53YXJuKFwiU1NFIGNvbm5lY3Rpb24gd2l0aCBpbnZhbGlkIHNlc3Npb24gSUQ6XCIsIHNlc3Npb25JZCk7XHJcblx0XHRcdFx0XHRcdC8vIENvbnRpbnVlIGFueXdheSBmb3IgY29tcGF0aWJpbGl0eVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0XHQvLyBTZXQgdXAgU1NFIGhlYWRlcnNcclxuXHRcdFx0XHRcdHJlcy53cml0ZUhlYWQoMjAwLCB7XHJcblx0XHRcdFx0XHRcdFwiQ29udGVudC1UeXBlXCI6IFwidGV4dC9ldmVudC1zdHJlYW1cIixcclxuXHRcdFx0XHRcdFx0XCJDYWNoZS1Db250cm9sXCI6IFwibm8tY2FjaGVcIixcclxuXHRcdFx0XHRcdFx0XCJDb25uZWN0aW9uXCI6IFwia2VlcC1hbGl2ZVwiLFxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdC8vIFNlbmQgaW5pdGlhbCBjb25uZWN0aW9uIG1lc3NhZ2VcclxuXHRcdFx0XHRcdHJlcy53cml0ZShcImRhdGE6IHtcXFwidHlwZVxcXCI6XFxcImNvbm5lY3RlZFxcXCJ9XFxuXFxuXCIpO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0XHQvLyBLZWVwIGNvbm5lY3Rpb24gYWxpdmUgd2l0aCBoZWFydGJlYXRcclxuXHRcdFx0XHRcdGNvbnN0IGhlYXJ0YmVhdCA9IHNldEludGVydmFsKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0cmVzLndyaXRlKFwiOiBoZWFydGJlYXRcXG5cXG5cIik7XHJcblx0XHRcdFx0XHR9LCAzMDAwMCk7XHJcblx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdC8vIENsZWFuIHVwIG9uIGNsb3NlXHJcblx0XHRcdFx0XHRyZXEub24oXCJjbG9zZVwiLCAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdGNsZWFySW50ZXJ2YWwoaGVhcnRiZWF0KTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBTZXNzaW9uIHRlcm1pbmF0aW9uXHJcblx0XHRcdFx0aWYgKHBhdGhuYW1lID09PSBcIi9tY3BcIiAmJiByZXEubWV0aG9kID09PSBcIkRFTEVURVwiKSB7XHJcblx0XHRcdFx0XHRjb25zdCBzZXNzaW9uSWQgPSByZXEuaGVhZGVyc1tcIm1jcC1zZXNzaW9uLWlkXCJdIGFzIHN0cmluZztcclxuXHRcdFx0XHRcdGlmIChzZXNzaW9uSWQgJiYgdGhpcy5zZXNzaW9ucy5oYXMoc2Vzc2lvbklkKSkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnNlc3Npb25zLmRlbGV0ZShzZXNzaW9uSWQpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0cmVzLnN0YXR1c0NvZGUgPSAyMDQ7XHJcblx0XHRcdFx0XHRyZXMuZW5kKCk7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBSb290IGVuZHBvaW50IGZvciBkaXNjb3ZlcnkgLSByZXR1cm4gc2ltcGxlIHNlcnZlciBpbmZvIChub3QgSlNPTi1SUEMgZm9ybWF0KVxyXG5cdFx0XHRcdGlmIChwYXRobmFtZSA9PT0gXCIvXCIgJiYgcmVxLm1ldGhvZCA9PT0gXCJHRVRcIikge1xyXG5cdFx0XHRcdFx0cmVzLnN0YXR1c0NvZGUgPSAyMDA7XHJcblx0XHRcdFx0XHRyZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuXHRcdFx0XHRcdHJlcy5lbmQoXHJcblx0XHRcdFx0XHRcdEpTT04uc3RyaW5naWZ5KHtcclxuXHRcdFx0XHRcdFx0XHRzZXJ2ZXI6IFwiT2JzaWRpYW4gVGFzayBHZW5pdXMgTUNQIFNlcnZlclwiLFxyXG5cdFx0XHRcdFx0XHRcdHZlcnNpb246IFwiMS4wLjBcIiwgLy8gRmFsbGJhY2sgdmVyc2lvblxyXG5cdFx0XHRcdFx0XHRcdG1jcF92ZXJzaW9uOiBcIjIwMjUtMDYtMThcIixcclxuXHRcdFx0XHRcdFx0XHRlbmRwb2ludHM6IHtcclxuXHRcdFx0XHRcdFx0XHRcdG1jcDogXCIvbWNwXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRoZWFsdGg6IFwiL2hlYWx0aFwiXHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHRkZXNjcmlwdGlvbjogXCJNQ1Agc2VydmVyIGZvciBPYnNpZGlhbiB0YXNrIG1hbmFnZW1lbnRcIlxyXG5cdFx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIDQwNCBmb3Igb3RoZXIgcm91dGVzXHJcblx0XHRcdFx0cmVzLnN0YXR1c0NvZGUgPSA0MDQ7XHJcblx0XHRcdFx0cmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcblx0XHRcdFx0cmVzLmVuZChcclxuXHRcdFx0XHRcdEpTT04uc3RyaW5naWZ5KHtcclxuXHRcdFx0XHRcdFx0anNvbnJwYzogXCIyLjBcIixcclxuXHRcdFx0XHRcdFx0aWQ6IG51bGwsXHJcblx0XHRcdFx0XHRcdGVycm9yOiB7XHJcblx0XHRcdFx0XHRcdFx0Y29kZTogLTMyNjAxLFxyXG5cdFx0XHRcdFx0XHRcdG1lc3NhZ2U6IGBQYXRoIG5vdCBmb3VuZDogJHtwYXRobmFtZX1gLFxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0fSlcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIFN0YXJ0IHRoZSBzZXJ2ZXJcclxuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0dGhpcy5odHRwU2VydmVyLmxpc3RlbihcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0cG9ydDogdGhpcy5jb25maWcucG9ydCxcclxuXHRcdFx0XHRcdFx0aG9zdDogdGhpcy5jb25maWcuaG9zdCxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHQoKSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMuaXNSdW5uaW5nID0gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0dGhpcy5zdGFydFRpbWUgPSBuZXcgRGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0Ly8gR2V0IGFjdHVhbCBwb3J0IGFmdGVyIGJpbmRpbmcgKGltcG9ydGFudCB3aGVuIHBvcnQgaXMgMClcclxuXHRcdFx0XHRcdFx0Y29uc3QgYWRkcmVzcyA9IHRoaXMuaHR0cFNlcnZlci5hZGRyZXNzKCk7XHJcblx0XHRcdFx0XHRcdHRoaXMuYWN0dWFsUG9ydCA9IGFkZHJlc3M/LnBvcnQgfHwgdGhpcy5jb25maWcucG9ydDtcclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRcdGBNQ1AgU2VydmVyIHN0YXJ0ZWQgb24gJHt0aGlzLmNvbmZpZy5ob3N0fToke3RoaXMuYWN0dWFsUG9ydH1gXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHQvLyBDbGVhbiB1cCBvbGQgc2Vzc2lvbnMgcGVyaW9kaWNhbGx5XHJcblx0XHRcdFx0XHRcdHNldEludGVydmFsKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBub3cgPSBEYXRlLm5vdygpO1xyXG5cdFx0XHRcdFx0XHRcdGZvciAoY29uc3QgW2lkLCBzZXNzaW9uXSBvZiB0aGlzLnNlc3Npb25zKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRpZiAobm93IC0gc2Vzc2lvbi5sYXN0QWNjZXNzLmdldFRpbWUoKSA+IDM2MDAwMDApIHsgLy8gMSBob3VyXHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuc2Vzc2lvbnMuZGVsZXRlKGlkKTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH0sIDYwMDAwKTsgLy8gQ2hlY2sgZXZlcnkgbWludXRlXHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHRyZXNvbHZlKCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0dGhpcy5odHRwU2VydmVyLm9uKFwiZXJyb3JcIiwgKGVycm9yOiBhbnkpID0+IHtcclxuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJNQ1AgU2VydmVyIGVycm9yOlwiLCBlcnJvcik7XHJcblx0XHRcdFx0XHR0aGlzLmlzUnVubmluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0cmVqZWN0KGVycm9yKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRyZWplY3QoZXJyb3IpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdGFzeW5jIHN0b3AoKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRpZiAoIXRoaXMuaXNSdW5uaW5nIHx8ICF0aGlzLmh0dHBTZXJ2ZXIpIHtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENsZWFyIHNlc3Npb25zXHJcblx0XHR0aGlzLnNlc3Npb25zLmNsZWFyKCk7XHJcblxyXG5cdFx0Ly8gQ2xvc2UgSFRUUCBzZXJ2ZXJcclxuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xyXG5cdFx0XHR0aGlzLmh0dHBTZXJ2ZXIuY2xvc2UoKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMuaXNSdW5uaW5nID0gZmFsc2U7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXCJNQ1AgU2VydmVyIHN0b3BwZWRcIik7XHJcblx0XHRcdFx0cmVzb2x2ZSgpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Z2V0U3RhdHVzKCk6IHtcclxuXHRcdHJ1bm5pbmc6IGJvb2xlYW47XHJcblx0XHRwb3J0PzogbnVtYmVyO1xyXG5cdFx0c3RhcnRUaW1lPzogRGF0ZTtcclxuXHRcdHJlcXVlc3RDb3VudD86IG51bWJlcjtcclxuXHRcdHNlc3Npb25zPzogbnVtYmVyO1xyXG5cdH0ge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cnVubmluZzogdGhpcy5pc1J1bm5pbmcsXHJcblx0XHRcdHBvcnQ6IHRoaXMuYWN0dWFsUG9ydCB8fCB0aGlzLmNvbmZpZy5wb3J0LFxyXG5cdFx0XHRzdGFydFRpbWU6IHRoaXMuc3RhcnRUaW1lLFxyXG5cdFx0XHRyZXF1ZXN0Q291bnQ6IHRoaXMucmVxdWVzdENvdW50LFxyXG5cdFx0XHRzZXNzaW9uczogdGhpcy5zZXNzaW9ucy5zaXplLFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZUNvbmZpZyhjb25maWc6IFBhcnRpYWw8TWNwU2VydmVyQ29uZmlnPik6IHZvaWQge1xyXG5cdFx0aWYgKGNvbmZpZy5hdXRoVG9rZW4pIHtcclxuXHRcdFx0dGhpcy5hdXRoTWlkZGxld2FyZS51cGRhdGVUb2tlbihjb25maWcuYXV0aFRva2VuKTtcclxuXHRcdH1cclxuXHRcdE9iamVjdC5hc3NpZ24odGhpcy5jb25maWcsIGNvbmZpZyk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDaGVjayBpZiBhbiBvcmlnaW4gaXMgYWxsb3dlZCAoZm9yIEROUyByZWJpbmRpbmcgcHJvdGVjdGlvbilcclxuXHQgKi9cclxuXHRwcml2YXRlIGlzT3JpZ2luQWxsb3dlZChvcmlnaW46IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0Ly8gQWxsb3cgbG9jYWwgb3JpZ2luc1xyXG5cdFx0Y29uc3QgYWxsb3dlZE9yaWdpbnMgPSBbXHJcblx0XHRcdFwiaHR0cDovL2xvY2FsaG9zdFwiLFxyXG5cdFx0XHRcImh0dHA6Ly8xMjcuMC4wLjFcIixcclxuXHRcdFx0XCJodHRwczovL2xvY2FsaG9zdFwiLFxyXG5cdFx0XHRcImh0dHBzOi8vMTI3LjAuMC4xXCIsXHJcblx0XHRcdFwiYXBwOi8vb2JzaWRpYW4ubWRcIixcclxuXHRcdFx0XCJvYnNpZGlhbjovL1wiLFxyXG5cdFx0XTtcclxuXHRcdFxyXG5cdFx0Ly8gQ2hlY2sgZXhhY3QgbWF0Y2ggb3IgcHJlZml4IG1hdGNoXHJcblx0XHRyZXR1cm4gYWxsb3dlZE9yaWdpbnMuc29tZShhbGxvd2VkID0+IFxyXG5cdFx0XHRvcmlnaW4gPT09IGFsbG93ZWQgfHwgb3JpZ2luLnN0YXJ0c1dpdGgoYWxsb3dlZCArIFwiOlwiKVxyXG5cdFx0KTtcclxuXHR9XHJcbn0iXX0=