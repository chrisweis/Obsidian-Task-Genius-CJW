import { __awaiter } from "tslib";
import { addIcon, editorInfoField, MarkdownView, Notice, Platform, Plugin, } from "obsidian";
import { taskProgressBarExtension } from "./editor-extensions/ui-widgets/progress-bar-widget";
import { taskTimerExtension } from "./editor-extensions/date-time/task-timer";
import { updateProgressBarInElement } from "./components/features/read-mode/ReadModeProgressBarWidget";
import { applyTaskTextMarks } from "./components/features/read-mode/ReadModeTextMark";
import { DEFAULT_SETTINGS, } from "./common/setting-definition";
import { TaskProgressBarSettingTab } from "./setting";
import { autoCompleteParentExtension } from "./editor-extensions/autocomplete/parent-task-updater";
import { taskStatusSwitcherExtension } from "./editor-extensions/task-operations/status-switcher";
import { cycleCompleteStatusExtension } from "./editor-extensions/task-operations/status-cycler";
import { updateWorkflowContextMenu, workflowExtension, } from "./editor-extensions/workflow/workflow-handler";
import { workflowDecoratorExtension } from "./editor-extensions/ui-widgets/workflow-decorator";
import { workflowRootEnterHandlerExtension } from "./editor-extensions/workflow/workflow-enter-handler";
import { LETTER_PRIORITIES, priorityPickerExtension, TASK_PRIORITIES, } from "./editor-extensions/ui-widgets/priority-picker";
import { cycleTaskStatusBackward, cycleTaskStatusForward, } from "./commands/taskCycleCommands";
import { moveTaskCommand } from "./commands/taskMover";
import { autoMoveCompletedTasksCommand, moveCompletedTasksCommand, moveIncompletedTasksCommand, } from "./commands/completedTaskMover";
import { convertTaskToWorkflowCommand, convertToWorkflowRootCommand, createQuickWorkflowCommand, duplicateWorkflowCommand, showWorkflowQuickActionsCommand, startWorkflowHereCommand, } from "./commands/workflowCommands";
import { datePickerExtension } from "./editor-extensions/date-time/date-picker";
import { quickCaptureExtension, quickCaptureState, toggleQuickCapture, } from "./editor-extensions/core/quick-capture-panel";
import { migrateOldFilterOptions, taskFilterExtension, taskFilterState, toggleTaskFilter, } from "./editor-extensions/core/task-filter-panel";
// Import the enhanced QuickCaptureModal and MinimalQuickCaptureModal
import { QuickCaptureModal } from "./components/features/quick-capture/modals/QuickCaptureModalWithSwitch";
import { MinimalQuickCaptureModal } from "./components/features/quick-capture/modals/MinimalQuickCaptureModalWithSwitch";
import { MinimalQuickCaptureSuggest } from "./components/features/quick-capture/suggest/MinimalQuickCaptureSuggest";
import { SuggestManager } from "@/components/ui/suggest";
import { t } from "./translations/helper";
import { TASK_VIEW_TYPE, TaskView } from "./pages/TaskView";
import "./styles/global.css";
import "./styles/setting.css";
import "./styles/view.css";
import "./styles/view-config.css";
import "./styles/task-status.css";
import "./styles/quadrant/quadrant.css";
import "./styles/onboarding.css";
import "./styles/universal-suggest.css";
import "./styles/noise.css";
import "./styles/changelog.css";
import { TASK_SPECIFIC_VIEW_TYPE, TaskSpecificView, } from "./pages/TaskSpecificView";
import { TIMELINE_SIDEBAR_VIEW_TYPE, TimelineSidebarView, } from "./components/features/timeline-sidebar/TimelineSidebarView";
import { getStatusIcon, getTaskGeniusIcon } from "./icon";
import { RewardManager } from "./managers/reward-manager";
import { HabitManager } from "./managers/habit-manager";
import { TaskGeniusIconManager } from "./managers/icon-manager";
import { monitorTaskCompletedExtension } from "./editor-extensions/task-operations/completion-monitor";
import { sortTasksInDocument } from "./commands/sortTaskCommands";
import { taskGutterExtension } from "./editor-extensions/task-operations/gutter-marker";
import { autoDateManagerExtension } from "./editor-extensions/date-time/date-manager";
import { taskMarkCleanupExtension } from "./editor-extensions/task-operations/mark-cleanup";
import { IcsManager } from "./managers/ics-manager";
import { FluentIntegration } from "./components/features/fluent/FluentIntegration";
import { ObsidianUriHandler } from "./utils/ObsidianUriHandler";
import { VersionManager } from "./managers/version-manager";
import { RebuildProgressManager } from "./managers/rebuild-progress-manager";
import DesktopIntegrationManager from "./managers/desktop-integration-manager";
import { OnboardingConfigManager } from "./managers/onboarding-manager";
import { OnCompletionManager } from "./managers/completion-manager";
import { SettingsChangeDetector } from "./services/settings-change-detector";
import { ONBOARDING_VIEW_TYPE, OnboardingView, } from "./components/features/onboarding/OnboardingView";
import { registerTaskGeniusBasesViews } from "@/pages/bases/registerBasesViews";
import { TaskTimerExporter } from "./services/timer-export-service";
import { TaskTimerManager } from "./managers/timer-manager";
import { McpServerManager } from "./mcp/McpServerManager";
import { createDataflow } from "./dataflow/createDataflow";
import { WriteAPI } from "./dataflow/api/WriteAPI";
import { Events } from "./dataflow/events/Events";
import { installWorkspaceDragMonitor, registerRestrictedDnDViewTypes, } from "./patches/workspace-dnd-patch";
import { FLUENT_TASK_VIEW } from "./pages/FluentTaskView";
import { removePriorityAtCursor, setPriorityAtCursor, } from "./utils/task/curosr-priority-utils";
import { WorkspaceManager } from "@/components/features/fluent/managers/WorkspaceManager";
import { CHANGELOG_VIEW_TYPE, ChangelogView, } from "./components/features/changelog/ChangelogView";
import { ChangelogManager } from "./managers/changelog-manager";
export default class TaskProgressBarPlugin extends Plugin {
    constructor() {
        super(...arguments);
        // Preloaded tasks:
        this.preloadedTasks = [];
        // Helper method to set priority at cursor position
        this.isActivatingView = false;
        this.isActivatingSidebar = false;
    }
    onload() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
        return __awaiter(this, void 0, void 0, function* () {
            console.time("[TPB] onload");
            yield this.loadSettings();
            // Initialize version manager first
            this.versionManager = new VersionManager(this.app, this);
            this.addChild(this.versionManager);
            this.changelogManager = new ChangelogManager(this);
            this.registerView(CHANGELOG_VIEW_TYPE, (leaf) => new ChangelogView(leaf, this));
            // Initialize onboarding config manager
            this.onboardingConfigManager = new OnboardingConfigManager(this);
            this.settingsChangeDetector = new SettingsChangeDetector(this);
            // Initialize global suggest manager
            this.globalSuggestManager = new SuggestManager(this.app, this);
            this.workspaceManager = new WorkspaceManager(this);
            yield this.workspaceManager.migrateToV2();
            this.workspaceManager.ensureDefaultWorkspaceInvariant();
            // Initialize URI handler
            this.uriHandler = new ObsidianUriHandler(this);
            this.uriHandler.register();
            // Initialize rebuild progress manager
            this.rebuildProgressManager = new RebuildProgressManager();
            // Initialize task management systems
            if (this.settings.enableIndexer) {
                // Initialize indexer-dependent features
                if (this.settings.enableView) {
                    this.loadViews();
                }
                // Check for version changes and handle rebuild if needed
                if (this.dataflowOrchestrator) {
                    // Initialize with version check for dataflow
                    this.initializeDataflowWithVersionCheck().catch((error) => {
                        console.error("Failed to initialize dataflow with version check:", error);
                    });
                }
                console.time("[TPB] registerViewsAndCommands");
                // Register the TaskView
                this.v2Integration = new FluentIntegration(this);
                yield this.v2Integration.migrateSettings();
                this.v2Integration.register();
                this.registerView(TASK_VIEW_TYPE, (leaf) => new TaskView(leaf, this));
                this.registerView(TASK_SPECIFIC_VIEW_TYPE, (leaf) => new TaskSpecificView(leaf, this));
                // Register the Timeline Sidebar View
                this.registerView(TIMELINE_SIDEBAR_VIEW_TYPE, (leaf) => new TimelineSidebarView(leaf, this));
                // Register the Onboarding View
                this.registerView(ONBOARDING_VIEW_TYPE, (leaf) => new OnboardingView(leaf, this, () => {
                    console.log("Onboarding completed successfully");
                    // Close the onboarding view and refresh views
                    leaf.detach();
                }));
                // Register Bases views if Bases plugin is available
                try {
                    registerTaskGeniusBasesViews(this);
                }
                catch (error) {
                    console.log("Failed to register Bases views:", error);
                    // Not critical if Bases plugin is not installed
                }
                // Add a command to open the TaskView
                this.addCommand({
                    id: "open-task-genius-view",
                    name: t("Open Task Genius view"),
                    callback: () => {
                        this.activateTaskView();
                    },
                });
                // Add a command to open the Timeline Sidebar View
                this.addCommand({
                    id: "open-timeline-sidebar-view",
                    name: t("Open Timeline Sidebar"),
                    callback: () => {
                        this.activateTimelineSidebarView();
                    },
                });
                // Add a command to open the Onboarding/Setup View
                this.addCommand({
                    id: "open-task-genius-setup",
                    name: t("Open Task Genius Setup"),
                    callback: () => {
                        this.openOnboardingView();
                    },
                });
                this.addCommand({
                    id: "open-task-genius-changelog",
                    name: t("Open Task Genius changelog"),
                    callback: () => {
                        var _a;
                        if (!this.changelogManager) {
                            return;
                        }
                        const targetVersion = ((_a = this.manifest) === null || _a === void 0 ? void 0 : _a.version) ||
                            this.settings.changelog.lastVersion;
                        if (!targetVersion) {
                            return;
                        }
                        const isBeta = targetVersion.toLowerCase().includes("beta");
                        void this.changelogManager.openChangelog(targetVersion, isBeta);
                    },
                });
                addIcon("task-genius", getTaskGeniusIcon());
                addIcon("completed", getStatusIcon("completed"));
                addIcon("inProgress", getStatusIcon("inProgress"));
                addIcon("planned", getStatusIcon("planned"));
                addIcon("abandoned", getStatusIcon("abandoned"));
                addIcon("notStarted", getStatusIcon("notStarted"));
                // Add a ribbon icon for opening the TaskView
                this.addRibbonIcon("task-genius", t("Open Task Genius view"), () => {
                    this.activateTaskView();
                });
                // Initialize dataflow orchestrator (primary architecture)
                try {
                    // Wait for dataflow initialization to complete before proceeding
                    this.dataflowOrchestrator = yield createDataflow(this.app, this.app.vault, this.app.metadataCache, this, {
                        configFileName: ((_b = (_a = this.settings.projectConfig) === null || _a === void 0 ? void 0 : _a.configFile) === null || _b === void 0 ? void 0 : _b.fileName) ||
                            "project.md",
                        searchRecursively: (_e = (_d = (_c = this.settings.projectConfig) === null || _c === void 0 ? void 0 : _c.configFile) === null || _d === void 0 ? void 0 : _d.searchRecursively) !== null && _e !== void 0 ? _e : true,
                        metadataKey: ((_g = (_f = this.settings.projectConfig) === null || _f === void 0 ? void 0 : _f.metadataConfig) === null || _g === void 0 ? void 0 : _g.metadataKey) || "project",
                        pathMappings: ((_h = this.settings.projectConfig) === null || _h === void 0 ? void 0 : _h.pathMappings) || [],
                        metadataMappings: ((_j = this.settings.projectConfig) === null || _j === void 0 ? void 0 : _j.metadataMappings) || [],
                        defaultProjectNaming: ((_k = this.settings.projectConfig) === null || _k === void 0 ? void 0 : _k.defaultProjectNaming) || {
                            strategy: "filename",
                            stripExtension: true,
                            enabled: false,
                        },
                        enhancedProjectEnabled: (_m = (_l = this.settings.projectConfig) === null || _l === void 0 ? void 0 : _l.enableEnhancedProject) !== null && _m !== void 0 ? _m : false,
                        metadataConfigEnabled: (_q = (_p = (_o = this.settings.projectConfig) === null || _o === void 0 ? void 0 : _o.metadataConfig) === null || _p === void 0 ? void 0 : _p.enabled) !== null && _q !== void 0 ? _q : false,
                        configFileEnabled: (_t = (_s = (_r = this.settings.projectConfig) === null || _r === void 0 ? void 0 : _r.configFile) === null || _s === void 0 ? void 0 : _s.enabled) !== null && _t !== void 0 ? _t : false,
                        detectionMethods: ((_v = (_u = this.settings.projectConfig) === null || _u === void 0 ? void 0 : _u.metadataConfig) === null || _v === void 0 ? void 0 : _v.detectionMethods) || [],
                    });
                }
                catch (error) {
                    console.error("[Plugin] Failed to initialize dataflow orchestrator:", error);
                    // Fatal error - cannot continue without dataflow
                    new Notice(t("Failed to initialize task system. Please restart Obsidian."));
                }
                // Initialize WriteAPI (always, as dataflow is now primary)
                const getTaskById = (id) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        if (!this.dataflowOrchestrator) {
                            return null;
                        }
                        const repository = this.dataflowOrchestrator.getRepository();
                        const task = yield repository.getTaskById(id);
                        return task || null;
                    }
                    catch (e) {
                        console.warn("Failed to get task from dataflow", e);
                        return null;
                    }
                });
                this.writeAPI = new WriteAPI(this.app, this.app.vault, this.app.metadataCache, this, getTaskById);
                // Initialize OnCompletionManager
                this.onCompletionManager = new OnCompletionManager(this.app, this);
                this.addChild(this.onCompletionManager);
                console.log("[Plugin] OnCompletionManager initialized");
            }
            if (this.settings.rewards.enableRewards) {
                this.rewardManager = new RewardManager(this);
                this.addChild(this.rewardManager);
                this.registerEditorExtension([
                    monitorTaskCompletedExtension(this.app, this),
                ]);
            }
            this.registerCommands();
            this.registerEditorExt();
            // Install workspace DnD monkey patch (blocks dragging restricted views to center)
            installWorkspaceDragMonitor(this);
            // Also restrict V2 main view from being dropped to center, as it is sidebar-managed
            try {
                registerRestrictedDnDViewTypes(FLUENT_TASK_VIEW);
            }
            catch (_w) { }
            this.settingTab = new TaskProgressBarSettingTab(this.app, this);
            this.addSettingTab(this.settingTab);
            this.registerEvent(this.app.workspace.on("editor-menu", (menu, editor) => {
                if (this.settings.enablePriorityKeyboardShortcuts) {
                    menu.addItem((item) => {
                        item.setTitle(t("Set priority"));
                        item.setIcon("list-ordered");
                        // @ts-ignore
                        const submenu = item.setSubmenu();
                        // Emoji priority commands
                        Object.entries(TASK_PRIORITIES).forEach(([key, priority]) => {
                            if (key !== "none") {
                                submenu.addItem((item) => {
                                    item.setTitle(`${t("Set priority")}: ${priority.text}`);
                                    item.setIcon("arrow-big-up-dash");
                                    item.onClick(() => {
                                        setPriorityAtCursor(editor, priority.emoji);
                                    });
                                });
                            }
                        });
                        submenu.addSeparator();
                        // Letter priority commands
                        Object.entries(LETTER_PRIORITIES).forEach(([key, priority]) => {
                            submenu.addItem((item) => {
                                item.setTitle(`${t("Set priority")}: ${key}`);
                                item.setIcon("a-arrow-up");
                                item.onClick(() => {
                                    setPriorityAtCursor(editor, `[#${key}]`);
                                });
                            });
                        });
                        // Remove priority command
                        submenu.addItem((item) => {
                            item.setTitle(t("Remove Priority"));
                            item.setIcon("list-x");
                            // @ts-ignore
                            item.setWarning(true);
                            item.onClick(() => {
                                removePriorityAtCursor(editor);
                            });
                        });
                    });
                }
                // Add workflow context menu
                if (this.settings.workflow.enableWorkflow) {
                    updateWorkflowContextMenu(menu, editor, this);
                }
            }));
            this.app.workspace.onLayoutReady(() => __awaiter(this, void 0, void 0, function* () {
                console.time("[TPB] onLayoutReady");
                // Update workspace leaves when layout is ready
                const deferWorkspaceLeaves = this.app.workspace.getLeavesOfType(TASK_VIEW_TYPE);
                const deferSpecificLeaves = this.app.workspace.getLeavesOfType(TASK_SPECIFIC_VIEW_TYPE);
                [...deferWorkspaceLeaves, ...deferSpecificLeaves].forEach((leaf) => {
                    leaf.loadIfDeferred();
                });
                // Initialize Task Genius Icon Manager
                this.taskGeniusIconManager = new TaskGeniusIconManager(this);
                this.addChild(this.taskGeniusIconManager);
                // Initialize MCP Server Manager (desktop only)
                if (Platform.isDesktopApp) {
                    this.mcpServerManager = new McpServerManager(this);
                    this.mcpServerManager.initialize();
                    // Initialize Notification Manager (desktop only)
                    this.notificationManager = new DesktopIntegrationManager(this);
                    this.addChild(this.notificationManager);
                    // Subscribe to task cache updates to inform notifications
                    this.registerEvent(this.app.workspace.on(Events.TASK_CACHE_UPDATED, () => { var _a; return (_a = this.notificationManager) === null || _a === void 0 ? void 0 : _a.onTaskCacheUpdated(); }));
                }
                // Check and show onboarding for first-time users
                this.checkAndShowOnboarding();
                if (this.settings.autoCompleteParent) {
                    this.registerEditorExtension([
                        autoCompleteParentExtension(this.app, this),
                    ]);
                }
                if (this.settings.enableCycleCompleteStatus) {
                    this.registerEditorExtension([
                        cycleCompleteStatusExtension(this.app, this),
                    ]);
                }
                this.registerMarkdownPostProcessor((el, ctx) => {
                    // Apply custom task text marks (replaces checkboxes with styled marks)
                    if (this.settings.enableTaskStatusSwitcher) {
                        applyTaskTextMarks({
                            plugin: this,
                            element: el,
                            ctx: ctx,
                        });
                    }
                    // Apply progress bars (existing functionality)
                    if (this.settings.enableProgressbarInReadingMode &&
                        this.settings.progressBarDisplayMode !== "none") {
                        updateProgressBarInElement({
                            plugin: this,
                            element: el,
                            ctx: ctx,
                        });
                    }
                });
                if (this.settings.habit.enableHabits) {
                    this.habitManager = new HabitManager(this);
                    this.addChild(this.habitManager);
                }
                // Initialize ICS manager if sources are configured
                if (this.settings.icsIntegration.sources.length > 0) {
                    this.icsManager = new IcsManager(this.settings.icsIntegration, this.settings, this);
                    this.addChild(this.icsManager);
                    // Initialize ICS manager
                    this.icsManager.initialize().catch((error) => {
                        console.error("Failed to initialize ICS manager:", error);
                    });
                }
                // Auto-open timeline sidebar if enabled
                if (this.settings.timelineSidebar.enableTimelineSidebar &&
                    this.settings.timelineSidebar.autoOpenOnStartup) {
                    // Delay opening to ensure workspace is ready
                    setTimeout(() => {
                        this.activateTimelineSidebarView().catch((error) => {
                            console.error("Failed to auto-open timeline sidebar:", error);
                        });
                    }, 1000);
                }
                this.maybeShowChangelog();
                console.timeEnd("[TPB] onLayoutReady");
            }));
            // Migrate old presets to use the new filterMode setting
            console.time("[TPB] migratePresetTaskFilters");
            if (this.settings.taskFilter &&
                this.settings.taskFilter.presetTaskFilters) {
                this.settings.taskFilter.presetTaskFilters =
                    this.settings.taskFilter.presetTaskFilters.map((preset) => {
                        if (preset.options) {
                            preset.options = migrateOldFilterOptions(preset.options);
                        }
                        return preset;
                    });
                yield this.saveSettings();
                console.timeEnd("[TPB] migratePresetTaskFilters");
            }
            // Add command for quick capture with metadata
            this.addCommand({
                id: "quick-capture",
                name: t("Quick Capture"),
                callback: () => {
                    // Create a modal with full task metadata options
                    // The new modal will automatically handle mode switching
                    new QuickCaptureModal(this.app, this, undefined, true).open();
                },
            });
            // Add command for minimal quick capture
            this.addCommand({
                id: "minimal-quick-capture",
                name: t("Minimal Quick Capture"),
                callback: () => {
                    // Create a minimal modal for quick task capture
                    new MinimalQuickCaptureModal(this.app, this).open();
                },
            });
            // Add command for quick file creation
            this.addCommand({
                id: "quick-file-create",
                name: t("Quick File Create"),
                callback: () => {
                    // Create a modal with file creation mode metadata
                    const modal = new QuickCaptureModal(this.app, this, {
                        location: "file",
                    });
                    // The modal will detect file location and switch to file mode
                    modal.open();
                },
            });
            // Add command for toggling task filter
            this.addCommand({
                id: "toggle-task-filter",
                name: t("Toggle task filter panel"),
                editorCallback: (editor, ctx) => {
                    const view = editor.cm;
                    if (view) {
                        view.dispatch({
                            effects: toggleTaskFilter.of(!view.state.field(taskFilterState)),
                        });
                    }
                },
            });
            console.timeEnd("[TPB] onload");
        });
    }
    registerCommands() {
        var _a;
        if (this.settings.sortTasks) {
            this.addCommand({
                id: "sort-tasks-by-due-date",
                name: t("Sort Tasks in Section"),
                editorCallback: (editor, view) => {
                    const editorView = editor.cm;
                    if (!editorView)
                        return;
                    const changes = sortTasksInDocument(editorView, this, false);
                    if (changes) {
                        new Notice(t("Tasks sorted (using settings). Change application needs refinement."));
                    }
                    else {
                        // Notice is already handled within sortTasksInDocument if no changes or sorting disabled
                    }
                },
            });
            this.addCommand({
                id: "sort-tasks-in-entire-document",
                name: t("Sort Tasks in Entire Document"),
                editorCallback: (editor, view) => {
                    const editorView = editor.cm;
                    if (!editorView)
                        return;
                    const changes = sortTasksInDocument(editorView, this, true);
                    if (changes) {
                        const info = editorView.state.field(editorInfoField);
                        if (!info || !info.file)
                            return;
                        this.app.vault.process(info.file, (data) => {
                            return changes;
                        });
                        new Notice(t("Entire document sorted (using settings)."));
                    }
                    else {
                        new Notice(t("Tasks already sorted or no tasks found."));
                    }
                },
            });
        }
        // Add command for cycling task status forward
        this.addCommand({
            id: "cycle-task-status-forward",
            name: t("Cycle task status forward"),
            editorCheckCallback: (checking, editor, ctx) => {
                return cycleTaskStatusForward(checking, editor, ctx, this);
            },
        });
        // Add command for cycling task status backward
        this.addCommand({
            id: "cycle-task-status-backward",
            name: t("Cycle task status backward"),
            editorCheckCallback: (checking, editor, ctx) => {
                return cycleTaskStatusBackward(checking, editor, ctx, this);
            },
        });
        if (this.settings.enableIndexer) {
            // Add command to refresh the task index
            this.addCommand({
                id: "refresh-task-index",
                name: t("Refresh task index"),
                callback: () => __awaiter(this, void 0, void 0, function* () {
                    var _b;
                    try {
                        new Notice(t("Refreshing task index..."));
                        // Check if dataflow is enabled
                        if (((_b = this.settings) === null || _b === void 0 ? void 0 : _b.enableIndexer) &&
                            this.dataflowOrchestrator) {
                            // Use dataflow orchestrator for refresh
                            console.log("[Command] Refreshing task index via dataflow");
                            // Re-scan all files to refresh the index
                            const files = this.app.vault.getMarkdownFiles();
                            const canvasFiles = this.app.vault
                                .getFiles()
                                .filter((f) => f.extension === "canvas");
                            const allFiles = [...files, ...canvasFiles];
                            // Process files in batches
                            const batchSize = 50;
                            for (let i = 0; i < allFiles.length; i += batchSize) {
                                const batch = allFiles.slice(i, i + batchSize);
                                yield Promise.all(batch.map((file) => this.dataflowOrchestrator.processFileImmediate(file)));
                            }
                            // Refresh ICS events if available
                            const icsSource = this.dataflowOrchestrator
                                .icsSource;
                            if (icsSource) {
                                yield icsSource.refresh();
                            }
                        }
                        // else {
                        // 	// Use legacy task manager
                        // 	await this.taskManager.initialize();
                        // }
                        new Notice(t("Task index refreshed"));
                    }
                    catch (error) {
                        console.error("Failed to refresh task index:", error);
                        new Notice(t("Failed to refresh task index"));
                    }
                }),
            });
            // Add command to force reindex all tasks by clearing cache
            this.addCommand({
                id: "force-reindex-tasks",
                name: t("Force reindex all tasks"),
                callback: () => __awaiter(this, void 0, void 0, function* () {
                    var _c;
                    try {
                        // Check if dataflow is enabled
                        if (((_c = this.settings) === null || _c === void 0 ? void 0 : _c.enableIndexer) &&
                            this.dataflowOrchestrator) {
                            // Use dataflow orchestrator for force reindex
                            console.log("[Command] Force reindexing via dataflow");
                            new Notice(t("Clearing task cache and rebuilding index..."));
                            // Clear all caches and rebuild from scratch
                            yield this.dataflowOrchestrator.rebuild();
                            // Refresh ICS events after rebuild
                            const icsSource = this
                                .dataflowOrchestrator.icsSource;
                            if (icsSource) {
                                yield icsSource.refresh();
                            }
                            new Notice(t("Task index completely rebuilt"));
                        }
                        else {
                            // No dataflow available
                            new Notice(t("Task system not initialized"));
                        }
                    }
                    catch (error) {
                        console.error("Failed to force reindex tasks:", error);
                        new Notice(t("Failed to force reindex tasks"));
                    }
                }),
            });
        }
        // Habit commands
        this.addCommand({
            id: "reindex-habits",
            name: t("Reindex habits"),
            callback: () => __awaiter(this, void 0, void 0, function* () {
                var _d;
                try {
                    yield ((_d = this.habitManager) === null || _d === void 0 ? void 0 : _d.initializeHabits());
                    new Notice(t("Habit index refreshed"));
                }
                catch (e) {
                    console.error("Failed to reindex habits", e);
                    new Notice(t("Failed to refresh habit index"));
                }
            }),
        });
        // Add priority keyboard shortcuts commands
        if (this.settings.enablePriorityKeyboardShortcuts) {
            // Emoji priority commands
            Object.entries(TASK_PRIORITIES).forEach(([key, priority]) => {
                if (key !== "none") {
                    this.addCommand({
                        id: `set-priority-${key}`,
                        name: `${t("Set priority")} ${priority.text}`,
                        editorCallback: (editor) => {
                            setPriorityAtCursor(editor, priority.emoji);
                        },
                    });
                }
            });
            // Letter priority commands
            Object.entries(LETTER_PRIORITIES).forEach(([key, priority]) => {
                this.addCommand({
                    id: `set-priority-letter-${key}`,
                    name: `${t("Set priority")} ${key}`,
                    editorCallback: (editor) => {
                        setPriorityAtCursor(editor, `[#${key}]`);
                    },
                });
            });
            // Remove priority command
            this.addCommand({
                id: "remove-priority",
                name: t("Remove priority"),
                editorCallback: (editor) => {
                    removePriorityAtCursor(editor);
                },
            });
        }
        // Add command for moving tasks
        this.addCommand({
            id: "move-task-to-file",
            name: t("Move task to another file"),
            editorCheckCallback: (checking, editor, ctx) => {
                return moveTaskCommand(checking, editor, ctx, this);
            },
        });
        // Add commands for moving completed tasks
        if (this.settings.completedTaskMover.enableCompletedTaskMover) {
            // Command for moving all completed subtasks and their children
            this.addCommand({
                id: "move-completed-subtasks-to-file",
                name: t("Move all completed subtasks to another file"),
                editorCheckCallback: (checking, editor, ctx) => {
                    return moveCompletedTasksCommand(checking, editor, ctx, this, "allCompleted");
                },
            });
            // Command for moving direct completed children
            this.addCommand({
                id: "move-direct-completed-subtasks-to-file",
                name: t("Move direct completed subtasks to another file"),
                editorCheckCallback: (checking, editor, ctx) => {
                    return moveCompletedTasksCommand(checking, editor, ctx, this, "directChildren");
                },
            });
            // Command for moving all subtasks (completed and uncompleted)
            this.addCommand({
                id: "move-all-subtasks-to-file",
                name: t("Move all subtasks to another file"),
                editorCheckCallback: (checking, editor, ctx) => {
                    return moveCompletedTasksCommand(checking, editor, ctx, this, "all");
                },
            });
            // Auto-move commands (using default settings)
            if (this.settings.completedTaskMover.enableAutoMove) {
                this.addCommand({
                    id: "auto-move-completed-subtasks",
                    name: t("Auto-move completed subtasks to default file"),
                    editorCheckCallback: (checking, editor, ctx) => {
                        return autoMoveCompletedTasksCommand(checking, editor, ctx, this, "allCompleted");
                    },
                });
                this.addCommand({
                    id: "auto-move-direct-completed-subtasks",
                    name: t("Auto-move direct completed subtasks to default file"),
                    editorCheckCallback: (checking, editor, ctx) => {
                        return autoMoveCompletedTasksCommand(checking, editor, ctx, this, "directChildren");
                    },
                });
                this.addCommand({
                    id: "auto-move-all-subtasks",
                    name: t("Auto-move all subtasks to default file"),
                    editorCheckCallback: (checking, editor, ctx) => {
                        return autoMoveCompletedTasksCommand(checking, editor, ctx, this, "all");
                    },
                });
            }
        }
        // Add commands for moving incomplete tasks
        if (this.settings.completedTaskMover.enableIncompletedTaskMover) {
            // Command for moving all incomplete subtasks and their children
            this.addCommand({
                id: "move-incompleted-subtasks-to-file",
                name: t("Move all incomplete subtasks to another file"),
                editorCheckCallback: (checking, editor, ctx) => {
                    return moveIncompletedTasksCommand(checking, editor, ctx, this, "allIncompleted");
                },
            });
            // Command for moving direct incomplete children
            this.addCommand({
                id: "move-direct-incompleted-subtasks-to-file",
                name: t("Move direct incomplete subtasks to another file"),
                editorCheckCallback: (checking, editor, ctx) => {
                    return moveIncompletedTasksCommand(checking, editor, ctx, this, "directIncompletedChildren");
                },
            });
            // Auto-move commands for incomplete tasks (using default settings)
            if (this.settings.completedTaskMover.enableIncompletedAutoMove) {
                this.addCommand({
                    id: "auto-move-incomplete-subtasks",
                    name: t("Auto-move incomplete subtasks to default file"),
                    editorCheckCallback: (checking, editor, ctx) => {
                        return autoMoveCompletedTasksCommand(checking, editor, ctx, this, "allIncompleted");
                    },
                });
                this.addCommand({
                    id: "auto-move-direct-incomplete-subtasks",
                    name: t("Auto-move direct incomplete subtasks to default file"),
                    editorCheckCallback: (checking, editor, ctx) => {
                        return autoMoveCompletedTasksCommand(checking, editor, ctx, this, "directIncompletedChildren");
                    },
                });
            }
        }
        // Add command for toggling quick capture panel in editor
        this.addCommand({
            id: "toggle-quick-capture",
            name: t("Toggle quick capture panel in editor"),
            editorCallback: (editor) => {
                const editorView = editor.cm;
                try {
                    // Check if the state field exists
                    const stateField = editorView.state.field(quickCaptureState);
                    // Toggle the quick capture panel
                    editorView.dispatch({
                        effects: toggleQuickCapture.of(!stateField),
                    });
                }
                catch (e) {
                    // Field doesn't exist, create it with value true (to show panel)
                    editorView.dispatch({
                        effects: toggleQuickCapture.of(true),
                    });
                }
            },
        });
        this.addCommand({
            id: "toggle-quick-capture-globally",
            name: t("Toggle quick capture panel in editor (Globally)"),
            callback: () => {
                const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (activeLeaf && activeLeaf.editor) {
                    // If we're in a markdown editor, use the editor command
                    const editorView = activeLeaf.editor.cm;
                    // Import necessary functions dynamically to avoid circular dependencies
                    try {
                        // Show the quick capture panel
                        editorView.dispatch({
                            effects: toggleQuickCapture.of(true),
                        });
                    }
                    catch (e) {
                        // No quick capture state found, try to add the extension first
                        // This is a simplified approach and might not work in all cases
                        this.registerEditorExtension([
                            quickCaptureExtension(this.app, this),
                        ]);
                        // Try again after registering the extension
                        setTimeout(() => {
                            try {
                                editorView.dispatch({
                                    effects: toggleQuickCapture.of(true),
                                });
                            }
                            catch (e) {
                                new Notice(t("Could not open quick capture panel in the current editor"));
                            }
                        }, 100);
                    }
                }
            },
        });
        // Workflow commands
        if (this.settings.workflow.enableWorkflow) {
            this.addCommand({
                id: "create-quick-workflow",
                name: t("Create quick workflow"),
                editorCheckCallback: (checking, editor, ctx) => {
                    return createQuickWorkflowCommand(checking, editor, ctx, this);
                },
            });
            this.addCommand({
                id: "convert-task-to-workflow",
                name: t("Convert task to workflow template"),
                editorCheckCallback: (checking, editor, ctx) => {
                    return convertTaskToWorkflowCommand(checking, editor, ctx, this);
                },
            });
            this.addCommand({
                id: "start-workflow-here",
                name: t("Start workflow here"),
                editorCheckCallback: (checking, editor, ctx) => {
                    return startWorkflowHereCommand(checking, editor, ctx, this);
                },
            });
            this.addCommand({
                id: "convert-to-workflow-root",
                name: t("Convert current task to workflow root"),
                editorCheckCallback: (checking, editor, ctx) => {
                    return convertToWorkflowRootCommand(checking, editor, ctx, this);
                },
            });
            this.addCommand({
                id: "duplicate-workflow",
                name: t("Duplicate workflow"),
                editorCheckCallback: (checking, editor, ctx) => {
                    return duplicateWorkflowCommand(checking, editor, ctx, this);
                },
            });
            this.addCommand({
                id: "workflow-quick-actions",
                name: t("Workflow quick actions"),
                editorCheckCallback: (checking, editor, ctx) => {
                    return showWorkflowQuickActionsCommand(checking, editor, ctx, this);
                },
            });
        }
        // Task timer export/import commands
        if (((_a = this.settings.taskTimer) === null || _a === void 0 ? void 0 : _a.enabled) && this.taskTimerExporter) {
            this.addCommand({
                id: "export-task-timer-data",
                name: "Export task timer data",
                callback: () => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const stats = this.taskTimerExporter.getExportStats();
                        if (stats.activeTimers === 0) {
                            new Notice("No timer data to export");
                            return;
                        }
                        const jsonData = this.taskTimerExporter.exportToJSON(true);
                        // Create a blob and download link
                        const blob = new Blob([jsonData], {
                            type: "application/json",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `task-timer-data-${new Date().toISOString().split("T")[0]}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        new Notice(`Exported ${stats.activeTimers} timer records`);
                    }
                    catch (error) {
                        console.error("Error exporting timer data:", error);
                        new Notice("Failed to export timer data");
                    }
                }),
            });
            this.addCommand({
                id: "import-task-timer-data",
                name: "Import task timer data",
                callback: () => __awaiter(this, void 0, void 0, function* () {
                    try {
                        // Create file input for JSON import
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = ".json";
                        input.onchange = (e) => __awaiter(this, void 0, void 0, function* () {
                            var _e;
                            const file = (_e = e.target
                                .files) === null || _e === void 0 ? void 0 : _e[0];
                            if (!file)
                                return;
                            try {
                                const text = yield file.text();
                                const success = this.taskTimerExporter.importFromJSON(text);
                                if (success) {
                                    new Notice("Timer data imported successfully");
                                }
                                else {
                                    new Notice("Failed to import timer data - invalid format");
                                }
                            }
                            catch (error) {
                                console.error("Error importing timer data:", error);
                                new Notice("Failed to import timer data");
                            }
                        });
                        input.click();
                    }
                    catch (error) {
                        console.error("Error setting up import:", error);
                        new Notice("Failed to set up import");
                    }
                }),
            });
            this.addCommand({
                id: "export-task-timer-yaml",
                name: "Export task timer data (YAML)",
                callback: () => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const stats = this.taskTimerExporter.getExportStats();
                        if (stats.activeTimers === 0) {
                            new Notice("No timer data to export");
                            return;
                        }
                        const yamlData = this.taskTimerExporter.exportToYAML(true);
                        // Create a blob and download link
                        const blob = new Blob([yamlData], {
                            type: "text/yaml",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `task-timer-data-${new Date().toISOString().split("T")[0]}.yaml`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        new Notice(`Exported ${stats.activeTimers} timer records to YAML`);
                    }
                    catch (error) {
                        console.error("Error exporting timer data to YAML:", error);
                        new Notice("Failed to export timer data to YAML");
                    }
                }),
            });
            this.addCommand({
                id: "backup-task-timer-data",
                name: "Create task timer backup",
                callback: () => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const backupData = this.taskTimerExporter.createBackup();
                        // Create a blob and download link
                        const blob = new Blob([backupData], {
                            type: "application/json",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `task-timer-backup-${new Date()
                            .toISOString()
                            .replace(/[:.]/g, "-")}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        new Notice("Task timer backup created");
                    }
                    catch (error) {
                        console.error("Error creating timer backup:", error);
                        new Notice("Failed to create timer backup");
                    }
                }),
            });
            this.addCommand({
                id: "show-task-timer-stats",
                name: "Show task timer statistics",
                callback: () => {
                    try {
                        const stats = this.taskTimerExporter.getExportStats();
                        let message = `Task Timer Statistics:\n`;
                        message += `Active timers: ${stats.activeTimers}\n`;
                        message += `Total duration: ${Math.round(stats.totalDuration / 60000)} minutes\n`;
                        if (stats.oldestTimer) {
                            message += `Oldest timer: ${stats.oldestTimer}\n`;
                        }
                        if (stats.newestTimer) {
                            message += `Newest timer: ${stats.newestTimer}`;
                        }
                        new Notice(message, 10000);
                    }
                    catch (error) {
                        console.error("Error getting timer stats:", error);
                        new Notice("Failed to get timer statistics");
                    }
                },
            });
        }
    }
    registerEditorExt() {
        var _a;
        this.registerEditorExtension([
            taskProgressBarExtension(this.app, this),
        ]);
        // Add task timer extension
        if ((_a = this.settings.taskTimer) === null || _a === void 0 ? void 0 : _a.enabled) {
            // Initialize task timer manager and exporter
            if (!this.taskTimerManager) {
                this.taskTimerManager = new TaskTimerManager(this.settings.taskTimer);
            }
            if (!this.taskTimerExporter) {
                this.taskTimerExporter = new TaskTimerExporter(this.taskTimerManager);
            }
            this.registerEditorExtension([taskTimerExtension(this)]);
        }
        this.settings.taskGutter.enableTaskGutter &&
            this.registerEditorExtension([taskGutterExtension(this.app, this)]);
        this.settings.enableTaskStatusSwitcher &&
            this.settings.enableCustomTaskMarks &&
            this.registerEditorExtension([
                taskStatusSwitcherExtension(this.app, this),
            ]);
        // Add priority picker extension
        if (this.settings.enablePriorityPicker) {
            this.registerEditorExtension([
                priorityPickerExtension(this.app, this),
            ]);
        }
        // Add date picker extension
        if (this.settings.enableDatePicker) {
            this.registerEditorExtension([datePickerExtension(this.app, this)]);
        }
        // Add workflow extension
        if (this.settings.workflow.enableWorkflow) {
            this.registerEditorExtension([workflowExtension(this.app, this)]);
            this.registerEditorExtension([
                workflowDecoratorExtension(this.app, this),
            ]);
            this.registerEditorExtension([
                workflowRootEnterHandlerExtension(this.app, this),
            ]);
        }
        // Add quick capture extension
        if (this.settings.quickCapture.enableQuickCapture) {
            this.registerEditorExtension([
                quickCaptureExtension(this.app, this),
            ]);
        }
        // Initialize minimal quick capture suggest
        if (this.settings.quickCapture.enableMinimalMode) {
            this.minimalQuickCaptureSuggest = new MinimalQuickCaptureSuggest(this.app, this);
            this.registerEditorSuggest(this.minimalQuickCaptureSuggest);
        }
        // Add task filter extension
        if (this.settings.taskFilter.enableTaskFilter) {
            this.registerEditorExtension([taskFilterExtension(this)]);
        }
        // Add auto date manager extension
        if (this.settings.autoDateManager.enabled) {
            this.registerEditorExtension([
                autoDateManagerExtension(this.app, this),
            ]);
        }
        // Add task mark cleanup extension (always enabled)
        this.registerEditorExtension([taskMarkCleanupExtension()]);
    }
    onunload() {
        // Clean up global suggest manager
        if (this.globalSuggestManager) {
            this.globalSuggestManager.cleanup();
        }
        // Bases views are automatically unregistered by Obsidian when plugin unloads
        // Clean up dataflow orchestrator (experimental)
        if (this.dataflowOrchestrator) {
            this.dataflowOrchestrator.cleanup().catch((error) => {
                console.error("Error cleaning up dataflow orchestrator:", error);
            });
            // Set to undefined to prevent any further access
            this.dataflowOrchestrator = undefined;
        }
        // Clean up MCP server manager (desktop only)
        if (this.mcpServerManager) {
            this.mcpServerManager.cleanup();
        }
        // Task Genius Icon Manager cleanup is handled automatically by Component system
    }
    /**
     * Check and show onboarding for first-time users or users who request it
     */
    checkAndShowOnboarding() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Check if this is the first install and onboarding hasn't been completed
                const versionResult = yield this.versionManager.checkVersionChange();
                const isFirstInstall = versionResult.versionInfo.isFirstInstall;
                const shouldShowOnboarding = this.onboardingConfigManager.shouldShowOnboarding();
                // For existing users with changes, let the view handle the async detection
                // For new users, show onboarding directly
                if ((isFirstInstall && shouldShowOnboarding) ||
                    (!isFirstInstall &&
                        shouldShowOnboarding &&
                        this.settingsChangeDetector.hasUserMadeChanges())) {
                    // Small delay to ensure UI is ready
                    this.openOnboardingView();
                }
            }
            catch (error) {
                console.error("Failed to check onboarding status:", error);
            }
        });
    }
    /**
     * Open the onboarding view in a new leaf
     */
    openOnboardingView() {
        return __awaiter(this, void 0, void 0, function* () {
            const { workspace } = this.app;
            // Check if onboarding view is already open
            const existingLeaf = workspace.getLeavesOfType(ONBOARDING_VIEW_TYPE)[0];
            if (existingLeaf) {
                workspace.revealLeaf(existingLeaf);
                return;
            }
            // Create a new leaf in the main area and open the onboarding view
            const leaf = workspace.getLeaf("tab");
            yield leaf.setViewState({ type: ONBOARDING_VIEW_TYPE });
            workspace.revealLeaf(leaf);
        });
    }
    closeAllViewsFromTaskGenius() {
        return __awaiter(this, void 0, void 0, function* () {
            const { workspace } = this.app;
            const v1Leaves = workspace.getLeavesOfType(TASK_VIEW_TYPE);
            v1Leaves.forEach((leaf) => leaf.detach());
            const v2Leaves = workspace.getLeavesOfType(FLUENT_TASK_VIEW);
            v2Leaves.forEach((leaf) => leaf.detach());
            const specificLeaves = workspace.getLeavesOfType(TASK_SPECIFIC_VIEW_TYPE);
            specificLeaves.forEach((leaf) => leaf.detach());
            const timelineLeaves = workspace.getLeavesOfType(TIMELINE_SIDEBAR_VIEW_TYPE);
            timelineLeaves.forEach((leaf) => leaf.detach());
            const changelogLeaves = workspace.getLeavesOfType(CHANGELOG_VIEW_TYPE);
            changelogLeaves.forEach((leaf) => leaf.detach());
        });
    }
    maybeShowChangelog() {
        var _a;
        try {
            if (!this.changelogManager) {
                return;
            }
            const manifestVersion = (_a = this.manifest) === null || _a === void 0 ? void 0 : _a.version;
            if (!manifestVersion) {
                return;
            }
            const changelogSettings = this.settings.changelog;
            if (!(changelogSettings === null || changelogSettings === void 0 ? void 0 : changelogSettings.enabled)) {
                return;
            }
            const lastVersion = changelogSettings.lastVersion || "";
            if (manifestVersion === lastVersion) {
                return;
            }
            const isBeta = manifestVersion.toLowerCase().includes("beta");
            void this.changelogManager.openChangelog(manifestVersion, isBeta);
        }
        catch (error) {
            console.error("[TPB] Failed to show changelog:", error);
        }
    }
    loadSettings() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const savedData = yield this.loadData();
            this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData);
            this.settings.changelog = Object.assign({
                enabled: true,
                lastVersion: "",
            }, (_a = this.settings.changelog) !== null && _a !== void 0 ? _a : {});
            try {
                console.debug("[Plugin][loadSettings] fileMetadataInheritance (raw):", savedData === null || savedData === void 0 ? void 0 : savedData.fileMetadataInheritance);
                console.debug("[Plugin][loadSettings] fileMetadataInheritance (effective):", this.settings.fileMetadataInheritance);
            }
            catch (_b) { }
            // Migrate old inheritance settings to new structure
            this.migrateInheritanceSettings(savedData);
        });
    }
    migrateInheritanceSettings(savedData) {
        var _a, _b, _c, _d;
        // Check if old inheritance settings exist and new ones don't
        if (((_a = savedData === null || savedData === void 0 ? void 0 : savedData.projectConfig) === null || _a === void 0 ? void 0 : _a.metadataConfig) &&
            !(savedData === null || savedData === void 0 ? void 0 : savedData.fileMetadataInheritance)) {
            const oldConfig = savedData.projectConfig.metadataConfig;
            // Migrate to new structure
            this.settings.fileMetadataInheritance = {
                enabled: true,
                inheritFromFrontmatter: (_b = oldConfig.inheritFromFrontmatter) !== null && _b !== void 0 ? _b : true,
                inheritFromFrontmatterForSubtasks: (_c = oldConfig.inheritFromFrontmatterForSubtasks) !== null && _c !== void 0 ? _c : false,
            };
            // Remove old inheritance settings from project config
            if ((_d = this.settings.projectConfig) === null || _d === void 0 ? void 0 : _d.metadataConfig) {
                delete this.settings.projectConfig.metadataConfig
                    .inheritFromFrontmatter;
                delete this.settings.projectConfig.metadataConfig
                    .inheritFromFrontmatterForSubtasks;
            }
            // Save the migrated settings
            this.saveSettings();
        }
    }
    saveSettings() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.debug("[Plugin][saveSettings] fileMetadataInheritance:", (_a = this.settings) === null || _a === void 0 ? void 0 : _a.fileMetadataInheritance);
            }
            catch (_b) { }
            yield this.saveData(this.settings);
        });
    }
    loadViews() {
        return __awaiter(this, void 0, void 0, function* () {
            const defaultViews = DEFAULT_SETTINGS.viewConfiguration;
            // Ensure all default views exist in user settings
            if (!this.settings.viewConfiguration) {
                this.settings.viewConfiguration = [];
            }
            // Add any missing default views to user settings
            defaultViews.forEach((defaultView) => {
                const existingView = this.settings.viewConfiguration.find((v) => v.id === defaultView.id);
                if (!existingView) {
                    this.settings.viewConfiguration.push(Object.assign({}, defaultView));
                }
            });
            yield this.saveSettings();
        });
    }
    activateTaskView() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // Prevent multiple simultaneous activations
            if (this.isActivatingView) {
                return;
            }
            this.isActivatingView = true;
            try {
                const { workspace } = this.app;
                const viewType = ((_a = this.settings.fluentView) === null || _a === void 0 ? void 0 : _a.enableFluent)
                    ? FLUENT_TASK_VIEW
                    : TASK_VIEW_TYPE;
                // Check if view is already open
                const existingLeaves = workspace.getLeavesOfType(viewType);
                if (existingLeaves.length > 0) {
                    // If view is already open, just reveal the first one
                    workspace.revealLeaf(existingLeaves[0]);
                    // Close any duplicate views
                    for (let i = 1; i < existingLeaves.length; i++) {
                        existingLeaves[i].detach();
                    }
                    return;
                }
                // Otherwise, create a new leaf and open the view
                const leaf = workspace.getLeaf("tab");
                yield leaf.setViewState({ type: viewType });
                yield workspace.revealLeaf(leaf);
            }
            finally {
                this.isActivatingView = false;
            }
        });
    }
    activateTimelineSidebarView() {
        return __awaiter(this, void 0, void 0, function* () {
            // Prevent multiple simultaneous activations
            if (this.isActivatingSidebar) {
                return;
            }
            this.isActivatingSidebar = true;
            try {
                const { workspace } = this.app;
                // Check if view is already open
                const existingLeaves = workspace.getLeavesOfType(TIMELINE_SIDEBAR_VIEW_TYPE);
                if (existingLeaves.length > 0) {
                    // If view is already open, just reveal the first one
                    workspace.revealLeaf(existingLeaves[0]);
                    // Close any duplicate views
                    for (let i = 1; i < existingLeaves.length; i++) {
                        existingLeaves[i].detach();
                    }
                    return;
                }
                // Open in the right sidebar
                const leaf = workspace.getRightLeaf(false);
                if (leaf) {
                    yield leaf.setViewState({ type: TIMELINE_SIDEBAR_VIEW_TYPE });
                    workspace.revealLeaf(leaf);
                }
            }
            finally {
                this.isActivatingSidebar = false;
            }
        });
    }
    triggerViewUpdate() {
        return __awaiter(this, void 0, void 0, function* () {
            // Update Task Views
            const taskViewLeaves = this.app.workspace.getLeavesOfType(TASK_VIEW_TYPE);
            if (taskViewLeaves.length > 0) {
                for (const leaf of taskViewLeaves) {
                    if (leaf.view instanceof TaskView) {
                        // Avoid overwriting existing tasks with empty preloadedTasks during settings updates
                        if (Array.isArray(this.preloadedTasks) &&
                            this.preloadedTasks.length > 0) {
                            leaf.view.tasks = this.preloadedTasks;
                        }
                        leaf.view.triggerViewUpdate();
                    }
                }
            }
            // Update Timeline Sidebar Views
            const timelineViewLeaves = this.app.workspace.getLeavesOfType(TIMELINE_SIDEBAR_VIEW_TYPE);
            if (timelineViewLeaves.length > 0) {
                for (const leaf of timelineViewLeaves) {
                    if (leaf.view instanceof TimelineSidebarView) {
                        yield leaf.view.triggerViewUpdate();
                    }
                }
            }
        });
    }
    /**
     * Get the ICS manager instance
     */
    getIcsManager() {
        return this.icsManager;
    }
    /**
     * Initialize dataflow with version checking and rebuild handling
     */
    initializeDataflowWithVersionCheck() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.dataflowOrchestrator) {
                console.error("Dataflow orchestrator not available");
                return;
            }
            try {
                // Validate version storage integrity first
                const diagnosticInfo = yield this.versionManager.getDiagnosticInfo();
                if (!diagnosticInfo.canWrite) {
                    throw new Error("Cannot write to version storage - storage may be corrupted");
                }
                if (!diagnosticInfo.versionValid &&
                    diagnosticInfo.previousVersion) {
                    console.warn("Invalid version data detected, attempting recovery");
                    yield this.versionManager.recoverFromCorruptedVersion();
                }
                // Check for version changes
                const versionResult = yield this.versionManager.checkVersionChange();
                if (versionResult.requiresRebuild) {
                    console.log(`Task Genius (Dataflow): ${versionResult.rebuildReason}`);
                    // Get all supported files for progress tracking
                    const allFiles = this.app.vault
                        .getFiles()
                        .filter((file) => file.extension === "md" ||
                        file.extension === "canvas");
                    // Start rebuild progress tracking
                    this.rebuildProgressManager.startRebuild(allFiles.length, versionResult.rebuildReason);
                    // After dataflow rebuild, refresh habits to keep in sync
                    try {
                        yield ((_a = this.habitManager) === null || _a === void 0 ? void 0 : _a.initializeHabits());
                    }
                    catch (e) {
                        console.warn("Failed to refresh habits after rebuild", e);
                    }
                    // Trigger dataflow rebuild
                    yield this.dataflowOrchestrator.rebuild();
                    // Get final task count from dataflow
                    const queryAPI = this.dataflowOrchestrator.getQueryAPI();
                    const allTasks = yield queryAPI.getAllTasks();
                    const finalTaskCount = allTasks.length;
                    // Mark rebuild as complete
                    this.rebuildProgressManager.completeRebuild(finalTaskCount);
                    // Mark version as processed
                    yield this.versionManager.markVersionProcessed();
                }
                else {
                    // No rebuild needed, dataflow already initialized during creation
                    console.log("Task Genius (Dataflow): No rebuild needed, using existing cache");
                }
            }
            catch (error) {
                console.error("Error during dataflow initialization with version check:", error);
                // Trigger emergency rebuild for dataflow
                try {
                    const emergencyResult = yield this.versionManager.handleEmergencyRebuild(`Dataflow initialization failed: ${error.message}`);
                    // Get all supported files for progress tracking
                    const allFiles = this.app.vault
                        .getFiles()
                        .filter((file) => file.extension === "md" ||
                        file.extension === "canvas");
                    // Start emergency rebuild
                    this.rebuildProgressManager.startRebuild(allFiles.length, emergencyResult.rebuildReason);
                    // Force rebuild dataflow
                    yield this.dataflowOrchestrator.rebuild();
                    // Get final task count
                    const queryAPI = this.dataflowOrchestrator.getQueryAPI();
                    const allTasks = yield queryAPI.getAllTasks();
                    const finalTaskCount = allTasks.length;
                    // Mark emergency rebuild as complete
                    this.rebuildProgressManager.completeRebuild(finalTaskCount);
                    // Store current version
                    yield this.versionManager.markVersionProcessed();
                    console.log("Emergency dataflow rebuild completed successfully");
                }
                catch (emergencyError) {
                    console.error("Emergency dataflow rebuild failed:", emergencyError);
                    throw emergencyError;
                }
            }
        });
    }
    /**
     * Initialize task manager with version checking and rebuild handling
     * @deprecated This method is no longer used as TaskManager has been removed
     * This method is kept for reference only and will be removed in future versions
     */
    initializeTaskManagerWithVersionCheck() {
        return __awaiter(this, void 0, void 0, function* () {
            // This method is deprecated and should not be called
            console.warn("initializeTaskManagerWithVersionCheck is deprecated and should not be used");
            return Promise.resolve();
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUNOLE9BQU8sRUFFUCxlQUFlLEVBQ2YsWUFBWSxFQUVaLE1BQU0sRUFDTixRQUFRLEVBQ1IsTUFBTSxHQUNOLE1BQU0sVUFBVSxDQUFDO0FBQ2xCLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3RGLE9BQU8sRUFDTixnQkFBZ0IsR0FFaEIsTUFBTSw2QkFBNkIsQ0FBQztBQUNyQyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFFdEQsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDbkcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDbEcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDakcsT0FBTyxFQUNOLHlCQUF5QixFQUN6QixpQkFBaUIsR0FDakIsTUFBTSwrQ0FBK0MsQ0FBQztBQUN2RCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUMvRixPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN4RyxPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLHVCQUF1QixFQUN2QixlQUFlLEdBQ2YsTUFBTSxnREFBZ0QsQ0FBQztBQUN4RCxPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZCLHNCQUFzQixHQUN0QixNQUFNLDhCQUE4QixDQUFDO0FBQ3RDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFB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LENBQUM7WUFDRixPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMxQixDQUFDO0tBQUE7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XHJcblx0YWRkSWNvbixcclxuXHRFZGl0b3IsXHJcblx0ZWRpdG9ySW5mb0ZpZWxkLFxyXG5cdE1hcmtkb3duVmlldyxcclxuXHRNZW51LFxyXG5cdE5vdGljZSxcclxuXHRQbGF0Zm9ybSxcclxuXHRQbHVnaW4sXHJcbn0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IHRhc2tQcm9ncmVzc0JhckV4dGVuc2lvbiB9IGZyb20gXCIuL2VkaXRvci1leHRlbnNpb25zL3VpLXdpZGdldHMvcHJvZ3Jlc3MtYmFyLXdpZGdldFwiO1xyXG5pbXBvcnQgeyB0YXNrVGltZXJFeHRlbnNpb24gfSBmcm9tIFwiLi9lZGl0b3ItZXh0ZW5zaW9ucy9kYXRlLXRpbWUvdGFzay10aW1lclwiO1xyXG5pbXBvcnQgeyB1cGRhdGVQcm9ncmVzc0JhckluRWxlbWVudCB9IGZyb20gXCIuL2NvbXBvbmVudHMvZmVhdHVyZXMvcmVhZC1tb2RlL1JlYWRNb2RlUHJvZ3Jlc3NCYXJXaWRnZXRcIjtcclxuaW1wb3J0IHsgYXBwbHlUYXNrVGV4dE1hcmtzIH0gZnJvbSBcIi4vY29tcG9uZW50cy9mZWF0dXJlcy9yZWFkLW1vZGUvUmVhZE1vZGVUZXh0TWFya1wiO1xyXG5pbXBvcnQge1xyXG5cdERFRkFVTFRfU0VUVElOR1MsXHJcblx0VGFza1Byb2dyZXNzQmFyU2V0dGluZ3MsXHJcbn0gZnJvbSBcIi4vY29tbW9uL3NldHRpbmctZGVmaW5pdGlvblwiO1xyXG5pbXBvcnQgeyBUYXNrUHJvZ3Jlc3NCYXJTZXR0aW5nVGFiIH0gZnJvbSBcIi4vc2V0dGluZ1wiO1xyXG5pbXBvcnQgeyBFZGl0b3JWaWV3IH0gZnJvbSBcIkBjb2RlbWlycm9yL3ZpZXdcIjtcclxuaW1wb3J0IHsgYXV0b0NvbXBsZXRlUGFyZW50RXh0ZW5zaW9uIH0gZnJvbSBcIi4vZWRpdG9yLWV4dGVuc2lvbnMvYXV0b2NvbXBsZXRlL3BhcmVudC10YXNrLXVwZGF0ZXJcIjtcclxuaW1wb3J0IHsgdGFza1N0YXR1c1N3aXRjaGVyRXh0ZW5zaW9uIH0gZnJvbSBcIi4vZWRpdG9yLWV4dGVuc2lvbnMvdGFzay1vcGVyYXRpb25zL3N0YXR1cy1zd2l0Y2hlclwiO1xyXG5pbXBvcnQgeyBjeWNsZUNvbXBsZXRlU3RhdHVzRXh0ZW5zaW9uIH0gZnJvbSBcIi4vZWRpdG9yLWV4dGVuc2lvbnMvdGFzay1vcGVyYXRpb25zL3N0YXR1cy1jeWNsZXJcIjtcclxuaW1wb3J0IHtcclxuXHR1cGRhdGVXb3JrZmxvd0NvbnRleHRNZW51LFxyXG5cdHdvcmtmbG93RXh0ZW5zaW9uLFxyXG59IGZyb20gXCIuL2VkaXRvci1leHRlbnNpb25zL3dvcmtmbG93L3dvcmtmbG93LWhhbmRsZXJcIjtcclxuaW1wb3J0IHsgd29ya2Zsb3dEZWNvcmF0b3JFeHRlbnNpb24gfSBmcm9tIFwiLi9lZGl0b3ItZXh0ZW5zaW9ucy91aS13aWRnZXRzL3dvcmtmbG93LWRlY29yYXRvclwiO1xyXG5pbXBvcnQgeyB3b3JrZmxvd1Jvb3RFbnRlckhhbmRsZXJFeHRlbnNpb24gfSBmcm9tIFwiLi9lZGl0b3ItZXh0ZW5zaW9ucy93b3JrZmxvdy93b3JrZmxvdy1lbnRlci1oYW5kbGVyXCI7XHJcbmltcG9ydCB7XHJcblx0TEVUVEVSX1BSSU9SSVRJRVMsXHJcblx0cHJpb3JpdHlQaWNrZXJFeHRlbnNpb24sXHJcblx0VEFTS19QUklPUklUSUVTLFxyXG59IGZyb20gXCIuL2VkaXRvci1leHRlbnNpb25zL3VpLXdpZGdldHMvcHJpb3JpdHktcGlja2VyXCI7XHJcbmltcG9ydCB7XHJcblx0Y3ljbGVUYXNrU3RhdHVzQmFja3dhcmQsXHJcblx0Y3ljbGVUYXNrU3RhdHVzRm9yd2FyZCxcclxufSBmcm9tIFwiLi9jb21tYW5kcy90YXNrQ3ljbGVDb21tYW5kc1wiO1xyXG5pbXBvcnQgeyBtb3ZlVGFza0NvbW1hbmQgfSBmcm9tIFwiLi9jb21tYW5kcy90YXNrTW92ZXJcIjtcclxuaW1wb3J0IHtcclxuXHRhdXRvTW92ZUNvbXBsZXRlZFRhc2tzQ29tbWFuZCxcclxuXHRtb3ZlQ29tcGxldGVkVGFza3NDb21tYW5kLFxyXG5cdG1vdmVJbmNvbXBsZXRlZFRhc2tzQ29tbWFuZCxcclxufSBmcm9tIFwiLi9jb21tYW5kcy9jb21wbGV0ZWRUYXNrTW92ZXJcIjtcclxuaW1wb3J0IHtcclxuXHRjb252ZXJ0VGFza1RvV29ya2Zsb3dDb21tYW5kLFxyXG5cdGNvbnZlcnRUb1dvcmtmbG93Um9vdENvbW1hbmQsXHJcblx0Y3JlYXRlUXVpY2tXb3JrZmxvd0NvbW1hbmQsXHJcblx0ZHVwbGljYXRlV29ya2Zsb3dDb21tYW5kLFxyXG5cdHNob3dXb3JrZmxvd1F1aWNrQWN0aW9uc0NvbW1hbmQsXHJcblx0c3RhcnRXb3JrZmxvd0hlcmVDb21tYW5kLFxyXG59IGZyb20gXCIuL2NvbW1hbmRzL3dvcmtmbG93Q29tbWFuZHNcIjtcclxuaW1wb3J0IHsgZGF0ZVBpY2tlckV4dGVuc2lvbiB9IGZyb20gXCIuL2VkaXRvci1leHRlbnNpb25zL2RhdGUtdGltZS9kYXRlLXBpY2tlclwiO1xyXG5pbXBvcnQge1xyXG5cdHF1aWNrQ2FwdHVyZUV4dGVuc2lvbixcclxuXHRxdWlja0NhcHR1cmVTdGF0ZSxcclxuXHR0b2dnbGVRdWlja0NhcHR1cmUsXHJcbn0gZnJvbSBcIi4vZWRpdG9yLWV4dGVuc2lvbnMvY29yZS9xdWljay1jYXB0dXJlLXBhbmVsXCI7XHJcbmltcG9ydCB7XHJcblx0bWlncmF0ZU9sZEZpbHRlck9wdGlvbnMsXHJcblx0dGFza0ZpbHRlckV4dGVuc2lvbixcclxuXHR0YXNrRmlsdGVyU3RhdGUsXHJcblx0dG9nZ2xlVGFza0ZpbHRlcixcclxufSBmcm9tIFwiLi9lZGl0b3ItZXh0ZW5zaW9ucy9jb3JlL3Rhc2stZmlsdGVyLXBhbmVsXCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiLi90eXBlcy90YXNrXCI7XHJcbi8vIEltcG9ydCB0aGUgZW5oYW5jZWQgUXVpY2tDYXB0dXJlTW9kYWwgYW5kIE1pbmltYWxRdWlja0NhcHR1cmVNb2RhbFxyXG5pbXBvcnQgeyBRdWlja0NhcHR1cmVNb2RhbCB9IGZyb20gXCIuL2NvbXBvbmVudHMvZmVhdHVyZXMvcXVpY2stY2FwdHVyZS9tb2RhbHMvUXVpY2tDYXB0dXJlTW9kYWxXaXRoU3dpdGNoXCI7XHJcbmltcG9ydCB7IE1pbmltYWxRdWlja0NhcHR1cmVNb2RhbCB9IGZyb20gXCIuL2NvbXBvbmVudHMvZmVhdHVyZXMvcXVpY2stY2FwdHVyZS9tb2RhbHMvTWluaW1hbFF1aWNrQ2FwdHVyZU1vZGFsV2l0aFN3aXRjaFwiO1xyXG5pbXBvcnQgeyBNaW5pbWFsUXVpY2tDYXB0dXJlU3VnZ2VzdCB9IGZyb20gXCIuL2NvbXBvbmVudHMvZmVhdHVyZXMvcXVpY2stY2FwdHVyZS9zdWdnZXN0L01pbmltYWxRdWlja0NhcHR1cmVTdWdnZXN0XCI7XHJcbmltcG9ydCB7IFN1Z2dlc3RNYW5hZ2VyIH0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9zdWdnZXN0XCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiLi90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCB7IFRBU0tfVklFV19UWVBFLCBUYXNrVmlldyB9IGZyb20gXCIuL3BhZ2VzL1Rhc2tWaWV3XCI7XHJcbmltcG9ydCBcIi4vc3R5bGVzL2dsb2JhbC5jc3NcIjtcclxuaW1wb3J0IFwiLi9zdHlsZXMvc2V0dGluZy5jc3NcIjtcclxuaW1wb3J0IFwiLi9zdHlsZXMvdmlldy5jc3NcIjtcclxuaW1wb3J0IFwiLi9zdHlsZXMvdmlldy1jb25maWcuY3NzXCI7XHJcbmltcG9ydCBcIi4vc3R5bGVzL3Rhc2stc3RhdHVzLmNzc1wiO1xyXG5pbXBvcnQgXCIuL3N0eWxlcy9xdWFkcmFudC9xdWFkcmFudC5jc3NcIjtcclxuaW1wb3J0IFwiLi9zdHlsZXMvb25ib2FyZGluZy5jc3NcIjtcclxuaW1wb3J0IFwiLi9zdHlsZXMvdW5pdmVyc2FsLXN1Z2dlc3QuY3NzXCI7XHJcbmltcG9ydCBcIi4vc3R5bGVzL25vaXNlLmNzc1wiO1xyXG5pbXBvcnQgXCIuL3N0eWxlcy9jaGFuZ2Vsb2cuY3NzXCI7XHJcbmltcG9ydCB7XHJcblx0VEFTS19TUEVDSUZJQ19WSUVXX1RZUEUsXHJcblx0VGFza1NwZWNpZmljVmlldyxcclxufSBmcm9tIFwiLi9wYWdlcy9UYXNrU3BlY2lmaWNWaWV3XCI7XHJcbmltcG9ydCB7XHJcblx0VElNRUxJTkVfU0lERUJBUl9WSUVXX1RZUEUsXHJcblx0VGltZWxpbmVTaWRlYmFyVmlldyxcclxufSBmcm9tIFwiLi9jb21wb25lbnRzL2ZlYXR1cmVzL3RpbWVsaW5lLXNpZGViYXIvVGltZWxpbmVTaWRlYmFyVmlld1wiO1xyXG5pbXBvcnQgeyBnZXRTdGF0dXNJY29uLCBnZXRUYXNrR2VuaXVzSWNvbiB9IGZyb20gXCIuL2ljb25cIjtcclxuaW1wb3J0IHsgUmV3YXJkTWFuYWdlciB9IGZyb20gXCIuL21hbmFnZXJzL3Jld2FyZC1tYW5hZ2VyXCI7XHJcbmltcG9ydCB7IEhhYml0TWFuYWdlciB9IGZyb20gXCIuL21hbmFnZXJzL2hhYml0LW1hbmFnZXJcIjtcclxuaW1wb3J0IHsgVGFza0dlbml1c0ljb25NYW5hZ2VyIH0gZnJvbSBcIi4vbWFuYWdlcnMvaWNvbi1tYW5hZ2VyXCI7XHJcbmltcG9ydCB7IG1vbml0b3JUYXNrQ29tcGxldGVkRXh0ZW5zaW9uIH0gZnJvbSBcIi4vZWRpdG9yLWV4dGVuc2lvbnMvdGFzay1vcGVyYXRpb25zL2NvbXBsZXRpb24tbW9uaXRvclwiO1xyXG5pbXBvcnQgeyBzb3J0VGFza3NJbkRvY3VtZW50IH0gZnJvbSBcIi4vY29tbWFuZHMvc29ydFRhc2tDb21tYW5kc1wiO1xyXG5pbXBvcnQgeyB0YXNrR3V0dGVyRXh0ZW5zaW9uIH0gZnJvbSBcIi4vZWRpdG9yLWV4dGVuc2lvbnMvdGFzay1vcGVyYXRpb25zL2d1dHRlci1tYXJrZXJcIjtcclxuaW1wb3J0IHsgYXV0b0RhdGVNYW5hZ2VyRXh0ZW5zaW9uIH0gZnJvbSBcIi4vZWRpdG9yLWV4dGVuc2lvbnMvZGF0ZS10aW1lL2RhdGUtbWFuYWdlclwiO1xyXG5pbXBvcnQgeyB0YXNrTWFya0NsZWFudXBFeHRlbnNpb24gfSBmcm9tIFwiLi9lZGl0b3ItZXh0ZW5zaW9ucy90YXNrLW9wZXJhdGlvbnMvbWFyay1jbGVhbnVwXCI7XHJcbmltcG9ydCB7IEljc01hbmFnZXIgfSBmcm9tIFwiLi9tYW5hZ2Vycy9pY3MtbWFuYWdlclwiO1xyXG5pbXBvcnQgeyBGbHVlbnRJbnRlZ3JhdGlvbiB9IGZyb20gXCIuL2NvbXBvbmVudHMvZmVhdHVyZXMvZmx1ZW50L0ZsdWVudEludGVncmF0aW9uXCI7XHJcbmltcG9ydCB7IE9ic2lkaWFuVXJpSGFuZGxlciB9IGZyb20gXCIuL3V0aWxzL09ic2lkaWFuVXJpSGFuZGxlclwiO1xyXG5pbXBvcnQgeyBWZXJzaW9uTWFuYWdlciB9IGZyb20gXCIuL21hbmFnZXJzL3ZlcnNpb24tbWFuYWdlclwiO1xyXG5pbXBvcnQgeyBSZWJ1aWxkUHJvZ3Jlc3NNYW5hZ2VyIH0gZnJvbSBcIi4vbWFuYWdlcnMvcmVidWlsZC1wcm9ncmVzcy1tYW5hZ2VyXCI7XHJcbmltcG9ydCBEZXNrdG9wSW50ZWdyYXRpb25NYW5hZ2VyIGZyb20gXCIuL21hbmFnZXJzL2Rlc2t0b3AtaW50ZWdyYXRpb24tbWFuYWdlclwiO1xyXG5pbXBvcnQgeyBPbmJvYXJkaW5nQ29uZmlnTWFuYWdlciB9IGZyb20gXCIuL21hbmFnZXJzL29uYm9hcmRpbmctbWFuYWdlclwiO1xyXG5pbXBvcnQgeyBPbkNvbXBsZXRpb25NYW5hZ2VyIH0gZnJvbSBcIi4vbWFuYWdlcnMvY29tcGxldGlvbi1tYW5hZ2VyXCI7XHJcbmltcG9ydCB7IFNldHRpbmdzQ2hhbmdlRGV0ZWN0b3IgfSBmcm9tIFwiLi9zZXJ2aWNlcy9zZXR0aW5ncy1jaGFuZ2UtZGV0ZWN0b3JcIjtcclxuaW1wb3J0IHtcclxuXHRPTkJPQVJESU5HX1ZJRVdfVFlQRSxcclxuXHRPbmJvYXJkaW5nVmlldyxcclxufSBmcm9tIFwiLi9jb21wb25lbnRzL2ZlYXR1cmVzL29uYm9hcmRpbmcvT25ib2FyZGluZ1ZpZXdcIjtcclxuaW1wb3J0IHsgcmVnaXN0ZXJUYXNrR2VuaXVzQmFzZXNWaWV3cyB9IGZyb20gXCJAL3BhZ2VzL2Jhc2VzL3JlZ2lzdGVyQmFzZXNWaWV3c1wiO1xyXG5pbXBvcnQgeyBUYXNrVGltZXJFeHBvcnRlciB9IGZyb20gXCIuL3NlcnZpY2VzL3RpbWVyLWV4cG9ydC1zZXJ2aWNlXCI7XHJcbmltcG9ydCB7IFRhc2tUaW1lck1hbmFnZXIgfSBmcm9tIFwiLi9tYW5hZ2Vycy90aW1lci1tYW5hZ2VyXCI7XHJcbmltcG9ydCB7IE1jcFNlcnZlck1hbmFnZXIgfSBmcm9tIFwiLi9tY3AvTWNwU2VydmVyTWFuYWdlclwiO1xyXG5pbXBvcnQgeyBjcmVhdGVEYXRhZmxvdyB9IGZyb20gXCIuL2RhdGFmbG93L2NyZWF0ZURhdGFmbG93XCI7XHJcbmltcG9ydCB0eXBlIHsgRGF0YWZsb3dPcmNoZXN0cmF0b3IgfSBmcm9tIFwiLi9kYXRhZmxvdy9PcmNoZXN0cmF0b3JcIjtcclxuaW1wb3J0IHsgV3JpdGVBUEkgfSBmcm9tIFwiLi9kYXRhZmxvdy9hcGkvV3JpdGVBUElcIjtcclxuaW1wb3J0IHsgRXZlbnRzIH0gZnJvbSBcIi4vZGF0YWZsb3cvZXZlbnRzL0V2ZW50c1wiO1xyXG5pbXBvcnQge1xyXG5cdGluc3RhbGxXb3Jrc3BhY2VEcmFnTW9uaXRvcixcclxuXHRyZWdpc3RlclJlc3RyaWN0ZWREbkRWaWV3VHlwZXMsXHJcbn0gZnJvbSBcIi4vcGF0Y2hlcy93b3Jrc3BhY2UtZG5kLXBhdGNoXCI7XHJcbmltcG9ydCB7IEZMVUVOVF9UQVNLX1ZJRVcgfSBmcm9tIFwiLi9wYWdlcy9GbHVlbnRUYXNrVmlld1wiO1xyXG5pbXBvcnQge1xyXG5cdHJlbW92ZVByaW9yaXR5QXRDdXJzb3IsXHJcblx0c2V0UHJpb3JpdHlBdEN1cnNvcixcclxufSBmcm9tIFwiLi91dGlscy90YXNrL2N1cm9zci1wcmlvcml0eS11dGlsc1wiO1xyXG5pbXBvcnQgeyBRdWlja0NhcHR1cmVTdWdnZXN0IH0gZnJvbSBcIkAvZWRpdG9yLWV4dGVuc2lvbnMvYXV0b2NvbXBsZXRlL3Rhc2stbWV0YWRhdGEtc3VnZ2VzdFwiO1xyXG5pbXBvcnQgeyBXb3Jrc3BhY2VNYW5hZ2VyIH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy9mbHVlbnQvbWFuYWdlcnMvV29ya3NwYWNlTWFuYWdlclwiO1xyXG5pbXBvcnQge1xyXG5cdENIQU5HRUxPR19WSUVXX1RZUEUsXHJcblx0Q2hhbmdlbG9nVmlldyxcclxufSBmcm9tIFwiLi9jb21wb25lbnRzL2ZlYXR1cmVzL2NoYW5nZWxvZy9DaGFuZ2Vsb2dWaWV3XCI7XHJcbmltcG9ydCB7IENoYW5nZWxvZ01hbmFnZXIgfSBmcm9tIFwiLi9tYW5hZ2Vycy9jaGFuZ2Vsb2ctbWFuYWdlclwiO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcclxuXHRzZXR0aW5nczogVGFza1Byb2dyZXNzQmFyU2V0dGluZ3M7XHJcblxyXG5cdC8vIERhdGFmbG93IG9yY2hlc3RyYXRvciBpbnN0YW5jZSAocHJpbWFyeSBhcmNoaXRlY3R1cmUpXHJcblx0ZGF0YWZsb3dPcmNoZXN0cmF0b3I/OiBEYXRhZmxvd09yY2hlc3RyYXRvcjtcclxuXHJcblx0Ly8gV3JpdGUgQVBJIGZvciBkYXRhZmxvdyBhcmNoaXRlY3R1cmVcclxuXHR3cml0ZUFQST86IFdyaXRlQVBJO1xyXG5cclxuXHQvLyBOb3RpZmljYXRpb24gbWFuYWdlciAoZGVza3RvcClcclxuXHRub3RpZmljYXRpb25NYW5hZ2VyPzogRGVza3RvcEludGVncmF0aW9uTWFuYWdlcjtcclxuXHJcblx0cmV3YXJkTWFuYWdlcjogUmV3YXJkTWFuYWdlcjtcclxuXHJcblx0aGFiaXRNYW5hZ2VyOiBIYWJpdE1hbmFnZXI7XHJcblxyXG5cdC8vIFRhc2sgdGltZXIgbWFuYWdlciBhbmQgZXhwb3J0ZXJcclxuXHR0YXNrVGltZXJNYW5hZ2VyOiBUYXNrVGltZXJNYW5hZ2VyO1xyXG5cdHRhc2tUaW1lckV4cG9ydGVyOiBUYXNrVGltZXJFeHBvcnRlcjtcclxuXHJcblx0Ly8gSUNTIG1hbmFnZXIgaW5zdGFuY2VcclxuXHRpY3NNYW5hZ2VyOiBJY3NNYW5hZ2VyO1xyXG5cclxuXHQvLyBNaW5pbWFsIHF1aWNrIGNhcHR1cmUgc3VnZ2VzdFxyXG5cdG1pbmltYWxRdWlja0NhcHR1cmVTdWdnZXN0OiBNaW5pbWFsUXVpY2tDYXB0dXJlU3VnZ2VzdDtcclxuXHJcblx0Ly8gUmVndWxhciBxdWljayBjYXB0dXJlIHN1Z2dlc3RcclxuXHRxdWlja0NhcHR1cmVTdWdnZXN0OiBRdWlja0NhcHR1cmVTdWdnZXN0O1xyXG5cclxuXHQvLyBHbG9iYWwgc3VnZ2VzdCBtYW5hZ2VyXHJcblx0Z2xvYmFsU3VnZ2VzdE1hbmFnZXI6IFN1Z2dlc3RNYW5hZ2VyO1xyXG5cclxuXHQvLyBWZXJzaW9uIG1hbmFnZXIgaW5zdGFuY2VcclxuXHR2ZXJzaW9uTWFuYWdlcjogVmVyc2lvbk1hbmFnZXI7XHJcblxyXG5cdC8vIENoYW5nZWxvZyBtYW5hZ2VyIGluc3RhbmNlXHJcblx0Y2hhbmdlbG9nTWFuYWdlcjogQ2hhbmdlbG9nTWFuYWdlcjtcclxuXHJcblx0Ly8gUmVidWlsZCBwcm9ncmVzcyBtYW5hZ2VyIGluc3RhbmNlXHJcblx0cmVidWlsZFByb2dyZXNzTWFuYWdlcjogUmVidWlsZFByb2dyZXNzTWFuYWdlcjtcclxuXHJcblx0Ly8gT25ib2FyZGluZyBtYW5hZ2VyIGluc3RhbmNlXHJcblx0b25ib2FyZGluZ0NvbmZpZ01hbmFnZXI6IE9uYm9hcmRpbmdDb25maWdNYW5hZ2VyO1xyXG5cdHNldHRpbmdzQ2hhbmdlRGV0ZWN0b3I6IFNldHRpbmdzQ2hhbmdlRGV0ZWN0b3I7XHJcblxyXG5cdC8vIFByZWxvYWRlZCB0YXNrczpcclxuXHRwcmVsb2FkZWRUYXNrczogVGFza1tdID0gW107XHJcblxyXG5cdC8vIFNldHRpbmcgdGFiXHJcblx0c2V0dGluZ1RhYjogVGFza1Byb2dyZXNzQmFyU2V0dGluZ1RhYjtcclxuXHJcblx0Ly8gV29ya3NwYWNlIG1hbmFnZXIgaW5zdGFuY2VcclxuXHR3b3Jrc3BhY2VNYW5hZ2VyPzogV29ya3NwYWNlTWFuYWdlcjtcclxuXHJcblx0Ly8gVGFzayBHZW5pdXMgSWNvbiBtYW5hZ2VyIGluc3RhbmNlXHJcblx0dGFza0dlbml1c0ljb25NYW5hZ2VyOiBUYXNrR2VuaXVzSWNvbk1hbmFnZXI7XHJcblxyXG5cdC8vIE1DUCBTZXJ2ZXIgbWFuYWdlciBpbnN0YW5jZSAoZGVza3RvcCBvbmx5KVxyXG5cdG1jcFNlcnZlck1hbmFnZXI/OiBNY3BTZXJ2ZXJNYW5hZ2VyO1xyXG5cclxuXHQvLyBVUkkgaGFuZGxlciBpbnN0YW5jZVxyXG5cdHVyaUhhbmRsZXI/OiBPYnNpZGlhblVyaUhhbmRsZXI7XHJcblxyXG5cdC8vIE9uQ29tcGxldGlvbiBtYW5hZ2VyIGluc3RhbmNlXHJcblx0b25Db21wbGV0aW9uTWFuYWdlcj86IE9uQ29tcGxldGlvbk1hbmFnZXI7XHJcblxyXG5cdC8vIFYyIEludGVncmF0aW9uIGluc3RhbmNlXHJcblx0djJJbnRlZ3JhdGlvbj86IEZsdWVudEludGVncmF0aW9uO1xyXG5cclxuXHRhc3luYyBvbmxvYWQoKSB7XHJcblx0XHRjb25zb2xlLnRpbWUoXCJbVFBCXSBvbmxvYWRcIik7XHJcblx0XHRhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpO1xyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgdmVyc2lvbiBtYW5hZ2VyIGZpcnN0XHJcblx0XHR0aGlzLnZlcnNpb25NYW5hZ2VyID0gbmV3IFZlcnNpb25NYW5hZ2VyKHRoaXMuYXBwLCB0aGlzKTtcclxuXHRcdHRoaXMuYWRkQ2hpbGQodGhpcy52ZXJzaW9uTWFuYWdlcik7XHJcblxyXG5cdFx0dGhpcy5jaGFuZ2Vsb2dNYW5hZ2VyID0gbmV3IENoYW5nZWxvZ01hbmFnZXIodGhpcyk7XHJcblx0XHR0aGlzLnJlZ2lzdGVyVmlldyhcclxuXHRcdFx0Q0hBTkdFTE9HX1ZJRVdfVFlQRSxcclxuXHRcdFx0KGxlYWYpID0+IG5ldyBDaGFuZ2Vsb2dWaWV3KGxlYWYsIHRoaXMpLFxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBJbml0aWFsaXplIG9uYm9hcmRpbmcgY29uZmlnIG1hbmFnZXJcclxuXHRcdHRoaXMub25ib2FyZGluZ0NvbmZpZ01hbmFnZXIgPSBuZXcgT25ib2FyZGluZ0NvbmZpZ01hbmFnZXIodGhpcyk7XHJcblx0XHR0aGlzLnNldHRpbmdzQ2hhbmdlRGV0ZWN0b3IgPSBuZXcgU2V0dGluZ3NDaGFuZ2VEZXRlY3Rvcih0aGlzKTtcclxuXHJcblx0XHQvLyBJbml0aWFsaXplIGdsb2JhbCBzdWdnZXN0IG1hbmFnZXJcclxuXHRcdHRoaXMuZ2xvYmFsU3VnZ2VzdE1hbmFnZXIgPSBuZXcgU3VnZ2VzdE1hbmFnZXIodGhpcy5hcHAsIHRoaXMpO1xyXG5cclxuXHRcdHRoaXMud29ya3NwYWNlTWFuYWdlciA9IG5ldyBXb3Jrc3BhY2VNYW5hZ2VyKHRoaXMpO1xyXG5cdFx0YXdhaXQgdGhpcy53b3Jrc3BhY2VNYW5hZ2VyLm1pZ3JhdGVUb1YyKCk7XHJcblx0XHR0aGlzLndvcmtzcGFjZU1hbmFnZXIuZW5zdXJlRGVmYXVsdFdvcmtzcGFjZUludmFyaWFudCgpO1xyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgVVJJIGhhbmRsZXJcclxuXHRcdHRoaXMudXJpSGFuZGxlciA9IG5ldyBPYnNpZGlhblVyaUhhbmRsZXIodGhpcyk7XHJcblx0XHR0aGlzLnVyaUhhbmRsZXIucmVnaXN0ZXIoKTtcclxuXHJcblx0XHQvLyBJbml0aWFsaXplIHJlYnVpbGQgcHJvZ3Jlc3MgbWFuYWdlclxyXG5cdFx0dGhpcy5yZWJ1aWxkUHJvZ3Jlc3NNYW5hZ2VyID0gbmV3IFJlYnVpbGRQcm9ncmVzc01hbmFnZXIoKTtcclxuXHJcblx0XHQvLyBJbml0aWFsaXplIHRhc2sgbWFuYWdlbWVudCBzeXN0ZW1zXHJcblx0XHRpZiAodGhpcy5zZXR0aW5ncy5lbmFibGVJbmRleGVyKSB7XHJcblx0XHRcdC8vIEluaXRpYWxpemUgaW5kZXhlci1kZXBlbmRlbnQgZmVhdHVyZXNcclxuXHRcdFx0aWYgKHRoaXMuc2V0dGluZ3MuZW5hYmxlVmlldykge1xyXG5cdFx0XHRcdHRoaXMubG9hZFZpZXdzKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENoZWNrIGZvciB2ZXJzaW9uIGNoYW5nZXMgYW5kIGhhbmRsZSByZWJ1aWxkIGlmIG5lZWRlZFxyXG5cdFx0XHRpZiAodGhpcy5kYXRhZmxvd09yY2hlc3RyYXRvcikge1xyXG5cdFx0XHRcdC8vIEluaXRpYWxpemUgd2l0aCB2ZXJzaW9uIGNoZWNrIGZvciBkYXRhZmxvd1xyXG5cdFx0XHRcdHRoaXMuaW5pdGlhbGl6ZURhdGFmbG93V2l0aFZlcnNpb25DaGVjaygpLmNhdGNoKChlcnJvcikgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcclxuXHRcdFx0XHRcdFx0XCJGYWlsZWQgdG8gaW5pdGlhbGl6ZSBkYXRhZmxvdyB3aXRoIHZlcnNpb24gY2hlY2s6XCIsXHJcblx0XHRcdFx0XHRcdGVycm9yLFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc29sZS50aW1lKFwiW1RQQl0gcmVnaXN0ZXJWaWV3c0FuZENvbW1hbmRzXCIpO1xyXG5cdFx0XHQvLyBSZWdpc3RlciB0aGUgVGFza1ZpZXdcclxuXHRcdFx0dGhpcy52MkludGVncmF0aW9uID0gbmV3IEZsdWVudEludGVncmF0aW9uKHRoaXMpO1xyXG5cdFx0XHRhd2FpdCB0aGlzLnYySW50ZWdyYXRpb24ubWlncmF0ZVNldHRpbmdzKCk7XHJcblx0XHRcdHRoaXMudjJJbnRlZ3JhdGlvbi5yZWdpc3RlcigpO1xyXG5cclxuXHRcdFx0dGhpcy5yZWdpc3RlclZpZXcoXHJcblx0XHRcdFx0VEFTS19WSUVXX1RZUEUsXHJcblx0XHRcdFx0KGxlYWYpID0+IG5ldyBUYXNrVmlldyhsZWFmLCB0aGlzKSxcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdHRoaXMucmVnaXN0ZXJWaWV3KFxyXG5cdFx0XHRcdFRBU0tfU1BFQ0lGSUNfVklFV19UWVBFLFxyXG5cdFx0XHRcdChsZWFmKSA9PiBuZXcgVGFza1NwZWNpZmljVmlldyhsZWFmLCB0aGlzKSxcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIFJlZ2lzdGVyIHRoZSBUaW1lbGluZSBTaWRlYmFyIFZpZXdcclxuXHRcdFx0dGhpcy5yZWdpc3RlclZpZXcoXHJcblx0XHRcdFx0VElNRUxJTkVfU0lERUJBUl9WSUVXX1RZUEUsXHJcblx0XHRcdFx0KGxlYWYpID0+IG5ldyBUaW1lbGluZVNpZGViYXJWaWV3KGxlYWYsIHRoaXMpLFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gUmVnaXN0ZXIgdGhlIE9uYm9hcmRpbmcgVmlld1xyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyVmlldyhcclxuXHRcdFx0XHRPTkJPQVJESU5HX1ZJRVdfVFlQRSxcclxuXHRcdFx0XHQobGVhZikgPT5cclxuXHRcdFx0XHRcdG5ldyBPbmJvYXJkaW5nVmlldyhsZWFmLCB0aGlzLCAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiT25ib2FyZGluZyBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5XCIpO1xyXG5cdFx0XHRcdFx0XHQvLyBDbG9zZSB0aGUgb25ib2FyZGluZyB2aWV3IGFuZCByZWZyZXNoIHZpZXdzXHJcblx0XHRcdFx0XHRcdGxlYWYuZGV0YWNoKCk7XHJcblx0XHRcdFx0XHR9KSxcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIFJlZ2lzdGVyIEJhc2VzIHZpZXdzIGlmIEJhc2VzIHBsdWdpbiBpcyBhdmFpbGFibGVcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRyZWdpc3RlclRhc2tHZW5pdXNCYXNlc1ZpZXdzKHRoaXMpO1xyXG5cdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiRmFpbGVkIHRvIHJlZ2lzdGVyIEJhc2VzIHZpZXdzOlwiLCBlcnJvcik7XHJcblx0XHRcdFx0Ly8gTm90IGNyaXRpY2FsIGlmIEJhc2VzIHBsdWdpbiBpcyBub3QgaW5zdGFsbGVkXHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEFkZCBhIGNvbW1hbmQgdG8gb3BlbiB0aGUgVGFza1ZpZXdcclxuXHRcdFx0dGhpcy5hZGRDb21tYW5kKHtcclxuXHRcdFx0XHRpZDogXCJvcGVuLXRhc2stZ2VuaXVzLXZpZXdcIixcclxuXHRcdFx0XHRuYW1lOiB0KFwiT3BlbiBUYXNrIEdlbml1cyB2aWV3XCIpLFxyXG5cdFx0XHRcdGNhbGxiYWNrOiAoKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLmFjdGl2YXRlVGFza1ZpZXcoKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIEFkZCBhIGNvbW1hbmQgdG8gb3BlbiB0aGUgVGltZWxpbmUgU2lkZWJhciBWaWV3XHJcblx0XHRcdHRoaXMuYWRkQ29tbWFuZCh7XHJcblx0XHRcdFx0aWQ6IFwib3Blbi10aW1lbGluZS1zaWRlYmFyLXZpZXdcIixcclxuXHRcdFx0XHRuYW1lOiB0KFwiT3BlbiBUaW1lbGluZSBTaWRlYmFyXCIpLFxyXG5cdFx0XHRcdGNhbGxiYWNrOiAoKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLmFjdGl2YXRlVGltZWxpbmVTaWRlYmFyVmlldygpO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQWRkIGEgY29tbWFuZCB0byBvcGVuIHRoZSBPbmJvYXJkaW5nL1NldHVwIFZpZXdcclxuXHRcdFx0dGhpcy5hZGRDb21tYW5kKHtcclxuXHRcdFx0XHRpZDogXCJvcGVuLXRhc2stZ2VuaXVzLXNldHVwXCIsXHJcblx0XHRcdFx0bmFtZTogdChcIk9wZW4gVGFzayBHZW5pdXMgU2V0dXBcIiksXHJcblx0XHRcdFx0Y2FsbGJhY2s6ICgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMub3Blbk9uYm9hcmRpbmdWaWV3KCk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHR0aGlzLmFkZENvbW1hbmQoe1xyXG5cdFx0XHRcdGlkOiBcIm9wZW4tdGFzay1nZW5pdXMtY2hhbmdlbG9nXCIsXHJcblx0XHRcdFx0bmFtZTogdChcIk9wZW4gVGFzayBHZW5pdXMgY2hhbmdlbG9nXCIpLFxyXG5cdFx0XHRcdGNhbGxiYWNrOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAoIXRoaXMuY2hhbmdlbG9nTWFuYWdlcikge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Y29uc3QgdGFyZ2V0VmVyc2lvbiA9XHJcblx0XHRcdFx0XHRcdHRoaXMubWFuaWZlc3Q/LnZlcnNpb24gfHxcclxuXHRcdFx0XHRcdFx0dGhpcy5zZXR0aW5ncy5jaGFuZ2Vsb2cubGFzdFZlcnNpb247XHJcblxyXG5cdFx0XHRcdFx0aWYgKCF0YXJnZXRWZXJzaW9uKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRjb25zdCBpc0JldGEgPSB0YXJnZXRWZXJzaW9uLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoXCJiZXRhXCIpO1xyXG5cdFx0XHRcdFx0dm9pZCB0aGlzLmNoYW5nZWxvZ01hbmFnZXIub3BlbkNoYW5nZWxvZyhcclxuXHRcdFx0XHRcdFx0dGFyZ2V0VmVyc2lvbixcclxuXHRcdFx0XHRcdFx0aXNCZXRhLFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGFkZEljb24oXCJ0YXNrLWdlbml1c1wiLCBnZXRUYXNrR2VuaXVzSWNvbigpKTtcclxuXHRcdFx0YWRkSWNvbihcImNvbXBsZXRlZFwiLCBnZXRTdGF0dXNJY29uKFwiY29tcGxldGVkXCIpKTtcclxuXHRcdFx0YWRkSWNvbihcImluUHJvZ3Jlc3NcIiwgZ2V0U3RhdHVzSWNvbihcImluUHJvZ3Jlc3NcIikpO1xyXG5cdFx0XHRhZGRJY29uKFwicGxhbm5lZFwiLCBnZXRTdGF0dXNJY29uKFwicGxhbm5lZFwiKSk7XHJcblx0XHRcdGFkZEljb24oXCJhYmFuZG9uZWRcIiwgZ2V0U3RhdHVzSWNvbihcImFiYW5kb25lZFwiKSk7XHJcblx0XHRcdGFkZEljb24oXCJub3RTdGFydGVkXCIsIGdldFN0YXR1c0ljb24oXCJub3RTdGFydGVkXCIpKTtcclxuXHJcblx0XHRcdC8vIEFkZCBhIHJpYmJvbiBpY29uIGZvciBvcGVuaW5nIHRoZSBUYXNrVmlld1xyXG5cdFx0XHR0aGlzLmFkZFJpYmJvbkljb24oXHJcblx0XHRcdFx0XCJ0YXNrLWdlbml1c1wiLFxyXG5cdFx0XHRcdHQoXCJPcGVuIFRhc2sgR2VuaXVzIHZpZXdcIiksXHJcblx0XHRcdFx0KCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5hY3RpdmF0ZVRhc2tWaWV3KCk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIEluaXRpYWxpemUgZGF0YWZsb3cgb3JjaGVzdHJhdG9yIChwcmltYXJ5IGFyY2hpdGVjdHVyZSlcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHQvLyBXYWl0IGZvciBkYXRhZmxvdyBpbml0aWFsaXphdGlvbiB0byBjb21wbGV0ZSBiZWZvcmUgcHJvY2VlZGluZ1xyXG5cdFx0XHRcdHRoaXMuZGF0YWZsb3dPcmNoZXN0cmF0b3IgPSBhd2FpdCBjcmVhdGVEYXRhZmxvdyhcclxuXHRcdFx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHRcdFx0dGhpcy5hcHAudmF1bHQsXHJcblx0XHRcdFx0XHR0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLFxyXG5cdFx0XHRcdFx0dGhpcyxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y29uZmlnRmlsZU5hbWU6XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnPy5jb25maWdGaWxlPy5maWxlTmFtZSB8fFxyXG5cdFx0XHRcdFx0XHRcdFwicHJvamVjdC5tZFwiLFxyXG5cdFx0XHRcdFx0XHRzZWFyY2hSZWN1cnNpdmVseTpcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnNldHRpbmdzLnByb2plY3RDb25maWc/LmNvbmZpZ0ZpbGVcclxuXHRcdFx0XHRcdFx0XHRcdD8uc2VhcmNoUmVjdXJzaXZlbHkgPz8gdHJ1ZSxcclxuXHRcdFx0XHRcdFx0bWV0YWRhdGFLZXk6XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnPy5tZXRhZGF0YUNvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdFx0Py5tZXRhZGF0YUtleSB8fCBcInByb2plY3RcIixcclxuXHRcdFx0XHRcdFx0cGF0aE1hcHBpbmdzOlxyXG5cdFx0XHRcdFx0XHRcdHRoaXMuc2V0dGluZ3MucHJvamVjdENvbmZpZz8ucGF0aE1hcHBpbmdzIHx8IFtdLFxyXG5cdFx0XHRcdFx0XHRtZXRhZGF0YU1hcHBpbmdzOlxyXG5cdFx0XHRcdFx0XHRcdHRoaXMuc2V0dGluZ3MucHJvamVjdENvbmZpZz8ubWV0YWRhdGFNYXBwaW5ncyB8fCBbXSxcclxuXHRcdFx0XHRcdFx0ZGVmYXVsdFByb2plY3ROYW1pbmc6IHRoaXMuc2V0dGluZ3MucHJvamVjdENvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdD8uZGVmYXVsdFByb2plY3ROYW1pbmcgfHwge1xyXG5cdFx0XHRcdFx0XHRcdHN0cmF0ZWd5OiBcImZpbGVuYW1lXCIsXHJcblx0XHRcdFx0XHRcdFx0c3RyaXBFeHRlbnNpb246IHRydWUsXHJcblx0XHRcdFx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdGVuaGFuY2VkUHJvamVjdEVuYWJsZWQ6XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnXHJcblx0XHRcdFx0XHRcdFx0XHQ/LmVuYWJsZUVuaGFuY2VkUHJvamVjdCA/PyBmYWxzZSxcclxuXHRcdFx0XHRcdFx0bWV0YWRhdGFDb25maWdFbmFibGVkOlxyXG5cdFx0XHRcdFx0XHRcdHRoaXMuc2V0dGluZ3MucHJvamVjdENvbmZpZz8ubWV0YWRhdGFDb25maWdcclxuXHRcdFx0XHRcdFx0XHRcdD8uZW5hYmxlZCA/PyBmYWxzZSxcclxuXHRcdFx0XHRcdFx0Y29uZmlnRmlsZUVuYWJsZWQ6XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnPy5jb25maWdGaWxlPy5lbmFibGVkID8/XHJcblx0XHRcdFx0XHRcdFx0ZmFsc2UsXHJcblx0XHRcdFx0XHRcdGRldGVjdGlvbk1ldGhvZHM6XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnPy5tZXRhZGF0YUNvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdFx0Py5kZXRlY3Rpb25NZXRob2RzIHx8IFtdLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXHJcblx0XHRcdFx0XHRcIltQbHVnaW5dIEZhaWxlZCB0byBpbml0aWFsaXplIGRhdGFmbG93IG9yY2hlc3RyYXRvcjpcIixcclxuXHRcdFx0XHRcdGVycm9yLFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0Ly8gRmF0YWwgZXJyb3IgLSBjYW5ub3QgY29udGludWUgd2l0aG91dCBkYXRhZmxvd1xyXG5cdFx0XHRcdG5ldyBOb3RpY2UoXHJcblx0XHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XHRcIkZhaWxlZCB0byBpbml0aWFsaXplIHRhc2sgc3lzdGVtLiBQbGVhc2UgcmVzdGFydCBPYnNpZGlhbi5cIixcclxuXHRcdFx0XHRcdCksXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSW5pdGlhbGl6ZSBXcml0ZUFQSSAoYWx3YXlzLCBhcyBkYXRhZmxvdyBpcyBub3cgcHJpbWFyeSlcclxuXHRcdFx0Y29uc3QgZ2V0VGFza0J5SWQgPSBhc3luYyAoaWQ6IHN0cmluZyk6IFByb21pc2U8VGFzayB8IG51bGw+ID0+IHtcclxuXHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0aWYgKCF0aGlzLmRhdGFmbG93T3JjaGVzdHJhdG9yKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0Y29uc3QgcmVwb3NpdG9yeSA9XHJcblx0XHRcdFx0XHRcdHRoaXMuZGF0YWZsb3dPcmNoZXN0cmF0b3IuZ2V0UmVwb3NpdG9yeSgpO1xyXG5cdFx0XHRcdFx0Y29uc3QgdGFzayA9IGF3YWl0IHJlcG9zaXRvcnkuZ2V0VGFza0J5SWQoaWQpO1xyXG5cdFx0XHRcdFx0cmV0dXJuIHRhc2sgfHwgbnVsbDtcclxuXHRcdFx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLndhcm4oXCJGYWlsZWQgdG8gZ2V0IHRhc2sgZnJvbSBkYXRhZmxvd1wiLCBlKTtcclxuXHRcdFx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHRoaXMud3JpdGVBUEkgPSBuZXcgV3JpdGVBUEkoXHJcblx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0dGhpcy5hcHAudmF1bHQsXHJcblx0XHRcdFx0dGhpcy5hcHAubWV0YWRhdGFDYWNoZSxcclxuXHRcdFx0XHR0aGlzLFxyXG5cdFx0XHRcdGdldFRhc2tCeUlkLFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gSW5pdGlhbGl6ZSBPbkNvbXBsZXRpb25NYW5hZ2VyXHJcblx0XHRcdHRoaXMub25Db21wbGV0aW9uTWFuYWdlciA9IG5ldyBPbkNvbXBsZXRpb25NYW5hZ2VyKHRoaXMuYXBwLCB0aGlzKTtcclxuXHRcdFx0dGhpcy5hZGRDaGlsZCh0aGlzLm9uQ29tcGxldGlvbk1hbmFnZXIpO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIltQbHVnaW5dIE9uQ29tcGxldGlvbk1hbmFnZXIgaW5pdGlhbGl6ZWRcIik7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHRoaXMuc2V0dGluZ3MucmV3YXJkcy5lbmFibGVSZXdhcmRzKSB7XHJcblx0XHRcdHRoaXMucmV3YXJkTWFuYWdlciA9IG5ldyBSZXdhcmRNYW5hZ2VyKHRoaXMpO1xyXG5cdFx0XHR0aGlzLmFkZENoaWxkKHRoaXMucmV3YXJkTWFuYWdlcik7XHJcblxyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRWRpdG9yRXh0ZW5zaW9uKFtcclxuXHRcdFx0XHRtb25pdG9yVGFza0NvbXBsZXRlZEV4dGVuc2lvbih0aGlzLmFwcCwgdGhpcyksXHJcblx0XHRcdF0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMucmVnaXN0ZXJDb21tYW5kcygpO1xyXG5cdFx0dGhpcy5yZWdpc3RlckVkaXRvckV4dCgpO1xyXG5cclxuXHRcdC8vIEluc3RhbGwgd29ya3NwYWNlIERuRCBtb25rZXkgcGF0Y2ggKGJsb2NrcyBkcmFnZ2luZyByZXN0cmljdGVkIHZpZXdzIHRvIGNlbnRlcilcclxuXHRcdGluc3RhbGxXb3Jrc3BhY2VEcmFnTW9uaXRvcih0aGlzKTtcclxuXHRcdC8vIEFsc28gcmVzdHJpY3QgVjIgbWFpbiB2aWV3IGZyb20gYmVpbmcgZHJvcHBlZCB0byBjZW50ZXIsIGFzIGl0IGlzIHNpZGViYXItbWFuYWdlZFxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0cmVnaXN0ZXJSZXN0cmljdGVkRG5EVmlld1R5cGVzKEZMVUVOVF9UQVNLX1ZJRVcpO1xyXG5cdFx0fSBjYXRjaCB7fVxyXG5cclxuXHRcdHRoaXMuc2V0dGluZ1RhYiA9IG5ldyBUYXNrUHJvZ3Jlc3NCYXJTZXR0aW5nVGFiKHRoaXMuYXBwLCB0aGlzKTtcclxuXHRcdHRoaXMuYWRkU2V0dGluZ1RhYih0aGlzLnNldHRpbmdUYWIpO1xyXG5cclxuXHRcdHRoaXMucmVnaXN0ZXJFdmVudChcclxuXHRcdFx0dGhpcy5hcHAud29ya3NwYWNlLm9uKFwiZWRpdG9yLW1lbnVcIiwgKG1lbnUsIGVkaXRvcikgPT4ge1xyXG5cdFx0XHRcdGlmICh0aGlzLnNldHRpbmdzLmVuYWJsZVByaW9yaXR5S2V5Ym9hcmRTaG9ydGN1dHMpIHtcclxuXHRcdFx0XHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJTZXQgcHJpb3JpdHlcIikpO1xyXG5cdFx0XHRcdFx0XHRpdGVtLnNldEljb24oXCJsaXN0LW9yZGVyZWRcIik7XHJcblx0XHRcdFx0XHRcdC8vIEB0cy1pZ25vcmVcclxuXHRcdFx0XHRcdFx0Y29uc3Qgc3VibWVudSA9IGl0ZW0uc2V0U3VibWVudSgpIGFzIE1lbnU7XHJcblx0XHRcdFx0XHRcdC8vIEVtb2ppIHByaW9yaXR5IGNvbW1hbmRzXHJcblx0XHRcdFx0XHRcdE9iamVjdC5lbnRyaWVzKFRBU0tfUFJJT1JJVElFUykuZm9yRWFjaChcclxuXHRcdFx0XHRcdFx0XHQoW2tleSwgcHJpb3JpdHldKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRpZiAoa2V5ICE9PSBcIm5vbmVcIikge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRzdWJtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRpdGVtLnNldFRpdGxlKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0YCR7dChcIlNldCBwcmlvcml0eVwiKX06ICR7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHByaW9yaXR5LnRleHRcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1gLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0aXRlbS5zZXRJY29uKFwiYXJyb3ctYmlnLXVwLWRhc2hcIik7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0aXRlbS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHNldFByaW9yaXR5QXRDdXJzb3IoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGVkaXRvcixcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0cHJpb3JpdHkuZW1vamksXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdFx0c3VibWVudS5hZGRTZXBhcmF0b3IoKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIExldHRlciBwcmlvcml0eSBjb21tYW5kc1xyXG5cdFx0XHRcdFx0XHRPYmplY3QuZW50cmllcyhMRVRURVJfUFJJT1JJVElFUykuZm9yRWFjaChcclxuXHRcdFx0XHRcdFx0XHQoW2tleSwgcHJpb3JpdHldKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRzdWJtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0aXRlbS5zZXRUaXRsZShcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRgJHt0KFwiU2V0IHByaW9yaXR5XCIpfTogJHtrZXl9YCxcclxuXHRcdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0aXRlbS5zZXRJY29uKFwiYS1hcnJvdy11cFwiKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0aXRlbS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRzZXRQcmlvcml0eUF0Q3Vyc29yKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZWRpdG9yLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0YFsjJHtrZXl9XWAsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gUmVtb3ZlIHByaW9yaXR5IGNvbW1hbmRcclxuXHRcdFx0XHRcdFx0c3VibWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0aXRlbS5zZXRUaXRsZSh0KFwiUmVtb3ZlIFByaW9yaXR5XCIpKTtcclxuXHRcdFx0XHRcdFx0XHRpdGVtLnNldEljb24oXCJsaXN0LXhcIik7XHJcblx0XHRcdFx0XHRcdFx0Ly8gQHRzLWlnbm9yZVxyXG5cdFx0XHRcdFx0XHRcdGl0ZW0uc2V0V2FybmluZyh0cnVlKTtcclxuXHRcdFx0XHRcdFx0XHRpdGVtLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0cmVtb3ZlUHJpb3JpdHlBdEN1cnNvcihlZGl0b3IpO1xyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gQWRkIHdvcmtmbG93IGNvbnRleHQgbWVudVxyXG5cdFx0XHRcdGlmICh0aGlzLnNldHRpbmdzLndvcmtmbG93LmVuYWJsZVdvcmtmbG93KSB7XHJcblx0XHRcdFx0XHR1cGRhdGVXb3JrZmxvd0NvbnRleHRNZW51KG1lbnUsIGVkaXRvciwgdGhpcyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KSxcclxuXHRcdCk7XHJcblxyXG5cdFx0dGhpcy5hcHAud29ya3NwYWNlLm9uTGF5b3V0UmVhZHkoYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zb2xlLnRpbWUoXCJbVFBCXSBvbkxheW91dFJlYWR5XCIpO1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIHdvcmtzcGFjZSBsZWF2ZXMgd2hlbiBsYXlvdXQgaXMgcmVhZHlcclxuXHRcdFx0Y29uc3QgZGVmZXJXb3Jrc3BhY2VMZWF2ZXMgPVxyXG5cdFx0XHRcdHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoVEFTS19WSUVXX1RZUEUpO1xyXG5cdFx0XHRjb25zdCBkZWZlclNwZWNpZmljTGVhdmVzID0gdGhpcy5hcHAud29ya3NwYWNlLmdldExlYXZlc09mVHlwZShcclxuXHRcdFx0XHRUQVNLX1NQRUNJRklDX1ZJRVdfVFlQRSxcclxuXHRcdFx0KTtcclxuXHRcdFx0Wy4uLmRlZmVyV29ya3NwYWNlTGVhdmVzLCAuLi5kZWZlclNwZWNpZmljTGVhdmVzXS5mb3JFYWNoKFxyXG5cdFx0XHRcdChsZWFmKSA9PiB7XHJcblx0XHRcdFx0XHRsZWFmLmxvYWRJZkRlZmVycmVkKCk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0KTtcclxuXHRcdFx0Ly8gSW5pdGlhbGl6ZSBUYXNrIEdlbml1cyBJY29uIE1hbmFnZXJcclxuXHRcdFx0dGhpcy50YXNrR2VuaXVzSWNvbk1hbmFnZXIgPSBuZXcgVGFza0dlbml1c0ljb25NYW5hZ2VyKHRoaXMpO1xyXG5cdFx0XHR0aGlzLmFkZENoaWxkKHRoaXMudGFza0dlbml1c0ljb25NYW5hZ2VyKTtcclxuXHJcblx0XHRcdC8vIEluaXRpYWxpemUgTUNQIFNlcnZlciBNYW5hZ2VyIChkZXNrdG9wIG9ubHkpXHJcblx0XHRcdGlmIChQbGF0Zm9ybS5pc0Rlc2t0b3BBcHApIHtcclxuXHRcdFx0XHR0aGlzLm1jcFNlcnZlck1hbmFnZXIgPSBuZXcgTWNwU2VydmVyTWFuYWdlcih0aGlzKTtcclxuXHRcdFx0XHR0aGlzLm1jcFNlcnZlck1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xyXG5cclxuXHRcdFx0XHQvLyBJbml0aWFsaXplIE5vdGlmaWNhdGlvbiBNYW5hZ2VyIChkZXNrdG9wIG9ubHkpXHJcblx0XHRcdFx0dGhpcy5ub3RpZmljYXRpb25NYW5hZ2VyID0gbmV3IERlc2t0b3BJbnRlZ3JhdGlvbk1hbmFnZXIodGhpcyk7XHJcblx0XHRcdFx0dGhpcy5hZGRDaGlsZCh0aGlzLm5vdGlmaWNhdGlvbk1hbmFnZXIpO1xyXG5cclxuXHRcdFx0XHQvLyBTdWJzY3JpYmUgdG8gdGFzayBjYWNoZSB1cGRhdGVzIHRvIGluZm9ybSBub3RpZmljYXRpb25zXHJcblx0XHRcdFx0dGhpcy5yZWdpc3RlckV2ZW50KFxyXG5cdFx0XHRcdFx0dGhpcy5hcHAud29ya3NwYWNlLm9uKFxyXG5cdFx0XHRcdFx0XHRFdmVudHMuVEFTS19DQUNIRV9VUERBVEVEIGFzIGFueSxcclxuXHRcdFx0XHRcdFx0KCkgPT4gdGhpcy5ub3RpZmljYXRpb25NYW5hZ2VyPy5vblRhc2tDYWNoZVVwZGF0ZWQoKSxcclxuXHRcdFx0XHRcdCksXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgYW5kIHNob3cgb25ib2FyZGluZyBmb3IgZmlyc3QtdGltZSB1c2Vyc1xyXG5cdFx0XHR0aGlzLmNoZWNrQW5kU2hvd09uYm9hcmRpbmcoKTtcclxuXHJcblx0XHRcdGlmICh0aGlzLnNldHRpbmdzLmF1dG9Db21wbGV0ZVBhcmVudCkge1xyXG5cdFx0XHRcdHRoaXMucmVnaXN0ZXJFZGl0b3JFeHRlbnNpb24oW1xyXG5cdFx0XHRcdFx0YXV0b0NvbXBsZXRlUGFyZW50RXh0ZW5zaW9uKHRoaXMuYXBwLCB0aGlzKSxcclxuXHRcdFx0XHRdKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKHRoaXMuc2V0dGluZ3MuZW5hYmxlQ3ljbGVDb21wbGV0ZVN0YXR1cykge1xyXG5cdFx0XHRcdHRoaXMucmVnaXN0ZXJFZGl0b3JFeHRlbnNpb24oW1xyXG5cdFx0XHRcdFx0Y3ljbGVDb21wbGV0ZVN0YXR1c0V4dGVuc2lvbih0aGlzLmFwcCwgdGhpcyksXHJcblx0XHRcdFx0XSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHRoaXMucmVnaXN0ZXJNYXJrZG93blBvc3RQcm9jZXNzb3IoKGVsLCBjdHgpID0+IHtcclxuXHRcdFx0XHQvLyBBcHBseSBjdXN0b20gdGFzayB0ZXh0IG1hcmtzIChyZXBsYWNlcyBjaGVja2JveGVzIHdpdGggc3R5bGVkIG1hcmtzKVxyXG5cdFx0XHRcdGlmICh0aGlzLnNldHRpbmdzLmVuYWJsZVRhc2tTdGF0dXNTd2l0Y2hlcikge1xyXG5cdFx0XHRcdFx0YXBwbHlUYXNrVGV4dE1hcmtzKHtcclxuXHRcdFx0XHRcdFx0cGx1Z2luOiB0aGlzLFxyXG5cdFx0XHRcdFx0XHRlbGVtZW50OiBlbCxcclxuXHRcdFx0XHRcdFx0Y3R4OiBjdHgsXHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIEFwcGx5IHByb2dyZXNzIGJhcnMgKGV4aXN0aW5nIGZ1bmN0aW9uYWxpdHkpXHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0dGhpcy5zZXR0aW5ncy5lbmFibGVQcm9ncmVzc2JhckluUmVhZGluZ01vZGUgJiZcclxuXHRcdFx0XHRcdHRoaXMuc2V0dGluZ3MucHJvZ3Jlc3NCYXJEaXNwbGF5TW9kZSAhPT0gXCJub25lXCJcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdHVwZGF0ZVByb2dyZXNzQmFySW5FbGVtZW50KHtcclxuXHRcdFx0XHRcdFx0cGx1Z2luOiB0aGlzLFxyXG5cdFx0XHRcdFx0XHRlbGVtZW50OiBlbCxcclxuXHRcdFx0XHRcdFx0Y3R4OiBjdHgsXHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0aWYgKHRoaXMuc2V0dGluZ3MuaGFiaXQuZW5hYmxlSGFiaXRzKSB7XHJcblx0XHRcdFx0dGhpcy5oYWJpdE1hbmFnZXIgPSBuZXcgSGFiaXRNYW5hZ2VyKHRoaXMpO1xyXG5cdFx0XHRcdHRoaXMuYWRkQ2hpbGQodGhpcy5oYWJpdE1hbmFnZXIpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBJbml0aWFsaXplIElDUyBtYW5hZ2VyIGlmIHNvdXJjZXMgYXJlIGNvbmZpZ3VyZWRcclxuXHRcdFx0aWYgKHRoaXMuc2V0dGluZ3MuaWNzSW50ZWdyYXRpb24uc291cmNlcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0dGhpcy5pY3NNYW5hZ2VyID0gbmV3IEljc01hbmFnZXIoXHJcblx0XHRcdFx0XHR0aGlzLnNldHRpbmdzLmljc0ludGVncmF0aW9uLFxyXG5cdFx0XHRcdFx0dGhpcy5zZXR0aW5ncyxcclxuXHRcdFx0XHRcdHRoaXMsXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHR0aGlzLmFkZENoaWxkKHRoaXMuaWNzTWFuYWdlcik7XHJcblxyXG5cdFx0XHRcdC8vIEluaXRpYWxpemUgSUNTIG1hbmFnZXJcclxuXHRcdFx0XHR0aGlzLmljc01hbmFnZXIuaW5pdGlhbGl6ZSgpLmNhdGNoKChlcnJvcikgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBpbml0aWFsaXplIElDUyBtYW5hZ2VyOlwiLCBlcnJvcik7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEF1dG8tb3BlbiB0aW1lbGluZSBzaWRlYmFyIGlmIGVuYWJsZWRcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHRoaXMuc2V0dGluZ3MudGltZWxpbmVTaWRlYmFyLmVuYWJsZVRpbWVsaW5lU2lkZWJhciAmJlxyXG5cdFx0XHRcdHRoaXMuc2V0dGluZ3MudGltZWxpbmVTaWRlYmFyLmF1dG9PcGVuT25TdGFydHVwXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdC8vIERlbGF5IG9wZW5pbmcgdG8gZW5zdXJlIHdvcmtzcGFjZSBpcyByZWFkeVxyXG5cdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5hY3RpdmF0ZVRpbWVsaW5lU2lkZWJhclZpZXcoKS5jYXRjaCgoZXJyb3IpID0+IHtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcclxuXHRcdFx0XHRcdFx0XHRcIkZhaWxlZCB0byBhdXRvLW9wZW4gdGltZWxpbmUgc2lkZWJhcjpcIixcclxuXHRcdFx0XHRcdFx0XHRlcnJvcixcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0sIDEwMDApO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR0aGlzLm1heWJlU2hvd0NoYW5nZWxvZygpO1xyXG5cclxuXHRcdFx0Y29uc29sZS50aW1lRW5kKFwiW1RQQl0gb25MYXlvdXRSZWFkeVwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIE1pZ3JhdGUgb2xkIHByZXNldHMgdG8gdXNlIHRoZSBuZXcgZmlsdGVyTW9kZSBzZXR0aW5nXHJcblx0XHRjb25zb2xlLnRpbWUoXCJbVFBCXSBtaWdyYXRlUHJlc2V0VGFza0ZpbHRlcnNcIik7XHJcblx0XHRpZiAoXHJcblx0XHRcdHRoaXMuc2V0dGluZ3MudGFza0ZpbHRlciAmJlxyXG5cdFx0XHR0aGlzLnNldHRpbmdzLnRhc2tGaWx0ZXIucHJlc2V0VGFza0ZpbHRlcnNcclxuXHRcdCkge1xyXG5cdFx0XHR0aGlzLnNldHRpbmdzLnRhc2tGaWx0ZXIucHJlc2V0VGFza0ZpbHRlcnMgPVxyXG5cdFx0XHRcdHRoaXMuc2V0dGluZ3MudGFza0ZpbHRlci5wcmVzZXRUYXNrRmlsdGVycy5tYXAoXHJcblx0XHRcdFx0XHQocHJlc2V0OiBhbnkpID0+IHtcclxuXHRcdFx0XHRcdFx0aWYgKHByZXNldC5vcHRpb25zKSB7XHJcblx0XHRcdFx0XHRcdFx0cHJlc2V0Lm9wdGlvbnMgPSBtaWdyYXRlT2xkRmlsdGVyT3B0aW9ucyhcclxuXHRcdFx0XHRcdFx0XHRcdHByZXNldC5vcHRpb25zLFxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0cmV0dXJuIHByZXNldDtcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0YXdhaXQgdGhpcy5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0Y29uc29sZS50aW1lRW5kKFwiW1RQQl0gbWlncmF0ZVByZXNldFRhc2tGaWx0ZXJzXCIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFkZCBjb21tYW5kIGZvciBxdWljayBjYXB0dXJlIHdpdGggbWV0YWRhdGFcclxuXHRcdHRoaXMuYWRkQ29tbWFuZCh7XHJcblx0XHRcdGlkOiBcInF1aWNrLWNhcHR1cmVcIixcclxuXHRcdFx0bmFtZTogdChcIlF1aWNrIENhcHR1cmVcIiksXHJcblx0XHRcdGNhbGxiYWNrOiAoKSA9PiB7XHJcblx0XHRcdFx0Ly8gQ3JlYXRlIGEgbW9kYWwgd2l0aCBmdWxsIHRhc2sgbWV0YWRhdGEgb3B0aW9uc1xyXG5cdFx0XHRcdC8vIFRoZSBuZXcgbW9kYWwgd2lsbCBhdXRvbWF0aWNhbGx5IGhhbmRsZSBtb2RlIHN3aXRjaGluZ1xyXG5cdFx0XHRcdG5ldyBRdWlja0NhcHR1cmVNb2RhbCh0aGlzLmFwcCwgdGhpcywgdW5kZWZpbmVkLCB0cnVlKS5vcGVuKCk7XHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBBZGQgY29tbWFuZCBmb3IgbWluaW1hbCBxdWljayBjYXB0dXJlXHJcblx0XHR0aGlzLmFkZENvbW1hbmQoe1xyXG5cdFx0XHRpZDogXCJtaW5pbWFsLXF1aWNrLWNhcHR1cmVcIixcclxuXHRcdFx0bmFtZTogdChcIk1pbmltYWwgUXVpY2sgQ2FwdHVyZVwiKSxcclxuXHRcdFx0Y2FsbGJhY2s6ICgpID0+IHtcclxuXHRcdFx0XHQvLyBDcmVhdGUgYSBtaW5pbWFsIG1vZGFsIGZvciBxdWljayB0YXNrIGNhcHR1cmVcclxuXHRcdFx0XHRuZXcgTWluaW1hbFF1aWNrQ2FwdHVyZU1vZGFsKHRoaXMuYXBwLCB0aGlzKS5vcGVuKCk7XHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBBZGQgY29tbWFuZCBmb3IgcXVpY2sgZmlsZSBjcmVhdGlvblxyXG5cdFx0dGhpcy5hZGRDb21tYW5kKHtcclxuXHRcdFx0aWQ6IFwicXVpY2stZmlsZS1jcmVhdGVcIixcclxuXHRcdFx0bmFtZTogdChcIlF1aWNrIEZpbGUgQ3JlYXRlXCIpLFxyXG5cdFx0XHRjYWxsYmFjazogKCkgPT4ge1xyXG5cdFx0XHRcdC8vIENyZWF0ZSBhIG1vZGFsIHdpdGggZmlsZSBjcmVhdGlvbiBtb2RlIG1ldGFkYXRhXHJcblx0XHRcdFx0Y29uc3QgbW9kYWwgPSBuZXcgUXVpY2tDYXB0dXJlTW9kYWwodGhpcy5hcHAsIHRoaXMsIHtcclxuXHRcdFx0XHRcdGxvY2F0aW9uOiBcImZpbGVcIixcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHQvLyBUaGUgbW9kYWwgd2lsbCBkZXRlY3QgZmlsZSBsb2NhdGlvbiBhbmQgc3dpdGNoIHRvIGZpbGUgbW9kZVxyXG5cdFx0XHRcdG1vZGFsLm9wZW4oKTtcclxuXHRcdFx0fSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEFkZCBjb21tYW5kIGZvciB0b2dnbGluZyB0YXNrIGZpbHRlclxyXG5cdFx0dGhpcy5hZGRDb21tYW5kKHtcclxuXHRcdFx0aWQ6IFwidG9nZ2xlLXRhc2stZmlsdGVyXCIsXHJcblx0XHRcdG5hbWU6IHQoXCJUb2dnbGUgdGFzayBmaWx0ZXIgcGFuZWxcIiksXHJcblx0XHRcdGVkaXRvckNhbGxiYWNrOiAoZWRpdG9yLCBjdHgpID0+IHtcclxuXHRcdFx0XHRjb25zdCB2aWV3ID0gZWRpdG9yLmNtIGFzIEVkaXRvclZpZXc7XHJcblxyXG5cdFx0XHRcdGlmICh2aWV3KSB7XHJcblx0XHRcdFx0XHR2aWV3LmRpc3BhdGNoKHtcclxuXHRcdFx0XHRcdFx0ZWZmZWN0czogdG9nZ2xlVGFza0ZpbHRlci5vZihcclxuXHRcdFx0XHRcdFx0XHQhdmlldy5zdGF0ZS5maWVsZCh0YXNrRmlsdGVyU3RhdGUpLFxyXG5cdFx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc29sZS50aW1lRW5kKFwiW1RQQl0gb25sb2FkXCIpO1xyXG5cdH1cclxuXHJcblx0cmVnaXN0ZXJDb21tYW5kcygpIHtcclxuXHRcdGlmICh0aGlzLnNldHRpbmdzLnNvcnRUYXNrcykge1xyXG5cdFx0XHR0aGlzLmFkZENvbW1hbmQoe1xyXG5cdFx0XHRcdGlkOiBcInNvcnQtdGFza3MtYnktZHVlLWRhdGVcIixcclxuXHRcdFx0XHRuYW1lOiB0KFwiU29ydCBUYXNrcyBpbiBTZWN0aW9uXCIpLFxyXG5cdFx0XHRcdGVkaXRvckNhbGxiYWNrOiAoZWRpdG9yOiBFZGl0b3IsIHZpZXc6IE1hcmtkb3duVmlldykgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc3QgZWRpdG9yVmlldyA9IChlZGl0b3IgYXMgYW55KS5jbSBhcyBFZGl0b3JWaWV3O1xyXG5cdFx0XHRcdFx0aWYgKCFlZGl0b3JWaWV3KSByZXR1cm47XHJcblxyXG5cdFx0XHRcdFx0Y29uc3QgY2hhbmdlcyA9IHNvcnRUYXNrc0luRG9jdW1lbnQoXHJcblx0XHRcdFx0XHRcdGVkaXRvclZpZXcsXHJcblx0XHRcdFx0XHRcdHRoaXMsXHJcblx0XHRcdFx0XHRcdGZhbHNlLFxyXG5cdFx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0XHRpZiAoY2hhbmdlcykge1xyXG5cdFx0XHRcdFx0XHRuZXcgTm90aWNlKFxyXG5cdFx0XHRcdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcdFx0XHRcIlRhc2tzIHNvcnRlZCAodXNpbmcgc2V0dGluZ3MpLiBDaGFuZ2UgYXBwbGljYXRpb24gbmVlZHMgcmVmaW5lbWVudC5cIixcclxuXHRcdFx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0Ly8gTm90aWNlIGlzIGFscmVhZHkgaGFuZGxlZCB3aXRoaW4gc29ydFRhc2tzSW5Eb2N1bWVudCBpZiBubyBjaGFuZ2VzIG9yIHNvcnRpbmcgZGlzYWJsZWRcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHRoaXMuYWRkQ29tbWFuZCh7XHJcblx0XHRcdFx0aWQ6IFwic29ydC10YXNrcy1pbi1lbnRpcmUtZG9jdW1lbnRcIixcclxuXHRcdFx0XHRuYW1lOiB0KFwiU29ydCBUYXNrcyBpbiBFbnRpcmUgRG9jdW1lbnRcIiksXHJcblx0XHRcdFx0ZWRpdG9yQ2FsbGJhY2s6IChlZGl0b3I6IEVkaXRvciwgdmlldzogTWFya2Rvd25WaWV3KSA9PiB7XHJcblx0XHRcdFx0XHRjb25zdCBlZGl0b3JWaWV3ID0gKGVkaXRvciBhcyBhbnkpLmNtIGFzIEVkaXRvclZpZXc7XHJcblx0XHRcdFx0XHRpZiAoIWVkaXRvclZpZXcpIHJldHVybjtcclxuXHJcblx0XHRcdFx0XHRjb25zdCBjaGFuZ2VzID0gc29ydFRhc2tzSW5Eb2N1bWVudChlZGl0b3JWaWV3LCB0aGlzLCB0cnVlKTtcclxuXHJcblx0XHRcdFx0XHRpZiAoY2hhbmdlcykge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBpbmZvID0gZWRpdG9yVmlldy5zdGF0ZS5maWVsZChlZGl0b3JJbmZvRmllbGQpO1xyXG5cdFx0XHRcdFx0XHRpZiAoIWluZm8gfHwgIWluZm8uZmlsZSkgcmV0dXJuO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmFwcC52YXVsdC5wcm9jZXNzKGluZm8uZmlsZSwgKGRhdGEpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gY2hhbmdlcztcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdG5ldyBOb3RpY2UoXHJcblx0XHRcdFx0XHRcdFx0dChcIkVudGlyZSBkb2N1bWVudCBzb3J0ZWQgKHVzaW5nIHNldHRpbmdzKS5cIiksXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRuZXcgTm90aWNlKFxyXG5cdFx0XHRcdFx0XHRcdHQoXCJUYXNrcyBhbHJlYWR5IHNvcnRlZCBvciBubyB0YXNrcyBmb3VuZC5cIiksXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWRkIGNvbW1hbmQgZm9yIGN5Y2xpbmcgdGFzayBzdGF0dXMgZm9yd2FyZFxyXG5cdFx0dGhpcy5hZGRDb21tYW5kKHtcclxuXHRcdFx0aWQ6IFwiY3ljbGUtdGFzay1zdGF0dXMtZm9yd2FyZFwiLFxyXG5cdFx0XHRuYW1lOiB0KFwiQ3ljbGUgdGFzayBzdGF0dXMgZm9yd2FyZFwiKSxcclxuXHRcdFx0ZWRpdG9yQ2hlY2tDYWxsYmFjazogKGNoZWNraW5nLCBlZGl0b3IsIGN0eCkgPT4ge1xyXG5cdFx0XHRcdHJldHVybiBjeWNsZVRhc2tTdGF0dXNGb3J3YXJkKGNoZWNraW5nLCBlZGl0b3IsIGN0eCwgdGhpcyk7XHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBBZGQgY29tbWFuZCBmb3IgY3ljbGluZyB0YXNrIHN0YXR1cyBiYWNrd2FyZFxyXG5cdFx0dGhpcy5hZGRDb21tYW5kKHtcclxuXHRcdFx0aWQ6IFwiY3ljbGUtdGFzay1zdGF0dXMtYmFja3dhcmRcIixcclxuXHRcdFx0bmFtZTogdChcIkN5Y2xlIHRhc2sgc3RhdHVzIGJhY2t3YXJkXCIpLFxyXG5cdFx0XHRlZGl0b3JDaGVja0NhbGxiYWNrOiAoY2hlY2tpbmcsIGVkaXRvciwgY3R4KSA9PiB7XHJcblx0XHRcdFx0cmV0dXJuIGN5Y2xlVGFza1N0YXR1c0JhY2t3YXJkKGNoZWNraW5nLCBlZGl0b3IsIGN0eCwgdGhpcyk7XHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHJcblx0XHRpZiAodGhpcy5zZXR0aW5ncy5lbmFibGVJbmRleGVyKSB7XHJcblx0XHRcdC8vIEFkZCBjb21tYW5kIHRvIHJlZnJlc2ggdGhlIHRhc2sgaW5kZXhcclxuXHRcdFx0dGhpcy5hZGRDb21tYW5kKHtcclxuXHRcdFx0XHRpZDogXCJyZWZyZXNoLXRhc2staW5kZXhcIixcclxuXHRcdFx0XHRuYW1lOiB0KFwiUmVmcmVzaCB0YXNrIGluZGV4XCIpLFxyXG5cdFx0XHRcdGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XHJcblx0XHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0XHRuZXcgTm90aWNlKHQoXCJSZWZyZXNoaW5nIHRhc2sgaW5kZXguLi5cIikpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gQ2hlY2sgaWYgZGF0YWZsb3cgaXMgZW5hYmxlZFxyXG5cdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0dGhpcy5zZXR0aW5ncz8uZW5hYmxlSW5kZXhlciAmJlxyXG5cdFx0XHRcdFx0XHRcdHRoaXMuZGF0YWZsb3dPcmNoZXN0cmF0b3JcclxuXHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gVXNlIGRhdGFmbG93IG9yY2hlc3RyYXRvciBmb3IgcmVmcmVzaFxyXG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRcdFx0XCJbQ29tbWFuZF0gUmVmcmVzaGluZyB0YXNrIGluZGV4IHZpYSBkYXRhZmxvd1wiLFxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdC8vIFJlLXNjYW4gYWxsIGZpbGVzIHRvIHJlZnJlc2ggdGhlIGluZGV4XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgZmlsZXMgPSB0aGlzLmFwcC52YXVsdC5nZXRNYXJrZG93bkZpbGVzKCk7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgY2FudmFzRmlsZXMgPSB0aGlzLmFwcC52YXVsdFxyXG5cdFx0XHRcdFx0XHRcdFx0LmdldEZpbGVzKClcclxuXHRcdFx0XHRcdFx0XHRcdC5maWx0ZXIoKGYpID0+IGYuZXh0ZW5zaW9uID09PSBcImNhbnZhc1wiKTtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBhbGxGaWxlcyA9IFsuLi5maWxlcywgLi4uY2FudmFzRmlsZXNdO1xyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyBQcm9jZXNzIGZpbGVzIGluIGJhdGNoZXNcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBiYXRjaFNpemUgPSA1MDtcclxuXHRcdFx0XHRcdFx0XHRmb3IgKFxyXG5cdFx0XHRcdFx0XHRcdFx0bGV0IGkgPSAwO1xyXG5cdFx0XHRcdFx0XHRcdFx0aSA8IGFsbEZpbGVzLmxlbmd0aDtcclxuXHRcdFx0XHRcdFx0XHRcdGkgKz0gYmF0Y2hTaXplXHJcblx0XHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBiYXRjaCA9IGFsbEZpbGVzLnNsaWNlKGksIGkgKyBiYXRjaFNpemUpO1xyXG5cdFx0XHRcdFx0XHRcdFx0YXdhaXQgUHJvbWlzZS5hbGwoXHJcblx0XHRcdFx0XHRcdFx0XHRcdGJhdGNoLm1hcCgoZmlsZSkgPT5cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmRhdGFmbG93T3JjaGVzdHJhdG9yIGFzIGFueVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCkucHJvY2Vzc0ZpbGVJbW1lZGlhdGUoZmlsZSksXHJcblx0XHRcdFx0XHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gUmVmcmVzaCBJQ1MgZXZlbnRzIGlmIGF2YWlsYWJsZVxyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGljc1NvdXJjZSA9ICh0aGlzLmRhdGFmbG93T3JjaGVzdHJhdG9yIGFzIGFueSlcclxuXHRcdFx0XHRcdFx0XHRcdC5pY3NTb3VyY2U7XHJcblx0XHRcdFx0XHRcdFx0aWYgKGljc1NvdXJjZSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0YXdhaXQgaWNzU291cmNlLnJlZnJlc2goKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0Ly8gZWxzZSB7XHJcblx0XHRcdFx0XHRcdC8vIFx0Ly8gVXNlIGxlZ2FjeSB0YXNrIG1hbmFnZXJcclxuXHRcdFx0XHRcdFx0Ly8gXHRhd2FpdCB0aGlzLnRhc2tNYW5hZ2VyLmluaXRpYWxpemUoKTtcclxuXHRcdFx0XHRcdFx0Ly8gfVxyXG5cclxuXHRcdFx0XHRcdFx0bmV3IE5vdGljZSh0KFwiVGFzayBpbmRleCByZWZyZXNoZWRcIikpO1xyXG5cdFx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkZhaWxlZCB0byByZWZyZXNoIHRhc2sgaW5kZXg6XCIsIGVycm9yKTtcclxuXHRcdFx0XHRcdFx0bmV3IE5vdGljZSh0KFwiRmFpbGVkIHRvIHJlZnJlc2ggdGFzayBpbmRleFwiKSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBBZGQgY29tbWFuZCB0byBmb3JjZSByZWluZGV4IGFsbCB0YXNrcyBieSBjbGVhcmluZyBjYWNoZVxyXG5cdFx0XHR0aGlzLmFkZENvbW1hbmQoe1xyXG5cdFx0XHRcdGlkOiBcImZvcmNlLXJlaW5kZXgtdGFza3NcIixcclxuXHRcdFx0XHRuYW1lOiB0KFwiRm9yY2UgcmVpbmRleCBhbGwgdGFza3NcIiksXHJcblx0XHRcdFx0Y2FsbGJhY2s6IGFzeW5jICgpID0+IHtcclxuXHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdC8vIENoZWNrIGlmIGRhdGFmbG93IGlzIGVuYWJsZWRcclxuXHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdHRoaXMuc2V0dGluZ3M/LmVuYWJsZUluZGV4ZXIgJiZcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmRhdGFmbG93T3JjaGVzdHJhdG9yXHJcblx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdC8vIFVzZSBkYXRhZmxvdyBvcmNoZXN0cmF0b3IgZm9yIGZvcmNlIHJlaW5kZXhcclxuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdFx0XHRcdFwiW0NvbW1hbmRdIEZvcmNlIHJlaW5kZXhpbmcgdmlhIGRhdGFmbG93XCIsXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRuZXcgTm90aWNlKFxyXG5cdFx0XHRcdFx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFx0XHRcdFx0XCJDbGVhcmluZyB0YXNrIGNhY2hlIGFuZCByZWJ1aWxkaW5nIGluZGV4Li4uXCIsXHJcblx0XHRcdFx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdC8vIENsZWFyIGFsbCBjYWNoZXMgYW5kIHJlYnVpbGQgZnJvbSBzY3JhdGNoXHJcblx0XHRcdFx0XHRcdFx0YXdhaXQgdGhpcy5kYXRhZmxvd09yY2hlc3RyYXRvci5yZWJ1aWxkKCk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdC8vIFJlZnJlc2ggSUNTIGV2ZW50cyBhZnRlciByZWJ1aWxkXHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgaWNzU291cmNlID0gKFxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpc1xyXG5cdFx0XHRcdFx0XHRcdFx0XHQuZGF0YWZsb3dPcmNoZXN0cmF0b3IgYXMgRGF0YWZsb3dPcmNoZXN0cmF0b3JcclxuXHRcdFx0XHRcdFx0XHQpLmljc1NvdXJjZTtcclxuXHRcdFx0XHRcdFx0XHRpZiAoaWNzU291cmNlKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRhd2FpdCBpY3NTb3VyY2UucmVmcmVzaCgpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0bmV3IE5vdGljZSh0KFwiVGFzayBpbmRleCBjb21wbGV0ZWx5IHJlYnVpbHRcIikpO1xyXG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdC8vIE5vIGRhdGFmbG93IGF2YWlsYWJsZVxyXG5cdFx0XHRcdFx0XHRcdG5ldyBOb3RpY2UodChcIlRhc2sgc3lzdGVtIG5vdCBpbml0aWFsaXplZFwiKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gZm9yY2UgcmVpbmRleCB0YXNrczpcIiwgZXJyb3IpO1xyXG5cdFx0XHRcdFx0XHRuZXcgTm90aWNlKHQoXCJGYWlsZWQgdG8gZm9yY2UgcmVpbmRleCB0YXNrc1wiKSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSGFiaXQgY29tbWFuZHNcclxuXHRcdHRoaXMuYWRkQ29tbWFuZCh7XHJcblx0XHRcdGlkOiBcInJlaW5kZXgtaGFiaXRzXCIsXHJcblx0XHRcdG5hbWU6IHQoXCJSZWluZGV4IGhhYml0c1wiKSxcclxuXHRcdFx0Y2FsbGJhY2s6IGFzeW5jICgpID0+IHtcclxuXHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0YXdhaXQgdGhpcy5oYWJpdE1hbmFnZXI/LmluaXRpYWxpemVIYWJpdHMoKTtcclxuXHRcdFx0XHRcdG5ldyBOb3RpY2UodChcIkhhYml0IGluZGV4IHJlZnJlc2hlZFwiKSk7XHJcblx0XHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkZhaWxlZCB0byByZWluZGV4IGhhYml0c1wiLCBlKTtcclxuXHRcdFx0XHRcdG5ldyBOb3RpY2UodChcIkZhaWxlZCB0byByZWZyZXNoIGhhYml0IGluZGV4XCIpKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBBZGQgcHJpb3JpdHkga2V5Ym9hcmQgc2hvcnRjdXRzIGNvbW1hbmRzXHJcblx0XHRpZiAodGhpcy5zZXR0aW5ncy5lbmFibGVQcmlvcml0eUtleWJvYXJkU2hvcnRjdXRzKSB7XHJcblx0XHRcdC8vIEVtb2ppIHByaW9yaXR5IGNvbW1hbmRzXHJcblx0XHRcdE9iamVjdC5lbnRyaWVzKFRBU0tfUFJJT1JJVElFUykuZm9yRWFjaCgoW2tleSwgcHJpb3JpdHldKSA9PiB7XHJcblx0XHRcdFx0aWYgKGtleSAhPT0gXCJub25lXCIpIHtcclxuXHRcdFx0XHRcdHRoaXMuYWRkQ29tbWFuZCh7XHJcblx0XHRcdFx0XHRcdGlkOiBgc2V0LXByaW9yaXR5LSR7a2V5fWAsXHJcblx0XHRcdFx0XHRcdG5hbWU6IGAke3QoXCJTZXQgcHJpb3JpdHlcIil9ICR7cHJpb3JpdHkudGV4dH1gLFxyXG5cdFx0XHRcdFx0XHRlZGl0b3JDYWxsYmFjazogKGVkaXRvcikgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdHNldFByaW9yaXR5QXRDdXJzb3IoZWRpdG9yLCBwcmlvcml0eS5lbW9qaSk7XHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gTGV0dGVyIHByaW9yaXR5IGNvbW1hbmRzXHJcblx0XHRcdE9iamVjdC5lbnRyaWVzKExFVFRFUl9QUklPUklUSUVTKS5mb3JFYWNoKChba2V5LCBwcmlvcml0eV0pID0+IHtcclxuXHRcdFx0XHR0aGlzLmFkZENvbW1hbmQoe1xyXG5cdFx0XHRcdFx0aWQ6IGBzZXQtcHJpb3JpdHktbGV0dGVyLSR7a2V5fWAsXHJcblx0XHRcdFx0XHRuYW1lOiBgJHt0KFwiU2V0IHByaW9yaXR5XCIpfSAke2tleX1gLFxyXG5cdFx0XHRcdFx0ZWRpdG9yQ2FsbGJhY2s6IChlZGl0b3IpID0+IHtcclxuXHRcdFx0XHRcdFx0c2V0UHJpb3JpdHlBdEN1cnNvcihlZGl0b3IsIGBbIyR7a2V5fV1gKTtcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gUmVtb3ZlIHByaW9yaXR5IGNvbW1hbmRcclxuXHRcdFx0dGhpcy5hZGRDb21tYW5kKHtcclxuXHRcdFx0XHRpZDogXCJyZW1vdmUtcHJpb3JpdHlcIixcclxuXHRcdFx0XHRuYW1lOiB0KFwiUmVtb3ZlIHByaW9yaXR5XCIpLFxyXG5cdFx0XHRcdGVkaXRvckNhbGxiYWNrOiAoZWRpdG9yKSA9PiB7XHJcblx0XHRcdFx0XHRyZW1vdmVQcmlvcml0eUF0Q3Vyc29yKGVkaXRvcik7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWRkIGNvbW1hbmQgZm9yIG1vdmluZyB0YXNrc1xyXG5cdFx0dGhpcy5hZGRDb21tYW5kKHtcclxuXHRcdFx0aWQ6IFwibW92ZS10YXNrLXRvLWZpbGVcIixcclxuXHRcdFx0bmFtZTogdChcIk1vdmUgdGFzayB0byBhbm90aGVyIGZpbGVcIiksXHJcblx0XHRcdGVkaXRvckNoZWNrQ2FsbGJhY2s6IChjaGVja2luZywgZWRpdG9yLCBjdHgpID0+IHtcclxuXHRcdFx0XHRyZXR1cm4gbW92ZVRhc2tDb21tYW5kKGNoZWNraW5nLCBlZGl0b3IsIGN0eCwgdGhpcyk7XHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBBZGQgY29tbWFuZHMgZm9yIG1vdmluZyBjb21wbGV0ZWQgdGFza3NcclxuXHRcdGlmICh0aGlzLnNldHRpbmdzLmNvbXBsZXRlZFRhc2tNb3Zlci5lbmFibGVDb21wbGV0ZWRUYXNrTW92ZXIpIHtcclxuXHRcdFx0Ly8gQ29tbWFuZCBmb3IgbW92aW5nIGFsbCBjb21wbGV0ZWQgc3VidGFza3MgYW5kIHRoZWlyIGNoaWxkcmVuXHJcblx0XHRcdHRoaXMuYWRkQ29tbWFuZCh7XHJcblx0XHRcdFx0aWQ6IFwibW92ZS1jb21wbGV0ZWQtc3VidGFza3MtdG8tZmlsZVwiLFxyXG5cdFx0XHRcdG5hbWU6IHQoXCJNb3ZlIGFsbCBjb21wbGV0ZWQgc3VidGFza3MgdG8gYW5vdGhlciBmaWxlXCIpLFxyXG5cdFx0XHRcdGVkaXRvckNoZWNrQ2FsbGJhY2s6IChjaGVja2luZywgZWRpdG9yLCBjdHgpID0+IHtcclxuXHRcdFx0XHRcdHJldHVybiBtb3ZlQ29tcGxldGVkVGFza3NDb21tYW5kKFxyXG5cdFx0XHRcdFx0XHRjaGVja2luZyxcclxuXHRcdFx0XHRcdFx0ZWRpdG9yLFxyXG5cdFx0XHRcdFx0XHRjdHgsXHJcblx0XHRcdFx0XHRcdHRoaXMsXHJcblx0XHRcdFx0XHRcdFwiYWxsQ29tcGxldGVkXCIsXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQ29tbWFuZCBmb3IgbW92aW5nIGRpcmVjdCBjb21wbGV0ZWQgY2hpbGRyZW5cclxuXHRcdFx0dGhpcy5hZGRDb21tYW5kKHtcclxuXHRcdFx0XHRpZDogXCJtb3ZlLWRpcmVjdC1jb21wbGV0ZWQtc3VidGFza3MtdG8tZmlsZVwiLFxyXG5cdFx0XHRcdG5hbWU6IHQoXCJNb3ZlIGRpcmVjdCBjb21wbGV0ZWQgc3VidGFza3MgdG8gYW5vdGhlciBmaWxlXCIpLFxyXG5cdFx0XHRcdGVkaXRvckNoZWNrQ2FsbGJhY2s6IChjaGVja2luZywgZWRpdG9yLCBjdHgpID0+IHtcclxuXHRcdFx0XHRcdHJldHVybiBtb3ZlQ29tcGxldGVkVGFza3NDb21tYW5kKFxyXG5cdFx0XHRcdFx0XHRjaGVja2luZyxcclxuXHRcdFx0XHRcdFx0ZWRpdG9yLFxyXG5cdFx0XHRcdFx0XHRjdHgsXHJcblx0XHRcdFx0XHRcdHRoaXMsXHJcblx0XHRcdFx0XHRcdFwiZGlyZWN0Q2hpbGRyZW5cIixcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBDb21tYW5kIGZvciBtb3ZpbmcgYWxsIHN1YnRhc2tzIChjb21wbGV0ZWQgYW5kIHVuY29tcGxldGVkKVxyXG5cdFx0XHR0aGlzLmFkZENvbW1hbmQoe1xyXG5cdFx0XHRcdGlkOiBcIm1vdmUtYWxsLXN1YnRhc2tzLXRvLWZpbGVcIixcclxuXHRcdFx0XHRuYW1lOiB0KFwiTW92ZSBhbGwgc3VidGFza3MgdG8gYW5vdGhlciBmaWxlXCIpLFxyXG5cdFx0XHRcdGVkaXRvckNoZWNrQ2FsbGJhY2s6IChjaGVja2luZywgZWRpdG9yLCBjdHgpID0+IHtcclxuXHRcdFx0XHRcdHJldHVybiBtb3ZlQ29tcGxldGVkVGFza3NDb21tYW5kKFxyXG5cdFx0XHRcdFx0XHRjaGVja2luZyxcclxuXHRcdFx0XHRcdFx0ZWRpdG9yLFxyXG5cdFx0XHRcdFx0XHRjdHgsXHJcblx0XHRcdFx0XHRcdHRoaXMsXHJcblx0XHRcdFx0XHRcdFwiYWxsXCIsXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQXV0by1tb3ZlIGNvbW1hbmRzICh1c2luZyBkZWZhdWx0IHNldHRpbmdzKVxyXG5cdFx0XHRpZiAodGhpcy5zZXR0aW5ncy5jb21wbGV0ZWRUYXNrTW92ZXIuZW5hYmxlQXV0b01vdmUpIHtcclxuXHRcdFx0XHR0aGlzLmFkZENvbW1hbmQoe1xyXG5cdFx0XHRcdFx0aWQ6IFwiYXV0by1tb3ZlLWNvbXBsZXRlZC1zdWJ0YXNrc1wiLFxyXG5cdFx0XHRcdFx0bmFtZTogdChcIkF1dG8tbW92ZSBjb21wbGV0ZWQgc3VidGFza3MgdG8gZGVmYXVsdCBmaWxlXCIpLFxyXG5cdFx0XHRcdFx0ZWRpdG9yQ2hlY2tDYWxsYmFjazogKGNoZWNraW5nLCBlZGl0b3IsIGN0eCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gYXV0b01vdmVDb21wbGV0ZWRUYXNrc0NvbW1hbmQoXHJcblx0XHRcdFx0XHRcdFx0Y2hlY2tpbmcsXHJcblx0XHRcdFx0XHRcdFx0ZWRpdG9yLFxyXG5cdFx0XHRcdFx0XHRcdGN0eCxcclxuXHRcdFx0XHRcdFx0XHR0aGlzLFxyXG5cdFx0XHRcdFx0XHRcdFwiYWxsQ29tcGxldGVkXCIsXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHR0aGlzLmFkZENvbW1hbmQoe1xyXG5cdFx0XHRcdFx0aWQ6IFwiYXV0by1tb3ZlLWRpcmVjdC1jb21wbGV0ZWQtc3VidGFza3NcIixcclxuXHRcdFx0XHRcdG5hbWU6IHQoXHJcblx0XHRcdFx0XHRcdFwiQXV0by1tb3ZlIGRpcmVjdCBjb21wbGV0ZWQgc3VidGFza3MgdG8gZGVmYXVsdCBmaWxlXCIsXHJcblx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0ZWRpdG9yQ2hlY2tDYWxsYmFjazogKGNoZWNraW5nLCBlZGl0b3IsIGN0eCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gYXV0b01vdmVDb21wbGV0ZWRUYXNrc0NvbW1hbmQoXHJcblx0XHRcdFx0XHRcdFx0Y2hlY2tpbmcsXHJcblx0XHRcdFx0XHRcdFx0ZWRpdG9yLFxyXG5cdFx0XHRcdFx0XHRcdGN0eCxcclxuXHRcdFx0XHRcdFx0XHR0aGlzLFxyXG5cdFx0XHRcdFx0XHRcdFwiZGlyZWN0Q2hpbGRyZW5cIixcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdHRoaXMuYWRkQ29tbWFuZCh7XHJcblx0XHRcdFx0XHRpZDogXCJhdXRvLW1vdmUtYWxsLXN1YnRhc2tzXCIsXHJcblx0XHRcdFx0XHRuYW1lOiB0KFwiQXV0by1tb3ZlIGFsbCBzdWJ0YXNrcyB0byBkZWZhdWx0IGZpbGVcIiksXHJcblx0XHRcdFx0XHRlZGl0b3JDaGVja0NhbGxiYWNrOiAoY2hlY2tpbmcsIGVkaXRvciwgY3R4KSA9PiB7XHJcblx0XHRcdFx0XHRcdHJldHVybiBhdXRvTW92ZUNvbXBsZXRlZFRhc2tzQ29tbWFuZChcclxuXHRcdFx0XHRcdFx0XHRjaGVja2luZyxcclxuXHRcdFx0XHRcdFx0XHRlZGl0b3IsXHJcblx0XHRcdFx0XHRcdFx0Y3R4LFxyXG5cdFx0XHRcdFx0XHRcdHRoaXMsXHJcblx0XHRcdFx0XHRcdFx0XCJhbGxcIixcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGQgY29tbWFuZHMgZm9yIG1vdmluZyBpbmNvbXBsZXRlIHRhc2tzXHJcblx0XHRpZiAodGhpcy5zZXR0aW5ncy5jb21wbGV0ZWRUYXNrTW92ZXIuZW5hYmxlSW5jb21wbGV0ZWRUYXNrTW92ZXIpIHtcclxuXHRcdFx0Ly8gQ29tbWFuZCBmb3IgbW92aW5nIGFsbCBpbmNvbXBsZXRlIHN1YnRhc2tzIGFuZCB0aGVpciBjaGlsZHJlblxyXG5cdFx0XHR0aGlzLmFkZENvbW1hbmQoe1xyXG5cdFx0XHRcdGlkOiBcIm1vdmUtaW5jb21wbGV0ZWQtc3VidGFza3MtdG8tZmlsZVwiLFxyXG5cdFx0XHRcdG5hbWU6IHQoXCJNb3ZlIGFsbCBpbmNvbXBsZXRlIHN1YnRhc2tzIHRvIGFub3RoZXIgZmlsZVwiKSxcclxuXHRcdFx0XHRlZGl0b3JDaGVja0NhbGxiYWNrOiAoY2hlY2tpbmcsIGVkaXRvciwgY3R4KSA9PiB7XHJcblx0XHRcdFx0XHRyZXR1cm4gbW92ZUluY29tcGxldGVkVGFza3NDb21tYW5kKFxyXG5cdFx0XHRcdFx0XHRjaGVja2luZyxcclxuXHRcdFx0XHRcdFx0ZWRpdG9yLFxyXG5cdFx0XHRcdFx0XHRjdHgsXHJcblx0XHRcdFx0XHRcdHRoaXMsXHJcblx0XHRcdFx0XHRcdFwiYWxsSW5jb21wbGV0ZWRcIixcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBDb21tYW5kIGZvciBtb3ZpbmcgZGlyZWN0IGluY29tcGxldGUgY2hpbGRyZW5cclxuXHRcdFx0dGhpcy5hZGRDb21tYW5kKHtcclxuXHRcdFx0XHRpZDogXCJtb3ZlLWRpcmVjdC1pbmNvbXBsZXRlZC1zdWJ0YXNrcy10by1maWxlXCIsXHJcblx0XHRcdFx0bmFtZTogdChcIk1vdmUgZGlyZWN0IGluY29tcGxldGUgc3VidGFza3MgdG8gYW5vdGhlciBmaWxlXCIpLFxyXG5cdFx0XHRcdGVkaXRvckNoZWNrQ2FsbGJhY2s6IChjaGVja2luZywgZWRpdG9yLCBjdHgpID0+IHtcclxuXHRcdFx0XHRcdHJldHVybiBtb3ZlSW5jb21wbGV0ZWRUYXNrc0NvbW1hbmQoXHJcblx0XHRcdFx0XHRcdGNoZWNraW5nLFxyXG5cdFx0XHRcdFx0XHRlZGl0b3IsXHJcblx0XHRcdFx0XHRcdGN0eCxcclxuXHRcdFx0XHRcdFx0dGhpcyxcclxuXHRcdFx0XHRcdFx0XCJkaXJlY3RJbmNvbXBsZXRlZENoaWxkcmVuXCIsXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQXV0by1tb3ZlIGNvbW1hbmRzIGZvciBpbmNvbXBsZXRlIHRhc2tzICh1c2luZyBkZWZhdWx0IHNldHRpbmdzKVxyXG5cdFx0XHRpZiAodGhpcy5zZXR0aW5ncy5jb21wbGV0ZWRUYXNrTW92ZXIuZW5hYmxlSW5jb21wbGV0ZWRBdXRvTW92ZSkge1xyXG5cdFx0XHRcdHRoaXMuYWRkQ29tbWFuZCh7XHJcblx0XHRcdFx0XHRpZDogXCJhdXRvLW1vdmUtaW5jb21wbGV0ZS1zdWJ0YXNrc1wiLFxyXG5cdFx0XHRcdFx0bmFtZTogdChcIkF1dG8tbW92ZSBpbmNvbXBsZXRlIHN1YnRhc2tzIHRvIGRlZmF1bHQgZmlsZVwiKSxcclxuXHRcdFx0XHRcdGVkaXRvckNoZWNrQ2FsbGJhY2s6IChjaGVja2luZywgZWRpdG9yLCBjdHgpID0+IHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIGF1dG9Nb3ZlQ29tcGxldGVkVGFza3NDb21tYW5kKFxyXG5cdFx0XHRcdFx0XHRcdGNoZWNraW5nLFxyXG5cdFx0XHRcdFx0XHRcdGVkaXRvcixcclxuXHRcdFx0XHRcdFx0XHRjdHgsXHJcblx0XHRcdFx0XHRcdFx0dGhpcyxcclxuXHRcdFx0XHRcdFx0XHRcImFsbEluY29tcGxldGVkXCIsXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHR0aGlzLmFkZENvbW1hbmQoe1xyXG5cdFx0XHRcdFx0aWQ6IFwiYXV0by1tb3ZlLWRpcmVjdC1pbmNvbXBsZXRlLXN1YnRhc2tzXCIsXHJcblx0XHRcdFx0XHRuYW1lOiB0KFxyXG5cdFx0XHRcdFx0XHRcIkF1dG8tbW92ZSBkaXJlY3QgaW5jb21wbGV0ZSBzdWJ0YXNrcyB0byBkZWZhdWx0IGZpbGVcIixcclxuXHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHRlZGl0b3JDaGVja0NhbGxiYWNrOiAoY2hlY2tpbmcsIGVkaXRvciwgY3R4KSA9PiB7XHJcblx0XHRcdFx0XHRcdHJldHVybiBhdXRvTW92ZUNvbXBsZXRlZFRhc2tzQ29tbWFuZChcclxuXHRcdFx0XHRcdFx0XHRjaGVja2luZyxcclxuXHRcdFx0XHRcdFx0XHRlZGl0b3IsXHJcblx0XHRcdFx0XHRcdFx0Y3R4LFxyXG5cdFx0XHRcdFx0XHRcdHRoaXMsXHJcblx0XHRcdFx0XHRcdFx0XCJkaXJlY3RJbmNvbXBsZXRlZENoaWxkcmVuXCIsXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWRkIGNvbW1hbmQgZm9yIHRvZ2dsaW5nIHF1aWNrIGNhcHR1cmUgcGFuZWwgaW4gZWRpdG9yXHJcblx0XHR0aGlzLmFkZENvbW1hbmQoe1xyXG5cdFx0XHRpZDogXCJ0b2dnbGUtcXVpY2stY2FwdHVyZVwiLFxyXG5cdFx0XHRuYW1lOiB0KFwiVG9nZ2xlIHF1aWNrIGNhcHR1cmUgcGFuZWwgaW4gZWRpdG9yXCIpLFxyXG5cdFx0XHRlZGl0b3JDYWxsYmFjazogKGVkaXRvcikgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IGVkaXRvclZpZXcgPSBlZGl0b3IuY20gYXMgRWRpdG9yVmlldztcclxuXHJcblx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdC8vIENoZWNrIGlmIHRoZSBzdGF0ZSBmaWVsZCBleGlzdHNcclxuXHRcdFx0XHRcdGNvbnN0IHN0YXRlRmllbGQgPVxyXG5cdFx0XHRcdFx0XHRlZGl0b3JWaWV3LnN0YXRlLmZpZWxkKHF1aWNrQ2FwdHVyZVN0YXRlKTtcclxuXHJcblx0XHRcdFx0XHQvLyBUb2dnbGUgdGhlIHF1aWNrIGNhcHR1cmUgcGFuZWxcclxuXHRcdFx0XHRcdGVkaXRvclZpZXcuZGlzcGF0Y2goe1xyXG5cdFx0XHRcdFx0XHRlZmZlY3RzOiB0b2dnbGVRdWlja0NhcHR1cmUub2YoIXN0YXRlRmllbGQpLFxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdFx0Ly8gRmllbGQgZG9lc24ndCBleGlzdCwgY3JlYXRlIGl0IHdpdGggdmFsdWUgdHJ1ZSAodG8gc2hvdyBwYW5lbClcclxuXHRcdFx0XHRcdGVkaXRvclZpZXcuZGlzcGF0Y2goe1xyXG5cdFx0XHRcdFx0XHRlZmZlY3RzOiB0b2dnbGVRdWlja0NhcHR1cmUub2YodHJ1ZSksXHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLmFkZENvbW1hbmQoe1xyXG5cdFx0XHRpZDogXCJ0b2dnbGUtcXVpY2stY2FwdHVyZS1nbG9iYWxseVwiLFxyXG5cdFx0XHRuYW1lOiB0KFwiVG9nZ2xlIHF1aWNrIGNhcHR1cmUgcGFuZWwgaW4gZWRpdG9yIChHbG9iYWxseSlcIiksXHJcblx0XHRcdGNhbGxiYWNrOiAoKSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgYWN0aXZlTGVhZiA9XHJcblx0XHRcdFx0XHR0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlVmlld09mVHlwZShNYXJrZG93blZpZXcpO1xyXG5cclxuXHRcdFx0XHRpZiAoYWN0aXZlTGVhZiAmJiBhY3RpdmVMZWFmLmVkaXRvcikge1xyXG5cdFx0XHRcdFx0Ly8gSWYgd2UncmUgaW4gYSBtYXJrZG93biBlZGl0b3IsIHVzZSB0aGUgZWRpdG9yIGNvbW1hbmRcclxuXHRcdFx0XHRcdGNvbnN0IGVkaXRvclZpZXcgPSBhY3RpdmVMZWFmLmVkaXRvci5jbSBhcyBFZGl0b3JWaWV3O1xyXG5cclxuXHRcdFx0XHRcdC8vIEltcG9ydCBuZWNlc3NhcnkgZnVuY3Rpb25zIGR5bmFtaWNhbGx5IHRvIGF2b2lkIGNpcmN1bGFyIGRlcGVuZGVuY2llc1xyXG5cclxuXHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdC8vIFNob3cgdGhlIHF1aWNrIGNhcHR1cmUgcGFuZWxcclxuXHRcdFx0XHRcdFx0ZWRpdG9yVmlldy5kaXNwYXRjaCh7XHJcblx0XHRcdFx0XHRcdFx0ZWZmZWN0czogdG9nZ2xlUXVpY2tDYXB0dXJlLm9mKHRydWUpLFxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRcdFx0Ly8gTm8gcXVpY2sgY2FwdHVyZSBzdGF0ZSBmb3VuZCwgdHJ5IHRvIGFkZCB0aGUgZXh0ZW5zaW9uIGZpcnN0XHJcblx0XHRcdFx0XHRcdC8vIFRoaXMgaXMgYSBzaW1wbGlmaWVkIGFwcHJvYWNoIGFuZCBtaWdodCBub3Qgd29yayBpbiBhbGwgY2FzZXNcclxuXHRcdFx0XHRcdFx0dGhpcy5yZWdpc3RlckVkaXRvckV4dGVuc2lvbihbXHJcblx0XHRcdFx0XHRcdFx0cXVpY2tDYXB0dXJlRXh0ZW5zaW9uKHRoaXMuYXBwLCB0aGlzKSxcclxuXHRcdFx0XHRcdFx0XSk7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBUcnkgYWdhaW4gYWZ0ZXIgcmVnaXN0ZXJpbmcgdGhlIGV4dGVuc2lvblxyXG5cdFx0XHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0XHRcdFx0ZWRpdG9yVmlldy5kaXNwYXRjaCh7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGVmZmVjdHM6IHRvZ2dsZVF1aWNrQ2FwdHVyZS5vZih0cnVlKSxcclxuXHRcdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRcdFx0XHRcdG5ldyBOb3RpY2UoXHJcblx0XHRcdFx0XHRcdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XCJDb3VsZCBub3Qgb3BlbiBxdWljayBjYXB0dXJlIHBhbmVsIGluIHRoZSBjdXJyZW50IGVkaXRvclwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH0sIDEwMCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gV29ya2Zsb3cgY29tbWFuZHNcclxuXHRcdGlmICh0aGlzLnNldHRpbmdzLndvcmtmbG93LmVuYWJsZVdvcmtmbG93KSB7XHJcblx0XHRcdHRoaXMuYWRkQ29tbWFuZCh7XHJcblx0XHRcdFx0aWQ6IFwiY3JlYXRlLXF1aWNrLXdvcmtmbG93XCIsXHJcblx0XHRcdFx0bmFtZTogdChcIkNyZWF0ZSBxdWljayB3b3JrZmxvd1wiKSxcclxuXHRcdFx0XHRlZGl0b3JDaGVja0NhbGxiYWNrOiAoY2hlY2tpbmcsIGVkaXRvciwgY3R4KSA9PiB7XHJcblx0XHRcdFx0XHRyZXR1cm4gY3JlYXRlUXVpY2tXb3JrZmxvd0NvbW1hbmQoXHJcblx0XHRcdFx0XHRcdGNoZWNraW5nLFxyXG5cdFx0XHRcdFx0XHRlZGl0b3IsXHJcblx0XHRcdFx0XHRcdGN0eCxcclxuXHRcdFx0XHRcdFx0dGhpcyxcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHR0aGlzLmFkZENvbW1hbmQoe1xyXG5cdFx0XHRcdGlkOiBcImNvbnZlcnQtdGFzay10by13b3JrZmxvd1wiLFxyXG5cdFx0XHRcdG5hbWU6IHQoXCJDb252ZXJ0IHRhc2sgdG8gd29ya2Zsb3cgdGVtcGxhdGVcIiksXHJcblx0XHRcdFx0ZWRpdG9yQ2hlY2tDYWxsYmFjazogKGNoZWNraW5nLCBlZGl0b3IsIGN0eCkgPT4ge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGNvbnZlcnRUYXNrVG9Xb3JrZmxvd0NvbW1hbmQoXHJcblx0XHRcdFx0XHRcdGNoZWNraW5nLFxyXG5cdFx0XHRcdFx0XHRlZGl0b3IsXHJcblx0XHRcdFx0XHRcdGN0eCxcclxuXHRcdFx0XHRcdFx0dGhpcyxcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHR0aGlzLmFkZENvbW1hbmQoe1xyXG5cdFx0XHRcdGlkOiBcInN0YXJ0LXdvcmtmbG93LWhlcmVcIixcclxuXHRcdFx0XHRuYW1lOiB0KFwiU3RhcnQgd29ya2Zsb3cgaGVyZVwiKSxcclxuXHRcdFx0XHRlZGl0b3JDaGVja0NhbGxiYWNrOiAoY2hlY2tpbmcsIGVkaXRvciwgY3R4KSA9PiB7XHJcblx0XHRcdFx0XHRyZXR1cm4gc3RhcnRXb3JrZmxvd0hlcmVDb21tYW5kKFxyXG5cdFx0XHRcdFx0XHRjaGVja2luZyxcclxuXHRcdFx0XHRcdFx0ZWRpdG9yLFxyXG5cdFx0XHRcdFx0XHRjdHgsXHJcblx0XHRcdFx0XHRcdHRoaXMsXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0dGhpcy5hZGRDb21tYW5kKHtcclxuXHRcdFx0XHRpZDogXCJjb252ZXJ0LXRvLXdvcmtmbG93LXJvb3RcIixcclxuXHRcdFx0XHRuYW1lOiB0KFwiQ29udmVydCBjdXJyZW50IHRhc2sgdG8gd29ya2Zsb3cgcm9vdFwiKSxcclxuXHRcdFx0XHRlZGl0b3JDaGVja0NhbGxiYWNrOiAoY2hlY2tpbmcsIGVkaXRvciwgY3R4KSA9PiB7XHJcblx0XHRcdFx0XHRyZXR1cm4gY29udmVydFRvV29ya2Zsb3dSb290Q29tbWFuZChcclxuXHRcdFx0XHRcdFx0Y2hlY2tpbmcsXHJcblx0XHRcdFx0XHRcdGVkaXRvcixcclxuXHRcdFx0XHRcdFx0Y3R4LFxyXG5cdFx0XHRcdFx0XHR0aGlzLFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHRoaXMuYWRkQ29tbWFuZCh7XHJcblx0XHRcdFx0aWQ6IFwiZHVwbGljYXRlLXdvcmtmbG93XCIsXHJcblx0XHRcdFx0bmFtZTogdChcIkR1cGxpY2F0ZSB3b3JrZmxvd1wiKSxcclxuXHRcdFx0XHRlZGl0b3JDaGVja0NhbGxiYWNrOiAoY2hlY2tpbmcsIGVkaXRvciwgY3R4KSA9PiB7XHJcblx0XHRcdFx0XHRyZXR1cm4gZHVwbGljYXRlV29ya2Zsb3dDb21tYW5kKFxyXG5cdFx0XHRcdFx0XHRjaGVja2luZyxcclxuXHRcdFx0XHRcdFx0ZWRpdG9yLFxyXG5cdFx0XHRcdFx0XHRjdHgsXHJcblx0XHRcdFx0XHRcdHRoaXMsXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0dGhpcy5hZGRDb21tYW5kKHtcclxuXHRcdFx0XHRpZDogXCJ3b3JrZmxvdy1xdWljay1hY3Rpb25zXCIsXHJcblx0XHRcdFx0bmFtZTogdChcIldvcmtmbG93IHF1aWNrIGFjdGlvbnNcIiksXHJcblx0XHRcdFx0ZWRpdG9yQ2hlY2tDYWxsYmFjazogKGNoZWNraW5nLCBlZGl0b3IsIGN0eCkgPT4ge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHNob3dXb3JrZmxvd1F1aWNrQWN0aW9uc0NvbW1hbmQoXHJcblx0XHRcdFx0XHRcdGNoZWNraW5nLFxyXG5cdFx0XHRcdFx0XHRlZGl0b3IsXHJcblx0XHRcdFx0XHRcdGN0eCxcclxuXHRcdFx0XHRcdFx0dGhpcyxcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVGFzayB0aW1lciBleHBvcnQvaW1wb3J0IGNvbW1hbmRzXHJcblx0XHRpZiAodGhpcy5zZXR0aW5ncy50YXNrVGltZXI/LmVuYWJsZWQgJiYgdGhpcy50YXNrVGltZXJFeHBvcnRlcikge1xyXG5cdFx0XHR0aGlzLmFkZENvbW1hbmQoe1xyXG5cdFx0XHRcdGlkOiBcImV4cG9ydC10YXNrLXRpbWVyLWRhdGFcIixcclxuXHRcdFx0XHRuYW1lOiBcIkV4cG9ydCB0YXNrIHRpbWVyIGRhdGFcIixcclxuXHRcdFx0XHRjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdFx0Y29uc3Qgc3RhdHMgPSB0aGlzLnRhc2tUaW1lckV4cG9ydGVyLmdldEV4cG9ydFN0YXRzKCk7XHJcblx0XHRcdFx0XHRcdGlmIChzdGF0cy5hY3RpdmVUaW1lcnMgPT09IDApIHtcclxuXHRcdFx0XHRcdFx0XHRuZXcgTm90aWNlKFwiTm8gdGltZXIgZGF0YSB0byBleHBvcnRcIik7XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRjb25zdCBqc29uRGF0YSA9XHJcblx0XHRcdFx0XHRcdFx0dGhpcy50YXNrVGltZXJFeHBvcnRlci5leHBvcnRUb0pTT04odHJ1ZSk7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBDcmVhdGUgYSBibG9iIGFuZCBkb3dubG9hZCBsaW5rXHJcblx0XHRcdFx0XHRcdGNvbnN0IGJsb2IgPSBuZXcgQmxvYihbanNvbkRhdGFdLCB7XHJcblx0XHRcdFx0XHRcdFx0dHlwZTogXCJhcHBsaWNhdGlvbi9qc29uXCIsXHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRjb25zdCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xyXG5cdFx0XHRcdFx0XHRjb25zdCBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImFcIik7XHJcblx0XHRcdFx0XHRcdGEuaHJlZiA9IHVybDtcclxuXHRcdFx0XHRcdFx0YS5kb3dubG9hZCA9IGB0YXNrLXRpbWVyLWRhdGEtJHtcclxuXHRcdFx0XHRcdFx0XHRuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc3BsaXQoXCJUXCIpWzBdXHJcblx0XHRcdFx0XHRcdH0uanNvbmA7XHJcblx0XHRcdFx0XHRcdGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYSk7XHJcblx0XHRcdFx0XHRcdGEuY2xpY2soKTtcclxuXHRcdFx0XHRcdFx0ZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChhKTtcclxuXHRcdFx0XHRcdFx0VVJMLnJldm9rZU9iamVjdFVSTCh1cmwpO1xyXG5cclxuXHRcdFx0XHRcdFx0bmV3IE5vdGljZShcclxuXHRcdFx0XHRcdFx0XHRgRXhwb3J0ZWQgJHtzdGF0cy5hY3RpdmVUaW1lcnN9IHRpbWVyIHJlY29yZHNgLFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIGV4cG9ydGluZyB0aW1lciBkYXRhOlwiLCBlcnJvcik7XHJcblx0XHRcdFx0XHRcdG5ldyBOb3RpY2UoXCJGYWlsZWQgdG8gZXhwb3J0IHRpbWVyIGRhdGFcIik7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHR0aGlzLmFkZENvbW1hbmQoe1xyXG5cdFx0XHRcdGlkOiBcImltcG9ydC10YXNrLXRpbWVyLWRhdGFcIixcclxuXHRcdFx0XHRuYW1lOiBcIkltcG9ydCB0YXNrIHRpbWVyIGRhdGFcIixcclxuXHRcdFx0XHRjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdFx0Ly8gQ3JlYXRlIGZpbGUgaW5wdXQgZm9yIEpTT04gaW1wb3J0XHJcblx0XHRcdFx0XHRcdGNvbnN0IGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlucHV0XCIpO1xyXG5cdFx0XHRcdFx0XHRpbnB1dC50eXBlID0gXCJmaWxlXCI7XHJcblx0XHRcdFx0XHRcdGlucHV0LmFjY2VwdCA9IFwiLmpzb25cIjtcclxuXHJcblx0XHRcdFx0XHRcdGlucHV0Lm9uY2hhbmdlID0gYXN5bmMgKGUpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBmaWxlID0gKGUudGFyZ2V0IGFzIEhUTUxJbnB1dEVsZW1lbnQpXHJcblx0XHRcdFx0XHRcdFx0XHQuZmlsZXM/LlswXTtcclxuXHRcdFx0XHRcdFx0XHRpZiAoIWZpbGUpIHJldHVybjtcclxuXHJcblx0XHRcdFx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IHRleHQgPSBhd2FpdCBmaWxlLnRleHQoKTtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IHN1Y2Nlc3MgPVxyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnRhc2tUaW1lckV4cG9ydGVyLmltcG9ydEZyb21KU09OKHRleHQpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdGlmIChzdWNjZXNzKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdG5ldyBOb3RpY2UoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XCJUaW1lciBkYXRhIGltcG9ydGVkIHN1Y2Nlc3NmdWxseVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0bmV3IE5vdGljZShcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcIkZhaWxlZCB0byBpbXBvcnQgdGltZXIgZGF0YSAtIGludmFsaWQgZm9ybWF0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFwiRXJyb3IgaW1wb3J0aW5nIHRpbWVyIGRhdGE6XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdGVycm9yLFxyXG5cdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdG5ldyBOb3RpY2UoXCJGYWlsZWQgdG8gaW1wb3J0IHRpbWVyIGRhdGFcIik7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRcdFx0aW5wdXQuY2xpY2soKTtcclxuXHRcdFx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFcnJvciBzZXR0aW5nIHVwIGltcG9ydDpcIiwgZXJyb3IpO1xyXG5cdFx0XHRcdFx0XHRuZXcgTm90aWNlKFwiRmFpbGVkIHRvIHNldCB1cCBpbXBvcnRcIik7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHR0aGlzLmFkZENvbW1hbmQoe1xyXG5cdFx0XHRcdGlkOiBcImV4cG9ydC10YXNrLXRpbWVyLXlhbWxcIixcclxuXHRcdFx0XHRuYW1lOiBcIkV4cG9ydCB0YXNrIHRpbWVyIGRhdGEgKFlBTUwpXCIsXHJcblx0XHRcdFx0Y2FsbGJhY2s6IGFzeW5jICgpID0+IHtcclxuXHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IHN0YXRzID0gdGhpcy50YXNrVGltZXJFeHBvcnRlci5nZXRFeHBvcnRTdGF0cygpO1xyXG5cdFx0XHRcdFx0XHRpZiAoc3RhdHMuYWN0aXZlVGltZXJzID09PSAwKSB7XHJcblx0XHRcdFx0XHRcdFx0bmV3IE5vdGljZShcIk5vIHRpbWVyIGRhdGEgdG8gZXhwb3J0XCIpO1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0Y29uc3QgeWFtbERhdGEgPVxyXG5cdFx0XHRcdFx0XHRcdHRoaXMudGFza1RpbWVyRXhwb3J0ZXIuZXhwb3J0VG9ZQU1MKHRydWUpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gQ3JlYXRlIGEgYmxvYiBhbmQgZG93bmxvYWQgbGlua1xyXG5cdFx0XHRcdFx0XHRjb25zdCBibG9iID0gbmV3IEJsb2IoW3lhbWxEYXRhXSwge1xyXG5cdFx0XHRcdFx0XHRcdHR5cGU6IFwidGV4dC95YW1sXCIsXHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRjb25zdCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xyXG5cdFx0XHRcdFx0XHRjb25zdCBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImFcIik7XHJcblx0XHRcdFx0XHRcdGEuaHJlZiA9IHVybDtcclxuXHRcdFx0XHRcdFx0YS5kb3dubG9hZCA9IGB0YXNrLXRpbWVyLWRhdGEtJHtcclxuXHRcdFx0XHRcdFx0XHRuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc3BsaXQoXCJUXCIpWzBdXHJcblx0XHRcdFx0XHRcdH0ueWFtbGA7XHJcblx0XHRcdFx0XHRcdGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYSk7XHJcblx0XHRcdFx0XHRcdGEuY2xpY2soKTtcclxuXHRcdFx0XHRcdFx0ZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChhKTtcclxuXHRcdFx0XHRcdFx0VVJMLnJldm9rZU9iamVjdFVSTCh1cmwpO1xyXG5cclxuXHRcdFx0XHRcdFx0bmV3IE5vdGljZShcclxuXHRcdFx0XHRcdFx0XHRgRXhwb3J0ZWQgJHtzdGF0cy5hY3RpdmVUaW1lcnN9IHRpbWVyIHJlY29yZHMgdG8gWUFNTGAsXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmVycm9yKFxyXG5cdFx0XHRcdFx0XHRcdFwiRXJyb3IgZXhwb3J0aW5nIHRpbWVyIGRhdGEgdG8gWUFNTDpcIixcclxuXHRcdFx0XHRcdFx0XHRlcnJvcixcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0bmV3IE5vdGljZShcIkZhaWxlZCB0byBleHBvcnQgdGltZXIgZGF0YSB0byBZQU1MXCIpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0dGhpcy5hZGRDb21tYW5kKHtcclxuXHRcdFx0XHRpZDogXCJiYWNrdXAtdGFzay10aW1lci1kYXRhXCIsXHJcblx0XHRcdFx0bmFtZTogXCJDcmVhdGUgdGFzayB0aW1lciBiYWNrdXBcIixcclxuXHRcdFx0XHRjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgYmFja3VwRGF0YSA9XHJcblx0XHRcdFx0XHRcdFx0dGhpcy50YXNrVGltZXJFeHBvcnRlci5jcmVhdGVCYWNrdXAoKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIENyZWF0ZSBhIGJsb2IgYW5kIGRvd25sb2FkIGxpbmtcclxuXHRcdFx0XHRcdFx0Y29uc3QgYmxvYiA9IG5ldyBCbG9iKFtiYWNrdXBEYXRhXSwge1xyXG5cdFx0XHRcdFx0XHRcdHR5cGU6IFwiYXBwbGljYXRpb24vanNvblwiLFxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0Y29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcclxuXHRcdFx0XHRcdFx0Y29uc3QgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO1xyXG5cdFx0XHRcdFx0XHRhLmhyZWYgPSB1cmw7XHJcblx0XHRcdFx0XHRcdGEuZG93bmxvYWQgPSBgdGFzay10aW1lci1iYWNrdXAtJHtuZXcgRGF0ZSgpXHJcblx0XHRcdFx0XHRcdFx0LnRvSVNPU3RyaW5nKClcclxuXHRcdFx0XHRcdFx0XHQucmVwbGFjZSgvWzouXS9nLCBcIi1cIil9Lmpzb25gO1xyXG5cdFx0XHRcdFx0XHRkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGEpO1xyXG5cdFx0XHRcdFx0XHRhLmNsaWNrKCk7XHJcblx0XHRcdFx0XHRcdGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoYSk7XHJcblx0XHRcdFx0XHRcdFVSTC5yZXZva2VPYmplY3RVUkwodXJsKTtcclxuXHJcblx0XHRcdFx0XHRcdG5ldyBOb3RpY2UoXCJUYXNrIHRpbWVyIGJhY2t1cCBjcmVhdGVkXCIpO1xyXG5cdFx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIGNyZWF0aW5nIHRpbWVyIGJhY2t1cDpcIiwgZXJyb3IpO1xyXG5cdFx0XHRcdFx0XHRuZXcgTm90aWNlKFwiRmFpbGVkIHRvIGNyZWF0ZSB0aW1lciBiYWNrdXBcIik7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHR0aGlzLmFkZENvbW1hbmQoe1xyXG5cdFx0XHRcdGlkOiBcInNob3ctdGFzay10aW1lci1zdGF0c1wiLFxyXG5cdFx0XHRcdG5hbWU6IFwiU2hvdyB0YXNrIHRpbWVyIHN0YXRpc3RpY3NcIixcclxuXHRcdFx0XHRjYWxsYmFjazogKCkgPT4ge1xyXG5cdFx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdFx0Y29uc3Qgc3RhdHMgPSB0aGlzLnRhc2tUaW1lckV4cG9ydGVyLmdldEV4cG9ydFN0YXRzKCk7XHJcblxyXG5cdFx0XHRcdFx0XHRsZXQgbWVzc2FnZSA9IGBUYXNrIFRpbWVyIFN0YXRpc3RpY3M6XFxuYDtcclxuXHRcdFx0XHRcdFx0bWVzc2FnZSArPSBgQWN0aXZlIHRpbWVyczogJHtzdGF0cy5hY3RpdmVUaW1lcnN9XFxuYDtcclxuXHRcdFx0XHRcdFx0bWVzc2FnZSArPSBgVG90YWwgZHVyYXRpb246ICR7TWF0aC5yb3VuZChcclxuXHRcdFx0XHRcdFx0XHRzdGF0cy50b3RhbER1cmF0aW9uIC8gNjAwMDAsXHJcblx0XHRcdFx0XHRcdCl9IG1pbnV0ZXNcXG5gO1xyXG5cclxuXHRcdFx0XHRcdFx0aWYgKHN0YXRzLm9sZGVzdFRpbWVyKSB7XHJcblx0XHRcdFx0XHRcdFx0bWVzc2FnZSArPSBgT2xkZXN0IHRpbWVyOiAke3N0YXRzLm9sZGVzdFRpbWVyfVxcbmA7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0aWYgKHN0YXRzLm5ld2VzdFRpbWVyKSB7XHJcblx0XHRcdFx0XHRcdFx0bWVzc2FnZSArPSBgTmV3ZXN0IHRpbWVyOiAke3N0YXRzLm5ld2VzdFRpbWVyfWA7XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdG5ldyBOb3RpY2UobWVzc2FnZSwgMTAwMDApO1xyXG5cdFx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIGdldHRpbmcgdGltZXIgc3RhdHM6XCIsIGVycm9yKTtcclxuXHRcdFx0XHRcdFx0bmV3IE5vdGljZShcIkZhaWxlZCB0byBnZXQgdGltZXIgc3RhdGlzdGljc1wiKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJlZ2lzdGVyRWRpdG9yRXh0KCkge1xyXG5cdFx0dGhpcy5yZWdpc3RlckVkaXRvckV4dGVuc2lvbihbXHJcblx0XHRcdHRhc2tQcm9ncmVzc0JhckV4dGVuc2lvbih0aGlzLmFwcCwgdGhpcyksXHJcblx0XHRdKTtcclxuXHJcblx0XHQvLyBBZGQgdGFzayB0aW1lciBleHRlbnNpb25cclxuXHRcdGlmICh0aGlzLnNldHRpbmdzLnRhc2tUaW1lcj8uZW5hYmxlZCkge1xyXG5cdFx0XHQvLyBJbml0aWFsaXplIHRhc2sgdGltZXIgbWFuYWdlciBhbmQgZXhwb3J0ZXJcclxuXHRcdFx0aWYgKCF0aGlzLnRhc2tUaW1lck1hbmFnZXIpIHtcclxuXHRcdFx0XHR0aGlzLnRhc2tUaW1lck1hbmFnZXIgPSBuZXcgVGFza1RpbWVyTWFuYWdlcihcclxuXHRcdFx0XHRcdHRoaXMuc2V0dGluZ3MudGFza1RpbWVyLFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKCF0aGlzLnRhc2tUaW1lckV4cG9ydGVyKSB7XHJcblx0XHRcdFx0dGhpcy50YXNrVGltZXJFeHBvcnRlciA9IG5ldyBUYXNrVGltZXJFeHBvcnRlcihcclxuXHRcdFx0XHRcdHRoaXMudGFza1RpbWVyTWFuYWdlcixcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRWRpdG9yRXh0ZW5zaW9uKFt0YXNrVGltZXJFeHRlbnNpb24odGhpcyldKTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnNldHRpbmdzLnRhc2tHdXR0ZXIuZW5hYmxlVGFza0d1dHRlciAmJlxyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRWRpdG9yRXh0ZW5zaW9uKFt0YXNrR3V0dGVyRXh0ZW5zaW9uKHRoaXMuYXBwLCB0aGlzKV0pO1xyXG5cdFx0dGhpcy5zZXR0aW5ncy5lbmFibGVUYXNrU3RhdHVzU3dpdGNoZXIgJiZcclxuXHRcdFx0dGhpcy5zZXR0aW5ncy5lbmFibGVDdXN0b21UYXNrTWFya3MgJiZcclxuXHRcdFx0dGhpcy5yZWdpc3RlckVkaXRvckV4dGVuc2lvbihbXHJcblx0XHRcdFx0dGFza1N0YXR1c1N3aXRjaGVyRXh0ZW5zaW9uKHRoaXMuYXBwLCB0aGlzKSxcclxuXHRcdFx0XSk7XHJcblxyXG5cdFx0Ly8gQWRkIHByaW9yaXR5IHBpY2tlciBleHRlbnNpb25cclxuXHRcdGlmICh0aGlzLnNldHRpbmdzLmVuYWJsZVByaW9yaXR5UGlja2VyKSB7XHJcblx0XHRcdHRoaXMucmVnaXN0ZXJFZGl0b3JFeHRlbnNpb24oW1xyXG5cdFx0XHRcdHByaW9yaXR5UGlja2VyRXh0ZW5zaW9uKHRoaXMuYXBwLCB0aGlzKSxcclxuXHRcdFx0XSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWRkIGRhdGUgcGlja2VyIGV4dGVuc2lvblxyXG5cdFx0aWYgKHRoaXMuc2V0dGluZ3MuZW5hYmxlRGF0ZVBpY2tlcikge1xyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRWRpdG9yRXh0ZW5zaW9uKFtkYXRlUGlja2VyRXh0ZW5zaW9uKHRoaXMuYXBwLCB0aGlzKV0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFkZCB3b3JrZmxvdyBleHRlbnNpb25cclxuXHRcdGlmICh0aGlzLnNldHRpbmdzLndvcmtmbG93LmVuYWJsZVdvcmtmbG93KSB7XHJcblx0XHRcdHRoaXMucmVnaXN0ZXJFZGl0b3JFeHRlbnNpb24oW3dvcmtmbG93RXh0ZW5zaW9uKHRoaXMuYXBwLCB0aGlzKV0pO1xyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRWRpdG9yRXh0ZW5zaW9uKFtcclxuXHRcdFx0XHR3b3JrZmxvd0RlY29yYXRvckV4dGVuc2lvbih0aGlzLmFwcCwgdGhpcyksXHJcblx0XHRcdF0pO1xyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRWRpdG9yRXh0ZW5zaW9uKFtcclxuXHRcdFx0XHR3b3JrZmxvd1Jvb3RFbnRlckhhbmRsZXJFeHRlbnNpb24odGhpcy5hcHAsIHRoaXMpLFxyXG5cdFx0XHRdKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGQgcXVpY2sgY2FwdHVyZSBleHRlbnNpb25cclxuXHRcdGlmICh0aGlzLnNldHRpbmdzLnF1aWNrQ2FwdHVyZS5lbmFibGVRdWlja0NhcHR1cmUpIHtcclxuXHRcdFx0dGhpcy5yZWdpc3RlckVkaXRvckV4dGVuc2lvbihbXHJcblx0XHRcdFx0cXVpY2tDYXB0dXJlRXh0ZW5zaW9uKHRoaXMuYXBwLCB0aGlzKSxcclxuXHRcdFx0XSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBtaW5pbWFsIHF1aWNrIGNhcHR1cmUgc3VnZ2VzdFxyXG5cdFx0aWYgKHRoaXMuc2V0dGluZ3MucXVpY2tDYXB0dXJlLmVuYWJsZU1pbmltYWxNb2RlKSB7XHJcblx0XHRcdHRoaXMubWluaW1hbFF1aWNrQ2FwdHVyZVN1Z2dlc3QgPSBuZXcgTWluaW1hbFF1aWNrQ2FwdHVyZVN1Z2dlc3QoXHJcblx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0dGhpcyxcclxuXHRcdFx0KTtcclxuXHRcdFx0dGhpcy5yZWdpc3RlckVkaXRvclN1Z2dlc3QodGhpcy5taW5pbWFsUXVpY2tDYXB0dXJlU3VnZ2VzdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWRkIHRhc2sgZmlsdGVyIGV4dGVuc2lvblxyXG5cdFx0aWYgKHRoaXMuc2V0dGluZ3MudGFza0ZpbHRlci5lbmFibGVUYXNrRmlsdGVyKSB7XHJcblx0XHRcdHRoaXMucmVnaXN0ZXJFZGl0b3JFeHRlbnNpb24oW3Rhc2tGaWx0ZXJFeHRlbnNpb24odGhpcyldKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGQgYXV0byBkYXRlIG1hbmFnZXIgZXh0ZW5zaW9uXHJcblx0XHRpZiAodGhpcy5zZXR0aW5ncy5hdXRvRGF0ZU1hbmFnZXIuZW5hYmxlZCkge1xyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRWRpdG9yRXh0ZW5zaW9uKFtcclxuXHRcdFx0XHRhdXRvRGF0ZU1hbmFnZXJFeHRlbnNpb24odGhpcy5hcHAsIHRoaXMpLFxyXG5cdFx0XHRdKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGQgdGFzayBtYXJrIGNsZWFudXAgZXh0ZW5zaW9uIChhbHdheXMgZW5hYmxlZClcclxuXHRcdHRoaXMucmVnaXN0ZXJFZGl0b3JFeHRlbnNpb24oW3Rhc2tNYXJrQ2xlYW51cEV4dGVuc2lvbigpXSk7XHJcblx0fVxyXG5cclxuXHRvbnVubG9hZCgpIHtcclxuXHRcdC8vIENsZWFuIHVwIGdsb2JhbCBzdWdnZXN0IG1hbmFnZXJcclxuXHRcdGlmICh0aGlzLmdsb2JhbFN1Z2dlc3RNYW5hZ2VyKSB7XHJcblx0XHRcdHRoaXMuZ2xvYmFsU3VnZ2VzdE1hbmFnZXIuY2xlYW51cCgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEJhc2VzIHZpZXdzIGFyZSBhdXRvbWF0aWNhbGx5IHVucmVnaXN0ZXJlZCBieSBPYnNpZGlhbiB3aGVuIHBsdWdpbiB1bmxvYWRzXHJcblxyXG5cdFx0Ly8gQ2xlYW4gdXAgZGF0YWZsb3cgb3JjaGVzdHJhdG9yIChleHBlcmltZW50YWwpXHJcblx0XHRpZiAodGhpcy5kYXRhZmxvd09yY2hlc3RyYXRvcikge1xyXG5cdFx0XHR0aGlzLmRhdGFmbG93T3JjaGVzdHJhdG9yLmNsZWFudXAoKS5jYXRjaCgoZXJyb3IpID0+IHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFxyXG5cdFx0XHRcdFx0XCJFcnJvciBjbGVhbmluZyB1cCBkYXRhZmxvdyBvcmNoZXN0cmF0b3I6XCIsXHJcblx0XHRcdFx0XHRlcnJvcixcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0Ly8gU2V0IHRvIHVuZGVmaW5lZCB0byBwcmV2ZW50IGFueSBmdXJ0aGVyIGFjY2Vzc1xyXG5cdFx0XHR0aGlzLmRhdGFmbG93T3JjaGVzdHJhdG9yID0gdW5kZWZpbmVkO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENsZWFuIHVwIE1DUCBzZXJ2ZXIgbWFuYWdlciAoZGVza3RvcCBvbmx5KVxyXG5cdFx0aWYgKHRoaXMubWNwU2VydmVyTWFuYWdlcikge1xyXG5cdFx0XHR0aGlzLm1jcFNlcnZlck1hbmFnZXIuY2xlYW51cCgpO1xyXG5cdFx0fVxyXG5cdFx0Ly8gVGFzayBHZW5pdXMgSWNvbiBNYW5hZ2VyIGNsZWFudXAgaXMgaGFuZGxlZCBhdXRvbWF0aWNhbGx5IGJ5IENvbXBvbmVudCBzeXN0ZW1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGFuZCBzaG93IG9uYm9hcmRpbmcgZm9yIGZpcnN0LXRpbWUgdXNlcnMgb3IgdXNlcnMgd2hvIHJlcXVlc3QgaXRcclxuXHQgKi9cclxuXHRwcml2YXRlIGFzeW5jIGNoZWNrQW5kU2hvd09uYm9hcmRpbmcoKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBDaGVjayBpZiB0aGlzIGlzIHRoZSBmaXJzdCBpbnN0YWxsIGFuZCBvbmJvYXJkaW5nIGhhc24ndCBiZWVuIGNvbXBsZXRlZFxyXG5cdFx0XHRjb25zdCB2ZXJzaW9uUmVzdWx0ID1cclxuXHRcdFx0XHRhd2FpdCB0aGlzLnZlcnNpb25NYW5hZ2VyLmNoZWNrVmVyc2lvbkNoYW5nZSgpO1xyXG5cdFx0XHRjb25zdCBpc0ZpcnN0SW5zdGFsbCA9IHZlcnNpb25SZXN1bHQudmVyc2lvbkluZm8uaXNGaXJzdEluc3RhbGw7XHJcblx0XHRcdGNvbnN0IHNob3VsZFNob3dPbmJvYXJkaW5nID1cclxuXHRcdFx0XHR0aGlzLm9uYm9hcmRpbmdDb25maWdNYW5hZ2VyLnNob3VsZFNob3dPbmJvYXJkaW5nKCk7XHJcblxyXG5cdFx0XHQvLyBGb3IgZXhpc3RpbmcgdXNlcnMgd2l0aCBjaGFuZ2VzLCBsZXQgdGhlIHZpZXcgaGFuZGxlIHRoZSBhc3luYyBkZXRlY3Rpb25cclxuXHRcdFx0Ly8gRm9yIG5ldyB1c2Vycywgc2hvdyBvbmJvYXJkaW5nIGRpcmVjdGx5XHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHQoaXNGaXJzdEluc3RhbGwgJiYgc2hvdWxkU2hvd09uYm9hcmRpbmcpIHx8XHJcblx0XHRcdFx0KCFpc0ZpcnN0SW5zdGFsbCAmJlxyXG5cdFx0XHRcdFx0c2hvdWxkU2hvd09uYm9hcmRpbmcgJiZcclxuXHRcdFx0XHRcdHRoaXMuc2V0dGluZ3NDaGFuZ2VEZXRlY3Rvci5oYXNVc2VyTWFkZUNoYW5nZXMoKSlcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0Ly8gU21hbGwgZGVsYXkgdG8gZW5zdXJlIFVJIGlzIHJlYWR5XHJcblx0XHRcdFx0dGhpcy5vcGVuT25ib2FyZGluZ1ZpZXcoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBjaGVjayBvbmJvYXJkaW5nIHN0YXR1czpcIiwgZXJyb3IpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogT3BlbiB0aGUgb25ib2FyZGluZyB2aWV3IGluIGEgbmV3IGxlYWZcclxuXHQgKi9cclxuXHRhc3luYyBvcGVuT25ib2FyZGluZ1ZpZXcoKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRjb25zdCB7IHdvcmtzcGFjZSB9ID0gdGhpcy5hcHA7XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgb25ib2FyZGluZyB2aWV3IGlzIGFscmVhZHkgb3BlblxyXG5cdFx0Y29uc3QgZXhpc3RpbmdMZWFmID0gd29ya3NwYWNlLmdldExlYXZlc09mVHlwZShPTkJPQVJESU5HX1ZJRVdfVFlQRSlbMF07XHJcblxyXG5cdFx0aWYgKGV4aXN0aW5nTGVhZikge1xyXG5cdFx0XHR3b3Jrc3BhY2UucmV2ZWFsTGVhZihleGlzdGluZ0xlYWYpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGEgbmV3IGxlYWYgaW4gdGhlIG1haW4gYXJlYSBhbmQgb3BlbiB0aGUgb25ib2FyZGluZyB2aWV3XHJcblx0XHRjb25zdCBsZWFmID0gd29ya3NwYWNlLmdldExlYWYoXCJ0YWJcIik7XHJcblx0XHRhd2FpdCBsZWFmLnNldFZpZXdTdGF0ZSh7IHR5cGU6IE9OQk9BUkRJTkdfVklFV19UWVBFIH0pO1xyXG5cdFx0d29ya3NwYWNlLnJldmVhbExlYWYobGVhZik7XHJcblx0fVxyXG5cclxuXHRhc3luYyBjbG9zZUFsbFZpZXdzRnJvbVRhc2tHZW5pdXMoKSB7XHJcblx0XHRjb25zdCB7IHdvcmtzcGFjZSB9ID0gdGhpcy5hcHA7XHJcblx0XHRjb25zdCB2MUxlYXZlcyA9IHdvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoVEFTS19WSUVXX1RZUEUpO1xyXG5cdFx0djFMZWF2ZXMuZm9yRWFjaCgobGVhZikgPT4gbGVhZi5kZXRhY2goKSk7XHJcblx0XHRjb25zdCB2MkxlYXZlcyA9IHdvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoRkxVRU5UX1RBU0tfVklFVyk7XHJcblx0XHR2MkxlYXZlcy5mb3JFYWNoKChsZWFmKSA9PiBsZWFmLmRldGFjaCgpKTtcclxuXHRcdGNvbnN0IHNwZWNpZmljTGVhdmVzID0gd29ya3NwYWNlLmdldExlYXZlc09mVHlwZShcclxuXHRcdFx0VEFTS19TUEVDSUZJQ19WSUVXX1RZUEUsXHJcblx0XHQpO1xyXG5cdFx0c3BlY2lmaWNMZWF2ZXMuZm9yRWFjaCgobGVhZikgPT4gbGVhZi5kZXRhY2goKSk7XHJcblx0XHRjb25zdCB0aW1lbGluZUxlYXZlcyA9IHdvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoXHJcblx0XHRcdFRJTUVMSU5FX1NJREVCQVJfVklFV19UWVBFLFxyXG5cdFx0KTtcclxuXHRcdHRpbWVsaW5lTGVhdmVzLmZvckVhY2goKGxlYWYpID0+IGxlYWYuZGV0YWNoKCkpO1xyXG5cdFx0Y29uc3QgY2hhbmdlbG9nTGVhdmVzID0gd29ya3NwYWNlLmdldExlYXZlc09mVHlwZShDSEFOR0VMT0dfVklFV19UWVBFKTtcclxuXHRcdGNoYW5nZWxvZ0xlYXZlcy5mb3JFYWNoKChsZWFmKSA9PiBsZWFmLmRldGFjaCgpKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgbWF5YmVTaG93Q2hhbmdlbG9nKCk6IHZvaWQge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0aWYgKCF0aGlzLmNoYW5nZWxvZ01hbmFnZXIpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IG1hbmlmZXN0VmVyc2lvbiA9IHRoaXMubWFuaWZlc3Q/LnZlcnNpb247XHJcblx0XHRcdGlmICghbWFuaWZlc3RWZXJzaW9uKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBjaGFuZ2Vsb2dTZXR0aW5ncyA9IHRoaXMuc2V0dGluZ3MuY2hhbmdlbG9nO1xyXG5cdFx0XHRpZiAoIWNoYW5nZWxvZ1NldHRpbmdzPy5lbmFibGVkKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBsYXN0VmVyc2lvbiA9IGNoYW5nZWxvZ1NldHRpbmdzLmxhc3RWZXJzaW9uIHx8IFwiXCI7XHJcblx0XHRcdGlmIChtYW5pZmVzdFZlcnNpb24gPT09IGxhc3RWZXJzaW9uKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBpc0JldGEgPSBtYW5pZmVzdFZlcnNpb24udG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhcImJldGFcIik7XHJcblx0XHRcdHZvaWQgdGhpcy5jaGFuZ2Vsb2dNYW5hZ2VyLm9wZW5DaGFuZ2Vsb2cobWFuaWZlc3RWZXJzaW9uLCBpc0JldGEpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIltUUEJdIEZhaWxlZCB0byBzaG93IGNoYW5nZWxvZzpcIiwgZXJyb3IpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0YXN5bmMgbG9hZFNldHRpbmdzKCkge1xyXG5cdFx0Y29uc3Qgc2F2ZWREYXRhID0gYXdhaXQgdGhpcy5sb2FkRGF0YSgpO1xyXG5cdFx0dGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfU0VUVElOR1MsIHNhdmVkRGF0YSk7XHJcblx0XHR0aGlzLnNldHRpbmdzLmNoYW5nZWxvZyA9IE9iamVjdC5hc3NpZ24oXHJcblx0XHRcdHtcclxuXHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdGxhc3RWZXJzaW9uOiBcIlwiLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR0aGlzLnNldHRpbmdzLmNoYW5nZWxvZyA/PyB7fSxcclxuXHRcdCk7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zb2xlLmRlYnVnKFxyXG5cdFx0XHRcdFwiW1BsdWdpbl1bbG9hZFNldHRpbmdzXSBmaWxlTWV0YWRhdGFJbmhlcml0YW5jZSAocmF3KTpcIixcclxuXHRcdFx0XHRzYXZlZERhdGE/LmZpbGVNZXRhZGF0YUluaGVyaXRhbmNlLFxyXG5cdFx0XHQpO1xyXG5cdFx0XHRjb25zb2xlLmRlYnVnKFxyXG5cdFx0XHRcdFwiW1BsdWdpbl1bbG9hZFNldHRpbmdzXSBmaWxlTWV0YWRhdGFJbmhlcml0YW5jZSAoZWZmZWN0aXZlKTpcIixcclxuXHRcdFx0XHR0aGlzLnNldHRpbmdzLmZpbGVNZXRhZGF0YUluaGVyaXRhbmNlLFxyXG5cdFx0XHQpO1xyXG5cdFx0fSBjYXRjaCB7fVxyXG5cclxuXHRcdC8vIE1pZ3JhdGUgb2xkIGluaGVyaXRhbmNlIHNldHRpbmdzIHRvIG5ldyBzdHJ1Y3R1cmVcclxuXHRcdHRoaXMubWlncmF0ZUluaGVyaXRhbmNlU2V0dGluZ3Moc2F2ZWREYXRhKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgbWlncmF0ZUluaGVyaXRhbmNlU2V0dGluZ3Moc2F2ZWREYXRhOiBhbnkpIHtcclxuXHRcdC8vIENoZWNrIGlmIG9sZCBpbmhlcml0YW5jZSBzZXR0aW5ncyBleGlzdCBhbmQgbmV3IG9uZXMgZG9uJ3RcclxuXHRcdGlmIChcclxuXHRcdFx0c2F2ZWREYXRhPy5wcm9qZWN0Q29uZmlnPy5tZXRhZGF0YUNvbmZpZyAmJlxyXG5cdFx0XHQhc2F2ZWREYXRhPy5maWxlTWV0YWRhdGFJbmhlcml0YW5jZVxyXG5cdFx0KSB7XHJcblx0XHRcdGNvbnN0IG9sZENvbmZpZyA9IHNhdmVkRGF0YS5wcm9qZWN0Q29uZmlnLm1ldGFkYXRhQ29uZmlnO1xyXG5cclxuXHRcdFx0Ly8gTWlncmF0ZSB0byBuZXcgc3RydWN0dXJlXHJcblx0XHRcdHRoaXMuc2V0dGluZ3MuZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2UgPSB7XHJcblx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRpbmhlcml0RnJvbUZyb250bWF0dGVyOlxyXG5cdFx0XHRcdFx0b2xkQ29uZmlnLmluaGVyaXRGcm9tRnJvbnRtYXR0ZXIgPz8gdHJ1ZSxcclxuXHRcdFx0XHRpbmhlcml0RnJvbUZyb250bWF0dGVyRm9yU3VidGFza3M6XHJcblx0XHRcdFx0XHRvbGRDb25maWcuaW5oZXJpdEZyb21Gcm9udG1hdHRlckZvclN1YnRhc2tzID8/IGZhbHNlLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gUmVtb3ZlIG9sZCBpbmhlcml0YW5jZSBzZXR0aW5ncyBmcm9tIHByb2plY3QgY29uZmlnXHJcblx0XHRcdGlmICh0aGlzLnNldHRpbmdzLnByb2plY3RDb25maWc/Lm1ldGFkYXRhQ29uZmlnKSB7XHJcblx0XHRcdFx0ZGVsZXRlICh0aGlzLnNldHRpbmdzLnByb2plY3RDb25maWcubWV0YWRhdGFDb25maWcgYXMgYW55KVxyXG5cdFx0XHRcdFx0LmluaGVyaXRGcm9tRnJvbnRtYXR0ZXI7XHJcblx0XHRcdFx0ZGVsZXRlICh0aGlzLnNldHRpbmdzLnByb2plY3RDb25maWcubWV0YWRhdGFDb25maWcgYXMgYW55KVxyXG5cdFx0XHRcdFx0LmluaGVyaXRGcm9tRnJvbnRtYXR0ZXJGb3JTdWJ0YXNrcztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gU2F2ZSB0aGUgbWlncmF0ZWQgc2V0dGluZ3NcclxuXHRcdFx0dGhpcy5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGFzeW5jIHNhdmVTZXR0aW5ncygpIHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnNvbGUuZGVidWcoXHJcblx0XHRcdFx0XCJbUGx1Z2luXVtzYXZlU2V0dGluZ3NdIGZpbGVNZXRhZGF0YUluaGVyaXRhbmNlOlwiLFxyXG5cdFx0XHRcdHRoaXMuc2V0dGluZ3M/LmZpbGVNZXRhZGF0YUluaGVyaXRhbmNlLFxyXG5cdFx0XHQpO1xyXG5cdFx0fSBjYXRjaCB7fVxyXG5cdFx0YXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLnNldHRpbmdzKTtcclxuXHR9XHJcblxyXG5cdGFzeW5jIGxvYWRWaWV3cygpIHtcclxuXHRcdGNvbnN0IGRlZmF1bHRWaWV3cyA9IERFRkFVTFRfU0VUVElOR1Mudmlld0NvbmZpZ3VyYXRpb247XHJcblxyXG5cdFx0Ly8gRW5zdXJlIGFsbCBkZWZhdWx0IHZpZXdzIGV4aXN0IGluIHVzZXIgc2V0dGluZ3NcclxuXHRcdGlmICghdGhpcy5zZXR0aW5ncy52aWV3Q29uZmlndXJhdGlvbikge1xyXG5cdFx0XHR0aGlzLnNldHRpbmdzLnZpZXdDb25maWd1cmF0aW9uID0gW107XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWRkIGFueSBtaXNzaW5nIGRlZmF1bHQgdmlld3MgdG8gdXNlciBzZXR0aW5nc1xyXG5cdFx0ZGVmYXVsdFZpZXdzLmZvckVhY2goKGRlZmF1bHRWaWV3KSA9PiB7XHJcblx0XHRcdGNvbnN0IGV4aXN0aW5nVmlldyA9IHRoaXMuc2V0dGluZ3Mudmlld0NvbmZpZ3VyYXRpb24uZmluZChcclxuXHRcdFx0XHQodikgPT4gdi5pZCA9PT0gZGVmYXVsdFZpZXcuaWQsXHJcblx0XHRcdCk7XHJcblx0XHRcdGlmICghZXhpc3RpbmdWaWV3KSB7XHJcblx0XHRcdFx0dGhpcy5zZXR0aW5ncy52aWV3Q29uZmlndXJhdGlvbi5wdXNoKHsgLi4uZGVmYXVsdFZpZXcgfSk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdGF3YWl0IHRoaXMuc2F2ZVNldHRpbmdzKCk7XHJcblx0fVxyXG5cclxuXHQvLyBIZWxwZXIgbWV0aG9kIHRvIHNldCBwcmlvcml0eSBhdCBjdXJzb3IgcG9zaXRpb25cclxuXHJcblx0cHJpdmF0ZSBpc0FjdGl2YXRpbmdWaWV3ID0gZmFsc2U7XHJcblxyXG5cdGFzeW5jIGFjdGl2YXRlVGFza1ZpZXcoKSB7XHJcblx0XHQvLyBQcmV2ZW50IG11bHRpcGxlIHNpbXVsdGFuZW91cyBhY3RpdmF0aW9uc1xyXG5cdFx0aWYgKHRoaXMuaXNBY3RpdmF0aW5nVmlldykge1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5pc0FjdGl2YXRpbmdWaWV3ID0gdHJ1ZTtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IHsgd29ya3NwYWNlIH0gPSB0aGlzLmFwcDtcclxuXHJcblx0XHRcdGNvbnN0IHZpZXdUeXBlID0gdGhpcy5zZXR0aW5ncy5mbHVlbnRWaWV3Py5lbmFibGVGbHVlbnRcclxuXHRcdFx0XHQ/IEZMVUVOVF9UQVNLX1ZJRVdcclxuXHRcdFx0XHQ6IFRBU0tfVklFV19UWVBFO1xyXG5cdFx0XHQvLyBDaGVjayBpZiB2aWV3IGlzIGFscmVhZHkgb3BlblxyXG5cdFx0XHRjb25zdCBleGlzdGluZ0xlYXZlcyA9IHdvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUodmlld1R5cGUpO1xyXG5cclxuXHRcdFx0aWYgKGV4aXN0aW5nTGVhdmVzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHQvLyBJZiB2aWV3IGlzIGFscmVhZHkgb3BlbiwganVzdCByZXZlYWwgdGhlIGZpcnN0IG9uZVxyXG5cdFx0XHRcdHdvcmtzcGFjZS5yZXZlYWxMZWFmKGV4aXN0aW5nTGVhdmVzWzBdKTtcclxuXHJcblx0XHRcdFx0Ly8gQ2xvc2UgYW55IGR1cGxpY2F0ZSB2aWV3c1xyXG5cdFx0XHRcdGZvciAobGV0IGkgPSAxOyBpIDwgZXhpc3RpbmdMZWF2ZXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRcdGV4aXN0aW5nTGVhdmVzW2ldLmRldGFjaCgpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIE90aGVyd2lzZSwgY3JlYXRlIGEgbmV3IGxlYWYgYW5kIG9wZW4gdGhlIHZpZXdcclxuXHRcdFx0Y29uc3QgbGVhZiA9IHdvcmtzcGFjZS5nZXRMZWFmKFwidGFiXCIpO1xyXG5cdFx0XHRhd2FpdCBsZWFmLnNldFZpZXdTdGF0ZSh7IHR5cGU6IHZpZXdUeXBlIH0pO1xyXG5cdFx0XHRhd2FpdCB3b3Jrc3BhY2UucmV2ZWFsTGVhZihsZWFmKTtcclxuXHRcdH0gZmluYWxseSB7XHJcblx0XHRcdHRoaXMuaXNBY3RpdmF0aW5nVmlldyA9IGZhbHNlO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBpc0FjdGl2YXRpbmdTaWRlYmFyID0gZmFsc2U7XHJcblxyXG5cdGFzeW5jIGFjdGl2YXRlVGltZWxpbmVTaWRlYmFyVmlldygpIHtcclxuXHRcdC8vIFByZXZlbnQgbXVsdGlwbGUgc2ltdWx0YW5lb3VzIGFjdGl2YXRpb25zXHJcblx0XHRpZiAodGhpcy5pc0FjdGl2YXRpbmdTaWRlYmFyKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmlzQWN0aXZhdGluZ1NpZGViYXIgPSB0cnVlO1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgeyB3b3Jrc3BhY2UgfSA9IHRoaXMuYXBwO1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgaWYgdmlldyBpcyBhbHJlYWR5IG9wZW5cclxuXHRcdFx0Y29uc3QgZXhpc3RpbmdMZWF2ZXMgPSB3b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKFxyXG5cdFx0XHRcdFRJTUVMSU5FX1NJREVCQVJfVklFV19UWVBFLFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0aWYgKGV4aXN0aW5nTGVhdmVzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHQvLyBJZiB2aWV3IGlzIGFscmVhZHkgb3BlbiwganVzdCByZXZlYWwgdGhlIGZpcnN0IG9uZVxyXG5cdFx0XHRcdHdvcmtzcGFjZS5yZXZlYWxMZWFmKGV4aXN0aW5nTGVhdmVzWzBdKTtcclxuXHJcblx0XHRcdFx0Ly8gQ2xvc2UgYW55IGR1cGxpY2F0ZSB2aWV3c1xyXG5cdFx0XHRcdGZvciAobGV0IGkgPSAxOyBpIDwgZXhpc3RpbmdMZWF2ZXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRcdGV4aXN0aW5nTGVhdmVzW2ldLmRldGFjaCgpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIE9wZW4gaW4gdGhlIHJpZ2h0IHNpZGViYXJcclxuXHRcdFx0Y29uc3QgbGVhZiA9IHdvcmtzcGFjZS5nZXRSaWdodExlYWYoZmFsc2UpO1xyXG5cdFx0XHRpZiAobGVhZikge1xyXG5cdFx0XHRcdGF3YWl0IGxlYWYuc2V0Vmlld1N0YXRlKHsgdHlwZTogVElNRUxJTkVfU0lERUJBUl9WSUVXX1RZUEUgfSk7XHJcblx0XHRcdFx0d29ya3NwYWNlLnJldmVhbExlYWYobGVhZik7XHJcblx0XHRcdH1cclxuXHRcdH0gZmluYWxseSB7XHJcblx0XHRcdHRoaXMuaXNBY3RpdmF0aW5nU2lkZWJhciA9IGZhbHNlO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0YXN5bmMgdHJpZ2dlclZpZXdVcGRhdGUoKSB7XHJcblx0XHQvLyBVcGRhdGUgVGFzayBWaWV3c1xyXG5cdFx0Y29uc3QgdGFza1ZpZXdMZWF2ZXMgPVxyXG5cdFx0XHR0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKFRBU0tfVklFV19UWVBFKTtcclxuXHRcdGlmICh0YXNrVmlld0xlYXZlcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdGZvciAoY29uc3QgbGVhZiBvZiB0YXNrVmlld0xlYXZlcykge1xyXG5cdFx0XHRcdGlmIChsZWFmLnZpZXcgaW5zdGFuY2VvZiBUYXNrVmlldykge1xyXG5cdFx0XHRcdFx0Ly8gQXZvaWQgb3ZlcndyaXRpbmcgZXhpc3RpbmcgdGFza3Mgd2l0aCBlbXB0eSBwcmVsb2FkZWRUYXNrcyBkdXJpbmcgc2V0dGluZ3MgdXBkYXRlc1xyXG5cdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRBcnJheS5pc0FycmF5KHRoaXMucHJlbG9hZGVkVGFza3MpICYmXHJcblx0XHRcdFx0XHRcdHRoaXMucHJlbG9hZGVkVGFza3MubGVuZ3RoID4gMFxyXG5cdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdGxlYWYudmlldy50YXNrcyA9IHRoaXMucHJlbG9hZGVkVGFza3M7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRsZWFmLnZpZXcudHJpZ2dlclZpZXdVcGRhdGUoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBVcGRhdGUgVGltZWxpbmUgU2lkZWJhciBWaWV3c1xyXG5cdFx0Y29uc3QgdGltZWxpbmVWaWV3TGVhdmVzID0gdGhpcy5hcHAud29ya3NwYWNlLmdldExlYXZlc09mVHlwZShcclxuXHRcdFx0VElNRUxJTkVfU0lERUJBUl9WSUVXX1RZUEUsXHJcblx0XHQpO1xyXG5cdFx0aWYgKHRpbWVsaW5lVmlld0xlYXZlcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdGZvciAoY29uc3QgbGVhZiBvZiB0aW1lbGluZVZpZXdMZWF2ZXMpIHtcclxuXHRcdFx0XHRpZiAobGVhZi52aWV3IGluc3RhbmNlb2YgVGltZWxpbmVTaWRlYmFyVmlldykge1xyXG5cdFx0XHRcdFx0YXdhaXQgbGVhZi52aWV3LnRyaWdnZXJWaWV3VXBkYXRlKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgdGhlIElDUyBtYW5hZ2VyIGluc3RhbmNlXHJcblx0ICovXHJcblx0Z2V0SWNzTWFuYWdlcigpOiBJY3NNYW5hZ2VyIHwgdW5kZWZpbmVkIHtcclxuXHRcdHJldHVybiB0aGlzLmljc01hbmFnZXI7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBJbml0aWFsaXplIGRhdGFmbG93IHdpdGggdmVyc2lvbiBjaGVja2luZyBhbmQgcmVidWlsZCBoYW5kbGluZ1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgaW5pdGlhbGl6ZURhdGFmbG93V2l0aFZlcnNpb25DaGVjaygpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGlmICghdGhpcy5kYXRhZmxvd09yY2hlc3RyYXRvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRGF0YWZsb3cgb3JjaGVzdHJhdG9yIG5vdCBhdmFpbGFibGVcIik7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBWYWxpZGF0ZSB2ZXJzaW9uIHN0b3JhZ2UgaW50ZWdyaXR5IGZpcnN0XHJcblx0XHRcdGNvbnN0IGRpYWdub3N0aWNJbmZvID1cclxuXHRcdFx0XHRhd2FpdCB0aGlzLnZlcnNpb25NYW5hZ2VyLmdldERpYWdub3N0aWNJbmZvKCk7XHJcblxyXG5cdFx0XHRpZiAoIWRpYWdub3N0aWNJbmZvLmNhbldyaXRlKSB7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFxyXG5cdFx0XHRcdFx0XCJDYW5ub3Qgd3JpdGUgdG8gdmVyc2lvbiBzdG9yYWdlIC0gc3RvcmFnZSBtYXkgYmUgY29ycnVwdGVkXCIsXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdCFkaWFnbm9zdGljSW5mby52ZXJzaW9uVmFsaWQgJiZcclxuXHRcdFx0XHRkaWFnbm9zdGljSW5mby5wcmV2aW91c1ZlcnNpb25cclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0XCJJbnZhbGlkIHZlcnNpb24gZGF0YSBkZXRlY3RlZCwgYXR0ZW1wdGluZyByZWNvdmVyeVwiLFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0YXdhaXQgdGhpcy52ZXJzaW9uTWFuYWdlci5yZWNvdmVyRnJvbUNvcnJ1cHRlZFZlcnNpb24oKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgZm9yIHZlcnNpb24gY2hhbmdlc1xyXG5cdFx0XHRjb25zdCB2ZXJzaW9uUmVzdWx0ID1cclxuXHRcdFx0XHRhd2FpdCB0aGlzLnZlcnNpb25NYW5hZ2VyLmNoZWNrVmVyc2lvbkNoYW5nZSgpO1xyXG5cclxuXHRcdFx0aWYgKHZlcnNpb25SZXN1bHQucmVxdWlyZXNSZWJ1aWxkKSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRgVGFzayBHZW5pdXMgKERhdGFmbG93KTogJHt2ZXJzaW9uUmVzdWx0LnJlYnVpbGRSZWFzb259YCxcclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHQvLyBHZXQgYWxsIHN1cHBvcnRlZCBmaWxlcyBmb3IgcHJvZ3Jlc3MgdHJhY2tpbmdcclxuXHRcdFx0XHRjb25zdCBhbGxGaWxlcyA9IHRoaXMuYXBwLnZhdWx0XHJcblx0XHRcdFx0XHQuZ2V0RmlsZXMoKVxyXG5cdFx0XHRcdFx0LmZpbHRlcihcclxuXHRcdFx0XHRcdFx0KGZpbGUpID0+XHJcblx0XHRcdFx0XHRcdFx0ZmlsZS5leHRlbnNpb24gPT09IFwibWRcIiB8fFxyXG5cdFx0XHRcdFx0XHRcdGZpbGUuZXh0ZW5zaW9uID09PSBcImNhbnZhc1wiLFxyXG5cdFx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0Ly8gU3RhcnQgcmVidWlsZCBwcm9ncmVzcyB0cmFja2luZ1xyXG5cdFx0XHRcdHRoaXMucmVidWlsZFByb2dyZXNzTWFuYWdlci5zdGFydFJlYnVpbGQoXHJcblx0XHRcdFx0XHRhbGxGaWxlcy5sZW5ndGgsXHJcblx0XHRcdFx0XHR2ZXJzaW9uUmVzdWx0LnJlYnVpbGRSZWFzb24sXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0Ly8gQWZ0ZXIgZGF0YWZsb3cgcmVidWlsZCwgcmVmcmVzaCBoYWJpdHMgdG8ga2VlcCBpbiBzeW5jXHJcblx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdGF3YWl0IHRoaXMuaGFiaXRNYW5hZ2VyPy5pbml0aWFsaXplSGFiaXRzKCk7XHJcblx0XHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdFx0Y29uc29sZS53YXJuKFwiRmFpbGVkIHRvIHJlZnJlc2ggaGFiaXRzIGFmdGVyIHJlYnVpbGRcIiwgZSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBUcmlnZ2VyIGRhdGFmbG93IHJlYnVpbGRcclxuXHRcdFx0XHRhd2FpdCB0aGlzLmRhdGFmbG93T3JjaGVzdHJhdG9yLnJlYnVpbGQoKTtcclxuXHJcblx0XHRcdFx0Ly8gR2V0IGZpbmFsIHRhc2sgY291bnQgZnJvbSBkYXRhZmxvd1xyXG5cdFx0XHRcdGNvbnN0IHF1ZXJ5QVBJID0gdGhpcy5kYXRhZmxvd09yY2hlc3RyYXRvci5nZXRRdWVyeUFQSSgpO1xyXG5cdFx0XHRcdGNvbnN0IGFsbFRhc2tzID0gYXdhaXQgcXVlcnlBUEkuZ2V0QWxsVGFza3MoKTtcclxuXHRcdFx0XHRjb25zdCBmaW5hbFRhc2tDb3VudCA9IGFsbFRhc2tzLmxlbmd0aDtcclxuXHJcblx0XHRcdFx0Ly8gTWFyayByZWJ1aWxkIGFzIGNvbXBsZXRlXHJcblx0XHRcdFx0dGhpcy5yZWJ1aWxkUHJvZ3Jlc3NNYW5hZ2VyLmNvbXBsZXRlUmVidWlsZChmaW5hbFRhc2tDb3VudCk7XHJcblxyXG5cdFx0XHRcdC8vIE1hcmsgdmVyc2lvbiBhcyBwcm9jZXNzZWRcclxuXHRcdFx0XHRhd2FpdCB0aGlzLnZlcnNpb25NYW5hZ2VyLm1hcmtWZXJzaW9uUHJvY2Vzc2VkKCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gTm8gcmVidWlsZCBuZWVkZWQsIGRhdGFmbG93IGFscmVhZHkgaW5pdGlhbGl6ZWQgZHVyaW5nIGNyZWF0aW9uXHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcIlRhc2sgR2VuaXVzIChEYXRhZmxvdyk6IE5vIHJlYnVpbGQgbmVlZGVkLCB1c2luZyBleGlzdGluZyBjYWNoZVwiLFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXHJcblx0XHRcdFx0XCJFcnJvciBkdXJpbmcgZGF0YWZsb3cgaW5pdGlhbGl6YXRpb24gd2l0aCB2ZXJzaW9uIGNoZWNrOlwiLFxyXG5cdFx0XHRcdGVycm9yLFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gVHJpZ2dlciBlbWVyZ2VuY3kgcmVidWlsZCBmb3IgZGF0YWZsb3dcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRjb25zdCBlbWVyZ2VuY3lSZXN1bHQgPVxyXG5cdFx0XHRcdFx0YXdhaXQgdGhpcy52ZXJzaW9uTWFuYWdlci5oYW5kbGVFbWVyZ2VuY3lSZWJ1aWxkKFxyXG5cdFx0XHRcdFx0XHRgRGF0YWZsb3cgaW5pdGlhbGl6YXRpb24gZmFpbGVkOiAke2Vycm9yLm1lc3NhZ2V9YCxcclxuXHRcdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdC8vIEdldCBhbGwgc3VwcG9ydGVkIGZpbGVzIGZvciBwcm9ncmVzcyB0cmFja2luZ1xyXG5cdFx0XHRcdGNvbnN0IGFsbEZpbGVzID0gdGhpcy5hcHAudmF1bHRcclxuXHRcdFx0XHRcdC5nZXRGaWxlcygpXHJcblx0XHRcdFx0XHQuZmlsdGVyKFxyXG5cdFx0XHRcdFx0XHQoZmlsZSkgPT5cclxuXHRcdFx0XHRcdFx0XHRmaWxlLmV4dGVuc2lvbiA9PT0gXCJtZFwiIHx8XHJcblx0XHRcdFx0XHRcdFx0ZmlsZS5leHRlbnNpb24gPT09IFwiY2FudmFzXCIsXHJcblx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHQvLyBTdGFydCBlbWVyZ2VuY3kgcmVidWlsZFxyXG5cdFx0XHRcdHRoaXMucmVidWlsZFByb2dyZXNzTWFuYWdlci5zdGFydFJlYnVpbGQoXHJcblx0XHRcdFx0XHRhbGxGaWxlcy5sZW5ndGgsXHJcblx0XHRcdFx0XHRlbWVyZ2VuY3lSZXN1bHQucmVidWlsZFJlYXNvbixcclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHQvLyBGb3JjZSByZWJ1aWxkIGRhdGFmbG93XHJcblx0XHRcdFx0YXdhaXQgdGhpcy5kYXRhZmxvd09yY2hlc3RyYXRvci5yZWJ1aWxkKCk7XHJcblxyXG5cdFx0XHRcdC8vIEdldCBmaW5hbCB0YXNrIGNvdW50XHJcblx0XHRcdFx0Y29uc3QgcXVlcnlBUEkgPSB0aGlzLmRhdGFmbG93T3JjaGVzdHJhdG9yLmdldFF1ZXJ5QVBJKCk7XHJcblx0XHRcdFx0Y29uc3QgYWxsVGFza3MgPSBhd2FpdCBxdWVyeUFQSS5nZXRBbGxUYXNrcygpO1xyXG5cdFx0XHRcdGNvbnN0IGZpbmFsVGFza0NvdW50ID0gYWxsVGFza3MubGVuZ3RoO1xyXG5cclxuXHRcdFx0XHQvLyBNYXJrIGVtZXJnZW5jeSByZWJ1aWxkIGFzIGNvbXBsZXRlXHJcblx0XHRcdFx0dGhpcy5yZWJ1aWxkUHJvZ3Jlc3NNYW5hZ2VyLmNvbXBsZXRlUmVidWlsZChmaW5hbFRhc2tDb3VudCk7XHJcblxyXG5cdFx0XHRcdC8vIFN0b3JlIGN1cnJlbnQgdmVyc2lvblxyXG5cdFx0XHRcdGF3YWl0IHRoaXMudmVyc2lvbk1hbmFnZXIubWFya1ZlcnNpb25Qcm9jZXNzZWQoKTtcclxuXHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRcIkVtZXJnZW5jeSBkYXRhZmxvdyByZWJ1aWxkIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHlcIixcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9IGNhdGNoIChlbWVyZ2VuY3lFcnJvcikge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXHJcblx0XHRcdFx0XHRcIkVtZXJnZW5jeSBkYXRhZmxvdyByZWJ1aWxkIGZhaWxlZDpcIixcclxuXHRcdFx0XHRcdGVtZXJnZW5jeUVycm9yLFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0dGhyb3cgZW1lcmdlbmN5RXJyb3I7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEluaXRpYWxpemUgdGFzayBtYW5hZ2VyIHdpdGggdmVyc2lvbiBjaGVja2luZyBhbmQgcmVidWlsZCBoYW5kbGluZ1xyXG5cdCAqIEBkZXByZWNhdGVkIFRoaXMgbWV0aG9kIGlzIG5vIGxvbmdlciB1c2VkIGFzIFRhc2tNYW5hZ2VyIGhhcyBiZWVuIHJlbW92ZWRcclxuXHQgKiBUaGlzIG1ldGhvZCBpcyBrZXB0IGZvciByZWZlcmVuY2Ugb25seSBhbmQgd2lsbCBiZSByZW1vdmVkIGluIGZ1dHVyZSB2ZXJzaW9uc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgaW5pdGlhbGl6ZVRhc2tNYW5hZ2VyV2l0aFZlcnNpb25DaGVjaygpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdC8vIFRoaXMgbWV0aG9kIGlzIGRlcHJlY2F0ZWQgYW5kIHNob3VsZCBub3QgYmUgY2FsbGVkXHJcblx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFwiaW5pdGlhbGl6ZVRhc2tNYW5hZ2VyV2l0aFZlcnNpb25DaGVjayBpcyBkZXByZWNhdGVkIGFuZCBzaG91bGQgbm90IGJlIHVzZWRcIixcclxuXHRcdCk7XHJcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XHJcblx0fVxyXG59XHJcbiJdfQ==