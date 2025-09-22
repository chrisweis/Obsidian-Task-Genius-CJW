import type { App, EventRef } from "obsidian";
import { emit as coreEmit, on as coreOn, Seq } from "../../../dataflow/events/Events";

export const UIEvents = {
	WORKSPACE_SWITCHED: "task-genius:ui-workspace-switched",
	WORKSPACE_OVERRIDES_SAVED: "task-genius:ui-workspace-overrides-saved",
	WORKSPACE_RESET: "task-genius:ui-workspace-reset",
	DEFAULT_WORKSPACE_CHANGED: "task-genius:ui-default-workspace-changed",
	WORKSPACE_CREATED: "task-genius:ui-workspace-created",
	WORKSPACE_DELETED: "task-genius:ui-workspace-deleted",
	WORKSPACE_RENAMED: "task-genius:ui-workspace-renamed"
} as const;

export interface WorkspaceEventPayload {
	workspaceId: string;
	seq: number;
	changedKeys?: string[];
	baseId?: string; // For cloned workspaces
	newName?: string; // For rename events
}

// Event emitters
export const emitWorkspaceSwitched = (app: App, workspaceId: string) => {
	coreEmit(app, UIEvents.WORKSPACE_SWITCHED, {
		workspaceId,
		seq: Seq.next()
	} as WorkspaceEventPayload);
};

export const emitWorkspaceOverridesSaved = (app: App, workspaceId: string, changedKeys?: string[]) => {
	coreEmit(app, UIEvents.WORKSPACE_OVERRIDES_SAVED, {
		workspaceId,
		changedKeys,
		seq: Seq.next()
	} as WorkspaceEventPayload);
};

export const emitWorkspaceReset = (app: App, workspaceId: string) => {
	coreEmit(app, UIEvents.WORKSPACE_RESET, {
		workspaceId,
		seq: Seq.next()
	} as WorkspaceEventPayload);
};

export const emitDefaultWorkspaceChanged = (app: App, workspaceId: string) => {
	coreEmit(app, UIEvents.DEFAULT_WORKSPACE_CHANGED, {
		workspaceId,
		seq: Seq.next()
	} as WorkspaceEventPayload);
};

export const emitWorkspaceCreated = (app: App, workspaceId: string, baseId?: string) => {
	coreEmit(app, UIEvents.WORKSPACE_CREATED, {
		workspaceId,
		baseId,
		seq: Seq.next()
	} as WorkspaceEventPayload);
};

export const emitWorkspaceDeleted = (app: App, workspaceId: string) => {
	coreEmit(app, UIEvents.WORKSPACE_DELETED, {
		workspaceId,
		seq: Seq.next()
	} as WorkspaceEventPayload);
};

export const emitWorkspaceRenamed = (app: App, workspaceId: string, newName: string) => {
	coreEmit(app, UIEvents.WORKSPACE_RENAMED, {
		workspaceId,
		newName,
		seq: Seq.next()
	} as WorkspaceEventPayload);
};

// Event subscribers
export const onWorkspaceSwitched = (app: App, handler: (payload: WorkspaceEventPayload) => void): EventRef => {
	return coreOn(app, UIEvents.WORKSPACE_SWITCHED, handler);
};

export const onWorkspaceOverridesSaved = (app: App, handler: (payload: WorkspaceEventPayload) => void): EventRef => {
	return coreOn(app, UIEvents.WORKSPACE_OVERRIDES_SAVED, handler);
};

export const onWorkspaceReset = (app: App, handler: (payload: WorkspaceEventPayload) => void): EventRef => {
	return coreOn(app, UIEvents.WORKSPACE_RESET, handler);
};

export const onDefaultWorkspaceChanged = (app: App, handler: (payload: WorkspaceEventPayload) => void): EventRef => {
	return coreOn(app, UIEvents.DEFAULT_WORKSPACE_CHANGED, handler);
};

export const onWorkspaceCreated = (app: App, handler: (payload: WorkspaceEventPayload) => void): EventRef => {
	return coreOn(app, UIEvents.WORKSPACE_CREATED, handler);
};

export const onWorkspaceDeleted = (app: App, handler: (payload: WorkspaceEventPayload) => void): EventRef => {
	return coreOn(app, UIEvents.WORKSPACE_DELETED, handler);
};

export const onWorkspaceRenamed = (app: App, handler: (payload: WorkspaceEventPayload) => void): EventRef => {
	return coreOn(app, UIEvents.WORKSPACE_RENAMED, handler);
};