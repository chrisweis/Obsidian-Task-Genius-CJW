/**
 * Obsidian URI Handler for Task Genius
 * Handles custom URI scheme: obsidian://task-genius/...
 */
import { __awaiter } from "tslib";
import { Notice } from "obsidian";
import { t } from "../translations/helper";
export class ObsidianUriHandler {
    constructor(plugin) {
        this.plugin = plugin;
    }
    /**
     * Register the URI handler with Obsidian
     */
    register() {
        // Register the main handler
        this.plugin.registerObsidianProtocolHandler("task-genius", (params) => __awaiter(this, void 0, void 0, function* () {
            yield this.handleUri(params);
        }));
        // Register specific action handlers for direct path access
        // This allows both formats: obsidian://task-genius?action=settings
        // and obsidian://task-genius/settings
        const actions = ["settings", "create-task", "open-view"];
        for (const action of actions) {
            this.plugin.registerObsidianProtocolHandler(`task-genius/${action}`, (params) => __awaiter(this, void 0, void 0, function* () {
                // Set the action explicitly since it's in the path
                yield this.handleUri(Object.assign(Object.assign({}, params), { action }));
            }));
        }
    }
    /**
     * Handle incoming URI requests
     */
    handleUri(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { action } = params;
            // Default to settings action if not specified
            const uriAction = action || "settings";
            switch (uriAction) {
                case "settings":
                    yield this.handleSettingsUri(params);
                    break;
                case "create-task":
                    yield this.handleCreateTaskUri(params);
                    break;
                case "open-view":
                    yield this.handleOpenViewUri(params);
                    break;
                default:
                    new Notice(t("Unknown URI action: ") + uriAction);
            }
        });
    }
    /**
     * Handle settings-related URI
     * Example: obsidian://task-genius/settings?tab=mcp-integration&action=enable
     */
    handleSettingsUri(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { tab, section, search } = params;
            // Open settings
            const settings = this.plugin.app.setting;
            settings.open();
            settings.openTabById(this.plugin.manifest.id);
            // Wait for settings to be ready
            yield new Promise(resolve => setTimeout(resolve, 100));
            // Navigate to specific tab if provided
            if (tab) {
                this.navigateToSettingsTab(tab, section, search);
            }
            // Handle specific actions
            if (params.action) {
                yield this.handleSettingsAction(params.action, tab);
            }
        });
    }
    /**
     * Navigate to a specific settings tab
     */
    navigateToSettingsTab(tabName, section, search) {
        // Use the settingTab's navigation method if available
        if (this.plugin.settingTab && this.plugin.settingTab.navigateToTab) {
            this.plugin.settingTab.navigateToTab(tabName, section, search);
            return;
        }
        // Fallback: Map tab names to tab indices or identifiers
        const tabMap = {
            "general": "general",
            "index": "index",
            "view-settings": "view-settings",
            "file-filter": "file-filter",
            "progress-bar": "progress-bar",
            "task-status": "task-status",
            "task-handler": "task-handler",
            "workflow": "workflow",
            "reward": "reward",
            "habit": "habit",
            "mcp-integration": "mcp-integration",
            "ics": "ics",
            "time-parsing": "time-parsing",
            "beta-test": "beta-test",
            "about": "about"
        };
        const tabId = tabMap[tabName];
        if (!tabId) {
            new Notice(t("Unknown settings tab: ") + tabName);
            return;
        }
        // Fallback implementation
        const modal = this.plugin.app.setting.activeTab;
        if (!modal)
            return;
        // Find and click the tab
        const tabButtons = modal.containerEl.querySelectorAll(".settings-tab");
        tabButtons.forEach((button) => {
            var _a;
            const buttonText = (_a = button.textContent) === null || _a === void 0 ? void 0 : _a.toLowerCase();
            if (buttonText && buttonText.includes(tabName.replace("-", " "))) {
                button.click();
                // If there's a section, try to scroll to it
                if (section) {
                    setTimeout(() => {
                        this.scrollToSection(section);
                    }, 200);
                }
                // If there's a search term, try to focus the search
                if (search) {
                    setTimeout(() => {
                        this.performSettingsSearch(search);
                    }, 300);
                }
            }
        });
    }
    /**
     * Scroll to a specific section within the settings
     */
    scrollToSection(sectionId) {
        var _a;
        const modal = this.plugin.app.setting.activeTab;
        if (!modal)
            return;
        // Look for section headers
        const headers = modal.containerEl.querySelectorAll("h3, h4");
        headers.forEach((header) => {
            var _a;
            const headerText = (_a = header.textContent) === null || _a === void 0 ? void 0 : _a.toLowerCase();
            if (headerText && headerText.includes(sectionId.replace("-", " "))) {
                header.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        });
        // Special handling for specific sections
        if (sectionId === "cursor") {
            // Look for Cursor configuration section
            const cursorSection = modal.containerEl.querySelector(".mcp-client-section");
            if (cursorSection) {
                const header = cursorSection.querySelector(".mcp-client-header");
                if (header && ((_a = header.textContent) === null || _a === void 0 ? void 0 : _a.includes("Cursor"))) {
                    // Click to expand
                    header.click();
                    cursorSection.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            }
        }
    }
    /**
     * Perform a search in the settings
     */
    performSettingsSearch(searchTerm) {
        const modal = this.plugin.app.setting.activeTab;
        if (!modal)
            return;
        // Find the search input
        const searchInput = modal.containerEl.querySelector("input[type='search'], input.search-input");
        if (searchInput) {
            searchInput.value = searchTerm;
            searchInput.dispatchEvent(new Event("input", { bubbles: true }));
            searchInput.focus();
        }
    }
    /**
     * Handle specific actions within settings
     */
    handleSettingsAction(action, tab) {
        return __awaiter(this, void 0, void 0, function* () {
            // Wait for settings to be fully loaded
            yield new Promise(resolve => setTimeout(resolve, 500));
            const modal = this.plugin.app.setting.activeTab;
            if (!modal)
                return;
            switch (action) {
                case "enable":
                    if (tab === "mcp-integration") {
                        // Find and click the enable toggle
                        const toggle = modal.containerEl.querySelector(".setting-item:has(.setting-item-name:contains('Enable MCP Server')) .checkbox-container input");
                        if (toggle && !toggle.checked) {
                            toggle.click();
                        }
                    }
                    break;
                case "test":
                    if (tab === "mcp-integration") {
                        // Find and click the test button
                        const testButton = Array.from(modal.containerEl.querySelectorAll("button")).find(btn => btn.textContent === t("Test"));
                        if (testButton) {
                            testButton.click();
                        }
                    }
                    break;
                case "regenerate-token":
                    if (tab === "mcp-integration") {
                        // Find and click the regenerate button
                        const regenerateButton = Array.from(modal.containerEl.querySelectorAll("button")).find(btn => btn.textContent === t("Regenerate"));
                        if (regenerateButton) {
                            regenerateButton.click();
                        }
                    }
                    break;
            }
        });
    }
    /**
     * Handle create task URI
     * Example: obsidian://task-genius/create-task?content=My%20Task&project=Work
     */
    handleCreateTaskUri(params) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const { content, project, context, tags, priority, dueDate, startDate } = params;
            if (!content) {
                new Notice(t("Task content is required"));
                return;
            }
            // Parse tags if provided as comma-separated
            const taskTags = tags ? tags.split(",").map(t => t.trim()) : [];
            // Create the task using WriteAPI
            try {
                if (!this.plugin.writeAPI) {
                    new Notice(t("Task system not initialized"));
                    return;
                }
                // Get the daily note or create in inbox
                const dailyNotePath = ((_a = this.plugin.app.workspace.getActiveFile()) === null || _a === void 0 ? void 0 : _a.path) ||
                    `Daily/${new Date().toISOString().split('T')[0]}.md`;
                yield this.plugin.writeAPI.createTask({
                    content: decodeURIComponent(content),
                    project: project ? decodeURIComponent(project) : undefined,
                    context: context ? decodeURIComponent(context) : undefined,
                    tags: taskTags,
                    priority: priority ? parseInt(priority) : undefined,
                    dueDate: dueDate || undefined,
                    startDate: startDate || undefined,
                    filePath: dailyNotePath
                });
                new Notice(t("Task created successfully"));
            }
            catch (error) {
                console.error("Failed to create task from URI:", error);
                new Notice(t("Failed to create task"));
            }
        });
    }
    /**
     * Handle open view URI
     * Example: obsidian://task-genius/open-view?type=inbox
     */
    handleOpenViewUri(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { type } = params;
            if (!type) {
                new Notice(t("View type is required"));
                return;
            }
            // Map view types to leaf types
            const viewMap = {
                "inbox": "task-progress-bar-view",
                "forecast": "task-progress-bar-view",
                "project": "task-progress-bar-view",
                "tag": "task-progress-bar-view",
                "review": "task-progress-bar-view",
                "calendar": "task-progress-bar-view",
                "gantt": "task-progress-bar-view",
                "kanban": "task-progress-bar-view",
                "matrix": "task-progress-bar-view",
                "table": "task-progress-bar-view"
            };
            const leafType = viewMap[type];
            if (!leafType) {
                new Notice(t("Unknown view type: ") + type);
                return;
            }
            // Open the view
            const leaf = this.plugin.app.workspace.getLeaf(true);
            yield leaf.setViewState({
                type: leafType,
                state: { viewType: type }
            });
            this.plugin.app.workspace.revealLeaf(leaf);
        });
    }
    /**
     * Generate URI for settings
     * Uses the cleaner path format: obsidian://task-genius/settings?tab=...
     */
    static generateSettingsUri(tab, section, action, search) {
        const params = new URLSearchParams();
        if (tab)
            params.set("tab", tab);
        if (section)
            params.set("section", section);
        if (action)
            params.set("action", action);
        if (search)
            params.set("search", search);
        const queryString = params.toString();
        return `obsidian://task-genius/settings${queryString ? "?" + queryString : ""}`;
    }
    /**
     * Generate URI for creating a task
     * Uses the cleaner path format: obsidian://task-genius/create-task?content=...
     */
    static generateCreateTaskUri(content, options) {
        const params = new URLSearchParams();
        params.set("content", encodeURIComponent(content));
        if (options === null || options === void 0 ? void 0 : options.project)
            params.set("project", encodeURIComponent(options.project));
        if (options === null || options === void 0 ? void 0 : options.context)
            params.set("context", encodeURIComponent(options.context));
        if (options === null || options === void 0 ? void 0 : options.tags)
            params.set("tags", options.tags.join(","));
        if (options === null || options === void 0 ? void 0 : options.priority)
            params.set("priority", options.priority.toString());
        if (options === null || options === void 0 ? void 0 : options.dueDate)
            params.set("dueDate", options.dueDate);
        if (options === null || options === void 0 ? void 0 : options.startDate)
            params.set("startDate", options.startDate);
        return `obsidian://task-genius/create-task?${params.toString()}`;
    }
    /**
     * Generate URI for opening a view
     * Uses the cleaner path format: obsidian://task-genius/open-view?type=...
     */
    static generateOpenViewUri(viewType) {
        return `obsidian://task-genius/open-view?type=${viewType}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT2JzaWRpYW5VcmlIYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiT2JzaWRpYW5VcmlIYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7R0FHRzs7QUFFSCxPQUFPLEVBQVMsTUFBTSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBRXpDLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQVUzQyxNQUFNLE9BQU8sa0JBQWtCO0lBRzlCLFlBQVksTUFBNkI7UUFDeEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDdEIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsUUFBUTtRQUNQLDRCQUE0QjtRQUM1QixJQUFJLENBQUMsTUFBTSxDQUFDLCtCQUErQixDQUMxQyxhQUFhLEVBQ2IsQ0FBTyxNQUFpQixFQUFFLEVBQUU7WUFDM0IsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzlCLENBQUMsQ0FBQSxDQUNELENBQUM7UUFFRiwyREFBMkQ7UUFDM0QsbUVBQW1FO1FBQ25FLHNDQUFzQztRQUN0QyxNQUFNLE9BQU8sR0FBRyxDQUFDLFVBQVUsRUFBRSxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDekQsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUU7WUFDN0IsSUFBSSxDQUFDLE1BQU0sQ0FBQywrQkFBK0IsQ0FDMUMsZUFBZSxNQUFNLEVBQUUsRUFDdkIsQ0FBTyxNQUFpQixFQUFFLEVBQUU7Z0JBQzNCLG1EQUFtRDtnQkFDbkQsTUFBTSxJQUFJLENBQUMsU0FBUyxpQ0FBTSxNQUFNLEtBQUUsTUFBTSxJQUFHLENBQUM7WUFDN0MsQ0FBQyxDQUFBLENBQ0QsQ0FBQztTQUNGO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ1csU0FBUyxDQUFDLE1BQWlCOztZQUN4QyxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDO1lBRTFCLDhDQUE4QztZQUM5QyxN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T0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDakYsSUFBSSxPQUFPLGFBQVAsT0FBTyx1QkFBUCxPQUFPLENBQUUsT0FBTztZQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ2pGLElBQUksT0FBTyxhQUFQLE9BQU8sdUJBQVAsT0FBTyxDQUFFLElBQUk7WUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzlELElBQUksT0FBTyxhQUFQLE9BQU8sdUJBQVAsT0FBTyxDQUFFLFFBQVE7WUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDM0UsSUFBSSxPQUFPLGFBQVAsT0FBTyx1QkFBUCxPQUFPLENBQUUsT0FBTztZQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM3RCxJQUFJLE9BQU8sYUFBUCxPQUFPLHVCQUFQLE9BQU8sQ0FBRSxTQUFTO1lBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRW5FLE9BQU8sc0NBQXNDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO0lBQ2xFLENBQUM7SUFFRDs7O09BR0c7SUFDSCxNQUFNLENBQUMsbUJBQW1CLENBQUMsUUFBZ0I7UUFDMUMsT0FBTyx5Q0FBeUMsUUFBUSxFQUFFLENBQUM7SUFDNUQsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIE9ic2lkaWFuIFVSSSBIYW5kbGVyIGZvciBUYXNrIEdlbml1c1xyXG4gKiBIYW5kbGVzIGN1c3RvbSBVUkkgc2NoZW1lOiBvYnNpZGlhbjovL3Rhc2stZ2VuaXVzLy4uLlxyXG4gKi9cclxuXHJcbmltcG9ydCB7IE1vZGFsLCBOb3RpY2UgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiLi4vaW5kZXhcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCIuLi90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFVyaVBhcmFtcyB7XHJcblx0YWN0aW9uPzogc3RyaW5nO1xyXG5cdHRhYj86IHN0cmluZztcclxuXHRzZWN0aW9uPzogc3RyaW5nO1xyXG5cdHNlYXJjaD86IHN0cmluZztcclxuXHRba2V5OiBzdHJpbmddOiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBPYnNpZGlhblVyaUhhbmRsZXIge1xyXG5cdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblxyXG5cdGNvbnN0cnVjdG9yKHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luKSB7XHJcblx0XHR0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlZ2lzdGVyIHRoZSBVUkkgaGFuZGxlciB3aXRoIE9ic2lkaWFuXHJcblx0ICovXHJcblx0cmVnaXN0ZXIoKTogdm9pZCB7XHJcblx0XHQvLyBSZWdpc3RlciB0aGUgbWFpbiBoYW5kbGVyXHJcblx0XHR0aGlzLnBsdWdpbi5yZWdpc3Rlck9ic2lkaWFuUHJvdG9jb2xIYW5kbGVyKFxyXG5cdFx0XHRcInRhc2stZ2VuaXVzXCIsXHJcblx0XHRcdGFzeW5jIChwYXJhbXM6IFVyaVBhcmFtcykgPT4ge1xyXG5cdFx0XHRcdGF3YWl0IHRoaXMuaGFuZGxlVXJpKHBhcmFtcyk7XHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gUmVnaXN0ZXIgc3BlY2lmaWMgYWN0aW9uIGhhbmRsZXJzIGZvciBkaXJlY3QgcGF0aCBhY2Nlc3NcclxuXHRcdC8vIFRoaXMgYWxsb3dzIGJvdGggZm9ybWF0czogb2JzaWRpYW46Ly90YXNrLWdlbml1cz9hY3Rpb249c2V0dGluZ3NcclxuXHRcdC8vIGFuZCBvYnNpZGlhbjovL3Rhc2stZ2VuaXVzL3NldHRpbmdzXHJcblx0XHRjb25zdCBhY3Rpb25zID0gW1wic2V0dGluZ3NcIiwgXCJjcmVhdGUtdGFza1wiLCBcIm9wZW4tdmlld1wiXTtcclxuXHRcdGZvciAoY29uc3QgYWN0aW9uIG9mIGFjdGlvbnMpIHtcclxuXHRcdFx0dGhpcy5wbHVnaW4ucmVnaXN0ZXJPYnNpZGlhblByb3RvY29sSGFuZGxlcihcclxuXHRcdFx0XHRgdGFzay1nZW5pdXMvJHthY3Rpb259YCxcclxuXHRcdFx0XHRhc3luYyAocGFyYW1zOiBVcmlQYXJhbXMpID0+IHtcclxuXHRcdFx0XHRcdC8vIFNldCB0aGUgYWN0aW9uIGV4cGxpY2l0bHkgc2luY2UgaXQncyBpbiB0aGUgcGF0aFxyXG5cdFx0XHRcdFx0YXdhaXQgdGhpcy5oYW5kbGVVcmkoeyAuLi5wYXJhbXMsIGFjdGlvbiB9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBIYW5kbGUgaW5jb21pbmcgVVJJIHJlcXVlc3RzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhc3luYyBoYW5kbGVVcmkocGFyYW1zOiBVcmlQYXJhbXMpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGNvbnN0IHsgYWN0aW9uIH0gPSBwYXJhbXM7XHJcblxyXG5cdFx0Ly8gRGVmYXVsdCB0byBzZXR0aW5ncyBhY3Rpb24gaWYgbm90IHNwZWNpZmllZFxyXG5cdFx0Y29uc3QgdXJpQWN0aW9uID0gYWN0aW9uIHx8IFwic2V0dGluZ3NcIjtcclxuXHJcblx0XHRzd2l0Y2ggKHVyaUFjdGlvbikge1xyXG5cdFx0XHRjYXNlIFwic2V0dGluZ3NcIjpcclxuXHRcdFx0XHRhd2FpdCB0aGlzLmhhbmRsZVNldHRpbmdzVXJpKHBhcmFtcyk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgXCJjcmVhdGUtdGFza1wiOlxyXG5cdFx0XHRcdGF3YWl0IHRoaXMuaGFuZGxlQ3JlYXRlVGFza1VyaShwYXJhbXMpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwib3Blbi12aWV3XCI6XHJcblx0XHRcdFx0YXdhaXQgdGhpcy5oYW5kbGVPcGVuVmlld1VyaShwYXJhbXMpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdG5ldyBOb3RpY2UodChcIlVua25vd24gVVJJIGFjdGlvbjogXCIpICsgdXJpQWN0aW9uKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSBzZXR0aW5ncy1yZWxhdGVkIFVSSVxyXG5cdCAqIEV4YW1wbGU6IG9ic2lkaWFuOi8vdGFzay1nZW5pdXMvc2V0dGluZ3M/dGFiPW1jcC1pbnRlZ3JhdGlvbiZhY3Rpb249ZW5hYmxlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhc3luYyBoYW5kbGVTZXR0aW5nc1VyaShwYXJhbXM6IFVyaVBhcmFtcyk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Y29uc3QgeyB0YWIsIHNlY3Rpb24sIHNlYXJjaCB9ID0gcGFyYW1zO1xyXG5cclxuXHRcdC8vIE9wZW4gc2V0dGluZ3NcclxuXHRcdGNvbnN0IHNldHRpbmdzID0gKHRoaXMucGx1Z2luLmFwcCBhcyBhbnkpLnNldHRpbmc7XHJcblx0XHRzZXR0aW5ncy5vcGVuKCk7XHJcblx0XHRzZXR0aW5ncy5vcGVuVGFiQnlJZCh0aGlzLnBsdWdpbi5tYW5pZmVzdC5pZCk7XHJcblxyXG5cdFx0Ly8gV2FpdCBmb3Igc2V0dGluZ3MgdG8gYmUgcmVhZHlcclxuXHRcdGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDApKTtcclxuXHJcblx0XHQvLyBOYXZpZ2F0ZSB0byBzcGVjaWZpYyB0YWIgaWYgcHJvdmlkZWRcclxuXHRcdGlmICh0YWIpIHtcclxuXHRcdFx0dGhpcy5uYXZpZ2F0ZVRvU2V0dGluZ3NUYWIodGFiLCBzZWN0aW9uLCBzZWFyY2gpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEhhbmRsZSBzcGVjaWZpYyBhY3Rpb25zXHJcblx0XHRpZiAocGFyYW1zLmFjdGlvbikge1xyXG5cdFx0XHRhd2FpdCB0aGlzLmhhbmRsZVNldHRpbmdzQWN0aW9uKHBhcmFtcy5hY3Rpb24sIHRhYik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBOYXZpZ2F0ZSB0byBhIHNwZWNpZmljIHNldHRpbmdzIHRhYlxyXG5cdCAqL1xyXG5cdHByaXZhdGUgbmF2aWdhdGVUb1NldHRpbmdzVGFiKFxyXG5cdFx0dGFiTmFtZTogc3RyaW5nLFxyXG5cdFx0c2VjdGlvbj86IHN0cmluZyxcclxuXHRcdHNlYXJjaD86IHN0cmluZ1xyXG5cdCk6IHZvaWQge1xyXG5cdFx0Ly8gVXNlIHRoZSBzZXR0aW5nVGFiJ3MgbmF2aWdhdGlvbiBtZXRob2QgaWYgYXZhaWxhYmxlXHJcblx0XHRpZiAodGhpcy5wbHVnaW4uc2V0dGluZ1RhYiAmJiB0aGlzLnBsdWdpbi5zZXR0aW5nVGFiLm5hdmlnYXRlVG9UYWIpIHtcclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ1RhYi5uYXZpZ2F0ZVRvVGFiKHRhYk5hbWUsIHNlY3Rpb24sIHNlYXJjaCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBGYWxsYmFjazogTWFwIHRhYiBuYW1lcyB0byB0YWIgaW5kaWNlcyBvciBpZGVudGlmaWVyc1xyXG5cdFx0Y29uc3QgdGFiTWFwOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xyXG5cdFx0XHRcImdlbmVyYWxcIjogXCJnZW5lcmFsXCIsXHJcblx0XHRcdFwiaW5kZXhcIjogXCJpbmRleFwiLFxyXG5cdFx0XHRcInZpZXctc2V0dGluZ3NcIjogXCJ2aWV3LXNldHRpbmdzXCIsIFxyXG5cdFx0XHRcImZpbGUtZmlsdGVyXCI6IFwiZmlsZS1maWx0ZXJcIixcclxuXHRcdFx0XCJwcm9ncmVzcy1iYXJcIjogXCJwcm9ncmVzcy1iYXJcIixcclxuXHRcdFx0XCJ0YXNrLXN0YXR1c1wiOiBcInRhc2stc3RhdHVzXCIsXHJcblx0XHRcdFwidGFzay1oYW5kbGVyXCI6IFwidGFzay1oYW5kbGVyXCIsXHJcblx0XHRcdFwid29ya2Zsb3dcIjogXCJ3b3JrZmxvd1wiLFxyXG5cdFx0XHRcInJld2FyZFwiOiBcInJld2FyZFwiLFxyXG5cdFx0XHRcImhhYml0XCI6IFwiaGFiaXRcIixcclxuXHRcdFx0XCJtY3AtaW50ZWdyYXRpb25cIjogXCJtY3AtaW50ZWdyYXRpb25cIixcclxuXHRcdFx0XCJpY3NcIjogXCJpY3NcIixcclxuXHRcdFx0XCJ0aW1lLXBhcnNpbmdcIjogXCJ0aW1lLXBhcnNpbmdcIixcclxuXHRcdFx0XCJiZXRhLXRlc3RcIjogXCJiZXRhLXRlc3RcIixcclxuXHRcdFx0XCJhYm91dFwiOiBcImFib3V0XCJcclxuXHRcdH07XHJcblxyXG5cdFx0Y29uc3QgdGFiSWQgPSB0YWJNYXBbdGFiTmFtZV07XHJcblx0XHRpZiAoIXRhYklkKSB7XHJcblx0XHRcdG5ldyBOb3RpY2UodChcIlVua25vd24gc2V0dGluZ3MgdGFiOiBcIikgKyB0YWJOYW1lKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEZhbGxiYWNrIGltcGxlbWVudGF0aW9uXHJcblx0XHRjb25zdCBtb2RhbCA9ICh0aGlzLnBsdWdpbi5hcHAgYXMgYW55KS5zZXR0aW5nLmFjdGl2ZVRhYjtcclxuXHRcdGlmICghbW9kYWwpIHJldHVybjtcclxuXHJcblx0XHQvLyBGaW5kIGFuZCBjbGljayB0aGUgdGFiXHJcblx0XHRjb25zdCB0YWJCdXR0b25zID0gbW9kYWwuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvckFsbChcIi5zZXR0aW5ncy10YWJcIik7XHJcblx0XHR0YWJCdXR0b25zLmZvckVhY2goKGJ1dHRvbjogSFRNTEVsZW1lbnQpID0+IHtcclxuXHRcdFx0Y29uc3QgYnV0dG9uVGV4dCA9IGJ1dHRvbi50ZXh0Q29udGVudD8udG9Mb3dlckNhc2UoKTtcclxuXHRcdFx0aWYgKGJ1dHRvblRleHQgJiYgYnV0dG9uVGV4dC5pbmNsdWRlcyh0YWJOYW1lLnJlcGxhY2UoXCItXCIsIFwiIFwiKSkpIHtcclxuXHRcdFx0XHRidXR0b24uY2xpY2soKTtcclxuXHJcblx0XHRcdFx0Ly8gSWYgdGhlcmUncyBhIHNlY3Rpb24sIHRyeSB0byBzY3JvbGwgdG8gaXRcclxuXHRcdFx0XHRpZiAoc2VjdGlvbikge1xyXG5cdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMuc2Nyb2xsVG9TZWN0aW9uKHNlY3Rpb24pO1xyXG5cdFx0XHRcdFx0fSwgMjAwKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIElmIHRoZXJlJ3MgYSBzZWFyY2ggdGVybSwgdHJ5IHRvIGZvY3VzIHRoZSBzZWFyY2hcclxuXHRcdFx0XHRpZiAoc2VhcmNoKSB7XHJcblx0XHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5wZXJmb3JtU2V0dGluZ3NTZWFyY2goc2VhcmNoKTtcclxuXHRcdFx0XHRcdH0sIDMwMCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNjcm9sbCB0byBhIHNwZWNpZmljIHNlY3Rpb24gd2l0aGluIHRoZSBzZXR0aW5nc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgc2Nyb2xsVG9TZWN0aW9uKHNlY3Rpb25JZDogc3RyaW5nKTogdm9pZCB7XHJcblx0XHRjb25zdCBtb2RhbCA9ICh0aGlzLnBsdWdpbi5hcHAgYXMgYW55KS5zZXR0aW5nLmFjdGl2ZVRhYjtcclxuXHRcdGlmICghbW9kYWwpIHJldHVybjtcclxuXHJcblx0XHQvLyBMb29rIGZvciBzZWN0aW9uIGhlYWRlcnNcclxuXHRcdGNvbnN0IGhlYWRlcnMgPSBtb2RhbC5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKFwiaDMsIGg0XCIpO1xyXG5cdFx0aGVhZGVycy5mb3JFYWNoKChoZWFkZXI6IEhUTUxFbGVtZW50KSA9PiB7XHJcblx0XHRcdGNvbnN0IGhlYWRlclRleHQgPSBoZWFkZXIudGV4dENvbnRlbnQ/LnRvTG93ZXJDYXNlKCk7XHJcblx0XHRcdGlmIChoZWFkZXJUZXh0ICYmIGhlYWRlclRleHQuaW5jbHVkZXMoc2VjdGlvbklkLnJlcGxhY2UoXCItXCIsIFwiIFwiKSkpIHtcclxuXHRcdFx0XHRoZWFkZXIuc2Nyb2xsSW50b1ZpZXcoeyBiZWhhdmlvcjogXCJzbW9vdGhcIiwgYmxvY2s6IFwic3RhcnRcIiB9KTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gU3BlY2lhbCBoYW5kbGluZyBmb3Igc3BlY2lmaWMgc2VjdGlvbnNcclxuXHRcdGlmIChzZWN0aW9uSWQgPT09IFwiY3Vyc29yXCIpIHtcclxuXHRcdFx0Ly8gTG9vayBmb3IgQ3Vyc29yIGNvbmZpZ3VyYXRpb24gc2VjdGlvblxyXG5cdFx0XHRjb25zdCBjdXJzb3JTZWN0aW9uID0gbW9kYWwuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvcihcIi5tY3AtY2xpZW50LXNlY3Rpb25cIik7XHJcblx0XHRcdGlmIChjdXJzb3JTZWN0aW9uKSB7XHJcblx0XHRcdFx0Y29uc3QgaGVhZGVyID0gY3Vyc29yU2VjdGlvbi5xdWVyeVNlbGVjdG9yKFwiLm1jcC1jbGllbnQtaGVhZGVyXCIpO1xyXG5cdFx0XHRcdGlmIChoZWFkZXIgJiYgaGVhZGVyLnRleHRDb250ZW50Py5pbmNsdWRlcyhcIkN1cnNvclwiKSkge1xyXG5cdFx0XHRcdFx0Ly8gQ2xpY2sgdG8gZXhwYW5kXHJcblx0XHRcdFx0XHQoaGVhZGVyIGFzIEhUTUxFbGVtZW50KS5jbGljaygpO1xyXG5cdFx0XHRcdFx0Y3Vyc29yU2VjdGlvbi5zY3JvbGxJbnRvVmlldyh7IGJlaGF2aW9yOiBcInNtb290aFwiLCBibG9jazogXCJzdGFydFwiIH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUGVyZm9ybSBhIHNlYXJjaCBpbiB0aGUgc2V0dGluZ3NcclxuXHQgKi9cclxuXHRwcml2YXRlIHBlcmZvcm1TZXR0aW5nc1NlYXJjaChzZWFyY2hUZXJtOiBzdHJpbmcpOiB2b2lkIHtcclxuXHRcdGNvbnN0IG1vZGFsID0gKHRoaXMucGx1Z2luLmFwcCBhcyBhbnkpLnNldHRpbmcuYWN0aXZlVGFiO1xyXG5cdFx0aWYgKCFtb2RhbCkgcmV0dXJuO1xyXG5cclxuXHRcdC8vIEZpbmQgdGhlIHNlYXJjaCBpbnB1dFxyXG5cdFx0Y29uc3Qgc2VhcmNoSW5wdXQgPSBtb2RhbC5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRcImlucHV0W3R5cGU9J3NlYXJjaCddLCBpbnB1dC5zZWFyY2gtaW5wdXRcIlxyXG5cdFx0KSBhcyBIVE1MSW5wdXRFbGVtZW50O1xyXG5cclxuXHRcdGlmIChzZWFyY2hJbnB1dCkge1xyXG5cdFx0XHRzZWFyY2hJbnB1dC52YWx1ZSA9IHNlYXJjaFRlcm07XHJcblx0XHRcdHNlYXJjaElucHV0LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KFwiaW5wdXRcIiwgeyBidWJibGVzOiB0cnVlIH0pKTtcclxuXHRcdFx0c2VhcmNoSW5wdXQuZm9jdXMoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSBzcGVjaWZpYyBhY3Rpb25zIHdpdGhpbiBzZXR0aW5nc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgaGFuZGxlU2V0dGluZ3NBY3Rpb24oXHJcblx0XHRhY3Rpb246IHN0cmluZyxcclxuXHRcdHRhYj86IHN0cmluZ1xyXG5cdCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Ly8gV2FpdCBmb3Igc2V0dGluZ3MgdG8gYmUgZnVsbHkgbG9hZGVkXHJcblx0XHRhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNTAwKSk7XHJcblxyXG5cdFx0Y29uc3QgbW9kYWwgPSAodGhpcy5wbHVnaW4uYXBwIGFzIGFueSkuc2V0dGluZy5hY3RpdmVUYWIgYXMgTW9kYWw7XHJcblx0XHRpZiAoIW1vZGFsKSByZXR1cm47XHJcblxyXG5cdFx0c3dpdGNoIChhY3Rpb24pIHtcclxuXHRcdFx0Y2FzZSBcImVuYWJsZVwiOlxyXG5cdFx0XHRcdGlmICh0YWIgPT09IFwibWNwLWludGVncmF0aW9uXCIpIHtcclxuXHRcdFx0XHRcdC8vIEZpbmQgYW5kIGNsaWNrIHRoZSBlbmFibGUgdG9nZ2xlXHJcblx0XHRcdFx0XHRjb25zdCB0b2dnbGUgPSBtb2RhbC5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRcdFx0XHRcIi5zZXR0aW5nLWl0ZW06aGFzKC5zZXR0aW5nLWl0ZW0tbmFtZTpjb250YWlucygnRW5hYmxlIE1DUCBTZXJ2ZXInKSkgLmNoZWNrYm94LWNvbnRhaW5lciBpbnB1dFwiXHJcblx0XHRcdFx0XHQpIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcblx0XHRcdFx0XHRpZiAodG9nZ2xlICYmICF0b2dnbGUuY2hlY2tlZCkge1xyXG5cdFx0XHRcdFx0XHR0b2dnbGUuY2xpY2soKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRjYXNlIFwidGVzdFwiOlxyXG5cdFx0XHRcdGlmICh0YWIgPT09IFwibWNwLWludGVncmF0aW9uXCIpIHtcclxuXHRcdFx0XHRcdC8vIEZpbmQgYW5kIGNsaWNrIHRoZSB0ZXN0IGJ1dHRvblxyXG5cdFx0XHRcdFx0Y29uc3QgdGVzdEJ1dHRvbiA9IEFycmF5LmZyb20oXHJcblx0XHRcdFx0XHRcdG1vZGFsLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoXCJidXR0b25cIilcclxuXHRcdFx0XHRcdCkuZmluZChidG4gPT4gYnRuLnRleHRDb250ZW50ID09PSB0KFwiVGVzdFwiKSk7XHJcblx0XHRcdFx0XHRpZiAodGVzdEJ1dHRvbikge1xyXG5cdFx0XHRcdFx0XHQodGVzdEJ1dHRvbiBhcyBIVE1MQnV0dG9uRWxlbWVudCkuY2xpY2soKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRjYXNlIFwicmVnZW5lcmF0ZS10b2tlblwiOlxyXG5cdFx0XHRcdGlmICh0YWIgPT09IFwibWNwLWludGVncmF0aW9uXCIpIHtcclxuXHRcdFx0XHRcdC8vIEZpbmQgYW5kIGNsaWNrIHRoZSByZWdlbmVyYXRlIGJ1dHRvblxyXG5cdFx0XHRcdFx0Y29uc3QgcmVnZW5lcmF0ZUJ1dHRvbiA9IEFycmF5LmZyb20oXHJcblx0XHRcdFx0XHRcdG1vZGFsLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoXCJidXR0b25cIilcclxuXHRcdFx0XHRcdCkuZmluZChidG4gPT4gYnRuLnRleHRDb250ZW50ID09PSB0KFwiUmVnZW5lcmF0ZVwiKSk7XHJcblx0XHRcdFx0XHRpZiAocmVnZW5lcmF0ZUJ1dHRvbikge1xyXG5cdFx0XHRcdFx0XHQocmVnZW5lcmF0ZUJ1dHRvbiBhcyBIVE1MQnV0dG9uRWxlbWVudCkuY2xpY2soKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBIYW5kbGUgY3JlYXRlIHRhc2sgVVJJXHJcblx0ICogRXhhbXBsZTogb2JzaWRpYW46Ly90YXNrLWdlbml1cy9jcmVhdGUtdGFzaz9jb250ZW50PU15JTIwVGFzayZwcm9qZWN0PVdvcmtcclxuXHQgKi9cclxuXHRwcml2YXRlIGFzeW5jIGhhbmRsZUNyZWF0ZVRhc2tVcmkocGFyYW1zOiBVcmlQYXJhbXMpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGNvbnN0IHtcclxuXHRcdFx0Y29udGVudCxcclxuXHRcdFx0cHJvamVjdCxcclxuXHRcdFx0Y29udGV4dCxcclxuXHRcdFx0dGFncyxcclxuXHRcdFx0cHJpb3JpdHksXHJcblx0XHRcdGR1ZURhdGUsXHJcblx0XHRcdHN0YXJ0RGF0ZVxyXG5cdFx0fSA9IHBhcmFtcztcclxuXHJcblx0XHRpZiAoIWNvbnRlbnQpIHtcclxuXHRcdFx0bmV3IE5vdGljZSh0KFwiVGFzayBjb250ZW50IGlzIHJlcXVpcmVkXCIpKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFBhcnNlIHRhZ3MgaWYgcHJvdmlkZWQgYXMgY29tbWEtc2VwYXJhdGVkXHJcblx0XHRjb25zdCB0YXNrVGFncyA9IHRhZ3MgPyB0YWdzLnNwbGl0KFwiLFwiKS5tYXAodCA9PiB0LnRyaW0oKSkgOiBbXTtcclxuXHJcblx0XHQvLyBDcmVhdGUgdGhlIHRhc2sgdXNpbmcgV3JpdGVBUElcclxuXHRcdHRyeSB7XHJcblx0XHRcdGlmICghdGhpcy5wbHVnaW4ud3JpdGVBUEkpIHtcclxuXHRcdFx0XHRuZXcgTm90aWNlKHQoXCJUYXNrIHN5c3RlbSBub3QgaW5pdGlhbGl6ZWRcIikpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gR2V0IHRoZSBkYWlseSBub3RlIG9yIGNyZWF0ZSBpbiBpbmJveFxyXG5cdFx0XHRjb25zdCBkYWlseU5vdGVQYXRoID0gdGhpcy5wbHVnaW4uYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVGaWxlKCk/LnBhdGggfHwgXHJcblx0XHRcdFx0YERhaWx5LyR7bmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNwbGl0KCdUJylbMF19Lm1kYDtcclxuXHJcblx0XHRcdGF3YWl0IHRoaXMucGx1Z2luLndyaXRlQVBJLmNyZWF0ZVRhc2soe1xyXG5cdFx0XHRcdGNvbnRlbnQ6IGRlY29kZVVSSUNvbXBvbmVudChjb250ZW50KSxcclxuXHRcdFx0XHRwcm9qZWN0OiBwcm9qZWN0ID8gZGVjb2RlVVJJQ29tcG9uZW50KHByb2plY3QpIDogdW5kZWZpbmVkLFxyXG5cdFx0XHRcdGNvbnRleHQ6IGNvbnRleHQgPyBkZWNvZGVVUklDb21wb25lbnQoY29udGV4dCkgOiB1bmRlZmluZWQsXHJcblx0XHRcdFx0dGFnczogdGFza1RhZ3MsXHJcblx0XHRcdFx0cHJpb3JpdHk6IHByaW9yaXR5ID8gcGFyc2VJbnQocHJpb3JpdHkpIDogdW5kZWZpbmVkLFxyXG5cdFx0XHRcdGR1ZURhdGU6IGR1ZURhdGUgfHwgdW5kZWZpbmVkLFxyXG5cdFx0XHRcdHN0YXJ0RGF0ZTogc3RhcnREYXRlIHx8IHVuZGVmaW5lZCxcclxuXHRcdFx0XHRmaWxlUGF0aDogZGFpbHlOb3RlUGF0aFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdG5ldyBOb3RpY2UodChcIlRhc2sgY3JlYXRlZCBzdWNjZXNzZnVsbHlcIikpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBjcmVhdGUgdGFzayBmcm9tIFVSSTpcIiwgZXJyb3IpO1xyXG5cdFx0XHRuZXcgTm90aWNlKHQoXCJGYWlsZWQgdG8gY3JlYXRlIHRhc2tcIikpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSGFuZGxlIG9wZW4gdmlldyBVUklcclxuXHQgKiBFeGFtcGxlOiBvYnNpZGlhbjovL3Rhc2stZ2VuaXVzL29wZW4tdmlldz90eXBlPWluYm94XHJcblx0ICovXHJcblx0cHJpdmF0ZSBhc3luYyBoYW5kbGVPcGVuVmlld1VyaShwYXJhbXM6IFVyaVBhcmFtcyk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Y29uc3QgeyB0eXBlIH0gPSBwYXJhbXM7XHJcblxyXG5cdFx0aWYgKCF0eXBlKSB7XHJcblx0XHRcdG5ldyBOb3RpY2UodChcIlZpZXcgdHlwZSBpcyByZXF1aXJlZFwiKSk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBNYXAgdmlldyB0eXBlcyB0byBsZWFmIHR5cGVzXHJcblx0XHRjb25zdCB2aWV3TWFwOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xyXG5cdFx0XHRcImluYm94XCI6IFwidGFzay1wcm9ncmVzcy1iYXItdmlld1wiLFxyXG5cdFx0XHRcImZvcmVjYXN0XCI6IFwidGFzay1wcm9ncmVzcy1iYXItdmlld1wiLFxyXG5cdFx0XHRcInByb2plY3RcIjogXCJ0YXNrLXByb2dyZXNzLWJhci12aWV3XCIsXHJcblx0XHRcdFwidGFnXCI6IFwidGFzay1wcm9ncmVzcy1iYXItdmlld1wiLFxyXG5cdFx0XHRcInJldmlld1wiOiBcInRhc2stcHJvZ3Jlc3MtYmFyLXZpZXdcIixcclxuXHRcdFx0XCJjYWxlbmRhclwiOiBcInRhc2stcHJvZ3Jlc3MtYmFyLXZpZXdcIixcclxuXHRcdFx0XCJnYW50dFwiOiBcInRhc2stcHJvZ3Jlc3MtYmFyLXZpZXdcIixcclxuXHRcdFx0XCJrYW5iYW5cIjogXCJ0YXNrLXByb2dyZXNzLWJhci12aWV3XCIsXHJcblx0XHRcdFwibWF0cml4XCI6IFwidGFzay1wcm9ncmVzcy1iYXItdmlld1wiLFxyXG5cdFx0XHRcInRhYmxlXCI6IFwidGFzay1wcm9ncmVzcy1iYXItdmlld1wiXHJcblx0XHR9O1xyXG5cclxuXHRcdGNvbnN0IGxlYWZUeXBlID0gdmlld01hcFt0eXBlXTtcclxuXHRcdGlmICghbGVhZlR5cGUpIHtcclxuXHRcdFx0bmV3IE5vdGljZSh0KFwiVW5rbm93biB2aWV3IHR5cGU6IFwiKSArIHR5cGUpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gT3BlbiB0aGUgdmlld1xyXG5cdFx0Y29uc3QgbGVhZiA9IHRoaXMucGx1Z2luLmFwcC53b3Jrc3BhY2UuZ2V0TGVhZih0cnVlKTtcclxuXHRcdGF3YWl0IGxlYWYuc2V0Vmlld1N0YXRlKHtcclxuXHRcdFx0dHlwZTogbGVhZlR5cGUsXHJcblx0XHRcdHN0YXRlOiB7IHZpZXdUeXBlOiB0eXBlIH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMucGx1Z2luLmFwcC53b3Jrc3BhY2UucmV2ZWFsTGVhZihsZWFmKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdlbmVyYXRlIFVSSSBmb3Igc2V0dGluZ3NcclxuXHQgKiBVc2VzIHRoZSBjbGVhbmVyIHBhdGggZm9ybWF0OiBvYnNpZGlhbjovL3Rhc2stZ2VuaXVzL3NldHRpbmdzP3RhYj0uLi5cclxuXHQgKi9cclxuXHRzdGF0aWMgZ2VuZXJhdGVTZXR0aW5nc1VyaShcclxuXHRcdHRhYj86IHN0cmluZyxcclxuXHRcdHNlY3Rpb24/OiBzdHJpbmcsXHJcblx0XHRhY3Rpb24/OiBzdHJpbmcsXHJcblx0XHRzZWFyY2g/OiBzdHJpbmdcclxuXHQpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcygpO1xyXG5cdFx0aWYgKHRhYikgcGFyYW1zLnNldChcInRhYlwiLCB0YWIpO1xyXG5cdFx0aWYgKHNlY3Rpb24pIHBhcmFtcy5zZXQoXCJzZWN0aW9uXCIsIHNlY3Rpb24pO1xyXG5cdFx0aWYgKGFjdGlvbikgcGFyYW1zLnNldChcImFjdGlvblwiLCBhY3Rpb24pO1xyXG5cdFx0aWYgKHNlYXJjaCkgcGFyYW1zLnNldChcInNlYXJjaFwiLCBzZWFyY2gpO1xyXG5cclxuXHRcdGNvbnN0IHF1ZXJ5U3RyaW5nID0gcGFyYW1zLnRvU3RyaW5nKCk7XHJcblx0XHRyZXR1cm4gYG9ic2lkaWFuOi8vdGFzay1nZW5pdXMvc2V0dGluZ3Mke3F1ZXJ5U3RyaW5nID8gXCI/XCIgKyBxdWVyeVN0cmluZyA6IFwiXCJ9YDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdlbmVyYXRlIFVSSSBmb3IgY3JlYXRpbmcgYSB0YXNrXHJcblx0ICogVXNlcyB0aGUgY2xlYW5lciBwYXRoIGZvcm1hdDogb2JzaWRpYW46Ly90YXNrLWdlbml1cy9jcmVhdGUtdGFzaz9jb250ZW50PS4uLlxyXG5cdCAqL1xyXG5cdHN0YXRpYyBnZW5lcmF0ZUNyZWF0ZVRhc2tVcmkoXHJcblx0XHRjb250ZW50OiBzdHJpbmcsXHJcblx0XHRvcHRpb25zPzoge1xyXG5cdFx0XHRwcm9qZWN0Pzogc3RyaW5nO1xyXG5cdFx0XHRjb250ZXh0Pzogc3RyaW5nO1xyXG5cdFx0XHR0YWdzPzogc3RyaW5nW107XHJcblx0XHRcdHByaW9yaXR5PzogbnVtYmVyO1xyXG5cdFx0XHRkdWVEYXRlPzogc3RyaW5nO1xyXG5cdFx0XHRzdGFydERhdGU/OiBzdHJpbmc7XHJcblx0XHR9XHJcblx0KTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoKTtcclxuXHRcdHBhcmFtcy5zZXQoXCJjb250ZW50XCIsIGVuY29kZVVSSUNvbXBvbmVudChjb250ZW50KSk7XHJcblxyXG5cdFx0aWYgKG9wdGlvbnM/LnByb2plY3QpIHBhcmFtcy5zZXQoXCJwcm9qZWN0XCIsIGVuY29kZVVSSUNvbXBvbmVudChvcHRpb25zLnByb2plY3QpKTtcclxuXHRcdGlmIChvcHRpb25zPy5jb250ZXh0KSBwYXJhbXMuc2V0KFwiY29udGV4dFwiLCBlbmNvZGVVUklDb21wb25lbnQob3B0aW9ucy5jb250ZXh0KSk7XHJcblx0XHRpZiAob3B0aW9ucz8udGFncykgcGFyYW1zLnNldChcInRhZ3NcIiwgb3B0aW9ucy50YWdzLmpvaW4oXCIsXCIpKTtcclxuXHRcdGlmIChvcHRpb25zPy5wcmlvcml0eSkgcGFyYW1zLnNldChcInByaW9yaXR5XCIsIG9wdGlvbnMucHJpb3JpdHkudG9TdHJpbmcoKSk7XHJcblx0XHRpZiAob3B0aW9ucz8uZHVlRGF0ZSkgcGFyYW1zLnNldChcImR1ZURhdGVcIiwgb3B0aW9ucy5kdWVEYXRlKTtcclxuXHRcdGlmIChvcHRpb25zPy5zdGFydERhdGUpIHBhcmFtcy5zZXQoXCJzdGFydERhdGVcIiwgb3B0aW9ucy5zdGFydERhdGUpO1xyXG5cclxuXHRcdHJldHVybiBgb2JzaWRpYW46Ly90YXNrLWdlbml1cy9jcmVhdGUtdGFzaz8ke3BhcmFtcy50b1N0cmluZygpfWA7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZW5lcmF0ZSBVUkkgZm9yIG9wZW5pbmcgYSB2aWV3XHJcblx0ICogVXNlcyB0aGUgY2xlYW5lciBwYXRoIGZvcm1hdDogb2JzaWRpYW46Ly90YXNrLWdlbml1cy9vcGVuLXZpZXc/dHlwZT0uLi5cclxuXHQgKi9cclxuXHRzdGF0aWMgZ2VuZXJhdGVPcGVuVmlld1VyaSh2aWV3VHlwZTogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdHJldHVybiBgb2JzaWRpYW46Ly90YXNrLWdlbml1cy9vcGVuLXZpZXc/dHlwZT0ke3ZpZXdUeXBlfWA7XHJcblx0fVxyXG59Il19