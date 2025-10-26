/**
 * FileSourceConfig - Configuration management for FileSource
 *
 * Handles configuration validation, defaults, and update management
 * for the FileSource feature.
 */
/** Default configuration for metadata-based recognition */
export const DEFAULT_METADATA_CONFIG = {
    enabled: true,
    taskFields: ["dueDate", "status", "priority", "assigned"],
    requireAllFields: false
};
/** Default configuration for tag-based recognition */
export const DEFAULT_TAG_CONFIG = {
    enabled: true,
    taskTags: ["#task", "#actionable", "#todo"],
    matchMode: "exact"
};
/** Default configuration for template-based recognition */
export const DEFAULT_TEMPLATE_CONFIG = {
    enabled: false,
    templatePaths: ["Templates/Task Template.md"],
    checkTemplateMetadata: true
};
/** Default configuration for path-based recognition */
export const DEFAULT_PATH_CONFIG = {
    enabled: false,
    taskPaths: ["Projects/", "Tasks/"],
    matchMode: "prefix"
};
/** Default configuration for file task properties */
export const DEFAULT_FILE_TASK_PROPERTIES = {
    contentSource: "filename",
    stripExtension: true,
    defaultStatus: " ",
    defaultPriority: undefined,
    preferFrontmatterTitle: true
};
/** Default configuration for relationships */
export const DEFAULT_RELATIONSHIPS_CONFIG = {
    enableChildRelationships: true,
    enableMetadataInheritance: true,
    inheritanceFields: ["project", "priority", "context"]
};
/** Default configuration for performance */
export const DEFAULT_PERFORMANCE_CONFIG = {
    enableWorkerProcessing: true,
    enableCaching: true,
    cacheTTL: 300000 // 5 minutes
};
/** Default status mapping configuration */
export const DEFAULT_STATUS_MAPPING_CONFIG = {
    enabled: true,
    metadataToSymbol: {
        // Completed variants
        'completed': 'x',
        'done': 'x',
        'finished': 'x',
        'complete': 'x',
        'checked': 'x',
        'resolved': 'x',
        'closed': 'x',
        'x': 'x',
        'X': 'x',
        // In Progress variants
        'in-progress': '/',
        'in progress': '/',
        'inprogress': '/',
        'doing': '/',
        'working': '/',
        'active': '/',
        'started': '/',
        'ongoing': '/',
        '/': '/',
        '>': '/',
        // Planned variants
        'planned': '?',
        'todo': '?',
        'pending': '?',
        'scheduled': '?',
        'queued': '?',
        'waiting': '?',
        'later': '?',
        '?': '?',
        // Abandoned variants
        'cancelled': '-',
        'canceled': '-',
        'abandoned': '-',
        'dropped': '-',
        'skipped': '-',
        'deferred': '-',
        'wontfix': '-',
        "won't fix": '-',
        '-': '-',
        // Not Started variants
        'not-started': ' ',
        'not started': ' ',
        'notstarted': ' ',
        'new': ' ',
        'open': ' ',
        'created': ' ',
        'unstarted': ' ',
        ' ': ' '
    },
    symbolToMetadata: {
        'x': 'completed',
        'X': 'completed',
        '/': 'in-progress',
        '>': 'in-progress',
        '?': 'planned',
        '-': 'cancelled',
        ' ': 'not-started'
    },
    autoDetect: true,
    caseSensitive: false
};
/** Complete default FileSource configuration */
export const DEFAULT_FILE_SOURCE_CONFIG = {
    enabled: false,
    recognitionStrategies: {
        metadata: DEFAULT_METADATA_CONFIG,
        tags: DEFAULT_TAG_CONFIG,
        templates: DEFAULT_TEMPLATE_CONFIG,
        paths: DEFAULT_PATH_CONFIG
    },
    fileTaskProperties: DEFAULT_FILE_TASK_PROPERTIES,
    relationships: DEFAULT_RELATIONSHIPS_CONFIG,
    performance: DEFAULT_PERFORMANCE_CONFIG,
    statusMapping: DEFAULT_STATUS_MAPPING_CONFIG
};
/**
 * FileSourceConfig - Manages FileSource configuration
 */
export class FileSourceConfig {
    constructor(initialConfig) {
        this.listeners = [];
        this.config = this.mergeWithDefaults(initialConfig || {});
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return Object.assign({}, this.config);
    }
    /**
     * Update configuration with partial updates
     */
    updateConfig(updates) {
        const newConfig = this.mergeWithDefaults(updates);
        const hasChanged = JSON.stringify(newConfig) !== JSON.stringify(this.config);
        if (hasChanged) {
            this.config = newConfig;
            this.notifyListeners();
        }
    }
    /**
     * Subscribe to configuration changes
     */
    onChange(listener) {
        this.listeners.push(listener);
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }
    /**
     * Check if FileSource is enabled
     */
    isEnabled() {
        return this.config.enabled;
    }
    /**
     * Get recognition strategies that are enabled
     */
    getEnabledStrategies() {
        const strategies = [];
        const { recognitionStrategies } = this.config;
        if (recognitionStrategies.metadata.enabled)
            strategies.push("metadata");
        if (recognitionStrategies.tags.enabled)
            strategies.push("tags");
        if (recognitionStrategies.templates.enabled)
            strategies.push("templates");
        if (recognitionStrategies.paths.enabled)
            strategies.push("paths");
        return strategies;
    }
    /**
     * Validate configuration and return any errors
     */
    validateConfig(config) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const errors = [];
        // Validate recognition strategies
        if (config.recognitionStrategies) {
            const strategies = config.recognitionStrategies;
            // Check if at least one strategy is enabled when FileSource is enabled
            if (config.enabled !== false) {
                const hasEnabledStrategy = Object.values(strategies).some(strategy => strategy && strategy.enabled);
                if (!hasEnabledStrategy) {
                    errors.push("At least one recognition strategy must be enabled");
                }
            }
            // Validate metadata strategy
            if (((_b = (_a = strategies.metadata) === null || _a === void 0 ? void 0 : _a.taskFields) === null || _b === void 0 ? void 0 : _b.length) === 0) {
                errors.push("Metadata strategy requires at least one task field");
            }
            // Validate tag strategy
            if (((_d = (_c = strategies.tags) === null || _c === void 0 ? void 0 : _c.taskTags) === null || _d === void 0 ? void 0 : _d.length) === 0) {
                errors.push("Tag strategy requires at least one task tag");
            }
            // Validate template strategy
            if (((_f = (_e = strategies.templates) === null || _e === void 0 ? void 0 : _e.templatePaths) === null || _f === void 0 ? void 0 : _f.length) === 0) {
                errors.push("Template strategy requires at least one template path");
            }
            // Validate path strategy
            if (((_h = (_g = strategies.paths) === null || _g === void 0 ? void 0 : _g.taskPaths) === null || _h === void 0 ? void 0 : _h.length) === 0) {
                errors.push("Path strategy requires at least one task path");
            }
        }
        // Validate file task properties
        if (config.fileTaskProperties) {
            const props = config.fileTaskProperties;
            if (props.contentSource === "custom" && !props.customContentField) {
                errors.push("Custom content source requires customContentField to be specified");
            }
        }
        // Validate performance config
        if (config.performance) {
            const perf = config.performance;
            if (perf.cacheTTL && perf.cacheTTL < 0) {
                errors.push("Cache TTL must be a positive number");
            }
        }
        // Validate status mapping config
        if ((_j = config.statusMapping) === null || _j === void 0 ? void 0 : _j.enabled) {
            const mapping = config.statusMapping;
            if (Object.keys(mapping.metadataToSymbol || {}).length === 0) {
                errors.push("Status mapping requires at least one metadata to symbol mapping");
            }
            if (Object.keys(mapping.symbolToMetadata || {}).length === 0) {
                errors.push("Status mapping requires at least one symbol to metadata mapping");
            }
        }
        return errors;
    }
    /**
     * Merge partial configuration with defaults
     */
    mergeWithDefaults(partial) {
        var _a, _b, _c, _d, _e;
        return {
            enabled: (_a = partial.enabled) !== null && _a !== void 0 ? _a : DEFAULT_FILE_SOURCE_CONFIG.enabled,
            recognitionStrategies: {
                metadata: Object.assign(Object.assign({}, DEFAULT_METADATA_CONFIG), (_b = partial.recognitionStrategies) === null || _b === void 0 ? void 0 : _b.metadata),
                tags: Object.assign(Object.assign({}, DEFAULT_TAG_CONFIG), (_c = partial.recognitionStrategies) === null || _c === void 0 ? void 0 : _c.tags),
                templates: Object.assign(Object.assign({}, DEFAULT_TEMPLATE_CONFIG), (_d = partial.recognitionStrategies) === null || _d === void 0 ? void 0 : _d.templates),
                paths: Object.assign(Object.assign({}, DEFAULT_PATH_CONFIG), (_e = partial.recognitionStrategies) === null || _e === void 0 ? void 0 : _e.paths)
            },
            fileTaskProperties: Object.assign(Object.assign({}, DEFAULT_FILE_TASK_PROPERTIES), partial.fileTaskProperties),
            relationships: Object.assign(Object.assign({}, DEFAULT_RELATIONSHIPS_CONFIG), partial.relationships),
            performance: Object.assign(Object.assign({}, DEFAULT_PERFORMANCE_CONFIG), partial.performance),
            statusMapping: Object.assign(Object.assign({}, DEFAULT_STATUS_MAPPING_CONFIG), partial.statusMapping)
        };
    }
    /**
     * Notify all listeners of configuration changes
     */
    notifyListeners() {
        this.listeners.forEach(listener => {
            try {
                listener(this.config);
            }
            catch (error) {
                console.error('FileSourceConfig: Error in change listener:', error);
            }
        });
    }
    /**
     * Map a metadata status value to a task symbol
     * @param metadataValue The metadata value (e.g., "completed", "in-progress")
     * @returns The corresponding task symbol (e.g., "x", "/") or the original value if no mapping exists
     */
    mapMetadataToSymbol(metadataValue) {
        const { statusMapping } = this.config;
        if (!statusMapping.enabled) {
            return metadataValue;
        }
        // Handle case sensitivity
        const lookupValue = statusMapping.caseSensitive
            ? metadataValue
            : metadataValue.toLowerCase();
        // Find matching key in the mapping (case-insensitive search if needed)
        for (const [key, symbol] of Object.entries(statusMapping.metadataToSymbol)) {
            const compareKey = statusMapping.caseSensitive ? key : key.toLowerCase();
            if (compareKey === lookupValue) {
                return symbol;
            }
        }
        // Return original value if no mapping found
        return metadataValue;
    }
    /**
     * Map a task symbol to a metadata status value
     * @param symbol The task symbol (e.g., "x", "/")
     * @returns The corresponding metadata value (e.g., "completed", "in-progress") or the original symbol if no mapping exists
     */
    mapSymbolToMetadata(symbol) {
        const { statusMapping } = this.config;
        if (!statusMapping.enabled) {
            return symbol;
        }
        // Direct lookup for symbols (usually case-sensitive)
        return statusMapping.symbolToMetadata[symbol] || symbol;
    }
    /**
     * Check if a value is a recognized status (either metadata value or symbol)
     * @param value The value to check
     * @returns True if the value is recognized as a status
     */
    isRecognizedStatus(value) {
        const { statusMapping } = this.config;
        if (!statusMapping.enabled) {
            return false;
        }
        const lookupValue = statusMapping.caseSensitive
            ? value
            : value.toLowerCase();
        // Check if it's a known metadata value
        for (const key of Object.keys(statusMapping.metadataToSymbol)) {
            const compareKey = statusMapping.caseSensitive ? key : key.toLowerCase();
            if (compareKey === lookupValue) {
                return true;
            }
        }
        // Check if it's a known symbol
        return value in statusMapping.symbolToMetadata;
    }
    /**
     * Sync status mappings with current task status configuration
     * @param taskStatuses The current task status configuration from settings
     */
    syncWithTaskStatuses(taskStatuses) {
        if (!this.config.statusMapping.autoDetect) {
            return;
        }
        // Extract symbols from task status configuration
        const symbolToType = {};
        const typeToSymbols = {};
        for (const [type, symbols] of Object.entries(taskStatuses)) {
            const symbolList = symbols.split('|').filter(s => s);
            typeToSymbols[type] = typeToSymbols[type] || [];
            for (const symbol of symbolList) {
                // Handle potential pattern like '/>' being split into '/' and '>'
                if (symbol.length === 1 || symbol === '/>') {
                    if (symbol === '/>') {
                        symbolToType['/'] = type;
                        symbolToType['>'] = type;
                        typeToSymbols[type].push('/');
                        typeToSymbols[type].push('>');
                    }
                    else {
                        symbolToType[symbol] = type;
                        typeToSymbols[type].push(symbol);
                    }
                }
                else {
                    // For multi-character symbols, add each character separately
                    for (const char of symbol) {
                        symbolToType[char] = type;
                        typeToSymbols[type].push(char);
                    }
                }
            }
        }
        // Update symbol to metadata mappings based on type
        const typeToMetadata = {
            'completed': 'completed',
            'inProgress': 'in-progress',
            'planned': 'planned',
            'abandoned': 'cancelled',
            'notStarted': 'not-started'
        };
        for (const [symbol, type] of Object.entries(symbolToType)) {
            if (typeToMetadata[type]) {
                this.config.statusMapping.symbolToMetadata[symbol] = typeToMetadata[type];
            }
        }
        // Also update metadata->symbol so metadata strings map back to the user's preferred symbol
        const preferredFallback = {
            completed: 'x',
            inProgress: '/',
            planned: '?',
            abandoned: '-',
            notStarted: ' '
        };
        for (const [type, mdValue] of Object.entries(typeToMetadata)) {
            const symbols = typeToSymbols[type] || [];
            const preferred = symbols[0] || preferredFallback[type];
            if (mdValue && preferred !== undefined) {
                this.config.statusMapping.metadataToSymbol[mdValue] = preferred;
            }
        }
        this.notifyListeners();
    }
    /**
     * Create a configuration preset for common use cases
     */
    static createPreset(presetName) {
        switch (presetName) {
            case 'basic':
                return {
                    enabled: true,
                    recognitionStrategies: {
                        metadata: Object.assign(Object.assign({}, DEFAULT_METADATA_CONFIG), { enabled: true }),
                        tags: Object.assign(Object.assign({}, DEFAULT_TAG_CONFIG), { enabled: false }),
                        templates: Object.assign(Object.assign({}, DEFAULT_TEMPLATE_CONFIG), { enabled: false }),
                        paths: Object.assign(Object.assign({}, DEFAULT_PATH_CONFIG), { enabled: false })
                    }
                };
            case 'metadata-only':
                return {
                    enabled: true,
                    recognitionStrategies: {
                        metadata: Object.assign(Object.assign({}, DEFAULT_METADATA_CONFIG), { enabled: true }),
                        tags: Object.assign(Object.assign({}, DEFAULT_TAG_CONFIG), { enabled: false }),
                        templates: Object.assign(Object.assign({}, DEFAULT_TEMPLATE_CONFIG), { enabled: false }),
                        paths: Object.assign(Object.assign({}, DEFAULT_PATH_CONFIG), { enabled: false })
                    }
                };
            case 'tag-only':
                return {
                    enabled: true,
                    recognitionStrategies: {
                        metadata: Object.assign(Object.assign({}, DEFAULT_METADATA_CONFIG), { enabled: false }),
                        tags: Object.assign(Object.assign({}, DEFAULT_TAG_CONFIG), { enabled: true }),
                        templates: Object.assign(Object.assign({}, DEFAULT_TEMPLATE_CONFIG), { enabled: false }),
                        paths: Object.assign(Object.assign({}, DEFAULT_PATH_CONFIG), { enabled: false })
                    }
                };
            case 'full':
                return {
                    enabled: true,
                    recognitionStrategies: {
                        metadata: Object.assign(Object.assign({}, DEFAULT_METADATA_CONFIG), { enabled: true }),
                        tags: Object.assign(Object.assign({}, DEFAULT_TAG_CONFIG), { enabled: true }),
                        templates: Object.assign(Object.assign({}, DEFAULT_TEMPLATE_CONFIG), { enabled: false }),
                        paths: Object.assign(Object.assign({}, DEFAULT_PATH_CONFIG), { enabled: false })
                    }
                };
            default:
                return {};
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmlsZVNvdXJjZUNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkZpbGVTb3VyY2VDb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7O0dBS0c7QUFjSCwyREFBMkQ7QUFDM0QsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQThCO0lBQ2hFLE9BQU8sRUFBRSxJQUFJO0lBQ2IsVUFBVSxFQUFFLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsVUFBVSxDQUFDO0lBQ3pELGdCQUFnQixFQUFFLEtBQUs7Q0FDeEIsQ0FBQztBQUVGLHNEQUFzRDtBQUN0RCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBeUI7SUFDdEQsT0FBTyxFQUFFLElBQUk7SUFDYixRQUFRLEVBQUUsQ0FBQyxPQUFPLEVBQUUsYUFBYSxFQUFFLE9BQU8sQ0FBQztJQUMzQyxTQUFTLEVBQUUsT0FBTztDQUNuQixDQUFDO0FBRUYsMkRBQTJEO0FBQzNELE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUE4QjtJQUNoRSxPQUFPLEVBQUUsS0FBSztJQUNkLGFBQWEsRUFBRSxDQUFDLDRCQUE0QixDQUFDO0lBQzdDLHFCQUFxQixFQUFFLElBQUk7Q0FDNUIsQ0FBQztBQUVGLHVEQUF1RDtBQUN2RCxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBMEI7SUFDeEQsT0FBTyxFQUFFLEtBQUs7SUFDZCxTQUFTLEVBQUUsQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDO0lBQ2xDLFNBQVMsRUFBRSxRQUFRO0NBQ3BCLENBQUM7QUFFRixxREFBcUQ7QUFDckQsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQTZCO0lBQ3BFLGFBQWEsRUFBRSxVQUFVO0lBQ3pCLGNBQWMsRUFBRSxJQUFJO0lBQ3BCLGFBQWEsRUFBRSxHQUFHO0lBQ2xCLGVBQWUsRUFBRSxTQUFTO0lBQzFCLHNCQUFzQixFQUFFLElBQUk7Q0FDN0IsQ0FBQztBQUVGLDhDQUE4QztBQUM5QyxNQUFNLENB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LGtDQUFPLGtCQUFrQixLQUFFLE9BQU8sRUFBRSxJQUFJLEdBQUU7d0JBQzlDLFNBQVMsa0NBQU8sdUJBQXVCLEtBQUUsT0FBTyxFQUFFLEtBQUssR0FBRTt3QkFDekQsS0FBSyxrQ0FBTyxtQkFBbUIsS0FBRSxPQUFPLEVBQUUsS0FBSyxHQUFFO3FCQUNsRDtpQkFDRixDQUFDO1lBRUosS0FBSyxNQUFNO2dCQUNULE9BQU87b0JBQ0wsT0FBTyxFQUFFLElBQUk7b0JBQ2IscUJBQXFCLEVBQUU7d0JBQ3JCLFFBQVEsa0NBQU8sdUJBQXVCLEtBQUUsT0FBTyxFQUFFLElBQUksR0FBRTt3QkFDdkQsSUFBSSxrQ0FBTyxrQkFBa0IsS0FBRSxPQUFPLEVBQUUsSUFBSSxHQUFFO3dCQUM5QyxTQUFTLGtDQUFPLHVCQUF1QixLQUFFLE9BQU8sRUFBRSxLQUFLLEdBQUU7d0JBQ3pELEtBQUssa0NBQU8sbUJBQW1CLEtBQUUsT0FBTyxFQUFFLEtBQUssR0FBRTtxQkFDbEQ7aUJBQ0YsQ0FBQztZQUVKO2dCQUNFLE9BQU8sRUFBRSxDQUFDO1NBQ2I7SUFDSCxDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogRmlsZVNvdXJjZUNvbmZpZyAtIENvbmZpZ3VyYXRpb24gbWFuYWdlbWVudCBmb3IgRmlsZVNvdXJjZVxyXG4gKiBcclxuICogSGFuZGxlcyBjb25maWd1cmF0aW9uIHZhbGlkYXRpb24sIGRlZmF1bHRzLCBhbmQgdXBkYXRlIG1hbmFnZW1lbnRcclxuICogZm9yIHRoZSBGaWxlU291cmNlIGZlYXR1cmUuXHJcbiAqL1xyXG5cclxuaW1wb3J0IHR5cGUgeyBcclxuICBGaWxlU291cmNlQ29uZmlndXJhdGlvbixcclxuICBNZXRhZGF0YVJlY29nbml0aW9uQ29uZmlnLFxyXG4gIFRhZ1JlY29nbml0aW9uQ29uZmlnLFxyXG4gIFRlbXBsYXRlUmVjb2duaXRpb25Db25maWcsXHJcbiAgUGF0aFJlY29nbml0aW9uQ29uZmlnLFxyXG4gIEZpbGVUYXNrUHJvcGVydGllc0NvbmZpZyxcclxuICBSZWxhdGlvbnNoaXBzQ29uZmlnLFxyXG4gIFBlcmZvcm1hbmNlQ29uZmlnLFxyXG4gIFN0YXR1c01hcHBpbmdDb25maWdcclxufSBmcm9tIFwiLi4vLi4vdHlwZXMvZmlsZS1zb3VyY2VcIjtcclxuXHJcbi8qKiBEZWZhdWx0IGNvbmZpZ3VyYXRpb24gZm9yIG1ldGFkYXRhLWJhc2VkIHJlY29nbml0aW9uICovXHJcbmV4cG9ydCBjb25zdCBERUZBVUxUX01FVEFEQVRBX0NPTkZJRzogTWV0YWRhdGFSZWNvZ25pdGlvbkNvbmZpZyA9IHtcclxuICBlbmFibGVkOiB0cnVlLFxyXG4gIHRhc2tGaWVsZHM6IFtcImR1ZURhdGVcIiwgXCJzdGF0dXNcIiwgXCJwcmlvcml0eVwiLCBcImFzc2lnbmVkXCJdLFxyXG4gIHJlcXVpcmVBbGxGaWVsZHM6IGZhbHNlXHJcbn07XHJcblxyXG4vKiogRGVmYXVsdCBjb25maWd1cmF0aW9uIGZvciB0YWctYmFzZWQgcmVjb2duaXRpb24gKi9cclxuZXhwb3J0IGNvbnN0IERFRkFVTFRfVEFHX0NPTkZJRzogVGFnUmVjb2duaXRpb25Db25maWcgPSB7XHJcbiAgZW5hYmxlZDogdHJ1ZSxcclxuICB0YXNrVGFnczogW1wiI3Rhc2tcIiwgXCIjYWN0aW9uYWJsZVwiLCBcIiN0b2RvXCJdLFxyXG4gIG1hdGNoTW9kZTogXCJleGFjdFwiXHJcbn07XHJcblxyXG4vKiogRGVmYXVsdCBjb25maWd1cmF0aW9uIGZvciB0ZW1wbGF0ZS1iYXNlZCByZWNvZ25pdGlvbiAqL1xyXG5leHBvcnQgY29uc3QgREVGQVVMVF9URU1QTEFURV9DT05GSUc6IFRlbXBsYXRlUmVjb2duaXRpb25Db25maWcgPSB7XHJcbiAgZW5hYmxlZDogZmFsc2UsXHJcbiAgdGVtcGxhdGVQYXRoczogW1wiVGVtcGxhdGVzL1Rhc2sgVGVtcGxhdGUubWRcIl0sXHJcbiAgY2hlY2tUZW1wbGF0ZU1ldGFkYXRhOiB0cnVlXHJcbn07XHJcblxyXG4vKiogRGVmYXVsdCBjb25maWd1cmF0aW9uIGZvciBwYXRoLWJhc2VkIHJlY29nbml0aW9uICovXHJcbmV4cG9ydCBjb25zdCBERUZBVUxUX1BBVEhfQ09ORklHOiBQYXRoUmVjb2duaXRpb25Db25maWcgPSB7XHJcbiAgZW5hYmxlZDogZmFsc2UsXHJcbiAgdGFza1BhdGhzOiBbXCJQcm9qZWN0cy9cIiwgXCJUYXNrcy9cIl0sXHJcbiAgbWF0Y2hNb2RlOiBcInByZWZpeFwiXHJcbn07XHJcblxyXG4vKiogRGVmYXVsdCBjb25maWd1cmF0aW9uIGZvciBmaWxlIHRhc2sgcHJvcGVydGllcyAqL1xyXG5leHBvcnQgY29uc3QgREVGQVVMVF9GSUxFX1RBU0tfUFJPUEVSVElFUzogRmlsZVRhc2tQcm9wZXJ0aWVzQ29uZmlnID0ge1xyXG4gIGNvbnRlbnRTb3VyY2U6IFwiZmlsZW5hbWVcIixcclxuICBzdHJpcEV4dGVuc2lvbjogdHJ1ZSxcclxuICBkZWZhdWx0U3RhdHVzOiBcIiBcIixcclxuICBkZWZhdWx0UHJpb3JpdHk6IHVuZGVmaW5lZCxcclxuICBwcmVmZXJGcm9udG1hdHRlclRpdGxlOiB0cnVlXHJcbn07XHJcblxyXG4vKiogRGVmYXVsdCBjb25maWd1cmF0aW9uIGZvciByZWxhdGlvbnNoaXBzICovXHJcbmV4cG9ydCBjb25zdCBERUZBVUxUX1JFTEFUSU9OU0hJUFNfQ09ORklHOiBSZWxhdGlvbnNoaXBzQ29uZmlnID0ge1xyXG4gIGVuYWJsZUNoaWxkUmVsYXRpb25zaGlwczogdHJ1ZSxcclxuICBlbmFibGVNZXRhZGF0YUluaGVyaXRhbmNlOiB0cnVlLFxyXG4gIGluaGVyaXRhbmNlRmllbGRzOiBbXCJwcm9qZWN0XCIsIFwicHJpb3JpdHlcIiwgXCJjb250ZXh0XCJdXHJcbn07XHJcblxyXG4vKiogRGVmYXVsdCBjb25maWd1cmF0aW9uIGZvciBwZXJmb3JtYW5jZSAqL1xyXG5leHBvcnQgY29uc3QgREVGQVVMVF9QRVJGT1JNQU5DRV9DT05GSUc6IFBlcmZvcm1hbmNlQ29uZmlnID0ge1xyXG4gIGVuYWJsZVdvcmtlclByb2Nlc3Npbmc6IHRydWUsXHJcbiAgZW5hYmxlQ2FjaGluZzogdHJ1ZSxcclxuICBjYWNoZVRUTDogMzAwMDAwIC8vIDUgbWludXRlc1xyXG59O1xyXG5cclxuLyoqIERlZmF1bHQgc3RhdHVzIG1hcHBpbmcgY29uZmlndXJhdGlvbiAqL1xyXG5leHBvcnQgY29uc3QgREVGQVVMVF9TVEFUVVNfTUFQUElOR19DT05GSUc6IFN0YXR1c01hcHBpbmdDb25maWcgPSB7XHJcbiAgZW5hYmxlZDogdHJ1ZSxcclxuICBtZXRhZGF0YVRvU3ltYm9sOiB7XHJcbiAgICAvLyBDb21wbGV0ZWQgdmFyaWFudHNcclxuICAgICdjb21wbGV0ZWQnOiAneCcsXHJcbiAgICAnZG9uZSc6ICd4JyxcclxuICAgICdmaW5pc2hlZCc6ICd4JyxcclxuICAgICdjb21wbGV0ZSc6ICd4JyxcclxuICAgICdjaGVja2VkJzogJ3gnLFxyXG4gICAgJ3Jlc29sdmVkJzogJ3gnLFxyXG4gICAgJ2Nsb3NlZCc6ICd4JyxcclxuICAgICd4JzogJ3gnLFxyXG4gICAgJ1gnOiAneCcsXHJcbiAgICBcclxuICAgIC8vIEluIFByb2dyZXNzIHZhcmlhbnRzXHJcbiAgICAnaW4tcHJvZ3Jlc3MnOiAnLycsXHJcbiAgICAnaW4gcHJvZ3Jlc3MnOiAnLycsXHJcbiAgICAnaW5wcm9ncmVzcyc6ICcvJyxcclxuICAgICdkb2luZyc6ICcvJyxcclxuICAgICd3b3JraW5nJzogJy8nLFxyXG4gICAgJ2FjdGl2ZSc6ICcvJyxcclxuICAgICdzdGFydGVkJzogJy8nLFxyXG4gICAgJ29uZ29pbmcnOiAnLycsXHJcbiAgICAnLyc6ICcvJyxcclxuICAgICc+JzogJy8nLFxyXG4gICAgXHJcbiAgICAvLyBQbGFubmVkIHZhcmlhbnRzXHJcbiAgICAncGxhbm5lZCc6ICc/JyxcclxuICAgICd0b2RvJzogJz8nLFxyXG4gICAgJ3BlbmRpbmcnOiAnPycsXHJcbiAgICAnc2NoZWR1bGVkJzogJz8nLFxyXG4gICAgJ3F1ZXVlZCc6ICc/JyxcclxuICAgICd3YWl0aW5nJzogJz8nLFxyXG4gICAgJ2xhdGVyJzogJz8nLFxyXG4gICAgJz8nOiAnPycsXHJcbiAgICBcclxuICAgIC8vIEFiYW5kb25lZCB2YXJpYW50c1xyXG4gICAgJ2NhbmNlbGxlZCc6ICctJyxcclxuICAgICdjYW5jZWxlZCc6ICctJyxcclxuICAgICdhYmFuZG9uZWQnOiAnLScsXHJcbiAgICAnZHJvcHBlZCc6ICctJyxcclxuICAgICdza2lwcGVkJzogJy0nLFxyXG4gICAgJ2RlZmVycmVkJzogJy0nLFxyXG4gICAgJ3dvbnRmaXgnOiAnLScsXHJcbiAgICBcIndvbid0IGZpeFwiOiAnLScsXHJcbiAgICAnLSc6ICctJyxcclxuICAgIFxyXG4gICAgLy8gTm90IFN0YXJ0ZWQgdmFyaWFudHNcclxuICAgICdub3Qtc3RhcnRlZCc6ICcgJyxcclxuICAgICdub3Qgc3RhcnRlZCc6ICcgJyxcclxuICAgICdub3RzdGFydGVkJzogJyAnLFxyXG4gICAgJ25ldyc6ICcgJyxcclxuICAgICdvcGVuJzogJyAnLFxyXG4gICAgJ2NyZWF0ZWQnOiAnICcsXHJcbiAgICAndW5zdGFydGVkJzogJyAnLFxyXG4gICAgJyAnOiAnICdcclxuICB9LFxyXG4gIHN5bWJvbFRvTWV0YWRhdGE6IHtcclxuICAgICd4JzogJ2NvbXBsZXRlZCcsXHJcbiAgICAnWCc6ICdjb21wbGV0ZWQnLFxyXG4gICAgJy8nOiAnaW4tcHJvZ3Jlc3MnLFxyXG4gICAgJz4nOiAnaW4tcHJvZ3Jlc3MnLFxyXG4gICAgJz8nOiAncGxhbm5lZCcsXHJcbiAgICAnLSc6ICdjYW5jZWxsZWQnLFxyXG4gICAgJyAnOiAnbm90LXN0YXJ0ZWQnXHJcbiAgfSxcclxuICBhdXRvRGV0ZWN0OiB0cnVlLFxyXG4gIGNhc2VTZW5zaXRpdmU6IGZhbHNlXHJcbn07XHJcblxyXG4vKiogQ29tcGxldGUgZGVmYXVsdCBGaWxlU291cmNlIGNvbmZpZ3VyYXRpb24gKi9cclxuZXhwb3J0IGNvbnN0IERFRkFVTFRfRklMRV9TT1VSQ0VfQ09ORklHOiBGaWxlU291cmNlQ29uZmlndXJhdGlvbiA9IHtcclxuICBlbmFibGVkOiBmYWxzZSwgLy8gRGlzYWJsZWQgYnkgZGVmYXVsdCBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eVxyXG4gIHJlY29nbml0aW9uU3RyYXRlZ2llczoge1xyXG4gICAgbWV0YWRhdGE6IERFRkFVTFRfTUVUQURBVEFfQ09ORklHLFxyXG4gICAgdGFnczogREVGQVVMVF9UQUdfQ09ORklHLFxyXG4gICAgdGVtcGxhdGVzOiBERUZBVUxUX1RFTVBMQVRFX0NPTkZJRyxcclxuICAgIHBhdGhzOiBERUZBVUxUX1BBVEhfQ09ORklHXHJcbiAgfSxcclxuICBmaWxlVGFza1Byb3BlcnRpZXM6IERFRkFVTFRfRklMRV9UQVNLX1BST1BFUlRJRVMsXHJcbiAgcmVsYXRpb25zaGlwczogREVGQVVMVF9SRUxBVElPTlNISVBTX0NPTkZJRyxcclxuICBwZXJmb3JtYW5jZTogREVGQVVMVF9QRVJGT1JNQU5DRV9DT05GSUcsXHJcbiAgc3RhdHVzTWFwcGluZzogREVGQVVMVF9TVEFUVVNfTUFQUElOR19DT05GSUdcclxufTtcclxuXHJcbi8qKlxyXG4gKiBGaWxlU291cmNlQ29uZmlnIC0gTWFuYWdlcyBGaWxlU291cmNlIGNvbmZpZ3VyYXRpb25cclxuICovXHJcbmV4cG9ydCBjbGFzcyBGaWxlU291cmNlQ29uZmlnIHtcclxuICBwcml2YXRlIGNvbmZpZzogRmlsZVNvdXJjZUNvbmZpZ3VyYXRpb247XHJcbiAgcHJpdmF0ZSBsaXN0ZW5lcnM6IEFycmF5PChjb25maWc6IEZpbGVTb3VyY2VDb25maWd1cmF0aW9uKSA9PiB2b2lkPiA9IFtdO1xyXG5cclxuICBjb25zdHJ1Y3Rvcihpbml0aWFsQ29uZmlnPzogUGFydGlhbDxGaWxlU291cmNlQ29uZmlndXJhdGlvbj4pIHtcclxuICAgIHRoaXMuY29uZmlnID0gdGhpcy5tZXJnZVdpdGhEZWZhdWx0cyhpbml0aWFsQ29uZmlnIHx8IHt9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBjdXJyZW50IGNvbmZpZ3VyYXRpb25cclxuICAgKi9cclxuICBnZXRDb25maWcoKTogRmlsZVNvdXJjZUNvbmZpZ3VyYXRpb24ge1xyXG4gICAgcmV0dXJuIHsgLi4udGhpcy5jb25maWcgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFVwZGF0ZSBjb25maWd1cmF0aW9uIHdpdGggcGFydGlhbCB1cGRhdGVzXHJcbiAgICovXHJcbiAgdXBkYXRlQ29uZmlnKHVwZGF0ZXM6IFBhcnRpYWw8RmlsZVNvdXJjZUNvbmZpZ3VyYXRpb24+KTogdm9pZCB7XHJcbiAgICBjb25zdCBuZXdDb25maWcgPSB0aGlzLm1lcmdlV2l0aERlZmF1bHRzKHVwZGF0ZXMpO1xyXG4gICAgY29uc3QgaGFzQ2hhbmdlZCA9IEpTT04uc3RyaW5naWZ5KG5ld0NvbmZpZykgIT09IEpTT04uc3RyaW5naWZ5KHRoaXMuY29uZmlnKTtcclxuICAgIFxyXG4gICAgaWYgKGhhc0NoYW5nZWQpIHtcclxuICAgICAgdGhpcy5jb25maWcgPSBuZXdDb25maWc7XHJcbiAgICAgIHRoaXMubm90aWZ5TGlzdGVuZXJzKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTdWJzY3JpYmUgdG8gY29uZmlndXJhdGlvbiBjaGFuZ2VzXHJcbiAgICovXHJcbiAgb25DaGFuZ2UobGlzdGVuZXI6IChjb25maWc6IEZpbGVTb3VyY2VDb25maWd1cmF0aW9uKSA9PiB2b2lkKTogKCkgPT4gdm9pZCB7XHJcbiAgICB0aGlzLmxpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcclxuICAgIHJldHVybiAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5saXN0ZW5lcnMuaW5kZXhPZihsaXN0ZW5lcik7XHJcbiAgICAgIGlmIChpbmRleCA+IC0xKSB7XHJcbiAgICAgICAgdGhpcy5saXN0ZW5lcnMuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIGlmIEZpbGVTb3VyY2UgaXMgZW5hYmxlZFxyXG4gICAqL1xyXG4gIGlzRW5hYmxlZCgpOiBib29sZWFuIHtcclxuICAgIHJldHVybiB0aGlzLmNvbmZpZy5lbmFibGVkO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IHJlY29nbml0aW9uIHN0cmF0ZWdpZXMgdGhhdCBhcmUgZW5hYmxlZFxyXG4gICAqL1xyXG4gIGdldEVuYWJsZWRTdHJhdGVnaWVzKCk6IHN0cmluZ1tdIHtcclxuICAgIGNvbnN0IHN0cmF0ZWdpZXM6IHN0cmluZ1tdID0gW107XHJcbiAgICBjb25zdCB7IHJlY29nbml0aW9uU3RyYXRlZ2llcyB9ID0gdGhpcy5jb25maWc7XHJcblxyXG4gICAgaWYgKHJlY29nbml0aW9uU3RyYXRlZ2llcy5tZXRhZGF0YS5lbmFibGVkKSBzdHJhdGVnaWVzLnB1c2goXCJtZXRhZGF0YVwiKTtcclxuICAgIGlmIChyZWNvZ25pdGlvblN0cmF0ZWdpZXMudGFncy5lbmFibGVkKSBzdHJhdGVnaWVzLnB1c2goXCJ0YWdzXCIpO1xyXG4gICAgaWYgKHJlY29nbml0aW9uU3RyYXRlZ2llcy50ZW1wbGF0ZXMuZW5hYmxlZCkgc3RyYXRlZ2llcy5wdXNoKFwidGVtcGxhdGVzXCIpO1xyXG4gICAgaWYgKHJlY29nbml0aW9uU3RyYXRlZ2llcy5wYXRocy5lbmFibGVkKSBzdHJhdGVnaWVzLnB1c2goXCJwYXRoc1wiKTtcclxuXHJcbiAgICByZXR1cm4gc3RyYXRlZ2llcztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFZhbGlkYXRlIGNvbmZpZ3VyYXRpb24gYW5kIHJldHVybiBhbnkgZXJyb3JzXHJcbiAgICovXHJcbiAgdmFsaWRhdGVDb25maWcoY29uZmlnOiBQYXJ0aWFsPEZpbGVTb3VyY2VDb25maWd1cmF0aW9uPik6IHN0cmluZ1tdIHtcclxuICAgIGNvbnN0IGVycm9yczogc3RyaW5nW10gPSBbXTtcclxuXHJcbiAgICAvLyBWYWxpZGF0ZSByZWNvZ25pdGlvbiBzdHJhdGVnaWVzXHJcbiAgICBpZiAoY29uZmlnLnJlY29nbml0aW9uU3RyYXRlZ2llcykge1xyXG4gICAgICBjb25zdCBzdHJhdGVnaWVzID0gY29uZmlnLnJlY29nbml0aW9uU3RyYXRlZ2llcztcclxuICAgICAgXHJcbiAgICAgIC8vIENoZWNrIGlmIGF0IGxlYXN0IG9uZSBzdHJhdGVneSBpcyBlbmFibGVkIHdoZW4gRmlsZVNvdXJjZSBpcyBlbmFibGVkXHJcbiAgICAgIGlmIChjb25maWcuZW5hYmxlZCAhPT0gZmFsc2UpIHtcclxuICAgICAgICBjb25zdCBoYXNFbmFibGVkU3RyYXRlZ3kgPSBPYmplY3QudmFsdWVzKHN0cmF0ZWdpZXMpLnNvbWUoc3RyYXRlZ3kgPT4gXHJcbiAgICAgICAgICBzdHJhdGVneSAmJiBzdHJhdGVneS5lbmFibGVkXHJcbiAgICAgICAgKTtcclxuICAgICAgICBpZiAoIWhhc0VuYWJsZWRTdHJhdGVneSkge1xyXG4gICAgICAgICAgZXJyb3JzLnB1c2goXCJBdCBsZWFzdCBvbmUgcmVjb2duaXRpb24gc3RyYXRlZ3kgbXVzdCBiZSBlbmFibGVkXCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gVmFsaWRhdGUgbWV0YWRhdGEgc3RyYXRlZ3lcclxuICAgICAgaWYgKHN0cmF0ZWdpZXMubWV0YWRhdGE/LnRhc2tGaWVsZHM/Lmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIGVycm9ycy5wdXNoKFwiTWV0YWRhdGEgc3RyYXRlZ3kgcmVxdWlyZXMgYXQgbGVhc3Qgb25lIHRhc2sgZmllbGRcIik7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFZhbGlkYXRlIHRhZyBzdHJhdGVneVxyXG4gICAgICBpZiAoc3RyYXRlZ2llcy50YWdzPy50YXNrVGFncz8ubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgZXJyb3JzLnB1c2goXCJUYWcgc3RyYXRlZ3kgcmVxdWlyZXMgYXQgbGVhc3Qgb25lIHRhc2sgdGFnXCIpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBWYWxpZGF0ZSB0ZW1wbGF0ZSBzdHJhdGVneVxyXG4gICAgICBpZiAoc3RyYXRlZ2llcy50ZW1wbGF0ZXM/LnRlbXBsYXRlUGF0aHM/Lmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIGVycm9ycy5wdXNoKFwiVGVtcGxhdGUgc3RyYXRlZ3kgcmVxdWlyZXMgYXQgbGVhc3Qgb25lIHRlbXBsYXRlIHBhdGhcIik7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFZhbGlkYXRlIHBhdGggc3RyYXRlZ3lcclxuICAgICAgaWYgKHN0cmF0ZWdpZXMucGF0aHM/LnRhc2tQYXRocz8ubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgZXJyb3JzLnB1c2goXCJQYXRoIHN0cmF0ZWd5IHJlcXVpcmVzIGF0IGxlYXN0IG9uZSB0YXNrIHBhdGhcIik7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBWYWxpZGF0ZSBmaWxlIHRhc2sgcHJvcGVydGllc1xyXG4gICAgaWYgKGNvbmZpZy5maWxlVGFza1Byb3BlcnRpZXMpIHtcclxuICAgICAgY29uc3QgcHJvcHMgPSBjb25maWcuZmlsZVRhc2tQcm9wZXJ0aWVzO1xyXG4gICAgICBcclxuICAgICAgaWYgKHByb3BzLmNvbnRlbnRTb3VyY2UgPT09IFwiY3VzdG9tXCIgJiYgIXByb3BzLmN1c3RvbUNvbnRlbnRGaWVsZCkge1xyXG4gICAgICAgIGVycm9ycy5wdXNoKFwiQ3VzdG9tIGNvbnRlbnQgc291cmNlIHJlcXVpcmVzIGN1c3RvbUNvbnRlbnRGaWVsZCB0byBiZSBzcGVjaWZpZWRcIik7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBWYWxpZGF0ZSBwZXJmb3JtYW5jZSBjb25maWdcclxuICAgIGlmIChjb25maWcucGVyZm9ybWFuY2UpIHtcclxuICAgICAgY29uc3QgcGVyZiA9IGNvbmZpZy5wZXJmb3JtYW5jZTtcclxuICAgICAgXHJcbiAgICAgIGlmIChwZXJmLmNhY2hlVFRMICYmIHBlcmYuY2FjaGVUVEwgPCAwKSB7XHJcbiAgICAgICAgZXJyb3JzLnB1c2goXCJDYWNoZSBUVEwgbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlclwiKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIFZhbGlkYXRlIHN0YXR1cyBtYXBwaW5nIGNvbmZpZ1xyXG4gICAgaWYgKGNvbmZpZy5zdGF0dXNNYXBwaW5nPy5lbmFibGVkKSB7XHJcbiAgICAgIGNvbnN0IG1hcHBpbmcgPSBjb25maWcuc3RhdHVzTWFwcGluZztcclxuICAgICAgXHJcbiAgICAgIGlmIChPYmplY3Qua2V5cyhtYXBwaW5nLm1ldGFkYXRhVG9TeW1ib2wgfHwge30pLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIGVycm9ycy5wdXNoKFwiU3RhdHVzIG1hcHBpbmcgcmVxdWlyZXMgYXQgbGVhc3Qgb25lIG1ldGFkYXRhIHRvIHN5bWJvbCBtYXBwaW5nXCIpO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICBpZiAoT2JqZWN0LmtleXMobWFwcGluZy5zeW1ib2xUb01ldGFkYXRhIHx8IHt9KS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICBlcnJvcnMucHVzaChcIlN0YXR1cyBtYXBwaW5nIHJlcXVpcmVzIGF0IGxlYXN0IG9uZSBzeW1ib2wgdG8gbWV0YWRhdGEgbWFwcGluZ1wiKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBlcnJvcnM7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBNZXJnZSBwYXJ0aWFsIGNvbmZpZ3VyYXRpb24gd2l0aCBkZWZhdWx0c1xyXG4gICAqL1xyXG4gIHByaXZhdGUgbWVyZ2VXaXRoRGVmYXVsdHMocGFydGlhbDogUGFydGlhbDxGaWxlU291cmNlQ29uZmlndXJhdGlvbj4pOiBGaWxlU291cmNlQ29uZmlndXJhdGlvbiB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBlbmFibGVkOiBwYXJ0aWFsLmVuYWJsZWQgPz8gREVGQVVMVF9GSUxFX1NPVVJDRV9DT05GSUcuZW5hYmxlZCxcclxuICAgICAgcmVjb2duaXRpb25TdHJhdGVnaWVzOiB7XHJcbiAgICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICAgIC4uLkRFRkFVTFRfTUVUQURBVEFfQ09ORklHLFxyXG4gICAgICAgICAgLi4ucGFydGlhbC5yZWNvZ25pdGlvblN0cmF0ZWdpZXM/Lm1ldGFkYXRhXHJcbiAgICAgICAgfSxcclxuICAgICAgICB0YWdzOiB7XHJcbiAgICAgICAgICAuLi5ERUZBVUxUX1RBR19DT05GSUcsXHJcbiAgICAgICAgICAuLi5wYXJ0aWFsLnJlY29nbml0aW9uU3RyYXRlZ2llcz8udGFnc1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdGVtcGxhdGVzOiB7XHJcbiAgICAgICAgICAuLi5ERUZBVUxUX1RFTVBMQVRFX0NPTkZJRyxcclxuICAgICAgICAgIC4uLnBhcnRpYWwucmVjb2duaXRpb25TdHJhdGVnaWVzPy50ZW1wbGF0ZXNcclxuICAgICAgICB9LFxyXG4gICAgICAgIHBhdGhzOiB7XHJcbiAgICAgICAgICAuLi5ERUZBVUxUX1BBVEhfQ09ORklHLFxyXG4gICAgICAgICAgLi4ucGFydGlhbC5yZWNvZ25pdGlvblN0cmF0ZWdpZXM/LnBhdGhzXHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgICBmaWxlVGFza1Byb3BlcnRpZXM6IHtcclxuICAgICAgICAuLi5ERUZBVUxUX0ZJTEVfVEFTS19QUk9QRVJUSUVTLFxyXG4gICAgICAgIC4uLnBhcnRpYWwuZmlsZVRhc2tQcm9wZXJ0aWVzXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlbGF0aW9uc2hpcHM6IHtcclxuICAgICAgICAuLi5ERUZBVUxUX1JFTEFUSU9OU0hJUFNfQ09ORklHLFxyXG4gICAgICAgIC4uLnBhcnRpYWwucmVsYXRpb25zaGlwc1xyXG4gICAgICB9LFxyXG4gICAgICBwZXJmb3JtYW5jZToge1xyXG4gICAgICAgIC4uLkRFRkFVTFRfUEVSRk9STUFOQ0VfQ09ORklHLFxyXG4gICAgICAgIC4uLnBhcnRpYWwucGVyZm9ybWFuY2VcclxuICAgICAgfSxcclxuICAgICAgc3RhdHVzTWFwcGluZzoge1xyXG4gICAgICAgIC4uLkRFRkFVTFRfU1RBVFVTX01BUFBJTkdfQ09ORklHLFxyXG4gICAgICAgIC4uLnBhcnRpYWwuc3RhdHVzTWFwcGluZ1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTm90aWZ5IGFsbCBsaXN0ZW5lcnMgb2YgY29uZmlndXJhdGlvbiBjaGFuZ2VzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBub3RpZnlMaXN0ZW5lcnMoKTogdm9pZCB7XHJcbiAgICB0aGlzLmxpc3RlbmVycy5mb3JFYWNoKGxpc3RlbmVyID0+IHtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBsaXN0ZW5lcih0aGlzLmNvbmZpZyk7XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignRmlsZVNvdXJjZUNvbmZpZzogRXJyb3IgaW4gY2hhbmdlIGxpc3RlbmVyOicsIGVycm9yKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBNYXAgYSBtZXRhZGF0YSBzdGF0dXMgdmFsdWUgdG8gYSB0YXNrIHN5bWJvbFxyXG4gICAqIEBwYXJhbSBtZXRhZGF0YVZhbHVlIFRoZSBtZXRhZGF0YSB2YWx1ZSAoZS5nLiwgXCJjb21wbGV0ZWRcIiwgXCJpbi1wcm9ncmVzc1wiKVxyXG4gICAqIEByZXR1cm5zIFRoZSBjb3JyZXNwb25kaW5nIHRhc2sgc3ltYm9sIChlLmcuLCBcInhcIiwgXCIvXCIpIG9yIHRoZSBvcmlnaW5hbCB2YWx1ZSBpZiBubyBtYXBwaW5nIGV4aXN0c1xyXG4gICAqL1xyXG4gIG1hcE1ldGFkYXRhVG9TeW1ib2wobWV0YWRhdGFWYWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IHsgc3RhdHVzTWFwcGluZyB9ID0gdGhpcy5jb25maWc7XHJcbiAgICBcclxuICAgIGlmICghc3RhdHVzTWFwcGluZy5lbmFibGVkKSB7XHJcbiAgICAgIHJldHVybiBtZXRhZGF0YVZhbHVlO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyBIYW5kbGUgY2FzZSBzZW5zaXRpdml0eVxyXG4gICAgY29uc3QgbG9va3VwVmFsdWUgPSBzdGF0dXNNYXBwaW5nLmNhc2VTZW5zaXRpdmUgXHJcbiAgICAgID8gbWV0YWRhdGFWYWx1ZSBcclxuICAgICAgOiBtZXRhZGF0YVZhbHVlLnRvTG93ZXJDYXNlKCk7XHJcbiAgICBcclxuICAgIC8vIEZpbmQgbWF0Y2hpbmcga2V5IGluIHRoZSBtYXBwaW5nIChjYXNlLWluc2Vuc2l0aXZlIHNlYXJjaCBpZiBuZWVkZWQpXHJcbiAgICBmb3IgKGNvbnN0IFtrZXksIHN5bWJvbF0gb2YgT2JqZWN0LmVudHJpZXMoc3RhdHVzTWFwcGluZy5tZXRhZGF0YVRvU3ltYm9sKSkge1xyXG4gICAgICBjb25zdCBjb21wYXJlS2V5ID0gc3RhdHVzTWFwcGluZy5jYXNlU2Vuc2l0aXZlID8ga2V5IDoga2V5LnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgIGlmIChjb21wYXJlS2V5ID09PSBsb29rdXBWYWx1ZSkge1xyXG4gICAgICAgIHJldHVybiBzeW1ib2w7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gUmV0dXJuIG9yaWdpbmFsIHZhbHVlIGlmIG5vIG1hcHBpbmcgZm91bmRcclxuICAgIHJldHVybiBtZXRhZGF0YVZhbHVlO1xyXG4gIH1cclxuICBcclxuICAvKipcclxuICAgKiBNYXAgYSB0YXNrIHN5bWJvbCB0byBhIG1ldGFkYXRhIHN0YXR1cyB2YWx1ZVxyXG4gICAqIEBwYXJhbSBzeW1ib2wgVGhlIHRhc2sgc3ltYm9sIChlLmcuLCBcInhcIiwgXCIvXCIpXHJcbiAgICogQHJldHVybnMgVGhlIGNvcnJlc3BvbmRpbmcgbWV0YWRhdGEgdmFsdWUgKGUuZy4sIFwiY29tcGxldGVkXCIsIFwiaW4tcHJvZ3Jlc3NcIikgb3IgdGhlIG9yaWdpbmFsIHN5bWJvbCBpZiBubyBtYXBwaW5nIGV4aXN0c1xyXG4gICAqL1xyXG4gIG1hcFN5bWJvbFRvTWV0YWRhdGEoc3ltYm9sOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgY29uc3QgeyBzdGF0dXNNYXBwaW5nIH0gPSB0aGlzLmNvbmZpZztcclxuICAgIFxyXG4gICAgaWYgKCFzdGF0dXNNYXBwaW5nLmVuYWJsZWQpIHtcclxuICAgICAgcmV0dXJuIHN5bWJvbDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gRGlyZWN0IGxvb2t1cCBmb3Igc3ltYm9scyAodXN1YWxseSBjYXNlLXNlbnNpdGl2ZSlcclxuICAgIHJldHVybiBzdGF0dXNNYXBwaW5nLnN5bWJvbFRvTWV0YWRhdGFbc3ltYm9sXSB8fCBzeW1ib2w7XHJcbiAgfVxyXG4gIFxyXG4gIC8qKlxyXG4gICAqIENoZWNrIGlmIGEgdmFsdWUgaXMgYSByZWNvZ25pemVkIHN0YXR1cyAoZWl0aGVyIG1ldGFkYXRhIHZhbHVlIG9yIHN5bWJvbClcclxuICAgKiBAcGFyYW0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrXHJcbiAgICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgdmFsdWUgaXMgcmVjb2duaXplZCBhcyBhIHN0YXR1c1xyXG4gICAqL1xyXG4gIGlzUmVjb2duaXplZFN0YXR1cyh2YWx1ZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICBjb25zdCB7IHN0YXR1c01hcHBpbmcgfSA9IHRoaXMuY29uZmlnO1xyXG4gICAgXHJcbiAgICBpZiAoIXN0YXR1c01hcHBpbmcuZW5hYmxlZCkge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGNvbnN0IGxvb2t1cFZhbHVlID0gc3RhdHVzTWFwcGluZy5jYXNlU2Vuc2l0aXZlIFxyXG4gICAgICA/IHZhbHVlIFxyXG4gICAgICA6IHZhbHVlLnRvTG93ZXJDYXNlKCk7XHJcbiAgICBcclxuICAgIC8vIENoZWNrIGlmIGl0J3MgYSBrbm93biBtZXRhZGF0YSB2YWx1ZVxyXG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoc3RhdHVzTWFwcGluZy5tZXRhZGF0YVRvU3ltYm9sKSkge1xyXG4gICAgICBjb25zdCBjb21wYXJlS2V5ID0gc3RhdHVzTWFwcGluZy5jYXNlU2Vuc2l0aXZlID8ga2V5IDoga2V5LnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgIGlmIChjb21wYXJlS2V5ID09PSBsb29rdXBWYWx1ZSkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIENoZWNrIGlmIGl0J3MgYSBrbm93biBzeW1ib2xcclxuICAgIHJldHVybiB2YWx1ZSBpbiBzdGF0dXNNYXBwaW5nLnN5bWJvbFRvTWV0YWRhdGE7XHJcbiAgfVxyXG4gIFxyXG4gIC8qKlxyXG4gICAqIFN5bmMgc3RhdHVzIG1hcHBpbmdzIHdpdGggY3VycmVudCB0YXNrIHN0YXR1cyBjb25maWd1cmF0aW9uXHJcbiAgICogQHBhcmFtIHRhc2tTdGF0dXNlcyBUaGUgY3VycmVudCB0YXNrIHN0YXR1cyBjb25maWd1cmF0aW9uIGZyb20gc2V0dGluZ3NcclxuICAgKi9cclxuICBzeW5jV2l0aFRhc2tTdGF0dXNlcyh0YXNrU3RhdHVzZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4pOiB2b2lkIHtcclxuICAgIGlmICghdGhpcy5jb25maWcuc3RhdHVzTWFwcGluZy5hdXRvRGV0ZWN0KSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBFeHRyYWN0IHN5bWJvbHMgZnJvbSB0YXNrIHN0YXR1cyBjb25maWd1cmF0aW9uXHJcbiAgICBjb25zdCBzeW1ib2xUb1R5cGU6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcclxuICAgIGNvbnN0IHR5cGVUb1N5bWJvbHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZ1tdPiA9IHt9O1xyXG5cclxuICAgIGZvciAoY29uc3QgW3R5cGUsIHN5bWJvbHNdIG9mIE9iamVjdC5lbnRyaWVzKHRhc2tTdGF0dXNlcykpIHtcclxuICAgICAgY29uc3Qgc3ltYm9sTGlzdCA9IHN5bWJvbHMuc3BsaXQoJ3wnKS5maWx0ZXIocyA9PiBzKTtcclxuICAgICAgdHlwZVRvU3ltYm9sc1t0eXBlXSA9IHR5cGVUb1N5bWJvbHNbdHlwZV0gfHwgW107XHJcbiAgICAgIGZvciAoY29uc3Qgc3ltYm9sIG9mIHN5bWJvbExpc3QpIHtcclxuICAgICAgICAvLyBIYW5kbGUgcG90ZW50aWFsIHBhdHRlcm4gbGlrZSAnLz4nIGJlaW5nIHNwbGl0IGludG8gJy8nIGFuZCAnPidcclxuICAgICAgICBpZiAoc3ltYm9sLmxlbmd0aCA9PT0gMSB8fCBzeW1ib2wgPT09ICcvPicpIHtcclxuICAgICAgICAgIGlmIChzeW1ib2wgPT09ICcvPicpIHtcclxuICAgICAgICAgICAgc3ltYm9sVG9UeXBlWycvJ10gPSB0eXBlO1xyXG4gICAgICAgICAgICBzeW1ib2xUb1R5cGVbJz4nXSA9IHR5cGU7XHJcbiAgICAgICAgICAgIHR5cGVUb1N5bWJvbHNbdHlwZV0ucHVzaCgnLycpO1xyXG4gICAgICAgICAgICB0eXBlVG9TeW1ib2xzW3R5cGVdLnB1c2goJz4nKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHN5bWJvbFRvVHlwZVtzeW1ib2xdID0gdHlwZTtcclxuICAgICAgICAgICAgdHlwZVRvU3ltYm9sc1t0eXBlXS5wdXNoKHN5bWJvbCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIC8vIEZvciBtdWx0aS1jaGFyYWN0ZXIgc3ltYm9scywgYWRkIGVhY2ggY2hhcmFjdGVyIHNlcGFyYXRlbHlcclxuICAgICAgICAgIGZvciAoY29uc3QgY2hhciBvZiBzeW1ib2wpIHtcclxuICAgICAgICAgICAgc3ltYm9sVG9UeXBlW2NoYXJdID0gdHlwZTtcclxuICAgICAgICAgICAgdHlwZVRvU3ltYm9sc1t0eXBlXS5wdXNoKGNoYXIpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIFVwZGF0ZSBzeW1ib2wgdG8gbWV0YWRhdGEgbWFwcGluZ3MgYmFzZWQgb24gdHlwZVxyXG4gICAgY29uc3QgdHlwZVRvTWV0YWRhdGE6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XHJcbiAgICAgICdjb21wbGV0ZWQnOiAnY29tcGxldGVkJyxcclxuICAgICAgJ2luUHJvZ3Jlc3MnOiAnaW4tcHJvZ3Jlc3MnLFxyXG4gICAgICAncGxhbm5lZCc6ICdwbGFubmVkJyxcclxuICAgICAgJ2FiYW5kb25lZCc6ICdjYW5jZWxsZWQnLFxyXG4gICAgICAnbm90U3RhcnRlZCc6ICdub3Qtc3RhcnRlZCdcclxuICAgIH07XHJcblxyXG4gICAgZm9yIChjb25zdCBbc3ltYm9sLCB0eXBlXSBvZiBPYmplY3QuZW50cmllcyhzeW1ib2xUb1R5cGUpKSB7XHJcbiAgICAgIGlmICh0eXBlVG9NZXRhZGF0YVt0eXBlXSkge1xyXG4gICAgICAgIHRoaXMuY29uZmlnLnN0YXR1c01hcHBpbmcuc3ltYm9sVG9NZXRhZGF0YVtzeW1ib2xdID0gdHlwZVRvTWV0YWRhdGFbdHlwZV07XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBBbHNvIHVwZGF0ZSBtZXRhZGF0YS0+c3ltYm9sIHNvIG1ldGFkYXRhIHN0cmluZ3MgbWFwIGJhY2sgdG8gdGhlIHVzZXIncyBwcmVmZXJyZWQgc3ltYm9sXHJcbiAgICBjb25zdCBwcmVmZXJyZWRGYWxsYmFjazogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcclxuICAgICAgY29tcGxldGVkOiAneCcsXHJcbiAgICAgIGluUHJvZ3Jlc3M6ICcvJyxcclxuICAgICAgcGxhbm5lZDogJz8nLFxyXG4gICAgICBhYmFuZG9uZWQ6ICctJyxcclxuICAgICAgbm90U3RhcnRlZDogJyAnXHJcbiAgICB9O1xyXG4gICAgZm9yIChjb25zdCBbdHlwZSwgbWRWYWx1ZV0gb2YgT2JqZWN0LmVudHJpZXModHlwZVRvTWV0YWRhdGEpKSB7XHJcbiAgICAgIGNvbnN0IHN5bWJvbHMgPSB0eXBlVG9TeW1ib2xzW3R5cGVdIHx8IFtdO1xyXG4gICAgICBjb25zdCBwcmVmZXJyZWQgPSBzeW1ib2xzWzBdIHx8IHByZWZlcnJlZEZhbGxiYWNrW3R5cGVdO1xyXG4gICAgICBpZiAobWRWYWx1ZSAmJiBwcmVmZXJyZWQgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHRoaXMuY29uZmlnLnN0YXR1c01hcHBpbmcubWV0YWRhdGFUb1N5bWJvbFttZFZhbHVlXSA9IHByZWZlcnJlZDtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMubm90aWZ5TGlzdGVuZXJzKCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGUgYSBjb25maWd1cmF0aW9uIHByZXNldCBmb3IgY29tbW9uIHVzZSBjYXNlc1xyXG4gICAqL1xyXG4gIHN0YXRpYyBjcmVhdGVQcmVzZXQocHJlc2V0TmFtZTogJ2Jhc2ljJyB8ICdtZXRhZGF0YS1vbmx5JyB8ICd0YWctb25seScgfCAnZnVsbCcpOiBQYXJ0aWFsPEZpbGVTb3VyY2VDb25maWd1cmF0aW9uPiB7XHJcbiAgICBzd2l0Y2ggKHByZXNldE5hbWUpIHtcclxuICAgICAgY2FzZSAnYmFzaWMnOlxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgcmVjb2duaXRpb25TdHJhdGVnaWVzOiB7XHJcbiAgICAgICAgICAgIG1ldGFkYXRhOiB7IC4uLkRFRkFVTFRfTUVUQURBVEFfQ09ORklHLCBlbmFibGVkOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHRhZ3M6IHsgLi4uREVGQVVMVF9UQUdfQ09ORklHLCBlbmFibGVkOiBmYWxzZSB9LFxyXG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHsgLi4uREVGQVVMVF9URU1QTEFURV9DT05GSUcsIGVuYWJsZWQ6IGZhbHNlIH0sXHJcbiAgICAgICAgICAgIHBhdGhzOiB7IC4uLkRFRkFVTFRfUEFUSF9DT05GSUcsIGVuYWJsZWQ6IGZhbHNlIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgY2FzZSAnbWV0YWRhdGEtb25seSc6XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICByZWNvZ25pdGlvblN0cmF0ZWdpZXM6IHtcclxuICAgICAgICAgICAgbWV0YWRhdGE6IHsgLi4uREVGQVVMVF9NRVRBREFUQV9DT05GSUcsIGVuYWJsZWQ6IHRydWUgfSxcclxuICAgICAgICAgICAgdGFnczogeyAuLi5ERUZBVUxUX1RBR19DT05GSUcsIGVuYWJsZWQ6IGZhbHNlIH0sXHJcbiAgICAgICAgICAgIHRlbXBsYXRlczogeyAuLi5ERUZBVUxUX1RFTVBMQVRFX0NPTkZJRywgZW5hYmxlZDogZmFsc2UgfSxcclxuICAgICAgICAgICAgcGF0aHM6IHsgLi4uREVGQVVMVF9QQVRIX0NPTkZJRywgZW5hYmxlZDogZmFsc2UgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICBjYXNlICd0YWctb25seSc6XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICByZWNvZ25pdGlvblN0cmF0ZWdpZXM6IHtcclxuICAgICAgICAgICAgbWV0YWRhdGE6IHsgLi4uREVGQVVMVF9NRVRBREFUQV9DT05GSUcsIGVuYWJsZWQ6IGZhbHNlIH0sXHJcbiAgICAgICAgICAgIHRhZ3M6IHsgLi4uREVGQVVMVF9UQUdfQ09ORklHLCBlbmFibGVkOiB0cnVlIH0sXHJcbiAgICAgICAgICAgIHRlbXBsYXRlczogeyAuLi5ERUZBVUxUX1RFTVBMQVRFX0NPTkZJRywgZW5hYmxlZDogZmFsc2UgfSxcclxuICAgICAgICAgICAgcGF0aHM6IHsgLi4uREVGQVVMVF9QQVRIX0NPTkZJRywgZW5hYmxlZDogZmFsc2UgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICBjYXNlICdmdWxsJzpcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgIHJlY29nbml0aW9uU3RyYXRlZ2llczoge1xyXG4gICAgICAgICAgICBtZXRhZGF0YTogeyAuLi5ERUZBVUxUX01FVEFEQVRBX0NPTkZJRywgZW5hYmxlZDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICB0YWdzOiB7IC4uLkRFRkFVTFRfVEFHX0NPTkZJRywgZW5hYmxlZDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHsgLi4uREVGQVVMVF9URU1QTEFURV9DT05GSUcsIGVuYWJsZWQ6IGZhbHNlIH0sXHJcbiAgICAgICAgICAgIHBhdGhzOiB7IC4uLkRFRkFVTFRfUEFUSF9DT05GSUcsIGVuYWJsZWQ6IGZhbHNlIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICByZXR1cm4ge307XHJcbiAgICB9XHJcbiAgfVxyXG59Il19