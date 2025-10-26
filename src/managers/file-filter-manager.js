/**
 * File Filter Manager
 *
 * Manages file and folder filtering rules for task indexing.
 * Provides efficient path matching and caching mechanisms.
 */
import { normalizePath } from "obsidian";
import { FilterMode, } from "../common/setting-definition";
/**
 * Path Trie Node for efficient path matching
 */
class PathTrieNode {
    constructor() {
        this.children = new Map();
        this.isEndOfPath = false;
        this.isFolder = false;
    }
}
/**
 * Path Trie for efficient folder path matching
 */
class PathTrie {
    constructor() {
        this.root = new PathTrieNode();
    }
    /**
     * Insert a path into the trie
     */
    insert(path, isFolder = true) {
        const parts = normalizePath(path)
            .split("/")
            .filter((part) => part.length > 0);
        let current = this.root;
        for (const part of parts) {
            if (!current.children.has(part)) {
                current.children.set(part, new PathTrieNode());
            }
            current = current.children.get(part);
        }
        current.isEndOfPath = true;
        current.isFolder = isFolder;
    }
    /**
     * Check if a path or its parent is in the trie
     */
    contains(path) {
        const parts = normalizePath(path)
            .split("/")
            .filter((part) => part.length > 0);
        // Try to match the rule starting at any segment in the input path
        for (let start = 0; start < parts.length; start++) {
            let current = this.root;
            for (let i = start; i < parts.length; i++) {
                const part = parts[i];
                if (!current.children.has(part)) {
                    break; // mismatch at this starting position; try next start
                }
                current = current.children.get(part);
                // If this is a folder rule and we're checking a path under it (or exact folder)
                if (current.isEndOfPath && current.isFolder) {
                    return true;
                }
            }
        }
        // No folder rule matched anywhere in the path
        return false;
    }
    /**
     * Clear all paths from the trie
     */
    clear() {
        this.root = new PathTrieNode();
    }
}
/**
 * File Filter Manager
 *
 * Manages filtering rules and provides efficient file/folder filtering
 */
export class FileFilterManager {
    constructor(config) {
        this.folderTrie = new PathTrie(); // global (legacy)
        this.fileSet = new Set(); // global (legacy)
        this.patternRegexes = []; // global (legacy)
        this.cache = new Map();
        this.scopeControls = {
            inlineTasksEnabled: true,
            fileTasksEnabled: true,
        };
        // Scoped indexes for per-rule scope control
        this.folderTrieInline = new PathTrie();
        this.folderTrieFile = new PathTrie();
        this.fileSetInline = new Set();
        this.fileSetFile = new Set();
        this.patternRegexesInline = [];
        this.patternRegexesFile = [];
        this.config = config;
        this.scopeControls = this.normalizeScopeControls(config.scopeControls);
        this.rebuildIndexes();
    }
    /**
     * Update filter configuration
     */
    updateConfig(config) {
        this.config = config;
        this.scopeControls = this.normalizeScopeControls(config.scopeControls);
        this.rebuildIndexes();
        this.clearCache();
    }
    normalizeScopeControls(scopeControls) {
        return {
            inlineTasksEnabled: (scopeControls === null || scopeControls === void 0 ? void 0 : scopeControls.inlineTasksEnabled) !== false,
            fileTasksEnabled: (scopeControls === null || scopeControls === void 0 ? void 0 : scopeControls.fileTasksEnabled) !== false,
        };
    }
    isScopeEnabled(scope) {
        if (scope === "inline") {
            return this.scopeControls.inlineTasksEnabled !== false;
        }
        if (scope === "file") {
            return this.scopeControls.fileTasksEnabled !== false;
        }
        return (this.scopeControls.inlineTasksEnabled !== false ||
            this.scopeControls.fileTasksEnabled !== false);
    }
    /**
     * Check if a file should be included in indexing
     */
    shouldIncludeFile(file, scope = "both") {
        if (!this.isScopeEnabled(scope)) {
            return false;
        }
        if (!this.config.enabled) {
            return true;
        }
        const filePath = file.path;
        const key = this.getCacheKey("file", filePath, scope);
        // Check cache first
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        const result = this.evaluateFile(filePath, scope);
        this.cache.set(key, result);
        return result;
    }
    /**
     * Check if a folder should be included in indexing
     */
    shouldIncludeFolder(folder, scope = "both") {
        if (!this.isScopeEnabled(scope)) {
            return false;
        }
        if (!this.config.enabled) {
            return true;
        }
        const folderPath = folder.path;
        const key = this.getCacheKey("folder", folderPath, scope);
        // Check cache first
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        const result = this.evaluateFolder(folderPath, scope);
        this.cache.set(key, result);
        return result;
    }
    /**
     * Check if a path should be included (generic method)
     */
    shouldIncludePath(path, scope = "both") {
        if (!this.isScopeEnabled(scope)) {
            return false;
        }
        if (!this.config.enabled) {
            return true;
        }
        const key = this.getCacheKey("path", path, scope);
        // Check cache first
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        const result = this.evaluatePath(path, scope);
        this.cache.set(key, result);
        return result;
    }
    /**
     * Get filter statistics
     */
    getStats() {
        return {
            cacheSize: this.cache.size,
            rulesCount: this.config.rules.filter((rule) => rule.enabled).length,
            enabled: this.config.enabled,
        };
    }
    /**
     * Clear the filter cache
     */
    clearCache() {
        this.cache.clear();
    }
    /**
     * Build a cache key that is scoped by kind and scope to avoid cross-scope pollution
     */
    getCacheKey(kind, path, scope) {
        return `${kind}:${scope}:${this.normalizePath(path)}`;
    }
    /**
     * Evaluate if a file should be included
     */
    evaluateFile(filePath, scope = "both") {
        const matches = this.pathMatches(filePath, scope);
        if (this.config.mode === FilterMode.WHITELIST) {
            return matches;
        }
        else {
            return !matches;
        }
    }
    /**
     * Evaluate if a folder should be included
     */
    evaluateFolder(folderPath, scope = "both") {
        const matches = this.pathMatches(folderPath, scope);
        if (this.config.mode === FilterMode.WHITELIST) {
            return matches;
        }
        else {
            return !matches;
        }
    }
    /**
     * Evaluate if a path should be included (generic)
     */
    evaluatePath(path, scope = "both") {
        const matches = this.pathMatches(path, scope);
        const result = this.config.mode === FilterMode.WHITELIST ? matches : !matches;
        return result;
    }
    /**
     * Check if a path matches any filter rule
     */
    pathMatches(path, scope) {
        const normalizedPath = this.normalizePath(path);
        // Pick the right indexes based on scope
        const fileSet = scope === "file"
            ? this.fileSetFile
            : scope === "inline"
                ? this.fileSetInline
                : this.fileSet;
        const folderTrie = scope === "file"
            ? this.folderTrieFile
            : scope === "inline"
                ? this.folderTrieInline
                : this.folderTrie;
        const patternRegexes = scope === "file"
            ? this.patternRegexesFile
            : scope === "inline"
                ? this.patternRegexesInline
                : this.patternRegexes;
        // Detailed match breakdown
        const fileHit = fileSet.has(normalizedPath);
        const folderHit = folderTrie.contains(normalizedPath);
        let patternHit = false;
        for (const regex of patternRegexes) {
            if (regex.test(normalizedPath)) {
                patternHit = true;
                break;
            }
        }
        const matched = fileHit || folderHit || patternHit;
        return matched;
    }
    /**
     * Rebuild internal indexes when configuration changes
     */
    rebuildIndexes() {
        // Clear legacy and scoped indexes
        this.folderTrie.clear();
        this.fileSet.clear();
        this.patternRegexes = [];
        this.folderTrieInline.clear();
        this.folderTrieFile.clear();
        this.fileSetInline.clear();
        this.fileSetFile.clear();
        this.patternRegexesInline = [];
        this.patternRegexesFile = [];
        for (const rule of this.config.rules) {
            if (!rule.enabled)
                continue;
            const scope = rule.scope || "both";
            const addTo = (bucket) => {
                switch (rule.type) {
                    case "file":
                        (bucket === "file"
                            ? this.fileSetFile
                            : bucket === "inline"
                                ? this.fileSetInline
                                : this.fileSet).add(this.normalizePath(rule.path));
                        break;
                    case "folder":
                        (bucket === "file"
                            ? this.folderTrieFile
                            : bucket === "inline"
                                ? this.folderTrieInline
                                : this.folderTrie).insert(rule.path, true);
                        break;
                    case "pattern":
                        try {
                            const regexPattern = this.globToRegex(rule.path);
                            (bucket === "file"
                                ? this.patternRegexesFile
                                : bucket === "inline"
                                    ? this.patternRegexesInline
                                    : this.patternRegexes).push(new RegExp(regexPattern, "i"));
                        }
                        catch (error) {
                            console.warn(`Invalid pattern rule: ${rule.path}`, error);
                        }
                        break;
                }
            };
            // IMPORTANT: When scope is 'both', ensure rules apply to both 'inline' and 'file' scoped indexes
            // Previously only the legacy 'both' index was filled, but lookups for scoped checks ignored it
            if (scope === "both") {
                addTo("both");
                addTo("inline");
                addTo("file");
            }
            else if (scope === "inline") {
                addTo("inline");
            }
            else if (scope === "file") {
                addTo("file");
            }
        }
    }
    /**
     * Convert glob pattern to regex
     */
    globToRegex(pattern) {
        return pattern
            .replace(/\./g, "\\.")
            .replace(/\*/g, ".*")
            .replace(/\?/g, ".")
            .replace(/\[([^\]]+)\]/g, "[$1]");
    }
    /**
     * Normalize path for consistent matching
     */
    normalizePath(path) {
        return path.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS1maWx0ZXItbWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZpbGUtZmlsdGVyLW1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7O0dBS0c7QUFFSCxPQUFPLEVBQUUsYUFBYSxFQUFrQixNQUFNLFVBQVUsQ0FBQztBQUN6RCxPQUFPLEVBQ04sVUFBVSxHQUVWLE1BQU0sOEJBQThCLENBQUM7QUFzQnRDOztHQUVHO0FBQ0gsTUFBTSxZQUFZO0lBQWxCO1FBQ0MsYUFBUSxHQUE4QixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ2hELGdCQUFXLEdBQVksS0FBSyxDQUFDO1FBQzdCLGFBQVEsR0FBWSxLQUFLLENBQUM7SUFDM0IsQ0FBQztDQUFBO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFFBQVE7SUFBZDtRQUNTLFNBQUksR0FBaUIsSUFBSSxZQUFZLEVBQUUsQ0FBQztJQXdEakQsQ0FBQztJQXREQTs7T0FFRztJQUNILE1BQU0sQ0FBQyxJQUFZLEVBQUUsV0FBb0IsSUFBSTtRQUM1QyxNQUFNLEtBQUssR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDO2FBQy9CLEtBQUssQ0FBQyxHQUFHLENBQUM7YUFDVixNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDcEMsSUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztRQUV4QixLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRTtZQUN6QixJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ2hDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLFlBQVksRUFBRSxDQUFDLENBQUM7YUFDL0M7WUFDRCxPQUFPLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFFLENB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RUFBRTtnQkFDNUIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQ2Q7U0FDRDtJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNLLFdBQVcsQ0FBQyxPQUFlO1FBQ2xDLE9BQU8sT0FBTzthQUNaLE9BQU8sQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDO2FBQ3JCLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDO2FBQ3BCLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDO2FBQ25CLE9BQU8sQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVEOztPQUVHO0lBQ0ssYUFBYSxDQUFDLElBQVk7UUFDakMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzNELENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBGaWxlIEZpbHRlciBNYW5hZ2VyXHJcbiAqXHJcbiAqIE1hbmFnZXMgZmlsZSBhbmQgZm9sZGVyIGZpbHRlcmluZyBydWxlcyBmb3IgdGFzayBpbmRleGluZy5cclxuICogUHJvdmlkZXMgZWZmaWNpZW50IHBhdGggbWF0Y2hpbmcgYW5kIGNhY2hpbmcgbWVjaGFuaXNtcy5cclxuICovXHJcblxyXG5pbXBvcnQgeyBub3JtYWxpemVQYXRoLCBURmlsZSwgVEZvbGRlciB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQge1xyXG5cdEZpbHRlck1vZGUsXHJcblx0dHlwZSBGaWxlRmlsdGVyU2NvcGVDb250cm9scyxcclxufSBmcm9tIFwiLi4vY29tbW9uL3NldHRpbmctZGVmaW5pdGlvblwiO1xyXG5cclxuLyoqXHJcbiAqIEZpbHRlciBydWxlIHR5cGVzXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIEZpbHRlclJ1bGUge1xyXG5cdHR5cGU6IFwiZmlsZVwiIHwgXCJmb2xkZXJcIiB8IFwicGF0dGVyblwiO1xyXG5cdHBhdGg6IHN0cmluZztcclxuXHRlbmFibGVkOiBib29sZWFuO1xyXG5cdHNjb3BlPzogXCJib3RoXCIgfCBcImlubGluZVwiIHwgXCJmaWxlXCI7IC8vIHBlci1ydWxlIHNjb3BlXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBGaWxlIGZpbHRlciBjb25maWd1cmF0aW9uXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVGaWx0ZXJDb25maWcge1xyXG5cdGVuYWJsZWQ6IGJvb2xlYW47XHJcblx0bW9kZTogRmlsdGVyTW9kZTtcclxuXHRydWxlczogRmlsdGVyUnVsZVtdO1xyXG5cdHNjb3BlQ29udHJvbHM/OiBGaWxlRmlsdGVyU2NvcGVDb250cm9scztcclxufVxyXG5cclxuLyoqXHJcbiAqIFBhdGggVHJpZSBOb2RlIGZvciBlZmZpY2llbnQgcGF0aCBtYXRjaGluZ1xyXG4gKi9cclxuY2xhc3MgUGF0aFRyaWVOb2RlIHtcclxuXHRjaGlsZHJlbjogTWFwPHN0cmluZywgUGF0aFRyaWVOb2RlPiA9IG5ldyBNYXAoKTtcclxuXHRpc0VuZE9mUGF0aDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cdGlzRm9sZGVyOiBib29sZWFuID0gZmFsc2U7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQYXRoIFRyaWUgZm9yIGVmZmljaWVudCBmb2xkZXIgcGF0aCBtYXRjaGluZ1xyXG4gKi9cclxuY2xhc3MgUGF0aFRyaWUge1xyXG5cdHByaXZhdGUgcm9vdDogUGF0aFRyaWVOb2RlID0gbmV3IFBhdGhUcmllTm9kZSgpO1xyXG5cclxuXHQvKipcclxuXHQgKiBJbnNlcnQgYSBwYXRoIGludG8gdGhlIHRyaWVcclxuXHQgKi9cclxuXHRpbnNlcnQocGF0aDogc3RyaW5nLCBpc0ZvbGRlcjogYm9vbGVhbiA9IHRydWUpOiB2b2lkIHtcclxuXHRcdGNvbnN0IHBhcnRzID0gbm9ybWFsaXplUGF0aChwYXRoKVxyXG5cdFx0XHQuc3BsaXQoXCIvXCIpXHJcblx0XHRcdC5maWx0ZXIoKHBhcnQpID0+IHBhcnQubGVuZ3RoID4gMCk7XHJcblx0XHRsZXQgY3VycmVudCA9IHRoaXMucm9vdDtcclxuXHJcblx0XHRmb3IgKGNvbnN0IHBhcnQgb2YgcGFydHMpIHtcclxuXHRcdFx0aWYgKCFjdXJyZW50LmNoaWxkcmVuLmhhcyhwYXJ0KSkge1xyXG5cdFx0XHRcdGN1cnJlbnQuY2hpbGRyZW4uc2V0KHBhcnQsIG5ldyBQYXRoVHJpZU5vZGUoKSk7XHJcblx0XHRcdH1cclxuXHRcdFx0Y3VycmVudCA9IGN1cnJlbnQuY2hpbGRyZW4uZ2V0KHBhcnQpITtcclxuXHRcdH1cclxuXHJcblx0XHRjdXJyZW50LmlzRW5kT2ZQYXRoID0gdHJ1ZTtcclxuXHRcdGN1cnJlbnQuaXNGb2xkZXIgPSBpc0ZvbGRlcjtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGlmIGEgcGF0aCBvciBpdHMgcGFyZW50IGlzIGluIHRoZSB0cmllXHJcblx0ICovXHJcblx0Y29udGFpbnMocGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0XHRjb25zdCBwYXJ0cyA9IG5vcm1hbGl6ZVBhdGgocGF0aClcclxuXHRcdFx0LnNwbGl0KFwiL1wiKVxyXG5cdFx0XHQuZmlsdGVyKChwYXJ0KSA9PiBwYXJ0Lmxlbmd0aCA+IDApO1xyXG5cclxuXHRcdC8vIFRyeSB0byBtYXRjaCB0aGUgcnVsZSBzdGFydGluZyBhdCBhbnkgc2VnbWVudCBpbiB0aGUgaW5wdXQgcGF0aFxyXG5cdFx0Zm9yIChsZXQgc3RhcnQgPSAwOyBzdGFydCA8IHBhcnRzLmxlbmd0aDsgc3RhcnQrKykge1xyXG5cdFx0XHRsZXQgY3VycmVudCA9IHRoaXMucm9vdDtcclxuXHRcdFx0Zm9yIChsZXQgaSA9IHN0YXJ0OyBpIDwgcGFydHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRjb25zdCBwYXJ0ID0gcGFydHNbaV07XHJcblx0XHRcdFx0aWYgKCFjdXJyZW50LmNoaWxkcmVuLmhhcyhwYXJ0KSkge1xyXG5cdFx0XHRcdFx0YnJlYWs7IC8vIG1pc21hdGNoIGF0IHRoaXMgc3RhcnRpbmcgcG9zaXRpb247IHRyeSBuZXh0IHN0YXJ0XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGN1cnJlbnQgPSBjdXJyZW50LmNoaWxkcmVuLmdldChwYXJ0KSE7XHJcblx0XHRcdFx0Ly8gSWYgdGhpcyBpcyBhIGZvbGRlciBydWxlIGFuZCB3ZSdyZSBjaGVja2luZyBhIHBhdGggdW5kZXIgaXQgKG9yIGV4YWN0IGZvbGRlcilcclxuXHRcdFx0XHRpZiAoY3VycmVudC5pc0VuZE9mUGF0aCAmJiBjdXJyZW50LmlzRm9sZGVyKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBObyBmb2xkZXIgcnVsZSBtYXRjaGVkIGFueXdoZXJlIGluIHRoZSBwYXRoXHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDbGVhciBhbGwgcGF0aHMgZnJvbSB0aGUgdHJpZVxyXG5cdCAqL1xyXG5cdGNsZWFyKCk6IHZvaWQge1xyXG5cdFx0dGhpcy5yb290ID0gbmV3IFBhdGhUcmllTm9kZSgpO1xyXG5cdH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEZpbGUgRmlsdGVyIE1hbmFnZXJcclxuICpcclxuICogTWFuYWdlcyBmaWx0ZXJpbmcgcnVsZXMgYW5kIHByb3ZpZGVzIGVmZmljaWVudCBmaWxlL2ZvbGRlciBmaWx0ZXJpbmdcclxuICovXHJcbmV4cG9ydCBjbGFzcyBGaWxlRmlsdGVyTWFuYWdlciB7XHJcblx0cHJpdmF0ZSBjb25maWc6IEZpbGVGaWx0ZXJDb25maWc7XHJcblx0cHJpdmF0ZSBmb2xkZXJUcmllOiBQYXRoVHJpZSA9IG5ldyBQYXRoVHJpZSgpOyAvLyBnbG9iYWwgKGxlZ2FjeSlcclxuXHRwcml2YXRlIGZpbGVTZXQ6IFNldDxzdHJpbmc+ID0gbmV3IFNldCgpOyAvLyBnbG9iYWwgKGxlZ2FjeSlcclxuXHRwcml2YXRlIHBhdHRlcm5SZWdleGVzOiBSZWdFeHBbXSA9IFtdOyAvLyBnbG9iYWwgKGxlZ2FjeSlcclxuXHRwcml2YXRlIGNhY2hlOiBNYXA8c3RyaW5nLCBib29sZWFuPiA9IG5ldyBNYXAoKTtcclxuXHRwcml2YXRlIHNjb3BlQ29udHJvbHM6IEZpbGVGaWx0ZXJTY29wZUNvbnRyb2xzID0ge1xyXG5cdFx0aW5saW5lVGFza3NFbmFibGVkOiB0cnVlLFxyXG5cdFx0ZmlsZVRhc2tzRW5hYmxlZDogdHJ1ZSxcclxuXHR9O1xyXG5cclxuXHQvLyBTY29wZWQgaW5kZXhlcyBmb3IgcGVyLXJ1bGUgc2NvcGUgY29udHJvbFxyXG5cdHByaXZhdGUgZm9sZGVyVHJpZUlubGluZTogUGF0aFRyaWUgPSBuZXcgUGF0aFRyaWUoKTtcclxuXHRwcml2YXRlIGZvbGRlclRyaWVGaWxlOiBQYXRoVHJpZSA9IG5ldyBQYXRoVHJpZSgpO1xyXG5cdHByaXZhdGUgZmlsZVNldElubGluZTogU2V0PHN0cmluZz4gPSBuZXcgU2V0KCk7XHJcblx0cHJpdmF0ZSBmaWxlU2V0RmlsZTogU2V0PHN0cmluZz4gPSBuZXcgU2V0KCk7XHJcblx0cHJpdmF0ZSBwYXR0ZXJuUmVnZXhlc0lubGluZTogUmVnRXhwW10gPSBbXTtcclxuXHRwcml2YXRlIHBhdHRlcm5SZWdleGVzRmlsZTogUmVnRXhwW10gPSBbXTtcclxuXHJcblx0Y29uc3RydWN0b3IoY29uZmlnOiBGaWxlRmlsdGVyQ29uZmlnKSB7XHJcblx0XHR0aGlzLmNvbmZpZyA9IGNvbmZpZztcclxuXHRcdHRoaXMuc2NvcGVDb250cm9scyA9IHRoaXMubm9ybWFsaXplU2NvcGVDb250cm9scyhcclxuXHRcdFx0Y29uZmlnLnNjb3BlQ29udHJvbHNcclxuXHRcdCk7XHJcblx0XHR0aGlzLnJlYnVpbGRJbmRleGVzKCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgZmlsdGVyIGNvbmZpZ3VyYXRpb25cclxuXHQgKi9cclxuXHR1cGRhdGVDb25maWcoY29uZmlnOiBGaWxlRmlsdGVyQ29uZmlnKTogdm9pZCB7XHJcblx0XHR0aGlzLmNvbmZpZyA9IGNvbmZpZztcclxuXHRcdHRoaXMuc2NvcGVDb250cm9scyA9IHRoaXMubm9ybWFsaXplU2NvcGVDb250cm9scyhcclxuXHRcdFx0Y29uZmlnLnNjb3BlQ29udHJvbHNcclxuXHRcdCk7XHJcblx0XHR0aGlzLnJlYnVpbGRJbmRleGVzKCk7XHJcblx0XHR0aGlzLmNsZWFyQ2FjaGUoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgbm9ybWFsaXplU2NvcGVDb250cm9scyhcclxuXHRcdHNjb3BlQ29udHJvbHM/OiBGaWxlRmlsdGVyU2NvcGVDb250cm9sc1xyXG5cdCk6IEZpbGVGaWx0ZXJTY29wZUNvbnRyb2xzIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGlubGluZVRhc2tzRW5hYmxlZDpcclxuXHRcdFx0XHRzY29wZUNvbnRyb2xzPy5pbmxpbmVUYXNrc0VuYWJsZWQgIT09IGZhbHNlLFxyXG5cdFx0XHRmaWxlVGFza3NFbmFibGVkOlxyXG5cdFx0XHRcdHNjb3BlQ29udHJvbHM/LmZpbGVUYXNrc0VuYWJsZWQgIT09IGZhbHNlLFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaXNTY29wZUVuYWJsZWQoc2NvcGU6IFwiYm90aFwiIHwgXCJpbmxpbmVcIiB8IFwiZmlsZVwiKTogYm9vbGVhbiB7XHJcblx0XHRpZiAoc2NvcGUgPT09IFwiaW5saW5lXCIpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMuc2NvcGVDb250cm9scy5pbmxpbmVUYXNrc0VuYWJsZWQgIT09IGZhbHNlO1xyXG5cdFx0fVxyXG5cdFx0aWYgKHNjb3BlID09PSBcImZpbGVcIikge1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5zY29wZUNvbnRyb2xzLmZpbGVUYXNrc0VuYWJsZWQgIT09IGZhbHNlO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIChcclxuXHRcdFx0dGhpcy5zY29wZUNvbnRyb2xzLmlubGluZVRhc2tzRW5hYmxlZCAhPT0gZmFsc2UgfHxcclxuXHRcdFx0dGhpcy5zY29wZUNvbnRyb2xzLmZpbGVUYXNrc0VuYWJsZWQgIT09IGZhbHNlXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgYSBmaWxlIHNob3VsZCBiZSBpbmNsdWRlZCBpbiBpbmRleGluZ1xyXG5cdCAqL1xyXG5cdHNob3VsZEluY2x1ZGVGaWxlKFxyXG5cdFx0ZmlsZTogVEZpbGUsXHJcblx0XHRzY29wZTogXCJib3RoXCIgfCBcImlubGluZVwiIHwgXCJmaWxlXCIgPSBcImJvdGhcIlxyXG5cdCk6IGJvb2xlYW4ge1xyXG5cdFx0aWYgKCF0aGlzLmlzU2NvcGVFbmFibGVkKHNjb3BlKSkge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblx0XHRpZiAoIXRoaXMuY29uZmlnLmVuYWJsZWQpIHtcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgZmlsZVBhdGggPSBmaWxlLnBhdGg7XHJcblx0XHRjb25zdCBrZXkgPSB0aGlzLmdldENhY2hlS2V5KFwiZmlsZVwiLCBmaWxlUGF0aCwgc2NvcGUpO1xyXG5cdFx0Ly8gQ2hlY2sgY2FjaGUgZmlyc3RcclxuXHRcdGlmICh0aGlzLmNhY2hlLmhhcyhrZXkpKSB7XHJcblx0XHRcdHJldHVybiB0aGlzLmNhY2hlLmdldChrZXkpITtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCByZXN1bHQgPSB0aGlzLmV2YWx1YXRlRmlsZShmaWxlUGF0aCwgc2NvcGUpO1xyXG5cdFx0dGhpcy5jYWNoZS5zZXQoa2V5LCByZXN1bHQpO1xyXG5cdFx0cmV0dXJuIHJlc3VsdDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGlmIGEgZm9sZGVyIHNob3VsZCBiZSBpbmNsdWRlZCBpbiBpbmRleGluZ1xyXG5cdCAqL1xyXG5cdHNob3VsZEluY2x1ZGVGb2xkZXIoXHJcblx0XHRmb2xkZXI6IFRGb2xkZXIsXHJcblx0XHRzY29wZTogXCJib3RoXCIgfCBcImlubGluZVwiIHwgXCJmaWxlXCIgPSBcImJvdGhcIlxyXG5cdCk6IGJvb2xlYW4ge1xyXG5cdFx0aWYgKCF0aGlzLmlzU2NvcGVFbmFibGVkKHNjb3BlKSkge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblx0XHRpZiAoIXRoaXMuY29uZmlnLmVuYWJsZWQpIHtcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgZm9sZGVyUGF0aCA9IGZvbGRlci5wYXRoO1xyXG5cdFx0Y29uc3Qga2V5ID0gdGhpcy5nZXRDYWNoZUtleShcImZvbGRlclwiLCBmb2xkZXJQYXRoLCBzY29wZSk7XHJcblx0XHQvLyBDaGVjayBjYWNoZSBmaXJzdFxyXG5cdFx0aWYgKHRoaXMuY2FjaGUuaGFzKGtleSkpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMuY2FjaGUuZ2V0KGtleSkhO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHJlc3VsdCA9IHRoaXMuZXZhbHVhdGVGb2xkZXIoZm9sZGVyUGF0aCwgc2NvcGUpO1xyXG5cdFx0dGhpcy5jYWNoZS5zZXQoa2V5LCByZXN1bHQpO1xyXG5cdFx0cmV0dXJuIHJlc3VsdDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGlmIGEgcGF0aCBzaG91bGQgYmUgaW5jbHVkZWQgKGdlbmVyaWMgbWV0aG9kKVxyXG5cdCAqL1xyXG5cdHNob3VsZEluY2x1ZGVQYXRoKFxyXG5cdFx0cGF0aDogc3RyaW5nLFxyXG5cdFx0c2NvcGU6IFwiYm90aFwiIHwgXCJpbmxpbmVcIiB8IFwiZmlsZVwiID0gXCJib3RoXCJcclxuXHQpOiBib29sZWFuIHtcclxuXHRcdGlmICghdGhpcy5pc1Njb3BlRW5hYmxlZChzY29wZSkpIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cdFx0aWYgKCF0aGlzLmNvbmZpZy5lbmFibGVkKSB7XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IGtleSA9IHRoaXMuZ2V0Q2FjaGVLZXkoXCJwYXRoXCIsIHBhdGgsIHNjb3BlKTtcclxuXHRcdC8vIENoZWNrIGNhY2hlIGZpcnN0XHJcblx0XHRpZiAodGhpcy5jYWNoZS5oYXMoa2V5KSkge1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5jYWNoZS5nZXQoa2V5KSE7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgcmVzdWx0ID0gdGhpcy5ldmFsdWF0ZVBhdGgocGF0aCwgc2NvcGUpO1xyXG5cdFx0dGhpcy5jYWNoZS5zZXQoa2V5LCByZXN1bHQpO1xyXG5cdFx0cmV0dXJuIHJlc3VsdDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBmaWx0ZXIgc3RhdGlzdGljc1xyXG5cdCAqL1xyXG5cdGdldFN0YXRzKCk6IHsgY2FjaGVTaXplOiBudW1iZXI7IHJ1bGVzQ291bnQ6IG51bWJlcjsgZW5hYmxlZDogYm9vbGVhbiB9IHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGNhY2hlU2l6ZTogdGhpcy5jYWNoZS5zaXplLFxyXG5cdFx0XHRydWxlc0NvdW50OiB0aGlzLmNvbmZpZy5ydWxlcy5maWx0ZXIoKHJ1bGUpID0+IHJ1bGUuZW5hYmxlZCkubGVuZ3RoLFxyXG5cdFx0XHRlbmFibGVkOiB0aGlzLmNvbmZpZy5lbmFibGVkLFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsZWFyIHRoZSBmaWx0ZXIgY2FjaGVcclxuXHQgKi9cclxuXHRjbGVhckNhY2hlKCk6IHZvaWQge1xyXG5cdFx0dGhpcy5jYWNoZS5jbGVhcigpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQnVpbGQgYSBjYWNoZSBrZXkgdGhhdCBpcyBzY29wZWQgYnkga2luZCBhbmQgc2NvcGUgdG8gYXZvaWQgY3Jvc3Mtc2NvcGUgcG9sbHV0aW9uXHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZXRDYWNoZUtleShcclxuXHRcdGtpbmQ6IFwiZmlsZVwiIHwgXCJmb2xkZXJcIiB8IFwicGF0aFwiLFxyXG5cdFx0cGF0aDogc3RyaW5nLFxyXG5cdFx0c2NvcGU6IFwiYm90aFwiIHwgXCJpbmxpbmVcIiB8IFwiZmlsZVwiXHJcblx0KTogc3RyaW5nIHtcclxuXHRcdHJldHVybiBgJHtraW5kfToke3Njb3BlfToke3RoaXMubm9ybWFsaXplUGF0aChwYXRoKX1gO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRXZhbHVhdGUgaWYgYSBmaWxlIHNob3VsZCBiZSBpbmNsdWRlZFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZXZhbHVhdGVGaWxlKFxyXG5cdFx0ZmlsZVBhdGg6IHN0cmluZyxcclxuXHRcdHNjb3BlOiBcImJvdGhcIiB8IFwiaW5saW5lXCIgfCBcImZpbGVcIiA9IFwiYm90aFwiXHJcblx0KTogYm9vbGVhbiB7XHJcblx0XHRjb25zdCBtYXRjaGVzID0gdGhpcy5wYXRoTWF0Y2hlcyhmaWxlUGF0aCwgc2NvcGUpO1xyXG5cclxuXHRcdGlmICh0aGlzLmNvbmZpZy5tb2RlID09PSBGaWx0ZXJNb2RlLldISVRFTElTVCkge1xyXG5cdFx0XHRyZXR1cm4gbWF0Y2hlcztcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHJldHVybiAhbWF0Y2hlcztcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEV2YWx1YXRlIGlmIGEgZm9sZGVyIHNob3VsZCBiZSBpbmNsdWRlZFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZXZhbHVhdGVGb2xkZXIoXHJcblx0XHRmb2xkZXJQYXRoOiBzdHJpbmcsXHJcblx0XHRzY29wZTogXCJib3RoXCIgfCBcImlubGluZVwiIHwgXCJmaWxlXCIgPSBcImJvdGhcIlxyXG5cdCk6IGJvb2xlYW4ge1xyXG5cdFx0Y29uc3QgbWF0Y2hlcyA9IHRoaXMucGF0aE1hdGNoZXMoZm9sZGVyUGF0aCwgc2NvcGUpO1xyXG5cclxuXHRcdGlmICh0aGlzLmNvbmZpZy5tb2RlID09PSBGaWx0ZXJNb2RlLldISVRFTElTVCkge1xyXG5cdFx0XHRyZXR1cm4gbWF0Y2hlcztcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHJldHVybiAhbWF0Y2hlcztcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEV2YWx1YXRlIGlmIGEgcGF0aCBzaG91bGQgYmUgaW5jbHVkZWQgKGdlbmVyaWMpXHJcblx0ICovXHJcblx0cHJpdmF0ZSBldmFsdWF0ZVBhdGgoXHJcblx0XHRwYXRoOiBzdHJpbmcsXHJcblx0XHRzY29wZTogXCJib3RoXCIgfCBcImlubGluZVwiIHwgXCJmaWxlXCIgPSBcImJvdGhcIlxyXG5cdCk6IGJvb2xlYW4ge1xyXG5cdFx0Y29uc3QgbWF0Y2hlcyA9IHRoaXMucGF0aE1hdGNoZXMocGF0aCwgc2NvcGUpO1xyXG5cdFx0Y29uc3QgcmVzdWx0ID1cclxuXHRcdFx0dGhpcy5jb25maWcubW9kZSA9PT0gRmlsdGVyTW9kZS5XSElURUxJU1QgPyBtYXRjaGVzIDogIW1hdGNoZXM7XHJcblx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgYSBwYXRoIG1hdGNoZXMgYW55IGZpbHRlciBydWxlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBwYXRoTWF0Y2hlcyhcclxuXHRcdHBhdGg6IHN0cmluZyxcclxuXHRcdHNjb3BlOiBcImJvdGhcIiB8IFwiaW5saW5lXCIgfCBcImZpbGVcIlxyXG5cdCk6IGJvb2xlYW4ge1xyXG5cdFx0Y29uc3Qgbm9ybWFsaXplZFBhdGggPSB0aGlzLm5vcm1hbGl6ZVBhdGgocGF0aCk7XHJcblxyXG5cdFx0Ly8gUGljayB0aGUgcmlnaHQgaW5kZXhlcyBiYXNlZCBvbiBzY29wZVxyXG5cdFx0Y29uc3QgZmlsZVNldCA9XHJcblx0XHRcdHNjb3BlID09PSBcImZpbGVcIlxyXG5cdFx0XHRcdD8gdGhpcy5maWxlU2V0RmlsZVxyXG5cdFx0XHRcdDogc2NvcGUgPT09IFwiaW5saW5lXCJcclxuXHRcdFx0XHRcdD8gdGhpcy5maWxlU2V0SW5saW5lXHJcblx0XHRcdFx0XHQ6IHRoaXMuZmlsZVNldDtcclxuXHRcdGNvbnN0IGZvbGRlclRyaWUgPVxyXG5cdFx0XHRzY29wZSA9PT0gXCJmaWxlXCJcclxuXHRcdFx0XHQ/IHRoaXMuZm9sZGVyVHJpZUZpbGVcclxuXHRcdFx0XHQ6IHNjb3BlID09PSBcImlubGluZVwiXHJcblx0XHRcdFx0XHQ/IHRoaXMuZm9sZGVyVHJpZUlubGluZVxyXG5cdFx0XHRcdFx0OiB0aGlzLmZvbGRlclRyaWU7XHJcblx0XHRjb25zdCBwYXR0ZXJuUmVnZXhlcyA9XHJcblx0XHRcdHNjb3BlID09PSBcImZpbGVcIlxyXG5cdFx0XHRcdD8gdGhpcy5wYXR0ZXJuUmVnZXhlc0ZpbGVcclxuXHRcdFx0XHQ6IHNjb3BlID09PSBcImlubGluZVwiXHJcblx0XHRcdFx0XHQ/IHRoaXMucGF0dGVyblJlZ2V4ZXNJbmxpbmVcclxuXHRcdFx0XHRcdDogdGhpcy5wYXR0ZXJuUmVnZXhlcztcclxuXHJcblx0XHQvLyBEZXRhaWxlZCBtYXRjaCBicmVha2Rvd25cclxuXHRcdGNvbnN0IGZpbGVIaXQgPSBmaWxlU2V0Lmhhcyhub3JtYWxpemVkUGF0aCk7XHJcblx0XHRjb25zdCBmb2xkZXJIaXQgPSBmb2xkZXJUcmllLmNvbnRhaW5zKG5vcm1hbGl6ZWRQYXRoKTtcclxuXHRcdGxldCBwYXR0ZXJuSGl0ID0gZmFsc2U7XHJcblx0XHRmb3IgKGNvbnN0IHJlZ2V4IG9mIHBhdHRlcm5SZWdleGVzKSB7XHJcblx0XHRcdGlmIChyZWdleC50ZXN0KG5vcm1hbGl6ZWRQYXRoKSkge1xyXG5cdFx0XHRcdHBhdHRlcm5IaXQgPSB0cnVlO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRjb25zdCBtYXRjaGVkID0gZmlsZUhpdCB8fCBmb2xkZXJIaXQgfHwgcGF0dGVybkhpdDtcclxuXHRcdHJldHVybiBtYXRjaGVkO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVidWlsZCBpbnRlcm5hbCBpbmRleGVzIHdoZW4gY29uZmlndXJhdGlvbiBjaGFuZ2VzXHJcblx0ICovXHJcblx0cHJpdmF0ZSByZWJ1aWxkSW5kZXhlcygpOiB2b2lkIHtcclxuXHRcdC8vIENsZWFyIGxlZ2FjeSBhbmQgc2NvcGVkIGluZGV4ZXNcclxuXHRcdHRoaXMuZm9sZGVyVHJpZS5jbGVhcigpO1xyXG5cdFx0dGhpcy5maWxlU2V0LmNsZWFyKCk7XHJcblx0XHR0aGlzLnBhdHRlcm5SZWdleGVzID0gW107XHJcblx0XHR0aGlzLmZvbGRlclRyaWVJbmxpbmUuY2xlYXIoKTtcclxuXHRcdHRoaXMuZm9sZGVyVHJpZUZpbGUuY2xlYXIoKTtcclxuXHRcdHRoaXMuZmlsZVNldElubGluZS5jbGVhcigpO1xyXG5cdFx0dGhpcy5maWxlU2V0RmlsZS5jbGVhcigpO1xyXG5cdFx0dGhpcy5wYXR0ZXJuUmVnZXhlc0lubGluZSA9IFtdO1xyXG5cdFx0dGhpcy5wYXR0ZXJuUmVnZXhlc0ZpbGUgPSBbXTtcclxuXHJcblx0XHRmb3IgKGNvbnN0IHJ1bGUgb2YgdGhpcy5jb25maWcucnVsZXMpIHtcclxuXHRcdFx0aWYgKCFydWxlLmVuYWJsZWQpIGNvbnRpbnVlO1xyXG5cdFx0XHRjb25zdCBzY29wZSA9IHJ1bGUuc2NvcGUgfHwgXCJib3RoXCI7XHJcblxyXG5cdFx0XHRjb25zdCBhZGRUbyA9IChidWNrZXQ6IFwiYm90aFwiIHwgXCJpbmxpbmVcIiB8IFwiZmlsZVwiKSA9PiB7XHJcblx0XHRcdFx0c3dpdGNoIChydWxlLnR5cGUpIHtcclxuXHRcdFx0XHRcdGNhc2UgXCJmaWxlXCI6XHJcblx0XHRcdFx0XHRcdChidWNrZXQgPT09IFwiZmlsZVwiXHJcblx0XHRcdFx0XHRcdFx0XHQ/IHRoaXMuZmlsZVNldEZpbGVcclxuXHRcdFx0XHRcdFx0XHRcdDogYnVja2V0ID09PSBcImlubGluZVwiXHJcblx0XHRcdFx0XHRcdFx0XHRcdD8gdGhpcy5maWxlU2V0SW5saW5lXHJcblx0XHRcdFx0XHRcdFx0XHRcdDogdGhpcy5maWxlU2V0XHJcblx0XHRcdFx0XHRcdCkuYWRkKHRoaXMubm9ybWFsaXplUGF0aChydWxlLnBhdGgpKTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIFwiZm9sZGVyXCI6XHJcblx0XHRcdFx0XHRcdChidWNrZXQgPT09IFwiZmlsZVwiXHJcblx0XHRcdFx0XHRcdFx0XHQ/IHRoaXMuZm9sZGVyVHJpZUZpbGVcclxuXHRcdFx0XHRcdFx0XHRcdDogYnVja2V0ID09PSBcImlubGluZVwiXHJcblx0XHRcdFx0XHRcdFx0XHRcdD8gdGhpcy5mb2xkZXJUcmllSW5saW5lXHJcblx0XHRcdFx0XHRcdFx0XHRcdDogdGhpcy5mb2xkZXJUcmllXHJcblx0XHRcdFx0XHRcdCkuaW5zZXJ0KHJ1bGUucGF0aCwgdHJ1ZSk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcInBhdHRlcm5cIjpcclxuXHRcdFx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCByZWdleFBhdHRlcm4gPSB0aGlzLmdsb2JUb1JlZ2V4KHJ1bGUucGF0aCk7XHJcblx0XHRcdFx0XHRcdFx0KGJ1Y2tldCA9PT0gXCJmaWxlXCJcclxuXHRcdFx0XHRcdFx0XHRcdFx0PyB0aGlzLnBhdHRlcm5SZWdleGVzRmlsZVxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ6IGJ1Y2tldCA9PT0gXCJpbmxpbmVcIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdD8gdGhpcy5wYXR0ZXJuUmVnZXhlc0lubGluZVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdDogdGhpcy5wYXR0ZXJuUmVnZXhlc1xyXG5cdFx0XHRcdFx0XHRcdCkucHVzaChuZXcgUmVnRXhwKHJlZ2V4UGF0dGVybiwgXCJpXCIpKTtcclxuXHRcdFx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRcdFx0XHRgSW52YWxpZCBwYXR0ZXJuIHJ1bGU6ICR7cnVsZS5wYXRofWAsXHJcblx0XHRcdFx0XHRcdFx0XHRlcnJvclxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gSU1QT1JUQU5UOiBXaGVuIHNjb3BlIGlzICdib3RoJywgZW5zdXJlIHJ1bGVzIGFwcGx5IHRvIGJvdGggJ2lubGluZScgYW5kICdmaWxlJyBzY29wZWQgaW5kZXhlc1xyXG5cdFx0XHQvLyBQcmV2aW91c2x5IG9ubHkgdGhlIGxlZ2FjeSAnYm90aCcgaW5kZXggd2FzIGZpbGxlZCwgYnV0IGxvb2t1cHMgZm9yIHNjb3BlZCBjaGVja3MgaWdub3JlZCBpdFxyXG5cdFx0XHRpZiAoc2NvcGUgPT09IFwiYm90aFwiKSB7XHJcblx0XHRcdFx0YWRkVG8oXCJib3RoXCIpO1xyXG5cdFx0XHRcdGFkZFRvKFwiaW5saW5lXCIpO1xyXG5cdFx0XHRcdGFkZFRvKFwiZmlsZVwiKTtcclxuXHRcdFx0fSBlbHNlIGlmIChzY29wZSA9PT0gXCJpbmxpbmVcIikge1xyXG5cdFx0XHRcdGFkZFRvKFwiaW5saW5lXCIpO1xyXG5cdFx0XHR9IGVsc2UgaWYgKHNjb3BlID09PSBcImZpbGVcIikge1xyXG5cdFx0XHRcdGFkZFRvKFwiZmlsZVwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ29udmVydCBnbG9iIHBhdHRlcm4gdG8gcmVnZXhcclxuXHQgKi9cclxuXHRwcml2YXRlIGdsb2JUb1JlZ2V4KHBhdHRlcm46IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHRyZXR1cm4gcGF0dGVyblxyXG5cdFx0XHQucmVwbGFjZSgvXFwuL2csIFwiXFxcXC5cIilcclxuXHRcdFx0LnJlcGxhY2UoL1xcKi9nLCBcIi4qXCIpXHJcblx0XHRcdC5yZXBsYWNlKC9cXD8vZywgXCIuXCIpXHJcblx0XHRcdC5yZXBsYWNlKC9cXFsoW15cXF1dKylcXF0vZywgXCJbJDFdXCIpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTm9ybWFsaXplIHBhdGggZm9yIGNvbnNpc3RlbnQgbWF0Y2hpbmdcclxuXHQgKi9cclxuXHRwcml2YXRlIG5vcm1hbGl6ZVBhdGgocGF0aDogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdHJldHVybiBwYXRoLnJlcGxhY2UoL1xcXFwvZywgXCIvXCIpLnJlcGxhY2UoL15cXC8rfFxcLyskL2csIFwiXCIpO1xyXG5cdH1cclxufVxyXG4iXX0=