/**
 * Project Configuration Manager
 *
 * Handles project configuration file reading and metadata parsing
 * This runs in the main thread, not in workers due to file system access limitations
 */
import { __awaiter } from "tslib";
import { TFile } from "obsidian";
export class ProjectConfigManager {
    constructor(options) {
        var _a, _b, _c;
        // Cache for project configurations
        this.configCache = new Map();
        this.lastModifiedCache = new Map();
        // Cache for file metadata (frontmatter)
        this.fileMetadataCache = new Map();
        this.fileMetadataTimestampCache = new Map();
        // Cache for enhanced metadata (merged frontmatter + config + mappings)
        this.enhancedMetadataCache = new Map();
        this.enhancedMetadataTimestampCache = new Map(); // Composite key: fileTime_configTime
        this.vault = options.vault;
        this.metadataCache = options.metadataCache;
        this.configFileName = options.configFileName;
        this.searchRecursively = options.searchRecursively;
        this.metadataKey = options.metadataKey;
        this.pathMappings = options.pathMappings;
        this.metadataMappings = options.metadataMappings || [];
        this.defaultProjectNaming = options.defaultProjectNaming || {
            strategy: "filename",
            stripExtension: true,
            enabled: false,
        };
        this.enhancedProjectEnabled = (_a = options.enhancedProjectEnabled) !== null && _a !== void 0 ? _a : true; // Default to enabled for backward compatibility
        this.metadataConfigEnabled = (_b = options.metadataConfigEnabled) !== null && _b !== void 0 ? _b : false;
        this.configFileEnabled = (_c = options.configFileEnabled) !== null && _c !== void 0 ? _c : false;
        this.detectionMethods = options.detectionMethods || [];
    }
    /**
     * Check if enhanced project features are enabled
     */
    isEnhancedProjectEnabled() {
        return this.enhancedProjectEnabled;
    }
    /**
     * Set enhanced project feature state
     */
    setEnhancedProjectEnabled(enabled) {
        this.enhancedProjectEnabled = enabled;
        if (!enabled) {
            // Clear cache when disabling to prevent stale data
            this.clearCache();
        }
    }
    /**
     * Get project configuration for a given file path
     */
    getProjectConfig(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            // Early return if enhanced project features are disabled
            if (!this.enhancedProjectEnabled) {
                return null;
            }
            try {
                const configFile = yield this.findProjectConfigFile(filePath);
                if (!configFile) {
                    return null;
                }
                const configPath = configFile.path;
                const lastModified = configFile.stat.mtime;
                // Check cache
                if (this.configCache.has(configPath) &&
                    this.lastModifiedCache.get(configPath) === lastModified) {
                    return this.configCache.get(configPath) || null;
                }
                // Read and parse config file
                const content = yield this.vault.read(configFile);
                const metadata = this.metadataCache.getFileCache(configFile);
                let configData = {};
                // Parse frontmatter if available
                if (metadata === null || metadata === void 0 ? void 0 : metadata.frontmatter) {
                    configData = Object.assign({}, metadata.frontmatter);
                }
                // Parse content for additional project information
                const contentConfig = this.parseConfigContent(content);
                configData = Object.assign(Object.assign({}, configData), contentConfig);
                // Update cache
                this.configCache.set(configPath, configData);
                this.lastModifiedCache.set(configPath, lastModified);
                return configData;
            }
            catch (error) {
                console.warn(`Failed to read project config for ${filePath}:`, error);
                return null;
            }
        });
    }
    /**
     * Get file metadata (frontmatter) for a given file with timestamp caching
     */
    getFileMetadata(filePath) {
        // Early return if enhanced project features are disabled
        if (!this.enhancedProjectEnabled) {
            return null;
        }
        try {
            const file = this.vault.getFileByPath(filePath);
            // Check if file exists and is a TFile (or has TFile-like properties for testing)
            if (!file || !("stat" in file)) {
                return null;
            }
            const currentTimestamp = file.stat.mtime;
            const cachedTimestamp = this.fileMetadataTimestampCache.get(filePath);
            // Check if cache is valid (file hasn't been modified)
            if (cachedTimestamp === currentTimestamp &&
                this.fileMetadataCache.has(filePath)) {
                return this.fileMetadataCache.get(filePath) || null;
            }
            // Cache miss or file modified - get fresh metadata
            const metadata = this.metadataCache.getFileCache(file);
            const frontmatter = (metadata === null || metadata === void 0 ? void 0 : metadata.frontmatter) || {};
            // Update cache with fresh data
            this.fileMetadataCache.set(filePath, frontmatter);
            this.fileMetadataTimestampCache.set(filePath, currentTimestamp);
            return frontmatter;
        }
        catch (error) {
            console.warn(`Failed to get file metadata for ${filePath}:`, error);
            return null;
        }
    }
    /**
     * Normalize a project path to use consistent separators
     * @param path The path to normalize
     * @returns Normalized path with forward slashes
     */
    normalizeProjectPath(path) {
        if (!path)
            return "";
        // Replace backslashes with forward slashes
        let normalized = path.replace(/\\/g, "/");
        // Remove duplicate slashes
        normalized = normalized.replace(/\/+/g, "/");
        // Remove leading and trailing slashes
        normalized = normalized.replace(/^\/|\/$/g, "");
        return normalized;
    }
    /**
     * Determine tgProject for a task based on various sources
     */
    determineTgProject(filePath) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // Early return if enhanced project features are disabled
            if (!this.enhancedProjectEnabled) {
                return undefined;
            }
            // 1. Check path-based mappings first (highest priority)
            for (const mapping of this.pathMappings) {
                if (!mapping.enabled)
                    continue;
                // Simple path matching - could be enhanced with glob patterns
                if (this.matchesPathPattern(filePath, mapping.pathPattern)) {
                    // Normalize the project name to support nested paths
                    const normalizedName = this.normalizeProjectPath(mapping.projectName);
                    return {
                        type: "path",
                        name: normalizedName,
                        source: mapping.pathPattern,
                        readonly: true,
                    };
                }
            }
            // 2. Check custom detection methods
            if (this.detectionMethods && this.detectionMethods.length > 0) {
                const file = this.vault.getFileByPath(filePath);
                if (file && file instanceof TFile) {
                    const fileCache = this.metadataCache.getFileCache(file);
                    const fileMetadata = this.getFileMetadata(filePath);
                    for (const method of this.detectionMethods) {
                        if (!method.enabled)
                            continue;
                        switch (method.type) {
                            case "metadata":
                                // Check if the specified metadata property exists
                                if (fileMetadata &&
                                    fileMetadata[method.propertyKey]) {
                                    return {
                                        type: "metadata",
                                        name: String(fileMetadata[method.propertyKey]),
                                        source: method.propertyKey,
                                        readonly: true,
                                    };
                                }
                                break;
                            case "tag":
                                // Check if file has the specified tag (consider both inline and frontmatter tags)
                                {
                                    const targetTag = method.propertyKey.startsWith("#")
                                        ? method.propertyKey
                                        : `#${method.propertyKey}`;
                                    const normalizedTarget = targetTag.toLowerCase();
                                    const inlineTags = ((fileCache === null || fileCache === void 0 ? void 0 : fileCache.tags) || []).map((tc) => tc.tag);
                                    const fmTagsRaw = (_a = fileCache === null || fileCache === void 0 ? void 0 : fileCache.frontmatter) === null || _a === void 0 ? void 0 : _a.tags;
                                    const fmTagsArr = Array.isArray(fmTagsRaw)
                                        ? fmTagsRaw
                                        : fmTagsRaw !== undefined
                                            ? [fmTagsRaw]
                                            : [];
                                    const fmTagsNorm = fmTagsArr.map((t) => {
                                        const s = String(t || "");
                                        return s.startsWith("#") ? s : `#${s}`;
                                    });
                                    const allTags = [
                                        ...inlineTags,
                                        ...fmTagsNorm,
                                    ].map((t) => String(t || "").toLowerCase());
                                    // For file-level detection: require exact match; do NOT treat hierarchical '#project/xxx' as match unless configured exactly
                                    const hasTag = allTags.some((t) => t === normalizedTarget);
                                    if (hasTag) {
                                        // First try to use title or name from frontmatter as project name
                                        if (fileMetadata === null || fileMetadata === void 0 ? void 0 : fileMetadata.title) {
                                            return {
                                                type: "metadata",
                                                name: String(fileMetadata.title),
                                                source: "title (via tag)",
                                                readonly: true,
                                            };
                                        }
                                        if (fileMetadata === null || fileMetadata === void 0 ? void 0 : fileMetadata.name) {
                                            return {
                                                type: "metadata",
                                                name: String(fileMetadata.name),
                                                source: "name (via tag)",
                                                readonly: true,
                                            };
                                        }
                                        // Fallback: use the file name (without extension)
                                        const fileName = filePath.split("/").pop() || filePath;
                                        const nameWithoutExt = fileName.replace(/\.md$/i, "");
                                        return {
                                            type: "metadata",
                                            name: nameWithoutExt,
                                            source: `tag:${targetTag}`,
                                            readonly: true,
                                        };
                                    }
                                }
                                break;
                            case "link":
                                // Check all links in the file
                                if (fileCache === null || fileCache === void 0 ? void 0 : fileCache.links) {
                                    for (const linkCache of fileCache.links) {
                                        const linkedNote = linkCache.link;
                                        // If there's a filter, check if the link matches
                                        if (method.linkFilter) {
                                            if (linkedNote.includes(method.linkFilter)) {
                                                // First try to use title or name from frontmatter as project name
                                                if (fileMetadata === null || fileMetadata === void 0 ? void 0 : fileMetadata.title) {
                                                    return {
                                                        type: "metadata",
                                                        name: String(fileMetadata.title),
                                                        source: "title (via link)",
                                                        readonly: true,
                                                    };
                                                }
                                                if (fileMetadata === null || fileMetadata === void 0 ? void 0 : fileMetadata.name) {
                                                    return {
                                                        type: "metadata",
                                                        name: String(fileMetadata.name),
                                                        source: "name (via link)",
                                                        readonly: true,
                                                    };
                                                }
                                                // Fallback: use the file name (without extension)
                                                const fileName = filePath.split("/").pop() ||
                                                    filePath;
                                                const nameWithoutExt = fileName.replace(/\.md$/i, "");
                                                return {
                                                    type: "metadata",
                                                    name: nameWithoutExt,
                                                    source: `link:${linkedNote}`,
                                                    readonly: true,
                                                };
                                            }
                                        }
                                        else if (method.propertyKey) {
                                            // If a property key is specified, only check links in that metadata field
                                            if (fileMetadata &&
                                                fileMetadata[method.propertyKey]) {
                                                const propValue = String(fileMetadata[method.propertyKey]);
                                                // Check if this link is mentioned in the property
                                                if (propValue.includes(`[[${linkedNote}]]`)) {
                                                    // First try to use title or name from frontmatter as project name
                                                    if (fileMetadata === null || fileMetadata === void 0 ? void 0 : fileMetadata.title) {
                                                        return {
                                                            type: "metadata",
                                                            name: String(fileMetadata.title),
                                                            source: "title (via link)",
                                                            readonly: true,
                                                        };
                                                    }
                                                    if (fileMetadata === null || fileMetadata === void 0 ? void 0 : fileMetadata.name) {
                                                        return {
                                                            type: "metadata",
                                                            name: String(fileMetadata.name),
                                                            source: "name (via link)",
                                                            readonly: true,
                                                        };
                                                    }
                                                    // Fallback: use the file name (without extension)
                                                    const fileName = filePath.split("/").pop() ||
                                                        filePath;
                                                    const nameWithoutExt = fileName.replace(/\.md$/i, "");
                                                    return {
                                                        type: "metadata",
                                                        name: nameWithoutExt,
                                                        source: `link:${linkedNote}`,
                                                        readonly: true,
                                                    };
                                                }
                                            }
                                        }
                                    }
                                }
                                break;
                        }
                    }
                }
            }
            // 3. Check file metadata (frontmatter) - only if metadata detection is enabled
            if (this.metadataConfigEnabled) {
                const fileMetadata = this.getFileMetadata(filePath);
                if (fileMetadata && fileMetadata[this.metadataKey]) {
                    const projectFromMetadata = fileMetadata[this.metadataKey];
                    if (typeof projectFromMetadata === "string" &&
                        projectFromMetadata.trim()) {
                        return {
                            type: "metadata",
                            name: projectFromMetadata.trim(),
                            source: this.metadataKey,
                            readonly: true,
                        };
                    }
                }
            }
            // 3. Check project config file (lowest priority) - only if config file detection is enabled
            if (this.configFileEnabled) {
                const configData = yield this.getProjectConfig(filePath);
                if (configData && configData.project) {
                    const projectFromConfig = configData.project;
                    if (typeof projectFromConfig === "string" &&
                        projectFromConfig.trim()) {
                        return {
                            type: "config",
                            name: projectFromConfig.trim(),
                            source: this.configFileName,
                            readonly: true,
                        };
                    }
                }
            }
            // 4. Apply default project naming strategy (lowest priority)
            if (this.defaultProjectNaming.enabled) {
                const defaultProject = this.generateDefaultProjectName(filePath);
                if (defaultProject) {
                    // Normalize default project name as well
                    const normalizedName = this.normalizeProjectPath(defaultProject);
                    return {
                        type: "default",
                        name: normalizedName,
                        source: this.defaultProjectNaming.strategy,
                        readonly: true,
                    };
                }
            }
            return undefined;
        });
    }
    /**
     * Get enhanced metadata for a file (combines frontmatter and config) with composite caching
     */
    getEnhancedMetadata(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            // Early return if enhanced project features are disabled
            if (!this.enhancedProjectEnabled) {
                return {};
            }
            try {
                // Get file timestamp for cache key
                const file = this.vault.getFileByPath(filePath);
                if (!file || !("stat" in file)) {
                    return {};
                }
                const fileTimestamp = file.stat.mtime;
                // Get config file timestamp for cache key
                const configFile = yield this.findProjectConfigFile(filePath);
                const configTimestamp = configFile ? configFile.stat.mtime : 0;
                // Create composite cache key
                const cacheKey = `${fileTimestamp}_${configTimestamp}`;
                const cachedCacheKey = this.enhancedMetadataTimestampCache.get(filePath);
                // Check if cache is valid (neither file nor config has been modified)
                if (cachedCacheKey === cacheKey &&
                    this.enhancedMetadataCache.has(filePath)) {
                    return this.enhancedMetadataCache.get(filePath) || {};
                }
                // Cache miss or files modified - compute fresh enhanced metadata
                const fileMetadata = this.getFileMetadata(filePath) || {};
                const configData = (yield this.getProjectConfig(filePath)) || {};
                // Merge metadata, with file metadata taking precedence
                let mergedMetadata = Object.assign(Object.assign({}, configData), fileMetadata);
                // Apply metadata mappings
                mergedMetadata = this.applyMetadataMappings(mergedMetadata);
                // Update cache with fresh data
                this.enhancedMetadataCache.set(filePath, mergedMetadata);
                this.enhancedMetadataTimestampCache.set(filePath, cacheKey);
                return mergedMetadata;
            }
            catch (error) {
                console.warn(`Failed to get enhanced metadata for ${filePath}:`, error);
                return {};
            }
        });
    }
    /**
     * Clear cache for a specific file or all files
     */
    clearCache(filePath) {
        if (filePath) {
            // Clear cache for specific config file
            const configFile = this.findProjectConfigFileSync(filePath);
            if (configFile) {
                this.configCache.delete(configFile.path);
                this.lastModifiedCache.delete(configFile.path);
            }
            // Clear file-specific metadata caches
            this.fileMetadataCache.delete(filePath);
            this.fileMetadataTimestampCache.delete(filePath);
            this.enhancedMetadataCache.delete(filePath);
            this.enhancedMetadataTimestampCache.delete(filePath);
        }
        else {
            // Clear all caches
            this.configCache.clear();
            this.lastModifiedCache.clear();
            this.fileMetadataCache.clear();
            this.fileMetadataTimestampCache.clear();
            this.enhancedMetadataCache.clear();
            this.enhancedMetadataTimestampCache.clear();
        }
    }
    /**
     * Find project configuration file for a given file path
     */
    findProjectConfigFile(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            // Early return if enhanced project features are disabled
            if (!this.enhancedProjectEnabled) {
                return null;
            }
            const file = this.vault.getFileByPath(filePath);
            if (!file) {
                return null;
            }
            let currentFolder = file.parent;
            while (currentFolder) {
                // Look for config file in current folder
                const configFile = currentFolder.children.find((child) => child &&
                    child.name === this.configFileName &&
                    "stat" in child // Check if it's a file-like object
                );
                if (configFile) {
                    return configFile;
                }
                // If not searching recursively, stop here
                if (!this.searchRecursively) {
                    break;
                }
                // Move to parent folder
                currentFolder = currentFolder.parent;
            }
            return null;
        });
    }
    /**
     * Synchronous version of findProjectConfigFile for cache clearing
     */
    findProjectConfigFileSync(filePath) {
        // Early return if enhanced project features are disabled
        if (!this.enhancedProjectEnabled) {
            return null;
        }
        const file = this.vault.getFileByPath(filePath);
        if (!file) {
            return null;
        }
        let currentFolder = file.parent;
        while (currentFolder) {
            const configFile = currentFolder.children.find((child) => child &&
                child.name === this.configFileName &&
                "stat" in child // Check if it's a file-like object
            );
            if (configFile) {
                return configFile;
            }
            if (!this.searchRecursively) {
                break;
            }
            currentFolder = currentFolder.parent;
        }
        return null;
    }
    /**
     * Parse configuration content for project information
     */
    parseConfigContent(content) {
        const config = {};
        // Simple parsing for project information
        // This could be enhanced to support more complex formats
        const lines = content.split("\n");
        for (const line of lines) {
            const trimmed = line.trim();
            // Skip empty lines and comments
            if (!trimmed ||
                trimmed.startsWith("#") ||
                trimmed.startsWith("//")) {
                continue;
            }
            // Look for key-value pairs
            const colonIndex = trimmed.indexOf(":");
            if (colonIndex > 0) {
                const key = trimmed.substring(0, colonIndex).trim();
                const value = trimmed.substring(colonIndex + 1).trim();
                if (key && value) {
                    // Remove quotes if present
                    const cleanValue = value.replace(/^["']|["']$/g, "");
                    config[key] = cleanValue;
                }
            }
        }
        return config;
    }
    /**
     * Check if a file path matches a path pattern
     */
    matchesPathPattern(filePath, pattern) {
        // Simple pattern matching - could be enhanced with glob patterns
        // For now, just check if the file path contains the pattern
        const normalizedPath = filePath.replace(/\\/g, "/");
        const normalizedPattern = pattern.replace(/\\/g, "/");
        // Support wildcards
        if (pattern.includes("*")) {
            const regexPattern = pattern
                .replace(/\*/g, ".*")
                .replace(/\?/g, ".");
            const regex = new RegExp(`^${regexPattern}$`, "i");
            return regex.test(normalizedPath);
        }
        // Simple substring match
        return normalizedPath.includes(normalizedPattern);
    }
    /**
     * Apply metadata mappings to transform source metadata keys to target keys
     */
    applyMetadataMappings(metadata) {
        const result = Object.assign({}, metadata);
        for (const mapping of this.metadataMappings) {
            if (!mapping.enabled)
                continue;
            const sourceValue = metadata[mapping.sourceKey];
            if (sourceValue !== undefined) {
                // Apply intelligent type conversion for common field types
                result[mapping.targetKey] = this.convertMetadataValue(mapping.targetKey, sourceValue);
            }
        }
        return result;
    }
    /**
     * Convert metadata value based on target key type
     */
    convertMetadataValue(targetKey, value) {
        // Date field detection patterns
        const dateFieldPatterns = [
            "due",
            "dueDate",
            "deadline",
            "start",
            "startDate",
            "started",
            "scheduled",
            "scheduledDate",
            "scheduled_for",
            "completed",
            "completedDate",
            "finished",
            "created",
            "createdDate",
            "created_at",
        ];
        // Priority field detection patterns
        const priorityFieldPatterns = ["priority", "urgency", "importance"];
        // Check if it's a date field
        const isDateField = dateFieldPatterns.some((pattern) => targetKey.toLowerCase().includes(pattern.toLowerCase()));
        // Check if it's a priority field
        const isPriorityField = priorityFieldPatterns.some((pattern) => targetKey.toLowerCase().includes(pattern.toLowerCase()));
        if (isDateField && typeof value === "string") {
            // Try to convert date string to timestamp for better performance
            if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
                // Use the same date parsing logic as MarkdownTaskParser
                const { parseLocalDate, } = require("../utils/date/date-formatter");
                const timestamp = parseLocalDate(value);
                return timestamp !== undefined ? timestamp : value;
            }
        }
        else if (isPriorityField && typeof value === "string") {
            // Convert priority string to number using the standard PRIORITY_MAP scale
            const priorityMap = {
                highest: 5,
                urgent: 5,
                critical: 5,
                high: 4,
                important: 4,
                medium: 3,
                normal: 3,
                moderate: 3,
                low: 2,
                minor: 2,
                lowest: 1,
                trivial: 1,
            };
            const numericPriority = parseInt(value, 10);
            if (!isNaN(numericPriority)) {
                return numericPriority;
            }
            const mappedPriority = priorityMap[value.toLowerCase()];
            if (mappedPriority !== undefined) {
                return mappedPriority;
            }
        }
        // Return original value if no conversion is needed
        return value;
    }
    /**
     * Public method to apply metadata mappings to any metadata object
     */
    applyMappingsToMetadata(metadata) {
        return this.applyMetadataMappings(metadata);
    }
    /**
     * Generate default project name based on configured strategy
     */
    generateDefaultProjectName(filePath) {
        // Early return if enhanced project features are disabled
        if (!this.enhancedProjectEnabled ||
            !this.defaultProjectNaming.enabled) {
            return null;
        }
        switch (this.defaultProjectNaming.strategy) {
            case "filename": {
                const fileName = filePath.split("/").pop() || "";
                if (this.defaultProjectNaming.stripExtension) {
                    return fileName.replace(/\.[^/.]+$/, "");
                }
                return fileName;
            }
            case "foldername": {
                const normalizedPath = filePath.replace(/\\/g, "/");
                const pathParts = normalizedPath.split("/");
                // For path-based projects, build nested structure from folder path
                // e.g., "Projects/Web/Frontend/file.md" -> "Web/Frontend"
                if (pathParts.length > 1) {
                    // Find if path contains a common project root folder
                    const projectRootIndex = pathParts.findIndex((part) => part.toLowerCase() === "projects" ||
                        part.toLowerCase() === "project");
                    if (projectRootIndex >= 0 &&
                        projectRootIndex < pathParts.length - 2) {
                        // Build project path from folders after the project root
                        const projectParts = pathParts.slice(projectRootIndex + 1, pathParts.length - 1);
                        return projectParts.join("/");
                    }
                    // Fallback to just parent folder name if no project root found
                    return pathParts[pathParts.length - 2] || "";
                }
                return "";
            }
            case "metadata": {
                const metadataKey = this.defaultProjectNaming.metadataKey;
                if (!metadataKey) {
                    return null;
                }
                const fileMetadata = this.getFileMetadata(filePath);
                if (fileMetadata && fileMetadata[metadataKey]) {
                    const value = fileMetadata[metadataKey];
                    return typeof value === "string"
                        ? value.trim()
                        : String(value);
                }
                return null;
            }
            default:
                return null;
        }
    }
    /**
     * Update configuration options
     */
    updateOptions(options) {
        if (options.configFileName !== undefined) {
            this.configFileName = options.configFileName;
        }
        if (options.searchRecursively !== undefined) {
            this.searchRecursively = options.searchRecursively;
        }
        if (options.metadataKey !== undefined) {
            this.metadataKey = options.metadataKey;
        }
        if (options.pathMappings !== undefined) {
            this.pathMappings = options.pathMappings;
        }
        if (options.metadataMappings !== undefined) {
            this.metadataMappings = options.metadataMappings;
        }
        if (options.defaultProjectNaming !== undefined) {
            this.defaultProjectNaming = options.defaultProjectNaming;
        }
        if (options.enhancedProjectEnabled !== undefined) {
            this.setEnhancedProjectEnabled(options.enhancedProjectEnabled);
        }
        if (options.metadataConfigEnabled !== undefined) {
            this.metadataConfigEnabled = options.metadataConfigEnabled;
        }
        if (options.configFileEnabled !== undefined) {
            this.configFileEnabled = options.configFileEnabled;
        }
        if (options.detectionMethods !== undefined) {
            this.detectionMethods = options.detectionMethods || [];
        }
        // Clear cache when options change
        this.clearCache();
    }
    /**
     * Get worker configuration for project data computation
     */
    getWorkerConfig() {
        return {
            pathMappings: this.pathMappings,
            metadataMappings: this.metadataMappings,
            defaultProjectNaming: this.defaultProjectNaming,
            metadataKey: this.metadataKey,
        };
    }
    /**
     * Expose detection methods (used to decide if worker can be used)
     */
    getDetectionMethods() {
        return this.detectionMethods || [];
    }
    /**
     * Get project config data for a file (alias for getProjectConfig for compatibility)
     */
    getProjectConfigData(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.getProjectConfig(filePath);
        });
    }
    /**
     * Get cache performance statistics and monitoring information
     */
    getCacheStats() {
        // Calculate estimated memory usage (rough approximation)
        const configCacheSize = Array.from(this.configCache.values())
            .map((config) => JSON.stringify(config).length)
            .reduce((sum, size) => sum + size, 0);
        const fileMetadataCacheSize = Array.from(this.fileMetadataCache.values())
            .map((metadata) => JSON.stringify(metadata).length)
            .reduce((sum, size) => sum + size, 0);
        const enhancedMetadataCacheSize = Array.from(this.enhancedMetadataCache.values())
            .map((metadata) => JSON.stringify(metadata).length)
            .reduce((sum, size) => sum + size, 0);
        const totalMemoryUsage = configCacheSize + fileMetadataCacheSize + enhancedMetadataCacheSize;
        return {
            configCache: {
                size: this.configCache.size,
                keys: Array.from(this.configCache.keys()),
            },
            fileMetadataCache: {
                size: this.fileMetadataCache.size,
            },
            enhancedMetadataCache: {
                size: this.enhancedMetadataCache.size,
            },
            totalMemoryUsage: {
                estimatedBytes: totalMemoryUsage,
            },
        };
    }
    /**
     * Clear stale cache entries based on file modification times
     */
    clearStaleEntries() {
        return __awaiter(this, void 0, void 0, function* () {
            let clearedCount = 0;
            // Check file metadata cache for stale entries
            for (const [filePath, timestamp,] of this.fileMetadataTimestampCache.entries()) {
                const file = this.vault.getFileByPath(filePath);
                if (!file ||
                    !("stat" in file) ||
                    file.stat.mtime !== timestamp) {
                    this.fileMetadataCache.delete(filePath);
                    this.fileMetadataTimestampCache.delete(filePath);
                    this.enhancedMetadataCache.delete(filePath);
                    this.enhancedMetadataTimestampCache.delete(filePath);
                    clearedCount++;
                }
            }
            return clearedCount;
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvamVjdC1jb25maWctbWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInByb2plY3QtY29uZmlnLW1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7O0dBS0c7O0FBRUgsT0FBTyxFQUFFLEtBQUssRUFBaUQsTUFBTSxVQUFVLENBQUM7QUF5Q2hGLE1BQU0sT0FBTyxvQkFBb0I7SUE4QmhDLFlBQVksT0FBb0M7O1FBWmhELG1DQUFtQztRQUMzQixnQkFBVyxHQUFHLElBQUksR0FBRyxFQUE2QixDQUFDO1FBQ25ELHNCQUFpQixHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBRXRELHdDQUF3QztRQUNoQyxzQkFBaUIsR0FBRyxJQUFJLEdBQUcsRUFBK0IsQ0FBQztRQUMzRCwrQkFBMEIsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQUUvRCx1RUFBdUU7UUFDL0QsMEJBQXFCLEdBQUcsSUFBSSxHQUFHLEVBQStCLENBQUM7UUFDL0QsbUNBQThCLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUMsQ0FBQyxxQ0FBcUM7UUFHeEcsSUFBSSxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDO1FBQzNCLElBQUksQ0FBQyxhQUFhLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQztRQUMzQyxJQUFJLENBQUMsY0FBYyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUM7UUFDN0MsSUFBSSxDQUFDLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQztRQUNuRCxJQUFJLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUM7UUFDdkMsSUFBSSxDQUFDLFlBQVksR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDO1FBQ3pDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLElBQUksRUFBRSxDQUFDO1FBQ3ZELElBQUksQ0FBQyxvQkFBb0IsR0FBRyxPQUFPLENBQUMsb0JBQW9CLElBQUk7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QUFpQjs7WUFDdEIsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDO1lBRXJCLDhDQUE4QztZQUM5QyxLQUFLLE1BQU0sQ0FDVixRQUFRLEVBQ1IsU0FBUyxFQUNULElBQUksSUFBSSxDQUFDLDBCQUEwQixDQUFDLE9BQU8sRUFBRSxFQUFFO2dCQUMvQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDaEQsSUFDQyxDQUFDLElBQUk7b0JBQ0wsQ0FBQyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUM7b0JBQ2hCLElBQWMsQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVMsRUFDdkM7b0JBQ0QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDeEMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDakQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDNUMsSUFBSSxDQUFDLDhCQUE4QixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDckQsWUFBWSxFQUFFLENBQUM7aUJBQ2Y7YUFDRDtZQUVELE9BQU8sWUFBWSxDQUFDO1FBQ3JCLENBQUM7S0FBQTtDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFByb2plY3QgQ29uZmlndXJhdGlvbiBNYW5hZ2VyXHJcbiAqXHJcbiAqIEhhbmRsZXMgcHJvamVjdCBjb25maWd1cmF0aW9uIGZpbGUgcmVhZGluZyBhbmQgbWV0YWRhdGEgcGFyc2luZ1xyXG4gKiBUaGlzIHJ1bnMgaW4gdGhlIG1haW4gdGhyZWFkLCBub3QgaW4gd29ya2VycyBkdWUgdG8gZmlsZSBzeXN0ZW0gYWNjZXNzIGxpbWl0YXRpb25zXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgVEZpbGUsIFRGb2xkZXIsIFZhdWx0LCBNZXRhZGF0YUNhY2hlLCBDYWNoZWRNZXRhZGF0YSB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBUZ1Byb2plY3QgfSBmcm9tIFwiLi4vdHlwZXMvdGFza1wiO1xyXG5pbXBvcnQgeyBQcm9qZWN0RGV0ZWN0aW9uTWV0aG9kIH0gZnJvbSBcIi4uL2NvbW1vbi9zZXR0aW5nLWRlZmluaXRpb25cIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUHJvamVjdENvbmZpZ0RhdGEge1xyXG5cdHByb2plY3Q/OiBzdHJpbmc7XHJcblx0W2tleTogc3RyaW5nXTogYW55O1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE1ldGFkYXRhTWFwcGluZyB7XHJcblx0c291cmNlS2V5OiBzdHJpbmc7XHJcblx0dGFyZ2V0S2V5OiBzdHJpbmc7XHJcblx0ZW5hYmxlZDogYm9vbGVhbjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBQcm9qZWN0TmFtaW5nU3RyYXRlZ3kge1xyXG5cdHN0cmF0ZWd5OiBcImZpbGVuYW1lXCIgfCBcImZvbGRlcm5hbWVcIiB8IFwibWV0YWRhdGFcIjtcclxuXHRtZXRhZGF0YUtleT86IHN0cmluZztcclxuXHRzdHJpcEV4dGVuc2lvbj86IGJvb2xlYW47XHJcblx0ZW5hYmxlZDogYm9vbGVhbjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBQcm9qZWN0Q29uZmlnTWFuYWdlck9wdGlvbnMge1xyXG5cdHZhdWx0OiBWYXVsdDtcclxuXHRtZXRhZGF0YUNhY2hlOiBNZXRhZGF0YUNhY2hlO1xyXG5cdGNvbmZpZ0ZpbGVOYW1lOiBzdHJpbmc7XHJcblx0c2VhcmNoUmVjdXJzaXZlbHk6IGJvb2xlYW47XHJcblx0bWV0YWRhdGFLZXk6IHN0cmluZztcclxuXHRwYXRoTWFwcGluZ3M6IEFycmF5PHtcclxuXHRcdHBhdGhQYXR0ZXJuOiBzdHJpbmc7XHJcblx0XHRwcm9qZWN0TmFtZTogc3RyaW5nO1xyXG5cdFx0ZW5hYmxlZDogYm9vbGVhbjtcclxuXHR9PjtcclxuXHRtZXRhZGF0YU1hcHBpbmdzOiBNZXRhZGF0YU1hcHBpbmdbXTtcclxuXHRkZWZhdWx0UHJvamVjdE5hbWluZzogUHJvamVjdE5hbWluZ1N0cmF0ZWd5O1xyXG5cdGVuaGFuY2VkUHJvamVjdEVuYWJsZWQ/OiBib29sZWFuOyAvLyBPcHRpb25hbCBmbGFnIHRvIGNvbnRyb2wgZmVhdHVyZSBhdmFpbGFiaWxpdHlcclxuXHRtZXRhZGF0YUNvbmZpZ0VuYWJsZWQ/OiBib29sZWFuOyAvLyBXaGV0aGVyIG1ldGFkYXRhLWJhc2VkIGRldGVjdGlvbiBpcyBlbmFibGVkXHJcblx0Y29uZmlnRmlsZUVuYWJsZWQ/OiBib29sZWFuOyAvLyBXaGV0aGVyIGNvbmZpZyBmaWxlLWJhc2VkIGRldGVjdGlvbiBpcyBlbmFibGVkXHJcblx0ZGV0ZWN0aW9uTWV0aG9kcz86IFByb2plY3REZXRlY3Rpb25NZXRob2RbXTsgLy8gQ3VzdG9tIGRldGVjdGlvbiBtZXRob2RzXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBQcm9qZWN0Q29uZmlnTWFuYWdlciB7XHJcblx0cHJpdmF0ZSB2YXVsdDogVmF1bHQ7XHJcblx0cHJpdmF0ZSBtZXRhZGF0YUNhY2hlOiBNZXRhZGF0YUNhY2hlO1xyXG5cdHByaXZhdGUgY29uZmlnRmlsZU5hbWU6IHN0cmluZztcclxuXHRwcml2YXRlIHNlYXJjaFJlY3Vyc2l2ZWx5OiBib29sZWFuO1xyXG5cdHByaXZhdGUgbWV0YWRhdGFLZXk6IHN0cmluZztcclxuXHRwcml2YXRlIHBhdGhNYXBwaW5nczogQXJyYXk8e1xyXG5cdFx0cGF0aFBhdHRlcm46IHN0cmluZztcclxuXHRcdHByb2plY3ROYW1lOiBzdHJpbmc7XHJcblx0XHRlbmFibGVkOiBib29sZWFuO1xyXG5cdH0+O1xyXG5cdHByaXZhdGUgbWV0YWRhdGFNYXBwaW5nczogTWV0YWRhdGFNYXBwaW5nW107XHJcblx0cHJpdmF0ZSBkZWZhdWx0UHJvamVjdE5hbWluZzogUHJvamVjdE5hbWluZ1N0cmF0ZWd5O1xyXG5cdHByaXZhdGUgZW5oYW5jZWRQcm9qZWN0RW5hYmxlZDogYm9vbGVhbjtcclxuXHRwcml2YXRlIG1ldGFkYXRhQ29uZmlnRW5hYmxlZDogYm9vbGVhbjtcclxuXHRwcml2YXRlIGNvbmZpZ0ZpbGVFbmFibGVkOiBib29sZWFuO1xyXG5cdHByaXZhdGUgZGV0ZWN0aW9uTWV0aG9kczogUHJvamVjdERldGVjdGlvbk1ldGhvZFtdO1xyXG5cclxuXHQvLyBDYWNoZSBmb3IgcHJvamVjdCBjb25maWd1cmF0aW9uc1xyXG5cdHByaXZhdGUgY29uZmlnQ2FjaGUgPSBuZXcgTWFwPHN0cmluZywgUHJvamVjdENvbmZpZ0RhdGE+KCk7XHJcblx0cHJpdmF0ZSBsYXN0TW9kaWZpZWRDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XHJcblxyXG5cdC8vIENhY2hlIGZvciBmaWxlIG1ldGFkYXRhIChmcm9udG1hdHRlcilcclxuXHRwcml2YXRlIGZpbGVNZXRhZGF0YUNhY2hlID0gbmV3IE1hcDxzdHJpbmcsIFJlY29yZDxzdHJpbmcsIGFueT4+KCk7XHJcblx0cHJpdmF0ZSBmaWxlTWV0YWRhdGFUaW1lc3RhbXBDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XHJcblxyXG5cdC8vIENhY2hlIGZvciBlbmhhbmNlZCBtZXRhZGF0YSAobWVyZ2VkIGZyb250bWF0dGVyICsgY29uZmlnICsgbWFwcGluZ3MpXHJcblx0cHJpdmF0ZSBlbmhhbmNlZE1ldGFkYXRhQ2FjaGUgPSBuZXcgTWFwPHN0cmluZywgUmVjb3JkPHN0cmluZywgYW55Pj4oKTtcclxuXHRwcml2YXRlIGVuaGFuY2VkTWV0YWRhdGFUaW1lc3RhbXBDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7IC8vIENvbXBvc2l0ZSBrZXk6IGZpbGVUaW1lX2NvbmZpZ1RpbWVcclxuXHJcblx0Y29uc3RydWN0b3Iob3B0aW9uczogUHJvamVjdENvbmZpZ01hbmFnZXJPcHRpb25zKSB7XHJcblx0XHR0aGlzLnZhdWx0ID0gb3B0aW9ucy52YXVsdDtcclxuXHRcdHRoaXMubWV0YWRhdGFDYWNoZSA9IG9wdGlvbnMubWV0YWRhdGFDYWNoZTtcclxuXHRcdHRoaXMuY29uZmlnRmlsZU5hbWUgPSBvcHRpb25zLmNvbmZpZ0ZpbGVOYW1lO1xyXG5cdFx0dGhpcy5zZWFyY2hSZWN1cnNpdmVseSA9IG9wdGlvbnMuc2VhcmNoUmVjdXJzaXZlbHk7XHJcblx0XHR0aGlzLm1ldGFkYXRhS2V5ID0gb3B0aW9ucy5tZXRhZGF0YUtleTtcclxuXHRcdHRoaXMucGF0aE1hcHBpbmdzID0gb3B0aW9ucy5wYXRoTWFwcGluZ3M7XHJcblx0XHR0aGlzLm1ldGFkYXRhTWFwcGluZ3MgPSBvcHRpb25zLm1ldGFkYXRhTWFwcGluZ3MgfHwgW107XHJcblx0XHR0aGlzLmRlZmF1bHRQcm9qZWN0TmFtaW5nID0gb3B0aW9ucy5kZWZhdWx0UHJvamVjdE5hbWluZyB8fCB7XHJcblx0XHRcdHN0cmF0ZWd5OiBcImZpbGVuYW1lXCIsXHJcblx0XHRcdHN0cmlwRXh0ZW5zaW9uOiB0cnVlLFxyXG5cdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdH07XHJcblx0XHR0aGlzLmVuaGFuY2VkUHJvamVjdEVuYWJsZWQgPSBvcHRpb25zLmVuaGFuY2VkUHJvamVjdEVuYWJsZWQgPz8gdHJ1ZTsgLy8gRGVmYXVsdCB0byBlbmFibGVkIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XHJcblx0XHR0aGlzLm1ldGFkYXRhQ29uZmlnRW5hYmxlZCA9IG9wdGlvbnMubWV0YWRhdGFDb25maWdFbmFibGVkID8/IGZhbHNlO1xyXG5cdFx0dGhpcy5jb25maWdGaWxlRW5hYmxlZCA9IG9wdGlvbnMuY29uZmlnRmlsZUVuYWJsZWQgPz8gZmFsc2U7XHJcblx0XHR0aGlzLmRldGVjdGlvbk1ldGhvZHMgPSBvcHRpb25zLmRldGVjdGlvbk1ldGhvZHMgfHwgW107XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDaGVjayBpZiBlbmhhbmNlZCBwcm9qZWN0IGZlYXR1cmVzIGFyZSBlbmFibGVkXHJcblx0ICovXHJcblx0aXNFbmhhbmNlZFByb2plY3RFbmFibGVkKCk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIHRoaXMuZW5oYW5jZWRQcm9qZWN0RW5hYmxlZDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNldCBlbmhhbmNlZCBwcm9qZWN0IGZlYXR1cmUgc3RhdGVcclxuXHQgKi9cclxuXHRzZXRFbmhhbmNlZFByb2plY3RFbmFibGVkKGVuYWJsZWQ6IGJvb2xlYW4pOiB2b2lkIHtcclxuXHRcdHRoaXMuZW5oYW5jZWRQcm9qZWN0RW5hYmxlZCA9IGVuYWJsZWQ7XHJcblx0XHRpZiAoIWVuYWJsZWQpIHtcclxuXHRcdFx0Ly8gQ2xlYXIgY2FjaGUgd2hlbiBkaXNhYmxpbmcgdG8gcHJldmVudCBzdGFsZSBkYXRhXHJcblx0XHRcdHRoaXMuY2xlYXJDYWNoZSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHByb2plY3QgY29uZmlndXJhdGlvbiBmb3IgYSBnaXZlbiBmaWxlIHBhdGhcclxuXHQgKi9cclxuXHRhc3luYyBnZXRQcm9qZWN0Q29uZmlnKFxyXG5cdFx0ZmlsZVBhdGg6IHN0cmluZ1xyXG5cdCk6IFByb21pc2U8UHJvamVjdENvbmZpZ0RhdGEgfCBudWxsPiB7XHJcblx0XHQvLyBFYXJseSByZXR1cm4gaWYgZW5oYW5jZWQgcHJvamVjdCBmZWF0dXJlcyBhcmUgZGlzYWJsZWRcclxuXHRcdGlmICghdGhpcy5lbmhhbmNlZFByb2plY3RFbmFibGVkKSB7XHJcblx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IGNvbmZpZ0ZpbGUgPSBhd2FpdCB0aGlzLmZpbmRQcm9qZWN0Q29uZmlnRmlsZShmaWxlUGF0aCk7XHJcblx0XHRcdGlmICghY29uZmlnRmlsZSkge1xyXG5cdFx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBjb25maWdQYXRoID0gY29uZmlnRmlsZS5wYXRoO1xyXG5cdFx0XHRjb25zdCBsYXN0TW9kaWZpZWQgPSBjb25maWdGaWxlLnN0YXQubXRpbWU7XHJcblxyXG5cdFx0XHQvLyBDaGVjayBjYWNoZVxyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0dGhpcy5jb25maWdDYWNoZS5oYXMoY29uZmlnUGF0aCkgJiZcclxuXHRcdFx0XHR0aGlzLmxhc3RNb2RpZmllZENhY2hlLmdldChjb25maWdQYXRoKSA9PT0gbGFzdE1vZGlmaWVkXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHJldHVybiB0aGlzLmNvbmZpZ0NhY2hlLmdldChjb25maWdQYXRoKSB8fCBudWxsO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBSZWFkIGFuZCBwYXJzZSBjb25maWcgZmlsZVxyXG5cdFx0XHRjb25zdCBjb250ZW50ID0gYXdhaXQgdGhpcy52YXVsdC5yZWFkKGNvbmZpZ0ZpbGUpO1xyXG5cdFx0XHRjb25zdCBtZXRhZGF0YSA9IHRoaXMubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoY29uZmlnRmlsZSk7XHJcblxyXG5cdFx0XHRsZXQgY29uZmlnRGF0YTogUHJvamVjdENvbmZpZ0RhdGEgPSB7fTtcclxuXHJcblx0XHRcdC8vIFBhcnNlIGZyb250bWF0dGVyIGlmIGF2YWlsYWJsZVxyXG5cdFx0XHRpZiAobWV0YWRhdGE/LmZyb250bWF0dGVyKSB7XHJcblx0XHRcdFx0Y29uZmlnRGF0YSA9IHsgLi4ubWV0YWRhdGEuZnJvbnRtYXR0ZXIgfTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gUGFyc2UgY29udGVudCBmb3IgYWRkaXRpb25hbCBwcm9qZWN0IGluZm9ybWF0aW9uXHJcblx0XHRcdGNvbnN0IGNvbnRlbnRDb25maWcgPSB0aGlzLnBhcnNlQ29uZmlnQ29udGVudChjb250ZW50KTtcclxuXHRcdFx0Y29uZmlnRGF0YSA9IHsgLi4uY29uZmlnRGF0YSwgLi4uY29udGVudENvbmZpZyB9O1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIGNhY2hlXHJcblx0XHRcdHRoaXMuY29uZmlnQ2FjaGUuc2V0KGNvbmZpZ1BhdGgsIGNvbmZpZ0RhdGEpO1xyXG5cdFx0XHR0aGlzLmxhc3RNb2RpZmllZENhY2hlLnNldChjb25maWdQYXRoLCBsYXN0TW9kaWZpZWQpO1xyXG5cclxuXHRcdFx0cmV0dXJuIGNvbmZpZ0RhdGE7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0YEZhaWxlZCB0byByZWFkIHByb2plY3QgY29uZmlnIGZvciAke2ZpbGVQYXRofTpgLFxyXG5cdFx0XHRcdGVycm9yXHJcblx0XHRcdCk7XHJcblx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGZpbGUgbWV0YWRhdGEgKGZyb250bWF0dGVyKSBmb3IgYSBnaXZlbiBmaWxlIHdpdGggdGltZXN0YW1wIGNhY2hpbmdcclxuXHQgKi9cclxuXHRnZXRGaWxlTWV0YWRhdGEoZmlsZVBhdGg6IHN0cmluZyk6IFJlY29yZDxzdHJpbmcsIGFueT4gfCBudWxsIHtcclxuXHRcdC8vIEVhcmx5IHJldHVybiBpZiBlbmhhbmNlZCBwcm9qZWN0IGZlYXR1cmVzIGFyZSBkaXNhYmxlZFxyXG5cdFx0aWYgKCF0aGlzLmVuaGFuY2VkUHJvamVjdEVuYWJsZWQpIHtcclxuXHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgZmlsZSA9IHRoaXMudmF1bHQuZ2V0RmlsZUJ5UGF0aChmaWxlUGF0aCk7XHJcblx0XHRcdC8vIENoZWNrIGlmIGZpbGUgZXhpc3RzIGFuZCBpcyBhIFRGaWxlIChvciBoYXMgVEZpbGUtbGlrZSBwcm9wZXJ0aWVzIGZvciB0ZXN0aW5nKVxyXG5cdFx0XHRpZiAoIWZpbGUgfHwgIShcInN0YXRcIiBpbiBmaWxlKSkge1xyXG5cdFx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBjdXJyZW50VGltZXN0YW1wID0gKGZpbGUgYXMgVEZpbGUpLnN0YXQubXRpbWU7XHJcblx0XHRcdGNvbnN0IGNhY2hlZFRpbWVzdGFtcCA9XHJcblx0XHRcdFx0dGhpcy5maWxlTWV0YWRhdGFUaW1lc3RhbXBDYWNoZS5nZXQoZmlsZVBhdGgpO1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgaWYgY2FjaGUgaXMgdmFsaWQgKGZpbGUgaGFzbid0IGJlZW4gbW9kaWZpZWQpXHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHRjYWNoZWRUaW1lc3RhbXAgPT09IGN1cnJlbnRUaW1lc3RhbXAgJiZcclxuXHRcdFx0XHR0aGlzLmZpbGVNZXRhZGF0YUNhY2hlLmhhcyhmaWxlUGF0aClcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuZmlsZU1ldGFkYXRhQ2FjaGUuZ2V0KGZpbGVQYXRoKSB8fCBudWxsO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBDYWNoZSBtaXNzIG9yIGZpbGUgbW9kaWZpZWQgLSBnZXQgZnJlc2ggbWV0YWRhdGFcclxuXHRcdFx0Y29uc3QgbWV0YWRhdGEgPSB0aGlzLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUgYXMgVEZpbGUpO1xyXG5cdFx0XHRjb25zdCBmcm9udG1hdHRlciA9IG1ldGFkYXRhPy5mcm9udG1hdHRlciB8fCB7fTtcclxuXHJcblx0XHRcdC8vIFVwZGF0ZSBjYWNoZSB3aXRoIGZyZXNoIGRhdGFcclxuXHRcdFx0dGhpcy5maWxlTWV0YWRhdGFDYWNoZS5zZXQoZmlsZVBhdGgsIGZyb250bWF0dGVyKTtcclxuXHRcdFx0dGhpcy5maWxlTWV0YWRhdGFUaW1lc3RhbXBDYWNoZS5zZXQoZmlsZVBhdGgsIGN1cnJlbnRUaW1lc3RhbXApO1xyXG5cclxuXHRcdFx0cmV0dXJuIGZyb250bWF0dGVyO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKGBGYWlsZWQgdG8gZ2V0IGZpbGUgbWV0YWRhdGEgZm9yICR7ZmlsZVBhdGh9OmAsIGVycm9yKTtcclxuXHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBOb3JtYWxpemUgYSBwcm9qZWN0IHBhdGggdG8gdXNlIGNvbnNpc3RlbnQgc2VwYXJhdG9yc1xyXG5cdCAqIEBwYXJhbSBwYXRoIFRoZSBwYXRoIHRvIG5vcm1hbGl6ZVxyXG5cdCAqIEByZXR1cm5zIE5vcm1hbGl6ZWQgcGF0aCB3aXRoIGZvcndhcmQgc2xhc2hlc1xyXG5cdCAqL1xyXG5cdHB1YmxpYyBub3JtYWxpemVQcm9qZWN0UGF0aChwYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0aWYgKCFwYXRoKSByZXR1cm4gXCJcIjtcclxuXHJcblx0XHQvLyBSZXBsYWNlIGJhY2tzbGFzaGVzIHdpdGggZm9yd2FyZCBzbGFzaGVzXHJcblx0XHRsZXQgbm9ybWFsaXplZCA9IHBhdGgucmVwbGFjZSgvXFxcXC9nLCBcIi9cIik7XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIGR1cGxpY2F0ZSBzbGFzaGVzXHJcblx0XHRub3JtYWxpemVkID0gbm9ybWFsaXplZC5yZXBsYWNlKC9cXC8rL2csIFwiL1wiKTtcclxuXHJcblx0XHQvLyBSZW1vdmUgbGVhZGluZyBhbmQgdHJhaWxpbmcgc2xhc2hlc1xyXG5cdFx0bm9ybWFsaXplZCA9IG5vcm1hbGl6ZWQucmVwbGFjZSgvXlxcL3xcXC8kL2csIFwiXCIpO1xyXG5cclxuXHRcdHJldHVybiBub3JtYWxpemVkO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRGV0ZXJtaW5lIHRnUHJvamVjdCBmb3IgYSB0YXNrIGJhc2VkIG9uIHZhcmlvdXMgc291cmNlc1xyXG5cdCAqL1xyXG5cdGFzeW5jIGRldGVybWluZVRnUHJvamVjdChmaWxlUGF0aDogc3RyaW5nKTogUHJvbWlzZTxUZ1Byb2plY3QgfCB1bmRlZmluZWQ+IHtcclxuXHRcdC8vIEVhcmx5IHJldHVybiBpZiBlbmhhbmNlZCBwcm9qZWN0IGZlYXR1cmVzIGFyZSBkaXNhYmxlZFxyXG5cdFx0aWYgKCF0aGlzLmVuaGFuY2VkUHJvamVjdEVuYWJsZWQpIHtcclxuXHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyAxLiBDaGVjayBwYXRoLWJhc2VkIG1hcHBpbmdzIGZpcnN0IChoaWdoZXN0IHByaW9yaXR5KVxyXG5cdFx0Zm9yIChjb25zdCBtYXBwaW5nIG9mIHRoaXMucGF0aE1hcHBpbmdzKSB7XHJcblx0XHRcdGlmICghbWFwcGluZy5lbmFibGVkKSBjb250aW51ZTtcclxuXHJcblx0XHRcdC8vIFNpbXBsZSBwYXRoIG1hdGNoaW5nIC0gY291bGQgYmUgZW5oYW5jZWQgd2l0aCBnbG9iIHBhdHRlcm5zXHJcblx0XHRcdGlmICh0aGlzLm1hdGNoZXNQYXRoUGF0dGVybihmaWxlUGF0aCwgbWFwcGluZy5wYXRoUGF0dGVybikpIHtcclxuXHRcdFx0XHQvLyBOb3JtYWxpemUgdGhlIHByb2plY3QgbmFtZSB0byBzdXBwb3J0IG5lc3RlZCBwYXRoc1xyXG5cdFx0XHRcdGNvbnN0IG5vcm1hbGl6ZWROYW1lID0gdGhpcy5ub3JtYWxpemVQcm9qZWN0UGF0aChcclxuXHRcdFx0XHRcdG1hcHBpbmcucHJvamVjdE5hbWVcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHR0eXBlOiBcInBhdGhcIixcclxuXHRcdFx0XHRcdG5hbWU6IG5vcm1hbGl6ZWROYW1lLFxyXG5cdFx0XHRcdFx0c291cmNlOiBtYXBwaW5nLnBhdGhQYXR0ZXJuLFxyXG5cdFx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIDIuIENoZWNrIGN1c3RvbSBkZXRlY3Rpb24gbWV0aG9kc1xyXG5cdFx0aWYgKHRoaXMuZGV0ZWN0aW9uTWV0aG9kcyAmJiB0aGlzLmRldGVjdGlvbk1ldGhvZHMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRjb25zdCBmaWxlID0gdGhpcy52YXVsdC5nZXRGaWxlQnlQYXRoKGZpbGVQYXRoKTtcclxuXHRcdFx0aWYgKGZpbGUgJiYgZmlsZSBpbnN0YW5jZW9mIFRGaWxlKSB7XHJcblx0XHRcdFx0Y29uc3QgZmlsZUNhY2hlID0gdGhpcy5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKTtcclxuXHRcdFx0XHRjb25zdCBmaWxlTWV0YWRhdGEgPSB0aGlzLmdldEZpbGVNZXRhZGF0YShmaWxlUGF0aCk7XHJcblxyXG5cdFx0XHRcdGZvciAoY29uc3QgbWV0aG9kIG9mIHRoaXMuZGV0ZWN0aW9uTWV0aG9kcykge1xyXG5cdFx0XHRcdFx0aWYgKCFtZXRob2QuZW5hYmxlZCkgY29udGludWU7XHJcblxyXG5cdFx0XHRcdFx0c3dpdGNoIChtZXRob2QudHlwZSkge1xyXG5cdFx0XHRcdFx0XHRjYXNlIFwibWV0YWRhdGFcIjpcclxuXHRcdFx0XHRcdFx0XHQvLyBDaGVjayBpZiB0aGUgc3BlY2lmaWVkIG1ldGFkYXRhIHByb3BlcnR5IGV4aXN0c1xyXG5cdFx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHRcdGZpbGVNZXRhZGF0YSAmJlxyXG5cdFx0XHRcdFx0XHRcdFx0ZmlsZU1ldGFkYXRhW21ldGhvZC5wcm9wZXJ0eUtleV1cclxuXHRcdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHR5cGU6IFwibWV0YWRhdGFcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0bmFtZTogU3RyaW5nKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGZpbGVNZXRhZGF0YVttZXRob2QucHJvcGVydHlLZXldXHJcblx0XHRcdFx0XHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHRcdFx0XHRcdHNvdXJjZTogbWV0aG9kLnByb3BlcnR5S2V5LFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdFx0Y2FzZSBcInRhZ1wiOlxyXG5cdFx0XHRcdFx0XHRcdC8vIENoZWNrIGlmIGZpbGUgaGFzIHRoZSBzcGVjaWZpZWQgdGFnIChjb25zaWRlciBib3RoIGlubGluZSBhbmQgZnJvbnRtYXR0ZXIgdGFncylcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRjb25zdCB0YXJnZXRUYWcgPSBtZXRob2QucHJvcGVydHlLZXkuc3RhcnRzV2l0aChcclxuXHRcdFx0XHRcdFx0XHRcdFx0XCIjXCJcclxuXHRcdFx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0XHRcdFx0PyBtZXRob2QucHJvcGVydHlLZXlcclxuXHRcdFx0XHRcdFx0XHRcdFx0OiBgIyR7bWV0aG9kLnByb3BlcnR5S2V5fWA7XHJcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBub3JtYWxpemVkVGFyZ2V0ID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0dGFyZ2V0VGFnLnRvTG93ZXJDYXNlKCk7XHJcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBpbmxpbmVUYWdzID0gKGZpbGVDYWNoZT8udGFncyB8fCBbXSkubWFwKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHQodGMpID0+IHRjLnRhZ1xyXG5cdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IGZtVGFnc1JhdyA9IGZpbGVDYWNoZT8uZnJvbnRtYXR0ZXI/LnRhZ3M7XHJcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBmbVRhZ3NBcnIgPSBBcnJheS5pc0FycmF5KGZtVGFnc1JhdylcclxuXHRcdFx0XHRcdFx0XHRcdFx0PyBmbVRhZ3NSYXdcclxuXHRcdFx0XHRcdFx0XHRcdFx0OiBmbVRhZ3NSYXcgIT09IHVuZGVmaW5lZFxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ/IFtmbVRhZ3NSYXddXHJcblx0XHRcdFx0XHRcdFx0XHRcdDogW107XHJcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBmbVRhZ3NOb3JtID0gZm1UYWdzQXJyLm1hcCgodDogYW55KSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IHMgPSBTdHJpbmcodCB8fCBcIlwiKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHMuc3RhcnRzV2l0aChcIiNcIikgPyBzIDogYCMke3N9YDtcclxuXHRcdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgYWxsVGFncyA9IFtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Li4uaW5saW5lVGFncyxcclxuXHRcdFx0XHRcdFx0XHRcdFx0Li4uZm1UYWdzTm9ybSxcclxuXHRcdFx0XHRcdFx0XHRcdF0ubWFwKCh0KSA9PiBTdHJpbmcodCB8fCBcIlwiKS50b0xvd2VyQ2FzZSgpKTtcclxuXHRcdFx0XHRcdFx0XHRcdC8vIEZvciBmaWxlLWxldmVsIGRldGVjdGlvbjogcmVxdWlyZSBleGFjdCBtYXRjaDsgZG8gTk9UIHRyZWF0IGhpZXJhcmNoaWNhbCAnI3Byb2plY3QveHh4JyBhcyBtYXRjaCB1bmxlc3MgY29uZmlndXJlZCBleGFjdGx5XHJcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBoYXNUYWcgPSBhbGxUYWdzLnNvbWUoXHJcblx0XHRcdFx0XHRcdFx0XHRcdCh0KSA9PiB0ID09PSBub3JtYWxpemVkVGFyZ2V0XHJcblx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdGlmIChoYXNUYWcpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gRmlyc3QgdHJ5IHRvIHVzZSB0aXRsZSBvciBuYW1lIGZyb20gZnJvbnRtYXR0ZXIgYXMgcHJvamVjdCBuYW1lXHJcblx0XHRcdFx0XHRcdFx0XHRcdGlmIChmaWxlTWV0YWRhdGE/LnRpdGxlKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHR5cGU6IFwibWV0YWRhdGFcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdG5hbWU6IFN0cmluZyhmaWxlTWV0YWRhdGEudGl0bGUpLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0c291cmNlOiBcInRpdGxlICh2aWEgdGFnKVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0fTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoZmlsZU1ldGFkYXRhPy5uYW1lKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHR5cGU6IFwibWV0YWRhdGFcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdG5hbWU6IFN0cmluZyhmaWxlTWV0YWRhdGEubmFtZSksXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRzb3VyY2U6IFwibmFtZSAodmlhIHRhZylcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gRmFsbGJhY2s6IHVzZSB0aGUgZmlsZSBuYW1lICh3aXRob3V0IGV4dGVuc2lvbilcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgZmlsZU5hbWUgPVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGZpbGVQYXRoLnNwbGl0KFwiL1wiKS5wb3AoKSB8fCBmaWxlUGF0aDtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgbmFtZVdpdGhvdXRFeHQgPSBmaWxlTmFtZS5yZXBsYWNlKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdC9cXC5tZCQvaSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcIlwiXHJcblx0XHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0dHlwZTogXCJtZXRhZGF0YVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdG5hbWU6IG5hbWVXaXRob3V0RXh0LFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHNvdXJjZTogYHRhZzoke3RhcmdldFRhZ31gLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHRcdGNhc2UgXCJsaW5rXCI6XHJcblx0XHRcdFx0XHRcdFx0Ly8gQ2hlY2sgYWxsIGxpbmtzIGluIHRoZSBmaWxlXHJcblx0XHRcdFx0XHRcdFx0aWYgKGZpbGVDYWNoZT8ubGlua3MpIHtcclxuXHRcdFx0XHRcdFx0XHRcdGZvciAoY29uc3QgbGlua0NhY2hlIG9mIGZpbGVDYWNoZS5saW5rcykge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBsaW5rZWROb3RlID0gbGlua0NhY2hlLmxpbms7XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBJZiB0aGVyZSdzIGEgZmlsdGVyLCBjaGVjayBpZiB0aGUgbGluayBtYXRjaGVzXHJcblx0XHRcdFx0XHRcdFx0XHRcdGlmIChtZXRob2QubGlua0ZpbHRlcikge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGxpbmtlZE5vdGUuaW5jbHVkZXMoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdG1ldGhvZC5saW5rRmlsdGVyXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBGaXJzdCB0cnkgdG8gdXNlIHRpdGxlIG9yIG5hbWUgZnJvbSBmcm9udG1hdHRlciBhcyBwcm9qZWN0IG5hbWVcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGlmIChmaWxlTWV0YWRhdGE/LnRpdGxlKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0dHlwZTogXCJtZXRhZGF0YVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdG5hbWU6IFN0cmluZyhcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGZpbGVNZXRhZGF0YS50aXRsZVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0c291cmNlOiBcInRpdGxlICh2aWEgbGluaylcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGlmIChmaWxlTWV0YWRhdGE/Lm5hbWUpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0eXBlOiBcIm1ldGFkYXRhXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0bmFtZTogU3RyaW5nKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZmlsZU1ldGFkYXRhLm5hbWVcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHNvdXJjZTogXCJuYW1lICh2aWEgbGluaylcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8vIEZhbGxiYWNrOiB1c2UgdGhlIGZpbGUgbmFtZSAod2l0aG91dCBleHRlbnNpb24pXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBmaWxlTmFtZSA9XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGZpbGVQYXRoLnNwbGl0KFwiL1wiKS5wb3AoKSB8fFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRmaWxlUGF0aDtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IG5hbWVXaXRob3V0RXh0ID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZmlsZU5hbWUucmVwbGFjZSgvXFwubWQkL2ksIFwiXCIpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0dHlwZTogXCJtZXRhZGF0YVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRuYW1lOiBuYW1lV2l0aG91dEV4dCxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0c291cmNlOiBgbGluazoke2xpbmtlZE5vdGV9YCxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmIChtZXRob2QucHJvcGVydHlLZXkpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBJZiBhIHByb3BlcnR5IGtleSBpcyBzcGVjaWZpZWQsIG9ubHkgY2hlY2sgbGlua3MgaW4gdGhhdCBtZXRhZGF0YSBmaWVsZFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGZpbGVNZXRhZGF0YSAmJlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZmlsZU1ldGFkYXRhW21ldGhvZC5wcm9wZXJ0eUtleV1cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IHByb3BWYWx1ZSA9IFN0cmluZyhcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZmlsZU1ldGFkYXRhW21ldGhvZC5wcm9wZXJ0eUtleV1cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBDaGVjayBpZiB0aGlzIGxpbmsgaXMgbWVudGlvbmVkIGluIHRoZSBwcm9wZXJ0eVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRwcm9wVmFsdWUuaW5jbHVkZXMoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0YFtbJHtsaW5rZWROb3RlfV1dYFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gRmlyc3QgdHJ5IHRvIHVzZSB0aXRsZSBvciBuYW1lIGZyb20gZnJvbnRtYXR0ZXIgYXMgcHJvamVjdCBuYW1lXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGlmIChmaWxlTWV0YWRhdGE/LnRpdGxlKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHR5cGU6IFwibWV0YWRhdGFcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdG5hbWU6IFN0cmluZyhcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZmlsZU1ldGFkYXRhLnRpdGxlXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0c291cmNlOiBcInRpdGxlICh2aWEgbGluaylcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0aWYgKGZpbGVNZXRhZGF0YT8ubmFtZSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0eXBlOiBcIm1ldGFkYXRhXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRuYW1lOiBTdHJpbmcoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGZpbGVNZXRhZGF0YS5uYW1lXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0c291cmNlOiBcIm5hbWUgKHZpYSBsaW5rKVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBGYWxsYmFjazogdXNlIHRoZSBmaWxlIG5hbWUgKHdpdGhvdXQgZXh0ZW5zaW9uKVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBmaWxlTmFtZSA9XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZmlsZVBhdGguc3BsaXQoXCIvXCIpLnBvcCgpIHx8XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZmlsZVBhdGg7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IG5hbWVXaXRob3V0RXh0ID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRmaWxlTmFtZS5yZXBsYWNlKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0L1xcLm1kJC9pLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XCJcIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0dHlwZTogXCJtZXRhZGF0YVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdG5hbWU6IG5hbWVXaXRob3V0RXh0LFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHNvdXJjZTogYGxpbms6JHtsaW5rZWROb3RlfWAsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIDMuIENoZWNrIGZpbGUgbWV0YWRhdGEgKGZyb250bWF0dGVyKSAtIG9ubHkgaWYgbWV0YWRhdGEgZGV0ZWN0aW9uIGlzIGVuYWJsZWRcclxuXHRcdGlmICh0aGlzLm1ldGFkYXRhQ29uZmlnRW5hYmxlZCkge1xyXG5cdFx0XHRjb25zdCBmaWxlTWV0YWRhdGEgPSB0aGlzLmdldEZpbGVNZXRhZGF0YShmaWxlUGF0aCk7XHJcblx0XHRcdGlmIChmaWxlTWV0YWRhdGEgJiYgZmlsZU1ldGFkYXRhW3RoaXMubWV0YWRhdGFLZXldKSB7XHJcblx0XHRcdFx0Y29uc3QgcHJvamVjdEZyb21NZXRhZGF0YSA9IGZpbGVNZXRhZGF0YVt0aGlzLm1ldGFkYXRhS2V5XTtcclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHR0eXBlb2YgcHJvamVjdEZyb21NZXRhZGF0YSA9PT0gXCJzdHJpbmdcIiAmJlxyXG5cdFx0XHRcdFx0cHJvamVjdEZyb21NZXRhZGF0YS50cmltKClcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRcdHR5cGU6IFwibWV0YWRhdGFcIixcclxuXHRcdFx0XHRcdFx0bmFtZTogcHJvamVjdEZyb21NZXRhZGF0YS50cmltKCksXHJcblx0XHRcdFx0XHRcdHNvdXJjZTogdGhpcy5tZXRhZGF0YUtleSxcclxuXHRcdFx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIDMuIENoZWNrIHByb2plY3QgY29uZmlnIGZpbGUgKGxvd2VzdCBwcmlvcml0eSkgLSBvbmx5IGlmIGNvbmZpZyBmaWxlIGRldGVjdGlvbiBpcyBlbmFibGVkXHJcblx0XHRpZiAodGhpcy5jb25maWdGaWxlRW5hYmxlZCkge1xyXG5cdFx0XHRjb25zdCBjb25maWdEYXRhID0gYXdhaXQgdGhpcy5nZXRQcm9qZWN0Q29uZmlnKGZpbGVQYXRoKTtcclxuXHRcdFx0aWYgKGNvbmZpZ0RhdGEgJiYgY29uZmlnRGF0YS5wcm9qZWN0KSB7XHJcblx0XHRcdFx0Y29uc3QgcHJvamVjdEZyb21Db25maWcgPSBjb25maWdEYXRhLnByb2plY3Q7XHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0dHlwZW9mIHByb2plY3RGcm9tQ29uZmlnID09PSBcInN0cmluZ1wiICYmXHJcblx0XHRcdFx0XHRwcm9qZWN0RnJvbUNvbmZpZy50cmltKClcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRcdHR5cGU6IFwiY29uZmlnXCIsXHJcblx0XHRcdFx0XHRcdG5hbWU6IHByb2plY3RGcm9tQ29uZmlnLnRyaW0oKSxcclxuXHRcdFx0XHRcdFx0c291cmNlOiB0aGlzLmNvbmZpZ0ZpbGVOYW1lLFxyXG5cdFx0XHRcdFx0XHRyZWFkb25seTogdHJ1ZSxcclxuXHRcdFx0XHRcdH07XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gNC4gQXBwbHkgZGVmYXVsdCBwcm9qZWN0IG5hbWluZyBzdHJhdGVneSAobG93ZXN0IHByaW9yaXR5KVxyXG5cdFx0aWYgKHRoaXMuZGVmYXVsdFByb2plY3ROYW1pbmcuZW5hYmxlZCkge1xyXG5cdFx0XHRjb25zdCBkZWZhdWx0UHJvamVjdCA9IHRoaXMuZ2VuZXJhdGVEZWZhdWx0UHJvamVjdE5hbWUoZmlsZVBhdGgpO1xyXG5cdFx0XHRpZiAoZGVmYXVsdFByb2plY3QpIHtcclxuXHRcdFx0XHQvLyBOb3JtYWxpemUgZGVmYXVsdCBwcm9qZWN0IG5hbWUgYXMgd2VsbFxyXG5cdFx0XHRcdGNvbnN0IG5vcm1hbGl6ZWROYW1lID1cclxuXHRcdFx0XHRcdHRoaXMubm9ybWFsaXplUHJvamVjdFBhdGgoZGVmYXVsdFByb2plY3QpO1xyXG5cdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHR0eXBlOiBcImRlZmF1bHRcIixcclxuXHRcdFx0XHRcdG5hbWU6IG5vcm1hbGl6ZWROYW1lLFxyXG5cdFx0XHRcdFx0c291cmNlOiB0aGlzLmRlZmF1bHRQcm9qZWN0TmFtaW5nLnN0cmF0ZWd5LFxyXG5cdFx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB1bmRlZmluZWQ7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgZW5oYW5jZWQgbWV0YWRhdGEgZm9yIGEgZmlsZSAoY29tYmluZXMgZnJvbnRtYXR0ZXIgYW5kIGNvbmZpZykgd2l0aCBjb21wb3NpdGUgY2FjaGluZ1xyXG5cdCAqL1xyXG5cdGFzeW5jIGdldEVuaGFuY2VkTWV0YWRhdGEoZmlsZVBhdGg6IHN0cmluZyk6IFByb21pc2U8UmVjb3JkPHN0cmluZywgYW55Pj4ge1xyXG5cdFx0Ly8gRWFybHkgcmV0dXJuIGlmIGVuaGFuY2VkIHByb2plY3QgZmVhdHVyZXMgYXJlIGRpc2FibGVkXHJcblx0XHRpZiAoIXRoaXMuZW5oYW5jZWRQcm9qZWN0RW5hYmxlZCkge1xyXG5cdFx0XHRyZXR1cm4ge307XHJcblx0XHR9XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Ly8gR2V0IGZpbGUgdGltZXN0YW1wIGZvciBjYWNoZSBrZXlcclxuXHRcdFx0Y29uc3QgZmlsZSA9IHRoaXMudmF1bHQuZ2V0RmlsZUJ5UGF0aChmaWxlUGF0aCk7XHJcblx0XHRcdGlmICghZmlsZSB8fCAhKFwic3RhdFwiIGluIGZpbGUpKSB7XHJcblx0XHRcdFx0cmV0dXJuIHt9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBmaWxlVGltZXN0YW1wID0gKGZpbGUgYXMgVEZpbGUpLnN0YXQubXRpbWU7XHJcblxyXG5cdFx0XHQvLyBHZXQgY29uZmlnIGZpbGUgdGltZXN0YW1wIGZvciBjYWNoZSBrZXlcclxuXHRcdFx0Y29uc3QgY29uZmlnRmlsZSA9IGF3YWl0IHRoaXMuZmluZFByb2plY3RDb25maWdGaWxlKGZpbGVQYXRoKTtcclxuXHRcdFx0Y29uc3QgY29uZmlnVGltZXN0YW1wID0gY29uZmlnRmlsZSA/IGNvbmZpZ0ZpbGUuc3RhdC5tdGltZSA6IDA7XHJcblxyXG5cdFx0XHQvLyBDcmVhdGUgY29tcG9zaXRlIGNhY2hlIGtleVxyXG5cdFx0XHRjb25zdCBjYWNoZUtleSA9IGAke2ZpbGVUaW1lc3RhbXB9XyR7Y29uZmlnVGltZXN0YW1wfWA7XHJcblx0XHRcdGNvbnN0IGNhY2hlZENhY2hlS2V5ID1cclxuXHRcdFx0XHR0aGlzLmVuaGFuY2VkTWV0YWRhdGFUaW1lc3RhbXBDYWNoZS5nZXQoZmlsZVBhdGgpO1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgaWYgY2FjaGUgaXMgdmFsaWQgKG5laXRoZXIgZmlsZSBub3IgY29uZmlnIGhhcyBiZWVuIG1vZGlmaWVkKVxyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0Y2FjaGVkQ2FjaGVLZXkgPT09IGNhY2hlS2V5ICYmXHJcblx0XHRcdFx0dGhpcy5lbmhhbmNlZE1ldGFkYXRhQ2FjaGUuaGFzKGZpbGVQYXRoKVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5lbmhhbmNlZE1ldGFkYXRhQ2FjaGUuZ2V0KGZpbGVQYXRoKSB8fCB7fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ2FjaGUgbWlzcyBvciBmaWxlcyBtb2RpZmllZCAtIGNvbXB1dGUgZnJlc2ggZW5oYW5jZWQgbWV0YWRhdGFcclxuXHRcdFx0Y29uc3QgZmlsZU1ldGFkYXRhID0gdGhpcy5nZXRGaWxlTWV0YWRhdGEoZmlsZVBhdGgpIHx8IHt9O1xyXG5cdFx0XHRjb25zdCBjb25maWdEYXRhID0gKGF3YWl0IHRoaXMuZ2V0UHJvamVjdENvbmZpZyhmaWxlUGF0aCkpIHx8IHt9O1xyXG5cclxuXHRcdFx0Ly8gTWVyZ2UgbWV0YWRhdGEsIHdpdGggZmlsZSBtZXRhZGF0YSB0YWtpbmcgcHJlY2VkZW5jZVxyXG5cdFx0XHRsZXQgbWVyZ2VkTWV0YWRhdGEgPSB7IC4uLmNvbmZpZ0RhdGEsIC4uLmZpbGVNZXRhZGF0YSB9O1xyXG5cclxuXHRcdFx0Ly8gQXBwbHkgbWV0YWRhdGEgbWFwcGluZ3NcclxuXHRcdFx0bWVyZ2VkTWV0YWRhdGEgPSB0aGlzLmFwcGx5TWV0YWRhdGFNYXBwaW5ncyhtZXJnZWRNZXRhZGF0YSk7XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgY2FjaGUgd2l0aCBmcmVzaCBkYXRhXHJcblx0XHRcdHRoaXMuZW5oYW5jZWRNZXRhZGF0YUNhY2hlLnNldChmaWxlUGF0aCwgbWVyZ2VkTWV0YWRhdGEpO1xyXG5cdFx0XHR0aGlzLmVuaGFuY2VkTWV0YWRhdGFUaW1lc3RhbXBDYWNoZS5zZXQoZmlsZVBhdGgsIGNhY2hlS2V5KTtcclxuXHJcblx0XHRcdHJldHVybiBtZXJnZWRNZXRhZGF0YTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRgRmFpbGVkIHRvIGdldCBlbmhhbmNlZCBtZXRhZGF0YSBmb3IgJHtmaWxlUGF0aH06YCxcclxuXHRcdFx0XHRlcnJvclxyXG5cdFx0XHQpO1xyXG5cdFx0XHRyZXR1cm4ge307XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDbGVhciBjYWNoZSBmb3IgYSBzcGVjaWZpYyBmaWxlIG9yIGFsbCBmaWxlc1xyXG5cdCAqL1xyXG5cdGNsZWFyQ2FjaGUoZmlsZVBhdGg/OiBzdHJpbmcpOiB2b2lkIHtcclxuXHRcdGlmIChmaWxlUGF0aCkge1xyXG5cdFx0XHQvLyBDbGVhciBjYWNoZSBmb3Igc3BlY2lmaWMgY29uZmlnIGZpbGVcclxuXHRcdFx0Y29uc3QgY29uZmlnRmlsZSA9IHRoaXMuZmluZFByb2plY3RDb25maWdGaWxlU3luYyhmaWxlUGF0aCk7XHJcblx0XHRcdGlmIChjb25maWdGaWxlKSB7XHJcblx0XHRcdFx0dGhpcy5jb25maWdDYWNoZS5kZWxldGUoY29uZmlnRmlsZS5wYXRoKTtcclxuXHRcdFx0XHR0aGlzLmxhc3RNb2RpZmllZENhY2hlLmRlbGV0ZShjb25maWdGaWxlLnBhdGgpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBDbGVhciBmaWxlLXNwZWNpZmljIG1ldGFkYXRhIGNhY2hlc1xyXG5cdFx0XHR0aGlzLmZpbGVNZXRhZGF0YUNhY2hlLmRlbGV0ZShmaWxlUGF0aCk7XHJcblx0XHRcdHRoaXMuZmlsZU1ldGFkYXRhVGltZXN0YW1wQ2FjaGUuZGVsZXRlKGZpbGVQYXRoKTtcclxuXHRcdFx0dGhpcy5lbmhhbmNlZE1ldGFkYXRhQ2FjaGUuZGVsZXRlKGZpbGVQYXRoKTtcclxuXHRcdFx0dGhpcy5lbmhhbmNlZE1ldGFkYXRhVGltZXN0YW1wQ2FjaGUuZGVsZXRlKGZpbGVQYXRoKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIENsZWFyIGFsbCBjYWNoZXNcclxuXHRcdFx0dGhpcy5jb25maWdDYWNoZS5jbGVhcigpO1xyXG5cdFx0XHR0aGlzLmxhc3RNb2RpZmllZENhY2hlLmNsZWFyKCk7XHJcblx0XHRcdHRoaXMuZmlsZU1ldGFkYXRhQ2FjaGUuY2xlYXIoKTtcclxuXHRcdFx0dGhpcy5maWxlTWV0YWRhdGFUaW1lc3RhbXBDYWNoZS5jbGVhcigpO1xyXG5cdFx0XHR0aGlzLmVuaGFuY2VkTWV0YWRhdGFDYWNoZS5jbGVhcigpO1xyXG5cdFx0XHR0aGlzLmVuaGFuY2VkTWV0YWRhdGFUaW1lc3RhbXBDYWNoZS5jbGVhcigpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRmluZCBwcm9qZWN0IGNvbmZpZ3VyYXRpb24gZmlsZSBmb3IgYSBnaXZlbiBmaWxlIHBhdGhcclxuXHQgKi9cclxuXHRwcml2YXRlIGFzeW5jIGZpbmRQcm9qZWN0Q29uZmlnRmlsZShcclxuXHRcdGZpbGVQYXRoOiBzdHJpbmdcclxuXHQpOiBQcm9taXNlPFRGaWxlIHwgbnVsbD4ge1xyXG5cdFx0Ly8gRWFybHkgcmV0dXJuIGlmIGVuaGFuY2VkIHByb2plY3QgZmVhdHVyZXMgYXJlIGRpc2FibGVkXHJcblx0XHRpZiAoIXRoaXMuZW5oYW5jZWRQcm9qZWN0RW5hYmxlZCkge1xyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBmaWxlID0gdGhpcy52YXVsdC5nZXRGaWxlQnlQYXRoKGZpbGVQYXRoKTtcclxuXHRcdGlmICghZmlsZSkge1xyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHJcblx0XHRsZXQgY3VycmVudEZvbGRlciA9IGZpbGUucGFyZW50O1xyXG5cclxuXHRcdHdoaWxlIChjdXJyZW50Rm9sZGVyKSB7XHJcblx0XHRcdC8vIExvb2sgZm9yIGNvbmZpZyBmaWxlIGluIGN1cnJlbnQgZm9sZGVyXHJcblx0XHRcdGNvbnN0IGNvbmZpZ0ZpbGUgPSBjdXJyZW50Rm9sZGVyLmNoaWxkcmVuLmZpbmQoXHJcblx0XHRcdFx0KGNoaWxkOiBhbnkpID0+XHJcblx0XHRcdFx0XHRjaGlsZCAmJlxyXG5cdFx0XHRcdFx0Y2hpbGQubmFtZSA9PT0gdGhpcy5jb25maWdGaWxlTmFtZSAmJlxyXG5cdFx0XHRcdFx0XCJzdGF0XCIgaW4gY2hpbGQgLy8gQ2hlY2sgaWYgaXQncyBhIGZpbGUtbGlrZSBvYmplY3RcclxuXHRcdFx0KSBhcyBURmlsZSB8IHVuZGVmaW5lZDtcclxuXHJcblx0XHRcdGlmIChjb25maWdGaWxlKSB7XHJcblx0XHRcdFx0cmV0dXJuIGNvbmZpZ0ZpbGU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIElmIG5vdCBzZWFyY2hpbmcgcmVjdXJzaXZlbHksIHN0b3AgaGVyZVxyXG5cdFx0XHRpZiAoIXRoaXMuc2VhcmNoUmVjdXJzaXZlbHkpIHtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gTW92ZSB0byBwYXJlbnQgZm9sZGVyXHJcblx0XHRcdGN1cnJlbnRGb2xkZXIgPSBjdXJyZW50Rm9sZGVyLnBhcmVudDtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFN5bmNocm9ub3VzIHZlcnNpb24gb2YgZmluZFByb2plY3RDb25maWdGaWxlIGZvciBjYWNoZSBjbGVhcmluZ1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgZmluZFByb2plY3RDb25maWdGaWxlU3luYyhmaWxlUGF0aDogc3RyaW5nKTogVEZpbGUgfCBudWxsIHtcclxuXHRcdC8vIEVhcmx5IHJldHVybiBpZiBlbmhhbmNlZCBwcm9qZWN0IGZlYXR1cmVzIGFyZSBkaXNhYmxlZFxyXG5cdFx0aWYgKCF0aGlzLmVuaGFuY2VkUHJvamVjdEVuYWJsZWQpIHtcclxuXHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgZmlsZSA9IHRoaXMudmF1bHQuZ2V0RmlsZUJ5UGF0aChmaWxlUGF0aCk7XHJcblx0XHRpZiAoIWZpbGUpIHtcclxuXHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0bGV0IGN1cnJlbnRGb2xkZXIgPSBmaWxlLnBhcmVudDtcclxuXHJcblx0XHR3aGlsZSAoY3VycmVudEZvbGRlcikge1xyXG5cdFx0XHRjb25zdCBjb25maWdGaWxlID0gY3VycmVudEZvbGRlci5jaGlsZHJlbi5maW5kKFxyXG5cdFx0XHRcdChjaGlsZDogYW55KSA9PlxyXG5cdFx0XHRcdFx0Y2hpbGQgJiZcclxuXHRcdFx0XHRcdGNoaWxkLm5hbWUgPT09IHRoaXMuY29uZmlnRmlsZU5hbWUgJiZcclxuXHRcdFx0XHRcdFwic3RhdFwiIGluIGNoaWxkIC8vIENoZWNrIGlmIGl0J3MgYSBmaWxlLWxpa2Ugb2JqZWN0XHJcblx0XHRcdCkgYXMgVEZpbGUgfCB1bmRlZmluZWQ7XHJcblxyXG5cdFx0XHRpZiAoY29uZmlnRmlsZSkge1xyXG5cdFx0XHRcdHJldHVybiBjb25maWdGaWxlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoIXRoaXMuc2VhcmNoUmVjdXJzaXZlbHkpIHtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y3VycmVudEZvbGRlciA9IGN1cnJlbnRGb2xkZXIucGFyZW50O1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBudWxsO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUGFyc2UgY29uZmlndXJhdGlvbiBjb250ZW50IGZvciBwcm9qZWN0IGluZm9ybWF0aW9uXHJcblx0ICovXHJcblx0cHJpdmF0ZSBwYXJzZUNvbmZpZ0NvbnRlbnQoY29udGVudDogc3RyaW5nKTogUHJvamVjdENvbmZpZ0RhdGEge1xyXG5cdFx0Y29uc3QgY29uZmlnOiBQcm9qZWN0Q29uZmlnRGF0YSA9IHt9O1xyXG5cclxuXHRcdC8vIFNpbXBsZSBwYXJzaW5nIGZvciBwcm9qZWN0IGluZm9ybWF0aW9uXHJcblx0XHQvLyBUaGlzIGNvdWxkIGJlIGVuaGFuY2VkIHRvIHN1cHBvcnQgbW9yZSBjb21wbGV4IGZvcm1hdHNcclxuXHRcdGNvbnN0IGxpbmVzID0gY29udGVudC5zcGxpdChcIlxcblwiKTtcclxuXHJcblx0XHRmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcclxuXHRcdFx0Y29uc3QgdHJpbW1lZCA9IGxpbmUudHJpbSgpO1xyXG5cclxuXHRcdFx0Ly8gU2tpcCBlbXB0eSBsaW5lcyBhbmQgY29tbWVudHNcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdCF0cmltbWVkIHx8XHJcblx0XHRcdFx0dHJpbW1lZC5zdGFydHNXaXRoKFwiI1wiKSB8fFxyXG5cdFx0XHRcdHRyaW1tZWQuc3RhcnRzV2l0aChcIi8vXCIpXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBMb29rIGZvciBrZXktdmFsdWUgcGFpcnNcclxuXHRcdFx0Y29uc3QgY29sb25JbmRleCA9IHRyaW1tZWQuaW5kZXhPZihcIjpcIik7XHJcblx0XHRcdGlmIChjb2xvbkluZGV4ID4gMCkge1xyXG5cdFx0XHRcdGNvbnN0IGtleSA9IHRyaW1tZWQuc3Vic3RyaW5nKDAsIGNvbG9uSW5kZXgpLnRyaW0oKTtcclxuXHRcdFx0XHRjb25zdCB2YWx1ZSA9IHRyaW1tZWQuc3Vic3RyaW5nKGNvbG9uSW5kZXggKyAxKS50cmltKCk7XHJcblxyXG5cdFx0XHRcdGlmIChrZXkgJiYgdmFsdWUpIHtcclxuXHRcdFx0XHRcdC8vIFJlbW92ZSBxdW90ZXMgaWYgcHJlc2VudFxyXG5cdFx0XHRcdFx0Y29uc3QgY2xlYW5WYWx1ZSA9IHZhbHVlLnJlcGxhY2UoL15bXCInXXxbXCInXSQvZywgXCJcIik7XHJcblx0XHRcdFx0XHRjb25maWdba2V5XSA9IGNsZWFuVmFsdWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGNvbmZpZztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGlmIGEgZmlsZSBwYXRoIG1hdGNoZXMgYSBwYXRoIHBhdHRlcm5cclxuXHQgKi9cclxuXHRwcml2YXRlIG1hdGNoZXNQYXRoUGF0dGVybihmaWxlUGF0aDogc3RyaW5nLCBwYXR0ZXJuOiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHRcdC8vIFNpbXBsZSBwYXR0ZXJuIG1hdGNoaW5nIC0gY291bGQgYmUgZW5oYW5jZWQgd2l0aCBnbG9iIHBhdHRlcm5zXHJcblx0XHQvLyBGb3Igbm93LCBqdXN0IGNoZWNrIGlmIHRoZSBmaWxlIHBhdGggY29udGFpbnMgdGhlIHBhdHRlcm5cclxuXHRcdGNvbnN0IG5vcm1hbGl6ZWRQYXRoID0gZmlsZVBhdGgucmVwbGFjZSgvXFxcXC9nLCBcIi9cIik7XHJcblx0XHRjb25zdCBub3JtYWxpemVkUGF0dGVybiA9IHBhdHRlcm4ucmVwbGFjZSgvXFxcXC9nLCBcIi9cIik7XHJcblxyXG5cdFx0Ly8gU3VwcG9ydCB3aWxkY2FyZHNcclxuXHRcdGlmIChwYXR0ZXJuLmluY2x1ZGVzKFwiKlwiKSkge1xyXG5cdFx0XHRjb25zdCByZWdleFBhdHRlcm4gPSBwYXR0ZXJuXHJcblx0XHRcdFx0LnJlcGxhY2UoL1xcKi9nLCBcIi4qXCIpXHJcblx0XHRcdFx0LnJlcGxhY2UoL1xcPy9nLCBcIi5cIik7XHJcblx0XHRcdGNvbnN0IHJlZ2V4ID0gbmV3IFJlZ0V4cChgXiR7cmVnZXhQYXR0ZXJufSRgLCBcImlcIik7XHJcblx0XHRcdHJldHVybiByZWdleC50ZXN0KG5vcm1hbGl6ZWRQYXRoKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTaW1wbGUgc3Vic3RyaW5nIG1hdGNoXHJcblx0XHRyZXR1cm4gbm9ybWFsaXplZFBhdGguaW5jbHVkZXMobm9ybWFsaXplZFBhdHRlcm4pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQXBwbHkgbWV0YWRhdGEgbWFwcGluZ3MgdG8gdHJhbnNmb3JtIHNvdXJjZSBtZXRhZGF0YSBrZXlzIHRvIHRhcmdldCBrZXlzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhcHBseU1ldGFkYXRhTWFwcGluZ3MoXHJcblx0XHRtZXRhZGF0YTogUmVjb3JkPHN0cmluZywgYW55PlxyXG5cdCk6IFJlY29yZDxzdHJpbmcsIGFueT4ge1xyXG5cdFx0Y29uc3QgcmVzdWx0ID0geyAuLi5tZXRhZGF0YSB9O1xyXG5cclxuXHRcdGZvciAoY29uc3QgbWFwcGluZyBvZiB0aGlzLm1ldGFkYXRhTWFwcGluZ3MpIHtcclxuXHRcdFx0aWYgKCFtYXBwaW5nLmVuYWJsZWQpIGNvbnRpbnVlO1xyXG5cclxuXHRcdFx0Y29uc3Qgc291cmNlVmFsdWUgPSBtZXRhZGF0YVttYXBwaW5nLnNvdXJjZUtleV07XHJcblx0XHRcdGlmIChzb3VyY2VWYWx1ZSAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0Ly8gQXBwbHkgaW50ZWxsaWdlbnQgdHlwZSBjb252ZXJzaW9uIGZvciBjb21tb24gZmllbGQgdHlwZXNcclxuXHRcdFx0XHRyZXN1bHRbbWFwcGluZy50YXJnZXRLZXldID0gdGhpcy5jb252ZXJ0TWV0YWRhdGFWYWx1ZShcclxuXHRcdFx0XHRcdG1hcHBpbmcudGFyZ2V0S2V5LFxyXG5cdFx0XHRcdFx0c291cmNlVmFsdWVcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHJlc3VsdDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENvbnZlcnQgbWV0YWRhdGEgdmFsdWUgYmFzZWQgb24gdGFyZ2V0IGtleSB0eXBlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjb252ZXJ0TWV0YWRhdGFWYWx1ZSh0YXJnZXRLZXk6IHN0cmluZywgdmFsdWU6IGFueSk6IGFueSB7XHJcblx0XHQvLyBEYXRlIGZpZWxkIGRldGVjdGlvbiBwYXR0ZXJuc1xyXG5cdFx0Y29uc3QgZGF0ZUZpZWxkUGF0dGVybnMgPSBbXHJcblx0XHRcdFwiZHVlXCIsXHJcblx0XHRcdFwiZHVlRGF0ZVwiLFxyXG5cdFx0XHRcImRlYWRsaW5lXCIsXHJcblx0XHRcdFwic3RhcnRcIixcclxuXHRcdFx0XCJzdGFydERhdGVcIixcclxuXHRcdFx0XCJzdGFydGVkXCIsXHJcblx0XHRcdFwic2NoZWR1bGVkXCIsXHJcblx0XHRcdFwic2NoZWR1bGVkRGF0ZVwiLFxyXG5cdFx0XHRcInNjaGVkdWxlZF9mb3JcIixcclxuXHRcdFx0XCJjb21wbGV0ZWRcIixcclxuXHRcdFx0XCJjb21wbGV0ZWREYXRlXCIsXHJcblx0XHRcdFwiZmluaXNoZWRcIixcclxuXHRcdFx0XCJjcmVhdGVkXCIsXHJcblx0XHRcdFwiY3JlYXRlZERhdGVcIixcclxuXHRcdFx0XCJjcmVhdGVkX2F0XCIsXHJcblx0XHRdO1xyXG5cclxuXHRcdC8vIFByaW9yaXR5IGZpZWxkIGRldGVjdGlvbiBwYXR0ZXJuc1xyXG5cdFx0Y29uc3QgcHJpb3JpdHlGaWVsZFBhdHRlcm5zID0gW1wicHJpb3JpdHlcIiwgXCJ1cmdlbmN5XCIsIFwiaW1wb3J0YW5jZVwiXTtcclxuXHJcblx0XHQvLyBDaGVjayBpZiBpdCdzIGEgZGF0ZSBmaWVsZFxyXG5cdFx0Y29uc3QgaXNEYXRlRmllbGQgPSBkYXRlRmllbGRQYXR0ZXJucy5zb21lKChwYXR0ZXJuKSA9PlxyXG5cdFx0XHR0YXJnZXRLZXkudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhwYXR0ZXJuLnRvTG93ZXJDYXNlKCkpXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIENoZWNrIGlmIGl0J3MgYSBwcmlvcml0eSBmaWVsZFxyXG5cdFx0Y29uc3QgaXNQcmlvcml0eUZpZWxkID0gcHJpb3JpdHlGaWVsZFBhdHRlcm5zLnNvbWUoKHBhdHRlcm4pID0+XHJcblx0XHRcdHRhcmdldEtleS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHBhdHRlcm4udG9Mb3dlckNhc2UoKSlcclxuXHRcdCk7XHJcblxyXG5cdFx0aWYgKGlzRGF0ZUZpZWxkICYmIHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHQvLyBUcnkgdG8gY29udmVydCBkYXRlIHN0cmluZyB0byB0aW1lc3RhbXAgZm9yIGJldHRlciBwZXJmb3JtYW5jZVxyXG5cdFx0XHRpZiAoL15cXGR7NH0tXFxkezJ9LVxcZHsyfS8udGVzdCh2YWx1ZSkpIHtcclxuXHRcdFx0XHQvLyBVc2UgdGhlIHNhbWUgZGF0ZSBwYXJzaW5nIGxvZ2ljIGFzIE1hcmtkb3duVGFza1BhcnNlclxyXG5cdFx0XHRcdGNvbnN0IHtcclxuXHRcdFx0XHRcdHBhcnNlTG9jYWxEYXRlLFxyXG5cdFx0XHRcdH0gPSByZXF1aXJlKFwiLi4vdXRpbHMvZGF0ZS9kYXRlLWZvcm1hdHRlclwiKTtcclxuXHRcdFx0XHRjb25zdCB0aW1lc3RhbXAgPSBwYXJzZUxvY2FsRGF0ZSh2YWx1ZSk7XHJcblx0XHRcdFx0cmV0dXJuIHRpbWVzdGFtcCAhPT0gdW5kZWZpbmVkID8gdGltZXN0YW1wIDogdmFsdWU7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSBpZiAoaXNQcmlvcml0eUZpZWxkICYmIHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHQvLyBDb252ZXJ0IHByaW9yaXR5IHN0cmluZyB0byBudW1iZXIgdXNpbmcgdGhlIHN0YW5kYXJkIFBSSU9SSVRZX01BUCBzY2FsZVxyXG5cdFx0XHRjb25zdCBwcmlvcml0eU1hcDogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHtcclxuXHRcdFx0XHRoaWdoZXN0OiA1LFxyXG5cdFx0XHRcdHVyZ2VudDogNSxcclxuXHRcdFx0XHRjcml0aWNhbDogNSxcclxuXHRcdFx0XHRoaWdoOiA0LFxyXG5cdFx0XHRcdGltcG9ydGFudDogNCxcclxuXHRcdFx0XHRtZWRpdW06IDMsXHJcblx0XHRcdFx0bm9ybWFsOiAzLFxyXG5cdFx0XHRcdG1vZGVyYXRlOiAzLFxyXG5cdFx0XHRcdGxvdzogMixcclxuXHRcdFx0XHRtaW5vcjogMixcclxuXHRcdFx0XHRsb3dlc3Q6IDEsXHJcblx0XHRcdFx0dHJpdmlhbDogMSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IG51bWVyaWNQcmlvcml0eSA9IHBhcnNlSW50KHZhbHVlLCAxMCk7XHJcblx0XHRcdGlmICghaXNOYU4obnVtZXJpY1ByaW9yaXR5KSkge1xyXG5cdFx0XHRcdHJldHVybiBudW1lcmljUHJpb3JpdHk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IG1hcHBlZFByaW9yaXR5ID0gcHJpb3JpdHlNYXBbdmFsdWUudG9Mb3dlckNhc2UoKV07XHJcblx0XHRcdGlmIChtYXBwZWRQcmlvcml0eSAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0cmV0dXJuIG1hcHBlZFByaW9yaXR5O1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUmV0dXJuIG9yaWdpbmFsIHZhbHVlIGlmIG5vIGNvbnZlcnNpb24gaXMgbmVlZGVkXHJcblx0XHRyZXR1cm4gdmFsdWU7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBQdWJsaWMgbWV0aG9kIHRvIGFwcGx5IG1ldGFkYXRhIG1hcHBpbmdzIHRvIGFueSBtZXRhZGF0YSBvYmplY3RcclxuXHQgKi9cclxuXHRwdWJsaWMgYXBwbHlNYXBwaW5nc1RvTWV0YWRhdGEoXHJcblx0XHRtZXRhZGF0YTogUmVjb3JkPHN0cmluZywgYW55PlxyXG5cdCk6IFJlY29yZDxzdHJpbmcsIGFueT4ge1xyXG5cdFx0cmV0dXJuIHRoaXMuYXBwbHlNZXRhZGF0YU1hcHBpbmdzKG1ldGFkYXRhKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdlbmVyYXRlIGRlZmF1bHQgcHJvamVjdCBuYW1lIGJhc2VkIG9uIGNvbmZpZ3VyZWQgc3RyYXRlZ3lcclxuXHQgKi9cclxuXHRwcml2YXRlIGdlbmVyYXRlRGVmYXVsdFByb2plY3ROYW1lKGZpbGVQYXRoOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcclxuXHRcdC8vIEVhcmx5IHJldHVybiBpZiBlbmhhbmNlZCBwcm9qZWN0IGZlYXR1cmVzIGFyZSBkaXNhYmxlZFxyXG5cdFx0aWYgKFxyXG5cdFx0XHQhdGhpcy5lbmhhbmNlZFByb2plY3RFbmFibGVkIHx8XHJcblx0XHRcdCF0aGlzLmRlZmF1bHRQcm9qZWN0TmFtaW5nLmVuYWJsZWRcclxuXHRcdCkge1xyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHJcblx0XHRzd2l0Y2ggKHRoaXMuZGVmYXVsdFByb2plY3ROYW1pbmcuc3RyYXRlZ3kpIHtcclxuXHRcdFx0Y2FzZSBcImZpbGVuYW1lXCI6IHtcclxuXHRcdFx0XHRjb25zdCBmaWxlTmFtZSA9IGZpbGVQYXRoLnNwbGl0KFwiL1wiKS5wb3AoKSB8fCBcIlwiO1xyXG5cdFx0XHRcdGlmICh0aGlzLmRlZmF1bHRQcm9qZWN0TmFtaW5nLnN0cmlwRXh0ZW5zaW9uKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gZmlsZU5hbWUucmVwbGFjZSgvXFwuW14vLl0rJC8sIFwiXCIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gZmlsZU5hbWU7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSBcImZvbGRlcm5hbWVcIjoge1xyXG5cdFx0XHRcdGNvbnN0IG5vcm1hbGl6ZWRQYXRoID0gZmlsZVBhdGgucmVwbGFjZSgvXFxcXC9nLCBcIi9cIik7XHJcblx0XHRcdFx0Y29uc3QgcGF0aFBhcnRzID0gbm9ybWFsaXplZFBhdGguc3BsaXQoXCIvXCIpO1xyXG5cclxuXHRcdFx0XHQvLyBGb3IgcGF0aC1iYXNlZCBwcm9qZWN0cywgYnVpbGQgbmVzdGVkIHN0cnVjdHVyZSBmcm9tIGZvbGRlciBwYXRoXHJcblx0XHRcdFx0Ly8gZS5nLiwgXCJQcm9qZWN0cy9XZWIvRnJvbnRlbmQvZmlsZS5tZFwiIC0+IFwiV2ViL0Zyb250ZW5kXCJcclxuXHRcdFx0XHRpZiAocGF0aFBhcnRzLmxlbmd0aCA+IDEpIHtcclxuXHRcdFx0XHRcdC8vIEZpbmQgaWYgcGF0aCBjb250YWlucyBhIGNvbW1vbiBwcm9qZWN0IHJvb3QgZm9sZGVyXHJcblx0XHRcdFx0XHRjb25zdCBwcm9qZWN0Um9vdEluZGV4ID0gcGF0aFBhcnRzLmZpbmRJbmRleChcclxuXHRcdFx0XHRcdFx0KHBhcnQpID0+XHJcblx0XHRcdFx0XHRcdFx0cGFydC50b0xvd2VyQ2FzZSgpID09PSBcInByb2plY3RzXCIgfHxcclxuXHRcdFx0XHRcdFx0XHRwYXJ0LnRvTG93ZXJDYXNlKCkgPT09IFwicHJvamVjdFwiXHJcblx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0cHJvamVjdFJvb3RJbmRleCA+PSAwICYmXHJcblx0XHRcdFx0XHRcdHByb2plY3RSb290SW5kZXggPCBwYXRoUGFydHMubGVuZ3RoIC0gMlxyXG5cdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdC8vIEJ1aWxkIHByb2plY3QgcGF0aCBmcm9tIGZvbGRlcnMgYWZ0ZXIgdGhlIHByb2plY3Qgcm9vdFxyXG5cdFx0XHRcdFx0XHRjb25zdCBwcm9qZWN0UGFydHMgPSBwYXRoUGFydHMuc2xpY2UoXHJcblx0XHRcdFx0XHRcdFx0cHJvamVjdFJvb3RJbmRleCArIDEsXHJcblx0XHRcdFx0XHRcdFx0cGF0aFBhcnRzLmxlbmd0aCAtIDFcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIHByb2plY3RQYXJ0cy5qb2luKFwiL1wiKTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBGYWxsYmFjayB0byBqdXN0IHBhcmVudCBmb2xkZXIgbmFtZSBpZiBubyBwcm9qZWN0IHJvb3QgZm91bmRcclxuXHRcdFx0XHRcdHJldHVybiBwYXRoUGFydHNbcGF0aFBhcnRzLmxlbmd0aCAtIDJdIHx8IFwiXCI7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHJldHVybiBcIlwiO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgXCJtZXRhZGF0YVwiOiB7XHJcblx0XHRcdFx0Y29uc3QgbWV0YWRhdGFLZXkgPSB0aGlzLmRlZmF1bHRQcm9qZWN0TmFtaW5nLm1ldGFkYXRhS2V5O1xyXG5cdFx0XHRcdGlmICghbWV0YWRhdGFLZXkpIHtcclxuXHRcdFx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRjb25zdCBmaWxlTWV0YWRhdGEgPSB0aGlzLmdldEZpbGVNZXRhZGF0YShmaWxlUGF0aCk7XHJcblx0XHRcdFx0aWYgKGZpbGVNZXRhZGF0YSAmJiBmaWxlTWV0YWRhdGFbbWV0YWRhdGFLZXldKSB7XHJcblx0XHRcdFx0XHRjb25zdCB2YWx1ZSA9IGZpbGVNZXRhZGF0YVttZXRhZGF0YUtleV07XHJcblx0XHRcdFx0XHRyZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiXHJcblx0XHRcdFx0XHRcdD8gdmFsdWUudHJpbSgpXHJcblx0XHRcdFx0XHRcdDogU3RyaW5nKHZhbHVlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHRcdH1cclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBjb25maWd1cmF0aW9uIG9wdGlvbnNcclxuXHQgKi9cclxuXHR1cGRhdGVPcHRpb25zKG9wdGlvbnM6IFBhcnRpYWw8UHJvamVjdENvbmZpZ01hbmFnZXJPcHRpb25zPik6IHZvaWQge1xyXG5cdFx0aWYgKG9wdGlvbnMuY29uZmlnRmlsZU5hbWUgIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHR0aGlzLmNvbmZpZ0ZpbGVOYW1lID0gb3B0aW9ucy5jb25maWdGaWxlTmFtZTtcclxuXHRcdH1cclxuXHRcdGlmIChvcHRpb25zLnNlYXJjaFJlY3Vyc2l2ZWx5ICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0dGhpcy5zZWFyY2hSZWN1cnNpdmVseSA9IG9wdGlvbnMuc2VhcmNoUmVjdXJzaXZlbHk7XHJcblx0XHR9XHJcblx0XHRpZiAob3B0aW9ucy5tZXRhZGF0YUtleSAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdHRoaXMubWV0YWRhdGFLZXkgPSBvcHRpb25zLm1ldGFkYXRhS2V5O1xyXG5cdFx0fVxyXG5cdFx0aWYgKG9wdGlvbnMucGF0aE1hcHBpbmdzICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0dGhpcy5wYXRoTWFwcGluZ3MgPSBvcHRpb25zLnBhdGhNYXBwaW5ncztcclxuXHRcdH1cclxuXHRcdGlmIChvcHRpb25zLm1ldGFkYXRhTWFwcGluZ3MgIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHR0aGlzLm1ldGFkYXRhTWFwcGluZ3MgPSBvcHRpb25zLm1ldGFkYXRhTWFwcGluZ3M7XHJcblx0XHR9XHJcblx0XHRpZiAob3B0aW9ucy5kZWZhdWx0UHJvamVjdE5hbWluZyAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdHRoaXMuZGVmYXVsdFByb2plY3ROYW1pbmcgPSBvcHRpb25zLmRlZmF1bHRQcm9qZWN0TmFtaW5nO1xyXG5cdFx0fVxyXG5cdFx0aWYgKG9wdGlvbnMuZW5oYW5jZWRQcm9qZWN0RW5hYmxlZCAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdHRoaXMuc2V0RW5oYW5jZWRQcm9qZWN0RW5hYmxlZChvcHRpb25zLmVuaGFuY2VkUHJvamVjdEVuYWJsZWQpO1xyXG5cdFx0fVxyXG5cdFx0aWYgKG9wdGlvbnMubWV0YWRhdGFDb25maWdFbmFibGVkICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0dGhpcy5tZXRhZGF0YUNvbmZpZ0VuYWJsZWQgPSBvcHRpb25zLm1ldGFkYXRhQ29uZmlnRW5hYmxlZDtcclxuXHRcdH1cclxuXHRcdGlmIChvcHRpb25zLmNvbmZpZ0ZpbGVFbmFibGVkICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0dGhpcy5jb25maWdGaWxlRW5hYmxlZCA9IG9wdGlvbnMuY29uZmlnRmlsZUVuYWJsZWQ7XHJcblx0XHR9XHJcblx0XHRpZiAob3B0aW9ucy5kZXRlY3Rpb25NZXRob2RzICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0dGhpcy5kZXRlY3Rpb25NZXRob2RzID0gb3B0aW9ucy5kZXRlY3Rpb25NZXRob2RzIHx8IFtdO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENsZWFyIGNhY2hlIHdoZW4gb3B0aW9ucyBjaGFuZ2VcclxuXHRcdHRoaXMuY2xlYXJDYWNoZSgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHdvcmtlciBjb25maWd1cmF0aW9uIGZvciBwcm9qZWN0IGRhdGEgY29tcHV0YXRpb25cclxuXHQgKi9cclxuXHRnZXRXb3JrZXJDb25maWcoKToge1xyXG5cdFx0cGF0aE1hcHBpbmdzOiBBcnJheTx7XHJcblx0XHRcdHBhdGhQYXR0ZXJuOiBzdHJpbmc7XHJcblx0XHRcdHByb2plY3ROYW1lOiBzdHJpbmc7XHJcblx0XHRcdGVuYWJsZWQ6IGJvb2xlYW47XHJcblx0XHR9PjtcclxuXHRcdG1ldGFkYXRhTWFwcGluZ3M6IE1ldGFkYXRhTWFwcGluZ1tdO1xyXG5cdFx0ZGVmYXVsdFByb2plY3ROYW1pbmc6IFByb2plY3ROYW1pbmdTdHJhdGVneTtcclxuXHRcdG1ldGFkYXRhS2V5OiBzdHJpbmc7XHJcblx0fSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRwYXRoTWFwcGluZ3M6IHRoaXMucGF0aE1hcHBpbmdzLFxyXG5cdFx0XHRtZXRhZGF0YU1hcHBpbmdzOiB0aGlzLm1ldGFkYXRhTWFwcGluZ3MsXHJcblx0XHRcdGRlZmF1bHRQcm9qZWN0TmFtaW5nOiB0aGlzLmRlZmF1bHRQcm9qZWN0TmFtaW5nLFxyXG5cdFx0XHRtZXRhZGF0YUtleTogdGhpcy5tZXRhZGF0YUtleSxcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFeHBvc2UgZGV0ZWN0aW9uIG1ldGhvZHMgKHVzZWQgdG8gZGVjaWRlIGlmIHdvcmtlciBjYW4gYmUgdXNlZClcclxuXHQgKi9cclxuXHRnZXREZXRlY3Rpb25NZXRob2RzKCk6IFByb2plY3REZXRlY3Rpb25NZXRob2RbXSB7XHJcblx0XHRyZXR1cm4gdGhpcy5kZXRlY3Rpb25NZXRob2RzIHx8IFtdO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHByb2plY3QgY29uZmlnIGRhdGEgZm9yIGEgZmlsZSAoYWxpYXMgZm9yIGdldFByb2plY3RDb25maWcgZm9yIGNvbXBhdGliaWxpdHkpXHJcblx0ICovXHJcblx0YXN5bmMgZ2V0UHJvamVjdENvbmZpZ0RhdGEoXHJcblx0XHRmaWxlUGF0aDogc3RyaW5nXHJcblx0KTogUHJvbWlzZTxQcm9qZWN0Q29uZmlnRGF0YSB8IG51bGw+IHtcclxuXHRcdHJldHVybiBhd2FpdCB0aGlzLmdldFByb2plY3RDb25maWcoZmlsZVBhdGgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGNhY2hlIHBlcmZvcm1hbmNlIHN0YXRpc3RpY3MgYW5kIG1vbml0b3JpbmcgaW5mb3JtYXRpb25cclxuXHQgKi9cclxuXHRnZXRDYWNoZVN0YXRzKCk6IHtcclxuXHRcdGNvbmZpZ0NhY2hlOiB7XHJcblx0XHRcdHNpemU6IG51bWJlcjtcclxuXHRcdFx0a2V5czogc3RyaW5nW107XHJcblx0XHR9O1xyXG5cdFx0ZmlsZU1ldGFkYXRhQ2FjaGU6IHtcclxuXHRcdFx0c2l6ZTogbnVtYmVyO1xyXG5cdFx0XHRoaXRSYXRpbz86IG51bWJlcjtcclxuXHRcdH07XHJcblx0XHRlbmhhbmNlZE1ldGFkYXRhQ2FjaGU6IHtcclxuXHRcdFx0c2l6ZTogbnVtYmVyO1xyXG5cdFx0XHRoaXRSYXRpbz86IG51bWJlcjtcclxuXHRcdH07XHJcblx0XHR0b3RhbE1lbW9yeVVzYWdlOiB7XHJcblx0XHRcdGVzdGltYXRlZEJ5dGVzOiBudW1iZXI7XHJcblx0XHR9O1xyXG5cdH0ge1xyXG5cdFx0Ly8gQ2FsY3VsYXRlIGVzdGltYXRlZCBtZW1vcnkgdXNhZ2UgKHJvdWdoIGFwcHJveGltYXRpb24pXHJcblx0XHRjb25zdCBjb25maWdDYWNoZVNpemUgPSBBcnJheS5mcm9tKHRoaXMuY29uZmlnQ2FjaGUudmFsdWVzKCkpXHJcblx0XHRcdC5tYXAoKGNvbmZpZykgPT4gSlNPTi5zdHJpbmdpZnkoY29uZmlnKS5sZW5ndGgpXHJcblx0XHRcdC5yZWR1Y2UoKHN1bSwgc2l6ZSkgPT4gc3VtICsgc2l6ZSwgMCk7XHJcblxyXG5cdFx0Y29uc3QgZmlsZU1ldGFkYXRhQ2FjaGVTaXplID0gQXJyYXkuZnJvbShcclxuXHRcdFx0dGhpcy5maWxlTWV0YWRhdGFDYWNoZS52YWx1ZXMoKVxyXG5cdFx0KVxyXG5cdFx0XHQubWFwKChtZXRhZGF0YSkgPT4gSlNPTi5zdHJpbmdpZnkobWV0YWRhdGEpLmxlbmd0aClcclxuXHRcdFx0LnJlZHVjZSgoc3VtLCBzaXplKSA9PiBzdW0gKyBzaXplLCAwKTtcclxuXHJcblx0XHRjb25zdCBlbmhhbmNlZE1ldGFkYXRhQ2FjaGVTaXplID0gQXJyYXkuZnJvbShcclxuXHRcdFx0dGhpcy5lbmhhbmNlZE1ldGFkYXRhQ2FjaGUudmFsdWVzKClcclxuXHRcdClcclxuXHRcdFx0Lm1hcCgobWV0YWRhdGEpID0+IEpTT04uc3RyaW5naWZ5KG1ldGFkYXRhKS5sZW5ndGgpXHJcblx0XHRcdC5yZWR1Y2UoKHN1bSwgc2l6ZSkgPT4gc3VtICsgc2l6ZSwgMCk7XHJcblxyXG5cdFx0Y29uc3QgdG90YWxNZW1vcnlVc2FnZSA9XHJcblx0XHRcdGNvbmZpZ0NhY2hlU2l6ZSArIGZpbGVNZXRhZGF0YUNhY2hlU2l6ZSArIGVuaGFuY2VkTWV0YWRhdGFDYWNoZVNpemU7XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0Y29uZmlnQ2FjaGU6IHtcclxuXHRcdFx0XHRzaXplOiB0aGlzLmNvbmZpZ0NhY2hlLnNpemUsXHJcblx0XHRcdFx0a2V5czogQXJyYXkuZnJvbSh0aGlzLmNvbmZpZ0NhY2hlLmtleXMoKSksXHJcblx0XHRcdH0sXHJcblx0XHRcdGZpbGVNZXRhZGF0YUNhY2hlOiB7XHJcblx0XHRcdFx0c2l6ZTogdGhpcy5maWxlTWV0YWRhdGFDYWNoZS5zaXplLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHRlbmhhbmNlZE1ldGFkYXRhQ2FjaGU6IHtcclxuXHRcdFx0XHRzaXplOiB0aGlzLmVuaGFuY2VkTWV0YWRhdGFDYWNoZS5zaXplLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR0b3RhbE1lbW9yeVVzYWdlOiB7XHJcblx0XHRcdFx0ZXN0aW1hdGVkQnl0ZXM6IHRvdGFsTWVtb3J5VXNhZ2UsXHJcblx0XHRcdH0sXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2xlYXIgc3RhbGUgY2FjaGUgZW50cmllcyBiYXNlZCBvbiBmaWxlIG1vZGlmaWNhdGlvbiB0aW1lc1xyXG5cdCAqL1xyXG5cdGFzeW5jIGNsZWFyU3RhbGVFbnRyaWVzKCk6IFByb21pc2U8bnVtYmVyPiB7XHJcblx0XHRsZXQgY2xlYXJlZENvdW50ID0gMDtcclxuXHJcblx0XHQvLyBDaGVjayBmaWxlIG1ldGFkYXRhIGNhY2hlIGZvciBzdGFsZSBlbnRyaWVzXHJcblx0XHRmb3IgKGNvbnN0IFtcclxuXHRcdFx0ZmlsZVBhdGgsXHJcblx0XHRcdHRpbWVzdGFtcCxcclxuXHRcdF0gb2YgdGhpcy5maWxlTWV0YWRhdGFUaW1lc3RhbXBDYWNoZS5lbnRyaWVzKCkpIHtcclxuXHRcdFx0Y29uc3QgZmlsZSA9IHRoaXMudmF1bHQuZ2V0RmlsZUJ5UGF0aChmaWxlUGF0aCk7XHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHQhZmlsZSB8fFxyXG5cdFx0XHRcdCEoXCJzdGF0XCIgaW4gZmlsZSkgfHxcclxuXHRcdFx0XHQoZmlsZSBhcyBURmlsZSkuc3RhdC5tdGltZSAhPT0gdGltZXN0YW1wXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHRoaXMuZmlsZU1ldGFkYXRhQ2FjaGUuZGVsZXRlKGZpbGVQYXRoKTtcclxuXHRcdFx0XHR0aGlzLmZpbGVNZXRhZGF0YVRpbWVzdGFtcENhY2hlLmRlbGV0ZShmaWxlUGF0aCk7XHJcblx0XHRcdFx0dGhpcy5lbmhhbmNlZE1ldGFkYXRhQ2FjaGUuZGVsZXRlKGZpbGVQYXRoKTtcclxuXHRcdFx0XHR0aGlzLmVuaGFuY2VkTWV0YWRhdGFUaW1lc3RhbXBDYWNoZS5kZWxldGUoZmlsZVBhdGgpO1xyXG5cdFx0XHRcdGNsZWFyZWRDb3VudCsrO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGNsZWFyZWRDb3VudDtcclxuXHR9XHJcbn1cclxuIl19