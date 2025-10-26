import { t } from "../translations/helper";
export var FilterMode;
(function (FilterMode) {
    FilterMode["WHITELIST"] = "whitelist";
    FilterMode["BLACKLIST"] = "blacklist";
})(FilterMode || (FilterMode = {}));
/** Define the default settings */
export const DEFAULT_SETTINGS = {
    changelog: {
        enabled: true,
        lastVersion: "",
    },
    // General Defaults
    progressBarDisplayMode: "both",
    supportHoverToShowProgressInfo: false,
    addProgressBarToNonTaskBullet: false,
    addTaskProgressBarToHeading: false,
    addProgressBarToProjectsView: false,
    enableProgressbarInReadingMode: false,
    // Desktop integration and notifications defaults
    notifications: {
        enabled: false,
        dailySummary: { enabled: true, time: "09:00" },
        perTask: { enabled: false, leadMinutes: 10 },
    },
    desktopIntegration: { enableTray: false },
    countSubLevel: false,
    displayMode: "bracketFraction",
    customFormat: "[{{COMPLETED}}/{{TOTAL}}]",
    showPercentage: false,
    customizeProgressRanges: false,
    progressRanges: [
        { min: 0, max: 20, text: t("Just started") + " {{PROGRESS}}%" },
        { min: 20, max: 40, text: t("Making progress") + " {{PROGRESS}}% " },
        { min: 40, max: 60, text: t("Half way") + " {{PROGRESS}}% " },
        { min: 60, max: 80, text: t("Good progress") + " {{PROGRESS}}% " },
        { min: 80, max: 100, text: t("Almost there") + " {{PROGRESS}}% " },
    ],
    allowCustomProgressGoal: false,
    hideProgressBarBasedOnConditions: false,
    hideProgressBarTags: "no-progress,hide-progress",
    hideProgressBarFolders: "",
    hideProgressBarMetadata: "hide-progress-bar",
    showProgressBarBasedOnHeading: "",
    // Project Tree View Settings Defaults
    projectViewDefaultMode: "list",
    projectTreeAutoExpand: false,
    projectTreeShowEmptyFolders: false,
    projectPathSeparator: "/",
    // Checkbox Status Defaults
    autoCompleteParent: false,
    markParentInProgressWhenPartiallyComplete: false,
    taskStatuses: {
        completed: "x|X",
        inProgress: ">|/",
        abandoned: "-",
        planned: "?",
        notStarted: " ",
    },
    countOtherStatusesAs: "notStarted",
    excludeTaskMarks: "",
    useOnlyCountMarks: false,
    onlyCountTaskMarks: "x|X|>|/",
    enableTaskStatusSwitcher: false,
    enableCustomTaskMarks: false,
    enableTextMarkInSourceMode: false,
    enableCycleCompleteStatus: false,
    taskStatusCycle: [
        "Not Started",
        "In Progress",
        "Completed",
        "Abandoned",
        "Planned",
    ],
    taskStatusMarks: {
        "Not Started": " ",
        "In Progress": "/",
        Completed: "x",
        Abandoned: "-",
        Planned: "?",
    },
    excludeMarksFromCycle: [],
    enableTaskGeniusIcons: false,
    // Priority & Date Defaults
    enablePriorityPicker: false,
    enablePriorityKeyboardShortcuts: false,
    enableDatePicker: false,
    recurrenceDateBase: "due",
    // Task Filter Defaults
    taskFilter: {
        enableTaskFilter: false,
        presetTaskFilters: [], // Start empty, maybe add defaults later or via a reset button
    },
    // Task Gutter Defaults
    taskGutter: {
        enableTaskGutter: false,
    },
    // Completed Task Mover Defaults
    completedTaskMover: {
        enableCompletedTaskMover: false,
        taskMarkerType: "date",
        versionMarker: "version 1.0",
        dateMarker: t("archived on") + " {{date}}",
        customMarker: t("moved") + " {{DATE:YYYY-MM-DD HH:mm}}",
        treatAbandonedAsCompleted: false,
        completeAllMovedTasks: true,
        withCurrentFileLink: true,
        // Auto-move defaults for completed tasks
        enableAutoMove: false,
        defaultTargetFile: "Archive.md",
        defaultInsertionMode: "end",
        defaultHeadingName: "Completed Tasks",
        // Incomplete Task Mover Defaults
        enableIncompletedTaskMover: true,
        incompletedTaskMarkerType: "date",
        incompletedVersionMarker: "version 1.0",
        incompletedDateMarker: t("moved on") + " {{date}}",
        incompletedCustomMarker: t("moved") + " {{DATE:YYYY-MM-DD HH:mm}}",
        withCurrentFileLinkForIncompleted: true,
        // Auto-move defaults for incomplete tasks
        enableIncompletedAutoMove: false,
        incompletedDefaultTargetFile: "Backlog.md",
        incompletedDefaultInsertionMode: "end",
        incompletedDefaultHeadingName: "Incomplete Tasks",
    },
    // Quick Capture Defaults
    quickCapture: {
        enableQuickCapture: false,
        targetFile: "QuickCapture.md",
        placeholder: t("Capture your thoughts..."),
        appendToFile: "append",
        targetType: "fixed",
        targetHeading: "",
        dailyNoteSettings: {
            format: "YYYY-MM-DD",
            folder: "",
            template: "",
        },
        enableMinimalMode: false,
        minimalModeSettings: {
            suggestTrigger: "/",
        },
        // New enhanced settings defaults
        keepOpenAfterCapture: false,
        rememberLastMode: true,
        lastUsedMode: "checkbox",
        defaultFileNameTemplate: "{{DATE:YYYY-MM-DD}} - ",
        defaultFileLocation: "",
        createFileMode: {
            defaultFolder: "",
            useTemplate: false,
            templateFolder: "",
            templateFile: "",
            writeContentTagsToFrontmatter: false,
        },
    },
    // Workflow Defaults
    workflow: {
        enableWorkflow: false,
        autoAddTimestamp: false,
        timestampFormat: "YYYY-MM-DD HH:mm:ss",
        removeTimestampOnTransition: false,
        calculateSpentTime: false,
        spentTimeFormat: "HH:mm:ss",
        calculateFullSpentTime: false,
        autoRemoveLastStageMarker: false,
        autoAddNextTask: false,
        definitions: [
            {
                id: "project_workflow",
                name: t("Project Workflow"),
                description: t("Standard project management workflow"),
                stages: [
                    {
                        id: "planning",
                        name: t("Planning"),
                        type: "linear",
                        next: "in_progress",
                    },
                    {
                        id: "in_progress",
                        name: t("In Progress"),
                        type: "cycle",
                        subStages: [
                            {
                                id: "development",
                                name: t("Development"),
                                next: "testing",
                            },
                            {
                                id: "testing",
                                name: t("Testing"),
                                next: "development",
                            },
                        ],
                        canProceedTo: ["review", "cancelled"],
                    },
                    {
                        id: "review",
                        name: t("Review"),
                        type: "cycle",
                        canProceedTo: ["in_progress", "completed"],
                    },
                    {
                        id: "completed",
                        name: t("Completed"),
                        type: "terminal",
                    },
                    {
                        id: "cancelled",
                        name: t("Cancelled"),
                        type: "terminal",
                    },
                ],
                metadata: {
                    version: "1.0",
                    created: "2024-03-20",
                    lastModified: "2024-03-20",
                },
            },
        ],
    },
    // Index Related Defaults
    useDailyNotePathAsDate: false,
    dailyNoteFormat: "yyyy-MM-dd",
    useAsDateType: "due",
    dailyNotePath: "",
    preferMetadataFormat: "tasks",
    // Task Parser Configuration
    projectTagPrefix: {
        tasks: "project",
        dataview: "project",
    },
    contextTagPrefix: {
        tasks: "@",
        dataview: "context",
    },
    areaTagPrefix: {
        tasks: "area",
        dataview: "area",
    },
    // File Metadata Inheritance Defaults
    fileMetadataInheritance: {
        enabled: true,
        inheritFromFrontmatter: true,
        inheritFromFrontmatterForSubtasks: false,
    },
    projectConfig: {
        enableEnhancedProject: false,
        pathMappings: [],
        metadataConfig: {
            metadataKey: "project",
            enabled: false,
            detectionMethods: [
                {
                    type: "metadata",
                    propertyKey: "project",
                    enabled: false,
                },
                {
                    type: "tag",
                    propertyKey: "project",
                    enabled: false,
                },
                {
                    type: "link",
                    propertyKey: "category",
                    linkFilter: "",
                    enabled: false,
                },
            ],
        },
        configFile: {
            fileName: "project.md",
            searchRecursively: false,
            enabled: false,
        },
        metadataMappings: [],
        defaultProjectNaming: {
            strategy: "filename",
            stripExtension: false,
            enabled: false,
        },
    },
    // File Parsing Configuration
    fileParsingConfig: {
        enableFileMetadataParsing: false,
        metadataFieldsToParseAsTasks: ["dueDate", "todo", "complete", "task"],
        enableTagBasedTaskParsing: false,
        tagsToParseAsTasks: ["#todo", "#task", "#action", "#due"],
        taskContentFromMetadata: "title",
        defaultTaskStatus: " ",
        enableWorkerProcessing: true,
        enableMtimeOptimization: true,
        mtimeCacheSize: 10000,
    },
    // Date Settings
    useRelativeTimeForDate: false,
    // Ignore all tasks behind heading
    ignoreHeading: "",
    // Focus all tasks behind heading
    focusHeading: "",
    // Indexer and View Defaults
    enableIndexer: true,
    enableView: true,
    enableInlineEditor: true,
    enableDynamicMetadataPositioning: true,
    defaultViewMode: "list",
    // Global Filter Defaults
    globalFilterRules: {},
    viewConfiguration: [
        {
            id: "inbox",
            name: t("Inbox"),
            icon: "inbox",
            type: "default",
            visible: true,
            hideCompletedAndAbandonedTasks: true,
            filterRules: {},
            filterBlanks: false,
        },
        {
            id: "forecast",
            name: t("Forecast"),
            icon: "calendar-days",
            type: "default",
            visible: true,
            hideCompletedAndAbandonedTasks: true,
            filterRules: {},
            filterBlanks: false,
            specificConfig: {
                viewType: "forecast",
                firstDayOfWeek: undefined,
                hideWeekends: false, // Show weekends by default
            },
        },
        {
            id: "projects",
            name: t("Projects"),
            icon: "folders",
            type: "default",
            visible: true,
            hideCompletedAndAbandonedTasks: false,
            filterRules: {},
            filterBlanks: false,
        },
        {
            id: "tags",
            name: t("Tags"),
            icon: "tag",
            type: "default",
            visible: true,
            hideCompletedAndAbandonedTasks: false,
            filterRules: {},
            filterBlanks: false,
        },
        {
            id: "flagged",
            name: t("Flagged"),
            icon: "flag",
            type: "default",
            visible: true,
            hideCompletedAndAbandonedTasks: true,
            filterRules: {},
            filterBlanks: false,
        },
        {
            id: "review",
            name: t("Review"),
            icon: "eye",
            type: "default",
            visible: true,
            hideCompletedAndAbandonedTasks: false,
            filterRules: {},
            filterBlanks: false,
        },
        {
            id: "calendar",
            name: t("Events"),
            icon: "calendar",
            type: "default",
            visible: true,
            hideCompletedAndAbandonedTasks: false,
            filterRules: {},
            filterBlanks: false,
            region: "bottom",
            specificConfig: {
                viewType: "calendar",
                firstDayOfWeek: undefined,
                hideWeekends: false, // Show weekends by default
            },
        },
        {
            id: "kanban",
            name: t("Status"),
            icon: "kanban",
            type: "default",
            visible: true,
            hideCompletedAndAbandonedTasks: false,
            filterRules: {},
            filterBlanks: false,
            region: "bottom",
            specificConfig: {
                viewType: "kanban",
                showCheckbox: true,
                hideEmptyColumns: false,
                defaultSortField: "priority",
                defaultSortOrder: "desc",
                groupBy: "status", // Default to status-based columns
            },
        },
        {
            id: "gantt",
            name: t("Plan"),
            icon: "chart-gantt",
            type: "default",
            visible: true,
            hideCompletedAndAbandonedTasks: false,
            filterRules: {},
            filterBlanks: false,
            region: "bottom",
            specificConfig: {
                viewType: "gantt",
                showTaskLabels: true,
                useMarkdownRenderer: true,
            },
        },
        {
            id: "habit",
            name: t("Habit"),
            icon: "calendar-clock",
            type: "default",
            visible: true,
            hideCompletedAndAbandonedTasks: false,
            filterRules: {},
            filterBlanks: false,
            region: "bottom", // 底部区域
        },
        {
            id: "table",
            name: t("Table"),
            icon: "table",
            type: "default",
            visible: true,
            hideCompletedAndAbandonedTasks: false,
            filterRules: {},
            filterBlanks: false,
            specificConfig: {
                viewType: "table",
                enableTreeView: true,
                enableLazyLoading: true,
                pageSize: 50,
                enableInlineEditing: true,
                visibleColumns: [
                    "status",
                    "content",
                    "priority",
                    "dueDate",
                    "startDate",
                    "scheduledDate",
                    "tags",
                    "project",
                    "context",
                    "filePath",
                ],
                columnWidths: {
                    status: 80,
                    content: 300,
                    priority: 100,
                    dueDate: 120,
                    startDate: 120,
                    scheduledDate: 120,
                    createdDate: 120,
                    completedDate: 120,
                    tags: 150,
                    project: 150,
                    context: 120,
                    recurrence: 120,
                    estimatedTime: 120,
                    actualTime: 120,
                    filePath: 200,
                },
                sortableColumns: true,
                resizableColumns: true,
                showRowNumbers: true,
                enableRowSelection: true,
                enableMultiSelect: true,
                defaultSortField: "",
                defaultSortOrder: "asc",
            },
        },
        {
            id: "quadrant",
            name: t("Matrix"),
            icon: "layout-grid",
            type: "default",
            visible: true,
            hideCompletedAndAbandonedTasks: false,
            filterRules: {},
            filterBlanks: false,
            specificConfig: {
                viewType: "quadrant",
                hideEmptyQuadrants: false,
                autoUpdatePriority: true,
                autoUpdateTags: true,
                showTaskCount: true,
                defaultSortField: "priority",
                defaultSortOrder: "desc",
                urgentTag: "#urgent",
                importantTag: "#important",
                urgentThresholdDays: 3,
                usePriorityForClassification: false,
                urgentPriorityThreshold: 4,
                importantPriorityThreshold: 3,
                customQuadrantColors: false,
                quadrantColors: {
                    urgentImportant: "#dc3545",
                    notUrgentImportant: "#28a745",
                    urgentNotImportant: "#ffc107",
                    notUrgentNotImportant: "#6c757d",
                },
            },
        },
    ],
    // Review Settings
    reviewSettings: {},
    // Reward Settings Defaults (NEW)
    rewards: {
        enableRewards: false,
        rewardItems: [
            {
                id: "reward-tea",
                name: t("Drink a cup of good tea"),
                occurrence: "common",
                inventory: -1,
            },
            {
                id: "reward-series-episode",
                name: t("Watch an episode of a favorite series"),
                occurrence: "rare",
                inventory: 20,
            },
            {
                id: "reward-champagne-project",
                name: t("Play a game"),
                occurrence: "legendary",
                inventory: 1,
                condition: "#project AND #milestone",
            },
            {
                id: "reward-chocolate-quick",
                name: t("Eat a piece of chocolate"),
                occurrence: "common",
                inventory: 10,
                condition: "#quickwin",
                imageUrl: "",
            }, // Add imageUrl example if needed
        ],
        occurrenceLevels: [
            { name: t("common"), chance: 70 },
            { name: t("rare"), chance: 25 },
            { name: t("legendary"), chance: 5 },
        ],
        showRewardType: "modal",
    },
    // Habit Settings
    habit: {
        enableHabits: false,
        habits: [],
    },
    // Filter Configuration Defaults
    filterConfig: {
        enableSavedFilters: true,
        savedConfigs: [],
    },
    // Sorting Defaults
    sortTasks: true,
    sortCriteria: [
        // Default sorting criteria
        { field: "completed", order: "asc" },
        { field: "status", order: "asc" },
        { field: "priority", order: "asc" },
        { field: "dueDate", order: "asc" },
    ],
    // Auto Date Manager Defaults
    autoDateManager: {
        enabled: false,
        manageCompletedDate: true,
        manageStartDate: true,
        manageCancelledDate: true,
        completedDateFormat: "YYYY-MM-DD",
        startDateFormat: "YYYY-MM-DD",
        cancelledDateFormat: "YYYY-MM-DD",
        completedDateMarker: "✅",
        startDateMarker: "🚀",
        cancelledDateMarker: "❌",
    },
    // Beta Test Defaults
    betaTest: {
        enableBaseView: false,
    },
    // ICS Calendar Integration Defaults
    icsIntegration: {
        sources: [],
        globalRefreshInterval: 60,
        maxCacheAge: 24,
        enableBackgroundRefresh: false,
        networkTimeout: 30,
        maxEventsPerSource: 1000,
        showInCalendar: false,
        showInTaskLists: false,
        defaultEventColor: "#3b82f6", // Blue color
    },
    // Timeline Sidebar Defaults
    timelineSidebar: {
        enableTimelineSidebar: false,
        autoOpenOnStartup: false,
        showCompletedTasks: true,
        focusModeByDefault: false,
        maxEventsToShow: 100,
        // Quick input collapse defaults
        quickInputCollapsed: false,
        quickInputDefaultHeight: 150,
        quickInputAnimationDuration: 300,
        quickInputCollapseOnCapture: false,
        quickInputShowQuickActions: true,
    },
    // File Filter Defaults
    fileFilter: {
        enabled: false,
        mode: FilterMode.BLACKLIST,
        rules: [
        // No default rules - let users explicitly choose via preset templates
        ],
        scopeControls: {
            inlineTasksEnabled: true,
            fileTasksEnabled: true,
        },
    },
    // OnCompletion Defaults
    onCompletion: {
        enableOnCompletion: true,
        defaultArchiveFile: "Archive/Completed Tasks.md",
        defaultArchiveSection: "Completed Tasks",
        showAdvancedOptions: false,
    },
    // Time Parsing Defaults
    timeParsing: {
        enabled: true,
        supportedLanguages: ["en", "zh"],
        dateKeywords: {
            start: [
                "start",
                "begin",
                "from",
                "starting",
                "begins",
                "开始",
                "从",
                "起始",
                "起",
                "始于",
                "自",
            ],
            due: [
                "due",
                "deadline",
                "by",
                "until",
                "before",
                "expires",
                "ends",
                "截止",
                "到期",
                "之前",
                "期限",
                "最晚",
                "结束",
                "终止",
                "完成于",
            ],
            scheduled: [
                "scheduled",
                "on",
                "at",
                "planned",
                "set for",
                "arranged",
                "安排",
                "计划",
                "在",
                "定于",
                "预定",
                "约定",
                "设定",
            ],
        },
        removeOriginalText: true,
        perLineProcessing: true,
        realTimeReplacement: true,
        // Enhanced time parsing configuration
        timePatterns: {
            singleTime: [
                /\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/g,
                /\b(1[0-2]|0?[1-9]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM|am|pm)\b/g, // 12-hour format
            ],
            timeRange: [
                /\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\s*[-~～]\s*([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/g,
                /\b(1[0-2]|0?[1-9]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM|am|pm)?\s*[-~～]\s*(1[0-2]|0?[1-9]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM|am|pm)\b/g, // 12-hour range
            ],
            rangeSeparators: ["-", "~", "～", " - ", " ~ ", " ～ "],
        },
        timeDefaults: {
            preferredFormat: "24h",
            defaultPeriod: "AM",
            midnightCrossing: "next-day",
        },
    },
    // Task Timer Defaults
    taskTimer: {
        enabled: false,
        metadataDetection: {
            frontmatter: "task-timer",
            folders: [],
            tags: ["timer", "tracked"],
        },
        timeFormat: "{h}hrs {m}mins",
        blockRefPrefix: "timer",
    },
    // Custom Date Format Defaults
    enableCustomDateFormats: false,
    customDateFormats: [],
    // Experimental Defaults
    experimental: {
        enableFluent: false,
        showFluentRibbon: false,
    },
    // Onboarding Defaults
    onboarding: {
        completed: false,
        version: "",
        configMode: "beginner",
        skipOnboarding: false,
        completedAt: "",
    },
    // FileSource Defaults - Import from FileSourceConfig
    fileSource: {
        enabled: false,
        recognitionStrategies: {
            metadata: {
                enabled: true,
                taskFields: ["dueDate", "status", "priority", "assigned"],
                requireAllFields: false,
            },
            tags: {
                enabled: true,
                taskTags: ["#task", "#actionable", "#todo"],
                matchMode: "exact",
            },
            templates: {
                enabled: false,
                templatePaths: ["Templates/Task Template.md"],
                checkTemplateMetadata: true,
            },
            paths: {
                enabled: false,
                taskPaths: ["Projects/", "Tasks/"],
                matchMode: "prefix",
            },
        },
        fileTaskProperties: {
            contentSource: "filename",
            stripExtension: true,
            defaultStatus: " ",
            defaultPriority: undefined,
            preferFrontmatterTitle: true,
        },
        relationships: {
            enableChildRelationships: true,
            enableMetadataInheritance: true,
            inheritanceFields: ["project", "priority", "context"],
        },
        performance: {
            enableWorkerProcessing: true,
            enableCaching: true,
            cacheTTL: 300000,
        },
        statusMapping: {
            enabled: true,
            metadataToSymbol: {
                completed: "x",
                done: "x",
                finished: "x",
                "in-progress": "/",
                "in progress": "/",
                doing: "/",
                planned: "?",
                todo: "?",
                cancelled: "-",
                "not-started": " ",
                "not started": " ",
            },
            symbolToMetadata: {
                x: "completed",
                X: "completed",
                "/": "in-progress",
                ">": "in-progress",
                "?": "planned",
                "-": "cancelled",
                " ": "not-started",
            },
            autoDetect: true,
            caseSensitive: false,
        },
    },
};
// Helper function to get view settings safely
export function getViewSettingOrDefault(plugin, viewId) {
    const viewConfiguration = plugin.settings.viewConfiguration || DEFAULT_SETTINGS.viewConfiguration;
    // First check if the view exists in user settings
    const savedConfig = viewConfiguration.find((v) => v.id === viewId);
    // Then check if it exists in default settings
    const defaultConfig = DEFAULT_SETTINGS.viewConfiguration.find((v) => v.id === viewId);
    // If neither exists, create a fallback default for custom views
    // IMPORTANT: Fallback needs to determine if it *should* have specificConfig based on ID pattern or other logic if possible.
    // For simplicity now, fallback won't have specificConfig unless explicitly added later for new custom types.
    const fallbackConfig = {
        // Explicitly type fallback
        id: viewId,
        name: viewId,
        icon: "list-plus",
        type: "custom",
        visible: true,
        filterBlanks: false,
        hideCompletedAndAbandonedTasks: false,
        filterRules: {},
        // No specificConfig for generic custom views by default
    };
    // Use default config if it exists, otherwise use fallback
    const baseConfig = defaultConfig || fallbackConfig;
    // Merge saved config onto base config
    const mergedConfig = Object.assign(Object.assign(Object.assign({}, baseConfig), (savedConfig || {})), { 
        // Explicitly handle merging filterRules
        filterRules: (savedConfig === null || savedConfig === void 0 ? void 0 : savedConfig.filterRules)
            ? Object.assign(Object.assign({}, (baseConfig.filterRules || {})), savedConfig.filterRules) : baseConfig.filterRules || {}, 
        // Merge specificConfig: Saved overrides default, default overrides base (which might be fallback without specificConfig)
        // Ensure that the spread of savedConfig doesn't overwrite specificConfig object entirely if base has one and saved doesn't.
        specificConfig: (savedConfig === null || savedConfig === void 0 ? void 0 : savedConfig.specificConfig) !== undefined
            ? Object.assign(Object.assign({}, (baseConfig.specificConfig || {})), savedConfig.specificConfig) : baseConfig.specificConfig });
    // Ensure essential properties exist even if defaults are weird
    mergedConfig.filterRules = mergedConfig.filterRules || {};
    // Remove duplicate gantt view if it exists in the default settings
    if (viewId === "gantt" && Array.isArray(viewConfiguration)) {
        const ganttViews = viewConfiguration.filter((v) => v.id === "gantt");
        if (ganttViews.length > 1) {
            // Keep only the first gantt view
            const indexesToRemove = viewConfiguration
                .map((v, index) => (v.id === "gantt" ? index : -1))
                .filter((index) => index !== -1)
                .slice(1);
            for (const index of indexesToRemove.reverse()) {
                viewConfiguration.splice(index, 1);
            }
            // Save the updated configuration
            plugin.saveSettings();
        }
    }
    return mergedConfig;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZy1kZWZpbml0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2V0dGluZy1kZWZpbml0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQXNvQjNDLE1BQU0sQ0FBTixJQUFZLFVBR1g7QUFIRCxXQUFZLFVBQVU7SUFDckIscUNBQXVCLENBQUE7SUFDdkIscUNBQXVCLENBQUE7QUFDeEIsQ0FBQyxFQUhXLFVBQVUsS0FBVixVQUFVLFFBR3JCO0FBNE9ELGtDQUFrQztBQUNsQyxNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBNEI7SUFDeEQsU0FBUyxFQUFFO1FBQ1YsT0FBTyxFQUFFLElBQUk7UUFDYixXQUFXLEVBQUUsRUFBRTtLQUNmO0lBQ0QsbUJBQW1CO0lBQ25CLHNCQUFzQixFQUFFLE1BQU07SUFDOUIsOEJBQThCLEVBQUUsS0FBSztJQUNyQyw2QkFBNkIsRUFBRSxLQUFLO0lBQ3BDLDJCQUEyQixFQUFFLEtBQUs7SUFDbEMsNEJBQTRCLEVBQUUsS0FBSztJQUNuQyw4QkFBOEIsRUFBRSxLQUFLO0lBRXJDLGlEQUFpRDtJQUNqRCxhQUFhLEVBQUU7UUFDZCxPQUFPLEVBQUUsS0FBSztRQUNkLFlBQVksRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRTtRQUM5QyxPQUFPLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUU7S0FDNUM7SUFDRCxrQkFBa0IsRUFBRSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUU7SUFDekMsYUFBYSxFQUFFLEtBQUs7SUFDcEIsV0FBVyxFQUFFLGlCQUFpQjtJQUM5QixZQUFZLEVBQUUsMkJBQTJCO0lBQ3pDLGNBQWMsRUFBRSxLQUFLO0lBQ3JCLHVCQUF1QixFQUFFLEtBQUs7SUFDOUIsY0FBYyxFQUFFO1FBQ2YsRUFBRSxHQUFHLEVBQUUs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YyxFQUUvQixDQUFDLENBQUMsVUFBVSxDQUFDLGNBQWMsR0FDN0IsQ0FBQztJQUVGLCtEQUErRDtJQUMvRCxZQUFZLENBQUMsV0FBVyxHQUFHLFlBQVksQ0FBQyxXQUFXLElBQUksRUFBRSxDQUFDO0lBRTFELG1FQUFtRTtJQUNuRSxJQUFJLE1BQU0sS0FBSyxPQUFPLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFO1FBQzNELE1BQU0sVUFBVSxHQUFHLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxPQUFPLENBQUMsQ0FBQztRQUNyRSxJQUFJLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQzFCLGlDQUFpQztZQUNqQyxNQUFNLGVBQWUsR0FBRyxpQkFBaUI7aUJBQ3ZDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDbEQsTUFBTSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUM7aUJBQy9CLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVYLEtBQUssTUFBTSxLQUFLLElBQUksZUFBZSxDQUFDLE9BQU8sRUFBRSxFQUFFO2dCQUM5QyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ25DO1lBRUQsaUNBQWlDO1lBQ2pDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztTQUN0QjtLQUNEO0lBRUQsT0FBTyxZQUFZLENBQUM7QUFDckIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHQgfSBmcm9tIFwiLi4vdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgdHlwZSBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIi4uL2luZGV4XCI7IC8vIFR5cGUtb25seSBpbXBvcnRcclxuaW1wb3J0IHsgQmFzZUhhYml0RGF0YSB9IGZyb20gXCIuLi90eXBlcy9oYWJpdC1jYXJkXCI7XHJcbmltcG9ydCB0eXBlIHsgUm9vdEZpbHRlclN0YXRlIH0gZnJvbSBcIi4uL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay9maWx0ZXIvVmlld1Rhc2tGaWx0ZXJcIjtcclxuaW1wb3J0IHsgSWNzTWFuYWdlckNvbmZpZyB9IGZyb20gXCIuLi90eXBlcy9pY3NcIjtcclxuaW1wb3J0IHR5cGUgeyBFbmhhbmNlZFRpbWVQYXJzaW5nQ29uZmlnIH0gZnJvbSBcIi4uL3R5cGVzL3RpbWUtcGFyc2luZ1wiO1xyXG5pbXBvcnQgdHlwZSB7IEZpbGVTb3VyY2VDb25maWd1cmF0aW9uIH0gZnJvbSBcIi4uL3R5cGVzL2ZpbGUtc291cmNlXCI7XHJcbmltcG9ydCB7IFdvcmtzcGFjZXNDb25maWcgfSBmcm9tIFwiQC90eXBlcy93b3Jrc3BhY2VcIjtcclxuXHJcbi8vIEludGVyZmFjZSBmb3IgaW5kaXZpZHVhbCBwcm9qZWN0IHJldmlldyBzZXR0aW5ncyAoSWYgc3RpbGwgbmVlZGVkLCBvdGhlcndpc2UgcmVtb3ZlKVxyXG4vLyBLZWVwIGl0IGZvciBub3csIGluIGNhc2UgaXQncyB1c2VkIGVsc2V3aGVyZSwgYnV0IGl0J3Mgbm90IHBhcnQgb2YgVGFza1Byb2dyZXNzQmFyU2V0dGluZ3MgYW55bW9yZVxyXG5leHBvcnQgaW50ZXJmYWNlIFByb2plY3RSZXZpZXdTZXR0aW5nIHtcclxuXHRmcmVxdWVuY3k6IHN0cmluZzsgLy8gRGF5cyBiZXR3ZWVuIHJldmlld3NcclxuXHRsYXN0UmV2aWV3ZWQ/OiBudW1iZXI7XHJcblx0cmV2aWV3ZWRUYXNrSWRzPzogc3RyaW5nW107XHJcbn1cclxuXHJcbi8vIEludGVyZmFjZSBmb3IgaW5kaXZpZHVhbCB2aWV3IHNldHRpbmdzIChJZiBzdGlsbCBuZWVkZWQsIG90aGVyd2lzZSByZW1vdmUpXHJcbi8vIEtlZXAgaXQgZm9yIG5vdywgaW4gY2FzZSBpdCdzIHVzZWQgZWxzZXdoZXJlLCBidXQgaXQncyBub3QgcGFydCBvZiBUYXNrUHJvZ3Jlc3NCYXJTZXR0aW5ncyBhbnltb3JlXHJcbmV4cG9ydCBpbnRlcmZhY2UgVGFza1ZpZXdTZXR0aW5nIHtcclxuXHRoaWRlQ29tcGxldGVkQW5kQWJhbmRvbmVkVGFza3M6IGJvb2xlYW47XHJcblx0c29ydENyaXRlcmlhOiBzdHJpbmdbXTtcclxufVxyXG5cclxuLy8gRGVmaW5lIGFuZCBleHBvcnQgVmlld01vZGUgdHlwZVxyXG5leHBvcnQgdHlwZSBWaWV3TW9kZSA9XHJcblx0fCBcImluYm94XCJcclxuXHR8IFwiZm9yZWNhc3RcIlxyXG5cdHwgXCJwcm9qZWN0c1wiXHJcblx0fCBcInRhZ3NcIlxyXG5cdHwgXCJyZXZpZXdcIlxyXG5cdHwgXCJmbGFnZ2VkXCIgLy8gQWRkZWQgZmxhZ2dlZCBhcyBpdCB3YXMgaW4gdGhlIGRlZmF1bHQgY29uZmlnIGF0dGVtcHRcclxuXHR8IHN0cmluZzsgLy8gQWxsb3cgY3VzdG9tIHZpZXcgSURzXHJcblxyXG5leHBvcnQgdHlwZSBEYXRlRXhpc3RUeXBlID0gXCJoYXNEYXRlXCIgfCBcIm5vRGF0ZVwiIHwgXCJhbnlcIjtcclxuZXhwb3J0IHR5cGUgUHJvcGVydHlFeGlzdFR5cGUgPSBcImhhc1Byb3BlcnR5XCIgfCBcIm5vUHJvcGVydHlcIiB8IFwiYW55XCI7XHJcblxyXG4vLyBEZWZpbmUgYW5kIGV4cG9ydCBWaWV3RmlsdGVyUnVsZSBpbnRlcmZhY2VcclxuZXhwb3J0IGludGVyZmFjZSBWaWV3RmlsdGVyUnVsZSB7XHJcblx0Ly8gU2ltcGxlIGV4YW1wbGUsIGV4cGFuZCBhcyBuZWVkZWRcclxuXHR0YWdzSW5jbHVkZT86IHN0cmluZ1tdO1xyXG5cdHRhZ3NFeGNsdWRlPzogc3RyaW5nW107XHJcblx0c3RhdHVzSW5jbHVkZT86IHN0cmluZ1tdO1xyXG5cdHN0YXR1c0V4Y2x1ZGU/OiBzdHJpbmdbXTtcclxuXHRwcm9qZWN0Pzogc3RyaW5nO1xyXG5cdHByaW9yaXR5Pzogc3RyaW5nO1xyXG5cdGhhc0R1ZURhdGU/OiBEYXRlRXhpc3RUeXBlO1xyXG5cdGR1ZURhdGU/OiBzdHJpbmc7IC8vIGUuZy4sICd0b2RheScsICduZXh0LXdlZWsnLCAneXl5eS1tbS1kZCdcclxuXHRoYXNTdGFydERhdGU/OiBEYXRlRXhpc3RUeXBlO1xyXG5cdHN0YXJ0RGF0ZT86IHN0cmluZztcclxuXHRoYXNTY2hlZHVsZWREYXRlPzogRGF0ZUV4aXN0VHlwZTtcclxuXHRzY2hlZHVsZWREYXRlPzogc3RyaW5nO1xyXG5cdGhhc0NyZWF0ZWREYXRlPzogRGF0ZUV4aXN0VHlwZTtcclxuXHRjcmVhdGVkRGF0ZT86IHN0cmluZztcclxuXHRoYXNDb21wbGV0ZWREYXRlPzogRGF0ZUV4aXN0VHlwZTtcclxuXHRjb21wbGV0ZWREYXRlPzogc3RyaW5nO1xyXG5cdGhhc1JlY3VycmVuY2U/OiBQcm9wZXJ0eUV4aXN0VHlwZTtcclxuXHRyZWN1cnJlbmNlPzogc3RyaW5nO1xyXG5cdHRleHRDb250YWlucz86IHN0cmluZztcclxuXHRwYXRoSW5jbHVkZXM/OiBzdHJpbmc7XHJcblx0cGF0aEV4Y2x1ZGVzPzogc3RyaW5nO1xyXG5cdC8vIEFkZCBtb3JlIHJ1bGVzIGJhc2VkIG9uIFRhc2sgcHJvcGVydGllczogY3JlYXRlZERhdGUsIGNvbXBsZXRlZERhdGUsIHJlY3VycmVuY2UsIGNvbnRleHQsIHRpbWUgZXN0aW1hdGVzIGV0Yy5cclxuXHJcblx0Ly8gQWRkIGFkdmFuY2VkIGZpbHRlcmluZyBzdXBwb3J0XHJcblx0YWR2YW5jZWRGaWx0ZXI/OiBSb290RmlsdGVyU3RhdGU7XHJcbn1cclxuXHJcbi8vIERlZmluZSBhbmQgZXhwb3J0IFZpZXdDb25maWcgaW50ZXJmYWNlXHJcbmV4cG9ydCBpbnRlcmZhY2UgVmlld0NvbmZpZyB7XHJcblx0aWQ6IFZpZXdNb2RlO1xyXG5cdG5hbWU6IHN0cmluZztcclxuXHRpY29uOiBzdHJpbmc7XHJcblx0dHlwZTogXCJkZWZhdWx0XCIgfCBcImN1c3RvbVwiO1xyXG5cdHZpc2libGU6IGJvb2xlYW47IC8vIFNob3cgaW4gc2lkZWJhclxyXG5cdGhpZGVDb21wbGV0ZWRBbmRBYmFuZG9uZWRUYXNrczogYm9vbGVhbjsgLy8gUGVyLXZpZXcgc2V0dGluZ1xyXG5cdGZpbHRlckJsYW5rczogYm9vbGVhbjsgLy8gUGVyLXZpZXcgc2V0dGluZ1xyXG5cdGZpbHRlclJ1bGVzPzogVmlld0ZpbHRlclJ1bGU7IC8vIEFEREVEOiBPcHRpb25hbCBmaWx0ZXIgcnVsZXMgZm9yIEFMTCB2aWV3c1xyXG5cdHNvcnRDcml0ZXJpYT86IFNvcnRDcml0ZXJpb25bXTsgLy8gQURERUQ6IE9wdGlvbmFsIHNvcnQgY3JpdGVyaWEgZm9yIEFMTCB2aWV3c1xyXG5cdHNwZWNpZmljQ29uZmlnPzogU3BlY2lmaWNWaWV3Q29uZmlnOyAvLyBBRERFRDogT3B0aW9uYWwgcHJvcGVydHkgZm9yIHZpZXctc3BlY2lmaWMgc2V0dGluZ3NcclxuXHRyZWdpb24/OiBcInRvcFwiIHwgXCJib3R0b21cIjsgLy8g6KeG5Zu+5Yy65Z+f77ya6aG26YOo5oiW5bqV6YOo77yM55So5LqO5L6n6L655qCP5YiG57uEXHJcbn1cclxuXHJcbi8vIEFEREVEOiBTcGVjaWZpYyBjb25maWcgaW50ZXJmYWNlc1xyXG5leHBvcnQgaW50ZXJmYWNlIEthbmJhblNwZWNpZmljQ29uZmlnIHtcclxuXHR2aWV3VHlwZTogXCJrYW5iYW5cIjsgLy8gRGlzY3JpbWluYXRvclxyXG5cdHNob3dDaGVja2JveDogYm9vbGVhbjtcclxuXHRoaWRlRW1wdHlDb2x1bW5zOiBib29sZWFuO1xyXG5cdGRlZmF1bHRTb3J0RmllbGQ6XHJcblx0XHR8IFwicHJpb3JpdHlcIlxyXG5cdFx0fCBcImR1ZURhdGVcIlxyXG5cdFx0fCBcInNjaGVkdWxlZERhdGVcIlxyXG5cdFx0fCBcInN0YXJ0RGF0ZVwiXHJcblx0XHR8IFwiY3JlYXRlZERhdGVcIjtcclxuXHRkZWZhdWx0U29ydE9yZGVyOiBcImFzY1wiIHwgXCJkZXNjXCI7XHJcblx0Ly8gTmV3IHByb3BlcnRpZXMgZm9yIGZsZXhpYmxlIGNvbHVtbiBncm91cGluZ1xyXG5cdGdyb3VwQnk6XHJcblx0XHR8IFwic3RhdHVzXCJcclxuXHRcdHwgXCJwcmlvcml0eVwiXHJcblx0XHR8IFwidGFnc1wiXHJcblx0XHR8IFwicHJvamVjdFwiXHJcblx0XHR8IFwiZHVlRGF0ZVwiXHJcblx0XHR8IFwic2NoZWR1bGVkRGF0ZVwiXHJcblx0XHR8IFwic3RhcnREYXRlXCJcclxuXHRcdHwgXCJjb250ZXh0XCJcclxuXHRcdHwgXCJmaWxlUGF0aFwiO1xyXG5cdGN1c3RvbUNvbHVtbnM/OiBLYW5iYW5Db2x1bW5Db25maWdbXTsgLy8gQ3VzdG9tIGNvbHVtbiBkZWZpbml0aW9ucyB3aGVuIG5vdCB1c2luZyBzdGF0dXNcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBLYW5iYW5Db2x1bW5Db25maWcge1xyXG5cdGlkOiBzdHJpbmc7XHJcblx0dGl0bGU6IHN0cmluZztcclxuXHR2YWx1ZTogc3RyaW5nIHwgbnVtYmVyIHwgbnVsbDsgLy8gVGhlIHZhbHVlIHRoYXQgdGFza3Mgc2hvdWxkIGhhdmUgZm9yIHRoaXMgcHJvcGVydHkgdG8gYXBwZWFyIGluIHRoaXMgY29sdW1uXHJcblx0Y29sb3I/OiBzdHJpbmc7IC8vIE9wdGlvbmFsIGNvbG9yIGZvciB0aGUgY29sdW1uXHJcblx0b3JkZXI6IG51bWJlcjsgLy8gRGlzcGxheSBvcmRlclxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENhbGVuZGFyU3BlY2lmaWNDb25maWcge1xyXG5cdHZpZXdUeXBlOiBcImNhbGVuZGFyXCI7IC8vIERpc2NyaW1pbmF0b3JcclxuXHRmaXJzdERheU9mV2Vlaz86IG51bWJlcjsgLy8gMD1TdW4sIDE9TW9uLCAuLi4sIDY9U2F0OyB1bmRlZmluZWQ9bG9jYWxlIGRlZmF1bHRcclxuXHRoaWRlV2Vla2VuZHM/OiBib29sZWFuOyAvLyBXaGV0aGVyIHRvIGhpZGUgd2Vla2VuZCBjb2x1bW5zL2NlbGxzIGluIGNhbGVuZGFyIHZpZXdzXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgR2FudHRTcGVjaWZpY0NvbmZpZyB7XHJcblx0dmlld1R5cGU6IFwiZ2FudHRcIjsgLy8gRGlzY3JpbWluYXRvclxyXG5cdHNob3dUYXNrTGFiZWxzOiBib29sZWFuO1xyXG5cdHVzZU1hcmtkb3duUmVuZGVyZXI6IGJvb2xlYW47XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRm9yZWNhc3RTcGVjaWZpY0NvbmZpZyB7XHJcblx0dmlld1R5cGU6IFwiZm9yZWNhc3RcIjsgLy8gRGlzY3JpbWluYXRvclxyXG5cdGZpcnN0RGF5T2ZXZWVrPzogbnVtYmVyOyAvLyAwPVN1biwgMT1Nb24sIC4uLiwgNj1TYXQ7IHVuZGVmaW5lZD1sb2NhbGUgZGVmYXVsdFxyXG5cdGhpZGVXZWVrZW5kcz86IGJvb2xlYW47IC8vIFdoZXRoZXIgdG8gaGlkZSB3ZWVrZW5kIGNvbHVtbnMvY2VsbHMgaW4gZm9yZWNhc3QgY2FsZW5kYXJcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBUd29Db2x1bW5TcGVjaWZpY0NvbmZpZyB7XHJcblx0dmlld1R5cGU6IFwidHdvY29sdW1uXCI7IC8vIERpc2NyaW1pbmF0b3JcclxuXHR0YXNrUHJvcGVydHlLZXk6IHN0cmluZzsgLy8gVGFzayBwcm9wZXJ0eSB0byB1c2UgYXMgdGhlIGxlZnQgY29sdW1uIGdyb3VwaW5nIChlLmcuLCBcInRhZ3NcIiwgXCJwcm9qZWN0XCIsIFwicHJpb3JpdHlcIiwgXCJjb250ZXh0XCIpXHJcblx0bGVmdENvbHVtblRpdGxlOiBzdHJpbmc7IC8vIFRpdGxlIGZvciB0aGUgbGVmdCBjb2x1bW5cclxuXHRyaWdodENvbHVtbkRlZmF1bHRUaXRsZTogc3RyaW5nOyAvLyBEZWZhdWx0IHRpdGxlIGZvciB0aGUgcmlnaHQgY29sdW1uXHJcblx0bXVsdGlTZWxlY3RUZXh0OiBzdHJpbmc7IC8vIFRleHQgdG8gc2hvdyB3aGVuIG11bHRpcGxlIGl0ZW1zIGFyZSBzZWxlY3RlZFxyXG5cdGVtcHR5U3RhdGVUZXh0OiBzdHJpbmc7IC8vIFRleHQgdG8gc2hvdyB3aGVuIG5vIGl0ZW1zIGFyZSBzZWxlY3RlZFxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFRhYmxlU3BlY2lmaWNDb25maWcge1xyXG5cdHZpZXdUeXBlOiBcInRhYmxlXCI7IC8vIERpc2NyaW1pbmF0b3JcclxuXHRlbmFibGVUcmVlVmlldzogYm9vbGVhbjsgLy8gRW5hYmxlIGhpZXJhcmNoaWNhbCB0cmVlIHZpZXdcclxuXHRlbmFibGVMYXp5TG9hZGluZzogYm9vbGVhbjsgLy8gRW5hYmxlIGxhenkgbG9hZGluZyBmb3IgbGFyZ2UgZGF0YXNldHNcclxuXHRwYWdlU2l6ZTogbnVtYmVyOyAvLyBOdW1iZXIgb2Ygcm93cyB0byBsb2FkIHBlciBiYXRjaFxyXG5cdGVuYWJsZUlubGluZUVkaXRpbmc6IGJvb2xlYW47IC8vIEVuYWJsZSBpbmxpbmUgZWRpdGluZyBvZiB0YXNrIHByb3BlcnRpZXNcclxuXHR2aXNpYmxlQ29sdW1uczogc3RyaW5nW107IC8vIEFycmF5IG9mIGNvbHVtbiBJRHMgdG8gZGlzcGxheVxyXG5cdGNvbHVtbldpZHRoczogUmVjb3JkPHN0cmluZywgbnVtYmVyPjsgLy8gQ29sdW1uIHdpZHRoIHNldHRpbmdzXHJcblx0c29ydGFibGVDb2x1bW5zOiBib29sZWFuOyAvLyBFbmFibGUgY29sdW1uIHNvcnRpbmdcclxuXHRyZXNpemFibGVDb2x1bW5zOiBib29sZWFuOyAvLyBFbmFibGUgY29sdW1uIHJlc2l6aW5nXHJcblx0c2hvd1Jvd051bWJlcnM6IGJvb2xlYW47IC8vIFNob3cgcm93IG51bWJlcnNcclxuXHRlbmFibGVSb3dTZWxlY3Rpb246IGJvb2xlYW47IC8vIEVuYWJsZSByb3cgc2VsZWN0aW9uXHJcblx0ZW5hYmxlTXVsdGlTZWxlY3Q6IGJvb2xlYW47IC8vIEVuYWJsZSBtdWx0aXBsZSByb3cgc2VsZWN0aW9uXHJcblx0ZGVmYXVsdFNvcnRGaWVsZDogc3RyaW5nOyAvLyBEZWZhdWx0IHNvcnQgZmllbGRcclxuXHRkZWZhdWx0U29ydE9yZGVyOiBcImFzY1wiIHwgXCJkZXNjXCI7IC8vIERlZmF1bHQgc29ydCBvcmRlclxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFF1YWRyYW50U3BlY2lmaWNDb25maWcge1xyXG5cdHZpZXdUeXBlOiBcInF1YWRyYW50XCI7IC8vIERpc2NyaW1pbmF0b3JcclxuXHRoaWRlRW1wdHlRdWFkcmFudHM6IGJvb2xlYW47IC8vIEhpZGUgcXVhZHJhbnRzIHdpdGggbm8gdGFza3NcclxuXHRhdXRvVXBkYXRlUHJpb3JpdHk6IGJvb2xlYW47IC8vIEF1dG9tYXRpY2FsbHkgdXBkYXRlIHRhc2sgcHJpb3JpdHkgd2hlbiBtb3ZlZCBiZXR3ZWVuIHF1YWRyYW50c1xyXG5cdGF1dG9VcGRhdGVUYWdzOiBib29sZWFuOyAvLyBBdXRvbWF0aWNhbGx5IGFkZC9yZW1vdmUgdXJnZW50L2ltcG9ydGFudCB0YWdzIHdoZW4gbW92ZWRcclxuXHRzaG93VGFza0NvdW50OiBib29sZWFuOyAvLyBTaG93IHRhc2sgY291bnQgaW4gZWFjaCBxdWFkcmFudCBoZWFkZXJcclxuXHRkZWZhdWx0U29ydEZpZWxkOlxyXG5cdFx0fCBcInByaW9yaXR5XCJcclxuXHRcdHwgXCJkdWVEYXRlXCJcclxuXHRcdHwgXCJzY2hlZHVsZWREYXRlXCJcclxuXHRcdHwgXCJzdGFydERhdGVcIlxyXG5cdFx0fCBcImNyZWF0ZWREYXRlXCI7XHJcblx0ZGVmYXVsdFNvcnRPcmRlcjogXCJhc2NcIiB8IFwiZGVzY1wiO1xyXG5cdHVyZ2VudFRhZzogc3RyaW5nOyAvLyBUYWcgdG8gaWRlbnRpZnkgdXJnZW50IHRhc2tzIChkZWZhdWx0OiBcIiN1cmdlbnRcIilcclxuXHRpbXBvcnRhbnRUYWc6IHN0cmluZzsgLy8gVGFnIHRvIGlkZW50aWZ5IGltcG9ydGFudCB0YXNrcyAoZGVmYXVsdDogXCIjaW1wb3J0YW50XCIpXHJcblx0dXJnZW50VGhyZXNob2xkRGF5czogbnVtYmVyOyAvLyBEYXlzIHVudGlsIGR1ZSBkYXRlIHRvIGNvbnNpZGVyIHRhc2sgdXJnZW50XHJcblx0dXNlUHJpb3JpdHlGb3JDbGFzc2lmaWNhdGlvbjogYm9vbGVhbjsgLy8gVXNlIHByaW9yaXR5IGxldmVscyBpbnN0ZWFkIG9mIHRhZ3MgZm9yIGNsYXNzaWZpY2F0aW9uXHJcblx0dXJnZW50UHJpb3JpdHlUaHJlc2hvbGQ6IG51bWJlcjsgLy8gUHJpb3JpdHkgbGV2ZWwgKDEtNSkgdG8gY29uc2lkZXIgdGFzayB1cmdlbnQgd2hlbiB1c2luZyBwcmlvcml0eVxyXG5cdGltcG9ydGFudFByaW9yaXR5VGhyZXNob2xkOiBudW1iZXI7IC8vIFByaW9yaXR5IGxldmVsICgxLTUpIHRvIGNvbnNpZGVyIHRhc2sgaW1wb3J0YW50IHdoZW4gdXNpbmcgcHJpb3JpdHlcclxuXHRjdXN0b21RdWFkcmFudENvbG9yczogYm9vbGVhbjsgLy8gVXNlIGN1c3RvbSBjb2xvcnMgZm9yIHF1YWRyYW50c1xyXG5cdHF1YWRyYW50Q29sb3JzOiB7XHJcblx0XHR1cmdlbnRJbXBvcnRhbnQ6IHN0cmluZzsgLy8gUmVkIC0gQ3Jpc2lzXHJcblx0XHRub3RVcmdlbnRJbXBvcnRhbnQ6IHN0cmluZzsgLy8gR3JlZW4gLSBHb2Fsc1xyXG5cdFx0dXJnZW50Tm90SW1wb3J0YW50OiBzdHJpbmc7IC8vIFllbGxvdyAtIEludGVycnVwdGlvbnNcclxuXHRcdG5vdFVyZ2VudE5vdEltcG9ydGFudDogc3RyaW5nOyAvLyBHcmF5IC0gVGltZSB3YXN0ZXJzXHJcblx0fTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBRdWFkcmFudENvbHVtbkNvbmZpZyB7XHJcblx0aWQ6IHN0cmluZztcclxuXHR0aXRsZTogc3RyaW5nO1xyXG5cdGRlc2NyaXB0aW9uOiBzdHJpbmc7XHJcblx0cHJpb3JpdHlFbW9qaTogc3RyaW5nO1xyXG5cdHVyZ2VudFRhZz86IHN0cmluZztcclxuXHRpbXBvcnRhbnRUYWc/OiBzdHJpbmc7XHJcblx0Y29sb3I6IHN0cmluZztcclxuXHRvcmRlcjogbnVtYmVyO1xyXG59XHJcblxyXG4vLyBBRERFRDogVW5pb24gdHlwZSBmb3Igc3BlY2lmaWMgY29uZmlnc1xyXG5leHBvcnQgdHlwZSBTcGVjaWZpY1ZpZXdDb25maWcgPVxyXG5cdHwgS2FuYmFuU3BlY2lmaWNDb25maWdcclxuXHR8IENhbGVuZGFyU3BlY2lmaWNDb25maWdcclxuXHR8IEdhbnR0U3BlY2lmaWNDb25maWdcclxuXHR8IFR3b0NvbHVtblNwZWNpZmljQ29uZmlnXHJcblx0fCBGb3JlY2FzdFNwZWNpZmljQ29uZmlnXHJcblx0fCBUYWJsZVNwZWNpZmljQ29uZmlnXHJcblx0fCBRdWFkcmFudFNwZWNpZmljQ29uZmlnO1xyXG5cclxuLyoqIERlZmluZSB0aGUgc3RydWN0dXJlIGZvciB0YXNrIHN0YXR1c2VzICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgVGFza1N0YXR1c0NvbmZpZyBleHRlbmRzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4ge1xyXG5cdGNvbXBsZXRlZDogc3RyaW5nO1xyXG5cdGluUHJvZ3Jlc3M6IHN0cmluZztcclxuXHRhYmFuZG9uZWQ6IHN0cmluZztcclxuXHRwbGFubmVkOiBzdHJpbmc7XHJcblx0bm90U3RhcnRlZDogc3RyaW5nO1xyXG59XHJcblxyXG4vKiogRGVmaW5lIHRoZSBzdHJ1Y3R1cmUgZm9yIHRhc2sgZmlsdGVyIHByZXNldHMgKi9cclxuZXhwb3J0IGludGVyZmFjZSBQcmVzZXRUYXNrRmlsdGVyIHtcclxuXHRpZDogc3RyaW5nO1xyXG5cdG5hbWU6IHN0cmluZztcclxuXHRvcHRpb25zOiB7XHJcblx0XHQvLyBUYXNrRmlsdGVyT3B0aW9ucyBzdHJ1Y3R1cmUgaXMgZW1iZWRkZWQgaGVyZVxyXG5cdFx0aW5jbHVkZUNvbXBsZXRlZDogYm9vbGVhbjtcclxuXHRcdGluY2x1ZGVJblByb2dyZXNzOiBib29sZWFuO1xyXG5cdFx0aW5jbHVkZUFiYW5kb25lZDogYm9vbGVhbjtcclxuXHRcdGluY2x1ZGVOb3RTdGFydGVkOiBib29sZWFuO1xyXG5cdFx0aW5jbHVkZVBsYW5uZWQ6IGJvb2xlYW47XHJcblx0XHRpbmNsdWRlUGFyZW50VGFza3M6IGJvb2xlYW47XHJcblx0XHRpbmNsdWRlQ2hpbGRUYXNrczogYm9vbGVhbjtcclxuXHRcdGluY2x1ZGVTaWJsaW5nVGFza3M6IGJvb2xlYW47XHJcblx0XHRhZHZhbmNlZEZpbHRlclF1ZXJ5OiBzdHJpbmc7XHJcblx0XHRmaWx0ZXJNb2RlOiBcIklOQ0xVREVcIiB8IFwiRVhDTFVERVwiO1xyXG5cdH07XHJcbn1cclxuXHJcbi8qKiBEZWZpbmUgdGhlIHN0cnVjdHVyZSBmb3IgdGFzayBmaWx0ZXIgc2V0dGluZ3MgKi9cclxuZXhwb3J0IGludGVyZmFjZSBUYXNrRmlsdGVyU2V0dGluZ3Mge1xyXG5cdGVuYWJsZVRhc2tGaWx0ZXI6IGJvb2xlYW47XHJcblx0cHJlc2V0VGFza0ZpbHRlcnM6IFByZXNldFRhc2tGaWx0ZXJbXTtcclxufVxyXG5cclxuLyoqIERlZmluZSB0aGUgc3RydWN0dXJlIGZvciB0YXNrIHN0YXR1cyBjeWNsZSBzZXR0aW5ncyAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIFRhc2tTdGF0dXNDeWNsZSB7XHJcblx0W2tleTogc3RyaW5nXTogc3RyaW5nO1xyXG59XHJcblxyXG4vKiogRGVmaW5lIHRoZSBzdHJ1Y3R1cmUgZm9yIGNvbXBsZXRlZCB0YXNrIG1vdmVyIHNldHRpbmdzICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGxldGVkVGFza01vdmVyU2V0dGluZ3Mge1xyXG5cdGVuYWJsZUNvbXBsZXRlZFRhc2tNb3ZlcjogYm9vbGVhbjtcclxuXHR0YXNrTWFya2VyVHlwZTogXCJ2ZXJzaW9uXCIgfCBcImRhdGVcIiB8IFwiY3VzdG9tXCI7XHJcblx0dmVyc2lvbk1hcmtlcjogc3RyaW5nO1xyXG5cdGRhdGVNYXJrZXI6IHN0cmluZztcclxuXHRjdXN0b21NYXJrZXI6IHN0cmluZztcclxuXHR0cmVhdEFiYW5kb25lZEFzQ29tcGxldGVkOiBib29sZWFuO1xyXG5cdGNvbXBsZXRlQWxsTW92ZWRUYXNrczogYm9vbGVhbjtcclxuXHR3aXRoQ3VycmVudEZpbGVMaW5rOiBib29sZWFuO1xyXG5cdC8vIERlZmF1bHQgZmlsZSBhbmQgbG9jYXRpb24gc2V0dGluZ3MgZm9yIGF1dG8tbW92ZVxyXG5cdGVuYWJsZUF1dG9Nb3ZlOiBib29sZWFuO1xyXG5cdGRlZmF1bHRUYXJnZXRGaWxlOiBzdHJpbmc7XHJcblx0ZGVmYXVsdEluc2VydGlvbk1vZGU6IFwiYmVnaW5uaW5nXCIgfCBcImVuZFwiIHwgXCJhZnRlci1oZWFkaW5nXCI7XHJcblx0ZGVmYXVsdEhlYWRpbmdOYW1lOiBzdHJpbmc7IC8vIFVzZWQgd2hlbiBkZWZhdWx0SW5zZXJ0aW9uTW9kZSBpcyBcImFmdGVyLWhlYWRpbmdcIlxyXG5cdC8vIFNldHRpbmdzIGZvciBpbmNvbXBsZXRlIHRhc2sgbW92ZXJcclxuXHRlbmFibGVJbmNvbXBsZXRlZFRhc2tNb3ZlcjogYm9vbGVhbjtcclxuXHRpbmNvbXBsZXRlZFRhc2tNYXJrZXJUeXBlOiBcInZlcnNpb25cIiB8IFwiZGF0ZVwiIHwgXCJjdXN0b21cIjtcclxuXHRpbmNvbXBsZXRlZFZlcnNpb25NYXJrZXI6IHN0cmluZztcclxuXHRpbmNvbXBsZXRlZERhdGVNYXJrZXI6IHN0cmluZztcclxuXHRpbmNvbXBsZXRlZEN1c3RvbU1hcmtlcjogc3RyaW5nO1xyXG5cdHdpdGhDdXJyZW50RmlsZUxpbmtGb3JJbmNvbXBsZXRlZDogYm9vbGVhbjtcclxuXHQvLyBEZWZhdWx0IHNldHRpbmdzIGZvciBpbmNvbXBsZXRlIHRhc2sgYXV0by1tb3ZlXHJcblx0ZW5hYmxlSW5jb21wbGV0ZWRBdXRvTW92ZTogYm9vbGVhbjtcclxuXHRpbmNvbXBsZXRlZERlZmF1bHRUYXJnZXRGaWxlOiBzdHJpbmc7XHJcblx0aW5jb21wbGV0ZWREZWZhdWx0SW5zZXJ0aW9uTW9kZTogXCJiZWdpbm5pbmdcIiB8IFwiZW5kXCIgfCBcImFmdGVyLWhlYWRpbmdcIjtcclxuXHRpbmNvbXBsZXRlZERlZmF1bHRIZWFkaW5nTmFtZTogc3RyaW5nO1xyXG59XHJcblxyXG4vKiogRGVmaW5lIHRoZSBzdHJ1Y3R1cmUgZm9yIHF1aWNrIGNhcHR1cmUgc2V0dGluZ3MgKi9cclxuZXhwb3J0IGludGVyZmFjZSBRdWlja0NhcHR1cmVTZXR0aW5ncyB7XHJcblx0ZW5hYmxlUXVpY2tDYXB0dXJlOiBib29sZWFuO1xyXG5cdHRhcmdldEZpbGU6IHN0cmluZztcclxuXHRwbGFjZWhvbGRlcjogc3RyaW5nO1xyXG5cdGFwcGVuZFRvRmlsZTogXCJhcHBlbmRcIiB8IFwicHJlcGVuZFwiIHwgXCJyZXBsYWNlXCI7XHJcblx0Ly8gTmV3IHNldHRpbmdzIGZvciBlbmhhbmNlZCBxdWljayBjYXB0dXJlXHJcblx0dGFyZ2V0VHlwZTogXCJmaXhlZFwiIHwgXCJkYWlseS1ub3RlXCIgfCBcImN1c3RvbS1maWxlXCI7IC8vIFRhcmdldCB0eXBlOiBmaXhlZCBmaWxlLCBkYWlseSBub3RlLCBvciBjdXN0b20gZmlsZVxyXG5cdHRhcmdldEhlYWRpbmc/OiBzdHJpbmc7IC8vIE9wdGlvbmFsIGhlYWRpbmcgdG8gYXBwZW5kIHVuZGVyXHJcblx0Ly8gRGFpbHkgbm90ZSBzZXR0aW5nc1xyXG5cdGRhaWx5Tm90ZVNldHRpbmdzOiB7XHJcblx0XHRmb3JtYXQ6IHN0cmluZzsgLy8gRGF0ZSBmb3JtYXQgZm9yIGRhaWx5IG5vdGVzIChlLmcuLCBcIllZWVktTU0tRERcIilcclxuXHRcdGZvbGRlcjogc3RyaW5nOyAvLyBGb2xkZXIgcGF0aCBmb3IgZGFpbHkgbm90ZXNcclxuXHRcdHRlbXBsYXRlOiBzdHJpbmc7IC8vIFRlbXBsYXRlIGZpbGUgcGF0aCBmb3IgZGFpbHkgbm90ZXNcclxuXHR9O1xyXG5cdC8vIFRhc2sgcHJlZml4IHNldHRpbmdzXHJcblx0YXV0b0FkZFRhc2tQcmVmaXg/OiBib29sZWFuOyAvLyBXaGV0aGVyIHRvIGF1dG8tYWRkIHRhc2sgcHJlZml4XHJcblx0dGFza1ByZWZpeD86IHN0cmluZzsgLy8gVGhlIHByZWZpeCB0byBhZGQgKGUuZy4sIFwiLSBbIF1cIilcclxuXHQvLyBNaW5pbWFsIG1vZGUgc2V0dGluZ3NcclxuXHRlbmFibGVNaW5pbWFsTW9kZTogYm9vbGVhbjtcclxuXHRtaW5pbWFsTW9kZVNldHRpbmdzOiB7XHJcblx0XHRzdWdnZXN0VHJpZ2dlcjogc3RyaW5nO1xyXG5cdH07XHJcblx0Ly8gTmV3IGVuaGFuY2VkIHNldHRpbmdzXHJcblx0a2VlcE9wZW5BZnRlckNhcHR1cmU/OiBib29sZWFuOyAvLyBLZWVwIG1vZGFsIG9wZW4gYWZ0ZXIgY2FwdHVyZVxyXG5cdHJlbWVtYmVyTGFzdE1vZGU/OiBib29sZWFuOyAvLyBSZW1lbWJlciB0aGUgbGFzdCB1c2VkIG1vZGVcclxuXHRsYXN0VXNlZE1vZGU/OiBcImNoZWNrYm94XCIgfCBcImZpbGVcIjsgLy8gTGFzdCB1c2VkIHNhdmUgc3RyYXRlZ3kgbW9kZVxyXG5cdGRlZmF1bHRGaWxlTmFtZVRlbXBsYXRlPzogc3RyaW5nOyAvLyBEZWZhdWx0IHRlbXBsYXRlIGZvciBmaWxlIG5hbWVzXHJcblx0ZGVmYXVsdEZpbGVMb2NhdGlvbj86IHN0cmluZzsgLy8gRGVmYXVsdCBmb2xkZXIgZm9yIG5ldyBmaWxlc1xyXG5cdGNyZWF0ZUZpbGVNb2RlPzoge1xyXG5cdFx0ZGVmYXVsdEZvbGRlcjogc3RyaW5nOyAvLyBEZWZhdWx0IGZvbGRlciBmb3IgZmlsZSBjcmVhdGlvblxyXG5cdFx0dXNlVGVtcGxhdGU6IGJvb2xlYW47IC8vIFdoZXRoZXIgdG8gdXNlIGEgdGVtcGxhdGUgZm9yIG5ldyBmaWxlc1xyXG5cdFx0dGVtcGxhdGVGb2xkZXI/OiBzdHJpbmc7IC8vIEZvbGRlciBjb250YWluaW5nIGF2YWlsYWJsZSB0ZW1wbGF0ZXNcclxuXHRcdHRlbXBsYXRlRmlsZTogc3RyaW5nOyAvLyBUZW1wbGF0ZSBmaWxlIHBhdGhcclxuXHRcdHdyaXRlQ29udGVudFRhZ3NUb0Zyb250bWF0dGVyPzogYm9vbGVhbjsgLy8gV2hlbiB0cnVlLCB3cml0ZSAjdGFncyBmcm9tIGNvbnRlbnQgaW50byBmcm9udG1hdHRlci50YWdzIChtZXJnZWQsIGRlZHVwZWQpXHJcblx0fTtcclxufVxyXG5cclxuLyoqIERlZmluZSB0aGUgc3RydWN0dXJlIGZvciB0YXNrIGd1dHRlciBzZXR0aW5ncyAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIFRhc2tHdXR0ZXJTZXR0aW5ncyB7XHJcblx0ZW5hYmxlVGFza0d1dHRlcjogYm9vbGVhbjtcclxufVxyXG5cclxuLyoqIERlZmluZSB0aGUgc3RydWN0dXJlIGZvciB3b3JrZmxvdyBzdGFnZSAqL1xyXG5cclxuLy8gSW50ZXJmYWNlIGZvciB3b3JrZmxvdyBkZWZpbml0aW9uXHJcbmV4cG9ydCBpbnRlcmZhY2UgV29ya2Zsb3dTdGFnZSB7XHJcblx0aWQ6IHN0cmluZztcclxuXHRuYW1lOiBzdHJpbmc7XHJcblx0dHlwZTogXCJsaW5lYXJcIiB8IFwiY3ljbGVcIiB8IFwidGVybWluYWxcIjtcclxuXHRuZXh0Pzogc3RyaW5nIHwgc3RyaW5nW107XHJcblx0c3ViU3RhZ2VzPzogQXJyYXk8e1xyXG5cdFx0aWQ6IHN0cmluZztcclxuXHRcdG5hbWU6IHN0cmluZztcclxuXHRcdG5leHQ/OiBzdHJpbmc7XHJcblx0fT47XHJcblx0Y2FuUHJvY2VlZFRvPzogc3RyaW5nW107XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgV29ya2Zsb3dEZWZpbml0aW9uIHtcclxuXHRpZDogc3RyaW5nO1xyXG5cdG5hbWU6IHN0cmluZztcclxuXHRkZXNjcmlwdGlvbjogc3RyaW5nO1xyXG5cdHN0YWdlczogV29ya2Zsb3dTdGFnZVtdO1xyXG5cdG1ldGFkYXRhOiB7XHJcblx0XHR2ZXJzaW9uOiBzdHJpbmc7XHJcblx0XHRjcmVhdGVkOiBzdHJpbmc7XHJcblx0XHRsYXN0TW9kaWZpZWQ6IHN0cmluZztcclxuXHR9O1xyXG59XHJcblxyXG4vKiogRGVmaW5lIHRoZSBzdHJ1Y3R1cmUgZm9yIHdvcmtmbG93IHNldHRpbmdzICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgV29ya2Zsb3dTZXR0aW5ncyB7XHJcblx0ZW5hYmxlV29ya2Zsb3c6IGJvb2xlYW47XHJcblx0YXV0b0FkZFRpbWVzdGFtcDogYm9vbGVhbjtcclxuXHR0aW1lc3RhbXBGb3JtYXQ6IHN0cmluZztcclxuXHRyZW1vdmVUaW1lc3RhbXBPblRyYW5zaXRpb246IGJvb2xlYW47XHJcblx0Y2FsY3VsYXRlU3BlbnRUaW1lOiBib29sZWFuO1xyXG5cdHNwZW50VGltZUZvcm1hdDogc3RyaW5nO1xyXG5cdGNhbGN1bGF0ZUZ1bGxTcGVudFRpbWU6IGJvb2xlYW47XHJcblx0YXV0b1JlbW92ZUxhc3RTdGFnZU1hcmtlcjogYm9vbGVhbjtcclxuXHRhdXRvQWRkTmV4dFRhc2s6IGJvb2xlYW47XHJcblx0ZGVmaW5pdGlvbnM6IFdvcmtmbG93RGVmaW5pdGlvbltdOyAvLyBVc2VzIHRoZSBsb2NhbCBXb3JrZmxvd0RlZmluaXRpb25cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBSZXdhcmRJdGVtIHtcclxuXHRpZDogc3RyaW5nOyAvLyBVbmlxdWUgaWRlbnRpZmllciBmb3IgdGhlIHJld2FyZCBpdGVtXHJcblx0bmFtZTogc3RyaW5nOyAvLyBUaGUgcmV3YXJkIHRleHRcclxuXHRvY2N1cnJlbmNlOiBzdHJpbmc7IC8vIE5hbWUgb2YgdGhlIG9jY3VycmVuY2UgbGV2ZWwgKGUuZy4sIFwiY29tbW9uXCIsIFwicmFyZVwiKVxyXG5cdGludmVudG9yeTogbnVtYmVyOyAvLyBSZW1haW5pbmcgY291bnQgKC0xIGZvciB1bmxpbWl0ZWQpXHJcblx0aW1hZ2VVcmw/OiBzdHJpbmc7IC8vIE9wdGlvbmFsIGltYWdlIFVSTFxyXG5cdGNvbmRpdGlvbj86IHN0cmluZzsgLy8gT3B0aW9uYWwgY29uZGl0aW9uIHN0cmluZyBmb3IgdHJpZ2dlcmluZyAoZS5nLiwgXCIjcHJvamVjdCBBTkQgI21pbGVzdG9uZVwiKVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE9jY3VycmVuY2VMZXZlbCB7XHJcblx0bmFtZTogc3RyaW5nO1xyXG5cdGNoYW5jZTogbnVtYmVyOyAvLyBQcm9iYWJpbGl0eSBwZXJjZW50YWdlIChlLmcuLCA3MCBmb3IgNzAlKVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJld2FyZFNldHRpbmdzIHtcclxuXHRlbmFibGVSZXdhcmRzOiBib29sZWFuO1xyXG5cdHJld2FyZEl0ZW1zOiBSZXdhcmRJdGVtW107XHJcblx0b2NjdXJyZW5jZUxldmVsczogT2NjdXJyZW5jZUxldmVsW107XHJcblx0c2hvd1Jld2FyZFR5cGU6IFwibW9kYWxcIiB8IFwibm90aWNlXCI7IC8vIFR5cGUgb2YgcmV3YXJkIGRpc3BsYXkgLSBtb2RhbCAoZGVmYXVsdCkgb3Igbm90aWNlXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSGFiaXRTZXR0aW5ncyB7XHJcblx0ZW5hYmxlSGFiaXRzOiBib29sZWFuO1xyXG5cdGhhYml0czogQmFzZUhhYml0RGF0YVtdOyAvLyDlrZjlgqjln7rnoYDkuaDmg6/mlbDmja7vvIzkuI3ljIXlkKtjb21wbGV0aW9uc+Wtl+autVxyXG59XHJcblxyXG4vKiogRGVmaW5lIHRoZSBzdHJ1Y3R1cmUgZm9yIGF1dG8gZGF0ZSBtYW5hZ2VyIHNldHRpbmdzICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgQXV0b0RhdGVNYW5hZ2VyU2V0dGluZ3Mge1xyXG5cdGVuYWJsZWQ6IGJvb2xlYW47XHJcblx0bWFuYWdlQ29tcGxldGVkRGF0ZTogYm9vbGVhbjtcclxuXHRtYW5hZ2VTdGFydERhdGU6IGJvb2xlYW47XHJcblx0bWFuYWdlQ2FuY2VsbGVkRGF0ZTogYm9vbGVhbjtcclxuXHRjb21wbGV0ZWREYXRlRm9ybWF0OiBzdHJpbmc7XHJcblx0c3RhcnREYXRlRm9ybWF0OiBzdHJpbmc7XHJcblx0Y2FuY2VsbGVkRGF0ZUZvcm1hdDogc3RyaW5nO1xyXG5cdGNvbXBsZXRlZERhdGVNYXJrZXI6IHN0cmluZztcclxuXHRzdGFydERhdGVNYXJrZXI6IHN0cmluZztcclxuXHRjYW5jZWxsZWREYXRlTWFya2VyOiBzdHJpbmc7XHJcbn1cclxuXHJcbi8vIERlZmluZSBTb3J0Q3JpdGVyaW9uIGludGVyZmFjZSAoaWYgbm90IGFscmVhZHkgcHJlc2VudClcclxuZXhwb3J0IGludGVyZmFjZSBTb3J0Q3JpdGVyaW9uIHtcclxuXHRmaWVsZDpcclxuXHRcdHwgXCJzdGF0dXNcIlxyXG5cdFx0fCBcImNvbXBsZXRlZFwiXHJcblx0XHR8IFwicHJpb3JpdHlcIlxyXG5cdFx0fCBcImR1ZURhdGVcIlxyXG5cdFx0fCBcInN0YXJ0RGF0ZVwiXHJcblx0XHR8IFwic2NoZWR1bGVkRGF0ZVwiXHJcblx0XHR8IFwiY3JlYXRlZERhdGVcIlxyXG5cdFx0fCBcImNvbXBsZXRlZERhdGVcIlxyXG5cdFx0fCBcImNvbnRlbnRcIlxyXG5cdFx0fCBcInRhZ3NcIlxyXG5cdFx0fCBcInByb2plY3RcIlxyXG5cdFx0fCBcImNvbnRleHRcIlxyXG5cdFx0fCBcInJlY3VycmVuY2VcIlxyXG5cdFx0fCBcImZpbGVQYXRoXCJcclxuXHRcdHwgXCJsaW5lTnVtYmVyXCI7IC8vIEZpZWxkcyB0byBzb3J0IGJ5XHJcblx0b3JkZXI6IFwiYXNjXCIgfCBcImRlc2NcIjsgLy8gU29ydCBvcmRlclxyXG59XHJcblxyXG4vKiogRGVmaW5lIHRoZSBzdHJ1Y3R1cmUgZm9yIGJldGEgdGVzdCBzZXR0aW5ncyAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIEJldGFUZXN0U2V0dGluZ3Mge1xyXG5cdGVuYWJsZUJhc2VWaWV3OiBib29sZWFuO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEZsdWVudFZpZXdTZXR0aW5ncyB7XHJcblx0ZW5hYmxlRmx1ZW50OiBib29sZWFuO1xyXG5cdHNob3dGbHVlbnRSaWJib246IGJvb2xlYW47XHJcblx0d29ya3NwYWNlcz86IEFycmF5PHtcclxuXHRcdGlkOiBzdHJpbmc7XHJcblx0XHRuYW1lOiBzdHJpbmc7XHJcblx0XHRjb2xvcjogc3RyaW5nO1xyXG5cdFx0c2V0dGluZ3M/OiBhbnk7XHJcblx0fT47XHJcblx0dXNlV29ya3NwYWNlU2lkZUxlYXZlcz86IGJvb2xlYW47XHJcblx0Zmx1ZW50Q29uZmlnPzoge1xyXG5cdFx0ZW5hYmxlV29ya3NwYWNlczogYm9vbGVhbjtcclxuXHRcdGRlZmF1bHRXb3Jrc3BhY2U/OiBzdHJpbmc7XHJcblx0XHRzaG93VG9wTmF2aWdhdGlvbjogYm9vbGVhbjtcclxuXHRcdHNob3dOZXdTaWRlYmFyOiBib29sZWFuO1xyXG5cdFx0YWxsb3dWaWV3U3dpdGNoaW5nOiBib29sZWFuO1xyXG5cdFx0cGVyc2lzdFZpZXdNb2RlOiBib29sZWFuO1xyXG5cdFx0bWF4T3RoZXJWaWV3c0JlZm9yZU92ZXJmbG93PzogbnVtYmVyOyAvLyBob3cgbWFueSBvdGhlciB2aWV3cyB0byBzaG93IGJlZm9yZSBvdmVyZmxvdyBtZW51XHJcblx0fTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBFeHBlcmltZW50YWxTZXR0aW5ncyB7XHJcblx0ZW5hYmxlRmx1ZW50OiBib29sZWFuO1xyXG5cdHNob3dGbHVlbnRSaWJib246IGJvb2xlYW47XHJcblx0d29ya3NwYWNlcz86IEFycmF5PHtcclxuXHRcdGlkOiBzdHJpbmc7XHJcblx0XHRuYW1lOiBzdHJpbmc7XHJcblx0XHRjb2xvcjogc3RyaW5nO1xyXG5cdFx0c2V0dGluZ3M/OiBhbnk7XHJcblx0fT47XHJcblx0dXNlV29ya3NwYWNlU2lkZUxlYXZlcz86IGJvb2xlYW47XHJcblx0Zmx1ZW50Q29uZmlnPzoge1xyXG5cdFx0ZW5hYmxlV29ya3NwYWNlczogYm9vbGVhbjtcclxuXHRcdGRlZmF1bHRXb3Jrc3BhY2U/OiBzdHJpbmc7XHJcblx0XHRzaG93VG9wTmF2aWdhdGlvbjogYm9vbGVhbjtcclxuXHRcdHNob3dOZXdTaWRlYmFyOiBib29sZWFuO1xyXG5cdFx0YWxsb3dWaWV3U3dpdGNoaW5nOiBib29sZWFuO1xyXG5cdFx0cGVyc2lzdFZpZXdNb2RlOiBib29sZWFuO1xyXG5cdFx0bWF4T3RoZXJWaWV3c0JlZm9yZU92ZXJmbG93PzogbnVtYmVyOyAvLyBob3cgbWFueSBvdGhlciB2aWV3cyB0byBzaG93IGJlZm9yZSBvdmVyZmxvdyBtZW51XHJcblx0fTtcclxufVxyXG5cclxuLyoqIFByb2plY3QgcGF0aCBtYXBwaW5nIGNvbmZpZ3VyYXRpb24gKi9cclxuZXhwb3J0IGludGVyZmFjZSBQcm9qZWN0UGF0aE1hcHBpbmcge1xyXG5cdC8qKiBQYXRoIHBhdHRlcm4gKHN1cHBvcnRzIGdsb2IgcGF0dGVybnMpICovXHJcblx0cGF0aFBhdHRlcm46IHN0cmluZztcclxuXHQvKiogUHJvamVjdCBuYW1lIGZvciB0aGlzIHBhdGggKi9cclxuXHRwcm9qZWN0TmFtZTogc3RyaW5nO1xyXG5cdC8qKiBXaGV0aGVyIHRoaXMgbWFwcGluZyBpcyBlbmFibGVkICovXHJcblx0ZW5hYmxlZDogYm9vbGVhbjtcclxufVxyXG5cclxuLyoqIEZpbGUgbWV0YWRhdGEgaW5oZXJpdGFuY2UgY29uZmlndXJhdGlvbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVNZXRhZGF0YUluaGVyaXRhbmNlQ29uZmlnIHtcclxuXHQvKiogV2hldGhlciBmaWxlIG1ldGFkYXRhIGluaGVyaXRhbmNlIGlzIGVuYWJsZWQgKi9cclxuXHRlbmFibGVkOiBib29sZWFuO1xyXG5cdC8qKiBXaGV0aGVyIHRvIGluaGVyaXQgZnJvbSBmaWxlIGZyb250bWF0dGVyICovXHJcblx0aW5oZXJpdEZyb21Gcm9udG1hdHRlcjogYm9vbGVhbjtcclxuXHQvKiogV2hldGhlciBzdWJ0YXNrcyBzaG91bGQgaW5oZXJpdCBtZXRhZGF0YSBmcm9tIGZpbGUgZnJvbnRtYXR0ZXIgKi9cclxuXHRpbmhlcml0RnJvbUZyb250bWF0dGVyRm9yU3VidGFza3M6IGJvb2xlYW47XHJcbn1cclxuXHJcbi8qKiBQcm9qZWN0IGRldGVjdGlvbiBtZXRob2QgY29uZmlndXJhdGlvbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIFByb2plY3REZXRlY3Rpb25NZXRob2Qge1xyXG5cdC8qKiBUeXBlIG9mIGRldGVjdGlvbiBtZXRob2QgKi9cclxuXHR0eXBlOiBcIm1ldGFkYXRhXCIgfCBcInRhZ1wiIHwgXCJsaW5rXCI7XHJcblx0LyoqIEZvciBtZXRhZGF0YTogdGhlIHByb3BlcnR5IGtleSAoZS5nLiwgXCJwcm9qZWN0XCIpXHJcblx0ICogIEZvciB0YWc6IHRoZSB0YWcgbmFtZSAoZS5nLiwgXCJwcm9qZWN0XCIpXHJcblx0ICogIEZvciBsaW5rOiB0aGUgcHJvcGVydHkga2V5IHRoYXQgY29udGFpbnMgbGlua3MgKGUuZy4sIFwia2luZFwiLCBcImNhdGVnb3J5XCIpICovXHJcblx0cHJvcGVydHlLZXk6IHN0cmluZztcclxuXHQvKiogRm9yIGxpbmsgdHlwZTogb3B0aW9uYWwgZmlsdGVyIGZvciBsaW5rIHZhbHVlcyAoZS5nLiwgb25seSBsaW5rcyBjb250YWluaW5nIFwiUHJvamVjdFwiKSAqL1xyXG5cdGxpbmtGaWx0ZXI/OiBzdHJpbmc7XHJcblx0LyoqIFdoZXRoZXIgdGhpcyBtZXRob2QgaXMgZW5hYmxlZCAqL1xyXG5cdGVuYWJsZWQ6IGJvb2xlYW47XHJcbn1cclxuXHJcbi8qKiBQcm9qZWN0IG1ldGFkYXRhIGNvbmZpZ3VyYXRpb24gKi9cclxuZXhwb3J0IGludGVyZmFjZSBQcm9qZWN0TWV0YWRhdGFDb25maWcge1xyXG5cdC8qKiBNZXRhZGF0YSBrZXkgdG8gdXNlIGZvciBwcm9qZWN0IG5hbWUgKGxlZ2FjeSwga2VwdCBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSkgKi9cclxuXHRtZXRhZGF0YUtleTogc3RyaW5nO1xyXG5cdC8qKiBXaGV0aGVyIHRoaXMgY29uZmlnIGlzIGVuYWJsZWQgKi9cclxuXHRlbmFibGVkOiBib29sZWFuO1xyXG5cdC8qKiBDdXN0b20gZGV0ZWN0aW9uIG1ldGhvZHMgZm9yIGlkZW50aWZ5aW5nIHByb2plY3QgZmlsZXMgKi9cclxuXHRkZXRlY3Rpb25NZXRob2RzPzogUHJvamVjdERldGVjdGlvbk1ldGhvZFtdO1xyXG59XHJcblxyXG4vKiogUHJvamVjdCBjb25maWd1cmF0aW9uIGZpbGUgc2V0dGluZ3MgKi9cclxuZXhwb3J0IGludGVyZmFjZSBQcm9qZWN0Q29uZmlnRmlsZSB7XHJcblx0LyoqIE5hbWUgb2YgdGhlIHByb2plY3QgY29uZmlndXJhdGlvbiBmaWxlICovXHJcblx0ZmlsZU5hbWU6IHN0cmluZztcclxuXHQvKiogV2hldGhlciB0byBzZWFyY2ggcmVjdXJzaXZlbHkgdXAgdGhlIGRpcmVjdG9yeSB0cmVlICovXHJcblx0c2VhcmNoUmVjdXJzaXZlbHk6IGJvb2xlYW47XHJcblx0LyoqIFdoZXRoZXIgdGhpcyBmZWF0dXJlIGlzIGVuYWJsZWQgKi9cclxuXHRlbmFibGVkOiBib29sZWFuO1xyXG59XHJcblxyXG4vKiogTWV0YWRhdGEgbWFwcGluZyBjb25maWd1cmF0aW9uICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgTWV0YWRhdGFNYXBwaW5nIHtcclxuXHQvKiogU291cmNlIG1ldGFkYXRhIGtleSAqL1xyXG5cdHNvdXJjZUtleTogc3RyaW5nO1xyXG5cdC8qKiBUYXJnZXQgbWV0YWRhdGEga2V5ICovXHJcblx0dGFyZ2V0S2V5OiBzdHJpbmc7XHJcblx0LyoqIFdoZXRoZXIgdGhpcyBtYXBwaW5nIGlzIGVuYWJsZWQgKi9cclxuXHRlbmFibGVkOiBib29sZWFuO1xyXG59XHJcblxyXG4vKiogRGVmYXVsdCBwcm9qZWN0IG5hbWluZyBzdHJhdGVneSAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIFByb2plY3ROYW1pbmdTdHJhdGVneSB7XHJcblx0LyoqIE5hbWluZyBzdHJhdGVneSB0eXBlICovXHJcblx0c3RyYXRlZ3k6IFwiZmlsZW5hbWVcIiB8IFwiZm9sZGVybmFtZVwiIHwgXCJtZXRhZGF0YVwiO1xyXG5cdC8qKiBNZXRhZGF0YSBrZXkgZm9yIG1ldGFkYXRhIHN0cmF0ZWd5ICovXHJcblx0bWV0YWRhdGFLZXk/OiBzdHJpbmc7XHJcblx0LyoqIFdoZXRoZXIgdG8gc3RyaXAgZmlsZSBleHRlbnNpb24gZm9yIGZpbGVuYW1lIHN0cmF0ZWd5ICovXHJcblx0c3RyaXBFeHRlbnNpb24/OiBib29sZWFuO1xyXG5cdC8qKiBXaGV0aGVyIHRoaXMgc3RyYXRlZ3kgaXMgZW5hYmxlZCAqL1xyXG5cdGVuYWJsZWQ6IGJvb2xlYW47XHJcbn1cclxuXHJcbi8qKiBDdXN0b20gcHJvamVjdCBkZWZpbml0aW9uIGZvciBWMiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIEN1c3RvbVByb2plY3Qge1xyXG5cdGlkOiBzdHJpbmc7XHJcblx0bmFtZTogc3RyaW5nOyAvLyBJbnRlcm5hbCBuYW1lIHdpdGggZGFzaGVzIGZvciBtZXRhZGF0YVxyXG5cdGRpc3BsYXlOYW1lPzogc3RyaW5nOyAvLyBPcmlnaW5hbCBuYW1lIHdpdGggc3BhY2VzIGZvciBkaXNwbGF5XHJcblx0Y29sb3I6IHN0cmluZztcclxuXHRjcmVhdGVkQXQ6IG51bWJlcjtcclxuXHR1cGRhdGVkQXQ6IG51bWJlcjtcclxufVxyXG5cclxuLyoqIEVuaGFuY2VkIHByb2plY3QgY29uZmlndXJhdGlvbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIFByb2plY3RDb25maWd1cmF0aW9uIHtcclxuXHQvKiogUGF0aC1iYXNlZCBwcm9qZWN0IG1hcHBpbmdzICovXHJcblx0cGF0aE1hcHBpbmdzOiBQcm9qZWN0UGF0aE1hcHBpbmdbXTtcclxuXHQvKiogTWV0YWRhdGEtYmFzZWQgcHJvamVjdCBjb25maWd1cmF0aW9uICovXHJcblx0bWV0YWRhdGFDb25maWc6IFByb2plY3RNZXRhZGF0YUNvbmZpZztcclxuXHQvKiogUHJvamVjdCBjb25maWd1cmF0aW9uIGZpbGUgc2V0dGluZ3MgKi9cclxuXHRjb25maWdGaWxlOiBQcm9qZWN0Q29uZmlnRmlsZTtcclxuXHQvKiogV2hldGhlciB0byBlbmFibGUgZW5oYW5jZWQgcHJvamVjdCBmZWF0dXJlcyAqL1xyXG5cdGVuYWJsZUVuaGFuY2VkUHJvamVjdDogYm9vbGVhbjtcclxuXHQvKiogTWV0YWRhdGEga2V5IG1hcHBpbmdzICovXHJcblx0bWV0YWRhdGFNYXBwaW5nczogTWV0YWRhdGFNYXBwaW5nW107XHJcblx0LyoqIERlZmF1bHQgcHJvamVjdCBuYW1pbmcgc3RyYXRlZ3kgKi9cclxuXHRkZWZhdWx0UHJvamVjdE5hbWluZzogUHJvamVjdE5hbWluZ1N0cmF0ZWd5O1xyXG5cdC8qKiBDdXN0b20gcHJvamVjdHMgZm9yIFYyICovXHJcblx0Y3VzdG9tUHJvamVjdHM/OiBDdXN0b21Qcm9qZWN0W107XHJcbn1cclxuXHJcbi8qKiBGaWxlIHBhcnNpbmcgY29uZmlndXJhdGlvbiBmb3IgZXh0cmFjdGluZyB0YXNrcyBmcm9tIGZpbGUgbWV0YWRhdGEgYW5kIHRhZ3MgKi9cclxuZXhwb3J0IGludGVyZmFjZSBGaWxlUGFyc2luZ0NvbmZpZ3VyYXRpb24ge1xyXG5cdC8qKiBFbmFibGUgcGFyc2luZyB0YXNrcyBmcm9tIGZpbGUgbWV0YWRhdGEgKi9cclxuXHRlbmFibGVGaWxlTWV0YWRhdGFQYXJzaW5nOiBib29sZWFuO1xyXG5cdC8qKiBNZXRhZGF0YSBmaWVsZHMgdGhhdCBzaG91bGQgYmUgdHJlYXRlZCBhcyB0YXNrcyAoZS5nLiwgXCJkdWVEYXRlXCIsIFwidG9kb1wiLCBcImNvbXBsZXRlXCIpICovXHJcblx0bWV0YWRhdGFGaWVsZHNUb1BhcnNlQXNUYXNrczogc3RyaW5nW107XHJcblx0LyoqIEVuYWJsZSBwYXJzaW5nIHRhc2tzIGZyb20gZmlsZSB0YWdzICovXHJcblx0ZW5hYmxlVGFnQmFzZWRUYXNrUGFyc2luZzogYm9vbGVhbjtcclxuXHQvKiogVGFncyB0aGF0IHNob3VsZCBiZSB0cmVhdGVkIGFzIHRhc2tzIChlLmcuLCBcIiN0b2RvXCIsIFwiI3Rhc2tcIiwgXCIjYWN0aW9uXCIpICovXHJcblx0dGFnc1RvUGFyc2VBc1Rhc2tzOiBzdHJpbmdbXTtcclxuXHQvKiogV2hpY2ggbWV0YWRhdGEgZmllbGQgdG8gdXNlIGFzIHRhc2sgY29udGVudCAoZGVmYXVsdDogXCJ0aXRsZVwiIG9yIGZpbGVuYW1lKSAqL1xyXG5cdHRhc2tDb250ZW50RnJvbU1ldGFkYXRhOiBzdHJpbmc7XHJcblx0LyoqIERlZmF1bHQgc3RhdHVzIGZvciB0YXNrcyBjcmVhdGVkIGZyb20gbWV0YWRhdGEgKGRlZmF1bHQ6IFwiIFwiIGZvciBpbmNvbXBsZXRlKSAqL1xyXG5cdGRlZmF1bHRUYXNrU3RhdHVzOiBzdHJpbmc7XHJcblx0LyoqIFdoZXRoZXIgdG8gdXNlIHdvcmtlciBmb3IgZmlsZSBwYXJzaW5nIHBlcmZvcm1hbmNlICovXHJcblx0ZW5hYmxlV29ya2VyUHJvY2Vzc2luZzogYm9vbGVhbjtcclxuXHQvKiogV2hldGhlciB0byBlbmFibGUgbXRpbWUtYmFzZWQgY2FjaGUgb3B0aW1pemF0aW9uICovXHJcblx0ZW5hYmxlTXRpbWVPcHRpbWl6YXRpb246IGJvb2xlYW47XHJcblx0LyoqIE1heGltdW0gbnVtYmVyIG9mIGZpbGVzIHRvIHRyYWNrIGluIG10aW1lIGNhY2hlICovXHJcblx0bXRpbWVDYWNoZVNpemU6IG51bWJlcjtcclxufVxyXG5cclxuLyoqIFRpbWVsaW5lIFNpZGViYXIgU2V0dGluZ3MgKi9cclxuZXhwb3J0IGludGVyZmFjZSBUaW1lbGluZVNpZGViYXJTZXR0aW5ncyB7XHJcblx0ZW5hYmxlVGltZWxpbmVTaWRlYmFyOiBib29sZWFuO1xyXG5cdGF1dG9PcGVuT25TdGFydHVwOiBib29sZWFuO1xyXG5cdHNob3dDb21wbGV0ZWRUYXNrczogYm9vbGVhbjtcclxuXHRmb2N1c01vZGVCeURlZmF1bHQ6IGJvb2xlYW47XHJcblx0bWF4RXZlbnRzVG9TaG93OiBudW1iZXI7XHJcblx0Ly8gUXVpY2sgaW5wdXQgY29sbGFwc2Ugc2V0dGluZ3NcclxuXHRxdWlja0lucHV0Q29sbGFwc2VkOiBib29sZWFuO1xyXG5cdHF1aWNrSW5wdXREZWZhdWx0SGVpZ2h0OiBudW1iZXI7XHJcblx0cXVpY2tJbnB1dEFuaW1hdGlvbkR1cmF0aW9uOiBudW1iZXI7XHJcblx0cXVpY2tJbnB1dENvbGxhcHNlT25DYXB0dXJlOiBib29sZWFuO1xyXG5cdHF1aWNrSW5wdXRTaG93UXVpY2tBY3Rpb25zOiBib29sZWFuO1xyXG59XHJcblxyXG4vKiogVGFzayBUaW1lciBNZXRhZGF0YSBEZXRlY3Rpb24gU2V0dGluZ3MgKi9cclxuZXhwb3J0IGludGVyZmFjZSBUYXNrVGltZXJNZXRhZGF0YURldGVjdGlvbiB7XHJcblx0ZnJvbnRtYXR0ZXI6IHN0cmluZztcclxuXHRmb2xkZXJzOiBzdHJpbmdbXTtcclxuXHR0YWdzOiBzdHJpbmdbXTtcclxufVxyXG5cclxuLyoqIFRhc2sgVGltZXIgU2V0dGluZ3MgKi9cclxuZXhwb3J0IGludGVyZmFjZSBUYXNrVGltZXJTZXR0aW5ncyB7XHJcblx0ZW5hYmxlZDogYm9vbGVhbjtcclxuXHRtZXRhZGF0YURldGVjdGlvbjogVGFza1RpbWVyTWV0YWRhdGFEZXRlY3Rpb247XHJcblx0dGltZUZvcm1hdDogc3RyaW5nO1xyXG5cdGJsb2NrUmVmUHJlZml4OiBzdHJpbmc7XHJcbn1cclxuXHJcbi8qKiBPbkNvbXBsZXRpb24gU2V0dGluZ3MgKi9cclxuZXhwb3J0IGludGVyZmFjZSBPbkNvbXBsZXRpb25TZXR0aW5ncyB7XHJcblx0LyoqIFdoZXRoZXIgb25Db21wbGV0aW9uIGZ1bmN0aW9uYWxpdHkgaXMgZW5hYmxlZCAqL1xyXG5cdGVuYWJsZU9uQ29tcGxldGlvbjogYm9vbGVhbjtcclxuXHQvKiogRGVmYXVsdCBhcmNoaXZlIGZpbGUgcGF0aCBmb3IgYXJjaGl2ZSBvcGVyYXRpb25zICovXHJcblx0ZGVmYXVsdEFyY2hpdmVGaWxlOiBzdHJpbmc7XHJcblx0LyoqIERlZmF1bHQgYXJjaGl2ZSBzZWN0aW9uIG5hbWUgKi9cclxuXHRkZWZhdWx0QXJjaGl2ZVNlY3Rpb246IHN0cmluZztcclxuXHQvKiogV2hldGhlciB0byBzaG93IGFkdmFuY2VkIGNvbmZpZ3VyYXRpb24gb3B0aW9ucyBpbiBVSSAqL1xyXG5cdHNob3dBZHZhbmNlZE9wdGlvbnM6IGJvb2xlYW47XHJcbn1cclxuXHJcbi8qKiBGaWxlIEZpbHRlciBTZXR0aW5ncyAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVGaWx0ZXJSdWxlIHtcclxuXHR0eXBlOiBcImZpbGVcIiB8IFwiZm9sZGVyXCIgfCBcInBhdHRlcm5cIjtcclxuXHRwYXRoOiBzdHJpbmc7XHJcblx0ZW5hYmxlZDogYm9vbGVhbjtcclxuXHRzY29wZT86IFwiYm90aFwiIHwgXCJpbmxpbmVcIiB8IFwiZmlsZVwiOyAvLyBwZXItcnVsZSBzY29wZSAoZGVmYXVsdCBib3RoKVxyXG59XHJcblxyXG5leHBvcnQgZW51bSBGaWx0ZXJNb2RlIHtcclxuXHRXSElURUxJU1QgPSBcIndoaXRlbGlzdFwiLFxyXG5cdEJMQUNLTElTVCA9IFwiYmxhY2tsaXN0XCIsXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRmlsZUZpbHRlclNjb3BlQ29udHJvbHMge1xyXG5cdGlubGluZVRhc2tzRW5hYmxlZDogYm9vbGVhbjtcclxuXHRmaWxlVGFza3NFbmFibGVkOiBib29sZWFuO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVGaWx0ZXJTZXR0aW5ncyB7XHJcblx0ZW5hYmxlZDogYm9vbGVhbjtcclxuXHRtb2RlOiBGaWx0ZXJNb2RlO1xyXG5cdHJ1bGVzOiBGaWxlRmlsdGVyUnVsZVtdO1xyXG5cdHNjb3BlQ29udHJvbHM/OiBGaWxlRmlsdGVyU2NvcGVDb250cm9scztcclxufVxyXG5cclxuLyoqIE1DUCBTZXJ2ZXIgQ29uZmlndXJhdGlvbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIE1jcFNlcnZlckNvbmZpZyB7XHJcblx0ZW5hYmxlZDogYm9vbGVhbjtcclxuXHRwb3J0OiBudW1iZXI7XHJcblx0aG9zdDogc3RyaW5nO1xyXG5cdGF1dGhUb2tlbjogc3RyaW5nO1xyXG5cdGVuYWJsZUNvcnM6IGJvb2xlYW47XHJcblx0bG9nTGV2ZWw6IFwiZGVidWdcIiB8IFwiaW5mb1wiIHwgXCJ3YXJuXCIgfCBcImVycm9yXCI7XHJcbn1cclxuXHJcbi8qKiBOb3RpZmljYXRpb25zIHNldHRpbmdzICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgTm90aWZpY2F0aW9uU2V0dGluZ3Mge1xyXG5cdGVuYWJsZWQ6IGJvb2xlYW47XHJcblx0LyoqIFNlbmQgYSBzaW5nbGUgZGFpbHkgc3VtbWFyeSBmb3IgdG9kYXkncyB0YXNrcyBhdCBzcGVjaWZpZWQgdGltZSAqL1xyXG5cdGRhaWx5U3VtbWFyeToge1xyXG5cdFx0ZW5hYmxlZDogYm9vbGVhbjtcclxuXHRcdHRpbWU6IHN0cmluZzsgLy8gSEg6bW0gKDI0aClcclxuXHR9O1xyXG5cdC8qKiBOb3RpZnkgYXQgaW5kaXZpZHVhbCB0YXNrIGR1ZSB0aW1lICh3aXRoIG9wdGlvbmFsIGxlYWQpICovXHJcblx0cGVyVGFzazoge1xyXG5cdFx0ZW5hYmxlZDogYm9vbGVhbjtcclxuXHRcdGxlYWRNaW51dGVzOiBudW1iZXI7IC8vIG1pbnV0ZXMgYmVmb3JlIGR1ZVxyXG5cdH07XHJcbn1cclxuXHJcbi8qKiBEZXNrdG9wIGludGVncmF0aW9uIHNldHRpbmdzICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgRGVza3RvcEludGVncmF0aW9uU2V0dGluZ3Mge1xyXG5cdC8qKiBUcnkgdG8gc2hvdyBhIHRyYXkvc3RhdHVzIGl0ZW0gKGRlc2t0b3Agb25seSkuIFJlYWwgc3lzdGVtIHRyYXkgbWF5IG5vdCBiZSBhdmFpbGFibGU7IHBsdWdpbiB3aWxsIGZhbGwgYmFjayB0byBzdGF0dXMgYmFyLiAqL1xyXG5cdGVuYWJsZVRyYXk6IGJvb2xlYW47XHJcblx0LyoqIFdoZXJlIHRvIHNob3cgdGhlIHRyYXkgaW5kaWNhdG9yOiBzeXN0ZW0gdHJheSwgT2JzaWRpYW4gc3RhdHVzIGJhciwgb3IgYm90aCAqL1xyXG5cdHRyYXlNb2RlPzogXCJzeXN0ZW1cIiB8IFwic3RhdHVzXCIgfCBcImJvdGhcIjtcclxufVxyXG5cclxuLyoqIERlZmluZSB0aGUgbWFpbiBzZXR0aW5ncyBzdHJ1Y3R1cmUgKi9cclxuZXhwb3J0IGludGVyZmFjZSBDaGFuZ2Vsb2dTZXR0aW5ncyB7XHJcblx0ZW5hYmxlZDogYm9vbGVhbjtcclxuXHRsYXN0VmVyc2lvbjogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFRhc2tQcm9ncmVzc0JhclNldHRpbmdzIHtcclxuXHQvLyBHZW5lcmFsIFNldHRpbmdzIChFeGFtcGxlKVxyXG5cdHByb2dyZXNzQmFyRGlzcGxheU1vZGU6IFwibm9uZVwiIHwgXCJncmFwaGljYWxcIiB8IFwidGV4dFwiIHwgXCJib3RoXCI7XHJcblx0c3VwcG9ydEhvdmVyVG9TaG93UHJvZ3Jlc3NJbmZvOiBib29sZWFuO1xyXG5cdGFkZFByb2dyZXNzQmFyVG9Ob25UYXNrQnVsbGV0OiBib29sZWFuO1xyXG5cdGFkZFRhc2tQcm9ncmVzc0JhclRvSGVhZGluZzogYm9vbGVhbjtcclxuXHRhZGRQcm9ncmVzc0JhclRvUHJvamVjdHNWaWV3OiBib29sZWFuO1xyXG5cdGVuYWJsZVByb2dyZXNzYmFySW5SZWFkaW5nTW9kZTogYm9vbGVhbjtcclxuXHRjb3VudFN1YkxldmVsOiBib29sZWFuO1xyXG5cdGRpc3BsYXlNb2RlOiBzdHJpbmc7IC8vIGUuZy4sICdwZXJjZW50YWdlJywgJ2JyYWNrZXRQZXJjZW50YWdlJywgJ2ZyYWN0aW9uJywgJ2JyYWNrZXRGcmFjdGlvbicsICdkZXRhaWxlZCcsICdjdXN0b20nLCAncmFuZ2UtYmFzZWQnXHJcblx0Y3VzdG9tRm9ybWF0Pzogc3RyaW5nO1xyXG5cdHNob3dQZXJjZW50YWdlOiBib29sZWFuO1xyXG5cdGN1c3RvbWl6ZVByb2dyZXNzUmFuZ2VzOiBib29sZWFuO1xyXG5cdHByb2dyZXNzUmFuZ2VzOiBBcnJheTx7IG1pbjogbnVtYmVyOyBtYXg6IG51bWJlcjsgdGV4dDogc3RyaW5nIH0+O1xyXG5cdGFsbG93Q3VzdG9tUHJvZ3Jlc3NHb2FsOiBib29sZWFuO1xyXG5cdGhpZGVQcm9ncmVzc0JhckJhc2VkT25Db25kaXRpb25zOiBib29sZWFuO1xyXG5cdGhpZGVQcm9ncmVzc0JhclRhZ3M6IHN0cmluZztcclxuXHRoaWRlUHJvZ3Jlc3NCYXJGb2xkZXJzOiBzdHJpbmc7XHJcblx0aGlkZVByb2dyZXNzQmFyTWV0YWRhdGE6IHN0cmluZztcclxuXHRzaG93UHJvZ3Jlc3NCYXJCYXNlZE9uSGVhZGluZzogc3RyaW5nO1xyXG5cclxuXHQvLyBEZXNrdG9wIGludGVncmF0aW9uIGFuZCBub3RpZmljYXRpb25zXHJcblx0bm90aWZpY2F0aW9ucz86IE5vdGlmaWNhdGlvblNldHRpbmdzO1xyXG5cdGRlc2t0b3BJbnRlZ3JhdGlvbj86IERlc2t0b3BJbnRlZ3JhdGlvblNldHRpbmdzO1xyXG5cclxuXHQvLyBDaGFuZ2Vsb2cgU2V0dGluZ3NcclxuXHRjaGFuZ2Vsb2c6IENoYW5nZWxvZ1NldHRpbmdzO1xyXG5cclxuXHQvLyBQcm9qZWN0IFRyZWUgVmlldyBTZXR0aW5nc1xyXG5cdHByb2plY3RWaWV3RGVmYXVsdE1vZGU6IFwibGlzdFwiIHwgXCJ0cmVlXCI7XHJcblx0cHJvamVjdFRyZWVBdXRvRXhwYW5kOiBib29sZWFuO1xyXG5cdHByb2plY3RUcmVlU2hvd0VtcHR5Rm9sZGVyczogYm9vbGVhbjtcclxuXHRwcm9qZWN0UGF0aFNlcGFyYXRvcjogc3RyaW5nO1xyXG5cclxuXHQvLyBGaWxlIE1ldGFkYXRhIEluaGVyaXRhbmNlIFNldHRpbmdzXHJcblx0ZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2U6IEZpbGVNZXRhZGF0YUluaGVyaXRhbmNlQ29uZmlnO1xyXG5cclxuXHQvLyBDaGVja2JveCBTdGF0dXMgU2V0dGluZ3NcclxuXHRhdXRvQ29tcGxldGVQYXJlbnQ6IGJvb2xlYW47XHJcblx0bWFya1BhcmVudEluUHJvZ3Jlc3NXaGVuUGFydGlhbGx5Q29tcGxldGU6IGJvb2xlYW47XHJcblx0dGFza1N0YXR1c2VzOiBUYXNrU3RhdHVzQ29uZmlnO1xyXG5cdGNvdW50T3RoZXJTdGF0dXNlc0FzOiBzdHJpbmc7IC8vIGUuZy4sICdub3RTdGFydGVkJywgJ2FiYW5kb25lZCcsIGV0Yy5cclxuXHRleGNsdWRlVGFza01hcmtzOiBzdHJpbmc7XHJcblx0dXNlT25seUNvdW50TWFya3M6IGJvb2xlYW47XHJcblx0b25seUNvdW50VGFza01hcmtzOiBzdHJpbmc7XHJcblx0ZW5hYmxlVGFza1N0YXR1c1N3aXRjaGVyOiBib29sZWFuO1xyXG5cdGVuYWJsZUN1c3RvbVRhc2tNYXJrczogYm9vbGVhbjtcclxuXHRlbmFibGVUZXh0TWFya0luU291cmNlTW9kZTogYm9vbGVhbjtcclxuXHRlbmFibGVDeWNsZUNvbXBsZXRlU3RhdHVzOiBib29sZWFuOyAvLyBFbmFibGUgY3ljbGluZyB0aHJvdWdoIHRhc2sgc3RhdHVzZXMgd2hlbiBjbGlja2luZyBvbiB0YXNrIGNoZWNrYm94ZXNcclxuXHR0YXNrU3RhdHVzQ3ljbGU6IHN0cmluZ1tdO1xyXG5cdHRhc2tTdGF0dXNNYXJrczogVGFza1N0YXR1c0N5Y2xlO1xyXG5cdGV4Y2x1ZGVNYXJrc0Zyb21DeWNsZTogc3RyaW5nW107XHJcblxyXG5cdGVuYWJsZVRhc2tHZW5pdXNJY29uczogYm9vbGVhbjtcclxuXHJcblx0Ly8gUHJpb3JpdHkgJiBEYXRlIFNldHRpbmdzXHJcblx0ZW5hYmxlUHJpb3JpdHlQaWNrZXI6IGJvb2xlYW47XHJcblx0ZW5hYmxlUHJpb3JpdHlLZXlib2FyZFNob3J0Y3V0czogYm9vbGVhbjtcclxuXHRlbmFibGVEYXRlUGlja2VyOiBib29sZWFuO1xyXG5cclxuXHQvLyBEYXRlIFBhcnNpbmcgU2V0dGluZ3NcclxuXHRjdXN0b21EYXRlRm9ybWF0czogc3RyaW5nW107XHJcblx0ZW5hYmxlQ3VzdG9tRGF0ZUZvcm1hdHM6IGJvb2xlYW47XHJcblx0cmVjdXJyZW5jZURhdGVCYXNlOiBcImR1ZVwiIHwgXCJzY2hlZHVsZWRcIiB8IFwiY3VycmVudFwiOyAvLyBCYXNlIGRhdGUgZm9yIGNhbGN1bGF0aW5nIG5leHQgcmVjdXJyZW5jZVxyXG5cclxuXHQvLyBUYXNrIEZpbHRlciBTZXR0aW5nc1xyXG5cdHRhc2tGaWx0ZXI6IFRhc2tGaWx0ZXJTZXR0aW5ncztcclxuXHJcblx0Ly8gQ29tcGxldGVkIFRhc2sgTW92ZXIgU2V0dGluZ3NcclxuXHRjb21wbGV0ZWRUYXNrTW92ZXI6IENvbXBsZXRlZFRhc2tNb3ZlclNldHRpbmdzO1xyXG5cclxuXHQvLyBUYXNrIEd1dHRlciBTZXR0aW5nc1xyXG5cdHRhc2tHdXR0ZXI6IFRhc2tHdXR0ZXJTZXR0aW5ncztcclxuXHJcblx0Ly8gUXVpY2sgQ2FwdHVyZSBTZXR0aW5nc1xyXG5cdHF1aWNrQ2FwdHVyZTogUXVpY2tDYXB0dXJlU2V0dGluZ3M7XHJcblxyXG5cdC8vIFdvcmtmbG93IFNldHRpbmdzXHJcblx0d29ya2Zsb3c6IFdvcmtmbG93U2V0dGluZ3M7XHJcblxyXG5cdC8vIEluZGV4IFJlbGF0ZWRcclxuXHR1c2VEYWlseU5vdGVQYXRoQXNEYXRlOiBib29sZWFuO1xyXG5cdGRhaWx5Tm90ZUZvcm1hdDogc3RyaW5nO1xyXG5cdHVzZUFzRGF0ZVR5cGU6IFwiZHVlXCIgfCBcInN0YXJ0XCIgfCBcInNjaGVkdWxlZFwiO1xyXG5cdGRhaWx5Tm90ZVBhdGg6IHN0cmluZztcclxuXHRwcmVmZXJNZXRhZGF0YUZvcm1hdDogXCJkYXRhdmlld1wiIHwgXCJ0YXNrc1wiO1xyXG5cclxuXHQvLyBUYXNrIFBhcnNlciBDb25maWd1cmF0aW9uXHJcblx0cHJvamVjdFRhZ1ByZWZpeDogUmVjb3JkPFwiZGF0YXZpZXdcIiB8IFwidGFza3NcIiwgc3RyaW5nPjsgLy8gQ29uZmlndXJhYmxlIHByb2plY3QgdGFnIHByZWZpeCAoZGVmYXVsdDogXCJwcm9qZWN0XCIpXHJcblx0Y29udGV4dFRhZ1ByZWZpeDogUmVjb3JkPFwiZGF0YXZpZXdcIiB8IFwidGFza3NcIiwgc3RyaW5nPjsgLy8gQ29uZmlndXJhYmxlIGNvbnRleHQgdGFnIHByZWZpeCAoZGVmYXVsdDogXCJjb250ZXh0XCIpXHJcblx0YXJlYVRhZ1ByZWZpeDogUmVjb3JkPFwiZGF0YXZpZXdcIiB8IFwidGFza3NcIiwgc3RyaW5nPjsgLy8gQ29uZmlndXJhYmxlIGFyZWEgdGFnIHByZWZpeCAoZGVmYXVsdDogXCJhcmVhXCIpXHJcblxyXG5cdC8vIEVuaGFuY2VkIFByb2plY3QgQ29uZmlndXJhdGlvblxyXG5cdHByb2plY3RDb25maWc6IFByb2plY3RDb25maWd1cmF0aW9uO1xyXG5cclxuXHQvLyBGaWxlIFBhcnNpbmcgQ29uZmlndXJhdGlvbiAoREVQUkVDQVRFRCAtIHVzZSBmaWxlU291cmNlIGluc3RlYWQpXHJcblx0ZmlsZVBhcnNpbmdDb25maWc6IEZpbGVQYXJzaW5nQ29uZmlndXJhdGlvbjtcclxuXHJcblx0Ly8gRGF0ZSBTZXR0aW5nc1xyXG5cdHVzZVJlbGF0aXZlVGltZUZvckRhdGU6IGJvb2xlYW47XHJcblxyXG5cdC8vIElnbm9yZSBhbGwgdGFza3MgYmVoaW5kIGhlYWRpbmdcclxuXHRpZ25vcmVIZWFkaW5nOiBzdHJpbmc7XHJcblxyXG5cdC8vIEZvY3VzIGFsbCB0YXNrcyBiZWhpbmQgaGVhZGluZ1xyXG5cdGZvY3VzSGVhZGluZzogc3RyaW5nO1xyXG5cclxuXHQvLyBJbmRleGVyIGFuZCBWaWV3IFNldHRpbmdzXHJcblx0ZW5hYmxlSW5kZXhlcjogYm9vbGVhbjsgLy8gRW5hYmxlIFRhc2sgR2VuaXVzIGluZGV4ZXIgZm9yIHdob2xlIHZhdWx0IHNjYW5uaW5nXHJcblx0ZW5hYmxlVmlldzogYm9vbGVhbjsgLy8gRW5hYmxlIFRhc2sgR2VuaXVzIHNpZGViYXIgdmlld3NcclxuXHRlbmFibGVJbmxpbmVFZGl0b3I6IGJvb2xlYW47IC8vIEVuYWJsZSBpbmxpbmUgZWRpdGluZyBpbiB0YXNrIHZpZXdzXHJcblx0ZW5hYmxlRHluYW1pY01ldGFkYXRhUG9zaXRpb25pbmc6IGJvb2xlYW47IC8vIEVuYWJsZSBpbnRlbGxpZ2VudCBtZXRhZGF0YSBwb3NpdGlvbmluZyBiYXNlZCBvbiBjb250ZW50IGxlbmd0aFxyXG5cdGRlZmF1bHRWaWV3TW9kZTogXCJsaXN0XCIgfCBcInRyZWVcIjsgLy8gR2xvYmFsIGRlZmF1bHQgdmlldyBtb2RlIGZvciBhbGwgdmlld3NcclxuXHR2aWV3Q29uZmlndXJhdGlvbjogVmlld0NvbmZpZ1tdOyAvLyBNYW5hZ2VzIG9yZGVyLCB2aXNpYmlsaXR5LCBiYXNpYyBpbmZvLCBBTkQgZmlsdGVyIHJ1bGVzXHJcblxyXG5cdC8vIEdsb2JhbCBGaWx0ZXIgU2V0dGluZ3NcclxuXHRnbG9iYWxGaWx0ZXJSdWxlczogVmlld0ZpbHRlclJ1bGU7IC8vIEdsb2JhbCBmaWx0ZXIgcnVsZXMgdGhhdCBhcHBseSB0byBhbGwgVmlld3MgYnkgZGVmYXVsdFxyXG5cclxuXHQvLyBSZXZpZXcgU2V0dGluZ3NcclxuXHRyZXZpZXdTZXR0aW5nczogUmVjb3JkPHN0cmluZywgUHJvamVjdFJldmlld1NldHRpbmc+O1xyXG5cclxuXHQvLyBSZXdhcmQgU2V0dGluZ3MgKE5FVylcclxuXHRyZXdhcmRzOiBSZXdhcmRTZXR0aW5ncztcclxuXHJcblx0Ly8gSGFiaXQgU2V0dGluZ3NcclxuXHRoYWJpdDogSGFiaXRTZXR0aW5ncztcclxuXHJcblx0Ly8gRmlsdGVyIENvbmZpZ3VyYXRpb24gU2V0dGluZ3NcclxuXHRmaWx0ZXJDb25maWc6IEZpbHRlckNvbmZpZ1NldHRpbmdzO1xyXG5cclxuXHQvLyBTb3J0aW5nIFNldHRpbmdzXHJcblx0c29ydFRhc2tzOiBib29sZWFuOyAvLyBFbmFibGUvZGlzYWJsZSB0YXNrIHNvcnRpbmcgZmVhdHVyZVxyXG5cdHNvcnRDcml0ZXJpYTogU29ydENyaXRlcmlvbltdOyAvLyBBcnJheSBkZWZpbmluZyB0aGUgc29ydGluZyBvcmRlclxyXG5cclxuXHQvLyBBdXRvIERhdGUgTWFuYWdlciBTZXR0aW5nc1xyXG5cdGF1dG9EYXRlTWFuYWdlcjogQXV0b0RhdGVNYW5hZ2VyU2V0dGluZ3M7XHJcblxyXG5cdC8vIEJldGEgVGVzdCBTZXR0aW5nc1xyXG5cdGJldGFUZXN0PzogQmV0YVRlc3RTZXR0aW5ncztcclxuXHJcblx0Ly8gRXhwZXJpbWVudGFsIFNldHRpbmdzXHJcblx0ZXhwZXJpbWVudGFsPzogRXhwZXJpbWVudGFsU2V0dGluZ3M7XHJcblxyXG5cdC8vIEZsdWVudCBWaWV3cyBTZXR0aW5nc1xyXG5cdGZsdWVudFZpZXc/OiBGbHVlbnRWaWV3U2V0dGluZ3M7XHJcblxyXG5cdC8vIElDUyBDYWxlbmRhciBJbnRlZ3JhdGlvbiBTZXR0aW5nc1xyXG5cdGljc0ludGVncmF0aW9uOiBJY3NNYW5hZ2VyQ29uZmlnO1xyXG5cclxuXHQvLyBUaW1lbGluZSBTaWRlYmFyIFNldHRpbmdzXHJcblx0dGltZWxpbmVTaWRlYmFyOiBUaW1lbGluZVNpZGViYXJTZXR0aW5ncztcclxuXHJcblx0Ly8gRmlsZSBGaWx0ZXIgU2V0dGluZ3NcclxuXHRmaWxlRmlsdGVyOiBGaWxlRmlsdGVyU2V0dGluZ3M7XHJcblxyXG5cdC8vIE9uQ29tcGxldGlvbiBTZXR0aW5nc1xyXG5cdG9uQ29tcGxldGlvbjogT25Db21wbGV0aW9uU2V0dGluZ3M7XHJcblxyXG5cdC8vIFRpbWUgUGFyc2luZyBTZXR0aW5nc1xyXG5cdHRpbWVQYXJzaW5nOiBFbmhhbmNlZFRpbWVQYXJzaW5nQ29uZmlnO1xyXG5cclxuXHQvLyBUYXNrIFRpbWVyIFNldHRpbmdzXHJcblx0dGFza1RpbWVyOiBUYXNrVGltZXJTZXR0aW5ncztcclxuXHJcblx0Ly8gTUNQIEludGVncmF0aW9uIFNldHRpbmdzXHJcblx0bWNwSW50ZWdyYXRpb24/OiBNY3BTZXJ2ZXJDb25maWc7XHJcblxyXG5cdC8vIE9uYm9hcmRpbmcgU2V0dGluZ3NcclxuXHRvbmJvYXJkaW5nPzoge1xyXG5cdFx0Y29tcGxldGVkOiBib29sZWFuO1xyXG5cdFx0dmVyc2lvbjogc3RyaW5nO1xyXG5cdFx0Y29uZmlnTW9kZTogXCJiZWdpbm5lclwiIHwgXCJhZHZhbmNlZFwiIHwgXCJwb3dlclwiIHwgXCJjdXN0b21cIjtcclxuXHRcdHNraXBPbmJvYXJkaW5nPzogYm9vbGVhbjtcclxuXHRcdGNvbXBsZXRlZEF0Pzogc3RyaW5nO1xyXG5cdH07XHJcblxyXG5cdC8vIEZpbGVTb3VyY2UgU2V0dGluZ3NcclxuXHRmaWxlU291cmNlOiBGaWxlU291cmNlQ29uZmlndXJhdGlvbjtcclxuXHJcblx0Ly8gV29ya3NwYWNlIFNldHRpbmdzXHJcblx0d29ya3NwYWNlcz86IFdvcmtzcGFjZXNDb25maWc7XHJcbn1cclxuXHJcbi8qKiBEZWZpbmUgdGhlIGRlZmF1bHQgc2V0dGluZ3MgKi9cclxuZXhwb3J0IGNvbnN0IERFRkFVTFRfU0VUVElOR1M6IFRhc2tQcm9ncmVzc0JhclNldHRpbmdzID0ge1xyXG5cdGNoYW5nZWxvZzoge1xyXG5cdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdGxhc3RWZXJzaW9uOiBcIlwiLFxyXG5cdH0sXHJcblx0Ly8gR2VuZXJhbCBEZWZhdWx0c1xyXG5cdHByb2dyZXNzQmFyRGlzcGxheU1vZGU6IFwiYm90aFwiLFxyXG5cdHN1cHBvcnRIb3ZlclRvU2hvd1Byb2dyZXNzSW5mbzogZmFsc2UsXHJcblx0YWRkUHJvZ3Jlc3NCYXJUb05vblRhc2tCdWxsZXQ6IGZhbHNlLFxyXG5cdGFkZFRhc2tQcm9ncmVzc0JhclRvSGVhZGluZzogZmFsc2UsXHJcblx0YWRkUHJvZ3Jlc3NCYXJUb1Byb2plY3RzVmlldzogZmFsc2UsXHJcblx0ZW5hYmxlUHJvZ3Jlc3NiYXJJblJlYWRpbmdNb2RlOiBmYWxzZSxcclxuXHJcblx0Ly8gRGVza3RvcCBpbnRlZ3JhdGlvbiBhbmQgbm90aWZpY2F0aW9ucyBkZWZhdWx0c1xyXG5cdG5vdGlmaWNhdGlvbnM6IHtcclxuXHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0ZGFpbHlTdW1tYXJ5OiB7IGVuYWJsZWQ6IHRydWUsIHRpbWU6IFwiMDk6MDBcIiB9LFxyXG5cdFx0cGVyVGFzazogeyBlbmFibGVkOiBmYWxzZSwgbGVhZE1pbnV0ZXM6IDEwIH0sXHJcblx0fSxcclxuXHRkZXNrdG9wSW50ZWdyYXRpb246IHsgZW5hYmxlVHJheTogZmFsc2UgfSxcclxuXHRjb3VudFN1YkxldmVsOiBmYWxzZSxcclxuXHRkaXNwbGF5TW9kZTogXCJicmFja2V0RnJhY3Rpb25cIixcclxuXHRjdXN0b21Gb3JtYXQ6IFwiW3t7Q09NUExFVEVEfX0ve3tUT1RBTH19XVwiLFxyXG5cdHNob3dQZXJjZW50YWdlOiBmYWxzZSxcclxuXHRjdXN0b21pemVQcm9ncmVzc1JhbmdlczogZmFsc2UsXHJcblx0cHJvZ3Jlc3NSYW5nZXM6IFtcclxuXHRcdHsgbWluOiAwLCBtYXg6IDIwLCB0ZXh0OiB0KFwiSnVzdCBzdGFydGVkXCIpICsgXCIge3tQUk9HUkVTU319JVwiIH0sXHJcblx0XHR7IG1pbjogMjAsIG1heDogNDAsIHRleHQ6IHQoXCJNYWtpbmcgcHJvZ3Jlc3NcIikgKyBcIiB7e1BST0dSRVNTfX0lIFwiIH0sXHJcblx0XHR7IG1pbjogNDAsIG1heDogNjAsIHRleHQ6IHQoXCJIYWxmIHdheVwiKSArIFwiIHt7UFJPR1JFU1N9fSUgXCIgfSxcclxuXHRcdHsgbWluOiA2MCwgbWF4OiA4MCwgdGV4dDogdChcIkdvb2QgcHJvZ3Jlc3NcIikgKyBcIiB7e1BST0dSRVNTfX0lIFwiIH0sXHJcblx0XHR7IG1pbjogODAsIG1heDogMTAwLCB0ZXh0OiB0KFwiQWxtb3N0IHRoZXJlXCIpICsgXCIge3tQUk9HUkVTU319JSBcIiB9LFxyXG5cdF0sXHJcblx0YWxsb3dDdXN0b21Qcm9ncmVzc0dvYWw6IGZhbHNlLFxyXG5cdGhpZGVQcm9ncmVzc0JhckJhc2VkT25Db25kaXRpb25zOiBmYWxzZSxcclxuXHRoaWRlUHJvZ3Jlc3NCYXJUYWdzOiBcIm5vLXByb2dyZXNzLGhpZGUtcHJvZ3Jlc3NcIixcclxuXHRoaWRlUHJvZ3Jlc3NCYXJGb2xkZXJzOiBcIlwiLFxyXG5cdGhpZGVQcm9ncmVzc0Jhck1ldGFkYXRhOiBcImhpZGUtcHJvZ3Jlc3MtYmFyXCIsXHJcblx0c2hvd1Byb2dyZXNzQmFyQmFzZWRPbkhlYWRpbmc6IFwiXCIsXHJcblxyXG5cdC8vIFByb2plY3QgVHJlZSBWaWV3IFNldHRpbmdzIERlZmF1bHRzXHJcblx0cHJvamVjdFZpZXdEZWZhdWx0TW9kZTogXCJsaXN0XCIsXHJcblx0cHJvamVjdFRyZWVBdXRvRXhwYW5kOiBmYWxzZSxcclxuXHRwcm9qZWN0VHJlZVNob3dFbXB0eUZvbGRlcnM6IGZhbHNlLFxyXG5cdHByb2plY3RQYXRoU2VwYXJhdG9yOiBcIi9cIixcclxuXHJcblx0Ly8gQ2hlY2tib3ggU3RhdHVzIERlZmF1bHRzXHJcblx0YXV0b0NvbXBsZXRlUGFyZW50OiBmYWxzZSxcclxuXHRtYXJrUGFyZW50SW5Qcm9ncmVzc1doZW5QYXJ0aWFsbHlDb21wbGV0ZTogZmFsc2UsXHJcblx0dGFza1N0YXR1c2VzOiB7XHJcblx0XHRjb21wbGV0ZWQ6IFwieHxYXCIsXHJcblx0XHRpblByb2dyZXNzOiBcIj58L1wiLFxyXG5cdFx0YWJhbmRvbmVkOiBcIi1cIixcclxuXHRcdHBsYW5uZWQ6IFwiP1wiLFxyXG5cdFx0bm90U3RhcnRlZDogXCIgXCIsXHJcblx0fSxcclxuXHRjb3VudE90aGVyU3RhdHVzZXNBczogXCJub3RTdGFydGVkXCIsXHJcblx0ZXhjbHVkZVRhc2tNYXJrczogXCJcIixcclxuXHR1c2VPbmx5Q291bnRNYXJrczogZmFsc2UsXHJcblx0b25seUNvdW50VGFza01hcmtzOiBcInh8WHw+fC9cIiwgLy8gRGVmYXVsdCBleGFtcGxlXHJcblx0ZW5hYmxlVGFza1N0YXR1c1N3aXRjaGVyOiBmYWxzZSxcclxuXHRlbmFibGVDdXN0b21UYXNrTWFya3M6IGZhbHNlLFxyXG5cdGVuYWJsZVRleHRNYXJrSW5Tb3VyY2VNb2RlOiBmYWxzZSxcclxuXHRlbmFibGVDeWNsZUNvbXBsZXRlU3RhdHVzOiBmYWxzZSxcclxuXHR0YXNrU3RhdHVzQ3ljbGU6IFtcclxuXHRcdFwiTm90IFN0YXJ0ZWRcIixcclxuXHRcdFwiSW4gUHJvZ3Jlc3NcIixcclxuXHRcdFwiQ29tcGxldGVkXCIsXHJcblx0XHRcIkFiYW5kb25lZFwiLFxyXG5cdFx0XCJQbGFubmVkXCIsXHJcblx0XSxcclxuXHR0YXNrU3RhdHVzTWFya3M6IHtcclxuXHRcdFwiTm90IFN0YXJ0ZWRcIjogXCIgXCIsXHJcblx0XHRcIkluIFByb2dyZXNzXCI6IFwiL1wiLFxyXG5cdFx0Q29tcGxldGVkOiBcInhcIixcclxuXHRcdEFiYW5kb25lZDogXCItXCIsXHJcblx0XHRQbGFubmVkOiBcIj9cIixcclxuXHR9LFxyXG5cdGV4Y2x1ZGVNYXJrc0Zyb21DeWNsZTogW10sXHJcblx0ZW5hYmxlVGFza0dlbml1c0ljb25zOiBmYWxzZSxcclxuXHJcblx0Ly8gUHJpb3JpdHkgJiBEYXRlIERlZmF1bHRzXHJcblx0ZW5hYmxlUHJpb3JpdHlQaWNrZXI6IGZhbHNlLFxyXG5cdGVuYWJsZVByaW9yaXR5S2V5Ym9hcmRTaG9ydGN1dHM6IGZhbHNlLFxyXG5cdGVuYWJsZURhdGVQaWNrZXI6IGZhbHNlLFxyXG5cdHJlY3VycmVuY2VEYXRlQmFzZTogXCJkdWVcIixcclxuXHJcblx0Ly8gVGFzayBGaWx0ZXIgRGVmYXVsdHNcclxuXHR0YXNrRmlsdGVyOiB7XHJcblx0XHRlbmFibGVUYXNrRmlsdGVyOiBmYWxzZSxcclxuXHRcdHByZXNldFRhc2tGaWx0ZXJzOiBbXSwgLy8gU3RhcnQgZW1wdHksIG1heWJlIGFkZCBkZWZhdWx0cyBsYXRlciBvciB2aWEgYSByZXNldCBidXR0b25cclxuXHR9LFxyXG5cclxuXHQvLyBUYXNrIEd1dHRlciBEZWZhdWx0c1xyXG5cdHRhc2tHdXR0ZXI6IHtcclxuXHRcdGVuYWJsZVRhc2tHdXR0ZXI6IGZhbHNlLFxyXG5cdH0sXHJcblxyXG5cdC8vIENvbXBsZXRlZCBUYXNrIE1vdmVyIERlZmF1bHRzXHJcblx0Y29tcGxldGVkVGFza01vdmVyOiB7XHJcblx0XHRlbmFibGVDb21wbGV0ZWRUYXNrTW92ZXI6IGZhbHNlLFxyXG5cdFx0dGFza01hcmtlclR5cGU6IFwiZGF0ZVwiLFxyXG5cdFx0dmVyc2lvbk1hcmtlcjogXCJ2ZXJzaW9uIDEuMFwiLFxyXG5cdFx0ZGF0ZU1hcmtlcjogdChcImFyY2hpdmVkIG9uXCIpICsgXCIge3tkYXRlfX1cIixcclxuXHRcdGN1c3RvbU1hcmtlcjogdChcIm1vdmVkXCIpICsgXCIge3tEQVRFOllZWVktTU0tREQgSEg6bW19fVwiLFxyXG5cdFx0dHJlYXRBYmFuZG9uZWRBc0NvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRjb21wbGV0ZUFsbE1vdmVkVGFza3M6IHRydWUsXHJcblx0XHR3aXRoQ3VycmVudEZpbGVMaW5rOiB0cnVlLFxyXG5cdFx0Ly8gQXV0by1tb3ZlIGRlZmF1bHRzIGZvciBjb21wbGV0ZWQgdGFza3NcclxuXHRcdGVuYWJsZUF1dG9Nb3ZlOiBmYWxzZSxcclxuXHRcdGRlZmF1bHRUYXJnZXRGaWxlOiBcIkFyY2hpdmUubWRcIixcclxuXHRcdGRlZmF1bHRJbnNlcnRpb25Nb2RlOiBcImVuZFwiLFxyXG5cdFx0ZGVmYXVsdEhlYWRpbmdOYW1lOiBcIkNvbXBsZXRlZCBUYXNrc1wiLFxyXG5cdFx0Ly8gSW5jb21wbGV0ZSBUYXNrIE1vdmVyIERlZmF1bHRzXHJcblx0XHRlbmFibGVJbmNvbXBsZXRlZFRhc2tNb3ZlcjogdHJ1ZSxcclxuXHRcdGluY29tcGxldGVkVGFza01hcmtlclR5cGU6IFwiZGF0ZVwiLFxyXG5cdFx0aW5jb21wbGV0ZWRWZXJzaW9uTWFya2VyOiBcInZlcnNpb24gMS4wXCIsXHJcblx0XHRpbmNvbXBsZXRlZERhdGVNYXJrZXI6IHQoXCJtb3ZlZCBvblwiKSArIFwiIHt7ZGF0ZX19XCIsXHJcblx0XHRpbmNvbXBsZXRlZEN1c3RvbU1hcmtlcjogdChcIm1vdmVkXCIpICsgXCIge3tEQVRFOllZWVktTU0tREQgSEg6bW19fVwiLFxyXG5cdFx0d2l0aEN1cnJlbnRGaWxlTGlua0ZvckluY29tcGxldGVkOiB0cnVlLFxyXG5cdFx0Ly8gQXV0by1tb3ZlIGRlZmF1bHRzIGZvciBpbmNvbXBsZXRlIHRhc2tzXHJcblx0XHRlbmFibGVJbmNvbXBsZXRlZEF1dG9Nb3ZlOiBmYWxzZSxcclxuXHRcdGluY29tcGxldGVkRGVmYXVsdFRhcmdldEZpbGU6IFwiQmFja2xvZy5tZFwiLFxyXG5cdFx0aW5jb21wbGV0ZWREZWZhdWx0SW5zZXJ0aW9uTW9kZTogXCJlbmRcIixcclxuXHRcdGluY29tcGxldGVkRGVmYXVsdEhlYWRpbmdOYW1lOiBcIkluY29tcGxldGUgVGFza3NcIixcclxuXHR9LFxyXG5cclxuXHQvLyBRdWljayBDYXB0dXJlIERlZmF1bHRzXHJcblx0cXVpY2tDYXB0dXJlOiB7XHJcblx0XHRlbmFibGVRdWlja0NhcHR1cmU6IGZhbHNlLFxyXG5cdFx0dGFyZ2V0RmlsZTogXCJRdWlja0NhcHR1cmUubWRcIixcclxuXHRcdHBsYWNlaG9sZGVyOiB0KFwiQ2FwdHVyZSB5b3VyIHRob3VnaHRzLi4uXCIpLFxyXG5cdFx0YXBwZW5kVG9GaWxlOiBcImFwcGVuZFwiLFxyXG5cdFx0dGFyZ2V0VHlwZTogXCJmaXhlZFwiLFxyXG5cdFx0dGFyZ2V0SGVhZGluZzogXCJcIixcclxuXHRcdGRhaWx5Tm90ZVNldHRpbmdzOiB7XHJcblx0XHRcdGZvcm1hdDogXCJZWVlZLU1NLUREXCIsXHJcblx0XHRcdGZvbGRlcjogXCJcIixcclxuXHRcdFx0dGVtcGxhdGU6IFwiXCIsXHJcblx0XHR9LFxyXG5cdFx0ZW5hYmxlTWluaW1hbE1vZGU6IGZhbHNlLFxyXG5cdFx0bWluaW1hbE1vZGVTZXR0aW5nczoge1xyXG5cdFx0XHRzdWdnZXN0VHJpZ2dlcjogXCIvXCIsXHJcblx0XHR9LFxyXG5cdFx0Ly8gTmV3IGVuaGFuY2VkIHNldHRpbmdzIGRlZmF1bHRzXHJcblx0XHRrZWVwT3BlbkFmdGVyQ2FwdHVyZTogZmFsc2UsXHJcblx0XHRyZW1lbWJlckxhc3RNb2RlOiB0cnVlLFxyXG5cdFx0bGFzdFVzZWRNb2RlOiBcImNoZWNrYm94XCIsXHJcblx0XHRkZWZhdWx0RmlsZU5hbWVUZW1wbGF0ZTogXCJ7e0RBVEU6WVlZWS1NTS1ERH19IC0gXCIsXHJcblx0XHRkZWZhdWx0RmlsZUxvY2F0aW9uOiBcIlwiLFxyXG5cdFx0Y3JlYXRlRmlsZU1vZGU6IHtcclxuXHRcdFx0ZGVmYXVsdEZvbGRlcjogXCJcIixcclxuXHRcdFx0dXNlVGVtcGxhdGU6IGZhbHNlLFxyXG5cdFx0XHR0ZW1wbGF0ZUZvbGRlcjogXCJcIixcclxuXHRcdFx0dGVtcGxhdGVGaWxlOiBcIlwiLFxyXG5cdFx0XHR3cml0ZUNvbnRlbnRUYWdzVG9Gcm9udG1hdHRlcjogZmFsc2UsXHJcblx0XHR9LFxyXG5cdH0sXHJcblxyXG5cdC8vIFdvcmtmbG93IERlZmF1bHRzXHJcblx0d29ya2Zsb3c6IHtcclxuXHRcdGVuYWJsZVdvcmtmbG93OiBmYWxzZSxcclxuXHRcdGF1dG9BZGRUaW1lc3RhbXA6IGZhbHNlLFxyXG5cdFx0dGltZXN0YW1wRm9ybWF0OiBcIllZWVktTU0tREQgSEg6bW06c3NcIixcclxuXHRcdHJlbW92ZVRpbWVzdGFtcE9uVHJhbnNpdGlvbjogZmFsc2UsXHJcblx0XHRjYWxjdWxhdGVTcGVudFRpbWU6IGZhbHNlLFxyXG5cdFx0c3BlbnRUaW1lRm9ybWF0OiBcIkhIOm1tOnNzXCIsXHJcblx0XHRjYWxjdWxhdGVGdWxsU3BlbnRUaW1lOiBmYWxzZSxcclxuXHRcdGF1dG9SZW1vdmVMYXN0U3RhZ2VNYXJrZXI6IGZhbHNlLFxyXG5cdFx0YXV0b0FkZE5leHRUYXNrOiBmYWxzZSxcclxuXHRcdGRlZmluaXRpb25zOiBbXHJcblx0XHRcdHtcclxuXHRcdFx0XHRpZDogXCJwcm9qZWN0X3dvcmtmbG93XCIsXHJcblx0XHRcdFx0bmFtZTogdChcIlByb2plY3QgV29ya2Zsb3dcIiksXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IHQoXCJTdGFuZGFyZCBwcm9qZWN0IG1hbmFnZW1lbnQgd29ya2Zsb3dcIiksXHJcblx0XHRcdFx0c3RhZ2VzOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGlkOiBcInBsYW5uaW5nXCIsXHJcblx0XHRcdFx0XHRcdG5hbWU6IHQoXCJQbGFubmluZ1wiKSxcclxuXHRcdFx0XHRcdFx0dHlwZTogXCJsaW5lYXJcIixcclxuXHRcdFx0XHRcdFx0bmV4dDogXCJpbl9wcm9ncmVzc1wiLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0aWQ6IFwiaW5fcHJvZ3Jlc3NcIixcclxuXHRcdFx0XHRcdFx0bmFtZTogdChcIkluIFByb2dyZXNzXCIpLFxyXG5cdFx0XHRcdFx0XHR0eXBlOiBcImN5Y2xlXCIsXHJcblx0XHRcdFx0XHRcdHN1YlN0YWdlczogW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdGlkOiBcImRldmVsb3BtZW50XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRuYW1lOiB0KFwiRGV2ZWxvcG1lbnRcIiksXHJcblx0XHRcdFx0XHRcdFx0XHRuZXh0OiBcInRlc3RpbmdcIixcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdGlkOiBcInRlc3RpbmdcIixcclxuXHRcdFx0XHRcdFx0XHRcdG5hbWU6IHQoXCJUZXN0aW5nXCIpLFxyXG5cdFx0XHRcdFx0XHRcdFx0bmV4dDogXCJkZXZlbG9wbWVudFwiLFxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdF0sXHJcblx0XHRcdFx0XHRcdGNhblByb2NlZWRUbzogW1wicmV2aWV3XCIsIFwiY2FuY2VsbGVkXCJdLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0aWQ6IFwicmV2aWV3XCIsXHJcblx0XHRcdFx0XHRcdG5hbWU6IHQoXCJSZXZpZXdcIiksXHJcblx0XHRcdFx0XHRcdHR5cGU6IFwiY3ljbGVcIixcclxuXHRcdFx0XHRcdFx0Y2FuUHJvY2VlZFRvOiBbXCJpbl9wcm9ncmVzc1wiLCBcImNvbXBsZXRlZFwiXSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGlkOiBcImNvbXBsZXRlZFwiLFxyXG5cdFx0XHRcdFx0XHRuYW1lOiB0KFwiQ29tcGxldGVkXCIpLFxyXG5cdFx0XHRcdFx0XHR0eXBlOiBcInRlcm1pbmFsXCIsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRpZDogXCJjYW5jZWxsZWRcIixcclxuXHRcdFx0XHRcdFx0bmFtZTogdChcIkNhbmNlbGxlZFwiKSxcclxuXHRcdFx0XHRcdFx0dHlwZTogXCJ0ZXJtaW5hbFwiLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHR2ZXJzaW9uOiBcIjEuMFwiLFxyXG5cdFx0XHRcdFx0Y3JlYXRlZDogXCIyMDI0LTAzLTIwXCIsXHJcblx0XHRcdFx0XHRsYXN0TW9kaWZpZWQ6IFwiMjAyNC0wMy0yMFwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0sXHJcblx0XHRdLFxyXG5cdH0sXHJcblxyXG5cdC8vIEluZGV4IFJlbGF0ZWQgRGVmYXVsdHNcclxuXHR1c2VEYWlseU5vdGVQYXRoQXNEYXRlOiBmYWxzZSxcclxuXHRkYWlseU5vdGVGb3JtYXQ6IFwieXl5eS1NTS1kZFwiLFxyXG5cdHVzZUFzRGF0ZVR5cGU6IFwiZHVlXCIsXHJcblx0ZGFpbHlOb3RlUGF0aDogXCJcIixcclxuXHRwcmVmZXJNZXRhZGF0YUZvcm1hdDogXCJ0YXNrc1wiLFxyXG5cclxuXHQvLyBUYXNrIFBhcnNlciBDb25maWd1cmF0aW9uXHJcblx0cHJvamVjdFRhZ1ByZWZpeDoge1xyXG5cdFx0dGFza3M6IFwicHJvamVjdFwiLFxyXG5cdFx0ZGF0YXZpZXc6IFwicHJvamVjdFwiLFxyXG5cdH0sXHJcblx0Y29udGV4dFRhZ1ByZWZpeDoge1xyXG5cdFx0dGFza3M6IFwiQFwiLFxyXG5cdFx0ZGF0YXZpZXc6IFwiY29udGV4dFwiLFxyXG5cdH0sXHJcblx0YXJlYVRhZ1ByZWZpeDoge1xyXG5cdFx0dGFza3M6IFwiYXJlYVwiLFxyXG5cdFx0ZGF0YXZpZXc6IFwiYXJlYVwiLFxyXG5cdH0sXHJcblxyXG5cdC8vIEZpbGUgTWV0YWRhdGEgSW5oZXJpdGFuY2UgRGVmYXVsdHNcclxuXHRmaWxlTWV0YWRhdGFJbmhlcml0YW5jZToge1xyXG5cdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdGluaGVyaXRGcm9tRnJvbnRtYXR0ZXI6IHRydWUsXHJcblx0XHRpbmhlcml0RnJvbUZyb250bWF0dGVyRm9yU3VidGFza3M6IGZhbHNlLFxyXG5cdH0sXHJcblxyXG5cdHByb2plY3RDb25maWc6IHtcclxuXHRcdGVuYWJsZUVuaGFuY2VkUHJvamVjdDogZmFsc2UsXHJcblx0XHRwYXRoTWFwcGluZ3M6IFtdLFxyXG5cdFx0bWV0YWRhdGFDb25maWc6IHtcclxuXHRcdFx0bWV0YWRhdGFLZXk6IFwicHJvamVjdFwiLFxyXG5cdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0ZGV0ZWN0aW9uTWV0aG9kczogW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHR5cGU6IFwibWV0YWRhdGFcIixcclxuXHRcdFx0XHRcdHByb3BlcnR5S2V5OiBcInByb2plY3RcIixcclxuXHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dHlwZTogXCJ0YWdcIixcclxuXHRcdFx0XHRcdHByb3BlcnR5S2V5OiBcInByb2plY3RcIixcclxuXHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dHlwZTogXCJsaW5rXCIsXHJcblx0XHRcdFx0XHRwcm9wZXJ0eUtleTogXCJjYXRlZ29yeVwiLFxyXG5cdFx0XHRcdFx0bGlua0ZpbHRlcjogXCJcIixcclxuXHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdF0sXHJcblx0XHR9LFxyXG5cdFx0Y29uZmlnRmlsZToge1xyXG5cdFx0XHRmaWxlTmFtZTogXCJwcm9qZWN0Lm1kXCIsXHJcblx0XHRcdHNlYXJjaFJlY3Vyc2l2ZWx5OiBmYWxzZSxcclxuXHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHR9LFxyXG5cdFx0bWV0YWRhdGFNYXBwaW5nczogW10sXHJcblx0XHRkZWZhdWx0UHJvamVjdE5hbWluZzoge1xyXG5cdFx0XHRzdHJhdGVneTogXCJmaWxlbmFtZVwiIGFzIGNvbnN0LFxyXG5cdFx0XHRzdHJpcEV4dGVuc2lvbjogZmFsc2UsXHJcblx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0fSxcclxuXHR9LFxyXG5cclxuXHQvLyBGaWxlIFBhcnNpbmcgQ29uZmlndXJhdGlvblxyXG5cdGZpbGVQYXJzaW5nQ29uZmlnOiB7XHJcblx0XHRlbmFibGVGaWxlTWV0YWRhdGFQYXJzaW5nOiBmYWxzZSxcclxuXHRcdG1ldGFkYXRhRmllbGRzVG9QYXJzZUFzVGFza3M6IFtcImR1ZURhdGVcIiwgXCJ0b2RvXCIsIFwiY29tcGxldGVcIiwgXCJ0YXNrXCJdLFxyXG5cdFx0ZW5hYmxlVGFnQmFzZWRUYXNrUGFyc2luZzogZmFsc2UsXHJcblx0XHR0YWdzVG9QYXJzZUFzVGFza3M6IFtcIiN0b2RvXCIsIFwiI3Rhc2tcIiwgXCIjYWN0aW9uXCIsIFwiI2R1ZVwiXSxcclxuXHRcdHRhc2tDb250ZW50RnJvbU1ldGFkYXRhOiBcInRpdGxlXCIsXHJcblx0XHRkZWZhdWx0VGFza1N0YXR1czogXCIgXCIsXHJcblx0XHRlbmFibGVXb3JrZXJQcm9jZXNzaW5nOiB0cnVlLFxyXG5cdFx0ZW5hYmxlTXRpbWVPcHRpbWl6YXRpb246IHRydWUsXHJcblx0XHRtdGltZUNhY2hlU2l6ZTogMTAwMDAsXHJcblx0fSxcclxuXHJcblx0Ly8gRGF0ZSBTZXR0aW5nc1xyXG5cdHVzZVJlbGF0aXZlVGltZUZvckRhdGU6IGZhbHNlLFxyXG5cclxuXHQvLyBJZ25vcmUgYWxsIHRhc2tzIGJlaGluZCBoZWFkaW5nXHJcblx0aWdub3JlSGVhZGluZzogXCJcIixcclxuXHJcblx0Ly8gRm9jdXMgYWxsIHRhc2tzIGJlaGluZCBoZWFkaW5nXHJcblx0Zm9jdXNIZWFkaW5nOiBcIlwiLFxyXG5cclxuXHQvLyBJbmRleGVyIGFuZCBWaWV3IERlZmF1bHRzXHJcblx0ZW5hYmxlSW5kZXhlcjogdHJ1ZSwgLy8gRW5hYmxlIGluZGV4ZXIgYnkgZGVmYXVsdFxyXG5cdGVuYWJsZVZpZXc6IHRydWUsIC8vIEVuYWJsZSB2aWV3IGJ5IGRlZmF1bHRcclxuXHRlbmFibGVJbmxpbmVFZGl0b3I6IHRydWUsIC8vIEVuYWJsZSBpbmxpbmUgZWRpdGluZyBieSBkZWZhdWx0XHJcblx0ZW5hYmxlRHluYW1pY01ldGFkYXRhUG9zaXRpb25pbmc6IHRydWUsIC8vIEVuYWJsZSBpbnRlbGxpZ2VudCBtZXRhZGF0YSBwb3NpdGlvbmluZyBieSBkZWZhdWx0XHJcblx0ZGVmYXVsdFZpZXdNb2RlOiBcImxpc3RcIiwgLy8gR2xvYmFsIGRlZmF1bHQgdmlldyBtb2RlIGZvciBhbGwgdmlld3NcclxuXHJcblx0Ly8gR2xvYmFsIEZpbHRlciBEZWZhdWx0c1xyXG5cdGdsb2JhbEZpbHRlclJ1bGVzOiB7fSwgLy8gRW1wdHkgZ2xvYmFsIGZpbHRlciBydWxlcyBieSBkZWZhdWx0XHJcblxyXG5cdHZpZXdDb25maWd1cmF0aW9uOiBbXHJcblx0XHR7XHJcblx0XHRcdGlkOiBcImluYm94XCIsXHJcblx0XHRcdG5hbWU6IHQoXCJJbmJveFwiKSxcclxuXHRcdFx0aWNvbjogXCJpbmJveFwiLFxyXG5cdFx0XHR0eXBlOiBcImRlZmF1bHRcIixcclxuXHRcdFx0dmlzaWJsZTogdHJ1ZSxcclxuXHRcdFx0aGlkZUNvbXBsZXRlZEFuZEFiYW5kb25lZFRhc2tzOiB0cnVlLFxyXG5cdFx0XHRmaWx0ZXJSdWxlczoge30sXHJcblx0XHRcdGZpbHRlckJsYW5rczogZmFsc2UsXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRpZDogXCJmb3JlY2FzdFwiLFxyXG5cdFx0XHRuYW1lOiB0KFwiRm9yZWNhc3RcIiksXHJcblx0XHRcdGljb246IFwiY2FsZW5kYXItZGF5c1wiLFxyXG5cdFx0XHR0eXBlOiBcImRlZmF1bHRcIixcclxuXHRcdFx0dmlzaWJsZTogdHJ1ZSxcclxuXHRcdFx0aGlkZUNvbXBsZXRlZEFuZEFiYW5kb25lZFRhc2tzOiB0cnVlLFxyXG5cdFx0XHRmaWx0ZXJSdWxlczoge30sXHJcblx0XHRcdGZpbHRlckJsYW5rczogZmFsc2UsXHJcblx0XHRcdHNwZWNpZmljQ29uZmlnOiB7XHJcblx0XHRcdFx0dmlld1R5cGU6IFwiZm9yZWNhc3RcIixcclxuXHRcdFx0XHRmaXJzdERheU9mV2VlazogdW5kZWZpbmVkLCAvLyBVc2UgbG9jYWxlIGRlZmF1bHQgaW5pdGlhbGx5XHJcblx0XHRcdFx0aGlkZVdlZWtlbmRzOiBmYWxzZSwgLy8gU2hvdyB3ZWVrZW5kcyBieSBkZWZhdWx0XHJcblx0XHRcdH0gYXMgRm9yZWNhc3RTcGVjaWZpY0NvbmZpZyxcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGlkOiBcInByb2plY3RzXCIsXHJcblx0XHRcdG5hbWU6IHQoXCJQcm9qZWN0c1wiKSxcclxuXHRcdFx0aWNvbjogXCJmb2xkZXJzXCIsXHJcblx0XHRcdHR5cGU6IFwiZGVmYXVsdFwiLFxyXG5cdFx0XHR2aXNpYmxlOiB0cnVlLFxyXG5cdFx0XHRoaWRlQ29tcGxldGVkQW5kQWJhbmRvbmVkVGFza3M6IGZhbHNlLFxyXG5cdFx0XHRmaWx0ZXJSdWxlczoge30sXHJcblx0XHRcdGZpbHRlckJsYW5rczogZmFsc2UsXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRpZDogXCJ0YWdzXCIsXHJcblx0XHRcdG5hbWU6IHQoXCJUYWdzXCIpLFxyXG5cdFx0XHRpY29uOiBcInRhZ1wiLFxyXG5cdFx0XHR0eXBlOiBcImRlZmF1bHRcIixcclxuXHRcdFx0dmlzaWJsZTogdHJ1ZSxcclxuXHRcdFx0aGlkZUNvbXBsZXRlZEFuZEFiYW5kb25lZFRhc2tzOiBmYWxzZSxcclxuXHRcdFx0ZmlsdGVyUnVsZXM6IHt9LFxyXG5cdFx0XHRmaWx0ZXJCbGFua3M6IGZhbHNlLFxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aWQ6IFwiZmxhZ2dlZFwiLFxyXG5cdFx0XHRuYW1lOiB0KFwiRmxhZ2dlZFwiKSxcclxuXHRcdFx0aWNvbjogXCJmbGFnXCIsXHJcblx0XHRcdHR5cGU6IFwiZGVmYXVsdFwiLFxyXG5cdFx0XHR2aXNpYmxlOiB0cnVlLFxyXG5cdFx0XHRoaWRlQ29tcGxldGVkQW5kQWJhbmRvbmVkVGFza3M6IHRydWUsXHJcblx0XHRcdGZpbHRlclJ1bGVzOiB7fSxcclxuXHRcdFx0ZmlsdGVyQmxhbmtzOiBmYWxzZSxcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGlkOiBcInJldmlld1wiLFxyXG5cdFx0XHRuYW1lOiB0KFwiUmV2aWV3XCIpLFxyXG5cdFx0XHRpY29uOiBcImV5ZVwiLFxyXG5cdFx0XHR0eXBlOiBcImRlZmF1bHRcIixcclxuXHRcdFx0dmlzaWJsZTogdHJ1ZSxcclxuXHRcdFx0aGlkZUNvbXBsZXRlZEFuZEFiYW5kb25lZFRhc2tzOiBmYWxzZSxcclxuXHRcdFx0ZmlsdGVyUnVsZXM6IHt9LFxyXG5cdFx0XHRmaWx0ZXJCbGFua3M6IGZhbHNlLFxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aWQ6IFwiY2FsZW5kYXJcIixcclxuXHRcdFx0bmFtZTogdChcIkV2ZW50c1wiKSxcclxuXHRcdFx0aWNvbjogXCJjYWxlbmRhclwiLFxyXG5cdFx0XHR0eXBlOiBcImRlZmF1bHRcIixcclxuXHRcdFx0dmlzaWJsZTogdHJ1ZSxcclxuXHRcdFx0aGlkZUNvbXBsZXRlZEFuZEFiYW5kb25lZFRhc2tzOiBmYWxzZSxcclxuXHRcdFx0ZmlsdGVyUnVsZXM6IHt9LFxyXG5cdFx0XHRmaWx0ZXJCbGFua3M6IGZhbHNlLFxyXG5cdFx0XHRyZWdpb246IFwiYm90dG9tXCIsIC8vIOW6lemDqOWMuuWfn1xyXG5cdFx0XHRzcGVjaWZpY0NvbmZpZzoge1xyXG5cdFx0XHRcdHZpZXdUeXBlOiBcImNhbGVuZGFyXCIsXHJcblx0XHRcdFx0Zmlyc3REYXlPZldlZWs6IHVuZGVmaW5lZCwgLy8gVXNlIGxvY2FsZSBkZWZhdWx0IGluaXRpYWxseVxyXG5cdFx0XHRcdGhpZGVXZWVrZW5kczogZmFsc2UsIC8vIFNob3cgd2Vla2VuZHMgYnkgZGVmYXVsdFxyXG5cdFx0XHR9IGFzIENhbGVuZGFyU3BlY2lmaWNDb25maWcsXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRpZDogXCJrYW5iYW5cIixcclxuXHRcdFx0bmFtZTogdChcIlN0YXR1c1wiKSxcclxuXHRcdFx0aWNvbjogXCJrYW5iYW5cIixcclxuXHRcdFx0dHlwZTogXCJkZWZhdWx0XCIsXHJcblx0XHRcdHZpc2libGU6IHRydWUsXHJcblx0XHRcdGhpZGVDb21wbGV0ZWRBbmRBYmFuZG9uZWRUYXNrczogZmFsc2UsXHJcblx0XHRcdGZpbHRlclJ1bGVzOiB7fSxcclxuXHRcdFx0ZmlsdGVyQmxhbmtzOiBmYWxzZSxcclxuXHRcdFx0cmVnaW9uOiBcImJvdHRvbVwiLCAvLyDlupXpg6jljLrln59cclxuXHRcdFx0c3BlY2lmaWNDb25maWc6IHtcclxuXHRcdFx0XHR2aWV3VHlwZTogXCJrYW5iYW5cIixcclxuXHRcdFx0XHRzaG93Q2hlY2tib3g6IHRydWUsIC8vIEV4YW1wbGUgZGVmYXVsdCwgYWRqdXN0IGlmIG5lZWRlZFxyXG5cdFx0XHRcdGhpZGVFbXB0eUNvbHVtbnM6IGZhbHNlLFxyXG5cdFx0XHRcdGRlZmF1bHRTb3J0RmllbGQ6IFwicHJpb3JpdHlcIixcclxuXHRcdFx0XHRkZWZhdWx0U29ydE9yZGVyOiBcImRlc2NcIixcclxuXHRcdFx0XHRncm91cEJ5OiBcInN0YXR1c1wiLCAvLyBEZWZhdWx0IHRvIHN0YXR1cy1iYXNlZCBjb2x1bW5zXHJcblx0XHRcdH0gYXMgS2FuYmFuU3BlY2lmaWNDb25maWcsXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRpZDogXCJnYW50dFwiLFxyXG5cdFx0XHRuYW1lOiB0KFwiUGxhblwiKSxcclxuXHRcdFx0aWNvbjogXCJjaGFydC1nYW50dFwiLFxyXG5cdFx0XHR0eXBlOiBcImRlZmF1bHRcIixcclxuXHRcdFx0dmlzaWJsZTogdHJ1ZSxcclxuXHRcdFx0aGlkZUNvbXBsZXRlZEFuZEFiYW5kb25lZFRhc2tzOiBmYWxzZSxcclxuXHRcdFx0ZmlsdGVyUnVsZXM6IHt9LFxyXG5cdFx0XHRmaWx0ZXJCbGFua3M6IGZhbHNlLFxyXG5cdFx0XHRyZWdpb246IFwiYm90dG9tXCIsIC8vIOW6lemDqOWMuuWfn1xyXG5cdFx0XHRzcGVjaWZpY0NvbmZpZzoge1xyXG5cdFx0XHRcdHZpZXdUeXBlOiBcImdhbnR0XCIsXHJcblx0XHRcdFx0c2hvd1Rhc2tMYWJlbHM6IHRydWUsXHJcblx0XHRcdFx0dXNlTWFya2Rvd25SZW5kZXJlcjogdHJ1ZSxcclxuXHRcdFx0fSBhcyBHYW50dFNwZWNpZmljQ29uZmlnLFxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aWQ6IFwiaGFiaXRcIixcclxuXHRcdFx0bmFtZTogdChcIkhhYml0XCIpLFxyXG5cdFx0XHRpY29uOiBcImNhbGVuZGFyLWNsb2NrXCIsXHJcblx0XHRcdHR5cGU6IFwiZGVmYXVsdFwiLFxyXG5cdFx0XHR2aXNpYmxlOiB0cnVlLFxyXG5cdFx0XHRoaWRlQ29tcGxldGVkQW5kQWJhbmRvbmVkVGFza3M6IGZhbHNlLFxyXG5cdFx0XHRmaWx0ZXJSdWxlczoge30sXHJcblx0XHRcdGZpbHRlckJsYW5rczogZmFsc2UsXHJcblx0XHRcdHJlZ2lvbjogXCJib3R0b21cIiwgLy8g5bqV6YOo5Yy65Z+fXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRpZDogXCJ0YWJsZVwiLFxyXG5cdFx0XHRuYW1lOiB0KFwiVGFibGVcIiksXHJcblx0XHRcdGljb246IFwidGFibGVcIixcclxuXHRcdFx0dHlwZTogXCJkZWZhdWx0XCIsXHJcblx0XHRcdHZpc2libGU6IHRydWUsXHJcblx0XHRcdGhpZGVDb21wbGV0ZWRBbmRBYmFuZG9uZWRUYXNrczogZmFsc2UsXHJcblx0XHRcdGZpbHRlclJ1bGVzOiB7fSxcclxuXHRcdFx0ZmlsdGVyQmxhbmtzOiBmYWxzZSxcclxuXHRcdFx0c3BlY2lmaWNDb25maWc6IHtcclxuXHRcdFx0XHR2aWV3VHlwZTogXCJ0YWJsZVwiLFxyXG5cdFx0XHRcdGVuYWJsZVRyZWVWaWV3OiB0cnVlLFxyXG5cdFx0XHRcdGVuYWJsZUxhenlMb2FkaW5nOiB0cnVlLFxyXG5cdFx0XHRcdHBhZ2VTaXplOiA1MCxcclxuXHRcdFx0XHRlbmFibGVJbmxpbmVFZGl0aW5nOiB0cnVlLFxyXG5cdFx0XHRcdHZpc2libGVDb2x1bW5zOiBbXHJcblx0XHRcdFx0XHRcInN0YXR1c1wiLFxyXG5cdFx0XHRcdFx0XCJjb250ZW50XCIsXHJcblx0XHRcdFx0XHRcInByaW9yaXR5XCIsXHJcblx0XHRcdFx0XHRcImR1ZURhdGVcIixcclxuXHRcdFx0XHRcdFwic3RhcnREYXRlXCIsXHJcblx0XHRcdFx0XHRcInNjaGVkdWxlZERhdGVcIixcclxuXHRcdFx0XHRcdFwidGFnc1wiLFxyXG5cdFx0XHRcdFx0XCJwcm9qZWN0XCIsXHJcblx0XHRcdFx0XHRcImNvbnRleHRcIixcclxuXHRcdFx0XHRcdFwiZmlsZVBhdGhcIixcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdGNvbHVtbldpZHRoczoge1xyXG5cdFx0XHRcdFx0c3RhdHVzOiA4MCxcclxuXHRcdFx0XHRcdGNvbnRlbnQ6IDMwMCxcclxuXHRcdFx0XHRcdHByaW9yaXR5OiAxMDAsXHJcblx0XHRcdFx0XHRkdWVEYXRlOiAxMjAsXHJcblx0XHRcdFx0XHRzdGFydERhdGU6IDEyMCxcclxuXHRcdFx0XHRcdHNjaGVkdWxlZERhdGU6IDEyMCxcclxuXHRcdFx0XHRcdGNyZWF0ZWREYXRlOiAxMjAsXHJcblx0XHRcdFx0XHRjb21wbGV0ZWREYXRlOiAxMjAsXHJcblx0XHRcdFx0XHR0YWdzOiAxNTAsXHJcblx0XHRcdFx0XHRwcm9qZWN0OiAxNTAsXHJcblx0XHRcdFx0XHRjb250ZXh0OiAxMjAsXHJcblx0XHRcdFx0XHRyZWN1cnJlbmNlOiAxMjAsXHJcblx0XHRcdFx0XHRlc3RpbWF0ZWRUaW1lOiAxMjAsXHJcblx0XHRcdFx0XHRhY3R1YWxUaW1lOiAxMjAsXHJcblx0XHRcdFx0XHRmaWxlUGF0aDogMjAwLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0c29ydGFibGVDb2x1bW5zOiB0cnVlLFxyXG5cdFx0XHRcdHJlc2l6YWJsZUNvbHVtbnM6IHRydWUsXHJcblx0XHRcdFx0c2hvd1Jvd051bWJlcnM6IHRydWUsXHJcblx0XHRcdFx0ZW5hYmxlUm93U2VsZWN0aW9uOiB0cnVlLFxyXG5cdFx0XHRcdGVuYWJsZU11bHRpU2VsZWN0OiB0cnVlLFxyXG5cdFx0XHRcdGRlZmF1bHRTb3J0RmllbGQ6IFwiXCIsXHJcblx0XHRcdFx0ZGVmYXVsdFNvcnRPcmRlcjogXCJhc2NcIixcclxuXHRcdFx0fSBhcyBUYWJsZVNwZWNpZmljQ29uZmlnLFxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aWQ6IFwicXVhZHJhbnRcIixcclxuXHRcdFx0bmFtZTogdChcIk1hdHJpeFwiKSxcclxuXHRcdFx0aWNvbjogXCJsYXlvdXQtZ3JpZFwiLFxyXG5cdFx0XHR0eXBlOiBcImRlZmF1bHRcIixcclxuXHRcdFx0dmlzaWJsZTogdHJ1ZSxcclxuXHRcdFx0aGlkZUNvbXBsZXRlZEFuZEFiYW5kb25lZFRhc2tzOiBmYWxzZSxcclxuXHRcdFx0ZmlsdGVyUnVsZXM6IHt9LFxyXG5cdFx0XHRmaWx0ZXJCbGFua3M6IGZhbHNlLFxyXG5cdFx0XHRzcGVjaWZpY0NvbmZpZzoge1xyXG5cdFx0XHRcdHZpZXdUeXBlOiBcInF1YWRyYW50XCIsXHJcblx0XHRcdFx0aGlkZUVtcHR5UXVhZHJhbnRzOiBmYWxzZSxcclxuXHRcdFx0XHRhdXRvVXBkYXRlUHJpb3JpdHk6IHRydWUsXHJcblx0XHRcdFx0YXV0b1VwZGF0ZVRhZ3M6IHRydWUsXHJcblx0XHRcdFx0c2hvd1Rhc2tDb3VudDogdHJ1ZSxcclxuXHRcdFx0XHRkZWZhdWx0U29ydEZpZWxkOiBcInByaW9yaXR5XCIsXHJcblx0XHRcdFx0ZGVmYXVsdFNvcnRPcmRlcjogXCJkZXNjXCIsXHJcblx0XHRcdFx0dXJnZW50VGFnOiBcIiN1cmdlbnRcIixcclxuXHRcdFx0XHRpbXBvcnRhbnRUYWc6IFwiI2ltcG9ydGFudFwiLFxyXG5cdFx0XHRcdHVyZ2VudFRocmVzaG9sZERheXM6IDMsXHJcblx0XHRcdFx0dXNlUHJpb3JpdHlGb3JDbGFzc2lmaWNhdGlvbjogZmFsc2UsXHJcblx0XHRcdFx0dXJnZW50UHJpb3JpdHlUaHJlc2hvbGQ6IDQsXHJcblx0XHRcdFx0aW1wb3J0YW50UHJpb3JpdHlUaHJlc2hvbGQ6IDMsXHJcblx0XHRcdFx0Y3VzdG9tUXVhZHJhbnRDb2xvcnM6IGZhbHNlLFxyXG5cdFx0XHRcdHF1YWRyYW50Q29sb3JzOiB7XHJcblx0XHRcdFx0XHR1cmdlbnRJbXBvcnRhbnQ6IFwiI2RjMzU0NVwiLFxyXG5cdFx0XHRcdFx0bm90VXJnZW50SW1wb3J0YW50OiBcIiMyOGE3NDVcIixcclxuXHRcdFx0XHRcdHVyZ2VudE5vdEltcG9ydGFudDogXCIjZmZjMTA3XCIsXHJcblx0XHRcdFx0XHRub3RVcmdlbnROb3RJbXBvcnRhbnQ6IFwiIzZjNzU3ZFwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0gYXMgUXVhZHJhbnRTcGVjaWZpY0NvbmZpZyxcclxuXHRcdH0sXHJcblx0XSxcclxuXHJcblx0Ly8gUmV2aWV3IFNldHRpbmdzXHJcblx0cmV2aWV3U2V0dGluZ3M6IHt9LFxyXG5cclxuXHQvLyBSZXdhcmQgU2V0dGluZ3MgRGVmYXVsdHMgKE5FVylcclxuXHRyZXdhcmRzOiB7XHJcblx0XHRlbmFibGVSZXdhcmRzOiBmYWxzZSxcclxuXHRcdHJld2FyZEl0ZW1zOiBbXHJcblx0XHRcdHtcclxuXHRcdFx0XHRpZDogXCJyZXdhcmQtdGVhXCIsXHJcblx0XHRcdFx0bmFtZTogdChcIkRyaW5rIGEgY3VwIG9mIGdvb2QgdGVhXCIpLFxyXG5cdFx0XHRcdG9jY3VycmVuY2U6IFwiY29tbW9uXCIsXHJcblx0XHRcdFx0aW52ZW50b3J5OiAtMSxcclxuXHRcdFx0fSwgLy8gLTEgZm9yIGluZmluaXRlXHJcblx0XHRcdHtcclxuXHRcdFx0XHRpZDogXCJyZXdhcmQtc2VyaWVzLWVwaXNvZGVcIixcclxuXHRcdFx0XHRuYW1lOiB0KFwiV2F0Y2ggYW4gZXBpc29kZSBvZiBhIGZhdm9yaXRlIHNlcmllc1wiKSxcclxuXHRcdFx0XHRvY2N1cnJlbmNlOiBcInJhcmVcIixcclxuXHRcdFx0XHRpbnZlbnRvcnk6IDIwLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0aWQ6IFwicmV3YXJkLWNoYW1wYWduZS1wcm9qZWN0XCIsXHJcblx0XHRcdFx0bmFtZTogdChcIlBsYXkgYSBnYW1lXCIpLFxyXG5cdFx0XHRcdG9jY3VycmVuY2U6IFwibGVnZW5kYXJ5XCIsXHJcblx0XHRcdFx0aW52ZW50b3J5OiAxLFxyXG5cdFx0XHRcdGNvbmRpdGlvbjogXCIjcHJvamVjdCBBTkQgI21pbGVzdG9uZVwiLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0aWQ6IFwicmV3YXJkLWNob2NvbGF0ZS1xdWlja1wiLFxyXG5cdFx0XHRcdG5hbWU6IHQoXCJFYXQgYSBwaWVjZSBvZiBjaG9jb2xhdGVcIiksXHJcblx0XHRcdFx0b2NjdXJyZW5jZTogXCJjb21tb25cIixcclxuXHRcdFx0XHRpbnZlbnRvcnk6IDEwLFxyXG5cdFx0XHRcdGNvbmRpdGlvbjogXCIjcXVpY2t3aW5cIixcclxuXHRcdFx0XHRpbWFnZVVybDogXCJcIixcclxuXHRcdFx0fSwgLy8gQWRkIGltYWdlVXJsIGV4YW1wbGUgaWYgbmVlZGVkXHJcblx0XHRdLFxyXG5cdFx0b2NjdXJyZW5jZUxldmVsczogW1xyXG5cdFx0XHR7IG5hbWU6IHQoXCJjb21tb25cIiksIGNoYW5jZTogNzAgfSxcclxuXHRcdFx0eyBuYW1lOiB0KFwicmFyZVwiKSwgY2hhbmNlOiAyNSB9LFxyXG5cdFx0XHR7IG5hbWU6IHQoXCJsZWdlbmRhcnlcIiksIGNoYW5jZTogNSB9LFxyXG5cdFx0XSxcclxuXHRcdHNob3dSZXdhcmRUeXBlOiBcIm1vZGFsXCIsXHJcblx0fSxcclxuXHJcblx0Ly8gSGFiaXQgU2V0dGluZ3NcclxuXHRoYWJpdDoge1xyXG5cdFx0ZW5hYmxlSGFiaXRzOiBmYWxzZSxcclxuXHRcdGhhYml0czogW10sXHJcblx0fSxcclxuXHJcblx0Ly8gRmlsdGVyIENvbmZpZ3VyYXRpb24gRGVmYXVsdHNcclxuXHRmaWx0ZXJDb25maWc6IHtcclxuXHRcdGVuYWJsZVNhdmVkRmlsdGVyczogdHJ1ZSxcclxuXHRcdHNhdmVkQ29uZmlnczogW10sXHJcblx0fSxcclxuXHJcblx0Ly8gU29ydGluZyBEZWZhdWx0c1xyXG5cdHNvcnRUYXNrczogdHJ1ZSwgLy8gRGVmYXVsdCB0byBlbmFibGVkXHJcblx0c29ydENyaXRlcmlhOiBbXHJcblx0XHQvLyBEZWZhdWx0IHNvcnRpbmcgY3JpdGVyaWFcclxuXHRcdHsgZmllbGQ6IFwiY29tcGxldGVkXCIsIG9yZGVyOiBcImFzY1wiIH0sIC8vIOacquWujOaIkOS7u+WKoeS8mOWFiCAoZmFsc2UgPCB0cnVlKVxyXG5cdFx0eyBmaWVsZDogXCJzdGF0dXNcIiwgb3JkZXI6IFwiYXNjXCIgfSxcclxuXHRcdHsgZmllbGQ6IFwicHJpb3JpdHlcIiwgb3JkZXI6IFwiYXNjXCIgfSxcclxuXHRcdHsgZmllbGQ6IFwiZHVlRGF0ZVwiLCBvcmRlcjogXCJhc2NcIiB9LFxyXG5cdF0sXHJcblxyXG5cdC8vIEF1dG8gRGF0ZSBNYW5hZ2VyIERlZmF1bHRzXHJcblx0YXV0b0RhdGVNYW5hZ2VyOiB7XHJcblx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdG1hbmFnZUNvbXBsZXRlZERhdGU6IHRydWUsXHJcblx0XHRtYW5hZ2VTdGFydERhdGU6IHRydWUsXHJcblx0XHRtYW5hZ2VDYW5jZWxsZWREYXRlOiB0cnVlLFxyXG5cdFx0Y29tcGxldGVkRGF0ZUZvcm1hdDogXCJZWVlZLU1NLUREXCIsXHJcblx0XHRzdGFydERhdGVGb3JtYXQ6IFwiWVlZWS1NTS1ERFwiLFxyXG5cdFx0Y2FuY2VsbGVkRGF0ZUZvcm1hdDogXCJZWVlZLU1NLUREXCIsXHJcblx0XHRjb21wbGV0ZWREYXRlTWFya2VyOiBcIuKchVwiLFxyXG5cdFx0c3RhcnREYXRlTWFya2VyOiBcIvCfmoBcIixcclxuXHRcdGNhbmNlbGxlZERhdGVNYXJrZXI6IFwi4p2MXCIsXHJcblx0fSxcclxuXHJcblx0Ly8gQmV0YSBUZXN0IERlZmF1bHRzXHJcblx0YmV0YVRlc3Q6IHtcclxuXHRcdGVuYWJsZUJhc2VWaWV3OiBmYWxzZSxcclxuXHR9LFxyXG5cclxuXHQvLyBJQ1MgQ2FsZW5kYXIgSW50ZWdyYXRpb24gRGVmYXVsdHNcclxuXHRpY3NJbnRlZ3JhdGlvbjoge1xyXG5cdFx0c291cmNlczogW10sXHJcblx0XHRnbG9iYWxSZWZyZXNoSW50ZXJ2YWw6IDYwLCAvLyAxIGhvdXJcclxuXHRcdG1heENhY2hlQWdlOiAyNCwgLy8gMjQgaG91cnNcclxuXHRcdGVuYWJsZUJhY2tncm91bmRSZWZyZXNoOiBmYWxzZSxcclxuXHRcdG5ldHdvcmtUaW1lb3V0OiAzMCwgLy8gMzAgc2Vjb25kc1xyXG5cdFx0bWF4RXZlbnRzUGVyU291cmNlOiAxMDAwLFxyXG5cdFx0c2hvd0luQ2FsZW5kYXI6IGZhbHNlLFxyXG5cdFx0c2hvd0luVGFza0xpc3RzOiBmYWxzZSxcclxuXHRcdGRlZmF1bHRFdmVudENvbG9yOiBcIiMzYjgyZjZcIiwgLy8gQmx1ZSBjb2xvclxyXG5cdH0sXHJcblxyXG5cdC8vIFRpbWVsaW5lIFNpZGViYXIgRGVmYXVsdHNcclxuXHR0aW1lbGluZVNpZGViYXI6IHtcclxuXHRcdGVuYWJsZVRpbWVsaW5lU2lkZWJhcjogZmFsc2UsXHJcblx0XHRhdXRvT3Blbk9uU3RhcnR1cDogZmFsc2UsXHJcblx0XHRzaG93Q29tcGxldGVkVGFza3M6IHRydWUsXHJcblx0XHRmb2N1c01vZGVCeURlZmF1bHQ6IGZhbHNlLFxyXG5cdFx0bWF4RXZlbnRzVG9TaG93OiAxMDAsXHJcblx0XHQvLyBRdWljayBpbnB1dCBjb2xsYXBzZSBkZWZhdWx0c1xyXG5cdFx0cXVpY2tJbnB1dENvbGxhcHNlZDogZmFsc2UsXHJcblx0XHRxdWlja0lucHV0RGVmYXVsdEhlaWdodDogMTUwLFxyXG5cdFx0cXVpY2tJbnB1dEFuaW1hdGlvbkR1cmF0aW9uOiAzMDAsXHJcblx0XHRxdWlja0lucHV0Q29sbGFwc2VPbkNhcHR1cmU6IGZhbHNlLFxyXG5cdFx0cXVpY2tJbnB1dFNob3dRdWlja0FjdGlvbnM6IHRydWUsXHJcblx0fSxcclxuXHJcblx0Ly8gRmlsZSBGaWx0ZXIgRGVmYXVsdHNcclxuXHRmaWxlRmlsdGVyOiB7XHJcblx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdG1vZGU6IEZpbHRlck1vZGUuQkxBQ0tMSVNULFxyXG5cdFx0cnVsZXM6IFtcclxuXHRcdFx0Ly8gTm8gZGVmYXVsdCBydWxlcyAtIGxldCB1c2VycyBleHBsaWNpdGx5IGNob29zZSB2aWEgcHJlc2V0IHRlbXBsYXRlc1xyXG5cdFx0XSxcclxuXHRcdHNjb3BlQ29udHJvbHM6IHtcclxuXHRcdFx0aW5saW5lVGFza3NFbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRmaWxlVGFza3NFbmFibGVkOiB0cnVlLFxyXG5cdFx0fSxcclxuXHR9LFxyXG5cclxuXHQvLyBPbkNvbXBsZXRpb24gRGVmYXVsdHNcclxuXHRvbkNvbXBsZXRpb246IHtcclxuXHRcdGVuYWJsZU9uQ29tcGxldGlvbjogdHJ1ZSxcclxuXHRcdGRlZmF1bHRBcmNoaXZlRmlsZTogXCJBcmNoaXZlL0NvbXBsZXRlZCBUYXNrcy5tZFwiLFxyXG5cdFx0ZGVmYXVsdEFyY2hpdmVTZWN0aW9uOiBcIkNvbXBsZXRlZCBUYXNrc1wiLFxyXG5cdFx0c2hvd0FkdmFuY2VkT3B0aW9uczogZmFsc2UsXHJcblx0fSxcclxuXHJcblx0Ly8gVGltZSBQYXJzaW5nIERlZmF1bHRzXHJcblx0dGltZVBhcnNpbmc6IHtcclxuXHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRzdXBwb3J0ZWRMYW5ndWFnZXM6IFtcImVuXCIsIFwiemhcIl0sXHJcblx0XHRkYXRlS2V5d29yZHM6IHtcclxuXHRcdFx0c3RhcnQ6IFtcclxuXHRcdFx0XHRcInN0YXJ0XCIsXHJcblx0XHRcdFx0XCJiZWdpblwiLFxyXG5cdFx0XHRcdFwiZnJvbVwiLFxyXG5cdFx0XHRcdFwic3RhcnRpbmdcIixcclxuXHRcdFx0XHRcImJlZ2luc1wiLFxyXG5cdFx0XHRcdFwi5byA5aeLXCIsXHJcblx0XHRcdFx0XCLku45cIixcclxuXHRcdFx0XHRcIui1t+Wni1wiLFxyXG5cdFx0XHRcdFwi6LW3XCIsXHJcblx0XHRcdFx0XCLlp4vkuo5cIixcclxuXHRcdFx0XHRcIuiHqlwiLFxyXG5cdFx0XHRdLFxyXG5cdFx0XHRkdWU6IFtcclxuXHRcdFx0XHRcImR1ZVwiLFxyXG5cdFx0XHRcdFwiZGVhZGxpbmVcIixcclxuXHRcdFx0XHRcImJ5XCIsXHJcblx0XHRcdFx0XCJ1bnRpbFwiLFxyXG5cdFx0XHRcdFwiYmVmb3JlXCIsXHJcblx0XHRcdFx0XCJleHBpcmVzXCIsXHJcblx0XHRcdFx0XCJlbmRzXCIsXHJcblx0XHRcdFx0XCLmiKrmraJcIixcclxuXHRcdFx0XHRcIuWIsOacn1wiLFxyXG5cdFx0XHRcdFwi5LmL5YmNXCIsXHJcblx0XHRcdFx0XCLmnJ/pmZBcIixcclxuXHRcdFx0XHRcIuacgOaZmlwiLFxyXG5cdFx0XHRcdFwi57uT5p2fXCIsXHJcblx0XHRcdFx0XCLnu4jmraJcIixcclxuXHRcdFx0XHRcIuWujOaIkOS6jlwiLFxyXG5cdFx0XHRdLFxyXG5cdFx0XHRzY2hlZHVsZWQ6IFtcclxuXHRcdFx0XHRcInNjaGVkdWxlZFwiLFxyXG5cdFx0XHRcdFwib25cIixcclxuXHRcdFx0XHRcImF0XCIsXHJcblx0XHRcdFx0XCJwbGFubmVkXCIsXHJcblx0XHRcdFx0XCJzZXQgZm9yXCIsXHJcblx0XHRcdFx0XCJhcnJhbmdlZFwiLFxyXG5cdFx0XHRcdFwi5a6J5o6SXCIsXHJcblx0XHRcdFx0XCLorqHliJJcIixcclxuXHRcdFx0XHRcIuWcqFwiLFxyXG5cdFx0XHRcdFwi5a6a5LqOXCIsXHJcblx0XHRcdFx0XCLpooTlrppcIixcclxuXHRcdFx0XHRcIue6puWumlwiLFxyXG5cdFx0XHRcdFwi6K6+5a6aXCIsXHJcblx0XHRcdF0sXHJcblx0XHR9LFxyXG5cdFx0cmVtb3ZlT3JpZ2luYWxUZXh0OiB0cnVlLFxyXG5cdFx0cGVyTGluZVByb2Nlc3Npbmc6IHRydWUsXHJcblx0XHRyZWFsVGltZVJlcGxhY2VtZW50OiB0cnVlLFxyXG5cdFx0Ly8gRW5oYW5jZWQgdGltZSBwYXJzaW5nIGNvbmZpZ3VyYXRpb25cclxuXHRcdHRpbWVQYXR0ZXJuczoge1xyXG5cdFx0XHRzaW5nbGVUaW1lOiBbXHJcblx0XHRcdFx0L1xcYihbMDFdP1xcZHwyWzAtM10pOihbMC01XVxcZCkoPzo6KFswLTVdXFxkKSk/XFxiL2csIC8vIDI0LWhvdXIgZm9ybWF0XHJcblx0XHRcdFx0L1xcYigxWzAtMl18MD9bMS05XSk6KFswLTVdXFxkKSg/OjooWzAtNV1cXGQpKT9cXHMqKEFNfFBNfGFtfHBtKVxcYi9nLCAvLyAxMi1ob3VyIGZvcm1hdFxyXG5cdFx0XHRdLFxyXG5cdFx0XHR0aW1lUmFuZ2U6IFtcclxuXHRcdFx0XHQvXFxiKFswMV0/XFxkfDJbMC0zXSk6KFswLTVdXFxkKSg/OjooWzAtNV1cXGQpKT9cXHMqWy1+772eXVxccyooWzAxXT9cXGR8MlswLTNdKTooWzAtNV1cXGQpKD86OihbMC01XVxcZCkpP1xcYi9nLCAvLyAyNC1ob3VyIHJhbmdlXHJcblx0XHRcdFx0L1xcYigxWzAtMl18MD9bMS05XSk6KFswLTVdXFxkKSg/OjooWzAtNV1cXGQpKT9cXHMqKEFNfFBNfGFtfHBtKT9cXHMqWy1+772eXVxccyooMVswLTJdfDA/WzEtOV0pOihbMC01XVxcZCkoPzo6KFswLTVdXFxkKSk/XFxzKihBTXxQTXxhbXxwbSlcXGIvZywgLy8gMTItaG91ciByYW5nZVxyXG5cdFx0XHRdLFxyXG5cdFx0XHRyYW5nZVNlcGFyYXRvcnM6IFtcIi1cIiwgXCJ+XCIsIFwi772eXCIsIFwiIC0gXCIsIFwiIH4gXCIsIFwiIO+9niBcIl0sXHJcblx0XHR9LFxyXG5cdFx0dGltZURlZmF1bHRzOiB7XHJcblx0XHRcdHByZWZlcnJlZEZvcm1hdDogXCIyNGhcIiBhcyBjb25zdCxcclxuXHRcdFx0ZGVmYXVsdFBlcmlvZDogXCJBTVwiIGFzIGNvbnN0LFxyXG5cdFx0XHRtaWRuaWdodENyb3NzaW5nOiBcIm5leHQtZGF5XCIgYXMgY29uc3QsXHJcblx0XHR9LFxyXG5cdH0sXHJcblxyXG5cdC8vIFRhc2sgVGltZXIgRGVmYXVsdHNcclxuXHR0YXNrVGltZXI6IHtcclxuXHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0bWV0YWRhdGFEZXRlY3Rpb246IHtcclxuXHRcdFx0ZnJvbnRtYXR0ZXI6IFwidGFzay10aW1lclwiLFxyXG5cdFx0XHRmb2xkZXJzOiBbXSxcclxuXHRcdFx0dGFnczogW1widGltZXJcIiwgXCJ0cmFja2VkXCJdLFxyXG5cdFx0fSxcclxuXHRcdHRpbWVGb3JtYXQ6IFwie2h9aHJzIHttfW1pbnNcIixcclxuXHRcdGJsb2NrUmVmUHJlZml4OiBcInRpbWVyXCIsXHJcblx0fSxcclxuXHJcblx0Ly8gQ3VzdG9tIERhdGUgRm9ybWF0IERlZmF1bHRzXHJcblx0ZW5hYmxlQ3VzdG9tRGF0ZUZvcm1hdHM6IGZhbHNlLFxyXG5cdGN1c3RvbURhdGVGb3JtYXRzOiBbXSxcclxuXHJcblx0Ly8gRXhwZXJpbWVudGFsIERlZmF1bHRzXHJcblx0ZXhwZXJpbWVudGFsOiB7XHJcblx0XHRlbmFibGVGbHVlbnQ6IGZhbHNlLFxyXG5cdFx0c2hvd0ZsdWVudFJpYmJvbjogZmFsc2UsXHJcblx0fSxcclxuXHJcblx0Ly8gT25ib2FyZGluZyBEZWZhdWx0c1xyXG5cdG9uYm9hcmRpbmc6IHtcclxuXHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHR2ZXJzaW9uOiBcIlwiLFxyXG5cdFx0Y29uZmlnTW9kZTogXCJiZWdpbm5lclwiLFxyXG5cdFx0c2tpcE9uYm9hcmRpbmc6IGZhbHNlLFxyXG5cdFx0Y29tcGxldGVkQXQ6IFwiXCIsXHJcblx0fSxcclxuXHJcblx0Ly8gRmlsZVNvdXJjZSBEZWZhdWx0cyAtIEltcG9ydCBmcm9tIEZpbGVTb3VyY2VDb25maWdcclxuXHRmaWxlU291cmNlOiB7XHJcblx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdHJlY29nbml0aW9uU3RyYXRlZ2llczoge1xyXG5cdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0dGFza0ZpZWxkczogW1wiZHVlRGF0ZVwiLCBcInN0YXR1c1wiLCBcInByaW9yaXR5XCIsIFwiYXNzaWduZWRcIl0sXHJcblx0XHRcdFx0cmVxdWlyZUFsbEZpZWxkczogZmFsc2UsXHJcblx0XHRcdH0sXHJcblx0XHRcdHRhZ3M6IHtcclxuXHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdHRhc2tUYWdzOiBbXCIjdGFza1wiLCBcIiNhY3Rpb25hYmxlXCIsIFwiI3RvZG9cIl0sXHJcblx0XHRcdFx0bWF0Y2hNb2RlOiBcImV4YWN0XCIsXHJcblx0XHRcdH0sXHJcblx0XHRcdHRlbXBsYXRlczoge1xyXG5cdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHRlbXBsYXRlUGF0aHM6IFtcIlRlbXBsYXRlcy9UYXNrIFRlbXBsYXRlLm1kXCJdLFxyXG5cdFx0XHRcdGNoZWNrVGVtcGxhdGVNZXRhZGF0YTogdHJ1ZSxcclxuXHRcdFx0fSxcclxuXHRcdFx0cGF0aHM6IHtcclxuXHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0XHR0YXNrUGF0aHM6IFtcIlByb2plY3RzL1wiLCBcIlRhc2tzL1wiXSxcclxuXHRcdFx0XHRtYXRjaE1vZGU6IFwicHJlZml4XCIsXHJcblx0XHRcdH0sXHJcblx0XHR9LFxyXG5cdFx0ZmlsZVRhc2tQcm9wZXJ0aWVzOiB7XHJcblx0XHRcdGNvbnRlbnRTb3VyY2U6IFwiZmlsZW5hbWVcIixcclxuXHRcdFx0c3RyaXBFeHRlbnNpb246IHRydWUsXHJcblx0XHRcdGRlZmF1bHRTdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRkZWZhdWx0UHJpb3JpdHk6IHVuZGVmaW5lZCxcclxuXHRcdFx0cHJlZmVyRnJvbnRtYXR0ZXJUaXRsZTogdHJ1ZSxcclxuXHRcdH0sXHJcblx0XHRyZWxhdGlvbnNoaXBzOiB7XHJcblx0XHRcdGVuYWJsZUNoaWxkUmVsYXRpb25zaGlwczogdHJ1ZSxcclxuXHRcdFx0ZW5hYmxlTWV0YWRhdGFJbmhlcml0YW5jZTogdHJ1ZSxcclxuXHRcdFx0aW5oZXJpdGFuY2VGaWVsZHM6IFtcInByb2plY3RcIiwgXCJwcmlvcml0eVwiLCBcImNvbnRleHRcIl0sXHJcblx0XHR9LFxyXG5cdFx0cGVyZm9ybWFuY2U6IHtcclxuXHRcdFx0ZW5hYmxlV29ya2VyUHJvY2Vzc2luZzogdHJ1ZSxcclxuXHRcdFx0ZW5hYmxlQ2FjaGluZzogdHJ1ZSxcclxuXHRcdFx0Y2FjaGVUVEw6IDMwMDAwMCxcclxuXHRcdH0sXHJcblx0XHRzdGF0dXNNYXBwaW5nOiB7XHJcblx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdG1ldGFkYXRhVG9TeW1ib2w6IHtcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IFwieFwiLFxyXG5cdFx0XHRcdGRvbmU6IFwieFwiLFxyXG5cdFx0XHRcdGZpbmlzaGVkOiBcInhcIixcclxuXHRcdFx0XHRcImluLXByb2dyZXNzXCI6IFwiL1wiLFxyXG5cdFx0XHRcdFwiaW4gcHJvZ3Jlc3NcIjogXCIvXCIsXHJcblx0XHRcdFx0ZG9pbmc6IFwiL1wiLFxyXG5cdFx0XHRcdHBsYW5uZWQ6IFwiP1wiLFxyXG5cdFx0XHRcdHRvZG86IFwiP1wiLFxyXG5cdFx0XHRcdGNhbmNlbGxlZDogXCItXCIsXHJcblx0XHRcdFx0XCJub3Qtc3RhcnRlZFwiOiBcIiBcIixcclxuXHRcdFx0XHRcIm5vdCBzdGFydGVkXCI6IFwiIFwiLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHRzeW1ib2xUb01ldGFkYXRhOiB7XHJcblx0XHRcdFx0eDogXCJjb21wbGV0ZWRcIixcclxuXHRcdFx0XHRYOiBcImNvbXBsZXRlZFwiLFxyXG5cdFx0XHRcdFwiL1wiOiBcImluLXByb2dyZXNzXCIsXHJcblx0XHRcdFx0XCI+XCI6IFwiaW4tcHJvZ3Jlc3NcIixcclxuXHRcdFx0XHRcIj9cIjogXCJwbGFubmVkXCIsXHJcblx0XHRcdFx0XCItXCI6IFwiY2FuY2VsbGVkXCIsXHJcblx0XHRcdFx0XCIgXCI6IFwibm90LXN0YXJ0ZWRcIixcclxuXHRcdFx0fSxcclxuXHRcdFx0YXV0b0RldGVjdDogdHJ1ZSxcclxuXHRcdFx0Y2FzZVNlbnNpdGl2ZTogZmFsc2UsXHJcblx0XHR9LFxyXG5cdH0sXHJcbn07XHJcblxyXG4vLyBIZWxwZXIgZnVuY3Rpb24gdG8gZ2V0IHZpZXcgc2V0dGluZ3Mgc2FmZWx5XHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRWaWV3U2V0dGluZ09yRGVmYXVsdChcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHR2aWV3SWQ6IFZpZXdNb2RlLFxyXG4pOiBWaWV3Q29uZmlnIHtcclxuXHRjb25zdCB2aWV3Q29uZmlndXJhdGlvbiA9XHJcblx0XHRwbHVnaW4uc2V0dGluZ3Mudmlld0NvbmZpZ3VyYXRpb24gfHwgREVGQVVMVF9TRVRUSU5HUy52aWV3Q29uZmlndXJhdGlvbjtcclxuXHJcblx0Ly8gRmlyc3QgY2hlY2sgaWYgdGhlIHZpZXcgZXhpc3RzIGluIHVzZXIgc2V0dGluZ3NcclxuXHRjb25zdCBzYXZlZENvbmZpZyA9IHZpZXdDb25maWd1cmF0aW9uLmZpbmQoKHYpID0+IHYuaWQgPT09IHZpZXdJZCk7XHJcblxyXG5cdC8vIFRoZW4gY2hlY2sgaWYgaXQgZXhpc3RzIGluIGRlZmF1bHQgc2V0dGluZ3NcclxuXHRjb25zdCBkZWZhdWx0Q29uZmlnID0gREVGQVVMVF9TRVRUSU5HUy52aWV3Q29uZmlndXJhdGlvbi5maW5kKFxyXG5cdFx0KHYpID0+IHYuaWQgPT09IHZpZXdJZCxcclxuXHQpO1xyXG5cclxuXHQvLyBJZiBuZWl0aGVyIGV4aXN0cywgY3JlYXRlIGEgZmFsbGJhY2sgZGVmYXVsdCBmb3IgY3VzdG9tIHZpZXdzXHJcblx0Ly8gSU1QT1JUQU5UOiBGYWxsYmFjayBuZWVkcyB0byBkZXRlcm1pbmUgaWYgaXQgKnNob3VsZCogaGF2ZSBzcGVjaWZpY0NvbmZpZyBiYXNlZCBvbiBJRCBwYXR0ZXJuIG9yIG90aGVyIGxvZ2ljIGlmIHBvc3NpYmxlLlxyXG5cdC8vIEZvciBzaW1wbGljaXR5IG5vdywgZmFsbGJhY2sgd29uJ3QgaGF2ZSBzcGVjaWZpY0NvbmZpZyB1bmxlc3MgZXhwbGljaXRseSBhZGRlZCBsYXRlciBmb3IgbmV3IGN1c3RvbSB0eXBlcy5cclxuXHRjb25zdCBmYWxsYmFja0NvbmZpZzogVmlld0NvbmZpZyA9IHtcclxuXHRcdC8vIEV4cGxpY2l0bHkgdHlwZSBmYWxsYmFja1xyXG5cdFx0aWQ6IHZpZXdJZCxcclxuXHRcdG5hbWU6IHZpZXdJZCwgLy8gQ29uc2lkZXIgdXNpbmcgYSBiZXR0ZXIgZGVmYXVsdCBuYW1lIGdlbmVyYXRpb25cclxuXHRcdGljb246IFwibGlzdC1wbHVzXCIsXHJcblx0XHR0eXBlOiBcImN1c3RvbVwiLFxyXG5cdFx0dmlzaWJsZTogdHJ1ZSxcclxuXHRcdGZpbHRlckJsYW5rczogZmFsc2UsXHJcblx0XHRoaWRlQ29tcGxldGVkQW5kQWJhbmRvbmVkVGFza3M6IGZhbHNlLFxyXG5cdFx0ZmlsdGVyUnVsZXM6IHt9LFxyXG5cdFx0Ly8gTm8gc3BlY2lmaWNDb25maWcgZm9yIGdlbmVyaWMgY3VzdG9tIHZpZXdzIGJ5IGRlZmF1bHRcclxuXHR9O1xyXG5cclxuXHQvLyBVc2UgZGVmYXVsdCBjb25maWcgaWYgaXQgZXhpc3RzLCBvdGhlcndpc2UgdXNlIGZhbGxiYWNrXHJcblx0Y29uc3QgYmFzZUNvbmZpZyA9IGRlZmF1bHRDb25maWcgfHwgZmFsbGJhY2tDb25maWc7XHJcblxyXG5cdC8vIE1lcmdlIHNhdmVkIGNvbmZpZyBvbnRvIGJhc2UgY29uZmlnXHJcblx0Y29uc3QgbWVyZ2VkQ29uZmlnOiBWaWV3Q29uZmlnID0ge1xyXG5cdFx0Ly8gRXhwbGljaXRseSB0eXBlIG1lcmdlZFxyXG5cdFx0Li4uYmFzZUNvbmZpZyxcclxuXHRcdC4uLihzYXZlZENvbmZpZyB8fCB7fSksIC8vIFNwcmVhZCBzYXZlZCBjb25maWcgcHJvcGVydGllcywgb3ZlcnJpZGluZyBiYXNlXHJcblx0XHQvLyBFeHBsaWNpdGx5IGhhbmRsZSBtZXJnaW5nIGZpbHRlclJ1bGVzXHJcblx0XHRmaWx0ZXJSdWxlczogc2F2ZWRDb25maWc/LmZpbHRlclJ1bGVzXHJcblx0XHRcdD8ge1xyXG5cdFx0XHRcdFx0Li4uKGJhc2VDb25maWcuZmlsdGVyUnVsZXMgfHwge30pLCAvLyBTdGFydCB3aXRoIGJhc2UncyBmaWx0ZXJSdWxlc1xyXG5cdFx0XHRcdFx0Li4uc2F2ZWRDb25maWcuZmlsdGVyUnVsZXMsIC8vIE92ZXJyaWRlIHdpdGggc2F2ZWQgZmlsdGVyUnVsZXMgcHJvcGVydGllc1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0OiBiYXNlQ29uZmlnLmZpbHRlclJ1bGVzIHx8IHt9LCAvLyBJZiBubyBzYXZlZCBmaWx0ZXJSdWxlcywgdXNlIGJhc2Unc1xyXG5cdFx0Ly8gTWVyZ2Ugc3BlY2lmaWNDb25maWc6IFNhdmVkIG92ZXJyaWRlcyBkZWZhdWx0LCBkZWZhdWx0IG92ZXJyaWRlcyBiYXNlICh3aGljaCBtaWdodCBiZSBmYWxsYmFjayB3aXRob3V0IHNwZWNpZmljQ29uZmlnKVxyXG5cdFx0Ly8gRW5zdXJlIHRoYXQgdGhlIHNwcmVhZCBvZiBzYXZlZENvbmZpZyBkb2Vzbid0IG92ZXJ3cml0ZSBzcGVjaWZpY0NvbmZpZyBvYmplY3QgZW50aXJlbHkgaWYgYmFzZSBoYXMgb25lIGFuZCBzYXZlZCBkb2Vzbid0LlxyXG5cdFx0c3BlY2lmaWNDb25maWc6XHJcblx0XHRcdHNhdmVkQ29uZmlnPy5zcGVjaWZpY0NvbmZpZyAhPT0gdW5kZWZpbmVkXHJcblx0XHRcdFx0PyB7XHJcblx0XHRcdFx0XHRcdC8vIElmIHNhdmVkIGhhcyBzcGVjaWZpY0NvbmZpZywgbWVyZ2UgaXQgb250byBiYXNlJ3NcclxuXHRcdFx0XHRcdFx0Li4uKGJhc2VDb25maWcuc3BlY2lmaWNDb25maWcgfHwge30pLFxyXG5cdFx0XHRcdFx0XHQuLi5zYXZlZENvbmZpZy5zcGVjaWZpY0NvbmZpZyxcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHQ6IGJhc2VDb25maWcuc3BlY2lmaWNDb25maWcsIC8vIE90aGVyd2lzZSwganVzdCB1c2UgYmFzZSdzIHNwZWNpZmljQ29uZmlnIChjb3VsZCBiZSB1bmRlZmluZWQpXHJcblx0fTtcclxuXHJcblx0Ly8gRW5zdXJlIGVzc2VudGlhbCBwcm9wZXJ0aWVzIGV4aXN0IGV2ZW4gaWYgZGVmYXVsdHMgYXJlIHdlaXJkXHJcblx0bWVyZ2VkQ29uZmlnLmZpbHRlclJ1bGVzID0gbWVyZ2VkQ29uZmlnLmZpbHRlclJ1bGVzIHx8IHt9O1xyXG5cclxuXHQvLyBSZW1vdmUgZHVwbGljYXRlIGdhbnR0IHZpZXcgaWYgaXQgZXhpc3RzIGluIHRoZSBkZWZhdWx0IHNldHRpbmdzXHJcblx0aWYgKHZpZXdJZCA9PT0gXCJnYW50dFwiICYmIEFycmF5LmlzQXJyYXkodmlld0NvbmZpZ3VyYXRpb24pKSB7XHJcblx0XHRjb25zdCBnYW50dFZpZXdzID0gdmlld0NvbmZpZ3VyYXRpb24uZmlsdGVyKCh2KSA9PiB2LmlkID09PSBcImdhbnR0XCIpO1xyXG5cdFx0aWYgKGdhbnR0Vmlld3MubGVuZ3RoID4gMSkge1xyXG5cdFx0XHQvLyBLZWVwIG9ubHkgdGhlIGZpcnN0IGdhbnR0IHZpZXdcclxuXHRcdFx0Y29uc3QgaW5kZXhlc1RvUmVtb3ZlID0gdmlld0NvbmZpZ3VyYXRpb25cclxuXHRcdFx0XHQubWFwKCh2LCBpbmRleCkgPT4gKHYuaWQgPT09IFwiZ2FudHRcIiA/IGluZGV4IDogLTEpKVxyXG5cdFx0XHRcdC5maWx0ZXIoKGluZGV4KSA9PiBpbmRleCAhPT0gLTEpXHJcblx0XHRcdFx0LnNsaWNlKDEpO1xyXG5cclxuXHRcdFx0Zm9yIChjb25zdCBpbmRleCBvZiBpbmRleGVzVG9SZW1vdmUucmV2ZXJzZSgpKSB7XHJcblx0XHRcdFx0dmlld0NvbmZpZ3VyYXRpb24uc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gU2F2ZSB0aGUgdXBkYXRlZCBjb25maWd1cmF0aW9uXHJcblx0XHRcdHBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJldHVybiBtZXJnZWRDb25maWc7XHJcbn1cclxuXHJcbi8vIERlZmluZSBzYXZlZCBmaWx0ZXIgY29uZmlndXJhdGlvbiBpbnRlcmZhY2VcclxuZXhwb3J0IGludGVyZmFjZSBTYXZlZEZpbHRlckNvbmZpZyB7XHJcblx0aWQ6IHN0cmluZztcclxuXHRuYW1lOiBzdHJpbmc7XHJcblx0ZGVzY3JpcHRpb24/OiBzdHJpbmc7XHJcblx0ZmlsdGVyU3RhdGU6IFJvb3RGaWx0ZXJTdGF0ZTtcclxuXHRjcmVhdGVkQXQ6IHN0cmluZztcclxuXHR1cGRhdGVkQXQ6IHN0cmluZztcclxufVxyXG5cclxuLy8gRGVmaW5lIGZpbHRlciBjb25maWd1cmF0aW9uIHNldHRpbmdzXHJcbmV4cG9ydCBpbnRlcmZhY2UgRmlsdGVyQ29uZmlnU2V0dGluZ3Mge1xyXG5cdGVuYWJsZVNhdmVkRmlsdGVyczogYm9vbGVhbjtcclxuXHRzYXZlZENvbmZpZ3M6IFNhdmVkRmlsdGVyQ29uZmlnW107XHJcbn1cclxuIl19