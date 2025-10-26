/**
 * WriteAPI - Handles all write operations in the Dataflow architecture
 *
 * This API provides methods for creating, updating, and deleting tasks
 * by directly modifying vault files. Changes trigger ObsidianSource events
 * which automatically update the index through the Orchestrator.
 */
import { __awaiter } from "tslib";
import { moment } from "obsidian";
import { createDailyNote, getAllDailyNotes, getDailyNote, appHasDailyNotesPluginLoaded, getDailyNoteSettings, } from "obsidian-daily-notes-interface";
import { saveCapture, } from "@/utils/file/file-operations";
import { Events, emit } from "../events/Events";
import { CanvasTaskUpdater } from "@/parsers/canvas-task-updater";
import { rrulestr } from "rrule";
import { EMOJI_TAG_REGEX, TOKEN_CONTEXT_REGEX } from "@/common/regex-define";
export class WriteAPI {
    constructor(app, vault, metadataCache, plugin, getTaskById) {
        this.app = app;
        this.vault = vault;
        this.metadataCache = metadataCache;
        this.plugin = plugin;
        this.getTaskById = getTaskById;
        this.canvasTaskUpdater = new CanvasTaskUpdater(vault, plugin);
    }
    /**
     * Update a task's status or completion state
     */
    updateTaskStatus(args) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const task = yield Promise.resolve(this.getTaskById(args.taskId));
                if (!task) {
                    return { success: false, error: "Task not found" };
                }
                // Check if this is a Canvas task
                if (CanvasTaskUpdater.isCanvasTask(task)) {
                    return this.updateCanvasTask({
                        taskId: args.taskId,
                        updates: {
                            status: args.status,
                            completed: args.completed,
                        },
                    });
                }
                const file = this.vault.getAbstractFileByPath(task.filePath);
                if (!file) {
                    return { success: false, error: "File not found" };
                }
                const content = yield this.vault.read(file);
                const lines = content.split("\n");
                if (task.line < 0 || task.line >= lines.length) {
                    return { success: false, error: "Invalid line number" };
                }
                let taskLine = lines[task.line];
                // Update status or completion (support both status symbol and completed boolean)
                const configuredCompleted = (((_a = this.plugin.settings.taskStatuses) === null || _a === void 0 ? void 0 : _a.completed) || "x").split("|")[0];
                const willComplete = args.completed === true ||
                    (args.status !== undefined &&
                        ((typeof args.status.toLowerCase === "function" &&
                            args.status.toLowerCase() === "x") ||
                            args.status === configuredCompleted));
                // Determine mark to write to checkbox
                const markToWrite = args.status !== undefined
                    ? args.status
                    : willComplete
                        ? "x"
                        : " ";
                taskLine = taskLine.replace(/(\s*[-*+]\s*\[)[^\]]*(\]\s*)/, `$1${markToWrite}$2`);
                // Handle date writing based on status changes
                const previousMark = task.status || " ";
                const isCompleting = willComplete && !task.completed;
                const isAbandoning = markToWrite === "-" && previousMark !== "-";
                const isStarting = (markToWrite === ">" || markToWrite === "/") &&
                    (previousMark === " " || previousMark === "?");
                // Add completion date if completing and not already present
                if (isCompleting) {
                    const hasCompletionMeta = /(\[completion::|✅)/.test(taskLine);
                    if (!hasCompletionMeta) {
                        const completionDate = moment().format("YYYY-MM-DD");
                        const useDataviewFormat = this.plugin.settings.preferMetadataFormat ===
                            "dataview";
                        const completionMeta = useDataviewFormat
                            ? `[completion:: ${completionDate}]`
                            : `✅ ${completionDate}`;
                        taskLine = this.insertDateAtCorrectPosition(taskLine, completionMeta, "completed");
                    }
                }
                // Add cancelled date if abandoning
                if (isAbandoning &&
                    ((_b = this.plugin.settings.autoDateManager) === null || _b === void 0 ? void 0 : _b.manageCancelledDate)) {
                    const hasCancelledMeta = /(\[cancelled::|❌)/.test(taskLine);
                    if (!hasCancelledMeta) {
                        const cancelledDate = moment().format("YYYY-MM-DD");
                        const useDataviewFormat = this.plugin.settings.preferMetadataFormat ===
                            "dataview";
                        const cancelledMeta = useDataviewFormat
                            ? `[cancelled:: ${cancelledDate}]`
                            : `❌ ${cancelledDate}`;
                        taskLine = this.insertDateAtCorrectPosition(taskLine, cancelledMeta, "cancelled");
                    }
                }
                // Add start date if starting
                if (isStarting &&
                    ((_c = this.plugin.settings.autoDateManager) === null || _c === void 0 ? void 0 : _c.manageStartDate)) {
                    const hasStartMeta = /(\[start::|🛫|🚀)/.test(taskLine);
                    if (!hasStartMeta) {
                        const startDate = moment().format("YYYY-MM-DD");
                        const useDataviewFormat = this.plugin.settings.preferMetadataFormat ===
                            "dataview";
                        const startMeta = useDataviewFormat
                            ? `[start:: ${startDate}]`
                            : `🛫 ${startDate}`;
                        taskLine = this.insertDateAtCorrectPosition(taskLine, startMeta, "start");
                    }
                }
                lines[task.line] = taskLine;
                // If completing a recurring task, insert the next occurrence right after
                const isCompletingRecurringTask = willComplete && !task.completed && ((_d = task.metadata) === null || _d === void 0 ? void 0 : _d.recurrence);
                if (isCompletingRecurringTask) {
                    try {
                        const indentMatch = taskLine.match(/^(\s*)/);
                        const indentation = indentMatch ? indentMatch[0] : "";
                        const newTaskLine = this.createRecurringTask(Object.assign(Object.assign({}, task), { completed: true, metadata: Object.assign(Object.assign({}, task.metadata), { completedDate: Date.now() }) }), indentation);
                        lines.splice(task.line + 1, 0, newTaskLine);
                    }
                    catch (e) {
                        console.error("WriteAPI: failed to create next recurring task from updateTaskStatus:", e);
                    }
                }
                // Notify about write operation
                emit(this.app, Events.WRITE_OPERATION_START, {
                    path: file.path,
                    taskId: args.taskId,
                });
                yield this.vault.modify(file, lines.join("\n"));
                emit(this.app, Events.WRITE_OPERATION_COMPLETE, {
                    path: file.path,
                    taskId: args.taskId,
                });
                // Trigger task-completed event if task was just completed
                if (args.completed === true && !task.completed) {
                    const updatedTask = Object.assign(Object.assign({}, task), { completed: true });
                    this.app.workspace.trigger("task-genius:task-completed", updatedTask);
                }
                return { success: true };
            }
            catch (error) {
                console.error("WriteAPI: Error updating task status:", error);
                return { success: false, error: String(error) };
            }
        });
    }
    /**
     * Update a task with new properties
     */
    updateTask(args) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const originalTask = yield Promise.resolve(this.getTaskById(args.taskId));
                if (!originalTask) {
                    return { success: false, error: "Task not found" };
                }
                // Check if this is a Canvas task
                if (CanvasTaskUpdater.isCanvasTask(originalTask)) {
                    return this.updateCanvasTask(args);
                }
                // Handle FileSource (file-level) tasks differently
                const isFileSourceTask = ((_a = originalTask === null || originalTask === void 0 ? void 0 : originalTask.metadata) === null || _a === void 0 ? void 0 : _a.source) === "file-source" ||
                    originalTask.id.startsWith("file-source:");
                if (isFileSourceTask) {
                    return this.updateFileSourceTask(originalTask, args.updates, args.taskId);
                }
                const file = this.vault.getAbstractFileByPath(originalTask.filePath);
                if (!file) {
                    return { success: false, error: "File not found" };
                }
                const content = yield this.vault.read(file);
                const lines = content.split("\n");
                if (originalTask.line < 0 || originalTask.line >= lines.length) {
                    return { success: false, error: "Invalid line number" };
                }
                const updatedTask = Object.assign(Object.assign({}, originalTask), args.updates);
                let taskLine = lines[originalTask.line];
                // Track previous status for date management
                const previousStatus = originalTask.status || " ";
                let newStatus = previousStatus;
                // Update checkbox status or status mark
                if (args.updates.status !== undefined) {
                    // Prefer explicit status mark if provided
                    const statusMark = args.updates.status;
                    newStatus = statusMark;
                    taskLine = taskLine.replace(/(\s*[-*+]\s*\[)[^\]]*(\]\s*)/, `$1${statusMark}$2`);
                }
                else if (args.updates.completed !== undefined) {
                    // Fallback to setting based on completed boolean
                    const statusMark = args.updates.completed ? "x" : " ";
                    newStatus = statusMark;
                    taskLine = taskLine.replace(/(\s*[-*+]\s*\[)[^\]]*(\]\s*)/, `$1${statusMark}$2`);
                }
                // Handle date writing based on status changes
                const configuredCompleted = (((_b = this.plugin.settings.taskStatuses) === null || _b === void 0 ? void 0 : _b.completed) || "x").split("|")[0];
                const isCompleting = (newStatus === "x" || newStatus === configuredCompleted) &&
                    previousStatus !== "x" &&
                    previousStatus !== configuredCompleted;
                const isAbandoning = newStatus === "-" && previousStatus !== "-";
                const isStarting = (newStatus === ">" || newStatus === "/") &&
                    (previousStatus === " " || previousStatus === "?");
                // Add completion date if completing
                if (isCompleting && !((_c = args.updates.metadata) === null || _c === void 0 ? void 0 : _c.completedDate)) {
                    const hasCompletionMeta = /(\[completion::|✅)/.test(taskLine);
                    if (!hasCompletionMeta) {
                        const completionDate = moment().format("YYYY-MM-DD");
                        const useDataviewFormat = this.plugin.settings.preferMetadataFormat ===
                            "dataview";
                        const completionMeta = useDataviewFormat
                            ? `[completion:: ${completionDate}]`
                            : `✅ ${completionDate}`;
                        taskLine = this.insertDateAtCorrectPosition(taskLine, completionMeta, "completed");
                    }
                }
                // Add cancelled date if abandoning
                if (isAbandoning &&
                    ((_d = this.plugin.settings.autoDateManager) === null || _d === void 0 ? void 0 : _d.manageCancelledDate)) {
                    const hasCancelledMeta = /(\[cancelled::|❌)/.test(taskLine);
                    if (!hasCancelledMeta) {
                        const cancelledDate = moment().format("YYYY-MM-DD");
                        const useDataviewFormat = this.plugin.settings.preferMetadataFormat ===
                            "dataview";
                        const cancelledMeta = useDataviewFormat
                            ? `[cancelled:: ${cancelledDate}]`
                            : `❌ ${cancelledDate}`;
                        taskLine = this.insertDateAtCorrectPosition(taskLine, cancelledMeta, "cancelled");
                    }
                }
                // Add start date if starting
                if (isStarting &&
                    ((_e = this.plugin.settings.autoDateManager) === null || _e === void 0 ? void 0 : _e.manageStartDate)) {
                    const hasStartMeta = /(\[start::|🛫|🚀)/.test(taskLine);
                    if (!hasStartMeta) {
                        const startDate = moment().format("YYYY-MM-DD");
                        const useDataviewFormat = this.plugin.settings.preferMetadataFormat ===
                            "dataview";
                        const startMeta = useDataviewFormat
                            ? `[start:: ${startDate}]`
                            : `🛫 ${startDate}`;
                        taskLine = this.insertDateAtCorrectPosition(taskLine, startMeta, "start");
                    }
                }
                // Update content if changed (but prevent clearing content)
                if (args.updates.content !== undefined &&
                    args.updates.content !== "") {
                    // Extract the task prefix and metadata
                    const prefixMatch = taskLine.match(/^(\s*[-*+]\s*\[[^\]]*\]\s*)/);
                    if (prefixMatch) {
                        const prefix = prefixMatch[1];
                        // Preserve trailing metadata (strict: trailing-only, recognized keys; links/code sanitized)
                        const afterPrefix = taskLine.substring(prefix.length);
                        const sanitized2 = afterPrefix
                            .replace(/\[\[[^\]]*\]\]/g, (m) => "x".repeat(m.length))
                            .replace(/\[[^\]]*\]\([^\)]*\)/g, (m) => "x".repeat(m.length))
                            .replace(/`[^`]*`/g, (m) => "x".repeat(m.length));
                        const esc2 = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                        const projectKey2 = ((_f = this.plugin.settings.projectTagPrefix) === null || _f === void 0 ? void 0 : _f.dataview) ||
                            "project";
                        const contextKey2 = ((_g = this.plugin.settings.contextTagPrefix) === null || _g === void 0 ? void 0 : _g.dataview) ||
                            "context";
                        const dvKeysGroup2 = [
                            "tags",
                            esc2(projectKey2),
                            esc2(contextKey2),
                            "priority",
                            "repeat",
                            "start",
                            "scheduled",
                            "due",
                            "completion",
                            "cancelled",
                            "onCompletion",
                            "dependsOn",
                            "id",
                        ].join("|");
                        const baseEmoji2 = "(🔺|⏫|🔼|🔽|⏬|🛫|⏳|📅|✅|🔁)";
                        const dvFieldToken2 = `\\[(?:${dvKeysGroup2})\\s*::[^\\]]*\\]`;
                        const tagToken2 = EMOJI_TAG_REGEX.source;
                        const atToken2 = TOKEN_CONTEXT_REGEX.source;
                        const emojiSeg2 = `(?:${baseEmoji2}[^\\n]*)`;
                        const token2 = `(?:${emojiSeg2}|${dvFieldToken2}|${tagToken2}|${atToken2})`;
                        const trailing2 = new RegExp(`(?:\\s+${token2})+$`);
                        const tm2 = sanitized2.match(trailing2);
                        const trailingMeta = tm2
                            ? afterPrefix.slice(afterPrefix.length - (((_h = tm2[0]) === null || _h === void 0 ? void 0 : _h.length) || 0))
                            : "";
                        taskLine = `${prefix}${args.updates.content}${trailingMeta}`;
                    }
                }
                else if (args.updates.content === "") {
                    // Log warning if attempting to clear content
                    console.warn("[WriteAPI] Prevented clearing task content for task:", originalTask.id);
                }
                // Update metadata if changed
                if (args.updates.metadata) {
                    const md = args.updates.metadata || {};
                    const mdKeys = Object.keys(md);
                    const onlyCompletionDate = mdKeys.length > 0 &&
                        mdKeys.every((k) => k === "completedDate");
                    if (onlyCompletionDate) {
                        // Patch completion date in-place to avoid dropping other metadata
                        // Remove existing completion markers first
                        taskLine = taskLine
                            .replace(/\s*\[completion::\s*[^\]]+\]/i, "")
                            .replace(/\s*✅\s*\d{4}-\d{2}-\d{2}/, "");
                        if (md.completedDate) {
                            const dateStr = typeof md.completedDate === "number"
                                ? moment(md.completedDate).format("YYYY-MM-DD")
                                : String(md.completedDate);
                            const useDataviewFormat = this.plugin.settings.preferMetadataFormat ===
                                "dataview";
                            const completionMeta = useDataviewFormat
                                ? `[completion:: ${dateStr}]`
                                : `✅ ${dateStr}`;
                            taskLine = `${taskLine} ${completionMeta}`;
                        }
                    }
                    else {
                        // Only regenerate trailing metadata when updates include managed keys.
                        const managedKeys = new Set([
                            "tags",
                            "project",
                            "context",
                            "priority",
                            "repeat",
                            "startDate",
                            "dueDate",
                            "scheduledDate",
                            "recurrence",
                            "completedDate",
                            "onCompletion",
                            "dependsOn",
                            "id",
                        ]);
                        const hasManagedUpdate = mdKeys.some((k) => managedKeys.has(k));
                        if (!hasManagedUpdate) {
                            // Ignore unknown metadata-only updates to avoid stripping user content like [projt::new]
                            // and keep taskLine as-is.
                        }
                        else {
                            // Remove existing metadata and regenerate from merged values
                            // First, extract the checkbox prefix
                            const checkboxMatch = taskLine.match(/^(\s*[-*+]\s*\[[^\]]*\]\s*)/);
                            if (checkboxMatch) {
                                const checkboxPrefix = checkboxMatch[1];
                                const afterCheckbox = taskLine.substring(checkboxPrefix.length);
                                // Find where metadata starts (look for emoji markers or dataview fields)
                                // Updated pattern to avoid matching wiki links [[...]] or markdown links [text](url)
                                // To avoid false positives, sanitize out wiki links [[...]], markdown links [text](url), and inline code `...`
                                const sanitized = afterCheckbox
                                    // Use non-whitespace placeholders to prevent \s+ from consuming across links/code
                                    .replace(/\[\[[^\]]*\]\]/g, (m) => "x".repeat(m.length))
                                    .replace(/\[[^\]]*\]\([^\)]*\)/g, (m) => "x".repeat(m.length))
                                    .replace(/`[^`]*`/g, (m) => "x".repeat(m.length));
                                // Build trailing-metadata matcher. Recognize Dataview fields and
                                // tolerate spaces inside known tokens like #project/... and @context...
                                const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                                const dvProjectKey = ((_j = this.plugin.settings.projectTagPrefix) === null || _j === void 0 ? void 0 : _j.dataview) || "project";
                                const dvContextKey = ((_k = this.plugin.settings.contextTagPrefix) === null || _k === void 0 ? void 0 : _k.dataview) || "context";
                                const dvKeysGroup = [
                                    "tags",
                                    esc(dvProjectKey),
                                    esc(dvContextKey),
                                    "priority",
                                    "repeat",
                                    "start",
                                    "scheduled",
                                    "due",
                                    "completion",
                                    "cancelled",
                                    "onCompletion",
                                    "dependsOn",
                                    "id",
                                ].join("|");
                                const baseEmoji = "(🔺|⏫|🔼|🔽|⏬|🛫|⏳|📅|✅|🔁)";
                                const dvFieldToken = `\\[(?:${dvKeysGroup})\\s*::[^\\]]*\\]`;
                                // Tasks-format prefixes
                                const projectPrefixTasks = ((_l = this.plugin.settings.projectTagPrefix) === null || _l === void 0 ? void 0 : _l.tasks) ||
                                    "project";
                                const contextPrefixTasks = ((_m = this.plugin.settings.contextTagPrefix) === null || _m === void 0 ? void 0 : _m.tasks) ||
                                    "@";
                                // Allow spaces within project/context values when stripping trailing metadata
                                const projectWideToken = `#${esc(projectPrefixTasks)}/[^\\n\\r]*`;
                                const atWideToken = `${esc(contextPrefixTasks)}[^\\n\\r]*`;
                                const tagToken = EMOJI_TAG_REGEX.source;
                                const atToken = TOKEN_CONTEXT_REGEX.source;
                                const emojiSeg = `(?:${baseEmoji}[^\\n]*)`;
                                // Prefer the wide tokens first so we consume the full trailing segment
                                const token = `(?:${emojiSeg}|${dvFieldToken}|${projectWideToken}|${atWideToken}|${tagToken}|${atToken})`;
                                const trailing = new RegExp(`(?:\\s+${token})+$`);
                                const tm = sanitized.match(trailing);
                                // Extract the task content (everything before trailing metadata)
                                const taskContentRaw = tm
                                    ? afterCheckbox
                                        .substring(0, sanitized.length -
                                        (((_o = tm[0]) === null || _o === void 0 ? void 0 : _o.length) || 0))
                                        .trim()
                                    : afterCheckbox.trim();
                                // If we are regenerating managed metadata, scrub inline project tokens from content
                                let taskContent = taskContentRaw;
                                try {
                                    const dvProjectKeyInline = ((_p = this.plugin.settings.projectTagPrefix) === null || _p === void 0 ? void 0 : _p.dataview) || "project";
                                    const projectPrefixTasksInline = ((_q = this.plugin.settings.projectTagPrefix) === null || _q === void 0 ? void 0 : _q.tasks) || "project";
                                    // Remove Dataview-style inline project fields anywhere in content
                                    const dvProjectRe = new RegExp(`\\[\\s*${esc(dvProjectKeyInline)}\\s*::[^\\]]*\\]`, "gi");
                                    taskContent = taskContent
                                        .replace(dvProjectRe, "")
                                        .trim();
                                    // Remove tasks-style inline project tags like #project/xxx (stop at next whitespace)
                                    const projectInlineRe = new RegExp(`(^|\\s)#${esc(projectPrefixTasksInline)}/[^\\s#@+]+`, "g");
                                    taskContent = taskContent.replace(projectInlineRe, "$1");
                                    // Collapse extra spaces left by removals
                                    taskContent = taskContent
                                        .replace(/\s{2,}/g, " ")
                                        .trim();
                                }
                                catch (e) {
                                    // Best-effort cleanup; ignore regex issues
                                }
                                console.log("edit content", taskContent, afterCheckbox);
                                const mergedMd = Object.assign(Object.assign({}, originalTask.metadata), args.updates.metadata);
                                const completedFlag = args.updates.completed !== undefined
                                    ? !!args.updates.completed
                                    : !!originalTask.completed;
                                const newMetadata = this.generateMetadata({
                                    tags: mergedMd.tags,
                                    project: mergedMd.project,
                                    context: mergedMd.context,
                                    priority: mergedMd.priority,
                                    startDate: mergedMd.startDate,
                                    dueDate: mergedMd.dueDate,
                                    scheduledDate: mergedMd.scheduledDate,
                                    recurrence: mergedMd.recurrence,
                                    completed: completedFlag,
                                    completedDate: mergedMd.completedDate,
                                    onCompletion: mergedMd.onCompletion,
                                    dependsOn: mergedMd.dependsOn,
                                    id: mergedMd.id,
                                });
                                taskLine = `${checkboxPrefix}${taskContent}${newMetadata ? ` ${newMetadata}` : ""}`;
                            }
                        }
                    }
                }
                lines[originalTask.line] = taskLine;
                // Check if this is a completion of a recurring task
                const isCompletingRecurringTask = !originalTask.completed &&
                    args.updates.completed === true &&
                    ((_r = originalTask.metadata) === null || _r === void 0 ? void 0 : _r.recurrence);
                // If this is a completed recurring task, create a new task with updated dates
                if (isCompletingRecurringTask) {
                    try {
                        const indentMatch = taskLine.match(/^(\s*)/);
                        const indentation = indentMatch ? indentMatch[0] : "";
                        const newTaskLine = this.createRecurringTask(Object.assign(Object.assign(Object.assign({}, originalTask), args.updates), { metadata: Object.assign(Object.assign({}, originalTask.metadata), (args.updates.metadata || {})) }), indentation);
                        // Insert the new task line after the current task
                        lines.splice(originalTask.line + 1, 0, newTaskLine);
                        console.log(`Created new recurring task after line ${originalTask.line}`);
                    }
                    catch (error) {
                        console.error("Error creating recurring task:", error);
                    }
                }
                // Notify about write operation
                emit(this.app, Events.WRITE_OPERATION_START, {
                    path: file.path,
                    taskId: args.taskId,
                });
                yield this.vault.modify(file, lines.join("\n"));
                // Create the updated task object with the new content
                const updatedTaskObj = Object.assign(Object.assign(Object.assign({}, originalTask), args.updates), { metadata: Object.assign(Object.assign({}, originalTask.metadata), (args.updates.metadata || {})), originalMarkdown: taskLine });
                // Emit write operation complete
                emit(this.app, Events.WRITE_OPERATION_COMPLETE, {
                    path: file.path,
                    taskId: args.taskId,
                });
                // Trigger task-completed event if task was just completed
                if (args.updates.completed === true && !originalTask.completed) {
                    this.app.workspace.trigger("task-genius:task-completed", updatedTaskObj);
                }
                return { success: true, task: updatedTaskObj };
            }
            catch (error) {
                console.error("WriteAPI: Error updating task:", error);
                return { success: false, error: String(error) };
            }
        });
    }
    /**
     * Update a file-source task (modifies file itself, not task content)
     */
    updateFileSourceTask(originalTask, updates, taskId) {
        var _a, _b, _c, _d, _e, _f;
        return __awaiter(this, void 0, void 0, function* () {
            const file = this.vault.getAbstractFileByPath(originalTask.filePath);
            if (!file) {
                return { success: false, error: "File not found" };
            }
            // Announce start of write operation
            emit(this.app, Events.WRITE_OPERATION_START, {
                path: file.path,
                taskId,
            });
            // Will be updated if file is renamed
            let newFilePath = originalTask.filePath;
            // Handle content updates (i.e., renaming the file itself)
            if (updates.content !== undefined &&
                updates.content !== originalTask.content) {
                try {
                    // Get effective content field settings
                    const settings = ((_a = this.plugin.settings.fileSource) === null || _a === void 0 ? void 0 : _a.fileTaskProperties) || {};
                    const displayMode = settings.contentSource || "filename";
                    const preferFrontmatterTitle = settings.preferFrontmatterTitle;
                    const customContentField = settings.customContentField;
                    switch (displayMode) {
                        case "title": {
                            yield this.app.fileManager.processFrontMatter(file, (fm) => {
                                fm.title = updates.content;
                            });
                            console.log("[WriteAPI][FileSource] wrote fm.title (branch: title)", { title: updates.content });
                            const cacheAfter = this.app.metadataCache.getFileCache(file);
                            console.log("[WriteAPI][FileSource] cache fm.title after write (branch: title)", { title: (_b = cacheAfter === null || cacheAfter === void 0 ? void 0 : cacheAfter.frontmatter) === null || _b === void 0 ? void 0 : _b.title });
                            break;
                        }
                        case "h1": {
                            yield this.updateH1Heading(file, updates.content);
                            break;
                        }
                        case "custom": {
                            if (customContentField) {
                                yield this.app.fileManager.processFrontMatter(file, (fm) => {
                                    fm[customContentField] =
                                        updates.content;
                                });
                                console.log("[WriteAPI][FileSource] wrote fm[customContentField] (branch: custom)", {
                                    field: customContentField,
                                    value: updates.content,
                                });
                                const cacheAfter = this.app.metadataCache.getFileCache(file);
                                console.log("[WriteAPI][FileSource] cache fm[customContentField] after write (branch: custom)", {
                                    field: customContentField,
                                    value: (_c = cacheAfter === null || cacheAfter === void 0 ? void 0 : cacheAfter.frontmatter) === null || _c === void 0 ? void 0 : _c[customContentField],
                                });
                            }
                            else if (preferFrontmatterTitle) {
                                yield this.app.fileManager.processFrontMatter(file, (fm) => {
                                    fm.title = updates.content;
                                });
                                console.log("[WriteAPI][FileSource] wrote fm.title (branch: custom fallback)", { title: updates.content });
                                const cacheAfter2 = this.app.metadataCache.getFileCache(file);
                                console.log("[WriteAPI][FileSource] cache fm.title after write (branch: custom fallback)", { title: (_d = cacheAfter2 === null || cacheAfter2 === void 0 ? void 0 : cacheAfter2.frontmatter) === null || _d === void 0 ? void 0 : _d.title });
                            }
                            else {
                                newFilePath = yield this.renameFile(file, updates.content);
                                console.log("[WriteAPI][FileSource] renamed file (branch: custom fallback)", { newFilePath });
                            }
                            break;
                        }
                        case "filename":
                        default: {
                            if (preferFrontmatterTitle) {
                                yield this.app.fileManager.processFrontMatter(file, (fm) => {
                                    fm.title = updates.content;
                                });
                                console.log("[WriteAPI][FileSource] wrote fm.title (branch: filename/default)", { title: updates.content });
                                const cacheAfter = this.app.metadataCache.getFileCache(file);
                                console.log("[WriteAPI][FileSource] cache fm.title after write (branch: filename/default)", { title: (_e = cacheAfter === null || cacheAfter === void 0 ? void 0 : cacheAfter.frontmatter) === null || _e === void 0 ? void 0 : _e.title });
                            }
                            else {
                                newFilePath = yield this.renameFile(file, updates.content);
                                console.log("[WriteAPI][FileSource] renamed file (branch: filename/default)", { newFilePath });
                            }
                            break;
                        }
                    }
                    // Announce completion of write operation
                    emit(this.app, Events.WRITE_OPERATION_COMPLETE, {
                        path: newFilePath,
                        taskId,
                    });
                }
                catch (error) {
                    console.error("WriteAPI: Error updating file-source task content:", error);
                    return { success: false, error: String(error) };
                }
            }
            // Build the updated task object
            const updatedTaskObj = Object.assign(Object.assign(Object.assign({}, originalTask), updates), { filePath: newFilePath, 
                // Keep id in sync with FileSource convention when path changes
                id: originalTask.id.startsWith("file-source:") &&
                    newFilePath !== originalTask.filePath
                    ? `file-source:${newFilePath}`
                    : originalTask.id, originalMarkdown: `[${(_f = updates.content) !== null && _f !== void 0 ? _f : originalTask.content}](${newFilePath})` });
            // Emit file-task update so repository updates fileTasks map directly
            emit(this.app, Events.FILE_TASK_UPDATED, { task: updatedTaskObj });
            return { success: true, task: updatedTaskObj };
        });
    }
    updateH1Heading(file, newHeading) {
        return __awaiter(this, void 0, void 0, function* () {
            const content = yield this.vault.read(file);
            const lines = content.split("\n");
            // Find first H1 after optional frontmatter
            let h1Index = -1;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].startsWith("# ")) {
                    h1Index = i;
                    break;
                }
            }
            if (h1Index >= 0) {
                lines[h1Index] = `# ${newHeading}`;
            }
            else {
                let insertIndex = 0;
                if (content.startsWith("---")) {
                    const fmEnd = content.indexOf("\n---\n", 3);
                    if (fmEnd >= 0) {
                        const fmLines = content.substring(0, fmEnd + 5).split("\n").length - 1;
                        insertIndex = fmLines;
                    }
                }
                lines.splice(insertIndex, 0, `# ${newHeading}`, "");
            }
            yield this.vault.modify(file, lines.join("\n"));
        });
    }
    renameFile(file, newTitle) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentPath = file.path;
            const lastSlash = currentPath.lastIndexOf("/");
            const directory = lastSlash > 0 ? currentPath.substring(0, lastSlash) : "";
            const extension = currentPath.substring(currentPath.lastIndexOf("."));
            const sanitized = this.sanitizeFileName(newTitle);
            const newPath = directory
                ? `${directory}/${sanitized}${extension}`
                : `${sanitized}${extension}`;
            if (newPath !== currentPath) {
                yield this.vault.rename(file, newPath);
            }
            return newPath;
        });
    }
    sanitizeFileName(name) {
        return name.replace(/[<>:"/\\|?*]/g, "_");
    }
    /**
     * Create a new task
     */
    createTask(args) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let filePath = args.filePath;
                if (!filePath) {
                    const activeFile = this.app.workspace.getActiveFile();
                    if (activeFile) {
                        filePath = activeFile.path;
                    }
                    else {
                        return {
                            success: false,
                            error: "No filePath provided and no active file",
                        };
                    }
                }
                const file = this.vault.getAbstractFileByPath(filePath);
                if (!file) {
                    return { success: false, error: "File not found" };
                }
                const content = yield this.vault.read(file);
                // Build task content
                const checkboxState = args.completed ? "[x]" : "[ ]";
                let taskContent = `- ${checkboxState} ${args.content}`;
                const metadata = this.generateMetadata({
                    tags: args.tags,
                    project: args.project,
                    context: args.context,
                    priority: args.priority,
                    startDate: args.startDate
                        ? moment(args.startDate).valueOf()
                        : undefined,
                    dueDate: args.dueDate
                        ? moment(args.dueDate).valueOf()
                        : undefined,
                    completed: args.completed,
                    completedDate: args.completedDate
                        ? moment(args.completedDate).valueOf()
                        : undefined,
                });
                if (metadata) {
                    taskContent += ` ${metadata}`;
                }
                let newContent = content;
                if (args.parent) {
                    // Insert as subtask
                    newContent = this.insertSubtask(content, args.parent, taskContent);
                }
                else {
                    // Append to end of file
                    newContent = content
                        ? `${content}\n${taskContent}`
                        : taskContent;
                }
                // Notify about write operation
                emit(this.app, Events.WRITE_OPERATION_START, { path: file.path });
                yield this.vault.modify(file, newContent);
                emit(this.app, Events.WRITE_OPERATION_COMPLETE, {
                    path: file.path,
                });
                return { success: true };
            }
            catch (error) {
                console.error("WriteAPI: Error creating task:", error);
                return { success: false, error: String(error) };
            }
        });
    }
    /**
     * Delete a task and optionally its children
     */
    deleteTask(args) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const task = yield Promise.resolve(this.getTaskById(args.taskId));
                if (!task) {
                    return { success: false, error: "Task not found" };
                }
                // Check if this is a Canvas task
                if (CanvasTaskUpdater.isCanvasTask(task)) {
                    return this.deleteCanvasTask(args);
                }
                const file = this.vault.getAbstractFileByPath(task.filePath);
                if (!file) {
                    return { success: false, error: "File not found" };
                }
                const content = yield this.vault.read(file);
                const lines = content.split("\n");
                // Collect all tasks to delete
                const deletedTaskIds = [args.taskId];
                if (args.deleteChildren) {
                    // Get all descendant tasks
                    const descendantIds = yield this.getDescendantTaskIds(args.taskId);
                    deletedTaskIds.push(...descendantIds);
                }
                // Get all task line numbers to delete
                const linesToDelete = new Set();
                for (const taskId of deletedTaskIds) {
                    const task = yield Promise.resolve(this.getTaskById(taskId));
                    if (task && task.filePath === file.path) {
                        linesToDelete.add(task.line);
                    }
                }
                // Delete lines from bottom to top to maintain line numbers
                const sortedLines = Array.from(linesToDelete).sort((a, b) => b - a);
                for (const lineNum of sortedLines) {
                    lines.splice(lineNum, 1);
                }
                // Notify about write operation
                emit(this.app, Events.WRITE_OPERATION_START, {
                    path: file.path,
                    taskId: args.taskId,
                });
                yield this.vault.modify(file, lines.join("\n"));
                emit(this.app, Events.WRITE_OPERATION_COMPLETE, {
                    path: file.path,
                    taskId: args.taskId,
                });
                // Emit TASK_DELETED event with all deleted task IDs
                emit(this.app, Events.TASK_DELETED, {
                    taskId: args.taskId,
                    filePath: task.filePath,
                    deletedTaskIds,
                    mode: args.deleteChildren ? "subtree" : "single",
                });
                return { success: true };
            }
            catch (error) {
                console.error("WriteAPI: Error deleting task:", error);
                return { success: false, error: String(error) };
            }
        });
    }
    /**
     * Batch update text in multiple tasks
     */
    batchUpdateText(args) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let updatedCount = 0;
                const fileUpdates = new Map();
                // Group tasks by file
                for (const taskId of args.taskIds) {
                    const task = yield Promise.resolve(this.getTaskById(taskId));
                    if (!task)
                        continue;
                    // Skip Canvas tasks
                    if (CanvasTaskUpdater.isCanvasTask(task))
                        continue;
                    // Update the task content
                    const updatedContent = task.content.replace(args.findText, args.replaceText);
                    if (updatedContent !== task.content) {
                        if (!fileUpdates.has(task.filePath)) {
                            fileUpdates.set(task.filePath, new Map());
                        }
                        fileUpdates
                            .get(task.filePath)
                            .set(task.line, updatedContent);
                        updatedCount++;
                    }
                }
                // Apply updates to files
                for (const [filePath, lineUpdates] of fileUpdates) {
                    const file = this.vault.getAbstractFileByPath(filePath);
                    if (!file)
                        continue;
                    const content = yield this.vault.read(file);
                    const lines = content.split("\n");
                    for (const [lineNum, newContent] of lineUpdates) {
                        if (lineNum >= 0 && lineNum < lines.length) {
                            const taskLine = lines[lineNum];
                            const prefixMatch = taskLine.match(/^(\s*[-*+]\s*\[[^\]]*\]\s*)/);
                            if (prefixMatch) {
                                const prefix = prefixMatch[1];
                                // Preserve trailing metadata (strict trailing-only, recognized keys)
                                const afterPrefix2 = taskLine.substring(prefix.length);
                                const sanitized3 = afterPrefix2
                                    .replace(/\[\[[^\]]*\]\]/g, (m) => "x".repeat(m.length))
                                    .replace(/\[[^\]]*\]\([^\)]*\)/g, (m) => "x".repeat(m.length))
                                    .replace(/`[^`]*`/g, (m) => "x".repeat(m.length));
                                const esc3 = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                                const projectKey3 = ((_a = this.plugin.settings.projectTagPrefix) === null || _a === void 0 ? void 0 : _a.dataview) || "project";
                                const contextKey3 = ((_b = this.plugin.settings.contextTagPrefix) === null || _b === void 0 ? void 0 : _b.dataview) || "context";
                                const dvKeysGroup3 = [
                                    "tags",
                                    esc3(projectKey3),
                                    esc3(contextKey3),
                                    "priority",
                                    "repeat",
                                    "start",
                                    "scheduled",
                                    "due",
                                    "completion",
                                    "cancelled",
                                    "onCompletion",
                                    "dependsOn",
                                    "id",
                                ].join("|");
                                const baseEmoji3 = "(🔺|⏫|🔼|🔽|⏬|🛫|⏳|📅|✅|🔁)";
                                const dvFieldToken3 = `\\[(?:${dvKeysGroup3})\\s*::[^\\]]*\\]`;
                                const tagToken3 = EMOJI_TAG_REGEX.source;
                                const atToken3 = TOKEN_CONTEXT_REGEX.source;
                                const emojiSeg3 = `(?:${baseEmoji3}[^\\n]*)`;
                                const token3 = `(?:${emojiSeg3}|${dvFieldToken3}|${tagToken3}|${atToken3})`;
                                const trailing3 = new RegExp(`(?:\\s+${token3})+$`);
                                const tm3 = sanitized3.match(trailing3);
                                const trailingMeta2 = tm3
                                    ? afterPrefix2.slice(afterPrefix2.length -
                                        (((_c = tm3[0]) === null || _c === void 0 ? void 0 : _c.length) || 0))
                                    : "";
                                lines[lineNum] =
                                    `${prefix}${newContent}${trailingMeta2}`;
                            }
                        }
                    }
                    // Notify about write operation
                    emit(this.app, Events.WRITE_OPERATION_START, {
                        path: file.path,
                    });
                    yield this.vault.modify(file, lines.join("\n"));
                    emit(this.app, Events.WRITE_OPERATION_COMPLETE, {
                        path: file.path,
                    });
                }
                return { success: true, updatedCount };
            }
            catch (error) {
                console.error("WriteAPI: Error in batch update text:", error);
                return { success: false, updatedCount: 0, error: String(error) };
            }
        });
    }
    /**
     * Create multiple subtasks under a parent task
     */
    batchCreateSubtasks(args) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const parentTask = yield Promise.resolve(this.getTaskById(args.parentTaskId));
                if (!parentTask) {
                    return {
                        success: false,
                        createdCount: 0,
                        error: "Parent task not found",
                    };
                }
                // Check if this is a Canvas task
                if (CanvasTaskUpdater.isCanvasTask(parentTask)) {
                    // Handle Canvas subtasks differently if needed
                    return {
                        success: false,
                        createdCount: 0,
                        error: "Canvas task subtasks not supported yet",
                    };
                }
                const file = this.vault.getAbstractFileByPath(parentTask.filePath);
                if (!file) {
                    return {
                        success: false,
                        createdCount: 0,
                        error: "File not found",
                    };
                }
                const content = yield this.vault.read(file);
                const lines = content.split("\n");
                // Get the parent task's indentation
                const parentLine = lines[parentTask.line];
                const indentMatch = parentLine.match(/^(\s*)/);
                const parentIndent = indentMatch ? indentMatch[0] : "";
                const subtaskIndent = parentIndent + "\t";
                // Build subtask lines
                const subtaskLines = [];
                for (const subtask of args.subtasks) {
                    let subtaskContent = `${subtaskIndent}- [ ] ${subtask.content}`;
                    const metadata = this.generateMetadata({
                        priority: subtask.priority,
                        dueDate: subtask.dueDate
                            ? moment(subtask.dueDate).valueOf()
                            : undefined,
                    });
                    if (metadata) {
                        subtaskContent += ` ${metadata}`;
                    }
                    subtaskLines.push(subtaskContent);
                }
                // Find the insertion point (after parent task and its existing subtasks)
                let insertLine = parentTask.line + 1;
                const parentIndentLevel = parentIndent.length;
                while (insertLine < lines.length) {
                    const line = lines[insertLine];
                    const lineIndentMatch = line.match(/^(\s*)/);
                    const lineIndentLevel = lineIndentMatch
                        ? lineIndentMatch[0].length
                        : 0;
                    if (lineIndentLevel <= parentIndentLevel &&
                        line.trim() !== "") {
                        break;
                    }
                    insertLine++;
                }
                // Insert the subtasks
                lines.splice(insertLine, 0, ...subtaskLines);
                // Notify about write operation
                emit(this.app, Events.WRITE_OPERATION_START, {
                    path: file.path,
                    taskId: args.parentTaskId,
                });
                yield this.vault.modify(file, lines.join("\n"));
                emit(this.app, Events.WRITE_OPERATION_COMPLETE, {
                    path: file.path,
                    taskId: args.parentTaskId,
                });
                return { success: true, createdCount: subtaskLines.length };
            }
            catch (error) {
                console.error("WriteAPI: Error creating subtasks:", error);
                return { success: false, createdCount: 0, error: String(error) };
            }
        });
    }
    /**
     * Backward-compatible: batch update task status (wrapper)
     */
    batchUpdateTaskStatus(args) {
        return __awaiter(this, void 0, void 0, function* () {
            const updated = [];
            const failed = [];
            for (const taskId of args.taskIds) {
                const result = yield this.updateTaskStatus({
                    taskId,
                    status: args.status,
                    completed: args.completed,
                });
                if (result.success) {
                    updated.push(taskId);
                }
                else {
                    failed.push({
                        id: taskId,
                        error: result.error || "Unknown error",
                    });
                }
            }
            return { updated, failed };
        });
    }
    /**
     * Backward-compatible: postpone tasks to a new date (wrapper)
     */
    postponeTasks(args) {
        return __awaiter(this, void 0, void 0, function* () {
            const updated = [];
            const failed = [];
            const parseDateOrOffset = (input) => {
                const abs = Date.parse(input);
                if (!isNaN(abs))
                    return abs;
                const m = input.match(/^\+(\d+)([dwmy])$/i);
                if (!m)
                    return null;
                const n = parseInt(m[1], 10);
                const unit = m[2].toLowerCase();
                const base = new Date();
                switch (unit) {
                    case "d":
                        base.setDate(base.getDate() + n);
                        break;
                    case "w":
                        base.setDate(base.getDate() + n * 7);
                        break;
                    case "m":
                        base.setMonth(base.getMonth() + n);
                        break;
                    case "y":
                        base.setFullYear(base.getFullYear() + n);
                        break;
                }
                return base.getTime();
            };
            const newDateMs = parseDateOrOffset(args.newDate);
            if (newDateMs === null) {
                return {
                    updated: [],
                    failed: args.taskIds.map((id) => ({
                        id,
                        error: "Invalid date format",
                    })),
                };
            }
            for (const taskId of args.taskIds) {
                const result = yield this.updateTask({
                    taskId,
                    updates: { metadata: { dueDate: newDateMs } },
                });
                if (result.success) {
                    updated.push(taskId);
                }
                else {
                    failed.push({
                        id: taskId,
                        error: result.error || "Unknown error",
                    });
                }
            }
            return { updated, failed };
        });
    }
    /**
     * Get all descendant task IDs for a given task
     */
    getDescendantTaskIds(taskId) {
        return __awaiter(this, void 0, void 0, function* () {
            const descendants = [];
            const task = yield Promise.resolve(this.getTaskById(taskId));
            if (!task)
                return descendants;
            // This would need to be implemented based on your task hierarchy logic
            // For now, returning empty array as a placeholder
            return descendants;
        });
    }
    /**
     * Find a task line by ID in an array of lines
     */
    findTaskLineById(lines, taskId) {
        // This would need to match the task ID format used in your system
        // For now, returning null as a placeholder
        return null;
    }
    /**
     * Get the indentation level of a line
     */
    getIndent(line) {
        const match = line.match(/^(\s*)/);
        return match ? match[0] : "";
    }
    /**
     * Add a task to the daily note
     */
    addTaskToDailyNote(args) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get or create daily note
                let dailyNoteFile;
                const hasDailyNotesPlugin = appHasDailyNotesPluginLoaded();
                if (hasDailyNotesPlugin) {
                    // Use Daily Notes plugin
                    const dailyNotes = getAllDailyNotes();
                    const todayMoment = moment();
                    let todayNote = getDailyNote(todayMoment, dailyNotes);
                    if (!todayNote) {
                        todayNote = yield createDailyNote(todayMoment);
                    }
                    dailyNoteFile = todayNote;
                }
                else {
                    // Create our own daily note
                    const qc = this.plugin.settings.quickCapture;
                    let folder = ((_a = qc === null || qc === void 0 ? void 0 : qc.dailyNoteSettings) === null || _a === void 0 ? void 0 : _a.folder) || "";
                    const format = ((_b = qc === null || qc === void 0 ? void 0 : qc.dailyNoteSettings) === null || _b === void 0 ? void 0 : _b.format) || "YYYY-MM-DD";
                    if (!folder) {
                        try {
                            folder = getDailyNoteSettings().folder || "";
                        }
                        catch (_e) {
                            // Ignore
                        }
                    }
                    const dateStr = moment().format(format);
                    const path = folder
                        ? `${folder}/${dateStr}.md`
                        : `${dateStr}.md`;
                    // Ensure folders
                    const parts = path.split("/");
                    if (parts.length > 1) {
                        const dir = parts.slice(0, -1).join("/");
                        try {
                            yield this.vault.createFolder(dir);
                        }
                        catch (_f) {
                            // Ignore if exists
                        }
                    }
                    // Create file if not exists
                    let file = this.vault.getAbstractFileByPath(path);
                    if (!file) {
                        file = yield this.vault.create(path, "");
                    }
                    dailyNoteFile = file;
                }
                // Build task content
                const checkboxState = args.completed ? "[x]" : "[ ]";
                let taskContent = `- ${checkboxState} ${args.content}`;
                const metadata = this.generateMetadata({
                    tags: args.tags,
                    project: args.project,
                    context: args.context,
                    priority: args.priority,
                    startDate: args.startDate
                        ? moment(args.startDate).valueOf()
                        : undefined,
                    dueDate: args.dueDate
                        ? moment(args.dueDate).valueOf()
                        : undefined,
                    completed: args.completed,
                    completedDate: args.completedDate
                        ? moment(args.completedDate).valueOf()
                        : undefined,
                });
                if (metadata) {
                    taskContent += ` ${metadata}`;
                }
                // Append under optional heading
                const file = dailyNoteFile;
                const current = yield this.vault.read(file);
                let newContent = current;
                if (args.parent) {
                    newContent = this.insertSubtask(current, args.parent, taskContent);
                }
                else {
                    // Use heading from Quick Capture settings if available
                    const fallbackHeading = args.heading ||
                        ((_d = (_c = this.plugin.settings.quickCapture) === null || _c === void 0 ? void 0 : _c.targetHeading) === null || _d === void 0 ? void 0 : _d.trim());
                    if (fallbackHeading) {
                        const headingRegex = new RegExp(`^#{1,6}\\s+${fallbackHeading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m");
                        if (headingRegex.test(current)) {
                            newContent = current.replace(headingRegex, `$&\n\n${taskContent}`);
                        }
                        else {
                            newContent = `${current}${current.endsWith("\n") ? "" : "\n"}\n## ${fallbackHeading}\n\n${taskContent}`;
                        }
                    }
                    else {
                        newContent = current
                            ? `${current}\n${taskContent}`
                            : taskContent;
                    }
                }
                // Notify about write operation
                emit(this.app, Events.WRITE_OPERATION_START, { path: file.path });
                yield this.vault.modify(file, newContent);
                emit(this.app, Events.WRITE_OPERATION_COMPLETE, {
                    path: file.path,
                });
                return { success: true };
            }
            catch (error) {
                console.error("WriteAPI: Error creating task in daily note:", error);
                return { success: false, error: String(error) };
            }
        });
    }
    /**
     * Backward-compatible: create a task in daily note (wrapper)
     */
    createTaskInDailyNote(args) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.addTaskToDailyNote({
                content: args.content,
                parent: args.parent,
                tags: args.tags,
                project: args.project,
                context: args.context,
                priority: args.priority,
                startDate: args.startDate,
                dueDate: args.dueDate,
                heading: args.heading,
                completed: !!args.completed,
                completedDate: args.completedDate,
            });
        });
    }
    /**
     * Add a project task to quick capture
     */
    addProjectTaskToQuickCapture(args) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const qc = this.plugin.settings.quickCapture;
                if (!qc) {
                    throw new Error("Quick Capture settings not found");
                }
                // Build task line
                const checkboxState = args.completed ? "[x]" : "[ ]";
                let line = `- ${checkboxState} ${args.content}`;
                const metadata = this.generateMetadata({
                    tags: args.tags,
                    project: args.project,
                    context: args.context,
                    priority: args.priority,
                    startDate: args.startDate
                        ? moment(args.startDate).valueOf()
                        : undefined,
                    dueDate: args.dueDate
                        ? moment(args.dueDate).valueOf()
                        : undefined,
                    completed: args.completed,
                    completedDate: args.completedDate
                        ? moment(args.completedDate).valueOf()
                        : undefined,
                });
                if (metadata) {
                    line += ` ${metadata}`;
                }
                // Save to quick capture
                yield saveCapture(this.app, line, {
                    targetHeading: args.heading,
                    targetFile: (_a = this.plugin.settings.quickCapture) === null || _a === void 0 ? void 0 : _a.targetFile,
                    targetType: ((_b = this.plugin.settings.quickCapture) === null || _b === void 0 ? void 0 : _b.targetType) || "fixed",
                    appendToFile: "append",
                });
                const filePath = ((_c = this.plugin.settings.quickCapture) === null || _c === void 0 ? void 0 : _c.targetFile) ||
                    "quick-capture.md"; // Use the target file
                // Notify about write operation
                emit(this.app, Events.WRITE_OPERATION_START, { path: filePath });
                emit(this.app, Events.WRITE_OPERATION_COMPLETE, { path: filePath });
                return { filePath, success: true };
            }
            catch (error) {
                console.error("WriteAPI: Error adding project task to quick capture:", error);
                throw error;
            }
        });
    }
    // ===== Helper Methods =====
    /**
     * Generate metadata string based on format preference
     */
    generateMetadata(args) {
        var _a, _b, _c, _d, _e;
        const metadata = [];
        const useDataviewFormat = this.plugin.settings.preferMetadataFormat === "dataview";
        // Tags
        if ((_a = args.tags) === null || _a === void 0 ? void 0 : _a.length) {
            if (useDataviewFormat) {
                metadata.push(`[tags:: ${args.tags.join(", ")}]`);
            }
            else {
                // Ensure tags don't already have # prefix before adding one
                metadata.push(...args.tags.map((tag) => tag.startsWith("#") ? tag : `#${tag}`));
            }
        }
        // Project
        if (args.project) {
            if (useDataviewFormat) {
                const projectPrefix = ((_b = this.plugin.settings.projectTagPrefix) === null || _b === void 0 ? void 0 : _b.dataview) ||
                    "project";
                // Dataview 格式保留原始空格
                metadata.push(`[${projectPrefix}:: ${args.project}]`);
            }
            else {
                const projectPrefix = ((_c = this.plugin.settings.projectTagPrefix) === null || _c === void 0 ? void 0 : _c.tasks) || "project";
                // Tasks 格式：空格使用 "-" 连接
                const sanitizedProject = String(args.project)
                    .trim()
                    .replace(/\s+/g, "-");
                metadata.push(`#${projectPrefix}/${sanitizedProject}`);
            }
        }
        // Context
        if (args.context) {
            if (useDataviewFormat) {
                const contextPrefix = ((_d = this.plugin.settings.contextTagPrefix) === null || _d === void 0 ? void 0 : _d.dataview) ||
                    "context";
                // Dataview 格式保留原始空格
                metadata.push(`[${contextPrefix}:: ${args.context}]`);
            }
            else {
                const contextPrefix = ((_e = this.plugin.settings.contextTagPrefix) === null || _e === void 0 ? void 0 : _e.tasks) || "@";
                // Tasks 格式：空格使用 "-" 连接
                const sanitizedContext = String(args.context)
                    .trim()
                    .replace(/\s+/g, "-");
                metadata.push(`${contextPrefix}${sanitizedContext}`);
            }
        }
        // Priority
        // Only add priority if it's a valid number between 1-5
        if (typeof args.priority === "number" &&
            args.priority >= 1 &&
            args.priority <= 5) {
            if (useDataviewFormat) {
                let priorityValue;
                switch (args.priority) {
                    case 5:
                        priorityValue = "highest";
                        break;
                    case 4:
                        priorityValue = "high";
                        break;
                    case 3:
                        priorityValue = "medium";
                        break;
                    case 2:
                        priorityValue = "low";
                        break;
                    case 1:
                        priorityValue = "lowest";
                        break;
                    default:
                        priorityValue = String(args.priority);
                }
                metadata.push(`[priority:: ${priorityValue}]`);
            }
            else {
                let priorityMarker = "";
                switch (args.priority) {
                    case 5:
                        priorityMarker = "🔺";
                        break;
                    case 4:
                        priorityMarker = "⏫";
                        break;
                    case 3:
                        priorityMarker = "🔼";
                        break;
                    case 2:
                        priorityMarker = "🔽";
                        break;
                    case 1:
                        priorityMarker = "⏬";
                        break;
                }
                if (priorityMarker)
                    metadata.push(priorityMarker);
            }
        }
        // Recurrence
        if (args.recurrence) {
            metadata.push(useDataviewFormat
                ? `[repeat:: ${args.recurrence}]`
                : `🔁 ${args.recurrence}`);
        }
        // Start Date
        if (args.startDate) {
            const dateStr = moment(args.startDate).format("YYYY-MM-DD");
            metadata.push(useDataviewFormat ? `[start:: ${dateStr}]` : `🛫 ${dateStr}`);
        }
        // Scheduled Date
        if (args.scheduledDate) {
            const dateStr = moment(args.scheduledDate).format("YYYY-MM-DD");
            metadata.push(useDataviewFormat
                ? `[scheduled:: ${dateStr}]`
                : `⏳ ${dateStr}`);
        }
        // Due Date
        if (args.dueDate) {
            const dateStr = moment(args.dueDate).format("YYYY-MM-DD");
            metadata.push(useDataviewFormat ? `[due:: ${dateStr}]` : `📅 ${dateStr}`);
        }
        // Completion Date
        if (args.completed && args.completedDate) {
            const dateStr = moment(args.completedDate).format("YYYY-MM-DD");
            metadata.push(useDataviewFormat
                ? `[completion:: ${dateStr}]`
                : `✅ ${dateStr}`);
        }
        // On Completion action
        if (args.onCompletion) {
            metadata.push(useDataviewFormat
                ? `[onCompletion:: ${args.onCompletion}]`
                : `🏁 ${args.onCompletion}`);
        }
        // Depends On
        if (args.dependsOn &&
            (Array.isArray(args.dependsOn) ? args.dependsOn.length > 0 : true)) {
            const dependsStr = Array.isArray(args.dependsOn)
                ? args.dependsOn.join(", ")
                : args.dependsOn;
            metadata.push(useDataviewFormat
                ? `[dependsOn:: ${dependsStr}]`
                : `⛔ ${dependsStr}`);
        }
        // ID
        if (args.id) {
            metadata.push(useDataviewFormat ? `[id:: ${args.id}]` : `🆔 ${args.id}`);
        }
        return metadata.join(" ");
    }
    /**
     * Insert a subtask under a parent task
     */
    insertSubtask(content, parentTaskId, subtaskContent) {
        const lines = content.split("\n");
        const parentTask = this.findTaskLineById(lines, parentTaskId);
        if (parentTask) {
            const indent = this.getIndent(lines[parentTask.line]);
            const subtaskIndent = indent + "\t";
            const subtaskLine = `${subtaskIndent}${subtaskContent}`;
            // Find where to insert the subtask
            let insertLine = parentTask.line + 1;
            const parentIndentLevel = indent.length;
            // Find the end of existing subtasks
            while (insertLine < lines.length) {
                const line = lines[insertLine];
                const lineIndent = this.getIndent(line);
                if (lineIndent.length <= parentIndentLevel &&
                    line.trim() !== "") {
                    break;
                }
                insertLine++;
            }
            lines.splice(insertLine, 0, subtaskLine);
            return lines.join("\n");
        }
        // If parent not found, append to end
        return content ? `${content}\n${subtaskContent}` : subtaskContent;
    }
    /**
     * Simple recurrence pattern parser
     */
    parseSimpleRecurrence(pattern) {
        const match = pattern.match(/(\d+)\s*([dwmy])/i);
        if (match) {
            return {
                interval: parseInt(match[1]),
                unit: match[2].toLowerCase(),
            };
        }
        // Try parsing "every X days/weeks/months/years"
        const everyMatch = pattern.match(/every\s+(\d+)?\s*(day|week|month|year)s?/i);
        if (everyMatch) {
            return {
                interval: everyMatch[1] ? parseInt(everyMatch[1]) : 1,
                unit: everyMatch[2].toLowerCase().charAt(0),
            };
        }
        // Default to daily
        return { interval: 1, unit: "d" };
    }
    /**
     * Add interval to date based on unit
     */
    addInterval(base, interval, unit) {
        const n = interval;
        switch (unit) {
            case "d":
                base.setDate(base.getDate() + n);
                break;
            case "w":
                base.setDate(base.getDate() + n * 7);
                break;
            case "m":
                base.setMonth(base.getMonth() + n);
                break;
            case "y":
                base.setFullYear(base.getFullYear() + n);
                break;
        }
        // Normalize to local midnight
        base.setHours(0, 0, 0, 0);
        return base.getTime();
    }
    // ===== Canvas Task Methods =====
    /**
     * Update a Canvas task
     */
    updateCanvasTask(args) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const originalTask = yield Promise.resolve(this.getTaskById(args.taskId));
                if (!originalTask) {
                    return { success: false, error: "Task not found" };
                }
                // Ensure it's a Canvas task
                if (!CanvasTaskUpdater.isCanvasTask(originalTask)) {
                    return { success: false, error: "Task is not a Canvas task" };
                }
                // Create updated task object (deep-merge metadata to preserve unchanged fields)
                const updatedTask = Object.assign(Object.assign(Object.assign({}, originalTask), args.updates), { metadata: Object.assign(Object.assign({}, originalTask.metadata), args.updates.metadata) });
                // Use CanvasTaskUpdater to update the task
                const result = yield this.canvasTaskUpdater.updateCanvasTask(originalTask, updatedTask);
                if (result.success) {
                    // Emit task updated event for dataflow
                    emit(this.app, Events.TASK_UPDATED, { task: updatedTask });
                    // Trigger task-completed event if task was just completed
                    if (args.updates.completed === true &&
                        !originalTask.completed) {
                        this.app.workspace.trigger("task-genius:task-completed", updatedTask);
                    }
                    return { success: true, task: updatedTask };
                }
                else {
                    return { success: false, error: result.error };
                }
            }
            catch (error) {
                console.error("WriteAPI: Error updating Canvas task:", error);
                return { success: false, error: String(error) };
            }
        });
    }
    /**
     * Delete a Canvas task
     */
    deleteCanvasTask(args) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const task = yield Promise.resolve(this.getTaskById(args.taskId));
                if (!task) {
                    return { success: false, error: "Task not found" };
                }
                // Ensure it's a Canvas task
                if (!CanvasTaskUpdater.isCanvasTask(task)) {
                    return { success: false, error: "Task is not a Canvas task" };
                }
                // Collect all tasks to delete
                const deletedTaskIds = [args.taskId];
                if (args.deleteChildren) {
                    // Get all descendant tasks
                    const descendantIds = yield this.getDescendantTaskIds(args.taskId);
                    deletedTaskIds.push(...descendantIds);
                }
                // Use CanvasTaskUpdater to delete the task(s)
                const result = yield this.canvasTaskUpdater.deleteCanvasTask(task, args.deleteChildren);
                if (result.success) {
                    // Emit TASK_DELETED event with all deleted task IDs
                    emit(this.app, Events.TASK_DELETED, {
                        taskId: args.taskId,
                        filePath: task.filePath,
                        deletedTaskIds,
                        mode: args.deleteChildren ? "subtree" : "single",
                    });
                }
                return result;
            }
            catch (error) {
                console.error("WriteAPI: Error deleting Canvas task:", error);
                return { success: false, error: String(error) };
            }
        });
    }
    /**
     * Move a Canvas task to another location
     */
    moveCanvasTask(args) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const task = yield Promise.resolve(this.getTaskById(args.taskId));
                if (!task) {
                    return { success: false, error: "Task not found" };
                }
                // Ensure it's a Canvas task
                if (!CanvasTaskUpdater.isCanvasTask(task)) {
                    return { success: false, error: "Task is not a Canvas task" };
                }
                // Use CanvasTaskUpdater to move the task
                const result = yield this.canvasTaskUpdater.moveCanvasTask(task, args.targetFilePath, args.targetNodeId, args.targetSection);
                return result;
            }
            catch (error) {
                console.error("WriteAPI: Error moving Canvas task:", error);
                return { success: false, error: String(error) };
            }
        });
    }
    /**
     * Duplicate a Canvas task
     */
    duplicateCanvasTask(args) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const task = yield Promise.resolve(this.getTaskById(args.taskId));
                if (!task) {
                    return { success: false, error: "Task not found" };
                }
                // Ensure it's a Canvas task
                if (!CanvasTaskUpdater.isCanvasTask(task)) {
                    return { success: false, error: "Task is not a Canvas task" };
                }
                // Use CanvasTaskUpdater to duplicate the task
                const result = yield this.canvasTaskUpdater.duplicateCanvasTask(task, args.targetFilePath, args.targetNodeId, args.targetSection, args.preserveMetadata);
                return result;
            }
            catch (error) {
                console.error("WriteAPI: Error duplicating Canvas task:", error);
                return { success: false, error: String(error) };
            }
        });
    }
    /**
     * Add a new task to a Canvas node
     */
    addTaskToCanvasNode(args) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Format task content with checkbox
                const checkboxState = args.completed ? "[x]" : "[ ]";
                let taskContent = `- ${checkboxState} ${args.content}`;
                // Add metadata if provided
                if (args.metadata) {
                    const metadataStr = this.generateMetadata(args.metadata);
                    if (metadataStr) {
                        taskContent += ` ${metadataStr}`;
                    }
                }
                // Use CanvasTaskUpdater to add the task
                const result = yield this.canvasTaskUpdater.addTaskToCanvasNode(args.filePath, taskContent, args.targetNodeId, args.targetSection);
                return result;
            }
            catch (error) {
                console.error("WriteAPI: Error adding task to Canvas node:", error);
                return { success: false, error: String(error) };
            }
        });
    }
    /**
     * Check if a task is a Canvas task
     */
    isCanvasTask(task) {
        return CanvasTaskUpdater.isCanvasTask(task);
    }
    /**
     * Insert date metadata at the correct position in the task line
     */
    insertDateAtCorrectPosition(taskLine, dateMetadata, dateType) {
        var _a, _b, _c;
        // Check for block reference at the end
        const blockRefPattern = /\s*(\^[a-zA-Z0-9-]+)$/;
        const blockRefMatch = taskLine.match(blockRefPattern);
        if (blockRefMatch && blockRefMatch.index !== undefined) {
            // Insert before block reference
            const insertPos = blockRefMatch.index;
            return (taskLine.slice(0, insertPos) +
                " " +
                dateMetadata +
                taskLine.slice(insertPos));
        }
        // For completion date, add at the very end
        if (dateType === "completed") {
            return taskLine + " " + dateMetadata;
        }
        // For cancelled and start dates, insert after task content but before other metadata
        // Find where metadata starts (tags, dates, etc)
        // Detect strict trailing metadata (recognized keys) on full line
        const sanitizedFull = taskLine
            .replace(/\[\[[^\]]*\]\]/g, (m) => "x".repeat(m.length))
            .replace(/\[[^\]]*\]\([^\)]*\)/g, (m) => "x".repeat(m.length))
            .replace(/`[^`]*`/g, (m) => "x".repeat(m.length));
        const escD = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const projectKeyD = ((_a = this.plugin.settings.projectTagPrefix) === null || _a === void 0 ? void 0 : _a.dataview) || "project";
        const contextKeyD = ((_b = this.plugin.settings.contextTagPrefix) === null || _b === void 0 ? void 0 : _b.dataview) || "context";
        const dvKeysGroupD = [
            "tags",
            escD(projectKeyD),
            escD(contextKeyD),
            "priority",
            "repeat",
            "start",
            "scheduled",
            "due",
            "completion",
            "cancelled",
            "onCompletion",
            "dependsOn",
            "id",
        ].join("|");
        const baseEmojiD = "(🔺|⏫|🔼|🔽|⏬|🛫|⏳|📅|✅|🔁)";
        const dvFieldTokenD = `\\[(?:${dvKeysGroupD})\\s*::[^\\]]*\\]`;
        const tagTokenD = "#[A-Za-z][\\w/-]*";
        const atTokenD = "@[A-Za-z][\\w/-]*";
        const plusTokenD = "\\+[A-Za-z][\\w/-]*";
        const emojiSegD = `(?:${baseEmojiD}[^\\n]*)`;
        const tokenD = `(?:${emojiSegD}|${dvFieldTokenD}|${tagTokenD}|${atTokenD}|${plusTokenD})`;
        const trailingD = new RegExp(`(?:\\s+${tokenD})+$`);
        const tmD = sanitizedFull.match(trailingD);
        if (tmD) {
            const insertPos = taskLine.length - (((_c = tmD[0]) === null || _c === void 0 ? void 0 : _c.length) || 0);
            return (taskLine.slice(0, insertPos) +
                " " +
                dateMetadata +
                taskLine.slice(insertPos));
        }
        // No metadata found, add at the end
        return taskLine + " " + dateMetadata;
    }
    /**
     * Creates a new recurring task line from a completed task
     */
    createRecurringTask(completedTask, indentation) {
        // Calculate the next due date based on the recurrence pattern
        const nextDate = this.calculateNextDueDate(completedTask);
        // Create a new task with the same content but updated dates
        const newTask = Object.assign({}, completedTask);
        // Reset completion status and date
        newTask.completed = false;
        newTask.metadata.completedDate = undefined;
        // Determine where to apply the next date based on what the original task had
        if (completedTask.metadata.dueDate) {
            // If original task had due date, update due date
            newTask.metadata.dueDate = nextDate;
        }
        else if (completedTask.metadata.scheduledDate) {
            // If original task only had scheduled date, update scheduled date
            newTask.metadata.scheduledDate = nextDate;
            newTask.metadata.dueDate = undefined; // Make sure due date is not set
        }
        else {
            newTask.metadata.dueDate = nextDate;
        }
        // Extract the original list marker (-, *, 1., etc.) from the original markdown
        let listMarker = "- ";
        if (completedTask.originalMarkdown) {
            // Match the list marker pattern: could be "- ", "* ", "1. ", etc.
            const listMarkerMatch = completedTask.originalMarkdown.match(/^(\s*)([*\-+]|\d+\.)\s+\[/);
            if (listMarkerMatch && listMarkerMatch[2]) {
                listMarker = listMarkerMatch[2] + " ";
                // If it's a numbered list, increment the number
                if (/^\d+\.$/.test(listMarkerMatch[2])) {
                    const numberStr = listMarkerMatch[2].replace(/\.$/, "");
                    const number = parseInt(numberStr);
                    listMarker = number + 1 + ". ";
                }
            }
        }
        // Start with the basic task using the extracted list marker and clean content
        let newTaskLine = `${indentation}${listMarker}[ ] ${completedTask.content}`;
        // Generate metadata for the new task
        const metadata = this.generateMetadata({
            tags: newTask.metadata.tags,
            project: newTask.metadata.project,
            context: newTask.metadata.context,
            priority: newTask.metadata.priority,
            startDate: newTask.metadata.startDate,
            dueDate: newTask.metadata.dueDate,
            scheduledDate: newTask.metadata.scheduledDate,
            recurrence: newTask.metadata.recurrence,
            onCompletion: newTask.metadata.onCompletion,
            dependsOn: newTask.metadata.dependsOn,
            id: newTask.metadata.id,
        });
        if (metadata) {
            newTaskLine += ` ${metadata}`;
        }
        return newTaskLine;
    }
    /**
     * Calculates the next due date for a recurring task
     * Fixed to properly handle weekly and monthly recurrence
     */
    calculateNextDueDate(task) {
        var _a;
        if (!((_a = task.metadata) === null || _a === void 0 ? void 0 : _a.recurrence))
            return undefined;
        // Determine base date based on user settings
        let baseDate;
        const recurrenceDateBase = this.plugin.settings.recurrenceDateBase || "due";
        if (recurrenceDateBase === "current") {
            // Always use current date
            baseDate = new Date();
        }
        else if (recurrenceDateBase === "scheduled" &&
            task.metadata.scheduledDate) {
            // Use scheduled date if available
            baseDate = new Date(task.metadata.scheduledDate);
        }
        else if (recurrenceDateBase === "due" && task.metadata.dueDate) {
            // Use due date if available (default behavior)
            baseDate = new Date(task.metadata.dueDate);
        }
        else {
            // Fallback to current date if the specified date type is not available
            baseDate = new Date();
        }
        // Ensure baseDate is at the beginning of the day for date-based recurrence
        baseDate.setHours(0, 0, 0, 0);
        try {
            // Try parsing with rrule first
            try {
                const rule = rrulestr(task.metadata.recurrence, {
                    dtstart: baseDate,
                });
                // Get current date for comparison
                const now = new Date();
                const todayStart = new Date(now);
                todayStart.setHours(0, 0, 0, 0);
                // We want the first occurrence strictly after today (not just after baseDate)
                // This ensures the next task is always in the future
                const afterDate = new Date(Math.max(baseDate.getTime(), todayStart.getTime()) + 1000); // 1 second after the later of baseDate or today
                const nextOccurrence = rule.after(afterDate);
                if (nextOccurrence) {
                    // Set time to start of day
                    nextOccurrence.setHours(0, 0, 0, 0);
                    // Ensure it's in the future
                    if (nextOccurrence.getTime() > todayStart.getTime()) {
                        // Convert to UTC noon timestamp for consistent storage
                        const year = nextOccurrence.getFullYear();
                        const month = nextOccurrence.getMonth();
                        const day = nextOccurrence.getDate();
                        return Date.UTC(year, month, day, 12, 0, 0);
                    }
                    // If somehow still not in future, try getting the next occurrence
                    const futureOccurrence = rule.after(new Date(todayStart.getTime() + 86400000)); // Tomorrow
                    if (futureOccurrence) {
                        futureOccurrence.setHours(0, 0, 0, 0);
                        // Convert to UTC noon timestamp
                        const year = futureOccurrence.getFullYear();
                        const month = futureOccurrence.getMonth();
                        const day = futureOccurrence.getDate();
                        return Date.UTC(year, month, day, 12, 0, 0);
                    }
                }
            }
            catch (e) {
                // rrulestr failed, fall back to simple parsing
                console.log(`Failed to parse recurrence '${task.metadata.recurrence}' with rrule. Falling back to simple logic.`);
            }
            // --- Fallback Simple Parsing Logic ---
            const recurrence = task.metadata.recurrence.trim().toLowerCase();
            const now = new Date();
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);
            // Parse "every X days/weeks/months/years" format
            if (recurrence.startsWith("every")) {
                const parts = recurrence.split(" ");
                if (parts.length >= 2) {
                    let interval = 1;
                    let unit = parts[1];
                    if (parts.length >= 3 && !isNaN(parseInt(parts[1]))) {
                        interval = parseInt(parts[1]);
                        unit = parts[2];
                    }
                    if (unit.endsWith("s")) {
                        unit = unit.substring(0, unit.length - 1);
                    }
                    // Start from base date
                    let nextDate = new Date(baseDate);
                    // Keep advancing the date until it's in the future
                    while (nextDate.getTime() <= todayStart.getTime()) {
                        switch (unit) {
                            case "day":
                                nextDate.setDate(nextDate.getDate() + interval);
                                break;
                            case "week":
                                nextDate.setDate(nextDate.getDate() + interval * 7);
                                break;
                            case "month":
                                // Save the original day of month for proper month rolling
                                const originalDay = baseDate.getDate();
                                nextDate.setMonth(nextDate.getMonth() + interval);
                                // If day has changed (e.g., Jan 31 -> Feb 28), adjust back
                                if (nextDate.getDate() !== originalDay) {
                                    nextDate.setDate(0); // Go to last day of previous month
                                }
                                break;
                            case "year":
                                nextDate.setFullYear(nextDate.getFullYear() + interval);
                                break;
                            default:
                                // Default to days if unit is not recognized
                                nextDate.setDate(nextDate.getDate() + interval);
                                break;
                        }
                    }
                    // Normalize to midnight
                    nextDate.setHours(0, 0, 0, 0);
                    // Convert to UTC noon timestamp for consistent storage
                    const year = nextDate.getFullYear();
                    const month = nextDate.getMonth();
                    const day = nextDate.getDate();
                    return Date.UTC(year, month, day, 12, 0, 0);
                }
            }
            // Handle simple pattern like "1d", "1w", "1m", "1y"
            const simpleMatch = recurrence.match(/^(\d+)([dwmy])$/);
            if (simpleMatch) {
                const interval = parseInt(simpleMatch[1]);
                const unit = simpleMatch[2];
                let nextDate = new Date(baseDate);
                // Keep advancing the date until it's in the future
                while (nextDate.getTime() <= todayStart.getTime()) {
                    switch (unit) {
                        case "d":
                            nextDate.setDate(nextDate.getDate() + interval);
                            break;
                        case "w":
                            nextDate.setDate(nextDate.getDate() + interval * 7);
                            break;
                        case "m":
                            const originalDay = baseDate.getDate();
                            nextDate.setMonth(nextDate.getMonth() + interval);
                            // Handle month-end edge cases
                            if (nextDate.getDate() !== originalDay) {
                                nextDate.setDate(0);
                            }
                            break;
                        case "y":
                            nextDate.setFullYear(nextDate.getFullYear() + interval);
                            break;
                    }
                }
                // Normalize to midnight
                nextDate.setHours(0, 0, 0, 0);
                // Convert to UTC noon timestamp
                const year = nextDate.getFullYear();
                const month = nextDate.getMonth();
                const day = nextDate.getDate();
                return Date.UTC(year, month, day, 12, 0, 0);
            }
            // If we can't parse it, return tomorrow as default
            const tomorrow = new Date(todayStart);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const year = tomorrow.getFullYear();
            const month = tomorrow.getMonth();
            const day = tomorrow.getDate();
            return Date.UTC(year, month, day, 12, 0, 0);
        }
        catch (error) {
            console.error("Error calculating next due date:", error);
            // Return tomorrow as fallback
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            const year = tomorrow.getFullYear();
            const month = tomorrow.getMonth();
            const day = tomorrow.getDate();
            return Date.UTC(year, month, day, 12, 0, 0);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV3JpdGVBUEkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJXcml0ZUFQSS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7O0FBRUgsT0FBTyxFQUFvQyxNQUFNLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFHcEUsT0FBTyxFQUNOLGVBQWUsRUFDZixnQkFBZ0IsRUFDaEIsWUFBWSxFQUNaLDRCQUE0QixFQUM1QixvQkFBb0IsR0FDcEIsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN4QyxPQUFPLEVBQ04sV0FBVyxHQUVYLE1BQU0sOEJBQThCLENBQUM7QUFDdEMsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNoRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sT0FBTyxDQUFDO0FBQ2pDLE9BQU8sRUFBRSxlQUFlLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQXdEN0UsTUFBTSxPQUFPLFFBQVE7SUFHcEIsWUFDUyxHQUFRLEVBQ1IsS0FBWSxFQUNaLGFBQTRCLEVBQzVCLE1BQTZCLEVBQzdCLFdBQStEO1FBSi9ELFFBQUcsR0FBSCxHQUFHLENBQUs7UUFDUixVQUFLLEdBQUwsS0FBSyxDQUFPO1FBQ1osa0JBQWEsR0FBYixhQUFhLENBQWU7UUFDNUIsV0FBTSxHQUFOLE1BQU0sQ0FBdUI7UUFDN0IsZ0JBQVcsR0FBWCxXQUFXLENBQW9EO1FBRXZFLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLGlCQUFpQixDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMvRCxDQUFDO0lBRUQ7O09BRUc7SUFDRyxnQkFBZ0IsQ0FBQyxJQUl0Qjs7O1lBQ0EsSUFBSTtnQkFDSCxNQUFNLElBQUksR0FBRyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENB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dXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBXcml0ZUFQSSAtIEhhbmRsZXMgYWxsIHdyaXRlIG9wZXJhdGlvbnMgaW4gdGhlIERhdGFmbG93IGFyY2hpdGVjdHVyZVxyXG4gKlxyXG4gKiBUaGlzIEFQSSBwcm92aWRlcyBtZXRob2RzIGZvciBjcmVhdGluZywgdXBkYXRpbmcsIGFuZCBkZWxldGluZyB0YXNrc1xyXG4gKiBieSBkaXJlY3RseSBtb2RpZnlpbmcgdmF1bHQgZmlsZXMuIENoYW5nZXMgdHJpZ2dlciBPYnNpZGlhblNvdXJjZSBldmVudHNcclxuICogd2hpY2ggYXV0b21hdGljYWxseSB1cGRhdGUgdGhlIGluZGV4IHRocm91Z2ggdGhlIE9yY2hlc3RyYXRvci5cclxuICovXHJcblxyXG5pbXBvcnQgeyBBcHAsIFRGaWxlLCBWYXVsdCwgTWV0YWRhdGFDYWNoZSwgbW9tZW50IH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFRhc2ssIENhbnZhc1Rhc2tNZXRhZGF0YSB9IGZyb20gXCJAL3R5cGVzL3Rhc2tcIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5pbXBvcnQge1xyXG5cdGNyZWF0ZURhaWx5Tm90ZSxcclxuXHRnZXRBbGxEYWlseU5vdGVzLFxyXG5cdGdldERhaWx5Tm90ZSxcclxuXHRhcHBIYXNEYWlseU5vdGVzUGx1Z2luTG9hZGVkLFxyXG5cdGdldERhaWx5Tm90ZVNldHRpbmdzLFxyXG59IGZyb20gXCJvYnNpZGlhbi1kYWlseS1ub3Rlcy1pbnRlcmZhY2VcIjtcclxuaW1wb3J0IHtcclxuXHRzYXZlQ2FwdHVyZSxcclxuXHRwcm9jZXNzRGF0ZVRlbXBsYXRlcyxcclxufSBmcm9tIFwiQC91dGlscy9maWxlL2ZpbGUtb3BlcmF0aW9uc1wiO1xyXG5pbXBvcnQgeyBFdmVudHMsIGVtaXQgfSBmcm9tIFwiLi4vZXZlbnRzL0V2ZW50c1wiO1xyXG5pbXBvcnQgeyBDYW52YXNUYXNrVXBkYXRlciB9IGZyb20gXCJAL3BhcnNlcnMvY2FudmFzLXRhc2stdXBkYXRlclwiO1xyXG5pbXBvcnQgeyBycnVsZXN0ciB9IGZyb20gXCJycnVsZVwiO1xyXG5pbXBvcnQgeyBFTU9KSV9UQUdfUkVHRVgsIFRPS0VOX0NPTlRFWFRfUkVHRVggfSBmcm9tIFwiQC9jb21tb24vcmVnZXgtZGVmaW5lXCI7XHJcblxyXG4vKipcclxuICogQXJndW1lbnRzIGZvciBjcmVhdGluZyBhIHRhc2tcclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ3JlYXRlVGFza0FyZ3Mge1xyXG5cdGNvbnRlbnQ6IHN0cmluZztcclxuXHRmaWxlUGF0aD86IHN0cmluZztcclxuXHRwYXJlbnQ/OiBzdHJpbmc7XHJcblx0dGFncz86IHN0cmluZ1tdO1xyXG5cdHByb2plY3Q/OiBzdHJpbmc7XHJcblx0Y29udGV4dD86IHN0cmluZztcclxuXHRwcmlvcml0eT86IG51bWJlcjtcclxuXHRzdGFydERhdGU/OiBzdHJpbmc7XHJcblx0ZHVlRGF0ZT86IHN0cmluZztcclxuXHRjb21wbGV0ZWQ/OiBib29sZWFuO1xyXG5cdGNvbXBsZXRlZERhdGU/OiBzdHJpbmc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBcmd1bWVudHMgZm9yIHVwZGF0aW5nIGEgdGFza1xyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBVcGRhdGVUYXNrQXJncyB7XHJcblx0dGFza0lkOiBzdHJpbmc7XHJcblx0dXBkYXRlczogUGFydGlhbDxUYXNrPjtcclxufVxyXG5cclxuLyoqXHJcbiAqIEFyZ3VtZW50cyBmb3IgZGVsZXRpbmcgYSB0YXNrXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIERlbGV0ZVRhc2tBcmdzIHtcclxuXHR0YXNrSWQ6IHN0cmluZztcclxuXHRkZWxldGVDaGlsZHJlbj86IGJvb2xlYW47XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBcmd1bWVudHMgZm9yIGJhdGNoIHRleHQgdXBkYXRlXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIEJhdGNoVXBkYXRlVGV4dEFyZ3Mge1xyXG5cdHRhc2tJZHM6IHN0cmluZ1tdO1xyXG5cdGZpbmRUZXh0OiBzdHJpbmc7XHJcblx0cmVwbGFjZVRleHQ6IHN0cmluZztcclxufVxyXG5cclxuLyoqXHJcbiAqIEFyZ3VtZW50cyBmb3IgYmF0Y2ggc3VidGFzayBjcmVhdGlvblxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBCYXRjaENyZWF0ZVN1YnRhc2tzQXJncyB7XHJcblx0cGFyZW50VGFza0lkOiBzdHJpbmc7XHJcblx0c3VidGFza3M6IEFycmF5PHtcclxuXHRcdGNvbnRlbnQ6IHN0cmluZztcclxuXHRcdHByaW9yaXR5PzogbnVtYmVyO1xyXG5cdFx0ZHVlRGF0ZT86IHN0cmluZztcclxuXHR9PjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFdyaXRlQVBJIHtcclxuXHRjYW52YXNUYXNrVXBkYXRlcjogQ2FudmFzVGFza1VwZGF0ZXI7XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cHJpdmF0ZSBhcHA6IEFwcCxcclxuXHRcdHByaXZhdGUgdmF1bHQ6IFZhdWx0LFxyXG5cdFx0cHJpdmF0ZSBtZXRhZGF0YUNhY2hlOiBNZXRhZGF0YUNhY2hlLFxyXG5cdFx0cHJpdmF0ZSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdHByaXZhdGUgZ2V0VGFza0J5SWQ6IChpZDogc3RyaW5nKSA9PiBQcm9taXNlPFRhc2sgfCBudWxsPiB8IFRhc2sgfCBudWxsLFxyXG5cdCkge1xyXG5cdFx0dGhpcy5jYW52YXNUYXNrVXBkYXRlciA9IG5ldyBDYW52YXNUYXNrVXBkYXRlcih2YXVsdCwgcGx1Z2luKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBhIHRhc2sncyBzdGF0dXMgb3IgY29tcGxldGlvbiBzdGF0ZVxyXG5cdCAqL1xyXG5cdGFzeW5jIHVwZGF0ZVRhc2tTdGF0dXMoYXJnczoge1xyXG5cdFx0dGFza0lkOiBzdHJpbmc7XHJcblx0XHRzdGF0dXM/OiBzdHJpbmc7XHJcblx0XHRjb21wbGV0ZWQ/OiBib29sZWFuO1xyXG5cdH0pOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgdGFzaz86IFRhc2s7IGVycm9yPzogc3RyaW5nIH0+IHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IHRhc2sgPSBhd2FpdCBQcm9taXNlLnJlc29sdmUodGhpcy5nZXRUYXNrQnlJZChhcmdzLnRhc2tJZCkpO1xyXG5cdFx0XHRpZiAoIXRhc2spIHtcclxuXHRcdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiVGFzayBub3QgZm91bmRcIiB9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBDaGVjayBpZiB0aGlzIGlzIGEgQ2FudmFzIHRhc2tcclxuXHRcdFx0aWYgKENhbnZhc1Rhc2tVcGRhdGVyLmlzQ2FudmFzVGFzayh0YXNrKSkge1xyXG5cdFx0XHRcdHJldHVybiB0aGlzLnVwZGF0ZUNhbnZhc1Rhc2soe1xyXG5cdFx0XHRcdFx0dGFza0lkOiBhcmdzLnRhc2tJZCxcclxuXHRcdFx0XHRcdHVwZGF0ZXM6IHtcclxuXHRcdFx0XHRcdFx0c3RhdHVzOiBhcmdzLnN0YXR1cyxcclxuXHRcdFx0XHRcdFx0Y29tcGxldGVkOiBhcmdzLmNvbXBsZXRlZCxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IGZpbGUgPSB0aGlzLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChcclxuXHRcdFx0XHR0YXNrLmZpbGVQYXRoLFxyXG5cdFx0XHQpIGFzIFRGaWxlO1xyXG5cdFx0XHRpZiAoIWZpbGUpIHtcclxuXHRcdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiRmlsZSBub3QgZm91bmRcIiB9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBjb250ZW50ID0gYXdhaXQgdGhpcy52YXVsdC5yZWFkKGZpbGUpO1xyXG5cdFx0XHRjb25zdCBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoXCJcXG5cIik7XHJcblxyXG5cdFx0XHRpZiAodGFzay5saW5lIDwgMCB8fCB0YXNrLmxpbmUgPj0gbGluZXMubGVuZ3RoKSB7XHJcblx0XHRcdFx0cmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIkludmFsaWQgbGluZSBudW1iZXJcIiB9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRsZXQgdGFza0xpbmUgPSBsaW5lc1t0YXNrLmxpbmVdO1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIHN0YXR1cyBvciBjb21wbGV0aW9uIChzdXBwb3J0IGJvdGggc3RhdHVzIHN5bWJvbCBhbmQgY29tcGxldGVkIGJvb2xlYW4pXHJcblx0XHRcdGNvbnN0IGNvbmZpZ3VyZWRDb21wbGV0ZWQgPSAoXHJcblx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c2VzPy5jb21wbGV0ZWQgfHwgXCJ4XCJcclxuXHRcdFx0KS5zcGxpdChcInxcIilbMF07XHJcblx0XHRcdGNvbnN0IHdpbGxDb21wbGV0ZSA9XHJcblx0XHRcdFx0YXJncy5jb21wbGV0ZWQgPT09IHRydWUgfHxcclxuXHRcdFx0XHQoYXJncy5zdGF0dXMgIT09IHVuZGVmaW5lZCAmJlxyXG5cdFx0XHRcdFx0KCh0eXBlb2YgKGFyZ3Muc3RhdHVzIGFzIGFueSkudG9Mb3dlckNhc2UgPT09IFwiZnVuY3Rpb25cIiAmJlxyXG5cdFx0XHRcdFx0XHQoYXJncy5zdGF0dXMgYXMgYW55KS50b0xvd2VyQ2FzZSgpID09PSBcInhcIikgfHxcclxuXHRcdFx0XHRcdFx0YXJncy5zdGF0dXMgPT09IGNvbmZpZ3VyZWRDb21wbGV0ZWQpKTtcclxuXHRcdFx0Ly8gRGV0ZXJtaW5lIG1hcmsgdG8gd3JpdGUgdG8gY2hlY2tib3hcclxuXHRcdFx0Y29uc3QgbWFya1RvV3JpdGUgPVxyXG5cdFx0XHRcdGFyZ3Muc3RhdHVzICE9PSB1bmRlZmluZWRcclxuXHRcdFx0XHRcdD8gKGFyZ3Muc3RhdHVzIGFzIHN0cmluZylcclxuXHRcdFx0XHRcdDogd2lsbENvbXBsZXRlXHJcblx0XHRcdFx0XHRcdD8gXCJ4XCJcclxuXHRcdFx0XHRcdFx0OiBcIiBcIjtcclxuXHRcdFx0dGFza0xpbmUgPSB0YXNrTGluZS5yZXBsYWNlKFxyXG5cdFx0XHRcdC8oXFxzKlstKitdXFxzKlxcWylbXlxcXV0qKFxcXVxccyopLyxcclxuXHRcdFx0XHRgJDEke21hcmtUb1dyaXRlfSQyYCxcclxuXHRcdFx0KTtcclxuXHRcdFx0Ly8gSGFuZGxlIGRhdGUgd3JpdGluZyBiYXNlZCBvbiBzdGF0dXMgY2hhbmdlc1xyXG5cdFx0XHRjb25zdCBwcmV2aW91c01hcmsgPSB0YXNrLnN0YXR1cyB8fCBcIiBcIjtcclxuXHRcdFx0Y29uc3QgaXNDb21wbGV0aW5nID0gd2lsbENvbXBsZXRlICYmICF0YXNrLmNvbXBsZXRlZDtcclxuXHRcdFx0Y29uc3QgaXNBYmFuZG9uaW5nID0gbWFya1RvV3JpdGUgPT09IFwiLVwiICYmIHByZXZpb3VzTWFyayAhPT0gXCItXCI7XHJcblx0XHRcdGNvbnN0IGlzU3RhcnRpbmcgPVxyXG5cdFx0XHRcdChtYXJrVG9Xcml0ZSA9PT0gXCI+XCIgfHwgbWFya1RvV3JpdGUgPT09IFwiL1wiKSAmJlxyXG5cdFx0XHRcdChwcmV2aW91c01hcmsgPT09IFwiIFwiIHx8IHByZXZpb3VzTWFyayA9PT0gXCI/XCIpO1xyXG5cclxuXHRcdFx0Ly8gQWRkIGNvbXBsZXRpb24gZGF0ZSBpZiBjb21wbGV0aW5nIGFuZCBub3QgYWxyZWFkeSBwcmVzZW50XHJcblx0XHRcdGlmIChpc0NvbXBsZXRpbmcpIHtcclxuXHRcdFx0XHRjb25zdCBoYXNDb21wbGV0aW9uTWV0YSA9IC8oXFxbY29tcGxldGlvbjo6fOKchSkvLnRlc3QodGFza0xpbmUpO1xyXG5cdFx0XHRcdGlmICghaGFzQ29tcGxldGlvbk1ldGEpIHtcclxuXHRcdFx0XHRcdGNvbnN0IGNvbXBsZXRpb25EYXRlID0gbW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcclxuXHRcdFx0XHRcdGNvbnN0IHVzZURhdGF2aWV3Rm9ybWF0ID1cclxuXHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucHJlZmVyTWV0YWRhdGFGb3JtYXQgPT09XHJcblx0XHRcdFx0XHRcdFwiZGF0YXZpZXdcIjtcclxuXHRcdFx0XHRcdGNvbnN0IGNvbXBsZXRpb25NZXRhID0gdXNlRGF0YXZpZXdGb3JtYXRcclxuXHRcdFx0XHRcdFx0PyBgW2NvbXBsZXRpb246OiAke2NvbXBsZXRpb25EYXRlfV1gXHJcblx0XHRcdFx0XHRcdDogYOKchSAke2NvbXBsZXRpb25EYXRlfWA7XHJcblx0XHRcdFx0XHR0YXNrTGluZSA9IHRoaXMuaW5zZXJ0RGF0ZUF0Q29ycmVjdFBvc2l0aW9uKFxyXG5cdFx0XHRcdFx0XHR0YXNrTGluZSxcclxuXHRcdFx0XHRcdFx0Y29tcGxldGlvbk1ldGEsXHJcblx0XHRcdFx0XHRcdFwiY29tcGxldGVkXCIsXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQWRkIGNhbmNlbGxlZCBkYXRlIGlmIGFiYW5kb25pbmdcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdGlzQWJhbmRvbmluZyAmJlxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLmF1dG9EYXRlTWFuYWdlcj8ubWFuYWdlQ2FuY2VsbGVkRGF0ZVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRjb25zdCBoYXNDYW5jZWxsZWRNZXRhID0gLyhcXFtjYW5jZWxsZWQ6OnzinYwpLy50ZXN0KHRhc2tMaW5lKTtcclxuXHRcdFx0XHRpZiAoIWhhc0NhbmNlbGxlZE1ldGEpIHtcclxuXHRcdFx0XHRcdGNvbnN0IGNhbmNlbGxlZERhdGUgPSBtb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xyXG5cdFx0XHRcdFx0Y29uc3QgdXNlRGF0YXZpZXdGb3JtYXQgPVxyXG5cdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcmVmZXJNZXRhZGF0YUZvcm1hdCA9PT1cclxuXHRcdFx0XHRcdFx0XCJkYXRhdmlld1wiO1xyXG5cdFx0XHRcdFx0Y29uc3QgY2FuY2VsbGVkTWV0YSA9IHVzZURhdGF2aWV3Rm9ybWF0XHJcblx0XHRcdFx0XHRcdD8gYFtjYW5jZWxsZWQ6OiAke2NhbmNlbGxlZERhdGV9XWBcclxuXHRcdFx0XHRcdFx0OiBg4p2MICR7Y2FuY2VsbGVkRGF0ZX1gO1xyXG5cdFx0XHRcdFx0dGFza0xpbmUgPSB0aGlzLmluc2VydERhdGVBdENvcnJlY3RQb3NpdGlvbihcclxuXHRcdFx0XHRcdFx0dGFza0xpbmUsXHJcblx0XHRcdFx0XHRcdGNhbmNlbGxlZE1ldGEsXHJcblx0XHRcdFx0XHRcdFwiY2FuY2VsbGVkXCIsXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQWRkIHN0YXJ0IGRhdGUgaWYgc3RhcnRpbmdcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdGlzU3RhcnRpbmcgJiZcclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5hdXRvRGF0ZU1hbmFnZXI/Lm1hbmFnZVN0YXJ0RGF0ZVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRjb25zdCBoYXNTdGFydE1ldGEgPSAvKFxcW3N0YXJ0Ojp88J+bq3zwn5qAKS8udGVzdCh0YXNrTGluZSk7XHJcblx0XHRcdFx0aWYgKCFoYXNTdGFydE1ldGEpIHtcclxuXHRcdFx0XHRcdGNvbnN0IHN0YXJ0RGF0ZSA9IG1vbWVudCgpLmZvcm1hdChcIllZWVktTU0tRERcIik7XHJcblx0XHRcdFx0XHRjb25zdCB1c2VEYXRhdmlld0Zvcm1hdCA9XHJcblx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnByZWZlck1ldGFkYXRhRm9ybWF0ID09PVxyXG5cdFx0XHRcdFx0XHRcImRhdGF2aWV3XCI7XHJcblx0XHRcdFx0XHRjb25zdCBzdGFydE1ldGEgPSB1c2VEYXRhdmlld0Zvcm1hdFxyXG5cdFx0XHRcdFx0XHQ/IGBbc3RhcnQ6OiAke3N0YXJ0RGF0ZX1dYFxyXG5cdFx0XHRcdFx0XHQ6IGDwn5urICR7c3RhcnREYXRlfWA7XHJcblx0XHRcdFx0XHR0YXNrTGluZSA9IHRoaXMuaW5zZXJ0RGF0ZUF0Q29ycmVjdFBvc2l0aW9uKFxyXG5cdFx0XHRcdFx0XHR0YXNrTGluZSxcclxuXHRcdFx0XHRcdFx0c3RhcnRNZXRhLFxyXG5cdFx0XHRcdFx0XHRcInN0YXJ0XCIsXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0bGluZXNbdGFzay5saW5lXSA9IHRhc2tMaW5lO1xyXG5cclxuXHRcdFx0Ly8gSWYgY29tcGxldGluZyBhIHJlY3VycmluZyB0YXNrLCBpbnNlcnQgdGhlIG5leHQgb2NjdXJyZW5jZSByaWdodCBhZnRlclxyXG5cdFx0XHRjb25zdCBpc0NvbXBsZXRpbmdSZWN1cnJpbmdUYXNrID1cclxuXHRcdFx0XHR3aWxsQ29tcGxldGUgJiYgIXRhc2suY29tcGxldGVkICYmIHRhc2subWV0YWRhdGE/LnJlY3VycmVuY2U7XHJcblx0XHRcdGlmIChpc0NvbXBsZXRpbmdSZWN1cnJpbmdUYXNrKSB7XHJcblx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdGNvbnN0IGluZGVudE1hdGNoID0gdGFza0xpbmUubWF0Y2goL14oXFxzKikvKTtcclxuXHRcdFx0XHRcdGNvbnN0IGluZGVudGF0aW9uID0gaW5kZW50TWF0Y2ggPyBpbmRlbnRNYXRjaFswXSA6IFwiXCI7XHJcblx0XHRcdFx0XHRjb25zdCBuZXdUYXNrTGluZSA9IHRoaXMuY3JlYXRlUmVjdXJyaW5nVGFzayhcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdC4uLnRhc2ssXHJcblx0XHRcdFx0XHRcdFx0Y29tcGxldGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRcdFx0XHQuLi50YXNrLm1ldGFkYXRhLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y29tcGxldGVkRGF0ZTogRGF0ZS5ub3coKSxcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHR9IGFzIFRhc2ssXHJcblx0XHRcdFx0XHRcdGluZGVudGF0aW9uLFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdGxpbmVzLnNwbGljZSh0YXNrLmxpbmUgKyAxLCAwLCBuZXdUYXNrTGluZSk7XHJcblx0XHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcclxuXHRcdFx0XHRcdFx0XCJXcml0ZUFQSTogZmFpbGVkIHRvIGNyZWF0ZSBuZXh0IHJlY3VycmluZyB0YXNrIGZyb20gdXBkYXRlVGFza1N0YXR1czpcIixcclxuXHRcdFx0XHRcdFx0ZSxcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBOb3RpZnkgYWJvdXQgd3JpdGUgb3BlcmF0aW9uXHJcblx0XHRcdGVtaXQodGhpcy5hcHAsIEV2ZW50cy5XUklURV9PUEVSQVRJT05fU1RBUlQsIHtcclxuXHRcdFx0XHRwYXRoOiBmaWxlLnBhdGgsXHJcblx0XHRcdFx0dGFza0lkOiBhcmdzLnRhc2tJZCxcclxuXHRcdFx0fSk7XHJcblx0XHRcdGF3YWl0IHRoaXMudmF1bHQubW9kaWZ5KGZpbGUsIGxpbmVzLmpvaW4oXCJcXG5cIikpO1xyXG5cdFx0XHRlbWl0KHRoaXMuYXBwLCBFdmVudHMuV1JJVEVfT1BFUkFUSU9OX0NPTVBMRVRFLCB7XHJcblx0XHRcdFx0cGF0aDogZmlsZS5wYXRoLFxyXG5cdFx0XHRcdHRhc2tJZDogYXJncy50YXNrSWQsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gVHJpZ2dlciB0YXNrLWNvbXBsZXRlZCBldmVudCBpZiB0YXNrIHdhcyBqdXN0IGNvbXBsZXRlZFxyXG5cdFx0XHRpZiAoYXJncy5jb21wbGV0ZWQgPT09IHRydWUgJiYgIXRhc2suY29tcGxldGVkKSB7XHJcblx0XHRcdFx0Y29uc3QgdXBkYXRlZFRhc2sgPSB7IC4uLnRhc2ssIGNvbXBsZXRlZDogdHJ1ZSB9O1xyXG5cdFx0XHRcdHRoaXMuYXBwLndvcmtzcGFjZS50cmlnZ2VyKFxyXG5cdFx0XHRcdFx0XCJ0YXNrLWdlbml1czp0YXNrLWNvbXBsZXRlZFwiLFxyXG5cdFx0XHRcdFx0dXBkYXRlZFRhc2ssXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIldyaXRlQVBJOiBFcnJvciB1cGRhdGluZyB0YXNrIHN0YXR1czpcIiwgZXJyb3IpO1xyXG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFN0cmluZyhlcnJvcikgfTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBhIHRhc2sgd2l0aCBuZXcgcHJvcGVydGllc1xyXG5cdCAqL1xyXG5cdGFzeW5jIHVwZGF0ZVRhc2soXHJcblx0XHRhcmdzOiBVcGRhdGVUYXNrQXJncyxcclxuXHQpOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgdGFzaz86IFRhc2s7IGVycm9yPzogc3RyaW5nIH0+IHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IG9yaWdpbmFsVGFzayA9IGF3YWl0IFByb21pc2UucmVzb2x2ZShcclxuXHRcdFx0XHR0aGlzLmdldFRhc2tCeUlkKGFyZ3MudGFza0lkKSxcclxuXHRcdFx0KTtcclxuXHRcdFx0aWYgKCFvcmlnaW5hbFRhc2spIHtcclxuXHRcdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiVGFzayBub3QgZm91bmRcIiB9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBDaGVjayBpZiB0aGlzIGlzIGEgQ2FudmFzIHRhc2tcclxuXHRcdFx0aWYgKENhbnZhc1Rhc2tVcGRhdGVyLmlzQ2FudmFzVGFzayhvcmlnaW5hbFRhc2spKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMudXBkYXRlQ2FudmFzVGFzayhhcmdzKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSGFuZGxlIEZpbGVTb3VyY2UgKGZpbGUtbGV2ZWwpIHRhc2tzIGRpZmZlcmVudGx5XHJcblx0XHRcdGNvbnN0IGlzRmlsZVNvdXJjZVRhc2sgPVxyXG5cdFx0XHRcdChvcmlnaW5hbFRhc2sgYXMgYW55KT8ubWV0YWRhdGE/LnNvdXJjZSA9PT0gXCJmaWxlLXNvdXJjZVwiIHx8XHJcblx0XHRcdFx0b3JpZ2luYWxUYXNrLmlkLnN0YXJ0c1dpdGgoXCJmaWxlLXNvdXJjZTpcIik7XHJcblx0XHRcdGlmIChpc0ZpbGVTb3VyY2VUYXNrKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMudXBkYXRlRmlsZVNvdXJjZVRhc2soXHJcblx0XHRcdFx0XHRvcmlnaW5hbFRhc2ssXHJcblx0XHRcdFx0XHRhcmdzLnVwZGF0ZXMsXHJcblx0XHRcdFx0XHRhcmdzLnRhc2tJZCxcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBmaWxlID0gdGhpcy52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXHJcblx0XHRcdFx0b3JpZ2luYWxUYXNrLmZpbGVQYXRoLFxyXG5cdFx0XHQpIGFzIFRGaWxlO1xyXG5cdFx0XHRpZiAoIWZpbGUpIHtcclxuXHRcdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiRmlsZSBub3QgZm91bmRcIiB9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBjb250ZW50ID0gYXdhaXQgdGhpcy52YXVsdC5yZWFkKGZpbGUpO1xyXG5cdFx0XHRjb25zdCBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoXCJcXG5cIik7XHJcblxyXG5cdFx0XHRpZiAob3JpZ2luYWxUYXNrLmxpbmUgPCAwIHx8IG9yaWdpbmFsVGFzay5saW5lID49IGxpbmVzLmxlbmd0aCkge1xyXG5cdFx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJJbnZhbGlkIGxpbmUgbnVtYmVyXCIgfTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgdXBkYXRlZFRhc2sgPSB7IC4uLm9yaWdpbmFsVGFzaywgLi4uYXJncy51cGRhdGVzIH07XHJcblx0XHRcdGxldCB0YXNrTGluZSA9IGxpbmVzW29yaWdpbmFsVGFzay5saW5lXTtcclxuXHJcblx0XHRcdC8vIFRyYWNrIHByZXZpb3VzIHN0YXR1cyBmb3IgZGF0ZSBtYW5hZ2VtZW50XHJcblx0XHRcdGNvbnN0IHByZXZpb3VzU3RhdHVzID0gb3JpZ2luYWxUYXNrLnN0YXR1cyB8fCBcIiBcIjtcclxuXHRcdFx0bGV0IG5ld1N0YXR1cyA9IHByZXZpb3VzU3RhdHVzO1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIGNoZWNrYm94IHN0YXR1cyBvciBzdGF0dXMgbWFya1xyXG5cdFx0XHRpZiAoYXJncy51cGRhdGVzLnN0YXR1cyAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0Ly8gUHJlZmVyIGV4cGxpY2l0IHN0YXR1cyBtYXJrIGlmIHByb3ZpZGVkXHJcblx0XHRcdFx0Y29uc3Qgc3RhdHVzTWFyayA9IGFyZ3MudXBkYXRlcy5zdGF0dXMgYXMgc3RyaW5nO1xyXG5cdFx0XHRcdG5ld1N0YXR1cyA9IHN0YXR1c01hcms7XHJcblx0XHRcdFx0dGFza0xpbmUgPSB0YXNrTGluZS5yZXBsYWNlKFxyXG5cdFx0XHRcdFx0LyhcXHMqWy0qK11cXHMqXFxbKVteXFxdXSooXFxdXFxzKikvLFxyXG5cdFx0XHRcdFx0YCQxJHtzdGF0dXNNYXJrfSQyYCxcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9IGVsc2UgaWYgKGFyZ3MudXBkYXRlcy5jb21wbGV0ZWQgIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdC8vIEZhbGxiYWNrIHRvIHNldHRpbmcgYmFzZWQgb24gY29tcGxldGVkIGJvb2xlYW5cclxuXHRcdFx0XHRjb25zdCBzdGF0dXNNYXJrID0gYXJncy51cGRhdGVzLmNvbXBsZXRlZCA/IFwieFwiIDogXCIgXCI7XHJcblx0XHRcdFx0bmV3U3RhdHVzID0gc3RhdHVzTWFyaztcclxuXHRcdFx0XHR0YXNrTGluZSA9IHRhc2tMaW5lLnJlcGxhY2UoXHJcblx0XHRcdFx0XHQvKFxccypbLSorXVxccypcXFspW15cXF1dKihcXF1cXHMqKS8sXHJcblx0XHRcdFx0XHRgJDEke3N0YXR1c01hcmt9JDJgLFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEhhbmRsZSBkYXRlIHdyaXRpbmcgYmFzZWQgb24gc3RhdHVzIGNoYW5nZXNcclxuXHRcdFx0Y29uc3QgY29uZmlndXJlZENvbXBsZXRlZCA9IChcclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXNrU3RhdHVzZXM/LmNvbXBsZXRlZCB8fCBcInhcIlxyXG5cdFx0XHQpLnNwbGl0KFwifFwiKVswXTtcclxuXHRcdFx0Y29uc3QgaXNDb21wbGV0aW5nID1cclxuXHRcdFx0XHQobmV3U3RhdHVzID09PSBcInhcIiB8fCBuZXdTdGF0dXMgPT09IGNvbmZpZ3VyZWRDb21wbGV0ZWQpICYmXHJcblx0XHRcdFx0cHJldmlvdXNTdGF0dXMgIT09IFwieFwiICYmXHJcblx0XHRcdFx0cHJldmlvdXNTdGF0dXMgIT09IGNvbmZpZ3VyZWRDb21wbGV0ZWQ7XHJcblx0XHRcdGNvbnN0IGlzQWJhbmRvbmluZyA9IG5ld1N0YXR1cyA9PT0gXCItXCIgJiYgcHJldmlvdXNTdGF0dXMgIT09IFwiLVwiO1xyXG5cdFx0XHRjb25zdCBpc1N0YXJ0aW5nID1cclxuXHRcdFx0XHQobmV3U3RhdHVzID09PSBcIj5cIiB8fCBuZXdTdGF0dXMgPT09IFwiL1wiKSAmJlxyXG5cdFx0XHRcdChwcmV2aW91c1N0YXR1cyA9PT0gXCIgXCIgfHwgcHJldmlvdXNTdGF0dXMgPT09IFwiP1wiKTtcclxuXHJcblx0XHRcdC8vIEFkZCBjb21wbGV0aW9uIGRhdGUgaWYgY29tcGxldGluZ1xyXG5cdFx0XHRpZiAoaXNDb21wbGV0aW5nICYmICFhcmdzLnVwZGF0ZXMubWV0YWRhdGE/LmNvbXBsZXRlZERhdGUpIHtcclxuXHRcdFx0XHRjb25zdCBoYXNDb21wbGV0aW9uTWV0YSA9IC8oXFxbY29tcGxldGlvbjo6fOKchSkvLnRlc3QodGFza0xpbmUpO1xyXG5cdFx0XHRcdGlmICghaGFzQ29tcGxldGlvbk1ldGEpIHtcclxuXHRcdFx0XHRcdGNvbnN0IGNvbXBsZXRpb25EYXRlID0gbW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcclxuXHRcdFx0XHRcdGNvbnN0IHVzZURhdGF2aWV3Rm9ybWF0ID1cclxuXHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucHJlZmVyTWV0YWRhdGFGb3JtYXQgPT09XHJcblx0XHRcdFx0XHRcdFwiZGF0YXZpZXdcIjtcclxuXHRcdFx0XHRcdGNvbnN0IGNvbXBsZXRpb25NZXRhID0gdXNlRGF0YXZpZXdGb3JtYXRcclxuXHRcdFx0XHRcdFx0PyBgW2NvbXBsZXRpb246OiAke2NvbXBsZXRpb25EYXRlfV1gXHJcblx0XHRcdFx0XHRcdDogYOKchSAke2NvbXBsZXRpb25EYXRlfWA7XHJcblx0XHRcdFx0XHR0YXNrTGluZSA9IHRoaXMuaW5zZXJ0RGF0ZUF0Q29ycmVjdFBvc2l0aW9uKFxyXG5cdFx0XHRcdFx0XHR0YXNrTGluZSxcclxuXHRcdFx0XHRcdFx0Y29tcGxldGlvbk1ldGEsXHJcblx0XHRcdFx0XHRcdFwiY29tcGxldGVkXCIsXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQWRkIGNhbmNlbGxlZCBkYXRlIGlmIGFiYW5kb25pbmdcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdGlzQWJhbmRvbmluZyAmJlxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLmF1dG9EYXRlTWFuYWdlcj8ubWFuYWdlQ2FuY2VsbGVkRGF0ZVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRjb25zdCBoYXNDYW5jZWxsZWRNZXRhID0gLyhcXFtjYW5jZWxsZWQ6OnzinYwpLy50ZXN0KHRhc2tMaW5lKTtcclxuXHRcdFx0XHRpZiAoIWhhc0NhbmNlbGxlZE1ldGEpIHtcclxuXHRcdFx0XHRcdGNvbnN0IGNhbmNlbGxlZERhdGUgPSBtb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xyXG5cdFx0XHRcdFx0Y29uc3QgdXNlRGF0YXZpZXdGb3JtYXQgPVxyXG5cdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcmVmZXJNZXRhZGF0YUZvcm1hdCA9PT1cclxuXHRcdFx0XHRcdFx0XCJkYXRhdmlld1wiO1xyXG5cdFx0XHRcdFx0Y29uc3QgY2FuY2VsbGVkTWV0YSA9IHVzZURhdGF2aWV3Rm9ybWF0XHJcblx0XHRcdFx0XHRcdD8gYFtjYW5jZWxsZWQ6OiAke2NhbmNlbGxlZERhdGV9XWBcclxuXHRcdFx0XHRcdFx0OiBg4p2MICR7Y2FuY2VsbGVkRGF0ZX1gO1xyXG5cdFx0XHRcdFx0dGFza0xpbmUgPSB0aGlzLmluc2VydERhdGVBdENvcnJlY3RQb3NpdGlvbihcclxuXHRcdFx0XHRcdFx0dGFza0xpbmUsXHJcblx0XHRcdFx0XHRcdGNhbmNlbGxlZE1ldGEsXHJcblx0XHRcdFx0XHRcdFwiY2FuY2VsbGVkXCIsXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQWRkIHN0YXJ0IGRhdGUgaWYgc3RhcnRpbmdcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdGlzU3RhcnRpbmcgJiZcclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5hdXRvRGF0ZU1hbmFnZXI/Lm1hbmFnZVN0YXJ0RGF0ZVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRjb25zdCBoYXNTdGFydE1ldGEgPSAvKFxcW3N0YXJ0Ojp88J+bq3zwn5qAKS8udGVzdCh0YXNrTGluZSk7XHJcblx0XHRcdFx0aWYgKCFoYXNTdGFydE1ldGEpIHtcclxuXHRcdFx0XHRcdGNvbnN0IHN0YXJ0RGF0ZSA9IG1vbWVudCgpLmZvcm1hdChcIllZWVktTU0tRERcIik7XHJcblx0XHRcdFx0XHRjb25zdCB1c2VEYXRhdmlld0Zvcm1hdCA9XHJcblx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnByZWZlck1ldGFkYXRhRm9ybWF0ID09PVxyXG5cdFx0XHRcdFx0XHRcImRhdGF2aWV3XCI7XHJcblx0XHRcdFx0XHRjb25zdCBzdGFydE1ldGEgPSB1c2VEYXRhdmlld0Zvcm1hdFxyXG5cdFx0XHRcdFx0XHQ/IGBbc3RhcnQ6OiAke3N0YXJ0RGF0ZX1dYFxyXG5cdFx0XHRcdFx0XHQ6IGDwn5urICR7c3RhcnREYXRlfWA7XHJcblx0XHRcdFx0XHR0YXNrTGluZSA9IHRoaXMuaW5zZXJ0RGF0ZUF0Q29ycmVjdFBvc2l0aW9uKFxyXG5cdFx0XHRcdFx0XHR0YXNrTGluZSxcclxuXHRcdFx0XHRcdFx0c3RhcnRNZXRhLFxyXG5cdFx0XHRcdFx0XHRcInN0YXJ0XCIsXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIGNvbnRlbnQgaWYgY2hhbmdlZCAoYnV0IHByZXZlbnQgY2xlYXJpbmcgY29udGVudClcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdGFyZ3MudXBkYXRlcy5jb250ZW50ICE9PSB1bmRlZmluZWQgJiZcclxuXHRcdFx0XHRhcmdzLnVwZGF0ZXMuY29udGVudCAhPT0gXCJcIlxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHQvLyBFeHRyYWN0IHRoZSB0YXNrIHByZWZpeCBhbmQgbWV0YWRhdGFcclxuXHRcdFx0XHRjb25zdCBwcmVmaXhNYXRjaCA9IHRhc2tMaW5lLm1hdGNoKFxyXG5cdFx0XHRcdFx0L14oXFxzKlstKitdXFxzKlxcW1teXFxdXSpcXF1cXHMqKS8sXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRpZiAocHJlZml4TWF0Y2gpIHtcclxuXHRcdFx0XHRcdGNvbnN0IHByZWZpeCA9IHByZWZpeE1hdGNoWzFdO1xyXG5cdFx0XHRcdFx0Ly8gUHJlc2VydmUgdHJhaWxpbmcgbWV0YWRhdGEgKHN0cmljdDogdHJhaWxpbmctb25seSwgcmVjb2duaXplZCBrZXlzOyBsaW5rcy9jb2RlIHNhbml0aXplZClcclxuXHRcdFx0XHRcdGNvbnN0IGFmdGVyUHJlZml4ID0gdGFza0xpbmUuc3Vic3RyaW5nKHByZWZpeC5sZW5ndGgpO1xyXG5cdFx0XHRcdFx0Y29uc3Qgc2FuaXRpemVkMiA9IGFmdGVyUHJlZml4XHJcblx0XHRcdFx0XHRcdC5yZXBsYWNlKC9cXFtcXFtbXlxcXV0qXFxdXFxdL2csIChtKSA9PiBcInhcIi5yZXBlYXQobS5sZW5ndGgpKVxyXG5cdFx0XHRcdFx0XHQucmVwbGFjZSgvXFxbW15cXF1dKlxcXVxcKFteXFwpXSpcXCkvZywgKG0pID0+XHJcblx0XHRcdFx0XHRcdFx0XCJ4XCIucmVwZWF0KG0ubGVuZ3RoKSxcclxuXHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHQucmVwbGFjZSgvYFteYF0qYC9nLCAobSkgPT4gXCJ4XCIucmVwZWF0KG0ubGVuZ3RoKSk7XHJcblx0XHRcdFx0XHRjb25zdCBlc2MyID0gKHM6IHN0cmluZykgPT5cclxuXHRcdFx0XHRcdFx0cy5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxdXFxcXF0vZywgXCJcXFxcJCZcIik7XHJcblx0XHRcdFx0XHRjb25zdCBwcm9qZWN0S2V5MiA9XHJcblx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnByb2plY3RUYWdQcmVmaXg/LmRhdGF2aWV3IHx8XHJcblx0XHRcdFx0XHRcdFwicHJvamVjdFwiO1xyXG5cdFx0XHRcdFx0Y29uc3QgY29udGV4dEtleTIgPVxyXG5cdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb250ZXh0VGFnUHJlZml4Py5kYXRhdmlldyB8fFxyXG5cdFx0XHRcdFx0XHRcImNvbnRleHRcIjtcclxuXHRcdFx0XHRcdGNvbnN0IGR2S2V5c0dyb3VwMiA9IFtcclxuXHRcdFx0XHRcdFx0XCJ0YWdzXCIsXHJcblx0XHRcdFx0XHRcdGVzYzIocHJvamVjdEtleTIpLFxyXG5cdFx0XHRcdFx0XHRlc2MyKGNvbnRleHRLZXkyKSxcclxuXHRcdFx0XHRcdFx0XCJwcmlvcml0eVwiLFxyXG5cdFx0XHRcdFx0XHRcInJlcGVhdFwiLFxyXG5cdFx0XHRcdFx0XHRcInN0YXJ0XCIsXHJcblx0XHRcdFx0XHRcdFwic2NoZWR1bGVkXCIsXHJcblx0XHRcdFx0XHRcdFwiZHVlXCIsXHJcblx0XHRcdFx0XHRcdFwiY29tcGxldGlvblwiLFxyXG5cdFx0XHRcdFx0XHRcImNhbmNlbGxlZFwiLFxyXG5cdFx0XHRcdFx0XHRcIm9uQ29tcGxldGlvblwiLFxyXG5cdFx0XHRcdFx0XHRcImRlcGVuZHNPblwiLFxyXG5cdFx0XHRcdFx0XHRcImlkXCIsXHJcblx0XHRcdFx0XHRdLmpvaW4oXCJ8XCIpO1xyXG5cdFx0XHRcdFx0Y29uc3QgYmFzZUVtb2ppMiA9IFwiKPCflLp84o+rfPCflLx88J+UvXzij6x88J+bq3zij7N88J+ThXzinIV88J+UgSlcIjtcclxuXHRcdFx0XHRcdGNvbnN0IGR2RmllbGRUb2tlbjIgPSBgXFxcXFsoPzoke2R2S2V5c0dyb3VwMn0pXFxcXHMqOjpbXlxcXFxdXSpcXFxcXWA7XHJcblx0XHRcdFx0XHRjb25zdCB0YWdUb2tlbjIgPSBFTU9KSV9UQUdfUkVHRVguc291cmNlO1xyXG5cdFx0XHRcdFx0Y29uc3QgYXRUb2tlbjIgPSBUT0tFTl9DT05URVhUX1JFR0VYLnNvdXJjZTtcclxuXHRcdFx0XHRcdGNvbnN0IGVtb2ppU2VnMiA9IGAoPzoke2Jhc2VFbW9qaTJ9W15cXFxcbl0qKWA7XHJcblx0XHRcdFx0XHRjb25zdCB0b2tlbjIgPSBgKD86JHtlbW9qaVNlZzJ9fCR7ZHZGaWVsZFRva2VuMn18JHt0YWdUb2tlbjJ9fCR7YXRUb2tlbjJ9KWA7XHJcblx0XHRcdFx0XHRjb25zdCB0cmFpbGluZzIgPSBuZXcgUmVnRXhwKGAoPzpcXFxccyske3Rva2VuMn0pKyRgKTtcclxuXHRcdFx0XHRcdGNvbnN0IHRtMiA9IHNhbml0aXplZDIubWF0Y2godHJhaWxpbmcyKTtcclxuXHRcdFx0XHRcdGNvbnN0IHRyYWlsaW5nTWV0YSA9IHRtMlxyXG5cdFx0XHRcdFx0XHQ/IGFmdGVyUHJlZml4LnNsaWNlKFxyXG5cdFx0XHRcdFx0XHRcdFx0YWZ0ZXJQcmVmaXgubGVuZ3RoIC0gKHRtMlswXT8ubGVuZ3RoIHx8IDApLFxyXG5cdFx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0OiBcIlwiO1xyXG5cdFx0XHRcdFx0dGFza0xpbmUgPSBgJHtwcmVmaXh9JHthcmdzLnVwZGF0ZXMuY29udGVudH0ke3RyYWlsaW5nTWV0YX1gO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIGlmIChhcmdzLnVwZGF0ZXMuY29udGVudCA9PT0gXCJcIikge1xyXG5cdFx0XHRcdC8vIExvZyB3YXJuaW5nIGlmIGF0dGVtcHRpbmcgdG8gY2xlYXIgY29udGVudFxyXG5cdFx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcdFwiW1dyaXRlQVBJXSBQcmV2ZW50ZWQgY2xlYXJpbmcgdGFzayBjb250ZW50IGZvciB0YXNrOlwiLFxyXG5cdFx0XHRcdFx0b3JpZ2luYWxUYXNrLmlkLFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFVwZGF0ZSBtZXRhZGF0YSBpZiBjaGFuZ2VkXHJcblx0XHRcdGlmIChhcmdzLnVwZGF0ZXMubWV0YWRhdGEpIHtcclxuXHRcdFx0XHRjb25zdCBtZDogYW55ID0gYXJncy51cGRhdGVzLm1ldGFkYXRhIHx8IHt9O1xyXG5cdFx0XHRcdGNvbnN0IG1kS2V5cyA9IE9iamVjdC5rZXlzKG1kKTtcclxuXHRcdFx0XHRjb25zdCBvbmx5Q29tcGxldGlvbkRhdGUgPVxyXG5cdFx0XHRcdFx0bWRLZXlzLmxlbmd0aCA+IDAgJiZcclxuXHRcdFx0XHRcdG1kS2V5cy5ldmVyeSgoaykgPT4gayA9PT0gXCJjb21wbGV0ZWREYXRlXCIpO1xyXG5cdFx0XHRcdGlmIChvbmx5Q29tcGxldGlvbkRhdGUpIHtcclxuXHRcdFx0XHRcdC8vIFBhdGNoIGNvbXBsZXRpb24gZGF0ZSBpbi1wbGFjZSB0byBhdm9pZCBkcm9wcGluZyBvdGhlciBtZXRhZGF0YVxyXG5cdFx0XHRcdFx0Ly8gUmVtb3ZlIGV4aXN0aW5nIGNvbXBsZXRpb24gbWFya2VycyBmaXJzdFxyXG5cdFx0XHRcdFx0dGFza0xpbmUgPSB0YXNrTGluZVxyXG5cdFx0XHRcdFx0XHQucmVwbGFjZSgvXFxzKlxcW2NvbXBsZXRpb246OlxccypbXlxcXV0rXFxdL2ksIFwiXCIpXHJcblx0XHRcdFx0XHRcdC5yZXBsYWNlKC9cXHMq4pyFXFxzKlxcZHs0fS1cXGR7Mn0tXFxkezJ9LywgXCJcIik7XHJcblx0XHRcdFx0XHRpZiAobWQuY29tcGxldGVkRGF0ZSkge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBkYXRlU3RyID1cclxuXHRcdFx0XHRcdFx0XHR0eXBlb2YgbWQuY29tcGxldGVkRGF0ZSA9PT0gXCJudW1iZXJcIlxyXG5cdFx0XHRcdFx0XHRcdFx0PyBtb21lbnQobWQuY29tcGxldGVkRGF0ZSkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKVxyXG5cdFx0XHRcdFx0XHRcdFx0OiBTdHJpbmcobWQuY29tcGxldGVkRGF0ZSk7XHJcblx0XHRcdFx0XHRcdGNvbnN0IHVzZURhdGF2aWV3Rm9ybWF0ID1cclxuXHRcdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcmVmZXJNZXRhZGF0YUZvcm1hdCA9PT1cclxuXHRcdFx0XHRcdFx0XHRcImRhdGF2aWV3XCI7XHJcblx0XHRcdFx0XHRcdGNvbnN0IGNvbXBsZXRpb25NZXRhID0gdXNlRGF0YXZpZXdGb3JtYXRcclxuXHRcdFx0XHRcdFx0XHQ/IGBbY29tcGxldGlvbjo6ICR7ZGF0ZVN0cn1dYFxyXG5cdFx0XHRcdFx0XHRcdDogYOKchSAke2RhdGVTdHJ9YDtcclxuXHRcdFx0XHRcdFx0dGFza0xpbmUgPSBgJHt0YXNrTGluZX0gJHtjb21wbGV0aW9uTWV0YX1gO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHQvLyBPbmx5IHJlZ2VuZXJhdGUgdHJhaWxpbmcgbWV0YWRhdGEgd2hlbiB1cGRhdGVzIGluY2x1ZGUgbWFuYWdlZCBrZXlzLlxyXG5cdFx0XHRcdFx0Y29uc3QgbWFuYWdlZEtleXMgPSBuZXcgU2V0KFtcclxuXHRcdFx0XHRcdFx0XCJ0YWdzXCIsXHJcblx0XHRcdFx0XHRcdFwicHJvamVjdFwiLFxyXG5cdFx0XHRcdFx0XHRcImNvbnRleHRcIixcclxuXHRcdFx0XHRcdFx0XCJwcmlvcml0eVwiLFxyXG5cdFx0XHRcdFx0XHRcInJlcGVhdFwiLFxyXG5cdFx0XHRcdFx0XHRcInN0YXJ0RGF0ZVwiLFxyXG5cdFx0XHRcdFx0XHRcImR1ZURhdGVcIixcclxuXHRcdFx0XHRcdFx0XCJzY2hlZHVsZWREYXRlXCIsXHJcblx0XHRcdFx0XHRcdFwicmVjdXJyZW5jZVwiLFxyXG5cdFx0XHRcdFx0XHRcImNvbXBsZXRlZERhdGVcIixcclxuXHRcdFx0XHRcdFx0XCJvbkNvbXBsZXRpb25cIixcclxuXHRcdFx0XHRcdFx0XCJkZXBlbmRzT25cIixcclxuXHRcdFx0XHRcdFx0XCJpZFwiLFxyXG5cdFx0XHRcdFx0XSk7XHJcblx0XHRcdFx0XHRjb25zdCBoYXNNYW5hZ2VkVXBkYXRlID0gbWRLZXlzLnNvbWUoKGspID0+XHJcblx0XHRcdFx0XHRcdG1hbmFnZWRLZXlzLmhhcyhrKSxcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRpZiAoIWhhc01hbmFnZWRVcGRhdGUpIHtcclxuXHRcdFx0XHRcdFx0Ly8gSWdub3JlIHVua25vd24gbWV0YWRhdGEtb25seSB1cGRhdGVzIHRvIGF2b2lkIHN0cmlwcGluZyB1c2VyIGNvbnRlbnQgbGlrZSBbcHJvanQ6Om5ld11cclxuXHRcdFx0XHRcdFx0Ly8gYW5kIGtlZXAgdGFza0xpbmUgYXMtaXMuXHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHQvLyBSZW1vdmUgZXhpc3RpbmcgbWV0YWRhdGEgYW5kIHJlZ2VuZXJhdGUgZnJvbSBtZXJnZWQgdmFsdWVzXHJcblx0XHRcdFx0XHRcdC8vIEZpcnN0LCBleHRyYWN0IHRoZSBjaGVja2JveCBwcmVmaXhcclxuXHRcdFx0XHRcdFx0Y29uc3QgY2hlY2tib3hNYXRjaCA9IHRhc2tMaW5lLm1hdGNoKFxyXG5cdFx0XHRcdFx0XHRcdC9eKFxccypbLSorXVxccypcXFtbXlxcXV0qXFxdXFxzKikvLFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRpZiAoY2hlY2tib3hNYXRjaCkge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGNoZWNrYm94UHJlZml4ID0gY2hlY2tib3hNYXRjaFsxXTtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBhZnRlckNoZWNrYm94ID0gdGFza0xpbmUuc3Vic3RyaW5nKFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2hlY2tib3hQcmVmaXgubGVuZ3RoLFxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdC8vIEZpbmQgd2hlcmUgbWV0YWRhdGEgc3RhcnRzIChsb29rIGZvciBlbW9qaSBtYXJrZXJzIG9yIGRhdGF2aWV3IGZpZWxkcylcclxuXHRcdFx0XHRcdFx0XHQvLyBVcGRhdGVkIHBhdHRlcm4gdG8gYXZvaWQgbWF0Y2hpbmcgd2lraSBsaW5rcyBbWy4uLl1dIG9yIG1hcmtkb3duIGxpbmtzIFt0ZXh0XSh1cmwpXHJcblx0XHRcdFx0XHRcdFx0Ly8gVG8gYXZvaWQgZmFsc2UgcG9zaXRpdmVzLCBzYW5pdGl6ZSBvdXQgd2lraSBsaW5rcyBbWy4uLl1dLCBtYXJrZG93biBsaW5rcyBbdGV4dF0odXJsKSwgYW5kIGlubGluZSBjb2RlIGAuLi5gXHJcblx0XHRcdFx0XHRcdFx0Y29uc3Qgc2FuaXRpemVkID0gYWZ0ZXJDaGVja2JveFxyXG5cdFx0XHRcdFx0XHRcdFx0Ly8gVXNlIG5vbi13aGl0ZXNwYWNlIHBsYWNlaG9sZGVycyB0byBwcmV2ZW50IFxccysgZnJvbSBjb25zdW1pbmcgYWNyb3NzIGxpbmtzL2NvZGVcclxuXHRcdFx0XHRcdFx0XHRcdC5yZXBsYWNlKC9cXFtcXFtbXlxcXV0qXFxdXFxdL2csIChtKSA9PlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcInhcIi5yZXBlYXQobS5sZW5ndGgpLFxyXG5cdFx0XHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHRcdFx0LnJlcGxhY2UoL1xcW1teXFxdXSpcXF1cXChbXlxcKV0qXFwpL2csIChtKSA9PlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcInhcIi5yZXBlYXQobS5sZW5ndGgpLFxyXG5cdFx0XHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHRcdFx0LnJlcGxhY2UoL2BbXmBdKmAvZywgKG0pID0+XHJcblx0XHRcdFx0XHRcdFx0XHRcdFwieFwiLnJlcGVhdChtLmxlbmd0aCksXHJcblx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyBCdWlsZCB0cmFpbGluZy1tZXRhZGF0YSBtYXRjaGVyLiBSZWNvZ25pemUgRGF0YXZpZXcgZmllbGRzIGFuZFxyXG5cdFx0XHRcdFx0XHRcdC8vIHRvbGVyYXRlIHNwYWNlcyBpbnNpZGUga25vd24gdG9rZW5zIGxpa2UgI3Byb2plY3QvLi4uIGFuZCBAY29udGV4dC4uLlxyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGVzYyA9IChzOiBzdHJpbmcpID0+XHJcblx0XHRcdFx0XHRcdFx0XHRzLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLCBcIlxcXFwkJlwiKTtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBkdlByb2plY3RLZXkgPVxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvamVjdFRhZ1ByZWZpeFxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ/LmRhdGF2aWV3IHx8IFwicHJvamVjdFwiO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGR2Q29udGV4dEtleSA9XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb250ZXh0VGFnUHJlZml4XHJcblx0XHRcdFx0XHRcdFx0XHRcdD8uZGF0YXZpZXcgfHwgXCJjb250ZXh0XCI7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgZHZLZXlzR3JvdXAgPSBbXHJcblx0XHRcdFx0XHRcdFx0XHRcInRhZ3NcIixcclxuXHRcdFx0XHRcdFx0XHRcdGVzYyhkdlByb2plY3RLZXkpLFxyXG5cdFx0XHRcdFx0XHRcdFx0ZXNjKGR2Q29udGV4dEtleSksXHJcblx0XHRcdFx0XHRcdFx0XHRcInByaW9yaXR5XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcInJlcGVhdFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XCJzdGFydFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XCJzY2hlZHVsZWRcIixcclxuXHRcdFx0XHRcdFx0XHRcdFwiZHVlXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcImNvbXBsZXRpb25cIixcclxuXHRcdFx0XHRcdFx0XHRcdFwiY2FuY2VsbGVkXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcIm9uQ29tcGxldGlvblwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XCJkZXBlbmRzT25cIixcclxuXHRcdFx0XHRcdFx0XHRcdFwiaWRcIixcclxuXHRcdFx0XHRcdFx0XHRdLmpvaW4oXCJ8XCIpO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGJhc2VFbW9qaSA9IFwiKPCflLp84o+rfPCflLx88J+UvXzij6x88J+bq3zij7N88J+ThXzinIV88J+UgSlcIjtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBkdkZpZWxkVG9rZW4gPSBgXFxcXFsoPzoke2R2S2V5c0dyb3VwfSlcXFxccyo6OlteXFxcXF1dKlxcXFxdYDtcclxuXHRcdFx0XHRcdFx0XHQvLyBUYXNrcy1mb3JtYXQgcHJlZml4ZXNcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBwcm9qZWN0UHJlZml4VGFza3MgPVxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvamVjdFRhZ1ByZWZpeD8udGFza3MgfHxcclxuXHRcdFx0XHRcdFx0XHRcdFwicHJvamVjdFwiO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGNvbnRleHRQcmVmaXhUYXNrcyA9XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb250ZXh0VGFnUHJlZml4Py50YXNrcyB8fFxyXG5cdFx0XHRcdFx0XHRcdFx0XCJAXCI7XHJcblx0XHRcdFx0XHRcdFx0Ly8gQWxsb3cgc3BhY2VzIHdpdGhpbiBwcm9qZWN0L2NvbnRleHQgdmFsdWVzIHdoZW4gc3RyaXBwaW5nIHRyYWlsaW5nIG1ldGFkYXRhXHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgcHJvamVjdFdpZGVUb2tlbiA9IGAjJHtlc2MoXHJcblx0XHRcdFx0XHRcdFx0XHRwcm9qZWN0UHJlZml4VGFza3MsXHJcblx0XHRcdFx0XHRcdFx0KX0vW15cXFxcblxcXFxyXSpgO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGF0V2lkZVRva2VuID0gYCR7ZXNjKFxyXG5cdFx0XHRcdFx0XHRcdFx0Y29udGV4dFByZWZpeFRhc2tzLFxyXG5cdFx0XHRcdFx0XHRcdCl9W15cXFxcblxcXFxyXSpgO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHRhZ1Rva2VuID0gRU1PSklfVEFHX1JFR0VYLnNvdXJjZTtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBhdFRva2VuID0gVE9LRU5fQ09OVEVYVF9SRUdFWC5zb3VyY2U7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgZW1vamlTZWcgPSBgKD86JHtiYXNlRW1vaml9W15cXFxcbl0qKWA7XHJcblx0XHRcdFx0XHRcdFx0Ly8gUHJlZmVyIHRoZSB3aWRlIHRva2VucyBmaXJzdCBzbyB3ZSBjb25zdW1lIHRoZSBmdWxsIHRyYWlsaW5nIHNlZ21lbnRcclxuXHRcdFx0XHRcdFx0XHRjb25zdCB0b2tlbiA9IGAoPzoke2Vtb2ppU2VnfXwke2R2RmllbGRUb2tlbn18JHtwcm9qZWN0V2lkZVRva2VufXwke2F0V2lkZVRva2VufXwke3RhZ1Rva2VufXwke2F0VG9rZW59KWA7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgdHJhaWxpbmcgPSBuZXcgUmVnRXhwKGAoPzpcXFxccyske3Rva2VufSkrJGApO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHRtID0gc2FuaXRpemVkLm1hdGNoKHRyYWlsaW5nKTtcclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gRXh0cmFjdCB0aGUgdGFzayBjb250ZW50IChldmVyeXRoaW5nIGJlZm9yZSB0cmFpbGluZyBtZXRhZGF0YSlcclxuXHRcdFx0XHRcdFx0XHRjb25zdCB0YXNrQ29udGVudFJhdyA9IHRtXHJcblx0XHRcdFx0XHRcdFx0XHQ/IGFmdGVyQ2hlY2tib3hcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQuc3Vic3RyaW5nKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0MCxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHNhbml0aXplZC5sZW5ndGggLVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQodG1bMF0/Lmxlbmd0aCB8fCAwKSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0LnRyaW0oKVxyXG5cdFx0XHRcdFx0XHRcdFx0OiBhZnRlckNoZWNrYm94LnRyaW0oKTtcclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gSWYgd2UgYXJlIHJlZ2VuZXJhdGluZyBtYW5hZ2VkIG1ldGFkYXRhLCBzY3J1YiBpbmxpbmUgcHJvamVjdCB0b2tlbnMgZnJvbSBjb250ZW50XHJcblx0XHRcdFx0XHRcdFx0bGV0IHRhc2tDb250ZW50ID0gdGFza0NvbnRlbnRSYXc7XHJcblx0XHRcdFx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IGR2UHJvamVjdEtleUlubGluZSA9XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnByb2plY3RUYWdQcmVmaXhcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQ/LmRhdGF2aWV3IHx8IFwicHJvamVjdFwiO1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgcHJvamVjdFByZWZpeFRhc2tzSW5saW5lID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvamVjdFRhZ1ByZWZpeFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdD8udGFza3MgfHwgXCJwcm9qZWN0XCI7XHJcblx0XHRcdFx0XHRcdFx0XHQvLyBSZW1vdmUgRGF0YXZpZXctc3R5bGUgaW5saW5lIHByb2plY3QgZmllbGRzIGFueXdoZXJlIGluIGNvbnRlbnRcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IGR2UHJvamVjdFJlID0gbmV3IFJlZ0V4cChcclxuXHRcdFx0XHRcdFx0XHRcdFx0YFxcXFxbXFxcXHMqJHtlc2MoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZHZQcm9qZWN0S2V5SW5saW5lLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHQpfVxcXFxzKjo6W15cXFxcXV0qXFxcXF1gLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcImdpXCIsXHJcblx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdFx0dGFza0NvbnRlbnQgPSB0YXNrQ29udGVudFxyXG5cdFx0XHRcdFx0XHRcdFx0XHQucmVwbGFjZShkdlByb2plY3RSZSwgXCJcIilcclxuXHRcdFx0XHRcdFx0XHRcdFx0LnRyaW0oKTtcclxuXHRcdFx0XHRcdFx0XHRcdC8vIFJlbW92ZSB0YXNrcy1zdHlsZSBpbmxpbmUgcHJvamVjdCB0YWdzIGxpa2UgI3Byb2plY3QveHh4IChzdG9wIGF0IG5leHQgd2hpdGVzcGFjZSlcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IHByb2plY3RJbmxpbmVSZSA9IG5ldyBSZWdFeHAoXHJcblx0XHRcdFx0XHRcdFx0XHRcdGAoXnxcXFxccykjJHtlc2MoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0cHJvamVjdFByZWZpeFRhc2tzSW5saW5lLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHQpfS9bXlxcXFxzI0ArXStgLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcImdcIixcclxuXHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0XHR0YXNrQ29udGVudCA9IHRhc2tDb250ZW50LnJlcGxhY2UoXHJcblx0XHRcdFx0XHRcdFx0XHRcdHByb2plY3RJbmxpbmVSZSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XCIkMVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdC8vIENvbGxhcHNlIGV4dHJhIHNwYWNlcyBsZWZ0IGJ5IHJlbW92YWxzXHJcblx0XHRcdFx0XHRcdFx0XHR0YXNrQ29udGVudCA9IHRhc2tDb250ZW50XHJcblx0XHRcdFx0XHRcdFx0XHRcdC5yZXBsYWNlKC9cXHN7Mix9L2csIFwiIFwiKVxyXG5cdFx0XHRcdFx0XHRcdFx0XHQudHJpbSgpO1xyXG5cdFx0XHRcdFx0XHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRcdFx0XHRcdC8vIEJlc3QtZWZmb3J0IGNsZWFudXA7IGlnbm9yZSByZWdleCBpc3N1ZXNcclxuXHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRcdFx0XCJlZGl0IGNvbnRlbnRcIixcclxuXHRcdFx0XHRcdFx0XHRcdHRhc2tDb250ZW50LFxyXG5cdFx0XHRcdFx0XHRcdFx0YWZ0ZXJDaGVja2JveCxcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRjb25zdCBtZXJnZWRNZCA9IHtcclxuXHRcdFx0XHRcdFx0XHRcdC4uLm9yaWdpbmFsVGFzay5tZXRhZGF0YSxcclxuXHRcdFx0XHRcdFx0XHRcdC4uLmFyZ3MudXBkYXRlcy5tZXRhZGF0YSxcclxuXHRcdFx0XHRcdFx0XHR9IGFzIGFueTtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBjb21wbGV0ZWRGbGFnID1cclxuXHRcdFx0XHRcdFx0XHRcdGFyZ3MudXBkYXRlcy5jb21wbGV0ZWQgIT09IHVuZGVmaW5lZFxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ/ICEhYXJncy51cGRhdGVzLmNvbXBsZXRlZFxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ6ICEhb3JpZ2luYWxUYXNrLmNvbXBsZXRlZDtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBuZXdNZXRhZGF0YSA9IHRoaXMuZ2VuZXJhdGVNZXRhZGF0YSh7XHJcblx0XHRcdFx0XHRcdFx0XHR0YWdzOiBtZXJnZWRNZC50YWdzLFxyXG5cdFx0XHRcdFx0XHRcdFx0cHJvamVjdDogbWVyZ2VkTWQucHJvamVjdCxcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnRleHQ6IG1lcmdlZE1kLmNvbnRleHQsXHJcblx0XHRcdFx0XHRcdFx0XHRwcmlvcml0eTogbWVyZ2VkTWQucHJpb3JpdHksXHJcblx0XHRcdFx0XHRcdFx0XHRzdGFydERhdGU6IG1lcmdlZE1kLnN0YXJ0RGF0ZSxcclxuXHRcdFx0XHRcdFx0XHRcdGR1ZURhdGU6IG1lcmdlZE1kLmR1ZURhdGUsXHJcblx0XHRcdFx0XHRcdFx0XHRzY2hlZHVsZWREYXRlOiBtZXJnZWRNZC5zY2hlZHVsZWREYXRlLFxyXG5cdFx0XHRcdFx0XHRcdFx0cmVjdXJyZW5jZTogbWVyZ2VkTWQucmVjdXJyZW5jZSxcclxuXHRcdFx0XHRcdFx0XHRcdGNvbXBsZXRlZDogY29tcGxldGVkRmxhZyxcclxuXHRcdFx0XHRcdFx0XHRcdGNvbXBsZXRlZERhdGU6IG1lcmdlZE1kLmNvbXBsZXRlZERhdGUsXHJcblx0XHRcdFx0XHRcdFx0XHRvbkNvbXBsZXRpb246IG1lcmdlZE1kLm9uQ29tcGxldGlvbixcclxuXHRcdFx0XHRcdFx0XHRcdGRlcGVuZHNPbjogbWVyZ2VkTWQuZGVwZW5kc09uLFxyXG5cdFx0XHRcdFx0XHRcdFx0aWQ6IG1lcmdlZE1kLmlkLFxyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRcdHRhc2tMaW5lID0gYCR7Y2hlY2tib3hQcmVmaXh9JHt0YXNrQ29udGVudH0ke1xyXG5cdFx0XHRcdFx0XHRcdFx0bmV3TWV0YWRhdGEgPyBgICR7bmV3TWV0YWRhdGF9YCA6IFwiXCJcclxuXHRcdFx0XHRcdFx0XHR9YDtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0bGluZXNbb3JpZ2luYWxUYXNrLmxpbmVdID0gdGFza0xpbmU7XHJcblxyXG5cdFx0XHQvLyBDaGVjayBpZiB0aGlzIGlzIGEgY29tcGxldGlvbiBvZiBhIHJlY3VycmluZyB0YXNrXHJcblx0XHRcdGNvbnN0IGlzQ29tcGxldGluZ1JlY3VycmluZ1Rhc2sgPVxyXG5cdFx0XHRcdCFvcmlnaW5hbFRhc2suY29tcGxldGVkICYmXHJcblx0XHRcdFx0YXJncy51cGRhdGVzLmNvbXBsZXRlZCA9PT0gdHJ1ZSAmJlxyXG5cdFx0XHRcdG9yaWdpbmFsVGFzay5tZXRhZGF0YT8ucmVjdXJyZW5jZTtcclxuXHJcblx0XHRcdC8vIElmIHRoaXMgaXMgYSBjb21wbGV0ZWQgcmVjdXJyaW5nIHRhc2ssIGNyZWF0ZSBhIG5ldyB0YXNrIHdpdGggdXBkYXRlZCBkYXRlc1xyXG5cdFx0XHRpZiAoaXNDb21wbGV0aW5nUmVjdXJyaW5nVGFzaykge1xyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRjb25zdCBpbmRlbnRNYXRjaCA9IHRhc2tMaW5lLm1hdGNoKC9eKFxccyopLyk7XHJcblx0XHRcdFx0XHRjb25zdCBpbmRlbnRhdGlvbiA9IGluZGVudE1hdGNoID8gaW5kZW50TWF0Y2hbMF0gOiBcIlwiO1xyXG5cdFx0XHRcdFx0Y29uc3QgbmV3VGFza0xpbmUgPSB0aGlzLmNyZWF0ZVJlY3VycmluZ1Rhc2soXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHQuLi5vcmlnaW5hbFRhc2ssXHJcblx0XHRcdFx0XHRcdFx0Li4uYXJncy51cGRhdGVzLFxyXG5cdFx0XHRcdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRcdFx0XHQuLi5vcmlnaW5hbFRhc2subWV0YWRhdGEsXHJcblx0XHRcdFx0XHRcdFx0XHQuLi4oYXJncy51cGRhdGVzLm1ldGFkYXRhIHx8IHt9KSxcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHR9IGFzIFRhc2ssXHJcblx0XHRcdFx0XHRcdGluZGVudGF0aW9uLFxyXG5cdFx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0XHQvLyBJbnNlcnQgdGhlIG5ldyB0YXNrIGxpbmUgYWZ0ZXIgdGhlIGN1cnJlbnQgdGFza1xyXG5cdFx0XHRcdFx0bGluZXMuc3BsaWNlKG9yaWdpbmFsVGFzay5saW5lICsgMSwgMCwgbmV3VGFza0xpbmUpO1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcdGBDcmVhdGVkIG5ldyByZWN1cnJpbmcgdGFzayBhZnRlciBsaW5lICR7b3JpZ2luYWxUYXNrLmxpbmV9YCxcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFcnJvciBjcmVhdGluZyByZWN1cnJpbmcgdGFzazpcIiwgZXJyb3IpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gTm90aWZ5IGFib3V0IHdyaXRlIG9wZXJhdGlvblxyXG5cdFx0XHRlbWl0KHRoaXMuYXBwLCBFdmVudHMuV1JJVEVfT1BFUkFUSU9OX1NUQVJULCB7XHJcblx0XHRcdFx0cGF0aDogZmlsZS5wYXRoLFxyXG5cdFx0XHRcdHRhc2tJZDogYXJncy50YXNrSWQsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRhd2FpdCB0aGlzLnZhdWx0Lm1vZGlmeShmaWxlLCBsaW5lcy5qb2luKFwiXFxuXCIpKTtcclxuXHJcblx0XHRcdC8vIENyZWF0ZSB0aGUgdXBkYXRlZCB0YXNrIG9iamVjdCB3aXRoIHRoZSBuZXcgY29udGVudFxyXG5cdFx0XHRjb25zdCB1cGRhdGVkVGFza09iajogVGFzayA9IHtcclxuXHRcdFx0XHQuLi5vcmlnaW5hbFRhc2ssXHJcblx0XHRcdFx0Li4uYXJncy51cGRhdGVzLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHQuLi5vcmlnaW5hbFRhc2subWV0YWRhdGEsXHJcblx0XHRcdFx0XHQuLi4oYXJncy51cGRhdGVzLm1ldGFkYXRhIHx8IHt9KSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IHRhc2tMaW5lLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gRW1pdCB3cml0ZSBvcGVyYXRpb24gY29tcGxldGVcclxuXHRcdFx0ZW1pdCh0aGlzLmFwcCwgRXZlbnRzLldSSVRFX09QRVJBVElPTl9DT01QTEVURSwge1xyXG5cdFx0XHRcdHBhdGg6IGZpbGUucGF0aCxcclxuXHRcdFx0XHR0YXNrSWQ6IGFyZ3MudGFza0lkLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIFRyaWdnZXIgdGFzay1jb21wbGV0ZWQgZXZlbnQgaWYgdGFzayB3YXMganVzdCBjb21wbGV0ZWRcclxuXHRcdFx0aWYgKGFyZ3MudXBkYXRlcy5jb21wbGV0ZWQgPT09IHRydWUgJiYgIW9yaWdpbmFsVGFzay5jb21wbGV0ZWQpIHtcclxuXHRcdFx0XHR0aGlzLmFwcC53b3Jrc3BhY2UudHJpZ2dlcihcclxuXHRcdFx0XHRcdFwidGFzay1nZW5pdXM6dGFzay1jb21wbGV0ZWRcIixcclxuXHRcdFx0XHRcdHVwZGF0ZWRUYXNrT2JqLFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIHRhc2s6IHVwZGF0ZWRUYXNrT2JqIH07XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiV3JpdGVBUEk6IEVycm9yIHVwZGF0aW5nIHRhc2s6XCIsIGVycm9yKTtcclxuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBTdHJpbmcoZXJyb3IpIH07XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgYSBmaWxlLXNvdXJjZSB0YXNrIChtb2RpZmllcyBmaWxlIGl0c2VsZiwgbm90IHRhc2sgY29udGVudClcclxuXHQgKi9cclxuXHRwcml2YXRlIGFzeW5jIHVwZGF0ZUZpbGVTb3VyY2VUYXNrKFxyXG5cdFx0b3JpZ2luYWxUYXNrOiBUYXNrLFxyXG5cdFx0dXBkYXRlczogUGFydGlhbDxUYXNrPixcclxuXHRcdHRhc2tJZDogc3RyaW5nLFxyXG5cdCk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyB0YXNrPzogVGFzazsgZXJyb3I/OiBzdHJpbmcgfT4ge1xyXG5cdFx0Y29uc3QgZmlsZSA9IHRoaXMudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFxyXG5cdFx0XHRvcmlnaW5hbFRhc2suZmlsZVBhdGgsXHJcblx0XHQpIGFzIFRGaWxlO1xyXG5cdFx0aWYgKCFmaWxlKSB7XHJcblx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJGaWxlIG5vdCBmb3VuZFwiIH07XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQW5ub3VuY2Ugc3RhcnQgb2Ygd3JpdGUgb3BlcmF0aW9uXHJcblx0XHRlbWl0KHRoaXMuYXBwLCBFdmVudHMuV1JJVEVfT1BFUkFUSU9OX1NUQVJULCB7XHJcblx0XHRcdHBhdGg6IGZpbGUucGF0aCxcclxuXHRcdFx0dGFza0lkLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gV2lsbCBiZSB1cGRhdGVkIGlmIGZpbGUgaXMgcmVuYW1lZFxyXG5cdFx0bGV0IG5ld0ZpbGVQYXRoID0gb3JpZ2luYWxUYXNrLmZpbGVQYXRoO1xyXG5cclxuXHRcdC8vIEhhbmRsZSBjb250ZW50IHVwZGF0ZXMgKGkuZS4sIHJlbmFtaW5nIHRoZSBmaWxlIGl0c2VsZilcclxuXHRcdGlmIChcclxuXHRcdFx0dXBkYXRlcy5jb250ZW50ICE9PSB1bmRlZmluZWQgJiZcclxuXHRcdFx0dXBkYXRlcy5jb250ZW50ICE9PSBvcmlnaW5hbFRhc2suY29udGVudFxyXG5cdFx0KSB7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Ly8gR2V0IGVmZmVjdGl2ZSBjb250ZW50IGZpZWxkIHNldHRpbmdzXHJcblx0XHRcdFx0Y29uc3Qgc2V0dGluZ3MgPVxyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuZmlsZVNvdXJjZT8uZmlsZVRhc2tQcm9wZXJ0aWVzIHx8IHt9O1xyXG5cdFx0XHRcdGNvbnN0IGRpc3BsYXlNb2RlID0gc2V0dGluZ3MuY29udGVudFNvdXJjZSB8fCBcImZpbGVuYW1lXCI7XHJcblx0XHRcdFx0Y29uc3QgcHJlZmVyRnJvbnRtYXR0ZXJUaXRsZSA9IHNldHRpbmdzLnByZWZlckZyb250bWF0dGVyVGl0bGU7XHJcblx0XHRcdFx0Y29uc3QgY3VzdG9tQ29udGVudEZpZWxkID0gKHNldHRpbmdzIGFzIGFueSkuY3VzdG9tQ29udGVudEZpZWxkO1xyXG5cclxuXHRcdFx0XHRzd2l0Y2ggKGRpc3BsYXlNb2RlKSB7XHJcblx0XHRcdFx0XHRjYXNlIFwidGl0bGVcIjoge1xyXG5cdFx0XHRcdFx0XHRhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoXHJcblx0XHRcdFx0XHRcdFx0ZmlsZSxcclxuXHRcdFx0XHRcdFx0XHQoZm0pID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdChmbSBhcyBhbnkpLnRpdGxlID0gdXBkYXRlcy5jb250ZW50O1xyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRcdFwiW1dyaXRlQVBJXVtGaWxlU291cmNlXSB3cm90ZSBmbS50aXRsZSAoYnJhbmNoOiB0aXRsZSlcIixcclxuXHRcdFx0XHRcdFx0XHR7IHRpdGxlOiB1cGRhdGVzLmNvbnRlbnQgfSxcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0Y29uc3QgY2FjaGVBZnRlciA9XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRcdFwiW1dyaXRlQVBJXVtGaWxlU291cmNlXSBjYWNoZSBmbS50aXRsZSBhZnRlciB3cml0ZSAoYnJhbmNoOiB0aXRsZSlcIixcclxuXHRcdFx0XHRcdFx0XHR7IHRpdGxlOiBjYWNoZUFmdGVyPy5mcm9udG1hdHRlcj8udGl0bGUgfSxcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRjYXNlIFwiaDFcIjoge1xyXG5cdFx0XHRcdFx0XHRhd2FpdCB0aGlzLnVwZGF0ZUgxSGVhZGluZyhmaWxlLCB1cGRhdGVzLmNvbnRlbnQhKTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRjYXNlIFwiY3VzdG9tXCI6IHtcclxuXHRcdFx0XHRcdFx0aWYgKGN1c3RvbUNvbnRlbnRGaWVsZCkge1xyXG5cdFx0XHRcdFx0XHRcdGF3YWl0IHRoaXMuYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihcclxuXHRcdFx0XHRcdFx0XHRcdGZpbGUsXHJcblx0XHRcdFx0XHRcdFx0XHQoZm0pID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0KGZtIGFzIGFueSlbY3VzdG9tQ29udGVudEZpZWxkXSA9XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0dXBkYXRlcy5jb250ZW50O1xyXG5cdFx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRcdFx0XCJbV3JpdGVBUEldW0ZpbGVTb3VyY2VdIHdyb3RlIGZtW2N1c3RvbUNvbnRlbnRGaWVsZF0gKGJyYW5jaDogY3VzdG9tKVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRmaWVsZDogY3VzdG9tQ29udGVudEZpZWxkLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR2YWx1ZTogdXBkYXRlcy5jb250ZW50LFxyXG5cdFx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGNhY2hlQWZ0ZXIgPVxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk7XHJcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcdFx0XHRcIltXcml0ZUFQSV1bRmlsZVNvdXJjZV0gY2FjaGUgZm1bY3VzdG9tQ29udGVudEZpZWxkXSBhZnRlciB3cml0ZSAoYnJhbmNoOiBjdXN0b20pXCIsXHJcblx0XHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGZpZWxkOiBjdXN0b21Db250ZW50RmllbGQsXHJcblx0XHRcdFx0XHRcdFx0XHRcdHZhbHVlOiBjYWNoZUFmdGVyPy5mcm9udG1hdHRlcj8uW1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGN1c3RvbUNvbnRlbnRGaWVsZFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRdLFxyXG5cdFx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKHByZWZlckZyb250bWF0dGVyVGl0bGUpIHtcclxuXHRcdFx0XHRcdFx0XHRhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoXHJcblx0XHRcdFx0XHRcdFx0XHRmaWxlLFxyXG5cdFx0XHRcdFx0XHRcdFx0KGZtKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdChmbSBhcyBhbnkpLnRpdGxlID0gdXBkYXRlcy5jb250ZW50O1xyXG5cdFx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRcdFx0XCJbV3JpdGVBUEldW0ZpbGVTb3VyY2VdIHdyb3RlIGZtLnRpdGxlIChicmFuY2g6IGN1c3RvbSBmYWxsYmFjaylcIixcclxuXHRcdFx0XHRcdFx0XHRcdHsgdGl0bGU6IHVwZGF0ZXMuY29udGVudCB9LFxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgY2FjaGVBZnRlcjIgPVxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk7XHJcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcdFx0XHRcIltXcml0ZUFQSV1bRmlsZVNvdXJjZV0gY2FjaGUgZm0udGl0bGUgYWZ0ZXIgd3JpdGUgKGJyYW5jaDogY3VzdG9tIGZhbGxiYWNrKVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0eyB0aXRsZTogY2FjaGVBZnRlcjI/LmZyb250bWF0dGVyPy50aXRsZSB9LFxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0bmV3RmlsZVBhdGggPSBhd2FpdCB0aGlzLnJlbmFtZUZpbGUoXHJcblx0XHRcdFx0XHRcdFx0XHRmaWxlLFxyXG5cdFx0XHRcdFx0XHRcdFx0dXBkYXRlcy5jb250ZW50ISxcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRcdFx0XCJbV3JpdGVBUEldW0ZpbGVTb3VyY2VdIHJlbmFtZWQgZmlsZSAoYnJhbmNoOiBjdXN0b20gZmFsbGJhY2spXCIsXHJcblx0XHRcdFx0XHRcdFx0XHR7IG5ld0ZpbGVQYXRoIH0sXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGNhc2UgXCJmaWxlbmFtZVwiOlxyXG5cdFx0XHRcdFx0ZGVmYXVsdDoge1xyXG5cdFx0XHRcdFx0XHRpZiAocHJlZmVyRnJvbnRtYXR0ZXJUaXRsZSkge1xyXG5cdFx0XHRcdFx0XHRcdGF3YWl0IHRoaXMuYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihcclxuXHRcdFx0XHRcdFx0XHRcdGZpbGUsXHJcblx0XHRcdFx0XHRcdFx0XHQoZm0pID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0KGZtIGFzIGFueSkudGl0bGUgPSB1cGRhdGVzLmNvbnRlbnQ7XHJcblx0XHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcdFx0XHRcIltXcml0ZUFQSV1bRmlsZVNvdXJjZV0gd3JvdGUgZm0udGl0bGUgKGJyYW5jaDogZmlsZW5hbWUvZGVmYXVsdClcIixcclxuXHRcdFx0XHRcdFx0XHRcdHsgdGl0bGU6IHVwZGF0ZXMuY29udGVudCB9LFxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgY2FjaGVBZnRlciA9XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKTtcclxuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdFx0XHRcdFwiW1dyaXRlQVBJXVtGaWxlU291cmNlXSBjYWNoZSBmbS50aXRsZSBhZnRlciB3cml0ZSAoYnJhbmNoOiBmaWxlbmFtZS9kZWZhdWx0KVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0eyB0aXRsZTogY2FjaGVBZnRlcj8uZnJvbnRtYXR0ZXI/LnRpdGxlIH0sXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRuZXdGaWxlUGF0aCA9IGF3YWl0IHRoaXMucmVuYW1lRmlsZShcclxuXHRcdFx0XHRcdFx0XHRcdGZpbGUsXHJcblx0XHRcdFx0XHRcdFx0XHR1cGRhdGVzLmNvbnRlbnQhLFxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcdFx0XHRcIltXcml0ZUFQSV1bRmlsZVNvdXJjZV0gcmVuYW1lZCBmaWxlIChicmFuY2g6IGZpbGVuYW1lL2RlZmF1bHQpXCIsXHJcblx0XHRcdFx0XHRcdFx0XHR7IG5ld0ZpbGVQYXRoIH0sXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIEFubm91bmNlIGNvbXBsZXRpb24gb2Ygd3JpdGUgb3BlcmF0aW9uXHJcblx0XHRcdFx0ZW1pdCh0aGlzLmFwcCwgRXZlbnRzLldSSVRFX09QRVJBVElPTl9DT01QTEVURSwge1xyXG5cdFx0XHRcdFx0cGF0aDogbmV3RmlsZVBhdGgsXHJcblx0XHRcdFx0XHR0YXNrSWQsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcihcclxuXHRcdFx0XHRcdFwiV3JpdGVBUEk6IEVycm9yIHVwZGF0aW5nIGZpbGUtc291cmNlIHRhc2sgY29udGVudDpcIixcclxuXHRcdFx0XHRcdGVycm9yLFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0cmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBTdHJpbmcoZXJyb3IpIH07XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBCdWlsZCB0aGUgdXBkYXRlZCB0YXNrIG9iamVjdFxyXG5cdFx0Y29uc3QgdXBkYXRlZFRhc2tPYmo6IFRhc2sgPSB7XHJcblx0XHRcdC4uLm9yaWdpbmFsVGFzayxcclxuXHRcdFx0Li4udXBkYXRlcyxcclxuXHRcdFx0ZmlsZVBhdGg6IG5ld0ZpbGVQYXRoLFxyXG5cdFx0XHQvLyBLZWVwIGlkIGluIHN5bmMgd2l0aCBGaWxlU291cmNlIGNvbnZlbnRpb24gd2hlbiBwYXRoIGNoYW5nZXNcclxuXHRcdFx0aWQ6XHJcblx0XHRcdFx0b3JpZ2luYWxUYXNrLmlkLnN0YXJ0c1dpdGgoXCJmaWxlLXNvdXJjZTpcIikgJiZcclxuXHRcdFx0XHRuZXdGaWxlUGF0aCAhPT0gb3JpZ2luYWxUYXNrLmZpbGVQYXRoXHJcblx0XHRcdFx0XHQ/IGBmaWxlLXNvdXJjZToke25ld0ZpbGVQYXRofWBcclxuXHRcdFx0XHRcdDogb3JpZ2luYWxUYXNrLmlkLFxyXG5cdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBgWyR7XHJcblx0XHRcdFx0dXBkYXRlcy5jb250ZW50ID8/IG9yaWdpbmFsVGFzay5jb250ZW50XHJcblx0XHRcdH1dKCR7bmV3RmlsZVBhdGh9KWAsXHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIEVtaXQgZmlsZS10YXNrIHVwZGF0ZSBzbyByZXBvc2l0b3J5IHVwZGF0ZXMgZmlsZVRhc2tzIG1hcCBkaXJlY3RseVxyXG5cdFx0ZW1pdCh0aGlzLmFwcCwgRXZlbnRzLkZJTEVfVEFTS19VUERBVEVELCB7IHRhc2s6IHVwZGF0ZWRUYXNrT2JqIH0pO1xyXG5cclxuXHRcdHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIHRhc2s6IHVwZGF0ZWRUYXNrT2JqIH07XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIHVwZGF0ZUgxSGVhZGluZyhcclxuXHRcdGZpbGU6IFRGaWxlLFxyXG5cdFx0bmV3SGVhZGluZzogc3RyaW5nLFxyXG5cdCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Y29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMudmF1bHQucmVhZChmaWxlKTtcclxuXHRcdGNvbnN0IGxpbmVzID0gY29udGVudC5zcGxpdChcIlxcblwiKTtcclxuXHRcdC8vIEZpbmQgZmlyc3QgSDEgYWZ0ZXIgb3B0aW9uYWwgZnJvbnRtYXR0ZXJcclxuXHRcdGxldCBoMUluZGV4ID0gLTE7XHJcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGlmIChsaW5lc1tpXS5zdGFydHNXaXRoKFwiIyBcIikpIHtcclxuXHRcdFx0XHRoMUluZGV4ID0gaTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0aWYgKGgxSW5kZXggPj0gMCkge1xyXG5cdFx0XHRsaW5lc1toMUluZGV4XSA9IGAjICR7bmV3SGVhZGluZ31gO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0bGV0IGluc2VydEluZGV4ID0gMDtcclxuXHRcdFx0aWYgKGNvbnRlbnQuc3RhcnRzV2l0aChcIi0tLVwiKSkge1xyXG5cdFx0XHRcdGNvbnN0IGZtRW5kID0gY29udGVudC5pbmRleE9mKFwiXFxuLS0tXFxuXCIsIDMpO1xyXG5cdFx0XHRcdGlmIChmbUVuZCA+PSAwKSB7XHJcblx0XHRcdFx0XHRjb25zdCBmbUxpbmVzID1cclxuXHRcdFx0XHRcdFx0Y29udGVudC5zdWJzdHJpbmcoMCwgZm1FbmQgKyA1KS5zcGxpdChcIlxcblwiKS5sZW5ndGggLSAxO1xyXG5cdFx0XHRcdFx0aW5zZXJ0SW5kZXggPSBmbUxpbmVzO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRsaW5lcy5zcGxpY2UoaW5zZXJ0SW5kZXgsIDAsIGAjICR7bmV3SGVhZGluZ31gLCBcIlwiKTtcclxuXHRcdH1cclxuXHRcdGF3YWl0IHRoaXMudmF1bHQubW9kaWZ5KGZpbGUsIGxpbmVzLmpvaW4oXCJcXG5cIikpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyByZW5hbWVGaWxlKGZpbGU6IFRGaWxlLCBuZXdUaXRsZTogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcclxuXHRcdGNvbnN0IGN1cnJlbnRQYXRoID0gZmlsZS5wYXRoO1xyXG5cdFx0Y29uc3QgbGFzdFNsYXNoID0gY3VycmVudFBhdGgubGFzdEluZGV4T2YoXCIvXCIpO1xyXG5cdFx0Y29uc3QgZGlyZWN0b3J5ID1cclxuXHRcdFx0bGFzdFNsYXNoID4gMCA/IGN1cnJlbnRQYXRoLnN1YnN0cmluZygwLCBsYXN0U2xhc2gpIDogXCJcIjtcclxuXHRcdGNvbnN0IGV4dGVuc2lvbiA9IGN1cnJlbnRQYXRoLnN1YnN0cmluZyhjdXJyZW50UGF0aC5sYXN0SW5kZXhPZihcIi5cIikpO1xyXG5cdFx0Y29uc3Qgc2FuaXRpemVkID0gdGhpcy5zYW5pdGl6ZUZpbGVOYW1lKG5ld1RpdGxlKTtcclxuXHRcdGNvbnN0IG5ld1BhdGggPSBkaXJlY3RvcnlcclxuXHRcdFx0PyBgJHtkaXJlY3Rvcnl9LyR7c2FuaXRpemVkfSR7ZXh0ZW5zaW9ufWBcclxuXHRcdFx0OiBgJHtzYW5pdGl6ZWR9JHtleHRlbnNpb259YDtcclxuXHRcdGlmIChuZXdQYXRoICE9PSBjdXJyZW50UGF0aCkge1xyXG5cdFx0XHRhd2FpdCB0aGlzLnZhdWx0LnJlbmFtZShmaWxlLCBuZXdQYXRoKTtcclxuXHRcdH1cclxuXHRcdHJldHVybiBuZXdQYXRoO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBzYW5pdGl6ZUZpbGVOYW1lKG5hbWU6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHRyZXR1cm4gbmFtZS5yZXBsYWNlKC9bPD46XCIvXFxcXHw/Kl0vZywgXCJfXCIpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ3JlYXRlIGEgbmV3IHRhc2tcclxuXHQgKi9cclxuXHRhc3luYyBjcmVhdGVUYXNrKFxyXG5cdFx0YXJnczogQ3JlYXRlVGFza0FyZ3MsXHJcblx0KTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IHRhc2s/OiBUYXNrOyBlcnJvcj86IHN0cmluZyB9PiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRsZXQgZmlsZVBhdGggPSBhcmdzLmZpbGVQYXRoO1xyXG5cclxuXHRcdFx0aWYgKCFmaWxlUGF0aCkge1xyXG5cdFx0XHRcdGNvbnN0IGFjdGl2ZUZpbGUgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlRmlsZSgpO1xyXG5cdFx0XHRcdGlmIChhY3RpdmVGaWxlKSB7XHJcblx0XHRcdFx0XHRmaWxlUGF0aCA9IGFjdGl2ZUZpbGUucGF0aDtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdFx0c3VjY2VzczogZmFsc2UsXHJcblx0XHRcdFx0XHRcdGVycm9yOiBcIk5vIGZpbGVQYXRoIHByb3ZpZGVkIGFuZCBubyBhY3RpdmUgZmlsZVwiLFxyXG5cdFx0XHRcdFx0fTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IGZpbGUgPSB0aGlzLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChmaWxlUGF0aCkgYXMgVEZpbGU7XHJcblx0XHRcdGlmICghZmlsZSkge1xyXG5cdFx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJGaWxlIG5vdCBmb3VuZFwiIH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLnZhdWx0LnJlYWQoZmlsZSk7XHJcblxyXG5cdFx0XHQvLyBCdWlsZCB0YXNrIGNvbnRlbnRcclxuXHRcdFx0Y29uc3QgY2hlY2tib3hTdGF0ZSA9IGFyZ3MuY29tcGxldGVkID8gXCJbeF1cIiA6IFwiWyBdXCI7XHJcblx0XHRcdGxldCB0YXNrQ29udGVudCA9IGAtICR7Y2hlY2tib3hTdGF0ZX0gJHthcmdzLmNvbnRlbnR9YDtcclxuXHRcdFx0Y29uc3QgbWV0YWRhdGEgPSB0aGlzLmdlbmVyYXRlTWV0YWRhdGEoe1xyXG5cdFx0XHRcdHRhZ3M6IGFyZ3MudGFncyxcclxuXHRcdFx0XHRwcm9qZWN0OiBhcmdzLnByb2plY3QsXHJcblx0XHRcdFx0Y29udGV4dDogYXJncy5jb250ZXh0LFxyXG5cdFx0XHRcdHByaW9yaXR5OiBhcmdzLnByaW9yaXR5LFxyXG5cdFx0XHRcdHN0YXJ0RGF0ZTogYXJncy5zdGFydERhdGVcclxuXHRcdFx0XHRcdD8gbW9tZW50KGFyZ3Muc3RhcnREYXRlKS52YWx1ZU9mKClcclxuXHRcdFx0XHRcdDogdW5kZWZpbmVkLFxyXG5cdFx0XHRcdGR1ZURhdGU6IGFyZ3MuZHVlRGF0ZVxyXG5cdFx0XHRcdFx0PyBtb21lbnQoYXJncy5kdWVEYXRlKS52YWx1ZU9mKClcclxuXHRcdFx0XHRcdDogdW5kZWZpbmVkLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogYXJncy5jb21wbGV0ZWQsXHJcblx0XHRcdFx0Y29tcGxldGVkRGF0ZTogYXJncy5jb21wbGV0ZWREYXRlXHJcblx0XHRcdFx0XHQ/IG1vbWVudChhcmdzLmNvbXBsZXRlZERhdGUpLnZhbHVlT2YoKVxyXG5cdFx0XHRcdFx0OiB1bmRlZmluZWQsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRpZiAobWV0YWRhdGEpIHtcclxuXHRcdFx0XHR0YXNrQ29udGVudCArPSBgICR7bWV0YWRhdGF9YDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0bGV0IG5ld0NvbnRlbnQgPSBjb250ZW50O1xyXG5cdFx0XHRpZiAoYXJncy5wYXJlbnQpIHtcclxuXHRcdFx0XHQvLyBJbnNlcnQgYXMgc3VidGFza1xyXG5cdFx0XHRcdG5ld0NvbnRlbnQgPSB0aGlzLmluc2VydFN1YnRhc2soXHJcblx0XHRcdFx0XHRjb250ZW50LFxyXG5cdFx0XHRcdFx0YXJncy5wYXJlbnQsXHJcblx0XHRcdFx0XHR0YXNrQ29udGVudCxcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIEFwcGVuZCB0byBlbmQgb2YgZmlsZVxyXG5cdFx0XHRcdG5ld0NvbnRlbnQgPSBjb250ZW50XHJcblx0XHRcdFx0XHQ/IGAke2NvbnRlbnR9XFxuJHt0YXNrQ29udGVudH1gXHJcblx0XHRcdFx0XHQ6IHRhc2tDb250ZW50O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBOb3RpZnkgYWJvdXQgd3JpdGUgb3BlcmF0aW9uXHJcblx0XHRcdGVtaXQodGhpcy5hcHAsIEV2ZW50cy5XUklURV9PUEVSQVRJT05fU1RBUlQsIHsgcGF0aDogZmlsZS5wYXRoIH0pO1xyXG5cdFx0XHRhd2FpdCB0aGlzLnZhdWx0Lm1vZGlmeShmaWxlLCBuZXdDb250ZW50KTtcclxuXHRcdFx0ZW1pdCh0aGlzLmFwcCwgRXZlbnRzLldSSVRFX09QRVJBVElPTl9DT01QTEVURSwge1xyXG5cdFx0XHRcdHBhdGg6IGZpbGUucGF0aCxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiV3JpdGVBUEk6IEVycm9yIGNyZWF0aW5nIHRhc2s6XCIsIGVycm9yKTtcclxuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBTdHJpbmcoZXJyb3IpIH07XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBEZWxldGUgYSB0YXNrIGFuZCBvcHRpb25hbGx5IGl0cyBjaGlsZHJlblxyXG5cdCAqL1xyXG5cdGFzeW5jIGRlbGV0ZVRhc2soXHJcblx0XHRhcmdzOiBEZWxldGVUYXNrQXJncyxcclxuXHQpOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgZXJyb3I/OiBzdHJpbmcgfT4ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgdGFzayA9IGF3YWl0IFByb21pc2UucmVzb2x2ZSh0aGlzLmdldFRhc2tCeUlkKGFyZ3MudGFza0lkKSk7XHJcblx0XHRcdGlmICghdGFzaykge1xyXG5cdFx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJUYXNrIG5vdCBmb3VuZFwiIH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENoZWNrIGlmIHRoaXMgaXMgYSBDYW52YXMgdGFza1xyXG5cdFx0XHRpZiAoQ2FudmFzVGFza1VwZGF0ZXIuaXNDYW52YXNUYXNrKHRhc2spKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuZGVsZXRlQ2FudmFzVGFzayhhcmdzKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgZmlsZSA9IHRoaXMudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFxyXG5cdFx0XHRcdHRhc2suZmlsZVBhdGgsXHJcblx0XHRcdCkgYXMgVEZpbGU7XHJcblx0XHRcdGlmICghZmlsZSkge1xyXG5cdFx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJGaWxlIG5vdCBmb3VuZFwiIH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLnZhdWx0LnJlYWQoZmlsZSk7XHJcblx0XHRcdGNvbnN0IGxpbmVzID0gY29udGVudC5zcGxpdChcIlxcblwiKTtcclxuXHJcblx0XHRcdC8vIENvbGxlY3QgYWxsIHRhc2tzIHRvIGRlbGV0ZVxyXG5cdFx0XHRjb25zdCBkZWxldGVkVGFza0lkczogc3RyaW5nW10gPSBbYXJncy50YXNrSWRdO1xyXG5cclxuXHRcdFx0aWYgKGFyZ3MuZGVsZXRlQ2hpbGRyZW4pIHtcclxuXHRcdFx0XHQvLyBHZXQgYWxsIGRlc2NlbmRhbnQgdGFza3NcclxuXHRcdFx0XHRjb25zdCBkZXNjZW5kYW50SWRzID0gYXdhaXQgdGhpcy5nZXREZXNjZW5kYW50VGFza0lkcyhcclxuXHRcdFx0XHRcdGFyZ3MudGFza0lkLFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0ZGVsZXRlZFRhc2tJZHMucHVzaCguLi5kZXNjZW5kYW50SWRzKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gR2V0IGFsbCB0YXNrIGxpbmUgbnVtYmVycyB0byBkZWxldGVcclxuXHRcdFx0Y29uc3QgbGluZXNUb0RlbGV0ZSA9IG5ldyBTZXQ8bnVtYmVyPigpO1xyXG5cdFx0XHRmb3IgKGNvbnN0IHRhc2tJZCBvZiBkZWxldGVkVGFza0lkcykge1xyXG5cdFx0XHRcdGNvbnN0IHRhc2sgPSBhd2FpdCBQcm9taXNlLnJlc29sdmUodGhpcy5nZXRUYXNrQnlJZCh0YXNrSWQpKTtcclxuXHRcdFx0XHRpZiAodGFzayAmJiB0YXNrLmZpbGVQYXRoID09PSBmaWxlLnBhdGgpIHtcclxuXHRcdFx0XHRcdGxpbmVzVG9EZWxldGUuYWRkKHRhc2subGluZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBEZWxldGUgbGluZXMgZnJvbSBib3R0b20gdG8gdG9wIHRvIG1haW50YWluIGxpbmUgbnVtYmVyc1xyXG5cdFx0XHRjb25zdCBzb3J0ZWRMaW5lcyA9IEFycmF5LmZyb20obGluZXNUb0RlbGV0ZSkuc29ydCgoYSwgYikgPT4gYiAtIGEpO1xyXG5cdFx0XHRmb3IgKGNvbnN0IGxpbmVOdW0gb2Ygc29ydGVkTGluZXMpIHtcclxuXHRcdFx0XHRsaW5lcy5zcGxpY2UobGluZU51bSwgMSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIE5vdGlmeSBhYm91dCB3cml0ZSBvcGVyYXRpb25cclxuXHRcdFx0ZW1pdCh0aGlzLmFwcCwgRXZlbnRzLldSSVRFX09QRVJBVElPTl9TVEFSVCwge1xyXG5cdFx0XHRcdHBhdGg6IGZpbGUucGF0aCxcclxuXHRcdFx0XHR0YXNrSWQ6IGFyZ3MudGFza0lkLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0YXdhaXQgdGhpcy52YXVsdC5tb2RpZnkoZmlsZSwgbGluZXMuam9pbihcIlxcblwiKSk7XHJcblx0XHRcdGVtaXQodGhpcy5hcHAsIEV2ZW50cy5XUklURV9PUEVSQVRJT05fQ09NUExFVEUsIHtcclxuXHRcdFx0XHRwYXRoOiBmaWxlLnBhdGgsXHJcblx0XHRcdFx0dGFza0lkOiBhcmdzLnRhc2tJZCxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBFbWl0IFRBU0tfREVMRVRFRCBldmVudCB3aXRoIGFsbCBkZWxldGVkIHRhc2sgSURzXHJcblx0XHRcdGVtaXQodGhpcy5hcHAsIEV2ZW50cy5UQVNLX0RFTEVURUQsIHtcclxuXHRcdFx0XHR0YXNrSWQ6IGFyZ3MudGFza0lkLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiB0YXNrLmZpbGVQYXRoLFxyXG5cdFx0XHRcdGRlbGV0ZWRUYXNrSWRzLFxyXG5cdFx0XHRcdG1vZGU6IGFyZ3MuZGVsZXRlQ2hpbGRyZW4gPyBcInN1YnRyZWVcIiA6IFwic2luZ2xlXCIsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIldyaXRlQVBJOiBFcnJvciBkZWxldGluZyB0YXNrOlwiLCBlcnJvcik7XHJcblx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogU3RyaW5nKGVycm9yKSB9O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQmF0Y2ggdXBkYXRlIHRleHQgaW4gbXVsdGlwbGUgdGFza3NcclxuXHQgKi9cclxuXHRhc3luYyBiYXRjaFVwZGF0ZVRleHQoXHJcblx0XHRhcmdzOiBCYXRjaFVwZGF0ZVRleHRBcmdzLFxyXG5cdCk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyB1cGRhdGVkQ291bnQ6IG51bWJlcjsgZXJyb3I/OiBzdHJpbmcgfT4ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0bGV0IHVwZGF0ZWRDb3VudCA9IDA7XHJcblx0XHRcdGNvbnN0IGZpbGVVcGRhdGVzID0gbmV3IE1hcDxzdHJpbmcsIE1hcDxudW1iZXIsIHN0cmluZz4+KCk7XHJcblxyXG5cdFx0XHQvLyBHcm91cCB0YXNrcyBieSBmaWxlXHJcblx0XHRcdGZvciAoY29uc3QgdGFza0lkIG9mIGFyZ3MudGFza0lkcykge1xyXG5cdFx0XHRcdGNvbnN0IHRhc2sgPSBhd2FpdCBQcm9taXNlLnJlc29sdmUodGhpcy5nZXRUYXNrQnlJZCh0YXNrSWQpKTtcclxuXHRcdFx0XHRpZiAoIXRhc2spIGNvbnRpbnVlO1xyXG5cclxuXHRcdFx0XHQvLyBTa2lwIENhbnZhcyB0YXNrc1xyXG5cdFx0XHRcdGlmIChDYW52YXNUYXNrVXBkYXRlci5pc0NhbnZhc1Rhc2sodGFzaykpIGNvbnRpbnVlO1xyXG5cclxuXHRcdFx0XHQvLyBVcGRhdGUgdGhlIHRhc2sgY29udGVudFxyXG5cdFx0XHRcdGNvbnN0IHVwZGF0ZWRDb250ZW50ID0gdGFzay5jb250ZW50LnJlcGxhY2UoXHJcblx0XHRcdFx0XHRhcmdzLmZpbmRUZXh0LFxyXG5cdFx0XHRcdFx0YXJncy5yZXBsYWNlVGV4dCxcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGlmICh1cGRhdGVkQ29udGVudCAhPT0gdGFzay5jb250ZW50KSB7XHJcblx0XHRcdFx0XHRpZiAoIWZpbGVVcGRhdGVzLmhhcyh0YXNrLmZpbGVQYXRoKSkge1xyXG5cdFx0XHRcdFx0XHRmaWxlVXBkYXRlcy5zZXQodGFzay5maWxlUGF0aCwgbmV3IE1hcCgpKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGZpbGVVcGRhdGVzXHJcblx0XHRcdFx0XHRcdC5nZXQodGFzay5maWxlUGF0aCkhXHJcblx0XHRcdFx0XHRcdC5zZXQodGFzay5saW5lLCB1cGRhdGVkQ29udGVudCk7XHJcblx0XHRcdFx0XHR1cGRhdGVkQ291bnQrKztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEFwcGx5IHVwZGF0ZXMgdG8gZmlsZXNcclxuXHRcdFx0Zm9yIChjb25zdCBbZmlsZVBhdGgsIGxpbmVVcGRhdGVzXSBvZiBmaWxlVXBkYXRlcykge1xyXG5cdFx0XHRcdGNvbnN0IGZpbGUgPSB0aGlzLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChcclxuXHRcdFx0XHRcdGZpbGVQYXRoLFxyXG5cdFx0XHRcdCkgYXMgVEZpbGU7XHJcblx0XHRcdFx0aWYgKCFmaWxlKSBjb250aW51ZTtcclxuXHJcblx0XHRcdFx0Y29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMudmF1bHQucmVhZChmaWxlKTtcclxuXHRcdFx0XHRjb25zdCBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoXCJcXG5cIik7XHJcblxyXG5cdFx0XHRcdGZvciAoY29uc3QgW2xpbmVOdW0sIG5ld0NvbnRlbnRdIG9mIGxpbmVVcGRhdGVzKSB7XHJcblx0XHRcdFx0XHRpZiAobGluZU51bSA+PSAwICYmIGxpbmVOdW0gPCBsaW5lcy5sZW5ndGgpIHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgdGFza0xpbmUgPSBsaW5lc1tsaW5lTnVtXTtcclxuXHRcdFx0XHRcdFx0Y29uc3QgcHJlZml4TWF0Y2ggPSB0YXNrTGluZS5tYXRjaChcclxuXHRcdFx0XHRcdFx0XHQvXihcXHMqWy0qK11cXHMqXFxbW15cXF1dKlxcXVxccyopLyxcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0aWYgKHByZWZpeE1hdGNoKSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgcHJlZml4ID0gcHJlZml4TWF0Y2hbMV07XHJcblx0XHRcdFx0XHRcdFx0Ly8gUHJlc2VydmUgdHJhaWxpbmcgbWV0YWRhdGEgKHN0cmljdCB0cmFpbGluZy1vbmx5LCByZWNvZ25pemVkIGtleXMpXHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgYWZ0ZXJQcmVmaXgyID0gdGFza0xpbmUuc3Vic3RyaW5nKFxyXG5cdFx0XHRcdFx0XHRcdFx0cHJlZml4Lmxlbmd0aCxcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHNhbml0aXplZDMgPSBhZnRlclByZWZpeDJcclxuXHRcdFx0XHRcdFx0XHRcdC5yZXBsYWNlKC9cXFtcXFtbXlxcXV0qXFxdXFxdL2csIChtKSA9PlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcInhcIi5yZXBlYXQobS5sZW5ndGgpLFxyXG5cdFx0XHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHRcdFx0LnJlcGxhY2UoL1xcW1teXFxdXSpcXF1cXChbXlxcKV0qXFwpL2csIChtKSA9PlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcInhcIi5yZXBlYXQobS5sZW5ndGgpLFxyXG5cdFx0XHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHRcdFx0LnJlcGxhY2UoL2BbXmBdKmAvZywgKG0pID0+XHJcblx0XHRcdFx0XHRcdFx0XHRcdFwieFwiLnJlcGVhdChtLmxlbmd0aCksXHJcblx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGVzYzMgPSAoczogc3RyaW5nKSA9PlxyXG5cdFx0XHRcdFx0XHRcdFx0cy5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxdXFxcXF0vZywgXCJcXFxcJCZcIik7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgcHJvamVjdEtleTMgPVxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvamVjdFRhZ1ByZWZpeFxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ/LmRhdGF2aWV3IHx8IFwicHJvamVjdFwiO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGNvbnRleHRLZXkzID1cclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbnRleHRUYWdQcmVmaXhcclxuXHRcdFx0XHRcdFx0XHRcdFx0Py5kYXRhdmlldyB8fCBcImNvbnRleHRcIjtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBkdktleXNHcm91cDMgPSBbXHJcblx0XHRcdFx0XHRcdFx0XHRcInRhZ3NcIixcclxuXHRcdFx0XHRcdFx0XHRcdGVzYzMocHJvamVjdEtleTMpLFxyXG5cdFx0XHRcdFx0XHRcdFx0ZXNjMyhjb250ZXh0S2V5MyksXHJcblx0XHRcdFx0XHRcdFx0XHRcInByaW9yaXR5XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcInJlcGVhdFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XCJzdGFydFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XCJzY2hlZHVsZWRcIixcclxuXHRcdFx0XHRcdFx0XHRcdFwiZHVlXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcImNvbXBsZXRpb25cIixcclxuXHRcdFx0XHRcdFx0XHRcdFwiY2FuY2VsbGVkXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcIm9uQ29tcGxldGlvblwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XCJkZXBlbmRzT25cIixcclxuXHRcdFx0XHRcdFx0XHRcdFwiaWRcIixcclxuXHRcdFx0XHRcdFx0XHRdLmpvaW4oXCJ8XCIpO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGJhc2VFbW9qaTMgPVxyXG5cdFx0XHRcdFx0XHRcdFx0XCIo8J+Uunzij6t88J+UvHzwn5S9fOKPrHzwn5urfOKPs3zwn5OFfOKchXzwn5SBKVwiO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGR2RmllbGRUb2tlbjMgPSBgXFxcXFsoPzoke2R2S2V5c0dyb3VwM30pXFxcXHMqOjpbXlxcXFxdXSpcXFxcXWA7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgdGFnVG9rZW4zID0gRU1PSklfVEFHX1JFR0VYLnNvdXJjZTtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBhdFRva2VuMyA9IFRPS0VOX0NPTlRFWFRfUkVHRVguc291cmNlO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGVtb2ppU2VnMyA9IGAoPzoke2Jhc2VFbW9qaTN9W15cXFxcbl0qKWA7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgdG9rZW4zID0gYCg/OiR7ZW1vamlTZWczfXwke2R2RmllbGRUb2tlbjN9fCR7dGFnVG9rZW4zfXwke2F0VG9rZW4zfSlgO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHRyYWlsaW5nMyA9IG5ldyBSZWdFeHAoYCg/OlxcXFxzKyR7dG9rZW4zfSkrJGApO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHRtMyA9IHNhbml0aXplZDMubWF0Y2godHJhaWxpbmczKTtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCB0cmFpbGluZ01ldGEyID0gdG0zXHJcblx0XHRcdFx0XHRcdFx0XHQ/IGFmdGVyUHJlZml4Mi5zbGljZShcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRhZnRlclByZWZpeDIubGVuZ3RoIC1cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCh0bTNbMF0/Lmxlbmd0aCB8fCAwKSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHRcdFx0OiBcIlwiO1xyXG5cdFx0XHRcdFx0XHRcdGxpbmVzW2xpbmVOdW1dID1cclxuXHRcdFx0XHRcdFx0XHRcdGAke3ByZWZpeH0ke25ld0NvbnRlbnR9JHt0cmFpbGluZ01ldGEyfWA7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIE5vdGlmeSBhYm91dCB3cml0ZSBvcGVyYXRpb25cclxuXHRcdFx0XHRlbWl0KHRoaXMuYXBwLCBFdmVudHMuV1JJVEVfT1BFUkFUSU9OX1NUQVJULCB7XHJcblx0XHRcdFx0XHRwYXRoOiBmaWxlLnBhdGgsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0YXdhaXQgdGhpcy52YXVsdC5tb2RpZnkoZmlsZSwgbGluZXMuam9pbihcIlxcblwiKSk7XHJcblx0XHRcdFx0ZW1pdCh0aGlzLmFwcCwgRXZlbnRzLldSSVRFX09QRVJBVElPTl9DT01QTEVURSwge1xyXG5cdFx0XHRcdFx0cGF0aDogZmlsZS5wYXRoLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiB0cnVlLCB1cGRhdGVkQ291bnQgfTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJXcml0ZUFQSTogRXJyb3IgaW4gYmF0Y2ggdXBkYXRlIHRleHQ6XCIsIGVycm9yKTtcclxuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIHVwZGF0ZWRDb3VudDogMCwgZXJyb3I6IFN0cmluZyhlcnJvcikgfTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZSBtdWx0aXBsZSBzdWJ0YXNrcyB1bmRlciBhIHBhcmVudCB0YXNrXHJcblx0ICovXHJcblx0YXN5bmMgYmF0Y2hDcmVhdGVTdWJ0YXNrcyhcclxuXHRcdGFyZ3M6IEJhdGNoQ3JlYXRlU3VidGFza3NBcmdzLFxyXG5cdCk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBjcmVhdGVkQ291bnQ6IG51bWJlcjsgZXJyb3I/OiBzdHJpbmcgfT4ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgcGFyZW50VGFzayA9IGF3YWl0IFByb21pc2UucmVzb2x2ZShcclxuXHRcdFx0XHR0aGlzLmdldFRhc2tCeUlkKGFyZ3MucGFyZW50VGFza0lkKSxcclxuXHRcdFx0KTtcclxuXHRcdFx0aWYgKCFwYXJlbnRUYXNrKSB7XHJcblx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxyXG5cdFx0XHRcdFx0Y3JlYXRlZENvdW50OiAwLFxyXG5cdFx0XHRcdFx0ZXJyb3I6IFwiUGFyZW50IHRhc2sgbm90IGZvdW5kXCIsXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgaWYgdGhpcyBpcyBhIENhbnZhcyB0YXNrXHJcblx0XHRcdGlmIChDYW52YXNUYXNrVXBkYXRlci5pc0NhbnZhc1Rhc2socGFyZW50VGFzaykpIHtcclxuXHRcdFx0XHQvLyBIYW5kbGUgQ2FudmFzIHN1YnRhc2tzIGRpZmZlcmVudGx5IGlmIG5lZWRlZFxyXG5cdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRzdWNjZXNzOiBmYWxzZSxcclxuXHRcdFx0XHRcdGNyZWF0ZWRDb3VudDogMCxcclxuXHRcdFx0XHRcdGVycm9yOiBcIkNhbnZhcyB0YXNrIHN1YnRhc2tzIG5vdCBzdXBwb3J0ZWQgeWV0XCIsXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgZmlsZSA9IHRoaXMudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFxyXG5cdFx0XHRcdHBhcmVudFRhc2suZmlsZVBhdGgsXHJcblx0XHRcdCkgYXMgVEZpbGU7XHJcblx0XHRcdGlmICghZmlsZSkge1xyXG5cdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRzdWNjZXNzOiBmYWxzZSxcclxuXHRcdFx0XHRcdGNyZWF0ZWRDb3VudDogMCxcclxuXHRcdFx0XHRcdGVycm9yOiBcIkZpbGUgbm90IGZvdW5kXCIsXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMudmF1bHQucmVhZChmaWxlKTtcclxuXHRcdFx0Y29uc3QgbGluZXMgPSBjb250ZW50LnNwbGl0KFwiXFxuXCIpO1xyXG5cclxuXHRcdFx0Ly8gR2V0IHRoZSBwYXJlbnQgdGFzaydzIGluZGVudGF0aW9uXHJcblx0XHRcdGNvbnN0IHBhcmVudExpbmUgPSBsaW5lc1twYXJlbnRUYXNrLmxpbmVdO1xyXG5cdFx0XHRjb25zdCBpbmRlbnRNYXRjaCA9IHBhcmVudExpbmUubWF0Y2goL14oXFxzKikvKTtcclxuXHRcdFx0Y29uc3QgcGFyZW50SW5kZW50ID0gaW5kZW50TWF0Y2ggPyBpbmRlbnRNYXRjaFswXSA6IFwiXCI7XHJcblx0XHRcdGNvbnN0IHN1YnRhc2tJbmRlbnQgPSBwYXJlbnRJbmRlbnQgKyBcIlxcdFwiO1xyXG5cclxuXHRcdFx0Ly8gQnVpbGQgc3VidGFzayBsaW5lc1xyXG5cdFx0XHRjb25zdCBzdWJ0YXNrTGluZXM6IHN0cmluZ1tdID0gW107XHJcblx0XHRcdGZvciAoY29uc3Qgc3VidGFzayBvZiBhcmdzLnN1YnRhc2tzKSB7XHJcblx0XHRcdFx0bGV0IHN1YnRhc2tDb250ZW50ID0gYCR7c3VidGFza0luZGVudH0tIFsgXSAke3N1YnRhc2suY29udGVudH1gO1xyXG5cdFx0XHRcdGNvbnN0IG1ldGFkYXRhID0gdGhpcy5nZW5lcmF0ZU1ldGFkYXRhKHtcclxuXHRcdFx0XHRcdHByaW9yaXR5OiBzdWJ0YXNrLnByaW9yaXR5LFxyXG5cdFx0XHRcdFx0ZHVlRGF0ZTogc3VidGFzay5kdWVEYXRlXHJcblx0XHRcdFx0XHRcdD8gbW9tZW50KHN1YnRhc2suZHVlRGF0ZSkudmFsdWVPZigpXHJcblx0XHRcdFx0XHRcdDogdW5kZWZpbmVkLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGlmIChtZXRhZGF0YSkge1xyXG5cdFx0XHRcdFx0c3VidGFza0NvbnRlbnQgKz0gYCAke21ldGFkYXRhfWA7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHN1YnRhc2tMaW5lcy5wdXNoKHN1YnRhc2tDb250ZW50KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gRmluZCB0aGUgaW5zZXJ0aW9uIHBvaW50IChhZnRlciBwYXJlbnQgdGFzayBhbmQgaXRzIGV4aXN0aW5nIHN1YnRhc2tzKVxyXG5cdFx0XHRsZXQgaW5zZXJ0TGluZSA9IHBhcmVudFRhc2subGluZSArIDE7XHJcblx0XHRcdGNvbnN0IHBhcmVudEluZGVudExldmVsID0gcGFyZW50SW5kZW50Lmxlbmd0aDtcclxuXHRcdFx0d2hpbGUgKGluc2VydExpbmUgPCBsaW5lcy5sZW5ndGgpIHtcclxuXHRcdFx0XHRjb25zdCBsaW5lID0gbGluZXNbaW5zZXJ0TGluZV07XHJcblx0XHRcdFx0Y29uc3QgbGluZUluZGVudE1hdGNoID0gbGluZS5tYXRjaCgvXihcXHMqKS8pO1xyXG5cdFx0XHRcdGNvbnN0IGxpbmVJbmRlbnRMZXZlbCA9IGxpbmVJbmRlbnRNYXRjaFxyXG5cdFx0XHRcdFx0PyBsaW5lSW5kZW50TWF0Y2hbMF0ubGVuZ3RoXHJcblx0XHRcdFx0XHQ6IDA7XHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0bGluZUluZGVudExldmVsIDw9IHBhcmVudEluZGVudExldmVsICYmXHJcblx0XHRcdFx0XHRsaW5lLnRyaW0oKSAhPT0gXCJcIlxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGluc2VydExpbmUrKztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSW5zZXJ0IHRoZSBzdWJ0YXNrc1xyXG5cdFx0XHRsaW5lcy5zcGxpY2UoaW5zZXJ0TGluZSwgMCwgLi4uc3VidGFza0xpbmVzKTtcclxuXHJcblx0XHRcdC8vIE5vdGlmeSBhYm91dCB3cml0ZSBvcGVyYXRpb25cclxuXHRcdFx0ZW1pdCh0aGlzLmFwcCwgRXZlbnRzLldSSVRFX09QRVJBVElPTl9TVEFSVCwge1xyXG5cdFx0XHRcdHBhdGg6IGZpbGUucGF0aCxcclxuXHRcdFx0XHR0YXNrSWQ6IGFyZ3MucGFyZW50VGFza0lkLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0YXdhaXQgdGhpcy52YXVsdC5tb2RpZnkoZmlsZSwgbGluZXMuam9pbihcIlxcblwiKSk7XHJcblx0XHRcdGVtaXQodGhpcy5hcHAsIEV2ZW50cy5XUklURV9PUEVSQVRJT05fQ09NUExFVEUsIHtcclxuXHRcdFx0XHRwYXRoOiBmaWxlLnBhdGgsXHJcblx0XHRcdFx0dGFza0lkOiBhcmdzLnBhcmVudFRhc2tJZCxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBjcmVhdGVkQ291bnQ6IHN1YnRhc2tMaW5lcy5sZW5ndGggfTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJXcml0ZUFQSTogRXJyb3IgY3JlYXRpbmcgc3VidGFza3M6XCIsIGVycm9yKTtcclxuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGNyZWF0ZWRDb3VudDogMCwgZXJyb3I6IFN0cmluZyhlcnJvcikgfTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEJhY2t3YXJkLWNvbXBhdGlibGU6IGJhdGNoIHVwZGF0ZSB0YXNrIHN0YXR1cyAod3JhcHBlcilcclxuXHQgKi9cclxuXHRhc3luYyBiYXRjaFVwZGF0ZVRhc2tTdGF0dXMoYXJnczoge1xyXG5cdFx0dGFza0lkczogc3RyaW5nW107XHJcblx0XHRzdGF0dXM/OiBzdHJpbmc7XHJcblx0XHRjb21wbGV0ZWQ/OiBib29sZWFuO1xyXG5cdH0pOiBQcm9taXNlPHtcclxuXHRcdHVwZGF0ZWQ6IHN0cmluZ1tdO1xyXG5cdFx0ZmFpbGVkOiBBcnJheTx7IGlkOiBzdHJpbmc7IGVycm9yOiBzdHJpbmcgfT47XHJcblx0fT4ge1xyXG5cdFx0Y29uc3QgdXBkYXRlZDogc3RyaW5nW10gPSBbXTtcclxuXHRcdGNvbnN0IGZhaWxlZDogQXJyYXk8eyBpZDogc3RyaW5nOyBlcnJvcjogc3RyaW5nIH0+ID0gW107XHJcblxyXG5cdFx0Zm9yIChjb25zdCB0YXNrSWQgb2YgYXJncy50YXNrSWRzKSB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMudXBkYXRlVGFza1N0YXR1cyh7XHJcblx0XHRcdFx0dGFza0lkLFxyXG5cdFx0XHRcdHN0YXR1czogYXJncy5zdGF0dXMsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBhcmdzLmNvbXBsZXRlZCxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRpZiAocmVzdWx0LnN1Y2Nlc3MpIHtcclxuXHRcdFx0XHR1cGRhdGVkLnB1c2godGFza0lkKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRmYWlsZWQucHVzaCh7XHJcblx0XHRcdFx0XHRpZDogdGFza0lkLFxyXG5cdFx0XHRcdFx0ZXJyb3I6IHJlc3VsdC5lcnJvciB8fCBcIlVua25vd24gZXJyb3JcIixcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB7IHVwZGF0ZWQsIGZhaWxlZCB9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQmFja3dhcmQtY29tcGF0aWJsZTogcG9zdHBvbmUgdGFza3MgdG8gYSBuZXcgZGF0ZSAod3JhcHBlcilcclxuXHQgKi9cclxuXHRhc3luYyBwb3N0cG9uZVRhc2tzKGFyZ3M6IHsgdGFza0lkczogc3RyaW5nW107IG5ld0RhdGU6IHN0cmluZyB9KTogUHJvbWlzZTx7XHJcblx0XHR1cGRhdGVkOiBzdHJpbmdbXTtcclxuXHRcdGZhaWxlZDogQXJyYXk8eyBpZDogc3RyaW5nOyBlcnJvcjogc3RyaW5nIH0+O1xyXG5cdH0+IHtcclxuXHRcdGNvbnN0IHVwZGF0ZWQ6IHN0cmluZ1tdID0gW107XHJcblx0XHRjb25zdCBmYWlsZWQ6IEFycmF5PHsgaWQ6IHN0cmluZzsgZXJyb3I6IHN0cmluZyB9PiA9IFtdO1xyXG5cclxuXHRcdGNvbnN0IHBhcnNlRGF0ZU9yT2Zmc2V0ID0gKGlucHV0OiBzdHJpbmcpOiBudW1iZXIgfCBudWxsID0+IHtcclxuXHRcdFx0Y29uc3QgYWJzID0gRGF0ZS5wYXJzZShpbnB1dCk7XHJcblx0XHRcdGlmICghaXNOYU4oYWJzKSkgcmV0dXJuIGFicztcclxuXHRcdFx0Y29uc3QgbSA9IGlucHV0Lm1hdGNoKC9eXFwrKFxcZCspKFtkd215XSkkL2kpO1xyXG5cdFx0XHRpZiAoIW0pIHJldHVybiBudWxsO1xyXG5cdFx0XHRjb25zdCBuID0gcGFyc2VJbnQobVsxXSwgMTApO1xyXG5cdFx0XHRjb25zdCB1bml0ID0gbVsyXS50b0xvd2VyQ2FzZSgpO1xyXG5cdFx0XHRjb25zdCBiYXNlID0gbmV3IERhdGUoKTtcclxuXHRcdFx0c3dpdGNoICh1bml0KSB7XHJcblx0XHRcdFx0Y2FzZSBcImRcIjpcclxuXHRcdFx0XHRcdGJhc2Uuc2V0RGF0ZShiYXNlLmdldERhdGUoKSArIG4pO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBcIndcIjpcclxuXHRcdFx0XHRcdGJhc2Uuc2V0RGF0ZShiYXNlLmdldERhdGUoKSArIG4gKiA3KTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJtXCI6XHJcblx0XHRcdFx0XHRiYXNlLnNldE1vbnRoKGJhc2UuZ2V0TW9udGgoKSArIG4pO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBcInlcIjpcclxuXHRcdFx0XHRcdGJhc2Uuc2V0RnVsbFllYXIoYmFzZS5nZXRGdWxsWWVhcigpICsgbik7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gYmFzZS5nZXRUaW1lKCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdGNvbnN0IG5ld0RhdGVNcyA9IHBhcnNlRGF0ZU9yT2Zmc2V0KGFyZ3MubmV3RGF0ZSk7XHJcblx0XHRpZiAobmV3RGF0ZU1zID09PSBudWxsKSB7XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0dXBkYXRlZDogW10sXHJcblx0XHRcdFx0ZmFpbGVkOiBhcmdzLnRhc2tJZHMubWFwKChpZCkgPT4gKHtcclxuXHRcdFx0XHRcdGlkLFxyXG5cdFx0XHRcdFx0ZXJyb3I6IFwiSW52YWxpZCBkYXRlIGZvcm1hdFwiLFxyXG5cdFx0XHRcdH0pKSxcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHJcblx0XHRmb3IgKGNvbnN0IHRhc2tJZCBvZiBhcmdzLnRhc2tJZHMpIHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy51cGRhdGVUYXNrKHtcclxuXHRcdFx0XHR0YXNrSWQsXHJcblx0XHRcdFx0dXBkYXRlczogeyBtZXRhZGF0YTogeyBkdWVEYXRlOiBuZXdEYXRlTXMgfSBhcyBhbnkgfSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRpZiAocmVzdWx0LnN1Y2Nlc3MpIHtcclxuXHRcdFx0XHR1cGRhdGVkLnB1c2godGFza0lkKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRmYWlsZWQucHVzaCh7XHJcblx0XHRcdFx0XHRpZDogdGFza0lkLFxyXG5cdFx0XHRcdFx0ZXJyb3I6IHJlc3VsdC5lcnJvciB8fCBcIlVua25vd24gZXJyb3JcIixcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB7IHVwZGF0ZWQsIGZhaWxlZCB9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGFsbCBkZXNjZW5kYW50IHRhc2sgSURzIGZvciBhIGdpdmVuIHRhc2tcclxuXHQgKi9cclxuXHRwcml2YXRlIGFzeW5jIGdldERlc2NlbmRhbnRUYXNrSWRzKHRhc2tJZDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xyXG5cdFx0Y29uc3QgZGVzY2VuZGFudHM6IHN0cmluZ1tdID0gW107XHJcblx0XHRjb25zdCB0YXNrID0gYXdhaXQgUHJvbWlzZS5yZXNvbHZlKHRoaXMuZ2V0VGFza0J5SWQodGFza0lkKSk7XHJcblx0XHRpZiAoIXRhc2spIHJldHVybiBkZXNjZW5kYW50cztcclxuXHJcblx0XHQvLyBUaGlzIHdvdWxkIG5lZWQgdG8gYmUgaW1wbGVtZW50ZWQgYmFzZWQgb24geW91ciB0YXNrIGhpZXJhcmNoeSBsb2dpY1xyXG5cdFx0Ly8gRm9yIG5vdywgcmV0dXJuaW5nIGVtcHR5IGFycmF5IGFzIGEgcGxhY2Vob2xkZXJcclxuXHRcdHJldHVybiBkZXNjZW5kYW50cztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEZpbmQgYSB0YXNrIGxpbmUgYnkgSUQgaW4gYW4gYXJyYXkgb2YgbGluZXNcclxuXHQgKi9cclxuXHRwcml2YXRlIGZpbmRUYXNrTGluZUJ5SWQoXHJcblx0XHRsaW5lczogc3RyaW5nW10sXHJcblx0XHR0YXNrSWQ6IHN0cmluZyxcclxuXHQpOiB7IGxpbmU6IG51bWJlcjsgY29udGVudDogc3RyaW5nIH0gfCBudWxsIHtcclxuXHRcdC8vIFRoaXMgd291bGQgbmVlZCB0byBtYXRjaCB0aGUgdGFzayBJRCBmb3JtYXQgdXNlZCBpbiB5b3VyIHN5c3RlbVxyXG5cdFx0Ly8gRm9yIG5vdywgcmV0dXJuaW5nIG51bGwgYXMgYSBwbGFjZWhvbGRlclxyXG5cdFx0cmV0dXJuIG51bGw7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgdGhlIGluZGVudGF0aW9uIGxldmVsIG9mIGEgbGluZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZ2V0SW5kZW50KGxpbmU6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHRjb25zdCBtYXRjaCA9IGxpbmUubWF0Y2goL14oXFxzKikvKTtcclxuXHRcdHJldHVybiBtYXRjaCA/IG1hdGNoWzBdIDogXCJcIjtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEFkZCBhIHRhc2sgdG8gdGhlIGRhaWx5IG5vdGVcclxuXHQgKi9cclxuXHRhc3luYyBhZGRUYXNrVG9EYWlseU5vdGUoYXJnczoge1xyXG5cdFx0Y29udGVudDogc3RyaW5nO1xyXG5cdFx0cGFyZW50Pzogc3RyaW5nO1xyXG5cdFx0dGFncz86IHN0cmluZ1tdO1xyXG5cdFx0cHJvamVjdD86IHN0cmluZztcclxuXHRcdGNvbnRleHQ/OiBzdHJpbmc7XHJcblx0XHRwcmlvcml0eT86IG51bWJlcjtcclxuXHRcdHN0YXJ0RGF0ZT86IHN0cmluZztcclxuXHRcdGR1ZURhdGU/OiBzdHJpbmc7XHJcblx0XHRoZWFkaW5nPzogc3RyaW5nO1xyXG5cdFx0Y29tcGxldGVkPzogYm9vbGVhbjtcclxuXHRcdGNvbXBsZXRlZERhdGU/OiBzdHJpbmc7XHJcblx0fSk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBlcnJvcj86IHN0cmluZyB9PiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBHZXQgb3IgY3JlYXRlIGRhaWx5IG5vdGVcclxuXHRcdFx0bGV0IGRhaWx5Tm90ZUZpbGU6IFRGaWxlIHwgbnVsbDtcclxuXHRcdFx0Y29uc3QgaGFzRGFpbHlOb3Rlc1BsdWdpbiA9IGFwcEhhc0RhaWx5Tm90ZXNQbHVnaW5Mb2FkZWQoKTtcclxuXHJcblx0XHRcdGlmIChoYXNEYWlseU5vdGVzUGx1Z2luKSB7XHJcblx0XHRcdFx0Ly8gVXNlIERhaWx5IE5vdGVzIHBsdWdpblxyXG5cdFx0XHRcdGNvbnN0IGRhaWx5Tm90ZXMgPSBnZXRBbGxEYWlseU5vdGVzKCk7XHJcblx0XHRcdFx0Y29uc3QgdG9kYXlNb21lbnQgPSBtb21lbnQoKTtcclxuXHRcdFx0XHRsZXQgdG9kYXlOb3RlID0gZ2V0RGFpbHlOb3RlKHRvZGF5TW9tZW50LCBkYWlseU5vdGVzKTtcclxuXHJcblx0XHRcdFx0aWYgKCF0b2RheU5vdGUpIHtcclxuXHRcdFx0XHRcdHRvZGF5Tm90ZSA9IGF3YWl0IGNyZWF0ZURhaWx5Tm90ZSh0b2RheU1vbWVudCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGRhaWx5Tm90ZUZpbGUgPSB0b2RheU5vdGU7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gQ3JlYXRlIG91ciBvd24gZGFpbHkgbm90ZVxyXG5cdFx0XHRcdGNvbnN0IHFjID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlO1xyXG5cdFx0XHRcdGxldCBmb2xkZXIgPSBxYz8uZGFpbHlOb3RlU2V0dGluZ3M/LmZvbGRlciB8fCBcIlwiO1xyXG5cdFx0XHRcdGNvbnN0IGZvcm1hdCA9IHFjPy5kYWlseU5vdGVTZXR0aW5ncz8uZm9ybWF0IHx8IFwiWVlZWS1NTS1ERFwiO1xyXG5cdFx0XHRcdGlmICghZm9sZGVyKSB7XHJcblx0XHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0XHRmb2xkZXIgPSBnZXREYWlseU5vdGVTZXR0aW5ncygpLmZvbGRlciB8fCBcIlwiO1xyXG5cdFx0XHRcdFx0fSBjYXRjaCB7XHJcblx0XHRcdFx0XHRcdC8vIElnbm9yZVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRjb25zdCBkYXRlU3RyID0gbW9tZW50KCkuZm9ybWF0KGZvcm1hdCk7XHJcblx0XHRcdFx0Y29uc3QgcGF0aCA9IGZvbGRlclxyXG5cdFx0XHRcdFx0PyBgJHtmb2xkZXJ9LyR7ZGF0ZVN0cn0ubWRgXHJcblx0XHRcdFx0XHQ6IGAke2RhdGVTdHJ9Lm1kYDtcclxuXHJcblx0XHRcdFx0Ly8gRW5zdXJlIGZvbGRlcnNcclxuXHRcdFx0XHRjb25zdCBwYXJ0cyA9IHBhdGguc3BsaXQoXCIvXCIpO1xyXG5cdFx0XHRcdGlmIChwYXJ0cy5sZW5ndGggPiAxKSB7XHJcblx0XHRcdFx0XHRjb25zdCBkaXIgPSBwYXJ0cy5zbGljZSgwLCAtMSkuam9pbihcIi9cIik7XHJcblx0XHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0XHRhd2FpdCB0aGlzLnZhdWx0LmNyZWF0ZUZvbGRlcihkaXIpO1xyXG5cdFx0XHRcdFx0fSBjYXRjaCB7XHJcblx0XHRcdFx0XHRcdC8vIElnbm9yZSBpZiBleGlzdHNcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIENyZWF0ZSBmaWxlIGlmIG5vdCBleGlzdHNcclxuXHRcdFx0XHRsZXQgZmlsZSA9IHRoaXMudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFxyXG5cdFx0XHRcdFx0cGF0aCxcclxuXHRcdFx0XHQpIGFzIFRGaWxlIHwgbnVsbDtcclxuXHRcdFx0XHRpZiAoIWZpbGUpIHtcclxuXHRcdFx0XHRcdGZpbGUgPSBhd2FpdCB0aGlzLnZhdWx0LmNyZWF0ZShwYXRoLCBcIlwiKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZGFpbHlOb3RlRmlsZSA9IGZpbGU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEJ1aWxkIHRhc2sgY29udGVudFxyXG5cdFx0XHRjb25zdCBjaGVja2JveFN0YXRlID0gYXJncy5jb21wbGV0ZWQgPyBcIlt4XVwiIDogXCJbIF1cIjtcclxuXHRcdFx0bGV0IHRhc2tDb250ZW50ID0gYC0gJHtjaGVja2JveFN0YXRlfSAke2FyZ3MuY29udGVudH1gO1xyXG5cdFx0XHRjb25zdCBtZXRhZGF0YSA9IHRoaXMuZ2VuZXJhdGVNZXRhZGF0YSh7XHJcblx0XHRcdFx0dGFnczogYXJncy50YWdzLFxyXG5cdFx0XHRcdHByb2plY3Q6IGFyZ3MucHJvamVjdCxcclxuXHRcdFx0XHRjb250ZXh0OiBhcmdzLmNvbnRleHQsXHJcblx0XHRcdFx0cHJpb3JpdHk6IGFyZ3MucHJpb3JpdHksXHJcblx0XHRcdFx0c3RhcnREYXRlOiBhcmdzLnN0YXJ0RGF0ZVxyXG5cdFx0XHRcdFx0PyBtb21lbnQoYXJncy5zdGFydERhdGUpLnZhbHVlT2YoKVxyXG5cdFx0XHRcdFx0OiB1bmRlZmluZWQsXHJcblx0XHRcdFx0ZHVlRGF0ZTogYXJncy5kdWVEYXRlXHJcblx0XHRcdFx0XHQ/IG1vbWVudChhcmdzLmR1ZURhdGUpLnZhbHVlT2YoKVxyXG5cdFx0XHRcdFx0OiB1bmRlZmluZWQsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBhcmdzLmNvbXBsZXRlZCxcclxuXHRcdFx0XHRjb21wbGV0ZWREYXRlOiBhcmdzLmNvbXBsZXRlZERhdGVcclxuXHRcdFx0XHRcdD8gbW9tZW50KGFyZ3MuY29tcGxldGVkRGF0ZSkudmFsdWVPZigpXHJcblx0XHRcdFx0XHQ6IHVuZGVmaW5lZCxcclxuXHRcdFx0fSk7XHJcblx0XHRcdGlmIChtZXRhZGF0YSkge1xyXG5cdFx0XHRcdHRhc2tDb250ZW50ICs9IGAgJHttZXRhZGF0YX1gO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBBcHBlbmQgdW5kZXIgb3B0aW9uYWwgaGVhZGluZ1xyXG5cdFx0XHRjb25zdCBmaWxlID0gZGFpbHlOb3RlRmlsZTtcclxuXHRcdFx0Y29uc3QgY3VycmVudCA9IGF3YWl0IHRoaXMudmF1bHQucmVhZChmaWxlKTtcclxuXHRcdFx0bGV0IG5ld0NvbnRlbnQgPSBjdXJyZW50O1xyXG5cclxuXHRcdFx0aWYgKGFyZ3MucGFyZW50KSB7XHJcblx0XHRcdFx0bmV3Q29udGVudCA9IHRoaXMuaW5zZXJ0U3VidGFzayhcclxuXHRcdFx0XHRcdGN1cnJlbnQsXHJcblx0XHRcdFx0XHRhcmdzLnBhcmVudCxcclxuXHRcdFx0XHRcdHRhc2tDb250ZW50LFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gVXNlIGhlYWRpbmcgZnJvbSBRdWljayBDYXB0dXJlIHNldHRpbmdzIGlmIGF2YWlsYWJsZVxyXG5cdFx0XHRcdGNvbnN0IGZhbGxiYWNrSGVhZGluZyA9XHJcblx0XHRcdFx0XHRhcmdzLmhlYWRpbmcgfHxcclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZT8udGFyZ2V0SGVhZGluZz8udHJpbSgpO1xyXG5cdFx0XHRcdGlmIChmYWxsYmFja0hlYWRpbmcpIHtcclxuXHRcdFx0XHRcdGNvbnN0IGhlYWRpbmdSZWdleCA9IG5ldyBSZWdFeHAoXHJcblx0XHRcdFx0XHRcdGBeI3sxLDZ9XFxcXHMrJHtmYWxsYmFja0hlYWRpbmcucmVwbGFjZShcclxuXHRcdFx0XHRcdFx0XHQvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csXHJcblx0XHRcdFx0XHRcdFx0XCJcXFxcJCZcIixcclxuXHRcdFx0XHRcdFx0KX1cXFxccyokYCxcclxuXHRcdFx0XHRcdFx0XCJtXCIsXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0aWYgKGhlYWRpbmdSZWdleC50ZXN0KGN1cnJlbnQpKSB7XHJcblx0XHRcdFx0XHRcdG5ld0NvbnRlbnQgPSBjdXJyZW50LnJlcGxhY2UoXHJcblx0XHRcdFx0XHRcdFx0aGVhZGluZ1JlZ2V4LFxyXG5cdFx0XHRcdFx0XHRcdGAkJlxcblxcbiR7dGFza0NvbnRlbnR9YCxcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdG5ld0NvbnRlbnQgPSBgJHtjdXJyZW50fSR7XHJcblx0XHRcdFx0XHRcdFx0Y3VycmVudC5lbmRzV2l0aChcIlxcblwiKSA/IFwiXCIgOiBcIlxcblwiXHJcblx0XHRcdFx0XHRcdH1cXG4jIyAke2ZhbGxiYWNrSGVhZGluZ31cXG5cXG4ke3Rhc2tDb250ZW50fWA7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdG5ld0NvbnRlbnQgPSBjdXJyZW50XHJcblx0XHRcdFx0XHRcdD8gYCR7Y3VycmVudH1cXG4ke3Rhc2tDb250ZW50fWBcclxuXHRcdFx0XHRcdFx0OiB0YXNrQ29udGVudDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIE5vdGlmeSBhYm91dCB3cml0ZSBvcGVyYXRpb25cclxuXHRcdFx0ZW1pdCh0aGlzLmFwcCwgRXZlbnRzLldSSVRFX09QRVJBVElPTl9TVEFSVCwgeyBwYXRoOiBmaWxlLnBhdGggfSk7XHJcblx0XHRcdGF3YWl0IHRoaXMudmF1bHQubW9kaWZ5KGZpbGUsIG5ld0NvbnRlbnQpO1xyXG5cdFx0XHRlbWl0KHRoaXMuYXBwLCBFdmVudHMuV1JJVEVfT1BFUkFUSU9OX0NPTVBMRVRFLCB7XHJcblx0XHRcdFx0cGF0aDogZmlsZS5wYXRoLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcclxuXHRcdFx0XHRcIldyaXRlQVBJOiBFcnJvciBjcmVhdGluZyB0YXNrIGluIGRhaWx5IG5vdGU6XCIsXHJcblx0XHRcdFx0ZXJyb3IsXHJcblx0XHRcdCk7XHJcblx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogU3RyaW5nKGVycm9yKSB9O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQmFja3dhcmQtY29tcGF0aWJsZTogY3JlYXRlIGEgdGFzayBpbiBkYWlseSBub3RlICh3cmFwcGVyKVxyXG5cdCAqL1xyXG5cdGFzeW5jIGNyZWF0ZVRhc2tJbkRhaWx5Tm90ZShcclxuXHRcdGFyZ3M6IENyZWF0ZVRhc2tBcmdzICYgeyBoZWFkaW5nPzogc3RyaW5nIH0sXHJcblx0KTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IGVycm9yPzogc3RyaW5nIH0+IHtcclxuXHRcdHJldHVybiB0aGlzLmFkZFRhc2tUb0RhaWx5Tm90ZSh7XHJcblx0XHRcdGNvbnRlbnQ6IGFyZ3MuY29udGVudCxcclxuXHRcdFx0cGFyZW50OiBhcmdzLnBhcmVudCxcclxuXHRcdFx0dGFnczogYXJncy50YWdzLFxyXG5cdFx0XHRwcm9qZWN0OiBhcmdzLnByb2plY3QsXHJcblx0XHRcdGNvbnRleHQ6IGFyZ3MuY29udGV4dCxcclxuXHRcdFx0cHJpb3JpdHk6IGFyZ3MucHJpb3JpdHksXHJcblx0XHRcdHN0YXJ0RGF0ZTogYXJncy5zdGFydERhdGUsXHJcblx0XHRcdGR1ZURhdGU6IGFyZ3MuZHVlRGF0ZSxcclxuXHRcdFx0aGVhZGluZzogKGFyZ3MgYXMgYW55KS5oZWFkaW5nLFxyXG5cdFx0XHRjb21wbGV0ZWQ6ICEhYXJncy5jb21wbGV0ZWQsXHJcblx0XHRcdGNvbXBsZXRlZERhdGU6IGFyZ3MuY29tcGxldGVkRGF0ZSxcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQWRkIGEgcHJvamVjdCB0YXNrIHRvIHF1aWNrIGNhcHR1cmVcclxuXHQgKi9cclxuXHRhc3luYyBhZGRQcm9qZWN0VGFza1RvUXVpY2tDYXB0dXJlKGFyZ3M6IHtcclxuXHRcdGNvbnRlbnQ6IHN0cmluZztcclxuXHRcdHByb2plY3Q6IHN0cmluZztcclxuXHRcdHRhZ3M/OiBzdHJpbmdbXTtcclxuXHRcdHByaW9yaXR5PzogbnVtYmVyO1xyXG5cdFx0ZHVlRGF0ZT86IHN0cmluZztcclxuXHRcdHN0YXJ0RGF0ZT86IHN0cmluZztcclxuXHRcdGNvbnRleHQ/OiBzdHJpbmc7XHJcblx0XHRoZWFkaW5nPzogc3RyaW5nO1xyXG5cdFx0Y29tcGxldGVkPzogYm9vbGVhbjtcclxuXHRcdGNvbXBsZXRlZERhdGU/OiBzdHJpbmc7XHJcblx0fSk6IFByb21pc2U8eyBmaWxlUGF0aDogc3RyaW5nOyBzdWNjZXNzOiBib29sZWFuIH0+IHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IHFjID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlO1xyXG5cdFx0XHRpZiAoIXFjKSB7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiUXVpY2sgQ2FwdHVyZSBzZXR0aW5ncyBub3QgZm91bmRcIik7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEJ1aWxkIHRhc2sgbGluZVxyXG5cdFx0XHRjb25zdCBjaGVja2JveFN0YXRlID0gYXJncy5jb21wbGV0ZWQgPyBcIlt4XVwiIDogXCJbIF1cIjtcclxuXHRcdFx0bGV0IGxpbmUgPSBgLSAke2NoZWNrYm94U3RhdGV9ICR7YXJncy5jb250ZW50fWA7XHJcblx0XHRcdGNvbnN0IG1ldGFkYXRhID0gdGhpcy5nZW5lcmF0ZU1ldGFkYXRhKHtcclxuXHRcdFx0XHR0YWdzOiBhcmdzLnRhZ3MsXHJcblx0XHRcdFx0cHJvamVjdDogYXJncy5wcm9qZWN0LFxyXG5cdFx0XHRcdGNvbnRleHQ6IGFyZ3MuY29udGV4dCxcclxuXHRcdFx0XHRwcmlvcml0eTogYXJncy5wcmlvcml0eSxcclxuXHRcdFx0XHRzdGFydERhdGU6IGFyZ3Muc3RhcnREYXRlXHJcblx0XHRcdFx0XHQ/IG1vbWVudChhcmdzLnN0YXJ0RGF0ZSkudmFsdWVPZigpXHJcblx0XHRcdFx0XHQ6IHVuZGVmaW5lZCxcclxuXHRcdFx0XHRkdWVEYXRlOiBhcmdzLmR1ZURhdGVcclxuXHRcdFx0XHRcdD8gbW9tZW50KGFyZ3MuZHVlRGF0ZSkudmFsdWVPZigpXHJcblx0XHRcdFx0XHQ6IHVuZGVmaW5lZCxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGFyZ3MuY29tcGxldGVkLFxyXG5cdFx0XHRcdGNvbXBsZXRlZERhdGU6IGFyZ3MuY29tcGxldGVkRGF0ZVxyXG5cdFx0XHRcdFx0PyBtb21lbnQoYXJncy5jb21wbGV0ZWREYXRlKS52YWx1ZU9mKClcclxuXHRcdFx0XHRcdDogdW5kZWZpbmVkLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0aWYgKG1ldGFkYXRhKSB7XHJcblx0XHRcdFx0bGluZSArPSBgICR7bWV0YWRhdGF9YDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gU2F2ZSB0byBxdWljayBjYXB0dXJlXHJcblx0XHRcdGF3YWl0IHNhdmVDYXB0dXJlKHRoaXMuYXBwLCBsaW5lLCB7XHJcblx0XHRcdFx0dGFyZ2V0SGVhZGluZzogYXJncy5oZWFkaW5nLFxyXG5cdFx0XHRcdHRhcmdldEZpbGU6IHRoaXMucGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZT8udGFyZ2V0RmlsZSxcclxuXHRcdFx0XHR0YXJnZXRUeXBlOlxyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlPy50YXJnZXRUeXBlIHx8IFwiZml4ZWRcIixcclxuXHRcdFx0XHRhcHBlbmRUb0ZpbGU6IFwiYXBwZW5kXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRjb25zdCBmaWxlUGF0aCA9XHJcblx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlPy50YXJnZXRGaWxlIHx8XHJcblx0XHRcdFx0XCJxdWljay1jYXB0dXJlLm1kXCI7IC8vIFVzZSB0aGUgdGFyZ2V0IGZpbGVcclxuXHJcblx0XHRcdC8vIE5vdGlmeSBhYm91dCB3cml0ZSBvcGVyYXRpb25cclxuXHRcdFx0ZW1pdCh0aGlzLmFwcCwgRXZlbnRzLldSSVRFX09QRVJBVElPTl9TVEFSVCwgeyBwYXRoOiBmaWxlUGF0aCB9KTtcclxuXHRcdFx0ZW1pdCh0aGlzLmFwcCwgRXZlbnRzLldSSVRFX09QRVJBVElPTl9DT01QTEVURSwgeyBwYXRoOiBmaWxlUGF0aCB9KTtcclxuXHJcblx0XHRcdHJldHVybiB7IGZpbGVQYXRoLCBzdWNjZXNzOiB0cnVlIH07XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFxyXG5cdFx0XHRcdFwiV3JpdGVBUEk6IEVycm9yIGFkZGluZyBwcm9qZWN0IHRhc2sgdG8gcXVpY2sgY2FwdHVyZTpcIixcclxuXHRcdFx0XHRlcnJvcixcclxuXHRcdFx0KTtcclxuXHRcdFx0dGhyb3cgZXJyb3I7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyA9PT09PSBIZWxwZXIgTWV0aG9kcyA9PT09PVxyXG5cclxuXHQvKipcclxuXHQgKiBHZW5lcmF0ZSBtZXRhZGF0YSBzdHJpbmcgYmFzZWQgb24gZm9ybWF0IHByZWZlcmVuY2VcclxuXHQgKi9cclxuXHRwcml2YXRlIGdlbmVyYXRlTWV0YWRhdGEoYXJnczoge1xyXG5cdFx0dGFncz86IHN0cmluZ1tdO1xyXG5cdFx0cHJvamVjdD86IHN0cmluZztcclxuXHRcdGNvbnRleHQ/OiBzdHJpbmc7XHJcblx0XHRwcmlvcml0eT86IG51bWJlcjtcclxuXHRcdHN0YXJ0RGF0ZT86IG51bWJlcjtcclxuXHRcdGR1ZURhdGU/OiBudW1iZXI7XHJcblx0XHRzY2hlZHVsZWREYXRlPzogbnVtYmVyO1xyXG5cdFx0cmVjdXJyZW5jZT86IHN0cmluZztcclxuXHRcdGNvbXBsZXRlZD86IGJvb2xlYW47XHJcblx0XHRjb21wbGV0ZWREYXRlPzogbnVtYmVyO1xyXG5cdFx0b25Db21wbGV0aW9uPzogc3RyaW5nO1xyXG5cdFx0ZGVwZW5kc09uPzogc3RyaW5nW10gfCBzdHJpbmc7XHJcblx0XHRpZD86IHN0cmluZztcclxuXHR9KTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IG1ldGFkYXRhOiBzdHJpbmdbXSA9IFtdO1xyXG5cdFx0Y29uc3QgdXNlRGF0YXZpZXdGb3JtYXQgPVxyXG5cdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcmVmZXJNZXRhZGF0YUZvcm1hdCA9PT0gXCJkYXRhdmlld1wiO1xyXG5cclxuXHRcdC8vIFRhZ3NcclxuXHRcdGlmIChhcmdzLnRhZ3M/Lmxlbmd0aCkge1xyXG5cdFx0XHRpZiAodXNlRGF0YXZpZXdGb3JtYXQpIHtcclxuXHRcdFx0XHRtZXRhZGF0YS5wdXNoKGBbdGFnczo6ICR7YXJncy50YWdzLmpvaW4oXCIsIFwiKX1dYCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gRW5zdXJlIHRhZ3MgZG9uJ3QgYWxyZWFkeSBoYXZlICMgcHJlZml4IGJlZm9yZSBhZGRpbmcgb25lXHJcblx0XHRcdFx0bWV0YWRhdGEucHVzaChcclxuXHRcdFx0XHRcdC4uLmFyZ3MudGFncy5tYXAoKHRhZykgPT5cclxuXHRcdFx0XHRcdFx0dGFnLnN0YXJ0c1dpdGgoXCIjXCIpID8gdGFnIDogYCMke3RhZ31gLFxyXG5cdFx0XHRcdFx0KSxcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUHJvamVjdFxyXG5cdFx0aWYgKGFyZ3MucHJvamVjdCkge1xyXG5cdFx0XHRpZiAodXNlRGF0YXZpZXdGb3JtYXQpIHtcclxuXHRcdFx0XHRjb25zdCBwcm9qZWN0UHJlZml4ID1cclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnByb2plY3RUYWdQcmVmaXg/LmRhdGF2aWV3IHx8XHJcblx0XHRcdFx0XHRcInByb2plY3RcIjtcclxuXHRcdFx0XHQvLyBEYXRhdmlldyDmoLzlvI/kv53nlZnljp/lp4vnqbrmoLxcclxuXHRcdFx0XHRtZXRhZGF0YS5wdXNoKGBbJHtwcm9qZWN0UHJlZml4fTo6ICR7YXJncy5wcm9qZWN0fV1gKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRjb25zdCBwcm9qZWN0UHJlZml4ID1cclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnByb2plY3RUYWdQcmVmaXg/LnRhc2tzIHx8IFwicHJvamVjdFwiO1xyXG5cdFx0XHRcdC8vIFRhc2tzIOagvOW8j++8muepuuagvOS9v+eUqCBcIi1cIiDov57mjqVcclxuXHRcdFx0XHRjb25zdCBzYW5pdGl6ZWRQcm9qZWN0ID0gU3RyaW5nKGFyZ3MucHJvamVjdClcclxuXHRcdFx0XHRcdC50cmltKClcclxuXHRcdFx0XHRcdC5yZXBsYWNlKC9cXHMrL2csIFwiLVwiKTtcclxuXHRcdFx0XHRtZXRhZGF0YS5wdXNoKGAjJHtwcm9qZWN0UHJlZml4fS8ke3Nhbml0aXplZFByb2plY3R9YCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBDb250ZXh0XHJcblx0XHRpZiAoYXJncy5jb250ZXh0KSB7XHJcblx0XHRcdGlmICh1c2VEYXRhdmlld0Zvcm1hdCkge1xyXG5cdFx0XHRcdGNvbnN0IGNvbnRleHRQcmVmaXggPVxyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuY29udGV4dFRhZ1ByZWZpeD8uZGF0YXZpZXcgfHxcclxuXHRcdFx0XHRcdFwiY29udGV4dFwiO1xyXG5cdFx0XHRcdC8vIERhdGF2aWV3IOagvOW8j+S/neeVmeWOn+Wni+epuuagvFxyXG5cdFx0XHRcdG1ldGFkYXRhLnB1c2goYFske2NvbnRleHRQcmVmaXh9OjogJHthcmdzLmNvbnRleHR9XWApO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGNvbnN0IGNvbnRleHRQcmVmaXggPVxyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuY29udGV4dFRhZ1ByZWZpeD8udGFza3MgfHwgXCJAXCI7XHJcblx0XHRcdFx0Ly8gVGFza3Mg5qC85byP77ya56m65qC85L2/55SoIFwiLVwiIOi/nuaOpVxyXG5cdFx0XHRcdGNvbnN0IHNhbml0aXplZENvbnRleHQgPSBTdHJpbmcoYXJncy5jb250ZXh0KVxyXG5cdFx0XHRcdFx0LnRyaW0oKVxyXG5cdFx0XHRcdFx0LnJlcGxhY2UoL1xccysvZywgXCItXCIpO1xyXG5cdFx0XHRcdG1ldGFkYXRhLnB1c2goYCR7Y29udGV4dFByZWZpeH0ke3Nhbml0aXplZENvbnRleHR9YCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBQcmlvcml0eVxyXG5cdFx0Ly8gT25seSBhZGQgcHJpb3JpdHkgaWYgaXQncyBhIHZhbGlkIG51bWJlciBiZXR3ZWVuIDEtNVxyXG5cdFx0aWYgKFxyXG5cdFx0XHR0eXBlb2YgYXJncy5wcmlvcml0eSA9PT0gXCJudW1iZXJcIiAmJlxyXG5cdFx0XHRhcmdzLnByaW9yaXR5ID49IDEgJiZcclxuXHRcdFx0YXJncy5wcmlvcml0eSA8PSA1XHJcblx0XHQpIHtcclxuXHRcdFx0aWYgKHVzZURhdGF2aWV3Rm9ybWF0KSB7XHJcblx0XHRcdFx0bGV0IHByaW9yaXR5VmFsdWU6IHN0cmluZztcclxuXHRcdFx0XHRzd2l0Y2ggKGFyZ3MucHJpb3JpdHkpIHtcclxuXHRcdFx0XHRcdGNhc2UgNTpcclxuXHRcdFx0XHRcdFx0cHJpb3JpdHlWYWx1ZSA9IFwiaGlnaGVzdFwiO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgNDpcclxuXHRcdFx0XHRcdFx0cHJpb3JpdHlWYWx1ZSA9IFwiaGlnaFwiO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgMzpcclxuXHRcdFx0XHRcdFx0cHJpb3JpdHlWYWx1ZSA9IFwibWVkaXVtXCI7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSAyOlxyXG5cdFx0XHRcdFx0XHRwcmlvcml0eVZhbHVlID0gXCJsb3dcIjtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIDE6XHJcblx0XHRcdFx0XHRcdHByaW9yaXR5VmFsdWUgPSBcImxvd2VzdFwiO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0XHRcdHByaW9yaXR5VmFsdWUgPSBTdHJpbmcoYXJncy5wcmlvcml0eSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdG1ldGFkYXRhLnB1c2goYFtwcmlvcml0eTo6ICR7cHJpb3JpdHlWYWx1ZX1dYCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0bGV0IHByaW9yaXR5TWFya2VyID0gXCJcIjtcclxuXHRcdFx0XHRzd2l0Y2ggKGFyZ3MucHJpb3JpdHkpIHtcclxuXHRcdFx0XHRcdGNhc2UgNTpcclxuXHRcdFx0XHRcdFx0cHJpb3JpdHlNYXJrZXIgPSBcIvCflLpcIjtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIDQ6XHJcblx0XHRcdFx0XHRcdHByaW9yaXR5TWFya2VyID0gXCLij6tcIjtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIDM6XHJcblx0XHRcdFx0XHRcdHByaW9yaXR5TWFya2VyID0gXCLwn5S8XCI7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSAyOlxyXG5cdFx0XHRcdFx0XHRwcmlvcml0eU1hcmtlciA9IFwi8J+UvVwiO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgMTpcclxuXHRcdFx0XHRcdFx0cHJpb3JpdHlNYXJrZXIgPSBcIuKPrFwiO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aWYgKHByaW9yaXR5TWFya2VyKSBtZXRhZGF0YS5wdXNoKHByaW9yaXR5TWFya2VyKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlY3VycmVuY2VcclxuXHRcdGlmIChhcmdzLnJlY3VycmVuY2UpIHtcclxuXHRcdFx0bWV0YWRhdGEucHVzaChcclxuXHRcdFx0XHR1c2VEYXRhdmlld0Zvcm1hdFxyXG5cdFx0XHRcdFx0PyBgW3JlcGVhdDo6ICR7YXJncy5yZWN1cnJlbmNlfV1gXHJcblx0XHRcdFx0XHQ6IGDwn5SBICR7YXJncy5yZWN1cnJlbmNlfWAsXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU3RhcnQgRGF0ZVxyXG5cdFx0aWYgKGFyZ3Muc3RhcnREYXRlKSB7XHJcblx0XHRcdGNvbnN0IGRhdGVTdHIgPSBtb21lbnQoYXJncy5zdGFydERhdGUpLmZvcm1hdChcIllZWVktTU0tRERcIik7XHJcblx0XHRcdG1ldGFkYXRhLnB1c2goXHJcblx0XHRcdFx0dXNlRGF0YXZpZXdGb3JtYXQgPyBgW3N0YXJ0OjogJHtkYXRlU3RyfV1gIDogYPCfm6sgJHtkYXRlU3RyfWAsXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU2NoZWR1bGVkIERhdGVcclxuXHRcdGlmIChhcmdzLnNjaGVkdWxlZERhdGUpIHtcclxuXHRcdFx0Y29uc3QgZGF0ZVN0ciA9IG1vbWVudChhcmdzLnNjaGVkdWxlZERhdGUpLmZvcm1hdChcIllZWVktTU0tRERcIik7XHJcblx0XHRcdG1ldGFkYXRhLnB1c2goXHJcblx0XHRcdFx0dXNlRGF0YXZpZXdGb3JtYXRcclxuXHRcdFx0XHRcdD8gYFtzY2hlZHVsZWQ6OiAke2RhdGVTdHJ9XWBcclxuXHRcdFx0XHRcdDogYOKPsyAke2RhdGVTdHJ9YCxcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBEdWUgRGF0ZVxyXG5cdFx0aWYgKGFyZ3MuZHVlRGF0ZSkge1xyXG5cdFx0XHRjb25zdCBkYXRlU3RyID0gbW9tZW50KGFyZ3MuZHVlRGF0ZSkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcclxuXHRcdFx0bWV0YWRhdGEucHVzaChcclxuXHRcdFx0XHR1c2VEYXRhdmlld0Zvcm1hdCA/IGBbZHVlOjogJHtkYXRlU3RyfV1gIDogYPCfk4UgJHtkYXRlU3RyfWAsXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ29tcGxldGlvbiBEYXRlXHJcblx0XHRpZiAoYXJncy5jb21wbGV0ZWQgJiYgYXJncy5jb21wbGV0ZWREYXRlKSB7XHJcblx0XHRcdGNvbnN0IGRhdGVTdHIgPSBtb21lbnQoYXJncy5jb21wbGV0ZWREYXRlKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xyXG5cdFx0XHRtZXRhZGF0YS5wdXNoKFxyXG5cdFx0XHRcdHVzZURhdGF2aWV3Rm9ybWF0XHJcblx0XHRcdFx0XHQ/IGBbY29tcGxldGlvbjo6ICR7ZGF0ZVN0cn1dYFxyXG5cdFx0XHRcdFx0OiBg4pyFICR7ZGF0ZVN0cn1gLFxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIE9uIENvbXBsZXRpb24gYWN0aW9uXHJcblx0XHRpZiAoYXJncy5vbkNvbXBsZXRpb24pIHtcclxuXHRcdFx0bWV0YWRhdGEucHVzaChcclxuXHRcdFx0XHR1c2VEYXRhdmlld0Zvcm1hdFxyXG5cdFx0XHRcdFx0PyBgW29uQ29tcGxldGlvbjo6ICR7YXJncy5vbkNvbXBsZXRpb259XWBcclxuXHRcdFx0XHRcdDogYPCfj4EgJHthcmdzLm9uQ29tcGxldGlvbn1gLFxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIERlcGVuZHMgT25cclxuXHRcdGlmIChcclxuXHRcdFx0YXJncy5kZXBlbmRzT24gJiZcclxuXHRcdFx0KEFycmF5LmlzQXJyYXkoYXJncy5kZXBlbmRzT24pID8gYXJncy5kZXBlbmRzT24ubGVuZ3RoID4gMCA6IHRydWUpXHJcblx0XHQpIHtcclxuXHRcdFx0Y29uc3QgZGVwZW5kc1N0ciA9IEFycmF5LmlzQXJyYXkoYXJncy5kZXBlbmRzT24pXHJcblx0XHRcdFx0PyBhcmdzLmRlcGVuZHNPbi5qb2luKFwiLCBcIilcclxuXHRcdFx0XHQ6IGFyZ3MuZGVwZW5kc09uO1xyXG5cdFx0XHRtZXRhZGF0YS5wdXNoKFxyXG5cdFx0XHRcdHVzZURhdGF2aWV3Rm9ybWF0XHJcblx0XHRcdFx0XHQ/IGBbZGVwZW5kc09uOjogJHtkZXBlbmRzU3RyfV1gXHJcblx0XHRcdFx0XHQ6IGDim5QgJHtkZXBlbmRzU3RyfWAsXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSURcclxuXHRcdGlmIChhcmdzLmlkKSB7XHJcblx0XHRcdG1ldGFkYXRhLnB1c2goXHJcblx0XHRcdFx0dXNlRGF0YXZpZXdGb3JtYXQgPyBgW2lkOjogJHthcmdzLmlkfV1gIDogYPCfhpQgJHthcmdzLmlkfWAsXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIG1ldGFkYXRhLmpvaW4oXCIgXCIpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSW5zZXJ0IGEgc3VidGFzayB1bmRlciBhIHBhcmVudCB0YXNrXHJcblx0ICovXHJcblx0cHJpdmF0ZSBpbnNlcnRTdWJ0YXNrKFxyXG5cdFx0Y29udGVudDogc3RyaW5nLFxyXG5cdFx0cGFyZW50VGFza0lkOiBzdHJpbmcsXHJcblx0XHRzdWJ0YXNrQ29udGVudDogc3RyaW5nLFxyXG5cdCk6IHN0cmluZyB7XHJcblx0XHRjb25zdCBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoXCJcXG5cIik7XHJcblx0XHRjb25zdCBwYXJlbnRUYXNrID0gdGhpcy5maW5kVGFza0xpbmVCeUlkKGxpbmVzLCBwYXJlbnRUYXNrSWQpO1xyXG5cclxuXHRcdGlmIChwYXJlbnRUYXNrKSB7XHJcblx0XHRcdGNvbnN0IGluZGVudCA9IHRoaXMuZ2V0SW5kZW50KGxpbmVzW3BhcmVudFRhc2subGluZV0pO1xyXG5cdFx0XHRjb25zdCBzdWJ0YXNrSW5kZW50ID0gaW5kZW50ICsgXCJcXHRcIjtcclxuXHRcdFx0Y29uc3Qgc3VidGFza0xpbmUgPSBgJHtzdWJ0YXNrSW5kZW50fSR7c3VidGFza0NvbnRlbnR9YDtcclxuXHJcblx0XHRcdC8vIEZpbmQgd2hlcmUgdG8gaW5zZXJ0IHRoZSBzdWJ0YXNrXHJcblx0XHRcdGxldCBpbnNlcnRMaW5lID0gcGFyZW50VGFzay5saW5lICsgMTtcclxuXHRcdFx0Y29uc3QgcGFyZW50SW5kZW50TGV2ZWwgPSBpbmRlbnQubGVuZ3RoO1xyXG5cclxuXHRcdFx0Ly8gRmluZCB0aGUgZW5kIG9mIGV4aXN0aW5nIHN1YnRhc2tzXHJcblx0XHRcdHdoaWxlIChpbnNlcnRMaW5lIDwgbGluZXMubGVuZ3RoKSB7XHJcblx0XHRcdFx0Y29uc3QgbGluZSA9IGxpbmVzW2luc2VydExpbmVdO1xyXG5cdFx0XHRcdGNvbnN0IGxpbmVJbmRlbnQgPSB0aGlzLmdldEluZGVudChsaW5lKTtcclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRsaW5lSW5kZW50Lmxlbmd0aCA8PSBwYXJlbnRJbmRlbnRMZXZlbCAmJlxyXG5cdFx0XHRcdFx0bGluZS50cmltKCkgIT09IFwiXCJcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpbnNlcnRMaW5lKys7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGxpbmVzLnNwbGljZShpbnNlcnRMaW5lLCAwLCBzdWJ0YXNrTGluZSk7XHJcblx0XHRcdHJldHVybiBsaW5lcy5qb2luKFwiXFxuXCIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIElmIHBhcmVudCBub3QgZm91bmQsIGFwcGVuZCB0byBlbmRcclxuXHRcdHJldHVybiBjb250ZW50ID8gYCR7Y29udGVudH1cXG4ke3N1YnRhc2tDb250ZW50fWAgOiBzdWJ0YXNrQ29udGVudDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNpbXBsZSByZWN1cnJlbmNlIHBhdHRlcm4gcGFyc2VyXHJcblx0ICovXHJcblx0cHJpdmF0ZSBwYXJzZVNpbXBsZVJlY3VycmVuY2UocGF0dGVybjogc3RyaW5nKToge1xyXG5cdFx0aW50ZXJ2YWw6IG51bWJlcjtcclxuXHRcdHVuaXQ6IHN0cmluZztcclxuXHR9IHtcclxuXHRcdGNvbnN0IG1hdGNoID0gcGF0dGVybi5tYXRjaCgvKFxcZCspXFxzKihbZHdteV0pL2kpO1xyXG5cdFx0aWYgKG1hdGNoKSB7XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0aW50ZXJ2YWw6IHBhcnNlSW50KG1hdGNoWzFdKSxcclxuXHRcdFx0XHR1bml0OiBtYXRjaFsyXS50b0xvd2VyQ2FzZSgpLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFRyeSBwYXJzaW5nIFwiZXZlcnkgWCBkYXlzL3dlZWtzL21vbnRocy95ZWFyc1wiXHJcblx0XHRjb25zdCBldmVyeU1hdGNoID0gcGF0dGVybi5tYXRjaChcclxuXHRcdFx0L2V2ZXJ5XFxzKyhcXGQrKT9cXHMqKGRheXx3ZWVrfG1vbnRofHllYXIpcz8vaSxcclxuXHRcdCk7XHJcblx0XHRpZiAoZXZlcnlNYXRjaCkge1xyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdGludGVydmFsOiBldmVyeU1hdGNoWzFdID8gcGFyc2VJbnQoZXZlcnlNYXRjaFsxXSkgOiAxLFxyXG5cdFx0XHRcdHVuaXQ6IGV2ZXJ5TWF0Y2hbMl0udG9Mb3dlckNhc2UoKS5jaGFyQXQoMCksXHJcblx0XHRcdH07XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRGVmYXVsdCB0byBkYWlseVxyXG5cdFx0cmV0dXJuIHsgaW50ZXJ2YWw6IDEsIHVuaXQ6IFwiZFwiIH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBBZGQgaW50ZXJ2YWwgdG8gZGF0ZSBiYXNlZCBvbiB1bml0XHJcblx0ICovXHJcblx0cHJpdmF0ZSBhZGRJbnRlcnZhbChiYXNlOiBEYXRlLCBpbnRlcnZhbDogbnVtYmVyLCB1bml0OiBzdHJpbmcpOiBudW1iZXIge1xyXG5cdFx0Y29uc3QgbiA9IGludGVydmFsO1xyXG5cdFx0c3dpdGNoICh1bml0KSB7XHJcblx0XHRcdGNhc2UgXCJkXCI6XHJcblx0XHRcdFx0YmFzZS5zZXREYXRlKGJhc2UuZ2V0RGF0ZSgpICsgbik7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgXCJ3XCI6XHJcblx0XHRcdFx0YmFzZS5zZXREYXRlKGJhc2UuZ2V0RGF0ZSgpICsgbiAqIDcpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwibVwiOlxyXG5cdFx0XHRcdGJhc2Uuc2V0TW9udGgoYmFzZS5nZXRNb250aCgpICsgbik7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgXCJ5XCI6XHJcblx0XHRcdFx0YmFzZS5zZXRGdWxsWWVhcihiYXNlLmdldEZ1bGxZZWFyKCkgKyBuKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHJcblx0XHQvLyBOb3JtYWxpemUgdG8gbG9jYWwgbWlkbmlnaHRcclxuXHRcdGJhc2Uuc2V0SG91cnMoMCwgMCwgMCwgMCk7XHJcblx0XHRyZXR1cm4gYmFzZS5nZXRUaW1lKCk7XHJcblx0fVxyXG5cclxuXHQvLyA9PT09PSBDYW52YXMgVGFzayBNZXRob2RzID09PT09XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBhIENhbnZhcyB0YXNrXHJcblx0ICovXHJcblx0YXN5bmMgdXBkYXRlQ2FudmFzVGFzayhcclxuXHRcdGFyZ3M6IFVwZGF0ZVRhc2tBcmdzLFxyXG5cdCk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyB0YXNrPzogVGFzazsgZXJyb3I/OiBzdHJpbmcgfT4ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3Qgb3JpZ2luYWxUYXNrID0gYXdhaXQgUHJvbWlzZS5yZXNvbHZlKFxyXG5cdFx0XHRcdHRoaXMuZ2V0VGFza0J5SWQoYXJncy50YXNrSWQpLFxyXG5cdFx0XHQpO1xyXG5cdFx0XHRpZiAoIW9yaWdpbmFsVGFzaykge1xyXG5cdFx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJUYXNrIG5vdCBmb3VuZFwiIH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEVuc3VyZSBpdCdzIGEgQ2FudmFzIHRhc2tcclxuXHRcdFx0aWYgKCFDYW52YXNUYXNrVXBkYXRlci5pc0NhbnZhc1Rhc2sob3JpZ2luYWxUYXNrKSkge1xyXG5cdFx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJUYXNrIGlzIG5vdCBhIENhbnZhcyB0YXNrXCIgfTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIHVwZGF0ZWQgdGFzayBvYmplY3QgKGRlZXAtbWVyZ2UgbWV0YWRhdGEgdG8gcHJlc2VydmUgdW5jaGFuZ2VkIGZpZWxkcylcclxuXHRcdFx0Y29uc3QgdXBkYXRlZFRhc2sgPSB7XHJcblx0XHRcdFx0Li4ub3JpZ2luYWxUYXNrLFxyXG5cdFx0XHRcdC4uLmFyZ3MudXBkYXRlcyxcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0Li4ub3JpZ2luYWxUYXNrLm1ldGFkYXRhLFxyXG5cdFx0XHRcdFx0Li4uKGFyZ3MudXBkYXRlcyBhcyBhbnkpLm1ldGFkYXRhLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0gYXMgVGFzazxDYW52YXNUYXNrTWV0YWRhdGE+O1xyXG5cclxuXHRcdFx0Ly8gVXNlIENhbnZhc1Rhc2tVcGRhdGVyIHRvIHVwZGF0ZSB0aGUgdGFza1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmNhbnZhc1Rhc2tVcGRhdGVyLnVwZGF0ZUNhbnZhc1Rhc2soXHJcblx0XHRcdFx0b3JpZ2luYWxUYXNrIGFzIFRhc2s8Q2FudmFzVGFza01ldGFkYXRhPixcclxuXHRcdFx0XHR1cGRhdGVkVGFzayxcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGlmIChyZXN1bHQuc3VjY2Vzcykge1xyXG5cdFx0XHRcdC8vIEVtaXQgdGFzayB1cGRhdGVkIGV2ZW50IGZvciBkYXRhZmxvd1xyXG5cdFx0XHRcdGVtaXQodGhpcy5hcHAsIEV2ZW50cy5UQVNLX1VQREFURUQsIHsgdGFzazogdXBkYXRlZFRhc2sgfSk7XHJcblxyXG5cdFx0XHRcdC8vIFRyaWdnZXIgdGFzay1jb21wbGV0ZWQgZXZlbnQgaWYgdGFzayB3YXMganVzdCBjb21wbGV0ZWRcclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRhcmdzLnVwZGF0ZXMuY29tcGxldGVkID09PSB0cnVlICYmXHJcblx0XHRcdFx0XHQhb3JpZ2luYWxUYXNrLmNvbXBsZXRlZFxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0dGhpcy5hcHAud29ya3NwYWNlLnRyaWdnZXIoXHJcblx0XHRcdFx0XHRcdFwidGFzay1nZW5pdXM6dGFzay1jb21wbGV0ZWRcIixcclxuXHRcdFx0XHRcdFx0dXBkYXRlZFRhc2ssXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0cmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgdGFzazogdXBkYXRlZFRhc2sgfTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IHJlc3VsdC5lcnJvciB9O1xyXG5cdFx0XHR9XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiV3JpdGVBUEk6IEVycm9yIHVwZGF0aW5nIENhbnZhcyB0YXNrOlwiLCBlcnJvcik7XHJcblx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogU3RyaW5nKGVycm9yKSB9O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRGVsZXRlIGEgQ2FudmFzIHRhc2tcclxuXHQgKi9cclxuXHRhc3luYyBkZWxldGVDYW52YXNUYXNrKFxyXG5cdFx0YXJnczogRGVsZXRlVGFza0FyZ3MsXHJcblx0KTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IGVycm9yPzogc3RyaW5nIH0+IHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IHRhc2sgPSBhd2FpdCBQcm9taXNlLnJlc29sdmUodGhpcy5nZXRUYXNrQnlJZChhcmdzLnRhc2tJZCkpO1xyXG5cdFx0XHRpZiAoIXRhc2spIHtcclxuXHRcdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiVGFzayBub3QgZm91bmRcIiB9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBFbnN1cmUgaXQncyBhIENhbnZhcyB0YXNrXHJcblx0XHRcdGlmICghQ2FudmFzVGFza1VwZGF0ZXIuaXNDYW52YXNUYXNrKHRhc2spKSB7XHJcblx0XHRcdFx0cmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIlRhc2sgaXMgbm90IGEgQ2FudmFzIHRhc2tcIiB9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBDb2xsZWN0IGFsbCB0YXNrcyB0byBkZWxldGVcclxuXHRcdFx0Y29uc3QgZGVsZXRlZFRhc2tJZHM6IHN0cmluZ1tdID0gW2FyZ3MudGFza0lkXTtcclxuXHJcblx0XHRcdGlmIChhcmdzLmRlbGV0ZUNoaWxkcmVuKSB7XHJcblx0XHRcdFx0Ly8gR2V0IGFsbCBkZXNjZW5kYW50IHRhc2tzXHJcblx0XHRcdFx0Y29uc3QgZGVzY2VuZGFudElkcyA9IGF3YWl0IHRoaXMuZ2V0RGVzY2VuZGFudFRhc2tJZHMoXHJcblx0XHRcdFx0XHRhcmdzLnRhc2tJZCxcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGRlbGV0ZWRUYXNrSWRzLnB1c2goLi4uZGVzY2VuZGFudElkcyk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFVzZSBDYW52YXNUYXNrVXBkYXRlciB0byBkZWxldGUgdGhlIHRhc2socylcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5jYW52YXNUYXNrVXBkYXRlci5kZWxldGVDYW52YXNUYXNrKFxyXG5cdFx0XHRcdHRhc2sgYXMgVGFzazxDYW52YXNUYXNrTWV0YWRhdGE+LFxyXG5cdFx0XHRcdGFyZ3MuZGVsZXRlQ2hpbGRyZW4sXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRpZiAocmVzdWx0LnN1Y2Nlc3MpIHtcclxuXHRcdFx0XHQvLyBFbWl0IFRBU0tfREVMRVRFRCBldmVudCB3aXRoIGFsbCBkZWxldGVkIHRhc2sgSURzXHJcblx0XHRcdFx0ZW1pdCh0aGlzLmFwcCwgRXZlbnRzLlRBU0tfREVMRVRFRCwge1xyXG5cdFx0XHRcdFx0dGFza0lkOiBhcmdzLnRhc2tJZCxcclxuXHRcdFx0XHRcdGZpbGVQYXRoOiB0YXNrLmZpbGVQYXRoLFxyXG5cdFx0XHRcdFx0ZGVsZXRlZFRhc2tJZHMsXHJcblx0XHRcdFx0XHRtb2RlOiBhcmdzLmRlbGV0ZUNoaWxkcmVuID8gXCJzdWJ0cmVlXCIgOiBcInNpbmdsZVwiLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIldyaXRlQVBJOiBFcnJvciBkZWxldGluZyBDYW52YXMgdGFzazpcIiwgZXJyb3IpO1xyXG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFN0cmluZyhlcnJvcikgfTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIE1vdmUgYSBDYW52YXMgdGFzayB0byBhbm90aGVyIGxvY2F0aW9uXHJcblx0ICovXHJcblx0YXN5bmMgbW92ZUNhbnZhc1Rhc2soYXJnczoge1xyXG5cdFx0dGFza0lkOiBzdHJpbmc7XHJcblx0XHR0YXJnZXRGaWxlUGF0aDogc3RyaW5nO1xyXG5cdFx0dGFyZ2V0Tm9kZUlkPzogc3RyaW5nO1xyXG5cdFx0dGFyZ2V0U2VjdGlvbj86IHN0cmluZztcclxuXHR9KTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IGVycm9yPzogc3RyaW5nIH0+IHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IHRhc2sgPSBhd2FpdCBQcm9taXNlLnJlc29sdmUodGhpcy5nZXRUYXNrQnlJZChhcmdzLnRhc2tJZCkpO1xyXG5cdFx0XHRpZiAoIXRhc2spIHtcclxuXHRcdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiVGFzayBub3QgZm91bmRcIiB9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBFbnN1cmUgaXQncyBhIENhbnZhcyB0YXNrXHJcblx0XHRcdGlmICghQ2FudmFzVGFza1VwZGF0ZXIuaXNDYW52YXNUYXNrKHRhc2spKSB7XHJcblx0XHRcdFx0cmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIlRhc2sgaXMgbm90IGEgQ2FudmFzIHRhc2tcIiB9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBVc2UgQ2FudmFzVGFza1VwZGF0ZXIgdG8gbW92ZSB0aGUgdGFza1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmNhbnZhc1Rhc2tVcGRhdGVyLm1vdmVDYW52YXNUYXNrKFxyXG5cdFx0XHRcdHRhc2sgYXMgVGFzazxDYW52YXNUYXNrTWV0YWRhdGE+LFxyXG5cdFx0XHRcdGFyZ3MudGFyZ2V0RmlsZVBhdGgsXHJcblx0XHRcdFx0YXJncy50YXJnZXROb2RlSWQsXHJcblx0XHRcdFx0YXJncy50YXJnZXRTZWN0aW9uLFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0cmV0dXJuIHJlc3VsdDtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJXcml0ZUFQSTogRXJyb3IgbW92aW5nIENhbnZhcyB0YXNrOlwiLCBlcnJvcik7XHJcblx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogU3RyaW5nKGVycm9yKSB9O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRHVwbGljYXRlIGEgQ2FudmFzIHRhc2tcclxuXHQgKi9cclxuXHRhc3luYyBkdXBsaWNhdGVDYW52YXNUYXNrKGFyZ3M6IHtcclxuXHRcdHRhc2tJZDogc3RyaW5nO1xyXG5cdFx0dGFyZ2V0RmlsZVBhdGg/OiBzdHJpbmc7XHJcblx0XHR0YXJnZXROb2RlSWQ/OiBzdHJpbmc7XHJcblx0XHR0YXJnZXRTZWN0aW9uPzogc3RyaW5nO1xyXG5cdFx0cHJlc2VydmVNZXRhZGF0YT86IGJvb2xlYW47XHJcblx0fSk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBlcnJvcj86IHN0cmluZyB9PiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCB0YXNrID0gYXdhaXQgUHJvbWlzZS5yZXNvbHZlKHRoaXMuZ2V0VGFza0J5SWQoYXJncy50YXNrSWQpKTtcclxuXHRcdFx0aWYgKCF0YXNrKSB7XHJcblx0XHRcdFx0cmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIlRhc2sgbm90IGZvdW5kXCIgfTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gRW5zdXJlIGl0J3MgYSBDYW52YXMgdGFza1xyXG5cdFx0XHRpZiAoIUNhbnZhc1Rhc2tVcGRhdGVyLmlzQ2FudmFzVGFzayh0YXNrKSkge1xyXG5cdFx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJUYXNrIGlzIG5vdCBhIENhbnZhcyB0YXNrXCIgfTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVXNlIENhbnZhc1Rhc2tVcGRhdGVyIHRvIGR1cGxpY2F0ZSB0aGUgdGFza1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmNhbnZhc1Rhc2tVcGRhdGVyLmR1cGxpY2F0ZUNhbnZhc1Rhc2soXHJcblx0XHRcdFx0dGFzayBhcyBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4sXHJcblx0XHRcdFx0YXJncy50YXJnZXRGaWxlUGF0aCxcclxuXHRcdFx0XHRhcmdzLnRhcmdldE5vZGVJZCxcclxuXHRcdFx0XHRhcmdzLnRhcmdldFNlY3Rpb24sXHJcblx0XHRcdFx0YXJncy5wcmVzZXJ2ZU1ldGFkYXRhLFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0cmV0dXJuIHJlc3VsdDtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJXcml0ZUFQSTogRXJyb3IgZHVwbGljYXRpbmcgQ2FudmFzIHRhc2s6XCIsIGVycm9yKTtcclxuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBTdHJpbmcoZXJyb3IpIH07XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBBZGQgYSBuZXcgdGFzayB0byBhIENhbnZhcyBub2RlXHJcblx0ICovXHJcblx0YXN5bmMgYWRkVGFza1RvQ2FudmFzTm9kZShhcmdzOiB7XHJcblx0XHRmaWxlUGF0aDogc3RyaW5nO1xyXG5cdFx0Y29udGVudDogc3RyaW5nO1xyXG5cdFx0dGFyZ2V0Tm9kZUlkPzogc3RyaW5nO1xyXG5cdFx0dGFyZ2V0U2VjdGlvbj86IHN0cmluZztcclxuXHRcdGNvbXBsZXRlZD86IGJvb2xlYW47XHJcblx0XHRtZXRhZGF0YT86IFBhcnRpYWw8Q2FudmFzVGFza01ldGFkYXRhPjtcclxuXHR9KTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IGVycm9yPzogc3RyaW5nIH0+IHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdC8vIEZvcm1hdCB0YXNrIGNvbnRlbnQgd2l0aCBjaGVja2JveFxyXG5cdFx0XHRjb25zdCBjaGVja2JveFN0YXRlID0gYXJncy5jb21wbGV0ZWQgPyBcIlt4XVwiIDogXCJbIF1cIjtcclxuXHRcdFx0bGV0IHRhc2tDb250ZW50ID0gYC0gJHtjaGVja2JveFN0YXRlfSAke2FyZ3MuY29udGVudH1gO1xyXG5cclxuXHRcdFx0Ly8gQWRkIG1ldGFkYXRhIGlmIHByb3ZpZGVkXHJcblx0XHRcdGlmIChhcmdzLm1ldGFkYXRhKSB7XHJcblx0XHRcdFx0Y29uc3QgbWV0YWRhdGFTdHIgPSB0aGlzLmdlbmVyYXRlTWV0YWRhdGEoYXJncy5tZXRhZGF0YSBhcyBhbnkpO1xyXG5cdFx0XHRcdGlmIChtZXRhZGF0YVN0cikge1xyXG5cdFx0XHRcdFx0dGFza0NvbnRlbnQgKz0gYCAke21ldGFkYXRhU3RyfWA7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBVc2UgQ2FudmFzVGFza1VwZGF0ZXIgdG8gYWRkIHRoZSB0YXNrXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuY2FudmFzVGFza1VwZGF0ZXIuYWRkVGFza1RvQ2FudmFzTm9kZShcclxuXHRcdFx0XHRhcmdzLmZpbGVQYXRoLFxyXG5cdFx0XHRcdHRhc2tDb250ZW50LFxyXG5cdFx0XHRcdGFyZ3MudGFyZ2V0Tm9kZUlkLFxyXG5cdFx0XHRcdGFyZ3MudGFyZ2V0U2VjdGlvbixcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdHJldHVybiByZXN1bHQ7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiV3JpdGVBUEk6IEVycm9yIGFkZGluZyB0YXNrIHRvIENhbnZhcyBub2RlOlwiLCBlcnJvcik7XHJcblx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogU3RyaW5nKGVycm9yKSB9O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgYSB0YXNrIGlzIGEgQ2FudmFzIHRhc2tcclxuXHQgKi9cclxuXHRpc0NhbnZhc1Rhc2sodGFzazogVGFzayk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIENhbnZhc1Rhc2tVcGRhdGVyLmlzQ2FudmFzVGFzayh0YXNrKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEluc2VydCBkYXRlIG1ldGFkYXRhIGF0IHRoZSBjb3JyZWN0IHBvc2l0aW9uIGluIHRoZSB0YXNrIGxpbmVcclxuXHQgKi9cclxuXHRwcml2YXRlIGluc2VydERhdGVBdENvcnJlY3RQb3NpdGlvbihcclxuXHRcdHRhc2tMaW5lOiBzdHJpbmcsXHJcblx0XHRkYXRlTWV0YWRhdGE6IHN0cmluZyxcclxuXHRcdGRhdGVUeXBlOiBcImNvbXBsZXRlZFwiIHwgXCJjYW5jZWxsZWRcIiB8IFwic3RhcnRcIixcclxuXHQpOiBzdHJpbmcge1xyXG5cdFx0Ly8gQ2hlY2sgZm9yIGJsb2NrIHJlZmVyZW5jZSBhdCB0aGUgZW5kXHJcblx0XHRjb25zdCBibG9ja1JlZlBhdHRlcm4gPSAvXFxzKihcXF5bYS16QS1aMC05LV0rKSQvO1xyXG5cdFx0Y29uc3QgYmxvY2tSZWZNYXRjaCA9IHRhc2tMaW5lLm1hdGNoKGJsb2NrUmVmUGF0dGVybik7XHJcblxyXG5cdFx0aWYgKGJsb2NrUmVmTWF0Y2ggJiYgYmxvY2tSZWZNYXRjaC5pbmRleCAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdC8vIEluc2VydCBiZWZvcmUgYmxvY2sgcmVmZXJlbmNlXHJcblx0XHRcdGNvbnN0IGluc2VydFBvcyA9IGJsb2NrUmVmTWF0Y2guaW5kZXg7XHJcblx0XHRcdHJldHVybiAoXHJcblx0XHRcdFx0dGFza0xpbmUuc2xpY2UoMCwgaW5zZXJ0UG9zKSArXHJcblx0XHRcdFx0XCIgXCIgK1xyXG5cdFx0XHRcdGRhdGVNZXRhZGF0YSArXHJcblx0XHRcdFx0dGFza0xpbmUuc2xpY2UoaW5zZXJ0UG9zKVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEZvciBjb21wbGV0aW9uIGRhdGUsIGFkZCBhdCB0aGUgdmVyeSBlbmRcclxuXHRcdGlmIChkYXRlVHlwZSA9PT0gXCJjb21wbGV0ZWRcIikge1xyXG5cdFx0XHRyZXR1cm4gdGFza0xpbmUgKyBcIiBcIiArIGRhdGVNZXRhZGF0YTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBGb3IgY2FuY2VsbGVkIGFuZCBzdGFydCBkYXRlcywgaW5zZXJ0IGFmdGVyIHRhc2sgY29udGVudCBidXQgYmVmb3JlIG90aGVyIG1ldGFkYXRhXHJcblx0XHQvLyBGaW5kIHdoZXJlIG1ldGFkYXRhIHN0YXJ0cyAodGFncywgZGF0ZXMsIGV0YylcclxuXHRcdC8vIERldGVjdCBzdHJpY3QgdHJhaWxpbmcgbWV0YWRhdGEgKHJlY29nbml6ZWQga2V5cykgb24gZnVsbCBsaW5lXHJcblx0XHRjb25zdCBzYW5pdGl6ZWRGdWxsID0gdGFza0xpbmVcclxuXHRcdFx0LnJlcGxhY2UoL1xcW1xcW1teXFxdXSpcXF1cXF0vZywgKG0pID0+IFwieFwiLnJlcGVhdChtLmxlbmd0aCkpXHJcblx0XHRcdC5yZXBsYWNlKC9cXFtbXlxcXV0qXFxdXFwoW15cXCldKlxcKS9nLCAobSkgPT4gXCJ4XCIucmVwZWF0KG0ubGVuZ3RoKSlcclxuXHRcdFx0LnJlcGxhY2UoL2BbXmBdKmAvZywgKG0pID0+IFwieFwiLnJlcGVhdChtLmxlbmd0aCkpO1xyXG5cdFx0Y29uc3QgZXNjRCA9IChzOiBzdHJpbmcpID0+IHMucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csIFwiXFxcXCQmXCIpO1xyXG5cdFx0Y29uc3QgcHJvamVjdEtleUQgPVxyXG5cdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0VGFnUHJlZml4Py5kYXRhdmlldyB8fCBcInByb2plY3RcIjtcclxuXHRcdGNvbnN0IGNvbnRleHRLZXlEID1cclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuY29udGV4dFRhZ1ByZWZpeD8uZGF0YXZpZXcgfHwgXCJjb250ZXh0XCI7XHJcblx0XHRjb25zdCBkdktleXNHcm91cEQgPSBbXHJcblx0XHRcdFwidGFnc1wiLFxyXG5cdFx0XHRlc2NEKHByb2plY3RLZXlEKSxcclxuXHRcdFx0ZXNjRChjb250ZXh0S2V5RCksXHJcblx0XHRcdFwicHJpb3JpdHlcIixcclxuXHRcdFx0XCJyZXBlYXRcIixcclxuXHRcdFx0XCJzdGFydFwiLFxyXG5cdFx0XHRcInNjaGVkdWxlZFwiLFxyXG5cdFx0XHRcImR1ZVwiLFxyXG5cdFx0XHRcImNvbXBsZXRpb25cIixcclxuXHRcdFx0XCJjYW5jZWxsZWRcIixcclxuXHRcdFx0XCJvbkNvbXBsZXRpb25cIixcclxuXHRcdFx0XCJkZXBlbmRzT25cIixcclxuXHRcdFx0XCJpZFwiLFxyXG5cdFx0XS5qb2luKFwifFwiKTtcclxuXHRcdGNvbnN0IGJhc2VFbW9qaUQgPSBcIijwn5S6fOKPq3zwn5S8fPCflL184o+sfPCfm6t84o+zfPCfk4V84pyFfPCflIEpXCI7XHJcblx0XHRjb25zdCBkdkZpZWxkVG9rZW5EID0gYFxcXFxbKD86JHtkdktleXNHcm91cER9KVxcXFxzKjo6W15cXFxcXV0qXFxcXF1gO1xyXG5cdFx0Y29uc3QgdGFnVG9rZW5EID0gXCIjW0EtWmEtel1bXFxcXHcvLV0qXCI7XHJcblx0XHRjb25zdCBhdFRva2VuRCA9IFwiQFtBLVphLXpdW1xcXFx3Ly1dKlwiO1xyXG5cdFx0Y29uc3QgcGx1c1Rva2VuRCA9IFwiXFxcXCtbQS1aYS16XVtcXFxcdy8tXSpcIjtcclxuXHRcdGNvbnN0IGVtb2ppU2VnRCA9IGAoPzoke2Jhc2VFbW9qaUR9W15cXFxcbl0qKWA7XHJcblx0XHRjb25zdCB0b2tlbkQgPSBgKD86JHtlbW9qaVNlZ0R9fCR7ZHZGaWVsZFRva2VuRH18JHt0YWdUb2tlbkR9fCR7YXRUb2tlbkR9fCR7cGx1c1Rva2VuRH0pYDtcclxuXHRcdGNvbnN0IHRyYWlsaW5nRCA9IG5ldyBSZWdFeHAoYCg/OlxcXFxzKyR7dG9rZW5EfSkrJGApO1xyXG5cdFx0Y29uc3QgdG1EID0gc2FuaXRpemVkRnVsbC5tYXRjaCh0cmFpbGluZ0QpO1xyXG5cclxuXHRcdGlmICh0bUQpIHtcclxuXHRcdFx0Y29uc3QgaW5zZXJ0UG9zID0gdGFza0xpbmUubGVuZ3RoIC0gKHRtRFswXT8ubGVuZ3RoIHx8IDApO1xyXG5cdFx0XHRyZXR1cm4gKFxyXG5cdFx0XHRcdHRhc2tMaW5lLnNsaWNlKDAsIGluc2VydFBvcykgK1xyXG5cdFx0XHRcdFwiIFwiICtcclxuXHRcdFx0XHRkYXRlTWV0YWRhdGEgK1xyXG5cdFx0XHRcdHRhc2tMaW5lLnNsaWNlKGluc2VydFBvcylcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBObyBtZXRhZGF0YSBmb3VuZCwgYWRkIGF0IHRoZSBlbmRcclxuXHRcdHJldHVybiB0YXNrTGluZSArIFwiIFwiICsgZGF0ZU1ldGFkYXRhO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ3JlYXRlcyBhIG5ldyByZWN1cnJpbmcgdGFzayBsaW5lIGZyb20gYSBjb21wbGV0ZWQgdGFza1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgY3JlYXRlUmVjdXJyaW5nVGFzayhcclxuXHRcdGNvbXBsZXRlZFRhc2s6IFRhc2ssXHJcblx0XHRpbmRlbnRhdGlvbjogc3RyaW5nLFxyXG5cdCk6IHN0cmluZyB7XHJcblx0XHQvLyBDYWxjdWxhdGUgdGhlIG5leHQgZHVlIGRhdGUgYmFzZWQgb24gdGhlIHJlY3VycmVuY2UgcGF0dGVyblxyXG5cdFx0Y29uc3QgbmV4dERhdGUgPSB0aGlzLmNhbGN1bGF0ZU5leHREdWVEYXRlKGNvbXBsZXRlZFRhc2spO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBhIG5ldyB0YXNrIHdpdGggdGhlIHNhbWUgY29udGVudCBidXQgdXBkYXRlZCBkYXRlc1xyXG5cdFx0Y29uc3QgbmV3VGFzayA9IHsgLi4uY29tcGxldGVkVGFzayB9O1xyXG5cdFx0Ly8gUmVzZXQgY29tcGxldGlvbiBzdGF0dXMgYW5kIGRhdGVcclxuXHRcdG5ld1Rhc2suY29tcGxldGVkID0gZmFsc2U7XHJcblx0XHRuZXdUYXNrLm1ldGFkYXRhLmNvbXBsZXRlZERhdGUgPSB1bmRlZmluZWQ7XHJcblxyXG5cdFx0Ly8gRGV0ZXJtaW5lIHdoZXJlIHRvIGFwcGx5IHRoZSBuZXh0IGRhdGUgYmFzZWQgb24gd2hhdCB0aGUgb3JpZ2luYWwgdGFzayBoYWRcclxuXHRcdGlmIChjb21wbGV0ZWRUYXNrLm1ldGFkYXRhLmR1ZURhdGUpIHtcclxuXHRcdFx0Ly8gSWYgb3JpZ2luYWwgdGFzayBoYWQgZHVlIGRhdGUsIHVwZGF0ZSBkdWUgZGF0ZVxyXG5cdFx0XHRuZXdUYXNrLm1ldGFkYXRhLmR1ZURhdGUgPSBuZXh0RGF0ZTtcclxuXHRcdH0gZWxzZSBpZiAoY29tcGxldGVkVGFzay5tZXRhZGF0YS5zY2hlZHVsZWREYXRlKSB7XHJcblx0XHRcdC8vIElmIG9yaWdpbmFsIHRhc2sgb25seSBoYWQgc2NoZWR1bGVkIGRhdGUsIHVwZGF0ZSBzY2hlZHVsZWQgZGF0ZVxyXG5cdFx0XHRuZXdUYXNrLm1ldGFkYXRhLnNjaGVkdWxlZERhdGUgPSBuZXh0RGF0ZTtcclxuXHRcdFx0bmV3VGFzay5tZXRhZGF0YS5kdWVEYXRlID0gdW5kZWZpbmVkOyAvLyBNYWtlIHN1cmUgZHVlIGRhdGUgaXMgbm90IHNldFxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0bmV3VGFzay5tZXRhZGF0YS5kdWVEYXRlID0gbmV4dERhdGU7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRXh0cmFjdCB0aGUgb3JpZ2luYWwgbGlzdCBtYXJrZXIgKC0sICosIDEuLCBldGMuKSBmcm9tIHRoZSBvcmlnaW5hbCBtYXJrZG93blxyXG5cdFx0bGV0IGxpc3RNYXJrZXIgPSBcIi0gXCI7XHJcblx0XHRpZiAoY29tcGxldGVkVGFzay5vcmlnaW5hbE1hcmtkb3duKSB7XHJcblx0XHRcdC8vIE1hdGNoIHRoZSBsaXN0IG1hcmtlciBwYXR0ZXJuOiBjb3VsZCBiZSBcIi0gXCIsIFwiKiBcIiwgXCIxLiBcIiwgZXRjLlxyXG5cdFx0XHRjb25zdCBsaXN0TWFya2VyTWF0Y2ggPSBjb21wbGV0ZWRUYXNrLm9yaWdpbmFsTWFya2Rvd24ubWF0Y2goXHJcblx0XHRcdFx0L14oXFxzKikoWypcXC0rXXxcXGQrXFwuKVxccytcXFsvLFxyXG5cdFx0XHQpO1xyXG5cdFx0XHRpZiAobGlzdE1hcmtlck1hdGNoICYmIGxpc3RNYXJrZXJNYXRjaFsyXSkge1xyXG5cdFx0XHRcdGxpc3RNYXJrZXIgPSBsaXN0TWFya2VyTWF0Y2hbMl0gKyBcIiBcIjtcclxuXHRcdFx0XHQvLyBJZiBpdCdzIGEgbnVtYmVyZWQgbGlzdCwgaW5jcmVtZW50IHRoZSBudW1iZXJcclxuXHRcdFx0XHRpZiAoL15cXGQrXFwuJC8udGVzdChsaXN0TWFya2VyTWF0Y2hbMl0pKSB7XHJcblx0XHRcdFx0XHRjb25zdCBudW1iZXJTdHIgPSBsaXN0TWFya2VyTWF0Y2hbMl0ucmVwbGFjZSgvXFwuJC8sIFwiXCIpO1xyXG5cdFx0XHRcdFx0Y29uc3QgbnVtYmVyID0gcGFyc2VJbnQobnVtYmVyU3RyKTtcclxuXHRcdFx0XHRcdGxpc3RNYXJrZXIgPSBudW1iZXIgKyAxICsgXCIuIFwiO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFN0YXJ0IHdpdGggdGhlIGJhc2ljIHRhc2sgdXNpbmcgdGhlIGV4dHJhY3RlZCBsaXN0IG1hcmtlciBhbmQgY2xlYW4gY29udGVudFxyXG5cdFx0bGV0IG5ld1Rhc2tMaW5lID0gYCR7aW5kZW50YXRpb259JHtsaXN0TWFya2VyfVsgXSAke2NvbXBsZXRlZFRhc2suY29udGVudH1gO1xyXG5cclxuXHRcdC8vIEdlbmVyYXRlIG1ldGFkYXRhIGZvciB0aGUgbmV3IHRhc2tcclxuXHRcdGNvbnN0IG1ldGFkYXRhID0gdGhpcy5nZW5lcmF0ZU1ldGFkYXRhKHtcclxuXHRcdFx0dGFnczogbmV3VGFzay5tZXRhZGF0YS50YWdzLFxyXG5cdFx0XHRwcm9qZWN0OiBuZXdUYXNrLm1ldGFkYXRhLnByb2plY3QsXHJcblx0XHRcdGNvbnRleHQ6IG5ld1Rhc2subWV0YWRhdGEuY29udGV4dCxcclxuXHRcdFx0cHJpb3JpdHk6IG5ld1Rhc2subWV0YWRhdGEucHJpb3JpdHksXHJcblx0XHRcdHN0YXJ0RGF0ZTogbmV3VGFzay5tZXRhZGF0YS5zdGFydERhdGUsXHJcblx0XHRcdGR1ZURhdGU6IG5ld1Rhc2subWV0YWRhdGEuZHVlRGF0ZSxcclxuXHRcdFx0c2NoZWR1bGVkRGF0ZTogbmV3VGFzay5tZXRhZGF0YS5zY2hlZHVsZWREYXRlLFxyXG5cdFx0XHRyZWN1cnJlbmNlOiBuZXdUYXNrLm1ldGFkYXRhLnJlY3VycmVuY2UsXHJcblx0XHRcdG9uQ29tcGxldGlvbjogbmV3VGFzay5tZXRhZGF0YS5vbkNvbXBsZXRpb24sXHJcblx0XHRcdGRlcGVuZHNPbjogbmV3VGFzay5tZXRhZGF0YS5kZXBlbmRzT24sXHJcblx0XHRcdGlkOiBuZXdUYXNrLm1ldGFkYXRhLmlkLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0aWYgKG1ldGFkYXRhKSB7XHJcblx0XHRcdG5ld1Rhc2tMaW5lICs9IGAgJHttZXRhZGF0YX1gO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBuZXdUYXNrTGluZTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENhbGN1bGF0ZXMgdGhlIG5leHQgZHVlIGRhdGUgZm9yIGEgcmVjdXJyaW5nIHRhc2tcclxuXHQgKiBGaXhlZCB0byBwcm9wZXJseSBoYW5kbGUgd2Vla2x5IGFuZCBtb250aGx5IHJlY3VycmVuY2VcclxuXHQgKi9cclxuXHRwcml2YXRlIGNhbGN1bGF0ZU5leHREdWVEYXRlKHRhc2s6IFRhc2spOiBudW1iZXIgfCB1bmRlZmluZWQge1xyXG5cdFx0aWYgKCF0YXNrLm1ldGFkYXRhPy5yZWN1cnJlbmNlKSByZXR1cm4gdW5kZWZpbmVkO1xyXG5cclxuXHRcdC8vIERldGVybWluZSBiYXNlIGRhdGUgYmFzZWQgb24gdXNlciBzZXR0aW5nc1xyXG5cdFx0bGV0IGJhc2VEYXRlOiBEYXRlO1xyXG5cdFx0Y29uc3QgcmVjdXJyZW5jZURhdGVCYXNlID1cclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucmVjdXJyZW5jZURhdGVCYXNlIHx8IFwiZHVlXCI7XHJcblxyXG5cdFx0aWYgKHJlY3VycmVuY2VEYXRlQmFzZSA9PT0gXCJjdXJyZW50XCIpIHtcclxuXHRcdFx0Ly8gQWx3YXlzIHVzZSBjdXJyZW50IGRhdGVcclxuXHRcdFx0YmFzZURhdGUgPSBuZXcgRGF0ZSgpO1xyXG5cdFx0fSBlbHNlIGlmIChcclxuXHRcdFx0cmVjdXJyZW5jZURhdGVCYXNlID09PSBcInNjaGVkdWxlZFwiICYmXHJcblx0XHRcdHRhc2subWV0YWRhdGEuc2NoZWR1bGVkRGF0ZVxyXG5cdFx0KSB7XHJcblx0XHRcdC8vIFVzZSBzY2hlZHVsZWQgZGF0ZSBpZiBhdmFpbGFibGVcclxuXHRcdFx0YmFzZURhdGUgPSBuZXcgRGF0ZSh0YXNrLm1ldGFkYXRhLnNjaGVkdWxlZERhdGUpO1xyXG5cdFx0fSBlbHNlIGlmIChyZWN1cnJlbmNlRGF0ZUJhc2UgPT09IFwiZHVlXCIgJiYgdGFzay5tZXRhZGF0YS5kdWVEYXRlKSB7XHJcblx0XHRcdC8vIFVzZSBkdWUgZGF0ZSBpZiBhdmFpbGFibGUgKGRlZmF1bHQgYmVoYXZpb3IpXHJcblx0XHRcdGJhc2VEYXRlID0gbmV3IERhdGUodGFzay5tZXRhZGF0YS5kdWVEYXRlKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIEZhbGxiYWNrIHRvIGN1cnJlbnQgZGF0ZSBpZiB0aGUgc3BlY2lmaWVkIGRhdGUgdHlwZSBpcyBub3QgYXZhaWxhYmxlXHJcblx0XHRcdGJhc2VEYXRlID0gbmV3IERhdGUoKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBFbnN1cmUgYmFzZURhdGUgaXMgYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgZGF5IGZvciBkYXRlLWJhc2VkIHJlY3VycmVuY2VcclxuXHRcdGJhc2VEYXRlLnNldEhvdXJzKDAsIDAsIDAsIDApO1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdC8vIFRyeSBwYXJzaW5nIHdpdGggcnJ1bGUgZmlyc3RcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRjb25zdCBydWxlID0gcnJ1bGVzdHIodGFzay5tZXRhZGF0YS5yZWN1cnJlbmNlLCB7XHJcblx0XHRcdFx0XHRkdHN0YXJ0OiBiYXNlRGF0ZSxcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gR2V0IGN1cnJlbnQgZGF0ZSBmb3IgY29tcGFyaXNvblxyXG5cdFx0XHRcdGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XHJcblx0XHRcdFx0Y29uc3QgdG9kYXlTdGFydCA9IG5ldyBEYXRlKG5vdyk7XHJcblx0XHRcdFx0dG9kYXlTdGFydC5zZXRIb3VycygwLCAwLCAwLCAwKTtcclxuXHJcblx0XHRcdFx0Ly8gV2Ugd2FudCB0aGUgZmlyc3Qgb2NjdXJyZW5jZSBzdHJpY3RseSBhZnRlciB0b2RheSAobm90IGp1c3QgYWZ0ZXIgYmFzZURhdGUpXHJcblx0XHRcdFx0Ly8gVGhpcyBlbnN1cmVzIHRoZSBuZXh0IHRhc2sgaXMgYWx3YXlzIGluIHRoZSBmdXR1cmVcclxuXHRcdFx0XHRjb25zdCBhZnRlckRhdGUgPSBuZXcgRGF0ZShcclxuXHRcdFx0XHRcdE1hdGgubWF4KGJhc2VEYXRlLmdldFRpbWUoKSwgdG9kYXlTdGFydC5nZXRUaW1lKCkpICsgMTAwMCxcclxuXHRcdFx0XHQpOyAvLyAxIHNlY29uZCBhZnRlciB0aGUgbGF0ZXIgb2YgYmFzZURhdGUgb3IgdG9kYXlcclxuXHRcdFx0XHRjb25zdCBuZXh0T2NjdXJyZW5jZSA9IHJ1bGUuYWZ0ZXIoYWZ0ZXJEYXRlKTtcclxuXHJcblx0XHRcdFx0aWYgKG5leHRPY2N1cnJlbmNlKSB7XHJcblx0XHRcdFx0XHQvLyBTZXQgdGltZSB0byBzdGFydCBvZiBkYXlcclxuXHRcdFx0XHRcdG5leHRPY2N1cnJlbmNlLnNldEhvdXJzKDAsIDAsIDAsIDApO1xyXG5cdFx0XHRcdFx0Ly8gRW5zdXJlIGl0J3MgaW4gdGhlIGZ1dHVyZVxyXG5cdFx0XHRcdFx0aWYgKG5leHRPY2N1cnJlbmNlLmdldFRpbWUoKSA+IHRvZGF5U3RhcnQuZ2V0VGltZSgpKSB7XHJcblx0XHRcdFx0XHRcdC8vIENvbnZlcnQgdG8gVVRDIG5vb24gdGltZXN0YW1wIGZvciBjb25zaXN0ZW50IHN0b3JhZ2VcclxuXHRcdFx0XHRcdFx0Y29uc3QgeWVhciA9IG5leHRPY2N1cnJlbmNlLmdldEZ1bGxZZWFyKCk7XHJcblx0XHRcdFx0XHRcdGNvbnN0IG1vbnRoID0gbmV4dE9jY3VycmVuY2UuZ2V0TW9udGgoKTtcclxuXHRcdFx0XHRcdFx0Y29uc3QgZGF5ID0gbmV4dE9jY3VycmVuY2UuZ2V0RGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gRGF0ZS5VVEMoeWVhciwgbW9udGgsIGRheSwgMTIsIDAsIDApO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0Ly8gSWYgc29tZWhvdyBzdGlsbCBub3QgaW4gZnV0dXJlLCB0cnkgZ2V0dGluZyB0aGUgbmV4dCBvY2N1cnJlbmNlXHJcblx0XHRcdFx0XHRjb25zdCBmdXR1cmVPY2N1cnJlbmNlID0gcnVsZS5hZnRlcihcclxuXHRcdFx0XHRcdFx0bmV3IERhdGUodG9kYXlTdGFydC5nZXRUaW1lKCkgKyA4NjQwMDAwMCksXHJcblx0XHRcdFx0XHQpOyAvLyBUb21vcnJvd1xyXG5cdFx0XHRcdFx0aWYgKGZ1dHVyZU9jY3VycmVuY2UpIHtcclxuXHRcdFx0XHRcdFx0ZnV0dXJlT2NjdXJyZW5jZS5zZXRIb3VycygwLCAwLCAwLCAwKTtcclxuXHRcdFx0XHRcdFx0Ly8gQ29udmVydCB0byBVVEMgbm9vbiB0aW1lc3RhbXBcclxuXHRcdFx0XHRcdFx0Y29uc3QgeWVhciA9IGZ1dHVyZU9jY3VycmVuY2UuZ2V0RnVsbFllYXIoKTtcclxuXHRcdFx0XHRcdFx0Y29uc3QgbW9udGggPSBmdXR1cmVPY2N1cnJlbmNlLmdldE1vbnRoKCk7XHJcblx0XHRcdFx0XHRcdGNvbnN0IGRheSA9IGZ1dHVyZU9jY3VycmVuY2UuZ2V0RGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gRGF0ZS5VVEMoeWVhciwgbW9udGgsIGRheSwgMTIsIDAsIDApO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdC8vIHJydWxlc3RyIGZhaWxlZCwgZmFsbCBiYWNrIHRvIHNpbXBsZSBwYXJzaW5nXHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRgRmFpbGVkIHRvIHBhcnNlIHJlY3VycmVuY2UgJyR7dGFzay5tZXRhZGF0YS5yZWN1cnJlbmNlfScgd2l0aCBycnVsZS4gRmFsbGluZyBiYWNrIHRvIHNpbXBsZSBsb2dpYy5gLFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIC0tLSBGYWxsYmFjayBTaW1wbGUgUGFyc2luZyBMb2dpYyAtLS1cclxuXHRcdFx0Y29uc3QgcmVjdXJyZW5jZSA9IHRhc2subWV0YWRhdGEucmVjdXJyZW5jZS50cmltKCkudG9Mb3dlckNhc2UoKTtcclxuXHRcdFx0Y29uc3Qgbm93ID0gbmV3IERhdGUoKTtcclxuXHRcdFx0Y29uc3QgdG9kYXlTdGFydCA9IG5ldyBEYXRlKG5vdyk7XHJcblx0XHRcdHRvZGF5U3RhcnQuc2V0SG91cnMoMCwgMCwgMCwgMCk7XHJcblxyXG5cdFx0XHQvLyBQYXJzZSBcImV2ZXJ5IFggZGF5cy93ZWVrcy9tb250aHMveWVhcnNcIiBmb3JtYXRcclxuXHRcdFx0aWYgKHJlY3VycmVuY2Uuc3RhcnRzV2l0aChcImV2ZXJ5XCIpKSB7XHJcblx0XHRcdFx0Y29uc3QgcGFydHMgPSByZWN1cnJlbmNlLnNwbGl0KFwiIFwiKTtcclxuXHRcdFx0XHRpZiAocGFydHMubGVuZ3RoID49IDIpIHtcclxuXHRcdFx0XHRcdGxldCBpbnRlcnZhbCA9IDE7XHJcblx0XHRcdFx0XHRsZXQgdW5pdCA9IHBhcnRzWzFdO1xyXG5cdFx0XHRcdFx0aWYgKHBhcnRzLmxlbmd0aCA+PSAzICYmICFpc05hTihwYXJzZUludChwYXJ0c1sxXSkpKSB7XHJcblx0XHRcdFx0XHRcdGludGVydmFsID0gcGFyc2VJbnQocGFydHNbMV0pO1xyXG5cdFx0XHRcdFx0XHR1bml0ID0gcGFydHNbMl07XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRpZiAodW5pdC5lbmRzV2l0aChcInNcIikpIHtcclxuXHRcdFx0XHRcdFx0dW5pdCA9IHVuaXQuc3Vic3RyaW5nKDAsIHVuaXQubGVuZ3RoIC0gMSk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gU3RhcnQgZnJvbSBiYXNlIGRhdGVcclxuXHRcdFx0XHRcdGxldCBuZXh0RGF0ZSA9IG5ldyBEYXRlKGJhc2VEYXRlKTtcclxuXHJcblx0XHRcdFx0XHQvLyBLZWVwIGFkdmFuY2luZyB0aGUgZGF0ZSB1bnRpbCBpdCdzIGluIHRoZSBmdXR1cmVcclxuXHRcdFx0XHRcdHdoaWxlIChuZXh0RGF0ZS5nZXRUaW1lKCkgPD0gdG9kYXlTdGFydC5nZXRUaW1lKCkpIHtcclxuXHRcdFx0XHRcdFx0c3dpdGNoICh1bml0KSB7XHJcblx0XHRcdFx0XHRcdFx0Y2FzZSBcImRheVwiOlxyXG5cdFx0XHRcdFx0XHRcdFx0bmV4dERhdGUuc2V0RGF0ZShuZXh0RGF0ZS5nZXREYXRlKCkgKyBpbnRlcnZhbCk7XHJcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFx0XHRjYXNlIFwid2Vla1wiOlxyXG5cdFx0XHRcdFx0XHRcdFx0bmV4dERhdGUuc2V0RGF0ZShcclxuXHRcdFx0XHRcdFx0XHRcdFx0bmV4dERhdGUuZ2V0RGF0ZSgpICsgaW50ZXJ2YWwgKiA3LFxyXG5cdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHRcdGNhc2UgXCJtb250aFwiOlxyXG5cdFx0XHRcdFx0XHRcdFx0Ly8gU2F2ZSB0aGUgb3JpZ2luYWwgZGF5IG9mIG1vbnRoIGZvciBwcm9wZXIgbW9udGggcm9sbGluZ1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3Qgb3JpZ2luYWxEYXkgPSBiYXNlRGF0ZS5nZXREYXRlKCk7XHJcblx0XHRcdFx0XHRcdFx0XHRuZXh0RGF0ZS5zZXRNb250aChcclxuXHRcdFx0XHRcdFx0XHRcdFx0bmV4dERhdGUuZ2V0TW9udGgoKSArIGludGVydmFsLFxyXG5cdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdC8vIElmIGRheSBoYXMgY2hhbmdlZCAoZS5nLiwgSmFuIDMxIC0+IEZlYiAyOCksIGFkanVzdCBiYWNrXHJcblx0XHRcdFx0XHRcdFx0XHRpZiAobmV4dERhdGUuZ2V0RGF0ZSgpICE9PSBvcmlnaW5hbERheSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRuZXh0RGF0ZS5zZXREYXRlKDApOyAvLyBHbyB0byBsYXN0IGRheSBvZiBwcmV2aW91cyBtb250aFxyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcdFx0Y2FzZSBcInllYXJcIjpcclxuXHRcdFx0XHRcdFx0XHRcdG5leHREYXRlLnNldEZ1bGxZZWFyKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRuZXh0RGF0ZS5nZXRGdWxsWWVhcigpICsgaW50ZXJ2YWwsXHJcblx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRcdFx0XHRcdC8vIERlZmF1bHQgdG8gZGF5cyBpZiB1bml0IGlzIG5vdCByZWNvZ25pemVkXHJcblx0XHRcdFx0XHRcdFx0XHRuZXh0RGF0ZS5zZXREYXRlKG5leHREYXRlLmdldERhdGUoKSArIGludGVydmFsKTtcclxuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gTm9ybWFsaXplIHRvIG1pZG5pZ2h0XHJcblx0XHRcdFx0XHRuZXh0RGF0ZS5zZXRIb3VycygwLCAwLCAwLCAwKTtcclxuXHJcblx0XHRcdFx0XHQvLyBDb252ZXJ0IHRvIFVUQyBub29uIHRpbWVzdGFtcCBmb3IgY29uc2lzdGVudCBzdG9yYWdlXHJcblx0XHRcdFx0XHRjb25zdCB5ZWFyID0gbmV4dERhdGUuZ2V0RnVsbFllYXIoKTtcclxuXHRcdFx0XHRcdGNvbnN0IG1vbnRoID0gbmV4dERhdGUuZ2V0TW9udGgoKTtcclxuXHRcdFx0XHRcdGNvbnN0IGRheSA9IG5leHREYXRlLmdldERhdGUoKTtcclxuXHRcdFx0XHRcdHJldHVybiBEYXRlLlVUQyh5ZWFyLCBtb250aCwgZGF5LCAxMiwgMCwgMCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBIYW5kbGUgc2ltcGxlIHBhdHRlcm4gbGlrZSBcIjFkXCIsIFwiMXdcIiwgXCIxbVwiLCBcIjF5XCJcclxuXHRcdFx0Y29uc3Qgc2ltcGxlTWF0Y2ggPSByZWN1cnJlbmNlLm1hdGNoKC9eKFxcZCspKFtkd215XSkkLyk7XHJcblx0XHRcdGlmIChzaW1wbGVNYXRjaCkge1xyXG5cdFx0XHRcdGNvbnN0IGludGVydmFsID0gcGFyc2VJbnQoc2ltcGxlTWF0Y2hbMV0pO1xyXG5cdFx0XHRcdGNvbnN0IHVuaXQgPSBzaW1wbGVNYXRjaFsyXTtcclxuXHJcblx0XHRcdFx0bGV0IG5leHREYXRlID0gbmV3IERhdGUoYmFzZURhdGUpO1xyXG5cclxuXHRcdFx0XHQvLyBLZWVwIGFkdmFuY2luZyB0aGUgZGF0ZSB1bnRpbCBpdCdzIGluIHRoZSBmdXR1cmVcclxuXHRcdFx0XHR3aGlsZSAobmV4dERhdGUuZ2V0VGltZSgpIDw9IHRvZGF5U3RhcnQuZ2V0VGltZSgpKSB7XHJcblx0XHRcdFx0XHRzd2l0Y2ggKHVuaXQpIHtcclxuXHRcdFx0XHRcdFx0Y2FzZSBcImRcIjpcclxuXHRcdFx0XHRcdFx0XHRuZXh0RGF0ZS5zZXREYXRlKG5leHREYXRlLmdldERhdGUoKSArIGludGVydmFsKTtcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFx0Y2FzZSBcIndcIjpcclxuXHRcdFx0XHRcdFx0XHRuZXh0RGF0ZS5zZXREYXRlKG5leHREYXRlLmdldERhdGUoKSArIGludGVydmFsICogNyk7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcdGNhc2UgXCJtXCI6XHJcblx0XHRcdFx0XHRcdFx0Y29uc3Qgb3JpZ2luYWxEYXkgPSBiYXNlRGF0ZS5nZXREYXRlKCk7XHJcblx0XHRcdFx0XHRcdFx0bmV4dERhdGUuc2V0TW9udGgobmV4dERhdGUuZ2V0TW9udGgoKSArIGludGVydmFsKTtcclxuXHRcdFx0XHRcdFx0XHQvLyBIYW5kbGUgbW9udGgtZW5kIGVkZ2UgY2FzZXNcclxuXHRcdFx0XHRcdFx0XHRpZiAobmV4dERhdGUuZ2V0RGF0ZSgpICE9PSBvcmlnaW5hbERheSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0bmV4dERhdGUuc2V0RGF0ZSgwKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcdGNhc2UgXCJ5XCI6XHJcblx0XHRcdFx0XHRcdFx0bmV4dERhdGUuc2V0RnVsbFllYXIoXHJcblx0XHRcdFx0XHRcdFx0XHRuZXh0RGF0ZS5nZXRGdWxsWWVhcigpICsgaW50ZXJ2YWwsXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIE5vcm1hbGl6ZSB0byBtaWRuaWdodFxyXG5cdFx0XHRcdG5leHREYXRlLnNldEhvdXJzKDAsIDAsIDAsIDApO1xyXG5cclxuXHRcdFx0XHQvLyBDb252ZXJ0IHRvIFVUQyBub29uIHRpbWVzdGFtcFxyXG5cdFx0XHRcdGNvbnN0IHllYXIgPSBuZXh0RGF0ZS5nZXRGdWxsWWVhcigpO1xyXG5cdFx0XHRcdGNvbnN0IG1vbnRoID0gbmV4dERhdGUuZ2V0TW9udGgoKTtcclxuXHRcdFx0XHRjb25zdCBkYXkgPSBuZXh0RGF0ZS5nZXREYXRlKCk7XHJcblx0XHRcdFx0cmV0dXJuIERhdGUuVVRDKHllYXIsIG1vbnRoLCBkYXksIDEyLCAwLCAwKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSWYgd2UgY2FuJ3QgcGFyc2UgaXQsIHJldHVybiB0b21vcnJvdyBhcyBkZWZhdWx0XHJcblx0XHRcdGNvbnN0IHRvbW9ycm93ID0gbmV3IERhdGUodG9kYXlTdGFydCk7XHJcblx0XHRcdHRvbW9ycm93LnNldERhdGUodG9tb3Jyb3cuZ2V0RGF0ZSgpICsgMSk7XHJcblx0XHRcdGNvbnN0IHllYXIgPSB0b21vcnJvdy5nZXRGdWxsWWVhcigpO1xyXG5cdFx0XHRjb25zdCBtb250aCA9IHRvbW9ycm93LmdldE1vbnRoKCk7XHJcblx0XHRcdGNvbnN0IGRheSA9IHRvbW9ycm93LmdldERhdGUoKTtcclxuXHRcdFx0cmV0dXJuIERhdGUuVVRDKHllYXIsIG1vbnRoLCBkYXksIDEyLCAwLCAwKTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFcnJvciBjYWxjdWxhdGluZyBuZXh0IGR1ZSBkYXRlOlwiLCBlcnJvcik7XHJcblx0XHRcdC8vIFJldHVybiB0b21vcnJvdyBhcyBmYWxsYmFja1xyXG5cdFx0XHRjb25zdCB0b21vcnJvdyA9IG5ldyBEYXRlKCk7XHJcblx0XHRcdHRvbW9ycm93LnNldERhdGUodG9tb3Jyb3cuZ2V0RGF0ZSgpICsgMSk7XHJcblx0XHRcdHRvbW9ycm93LnNldEhvdXJzKDAsIDAsIDAsIDApO1xyXG5cdFx0XHRjb25zdCB5ZWFyID0gdG9tb3Jyb3cuZ2V0RnVsbFllYXIoKTtcclxuXHRcdFx0Y29uc3QgbW9udGggPSB0b21vcnJvdy5nZXRNb250aCgpO1xyXG5cdFx0XHRjb25zdCBkYXkgPSB0b21vcnJvdy5nZXREYXRlKCk7XHJcblx0XHRcdHJldHVybiBEYXRlLlVUQyh5ZWFyLCBtb250aCwgZGF5LCAxMiwgMCwgMCk7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcbiJdfQ==