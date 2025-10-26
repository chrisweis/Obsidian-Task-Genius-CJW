import { __awaiter } from "tslib";
import { Notice } from "obsidian";
import { WORKSPACE_SCOPED_KEYS, } from "@/types/workspace";
import { emitDefaultWorkspaceChanged, emitWorkspaceCreated, emitWorkspaceDeleted, emitWorkspaceOverridesSaved, emitWorkspaceRenamed, emitWorkspaceReset, emitWorkspaceSwitched, } from "@/components/features/fluent/events/ui-event";
import { emit, Events } from "@/dataflow/events/Events";
export class WorkspaceManager {
    constructor(plugin) {
        this.effectiveCache = new Map();
        this.plugin = plugin;
        this.app = plugin.app;
    }
    // Get the workspace configuration, initializing if needed
    getWorkspacesConfig() {
        if (!this.plugin.settings.workspaces) {
            return this.initializeWorkspaces();
        }
        return this.plugin.settings.workspaces;
    }
    // Initialize workspace system
    initializeWorkspaces() {
        const defaultId = this.generateId();
        this.plugin.settings.workspaces = {
            version: 2,
            defaultWorkspaceId: defaultId,
            activeWorkspaceId: defaultId,
            order: [defaultId],
            byId: {
                [defaultId]: {
                    id: defaultId,
                    name: "Default",
                    updatedAt: Date.now(),
                    settings: {}, // Default workspace has no overrides
                },
            },
        };
        return this.plugin.settings.workspaces;
    }
    // Ensure default workspace invariants
    ensureDefaultWorkspaceInvariant() {
        const config = this.getWorkspacesConfig();
        // Ensure default workspace exists
        if (!config.defaultWorkspaceId ||
            !config.byId[config.defaultWorkspaceId]) {
            const defaultId = this.generateId();
            config.defaultWorkspaceId = defaultId;
            config.byId[defaultId] = {
                id: defaultId,
                name: "Default",
                updatedAt: Date.now(),
                settings: {},
            };
            if (!config.order.includes(defaultId)) {
                config.order.unshift(defaultId);
            }
        }
        // Ensure default workspace has no overrides
        const defaultWs = config.byId[config.defaultWorkspaceId];
        if (defaultWs.settings && Object.keys(defaultWs.settings).length > 0) {
            // Merge any overrides into global settings and clear
            this.mergeIntoGlobal(defaultWs.settings);
            defaultWs.settings = {};
        }
        // Ensure active workspace exists
        if (!config.activeWorkspaceId ||
            !config.byId[config.activeWorkspaceId]) {
            config.activeWorkspaceId = config.defaultWorkspaceId;
        }
    }
    // Merge workspace overrides into global settings
    mergeIntoGlobal(overrides) {
        for (const key of Object.keys(overrides)) {
            if (WORKSPACE_SCOPED_KEYS.includes(key)) {
                this.plugin.settings[key] = structuredClone(overrides[key]);
            }
        }
    }
    // Generate effective settings for a workspace
    getEffectiveSettings(workspaceId) {
        const config = this.getWorkspacesConfig();
        const id = workspaceId ||
            config.activeWorkspaceId ||
            config.defaultWorkspaceId;
        // Return from cache if available
        console.log("[TG-WORKSPACE] getEffectiveSettings:start", {
            requestId: workspaceId || null,
            configActive: config.activeWorkspaceId,
            defaultId: config.defaultWorkspaceId,
            resolvedId: id,
            cached: this.effectiveCache.has(id),
        });
        if (this.effectiveCache.has(id)) {
            return this.effectiveCache.get(id);
        }
        // Build effective settings
        const workspace = config.byId[id];
        if (!workspace) {
            // Fallback to default if workspace doesn't exist
            return this.getEffectiveSettings(config.defaultWorkspaceId);
        }
        // Start with global settings, but DO NOT inherit fluentFilterState from global (workspace-scoped)
        const effective = Object.assign({}, this.plugin.settings);
        // Explicitly drop any global fluentFilterState to avoid cross-workspace leakage
        effective.fluentFilterState = undefined;
        // Apply workspace overrides if not default
        if (id !== config.defaultWorkspaceId && workspace.settings) {
            for (const key of WORKSPACE_SCOPED_KEYS) {
                if (workspace.settings[key] !== undefined) {
                    effective[key] = structuredClone(workspace.settings[key]);
                }
            }
        }
        // Always apply fluentFilterState from workspace settings (including default)
        if (workspace.settings &&
            workspace.settings.fluentFilterState !== undefined) {
            effective.fluentFilterState = structuredClone(workspace.settings.fluentFilterState);
        }
        // Cache the result
        this.effectiveCache.set(id, effective);
        return effective;
    }
    // Calculate overrides from effective settings
    toOverrides(effective) {
        const overrides = {};
        for (const key of WORKSPACE_SCOPED_KEYS) {
            const effValue = effective[key];
            const globalValue = this.plugin.settings[key];
            // fluentFilterState is workspace-only. Always persist it per-workspace when defined.
            if (key === "fluentFilterState") {
                if (effValue !== undefined) {
                    overrides[key] = structuredClone(effValue);
                }
                continue;
            }
            if (JSON.stringify(effValue) !== JSON.stringify(globalValue)) {
                overrides[key] = structuredClone(effValue);
            }
        }
        return overrides;
    }
    // Normalize overrides (remove ones identical to global)
    normalizeOverrides() {
        const config = this.getWorkspacesConfig();
        for (const id of config.order) {
            if (id === config.defaultWorkspaceId)
                continue;
            const workspace = config.byId[id];
            if (!workspace.settings)
                continue;
            for (const key of WORKSPACE_SCOPED_KEYS) {
                if (workspace.settings[key] !== undefined) {
                    const globalValue = this.plugin.settings[key];
                    if (JSON.stringify(workspace.settings[key]) ===
                        JSON.stringify(globalValue)) {
                        delete workspace.settings[key];
                    }
                }
            }
        }
    }
    // Clear the effective cache
    clearCache() {
        this.effectiveCache.clear();
    }
    // Get all workspaces
    getAllWorkspaces() {
        const config = this.getWorkspacesConfig();
        return config.order
            .map((id) => config.byId[id])
            .filter((ws) => ws !== undefined);
    }
    // Get workspace by ID
    getWorkspace(id) {
        const config = this.getWorkspacesConfig();
        return config.byId[id];
    }
    // Get active workspace
    getActiveWorkspace() {
        const config = this.getWorkspacesConfig();
        const activeId = config.activeWorkspaceId || config.defaultWorkspaceId;
        return config.byId[activeId] || config.byId[config.defaultWorkspaceId];
    }
    // Set active workspace
    setActiveWorkspace(workspaceId) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            console.log("[TG-WORKSPACE] setActiveWorkspace:start", {
                from: (_a = this.getActiveWorkspace()) === null || _a === void 0 ? void 0 : _a.id,
                to: workspaceId,
            });
            const config = this.getWorkspacesConfig();
            if (!config.byId[workspaceId]) {
                new Notice(`Workspace not found. Using default workspace.`);
                workspaceId = config.defaultWorkspaceId;
            }
            if (config.activeWorkspaceId === workspaceId) {
                console.log("[TG-WORKSPACE] setActiveWorkspace:noop (already active)", { id: workspaceId });
                return; // Already active
            }
            config.activeWorkspaceId = workspaceId;
            this.clearCache();
            yield this.plugin.saveSettings();
            console.log("[TG-WORKSPACE] setActiveWorkspace:done", {
                active: config.activeWorkspaceId,
            });
            emitWorkspaceSwitched(this.app, workspaceId);
        });
    }
    // Create new workspace (cloned from current or default)
    createWorkspace(name, baseWorkspaceId, icon) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = this.getWorkspacesConfig();
            const id = this.generateId();
            // Use current active workspace as base if not specified
            const baseId = baseWorkspaceId ||
                config.activeWorkspaceId ||
                config.defaultWorkspaceId;
            const baseWorkspace = config.byId[baseId];
            // Clone settings from base workspace (if not default)
            let settings = {};
            if (baseId !== config.defaultWorkspaceId && (baseWorkspace === null || baseWorkspace === void 0 ? void 0 : baseWorkspace.settings)) {
                settings = structuredClone(baseWorkspace.settings);
            }
            else if (baseId === config.defaultWorkspaceId) {
                // Creating from default means starting with current global values as-is
                settings = {};
            }
            const newWorkspace = {
                id,
                name,
                updatedAt: Date.now(),
                settings,
            };
            // Add icon if provided, otherwise inherit from base workspace if cloning
            if (icon) {
                newWorkspace.icon = icon;
            }
            else if ((baseWorkspace === null || baseWorkspace === void 0 ? void 0 : baseWorkspace.icon) &&
                baseId !== config.defaultWorkspaceId) {
                newWorkspace.icon = baseWorkspace.icon;
            }
            config.byId[id] = newWorkspace;
            config.order.push(id);
            yield this.plugin.saveSettings();
            emitWorkspaceCreated(this.app, id, baseId);
            return newWorkspace;
        });
    }
    // Delete workspace
    deleteWorkspace(workspaceId) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = this.getWorkspacesConfig();
            // Cannot delete default workspace
            if (workspaceId === config.defaultWorkspaceId) {
                new Notice("Cannot delete the default workspace");
                return;
            }
            if (!config.byId[workspaceId]) {
                return; // Already doesn't exist
            }
            // Remove from config
            delete config.byId[workspaceId];
            const orderIndex = config.order.indexOf(workspaceId);
            if (orderIndex !== -1) {
                config.order.splice(orderIndex, 1);
            }
            // If this was the active workspace, switch to default
            if (config.activeWorkspaceId === workspaceId) {
                config.activeWorkspaceId = config.defaultWorkspaceId;
                emitWorkspaceSwitched(this.app, config.defaultWorkspaceId);
            }
            this.clearCache();
            yield this.plugin.saveSettings();
            emitWorkspaceDeleted(this.app, workspaceId);
        });
    }
    // Rename workspace
    renameWorkspace(workspaceId, newName, icon) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = this.getWorkspacesConfig();
            const workspace = config.byId[workspaceId];
            if (!workspace) {
                return;
            }
            workspace.name = newName;
            if (icon !== undefined) {
                workspace.icon = icon;
            }
            workspace.updatedAt = Date.now();
            yield this.plugin.saveSettings();
            emitWorkspaceRenamed(this.app, workspaceId, newName);
        });
    }
    // Save overrides for a workspace
    saveOverrides(workspaceId, effective) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = this.getWorkspacesConfig();
            // Cannot save overrides to default workspace
            if (workspaceId === config.defaultWorkspaceId) {
                // For default, write directly to global settings EXCEPT fluentFilterState which is workspace-only
                const changedKeys = [];
                for (const key of WORKSPACE_SCOPED_KEYS) {
                    if (effective[key] !== undefined &&
                        key !== "fluentFilterState") {
                        this.plugin.settings[key] = structuredClone(effective[key]);
                        changedKeys.push(key);
                    }
                }
                // Handle fluentFilterState specially for default workspace
                if (effective.fluentFilterState !== undefined) {
                    const ws = config.byId[workspaceId];
                    ws.settings = (ws.settings || {});
                    ws.settings.fluentFilterState = structuredClone(effective.fluentFilterState);
                    ws.updatedAt = Date.now();
                    changedKeys.push("fluentFilterState");
                }
                console.log("[TG-WORKSPACE] saveOverrides(default)", {
                    workspaceId,
                    changedKeys,
                });
                this.clearCache();
                yield this.plugin.saveSettings();
                // Emit overrides saved for UI to react; also emit SETTINGS_CHANGED for global changes
                emitWorkspaceOverridesSaved(this.app, workspaceId, changedKeys.length ? changedKeys : undefined);
                emit(this.app, Events.SETTINGS_CHANGED);
                return;
            }
            const workspace = config.byId[workspaceId];
            if (!workspace) {
                return;
            }
            // Calculate overrides
            const overrides = this.toOverrides(effective);
            const changedKeys = Object.keys(overrides);
            console.log("[TG-WORKSPACE] saveOverrides", {
                workspaceId,
                changedKeys,
            });
            workspace.settings = overrides;
            workspace.updatedAt = Date.now();
            this.clearCache();
            yield this.plugin.saveSettings();
            emitWorkspaceOverridesSaved(this.app, workspaceId, changedKeys);
            emit(this.app, Events.SETTINGS_CHANGED);
        });
    }
    // Save overrides quietly without triggering SETTINGS_CHANGED event
    saveOverridesQuietly(workspaceId, effective) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = this.getWorkspacesConfig();
            // Cannot save overrides to default workspace
            if (workspaceId === config.defaultWorkspaceId) {
                // For default, write directly to global settings EXCEPT fluentFilterState which is workspace-only
                for (const key of WORKSPACE_SCOPED_KEYS) {
                    if (effective[key] !== undefined &&
                        key !== "fluentFilterState") {
                        this.plugin.settings[key] = structuredClone(effective[key]);
                    }
                }
                // Handle fluentFilterState specially for default workspace (store under workspace.settings)
                if (effective.fluentFilterState !== undefined) {
                    const ws = config.byId[workspaceId];
                    ws.settings = (ws.settings || {});
                    ws.settings.fluentFilterState = structuredClone(effective.fluentFilterState);
                    ws.updatedAt = Date.now();
                }
                console.log("[TG-WORKSPACE] saveOverridesQuietly(default)", {
                    workspaceId,
                    keys: WORKSPACE_SCOPED_KEYS.filter((k) => effective[k] !== undefined),
                });
                this.clearCache();
                yield this.plugin.saveSettings();
                return;
            }
            const workspace = config.byId[workspaceId];
            if (!workspace) {
                return;
            }
            // Calculate overrides
            const overrides = this.toOverrides(effective);
            console.log("[TG-WORKSPACE] saveOverridesQuietly", {
                workspaceId,
                keys: Object.keys(overrides),
            });
            workspace.settings = overrides;
            workspace.updatedAt = Date.now();
            this.clearCache();
            yield this.plugin.saveSettings();
            // Don't emit events to avoid triggering reload loops
        });
    }
    // Reset workspace overrides
    resetOverrides(workspaceId) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = this.getWorkspacesConfig();
            // Cannot reset default workspace
            if (workspaceId === config.defaultWorkspaceId) {
                return;
            }
            const workspace = config.byId[workspaceId];
            if (!workspace) {
                return;
            }
            workspace.settings = {};
            workspace.updatedAt = Date.now();
            this.clearCache();
            yield this.plugin.saveSettings();
            emitWorkspaceReset(this.app, workspaceId);
            emit(this.app, Events.SETTINGS_CHANGED);
        });
    }
    // Set default workspace (change which one is default)
    setDefaultWorkspace(workspaceId) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = this.getWorkspacesConfig();
            if (!config.byId[workspaceId]) {
                return;
            }
            if (config.defaultWorkspaceId === workspaceId) {
                return; // Already default
            }
            // The old default workspace needs to get current global settings as overrides
            // The new default workspace's overrides become the new global settings
            const oldDefaultId = config.defaultWorkspaceId;
            const newDefaultWorkspace = config.byId[workspaceId];
            // Save current global as overrides for old default
            const currentGlobalAsOverrides = {};
            for (const key of WORKSPACE_SCOPED_KEYS) {
                const globalValue = this.plugin.settings[key];
                if (globalValue !== undefined) {
                    currentGlobalAsOverrides[key] = structuredClone(globalValue);
                }
            }
            // Apply new default's overrides to global
            if (newDefaultWorkspace.settings) {
                this.mergeIntoGlobal(newDefaultWorkspace.settings);
            }
            // Set old default's overrides
            config.byId[oldDefaultId].settings = currentGlobalAsOverrides;
            // Clear new default's overrides
            newDefaultWorkspace.settings = {};
            // Update default ID
            config.defaultWorkspaceId = workspaceId;
            // Normalize all overrides
            this.normalizeOverrides();
            this.clearCache();
            yield this.plugin.saveSettings();
            emitDefaultWorkspaceChanged(this.app, workspaceId);
            emit(this.app, Events.SETTINGS_CHANGED);
        });
    }
    // Generate unique ID
    generateId() {
        return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    // Migrate from v1 to v2
    migrateToV2() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (((_a = this.plugin.settings.workspaces) === null || _a === void 0 ? void 0 : _a.version) === 2) {
                return; // Already v2
            }
            // Initialize v2 structure
            this.initializeWorkspaces();
            this.ensureDefaultWorkspaceInvariant();
            // If there were v1 workspaces, migrate them
            // (This is a placeholder - implement based on actual v1 structure)
            yield this.plugin.saveSettings();
        });
    }
    // Reorder workspaces
    reorderWorkspaces(newOrder) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = this.getWorkspacesConfig();
            // Validate that all IDs exist and default is first
            const validOrder = newOrder.filter((id) => config.byId[id]);
            // Ensure default is always first
            const defaultIndex = validOrder.indexOf(config.defaultWorkspaceId);
            if (defaultIndex > 0) {
                validOrder.splice(defaultIndex, 1);
                validOrder.unshift(config.defaultWorkspaceId);
            }
            else if (defaultIndex === -1) {
                validOrder.unshift(config.defaultWorkspaceId);
            }
            config.order = validOrder;
            yield this.plugin.saveSettings();
        });
    }
    // Check if a workspace is the default
    isDefaultWorkspace(workspaceId) {
        const config = this.getWorkspacesConfig();
        return workspaceId === config.defaultWorkspaceId;
    }
    // Export workspace configuration
    exportWorkspace(workspaceId) {
        const workspace = this.getWorkspace(workspaceId);
        if (!workspace)
            return null;
        const exportData = {
            name: workspace.name,
            settings: workspace.settings,
            exportedAt: Date.now(),
            version: 1,
        };
        return JSON.stringify(exportData, null, 2);
    }
    // Import workspace configuration
    importWorkspace(jsonData, name) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const importData = JSON.parse(jsonData);
                const workspaceName = name || importData.name || "Imported Workspace";
                const settings = importData.settings || {};
                const newWorkspace = yield this.createWorkspace(workspaceName);
                newWorkspace.settings = settings;
                yield this.plugin.saveSettings();
                return newWorkspace;
            }
            catch (e) {
                new Notice("Failed to import workspace configuration");
                console.error("Workspace import error:", e);
                return null;
            }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV29ya3NwYWNlTWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIldvcmtzcGFjZU1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBTyxNQUFNLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDdkMsT0FBTyxFQUVOLHFCQUFxQixHQUlyQixNQUFNLG1CQUFtQixDQUFDO0FBQzNCLE9BQU8sRUFDTiwyQkFBMkIsRUFDM0Isb0JBQW9CLEVBQ3BCLG9CQUFvQixFQUNwQiwyQkFBMkIsRUFDM0Isb0JBQW9CLEVBQ3BCLGtCQUFrQixFQUNsQixxQkFBcUIsR0FDckIsTUFBTSw4Q0FBOEMsQ0FBQztBQUN0RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBSXhELE1BQU0sT0FBTyxnQkFBZ0I7SUFLNUIsWUFBWSxNQUE2QjtRQUZqQyxtQkFBYyxHQUFtQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBR2xFLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQztJQUN2QixDQUFDO0lBRUQsMERBQTBEO0lBQ2xELG1CQUFtQjtRQUMxQixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFO1lBQ3JDLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7U0FDbkM7UUFDRCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQztJQUN4QyxDQUFDO0lBRUQsOEJBQThCO0lBQ3RCLG9CQUFvQjtRQUMzQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDcEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxHQUFHO1lBQ2pDLE9BQU8sRUFBRSxDQUFDO1lBQ1Ysa0JBQWtCLEVBQUUsU0FBUztZQUM3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LFNBQVMsQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRCxpQ0FBaUM7SUFDcEIsZUFBZSxDQUMzQixRQUFnQixFQUNoQixJQUFhOztZQUViLElBQUk7Z0JBQ0gsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDeEMsTUFBTSxhQUFhLEdBQ2xCLElBQUksSUFBSSxVQUFVLENBQUMsSUFBSSxJQUFJLG9CQUFvQixDQUFDO2dCQUNqRCxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBQztnQkFFM0MsTUFBTSxZQUFZLEdBQUcsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUMvRCxZQUFZLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztnQkFFakMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUNqQyxPQUFPLFlBQVksQ0FBQzthQUNwQjtZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNYLElBQUksTUFBTSxDQUFDLDBDQUEwQyxDQUFDLENBQUM7Z0JBQ3ZELE9BQU8sQ0FBQyxLQUFLLENBQUMseUJBQXlCLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzVDLE9BQU8sSUFBSSxDQUFDO2FBQ1o7UUFDRixDQUFDO0tBQUE7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcCwgTm90aWNlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7XHJcblx0RWZmZWN0aXZlU2V0dGluZ3MsXHJcblx0V09SS1NQQUNFX1NDT1BFRF9LRVlTLFxyXG5cdFdvcmtzcGFjZURhdGEsXHJcblx0V29ya3NwYWNlT3ZlcnJpZGVzLFxyXG5cdFdvcmtzcGFjZXNDb25maWcsXHJcbn0gZnJvbSBcIkAvdHlwZXMvd29ya3NwYWNlXCI7XHJcbmltcG9ydCB7XHJcblx0ZW1pdERlZmF1bHRXb3Jrc3BhY2VDaGFuZ2VkLFxyXG5cdGVtaXRXb3Jrc3BhY2VDcmVhdGVkLFxyXG5cdGVtaXRXb3Jrc3BhY2VEZWxldGVkLFxyXG5cdGVtaXRXb3Jrc3BhY2VPdmVycmlkZXNTYXZlZCxcclxuXHRlbWl0V29ya3NwYWNlUmVuYW1lZCxcclxuXHRlbWl0V29ya3NwYWNlUmVzZXQsXHJcblx0ZW1pdFdvcmtzcGFjZVN3aXRjaGVkLFxyXG59IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvZmx1ZW50L2V2ZW50cy91aS1ldmVudFwiO1xyXG5pbXBvcnQgeyBlbWl0LCBFdmVudHMgfSBmcm9tIFwiQC9kYXRhZmxvdy9ldmVudHMvRXZlbnRzXCI7XHJcbmltcG9ydCB0eXBlIFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5pbXBvcnQgeyBUYXNrUHJvZ3Jlc3NCYXJTZXR0aW5ncyB9IGZyb20gXCJAL2NvbW1vbi9zZXR0aW5nLWRlZmluaXRpb25cIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBXb3Jrc3BhY2VNYW5hZ2VyIHtcclxuXHRwcml2YXRlIGFwcDogQXBwO1xyXG5cdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblx0cHJpdmF0ZSBlZmZlY3RpdmVDYWNoZTogTWFwPHN0cmluZywgRWZmZWN0aXZlU2V0dGluZ3M+ID0gbmV3IE1hcCgpO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbikge1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0XHR0aGlzLmFwcCA9IHBsdWdpbi5hcHA7XHJcblx0fVxyXG5cclxuXHQvLyBHZXQgdGhlIHdvcmtzcGFjZSBjb25maWd1cmF0aW9uLCBpbml0aWFsaXppbmcgaWYgbmVlZGVkXHJcblx0cHJpdmF0ZSBnZXRXb3Jrc3BhY2VzQ29uZmlnKCk6IFdvcmtzcGFjZXNDb25maWcge1xyXG5cdFx0aWYgKCF0aGlzLnBsdWdpbi5zZXR0aW5ncy53b3Jrc3BhY2VzKSB7XHJcblx0XHRcdHJldHVybiB0aGlzLmluaXRpYWxpemVXb3Jrc3BhY2VzKCk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGhpcy5wbHVnaW4uc2V0dGluZ3Mud29ya3NwYWNlcztcclxuXHR9XHJcblxyXG5cdC8vIEluaXRpYWxpemUgd29ya3NwYWNlIHN5c3RlbVxyXG5cdHByaXZhdGUgaW5pdGlhbGl6ZVdvcmtzcGFjZXMoKTogV29ya3NwYWNlc0NvbmZpZyB7XHJcblx0XHRjb25zdCBkZWZhdWx0SWQgPSB0aGlzLmdlbmVyYXRlSWQoKTtcclxuXHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLndvcmtzcGFjZXMgPSB7XHJcblx0XHRcdHZlcnNpb246IDIsXHJcblx0XHRcdGRlZmF1bHRXb3Jrc3BhY2VJZDogZGVmYXVsdElkLFxyXG5cdFx0XHRhY3RpdmVXb3Jrc3BhY2VJZDogZGVmYXVsdElkLFxyXG5cdFx0XHRvcmRlcjogW2RlZmF1bHRJZF0sXHJcblx0XHRcdGJ5SWQ6IHtcclxuXHRcdFx0XHRbZGVmYXVsdElkXToge1xyXG5cdFx0XHRcdFx0aWQ6IGRlZmF1bHRJZCxcclxuXHRcdFx0XHRcdG5hbWU6IFwiRGVmYXVsdFwiLFxyXG5cdFx0XHRcdFx0dXBkYXRlZEF0OiBEYXRlLm5vdygpLFxyXG5cdFx0XHRcdFx0c2V0dGluZ3M6IHt9LCAvLyBEZWZhdWx0IHdvcmtzcGFjZSBoYXMgbm8gb3ZlcnJpZGVzXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSxcclxuXHRcdH07XHJcblx0XHRyZXR1cm4gdGhpcy5wbHVnaW4uc2V0dGluZ3Mud29ya3NwYWNlcztcclxuXHR9XHJcblxyXG5cdC8vIEVuc3VyZSBkZWZhdWx0IHdvcmtzcGFjZSBpbnZhcmlhbnRzXHJcblx0cHVibGljIGVuc3VyZURlZmF1bHRXb3Jrc3BhY2VJbnZhcmlhbnQoKTogdm9pZCB7XHJcblx0XHRjb25zdCBjb25maWcgPSB0aGlzLmdldFdvcmtzcGFjZXNDb25maWcoKTtcclxuXHJcblx0XHQvLyBFbnN1cmUgZGVmYXVsdCB3b3Jrc3BhY2UgZXhpc3RzXHJcblx0XHRpZiAoXHJcblx0XHRcdCFjb25maWcuZGVmYXVsdFdvcmtzcGFjZUlkIHx8XHJcblx0XHRcdCFjb25maWcuYnlJZFtjb25maWcuZGVmYXVsdFdvcmtzcGFjZUlkXVxyXG5cdFx0KSB7XHJcblx0XHRcdGNvbnN0IGRlZmF1bHRJZCA9IHRoaXMuZ2VuZXJhdGVJZCgpO1xyXG5cdFx0XHRjb25maWcuZGVmYXVsdFdvcmtzcGFjZUlkID0gZGVmYXVsdElkO1xyXG5cdFx0XHRjb25maWcuYnlJZFtkZWZhdWx0SWRdID0ge1xyXG5cdFx0XHRcdGlkOiBkZWZhdWx0SWQsXHJcblx0XHRcdFx0bmFtZTogXCJEZWZhdWx0XCIsXHJcblx0XHRcdFx0dXBkYXRlZEF0OiBEYXRlLm5vdygpLFxyXG5cdFx0XHRcdHNldHRpbmdzOiB7fSxcclxuXHRcdFx0fTtcclxuXHRcdFx0aWYgKCFjb25maWcub3JkZXIuaW5jbHVkZXMoZGVmYXVsdElkKSkge1xyXG5cdFx0XHRcdGNvbmZpZy5vcmRlci51bnNoaWZ0KGRlZmF1bHRJZCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBFbnN1cmUgZGVmYXVsdCB3b3Jrc3BhY2UgaGFzIG5vIG92ZXJyaWRlc1xyXG5cdFx0Y29uc3QgZGVmYXVsdFdzID0gY29uZmlnLmJ5SWRbY29uZmlnLmRlZmF1bHRXb3Jrc3BhY2VJZF07XHJcblx0XHRpZiAoZGVmYXVsdFdzLnNldHRpbmdzICYmIE9iamVjdC5rZXlzKGRlZmF1bHRXcy5zZXR0aW5ncykubGVuZ3RoID4gMCkge1xyXG5cdFx0XHQvLyBNZXJnZSBhbnkgb3ZlcnJpZGVzIGludG8gZ2xvYmFsIHNldHRpbmdzIGFuZCBjbGVhclxyXG5cdFx0XHR0aGlzLm1lcmdlSW50b0dsb2JhbChkZWZhdWx0V3Muc2V0dGluZ3MpO1xyXG5cdFx0XHRkZWZhdWx0V3Muc2V0dGluZ3MgPSB7fTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBFbnN1cmUgYWN0aXZlIHdvcmtzcGFjZSBleGlzdHNcclxuXHRcdGlmIChcclxuXHRcdFx0IWNvbmZpZy5hY3RpdmVXb3Jrc3BhY2VJZCB8fFxyXG5cdFx0XHQhY29uZmlnLmJ5SWRbY29uZmlnLmFjdGl2ZVdvcmtzcGFjZUlkXVxyXG5cdFx0KSB7XHJcblx0XHRcdGNvbmZpZy5hY3RpdmVXb3Jrc3BhY2VJZCA9IGNvbmZpZy5kZWZhdWx0V29ya3NwYWNlSWQ7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBNZXJnZSB3b3Jrc3BhY2Ugb3ZlcnJpZGVzIGludG8gZ2xvYmFsIHNldHRpbmdzXHJcblx0cHJpdmF0ZSBtZXJnZUludG9HbG9iYWwob3ZlcnJpZGVzOiBXb3Jrc3BhY2VPdmVycmlkZXMpOiB2b2lkIHtcclxuXHRcdGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKG92ZXJyaWRlcykpIHtcclxuXHRcdFx0aWYgKFdPUktTUEFDRV9TQ09QRURfS0VZUy5pbmNsdWRlcyhrZXkgYXMgYW55KSkge1xyXG5cdFx0XHRcdCh0aGlzLnBsdWdpbi5zZXR0aW5ncyBhcyBhbnkpW2tleV0gPSBzdHJ1Y3R1cmVkQ2xvbmUoXHJcblx0XHRcdFx0XHRvdmVycmlkZXNba2V5IGFzIGtleW9mIFdvcmtzcGFjZU92ZXJyaWRlc11cclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBHZW5lcmF0ZSBlZmZlY3RpdmUgc2V0dGluZ3MgZm9yIGEgd29ya3NwYWNlXHJcblx0cHVibGljIGdldEVmZmVjdGl2ZVNldHRpbmdzKHdvcmtzcGFjZUlkPzogc3RyaW5nKTogRWZmZWN0aXZlU2V0dGluZ3Mge1xyXG5cdFx0Y29uc3QgY29uZmlnID0gdGhpcy5nZXRXb3Jrc3BhY2VzQ29uZmlnKCk7XHJcblx0XHRjb25zdCBpZCA9XHJcblx0XHRcdHdvcmtzcGFjZUlkIHx8XHJcblx0XHRcdGNvbmZpZy5hY3RpdmVXb3Jrc3BhY2VJZCB8fFxyXG5cdFx0XHRjb25maWcuZGVmYXVsdFdvcmtzcGFjZUlkO1xyXG5cclxuXHRcdC8vIFJldHVybiBmcm9tIGNhY2hlIGlmIGF2YWlsYWJsZVxyXG5cclxuXHRcdGNvbnNvbGUubG9nKFwiW1RHLVdPUktTUEFDRV0gZ2V0RWZmZWN0aXZlU2V0dGluZ3M6c3RhcnRcIiwge1xyXG5cdFx0XHRyZXF1ZXN0SWQ6IHdvcmtzcGFjZUlkIHx8IG51bGwsXHJcblx0XHRcdGNvbmZpZ0FjdGl2ZTogY29uZmlnLmFjdGl2ZVdvcmtzcGFjZUlkLFxyXG5cdFx0XHRkZWZhdWx0SWQ6IGNvbmZpZy5kZWZhdWx0V29ya3NwYWNlSWQsXHJcblx0XHRcdHJlc29sdmVkSWQ6IGlkLFxyXG5cdFx0XHRjYWNoZWQ6IHRoaXMuZWZmZWN0aXZlQ2FjaGUuaGFzKGlkKSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGlmICh0aGlzLmVmZmVjdGl2ZUNhY2hlLmhhcyhpZCkpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMuZWZmZWN0aXZlQ2FjaGUuZ2V0KGlkKSE7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQnVpbGQgZWZmZWN0aXZlIHNldHRpbmdzXHJcblx0XHRjb25zdCB3b3Jrc3BhY2UgPSBjb25maWcuYnlJZFtpZF07XHJcblx0XHRpZiAoIXdvcmtzcGFjZSkge1xyXG5cdFx0XHQvLyBGYWxsYmFjayB0byBkZWZhdWx0IGlmIHdvcmtzcGFjZSBkb2Vzbid0IGV4aXN0XHJcblx0XHRcdHJldHVybiB0aGlzLmdldEVmZmVjdGl2ZVNldHRpbmdzKGNvbmZpZy5kZWZhdWx0V29ya3NwYWNlSWQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFN0YXJ0IHdpdGggZ2xvYmFsIHNldHRpbmdzLCBidXQgRE8gTk9UIGluaGVyaXQgZmx1ZW50RmlsdGVyU3RhdGUgZnJvbSBnbG9iYWwgKHdvcmtzcGFjZS1zY29wZWQpXHJcblx0XHRjb25zdCBlZmZlY3RpdmU6IEVmZmVjdGl2ZVNldHRpbmdzID0geyAuLi50aGlzLnBsdWdpbi5zZXR0aW5ncyB9O1xyXG5cdFx0Ly8gRXhwbGljaXRseSBkcm9wIGFueSBnbG9iYWwgZmx1ZW50RmlsdGVyU3RhdGUgdG8gYXZvaWQgY3Jvc3Mtd29ya3NwYWNlIGxlYWthZ2VcclxuXHRcdChlZmZlY3RpdmUgYXMgYW55KS5mbHVlbnRGaWx0ZXJTdGF0ZSA9IHVuZGVmaW5lZDtcclxuXHJcblx0XHQvLyBBcHBseSB3b3Jrc3BhY2Ugb3ZlcnJpZGVzIGlmIG5vdCBkZWZhdWx0XHJcblx0XHRpZiAoaWQgIT09IGNvbmZpZy5kZWZhdWx0V29ya3NwYWNlSWQgJiYgd29ya3NwYWNlLnNldHRpbmdzKSB7XHJcblx0XHRcdGZvciAoY29uc3Qga2V5IG9mIFdPUktTUEFDRV9TQ09QRURfS0VZUykge1xyXG5cdFx0XHRcdGlmICh3b3Jrc3BhY2Uuc2V0dGluZ3Nba2V5XSAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0XHRlZmZlY3RpdmVba2V5XSA9IHN0cnVjdHVyZWRDbG9uZSh3b3Jrc3BhY2Uuc2V0dGluZ3Nba2V5XSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWx3YXlzIGFwcGx5IGZsdWVudEZpbHRlclN0YXRlIGZyb20gd29ya3NwYWNlIHNldHRpbmdzIChpbmNsdWRpbmcgZGVmYXVsdClcclxuXHRcdGlmIChcclxuXHRcdFx0d29ya3NwYWNlLnNldHRpbmdzICYmXHJcblx0XHRcdHdvcmtzcGFjZS5zZXR0aW5ncy5mbHVlbnRGaWx0ZXJTdGF0ZSAhPT0gdW5kZWZpbmVkXHJcblx0XHQpIHtcclxuXHRcdFx0ZWZmZWN0aXZlLmZsdWVudEZpbHRlclN0YXRlID0gc3RydWN0dXJlZENsb25lKFxyXG5cdFx0XHRcdHdvcmtzcGFjZS5zZXR0aW5ncy5mbHVlbnRGaWx0ZXJTdGF0ZVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENhY2hlIHRoZSByZXN1bHRcclxuXHRcdHRoaXMuZWZmZWN0aXZlQ2FjaGUuc2V0KGlkLCBlZmZlY3RpdmUpO1xyXG5cdFx0cmV0dXJuIGVmZmVjdGl2ZTtcclxuXHR9XHJcblxyXG5cdC8vIENhbGN1bGF0ZSBvdmVycmlkZXMgZnJvbSBlZmZlY3RpdmUgc2V0dGluZ3NcclxuXHRwcml2YXRlIHRvT3ZlcnJpZGVzKGVmZmVjdGl2ZTogRWZmZWN0aXZlU2V0dGluZ3MpOiBXb3Jrc3BhY2VPdmVycmlkZXMge1xyXG5cdFx0Y29uc3Qgb3ZlcnJpZGVzOiBXb3Jrc3BhY2VPdmVycmlkZXMgPSB7fTtcclxuXHJcblx0XHRmb3IgKGNvbnN0IGtleSBvZiBXT1JLU1BBQ0VfU0NPUEVEX0tFWVMpIHtcclxuXHRcdFx0Y29uc3QgZWZmVmFsdWUgPSAoZWZmZWN0aXZlIGFzIGFueSlba2V5XTtcclxuXHRcdFx0Y29uc3QgZ2xvYmFsVmFsdWUgPSAodGhpcy5wbHVnaW4uc2V0dGluZ3MgYXMgYW55KVtrZXldO1xyXG5cclxuXHRcdFx0Ly8gZmx1ZW50RmlsdGVyU3RhdGUgaXMgd29ya3NwYWNlLW9ubHkuIEFsd2F5cyBwZXJzaXN0IGl0IHBlci13b3Jrc3BhY2Ugd2hlbiBkZWZpbmVkLlxyXG5cdFx0XHRpZiAoa2V5ID09PSBcImZsdWVudEZpbHRlclN0YXRlXCIpIHtcclxuXHRcdFx0XHRpZiAoZWZmVmFsdWUgIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdFx0b3ZlcnJpZGVzW2tleV0gPSBzdHJ1Y3R1cmVkQ2xvbmUoZWZmVmFsdWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKEpTT04uc3RyaW5naWZ5KGVmZlZhbHVlKSAhPT0gSlNPTi5zdHJpbmdpZnkoZ2xvYmFsVmFsdWUpKSB7XHJcblx0XHRcdFx0b3ZlcnJpZGVzW2tleV0gPSBzdHJ1Y3R1cmVkQ2xvbmUoZWZmVmFsdWUpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIG92ZXJyaWRlcztcclxuXHR9XHJcblxyXG5cdC8vIE5vcm1hbGl6ZSBvdmVycmlkZXMgKHJlbW92ZSBvbmVzIGlkZW50aWNhbCB0byBnbG9iYWwpXHJcblx0cHJpdmF0ZSBub3JtYWxpemVPdmVycmlkZXMoKTogdm9pZCB7XHJcblx0XHRjb25zdCBjb25maWcgPSB0aGlzLmdldFdvcmtzcGFjZXNDb25maWcoKTtcclxuXHJcblx0XHRmb3IgKGNvbnN0IGlkIG9mIGNvbmZpZy5vcmRlcikge1xyXG5cdFx0XHRpZiAoaWQgPT09IGNvbmZpZy5kZWZhdWx0V29ya3NwYWNlSWQpIGNvbnRpbnVlO1xyXG5cclxuXHRcdFx0Y29uc3Qgd29ya3NwYWNlID0gY29uZmlnLmJ5SWRbaWRdO1xyXG5cdFx0XHRpZiAoIXdvcmtzcGFjZS5zZXR0aW5ncykgY29udGludWU7XHJcblxyXG5cdFx0XHRmb3IgKGNvbnN0IGtleSBvZiBXT1JLU1BBQ0VfU0NPUEVEX0tFWVMpIHtcclxuXHRcdFx0XHRpZiAod29ya3NwYWNlLnNldHRpbmdzW2tleV0gIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdFx0Y29uc3QgZ2xvYmFsVmFsdWUgPSAodGhpcy5wbHVnaW4uc2V0dGluZ3MgYXMgYW55KVtrZXldO1xyXG5cdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRKU09OLnN0cmluZ2lmeSh3b3Jrc3BhY2Uuc2V0dGluZ3Nba2V5XSkgPT09XHJcblx0XHRcdFx0XHRcdEpTT04uc3RyaW5naWZ5KGdsb2JhbFZhbHVlKVxyXG5cdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdGRlbGV0ZSB3b3Jrc3BhY2Uuc2V0dGluZ3Nba2V5XTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIENsZWFyIHRoZSBlZmZlY3RpdmUgY2FjaGVcclxuXHRwdWJsaWMgY2xlYXJDYWNoZSgpOiB2b2lkIHtcclxuXHRcdHRoaXMuZWZmZWN0aXZlQ2FjaGUuY2xlYXIoKTtcclxuXHR9XHJcblxyXG5cdC8vIEdldCBhbGwgd29ya3NwYWNlc1xyXG5cdHB1YmxpYyBnZXRBbGxXb3Jrc3BhY2VzKCk6IFdvcmtzcGFjZURhdGFbXSB7XHJcblx0XHRjb25zdCBjb25maWcgPSB0aGlzLmdldFdvcmtzcGFjZXNDb25maWcoKTtcclxuXHRcdHJldHVybiBjb25maWcub3JkZXJcclxuXHRcdFx0Lm1hcCgoaWQpID0+IGNvbmZpZy5ieUlkW2lkXSlcclxuXHRcdFx0LmZpbHRlcigod3MpID0+IHdzICE9PSB1bmRlZmluZWQpO1xyXG5cdH1cclxuXHJcblx0Ly8gR2V0IHdvcmtzcGFjZSBieSBJRFxyXG5cdHB1YmxpYyBnZXRXb3Jrc3BhY2UoaWQ6IHN0cmluZyk6IFdvcmtzcGFjZURhdGEgfCB1bmRlZmluZWQge1xyXG5cdFx0Y29uc3QgY29uZmlnID0gdGhpcy5nZXRXb3Jrc3BhY2VzQ29uZmlnKCk7XHJcblx0XHRyZXR1cm4gY29uZmlnLmJ5SWRbaWRdO1xyXG5cdH1cclxuXHJcblx0Ly8gR2V0IGFjdGl2ZSB3b3Jrc3BhY2VcclxuXHRwdWJsaWMgZ2V0QWN0aXZlV29ya3NwYWNlKCk6IFdvcmtzcGFjZURhdGEge1xyXG5cdFx0Y29uc3QgY29uZmlnID0gdGhpcy5nZXRXb3Jrc3BhY2VzQ29uZmlnKCk7XHJcblx0XHRjb25zdCBhY3RpdmVJZCA9IGNvbmZpZy5hY3RpdmVXb3Jrc3BhY2VJZCB8fCBjb25maWcuZGVmYXVsdFdvcmtzcGFjZUlkO1xyXG5cdFx0cmV0dXJuIGNvbmZpZy5ieUlkW2FjdGl2ZUlkXSB8fCBjb25maWcuYnlJZFtjb25maWcuZGVmYXVsdFdvcmtzcGFjZUlkXTtcclxuXHR9XHJcblxyXG5cdC8vIFNldCBhY3RpdmUgd29ya3NwYWNlXHJcblx0cHVibGljIGFzeW5jIHNldEFjdGl2ZVdvcmtzcGFjZSh3b3Jrc3BhY2VJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRjb25zb2xlLmxvZyhcIltURy1XT1JLU1BBQ0VdIHNldEFjdGl2ZVdvcmtzcGFjZTpzdGFydFwiLCB7XHJcblx0XHRcdGZyb206IHRoaXMuZ2V0QWN0aXZlV29ya3NwYWNlKCk/LmlkLFxyXG5cdFx0XHR0bzogd29ya3NwYWNlSWQsXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCBjb25maWcgPSB0aGlzLmdldFdvcmtzcGFjZXNDb25maWcoKTtcclxuXHJcblx0XHRpZiAoIWNvbmZpZy5ieUlkW3dvcmtzcGFjZUlkXSkge1xyXG5cdFx0XHRuZXcgTm90aWNlKGBXb3Jrc3BhY2Ugbm90IGZvdW5kLiBVc2luZyBkZWZhdWx0IHdvcmtzcGFjZS5gKTtcclxuXHRcdFx0d29ya3NwYWNlSWQgPSBjb25maWcuZGVmYXVsdFdvcmtzcGFjZUlkO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChjb25maWcuYWN0aXZlV29ya3NwYWNlSWQgPT09IHdvcmtzcGFjZUlkKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFwiW1RHLVdPUktTUEFDRV0gc2V0QWN0aXZlV29ya3NwYWNlOm5vb3AgKGFscmVhZHkgYWN0aXZlKVwiLFxyXG5cdFx0XHRcdHsgaWQ6IHdvcmtzcGFjZUlkIH1cclxuXHRcdFx0KTtcclxuXHRcdFx0cmV0dXJuOyAvLyBBbHJlYWR5IGFjdGl2ZVxyXG5cdFx0fVxyXG5cclxuXHRcdGNvbmZpZy5hY3RpdmVXb3Jrc3BhY2VJZCA9IHdvcmtzcGFjZUlkO1xyXG5cdFx0dGhpcy5jbGVhckNhY2hlKCk7XHJcblxyXG5cdFx0YXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblxyXG5cdFx0Y29uc29sZS5sb2coXCJbVEctV09SS1NQQUNFXSBzZXRBY3RpdmVXb3Jrc3BhY2U6ZG9uZVwiLCB7XHJcblx0XHRcdGFjdGl2ZTogY29uZmlnLmFjdGl2ZVdvcmtzcGFjZUlkLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0ZW1pdFdvcmtzcGFjZVN3aXRjaGVkKHRoaXMuYXBwLCB3b3Jrc3BhY2VJZCk7XHJcblx0fVxyXG5cclxuXHQvLyBDcmVhdGUgbmV3IHdvcmtzcGFjZSAoY2xvbmVkIGZyb20gY3VycmVudCBvciBkZWZhdWx0KVxyXG5cdHB1YmxpYyBhc3luYyBjcmVhdGVXb3Jrc3BhY2UoXHJcblx0XHRuYW1lOiBzdHJpbmcsXHJcblx0XHRiYXNlV29ya3NwYWNlSWQ/OiBzdHJpbmcsXHJcblx0XHRpY29uPzogc3RyaW5nXHJcblx0KTogUHJvbWlzZTxXb3Jrc3BhY2VEYXRhPiB7XHJcblx0XHRjb25zdCBjb25maWcgPSB0aGlzLmdldFdvcmtzcGFjZXNDb25maWcoKTtcclxuXHRcdGNvbnN0IGlkID0gdGhpcy5nZW5lcmF0ZUlkKCk7XHJcblxyXG5cdFx0Ly8gVXNlIGN1cnJlbnQgYWN0aXZlIHdvcmtzcGFjZSBhcyBiYXNlIGlmIG5vdCBzcGVjaWZpZWRcclxuXHRcdGNvbnN0IGJhc2VJZCA9XHJcblx0XHRcdGJhc2VXb3Jrc3BhY2VJZCB8fFxyXG5cdFx0XHRjb25maWcuYWN0aXZlV29ya3NwYWNlSWQgfHxcclxuXHRcdFx0Y29uZmlnLmRlZmF1bHRXb3Jrc3BhY2VJZDtcclxuXHRcdGNvbnN0IGJhc2VXb3Jrc3BhY2UgPSBjb25maWcuYnlJZFtiYXNlSWRdO1xyXG5cclxuXHRcdC8vIENsb25lIHNldHRpbmdzIGZyb20gYmFzZSB3b3Jrc3BhY2UgKGlmIG5vdCBkZWZhdWx0KVxyXG5cdFx0bGV0IHNldHRpbmdzOiBXb3Jrc3BhY2VPdmVycmlkZXMgPSB7fTtcclxuXHRcdGlmIChiYXNlSWQgIT09IGNvbmZpZy5kZWZhdWx0V29ya3NwYWNlSWQgJiYgYmFzZVdvcmtzcGFjZT8uc2V0dGluZ3MpIHtcclxuXHRcdFx0c2V0dGluZ3MgPSBzdHJ1Y3R1cmVkQ2xvbmUoYmFzZVdvcmtzcGFjZS5zZXR0aW5ncyk7XHJcblx0XHR9IGVsc2UgaWYgKGJhc2VJZCA9PT0gY29uZmlnLmRlZmF1bHRXb3Jrc3BhY2VJZCkge1xyXG5cdFx0XHQvLyBDcmVhdGluZyBmcm9tIGRlZmF1bHQgbWVhbnMgc3RhcnRpbmcgd2l0aCBjdXJyZW50IGdsb2JhbCB2YWx1ZXMgYXMtaXNcclxuXHRcdFx0c2V0dGluZ3MgPSB7fTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBuZXdXb3Jrc3BhY2U6IFdvcmtzcGFjZURhdGEgPSB7XHJcblx0XHRcdGlkLFxyXG5cdFx0XHRuYW1lLFxyXG5cdFx0XHR1cGRhdGVkQXQ6IERhdGUubm93KCksXHJcblx0XHRcdHNldHRpbmdzLFxyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBBZGQgaWNvbiBpZiBwcm92aWRlZCwgb3RoZXJ3aXNlIGluaGVyaXQgZnJvbSBiYXNlIHdvcmtzcGFjZSBpZiBjbG9uaW5nXHJcblx0XHRpZiAoaWNvbikge1xyXG5cdFx0XHRuZXdXb3Jrc3BhY2UuaWNvbiA9IGljb247XHJcblx0XHR9IGVsc2UgaWYgKFxyXG5cdFx0XHRiYXNlV29ya3NwYWNlPy5pY29uICYmXHJcblx0XHRcdGJhc2VJZCAhPT0gY29uZmlnLmRlZmF1bHRXb3Jrc3BhY2VJZFxyXG5cdFx0KSB7XHJcblx0XHRcdG5ld1dvcmtzcGFjZS5pY29uID0gYmFzZVdvcmtzcGFjZS5pY29uO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbmZpZy5ieUlkW2lkXSA9IG5ld1dvcmtzcGFjZTtcclxuXHRcdGNvbmZpZy5vcmRlci5wdXNoKGlkKTtcclxuXHJcblx0XHRhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdGVtaXRXb3Jrc3BhY2VDcmVhdGVkKHRoaXMuYXBwLCBpZCwgYmFzZUlkKTtcclxuXHJcblx0XHRyZXR1cm4gbmV3V29ya3NwYWNlO1xyXG5cdH1cclxuXHJcblx0Ly8gRGVsZXRlIHdvcmtzcGFjZVxyXG5cdHB1YmxpYyBhc3luYyBkZWxldGVXb3Jrc3BhY2Uod29ya3NwYWNlSWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Y29uc3QgY29uZmlnID0gdGhpcy5nZXRXb3Jrc3BhY2VzQ29uZmlnKCk7XHJcblxyXG5cdFx0Ly8gQ2Fubm90IGRlbGV0ZSBkZWZhdWx0IHdvcmtzcGFjZVxyXG5cdFx0aWYgKHdvcmtzcGFjZUlkID09PSBjb25maWcuZGVmYXVsdFdvcmtzcGFjZUlkKSB7XHJcblx0XHRcdG5ldyBOb3RpY2UoXCJDYW5ub3QgZGVsZXRlIHRoZSBkZWZhdWx0IHdvcmtzcGFjZVwiKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICghY29uZmlnLmJ5SWRbd29ya3NwYWNlSWRdKSB7XHJcblx0XHRcdHJldHVybjsgLy8gQWxyZWFkeSBkb2Vzbid0IGV4aXN0XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIGZyb20gY29uZmlnXHJcblx0XHRkZWxldGUgY29uZmlnLmJ5SWRbd29ya3NwYWNlSWRdO1xyXG5cdFx0Y29uc3Qgb3JkZXJJbmRleCA9IGNvbmZpZy5vcmRlci5pbmRleE9mKHdvcmtzcGFjZUlkKTtcclxuXHRcdGlmIChvcmRlckluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHRjb25maWcub3JkZXIuc3BsaWNlKG9yZGVySW5kZXgsIDEpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIElmIHRoaXMgd2FzIHRoZSBhY3RpdmUgd29ya3NwYWNlLCBzd2l0Y2ggdG8gZGVmYXVsdFxyXG5cdFx0aWYgKGNvbmZpZy5hY3RpdmVXb3Jrc3BhY2VJZCA9PT0gd29ya3NwYWNlSWQpIHtcclxuXHRcdFx0Y29uZmlnLmFjdGl2ZVdvcmtzcGFjZUlkID0gY29uZmlnLmRlZmF1bHRXb3Jrc3BhY2VJZDtcclxuXHRcdFx0ZW1pdFdvcmtzcGFjZVN3aXRjaGVkKHRoaXMuYXBwLCBjb25maWcuZGVmYXVsdFdvcmtzcGFjZUlkKTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmNsZWFyQ2FjaGUoKTtcclxuXHRcdGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0ZW1pdFdvcmtzcGFjZURlbGV0ZWQodGhpcy5hcHAsIHdvcmtzcGFjZUlkKTtcclxuXHR9XHJcblxyXG5cdC8vIFJlbmFtZSB3b3Jrc3BhY2VcclxuXHRwdWJsaWMgYXN5bmMgcmVuYW1lV29ya3NwYWNlKFxyXG5cdFx0d29ya3NwYWNlSWQ6IHN0cmluZyxcclxuXHRcdG5ld05hbWU6IHN0cmluZyxcclxuXHRcdGljb24/OiBzdHJpbmdcclxuXHQpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGNvbnN0IGNvbmZpZyA9IHRoaXMuZ2V0V29ya3NwYWNlc0NvbmZpZygpO1xyXG5cdFx0Y29uc3Qgd29ya3NwYWNlID0gY29uZmlnLmJ5SWRbd29ya3NwYWNlSWRdO1xyXG5cclxuXHRcdGlmICghd29ya3NwYWNlKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHR3b3Jrc3BhY2UubmFtZSA9IG5ld05hbWU7XHJcblx0XHRpZiAoaWNvbiAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdHdvcmtzcGFjZS5pY29uID0gaWNvbjtcclxuXHRcdH1cclxuXHRcdHdvcmtzcGFjZS51cGRhdGVkQXQgPSBEYXRlLm5vdygpO1xyXG5cclxuXHRcdGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0ZW1pdFdvcmtzcGFjZVJlbmFtZWQodGhpcy5hcHAsIHdvcmtzcGFjZUlkLCBuZXdOYW1lKTtcclxuXHR9XHJcblxyXG5cdC8vIFNhdmUgb3ZlcnJpZGVzIGZvciBhIHdvcmtzcGFjZVxyXG5cdHB1YmxpYyBhc3luYyBzYXZlT3ZlcnJpZGVzKFxyXG5cdFx0d29ya3NwYWNlSWQ6IHN0cmluZyxcclxuXHRcdGVmZmVjdGl2ZTogRWZmZWN0aXZlU2V0dGluZ3NcclxuXHQpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGNvbnN0IGNvbmZpZyA9IHRoaXMuZ2V0V29ya3NwYWNlc0NvbmZpZygpO1xyXG5cclxuXHRcdC8vIENhbm5vdCBzYXZlIG92ZXJyaWRlcyB0byBkZWZhdWx0IHdvcmtzcGFjZVxyXG5cdFx0aWYgKHdvcmtzcGFjZUlkID09PSBjb25maWcuZGVmYXVsdFdvcmtzcGFjZUlkKSB7XHJcblx0XHRcdC8vIEZvciBkZWZhdWx0LCB3cml0ZSBkaXJlY3RseSB0byBnbG9iYWwgc2V0dGluZ3MgRVhDRVBUIGZsdWVudEZpbHRlclN0YXRlIHdoaWNoIGlzIHdvcmtzcGFjZS1vbmx5XHJcblx0XHRcdGNvbnN0IGNoYW5nZWRLZXlzOiBzdHJpbmdbXSA9IFtdO1xyXG5cdFx0XHRmb3IgKGNvbnN0IGtleSBvZiBXT1JLU1BBQ0VfU0NPUEVEX0tFWVMpIHtcclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRlZmZlY3RpdmVba2V5XSAhPT0gdW5kZWZpbmVkICYmXHJcblx0XHRcdFx0XHRrZXkgIT09IFwiZmx1ZW50RmlsdGVyU3RhdGVcIlxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0KHRoaXMucGx1Z2luLnNldHRpbmdzIGFzIGFueSlba2V5XSA9IHN0cnVjdHVyZWRDbG9uZShcclxuXHRcdFx0XHRcdFx0ZWZmZWN0aXZlW2tleV1cclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRjaGFuZ2VkS2V5cy5wdXNoKGtleSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdC8vIEhhbmRsZSBmbHVlbnRGaWx0ZXJTdGF0ZSBzcGVjaWFsbHkgZm9yIGRlZmF1bHQgd29ya3NwYWNlXHJcblx0XHRcdGlmIChlZmZlY3RpdmUuZmx1ZW50RmlsdGVyU3RhdGUgIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdGNvbnN0IHdzID0gY29uZmlnLmJ5SWRbd29ya3NwYWNlSWRdO1xyXG5cdFx0XHRcdHdzLnNldHRpbmdzID0gKHdzLnNldHRpbmdzIHx8IHt9KSBhcyBhbnk7XHJcblx0XHRcdFx0KHdzLnNldHRpbmdzIGFzIGFueSkuZmx1ZW50RmlsdGVyU3RhdGUgPSBzdHJ1Y3R1cmVkQ2xvbmUoXHJcblx0XHRcdFx0XHRlZmZlY3RpdmUuZmx1ZW50RmlsdGVyU3RhdGVcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHdzLnVwZGF0ZWRBdCA9IERhdGUubm93KCk7XHJcblx0XHRcdFx0Y2hhbmdlZEtleXMucHVzaChcImZsdWVudEZpbHRlclN0YXRlXCIpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiW1RHLVdPUktTUEFDRV0gc2F2ZU92ZXJyaWRlcyhkZWZhdWx0KVwiLCB7XHJcblx0XHRcdFx0d29ya3NwYWNlSWQsXHJcblx0XHRcdFx0Y2hhbmdlZEtleXMsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHR0aGlzLmNsZWFyQ2FjaGUoKTtcclxuXHRcdFx0YXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdC8vIEVtaXQgb3ZlcnJpZGVzIHNhdmVkIGZvciBVSSB0byByZWFjdDsgYWxzbyBlbWl0IFNFVFRJTkdTX0NIQU5HRUQgZm9yIGdsb2JhbCBjaGFuZ2VzXHJcblx0XHRcdGVtaXRXb3Jrc3BhY2VPdmVycmlkZXNTYXZlZChcclxuXHRcdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0XHR3b3Jrc3BhY2VJZCxcclxuXHRcdFx0XHRjaGFuZ2VkS2V5cy5sZW5ndGggPyBjaGFuZ2VkS2V5cyA6IHVuZGVmaW5lZFxyXG5cdFx0XHQpO1xyXG5cdFx0XHRlbWl0KHRoaXMuYXBwLCBFdmVudHMuU0VUVElOR1NfQ0hBTkdFRCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCB3b3Jrc3BhY2UgPSBjb25maWcuYnlJZFt3b3Jrc3BhY2VJZF07XHJcblx0XHRpZiAoIXdvcmtzcGFjZSkge1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2FsY3VsYXRlIG92ZXJyaWRlc1xyXG5cdFx0Y29uc3Qgb3ZlcnJpZGVzID0gdGhpcy50b092ZXJyaWRlcyhlZmZlY3RpdmUpO1xyXG5cdFx0Y29uc3QgY2hhbmdlZEtleXMgPSBPYmplY3Qua2V5cyhvdmVycmlkZXMpO1xyXG5cclxuXHRcdGNvbnNvbGUubG9nKFwiW1RHLVdPUktTUEFDRV0gc2F2ZU92ZXJyaWRlc1wiLCB7XHJcblx0XHRcdHdvcmtzcGFjZUlkLFxyXG5cdFx0XHRjaGFuZ2VkS2V5cyxcclxuXHRcdH0pO1xyXG5cdFx0d29ya3NwYWNlLnNldHRpbmdzID0gb3ZlcnJpZGVzO1xyXG5cdFx0d29ya3NwYWNlLnVwZGF0ZWRBdCA9IERhdGUubm93KCk7XHJcblxyXG5cdFx0dGhpcy5jbGVhckNhY2hlKCk7XHJcblx0XHRhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHJcblx0XHRlbWl0V29ya3NwYWNlT3ZlcnJpZGVzU2F2ZWQodGhpcy5hcHAsIHdvcmtzcGFjZUlkLCBjaGFuZ2VkS2V5cyk7XHJcblx0XHRlbWl0KHRoaXMuYXBwLCBFdmVudHMuU0VUVElOR1NfQ0hBTkdFRCk7XHJcblx0fVxyXG5cclxuXHQvLyBTYXZlIG92ZXJyaWRlcyBxdWlldGx5IHdpdGhvdXQgdHJpZ2dlcmluZyBTRVRUSU5HU19DSEFOR0VEIGV2ZW50XHJcblx0cHVibGljIGFzeW5jIHNhdmVPdmVycmlkZXNRdWlldGx5KFxyXG5cdFx0d29ya3NwYWNlSWQ6IHN0cmluZyxcclxuXHRcdGVmZmVjdGl2ZTogRWZmZWN0aXZlU2V0dGluZ3NcclxuXHQpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGNvbnN0IGNvbmZpZyA9IHRoaXMuZ2V0V29ya3NwYWNlc0NvbmZpZygpO1xyXG5cclxuXHRcdC8vIENhbm5vdCBzYXZlIG92ZXJyaWRlcyB0byBkZWZhdWx0IHdvcmtzcGFjZVxyXG5cdFx0aWYgKHdvcmtzcGFjZUlkID09PSBjb25maWcuZGVmYXVsdFdvcmtzcGFjZUlkKSB7XHJcblx0XHRcdC8vIEZvciBkZWZhdWx0LCB3cml0ZSBkaXJlY3RseSB0byBnbG9iYWwgc2V0dGluZ3MgRVhDRVBUIGZsdWVudEZpbHRlclN0YXRlIHdoaWNoIGlzIHdvcmtzcGFjZS1vbmx5XHJcblx0XHRcdGZvciAoY29uc3Qga2V5IG9mIFdPUktTUEFDRV9TQ09QRURfS0VZUykge1xyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdGVmZmVjdGl2ZVtrZXldICE9PSB1bmRlZmluZWQgJiZcclxuXHRcdFx0XHRcdGtleSAhPT0gXCJmbHVlbnRGaWx0ZXJTdGF0ZVwiXHJcblx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHQodGhpcy5wbHVnaW4uc2V0dGluZ3MgYXMgYW55KVtrZXldID0gc3RydWN0dXJlZENsb25lKFxyXG5cdFx0XHRcdFx0XHRlZmZlY3RpdmVba2V5XVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gSGFuZGxlIGZsdWVudEZpbHRlclN0YXRlIHNwZWNpYWxseSBmb3IgZGVmYXVsdCB3b3Jrc3BhY2UgKHN0b3JlIHVuZGVyIHdvcmtzcGFjZS5zZXR0aW5ncylcclxuXHRcdFx0aWYgKGVmZmVjdGl2ZS5mbHVlbnRGaWx0ZXJTdGF0ZSAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0Y29uc3Qgd3MgPSBjb25maWcuYnlJZFt3b3Jrc3BhY2VJZF07XHJcblx0XHRcdFx0d3Muc2V0dGluZ3MgPSAod3Muc2V0dGluZ3MgfHwge30pIGFzIGFueTtcclxuXHRcdFx0XHQod3Muc2V0dGluZ3MgYXMgYW55KS5mbHVlbnRGaWx0ZXJTdGF0ZSA9IHN0cnVjdHVyZWRDbG9uZShcclxuXHRcdFx0XHRcdGVmZmVjdGl2ZS5mbHVlbnRGaWx0ZXJTdGF0ZVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0d3MudXBkYXRlZEF0ID0gRGF0ZS5ub3coKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRjb25zb2xlLmxvZyhcIltURy1XT1JLU1BBQ0VdIHNhdmVPdmVycmlkZXNRdWlldGx5KGRlZmF1bHQpXCIsIHtcclxuXHRcdFx0XHR3b3Jrc3BhY2VJZCxcclxuXHRcdFx0XHRrZXlzOiBXT1JLU1BBQ0VfU0NPUEVEX0tFWVMuZmlsdGVyKFxyXG5cdFx0XHRcdFx0KGspID0+IChlZmZlY3RpdmUgYXMgYW55KVtrXSAhPT0gdW5kZWZpbmVkXHJcblx0XHRcdFx0KSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdHRoaXMuY2xlYXJDYWNoZSgpO1xyXG5cdFx0XHRhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHdvcmtzcGFjZSA9IGNvbmZpZy5ieUlkW3dvcmtzcGFjZUlkXTtcclxuXHRcdGlmICghd29ya3NwYWNlKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDYWxjdWxhdGUgb3ZlcnJpZGVzXHJcblx0XHRjb25zdCBvdmVycmlkZXMgPSB0aGlzLnRvT3ZlcnJpZGVzKGVmZmVjdGl2ZSk7XHJcblx0XHRjb25zb2xlLmxvZyhcIltURy1XT1JLU1BBQ0VdIHNhdmVPdmVycmlkZXNRdWlldGx5XCIsIHtcclxuXHRcdFx0d29ya3NwYWNlSWQsXHJcblx0XHRcdGtleXM6IE9iamVjdC5rZXlzKG92ZXJyaWRlcyksXHJcblx0XHR9KTtcclxuXHJcblx0XHR3b3Jrc3BhY2Uuc2V0dGluZ3MgPSBvdmVycmlkZXM7XHJcblx0XHR3b3Jrc3BhY2UudXBkYXRlZEF0ID0gRGF0ZS5ub3coKTtcclxuXHJcblx0XHR0aGlzLmNsZWFyQ2FjaGUoKTtcclxuXHRcdGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cclxuXHRcdC8vIERvbid0IGVtaXQgZXZlbnRzIHRvIGF2b2lkIHRyaWdnZXJpbmcgcmVsb2FkIGxvb3BzXHJcblx0fVxyXG5cclxuXHQvLyBSZXNldCB3b3Jrc3BhY2Ugb3ZlcnJpZGVzXHJcblx0cHVibGljIGFzeW5jIHJlc2V0T3ZlcnJpZGVzKHdvcmtzcGFjZUlkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGNvbnN0IGNvbmZpZyA9IHRoaXMuZ2V0V29ya3NwYWNlc0NvbmZpZygpO1xyXG5cclxuXHRcdC8vIENhbm5vdCByZXNldCBkZWZhdWx0IHdvcmtzcGFjZVxyXG5cdFx0aWYgKHdvcmtzcGFjZUlkID09PSBjb25maWcuZGVmYXVsdFdvcmtzcGFjZUlkKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCB3b3Jrc3BhY2UgPSBjb25maWcuYnlJZFt3b3Jrc3BhY2VJZF07XHJcblx0XHRpZiAoIXdvcmtzcGFjZSkge1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0d29ya3NwYWNlLnNldHRpbmdzID0ge307XHJcblx0XHR3b3Jrc3BhY2UudXBkYXRlZEF0ID0gRGF0ZS5ub3coKTtcclxuXHJcblx0XHR0aGlzLmNsZWFyQ2FjaGUoKTtcclxuXHRcdGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cclxuXHRcdGVtaXRXb3Jrc3BhY2VSZXNldCh0aGlzLmFwcCwgd29ya3NwYWNlSWQpO1xyXG5cdFx0ZW1pdCh0aGlzLmFwcCwgRXZlbnRzLlNFVFRJTkdTX0NIQU5HRUQpO1xyXG5cdH1cclxuXHJcblx0Ly8gU2V0IGRlZmF1bHQgd29ya3NwYWNlIChjaGFuZ2Ugd2hpY2ggb25lIGlzIGRlZmF1bHQpXHJcblx0cHVibGljIGFzeW5jIHNldERlZmF1bHRXb3Jrc3BhY2Uod29ya3NwYWNlSWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Y29uc3QgY29uZmlnID0gdGhpcy5nZXRXb3Jrc3BhY2VzQ29uZmlnKCk7XHJcblxyXG5cdFx0aWYgKCFjb25maWcuYnlJZFt3b3Jrc3BhY2VJZF0pIHtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChjb25maWcuZGVmYXVsdFdvcmtzcGFjZUlkID09PSB3b3Jrc3BhY2VJZCkge1xyXG5cdFx0XHRyZXR1cm47IC8vIEFscmVhZHkgZGVmYXVsdFxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFRoZSBvbGQgZGVmYXVsdCB3b3Jrc3BhY2UgbmVlZHMgdG8gZ2V0IGN1cnJlbnQgZ2xvYmFsIHNldHRpbmdzIGFzIG92ZXJyaWRlc1xyXG5cdFx0Ly8gVGhlIG5ldyBkZWZhdWx0IHdvcmtzcGFjZSdzIG92ZXJyaWRlcyBiZWNvbWUgdGhlIG5ldyBnbG9iYWwgc2V0dGluZ3NcclxuXHJcblx0XHRjb25zdCBvbGREZWZhdWx0SWQgPSBjb25maWcuZGVmYXVsdFdvcmtzcGFjZUlkO1xyXG5cdFx0Y29uc3QgbmV3RGVmYXVsdFdvcmtzcGFjZSA9IGNvbmZpZy5ieUlkW3dvcmtzcGFjZUlkXTtcclxuXHJcblx0XHQvLyBTYXZlIGN1cnJlbnQgZ2xvYmFsIGFzIG92ZXJyaWRlcyBmb3Igb2xkIGRlZmF1bHRcclxuXHRcdGNvbnN0IGN1cnJlbnRHbG9iYWxBc092ZXJyaWRlczogV29ya3NwYWNlT3ZlcnJpZGVzID0ge307XHJcblx0XHRmb3IgKGNvbnN0IGtleSBvZiBXT1JLU1BBQ0VfU0NPUEVEX0tFWVMpIHtcclxuXHRcdFx0Y29uc3QgZ2xvYmFsVmFsdWUgPSAodGhpcy5wbHVnaW4uc2V0dGluZ3MgYXMgYW55KVtrZXldO1xyXG5cdFx0XHRpZiAoZ2xvYmFsVmFsdWUgIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdGN1cnJlbnRHbG9iYWxBc092ZXJyaWRlc1trZXldID0gc3RydWN0dXJlZENsb25lKGdsb2JhbFZhbHVlKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFwcGx5IG5ldyBkZWZhdWx0J3Mgb3ZlcnJpZGVzIHRvIGdsb2JhbFxyXG5cdFx0aWYgKG5ld0RlZmF1bHRXb3Jrc3BhY2Uuc2V0dGluZ3MpIHtcclxuXHRcdFx0dGhpcy5tZXJnZUludG9HbG9iYWwobmV3RGVmYXVsdFdvcmtzcGFjZS5zZXR0aW5ncyk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU2V0IG9sZCBkZWZhdWx0J3Mgb3ZlcnJpZGVzXHJcblx0XHRjb25maWcuYnlJZFtvbGREZWZhdWx0SWRdLnNldHRpbmdzID0gY3VycmVudEdsb2JhbEFzT3ZlcnJpZGVzO1xyXG5cclxuXHRcdC8vIENsZWFyIG5ldyBkZWZhdWx0J3Mgb3ZlcnJpZGVzXHJcblx0XHRuZXdEZWZhdWx0V29ya3NwYWNlLnNldHRpbmdzID0ge307XHJcblxyXG5cdFx0Ly8gVXBkYXRlIGRlZmF1bHQgSURcclxuXHRcdGNvbmZpZy5kZWZhdWx0V29ya3NwYWNlSWQgPSB3b3Jrc3BhY2VJZDtcclxuXHJcblx0XHQvLyBOb3JtYWxpemUgYWxsIG92ZXJyaWRlc1xyXG5cdFx0dGhpcy5ub3JtYWxpemVPdmVycmlkZXMoKTtcclxuXHJcblx0XHR0aGlzLmNsZWFyQ2FjaGUoKTtcclxuXHRcdGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cclxuXHRcdGVtaXREZWZhdWx0V29ya3NwYWNlQ2hhbmdlZCh0aGlzLmFwcCwgd29ya3NwYWNlSWQpO1xyXG5cdFx0ZW1pdCh0aGlzLmFwcCwgRXZlbnRzLlNFVFRJTkdTX0NIQU5HRUQpO1xyXG5cdH1cclxuXHJcblx0Ly8gR2VuZXJhdGUgdW5pcXVlIElEXHJcblx0cHJpdmF0ZSBnZW5lcmF0ZUlkKCk6IHN0cmluZyB7XHJcblx0XHRyZXR1cm4gYHdzXyR7RGF0ZS5ub3coKX1fJHtNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgOSl9YDtcclxuXHR9XHJcblxyXG5cdC8vIE1pZ3JhdGUgZnJvbSB2MSB0byB2MlxyXG5cdHB1YmxpYyBhc3luYyBtaWdyYXRlVG9WMigpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy53b3Jrc3BhY2VzPy52ZXJzaW9uID09PSAyKSB7XHJcblx0XHRcdHJldHVybjsgLy8gQWxyZWFkeSB2MlxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgdjIgc3RydWN0dXJlXHJcblx0XHR0aGlzLmluaXRpYWxpemVXb3Jrc3BhY2VzKCk7XHJcblx0XHR0aGlzLmVuc3VyZURlZmF1bHRXb3Jrc3BhY2VJbnZhcmlhbnQoKTtcclxuXHJcblx0XHQvLyBJZiB0aGVyZSB3ZXJlIHYxIHdvcmtzcGFjZXMsIG1pZ3JhdGUgdGhlbVxyXG5cdFx0Ly8gKFRoaXMgaXMgYSBwbGFjZWhvbGRlciAtIGltcGxlbWVudCBiYXNlZCBvbiBhY3R1YWwgdjEgc3RydWN0dXJlKVxyXG5cclxuXHRcdGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdH1cclxuXHJcblx0Ly8gUmVvcmRlciB3b3Jrc3BhY2VzXHJcblx0cHVibGljIGFzeW5jIHJlb3JkZXJXb3Jrc3BhY2VzKG5ld09yZGVyOiBzdHJpbmdbXSk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Y29uc3QgY29uZmlnID0gdGhpcy5nZXRXb3Jrc3BhY2VzQ29uZmlnKCk7XHJcblxyXG5cdFx0Ly8gVmFsaWRhdGUgdGhhdCBhbGwgSURzIGV4aXN0IGFuZCBkZWZhdWx0IGlzIGZpcnN0XHJcblx0XHRjb25zdCB2YWxpZE9yZGVyID0gbmV3T3JkZXIuZmlsdGVyKChpZCkgPT4gY29uZmlnLmJ5SWRbaWRdKTtcclxuXHJcblx0XHQvLyBFbnN1cmUgZGVmYXVsdCBpcyBhbHdheXMgZmlyc3RcclxuXHRcdGNvbnN0IGRlZmF1bHRJbmRleCA9IHZhbGlkT3JkZXIuaW5kZXhPZihjb25maWcuZGVmYXVsdFdvcmtzcGFjZUlkKTtcclxuXHRcdGlmIChkZWZhdWx0SW5kZXggPiAwKSB7XHJcblx0XHRcdHZhbGlkT3JkZXIuc3BsaWNlKGRlZmF1bHRJbmRleCwgMSk7XHJcblx0XHRcdHZhbGlkT3JkZXIudW5zaGlmdChjb25maWcuZGVmYXVsdFdvcmtzcGFjZUlkKTtcclxuXHRcdH0gZWxzZSBpZiAoZGVmYXVsdEluZGV4ID09PSAtMSkge1xyXG5cdFx0XHR2YWxpZE9yZGVyLnVuc2hpZnQoY29uZmlnLmRlZmF1bHRXb3Jrc3BhY2VJZCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uZmlnLm9yZGVyID0gdmFsaWRPcmRlcjtcclxuXHRcdGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdH1cclxuXHJcblx0Ly8gQ2hlY2sgaWYgYSB3b3Jrc3BhY2UgaXMgdGhlIGRlZmF1bHRcclxuXHRwdWJsaWMgaXNEZWZhdWx0V29ya3NwYWNlKHdvcmtzcGFjZUlkOiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHRcdGNvbnN0IGNvbmZpZyA9IHRoaXMuZ2V0V29ya3NwYWNlc0NvbmZpZygpO1xyXG5cdFx0cmV0dXJuIHdvcmtzcGFjZUlkID09PSBjb25maWcuZGVmYXVsdFdvcmtzcGFjZUlkO1xyXG5cdH1cclxuXHJcblx0Ly8gRXhwb3J0IHdvcmtzcGFjZSBjb25maWd1cmF0aW9uXHJcblx0cHVibGljIGV4cG9ydFdvcmtzcGFjZSh3b3Jrc3BhY2VJZDogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XHJcblx0XHRjb25zdCB3b3Jrc3BhY2UgPSB0aGlzLmdldFdvcmtzcGFjZSh3b3Jrc3BhY2VJZCk7XHJcblx0XHRpZiAoIXdvcmtzcGFjZSkgcmV0dXJuIG51bGw7XHJcblxyXG5cdFx0Y29uc3QgZXhwb3J0RGF0YSA9IHtcclxuXHRcdFx0bmFtZTogd29ya3NwYWNlLm5hbWUsXHJcblx0XHRcdHNldHRpbmdzOiB3b3Jrc3BhY2Uuc2V0dGluZ3MsXHJcblx0XHRcdGV4cG9ydGVkQXQ6IERhdGUubm93KCksXHJcblx0XHRcdHZlcnNpb246IDEsXHJcblx0XHR9O1xyXG5cclxuXHRcdHJldHVybiBKU09OLnN0cmluZ2lmeShleHBvcnREYXRhLCBudWxsLCAyKTtcclxuXHR9XHJcblxyXG5cdC8vIEltcG9ydCB3b3Jrc3BhY2UgY29uZmlndXJhdGlvblxyXG5cdHB1YmxpYyBhc3luYyBpbXBvcnRXb3Jrc3BhY2UoXHJcblx0XHRqc29uRGF0YTogc3RyaW5nLFxyXG5cdFx0bmFtZT86IHN0cmluZ1xyXG5cdCk6IFByb21pc2U8V29ya3NwYWNlRGF0YSB8IG51bGw+IHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IGltcG9ydERhdGEgPSBKU09OLnBhcnNlKGpzb25EYXRhKTtcclxuXHRcdFx0Y29uc3Qgd29ya3NwYWNlTmFtZSA9XHJcblx0XHRcdFx0bmFtZSB8fCBpbXBvcnREYXRhLm5hbWUgfHwgXCJJbXBvcnRlZCBXb3Jrc3BhY2VcIjtcclxuXHRcdFx0Y29uc3Qgc2V0dGluZ3MgPSBpbXBvcnREYXRhLnNldHRpbmdzIHx8IHt9O1xyXG5cclxuXHRcdFx0Y29uc3QgbmV3V29ya3NwYWNlID0gYXdhaXQgdGhpcy5jcmVhdGVXb3Jrc3BhY2Uod29ya3NwYWNlTmFtZSk7XHJcblx0XHRcdG5ld1dvcmtzcGFjZS5zZXR0aW5ncyA9IHNldHRpbmdzO1xyXG5cclxuXHRcdFx0YXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdHJldHVybiBuZXdXb3Jrc3BhY2U7XHJcblx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdG5ldyBOb3RpY2UoXCJGYWlsZWQgdG8gaW1wb3J0IHdvcmtzcGFjZSBjb25maWd1cmF0aW9uXCIpO1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiV29ya3NwYWNlIGltcG9ydCBlcnJvcjpcIiwgZSk7XHJcblx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG4iXX0=