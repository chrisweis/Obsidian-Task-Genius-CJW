// Deprecated - use WorkspaceData from types/workspace.ts instead
export interface Workspace {
	id: string;
	name: string;
	color: string;
	settings?: WorkspaceSettings;
	isActive?: boolean;
}

export interface WorkspaceSettings {
	projectIds?: string[];
	filterConfigs?: Record<string, any>;
	viewPreferences?: Record<string, any>;
}

export interface V2ViewState {
	currentWorkspace: string;
	selectedProject?: string | null;
	viewMode: 'list' | 'kanban' | 'tree' | 'calendar';
	searchQuery?: string;
	filterInputValue?: string;
	filters?: any;
}

export type V2NavigationItem = {
	id: string;
	label: string;
	icon: string;
	type: 'primary' | 'project' | 'other';
	action?: () => void;
	badge?: number;
};

export interface V2ViewConfig {
	enableWorkspaces: boolean;
	defaultWorkspace?: string;
	showTopNavigation: boolean;
	showNewSidebar: boolean;
	allowViewSwitching: boolean;
	persistViewMode: boolean;
}
