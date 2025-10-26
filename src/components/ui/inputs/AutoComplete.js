import { __awaiter } from "tslib";
import { AbstractInputSuggest, prepareFuzzySearch, } from "obsidian";
let globalCache = null;
const CACHE_DURATION = 30000; // 30 seconds
// Helper function to get cached data
function getCachedData(plugin, forceRefresh = false) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const now = Date.now();
        if (forceRefresh) {
            globalCache = null;
        }
        if (!globalCache || now - globalCache.lastUpdate > CACHE_DURATION) {
            // Fetch fresh data
            const tags = Object.keys(plugin.app.metadataCache.getTags() || {}).map((tag) => tag.substring(1) // Remove # prefix
            );
            // Get projects and contexts from dataflow using the new convenience method
            let projects = [];
            let contexts = [];
            if (plugin.dataflowOrchestrator) {
                try {
                    const queryAPI = plugin.dataflowOrchestrator.getQueryAPI();
                    const data = yield queryAPI.getAvailableContextsAndProjects();
                    projects = data.projects;
                    contexts = data.contexts;
                }
                catch (error) {
                    console.warn("Failed to get projects/contexts from dataflow:", error);
                }
            }
            // Merge settings-defined projects so newly added ones appear immediately
            try {
                const cfg = (_a = plugin.settings) === null || _a === void 0 ? void 0 : _a.projectConfig;
                if (cfg) {
                    // Custom projects (V2)
                    const custom = (cfg.customProjects || [])
                        .map((p) => p.name)
                        .filter(Boolean);
                    projects.push(...custom);
                    // Path mappings
                    const mapped = (cfg.pathMappings || [])
                        .filter((m) => m.enabled !== false)
                        .map((m) => m.projectName)
                        .filter(Boolean);
                    projects.push(...mapped);
                }
            }
            catch (e) {
                console.warn("Failed to merge settings-defined projects:", e);
            }
            // Deduplicate and sort
            const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
            projects = uniq(projects).sort();
            contexts = uniq(contexts).sort();
            globalCache = {
                tags,
                projects,
                contexts,
                lastUpdate: now,
            };
        }
        return globalCache;
    });
}
class BaseSuggest extends AbstractInputSuggest {
    constructor(app, inputEl) {
        super(app, inputEl);
        this.inputEl = inputEl;
    }
    // Common method to render suggestions
    renderSuggestion(item, el) {
        el.setText(this.getSuggestionText(item));
    }
    // Common method to select suggestion
    selectSuggestion(item, evt) {
        if (!this.inputEl) {
            console.warn("BaseSuggest: inputEl is undefined, cannot set value");
            this.close();
            return;
        }
        this.inputEl.value = this.getSuggestionValue(item);
        this.inputEl.trigger("input"); // Trigger change event
        this.close();
    }
}
class CustomSuggest extends BaseSuggest {
    constructor(app, inputEl, availableChoices) {
        super(app, inputEl);
        this.availableChoices = [];
        this.availableChoices = availableChoices;
    }
    getSuggestions(query) {
        if (!query) {
            return this.availableChoices.slice(0, 100); // Limit initial suggestions
        }
        const fuzzySearch = prepareFuzzySearch(query.toLowerCase());
        return this.availableChoices
            .filter((cmd // Add type to cmd
        ) => fuzzySearch(cmd.toLowerCase()) // Call the returned function
        )
            .slice(0, 100);
    }
    getSuggestionText(item) {
        return item;
    }
    getSuggestionValue(item) {
        return item;
    }
}
/**
 * ProjectSuggest - Provides autocomplete for project names
 */
export class ProjectSuggest extends CustomSuggest {
    constructor(app, inputEl, plugin) {
        // Initialize with empty list, will be populated asynchronously
        super(app, inputEl, []);
        // Load fresh data immediately so newly added projects appear
        getCachedData(plugin, true).then((cachedData) => {
            this.availableChoices = cachedData.projects;
        });
        // Refresh on focus to pick up recent changes (settings/index updates)
        inputEl.addEventListener("focus", () => __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield getCachedData(plugin, true);
                this.availableChoices = data.projects;
            }
            catch (e) {
                console.warn("ProjectSuggest: failed to refresh projects on focus", e);
            }
        }));
    }
}
/**
 * ContextSuggest - Provides autocomplete for context names
 */
export class ContextSuggest extends CustomSuggest {
    constructor(app, inputEl, plugin) {
        // Initialize with empty list, will be populated asynchronously
        super(app, inputEl, []);
        // Load cached data asynchronously
        getCachedData(plugin).then((cachedData) => {
            this.availableChoices = cachedData.contexts;
        });
    }
}
/**
 * TagSuggest - Provides autocomplete for tag names
 */
export class TagSuggest extends CustomSuggest {
    constructor(app, inputEl, plugin) {
        // Initialize with empty list, will be populated asynchronously
        super(app, inputEl, []);
        // Load cached data asynchronously
        getCachedData(plugin).then((cachedData) => {
            this.availableChoices = cachedData.tags;
        });
    }
    // Override getSuggestions to handle comma-separated tags
    getSuggestions(query) {
        const parts = query.split(",");
        const currentTagInput = parts[parts.length - 1].trim();
        if (!currentTagInput) {
            return this.availableChoices.slice(0, 100);
        }
        const fuzzySearch = prepareFuzzySearch(currentTagInput.toLowerCase());
        return this.availableChoices
            .filter((tag) => fuzzySearch(tag.toLowerCase()))
            .slice(0, 100);
    }
    // Override to add # prefix and keep previous tags
    getSuggestionValue(item) {
        const currentValue = this.inputEl.value;
        const parts = currentValue.split(",");
        // Replace the last part with the selected tag
        parts[parts.length - 1] = `#${item}`;
        // Join back with commas and add a new comma for the next tag
        return `${parts.join(",")},`;
    }
    // Override to display full tag
    getSuggestionText(item) {
        return `#${item}`;
    }
}
export class SingleFolderSuggest extends CustomSuggest {
    constructor(app, inputEl, plugin) {
        const folders = app.vault.getAllFolders();
        const paths = folders.map((file) => file.path);
        super(app, inputEl, ["/", ...paths]);
    }
}
/**
 * PathSuggest - Provides autocomplete for file paths
 */
export class FolderSuggest extends CustomSuggest {
    constructor(app, inputEl, plugin, outputType = "multiple") {
        // Get all markdown files in the vault
        const folders = app.vault.getAllFolders();
        const paths = folders.map((file) => file.path);
        super(app, inputEl, paths);
        this.plugin = plugin;
        this.outputType = outputType;
    }
    // Override getSuggestions to handle comma-separated paths
    getSuggestions(query) {
        if (this.outputType === "multiple") {
            const parts = query.split(",");
            const currentPathInput = parts[parts.length - 1].trim();
            if (!currentPathInput) {
                return this.availableChoices.slice(0, 20);
            }
            const fuzzySearch = prepareFuzzySearch(currentPathInput.toLowerCase());
            return this.availableChoices
                .filter((path) => fuzzySearch(path.toLowerCase()))
                .sort((a, b) => {
                // Sort by path length (shorter paths first)
                // This helps prioritize files in the root or with shorter paths
                return a.length - b.length;
            })
                .slice(0, 20);
        }
        else {
            // Single mode - search the entire query
            if (!query.trim()) {
                return this.availableChoices.slice(0, 20);
            }
            const fuzzySearch = prepareFuzzySearch(query.toLowerCase());
            return this.availableChoices
                .filter((path) => fuzzySearch(path.toLowerCase()))
                .sort((a, b) => {
                // Sort by path length (shorter paths first)
                // This helps prioritize files in the root or with shorter paths
                return a.length - b.length;
            })
                .slice(0, 20);
        }
    }
    // Override to display the path with folder structure
    getSuggestionText(item) {
        return item;
    }
    // Override to keep previous paths and add the selected one
    getSuggestionValue(item) {
        if (this.outputType === "multiple") {
            const currentValue = this.inputEl.value;
            const parts = currentValue.split(",");
            // Replace the last part with the selected path
            parts[parts.length - 1] = item;
            // Join back with commas but don't add trailing comma
            return parts.join(",");
        }
        else {
            // Single mode - just return the selected item
            return item;
        }
    }
}
/**
 * ImageSuggest - Provides autocomplete for image paths
 */
export class ImageSuggest extends CustomSuggest {
    constructor(app, inputEl, plugin) {
        // Get all images in the vault
        const images = app.vault
            .getFiles()
            .filter((file) => file.extension === "png" ||
            file.extension === "jpg" ||
            file.extension === "jpeg" ||
            file.extension === "gif" ||
            file.extension === "svg" ||
            file.extension === "webp");
        const paths = images.map((file) => file.path);
        super(app, inputEl, paths);
    }
}
/**
 * A class that provides file suggestions for the quick capture target field
 */
export class FileSuggest extends AbstractInputSuggest {
    constructor(app, inputEl, options, onFileSelected) {
        super(app, inputEl);
        this.currentTarget = "Quick Capture.md";
        this.suggestEl.addClass("quick-capture-file-suggest");
        this.currentTarget = options.targetFile || "Quick Capture.md";
        this.onFileSelected =
            onFileSelected ||
                ((file) => {
                    this.setValue(file.path);
                });
        // Register Alt+X hotkey to focus target input
        this.scope.register(["Alt"], "x", (e) => {
            inputEl.focus();
            return true;
        });
        // Set initial value
        this.setValue(this.currentTarget);
        // Register callback for selection
        this.onSelect((file, evt) => {
            this.onFileSelected(file);
        });
    }
    getSuggestions(query) {
        const files = this.app.vault.getMarkdownFiles();
        const lowerCaseQuery = query.toLowerCase();
        // Use fuzzy search for better matching
        const fuzzySearcher = prepareFuzzySearch(lowerCaseQuery);
        // Filter and sort results
        return files
            .map((file) => {
            const result = fuzzySearcher(file.path);
            return result ? { file, score: result.score } : null;
        })
            .filter((match) => match !== null)
            .sort((a, b) => {
            // Sort by score (higher is better)
            return b.score - a.score;
        })
            .map((match) => match.file)
            .slice(0, 10); // Limit results
    }
    renderSuggestion(file, el) {
        el.setText(file.path);
    }
    selectSuggestion(file, evt) {
        this.setValue(file.path);
        this.onFileSelected(file);
        this.close();
    }
}
/**
 * SimpleFileSuggest - Provides autocomplete for file paths
 */
export class SimpleFileSuggest extends AbstractInputSuggest {
    constructor(inputEl, plugin, onFileSelected) {
        super(plugin.app, inputEl);
        this.onFileSelected = onFileSelected || (() => { });
    }
    getSuggestions(query) {
        const files = this.app.vault.getMarkdownFiles();
        const lowerCaseQuery = query.toLowerCase();
        // Use fuzzy search for better matching
        const fuzzySearcher = prepareFuzzySearch(lowerCaseQuery);
        // Filter and sort results
        return files
            .map((file) => {
            const result = fuzzySearcher(file.path);
            return result ? { file, score: result.score } : null;
        })
            .filter((match) => match !== null)
            .sort((a, b) => {
            // Sort by score (higher is better)
            return b.score - a.score;
        })
            .map((match) => match.file)
            .slice(0, 10); // Limit results
    }
    renderSuggestion(file, el) {
        el.setText(file.path);
    }
    selectSuggestion(file, evt) {
        var _a;
        this.setValue(file.path);
        (_a = this.onFileSelected) === null || _a === void 0 ? void 0 : _a.call(this, file);
        this.close();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXV0b0NvbXBsZXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQXV0b0NvbXBsZXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBQ04sb0JBQW9CLEVBRXBCLGtCQUFrQixHQUdsQixNQUFNLFVBQVUsQ0FBQztBQVlsQixJQUFJLFdBQVcsR0FBbUMsSUFBSSxDQUFDO0FBQ3ZELE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxDQUFDLGFBQWE7QUFFM0MscUNBQXFDO0FBQ3JDLFNBQWUsYUFBYSxDQUMzQixNQUE2QixFQUM3QixlQUF3QixLQUFLOzs7UUFFN0IsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBRXZCLElBQUksWUFBWSxFQUFFO1lBQ2pCLFdBQVcsR0FBRyxJQUFJLENBQUM7U0FDbkI7UUFFRCxJQUFJLENBQUMsV0FBVyxJQUFJLEdBQUcsR0FBRyxXQUFXLENBQUMsVUFBVSxHQUFHLGNBQWMsRUFBRTtZQUNsRSxtQkFBbUI7WUFDbkIsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQ3JFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLGtCQUFrQjthQUM1QyxDQUFDO1lBRUYsMkVBQTJFO1lBQzNFLElBQUksUUFBUSxHQUFhLEVBQUUsQ0FBQztZQUM1QixJQUFJLFFBQVEsR0FBYSxFQUFFLENBQUM7WUFFNUIsSUFBSSxNQUFNLENBQUMsb0JBQW9CLEVBQUU7Z0JBQ2hDLElBQUk7b0JBQ0gsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsRUFBRSxDQUFDO29CQUMzRCxNQUFNLElBQUksR0FBRyxNQUFNLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSxDQUFDO29CQUM5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QUMsS0FBSyxFQUEyQyxFQUFFLENBQ2xELEtBQUssS0FBSyxJQUFJLENBQ2Y7YUFDQSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDZCxtQ0FBbUM7WUFDbkMsT0FBTyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDMUIsQ0FBQyxDQUFDO2FBQ0QsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO2FBQzFCLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0I7SUFDakMsQ0FBQztJQUVELGdCQUFnQixDQUFDLElBQVcsRUFBRSxFQUFlO1FBQzVDLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxJQUFXLEVBQUUsR0FBK0I7O1FBQzVELElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pCLE1BQUEsSUFBSSxDQUFDLGNBQWMscURBQUcsSUFBSSxDQUFDLENBQUM7UUFDNUIsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ2QsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcclxuXHRBYnN0cmFjdElucHV0U3VnZ2VzdCxcclxuXHRBcHAsXHJcblx0cHJlcGFyZUZ1enp5U2VhcmNoLFxyXG5cdFNjb3BlLFxyXG5cdFRGaWxlLFxyXG59IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7IFF1aWNrQ2FwdHVyZU9wdGlvbnMgfSBmcm9tIFwiQC9lZGl0b3ItZXh0ZW5zaW9ucy9jb3JlL3F1aWNrLWNhcHR1cmUtcGFuZWxcIjtcclxuXHJcbi8vIEdsb2JhbCBjYWNoZSBmb3IgYXV0b2NvbXBsZXRlIGRhdGEgdG8gYXZvaWQgcmVwZWF0ZWQgZXhwZW5zaXZlIG9wZXJhdGlvbnNcclxuaW50ZXJmYWNlIEdsb2JhbEF1dG9Db21wbGV0ZUNhY2hlIHtcclxuXHR0YWdzOiBzdHJpbmdbXTtcclxuXHRwcm9qZWN0czogc3RyaW5nW107XHJcblx0Y29udGV4dHM6IHN0cmluZ1tdO1xyXG5cdGxhc3RVcGRhdGU6IG51bWJlcjtcclxufVxyXG5cclxubGV0IGdsb2JhbENhY2hlOiBHbG9iYWxBdXRvQ29tcGxldGVDYWNoZSB8IG51bGwgPSBudWxsO1xyXG5jb25zdCBDQUNIRV9EVVJBVElPTiA9IDMwMDAwOyAvLyAzMCBzZWNvbmRzXHJcblxyXG4vLyBIZWxwZXIgZnVuY3Rpb24gdG8gZ2V0IGNhY2hlZCBkYXRhXHJcbmFzeW5jIGZ1bmN0aW9uIGdldENhY2hlZERhdGEoXHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0Zm9yY2VSZWZyZXNoOiBib29sZWFuID0gZmFsc2VcclxuKTogUHJvbWlzZTxHbG9iYWxBdXRvQ29tcGxldGVDYWNoZT4ge1xyXG5cdGNvbnN0IG5vdyA9IERhdGUubm93KCk7XHJcblxyXG5cdGlmIChmb3JjZVJlZnJlc2gpIHtcclxuXHRcdGdsb2JhbENhY2hlID0gbnVsbDtcclxuXHR9XHJcblxyXG5cdGlmICghZ2xvYmFsQ2FjaGUgfHwgbm93IC0gZ2xvYmFsQ2FjaGUubGFzdFVwZGF0ZSA+IENBQ0hFX0RVUkFUSU9OKSB7XHJcblx0XHQvLyBGZXRjaCBmcmVzaCBkYXRhXHJcblx0XHRjb25zdCB0YWdzID0gT2JqZWN0LmtleXMocGx1Z2luLmFwcC5tZXRhZGF0YUNhY2hlLmdldFRhZ3MoKSB8fCB7fSkubWFwKFxyXG5cdFx0XHQodGFnKSA9PiB0YWcuc3Vic3RyaW5nKDEpIC8vIFJlbW92ZSAjIHByZWZpeFxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBHZXQgcHJvamVjdHMgYW5kIGNvbnRleHRzIGZyb20gZGF0YWZsb3cgdXNpbmcgdGhlIG5ldyBjb252ZW5pZW5jZSBtZXRob2RcclxuXHRcdGxldCBwcm9qZWN0czogc3RyaW5nW10gPSBbXTtcclxuXHRcdGxldCBjb250ZXh0czogc3RyaW5nW10gPSBbXTtcclxuXHJcblx0XHRpZiAocGx1Z2luLmRhdGFmbG93T3JjaGVzdHJhdG9yKSB7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Y29uc3QgcXVlcnlBUEkgPSBwbHVnaW4uZGF0YWZsb3dPcmNoZXN0cmF0b3IuZ2V0UXVlcnlBUEkoKTtcclxuXHRcdFx0XHRjb25zdCBkYXRhID0gYXdhaXQgcXVlcnlBUEkuZ2V0QXZhaWxhYmxlQ29udGV4dHNBbmRQcm9qZWN0cygpO1xyXG5cdFx0XHRcdHByb2plY3RzID0gZGF0YS5wcm9qZWN0cztcclxuXHRcdFx0XHRjb250ZXh0cyA9IGRhdGEuY29udGV4dHM7XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0XCJGYWlsZWQgdG8gZ2V0IHByb2plY3RzL2NvbnRleHRzIGZyb20gZGF0YWZsb3c6XCIsXHJcblx0XHRcdFx0XHRlcnJvclxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBNZXJnZSBzZXR0aW5ncy1kZWZpbmVkIHByb2plY3RzIHNvIG5ld2x5IGFkZGVkIG9uZXMgYXBwZWFyIGltbWVkaWF0ZWx5XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBjZmcgPSBwbHVnaW4uc2V0dGluZ3M/LnByb2plY3RDb25maWc7XHJcblx0XHRcdGlmIChjZmcpIHtcclxuXHRcdFx0XHQvLyBDdXN0b20gcHJvamVjdHMgKFYyKVxyXG5cdFx0XHRcdGNvbnN0IGN1c3RvbSA9IChjZmcuY3VzdG9tUHJvamVjdHMgfHwgW10pXHJcblx0XHRcdFx0XHQubWFwKChwKSA9PiBwLm5hbWUpXHJcblx0XHRcdFx0XHQuZmlsdGVyKEJvb2xlYW4pO1xyXG5cdFx0XHRcdHByb2plY3RzLnB1c2goLi4uY3VzdG9tKTtcclxuXHRcdFx0XHQvLyBQYXRoIG1hcHBpbmdzXHJcblx0XHRcdFx0Y29uc3QgbWFwcGVkID0gKGNmZy5wYXRoTWFwcGluZ3MgfHwgW10pXHJcblx0XHRcdFx0XHQuZmlsdGVyKChtKSA9PiAobSBhcyBhbnkpLmVuYWJsZWQgIT09IGZhbHNlKVxyXG5cdFx0XHRcdFx0Lm1hcCgobSkgPT4gbS5wcm9qZWN0TmFtZSlcclxuXHRcdFx0XHRcdC5maWx0ZXIoQm9vbGVhbik7XHJcblx0XHRcdFx0cHJvamVjdHMucHVzaCguLi5tYXBwZWQpO1xyXG5cdFx0XHR9XHJcblx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcIkZhaWxlZCB0byBtZXJnZSBzZXR0aW5ncy1kZWZpbmVkIHByb2plY3RzOlwiLCBlKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBEZWR1cGxpY2F0ZSBhbmQgc29ydFxyXG5cdFx0Y29uc3QgdW5pcSA9IChhcnI6IHN0cmluZ1tdKSA9PlxyXG5cdFx0XHRBcnJheS5mcm9tKG5ldyBTZXQoYXJyLmZpbHRlcihCb29sZWFuKSkpO1xyXG5cdFx0cHJvamVjdHMgPSB1bmlxKHByb2plY3RzKS5zb3J0KCk7XHJcblx0XHRjb250ZXh0cyA9IHVuaXEoY29udGV4dHMpLnNvcnQoKTtcclxuXHJcblx0XHRnbG9iYWxDYWNoZSA9IHtcclxuXHRcdFx0dGFncyxcclxuXHRcdFx0cHJvamVjdHMsXHJcblx0XHRcdGNvbnRleHRzLFxyXG5cdFx0XHRsYXN0VXBkYXRlOiBub3csXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIGdsb2JhbENhY2hlO1xyXG59XHJcblxyXG5hYnN0cmFjdCBjbGFzcyBCYXNlU3VnZ2VzdDxUPiBleHRlbmRzIEFic3RyYWN0SW5wdXRTdWdnZXN0PFQ+IHtcclxuXHRjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcHVibGljIGlucHV0RWw6IEhUTUxJbnB1dEVsZW1lbnQpIHtcclxuXHRcdHN1cGVyKGFwcCwgaW5wdXRFbCk7XHJcblx0fVxyXG5cclxuXHQvLyBDb21tb24gbWV0aG9kIHRvIHJlbmRlciBzdWdnZXN0aW9uc1xyXG5cdHJlbmRlclN1Z2dlc3Rpb24oaXRlbTogVCwgZWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHRlbC5zZXRUZXh0KHRoaXMuZ2V0U3VnZ2VzdGlvblRleHQoaXRlbSkpO1xyXG5cdH1cclxuXHJcblx0Ly8gQ29tbW9uIG1ldGhvZCB0byBzZWxlY3Qgc3VnZ2VzdGlvblxyXG5cdHNlbGVjdFN1Z2dlc3Rpb24oaXRlbTogVCwgZXZ0OiBNb3VzZUV2ZW50IHwgS2V5Ym9hcmRFdmVudCk6IHZvaWQge1xyXG5cdFx0aWYgKCF0aGlzLmlucHV0RWwpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFwiQmFzZVN1Z2dlc3Q6IGlucHV0RWwgaXMgdW5kZWZpbmVkLCBjYW5ub3Qgc2V0IHZhbHVlXCIpO1xyXG5cdFx0XHR0aGlzLmNsb3NlKCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdHRoaXMuaW5wdXRFbC52YWx1ZSA9IHRoaXMuZ2V0U3VnZ2VzdGlvblZhbHVlKGl0ZW0pO1xyXG5cdFx0dGhpcy5pbnB1dEVsLnRyaWdnZXIoXCJpbnB1dFwiKTsgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnRcclxuXHRcdHRoaXMuY2xvc2UoKTtcclxuXHR9XHJcblxyXG5cdC8vIEFic3RyYWN0IG1ldGhvZHMgdG8gYmUgaW1wbGVtZW50ZWQgYnkgc3ViY2xhc3Nlc1xyXG5cdGFic3RyYWN0IGdldFN1Z2dlc3Rpb25UZXh0KGl0ZW06IFQpOiBzdHJpbmc7XHJcblx0YWJzdHJhY3QgZ2V0U3VnZ2VzdGlvblZhbHVlKGl0ZW06IFQpOiBzdHJpbmc7XHJcbn1cclxuXHJcbmNsYXNzIEN1c3RvbVN1Z2dlc3QgZXh0ZW5kcyBCYXNlU3VnZ2VzdDxzdHJpbmc+IHtcclxuXHRwcm90ZWN0ZWQgYXZhaWxhYmxlQ2hvaWNlczogc3RyaW5nW10gPSBbXTtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRhcHA6IEFwcCxcclxuXHRcdGlucHV0RWw6IEhUTUxJbnB1dEVsZW1lbnQsXHJcblx0XHRhdmFpbGFibGVDaG9pY2VzOiBzdHJpbmdbXVxyXG5cdCkge1xyXG5cdFx0c3VwZXIoYXBwLCBpbnB1dEVsKTtcclxuXHRcdHRoaXMuYXZhaWxhYmxlQ2hvaWNlcyA9IGF2YWlsYWJsZUNob2ljZXM7XHJcblx0fVxyXG5cclxuXHRnZXRTdWdnZXN0aW9ucyhxdWVyeTogc3RyaW5nKTogc3RyaW5nW10ge1xyXG5cdFx0aWYgKCFxdWVyeSkge1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5hdmFpbGFibGVDaG9pY2VzLnNsaWNlKDAsIDEwMCk7IC8vIExpbWl0IGluaXRpYWwgc3VnZ2VzdGlvbnNcclxuXHRcdH1cclxuXHRcdGNvbnN0IGZ1enp5U2VhcmNoID0gcHJlcGFyZUZ1enp5U2VhcmNoKHF1ZXJ5LnRvTG93ZXJDYXNlKCkpO1xyXG5cdFx0cmV0dXJuIHRoaXMuYXZhaWxhYmxlQ2hvaWNlc1xyXG5cdFx0XHQuZmlsdGVyKFxyXG5cdFx0XHRcdChcclxuXHRcdFx0XHRcdGNtZDogc3RyaW5nIC8vIEFkZCB0eXBlIHRvIGNtZFxyXG5cdFx0XHRcdCkgPT4gZnV6enlTZWFyY2goY21kLnRvTG93ZXJDYXNlKCkpIC8vIENhbGwgdGhlIHJldHVybmVkIGZ1bmN0aW9uXHJcblx0XHRcdClcclxuXHRcdFx0LnNsaWNlKDAsIDEwMCk7XHJcblx0fVxyXG5cclxuXHRnZXRTdWdnZXN0aW9uVGV4dChpdGVtOiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIGl0ZW07XHJcblx0fVxyXG5cclxuXHRnZXRTdWdnZXN0aW9uVmFsdWUoaXRlbTogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdHJldHVybiBpdGVtO1xyXG5cdH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFByb2plY3RTdWdnZXN0IC0gUHJvdmlkZXMgYXV0b2NvbXBsZXRlIGZvciBwcm9qZWN0IG5hbWVzXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUHJvamVjdFN1Z2dlc3QgZXh0ZW5kcyBDdXN0b21TdWdnZXN0IHtcclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdGFwcDogQXBwLFxyXG5cdFx0aW5wdXRFbDogSFRNTElucHV0RWxlbWVudCxcclxuXHRcdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luXHJcblx0KSB7XHJcblx0XHQvLyBJbml0aWFsaXplIHdpdGggZW1wdHkgbGlzdCwgd2lsbCBiZSBwb3B1bGF0ZWQgYXN5bmNocm9ub3VzbHlcclxuXHRcdHN1cGVyKGFwcCwgaW5wdXRFbCwgW10pO1xyXG5cclxuXHRcdC8vIExvYWQgZnJlc2ggZGF0YSBpbW1lZGlhdGVseSBzbyBuZXdseSBhZGRlZCBwcm9qZWN0cyBhcHBlYXJcclxuXHRcdGdldENhY2hlZERhdGEocGx1Z2luLCB0cnVlKS50aGVuKChjYWNoZWREYXRhKSA9PiB7XHJcblx0XHRcdHRoaXMuYXZhaWxhYmxlQ2hvaWNlcyA9IGNhY2hlZERhdGEucHJvamVjdHM7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBSZWZyZXNoIG9uIGZvY3VzIHRvIHBpY2sgdXAgcmVjZW50IGNoYW5nZXMgKHNldHRpbmdzL2luZGV4IHVwZGF0ZXMpXHJcblx0XHRpbnB1dEVsLmFkZEV2ZW50TGlzdGVuZXIoXCJmb2N1c1wiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Y29uc3QgZGF0YSA9IGF3YWl0IGdldENhY2hlZERhdGEocGx1Z2luLCB0cnVlKTtcclxuXHRcdFx0XHR0aGlzLmF2YWlsYWJsZUNob2ljZXMgPSBkYXRhLnByb2plY3RzO1xyXG5cdFx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0XCJQcm9qZWN0U3VnZ2VzdDogZmFpbGVkIHRvIHJlZnJlc2ggcHJvamVjdHMgb24gZm9jdXNcIixcclxuXHRcdFx0XHRcdGVcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb250ZXh0U3VnZ2VzdCAtIFByb3ZpZGVzIGF1dG9jb21wbGV0ZSBmb3IgY29udGV4dCBuYW1lc1xyXG4gKi9cclxuZXhwb3J0IGNsYXNzIENvbnRleHRTdWdnZXN0IGV4dGVuZHMgQ3VzdG9tU3VnZ2VzdCB7XHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRhcHA6IEFwcCxcclxuXHRcdGlucHV0RWw6IEhUTUxJbnB1dEVsZW1lbnQsXHJcblx0XHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpblxyXG5cdCkge1xyXG5cdFx0Ly8gSW5pdGlhbGl6ZSB3aXRoIGVtcHR5IGxpc3QsIHdpbGwgYmUgcG9wdWxhdGVkIGFzeW5jaHJvbm91c2x5XHJcblx0XHRzdXBlcihhcHAsIGlucHV0RWwsIFtdKTtcclxuXHJcblx0XHQvLyBMb2FkIGNhY2hlZCBkYXRhIGFzeW5jaHJvbm91c2x5XHJcblx0XHRnZXRDYWNoZWREYXRhKHBsdWdpbikudGhlbigoY2FjaGVkRGF0YSkgPT4ge1xyXG5cdFx0XHR0aGlzLmF2YWlsYWJsZUNob2ljZXMgPSBjYWNoZWREYXRhLmNvbnRleHRzO1xyXG5cdFx0fSk7XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICogVGFnU3VnZ2VzdCAtIFByb3ZpZGVzIGF1dG9jb21wbGV0ZSBmb3IgdGFnIG5hbWVzXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgVGFnU3VnZ2VzdCBleHRlbmRzIEN1c3RvbVN1Z2dlc3Qge1xyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0YXBwOiBBcHAsXHJcblx0XHRpbnB1dEVsOiBIVE1MSW5wdXRFbGVtZW50LFxyXG5cdFx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW5cclxuXHQpIHtcclxuXHRcdC8vIEluaXRpYWxpemUgd2l0aCBlbXB0eSBsaXN0LCB3aWxsIGJlIHBvcHVsYXRlZCBhc3luY2hyb25vdXNseVxyXG5cdFx0c3VwZXIoYXBwLCBpbnB1dEVsLCBbXSk7XHJcblxyXG5cdFx0Ly8gTG9hZCBjYWNoZWQgZGF0YSBhc3luY2hyb25vdXNseVxyXG5cdFx0Z2V0Q2FjaGVkRGF0YShwbHVnaW4pLnRoZW4oKGNhY2hlZERhdGEpID0+IHtcclxuXHRcdFx0dGhpcy5hdmFpbGFibGVDaG9pY2VzID0gY2FjaGVkRGF0YS50YWdzO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyBPdmVycmlkZSBnZXRTdWdnZXN0aW9ucyB0byBoYW5kbGUgY29tbWEtc2VwYXJhdGVkIHRhZ3NcclxuXHRnZXRTdWdnZXN0aW9ucyhxdWVyeTogc3RyaW5nKTogc3RyaW5nW10ge1xyXG5cdFx0Y29uc3QgcGFydHMgPSBxdWVyeS5zcGxpdChcIixcIik7XHJcblx0XHRjb25zdCBjdXJyZW50VGFnSW5wdXQgPSBwYXJ0c1twYXJ0cy5sZW5ndGggLSAxXS50cmltKCk7XHJcblxyXG5cdFx0aWYgKCFjdXJyZW50VGFnSW5wdXQpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMuYXZhaWxhYmxlQ2hvaWNlcy5zbGljZSgwLCAxMDApO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IGZ1enp5U2VhcmNoID0gcHJlcGFyZUZ1enp5U2VhcmNoKGN1cnJlbnRUYWdJbnB1dC50b0xvd2VyQ2FzZSgpKTtcclxuXHRcdHJldHVybiB0aGlzLmF2YWlsYWJsZUNob2ljZXNcclxuXHRcdFx0LmZpbHRlcigodGFnKSA9PiBmdXp6eVNlYXJjaCh0YWcudG9Mb3dlckNhc2UoKSkpXHJcblx0XHRcdC5zbGljZSgwLCAxMDApO1xyXG5cdH1cclxuXHJcblx0Ly8gT3ZlcnJpZGUgdG8gYWRkICMgcHJlZml4IGFuZCBrZWVwIHByZXZpb3VzIHRhZ3NcclxuXHRnZXRTdWdnZXN0aW9uVmFsdWUoaXRlbTogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IGN1cnJlbnRWYWx1ZSA9IHRoaXMuaW5wdXRFbC52YWx1ZTtcclxuXHRcdGNvbnN0IHBhcnRzID0gY3VycmVudFZhbHVlLnNwbGl0KFwiLFwiKTtcclxuXHJcblx0XHQvLyBSZXBsYWNlIHRoZSBsYXN0IHBhcnQgd2l0aCB0aGUgc2VsZWN0ZWQgdGFnXHJcblx0XHRwYXJ0c1twYXJ0cy5sZW5ndGggLSAxXSA9IGAjJHtpdGVtfWA7XHJcblxyXG5cdFx0Ly8gSm9pbiBiYWNrIHdpdGggY29tbWFzIGFuZCBhZGQgYSBuZXcgY29tbWEgZm9yIHRoZSBuZXh0IHRhZ1xyXG5cdFx0cmV0dXJuIGAke3BhcnRzLmpvaW4oXCIsXCIpfSxgO1xyXG5cdH1cclxuXHJcblx0Ly8gT3ZlcnJpZGUgdG8gZGlzcGxheSBmdWxsIHRhZ1xyXG5cdGdldFN1Z2dlc3Rpb25UZXh0KGl0ZW06IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHRyZXR1cm4gYCMke2l0ZW19YDtcclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBTaW5nbGVGb2xkZXJTdWdnZXN0IGV4dGVuZHMgQ3VzdG9tU3VnZ2VzdCB7XHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRhcHA6IEFwcCxcclxuXHRcdGlucHV0RWw6IEhUTUxJbnB1dEVsZW1lbnQsXHJcblx0XHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpblxyXG5cdCkge1xyXG5cdFx0Y29uc3QgZm9sZGVycyA9IGFwcC52YXVsdC5nZXRBbGxGb2xkZXJzKCk7XHJcblx0XHRjb25zdCBwYXRocyA9IGZvbGRlcnMubWFwKChmaWxlKSA9PiBmaWxlLnBhdGgpO1xyXG5cdFx0c3VwZXIoYXBwLCBpbnB1dEVsLCBbXCIvXCIsIC4uLnBhdGhzXSk7XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICogUGF0aFN1Z2dlc3QgLSBQcm92aWRlcyBhdXRvY29tcGxldGUgZm9yIGZpbGUgcGF0aHNcclxuICovXHJcbmV4cG9ydCBjbGFzcyBGb2xkZXJTdWdnZXN0IGV4dGVuZHMgQ3VzdG9tU3VnZ2VzdCB7XHJcblx0cHJpdmF0ZSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbjtcclxuXHRwcml2YXRlIG91dHB1dFR5cGU6IFwic2luZ2xlXCIgfCBcIm11bHRpcGxlXCI7XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0YXBwOiBBcHAsXHJcblx0XHRpbnB1dEVsOiBIVE1MSW5wdXRFbGVtZW50LFxyXG5cdFx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRvdXRwdXRUeXBlOiBcInNpbmdsZVwiIHwgXCJtdWx0aXBsZVwiID0gXCJtdWx0aXBsZVwiXHJcblx0KSB7XHJcblx0XHQvLyBHZXQgYWxsIG1hcmtkb3duIGZpbGVzIGluIHRoZSB2YXVsdFxyXG5cdFx0Y29uc3QgZm9sZGVycyA9IGFwcC52YXVsdC5nZXRBbGxGb2xkZXJzKCk7XHJcblx0XHRjb25zdCBwYXRocyA9IGZvbGRlcnMubWFwKChmaWxlKSA9PiBmaWxlLnBhdGgpO1xyXG5cdFx0c3VwZXIoYXBwLCBpbnB1dEVsLCBwYXRocyk7XHJcblx0XHR0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuXHRcdHRoaXMub3V0cHV0VHlwZSA9IG91dHB1dFR5cGU7XHJcblx0fVxyXG5cclxuXHQvLyBPdmVycmlkZSBnZXRTdWdnZXN0aW9ucyB0byBoYW5kbGUgY29tbWEtc2VwYXJhdGVkIHBhdGhzXHJcblx0Z2V0U3VnZ2VzdGlvbnMocXVlcnk6IHN0cmluZyk6IHN0cmluZ1tdIHtcclxuXHRcdGlmICh0aGlzLm91dHB1dFR5cGUgPT09IFwibXVsdGlwbGVcIikge1xyXG5cdFx0XHRjb25zdCBwYXJ0cyA9IHF1ZXJ5LnNwbGl0KFwiLFwiKTtcclxuXHRcdFx0Y29uc3QgY3VycmVudFBhdGhJbnB1dCA9IHBhcnRzW3BhcnRzLmxlbmd0aCAtIDFdLnRyaW0oKTtcclxuXHJcblx0XHRcdGlmICghY3VycmVudFBhdGhJbnB1dCkge1xyXG5cdFx0XHRcdHJldHVybiB0aGlzLmF2YWlsYWJsZUNob2ljZXMuc2xpY2UoMCwgMjApO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBmdXp6eVNlYXJjaCA9IHByZXBhcmVGdXp6eVNlYXJjaChcclxuXHRcdFx0XHRjdXJyZW50UGF0aElucHV0LnRvTG93ZXJDYXNlKClcclxuXHRcdFx0KTtcclxuXHRcdFx0cmV0dXJuIHRoaXMuYXZhaWxhYmxlQ2hvaWNlc1xyXG5cdFx0XHRcdC5maWx0ZXIoKHBhdGgpID0+IGZ1enp5U2VhcmNoKHBhdGgudG9Mb3dlckNhc2UoKSkpXHJcblx0XHRcdFx0LnNvcnQoKGEsIGIpID0+IHtcclxuXHRcdFx0XHRcdC8vIFNvcnQgYnkgcGF0aCBsZW5ndGggKHNob3J0ZXIgcGF0aHMgZmlyc3QpXHJcblx0XHRcdFx0XHQvLyBUaGlzIGhlbHBzIHByaW9yaXRpemUgZmlsZXMgaW4gdGhlIHJvb3Qgb3Igd2l0aCBzaG9ydGVyIHBhdGhzXHJcblx0XHRcdFx0XHRyZXR1cm4gYS5sZW5ndGggLSBiLmxlbmd0aDtcclxuXHRcdFx0XHR9KVxyXG5cdFx0XHRcdC5zbGljZSgwLCAyMCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBTaW5nbGUgbW9kZSAtIHNlYXJjaCB0aGUgZW50aXJlIHF1ZXJ5XHJcblx0XHRcdGlmICghcXVlcnkudHJpbSgpKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuYXZhaWxhYmxlQ2hvaWNlcy5zbGljZSgwLCAyMCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IGZ1enp5U2VhcmNoID0gcHJlcGFyZUZ1enp5U2VhcmNoKHF1ZXJ5LnRvTG93ZXJDYXNlKCkpO1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5hdmFpbGFibGVDaG9pY2VzXHJcblx0XHRcdFx0LmZpbHRlcigocGF0aCkgPT4gZnV6enlTZWFyY2gocGF0aC50b0xvd2VyQ2FzZSgpKSlcclxuXHRcdFx0XHQuc29ydCgoYSwgYikgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gU29ydCBieSBwYXRoIGxlbmd0aCAoc2hvcnRlciBwYXRocyBmaXJzdClcclxuXHRcdFx0XHRcdC8vIFRoaXMgaGVscHMgcHJpb3JpdGl6ZSBmaWxlcyBpbiB0aGUgcm9vdCBvciB3aXRoIHNob3J0ZXIgcGF0aHNcclxuXHRcdFx0XHRcdHJldHVybiBhLmxlbmd0aCAtIGIubGVuZ3RoO1xyXG5cdFx0XHRcdH0pXHJcblx0XHRcdFx0LnNsaWNlKDAsIDIwKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIE92ZXJyaWRlIHRvIGRpc3BsYXkgdGhlIHBhdGggd2l0aCBmb2xkZXIgc3RydWN0dXJlXHJcblx0Z2V0U3VnZ2VzdGlvblRleHQoaXRlbTogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdHJldHVybiBpdGVtO1xyXG5cdH1cclxuXHJcblx0Ly8gT3ZlcnJpZGUgdG8ga2VlcCBwcmV2aW91cyBwYXRocyBhbmQgYWRkIHRoZSBzZWxlY3RlZCBvbmVcclxuXHRnZXRTdWdnZXN0aW9uVmFsdWUoaXRlbTogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdGlmICh0aGlzLm91dHB1dFR5cGUgPT09IFwibXVsdGlwbGVcIikge1xyXG5cdFx0XHRjb25zdCBjdXJyZW50VmFsdWUgPSB0aGlzLmlucHV0RWwudmFsdWU7XHJcblx0XHRcdGNvbnN0IHBhcnRzID0gY3VycmVudFZhbHVlLnNwbGl0KFwiLFwiKTtcclxuXHJcblx0XHRcdC8vIFJlcGxhY2UgdGhlIGxhc3QgcGFydCB3aXRoIHRoZSBzZWxlY3RlZCBwYXRoXHJcblx0XHRcdHBhcnRzW3BhcnRzLmxlbmd0aCAtIDFdID0gaXRlbTtcclxuXHJcblx0XHRcdC8vIEpvaW4gYmFjayB3aXRoIGNvbW1hcyBidXQgZG9uJ3QgYWRkIHRyYWlsaW5nIGNvbW1hXHJcblx0XHRcdHJldHVybiBwYXJ0cy5qb2luKFwiLFwiKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIFNpbmdsZSBtb2RlIC0ganVzdCByZXR1cm4gdGhlIHNlbGVjdGVkIGl0ZW1cclxuXHRcdFx0cmV0dXJuIGl0ZW07XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICogSW1hZ2VTdWdnZXN0IC0gUHJvdmlkZXMgYXV0b2NvbXBsZXRlIGZvciBpbWFnZSBwYXRoc1xyXG4gKi9cclxuZXhwb3J0IGNsYXNzIEltYWdlU3VnZ2VzdCBleHRlbmRzIEN1c3RvbVN1Z2dlc3Qge1xyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0YXBwOiBBcHAsXHJcblx0XHRpbnB1dEVsOiBIVE1MSW5wdXRFbGVtZW50LFxyXG5cdFx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW5cclxuXHQpIHtcclxuXHRcdC8vIEdldCBhbGwgaW1hZ2VzIGluIHRoZSB2YXVsdFxyXG5cdFx0Y29uc3QgaW1hZ2VzID0gYXBwLnZhdWx0XHJcblx0XHRcdC5nZXRGaWxlcygpXHJcblx0XHRcdC5maWx0ZXIoXHJcblx0XHRcdFx0KGZpbGUpID0+XHJcblx0XHRcdFx0XHRmaWxlLmV4dGVuc2lvbiA9PT0gXCJwbmdcIiB8fFxyXG5cdFx0XHRcdFx0ZmlsZS5leHRlbnNpb24gPT09IFwianBnXCIgfHxcclxuXHRcdFx0XHRcdGZpbGUuZXh0ZW5zaW9uID09PSBcImpwZWdcIiB8fFxyXG5cdFx0XHRcdFx0ZmlsZS5leHRlbnNpb24gPT09IFwiZ2lmXCIgfHxcclxuXHRcdFx0XHRcdGZpbGUuZXh0ZW5zaW9uID09PSBcInN2Z1wiIHx8XHJcblx0XHRcdFx0XHRmaWxlLmV4dGVuc2lvbiA9PT0gXCJ3ZWJwXCJcclxuXHRcdFx0KTtcclxuXHRcdGNvbnN0IHBhdGhzID0gaW1hZ2VzLm1hcCgoZmlsZSkgPT4gZmlsZS5wYXRoKTtcclxuXHRcdHN1cGVyKGFwcCwgaW5wdXRFbCwgcGF0aHMpO1xyXG5cdH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEEgY2xhc3MgdGhhdCBwcm92aWRlcyBmaWxlIHN1Z2dlc3Rpb25zIGZvciB0aGUgcXVpY2sgY2FwdHVyZSB0YXJnZXQgZmllbGRcclxuICovXHJcbmV4cG9ydCBjbGFzcyBGaWxlU3VnZ2VzdCBleHRlbmRzIEFic3RyYWN0SW5wdXRTdWdnZXN0PFRGaWxlPiB7XHJcblx0cHJpdmF0ZSBjdXJyZW50VGFyZ2V0OiBzdHJpbmcgPSBcIlF1aWNrIENhcHR1cmUubWRcIjtcclxuXHRzY29wZTogU2NvcGU7XHJcblx0b25GaWxlU2VsZWN0ZWQ6IChmaWxlOiBURmlsZSkgPT4gdm9pZDtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRhcHA6IEFwcCxcclxuXHRcdGlucHV0RWw6IEhUTUxJbnB1dEVsZW1lbnQgfCBIVE1MRGl2RWxlbWVudCxcclxuXHRcdG9wdGlvbnM6IFF1aWNrQ2FwdHVyZU9wdGlvbnMsXHJcblx0XHRvbkZpbGVTZWxlY3RlZD86IChmaWxlOiBURmlsZSkgPT4gdm9pZFxyXG5cdCkge1xyXG5cdFx0c3VwZXIoYXBwLCBpbnB1dEVsKTtcclxuXHRcdHRoaXMuc3VnZ2VzdEVsLmFkZENsYXNzKFwicXVpY2stY2FwdHVyZS1maWxlLXN1Z2dlc3RcIik7XHJcblx0XHR0aGlzLmN1cnJlbnRUYXJnZXQgPSBvcHRpb25zLnRhcmdldEZpbGUgfHwgXCJRdWljayBDYXB0dXJlLm1kXCI7XHJcblx0XHR0aGlzLm9uRmlsZVNlbGVjdGVkID1cclxuXHRcdFx0b25GaWxlU2VsZWN0ZWQgfHxcclxuXHRcdFx0KChmaWxlOiBURmlsZSkgPT4ge1xyXG5cdFx0XHRcdHRoaXMuc2V0VmFsdWUoZmlsZS5wYXRoKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gUmVnaXN0ZXIgQWx0K1ggaG90a2V5IHRvIGZvY3VzIHRhcmdldCBpbnB1dFxyXG5cdFx0dGhpcy5zY29wZS5yZWdpc3RlcihbXCJBbHRcIl0sIFwieFwiLCAoZTogS2V5Ym9hcmRFdmVudCkgPT4ge1xyXG5cdFx0XHRpbnB1dEVsLmZvY3VzKCk7XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gU2V0IGluaXRpYWwgdmFsdWVcclxuXHRcdHRoaXMuc2V0VmFsdWUodGhpcy5jdXJyZW50VGFyZ2V0KTtcclxuXHJcblx0XHQvLyBSZWdpc3RlciBjYWxsYmFjayBmb3Igc2VsZWN0aW9uXHJcblx0XHR0aGlzLm9uU2VsZWN0KChmaWxlLCBldnQpID0+IHtcclxuXHRcdFx0dGhpcy5vbkZpbGVTZWxlY3RlZChmaWxlKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Z2V0U3VnZ2VzdGlvbnMocXVlcnk6IHN0cmluZyk6IFRGaWxlW10ge1xyXG5cdFx0Y29uc3QgZmlsZXMgPSB0aGlzLmFwcC52YXVsdC5nZXRNYXJrZG93bkZpbGVzKCk7XHJcblx0XHRjb25zdCBsb3dlckNhc2VRdWVyeSA9IHF1ZXJ5LnRvTG93ZXJDYXNlKCk7XHJcblxyXG5cdFx0Ly8gVXNlIGZ1enp5IHNlYXJjaCBmb3IgYmV0dGVyIG1hdGNoaW5nXHJcblx0XHRjb25zdCBmdXp6eVNlYXJjaGVyID0gcHJlcGFyZUZ1enp5U2VhcmNoKGxvd2VyQ2FzZVF1ZXJ5KTtcclxuXHJcblx0XHQvLyBGaWx0ZXIgYW5kIHNvcnQgcmVzdWx0c1xyXG5cdFx0cmV0dXJuIGZpbGVzXHJcblx0XHRcdC5tYXAoKGZpbGUpID0+IHtcclxuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBmdXp6eVNlYXJjaGVyKGZpbGUucGF0aCk7XHJcblx0XHRcdFx0cmV0dXJuIHJlc3VsdCA/IHsgZmlsZSwgc2NvcmU6IHJlc3VsdC5zY29yZSB9IDogbnVsbDtcclxuXHRcdFx0fSlcclxuXHRcdFx0LmZpbHRlcihcclxuXHRcdFx0XHQobWF0Y2gpOiBtYXRjaCBpcyB7IGZpbGU6IFRGaWxlOyBzY29yZTogbnVtYmVyIH0gPT5cclxuXHRcdFx0XHRcdG1hdGNoICE9PSBudWxsXHJcblx0XHRcdClcclxuXHRcdFx0LnNvcnQoKGEsIGIpID0+IHtcclxuXHRcdFx0XHQvLyBTb3J0IGJ5IHNjb3JlIChoaWdoZXIgaXMgYmV0dGVyKVxyXG5cdFx0XHRcdHJldHVybiBiLnNjb3JlIC0gYS5zY29yZTtcclxuXHRcdFx0fSlcclxuXHRcdFx0Lm1hcCgobWF0Y2gpID0+IG1hdGNoLmZpbGUpXHJcblx0XHRcdC5zbGljZSgwLCAxMCk7IC8vIExpbWl0IHJlc3VsdHNcclxuXHR9XHJcblxyXG5cdHJlbmRlclN1Z2dlc3Rpb24oZmlsZTogVEZpbGUsIGVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xyXG5cdFx0ZWwuc2V0VGV4dChmaWxlLnBhdGgpO1xyXG5cdH1cclxuXHJcblx0c2VsZWN0U3VnZ2VzdGlvbihmaWxlOiBURmlsZSwgZXZ0OiBNb3VzZUV2ZW50IHwgS2V5Ym9hcmRFdmVudCk6IHZvaWQge1xyXG5cdFx0dGhpcy5zZXRWYWx1ZShmaWxlLnBhdGgpO1xyXG5cdFx0dGhpcy5vbkZpbGVTZWxlY3RlZChmaWxlKTtcclxuXHRcdHRoaXMuY2xvc2UoKTtcclxuXHR9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTaW1wbGVGaWxlU3VnZ2VzdCAtIFByb3ZpZGVzIGF1dG9jb21wbGV0ZSBmb3IgZmlsZSBwYXRoc1xyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFNpbXBsZUZpbGVTdWdnZXN0IGV4dGVuZHMgQWJzdHJhY3RJbnB1dFN1Z2dlc3Q8VEZpbGU+IHtcclxuXHRwcml2YXRlIG9uRmlsZVNlbGVjdGVkOiAoZmlsZTogVEZpbGUpID0+IHZvaWQ7XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0aW5wdXRFbDogSFRNTElucHV0RWxlbWVudCxcclxuXHRcdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0b25GaWxlU2VsZWN0ZWQ/OiAoZmlsZTogVEZpbGUpID0+IHZvaWRcclxuXHQpIHtcclxuXHRcdHN1cGVyKHBsdWdpbi5hcHAsIGlucHV0RWwpO1xyXG5cdFx0dGhpcy5vbkZpbGVTZWxlY3RlZCA9IG9uRmlsZVNlbGVjdGVkIHx8ICgoKSA9PiB7fSk7XHJcblx0fVxyXG5cclxuXHRnZXRTdWdnZXN0aW9ucyhxdWVyeTogc3RyaW5nKTogVEZpbGVbXSB7XHJcblx0XHRjb25zdCBmaWxlcyA9IHRoaXMuYXBwLnZhdWx0LmdldE1hcmtkb3duRmlsZXMoKTtcclxuXHRcdGNvbnN0IGxvd2VyQ2FzZVF1ZXJ5ID0gcXVlcnkudG9Mb3dlckNhc2UoKTtcclxuXHJcblx0XHQvLyBVc2UgZnV6enkgc2VhcmNoIGZvciBiZXR0ZXIgbWF0Y2hpbmdcclxuXHRcdGNvbnN0IGZ1enp5U2VhcmNoZXIgPSBwcmVwYXJlRnV6enlTZWFyY2gobG93ZXJDYXNlUXVlcnkpO1xyXG5cclxuXHRcdC8vIEZpbHRlciBhbmQgc29ydCByZXN1bHRzXHJcblx0XHRyZXR1cm4gZmlsZXNcclxuXHRcdFx0Lm1hcCgoZmlsZSkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IGZ1enp5U2VhcmNoZXIoZmlsZS5wYXRoKTtcclxuXHRcdFx0XHRyZXR1cm4gcmVzdWx0ID8geyBmaWxlLCBzY29yZTogcmVzdWx0LnNjb3JlIH0gOiBudWxsO1xyXG5cdFx0XHR9KVxyXG5cdFx0XHQuZmlsdGVyKFxyXG5cdFx0XHRcdChtYXRjaCk6IG1hdGNoIGlzIHsgZmlsZTogVEZpbGU7IHNjb3JlOiBudW1iZXIgfSA9PlxyXG5cdFx0XHRcdFx0bWF0Y2ggIT09IG51bGxcclxuXHRcdFx0KVxyXG5cdFx0XHQuc29ydCgoYSwgYikgPT4ge1xyXG5cdFx0XHRcdC8vIFNvcnQgYnkgc2NvcmUgKGhpZ2hlciBpcyBiZXR0ZXIpXHJcblx0XHRcdFx0cmV0dXJuIGIuc2NvcmUgLSBhLnNjb3JlO1xyXG5cdFx0XHR9KVxyXG5cdFx0XHQubWFwKChtYXRjaCkgPT4gbWF0Y2guZmlsZSlcclxuXHRcdFx0LnNsaWNlKDAsIDEwKTsgLy8gTGltaXQgcmVzdWx0c1xyXG5cdH1cclxuXHJcblx0cmVuZGVyU3VnZ2VzdGlvbihmaWxlOiBURmlsZSwgZWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHRlbC5zZXRUZXh0KGZpbGUucGF0aCk7XHJcblx0fVxyXG5cclxuXHRzZWxlY3RTdWdnZXN0aW9uKGZpbGU6IFRGaWxlLCBldnQ6IE1vdXNlRXZlbnQgfCBLZXlib2FyZEV2ZW50KTogdm9pZCB7XHJcblx0XHR0aGlzLnNldFZhbHVlKGZpbGUucGF0aCk7XHJcblx0XHR0aGlzLm9uRmlsZVNlbGVjdGVkPy4oZmlsZSk7XHJcblx0XHR0aGlzLmNsb3NlKCk7XHJcblx0fVxyXG59XHJcbiJdfQ==