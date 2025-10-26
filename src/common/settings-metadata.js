/**
 * 静态设置项元数据
 * 包含所有设置项的基础信息，用于高性能搜索
 */
export const SETTINGS_METADATA = [
    // Progress Display Tab
    {
        id: "progress-bar-main",
        tabId: "progress-bar",
        name: "Progress bar",
        description: "You can customize the progress bar behind the parent task(usually at the end of the task). You can also customize the progress bar for the task below the heading.",
        keywords: ["progress", "bar", "parent", "task", "customize"],
        translationKey: "Progress bar",
        descriptionKey: "You can customize the progress bar behind the parent task(usually at the end of the task). You can also customize the progress bar for the task below the heading.",
        category: "display"
    },
    {
        id: "progress-display-mode",
        tabId: "progress-bar",
        name: "Progress display mode",
        description: "Choose how to display task progress",
        keywords: ["progress", "display", "mode", "choose", "task"],
        translationKey: "Progress display mode",
        descriptionKey: "Choose how to display task progress",
        category: "display"
    },
    {
        id: "progress-reading-mode",
        tabId: "progress-bar",
        name: "Enable progress bar in reading mode",
        description: "Toggle this to allow this plugin to show progress bars in reading mode.",
        keywords: ["progress", "bar", "reading", "mode", "enable", "show"],
        translationKey: "Enable progress bar in reading mode",
        descriptionKey: "Toggle this to allow this plugin to show progress bars in reading mode.",
        category: "display"
    },
    {
        id: "progress-hover-info",
        tabId: "progress-bar",
        name: "Support hover to show progress info",
        description: "Toggle this to allow this plugin to show progress info when hovering over the progress bar.",
        keywords: ["hover", "progress", "info", "show", "support"],
        translationKey: "Support hover to show progress info",
        descriptionKey: "Toggle this to allow this plugin to show progress info when hovering over the progress bar.",
        category: "display"
    },
    {
        id: "progress-non-task-bullet",
        tabId: "progress-bar",
        name: "Add progress bar to non-task bullet",
        description: "Toggle this to allow adding progress bars to regular list items (non-task bullets).",
        keywords: ["progress", "bar", "non-task", "bullet", "list", "items"],
        translationKey: "Add progress bar to non-task bullet",
        descriptionKey: "Toggle this to allow adding progress bars to regular list items (non-task bullets).",
        category: "display"
    },
    {
        id: "progress-heading",
        tabId: "progress-bar",
        name: "Add progress bar to Heading",
        description: "Toggle this to allow this plugin to add progress bar for Task below the headings.",
        keywords: ["progress", "bar", "heading", "task", "below"],
        translationKey: "Add progress bar to Heading",
        descriptionKey: "Toggle this to allow this plugin to add progress bar for Task below the headings.",
        category: "display"
    },
    {
        id: "progress-sub-children",
        tabId: "progress-bar",
        name: "Count sub children of current Task",
        description: "Toggle this to allow this plugin to count sub tasks when generating progress bar.",
        keywords: ["count", "sub", "children", "task", "sub-tasks"],
        translationKey: "Count sub children of current Task",
        descriptionKey: "Toggle this to allow this plugin to count sub tasks when generating progress bar.",
        category: "display"
    },
    {
        id: "progress-custom-goal",
        tabId: "progress-bar",
        name: "Use custom goal for progress bar",
        description: "Toggle this to allow this plugin to find the pattern g::number as goal of the parent task.",
        keywords: ["custom", "goal", "progress", "bar", "pattern", "number"],
        translationKey: "Use custom goal for progress bar",
        descriptionKey: "Toggle this to allow this plugin to find the pattern g::number as goal of the parent task.",
        category: "display"
    },
    {
        id: "progress-format",
        tabId: "progress-bar",
        name: "Progress format",
        description: "Choose how to display the task progress",
        keywords: ["progress", "format", "display", "task"],
        translationKey: "Progress format",
        descriptionKey: "Choose how to display the task progress",
        category: "display"
    },
    {
        id: "hide-progress-bars",
        tabId: "progress-bar",
        name: "Hide progress bars",
        keywords: ["hide", "progress", "bars"],
        translationKey: "Hide progress bars",
        category: "display"
    },
    {
        id: "hide-progress-conditions",
        tabId: "progress-bar",
        name: "Hide progress bars based on conditions",
        description: "Toggle this to enable hiding progress bars based on tags, folders, or metadata.",
        keywords: ["hide", "progress", "bars", "conditions", "tags", "folders", "metadata"],
        translationKey: "Hide progress bars based on conditions",
        descriptionKey: "Toggle this to enable hiding progress bars based on tags, folders, or metadata.",
        category: "display"
    },
    // Checkbox Status Tab
    {
        id: "checkbox-status-settings",
        tabId: "task-status",
        name: "Checkbox Status Settings",
        description: "Configure checkbox status settings",
        keywords: ["checkbox", "status", "settings", "configure"],
        translationKey: "Checkbox Status Settings",
        descriptionKey: "Configure checkbox status settings",
        category: "display"
    },
    {
        id: "file-metadata-inheritance",
        tabId: "task-status",
        name: "File Metadata Inheritance",
        description: "Configure how tasks inherit metadata from file frontmatter",
        keywords: ["file", "metadata", "inheritance", "tasks", "frontmatter"],
        translationKey: "File Metadata Inheritance",
        descriptionKey: "Configure how tasks inherit metadata from file frontmatter",
        category: "display"
    },
    {
        id: "enable-metadata-inheritance",
        tabId: "task-status",
        name: "Enable file metadata inheritance",
        description: "Allow tasks to inherit metadata properties from their file's frontmatter",
        keywords: ["enable", "file", "metadata", "inheritance", "properties"],
        translationKey: "Enable file metadata inheritance",
        descriptionKey: "Allow tasks to inherit metadata properties from their file's frontmatter",
        category: "display"
    },
    {
        id: "auto-complete-parent",
        tabId: "task-status",
        name: "Auto complete parent checkbox",
        description: "Toggle this to allow this plugin to auto complete parent checkbox when all child tasks are completed.",
        keywords: ["auto", "complete", "parent", "checkbox", "child", "tasks"],
        translationKey: "Auto complete parent checkbox",
        descriptionKey: "Toggle this to allow this plugin to auto complete parent checkbox when all child tasks are completed.",
        category: "display"
    },
    {
        id: "parent-in-progress",
        tabId: "task-status",
        name: "Mark parent as 'In Progress' when partially complete",
        description: "When some but not all child tasks are completed, mark the parent checkbox as 'In Progress'. Only works when 'Auto complete parent' is enabled.",
        keywords: ["parent", "in progress", "partially", "complete", "child", "tasks"],
        translationKey: "Mark parent as 'In Progress' when partially complete",
        descriptionKey: "When some but not all child tasks are completed, mark the parent checkbox as 'In Progress'. Only works when 'Auto complete parent' is enabled.",
        category: "display"
    },
    {
        id: "completed-chars",
        tabId: "task-status",
        name: "Completed",
        description: "Characters in square brackets that represent completed tasks. Example: \"x|X\"",
        keywords: ["completed", "characters", "square", "brackets", "tasks"],
        translationKey: "Completed",
        descriptionKey: "Characters in square brackets that represent completed tasks. Example: \"x|X\"",
        category: "display"
    },
    {
        id: "planned-chars",
        tabId: "task-status",
        name: "Planned",
        description: "Characters in square brackets that represent planned tasks. Example: \"?\"",
        keywords: ["planned", "characters", "square", "brackets", "tasks"],
        translationKey: "Planned",
        descriptionKey: "Characters in square brackets that represent planned tasks. Example: \"?\"",
        category: "display"
    },
    {
        id: "in-progress-chars",
        tabId: "task-status",
        name: "In Progress",
        description: "Characters in square brackets that represent tasks in progress. Example: \">|/\"",
        keywords: ["in progress", "characters", "square", "brackets", "tasks"],
        translationKey: "In Progress",
        descriptionKey: "Characters in square brackets that represent tasks in progress. Example: \">|/\"",
        category: "display"
    },
    {
        id: "abandoned-chars",
        tabId: "task-status",
        name: "Abandoned",
        description: "Characters in square brackets that represent abandoned tasks. Example: \"-\"",
        keywords: ["abandoned", "characters", "square", "brackets", "tasks"],
        translationKey: "Abandoned",
        descriptionKey: "Characters in square brackets that represent abandoned tasks. Example: \"-\"",
        category: "display"
    },
    {
        id: "not-started-chars",
        tabId: "task-status",
        name: "Not Started",
        description: "Characters in square brackets that represent not started tasks. Default is space \" \"",
        keywords: ["not started", "characters", "square", "brackets", "tasks", "space"],
        translationKey: "Not Started",
        descriptionKey: "Characters in square brackets that represent not started tasks. Default is space \" \"",
        category: "display"
    },
    // Dates & Priority Tab
    {
        id: "priority-picker-settings",
        tabId: "date-priority",
        name: "Priority Picker Settings",
        description: "Toggle to enable priority picker dropdown for emoji and letter format priorities.",
        keywords: ["priority", "picker", "settings", "dropdown", "emoji", "letter"],
        translationKey: "Priority Picker Settings",
        descriptionKey: "Toggle to enable priority picker dropdown for emoji and letter format priorities.",
        category: "workflow"
    },
    {
        id: "enable-priority-picker",
        tabId: "date-priority",
        name: "Enable priority picker",
        description: "Toggle to enable priority picker dropdown for emoji and letter format priorities.",
        keywords: ["enable", "priority", "picker", "dropdown", "emoji", "letter"],
        translationKey: "Enable priority picker",
        descriptionKey: "Toggle to enable priority picker dropdown for emoji and letter format priorities.",
        category: "workflow"
    },
    {
        id: "enable-priority-shortcuts",
        tabId: "date-priority",
        name: "Enable priority keyboard shortcuts",
        description: "Toggle to enable keyboard shortcuts for setting task priorities.",
        keywords: ["enable", "priority", "keyboard", "shortcuts", "task"],
        translationKey: "Enable priority keyboard shortcuts",
        descriptionKey: "Toggle to enable keyboard shortcuts for setting task priorities.",
        category: "workflow"
    },
    {
        id: "date-picker",
        tabId: "date-priority",
        name: "Date picker",
        keywords: ["date", "picker"],
        translationKey: "Date picker",
        category: "workflow"
    },
    {
        id: "enable-date-picker",
        tabId: "date-priority",
        name: "Enable date picker",
        description: "Toggle this to enable date picker for tasks. This will add a calendar icon near your tasks which you can click to select a date.",
        keywords: ["enable", "date", "picker", "tasks", "calendar", "icon"],
        translationKey: "Enable date picker",
        descriptionKey: "Toggle this to enable date picker for tasks. This will add a calendar icon near your tasks which you can click to select a date.",
        category: "workflow"
    },
    {
        id: "recurrence-calculation",
        tabId: "date-priority",
        name: "Recurrence date calculation",
        description: "Choose how to calculate the next date for recurring tasks",
        keywords: ["recurrence", "date", "calculation", "recurring", "tasks"],
        translationKey: "Recurrence date calculation",
        descriptionKey: "Choose how to calculate the next date for recurring tasks",
        category: "workflow"
    },
    // Task Filter Tab
    {
        id: "task-filter",
        tabId: "task-filter",
        name: "Task Filter",
        keywords: ["task", "filter"],
        translationKey: "Task Filter",
        category: "management"
    },
    {
        id: "enable-task-filter",
        tabId: "task-filter",
        name: "Enable Task Filter",
        description: "Toggle this to enable the task filter panel",
        keywords: ["enable", "task", "filter", "panel"],
        translationKey: "Enable Task Filter",
        descriptionKey: "Toggle this to enable the task filter panel",
        category: "management"
    },
    {
        id: "preset-filters",
        tabId: "task-filter",
        name: "Preset Filters",
        description: "Create and manage preset filters for quick access to commonly used task filters.",
        keywords: ["preset", "filters", "create", "manage", "quick", "access"],
        translationKey: "Preset Filters",
        descriptionKey: "Create and manage preset filters for quick access to commonly used task filters.",
        category: "management"
    },
    // File Filter Tab
    {
        id: "file-filter",
        tabId: "file-filter",
        name: "File Filter",
        keywords: ["file", "filter"],
        translationKey: "File Filter",
        category: "core"
    },
    {
        id: "enable-file-filter",
        tabId: "file-filter",
        name: "Enable File Filter",
        description: "Toggle this to enable file and folder filtering during task indexing. This can significantly improve performance for large vaults.",
        keywords: ["enable", "file", "filter", "folder", "indexing", "performance"],
        translationKey: "Enable File Filter",
        descriptionKey: "Toggle this to enable file and folder filtering during task indexing. This can significantly improve performance for large vaults.",
        category: "core"
    },
    {
        id: "file-filter-mode",
        tabId: "file-filter",
        name: "File Filter Mode",
        description: "Choose whether to include only specified files/folders (whitelist) or exclude them (blacklist)",
        keywords: ["file", "filter", "mode", "whitelist", "blacklist", "include", "exclude"],
        translationKey: "File Filter Mode",
        descriptionKey: "Choose whether to include only specified files/folders (whitelist) or exclude them (blacklist)",
        category: "core"
    },
    {
        id: "file-filter-rules",
        tabId: "file-filter",
        name: "File Filter Rules",
        description: "Configure which files and folders to include or exclude from task indexing",
        keywords: ["file", "filter", "rules", "configure", "folders", "indexing"],
        translationKey: "File Filter Rules",
        descriptionKey: "Configure which files and folders to include or exclude from task indexing",
        category: "core"
    },
    // Task Handler Tab
    {
        id: "task-gutter",
        tabId: "task-handler",
        name: "Task Gutter",
        description: "Configure the task gutter.",
        keywords: ["task", "gutter", "configure"],
        translationKey: "Task Gutter",
        descriptionKey: "Configure the task gutter.",
        category: "management"
    },
    {
        id: "enable-task-gutter",
        tabId: "task-handler",
        name: "Enable task gutter",
        description: "Toggle this to enable the task gutter.",
        keywords: ["enable", "task", "gutter"],
        translationKey: "Enable task gutter",
        descriptionKey: "Toggle this to enable the task gutter.",
        category: "management"
    },
    {
        id: "completed-task-mover",
        tabId: "task-handler",
        name: "Completed Task Mover",
        keywords: ["completed", "task", "mover"],
        translationKey: "Completed Task Mover",
        category: "management"
    },
    {
        id: "enable-completed-mover",
        tabId: "task-handler",
        name: "Enable completed task mover",
        description: "Toggle this to enable commands for moving completed tasks to another file.",
        keywords: ["enable", "completed", "task", "mover", "commands", "moving"],
        translationKey: "Enable completed task mover",
        descriptionKey: "Toggle this to enable commands for moving completed tasks to another file.",
        category: "management"
    },
    {
        id: "task-sorting",
        tabId: "task-handler",
        name: "Task Sorting",
        description: "Configure how tasks are sorted in the document.",
        keywords: ["task", "sorting", "configure", "document"],
        translationKey: "Task Sorting",
        descriptionKey: "Configure how tasks are sorted in the document.",
        category: "management"
    },
    {
        id: "enable-task-sorting",
        tabId: "task-handler",
        name: "Enable Task Sorting",
        description: "Toggle this to enable commands for sorting tasks.",
        keywords: ["enable", "task", "sorting", "commands"],
        translationKey: "Enable Task Sorting",
        descriptionKey: "Toggle this to enable commands for sorting tasks.",
        category: "management"
    },
    // Workflows Tab
    {
        id: "workflow",
        tabId: "workflow",
        name: "Workflow",
        description: "Configure task workflows for project and process management",
        keywords: ["workflow", "configure", "task", "project", "process", "management"],
        translationKey: "Workflow",
        descriptionKey: "Configure task workflows for project and process management",
        category: "workflow"
    },
    {
        id: "enable-workflow",
        tabId: "workflow",
        name: "Enable workflow",
        description: "Toggle to enable the workflow system for tasks",
        keywords: ["enable", "workflow", "system", "tasks"],
        translationKey: "Enable workflow",
        descriptionKey: "Toggle to enable the workflow system for tasks",
        category: "workflow"
    },
    {
        id: "auto-add-timestamp",
        tabId: "workflow",
        name: "Auto-add timestamp",
        description: "Automatically add a timestamp to the task when it is created",
        keywords: ["auto", "add", "timestamp", "task", "created"],
        translationKey: "Auto-add timestamp",
        descriptionKey: "Automatically add a timestamp to the task when it is created",
        category: "workflow"
    },
    {
        id: "auto-remove-stage-marker",
        tabId: "workflow",
        name: "Auto remove last stage marker",
        description: "Automatically remove the last stage marker when a task is completed",
        keywords: ["auto", "remove", "stage", "marker", "task", "completed"],
        translationKey: "Auto remove last stage marker",
        descriptionKey: "Automatically remove the last stage marker when a task is completed",
        category: "workflow"
    },
    {
        id: "auto-add-next-task",
        tabId: "workflow",
        name: "Auto-add next task",
        description: "Automatically create a new task with the next stage when completing a task",
        keywords: ["auto", "add", "next", "task", "create", "stage", "completing"],
        translationKey: "Auto-add next task",
        descriptionKey: "Automatically create a new task with the next stage when completing a task",
        category: "workflow"
    },
    // Quick Capture Tab
    {
        id: "quick-capture",
        tabId: "quick-capture",
        name: "Quick capture",
        keywords: ["quick", "capture"],
        translationKey: "Quick capture",
        category: "workflow"
    },
    {
        id: "enable-quick-capture",
        tabId: "quick-capture",
        name: "Enable quick capture",
        description: "Toggle this to enable Org-mode style quick capture panel.",
        keywords: ["enable", "quick", "capture", "org-mode", "panel"],
        translationKey: "Enable quick capture",
        descriptionKey: "Toggle this to enable Org-mode style quick capture panel.",
        category: "workflow"
    },
    {
        id: "capture-target-type",
        tabId: "quick-capture",
        name: "Target type",
        description: "Choose whether to capture to a fixed file or daily note",
        keywords: ["target", "type", "capture", "fixed", "file", "daily", "note"],
        translationKey: "Target type",
        descriptionKey: "Choose whether to capture to a fixed file or daily note",
        category: "workflow"
    },
    {
        id: "capture-target-file",
        tabId: "quick-capture",
        name: "Target file",
        description: "The file where captured text will be saved. You can include a path, e.g., 'folder/Quick Capture.md'. Supports date templates like {{DATE:YYYY-MM-DD}} or {{date:YYYY-MM-DD-HHmm}}",
        keywords: ["target", "file", "captured", "text", "saved", "path", "templates"],
        translationKey: "Target file",
        descriptionKey: "The file where captured text will be saved. You can include a path, e.g., 'folder/Quick Capture.md'. Supports date templates like {{DATE:YYYY-MM-DD}} or {{date:YYYY-MM-DD-HHmm}}",
        category: "workflow"
    },
    {
        id: "minimal-mode",
        tabId: "quick-capture",
        name: "Minimal Mode",
        keywords: ["minimal", "mode"],
        translationKey: "Minimal Mode",
        category: "workflow"
    },
    {
        id: "enable-minimal-mode",
        tabId: "quick-capture",
        name: "Enable minimal mode",
        description: "Enable simplified single-line quick capture with inline suggestions",
        keywords: ["enable", "minimal", "mode", "simplified", "single-line", "suggestions"],
        translationKey: "Enable minimal mode",
        descriptionKey: "Enable simplified single-line quick capture with inline suggestions",
        category: "workflow"
    },
    // Time Parsing Tab
    {
        id: "time-parsing-settings",
        tabId: "time-parsing",
        name: "Time Parsing Settings",
        keywords: ["time", "parsing", "settings"],
        translationKey: "Time Parsing Settings",
        category: "workflow"
    },
    {
        id: "enable-time-parsing",
        tabId: "time-parsing",
        name: "Enable Time Parsing",
        description: "Automatically parse natural language time expressions in Quick Capture",
        keywords: ["enable", "time", "parsing", "natural", "language", "expressions", "quick", "capture"],
        translationKey: "Enable Time Parsing",
        descriptionKey: "Automatically parse natural language time expressions in Quick Capture",
        category: "workflow"
    },
    {
        id: "remove-time-expressions",
        tabId: "time-parsing",
        name: "Remove Original Time Expressions",
        description: "Remove parsed time expressions from the task text",
        keywords: ["remove", "original", "time", "expressions", "parsed", "task", "text"],
        translationKey: "Remove Original Time Expressions",
        descriptionKey: "Remove parsed time expressions from the task text",
        category: "workflow"
    },
    {
        id: "start-date-keywords",
        tabId: "time-parsing",
        name: "Start Date Keywords",
        description: "Keywords that indicate start dates (comma-separated)",
        keywords: ["start", "date", "keywords", "indicate", "comma-separated"],
        translationKey: "Start Date Keywords",
        descriptionKey: "Keywords that indicate start dates (comma-separated)",
        category: "workflow"
    },
    {
        id: "due-date-keywords",
        tabId: "time-parsing",
        name: "Due Date Keywords",
        description: "Keywords that indicate due dates (comma-separated)",
        keywords: ["due", "date", "keywords", "indicate", "comma-separated"],
        translationKey: "Due Date Keywords",
        descriptionKey: "Keywords that indicate due dates (comma-separated)",
        category: "workflow"
    },
    {
        id: "scheduled-date-keywords",
        tabId: "time-parsing",
        name: "Scheduled Date Keywords",
        description: "Keywords that indicate scheduled dates (comma-separated)",
        keywords: ["scheduled", "date", "keywords", "indicate", "comma-separated"],
        translationKey: "Scheduled Date Keywords",
        descriptionKey: "Keywords that indicate scheduled dates (comma-separated)",
        category: "workflow"
    },
    // Timeline Sidebar Tab
    {
        id: "timeline-sidebar",
        tabId: "timeline-sidebar",
        name: "Timeline Sidebar",
        keywords: ["timeline", "sidebar"],
        translationKey: "Timeline Sidebar",
        category: "workflow"
    },
    {
        id: "enable-timeline-sidebar",
        tabId: "timeline-sidebar",
        name: "Enable Timeline Sidebar",
        description: "Toggle this to enable the timeline sidebar view for quick access to your daily events and tasks.",
        keywords: ["enable", "timeline", "sidebar", "view", "quick", "access", "daily", "events", "tasks"],
        translationKey: "Enable Timeline Sidebar",
        descriptionKey: "Toggle this to enable the timeline sidebar view for quick access to your daily events and tasks.",
        category: "workflow"
    },
    {
        id: "timeline-auto-open",
        tabId: "timeline-sidebar",
        name: "Auto-open on startup",
        description: "Automatically open the timeline sidebar when Obsidian starts.",
        keywords: ["auto-open", "startup", "automatically", "timeline", "sidebar", "obsidian"],
        translationKey: "Auto-open on startup",
        descriptionKey: "Automatically open the timeline sidebar when Obsidian starts.",
        category: "workflow"
    },
    {
        id: "timeline-show-completed",
        tabId: "timeline-sidebar",
        name: "Show completed tasks",
        description: "Include completed tasks in the timeline view. When disabled, only incomplete tasks will be shown.",
        keywords: ["show", "completed", "tasks", "timeline", "view", "incomplete"],
        translationKey: "Show completed tasks",
        descriptionKey: "Include completed tasks in the timeline view. When disabled, only incomplete tasks will be shown.",
        category: "workflow"
    },
    // Projects Tab
    {
        id: "enhanced-project-config",
        tabId: "project",
        name: "Enhanced Project Configuration",
        description: "Configure advanced project detection and management features",
        keywords: ["enhanced", "project", "configuration", "advanced", "detection", "management"],
        translationKey: "Enhanced Project Configuration",
        descriptionKey: "Configure advanced project detection and management features",
        category: "management"
    },
    {
        id: "enable-enhanced-projects",
        tabId: "project",
        name: "Enable enhanced project features",
        description: "Enable path-based, metadata-based, and config file-based project detection",
        keywords: ["enable", "enhanced", "project", "features", "path-based", "metadata-based", "config"],
        translationKey: "Enable enhanced project features",
        descriptionKey: "Enable path-based, metadata-based, and config file-based project detection",
        category: "management"
    },
    {
        id: "path-based-projects",
        tabId: "project",
        name: "Path-based Project Mappings",
        description: "Configure project names based on file paths",
        keywords: ["path-based", "project", "mappings", "configure", "names", "file", "paths"],
        translationKey: "Path-based Project Mappings",
        descriptionKey: "Configure project names based on file paths",
        category: "management"
    },
    {
        id: "metadata-based-projects",
        tabId: "project",
        name: "Metadata-based Project Configuration",
        description: "Configure project detection from file frontmatter",
        keywords: ["metadata-based", "project", "configuration", "detection", "file", "frontmatter"],
        translationKey: "Metadata-based Project Configuration",
        descriptionKey: "Configure project detection from file frontmatter",
        category: "management"
    },
    // Views & Index Tab
    {
        id: "view-index-config",
        tabId: "view-settings",
        name: "View & Index Configuration",
        description: "Configure the Task Genius sidebar views, visibility, order, and create custom views.",
        keywords: ["view", "index", "configuration", "sidebar", "visibility", "order", "custom"],
        translationKey: "View & Index Configuration",
        descriptionKey: "Configure the Task Genius sidebar views, visibility, order, and create custom views.",
        category: "core"
    },
    {
        id: "enable-task-genius-view",
        tabId: "view-settings",
        name: "Enable task genius view",
        description: "Enable task genius view will also enable the task genius indexer, which will provide the task genius view results from whole vault.",
        keywords: ["enable", "task", "genius", "view", "indexer", "vault"],
        translationKey: "Enable task genius view",
        descriptionKey: "Enable task genius view will also enable the task genius indexer, which will provide the task genius view results from whole vault.",
        category: "core"
    },
    {
        id: "default-view-mode",
        tabId: "view-settings",
        name: "Default view mode",
        description: "Choose the default display mode for all views. This affects how tasks are displayed when you first open a view or create a new view.",
        keywords: ["default", "view", "mode", "display", "tasks", "open", "create"],
        translationKey: "Default view mode",
        descriptionKey: "Choose the default display mode for all views. This affects how tasks are displayed when you first open a view or create a new view.",
        category: "core"
    },
    {
        id: "prefer-metadata-format",
        tabId: "view-settings",
        name: "Prefer metadata format of task",
        description: "You can choose dataview format or tasks format, that will influence both index and save format.",
        keywords: ["prefer", "metadata", "format", "task", "dataview", "tasks", "index", "save"],
        translationKey: "Prefer metadata format of task",
        descriptionKey: "You can choose dataview format or tasks format, that will influence both index and save format.",
        category: "core"
    },
    // Rewards Tab
    {
        id: "rewards",
        tabId: "reward",
        name: "Rewards",
        description: "Configure rewards for completing tasks. Define items, their occurrence chances, and conditions.",
        keywords: ["rewards", "configure", "completing", "tasks", "items", "occurrence", "chances", "conditions"],
        translationKey: "Rewards",
        descriptionKey: "Configure rewards for completing tasks. Define items, their occurrence chances, and conditions.",
        category: "gamification"
    },
    {
        id: "enable-rewards",
        tabId: "reward",
        name: "Enable rewards",
        description: "Toggle to enable or disable the reward system.",
        keywords: ["enable", "rewards", "toggle", "disable", "reward", "system"],
        translationKey: "Enable rewards",
        descriptionKey: "Toggle to enable or disable the reward system.",
        category: "gamification"
    },
    {
        id: "reward-display-type",
        tabId: "reward",
        name: "Reward display type",
        description: "Choose how rewards are displayed when earned.",
        keywords: ["reward", "display", "type", "choose", "displayed", "earned"],
        translationKey: "Reward display type",
        descriptionKey: "Choose how rewards are displayed when earned.",
        category: "gamification"
    },
    {
        id: "occurrence-levels",
        tabId: "reward",
        name: "Occurrence levels",
        description: "Define different levels of reward rarity and their probability.",
        keywords: ["occurrence", "levels", "define", "different", "reward", "rarity", "probability"],
        translationKey: "Occurrence levels",
        descriptionKey: "Define different levels of reward rarity and their probability.",
        category: "gamification"
    },
    {
        id: "reward-items",
        tabId: "reward",
        name: "Reward items",
        description: "Manage the specific rewards that can be obtained.",
        keywords: ["reward", "items", "manage", "specific", "rewards", "obtained"],
        translationKey: "Reward items",
        descriptionKey: "Manage the specific rewards that can be obtained.",
        category: "gamification"
    },
    // Habits Tab
    {
        id: "habit",
        tabId: "habit",
        name: "Habit",
        description: "Configure habit settings, including adding new habits, editing existing habits, and managing habit completion.",
        keywords: ["habit", "configure", "settings", "adding", "editing", "managing", "completion"],
        translationKey: "Habit",
        descriptionKey: "Configure habit settings, including adding new habits, editing existing habits, and managing habit completion.",
        category: "gamification"
    },
    {
        id: "enable-habits",
        tabId: "habit",
        name: "Enable habits",
        keywords: ["enable", "habits"],
        translationKey: "Enable habits",
        category: "gamification"
    },
    // Calendar Sync Tab
    {
        id: "ics-calendar-integration",
        tabId: "ics-integration",
        name: "ICS Calendar Integration",
        keywords: ["ics", "calendar", "integration"],
        translationKey: "ICS Calendar Integration",
        category: "integration"
    },
    {
        id: "enable-background-refresh",
        tabId: "ics-integration",
        name: "Enable Background Refresh",
        description: "Automatically refresh calendar sources in the background",
        keywords: ["enable", "background", "refresh", "automatically", "calendar", "sources"],
        translationKey: "Enable Background Refresh",
        descriptionKey: "Automatically refresh calendar sources in the background",
        category: "integration"
    },
    {
        id: "global-refresh-interval",
        tabId: "ics-integration",
        name: "Global Refresh Interval",
        description: "Default refresh interval for all sources (minutes)",
        keywords: ["global", "refresh", "interval", "default", "sources", "minutes"],
        translationKey: "Global Refresh Interval",
        descriptionKey: "Default refresh interval for all sources (minutes)",
        category: "integration"
    },
    {
        id: "maximum-cache-age",
        tabId: "ics-integration",
        name: "Maximum Cache Age",
        description: "How long to keep cached data (hours)",
        keywords: ["maximum", "cache", "age", "keep", "cached", "data", "hours"],
        translationKey: "Maximum Cache Age",
        descriptionKey: "How long to keep cached data (hours)",
        category: "integration"
    },
    // Beta Features Tab
    {
        id: "beta-test-features",
        tabId: "beta-test",
        name: "Beta Test Features",
        description: "Experimental features that are currently in testing phase. These features may be unstable and could change or be removed in future updates.",
        keywords: ["beta", "test", "features", "experimental", "testing", "phase", "unstable"],
        translationKey: "Beta Test Features",
        descriptionKey: "Experimental features that are currently in testing phase. These features may be unstable and could change or be removed in future updates.",
        category: "advanced"
    },
    {
        id: "base-view",
        tabId: "beta-test",
        name: "Base View",
        description: "Advanced view management features that extend the default Task Genius views with additional functionality.",
        keywords: ["base", "view", "advanced", "management", "features", "extend", "default", "functionality"],
        translationKey: "Base View",
        descriptionKey: "Advanced view management features that extend the default Task Genius views with additional functionality.",
        category: "advanced"
    },
    {
        id: "enable-base-view",
        tabId: "beta-test",
        name: "Enable Base View",
        description: "Enable experimental Base View functionality. This feature provides enhanced view management capabilities but may be affected by future Obsidian API changes. You may need to restart Obsidian to see the changes.",
        keywords: ["enable", "base", "view", "experimental", "functionality", "enhanced", "management", "capabilities"],
        translationKey: "Enable Base View",
        descriptionKey: "Enable experimental Base View functionality. This feature provides enhanced view management capabilities but may be affected by future Obsidian API changes. You may need to restart Obsidian to see the changes.",
        category: "advanced"
    },
    // About Tab
    {
        id: "about-task-genius",
        tabId: "about",
        name: "About Task Genius",
        keywords: ["about", "task", "genius"],
        translationKey: "About",
        category: "info"
    },
    {
        id: "version",
        tabId: "about",
        name: "Version",
        keywords: ["version"],
        translationKey: "Version",
        category: "info"
    },
    {
        id: "donate",
        tabId: "about",
        name: "Donate",
        description: "If you like this plugin, consider donating to support continued development:",
        keywords: ["donate", "plugin", "support", "development"],
        translationKey: "Donate",
        descriptionKey: "If you like this plugin, consider donating to support continued development:",
        category: "info"
    },
    {
        id: "documentation",
        tabId: "about",
        name: "Documentation",
        description: "View the documentation for this plugin",
        keywords: ["documentation", "view", "plugin"],
        translationKey: "Documentation",
        descriptionKey: "View the documentation for this plugin",
        category: "info"
    },
    {
        id: "onboarding",
        tabId: "about",
        name: "Onboarding",
        description: "Restart the welcome guide and setup wizard",
        keywords: ["onboarding", "restart", "welcome", "guide", "setup", "wizard"],
        translationKey: "Onboarding",
        descriptionKey: "Restart the welcome guide and setup wizard",
        category: "info"
    }
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3MtbWV0YWRhdGEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzZXR0aW5ncy1tZXRhZGF0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFQTs7O0dBR0c7QUFDSCxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBd0I7SUFDckQsdUJBQXVCO0lBQ3ZCO1FBQ0MsRUFBRSxFQUFFLG1CQUFtQjtRQUN2QixLQUFLLEVBQUUsY0FBYztRQUNyQixJQUFJLEVBQUUsY0FBYztRQUNwQixXQUFXLEVBQUUsb0tBQW9LO1FBQ2pMLFFBQVEsRUFBRSxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxXQUFXLENBQUM7UUFDNUQsY0FBYyxFQUFFLGNBQWM7UUFDOUIsY0FBYyxFQUFFLG9LQUFvSztRQUNwTCxRQUFRLEVBQUUsU0FBUztLQUNuQjtJQUNEO1FBQ0MsRUFBRSxFQUFFLHVCQUF1QjtRQUMzQixLQUFLLEVBQUUsY0FBYztRQUNyQixJQUFJLEVBQUUsdUJBQXVCO1FBQzdCLFdBQVcsRUFBRSxxQ0FBcUM7UUFDbEQsUUFBUSxFQUFFLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQztRQUMzRCxjQUFjLEVBQUUsdUJBQXVCO1FBQ3ZDLGNBQWMsRUFBRSxxQ0FBcUM7UUFDckQsUUFBUSxFQUFFLFNBQVM7S0FDbkI7SUFDRDtRQUNDLEVBQUUsRUFBRSx1QkFBdUI7UUFDM0IsS0FBSyxFQUFFLGNBQWM7UUFDckIsSUFBSSxFQUFFLHFDQUFxQztRQUMzQyxXQUFXLEVBQUUseUVBQXlFO1FBQ3RGLFFBQVEsRUFBRSxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDO1FBQ2xFLGNBQWMsRUFBRSxxQ0FBcUM7UUFDckQsY0FBYyxFQUFFLHlFQUF5RTtRQUN6RixRQUFRLEVBQUUsU0FBUztLQUNuQjtJQUNE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USxFQUFFLENBQUMsWUFBWSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUM7UUFDMUUsY0FBYyxFQUFFLFlBQVk7UUFDNUIsY0FBYyxFQUFFLDRDQUE0QztRQUM1RCxRQUFRLEVBQUUsTUFBTTtLQUNoQjtDQUNELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTZXR0aW5nU2VhcmNoSXRlbSB9IGZyb20gXCIuLi90eXBlcy9TZXR0aW5nc1NlYXJjaFwiO1xyXG5cclxuLyoqXHJcbiAqIOmdmeaAgeiuvue9rumhueWFg+aVsOaNrlxyXG4gKiDljIXlkKvmiYDmnInorr7nva7pobnnmoTln7rnoYDkv6Hmga/vvIznlKjkuo7pq5jmgKfog73mkJzntKJcclxuICovXHJcbmV4cG9ydCBjb25zdCBTRVRUSU5HU19NRVRBREFUQTogU2V0dGluZ1NlYXJjaEl0ZW1bXSA9IFtcclxuXHQvLyBQcm9ncmVzcyBEaXNwbGF5IFRhYlxyXG5cdHtcclxuXHRcdGlkOiBcInByb2dyZXNzLWJhci1tYWluXCIsXHJcblx0XHR0YWJJZDogXCJwcm9ncmVzcy1iYXJcIixcclxuXHRcdG5hbWU6IFwiUHJvZ3Jlc3MgYmFyXCIsXHJcblx0XHRkZXNjcmlwdGlvbjogXCJZb3UgY2FuIGN1c3RvbWl6ZSB0aGUgcHJvZ3Jlc3MgYmFyIGJlaGluZCB0aGUgcGFyZW50IHRhc2sodXN1YWxseSBhdCB0aGUgZW5kIG9mIHRoZSB0YXNrKS4gWW91IGNhbiBhbHNvIGN1c3RvbWl6ZSB0aGUgcHJvZ3Jlc3MgYmFyIGZvciB0aGUgdGFzayBiZWxvdyB0aGUgaGVhZGluZy5cIixcclxuXHRcdGtleXdvcmRzOiBbXCJwcm9ncmVzc1wiLCBcImJhclwiLCBcInBhcmVudFwiLCBcInRhc2tcIiwgXCJjdXN0b21pemVcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJQcm9ncmVzcyBiYXJcIixcclxuXHRcdGRlc2NyaXB0aW9uS2V5OiBcIllvdSBjYW4gY3VzdG9taXplIHRoZSBwcm9ncmVzcyBiYXIgYmVoaW5kIHRoZSBwYXJlbnQgdGFzayh1c3VhbGx5IGF0IHRoZSBlbmQgb2YgdGhlIHRhc2spLiBZb3UgY2FuIGFsc28gY3VzdG9taXplIHRoZSBwcm9ncmVzcyBiYXIgZm9yIHRoZSB0YXNrIGJlbG93IHRoZSBoZWFkaW5nLlwiLFxyXG5cdFx0Y2F0ZWdvcnk6IFwiZGlzcGxheVwiXHJcblx0fSxcclxuXHR7XHJcblx0XHRpZDogXCJwcm9ncmVzcy1kaXNwbGF5LW1vZGVcIixcclxuXHRcdHRhYklkOiBcInByb2dyZXNzLWJhclwiLFxyXG5cdFx0bmFtZTogXCJQcm9ncmVzcyBkaXNwbGF5IG1vZGVcIixcclxuXHRcdGRlc2NyaXB0aW9uOiBcIkNob29zZSBob3cgdG8gZGlzcGxheSB0YXNrIHByb2dyZXNzXCIsXHJcblx0XHRrZXl3b3JkczogW1wicHJvZ3Jlc3NcIiwgXCJkaXNwbGF5XCIsIFwibW9kZVwiLCBcImNob29zZVwiLCBcInRhc2tcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJQcm9ncmVzcyBkaXNwbGF5IG1vZGVcIixcclxuXHRcdGRlc2NyaXB0aW9uS2V5OiBcIkNob29zZSBob3cgdG8gZGlzcGxheSB0YXNrIHByb2dyZXNzXCIsXHJcblx0XHRjYXRlZ29yeTogXCJkaXNwbGF5XCJcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiBcInByb2dyZXNzLXJlYWRpbmctbW9kZVwiLFxyXG5cdFx0dGFiSWQ6IFwicHJvZ3Jlc3MtYmFyXCIsXHJcblx0XHRuYW1lOiBcIkVuYWJsZSBwcm9ncmVzcyBiYXIgaW4gcmVhZGluZyBtb2RlXCIsXHJcblx0XHRkZXNjcmlwdGlvbjogXCJUb2dnbGUgdGhpcyB0byBhbGxvdyB0aGlzIHBsdWdpbiB0byBzaG93IHByb2dyZXNzIGJhcnMgaW4gcmVhZGluZyBtb2RlLlwiLFxyXG5cdFx0a2V5d29yZHM6IFtcInByb2dyZXNzXCIsIFwiYmFyXCIsIFwicmVhZGluZ1wiLCBcIm1vZGVcIiwgXCJlbmFibGVcIiwgXCJzaG93XCJdLFxyXG5cdFx0dHJhbnNsYXRpb25LZXk6IFwiRW5hYmxlIHByb2dyZXNzIGJhciBpbiByZWFkaW5nIG1vZGVcIixcclxuXHRcdGRlc2NyaXB0aW9uS2V5OiBcIlRvZ2dsZSB0aGlzIHRvIGFsbG93IHRoaXMgcGx1Z2luIHRvIHNob3cgcHJvZ3Jlc3MgYmFycyBpbiByZWFkaW5nIG1vZGUuXCIsXHJcblx0XHRjYXRlZ29yeTogXCJkaXNwbGF5XCJcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiBcInByb2dyZXNzLWhvdmVyLWluZm9cIixcclxuXHRcdHRhYklkOiBcInByb2dyZXNzLWJhclwiLFxyXG5cdFx0bmFtZTogXCJTdXBwb3J0IGhvdmVyIHRvIHNob3cgcHJvZ3Jlc3MgaW5mb1wiLFxyXG5cdFx0ZGVzY3JpcHRpb246IFwiVG9nZ2xlIHRoaXMgdG8gYWxsb3cgdGhpcyBwbHVnaW4gdG8gc2hvdyBwcm9ncmVzcyBpbmZvIHdoZW4gaG92ZXJpbmcgb3ZlciB0aGUgcHJvZ3Jlc3MgYmFyLlwiLFxyXG5cdFx0a2V5d29yZHM6IFtcImhvdmVyXCIsIFwicHJvZ3Jlc3NcIiwgXCJpbmZvXCIsIFwic2hvd1wiLCBcInN1cHBvcnRcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJTdXBwb3J0IGhvdmVyIHRvIHNob3cgcHJvZ3Jlc3MgaW5mb1wiLFxyXG5cdFx0ZGVzY3JpcHRpb25LZXk6IFwiVG9nZ2xlIHRoaXMgdG8gYWxsb3cgdGhpcyBwbHVnaW4gdG8gc2hvdyBwcm9ncmVzcyBpbmZvIHdoZW4gaG92ZXJpbmcgb3ZlciB0aGUgcHJvZ3Jlc3MgYmFyLlwiLFxyXG5cdFx0Y2F0ZWdvcnk6IFwiZGlzcGxheVwiXHJcblx0fSxcclxuXHR7XHJcblx0XHRpZDogXCJwcm9ncmVzcy1ub24tdGFzay1idWxsZXRcIixcclxuXHRcdHRhYklkOiBcInByb2dyZXNzLWJhclwiLFxyXG5cdFx0bmFtZTogXCJBZGQgcHJvZ3Jlc3MgYmFyIHRvIG5vbi10YXNrIGJ1bGxldFwiLFxyXG5cdFx0ZGVzY3JpcHRpb246IFwiVG9nZ2xlIHRoaXMgdG8gYWxsb3cgYWRkaW5nIHByb2dyZXNzIGJhcnMgdG8gcmVndWxhciBsaXN0IGl0ZW1zIChub24tdGFzayBidWxsZXRzKS5cIixcclxuXHRcdGtleXdvcmRzOiBbXCJwcm9ncmVzc1wiLCBcImJhclwiLCBcIm5vbi10YXNrXCIsIFwiYnVsbGV0XCIsIFwibGlzdFwiLCBcIml0ZW1zXCJdLFxyXG5cdFx0dHJhbnNsYXRpb25LZXk6IFwiQWRkIHByb2dyZXNzIGJhciB0byBub24tdGFzayBidWxsZXRcIixcclxuXHRcdGRlc2NyaXB0aW9uS2V5OiBcIlRvZ2dsZSB0aGlzIHRvIGFsbG93IGFkZGluZyBwcm9ncmVzcyBiYXJzIHRvIHJlZ3VsYXIgbGlzdCBpdGVtcyAobm9uLXRhc2sgYnVsbGV0cykuXCIsXHJcblx0XHRjYXRlZ29yeTogXCJkaXNwbGF5XCJcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiBcInByb2dyZXNzLWhlYWRpbmdcIixcclxuXHRcdHRhYklkOiBcInByb2dyZXNzLWJhclwiLFxyXG5cdFx0bmFtZTogXCJBZGQgcHJvZ3Jlc3MgYmFyIHRvIEhlYWRpbmdcIixcclxuXHRcdGRlc2NyaXB0aW9uOiBcIlRvZ2dsZSB0aGlzIHRvIGFsbG93IHRoaXMgcGx1Z2luIHRvIGFkZCBwcm9ncmVzcyBiYXIgZm9yIFRhc2sgYmVsb3cgdGhlIGhlYWRpbmdzLlwiLFxyXG5cdFx0a2V5d29yZHM6IFtcInByb2dyZXNzXCIsIFwiYmFyXCIsIFwiaGVhZGluZ1wiLCBcInRhc2tcIiwgXCJiZWxvd1wiXSxcclxuXHRcdHRyYW5zbGF0aW9uS2V5OiBcIkFkZCBwcm9ncmVzcyBiYXIgdG8gSGVhZGluZ1wiLFxyXG5cdFx0ZGVzY3JpcHRpb25LZXk6IFwiVG9nZ2xlIHRoaXMgdG8gYWxsb3cgdGhpcyBwbHVnaW4gdG8gYWRkIHByb2dyZXNzIGJhciBmb3IgVGFzayBiZWxvdyB0aGUgaGVhZGluZ3MuXCIsXHJcblx0XHRjYXRlZ29yeTogXCJkaXNwbGF5XCJcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiBcInByb2dyZXNzLXN1Yi1jaGlsZHJlblwiLFxyXG5cdFx0dGFiSWQ6IFwicHJvZ3Jlc3MtYmFyXCIsXHJcblx0XHRuYW1lOiBcIkNvdW50IHN1YiBjaGlsZHJlbiBvZiBjdXJyZW50IFRhc2tcIixcclxuXHRcdGRlc2NyaXB0aW9uOiBcIlRvZ2dsZSB0aGlzIHRvIGFsbG93IHRoaXMgcGx1Z2luIHRvIGNvdW50IHN1YiB0YXNrcyB3aGVuIGdlbmVyYXRpbmcgcHJvZ3Jlc3MgYmFyLlwiLFxyXG5cdFx0a2V5d29yZHM6IFtcImNvdW50XCIsIFwic3ViXCIsIFwiY2hpbGRyZW5cIiwgXCJ0YXNrXCIsIFwic3ViLXRhc2tzXCJdLFxyXG5cdFx0dHJhbnNsYXRpb25LZXk6IFwiQ291bnQgc3ViIGNoaWxkcmVuIG9mIGN1cnJlbnQgVGFza1wiLFxyXG5cdFx0ZGVzY3JpcHRpb25LZXk6IFwiVG9nZ2xlIHRoaXMgdG8gYWxsb3cgdGhpcyBwbHVnaW4gdG8gY291bnQgc3ViIHRhc2tzIHdoZW4gZ2VuZXJhdGluZyBwcm9ncmVzcyBiYXIuXCIsXHJcblx0XHRjYXRlZ29yeTogXCJkaXNwbGF5XCJcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiBcInByb2dyZXNzLWN1c3RvbS1nb2FsXCIsXHJcblx0XHR0YWJJZDogXCJwcm9ncmVzcy1iYXJcIixcclxuXHRcdG5hbWU6IFwiVXNlIGN1c3RvbSBnb2FsIGZvciBwcm9ncmVzcyBiYXJcIixcclxuXHRcdGRlc2NyaXB0aW9uOiBcIlRvZ2dsZSB0aGlzIHRvIGFsbG93IHRoaXMgcGx1Z2luIHRvIGZpbmQgdGhlIHBhdHRlcm4gZzo6bnVtYmVyIGFzIGdvYWwgb2YgdGhlIHBhcmVudCB0YXNrLlwiLFxyXG5cdFx0a2V5d29yZHM6IFtcImN1c3RvbVwiLCBcImdvYWxcIiwgXCJwcm9ncmVzc1wiLCBcImJhclwiLCBcInBhdHRlcm5cIiwgXCJudW1iZXJcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJVc2UgY3VzdG9tIGdvYWwgZm9yIHByb2dyZXNzIGJhclwiLFxyXG5cdFx0ZGVzY3JpcHRpb25LZXk6IFwiVG9nZ2xlIHRoaXMgdG8gYWxsb3cgdGhpcyBwbHVnaW4gdG8gZmluZCB0aGUgcGF0dGVybiBnOjpudW1iZXIgYXMgZ29hbCBvZiB0aGUgcGFyZW50IHRhc2suXCIsXHJcblx0XHRjYXRlZ29yeTogXCJkaXNwbGF5XCJcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiBcInByb2dyZXNzLWZvcm1hdFwiLFxyXG5cdFx0dGFiSWQ6IFwicHJvZ3Jlc3MtYmFyXCIsXHJcblx0XHRuYW1lOiBcIlByb2dyZXNzIGZvcm1hdFwiLFxyXG5cdFx0ZGVzY3JpcHRpb246IFwiQ2hvb3NlIGhvdyB0byBkaXNwbGF5IHRoZSB0YXNrIHByb2dyZXNzXCIsXHJcblx0XHRrZXl3b3JkczogW1wicHJvZ3Jlc3NcIiwgXCJmb3JtYXRcIiwgXCJkaXNwbGF5XCIsIFwidGFza1wiXSxcclxuXHRcdHRyYW5zbGF0aW9uS2V5OiBcIlByb2dyZXNzIGZvcm1hdFwiLFxyXG5cdFx0ZGVzY3JpcHRpb25LZXk6IFwiQ2hvb3NlIGhvdyB0byBkaXNwbGF5IHRoZSB0YXNrIHByb2dyZXNzXCIsXHJcblx0XHRjYXRlZ29yeTogXCJkaXNwbGF5XCJcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiBcImhpZGUtcHJvZ3Jlc3MtYmFyc1wiLFxyXG5cdFx0dGFiSWQ6IFwicHJvZ3Jlc3MtYmFyXCIsXHJcblx0XHRuYW1lOiBcIkhpZGUgcHJvZ3Jlc3MgYmFyc1wiLFxyXG5cdFx0a2V5d29yZHM6IFtcImhpZGVcIiwgXCJwcm9ncmVzc1wiLCBcImJhcnNcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJIaWRlIHByb2dyZXNzIGJhcnNcIixcclxuXHRcdGNhdGVnb3J5OiBcImRpc3BsYXlcIlxyXG5cdH0sXHJcblx0e1xyXG5cdFx0aWQ6IFwiaGlkZS1wcm9ncmVzcy1jb25kaXRpb25zXCIsXHJcblx0XHR0YWJJZDogXCJwcm9ncmVzcy1iYXJcIixcclxuXHRcdG5hbWU6IFwiSGlkZSBwcm9ncmVzcyBiYXJzIGJhc2VkIG9uIGNvbmRpdGlvbnNcIixcclxuXHRcdGRlc2NyaXB0aW9uOiBcIlRvZ2dsZSB0aGlzIHRvIGVuYWJsZSBoaWRpbmcgcHJvZ3Jlc3MgYmFycyBiYXNlZCBvbiB0YWdzLCBmb2xkZXJzLCBvciBtZXRhZGF0YS5cIixcclxuXHRcdGtleXdvcmRzOiBbXCJoaWRlXCIsIFwicHJvZ3Jlc3NcIiwgXCJiYXJzXCIsIFwiY29uZGl0aW9uc1wiLCBcInRhZ3NcIiwgXCJmb2xkZXJzXCIsIFwibWV0YWRhdGFcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJIaWRlIHByb2dyZXNzIGJhcnMgYmFzZWQgb24gY29uZGl0aW9uc1wiLFxyXG5cdFx0ZGVzY3JpcHRpb25LZXk6IFwiVG9nZ2xlIHRoaXMgdG8gZW5hYmxlIGhpZGluZyBwcm9ncmVzcyBiYXJzIGJhc2VkIG9uIHRhZ3MsIGZvbGRlcnMsIG9yIG1ldGFkYXRhLlwiLFxyXG5cdFx0Y2F0ZWdvcnk6IFwiZGlzcGxheVwiXHJcblx0fSxcclxuXHJcblx0Ly8gQ2hlY2tib3ggU3RhdHVzIFRhYlxyXG5cdHtcclxuXHRcdGlkOiBcImNoZWNrYm94LXN0YXR1cy1zZXR0aW5nc1wiLFxyXG5cdFx0dGFiSWQ6IFwidGFzay1zdGF0dXNcIixcclxuXHRcdG5hbWU6IFwiQ2hlY2tib3ggU3RhdHVzIFNldHRpbmdzXCIsXHJcblx0XHRkZXNjcmlwdGlvbjogXCJDb25maWd1cmUgY2hlY2tib3ggc3RhdHVzIHNldHRpbmdzXCIsXHJcblx0XHRrZXl3b3JkczogW1wiY2hlY2tib3hcIiwgXCJzdGF0dXNcIiwgXCJzZXR0aW5nc1wiLCBcImNvbmZpZ3VyZVwiXSxcclxuXHRcdHRyYW5zbGF0aW9uS2V5OiBcIkNoZWNrYm94IFN0YXR1cyBTZXR0aW5nc1wiLFxyXG5cdFx0ZGVzY3JpcHRpb25LZXk6IFwiQ29uZmlndXJlIGNoZWNrYm94IHN0YXR1cyBzZXR0aW5nc1wiLFxyXG5cdFx0Y2F0ZWdvcnk6IFwiZGlzcGxheVwiXHJcblx0fSxcclxuXHR7XHJcblx0XHRpZDogXCJmaWxlLW1ldGFkYXRhLWluaGVyaXRhbmNlXCIsXHJcblx0XHR0YWJJZDogXCJ0YXNrLXN0YXR1c1wiLFxyXG5cdFx0bmFtZTogXCJGaWxlIE1ldGFkYXRhIEluaGVyaXRhbmNlXCIsXHJcblx0XHRkZXNjcmlwdGlvbjogXCJDb25maWd1cmUgaG93IHRhc2tzIGluaGVyaXQgbWV0YWRhdGEgZnJvbSBmaWxlIGZyb250bWF0dGVyXCIsXHJcblx0XHRrZXl3b3JkczogW1wiZmlsZVwiLCBcIm1ldGFkYXRhXCIsIFwiaW5oZXJpdGFuY2VcIiwgXCJ0YXNrc1wiLCBcImZyb250bWF0dGVyXCJdLFxyXG5cdFx0dHJhbnNsYXRpb25LZXk6IFwiRmlsZSBNZXRhZGF0YSBJbmhlcml0YW5jZVwiLFxyXG5cdFx0ZGVzY3JpcHRpb25LZXk6IFwiQ29uZmlndXJlIGhvdyB0YXNrcyBpbmhlcml0IG1ldGFkYXRhIGZyb20gZmlsZSBmcm9udG1hdHRlclwiLFxyXG5cdFx0Y2F0ZWdvcnk6IFwiZGlzcGxheVwiXHJcblx0fSxcclxuXHR7XHJcblx0XHRpZDogXCJlbmFibGUtbWV0YWRhdGEtaW5oZXJpdGFuY2VcIixcclxuXHRcdHRhYklkOiBcInRhc2stc3RhdHVzXCIsXHJcblx0XHRuYW1lOiBcIkVuYWJsZSBmaWxlIG1ldGFkYXRhIGluaGVyaXRhbmNlXCIsXHJcblx0XHRkZXNjcmlwdGlvbjogXCJBbGxvdyB0YXNrcyB0byBpbmhlcml0IG1ldGFkYXRhIHByb3BlcnRpZXMgZnJvbSB0aGVpciBmaWxlJ3MgZnJvbnRtYXR0ZXJcIixcclxuXHRcdGtleXdvcmRzOiBbXCJlbmFibGVcIiwgXCJmaWxlXCIsIFwibWV0YWRhdGFcIiwgXCJpbmhlcml0YW5jZVwiLCBcInByb3BlcnRpZXNcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJFbmFibGUgZmlsZSBtZXRhZGF0YSBpbmhlcml0YW5jZVwiLFxyXG5cdFx0ZGVzY3JpcHRpb25LZXk6IFwiQWxsb3cgdGFza3MgdG8gaW5oZXJpdCBtZXRhZGF0YSBwcm9wZXJ0aWVzIGZyb20gdGhlaXIgZmlsZSdzIGZyb250bWF0dGVyXCIsXHJcblx0XHRjYXRlZ29yeTogXCJkaXNwbGF5XCJcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiBcImF1dG8tY29tcGxldGUtcGFyZW50XCIsXHJcblx0XHR0YWJJZDogXCJ0YXNrLXN0YXR1c1wiLFxyXG5cdFx0bmFtZTogXCJBdXRvIGNvbXBsZXRlIHBhcmVudCBjaGVja2JveFwiLFxyXG5cdFx0ZGVzY3JpcHRpb246IFwiVG9nZ2xlIHRoaXMgdG8gYWxsb3cgdGhpcyBwbHVnaW4gdG8gYXV0byBjb21wbGV0ZSBwYXJlbnQgY2hlY2tib3ggd2hlbiBhbGwgY2hpbGQgdGFza3MgYXJlIGNvbXBsZXRlZC5cIixcclxuXHRcdGtleXdvcmRzOiBbXCJhdXRvXCIsIFwiY29tcGxldGVcIiwgXCJwYXJlbnRcIiwgXCJjaGVja2JveFwiLCBcImNoaWxkXCIsIFwidGFza3NcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJBdXRvIGNvbXBsZXRlIHBhcmVudCBjaGVja2JveFwiLFxyXG5cdFx0ZGVzY3JpcHRpb25LZXk6IFwiVG9nZ2xlIHRoaXMgdG8gYWxsb3cgdGhpcyBwbHVnaW4gdG8gYXV0byBjb21wbGV0ZSBwYXJlbnQgY2hlY2tib3ggd2hlbiBhbGwgY2hpbGQgdGFza3MgYXJlIGNvbXBsZXRlZC5cIixcclxuXHRcdGNhdGVnb3J5OiBcImRpc3BsYXlcIlxyXG5cdH0sXHJcblx0e1xyXG5cdFx0aWQ6IFwicGFyZW50LWluLXByb2dyZXNzXCIsXHJcblx0XHR0YWJJZDogXCJ0YXNrLXN0YXR1c1wiLFxyXG5cdFx0bmFtZTogXCJNYXJrIHBhcmVudCBhcyAnSW4gUHJvZ3Jlc3MnIHdoZW4gcGFydGlhbGx5IGNvbXBsZXRlXCIsXHJcblx0XHRkZXNjcmlwdGlvbjogXCJXaGVuIHNvbWUgYnV0IG5vdCBhbGwgY2hpbGQgdGFza3MgYXJlIGNvbXBsZXRlZCwgbWFyayB0aGUgcGFyZW50IGNoZWNrYm94IGFzICdJbiBQcm9ncmVzcycuIE9ubHkgd29ya3Mgd2hlbiAnQXV0byBjb21wbGV0ZSBwYXJlbnQnIGlzIGVuYWJsZWQuXCIsXHJcblx0XHRrZXl3b3JkczogW1wicGFyZW50XCIsIFwiaW4gcHJvZ3Jlc3NcIiwgXCJwYXJ0aWFsbHlcIiwgXCJjb21wbGV0ZVwiLCBcImNoaWxkXCIsIFwidGFza3NcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJNYXJrIHBhcmVudCBhcyAnSW4gUHJvZ3Jlc3MnIHdoZW4gcGFydGlhbGx5IGNvbXBsZXRlXCIsXHJcblx0XHRkZXNjcmlwdGlvbktleTogXCJXaGVuIHNvbWUgYnV0IG5vdCBhbGwgY2hpbGQgdGFza3MgYXJlIGNvbXBsZXRlZCwgbWFyayB0aGUgcGFyZW50IGNoZWNrYm94IGFzICdJbiBQcm9ncmVzcycuIE9ubHkgd29ya3Mgd2hlbiAnQXV0byBjb21wbGV0ZSBwYXJlbnQnIGlzIGVuYWJsZWQuXCIsXHJcblx0XHRjYXRlZ29yeTogXCJkaXNwbGF5XCJcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiBcImNvbXBsZXRlZC1jaGFyc1wiLFxyXG5cdFx0dGFiSWQ6IFwidGFzay1zdGF0dXNcIixcclxuXHRcdG5hbWU6IFwiQ29tcGxldGVkXCIsXHJcblx0XHRkZXNjcmlwdGlvbjogXCJDaGFyYWN0ZXJzIGluIHNxdWFyZSBicmFja2V0cyB0aGF0IHJlcHJlc2VudCBjb21wbGV0ZWQgdGFza3MuIEV4YW1wbGU6IFxcXCJ4fFhcXFwiXCIsXHJcblx0XHRrZXl3b3JkczogW1wiY29tcGxldGVkXCIsIFwiY2hhcmFjdGVyc1wiLCBcInNxdWFyZVwiLCBcImJyYWNrZXRzXCIsIFwidGFza3NcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJDb21wbGV0ZWRcIixcclxuXHRcdGRlc2NyaXB0aW9uS2V5OiBcIkNoYXJhY3RlcnMgaW4gc3F1YXJlIGJyYWNrZXRzIHRoYXQgcmVwcmVzZW50IGNvbXBsZXRlZCB0YXNrcy4gRXhhbXBsZTogXFxcInh8WFxcXCJcIixcclxuXHRcdGNhdGVnb3J5OiBcImRpc3BsYXlcIlxyXG5cdH0sXHJcblx0e1xyXG5cdFx0aWQ6IFwicGxhbm5lZC1jaGFyc1wiLFxyXG5cdFx0dGFiSWQ6IFwidGFzay1zdGF0dXNcIixcclxuXHRcdG5hbWU6IFwiUGxhbm5lZFwiLFxyXG5cdFx0ZGVzY3JpcHRpb246IFwiQ2hhcmFjdGVycyBpbiBzcXVhcmUgYnJhY2tldHMgdGhhdCByZXByZXNlbnQgcGxhbm5lZCB0YXNrcy4gRXhhbXBsZTogXFxcIj9cXFwiXCIsXHJcblx0XHRrZXl3b3JkczogW1wicGxhbm5lZFwiLCBcImNoYXJhY3RlcnNcIiwgXCJzcXVhcmVcIiwgXCJicmFja2V0c1wiLCBcInRhc2tzXCJdLFxyXG5cdFx0dHJhbnNsYXRpb25LZXk6IFwiUGxhbm5lZFwiLFxyXG5cdFx0ZGVzY3JpcHRpb25LZXk6IFwiQ2hhcmFjdGVycyBpbiBzcXVhcmUgYnJhY2tldHMgdGhhdCByZXByZXNlbnQgcGxhbm5lZCB0YXNrcy4gRXhhbXBsZTogXFxcIj9cXFwiXCIsXHJcblx0XHRjYXRlZ29yeTogXCJkaXNwbGF5XCJcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiBcImluLXByb2dyZXNzLWNoYXJzXCIsXHJcblx0XHR0YWJJZDogXCJ0YXNrLXN0YXR1c1wiLFxyXG5cdFx0bmFtZTogXCJJbiBQcm9ncmVzc1wiLFxyXG5cdFx0ZGVzY3JpcHRpb246IFwiQ2hhcmFjdGVycyBpbiBzcXVhcmUgYnJhY2tldHMgdGhhdCByZXByZXNlbnQgdGFza3MgaW4gcHJvZ3Jlc3MuIEV4YW1wbGU6IFxcXCI+fC9cXFwiXCIsXHJcblx0XHRrZXl3b3JkczogW1wiaW4gcHJvZ3Jlc3NcIiwgXCJjaGFyYWN0ZXJzXCIsIFwic3F1YXJlXCIsIFwiYnJhY2tldHNcIiwgXCJ0YXNrc1wiXSxcclxuXHRcdHRyYW5zbGF0aW9uS2V5OiBcIkluIFByb2dyZXNzXCIsXHJcblx0XHRkZXNjcmlwdGlvbktleTogXCJDaGFyYWN0ZXJzIGluIHNxdWFyZSBicmFja2V0cyB0aGF0IHJlcHJlc2VudCB0YXNrcyBpbiBwcm9ncmVzcy4gRXhhbXBsZTogXFxcIj58L1xcXCJcIixcclxuXHRcdGNhdGVnb3J5OiBcImRpc3BsYXlcIlxyXG5cdH0sXHJcblx0e1xyXG5cdFx0aWQ6IFwiYWJhbmRvbmVkLWNoYXJzXCIsXHJcblx0XHR0YWJJZDogXCJ0YXNrLXN0YXR1c1wiLFxyXG5cdFx0bmFtZTogXCJBYmFuZG9uZWRcIixcclxuXHRcdGRlc2NyaXB0aW9uOiBcIkNoYXJhY3RlcnMgaW4gc3F1YXJlIGJyYWNrZXRzIHRoYXQgcmVwcmVzZW50IGFiYW5kb25lZCB0YXNrcy4gRXhhbXBsZTogXFxcIi1cXFwiXCIsXHJcblx0XHRrZXl3b3JkczogW1wiYWJhbmRvbmVkXCIsIFwiY2hhcmFjdGVyc1wiLCBcInNxdWFyZVwiLCBcImJyYWNrZXRzXCIsIFwidGFza3NcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJBYmFuZG9uZWRcIixcclxuXHRcdGRlc2NyaXB0aW9uS2V5OiBcIkNoYXJhY3RlcnMgaW4gc3F1YXJlIGJyYWNrZXRzIHRoYXQgcmVwcmVzZW50IGFiYW5kb25lZCB0YXNrcy4gRXhhbXBsZTogXFxcIi1cXFwiXCIsXHJcblx0XHRjYXRlZ29yeTogXCJkaXNwbGF5XCJcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiBcIm5vdC1zdGFydGVkLWNoYXJzXCIsXHJcblx0XHR0YWJJZDogXCJ0YXNrLXN0YXR1c1wiLFxyXG5cdFx0bmFtZTogXCJOb3QgU3RhcnRlZFwiLFxyXG5cdFx0ZGVzY3JpcHRpb246IFwiQ2hhcmFjdGVycyBpbiBzcXVhcmUgYnJhY2tldHMgdGhhdCByZXByZXNlbnQgbm90IHN0YXJ0ZWQgdGFza3MuIERlZmF1bHQgaXMgc3BhY2UgXFxcIiBcXFwiXCIsXHJcblx0XHRrZXl3b3JkczogW1wibm90IHN0YXJ0ZWRcIiwgXCJjaGFyYWN0ZXJzXCIsIFwic3F1YXJlXCIsIFwiYnJhY2tldHNcIiwgXCJ0YXNrc1wiLCBcInNwYWNlXCJdLFxyXG5cdFx0dHJhbnNsYXRpb25LZXk6IFwiTm90IFN0YXJ0ZWRcIixcclxuXHRcdGRlc2NyaXB0aW9uS2V5OiBcIkNoYXJhY3RlcnMgaW4gc3F1YXJlIGJyYWNrZXRzIHRoYXQgcmVwcmVzZW50IG5vdCBzdGFydGVkIHRhc2tzLiBEZWZhdWx0IGlzIHNwYWNlIFxcXCIgXFxcIlwiLFxyXG5cdFx0Y2F0ZWdvcnk6IFwiZGlzcGxheVwiXHJcblx0fSxcclxuXHJcblx0Ly8gRGF0ZXMgJiBQcmlvcml0eSBUYWJcclxuXHR7XHJcblx0XHRpZDogXCJwcmlvcml0eS1waWNrZXItc2V0dGluZ3NcIixcclxuXHRcdHRhYklkOiBcImRhdGUtcHJpb3JpdHlcIixcclxuXHRcdG5hbWU6IFwiUHJpb3JpdHkgUGlja2VyIFNldHRpbmdzXCIsXHJcblx0XHRkZXNjcmlwdGlvbjogXCJUb2dnbGUgdG8gZW5hYmxlIHByaW9yaXR5IHBpY2tlciBkcm9wZG93biBmb3IgZW1vamkgYW5kIGxldHRlciBmb3JtYXQgcHJpb3JpdGllcy5cIixcclxuXHRcdGtleXdvcmRzOiBbXCJwcmlvcml0eVwiLCBcInBpY2tlclwiLCBcInNldHRpbmdzXCIsIFwiZHJvcGRvd25cIiwgXCJlbW9qaVwiLCBcImxldHRlclwiXSxcclxuXHRcdHRyYW5zbGF0aW9uS2V5OiBcIlByaW9yaXR5IFBpY2tlciBTZXR0aW5nc1wiLFxyXG5cdFx0ZGVzY3JpcHRpb25LZXk6IFwiVG9nZ2xlIHRvIGVuYWJsZSBwcmlvcml0eSBwaWNrZXIgZHJvcGRvd24gZm9yIGVtb2ppIGFuZCBsZXR0ZXIgZm9ybWF0IHByaW9yaXRpZXMuXCIsXHJcblx0XHRjYXRlZ29yeTogXCJ3b3JrZmxvd1wiXHJcblx0fSxcclxuXHR7XHJcblx0XHRpZDogXCJlbmFibGUtcHJpb3JpdHktcGlja2VyXCIsXHJcblx0XHR0YWJJZDogXCJkYXRlLXByaW9yaXR5XCIsXHJcblx0XHRuYW1lOiBcIkVuYWJsZSBwcmlvcml0eSBwaWNrZXJcIixcclxuXHRcdGRlc2NyaXB0aW9uOiBcIlRvZ2dsZSB0byBlbmFibGUgcHJpb3JpdHkgcGlja2VyIGRyb3Bkb3duIGZvciBlbW9qaSBhbmQgbGV0dGVyIGZvcm1hdCBwcmlvcml0aWVzLlwiLFxyXG5cdFx0a2V5d29yZHM6IFtcImVuYWJsZVwiLCBcInByaW9yaXR5XCIsIFwicGlja2VyXCIsIFwiZHJvcGRvd25cIiwgXCJlbW9qaVwiLCBcImxldHRlclwiXSxcclxuXHRcdHRyYW5zbGF0aW9uS2V5OiBcIkVuYWJsZSBwcmlvcml0eSBwaWNrZXJcIixcclxuXHRcdGRlc2NyaXB0aW9uS2V5OiBcIlRvZ2dsZSB0byBlbmFibGUgcHJpb3JpdHkgcGlja2VyIGRyb3Bkb3duIGZvciBlbW9qaSBhbmQgbGV0dGVyIGZvcm1hdCBwcmlvcml0aWVzLlwiLFxyXG5cdFx0Y2F0ZWdvcnk6IFwid29ya2Zsb3dcIlxyXG5cdH0sXHJcblx0e1xyXG5cdFx0aWQ6IFwiZW5hYmxlLXByaW9yaXR5LXNob3J0Y3V0c1wiLFxyXG5cdFx0dGFiSWQ6IFwiZGF0ZS1wcmlvcml0eVwiLFxyXG5cdFx0bmFtZTogXCJFbmFibGUgcHJpb3JpdHkga2V5Ym9hcmQgc2hvcnRjdXRzXCIsXHJcblx0XHRkZXNjcmlwdGlvbjogXCJUb2dnbGUgdG8gZW5hYmxlIGtleWJvYXJkIHNob3J0Y3V0cyBmb3Igc2V0dGluZyB0YXNrIHByaW9yaXRpZXMuXCIsXHJcblx0XHRrZXl3b3JkczogW1wiZW5hYmxlXCIsIFwicHJpb3JpdHlcIiwgXCJrZXlib2FyZFwiLCBcInNob3J0Y3V0c1wiLCBcInRhc2tcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJFbmFibGUgcHJpb3JpdHkga2V5Ym9hcmQgc2hvcnRjdXRzXCIsXHJcblx0XHRkZXNjcmlwdGlvbktleTogXCJUb2dnbGUgdG8gZW5hYmxlIGtleWJvYXJkIHNob3J0Y3V0cyBmb3Igc2V0dGluZyB0YXNrIHByaW9yaXRpZXMuXCIsXHJcblx0XHRjYXRlZ29yeTogXCJ3b3JrZmxvd1wiXHJcblx0fSxcclxuXHR7XHJcblx0XHRpZDogXCJkYXRlLXBpY2tlclwiLFxyXG5cdFx0dGFiSWQ6IFwiZGF0ZS1wcmlvcml0eVwiLFxyXG5cdFx0bmFtZTogXCJEYXRlIHBpY2tlclwiLFxyXG5cdFx0a2V5d29yZHM6IFtcImRhdGVcIiwgXCJwaWNrZXJcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJEYXRlIHBpY2tlclwiLFxyXG5cdFx0Y2F0ZWdvcnk6IFwid29ya2Zsb3dcIlxyXG5cdH0sXHJcblx0e1xyXG5cdFx0aWQ6IFwiZW5hYmxlLWRhdGUtcGlja2VyXCIsXHJcblx0XHR0YWJJZDogXCJkYXRlLXByaW9yaXR5XCIsXHJcblx0XHRuYW1lOiBcIkVuYWJsZSBkYXRlIHBpY2tlclwiLFxyXG5cdFx0ZGVzY3JpcHRpb246IFwiVG9nZ2xlIHRoaXMgdG8gZW5hYmxlIGRhdGUgcGlja2VyIGZvciB0YXNrcy4gVGhpcyB3aWxsIGFkZCBhIGNhbGVuZGFyIGljb24gbmVhciB5b3VyIHRhc2tzIHdoaWNoIHlvdSBjYW4gY2xpY2sgdG8gc2VsZWN0IGEgZGF0ZS5cIixcclxuXHRcdGtleXdvcmRzOiBbXCJlbmFibGVcIiwgXCJkYXRlXCIsIFwicGlja2VyXCIsIFwidGFza3NcIiwgXCJjYWxlbmRhclwiLCBcImljb25cIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJFbmFibGUgZGF0ZSBwaWNrZXJcIixcclxuXHRcdGRlc2NyaXB0aW9uS2V5OiBcIlRvZ2dsZSB0aGlzIHRvIGVuYWJsZSBkYXRlIHBpY2tlciBmb3IgdGFza3MuIFRoaXMgd2lsbCBhZGQgYSBjYWxlbmRhciBpY29uIG5lYXIgeW91ciB0YXNrcyB3aGljaCB5b3UgY2FuIGNsaWNrIHRvIHNlbGVjdCBhIGRhdGUuXCIsXHJcblx0XHRjYXRlZ29yeTogXCJ3b3JrZmxvd1wiXHJcblx0fSxcclxuXHR7XHJcblx0XHRpZDogXCJyZWN1cnJlbmNlLWNhbGN1bGF0aW9uXCIsXHJcblx0XHR0YWJJZDogXCJkYXRlLXByaW9yaXR5XCIsXHJcblx0XHRuYW1lOiBcIlJlY3VycmVuY2UgZGF0ZSBjYWxjdWxhdGlvblwiLFxyXG5cdFx0ZGVzY3JpcHRpb246IFwiQ2hvb3NlIGhvdyB0byBjYWxjdWxhdGUgdGhlIG5leHQgZGF0ZSBmb3IgcmVjdXJyaW5nIHRhc2tzXCIsXHJcblx0XHRrZXl3b3JkczogW1wicmVjdXJyZW5jZVwiLCBcImRhdGVcIiwgXCJjYWxjdWxhdGlvblwiLCBcInJlY3VycmluZ1wiLCBcInRhc2tzXCJdLFxyXG5cdFx0dHJhbnNsYXRpb25LZXk6IFwiUmVjdXJyZW5jZSBkYXRlIGNhbGN1bGF0aW9uXCIsXHJcblx0XHRkZXNjcmlwdGlvbktleTogXCJDaG9vc2UgaG93IHRvIGNhbGN1bGF0ZSB0aGUgbmV4dCBkYXRlIGZvciByZWN1cnJpbmcgdGFza3NcIixcclxuXHRcdGNhdGVnb3J5OiBcIndvcmtmbG93XCJcclxuXHR9LFxyXG5cclxuXHQvLyBUYXNrIEZpbHRlciBUYWJcclxuXHR7XHJcblx0XHRpZDogXCJ0YXNrLWZpbHRlclwiLFxyXG5cdFx0dGFiSWQ6IFwidGFzay1maWx0ZXJcIixcclxuXHRcdG5hbWU6IFwiVGFzayBGaWx0ZXJcIixcclxuXHRcdGtleXdvcmRzOiBbXCJ0YXNrXCIsIFwiZmlsdGVyXCJdLFxyXG5cdFx0dHJhbnNsYXRpb25LZXk6IFwiVGFzayBGaWx0ZXJcIixcclxuXHRcdGNhdGVnb3J5OiBcIm1hbmFnZW1lbnRcIlxyXG5cdH0sXHJcblx0e1xyXG5cdFx0aWQ6IFwiZW5hYmxlLXRhc2stZmlsdGVyXCIsXHJcblx0XHR0YWJJZDogXCJ0YXNrLWZpbHRlclwiLFxyXG5cdFx0bmFtZTogXCJFbmFibGUgVGFzayBGaWx0ZXJcIixcclxuXHRcdGRlc2NyaXB0aW9uOiBcIlRvZ2dsZSB0aGlzIHRvIGVuYWJsZSB0aGUgdGFzayBmaWx0ZXIgcGFuZWxcIixcclxuXHRcdGtleXdvcmRzOiBbXCJlbmFibGVcIiwgXCJ0YXNrXCIsIFwiZmlsdGVyXCIsIFwicGFuZWxcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJFbmFibGUgVGFzayBGaWx0ZXJcIixcclxuXHRcdGRlc2NyaXB0aW9uS2V5OiBcIlRvZ2dsZSB0aGlzIHRvIGVuYWJsZSB0aGUgdGFzayBmaWx0ZXIgcGFuZWxcIixcclxuXHRcdGNhdGVnb3J5OiBcIm1hbmFnZW1lbnRcIlxyXG5cdH0sXHJcblx0e1xyXG5cdFx0aWQ6IFwicHJlc2V0LWZpbHRlcnNcIixcclxuXHRcdHRhYklkOiBcInRhc2stZmlsdGVyXCIsXHJcblx0XHRuYW1lOiBcIlByZXNldCBGaWx0ZXJzXCIsXHJcblx0XHRkZXNjcmlwdGlvbjogXCJDcmVhdGUgYW5kIG1hbmFnZSBwcmVzZXQgZmlsdGVycyBmb3IgcXVpY2sgYWNjZXNzIHRvIGNvbW1vbmx5IHVzZWQgdGFzayBmaWx0ZXJzLlwiLFxyXG5cdFx0a2V5d29yZHM6IFtcInByZXNldFwiLCBcImZpbHRlcnNcIiwgXCJjcmVhdGVcIiwgXCJtYW5hZ2VcIiwgXCJxdWlja1wiLCBcImFjY2Vzc1wiXSxcclxuXHRcdHRyYW5zbGF0aW9uS2V5OiBcIlByZXNldCBGaWx0ZXJzXCIsXHJcblx0XHRkZXNjcmlwdGlvbktleTogXCJDcmVhdGUgYW5kIG1hbmFnZSBwcmVzZXQgZmlsdGVycyBmb3IgcXVpY2sgYWNjZXNzIHRvIGNvbW1vbmx5IHVzZWQgdGFzayBmaWx0ZXJzLlwiLFxyXG5cdFx0Y2F0ZWdvcnk6IFwibWFuYWdlbWVudFwiXHJcblx0fSxcclxuXHJcblx0Ly8gRmlsZSBGaWx0ZXIgVGFiXHJcblx0e1xyXG5cdFx0aWQ6IFwiZmlsZS1maWx0ZXJcIixcclxuXHRcdHRhYklkOiBcImZpbGUtZmlsdGVyXCIsXHJcblx0XHRuYW1lOiBcIkZpbGUgRmlsdGVyXCIsXHJcblx0XHRrZXl3b3JkczogW1wiZmlsZVwiLCBcImZpbHRlclwiXSxcclxuXHRcdHRyYW5zbGF0aW9uS2V5OiBcIkZpbGUgRmlsdGVyXCIsXHJcblx0XHRjYXRlZ29yeTogXCJjb3JlXCJcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiBcImVuYWJsZS1maWxlLWZpbHRlclwiLFxyXG5cdFx0dGFiSWQ6IFwiZmlsZS1maWx0ZXJcIixcclxuXHRcdG5hbWU6IFwiRW5hYmxlIEZpbGUgRmlsdGVyXCIsXHJcblx0XHRkZXNjcmlwdGlvbjogXCJUb2dnbGUgdGhpcyB0byBlbmFibGUgZmlsZSBhbmQgZm9sZGVyIGZpbHRlcmluZyBkdXJpbmcgdGFzayBpbmRleGluZy4gVGhpcyBjYW4gc2lnbmlmaWNhbnRseSBpbXByb3ZlIHBlcmZvcm1hbmNlIGZvciBsYXJnZSB2YXVsdHMuXCIsXHJcblx0XHRrZXl3b3JkczogW1wiZW5hYmxlXCIsIFwiZmlsZVwiLCBcImZpbHRlclwiLCBcImZvbGRlclwiLCBcImluZGV4aW5nXCIsIFwicGVyZm9ybWFuY2VcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJFbmFibGUgRmlsZSBGaWx0ZXJcIixcclxuXHRcdGRlc2NyaXB0aW9uS2V5OiBcIlRvZ2dsZSB0aGlzIHRvIGVuYWJsZSBmaWxlIGFuZCBmb2xkZXIgZmlsdGVyaW5nIGR1cmluZyB0YXNrIGluZGV4aW5nLiBUaGlzIGNhbiBzaWduaWZpY2FudGx5IGltcHJvdmUgcGVyZm9ybWFuY2UgZm9yIGxhcmdlIHZhdWx0cy5cIixcclxuXHRcdGNhdGVnb3J5OiBcImNvcmVcIlxyXG5cdH0sXHJcblx0e1xyXG5cdFx0aWQ6IFwiZmlsZS1maWx0ZXItbW9kZVwiLFxyXG5cdFx0dGFiSWQ6IFwiZmlsZS1maWx0ZXJcIixcclxuXHRcdG5hbWU6IFwiRmlsZSBGaWx0ZXIgTW9kZVwiLFxyXG5cdFx0ZGVzY3JpcHRpb246IFwiQ2hvb3NlIHdoZXRoZXIgdG8gaW5jbHVkZSBvbmx5IHNwZWNpZmllZCBmaWxlcy9mb2xkZXJzICh3aGl0ZWxpc3QpIG9yIGV4Y2x1ZGUgdGhlbSAoYmxhY2tsaXN0KVwiLFxyXG5cdFx0a2V5d29yZHM6IFtcImZpbGVcIiwgXCJmaWx0ZXJcIiwgXCJtb2RlXCIsIFwid2hpdGVsaXN0XCIsIFwiYmxhY2tsaXN0XCIsIFwiaW5jbHVkZVwiLCBcImV4Y2x1ZGVcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJGaWxlIEZpbHRlciBNb2RlXCIsXHJcblx0XHRkZXNjcmlwdGlvbktleTogXCJDaG9vc2Ugd2hldGhlciB0byBpbmNsdWRlIG9ubHkgc3BlY2lmaWVkIGZpbGVzL2ZvbGRlcnMgKHdoaXRlbGlzdCkgb3IgZXhjbHVkZSB0aGVtIChibGFja2xpc3QpXCIsXHJcblx0XHRjYXRlZ29yeTogXCJjb3JlXCJcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiBcImZpbGUtZmlsdGVyLXJ1bGVzXCIsXHJcblx0XHR0YWJJZDogXCJmaWxlLWZpbHRlclwiLFxyXG5cdFx0bmFtZTogXCJGaWxlIEZpbHRlciBSdWxlc1wiLFxyXG5cdFx0ZGVzY3JpcHRpb246IFwiQ29uZmlndXJlIHdoaWNoIGZpbGVzIGFuZCBmb2xkZXJzIHRvIGluY2x1ZGUgb3IgZXhjbHVkZSBmcm9tIHRhc2sgaW5kZXhpbmdcIixcclxuXHRcdGtleXdvcmRzOiBbXCJmaWxlXCIsIFwiZmlsdGVyXCIsIFwicnVsZXNcIiwgXCJjb25maWd1cmVcIiwgXCJmb2xkZXJzXCIsIFwiaW5kZXhpbmdcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJGaWxlIEZpbHRlciBSdWxlc1wiLFxyXG5cdFx0ZGVzY3JpcHRpb25LZXk6IFwiQ29uZmlndXJlIHdoaWNoIGZpbGVzIGFuZCBmb2xkZXJzIHRvIGluY2x1ZGUgb3IgZXhjbHVkZSBmcm9tIHRhc2sgaW5kZXhpbmdcIixcclxuXHRcdGNhdGVnb3J5OiBcImNvcmVcIlxyXG5cdH0sXHJcblxyXG5cdC8vIFRhc2sgSGFuZGxlciBUYWJcclxuXHR7XHJcblx0XHRpZDogXCJ0YXNrLWd1dHRlclwiLFxyXG5cdFx0dGFiSWQ6IFwidGFzay1oYW5kbGVyXCIsXHJcblx0XHRuYW1lOiBcIlRhc2sgR3V0dGVyXCIsXHJcblx0XHRkZXNjcmlwdGlvbjogXCJDb25maWd1cmUgdGhlIHRhc2sgZ3V0dGVyLlwiLFxyXG5cdFx0a2V5d29yZHM6IFtcInRhc2tcIiwgXCJndXR0ZXJcIiwgXCJjb25maWd1cmVcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJUYXNrIEd1dHRlclwiLFxyXG5cdFx0ZGVzY3JpcHRpb25LZXk6IFwiQ29uZmlndXJlIHRoZSB0YXNrIGd1dHRlci5cIixcclxuXHRcdGNhdGVnb3J5OiBcIm1hbmFnZW1lbnRcIlxyXG5cdH0sXHJcblx0e1xyXG5cdFx0aWQ6IFwiZW5hYmxlLXRhc2stZ3V0dGVyXCIsXHJcblx0XHR0YWJJZDogXCJ0YXNrLWhhbmRsZXJcIixcclxuXHRcdG5hbWU6IFwiRW5hYmxlIHRhc2sgZ3V0dGVyXCIsXHJcblx0XHRkZXNjcmlwdGlvbjogXCJUb2dnbGUgdGhpcyB0byBlbmFibGUgdGhlIHRhc2sgZ3V0dGVyLlwiLFxyXG5cdFx0a2V5d29yZHM6IFtcImVuYWJsZVwiLCBcInRhc2tcIiwgXCJndXR0ZXJcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJFbmFibGUgdGFzayBndXR0ZXJcIixcclxuXHRcdGRlc2NyaXB0aW9uS2V5OiBcIlRvZ2dsZSB0aGlzIHRvIGVuYWJsZSB0aGUgdGFzayBndXR0ZXIuXCIsXHJcblx0XHRjYXRlZ29yeTogXCJtYW5hZ2VtZW50XCJcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiBcImNvbXBsZXRlZC10YXNrLW1vdmVyXCIsXHJcblx0XHR0YWJJZDogXCJ0YXNrLWhhbmRsZXJcIixcclxuXHRcdG5hbWU6IFwiQ29tcGxldGVkIFRhc2sgTW92ZXJcIixcclxuXHRcdGtleXdvcmRzOiBbXCJjb21wbGV0ZWRcIiwgXCJ0YXNrXCIsIFwibW92ZXJcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJDb21wbGV0ZWQgVGFzayBNb3ZlclwiLFxyXG5cdFx0Y2F0ZWdvcnk6IFwibWFuYWdlbWVudFwiXHJcblx0fSxcclxuXHR7XHJcblx0XHRpZDogXCJlbmFibGUtY29tcGxldGVkLW1vdmVyXCIsXHJcblx0XHR0YWJJZDogXCJ0YXNrLWhhbmRsZXJcIixcclxuXHRcdG5hbWU6IFwiRW5hYmxlIGNvbXBsZXRlZCB0YXNrIG1vdmVyXCIsXHJcblx0XHRkZXNjcmlwdGlvbjogXCJUb2dnbGUgdGhpcyB0byBlbmFibGUgY29tbWFuZHMgZm9yIG1vdmluZyBjb21wbGV0ZWQgdGFza3MgdG8gYW5vdGhlciBmaWxlLlwiLFxyXG5cdFx0a2V5d29yZHM6IFtcImVuYWJsZVwiLCBcImNvbXBsZXRlZFwiLCBcInRhc2tcIiwgXCJtb3ZlclwiLCBcImNvbW1hbmRzXCIsIFwibW92aW5nXCJdLFxyXG5cdFx0dHJhbnNsYXRpb25LZXk6IFwiRW5hYmxlIGNvbXBsZXRlZCB0YXNrIG1vdmVyXCIsXHJcblx0XHRkZXNjcmlwdGlvbktleTogXCJUb2dnbGUgdGhpcyB0byBlbmFibGUgY29tbWFuZHMgZm9yIG1vdmluZyBjb21wbGV0ZWQgdGFza3MgdG8gYW5vdGhlciBmaWxlLlwiLFxyXG5cdFx0Y2F0ZWdvcnk6IFwibWFuYWdlbWVudFwiXHJcblx0fSxcclxuXHR7XHJcblx0XHRpZDogXCJ0YXNrLXNvcnRpbmdcIixcclxuXHRcdHRhYklkOiBcInRhc2staGFuZGxlclwiLFxyXG5cdFx0bmFtZTogXCJUYXNrIFNvcnRpbmdcIixcclxuXHRcdGRlc2NyaXB0aW9uOiBcIkNvbmZpZ3VyZSBob3cgdGFza3MgYXJlIHNvcnRlZCBpbiB0aGUgZG9jdW1lbnQuXCIsXHJcblx0XHRrZXl3b3JkczogW1widGFza1wiLCBcInNvcnRpbmdcIiwgXCJjb25maWd1cmVcIiwgXCJkb2N1bWVudFwiXSxcclxuXHRcdHRyYW5zbGF0aW9uS2V5OiBcIlRhc2sgU29ydGluZ1wiLFxyXG5cdFx0ZGVzY3JpcHRpb25LZXk6IFwiQ29uZmlndXJlIGhvdyB0YXNrcyBhcmUgc29ydGVkIGluIHRoZSBkb2N1bWVudC5cIixcclxuXHRcdGNhdGVnb3J5OiBcIm1hbmFnZW1lbnRcIlxyXG5cdH0sXHJcblx0e1xyXG5cdFx0aWQ6IFwiZW5hYmxlLXRhc2stc29ydGluZ1wiLFxyXG5cdFx0dGFiSWQ6IFwidGFzay1oYW5kbGVyXCIsXHJcblx0XHRuYW1lOiBcIkVuYWJsZSBUYXNrIFNvcnRpbmdcIixcclxuXHRcdGRlc2NyaXB0aW9uOiBcIlRvZ2dsZSB0aGlzIHRvIGVuYWJsZSBjb21tYW5kcyBmb3Igc29ydGluZyB0YXNrcy5cIixcclxuXHRcdGtleXdvcmRzOiBbXCJlbmFibGVcIiwgXCJ0YXNrXCIsIFwic29ydGluZ1wiLCBcImNvbW1hbmRzXCJdLFxyXG5cdFx0dHJhbnNsYXRpb25LZXk6IFwiRW5hYmxlIFRhc2sgU29ydGluZ1wiLFxyXG5cdFx0ZGVzY3JpcHRpb25LZXk6IFwiVG9nZ2xlIHRoaXMgdG8gZW5hYmxlIGNvbW1hbmRzIGZvciBzb3J0aW5nIHRhc2tzLlwiLFxyXG5cdFx0Y2F0ZWdvcnk6IFwibWFuYWdlbWVudFwiXHJcblx0fSxcclxuXHJcblx0Ly8gV29ya2Zsb3dzIFRhYlxyXG5cdHtcclxuXHRcdGlkOiBcIndvcmtmbG93XCIsXHJcblx0XHR0YWJJZDogXCJ3b3JrZmxvd1wiLFxyXG5cdFx0bmFtZTogXCJXb3JrZmxvd1wiLFxyXG5cdFx0ZGVzY3JpcHRpb246IFwiQ29uZmlndXJlIHRhc2sgd29ya2Zsb3dzIGZvciBwcm9qZWN0IGFuZCBwcm9jZXNzIG1hbmFnZW1lbnRcIixcclxuXHRcdGtleXdvcmRzOiBbXCJ3b3JrZmxvd1wiLCBcImNvbmZpZ3VyZVwiLCBcInRhc2tcIiwgXCJwcm9qZWN0XCIsIFwicHJvY2Vzc1wiLCBcIm1hbmFnZW1lbnRcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJXb3JrZmxvd1wiLFxyXG5cdFx0ZGVzY3JpcHRpb25LZXk6IFwiQ29uZmlndXJlIHRhc2sgd29ya2Zsb3dzIGZvciBwcm9qZWN0IGFuZCBwcm9jZXNzIG1hbmFnZW1lbnRcIixcclxuXHRcdGNhdGVnb3J5OiBcIndvcmtmbG93XCJcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiBcImVuYWJsZS13b3JrZmxvd1wiLFxyXG5cdFx0dGFiSWQ6IFwid29ya2Zsb3dcIixcclxuXHRcdG5hbWU6IFwiRW5hYmxlIHdvcmtmbG93XCIsXHJcblx0XHRkZXNjcmlwdGlvbjogXCJUb2dnbGUgdG8gZW5hYmxlIHRoZSB3b3JrZmxvdyBzeXN0ZW0gZm9yIHRhc2tzXCIsXHJcblx0XHRrZXl3b3JkczogW1wiZW5hYmxlXCIsIFwid29ya2Zsb3dcIiwgXCJzeXN0ZW1cIiwgXCJ0YXNrc1wiXSxcclxuXHRcdHRyYW5zbGF0aW9uS2V5OiBcIkVuYWJsZSB3b3JrZmxvd1wiLFxyXG5cdFx0ZGVzY3JpcHRpb25LZXk6IFwiVG9nZ2xlIHRvIGVuYWJsZSB0aGUgd29ya2Zsb3cgc3lzdGVtIGZvciB0YXNrc1wiLFxyXG5cdFx0Y2F0ZWdvcnk6IFwid29ya2Zsb3dcIlxyXG5cdH0sXHJcblx0e1xyXG5cdFx0aWQ6IFwiYXV0by1hZGQtdGltZXN0YW1wXCIsXHJcblx0XHR0YWJJZDogXCJ3b3JrZmxvd1wiLFxyXG5cdFx0bmFtZTogXCJBdXRvLWFkZCB0aW1lc3RhbXBcIixcclxuXHRcdGRlc2NyaXB0aW9uOiBcIkF1dG9tYXRpY2FsbHkgYWRkIGEgdGltZXN0YW1wIHRvIHRoZSB0YXNrIHdoZW4gaXQgaXMgY3JlYXRlZFwiLFxyXG5cdFx0a2V5d29yZHM6IFtcImF1dG9cIiwgXCJhZGRcIiwgXCJ0aW1lc3RhbXBcIiwgXCJ0YXNrXCIsIFwiY3JlYXRlZFwiXSxcclxuXHRcdHRyYW5zbGF0aW9uS2V5OiBcIkF1dG8tYWRkIHRpbWVzdGFtcFwiLFxyXG5cdFx0ZGVzY3JpcHRpb25LZXk6IFwiQXV0b21hdGljYWxseSBhZGQgYSB0aW1lc3RhbXAgdG8gdGhlIHRhc2sgd2hlbiBpdCBpcyBjcmVhdGVkXCIsXHJcblx0XHRjYXRlZ29yeTogXCJ3b3JrZmxvd1wiXHJcblx0fSxcclxuXHR7XHJcblx0XHRpZDogXCJhdXRvLXJlbW92ZS1zdGFnZS1tYXJrZXJcIixcclxuXHRcdHRhYklkOiBcIndvcmtmbG93XCIsXHJcblx0XHRuYW1lOiBcIkF1dG8gcmVtb3ZlIGxhc3Qgc3RhZ2UgbWFya2VyXCIsXHJcblx0XHRkZXNjcmlwdGlvbjogXCJBdXRvbWF0aWNhbGx5IHJlbW92ZSB0aGUgbGFzdCBzdGFnZSBtYXJrZXIgd2hlbiBhIHRhc2sgaXMgY29tcGxldGVkXCIsXHJcblx0XHRrZXl3b3JkczogW1wiYXV0b1wiLCBcInJlbW92ZVwiLCBcInN0YWdlXCIsIFwibWFya2VyXCIsIFwidGFza1wiLCBcImNvbXBsZXRlZFwiXSxcclxuXHRcdHRyYW5zbGF0aW9uS2V5OiBcIkF1dG8gcmVtb3ZlIGxhc3Qgc3RhZ2UgbWFya2VyXCIsXHJcblx0XHRkZXNjcmlwdGlvbktleTogXCJBdXRvbWF0aWNhbGx5IHJlbW92ZSB0aGUgbGFzdCBzdGFnZSBtYXJrZXIgd2hlbiBhIHRhc2sgaXMgY29tcGxldGVkXCIsXHJcblx0XHRjYXRlZ29yeTogXCJ3b3JrZmxvd1wiXHJcblx0fSxcclxuXHR7XHJcblx0XHRpZDogXCJhdXRvLWFkZC1uZXh0LXRhc2tcIixcclxuXHRcdHRhYklkOiBcIndvcmtmbG93XCIsXHJcblx0XHRuYW1lOiBcIkF1dG8tYWRkIG5leHQgdGFza1wiLFxyXG5cdFx0ZGVzY3JpcHRpb246IFwiQXV0b21hdGljYWxseSBjcmVhdGUgYSBuZXcgdGFzayB3aXRoIHRoZSBuZXh0IHN0YWdlIHdoZW4gY29tcGxldGluZyBhIHRhc2tcIixcclxuXHRcdGtleXdvcmRzOiBbXCJhdXRvXCIsIFwiYWRkXCIsIFwibmV4dFwiLCBcInRhc2tcIiwgXCJjcmVhdGVcIiwgXCJzdGFnZVwiLCBcImNvbXBsZXRpbmdcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJBdXRvLWFkZCBuZXh0IHRhc2tcIixcclxuXHRcdGRlc2NyaXB0aW9uS2V5OiBcIkF1dG9tYXRpY2FsbHkgY3JlYXRlIGEgbmV3IHRhc2sgd2l0aCB0aGUgbmV4dCBzdGFnZSB3aGVuIGNvbXBsZXRpbmcgYSB0YXNrXCIsXHJcblx0XHRjYXRlZ29yeTogXCJ3b3JrZmxvd1wiXHJcblx0fSxcclxuXHJcblx0Ly8gUXVpY2sgQ2FwdHVyZSBUYWJcclxuXHR7XHJcblx0XHRpZDogXCJxdWljay1jYXB0dXJlXCIsXHJcblx0XHR0YWJJZDogXCJxdWljay1jYXB0dXJlXCIsXHJcblx0XHRuYW1lOiBcIlF1aWNrIGNhcHR1cmVcIixcclxuXHRcdGtleXdvcmRzOiBbXCJxdWlja1wiLCBcImNhcHR1cmVcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJRdWljayBjYXB0dXJlXCIsXHJcblx0XHRjYXRlZ29yeTogXCJ3b3JrZmxvd1wiXHJcblx0fSxcclxuXHR7XHJcblx0XHRpZDogXCJlbmFibGUtcXVpY2stY2FwdHVyZVwiLFxyXG5cdFx0dGFiSWQ6IFwicXVpY2stY2FwdHVyZVwiLFxyXG5cdFx0bmFtZTogXCJFbmFibGUgcXVpY2sgY2FwdHVyZVwiLFxyXG5cdFx0ZGVzY3JpcHRpb246IFwiVG9nZ2xlIHRoaXMgdG8gZW5hYmxlIE9yZy1tb2RlIHN0eWxlIHF1aWNrIGNhcHR1cmUgcGFuZWwuXCIsXHJcblx0XHRrZXl3b3JkczogW1wiZW5hYmxlXCIsIFwicXVpY2tcIiwgXCJjYXB0dXJlXCIsIFwib3JnLW1vZGVcIiwgXCJwYW5lbFwiXSxcclxuXHRcdHRyYW5zbGF0aW9uS2V5OiBcIkVuYWJsZSBxdWljayBjYXB0dXJlXCIsXHJcblx0XHRkZXNjcmlwdGlvbktleTogXCJUb2dnbGUgdGhpcyB0byBlbmFibGUgT3JnLW1vZGUgc3R5bGUgcXVpY2sgY2FwdHVyZSBwYW5lbC5cIixcclxuXHRcdGNhdGVnb3J5OiBcIndvcmtmbG93XCJcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiBcImNhcHR1cmUtdGFyZ2V0LXR5cGVcIixcclxuXHRcdHRhYklkOiBcInF1aWNrLWNhcHR1cmVcIixcclxuXHRcdG5hbWU6IFwiVGFyZ2V0IHR5cGVcIixcclxuXHRcdGRlc2NyaXB0aW9uOiBcIkNob29zZSB3aGV0aGVyIHRvIGNhcHR1cmUgdG8gYSBmaXhlZCBmaWxlIG9yIGRhaWx5IG5vdGVcIixcclxuXHRcdGtleXdvcmRzOiBbXCJ0YXJnZXRcIiwgXCJ0eXBlXCIsIFwiY2FwdHVyZVwiLCBcImZpeGVkXCIsIFwiZmlsZVwiLCBcImRhaWx5XCIsIFwibm90ZVwiXSxcclxuXHRcdHRyYW5zbGF0aW9uS2V5OiBcIlRhcmdldCB0eXBlXCIsXHJcblx0XHRkZXNjcmlwdGlvbktleTogXCJDaG9vc2Ugd2hldGhlciB0byBjYXB0dXJlIHRvIGEgZml4ZWQgZmlsZSBvciBkYWlseSBub3RlXCIsXHJcblx0XHRjYXRlZ29yeTogXCJ3b3JrZmxvd1wiXHJcblx0fSxcclxuXHR7XHJcblx0XHRpZDogXCJjYXB0dXJlLXRhcmdldC1maWxlXCIsXHJcblx0XHR0YWJJZDogXCJxdWljay1jYXB0dXJlXCIsXHJcblx0XHRuYW1lOiBcIlRhcmdldCBmaWxlXCIsXHJcblx0XHRkZXNjcmlwdGlvbjogXCJUaGUgZmlsZSB3aGVyZSBjYXB0dXJlZCB0ZXh0IHdpbGwgYmUgc2F2ZWQuIFlvdSBjYW4gaW5jbHVkZSBhIHBhdGgsIGUuZy4sICdmb2xkZXIvUXVpY2sgQ2FwdHVyZS5tZCcuIFN1cHBvcnRzIGRhdGUgdGVtcGxhdGVzIGxpa2Uge3tEQVRFOllZWVktTU0tRER9fSBvciB7e2RhdGU6WVlZWS1NTS1ERC1ISG1tfX1cIixcclxuXHRcdGtleXdvcmRzOiBbXCJ0YXJnZXRcIiwgXCJmaWxlXCIsIFwiY2FwdHVyZWRcIiwgXCJ0ZXh0XCIsIFwic2F2ZWRcIiwgXCJwYXRoXCIsIFwidGVtcGxhdGVzXCJdLFxyXG5cdFx0dHJhbnNsYXRpb25LZXk6IFwiVGFyZ2V0IGZpbGVcIixcclxuXHRcdGRlc2NyaXB0aW9uS2V5OiBcIlRoZSBmaWxlIHdoZXJlIGNhcHR1cmVkIHRleHQgd2lsbCBiZSBzYXZlZC4gWW91IGNhbiBpbmNsdWRlIGEgcGF0aCwgZS5nLiwgJ2ZvbGRlci9RdWljayBDYXB0dXJlLm1kJy4gU3VwcG9ydHMgZGF0ZSB0ZW1wbGF0ZXMgbGlrZSB7e0RBVEU6WVlZWS1NTS1ERH19IG9yIHt7ZGF0ZTpZWVlZLU1NLURELUhIbW19fVwiLFxyXG5cdFx0Y2F0ZWdvcnk6IFwid29ya2Zsb3dcIlxyXG5cdH0sXHJcblx0e1xyXG5cdFx0aWQ6IFwibWluaW1hbC1tb2RlXCIsXHJcblx0XHR0YWJJZDogXCJxdWljay1jYXB0dXJlXCIsXHJcblx0XHRuYW1lOiBcIk1pbmltYWwgTW9kZVwiLFxyXG5cdFx0a2V5d29yZHM6IFtcIm1pbmltYWxcIiwgXCJtb2RlXCJdLFxyXG5cdFx0dHJhbnNsYXRpb25LZXk6IFwiTWluaW1hbCBNb2RlXCIsXHJcblx0XHRjYXRlZ29yeTogXCJ3b3JrZmxvd1wiXHJcblx0fSxcclxuXHR7XHJcblx0XHRpZDogXCJlbmFibGUtbWluaW1hbC1tb2RlXCIsXHJcblx0XHR0YWJJZDogXCJxdWljay1jYXB0dXJlXCIsXHJcblx0XHRuYW1lOiBcIkVuYWJsZSBtaW5pbWFsIG1vZGVcIixcclxuXHRcdGRlc2NyaXB0aW9uOiBcIkVuYWJsZSBzaW1wbGlmaWVkIHNpbmdsZS1saW5lIHF1aWNrIGNhcHR1cmUgd2l0aCBpbmxpbmUgc3VnZ2VzdGlvbnNcIixcclxuXHRcdGtleXdvcmRzOiBbXCJlbmFibGVcIiwgXCJtaW5pbWFsXCIsIFwibW9kZVwiLCBcInNpbXBsaWZpZWRcIiwgXCJzaW5nbGUtbGluZVwiLCBcInN1Z2dlc3Rpb25zXCJdLFxyXG5cdFx0dHJhbnNsYXRpb25LZXk6IFwiRW5hYmxlIG1pbmltYWwgbW9kZVwiLFxyXG5cdFx0ZGVzY3JpcHRpb25LZXk6IFwiRW5hYmxlIHNpbXBsaWZpZWQgc2luZ2xlLWxpbmUgcXVpY2sgY2FwdHVyZSB3aXRoIGlubGluZSBzdWdnZXN0aW9uc1wiLFxyXG5cdFx0Y2F0ZWdvcnk6IFwid29ya2Zsb3dcIlxyXG5cdH0sXHJcblxyXG5cdC8vIFRpbWUgUGFyc2luZyBUYWJcclxuXHR7XHJcblx0XHRpZDogXCJ0aW1lLXBhcnNpbmctc2V0dGluZ3NcIixcclxuXHRcdHRhYklkOiBcInRpbWUtcGFyc2luZ1wiLFxyXG5cdFx0bmFtZTogXCJUaW1lIFBhcnNpbmcgU2V0dGluZ3NcIixcclxuXHRcdGtleXdvcmRzOiBbXCJ0aW1lXCIsIFwicGFyc2luZ1wiLCBcInNldHRpbmdzXCJdLFxyXG5cdFx0dHJhbnNsYXRpb25LZXk6IFwiVGltZSBQYXJzaW5nIFNldHRpbmdzXCIsXHJcblx0XHRjYXRlZ29yeTogXCJ3b3JrZmxvd1wiXHJcblx0fSxcclxuXHR7XHJcblx0XHRpZDogXCJlbmFibGUtdGltZS1wYXJzaW5nXCIsXHJcblx0XHR0YWJJZDogXCJ0aW1lLXBhcnNpbmdcIixcclxuXHRcdG5hbWU6IFwiRW5hYmxlIFRpbWUgUGFyc2luZ1wiLFxyXG5cdFx0ZGVzY3JpcHRpb246IFwiQXV0b21hdGljYWxseSBwYXJzZSBuYXR1cmFsIGxhbmd1YWdlIHRpbWUgZXhwcmVzc2lvbnMgaW4gUXVpY2sgQ2FwdHVyZVwiLFxyXG5cdFx0a2V5d29yZHM6IFtcImVuYWJsZVwiLCBcInRpbWVcIiwgXCJwYXJzaW5nXCIsIFwibmF0dXJhbFwiLCBcImxhbmd1YWdlXCIsIFwiZXhwcmVzc2lvbnNcIiwgXCJxdWlja1wiLCBcImNhcHR1cmVcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJFbmFibGUgVGltZSBQYXJzaW5nXCIsXHJcblx0XHRkZXNjcmlwdGlvbktleTogXCJBdXRvbWF0aWNhbGx5IHBhcnNlIG5hdHVyYWwgbGFuZ3VhZ2UgdGltZSBleHByZXNzaW9ucyBpbiBRdWljayBDYXB0dXJlXCIsXHJcblx0XHRjYXRlZ29yeTogXCJ3b3JrZmxvd1wiXHJcblx0fSxcclxuXHR7XHJcblx0XHRpZDogXCJyZW1vdmUtdGltZS1leHByZXNzaW9uc1wiLFxyXG5cdFx0dGFiSWQ6IFwidGltZS1wYXJzaW5nXCIsXHJcblx0XHRuYW1lOiBcIlJlbW92ZSBPcmlnaW5hbCBUaW1lIEV4cHJlc3Npb25zXCIsXHJcblx0XHRkZXNjcmlwdGlvbjogXCJSZW1vdmUgcGFyc2VkIHRpbWUgZXhwcmVzc2lvbnMgZnJvbSB0aGUgdGFzayB0ZXh0XCIsXHJcblx0XHRrZXl3b3JkczogW1wicmVtb3ZlXCIsIFwib3JpZ2luYWxcIiwgXCJ0aW1lXCIsIFwiZXhwcmVzc2lvbnNcIiwgXCJwYXJzZWRcIiwgXCJ0YXNrXCIsIFwidGV4dFwiXSxcclxuXHRcdHRyYW5zbGF0aW9uS2V5OiBcIlJlbW92ZSBPcmlnaW5hbCBUaW1lIEV4cHJlc3Npb25zXCIsXHJcblx0XHRkZXNjcmlwdGlvbktleTogXCJSZW1vdmUgcGFyc2VkIHRpbWUgZXhwcmVzc2lvbnMgZnJvbSB0aGUgdGFzayB0ZXh0XCIsXHJcblx0XHRjYXRlZ29yeTogXCJ3b3JrZmxvd1wiXHJcblx0fSxcclxuXHR7XHJcblx0XHRpZDogXCJzdGFydC1kYXRlLWtleXdvcmRzXCIsXHJcblx0XHR0YWJJZDogXCJ0aW1lLXBhcnNpbmdcIixcclxuXHRcdG5hbWU6IFwiU3RhcnQgRGF0ZSBLZXl3b3Jkc1wiLFxyXG5cdFx0ZGVzY3JpcHRpb246IFwiS2V5d29yZHMgdGhhdCBpbmRpY2F0ZSBzdGFydCBkYXRlcyAoY29tbWEtc2VwYXJhdGVkKVwiLFxyXG5cdFx0a2V5d29yZHM6IFtcInN0YXJ0XCIsIFwiZGF0ZVwiLCBcImtleXdvcmRzXCIsIFwiaW5kaWNhdGVcIiwgXCJjb21tYS1zZXBhcmF0ZWRcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJTdGFydCBEYXRlIEtleXdvcmRzXCIsXHJcblx0XHRkZXNjcmlwdGlvbktleTogXCJLZXl3b3JkcyB0aGF0IGluZGljYXRlIHN0YXJ0IGRhdGVzIChjb21tYS1zZXBhcmF0ZWQpXCIsXHJcblx0XHRjYXRlZ29yeTogXCJ3b3JrZmxvd1wiXHJcblx0fSxcclxuXHR7XHJcblx0XHRpZDogXCJkdWUtZGF0ZS1rZXl3b3Jkc1wiLFxyXG5cdFx0dGFiSWQ6IFwidGltZS1wYXJzaW5nXCIsXHJcblx0XHRuYW1lOiBcIkR1ZSBEYXRlIEtleXdvcmRzXCIsXHJcblx0XHRkZXNjcmlwdGlvbjogXCJLZXl3b3JkcyB0aGF0IGluZGljYXRlIGR1ZSBkYXRlcyAoY29tbWEtc2VwYXJhdGVkKVwiLFxyXG5cdFx0a2V5d29yZHM6IFtcImR1ZVwiLCBcImRhdGVcIiwgXCJrZXl3b3Jkc1wiLCBcImluZGljYXRlXCIsIFwiY29tbWEtc2VwYXJhdGVkXCJdLFxyXG5cdFx0dHJhbnNsYXRpb25LZXk6IFwiRHVlIERhdGUgS2V5d29yZHNcIixcclxuXHRcdGRlc2NyaXB0aW9uS2V5OiBcIktleXdvcmRzIHRoYXQgaW5kaWNhdGUgZHVlIGRhdGVzIChjb21tYS1zZXBhcmF0ZWQpXCIsXHJcblx0XHRjYXRlZ29yeTogXCJ3b3JrZmxvd1wiXHJcblx0fSxcclxuXHR7XHJcblx0XHRpZDogXCJzY2hlZHVsZWQtZGF0ZS1rZXl3b3Jkc1wiLFxyXG5cdFx0dGFiSWQ6IFwidGltZS1wYXJzaW5nXCIsXHJcblx0XHRuYW1lOiBcIlNjaGVkdWxlZCBEYXRlIEtleXdvcmRzXCIsXHJcblx0XHRkZXNjcmlwdGlvbjogXCJLZXl3b3JkcyB0aGF0IGluZGljYXRlIHNjaGVkdWxlZCBkYXRlcyAoY29tbWEtc2VwYXJhdGVkKVwiLFxyXG5cdFx0a2V5d29yZHM6IFtcInNjaGVkdWxlZFwiLCBcImRhdGVcIiwgXCJrZXl3b3Jkc1wiLCBcImluZGljYXRlXCIsIFwiY29tbWEtc2VwYXJhdGVkXCJdLFxyXG5cdFx0dHJhbnNsYXRpb25LZXk6IFwiU2NoZWR1bGVkIERhdGUgS2V5d29yZHNcIixcclxuXHRcdGRlc2NyaXB0aW9uS2V5OiBcIktleXdvcmRzIHRoYXQgaW5kaWNhdGUgc2NoZWR1bGVkIGRhdGVzIChjb21tYS1zZXBhcmF0ZWQpXCIsXHJcblx0XHRjYXRlZ29yeTogXCJ3b3JrZmxvd1wiXHJcblx0fSxcclxuXHJcblx0Ly8gVGltZWxpbmUgU2lkZWJhciBUYWJcclxuXHR7XHJcblx0XHRpZDogXCJ0aW1lbGluZS1zaWRlYmFyXCIsXHJcblx0XHR0YWJJZDogXCJ0aW1lbGluZS1zaWRlYmFyXCIsXHJcblx0XHRuYW1lOiBcIlRpbWVsaW5lIFNpZGViYXJcIixcclxuXHRcdGtleXdvcmRzOiBbXCJ0aW1lbGluZVwiLCBcInNpZGViYXJcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJUaW1lbGluZSBTaWRlYmFyXCIsXHJcblx0XHRjYXRlZ29yeTogXCJ3b3JrZmxvd1wiXHJcblx0fSxcclxuXHR7XHJcblx0XHRpZDogXCJlbmFibGUtdGltZWxpbmUtc2lkZWJhclwiLFxyXG5cdFx0dGFiSWQ6IFwidGltZWxpbmUtc2lkZWJhclwiLFxyXG5cdFx0bmFtZTogXCJFbmFibGUgVGltZWxpbmUgU2lkZWJhclwiLFxyXG5cdFx0ZGVzY3JpcHRpb246IFwiVG9nZ2xlIHRoaXMgdG8gZW5hYmxlIHRoZSB0aW1lbGluZSBzaWRlYmFyIHZpZXcgZm9yIHF1aWNrIGFjY2VzcyB0byB5b3VyIGRhaWx5IGV2ZW50cyBhbmQgdGFza3MuXCIsXHJcblx0XHRrZXl3b3JkczogW1wiZW5hYmxlXCIsIFwidGltZWxpbmVcIiwgXCJzaWRlYmFyXCIsIFwidmlld1wiLCBcInF1aWNrXCIsIFwiYWNjZXNzXCIsIFwiZGFpbHlcIiwgXCJldmVudHNcIiwgXCJ0YXNrc1wiXSxcclxuXHRcdHRyYW5zbGF0aW9uS2V5OiBcIkVuYWJsZSBUaW1lbGluZSBTaWRlYmFyXCIsXHJcblx0XHRkZXNjcmlwdGlvbktleTogXCJUb2dnbGUgdGhpcyB0byBlbmFibGUgdGhlIHRpbWVsaW5lIHNpZGViYXIgdmlldyBmb3IgcXVpY2sgYWNjZXNzIHRvIHlvdXIgZGFpbHkgZXZlbnRzIGFuZCB0YXNrcy5cIixcclxuXHRcdGNhdGVnb3J5OiBcIndvcmtmbG93XCJcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiBcInRpbWVsaW5lLWF1dG8tb3BlblwiLFxyXG5cdFx0dGFiSWQ6IFwidGltZWxpbmUtc2lkZWJhclwiLFxyXG5cdFx0bmFtZTogXCJBdXRvLW9wZW4gb24gc3RhcnR1cFwiLFxyXG5cdFx0ZGVzY3JpcHRpb246IFwiQXV0b21hdGljYWxseSBvcGVuIHRoZSB0aW1lbGluZSBzaWRlYmFyIHdoZW4gT2JzaWRpYW4gc3RhcnRzLlwiLFxyXG5cdFx0a2V5d29yZHM6IFtcImF1dG8tb3BlblwiLCBcInN0YXJ0dXBcIiwgXCJhdXRvbWF0aWNhbGx5XCIsIFwidGltZWxpbmVcIiwgXCJzaWRlYmFyXCIsIFwib2JzaWRpYW5cIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJBdXRvLW9wZW4gb24gc3RhcnR1cFwiLFxyXG5cdFx0ZGVzY3JpcHRpb25LZXk6IFwiQXV0b21hdGljYWxseSBvcGVuIHRoZSB0aW1lbGluZSBzaWRlYmFyIHdoZW4gT2JzaWRpYW4gc3RhcnRzLlwiLFxyXG5cdFx0Y2F0ZWdvcnk6IFwid29ya2Zsb3dcIlxyXG5cdH0sXHJcblx0e1xyXG5cdFx0aWQ6IFwidGltZWxpbmUtc2hvdy1jb21wbGV0ZWRcIixcclxuXHRcdHRhYklkOiBcInRpbWVsaW5lLXNpZGViYXJcIixcclxuXHRcdG5hbWU6IFwiU2hvdyBjb21wbGV0ZWQgdGFza3NcIixcclxuXHRcdGRlc2NyaXB0aW9uOiBcIkluY2x1ZGUgY29tcGxldGVkIHRhc2tzIGluIHRoZSB0aW1lbGluZSB2aWV3LiBXaGVuIGRpc2FibGVkLCBvbmx5IGluY29tcGxldGUgdGFza3Mgd2lsbCBiZSBzaG93bi5cIixcclxuXHRcdGtleXdvcmRzOiBbXCJzaG93XCIsIFwiY29tcGxldGVkXCIsIFwidGFza3NcIiwgXCJ0aW1lbGluZVwiLCBcInZpZXdcIiwgXCJpbmNvbXBsZXRlXCJdLFxyXG5cdFx0dHJhbnNsYXRpb25LZXk6IFwiU2hvdyBjb21wbGV0ZWQgdGFza3NcIixcclxuXHRcdGRlc2NyaXB0aW9uS2V5OiBcIkluY2x1ZGUgY29tcGxldGVkIHRhc2tzIGluIHRoZSB0aW1lbGluZSB2aWV3LiBXaGVuIGRpc2FibGVkLCBvbmx5IGluY29tcGxldGUgdGFza3Mgd2lsbCBiZSBzaG93bi5cIixcclxuXHRcdGNhdGVnb3J5OiBcIndvcmtmbG93XCJcclxuXHR9LFxyXG5cclxuXHQvLyBQcm9qZWN0cyBUYWJcclxuXHR7XHJcblx0XHRpZDogXCJlbmhhbmNlZC1wcm9qZWN0LWNvbmZpZ1wiLFxyXG5cdFx0dGFiSWQ6IFwicHJvamVjdFwiLFxyXG5cdFx0bmFtZTogXCJFbmhhbmNlZCBQcm9qZWN0IENvbmZpZ3VyYXRpb25cIixcclxuXHRcdGRlc2NyaXB0aW9uOiBcIkNvbmZpZ3VyZSBhZHZhbmNlZCBwcm9qZWN0IGRldGVjdGlvbiBhbmQgbWFuYWdlbWVudCBmZWF0dXJlc1wiLFxyXG5cdFx0a2V5d29yZHM6IFtcImVuaGFuY2VkXCIsIFwicHJvamVjdFwiLCBcImNvbmZpZ3VyYXRpb25cIiwgXCJhZHZhbmNlZFwiLCBcImRldGVjdGlvblwiLCBcIm1hbmFnZW1lbnRcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJFbmhhbmNlZCBQcm9qZWN0IENvbmZpZ3VyYXRpb25cIixcclxuXHRcdGRlc2NyaXB0aW9uS2V5OiBcIkNvbmZpZ3VyZSBhZHZhbmNlZCBwcm9qZWN0IGRldGVjdGlvbiBhbmQgbWFuYWdlbWVudCBmZWF0dXJlc1wiLFxyXG5cdFx0Y2F0ZWdvcnk6IFwibWFuYWdlbWVudFwiXHJcblx0fSxcclxuXHR7XHJcblx0XHRpZDogXCJlbmFibGUtZW5oYW5jZWQtcHJvamVjdHNcIixcclxuXHRcdHRhYklkOiBcInByb2plY3RcIixcclxuXHRcdG5hbWU6IFwiRW5hYmxlIGVuaGFuY2VkIHByb2plY3QgZmVhdHVyZXNcIixcclxuXHRcdGRlc2NyaXB0aW9uOiBcIkVuYWJsZSBwYXRoLWJhc2VkLCBtZXRhZGF0YS1iYXNlZCwgYW5kIGNvbmZpZyBmaWxlLWJhc2VkIHByb2plY3QgZGV0ZWN0aW9uXCIsXHJcblx0XHRrZXl3b3JkczogW1wiZW5hYmxlXCIsIFwiZW5oYW5jZWRcIiwgXCJwcm9qZWN0XCIsIFwiZmVhdHVyZXNcIiwgXCJwYXRoLWJhc2VkXCIsIFwibWV0YWRhdGEtYmFzZWRcIiwgXCJjb25maWdcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJFbmFibGUgZW5oYW5jZWQgcHJvamVjdCBmZWF0dXJlc1wiLFxyXG5cdFx0ZGVzY3JpcHRpb25LZXk6IFwiRW5hYmxlIHBhdGgtYmFzZWQsIG1ldGFkYXRhLWJhc2VkLCBhbmQgY29uZmlnIGZpbGUtYmFzZWQgcHJvamVjdCBkZXRlY3Rpb25cIixcclxuXHRcdGNhdGVnb3J5OiBcIm1hbmFnZW1lbnRcIlxyXG5cdH0sXHJcblx0e1xyXG5cdFx0aWQ6IFwicGF0aC1iYXNlZC1wcm9qZWN0c1wiLFxyXG5cdFx0dGFiSWQ6IFwicHJvamVjdFwiLFxyXG5cdFx0bmFtZTogXCJQYXRoLWJhc2VkIFByb2plY3QgTWFwcGluZ3NcIixcclxuXHRcdGRlc2NyaXB0aW9uOiBcIkNvbmZpZ3VyZSBwcm9qZWN0IG5hbWVzIGJhc2VkIG9uIGZpbGUgcGF0aHNcIixcclxuXHRcdGtleXdvcmRzOiBbXCJwYXRoLWJhc2VkXCIsIFwicHJvamVjdFwiLCBcIm1hcHBpbmdzXCIsIFwiY29uZmlndXJlXCIsIFwibmFtZXNcIiwgXCJmaWxlXCIsIFwicGF0aHNcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJQYXRoLWJhc2VkIFByb2plY3QgTWFwcGluZ3NcIixcclxuXHRcdGRlc2NyaXB0aW9uS2V5OiBcIkNvbmZpZ3VyZSBwcm9qZWN0IG5hbWVzIGJhc2VkIG9uIGZpbGUgcGF0aHNcIixcclxuXHRcdGNhdGVnb3J5OiBcIm1hbmFnZW1lbnRcIlxyXG5cdH0sXHJcblx0e1xyXG5cdFx0aWQ6IFwibWV0YWRhdGEtYmFzZWQtcHJvamVjdHNcIixcclxuXHRcdHRhYklkOiBcInByb2plY3RcIixcclxuXHRcdG5hbWU6IFwiTWV0YWRhdGEtYmFzZWQgUHJvamVjdCBDb25maWd1cmF0aW9uXCIsXHJcblx0XHRkZXNjcmlwdGlvbjogXCJDb25maWd1cmUgcHJvamVjdCBkZXRlY3Rpb24gZnJvbSBmaWxlIGZyb250bWF0dGVyXCIsXHJcblx0XHRrZXl3b3JkczogW1wibWV0YWRhdGEtYmFzZWRcIiwgXCJwcm9qZWN0XCIsIFwiY29uZmlndXJhdGlvblwiLCBcImRldGVjdGlvblwiLCBcImZpbGVcIiwgXCJmcm9udG1hdHRlclwiXSxcclxuXHRcdHRyYW5zbGF0aW9uS2V5OiBcIk1ldGFkYXRhLWJhc2VkIFByb2plY3QgQ29uZmlndXJhdGlvblwiLFxyXG5cdFx0ZGVzY3JpcHRpb25LZXk6IFwiQ29uZmlndXJlIHByb2plY3QgZGV0ZWN0aW9uIGZyb20gZmlsZSBmcm9udG1hdHRlclwiLFxyXG5cdFx0Y2F0ZWdvcnk6IFwibWFuYWdlbWVudFwiXHJcblx0fSxcclxuXHJcblx0Ly8gVmlld3MgJiBJbmRleCBUYWJcclxuXHR7XHJcblx0XHRpZDogXCJ2aWV3LWluZGV4LWNvbmZpZ1wiLFxyXG5cdFx0dGFiSWQ6IFwidmlldy1zZXR0aW5nc1wiLFxyXG5cdFx0bmFtZTogXCJWaWV3ICYgSW5kZXggQ29uZmlndXJhdGlvblwiLFxyXG5cdFx0ZGVzY3JpcHRpb246IFwiQ29uZmlndXJlIHRoZSBUYXNrIEdlbml1cyBzaWRlYmFyIHZpZXdzLCB2aXNpYmlsaXR5LCBvcmRlciwgYW5kIGNyZWF0ZSBjdXN0b20gdmlld3MuXCIsXHJcblx0XHRrZXl3b3JkczogW1widmlld1wiLCBcImluZGV4XCIsIFwiY29uZmlndXJhdGlvblwiLCBcInNpZGViYXJcIiwgXCJ2aXNpYmlsaXR5XCIsIFwib3JkZXJcIiwgXCJjdXN0b21cIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJWaWV3ICYgSW5kZXggQ29uZmlndXJhdGlvblwiLFxyXG5cdFx0ZGVzY3JpcHRpb25LZXk6IFwiQ29uZmlndXJlIHRoZSBUYXNrIEdlbml1cyBzaWRlYmFyIHZpZXdzLCB2aXNpYmlsaXR5LCBvcmRlciwgYW5kIGNyZWF0ZSBjdXN0b20gdmlld3MuXCIsXHJcblx0XHRjYXRlZ29yeTogXCJjb3JlXCJcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiBcImVuYWJsZS10YXNrLWdlbml1cy12aWV3XCIsXHJcblx0XHR0YWJJZDogXCJ2aWV3LXNldHRpbmdzXCIsXHJcblx0XHRuYW1lOiBcIkVuYWJsZSB0YXNrIGdlbml1cyB2aWV3XCIsXHJcblx0XHRkZXNjcmlwdGlvbjogXCJFbmFibGUgdGFzayBnZW5pdXMgdmlldyB3aWxsIGFsc28gZW5hYmxlIHRoZSB0YXNrIGdlbml1cyBpbmRleGVyLCB3aGljaCB3aWxsIHByb3ZpZGUgdGhlIHRhc2sgZ2VuaXVzIHZpZXcgcmVzdWx0cyBmcm9tIHdob2xlIHZhdWx0LlwiLFxyXG5cdFx0a2V5d29yZHM6IFtcImVuYWJsZVwiLCBcInRhc2tcIiwgXCJnZW5pdXNcIiwgXCJ2aWV3XCIsIFwiaW5kZXhlclwiLCBcInZhdWx0XCJdLFxyXG5cdFx0dHJhbnNsYXRpb25LZXk6IFwiRW5hYmxlIHRhc2sgZ2VuaXVzIHZpZXdcIixcclxuXHRcdGRlc2NyaXB0aW9uS2V5OiBcIkVuYWJsZSB0YXNrIGdlbml1cyB2aWV3IHdpbGwgYWxzbyBlbmFibGUgdGhlIHRhc2sgZ2VuaXVzIGluZGV4ZXIsIHdoaWNoIHdpbGwgcHJvdmlkZSB0aGUgdGFzayBnZW5pdXMgdmlldyByZXN1bHRzIGZyb20gd2hvbGUgdmF1bHQuXCIsXHJcblx0XHRjYXRlZ29yeTogXCJjb3JlXCJcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiBcImRlZmF1bHQtdmlldy1tb2RlXCIsXHJcblx0XHR0YWJJZDogXCJ2aWV3LXNldHRpbmdzXCIsXHJcblx0XHRuYW1lOiBcIkRlZmF1bHQgdmlldyBtb2RlXCIsXHJcblx0XHRkZXNjcmlwdGlvbjogXCJDaG9vc2UgdGhlIGRlZmF1bHQgZGlzcGxheSBtb2RlIGZvciBhbGwgdmlld3MuIFRoaXMgYWZmZWN0cyBob3cgdGFza3MgYXJlIGRpc3BsYXllZCB3aGVuIHlvdSBmaXJzdCBvcGVuIGEgdmlldyBvciBjcmVhdGUgYSBuZXcgdmlldy5cIixcclxuXHRcdGtleXdvcmRzOiBbXCJkZWZhdWx0XCIsIFwidmlld1wiLCBcIm1vZGVcIiwgXCJkaXNwbGF5XCIsIFwidGFza3NcIiwgXCJvcGVuXCIsIFwiY3JlYXRlXCJdLFxyXG5cdFx0dHJhbnNsYXRpb25LZXk6IFwiRGVmYXVsdCB2aWV3IG1vZGVcIixcclxuXHRcdGRlc2NyaXB0aW9uS2V5OiBcIkNob29zZSB0aGUgZGVmYXVsdCBkaXNwbGF5IG1vZGUgZm9yIGFsbCB2aWV3cy4gVGhpcyBhZmZlY3RzIGhvdyB0YXNrcyBhcmUgZGlzcGxheWVkIHdoZW4geW91IGZpcnN0IG9wZW4gYSB2aWV3IG9yIGNyZWF0ZSBhIG5ldyB2aWV3LlwiLFxyXG5cdFx0Y2F0ZWdvcnk6IFwiY29yZVwiXHJcblx0fSxcclxuXHR7XHJcblx0XHRpZDogXCJwcmVmZXItbWV0YWRhdGEtZm9ybWF0XCIsXHJcblx0XHR0YWJJZDogXCJ2aWV3LXNldHRpbmdzXCIsXHJcblx0XHRuYW1lOiBcIlByZWZlciBtZXRhZGF0YSBmb3JtYXQgb2YgdGFza1wiLFxyXG5cdFx0ZGVzY3JpcHRpb246IFwiWW91IGNhbiBjaG9vc2UgZGF0YXZpZXcgZm9ybWF0IG9yIHRhc2tzIGZvcm1hdCwgdGhhdCB3aWxsIGluZmx1ZW5jZSBib3RoIGluZGV4IGFuZCBzYXZlIGZvcm1hdC5cIixcclxuXHRcdGtleXdvcmRzOiBbXCJwcmVmZXJcIiwgXCJtZXRhZGF0YVwiLCBcImZvcm1hdFwiLCBcInRhc2tcIiwgXCJkYXRhdmlld1wiLCBcInRhc2tzXCIsIFwiaW5kZXhcIiwgXCJzYXZlXCJdLFxyXG5cdFx0dHJhbnNsYXRpb25LZXk6IFwiUHJlZmVyIG1ldGFkYXRhIGZvcm1hdCBvZiB0YXNrXCIsXHJcblx0XHRkZXNjcmlwdGlvbktleTogXCJZb3UgY2FuIGNob29zZSBkYXRhdmlldyBmb3JtYXQgb3IgdGFza3MgZm9ybWF0LCB0aGF0IHdpbGwgaW5mbHVlbmNlIGJvdGggaW5kZXggYW5kIHNhdmUgZm9ybWF0LlwiLFxyXG5cdFx0Y2F0ZWdvcnk6IFwiY29yZVwiXHJcblx0fSxcclxuXHJcblx0Ly8gUmV3YXJkcyBUYWJcclxuXHR7XHJcblx0XHRpZDogXCJyZXdhcmRzXCIsXHJcblx0XHR0YWJJZDogXCJyZXdhcmRcIixcclxuXHRcdG5hbWU6IFwiUmV3YXJkc1wiLFxyXG5cdFx0ZGVzY3JpcHRpb246IFwiQ29uZmlndXJlIHJld2FyZHMgZm9yIGNvbXBsZXRpbmcgdGFza3MuIERlZmluZSBpdGVtcywgdGhlaXIgb2NjdXJyZW5jZSBjaGFuY2VzLCBhbmQgY29uZGl0aW9ucy5cIixcclxuXHRcdGtleXdvcmRzOiBbXCJyZXdhcmRzXCIsIFwiY29uZmlndXJlXCIsIFwiY29tcGxldGluZ1wiLCBcInRhc2tzXCIsIFwiaXRlbXNcIiwgXCJvY2N1cnJlbmNlXCIsIFwiY2hhbmNlc1wiLCBcImNvbmRpdGlvbnNcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJSZXdhcmRzXCIsXHJcblx0XHRkZXNjcmlwdGlvbktleTogXCJDb25maWd1cmUgcmV3YXJkcyBmb3IgY29tcGxldGluZyB0YXNrcy4gRGVmaW5lIGl0ZW1zLCB0aGVpciBvY2N1cnJlbmNlIGNoYW5jZXMsIGFuZCBjb25kaXRpb25zLlwiLFxyXG5cdFx0Y2F0ZWdvcnk6IFwiZ2FtaWZpY2F0aW9uXCJcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiBcImVuYWJsZS1yZXdhcmRzXCIsXHJcblx0XHR0YWJJZDogXCJyZXdhcmRcIixcclxuXHRcdG5hbWU6IFwiRW5hYmxlIHJld2FyZHNcIixcclxuXHRcdGRlc2NyaXB0aW9uOiBcIlRvZ2dsZSB0byBlbmFibGUgb3IgZGlzYWJsZSB0aGUgcmV3YXJkIHN5c3RlbS5cIixcclxuXHRcdGtleXdvcmRzOiBbXCJlbmFibGVcIiwgXCJyZXdhcmRzXCIsIFwidG9nZ2xlXCIsIFwiZGlzYWJsZVwiLCBcInJld2FyZFwiLCBcInN5c3RlbVwiXSxcclxuXHRcdHRyYW5zbGF0aW9uS2V5OiBcIkVuYWJsZSByZXdhcmRzXCIsXHJcblx0XHRkZXNjcmlwdGlvbktleTogXCJUb2dnbGUgdG8gZW5hYmxlIG9yIGRpc2FibGUgdGhlIHJld2FyZCBzeXN0ZW0uXCIsXHJcblx0XHRjYXRlZ29yeTogXCJnYW1pZmljYXRpb25cIlxyXG5cdH0sXHJcblx0e1xyXG5cdFx0aWQ6IFwicmV3YXJkLWRpc3BsYXktdHlwZVwiLFxyXG5cdFx0dGFiSWQ6IFwicmV3YXJkXCIsXHJcblx0XHRuYW1lOiBcIlJld2FyZCBkaXNwbGF5IHR5cGVcIixcclxuXHRcdGRlc2NyaXB0aW9uOiBcIkNob29zZSBob3cgcmV3YXJkcyBhcmUgZGlzcGxheWVkIHdoZW4gZWFybmVkLlwiLFxyXG5cdFx0a2V5d29yZHM6IFtcInJld2FyZFwiLCBcImRpc3BsYXlcIiwgXCJ0eXBlXCIsIFwiY2hvb3NlXCIsIFwiZGlzcGxheWVkXCIsIFwiZWFybmVkXCJdLFxyXG5cdFx0dHJhbnNsYXRpb25LZXk6IFwiUmV3YXJkIGRpc3BsYXkgdHlwZVwiLFxyXG5cdFx0ZGVzY3JpcHRpb25LZXk6IFwiQ2hvb3NlIGhvdyByZXdhcmRzIGFyZSBkaXNwbGF5ZWQgd2hlbiBlYXJuZWQuXCIsXHJcblx0XHRjYXRlZ29yeTogXCJnYW1pZmljYXRpb25cIlxyXG5cdH0sXHJcblx0e1xyXG5cdFx0aWQ6IFwib2NjdXJyZW5jZS1sZXZlbHNcIixcclxuXHRcdHRhYklkOiBcInJld2FyZFwiLFxyXG5cdFx0bmFtZTogXCJPY2N1cnJlbmNlIGxldmVsc1wiLFxyXG5cdFx0ZGVzY3JpcHRpb246IFwiRGVmaW5lIGRpZmZlcmVudCBsZXZlbHMgb2YgcmV3YXJkIHJhcml0eSBhbmQgdGhlaXIgcHJvYmFiaWxpdHkuXCIsXHJcblx0XHRrZXl3b3JkczogW1wib2NjdXJyZW5jZVwiLCBcImxldmVsc1wiLCBcImRlZmluZVwiLCBcImRpZmZlcmVudFwiLCBcInJld2FyZFwiLCBcInJhcml0eVwiLCBcInByb2JhYmlsaXR5XCJdLFxyXG5cdFx0dHJhbnNsYXRpb25LZXk6IFwiT2NjdXJyZW5jZSBsZXZlbHNcIixcclxuXHRcdGRlc2NyaXB0aW9uS2V5OiBcIkRlZmluZSBkaWZmZXJlbnQgbGV2ZWxzIG9mIHJld2FyZCByYXJpdHkgYW5kIHRoZWlyIHByb2JhYmlsaXR5LlwiLFxyXG5cdFx0Y2F0ZWdvcnk6IFwiZ2FtaWZpY2F0aW9uXCJcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiBcInJld2FyZC1pdGVtc1wiLFxyXG5cdFx0dGFiSWQ6IFwicmV3YXJkXCIsXHJcblx0XHRuYW1lOiBcIlJld2FyZCBpdGVtc1wiLFxyXG5cdFx0ZGVzY3JpcHRpb246IFwiTWFuYWdlIHRoZSBzcGVjaWZpYyByZXdhcmRzIHRoYXQgY2FuIGJlIG9idGFpbmVkLlwiLFxyXG5cdFx0a2V5d29yZHM6IFtcInJld2FyZFwiLCBcIml0ZW1zXCIsIFwibWFuYWdlXCIsIFwic3BlY2lmaWNcIiwgXCJyZXdhcmRzXCIsIFwib2J0YWluZWRcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJSZXdhcmQgaXRlbXNcIixcclxuXHRcdGRlc2NyaXB0aW9uS2V5OiBcIk1hbmFnZSB0aGUgc3BlY2lmaWMgcmV3YXJkcyB0aGF0IGNhbiBiZSBvYnRhaW5lZC5cIixcclxuXHRcdGNhdGVnb3J5OiBcImdhbWlmaWNhdGlvblwiXHJcblx0fSxcclxuXHJcblx0Ly8gSGFiaXRzIFRhYlxyXG5cdHtcclxuXHRcdGlkOiBcImhhYml0XCIsXHJcblx0XHR0YWJJZDogXCJoYWJpdFwiLFxyXG5cdFx0bmFtZTogXCJIYWJpdFwiLFxyXG5cdFx0ZGVzY3JpcHRpb246IFwiQ29uZmlndXJlIGhhYml0IHNldHRpbmdzLCBpbmNsdWRpbmcgYWRkaW5nIG5ldyBoYWJpdHMsIGVkaXRpbmcgZXhpc3RpbmcgaGFiaXRzLCBhbmQgbWFuYWdpbmcgaGFiaXQgY29tcGxldGlvbi5cIixcclxuXHRcdGtleXdvcmRzOiBbXCJoYWJpdFwiLCBcImNvbmZpZ3VyZVwiLCBcInNldHRpbmdzXCIsIFwiYWRkaW5nXCIsIFwiZWRpdGluZ1wiLCBcIm1hbmFnaW5nXCIsIFwiY29tcGxldGlvblwiXSxcclxuXHRcdHRyYW5zbGF0aW9uS2V5OiBcIkhhYml0XCIsXHJcblx0XHRkZXNjcmlwdGlvbktleTogXCJDb25maWd1cmUgaGFiaXQgc2V0dGluZ3MsIGluY2x1ZGluZyBhZGRpbmcgbmV3IGhhYml0cywgZWRpdGluZyBleGlzdGluZyBoYWJpdHMsIGFuZCBtYW5hZ2luZyBoYWJpdCBjb21wbGV0aW9uLlwiLFxyXG5cdFx0Y2F0ZWdvcnk6IFwiZ2FtaWZpY2F0aW9uXCJcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiBcImVuYWJsZS1oYWJpdHNcIixcclxuXHRcdHRhYklkOiBcImhhYml0XCIsXHJcblx0XHRuYW1lOiBcIkVuYWJsZSBoYWJpdHNcIixcclxuXHRcdGtleXdvcmRzOiBbXCJlbmFibGVcIiwgXCJoYWJpdHNcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJFbmFibGUgaGFiaXRzXCIsXHJcblx0XHRjYXRlZ29yeTogXCJnYW1pZmljYXRpb25cIlxyXG5cdH0sXHJcblxyXG5cdC8vIENhbGVuZGFyIFN5bmMgVGFiXHJcblx0e1xyXG5cdFx0aWQ6IFwiaWNzLWNhbGVuZGFyLWludGVncmF0aW9uXCIsXHJcblx0XHR0YWJJZDogXCJpY3MtaW50ZWdyYXRpb25cIixcclxuXHRcdG5hbWU6IFwiSUNTIENhbGVuZGFyIEludGVncmF0aW9uXCIsXHJcblx0XHRrZXl3b3JkczogW1wiaWNzXCIsIFwiY2FsZW5kYXJcIiwgXCJpbnRlZ3JhdGlvblwiXSxcclxuXHRcdHRyYW5zbGF0aW9uS2V5OiBcIklDUyBDYWxlbmRhciBJbnRlZ3JhdGlvblwiLFxyXG5cdFx0Y2F0ZWdvcnk6IFwiaW50ZWdyYXRpb25cIlxyXG5cdH0sXHJcblx0e1xyXG5cdFx0aWQ6IFwiZW5hYmxlLWJhY2tncm91bmQtcmVmcmVzaFwiLFxyXG5cdFx0dGFiSWQ6IFwiaWNzLWludGVncmF0aW9uXCIsXHJcblx0XHRuYW1lOiBcIkVuYWJsZSBCYWNrZ3JvdW5kIFJlZnJlc2hcIixcclxuXHRcdGRlc2NyaXB0aW9uOiBcIkF1dG9tYXRpY2FsbHkgcmVmcmVzaCBjYWxlbmRhciBzb3VyY2VzIGluIHRoZSBiYWNrZ3JvdW5kXCIsXHJcblx0XHRrZXl3b3JkczogW1wiZW5hYmxlXCIsIFwiYmFja2dyb3VuZFwiLCBcInJlZnJlc2hcIiwgXCJhdXRvbWF0aWNhbGx5XCIsIFwiY2FsZW5kYXJcIiwgXCJzb3VyY2VzXCJdLFxyXG5cdFx0dHJhbnNsYXRpb25LZXk6IFwiRW5hYmxlIEJhY2tncm91bmQgUmVmcmVzaFwiLFxyXG5cdFx0ZGVzY3JpcHRpb25LZXk6IFwiQXV0b21hdGljYWxseSByZWZyZXNoIGNhbGVuZGFyIHNvdXJjZXMgaW4gdGhlIGJhY2tncm91bmRcIixcclxuXHRcdGNhdGVnb3J5OiBcImludGVncmF0aW9uXCJcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiBcImdsb2JhbC1yZWZyZXNoLWludGVydmFsXCIsXHJcblx0XHR0YWJJZDogXCJpY3MtaW50ZWdyYXRpb25cIixcclxuXHRcdG5hbWU6IFwiR2xvYmFsIFJlZnJlc2ggSW50ZXJ2YWxcIixcclxuXHRcdGRlc2NyaXB0aW9uOiBcIkRlZmF1bHQgcmVmcmVzaCBpbnRlcnZhbCBmb3IgYWxsIHNvdXJjZXMgKG1pbnV0ZXMpXCIsXHJcblx0XHRrZXl3b3JkczogW1wiZ2xvYmFsXCIsIFwicmVmcmVzaFwiLCBcImludGVydmFsXCIsIFwiZGVmYXVsdFwiLCBcInNvdXJjZXNcIiwgXCJtaW51dGVzXCJdLFxyXG5cdFx0dHJhbnNsYXRpb25LZXk6IFwiR2xvYmFsIFJlZnJlc2ggSW50ZXJ2YWxcIixcclxuXHRcdGRlc2NyaXB0aW9uS2V5OiBcIkRlZmF1bHQgcmVmcmVzaCBpbnRlcnZhbCBmb3IgYWxsIHNvdXJjZXMgKG1pbnV0ZXMpXCIsXHJcblx0XHRjYXRlZ29yeTogXCJpbnRlZ3JhdGlvblwiXHJcblx0fSxcclxuXHR7XHJcblx0XHRpZDogXCJtYXhpbXVtLWNhY2hlLWFnZVwiLFxyXG5cdFx0dGFiSWQ6IFwiaWNzLWludGVncmF0aW9uXCIsXHJcblx0XHRuYW1lOiBcIk1heGltdW0gQ2FjaGUgQWdlXCIsXHJcblx0XHRkZXNjcmlwdGlvbjogXCJIb3cgbG9uZyB0byBrZWVwIGNhY2hlZCBkYXRhIChob3VycylcIixcclxuXHRcdGtleXdvcmRzOiBbXCJtYXhpbXVtXCIsIFwiY2FjaGVcIiwgXCJhZ2VcIiwgXCJrZWVwXCIsIFwiY2FjaGVkXCIsIFwiZGF0YVwiLCBcImhvdXJzXCJdLFxyXG5cdFx0dHJhbnNsYXRpb25LZXk6IFwiTWF4aW11bSBDYWNoZSBBZ2VcIixcclxuXHRcdGRlc2NyaXB0aW9uS2V5OiBcIkhvdyBsb25nIHRvIGtlZXAgY2FjaGVkIGRhdGEgKGhvdXJzKVwiLFxyXG5cdFx0Y2F0ZWdvcnk6IFwiaW50ZWdyYXRpb25cIlxyXG5cdH0sXHJcblxyXG5cdC8vIEJldGEgRmVhdHVyZXMgVGFiXHJcblx0e1xyXG5cdFx0aWQ6IFwiYmV0YS10ZXN0LWZlYXR1cmVzXCIsXHJcblx0XHR0YWJJZDogXCJiZXRhLXRlc3RcIixcclxuXHRcdG5hbWU6IFwiQmV0YSBUZXN0IEZlYXR1cmVzXCIsXHJcblx0XHRkZXNjcmlwdGlvbjogXCJFeHBlcmltZW50YWwgZmVhdHVyZXMgdGhhdCBhcmUgY3VycmVudGx5IGluIHRlc3RpbmcgcGhhc2UuIFRoZXNlIGZlYXR1cmVzIG1heSBiZSB1bnN0YWJsZSBhbmQgY291bGQgY2hhbmdlIG9yIGJlIHJlbW92ZWQgaW4gZnV0dXJlIHVwZGF0ZXMuXCIsXHJcblx0XHRrZXl3b3JkczogW1wiYmV0YVwiLCBcInRlc3RcIiwgXCJmZWF0dXJlc1wiLCBcImV4cGVyaW1lbnRhbFwiLCBcInRlc3RpbmdcIiwgXCJwaGFzZVwiLCBcInVuc3RhYmxlXCJdLFxyXG5cdFx0dHJhbnNsYXRpb25LZXk6IFwiQmV0YSBUZXN0IEZlYXR1cmVzXCIsXHJcblx0XHRkZXNjcmlwdGlvbktleTogXCJFeHBlcmltZW50YWwgZmVhdHVyZXMgdGhhdCBhcmUgY3VycmVudGx5IGluIHRlc3RpbmcgcGhhc2UuIFRoZXNlIGZlYXR1cmVzIG1heSBiZSB1bnN0YWJsZSBhbmQgY291bGQgY2hhbmdlIG9yIGJlIHJlbW92ZWQgaW4gZnV0dXJlIHVwZGF0ZXMuXCIsXHJcblx0XHRjYXRlZ29yeTogXCJhZHZhbmNlZFwiXHJcblx0fSxcclxuXHR7XHJcblx0XHRpZDogXCJiYXNlLXZpZXdcIixcclxuXHRcdHRhYklkOiBcImJldGEtdGVzdFwiLFxyXG5cdFx0bmFtZTogXCJCYXNlIFZpZXdcIixcclxuXHRcdGRlc2NyaXB0aW9uOiBcIkFkdmFuY2VkIHZpZXcgbWFuYWdlbWVudCBmZWF0dXJlcyB0aGF0IGV4dGVuZCB0aGUgZGVmYXVsdCBUYXNrIEdlbml1cyB2aWV3cyB3aXRoIGFkZGl0aW9uYWwgZnVuY3Rpb25hbGl0eS5cIixcclxuXHRcdGtleXdvcmRzOiBbXCJiYXNlXCIsIFwidmlld1wiLCBcImFkdmFuY2VkXCIsIFwibWFuYWdlbWVudFwiLCBcImZlYXR1cmVzXCIsIFwiZXh0ZW5kXCIsIFwiZGVmYXVsdFwiLCBcImZ1bmN0aW9uYWxpdHlcIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJCYXNlIFZpZXdcIixcclxuXHRcdGRlc2NyaXB0aW9uS2V5OiBcIkFkdmFuY2VkIHZpZXcgbWFuYWdlbWVudCBmZWF0dXJlcyB0aGF0IGV4dGVuZCB0aGUgZGVmYXVsdCBUYXNrIEdlbml1cyB2aWV3cyB3aXRoIGFkZGl0aW9uYWwgZnVuY3Rpb25hbGl0eS5cIixcclxuXHRcdGNhdGVnb3J5OiBcImFkdmFuY2VkXCJcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiBcImVuYWJsZS1iYXNlLXZpZXdcIixcclxuXHRcdHRhYklkOiBcImJldGEtdGVzdFwiLFxyXG5cdFx0bmFtZTogXCJFbmFibGUgQmFzZSBWaWV3XCIsXHJcblx0XHRkZXNjcmlwdGlvbjogXCJFbmFibGUgZXhwZXJpbWVudGFsIEJhc2UgVmlldyBmdW5jdGlvbmFsaXR5LiBUaGlzIGZlYXR1cmUgcHJvdmlkZXMgZW5oYW5jZWQgdmlldyBtYW5hZ2VtZW50IGNhcGFiaWxpdGllcyBidXQgbWF5IGJlIGFmZmVjdGVkIGJ5IGZ1dHVyZSBPYnNpZGlhbiBBUEkgY2hhbmdlcy4gWW91IG1heSBuZWVkIHRvIHJlc3RhcnQgT2JzaWRpYW4gdG8gc2VlIHRoZSBjaGFuZ2VzLlwiLFxyXG5cdFx0a2V5d29yZHM6IFtcImVuYWJsZVwiLCBcImJhc2VcIiwgXCJ2aWV3XCIsIFwiZXhwZXJpbWVudGFsXCIsIFwiZnVuY3Rpb25hbGl0eVwiLCBcImVuaGFuY2VkXCIsIFwibWFuYWdlbWVudFwiLCBcImNhcGFiaWxpdGllc1wiXSxcclxuXHRcdHRyYW5zbGF0aW9uS2V5OiBcIkVuYWJsZSBCYXNlIFZpZXdcIixcclxuXHRcdGRlc2NyaXB0aW9uS2V5OiBcIkVuYWJsZSBleHBlcmltZW50YWwgQmFzZSBWaWV3IGZ1bmN0aW9uYWxpdHkuIFRoaXMgZmVhdHVyZSBwcm92aWRlcyBlbmhhbmNlZCB2aWV3IG1hbmFnZW1lbnQgY2FwYWJpbGl0aWVzIGJ1dCBtYXkgYmUgYWZmZWN0ZWQgYnkgZnV0dXJlIE9ic2lkaWFuIEFQSSBjaGFuZ2VzLiBZb3UgbWF5IG5lZWQgdG8gcmVzdGFydCBPYnNpZGlhbiB0byBzZWUgdGhlIGNoYW5nZXMuXCIsXHJcblx0XHRjYXRlZ29yeTogXCJhZHZhbmNlZFwiXHJcblx0fSxcclxuXHJcblx0Ly8gQWJvdXQgVGFiXHJcblx0e1xyXG5cdFx0aWQ6IFwiYWJvdXQtdGFzay1nZW5pdXNcIixcclxuXHRcdHRhYklkOiBcImFib3V0XCIsXHJcblx0XHRuYW1lOiBcIkFib3V0IFRhc2sgR2VuaXVzXCIsXHJcblx0XHRrZXl3b3JkczogW1wiYWJvdXRcIiwgXCJ0YXNrXCIsIFwiZ2VuaXVzXCJdLFxyXG5cdFx0dHJhbnNsYXRpb25LZXk6IFwiQWJvdXRcIixcclxuXHRcdGNhdGVnb3J5OiBcImluZm9cIlxyXG5cdH0sXHJcblx0e1xyXG5cdFx0aWQ6IFwidmVyc2lvblwiLFxyXG5cdFx0dGFiSWQ6IFwiYWJvdXRcIixcclxuXHRcdG5hbWU6IFwiVmVyc2lvblwiLFxyXG5cdFx0a2V5d29yZHM6IFtcInZlcnNpb25cIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJWZXJzaW9uXCIsXHJcblx0XHRjYXRlZ29yeTogXCJpbmZvXCJcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiBcImRvbmF0ZVwiLFxyXG5cdFx0dGFiSWQ6IFwiYWJvdXRcIixcclxuXHRcdG5hbWU6IFwiRG9uYXRlXCIsXHJcblx0XHRkZXNjcmlwdGlvbjogXCJJZiB5b3UgbGlrZSB0aGlzIHBsdWdpbiwgY29uc2lkZXIgZG9uYXRpbmcgdG8gc3VwcG9ydCBjb250aW51ZWQgZGV2ZWxvcG1lbnQ6XCIsXHJcblx0XHRrZXl3b3JkczogW1wiZG9uYXRlXCIsIFwicGx1Z2luXCIsIFwic3VwcG9ydFwiLCBcImRldmVsb3BtZW50XCJdLFxyXG5cdFx0dHJhbnNsYXRpb25LZXk6IFwiRG9uYXRlXCIsXHJcblx0XHRkZXNjcmlwdGlvbktleTogXCJJZiB5b3UgbGlrZSB0aGlzIHBsdWdpbiwgY29uc2lkZXIgZG9uYXRpbmcgdG8gc3VwcG9ydCBjb250aW51ZWQgZGV2ZWxvcG1lbnQ6XCIsXHJcblx0XHRjYXRlZ29yeTogXCJpbmZvXCJcclxuXHR9LFxyXG5cdHtcclxuXHRcdGlkOiBcImRvY3VtZW50YXRpb25cIixcclxuXHRcdHRhYklkOiBcImFib3V0XCIsXHJcblx0XHRuYW1lOiBcIkRvY3VtZW50YXRpb25cIixcclxuXHRcdGRlc2NyaXB0aW9uOiBcIlZpZXcgdGhlIGRvY3VtZW50YXRpb24gZm9yIHRoaXMgcGx1Z2luXCIsXHJcblx0XHRrZXl3b3JkczogW1wiZG9jdW1lbnRhdGlvblwiLCBcInZpZXdcIiwgXCJwbHVnaW5cIl0sXHJcblx0XHR0cmFuc2xhdGlvbktleTogXCJEb2N1bWVudGF0aW9uXCIsXHJcblx0XHRkZXNjcmlwdGlvbktleTogXCJWaWV3IHRoZSBkb2N1bWVudGF0aW9uIGZvciB0aGlzIHBsdWdpblwiLFxyXG5cdFx0Y2F0ZWdvcnk6IFwiaW5mb1wiXHJcblx0fSxcclxuXHR7XHJcblx0XHRpZDogXCJvbmJvYXJkaW5nXCIsXHJcblx0XHR0YWJJZDogXCJhYm91dFwiLFxyXG5cdFx0bmFtZTogXCJPbmJvYXJkaW5nXCIsXHJcblx0XHRkZXNjcmlwdGlvbjogXCJSZXN0YXJ0IHRoZSB3ZWxjb21lIGd1aWRlIGFuZCBzZXR1cCB3aXphcmRcIixcclxuXHRcdGtleXdvcmRzOiBbXCJvbmJvYXJkaW5nXCIsIFwicmVzdGFydFwiLCBcIndlbGNvbWVcIiwgXCJndWlkZVwiLCBcInNldHVwXCIsIFwid2l6YXJkXCJdLFxyXG5cdFx0dHJhbnNsYXRpb25LZXk6IFwiT25ib2FyZGluZ1wiLFxyXG5cdFx0ZGVzY3JpcHRpb25LZXk6IFwiUmVzdGFydCB0aGUgd2VsY29tZSBndWlkZSBhbmQgc2V0dXAgd2l6YXJkXCIsXHJcblx0XHRjYXRlZ29yeTogXCJpbmZvXCJcclxuXHR9XHJcbl07Il19