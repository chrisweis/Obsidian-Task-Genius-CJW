/**
 * Task Utility Functions
 *
 * This module provides utility functions for task operations.
 * Parsing logic has been moved to ConfigurableTaskParser.
 */
import { PRIORITY_MAP } from "../../common/default-symbol";
import { parseLocalDate } from "../date/date-formatter";
import { DV_DUE_DATE_REGEX, EMOJI_DUE_DATE_REGEX, DV_SCHEDULED_DATE_REGEX, EMOJI_SCHEDULED_DATE_REGEX, DV_START_DATE_REGEX, EMOJI_START_DATE_REGEX, DV_COMPLETED_DATE_REGEX, EMOJI_COMPLETED_DATE_REGEX, DV_CREATED_DATE_REGEX, EMOJI_CREATED_DATE_REGEX, DV_RECURRENCE_REGEX, EMOJI_RECURRENCE_REGEX, DV_PRIORITY_REGEX, EMOJI_PRIORITY_REGEX, EMOJI_CONTEXT_REGEX, ANY_DATAVIEW_FIELD_REGEX, EMOJI_TAG_REGEX, } from "../../common/regex-define";
import { MarkdownTaskParser } from "../../dataflow/core/ConfigurableTaskParser";
import { getConfig } from "../../common/task-parser-config";
/**
 * Cached parser instance for performance
 */
let cachedParser = null;
let cachedPlugin = null;
let cachedFormat = null;
/**
 * Get or create a parser instance with the given format and plugin
 */
function getParser(format, plugin) {
    // Check if we need to recreate the parser due to format or plugin changes
    if (!cachedParser || cachedFormat !== format || cachedPlugin !== plugin) {
        cachedParser = new MarkdownTaskParser(getConfig(format, plugin));
        cachedFormat = format;
        cachedPlugin = plugin;
    }
    return cachedParser;
}
/**
 * Reset the cached parser (call when settings change)
 */
export function resetTaskUtilParser() {
    cachedParser = null;
    cachedPlugin = null;
    cachedFormat = null;
}
/**
 * Parse a single task line using the configurable parser
 *
 * @deprecated Use MarkdownTaskParser directly for better performance and features
 */
export function parseTaskLine(filePath, line, lineNumber, format, plugin) {
    const parser = getParser(format, plugin);
    // Parse the single line as content
    const tasks = parser.parseLegacy(line, filePath);
    // Return the first task if any are found
    if (tasks.length > 0) {
        const task = tasks[0];
        // Override line number to match the expected behavior
        task.line = lineNumber;
        return task;
    }
    return null;
}
/**
 * Parse tasks from content using the configurable parser
 *
 * @deprecated Use MarkdownTaskParser.parseLegacy directly for better performance and features
 */
export function parseTasksFromContent(path, content, format, plugin) {
    const parser = getParser(format, plugin);
    return parser.parseLegacy(content, path);
}
export function extractDates(task, content, format) {
    let remainingContent = content;
    const useDataview = format === "dataview";
    const tryParseAndAssign = (regex, fieldName) => {
        if (task.metadata[fieldName] !== undefined)
            return false; // Already assigned
        const match = remainingContent.match(regex);
        if (match && match[1]) {
            const dateVal = parseLocalDate(match[1]);
            if (dateVal !== undefined) {
                task.metadata[fieldName] = dateVal; // Direct assignment is type-safe
                remainingContent = remainingContent.replace(match[0], "");
                return true;
            }
        }
        return false;
    };
    // Due Date
    if (useDataview) {
        !tryParseAndAssign(DV_DUE_DATE_REGEX, "dueDate") &&
            tryParseAndAssign(EMOJI_DUE_DATE_REGEX, "dueDate");
    }
    else {
        !tryParseAndAssign(EMOJI_DUE_DATE_REGEX, "dueDate") &&
            tryParseAndAssign(DV_DUE_DATE_REGEX, "dueDate");
    }
    // Scheduled Date
    if (useDataview) {
        !tryParseAndAssign(DV_SCHEDULED_DATE_REGEX, "scheduledDate") &&
            tryParseAndAssign(EMOJI_SCHEDULED_DATE_REGEX, "scheduledDate");
    }
    else {
        !tryParseAndAssign(EMOJI_SCHEDULED_DATE_REGEX, "scheduledDate") &&
            tryParseAndAssign(DV_SCHEDULED_DATE_REGEX, "scheduledDate");
    }
    // Start Date
    if (useDataview) {
        !tryParseAndAssign(DV_START_DATE_REGEX, "startDate") &&
            tryParseAndAssign(EMOJI_START_DATE_REGEX, "startDate");
    }
    else {
        !tryParseAndAssign(EMOJI_START_DATE_REGEX, "startDate") &&
            tryParseAndAssign(DV_START_DATE_REGEX, "startDate");
    }
    // Completion Date
    if (useDataview) {
        !tryParseAndAssign(DV_COMPLETED_DATE_REGEX, "completedDate") &&
            tryParseAndAssign(EMOJI_COMPLETED_DATE_REGEX, "completedDate");
    }
    else {
        !tryParseAndAssign(EMOJI_COMPLETED_DATE_REGEX, "completedDate") &&
            tryParseAndAssign(DV_COMPLETED_DATE_REGEX, "completedDate");
    }
    // Created Date
    if (useDataview) {
        !tryParseAndAssign(DV_CREATED_DATE_REGEX, "createdDate") &&
            tryParseAndAssign(EMOJI_CREATED_DATE_REGEX, "createdDate");
    }
    else {
        !tryParseAndAssign(EMOJI_CREATED_DATE_REGEX, "createdDate") &&
            tryParseAndAssign(DV_CREATED_DATE_REGEX, "createdDate");
    }
    return remainingContent;
}
export function extractRecurrence(task, content, format) {
    let remainingContent = content;
    const useDataview = format === "dataview";
    let match = null;
    if (useDataview) {
        match = remainingContent.match(DV_RECURRENCE_REGEX);
        if (match && match[1]) {
            task.metadata.recurrence = match[1].trim();
            remainingContent = remainingContent.replace(match[0], "");
            return remainingContent; // Found preferred format
        }
    }
    // Try emoji format (primary or fallback)
    match = remainingContent.match(EMOJI_RECURRENCE_REGEX);
    if (match && match[1]) {
        task.metadata.recurrence = match[1].trim();
        remainingContent = remainingContent.replace(match[0], "");
    }
    return remainingContent;
}
export function extractPriority(task, content, format) {
    var _a;
    let remainingContent = content;
    const useDataview = format === "dataview";
    let match = null;
    if (useDataview) {
        match = remainingContent.match(DV_PRIORITY_REGEX);
        if (match && match[1]) {
            const priorityValue = match[1].trim().toLowerCase();
            const mappedPriority = PRIORITY_MAP[priorityValue];
            if (mappedPriority !== undefined) {
                task.metadata.priority = mappedPriority;
                remainingContent = remainingContent.replace(match[0], "");
                return remainingContent;
            }
            else {
                const numericPriority = parseInt(priorityValue, 10);
                if (!isNaN(numericPriority)) {
                    task.metadata.priority = numericPriority;
                    remainingContent = remainingContent.replace(match[0], "");
                    return remainingContent;
                }
            }
        }
    }
    // Try emoji format (primary or fallback)
    match = remainingContent.match(EMOJI_PRIORITY_REGEX);
    if (match && match[1]) {
        // match[2] contains emoji symbols, match[3] contains [#A-E] format
        const prioritySymbol = match[2] || match[3] || match[1];
        task.metadata.priority = (_a = PRIORITY_MAP[prioritySymbol]) !== null && _a !== void 0 ? _a : undefined;
        if (task.metadata.priority !== undefined) {
            remainingContent = remainingContent.replace(match[0], "");
        }
    }
    return remainingContent;
}
export function extractProject(task, content, format, plugin) {
    var _a, _b;
    let remainingContent = content;
    const useDataview = format === "dataview";
    let match = null;
    // Get configurable prefixes from plugin settings
    const projectPrefix = ((_b = (_a = plugin === null || plugin === void 0 ? void 0 : plugin.settings) === null || _a === void 0 ? void 0 : _a.projectTagPrefix) === null || _b === void 0 ? void 0 : _b[format]) || "project";
    if (useDataview) {
        // Create dynamic regex for dataview format
        const dvProjectRegex = new RegExp(`\\[${projectPrefix}::\\s*([^\\]]+)\\]`, "i");
        match = remainingContent.match(dvProjectRegex);
        if (match && match[1]) {
            task.metadata.project = match[1].trim();
            remainingContent = remainingContent.replace(match[0], "");
            return remainingContent; // Found preferred format
        }
    }
    // Try configurable project prefix for emoji format
    const projectTagRegex = new RegExp(`#${projectPrefix}/([\\w/-]+)`);
    match = remainingContent.match(projectTagRegex);
    if (match && match[1]) {
        task.metadata.project = match[1].trim();
        // Do not remove here; let tag extraction handle it
    }
    return remainingContent;
}
export function extractContext(task, content, format, plugin) {
    var _a, _b;
    let remainingContent = content;
    const useDataview = format === "dataview";
    let match = null;
    // Get configurable prefixes from plugin settings
    const contextPrefix = ((_b = (_a = plugin === null || plugin === void 0 ? void 0 : plugin.settings) === null || _a === void 0 ? void 0 : _a.contextTagPrefix) === null || _b === void 0 ? void 0 : _b[format]) ||
        (format === "dataview" ? "context" : "@");
    if (useDataview) {
        // Create dynamic regex for dataview format
        const dvContextRegex = new RegExp(`\\[${contextPrefix}::\\s*([^\\]]+)\\]`, "i");
        match = remainingContent.match(dvContextRegex);
        if (match && match[1]) {
            task.metadata.context = match[1].trim();
            remainingContent = remainingContent.replace(match[0], "");
            return remainingContent; // Found preferred format
        }
    }
    // Skip @ contexts inside wiki links [[...]]
    // First, extract all wiki link patterns
    const wikiLinkMatches = [];
    const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
    let wikiMatch;
    while ((wikiMatch = wikiLinkRegex.exec(remainingContent)) !== null) {
        wikiLinkMatches.push(wikiMatch[0]);
    }
    // For emoji format, always use @ prefix (not configurable)
    // Use .exec to find the first match only for @context
    const contextMatch = new RegExp(EMOJI_CONTEXT_REGEX.source, "").exec(remainingContent); // Non-global search for first
    if (contextMatch && contextMatch[1]) {
        // Check if this @context is inside a wiki link
        const matchPosition = contextMatch.index;
        const isInsideWikiLink = wikiLinkMatches.some((link) => {
            const linkStart = remainingContent.indexOf(link);
            const linkEnd = linkStart + link.length;
            return matchPosition >= linkStart && matchPosition < linkEnd;
        });
        // Only process if not inside a wiki link
        if (!isInsideWikiLink) {
            task.metadata.context = contextMatch[1].trim();
            // Remove the first matched context tag here to avoid it being parsed as a general tag
            remainingContent = remainingContent.replace(contextMatch[0], "");
        }
    }
    return remainingContent;
}
export function extractTags(task, content, format, plugin) {
    var _a, _b;
    let remainingContent = content;
    const useDataview = format === "dataview";
    // If using Dataview, remove all potential DV fields first
    if (useDataview) {
        remainingContent = remainingContent.replace(ANY_DATAVIEW_FIELD_REGEX, "");
    }
    // Exclude links (both wiki and markdown) and inline code from tag processing
    const generalWikiLinkRegex = /\[\[([^\]\[\]]+)\]\]/g; // Matches [[content]]
    const aliasedWikiLinkRegex = /\[\[(?!.+?:)([^\]\[\]]+)\|([^\]\[\]]+)\]\]/g; // Matches [[link|alias]]
    const markdownLinkRegex = /\[([^\[\]]*)\]\((.*?)\)/g;
    const inlineCodeRegex = /`([^`]+?)`/g; // Matches `code`
    const exclusions = [];
    let match;
    let processedContent = remainingContent;
    // Find all general wiki links and their positions
    generalWikiLinkRegex.lastIndex = 0;
    while ((match = generalWikiLinkRegex.exec(remainingContent)) !== null) {
        exclusions.push({
            text: match[0],
            start: match.index,
            end: match.index + match[0].length,
        });
    }
    // Find all aliased wiki links
    aliasedWikiLinkRegex.lastIndex = 0;
    while ((match = aliasedWikiLinkRegex.exec(remainingContent)) !== null) {
        const overlaps = exclusions.some((ex) => Math.max(ex.start, match.index) <
            Math.min(ex.end, match.index + match[0].length));
        if (!overlaps) {
            exclusions.push({
                text: match[0],
                start: match.index,
                end: match.index + match[0].length,
            });
        }
    }
    // Find all markdown links
    markdownLinkRegex.lastIndex = 0;
    while ((match = markdownLinkRegex.exec(remainingContent)) !== null) {
        const overlaps = exclusions.some((ex) => Math.max(ex.start, match.index) <
            Math.min(ex.end, match.index + match[0].length));
        if (!overlaps) {
            exclusions.push({
                text: match[0],
                start: match.index,
                end: match.index + match[0].length,
            });
        }
    }
    // Find all inline code blocks
    inlineCodeRegex.lastIndex = 0;
    while ((match = inlineCodeRegex.exec(remainingContent)) !== null) {
        // Check for overlaps with existing exclusions (e.g. a code block inside a link, though unlikely for tags)
        const overlaps = exclusions.some((ex) => Math.max(ex.start, match.index) <
            Math.min(ex.end, match.index + match[0].length));
        if (!overlaps) {
            exclusions.push({
                text: match[0],
                start: match.index,
                end: match.index + match[0].length,
            });
        }
    }
    // Sort exclusions by start position to process them correctly
    exclusions.sort((a, b) => a.start - b.start);
    // Temporarily replace excluded segments (links, inline code) with placeholders
    if (exclusions.length > 0) {
        // Using spaces as placeholders maintains original string length and indices for subsequent operations.
        let tempProcessedContent = processedContent.split("");
        for (const ex of exclusions) {
            // Replace the content of the exclusion with spaces
            for (let i = ex.start; i < ex.end; i++) {
                // Check boundary condition for tempProcessedContent
                if (i < tempProcessedContent.length) {
                    tempProcessedContent[i] = " ";
                }
            }
        }
        processedContent = tempProcessedContent.join("");
    }
    // Find all #tags in the content with links and inline code replaced by placeholders
    // But ignore escaped tags (\#tag)
    const allTagMatches = processedContent.match(EMOJI_TAG_REGEX) || [];
    // Filter out escaped tags by checking the original content
    const validTags = [];
    for (const tag of allTagMatches) {
        const tagIndex = processedContent.indexOf(tag);
        if (tagIndex > 0) {
            // Check if the character before the # is a backslash in the original content
            // We need to check the remainingContent (not processedContent) for the backslash
            const originalTagIndex = remainingContent.indexOf(tag);
            if (originalTagIndex > 0 && remainingContent[originalTagIndex - 1] === '\\') {
                // This is an escaped tag, skip it
                continue;
            }
        }
        validTags.push(tag.trim());
    }
    task.metadata.tags = validTags;
    // Get configurable project prefix
    const projectPrefix = ((_b = (_a = plugin === null || plugin === void 0 ? void 0 : plugin.settings) === null || _a === void 0 ? void 0 : _a.projectTagPrefix) === null || _b === void 0 ? void 0 : _b[format]) || "project";
    const emojiProjectPrefix = `#${projectPrefix}/`;
    // If using 'tasks' (emoji) format, derive project from tags if not set
    // Also make sure project wasn't already set by DV format before falling back
    if (!useDataview && !task.metadata.project) {
        const projectTag = task.metadata.tags.find((tag) => typeof tag === "string" && tag.startsWith(emojiProjectPrefix));
        if (projectTag) {
            task.metadata.project = projectTag.substring(emojiProjectPrefix.length);
        }
    }
    // If using Dataview format, filter out any remaining #project/ tags from the tag list
    if (useDataview) {
        task.metadata.tags = task.metadata.tags.filter((tag) => typeof tag === "string" && !tag.startsWith(emojiProjectPrefix));
    }
    // Remove found tags (including potentially #project/ tags if format is 'tasks') from the original remaining content
    let contentWithoutTagsOrContext = remainingContent;
    for (const tag of task.metadata.tags) {
        // Ensure the tag is not empty or just '#' before creating regex
        if (tag && tag !== "#") {
            const escapedTag = tag.replace(/[.*+?^${}()|[\\\]]/g, "\\$&");
            const tagRegex = new RegExp(`\s?` + escapedTag + `(?=\s|$)`, "g");
            contentWithoutTagsOrContext = contentWithoutTagsOrContext.replace(tagRegex, "");
        }
    }
    // Also remove any remaining @context tags, making sure not to remove them from within links or inline code
    // We need to re-use the `exclusions` logic for this.
    let finalContent = "";
    let lastIndex = 0;
    // Use the original `remainingContent` that has had tags removed but not context yet,
    // but for context removal, we refer to `exclusions` based on the *original* content.
    let contentForContextRemoval = contentWithoutTagsOrContext;
    if (exclusions.length > 0) {
        // Process content segments between exclusions
        for (const ex of exclusions) {
            // Segment before the current exclusion
            const segment = contentForContextRemoval.substring(lastIndex, ex.start);
            // Remove @context from this segment
            finalContent += segment.replace(EMOJI_CONTEXT_REGEX, "").trim(); // Using global regex here
            // Add the original excluded text (link or code) back
            finalContent += ex.text; // Add the original link/code text back
            lastIndex = ex.end;
        }
        // Process the remaining segment after the last exclusion
        const lastSegment = contentForContextRemoval.substring(lastIndex);
        finalContent += lastSegment.replace(EMOJI_CONTEXT_REGEX, "").trim(); // Global regex
    }
    else {
        // No exclusions, safe to remove @context directly from the whole content
        finalContent = contentForContextRemoval
            .replace(EMOJI_CONTEXT_REGEX, "")
            .trim(); // Global regex
    }
    // Clean up extra spaces that might result from replacements
    finalContent = finalContent.replace(/\s{2,}/g, " ").trim();
    return finalContent;
}
/**
 * Get the effective project name from a task, prioritizing original project over tgProject
 */
export function getEffectiveProject(task) {
    // Handle undefined or null metadata
    if (!task.metadata) {
        return undefined;
    }
    // Check original project - must be non-empty and not just whitespace
    if (task.metadata.project && task.metadata.project.trim()) {
        return task.metadata.project;
    }
    // Check tgProject - must exist, be an object, and have a non-empty name
    if (task.metadata.tgProject &&
        typeof task.metadata.tgProject === "object" &&
        task.metadata.tgProject.name &&
        task.metadata.tgProject.name.trim()) {
        return task.metadata.tgProject.name;
    }
    return undefined;
}
/**
 * Check if the project is read-only (from tgProject)
 */
export function isProjectReadonly(task) {
    // Handle undefined or null metadata
    if (!task.metadata) {
        return false;
    }
    // If there's an original project that's not empty/whitespace, it's always editable
    if (task.metadata.project && task.metadata.project.trim()) {
        return false;
    }
    // If only tgProject exists and is valid, check its readonly flag
    if (task.metadata.tgProject &&
        typeof task.metadata.tgProject === "object" &&
        task.metadata.tgProject.name &&
        task.metadata.tgProject.name.trim()) {
        return task.metadata.tgProject.readonly || false;
    }
    return false;
}
/**
 * Check if a task has any project (original or tgProject)
 */
export function hasProject(task) {
    // Handle undefined or null metadata
    if (!task.metadata) {
        return false;
    }
    // Check if original project exists and is not empty/whitespace
    if (task.metadata.project && task.metadata.project.trim()) {
        return true;
    }
    // Check if tgProject exists, is valid object, and has non-empty name
    if (task.metadata.tgProject &&
        typeof task.metadata.tgProject === "object" &&
        task.metadata.tgProject.name &&
        task.metadata.tgProject.name.trim()) {
        return true;
    }
    return false;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFzay1vcGVyYXRpb25zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGFzay1vcGVyYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7OztHQUtHO0FBRUgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzNELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUV4RCxPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLG9CQUFvQixFQUNwQix1QkFBdUIsRUFDdkIsMEJBQTBCLEVBQzFCLG1CQUFtQixFQUNuQixzQkFBc0IsRUFDdEIsdUJBQXVCLEVBQ3ZCLDBCQUEwQixFQUMxQixxQkFBcUIsRUFDckIsd0JBQXdCLEVBQ3hCLG1CQUFtQixFQUNuQixzQkFBc0IsRUFDdEIsaUJBQWlCLEVBQ2pCLG9CQUFvQixFQUNwQixtQkFBbUIsRUFDbkIsd0JBQXdCLEVBQ3hCLGVBQWUsR0FDZixNQUFNLDJCQUEyQixDQUFDO0FBQ25DLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQU81RDs7R0FFRztBQUNILElBQUksWUFBWSxHQUE4QixJQUFJLENBQUM7QUFDbkQsSUFBSSxZQUFZLEdBQVEsSUFBSSxDQUFDO0FBQzdCLElBQUksWUFBWSxHQUEwQixJQUFJLENBQUM7QUFFL0M7O0dBRUc7QUFDSCxTQUFTLFNBQVMsQ0FBQyxNQUFzQixFQUFFLE1BQVk7SUFDdEQsMEVBQTBFO0lBQzFFLElBQUksQ0FBQyxZQUFZLElBQUksWUFBWSxLQUFLLE1BQU0sSUFBSSxZQUFZLEtBQUssTUFBTSxFQUFFO1FBQ3hFLFlBQVksR0FBRyxJQUFJLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNqRSxZQUFZLEdBQUcsTUFBTSxDQUFDO1FBQ3RCLFlBQVksR0FBRyxN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LE1BQU0sVUFBVSxVQUFVLENBQUMsSUFBVTtJQUNwQyxvQ0FBb0M7SUFDcEMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUU7UUFDbkIsT0FBTyxLQUFLLENBQUM7S0FDYjtJQUVELCtEQUErRDtJQUMvRCxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFO1FBQzFELE9BQU8sSUFBSSxDQUFDO0tBQ1o7SUFFRCxxRUFBcUU7SUFDckUsSUFDQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVM7UUFDdkIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsS0FBSyxRQUFRO1FBQzNDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUk7UUFDNUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxFQUNsQztRQUNELE9BQU8sSUFBSSxDQUFDO0tBQ1o7SUFFRCxPQUFPLEtBQUssQ0FBQztBQUNkLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogVGFzayBVdGlsaXR5IEZ1bmN0aW9uc1xyXG4gKlxyXG4gKiBUaGlzIG1vZHVsZSBwcm92aWRlcyB1dGlsaXR5IGZ1bmN0aW9ucyBmb3IgdGFzayBvcGVyYXRpb25zLlxyXG4gKiBQYXJzaW5nIGxvZ2ljIGhhcyBiZWVuIG1vdmVkIHRvIENvbmZpZ3VyYWJsZVRhc2tQYXJzZXIuXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgUFJJT1JJVFlfTUFQIH0gZnJvbSBcIi4uLy4uL2NvbW1vbi9kZWZhdWx0LXN5bWJvbFwiO1xyXG5pbXBvcnQgeyBwYXJzZUxvY2FsRGF0ZSB9IGZyb20gXCIuLi9kYXRlL2RhdGUtZm9ybWF0dGVyXCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiLi4vLi4vdHlwZXMvdGFza1wiO1xyXG5pbXBvcnQge1xyXG5cdERWX0RVRV9EQVRFX1JFR0VYLFxyXG5cdEVNT0pJX0RVRV9EQVRFX1JFR0VYLFxyXG5cdERWX1NDSEVEVUxFRF9EQVRFX1JFR0VYLFxyXG5cdEVNT0pJX1NDSEVEVUxFRF9EQVRFX1JFR0VYLFxyXG5cdERWX1NUQVJUX0RBVEVfUkVHRVgsXHJcblx0RU1PSklfU1RBUlRfREFURV9SRUdFWCxcclxuXHREVl9DT01QTEVURURfREFURV9SRUdFWCxcclxuXHRFTU9KSV9DT01QTEVURURfREFURV9SRUdFWCxcclxuXHREVl9DUkVBVEVEX0RBVEVfUkVHRVgsXHJcblx0RU1PSklfQ1JFQVRFRF9EQVRFX1JFR0VYLFxyXG5cdERWX1JFQ1VSUkVOQ0VfUkVHRVgsXHJcblx0RU1PSklfUkVDVVJSRU5DRV9SRUdFWCxcclxuXHREVl9QUklPUklUWV9SRUdFWCxcclxuXHRFTU9KSV9QUklPUklUWV9SRUdFWCxcclxuXHRFTU9KSV9DT05URVhUX1JFR0VYLFxyXG5cdEFOWV9EQVRBVklFV19GSUVMRF9SRUdFWCxcclxuXHRFTU9KSV9UQUdfUkVHRVgsXHJcbn0gZnJvbSBcIi4uLy4uL2NvbW1vbi9yZWdleC1kZWZpbmVcIjtcclxuaW1wb3J0IHsgTWFya2Rvd25UYXNrUGFyc2VyIH0gZnJvbSBcIi4uLy4uL2RhdGFmbG93L2NvcmUvQ29uZmlndXJhYmxlVGFza1BhcnNlclwiO1xyXG5pbXBvcnQgeyBnZXRDb25maWcgfSBmcm9tIFwiLi4vLi4vY29tbW9uL3Rhc2stcGFyc2VyLWNvbmZpZ1wiO1xyXG5cclxuLyoqXHJcbiAqIE1ldGFkYXRhIGZvcm1hdCB0eXBlIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XHJcbiAqL1xyXG5leHBvcnQgdHlwZSBNZXRhZGF0YUZvcm1hdCA9IFwidGFza3NcIiB8IFwiZGF0YXZpZXdcIjtcclxuXHJcbi8qKlxyXG4gKiBDYWNoZWQgcGFyc2VyIGluc3RhbmNlIGZvciBwZXJmb3JtYW5jZVxyXG4gKi9cclxubGV0IGNhY2hlZFBhcnNlcjogTWFya2Rvd25UYXNrUGFyc2VyIHwgbnVsbCA9IG51bGw7XHJcbmxldCBjYWNoZWRQbHVnaW46IGFueSA9IG51bGw7XHJcbmxldCBjYWNoZWRGb3JtYXQ6IE1ldGFkYXRhRm9ybWF0IHwgbnVsbCA9IG51bGw7XHJcblxyXG4vKipcclxuICogR2V0IG9yIGNyZWF0ZSBhIHBhcnNlciBpbnN0YW5jZSB3aXRoIHRoZSBnaXZlbiBmb3JtYXQgYW5kIHBsdWdpblxyXG4gKi9cclxuZnVuY3Rpb24gZ2V0UGFyc2VyKGZvcm1hdDogTWV0YWRhdGFGb3JtYXQsIHBsdWdpbj86IGFueSk6IE1hcmtkb3duVGFza1BhcnNlciB7XHJcblx0Ly8gQ2hlY2sgaWYgd2UgbmVlZCB0byByZWNyZWF0ZSB0aGUgcGFyc2VyIGR1ZSB0byBmb3JtYXQgb3IgcGx1Z2luIGNoYW5nZXNcclxuXHRpZiAoIWNhY2hlZFBhcnNlciB8fCBjYWNoZWRGb3JtYXQgIT09IGZvcm1hdCB8fCBjYWNoZWRQbHVnaW4gIT09IHBsdWdpbikge1xyXG5cdFx0Y2FjaGVkUGFyc2VyID0gbmV3IE1hcmtkb3duVGFza1BhcnNlcihnZXRDb25maWcoZm9ybWF0LCBwbHVnaW4pKTtcclxuXHRcdGNhY2hlZEZvcm1hdCA9IGZvcm1hdDtcclxuXHRcdGNhY2hlZFBsdWdpbiA9IHBsdWdpbjtcclxuXHR9XHJcblx0cmV0dXJuIGNhY2hlZFBhcnNlcjtcclxufVxyXG5cclxuLyoqXHJcbiAqIFJlc2V0IHRoZSBjYWNoZWQgcGFyc2VyIChjYWxsIHdoZW4gc2V0dGluZ3MgY2hhbmdlKVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlc2V0VGFza1V0aWxQYXJzZXIoKTogdm9pZCB7XHJcblx0Y2FjaGVkUGFyc2VyID0gbnVsbDtcclxuXHRjYWNoZWRQbHVnaW4gPSBudWxsO1xyXG5cdGNhY2hlZEZvcm1hdCA9IG51bGw7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQYXJzZSBhIHNpbmdsZSB0YXNrIGxpbmUgdXNpbmcgdGhlIGNvbmZpZ3VyYWJsZSBwYXJzZXJcclxuICpcclxuICogQGRlcHJlY2F0ZWQgVXNlIE1hcmtkb3duVGFza1BhcnNlciBkaXJlY3RseSBmb3IgYmV0dGVyIHBlcmZvcm1hbmNlIGFuZCBmZWF0dXJlc1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlVGFza0xpbmUoXHJcblx0ZmlsZVBhdGg6IHN0cmluZyxcclxuXHRsaW5lOiBzdHJpbmcsXHJcblx0bGluZU51bWJlcjogbnVtYmVyLFxyXG5cdGZvcm1hdDogTWV0YWRhdGFGb3JtYXQsXHJcblx0cGx1Z2luPzogYW55XHJcbik6IFRhc2sgfCBudWxsIHtcclxuXHRjb25zdCBwYXJzZXIgPSBnZXRQYXJzZXIoZm9ybWF0LCBwbHVnaW4pO1xyXG5cclxuXHQvLyBQYXJzZSB0aGUgc2luZ2xlIGxpbmUgYXMgY29udGVudFxyXG5cdGNvbnN0IHRhc2tzID0gcGFyc2VyLnBhcnNlTGVnYWN5KGxpbmUsIGZpbGVQYXRoKTtcclxuXHJcblx0Ly8gUmV0dXJuIHRoZSBmaXJzdCB0YXNrIGlmIGFueSBhcmUgZm91bmRcclxuXHRpZiAodGFza3MubGVuZ3RoID4gMCkge1xyXG5cdFx0Y29uc3QgdGFzayA9IHRhc2tzWzBdO1xyXG5cdFx0Ly8gT3ZlcnJpZGUgbGluZSBudW1iZXIgdG8gbWF0Y2ggdGhlIGV4cGVjdGVkIGJlaGF2aW9yXHJcblx0XHR0YXNrLmxpbmUgPSBsaW5lTnVtYmVyO1xyXG5cdFx0cmV0dXJuIHRhc2s7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gbnVsbDtcclxufVxyXG5cclxuLyoqXHJcbiAqIFBhcnNlIHRhc2tzIGZyb20gY29udGVudCB1c2luZyB0aGUgY29uZmlndXJhYmxlIHBhcnNlclxyXG4gKlxyXG4gKiBAZGVwcmVjYXRlZCBVc2UgTWFya2Rvd25UYXNrUGFyc2VyLnBhcnNlTGVnYWN5IGRpcmVjdGx5IGZvciBiZXR0ZXIgcGVyZm9ybWFuY2UgYW5kIGZlYXR1cmVzXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VUYXNrc0Zyb21Db250ZW50KFxyXG5cdHBhdGg6IHN0cmluZyxcclxuXHRjb250ZW50OiBzdHJpbmcsXHJcblx0Zm9ybWF0OiBNZXRhZGF0YUZvcm1hdCxcclxuXHRwbHVnaW4/OiBhbnlcclxuKTogVGFza1tdIHtcclxuXHRjb25zdCBwYXJzZXIgPSBnZXRQYXJzZXIoZm9ybWF0LCBwbHVnaW4pO1xyXG5cdHJldHVybiBwYXJzZXIucGFyc2VMZWdhY3koY29udGVudCwgcGF0aCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0RGF0ZXMoXHJcblx0dGFzazogVGFzayxcclxuXHRjb250ZW50OiBzdHJpbmcsXHJcblx0Zm9ybWF0OiBNZXRhZGF0YUZvcm1hdFxyXG4pOiBzdHJpbmcge1xyXG5cdGxldCByZW1haW5pbmdDb250ZW50ID0gY29udGVudDtcclxuXHRjb25zdCB1c2VEYXRhdmlldyA9IGZvcm1hdCA9PT0gXCJkYXRhdmlld1wiO1xyXG5cclxuXHRjb25zdCB0cnlQYXJzZUFuZEFzc2lnbiA9IChcclxuXHRcdHJlZ2V4OiBSZWdFeHAsXHJcblx0XHRmaWVsZE5hbWU6XHJcblx0XHRcdHwgXCJkdWVEYXRlXCJcclxuXHRcdFx0fCBcInNjaGVkdWxlZERhdGVcIlxyXG5cdFx0XHR8IFwic3RhcnREYXRlXCJcclxuXHRcdFx0fCBcImNvbXBsZXRlZERhdGVcIlxyXG5cdFx0XHR8IFwiY2FuY2VsbGVkRGF0ZVwiXHJcblx0XHRcdHwgXCJjcmVhdGVkRGF0ZVwiXHJcblx0KTogYm9vbGVhbiA9PiB7XHJcblx0XHRpZiAodGFzay5tZXRhZGF0YVtmaWVsZE5hbWVdICE9PSB1bmRlZmluZWQpIHJldHVybiBmYWxzZTsgLy8gQWxyZWFkeSBhc3NpZ25lZFxyXG5cclxuXHRcdGNvbnN0IG1hdGNoID0gcmVtYWluaW5nQ29udGVudC5tYXRjaChyZWdleCk7XHJcblx0XHRpZiAobWF0Y2ggJiYgbWF0Y2hbMV0pIHtcclxuXHRcdFx0Y29uc3QgZGF0ZVZhbCA9IHBhcnNlTG9jYWxEYXRlKG1hdGNoWzFdKTtcclxuXHRcdFx0aWYgKGRhdGVWYWwgIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdHRhc2subWV0YWRhdGFbZmllbGROYW1lXSA9IGRhdGVWYWw7IC8vIERpcmVjdCBhc3NpZ25tZW50IGlzIHR5cGUtc2FmZVxyXG5cdFx0XHRcdHJlbWFpbmluZ0NvbnRlbnQgPSByZW1haW5pbmdDb250ZW50LnJlcGxhY2UobWF0Y2hbMF0sIFwiXCIpO1xyXG5cdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblx0fTtcclxuXHJcblx0Ly8gRHVlIERhdGVcclxuXHRpZiAodXNlRGF0YXZpZXcpIHtcclxuXHRcdCF0cnlQYXJzZUFuZEFzc2lnbihEVl9EVUVfREFURV9SRUdFWCwgXCJkdWVEYXRlXCIpICYmXHJcblx0XHRcdHRyeVBhcnNlQW5kQXNzaWduKEVNT0pJX0RVRV9EQVRFX1JFR0VYLCBcImR1ZURhdGVcIik7XHJcblx0fSBlbHNlIHtcclxuXHRcdCF0cnlQYXJzZUFuZEFzc2lnbihFTU9KSV9EVUVfREFURV9SRUdFWCwgXCJkdWVEYXRlXCIpICYmXHJcblx0XHRcdHRyeVBhcnNlQW5kQXNzaWduKERWX0RVRV9EQVRFX1JFR0VYLCBcImR1ZURhdGVcIik7XHJcblx0fVxyXG5cclxuXHQvLyBTY2hlZHVsZWQgRGF0ZVxyXG5cdGlmICh1c2VEYXRhdmlldykge1xyXG5cdFx0IXRyeVBhcnNlQW5kQXNzaWduKERWX1NDSEVEVUxFRF9EQVRFX1JFR0VYLCBcInNjaGVkdWxlZERhdGVcIikgJiZcclxuXHRcdFx0dHJ5UGFyc2VBbmRBc3NpZ24oRU1PSklfU0NIRURVTEVEX0RBVEVfUkVHRVgsIFwic2NoZWR1bGVkRGF0ZVwiKTtcclxuXHR9IGVsc2Uge1xyXG5cdFx0IXRyeVBhcnNlQW5kQXNzaWduKEVNT0pJX1NDSEVEVUxFRF9EQVRFX1JFR0VYLCBcInNjaGVkdWxlZERhdGVcIikgJiZcclxuXHRcdFx0dHJ5UGFyc2VBbmRBc3NpZ24oRFZfU0NIRURVTEVEX0RBVEVfUkVHRVgsIFwic2NoZWR1bGVkRGF0ZVwiKTtcclxuXHR9XHJcblxyXG5cdC8vIFN0YXJ0IERhdGVcclxuXHRpZiAodXNlRGF0YXZpZXcpIHtcclxuXHRcdCF0cnlQYXJzZUFuZEFzc2lnbihEVl9TVEFSVF9EQVRFX1JFR0VYLCBcInN0YXJ0RGF0ZVwiKSAmJlxyXG5cdFx0XHR0cnlQYXJzZUFuZEFzc2lnbihFTU9KSV9TVEFSVF9EQVRFX1JFR0VYLCBcInN0YXJ0RGF0ZVwiKTtcclxuXHR9IGVsc2Uge1xyXG5cdFx0IXRyeVBhcnNlQW5kQXNzaWduKEVNT0pJX1NUQVJUX0RBVEVfUkVHRVgsIFwic3RhcnREYXRlXCIpICYmXHJcblx0XHRcdHRyeVBhcnNlQW5kQXNzaWduKERWX1NUQVJUX0RBVEVfUkVHRVgsIFwic3RhcnREYXRlXCIpO1xyXG5cdH1cclxuXHJcblx0Ly8gQ29tcGxldGlvbiBEYXRlXHJcblx0aWYgKHVzZURhdGF2aWV3KSB7XHJcblx0XHQhdHJ5UGFyc2VBbmRBc3NpZ24oRFZfQ09NUExFVEVEX0RBVEVfUkVHRVgsIFwiY29tcGxldGVkRGF0ZVwiKSAmJlxyXG5cdFx0XHR0cnlQYXJzZUFuZEFzc2lnbihFTU9KSV9DT01QTEVURURfREFURV9SRUdFWCwgXCJjb21wbGV0ZWREYXRlXCIpO1xyXG5cdH0gZWxzZSB7XHJcblx0XHQhdHJ5UGFyc2VBbmRBc3NpZ24oRU1PSklfQ09NUExFVEVEX0RBVEVfUkVHRVgsIFwiY29tcGxldGVkRGF0ZVwiKSAmJlxyXG5cdFx0XHR0cnlQYXJzZUFuZEFzc2lnbihEVl9DT01QTEVURURfREFURV9SRUdFWCwgXCJjb21wbGV0ZWREYXRlXCIpO1xyXG5cdH1cclxuXHJcblx0Ly8gQ3JlYXRlZCBEYXRlXHJcblx0aWYgKHVzZURhdGF2aWV3KSB7XHJcblx0XHQhdHJ5UGFyc2VBbmRBc3NpZ24oRFZfQ1JFQVRFRF9EQVRFX1JFR0VYLCBcImNyZWF0ZWREYXRlXCIpICYmXHJcblx0XHRcdHRyeVBhcnNlQW5kQXNzaWduKEVNT0pJX0NSRUFURURfREFURV9SRUdFWCwgXCJjcmVhdGVkRGF0ZVwiKTtcclxuXHR9IGVsc2Uge1xyXG5cdFx0IXRyeVBhcnNlQW5kQXNzaWduKEVNT0pJX0NSRUFURURfREFURV9SRUdFWCwgXCJjcmVhdGVkRGF0ZVwiKSAmJlxyXG5cdFx0XHR0cnlQYXJzZUFuZEFzc2lnbihEVl9DUkVBVEVEX0RBVEVfUkVHRVgsIFwiY3JlYXRlZERhdGVcIik7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gcmVtYWluaW5nQ29udGVudDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RSZWN1cnJlbmNlKFxyXG5cdHRhc2s6IFRhc2ssXHJcblx0Y29udGVudDogc3RyaW5nLFxyXG5cdGZvcm1hdDogTWV0YWRhdGFGb3JtYXRcclxuKTogc3RyaW5nIHtcclxuXHRsZXQgcmVtYWluaW5nQ29udGVudCA9IGNvbnRlbnQ7XHJcblx0Y29uc3QgdXNlRGF0YXZpZXcgPSBmb3JtYXQgPT09IFwiZGF0YXZpZXdcIjtcclxuXHRsZXQgbWF0Y2g6IFJlZ0V4cE1hdGNoQXJyYXkgfCBudWxsID0gbnVsbDtcclxuXHJcblx0aWYgKHVzZURhdGF2aWV3KSB7XHJcblx0XHRtYXRjaCA9IHJlbWFpbmluZ0NvbnRlbnQubWF0Y2goRFZfUkVDVVJSRU5DRV9SRUdFWCk7XHJcblx0XHRpZiAobWF0Y2ggJiYgbWF0Y2hbMV0pIHtcclxuXHRcdFx0dGFzay5tZXRhZGF0YS5yZWN1cnJlbmNlID0gbWF0Y2hbMV0udHJpbSgpO1xyXG5cdFx0XHRyZW1haW5pbmdDb250ZW50ID0gcmVtYWluaW5nQ29udGVudC5yZXBsYWNlKG1hdGNoWzBdLCBcIlwiKTtcclxuXHRcdFx0cmV0dXJuIHJlbWFpbmluZ0NvbnRlbnQ7IC8vIEZvdW5kIHByZWZlcnJlZCBmb3JtYXRcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIFRyeSBlbW9qaSBmb3JtYXQgKHByaW1hcnkgb3IgZmFsbGJhY2spXHJcblx0bWF0Y2ggPSByZW1haW5pbmdDb250ZW50Lm1hdGNoKEVNT0pJX1JFQ1VSUkVOQ0VfUkVHRVgpO1xyXG5cdGlmIChtYXRjaCAmJiBtYXRjaFsxXSkge1xyXG5cdFx0dGFzay5tZXRhZGF0YS5yZWN1cnJlbmNlID0gbWF0Y2hbMV0udHJpbSgpO1xyXG5cdFx0cmVtYWluaW5nQ29udGVudCA9IHJlbWFpbmluZ0NvbnRlbnQucmVwbGFjZShtYXRjaFswXSwgXCJcIik7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gcmVtYWluaW5nQ29udGVudDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RQcmlvcml0eShcclxuXHR0YXNrOiBUYXNrLFxyXG5cdGNvbnRlbnQ6IHN0cmluZyxcclxuXHRmb3JtYXQ6IE1ldGFkYXRhRm9ybWF0XHJcbik6IHN0cmluZyB7XHJcblx0bGV0IHJlbWFpbmluZ0NvbnRlbnQgPSBjb250ZW50O1xyXG5cdGNvbnN0IHVzZURhdGF2aWV3ID0gZm9ybWF0ID09PSBcImRhdGF2aWV3XCI7XHJcblx0bGV0IG1hdGNoOiBSZWdFeHBNYXRjaEFycmF5IHwgbnVsbCA9IG51bGw7XHJcblxyXG5cdGlmICh1c2VEYXRhdmlldykge1xyXG5cdFx0bWF0Y2ggPSByZW1haW5pbmdDb250ZW50Lm1hdGNoKERWX1BSSU9SSVRZX1JFR0VYKTtcclxuXHRcdGlmIChtYXRjaCAmJiBtYXRjaFsxXSkge1xyXG5cdFx0XHRjb25zdCBwcmlvcml0eVZhbHVlID0gbWF0Y2hbMV0udHJpbSgpLnRvTG93ZXJDYXNlKCk7XHJcblx0XHRcdGNvbnN0IG1hcHBlZFByaW9yaXR5ID0gUFJJT1JJVFlfTUFQW3ByaW9yaXR5VmFsdWVdO1xyXG5cdFx0XHRpZiAobWFwcGVkUHJpb3JpdHkgIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdHRhc2subWV0YWRhdGEucHJpb3JpdHkgPSBtYXBwZWRQcmlvcml0eTtcclxuXHRcdFx0XHRyZW1haW5pbmdDb250ZW50ID0gcmVtYWluaW5nQ29udGVudC5yZXBsYWNlKG1hdGNoWzBdLCBcIlwiKTtcclxuXHRcdFx0XHRyZXR1cm4gcmVtYWluaW5nQ29udGVudDtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRjb25zdCBudW1lcmljUHJpb3JpdHkgPSBwYXJzZUludChwcmlvcml0eVZhbHVlLCAxMCk7XHJcblx0XHRcdFx0aWYgKCFpc05hTihudW1lcmljUHJpb3JpdHkpKSB7XHJcblx0XHRcdFx0XHR0YXNrLm1ldGFkYXRhLnByaW9yaXR5ID0gbnVtZXJpY1ByaW9yaXR5O1xyXG5cdFx0XHRcdFx0cmVtYWluaW5nQ29udGVudCA9IHJlbWFpbmluZ0NvbnRlbnQucmVwbGFjZShtYXRjaFswXSwgXCJcIik7XHJcblx0XHRcdFx0XHRyZXR1cm4gcmVtYWluaW5nQ29udGVudDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIFRyeSBlbW9qaSBmb3JtYXQgKHByaW1hcnkgb3IgZmFsbGJhY2spXHJcblx0bWF0Y2ggPSByZW1haW5pbmdDb250ZW50Lm1hdGNoKEVNT0pJX1BSSU9SSVRZX1JFR0VYKTtcclxuXHRpZiAobWF0Y2ggJiYgbWF0Y2hbMV0pIHtcclxuXHRcdC8vIG1hdGNoWzJdIGNvbnRhaW5zIGVtb2ppIHN5bWJvbHMsIG1hdGNoWzNdIGNvbnRhaW5zIFsjQS1FXSBmb3JtYXRcclxuXHRcdGNvbnN0IHByaW9yaXR5U3ltYm9sID0gbWF0Y2hbMl0gfHwgbWF0Y2hbM10gfHwgbWF0Y2hbMV07XHJcblx0XHR0YXNrLm1ldGFkYXRhLnByaW9yaXR5ID0gUFJJT1JJVFlfTUFQW3ByaW9yaXR5U3ltYm9sXSA/PyB1bmRlZmluZWQ7XHJcblx0XHRpZiAodGFzay5tZXRhZGF0YS5wcmlvcml0eSAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdHJlbWFpbmluZ0NvbnRlbnQgPSByZW1haW5pbmdDb250ZW50LnJlcGxhY2UobWF0Y2hbMF0sIFwiXCIpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIHJlbWFpbmluZ0NvbnRlbnQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0UHJvamVjdChcclxuXHR0YXNrOiBUYXNrLFxyXG5cdGNvbnRlbnQ6IHN0cmluZyxcclxuXHRmb3JtYXQ6IE1ldGFkYXRhRm9ybWF0LFxyXG5cdHBsdWdpbj86IGFueVxyXG4pOiBzdHJpbmcge1xyXG5cdGxldCByZW1haW5pbmdDb250ZW50ID0gY29udGVudDtcclxuXHRjb25zdCB1c2VEYXRhdmlldyA9IGZvcm1hdCA9PT0gXCJkYXRhdmlld1wiO1xyXG5cdGxldCBtYXRjaDogUmVnRXhwTWF0Y2hBcnJheSB8IG51bGwgPSBudWxsO1xyXG5cclxuXHQvLyBHZXQgY29uZmlndXJhYmxlIHByZWZpeGVzIGZyb20gcGx1Z2luIHNldHRpbmdzXHJcblx0Y29uc3QgcHJvamVjdFByZWZpeCA9XHJcblx0XHRwbHVnaW4/LnNldHRpbmdzPy5wcm9qZWN0VGFnUHJlZml4Py5bZm9ybWF0XSB8fCBcInByb2plY3RcIjtcclxuXHJcblx0aWYgKHVzZURhdGF2aWV3KSB7XHJcblx0XHQvLyBDcmVhdGUgZHluYW1pYyByZWdleCBmb3IgZGF0YXZpZXcgZm9ybWF0XHJcblx0XHRjb25zdCBkdlByb2plY3RSZWdleCA9IG5ldyBSZWdFeHAoXHJcblx0XHRcdGBcXFxcWyR7cHJvamVjdFByZWZpeH06OlxcXFxzKihbXlxcXFxdXSspXFxcXF1gLFxyXG5cdFx0XHRcImlcIlxyXG5cdFx0KTtcclxuXHRcdG1hdGNoID0gcmVtYWluaW5nQ29udGVudC5tYXRjaChkdlByb2plY3RSZWdleCk7XHJcblx0XHRpZiAobWF0Y2ggJiYgbWF0Y2hbMV0pIHtcclxuXHRcdFx0dGFzay5tZXRhZGF0YS5wcm9qZWN0ID0gbWF0Y2hbMV0udHJpbSgpO1xyXG5cdFx0XHRyZW1haW5pbmdDb250ZW50ID0gcmVtYWluaW5nQ29udGVudC5yZXBsYWNlKG1hdGNoWzBdLCBcIlwiKTtcclxuXHRcdFx0cmV0dXJuIHJlbWFpbmluZ0NvbnRlbnQ7IC8vIEZvdW5kIHByZWZlcnJlZCBmb3JtYXRcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIFRyeSBjb25maWd1cmFibGUgcHJvamVjdCBwcmVmaXggZm9yIGVtb2ppIGZvcm1hdFxyXG5cdGNvbnN0IHByb2plY3RUYWdSZWdleCA9IG5ldyBSZWdFeHAoYCMke3Byb2plY3RQcmVmaXh9LyhbXFxcXHcvLV0rKWApO1xyXG5cdG1hdGNoID0gcmVtYWluaW5nQ29udGVudC5tYXRjaChwcm9qZWN0VGFnUmVnZXgpO1xyXG5cdGlmIChtYXRjaCAmJiBtYXRjaFsxXSkge1xyXG5cdFx0dGFzay5tZXRhZGF0YS5wcm9qZWN0ID0gbWF0Y2hbMV0udHJpbSgpO1xyXG5cdFx0Ly8gRG8gbm90IHJlbW92ZSBoZXJlOyBsZXQgdGFnIGV4dHJhY3Rpb24gaGFuZGxlIGl0XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gcmVtYWluaW5nQ29udGVudDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RDb250ZXh0KFxyXG5cdHRhc2s6IFRhc2ssXHJcblx0Y29udGVudDogc3RyaW5nLFxyXG5cdGZvcm1hdDogTWV0YWRhdGFGb3JtYXQsXHJcblx0cGx1Z2luPzogYW55XHJcbik6IHN0cmluZyB7XHJcblx0bGV0IHJlbWFpbmluZ0NvbnRlbnQgPSBjb250ZW50O1xyXG5cdGNvbnN0IHVzZURhdGF2aWV3ID0gZm9ybWF0ID09PSBcImRhdGF2aWV3XCI7XHJcblx0bGV0IG1hdGNoOiBSZWdFeHBNYXRjaEFycmF5IHwgbnVsbCA9IG51bGw7XHJcblxyXG5cdC8vIEdldCBjb25maWd1cmFibGUgcHJlZml4ZXMgZnJvbSBwbHVnaW4gc2V0dGluZ3NcclxuXHRjb25zdCBjb250ZXh0UHJlZml4ID1cclxuXHRcdHBsdWdpbj8uc2V0dGluZ3M/LmNvbnRleHRUYWdQcmVmaXg/Lltmb3JtYXRdIHx8XHJcblx0XHQoZm9ybWF0ID09PSBcImRhdGF2aWV3XCIgPyBcImNvbnRleHRcIiA6IFwiQFwiKTtcclxuXHJcblx0aWYgKHVzZURhdGF2aWV3KSB7XHJcblx0XHQvLyBDcmVhdGUgZHluYW1pYyByZWdleCBmb3IgZGF0YXZpZXcgZm9ybWF0XHJcblx0XHRjb25zdCBkdkNvbnRleHRSZWdleCA9IG5ldyBSZWdFeHAoXHJcblx0XHRcdGBcXFxcWyR7Y29udGV4dFByZWZpeH06OlxcXFxzKihbXlxcXFxdXSspXFxcXF1gLFxyXG5cdFx0XHRcImlcIlxyXG5cdFx0KTtcclxuXHRcdG1hdGNoID0gcmVtYWluaW5nQ29udGVudC5tYXRjaChkdkNvbnRleHRSZWdleCk7XHJcblx0XHRpZiAobWF0Y2ggJiYgbWF0Y2hbMV0pIHtcclxuXHRcdFx0dGFzay5tZXRhZGF0YS5jb250ZXh0ID0gbWF0Y2hbMV0udHJpbSgpO1xyXG5cdFx0XHRyZW1haW5pbmdDb250ZW50ID0gcmVtYWluaW5nQ29udGVudC5yZXBsYWNlKG1hdGNoWzBdLCBcIlwiKTtcclxuXHRcdFx0cmV0dXJuIHJlbWFpbmluZ0NvbnRlbnQ7IC8vIEZvdW5kIHByZWZlcnJlZCBmb3JtYXRcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIFNraXAgQCBjb250ZXh0cyBpbnNpZGUgd2lraSBsaW5rcyBbWy4uLl1dXHJcblx0Ly8gRmlyc3QsIGV4dHJhY3QgYWxsIHdpa2kgbGluayBwYXR0ZXJuc1xyXG5cdGNvbnN0IHdpa2lMaW5rTWF0Y2hlczogc3RyaW5nW10gPSBbXTtcclxuXHRjb25zdCB3aWtpTGlua1JlZ2V4ID0gL1xcW1xcWyhbXlxcXV0rKVxcXVxcXS9nO1xyXG5cdGxldCB3aWtpTWF0Y2g7XHJcblx0d2hpbGUgKCh3aWtpTWF0Y2ggPSB3aWtpTGlua1JlZ2V4LmV4ZWMocmVtYWluaW5nQ29udGVudCkpICE9PSBudWxsKSB7XHJcblx0XHR3aWtpTGlua01hdGNoZXMucHVzaCh3aWtpTWF0Y2hbMF0pO1xyXG5cdH1cclxuXHJcblx0Ly8gRm9yIGVtb2ppIGZvcm1hdCwgYWx3YXlzIHVzZSBAIHByZWZpeCAobm90IGNvbmZpZ3VyYWJsZSlcclxuXHQvLyBVc2UgLmV4ZWMgdG8gZmluZCB0aGUgZmlyc3QgbWF0Y2ggb25seSBmb3IgQGNvbnRleHRcclxuXHRjb25zdCBjb250ZXh0TWF0Y2ggPSBuZXcgUmVnRXhwKEVNT0pJX0NPTlRFWFRfUkVHRVguc291cmNlLCBcIlwiKS5leGVjKFxyXG5cdFx0cmVtYWluaW5nQ29udGVudFxyXG5cdCk7IC8vIE5vbi1nbG9iYWwgc2VhcmNoIGZvciBmaXJzdFxyXG5cclxuXHRpZiAoY29udGV4dE1hdGNoICYmIGNvbnRleHRNYXRjaFsxXSkge1xyXG5cdFx0Ly8gQ2hlY2sgaWYgdGhpcyBAY29udGV4dCBpcyBpbnNpZGUgYSB3aWtpIGxpbmtcclxuXHRcdGNvbnN0IG1hdGNoUG9zaXRpb24gPSBjb250ZXh0TWF0Y2guaW5kZXg7XHJcblx0XHRjb25zdCBpc0luc2lkZVdpa2lMaW5rID0gd2lraUxpbmtNYXRjaGVzLnNvbWUoKGxpbmspID0+IHtcclxuXHRcdFx0Y29uc3QgbGlua1N0YXJ0ID0gcmVtYWluaW5nQ29udGVudC5pbmRleE9mKGxpbmspO1xyXG5cdFx0XHRjb25zdCBsaW5rRW5kID0gbGlua1N0YXJ0ICsgbGluay5sZW5ndGg7XHJcblx0XHRcdHJldHVybiBtYXRjaFBvc2l0aW9uID49IGxpbmtTdGFydCAmJiBtYXRjaFBvc2l0aW9uIDwgbGlua0VuZDtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIE9ubHkgcHJvY2VzcyBpZiBub3QgaW5zaWRlIGEgd2lraSBsaW5rXHJcblx0XHRpZiAoIWlzSW5zaWRlV2lraUxpbmspIHtcclxuXHRcdFx0dGFzay5tZXRhZGF0YS5jb250ZXh0ID0gY29udGV4dE1hdGNoWzFdLnRyaW0oKTtcclxuXHRcdFx0Ly8gUmVtb3ZlIHRoZSBmaXJzdCBtYXRjaGVkIGNvbnRleHQgdGFnIGhlcmUgdG8gYXZvaWQgaXQgYmVpbmcgcGFyc2VkIGFzIGEgZ2VuZXJhbCB0YWdcclxuXHRcdFx0cmVtYWluaW5nQ29udGVudCA9IHJlbWFpbmluZ0NvbnRlbnQucmVwbGFjZShjb250ZXh0TWF0Y2hbMF0sIFwiXCIpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIHJlbWFpbmluZ0NvbnRlbnQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0VGFncyhcclxuXHR0YXNrOiBUYXNrLFxyXG5cdGNvbnRlbnQ6IHN0cmluZyxcclxuXHRmb3JtYXQ6IE1ldGFkYXRhRm9ybWF0LFxyXG5cdHBsdWdpbj86IGFueVxyXG4pOiBzdHJpbmcge1xyXG5cdGxldCByZW1haW5pbmdDb250ZW50ID0gY29udGVudDtcclxuXHRjb25zdCB1c2VEYXRhdmlldyA9IGZvcm1hdCA9PT0gXCJkYXRhdmlld1wiO1xyXG5cclxuXHQvLyBJZiB1c2luZyBEYXRhdmlldywgcmVtb3ZlIGFsbCBwb3RlbnRpYWwgRFYgZmllbGRzIGZpcnN0XHJcblx0aWYgKHVzZURhdGF2aWV3KSB7XHJcblx0XHRyZW1haW5pbmdDb250ZW50ID0gcmVtYWluaW5nQ29udGVudC5yZXBsYWNlKFxyXG5cdFx0XHRBTllfREFUQVZJRVdfRklFTERfUkVHRVgsXHJcblx0XHRcdFwiXCJcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvLyBFeGNsdWRlIGxpbmtzIChib3RoIHdpa2kgYW5kIG1hcmtkb3duKSBhbmQgaW5saW5lIGNvZGUgZnJvbSB0YWcgcHJvY2Vzc2luZ1xyXG5cdGNvbnN0IGdlbmVyYWxXaWtpTGlua1JlZ2V4ID0gL1xcW1xcWyhbXlxcXVxcW1xcXV0rKVxcXVxcXS9nOyAvLyBNYXRjaGVzIFtbY29udGVudF1dXHJcblx0Y29uc3QgYWxpYXNlZFdpa2lMaW5rUmVnZXggPSAvXFxbXFxbKD8hLis/OikoW15cXF1cXFtcXF1dKylcXHwoW15cXF1cXFtcXF1dKylcXF1cXF0vZzsgLy8gTWF0Y2hlcyBbW2xpbmt8YWxpYXNdXVxyXG5cdGNvbnN0IG1hcmtkb3duTGlua1JlZ2V4ID0gL1xcWyhbXlxcW1xcXV0qKVxcXVxcKCguKj8pXFwpL2c7XHJcblx0Y29uc3QgaW5saW5lQ29kZVJlZ2V4ID0gL2AoW15gXSs/KWAvZzsgLy8gTWF0Y2hlcyBgY29kZWBcclxuXHJcblx0Y29uc3QgZXhjbHVzaW9uczogeyB0ZXh0OiBzdHJpbmc7IHN0YXJ0OiBudW1iZXI7IGVuZDogbnVtYmVyIH1bXSA9IFtdO1xyXG5cdGxldCBtYXRjaDogUmVnRXhwRXhlY0FycmF5IHwgbnVsbDtcclxuXHRsZXQgcHJvY2Vzc2VkQ29udGVudCA9IHJlbWFpbmluZ0NvbnRlbnQ7XHJcblxyXG5cdC8vIEZpbmQgYWxsIGdlbmVyYWwgd2lraSBsaW5rcyBhbmQgdGhlaXIgcG9zaXRpb25zXHJcblx0Z2VuZXJhbFdpa2lMaW5rUmVnZXgubGFzdEluZGV4ID0gMDtcclxuXHR3aGlsZSAoKG1hdGNoID0gZ2VuZXJhbFdpa2lMaW5rUmVnZXguZXhlYyhyZW1haW5pbmdDb250ZW50KSkgIT09IG51bGwpIHtcclxuXHRcdGV4Y2x1c2lvbnMucHVzaCh7XHJcblx0XHRcdHRleHQ6IG1hdGNoWzBdLFxyXG5cdFx0XHRzdGFydDogbWF0Y2guaW5kZXgsXHJcblx0XHRcdGVuZDogbWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGgsXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIEZpbmQgYWxsIGFsaWFzZWQgd2lraSBsaW5rc1xyXG5cdGFsaWFzZWRXaWtpTGlua1JlZ2V4Lmxhc3RJbmRleCA9IDA7XHJcblx0d2hpbGUgKChtYXRjaCA9IGFsaWFzZWRXaWtpTGlua1JlZ2V4LmV4ZWMocmVtYWluaW5nQ29udGVudCkpICE9PSBudWxsKSB7XHJcblx0XHRjb25zdCBvdmVybGFwcyA9IGV4Y2x1c2lvbnMuc29tZShcclxuXHRcdFx0KGV4KSA9PlxyXG5cdFx0XHRcdE1hdGgubWF4KGV4LnN0YXJ0LCBtYXRjaCEuaW5kZXgpIDxcclxuXHRcdFx0XHRNYXRoLm1pbihleC5lbmQsIG1hdGNoIS5pbmRleCArIG1hdGNoIVswXS5sZW5ndGgpXHJcblx0XHQpO1xyXG5cdFx0aWYgKCFvdmVybGFwcykge1xyXG5cdFx0XHRleGNsdXNpb25zLnB1c2goe1xyXG5cdFx0XHRcdHRleHQ6IG1hdGNoIVswXSxcclxuXHRcdFx0XHRzdGFydDogbWF0Y2ghLmluZGV4LFxyXG5cdFx0XHRcdGVuZDogbWF0Y2ghLmluZGV4ICsgbWF0Y2ghWzBdLmxlbmd0aCxcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBGaW5kIGFsbCBtYXJrZG93biBsaW5rc1xyXG5cdG1hcmtkb3duTGlua1JlZ2V4Lmxhc3RJbmRleCA9IDA7XHJcblx0d2hpbGUgKChtYXRjaCA9IG1hcmtkb3duTGlua1JlZ2V4LmV4ZWMocmVtYWluaW5nQ29udGVudCkpICE9PSBudWxsKSB7XHJcblx0XHRjb25zdCBvdmVybGFwcyA9IGV4Y2x1c2lvbnMuc29tZShcclxuXHRcdFx0KGV4KSA9PlxyXG5cdFx0XHRcdE1hdGgubWF4KGV4LnN0YXJ0LCBtYXRjaCEuaW5kZXgpIDxcclxuXHRcdFx0XHRNYXRoLm1pbihleC5lbmQsIG1hdGNoIS5pbmRleCArIG1hdGNoIVswXS5sZW5ndGgpXHJcblx0XHQpO1xyXG5cdFx0aWYgKCFvdmVybGFwcykge1xyXG5cdFx0XHRleGNsdXNpb25zLnB1c2goe1xyXG5cdFx0XHRcdHRleHQ6IG1hdGNoIVswXSxcclxuXHRcdFx0XHRzdGFydDogbWF0Y2ghLmluZGV4LFxyXG5cdFx0XHRcdGVuZDogbWF0Y2ghLmluZGV4ICsgbWF0Y2ghWzBdLmxlbmd0aCxcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBGaW5kIGFsbCBpbmxpbmUgY29kZSBibG9ja3NcclxuXHRpbmxpbmVDb2RlUmVnZXgubGFzdEluZGV4ID0gMDtcclxuXHR3aGlsZSAoKG1hdGNoID0gaW5saW5lQ29kZVJlZ2V4LmV4ZWMocmVtYWluaW5nQ29udGVudCkpICE9PSBudWxsKSB7XHJcblx0XHQvLyBDaGVjayBmb3Igb3ZlcmxhcHMgd2l0aCBleGlzdGluZyBleGNsdXNpb25zIChlLmcuIGEgY29kZSBibG9jayBpbnNpZGUgYSBsaW5rLCB0aG91Z2ggdW5saWtlbHkgZm9yIHRhZ3MpXHJcblx0XHRjb25zdCBvdmVybGFwcyA9IGV4Y2x1c2lvbnMuc29tZShcclxuXHRcdFx0KGV4KSA9PlxyXG5cdFx0XHRcdE1hdGgubWF4KGV4LnN0YXJ0LCBtYXRjaCEuaW5kZXgpIDxcclxuXHRcdFx0XHRNYXRoLm1pbihleC5lbmQsIG1hdGNoIS5pbmRleCArIG1hdGNoIVswXS5sZW5ndGgpXHJcblx0XHQpO1xyXG5cdFx0aWYgKCFvdmVybGFwcykge1xyXG5cdFx0XHRleGNsdXNpb25zLnB1c2goe1xyXG5cdFx0XHRcdHRleHQ6IG1hdGNoIVswXSwgLy8gU3RvcmUgdGhlIGZ1bGwgbWF0Y2ggYGNvZGVgXHJcblx0XHRcdFx0c3RhcnQ6IG1hdGNoIS5pbmRleCxcclxuXHRcdFx0XHRlbmQ6IG1hdGNoIS5pbmRleCArIG1hdGNoIVswXS5sZW5ndGgsXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gU29ydCBleGNsdXNpb25zIGJ5IHN0YXJ0IHBvc2l0aW9uIHRvIHByb2Nlc3MgdGhlbSBjb3JyZWN0bHlcclxuXHRleGNsdXNpb25zLnNvcnQoKGEsIGIpID0+IGEuc3RhcnQgLSBiLnN0YXJ0KTtcclxuXHJcblx0Ly8gVGVtcG9yYXJpbHkgcmVwbGFjZSBleGNsdWRlZCBzZWdtZW50cyAobGlua3MsIGlubGluZSBjb2RlKSB3aXRoIHBsYWNlaG9sZGVyc1xyXG5cdGlmIChleGNsdXNpb25zLmxlbmd0aCA+IDApIHtcclxuXHRcdC8vIFVzaW5nIHNwYWNlcyBhcyBwbGFjZWhvbGRlcnMgbWFpbnRhaW5zIG9yaWdpbmFsIHN0cmluZyBsZW5ndGggYW5kIGluZGljZXMgZm9yIHN1YnNlcXVlbnQgb3BlcmF0aW9ucy5cclxuXHRcdGxldCB0ZW1wUHJvY2Vzc2VkQ29udGVudCA9IHByb2Nlc3NlZENvbnRlbnQuc3BsaXQoXCJcIik7XHJcblxyXG5cdFx0Zm9yIChjb25zdCBleCBvZiBleGNsdXNpb25zKSB7XHJcblx0XHRcdC8vIFJlcGxhY2UgdGhlIGNvbnRlbnQgb2YgdGhlIGV4Y2x1c2lvbiB3aXRoIHNwYWNlc1xyXG5cdFx0XHRmb3IgKGxldCBpID0gZXguc3RhcnQ7IGkgPCBleC5lbmQ7IGkrKykge1xyXG5cdFx0XHRcdC8vIENoZWNrIGJvdW5kYXJ5IGNvbmRpdGlvbiBmb3IgdGVtcFByb2Nlc3NlZENvbnRlbnRcclxuXHRcdFx0XHRpZiAoaSA8IHRlbXBQcm9jZXNzZWRDb250ZW50Lmxlbmd0aCkge1xyXG5cdFx0XHRcdFx0dGVtcFByb2Nlc3NlZENvbnRlbnRbaV0gPSBcIiBcIjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHByb2Nlc3NlZENvbnRlbnQgPSB0ZW1wUHJvY2Vzc2VkQ29udGVudC5qb2luKFwiXCIpO1xyXG5cdH1cclxuXHJcblx0Ly8gRmluZCBhbGwgI3RhZ3MgaW4gdGhlIGNvbnRlbnQgd2l0aCBsaW5rcyBhbmQgaW5saW5lIGNvZGUgcmVwbGFjZWQgYnkgcGxhY2Vob2xkZXJzXHJcblx0Ly8gQnV0IGlnbm9yZSBlc2NhcGVkIHRhZ3MgKFxcI3RhZylcclxuXHRjb25zdCBhbGxUYWdNYXRjaGVzID0gcHJvY2Vzc2VkQ29udGVudC5tYXRjaChFTU9KSV9UQUdfUkVHRVgpIHx8IFtdO1xyXG5cdC8vIEZpbHRlciBvdXQgZXNjYXBlZCB0YWdzIGJ5IGNoZWNraW5nIHRoZSBvcmlnaW5hbCBjb250ZW50XHJcblx0Y29uc3QgdmFsaWRUYWdzOiBzdHJpbmdbXSA9IFtdO1xyXG5cdGZvciAoY29uc3QgdGFnIG9mIGFsbFRhZ01hdGNoZXMpIHtcclxuXHRcdGNvbnN0IHRhZ0luZGV4ID0gcHJvY2Vzc2VkQ29udGVudC5pbmRleE9mKHRhZyk7XHJcblx0XHRpZiAodGFnSW5kZXggPiAwKSB7XHJcblx0XHRcdC8vIENoZWNrIGlmIHRoZSBjaGFyYWN0ZXIgYmVmb3JlIHRoZSAjIGlzIGEgYmFja3NsYXNoIGluIHRoZSBvcmlnaW5hbCBjb250ZW50XHJcblx0XHRcdC8vIFdlIG5lZWQgdG8gY2hlY2sgdGhlIHJlbWFpbmluZ0NvbnRlbnQgKG5vdCBwcm9jZXNzZWRDb250ZW50KSBmb3IgdGhlIGJhY2tzbGFzaFxyXG5cdFx0XHRjb25zdCBvcmlnaW5hbFRhZ0luZGV4ID0gcmVtYWluaW5nQ29udGVudC5pbmRleE9mKHRhZyk7XHJcblx0XHRcdGlmIChvcmlnaW5hbFRhZ0luZGV4ID4gMCAmJiByZW1haW5pbmdDb250ZW50W29yaWdpbmFsVGFnSW5kZXggLSAxXSA9PT0gJ1xcXFwnKSB7XHJcblx0XHRcdFx0Ly8gVGhpcyBpcyBhbiBlc2NhcGVkIHRhZywgc2tpcCBpdFxyXG5cdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHR2YWxpZFRhZ3MucHVzaCh0YWcudHJpbSgpKTtcclxuXHR9XHJcblx0dGFzay5tZXRhZGF0YS50YWdzID0gdmFsaWRUYWdzO1xyXG5cclxuXHQvLyBHZXQgY29uZmlndXJhYmxlIHByb2plY3QgcHJlZml4XHJcblx0Y29uc3QgcHJvamVjdFByZWZpeCA9XHJcblx0XHRwbHVnaW4/LnNldHRpbmdzPy5wcm9qZWN0VGFnUHJlZml4Py5bZm9ybWF0XSB8fCBcInByb2plY3RcIjtcclxuXHRjb25zdCBlbW9qaVByb2plY3RQcmVmaXggPSBgIyR7cHJvamVjdFByZWZpeH0vYDtcclxuXHJcblx0Ly8gSWYgdXNpbmcgJ3Rhc2tzJyAoZW1vamkpIGZvcm1hdCwgZGVyaXZlIHByb2plY3QgZnJvbSB0YWdzIGlmIG5vdCBzZXRcclxuXHQvLyBBbHNvIG1ha2Ugc3VyZSBwcm9qZWN0IHdhc24ndCBhbHJlYWR5IHNldCBieSBEViBmb3JtYXQgYmVmb3JlIGZhbGxpbmcgYmFja1xyXG5cdGlmICghdXNlRGF0YXZpZXcgJiYgIXRhc2subWV0YWRhdGEucHJvamVjdCkge1xyXG5cdFx0Y29uc3QgcHJvamVjdFRhZyA9IHRhc2subWV0YWRhdGEudGFncy5maW5kKFxyXG5cdFx0XHQodGFnOiBzdHJpbmcpID0+XHJcblx0XHRcdFx0dHlwZW9mIHRhZyA9PT0gXCJzdHJpbmdcIiAmJiB0YWcuc3RhcnRzV2l0aChlbW9qaVByb2plY3RQcmVmaXgpXHJcblx0XHQpO1xyXG5cdFx0aWYgKHByb2plY3RUYWcpIHtcclxuXHRcdFx0dGFzay5tZXRhZGF0YS5wcm9qZWN0ID0gcHJvamVjdFRhZy5zdWJzdHJpbmcoXHJcblx0XHRcdFx0ZW1vamlQcm9qZWN0UHJlZml4Lmxlbmd0aFxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gSWYgdXNpbmcgRGF0YXZpZXcgZm9ybWF0LCBmaWx0ZXIgb3V0IGFueSByZW1haW5pbmcgI3Byb2plY3QvIHRhZ3MgZnJvbSB0aGUgdGFnIGxpc3RcclxuXHRpZiAodXNlRGF0YXZpZXcpIHtcclxuXHRcdHRhc2subWV0YWRhdGEudGFncyA9IHRhc2subWV0YWRhdGEudGFncy5maWx0ZXIoXHJcblx0XHRcdCh0YWc6IHN0cmluZykgPT5cclxuXHRcdFx0XHR0eXBlb2YgdGFnID09PSBcInN0cmluZ1wiICYmICF0YWcuc3RhcnRzV2l0aChlbW9qaVByb2plY3RQcmVmaXgpXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0Ly8gUmVtb3ZlIGZvdW5kIHRhZ3MgKGluY2x1ZGluZyBwb3RlbnRpYWxseSAjcHJvamVjdC8gdGFncyBpZiBmb3JtYXQgaXMgJ3Rhc2tzJykgZnJvbSB0aGUgb3JpZ2luYWwgcmVtYWluaW5nIGNvbnRlbnRcclxuXHRsZXQgY29udGVudFdpdGhvdXRUYWdzT3JDb250ZXh0ID0gcmVtYWluaW5nQ29udGVudDtcclxuXHRmb3IgKGNvbnN0IHRhZyBvZiB0YXNrLm1ldGFkYXRhLnRhZ3MpIHtcclxuXHRcdC8vIEVuc3VyZSB0aGUgdGFnIGlzIG5vdCBlbXB0eSBvciBqdXN0ICcjJyBiZWZvcmUgY3JlYXRpbmcgcmVnZXhcclxuXHRcdGlmICh0YWcgJiYgdGFnICE9PSBcIiNcIikge1xyXG5cdFx0XHRjb25zdCBlc2NhcGVkVGFnID0gdGFnLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXFxcXFxdXS9nLCBcIlxcXFwkJlwiKTtcclxuXHRcdFx0Y29uc3QgdGFnUmVnZXggPSBuZXcgUmVnRXhwKGBcXHM/YCArIGVzY2FwZWRUYWcgKyBgKD89XFxzfCQpYCwgXCJnXCIpO1xyXG5cdFx0XHRjb250ZW50V2l0aG91dFRhZ3NPckNvbnRleHQgPSBjb250ZW50V2l0aG91dFRhZ3NPckNvbnRleHQucmVwbGFjZShcclxuXHRcdFx0XHR0YWdSZWdleCxcclxuXHRcdFx0XHRcIlwiXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBBbHNvIHJlbW92ZSBhbnkgcmVtYWluaW5nIEBjb250ZXh0IHRhZ3MsIG1ha2luZyBzdXJlIG5vdCB0byByZW1vdmUgdGhlbSBmcm9tIHdpdGhpbiBsaW5rcyBvciBpbmxpbmUgY29kZVxyXG5cdC8vIFdlIG5lZWQgdG8gcmUtdXNlIHRoZSBgZXhjbHVzaW9uc2AgbG9naWMgZm9yIHRoaXMuXHJcblx0bGV0IGZpbmFsQ29udGVudCA9IFwiXCI7XHJcblx0bGV0IGxhc3RJbmRleCA9IDA7XHJcblx0Ly8gVXNlIHRoZSBvcmlnaW5hbCBgcmVtYWluaW5nQ29udGVudGAgdGhhdCBoYXMgaGFkIHRhZ3MgcmVtb3ZlZCBidXQgbm90IGNvbnRleHQgeWV0LFxyXG5cdC8vIGJ1dCBmb3IgY29udGV4dCByZW1vdmFsLCB3ZSByZWZlciB0byBgZXhjbHVzaW9uc2AgYmFzZWQgb24gdGhlICpvcmlnaW5hbCogY29udGVudC5cclxuXHRsZXQgY29udGVudEZvckNvbnRleHRSZW1vdmFsID0gY29udGVudFdpdGhvdXRUYWdzT3JDb250ZXh0O1xyXG5cclxuXHRpZiAoZXhjbHVzaW9ucy5sZW5ndGggPiAwKSB7XHJcblx0XHQvLyBQcm9jZXNzIGNvbnRlbnQgc2VnbWVudHMgYmV0d2VlbiBleGNsdXNpb25zXHJcblx0XHRmb3IgKGNvbnN0IGV4IG9mIGV4Y2x1c2lvbnMpIHtcclxuXHRcdFx0Ly8gU2VnbWVudCBiZWZvcmUgdGhlIGN1cnJlbnQgZXhjbHVzaW9uXHJcblx0XHRcdGNvbnN0IHNlZ21lbnQgPSBjb250ZW50Rm9yQ29udGV4dFJlbW92YWwuc3Vic3RyaW5nKFxyXG5cdFx0XHRcdGxhc3RJbmRleCxcclxuXHRcdFx0XHRleC5zdGFydFxyXG5cdFx0XHQpO1xyXG5cdFx0XHQvLyBSZW1vdmUgQGNvbnRleHQgZnJvbSB0aGlzIHNlZ21lbnRcclxuXHRcdFx0ZmluYWxDb250ZW50ICs9IHNlZ21lbnQucmVwbGFjZShFTU9KSV9DT05URVhUX1JFR0VYLCBcIlwiKS50cmltKCk7IC8vIFVzaW5nIGdsb2JhbCByZWdleCBoZXJlXHJcblx0XHRcdC8vIEFkZCB0aGUgb3JpZ2luYWwgZXhjbHVkZWQgdGV4dCAobGluayBvciBjb2RlKSBiYWNrXHJcblx0XHRcdGZpbmFsQ29udGVudCArPSBleC50ZXh0OyAvLyBBZGQgdGhlIG9yaWdpbmFsIGxpbmsvY29kZSB0ZXh0IGJhY2tcclxuXHRcdFx0bGFzdEluZGV4ID0gZXguZW5kO1xyXG5cdFx0fVxyXG5cdFx0Ly8gUHJvY2VzcyB0aGUgcmVtYWluaW5nIHNlZ21lbnQgYWZ0ZXIgdGhlIGxhc3QgZXhjbHVzaW9uXHJcblx0XHRjb25zdCBsYXN0U2VnbWVudCA9IGNvbnRlbnRGb3JDb250ZXh0UmVtb3ZhbC5zdWJzdHJpbmcobGFzdEluZGV4KTtcclxuXHRcdGZpbmFsQ29udGVudCArPSBsYXN0U2VnbWVudC5yZXBsYWNlKEVNT0pJX0NPTlRFWFRfUkVHRVgsIFwiXCIpLnRyaW0oKTsgLy8gR2xvYmFsIHJlZ2V4XHJcblx0fSBlbHNlIHtcclxuXHRcdC8vIE5vIGV4Y2x1c2lvbnMsIHNhZmUgdG8gcmVtb3ZlIEBjb250ZXh0IGRpcmVjdGx5IGZyb20gdGhlIHdob2xlIGNvbnRlbnRcclxuXHRcdGZpbmFsQ29udGVudCA9IGNvbnRlbnRGb3JDb250ZXh0UmVtb3ZhbFxyXG5cdFx0XHQucmVwbGFjZShFTU9KSV9DT05URVhUX1JFR0VYLCBcIlwiKVxyXG5cdFx0XHQudHJpbSgpOyAvLyBHbG9iYWwgcmVnZXhcclxuXHR9XHJcblxyXG5cdC8vIENsZWFuIHVwIGV4dHJhIHNwYWNlcyB0aGF0IG1pZ2h0IHJlc3VsdCBmcm9tIHJlcGxhY2VtZW50c1xyXG5cdGZpbmFsQ29udGVudCA9IGZpbmFsQ29udGVudC5yZXBsYWNlKC9cXHN7Mix9L2csIFwiIFwiKS50cmltKCk7XHJcblxyXG5cdHJldHVybiBmaW5hbENvbnRlbnQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZXQgdGhlIGVmZmVjdGl2ZSBwcm9qZWN0IG5hbWUgZnJvbSBhIHRhc2ssIHByaW9yaXRpemluZyBvcmlnaW5hbCBwcm9qZWN0IG92ZXIgdGdQcm9qZWN0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RWZmZWN0aXZlUHJvamVjdCh0YXNrOiBUYXNrKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcclxuXHQvLyBIYW5kbGUgdW5kZWZpbmVkIG9yIG51bGwgbWV0YWRhdGFcclxuXHRpZiAoIXRhc2subWV0YWRhdGEpIHtcclxuXHRcdHJldHVybiB1bmRlZmluZWQ7XHJcblx0fVxyXG5cclxuXHQvLyBDaGVjayBvcmlnaW5hbCBwcm9qZWN0IC0gbXVzdCBiZSBub24tZW1wdHkgYW5kIG5vdCBqdXN0IHdoaXRlc3BhY2VcclxuXHRpZiAodGFzay5tZXRhZGF0YS5wcm9qZWN0ICYmIHRhc2subWV0YWRhdGEucHJvamVjdC50cmltKCkpIHtcclxuXHRcdHJldHVybiB0YXNrLm1ldGFkYXRhLnByb2plY3Q7XHJcblx0fVxyXG5cclxuXHQvLyBDaGVjayB0Z1Byb2plY3QgLSBtdXN0IGV4aXN0LCBiZSBhbiBvYmplY3QsIGFuZCBoYXZlIGEgbm9uLWVtcHR5IG5hbWVcclxuXHRpZiAoXHJcblx0XHR0YXNrLm1ldGFkYXRhLnRnUHJvamVjdCAmJlxyXG5cdFx0dHlwZW9mIHRhc2subWV0YWRhdGEudGdQcm9qZWN0ID09PSBcIm9iamVjdFwiICYmXHJcblx0XHR0YXNrLm1ldGFkYXRhLnRnUHJvamVjdC5uYW1lICYmXHJcblx0XHR0YXNrLm1ldGFkYXRhLnRnUHJvamVjdC5uYW1lLnRyaW0oKVxyXG5cdCkge1xyXG5cdFx0cmV0dXJuIHRhc2subWV0YWRhdGEudGdQcm9qZWN0Lm5hbWU7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gdW5kZWZpbmVkO1xyXG59XHJcblxyXG4vKipcclxuICogQ2hlY2sgaWYgdGhlIHByb2plY3QgaXMgcmVhZC1vbmx5IChmcm9tIHRnUHJvamVjdClcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBpc1Byb2plY3RSZWFkb25seSh0YXNrOiBUYXNrKTogYm9vbGVhbiB7XHJcblx0Ly8gSGFuZGxlIHVuZGVmaW5lZCBvciBudWxsIG1ldGFkYXRhXHJcblx0aWYgKCF0YXNrLm1ldGFkYXRhKSB7XHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblx0fVxyXG5cclxuXHQvLyBJZiB0aGVyZSdzIGFuIG9yaWdpbmFsIHByb2plY3QgdGhhdCdzIG5vdCBlbXB0eS93aGl0ZXNwYWNlLCBpdCdzIGFsd2F5cyBlZGl0YWJsZVxyXG5cdGlmICh0YXNrLm1ldGFkYXRhLnByb2plY3QgJiYgdGFzay5tZXRhZGF0YS5wcm9qZWN0LnRyaW0oKSkge1xyXG5cdFx0cmV0dXJuIGZhbHNlO1xyXG5cdH1cclxuXHJcblx0Ly8gSWYgb25seSB0Z1Byb2plY3QgZXhpc3RzIGFuZCBpcyB2YWxpZCwgY2hlY2sgaXRzIHJlYWRvbmx5IGZsYWdcclxuXHRpZiAoXHJcblx0XHR0YXNrLm1ldGFkYXRhLnRnUHJvamVjdCAmJlxyXG5cdFx0dHlwZW9mIHRhc2subWV0YWRhdGEudGdQcm9qZWN0ID09PSBcIm9iamVjdFwiICYmXHJcblx0XHR0YXNrLm1ldGFkYXRhLnRnUHJvamVjdC5uYW1lICYmXHJcblx0XHR0YXNrLm1ldGFkYXRhLnRnUHJvamVjdC5uYW1lLnRyaW0oKVxyXG5cdCkge1xyXG5cdFx0cmV0dXJuIHRhc2subWV0YWRhdGEudGdQcm9qZWN0LnJlYWRvbmx5IHx8IGZhbHNlO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIGZhbHNlO1xyXG59XHJcblxyXG4vKipcclxuICogQ2hlY2sgaWYgYSB0YXNrIGhhcyBhbnkgcHJvamVjdCAob3JpZ2luYWwgb3IgdGdQcm9qZWN0KVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGhhc1Byb2plY3QodGFzazogVGFzayk6IGJvb2xlYW4ge1xyXG5cdC8vIEhhbmRsZSB1bmRlZmluZWQgb3IgbnVsbCBtZXRhZGF0YVxyXG5cdGlmICghdGFzay5tZXRhZGF0YSkge1xyXG5cdFx0cmV0dXJuIGZhbHNlO1xyXG5cdH1cclxuXHJcblx0Ly8gQ2hlY2sgaWYgb3JpZ2luYWwgcHJvamVjdCBleGlzdHMgYW5kIGlzIG5vdCBlbXB0eS93aGl0ZXNwYWNlXHJcblx0aWYgKHRhc2subWV0YWRhdGEucHJvamVjdCAmJiB0YXNrLm1ldGFkYXRhLnByb2plY3QudHJpbSgpKSB7XHJcblx0XHRyZXR1cm4gdHJ1ZTtcclxuXHR9XHJcblxyXG5cdC8vIENoZWNrIGlmIHRnUHJvamVjdCBleGlzdHMsIGlzIHZhbGlkIG9iamVjdCwgYW5kIGhhcyBub24tZW1wdHkgbmFtZVxyXG5cdGlmIChcclxuXHRcdHRhc2subWV0YWRhdGEudGdQcm9qZWN0ICYmXHJcblx0XHR0eXBlb2YgdGFzay5tZXRhZGF0YS50Z1Byb2plY3QgPT09IFwib2JqZWN0XCIgJiZcclxuXHRcdHRhc2subWV0YWRhdGEudGdQcm9qZWN0Lm5hbWUgJiZcclxuXHRcdHRhc2subWV0YWRhdGEudGdQcm9qZWN0Lm5hbWUudHJpbSgpXHJcblx0KSB7XHJcblx0XHRyZXR1cm4gdHJ1ZTtcclxuXHR9XHJcblxyXG5cdHJldHVybiBmYWxzZTtcclxufVxyXG4iXX0=