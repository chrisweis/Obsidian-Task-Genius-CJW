/**
 * FileSource - Main implementation for FileSource feature
 *
 * This source integrates files as tasks into the dataflow architecture.
 * It follows the same patterns as ObsidianSource and IcsSource.
 */
import { __awaiter } from "tslib";
import { Events, emit, Seq, on } from "../events/Events";
import { FileSourceConfig } from "./FileSourceConfig";
/**
 * FileSource - Independent event source for file-based tasks
 *
 * Subscribes to file events and transforms qualifying files into tasks
 * following the established dataflow patterns.
 */
export class FileSource {
    constructor(app, initialConfig, fileFilterManager) {
        this.app = app;
        this.fileFilterManager = fileFilterManager;
        this.isInitialized = false;
        this.lastUpdateSeq = 0;
        // Event references for cleanup
        this.eventRefs = [];
        // Cache for tracking file task state
        this.fileTaskCache = new Map();
        // Debouncing for rapid changes
        this.pendingUpdates = new Map();
        this.DEBOUNCE_DELAY = 300; // ms
        // Statistics tracking
        this.stats = {
            initialized: false,
            trackedFileCount: 0,
            recognitionBreakdown: {
                metadata: 0,
                tag: 0,
                template: 0,
                path: 0,
            },
            lastUpdate: 0,
            lastUpdateSeq: 0,
        };
        this.config = new FileSourceConfig(initialConfig);
    }
    /**
     * Initialize FileSource and start listening for events
     */
    initialize() {
        if (this.isInitialized)
            return;
        if (!this.config.isEnabled())
            return;
        console.log("[FileSource] Initializing FileSource...");
        // Subscribe to configuration changes
        this.config.onChange((newConfig) => {
            this.handleConfigChange(newConfig);
        });
        // Subscribe to file events
        this.subscribeToFileEvents();
        // Delay initial scan to ensure vault is fully loaded
        setTimeout(() => {
            this.performInitialScan();
        }, 1000); // 1 second delay
        this.isInitialized = true;
        this.stats.initialized = true;
        console.log(`[FileSource] Initialized with strategies: ${this.config
            .getEnabledStrategies()
            .join(", ")}`);
    }
    /**
     * Subscribe to relevant file events
     */
    subscribeToFileEvents() {
        // Subscribe to FILE_UPDATED events from ObsidianSource
        this.eventRefs.push(on(this.app, Events.FILE_UPDATED, (payload) => {
            if (payload === null || payload === void 0 ? void 0 : payload.path) {
                this.handleFileUpdate(payload.path, payload.reason);
            }
        }));
        // Subscribe to more granular events if they exist
        // These would be added to Events.ts later in Phase 2
        this.eventRefs.push(on(this.app, "task-genius:file-metadata-changed", (payload) => {
            if (payload === null || payload === void 0 ? void 0 : payload.path) {
                this.handleFileMetadataChange(payload.path);
            }
        }));
        this.eventRefs.push(on(this.app, "task-genius:file-content-changed", (payload) => {
            if (payload === null || payload === void 0 ? void 0 : payload.path) {
                this.handleFileContentChange(payload.path);
            }
        }));
    }
    /**
     * Handle file update events with debouncing
     */
    handleFileUpdate(filePath, reason) {
        if (!this.isInitialized || !this.config.isEnabled())
            return;
        const relevant = this.isRelevantFile(filePath);
        if (!relevant)
            return;
        // Clear existing timeout for this file
        const existingTimeout = this.pendingUpdates.get(filePath);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }
        // Set new debounced timeout
        const timeout = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            this.pendingUpdates.delete(filePath);
            try {
                yield this.processFileUpdate(filePath, reason);
            }
            catch (error) {
                console.error(`[FileSource] Error processing file update for ${filePath}:`, error);
            }
        }), this.DEBOUNCE_DELAY);
        this.pendingUpdates.set(filePath, timeout);
    }
    /**
     * Handle granular metadata changes (Phase 2 enhancement)
     */
    handleFileMetadataChange(filePath) {
        if (!this.shouldUpdateFileTask(filePath, "metadata"))
            return;
        this.handleFileUpdate(filePath, "frontmatter");
    }
    /**
     * Handle granular content changes (Phase 2 enhancement)
     */
    handleFileContentChange(filePath) {
        if (!this.shouldUpdateFileTask(filePath, "content"))
            return;
        this.handleFileUpdate(filePath, "modify");
    }
    /**
     * Process a file update and determine if it should be a file task
     */
    processFileUpdate(filePath, reason) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (reason === "delete") {
                yield this.removeFileTask(filePath);
                return;
            }
            const shouldBeTask = yield this.shouldCreateFileTask(filePath);
            const existingCache = this.fileTaskCache.get(filePath);
            const wasTask = (_a = existingCache === null || existingCache === void 0 ? void 0 : existingCache.fileTaskExists) !== null && _a !== void 0 ? _a : false;
            if (shouldBeTask && !wasTask) {
                // File should become a task
                yield this.createFileTask(filePath);
            }
            else if (shouldBeTask && wasTask) {
                // File is already a task, check if it needs updating
                yield this.updateFileTask(filePath);
            }
            else if (!shouldBeTask && wasTask) {
                // File should no longer be a task
                yield this.removeFileTask(filePath);
            }
        });
    }
    /**
     * Check if a file should be treated as a task
     */
    shouldCreateFileTask(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            // Fast reject non-relevant files before any IO
            if (!this.isRelevantFile(filePath))
                return false;
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (!file)
                return false;
            try {
                const fileContent = yield this.app.vault.cachedRead(file);
                const fileCache = this.app.metadataCache.getFileCache(file);
                return this.evaluateRecognitionStrategies(filePath, fileContent, fileCache);
            }
            catch (error) {
                console.error(`[FileSource] Error reading file ${filePath}:`, error);
                return false;
            }
        });
    }
    /**
     * Evaluate all enabled recognition strategies
     */
    evaluateRecognitionStrategies(filePath, fileContent, fileCache) {
        const config = this.config.getConfig();
        const { recognitionStrategies } = config;
        // Check metadata strategy
        if (recognitionStrategies.metadata.enabled) {
            if (this.matchesMetadataStrategy(filePath, fileContent, fileCache, recognitionStrategies.metadata)) {
                return true;
            }
        }
        // Check tag strategy
        if (recognitionStrategies.tags.enabled) {
            if (this.matchesTagStrategy(filePath, fileContent, fileCache, recognitionStrategies.tags)) {
                return true;
            }
        }
        // Check template strategy (Phase 2)
        if (recognitionStrategies.templates.enabled) {
            if (this.matchesTemplateStrategy(filePath, fileContent, fileCache, recognitionStrategies.templates)) {
                return true;
            }
        }
        // Check path strategy (Phase 2)
        if (recognitionStrategies.paths.enabled) {
            if (this.matchesPathStrategy(filePath, fileContent, fileCache, recognitionStrategies.paths)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Check if file matches metadata strategy
     */
    matchesMetadataStrategy(filePath, fileContent, fileCache, config) {
        if (!(fileCache === null || fileCache === void 0 ? void 0 : fileCache.frontmatter))
            return false;
        const { taskFields, requireAllFields } = config;
        const frontmatter = fileCache.frontmatter;
        const matchingFields = taskFields.filter((field) => frontmatter.hasOwnProperty(field) &&
            frontmatter[field] !== undefined);
        if (requireAllFields) {
            return matchingFields.length === taskFields.length;
        }
        else {
            return matchingFields.length > 0;
        }
    }
    /**
     * Check if file matches tag strategy
     */
    matchesTagStrategy(filePath, fileContent, fileCache, config) {
        if (!(fileCache === null || fileCache === void 0 ? void 0 : fileCache.tags))
            return false;
        const { taskTags, matchMode } = config;
        const fileTags = fileCache.tags.map((tag) => tag.tag);
        return taskTags.some((taskTag) => {
            return fileTags.some((fileTag) => {
                switch (matchMode) {
                    case "exact":
                        return fileTag === taskTag;
                    case "prefix":
                        return fileTag.startsWith(taskTag);
                    case "contains":
                        return fileTag.includes(taskTag);
                    default:
                        return fileTag === taskTag;
                }
            });
        });
    }
    /**
     * Check if file matches template strategy
     */
    matchesTemplateStrategy(filePath, fileContent, fileCache, config) {
        if (!config.enabled ||
            !config.templatePaths ||
            config.templatePaths.length === 0) {
            return false;
        }
        // Check if file matches any template path
        return config.templatePaths.some((templatePath) => {
            // Check direct path inclusion
            if (filePath.includes(templatePath)) {
                return true;
            }
            // Check frontmatter template references
            if (config.checkTemplateMetadata && (fileCache === null || fileCache === void 0 ? void 0 : fileCache.frontmatter)) {
                const frontmatter = fileCache.frontmatter;
                return (frontmatter.template === templatePath ||
                    frontmatter.templateFile === templatePath ||
                    frontmatter.templatePath === templatePath);
            }
            return false;
        });
    }
    /**
     * Check if file matches path strategy
     */
    matchesPathStrategy(filePath, fileContent, fileCache, config) {
        if (!config.enabled ||
            !config.taskPaths ||
            config.taskPaths.length === 0) {
            return false;
        }
        // Normalize path (use forward slashes)
        const normalizedPath = filePath.replace(/\\/g, "/");
        // Check each configured path pattern
        for (const pattern of config.taskPaths) {
            const normalizedPattern = pattern.replace(/\\/g, "/");
            switch (config.matchMode) {
                case "prefix":
                    if (normalizedPath.startsWith(normalizedPattern)) {
                        console.log(`[FileSource] Path matches prefix pattern: ${pattern} for ${filePath}`);
                        return true;
                    }
                    break;
                case "regex":
                    try {
                        const regex = new RegExp(normalizedPattern);
                        if (regex.test(normalizedPath)) {
                            console.log(`[FileSource] Path matches regex pattern: ${pattern} for ${filePath}`);
                            return true;
                        }
                    }
                    catch (e) {
                        console.warn(`[FileSource] Invalid regex pattern: ${pattern}`, e);
                    }
                    break;
                case "glob":
                    if (this.matchGlobPattern(normalizedPath, normalizedPattern)) {
                        console.log(`[FileSource] Path matches glob pattern: ${pattern} for ${filePath}`);
                        return true;
                    }
                    break;
            }
        }
        return false;
    }
    /**
     * Match a path against a glob pattern
     * Supports: * (any chars except /), ** (any chars), ? (single char)
     */
    matchGlobPattern(path, pattern) {
        // Convert glob pattern to regular expression
        let regexPattern = pattern
            .replace(/[.+^${}()|[\]\\]/g, "\\$&") // Escape special chars
            .replace(/\*\*/g, "§§§") // Temporary placeholder for **
            .replace(/\*/g, "[^/]*") // * matches any chars except /
            .replace(/§§§/g, ".*") // ** matches any chars
            .replace(/\?/g, "[^/]"); // ? matches single char
        // If pattern ends with /, match all files in that directory
        if (pattern.endsWith("/")) {
            regexPattern = `^${regexPattern}.*`;
        }
        else {
            regexPattern = `^${regexPattern}$`;
        }
        try {
            const regex = new RegExp(regexPattern);
            return regex.test(path);
        }
        catch (e) {
            console.warn(`[FileSource] Failed to compile glob pattern: ${pattern}`, e);
            return false;
        }
    }
    /**
     * Create a new file task
     */
    createFileTask(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (!file)
                return null;
            try {
                const fileContent = yield this.app.vault.cachedRead(file);
                const fileCache = this.app.metadataCache.getFileCache(file);
                const fileTask = yield this.buildFileTask(filePath, fileContent, fileCache);
                if (!fileTask)
                    return null;
                // Update cache
                this.updateFileTaskCache(filePath, fileTask);
                // Update statistics
                this.updateStatistics(fileTask.metadata.recognitionStrategy, 1);
                // Emit file task event
                this.emitFileTaskUpdate("created", fileTask);
                return fileTask;
            }
            catch (error) {
                console.error(`[FileSource] Error creating file task for ${filePath}:`, error);
                return null;
            }
        });
    }
    /**
     * Update an existing file task
     */
    updateFileTask(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            // For Phase 1, just recreate the task
            // Phase 2 will add smart update detection
            return yield this.createFileTask(filePath);
        });
    }
    /**
     * Remove a file task
     */
    removeFileTask(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            const existingCache = this.fileTaskCache.get(filePath);
            if (!(existingCache === null || existingCache === void 0 ? void 0 : existingCache.fileTaskExists))
                return;
            // Remove from cache
            this.fileTaskCache.delete(filePath);
            // Update statistics
            this.stats.trackedFileCount = Math.max(0, this.stats.trackedFileCount - 1);
            // Emit removal event
            const seq = Seq.next();
            this.lastUpdateSeq = seq;
            emit(this.app, Events.FILE_TASK_REMOVED, {
                filePath,
                timestamp: Date.now(),
                seq,
            });
            console.log(`[FileSource] Removed file task: ${filePath}`);
        });
    }
    /**
     * Build a file task from file data
     */
    buildFileTask(filePath, fileContent, fileCache) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = this.config.getConfig();
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (!file)
                return null;
            // Determine which strategy matched
            const strategy = this.getMatchingStrategy(filePath, fileContent, fileCache);
            if (!strategy)
                return null;
            // Generate task content based on configuration
            const content = this.generateTaskContent(filePath, fileContent, fileCache);
            const safeContent = typeof content === "string"
                ? content
                : filePath.split("/").pop() || filePath;
            // Extract metadata from frontmatter
            const metadata = this.extractTaskMetadata(filePath, fileContent, fileCache, strategy);
            // Create the file task
            const fileTask = {
                id: `file-source:${filePath}`,
                content: safeContent,
                filePath,
                line: 0,
                completed: metadata.status === "x" || metadata.status === "X",
                status: metadata.status || config.fileTaskProperties.defaultStatus,
                originalMarkdown: `**${safeContent}**`,
                metadata: Object.assign(Object.assign({}, metadata), { source: "file-source", recognitionStrategy: strategy.name, recognitionCriteria: strategy.criteria, fileTimestamps: {
                        created: file.stat.ctime,
                        modified: file.stat.mtime,
                    }, childTasks: [], tags: metadata.tags || [], children: [] }),
            };
            return fileTask;
        });
    }
    /**
     * Get the matching recognition strategy for a file
     */
    getMatchingStrategy(filePath, fileContent, fileCache) {
        const config = this.config.getConfig();
        if (config.recognitionStrategies.metadata.enabled &&
            this.matchesMetadataStrategy(filePath, fileContent, fileCache, config.recognitionStrategies.metadata)) {
            return { name: "metadata", criteria: "frontmatter" };
        }
        if (config.recognitionStrategies.tags.enabled &&
            this.matchesTagStrategy(filePath, fileContent, fileCache, config.recognitionStrategies.tags)) {
            return { name: "tag", criteria: "file-tags" };
        }
        // Check path strategy
        if (config.recognitionStrategies.paths.enabled &&
            this.matchesPathStrategy(filePath, fileContent, fileCache, config.recognitionStrategies.paths)) {
            return {
                name: "path",
                criteria: config.recognitionStrategies.paths.taskPaths.join(", "),
            };
        }
        // Template-based recognition
        const templateConfig = config.recognitionStrategies.templates;
        if (templateConfig.enabled && templateConfig.templatePaths.length > 0) {
            // Check if file matches any template path
            const matchesTemplate = templateConfig.templatePaths.some((templatePath) => {
                var _a, _b;
                // Simple path matching - could be enhanced with more sophisticated matching
                return (filePath.includes(templatePath) ||
                    ((_a = fileCache === null || fileCache === void 0 ? void 0 : fileCache.frontmatter) === null || _a === void 0 ? void 0 : _a.template) === templatePath ||
                    ((_b = fileCache === null || fileCache === void 0 ? void 0 : fileCache.frontmatter) === null || _b === void 0 ? void 0 : _b.templateFile) === templatePath);
            });
            if (matchesTemplate) {
                return {
                    name: "template",
                    criteria: templateConfig.templatePaths.join(", "),
                };
            }
        }
        return null;
    }
    /**
     * Generate task content based on configuration
     */
    generateTaskContent(filePath, fileContent, fileCache) {
        var _a, _b, _c, _d, _e;
        const config = this.config.getConfig().fileTaskProperties;
        const fileName = filePath.split("/").pop() || filePath;
        const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
        switch (config.contentSource) {
            case "filename":
                // If user prefers frontmatter title, show it over filename
                if (config.preferFrontmatterTitle &&
                    ((_a = fileCache === null || fileCache === void 0 ? void 0 : fileCache.frontmatter) === null || _a === void 0 ? void 0 : _a.title)) {
                    return fileCache.frontmatter.title;
                }
                return config.stripExtension ? fileNameWithoutExt : fileName;
            case "title":
                // Always prefer frontmatter title if available, fallback to filename without extension
                return (((_b = fileCache === null || fileCache === void 0 ? void 0 : fileCache.frontmatter) === null || _b === void 0 ? void 0 : _b.title) ||
                    fileNameWithoutExt);
            case "h1":
                const h1 = (_c = fileCache === null || fileCache === void 0 ? void 0 : fileCache.headings) === null || _c === void 0 ? void 0 : _c.find((h) => h.level === 1);
                return (h1 === null || h1 === void 0 ? void 0 : h1.heading) || fileNameWithoutExt;
            case "custom":
                if (config.customContentField && (fileCache === null || fileCache === void 0 ? void 0 : fileCache.frontmatter)) {
                    const val = fileCache.frontmatter[config.customContentField];
                    if (val)
                        return val;
                    // If custom field not present, optionally prefer frontmatter title
                    if (config.preferFrontmatterTitle &&
                        fileCache.frontmatter.title) {
                        return fileCache.frontmatter.title;
                    }
                    return fileNameWithoutExt;
                }
                // No custom field specified: optionally prefer frontmatter title
                if (config.preferFrontmatterTitle &&
                    ((_d = fileCache === null || fileCache === void 0 ? void 0 : fileCache.frontmatter) === null || _d === void 0 ? void 0 : _d.title)) {
                    return fileCache.frontmatter.title;
                }
                return fileNameWithoutExt;
            default:
                // Default to respecting preferFrontmatterTitle when available
                if (config.preferFrontmatterTitle &&
                    ((_e = fileCache === null || fileCache === void 0 ? void 0 : fileCache.frontmatter) === null || _e === void 0 ? void 0 : _e.title)) {
                    return fileCache.frontmatter.title;
                }
                return config.stripExtension ? fileNameWithoutExt : fileName;
        }
    }
    /**
     * Extract task metadata from file
     */
    extractTaskMetadata(filePath, fileContent, fileCache, strategy) {
        var _a, _b;
        const config = this.config.getConfig();
        const frontmatter = (fileCache === null || fileCache === void 0 ? void 0 : fileCache.frontmatter) || {};
        // Derive status from frontmatter and eagerly map textual metadata to a symbol
        const rawStatus = (_a = frontmatter.status) !== null && _a !== void 0 ? _a : "";
        const toSymbol = (val) => {
            if (!val)
                return config.fileTaskProperties.defaultStatus;
            // Already a single-character mark
            if (val.length === 1)
                return val;
            const sm = this.config.getConfig().statusMapping;
            const target = sm.caseSensitive ? val : String(val).toLowerCase();
            // Try configured metadata->symbol table first
            for (const [k, sym] of Object.entries(sm.metadataToSymbol || {})) {
                const key = sm.caseSensitive ? k : k.toLowerCase();
                if (key === target)
                    return sym;
            }
            // Fallback to common defaults to be robust
            const defaults = {
                completed: "x",
                done: "x",
                finished: "x",
                "in-progress": "/",
                "in progress": "/",
                doing: "/",
                planned: "?",
                todo: "?",
                cancelled: "-",
                canceled: "-",
                "not-started": " ",
                "not started": " ",
            };
            const norm = String(val).toLowerCase();
            if (defaults[norm] !== undefined)
                return defaults[norm];
            return config.fileTaskProperties.defaultStatus;
        };
        let status = rawStatus
            ? toSymbol(rawStatus)
            : config.fileTaskProperties.defaultStatus;
        if (rawStatus && status !== rawStatus) {
            console.log(`[FileSource] Mapped status '${rawStatus}' to '${status}' for ${filePath}`);
        }
        // TODO: Future enhancement - read frontmatter.repeat and map into FileSourceTaskMetadata (e.g., as recurrence)
        // Extract standard task metadata
        const metadata = {
            dueDate: this.parseDate(frontmatter.dueDate || frontmatter.due),
            startDate: this.parseDate(frontmatter.startDate || frontmatter.start),
            scheduledDate: this.parseDate(frontmatter.scheduledDate || frontmatter.scheduled),
            priority: frontmatter.priority ||
                config.fileTaskProperties.defaultPriority,
            project: frontmatter.project,
            context: frontmatter.context,
            area: frontmatter.area,
            tags: ((_b = fileCache === null || fileCache === void 0 ? void 0 : fileCache.tags) === null || _b === void 0 ? void 0 : _b.map((tag) => tag.tag)) || [],
            status: status,
            children: [],
        };
        return metadata;
    }
    /**
     * Convert a task symbol back to metadata value for file updates
     * This will be used in Phase 3 when implementing file task updates
     */
    mapSymbolToFileMetadata(symbol) {
        const config = this.config.getConfig();
        if (!config.statusMapping.enabled) {
            return symbol;
        }
        // Map symbol back to preferred metadata value
        return this.config.mapSymbolToMetadata(symbol);
    }
    /**
     * Parse date from various formats
     */
    parseDate(dateValue) {
        if (!dateValue)
            return undefined;
        if (typeof dateValue === "number") {
            return dateValue;
        }
        if (typeof dateValue === "string") {
            const parsed = Date.parse(dateValue);
            return isNaN(parsed) ? undefined : parsed;
        }
        if (dateValue instanceof Date) {
            return dateValue.getTime();
        }
        return undefined;
    }
    /**
     * Update file task cache
     */
    updateFileTaskCache(filePath, task) {
        const frontmatterHash = this.generateFrontmatterHash(filePath);
        this.fileTaskCache.set(filePath, {
            fileTaskExists: true,
            frontmatterHash,
            childTaskIds: new Set(task.metadata.childTasks || []),
            lastUpdated: Date.now(),
        });
    }
    /**
     * Generate hash for frontmatter for change detection
     */
    generateFrontmatterHash(filePath) {
        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (!file)
            return "";
        const fileCache = this.app.metadataCache.getFileCache(file);
        if (!(fileCache === null || fileCache === void 0 ? void 0 : fileCache.frontmatter))
            return "";
        // Simple hash of frontmatter JSON
        const frontmatterStr = JSON.stringify(fileCache.frontmatter, Object.keys(fileCache.frontmatter).sort());
        return this.simpleHash(frontmatterStr);
    }
    /**
     * Simple hash function
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }
    /**
     * Check if file needs updating (stub for Phase 2)
     */
    shouldUpdateFileTask(filePath, changeType) {
        // Simple check for Phase 1 - always update if file is tracked
        return this.fileTaskCache.has(filePath);
    }
    /**
     * Update statistics
     */
    updateStatistics(strategy, delta) {
        this.stats.recognitionBreakdown[strategy] += delta;
        this.stats.trackedFileCount += delta;
        this.stats.lastUpdate = Date.now();
        this.stats.lastUpdateSeq = this.lastUpdateSeq;
    }
    /**
     * Emit file task update event
     */
    emitFileTaskUpdate(action, task) {
        const seq = Seq.next();
        this.lastUpdateSeq = seq;
        emit(this.app, Events.FILE_TASK_UPDATED, {
            action,
            task,
            timestamp: Date.now(),
            seq,
        });
        console.log(`[FileSource] File task ${action}: ${task.filePath}`);
    }
    /**
     * Check if file is relevant for processing
     */
    isRelevantFile(filePath) {
        // Fast-path filters first
        // Only process markdown files for now (additional file type support can be added later)
        if (!filePath.endsWith(".md")) {
            return false;
        }
        // Skip system/hidden files
        if (filePath.startsWith(".") || filePath.includes("/.")) {
            return false;
        }
        // Apply centralized FileFilterManager for 'file' scope filtering if available
        if (this.fileFilterManager) {
            const include = this.fileFilterManager.shouldIncludePath(filePath, "file");
            if (!include)
                return false;
        }
        return true;
    }
    /**
     * Perform initial scan of existing files
     */
    performInitialScan() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("[FileSource] Performing initial scan...");
            const mdFiles = this.app.vault.getMarkdownFiles();
            console.log(`[FileSource] Found ${mdFiles.length} markdown files to check`);
            let scannedCount = 0;
            let taskCount = 0;
            let relevantCount = 0;
            for (const file of mdFiles) {
                if (this.isRelevantFile(file.path)) {
                    relevantCount++;
                    try {
                        const shouldBeTask = yield this.shouldCreateFileTask(file.path);
                        if (shouldBeTask) {
                            const task = yield this.createFileTask(file.path);
                            if (task) {
                                taskCount++;
                            }
                        }
                        scannedCount++;
                    }
                    catch (error) {
                        console.error(`[FileSource] Error scanning ${file.path}:`, error);
                    }
                }
            }
            console.log(`[FileSource] Initial scan complete: ${mdFiles.length} total files, ${relevantCount} relevant, ${scannedCount} scanned, ${taskCount} file tasks created`);
            if (taskCount === 0 && relevantCount > 0) {
                console.log(`[FileSource] No file tasks created. Check if your files match the configured recognition strategies:`);
                const config = this.config.getConfig();
                if (config.recognitionStrategies.metadata.enabled) {
                    console.log(`[FileSource] - Metadata strategy: requires frontmatter with fields: ${config.recognitionStrategies.metadata.taskFields.join(", ")}`);
                }
                if (config.recognitionStrategies.tags.enabled) {
                    console.log(`[FileSource] - Tag strategy: requires tags: ${config.recognitionStrategies.tags.taskTags.join(", ")}`);
                }
                if (config.recognitionStrategies.paths.enabled) {
                    console.log(`[FileSource] - Path strategy: requires files in paths: ${config.recognitionStrategies.paths.taskPaths.join(", ")}`);
                }
            }
        });
    }
    /**
     * Handle configuration changes
     */
    handleConfigChange(newConfig) {
        if (!newConfig.enabled && this.isInitialized) {
            // FileSource is being disabled
            this.destroy();
            return;
        }
        if (newConfig.enabled && !this.isInitialized) {
            // FileSource is being enabled
            this.initialize();
            return;
        }
        // Configuration changed while active - might need to rescan
        // This is a Phase 2 enhancement
        console.log("[FileSource] Configuration updated");
    }
    /**
     * Get current statistics
     */
    getStats() {
        return Object.assign({}, this.stats);
    }
    /**
     * Get all file tasks (stub for Phase 2)
     */
    getAllFileTasks() {
        return __awaiter(this, void 0, void 0, function* () {
            // This will be implemented properly in Phase 3 with Repository integration
            return [];
        });
    }
    /**
     * Update configuration
     */
    updateConfiguration(config) {
        this.config.updateConfig(config);
    }
    /**
     * Sync FileSource status mapping from plugin TaskStatus settings
     */
    syncStatusMappingFromSettings(taskStatuses) {
        try {
            this.config.syncWithTaskStatuses(taskStatuses);
        }
        catch (e) {
            console.warn("[FileSource] Failed to sync status mapping from settings", e);
        }
    }
    /**
     * Alias for updateConfiguration to match expected interface
     */
    updateConfig(config) {
        this.updateConfiguration(config);
    }
    /**
     * Force refresh of all file tasks
     */
    refresh() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isInitialized || !this.config.isEnabled())
                return;
            // Clear cache and re-scan
            this.fileTaskCache.clear();
            this.stats.trackedFileCount = 0;
            this.stats.recognitionBreakdown = {
                metadata: 0,
                tag: 0,
                template: 0,
                path: 0,
            };
            yield this.performInitialScan();
        });
    }
    /**
     * Cleanup and destroy FileSource
     */
    destroy() {
        if (!this.isInitialized)
            return;
        console.log("[FileSource] Destroying FileSource...");
        // Clear all debouncing timeouts
        for (const timeout of this.pendingUpdates.values()) {
            clearTimeout(timeout);
        }
        this.pendingUpdates.clear();
        // Clear event listeners
        for (const ref of this.eventRefs) {
            this.app.vault.offref(ref);
        }
        this.eventRefs = [];
        // Clear cache
        this.fileTaskCache.clear();
        // Reset statistics
        this.stats = {
            initialized: false,
            trackedFileCount: 0,
            recognitionBreakdown: { metadata: 0, tag: 0, template: 0, path: 0 },
            lastUpdate: 0,
            lastUpdateSeq: 0,
        };
        // Emit cleanup event
        emit(this.app, Events.FILE_TASK_REMOVED, {
            filePath: null,
            timestamp: Date.now(),
            seq: Seq.next(),
            destroyed: true,
        });
        this.isInitialized = false;
        console.log("[FileSource] Cleanup complete");
    }
    /**
     * Cleanup resources and stop listening to events
     */
    cleanup() {
        // Unsubscribe from all events
        this.eventRefs.forEach((ref) => {
            if (this.app.workspace &&
                typeof this.app.workspace.offref === "function") {
                this.app.workspace.offref(ref);
            }
        });
        this.eventRefs = [];
        // Clear pending updates
        this.pendingUpdates.forEach((timeout) => clearTimeout(timeout));
        this.pendingUpdates.clear();
        // Clear cache
        this.fileTaskCache.clear();
        // Reset state
        this.isInitialized = false;
        this.stats.initialized = false;
        console.log("[FileSource] Cleaned up and stopped");
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmlsZVNvdXJjZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkZpbGVTb3VyY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7O0dBS0c7O0FBY0gsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBSXREOzs7OztHQUtHO0FBQ0gsTUFBTSxPQUFPLFVBQVU7SUE2QnRCLFlBQ1MsR0FBUSxFQUNoQixhQUFnRCxFQUN4QyxpQkFBcUM7UUFGckMsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUVSLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUE5QnRDLGtCQUFhLEdBQUcsS0FBSyxDQUFDO1FBQ3RCLGtCQUFhLEdBQUcsQ0FBQyxDQUFDO1FBRTFCLCtCQUErQjtRQUN2QixjQUFTLEdBQWUsRUFBRSxDQUFDO1FBRW5DLHFDQUFxQztRQUM3QixrQkFBYSxHQUFHLElBQUksR0FBRyxFQUF5QixDQUFDO1FBRXpELCtCQUErQjtRQUN2QixtQkFBYyxHQUFHLElBQUksR0FBRyxFQUEwQixDQUFDO1FBQzFDLG1CQUFjLEdBQUcsR0FBRyxDQUFDLENBQUMsS0FBSztRQUU1QyxzQkFBc0I7UUFDZCxVQUFLLEdBQW9CO1lBQ2hDLFdBQVcsRUFBRSxLQUFLO1lBQ2xCLGdCQUFnQixFQUFFLENBQUM7WUFDbkIsb0JBQW9CLEVBQUU7Z0JBQ3JCLFFBQVEsRUFBRSxDQUFDO2dCQUNYLEdBQUcsRUFBRSxDQUFDO2dCQUNOLFFBQVEsRUFBRSxDQUFDO2dCQUNYLElBQUksRUFBRSxDQUFDO2FBQ1A7WUFDRCxVQUFVLEVBQUUsQ0FBQztZQUNiLGFBQWEsRUFBRSxDQUFDO1NBQ2hCLENBQUM7UUFPRCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksZ0JBQWdCLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDbkQsQ0FB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LENBQUM7SUFDcEQsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEZpbGVTb3VyY2UgLSBNYWluIGltcGxlbWVudGF0aW9uIGZvciBGaWxlU291cmNlIGZlYXR1cmVcclxuICpcclxuICogVGhpcyBzb3VyY2UgaW50ZWdyYXRlcyBmaWxlcyBhcyB0YXNrcyBpbnRvIHRoZSBkYXRhZmxvdyBhcmNoaXRlY3R1cmUuXHJcbiAqIEl0IGZvbGxvd3MgdGhlIHNhbWUgcGF0dGVybnMgYXMgT2JzaWRpYW5Tb3VyY2UgYW5kIEljc1NvdXJjZS5cclxuICovXHJcblxyXG5pbXBvcnQgdHlwZSB7IEFwcCwgVEZpbGUsIEV2ZW50UmVmLCBDYWNoZWRNZXRhZGF0YSB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgdHlwZSB7IFRhc2sgfSBmcm9tIFwiQC90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB0eXBlIHtcclxuXHRGaWxlU291cmNlQ29uZmlndXJhdGlvbixcclxuXHRGaWxlU291cmNlVGFza01ldGFkYXRhLFxyXG5cdEZpbGVTb3VyY2VTdGF0cyxcclxuXHRGaWxlVGFza0NhY2hlLFxyXG5cdFJlY29nbml0aW9uU3RyYXRlZ3ksXHJcblx0UGF0aFJlY29nbml0aW9uQ29uZmlnLFxyXG5cdFRlbXBsYXRlUmVjb2duaXRpb25Db25maWcsXHJcbn0gZnJvbSBcIkAvdHlwZXMvZmlsZS1zb3VyY2VcIjtcclxuXHJcbmltcG9ydCB7IEV2ZW50cywgZW1pdCwgU2VxLCBvbiB9IGZyb20gXCIuLi9ldmVudHMvRXZlbnRzXCI7XHJcbmltcG9ydCB7IEZpbGVTb3VyY2VDb25maWcgfSBmcm9tIFwiLi9GaWxlU291cmNlQ29uZmlnXCI7XHJcblxyXG5pbXBvcnQgeyBGaWxlRmlsdGVyTWFuYWdlciB9IGZyb20gXCJAL21hbmFnZXJzL2ZpbGUtZmlsdGVyLW1hbmFnZXJcIjtcclxuXHJcbi8qKlxyXG4gKiBGaWxlU291cmNlIC0gSW5kZXBlbmRlbnQgZXZlbnQgc291cmNlIGZvciBmaWxlLWJhc2VkIHRhc2tzXHJcbiAqXHJcbiAqIFN1YnNjcmliZXMgdG8gZmlsZSBldmVudHMgYW5kIHRyYW5zZm9ybXMgcXVhbGlmeWluZyBmaWxlcyBpbnRvIHRhc2tzXHJcbiAqIGZvbGxvd2luZyB0aGUgZXN0YWJsaXNoZWQgZGF0YWZsb3cgcGF0dGVybnMuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgRmlsZVNvdXJjZSB7XHJcblx0cHJpdmF0ZSBjb25maWc6IEZpbGVTb3VyY2VDb25maWc7XHJcblx0cHJpdmF0ZSBpc0luaXRpYWxpemVkID0gZmFsc2U7XHJcblx0cHJpdmF0ZSBsYXN0VXBkYXRlU2VxID0gMDtcclxuXHJcblx0Ly8gRXZlbnQgcmVmZXJlbmNlcyBmb3IgY2xlYW51cFxyXG5cdHByaXZhdGUgZXZlbnRSZWZzOiBFdmVudFJlZltdID0gW107XHJcblxyXG5cdC8vIENhY2hlIGZvciB0cmFja2luZyBmaWxlIHRhc2sgc3RhdGVcclxuXHRwcml2YXRlIGZpbGVUYXNrQ2FjaGUgPSBuZXcgTWFwPHN0cmluZywgRmlsZVRhc2tDYWNoZT4oKTtcclxuXHJcblx0Ly8gRGVib3VuY2luZyBmb3IgcmFwaWQgY2hhbmdlc1xyXG5cdHByaXZhdGUgcGVuZGluZ1VwZGF0ZXMgPSBuZXcgTWFwPHN0cmluZywgTm9kZUpTLlRpbWVvdXQ+KCk7XHJcblx0cHJpdmF0ZSByZWFkb25seSBERUJPVU5DRV9ERUxBWSA9IDMwMDsgLy8gbXNcclxuXHJcblx0Ly8gU3RhdGlzdGljcyB0cmFja2luZ1xyXG5cdHByaXZhdGUgc3RhdHM6IEZpbGVTb3VyY2VTdGF0cyA9IHtcclxuXHRcdGluaXRpYWxpemVkOiBmYWxzZSxcclxuXHRcdHRyYWNrZWRGaWxlQ291bnQ6IDAsXHJcblx0XHRyZWNvZ25pdGlvbkJyZWFrZG93bjoge1xyXG5cdFx0XHRtZXRhZGF0YTogMCxcclxuXHRcdFx0dGFnOiAwLFxyXG5cdFx0XHR0ZW1wbGF0ZTogMCxcclxuXHRcdFx0cGF0aDogMCxcclxuXHRcdH0sXHJcblx0XHRsYXN0VXBkYXRlOiAwLFxyXG5cdFx0bGFzdFVwZGF0ZVNlcTogMCxcclxuXHR9O1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHByaXZhdGUgYXBwOiBBcHAsXHJcblx0XHRpbml0aWFsQ29uZmlnPzogUGFydGlhbDxGaWxlU291cmNlQ29uZmlndXJhdGlvbj4sXHJcblx0XHRwcml2YXRlIGZpbGVGaWx0ZXJNYW5hZ2VyPzogRmlsZUZpbHRlck1hbmFnZXJcclxuXHQpIHtcclxuXHRcdHRoaXMuY29uZmlnID0gbmV3IEZpbGVTb3VyY2VDb25maWcoaW5pdGlhbENvbmZpZyk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBJbml0aWFsaXplIEZpbGVTb3VyY2UgYW5kIHN0YXJ0IGxpc3RlbmluZyBmb3IgZXZlbnRzXHJcblx0ICovXHJcblx0aW5pdGlhbGl6ZSgpOiB2b2lkIHtcclxuXHRcdGlmICh0aGlzLmlzSW5pdGlhbGl6ZWQpIHJldHVybjtcclxuXHRcdGlmICghdGhpcy5jb25maWcuaXNFbmFibGVkKCkpIHJldHVybjtcclxuXHJcblx0XHRjb25zb2xlLmxvZyhcIltGaWxlU291cmNlXSBJbml0aWFsaXppbmcgRmlsZVNvdXJjZS4uLlwiKTtcclxuXHJcblx0XHQvLyBTdWJzY3JpYmUgdG8gY29uZmlndXJhdGlvbiBjaGFuZ2VzXHJcblx0XHR0aGlzLmNvbmZpZy5vbkNoYW5nZSgobmV3Q29uZmlnKSA9PiB7XHJcblx0XHRcdHRoaXMuaGFuZGxlQ29uZmlnQ2hhbmdlKG5ld0NvbmZpZyk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBTdWJzY3JpYmUgdG8gZmlsZSBldmVudHNcclxuXHRcdHRoaXMuc3Vic2NyaWJlVG9GaWxlRXZlbnRzKCk7XHJcblxyXG5cdFx0Ly8gRGVsYXkgaW5pdGlhbCBzY2FuIHRvIGVuc3VyZSB2YXVsdCBpcyBmdWxseSBsb2FkZWRcclxuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHR0aGlzLnBlcmZvcm1Jbml0aWFsU2NhbigpO1xyXG5cdFx0fSwgMTAwMCk7IC8vIDEgc2Vjb25kIGRlbGF5XHJcblxyXG5cdFx0dGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcclxuXHRcdHRoaXMuc3RhdHMuaW5pdGlhbGl6ZWQgPSB0cnVlO1xyXG5cclxuXHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRgW0ZpbGVTb3VyY2VdIEluaXRpYWxpemVkIHdpdGggc3RyYXRlZ2llczogJHt0aGlzLmNvbmZpZ1xyXG5cdFx0XHRcdC5nZXRFbmFibGVkU3RyYXRlZ2llcygpXHJcblx0XHRcdFx0LmpvaW4oXCIsIFwiKX1gXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU3Vic2NyaWJlIHRvIHJlbGV2YW50IGZpbGUgZXZlbnRzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBzdWJzY3JpYmVUb0ZpbGVFdmVudHMoKTogdm9pZCB7XHJcblx0XHQvLyBTdWJzY3JpYmUgdG8gRklMRV9VUERBVEVEIGV2ZW50cyBmcm9tIE9ic2lkaWFuU291cmNlXHJcblx0XHR0aGlzLmV2ZW50UmVmcy5wdXNoKFxyXG5cdFx0XHRvbih0aGlzLmFwcCwgRXZlbnRzLkZJTEVfVVBEQVRFRCwgKHBheWxvYWQpID0+IHtcclxuXHRcdFx0XHRpZiAocGF5bG9hZD8ucGF0aCkge1xyXG5cdFx0XHRcdFx0dGhpcy5oYW5kbGVGaWxlVXBkYXRlKHBheWxvYWQucGF0aCwgcGF5bG9hZC5yZWFzb24pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSlcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gU3Vic2NyaWJlIHRvIG1vcmUgZ3JhbnVsYXIgZXZlbnRzIGlmIHRoZXkgZXhpc3RcclxuXHRcdC8vIFRoZXNlIHdvdWxkIGJlIGFkZGVkIHRvIEV2ZW50cy50cyBsYXRlciBpbiBQaGFzZSAyXHJcblx0XHR0aGlzLmV2ZW50UmVmcy5wdXNoKFxyXG5cdFx0XHRvbihcclxuXHRcdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0XHRcInRhc2stZ2VuaXVzOmZpbGUtbWV0YWRhdGEtY2hhbmdlZFwiIGFzIGFueSxcclxuXHRcdFx0XHQocGF5bG9hZCkgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKHBheWxvYWQ/LnBhdGgpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5oYW5kbGVGaWxlTWV0YWRhdGFDaGFuZ2UocGF5bG9hZC5wYXRoKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdClcclxuXHRcdCk7XHJcblxyXG5cdFx0dGhpcy5ldmVudFJlZnMucHVzaChcclxuXHRcdFx0b24oXHJcblx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0XCJ0YXNrLWdlbml1czpmaWxlLWNvbnRlbnQtY2hhbmdlZFwiIGFzIGFueSxcclxuXHRcdFx0XHQocGF5bG9hZCkgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKHBheWxvYWQ/LnBhdGgpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5oYW5kbGVGaWxlQ29udGVudENoYW5nZShwYXlsb2FkLnBhdGgpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0KVxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSBmaWxlIHVwZGF0ZSBldmVudHMgd2l0aCBkZWJvdW5jaW5nXHJcblx0ICovXHJcblx0cHJpdmF0ZSBoYW5kbGVGaWxlVXBkYXRlKGZpbGVQYXRoOiBzdHJpbmcsIHJlYXNvbjogc3RyaW5nKTogdm9pZCB7XHJcblx0XHRpZiAoIXRoaXMuaXNJbml0aWFsaXplZCB8fCAhdGhpcy5jb25maWcuaXNFbmFibGVkKCkpIHJldHVybjtcclxuXHRcdGNvbnN0IHJlbGV2YW50ID0gdGhpcy5pc1JlbGV2YW50RmlsZShmaWxlUGF0aCk7XHJcblxyXG5cdFx0aWYgKCFyZWxldmFudCkgcmV0dXJuO1xyXG5cclxuXHRcdC8vIENsZWFyIGV4aXN0aW5nIHRpbWVvdXQgZm9yIHRoaXMgZmlsZVxyXG5cdFx0Y29uc3QgZXhpc3RpbmdUaW1lb3V0ID0gdGhpcy5wZW5kaW5nVXBkYXRlcy5nZXQoZmlsZVBhdGgpO1xyXG5cdFx0aWYgKGV4aXN0aW5nVGltZW91dCkge1xyXG5cdFx0XHRjbGVhclRpbWVvdXQoZXhpc3RpbmdUaW1lb3V0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTZXQgbmV3IGRlYm91bmNlZCB0aW1lb3V0XHJcblx0XHRjb25zdCB0aW1lb3V0ID0gc2V0VGltZW91dChhc3luYyAoKSA9PiB7XHJcblx0XHRcdHRoaXMucGVuZGluZ1VwZGF0ZXMuZGVsZXRlKGZpbGVQYXRoKTtcclxuXHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0YXdhaXQgdGhpcy5wcm9jZXNzRmlsZVVwZGF0ZShmaWxlUGF0aCwgcmVhc29uKTtcclxuXHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFxyXG5cdFx0XHRcdFx0YFtGaWxlU291cmNlXSBFcnJvciBwcm9jZXNzaW5nIGZpbGUgdXBkYXRlIGZvciAke2ZpbGVQYXRofTpgLFxyXG5cdFx0XHRcdFx0ZXJyb3JcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9LCB0aGlzLkRFQk9VTkNFX0RFTEFZKTtcclxuXHJcblx0XHR0aGlzLnBlbmRpbmdVcGRhdGVzLnNldChmaWxlUGF0aCwgdGltZW91dCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBIYW5kbGUgZ3JhbnVsYXIgbWV0YWRhdGEgY2hhbmdlcyAoUGhhc2UgMiBlbmhhbmNlbWVudClcclxuXHQgKi9cclxuXHRwcml2YXRlIGhhbmRsZUZpbGVNZXRhZGF0YUNoYW5nZShmaWxlUGF0aDogc3RyaW5nKTogdm9pZCB7XHJcblx0XHRpZiAoIXRoaXMuc2hvdWxkVXBkYXRlRmlsZVRhc2soZmlsZVBhdGgsIFwibWV0YWRhdGFcIikpIHJldHVybjtcclxuXHRcdHRoaXMuaGFuZGxlRmlsZVVwZGF0ZShmaWxlUGF0aCwgXCJmcm9udG1hdHRlclwiKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSBncmFudWxhciBjb250ZW50IGNoYW5nZXMgKFBoYXNlIDIgZW5oYW5jZW1lbnQpXHJcblx0ICovXHJcblx0cHJpdmF0ZSBoYW5kbGVGaWxlQ29udGVudENoYW5nZShmaWxlUGF0aDogc3RyaW5nKTogdm9pZCB7XHJcblx0XHRpZiAoIXRoaXMuc2hvdWxkVXBkYXRlRmlsZVRhc2soZmlsZVBhdGgsIFwiY29udGVudFwiKSkgcmV0dXJuO1xyXG5cdFx0dGhpcy5oYW5kbGVGaWxlVXBkYXRlKGZpbGVQYXRoLCBcIm1vZGlmeVwiKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFByb2Nlc3MgYSBmaWxlIHVwZGF0ZSBhbmQgZGV0ZXJtaW5lIGlmIGl0IHNob3VsZCBiZSBhIGZpbGUgdGFza1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgcHJvY2Vzc0ZpbGVVcGRhdGUoXHJcblx0XHRmaWxlUGF0aDogc3RyaW5nLFxyXG5cdFx0cmVhc29uOiBzdHJpbmdcclxuXHQpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGlmIChyZWFzb24gPT09IFwiZGVsZXRlXCIpIHtcclxuXHRcdFx0YXdhaXQgdGhpcy5yZW1vdmVGaWxlVGFzayhmaWxlUGF0aCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBzaG91bGRCZVRhc2sgPSBhd2FpdCB0aGlzLnNob3VsZENyZWF0ZUZpbGVUYXNrKGZpbGVQYXRoKTtcclxuXHRcdGNvbnN0IGV4aXN0aW5nQ2FjaGUgPSB0aGlzLmZpbGVUYXNrQ2FjaGUuZ2V0KGZpbGVQYXRoKTtcclxuXHRcdGNvbnN0IHdhc1Rhc2sgPSBleGlzdGluZ0NhY2hlPy5maWxlVGFza0V4aXN0cyA/PyBmYWxzZTtcclxuXHJcblx0XHRpZiAoc2hvdWxkQmVUYXNrICYmICF3YXNUYXNrKSB7XHJcblx0XHRcdC8vIEZpbGUgc2hvdWxkIGJlY29tZSBhIHRhc2tcclxuXHRcdFx0YXdhaXQgdGhpcy5jcmVhdGVGaWxlVGFzayhmaWxlUGF0aCk7XHJcblx0XHR9IGVsc2UgaWYgKHNob3VsZEJlVGFzayAmJiB3YXNUYXNrKSB7XHJcblx0XHRcdC8vIEZpbGUgaXMgYWxyZWFkeSBhIHRhc2ssIGNoZWNrIGlmIGl0IG5lZWRzIHVwZGF0aW5nXHJcblx0XHRcdGF3YWl0IHRoaXMudXBkYXRlRmlsZVRhc2soZmlsZVBhdGgpO1xyXG5cdFx0fSBlbHNlIGlmICghc2hvdWxkQmVUYXNrICYmIHdhc1Rhc2spIHtcclxuXHRcdFx0Ly8gRmlsZSBzaG91bGQgbm8gbG9uZ2VyIGJlIGEgdGFza1xyXG5cdFx0XHRhd2FpdCB0aGlzLnJlbW92ZUZpbGVUYXNrKGZpbGVQYXRoKTtcclxuXHRcdH1cclxuXHRcdC8vIGVsc2U6IEZpbGUgaXMgbm90IGFuZCBzaG91bGQgbm90IGJlIGEgdGFzaywgZG8gbm90aGluZ1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgYSBmaWxlIHNob3VsZCBiZSB0cmVhdGVkIGFzIGEgdGFza1xyXG5cdCAqL1xyXG5cdGFzeW5jIHNob3VsZENyZWF0ZUZpbGVUYXNrKGZpbGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuXHRcdC8vIEZhc3QgcmVqZWN0IG5vbi1yZWxldmFudCBmaWxlcyBiZWZvcmUgYW55IElPXHJcblx0XHRpZiAoIXRoaXMuaXNSZWxldmFudEZpbGUoZmlsZVBhdGgpKSByZXR1cm4gZmFsc2U7XHJcblxyXG5cdFx0Y29uc3QgZmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChmaWxlUGF0aCkgYXMgVEZpbGU7XHJcblx0XHRpZiAoIWZpbGUpIHJldHVybiBmYWxzZTtcclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBmaWxlQ29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNhY2hlZFJlYWQoZmlsZSk7XHJcblx0XHRcdGNvbnN0IGZpbGVDYWNoZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpO1xyXG5cclxuXHRcdFx0cmV0dXJuIHRoaXMuZXZhbHVhdGVSZWNvZ25pdGlvblN0cmF0ZWdpZXMoXHJcblx0XHRcdFx0ZmlsZVBhdGgsXHJcblx0XHRcdFx0ZmlsZUNvbnRlbnQsXHJcblx0XHRcdFx0ZmlsZUNhY2hlXHJcblx0XHRcdCk7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFxyXG5cdFx0XHRcdGBbRmlsZVNvdXJjZV0gRXJyb3IgcmVhZGluZyBmaWxlICR7ZmlsZVBhdGh9OmAsXHJcblx0XHRcdFx0ZXJyb3JcclxuXHRcdFx0KTtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRXZhbHVhdGUgYWxsIGVuYWJsZWQgcmVjb2duaXRpb24gc3RyYXRlZ2llc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgZXZhbHVhdGVSZWNvZ25pdGlvblN0cmF0ZWdpZXMoXHJcblx0XHRmaWxlUGF0aDogc3RyaW5nLFxyXG5cdFx0ZmlsZUNvbnRlbnQ6IHN0cmluZyxcclxuXHRcdGZpbGVDYWNoZTogQ2FjaGVkTWV0YWRhdGEgfCBudWxsXHJcblx0KTogYm9vbGVhbiB7XHJcblx0XHRjb25zdCBjb25maWcgPSB0aGlzLmNvbmZpZy5nZXRDb25maWcoKTtcclxuXHRcdGNvbnN0IHtyZWNvZ25pdGlvblN0cmF0ZWdpZXN9ID0gY29uZmlnO1xyXG5cclxuXHRcdC8vIENoZWNrIG1ldGFkYXRhIHN0cmF0ZWd5XHJcblx0XHRpZiAocmVjb2duaXRpb25TdHJhdGVnaWVzLm1ldGFkYXRhLmVuYWJsZWQpIHtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHRoaXMubWF0Y2hlc01ldGFkYXRhU3RyYXRlZ3koXHJcblx0XHRcdFx0XHRmaWxlUGF0aCxcclxuXHRcdFx0XHRcdGZpbGVDb250ZW50LFxyXG5cdFx0XHRcdFx0ZmlsZUNhY2hlLFxyXG5cdFx0XHRcdFx0cmVjb2duaXRpb25TdHJhdGVnaWVzLm1ldGFkYXRhXHJcblx0XHRcdFx0KVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENoZWNrIHRhZyBzdHJhdGVneVxyXG5cdFx0aWYgKHJlY29nbml0aW9uU3RyYXRlZ2llcy50YWdzLmVuYWJsZWQpIHtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHRoaXMubWF0Y2hlc1RhZ1N0cmF0ZWd5KFxyXG5cdFx0XHRcdFx0ZmlsZVBhdGgsXHJcblx0XHRcdFx0XHRmaWxlQ29udGVudCxcclxuXHRcdFx0XHRcdGZpbGVDYWNoZSxcclxuXHRcdFx0XHRcdHJlY29nbml0aW9uU3RyYXRlZ2llcy50YWdzXHJcblx0XHRcdFx0KVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENoZWNrIHRlbXBsYXRlIHN0cmF0ZWd5IChQaGFzZSAyKVxyXG5cdFx0aWYgKHJlY29nbml0aW9uU3RyYXRlZ2llcy50ZW1wbGF0ZXMuZW5hYmxlZCkge1xyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0dGhpcy5tYXRjaGVzVGVtcGxhdGVTdHJhdGVneShcclxuXHRcdFx0XHRcdGZpbGVQYXRoLFxyXG5cdFx0XHRcdFx0ZmlsZUNvbnRlbnQsXHJcblx0XHRcdFx0XHRmaWxlQ2FjaGUsXHJcblx0XHRcdFx0XHRyZWNvZ25pdGlvblN0cmF0ZWdpZXMudGVtcGxhdGVzXHJcblx0XHRcdFx0KVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENoZWNrIHBhdGggc3RyYXRlZ3kgKFBoYXNlIDIpXHJcblx0XHRpZiAocmVjb2duaXRpb25TdHJhdGVnaWVzLnBhdGhzLmVuYWJsZWQpIHtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHRoaXMubWF0Y2hlc1BhdGhTdHJhdGVneShcclxuXHRcdFx0XHRcdGZpbGVQYXRoLFxyXG5cdFx0XHRcdFx0ZmlsZUNvbnRlbnQsXHJcblx0XHRcdFx0XHRmaWxlQ2FjaGUsXHJcblx0XHRcdFx0XHRyZWNvZ25pdGlvblN0cmF0ZWdpZXMucGF0aHNcclxuXHRcdFx0XHQpXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGZhbHNlO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgZmlsZSBtYXRjaGVzIG1ldGFkYXRhIHN0cmF0ZWd5XHJcblx0ICovXHJcblx0cHJpdmF0ZSBtYXRjaGVzTWV0YWRhdGFTdHJhdGVneShcclxuXHRcdGZpbGVQYXRoOiBzdHJpbmcsXHJcblx0XHRmaWxlQ29udGVudDogc3RyaW5nLFxyXG5cdFx0ZmlsZUNhY2hlOiBDYWNoZWRNZXRhZGF0YSB8IG51bGwsXHJcblx0XHRjb25maWc6IGFueVxyXG5cdCk6IGJvb2xlYW4ge1xyXG5cdFx0aWYgKCFmaWxlQ2FjaGU/LmZyb250bWF0dGVyKSByZXR1cm4gZmFsc2U7XHJcblxyXG5cdFx0Y29uc3Qge3Rhc2tGaWVsZHMsIHJlcXVpcmVBbGxGaWVsZHN9ID0gY29uZmlnO1xyXG5cdFx0Y29uc3QgZnJvbnRtYXR0ZXIgPSBmaWxlQ2FjaGUuZnJvbnRtYXR0ZXI7XHJcblxyXG5cdFx0Y29uc3QgbWF0Y2hpbmdGaWVsZHMgPSB0YXNrRmllbGRzLmZpbHRlcihcclxuXHRcdFx0KGZpZWxkOiBzdHJpbmcpID0+XHJcblx0XHRcdFx0ZnJvbnRtYXR0ZXIuaGFzT3duUHJvcGVydHkoZmllbGQpICYmXHJcblx0XHRcdFx0ZnJvbnRtYXR0ZXJbZmllbGRdICE9PSB1bmRlZmluZWRcclxuXHRcdCk7XHJcblxyXG5cdFx0aWYgKHJlcXVpcmVBbGxGaWVsZHMpIHtcclxuXHRcdFx0cmV0dXJuIG1hdGNoaW5nRmllbGRzLmxlbmd0aCA9PT0gdGFza0ZpZWxkcy5sZW5ndGg7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRyZXR1cm4gbWF0Y2hpbmdGaWVsZHMubGVuZ3RoID4gMDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGlmIGZpbGUgbWF0Y2hlcyB0YWcgc3RyYXRlZ3lcclxuXHQgKi9cclxuXHRwcml2YXRlIG1hdGNoZXNUYWdTdHJhdGVneShcclxuXHRcdGZpbGVQYXRoOiBzdHJpbmcsXHJcblx0XHRmaWxlQ29udGVudDogc3RyaW5nLFxyXG5cdFx0ZmlsZUNhY2hlOiBDYWNoZWRNZXRhZGF0YSB8IG51bGwsXHJcblx0XHRjb25maWc6IGFueVxyXG5cdCk6IGJvb2xlYW4ge1xyXG5cdFx0aWYgKCFmaWxlQ2FjaGU/LnRhZ3MpIHJldHVybiBmYWxzZTtcclxuXHJcblx0XHRjb25zdCB7dGFza1RhZ3MsIG1hdGNoTW9kZX0gPSBjb25maWc7XHJcblx0XHRjb25zdCBmaWxlVGFncyA9IGZpbGVDYWNoZS50YWdzLm1hcCgodGFnKSA9PiB0YWcudGFnKTtcclxuXHJcblx0XHRyZXR1cm4gdGFza1RhZ3Muc29tZSgodGFza1RhZzogc3RyaW5nKSA9PiB7XHJcblx0XHRcdHJldHVybiBmaWxlVGFncy5zb21lKChmaWxlVGFnKSA9PiB7XHJcblx0XHRcdFx0c3dpdGNoIChtYXRjaE1vZGUpIHtcclxuXHRcdFx0XHRcdGNhc2UgXCJleGFjdFwiOlxyXG5cdFx0XHRcdFx0XHRyZXR1cm4gZmlsZVRhZyA9PT0gdGFza1RhZztcclxuXHRcdFx0XHRcdGNhc2UgXCJwcmVmaXhcIjpcclxuXHRcdFx0XHRcdFx0cmV0dXJuIGZpbGVUYWcuc3RhcnRzV2l0aCh0YXNrVGFnKTtcclxuXHRcdFx0XHRcdGNhc2UgXCJjb250YWluc1wiOlxyXG5cdFx0XHRcdFx0XHRyZXR1cm4gZmlsZVRhZy5pbmNsdWRlcyh0YXNrVGFnKTtcclxuXHRcdFx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0XHRcdHJldHVybiBmaWxlVGFnID09PSB0YXNrVGFnO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGlmIGZpbGUgbWF0Y2hlcyB0ZW1wbGF0ZSBzdHJhdGVneVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgbWF0Y2hlc1RlbXBsYXRlU3RyYXRlZ3koXHJcblx0XHRmaWxlUGF0aDogc3RyaW5nLFxyXG5cdFx0ZmlsZUNvbnRlbnQ6IHN0cmluZyxcclxuXHRcdGZpbGVDYWNoZTogQ2FjaGVkTWV0YWRhdGEgfCBudWxsLFxyXG5cdFx0Y29uZmlnOiBUZW1wbGF0ZVJlY29nbml0aW9uQ29uZmlnXHJcblx0KTogYm9vbGVhbiB7XHJcblx0XHRpZiAoXHJcblx0XHRcdCFjb25maWcuZW5hYmxlZCB8fFxyXG5cdFx0XHQhY29uZmlnLnRlbXBsYXRlUGF0aHMgfHxcclxuXHRcdFx0Y29uZmlnLnRlbXBsYXRlUGF0aHMubGVuZ3RoID09PSAwXHJcblx0XHQpIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENoZWNrIGlmIGZpbGUgbWF0Y2hlcyBhbnkgdGVtcGxhdGUgcGF0aFxyXG5cdFx0cmV0dXJuIGNvbmZpZy50ZW1wbGF0ZVBhdGhzLnNvbWUoKHRlbXBsYXRlUGF0aCkgPT4ge1xyXG5cdFx0XHQvLyBDaGVjayBkaXJlY3QgcGF0aCBpbmNsdXNpb25cclxuXHRcdFx0aWYgKGZpbGVQYXRoLmluY2x1ZGVzKHRlbXBsYXRlUGF0aCkpIHtcclxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgZnJvbnRtYXR0ZXIgdGVtcGxhdGUgcmVmZXJlbmNlc1xyXG5cdFx0XHRpZiAoY29uZmlnLmNoZWNrVGVtcGxhdGVNZXRhZGF0YSAmJiBmaWxlQ2FjaGU/LmZyb250bWF0dGVyKSB7XHJcblx0XHRcdFx0Y29uc3QgZnJvbnRtYXR0ZXIgPSBmaWxlQ2FjaGUuZnJvbnRtYXR0ZXI7XHJcblx0XHRcdFx0cmV0dXJuIChcclxuXHRcdFx0XHRcdGZyb250bWF0dGVyLnRlbXBsYXRlID09PSB0ZW1wbGF0ZVBhdGggfHxcclxuXHRcdFx0XHRcdGZyb250bWF0dGVyLnRlbXBsYXRlRmlsZSA9PT0gdGVtcGxhdGVQYXRoIHx8XHJcblx0XHRcdFx0XHRmcm9udG1hdHRlci50ZW1wbGF0ZVBhdGggPT09IHRlbXBsYXRlUGF0aFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgZmlsZSBtYXRjaGVzIHBhdGggc3RyYXRlZ3lcclxuXHQgKi9cclxuXHRwcml2YXRlIG1hdGNoZXNQYXRoU3RyYXRlZ3koXHJcblx0XHRmaWxlUGF0aDogc3RyaW5nLFxyXG5cdFx0ZmlsZUNvbnRlbnQ6IHN0cmluZyxcclxuXHRcdGZpbGVDYWNoZTogQ2FjaGVkTWV0YWRhdGEgfCBudWxsLFxyXG5cdFx0Y29uZmlnOiBQYXRoUmVjb2duaXRpb25Db25maWdcclxuXHQpOiBib29sZWFuIHtcclxuXHRcdGlmIChcclxuXHRcdFx0IWNvbmZpZy5lbmFibGVkIHx8XHJcblx0XHRcdCFjb25maWcudGFza1BhdGhzIHx8XHJcblx0XHRcdGNvbmZpZy50YXNrUGF0aHMubGVuZ3RoID09PSAwXHJcblx0XHQpIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIE5vcm1hbGl6ZSBwYXRoICh1c2UgZm9yd2FyZCBzbGFzaGVzKVxyXG5cdFx0Y29uc3Qgbm9ybWFsaXplZFBhdGggPSBmaWxlUGF0aC5yZXBsYWNlKC9cXFxcL2csIFwiL1wiKTtcclxuXHJcblx0XHQvLyBDaGVjayBlYWNoIGNvbmZpZ3VyZWQgcGF0aCBwYXR0ZXJuXHJcblx0XHRmb3IgKGNvbnN0IHBhdHRlcm4gb2YgY29uZmlnLnRhc2tQYXRocykge1xyXG5cdFx0XHRjb25zdCBub3JtYWxpemVkUGF0dGVybiA9IHBhdHRlcm4ucmVwbGFjZSgvXFxcXC9nLCBcIi9cIik7XHJcblxyXG5cdFx0XHRzd2l0Y2ggKGNvbmZpZy5tYXRjaE1vZGUpIHtcclxuXHRcdFx0XHRjYXNlIFwicHJlZml4XCI6XHJcblx0XHRcdFx0XHRpZiAobm9ybWFsaXplZFBhdGguc3RhcnRzV2l0aChub3JtYWxpemVkUGF0dGVybikpIHtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcdFx0YFtGaWxlU291cmNlXSBQYXRoIG1hdGNoZXMgcHJlZml4IHBhdHRlcm46ICR7cGF0dGVybn0gZm9yICR7ZmlsZVBhdGh9YFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRjYXNlIFwicmVnZXhcIjpcclxuXHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IHJlZ2V4ID0gbmV3IFJlZ0V4cChub3JtYWxpemVkUGF0dGVybik7XHJcblx0XHRcdFx0XHRcdGlmIChyZWdleC50ZXN0KG5vcm1hbGl6ZWRQYXRoKSkge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRcdFx0YFtGaWxlU291cmNlXSBQYXRoIG1hdGNoZXMgcmVnZXggcGF0dGVybjogJHtwYXR0ZXJufSBmb3IgJHtmaWxlUGF0aH1gXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRcdFx0YFtGaWxlU291cmNlXSBJbnZhbGlkIHJlZ2V4IHBhdHRlcm46ICR7cGF0dGVybn1gLFxyXG5cdFx0XHRcdFx0XHRcdGVcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRjYXNlIFwiZ2xvYlwiOlxyXG5cdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHR0aGlzLm1hdGNoR2xvYlBhdHRlcm4obm9ybWFsaXplZFBhdGgsIG5vcm1hbGl6ZWRQYXR0ZXJuKVxyXG5cdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRcdGBbRmlsZVNvdXJjZV0gUGF0aCBtYXRjaGVzIGdsb2IgcGF0dGVybjogJHtwYXR0ZXJufSBmb3IgJHtmaWxlUGF0aH1gXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBNYXRjaCBhIHBhdGggYWdhaW5zdCBhIGdsb2IgcGF0dGVyblxyXG5cdCAqIFN1cHBvcnRzOiAqIChhbnkgY2hhcnMgZXhjZXB0IC8pLCAqKiAoYW55IGNoYXJzKSwgPyAoc2luZ2xlIGNoYXIpXHJcblx0ICovXHJcblx0cHJpdmF0ZSBtYXRjaEdsb2JQYXR0ZXJuKHBhdGg6IHN0cmluZywgcGF0dGVybjogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0XHQvLyBDb252ZXJ0IGdsb2IgcGF0dGVybiB0byByZWd1bGFyIGV4cHJlc3Npb25cclxuXHRcdGxldCByZWdleFBhdHRlcm4gPSBwYXR0ZXJuXHJcblx0XHRcdC5yZXBsYWNlKC9bLiteJHt9KCl8W1xcXVxcXFxdL2csIFwiXFxcXCQmXCIpIC8vIEVzY2FwZSBzcGVjaWFsIGNoYXJzXHJcblx0XHRcdC5yZXBsYWNlKC9cXCpcXCovZywgXCLCp8KnwqdcIikgLy8gVGVtcG9yYXJ5IHBsYWNlaG9sZGVyIGZvciAqKlxyXG5cdFx0XHQucmVwbGFjZSgvXFwqL2csIFwiW14vXSpcIikgLy8gKiBtYXRjaGVzIGFueSBjaGFycyBleGNlcHQgL1xyXG5cdFx0XHQucmVwbGFjZSgvwqfCp8KnL2csIFwiLipcIikgLy8gKiogbWF0Y2hlcyBhbnkgY2hhcnNcclxuXHRcdFx0LnJlcGxhY2UoL1xcPy9nLCBcIlteL11cIik7IC8vID8gbWF0Y2hlcyBzaW5nbGUgY2hhclxyXG5cclxuXHRcdC8vIElmIHBhdHRlcm4gZW5kcyB3aXRoIC8sIG1hdGNoIGFsbCBmaWxlcyBpbiB0aGF0IGRpcmVjdG9yeVxyXG5cdFx0aWYgKHBhdHRlcm4uZW5kc1dpdGgoXCIvXCIpKSB7XHJcblx0XHRcdHJlZ2V4UGF0dGVybiA9IGBeJHtyZWdleFBhdHRlcm59LipgO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0cmVnZXhQYXR0ZXJuID0gYF4ke3JlZ2V4UGF0dGVybn0kYDtcclxuXHRcdH1cclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCByZWdleCA9IG5ldyBSZWdFeHAocmVnZXhQYXR0ZXJuKTtcclxuXHRcdFx0cmV0dXJuIHJlZ2V4LnRlc3QocGF0aCk7XHJcblx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRgW0ZpbGVTb3VyY2VdIEZhaWxlZCB0byBjb21waWxlIGdsb2IgcGF0dGVybjogJHtwYXR0ZXJufWAsXHJcblx0XHRcdFx0ZVxyXG5cdFx0XHQpO1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDcmVhdGUgYSBuZXcgZmlsZSB0YXNrXHJcblx0ICovXHJcblx0YXN5bmMgY3JlYXRlRmlsZVRhc2soXHJcblx0XHRmaWxlUGF0aDogc3RyaW5nXHJcblx0KTogUHJvbWlzZTxUYXNrPEZpbGVTb3VyY2VUYXNrTWV0YWRhdGE+IHwgbnVsbD4ge1xyXG5cdFx0Y29uc3QgZmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChmaWxlUGF0aCkgYXMgVEZpbGU7XHJcblx0XHRpZiAoIWZpbGUpIHJldHVybiBudWxsO1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IGZpbGVDb250ZW50ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQuY2FjaGVkUmVhZChmaWxlKTtcclxuXHRcdFx0Y29uc3QgZmlsZUNhY2hlID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk7XHJcblxyXG5cdFx0XHRjb25zdCBmaWxlVGFzayA9IGF3YWl0IHRoaXMuYnVpbGRGaWxlVGFzayhcclxuXHRcdFx0XHRmaWxlUGF0aCxcclxuXHRcdFx0XHRmaWxlQ29udGVudCxcclxuXHRcdFx0XHRmaWxlQ2FjaGVcclxuXHRcdFx0KTtcclxuXHRcdFx0aWYgKCFmaWxlVGFzaykgcmV0dXJuIG51bGw7XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgY2FjaGVcclxuXHRcdFx0dGhpcy51cGRhdGVGaWxlVGFza0NhY2hlKGZpbGVQYXRoLCBmaWxlVGFzayk7XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgc3RhdGlzdGljc1xyXG5cdFx0XHR0aGlzLnVwZGF0ZVN0YXRpc3RpY3MoZmlsZVRhc2subWV0YWRhdGEucmVjb2duaXRpb25TdHJhdGVneSwgMSk7XHJcblxyXG5cdFx0XHQvLyBFbWl0IGZpbGUgdGFzayBldmVudFxyXG5cdFx0XHR0aGlzLmVtaXRGaWxlVGFza1VwZGF0ZShcImNyZWF0ZWRcIiwgZmlsZVRhc2spO1xyXG5cclxuXHRcdFx0cmV0dXJuIGZpbGVUYXNrO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcclxuXHRcdFx0XHRgW0ZpbGVTb3VyY2VdIEVycm9yIGNyZWF0aW5nIGZpbGUgdGFzayBmb3IgJHtmaWxlUGF0aH06YCxcclxuXHRcdFx0XHRlcnJvclxyXG5cdFx0XHQpO1xyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBhbiBleGlzdGluZyBmaWxlIHRhc2tcclxuXHQgKi9cclxuXHRhc3luYyB1cGRhdGVGaWxlVGFzayhcclxuXHRcdGZpbGVQYXRoOiBzdHJpbmdcclxuXHQpOiBQcm9taXNlPFRhc2s8RmlsZVNvdXJjZVRhc2tNZXRhZGF0YT4gfCBudWxsPiB7XHJcblx0XHQvLyBGb3IgUGhhc2UgMSwganVzdCByZWNyZWF0ZSB0aGUgdGFza1xyXG5cdFx0Ly8gUGhhc2UgMiB3aWxsIGFkZCBzbWFydCB1cGRhdGUgZGV0ZWN0aW9uXHJcblx0XHRyZXR1cm4gYXdhaXQgdGhpcy5jcmVhdGVGaWxlVGFzayhmaWxlUGF0aCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW1vdmUgYSBmaWxlIHRhc2tcclxuXHQgKi9cclxuXHRhc3luYyByZW1vdmVGaWxlVGFzayhmaWxlUGF0aDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRjb25zdCBleGlzdGluZ0NhY2hlID0gdGhpcy5maWxlVGFza0NhY2hlLmdldChmaWxlUGF0aCk7XHJcblx0XHRpZiAoIWV4aXN0aW5nQ2FjaGU/LmZpbGVUYXNrRXhpc3RzKSByZXR1cm47XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIGZyb20gY2FjaGVcclxuXHRcdHRoaXMuZmlsZVRhc2tDYWNoZS5kZWxldGUoZmlsZVBhdGgpO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSBzdGF0aXN0aWNzXHJcblx0XHR0aGlzLnN0YXRzLnRyYWNrZWRGaWxlQ291bnQgPSBNYXRoLm1heChcclxuXHRcdFx0MCxcclxuXHRcdFx0dGhpcy5zdGF0cy50cmFja2VkRmlsZUNvdW50IC0gMVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBFbWl0IHJlbW92YWwgZXZlbnRcclxuXHRcdGNvbnN0IHNlcSA9IFNlcS5uZXh0KCk7XHJcblx0XHR0aGlzLmxhc3RVcGRhdGVTZXEgPSBzZXE7XHJcblxyXG5cdFx0ZW1pdCh0aGlzLmFwcCwgRXZlbnRzLkZJTEVfVEFTS19SRU1PVkVELCB7XHJcblx0XHRcdGZpbGVQYXRoLFxyXG5cdFx0XHR0aW1lc3RhbXA6IERhdGUubm93KCksXHJcblx0XHRcdHNlcSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnNvbGUubG9nKGBbRmlsZVNvdXJjZV0gUmVtb3ZlZCBmaWxlIHRhc2s6ICR7ZmlsZVBhdGh9YCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBCdWlsZCBhIGZpbGUgdGFzayBmcm9tIGZpbGUgZGF0YVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgYnVpbGRGaWxlVGFzayhcclxuXHRcdGZpbGVQYXRoOiBzdHJpbmcsXHJcblx0XHRmaWxlQ29udGVudDogc3RyaW5nLFxyXG5cdFx0ZmlsZUNhY2hlOiBDYWNoZWRNZXRhZGF0YSB8IG51bGxcclxuXHQpOiBQcm9taXNlPFRhc2s8RmlsZVNvdXJjZVRhc2tNZXRhZGF0YT4gfCBudWxsPiB7XHJcblx0XHRjb25zdCBjb25maWcgPSB0aGlzLmNvbmZpZy5nZXRDb25maWcoKTtcclxuXHRcdGNvbnN0IGZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoZmlsZVBhdGgpIGFzIFRGaWxlO1xyXG5cdFx0aWYgKCFmaWxlKSByZXR1cm4gbnVsbDtcclxuXHJcblx0XHQvLyBEZXRlcm1pbmUgd2hpY2ggc3RyYXRlZ3kgbWF0Y2hlZFxyXG5cdFx0Y29uc3Qgc3RyYXRlZ3kgPSB0aGlzLmdldE1hdGNoaW5nU3RyYXRlZ3koXHJcblx0XHRcdGZpbGVQYXRoLFxyXG5cdFx0XHRmaWxlQ29udGVudCxcclxuXHRcdFx0ZmlsZUNhY2hlXHJcblx0XHQpO1xyXG5cdFx0aWYgKCFzdHJhdGVneSkgcmV0dXJuIG51bGw7XHJcblxyXG5cdFx0Ly8gR2VuZXJhdGUgdGFzayBjb250ZW50IGJhc2VkIG9uIGNvbmZpZ3VyYXRpb25cclxuXHRcdGNvbnN0IGNvbnRlbnQgPSB0aGlzLmdlbmVyYXRlVGFza0NvbnRlbnQoXHJcblx0XHRcdGZpbGVQYXRoLFxyXG5cdFx0XHRmaWxlQ29udGVudCxcclxuXHRcdFx0ZmlsZUNhY2hlXHJcblx0XHQpO1xyXG5cdFx0Y29uc3Qgc2FmZUNvbnRlbnQgPVxyXG5cdFx0XHR0eXBlb2YgY29udGVudCA9PT0gXCJzdHJpbmdcIlxyXG5cdFx0XHRcdD8gY29udGVudFxyXG5cdFx0XHRcdDogZmlsZVBhdGguc3BsaXQoXCIvXCIpLnBvcCgpIHx8IGZpbGVQYXRoO1xyXG5cclxuXHRcdC8vIEV4dHJhY3QgbWV0YWRhdGEgZnJvbSBmcm9udG1hdHRlclxyXG5cdFx0Y29uc3QgbWV0YWRhdGEgPSB0aGlzLmV4dHJhY3RUYXNrTWV0YWRhdGEoXHJcblx0XHRcdGZpbGVQYXRoLFxyXG5cdFx0XHRmaWxlQ29udGVudCxcclxuXHRcdFx0ZmlsZUNhY2hlLFxyXG5cdFx0XHRzdHJhdGVneVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBDcmVhdGUgdGhlIGZpbGUgdGFza1xyXG5cdFx0Y29uc3QgZmlsZVRhc2s6IFRhc2s8RmlsZVNvdXJjZVRhc2tNZXRhZGF0YT4gPSB7XHJcblx0XHRcdGlkOiBgZmlsZS1zb3VyY2U6JHtmaWxlUGF0aH1gLFxyXG5cdFx0XHRjb250ZW50OiBzYWZlQ29udGVudCxcclxuXHRcdFx0ZmlsZVBhdGgsXHJcblx0XHRcdGxpbmU6IDAsIC8vIEZpbGUgdGFza3MgYXJlIGF0IGxpbmUgMFxyXG5cdFx0XHRjb21wbGV0ZWQ6IG1ldGFkYXRhLnN0YXR1cyA9PT0gXCJ4XCIgfHwgbWV0YWRhdGEuc3RhdHVzID09PSBcIlhcIixcclxuXHRcdFx0c3RhdHVzOiBtZXRhZGF0YS5zdGF0dXMgfHwgY29uZmlnLmZpbGVUYXNrUHJvcGVydGllcy5kZWZhdWx0U3RhdHVzLFxyXG5cdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBgKioke3NhZmVDb250ZW50fSoqYCxcclxuXHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHQuLi5tZXRhZGF0YSxcclxuXHRcdFx0XHRzb3VyY2U6IFwiZmlsZS1zb3VyY2VcIixcclxuXHRcdFx0XHRyZWNvZ25pdGlvblN0cmF0ZWd5OiBzdHJhdGVneS5uYW1lLFxyXG5cdFx0XHRcdHJlY29nbml0aW9uQ3JpdGVyaWE6IHN0cmF0ZWd5LmNyaXRlcmlhLFxyXG5cdFx0XHRcdGZpbGVUaW1lc3RhbXBzOiB7XHJcblx0XHRcdFx0XHRjcmVhdGVkOiBmaWxlLnN0YXQuY3RpbWUsXHJcblx0XHRcdFx0XHRtb2RpZmllZDogZmlsZS5zdGF0Lm10aW1lLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0Y2hpbGRUYXNrczogW10sIC8vIFdpbGwgYmUgcG9wdWxhdGVkIGluIFBoYXNlIDNcclxuXHRcdFx0XHR0YWdzOiBtZXRhZGF0YS50YWdzIHx8IFtdLFxyXG5cdFx0XHRcdGNoaWxkcmVuOiBbXSwgLy8gUmVxdWlyZWQgYnkgU3RhbmRhcmRUYXNrTWV0YWRhdGFcclxuXHRcdFx0fSxcclxuXHRcdH07XHJcblxyXG5cdFx0cmV0dXJuIGZpbGVUYXNrO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHRoZSBtYXRjaGluZyByZWNvZ25pdGlvbiBzdHJhdGVneSBmb3IgYSBmaWxlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZXRNYXRjaGluZ1N0cmF0ZWd5KFxyXG5cdFx0ZmlsZVBhdGg6IHN0cmluZyxcclxuXHRcdGZpbGVDb250ZW50OiBzdHJpbmcsXHJcblx0XHRmaWxlQ2FjaGU6IENhY2hlZE1ldGFkYXRhIHwgbnVsbFxyXG5cdCk6IHsgbmFtZTogUmVjb2duaXRpb25TdHJhdGVneTsgY3JpdGVyaWE6IHN0cmluZyB9IHwgbnVsbCB7XHJcblx0XHRjb25zdCBjb25maWcgPSB0aGlzLmNvbmZpZy5nZXRDb25maWcoKTtcclxuXHJcblx0XHRpZiAoXHJcblx0XHRcdGNvbmZpZy5yZWNvZ25pdGlvblN0cmF0ZWdpZXMubWV0YWRhdGEuZW5hYmxlZCAmJlxyXG5cdFx0XHR0aGlzLm1hdGNoZXNNZXRhZGF0YVN0cmF0ZWd5KFxyXG5cdFx0XHRcdGZpbGVQYXRoLFxyXG5cdFx0XHRcdGZpbGVDb250ZW50LFxyXG5cdFx0XHRcdGZpbGVDYWNoZSxcclxuXHRcdFx0XHRjb25maWcucmVjb2duaXRpb25TdHJhdGVnaWVzLm1ldGFkYXRhXHJcblx0XHRcdClcclxuXHRcdCkge1xyXG5cdFx0XHRyZXR1cm4ge25hbWU6IFwibWV0YWRhdGFcIiwgY3JpdGVyaWE6IFwiZnJvbnRtYXR0ZXJcIn07XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKFxyXG5cdFx0XHRjb25maWcucmVjb2duaXRpb25TdHJhdGVnaWVzLnRhZ3MuZW5hYmxlZCAmJlxyXG5cdFx0XHR0aGlzLm1hdGNoZXNUYWdTdHJhdGVneShcclxuXHRcdFx0XHRmaWxlUGF0aCxcclxuXHRcdFx0XHRmaWxlQ29udGVudCxcclxuXHRcdFx0XHRmaWxlQ2FjaGUsXHJcblx0XHRcdFx0Y29uZmlnLnJlY29nbml0aW9uU3RyYXRlZ2llcy50YWdzXHJcblx0XHRcdClcclxuXHRcdCkge1xyXG5cdFx0XHRyZXR1cm4ge25hbWU6IFwidGFnXCIsIGNyaXRlcmlhOiBcImZpbGUtdGFnc1wifTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDaGVjayBwYXRoIHN0cmF0ZWd5XHJcblx0XHRpZiAoXHJcblx0XHRcdGNvbmZpZy5yZWNvZ25pdGlvblN0cmF0ZWdpZXMucGF0aHMuZW5hYmxlZCAmJlxyXG5cdFx0XHR0aGlzLm1hdGNoZXNQYXRoU3RyYXRlZ3koXHJcblx0XHRcdFx0ZmlsZVBhdGgsXHJcblx0XHRcdFx0ZmlsZUNvbnRlbnQsXHJcblx0XHRcdFx0ZmlsZUNhY2hlLFxyXG5cdFx0XHRcdGNvbmZpZy5yZWNvZ25pdGlvblN0cmF0ZWdpZXMucGF0aHNcclxuXHRcdFx0KVxyXG5cdFx0KSB7XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0bmFtZTogXCJwYXRoXCIsXHJcblx0XHRcdFx0Y3JpdGVyaWE6XHJcblx0XHRcdFx0XHRjb25maWcucmVjb2duaXRpb25TdHJhdGVnaWVzLnBhdGhzLnRhc2tQYXRocy5qb2luKFwiLCBcIiksXHJcblx0XHRcdH07XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVGVtcGxhdGUtYmFzZWQgcmVjb2duaXRpb25cclxuXHRcdGNvbnN0IHRlbXBsYXRlQ29uZmlnID0gY29uZmlnLnJlY29nbml0aW9uU3RyYXRlZ2llcy50ZW1wbGF0ZXM7XHJcblx0XHRpZiAodGVtcGxhdGVDb25maWcuZW5hYmxlZCAmJiB0ZW1wbGF0ZUNvbmZpZy50ZW1wbGF0ZVBhdGhzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0Ly8gQ2hlY2sgaWYgZmlsZSBtYXRjaGVzIGFueSB0ZW1wbGF0ZSBwYXRoXHJcblx0XHRcdGNvbnN0IG1hdGNoZXNUZW1wbGF0ZSA9IHRlbXBsYXRlQ29uZmlnLnRlbXBsYXRlUGF0aHMuc29tZShcclxuXHRcdFx0XHQodGVtcGxhdGVQYXRoKSA9PiB7XHJcblx0XHRcdFx0XHQvLyBTaW1wbGUgcGF0aCBtYXRjaGluZyAtIGNvdWxkIGJlIGVuaGFuY2VkIHdpdGggbW9yZSBzb3BoaXN0aWNhdGVkIG1hdGNoaW5nXHJcblx0XHRcdFx0XHRyZXR1cm4gKFxyXG5cdFx0XHRcdFx0XHRmaWxlUGF0aC5pbmNsdWRlcyh0ZW1wbGF0ZVBhdGgpIHx8XHJcblx0XHRcdFx0XHRcdGZpbGVDYWNoZT8uZnJvbnRtYXR0ZXI/LnRlbXBsYXRlID09PSB0ZW1wbGF0ZVBhdGggfHxcclxuXHRcdFx0XHRcdFx0ZmlsZUNhY2hlPy5mcm9udG1hdHRlcj8udGVtcGxhdGVGaWxlID09PSB0ZW1wbGF0ZVBhdGhcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0aWYgKG1hdGNoZXNUZW1wbGF0ZSkge1xyXG5cdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRuYW1lOiBcInRlbXBsYXRlXCIsXHJcblx0XHRcdFx0XHRjcml0ZXJpYTogdGVtcGxhdGVDb25maWcudGVtcGxhdGVQYXRocy5qb2luKFwiLCBcIiksXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBudWxsO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2VuZXJhdGUgdGFzayBjb250ZW50IGJhc2VkIG9uIGNvbmZpZ3VyYXRpb25cclxuXHQgKi9cclxuXHRwcml2YXRlIGdlbmVyYXRlVGFza0NvbnRlbnQoXHJcblx0XHRmaWxlUGF0aDogc3RyaW5nLFxyXG5cdFx0ZmlsZUNvbnRlbnQ6IHN0cmluZyxcclxuXHRcdGZpbGVDYWNoZTogQ2FjaGVkTWV0YWRhdGEgfCBudWxsXHJcblx0KTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IGNvbmZpZyA9IHRoaXMuY29uZmlnLmdldENvbmZpZygpLmZpbGVUYXNrUHJvcGVydGllcztcclxuXHRcdGNvbnN0IGZpbGVOYW1lID0gZmlsZVBhdGguc3BsaXQoXCIvXCIpLnBvcCgpIHx8IGZpbGVQYXRoO1xyXG5cdFx0Y29uc3QgZmlsZU5hbWVXaXRob3V0RXh0ID0gZmlsZU5hbWUucmVwbGFjZSgvXFwuW14vLl0rJC8sIFwiXCIpO1xyXG5cclxuXHRcdHN3aXRjaCAoY29uZmlnLmNvbnRlbnRTb3VyY2UpIHtcclxuXHRcdFx0Y2FzZSBcImZpbGVuYW1lXCI6XHJcblx0XHRcdFx0Ly8gSWYgdXNlciBwcmVmZXJzIGZyb250bWF0dGVyIHRpdGxlLCBzaG93IGl0IG92ZXIgZmlsZW5hbWVcclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRjb25maWcucHJlZmVyRnJvbnRtYXR0ZXJUaXRsZSAmJlxyXG5cdFx0XHRcdFx0ZmlsZUNhY2hlPy5mcm9udG1hdHRlcj8udGl0bGVcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdHJldHVybiBmaWxlQ2FjaGUuZnJvbnRtYXR0ZXIudGl0bGUgYXMgc3RyaW5nO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gY29uZmlnLnN0cmlwRXh0ZW5zaW9uID8gZmlsZU5hbWVXaXRob3V0RXh0IDogZmlsZU5hbWU7XHJcblxyXG5cdFx0XHRjYXNlIFwidGl0bGVcIjpcclxuXHRcdFx0XHQvLyBBbHdheXMgcHJlZmVyIGZyb250bWF0dGVyIHRpdGxlIGlmIGF2YWlsYWJsZSwgZmFsbGJhY2sgdG8gZmlsZW5hbWUgd2l0aG91dCBleHRlbnNpb25cclxuXHRcdFx0XHRyZXR1cm4gKFxyXG5cdFx0XHRcdFx0KGZpbGVDYWNoZT8uZnJvbnRtYXR0ZXI/LnRpdGxlIGFzIHN0cmluZykgfHxcclxuXHRcdFx0XHRcdGZpbGVOYW1lV2l0aG91dEV4dFxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRjYXNlIFwiaDFcIjpcclxuXHRcdFx0XHRjb25zdCBoMSA9IGZpbGVDYWNoZT8uaGVhZGluZ3M/LmZpbmQoKGgpID0+IGgubGV2ZWwgPT09IDEpO1xyXG5cdFx0XHRcdHJldHVybiAoaDE/LmhlYWRpbmcgYXMgc3RyaW5nKSB8fCBmaWxlTmFtZVdpdGhvdXRFeHQ7XHJcblxyXG5cdFx0XHRjYXNlIFwiY3VzdG9tXCI6XHJcblx0XHRcdFx0aWYgKGNvbmZpZy5jdXN0b21Db250ZW50RmllbGQgJiYgZmlsZUNhY2hlPy5mcm9udG1hdHRlcikge1xyXG5cdFx0XHRcdFx0Y29uc3QgdmFsID1cclxuXHRcdFx0XHRcdFx0ZmlsZUNhY2hlLmZyb250bWF0dGVyW2NvbmZpZy5jdXN0b21Db250ZW50RmllbGRdO1xyXG5cdFx0XHRcdFx0aWYgKHZhbCkgcmV0dXJuIHZhbCBhcyBzdHJpbmc7XHJcblx0XHRcdFx0XHQvLyBJZiBjdXN0b20gZmllbGQgbm90IHByZXNlbnQsIG9wdGlvbmFsbHkgcHJlZmVyIGZyb250bWF0dGVyIHRpdGxlXHJcblx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdGNvbmZpZy5wcmVmZXJGcm9udG1hdHRlclRpdGxlICYmXHJcblx0XHRcdFx0XHRcdGZpbGVDYWNoZS5mcm9udG1hdHRlci50aXRsZVxyXG5cdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdHJldHVybiBmaWxlQ2FjaGUuZnJvbnRtYXR0ZXIudGl0bGUgYXMgc3RyaW5nO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0cmV0dXJuIGZpbGVOYW1lV2l0aG91dEV4dDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gTm8gY3VzdG9tIGZpZWxkIHNwZWNpZmllZDogb3B0aW9uYWxseSBwcmVmZXIgZnJvbnRtYXR0ZXIgdGl0bGVcclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRjb25maWcucHJlZmVyRnJvbnRtYXR0ZXJUaXRsZSAmJlxyXG5cdFx0XHRcdFx0ZmlsZUNhY2hlPy5mcm9udG1hdHRlcj8udGl0bGVcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdHJldHVybiBmaWxlQ2FjaGUuZnJvbnRtYXR0ZXIudGl0bGUgYXMgc3RyaW5nO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gZmlsZU5hbWVXaXRob3V0RXh0O1xyXG5cclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHQvLyBEZWZhdWx0IHRvIHJlc3BlY3RpbmcgcHJlZmVyRnJvbnRtYXR0ZXJUaXRsZSB3aGVuIGF2YWlsYWJsZVxyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdGNvbmZpZy5wcmVmZXJGcm9udG1hdHRlclRpdGxlICYmXHJcblx0XHRcdFx0XHRmaWxlQ2FjaGU/LmZyb250bWF0dGVyPy50aXRsZVxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGZpbGVDYWNoZS5mcm9udG1hdHRlci50aXRsZSBhcyBzdHJpbmc7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHJldHVybiBjb25maWcuc3RyaXBFeHRlbnNpb24gPyBmaWxlTmFtZVdpdGhvdXRFeHQgOiBmaWxlTmFtZTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEV4dHJhY3QgdGFzayBtZXRhZGF0YSBmcm9tIGZpbGVcclxuXHQgKi9cclxuXHRwcml2YXRlIGV4dHJhY3RUYXNrTWV0YWRhdGEoXHJcblx0XHRmaWxlUGF0aDogc3RyaW5nLFxyXG5cdFx0ZmlsZUNvbnRlbnQ6IHN0cmluZyxcclxuXHRcdGZpbGVDYWNoZTogQ2FjaGVkTWV0YWRhdGEgfCBudWxsLFxyXG5cdFx0c3RyYXRlZ3k6IHsgbmFtZTogUmVjb2duaXRpb25TdHJhdGVneTsgY3JpdGVyaWE6IHN0cmluZyB9XHJcblx0KTogUGFydGlhbDxGaWxlU291cmNlVGFza01ldGFkYXRhPiB7XHJcblx0XHRjb25zdCBjb25maWcgPSB0aGlzLmNvbmZpZy5nZXRDb25maWcoKTtcclxuXHRcdGNvbnN0IGZyb250bWF0dGVyID0gZmlsZUNhY2hlPy5mcm9udG1hdHRlciB8fCB7fTtcclxuXHJcblx0XHQvLyBEZXJpdmUgc3RhdHVzIGZyb20gZnJvbnRtYXR0ZXIgYW5kIGVhZ2VybHkgbWFwIHRleHR1YWwgbWV0YWRhdGEgdG8gYSBzeW1ib2xcclxuXHRcdGNvbnN0IHJhd1N0YXR1cyA9IGZyb250bWF0dGVyLnN0YXR1cyA/PyBcIlwiO1xyXG5cdFx0Y29uc3QgdG9TeW1ib2wgPSAodmFsOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xyXG5cdFx0XHRpZiAoIXZhbCkgcmV0dXJuIGNvbmZpZy5maWxlVGFza1Byb3BlcnRpZXMuZGVmYXVsdFN0YXR1cztcclxuXHRcdFx0Ly8gQWxyZWFkeSBhIHNpbmdsZS1jaGFyYWN0ZXIgbWFya1xyXG5cdFx0XHRpZiAodmFsLmxlbmd0aCA9PT0gMSkgcmV0dXJuIHZhbDtcclxuXHRcdFx0Y29uc3Qgc20gPSB0aGlzLmNvbmZpZy5nZXRDb25maWcoKS5zdGF0dXNNYXBwaW5nO1xyXG5cdFx0XHRjb25zdCB0YXJnZXQgPSBzbS5jYXNlU2Vuc2l0aXZlID8gdmFsIDogU3RyaW5nKHZhbCkudG9Mb3dlckNhc2UoKTtcclxuXHRcdFx0Ly8gVHJ5IGNvbmZpZ3VyZWQgbWV0YWRhdGEtPnN5bWJvbCB0YWJsZSBmaXJzdFxyXG5cdFx0XHRmb3IgKGNvbnN0IFtrLCBzeW1dIG9mIE9iamVjdC5lbnRyaWVzKHNtLm1ldGFkYXRhVG9TeW1ib2wgfHwge30pKSB7XHJcblx0XHRcdFx0Y29uc3Qga2V5ID0gc20uY2FzZVNlbnNpdGl2ZSA/IGsgOiBrLnRvTG93ZXJDYXNlKCk7XHJcblx0XHRcdFx0aWYgKGtleSA9PT0gdGFyZ2V0KSByZXR1cm4gc3ltO1xyXG5cdFx0XHR9XHJcblx0XHRcdC8vIEZhbGxiYWNrIHRvIGNvbW1vbiBkZWZhdWx0cyB0byBiZSByb2J1c3RcclxuXHRcdFx0Y29uc3QgZGVmYXVsdHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XHJcblx0XHRcdFx0Y29tcGxldGVkOiBcInhcIixcclxuXHRcdFx0XHRkb25lOiBcInhcIixcclxuXHRcdFx0XHRmaW5pc2hlZDogXCJ4XCIsXHJcblx0XHRcdFx0XCJpbi1wcm9ncmVzc1wiOiBcIi9cIixcclxuXHRcdFx0XHRcImluIHByb2dyZXNzXCI6IFwiL1wiLFxyXG5cdFx0XHRcdGRvaW5nOiBcIi9cIixcclxuXHRcdFx0XHRwbGFubmVkOiBcIj9cIixcclxuXHRcdFx0XHR0b2RvOiBcIj9cIixcclxuXHRcdFx0XHRjYW5jZWxsZWQ6IFwiLVwiLFxyXG5cdFx0XHRcdGNhbmNlbGVkOiBcIi1cIixcclxuXHRcdFx0XHRcIm5vdC1zdGFydGVkXCI6IFwiIFwiLFxyXG5cdFx0XHRcdFwibm90IHN0YXJ0ZWRcIjogXCIgXCIsXHJcblx0XHRcdH07XHJcblx0XHRcdGNvbnN0IG5vcm0gPSBTdHJpbmcodmFsKS50b0xvd2VyQ2FzZSgpO1xyXG5cdFx0XHRpZiAoZGVmYXVsdHNbbm9ybV0gIT09IHVuZGVmaW5lZCkgcmV0dXJuIGRlZmF1bHRzW25vcm1dO1xyXG5cdFx0XHRyZXR1cm4gY29uZmlnLmZpbGVUYXNrUHJvcGVydGllcy5kZWZhdWx0U3RhdHVzO1xyXG5cdFx0fTtcclxuXHRcdGxldCBzdGF0dXMgPSByYXdTdGF0dXNcclxuXHRcdFx0PyB0b1N5bWJvbChyYXdTdGF0dXMpXHJcblx0XHRcdDogY29uZmlnLmZpbGVUYXNrUHJvcGVydGllcy5kZWZhdWx0U3RhdHVzO1xyXG5cdFx0aWYgKHJhd1N0YXR1cyAmJiBzdGF0dXMgIT09IHJhd1N0YXR1cykge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRgW0ZpbGVTb3VyY2VdIE1hcHBlZCBzdGF0dXMgJyR7cmF3U3RhdHVzfScgdG8gJyR7c3RhdHVzfScgZm9yICR7ZmlsZVBhdGh9YFxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHJcblx0XHRcdC8vIFRPRE86IEZ1dHVyZSBlbmhhbmNlbWVudCAtIHJlYWQgZnJvbnRtYXR0ZXIucmVwZWF0IGFuZCBtYXAgaW50byBGaWxlU291cmNlVGFza01ldGFkYXRhIChlLmcuLCBhcyByZWN1cnJlbmNlKVxyXG5cclxuXHRcdC8vIEV4dHJhY3Qgc3RhbmRhcmQgdGFzayBtZXRhZGF0YVxyXG5cdFx0Y29uc3QgbWV0YWRhdGE6IFBhcnRpYWw8RmlsZVNvdXJjZVRhc2tNZXRhZGF0YT4gPSB7XHJcblx0XHRcdGR1ZURhdGU6IHRoaXMucGFyc2VEYXRlKGZyb250bWF0dGVyLmR1ZURhdGUgfHwgZnJvbnRtYXR0ZXIuZHVlKSxcclxuXHRcdFx0c3RhcnREYXRlOiB0aGlzLnBhcnNlRGF0ZShcclxuXHRcdFx0XHRmcm9udG1hdHRlci5zdGFydERhdGUgfHwgZnJvbnRtYXR0ZXIuc3RhcnRcclxuXHRcdFx0KSxcclxuXHRcdFx0c2NoZWR1bGVkRGF0ZTogdGhpcy5wYXJzZURhdGUoXHJcblx0XHRcdFx0ZnJvbnRtYXR0ZXIuc2NoZWR1bGVkRGF0ZSB8fCBmcm9udG1hdHRlci5zY2hlZHVsZWRcclxuXHRcdFx0KSxcclxuXHRcdFx0cHJpb3JpdHk6XHJcblx0XHRcdFx0ZnJvbnRtYXR0ZXIucHJpb3JpdHkgfHxcclxuXHRcdFx0XHRjb25maWcuZmlsZVRhc2tQcm9wZXJ0aWVzLmRlZmF1bHRQcmlvcml0eSxcclxuXHRcdFx0cHJvamVjdDogZnJvbnRtYXR0ZXIucHJvamVjdCxcclxuXHRcdFx0Y29udGV4dDogZnJvbnRtYXR0ZXIuY29udGV4dCxcclxuXHRcdFx0YXJlYTogZnJvbnRtYXR0ZXIuYXJlYSxcclxuXHRcdFx0dGFnczogZmlsZUNhY2hlPy50YWdzPy5tYXAoKHRhZykgPT4gdGFnLnRhZykgfHwgW10sXHJcblx0XHRcdHN0YXR1czogc3RhdHVzLFxyXG5cdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHR9O1xyXG5cclxuXHRcdHJldHVybiBtZXRhZGF0YTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENvbnZlcnQgYSB0YXNrIHN5bWJvbCBiYWNrIHRvIG1ldGFkYXRhIHZhbHVlIGZvciBmaWxlIHVwZGF0ZXNcclxuXHQgKiBUaGlzIHdpbGwgYmUgdXNlZCBpbiBQaGFzZSAzIHdoZW4gaW1wbGVtZW50aW5nIGZpbGUgdGFzayB1cGRhdGVzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBtYXBTeW1ib2xUb0ZpbGVNZXRhZGF0YShzeW1ib2w6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHRjb25zdCBjb25maWcgPSB0aGlzLmNvbmZpZy5nZXRDb25maWcoKTtcclxuXHJcblx0XHRpZiAoIWNvbmZpZy5zdGF0dXNNYXBwaW5nLmVuYWJsZWQpIHtcclxuXHRcdFx0cmV0dXJuIHN5bWJvbDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBNYXAgc3ltYm9sIGJhY2sgdG8gcHJlZmVycmVkIG1ldGFkYXRhIHZhbHVlXHJcblx0XHRyZXR1cm4gdGhpcy5jb25maWcubWFwU3ltYm9sVG9NZXRhZGF0YShzeW1ib2wpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUGFyc2UgZGF0ZSBmcm9tIHZhcmlvdXMgZm9ybWF0c1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgcGFyc2VEYXRlKGRhdGVWYWx1ZTogYW55KTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcclxuXHRcdGlmICghZGF0ZVZhbHVlKSByZXR1cm4gdW5kZWZpbmVkO1xyXG5cclxuXHRcdGlmICh0eXBlb2YgZGF0ZVZhbHVlID09PSBcIm51bWJlclwiKSB7XHJcblx0XHRcdHJldHVybiBkYXRlVmFsdWU7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHR5cGVvZiBkYXRlVmFsdWUgPT09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0Y29uc3QgcGFyc2VkID0gRGF0ZS5wYXJzZShkYXRlVmFsdWUpO1xyXG5cdFx0XHRyZXR1cm4gaXNOYU4ocGFyc2VkKSA/IHVuZGVmaW5lZCA6IHBhcnNlZDtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoZGF0ZVZhbHVlIGluc3RhbmNlb2YgRGF0ZSkge1xyXG5cdFx0XHRyZXR1cm4gZGF0ZVZhbHVlLmdldFRpbWUoKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIGZpbGUgdGFzayBjYWNoZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgdXBkYXRlRmlsZVRhc2tDYWNoZShcclxuXHRcdGZpbGVQYXRoOiBzdHJpbmcsXHJcblx0XHR0YXNrOiBUYXNrPEZpbGVTb3VyY2VUYXNrTWV0YWRhdGE+XHJcblx0KTogdm9pZCB7XHJcblx0XHRjb25zdCBmcm9udG1hdHRlckhhc2ggPSB0aGlzLmdlbmVyYXRlRnJvbnRtYXR0ZXJIYXNoKGZpbGVQYXRoKTtcclxuXHJcblx0XHR0aGlzLmZpbGVUYXNrQ2FjaGUuc2V0KGZpbGVQYXRoLCB7XHJcblx0XHRcdGZpbGVUYXNrRXhpc3RzOiB0cnVlLFxyXG5cdFx0XHRmcm9udG1hdHRlckhhc2gsXHJcblx0XHRcdGNoaWxkVGFza0lkczogbmV3IFNldCh0YXNrLm1ldGFkYXRhLmNoaWxkVGFza3MgfHwgW10pLFxyXG5cdFx0XHRsYXN0VXBkYXRlZDogRGF0ZS5ub3coKSxcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2VuZXJhdGUgaGFzaCBmb3IgZnJvbnRtYXR0ZXIgZm9yIGNoYW5nZSBkZXRlY3Rpb25cclxuXHQgKi9cclxuXHRwcml2YXRlIGdlbmVyYXRlRnJvbnRtYXR0ZXJIYXNoKGZpbGVQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgZmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChmaWxlUGF0aCkgYXMgVEZpbGU7XHJcblx0XHRpZiAoIWZpbGUpIHJldHVybiBcIlwiO1xyXG5cclxuXHRcdGNvbnN0IGZpbGVDYWNoZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpO1xyXG5cdFx0aWYgKCFmaWxlQ2FjaGU/LmZyb250bWF0dGVyKSByZXR1cm4gXCJcIjtcclxuXHJcblx0XHQvLyBTaW1wbGUgaGFzaCBvZiBmcm9udG1hdHRlciBKU09OXHJcblx0XHRjb25zdCBmcm9udG1hdHRlclN0ciA9IEpTT04uc3RyaW5naWZ5KFxyXG5cdFx0XHRmaWxlQ2FjaGUuZnJvbnRtYXR0ZXIsXHJcblx0XHRcdE9iamVjdC5rZXlzKGZpbGVDYWNoZS5mcm9udG1hdHRlcikuc29ydCgpXHJcblx0XHQpO1xyXG5cdFx0cmV0dXJuIHRoaXMuc2ltcGxlSGFzaChmcm9udG1hdHRlclN0cik7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTaW1wbGUgaGFzaCBmdW5jdGlvblxyXG5cdCAqL1xyXG5cdHByaXZhdGUgc2ltcGxlSGFzaChzdHI6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHRsZXQgaGFzaCA9IDA7XHJcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRjb25zdCBjaGFyID0gc3RyLmNoYXJDb2RlQXQoaSk7XHJcblx0XHRcdGhhc2ggPSAoaGFzaCA8PCA1KSAtIGhhc2ggKyBjaGFyO1xyXG5cdFx0XHRoYXNoID0gaGFzaCAmIGhhc2g7IC8vIENvbnZlcnQgdG8gMzItYml0IGludGVnZXJcclxuXHRcdH1cclxuXHRcdHJldHVybiBoYXNoLnRvU3RyaW5nKDM2KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGlmIGZpbGUgbmVlZHMgdXBkYXRpbmcgKHN0dWIgZm9yIFBoYXNlIDIpXHJcblx0ICovXHJcblx0cHJpdmF0ZSBzaG91bGRVcGRhdGVGaWxlVGFzayhcclxuXHRcdGZpbGVQYXRoOiBzdHJpbmcsXHJcblx0XHRjaGFuZ2VUeXBlOiBcIm1ldGFkYXRhXCIgfCBcImNvbnRlbnRcIlxyXG5cdCk6IGJvb2xlYW4ge1xyXG5cdFx0Ly8gU2ltcGxlIGNoZWNrIGZvciBQaGFzZSAxIC0gYWx3YXlzIHVwZGF0ZSBpZiBmaWxlIGlzIHRyYWNrZWRcclxuXHRcdHJldHVybiB0aGlzLmZpbGVUYXNrQ2FjaGUuaGFzKGZpbGVQYXRoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBzdGF0aXN0aWNzXHJcblx0ICovXHJcblx0cHJpdmF0ZSB1cGRhdGVTdGF0aXN0aWNzKFxyXG5cdFx0c3RyYXRlZ3k6IFJlY29nbml0aW9uU3RyYXRlZ3ksXHJcblx0XHRkZWx0YTogbnVtYmVyXHJcblx0KTogdm9pZCB7XHJcblx0XHR0aGlzLnN0YXRzLnJlY29nbml0aW9uQnJlYWtkb3duW3N0cmF0ZWd5XSArPSBkZWx0YTtcclxuXHRcdHRoaXMuc3RhdHMudHJhY2tlZEZpbGVDb3VudCArPSBkZWx0YTtcclxuXHRcdHRoaXMuc3RhdHMubGFzdFVwZGF0ZSA9IERhdGUubm93KCk7XHJcblx0XHR0aGlzLnN0YXRzLmxhc3RVcGRhdGVTZXEgPSB0aGlzLmxhc3RVcGRhdGVTZXE7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFbWl0IGZpbGUgdGFzayB1cGRhdGUgZXZlbnRcclxuXHQgKi9cclxuXHRwcml2YXRlIGVtaXRGaWxlVGFza1VwZGF0ZShcclxuXHRcdGFjdGlvbjogXCJjcmVhdGVkXCIgfCBcInVwZGF0ZWRcIiB8IFwicmVtb3ZlZFwiLFxyXG5cdFx0dGFzazogVGFzazxGaWxlU291cmNlVGFza01ldGFkYXRhPlxyXG5cdCk6IHZvaWQge1xyXG5cdFx0Y29uc3Qgc2VxID0gU2VxLm5leHQoKTtcclxuXHRcdHRoaXMubGFzdFVwZGF0ZVNlcSA9IHNlcTtcclxuXHJcblx0XHRlbWl0KHRoaXMuYXBwLCBFdmVudHMuRklMRV9UQVNLX1VQREFURUQsIHtcclxuXHRcdFx0YWN0aW9uLFxyXG5cdFx0XHR0YXNrLFxyXG5cdFx0XHR0aW1lc3RhbXA6IERhdGUubm93KCksXHJcblx0XHRcdHNlcSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnNvbGUubG9nKGBbRmlsZVNvdXJjZV0gRmlsZSB0YXNrICR7YWN0aW9ufTogJHt0YXNrLmZpbGVQYXRofWApO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgZmlsZSBpcyByZWxldmFudCBmb3IgcHJvY2Vzc2luZ1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgaXNSZWxldmFudEZpbGUoZmlsZVBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0Ly8gRmFzdC1wYXRoIGZpbHRlcnMgZmlyc3RcclxuXHRcdC8vIE9ubHkgcHJvY2VzcyBtYXJrZG93biBmaWxlcyBmb3Igbm93IChhZGRpdGlvbmFsIGZpbGUgdHlwZSBzdXBwb3J0IGNhbiBiZSBhZGRlZCBsYXRlcilcclxuXHRcdGlmICghZmlsZVBhdGguZW5kc1dpdGgoXCIubWRcIikpIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFNraXAgc3lzdGVtL2hpZGRlbiBmaWxlc1xyXG5cdFx0aWYgKGZpbGVQYXRoLnN0YXJ0c1dpdGgoXCIuXCIpIHx8IGZpbGVQYXRoLmluY2x1ZGVzKFwiLy5cIikpIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFwcGx5IGNlbnRyYWxpemVkIEZpbGVGaWx0ZXJNYW5hZ2VyIGZvciAnZmlsZScgc2NvcGUgZmlsdGVyaW5nIGlmIGF2YWlsYWJsZVxyXG5cdFx0aWYgKHRoaXMuZmlsZUZpbHRlck1hbmFnZXIpIHtcclxuXHRcdFx0Y29uc3QgaW5jbHVkZSA9IHRoaXMuZmlsZUZpbHRlck1hbmFnZXIuc2hvdWxkSW5jbHVkZVBhdGgoXHJcblx0XHRcdFx0ZmlsZVBhdGgsXHJcblx0XHRcdFx0XCJmaWxlXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0aWYgKCFpbmNsdWRlKSByZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHRydWU7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBQZXJmb3JtIGluaXRpYWwgc2NhbiBvZiBleGlzdGluZyBmaWxlc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgcGVyZm9ybUluaXRpYWxTY2FuKCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Y29uc29sZS5sb2coXCJbRmlsZVNvdXJjZV0gUGVyZm9ybWluZyBpbml0aWFsIHNjYW4uLi5cIik7XHJcblxyXG5cdFx0Y29uc3QgbWRGaWxlcyA9IHRoaXMuYXBwLnZhdWx0LmdldE1hcmtkb3duRmlsZXMoKTtcclxuXHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRgW0ZpbGVTb3VyY2VdIEZvdW5kICR7bWRGaWxlcy5sZW5ndGh9IG1hcmtkb3duIGZpbGVzIHRvIGNoZWNrYFxyXG5cdFx0KTtcclxuXHJcblx0XHRsZXQgc2Nhbm5lZENvdW50ID0gMDtcclxuXHRcdGxldCB0YXNrQ291bnQgPSAwO1xyXG5cdFx0bGV0IHJlbGV2YW50Q291bnQgPSAwO1xyXG5cclxuXHRcdGZvciAoY29uc3QgZmlsZSBvZiBtZEZpbGVzKSB7XHJcblx0XHRcdGlmICh0aGlzLmlzUmVsZXZhbnRGaWxlKGZpbGUucGF0aCkpIHtcclxuXHRcdFx0XHRyZWxldmFudENvdW50Kys7XHJcblx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdGNvbnN0IHNob3VsZEJlVGFzayA9IGF3YWl0IHRoaXMuc2hvdWxkQ3JlYXRlRmlsZVRhc2soXHJcblx0XHRcdFx0XHRcdGZpbGUucGF0aFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdGlmIChzaG91bGRCZVRhc2spIHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgdGFzayA9IGF3YWl0IHRoaXMuY3JlYXRlRmlsZVRhc2soZmlsZS5wYXRoKTtcclxuXHRcdFx0XHRcdFx0aWYgKHRhc2spIHtcclxuXHRcdFx0XHRcdFx0XHR0YXNrQ291bnQrKztcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0c2Nhbm5lZENvdW50Kys7XHJcblx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXHJcblx0XHRcdFx0XHRcdGBbRmlsZVNvdXJjZV0gRXJyb3Igc2Nhbm5pbmcgJHtmaWxlLnBhdGh9OmAsXHJcblx0XHRcdFx0XHRcdGVycm9yXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRgW0ZpbGVTb3VyY2VdIEluaXRpYWwgc2NhbiBjb21wbGV0ZTogJHttZEZpbGVzLmxlbmd0aH0gdG90YWwgZmlsZXMsICR7cmVsZXZhbnRDb3VudH0gcmVsZXZhbnQsICR7c2Nhbm5lZENvdW50fSBzY2FubmVkLCAke3Rhc2tDb3VudH0gZmlsZSB0YXNrcyBjcmVhdGVkYFxyXG5cdFx0KTtcclxuXHJcblx0XHRpZiAodGFza0NvdW50ID09PSAwICYmIHJlbGV2YW50Q291bnQgPiAwKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdGBbRmlsZVNvdXJjZV0gTm8gZmlsZSB0YXNrcyBjcmVhdGVkLiBDaGVjayBpZiB5b3VyIGZpbGVzIG1hdGNoIHRoZSBjb25maWd1cmVkIHJlY29nbml0aW9uIHN0cmF0ZWdpZXM6YFxyXG5cdFx0XHQpO1xyXG5cdFx0XHRjb25zdCBjb25maWcgPSB0aGlzLmNvbmZpZy5nZXRDb25maWcoKTtcclxuXHRcdFx0aWYgKGNvbmZpZy5yZWNvZ25pdGlvblN0cmF0ZWdpZXMubWV0YWRhdGEuZW5hYmxlZCkge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0YFtGaWxlU291cmNlXSAtIE1ldGFkYXRhIHN0cmF0ZWd5OiByZXF1aXJlcyBmcm9udG1hdHRlciB3aXRoIGZpZWxkczogJHtjb25maWcucmVjb2duaXRpb25TdHJhdGVnaWVzLm1ldGFkYXRhLnRhc2tGaWVsZHMuam9pbihcclxuXHRcdFx0XHRcdFx0XCIsIFwiXHJcblx0XHRcdFx0XHQpfWBcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChjb25maWcucmVjb2duaXRpb25TdHJhdGVnaWVzLnRhZ3MuZW5hYmxlZCkge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0YFtGaWxlU291cmNlXSAtIFRhZyBzdHJhdGVneTogcmVxdWlyZXMgdGFnczogJHtjb25maWcucmVjb2duaXRpb25TdHJhdGVnaWVzLnRhZ3MudGFza1RhZ3Muam9pbihcclxuXHRcdFx0XHRcdFx0XCIsIFwiXHJcblx0XHRcdFx0XHQpfWBcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChjb25maWcucmVjb2duaXRpb25TdHJhdGVnaWVzLnBhdGhzLmVuYWJsZWQpIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdGBbRmlsZVNvdXJjZV0gLSBQYXRoIHN0cmF0ZWd5OiByZXF1aXJlcyBmaWxlcyBpbiBwYXRoczogJHtjb25maWcucmVjb2duaXRpb25TdHJhdGVnaWVzLnBhdGhzLnRhc2tQYXRocy5qb2luKFxyXG5cdFx0XHRcdFx0XHRcIiwgXCJcclxuXHRcdFx0XHRcdCl9YFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSBjb25maWd1cmF0aW9uIGNoYW5nZXNcclxuXHQgKi9cclxuXHRwcml2YXRlIGhhbmRsZUNvbmZpZ0NoYW5nZShuZXdDb25maWc6IEZpbGVTb3VyY2VDb25maWd1cmF0aW9uKTogdm9pZCB7XHJcblx0XHRpZiAoIW5ld0NvbmZpZy5lbmFibGVkICYmIHRoaXMuaXNJbml0aWFsaXplZCkge1xyXG5cdFx0XHQvLyBGaWxlU291cmNlIGlzIGJlaW5nIGRpc2FibGVkXHJcblx0XHRcdHRoaXMuZGVzdHJveSgpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKG5ld0NvbmZpZy5lbmFibGVkICYmICF0aGlzLmlzSW5pdGlhbGl6ZWQpIHtcclxuXHRcdFx0Ly8gRmlsZVNvdXJjZSBpcyBiZWluZyBlbmFibGVkXHJcblx0XHRcdHRoaXMuaW5pdGlhbGl6ZSgpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ29uZmlndXJhdGlvbiBjaGFuZ2VkIHdoaWxlIGFjdGl2ZSAtIG1pZ2h0IG5lZWQgdG8gcmVzY2FuXHJcblx0XHQvLyBUaGlzIGlzIGEgUGhhc2UgMiBlbmhhbmNlbWVudFxyXG5cdFx0Y29uc29sZS5sb2coXCJbRmlsZVNvdXJjZV0gQ29uZmlndXJhdGlvbiB1cGRhdGVkXCIpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGN1cnJlbnQgc3RhdGlzdGljc1xyXG5cdCAqL1xyXG5cdGdldFN0YXRzKCk6IEZpbGVTb3VyY2VTdGF0cyB7XHJcblx0XHRyZXR1cm4gey4uLnRoaXMuc3RhdHN9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGFsbCBmaWxlIHRhc2tzIChzdHViIGZvciBQaGFzZSAyKVxyXG5cdCAqL1xyXG5cdGFzeW5jIGdldEFsbEZpbGVUYXNrcygpOiBQcm9taXNlPFRhc2s8RmlsZVNvdXJjZVRhc2tNZXRhZGF0YT5bXT4ge1xyXG5cdFx0Ly8gVGhpcyB3aWxsIGJlIGltcGxlbWVudGVkIHByb3Blcmx5IGluIFBoYXNlIDMgd2l0aCBSZXBvc2l0b3J5IGludGVncmF0aW9uXHJcblx0XHRyZXR1cm4gW107XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgY29uZmlndXJhdGlvblxyXG5cdCAqL1xyXG5cdHVwZGF0ZUNvbmZpZ3VyYXRpb24oY29uZmlnOiBQYXJ0aWFsPEZpbGVTb3VyY2VDb25maWd1cmF0aW9uPik6IHZvaWQge1xyXG5cdFx0dGhpcy5jb25maWcudXBkYXRlQ29uZmlnKGNvbmZpZyk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTeW5jIEZpbGVTb3VyY2Ugc3RhdHVzIG1hcHBpbmcgZnJvbSBwbHVnaW4gVGFza1N0YXR1cyBzZXR0aW5nc1xyXG5cdCAqL1xyXG5cdHB1YmxpYyBzeW5jU3RhdHVzTWFwcGluZ0Zyb21TZXR0aW5ncyhcclxuXHRcdHRhc2tTdGF0dXNlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxyXG5cdCk6IHZvaWQge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0dGhpcy5jb25maWcuc3luY1dpdGhUYXNrU3RhdHVzZXModGFza1N0YXR1c2VzKTtcclxuXHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFwiW0ZpbGVTb3VyY2VdIEZhaWxlZCB0byBzeW5jIHN0YXR1cyBtYXBwaW5nIGZyb20gc2V0dGluZ3NcIixcclxuXHRcdFx0XHRlXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBBbGlhcyBmb3IgdXBkYXRlQ29uZmlndXJhdGlvbiB0byBtYXRjaCBleHBlY3RlZCBpbnRlcmZhY2VcclxuXHQgKi9cclxuXHR1cGRhdGVDb25maWcoY29uZmlnOiBQYXJ0aWFsPEZpbGVTb3VyY2VDb25maWd1cmF0aW9uPik6IHZvaWQge1xyXG5cdFx0dGhpcy51cGRhdGVDb25maWd1cmF0aW9uKGNvbmZpZyk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBGb3JjZSByZWZyZXNoIG9mIGFsbCBmaWxlIHRhc2tzXHJcblx0ICovXHJcblx0YXN5bmMgcmVmcmVzaCgpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGlmICghdGhpcy5pc0luaXRpYWxpemVkIHx8ICF0aGlzLmNvbmZpZy5pc0VuYWJsZWQoKSkgcmV0dXJuO1xyXG5cclxuXHRcdC8vIENsZWFyIGNhY2hlIGFuZCByZS1zY2FuXHJcblx0XHR0aGlzLmZpbGVUYXNrQ2FjaGUuY2xlYXIoKTtcclxuXHRcdHRoaXMuc3RhdHMudHJhY2tlZEZpbGVDb3VudCA9IDA7XHJcblx0XHR0aGlzLnN0YXRzLnJlY29nbml0aW9uQnJlYWtkb3duID0ge1xyXG5cdFx0XHRtZXRhZGF0YTogMCxcclxuXHRcdFx0dGFnOiAwLFxyXG5cdFx0XHR0ZW1wbGF0ZTogMCxcclxuXHRcdFx0cGF0aDogMCxcclxuXHRcdH07XHJcblxyXG5cdFx0YXdhaXQgdGhpcy5wZXJmb3JtSW5pdGlhbFNjYW4oKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsZWFudXAgYW5kIGRlc3Ryb3kgRmlsZVNvdXJjZVxyXG5cdCAqL1xyXG5cdGRlc3Ryb3koKTogdm9pZCB7XHJcblx0XHRpZiAoIXRoaXMuaXNJbml0aWFsaXplZCkgcmV0dXJuO1xyXG5cclxuXHRcdGNvbnNvbGUubG9nKFwiW0ZpbGVTb3VyY2VdIERlc3Ryb3lpbmcgRmlsZVNvdXJjZS4uLlwiKTtcclxuXHJcblx0XHQvLyBDbGVhciBhbGwgZGVib3VuY2luZyB0aW1lb3V0c1xyXG5cdFx0Zm9yIChjb25zdCB0aW1lb3V0IG9mIHRoaXMucGVuZGluZ1VwZGF0ZXMudmFsdWVzKCkpIHtcclxuXHRcdFx0Y2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5wZW5kaW5nVXBkYXRlcy5jbGVhcigpO1xyXG5cclxuXHRcdC8vIENsZWFyIGV2ZW50IGxpc3RlbmVyc1xyXG5cdFx0Zm9yIChjb25zdCByZWYgb2YgdGhpcy5ldmVudFJlZnMpIHtcclxuXHRcdFx0dGhpcy5hcHAudmF1bHQub2ZmcmVmKHJlZik7XHJcblx0XHR9XHJcblx0XHR0aGlzLmV2ZW50UmVmcyA9IFtdO1xyXG5cclxuXHRcdC8vIENsZWFyIGNhY2hlXHJcblx0XHR0aGlzLmZpbGVUYXNrQ2FjaGUuY2xlYXIoKTtcclxuXHJcblx0XHQvLyBSZXNldCBzdGF0aXN0aWNzXHJcblx0XHR0aGlzLnN0YXRzID0ge1xyXG5cdFx0XHRpbml0aWFsaXplZDogZmFsc2UsXHJcblx0XHRcdHRyYWNrZWRGaWxlQ291bnQ6IDAsXHJcblx0XHRcdHJlY29nbml0aW9uQnJlYWtkb3duOiB7bWV0YWRhdGE6IDAsIHRhZzogMCwgdGVtcGxhdGU6IDAsIHBhdGg6IDB9LFxyXG5cdFx0XHRsYXN0VXBkYXRlOiAwLFxyXG5cdFx0XHRsYXN0VXBkYXRlU2VxOiAwLFxyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBFbWl0IGNsZWFudXAgZXZlbnRcclxuXHRcdGVtaXQodGhpcy5hcHAsIEV2ZW50cy5GSUxFX1RBU0tfUkVNT1ZFRCwge1xyXG5cdFx0XHRmaWxlUGF0aDogbnVsbCwgLy8gSW5kaWNhdGVzIGFsbCBmaWxlIHRhc2tzIHJlbW92ZWRcclxuXHRcdFx0dGltZXN0YW1wOiBEYXRlLm5vdygpLFxyXG5cdFx0XHRzZXE6IFNlcS5uZXh0KCksXHJcblx0XHRcdGRlc3Ryb3llZDogdHJ1ZSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuaXNJbml0aWFsaXplZCA9IGZhbHNlO1xyXG5cclxuXHRcdGNvbnNvbGUubG9nKFwiW0ZpbGVTb3VyY2VdIENsZWFudXAgY29tcGxldGVcIik7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDbGVhbnVwIHJlc291cmNlcyBhbmQgc3RvcCBsaXN0ZW5pbmcgdG8gZXZlbnRzXHJcblx0ICovXHJcblx0Y2xlYW51cCgpOiB2b2lkIHtcclxuXHRcdC8vIFVuc3Vic2NyaWJlIGZyb20gYWxsIGV2ZW50c1xyXG5cdFx0dGhpcy5ldmVudFJlZnMuZm9yRWFjaCgocmVmKSA9PiB7XHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHR0aGlzLmFwcC53b3Jrc3BhY2UgJiZcclxuXHRcdFx0XHR0eXBlb2YgdGhpcy5hcHAud29ya3NwYWNlLm9mZnJlZiA9PT0gXCJmdW5jdGlvblwiXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHRoaXMuYXBwLndvcmtzcGFjZS5vZmZyZWYocmVmKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0XHR0aGlzLmV2ZW50UmVmcyA9IFtdO1xyXG5cclxuXHRcdC8vIENsZWFyIHBlbmRpbmcgdXBkYXRlc1xyXG5cdFx0dGhpcy5wZW5kaW5nVXBkYXRlcy5mb3JFYWNoKCh0aW1lb3V0KSA9PiBjbGVhclRpbWVvdXQodGltZW91dCkpO1xyXG5cdFx0dGhpcy5wZW5kaW5nVXBkYXRlcy5jbGVhcigpO1xyXG5cclxuXHRcdC8vIENsZWFyIGNhY2hlXHJcblx0XHR0aGlzLmZpbGVUYXNrQ2FjaGUuY2xlYXIoKTtcclxuXHJcblx0XHQvLyBSZXNldCBzdGF0ZVxyXG5cdFx0dGhpcy5pc0luaXRpYWxpemVkID0gZmFsc2U7XHJcblx0XHR0aGlzLnN0YXRzLmluaXRpYWxpemVkID0gZmFsc2U7XHJcblxyXG5cdFx0Y29uc29sZS5sb2coXCJbRmlsZVNvdXJjZV0gQ2xlYW5lZCB1cCBhbmQgc3RvcHBlZFwiKTtcclxuXHR9XHJcbn1cclxuIl19