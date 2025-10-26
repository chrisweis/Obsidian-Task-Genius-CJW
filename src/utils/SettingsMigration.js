/**
 * Settings Migration Utility
 *
 * Handles migration of duplicate and overlapping settings to consolidate
 * configuration and eliminate confusion for users.
 */
/**
 * Migrate duplicate settings to unified FileSource configuration
 */
export function migrateFileParsingSettings(settings) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const result = {
        migrated: false,
        details: [],
        warnings: []
    };
    // Ensure fileSource exists
    if (!settings.fileSource) {
        settings.fileSource = createDefaultFileSourceConfig();
        result.details.push("Created default FileSource configuration");
    }
    // Migration 1: fileParsingConfig.enableFileMetadataParsing → fileSource.enabled
    if (((_a = settings.fileParsingConfig) === null || _a === void 0 ? void 0 : _a.enableFileMetadataParsing) === true && !settings.fileSource.enabled) {
        settings.fileSource.enabled = true;
        result.migrated = true;
        result.details.push("Migrated: Enable file metadata parsing → Enable FileSource");
    }
    // Migration 2: Tag-based parsing
    if (((_b = settings.fileParsingConfig) === null || _b === void 0 ? void 0 : _b.enableTagBasedTaskParsing) === true) {
        if (!settings.fileSource.recognitionStrategies.tags.enabled) {
            settings.fileSource.recognitionStrategies.tags.enabled = true;
            result.migrated = true;
            result.details.push("Migrated: Tag-based task parsing → FileSource tag recognition");
        }
        // Migrate tag patterns
        if (((_c = settings.fileParsingConfig.tagsToParseAsTasks) === null || _c === void 0 ? void 0 : _c.length) > 0) {
            settings.fileSource.recognitionStrategies.tags.taskTags = [
                ...new Set([
                    ...settings.fileSource.recognitionStrategies.tags.taskTags,
                    ...settings.fileParsingConfig.tagsToParseAsTasks
                ])
            ];
            result.details.push("Migrated: Tag patterns for task recognition");
        }
    }
    // Migration 3: Metadata fields
    if (((_e = (_d = settings.fileParsingConfig) === null || _d === void 0 ? void 0 : _d.metadataFieldsToParseAsTasks) === null || _e === void 0 ? void 0 : _e.length) > 0) {
        if (!settings.fileSource.recognitionStrategies.metadata.enabled) {
            settings.fileSource.recognitionStrategies.metadata.enabled = true;
            result.migrated = true;
            result.details.push("Migrated: Metadata parsing → FileSource metadata recognition");
        }
        settings.fileSource.recognitionStrategies.metadata.taskFields = [
            ...new Set([
                ...settings.fileSource.recognitionStrategies.metadata.taskFields,
                ...settings.fileParsingConfig.metadataFieldsToParseAsTasks
            ])
        ];
        result.details.push("Migrated: Metadata fields for task recognition");
    }
    // Migration 4: Worker processing settings
    if (((_f = settings.fileParsingConfig) === null || _f === void 0 ? void 0 : _f.enableWorkerProcessing) === true) {
        settings.fileSource.performance.enableWorkerProcessing = true;
        result.migrated = true;
        result.details.push("Migrated: Worker processing setting");
    }
    // Migration 5: Default task status
    if ((_g = settings.fileParsingConfig) === null || _g === void 0 ? void 0 : _g.defaultTaskStatus) {
        settings.fileSource.fileTaskProperties.defaultStatus = settings.fileParsingConfig.defaultTaskStatus;
        result.details.push("Migrated: Default task status");
    }
    // Migration 6: Task content source
    if ((_h = settings.fileParsingConfig) === null || _h === void 0 ? void 0 : _h.taskContentFromMetadata) {
        if (settings.fileParsingConfig.taskContentFromMetadata === "title") {
            settings.fileSource.fileTaskProperties.contentSource = "title";
        }
        else {
            settings.fileSource.fileTaskProperties.contentSource = "custom";
            settings.fileSource.fileTaskProperties.customContentField = settings.fileParsingConfig.taskContentFromMetadata;
        }
        result.details.push("Migrated: Task content source");
    }
    // Check for conflicts and warn user
    if (((_j = settings.fileParsingConfig) === null || _j === void 0 ? void 0 : _j.enableFileMetadataParsing) === true && settings.fileSource.enabled === false) {
        result.warnings.push("Conflict detected: File metadata parsing enabled but FileSource disabled");
    }
    return result;
}
/**
 * Clean up deprecated settings after successful migration
 */
export function cleanupDeprecatedSettings(settings) {
    var _a, _b, _c, _d, _e, _f, _g;
    const result = {
        migrated: false,
        details: [],
        warnings: []
    };
    // Only clean up if FileSource is enabled (migration was successful)
    if (!((_a = settings.fileSource) === null || _a === void 0 ? void 0 : _a.enabled)) {
        result.warnings.push("Skipping cleanup: FileSource not enabled");
        return result;
    }
    // Reset deprecated fileParsingConfig flags that are now handled by FileSource
    if (((_b = settings.fileParsingConfig) === null || _b === void 0 ? void 0 : _b.enableFileMetadataParsing) === true) {
        settings.fileParsingConfig.enableFileMetadataParsing = false;
        result.migrated = true;
        result.details.push("Disabled deprecated: Enable file metadata parsing");
    }
    if (((_c = settings.fileParsingConfig) === null || _c === void 0 ? void 0 : _c.enableTagBasedTaskParsing) === true) {
        settings.fileParsingConfig.enableTagBasedTaskParsing = false;
        result.migrated = true;
        result.details.push("Disabled deprecated: Tag-based task parsing");
    }
    // Clear migrated arrays to avoid confusion
    if (((_e = (_d = settings.fileParsingConfig) === null || _d === void 0 ? void 0 : _d.metadataFieldsToParseAsTasks) === null || _e === void 0 ? void 0 : _e.length) > 0) {
        settings.fileParsingConfig.metadataFieldsToParseAsTasks = [];
        result.details.push("Cleared deprecated: Metadata fields array");
    }
    if (((_g = (_f = settings.fileParsingConfig) === null || _f === void 0 ? void 0 : _f.tagsToParseAsTasks) === null || _g === void 0 ? void 0 : _g.length) > 0) {
        settings.fileParsingConfig.tagsToParseAsTasks = [];
        result.details.push("Cleared deprecated: Task tags array");
    }
    return result;
}
/**
 * Migrate duplicate project settings
 */
export function migrateProjectSettings(settings) {
    var _a, _b;
    const result = {
        migrated: false,
        details: [],
        warnings: []
    };
    // Check for duplicate project detection methods
    if (((_a = settings.projectConfig) === null || _a === void 0 ? void 0 : _a.enableEnhancedProject) && ((_b = settings.fileSource) === null || _b === void 0 ? void 0 : _b.enabled)) {
        result.warnings.push("Both enhanced project features and FileSource are enabled - consider consolidating");
    }
    // Note: fileSourceConfig was removed - if any code was using it, 
    // it should now use fileSource instead
    result.details.push("Project configuration uses projectConfig for enhanced features");
    return result;
}
/**
 * Migrate time parsing settings to enhanced configuration
 */
export function migrateTimeParsingSettings(settings) {
    const result = {
        migrated: false,
        details: [],
        warnings: []
    };
    // Check if timeParsing exists but lacks enhanced configuration
    if (settings.timeParsing && !settings.timeParsing.timePatterns) {
        // Add enhanced time parsing configuration with defaults
        settings.timeParsing.timePatterns = {
            singleTime: [
                /\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/g,
                /\b(1[0-2]|0?[1-9]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM|am|pm)\b/g, // 12-hour format
            ],
            timeRange: [
                /\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\s*[-~～]\s*([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/g,
                /\b(1[0-2]|0?[1-9]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM|am|pm)?\s*[-~～]\s*(1[0-2]|0?[1-9]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM|am|pm)\b/g, // 12-hour range
            ],
            rangeSeparators: ["-", "~", "～", " - ", " ~ ", " ～ "],
        };
        result.migrated = true;
        result.details.push("Added enhanced time parsing patterns configuration");
    }
    if (settings.timeParsing && !settings.timeParsing.timeDefaults) {
        // Add time defaults configuration
        settings.timeParsing.timeDefaults = {
            preferredFormat: "24h",
            defaultPeriod: "AM",
            midnightCrossing: "next-day",
        };
        result.migrated = true;
        result.details.push("Added time parsing defaults configuration");
    }
    return result;
}
/**
 * Run all migrations
 */
export function runAllMigrations(settings) {
    const results = [];
    // Run individual migrations
    results.push(migrateFileParsingSettings(settings));
    results.push(migrateProjectSettings(settings));
    results.push(migrateTimeParsingSettings(settings));
    // Only cleanup if migrations were successful
    const hasSuccessfulMigrations = results.some(r => r.migrated);
    if (hasSuccessfulMigrations) {
        results.push(cleanupDeprecatedSettings(settings));
    }
    // Combine results
    return {
        migrated: results.some(r => r.migrated),
        details: results.flatMap(r => r.details),
        warnings: results.flatMap(r => r.warnings)
    };
}
/**
 * Create default FileSource configuration
 */
function createDefaultFileSourceConfig() {
    return {
        enabled: false,
        recognitionStrategies: {
            metadata: {
                enabled: false,
                taskFields: ["dueDate", "status", "priority", "assigned"],
                requireAllFields: false
            },
            tags: {
                enabled: false,
                taskTags: ["#task", "#actionable", "#todo"],
                matchMode: "exact"
            },
            templates: {
                enabled: false,
                templatePaths: ["Templates/Task Template.md"],
                checkTemplateMetadata: true
            },
            paths: {
                enabled: false,
                taskPaths: ["Projects/", "Tasks/"],
                matchMode: "prefix"
            }
        },
        fileTaskProperties: {
            contentSource: "filename",
            stripExtension: true,
            defaultStatus: " ",
            defaultPriority: undefined,
            preferFrontmatterTitle: true
        },
        relationships: {
            enableChildRelationships: true,
            enableMetadataInheritance: true,
            inheritanceFields: ["project", "priority", "context"]
        },
        performance: {
            enableWorkerProcessing: true,
            enableCaching: true,
            cacheTTL: 300000
        },
        statusMapping: {
            enabled: true,
            metadataToSymbol: {
                'completed': 'x',
                'done': 'x',
                'in-progress': '/',
                'planned': '?',
                'cancelled': '-',
                'not-started': ' '
            },
            symbolToMetadata: {
                'x': 'completed',
                '/': 'in-progress',
                '?': 'planned',
                '-': 'cancelled',
                ' ': 'not-started'
            },
            autoDetect: true,
            caseSensitive: false
        }
    };
}
/**
 * Check if settings have duplicates that need migration
 */
export function hasSettingsDuplicates(settings) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    // Check for the main duplicate: file metadata parsing enabled in both systems
    const fileParsingEnabled = ((_a = settings.fileParsingConfig) === null || _a === void 0 ? void 0 : _a.enableFileMetadataParsing) === true;
    const fileSourceEnabled = ((_b = settings.fileSource) === null || _b === void 0 ? void 0 : _b.enabled) === true;
    if (fileParsingEnabled && !fileSourceEnabled) {
        return true;
    }
    // Check for tag parsing duplicates
    const tagParsingEnabled = ((_c = settings.fileParsingConfig) === null || _c === void 0 ? void 0 : _c.enableTagBasedTaskParsing) === true;
    const tagRecognitionEnabled = ((_f = (_e = (_d = settings.fileSource) === null || _d === void 0 ? void 0 : _d.recognitionStrategies) === null || _e === void 0 ? void 0 : _e.tags) === null || _f === void 0 ? void 0 : _f.enabled) === true;
    if (tagParsingEnabled && !tagRecognitionEnabled) {
        return true;
    }
    // Check for worker processing duplicates
    const workerParsingEnabled = ((_g = settings.fileParsingConfig) === null || _g === void 0 ? void 0 : _g.enableWorkerProcessing) === true;
    const workerSourceEnabled = ((_j = (_h = settings.fileSource) === null || _h === void 0 ? void 0 : _h.performance) === null || _j === void 0 ? void 0 : _j.enableWorkerProcessing) === true;
    if (workerParsingEnabled !== workerSourceEnabled) {
        return true;
    }
    return false;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2V0dGluZ3NNaWdyYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJTZXR0aW5nc01pZ3JhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7R0FLRztBQVdIOztHQUVHO0FBQ0gsTUFBTSxVQUFVLDBCQUEwQixDQUFDLFFBQWlDOztJQUMxRSxNQUFNLE1BQU0sR0FBb0I7UUFDOUIsUUFBUSxFQUFFLEtBQUs7UUFDZixPQUFPLEVBQUUsRUFBRTtRQUNYLFFBQVEsRUFBRSxFQUFFO0tBQ2IsQ0FBQztJQUVGLDJCQUEyQjtJQUMzQixJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRTtRQUN4QixRQUFRLENBQUMsVUFBVSxHQUFHLDZCQUE2QixFQUFFLENBQUM7UUFDdEQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsMENBQTBDLENBQUMsQ0FBQztLQUNqRTtJQUVELGdGQUFnRjtJQUNoRixJQUFJLENBQUEsTUFBQSxRQUFRLENBQUMsaUJBQWlCLDBDQUFFLHlCQUF5QixNQUFLLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFO1FBQ2xHLFFBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztRQUNuQyxNQUFNLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztRQUN2QixNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyw0REFBNEQsQ0FBQyxDQUFDO0tBQ25GO0lBRUQsaUNBQWlDO0lBQ2pDLElBQUksQ0FBQSxNQUFBLFFBQVEsQ0FBQyxpQkFBaUIsMENBQUUseUJBQXlCLE1BQUssSUFBSSxFQUFFO1FBQ2xFLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDM0QsUUFBUSxDQUFDLFVBQVUsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztZQUM5RCxNQUFNLENB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SUFFOUYsSUFBSSxvQkFBb0IsS0FBSyxtQkFBbUIsRUFBRTtRQUNoRCxPQUFPLElBQUksQ0FBQztLQUNiO0lBRUQsT0FBTyxLQUFLLENBQUM7QUFDZixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFNldHRpbmdzIE1pZ3JhdGlvbiBVdGlsaXR5XHJcbiAqIFxyXG4gKiBIYW5kbGVzIG1pZ3JhdGlvbiBvZiBkdXBsaWNhdGUgYW5kIG92ZXJsYXBwaW5nIHNldHRpbmdzIHRvIGNvbnNvbGlkYXRlXHJcbiAqIGNvbmZpZ3VyYXRpb24gYW5kIGVsaW1pbmF0ZSBjb25mdXNpb24gZm9yIHVzZXJzLlxyXG4gKi9cclxuXHJcbmltcG9ydCB0eXBlIHsgVGFza1Byb2dyZXNzQmFyU2V0dGluZ3MgfSBmcm9tIFwiLi4vY29tbW9uL3NldHRpbmctZGVmaW5pdGlvblwiO1xyXG5pbXBvcnQgdHlwZSB7IEZpbGVTb3VyY2VDb25maWd1cmF0aW9uIH0gZnJvbSBcIi4uL3R5cGVzL2ZpbGUtc291cmNlXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE1pZ3JhdGlvblJlc3VsdCB7XHJcbiAgbWlncmF0ZWQ6IGJvb2xlYW47XHJcbiAgZGV0YWlsczogc3RyaW5nW107XHJcbiAgd2FybmluZ3M6IHN0cmluZ1tdO1xyXG59XHJcblxyXG4vKipcclxuICogTWlncmF0ZSBkdXBsaWNhdGUgc2V0dGluZ3MgdG8gdW5pZmllZCBGaWxlU291cmNlIGNvbmZpZ3VyYXRpb25cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBtaWdyYXRlRmlsZVBhcnNpbmdTZXR0aW5ncyhzZXR0aW5nczogVGFza1Byb2dyZXNzQmFyU2V0dGluZ3MpOiBNaWdyYXRpb25SZXN1bHQge1xyXG4gIGNvbnN0IHJlc3VsdDogTWlncmF0aW9uUmVzdWx0ID0ge1xyXG4gICAgbWlncmF0ZWQ6IGZhbHNlLFxyXG4gICAgZGV0YWlsczogW10sXHJcbiAgICB3YXJuaW5nczogW11cclxuICB9O1xyXG5cclxuICAvLyBFbnN1cmUgZmlsZVNvdXJjZSBleGlzdHNcclxuICBpZiAoIXNldHRpbmdzLmZpbGVTb3VyY2UpIHtcclxuICAgIHNldHRpbmdzLmZpbGVTb3VyY2UgPSBjcmVhdGVEZWZhdWx0RmlsZVNvdXJjZUNvbmZpZygpO1xyXG4gICAgcmVzdWx0LmRldGFpbHMucHVzaChcIkNyZWF0ZWQgZGVmYXVsdCBGaWxlU291cmNlIGNvbmZpZ3VyYXRpb25cIik7XHJcbiAgfVxyXG5cclxuICAvLyBNaWdyYXRpb24gMTogZmlsZVBhcnNpbmdDb25maWcuZW5hYmxlRmlsZU1ldGFkYXRhUGFyc2luZyDihpIgZmlsZVNvdXJjZS5lbmFibGVkXHJcbiAgaWYgKHNldHRpbmdzLmZpbGVQYXJzaW5nQ29uZmlnPy5lbmFibGVGaWxlTWV0YWRhdGFQYXJzaW5nID09PSB0cnVlICYmICFzZXR0aW5ncy5maWxlU291cmNlLmVuYWJsZWQpIHtcclxuICAgIHNldHRpbmdzLmZpbGVTb3VyY2UuZW5hYmxlZCA9IHRydWU7XHJcbiAgICByZXN1bHQubWlncmF0ZWQgPSB0cnVlO1xyXG4gICAgcmVzdWx0LmRldGFpbHMucHVzaChcIk1pZ3JhdGVkOiBFbmFibGUgZmlsZSBtZXRhZGF0YSBwYXJzaW5nIOKGkiBFbmFibGUgRmlsZVNvdXJjZVwiKTtcclxuICB9XHJcblxyXG4gIC8vIE1pZ3JhdGlvbiAyOiBUYWctYmFzZWQgcGFyc2luZ1xyXG4gIGlmIChzZXR0aW5ncy5maWxlUGFyc2luZ0NvbmZpZz8uZW5hYmxlVGFnQmFzZWRUYXNrUGFyc2luZyA9PT0gdHJ1ZSkge1xyXG4gICAgaWYgKCFzZXR0aW5ncy5maWxlU291cmNlLnJlY29nbml0aW9uU3RyYXRlZ2llcy50YWdzLmVuYWJsZWQpIHtcclxuICAgICAgc2V0dGluZ3MuZmlsZVNvdXJjZS5yZWNvZ25pdGlvblN0cmF0ZWdpZXMudGFncy5lbmFibGVkID0gdHJ1ZTtcclxuICAgICAgcmVzdWx0Lm1pZ3JhdGVkID0gdHJ1ZTtcclxuICAgICAgcmVzdWx0LmRldGFpbHMucHVzaChcIk1pZ3JhdGVkOiBUYWctYmFzZWQgdGFzayBwYXJzaW5nIOKGkiBGaWxlU291cmNlIHRhZyByZWNvZ25pdGlvblwiKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBNaWdyYXRlIHRhZyBwYXR0ZXJuc1xyXG4gICAgaWYgKHNldHRpbmdzLmZpbGVQYXJzaW5nQ29uZmlnLnRhZ3NUb1BhcnNlQXNUYXNrcz8ubGVuZ3RoID4gMCkge1xyXG4gICAgICBzZXR0aW5ncy5maWxlU291cmNlLnJlY29nbml0aW9uU3RyYXRlZ2llcy50YWdzLnRhc2tUYWdzID0gW1xyXG4gICAgICAgIC4uLm5ldyBTZXQoW1xyXG4gICAgICAgICAgLi4uc2V0dGluZ3MuZmlsZVNvdXJjZS5yZWNvZ25pdGlvblN0cmF0ZWdpZXMudGFncy50YXNrVGFncyxcclxuICAgICAgICAgIC4uLnNldHRpbmdzLmZpbGVQYXJzaW5nQ29uZmlnLnRhZ3NUb1BhcnNlQXNUYXNrc1xyXG4gICAgICAgIF0pXHJcbiAgICAgIF07XHJcbiAgICAgIHJlc3VsdC5kZXRhaWxzLnB1c2goXCJNaWdyYXRlZDogVGFnIHBhdHRlcm5zIGZvciB0YXNrIHJlY29nbml0aW9uXCIpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gTWlncmF0aW9uIDM6IE1ldGFkYXRhIGZpZWxkc1xyXG4gIGlmIChzZXR0aW5ncy5maWxlUGFyc2luZ0NvbmZpZz8ubWV0YWRhdGFGaWVsZHNUb1BhcnNlQXNUYXNrcz8ubGVuZ3RoID4gMCkge1xyXG4gICAgaWYgKCFzZXR0aW5ncy5maWxlU291cmNlLnJlY29nbml0aW9uU3RyYXRlZ2llcy5tZXRhZGF0YS5lbmFibGVkKSB7XHJcbiAgICAgIHNldHRpbmdzLmZpbGVTb3VyY2UucmVjb2duaXRpb25TdHJhdGVnaWVzLm1ldGFkYXRhLmVuYWJsZWQgPSB0cnVlO1xyXG4gICAgICByZXN1bHQubWlncmF0ZWQgPSB0cnVlO1xyXG4gICAgICByZXN1bHQuZGV0YWlscy5wdXNoKFwiTWlncmF0ZWQ6IE1ldGFkYXRhIHBhcnNpbmcg4oaSIEZpbGVTb3VyY2UgbWV0YWRhdGEgcmVjb2duaXRpb25cIik7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0dGluZ3MuZmlsZVNvdXJjZS5yZWNvZ25pdGlvblN0cmF0ZWdpZXMubWV0YWRhdGEudGFza0ZpZWxkcyA9IFtcclxuICAgICAgLi4ubmV3IFNldChbXHJcbiAgICAgICAgLi4uc2V0dGluZ3MuZmlsZVNvdXJjZS5yZWNvZ25pdGlvblN0cmF0ZWdpZXMubWV0YWRhdGEudGFza0ZpZWxkcyxcclxuICAgICAgICAuLi5zZXR0aW5ncy5maWxlUGFyc2luZ0NvbmZpZy5tZXRhZGF0YUZpZWxkc1RvUGFyc2VBc1Rhc2tzXHJcbiAgICAgIF0pXHJcbiAgICBdO1xyXG4gICAgcmVzdWx0LmRldGFpbHMucHVzaChcIk1pZ3JhdGVkOiBNZXRhZGF0YSBmaWVsZHMgZm9yIHRhc2sgcmVjb2duaXRpb25cIik7XHJcbiAgfVxyXG5cclxuICAvLyBNaWdyYXRpb24gNDogV29ya2VyIHByb2Nlc3Npbmcgc2V0dGluZ3NcclxuICBpZiAoc2V0dGluZ3MuZmlsZVBhcnNpbmdDb25maWc/LmVuYWJsZVdvcmtlclByb2Nlc3NpbmcgPT09IHRydWUpIHtcclxuICAgIHNldHRpbmdzLmZpbGVTb3VyY2UucGVyZm9ybWFuY2UuZW5hYmxlV29ya2VyUHJvY2Vzc2luZyA9IHRydWU7XHJcbiAgICByZXN1bHQubWlncmF0ZWQgPSB0cnVlO1xyXG4gICAgcmVzdWx0LmRldGFpbHMucHVzaChcIk1pZ3JhdGVkOiBXb3JrZXIgcHJvY2Vzc2luZyBzZXR0aW5nXCIpO1xyXG4gIH1cclxuXHJcbiAgLy8gTWlncmF0aW9uIDU6IERlZmF1bHQgdGFzayBzdGF0dXNcclxuICBpZiAoc2V0dGluZ3MuZmlsZVBhcnNpbmdDb25maWc/LmRlZmF1bHRUYXNrU3RhdHVzKSB7XHJcbiAgICBzZXR0aW5ncy5maWxlU291cmNlLmZpbGVUYXNrUHJvcGVydGllcy5kZWZhdWx0U3RhdHVzID0gc2V0dGluZ3MuZmlsZVBhcnNpbmdDb25maWcuZGVmYXVsdFRhc2tTdGF0dXM7XHJcbiAgICByZXN1bHQuZGV0YWlscy5wdXNoKFwiTWlncmF0ZWQ6IERlZmF1bHQgdGFzayBzdGF0dXNcIik7XHJcbiAgfVxyXG5cclxuICAvLyBNaWdyYXRpb24gNjogVGFzayBjb250ZW50IHNvdXJjZVxyXG4gIGlmIChzZXR0aW5ncy5maWxlUGFyc2luZ0NvbmZpZz8udGFza0NvbnRlbnRGcm9tTWV0YWRhdGEpIHtcclxuICAgIGlmIChzZXR0aW5ncy5maWxlUGFyc2luZ0NvbmZpZy50YXNrQ29udGVudEZyb21NZXRhZGF0YSA9PT0gXCJ0aXRsZVwiKSB7XHJcbiAgICAgIHNldHRpbmdzLmZpbGVTb3VyY2UuZmlsZVRhc2tQcm9wZXJ0aWVzLmNvbnRlbnRTb3VyY2UgPSBcInRpdGxlXCI7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBzZXR0aW5ncy5maWxlU291cmNlLmZpbGVUYXNrUHJvcGVydGllcy5jb250ZW50U291cmNlID0gXCJjdXN0b21cIjtcclxuICAgICAgc2V0dGluZ3MuZmlsZVNvdXJjZS5maWxlVGFza1Byb3BlcnRpZXMuY3VzdG9tQ29udGVudEZpZWxkID0gc2V0dGluZ3MuZmlsZVBhcnNpbmdDb25maWcudGFza0NvbnRlbnRGcm9tTWV0YWRhdGE7XHJcbiAgICB9XHJcbiAgICByZXN1bHQuZGV0YWlscy5wdXNoKFwiTWlncmF0ZWQ6IFRhc2sgY29udGVudCBzb3VyY2VcIik7XHJcbiAgfVxyXG5cclxuICAvLyBDaGVjayBmb3IgY29uZmxpY3RzIGFuZCB3YXJuIHVzZXJcclxuICBpZiAoc2V0dGluZ3MuZmlsZVBhcnNpbmdDb25maWc/LmVuYWJsZUZpbGVNZXRhZGF0YVBhcnNpbmcgPT09IHRydWUgJiYgc2V0dGluZ3MuZmlsZVNvdXJjZS5lbmFibGVkID09PSBmYWxzZSkge1xyXG4gICAgcmVzdWx0Lndhcm5pbmdzLnB1c2goXCJDb25mbGljdCBkZXRlY3RlZDogRmlsZSBtZXRhZGF0YSBwYXJzaW5nIGVuYWJsZWQgYnV0IEZpbGVTb3VyY2UgZGlzYWJsZWRcIik7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG4vKipcclxuICogQ2xlYW4gdXAgZGVwcmVjYXRlZCBzZXR0aW5ncyBhZnRlciBzdWNjZXNzZnVsIG1pZ3JhdGlvblxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNsZWFudXBEZXByZWNhdGVkU2V0dGluZ3Moc2V0dGluZ3M6IFRhc2tQcm9ncmVzc0JhclNldHRpbmdzKTogTWlncmF0aW9uUmVzdWx0IHtcclxuICBjb25zdCByZXN1bHQ6IE1pZ3JhdGlvblJlc3VsdCA9IHtcclxuICAgIG1pZ3JhdGVkOiBmYWxzZSxcclxuICAgIGRldGFpbHM6IFtdLFxyXG4gICAgd2FybmluZ3M6IFtdXHJcbiAgfTtcclxuXHJcbiAgLy8gT25seSBjbGVhbiB1cCBpZiBGaWxlU291cmNlIGlzIGVuYWJsZWQgKG1pZ3JhdGlvbiB3YXMgc3VjY2Vzc2Z1bClcclxuICBpZiAoIXNldHRpbmdzLmZpbGVTb3VyY2U/LmVuYWJsZWQpIHtcclxuICAgIHJlc3VsdC53YXJuaW5ncy5wdXNoKFwiU2tpcHBpbmcgY2xlYW51cDogRmlsZVNvdXJjZSBub3QgZW5hYmxlZFwiKTtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfVxyXG5cclxuICAvLyBSZXNldCBkZXByZWNhdGVkIGZpbGVQYXJzaW5nQ29uZmlnIGZsYWdzIHRoYXQgYXJlIG5vdyBoYW5kbGVkIGJ5IEZpbGVTb3VyY2VcclxuICBpZiAoc2V0dGluZ3MuZmlsZVBhcnNpbmdDb25maWc/LmVuYWJsZUZpbGVNZXRhZGF0YVBhcnNpbmcgPT09IHRydWUpIHtcclxuICAgIHNldHRpbmdzLmZpbGVQYXJzaW5nQ29uZmlnLmVuYWJsZUZpbGVNZXRhZGF0YVBhcnNpbmcgPSBmYWxzZTtcclxuICAgIHJlc3VsdC5taWdyYXRlZCA9IHRydWU7XHJcbiAgICByZXN1bHQuZGV0YWlscy5wdXNoKFwiRGlzYWJsZWQgZGVwcmVjYXRlZDogRW5hYmxlIGZpbGUgbWV0YWRhdGEgcGFyc2luZ1wiKTtcclxuICB9XHJcblxyXG4gIGlmIChzZXR0aW5ncy5maWxlUGFyc2luZ0NvbmZpZz8uZW5hYmxlVGFnQmFzZWRUYXNrUGFyc2luZyA9PT0gdHJ1ZSkge1xyXG4gICAgc2V0dGluZ3MuZmlsZVBhcnNpbmdDb25maWcuZW5hYmxlVGFnQmFzZWRUYXNrUGFyc2luZyA9IGZhbHNlO1xyXG4gICAgcmVzdWx0Lm1pZ3JhdGVkID0gdHJ1ZTtcclxuICAgIHJlc3VsdC5kZXRhaWxzLnB1c2goXCJEaXNhYmxlZCBkZXByZWNhdGVkOiBUYWctYmFzZWQgdGFzayBwYXJzaW5nXCIpO1xyXG4gIH1cclxuXHJcbiAgLy8gQ2xlYXIgbWlncmF0ZWQgYXJyYXlzIHRvIGF2b2lkIGNvbmZ1c2lvblxyXG4gIGlmIChzZXR0aW5ncy5maWxlUGFyc2luZ0NvbmZpZz8ubWV0YWRhdGFGaWVsZHNUb1BhcnNlQXNUYXNrcz8ubGVuZ3RoID4gMCkge1xyXG4gICAgc2V0dGluZ3MuZmlsZVBhcnNpbmdDb25maWcubWV0YWRhdGFGaWVsZHNUb1BhcnNlQXNUYXNrcyA9IFtdO1xyXG4gICAgcmVzdWx0LmRldGFpbHMucHVzaChcIkNsZWFyZWQgZGVwcmVjYXRlZDogTWV0YWRhdGEgZmllbGRzIGFycmF5XCIpO1xyXG4gIH1cclxuXHJcbiAgaWYgKHNldHRpbmdzLmZpbGVQYXJzaW5nQ29uZmlnPy50YWdzVG9QYXJzZUFzVGFza3M/Lmxlbmd0aCA+IDApIHtcclxuICAgIHNldHRpbmdzLmZpbGVQYXJzaW5nQ29uZmlnLnRhZ3NUb1BhcnNlQXNUYXNrcyA9IFtdO1xyXG4gICAgcmVzdWx0LmRldGFpbHMucHVzaChcIkNsZWFyZWQgZGVwcmVjYXRlZDogVGFzayB0YWdzIGFycmF5XCIpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuLyoqXHJcbiAqIE1pZ3JhdGUgZHVwbGljYXRlIHByb2plY3Qgc2V0dGluZ3NcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBtaWdyYXRlUHJvamVjdFNldHRpbmdzKHNldHRpbmdzOiBUYXNrUHJvZ3Jlc3NCYXJTZXR0aW5ncyk6IE1pZ3JhdGlvblJlc3VsdCB7XHJcbiAgY29uc3QgcmVzdWx0OiBNaWdyYXRpb25SZXN1bHQgPSB7XHJcbiAgICBtaWdyYXRlZDogZmFsc2UsXHJcbiAgICBkZXRhaWxzOiBbXSxcclxuICAgIHdhcm5pbmdzOiBbXVxyXG4gIH07XHJcblxyXG4gIC8vIENoZWNrIGZvciBkdXBsaWNhdGUgcHJvamVjdCBkZXRlY3Rpb24gbWV0aG9kc1xyXG4gIGlmIChzZXR0aW5ncy5wcm9qZWN0Q29uZmlnPy5lbmFibGVFbmhhbmNlZFByb2plY3QgJiYgc2V0dGluZ3MuZmlsZVNvdXJjZT8uZW5hYmxlZCkge1xyXG4gICAgcmVzdWx0Lndhcm5pbmdzLnB1c2goXCJCb3RoIGVuaGFuY2VkIHByb2plY3QgZmVhdHVyZXMgYW5kIEZpbGVTb3VyY2UgYXJlIGVuYWJsZWQgLSBjb25zaWRlciBjb25zb2xpZGF0aW5nXCIpO1xyXG4gIH1cclxuXHJcbiAgLy8gTm90ZTogZmlsZVNvdXJjZUNvbmZpZyB3YXMgcmVtb3ZlZCAtIGlmIGFueSBjb2RlIHdhcyB1c2luZyBpdCwgXHJcbiAgLy8gaXQgc2hvdWxkIG5vdyB1c2UgZmlsZVNvdXJjZSBpbnN0ZWFkXHJcbiAgcmVzdWx0LmRldGFpbHMucHVzaChcIlByb2plY3QgY29uZmlndXJhdGlvbiB1c2VzIHByb2plY3RDb25maWcgZm9yIGVuaGFuY2VkIGZlYXR1cmVzXCIpO1xyXG5cclxuICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG4vKipcclxuICogTWlncmF0ZSB0aW1lIHBhcnNpbmcgc2V0dGluZ3MgdG8gZW5oYW5jZWQgY29uZmlndXJhdGlvblxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIG1pZ3JhdGVUaW1lUGFyc2luZ1NldHRpbmdzKHNldHRpbmdzOiBUYXNrUHJvZ3Jlc3NCYXJTZXR0aW5ncyk6IE1pZ3JhdGlvblJlc3VsdCB7XHJcbiAgY29uc3QgcmVzdWx0OiBNaWdyYXRpb25SZXN1bHQgPSB7XHJcbiAgICBtaWdyYXRlZDogZmFsc2UsXHJcbiAgICBkZXRhaWxzOiBbXSxcclxuICAgIHdhcm5pbmdzOiBbXVxyXG4gIH07XHJcblxyXG4gIC8vIENoZWNrIGlmIHRpbWVQYXJzaW5nIGV4aXN0cyBidXQgbGFja3MgZW5oYW5jZWQgY29uZmlndXJhdGlvblxyXG4gIGlmIChzZXR0aW5ncy50aW1lUGFyc2luZyAmJiAhc2V0dGluZ3MudGltZVBhcnNpbmcudGltZVBhdHRlcm5zKSB7XHJcbiAgICAvLyBBZGQgZW5oYW5jZWQgdGltZSBwYXJzaW5nIGNvbmZpZ3VyYXRpb24gd2l0aCBkZWZhdWx0c1xyXG4gICAgc2V0dGluZ3MudGltZVBhcnNpbmcudGltZVBhdHRlcm5zID0ge1xyXG4gICAgICBzaW5nbGVUaW1lOiBbXHJcbiAgICAgICAgL1xcYihbMDFdP1xcZHwyWzAtM10pOihbMC01XVxcZCkoPzo6KFswLTVdXFxkKSk/XFxiL2csIC8vIDI0LWhvdXIgZm9ybWF0XHJcbiAgICAgICAgL1xcYigxWzAtMl18MD9bMS05XSk6KFswLTVdXFxkKSg/OjooWzAtNV1cXGQpKT9cXHMqKEFNfFBNfGFtfHBtKVxcYi9nLCAvLyAxMi1ob3VyIGZvcm1hdFxyXG4gICAgICBdLFxyXG4gICAgICB0aW1lUmFuZ2U6IFtcclxuICAgICAgICAvXFxiKFswMV0/XFxkfDJbMC0zXSk6KFswLTVdXFxkKSg/OjooWzAtNV1cXGQpKT9cXHMqWy1+772eXVxccyooWzAxXT9cXGR8MlswLTNdKTooWzAtNV1cXGQpKD86OihbMC01XVxcZCkpP1xcYi9nLCAvLyAyNC1ob3VyIHJhbmdlXHJcbiAgICAgICAgL1xcYigxWzAtMl18MD9bMS05XSk6KFswLTVdXFxkKSg/OjooWzAtNV1cXGQpKT9cXHMqKEFNfFBNfGFtfHBtKT9cXHMqWy1+772eXVxccyooMVswLTJdfDA/WzEtOV0pOihbMC01XVxcZCkoPzo6KFswLTVdXFxkKSk/XFxzKihBTXxQTXxhbXxwbSlcXGIvZywgLy8gMTItaG91ciByYW5nZVxyXG4gICAgICBdLFxyXG4gICAgICByYW5nZVNlcGFyYXRvcnM6IFtcIi1cIiwgXCJ+XCIsIFwi772eXCIsIFwiIC0gXCIsIFwiIH4gXCIsIFwiIO+9niBcIl0sXHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICByZXN1bHQubWlncmF0ZWQgPSB0cnVlO1xyXG4gICAgcmVzdWx0LmRldGFpbHMucHVzaChcIkFkZGVkIGVuaGFuY2VkIHRpbWUgcGFyc2luZyBwYXR0ZXJucyBjb25maWd1cmF0aW9uXCIpO1xyXG4gIH1cclxuXHJcbiAgaWYgKHNldHRpbmdzLnRpbWVQYXJzaW5nICYmICFzZXR0aW5ncy50aW1lUGFyc2luZy50aW1lRGVmYXVsdHMpIHtcclxuICAgIC8vIEFkZCB0aW1lIGRlZmF1bHRzIGNvbmZpZ3VyYXRpb25cclxuICAgIHNldHRpbmdzLnRpbWVQYXJzaW5nLnRpbWVEZWZhdWx0cyA9IHtcclxuICAgICAgcHJlZmVycmVkRm9ybWF0OiBcIjI0aFwiLFxyXG4gICAgICBkZWZhdWx0UGVyaW9kOiBcIkFNXCIsXHJcbiAgICAgIG1pZG5pZ2h0Q3Jvc3Npbmc6IFwibmV4dC1kYXlcIixcclxuICAgIH07XHJcbiAgICBcclxuICAgIHJlc3VsdC5taWdyYXRlZCA9IHRydWU7XHJcbiAgICByZXN1bHQuZGV0YWlscy5wdXNoKFwiQWRkZWQgdGltZSBwYXJzaW5nIGRlZmF1bHRzIGNvbmZpZ3VyYXRpb25cIik7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG4vKipcclxuICogUnVuIGFsbCBtaWdyYXRpb25zXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcnVuQWxsTWlncmF0aW9ucyhzZXR0aW5nczogVGFza1Byb2dyZXNzQmFyU2V0dGluZ3MpOiBNaWdyYXRpb25SZXN1bHQge1xyXG4gIGNvbnN0IHJlc3VsdHM6IE1pZ3JhdGlvblJlc3VsdFtdID0gW107XHJcbiAgXHJcbiAgLy8gUnVuIGluZGl2aWR1YWwgbWlncmF0aW9uc1xyXG4gIHJlc3VsdHMucHVzaChtaWdyYXRlRmlsZVBhcnNpbmdTZXR0aW5ncyhzZXR0aW5ncykpO1xyXG4gIHJlc3VsdHMucHVzaChtaWdyYXRlUHJvamVjdFNldHRpbmdzKHNldHRpbmdzKSk7XHJcbiAgcmVzdWx0cy5wdXNoKG1pZ3JhdGVUaW1lUGFyc2luZ1NldHRpbmdzKHNldHRpbmdzKSk7XHJcbiAgXHJcbiAgLy8gT25seSBjbGVhbnVwIGlmIG1pZ3JhdGlvbnMgd2VyZSBzdWNjZXNzZnVsXHJcbiAgY29uc3QgaGFzU3VjY2Vzc2Z1bE1pZ3JhdGlvbnMgPSByZXN1bHRzLnNvbWUociA9PiByLm1pZ3JhdGVkKTtcclxuICBpZiAoaGFzU3VjY2Vzc2Z1bE1pZ3JhdGlvbnMpIHtcclxuICAgIHJlc3VsdHMucHVzaChjbGVhbnVwRGVwcmVjYXRlZFNldHRpbmdzKHNldHRpbmdzKSk7XHJcbiAgfVxyXG5cclxuICAvLyBDb21iaW5lIHJlc3VsdHNcclxuICByZXR1cm4ge1xyXG4gICAgbWlncmF0ZWQ6IHJlc3VsdHMuc29tZShyID0+IHIubWlncmF0ZWQpLFxyXG4gICAgZGV0YWlsczogcmVzdWx0cy5mbGF0TWFwKHIgPT4gci5kZXRhaWxzKSxcclxuICAgIHdhcm5pbmdzOiByZXN1bHRzLmZsYXRNYXAociA9PiByLndhcm5pbmdzKVxyXG4gIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgZGVmYXVsdCBGaWxlU291cmNlIGNvbmZpZ3VyYXRpb25cclxuICovXHJcbmZ1bmN0aW9uIGNyZWF0ZURlZmF1bHRGaWxlU291cmNlQ29uZmlnKCk6IEZpbGVTb3VyY2VDb25maWd1cmF0aW9uIHtcclxuICByZXR1cm4ge1xyXG4gICAgZW5hYmxlZDogZmFsc2UsXHJcbiAgICByZWNvZ25pdGlvblN0cmF0ZWdpZXM6IHtcclxuICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICBlbmFibGVkOiBmYWxzZSxcclxuICAgICAgICB0YXNrRmllbGRzOiBbXCJkdWVEYXRlXCIsIFwic3RhdHVzXCIsIFwicHJpb3JpdHlcIiwgXCJhc3NpZ25lZFwiXSxcclxuICAgICAgICByZXF1aXJlQWxsRmllbGRzOiBmYWxzZVxyXG4gICAgICB9LFxyXG4gICAgICB0YWdzOiB7XHJcbiAgICAgICAgZW5hYmxlZDogZmFsc2UsXHJcbiAgICAgICAgdGFza1RhZ3M6IFtcIiN0YXNrXCIsIFwiI2FjdGlvbmFibGVcIiwgXCIjdG9kb1wiXSxcclxuICAgICAgICBtYXRjaE1vZGU6IFwiZXhhY3RcIlxyXG4gICAgICB9LFxyXG4gICAgICB0ZW1wbGF0ZXM6IHtcclxuICAgICAgICBlbmFibGVkOiBmYWxzZSxcclxuICAgICAgICB0ZW1wbGF0ZVBhdGhzOiBbXCJUZW1wbGF0ZXMvVGFzayBUZW1wbGF0ZS5tZFwiXSxcclxuICAgICAgICBjaGVja1RlbXBsYXRlTWV0YWRhdGE6IHRydWVcclxuICAgICAgfSxcclxuICAgICAgcGF0aHM6IHtcclxuICAgICAgICBlbmFibGVkOiBmYWxzZSxcclxuICAgICAgICB0YXNrUGF0aHM6IFtcIlByb2plY3RzL1wiLCBcIlRhc2tzL1wiXSxcclxuICAgICAgICBtYXRjaE1vZGU6IFwicHJlZml4XCJcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIGZpbGVUYXNrUHJvcGVydGllczoge1xyXG4gICAgICBjb250ZW50U291cmNlOiBcImZpbGVuYW1lXCIsXHJcbiAgICAgIHN0cmlwRXh0ZW5zaW9uOiB0cnVlLFxyXG4gICAgICBkZWZhdWx0U3RhdHVzOiBcIiBcIixcclxuICAgICAgZGVmYXVsdFByaW9yaXR5OiB1bmRlZmluZWQsXHJcbiAgICAgIHByZWZlckZyb250bWF0dGVyVGl0bGU6IHRydWVcclxuICAgIH0sXHJcbiAgICByZWxhdGlvbnNoaXBzOiB7XHJcbiAgICAgIGVuYWJsZUNoaWxkUmVsYXRpb25zaGlwczogdHJ1ZSxcclxuICAgICAgZW5hYmxlTWV0YWRhdGFJbmhlcml0YW5jZTogdHJ1ZSxcclxuICAgICAgaW5oZXJpdGFuY2VGaWVsZHM6IFtcInByb2plY3RcIiwgXCJwcmlvcml0eVwiLCBcImNvbnRleHRcIl1cclxuICAgIH0sXHJcbiAgICBwZXJmb3JtYW5jZToge1xyXG4gICAgICBlbmFibGVXb3JrZXJQcm9jZXNzaW5nOiB0cnVlLFxyXG4gICAgICBlbmFibGVDYWNoaW5nOiB0cnVlLFxyXG4gICAgICBjYWNoZVRUTDogMzAwMDAwXHJcbiAgICB9LFxyXG4gICAgc3RhdHVzTWFwcGluZzoge1xyXG4gICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICBtZXRhZGF0YVRvU3ltYm9sOiB7XHJcbiAgICAgICAgJ2NvbXBsZXRlZCc6ICd4JyxcclxuICAgICAgICAnZG9uZSc6ICd4JyxcclxuICAgICAgICAnaW4tcHJvZ3Jlc3MnOiAnLycsXHJcbiAgICAgICAgJ3BsYW5uZWQnOiAnPycsXHJcbiAgICAgICAgJ2NhbmNlbGxlZCc6ICctJyxcclxuICAgICAgICAnbm90LXN0YXJ0ZWQnOiAnICdcclxuICAgICAgfSxcclxuICAgICAgc3ltYm9sVG9NZXRhZGF0YToge1xyXG4gICAgICAgICd4JzogJ2NvbXBsZXRlZCcsXHJcbiAgICAgICAgJy8nOiAnaW4tcHJvZ3Jlc3MnLFxyXG4gICAgICAgICc/JzogJ3BsYW5uZWQnLFxyXG4gICAgICAgICctJzogJ2NhbmNlbGxlZCcsXHJcbiAgICAgICAgJyAnOiAnbm90LXN0YXJ0ZWQnXHJcbiAgICAgIH0sXHJcbiAgICAgIGF1dG9EZXRlY3Q6IHRydWUsXHJcbiAgICAgIGNhc2VTZW5zaXRpdmU6IGZhbHNlXHJcbiAgICB9XHJcbiAgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENoZWNrIGlmIHNldHRpbmdzIGhhdmUgZHVwbGljYXRlcyB0aGF0IG5lZWQgbWlncmF0aW9uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaGFzU2V0dGluZ3NEdXBsaWNhdGVzKHNldHRpbmdzOiBUYXNrUHJvZ3Jlc3NCYXJTZXR0aW5ncyk6IGJvb2xlYW4ge1xyXG4gIC8vIENoZWNrIGZvciB0aGUgbWFpbiBkdXBsaWNhdGU6IGZpbGUgbWV0YWRhdGEgcGFyc2luZyBlbmFibGVkIGluIGJvdGggc3lzdGVtc1xyXG4gIGNvbnN0IGZpbGVQYXJzaW5nRW5hYmxlZCA9IHNldHRpbmdzLmZpbGVQYXJzaW5nQ29uZmlnPy5lbmFibGVGaWxlTWV0YWRhdGFQYXJzaW5nID09PSB0cnVlO1xyXG4gIGNvbnN0IGZpbGVTb3VyY2VFbmFibGVkID0gc2V0dGluZ3MuZmlsZVNvdXJjZT8uZW5hYmxlZCA9PT0gdHJ1ZTtcclxuICBcclxuICBpZiAoZmlsZVBhcnNpbmdFbmFibGVkICYmICFmaWxlU291cmNlRW5hYmxlZCkge1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICAvLyBDaGVjayBmb3IgdGFnIHBhcnNpbmcgZHVwbGljYXRlc1xyXG4gIGNvbnN0IHRhZ1BhcnNpbmdFbmFibGVkID0gc2V0dGluZ3MuZmlsZVBhcnNpbmdDb25maWc/LmVuYWJsZVRhZ0Jhc2VkVGFza1BhcnNpbmcgPT09IHRydWU7XHJcbiAgY29uc3QgdGFnUmVjb2duaXRpb25FbmFibGVkID0gc2V0dGluZ3MuZmlsZVNvdXJjZT8ucmVjb2duaXRpb25TdHJhdGVnaWVzPy50YWdzPy5lbmFibGVkID09PSB0cnVlO1xyXG4gIFxyXG4gIGlmICh0YWdQYXJzaW5nRW5hYmxlZCAmJiAhdGFnUmVjb2duaXRpb25FbmFibGVkKSB7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcblxyXG4gIC8vIENoZWNrIGZvciB3b3JrZXIgcHJvY2Vzc2luZyBkdXBsaWNhdGVzXHJcbiAgY29uc3Qgd29ya2VyUGFyc2luZ0VuYWJsZWQgPSBzZXR0aW5ncy5maWxlUGFyc2luZ0NvbmZpZz8uZW5hYmxlV29ya2VyUHJvY2Vzc2luZyA9PT0gdHJ1ZTtcclxuICBjb25zdCB3b3JrZXJTb3VyY2VFbmFibGVkID0gc2V0dGluZ3MuZmlsZVNvdXJjZT8ucGVyZm9ybWFuY2U/LmVuYWJsZVdvcmtlclByb2Nlc3NpbmcgPT09IHRydWU7XHJcbiAgXHJcbiAgaWYgKHdvcmtlclBhcnNpbmdFbmFibGVkICE9PSB3b3JrZXJTb3VyY2VFbmFibGVkKSB7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcblxyXG4gIHJldHVybiBmYWxzZTtcclxufSJdfQ==