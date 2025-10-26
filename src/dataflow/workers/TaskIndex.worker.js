/**
 * Web worker for background processing of task indexing
 * Enhanced with configurable task parser
 */
import { __awaiter } from "tslib";
import { parse } from "date-fns/parse";
import { MarkdownTaskParser } from "../core/ConfigurableTaskParser";
import { getConfig } from "../../common/task-parser-config";
import { FileMetadataTaskParser } from "../../parsers/file-metadata-parser";
import { CanvasParser } from "../core/CanvasParser";
import { SupportedFileType } from "@/utils/file/file-type-detector";
/**
 * Enhanced task parsing using configurable parser
 */
function parseTasksWithConfigurableParser(filePath, content, settings, fileMetadata) {
    try {
        // Create a mock plugin object with settings for getConfig
        const mockPlugin = { settings };
        const config = getConfig(settings.preferMetadataFormat, mockPlugin);
        // Debug: show incoming prefixes and effective specialTagPrefixes keys
        try {
            console.debug("[TPB][Worker] incoming prefixes", {
                preferMetadataFormat: settings.preferMetadataFormat,
                projectTagPrefix: settings.projectTagPrefix,
                contextTagPrefix: settings.contextTagPrefix,
                areaTagPrefix: settings.areaTagPrefix,
            });
            console.debug("[TPB][Worker] specialTagPrefixes keys (before)", Object.keys(config.specialTagPrefixes || {}));
        }
        catch (_a) { }
        // Ensure case-insensitive prefixes by duplicating lower-case keys (avoid duplicates)
        if (config.specialTagPrefixes) {
            const lowerDup = {};
            for (const k of Object.keys(config.specialTagPrefixes)) {
                const lowerKey = String(k).toLowerCase();
                // Only add lowercase version if it doesn't already exist and is different from original
                if (lowerKey !== k && !config.specialTagPrefixes[lowerKey]) {
                    lowerDup[lowerKey] = config.specialTagPrefixes[k];
                }
            }
            config.specialTagPrefixes = Object.assign(Object.assign({}, config.specialTagPrefixes), lowerDup);
            try {
                console.debug("[TPB][Worker] specialTagPrefixes keys (after)", Object.keys(config.specialTagPrefixes));
            }
            catch (_b) { }
        }
        // Add project configuration to parser config
        if (settings.projectConfig &&
            settings.projectConfig.enableEnhancedProject) {
            config.projectConfig = settings.projectConfig;
        }
        const parser = new MarkdownTaskParser(config);
        // Raw parsing only - no project enhancement per dataflow architecture
        // Project data will be handled by Augmentor in main thread
        const tasks = parser.parseLegacy(content, filePath, fileMetadata, undefined, // No project config in worker
        undefined // No tgProject in worker
        );
        // Apply heading filters if specified
        return tasks.filter((task) => {
            // Parse comma-separated heading filters and normalize them
            // Remove leading # symbols since task.metadata.heading contains only the text
            const ignoreHeadings = settings.ignoreHeading
                ? settings.ignoreHeading
                    .split(",")
                    .map((h) => {
                    // Trim and remove leading # symbols
                    const trimmed = h.trim();
                    return trimmed.replace(/^#+\s*/, "");
                })
                    .filter((h) => h)
                : [];
            const focusHeadings = settings.focusHeading
                ? settings.focusHeading
                    .split(",")
                    .map((h) => {
                    // Trim and remove leading # symbols
                    const trimmed = h.trim();
                    return trimmed.replace(/^#+\s*/, "");
                })
                    .filter((h) => h)
                : [];
            // Filter by ignore heading
            if (ignoreHeadings.length > 0) {
                // If task has no heading and we have ignore headings, let it pass
                if (!task.metadata.heading) {
                    return true;
                }
                const taskHeadings = Array.isArray(task.metadata.heading)
                    ? task.metadata.heading
                    : [task.metadata.heading];
                // Check if any task heading matches any ignore heading
                if (taskHeadings.some((taskHeading) => ignoreHeadings.some((ignoreHeading) => taskHeading
                    .toLowerCase()
                    .includes(ignoreHeading.toLowerCase())))) {
                    return false;
                }
            }
            // Filter by focus heading
            if (focusHeadings.length > 0) {
                // If task has no heading and we have focus headings, exclude it
                if (!task.metadata.heading) {
                    return false;
                }
                const taskHeadings = Array.isArray(task.metadata.heading)
                    ? task.metadata.heading
                    : [task.metadata.heading];
                // Check if any task heading matches any focus heading
                if (!taskHeadings.some((taskHeading) => focusHeadings.some((focusHeading) => taskHeading
                    .toLowerCase()
                    .includes(focusHeading.toLowerCase())))) {
                    return false;
                }
            }
            return true;
        });
    }
    catch (error) {
        console.warn("Configurable parser failed, falling back to legacy parser:", error);
        // Fallback to legacy parsing if configurable parser fails
        return parseTasksFromContentLegacy(filePath, content, settings.preferMetadataFormat, settings.ignoreHeading, settings.focusHeading);
    }
}
/**
 * Legacy parsing function kept as fallback
 */
function parseTasksFromContentLegacy(filePath, content, format, ignoreHeading, focusHeading) {
    // Basic fallback parsing for critical errors
    const lines = content.split("\n");
    const tasks = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const taskMatch = line.match(/^(\s*[-*+]|\d+\.)\s*\[(.)\]\s*(.*)$/);
        if (taskMatch) {
            const [, , status, taskContent] = taskMatch;
            const completed = status.toLowerCase() === "x";
            tasks.push({
                id: `${filePath}-L${i}`,
                content: taskContent.trim(),
                filePath,
                line: i,
                completed,
                status,
                originalMarkdown: line,
                metadata: {
                    tags: [],
                    children: [],
                    heading: [],
                },
            });
        }
    }
    return tasks;
}
/**
 * Extract date from file path
 */
function extractDateFromPath(filePath, settings) {
    if (!settings.useDailyNotePathAsDate)
        return undefined;
    // Remove file extension first
    let pathToMatch = filePath.replace(/\.[^/.]+$/, "");
    // If dailyNotePath is specified, remove it from the path
    if (settings.dailyNotePath &&
        pathToMatch.startsWith(settings.dailyNotePath)) {
        pathToMatch = pathToMatch.substring(settings.dailyNotePath.length);
        // Remove leading slash if present
        if (pathToMatch.startsWith("/")) {
            pathToMatch = pathToMatch.substring(1);
        }
    }
    // Try to match with the current path
    let dateFromPath = parse(pathToMatch, settings.dailyNoteFormat, new Date());
    // If no match, recursively try with subpaths
    if (isNaN(dateFromPath.getTime()) && pathToMatch.includes("/")) {
        return extractDateFromPath(pathToMatch.substring(pathToMatch.indexOf("/") + 1), Object.assign(Object.assign({}, settings), { dailyNotePath: "" }));
    }
    // Return the timestamp if we found a valid date
    if (!isNaN(dateFromPath.getTime())) {
        return dateFromPath.getTime();
    }
    return undefined;
}
/**
 * Process a single file using the appropriate parser based on file type
 */
function processFile(filePath, content, fileExtension, stats, settings, metadata) {
    var _a, _b, _c, _d;
    const startTime = performance.now();
    try {
        // Extract frontmatter metadata if available
        let fileMetadata;
        if ((_a = metadata === null || metadata === void 0 ? void 0 : metadata.fileCache) === null || _a === void 0 ? void 0 : _a.frontmatter) {
            fileMetadata = metadata.fileCache.frontmatter;
        }
        // Use the appropriate parser based on file type
        let tasks = [];
        if (fileExtension === SupportedFileType.CANVAS) {
            // Use canvas parser for .canvas files
            const mockPlugin = { settings };
            const canvasParser = new CanvasParser(getConfig(settings.preferMetadataFormat, mockPlugin));
            tasks = canvasParser.parseCanvasFile(content, filePath);
        }
        else if (fileExtension === SupportedFileType.MARKDOWN) {
            // Use configurable parser for .md files
            tasks = parseTasksWithConfigurableParser(filePath, content, settings, fileMetadata);
        }
        else {
            // Unsupported file type
            console.warn(`Worker: Unsupported file type: ${fileExtension} for file: ${filePath}`);
            tasks = [];
        }
        // Add file metadata tasks if file parsing is enabled and file type supports it
        // Only apply file metadata parsing to Markdown files, not Canvas files
        // Also check if fileMetadataInheritance is enabled for task metadata inheritance
        if (fileExtension === SupportedFileType.MARKDOWN &&
            settings.fileParsingConfig &&
            (settings.fileParsingConfig.enableFileMetadataParsing ||
                settings.fileParsingConfig.enableTagBasedTaskParsing ||
                ((_b = settings.fileMetadataInheritance) === null || _b === void 0 ? void 0 : _b.enabled))) {
            try {
                const fileMetadataParser = new FileMetadataTaskParser(settings.fileParsingConfig, (_d = (_c = settings.projectConfig) === null || _c === void 0 ? void 0 : _c.metadataConfig) === null || _d === void 0 ? void 0 : _d.detectionMethods);
                const fileMetadataResult = fileMetadataParser.parseFileForTasks(filePath, content, metadata === null || metadata === void 0 ? void 0 : metadata.fileCache);
                // Add file metadata tasks to the result
                tasks.push(...fileMetadataResult.tasks);
                // Log any errors from file metadata parsing
                if (fileMetadataResult.errors.length > 0) {
                    console.warn(`Worker: File metadata parsing errors for ${filePath}:`, fileMetadataResult.errors);
                }
            }
            catch (error) {
                console.error(`Worker: Error in file metadata parsing for ${filePath}:`, error);
            }
        }
        const completedTasks = tasks.filter((t) => t.completed).length;
        // Apply daily note date extraction if configured
        try {
            if ((filePath.startsWith(settings.dailyNotePath) ||
                ("/" + filePath).startsWith(settings.dailyNotePath)) &&
                settings.dailyNotePath &&
                settings.useDailyNotePathAsDate) {
                for (const task of tasks) {
                    const dateFromPath = extractDateFromPath(filePath, {
                        useDailyNotePathAsDate: settings.useDailyNotePathAsDate,
                        dailyNoteFormat: settings.dailyNoteFormat
                            .replace(/Y/g, "y")
                            .replace(/D/g, "d"),
                        dailyNotePath: settings.dailyNotePath,
                    });
                    if (dateFromPath) {
                        if (settings.useAsDateType === "due" &&
                            !task.metadata.dueDate) {
                            task.metadata.dueDate = dateFromPath;
                        }
                        else if (settings.useAsDateType === "start" &&
                            !task.metadata.startDate) {
                            task.metadata.startDate = dateFromPath;
                        }
                        else if (settings.useAsDateType === "scheduled" &&
                            !task.metadata.scheduledDate) {
                            task.metadata.scheduledDate = dateFromPath;
                        }
                        task.metadata.useAsDateType = settings.useAsDateType;
                    }
                }
            }
        }
        catch (error) {
            console.error(`Worker: Error processing file ${filePath}:`, error);
        }
        return {
            type: "parseResult",
            filePath,
            tasks,
            stats: {
                totalTasks: tasks.length,
                completedTasks,
                processingTimeMs: Math.round(performance.now() - startTime),
            },
        };
    }
    catch (error) {
        console.error(`Worker: Error processing file ${filePath}:`, error);
        throw error;
    }
}
/**
 * Process a batch of files
 */
function processBatch(files, settings) {
    const startTime = performance.now();
    const results = [];
    let totalTasks = 0;
    let failedFiles = 0;
    for (const file of files) {
        try {
            const parseResult = processFile(file.path, file.content, file.extension, file.stats, settings, file.metadata);
            totalTasks += parseResult.stats.totalTasks;
            results.push({
                filePath: parseResult.filePath,
                taskCount: parseResult.stats.totalTasks,
            });
        }
        catch (error) {
            console.error(`Worker: Error in batch processing for file ${file.path}:`, error);
            failedFiles++;
        }
    }
    return {
        type: "batchResult",
        results,
        stats: {
            totalFiles: files.length,
            totalTasks,
            processingTimeMs: Math.round(performance.now() - startTime),
        },
    };
}
/**
 * Worker message handler
 */
self.onmessage = (event) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const message = event.data;
        // Provide default settings if missing
        const settings = message.settings || {
            preferMetadataFormat: "tasks",
            useDailyNotePathAsDate: false,
            dailyNoteFormat: "yyyy-MM-dd",
            useAsDateType: "due",
            dailyNotePath: "",
            ignoreHeading: "",
            focusHeading: "",
            projectConfig: undefined,
            fileParsingConfig: undefined,
        };
        if (message.type === "parseTasks") {
            try {
                const result = processFile(message.filePath, message.content, message.fileExtension, message.stats, settings, message.metadata);
                self.postMessage(result);
            }
            catch (error) {
                self.postMessage({
                    type: "error",
                    error: error instanceof Error ? error.message : String(error),
                    filePath: message.filePath,
                });
            }
        }
        else if (message.type === "batchIndex") {
            const result = processBatch(message.files, settings);
            self.postMessage(result);
        }
        else {
            console.error("Worker: Unknown or invalid command message:", message);
            self.postMessage({
                type: "error",
                error: `Unknown command type: ${message.type}`,
            });
        }
    }
    catch (error) {
        console.error("Worker: General error in onmessage handler:", error);
        self.postMessage({
            type: "error",
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGFza0luZGV4Lndvcmtlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlRhc2tJbmRleC53b3JrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztHQUdHOztBQVdILE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUN2QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDNUQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ3BELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRXBFOztHQUVHO0FBQ0gsU0FBUyxnQ0FBZ0MsQ0FDeEMsUUFBZ0IsRUFDaEIsT0FBZSxFQUNmLFFBQTRCLEVBQzVCLFlBQWtDO0lBRWxDLElBQUk7UUFDSCwwREFBMEQ7UUFDMUQsTUFBTSxVQUFVLEdBQUcsRUFBRSxRQUFRLEVBQUUsQ0FBQztRQUNoQyxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRXBFLHNFQUFzRTtRQUN0RSxJQUFJO1lBQ0gsT0FBTyxDQUFDLEtBQUssQ0FBQyxpQ0FBaUMsRUFBRTtnQkFDaEQsb0JBQW9CLEVBQUUsUUFBUSxDQUFDLG9CQUFvQjtnQkFDbkQsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLGdCQUFnQjtnQkFDM0MsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLGdCQUFnQjtnQkFDM0MsYUFBYSxFQUFFLFFBQVEsQ0FBQyxhQUFhO2FBQ3JDLENBQUMsQ0FBQztZQUNILE9BQU8sQ0FBQyxLQUFLLENBQ1osZ0RBQWdELEVBQ2hELE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGtCQUFrQixJQUFJLEVBQUUs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QUFDO2dCQUNoQixJQUFJLEVBQUUsT0FBTztnQkFDYixLQUFLLEVBQUUseUJBQTBCLE9BQWUsQ0FBQyxJQUFJLEVBQUU7YUFDeEMsQ0FBQyxDQUFDO1NBQ2xCO0tBQ0Q7SUFBQyxPQUFPLEtBQUssRUFBRTtRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsNkNBQTZDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDcEUsSUFBSSxDQUFDLFdBQVcsQ0FBQztZQUNoQixJQUFJLEVBQUUsT0FBTztZQUNiLEtBQUssRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO1NBQzlDLENBQUMsQ0FBQztLQUNsQjtBQUNGLENBQUMsQ0FBQSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFdlYiB3b3JrZXIgZm9yIGJhY2tncm91bmQgcHJvY2Vzc2luZyBvZiB0YXNrIGluZGV4aW5nXHJcbiAqIEVuaGFuY2VkIHdpdGggY29uZmlndXJhYmxlIHRhc2sgcGFyc2VyXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgRmlsZVN0YXRzIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFRhc2ssIFRnUHJvamVjdCB9IGZyb20gXCIuLi8uLi90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7XHJcblx0SW5kZXhlckNvbW1hbmQsXHJcblx0VGFza1BhcnNlUmVzdWx0LFxyXG5cdEVycm9yUmVzdWx0LFxyXG5cdEJhdGNoSW5kZXhSZXN1bHQsXHJcblx0VGFza1dvcmtlclNldHRpbmdzLFxyXG59IGZyb20gXCIuL3Rhc2staW5kZXgtbWVzc2FnZVwiO1xyXG5pbXBvcnQgeyBwYXJzZSB9IGZyb20gXCJkYXRlLWZucy9wYXJzZVwiO1xyXG5pbXBvcnQgeyBNYXJrZG93blRhc2tQYXJzZXIgfSBmcm9tIFwiLi4vY29yZS9Db25maWd1cmFibGVUYXNrUGFyc2VyXCI7XHJcbmltcG9ydCB7IGdldENvbmZpZyB9IGZyb20gXCIuLi8uLi9jb21tb24vdGFzay1wYXJzZXItY29uZmlnXCI7XHJcbmltcG9ydCB7IEZpbGVNZXRhZGF0YVRhc2tQYXJzZXIgfSBmcm9tIFwiLi4vLi4vcGFyc2Vycy9maWxlLW1ldGFkYXRhLXBhcnNlclwiO1xyXG5pbXBvcnQgeyBDYW52YXNQYXJzZXIgfSBmcm9tIFwiLi4vY29yZS9DYW52YXNQYXJzZXJcIjtcclxuaW1wb3J0IHsgU3VwcG9ydGVkRmlsZVR5cGUgfSBmcm9tIFwiQC91dGlscy9maWxlL2ZpbGUtdHlwZS1kZXRlY3RvclwiO1xyXG5cclxuLyoqXHJcbiAqIEVuaGFuY2VkIHRhc2sgcGFyc2luZyB1c2luZyBjb25maWd1cmFibGUgcGFyc2VyXHJcbiAqL1xyXG5mdW5jdGlvbiBwYXJzZVRhc2tzV2l0aENvbmZpZ3VyYWJsZVBhcnNlcihcclxuXHRmaWxlUGF0aDogc3RyaW5nLFxyXG5cdGNvbnRlbnQ6IHN0cmluZyxcclxuXHRzZXR0aW5nczogVGFza1dvcmtlclNldHRpbmdzLFxyXG5cdGZpbGVNZXRhZGF0YT86IFJlY29yZDxzdHJpbmcsIGFueT5cclxuKTogVGFza1tdIHtcclxuXHR0cnkge1xyXG5cdFx0Ly8gQ3JlYXRlIGEgbW9jayBwbHVnaW4gb2JqZWN0IHdpdGggc2V0dGluZ3MgZm9yIGdldENvbmZpZ1xyXG5cdFx0Y29uc3QgbW9ja1BsdWdpbiA9IHsgc2V0dGluZ3MgfTtcclxuXHRcdGNvbnN0IGNvbmZpZyA9IGdldENvbmZpZyhzZXR0aW5ncy5wcmVmZXJNZXRhZGF0YUZvcm1hdCwgbW9ja1BsdWdpbik7XHJcblxyXG5cdFx0Ly8gRGVidWc6IHNob3cgaW5jb21pbmcgcHJlZml4ZXMgYW5kIGVmZmVjdGl2ZSBzcGVjaWFsVGFnUHJlZml4ZXMga2V5c1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc29sZS5kZWJ1ZyhcIltUUEJdW1dvcmtlcl0gaW5jb21pbmcgcHJlZml4ZXNcIiwge1xyXG5cdFx0XHRcdHByZWZlck1ldGFkYXRhRm9ybWF0OiBzZXR0aW5ncy5wcmVmZXJNZXRhZGF0YUZvcm1hdCxcclxuXHRcdFx0XHRwcm9qZWN0VGFnUHJlZml4OiBzZXR0aW5ncy5wcm9qZWN0VGFnUHJlZml4LFxyXG5cdFx0XHRcdGNvbnRleHRUYWdQcmVmaXg6IHNldHRpbmdzLmNvbnRleHRUYWdQcmVmaXgsXHJcblx0XHRcdFx0YXJlYVRhZ1ByZWZpeDogc2V0dGluZ3MuYXJlYVRhZ1ByZWZpeCxcclxuXHRcdFx0fSk7XHJcblx0XHRcdGNvbnNvbGUuZGVidWcoXHJcblx0XHRcdFx0XCJbVFBCXVtXb3JrZXJdIHNwZWNpYWxUYWdQcmVmaXhlcyBrZXlzIChiZWZvcmUpXCIsXHJcblx0XHRcdFx0T2JqZWN0LmtleXMoY29uZmlnLnNwZWNpYWxUYWdQcmVmaXhlcyB8fCB7fSlcclxuXHRcdFx0KTtcclxuXHRcdH0gY2F0Y2gge31cclxuXHJcblx0XHQvLyBFbnN1cmUgY2FzZS1pbnNlbnNpdGl2ZSBwcmVmaXhlcyBieSBkdXBsaWNhdGluZyBsb3dlci1jYXNlIGtleXMgKGF2b2lkIGR1cGxpY2F0ZXMpXHJcblx0XHRpZiAoY29uZmlnLnNwZWNpYWxUYWdQcmVmaXhlcykge1xyXG5cdFx0XHRjb25zdCBsb3dlckR1cDogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xyXG5cdFx0XHRmb3IgKGNvbnN0IGsgb2YgT2JqZWN0LmtleXMoY29uZmlnLnNwZWNpYWxUYWdQcmVmaXhlcykpIHtcclxuXHRcdFx0XHRjb25zdCBsb3dlcktleSA9IFN0cmluZyhrKS50b0xvd2VyQ2FzZSgpO1xyXG5cdFx0XHRcdC8vIE9ubHkgYWRkIGxvd2VyY2FzZSB2ZXJzaW9uIGlmIGl0IGRvZXNuJ3QgYWxyZWFkeSBleGlzdCBhbmQgaXMgZGlmZmVyZW50IGZyb20gb3JpZ2luYWxcclxuXHRcdFx0XHRpZiAobG93ZXJLZXkgIT09IGsgJiYgIWNvbmZpZy5zcGVjaWFsVGFnUHJlZml4ZXNbbG93ZXJLZXldKSB7XHJcblx0XHRcdFx0XHRsb3dlckR1cFtsb3dlcktleV0gPSBjb25maWcuc3BlY2lhbFRhZ1ByZWZpeGVzW2tdO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRjb25maWcuc3BlY2lhbFRhZ1ByZWZpeGVzID0ge1xyXG5cdFx0XHRcdC4uLmNvbmZpZy5zcGVjaWFsVGFnUHJlZml4ZXMsXHJcblx0XHRcdFx0Li4ubG93ZXJEdXAsXHJcblx0XHRcdH07XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Y29uc29sZS5kZWJ1ZyhcclxuXHRcdFx0XHRcdFwiW1RQQl1bV29ya2VyXSBzcGVjaWFsVGFnUHJlZml4ZXMga2V5cyAoYWZ0ZXIpXCIsXHJcblx0XHRcdFx0XHRPYmplY3Qua2V5cyhjb25maWcuc3BlY2lhbFRhZ1ByZWZpeGVzKVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0gY2F0Y2gge31cclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGQgcHJvamVjdCBjb25maWd1cmF0aW9uIHRvIHBhcnNlciBjb25maWdcclxuXHRcdGlmIChcclxuXHRcdFx0c2V0dGluZ3MucHJvamVjdENvbmZpZyAmJlxyXG5cdFx0XHRzZXR0aW5ncy5wcm9qZWN0Q29uZmlnLmVuYWJsZUVuaGFuY2VkUHJvamVjdFxyXG5cdFx0KSB7XHJcblx0XHRcdGNvbmZpZy5wcm9qZWN0Q29uZmlnID0gc2V0dGluZ3MucHJvamVjdENvbmZpZztcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBwYXJzZXIgPSBuZXcgTWFya2Rvd25UYXNrUGFyc2VyKGNvbmZpZyk7XHJcblxyXG5cdFx0Ly8gUmF3IHBhcnNpbmcgb25seSAtIG5vIHByb2plY3QgZW5oYW5jZW1lbnQgcGVyIGRhdGFmbG93IGFyY2hpdGVjdHVyZVxyXG5cdFx0Ly8gUHJvamVjdCBkYXRhIHdpbGwgYmUgaGFuZGxlZCBieSBBdWdtZW50b3IgaW4gbWFpbiB0aHJlYWRcclxuXHJcblx0XHRjb25zdCB0YXNrcyA9IHBhcnNlci5wYXJzZUxlZ2FjeShcclxuXHRcdFx0Y29udGVudCxcclxuXHRcdFx0ZmlsZVBhdGgsXHJcblx0XHRcdGZpbGVNZXRhZGF0YSxcclxuXHRcdFx0dW5kZWZpbmVkLCAvLyBObyBwcm9qZWN0IGNvbmZpZyBpbiB3b3JrZXJcclxuXHRcdFx0dW5kZWZpbmVkIC8vIE5vIHRnUHJvamVjdCBpbiB3b3JrZXJcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gQXBwbHkgaGVhZGluZyBmaWx0ZXJzIGlmIHNwZWNpZmllZFxyXG5cdFx0cmV0dXJuIHRhc2tzLmZpbHRlcigodGFzaykgPT4ge1xyXG5cdFx0XHQvLyBQYXJzZSBjb21tYS1zZXBhcmF0ZWQgaGVhZGluZyBmaWx0ZXJzIGFuZCBub3JtYWxpemUgdGhlbVxyXG5cdFx0XHQvLyBSZW1vdmUgbGVhZGluZyAjIHN5bWJvbHMgc2luY2UgdGFzay5tZXRhZGF0YS5oZWFkaW5nIGNvbnRhaW5zIG9ubHkgdGhlIHRleHRcclxuXHRcdFx0Y29uc3QgaWdub3JlSGVhZGluZ3MgPSBzZXR0aW5ncy5pZ25vcmVIZWFkaW5nXHJcblx0XHRcdFx0PyBzZXR0aW5ncy5pZ25vcmVIZWFkaW5nXHJcblx0XHRcdFx0XHRcdC5zcGxpdChcIixcIilcclxuXHRcdFx0XHRcdFx0Lm1hcCgoaCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdC8vIFRyaW0gYW5kIHJlbW92ZSBsZWFkaW5nICMgc3ltYm9sc1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHRyaW1tZWQgPSBoLnRyaW0oKTtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJpbW1lZC5yZXBsYWNlKC9eIytcXHMqLywgXCJcIik7XHJcblx0XHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0XHRcdC5maWx0ZXIoKGgpID0+IGgpXHJcblx0XHRcdFx0OiBbXTtcclxuXHJcblx0XHRcdGNvbnN0IGZvY3VzSGVhZGluZ3MgPSBzZXR0aW5ncy5mb2N1c0hlYWRpbmdcclxuXHRcdFx0XHQ/IHNldHRpbmdzLmZvY3VzSGVhZGluZ1xyXG5cdFx0XHRcdFx0XHQuc3BsaXQoXCIsXCIpXHJcblx0XHRcdFx0XHRcdC5tYXAoKGgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHQvLyBUcmltIGFuZCByZW1vdmUgbGVhZGluZyAjIHN5bWJvbHNcclxuXHRcdFx0XHRcdFx0XHRjb25zdCB0cmltbWVkID0gaC50cmltKCk7XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRyaW1tZWQucmVwbGFjZSgvXiMrXFxzKi8sIFwiXCIpO1xyXG5cdFx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdFx0XHQuZmlsdGVyKChoKSA9PiBoKVxyXG5cdFx0XHRcdDogW107XHJcblxyXG5cdFx0XHQvLyBGaWx0ZXIgYnkgaWdub3JlIGhlYWRpbmdcclxuXHRcdFx0aWYgKGlnbm9yZUhlYWRpbmdzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHQvLyBJZiB0YXNrIGhhcyBubyBoZWFkaW5nIGFuZCB3ZSBoYXZlIGlnbm9yZSBoZWFkaW5ncywgbGV0IGl0IHBhc3NcclxuXHRcdFx0XHRpZiAoIXRhc2subWV0YWRhdGEuaGVhZGluZykge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRjb25zdCB0YXNrSGVhZGluZ3MgPSBBcnJheS5pc0FycmF5KHRhc2subWV0YWRhdGEuaGVhZGluZylcclxuXHRcdFx0XHRcdD8gdGFzay5tZXRhZGF0YS5oZWFkaW5nXHJcblx0XHRcdFx0XHQ6IFt0YXNrLm1ldGFkYXRhLmhlYWRpbmddO1xyXG5cclxuXHRcdFx0XHQvLyBDaGVjayBpZiBhbnkgdGFzayBoZWFkaW5nIG1hdGNoZXMgYW55IGlnbm9yZSBoZWFkaW5nXHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0dGFza0hlYWRpbmdzLnNvbWUoKHRhc2tIZWFkaW5nKSA9PlxyXG5cdFx0XHRcdFx0XHRpZ25vcmVIZWFkaW5ncy5zb21lKChpZ25vcmVIZWFkaW5nKSA9PlxyXG5cdFx0XHRcdFx0XHRcdHRhc2tIZWFkaW5nXHJcblx0XHRcdFx0XHRcdFx0XHQudG9Mb3dlckNhc2UoKVxyXG5cdFx0XHRcdFx0XHRcdFx0LmluY2x1ZGVzKGlnbm9yZUhlYWRpbmcudG9Mb3dlckNhc2UoKSlcclxuXHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gRmlsdGVyIGJ5IGZvY3VzIGhlYWRpbmdcclxuXHRcdFx0aWYgKGZvY3VzSGVhZGluZ3MubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdC8vIElmIHRhc2sgaGFzIG5vIGhlYWRpbmcgYW5kIHdlIGhhdmUgZm9jdXMgaGVhZGluZ3MsIGV4Y2x1ZGUgaXRcclxuXHRcdFx0XHRpZiAoIXRhc2subWV0YWRhdGEuaGVhZGluZykge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Y29uc3QgdGFza0hlYWRpbmdzID0gQXJyYXkuaXNBcnJheSh0YXNrLm1ldGFkYXRhLmhlYWRpbmcpXHJcblx0XHRcdFx0XHQ/IHRhc2subWV0YWRhdGEuaGVhZGluZ1xyXG5cdFx0XHRcdFx0OiBbdGFzay5tZXRhZGF0YS5oZWFkaW5nXTtcclxuXHJcblx0XHRcdFx0Ly8gQ2hlY2sgaWYgYW55IHRhc2sgaGVhZGluZyBtYXRjaGVzIGFueSBmb2N1cyBoZWFkaW5nXHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0IXRhc2tIZWFkaW5ncy5zb21lKCh0YXNrSGVhZGluZykgPT5cclxuXHRcdFx0XHRcdFx0Zm9jdXNIZWFkaW5ncy5zb21lKChmb2N1c0hlYWRpbmcpID0+XHJcblx0XHRcdFx0XHRcdFx0dGFza0hlYWRpbmdcclxuXHRcdFx0XHRcdFx0XHRcdC50b0xvd2VyQ2FzZSgpXHJcblx0XHRcdFx0XHRcdFx0XHQuaW5jbHVkZXMoZm9jdXNIZWFkaW5nLnRvTG93ZXJDYXNlKCkpXHJcblx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fSk7XHJcblx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XCJDb25maWd1cmFibGUgcGFyc2VyIGZhaWxlZCwgZmFsbGluZyBiYWNrIHRvIGxlZ2FjeSBwYXJzZXI6XCIsXHJcblx0XHRcdGVycm9yXHJcblx0XHQpO1xyXG5cdFx0Ly8gRmFsbGJhY2sgdG8gbGVnYWN5IHBhcnNpbmcgaWYgY29uZmlndXJhYmxlIHBhcnNlciBmYWlsc1xyXG5cdFx0cmV0dXJuIHBhcnNlVGFza3NGcm9tQ29udGVudExlZ2FjeShcclxuXHRcdFx0ZmlsZVBhdGgsXHJcblx0XHRcdGNvbnRlbnQsXHJcblx0XHRcdHNldHRpbmdzLnByZWZlck1ldGFkYXRhRm9ybWF0LFxyXG5cdFx0XHRzZXR0aW5ncy5pZ25vcmVIZWFkaW5nLFxyXG5cdFx0XHRzZXR0aW5ncy5mb2N1c0hlYWRpbmdcclxuXHRcdCk7XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICogTGVnYWN5IHBhcnNpbmcgZnVuY3Rpb24ga2VwdCBhcyBmYWxsYmFja1xyXG4gKi9cclxuZnVuY3Rpb24gcGFyc2VUYXNrc0Zyb21Db250ZW50TGVnYWN5KFxyXG5cdGZpbGVQYXRoOiBzdHJpbmcsXHJcblx0Y29udGVudDogc3RyaW5nLFxyXG5cdGZvcm1hdDogXCJ0YXNrc1wiIHwgXCJkYXRhdmlld1wiLFxyXG5cdGlnbm9yZUhlYWRpbmc6IHN0cmluZyxcclxuXHRmb2N1c0hlYWRpbmc6IHN0cmluZ1xyXG4pOiBUYXNrW10ge1xyXG5cdC8vIEJhc2ljIGZhbGxiYWNrIHBhcnNpbmcgZm9yIGNyaXRpY2FsIGVycm9yc1xyXG5cdGNvbnN0IGxpbmVzID0gY29udGVudC5zcGxpdChcIlxcblwiKTtcclxuXHRjb25zdCB0YXNrczogVGFza1tdID0gW107XHJcblxyXG5cdGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdGNvbnN0IGxpbmUgPSBsaW5lc1tpXTtcclxuXHRcdGNvbnN0IHRhc2tNYXRjaCA9IGxpbmUubWF0Y2goL14oXFxzKlstKitdfFxcZCtcXC4pXFxzKlxcWyguKVxcXVxccyooLiopJC8pO1xyXG5cclxuXHRcdGlmICh0YXNrTWF0Y2gpIHtcclxuXHRcdFx0Y29uc3QgWywgLCBzdGF0dXMsIHRhc2tDb250ZW50XSA9IHRhc2tNYXRjaDtcclxuXHRcdFx0Y29uc3QgY29tcGxldGVkID0gc3RhdHVzLnRvTG93ZXJDYXNlKCkgPT09IFwieFwiO1xyXG5cclxuXHRcdFx0dGFza3MucHVzaCh7XHJcblx0XHRcdFx0aWQ6IGAke2ZpbGVQYXRofS1MJHtpfWAsXHJcblx0XHRcdFx0Y29udGVudDogdGFza0NvbnRlbnQudHJpbSgpLFxyXG5cdFx0XHRcdGZpbGVQYXRoLFxyXG5cdFx0XHRcdGxpbmU6IGksXHJcblx0XHRcdFx0Y29tcGxldGVkLFxyXG5cdFx0XHRcdHN0YXR1cyxcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBsaW5lLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdGhlYWRpbmc6IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIHRhc2tzO1xyXG59XHJcblxyXG4vKipcclxuICogRXh0cmFjdCBkYXRlIGZyb20gZmlsZSBwYXRoXHJcbiAqL1xyXG5mdW5jdGlvbiBleHRyYWN0RGF0ZUZyb21QYXRoKFxyXG5cdGZpbGVQYXRoOiBzdHJpbmcsXHJcblx0c2V0dGluZ3M6IHtcclxuXHRcdHVzZURhaWx5Tm90ZVBhdGhBc0RhdGU6IGJvb2xlYW47XHJcblx0XHRkYWlseU5vdGVGb3JtYXQ6IHN0cmluZztcclxuXHRcdGRhaWx5Tm90ZVBhdGg6IHN0cmluZztcclxuXHR9XHJcbik6IG51bWJlciB8IHVuZGVmaW5lZCB7XHJcblx0aWYgKCFzZXR0aW5ncy51c2VEYWlseU5vdGVQYXRoQXNEYXRlKSByZXR1cm4gdW5kZWZpbmVkO1xyXG5cclxuXHQvLyBSZW1vdmUgZmlsZSBleHRlbnNpb24gZmlyc3RcclxuXHRsZXQgcGF0aFRvTWF0Y2ggPSBmaWxlUGF0aC5yZXBsYWNlKC9cXC5bXi8uXSskLywgXCJcIik7XHJcblxyXG5cdC8vIElmIGRhaWx5Tm90ZVBhdGggaXMgc3BlY2lmaWVkLCByZW1vdmUgaXQgZnJvbSB0aGUgcGF0aFxyXG5cdGlmIChcclxuXHRcdHNldHRpbmdzLmRhaWx5Tm90ZVBhdGggJiZcclxuXHRcdHBhdGhUb01hdGNoLnN0YXJ0c1dpdGgoc2V0dGluZ3MuZGFpbHlOb3RlUGF0aClcclxuXHQpIHtcclxuXHRcdHBhdGhUb01hdGNoID0gcGF0aFRvTWF0Y2guc3Vic3RyaW5nKHNldHRpbmdzLmRhaWx5Tm90ZVBhdGgubGVuZ3RoKTtcclxuXHRcdC8vIFJlbW92ZSBsZWFkaW5nIHNsYXNoIGlmIHByZXNlbnRcclxuXHRcdGlmIChwYXRoVG9NYXRjaC5zdGFydHNXaXRoKFwiL1wiKSkge1xyXG5cdFx0XHRwYXRoVG9NYXRjaCA9IHBhdGhUb01hdGNoLnN1YnN0cmluZygxKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIFRyeSB0byBtYXRjaCB3aXRoIHRoZSBjdXJyZW50IHBhdGhcclxuXHRsZXQgZGF0ZUZyb21QYXRoID0gcGFyc2UocGF0aFRvTWF0Y2gsIHNldHRpbmdzLmRhaWx5Tm90ZUZvcm1hdCwgbmV3IERhdGUoKSk7XHJcblxyXG5cdC8vIElmIG5vIG1hdGNoLCByZWN1cnNpdmVseSB0cnkgd2l0aCBzdWJwYXRoc1xyXG5cdGlmIChpc05hTihkYXRlRnJvbVBhdGguZ2V0VGltZSgpKSAmJiBwYXRoVG9NYXRjaC5pbmNsdWRlcyhcIi9cIikpIHtcclxuXHRcdHJldHVybiBleHRyYWN0RGF0ZUZyb21QYXRoKFxyXG5cdFx0XHRwYXRoVG9NYXRjaC5zdWJzdHJpbmcocGF0aFRvTWF0Y2guaW5kZXhPZihcIi9cIikgKyAxKSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdC4uLnNldHRpbmdzLFxyXG5cdFx0XHRcdGRhaWx5Tm90ZVBhdGg6IFwiXCIsIC8vIENsZWFyIGRhaWx5Tm90ZVBhdGggZm9yIHJlY3Vyc2l2ZSBjYWxsc1xyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0Ly8gUmV0dXJuIHRoZSB0aW1lc3RhbXAgaWYgd2UgZm91bmQgYSB2YWxpZCBkYXRlXHJcblx0aWYgKCFpc05hTihkYXRlRnJvbVBhdGguZ2V0VGltZSgpKSkge1xyXG5cdFx0cmV0dXJuIGRhdGVGcm9tUGF0aC5nZXRUaW1lKCk7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gdW5kZWZpbmVkO1xyXG59XHJcblxyXG4vKipcclxuICogUHJvY2VzcyBhIHNpbmdsZSBmaWxlIHVzaW5nIHRoZSBhcHByb3ByaWF0ZSBwYXJzZXIgYmFzZWQgb24gZmlsZSB0eXBlXHJcbiAqL1xyXG5mdW5jdGlvbiBwcm9jZXNzRmlsZShcclxuXHRmaWxlUGF0aDogc3RyaW5nLFxyXG5cdGNvbnRlbnQ6IHN0cmluZyxcclxuXHRmaWxlRXh0ZW5zaW9uOiBzdHJpbmcsXHJcblx0c3RhdHM6IEZpbGVTdGF0cyxcclxuXHRzZXR0aW5nczogVGFza1dvcmtlclNldHRpbmdzLFxyXG5cdG1ldGFkYXRhPzogeyBmaWxlQ2FjaGU/OiBhbnkgfVxyXG4pOiBUYXNrUGFyc2VSZXN1bHQge1xyXG5cdGNvbnN0IHN0YXJ0VGltZSA9IHBlcmZvcm1hbmNlLm5vdygpO1xyXG5cdHRyeSB7XHJcblx0XHQvLyBFeHRyYWN0IGZyb250bWF0dGVyIG1ldGFkYXRhIGlmIGF2YWlsYWJsZVxyXG5cdFx0bGV0IGZpbGVNZXRhZGF0YTogUmVjb3JkPHN0cmluZywgYW55PiB8IHVuZGVmaW5lZDtcclxuXHRcdGlmIChtZXRhZGF0YT8uZmlsZUNhY2hlPy5mcm9udG1hdHRlcikge1xyXG5cdFx0XHRmaWxlTWV0YWRhdGEgPSBtZXRhZGF0YS5maWxlQ2FjaGUuZnJvbnRtYXR0ZXI7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVXNlIHRoZSBhcHByb3ByaWF0ZSBwYXJzZXIgYmFzZWQgb24gZmlsZSB0eXBlXHJcblx0XHRsZXQgdGFza3M6IFRhc2tbXSA9IFtdO1xyXG5cclxuXHRcdGlmIChmaWxlRXh0ZW5zaW9uID09PSBTdXBwb3J0ZWRGaWxlVHlwZS5DQU5WQVMpIHtcclxuXHRcdFx0Ly8gVXNlIGNhbnZhcyBwYXJzZXIgZm9yIC5jYW52YXMgZmlsZXNcclxuXHRcdFx0Y29uc3QgbW9ja1BsdWdpbiA9IHsgc2V0dGluZ3MgfTtcclxuXHRcdFx0Y29uc3QgY2FudmFzUGFyc2VyID0gbmV3IENhbnZhc1BhcnNlcihcclxuXHRcdFx0XHRnZXRDb25maWcoc2V0dGluZ3MucHJlZmVyTWV0YWRhdGFGb3JtYXQsIG1vY2tQbHVnaW4pXHJcblx0XHRcdCk7XHJcblx0XHRcdHRhc2tzID0gY2FudmFzUGFyc2VyLnBhcnNlQ2FudmFzRmlsZShjb250ZW50LCBmaWxlUGF0aCk7XHJcblx0XHR9IGVsc2UgaWYgKGZpbGVFeHRlbnNpb24gPT09IFN1cHBvcnRlZEZpbGVUeXBlLk1BUktET1dOKSB7XHJcblx0XHRcdC8vIFVzZSBjb25maWd1cmFibGUgcGFyc2VyIGZvciAubWQgZmlsZXNcclxuXHRcdFx0dGFza3MgPSBwYXJzZVRhc2tzV2l0aENvbmZpZ3VyYWJsZVBhcnNlcihcclxuXHRcdFx0XHRmaWxlUGF0aCxcclxuXHRcdFx0XHRjb250ZW50LFxyXG5cdFx0XHRcdHNldHRpbmdzLFxyXG5cdFx0XHRcdGZpbGVNZXRhZGF0YVxyXG5cdFx0XHQpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gVW5zdXBwb3J0ZWQgZmlsZSB0eXBlXHJcblx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRgV29ya2VyOiBVbnN1cHBvcnRlZCBmaWxlIHR5cGU6ICR7ZmlsZUV4dGVuc2lvbn0gZm9yIGZpbGU6ICR7ZmlsZVBhdGh9YFxyXG5cdFx0XHQpO1xyXG5cdFx0XHR0YXNrcyA9IFtdO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFkZCBmaWxlIG1ldGFkYXRhIHRhc2tzIGlmIGZpbGUgcGFyc2luZyBpcyBlbmFibGVkIGFuZCBmaWxlIHR5cGUgc3VwcG9ydHMgaXRcclxuXHRcdC8vIE9ubHkgYXBwbHkgZmlsZSBtZXRhZGF0YSBwYXJzaW5nIHRvIE1hcmtkb3duIGZpbGVzLCBub3QgQ2FudmFzIGZpbGVzXHJcblx0XHQvLyBBbHNvIGNoZWNrIGlmIGZpbGVNZXRhZGF0YUluaGVyaXRhbmNlIGlzIGVuYWJsZWQgZm9yIHRhc2sgbWV0YWRhdGEgaW5oZXJpdGFuY2VcclxuXHRcdGlmIChcclxuXHRcdFx0ZmlsZUV4dGVuc2lvbiA9PT0gU3VwcG9ydGVkRmlsZVR5cGUuTUFSS0RPV04gJiZcclxuXHRcdFx0c2V0dGluZ3MuZmlsZVBhcnNpbmdDb25maWcgJiZcclxuXHRcdFx0KHNldHRpbmdzLmZpbGVQYXJzaW5nQ29uZmlnLmVuYWJsZUZpbGVNZXRhZGF0YVBhcnNpbmcgfHxcclxuXHRcdFx0XHRzZXR0aW5ncy5maWxlUGFyc2luZ0NvbmZpZy5lbmFibGVUYWdCYXNlZFRhc2tQYXJzaW5nIHx8XHJcblx0XHRcdFx0c2V0dGluZ3MuZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2U/LmVuYWJsZWQpXHJcblx0XHQpIHtcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRjb25zdCBmaWxlTWV0YWRhdGFQYXJzZXIgPSBuZXcgRmlsZU1ldGFkYXRhVGFza1BhcnNlcihcclxuXHRcdFx0XHRcdHNldHRpbmdzLmZpbGVQYXJzaW5nQ29uZmlnLFxyXG5cdFx0XHRcdFx0c2V0dGluZ3MucHJvamVjdENvbmZpZz8ubWV0YWRhdGFDb25maWc/LmRldGVjdGlvbk1ldGhvZHNcclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRjb25zdCBmaWxlTWV0YWRhdGFSZXN1bHQgPSBmaWxlTWV0YWRhdGFQYXJzZXIucGFyc2VGaWxlRm9yVGFza3MoXHJcblx0XHRcdFx0XHRmaWxlUGF0aCxcclxuXHRcdFx0XHRcdGNvbnRlbnQsXHJcblx0XHRcdFx0XHRtZXRhZGF0YT8uZmlsZUNhY2hlXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0Ly8gQWRkIGZpbGUgbWV0YWRhdGEgdGFza3MgdG8gdGhlIHJlc3VsdFxyXG5cdFx0XHRcdHRhc2tzLnB1c2goLi4uZmlsZU1ldGFkYXRhUmVzdWx0LnRhc2tzKTtcclxuXHJcblx0XHRcdFx0Ly8gTG9nIGFueSBlcnJvcnMgZnJvbSBmaWxlIG1ldGFkYXRhIHBhcnNpbmdcclxuXHRcdFx0XHRpZiAoZmlsZU1ldGFkYXRhUmVzdWx0LmVycm9ycy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRcdGBXb3JrZXI6IEZpbGUgbWV0YWRhdGEgcGFyc2luZyBlcnJvcnMgZm9yICR7ZmlsZVBhdGh9OmAsXHJcblx0XHRcdFx0XHRcdGZpbGVNZXRhZGF0YVJlc3VsdC5lcnJvcnNcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXHJcblx0XHRcdFx0XHRgV29ya2VyOiBFcnJvciBpbiBmaWxlIG1ldGFkYXRhIHBhcnNpbmcgZm9yICR7ZmlsZVBhdGh9OmAsXHJcblx0XHRcdFx0XHRlcnJvclxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBjb21wbGV0ZWRUYXNrcyA9IHRhc2tzLmZpbHRlcigodCkgPT4gdC5jb21wbGV0ZWQpLmxlbmd0aDtcclxuXHJcblx0XHQvLyBBcHBseSBkYWlseSBub3RlIGRhdGUgZXh0cmFjdGlvbiBpZiBjb25maWd1cmVkXHJcblx0XHR0cnkge1xyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0KGZpbGVQYXRoLnN0YXJ0c1dpdGgoc2V0dGluZ3MuZGFpbHlOb3RlUGF0aCkgfHxcclxuXHRcdFx0XHRcdChcIi9cIiArIGZpbGVQYXRoKS5zdGFydHNXaXRoKHNldHRpbmdzLmRhaWx5Tm90ZVBhdGgpKSAmJlxyXG5cdFx0XHRcdHNldHRpbmdzLmRhaWx5Tm90ZVBhdGggJiZcclxuXHRcdFx0XHRzZXR0aW5ncy51c2VEYWlseU5vdGVQYXRoQXNEYXRlXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdGZvciAoY29uc3QgdGFzayBvZiB0YXNrcykge1xyXG5cdFx0XHRcdFx0Y29uc3QgZGF0ZUZyb21QYXRoID0gZXh0cmFjdERhdGVGcm9tUGF0aChmaWxlUGF0aCwge1xyXG5cdFx0XHRcdFx0XHR1c2VEYWlseU5vdGVQYXRoQXNEYXRlOiBzZXR0aW5ncy51c2VEYWlseU5vdGVQYXRoQXNEYXRlLFxyXG5cdFx0XHRcdFx0XHRkYWlseU5vdGVGb3JtYXQ6IHNldHRpbmdzLmRhaWx5Tm90ZUZvcm1hdFxyXG5cdFx0XHRcdFx0XHRcdC5yZXBsYWNlKC9ZL2csIFwieVwiKVxyXG5cdFx0XHRcdFx0XHRcdC5yZXBsYWNlKC9EL2csIFwiZFwiKSxcclxuXHRcdFx0XHRcdFx0ZGFpbHlOb3RlUGF0aDogc2V0dGluZ3MuZGFpbHlOb3RlUGF0aCxcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0aWYgKGRhdGVGcm9tUGF0aCkge1xyXG5cdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ3MudXNlQXNEYXRlVHlwZSA9PT0gXCJkdWVcIiAmJlxyXG5cdFx0XHRcdFx0XHRcdCF0YXNrLm1ldGFkYXRhLmR1ZURhdGVcclxuXHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0dGFzay5tZXRhZGF0YS5kdWVEYXRlID0gZGF0ZUZyb21QYXRoO1xyXG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKFxyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdzLnVzZUFzRGF0ZVR5cGUgPT09IFwic3RhcnRcIiAmJlxyXG5cdFx0XHRcdFx0XHRcdCF0YXNrLm1ldGFkYXRhLnN0YXJ0RGF0ZVxyXG5cdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHR0YXNrLm1ldGFkYXRhLnN0YXJ0RGF0ZSA9IGRhdGVGcm9tUGF0aDtcclxuXHRcdFx0XHRcdFx0fSBlbHNlIGlmIChcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5ncy51c2VBc0RhdGVUeXBlID09PSBcInNjaGVkdWxlZFwiICYmXHJcblx0XHRcdFx0XHRcdFx0IXRhc2subWV0YWRhdGEuc2NoZWR1bGVkRGF0ZVxyXG5cdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHR0YXNrLm1ldGFkYXRhLnNjaGVkdWxlZERhdGUgPSBkYXRlRnJvbVBhdGg7XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdHRhc2subWV0YWRhdGEudXNlQXNEYXRlVHlwZSA9IHNldHRpbmdzLnVzZUFzRGF0ZVR5cGU7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKGBXb3JrZXI6IEVycm9yIHByb2Nlc3NpbmcgZmlsZSAke2ZpbGVQYXRofTpgLCBlcnJvcik7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0dHlwZTogXCJwYXJzZVJlc3VsdFwiLFxyXG5cdFx0XHRmaWxlUGF0aCxcclxuXHRcdFx0dGFza3MsXHJcblx0XHRcdHN0YXRzOiB7XHJcblx0XHRcdFx0dG90YWxUYXNrczogdGFza3MubGVuZ3RoLFxyXG5cdFx0XHRcdGNvbXBsZXRlZFRhc2tzLFxyXG5cdFx0XHRcdHByb2Nlc3NpbmdUaW1lTXM6IE1hdGgucm91bmQocGVyZm9ybWFuY2Uubm93KCkgLSBzdGFydFRpbWUpLFxyXG5cdFx0XHR9LFxyXG5cdFx0fTtcclxuXHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0Y29uc29sZS5lcnJvcihgV29ya2VyOiBFcnJvciBwcm9jZXNzaW5nIGZpbGUgJHtmaWxlUGF0aH06YCwgZXJyb3IpO1xyXG5cdFx0dGhyb3cgZXJyb3I7XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICogUHJvY2VzcyBhIGJhdGNoIG9mIGZpbGVzXHJcbiAqL1xyXG5mdW5jdGlvbiBwcm9jZXNzQmF0Y2goXHJcblx0ZmlsZXM6IHtcclxuXHRcdHBhdGg6IHN0cmluZztcclxuXHRcdGNvbnRlbnQ6IHN0cmluZztcclxuXHRcdGV4dGVuc2lvbjogc3RyaW5nO1xyXG5cdFx0c3RhdHM6IEZpbGVTdGF0cztcclxuXHRcdG1ldGFkYXRhPzogeyBmaWxlQ2FjaGU/OiBhbnkgfTtcclxuXHR9W10sXHJcblx0c2V0dGluZ3M6IFRhc2tXb3JrZXJTZXR0aW5nc1xyXG4pOiBCYXRjaEluZGV4UmVzdWx0IHtcclxuXHRjb25zdCBzdGFydFRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKTtcclxuXHRjb25zdCByZXN1bHRzOiB7IGZpbGVQYXRoOiBzdHJpbmc7IHRhc2tDb3VudDogbnVtYmVyIH1bXSA9IFtdO1xyXG5cdGxldCB0b3RhbFRhc2tzID0gMDtcclxuXHRsZXQgZmFpbGVkRmlsZXMgPSAwO1xyXG5cclxuXHRmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IHBhcnNlUmVzdWx0ID0gcHJvY2Vzc0ZpbGUoXHJcblx0XHRcdFx0ZmlsZS5wYXRoLFxyXG5cdFx0XHRcdGZpbGUuY29udGVudCxcclxuXHRcdFx0XHRmaWxlLmV4dGVuc2lvbixcclxuXHRcdFx0XHRmaWxlLnN0YXRzLFxyXG5cdFx0XHRcdHNldHRpbmdzLFxyXG5cdFx0XHRcdGZpbGUubWV0YWRhdGFcclxuXHRcdFx0KTtcclxuXHRcdFx0dG90YWxUYXNrcyArPSBwYXJzZVJlc3VsdC5zdGF0cy50b3RhbFRhc2tzO1xyXG5cdFx0XHRyZXN1bHRzLnB1c2goe1xyXG5cdFx0XHRcdGZpbGVQYXRoOiBwYXJzZVJlc3VsdC5maWxlUGF0aCxcclxuXHRcdFx0XHR0YXNrQ291bnQ6IHBhcnNlUmVzdWx0LnN0YXRzLnRvdGFsVGFza3MsXHJcblx0XHRcdH0pO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcclxuXHRcdFx0XHRgV29ya2VyOiBFcnJvciBpbiBiYXRjaCBwcm9jZXNzaW5nIGZvciBmaWxlICR7ZmlsZS5wYXRofTpgLFxyXG5cdFx0XHRcdGVycm9yXHJcblx0XHRcdCk7XHJcblx0XHRcdGZhaWxlZEZpbGVzKys7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRyZXR1cm4ge1xyXG5cdFx0dHlwZTogXCJiYXRjaFJlc3VsdFwiLFxyXG5cdFx0cmVzdWx0cyxcclxuXHRcdHN0YXRzOiB7XHJcblx0XHRcdHRvdGFsRmlsZXM6IGZpbGVzLmxlbmd0aCxcclxuXHRcdFx0dG90YWxUYXNrcyxcclxuXHRcdFx0cHJvY2Vzc2luZ1RpbWVNczogTWF0aC5yb3VuZChwZXJmb3JtYW5jZS5ub3coKSAtIHN0YXJ0VGltZSksXHJcblx0XHR9LFxyXG5cdH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBXb3JrZXIgbWVzc2FnZSBoYW5kbGVyXHJcbiAqL1xyXG5zZWxmLm9ubWVzc2FnZSA9IGFzeW5jIChldmVudCkgPT4ge1xyXG5cdHRyeSB7XHJcblx0XHRjb25zdCBtZXNzYWdlID0gZXZlbnQuZGF0YSBhcyBJbmRleGVyQ29tbWFuZDtcclxuXHJcblx0XHQvLyBQcm92aWRlIGRlZmF1bHQgc2V0dGluZ3MgaWYgbWlzc2luZ1xyXG5cdFx0Y29uc3Qgc2V0dGluZ3MgPSBtZXNzYWdlLnNldHRpbmdzIHx8IHtcclxuXHRcdFx0cHJlZmVyTWV0YWRhdGFGb3JtYXQ6IFwidGFza3NcIixcclxuXHRcdFx0dXNlRGFpbHlOb3RlUGF0aEFzRGF0ZTogZmFsc2UsXHJcblx0XHRcdGRhaWx5Tm90ZUZvcm1hdDogXCJ5eXl5LU1NLWRkXCIsXHJcblx0XHRcdHVzZUFzRGF0ZVR5cGU6IFwiZHVlXCIsXHJcblx0XHRcdGRhaWx5Tm90ZVBhdGg6IFwiXCIsXHJcblx0XHRcdGlnbm9yZUhlYWRpbmc6IFwiXCIsXHJcblx0XHRcdGZvY3VzSGVhZGluZzogXCJcIixcclxuXHRcdFx0cHJvamVjdENvbmZpZzogdW5kZWZpbmVkLFxyXG5cdFx0XHRmaWxlUGFyc2luZ0NvbmZpZzogdW5kZWZpbmVkLFxyXG5cdFx0fTtcclxuXHJcblx0XHRpZiAobWVzc2FnZS50eXBlID09PSBcInBhcnNlVGFza3NcIikge1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IHByb2Nlc3NGaWxlKFxyXG5cdFx0XHRcdFx0bWVzc2FnZS5maWxlUGF0aCxcclxuXHRcdFx0XHRcdG1lc3NhZ2UuY29udGVudCxcclxuXHRcdFx0XHRcdG1lc3NhZ2UuZmlsZUV4dGVuc2lvbixcclxuXHRcdFx0XHRcdG1lc3NhZ2Uuc3RhdHMsXHJcblx0XHRcdFx0XHRzZXR0aW5ncyxcclxuXHRcdFx0XHRcdG1lc3NhZ2UubWV0YWRhdGFcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHNlbGYucG9zdE1lc3NhZ2UocmVzdWx0KTtcclxuXHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRzZWxmLnBvc3RNZXNzYWdlKHtcclxuXHRcdFx0XHRcdHR5cGU6IFwiZXJyb3JcIixcclxuXHRcdFx0XHRcdGVycm9yOlxyXG5cdFx0XHRcdFx0XHRlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvciksXHJcblx0XHRcdFx0XHRmaWxlUGF0aDogbWVzc2FnZS5maWxlUGF0aCxcclxuXHRcdFx0XHR9IGFzIEVycm9yUmVzdWx0KTtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiYmF0Y2hJbmRleFwiKSB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHByb2Nlc3NCYXRjaChtZXNzYWdlLmZpbGVzLCBzZXR0aW5ncyk7XHJcblx0XHRcdHNlbGYucG9zdE1lc3NhZ2UocmVzdWx0KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXHJcblx0XHRcdFx0XCJXb3JrZXI6IFVua25vd24gb3IgaW52YWxpZCBjb21tYW5kIG1lc3NhZ2U6XCIsXHJcblx0XHRcdFx0bWVzc2FnZVxyXG5cdFx0XHQpO1xyXG5cdFx0XHRzZWxmLnBvc3RNZXNzYWdlKHtcclxuXHRcdFx0XHR0eXBlOiBcImVycm9yXCIsXHJcblx0XHRcdFx0ZXJyb3I6IGBVbmtub3duIGNvbW1hbmQgdHlwZTogJHsobWVzc2FnZSBhcyBhbnkpLnR5cGV9YCxcclxuXHRcdFx0fSBhcyBFcnJvclJlc3VsdCk7XHJcblx0XHR9XHJcblx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdGNvbnNvbGUuZXJyb3IoXCJXb3JrZXI6IEdlbmVyYWwgZXJyb3IgaW4gb25tZXNzYWdlIGhhbmRsZXI6XCIsIGVycm9yKTtcclxuXHRcdHNlbGYucG9zdE1lc3NhZ2Uoe1xyXG5cdFx0XHR0eXBlOiBcImVycm9yXCIsXHJcblx0XHRcdGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvciksXHJcblx0XHR9IGFzIEVycm9yUmVzdWx0KTtcclxuXHR9XHJcbn07XHJcbiJdfQ==