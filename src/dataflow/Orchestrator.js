import { __awaiter } from "tslib";
import { TFile, debounce } from "obsidian";
import { QueryAPI } from "./api/QueryAPI";
import { Resolver as ProjectResolver } from "./project/Resolver";
import { Augmentor } from "./augment/Augmentor";
import { Events, emit, Seq, on } from "./events/Events";
import { WorkerOrchestrator } from "./workers/WorkerOrchestrator";
import { ObsidianSource } from "./sources/ObsidianSource";
import { IcsSource } from "./sources/IcsSource";
import { FileSource } from "./sources/FileSource";
import { TaskWorkerManager } from "./workers/TaskWorkerManager";
import { ProjectDataWorkerManager } from "./workers/ProjectDataWorkerManager";
import { FileFilterManager } from "../managers/file-filter-manager";
// Parser imports
import { CanvasParser } from "./core/CanvasParser";
import { getConfig } from "../common/task-parser-config";
import { parseFileMeta } from "./parsers/FileMetaEntry";
import { ConfigurableTaskParser } from "./core/ConfigurableTaskParser";
import { TimeParsingService } from "../services/time-parsing-service";
/**
 * DataflowOrchestrator - Coordinates all dataflow components
 * This is the main entry point for the new dataflow architecture
 */
export class DataflowOrchestrator {
    constructor(app, vault, metadataCache, plugin, // Plugin instance for parser access
    projectOptions) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
        this.app = app;
        this.vault = vault;
        this.metadataCache = metadataCache;
        this.plugin = plugin;
        this.fileSource = null;
        // Event references for cleanup
        this.eventRefs = [];
        // Processing queue for throttling
        this.processingQueue = new Map();
        this.DEBOUNCE_DELAY = 300; // ms
        // Lightweight bookkeeping for filter-based pruning/restoration
        this.suppressedInline = new Set();
        this.suppressedFileTasks = new Set();
        this.RESTORE_BATCH_SIZE = 50;
        this.RESTORE_BATCH_INTERVAL_MS = 100;
        this.lastFileFilterEnabled = false;
        // Track last processed sequence to avoid infinite loops
        this.lastProcessedSeq = 0;
        // Initialize components
        this.queryAPI = new QueryAPI(app, vault, metadataCache);
        this.repository = this.queryAPI.getRepository();
        this.projectResolver = new ProjectResolver(app, vault, metadataCache, projectOptions);
        this.augmentor = new Augmentor({
            app,
            vault,
            metadataCache,
        });
        // Initial sync of settings to Augmentor to ensure correct inheritance behavior on startup
        try {
            const initFmi = (_b = (_a = this.plugin) === null || _a === void 0 ? void 0 : _a.settings) === null || _b === void 0 ? void 0 : _b.fileMetadataInheritance;
            const initProjectConfig = (_d = (_c = this.plugin) === null || _c === void 0 ? void 0 : _c.settings) === null || _d === void 0 ? void 0 : _d.projectConfig;
            this.augmentor.updateSettings({
                fileMetadataInheritance: initFmi,
                projectConfig: initProjectConfig,
            });
        }
        catch (e) {
            console.warn("[DataflowOrchestrator][init] Failed to sync settings to Augmentor", e);
        }
        this.storage = this.repository.getStorage();
        // Initialize FileFilterManager from settings early so sources get it
        try {
            const ffSettingsEarly = (_e = this.plugin.settings) === null || _e === void 0 ? void 0 : _e.fileFilter;
            console.log("[DataflowOrchestrator] Early FileFilter settings:", JSON.stringify(ffSettingsEarly, null, 2));
            if (ffSettingsEarly) {
                this.fileFilterManager = new FileFilterManager(ffSettingsEarly);
                console.log("[DataflowOrchestrator] Created FileFilterManager early with stats:", this.fileFilterManager.getStats());
                // Provide to repository's indexer for inline filtering immediately
                (_g = (_f = this.repository).setFileFilterManager) === null || _g === void 0 ? void 0 : _g.call(_f, this.fileFilterManager);
                console.log("[DataflowOrchestrator] Provided FileFilterManager to repository indexer");
            }
            else {
                console.log("[DataflowOrchestrator] No FileFilter settings found, FileFilterManager not created");
            }
        }
        catch (e) {
            console.warn("[DataflowOrchestrator] Failed early FileFilterManager init", e);
        }
        // Initialize debounced restore handler (default ON) - trailing only
        this.restoreByFilterDebounced = debounce(() => {
            void this.restoreByFilter();
        }, 500, false);
        // Initialize worker orchestrator with settings
        const taskWorkerManager = new TaskWorkerManager(vault, metadataCache, {
            settings: {
                preferMetadataFormat: this.plugin.settings.preferMetadataFormat || "tasks",
                useDailyNotePathAsDate: this.plugin.settings.useDailyNotePathAsDate || false,
                dailyNoteFormat: this.plugin.settings.dailyNoteFormat || "yyyy-MM-dd",
                useAsDateType: this.plugin.settings.useAsDateType || "due",
                dailyNotePath: this.plugin.settings.dailyNotePath || "",
                ignoreHeading: this.plugin.settings.ignoreHeading || "",
                focusHeading: this.plugin.settings.focusHeading || "",
                fileParsingConfig: undefined,
                fileMetadataInheritance: this.plugin.settings.fileMetadataInheritance,
                enableCustomDateFormats: this.plugin.settings.enableCustomDateFormats,
                customDateFormats: this.plugin.settings.customDateFormats,
                // Include tag prefixes for custom dataview field support
                projectTagPrefix: this.plugin.settings.projectTagPrefix,
                contextTagPrefix: this.plugin.settings.contextTagPrefix,
                areaTagPrefix: this.plugin.settings.areaTagPrefix,
            },
        });
        // Ensure worker parser receives enhanced project config at init
        taskWorkerManager.updateSettings({
            projectConfig: this.plugin.settings.projectConfig,
        });
        const projectWorkerManager = new ProjectDataWorkerManager({
            vault,
            metadataCache,
            projectConfigManager: this.projectResolver.getConfigManager(),
        });
        // Get worker processing setting from fileSource or fileParsingConfig
        const enableWorkerProcessing = (_p = (_l = (_k = (_j = (_h = this.plugin.settings) === null || _h === void 0 ? void 0 : _h.fileSource) === null || _j === void 0 ? void 0 : _j.performance) === null || _k === void 0 ? void 0 : _k.enableWorkerProcessing) !== null && _l !== void 0 ? _l : (_o = (_m = this.plugin.settings) === null || _m === void 0 ? void 0 : _m.fileParsingConfig) === null || _o === void 0 ? void 0 : _o.enableWorkerProcessing) !== null && _p !== void 0 ? _p : true;
        this.workerOrchestrator = new WorkerOrchestrator(taskWorkerManager, projectWorkerManager, { enableWorkerProcessing });
        // Initialize Obsidian event source
        this.obsidianSource = new ObsidianSource(app, vault, metadataCache);
        // Initialize ICS event source
        this.icsSource = new IcsSource(app, () => this.plugin.getIcsManager());
        // Initialize TimeParsingService with plugin settings
        this.timeParsingService = new TimeParsingService(((_q = this.plugin.settings) === null || _q === void 0 ? void 0 : _q.timeParsing) ||
            {
                enabled: true,
                supportedLanguages: ["en", "zh"],
                dateKeywords: {
                    start: ["start", "begin", "from"],
                    due: ["due", "deadline", "by", "until"],
                    scheduled: ["scheduled", "on", "at"],
                },
                removeOriginalText: true,
                perLineProcessing: true,
                realTimeReplacement: true,
                timePatterns: {
                    singleTime: [],
                    timeRange: [],
                    rangeSeparators: ["-", "~", "～"],
                },
                timeDefaults: {
                    preferredFormat: "24h",
                    defaultPeriod: "AM",
                    midnightCrossing: "next-day",
                },
            });
        // Initialize FileSource (conditionally based on settings)
        if ((_s = (_r = this.plugin.settings) === null || _r === void 0 ? void 0 : _r.fileSource) === null || _s === void 0 ? void 0 : _s.enabled) {
            this.fileSource = new FileSource(app, this.plugin.settings.fileSource, this.fileFilterManager);
            console.log("[DataflowOrchestrator] FileSource constructed with filterManager=", !!this.fileFilterManager);
            // Keep FileSource status mapping in sync with Task Status settings
            try {
                this.fileSource.syncStatusMappingFromSettings(this.plugin.settings.taskStatuses);
                console.log("[DataflowOrchestrator] Synced FileSource status mapping from settings");
            }
            catch (e) {
                console.warn("[DataflowOrchestrator] Failed to sync FileSource status mapping on init", e);
            }
        }
    }
    /**
     * Initialize the orchestrator (load persisted data)
     */
    initialize() {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            console.log("[DataflowOrchestrator] Starting initialization...");
            try {
                // Initialize QueryAPI and Repository
                console.log("[DataflowOrchestrator] Initializing QueryAPI and Repository...");
                // Initialize or sync FileFilterManager from settings (do not recreate if already exists)
                const ffSettings = (_a = this.plugin.settings) === null || _a === void 0 ? void 0 : _a.fileFilter;
                console.log("[DataflowOrchestrator] Initialize(): FileFilter settings:", JSON.stringify(ffSettings, null, 2));
                if (ffSettings) {
                    if (!this.fileFilterManager) {
                        this.fileFilterManager = new FileFilterManager(ffSettings);
                        console.log("[DataflowOrchestrator] Initialize(): Created FileFilterManager with stats:", this.fileFilterManager.getStats());
                    }
                    else {
                        this.fileFilterManager.updateConfig(ffSettings);
                        console.log("[DataflowOrchestrator] Initialize(): Updated FileFilterManager config; stats:", this.fileFilterManager.getStats());
                    }
                    // Provide to repository's indexer for inline filtering
                    (_c = (_b = this.repository).setFileFilterManager) === null || _c === void 0 ? void 0 : _c.call(_b, this.fileFilterManager);
                    console.log("[DataflowOrchestrator] Initialize(): Provided FileFilterManager to repository indexer");
                }
                else {
                    console.log("[DataflowOrchestrator] Initialize(): No FileFilter settings");
                }
                yield this.queryAPI.initialize();
                // Load persisted suppressed file sets for cross-restart restore
                try {
                    const supInline = yield this.storage.loadMeta("filter:suppressedInline");
                    if (Array.isArray(supInline))
                        this.suppressedInline = new Set(supInline);
                    const supFiles = yield this.storage.loadMeta("filter:suppressedFileTasks");
                    if (Array.isArray(supFiles))
                        this.suppressedFileTasks = new Set(supFiles);
                    console.log("[DataflowOrchestrator] Loaded suppressed sets", {
                        inline: this.suppressedInline.size,
                        file: this.suppressedFileTasks.size,
                    });
                }
                catch (e) {
                    console.warn("[DataflowOrchestrator] Failed loading suppressed sets", e);
                }
                // Ensure cache is populated for synchronous access
                yield this.queryAPI.ensureCache();
                // Check if we have cached data
                const taskCount = (yield this.queryAPI.getAllTasks()).length;
                console.log(`[DataflowOrchestrator] Found ${taskCount} cached tasks`);
                if (taskCount === 0) {
                    console.log("[DataflowOrchestrator] No cached tasks found, performing initial scan...");
                    // Get all markdown and canvas files
                    const mdFiles = this.vault.getMarkdownFiles();
                    const canvasFiles = this.vault
                        .getFiles()
                        .filter((f) => f.extension === "canvas");
                    const allFiles = [...mdFiles, ...canvasFiles];
                    console.log(`[DataflowOrchestrator] Found ${allFiles.length} files to process`);
                    // Process in batches for performance
                    const BATCH_SIZE = 50;
                    for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
                        const batch = allFiles.slice(i, i + BATCH_SIZE);
                        yield this.processBatch(batch);
                    }
                    // Persist the initial index
                    console.log("[DataflowOrchestrator] Persisting initial index...");
                    yield this.repository.persist();
                    const finalTaskCount = (yield this.queryAPI.getAllTasks())
                        .length;
                    console.log(`[DataflowOrchestrator] Initial scan complete, indexed ${finalTaskCount} tasks`);
                }
                else {
                    console.log("[DataflowOrchestrator] Using cached tasks, skipping initial scan");
                }
                // Initialize ObsidianSource to start listening for events
                console.log("[DataflowOrchestrator] Initializing ObsidianSource...");
                this.obsidianSource.onload();
                // Initialize IcsSource to start listening for calendar events
                console.log("[DataflowOrchestrator] Initializing IcsSource...");
                this.icsSource.initialize();
                // Initialize FileSource to start file recognition
                if (this.fileSource) {
                    console.log("[DataflowOrchestrator] Initializing FileSource...");
                    this.fileSource.initialize();
                }
                // Subscribe to file update events from ObsidianSource and ICS events
                console.log("[DataflowOrchestrator] Subscribing to events...");
                this.subscribeToEvents();
                // Emit initial ready event
                emit(this.app, Events.CACHE_READY, {
                    initial: true,
                    timestamp: Date.now(),
                    seq: Seq.next(),
                });
                const elapsed = Date.now() - startTime;
                console.log(`[DataflowOrchestrator] Initialization complete (took ${elapsed}ms)`);
            }
            catch (error) {
                console.error("[DataflowOrchestrator] Initialization failed:", error);
                throw error;
            }
        });
    }
    /**
     * Subscribe to events from ObsidianSource, IcsSource and WriteAPI
     */
    subscribeToEvents() {
        // Listen for ICS events updates
        this.eventRefs.push(on(this.app, Events.ICS_EVENTS_UPDATED, (payload) => __awaiter(this, void 0, void 0, function* () {
            const { events, seq } = payload;
            console.log(`[DataflowOrchestrator] ICS_EVENTS_UPDATED: ${(events === null || events === void 0 ? void 0 : events.length) || 0} events`);
            // Update repository with ICS events
            if (events) {
                yield this.repository.updateIcsEvents(events, seq);
            }
        })));
        // Listen for file updates from ObsidianSource
        this.eventRefs.push(on(this.app, Events.FILE_UPDATED, (payload) => __awaiter(this, void 0, void 0, function* () {
            const { path, reason } = payload;
            console.log(`[DataflowOrchestrator] FILE_UPDATED event: ${path} (${reason})`);
            if (reason === "delete") {
                // Remove file from index
                yield this.repository.removeFile(path);
            }
            else {
                // Process file update (create, modify, rename, frontmatter)
                const file = this.vault.getAbstractFileByPath(path);
                if (file) {
                    yield this.processFile(file);
                }
            }
        })));
        // Listen for batch updates from Repository only
        // ObsidianSource uses FILE_UPDATED events instead
        this.eventRefs.push(on(this.app, Events.TASK_CACHE_UPDATED, (payload) => __awaiter(this, void 0, void 0, function* () {
            const { changedFiles, sourceSeq } = payload;
            // Skip if this is our own event (avoid infinite loop)
            // Check sourceSeq to identify origin from our own processing
            if (sourceSeq && sourceSeq === this.lastProcessedSeq) {
                return;
            }
            // Skip if no sourceSeq (likely from ObsidianSource - deprecated path)
            if (!sourceSeq) {
                console.log(`[DataflowOrchestrator] Ignoring TASK_CACHE_UPDATED without sourceSeq`);
                return;
            }
            if (changedFiles && Array.isArray(changedFiles)) {
                console.log(`[DataflowOrchestrator] Batch update for ${changedFiles.length} files`);
                // Process each file
                for (const filePath of changedFiles) {
                    const file = this.vault.getAbstractFileByPath(filePath);
                    if (file) {
                        yield this.processFile(file);
                    }
                }
            }
        })));
        // Listen for WriteAPI completion events to trigger re-processing
        this.eventRefs.push(on(this.app, Events.WRITE_OPERATION_COMPLETE, (payload) => __awaiter(this, void 0, void 0, function* () {
            const { path, taskId } = payload;
            console.log(`[DataflowOrchestrator] WRITE_OPERATION_COMPLETE: ${path}, taskId: ${taskId}`);
            // If we have a taskId, it means a specific task was updated
            // We'll handle this through TASK_UPDATED event instead
            if (!taskId) {
                // No specific task, process the entire file
                const file = this.vault.getAbstractFileByPath(path);
                if (file) {
                    // Process immediately without debounce for WriteAPI operations
                    // Pass true to force cache invalidation
                    yield this.processFileImmediate(file, true);
                }
            }
        })));
        // Listen for direct task updates (from inline editing)
        this.eventRefs.push(on(this.app, Events.TASK_UPDATED, (payload) => __awaiter(this, void 0, void 0, function* () {
            const { task } = payload;
            if (task) {
                console.log(`[DataflowOrchestrator] TASK_UPDATED: ${task.id} in ${task.filePath}`);
                // Update the single task directly in the repository
                yield this.repository.updateSingleTask(task);
            }
        })));
        // Listen for task deletion events
        this.eventRefs.push(on(this.app, Events.TASK_DELETED, (payload) => __awaiter(this, void 0, void 0, function* () {
            const { taskId, filePath, deletedTaskIds, mode } = payload;
            console.log(`[DataflowOrchestrator] TASK_DELETED: ${taskId} in ${filePath}, mode: ${mode}, deleted: ${(deletedTaskIds === null || deletedTaskIds === void 0 ? void 0 : deletedTaskIds.length) || 1} tasks`);
            // Remove deleted tasks from repository
            if (deletedTaskIds && deletedTaskIds.length > 0) {
                for (const id of deletedTaskIds) {
                    yield this.repository.removeTaskById(id);
                }
            }
            // Process the file to update remaining tasks' line numbers
            const file = this.vault.getAbstractFileByPath(filePath);
            if (file) {
                yield this.processFileImmediate(file, true);
            }
        })));
        // Listen for FileSource file task updates
        if (this.fileSource) {
            this.eventRefs.push(on(this.app, Events.FILE_TASK_UPDATED, (payload) => __awaiter(this, void 0, void 0, function* () {
                const { task } = payload;
                console.log(`[DataflowOrchestrator] FILE_TASK_UPDATED: ${task === null || task === void 0 ? void 0 : task.filePath}`);
                if (task) {
                    yield this.repository.updateFileTask(task);
                }
            })));
            this.eventRefs.push(on(this.app, Events.FILE_TASK_REMOVED, (payload) => __awaiter(this, void 0, void 0, function* () {
                const { filePath } = payload;
                console.log(`[DataflowOrchestrator] FILE_TASK_REMOVED: ${filePath}`);
                if (filePath) {
                    yield this.repository.removeFileTask(filePath);
                }
            })));
        }
    }
    /**
     * Process a file change (parse, augment, index)
     */
    processFile(file) {
        return __awaiter(this, void 0, void 0, function* () {
            const filePath = file.path;
            // Debounce rapid changes
            if (this.processingQueue.has(filePath)) {
                clearTimeout(this.processingQueue.get(filePath));
            }
            const timeoutId = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                this.processingQueue.delete(filePath);
                yield this.processFileImmediate(file, false);
            }), this.DEBOUNCE_DELAY);
            this.processingQueue.set(filePath, timeoutId);
        });
    }
    /**
     * Process a file immediately without debouncing
     * @param file The file to process
     * @param forceInvalidate Force cache invalidation (for WriteAPI operations)
     */
    processFileImmediate(file, forceInvalidate = false) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const filePath = file.path;
            try {
                // Step 1: Get file modification time
                const fileStat = yield this.vault.adapter.stat(filePath);
                const mtime = fileStat === null || fileStat === void 0 ? void 0 : fileStat.mtime;
                // Step 2: Check cache and parse if needed
                const rawCached = yield this.storage.loadRaw(filePath);
                const augmentedCached = yield this.storage.loadAugmented(filePath);
                const fileContent = yield this.vault.cachedRead(file);
                console.log("[DataflowOrchestrator] processFileImmediate start", {
                    filePath,
                    forceInvalidate,
                    mtime,
                    hasRawCached: !!rawCached,
                    hasAugmentedCached: !!augmentedCached,
                });
                let augmentedTasks;
                let needsProcessing = false;
                // Check if we can use fully cached augmented tasks
                // Force invalidation for WriteAPI operations to ensure fresh parsing
                if (!forceInvalidate &&
                    rawCached &&
                    augmentedCached &&
                    this.storage.isRawValid(filePath, rawCached, fileContent, mtime)) {
                    // Use cached augmented tasks - file hasn't changed and we have augmented data
                    console.log(`[DataflowOrchestrator] Using cached augmented tasks for ${filePath} (mtime match)`);
                    augmentedTasks = augmentedCached.data;
                    // Apply inline filter even when using cached augmented tasks
                    const includeInlineCached = this.fileFilterManager
                        ? this.fileFilterManager.shouldIncludePath(filePath, "inline")
                        : true;
                    console.log("[DataflowOrchestrator] Inline filter decision (cached augmented)", { filePath, includeInline: includeInlineCached });
                    if (!includeInlineCached) {
                        augmentedTasks = [];
                    }
                }
                else {
                    // Need to parse and/or augment
                    needsProcessing = true;
                    let rawTasks;
                    let projectData; // Type will be inferred from projectResolver.get
                    if (!forceInvalidate &&
                        rawCached &&
                        this.storage.isRawValid(filePath, rawCached, fileContent, mtime)) {
                        // Use cached raw tasks but re-augment (project data might have changed)
                        console.log(`[DataflowOrchestrator] Re-augmenting cached raw tasks for ${filePath}`);
                        const includeInlineReaugment = this.fileFilterManager
                            ? this.fileFilterManager.shouldIncludePath(filePath, "inline")
                            : true;
                        console.log("[DataflowOrchestrator] Inline filter decision (re-augment cached raw)", { filePath, includeInline: includeInlineReaugment });
                        rawTasks = includeInlineReaugment ? rawCached.data : [];
                        projectData = yield this.projectResolver.get(filePath);
                    }
                    else {
                        // Parse the file from scratch
                        if (forceInvalidate) {
                            console.log(`[DataflowOrchestrator] Parsing ${filePath} (forced invalidation from WriteAPI)`);
                        }
                        else {
                            console.log(`[DataflowOrchestrator] Parsing ${filePath} (cache miss or mtime mismatch)`);
                        }
                        // Get project data first for parsing
                        projectData = yield this.projectResolver.get(filePath);
                        // Update worker settings for single-file processing (mirror batch behavior)
                        try {
                            const taskWorkerManager = this.workerOrchestrator["taskWorkerManager"];
                            if (taskWorkerManager) {
                                taskWorkerManager.updateSettings({
                                    preferMetadataFormat: this.plugin.settings.preferMetadataFormat ||
                                        "tasks",
                                    customDateFormats: this.plugin.settings.customDateFormats,
                                    fileMetadataInheritance: this.plugin.settings
                                        .fileMetadataInheritance,
                                    ignoreHeading: this.plugin.settings.ignoreHeading,
                                    focusHeading: this.plugin.settings.focusHeading,
                                    // Include tag prefixes for custom dataview field support
                                    projectTagPrefix: this.plugin.settings.projectTagPrefix,
                                    contextTagPrefix: this.plugin.settings.contextTagPrefix,
                                    areaTagPrefix: this.plugin.settings.areaTagPrefix,
                                });
                            }
                        }
                        catch (e) {
                            console.warn("[DataflowOrchestrator] Failed to update worker settings for single-file parse:", e);
                        }
                        // Apply inline filter for parse path
                        const includeInlineParse = this.fileFilterManager
                            ? this.fileFilterManager.shouldIncludePath(filePath, "inline")
                            : true;
                        console.log("[DataflowOrchestrator] Inline filter decision (parse path)", { filePath, includeInline: includeInlineParse });
                        if (includeInlineParse) {
                            // Parse the file using workers (single-file path)
                            rawTasks = yield this.workerOrchestrator.parseFileTasks(file, "high");
                        }
                        else {
                            rawTasks = [];
                        }
                        // Store raw tasks with file content and mtime
                        yield this.storage.storeRaw(filePath, rawTasks, fileContent, mtime);
                    }
                    // Store project data
                    yield this.storage.storeProject(filePath, {
                        tgProject: projectData.tgProject,
                        enhancedMetadata: projectData.enhancedMetadata,
                    });
                    // Augment tasks with project and file metadata
                    const fileMetadata = this.metadataCache.getFileCache(file);
                    const augmentContext = {
                        filePath,
                        fileMeta: (fileMetadata === null || fileMetadata === void 0 ? void 0 : fileMetadata.frontmatter) || {},
                        projectName: (_a = projectData.tgProject) === null || _a === void 0 ? void 0 : _a.name,
                        projectMeta: Object.assign(Object.assign({}, projectData.enhancedMetadata), { tgProject: projectData.tgProject }),
                        tasks: rawTasks,
                    };
                    augmentedTasks = yield this.augmentor.merge(augmentContext);
                }
                // Step 3: Update repository (index + storage + events)
                // Generate a unique sequence for this operation
                this.lastProcessedSeq = Seq.next();
                // Pass our sequence to repository to track event origin
                yield this.repository.updateFile(filePath, augmentedTasks, this.lastProcessedSeq);
            }
            catch (error) {
                console.error(`Error processing file ${filePath}:`, error);
                // Emit error event
                emit(this.app, Events.FILE_UPDATED, {
                    path: filePath,
                    reason: "error",
                    error: error.message,
                    timestamp: Date.now(),
                });
            }
        });
    }
    /**
     * Update settings and propagate to components
     */
    updateSettings(settings) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z;
        // Update worker processing setting
        const enableWorkerProcessing = (_e = (_c = (_b = (_a = settings === null || settings === void 0 ? void 0 : settings.fileSource) === null || _a === void 0 ? void 0 : _a.performance) === null || _b === void 0 ? void 0 : _b.enableWorkerProcessing) !== null && _c !== void 0 ? _c : (_d = settings === null || settings === void 0 ? void 0 : settings.fileParsingConfig) === null || _d === void 0 ? void 0 : _d.enableWorkerProcessing) !== null && _e !== void 0 ? _e : true;
        if (this.workerOrchestrator) {
            this.workerOrchestrator.setWorkerProcessingEnabled(enableWorkerProcessing);
        }
        // Update ProjectResolver / ProjectConfigManager options from settings
        try {
            const pc = settings === null || settings === void 0 ? void 0 : settings.projectConfig;
            if (pc) {
                this.updateProjectOptions({
                    configFileName: ((_f = pc === null || pc === void 0 ? void 0 : pc.configFile) === null || _f === void 0 ? void 0 : _f.fileName) || "project.md",
                    searchRecursively: (_h = (_g = pc === null || pc === void 0 ? void 0 : pc.configFile) === null || _g === void 0 ? void 0 : _g.searchRecursively) !== null && _h !== void 0 ? _h : true,
                    metadataKey: ((_j = pc === null || pc === void 0 ? void 0 : pc.metadataConfig) === null || _j === void 0 ? void 0 : _j.metadataKey) || "project",
                    pathMappings: (pc === null || pc === void 0 ? void 0 : pc.pathMappings) || [],
                    metadataMappings: (pc === null || pc === void 0 ? void 0 : pc.metadataMappings) || [],
                    defaultProjectNaming: (pc === null || pc === void 0 ? void 0 : pc.defaultProjectNaming) || {
                        strategy: "filename",
                        stripExtension: true,
                        enabled: false,
                    },
                    enhancedProjectEnabled: (_k = pc === null || pc === void 0 ? void 0 : pc.enableEnhancedProject) !== null && _k !== void 0 ? _k : false,
                    metadataConfigEnabled: (_m = (_l = pc === null || pc === void 0 ? void 0 : pc.metadataConfig) === null || _l === void 0 ? void 0 : _l.enabled) !== null && _m !== void 0 ? _m : false,
                    configFileEnabled: (_p = (_o = pc === null || pc === void 0 ? void 0 : pc.configFile) === null || _o === void 0 ? void 0 : _o.enabled) !== null && _p !== void 0 ? _p : false,
                    detectionMethods: ((_q = pc === null || pc === void 0 ? void 0 : pc.metadataConfig) === null || _q === void 0 ? void 0 : _q.detectionMethods) || [],
                });
            }
        }
        catch (e) {
            console.warn("[DataflowOrchestrator] Failed to update project config options on settings update", e);
        }
        // Update TimeParsingService configuration
        if (settings.timeParsing && this.timeParsingService) {
            this.timeParsingService.updateConfig(settings.timeParsing);
        }
        // Sync inheritance toggle to augmentor so it can respect disabling file frontmatter inheritance
        try {
            console.debug("[DataflowOrchestrator][updateSettings] fileMetadataInheritance =", settings.fileMetadataInheritance);
            this.augmentor.updateSettings({
                fileMetadataInheritance: settings.fileMetadataInheritance,
            });
        }
        catch (e) {
            console.warn("[DataflowOrchestrator] Failed to sync settings to Augmentor", e);
        }
        // Update FileSource if needed
        if (((_r = settings === null || settings === void 0 ? void 0 : settings.fileSource) === null || _r === void 0 ? void 0 : _r.enabled) && !this.fileSource) {
            // Initialize FileSource if enabled but not yet created
            this.fileSource = new FileSource(this.app, settings.fileSource, this.fileFilterManager);
            this.fileSource.initialize();
            // Sync status mapping from Task Status settings on creation
            try {
                if (settings === null || settings === void 0 ? void 0 : settings.taskStatuses) {
                    this.fileSource.syncStatusMappingFromSettings(settings.taskStatuses);
                }
            }
            catch (e) {
                console.warn("[DataflowOrchestrator] Failed to sync FileSource status mapping on settings create", e);
            }
        }
        else if (!((_s = settings === null || settings === void 0 ? void 0 : settings.fileSource) === null || _s === void 0 ? void 0 : _s.enabled) && this.fileSource) {
            // Disable FileSource if it exists but is disabled
            this.fileSource.cleanup();
            this.fileSource = null;
        }
        else if (this.fileSource && (settings === null || settings === void 0 ? void 0 : settings.fileSource)) {
            // Update existing FileSource configuration
            this.fileSource.updateConfig(settings.fileSource);
        }
        // Always try syncing status mapping when settings update and FileSource is active
        if (this.fileSource && (settings === null || settings === void 0 ? void 0 : settings.taskStatuses)) {
            try {
                this.fileSource.syncStatusMappingFromSettings(settings.taskStatuses);
            }
            catch (e) {
                console.warn("[DataflowOrchestrator] Failed to sync FileSource status mapping on settings update", e);
            }
        }
        // Sync parser-related settings to TaskWorkerManager so new parses respect changes
        try {
            const taskWorkerManager = (_t = this.workerOrchestrator) === null || _t === void 0 ? void 0 : _t["taskWorkerManager"];
            if (taskWorkerManager) {
                taskWorkerManager.updateSettings({
                    preferMetadataFormat: settings.preferMetadataFormat,
                    customDateFormats: settings.customDateFormats,
                    fileMetadataInheritance: settings.fileMetadataInheritance,
                    projectConfig: settings.projectConfig,
                    ignoreHeading: settings.ignoreHeading,
                    focusHeading: settings.focusHeading,
                    // Include tag prefixes for custom dataview field support
                    projectTagPrefix: settings.projectTagPrefix,
                    contextTagPrefix: settings.contextTagPrefix,
                    areaTagPrefix: settings.areaTagPrefix,
                });
            }
        }
        catch (e) {
            console.warn("[DataflowOrchestrator] Failed to sync parser settings to TaskWorkerManager on settings update", e);
        }
        // Update FileFilterManager
        let fileFilterChanged = false;
        if (settings === null || settings === void 0 ? void 0 : settings.fileFilter) {
            if (!this.fileFilterManager) {
                this.fileFilterManager = new FileFilterManager(settings.fileFilter);
            }
            else {
                this.fileFilterManager.updateConfig(settings.fileFilter);
            }
            (_v = (_u = this.repository).setFileFilterManager) === null || _v === void 0 ? void 0 : _v.call(_u, this.fileFilterManager);
            fileFilterChanged = true;
        }
        if (fileFilterChanged) {
            const newEnabled = Boolean((_w = settings === null || settings === void 0 ? void 0 : settings.fileFilter) === null || _w === void 0 ? void 0 : _w.enabled);
            const rulesCount = Array.isArray((_x = settings === null || settings === void 0 ? void 0 : settings.fileFilter) === null || _x === void 0 ? void 0 : _x.rules)
                ? settings.fileFilter.rules.filter((r) => r === null || r === void 0 ? void 0 : r.enabled)
                    .length
                : 0;
            console.log("[TG Index Filter] settingsChange", {
                enabled: newEnabled,
                mode: (_y = settings === null || settings === void 0 ? void 0 : settings.fileFilter) === null || _y === void 0 ? void 0 : _y.mode,
                rulesCount,
            });
            this.lastFileFilterEnabled = newEnabled;
            // Plan B: Always prune then restore (debounced) on any fileFilter change
            console.log("[TG Index Filter] action", {
                action: "PRUNE_THEN_RESTORE",
            });
            void this.pruneByFilter();
            (_z = this.restoreByFilterDebounced) === null || _z === void 0 ? void 0 : _z.call(this);
        }
    }
    /**
     * Prune existing index and file-tasks by current file filter (lightweight)
     * Performance notes:
     * - Uses index snapshot to avoid scanning vault
     * - Batches inline clearing via repository.updateBatch
     * - Only runs when fileFilter actually changes
     */
    pruneByFilter() {
        var _a, _b, _c, _d, _e, _f;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.fileFilterManager)
                return;
            try {
                const start = Date.now();
                const files = yield this.repository.getIndexedFilePaths();
                const toClear = new Map();
                let prunedInline = 0;
                for (const p of files) {
                    const includeInline = this.fileFilterManager.shouldIncludePath(p, "inline");
                    if (!includeInline) {
                        toClear.set(p, []);
                    }
                }
                if (toClear.size > 0) {
                    // Force event emission to ensure views refresh even if storage matches
                    yield this.repository.updateBatch(toClear, undefined, {
                        persist: false,
                        forceEmit: true,
                    });
                    for (const p of toClear.keys()) {
                        this.suppressedInline.add(p);
                        prunedInline++;
                    }
                }
                const fileTaskPaths = ((_b = (_a = this.repository).getFileTaskPaths) === null || _b === void 0 ? void 0 : _b.call(_a)) || [];
                let prunedFileTasks = 0;
                for (const p of fileTaskPaths) {
                    const includeFile = this.fileFilterManager.shouldIncludePath(p, "file");
                    if (!includeFile) {
                        yield this.repository.removeFileTask(p);
                        this.suppressedFileTasks.add(p);
                        prunedFileTasks++;
                    }
                }
                // Persist suppressed sets for cross-restart restore capability (after updates)
                try {
                    yield ((_d = (_c = this.storage).saveMeta) === null || _d === void 0 ? void 0 : _d.call(_c, "filter:suppressedInline", Array.from(this.suppressedInline)));
                    yield ((_f = (_e = this.storage).saveMeta) === null || _f === void 0 ? void 0 : _f.call(_e, "filter:suppressedFileTasks", Array.from(this.suppressedFileTasks)));
                }
                catch (e) {
                    console.warn("[DataflowOrchestrator] persist suppressed meta after prune failed", e);
                }
                const elapsed = Date.now() - start;
                console.log("[DataflowOrchestrator] pruneByFilter", {
                    prunedInline,
                    prunedFileTasks,
                    elapsed,
                    inlineSuppressedSize: this.suppressedInline.size,
                    fileSuppressedSize: this.suppressedFileTasks.size,
                });
            }
            catch (e) {
                console.warn("[DataflowOrchestrator] pruneByFilter failed", e);
            }
        });
    }
    /**
     * Restore previously suppressed files when filters are loosened
     * - Inline: prefer augmented/raw cache; fallback to re-parse single file
     * - File tasks: emit FILE_UPDATED to let FileSource reevaluate
     * - Runs in small batches to avoid UI jank
     */
    restoreByFilter() {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.fileFilterManager)
                return;
            try {
                const start = Date.now();
                let inlineCandidates = Array.from(this.suppressedInline).filter((p) => this.fileFilterManager.shouldIncludePath(p, "inline"));
                const fileTaskCandidates = Array.from(this.suppressedFileTasks).filter((p) => this.fileFilterManager.shouldIncludePath(p, "file"));
                // Fallback: if we have no suppressed inline candidates (e.g., previous session), derive from cache keys
                if (inlineCandidates.length === 0) {
                    try {
                        const indexed = new Set(yield this.repository.getIndexedFilePaths());
                        const augPaths = (yield ((_b = (_a = this.storage).listAugmentedPaths) === null || _b === void 0 ? void 0 : _b.call(_a))) ||
                            [];
                        const rawPaths = (yield ((_d = (_c = this.storage).listRawPaths) === null || _d === void 0 ? void 0 : _d.call(_c))) || [];
                        const union = new Set([...augPaths, ...rawPaths]);
                        inlineCandidates = Array.from(union).filter((p) => !indexed.has(p) &&
                            this.fileFilterManager.shouldIncludePath(p, "inline"));
                        console.log("[DataflowOrchestrator] restoreByFilter fallback candidates", { extra: inlineCandidates.length });
                    }
                    catch (e) {
                        console.warn("[DataflowOrchestrator] fallback candidate discovery failed", e);
                    }
                }
                let restoredFromAugmented = 0;
                let restoredFromRaw = 0;
                let reparsed = 0;
                const processInlineBatch = (batch) => __awaiter(this, void 0, void 0, function* () {
                    var _e, _f;
                    for (const path of batch) {
                        try {
                            const file = this.vault.getAbstractFileByPath(path);
                            if (!file) {
                                this.suppressedInline.delete(path);
                                continue;
                            }
                            // Try augmented cache
                            const augmented = yield this.storage.loadAugmented(path);
                            if (((_e = augmented === null || augmented === void 0 ? void 0 : augmented.data) === null || _e === void 0 ? void 0 : _e.length) !== undefined) {
                                yield this.repository.updateFile(path, augmented.data, undefined, { forceEmit: true });
                                restoredFromAugmented++;
                                this.suppressedInline.delete(path);
                                continue;
                            }
                            // Try raw cache and re-augment
                            const raw = yield this.storage.loadRaw(path);
                            if (raw === null || raw === void 0 ? void 0 : raw.data) {
                                const projectData = yield this.projectResolver.get(path);
                                const fileCache = this.metadataCache.getFileCache(file);
                                const augmentContext = {
                                    filePath: path,
                                    fileMeta: (fileCache === null || fileCache === void 0 ? void 0 : fileCache.frontmatter) || {},
                                    projectName: (_f = projectData.tgProject) === null || _f === void 0 ? void 0 : _f.name,
                                    projectMeta: Object.assign(Object.assign({}, projectData.enhancedMetadata), { tgProject: projectData.tgProject }),
                                    tasks: raw.data,
                                };
                                const augmentedTasks = yield this.augmentor.merge(augmentContext);
                                yield this.repository.updateFile(path, augmentedTasks);
                                restoredFromRaw++;
                                this.suppressedInline.delete(path);
                                continue;
                            }
                            // Fallback: single-file parse
                            yield this.processFileImmediate(file, false);
                            reparsed++;
                            this.suppressedInline.delete(path);
                        }
                        catch (e) {
                            // Persist updated suppressed sets for cross-restart recovery
                            try {
                                yield this.storage.saveMeta("filter:suppressedInline", Array.from(this.suppressedInline));
                                yield this.storage.saveMeta("filter:suppressedFileTasks", Array.from(this.suppressedFileTasks));
                            }
                            catch (e) {
                                console.warn("[DataflowOrchestrator] persist suppressed meta failed", e);
                            }
                            console.warn("[DataflowOrchestrator] restore inline failed", { path, e });
                        }
                    }
                });
                // Batch inline restores
                for (let i = 0; i < inlineCandidates.length; i += this.RESTORE_BATCH_SIZE) {
                    const batch = inlineCandidates.slice(i, i + this.RESTORE_BATCH_SIZE);
                    yield processInlineBatch(batch);
                    if (i + this.RESTORE_BATCH_SIZE < inlineCandidates.length) {
                        yield new Promise((r) => setTimeout(r, this.RESTORE_BATCH_INTERVAL_MS));
                    }
                }
                // File-task restores: emit event to let FileSource re-evaluate
                for (const path of fileTaskCandidates) {
                    try {
                        emit(this.app, Events.FILE_UPDATED, {
                            path,
                            reason: "restore",
                            timestamp: Date.now(),
                        });
                        this.suppressedFileTasks.delete(path);
                    }
                    catch (e) {
                        console.warn("[DataflowOrchestrator] restore file-task emit failed", { path, e });
                    }
                }
                const elapsed = Date.now() - start;
                console.log("[DataflowOrchestrator] restoreByFilter", {
                    restoredFromAugmented,
                    restoredFromRaw,
                    reparsed,
                    totalInline: inlineCandidates.length,
                    totalFileTasks: fileTaskCandidates.length,
                    elapsed,
                });
            }
            catch (e) {
                console.warn("[DataflowOrchestrator] restoreByFilter failed", e);
            }
        });
    }
    /**
     * Get worker processing status and metrics
     */
    getWorkerStatus() {
        if (!this.workerOrchestrator) {
            return { enabled: false };
        }
        return {
            enabled: this.workerOrchestrator.isWorkerProcessingEnabled(),
            metrics: this.workerOrchestrator.getMetrics(),
        };
    }
    /**
     * Parse a file based on its type using ConfigurableTaskParser
     */
    parseFile(file, tgProject) {
        return __awaiter(this, void 0, void 0, function* () {
            const extension = file.extension.toLowerCase();
            // Parse based on file type
            let tasks = [];
            if (extension === "md") {
                // Use ConfigurableTaskParser for markdown files
                const content = yield this.vault.cachedRead(file);
                const fileCache = this.metadataCache.getFileCache(file);
                const fileMetadata = (fileCache === null || fileCache === void 0 ? void 0 : fileCache.frontmatter) || {};
                // Create parser with plugin settings using consistent config generation
                const parserConfig = getConfig(this.plugin.settings.preferMetadataFormat || "tasks", this.plugin);
                // Debug: log effective specialTagPrefixes for verification
                console.debug("[TPB] Parser specialTagPrefixes:", parserConfig.specialTagPrefixes);
                const parser = new ConfigurableTaskParser(parserConfig, this.timeParsingService);
                // Legacy code for reference (now replaced by getConfig)
                /*const tasksProjectPrefix =
                    this.plugin.settings?.projectTagPrefix?.tasks || "project";
                const tasksContextPrefix =
                    this.plugin.settings?.contextTagPrefix?.tasks || "@";
                */
                // Parse tasks using ConfigurableTaskParser with tgProject
                const markdownTasks = parser.parseLegacy(content, file.path, fileMetadata, undefined, tgProject);
                tasks.push(...markdownTasks);
                // Parse file-level tasks from frontmatter
                const fileMetaTasks = yield parseFileMeta(this.plugin, file.path);
                tasks.push(...fileMetaTasks);
            }
            else if (extension === "canvas") {
                // Parse canvas tasks using the static method
                const canvasTasks = yield CanvasParser.parseCanvas(this.plugin, file);
                tasks.push(...canvasTasks);
            }
            return tasks;
        });
    }
    /**
     * Process multiple files in batch using workers for parallel processing
     */
    processBatch(files, useWorkers = true) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const updates = new Map();
            let skippedCount = 0;
            // Decide whether to use workers based on batch size and configuration
            const shouldUseWorkers = useWorkers && files.length > 5; // Use workers for batches > 5 files
            if (shouldUseWorkers) {
                // Use WorkerOrchestrator for parallel processing
                console.log(`[DataflowOrchestrator] Using workers to process ${files.length} files in parallel`);
                try {
                    // Configure worker manager with plugin settings
                    const taskWorkerManager = this.workerOrchestrator["taskWorkerManager"];
                    if (taskWorkerManager) {
                        taskWorkerManager.updateSettings({
                            preferMetadataFormat: this.plugin.settings.preferMetadataFormat ||
                                "tasks",
                            customDateFormats: this.plugin.settings.customDateFormats,
                            fileMetadataInheritance: this.plugin.settings.fileMetadataInheritance,
                            projectConfig: this.plugin.settings.projectConfig,
                            ignoreHeading: this.plugin.settings.ignoreHeading,
                            focusHeading: this.plugin.settings.focusHeading,
                            // Include tag prefixes for custom dataview field support
                            projectTagPrefix: this.plugin.settings.projectTagPrefix,
                            contextTagPrefix: this.plugin.settings.contextTagPrefix,
                            areaTagPrefix: this.plugin.settings.areaTagPrefix,
                        });
                    }
                    // Parse all files in parallel using workers (raw parsing only, no project data)
                    console.log(`[DataflowOrchestrator] Parsing ${files.length} files with workers (raw extraction)...`);
                    const parsedResults = yield this.workerOrchestrator.batchParse(files, "normal");
                    // Compute project data in parallel with storage operations
                    const projectDataPromises = new Map();
                    for (const file of files) {
                        projectDataPromises.set(file.path, this.projectResolver.get(file.path));
                    }
                    // Process each parsed result
                    for (const [filePath, rawTasks] of parsedResults) {
                        try {
                            const file = files.find((f) => f.path === filePath);
                            if (!file)
                                continue;
                            // Apply inline file filter early in worker path
                            const includeInline = this.fileFilterManager
                                ? this.fileFilterManager.shouldIncludePath(filePath, "inline")
                                : true;
                            if (!includeInline) {
                                updates.set(filePath, []);
                                continue;
                            }
                            // Get file modification time for caching
                            const fileStat = yield this.vault.adapter.stat(filePath);
                            const mtime = fileStat === null || fileStat === void 0 ? void 0 : fileStat.mtime;
                            const fileContent = yield this.vault.cachedRead(file);
                            // Store parsed tasks with mtime (can happen in parallel)
                            const storePromise = this.storage.storeRaw(filePath, rawTasks, fileContent, mtime);
                            // Get project data for augmentation (already computing in parallel)
                            const projectData = yield projectDataPromises.get(filePath);
                            // Wait for storage to complete
                            yield storePromise;
                            // Augment tasks with project data
                            const fileMetadata = this.metadataCache.getFileCache(file);
                            const augmentContext = {
                                filePath,
                                fileMeta: (fileMetadata === null || fileMetadata === void 0 ? void 0 : fileMetadata.frontmatter) || {},
                                projectName: (_a = projectData === null || projectData === void 0 ? void 0 : projectData.tgProject) === null || _a === void 0 ? void 0 : _a.name,
                                projectMeta: projectData
                                    ? Object.assign(Object.assign({}, (projectData.enhancedMetadata || {})), { tgProject: projectData.tgProject }) : {},
                                tasks: rawTasks,
                            };
                            const augmentedTasks = yield this.augmentor.merge(augmentContext);
                            // Always update for newly parsed files
                            updates.set(filePath, augmentedTasks);
                        }
                        catch (error) {
                            console.error(`Error processing parsed result for ${filePath}:`, error);
                        }
                    }
                    console.log(`[DataflowOrchestrator] Worker processing complete, parsed ${parsedResults.size} files`);
                }
                catch (error) {
                    console.error("[DataflowOrchestrator] Worker processing failed, falling back to sequential:", error);
                    // Fall back to sequential processing
                    yield this.processBatchSequential(files, updates, skippedCount);
                }
            }
            else {
                // Use sequential processing for small batches or when workers are disabled
                yield this.processBatchSequential(files, updates, skippedCount);
            }
            if (skippedCount > 0) {
                console.log(`[DataflowOrchestrator] Skipped ${skippedCount} unchanged files`);
            }
            // Update repository in batch
            if (updates.size > 0) {
                // Generate a unique sequence for this batch operation
                this.lastProcessedSeq = Seq.next();
                // Pass our sequence to repository to track event origin
                yield this.repository.updateBatch(updates, this.lastProcessedSeq);
            }
        });
    }
    /**
     * Process files sequentially (fallback or for small batches)
     */
    processBatchSequential(files, updates, skippedCount) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            let localSkippedCount = 0;
            for (const file of files) {
                try {
                    const filePath = file.path;
                    // Get file modification time
                    const fileStat = yield this.vault.adapter.stat(file.path);
                    const mtime = fileStat === null || fileStat === void 0 ? void 0 : fileStat.mtime;
                    // Check if we can skip this file based on cached data
                    const rawCached = yield this.storage.loadRaw(filePath);
                    const fileContent = yield this.vault.cachedRead(file);
                    // Apply inline file filter early for all branches
                    const includeInlineEarly = this.fileFilterManager
                        ? this.fileFilterManager.shouldIncludePath(filePath, "inline")
                        : true;
                    if (!includeInlineEarly) {
                        updates.set(filePath, []);
                        localSkippedCount++;
                        continue;
                    }
                    // Check both raw and augmented cache
                    const augmentedCached = yield this.storage.loadAugmented(filePath);
                    if (rawCached &&
                        augmentedCached &&
                        this.storage.isRawValid(filePath, rawCached, fileContent, mtime)) {
                        // Use cached augmented tasks directly - no need to re-augment
                        const augmentedTasks = augmentedCached.data;
                        // Always add to updates - Repository will handle change detection
                        updates.set(filePath, augmentedTasks);
                        localSkippedCount++; // Count as skipped since we used cache
                    }
                    else if (rawCached &&
                        this.storage.isRawValid(filePath, rawCached, fileContent, mtime)) {
                        // Have raw cache but not augmented, need to re-augment
                        const rawTasks = rawCached.data;
                        // Get project data
                        const projectData = yield this.projectResolver.get(filePath);
                        // Augment tasks
                        const fileMetadata = this.metadataCache.getFileCache(file);
                        const augmentContext = {
                            filePath,
                            fileMeta: (fileMetadata === null || fileMetadata === void 0 ? void 0 : fileMetadata.frontmatter) || {},
                            projectName: (_a = projectData.tgProject) === null || _a === void 0 ? void 0 : _a.name,
                            projectMeta: Object.assign(Object.assign({}, projectData.enhancedMetadata), { tgProject: projectData.tgProject }),
                            tasks: rawTasks,
                        };
                        const augmentedTasks = yield this.augmentor.merge(augmentContext);
                        // Always add to updates - Repository will handle change detection
                        updates.set(filePath, augmentedTasks);
                        localSkippedCount++; // Count as skipped since we used cache
                    }
                    else {
                        // Parse file as it has changed or is new
                        // Get project data first for parsing
                        const projectData = yield this.projectResolver.get(filePath);
                        // Apply file filter scope: skip inline parsing when scope === 'file'
                        const includeInline = this.fileFilterManager
                            ? this.fileFilterManager.shouldIncludePath(filePath, "inline")
                            : true;
                        console.log("[DataflowOrchestrator] Inline filter decision", { filePath, includeInline });
                        const rawTasks = includeInline
                            ? yield this.parseFile(file, projectData.tgProject)
                            : [];
                        // Store raw tasks with mtime
                        yield this.storage.storeRaw(filePath, rawTasks, fileContent, mtime);
                        // Augment tasks
                        const fileMetadata = this.metadataCache.getFileCache(file);
                        const augmentContext = {
                            filePath,
                            fileMeta: (fileMetadata === null || fileMetadata === void 0 ? void 0 : fileMetadata.frontmatter) || {},
                            projectName: (_b = projectData.tgProject) === null || _b === void 0 ? void 0 : _b.name,
                            projectMeta: Object.assign(Object.assign({}, projectData.enhancedMetadata), { tgProject: projectData.tgProject }),
                            tasks: rawTasks,
                        };
                        const augmentedTasks = yield this.augmentor.merge(augmentContext);
                        updates.set(filePath, augmentedTasks);
                    }
                }
                catch (error) {
                    console.error(`Error processing file ${file.path} sequentially:`, error);
                }
            }
            return localSkippedCount;
        });
    }
    /**
     * Remove a file from the index
     */
    removeFile(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.repository.removeFile(filePath);
        });
    }
    /**
     * Handle file rename
     */
    renameFile(oldPath, newPath) {
        return __awaiter(this, void 0, void 0, function* () {
            // Remove old file
            yield this.removeFile(oldPath);
            // Process new file
            const file = this.vault.getAbstractFileByPath(newPath);
            if (file instanceof TFile) {
                yield this.processFile(file);
            }
        });
    }
    /**
     * Clear all data and rebuild
     */
    rebuild() {
        return __awaiter(this, void 0, void 0, function* () {
            // Clear all data
            yield this.repository.clear();
            // Process all markdown and canvas files
            const files = this.vault.getMarkdownFiles();
            const canvasFiles = this.vault
                .getFiles()
                .filter((f) => f.extension === "canvas");
            const allFiles = [...files, ...canvasFiles];
            // Process in batches for performance
            const BATCH_SIZE = 50;
            for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
                const batch = allFiles.slice(i, i + BATCH_SIZE);
                yield this.processBatch(batch);
            }
            // Persist the rebuilt index
            yield this.repository.persist();
            // Emit ready event
            emit(this.app, Events.CACHE_READY, {
                initial: false,
                timestamp: Date.now(),
                seq: Seq.next(),
            });
        });
    }
    /**
     * Handle settings change
     */
    onSettingsChange(scopes) {
        return __awaiter(this, void 0, void 0, function* () {
            // Clear relevant caches based on scope
            if (scopes.includes("parser")) {
                yield this.storage.clearNamespace("raw");
            }
            if (scopes.includes("augment") || scopes.includes("project")) {
                yield this.storage.clearNamespace("augmented");
                yield this.storage.clearNamespace("project");
                this.projectResolver.clearCache();
            }
            if (scopes.includes("index")) {
                yield this.storage.clearNamespace("consolidated");
            }
            // Emit settings changed event
            emit(this.app, Events.SETTINGS_CHANGED, {
                scopes,
                timestamp: Date.now(),
            });
            // Trigger rebuild if needed
            if (scopes.some((s) => ["parser", "augment", "project"].includes(s))) {
                yield this.rebuild();
            }
        });
    }
    /**
     * Update project configuration options
     */
    updateProjectOptions(options) {
        this.projectResolver.updateOptions(options);
    }
    /**
     * Get the query API for external access
     */
    getQueryAPI() {
        return this.queryAPI;
    }
    /**
     * Get the repository for direct access
     */
    getRepository() {
        return this.repository;
    }
    /**
     * Get statistics about the dataflow system
     */
    getStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const indexStats = yield this.queryAPI.getSummary();
            const storageStats = yield this.storage.getStats();
            return {
                indexStats,
                storageStats,
                queueSize: this.processingQueue.size,
                workerStats: this.workerOrchestrator.getMetrics(),
                sourceStats: this.obsidianSource.getStats(),
            };
        });
    }
    /**
     * Get the worker orchestrator for advanced worker management
     */
    getWorkerOrchestrator() {
        return this.workerOrchestrator;
    }
    /**
     * Get the Obsidian source for event management
     */
    getObsidianSource() {
        return this.obsidianSource;
    }
    /**
     * Get the augmentor for inheritance strategy management
     */
    getAugmentor() {
        return this.augmentor;
    }
    /**
     * Cleanup resources
     */
    cleanup() {
        return __awaiter(this, void 0, void 0, function* () {
            // Clear all pending timeouts
            for (const timeout of this.processingQueue.values()) {
                clearTimeout(timeout);
            }
            this.processingQueue.clear();
            // Unsubscribe from events
            // These are workspace events created by our custom Events.on() function
            for (const ref of this.eventRefs) {
                // Use workspace.offref for workspace events
                if (this.app.workspace &&
                    typeof this.app.workspace.offref === "function") {
                    this.app.workspace.offref(ref);
                }
            }
            this.eventRefs = [];
            // Cleanup ObsidianSource
            this.obsidianSource.destroy();
            // Cleanup IcsSource
            this.icsSource.destroy();
            // Cleanup FileSource
            if (this.fileSource) {
                this.fileSource.destroy();
            }
            // Cleanup WorkerOrchestrator
            this.workerOrchestrator.destroy();
            // Cleanup repository and persist current state
            yield this.repository.cleanup();
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT3JjaGVzdHJhdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiT3JjaGVzdHJhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBQU8sS0FBSyxFQUFrQyxRQUFRLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFJaEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBRTFDLE9BQU8sRUFBRSxRQUFRLElBQUksZUFBZSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDakUsT0FBTyxFQUFFLFNBQVMsRUFBa0IsTUFBTSxxQkFBcUIsQ0FBQztBQUVoRSxPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDeEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDbEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQzFELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNoRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDbEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDaEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDOUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFcEUsaUJBQWlCO0FBQ2pCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNuRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDekQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3hELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXZFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFN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WUFDWiw2QkFBNkI7WUFDN0IsS0FBSyxNQUFNLE9BQU8sSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUNwRCxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDdEI7WUFDRCxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBRTdCLDBCQUEwQjtZQUMxQix3RUFBd0U7WUFDeEUsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFO2dCQUNqQyw0Q0FBNEM7Z0JBQzVDLElBQ0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTO29CQUNsQixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sS0FBSyxVQUFVLEVBQzlDO29CQUNELElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDL0I7YUFDRDtZQUNELElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO1lBRXBCLHlCQUF5QjtZQUN6QixJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBRTlCLG9CQUFvQjtZQUNwQixJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBRXpCLHFCQUFxQjtZQUNyQixJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUU7Z0JBQ3BCLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7YUFDMUI7WUFFRCw2QkFBNkI7WUFDN0IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxDQUFDO1lBRWxDLCtDQUErQztZQUMvQyxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDakMsQ0FBQztLQUFBO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHAsIFRGaWxlLCBWYXVsdCwgTWV0YWRhdGFDYWNoZSwgRXZlbnRSZWYsIGRlYm91bmNlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB0eXBlIHsgVGFzaywgVGdQcm9qZWN0IH0gZnJvbSBcIi4uL3R5cGVzL3Rhc2tcIjtcclxuaW1wb3J0IHR5cGUgeyBQcm9qZWN0Q29uZmlnTWFuYWdlck9wdGlvbnMgfSBmcm9tIFwiLi4vbWFuYWdlcnMvcHJvamVjdC1jb25maWctbWFuYWdlclwiO1xyXG5cclxuaW1wb3J0IHsgUXVlcnlBUEkgfSBmcm9tIFwiLi9hcGkvUXVlcnlBUElcIjtcclxuaW1wb3J0IHsgUmVwb3NpdG9yeSB9IGZyb20gXCIuL2luZGV4ZXIvUmVwb3NpdG9yeVwiO1xyXG5pbXBvcnQgeyBSZXNvbHZlciBhcyBQcm9qZWN0UmVzb2x2ZXIgfSBmcm9tIFwiLi9wcm9qZWN0L1Jlc29sdmVyXCI7XHJcbmltcG9ydCB7IEF1Z21lbnRvciwgQXVnbWVudENvbnRleHQgfSBmcm9tIFwiLi9hdWdtZW50L0F1Z21lbnRvclwiO1xyXG5pbXBvcnQgeyBTdG9yYWdlIH0gZnJvbSBcIi4vcGVyc2lzdGVuY2UvU3RvcmFnZVwiO1xyXG5pbXBvcnQgeyBFdmVudHMsIGVtaXQsIFNlcSwgb24gfSBmcm9tIFwiLi9ldmVudHMvRXZlbnRzXCI7XHJcbmltcG9ydCB7IFdvcmtlck9yY2hlc3RyYXRvciB9IGZyb20gXCIuL3dvcmtlcnMvV29ya2VyT3JjaGVzdHJhdG9yXCI7XHJcbmltcG9ydCB7IE9ic2lkaWFuU291cmNlIH0gZnJvbSBcIi4vc291cmNlcy9PYnNpZGlhblNvdXJjZVwiO1xyXG5pbXBvcnQgeyBJY3NTb3VyY2UgfSBmcm9tIFwiLi9zb3VyY2VzL0ljc1NvdXJjZVwiO1xyXG5pbXBvcnQgeyBGaWxlU291cmNlIH0gZnJvbSBcIi4vc291cmNlcy9GaWxlU291cmNlXCI7XHJcbmltcG9ydCB7IFRhc2tXb3JrZXJNYW5hZ2VyIH0gZnJvbSBcIi4vd29ya2Vycy9UYXNrV29ya2VyTWFuYWdlclwiO1xyXG5pbXBvcnQgeyBQcm9qZWN0RGF0YVdvcmtlck1hbmFnZXIgfSBmcm9tIFwiLi93b3JrZXJzL1Byb2plY3REYXRhV29ya2VyTWFuYWdlclwiO1xyXG5pbXBvcnQgeyBGaWxlRmlsdGVyTWFuYWdlciB9IGZyb20gXCIuLi9tYW5hZ2Vycy9maWxlLWZpbHRlci1tYW5hZ2VyXCI7XHJcblxyXG4vLyBQYXJzZXIgaW1wb3J0c1xyXG5pbXBvcnQgeyBDYW52YXNQYXJzZXIgfSBmcm9tIFwiLi9jb3JlL0NhbnZhc1BhcnNlclwiO1xyXG5pbXBvcnQgeyBnZXRDb25maWcgfSBmcm9tIFwiLi4vY29tbW9uL3Rhc2stcGFyc2VyLWNvbmZpZ1wiO1xyXG5pbXBvcnQgeyBwYXJzZUZpbGVNZXRhIH0gZnJvbSBcIi4vcGFyc2Vycy9GaWxlTWV0YUVudHJ5XCI7XHJcbmltcG9ydCB7IENvbmZpZ3VyYWJsZVRhc2tQYXJzZXIgfSBmcm9tIFwiLi9jb3JlL0NvbmZpZ3VyYWJsZVRhc2tQYXJzZXJcIjtcclxuaW1wb3J0IHsgTWV0YWRhdGFQYXJzZU1vZGUgfSBmcm9tIFwiLi4vdHlwZXMvVGFza1BhcnNlckNvbmZpZ1wiO1xyXG5pbXBvcnQgeyBUaW1lUGFyc2luZ1NlcnZpY2UgfSBmcm9tIFwiLi4vc2VydmljZXMvdGltZS1wYXJzaW5nLXNlcnZpY2VcIjtcclxuaW1wb3J0IHR5cGUgeyBFbmhhbmNlZFRpbWVQYXJzaW5nQ29uZmlnIH0gZnJvbSBcIi4uL3R5cGVzL3RpbWUtcGFyc2luZ1wiO1xyXG5cclxuLyoqXHJcbiAqIERhdGFmbG93T3JjaGVzdHJhdG9yIC0gQ29vcmRpbmF0ZXMgYWxsIGRhdGFmbG93IGNvbXBvbmVudHNcclxuICogVGhpcyBpcyB0aGUgbWFpbiBlbnRyeSBwb2ludCBmb3IgdGhlIG5ldyBkYXRhZmxvdyBhcmNoaXRlY3R1cmVcclxuICovXHJcbmV4cG9ydCBjbGFzcyBEYXRhZmxvd09yY2hlc3RyYXRvciB7XHJcblx0cHJpdmF0ZSBxdWVyeUFQSTogUXVlcnlBUEk7XHJcblx0cHJpdmF0ZSByZXBvc2l0b3J5OiBSZXBvc2l0b3J5O1xyXG5cdHByaXZhdGUgcHJvamVjdFJlc29sdmVyOiBQcm9qZWN0UmVzb2x2ZXI7XHJcblx0cHJpdmF0ZSBhdWdtZW50b3I6IEF1Z21lbnRvcjtcclxuXHRwcml2YXRlIHN0b3JhZ2U6IFN0b3JhZ2U7XHJcblx0cHJpdmF0ZSB3b3JrZXJPcmNoZXN0cmF0b3I6IFdvcmtlck9yY2hlc3RyYXRvcjtcclxuXHRwcml2YXRlIG9ic2lkaWFuU291cmNlOiBPYnNpZGlhblNvdXJjZTtcclxuXHRwdWJsaWMgaWNzU291cmNlOiBJY3NTb3VyY2U7XHJcblxyXG5cdC8vIENlbnRyYWwgZmlsZSBmaWx0ZXIgbWFuYWdlclxyXG5cdHByaXZhdGUgZmlsZUZpbHRlck1hbmFnZXI/OiBGaWxlRmlsdGVyTWFuYWdlcjtcclxuXHJcblx0cHJpdmF0ZSBmaWxlU291cmNlOiBGaWxlU291cmNlIHwgbnVsbCA9IG51bGw7XHJcblxyXG5cdC8vIFRpbWUgcGFyc2luZyBzZXJ2aWNlIGZvciBlbmhhbmNlZCB0aW1lIHJlY29nbml0aW9uXHJcblx0cHJpdmF0ZSB0aW1lUGFyc2luZ1NlcnZpY2U6IFRpbWVQYXJzaW5nU2VydmljZTtcclxuXHJcblx0Ly8gRXZlbnQgcmVmZXJlbmNlcyBmb3IgY2xlYW51cFxyXG5cdHByaXZhdGUgZXZlbnRSZWZzOiBFdmVudFJlZltdID0gW107XHJcblxyXG5cdC8vIFByb2Nlc3NpbmcgcXVldWUgZm9yIHRocm90dGxpbmdcclxuXHRwcml2YXRlIHByb2Nlc3NpbmdRdWV1ZSA9IG5ldyBNYXA8c3RyaW5nLCBOb2RlSlMuVGltZW91dD4oKTtcclxuXHRwcml2YXRlIHJlYWRvbmx5IERFQk9VTkNFX0RFTEFZID0gMzAwOyAvLyBtc1xyXG5cclxuXHQvLyBMaWdodHdlaWdodCBib29ra2VlcGluZyBmb3IgZmlsdGVyLWJhc2VkIHBydW5pbmcvcmVzdG9yYXRpb25cclxuXHRwcml2YXRlIHN1cHByZXNzZWRJbmxpbmUgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuXHRwcml2YXRlIHN1cHByZXNzZWRGaWxlVGFza3MgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuXHRwcml2YXRlIHJlc3RvcmVCeUZpbHRlckRlYm91bmNlZDogKCkgPT4gdm9pZDtcclxuXHRwcml2YXRlIHJlYWRvbmx5IFJFU1RPUkVfQkFUQ0hfU0laRSA9IDUwO1xyXG5cdHByaXZhdGUgcmVhZG9ubHkgUkVTVE9SRV9CQVRDSF9JTlRFUlZBTF9NUyA9IDEwMDtcclxuXHRwcml2YXRlIGxhc3RGaWxlRmlsdGVyRW5hYmxlZDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuXHQvLyBUcmFjayBsYXN0IHByb2Nlc3NlZCBzZXF1ZW5jZSB0byBhdm9pZCBpbmZpbml0ZSBsb29wc1xyXG5cdHByaXZhdGUgbGFzdFByb2Nlc3NlZFNlcTogbnVtYmVyID0gMDtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwcml2YXRlIGFwcDogQXBwLFxyXG5cdFx0cHJpdmF0ZSB2YXVsdDogVmF1bHQsXHJcblx0XHRwcml2YXRlIG1ldGFkYXRhQ2FjaGU6IE1ldGFkYXRhQ2FjaGUsXHJcblx0XHRwcml2YXRlIHBsdWdpbjogYW55LCAvLyBQbHVnaW4gaW5zdGFuY2UgZm9yIHBhcnNlciBhY2Nlc3NcclxuXHRcdHByb2plY3RPcHRpb25zPzogUGFydGlhbDxQcm9qZWN0Q29uZmlnTWFuYWdlck9wdGlvbnM+XHJcblx0KSB7XHJcblx0XHQvLyBJbml0aWFsaXplIGNvbXBvbmVudHNcclxuXHRcdHRoaXMucXVlcnlBUEkgPSBuZXcgUXVlcnlBUEkoYXBwLCB2YXVsdCwgbWV0YWRhdGFDYWNoZSk7XHJcblx0XHR0aGlzLnJlcG9zaXRvcnkgPSB0aGlzLnF1ZXJ5QVBJLmdldFJlcG9zaXRvcnkoKTtcclxuXHRcdHRoaXMucHJvamVjdFJlc29sdmVyID0gbmV3IFByb2plY3RSZXNvbHZlcihcclxuXHRcdFx0YXBwLFxyXG5cdFx0XHR2YXVsdCxcclxuXHRcdFx0bWV0YWRhdGFDYWNoZSxcclxuXHRcdFx0cHJvamVjdE9wdGlvbnNcclxuXHRcdCk7XHJcblx0XHR0aGlzLmF1Z21lbnRvciA9IG5ldyBBdWdtZW50b3Ioe1xyXG5cdFx0XHRhcHAsXHJcblx0XHRcdHZhdWx0LFxyXG5cdFx0XHRtZXRhZGF0YUNhY2hlLFxyXG5cdFx0fSk7XHJcblx0XHQvLyBJbml0aWFsIHN5bmMgb2Ygc2V0dGluZ3MgdG8gQXVnbWVudG9yIHRvIGVuc3VyZSBjb3JyZWN0IGluaGVyaXRhbmNlIGJlaGF2aW9yIG9uIHN0YXJ0dXBcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IGluaXRGbWkgPSB0aGlzLnBsdWdpbj8uc2V0dGluZ3M/LmZpbGVNZXRhZGF0YUluaGVyaXRhbmNlO1xyXG5cdFx0XHRjb25zdCBpbml0UHJvamVjdENvbmZpZyA9IHRoaXMucGx1Z2luPy5zZXR0aW5ncz8ucHJvamVjdENvbmZpZztcclxuXHRcdFx0dGhpcy5hdWdtZW50b3IudXBkYXRlU2V0dGluZ3Moe1xyXG5cdFx0XHRcdGZpbGVNZXRhZGF0YUluaGVyaXRhbmNlOiBpbml0Rm1pLFxyXG5cdFx0XHRcdHByb2plY3RDb25maWc6IGluaXRQcm9qZWN0Q29uZmlnLFxyXG5cdFx0XHR9KTtcclxuXHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFwiW0RhdGFmbG93T3JjaGVzdHJhdG9yXVtpbml0XSBGYWlsZWQgdG8gc3luYyBzZXR0aW5ncyB0byBBdWdtZW50b3JcIixcclxuXHRcdFx0XHRlXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblx0XHR0aGlzLnN0b3JhZ2UgPSB0aGlzLnJlcG9zaXRvcnkuZ2V0U3RvcmFnZSgpO1xyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgRmlsZUZpbHRlck1hbmFnZXIgZnJvbSBzZXR0aW5ncyBlYXJseSBzbyBzb3VyY2VzIGdldCBpdFxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgZmZTZXR0aW5nc0Vhcmx5ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3M/LmZpbGVGaWx0ZXI7XHJcblx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFwiW0RhdGFmbG93T3JjaGVzdHJhdG9yXSBFYXJseSBGaWxlRmlsdGVyIHNldHRpbmdzOlwiLFxyXG5cdFx0XHRcdEpTT04uc3RyaW5naWZ5KGZmU2V0dGluZ3NFYXJseSwgbnVsbCwgMilcclxuXHRcdFx0KTtcclxuXHRcdFx0aWYgKGZmU2V0dGluZ3NFYXJseSkge1xyXG5cdFx0XHRcdHRoaXMuZmlsZUZpbHRlck1hbmFnZXIgPSBuZXcgRmlsZUZpbHRlck1hbmFnZXIoZmZTZXR0aW5nc0Vhcmx5KTtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdFwiW0RhdGFmbG93T3JjaGVzdHJhdG9yXSBDcmVhdGVkIEZpbGVGaWx0ZXJNYW5hZ2VyIGVhcmx5IHdpdGggc3RhdHM6XCIsXHJcblx0XHRcdFx0XHR0aGlzLmZpbGVGaWx0ZXJNYW5hZ2VyLmdldFN0YXRzKClcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdC8vIFByb3ZpZGUgdG8gcmVwb3NpdG9yeSdzIGluZGV4ZXIgZm9yIGlubGluZSBmaWx0ZXJpbmcgaW1tZWRpYXRlbHlcclxuXHRcdFx0XHQodGhpcy5yZXBvc2l0b3J5IGFzIGFueSkuc2V0RmlsZUZpbHRlck1hbmFnZXI/LihcclxuXHRcdFx0XHRcdHRoaXMuZmlsZUZpbHRlck1hbmFnZXJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XCJbRGF0YWZsb3dPcmNoZXN0cmF0b3JdIFByb3ZpZGVkIEZpbGVGaWx0ZXJNYW5hZ2VyIHRvIHJlcG9zaXRvcnkgaW5kZXhlclwiXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdFwiW0RhdGFmbG93T3JjaGVzdHJhdG9yXSBObyBGaWxlRmlsdGVyIHNldHRpbmdzIGZvdW5kLCBGaWxlRmlsdGVyTWFuYWdlciBub3QgY3JlYXRlZFwiXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XCJbRGF0YWZsb3dPcmNoZXN0cmF0b3JdIEZhaWxlZCBlYXJseSBGaWxlRmlsdGVyTWFuYWdlciBpbml0XCIsXHJcblx0XHRcdFx0ZVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgZGVib3VuY2VkIHJlc3RvcmUgaGFuZGxlciAoZGVmYXVsdCBPTikgLSB0cmFpbGluZyBvbmx5XHJcblx0XHR0aGlzLnJlc3RvcmVCeUZpbHRlckRlYm91bmNlZCA9IGRlYm91bmNlKFxyXG5cdFx0XHQoKSA9PiB7XHJcblx0XHRcdFx0dm9pZCB0aGlzLnJlc3RvcmVCeUZpbHRlcigpO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHQ1MDAsXHJcblx0XHRcdGZhbHNlXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgd29ya2VyIG9yY2hlc3RyYXRvciB3aXRoIHNldHRpbmdzXHJcblx0XHRjb25zdCB0YXNrV29ya2VyTWFuYWdlciA9IG5ldyBUYXNrV29ya2VyTWFuYWdlcih2YXVsdCwgbWV0YWRhdGFDYWNoZSwge1xyXG5cdFx0XHRzZXR0aW5nczoge1xyXG5cdFx0XHRcdHByZWZlck1ldGFkYXRhRm9ybWF0OlxyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucHJlZmVyTWV0YWRhdGFGb3JtYXQgfHwgXCJ0YXNrc1wiLFxyXG5cdFx0XHRcdHVzZURhaWx5Tm90ZVBhdGhBc0RhdGU6XHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VEYWlseU5vdGVQYXRoQXNEYXRlIHx8IGZhbHNlLFxyXG5cdFx0XHRcdGRhaWx5Tm90ZUZvcm1hdDpcclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLmRhaWx5Tm90ZUZvcm1hdCB8fCBcInl5eXktTU0tZGRcIixcclxuXHRcdFx0XHR1c2VBc0RhdGVUeXBlOiB0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VBc0RhdGVUeXBlIHx8IFwiZHVlXCIsXHJcblx0XHRcdFx0ZGFpbHlOb3RlUGF0aDogdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGFpbHlOb3RlUGF0aCB8fCBcIlwiLFxyXG5cdFx0XHRcdGlnbm9yZUhlYWRpbmc6IHRoaXMucGx1Z2luLnNldHRpbmdzLmlnbm9yZUhlYWRpbmcgfHwgXCJcIixcclxuXHRcdFx0XHRmb2N1c0hlYWRpbmc6IHRoaXMucGx1Z2luLnNldHRpbmdzLmZvY3VzSGVhZGluZyB8fCBcIlwiLFxyXG5cdFx0XHRcdGZpbGVQYXJzaW5nQ29uZmlnOiB1bmRlZmluZWQsXHJcblx0XHRcdFx0ZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2U6XHJcblx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2UsXHJcblx0XHRcdFx0ZW5hYmxlQ3VzdG9tRGF0ZUZvcm1hdHM6XHJcblx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuZW5hYmxlQ3VzdG9tRGF0ZUZvcm1hdHMsXHJcblx0XHRcdFx0Y3VzdG9tRGF0ZUZvcm1hdHM6IHRoaXMucGx1Z2luLnNldHRpbmdzLmN1c3RvbURhdGVGb3JtYXRzLFxyXG5cdFx0XHRcdC8vIEluY2x1ZGUgdGFnIHByZWZpeGVzIGZvciBjdXN0b20gZGF0YXZpZXcgZmllbGQgc3VwcG9ydFxyXG5cdFx0XHRcdHByb2plY3RUYWdQcmVmaXg6IHRoaXMucGx1Z2luLnNldHRpbmdzLnByb2plY3RUYWdQcmVmaXgsXHJcblx0XHRcdFx0Y29udGV4dFRhZ1ByZWZpeDogdGhpcy5wbHVnaW4uc2V0dGluZ3MuY29udGV4dFRhZ1ByZWZpeCxcclxuXHRcdFx0XHRhcmVhVGFnUHJlZml4OiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hcmVhVGFnUHJlZml4LFxyXG5cdFx0XHR9LFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gRW5zdXJlIHdvcmtlciBwYXJzZXIgcmVjZWl2ZXMgZW5oYW5jZWQgcHJvamVjdCBjb25maWcgYXQgaW5pdFxyXG5cdFx0dGFza1dvcmtlck1hbmFnZXIudXBkYXRlU2V0dGluZ3Moe1xyXG5cdFx0XHRwcm9qZWN0Q29uZmlnOiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgcHJvamVjdFdvcmtlck1hbmFnZXIgPSBuZXcgUHJvamVjdERhdGFXb3JrZXJNYW5hZ2VyKHtcclxuXHRcdFx0dmF1bHQsXHJcblx0XHRcdG1ldGFkYXRhQ2FjaGUsXHJcblx0XHRcdHByb2plY3RDb25maWdNYW5hZ2VyOiB0aGlzLnByb2plY3RSZXNvbHZlci5nZXRDb25maWdNYW5hZ2VyKCksXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBHZXQgd29ya2VyIHByb2Nlc3Npbmcgc2V0dGluZyBmcm9tIGZpbGVTb3VyY2Ugb3IgZmlsZVBhcnNpbmdDb25maWdcclxuXHRcdGNvbnN0IGVuYWJsZVdvcmtlclByb2Nlc3NpbmcgPVxyXG5cdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncz8uZmlsZVNvdXJjZT8ucGVyZm9ybWFuY2VcclxuXHRcdFx0XHQ/LmVuYWJsZVdvcmtlclByb2Nlc3NpbmcgPz9cclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3M/LmZpbGVQYXJzaW5nQ29uZmlnPy5lbmFibGVXb3JrZXJQcm9jZXNzaW5nID8/XHJcblx0XHRcdHRydWU7XHJcblxyXG5cdFx0dGhpcy53b3JrZXJPcmNoZXN0cmF0b3IgPSBuZXcgV29ya2VyT3JjaGVzdHJhdG9yKFxyXG5cdFx0XHR0YXNrV29ya2VyTWFuYWdlcixcclxuXHRcdFx0cHJvamVjdFdvcmtlck1hbmFnZXIsXHJcblx0XHRcdHtlbmFibGVXb3JrZXJQcm9jZXNzaW5nfVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBJbml0aWFsaXplIE9ic2lkaWFuIGV2ZW50IHNvdXJjZVxyXG5cdFx0dGhpcy5vYnNpZGlhblNvdXJjZSA9IG5ldyBPYnNpZGlhblNvdXJjZShhcHAsIHZhdWx0LCBtZXRhZGF0YUNhY2hlKTtcclxuXHJcblx0XHQvLyBJbml0aWFsaXplIElDUyBldmVudCBzb3VyY2VcclxuXHRcdHRoaXMuaWNzU291cmNlID0gbmV3IEljc1NvdXJjZShhcHAsICgpID0+IHRoaXMucGx1Z2luLmdldEljc01hbmFnZXIoKSk7XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBUaW1lUGFyc2luZ1NlcnZpY2Ugd2l0aCBwbHVnaW4gc2V0dGluZ3NcclxuXHRcdHRoaXMudGltZVBhcnNpbmdTZXJ2aWNlID0gbmV3IFRpbWVQYXJzaW5nU2VydmljZShcclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3M/LnRpbWVQYXJzaW5nIHx8XHJcblx0XHRcdCh7XHJcblx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRzdXBwb3J0ZWRMYW5ndWFnZXM6IFtcImVuXCIsIFwiemhcIl0sXHJcblx0XHRcdFx0ZGF0ZUtleXdvcmRzOiB7XHJcblx0XHRcdFx0XHRzdGFydDogW1wic3RhcnRcIiwgXCJiZWdpblwiLCBcImZyb21cIl0sXHJcblx0XHRcdFx0XHRkdWU6IFtcImR1ZVwiLCBcImRlYWRsaW5lXCIsIFwiYnlcIiwgXCJ1bnRpbFwiXSxcclxuXHRcdFx0XHRcdHNjaGVkdWxlZDogW1wic2NoZWR1bGVkXCIsIFwib25cIiwgXCJhdFwiXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHJlbW92ZU9yaWdpbmFsVGV4dDogdHJ1ZSxcclxuXHRcdFx0XHRwZXJMaW5lUHJvY2Vzc2luZzogdHJ1ZSxcclxuXHRcdFx0XHRyZWFsVGltZVJlcGxhY2VtZW50OiB0cnVlLFxyXG5cdFx0XHRcdHRpbWVQYXR0ZXJuczoge1xyXG5cdFx0XHRcdFx0c2luZ2xlVGltZTogW10sXHJcblx0XHRcdFx0XHR0aW1lUmFuZ2U6IFtdLFxyXG5cdFx0XHRcdFx0cmFuZ2VTZXBhcmF0b3JzOiBbXCItXCIsIFwiflwiLCBcIu+9nlwiXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHRpbWVEZWZhdWx0czoge1xyXG5cdFx0XHRcdFx0cHJlZmVycmVkRm9ybWF0OiBcIjI0aFwiLFxyXG5cdFx0XHRcdFx0ZGVmYXVsdFBlcmlvZDogXCJBTVwiLFxyXG5cdFx0XHRcdFx0bWlkbmlnaHRDcm9zc2luZzogXCJuZXh0LWRheVwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0gYXMgRW5oYW5jZWRUaW1lUGFyc2luZ0NvbmZpZylcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBGaWxlU291cmNlIChjb25kaXRpb25hbGx5IGJhc2VkIG9uIHNldHRpbmdzKVxyXG5cdFx0aWYgKHRoaXMucGx1Z2luLnNldHRpbmdzPy5maWxlU291cmNlPy5lbmFibGVkKSB7XHJcblx0XHRcdHRoaXMuZmlsZVNvdXJjZSA9IG5ldyBGaWxlU291cmNlKFxyXG5cdFx0XHRcdGFwcCxcclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5maWxlU291cmNlLFxyXG5cdFx0XHRcdHRoaXMuZmlsZUZpbHRlck1hbmFnZXJcclxuXHRcdFx0KTtcclxuXHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XCJbRGF0YWZsb3dPcmNoZXN0cmF0b3JdIEZpbGVTb3VyY2UgY29uc3RydWN0ZWQgd2l0aCBmaWx0ZXJNYW5hZ2VyPVwiLFxyXG5cdFx0XHRcdCEhdGhpcy5maWxlRmlsdGVyTWFuYWdlclxyXG5cdFx0XHQpO1xyXG5cdFx0XHQvLyBLZWVwIEZpbGVTb3VyY2Ugc3RhdHVzIG1hcHBpbmcgaW4gc3luYyB3aXRoIFRhc2sgU3RhdHVzIHNldHRpbmdzXHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0dGhpcy5maWxlU291cmNlLnN5bmNTdGF0dXNNYXBwaW5nRnJvbVNldHRpbmdzKFxyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c2VzXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdFwiW0RhdGFmbG93T3JjaGVzdHJhdG9yXSBTeW5jZWQgRmlsZVNvdXJjZSBzdGF0dXMgbWFwcGluZyBmcm9tIHNldHRpbmdzXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0XCJbRGF0YWZsb3dPcmNoZXN0cmF0b3JdIEZhaWxlZCB0byBzeW5jIEZpbGVTb3VyY2Ugc3RhdHVzIG1hcHBpbmcgb24gaW5pdFwiLFxyXG5cdFx0XHRcdFx0ZVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEluaXRpYWxpemUgdGhlIG9yY2hlc3RyYXRvciAobG9hZCBwZXJzaXN0ZWQgZGF0YSlcclxuXHQgKi9cclxuXHRhc3luYyBpbml0aWFsaXplKCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Y29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuXHRcdGNvbnNvbGUubG9nKFwiW0RhdGFmbG93T3JjaGVzdHJhdG9yXSBTdGFydGluZyBpbml0aWFsaXphdGlvbi4uLlwiKTtcclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBJbml0aWFsaXplIFF1ZXJ5QVBJIGFuZCBSZXBvc2l0b3J5XHJcblx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFwiW0RhdGFmbG93T3JjaGVzdHJhdG9yXSBJbml0aWFsaXppbmcgUXVlcnlBUEkgYW5kIFJlcG9zaXRvcnkuLi5cIlxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gSW5pdGlhbGl6ZSBvciBzeW5jIEZpbGVGaWx0ZXJNYW5hZ2VyIGZyb20gc2V0dGluZ3MgKGRvIG5vdCByZWNyZWF0ZSBpZiBhbHJlYWR5IGV4aXN0cylcclxuXHRcdFx0Y29uc3QgZmZTZXR0aW5ncyA9IHRoaXMucGx1Z2luLnNldHRpbmdzPy5maWxlRmlsdGVyO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcIltEYXRhZmxvd09yY2hlc3RyYXRvcl0gSW5pdGlhbGl6ZSgpOiBGaWxlRmlsdGVyIHNldHRpbmdzOlwiLFxyXG5cdFx0XHRcdEpTT04uc3RyaW5naWZ5KGZmU2V0dGluZ3MsIG51bGwsIDIpXHJcblx0XHRcdCk7XHJcblx0XHRcdGlmIChmZlNldHRpbmdzKSB7XHJcblx0XHRcdFx0aWYgKCF0aGlzLmZpbGVGaWx0ZXJNYW5hZ2VyKSB7XHJcblx0XHRcdFx0XHR0aGlzLmZpbGVGaWx0ZXJNYW5hZ2VyID0gbmV3IEZpbGVGaWx0ZXJNYW5hZ2VyKGZmU2V0dGluZ3MpO1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcdFwiW0RhdGFmbG93T3JjaGVzdHJhdG9yXSBJbml0aWFsaXplKCk6IENyZWF0ZWQgRmlsZUZpbHRlck1hbmFnZXIgd2l0aCBzdGF0czpcIixcclxuXHRcdFx0XHRcdFx0dGhpcy5maWxlRmlsdGVyTWFuYWdlci5nZXRTdGF0cygpXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHR0aGlzLmZpbGVGaWx0ZXJNYW5hZ2VyLnVwZGF0ZUNvbmZpZyhmZlNldHRpbmdzKTtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRcIltEYXRhZmxvd09yY2hlc3RyYXRvcl0gSW5pdGlhbGl6ZSgpOiBVcGRhdGVkIEZpbGVGaWx0ZXJNYW5hZ2VyIGNvbmZpZzsgc3RhdHM6XCIsXHJcblx0XHRcdFx0XHRcdHRoaXMuZmlsZUZpbHRlck1hbmFnZXIuZ2V0U3RhdHMoKVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gUHJvdmlkZSB0byByZXBvc2l0b3J5J3MgaW5kZXhlciBmb3IgaW5saW5lIGZpbHRlcmluZ1xyXG5cdFx0XHRcdCh0aGlzLnJlcG9zaXRvcnkgYXMgYW55KS5zZXRGaWxlRmlsdGVyTWFuYWdlcj8uKFxyXG5cdFx0XHRcdFx0dGhpcy5maWxlRmlsdGVyTWFuYWdlclxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcIltEYXRhZmxvd09yY2hlc3RyYXRvcl0gSW5pdGlhbGl6ZSgpOiBQcm92aWRlZCBGaWxlRmlsdGVyTWFuYWdlciB0byByZXBvc2l0b3J5IGluZGV4ZXJcIlxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcIltEYXRhZmxvd09yY2hlc3RyYXRvcl0gSW5pdGlhbGl6ZSgpOiBObyBGaWxlRmlsdGVyIHNldHRpbmdzXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGF3YWl0IHRoaXMucXVlcnlBUEkuaW5pdGlhbGl6ZSgpO1xyXG5cclxuXHRcdFx0Ly8gTG9hZCBwZXJzaXN0ZWQgc3VwcHJlc3NlZCBmaWxlIHNldHMgZm9yIGNyb3NzLXJlc3RhcnQgcmVzdG9yZVxyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdGNvbnN0IHN1cElubGluZSA9IGF3YWl0IHRoaXMuc3RvcmFnZS5sb2FkTWV0YTxzdHJpbmdbXT4oXHJcblx0XHRcdFx0XHRcImZpbHRlcjpzdXBwcmVzc2VkSW5saW5lXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGlmIChBcnJheS5pc0FycmF5KHN1cElubGluZSkpXHJcblx0XHRcdFx0XHR0aGlzLnN1cHByZXNzZWRJbmxpbmUgPSBuZXcgU2V0KHN1cElubGluZSk7XHJcblx0XHRcdFx0Y29uc3Qgc3VwRmlsZXMgPSBhd2FpdCB0aGlzLnN0b3JhZ2UubG9hZE1ldGE8c3RyaW5nW10+KFxyXG5cdFx0XHRcdFx0XCJmaWx0ZXI6c3VwcHJlc3NlZEZpbGVUYXNrc1wiXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRpZiAoQXJyYXkuaXNBcnJheShzdXBGaWxlcykpXHJcblx0XHRcdFx0XHR0aGlzLnN1cHByZXNzZWRGaWxlVGFza3MgPSBuZXcgU2V0KHN1cEZpbGVzKTtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcIltEYXRhZmxvd09yY2hlc3RyYXRvcl0gTG9hZGVkIHN1cHByZXNzZWQgc2V0c1wiLCB7XHJcblx0XHRcdFx0XHRpbmxpbmU6IHRoaXMuc3VwcHJlc3NlZElubGluZS5zaXplLFxyXG5cdFx0XHRcdFx0ZmlsZTogdGhpcy5zdXBwcmVzc2VkRmlsZVRhc2tzLnNpemUsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRcIltEYXRhZmxvd09yY2hlc3RyYXRvcl0gRmFpbGVkIGxvYWRpbmcgc3VwcHJlc3NlZCBzZXRzXCIsXHJcblx0XHRcdFx0XHRlXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gRW5zdXJlIGNhY2hlIGlzIHBvcHVsYXRlZCBmb3Igc3luY2hyb25vdXMgYWNjZXNzXHJcblx0XHRcdGF3YWl0IHRoaXMucXVlcnlBUEkuZW5zdXJlQ2FjaGUoKTtcclxuXHJcblx0XHRcdC8vIENoZWNrIGlmIHdlIGhhdmUgY2FjaGVkIGRhdGFcclxuXHRcdFx0Y29uc3QgdGFza0NvdW50ID0gKGF3YWl0IHRoaXMucXVlcnlBUEkuZ2V0QWxsVGFza3MoKSkubGVuZ3RoO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRgW0RhdGFmbG93T3JjaGVzdHJhdG9yXSBGb3VuZCAke3Rhc2tDb3VudH0gY2FjaGVkIHRhc2tzYFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0aWYgKHRhc2tDb3VudCA9PT0gMCkge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XCJbRGF0YWZsb3dPcmNoZXN0cmF0b3JdIE5vIGNhY2hlZCB0YXNrcyBmb3VuZCwgcGVyZm9ybWluZyBpbml0aWFsIHNjYW4uLi5cIlxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdC8vIEdldCBhbGwgbWFya2Rvd24gYW5kIGNhbnZhcyBmaWxlc1xyXG5cdFx0XHRcdGNvbnN0IG1kRmlsZXMgPSB0aGlzLnZhdWx0LmdldE1hcmtkb3duRmlsZXMoKTtcclxuXHRcdFx0XHRjb25zdCBjYW52YXNGaWxlcyA9IHRoaXMudmF1bHRcclxuXHRcdFx0XHRcdC5nZXRGaWxlcygpXHJcblx0XHRcdFx0XHQuZmlsdGVyKChmKSA9PiBmLmV4dGVuc2lvbiA9PT0gXCJjYW52YXNcIik7XHJcblx0XHRcdFx0Y29uc3QgYWxsRmlsZXMgPSBbLi4ubWRGaWxlcywgLi4uY2FudmFzRmlsZXNdO1xyXG5cclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdGBbRGF0YWZsb3dPcmNoZXN0cmF0b3JdIEZvdW5kICR7YWxsRmlsZXMubGVuZ3RofSBmaWxlcyB0byBwcm9jZXNzYFxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdC8vIFByb2Nlc3MgaW4gYmF0Y2hlcyBmb3IgcGVyZm9ybWFuY2VcclxuXHRcdFx0XHRjb25zdCBCQVRDSF9TSVpFID0gNTA7XHJcblx0XHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBhbGxGaWxlcy5sZW5ndGg7IGkgKz0gQkFUQ0hfU0laRSkge1xyXG5cdFx0XHRcdFx0Y29uc3QgYmF0Y2ggPSBhbGxGaWxlcy5zbGljZShpLCBpICsgQkFUQ0hfU0laRSk7XHJcblx0XHRcdFx0XHRhd2FpdCB0aGlzLnByb2Nlc3NCYXRjaChiYXRjaCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBQZXJzaXN0IHRoZSBpbml0aWFsIGluZGV4XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcIltEYXRhZmxvd09yY2hlc3RyYXRvcl0gUGVyc2lzdGluZyBpbml0aWFsIGluZGV4Li4uXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGF3YWl0IHRoaXMucmVwb3NpdG9yeS5wZXJzaXN0KCk7XHJcblxyXG5cdFx0XHRcdGNvbnN0IGZpbmFsVGFza0NvdW50ID0gKGF3YWl0IHRoaXMucXVlcnlBUEkuZ2V0QWxsVGFza3MoKSlcclxuXHRcdFx0XHRcdC5sZW5ndGg7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRgW0RhdGFmbG93T3JjaGVzdHJhdG9yXSBJbml0aWFsIHNjYW4gY29tcGxldGUsIGluZGV4ZWQgJHtmaW5hbFRhc2tDb3VudH0gdGFza3NgXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdFwiW0RhdGFmbG93T3JjaGVzdHJhdG9yXSBVc2luZyBjYWNoZWQgdGFza3MsIHNraXBwaW5nIGluaXRpYWwgc2NhblwiXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSW5pdGlhbGl6ZSBPYnNpZGlhblNvdXJjZSB0byBzdGFydCBsaXN0ZW5pbmcgZm9yIGV2ZW50c1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcIltEYXRhZmxvd09yY2hlc3RyYXRvcl0gSW5pdGlhbGl6aW5nIE9ic2lkaWFuU291cmNlLi4uXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0dGhpcy5vYnNpZGlhblNvdXJjZS5vbmxvYWQoKTtcclxuXHJcblx0XHRcdC8vIEluaXRpYWxpemUgSWNzU291cmNlIHRvIHN0YXJ0IGxpc3RlbmluZyBmb3IgY2FsZW5kYXIgZXZlbnRzXHJcblx0XHRcdGNvbnNvbGUubG9nKFwiW0RhdGFmbG93T3JjaGVzdHJhdG9yXSBJbml0aWFsaXppbmcgSWNzU291cmNlLi4uXCIpO1xyXG5cdFx0XHR0aGlzLmljc1NvdXJjZS5pbml0aWFsaXplKCk7XHJcblxyXG5cdFx0XHQvLyBJbml0aWFsaXplIEZpbGVTb3VyY2UgdG8gc3RhcnQgZmlsZSByZWNvZ25pdGlvblxyXG5cdFx0XHRpZiAodGhpcy5maWxlU291cmNlKSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcIltEYXRhZmxvd09yY2hlc3RyYXRvcl0gSW5pdGlhbGl6aW5nIEZpbGVTb3VyY2UuLi5cIlxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0dGhpcy5maWxlU291cmNlLmluaXRpYWxpemUoKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gU3Vic2NyaWJlIHRvIGZpbGUgdXBkYXRlIGV2ZW50cyBmcm9tIE9ic2lkaWFuU291cmNlIGFuZCBJQ1MgZXZlbnRzXHJcblx0XHRcdGNvbnNvbGUubG9nKFwiW0RhdGFmbG93T3JjaGVzdHJhdG9yXSBTdWJzY3JpYmluZyB0byBldmVudHMuLi5cIik7XHJcblx0XHRcdHRoaXMuc3Vic2NyaWJlVG9FdmVudHMoKTtcclxuXHJcblx0XHRcdC8vIEVtaXQgaW5pdGlhbCByZWFkeSBldmVudFxyXG5cdFx0XHRlbWl0KHRoaXMuYXBwLCBFdmVudHMuQ0FDSEVfUkVBRFksIHtcclxuXHRcdFx0XHRpbml0aWFsOiB0cnVlLFxyXG5cdFx0XHRcdHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcclxuXHRcdFx0XHRzZXE6IFNlcS5uZXh0KCksXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgZWxhcHNlZCA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcblx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdGBbRGF0YWZsb3dPcmNoZXN0cmF0b3JdIEluaXRpYWxpemF0aW9uIGNvbXBsZXRlICh0b29rICR7ZWxhcHNlZH1tcylgXHJcblx0XHRcdCk7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFxyXG5cdFx0XHRcdFwiW0RhdGFmbG93T3JjaGVzdHJhdG9yXSBJbml0aWFsaXphdGlvbiBmYWlsZWQ6XCIsXHJcblx0XHRcdFx0ZXJyb3JcclxuXHRcdFx0KTtcclxuXHRcdFx0dGhyb3cgZXJyb3I7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTdWJzY3JpYmUgdG8gZXZlbnRzIGZyb20gT2JzaWRpYW5Tb3VyY2UsIEljc1NvdXJjZSBhbmQgV3JpdGVBUElcclxuXHQgKi9cclxuXHRwcml2YXRlIHN1YnNjcmliZVRvRXZlbnRzKCk6IHZvaWQge1xyXG5cdFx0Ly8gTGlzdGVuIGZvciBJQ1MgZXZlbnRzIHVwZGF0ZXNcclxuXHRcdHRoaXMuZXZlbnRSZWZzLnB1c2goXHJcblx0XHRcdG9uKHRoaXMuYXBwLCBFdmVudHMuSUNTX0VWRU5UU19VUERBVEVELCBhc3luYyAocGF5bG9hZDogYW55KSA9PiB7XHJcblx0XHRcdFx0Y29uc3Qge2V2ZW50cywgc2VxfSA9IHBheWxvYWQ7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRgW0RhdGFmbG93T3JjaGVzdHJhdG9yXSBJQ1NfRVZFTlRTX1VQREFURUQ6ICR7XHJcblx0XHRcdFx0XHRcdGV2ZW50cz8ubGVuZ3RoIHx8IDBcclxuXHRcdFx0XHRcdH0gZXZlbnRzYFxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdC8vIFVwZGF0ZSByZXBvc2l0b3J5IHdpdGggSUNTIGV2ZW50c1xyXG5cdFx0XHRcdGlmIChldmVudHMpIHtcclxuXHRcdFx0XHRcdGF3YWl0IHRoaXMucmVwb3NpdG9yeS51cGRhdGVJY3NFdmVudHMoZXZlbnRzLCBzZXEpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSlcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gTGlzdGVuIGZvciBmaWxlIHVwZGF0ZXMgZnJvbSBPYnNpZGlhblNvdXJjZVxyXG5cdFx0dGhpcy5ldmVudFJlZnMucHVzaChcclxuXHRcdFx0b24odGhpcy5hcHAsIEV2ZW50cy5GSUxFX1VQREFURUQsIGFzeW5jIChwYXlsb2FkOiBhbnkpID0+IHtcclxuXHRcdFx0XHRjb25zdCB7cGF0aCwgcmVhc29ufSA9IHBheWxvYWQ7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRgW0RhdGFmbG93T3JjaGVzdHJhdG9yXSBGSUxFX1VQREFURUQgZXZlbnQ6ICR7cGF0aH0gKCR7cmVhc29ufSlgXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0aWYgKHJlYXNvbiA9PT0gXCJkZWxldGVcIikge1xyXG5cdFx0XHRcdFx0Ly8gUmVtb3ZlIGZpbGUgZnJvbSBpbmRleFxyXG5cdFx0XHRcdFx0YXdhaXQgdGhpcy5yZXBvc2l0b3J5LnJlbW92ZUZpbGUocGF0aCk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdC8vIFByb2Nlc3MgZmlsZSB1cGRhdGUgKGNyZWF0ZSwgbW9kaWZ5LCByZW5hbWUsIGZyb250bWF0dGVyKVxyXG5cdFx0XHRcdFx0Y29uc3QgZmlsZSA9IHRoaXMudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFxyXG5cdFx0XHRcdFx0XHRwYXRoXHJcblx0XHRcdFx0XHQpIGFzIFRGaWxlO1xyXG5cdFx0XHRcdFx0aWYgKGZpbGUpIHtcclxuXHRcdFx0XHRcdFx0YXdhaXQgdGhpcy5wcm9jZXNzRmlsZShmaWxlKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIExpc3RlbiBmb3IgYmF0Y2ggdXBkYXRlcyBmcm9tIFJlcG9zaXRvcnkgb25seVxyXG5cdFx0Ly8gT2JzaWRpYW5Tb3VyY2UgdXNlcyBGSUxFX1VQREFURUQgZXZlbnRzIGluc3RlYWRcclxuXHRcdHRoaXMuZXZlbnRSZWZzLnB1c2goXHJcblx0XHRcdG9uKHRoaXMuYXBwLCBFdmVudHMuVEFTS19DQUNIRV9VUERBVEVELCBhc3luYyAocGF5bG9hZDogYW55KSA9PiB7XHJcblx0XHRcdFx0Y29uc3Qge2NoYW5nZWRGaWxlcywgc291cmNlU2VxfSA9IHBheWxvYWQ7XHJcblxyXG5cdFx0XHRcdC8vIFNraXAgaWYgdGhpcyBpcyBvdXIgb3duIGV2ZW50IChhdm9pZCBpbmZpbml0ZSBsb29wKVxyXG5cdFx0XHRcdC8vIENoZWNrIHNvdXJjZVNlcSB0byBpZGVudGlmeSBvcmlnaW4gZnJvbSBvdXIgb3duIHByb2Nlc3NpbmdcclxuXHRcdFx0XHRpZiAoc291cmNlU2VxICYmIHNvdXJjZVNlcSA9PT0gdGhpcy5sYXN0UHJvY2Vzc2VkU2VxKSB7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBTa2lwIGlmIG5vIHNvdXJjZVNlcSAobGlrZWx5IGZyb20gT2JzaWRpYW5Tb3VyY2UgLSBkZXByZWNhdGVkIHBhdGgpXHJcblx0XHRcdFx0aWYgKCFzb3VyY2VTZXEpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRgW0RhdGFmbG93T3JjaGVzdHJhdG9yXSBJZ25vcmluZyBUQVNLX0NBQ0hFX1VQREFURUQgd2l0aG91dCBzb3VyY2VTZXFgXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0aWYgKGNoYW5nZWRGaWxlcyAmJiBBcnJheS5pc0FycmF5KGNoYW5nZWRGaWxlcykpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRgW0RhdGFmbG93T3JjaGVzdHJhdG9yXSBCYXRjaCB1cGRhdGUgZm9yICR7Y2hhbmdlZEZpbGVzLmxlbmd0aH0gZmlsZXNgXHJcblx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdC8vIFByb2Nlc3MgZWFjaCBmaWxlXHJcblx0XHRcdFx0XHRmb3IgKGNvbnN0IGZpbGVQYXRoIG9mIGNoYW5nZWRGaWxlcykge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBmaWxlID0gdGhpcy52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXHJcblx0XHRcdFx0XHRcdFx0ZmlsZVBhdGhcclxuXHRcdFx0XHRcdFx0KSBhcyBURmlsZTtcclxuXHRcdFx0XHRcdFx0aWYgKGZpbGUpIHtcclxuXHRcdFx0XHRcdFx0XHRhd2FpdCB0aGlzLnByb2Nlc3NGaWxlKGZpbGUpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBMaXN0ZW4gZm9yIFdyaXRlQVBJIGNvbXBsZXRpb24gZXZlbnRzIHRvIHRyaWdnZXIgcmUtcHJvY2Vzc2luZ1xyXG5cdFx0dGhpcy5ldmVudFJlZnMucHVzaChcclxuXHRcdFx0b24oXHJcblx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0RXZlbnRzLldSSVRFX09QRVJBVElPTl9DT01QTEVURSxcclxuXHRcdFx0XHRhc3luYyAocGF5bG9hZDogYW55KSA9PiB7XHJcblx0XHRcdFx0XHRjb25zdCB7cGF0aCwgdGFza0lkfSA9IHBheWxvYWQ7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdFx0YFtEYXRhZmxvd09yY2hlc3RyYXRvcl0gV1JJVEVfT1BFUkFUSU9OX0NPTVBMRVRFOiAke3BhdGh9LCB0YXNrSWQ6ICR7dGFza0lkfWBcclxuXHRcdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gSWYgd2UgaGF2ZSBhIHRhc2tJZCwgaXQgbWVhbnMgYSBzcGVjaWZpYyB0YXNrIHdhcyB1cGRhdGVkXHJcblx0XHRcdFx0XHQvLyBXZSdsbCBoYW5kbGUgdGhpcyB0aHJvdWdoIFRBU0tfVVBEQVRFRCBldmVudCBpbnN0ZWFkXHJcblx0XHRcdFx0XHRpZiAoIXRhc2tJZCkge1xyXG5cdFx0XHRcdFx0XHQvLyBObyBzcGVjaWZpYyB0YXNrLCBwcm9jZXNzIHRoZSBlbnRpcmUgZmlsZVxyXG5cdFx0XHRcdFx0XHRjb25zdCBmaWxlID0gdGhpcy52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXHJcblx0XHRcdFx0XHRcdFx0cGF0aFxyXG5cdFx0XHRcdFx0XHQpIGFzIFRGaWxlO1xyXG5cdFx0XHRcdFx0XHRpZiAoZmlsZSkge1xyXG5cdFx0XHRcdFx0XHRcdC8vIFByb2Nlc3MgaW1tZWRpYXRlbHkgd2l0aG91dCBkZWJvdW5jZSBmb3IgV3JpdGVBUEkgb3BlcmF0aW9uc1xyXG5cdFx0XHRcdFx0XHRcdC8vIFBhc3MgdHJ1ZSB0byBmb3JjZSBjYWNoZSBpbnZhbGlkYXRpb25cclxuXHRcdFx0XHRcdFx0XHRhd2FpdCB0aGlzLnByb2Nlc3NGaWxlSW1tZWRpYXRlKGZpbGUsIHRydWUpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHQpXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIExpc3RlbiBmb3IgZGlyZWN0IHRhc2sgdXBkYXRlcyAoZnJvbSBpbmxpbmUgZWRpdGluZylcclxuXHRcdHRoaXMuZXZlbnRSZWZzLnB1c2goXHJcblx0XHRcdG9uKHRoaXMuYXBwLCBFdmVudHMuVEFTS19VUERBVEVELCBhc3luYyAocGF5bG9hZDogYW55KSA9PiB7XHJcblx0XHRcdFx0Y29uc3Qge3Rhc2t9ID0gcGF5bG9hZDtcclxuXHRcdFx0XHRpZiAodGFzaykge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcdGBbRGF0YWZsb3dPcmNoZXN0cmF0b3JdIFRBU0tfVVBEQVRFRDogJHt0YXNrLmlkfSBpbiAke3Rhc2suZmlsZVBhdGh9YFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdC8vIFVwZGF0ZSB0aGUgc2luZ2xlIHRhc2sgZGlyZWN0bHkgaW4gdGhlIHJlcG9zaXRvcnlcclxuXHRcdFx0XHRcdGF3YWl0IHRoaXMucmVwb3NpdG9yeS51cGRhdGVTaW5nbGVUYXNrKHRhc2spO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSlcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gTGlzdGVuIGZvciB0YXNrIGRlbGV0aW9uIGV2ZW50c1xyXG5cdFx0dGhpcy5ldmVudFJlZnMucHVzaChcclxuXHRcdFx0b24odGhpcy5hcHAsIEV2ZW50cy5UQVNLX0RFTEVURUQsIGFzeW5jIChwYXlsb2FkOiBhbnkpID0+IHtcclxuXHRcdFx0XHRjb25zdCB7dGFza0lkLCBmaWxlUGF0aCwgZGVsZXRlZFRhc2tJZHMsIG1vZGV9ID0gcGF5bG9hZDtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdGBbRGF0YWZsb3dPcmNoZXN0cmF0b3JdIFRBU0tfREVMRVRFRDogJHt0YXNrSWR9IGluICR7ZmlsZVBhdGh9LCBtb2RlOiAke21vZGV9LCBkZWxldGVkOiAke1xyXG5cdFx0XHRcdFx0XHRkZWxldGVkVGFza0lkcz8ubGVuZ3RoIHx8IDFcclxuXHRcdFx0XHRcdH0gdGFza3NgXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0Ly8gUmVtb3ZlIGRlbGV0ZWQgdGFza3MgZnJvbSByZXBvc2l0b3J5XHJcblx0XHRcdFx0aWYgKGRlbGV0ZWRUYXNrSWRzICYmIGRlbGV0ZWRUYXNrSWRzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRcdGZvciAoY29uc3QgaWQgb2YgZGVsZXRlZFRhc2tJZHMpIHtcclxuXHRcdFx0XHRcdFx0YXdhaXQgdGhpcy5yZXBvc2l0b3J5LnJlbW92ZVRhc2tCeUlkKGlkKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIFByb2Nlc3MgdGhlIGZpbGUgdG8gdXBkYXRlIHJlbWFpbmluZyB0YXNrcycgbGluZSBudW1iZXJzXHJcblx0XHRcdFx0Y29uc3QgZmlsZSA9IHRoaXMudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFxyXG5cdFx0XHRcdFx0ZmlsZVBhdGhcclxuXHRcdFx0XHQpIGFzIFRGaWxlO1xyXG5cdFx0XHRcdGlmIChmaWxlKSB7XHJcblx0XHRcdFx0XHRhd2FpdCB0aGlzLnByb2Nlc3NGaWxlSW1tZWRpYXRlKGZpbGUsIHRydWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSlcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gTGlzdGVuIGZvciBGaWxlU291cmNlIGZpbGUgdGFzayB1cGRhdGVzXHJcblx0XHRpZiAodGhpcy5maWxlU291cmNlKSB7XHJcblx0XHRcdHRoaXMuZXZlbnRSZWZzLnB1c2goXHJcblx0XHRcdFx0b24odGhpcy5hcHAsIEV2ZW50cy5GSUxFX1RBU0tfVVBEQVRFRCwgYXN5bmMgKHBheWxvYWQ6IGFueSkgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc3Qge3Rhc2t9ID0gcGF5bG9hZDtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRgW0RhdGFmbG93T3JjaGVzdHJhdG9yXSBGSUxFX1RBU0tfVVBEQVRFRDogJHt0YXNrPy5maWxlUGF0aH1gXHJcblx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdGlmICh0YXNrKSB7XHJcblx0XHRcdFx0XHRcdGF3YWl0IHRoaXMucmVwb3NpdG9yeS51cGRhdGVGaWxlVGFzayh0YXNrKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0dGhpcy5ldmVudFJlZnMucHVzaChcclxuXHRcdFx0XHRvbih0aGlzLmFwcCwgRXZlbnRzLkZJTEVfVEFTS19SRU1PVkVELCBhc3luYyAocGF5bG9hZDogYW55KSA9PiB7XHJcblx0XHRcdFx0XHRjb25zdCB7ZmlsZVBhdGh9ID0gcGF5bG9hZDtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRgW0RhdGFmbG93T3JjaGVzdHJhdG9yXSBGSUxFX1RBU0tfUkVNT1ZFRDogJHtmaWxlUGF0aH1gXHJcblx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdGlmIChmaWxlUGF0aCkge1xyXG5cdFx0XHRcdFx0XHRhd2FpdCB0aGlzLnJlcG9zaXRvcnkucmVtb3ZlRmlsZVRhc2soZmlsZVBhdGgpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBQcm9jZXNzIGEgZmlsZSBjaGFuZ2UgKHBhcnNlLCBhdWdtZW50LCBpbmRleClcclxuXHQgKi9cclxuXHRhc3luYyBwcm9jZXNzRmlsZShmaWxlOiBURmlsZSk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Y29uc3QgZmlsZVBhdGggPSBmaWxlLnBhdGg7XHJcblxyXG5cdFx0Ly8gRGVib3VuY2UgcmFwaWQgY2hhbmdlc1xyXG5cdFx0aWYgKHRoaXMucHJvY2Vzc2luZ1F1ZXVlLmhhcyhmaWxlUGF0aCkpIHtcclxuXHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMucHJvY2Vzc2luZ1F1ZXVlLmdldChmaWxlUGF0aCkpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHR0aGlzLnByb2Nlc3NpbmdRdWV1ZS5kZWxldGUoZmlsZVBhdGgpO1xyXG5cdFx0XHRhd2FpdCB0aGlzLnByb2Nlc3NGaWxlSW1tZWRpYXRlKGZpbGUsIGZhbHNlKTtcclxuXHRcdH0sIHRoaXMuREVCT1VOQ0VfREVMQVkpO1xyXG5cclxuXHRcdHRoaXMucHJvY2Vzc2luZ1F1ZXVlLnNldChmaWxlUGF0aCwgdGltZW91dElkKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFByb2Nlc3MgYSBmaWxlIGltbWVkaWF0ZWx5IHdpdGhvdXQgZGVib3VuY2luZ1xyXG5cdCAqIEBwYXJhbSBmaWxlIFRoZSBmaWxlIHRvIHByb2Nlc3NcclxuXHQgKiBAcGFyYW0gZm9yY2VJbnZhbGlkYXRlIEZvcmNlIGNhY2hlIGludmFsaWRhdGlvbiAoZm9yIFdyaXRlQVBJIG9wZXJhdGlvbnMpXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhc3luYyBwcm9jZXNzRmlsZUltbWVkaWF0ZShcclxuXHRcdGZpbGU6IFRGaWxlLFxyXG5cdFx0Zm9yY2VJbnZhbGlkYXRlOiBib29sZWFuID0gZmFsc2VcclxuXHQpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGNvbnN0IGZpbGVQYXRoID0gZmlsZS5wYXRoO1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdC8vIFN0ZXAgMTogR2V0IGZpbGUgbW9kaWZpY2F0aW9uIHRpbWVcclxuXHRcdFx0Y29uc3QgZmlsZVN0YXQgPSBhd2FpdCB0aGlzLnZhdWx0LmFkYXB0ZXIuc3RhdChmaWxlUGF0aCk7XHJcblx0XHRcdGNvbnN0IG10aW1lID0gZmlsZVN0YXQ/Lm10aW1lO1xyXG5cclxuXHRcdFx0Ly8gU3RlcCAyOiBDaGVjayBjYWNoZSBhbmQgcGFyc2UgaWYgbmVlZGVkXHJcblx0XHRcdGNvbnN0IHJhd0NhY2hlZCA9IGF3YWl0IHRoaXMuc3RvcmFnZS5sb2FkUmF3KGZpbGVQYXRoKTtcclxuXHRcdFx0Y29uc3QgYXVnbWVudGVkQ2FjaGVkID0gYXdhaXQgdGhpcy5zdG9yYWdlLmxvYWRBdWdtZW50ZWQoZmlsZVBhdGgpO1xyXG5cdFx0XHRjb25zdCBmaWxlQ29udGVudCA9IGF3YWl0IHRoaXMudmF1bHQuY2FjaGVkUmVhZChmaWxlKTtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJbRGF0YWZsb3dPcmNoZXN0cmF0b3JdIHByb2Nlc3NGaWxlSW1tZWRpYXRlIHN0YXJ0XCIsIHtcclxuXHRcdFx0XHRmaWxlUGF0aCxcclxuXHRcdFx0XHRmb3JjZUludmFsaWRhdGUsXHJcblx0XHRcdFx0bXRpbWUsXHJcblx0XHRcdFx0aGFzUmF3Q2FjaGVkOiAhIXJhd0NhY2hlZCxcclxuXHRcdFx0XHRoYXNBdWdtZW50ZWRDYWNoZWQ6ICEhYXVnbWVudGVkQ2FjaGVkLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGxldCBhdWdtZW50ZWRUYXNrczogVGFza1tdO1xyXG5cdFx0XHRsZXQgbmVlZHNQcm9jZXNzaW5nID0gZmFsc2U7XHJcblxyXG5cdFx0XHQvLyBDaGVjayBpZiB3ZSBjYW4gdXNlIGZ1bGx5IGNhY2hlZCBhdWdtZW50ZWQgdGFza3NcclxuXHRcdFx0Ly8gRm9yY2UgaW52YWxpZGF0aW9uIGZvciBXcml0ZUFQSSBvcGVyYXRpb25zIHRvIGVuc3VyZSBmcmVzaCBwYXJzaW5nXHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHQhZm9yY2VJbnZhbGlkYXRlICYmXHJcblx0XHRcdFx0cmF3Q2FjaGVkICYmXHJcblx0XHRcdFx0YXVnbWVudGVkQ2FjaGVkICYmXHJcblx0XHRcdFx0dGhpcy5zdG9yYWdlLmlzUmF3VmFsaWQoZmlsZVBhdGgsIHJhd0NhY2hlZCwgZmlsZUNvbnRlbnQsIG10aW1lKVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHQvLyBVc2UgY2FjaGVkIGF1Z21lbnRlZCB0YXNrcyAtIGZpbGUgaGFzbid0IGNoYW5nZWQgYW5kIHdlIGhhdmUgYXVnbWVudGVkIGRhdGFcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdGBbRGF0YWZsb3dPcmNoZXN0cmF0b3JdIFVzaW5nIGNhY2hlZCBhdWdtZW50ZWQgdGFza3MgZm9yICR7ZmlsZVBhdGh9IChtdGltZSBtYXRjaClgXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRhdWdtZW50ZWRUYXNrcyA9IGF1Z21lbnRlZENhY2hlZC5kYXRhO1xyXG5cdFx0XHRcdC8vIEFwcGx5IGlubGluZSBmaWx0ZXIgZXZlbiB3aGVuIHVzaW5nIGNhY2hlZCBhdWdtZW50ZWQgdGFza3NcclxuXHRcdFx0XHRjb25zdCBpbmNsdWRlSW5saW5lQ2FjaGVkID0gdGhpcy5maWxlRmlsdGVyTWFuYWdlclxyXG5cdFx0XHRcdFx0PyB0aGlzLmZpbGVGaWx0ZXJNYW5hZ2VyLnNob3VsZEluY2x1ZGVQYXRoKFxyXG5cdFx0XHRcdFx0XHRmaWxlUGF0aCxcclxuXHRcdFx0XHRcdFx0XCJpbmxpbmVcIlxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0OiB0cnVlO1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XCJbRGF0YWZsb3dPcmNoZXN0cmF0b3JdIElubGluZSBmaWx0ZXIgZGVjaXNpb24gKGNhY2hlZCBhdWdtZW50ZWQpXCIsXHJcblx0XHRcdFx0XHR7ZmlsZVBhdGgsIGluY2x1ZGVJbmxpbmU6IGluY2x1ZGVJbmxpbmVDYWNoZWR9XHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRpZiAoIWluY2x1ZGVJbmxpbmVDYWNoZWQpIHtcclxuXHRcdFx0XHRcdGF1Z21lbnRlZFRhc2tzID0gW107XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIE5lZWQgdG8gcGFyc2UgYW5kL29yIGF1Z21lbnRcclxuXHRcdFx0XHRuZWVkc1Byb2Nlc3NpbmcgPSB0cnVlO1xyXG5cclxuXHRcdFx0XHRsZXQgcmF3VGFza3M6IFRhc2tbXTtcclxuXHRcdFx0XHRsZXQgcHJvamVjdERhdGE6IGFueTsgLy8gVHlwZSB3aWxsIGJlIGluZmVycmVkIGZyb20gcHJvamVjdFJlc29sdmVyLmdldFxyXG5cclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHQhZm9yY2VJbnZhbGlkYXRlICYmXHJcblx0XHRcdFx0XHRyYXdDYWNoZWQgJiZcclxuXHRcdFx0XHRcdHRoaXMuc3RvcmFnZS5pc1Jhd1ZhbGlkKFxyXG5cdFx0XHRcdFx0XHRmaWxlUGF0aCxcclxuXHRcdFx0XHRcdFx0cmF3Q2FjaGVkLFxyXG5cdFx0XHRcdFx0XHRmaWxlQ29udGVudCxcclxuXHRcdFx0XHRcdFx0bXRpbWVcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdC8vIFVzZSBjYWNoZWQgcmF3IHRhc2tzIGJ1dCByZS1hdWdtZW50IChwcm9qZWN0IGRhdGEgbWlnaHQgaGF2ZSBjaGFuZ2VkKVxyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcdGBbRGF0YWZsb3dPcmNoZXN0cmF0b3JdIFJlLWF1Z21lbnRpbmcgY2FjaGVkIHJhdyB0YXNrcyBmb3IgJHtmaWxlUGF0aH1gXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0Y29uc3QgaW5jbHVkZUlubGluZVJlYXVnbWVudCA9IHRoaXMuZmlsZUZpbHRlck1hbmFnZXJcclxuXHRcdFx0XHRcdFx0PyB0aGlzLmZpbGVGaWx0ZXJNYW5hZ2VyLnNob3VsZEluY2x1ZGVQYXRoKFxyXG5cdFx0XHRcdFx0XHRcdGZpbGVQYXRoLFxyXG5cdFx0XHRcdFx0XHRcdFwiaW5saW5lXCJcclxuXHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHQ6IHRydWU7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdFx0XCJbRGF0YWZsb3dPcmNoZXN0cmF0b3JdIElubGluZSBmaWx0ZXIgZGVjaXNpb24gKHJlLWF1Z21lbnQgY2FjaGVkIHJhdylcIixcclxuXHRcdFx0XHRcdFx0e2ZpbGVQYXRoLCBpbmNsdWRlSW5saW5lOiBpbmNsdWRlSW5saW5lUmVhdWdtZW50fVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdHJhd1Rhc2tzID0gaW5jbHVkZUlubGluZVJlYXVnbWVudCA/IHJhd0NhY2hlZC5kYXRhIDogW107XHJcblx0XHRcdFx0XHRwcm9qZWN0RGF0YSA9IGF3YWl0IHRoaXMucHJvamVjdFJlc29sdmVyLmdldChmaWxlUGF0aCk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdC8vIFBhcnNlIHRoZSBmaWxlIGZyb20gc2NyYXRjaFxyXG5cdFx0XHRcdFx0aWYgKGZvcmNlSW52YWxpZGF0ZSkge1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdFx0XHRgW0RhdGFmbG93T3JjaGVzdHJhdG9yXSBQYXJzaW5nICR7ZmlsZVBhdGh9IChmb3JjZWQgaW52YWxpZGF0aW9uIGZyb20gV3JpdGVBUEkpYFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcdFx0YFtEYXRhZmxvd09yY2hlc3RyYXRvcl0gUGFyc2luZyAke2ZpbGVQYXRofSAoY2FjaGUgbWlzcyBvciBtdGltZSBtaXNtYXRjaClgXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gR2V0IHByb2plY3QgZGF0YSBmaXJzdCBmb3IgcGFyc2luZ1xyXG5cdFx0XHRcdFx0cHJvamVjdERhdGEgPSBhd2FpdCB0aGlzLnByb2plY3RSZXNvbHZlci5nZXQoZmlsZVBhdGgpO1xyXG5cclxuXHRcdFx0XHRcdC8vIFVwZGF0ZSB3b3JrZXIgc2V0dGluZ3MgZm9yIHNpbmdsZS1maWxlIHByb2Nlc3NpbmcgKG1pcnJvciBiYXRjaCBiZWhhdmlvcilcclxuXHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IHRhc2tXb3JrZXJNYW5hZ2VyID0gdGhpcy53b3JrZXJPcmNoZXN0cmF0b3JbXHJcblx0XHRcdFx0XHRcdFx0XCJ0YXNrV29ya2VyTWFuYWdlclwiXHJcblx0XHRcdFx0XHRcdFx0XSBhcyBUYXNrV29ya2VyTWFuYWdlciB8IHVuZGVmaW5lZDtcclxuXHRcdFx0XHRcdFx0aWYgKHRhc2tXb3JrZXJNYW5hZ2VyKSB7XHJcblx0XHRcdFx0XHRcdFx0dGFza1dvcmtlck1hbmFnZXIudXBkYXRlU2V0dGluZ3Moe1xyXG5cdFx0XHRcdFx0XHRcdFx0cHJlZmVyTWV0YWRhdGFGb3JtYXQ6XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnByZWZlck1ldGFkYXRhRm9ybWF0IHx8XHJcblx0XHRcdFx0XHRcdFx0XHRcdFwidGFza3NcIixcclxuXHRcdFx0XHRcdFx0XHRcdGN1c3RvbURhdGVGb3JtYXRzOlxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuY3VzdG9tRGF0ZUZvcm1hdHMsXHJcblx0XHRcdFx0XHRcdFx0XHRmaWxlTWV0YWRhdGFJbmhlcml0YW5jZTpcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzXHJcblx0XHRcdFx0XHRcdFx0XHRcdC5maWxlTWV0YWRhdGFJbmhlcml0YW5jZSxcclxuXHRcdFx0XHRcdFx0XHRcdGlnbm9yZUhlYWRpbmc6XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5pZ25vcmVIZWFkaW5nLFxyXG5cdFx0XHRcdFx0XHRcdFx0Zm9jdXNIZWFkaW5nOiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5mb2N1c0hlYWRpbmcsXHJcblx0XHRcdFx0XHRcdFx0XHQvLyBJbmNsdWRlIHRhZyBwcmVmaXhlcyBmb3IgY3VzdG9tIGRhdGF2aWV3IGZpZWxkIHN1cHBvcnRcclxuXHRcdFx0XHRcdFx0XHRcdHByb2plY3RUYWdQcmVmaXg6XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0VGFnUHJlZml4LFxyXG5cdFx0XHRcdFx0XHRcdFx0Y29udGV4dFRhZ1ByZWZpeDpcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbnRleHRUYWdQcmVmaXgsXHJcblx0XHRcdFx0XHRcdFx0XHRhcmVhVGFnUHJlZml4OlxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuYXJlYVRhZ1ByZWZpeCxcclxuXHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRcdFx0XCJbRGF0YWZsb3dPcmNoZXN0cmF0b3JdIEZhaWxlZCB0byB1cGRhdGUgd29ya2VyIHNldHRpbmdzIGZvciBzaW5nbGUtZmlsZSBwYXJzZTpcIixcclxuXHRcdFx0XHRcdFx0XHRlXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gQXBwbHkgaW5saW5lIGZpbHRlciBmb3IgcGFyc2UgcGF0aFxyXG5cdFx0XHRcdFx0Y29uc3QgaW5jbHVkZUlubGluZVBhcnNlID0gdGhpcy5maWxlRmlsdGVyTWFuYWdlclxyXG5cdFx0XHRcdFx0XHQ/IHRoaXMuZmlsZUZpbHRlck1hbmFnZXIuc2hvdWxkSW5jbHVkZVBhdGgoXHJcblx0XHRcdFx0XHRcdFx0ZmlsZVBhdGgsXHJcblx0XHRcdFx0XHRcdFx0XCJpbmxpbmVcIlxyXG5cdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdDogdHJ1ZTtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRcIltEYXRhZmxvd09yY2hlc3RyYXRvcl0gSW5saW5lIGZpbHRlciBkZWNpc2lvbiAocGFyc2UgcGF0aClcIixcclxuXHRcdFx0XHRcdFx0e2ZpbGVQYXRoLCBpbmNsdWRlSW5saW5lOiBpbmNsdWRlSW5saW5lUGFyc2V9XHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0aWYgKGluY2x1ZGVJbmxpbmVQYXJzZSkge1xyXG5cdFx0XHRcdFx0XHQvLyBQYXJzZSB0aGUgZmlsZSB1c2luZyB3b3JrZXJzIChzaW5nbGUtZmlsZSBwYXRoKVxyXG5cdFx0XHRcdFx0XHRyYXdUYXNrcyA9IGF3YWl0IHRoaXMud29ya2VyT3JjaGVzdHJhdG9yLnBhcnNlRmlsZVRhc2tzKFxyXG5cdFx0XHRcdFx0XHRcdGZpbGUsXHJcblx0XHRcdFx0XHRcdFx0XCJoaWdoXCJcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdHJhd1Rhc2tzID0gW107XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gU3RvcmUgcmF3IHRhc2tzIHdpdGggZmlsZSBjb250ZW50IGFuZCBtdGltZVxyXG5cdFx0XHRcdFx0YXdhaXQgdGhpcy5zdG9yYWdlLnN0b3JlUmF3KFxyXG5cdFx0XHRcdFx0XHRmaWxlUGF0aCxcclxuXHRcdFx0XHRcdFx0cmF3VGFza3MsXHJcblx0XHRcdFx0XHRcdGZpbGVDb250ZW50LFxyXG5cdFx0XHRcdFx0XHRtdGltZVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIFN0b3JlIHByb2plY3QgZGF0YVxyXG5cdFx0XHRcdGF3YWl0IHRoaXMuc3RvcmFnZS5zdG9yZVByb2plY3QoZmlsZVBhdGgsIHtcclxuXHRcdFx0XHRcdHRnUHJvamVjdDogcHJvamVjdERhdGEudGdQcm9qZWN0LFxyXG5cdFx0XHRcdFx0ZW5oYW5jZWRNZXRhZGF0YTogcHJvamVjdERhdGEuZW5oYW5jZWRNZXRhZGF0YSxcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gQXVnbWVudCB0YXNrcyB3aXRoIHByb2plY3QgYW5kIGZpbGUgbWV0YWRhdGFcclxuXHRcdFx0XHRjb25zdCBmaWxlTWV0YWRhdGEgPSB0aGlzLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpO1xyXG5cdFx0XHRcdGNvbnN0IGF1Z21lbnRDb250ZXh0OiBBdWdtZW50Q29udGV4dCA9IHtcclxuXHRcdFx0XHRcdGZpbGVQYXRoLFxyXG5cdFx0XHRcdFx0ZmlsZU1ldGE6IGZpbGVNZXRhZGF0YT8uZnJvbnRtYXR0ZXIgfHwge30sXHJcblx0XHRcdFx0XHRwcm9qZWN0TmFtZTogcHJvamVjdERhdGEudGdQcm9qZWN0Py5uYW1lLFxyXG5cdFx0XHRcdFx0cHJvamVjdE1ldGE6IHtcclxuXHRcdFx0XHRcdFx0Li4ucHJvamVjdERhdGEuZW5oYW5jZWRNZXRhZGF0YSxcclxuXHRcdFx0XHRcdFx0dGdQcm9qZWN0OiBwcm9qZWN0RGF0YS50Z1Byb2plY3QsIC8vIEluY2x1ZGUgdGdQcm9qZWN0IGluIHByb2plY3RNZXRhXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0dGFza3M6IHJhd1Rhc2tzLFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0YXVnbWVudGVkVGFza3MgPSBhd2FpdCB0aGlzLmF1Z21lbnRvci5tZXJnZShhdWdtZW50Q29udGV4dCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFN0ZXAgMzogVXBkYXRlIHJlcG9zaXRvcnkgKGluZGV4ICsgc3RvcmFnZSArIGV2ZW50cylcclxuXHRcdFx0Ly8gR2VuZXJhdGUgYSB1bmlxdWUgc2VxdWVuY2UgZm9yIHRoaXMgb3BlcmF0aW9uXHJcblx0XHRcdHRoaXMubGFzdFByb2Nlc3NlZFNlcSA9IFNlcS5uZXh0KCk7XHJcblxyXG5cdFx0XHQvLyBQYXNzIG91ciBzZXF1ZW5jZSB0byByZXBvc2l0b3J5IHRvIHRyYWNrIGV2ZW50IG9yaWdpblxyXG5cdFx0XHRhd2FpdCB0aGlzLnJlcG9zaXRvcnkudXBkYXRlRmlsZShcclxuXHRcdFx0XHRmaWxlUGF0aCxcclxuXHRcdFx0XHRhdWdtZW50ZWRUYXNrcyxcclxuXHRcdFx0XHR0aGlzLmxhc3RQcm9jZXNzZWRTZXFcclxuXHRcdFx0KTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoYEVycm9yIHByb2Nlc3NpbmcgZmlsZSAke2ZpbGVQYXRofTpgLCBlcnJvcik7XHJcblxyXG5cdFx0XHQvLyBFbWl0IGVycm9yIGV2ZW50XHJcblx0XHRcdGVtaXQodGhpcy5hcHAsIEV2ZW50cy5GSUxFX1VQREFURUQsIHtcclxuXHRcdFx0XHRwYXRoOiBmaWxlUGF0aCxcclxuXHRcdFx0XHRyZWFzb246IFwiZXJyb3JcIixcclxuXHRcdFx0XHRlcnJvcjogZXJyb3IubWVzc2FnZSxcclxuXHRcdFx0XHR0aW1lc3RhbXA6IERhdGUubm93KCksXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIHNldHRpbmdzIGFuZCBwcm9wYWdhdGUgdG8gY29tcG9uZW50c1xyXG5cdCAqL1xyXG5cdHVwZGF0ZVNldHRpbmdzKHNldHRpbmdzOiBhbnkpOiB2b2lkIHtcclxuXHRcdC8vIFVwZGF0ZSB3b3JrZXIgcHJvY2Vzc2luZyBzZXR0aW5nXHJcblx0XHRjb25zdCBlbmFibGVXb3JrZXJQcm9jZXNzaW5nID1cclxuXHRcdFx0c2V0dGluZ3M/LmZpbGVTb3VyY2U/LnBlcmZvcm1hbmNlPy5lbmFibGVXb3JrZXJQcm9jZXNzaW5nID8/XHJcblx0XHRcdHNldHRpbmdzPy5maWxlUGFyc2luZ0NvbmZpZz8uZW5hYmxlV29ya2VyUHJvY2Vzc2luZyA/P1xyXG5cdFx0XHR0cnVlO1xyXG5cclxuXHRcdGlmICh0aGlzLndvcmtlck9yY2hlc3RyYXRvcikge1xyXG5cdFx0XHR0aGlzLndvcmtlck9yY2hlc3RyYXRvci5zZXRXb3JrZXJQcm9jZXNzaW5nRW5hYmxlZChcclxuXHRcdFx0XHRlbmFibGVXb3JrZXJQcm9jZXNzaW5nXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVXBkYXRlIFByb2plY3RSZXNvbHZlciAvIFByb2plY3RDb25maWdNYW5hZ2VyIG9wdGlvbnMgZnJvbSBzZXR0aW5nc1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgcGMgPSBzZXR0aW5ncz8ucHJvamVjdENvbmZpZztcclxuXHRcdFx0aWYgKHBjKSB7XHJcblx0XHRcdFx0dGhpcy51cGRhdGVQcm9qZWN0T3B0aW9ucyh7XHJcblx0XHRcdFx0XHRjb25maWdGaWxlTmFtZTogcGM/LmNvbmZpZ0ZpbGU/LmZpbGVOYW1lIHx8IFwicHJvamVjdC5tZFwiLFxyXG5cdFx0XHRcdFx0c2VhcmNoUmVjdXJzaXZlbHk6XHJcblx0XHRcdFx0XHRcdHBjPy5jb25maWdGaWxlPy5zZWFyY2hSZWN1cnNpdmVseSA/PyB0cnVlLFxyXG5cdFx0XHRcdFx0bWV0YWRhdGFLZXk6IHBjPy5tZXRhZGF0YUNvbmZpZz8ubWV0YWRhdGFLZXkgfHwgXCJwcm9qZWN0XCIsXHJcblx0XHRcdFx0XHRwYXRoTWFwcGluZ3M6IHBjPy5wYXRoTWFwcGluZ3MgfHwgW10sXHJcblx0XHRcdFx0XHRtZXRhZGF0YU1hcHBpbmdzOiBwYz8ubWV0YWRhdGFNYXBwaW5ncyB8fCBbXSxcclxuXHRcdFx0XHRcdGRlZmF1bHRQcm9qZWN0TmFtaW5nOiBwYz8uZGVmYXVsdFByb2plY3ROYW1pbmcgfHwge1xyXG5cdFx0XHRcdFx0XHRzdHJhdGVneTogXCJmaWxlbmFtZVwiLFxyXG5cdFx0XHRcdFx0XHRzdHJpcEV4dGVuc2lvbjogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0ZW5oYW5jZWRQcm9qZWN0RW5hYmxlZDogcGM/LmVuYWJsZUVuaGFuY2VkUHJvamVjdCA/PyBmYWxzZSxcclxuXHRcdFx0XHRcdG1ldGFkYXRhQ29uZmlnRW5hYmxlZDogcGM/Lm1ldGFkYXRhQ29uZmlnPy5lbmFibGVkID8/IGZhbHNlLFxyXG5cdFx0XHRcdFx0Y29uZmlnRmlsZUVuYWJsZWQ6IHBjPy5jb25maWdGaWxlPy5lbmFibGVkID8/IGZhbHNlLFxyXG5cdFx0XHRcdFx0ZGV0ZWN0aW9uTWV0aG9kczpcclxuXHRcdFx0XHRcdFx0cGM/Lm1ldGFkYXRhQ29uZmlnPy5kZXRlY3Rpb25NZXRob2RzIHx8IFtdLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcIltEYXRhZmxvd09yY2hlc3RyYXRvcl0gRmFpbGVkIHRvIHVwZGF0ZSBwcm9qZWN0IGNvbmZpZyBvcHRpb25zIG9uIHNldHRpbmdzIHVwZGF0ZVwiLFxyXG5cdFx0XHRcdGVcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBVcGRhdGUgVGltZVBhcnNpbmdTZXJ2aWNlIGNvbmZpZ3VyYXRpb25cclxuXHRcdGlmIChzZXR0aW5ncy50aW1lUGFyc2luZyAmJiB0aGlzLnRpbWVQYXJzaW5nU2VydmljZSkge1xyXG5cdFx0XHR0aGlzLnRpbWVQYXJzaW5nU2VydmljZS51cGRhdGVDb25maWcoc2V0dGluZ3MudGltZVBhcnNpbmcpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFN5bmMgaW5oZXJpdGFuY2UgdG9nZ2xlIHRvIGF1Z21lbnRvciBzbyBpdCBjYW4gcmVzcGVjdCBkaXNhYmxpbmcgZmlsZSBmcm9udG1hdHRlciBpbmhlcml0YW5jZVxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc29sZS5kZWJ1ZyhcclxuXHRcdFx0XHRcIltEYXRhZmxvd09yY2hlc3RyYXRvcl1bdXBkYXRlU2V0dGluZ3NdIGZpbGVNZXRhZGF0YUluaGVyaXRhbmNlID1cIixcclxuXHRcdFx0XHRzZXR0aW5ncy5maWxlTWV0YWRhdGFJbmhlcml0YW5jZVxyXG5cdFx0XHQpO1xyXG5cdFx0XHR0aGlzLmF1Z21lbnRvci51cGRhdGVTZXR0aW5ncyh7XHJcblx0XHRcdFx0ZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2U6IHNldHRpbmdzLmZpbGVNZXRhZGF0YUluaGVyaXRhbmNlLFxyXG5cdFx0XHR9KTtcclxuXHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFwiW0RhdGFmbG93T3JjaGVzdHJhdG9yXSBGYWlsZWQgdG8gc3luYyBzZXR0aW5ncyB0byBBdWdtZW50b3JcIixcclxuXHRcdFx0XHRlXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVXBkYXRlIEZpbGVTb3VyY2UgaWYgbmVlZGVkXHJcblx0XHRpZiAoc2V0dGluZ3M/LmZpbGVTb3VyY2U/LmVuYWJsZWQgJiYgIXRoaXMuZmlsZVNvdXJjZSkge1xyXG5cdFx0XHQvLyBJbml0aWFsaXplIEZpbGVTb3VyY2UgaWYgZW5hYmxlZCBidXQgbm90IHlldCBjcmVhdGVkXHJcblx0XHRcdHRoaXMuZmlsZVNvdXJjZSA9IG5ldyBGaWxlU291cmNlKFxyXG5cdFx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHRcdHNldHRpbmdzLmZpbGVTb3VyY2UsXHJcblx0XHRcdFx0dGhpcy5maWxlRmlsdGVyTWFuYWdlclxyXG5cdFx0XHQpO1xyXG5cdFx0XHR0aGlzLmZpbGVTb3VyY2UuaW5pdGlhbGl6ZSgpO1xyXG5cdFx0XHQvLyBTeW5jIHN0YXR1cyBtYXBwaW5nIGZyb20gVGFzayBTdGF0dXMgc2V0dGluZ3Mgb24gY3JlYXRpb25cclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRpZiAoc2V0dGluZ3M/LnRhc2tTdGF0dXNlcykge1xyXG5cdFx0XHRcdFx0dGhpcy5maWxlU291cmNlLnN5bmNTdGF0dXNNYXBwaW5nRnJvbVNldHRpbmdzKFxyXG5cdFx0XHRcdFx0XHRzZXR0aW5ncy50YXNrU3RhdHVzZXNcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0XCJbRGF0YWZsb3dPcmNoZXN0cmF0b3JdIEZhaWxlZCB0byBzeW5jIEZpbGVTb3VyY2Ugc3RhdHVzIG1hcHBpbmcgb24gc2V0dGluZ3MgY3JlYXRlXCIsXHJcblx0XHRcdFx0XHRlXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIGlmICghc2V0dGluZ3M/LmZpbGVTb3VyY2U/LmVuYWJsZWQgJiYgdGhpcy5maWxlU291cmNlKSB7XHJcblx0XHRcdC8vIERpc2FibGUgRmlsZVNvdXJjZSBpZiBpdCBleGlzdHMgYnV0IGlzIGRpc2FibGVkXHJcblx0XHRcdHRoaXMuZmlsZVNvdXJjZS5jbGVhbnVwKCk7XHJcblx0XHRcdHRoaXMuZmlsZVNvdXJjZSA9IG51bGw7XHJcblx0XHR9IGVsc2UgaWYgKHRoaXMuZmlsZVNvdXJjZSAmJiBzZXR0aW5ncz8uZmlsZVNvdXJjZSkge1xyXG5cdFx0XHQvLyBVcGRhdGUgZXhpc3RpbmcgRmlsZVNvdXJjZSBjb25maWd1cmF0aW9uXHJcblx0XHRcdHRoaXMuZmlsZVNvdXJjZS51cGRhdGVDb25maWcoc2V0dGluZ3MuZmlsZVNvdXJjZSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWx3YXlzIHRyeSBzeW5jaW5nIHN0YXR1cyBtYXBwaW5nIHdoZW4gc2V0dGluZ3MgdXBkYXRlIGFuZCBGaWxlU291cmNlIGlzIGFjdGl2ZVxyXG5cdFx0aWYgKHRoaXMuZmlsZVNvdXJjZSAmJiBzZXR0aW5ncz8udGFza1N0YXR1c2VzKSB7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0dGhpcy5maWxlU291cmNlLnN5bmNTdGF0dXNNYXBwaW5nRnJvbVNldHRpbmdzKFxyXG5cdFx0XHRcdFx0c2V0dGluZ3MudGFza1N0YXR1c2VzXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcdFwiW0RhdGFmbG93T3JjaGVzdHJhdG9yXSBGYWlsZWQgdG8gc3luYyBGaWxlU291cmNlIHN0YXR1cyBtYXBwaW5nIG9uIHNldHRpbmdzIHVwZGF0ZVwiLFxyXG5cdFx0XHRcdFx0ZVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBTeW5jIHBhcnNlci1yZWxhdGVkIHNldHRpbmdzIHRvIFRhc2tXb3JrZXJNYW5hZ2VyIHNvIG5ldyBwYXJzZXMgcmVzcGVjdCBjaGFuZ2VzXHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCB0YXNrV29ya2VyTWFuYWdlciA9IHRoaXMud29ya2VyT3JjaGVzdHJhdG9yPy5bXHJcblx0XHRcdFx0XCJ0YXNrV29ya2VyTWFuYWdlclwiXHJcblx0XHRcdFx0XSBhc1xyXG5cdFx0XHRcdHwgVGFza1dvcmtlck1hbmFnZXJcclxuXHRcdFx0XHR8IHVuZGVmaW5lZDtcclxuXHRcdFx0aWYgKHRhc2tXb3JrZXJNYW5hZ2VyKSB7XHJcblx0XHRcdFx0dGFza1dvcmtlck1hbmFnZXIudXBkYXRlU2V0dGluZ3Moe1xyXG5cdFx0XHRcdFx0cHJlZmVyTWV0YWRhdGFGb3JtYXQ6IHNldHRpbmdzLnByZWZlck1ldGFkYXRhRm9ybWF0LFxyXG5cdFx0XHRcdFx0Y3VzdG9tRGF0ZUZvcm1hdHM6IHNldHRpbmdzLmN1c3RvbURhdGVGb3JtYXRzLFxyXG5cdFx0XHRcdFx0ZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2U6IHNldHRpbmdzLmZpbGVNZXRhZGF0YUluaGVyaXRhbmNlLFxyXG5cdFx0XHRcdFx0cHJvamVjdENvbmZpZzogc2V0dGluZ3MucHJvamVjdENvbmZpZyxcclxuXHRcdFx0XHRcdGlnbm9yZUhlYWRpbmc6IHNldHRpbmdzLmlnbm9yZUhlYWRpbmcsXHJcblx0XHRcdFx0XHRmb2N1c0hlYWRpbmc6IHNldHRpbmdzLmZvY3VzSGVhZGluZyxcclxuXHRcdFx0XHRcdC8vIEluY2x1ZGUgdGFnIHByZWZpeGVzIGZvciBjdXN0b20gZGF0YXZpZXcgZmllbGQgc3VwcG9ydFxyXG5cdFx0XHRcdFx0cHJvamVjdFRhZ1ByZWZpeDogc2V0dGluZ3MucHJvamVjdFRhZ1ByZWZpeCxcclxuXHRcdFx0XHRcdGNvbnRleHRUYWdQcmVmaXg6IHNldHRpbmdzLmNvbnRleHRUYWdQcmVmaXgsXHJcblx0XHRcdFx0XHRhcmVhVGFnUHJlZml4OiBzZXR0aW5ncy5hcmVhVGFnUHJlZml4LFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcIltEYXRhZmxvd09yY2hlc3RyYXRvcl0gRmFpbGVkIHRvIHN5bmMgcGFyc2VyIHNldHRpbmdzIHRvIFRhc2tXb3JrZXJNYW5hZ2VyIG9uIHNldHRpbmdzIHVwZGF0ZVwiLFxyXG5cdFx0XHRcdGVcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBVcGRhdGUgRmlsZUZpbHRlck1hbmFnZXJcclxuXHRcdGxldCBmaWxlRmlsdGVyQ2hhbmdlZCA9IGZhbHNlO1xyXG5cdFx0aWYgKHNldHRpbmdzPy5maWxlRmlsdGVyKSB7XHJcblx0XHRcdGlmICghdGhpcy5maWxlRmlsdGVyTWFuYWdlcikge1xyXG5cdFx0XHRcdHRoaXMuZmlsZUZpbHRlck1hbmFnZXIgPSBuZXcgRmlsZUZpbHRlck1hbmFnZXIoXHJcblx0XHRcdFx0XHRzZXR0aW5ncy5maWxlRmlsdGVyXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0aGlzLmZpbGVGaWx0ZXJNYW5hZ2VyLnVwZGF0ZUNvbmZpZyhzZXR0aW5ncy5maWxlRmlsdGVyKTtcclxuXHRcdFx0fVxyXG5cdFx0XHQodGhpcy5yZXBvc2l0b3J5IGFzIGFueSkuc2V0RmlsZUZpbHRlck1hbmFnZXI/LihcclxuXHRcdFx0XHR0aGlzLmZpbGVGaWx0ZXJNYW5hZ2VyXHJcblx0XHRcdCk7XHJcblx0XHRcdGZpbGVGaWx0ZXJDaGFuZ2VkID0gdHJ1ZTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoZmlsZUZpbHRlckNoYW5nZWQpIHtcclxuXHRcdFx0Y29uc3QgbmV3RW5hYmxlZDogYm9vbGVhbiA9IEJvb2xlYW4oc2V0dGluZ3M/LmZpbGVGaWx0ZXI/LmVuYWJsZWQpO1xyXG5cdFx0XHRjb25zdCBydWxlc0NvdW50ID0gQXJyYXkuaXNBcnJheShzZXR0aW5ncz8uZmlsZUZpbHRlcj8ucnVsZXMpXHJcblx0XHRcdFx0PyBzZXR0aW5ncy5maWxlRmlsdGVyLnJ1bGVzLmZpbHRlcigocjogYW55KSA9PiByPy5lbmFibGVkKVxyXG5cdFx0XHRcdFx0Lmxlbmd0aFxyXG5cdFx0XHRcdDogMDtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJbVEcgSW5kZXggRmlsdGVyXSBzZXR0aW5nc0NoYW5nZVwiLCB7XHJcblx0XHRcdFx0ZW5hYmxlZDogbmV3RW5hYmxlZCxcclxuXHRcdFx0XHRtb2RlOiBzZXR0aW5ncz8uZmlsZUZpbHRlcj8ubW9kZSxcclxuXHRcdFx0XHRydWxlc0NvdW50LFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0dGhpcy5sYXN0RmlsZUZpbHRlckVuYWJsZWQgPSBuZXdFbmFibGVkO1xyXG5cclxuXHRcdFx0Ly8gUGxhbiBCOiBBbHdheXMgcHJ1bmUgdGhlbiByZXN0b3JlIChkZWJvdW5jZWQpIG9uIGFueSBmaWxlRmlsdGVyIGNoYW5nZVxyXG5cdFx0XHRjb25zb2xlLmxvZyhcIltURyBJbmRleCBGaWx0ZXJdIGFjdGlvblwiLCB7XHJcblx0XHRcdFx0YWN0aW9uOiBcIlBSVU5FX1RIRU5fUkVTVE9SRVwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0dm9pZCB0aGlzLnBydW5lQnlGaWx0ZXIoKTtcclxuXHRcdFx0dGhpcy5yZXN0b3JlQnlGaWx0ZXJEZWJvdW5jZWQ/LigpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUHJ1bmUgZXhpc3RpbmcgaW5kZXggYW5kIGZpbGUtdGFza3MgYnkgY3VycmVudCBmaWxlIGZpbHRlciAobGlnaHR3ZWlnaHQpXHJcblx0ICogUGVyZm9ybWFuY2Ugbm90ZXM6XHJcblx0ICogLSBVc2VzIGluZGV4IHNuYXBzaG90IHRvIGF2b2lkIHNjYW5uaW5nIHZhdWx0XHJcblx0ICogLSBCYXRjaGVzIGlubGluZSBjbGVhcmluZyB2aWEgcmVwb3NpdG9yeS51cGRhdGVCYXRjaFxyXG5cdCAqIC0gT25seSBydW5zIHdoZW4gZmlsZUZpbHRlciBhY3R1YWxseSBjaGFuZ2VzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhc3luYyBwcnVuZUJ5RmlsdGVyKCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0aWYgKCF0aGlzLmZpbGVGaWx0ZXJNYW5hZ2VyKSByZXR1cm47XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBzdGFydCA9IERhdGUubm93KCk7XHJcblx0XHRcdGNvbnN0IGZpbGVzID0gYXdhaXQgdGhpcy5yZXBvc2l0b3J5LmdldEluZGV4ZWRGaWxlUGF0aHMoKTtcclxuXHRcdFx0Y29uc3QgdG9DbGVhciA9IG5ldyBNYXA8c3RyaW5nLCBUYXNrW10+KCk7XHJcblx0XHRcdGxldCBwcnVuZWRJbmxpbmUgPSAwO1xyXG5cdFx0XHRmb3IgKGNvbnN0IHAgb2YgZmlsZXMpIHtcclxuXHRcdFx0XHRjb25zdCBpbmNsdWRlSW5saW5lID0gdGhpcy5maWxlRmlsdGVyTWFuYWdlci5zaG91bGRJbmNsdWRlUGF0aChcclxuXHRcdFx0XHRcdHAsXHJcblx0XHRcdFx0XHRcImlubGluZVwiXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRpZiAoIWluY2x1ZGVJbmxpbmUpIHtcclxuXHRcdFx0XHRcdHRvQ2xlYXIuc2V0KHAsIFtdKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKHRvQ2xlYXIuc2l6ZSA+IDApIHtcclxuXHRcdFx0XHQvLyBGb3JjZSBldmVudCBlbWlzc2lvbiB0byBlbnN1cmUgdmlld3MgcmVmcmVzaCBldmVuIGlmIHN0b3JhZ2UgbWF0Y2hlc1xyXG5cdFx0XHRcdGF3YWl0IHRoaXMucmVwb3NpdG9yeS51cGRhdGVCYXRjaCh0b0NsZWFyLCB1bmRlZmluZWQsIHtcclxuXHRcdFx0XHRcdHBlcnNpc3Q6IGZhbHNlLFxyXG5cdFx0XHRcdFx0Zm9yY2VFbWl0OiB0cnVlLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGZvciAoY29uc3QgcCBvZiB0b0NsZWFyLmtleXMoKSkge1xyXG5cdFx0XHRcdFx0dGhpcy5zdXBwcmVzc2VkSW5saW5lLmFkZChwKTtcclxuXHRcdFx0XHRcdHBydW5lZElubGluZSsrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRjb25zdCBmaWxlVGFza1BhdGhzID0gdGhpcy5yZXBvc2l0b3J5LmdldEZpbGVUYXNrUGF0aHM/LigpIHx8IFtdO1xyXG5cdFx0XHRsZXQgcHJ1bmVkRmlsZVRhc2tzID0gMDtcclxuXHRcdFx0Zm9yIChjb25zdCBwIG9mIGZpbGVUYXNrUGF0aHMpIHtcclxuXHRcdFx0XHRjb25zdCBpbmNsdWRlRmlsZSA9IHRoaXMuZmlsZUZpbHRlck1hbmFnZXIuc2hvdWxkSW5jbHVkZVBhdGgoXHJcblx0XHRcdFx0XHRwLFxyXG5cdFx0XHRcdFx0XCJmaWxlXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGlmICghaW5jbHVkZUZpbGUpIHtcclxuXHRcdFx0XHRcdGF3YWl0IHRoaXMucmVwb3NpdG9yeS5yZW1vdmVGaWxlVGFzayhwKTtcclxuXHRcdFx0XHRcdHRoaXMuc3VwcHJlc3NlZEZpbGVUYXNrcy5hZGQocCk7XHJcblx0XHRcdFx0XHRwcnVuZWRGaWxlVGFza3MrKztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gUGVyc2lzdCBzdXBwcmVzc2VkIHNldHMgZm9yIGNyb3NzLXJlc3RhcnQgcmVzdG9yZSBjYXBhYmlsaXR5IChhZnRlciB1cGRhdGVzKVxyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdGF3YWl0ICh0aGlzLnN0b3JhZ2UgYXMgYW55KS5zYXZlTWV0YT8uKFxyXG5cdFx0XHRcdFx0XCJmaWx0ZXI6c3VwcHJlc3NlZElubGluZVwiLFxyXG5cdFx0XHRcdFx0QXJyYXkuZnJvbSh0aGlzLnN1cHByZXNzZWRJbmxpbmUpXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRhd2FpdCAodGhpcy5zdG9yYWdlIGFzIGFueSkuc2F2ZU1ldGE/LihcclxuXHRcdFx0XHRcdFwiZmlsdGVyOnN1cHByZXNzZWRGaWxlVGFza3NcIixcclxuXHRcdFx0XHRcdEFycmF5LmZyb20odGhpcy5zdXBwcmVzc2VkRmlsZVRhc2tzKVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRcIltEYXRhZmxvd09yY2hlc3RyYXRvcl0gcGVyc2lzdCBzdXBwcmVzc2VkIG1ldGEgYWZ0ZXIgcHJ1bmUgZmFpbGVkXCIsXHJcblx0XHRcdFx0XHRlXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0XHRjb25zdCBlbGFwc2VkID0gRGF0ZS5ub3coKSAtIHN0YXJ0O1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIltEYXRhZmxvd09yY2hlc3RyYXRvcl0gcHJ1bmVCeUZpbHRlclwiLCB7XHJcblx0XHRcdFx0cHJ1bmVkSW5saW5lLFxyXG5cdFx0XHRcdHBydW5lZEZpbGVUYXNrcyxcclxuXHRcdFx0XHRlbGFwc2VkLFxyXG5cdFx0XHRcdGlubGluZVN1cHByZXNzZWRTaXplOiB0aGlzLnN1cHByZXNzZWRJbmxpbmUuc2l6ZSxcclxuXHRcdFx0XHRmaWxlU3VwcHJlc3NlZFNpemU6IHRoaXMuc3VwcHJlc3NlZEZpbGVUYXNrcy5zaXplLFxyXG5cdFx0XHR9KTtcclxuXHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFwiW0RhdGFmbG93T3JjaGVzdHJhdG9yXSBwcnVuZUJ5RmlsdGVyIGZhaWxlZFwiLCBlKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlc3RvcmUgcHJldmlvdXNseSBzdXBwcmVzc2VkIGZpbGVzIHdoZW4gZmlsdGVycyBhcmUgbG9vc2VuZWRcclxuXHQgKiAtIElubGluZTogcHJlZmVyIGF1Z21lbnRlZC9yYXcgY2FjaGU7IGZhbGxiYWNrIHRvIHJlLXBhcnNlIHNpbmdsZSBmaWxlXHJcblx0ICogLSBGaWxlIHRhc2tzOiBlbWl0IEZJTEVfVVBEQVRFRCB0byBsZXQgRmlsZVNvdXJjZSByZWV2YWx1YXRlXHJcblx0ICogLSBSdW5zIGluIHNtYWxsIGJhdGNoZXMgdG8gYXZvaWQgVUkgamFua1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgcmVzdG9yZUJ5RmlsdGVyKCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0aWYgKCF0aGlzLmZpbGVGaWx0ZXJNYW5hZ2VyKSByZXR1cm47XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBzdGFydCA9IERhdGUubm93KCk7XHJcblx0XHRcdGxldCBpbmxpbmVDYW5kaWRhdGVzOiBzdHJpbmdbXSA9IEFycmF5LmZyb20oXHJcblx0XHRcdFx0dGhpcy5zdXBwcmVzc2VkSW5saW5lXHJcblx0XHRcdCkuZmlsdGVyKChwKSA9PlxyXG5cdFx0XHRcdHRoaXMuZmlsZUZpbHRlck1hbmFnZXIhLnNob3VsZEluY2x1ZGVQYXRoKHAsIFwiaW5saW5lXCIpXHJcblx0XHRcdCk7XHJcblx0XHRcdGNvbnN0IGZpbGVUYXNrQ2FuZGlkYXRlczogc3RyaW5nW10gPSBBcnJheS5mcm9tKFxyXG5cdFx0XHRcdHRoaXMuc3VwcHJlc3NlZEZpbGVUYXNrc1xyXG5cdFx0XHQpLmZpbHRlcigocCkgPT5cclxuXHRcdFx0XHR0aGlzLmZpbGVGaWx0ZXJNYW5hZ2VyIS5zaG91bGRJbmNsdWRlUGF0aChwLCBcImZpbGVcIilcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIEZhbGxiYWNrOiBpZiB3ZSBoYXZlIG5vIHN1cHByZXNzZWQgaW5saW5lIGNhbmRpZGF0ZXMgKGUuZy4sIHByZXZpb3VzIHNlc3Npb24pLCBkZXJpdmUgZnJvbSBjYWNoZSBrZXlzXHJcblx0XHRcdGlmIChpbmxpbmVDYW5kaWRhdGVzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRjb25zdCBpbmRleGVkID0gbmV3IFNldChcclxuXHRcdFx0XHRcdFx0YXdhaXQgdGhpcy5yZXBvc2l0b3J5LmdldEluZGV4ZWRGaWxlUGF0aHMoKVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdGNvbnN0IGF1Z1BhdGhzID1cclxuXHRcdFx0XHRcdFx0KGF3YWl0ICh0aGlzLnN0b3JhZ2UgYXMgYW55KS5saXN0QXVnbWVudGVkUGF0aHM/LigpKSB8fFxyXG5cdFx0XHRcdFx0XHRbXTtcclxuXHRcdFx0XHRcdGNvbnN0IHJhd1BhdGhzID1cclxuXHRcdFx0XHRcdFx0KGF3YWl0ICh0aGlzLnN0b3JhZ2UgYXMgYW55KS5saXN0UmF3UGF0aHM/LigpKSB8fCBbXTtcclxuXHRcdFx0XHRcdGNvbnN0IHVuaW9uID0gbmV3IFNldDxzdHJpbmc+KFsuLi5hdWdQYXRocywgLi4ucmF3UGF0aHNdKTtcclxuXHRcdFx0XHRcdGlubGluZUNhbmRpZGF0ZXMgPSBBcnJheS5mcm9tKHVuaW9uKS5maWx0ZXIoXHJcblx0XHRcdFx0XHRcdChwKSA9PlxyXG5cdFx0XHRcdFx0XHRcdCFpbmRleGVkLmhhcyhwKSAmJlxyXG5cdFx0XHRcdFx0XHRcdHRoaXMuZmlsZUZpbHRlck1hbmFnZXIhLnNob3VsZEluY2x1ZGVQYXRoKFxyXG5cdFx0XHRcdFx0XHRcdFx0cCxcclxuXHRcdFx0XHRcdFx0XHRcdFwiaW5saW5lXCJcclxuXHRcdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcdFwiW0RhdGFmbG93T3JjaGVzdHJhdG9yXSByZXN0b3JlQnlGaWx0ZXIgZmFsbGJhY2sgY2FuZGlkYXRlc1wiLFxyXG5cdFx0XHRcdFx0XHR7ZXh0cmE6IGlubGluZUNhbmRpZGF0ZXMubGVuZ3RofVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRcdFwiW0RhdGFmbG93T3JjaGVzdHJhdG9yXSBmYWxsYmFjayBjYW5kaWRhdGUgZGlzY292ZXJ5IGZhaWxlZFwiLFxyXG5cdFx0XHRcdFx0XHRlXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0bGV0IHJlc3RvcmVkRnJvbUF1Z21lbnRlZCA9IDA7XHJcblx0XHRcdGxldCByZXN0b3JlZEZyb21SYXcgPSAwO1xyXG5cdFx0XHRsZXQgcmVwYXJzZWQgPSAwO1xyXG5cclxuXHRcdFx0Y29uc3QgcHJvY2Vzc0lubGluZUJhdGNoID0gYXN5bmMgKGJhdGNoOiBzdHJpbmdbXSkgPT4ge1xyXG5cdFx0XHRcdGZvciAoY29uc3QgcGF0aCBvZiBiYXRjaCkge1xyXG5cdFx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgZmlsZSA9IHRoaXMudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFxyXG5cdFx0XHRcdFx0XHRcdHBhdGhcclxuXHRcdFx0XHRcdFx0KSBhcyBURmlsZSB8IG51bGw7XHJcblx0XHRcdFx0XHRcdGlmICghZmlsZSkge1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMuc3VwcHJlc3NlZElubGluZS5kZWxldGUocGF0aCk7XHJcblx0XHRcdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0Ly8gVHJ5IGF1Z21lbnRlZCBjYWNoZVxyXG5cdFx0XHRcdFx0XHRjb25zdCBhdWdtZW50ZWQgPSBhd2FpdCB0aGlzLnN0b3JhZ2UubG9hZEF1Z21lbnRlZChcclxuXHRcdFx0XHRcdFx0XHRwYXRoXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdGlmIChhdWdtZW50ZWQ/LmRhdGE/Lmxlbmd0aCAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0XHRcdFx0YXdhaXQgdGhpcy5yZXBvc2l0b3J5LnVwZGF0ZUZpbGUoXHJcblx0XHRcdFx0XHRcdFx0XHRwYXRoLFxyXG5cdFx0XHRcdFx0XHRcdFx0YXVnbWVudGVkLmRhdGEsXHJcblx0XHRcdFx0XHRcdFx0XHR1bmRlZmluZWQsXHJcblx0XHRcdFx0XHRcdFx0XHR7Zm9yY2VFbWl0OiB0cnVlfVxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0cmVzdG9yZWRGcm9tQXVnbWVudGVkKys7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5zdXBwcmVzc2VkSW5saW5lLmRlbGV0ZShwYXRoKTtcclxuXHRcdFx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHQvLyBUcnkgcmF3IGNhY2hlIGFuZCByZS1hdWdtZW50XHJcblx0XHRcdFx0XHRcdGNvbnN0IHJhdyA9IGF3YWl0IHRoaXMuc3RvcmFnZS5sb2FkUmF3KHBhdGgpO1xyXG5cdFx0XHRcdFx0XHRpZiAocmF3Py5kYXRhKSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgcHJvamVjdERhdGEgPSBhd2FpdCB0aGlzLnByb2plY3RSZXNvbHZlci5nZXQoXHJcblx0XHRcdFx0XHRcdFx0XHRwYXRoXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBmaWxlQ2FjaGUgPVxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKTtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBhdWdtZW50Q29udGV4dDogQXVnbWVudENvbnRleHQgPSB7XHJcblx0XHRcdFx0XHRcdFx0XHRmaWxlUGF0aDogcGF0aCxcclxuXHRcdFx0XHRcdFx0XHRcdGZpbGVNZXRhOiBmaWxlQ2FjaGU/LmZyb250bWF0dGVyIHx8IHt9LFxyXG5cdFx0XHRcdFx0XHRcdFx0cHJvamVjdE5hbWU6IHByb2plY3REYXRhLnRnUHJvamVjdD8ubmFtZSxcclxuXHRcdFx0XHRcdFx0XHRcdHByb2plY3RNZXRhOiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdC4uLnByb2plY3REYXRhLmVuaGFuY2VkTWV0YWRhdGEsXHJcblx0XHRcdFx0XHRcdFx0XHRcdHRnUHJvamVjdDogcHJvamVjdERhdGEudGdQcm9qZWN0LFxyXG5cdFx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHRcdHRhc2tzOiByYXcuZGF0YSxcclxuXHRcdFx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGF1Z21lbnRlZFRhc2tzID0gYXdhaXQgdGhpcy5hdWdtZW50b3IubWVyZ2UoXHJcblx0XHRcdFx0XHRcdFx0XHRhdWdtZW50Q29udGV4dFxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0YXdhaXQgdGhpcy5yZXBvc2l0b3J5LnVwZGF0ZUZpbGUoXHJcblx0XHRcdFx0XHRcdFx0XHRwYXRoLFxyXG5cdFx0XHRcdFx0XHRcdFx0YXVnbWVudGVkVGFza3NcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdHJlc3RvcmVkRnJvbVJhdysrO1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMuc3VwcHJlc3NlZElubGluZS5kZWxldGUocGF0aCk7XHJcblx0XHRcdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0Ly8gRmFsbGJhY2s6IHNpbmdsZS1maWxlIHBhcnNlXHJcblx0XHRcdFx0XHRcdGF3YWl0IHRoaXMucHJvY2Vzc0ZpbGVJbW1lZGlhdGUoZmlsZSwgZmFsc2UpO1xyXG5cdFx0XHRcdFx0XHRyZXBhcnNlZCsrO1xyXG5cdFx0XHRcdFx0XHR0aGlzLnN1cHByZXNzZWRJbmxpbmUuZGVsZXRlKHBhdGgpO1xyXG5cdFx0XHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdFx0XHQvLyBQZXJzaXN0IHVwZGF0ZWQgc3VwcHJlc3NlZCBzZXRzIGZvciBjcm9zcy1yZXN0YXJ0IHJlY292ZXJ5XHJcblx0XHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdFx0YXdhaXQgdGhpcy5zdG9yYWdlLnNhdmVNZXRhKFxyXG5cdFx0XHRcdFx0XHRcdFx0XCJmaWx0ZXI6c3VwcHJlc3NlZElubGluZVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0QXJyYXkuZnJvbSh0aGlzLnN1cHByZXNzZWRJbmxpbmUpXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRhd2FpdCB0aGlzLnN0b3JhZ2Uuc2F2ZU1ldGEoXHJcblx0XHRcdFx0XHRcdFx0XHRcImZpbHRlcjpzdXBwcmVzc2VkRmlsZVRhc2tzXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRBcnJheS5mcm9tKHRoaXMuc3VwcHJlc3NlZEZpbGVUYXNrcylcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0XHRcdFx0XCJbRGF0YWZsb3dPcmNoZXN0cmF0b3JdIHBlcnNpc3Qgc3VwcHJlc3NlZCBtZXRhIGZhaWxlZFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0ZVxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcdFx0XHRcIltEYXRhZmxvd09yY2hlc3RyYXRvcl0gcmVzdG9yZSBpbmxpbmUgZmFpbGVkXCIsXHJcblx0XHRcdFx0XHRcdFx0e3BhdGgsIGV9XHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gQmF0Y2ggaW5saW5lIHJlc3RvcmVzXHJcblx0XHRcdGZvciAoXHJcblx0XHRcdFx0bGV0IGkgPSAwO1xyXG5cdFx0XHRcdGkgPCBpbmxpbmVDYW5kaWRhdGVzLmxlbmd0aDtcclxuXHRcdFx0XHRpICs9IHRoaXMuUkVTVE9SRV9CQVRDSF9TSVpFXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdGNvbnN0IGJhdGNoID0gaW5saW5lQ2FuZGlkYXRlcy5zbGljZShcclxuXHRcdFx0XHRcdGksXHJcblx0XHRcdFx0XHRpICsgdGhpcy5SRVNUT1JFX0JBVENIX1NJWkVcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGF3YWl0IHByb2Nlc3NJbmxpbmVCYXRjaChiYXRjaCk7XHJcblx0XHRcdFx0aWYgKGkgKyB0aGlzLlJFU1RPUkVfQkFUQ0hfU0laRSA8IGlubGluZUNhbmRpZGF0ZXMubGVuZ3RoKSB7XHJcblx0XHRcdFx0XHRhd2FpdCBuZXcgUHJvbWlzZSgocikgPT5cclxuXHRcdFx0XHRcdFx0c2V0VGltZW91dChyLCB0aGlzLlJFU1RPUkVfQkFUQ0hfSU5URVJWQUxfTVMpXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gRmlsZS10YXNrIHJlc3RvcmVzOiBlbWl0IGV2ZW50IHRvIGxldCBGaWxlU291cmNlIHJlLWV2YWx1YXRlXHJcblx0XHRcdGZvciAoY29uc3QgcGF0aCBvZiBmaWxlVGFza0NhbmRpZGF0ZXMpIHtcclxuXHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0ZW1pdCh0aGlzLmFwcCwgRXZlbnRzLkZJTEVfVVBEQVRFRCwge1xyXG5cdFx0XHRcdFx0XHRwYXRoLFxyXG5cdFx0XHRcdFx0XHRyZWFzb246IFwicmVzdG9yZVwiLFxyXG5cdFx0XHRcdFx0XHR0aW1lc3RhbXA6IERhdGUubm93KCksXHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdHRoaXMuc3VwcHJlc3NlZEZpbGVUYXNrcy5kZWxldGUocGF0aCk7XHJcblx0XHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0XHRcIltEYXRhZmxvd09yY2hlc3RyYXRvcl0gcmVzdG9yZSBmaWxlLXRhc2sgZW1pdCBmYWlsZWRcIixcclxuXHRcdFx0XHRcdFx0e3BhdGgsIGV9XHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgZWxhcHNlZCA9IERhdGUubm93KCkgLSBzdGFydDtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJbRGF0YWZsb3dPcmNoZXN0cmF0b3JdIHJlc3RvcmVCeUZpbHRlclwiLCB7XHJcblx0XHRcdFx0cmVzdG9yZWRGcm9tQXVnbWVudGVkLFxyXG5cdFx0XHRcdHJlc3RvcmVkRnJvbVJhdyxcclxuXHRcdFx0XHRyZXBhcnNlZCxcclxuXHRcdFx0XHR0b3RhbElubGluZTogaW5saW5lQ2FuZGlkYXRlcy5sZW5ndGgsXHJcblx0XHRcdFx0dG90YWxGaWxlVGFza3M6IGZpbGVUYXNrQ2FuZGlkYXRlcy5sZW5ndGgsXHJcblx0XHRcdFx0ZWxhcHNlZCxcclxuXHRcdFx0fSk7XHJcblx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcIltEYXRhZmxvd09yY2hlc3RyYXRvcl0gcmVzdG9yZUJ5RmlsdGVyIGZhaWxlZFwiLCBlKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB3b3JrZXIgcHJvY2Vzc2luZyBzdGF0dXMgYW5kIG1ldHJpY3NcclxuXHQgKi9cclxuXHRnZXRXb3JrZXJTdGF0dXMoKTogeyBlbmFibGVkOiBib29sZWFuOyBtZXRyaWNzPzogYW55IH0ge1xyXG5cdFx0aWYgKCF0aGlzLndvcmtlck9yY2hlc3RyYXRvcikge1xyXG5cdFx0XHRyZXR1cm4ge2VuYWJsZWQ6IGZhbHNlfTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRlbmFibGVkOiB0aGlzLndvcmtlck9yY2hlc3RyYXRvci5pc1dvcmtlclByb2Nlc3NpbmdFbmFibGVkKCksXHJcblx0XHRcdG1ldHJpY3M6IHRoaXMud29ya2VyT3JjaGVzdHJhdG9yLmdldE1ldHJpY3MoKSxcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBQYXJzZSBhIGZpbGUgYmFzZWQgb24gaXRzIHR5cGUgdXNpbmcgQ29uZmlndXJhYmxlVGFza1BhcnNlclxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgcGFyc2VGaWxlKFxyXG5cdFx0ZmlsZTogVEZpbGUsXHJcblx0XHR0Z1Byb2plY3Q/OiBUZ1Byb2plY3RcclxuXHQpOiBQcm9taXNlPFRhc2tbXT4ge1xyXG5cdFx0Y29uc3QgZXh0ZW5zaW9uID0gZmlsZS5leHRlbnNpb24udG9Mb3dlckNhc2UoKTtcclxuXHJcblx0XHQvLyBQYXJzZSBiYXNlZCBvbiBmaWxlIHR5cGVcclxuXHRcdGxldCB0YXNrczogVGFza1tdID0gW107XHJcblxyXG5cdFx0aWYgKGV4dGVuc2lvbiA9PT0gXCJtZFwiKSB7XHJcblx0XHRcdC8vIFVzZSBDb25maWd1cmFibGVUYXNrUGFyc2VyIGZvciBtYXJrZG93biBmaWxlc1xyXG5cdFx0XHRjb25zdCBjb250ZW50ID0gYXdhaXQgdGhpcy52YXVsdC5jYWNoZWRSZWFkKGZpbGUpO1xyXG5cdFx0XHRjb25zdCBmaWxlQ2FjaGUgPSB0aGlzLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpO1xyXG5cdFx0XHRjb25zdCBmaWxlTWV0YWRhdGEgPSBmaWxlQ2FjaGU/LmZyb250bWF0dGVyIHx8IHt9O1xyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIHBhcnNlciB3aXRoIHBsdWdpbiBzZXR0aW5ncyB1c2luZyBjb25zaXN0ZW50IGNvbmZpZyBnZW5lcmF0aW9uXHJcblx0XHRcdGNvbnN0IHBhcnNlckNvbmZpZyA9IGdldENvbmZpZyhcclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcmVmZXJNZXRhZGF0YUZvcm1hdCB8fCBcInRhc2tzXCIsXHJcblx0XHRcdFx0dGhpcy5wbHVnaW5cclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIERlYnVnOiBsb2cgZWZmZWN0aXZlIHNwZWNpYWxUYWdQcmVmaXhlcyBmb3IgdmVyaWZpY2F0aW9uXHJcblx0XHRcdGNvbnNvbGUuZGVidWcoXHJcblx0XHRcdFx0XCJbVFBCXSBQYXJzZXIgc3BlY2lhbFRhZ1ByZWZpeGVzOlwiLFxyXG5cdFx0XHRcdHBhcnNlckNvbmZpZy5zcGVjaWFsVGFnUHJlZml4ZXNcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGNvbnN0IHBhcnNlciA9IG5ldyBDb25maWd1cmFibGVUYXNrUGFyc2VyKFxyXG5cdFx0XHRcdHBhcnNlckNvbmZpZyxcclxuXHRcdFx0XHR0aGlzLnRpbWVQYXJzaW5nU2VydmljZVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gTGVnYWN5IGNvZGUgZm9yIHJlZmVyZW5jZSAobm93IHJlcGxhY2VkIGJ5IGdldENvbmZpZylcclxuXHRcdFx0Lypjb25zdCB0YXNrc1Byb2plY3RQcmVmaXggPVxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzPy5wcm9qZWN0VGFnUHJlZml4Py50YXNrcyB8fCBcInByb2plY3RcIjtcclxuXHRcdFx0Y29uc3QgdGFza3NDb250ZXh0UHJlZml4ID1cclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncz8uY29udGV4dFRhZ1ByZWZpeD8udGFza3MgfHwgXCJAXCI7XHJcblx0XHRcdCovXHJcblxyXG5cdFx0XHQvLyBQYXJzZSB0YXNrcyB1c2luZyBDb25maWd1cmFibGVUYXNrUGFyc2VyIHdpdGggdGdQcm9qZWN0XHJcblx0XHRcdGNvbnN0IG1hcmtkb3duVGFza3MgPSBwYXJzZXIucGFyc2VMZWdhY3koXHJcblx0XHRcdFx0Y29udGVudCxcclxuXHRcdFx0XHRmaWxlLnBhdGgsXHJcblx0XHRcdFx0ZmlsZU1ldGFkYXRhLFxyXG5cdFx0XHRcdHVuZGVmaW5lZCxcclxuXHRcdFx0XHR0Z1Byb2plY3RcclxuXHRcdFx0KTtcclxuXHRcdFx0dGFza3MucHVzaCguLi5tYXJrZG93blRhc2tzKTtcclxuXHJcblx0XHRcdC8vIFBhcnNlIGZpbGUtbGV2ZWwgdGFza3MgZnJvbSBmcm9udG1hdHRlclxyXG5cdFx0XHRjb25zdCBmaWxlTWV0YVRhc2tzID0gYXdhaXQgcGFyc2VGaWxlTWV0YSh0aGlzLnBsdWdpbiwgZmlsZS5wYXRoKTtcclxuXHRcdFx0dGFza3MucHVzaCguLi5maWxlTWV0YVRhc2tzKTtcclxuXHRcdH0gZWxzZSBpZiAoZXh0ZW5zaW9uID09PSBcImNhbnZhc1wiKSB7XHJcblx0XHRcdC8vIFBhcnNlIGNhbnZhcyB0YXNrcyB1c2luZyB0aGUgc3RhdGljIG1ldGhvZFxyXG5cdFx0XHRjb25zdCBjYW52YXNUYXNrcyA9IGF3YWl0IENhbnZhc1BhcnNlci5wYXJzZUNhbnZhcyhcclxuXHRcdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0XHRmaWxlXHJcblx0XHRcdCk7XHJcblx0XHRcdHRhc2tzLnB1c2goLi4uY2FudmFzVGFza3MpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0YXNrcztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFByb2Nlc3MgbXVsdGlwbGUgZmlsZXMgaW4gYmF0Y2ggdXNpbmcgd29ya2VycyBmb3IgcGFyYWxsZWwgcHJvY2Vzc2luZ1xyXG5cdCAqL1xyXG5cdGFzeW5jIHByb2Nlc3NCYXRjaChcclxuXHRcdGZpbGVzOiBURmlsZVtdLFxyXG5cdFx0dXNlV29ya2VyczogYm9vbGVhbiA9IHRydWVcclxuXHQpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGNvbnN0IHVwZGF0ZXMgPSBuZXcgTWFwPHN0cmluZywgVGFza1tdPigpO1xyXG5cdFx0bGV0IHNraXBwZWRDb3VudCA9IDA7XHJcblxyXG5cdFx0Ly8gRGVjaWRlIHdoZXRoZXIgdG8gdXNlIHdvcmtlcnMgYmFzZWQgb24gYmF0Y2ggc2l6ZSBhbmQgY29uZmlndXJhdGlvblxyXG5cdFx0Y29uc3Qgc2hvdWxkVXNlV29ya2VycyA9IHVzZVdvcmtlcnMgJiYgZmlsZXMubGVuZ3RoID4gNTsgLy8gVXNlIHdvcmtlcnMgZm9yIGJhdGNoZXMgPiA1IGZpbGVzXHJcblxyXG5cdFx0aWYgKHNob3VsZFVzZVdvcmtlcnMpIHtcclxuXHRcdFx0Ly8gVXNlIFdvcmtlck9yY2hlc3RyYXRvciBmb3IgcGFyYWxsZWwgcHJvY2Vzc2luZ1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRgW0RhdGFmbG93T3JjaGVzdHJhdG9yXSBVc2luZyB3b3JrZXJzIHRvIHByb2Nlc3MgJHtmaWxlcy5sZW5ndGh9IGZpbGVzIGluIHBhcmFsbGVsYFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHQvLyBDb25maWd1cmUgd29ya2VyIG1hbmFnZXIgd2l0aCBwbHVnaW4gc2V0dGluZ3NcclxuXHRcdFx0XHRjb25zdCB0YXNrV29ya2VyTWFuYWdlciA9IHRoaXMud29ya2VyT3JjaGVzdHJhdG9yW1xyXG5cdFx0XHRcdFx0XCJ0YXNrV29ya2VyTWFuYWdlclwiXHJcblx0XHRcdFx0XHRdIGFzIFRhc2tXb3JrZXJNYW5hZ2VyO1xyXG5cdFx0XHRcdGlmICh0YXNrV29ya2VyTWFuYWdlcikge1xyXG5cdFx0XHRcdFx0dGFza1dvcmtlck1hbmFnZXIudXBkYXRlU2V0dGluZ3Moe1xyXG5cdFx0XHRcdFx0XHRwcmVmZXJNZXRhZGF0YUZvcm1hdDpcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcmVmZXJNZXRhZGF0YUZvcm1hdCB8fFxyXG5cdFx0XHRcdFx0XHRcdFwidGFza3NcIixcclxuXHRcdFx0XHRcdFx0Y3VzdG9tRGF0ZUZvcm1hdHM6XHJcblx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLmN1c3RvbURhdGVGb3JtYXRzLFxyXG5cdFx0XHRcdFx0XHRmaWxlTWV0YWRhdGFJbmhlcml0YW5jZTpcclxuXHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2UsXHJcblx0XHRcdFx0XHRcdHByb2plY3RDb25maWc6IHRoaXMucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWcsXHJcblx0XHRcdFx0XHRcdGlnbm9yZUhlYWRpbmc6IHRoaXMucGx1Z2luLnNldHRpbmdzLmlnbm9yZUhlYWRpbmcsXHJcblx0XHRcdFx0XHRcdGZvY3VzSGVhZGluZzogdGhpcy5wbHVnaW4uc2V0dGluZ3MuZm9jdXNIZWFkaW5nLFxyXG5cdFx0XHRcdFx0XHQvLyBJbmNsdWRlIHRhZyBwcmVmaXhlcyBmb3IgY3VzdG9tIGRhdGF2aWV3IGZpZWxkIHN1cHBvcnRcclxuXHRcdFx0XHRcdFx0cHJvamVjdFRhZ1ByZWZpeDogdGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvamVjdFRhZ1ByZWZpeCxcclxuXHRcdFx0XHRcdFx0Y29udGV4dFRhZ1ByZWZpeDogdGhpcy5wbHVnaW4uc2V0dGluZ3MuY29udGV4dFRhZ1ByZWZpeCxcclxuXHRcdFx0XHRcdFx0YXJlYVRhZ1ByZWZpeDogdGhpcy5wbHVnaW4uc2V0dGluZ3MuYXJlYVRhZ1ByZWZpeCxcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gUGFyc2UgYWxsIGZpbGVzIGluIHBhcmFsbGVsIHVzaW5nIHdvcmtlcnMgKHJhdyBwYXJzaW5nIG9ubHksIG5vIHByb2plY3QgZGF0YSlcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdGBbRGF0YWZsb3dPcmNoZXN0cmF0b3JdIFBhcnNpbmcgJHtmaWxlcy5sZW5ndGh9IGZpbGVzIHdpdGggd29ya2VycyAocmF3IGV4dHJhY3Rpb24pLi4uYFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0Y29uc3QgcGFyc2VkUmVzdWx0cyA9IGF3YWl0IHRoaXMud29ya2VyT3JjaGVzdHJhdG9yLmJhdGNoUGFyc2UoXHJcblx0XHRcdFx0XHRmaWxlcyxcclxuXHRcdFx0XHRcdFwibm9ybWFsXCJcclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHQvLyBDb21wdXRlIHByb2plY3QgZGF0YSBpbiBwYXJhbGxlbCB3aXRoIHN0b3JhZ2Ugb3BlcmF0aW9uc1xyXG5cdFx0XHRcdGNvbnN0IHByb2plY3REYXRhUHJvbWlzZXMgPSBuZXcgTWFwPHN0cmluZywgUHJvbWlzZTxhbnk+PigpO1xyXG5cdFx0XHRcdGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xyXG5cdFx0XHRcdFx0cHJvamVjdERhdGFQcm9taXNlcy5zZXQoXHJcblx0XHRcdFx0XHRcdGZpbGUucGF0aCxcclxuXHRcdFx0XHRcdFx0dGhpcy5wcm9qZWN0UmVzb2x2ZXIuZ2V0KGZpbGUucGF0aClcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBQcm9jZXNzIGVhY2ggcGFyc2VkIHJlc3VsdFxyXG5cdFx0XHRcdGZvciAoY29uc3QgW2ZpbGVQYXRoLCByYXdUYXNrc10gb2YgcGFyc2VkUmVzdWx0cykge1xyXG5cdFx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgZmlsZSA9IGZpbGVzLmZpbmQoKGYpID0+IGYucGF0aCA9PT0gZmlsZVBhdGgpO1xyXG5cdFx0XHRcdFx0XHRpZiAoIWZpbGUpIGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0XHQvLyBBcHBseSBpbmxpbmUgZmlsZSBmaWx0ZXIgZWFybHkgaW4gd29ya2VyIHBhdGhcclxuXHRcdFx0XHRcdFx0Y29uc3QgaW5jbHVkZUlubGluZSA9IHRoaXMuZmlsZUZpbHRlck1hbmFnZXJcclxuXHRcdFx0XHRcdFx0XHQ/IHRoaXMuZmlsZUZpbHRlck1hbmFnZXIuc2hvdWxkSW5jbHVkZVBhdGgoXHJcblx0XHRcdFx0XHRcdFx0XHRmaWxlUGF0aCxcclxuXHRcdFx0XHRcdFx0XHRcdFwiaW5saW5lXCJcclxuXHRcdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdFx0OiB0cnVlO1xyXG5cdFx0XHRcdFx0XHRpZiAoIWluY2x1ZGVJbmxpbmUpIHtcclxuXHRcdFx0XHRcdFx0XHR1cGRhdGVzLnNldChmaWxlUGF0aCwgW10pO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBHZXQgZmlsZSBtb2RpZmljYXRpb24gdGltZSBmb3IgY2FjaGluZ1xyXG5cdFx0XHRcdFx0XHRjb25zdCBmaWxlU3RhdCA9IGF3YWl0IHRoaXMudmF1bHQuYWRhcHRlci5zdGF0KFxyXG5cdFx0XHRcdFx0XHRcdGZpbGVQYXRoXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdGNvbnN0IG10aW1lID0gZmlsZVN0YXQ/Lm10aW1lO1xyXG5cdFx0XHRcdFx0XHRjb25zdCBmaWxlQ29udGVudCA9IGF3YWl0IHRoaXMudmF1bHQuY2FjaGVkUmVhZChmaWxlKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIFN0b3JlIHBhcnNlZCB0YXNrcyB3aXRoIG10aW1lIChjYW4gaGFwcGVuIGluIHBhcmFsbGVsKVxyXG5cdFx0XHRcdFx0XHRjb25zdCBzdG9yZVByb21pc2UgPSB0aGlzLnN0b3JhZ2Uuc3RvcmVSYXcoXHJcblx0XHRcdFx0XHRcdFx0ZmlsZVBhdGgsXHJcblx0XHRcdFx0XHRcdFx0cmF3VGFza3MsXHJcblx0XHRcdFx0XHRcdFx0ZmlsZUNvbnRlbnQsXHJcblx0XHRcdFx0XHRcdFx0bXRpbWVcclxuXHRcdFx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIEdldCBwcm9qZWN0IGRhdGEgZm9yIGF1Z21lbnRhdGlvbiAoYWxyZWFkeSBjb21wdXRpbmcgaW4gcGFyYWxsZWwpXHJcblx0XHRcdFx0XHRcdGNvbnN0IHByb2plY3REYXRhID0gYXdhaXQgcHJvamVjdERhdGFQcm9taXNlcy5nZXQoXHJcblx0XHRcdFx0XHRcdFx0ZmlsZVBhdGhcclxuXHRcdFx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIFdhaXQgZm9yIHN0b3JhZ2UgdG8gY29tcGxldGVcclxuXHRcdFx0XHRcdFx0YXdhaXQgc3RvcmVQcm9taXNlO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gQXVnbWVudCB0YXNrcyB3aXRoIHByb2plY3QgZGF0YVxyXG5cdFx0XHRcdFx0XHRjb25zdCBmaWxlTWV0YWRhdGEgPVxyXG5cdFx0XHRcdFx0XHRcdHRoaXMubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk7XHJcblx0XHRcdFx0XHRcdGNvbnN0IGF1Z21lbnRDb250ZXh0OiBBdWdtZW50Q29udGV4dCA9IHtcclxuXHRcdFx0XHRcdFx0XHRmaWxlUGF0aCxcclxuXHRcdFx0XHRcdFx0XHRmaWxlTWV0YTogZmlsZU1ldGFkYXRhPy5mcm9udG1hdHRlciB8fCB7fSxcclxuXHRcdFx0XHRcdFx0XHRwcm9qZWN0TmFtZTogcHJvamVjdERhdGE/LnRnUHJvamVjdD8ubmFtZSxcclxuXHRcdFx0XHRcdFx0XHRwcm9qZWN0TWV0YTogcHJvamVjdERhdGFcclxuXHRcdFx0XHRcdFx0XHRcdD8ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHQuLi4ocHJvamVjdERhdGEuZW5oYW5jZWRNZXRhZGF0YSB8fCB7fSksXHJcblx0XHRcdFx0XHRcdFx0XHRcdHRnUHJvamVjdDogcHJvamVjdERhdGEudGdQcm9qZWN0LCAvLyBJbmNsdWRlIHRnUHJvamVjdCBpbiBwcm9qZWN0TWV0YVxyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0OiB7fSxcclxuXHRcdFx0XHRcdFx0XHR0YXNrczogcmF3VGFza3MsXHJcblx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHRcdGNvbnN0IGF1Z21lbnRlZFRhc2tzID0gYXdhaXQgdGhpcy5hdWdtZW50b3IubWVyZ2UoXHJcblx0XHRcdFx0XHRcdFx0YXVnbWVudENvbnRleHRcclxuXHRcdFx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIEFsd2F5cyB1cGRhdGUgZm9yIG5ld2x5IHBhcnNlZCBmaWxlc1xyXG5cdFx0XHRcdFx0XHR1cGRhdGVzLnNldChmaWxlUGF0aCwgYXVnbWVudGVkVGFza3MpO1xyXG5cdFx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcclxuXHRcdFx0XHRcdFx0XHRgRXJyb3IgcHJvY2Vzc2luZyBwYXJzZWQgcmVzdWx0IGZvciAke2ZpbGVQYXRofTpgLFxyXG5cdFx0XHRcdFx0XHRcdGVycm9yXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdGBbRGF0YWZsb3dPcmNoZXN0cmF0b3JdIFdvcmtlciBwcm9jZXNzaW5nIGNvbXBsZXRlLCBwYXJzZWQgJHtwYXJzZWRSZXN1bHRzLnNpemV9IGZpbGVzYFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcihcclxuXHRcdFx0XHRcdFwiW0RhdGFmbG93T3JjaGVzdHJhdG9yXSBXb3JrZXIgcHJvY2Vzc2luZyBmYWlsZWQsIGZhbGxpbmcgYmFjayB0byBzZXF1ZW50aWFsOlwiLFxyXG5cdFx0XHRcdFx0ZXJyb3JcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdC8vIEZhbGwgYmFjayB0byBzZXF1ZW50aWFsIHByb2Nlc3NpbmdcclxuXHRcdFx0XHRhd2FpdCB0aGlzLnByb2Nlc3NCYXRjaFNlcXVlbnRpYWwoZmlsZXMsIHVwZGF0ZXMsIHNraXBwZWRDb3VudCk7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIFVzZSBzZXF1ZW50aWFsIHByb2Nlc3NpbmcgZm9yIHNtYWxsIGJhdGNoZXMgb3Igd2hlbiB3b3JrZXJzIGFyZSBkaXNhYmxlZFxyXG5cdFx0XHRhd2FpdCB0aGlzLnByb2Nlc3NCYXRjaFNlcXVlbnRpYWwoZmlsZXMsIHVwZGF0ZXMsIHNraXBwZWRDb3VudCk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHNraXBwZWRDb3VudCA+IDApIHtcclxuXHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0YFtEYXRhZmxvd09yY2hlc3RyYXRvcl0gU2tpcHBlZCAke3NraXBwZWRDb3VudH0gdW5jaGFuZ2VkIGZpbGVzYFxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFVwZGF0ZSByZXBvc2l0b3J5IGluIGJhdGNoXHJcblx0XHRpZiAodXBkYXRlcy5zaXplID4gMCkge1xyXG5cdFx0XHQvLyBHZW5lcmF0ZSBhIHVuaXF1ZSBzZXF1ZW5jZSBmb3IgdGhpcyBiYXRjaCBvcGVyYXRpb25cclxuXHRcdFx0dGhpcy5sYXN0UHJvY2Vzc2VkU2VxID0gU2VxLm5leHQoKTtcclxuXHJcblx0XHRcdC8vIFBhc3Mgb3VyIHNlcXVlbmNlIHRvIHJlcG9zaXRvcnkgdG8gdHJhY2sgZXZlbnQgb3JpZ2luXHJcblx0XHRcdGF3YWl0IHRoaXMucmVwb3NpdG9yeS51cGRhdGVCYXRjaCh1cGRhdGVzLCB0aGlzLmxhc3RQcm9jZXNzZWRTZXEpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUHJvY2VzcyBmaWxlcyBzZXF1ZW50aWFsbHkgKGZhbGxiYWNrIG9yIGZvciBzbWFsbCBiYXRjaGVzKVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgcHJvY2Vzc0JhdGNoU2VxdWVudGlhbChcclxuXHRcdGZpbGVzOiBURmlsZVtdLFxyXG5cdFx0dXBkYXRlczogTWFwPHN0cmluZywgVGFza1tdPixcclxuXHRcdHNraXBwZWRDb3VudDogbnVtYmVyXHJcblx0KTogUHJvbWlzZTxudW1iZXI+IHtcclxuXHRcdGxldCBsb2NhbFNraXBwZWRDb3VudCA9IDA7XHJcblxyXG5cdFx0Zm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Y29uc3QgZmlsZVBhdGggPSBmaWxlLnBhdGg7XHJcblxyXG5cdFx0XHRcdC8vIEdldCBmaWxlIG1vZGlmaWNhdGlvbiB0aW1lXHJcblx0XHRcdFx0Y29uc3QgZmlsZVN0YXQgPSBhd2FpdCB0aGlzLnZhdWx0LmFkYXB0ZXIuc3RhdChmaWxlLnBhdGgpO1xyXG5cdFx0XHRcdGNvbnN0IG10aW1lID0gZmlsZVN0YXQ/Lm10aW1lO1xyXG5cclxuXHRcdFx0XHQvLyBDaGVjayBpZiB3ZSBjYW4gc2tpcCB0aGlzIGZpbGUgYmFzZWQgb24gY2FjaGVkIGRhdGFcclxuXHRcdFx0XHRjb25zdCByYXdDYWNoZWQgPSBhd2FpdCB0aGlzLnN0b3JhZ2UubG9hZFJhdyhmaWxlUGF0aCk7XHJcblx0XHRcdFx0Y29uc3QgZmlsZUNvbnRlbnQgPSBhd2FpdCB0aGlzLnZhdWx0LmNhY2hlZFJlYWQoZmlsZSk7XHJcblxyXG5cdFx0XHRcdC8vIEFwcGx5IGlubGluZSBmaWxlIGZpbHRlciBlYXJseSBmb3IgYWxsIGJyYW5jaGVzXHJcblx0XHRcdFx0Y29uc3QgaW5jbHVkZUlubGluZUVhcmx5ID0gdGhpcy5maWxlRmlsdGVyTWFuYWdlclxyXG5cdFx0XHRcdFx0PyB0aGlzLmZpbGVGaWx0ZXJNYW5hZ2VyLnNob3VsZEluY2x1ZGVQYXRoKFxyXG5cdFx0XHRcdFx0XHRmaWxlUGF0aCxcclxuXHRcdFx0XHRcdFx0XCJpbmxpbmVcIlxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0OiB0cnVlO1xyXG5cdFx0XHRcdGlmICghaW5jbHVkZUlubGluZUVhcmx5KSB7XHJcblx0XHRcdFx0XHR1cGRhdGVzLnNldChmaWxlUGF0aCwgW10pO1xyXG5cdFx0XHRcdFx0bG9jYWxTa2lwcGVkQ291bnQrKztcclxuXHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gQ2hlY2sgYm90aCByYXcgYW5kIGF1Z21lbnRlZCBjYWNoZVxyXG5cdFx0XHRcdGNvbnN0IGF1Z21lbnRlZENhY2hlZCA9IGF3YWl0IHRoaXMuc3RvcmFnZS5sb2FkQXVnbWVudGVkKFxyXG5cdFx0XHRcdFx0ZmlsZVBhdGhcclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRyYXdDYWNoZWQgJiZcclxuXHRcdFx0XHRcdGF1Z21lbnRlZENhY2hlZCAmJlxyXG5cdFx0XHRcdFx0dGhpcy5zdG9yYWdlLmlzUmF3VmFsaWQoXHJcblx0XHRcdFx0XHRcdGZpbGVQYXRoLFxyXG5cdFx0XHRcdFx0XHRyYXdDYWNoZWQsXHJcblx0XHRcdFx0XHRcdGZpbGVDb250ZW50LFxyXG5cdFx0XHRcdFx0XHRtdGltZVxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0Ly8gVXNlIGNhY2hlZCBhdWdtZW50ZWQgdGFza3MgZGlyZWN0bHkgLSBubyBuZWVkIHRvIHJlLWF1Z21lbnRcclxuXHRcdFx0XHRcdGNvbnN0IGF1Z21lbnRlZFRhc2tzID0gYXVnbWVudGVkQ2FjaGVkLmRhdGE7XHJcblxyXG5cdFx0XHRcdFx0Ly8gQWx3YXlzIGFkZCB0byB1cGRhdGVzIC0gUmVwb3NpdG9yeSB3aWxsIGhhbmRsZSBjaGFuZ2UgZGV0ZWN0aW9uXHJcblx0XHRcdFx0XHR1cGRhdGVzLnNldChmaWxlUGF0aCwgYXVnbWVudGVkVGFza3MpO1xyXG5cdFx0XHRcdFx0bG9jYWxTa2lwcGVkQ291bnQrKzsgLy8gQ291bnQgYXMgc2tpcHBlZCBzaW5jZSB3ZSB1c2VkIGNhY2hlXHJcblx0XHRcdFx0fSBlbHNlIGlmIChcclxuXHRcdFx0XHRcdHJhd0NhY2hlZCAmJlxyXG5cdFx0XHRcdFx0dGhpcy5zdG9yYWdlLmlzUmF3VmFsaWQoXHJcblx0XHRcdFx0XHRcdGZpbGVQYXRoLFxyXG5cdFx0XHRcdFx0XHRyYXdDYWNoZWQsXHJcblx0XHRcdFx0XHRcdGZpbGVDb250ZW50LFxyXG5cdFx0XHRcdFx0XHRtdGltZVxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0Ly8gSGF2ZSByYXcgY2FjaGUgYnV0IG5vdCBhdWdtZW50ZWQsIG5lZWQgdG8gcmUtYXVnbWVudFxyXG5cdFx0XHRcdFx0Y29uc3QgcmF3VGFza3MgPSByYXdDYWNoZWQuZGF0YTtcclxuXHJcblx0XHRcdFx0XHQvLyBHZXQgcHJvamVjdCBkYXRhXHJcblx0XHRcdFx0XHRjb25zdCBwcm9qZWN0RGF0YSA9IGF3YWl0IHRoaXMucHJvamVjdFJlc29sdmVyLmdldChcclxuXHRcdFx0XHRcdFx0ZmlsZVBhdGhcclxuXHRcdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gQXVnbWVudCB0YXNrc1xyXG5cdFx0XHRcdFx0Y29uc3QgZmlsZU1ldGFkYXRhID0gdGhpcy5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKTtcclxuXHRcdFx0XHRcdGNvbnN0IGF1Z21lbnRDb250ZXh0OiBBdWdtZW50Q29udGV4dCA9IHtcclxuXHRcdFx0XHRcdFx0ZmlsZVBhdGgsXHJcblx0XHRcdFx0XHRcdGZpbGVNZXRhOiBmaWxlTWV0YWRhdGE/LmZyb250bWF0dGVyIHx8IHt9LFxyXG5cdFx0XHRcdFx0XHRwcm9qZWN0TmFtZTogcHJvamVjdERhdGEudGdQcm9qZWN0Py5uYW1lLFxyXG5cdFx0XHRcdFx0XHRwcm9qZWN0TWV0YToge1xyXG5cdFx0XHRcdFx0XHRcdC4uLnByb2plY3REYXRhLmVuaGFuY2VkTWV0YWRhdGEsXHJcblx0XHRcdFx0XHRcdFx0dGdQcm9qZWN0OiBwcm9qZWN0RGF0YS50Z1Byb2plY3QsIC8vIEluY2x1ZGUgdGdQcm9qZWN0IGluIHByb2plY3RNZXRhXHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdHRhc2tzOiByYXdUYXNrcyxcclxuXHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHRjb25zdCBhdWdtZW50ZWRUYXNrcyA9IGF3YWl0IHRoaXMuYXVnbWVudG9yLm1lcmdlKFxyXG5cdFx0XHRcdFx0XHRhdWdtZW50Q29udGV4dFxyXG5cdFx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0XHQvLyBBbHdheXMgYWRkIHRvIHVwZGF0ZXMgLSBSZXBvc2l0b3J5IHdpbGwgaGFuZGxlIGNoYW5nZSBkZXRlY3Rpb25cclxuXHRcdFx0XHRcdHVwZGF0ZXMuc2V0KGZpbGVQYXRoLCBhdWdtZW50ZWRUYXNrcyk7XHJcblx0XHRcdFx0XHRsb2NhbFNraXBwZWRDb3VudCsrOyAvLyBDb3VudCBhcyBza2lwcGVkIHNpbmNlIHdlIHVzZWQgY2FjaGVcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0Ly8gUGFyc2UgZmlsZSBhcyBpdCBoYXMgY2hhbmdlZCBvciBpcyBuZXdcclxuXHRcdFx0XHRcdC8vIEdldCBwcm9qZWN0IGRhdGEgZmlyc3QgZm9yIHBhcnNpbmdcclxuXHRcdFx0XHRcdGNvbnN0IHByb2plY3REYXRhID0gYXdhaXQgdGhpcy5wcm9qZWN0UmVzb2x2ZXIuZ2V0KFxyXG5cdFx0XHRcdFx0XHRmaWxlUGF0aFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdC8vIEFwcGx5IGZpbGUgZmlsdGVyIHNjb3BlOiBza2lwIGlubGluZSBwYXJzaW5nIHdoZW4gc2NvcGUgPT09ICdmaWxlJ1xyXG5cdFx0XHRcdFx0Y29uc3QgaW5jbHVkZUlubGluZSA9IHRoaXMuZmlsZUZpbHRlck1hbmFnZXJcclxuXHRcdFx0XHRcdFx0PyB0aGlzLmZpbGVGaWx0ZXJNYW5hZ2VyLnNob3VsZEluY2x1ZGVQYXRoKFxyXG5cdFx0XHRcdFx0XHRcdGZpbGVQYXRoLFxyXG5cdFx0XHRcdFx0XHRcdFwiaW5saW5lXCJcclxuXHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHQ6IHRydWU7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdFx0XCJbRGF0YWZsb3dPcmNoZXN0cmF0b3JdIElubGluZSBmaWx0ZXIgZGVjaXNpb25cIixcclxuXHRcdFx0XHRcdFx0e2ZpbGVQYXRoLCBpbmNsdWRlSW5saW5lfVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdGNvbnN0IHJhd1Rhc2tzID0gaW5jbHVkZUlubGluZVxyXG5cdFx0XHRcdFx0XHQ/IGF3YWl0IHRoaXMucGFyc2VGaWxlKGZpbGUsIHByb2plY3REYXRhLnRnUHJvamVjdClcclxuXHRcdFx0XHRcdFx0OiBbXTtcclxuXHJcblx0XHRcdFx0XHQvLyBTdG9yZSByYXcgdGFza3Mgd2l0aCBtdGltZVxyXG5cdFx0XHRcdFx0YXdhaXQgdGhpcy5zdG9yYWdlLnN0b3JlUmF3KFxyXG5cdFx0XHRcdFx0XHRmaWxlUGF0aCxcclxuXHRcdFx0XHRcdFx0cmF3VGFza3MsXHJcblx0XHRcdFx0XHRcdGZpbGVDb250ZW50LFxyXG5cdFx0XHRcdFx0XHRtdGltZVxyXG5cdFx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0XHQvLyBBdWdtZW50IHRhc2tzXHJcblx0XHRcdFx0XHRjb25zdCBmaWxlTWV0YWRhdGEgPSB0aGlzLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpO1xyXG5cdFx0XHRcdFx0Y29uc3QgYXVnbWVudENvbnRleHQ6IEF1Z21lbnRDb250ZXh0ID0ge1xyXG5cdFx0XHRcdFx0XHRmaWxlUGF0aCxcclxuXHRcdFx0XHRcdFx0ZmlsZU1ldGE6IGZpbGVNZXRhZGF0YT8uZnJvbnRtYXR0ZXIgfHwge30sXHJcblx0XHRcdFx0XHRcdHByb2plY3ROYW1lOiBwcm9qZWN0RGF0YS50Z1Byb2plY3Q/Lm5hbWUsXHJcblx0XHRcdFx0XHRcdHByb2plY3RNZXRhOiB7XHJcblx0XHRcdFx0XHRcdFx0Li4ucHJvamVjdERhdGEuZW5oYW5jZWRNZXRhZGF0YSxcclxuXHRcdFx0XHRcdFx0XHR0Z1Byb2plY3Q6IHByb2plY3REYXRhLnRnUHJvamVjdCwgLy8gSW5jbHVkZSB0Z1Byb2plY3QgaW4gcHJvamVjdE1ldGFcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0dGFza3M6IHJhd1Rhc2tzLFxyXG5cdFx0XHRcdFx0fTtcclxuXHRcdFx0XHRcdGNvbnN0IGF1Z21lbnRlZFRhc2tzID0gYXdhaXQgdGhpcy5hdWdtZW50b3IubWVyZ2UoXHJcblx0XHRcdFx0XHRcdGF1Z21lbnRDb250ZXh0XHJcblx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdHVwZGF0ZXMuc2V0KGZpbGVQYXRoLCBhdWdtZW50ZWRUYXNrcyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXHJcblx0XHRcdFx0XHRgRXJyb3IgcHJvY2Vzc2luZyBmaWxlICR7ZmlsZS5wYXRofSBzZXF1ZW50aWFsbHk6YCxcclxuXHRcdFx0XHRcdGVycm9yXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBsb2NhbFNraXBwZWRDb3VudDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbW92ZSBhIGZpbGUgZnJvbSB0aGUgaW5kZXhcclxuXHQgKi9cclxuXHRhc3luYyByZW1vdmVGaWxlKGZpbGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGF3YWl0IHRoaXMucmVwb3NpdG9yeS5yZW1vdmVGaWxlKGZpbGVQYXRoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSBmaWxlIHJlbmFtZVxyXG5cdCAqL1xyXG5cdGFzeW5jIHJlbmFtZUZpbGUob2xkUGF0aDogc3RyaW5nLCBuZXdQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdC8vIFJlbW92ZSBvbGQgZmlsZVxyXG5cdFx0YXdhaXQgdGhpcy5yZW1vdmVGaWxlKG9sZFBhdGgpO1xyXG5cclxuXHRcdC8vIFByb2Nlc3MgbmV3IGZpbGVcclxuXHRcdGNvbnN0IGZpbGUgPSB0aGlzLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChuZXdQYXRoKTtcclxuXHRcdGlmIChmaWxlIGluc3RhbmNlb2YgVEZpbGUpIHtcclxuXHRcdFx0YXdhaXQgdGhpcy5wcm9jZXNzRmlsZShmaWxlKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsZWFyIGFsbCBkYXRhIGFuZCByZWJ1aWxkXHJcblx0ICovXHJcblx0YXN5bmMgcmVidWlsZCgpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdC8vIENsZWFyIGFsbCBkYXRhXHJcblx0XHRhd2FpdCB0aGlzLnJlcG9zaXRvcnkuY2xlYXIoKTtcclxuXHJcblx0XHQvLyBQcm9jZXNzIGFsbCBtYXJrZG93biBhbmQgY2FudmFzIGZpbGVzXHJcblx0XHRjb25zdCBmaWxlcyA9IHRoaXMudmF1bHQuZ2V0TWFya2Rvd25GaWxlcygpO1xyXG5cdFx0Y29uc3QgY2FudmFzRmlsZXMgPSB0aGlzLnZhdWx0XHJcblx0XHRcdC5nZXRGaWxlcygpXHJcblx0XHRcdC5maWx0ZXIoKGYpID0+IGYuZXh0ZW5zaW9uID09PSBcImNhbnZhc1wiKTtcclxuXHJcblx0XHRjb25zdCBhbGxGaWxlcyA9IFsuLi5maWxlcywgLi4uY2FudmFzRmlsZXNdO1xyXG5cclxuXHRcdC8vIFByb2Nlc3MgaW4gYmF0Y2hlcyBmb3IgcGVyZm9ybWFuY2VcclxuXHRcdGNvbnN0IEJBVENIX1NJWkUgPSA1MDtcclxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgYWxsRmlsZXMubGVuZ3RoOyBpICs9IEJBVENIX1NJWkUpIHtcclxuXHRcdFx0Y29uc3QgYmF0Y2ggPSBhbGxGaWxlcy5zbGljZShpLCBpICsgQkFUQ0hfU0laRSk7XHJcblx0XHRcdGF3YWl0IHRoaXMucHJvY2Vzc0JhdGNoKGJhdGNoKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBQZXJzaXN0IHRoZSByZWJ1aWx0IGluZGV4XHJcblx0XHRhd2FpdCB0aGlzLnJlcG9zaXRvcnkucGVyc2lzdCgpO1xyXG5cclxuXHRcdC8vIEVtaXQgcmVhZHkgZXZlbnRcclxuXHRcdGVtaXQodGhpcy5hcHAsIEV2ZW50cy5DQUNIRV9SRUFEWSwge1xyXG5cdFx0XHRpbml0aWFsOiBmYWxzZSxcclxuXHRcdFx0dGltZXN0YW1wOiBEYXRlLm5vdygpLFxyXG5cdFx0XHRzZXE6IFNlcS5uZXh0KCksXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSBzZXR0aW5ncyBjaGFuZ2VcclxuXHQgKi9cclxuXHRhc3luYyBvblNldHRpbmdzQ2hhbmdlKHNjb3Blczogc3RyaW5nW10pOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdC8vIENsZWFyIHJlbGV2YW50IGNhY2hlcyBiYXNlZCBvbiBzY29wZVxyXG5cdFx0aWYgKHNjb3Blcy5pbmNsdWRlcyhcInBhcnNlclwiKSkge1xyXG5cdFx0XHRhd2FpdCB0aGlzLnN0b3JhZ2UuY2xlYXJOYW1lc3BhY2UoXCJyYXdcIik7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHNjb3Blcy5pbmNsdWRlcyhcImF1Z21lbnRcIikgfHwgc2NvcGVzLmluY2x1ZGVzKFwicHJvamVjdFwiKSkge1xyXG5cdFx0XHRhd2FpdCB0aGlzLnN0b3JhZ2UuY2xlYXJOYW1lc3BhY2UoXCJhdWdtZW50ZWRcIik7XHJcblx0XHRcdGF3YWl0IHRoaXMuc3RvcmFnZS5jbGVhck5hbWVzcGFjZShcInByb2plY3RcIik7XHJcblx0XHRcdHRoaXMucHJvamVjdFJlc29sdmVyLmNsZWFyQ2FjaGUoKTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoc2NvcGVzLmluY2x1ZGVzKFwiaW5kZXhcIikpIHtcclxuXHRcdFx0YXdhaXQgdGhpcy5zdG9yYWdlLmNsZWFyTmFtZXNwYWNlKFwiY29uc29saWRhdGVkXCIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEVtaXQgc2V0dGluZ3MgY2hhbmdlZCBldmVudFxyXG5cdFx0ZW1pdCh0aGlzLmFwcCwgRXZlbnRzLlNFVFRJTkdTX0NIQU5HRUQsIHtcclxuXHRcdFx0c2NvcGVzLFxyXG5cdFx0XHR0aW1lc3RhbXA6IERhdGUubm93KCksXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBUcmlnZ2VyIHJlYnVpbGQgaWYgbmVlZGVkXHJcblx0XHRpZiAoc2NvcGVzLnNvbWUoKHMpID0+IFtcInBhcnNlclwiLCBcImF1Z21lbnRcIiwgXCJwcm9qZWN0XCJdLmluY2x1ZGVzKHMpKSkge1xyXG5cdFx0XHRhd2FpdCB0aGlzLnJlYnVpbGQoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBwcm9qZWN0IGNvbmZpZ3VyYXRpb24gb3B0aW9uc1xyXG5cdCAqL1xyXG5cdHVwZGF0ZVByb2plY3RPcHRpb25zKG9wdGlvbnM6IFBhcnRpYWw8UHJvamVjdENvbmZpZ01hbmFnZXJPcHRpb25zPik6IHZvaWQge1xyXG5cdFx0dGhpcy5wcm9qZWN0UmVzb2x2ZXIudXBkYXRlT3B0aW9ucyhvcHRpb25zKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0aGUgcXVlcnkgQVBJIGZvciBleHRlcm5hbCBhY2Nlc3NcclxuXHQgKi9cclxuXHRnZXRRdWVyeUFQSSgpOiBRdWVyeUFQSSB7XHJcblx0XHRyZXR1cm4gdGhpcy5xdWVyeUFQSTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0aGUgcmVwb3NpdG9yeSBmb3IgZGlyZWN0IGFjY2Vzc1xyXG5cdCAqL1xyXG5cdGdldFJlcG9zaXRvcnkoKTogUmVwb3NpdG9yeSB7XHJcblx0XHRyZXR1cm4gdGhpcy5yZXBvc2l0b3J5O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHN0YXRpc3RpY3MgYWJvdXQgdGhlIGRhdGFmbG93IHN5c3RlbVxyXG5cdCAqL1xyXG5cdGFzeW5jIGdldFN0YXRzKCk6IFByb21pc2U8e1xyXG5cdFx0aW5kZXhTdGF0czogYW55O1xyXG5cdFx0c3RvcmFnZVN0YXRzOiBhbnk7XHJcblx0XHRxdWV1ZVNpemU6IG51bWJlcjtcclxuXHRcdHdvcmtlclN0YXRzPzogYW55O1xyXG5cdFx0c291cmNlU3RhdHM/OiBhbnk7XHJcblx0fT4ge1xyXG5cdFx0Y29uc3QgaW5kZXhTdGF0cyA9IGF3YWl0IHRoaXMucXVlcnlBUEkuZ2V0U3VtbWFyeSgpO1xyXG5cdFx0Y29uc3Qgc3RvcmFnZVN0YXRzID0gYXdhaXQgdGhpcy5zdG9yYWdlLmdldFN0YXRzKCk7XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0aW5kZXhTdGF0cyxcclxuXHRcdFx0c3RvcmFnZVN0YXRzLFxyXG5cdFx0XHRxdWV1ZVNpemU6IHRoaXMucHJvY2Vzc2luZ1F1ZXVlLnNpemUsXHJcblx0XHRcdHdvcmtlclN0YXRzOiB0aGlzLndvcmtlck9yY2hlc3RyYXRvci5nZXRNZXRyaWNzKCksXHJcblx0XHRcdHNvdXJjZVN0YXRzOiB0aGlzLm9ic2lkaWFuU291cmNlLmdldFN0YXRzKCksXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHRoZSB3b3JrZXIgb3JjaGVzdHJhdG9yIGZvciBhZHZhbmNlZCB3b3JrZXIgbWFuYWdlbWVudFxyXG5cdCAqL1xyXG5cdGdldFdvcmtlck9yY2hlc3RyYXRvcigpOiBXb3JrZXJPcmNoZXN0cmF0b3Ige1xyXG5cdFx0cmV0dXJuIHRoaXMud29ya2VyT3JjaGVzdHJhdG9yO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHRoZSBPYnNpZGlhbiBzb3VyY2UgZm9yIGV2ZW50IG1hbmFnZW1lbnRcclxuXHQgKi9cclxuXHRnZXRPYnNpZGlhblNvdXJjZSgpOiBPYnNpZGlhblNvdXJjZSB7XHJcblx0XHRyZXR1cm4gdGhpcy5vYnNpZGlhblNvdXJjZTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0aGUgYXVnbWVudG9yIGZvciBpbmhlcml0YW5jZSBzdHJhdGVneSBtYW5hZ2VtZW50XHJcblx0ICovXHJcblx0Z2V0QXVnbWVudG9yKCk6IEF1Z21lbnRvciB7XHJcblx0XHRyZXR1cm4gdGhpcy5hdWdtZW50b3I7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDbGVhbnVwIHJlc291cmNlc1xyXG5cdCAqL1xyXG5cdGFzeW5jIGNsZWFudXAoKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHQvLyBDbGVhciBhbGwgcGVuZGluZyB0aW1lb3V0c1xyXG5cdFx0Zm9yIChjb25zdCB0aW1lb3V0IG9mIHRoaXMucHJvY2Vzc2luZ1F1ZXVlLnZhbHVlcygpKSB7XHJcblx0XHRcdGNsZWFyVGltZW91dCh0aW1lb3V0KTtcclxuXHRcdH1cclxuXHRcdHRoaXMucHJvY2Vzc2luZ1F1ZXVlLmNsZWFyKCk7XHJcblxyXG5cdFx0Ly8gVW5zdWJzY3JpYmUgZnJvbSBldmVudHNcclxuXHRcdC8vIFRoZXNlIGFyZSB3b3Jrc3BhY2UgZXZlbnRzIGNyZWF0ZWQgYnkgb3VyIGN1c3RvbSBFdmVudHMub24oKSBmdW5jdGlvblxyXG5cdFx0Zm9yIChjb25zdCByZWYgb2YgdGhpcy5ldmVudFJlZnMpIHtcclxuXHRcdFx0Ly8gVXNlIHdvcmtzcGFjZS5vZmZyZWYgZm9yIHdvcmtzcGFjZSBldmVudHNcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHRoaXMuYXBwLndvcmtzcGFjZSAmJlxyXG5cdFx0XHRcdHR5cGVvZiB0aGlzLmFwcC53b3Jrc3BhY2Uub2ZmcmVmID09PSBcImZ1bmN0aW9uXCJcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0dGhpcy5hcHAud29ya3NwYWNlLm9mZnJlZihyZWYpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHR0aGlzLmV2ZW50UmVmcyA9IFtdO1xyXG5cclxuXHRcdC8vIENsZWFudXAgT2JzaWRpYW5Tb3VyY2VcclxuXHRcdHRoaXMub2JzaWRpYW5Tb3VyY2UuZGVzdHJveSgpO1xyXG5cclxuXHRcdC8vIENsZWFudXAgSWNzU291cmNlXHJcblx0XHR0aGlzLmljc1NvdXJjZS5kZXN0cm95KCk7XHJcblxyXG5cdFx0Ly8gQ2xlYW51cCBGaWxlU291cmNlXHJcblx0XHRpZiAodGhpcy5maWxlU291cmNlKSB7XHJcblx0XHRcdHRoaXMuZmlsZVNvdXJjZS5kZXN0cm95KCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2xlYW51cCBXb3JrZXJPcmNoZXN0cmF0b3JcclxuXHRcdHRoaXMud29ya2VyT3JjaGVzdHJhdG9yLmRlc3Ryb3koKTtcclxuXHJcblx0XHQvLyBDbGVhbnVwIHJlcG9zaXRvcnkgYW5kIHBlcnNpc3QgY3VycmVudCBzdGF0ZVxyXG5cdFx0YXdhaXQgdGhpcy5yZXBvc2l0b3J5LmNsZWFudXAoKTtcclxuXHR9XHJcbn1cclxuIl19