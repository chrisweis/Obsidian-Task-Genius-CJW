export interface WorkspaceData {
	id: string;
	name: string;
	color?: string;
	updatedAt: number;
	order?: number;
	settings: WorkspaceOverrides; // Empty for Default workspace
}

export interface WorkspaceOverrides {
	// View display settings
	filters?: any;
	sort?: any;
	group?: any;
	columns?: any;
	viewMode?: string;

	// Calendar settings
	calendar?: any;

	// Kanban settings
	kanban?: any;

	// Gantt settings
	gantt?: any;

	// Other display-related settings
	displayOptions?: any;
	viewConfiguration?: any;
	taskListDisplayOption?: any;
	forecastOption?: any;
	customProjectGroupsAndNames?: any;
	tagCustomOrder?: any;

	// V2 filter state per view
	v2FilterState?: Record<string, {
		filters?: any;
		searchQuery?: string;
		selectedProject?: string | null;
		advancedFilter?: any;
		viewMode?: string;
	}>;
}

export interface WorkspacesConfig {
	version: number;
	defaultWorkspaceId: string;
	activeWorkspaceId?: string;
	order: string[]; // Workspace IDs in display order
	byId: Record<string, WorkspaceData>;
}

export interface EffectiveSettings {
	// Merged result of global + workspace overrides
	[key: string]: any;
}

// Keys that can be overridden per workspace
export const WORKSPACE_SCOPED_KEYS = [
	'filters',
	'sort',
	'group',
	'columns',
	'viewMode',
	'calendar',
	'kanban',
	'gantt',
	'displayOptions',
	'viewConfiguration',
	'taskListDisplayOption',
	'forecastOption',
	'customProjectGroupsAndNames',
	'tagCustomOrder',
	'v2FilterState'
] as const;

export type WorkspaceScopedKey = typeof WORKSPACE_SCOPED_KEYS[number];

// Global-only keys (cannot be overridden)
export const GLOBAL_ONLY_KEYS = [
	'autoRun',
	'lang',
	'experimental',
	'appearance',
	'hotkeys',
	'quickCapture',
	'workflow',
	'habit',
	'reward',
	'integrations',
	'editorExtensions'
] as const;

export type GlobalOnlyKey = typeof GLOBAL_ONLY_KEYS[number];