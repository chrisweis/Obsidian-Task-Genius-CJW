/**
 * Configurable Markdown Task Parser
 * Based on Rust implementation design with TypeScript adaptation
 */
import { MetadataParseMode, } from "../../types/TaskParserConfig";
import { parseLocalDate } from "@/utils/date/date-formatter";
import { TASK_REGEX } from "@/common/regex-define";
import { ContextDetector } from "@/parsers/context-detector";
export class MarkdownTaskParser {
    constructor(config, timeParsingService) {
        this.tasks = [];
        this.indentStack = [];
        this.config = config;
        // Extract custom date formats if available
        this.customDateFormats = config.customDateFormats;
        this.timeParsingService = timeParsingService;
    }
    // Public alias for extractMetadataAndTags
    extractMetadataAndTags(content) {
        return this.extractMetadataAndTagsInternal(content);
    }
    /**
     * Create parser with predefined status mapping
     */
    static createWithStatusMapping(config, statusMapping, timeParsingService) {
        const newConfig = Object.assign(Object.assign({}, config), { statusMapping });
        return new MarkdownTaskParser(newConfig, timeParsingService);
    }
    /**
     * Parse markdown content and return enhanced tasks
     */
    parse(input, filePath = "", fileMetadata, projectConfigData, tgProject) {
        this.reset();
        this.fileMetadata = fileMetadata;
        // Store project config data if provided
        if (projectConfigData) {
            this.projectConfigCache = projectConfigData;
        }
        const lines = input.split(/\r?\n/);
        let i = 0;
        let parseIteration = 0;
        let inCodeBlock = false;
        while (i < lines.length) {
            parseIteration++;
            if (parseIteration > this.config.maxParseIterations) {
                console.warn("Warning: Maximum parse iterations reached, stopping to prevent infinite loop");
                break;
            }
            const line = lines[i];
            // Check for code block fences
            if (line.trim().startsWith("```") ||
                line.trim().startsWith("~~~")) {
                inCodeBlock = !inCodeBlock;
                i++;
                continue;
            }
            if (inCodeBlock) {
                i++;
                continue;
            }
            // Check if it's a heading line
            if (this.config.parseHeadings) {
                const headingResult = this.extractHeading(line);
                if (headingResult) {
                    const [level, headingText] = headingResult;
                    this.currentHeading = headingText;
                    this.currentHeadingLevel = level;
                    i++;
                    continue;
                }
            }
            const taskLineResult = this.extractTaskLine(line);
            if (taskLineResult) {
                const [actualSpaces, , content, listMarker] = taskLineResult;
                const taskId = `${filePath}-L${i}`;
                const [parentId, indentLevel] = this.findParentAndLevel(actualSpaces);
                const [taskContent, rawStatus] = this.parseTaskContent(content);
                const completed = rawStatus.toLowerCase() === "x";
                const status = this.getStatusFromMapping(rawStatus);
                const [cleanedContent, metadata, tags] = this.extractMetadataAndTagsInternal(taskContent);
                // Inherit metadata from file frontmatter
                // A task is a subtask if it has a parent
                const isSubtask = parentId !== undefined;
                const inheritedMetadata = this.inheritFileMetadata(metadata, isSubtask);
                // Extract time components from task content using enhanced time parsing
                const enhancedMetadata = this.extractTimeComponents(taskContent, inheritedMetadata);
                // Process inherited tags and merge with task's own tags
                let finalTags = tags;
                if (inheritedMetadata.tags) {
                    try {
                        const inheritedTags = JSON.parse(inheritedMetadata.tags);
                        if (Array.isArray(inheritedTags)) {
                            finalTags = this.mergeTags(tags, inheritedTags);
                        }
                    }
                    catch (e) {
                        // If parsing fails, treat as a single tag
                        finalTags = this.mergeTags(tags, [
                            inheritedMetadata.tags,
                        ]);
                    }
                }
                // Prefer up-to-date detection for current file; fall back to provided tgProject
                const taskTgProject = this.determineTgProject(filePath) || tgProject;
                // Check for multiline comments
                const [comment, linesToSkip] = this.config.parseComments && i + 1 < lines.length
                    ? this.extractMultilineComment(lines, i + 1, actualSpaces)
                    : [undefined, 0];
                i += linesToSkip;
                // Debug: Log priority extraction for each task
                const extractedPriority = this.extractLegacyPriority(inheritedMetadata);
                const enhancedTask = {
                    id: taskId,
                    content: cleanedContent,
                    status,
                    rawStatus,
                    completed,
                    indentLevel,
                    parentId,
                    childrenIds: [],
                    metadata: enhancedMetadata,
                    tags: finalTags,
                    comment,
                    lineNumber: i + 1,
                    actualIndent: actualSpaces,
                    heading: this.currentHeading,
                    headingLevel: this.currentHeadingLevel,
                    listMarker,
                    filePath,
                    originalMarkdown: line,
                    tgProject: taskTgProject,
                    // Legacy fields for backward compatibility
                    line: i,
                    children: [],
                    priority: extractedPriority,
                    startDate: this.extractLegacyDate(enhancedMetadata, "startDate"),
                    dueDate: this.extractLegacyDate(enhancedMetadata, "dueDate"),
                    scheduledDate: this.extractLegacyDate(enhancedMetadata, "scheduledDate"),
                    completedDate: this.extractLegacyDate(enhancedMetadata, "completedDate"),
                    createdDate: this.extractLegacyDate(enhancedMetadata, "createdDate"),
                    recurrence: enhancedMetadata.recurrence,
                    project: enhancedMetadata.project,
                    context: enhancedMetadata.context,
                };
                if (parentId && this.tasks.length > 0) {
                    const parentTask = this.tasks.find((t) => t.id === parentId);
                    if (parentTask) {
                        parentTask.childrenIds.push(taskId);
                        parentTask.children.push(taskId); // Legacy field
                    }
                }
                this.updateIndentStack(taskId, indentLevel, actualSpaces);
                this.tasks.push(enhancedTask);
            }
            i++;
        }
        return [...this.tasks];
    }
    /**
     * Parse and return legacy Task format for compatibility
     */
    parseLegacy(input, filePath = "", fileMetadata, projectConfigData, tgProject) {
        const enhancedTasks = this.parse(input, filePath, fileMetadata, projectConfigData, tgProject);
        return enhancedTasks.map((task) => this.convertToLegacyTask(task));
    }
    /**
     * Parse a single task line
     */
    parseTask(line, filePath = "", lineNum = 0) {
        const enhancedTask = this.parse(line, filePath);
        return this.convertToLegacyTask(Object.assign(Object.assign({}, enhancedTask[0]), { line: lineNum, id: `${filePath}-L${lineNum}` }));
    }
    reset() {
        this.tasks = [];
        this.indentStack = [];
        this.currentHeading = undefined;
        this.currentHeadingLevel = undefined;
    }
    extractTaskLine(line) {
        // Preserve trailing spaces to allow parsing of empty-content tasks like "- [ ] "
        const trimmed = line.trimStart();
        const actualSpaces = line.length - trimmed.length;
        if (this.isTaskLine(trimmed)) {
            const listMarker = this.extractListMarker(trimmed);
            return [actualSpaces, actualSpaces, trimmed, listMarker];
        }
        return null;
    }
    extractListMarker(trimmed) {
        // Check unordered list markers
        for (const marker of ["-", "*", "+"]) {
            if (trimmed.startsWith(marker)) {
                return marker;
            }
        }
        // Check ordered list markers
        const chars = trimmed.split("");
        let i = 0;
        while (i < chars.length && /\d/.test(chars[i])) {
            i++;
        }
        if (i > 0 && i < chars.length) {
            if (chars[i] === "." || chars[i] === ")") {
                return chars.slice(0, i + 1).join("");
            }
        }
        // Fallback: return first character
        return trimmed.charAt(0) || " ";
    }
    isTaskLine(trimmed) {
        // Use existing TASK_REGEX from common/regex-define
        return TASK_REGEX.test(trimmed);
    }
    parseTaskContent(content) {
        const taskMatch = content.match(TASK_REGEX);
        if (taskMatch &&
            taskMatch[4] !== undefined &&
            taskMatch[5] !== undefined) {
            const status = taskMatch[4];
            const taskContent = taskMatch[5].trim();
            return [taskContent, status];
        }
        // Fallback - treat as unchecked task
        return [content, " "];
    }
    extractMetadataAndTagsInternal(content) {
        var _a;
        const metadata = {};
        const tags = [];
        let cleanedContent = "";
        let remaining = content;
        let metadataIteration = 0;
        while (metadataIteration < this.config.maxMetadataIterations) {
            metadataIteration++;
            let foundMatch = false;
            // Check dataview format metadata [key::value]
            if (this.config.parseMetadata &&
                (this.config.metadataParseMode ===
                    MetadataParseMode.DataviewOnly ||
                    this.config.metadataParseMode === MetadataParseMode.Both)) {
                const bracketMatch = this.extractDataviewMetadata(remaining);
                if (bracketMatch) {
                    const [key, value, newRemaining] = bracketMatch;
                    metadata[key] = value;
                    // Debug: Log dataview metadata extraction, especially priority
                    if ((process.env.NODE_ENV === "development" || true) &&
                        key === "priority") {
                        // Always log for debugging
                        console.log("[Parser] Dataview priority found:", {
                            key,
                            value,
                            remaining: remaining.substring(0, 50),
                        });
                    }
                    remaining = newRemaining;
                    foundMatch = true;
                    continue;
                }
            }
            // Check emoji metadata
            if (!foundMatch &&
                this.config.parseMetadata &&
                (this.config.metadataParseMode ===
                    MetadataParseMode.EmojiOnly ||
                    this.config.metadataParseMode === MetadataParseMode.Both)) {
                const emojiMatch = this.extractEmojiMetadata(remaining);
                if (emojiMatch) {
                    const [key, value, beforeContent, afterRemaining] = emojiMatch;
                    // Process tags in the content before emoji
                    const [beforeCleaned, beforeMetadata, beforeTags] = this.extractTagsOnly(beforeContent);
                    // Merge metadata and tags from before content
                    for (const tag of beforeTags) {
                        tags.push(tag);
                    }
                    for (const [k, v] of Object.entries(beforeMetadata)) {
                        metadata[k] = v;
                    }
                    metadata[key] = value;
                    cleanedContent += beforeCleaned;
                    remaining = afterRemaining;
                    foundMatch = true;
                    continue;
                }
            }
            // Check context (@symbol)
            if (!foundMatch && this.config.parseTags) {
                const contextMatch = this.extractContext(remaining);
                if (contextMatch) {
                    const [context, beforeContent, afterRemaining] = contextMatch;
                    metadata.context = context;
                    cleanedContent += beforeContent;
                    remaining = afterRemaining;
                    foundMatch = true;
                    continue;
                }
            }
            // Check tags and special tags
            if (!foundMatch && this.config.parseTags) {
                const tagMatch = this.extractTag(remaining);
                if (tagMatch) {
                    const [tag, beforeContent, afterRemaining] = tagMatch;
                    // Check if it's a special tag format (prefix/value)
                    // Remove # prefix for checking special tags
                    const tagWithoutHash = tag.startsWith("#")
                        ? tag.substring(1)
                        : tag;
                    const slashPos = tagWithoutHash.indexOf("/");
                    if (slashPos !== -1) {
                        const prefix = tagWithoutHash.substring(0, slashPos);
                        const value = tagWithoutHash.substring(slashPos + 1);
                        // Case-insensitive match for special tag prefixes, with debug
                        const metadataKey = (_a = this.config.specialTagPrefixes[prefix]) !== null && _a !== void 0 ? _a : this.config.specialTagPrefixes[prefix.toLowerCase()];
                        console.debug("[TPB] Tag parse", {
                            tag,
                            prefix,
                            mappedKey: metadataKey,
                            keys: Object.keys(this.config.specialTagPrefixes),
                        });
                        if (metadataKey &&
                            this.config.metadataParseMode !==
                                MetadataParseMode.None) {
                            metadata[metadataKey] = value;
                        }
                        else {
                            tags.push(tag);
                        }
                    }
                    else {
                        tags.push(tag);
                    }
                    cleanedContent += beforeContent;
                    remaining = afterRemaining;
                    foundMatch = true;
                    continue;
                }
            }
            if (!foundMatch) {
                cleanedContent += remaining;
                break;
            }
        }
        return [cleanedContent.trim(), metadata, tags];
    }
    /**
     * Extract time components from task content and merge with existing metadata
     */
    extractTimeComponents(taskContent, existingMetadata) {
        if (!this.timeParsingService) {
            // Return existing metadata as EnhancedStandardTaskMetadata without time components
            return Object.assign(Object.assign({}, existingMetadata), { tags: this.safeParseTagsField(existingMetadata.tags), children: [] });
        }
        try {
            // Parse time components from task content
            let timeComponents = {};
            let errors = [];
            let warnings = [];
            try {
                const result = this.timeParsingService.parseTimeComponents(taskContent);
                timeComponents = result.timeComponents;
                errors = result.errors || [];
                warnings = result.warnings || [];
            }
            catch (innerErr) {
                // Swallow JSON.parse or format errors from time parsing; continue without time components
                console.warn("[MarkdownTaskParser] timeParsingService.parseTimeComponents failed, continuing without time components:", innerErr);
                timeComponents = {};
                errors = [];
                warnings = [];
            }
            // Log warnings if any
            if (warnings.length > 0) {
                console.warn(`[MarkdownTaskParser] Time parsing warnings for "${taskContent}":`, warnings);
            }
            // Log errors if any (but don't fail)
            if (errors.length > 0) {
                console.warn(`[MarkdownTaskParser] Time parsing errors for "${taskContent}":`, errors);
            }
            // Create enhanced metadata
            const enhancedMetadata = Object.assign(Object.assign({}, existingMetadata), { tags: this.safeParseTagsField(existingMetadata.tags), children: [] });
            // Add time components if found
            if (Object.keys(timeComponents).length > 0) {
                enhancedMetadata.timeComponents = timeComponents;
                // Create enhanced datetime objects by combining existing dates with time components
                enhancedMetadata.enhancedDates =
                    this.combineTimestampsWithTimeComponents({
                        startDate: existingMetadata.startDate,
                        dueDate: existingMetadata.dueDate,
                        scheduledDate: existingMetadata.scheduledDate,
                        completedDate: existingMetadata.completedDate,
                    }, timeComponents);
            }
            return enhancedMetadata;
        }
        catch (error) {
            console.error(`[MarkdownTaskParser] Failed to extract time components from "${taskContent}":`, error);
            // Return existing metadata without time components on error
            return Object.assign(Object.assign({}, existingMetadata), { tags: this.safeParseTagsField(existingMetadata.tags), children: [] });
        }
    }
    /**
     * Combine date timestamps with time components to create enhanced datetime objects
     */
    combineTimestampsWithTimeComponents(dates, timeComponents) {
        if (!timeComponents) {
            return undefined;
        }
        const enhancedDates = {};
        // Helper function to combine date and time component
        const combineDateTime = (dateValue, timeComponent) => {
            if (!dateValue || !timeComponent) {
                return undefined;
            }
            let date;
            if (typeof dateValue === "string") {
                // Handle date strings like "2025-08-25"
                if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
                    const [year, month, day] = dateValue.split("-").map(Number);
                    date = new Date(year, month - 1, day); // month is 0-based
                }
                else {
                    date = new Date(dateValue);
                }
            }
            else {
                // Handle timestamp numbers
                date = new Date(dateValue);
            }
            if (isNaN(date.getTime())) {
                return undefined;
            }
            const combinedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), timeComponent.hour, timeComponent.minute, timeComponent.second || 0);
            return combinedDate;
        };
        // Combine start date with start time
        if (dates.startDate && timeComponents.startTime) {
            enhancedDates.startDateTime = combineDateTime(dates.startDate, timeComponents.startTime);
        }
        // Combine due date with due time
        if (dates.dueDate && timeComponents.dueTime) {
            enhancedDates.dueDateTime = combineDateTime(dates.dueDate, timeComponents.dueTime);
        }
        // Combine scheduled date with scheduled time
        if (dates.scheduledDate && timeComponents.scheduledTime) {
            enhancedDates.scheduledDateTime = combineDateTime(dates.scheduledDate, timeComponents.scheduledTime);
        }
        // Handle end time - if we have start date and end time, create end datetime
        if (dates.startDate && timeComponents.endTime) {
            enhancedDates.endDateTime = combineDateTime(dates.startDate, timeComponents.endTime);
        }
        // If we have a due date but the time component is scheduledTime (common with "at" keyword),
        // create dueDateTime using scheduledTime
        if (dates.dueDate &&
            !timeComponents.dueTime &&
            timeComponents.scheduledTime) {
            enhancedDates.dueDateTime = combineDateTime(dates.dueDate, timeComponents.scheduledTime);
        }
        // If we have a scheduled date but the time component is dueTime,
        // create scheduledDateTime using dueTime
        if (dates.scheduledDate &&
            !timeComponents.scheduledTime &&
            timeComponents.dueTime) {
            enhancedDates.scheduledDateTime = combineDateTime(dates.scheduledDate, timeComponents.dueTime);
        }
        return Object.keys(enhancedDates).length > 0
            ? enhancedDates
            : undefined;
    }
    extractDataviewMetadata(content) {
        const start = content.indexOf("[");
        if (start === -1)
            return null;
        const end = content.indexOf("]", start);
        if (end === -1)
            return null;
        const bracketContent = content.substring(start + 1, end);
        if (!bracketContent.includes("::"))
            return null;
        const parts = bracketContent.split("::", 2);
        if (parts.length !== 2)
            return null;
        let key = parts[0].trim();
        const value = parts[1].trim();
        // Map dataview keys to standard field names for consistency
        const dataviewKeyMapping = {
            due: "dueDate",
            start: "startDate",
            scheduled: "scheduledDate",
            completion: "completedDate",
            created: "createdDate",
            cancelled: "cancelledDate",
            id: "id",
            dependsOn: "dependsOn",
            onCompletion: "onCompletion",
        };
        // Apply key mapping if it exists
        const mappedKey = dataviewKeyMapping[key.toLowerCase()];
        if (mappedKey) {
            key = mappedKey;
        }
        else {
            // Check if the key matches any configured special tag prefixes
            // specialTagPrefixes format: { "prefixName": "metadataKey" }
            // We need to reverse lookup: find prefix that maps to standard metadata keys
            const lowerKey = key.toLowerCase();
            for (const [prefix, metadataType] of Object.entries(this.config.specialTagPrefixes || {})) {
                if (prefix.toLowerCase() === lowerKey) {
                    key = metadataType; // Map to the target metadata field (project, context, area)
                    break;
                }
            }
        }
        if (key && value) {
            // Debug: Log dataview metadata extraction for configured prefixes
            const before = content.substring(0, start);
            const after = content.substring(end + 1);
            return [key, value, before + after];
        }
        return null;
    }
    extractEmojiMetadata(content) {
        // Find the earliest emoji
        let earliestEmoji = null;
        for (const [emoji, key] of Object.entries(this.config.emojiMapping)) {
            const pos = content.indexOf(emoji);
            if (pos !== -1) {
                if (!earliestEmoji || pos < earliestEmoji.pos) {
                    earliestEmoji = { pos, emoji, key };
                }
            }
        }
        if (!earliestEmoji)
            return null;
        const beforeEmoji = content.substring(0, earliestEmoji.pos);
        const afterEmoji = content.substring(earliestEmoji.pos + earliestEmoji.emoji.length);
        // Extract value after emoji
        const valueStartMatch = afterEmoji.match(/^\s*/);
        const valueStart = valueStartMatch ? valueStartMatch[0].length : 0;
        const valuePart = afterEmoji.substring(valueStart);
        let valueEnd = valuePart.length;
        for (let i = 0; i < valuePart.length; i++) {
            const char = valuePart[i];
            // Check if we encounter other emojis or special characters
            if (Object.keys(this.config.emojiMapping).some((e) => valuePart.substring(i).startsWith(e)) ||
                char === "[") {
                valueEnd = i;
                break;
            }
            // Check for file extensions followed by space or end of content
            const fileExtensionEnd = this.findFileExtensionEnd(valuePart, i);
            if (fileExtensionEnd > i) {
                valueEnd = fileExtensionEnd;
                break;
            }
            // Check for whitespace followed by # (tag) or @ (context), or direct #/@ without preceding space
            if (/\s/.test(char) &&
                i + 1 < valuePart.length &&
                (valuePart[i + 1] === "#" || valuePart[i + 1] === "@")) {
                valueEnd = i;
                break;
            }
            // Also stop if we encounter # or @ directly (no whitespace)
            if (char === "#" || char === "@") {
                valueEnd = i;
                break;
            }
        }
        const value = valuePart.substring(0, valueEnd).trim();
        // Handle special field processing
        let metadataValue;
        if (earliestEmoji.key === "dependsOn" && value) {
            // For dependsOn, split by comma and join back as string for metadata storage
            metadataValue = value
                .split(",")
                .map((id) => id.trim())
                .filter((id) => id.length > 0)
                .join(",");
        }
        else if (earliestEmoji.key === "priority") {
            // For priority emojis, use the emoji itself or the provided value
            // This ensures we can distinguish between different priority levels
            metadataValue = value || earliestEmoji.emoji;
        }
        else {
            // For other emojis, use provided value or default
            metadataValue =
                value || this.getDefaultEmojiValue(earliestEmoji.emoji);
        }
        // Sanitize date-like emoji values to avoid trailing context (e.g., "2025-08-15 @work")
        if ([
            "dueDate",
            "startDate",
            "scheduledDate",
            "completedDate",
            "createdDate",
            "cancelledDate",
        ].includes(earliestEmoji.key) &&
            typeof metadataValue === "string") {
            const m = metadataValue.match(/\d{4}-\d{2}-\d{2}/);
            if (m) {
                metadataValue = m[0];
            }
        }
        const newPos = earliestEmoji.pos +
            earliestEmoji.emoji.length +
            valueStart +
            valueEnd;
        const afterRemaining = content.substring(newPos);
        return [earliestEmoji.key, metadataValue, beforeEmoji, afterRemaining];
    }
    /**
     * Find the end position of a file extension pattern (e.g., .md, .canvas)
     * followed by optional heading (#heading) and then space or end of content
     */
    findFileExtensionEnd(content, startPos) {
        const supportedExtensions = [".md", ".canvas", ".txt", ".pdf"];
        for (const ext of supportedExtensions) {
            if (content.substring(startPos).startsWith(ext)) {
                let pos = startPos + ext.length;
                // Check for optional heading (#heading)
                if (pos < content.length && content[pos] === "#") {
                    // Find the end of the heading (next space or end of content)
                    while (pos < content.length && content[pos] !== " ") {
                        pos++;
                    }
                }
                // Check if we're at end of content or followed by space
                if (pos >= content.length || content[pos] === " ") {
                    return pos;
                }
            }
        }
        return startPos; // No file extension pattern found
    }
    getDefaultEmojiValue(emoji) {
        const defaultValues = {
            "🔺": "highest",
            "⏫": "high",
            "🔼": "medium",
            "🔽": "low",
            "⏬️": "lowest",
            "⏬": "lowest",
        };
        return defaultValues[emoji] || "true";
    }
    extractTag(content) {
        // Use ContextDetector to find unprotected hash symbols
        const detector = new ContextDetector(content);
        detector.detectAllProtectedRanges();
        const tryFrom = (startPos) => {
            const hashPos = detector.findNextUnprotectedHash(startPos);
            if (hashPos === -1)
                return null;
            // If an odd number of backslashes immediately precede '#', it's escaped → skip
            let bsCount = 0;
            let j = hashPos - 1;
            while (j >= 0 && content[j] === "\\") {
                bsCount++;
                j--;
            }
            if (bsCount % 2 === 1) {
                return tryFrom(hashPos + 1);
            }
            // Enhanced word boundary check
            const isWordStart = this.isValidTagStart(content, hashPos);
            if (!isWordStart) {
                return tryFrom(hashPos + 1);
            }
            const afterHash = content.substring(hashPos + 1);
            let tagEnd = 0;
            // Find tag end, including '/' for special tags and Unicode characters
            for (let i = 0; i < afterHash.length; i++) {
                const char = afterHash[i];
                const charCode = char.charCodeAt(0);
                // Valid tag characters
                if ((charCode >= 48 && charCode <= 57) || // 0-9
                    (charCode >= 65 && charCode <= 90) || // A-Z
                    (charCode >= 97 && charCode <= 122) || // a-z
                    char === "/" ||
                    char === "-" ||
                    char === "_" ||
                    (charCode > 127 &&
                        char !== "，" &&
                        char !== "。" &&
                        char !== "；" &&
                        char !== "：" &&
                        char !== "！" &&
                        char !== "？" &&
                        char !== "「" &&
                        char !== "」" &&
                        char !== "『" &&
                        char !== "』" &&
                        char !== "（" &&
                        char !== "）" &&
                        char !== "【" &&
                        char !== "】" &&
                        char !== '"' &&
                        char !== '"' &&
                        char !== "'" &&
                        char !== "'" &&
                        char !== " ")) {
                    tagEnd = i + 1;
                }
                else {
                    break;
                }
            }
            if (tagEnd > 0) {
                const fullTag = "#" + afterHash.substring(0, tagEnd); // Include # prefix
                const before = content.substring(0, hashPos);
                const after = content.substring(hashPos + 1 + tagEnd);
                return [fullTag, before, after];
            }
            // Not a valid tag, continue searching
            return tryFrom(hashPos + 1);
        };
        return tryFrom(0);
    }
    /**
     * Enhanced word boundary check for tag start validation
     */
    isValidTagStart(content, hashPos) {
        // Check if it's at the beginning of content
        if (hashPos === 0)
            return true;
        const prevChar = content[hashPos - 1];
        // Valid tag starts are preceded by:
        // 1. Whitespace
        // 2. Start of line
        // 3. Punctuation that typically separates words
        // 4. Opening brackets/parentheses
        // Invalid tag starts are preceded by:
        // 1. Alphanumeric characters (part of a word)
        // 2. Other hash symbols (multiple hashes)
        // 3. Special symbols that indicate non-tag context
        const validPrecedingChars = /[\s\(\[\{<,;:!?\-\+\*\/\\\|=]/;
        const invalidPrecedingChars = /[a-zA-Z0-9#@$%^&*]/;
        if (validPrecedingChars.test(prevChar)) {
            return true;
        }
        if (invalidPrecedingChars.test(prevChar)) {
            return false;
        }
        // For other characters (Unicode, etc.), use the original logic
        return !prevChar.match(/[a-zA-Z0-9#@$%^&*]/);
    }
    extractContext(content) {
        const atPos = content.indexOf("@");
        if (atPos === -1)
            return null;
        // Check if it's a word start
        const isWordStart = atPos === 0 ||
            content[atPos - 1].match(/\s/) ||
            !content[atPos - 1].match(/[a-zA-Z0-9#@$%^&*]/);
        if (!isWordStart)
            return null;
        const afterAt = content.substring(atPos + 1);
        let contextEnd = 0;
        // Find context end, similar to tag parsing but for context
        for (let i = 0; i < afterAt.length; i++) {
            const char = afterAt[i];
            const charCode = char.charCodeAt(0);
            // Check if character is valid for context:
            // - ASCII letters and numbers: a-z, A-Z, 0-9
            // - Special characters: -, _
            // - Unicode characters (including Chinese): > 127
            // - Exclude common separators and punctuation
            if ((charCode >= 48 && charCode <= 57) || // 0-9
                (charCode >= 65 && charCode <= 90) || // A-Z
                (charCode >= 97 && charCode <= 122) || // a-z
                char === "-" ||
                char === "_" ||
                (charCode > 127 &&
                    char !== "，" &&
                    char !== "。" &&
                    char !== "；" &&
                    char !== "：" &&
                    char !== "！" &&
                    char !== "？" &&
                    char !== "「" &&
                    char !== "」" &&
                    char !== "『" &&
                    char !== "』" &&
                    char !== "（" &&
                    char !== "）" &&
                    char !== "【" &&
                    char !== "】" &&
                    char !== '"' &&
                    char !== '"' &&
                    char !== "'" &&
                    char !== "'" &&
                    char !== " ")) {
                contextEnd = i + 1;
            }
            else {
                break;
            }
        }
        if (contextEnd > 0) {
            const context = afterAt.substring(0, contextEnd);
            const before = content.substring(0, atPos);
            const after = content.substring(atPos + 1 + contextEnd);
            return [context, before, after];
        }
        return null;
    }
    extractTagsOnly(content) {
        var _a;
        const metadata = {};
        const tags = [];
        let cleanedContent = "";
        let remaining = content;
        while (true) {
            let foundMatch = false;
            // Check dataview format metadata
            if (this.config.parseMetadata &&
                (this.config.metadataParseMode ===
                    MetadataParseMode.DataviewOnly ||
                    this.config.metadataParseMode === MetadataParseMode.Both)) {
                const bracketMatch = this.extractDataviewMetadata(remaining);
                if (bracketMatch) {
                    const [key, value, newRemaining] = bracketMatch;
                    metadata[key] = value;
                    remaining = newRemaining;
                    foundMatch = true;
                    continue;
                }
            }
            // Check context (@symbol)
            if (!foundMatch && this.config.parseTags) {
                const contextMatch = this.extractContext(remaining);
                if (contextMatch) {
                    const [context, beforeContent, afterRemaining] = contextMatch;
                    // Recursively process the content before context
                    const [beforeCleaned, beforeMetadata, beforeTags] = this.extractTagsOnly(beforeContent);
                    // Merge metadata and tags from before content
                    for (const tag of beforeTags) {
                        tags.push(tag);
                    }
                    for (const [k, v] of Object.entries(beforeMetadata)) {
                        metadata[k] = v;
                    }
                    metadata.context = context;
                    cleanedContent += beforeCleaned;
                    remaining = afterRemaining;
                    foundMatch = true;
                    continue;
                }
            }
            // Check tags
            if (!foundMatch && this.config.parseTags) {
                const tagMatch = this.extractTag(remaining);
                if (tagMatch) {
                    const [tag, beforeContent, afterRemaining] = tagMatch;
                    // Check special tag format
                    // Remove # prefix for checking special tags
                    const tagWithoutHash = tag.startsWith("#")
                        ? tag.substring(1)
                        : tag;
                    const slashPos = tagWithoutHash.indexOf("/");
                    if (slashPos !== -1) {
                        const prefix = tagWithoutHash.substring(0, slashPos);
                        const value = tagWithoutHash.substring(slashPos + 1);
                        // Case-insensitive match for special tag prefixes
                        const metadataKey = (_a = this.config.specialTagPrefixes[prefix]) !== null && _a !== void 0 ? _a : this.config.specialTagPrefixes[prefix.toLowerCase()];
                        if (metadataKey &&
                            this.config.metadataParseMode !==
                                MetadataParseMode.None) {
                            metadata[metadataKey] = value;
                        }
                        else {
                            tags.push(tag);
                        }
                    }
                    else {
                        tags.push(tag);
                    }
                    cleanedContent += beforeContent;
                    remaining = afterRemaining;
                    foundMatch = true;
                    continue;
                }
            }
            if (!foundMatch) {
                cleanedContent += remaining;
                break;
            }
        }
        return [cleanedContent.trim(), metadata, tags];
    }
    findParentAndLevel(actualSpaces) {
        if (this.indentStack.length === 0 || actualSpaces === 0) {
            return [undefined, 0];
        }
        for (let i = this.indentStack.length - 1; i >= 0; i--) {
            const { taskId, indentLevel, actualSpaces: spaces, } = this.indentStack[i];
            if (spaces < actualSpaces) {
                return [taskId, indentLevel + 1];
            }
        }
        return [undefined, 0];
    }
    updateIndentStack(taskId, indentLevel, actualSpaces) {
        let stackOperations = 0;
        while (this.indentStack.length > 0) {
            stackOperations++;
            if (stackOperations > this.config.maxStackOperations) {
                console.warn("Warning: Maximum stack operations reached, clearing stack");
                this.indentStack = [];
                break;
            }
            const lastItem = this.indentStack[this.indentStack.length - 1];
            if (lastItem.actualSpaces >= actualSpaces) {
                this.indentStack.pop();
            }
            else {
                break;
            }
        }
        if (this.indentStack.length >= this.config.maxStackSize) {
            this.indentStack.splice(0, this.indentStack.length - this.config.maxStackSize + 1);
        }
        this.indentStack.push({ taskId, indentLevel, actualSpaces });
    }
    getStatusFromMapping(rawStatus) {
        // Find status name corresponding to raw character
        for (const [statusName, mappedChar] of Object.entries(this.config.statusMapping)) {
            if (mappedChar === rawStatus) {
                return statusName;
            }
        }
        return undefined;
    }
    extractHeading(line) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("#"))
            return null;
        let level = 0;
        for (const char of trimmed) {
            if (char === "#") {
                level++;
            }
            else if (char.match(/\s/)) {
                break;
            }
            else {
                return null; // Not a valid heading format
            }
        }
        if (level > 0 && level <= 6) {
            const headingText = trimmed.substring(level).trim();
            if (headingText) {
                return [level, headingText];
            }
        }
        return null;
    }
    extractMultilineComment(lines, startIndex, actualSpaces) {
        const commentLines = [];
        let i = startIndex;
        let linesConsumed = 0;
        while (i < lines.length) {
            const line = lines[i];
            const trimmed = line.trimStart();
            const nextSpaces = line.length - trimmed.length;
            // Only consider as comment if next line is not a task line and has deeper indentation
            if (nextSpaces > actualSpaces && !this.isTaskLine(trimmed)) {
                commentLines.push(trimmed);
                linesConsumed++;
            }
            else {
                break;
            }
            i++;
        }
        if (commentLines.length === 0) {
            return [undefined, 0];
        }
        else {
            const comment = commentLines.join("\n");
            return [comment, linesConsumed];
        }
    }
    // Legacy compatibility methods
    extractLegacyPriority(metadata) {
        if (!metadata.priority)
            return undefined;
        // Use the standard PRIORITY_MAP for consistent priority values
        const priorityMap = {
            highest: 5,
            high: 4,
            medium: 3,
            low: 2,
            lowest: 1,
            urgent: 5,
            critical: 5,
            important: 4,
            normal: 3,
            moderate: 3,
            minor: 2,
            trivial: 1,
            // Emoji priority mappings
            "🔺": 5,
            "⏫": 4,
            "🔼": 3,
            "🔽": 2,
            "⏬️": 1,
            "⏬": 1,
        };
        // First try to parse as number
        const numericPriority = parseInt(metadata.priority, 10);
        if (!isNaN(numericPriority)) {
            return numericPriority;
        }
        // Then try to map string values (including emojis)
        const mappedPriority = priorityMap[metadata.priority.toLowerCase()] ||
            priorityMap[metadata.priority];
        return mappedPriority;
    }
    extractLegacyDate(metadata, key) {
        const dateStr = metadata[key];
        if (!dateStr)
            return undefined;
        // Check cache first to avoid repeated date parsing
        const cacheKey = `${dateStr}_${(this.customDateFormats || []).join(",")}`;
        const cachedDate = MarkdownTaskParser.dateCache.get(cacheKey);
        if (cachedDate !== undefined) {
            return cachedDate;
        }
        // Parse date with custom formats and cache the result
        const date = parseLocalDate(dateStr, this.customDateFormats);
        // Implement cache size limit to prevent memory issues
        if (MarkdownTaskParser.dateCache.size >=
            MarkdownTaskParser.MAX_CACHE_SIZE) {
            // Remove oldest entries (simple FIFO eviction)
            const firstKey = MarkdownTaskParser.dateCache.keys().next().value;
            if (firstKey) {
                MarkdownTaskParser.dateCache.delete(firstKey);
            }
        }
        MarkdownTaskParser.dateCache.set(cacheKey, date);
        return date;
    }
    convertToLegacyTask(enhancedTask) {
        // Helper function to safely parse tags from metadata
        const parseTagsFromMetadata = (tagsString) => {
            try {
                const parsed = JSON.parse(tagsString);
                return Array.isArray(parsed) ? parsed : [];
            }
            catch (e) {
                // If parsing fails, treat as a single tag
                return [tagsString];
            }
        };
        return {
            id: enhancedTask.id,
            content: enhancedTask.content,
            filePath: enhancedTask.filePath,
            line: enhancedTask.line,
            completed: enhancedTask.completed,
            status: enhancedTask.rawStatus,
            originalMarkdown: enhancedTask.originalMarkdown,
            children: enhancedTask.children || [],
            metadata: {
                tags: enhancedTask.tags ||
                    (enhancedTask.metadata.tags
                        ? parseTagsFromMetadata(enhancedTask.metadata.tags)
                        : []),
                priority: enhancedTask.priority || enhancedTask.metadata.priority,
                startDate: enhancedTask.startDate || enhancedTask.metadata.startDate,
                dueDate: enhancedTask.dueDate || enhancedTask.metadata.dueDate,
                scheduledDate: enhancedTask.scheduledDate ||
                    enhancedTask.metadata.scheduledDate,
                completedDate: enhancedTask.completedDate ||
                    enhancedTask.metadata.completedDate,
                createdDate: enhancedTask.createdDate ||
                    enhancedTask.metadata.createdDate,
                cancelledDate: enhancedTask.metadata.cancelledDate,
                recurrence: enhancedTask.recurrence || enhancedTask.metadata.recurrence,
                project: enhancedTask.project || enhancedTask.metadata.project,
                context: enhancedTask.context || enhancedTask.metadata.context,
                area: enhancedTask.metadata.area,
                id: enhancedTask.metadata.id,
                dependsOn: enhancedTask.metadata.dependsOn
                    ? enhancedTask.metadata.dependsOn
                        .split(",")
                        .map((id) => id.trim())
                        .filter((id) => id.length > 0)
                    : undefined,
                onCompletion: enhancedTask.metadata.onCompletion,
                // Legacy compatibility fields that should remain in metadata
                children: enhancedTask.children,
                heading: Array.isArray(enhancedTask.heading)
                    ? enhancedTask.heading
                    : enhancedTask.heading
                        ? [enhancedTask.heading]
                        : [],
                parent: enhancedTask.parentId,
                tgProject: enhancedTask.tgProject,
            },
        };
    }
    /**
     * Load project configuration for the given file path
     */
    loadProjectConfig(filePath) {
        if (!this.config.projectConfig)
            return;
        // This is a simplified implementation for the worker environment
        // In a real implementation, you would need to pass project config data
        // from the main thread or implement file reading in the worker
        this.projectConfigCache = {};
    }
    /**
     * Determine tgProject for a task based on various sources
     */
    determineTgProject(filePath) {
        var _a, _b, _c;
        if (!((_a = this.config.projectConfig) === null || _a === void 0 ? void 0 : _a.enableEnhancedProject)) {
            return undefined;
        }
        const config = this.config.projectConfig;
        // 1. Check path-based mappings
        if (config.pathMappings && config.pathMappings.length > 0) {
            for (const mapping of config.pathMappings) {
                if (!mapping.enabled)
                    continue;
                // Simple path matching (in a real implementation, you'd use glob patterns)
                if (filePath.includes(mapping.pathPattern)) {
                    return {
                        type: "path",
                        name: mapping.projectName,
                        source: mapping.pathPattern,
                        readonly: true,
                    };
                }
            }
        }
        // 2. Check file metadata - only if metadata detection is enabled
        if (((_b = config.metadataConfig) === null || _b === void 0 ? void 0 : _b.enabled) && this.fileMetadata) {
            const metadataKey = config.metadataConfig.metadataKey || "project";
            const projectFromMetadata = this.fileMetadata[metadataKey];
            if (projectFromMetadata &&
                typeof projectFromMetadata === "string") {
                return {
                    type: "metadata",
                    name: projectFromMetadata,
                    source: metadataKey,
                    readonly: true,
                };
            }
        }
        // 3. Check project config file - only if config file detection is enabled
        if (((_c = config.configFile) === null || _c === void 0 ? void 0 : _c.enabled) && this.projectConfigCache) {
            const projectFromConfig = this.projectConfigCache.project;
            if (projectFromConfig && typeof projectFromConfig === "string") {
                return {
                    type: "config",
                    name: projectFromConfig,
                    source: config.configFile.fileName,
                    readonly: true,
                };
            }
        }
        return undefined;
    }
    /**
     * Static method to clear the date cache when needed (e.g., for memory management)
     */
    static clearDateCache() {
        MarkdownTaskParser.dateCache.clear();
    }
    /**
     * Static method to get cache statistics
     */
    static getDateCacheStats() {
        return {
            size: MarkdownTaskParser.dateCache.size,
            maxSize: MarkdownTaskParser.MAX_CACHE_SIZE,
        };
    }
    /**
     * Parse tags array to extract special tag formats and convert them to metadata
     * @param tags Array of tags to parse
     * @returns Object containing extracted metadata from tags
     */
    parseTagsForMetadata(tags) {
        var _a;
        const metadata = {};
        for (const tag of tags) {
            // Remove # prefix if present
            const tagWithoutHash = tag.startsWith("#") ? tag.substring(1) : tag;
            const slashPos = tagWithoutHash.indexOf("/");
            if (slashPos !== -1) {
                const prefix = tagWithoutHash.substring(0, slashPos);
                const value = tagWithoutHash.substring(slashPos + 1);
                // Check if this is a special tag prefix that should be converted to metadata
                const metadataKey = (_a = this.config.specialTagPrefixes[prefix]) !== null && _a !== void 0 ? _a : this.config.specialTagPrefixes[prefix.toLowerCase()];
                if (metadataKey &&
                    this.config.metadataParseMode !== MetadataParseMode.None) {
                    metadata[metadataKey] = value;
                }
            }
        }
        return metadata;
    }
    /**
     * Normalize a tag to ensure it has a # prefix
     * @param tag The tag to normalize
     * @returns Normalized tag with # prefix
     */
    normalizeTag(tag) {
        if (typeof tag !== "string") {
            return tag;
        }
        const trimmed = tag.trim();
        if (!trimmed || trimmed.startsWith("#")) {
            return trimmed;
        }
        return `#${trimmed}`;
    }
    /**
     * Safely parse tags field from metadata which might be a JSON string or a plain string
     */
    safeParseTagsField(tagsField) {
        if (!tagsField)
            return [];
        if (Array.isArray(tagsField))
            return tagsField;
        if (typeof tagsField === "string") {
            try {
                const parsed = JSON.parse(tagsField);
                return Array.isArray(parsed) ? parsed : [tagsField];
            }
            catch (e) {
                return [tagsField];
            }
        }
        return [];
    }
    /**
     * Merge tags from different sources, removing duplicates
     * @param baseTags Base tags array (from task)
     * @param inheritedTags Tags to inherit (from file metadata)
     * @returns Merged tags array with duplicates removed
     */
    mergeTags(baseTags, inheritedTags) {
        // Normalize all tags before merging
        const normalizedBaseTags = baseTags.map((tag) => this.normalizeTag(tag));
        const normalizedInheritedTags = inheritedTags.map((tag) => this.normalizeTag(tag));
        const merged = [...normalizedBaseTags];
        for (const tag of normalizedInheritedTags) {
            if (!merged.includes(tag)) {
                merged.push(tag);
            }
        }
        return merged;
    }
    /**
     * LEGACY (pre-dataflow): Inherit metadata from file frontmatter and project configuration
     *
     * In the new dataflow architecture, inheritance is handled exclusively by Augmentor.
     * This method remains for backward compatibility and is effectively disabled when
     * fileMetadataInheritance.enabled is false (returns {}). When enabled, Parser may still
     * perform minimal, legacy-compatible merging, but authoritative merging should be done
     * in Augmentor.merge().
     */
    inheritFileMetadata(taskMetadata, isSubtask = false) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        // Helper function to convert priority values to numbers
        const convertPriorityValue = (value) => {
            if (value === undefined || value === null) {
                return String(value);
            }
            // If it's already a number, convert to string and return
            if (typeof value === "number") {
                return String(value);
            }
            // If it's a string, try to convert priority values to numbers, but return as string
            // since the metadata record expects string values that will later be processed by extractLegacyPriority
            const strValue = String(value);
            const priorityMap = {
                highest: 5,
                high: 4,
                medium: 3,
                low: 2,
                lowest: 1,
                urgent: 5,
                critical: 5,
                important: 4,
                normal: 3,
                moderate: 3,
                minor: 2,
                trivial: 1,
                // Emoji priority mappings
                "🔺": 5,
                "⏫": 4,
                "🔼": 3,
                "🔽": 2,
                "⏬️": 1,
                "⏬": 1,
            };
            // Try numeric conversion first
            const numericValue = parseInt(strValue, 10);
            if (!isNaN(numericValue)) {
                return String(numericValue);
            }
            // Try priority mapping (including emojis)
            const mappedPriority = priorityMap[strValue.toLowerCase()] || priorityMap[strValue];
            if (mappedPriority !== undefined) {
                return String(mappedPriority);
            }
            // Return original value if no conversion applies
            return strValue;
        };
        // Always convert priority values in task metadata, even if inheritance is disabled
        const inherited = Object.assign({}, taskMetadata);
        if (inherited.priority !== undefined) {
            inherited.priority = convertPriorityValue(inherited.priority);
        }
        // Early return if enhanced project features are disabled
        // Check if file metadata inheritance is enabled
        if (!((_a = this.config.fileMetadataInheritance) === null || _a === void 0 ? void 0 : _a.enabled)) {
            // Inheritance disabled: preserve task-level metadata as-is
            // (enhanced merging will be handled elsewhere when enabled)
            return inherited;
        }
        // Check if frontmatter inheritance is enabled
        if (!((_b = this.config.fileMetadataInheritance) === null || _b === void 0 ? void 0 : _b.inheritFromFrontmatter)) {
            // Legacy behavior: return task-only metadata
            return inherited;
        }
        // Check if subtask inheritance is allowed
        if (isSubtask &&
            !((_c = this.config.fileMetadataInheritance) === null || _c === void 0 ? void 0 : _c.inheritFromFrontmatterForSubtasks)) {
            // Legacy behavior: do not inherit for subtasks
            return inherited;
        }
        // List of fields that should NOT be inherited (task-specific only)
        const nonInheritableFields = new Set([
            "id",
            "content",
            "status",
            "rawStatus",
            "completed",
            "line",
            "lineNumber",
            "originalMarkdown",
            "filePath",
            "heading",
            "headingLevel",
            "parent",
            "parentId",
            "children",
            "childrenIds",
            "indentLevel",
            "actualIndent",
            "listMarker",
            "tgProject",
            "comment",
            "metadata", // Prevent recursive metadata inheritance
        ]);
        // LEGACY: Inherit from file metadata (frontmatter) if available
        if (this.fileMetadata) {
            // When enhanced project + metadata detection are enabled,
            // do NOT inject frontmatter project into metadata.project here.
            // Let tgProject be determined via determineTgProject, and later
            // Augmentor will mirror tgProject.name into metadata.project if needed.
            const enhancedOn = !!((_d = this.config.projectConfig) === null || _d === void 0 ? void 0 : _d.enableEnhancedProject);
            const metadataDetectOn = !!((_f = (_e = this.config.projectConfig) === null || _e === void 0 ? void 0 : _e.metadataConfig) === null || _f === void 0 ? void 0 : _f.enabled);
            if (!(enhancedOn && metadataDetectOn)) {
                // Map configured frontmatter project key to standard 'project'
                try {
                    const configuredProjectKey = (_h = (_g = this.config.projectConfig) === null || _g === void 0 ? void 0 : _g.metadataConfig) === null || _h === void 0 ? void 0 : _h.metadataKey;
                    if (configuredProjectKey &&
                        this.fileMetadata[configuredProjectKey] !== undefined &&
                        this.fileMetadata[configuredProjectKey] !== null &&
                        String(this.fileMetadata[configuredProjectKey]).trim() !== "") {
                        if (inherited.project === undefined ||
                            inherited.project === null ||
                            inherited.project === "") {
                            inherited.project = String(this.fileMetadata[configuredProjectKey]).trim();
                        }
                    }
                }
                catch (_j) { }
            }
            for (const [key, value] of Object.entries(this.fileMetadata)) {
                // Special handling for tags field
                if (key === "tags" && Array.isArray(value)) {
                    // Parse tags to extract special tag formats (e.g., #project/myproject)
                    const tagMetadata = this.parseTagsForMetadata(value);
                    // Merge extracted metadata from tags
                    for (const [tagKey, tagValue] of Object.entries(tagMetadata)) {
                        if (!nonInheritableFields.has(tagKey) &&
                            (inherited[tagKey] === undefined ||
                                inherited[tagKey] === null ||
                                inherited[tagKey] === "") &&
                            tagValue !== undefined &&
                            tagValue !== null) {
                            // Convert priority values to numbers before inheritance
                            if (tagKey === "priority") {
                                inherited[tagKey] =
                                    convertPriorityValue(tagValue);
                            }
                            else {
                                inherited[tagKey] = String(tagValue);
                            }
                        }
                    }
                    // Store the tags array itself as tags metadata
                    if (!nonInheritableFields.has("tags") &&
                        (inherited["tags"] === undefined ||
                            inherited["tags"] === null ||
                            inherited["tags"] === "")) {
                        // Normalize tags before storing
                        const normalizedTags = value.map((tag) => this.normalizeTag(tag));
                        inherited["tags"] = JSON.stringify(normalizedTags);
                    }
                }
                else {
                    // Only inherit if:
                    // 1. The field is not in the non-inheritable list
                    // 2. The task doesn't already have a meaningful value for this field
                    // 3. The file metadata value is not undefined/null
                    if (!nonInheritableFields.has(key) &&
                        (inherited[key] === undefined ||
                            inherited[key] === null ||
                            inherited[key] === "") &&
                        value !== undefined &&
                        value !== null) {
                        // Convert priority values to numbers before inheritance
                        if (key === "priority") {
                            inherited[key] = convertPriorityValue(value);
                        }
                        else {
                            inherited[key] = String(value);
                        }
                    }
                }
            }
        }
        // LEGACY: Inherit from project configuration data if available
        if (this.projectConfigCache) {
            for (const [key, value] of Object.entries(this.projectConfigCache)) {
                // Only inherit if:
                // 1. The field is not in the non-inheritable list
                // 2. The task doesn't already have a meaningful value for this field (task metadata takes precedence)
                // 3. File metadata doesn't have this field (file metadata takes precedence over project config)
                // 4. The value is not undefined/null
                if (!nonInheritableFields.has(key) &&
                    (inherited[key] === undefined ||
                        inherited[key] === null ||
                        inherited[key] === "") &&
                    !(this.fileMetadata &&
                        this.fileMetadata[key] !== undefined) &&
                    value !== undefined &&
                    value !== null) {
                    // Convert priority values to numbers before inheritance
                    if (key === "priority") {
                        inherited[key] = convertPriorityValue(value);
                    }
                    else {
                        inherited[key] = String(value);
                    }
                }
            }
        }
        return inherited;
    }
}
// Date parsing cache to improve performance for large-scale parsing
MarkdownTaskParser.dateCache = new Map();
MarkdownTaskParser.MAX_CACHE_SIZE = 10000; // Limit cache size to prevent memory issues
export class ConfigurableTaskParser extends MarkdownTaskParser {
    constructor(config, timeParsingService) {
        // Default configuration
        const defaultConfig = {
            parseMetadata: true,
            parseTags: true,
            parseComments: true,
            parseHeadings: true,
            maxIndentSize: 100,
            maxParseIterations: 100,
            maxMetadataIterations: 50,
            maxTagLength: 50,
            maxEmojiValueLength: 50,
            maxStackOperations: 1000,
            maxStackSize: 50,
            statusMapping: {
                TODO: " ",
                IN_PROGRESS: "/",
                DONE: "x",
                CANCELLED: "-",
            },
            emojiMapping: {
                "📅": "dueDate",
                "🛫": "startDate",
                "⏳": "scheduledDate",
                "✅": "completedDate",
                "➕": "createdDate",
                "❌": "cancelledDate",
                "🆔": "id",
                "⛔": "dependsOn",
                "🏁": "onCompletion",
                "🔁": "repeat",
                "🔺": "priority",
                "⏫": "priority",
                "🔼": "priority",
                "🔽": "priority",
                "⏬": "priority",
            },
            metadataParseMode: MetadataParseMode.Both,
            specialTagPrefixes: {
                project: "project",
                "@": "context",
            },
        };
        super(Object.assign(Object.assign({}, defaultConfig), config), timeParsingService);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29uZmlndXJhYmxlVGFza1BhcnNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkNvbmZpZ3VyYWJsZVRhc2tQYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztHQUdHO0FBR0gsT0FBTyxFQUdOLGlCQUFpQixHQUNqQixNQUFNLDhCQUE4QixDQUFDO0FBQ3RDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDbkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBSTdELE1BQU0sT0FBTyxrQkFBa0I7SUFtQjlCLFlBQ0MsTUFBd0IsRUFDeEIsa0JBQXVDO1FBbkJoQyxVQUFLLEdBQW1CLEVBQUUsQ0FBQztRQUMzQixnQkFBVyxHQUlkLEVBQUUsQ0FBQztRQWdCUCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQiwyQ0FBMkM7UUFDM0MsSUFBSSxDQUFDLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQztRQUNsRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsa0JBQWtCLENBQUM7SUFDOUMsQ0FBQztJQUVELDBDQUEwQztJQUNuQyxzQkFBc0IsQ0FDNUIsT0FBZTtRQUVmLE9BQU8sSUFBSSxDQUFDLDhCQUE4QixDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFFRDs7T0FFRztJQUNILE1BQU0sQ0FBQyx1QkFBdUIsQ0FDN0IsTUFBd0IsRUFDeEIsYUFBcUMsRUFDckMsa0JBQXVDO1FBRXZDLE1BQU0sU0FBUyxtQ0FBUSxNQUFNLEtBQUUsYUFBYSxHQUFFLENBQUM7UUFDL0MsT0FBTyxJQUFJLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO0lBQzlELENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FDSixLQUFhLEVBQ2IsUUFBUSxHQUFHLEVBQUUs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LGFBQWEsRUFBRTtnQkFDZCxJQUFJLEVBQUUsR0FBRztnQkFDVCxXQUFXLEVBQUUsR0FBRztnQkFDaEIsSUFBSSxFQUFFLEdBQUc7Z0JBQ1QsU0FBUyxFQUFFLEdBQUc7YUFDZDtZQUNELFlBQVksRUFBRTtnQkFDYixJQUFJLEVBQUUsU0FBUztnQkFDZixJQUFJLEVBQUUsV0FBVztnQkFDakIsR0FBRyxFQUFFLGVBQWU7Z0JBQ3BCLEdBQUcsRUFBRSxlQUFlO2dCQUNwQixHQUFHLEVBQUUsYUFBYTtnQkFDbEIsR0FBRyxFQUFFLGVBQWU7Z0JBQ3BCLElBQUksRUFBRSxJQUFJO2dCQUNWLEdBQUcsRUFBRSxXQUFXO2dCQUNoQixJQUFJLEVBQUUsY0FBYztnQkFDcEIsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsSUFBSSxFQUFFLFVBQVU7Z0JBQ2hCLEdBQUcsRUFBRSxVQUFVO2dCQUNmLElBQUksRUFBRSxVQUFVO2dCQUNoQixJQUFJLEVBQUUsVUFBVTtnQkFDaEIsR0FBRyxFQUFFLFVBQVU7YUFDZjtZQUNELGlCQUFpQixFQUFFLGlCQUFpQixDQUFDLElBQUk7WUFDekMsa0JBQWtCLEVBQUU7Z0JBQ25CLE9BQU8sRUFBRSxTQUFTO2dCQUNsQixHQUFHLEVBQUUsU0FBUzthQUNkO1NBQ0QsQ0FBQztRQUVGLEtBQUssaUNBQU0sYUFBYSxHQUFLLE1BQU0sR0FBSSxrQkFBa0IsQ0FBQyxDQUFDO0lBQzVELENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBDb25maWd1cmFibGUgTWFya2Rvd24gVGFzayBQYXJzZXJcclxuICogQmFzZWQgb24gUnVzdCBpbXBsZW1lbnRhdGlvbiBkZXNpZ24gd2l0aCBUeXBlU2NyaXB0IGFkYXB0YXRpb25cclxuICovXHJcblxyXG5pbXBvcnQgeyBUYXNrLCBUZ1Byb2plY3QsIEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGEgfSBmcm9tIFwiQC90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7XHJcblx0VGFza1BhcnNlckNvbmZpZyxcclxuXHRFbmhhbmNlZFRhc2ssXHJcblx0TWV0YWRhdGFQYXJzZU1vZGUsXHJcbn0gZnJvbSBcIi4uLy4uL3R5cGVzL1Rhc2tQYXJzZXJDb25maWdcIjtcclxuaW1wb3J0IHsgcGFyc2VMb2NhbERhdGUgfSBmcm9tIFwiQC91dGlscy9kYXRlL2RhdGUtZm9ybWF0dGVyXCI7XHJcbmltcG9ydCB7IFRBU0tfUkVHRVggfSBmcm9tIFwiQC9jb21tb24vcmVnZXgtZGVmaW5lXCI7XHJcbmltcG9ydCB7IENvbnRleHREZXRlY3RvciB9IGZyb20gXCJAL3BhcnNlcnMvY29udGV4dC1kZXRlY3RvclwiO1xyXG5pbXBvcnQgeyBUaW1lUGFyc2luZ1NlcnZpY2UgfSBmcm9tIFwiQC9zZXJ2aWNlcy90aW1lLXBhcnNpbmctc2VydmljZVwiO1xyXG5pbXBvcnQgeyBUaW1lQ29tcG9uZW50IH0gZnJvbSBcIkAvdHlwZXMvdGltZS1wYXJzaW5nXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgTWFya2Rvd25UYXNrUGFyc2VyIHtcclxuXHRwcml2YXRlIGNvbmZpZzogVGFza1BhcnNlckNvbmZpZztcclxuXHRwcml2YXRlIHRhc2tzOiBFbmhhbmNlZFRhc2tbXSA9IFtdO1xyXG5cdHByaXZhdGUgaW5kZW50U3RhY2s6IEFycmF5PHtcclxuXHRcdHRhc2tJZDogc3RyaW5nO1xyXG5cdFx0aW5kZW50TGV2ZWw6IG51bWJlcjtcclxuXHRcdGFjdHVhbFNwYWNlczogbnVtYmVyO1xyXG5cdH0+ID0gW107XHJcblx0cHJpdmF0ZSBjdXJyZW50SGVhZGluZz86IHN0cmluZztcclxuXHRwcml2YXRlIGN1cnJlbnRIZWFkaW5nTGV2ZWw/OiBudW1iZXI7XHJcblx0cHJpdmF0ZSBmaWxlTWV0YWRhdGE/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+OyAvLyBTdG9yZSBmaWxlIGZyb250bWF0dGVyIG1ldGFkYXRhXHJcblx0cHJpdmF0ZSBwcm9qZWN0Q29uZmlnQ2FjaGU/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+OyAvLyBDYWNoZSBmb3IgcHJvamVjdCBjb25maWcgZmlsZXNcclxuXHRwcml2YXRlIGN1c3RvbURhdGVGb3JtYXRzPzogc3RyaW5nW107IC8vIFN0b3JlIGN1c3RvbSBkYXRlIGZvcm1hdHMgZnJvbSBzZXR0aW5nc1xyXG5cdHByaXZhdGUgdGltZVBhcnNpbmdTZXJ2aWNlPzogVGltZVBhcnNpbmdTZXJ2aWNlOyAvLyBFbmhhbmNlZCB0aW1lIHBhcnNpbmcgc2VydmljZVxyXG5cclxuXHQvLyBEYXRlIHBhcnNpbmcgY2FjaGUgdG8gaW1wcm92ZSBwZXJmb3JtYW5jZSBmb3IgbGFyZ2Utc2NhbGUgcGFyc2luZ1xyXG5cdHByaXZhdGUgc3RhdGljIGRhdGVDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXIgfCB1bmRlZmluZWQ+KCk7XHJcblx0cHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgTUFYX0NBQ0hFX1NJWkUgPSAxMDAwMDsgLy8gTGltaXQgY2FjaGUgc2l6ZSB0byBwcmV2ZW50IG1lbW9yeSBpc3N1ZXNcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRjb25maWc6IFRhc2tQYXJzZXJDb25maWcsXHJcblx0XHR0aW1lUGFyc2luZ1NlcnZpY2U/OiBUaW1lUGFyc2luZ1NlcnZpY2VcclxuXHQpIHtcclxuXHRcdHRoaXMuY29uZmlnID0gY29uZmlnO1xyXG5cdFx0Ly8gRXh0cmFjdCBjdXN0b20gZGF0ZSBmb3JtYXRzIGlmIGF2YWlsYWJsZVxyXG5cdFx0dGhpcy5jdXN0b21EYXRlRm9ybWF0cyA9IGNvbmZpZy5jdXN0b21EYXRlRm9ybWF0cztcclxuXHRcdHRoaXMudGltZVBhcnNpbmdTZXJ2aWNlID0gdGltZVBhcnNpbmdTZXJ2aWNlO1xyXG5cdH1cclxuXHJcblx0Ly8gUHVibGljIGFsaWFzIGZvciBleHRyYWN0TWV0YWRhdGFBbmRUYWdzXHJcblx0cHVibGljIGV4dHJhY3RNZXRhZGF0YUFuZFRhZ3MoXHJcblx0XHRjb250ZW50OiBzdHJpbmdcclxuXHQpOiBbc3RyaW5nLCBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+LCBzdHJpbmdbXV0ge1xyXG5cdFx0cmV0dXJuIHRoaXMuZXh0cmFjdE1ldGFkYXRhQW5kVGFnc0ludGVybmFsKGNvbnRlbnQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ3JlYXRlIHBhcnNlciB3aXRoIHByZWRlZmluZWQgc3RhdHVzIG1hcHBpbmdcclxuXHQgKi9cclxuXHRzdGF0aWMgY3JlYXRlV2l0aFN0YXR1c01hcHBpbmcoXHJcblx0XHRjb25maWc6IFRhc2tQYXJzZXJDb25maWcsXHJcblx0XHRzdGF0dXNNYXBwaW5nOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+LFxyXG5cdFx0dGltZVBhcnNpbmdTZXJ2aWNlPzogVGltZVBhcnNpbmdTZXJ2aWNlXHJcblx0KTogTWFya2Rvd25UYXNrUGFyc2VyIHtcclxuXHRcdGNvbnN0IG5ld0NvbmZpZyA9IHsgLi4uY29uZmlnLCBzdGF0dXNNYXBwaW5nIH07XHJcblx0XHRyZXR1cm4gbmV3IE1hcmtkb3duVGFza1BhcnNlcihuZXdDb25maWcsIHRpbWVQYXJzaW5nU2VydmljZSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBQYXJzZSBtYXJrZG93biBjb250ZW50IGFuZCByZXR1cm4gZW5oYW5jZWQgdGFza3NcclxuXHQgKi9cclxuXHRwYXJzZShcclxuXHRcdGlucHV0OiBzdHJpbmcsXHJcblx0XHRmaWxlUGF0aCA9IFwiXCIsXHJcblx0XHRmaWxlTWV0YWRhdGE/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+LFxyXG5cdFx0cHJvamVjdENvbmZpZ0RhdGE/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+LFxyXG5cdFx0dGdQcm9qZWN0PzogVGdQcm9qZWN0XHJcblx0KTogRW5oYW5jZWRUYXNrW10ge1xyXG5cdFx0dGhpcy5yZXNldCgpO1xyXG5cdFx0dGhpcy5maWxlTWV0YWRhdGEgPSBmaWxlTWV0YWRhdGE7XHJcblxyXG5cdFx0Ly8gU3RvcmUgcHJvamVjdCBjb25maWcgZGF0YSBpZiBwcm92aWRlZFxyXG5cdFx0aWYgKHByb2plY3RDb25maWdEYXRhKSB7XHJcblx0XHRcdHRoaXMucHJvamVjdENvbmZpZ0NhY2hlID0gcHJvamVjdENvbmZpZ0RhdGE7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgbGluZXMgPSBpbnB1dC5zcGxpdCgvXFxyP1xcbi8pO1xyXG5cdFx0bGV0IGkgPSAwO1xyXG5cdFx0bGV0IHBhcnNlSXRlcmF0aW9uID0gMDtcclxuXHRcdGxldCBpbkNvZGVCbG9jayA9IGZhbHNlO1xyXG5cclxuXHRcdHdoaWxlIChpIDwgbGluZXMubGVuZ3RoKSB7XHJcblx0XHRcdHBhcnNlSXRlcmF0aW9uKys7XHJcblx0XHRcdGlmIChwYXJzZUl0ZXJhdGlvbiA+IHRoaXMuY29uZmlnLm1heFBhcnNlSXRlcmF0aW9ucykge1xyXG5cdFx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcdFwiV2FybmluZzogTWF4aW11bSBwYXJzZSBpdGVyYXRpb25zIHJlYWNoZWQsIHN0b3BwaW5nIHRvIHByZXZlbnQgaW5maW5pdGUgbG9vcFwiXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgbGluZSA9IGxpbmVzW2ldO1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgZm9yIGNvZGUgYmxvY2sgZmVuY2VzXHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHRsaW5lLnRyaW0oKS5zdGFydHNXaXRoKFwiYGBgXCIpIHx8XHJcblx0XHRcdFx0bGluZS50cmltKCkuc3RhcnRzV2l0aChcIn5+flwiKVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRpbkNvZGVCbG9jayA9ICFpbkNvZGVCbG9jaztcclxuXHRcdFx0XHRpKys7XHJcblx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChpbkNvZGVCbG9jaykge1xyXG5cdFx0XHRcdGkrKztcclxuXHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgaWYgaXQncyBhIGhlYWRpbmcgbGluZVxyXG5cdFx0XHRpZiAodGhpcy5jb25maWcucGFyc2VIZWFkaW5ncykge1xyXG5cdFx0XHRcdGNvbnN0IGhlYWRpbmdSZXN1bHQgPSB0aGlzLmV4dHJhY3RIZWFkaW5nKGxpbmUpO1xyXG5cdFx0XHRcdGlmIChoZWFkaW5nUmVzdWx0KSB7XHJcblx0XHRcdFx0XHRjb25zdCBbbGV2ZWwsIGhlYWRpbmdUZXh0XSA9IGhlYWRpbmdSZXN1bHQ7XHJcblx0XHRcdFx0XHR0aGlzLmN1cnJlbnRIZWFkaW5nID0gaGVhZGluZ1RleHQ7XHJcblx0XHRcdFx0XHR0aGlzLmN1cnJlbnRIZWFkaW5nTGV2ZWwgPSBsZXZlbDtcclxuXHRcdFx0XHRcdGkrKztcclxuXHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgdGFza0xpbmVSZXN1bHQgPSB0aGlzLmV4dHJhY3RUYXNrTGluZShsaW5lKTtcclxuXHRcdFx0aWYgKHRhc2tMaW5lUmVzdWx0KSB7XHJcblx0XHRcdFx0Y29uc3QgW2FjdHVhbFNwYWNlcywgLCBjb250ZW50LCBsaXN0TWFya2VyXSA9IHRhc2tMaW5lUmVzdWx0O1xyXG5cdFx0XHRcdGNvbnN0IHRhc2tJZCA9IGAke2ZpbGVQYXRofS1MJHtpfWA7XHJcblxyXG5cdFx0XHRcdGNvbnN0IFtwYXJlbnRJZCwgaW5kZW50TGV2ZWxdID1cclxuXHRcdFx0XHRcdHRoaXMuZmluZFBhcmVudEFuZExldmVsKGFjdHVhbFNwYWNlcyk7XHJcblx0XHRcdFx0Y29uc3QgW3Rhc2tDb250ZW50LCByYXdTdGF0dXNdID0gdGhpcy5wYXJzZVRhc2tDb250ZW50KGNvbnRlbnQpO1xyXG5cdFx0XHRcdGNvbnN0IGNvbXBsZXRlZCA9IHJhd1N0YXR1cy50b0xvd2VyQ2FzZSgpID09PSBcInhcIjtcclxuXHRcdFx0XHRjb25zdCBzdGF0dXMgPSB0aGlzLmdldFN0YXR1c0Zyb21NYXBwaW5nKHJhd1N0YXR1cyk7XHJcblx0XHRcdFx0Y29uc3QgW2NsZWFuZWRDb250ZW50LCBtZXRhZGF0YSwgdGFnc10gPVxyXG5cdFx0XHRcdFx0dGhpcy5leHRyYWN0TWV0YWRhdGFBbmRUYWdzSW50ZXJuYWwodGFza0NvbnRlbnQpO1xyXG5cclxuXHRcdFx0XHQvLyBJbmhlcml0IG1ldGFkYXRhIGZyb20gZmlsZSBmcm9udG1hdHRlclxyXG5cdFx0XHRcdC8vIEEgdGFzayBpcyBhIHN1YnRhc2sgaWYgaXQgaGFzIGEgcGFyZW50XHJcblx0XHRcdFx0Y29uc3QgaXNTdWJ0YXNrID0gcGFyZW50SWQgIT09IHVuZGVmaW5lZDtcclxuXHRcdFx0XHRjb25zdCBpbmhlcml0ZWRNZXRhZGF0YSA9IHRoaXMuaW5oZXJpdEZpbGVNZXRhZGF0YShcclxuXHRcdFx0XHRcdG1ldGFkYXRhLFxyXG5cdFx0XHRcdFx0aXNTdWJ0YXNrXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0Ly8gRXh0cmFjdCB0aW1lIGNvbXBvbmVudHMgZnJvbSB0YXNrIGNvbnRlbnQgdXNpbmcgZW5oYW5jZWQgdGltZSBwYXJzaW5nXHJcblx0XHRcdFx0Y29uc3QgZW5oYW5jZWRNZXRhZGF0YSA9IHRoaXMuZXh0cmFjdFRpbWVDb21wb25lbnRzKFxyXG5cdFx0XHRcdFx0dGFza0NvbnRlbnQsXHJcblx0XHRcdFx0XHRpbmhlcml0ZWRNZXRhZGF0YVxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdC8vIFByb2Nlc3MgaW5oZXJpdGVkIHRhZ3MgYW5kIG1lcmdlIHdpdGggdGFzaydzIG93biB0YWdzXHJcblx0XHRcdFx0bGV0IGZpbmFsVGFncyA9IHRhZ3M7XHJcblx0XHRcdFx0aWYgKGluaGVyaXRlZE1ldGFkYXRhLnRhZ3MpIHtcclxuXHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IGluaGVyaXRlZFRhZ3MgPSBKU09OLnBhcnNlKFxyXG5cdFx0XHRcdFx0XHRcdGluaGVyaXRlZE1ldGFkYXRhLnRhZ3NcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0aWYgKEFycmF5LmlzQXJyYXkoaW5oZXJpdGVkVGFncykpIHtcclxuXHRcdFx0XHRcdFx0XHRmaW5hbFRhZ3MgPSB0aGlzLm1lcmdlVGFncyh0YWdzLCBpbmhlcml0ZWRUYWdzKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdFx0XHQvLyBJZiBwYXJzaW5nIGZhaWxzLCB0cmVhdCBhcyBhIHNpbmdsZSB0YWdcclxuXHRcdFx0XHRcdFx0ZmluYWxUYWdzID0gdGhpcy5tZXJnZVRhZ3ModGFncywgW1xyXG5cdFx0XHRcdFx0XHRcdGluaGVyaXRlZE1ldGFkYXRhLnRhZ3MsXHJcblx0XHRcdFx0XHRcdF0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gUHJlZmVyIHVwLXRvLWRhdGUgZGV0ZWN0aW9uIGZvciBjdXJyZW50IGZpbGU7IGZhbGwgYmFjayB0byBwcm92aWRlZCB0Z1Byb2plY3RcclxuXHRcdFx0XHRjb25zdCB0YXNrVGdQcm9qZWN0ID1cclxuXHRcdFx0XHRcdHRoaXMuZGV0ZXJtaW5lVGdQcm9qZWN0KGZpbGVQYXRoKSB8fCB0Z1Byb2plY3Q7XHJcblxyXG5cdFx0XHRcdC8vIENoZWNrIGZvciBtdWx0aWxpbmUgY29tbWVudHNcclxuXHRcdFx0XHRjb25zdCBbY29tbWVudCwgbGluZXNUb1NraXBdID1cclxuXHRcdFx0XHRcdHRoaXMuY29uZmlnLnBhcnNlQ29tbWVudHMgJiYgaSArIDEgPCBsaW5lcy5sZW5ndGhcclxuXHRcdFx0XHRcdFx0PyB0aGlzLmV4dHJhY3RNdWx0aWxpbmVDb21tZW50KFxyXG5cdFx0XHRcdFx0XHRcdFx0bGluZXMsXHJcblx0XHRcdFx0XHRcdFx0XHRpICsgMSxcclxuXHRcdFx0XHRcdFx0XHRcdGFjdHVhbFNwYWNlc1xyXG5cdFx0XHRcdFx0XHQgIClcclxuXHRcdFx0XHRcdFx0OiBbdW5kZWZpbmVkLCAwXTtcclxuXHJcblx0XHRcdFx0aSArPSBsaW5lc1RvU2tpcDtcclxuXHJcblx0XHRcdFx0Ly8gRGVidWc6IExvZyBwcmlvcml0eSBleHRyYWN0aW9uIGZvciBlYWNoIHRhc2tcclxuXHRcdFx0XHRjb25zdCBleHRyYWN0ZWRQcmlvcml0eSA9XHJcblx0XHRcdFx0XHR0aGlzLmV4dHJhY3RMZWdhY3lQcmlvcml0eShpbmhlcml0ZWRNZXRhZGF0YSk7XHJcblxyXG5cdFx0XHRcdGNvbnN0IGVuaGFuY2VkVGFzazogRW5oYW5jZWRUYXNrID0ge1xyXG5cdFx0XHRcdFx0aWQ6IHRhc2tJZCxcclxuXHRcdFx0XHRcdGNvbnRlbnQ6IGNsZWFuZWRDb250ZW50LFxyXG5cdFx0XHRcdFx0c3RhdHVzLFxyXG5cdFx0XHRcdFx0cmF3U3RhdHVzLFxyXG5cdFx0XHRcdFx0Y29tcGxldGVkLFxyXG5cdFx0XHRcdFx0aW5kZW50TGV2ZWwsXHJcblx0XHRcdFx0XHRwYXJlbnRJZCxcclxuXHRcdFx0XHRcdGNoaWxkcmVuSWRzOiBbXSxcclxuXHRcdFx0XHRcdG1ldGFkYXRhOiBlbmhhbmNlZE1ldGFkYXRhLFxyXG5cdFx0XHRcdFx0dGFnczogZmluYWxUYWdzLFxyXG5cdFx0XHRcdFx0Y29tbWVudCxcclxuXHRcdFx0XHRcdGxpbmVOdW1iZXI6IGkgKyAxLFxyXG5cdFx0XHRcdFx0YWN0dWFsSW5kZW50OiBhY3R1YWxTcGFjZXMsXHJcblx0XHRcdFx0XHRoZWFkaW5nOiB0aGlzLmN1cnJlbnRIZWFkaW5nLFxyXG5cdFx0XHRcdFx0aGVhZGluZ0xldmVsOiB0aGlzLmN1cnJlbnRIZWFkaW5nTGV2ZWwsXHJcblx0XHRcdFx0XHRsaXN0TWFya2VyLFxyXG5cdFx0XHRcdFx0ZmlsZVBhdGgsXHJcblx0XHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBsaW5lLFxyXG5cdFx0XHRcdFx0dGdQcm9qZWN0OiB0YXNrVGdQcm9qZWN0LFxyXG5cclxuXHRcdFx0XHRcdC8vIExlZ2FjeSBmaWVsZHMgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHlcclxuXHRcdFx0XHRcdGxpbmU6IGksXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHRwcmlvcml0eTogZXh0cmFjdGVkUHJpb3JpdHksXHJcblx0XHRcdFx0XHRzdGFydERhdGU6IHRoaXMuZXh0cmFjdExlZ2FjeURhdGUoXHJcblx0XHRcdFx0XHRcdGVuaGFuY2VkTWV0YWRhdGEsXHJcblx0XHRcdFx0XHRcdFwic3RhcnREYXRlXCJcclxuXHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHRkdWVEYXRlOiB0aGlzLmV4dHJhY3RMZWdhY3lEYXRlKFxyXG5cdFx0XHRcdFx0XHRlbmhhbmNlZE1ldGFkYXRhLFxyXG5cdFx0XHRcdFx0XHRcImR1ZURhdGVcIlxyXG5cdFx0XHRcdFx0KSxcclxuXHRcdFx0XHRcdHNjaGVkdWxlZERhdGU6IHRoaXMuZXh0cmFjdExlZ2FjeURhdGUoXHJcblx0XHRcdFx0XHRcdGVuaGFuY2VkTWV0YWRhdGEsXHJcblx0XHRcdFx0XHRcdFwic2NoZWR1bGVkRGF0ZVwiXHJcblx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0Y29tcGxldGVkRGF0ZTogdGhpcy5leHRyYWN0TGVnYWN5RGF0ZShcclxuXHRcdFx0XHRcdFx0ZW5oYW5jZWRNZXRhZGF0YSxcclxuXHRcdFx0XHRcdFx0XCJjb21wbGV0ZWREYXRlXCJcclxuXHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHRjcmVhdGVkRGF0ZTogdGhpcy5leHRyYWN0TGVnYWN5RGF0ZShcclxuXHRcdFx0XHRcdFx0ZW5oYW5jZWRNZXRhZGF0YSxcclxuXHRcdFx0XHRcdFx0XCJjcmVhdGVkRGF0ZVwiXHJcblx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0cmVjdXJyZW5jZTogZW5oYW5jZWRNZXRhZGF0YS5yZWN1cnJlbmNlLFxyXG5cdFx0XHRcdFx0cHJvamVjdDogZW5oYW5jZWRNZXRhZGF0YS5wcm9qZWN0LFxyXG5cdFx0XHRcdFx0Y29udGV4dDogZW5oYW5jZWRNZXRhZGF0YS5jb250ZXh0LFxyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdGlmIChwYXJlbnRJZCAmJiB0aGlzLnRhc2tzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRcdGNvbnN0IHBhcmVudFRhc2sgPSB0aGlzLnRhc2tzLmZpbmQoXHJcblx0XHRcdFx0XHRcdCh0KSA9PiB0LmlkID09PSBwYXJlbnRJZFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdGlmIChwYXJlbnRUYXNrKSB7XHJcblx0XHRcdFx0XHRcdHBhcmVudFRhc2suY2hpbGRyZW5JZHMucHVzaCh0YXNrSWQpO1xyXG5cdFx0XHRcdFx0XHRwYXJlbnRUYXNrLmNoaWxkcmVuLnB1c2godGFza0lkKTsgLy8gTGVnYWN5IGZpZWxkXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHR0aGlzLnVwZGF0ZUluZGVudFN0YWNrKHRhc2tJZCwgaW5kZW50TGV2ZWwsIGFjdHVhbFNwYWNlcyk7XHJcblx0XHRcdFx0dGhpcy50YXNrcy5wdXNoKGVuaGFuY2VkVGFzayk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGkrKztcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gWy4uLnRoaXMudGFza3NdO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUGFyc2UgYW5kIHJldHVybiBsZWdhY3kgVGFzayBmb3JtYXQgZm9yIGNvbXBhdGliaWxpdHlcclxuXHQgKi9cclxuXHRwYXJzZUxlZ2FjeShcclxuXHRcdGlucHV0OiBzdHJpbmcsXHJcblx0XHRmaWxlUGF0aDogc3RyaW5nID0gXCJcIixcclxuXHRcdGZpbGVNZXRhZGF0YT86IFJlY29yZDxzdHJpbmcsIGFueT4sXHJcblx0XHRwcm9qZWN0Q29uZmlnRGF0YT86IFJlY29yZDxzdHJpbmcsIGFueT4sXHJcblx0XHR0Z1Byb2plY3Q/OiBUZ1Byb2plY3RcclxuXHQpOiBUYXNrW10ge1xyXG5cdFx0Y29uc3QgZW5oYW5jZWRUYXNrcyA9IHRoaXMucGFyc2UoXHJcblx0XHRcdGlucHV0LFxyXG5cdFx0XHRmaWxlUGF0aCxcclxuXHRcdFx0ZmlsZU1ldGFkYXRhLFxyXG5cdFx0XHRwcm9qZWN0Q29uZmlnRGF0YSxcclxuXHRcdFx0dGdQcm9qZWN0XHJcblx0XHQpO1xyXG5cdFx0cmV0dXJuIGVuaGFuY2VkVGFza3MubWFwKCh0YXNrKSA9PiB0aGlzLmNvbnZlcnRUb0xlZ2FjeVRhc2sodGFzaykpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUGFyc2UgYSBzaW5nbGUgdGFzayBsaW5lXHJcblx0ICovXHJcblx0cGFyc2VUYXNrKGxpbmU6IHN0cmluZywgZmlsZVBhdGg6IHN0cmluZyA9IFwiXCIsIGxpbmVOdW06IG51bWJlciA9IDApOiBUYXNrIHtcclxuXHRcdGNvbnN0IGVuaGFuY2VkVGFzayA9IHRoaXMucGFyc2UobGluZSwgZmlsZVBhdGgpO1xyXG5cdFx0cmV0dXJuIHRoaXMuY29udmVydFRvTGVnYWN5VGFzayh7XHJcblx0XHRcdC4uLmVuaGFuY2VkVGFza1swXSxcclxuXHRcdFx0bGluZTogbGluZU51bSxcclxuXHRcdFx0aWQ6IGAke2ZpbGVQYXRofS1MJHtsaW5lTnVtfWAsXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVzZXQoKTogdm9pZCB7XHJcblx0XHR0aGlzLnRhc2tzID0gW107XHJcblx0XHR0aGlzLmluZGVudFN0YWNrID0gW107XHJcblx0XHR0aGlzLmN1cnJlbnRIZWFkaW5nID0gdW5kZWZpbmVkO1xyXG5cdFx0dGhpcy5jdXJyZW50SGVhZGluZ0xldmVsID0gdW5kZWZpbmVkO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBleHRyYWN0VGFza0xpbmUoXHJcblx0XHRsaW5lOiBzdHJpbmdcclxuXHQpOiBbbnVtYmVyLCBudW1iZXIsIHN0cmluZywgc3RyaW5nXSB8IG51bGwge1xyXG5cdFx0Ly8gUHJlc2VydmUgdHJhaWxpbmcgc3BhY2VzIHRvIGFsbG93IHBhcnNpbmcgb2YgZW1wdHktY29udGVudCB0YXNrcyBsaWtlIFwiLSBbIF0gXCJcclxuXHRcdGNvbnN0IHRyaW1tZWQgPSBsaW5lLnRyaW1TdGFydCgpO1xyXG5cdFx0Y29uc3QgYWN0dWFsU3BhY2VzID0gbGluZS5sZW5ndGggLSB0cmltbWVkLmxlbmd0aDtcclxuXHJcblx0XHRpZiAodGhpcy5pc1Rhc2tMaW5lKHRyaW1tZWQpKSB7XHJcblx0XHRcdGNvbnN0IGxpc3RNYXJrZXIgPSB0aGlzLmV4dHJhY3RMaXN0TWFya2VyKHRyaW1tZWQpO1xyXG5cdFx0XHRyZXR1cm4gW2FjdHVhbFNwYWNlcywgYWN0dWFsU3BhY2VzLCB0cmltbWVkLCBsaXN0TWFya2VyXTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZXh0cmFjdExpc3RNYXJrZXIodHJpbW1lZDogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdC8vIENoZWNrIHVub3JkZXJlZCBsaXN0IG1hcmtlcnNcclxuXHRcdGZvciAoY29uc3QgbWFya2VyIG9mIFtcIi1cIiwgXCIqXCIsIFwiK1wiXSkge1xyXG5cdFx0XHRpZiAodHJpbW1lZC5zdGFydHNXaXRoKG1hcmtlcikpIHtcclxuXHRcdFx0XHRyZXR1cm4gbWFya2VyO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2hlY2sgb3JkZXJlZCBsaXN0IG1hcmtlcnNcclxuXHRcdGNvbnN0IGNoYXJzID0gdHJpbW1lZC5zcGxpdChcIlwiKTtcclxuXHRcdGxldCBpID0gMDtcclxuXHJcblx0XHR3aGlsZSAoaSA8IGNoYXJzLmxlbmd0aCAmJiAvXFxkLy50ZXN0KGNoYXJzW2ldKSkge1xyXG5cdFx0XHRpKys7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKGkgPiAwICYmIGkgPCBjaGFycy5sZW5ndGgpIHtcclxuXHRcdFx0aWYgKGNoYXJzW2ldID09PSBcIi5cIiB8fCBjaGFyc1tpXSA9PT0gXCIpXCIpIHtcclxuXHRcdFx0XHRyZXR1cm4gY2hhcnMuc2xpY2UoMCwgaSArIDEpLmpvaW4oXCJcIik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBGYWxsYmFjazogcmV0dXJuIGZpcnN0IGNoYXJhY3RlclxyXG5cdFx0cmV0dXJuIHRyaW1tZWQuY2hhckF0KDApIHx8IFwiIFwiO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBpc1Rhc2tMaW5lKHRyaW1tZWQ6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0Ly8gVXNlIGV4aXN0aW5nIFRBU0tfUkVHRVggZnJvbSBjb21tb24vcmVnZXgtZGVmaW5lXHJcblx0XHRyZXR1cm4gVEFTS19SRUdFWC50ZXN0KHRyaW1tZWQpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBwYXJzZVRhc2tDb250ZW50KGNvbnRlbnQ6IHN0cmluZyk6IFtzdHJpbmcsIHN0cmluZ10ge1xyXG5cdFx0Y29uc3QgdGFza01hdGNoID0gY29udGVudC5tYXRjaChUQVNLX1JFR0VYKTtcclxuXHRcdGlmIChcclxuXHRcdFx0dGFza01hdGNoICYmXHJcblx0XHRcdHRhc2tNYXRjaFs0XSAhPT0gdW5kZWZpbmVkICYmXHJcblx0XHRcdHRhc2tNYXRjaFs1XSAhPT0gdW5kZWZpbmVkXHJcblx0XHQpIHtcclxuXHRcdFx0Y29uc3Qgc3RhdHVzID0gdGFza01hdGNoWzRdO1xyXG5cdFx0XHRjb25zdCB0YXNrQ29udGVudCA9IHRhc2tNYXRjaFs1XS50cmltKCk7XHJcblx0XHRcdHJldHVybiBbdGFza0NvbnRlbnQsIHN0YXR1c107XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRmFsbGJhY2sgLSB0cmVhdCBhcyB1bmNoZWNrZWQgdGFza1xyXG5cdFx0cmV0dXJuIFtjb250ZW50LCBcIiBcIl07XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGV4dHJhY3RNZXRhZGF0YUFuZFRhZ3NJbnRlcm5hbChcclxuXHRcdGNvbnRlbnQ6IHN0cmluZ1xyXG5cdCk6IFtzdHJpbmcsIFJlY29yZDxzdHJpbmcsIHN0cmluZz4sIHN0cmluZ1tdXSB7XHJcblx0XHRjb25zdCBtZXRhZGF0YTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xyXG5cdFx0Y29uc3QgdGFnczogc3RyaW5nW10gPSBbXTtcclxuXHRcdGxldCBjbGVhbmVkQ29udGVudCA9IFwiXCI7XHJcblx0XHRsZXQgcmVtYWluaW5nID0gY29udGVudDtcclxuXHJcblx0XHRsZXQgbWV0YWRhdGFJdGVyYXRpb24gPSAwO1xyXG5cdFx0d2hpbGUgKG1ldGFkYXRhSXRlcmF0aW9uIDwgdGhpcy5jb25maWcubWF4TWV0YWRhdGFJdGVyYXRpb25zKSB7XHJcblx0XHRcdG1ldGFkYXRhSXRlcmF0aW9uKys7XHJcblx0XHRcdGxldCBmb3VuZE1hdGNoID0gZmFsc2U7XHJcblxyXG5cdFx0XHQvLyBDaGVjayBkYXRhdmlldyBmb3JtYXQgbWV0YWRhdGEgW2tleTo6dmFsdWVdXHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHR0aGlzLmNvbmZpZy5wYXJzZU1ldGFkYXRhICYmXHJcblx0XHRcdFx0KHRoaXMuY29uZmlnLm1ldGFkYXRhUGFyc2VNb2RlID09PVxyXG5cdFx0XHRcdFx0TWV0YWRhdGFQYXJzZU1vZGUuRGF0YXZpZXdPbmx5IHx8XHJcblx0XHRcdFx0XHR0aGlzLmNvbmZpZy5tZXRhZGF0YVBhcnNlTW9kZSA9PT0gTWV0YWRhdGFQYXJzZU1vZGUuQm90aClcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0Y29uc3QgYnJhY2tldE1hdGNoID0gdGhpcy5leHRyYWN0RGF0YXZpZXdNZXRhZGF0YShyZW1haW5pbmcpO1xyXG5cdFx0XHRcdGlmIChicmFja2V0TWF0Y2gpIHtcclxuXHRcdFx0XHRcdGNvbnN0IFtrZXksIHZhbHVlLCBuZXdSZW1haW5pbmddID0gYnJhY2tldE1hdGNoO1xyXG5cdFx0XHRcdFx0bWV0YWRhdGFba2V5XSA9IHZhbHVlO1xyXG5cclxuXHRcdFx0XHRcdC8vIERlYnVnOiBMb2cgZGF0YXZpZXcgbWV0YWRhdGEgZXh0cmFjdGlvbiwgZXNwZWNpYWxseSBwcmlvcml0eVxyXG5cdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHQocHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09IFwiZGV2ZWxvcG1lbnRcIiB8fCB0cnVlKSAmJlxyXG5cdFx0XHRcdFx0XHRrZXkgPT09IFwicHJpb3JpdHlcIlxyXG5cdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdC8vIEFsd2F5cyBsb2cgZm9yIGRlYnVnZ2luZ1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIltQYXJzZXJdIERhdGF2aWV3IHByaW9yaXR5IGZvdW5kOlwiLCB7XHJcblx0XHRcdFx0XHRcdFx0a2V5LFxyXG5cdFx0XHRcdFx0XHRcdHZhbHVlLFxyXG5cdFx0XHRcdFx0XHRcdHJlbWFpbmluZzogcmVtYWluaW5nLnN1YnN0cmluZygwLCA1MCksXHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdHJlbWFpbmluZyA9IG5ld1JlbWFpbmluZztcclxuXHRcdFx0XHRcdGZvdW5kTWF0Y2ggPSB0cnVlO1xyXG5cdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBDaGVjayBlbW9qaSBtZXRhZGF0YVxyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0IWZvdW5kTWF0Y2ggJiZcclxuXHRcdFx0XHR0aGlzLmNvbmZpZy5wYXJzZU1ldGFkYXRhICYmXHJcblx0XHRcdFx0KHRoaXMuY29uZmlnLm1ldGFkYXRhUGFyc2VNb2RlID09PVxyXG5cdFx0XHRcdFx0TWV0YWRhdGFQYXJzZU1vZGUuRW1vamlPbmx5IHx8XHJcblx0XHRcdFx0XHR0aGlzLmNvbmZpZy5tZXRhZGF0YVBhcnNlTW9kZSA9PT0gTWV0YWRhdGFQYXJzZU1vZGUuQm90aClcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0Y29uc3QgZW1vamlNYXRjaCA9IHRoaXMuZXh0cmFjdEVtb2ppTWV0YWRhdGEocmVtYWluaW5nKTtcclxuXHRcdFx0XHRpZiAoZW1vamlNYXRjaCkge1xyXG5cdFx0XHRcdFx0Y29uc3QgW2tleSwgdmFsdWUsIGJlZm9yZUNvbnRlbnQsIGFmdGVyUmVtYWluaW5nXSA9XHJcblx0XHRcdFx0XHRcdGVtb2ppTWF0Y2g7XHJcblxyXG5cdFx0XHRcdFx0Ly8gUHJvY2VzcyB0YWdzIGluIHRoZSBjb250ZW50IGJlZm9yZSBlbW9qaVxyXG5cdFx0XHRcdFx0Y29uc3QgW2JlZm9yZUNsZWFuZWQsIGJlZm9yZU1ldGFkYXRhLCBiZWZvcmVUYWdzXSA9XHJcblx0XHRcdFx0XHRcdHRoaXMuZXh0cmFjdFRhZ3NPbmx5KGJlZm9yZUNvbnRlbnQpO1xyXG5cclxuXHRcdFx0XHRcdC8vIE1lcmdlIG1ldGFkYXRhIGFuZCB0YWdzIGZyb20gYmVmb3JlIGNvbnRlbnRcclxuXHRcdFx0XHRcdGZvciAoY29uc3QgdGFnIG9mIGJlZm9yZVRhZ3MpIHtcclxuXHRcdFx0XHRcdFx0dGFncy5wdXNoKHRhZyk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRmb3IgKGNvbnN0IFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyhiZWZvcmVNZXRhZGF0YSkpIHtcclxuXHRcdFx0XHRcdFx0bWV0YWRhdGFba10gPSB2O1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdG1ldGFkYXRhW2tleV0gPSB2YWx1ZTtcclxuXHRcdFx0XHRcdGNsZWFuZWRDb250ZW50ICs9IGJlZm9yZUNsZWFuZWQ7XHJcblx0XHRcdFx0XHRyZW1haW5pbmcgPSBhZnRlclJlbWFpbmluZztcclxuXHRcdFx0XHRcdGZvdW5kTWF0Y2ggPSB0cnVlO1xyXG5cdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBDaGVjayBjb250ZXh0IChAc3ltYm9sKVxyXG5cdFx0XHRpZiAoIWZvdW5kTWF0Y2ggJiYgdGhpcy5jb25maWcucGFyc2VUYWdzKSB7XHJcblx0XHRcdFx0Y29uc3QgY29udGV4dE1hdGNoID0gdGhpcy5leHRyYWN0Q29udGV4dChyZW1haW5pbmcpO1xyXG5cdFx0XHRcdGlmIChjb250ZXh0TWF0Y2gpIHtcclxuXHRcdFx0XHRcdGNvbnN0IFtjb250ZXh0LCBiZWZvcmVDb250ZW50LCBhZnRlclJlbWFpbmluZ10gPVxyXG5cdFx0XHRcdFx0XHRjb250ZXh0TWF0Y2g7XHJcblx0XHRcdFx0XHRtZXRhZGF0YS5jb250ZXh0ID0gY29udGV4dDtcclxuXHRcdFx0XHRcdGNsZWFuZWRDb250ZW50ICs9IGJlZm9yZUNvbnRlbnQ7XHJcblx0XHRcdFx0XHRyZW1haW5pbmcgPSBhZnRlclJlbWFpbmluZztcclxuXHRcdFx0XHRcdGZvdW5kTWF0Y2ggPSB0cnVlO1xyXG5cdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBDaGVjayB0YWdzIGFuZCBzcGVjaWFsIHRhZ3NcclxuXHRcdFx0aWYgKCFmb3VuZE1hdGNoICYmIHRoaXMuY29uZmlnLnBhcnNlVGFncykge1xyXG5cdFx0XHRcdGNvbnN0IHRhZ01hdGNoID0gdGhpcy5leHRyYWN0VGFnKHJlbWFpbmluZyk7XHJcblx0XHRcdFx0aWYgKHRhZ01hdGNoKSB7XHJcblx0XHRcdFx0XHRjb25zdCBbdGFnLCBiZWZvcmVDb250ZW50LCBhZnRlclJlbWFpbmluZ10gPSB0YWdNYXRjaDtcclxuXHJcblx0XHRcdFx0XHQvLyBDaGVjayBpZiBpdCdzIGEgc3BlY2lhbCB0YWcgZm9ybWF0IChwcmVmaXgvdmFsdWUpXHJcblx0XHRcdFx0XHQvLyBSZW1vdmUgIyBwcmVmaXggZm9yIGNoZWNraW5nIHNwZWNpYWwgdGFnc1xyXG5cdFx0XHRcdFx0Y29uc3QgdGFnV2l0aG91dEhhc2ggPSB0YWcuc3RhcnRzV2l0aChcIiNcIilcclxuXHRcdFx0XHRcdFx0PyB0YWcuc3Vic3RyaW5nKDEpXHJcblx0XHRcdFx0XHRcdDogdGFnO1xyXG5cdFx0XHRcdFx0Y29uc3Qgc2xhc2hQb3MgPSB0YWdXaXRob3V0SGFzaC5pbmRleE9mKFwiL1wiKTtcclxuXHRcdFx0XHRcdGlmIChzbGFzaFBvcyAhPT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgcHJlZml4ID0gdGFnV2l0aG91dEhhc2guc3Vic3RyaW5nKDAsIHNsYXNoUG9zKTtcclxuXHRcdFx0XHRcdFx0Y29uc3QgdmFsdWUgPSB0YWdXaXRob3V0SGFzaC5zdWJzdHJpbmcoc2xhc2hQb3MgKyAxKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIENhc2UtaW5zZW5zaXRpdmUgbWF0Y2ggZm9yIHNwZWNpYWwgdGFnIHByZWZpeGVzLCB3aXRoIGRlYnVnXHJcblx0XHRcdFx0XHRcdGNvbnN0IG1ldGFkYXRhS2V5ID1cclxuXHRcdFx0XHRcdFx0XHR0aGlzLmNvbmZpZy5zcGVjaWFsVGFnUHJlZml4ZXNbcHJlZml4XSA/P1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMuY29uZmlnLnNwZWNpYWxUYWdQcmVmaXhlc1tcclxuXHRcdFx0XHRcdFx0XHRcdHByZWZpeC50b0xvd2VyQ2FzZSgpXHJcblx0XHRcdFx0XHRcdFx0XTtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5kZWJ1ZyhcIltUUEJdIFRhZyBwYXJzZVwiLCB7XHJcblx0XHRcdFx0XHRcdFx0dGFnLFxyXG5cdFx0XHRcdFx0XHRcdHByZWZpeCxcclxuXHRcdFx0XHRcdFx0XHRtYXBwZWRLZXk6IG1ldGFkYXRhS2V5LFxyXG5cdFx0XHRcdFx0XHRcdGtleXM6IE9iamVjdC5rZXlzKHRoaXMuY29uZmlnLnNwZWNpYWxUYWdQcmVmaXhlcyksXHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0bWV0YWRhdGFLZXkgJiZcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmNvbmZpZy5tZXRhZGF0YVBhcnNlTW9kZSAhPT1cclxuXHRcdFx0XHRcdFx0XHRcdE1ldGFkYXRhUGFyc2VNb2RlLk5vbmVcclxuXHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0bWV0YWRhdGFbbWV0YWRhdGFLZXldID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0dGFncy5wdXNoKHRhZyk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdHRhZ3MucHVzaCh0YWcpO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdGNsZWFuZWRDb250ZW50ICs9IGJlZm9yZUNvbnRlbnQ7XHJcblx0XHRcdFx0XHRyZW1haW5pbmcgPSBhZnRlclJlbWFpbmluZztcclxuXHRcdFx0XHRcdGZvdW5kTWF0Y2ggPSB0cnVlO1xyXG5cdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoIWZvdW5kTWF0Y2gpIHtcclxuXHRcdFx0XHRjbGVhbmVkQ29udGVudCArPSByZW1haW5pbmc7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gW2NsZWFuZWRDb250ZW50LnRyaW0oKSwgbWV0YWRhdGEsIHRhZ3NdO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRXh0cmFjdCB0aW1lIGNvbXBvbmVudHMgZnJvbSB0YXNrIGNvbnRlbnQgYW5kIG1lcmdlIHdpdGggZXhpc3RpbmcgbWV0YWRhdGFcclxuXHQgKi9cclxuXHRwcml2YXRlIGV4dHJhY3RUaW1lQ29tcG9uZW50cyhcclxuXHRcdHRhc2tDb250ZW50OiBzdHJpbmcsXHJcblx0XHRleGlzdGluZ01ldGFkYXRhOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XHJcblx0KTogRW5oYW5jZWRTdGFuZGFyZFRhc2tNZXRhZGF0YSB7XHJcblx0XHRpZiAoIXRoaXMudGltZVBhcnNpbmdTZXJ2aWNlKSB7XHJcblx0XHRcdC8vIFJldHVybiBleGlzdGluZyBtZXRhZGF0YSBhcyBFbmhhbmNlZFN0YW5kYXJkVGFza01ldGFkYXRhIHdpdGhvdXQgdGltZSBjb21wb25lbnRzXHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0Li4uZXhpc3RpbmdNZXRhZGF0YSxcclxuXHRcdFx0XHR0YWdzOiB0aGlzLnNhZmVQYXJzZVRhZ3NGaWVsZChleGlzdGluZ01ldGFkYXRhLnRhZ3MpLFxyXG5cdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0fSBhcyBFbmhhbmNlZFN0YW5kYXJkVGFza01ldGFkYXRhO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdC8vIFBhcnNlIHRpbWUgY29tcG9uZW50cyBmcm9tIHRhc2sgY29udGVudFxyXG5cdFx0XHRsZXQgdGltZUNvbXBvbmVudHM6IFJlY29yZDxzdHJpbmcsIFRpbWVDb21wb25lbnQ+ID0ge307XHJcblx0XHRcdGxldCBlcnJvcnM6IGFueVtdID0gW107XHJcblx0XHRcdGxldCB3YXJuaW5nczogYW55W10gPSBbXTtcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRjb25zdCByZXN1bHQgPVxyXG5cdFx0XHRcdFx0dGhpcy50aW1lUGFyc2luZ1NlcnZpY2UucGFyc2VUaW1lQ29tcG9uZW50cyh0YXNrQ29udGVudCk7XHJcblx0XHRcdFx0dGltZUNvbXBvbmVudHMgPSByZXN1bHQudGltZUNvbXBvbmVudHM7XHJcblx0XHRcdFx0ZXJyb3JzID0gcmVzdWx0LmVycm9ycyB8fCBbXTtcclxuXHRcdFx0XHR3YXJuaW5ncyA9IHJlc3VsdC53YXJuaW5ncyB8fCBbXTtcclxuXHRcdFx0fSBjYXRjaCAoaW5uZXJFcnIpIHtcclxuXHRcdFx0XHQvLyBTd2FsbG93IEpTT04ucGFyc2Ugb3IgZm9ybWF0IGVycm9ycyBmcm9tIHRpbWUgcGFyc2luZzsgY29udGludWUgd2l0aG91dCB0aW1lIGNvbXBvbmVudHNcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRcIltNYXJrZG93blRhc2tQYXJzZXJdIHRpbWVQYXJzaW5nU2VydmljZS5wYXJzZVRpbWVDb21wb25lbnRzIGZhaWxlZCwgY29udGludWluZyB3aXRob3V0IHRpbWUgY29tcG9uZW50czpcIixcclxuXHRcdFx0XHRcdGlubmVyRXJyXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHR0aW1lQ29tcG9uZW50cyA9IHt9O1xyXG5cdFx0XHRcdGVycm9ycyA9IFtdO1xyXG5cdFx0XHRcdHdhcm5pbmdzID0gW107XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIExvZyB3YXJuaW5ncyBpZiBhbnlcclxuXHRcdFx0aWYgKHdhcm5pbmdzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRgW01hcmtkb3duVGFza1BhcnNlcl0gVGltZSBwYXJzaW5nIHdhcm5pbmdzIGZvciBcIiR7dGFza0NvbnRlbnR9XCI6YCxcclxuXHRcdFx0XHRcdHdhcm5pbmdzXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gTG9nIGVycm9ycyBpZiBhbnkgKGJ1dCBkb24ndCBmYWlsKVxyXG5cdFx0XHRpZiAoZXJyb3JzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRgW01hcmtkb3duVGFza1BhcnNlcl0gVGltZSBwYXJzaW5nIGVycm9ycyBmb3IgXCIke3Rhc2tDb250ZW50fVwiOmAsXHJcblx0XHRcdFx0XHRlcnJvcnNcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBDcmVhdGUgZW5oYW5jZWQgbWV0YWRhdGFcclxuXHRcdFx0Y29uc3QgZW5oYW5jZWRNZXRhZGF0YTogRW5oYW5jZWRTdGFuZGFyZFRhc2tNZXRhZGF0YSA9IHtcclxuXHRcdFx0XHQuLi5leGlzdGluZ01ldGFkYXRhLFxyXG5cdFx0XHRcdHRhZ3M6IHRoaXMuc2FmZVBhcnNlVGFnc0ZpZWxkKGV4aXN0aW5nTWV0YWRhdGEudGFncyksXHJcblx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHR9IGFzIEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGE7XHJcblxyXG5cdFx0XHQvLyBBZGQgdGltZSBjb21wb25lbnRzIGlmIGZvdW5kXHJcblx0XHRcdGlmIChPYmplY3Qua2V5cyh0aW1lQ29tcG9uZW50cykubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdGVuaGFuY2VkTWV0YWRhdGEudGltZUNvbXBvbmVudHMgPSB0aW1lQ29tcG9uZW50cztcclxuXHJcblx0XHRcdFx0Ly8gQ3JlYXRlIGVuaGFuY2VkIGRhdGV0aW1lIG9iamVjdHMgYnkgY29tYmluaW5nIGV4aXN0aW5nIGRhdGVzIHdpdGggdGltZSBjb21wb25lbnRzXHJcblx0XHRcdFx0ZW5oYW5jZWRNZXRhZGF0YS5lbmhhbmNlZERhdGVzID1cclxuXHRcdFx0XHRcdHRoaXMuY29tYmluZVRpbWVzdGFtcHNXaXRoVGltZUNvbXBvbmVudHMoXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRzdGFydERhdGU6IGV4aXN0aW5nTWV0YWRhdGEuc3RhcnREYXRlLFxyXG5cdFx0XHRcdFx0XHRcdGR1ZURhdGU6IGV4aXN0aW5nTWV0YWRhdGEuZHVlRGF0ZSxcclxuXHRcdFx0XHRcdFx0XHRzY2hlZHVsZWREYXRlOiBleGlzdGluZ01ldGFkYXRhLnNjaGVkdWxlZERhdGUsXHJcblx0XHRcdFx0XHRcdFx0Y29tcGxldGVkRGF0ZTogZXhpc3RpbmdNZXRhZGF0YS5jb21wbGV0ZWREYXRlLFxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHR0aW1lQ29tcG9uZW50c1xyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIGVuaGFuY2VkTWV0YWRhdGE7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFxyXG5cdFx0XHRcdGBbTWFya2Rvd25UYXNrUGFyc2VyXSBGYWlsZWQgdG8gZXh0cmFjdCB0aW1lIGNvbXBvbmVudHMgZnJvbSBcIiR7dGFza0NvbnRlbnR9XCI6YCxcclxuXHRcdFx0XHRlcnJvclxyXG5cdFx0XHQpO1xyXG5cdFx0XHQvLyBSZXR1cm4gZXhpc3RpbmcgbWV0YWRhdGEgd2l0aG91dCB0aW1lIGNvbXBvbmVudHMgb24gZXJyb3JcclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHQuLi5leGlzdGluZ01ldGFkYXRhLFxyXG5cdFx0XHRcdHRhZ3M6IHRoaXMuc2FmZVBhcnNlVGFnc0ZpZWxkKGV4aXN0aW5nTWV0YWRhdGEudGFncyksXHJcblx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHR9IGFzIEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGE7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDb21iaW5lIGRhdGUgdGltZXN0YW1wcyB3aXRoIHRpbWUgY29tcG9uZW50cyB0byBjcmVhdGUgZW5oYW5jZWQgZGF0ZXRpbWUgb2JqZWN0c1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgY29tYmluZVRpbWVzdGFtcHNXaXRoVGltZUNvbXBvbmVudHMoXHJcblx0XHRkYXRlczoge1xyXG5cdFx0XHRzdGFydERhdGU/OiBudW1iZXIgfCBzdHJpbmc7XHJcblx0XHRcdGR1ZURhdGU/OiBudW1iZXIgfCBzdHJpbmc7XHJcblx0XHRcdHNjaGVkdWxlZERhdGU/OiBudW1iZXIgfCBzdHJpbmc7XHJcblx0XHRcdGNvbXBsZXRlZERhdGU/OiBudW1iZXIgfCBzdHJpbmc7XHJcblx0XHR9LFxyXG5cdFx0dGltZUNvbXBvbmVudHM6IEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGFbXCJ0aW1lQ29tcG9uZW50c1wiXVxyXG5cdCk6IEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGFbXCJlbmhhbmNlZERhdGVzXCJdIHtcclxuXHRcdGlmICghdGltZUNvbXBvbmVudHMpIHtcclxuXHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBlbmhhbmNlZERhdGVzOiBFbmhhbmNlZFN0YW5kYXJkVGFza01ldGFkYXRhW1wiZW5oYW5jZWREYXRlc1wiXSA9IHt9O1xyXG5cclxuXHRcdC8vIEhlbHBlciBmdW5jdGlvbiB0byBjb21iaW5lIGRhdGUgYW5kIHRpbWUgY29tcG9uZW50XHJcblx0XHRjb25zdCBjb21iaW5lRGF0ZVRpbWUgPSAoXHJcblx0XHRcdGRhdGVWYWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgdW5kZWZpbmVkLFxyXG5cdFx0XHR0aW1lQ29tcG9uZW50OiBUaW1lQ29tcG9uZW50IHwgdW5kZWZpbmVkXHJcblx0XHQpOiBEYXRlIHwgdW5kZWZpbmVkID0+IHtcclxuXHRcdFx0aWYgKCFkYXRlVmFsdWUgfHwgIXRpbWVDb21wb25lbnQpIHtcclxuXHRcdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRsZXQgZGF0ZTogRGF0ZTtcclxuXHRcdFx0aWYgKHR5cGVvZiBkYXRlVmFsdWUgPT09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0XHQvLyBIYW5kbGUgZGF0ZSBzdHJpbmdzIGxpa2UgXCIyMDI1LTA4LTI1XCJcclxuXHRcdFx0XHRpZiAoL15cXGR7NH0tXFxkezJ9LVxcZHsyfSQvLnRlc3QoZGF0ZVZhbHVlKSkge1xyXG5cdFx0XHRcdFx0Y29uc3QgW3llYXIsIG1vbnRoLCBkYXldID0gZGF0ZVZhbHVlLnNwbGl0KFwiLVwiKS5tYXAoTnVtYmVyKTtcclxuXHRcdFx0XHRcdGRhdGUgPSBuZXcgRGF0ZSh5ZWFyLCBtb250aCAtIDEsIGRheSk7IC8vIG1vbnRoIGlzIDAtYmFzZWRcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0ZGF0ZSA9IG5ldyBEYXRlKGRhdGVWYWx1ZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIEhhbmRsZSB0aW1lc3RhbXAgbnVtYmVyc1xyXG5cdFx0XHRcdGRhdGUgPSBuZXcgRGF0ZShkYXRlVmFsdWUpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoaXNOYU4oZGF0ZS5nZXRUaW1lKCkpKSB7XHJcblx0XHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgY29tYmluZWREYXRlID0gbmV3IERhdGUoXHJcblx0XHRcdFx0ZGF0ZS5nZXRGdWxsWWVhcigpLFxyXG5cdFx0XHRcdGRhdGUuZ2V0TW9udGgoKSxcclxuXHRcdFx0XHRkYXRlLmdldERhdGUoKSxcclxuXHRcdFx0XHR0aW1lQ29tcG9uZW50LmhvdXIsXHJcblx0XHRcdFx0dGltZUNvbXBvbmVudC5taW51dGUsXHJcblx0XHRcdFx0dGltZUNvbXBvbmVudC5zZWNvbmQgfHwgMFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0cmV0dXJuIGNvbWJpbmVkRGF0ZTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gQ29tYmluZSBzdGFydCBkYXRlIHdpdGggc3RhcnQgdGltZVxyXG5cdFx0aWYgKGRhdGVzLnN0YXJ0RGF0ZSAmJiB0aW1lQ29tcG9uZW50cy5zdGFydFRpbWUpIHtcclxuXHRcdFx0ZW5oYW5jZWREYXRlcy5zdGFydERhdGVUaW1lID0gY29tYmluZURhdGVUaW1lKFxyXG5cdFx0XHRcdGRhdGVzLnN0YXJ0RGF0ZSxcclxuXHRcdFx0XHR0aW1lQ29tcG9uZW50cy5zdGFydFRpbWVcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDb21iaW5lIGR1ZSBkYXRlIHdpdGggZHVlIHRpbWVcclxuXHRcdGlmIChkYXRlcy5kdWVEYXRlICYmIHRpbWVDb21wb25lbnRzLmR1ZVRpbWUpIHtcclxuXHRcdFx0ZW5oYW5jZWREYXRlcy5kdWVEYXRlVGltZSA9IGNvbWJpbmVEYXRlVGltZShcclxuXHRcdFx0XHRkYXRlcy5kdWVEYXRlLFxyXG5cdFx0XHRcdHRpbWVDb21wb25lbnRzLmR1ZVRpbWVcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDb21iaW5lIHNjaGVkdWxlZCBkYXRlIHdpdGggc2NoZWR1bGVkIHRpbWVcclxuXHRcdGlmIChkYXRlcy5zY2hlZHVsZWREYXRlICYmIHRpbWVDb21wb25lbnRzLnNjaGVkdWxlZFRpbWUpIHtcclxuXHRcdFx0ZW5oYW5jZWREYXRlcy5zY2hlZHVsZWREYXRlVGltZSA9IGNvbWJpbmVEYXRlVGltZShcclxuXHRcdFx0XHRkYXRlcy5zY2hlZHVsZWREYXRlLFxyXG5cdFx0XHRcdHRpbWVDb21wb25lbnRzLnNjaGVkdWxlZFRpbWVcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBIYW5kbGUgZW5kIHRpbWUgLSBpZiB3ZSBoYXZlIHN0YXJ0IGRhdGUgYW5kIGVuZCB0aW1lLCBjcmVhdGUgZW5kIGRhdGV0aW1lXHJcblx0XHRpZiAoZGF0ZXMuc3RhcnREYXRlICYmIHRpbWVDb21wb25lbnRzLmVuZFRpbWUpIHtcclxuXHRcdFx0ZW5oYW5jZWREYXRlcy5lbmREYXRlVGltZSA9IGNvbWJpbmVEYXRlVGltZShcclxuXHRcdFx0XHRkYXRlcy5zdGFydERhdGUsXHJcblx0XHRcdFx0dGltZUNvbXBvbmVudHMuZW5kVGltZVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIElmIHdlIGhhdmUgYSBkdWUgZGF0ZSBidXQgdGhlIHRpbWUgY29tcG9uZW50IGlzIHNjaGVkdWxlZFRpbWUgKGNvbW1vbiB3aXRoIFwiYXRcIiBrZXl3b3JkKSxcclxuXHRcdC8vIGNyZWF0ZSBkdWVEYXRlVGltZSB1c2luZyBzY2hlZHVsZWRUaW1lXHJcblx0XHRpZiAoXHJcblx0XHRcdGRhdGVzLmR1ZURhdGUgJiZcclxuXHRcdFx0IXRpbWVDb21wb25lbnRzLmR1ZVRpbWUgJiZcclxuXHRcdFx0dGltZUNvbXBvbmVudHMuc2NoZWR1bGVkVGltZVxyXG5cdFx0KSB7XHJcblx0XHRcdGVuaGFuY2VkRGF0ZXMuZHVlRGF0ZVRpbWUgPSBjb21iaW5lRGF0ZVRpbWUoXHJcblx0XHRcdFx0ZGF0ZXMuZHVlRGF0ZSxcclxuXHRcdFx0XHR0aW1lQ29tcG9uZW50cy5zY2hlZHVsZWRUaW1lXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSWYgd2UgaGF2ZSBhIHNjaGVkdWxlZCBkYXRlIGJ1dCB0aGUgdGltZSBjb21wb25lbnQgaXMgZHVlVGltZSxcclxuXHRcdC8vIGNyZWF0ZSBzY2hlZHVsZWREYXRlVGltZSB1c2luZyBkdWVUaW1lXHJcblx0XHRpZiAoXHJcblx0XHRcdGRhdGVzLnNjaGVkdWxlZERhdGUgJiZcclxuXHRcdFx0IXRpbWVDb21wb25lbnRzLnNjaGVkdWxlZFRpbWUgJiZcclxuXHRcdFx0dGltZUNvbXBvbmVudHMuZHVlVGltZVxyXG5cdFx0KSB7XHJcblx0XHRcdGVuaGFuY2VkRGF0ZXMuc2NoZWR1bGVkRGF0ZVRpbWUgPSBjb21iaW5lRGF0ZVRpbWUoXHJcblx0XHRcdFx0ZGF0ZXMuc2NoZWR1bGVkRGF0ZSxcclxuXHRcdFx0XHR0aW1lQ29tcG9uZW50cy5kdWVUaW1lXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIE9iamVjdC5rZXlzKGVuaGFuY2VkRGF0ZXMpLmxlbmd0aCA+IDBcclxuXHRcdFx0PyBlbmhhbmNlZERhdGVzXHJcblx0XHRcdDogdW5kZWZpbmVkO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBleHRyYWN0RGF0YXZpZXdNZXRhZGF0YShcclxuXHRcdGNvbnRlbnQ6IHN0cmluZ1xyXG5cdCk6IFtzdHJpbmcsIHN0cmluZywgc3RyaW5nXSB8IG51bGwge1xyXG5cdFx0Y29uc3Qgc3RhcnQgPSBjb250ZW50LmluZGV4T2YoXCJbXCIpO1xyXG5cdFx0aWYgKHN0YXJ0ID09PSAtMSkgcmV0dXJuIG51bGw7XHJcblxyXG5cdFx0Y29uc3QgZW5kID0gY29udGVudC5pbmRleE9mKFwiXVwiLCBzdGFydCk7XHJcblx0XHRpZiAoZW5kID09PSAtMSkgcmV0dXJuIG51bGw7XHJcblxyXG5cdFx0Y29uc3QgYnJhY2tldENvbnRlbnQgPSBjb250ZW50LnN1YnN0cmluZyhzdGFydCArIDEsIGVuZCk7XHJcblx0XHRpZiAoIWJyYWNrZXRDb250ZW50LmluY2x1ZGVzKFwiOjpcIikpIHJldHVybiBudWxsO1xyXG5cclxuXHRcdGNvbnN0IHBhcnRzID0gYnJhY2tldENvbnRlbnQuc3BsaXQoXCI6OlwiLCAyKTtcclxuXHRcdGlmIChwYXJ0cy5sZW5ndGggIT09IDIpIHJldHVybiBudWxsO1xyXG5cclxuXHRcdGxldCBrZXkgPSBwYXJ0c1swXS50cmltKCk7XHJcblx0XHRjb25zdCB2YWx1ZSA9IHBhcnRzWzFdLnRyaW0oKTtcclxuXHJcblx0XHQvLyBNYXAgZGF0YXZpZXcga2V5cyB0byBzdGFuZGFyZCBmaWVsZCBuYW1lcyBmb3IgY29uc2lzdGVuY3lcclxuXHRcdGNvbnN0IGRhdGF2aWV3S2V5TWFwcGluZzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcclxuXHRcdFx0ZHVlOiBcImR1ZURhdGVcIixcclxuXHRcdFx0c3RhcnQ6IFwic3RhcnREYXRlXCIsXHJcblx0XHRcdHNjaGVkdWxlZDogXCJzY2hlZHVsZWREYXRlXCIsXHJcblx0XHRcdGNvbXBsZXRpb246IFwiY29tcGxldGVkRGF0ZVwiLFxyXG5cdFx0XHRjcmVhdGVkOiBcImNyZWF0ZWREYXRlXCIsXHJcblx0XHRcdGNhbmNlbGxlZDogXCJjYW5jZWxsZWREYXRlXCIsXHJcblx0XHRcdGlkOiBcImlkXCIsXHJcblx0XHRcdGRlcGVuZHNPbjogXCJkZXBlbmRzT25cIixcclxuXHRcdFx0b25Db21wbGV0aW9uOiBcIm9uQ29tcGxldGlvblwiLFxyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBBcHBseSBrZXkgbWFwcGluZyBpZiBpdCBleGlzdHNcclxuXHRcdGNvbnN0IG1hcHBlZEtleSA9IGRhdGF2aWV3S2V5TWFwcGluZ1trZXkudG9Mb3dlckNhc2UoKV07XHJcblx0XHRpZiAobWFwcGVkS2V5KSB7XHJcblx0XHRcdGtleSA9IG1hcHBlZEtleTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIENoZWNrIGlmIHRoZSBrZXkgbWF0Y2hlcyBhbnkgY29uZmlndXJlZCBzcGVjaWFsIHRhZyBwcmVmaXhlc1xyXG5cdFx0XHQvLyBzcGVjaWFsVGFnUHJlZml4ZXMgZm9ybWF0OiB7IFwicHJlZml4TmFtZVwiOiBcIm1ldGFkYXRhS2V5XCIgfVxyXG5cdFx0XHQvLyBXZSBuZWVkIHRvIHJldmVyc2UgbG9va3VwOiBmaW5kIHByZWZpeCB0aGF0IG1hcHMgdG8gc3RhbmRhcmQgbWV0YWRhdGEga2V5c1xyXG5cdFx0XHRjb25zdCBsb3dlcktleSA9IGtleS50b0xvd2VyQ2FzZSgpO1xyXG5cdFx0XHRmb3IgKGNvbnN0IFtwcmVmaXgsIG1ldGFkYXRhVHlwZV0gb2YgT2JqZWN0LmVudHJpZXMoXHJcblx0XHRcdFx0dGhpcy5jb25maWcuc3BlY2lhbFRhZ1ByZWZpeGVzIHx8IHt9XHJcblx0XHRcdCkpIHtcclxuXHRcdFx0XHRpZiAocHJlZml4LnRvTG93ZXJDYXNlKCkgPT09IGxvd2VyS2V5KSB7XHJcblx0XHRcdFx0XHRrZXkgPSBtZXRhZGF0YVR5cGU7IC8vIE1hcCB0byB0aGUgdGFyZ2V0IG1ldGFkYXRhIGZpZWxkIChwcm9qZWN0LCBjb250ZXh0LCBhcmVhKVxyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKGtleSAmJiB2YWx1ZSkge1xyXG5cdFx0XHQvLyBEZWJ1ZzogTG9nIGRhdGF2aWV3IG1ldGFkYXRhIGV4dHJhY3Rpb24gZm9yIGNvbmZpZ3VyZWQgcHJlZml4ZXNcclxuXHJcblx0XHRcdGNvbnN0IGJlZm9yZSA9IGNvbnRlbnQuc3Vic3RyaW5nKDAsIHN0YXJ0KTtcclxuXHRcdFx0Y29uc3QgYWZ0ZXIgPSBjb250ZW50LnN1YnN0cmluZyhlbmQgKyAxKTtcclxuXHRcdFx0cmV0dXJuIFtrZXksIHZhbHVlLCBiZWZvcmUgKyBhZnRlcl07XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIG51bGw7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGV4dHJhY3RFbW9qaU1ldGFkYXRhKFxyXG5cdFx0Y29udGVudDogc3RyaW5nXHJcblx0KTogW3N0cmluZywgc3RyaW5nLCBzdHJpbmcsIHN0cmluZ10gfCBudWxsIHtcclxuXHRcdC8vIEZpbmQgdGhlIGVhcmxpZXN0IGVtb2ppXHJcblx0XHRsZXQgZWFybGllc3RFbW9qaTogeyBwb3M6IG51bWJlcjsgZW1vamk6IHN0cmluZzsga2V5OiBzdHJpbmcgfSB8IG51bGwgPVxyXG5cdFx0XHRudWxsO1xyXG5cclxuXHRcdGZvciAoY29uc3QgW2Vtb2ppLCBrZXldIG9mIE9iamVjdC5lbnRyaWVzKHRoaXMuY29uZmlnLmVtb2ppTWFwcGluZykpIHtcclxuXHRcdFx0Y29uc3QgcG9zID0gY29udGVudC5pbmRleE9mKGVtb2ppKTtcclxuXHRcdFx0aWYgKHBvcyAhPT0gLTEpIHtcclxuXHRcdFx0XHRpZiAoIWVhcmxpZXN0RW1vamkgfHwgcG9zIDwgZWFybGllc3RFbW9qaS5wb3MpIHtcclxuXHRcdFx0XHRcdGVhcmxpZXN0RW1vamkgPSB7IHBvcywgZW1vamksIGtleSB9O1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGlmICghZWFybGllc3RFbW9qaSkgcmV0dXJuIG51bGw7XHJcblxyXG5cdFx0Y29uc3QgYmVmb3JlRW1vamkgPSBjb250ZW50LnN1YnN0cmluZygwLCBlYXJsaWVzdEVtb2ppLnBvcyk7XHJcblx0XHRjb25zdCBhZnRlckVtb2ppID0gY29udGVudC5zdWJzdHJpbmcoXHJcblx0XHRcdGVhcmxpZXN0RW1vamkucG9zICsgZWFybGllc3RFbW9qaS5lbW9qaS5sZW5ndGhcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gRXh0cmFjdCB2YWx1ZSBhZnRlciBlbW9qaVxyXG5cdFx0Y29uc3QgdmFsdWVTdGFydE1hdGNoID0gYWZ0ZXJFbW9qaS5tYXRjaCgvXlxccyovKTtcclxuXHRcdGNvbnN0IHZhbHVlU3RhcnQgPSB2YWx1ZVN0YXJ0TWF0Y2ggPyB2YWx1ZVN0YXJ0TWF0Y2hbMF0ubGVuZ3RoIDogMDtcclxuXHRcdGNvbnN0IHZhbHVlUGFydCA9IGFmdGVyRW1vamkuc3Vic3RyaW5nKHZhbHVlU3RhcnQpO1xyXG5cclxuXHRcdGxldCB2YWx1ZUVuZCA9IHZhbHVlUGFydC5sZW5ndGg7XHJcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHZhbHVlUGFydC5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRjb25zdCBjaGFyID0gdmFsdWVQYXJ0W2ldO1xyXG5cdFx0XHQvLyBDaGVjayBpZiB3ZSBlbmNvdW50ZXIgb3RoZXIgZW1vamlzIG9yIHNwZWNpYWwgY2hhcmFjdGVyc1xyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0T2JqZWN0LmtleXModGhpcy5jb25maWcuZW1vamlNYXBwaW5nKS5zb21lKChlKSA9PlxyXG5cdFx0XHRcdFx0dmFsdWVQYXJ0LnN1YnN0cmluZyhpKS5zdGFydHNXaXRoKGUpXHJcblx0XHRcdFx0KSB8fFxyXG5cdFx0XHRcdGNoYXIgPT09IFwiW1wiXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHZhbHVlRW5kID0gaTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgZm9yIGZpbGUgZXh0ZW5zaW9ucyBmb2xsb3dlZCBieSBzcGFjZSBvciBlbmQgb2YgY29udGVudFxyXG5cdFx0XHRjb25zdCBmaWxlRXh0ZW5zaW9uRW5kID0gdGhpcy5maW5kRmlsZUV4dGVuc2lvbkVuZCh2YWx1ZVBhcnQsIGkpO1xyXG5cdFx0XHRpZiAoZmlsZUV4dGVuc2lvbkVuZCA+IGkpIHtcclxuXHRcdFx0XHR2YWx1ZUVuZCA9IGZpbGVFeHRlbnNpb25FbmQ7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENoZWNrIGZvciB3aGl0ZXNwYWNlIGZvbGxvd2VkIGJ5ICMgKHRhZykgb3IgQCAoY29udGV4dCksIG9yIGRpcmVjdCAjL0Agd2l0aG91dCBwcmVjZWRpbmcgc3BhY2VcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdC9cXHMvLnRlc3QoY2hhcikgJiZcclxuXHRcdFx0XHRpICsgMSA8IHZhbHVlUGFydC5sZW5ndGggJiZcclxuXHRcdFx0XHQodmFsdWVQYXJ0W2kgKyAxXSA9PT0gXCIjXCIgfHwgdmFsdWVQYXJ0W2kgKyAxXSA9PT0gXCJAXCIpXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHZhbHVlRW5kID0gaTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHQvLyBBbHNvIHN0b3AgaWYgd2UgZW5jb3VudGVyICMgb3IgQCBkaXJlY3RseSAobm8gd2hpdGVzcGFjZSlcclxuXHRcdFx0aWYgKGNoYXIgPT09IFwiI1wiIHx8IGNoYXIgPT09IFwiQFwiKSB7XHJcblx0XHRcdFx0dmFsdWVFbmQgPSBpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgdmFsdWUgPSB2YWx1ZVBhcnQuc3Vic3RyaW5nKDAsIHZhbHVlRW5kKS50cmltKCk7XHJcblxyXG5cdFx0Ly8gSGFuZGxlIHNwZWNpYWwgZmllbGQgcHJvY2Vzc2luZ1xyXG5cdFx0bGV0IG1ldGFkYXRhVmFsdWU6IHN0cmluZztcclxuXHRcdGlmIChlYXJsaWVzdEVtb2ppLmtleSA9PT0gXCJkZXBlbmRzT25cIiAmJiB2YWx1ZSkge1xyXG5cdFx0XHQvLyBGb3IgZGVwZW5kc09uLCBzcGxpdCBieSBjb21tYSBhbmQgam9pbiBiYWNrIGFzIHN0cmluZyBmb3IgbWV0YWRhdGEgc3RvcmFnZVxyXG5cdFx0XHRtZXRhZGF0YVZhbHVlID0gdmFsdWVcclxuXHRcdFx0XHQuc3BsaXQoXCIsXCIpXHJcblx0XHRcdFx0Lm1hcCgoaWQpID0+IGlkLnRyaW0oKSlcclxuXHRcdFx0XHQuZmlsdGVyKChpZCkgPT4gaWQubGVuZ3RoID4gMClcclxuXHRcdFx0XHQuam9pbihcIixcIik7XHJcblx0XHR9IGVsc2UgaWYgKGVhcmxpZXN0RW1vamkua2V5ID09PSBcInByaW9yaXR5XCIpIHtcclxuXHRcdFx0Ly8gRm9yIHByaW9yaXR5IGVtb2ppcywgdXNlIHRoZSBlbW9qaSBpdHNlbGYgb3IgdGhlIHByb3ZpZGVkIHZhbHVlXHJcblx0XHRcdC8vIFRoaXMgZW5zdXJlcyB3ZSBjYW4gZGlzdGluZ3Vpc2ggYmV0d2VlbiBkaWZmZXJlbnQgcHJpb3JpdHkgbGV2ZWxzXHJcblx0XHRcdG1ldGFkYXRhVmFsdWUgPSB2YWx1ZSB8fCBlYXJsaWVzdEVtb2ppLmVtb2ppO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gRm9yIG90aGVyIGVtb2ppcywgdXNlIHByb3ZpZGVkIHZhbHVlIG9yIGRlZmF1bHRcclxuXHRcdFx0bWV0YWRhdGFWYWx1ZSA9XHJcblx0XHRcdFx0dmFsdWUgfHwgdGhpcy5nZXREZWZhdWx0RW1vamlWYWx1ZShlYXJsaWVzdEVtb2ppLmVtb2ppKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTYW5pdGl6ZSBkYXRlLWxpa2UgZW1vamkgdmFsdWVzIHRvIGF2b2lkIHRyYWlsaW5nIGNvbnRleHQgKGUuZy4sIFwiMjAyNS0wOC0xNSBAd29ya1wiKVxyXG5cdFx0aWYgKFxyXG5cdFx0XHRbXHJcblx0XHRcdFx0XCJkdWVEYXRlXCIsXHJcblx0XHRcdFx0XCJzdGFydERhdGVcIixcclxuXHRcdFx0XHRcInNjaGVkdWxlZERhdGVcIixcclxuXHRcdFx0XHRcImNvbXBsZXRlZERhdGVcIixcclxuXHRcdFx0XHRcImNyZWF0ZWREYXRlXCIsXHJcblx0XHRcdFx0XCJjYW5jZWxsZWREYXRlXCIsXHJcblx0XHRcdF0uaW5jbHVkZXMoZWFybGllc3RFbW9qaS5rZXkgYXMgc3RyaW5nKSAmJlxyXG5cdFx0XHR0eXBlb2YgbWV0YWRhdGFWYWx1ZSA9PT0gXCJzdHJpbmdcIlxyXG5cdFx0KSB7XHJcblx0XHRcdGNvbnN0IG0gPSBtZXRhZGF0YVZhbHVlLm1hdGNoKC9cXGR7NH0tXFxkezJ9LVxcZHsyfS8pO1xyXG5cdFx0XHRpZiAobSkge1xyXG5cdFx0XHRcdG1ldGFkYXRhVmFsdWUgPSBtWzBdO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgbmV3UG9zID1cclxuXHRcdFx0ZWFybGllc3RFbW9qaS5wb3MgK1xyXG5cdFx0XHRlYXJsaWVzdEVtb2ppLmVtb2ppLmxlbmd0aCArXHJcblx0XHRcdHZhbHVlU3RhcnQgK1xyXG5cdFx0XHR2YWx1ZUVuZDtcclxuXHRcdGNvbnN0IGFmdGVyUmVtYWluaW5nID0gY29udGVudC5zdWJzdHJpbmcobmV3UG9zKTtcclxuXHJcblx0XHRyZXR1cm4gW2VhcmxpZXN0RW1vamkua2V5LCBtZXRhZGF0YVZhbHVlLCBiZWZvcmVFbW9qaSwgYWZ0ZXJSZW1haW5pbmddO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRmluZCB0aGUgZW5kIHBvc2l0aW9uIG9mIGEgZmlsZSBleHRlbnNpb24gcGF0dGVybiAoZS5nLiwgLm1kLCAuY2FudmFzKVxyXG5cdCAqIGZvbGxvd2VkIGJ5IG9wdGlvbmFsIGhlYWRpbmcgKCNoZWFkaW5nKSBhbmQgdGhlbiBzcGFjZSBvciBlbmQgb2YgY29udGVudFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZmluZEZpbGVFeHRlbnNpb25FbmQoY29udGVudDogc3RyaW5nLCBzdGFydFBvczogbnVtYmVyKTogbnVtYmVyIHtcclxuXHRcdGNvbnN0IHN1cHBvcnRlZEV4dGVuc2lvbnMgPSBbXCIubWRcIiwgXCIuY2FudmFzXCIsIFwiLnR4dFwiLCBcIi5wZGZcIl07XHJcblxyXG5cdFx0Zm9yIChjb25zdCBleHQgb2Ygc3VwcG9ydGVkRXh0ZW5zaW9ucykge1xyXG5cdFx0XHRpZiAoY29udGVudC5zdWJzdHJpbmcoc3RhcnRQb3MpLnN0YXJ0c1dpdGgoZXh0KSkge1xyXG5cdFx0XHRcdGxldCBwb3MgPSBzdGFydFBvcyArIGV4dC5sZW5ndGg7XHJcblxyXG5cdFx0XHRcdC8vIENoZWNrIGZvciBvcHRpb25hbCBoZWFkaW5nICgjaGVhZGluZylcclxuXHRcdFx0XHRpZiAocG9zIDwgY29udGVudC5sZW5ndGggJiYgY29udGVudFtwb3NdID09PSBcIiNcIikge1xyXG5cdFx0XHRcdFx0Ly8gRmluZCB0aGUgZW5kIG9mIHRoZSBoZWFkaW5nIChuZXh0IHNwYWNlIG9yIGVuZCBvZiBjb250ZW50KVxyXG5cdFx0XHRcdFx0d2hpbGUgKHBvcyA8IGNvbnRlbnQubGVuZ3RoICYmIGNvbnRlbnRbcG9zXSAhPT0gXCIgXCIpIHtcclxuXHRcdFx0XHRcdFx0cG9zKys7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBDaGVjayBpZiB3ZSdyZSBhdCBlbmQgb2YgY29udGVudCBvciBmb2xsb3dlZCBieSBzcGFjZVxyXG5cdFx0XHRcdGlmIChwb3MgPj0gY29udGVudC5sZW5ndGggfHwgY29udGVudFtwb3NdID09PSBcIiBcIikge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHBvcztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gc3RhcnRQb3M7IC8vIE5vIGZpbGUgZXh0ZW5zaW9uIHBhdHRlcm4gZm91bmRcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZ2V0RGVmYXVsdEVtb2ppVmFsdWUoZW1vamk6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHRjb25zdCBkZWZhdWx0VmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xyXG5cdFx0XHRcIvCflLpcIjogXCJoaWdoZXN0XCIsXHJcblx0XHRcdFwi4o+rXCI6IFwiaGlnaFwiLFxyXG5cdFx0XHRcIvCflLxcIjogXCJtZWRpdW1cIixcclxuXHRcdFx0XCLwn5S9XCI6IFwibG93XCIsXHJcblx0XHRcdFwi4o+s77iPXCI6IFwibG93ZXN0XCIsXHJcblx0XHRcdFwi4o+sXCI6IFwibG93ZXN0XCIsXHJcblx0XHR9O1xyXG5cclxuXHRcdHJldHVybiBkZWZhdWx0VmFsdWVzW2Vtb2ppXSB8fCBcInRydWVcIjtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZXh0cmFjdFRhZyhjb250ZW50OiBzdHJpbmcpOiBbc3RyaW5nLCBzdHJpbmcsIHN0cmluZ10gfCBudWxsIHtcclxuXHRcdC8vIFVzZSBDb250ZXh0RGV0ZWN0b3IgdG8gZmluZCB1bnByb3RlY3RlZCBoYXNoIHN5bWJvbHNcclxuXHRcdGNvbnN0IGRldGVjdG9yID0gbmV3IENvbnRleHREZXRlY3Rvcihjb250ZW50KTtcclxuXHRcdGRldGVjdG9yLmRldGVjdEFsbFByb3RlY3RlZFJhbmdlcygpO1xyXG5cclxuXHRcdGNvbnN0IHRyeUZyb20gPSAoc3RhcnRQb3M6IG51bWJlcik6IFtzdHJpbmcsIHN0cmluZywgc3RyaW5nXSB8IG51bGwgPT4ge1xyXG5cdFx0XHRjb25zdCBoYXNoUG9zID0gZGV0ZWN0b3IuZmluZE5leHRVbnByb3RlY3RlZEhhc2goc3RhcnRQb3MpO1xyXG5cdFx0XHRpZiAoaGFzaFBvcyA9PT0gLTEpIHJldHVybiBudWxsO1xyXG5cclxuXHRcdFx0Ly8gSWYgYW4gb2RkIG51bWJlciBvZiBiYWNrc2xhc2hlcyBpbW1lZGlhdGVseSBwcmVjZWRlICcjJywgaXQncyBlc2NhcGVkIOKGkiBza2lwXHJcblx0XHRcdGxldCBic0NvdW50ID0gMDtcclxuXHRcdFx0bGV0IGogPSBoYXNoUG9zIC0gMTtcclxuXHRcdFx0d2hpbGUgKGogPj0gMCAmJiBjb250ZW50W2pdID09PSBcIlxcXFxcIikge1xyXG5cdFx0XHRcdGJzQ291bnQrKztcclxuXHRcdFx0XHRqLS07XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKGJzQ291bnQgJSAyID09PSAxKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRyeUZyb20oaGFzaFBvcyArIDEpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBFbmhhbmNlZCB3b3JkIGJvdW5kYXJ5IGNoZWNrXHJcblx0XHRcdGNvbnN0IGlzV29yZFN0YXJ0ID0gdGhpcy5pc1ZhbGlkVGFnU3RhcnQoY29udGVudCwgaGFzaFBvcyk7XHJcblx0XHRcdGlmICghaXNXb3JkU3RhcnQpIHtcclxuXHRcdFx0XHRyZXR1cm4gdHJ5RnJvbShoYXNoUG9zICsgMSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IGFmdGVySGFzaCA9IGNvbnRlbnQuc3Vic3RyaW5nKGhhc2hQb3MgKyAxKTtcclxuXHRcdFx0bGV0IHRhZ0VuZCA9IDA7XHJcblxyXG5cdFx0XHQvLyBGaW5kIHRhZyBlbmQsIGluY2x1ZGluZyAnLycgZm9yIHNwZWNpYWwgdGFncyBhbmQgVW5pY29kZSBjaGFyYWN0ZXJzXHJcblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgYWZ0ZXJIYXNoLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0Y29uc3QgY2hhciA9IGFmdGVySGFzaFtpXTtcclxuXHRcdFx0XHRjb25zdCBjaGFyQ29kZSA9IGNoYXIuY2hhckNvZGVBdCgwKTtcclxuXHJcblx0XHRcdFx0Ly8gVmFsaWQgdGFnIGNoYXJhY3RlcnNcclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHQoY2hhckNvZGUgPj0gNDggJiYgY2hhckNvZGUgPD0gNTcpIHx8IC8vIDAtOVxyXG5cdFx0XHRcdFx0KGNoYXJDb2RlID49IDY1ICYmIGNoYXJDb2RlIDw9IDkwKSB8fCAvLyBBLVpcclxuXHRcdFx0XHRcdChjaGFyQ29kZSA+PSA5NyAmJiBjaGFyQ29kZSA8PSAxMjIpIHx8IC8vIGEtelxyXG5cdFx0XHRcdFx0Y2hhciA9PT0gXCIvXCIgfHxcclxuXHRcdFx0XHRcdGNoYXIgPT09IFwiLVwiIHx8XHJcblx0XHRcdFx0XHRjaGFyID09PSBcIl9cIiB8fFxyXG5cdFx0XHRcdFx0KGNoYXJDb2RlID4gMTI3ICYmXHJcblx0XHRcdFx0XHRcdGNoYXIgIT09IFwi77yMXCIgJiZcclxuXHRcdFx0XHRcdFx0Y2hhciAhPT0gXCLjgIJcIiAmJlxyXG5cdFx0XHRcdFx0XHRjaGFyICE9PSBcIu+8m1wiICYmXHJcblx0XHRcdFx0XHRcdGNoYXIgIT09IFwi77yaXCIgJiZcclxuXHRcdFx0XHRcdFx0Y2hhciAhPT0gXCLvvIFcIiAmJlxyXG5cdFx0XHRcdFx0XHRjaGFyICE9PSBcIu+8n1wiICYmXHJcblx0XHRcdFx0XHRcdGNoYXIgIT09IFwi44CMXCIgJiZcclxuXHRcdFx0XHRcdFx0Y2hhciAhPT0gXCLjgI1cIiAmJlxyXG5cdFx0XHRcdFx0XHRjaGFyICE9PSBcIuOAjlwiICYmXHJcblx0XHRcdFx0XHRcdGNoYXIgIT09IFwi44CPXCIgJiZcclxuXHRcdFx0XHRcdFx0Y2hhciAhPT0gXCLvvIhcIiAmJlxyXG5cdFx0XHRcdFx0XHRjaGFyICE9PSBcIu+8iVwiICYmXHJcblx0XHRcdFx0XHRcdGNoYXIgIT09IFwi44CQXCIgJiZcclxuXHRcdFx0XHRcdFx0Y2hhciAhPT0gXCLjgJFcIiAmJlxyXG5cdFx0XHRcdFx0XHRjaGFyICE9PSAnXCInICYmXHJcblx0XHRcdFx0XHRcdGNoYXIgIT09ICdcIicgJiZcclxuXHRcdFx0XHRcdFx0Y2hhciAhPT0gXCInXCIgJiZcclxuXHRcdFx0XHRcdFx0Y2hhciAhPT0gXCInXCIgJiZcclxuXHRcdFx0XHRcdFx0Y2hhciAhPT0gXCIgXCIpXHJcblx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHR0YWdFbmQgPSBpICsgMTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAodGFnRW5kID4gMCkge1xyXG5cdFx0XHRcdGNvbnN0IGZ1bGxUYWcgPSBcIiNcIiArIGFmdGVySGFzaC5zdWJzdHJpbmcoMCwgdGFnRW5kKTsgLy8gSW5jbHVkZSAjIHByZWZpeFxyXG5cdFx0XHRcdGNvbnN0IGJlZm9yZSA9IGNvbnRlbnQuc3Vic3RyaW5nKDAsIGhhc2hQb3MpO1xyXG5cdFx0XHRcdGNvbnN0IGFmdGVyID0gY29udGVudC5zdWJzdHJpbmcoaGFzaFBvcyArIDEgKyB0YWdFbmQpO1xyXG5cdFx0XHRcdHJldHVybiBbZnVsbFRhZywgYmVmb3JlLCBhZnRlcl07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIE5vdCBhIHZhbGlkIHRhZywgY29udGludWUgc2VhcmNoaW5nXHJcblx0XHRcdHJldHVybiB0cnlGcm9tKGhhc2hQb3MgKyAxKTtcclxuXHRcdH07XHJcblxyXG5cdFx0cmV0dXJuIHRyeUZyb20oMCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFbmhhbmNlZCB3b3JkIGJvdW5kYXJ5IGNoZWNrIGZvciB0YWcgc3RhcnQgdmFsaWRhdGlvblxyXG5cdCAqL1xyXG5cdHByaXZhdGUgaXNWYWxpZFRhZ1N0YXJ0KGNvbnRlbnQ6IHN0cmluZywgaGFzaFBvczogbnVtYmVyKTogYm9vbGVhbiB7XHJcblx0XHQvLyBDaGVjayBpZiBpdCdzIGF0IHRoZSBiZWdpbm5pbmcgb2YgY29udGVudFxyXG5cdFx0aWYgKGhhc2hQb3MgPT09IDApIHJldHVybiB0cnVlO1xyXG5cclxuXHRcdGNvbnN0IHByZXZDaGFyID0gY29udGVudFtoYXNoUG9zIC0gMV07XHJcblxyXG5cdFx0Ly8gVmFsaWQgdGFnIHN0YXJ0cyBhcmUgcHJlY2VkZWQgYnk6XHJcblx0XHQvLyAxLiBXaGl0ZXNwYWNlXHJcblx0XHQvLyAyLiBTdGFydCBvZiBsaW5lXHJcblx0XHQvLyAzLiBQdW5jdHVhdGlvbiB0aGF0IHR5cGljYWxseSBzZXBhcmF0ZXMgd29yZHNcclxuXHRcdC8vIDQuIE9wZW5pbmcgYnJhY2tldHMvcGFyZW50aGVzZXNcclxuXHJcblx0XHQvLyBJbnZhbGlkIHRhZyBzdGFydHMgYXJlIHByZWNlZGVkIGJ5OlxyXG5cdFx0Ly8gMS4gQWxwaGFudW1lcmljIGNoYXJhY3RlcnMgKHBhcnQgb2YgYSB3b3JkKVxyXG5cdFx0Ly8gMi4gT3RoZXIgaGFzaCBzeW1ib2xzIChtdWx0aXBsZSBoYXNoZXMpXHJcblx0XHQvLyAzLiBTcGVjaWFsIHN5bWJvbHMgdGhhdCBpbmRpY2F0ZSBub24tdGFnIGNvbnRleHRcclxuXHJcblx0XHRjb25zdCB2YWxpZFByZWNlZGluZ0NoYXJzID0gL1tcXHNcXChcXFtcXHs8LDs6IT9cXC1cXCtcXCpcXC9cXFxcXFx8PV0vO1xyXG5cdFx0Y29uc3QgaW52YWxpZFByZWNlZGluZ0NoYXJzID0gL1thLXpBLVowLTkjQCQlXiYqXS87XHJcblxyXG5cdFx0aWYgKHZhbGlkUHJlY2VkaW5nQ2hhcnMudGVzdChwcmV2Q2hhcikpIHtcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKGludmFsaWRQcmVjZWRpbmdDaGFycy50ZXN0KHByZXZDaGFyKSkge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRm9yIG90aGVyIGNoYXJhY3RlcnMgKFVuaWNvZGUsIGV0Yy4pLCB1c2UgdGhlIG9yaWdpbmFsIGxvZ2ljXHJcblx0XHRyZXR1cm4gIXByZXZDaGFyLm1hdGNoKC9bYS16QS1aMC05I0AkJV4mKl0vKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZXh0cmFjdENvbnRleHQoY29udGVudDogc3RyaW5nKTogW3N0cmluZywgc3RyaW5nLCBzdHJpbmddIHwgbnVsbCB7XHJcblx0XHRjb25zdCBhdFBvcyA9IGNvbnRlbnQuaW5kZXhPZihcIkBcIik7XHJcblx0XHRpZiAoYXRQb3MgPT09IC0xKSByZXR1cm4gbnVsbDtcclxuXHJcblx0XHQvLyBDaGVjayBpZiBpdCdzIGEgd29yZCBzdGFydFxyXG5cdFx0Y29uc3QgaXNXb3JkU3RhcnQgPVxyXG5cdFx0XHRhdFBvcyA9PT0gMCB8fFxyXG5cdFx0XHRjb250ZW50W2F0UG9zIC0gMV0ubWF0Y2goL1xccy8pIHx8XHJcblx0XHRcdCFjb250ZW50W2F0UG9zIC0gMV0ubWF0Y2goL1thLXpBLVowLTkjQCQlXiYqXS8pO1xyXG5cclxuXHRcdGlmICghaXNXb3JkU3RhcnQpIHJldHVybiBudWxsO1xyXG5cclxuXHRcdGNvbnN0IGFmdGVyQXQgPSBjb250ZW50LnN1YnN0cmluZyhhdFBvcyArIDEpO1xyXG5cdFx0bGV0IGNvbnRleHRFbmQgPSAwO1xyXG5cclxuXHRcdC8vIEZpbmQgY29udGV4dCBlbmQsIHNpbWlsYXIgdG8gdGFnIHBhcnNpbmcgYnV0IGZvciBjb250ZXh0XHJcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGFmdGVyQXQubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0Y29uc3QgY2hhciA9IGFmdGVyQXRbaV07XHJcblx0XHRcdGNvbnN0IGNoYXJDb2RlID0gY2hhci5jaGFyQ29kZUF0KDApO1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgaWYgY2hhcmFjdGVyIGlzIHZhbGlkIGZvciBjb250ZXh0OlxyXG5cdFx0XHQvLyAtIEFTQ0lJIGxldHRlcnMgYW5kIG51bWJlcnM6IGEteiwgQS1aLCAwLTlcclxuXHRcdFx0Ly8gLSBTcGVjaWFsIGNoYXJhY3RlcnM6IC0sIF9cclxuXHRcdFx0Ly8gLSBVbmljb2RlIGNoYXJhY3RlcnMgKGluY2x1ZGluZyBDaGluZXNlKTogPiAxMjdcclxuXHRcdFx0Ly8gLSBFeGNsdWRlIGNvbW1vbiBzZXBhcmF0b3JzIGFuZCBwdW5jdHVhdGlvblxyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0KGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3KSB8fCAvLyAwLTlcclxuXHRcdFx0XHQoY2hhckNvZGUgPj0gNjUgJiYgY2hhckNvZGUgPD0gOTApIHx8IC8vIEEtWlxyXG5cdFx0XHRcdChjaGFyQ29kZSA+PSA5NyAmJiBjaGFyQ29kZSA8PSAxMjIpIHx8IC8vIGEtelxyXG5cdFx0XHRcdGNoYXIgPT09IFwiLVwiIHx8XHJcblx0XHRcdFx0Y2hhciA9PT0gXCJfXCIgfHxcclxuXHRcdFx0XHQoY2hhckNvZGUgPiAxMjcgJiZcclxuXHRcdFx0XHRcdGNoYXIgIT09IFwi77yMXCIgJiZcclxuXHRcdFx0XHRcdGNoYXIgIT09IFwi44CCXCIgJiZcclxuXHRcdFx0XHRcdGNoYXIgIT09IFwi77ybXCIgJiZcclxuXHRcdFx0XHRcdGNoYXIgIT09IFwi77yaXCIgJiZcclxuXHRcdFx0XHRcdGNoYXIgIT09IFwi77yBXCIgJiZcclxuXHRcdFx0XHRcdGNoYXIgIT09IFwi77yfXCIgJiZcclxuXHRcdFx0XHRcdGNoYXIgIT09IFwi44CMXCIgJiZcclxuXHRcdFx0XHRcdGNoYXIgIT09IFwi44CNXCIgJiZcclxuXHRcdFx0XHRcdGNoYXIgIT09IFwi44COXCIgJiZcclxuXHRcdFx0XHRcdGNoYXIgIT09IFwi44CPXCIgJiZcclxuXHRcdFx0XHRcdGNoYXIgIT09IFwi77yIXCIgJiZcclxuXHRcdFx0XHRcdGNoYXIgIT09IFwi77yJXCIgJiZcclxuXHRcdFx0XHRcdGNoYXIgIT09IFwi44CQXCIgJiZcclxuXHRcdFx0XHRcdGNoYXIgIT09IFwi44CRXCIgJiZcclxuXHRcdFx0XHRcdGNoYXIgIT09ICdcIicgJiZcclxuXHRcdFx0XHRcdGNoYXIgIT09ICdcIicgJiZcclxuXHRcdFx0XHRcdGNoYXIgIT09IFwiJ1wiICYmXHJcblx0XHRcdFx0XHRjaGFyICE9PSBcIidcIiAmJlxyXG5cdFx0XHRcdFx0Y2hhciAhPT0gXCIgXCIpXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdGNvbnRleHRFbmQgPSBpICsgMTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChjb250ZXh0RW5kID4gMCkge1xyXG5cdFx0XHRjb25zdCBjb250ZXh0ID0gYWZ0ZXJBdC5zdWJzdHJpbmcoMCwgY29udGV4dEVuZCk7XHJcblx0XHRcdGNvbnN0IGJlZm9yZSA9IGNvbnRlbnQuc3Vic3RyaW5nKDAsIGF0UG9zKTtcclxuXHRcdFx0Y29uc3QgYWZ0ZXIgPSBjb250ZW50LnN1YnN0cmluZyhhdFBvcyArIDEgKyBjb250ZXh0RW5kKTtcclxuXHRcdFx0cmV0dXJuIFtjb250ZXh0LCBiZWZvcmUsIGFmdGVyXTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZXh0cmFjdFRhZ3NPbmx5KFxyXG5cdFx0Y29udGVudDogc3RyaW5nXHJcblx0KTogW3N0cmluZywgUmVjb3JkPHN0cmluZywgc3RyaW5nPiwgc3RyaW5nW11dIHtcclxuXHRcdGNvbnN0IG1ldGFkYXRhOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XHJcblx0XHRjb25zdCB0YWdzOiBzdHJpbmdbXSA9IFtdO1xyXG5cdFx0bGV0IGNsZWFuZWRDb250ZW50ID0gXCJcIjtcclxuXHRcdGxldCByZW1haW5pbmcgPSBjb250ZW50O1xyXG5cclxuXHRcdHdoaWxlICh0cnVlKSB7XHJcblx0XHRcdGxldCBmb3VuZE1hdGNoID0gZmFsc2U7XHJcblxyXG5cdFx0XHQvLyBDaGVjayBkYXRhdmlldyBmb3JtYXQgbWV0YWRhdGFcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHRoaXMuY29uZmlnLnBhcnNlTWV0YWRhdGEgJiZcclxuXHRcdFx0XHQodGhpcy5jb25maWcubWV0YWRhdGFQYXJzZU1vZGUgPT09XHJcblx0XHRcdFx0XHRNZXRhZGF0YVBhcnNlTW9kZS5EYXRhdmlld09ubHkgfHxcclxuXHRcdFx0XHRcdHRoaXMuY29uZmlnLm1ldGFkYXRhUGFyc2VNb2RlID09PSBNZXRhZGF0YVBhcnNlTW9kZS5Cb3RoKVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRjb25zdCBicmFja2V0TWF0Y2ggPSB0aGlzLmV4dHJhY3REYXRhdmlld01ldGFkYXRhKHJlbWFpbmluZyk7XHJcblx0XHRcdFx0aWYgKGJyYWNrZXRNYXRjaCkge1xyXG5cdFx0XHRcdFx0Y29uc3QgW2tleSwgdmFsdWUsIG5ld1JlbWFpbmluZ10gPSBicmFja2V0TWF0Y2g7XHJcblx0XHRcdFx0XHRtZXRhZGF0YVtrZXldID0gdmFsdWU7XHJcblx0XHRcdFx0XHRyZW1haW5pbmcgPSBuZXdSZW1haW5pbmc7XHJcblx0XHRcdFx0XHRmb3VuZE1hdGNoID0gdHJ1ZTtcclxuXHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgY29udGV4dCAoQHN5bWJvbClcclxuXHRcdFx0aWYgKCFmb3VuZE1hdGNoICYmIHRoaXMuY29uZmlnLnBhcnNlVGFncykge1xyXG5cdFx0XHRcdGNvbnN0IGNvbnRleHRNYXRjaCA9IHRoaXMuZXh0cmFjdENvbnRleHQocmVtYWluaW5nKTtcclxuXHRcdFx0XHRpZiAoY29udGV4dE1hdGNoKSB7XHJcblx0XHRcdFx0XHRjb25zdCBbY29udGV4dCwgYmVmb3JlQ29udGVudCwgYWZ0ZXJSZW1haW5pbmddID1cclxuXHRcdFx0XHRcdFx0Y29udGV4dE1hdGNoO1xyXG5cclxuXHRcdFx0XHRcdC8vIFJlY3Vyc2l2ZWx5IHByb2Nlc3MgdGhlIGNvbnRlbnQgYmVmb3JlIGNvbnRleHRcclxuXHRcdFx0XHRcdGNvbnN0IFtiZWZvcmVDbGVhbmVkLCBiZWZvcmVNZXRhZGF0YSwgYmVmb3JlVGFnc10gPVxyXG5cdFx0XHRcdFx0XHR0aGlzLmV4dHJhY3RUYWdzT25seShiZWZvcmVDb250ZW50KTtcclxuXHJcblx0XHRcdFx0XHQvLyBNZXJnZSBtZXRhZGF0YSBhbmQgdGFncyBmcm9tIGJlZm9yZSBjb250ZW50XHJcblx0XHRcdFx0XHRmb3IgKGNvbnN0IHRhZyBvZiBiZWZvcmVUYWdzKSB7XHJcblx0XHRcdFx0XHRcdHRhZ3MucHVzaCh0YWcpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0Zm9yIChjb25zdCBbaywgdl0gb2YgT2JqZWN0LmVudHJpZXMoYmVmb3JlTWV0YWRhdGEpKSB7XHJcblx0XHRcdFx0XHRcdG1ldGFkYXRhW2tdID0gdjtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRtZXRhZGF0YS5jb250ZXh0ID0gY29udGV4dDtcclxuXHRcdFx0XHRcdGNsZWFuZWRDb250ZW50ICs9IGJlZm9yZUNsZWFuZWQ7XHJcblx0XHRcdFx0XHRyZW1haW5pbmcgPSBhZnRlclJlbWFpbmluZztcclxuXHRcdFx0XHRcdGZvdW5kTWF0Y2ggPSB0cnVlO1xyXG5cdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBDaGVjayB0YWdzXHJcblx0XHRcdGlmICghZm91bmRNYXRjaCAmJiB0aGlzLmNvbmZpZy5wYXJzZVRhZ3MpIHtcclxuXHRcdFx0XHRjb25zdCB0YWdNYXRjaCA9IHRoaXMuZXh0cmFjdFRhZyhyZW1haW5pbmcpO1xyXG5cdFx0XHRcdGlmICh0YWdNYXRjaCkge1xyXG5cdFx0XHRcdFx0Y29uc3QgW3RhZywgYmVmb3JlQ29udGVudCwgYWZ0ZXJSZW1haW5pbmddID0gdGFnTWF0Y2g7XHJcblxyXG5cdFx0XHRcdFx0Ly8gQ2hlY2sgc3BlY2lhbCB0YWcgZm9ybWF0XHJcblx0XHRcdFx0XHQvLyBSZW1vdmUgIyBwcmVmaXggZm9yIGNoZWNraW5nIHNwZWNpYWwgdGFnc1xyXG5cdFx0XHRcdFx0Y29uc3QgdGFnV2l0aG91dEhhc2ggPSB0YWcuc3RhcnRzV2l0aChcIiNcIilcclxuXHRcdFx0XHRcdFx0PyB0YWcuc3Vic3RyaW5nKDEpXHJcblx0XHRcdFx0XHRcdDogdGFnO1xyXG5cdFx0XHRcdFx0Y29uc3Qgc2xhc2hQb3MgPSB0YWdXaXRob3V0SGFzaC5pbmRleE9mKFwiL1wiKTtcclxuXHRcdFx0XHRcdGlmIChzbGFzaFBvcyAhPT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgcHJlZml4ID0gdGFnV2l0aG91dEhhc2guc3Vic3RyaW5nKDAsIHNsYXNoUG9zKTtcclxuXHRcdFx0XHRcdFx0Y29uc3QgdmFsdWUgPSB0YWdXaXRob3V0SGFzaC5zdWJzdHJpbmcoc2xhc2hQb3MgKyAxKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIENhc2UtaW5zZW5zaXRpdmUgbWF0Y2ggZm9yIHNwZWNpYWwgdGFnIHByZWZpeGVzXHJcblx0XHRcdFx0XHRcdGNvbnN0IG1ldGFkYXRhS2V5ID1cclxuXHRcdFx0XHRcdFx0XHR0aGlzLmNvbmZpZy5zcGVjaWFsVGFnUHJlZml4ZXNbcHJlZml4XSA/P1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMuY29uZmlnLnNwZWNpYWxUYWdQcmVmaXhlc1tcclxuXHRcdFx0XHRcdFx0XHRcdHByZWZpeC50b0xvd2VyQ2FzZSgpXHJcblx0XHRcdFx0XHRcdFx0XTtcclxuXHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdG1ldGFkYXRhS2V5ICYmXHJcblx0XHRcdFx0XHRcdFx0dGhpcy5jb25maWcubWV0YWRhdGFQYXJzZU1vZGUgIT09XHJcblx0XHRcdFx0XHRcdFx0XHRNZXRhZGF0YVBhcnNlTW9kZS5Ob25lXHJcblx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdG1ldGFkYXRhW21ldGFkYXRhS2V5XSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdHRhZ3MucHVzaCh0YWcpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHR0YWdzLnB1c2godGFnKTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRjbGVhbmVkQ29udGVudCArPSBiZWZvcmVDb250ZW50O1xyXG5cdFx0XHRcdFx0cmVtYWluaW5nID0gYWZ0ZXJSZW1haW5pbmc7XHJcblx0XHRcdFx0XHRmb3VuZE1hdGNoID0gdHJ1ZTtcclxuXHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKCFmb3VuZE1hdGNoKSB7XHJcblx0XHRcdFx0Y2xlYW5lZENvbnRlbnQgKz0gcmVtYWluaW5nO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIFtjbGVhbmVkQ29udGVudC50cmltKCksIG1ldGFkYXRhLCB0YWdzXTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZmluZFBhcmVudEFuZExldmVsKFxyXG5cdFx0YWN0dWFsU3BhY2VzOiBudW1iZXJcclxuXHQpOiBbc3RyaW5nIHwgdW5kZWZpbmVkLCBudW1iZXJdIHtcclxuXHRcdGlmICh0aGlzLmluZGVudFN0YWNrLmxlbmd0aCA9PT0gMCB8fCBhY3R1YWxTcGFjZXMgPT09IDApIHtcclxuXHRcdFx0cmV0dXJuIFt1bmRlZmluZWQsIDBdO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZvciAobGV0IGkgPSB0aGlzLmluZGVudFN0YWNrLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcblx0XHRcdGNvbnN0IHtcclxuXHRcdFx0XHR0YXNrSWQsXHJcblx0XHRcdFx0aW5kZW50TGV2ZWwsXHJcblx0XHRcdFx0YWN0dWFsU3BhY2VzOiBzcGFjZXMsXHJcblx0XHRcdH0gPSB0aGlzLmluZGVudFN0YWNrW2ldO1xyXG5cdFx0XHRpZiAoc3BhY2VzIDwgYWN0dWFsU3BhY2VzKSB7XHJcblx0XHRcdFx0cmV0dXJuIFt0YXNrSWQsIGluZGVudExldmVsICsgMV07XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gW3VuZGVmaW5lZCwgMF07XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHVwZGF0ZUluZGVudFN0YWNrKFxyXG5cdFx0dGFza0lkOiBzdHJpbmcsXHJcblx0XHRpbmRlbnRMZXZlbDogbnVtYmVyLFxyXG5cdFx0YWN0dWFsU3BhY2VzOiBudW1iZXJcclxuXHQpOiB2b2lkIHtcclxuXHRcdGxldCBzdGFja09wZXJhdGlvbnMgPSAwO1xyXG5cclxuXHRcdHdoaWxlICh0aGlzLmluZGVudFN0YWNrLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0c3RhY2tPcGVyYXRpb25zKys7XHJcblx0XHRcdGlmIChzdGFja09wZXJhdGlvbnMgPiB0aGlzLmNvbmZpZy5tYXhTdGFja09wZXJhdGlvbnMpIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRcIldhcm5pbmc6IE1heGltdW0gc3RhY2sgb3BlcmF0aW9ucyByZWFjaGVkLCBjbGVhcmluZyBzdGFja1wiXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHR0aGlzLmluZGVudFN0YWNrID0gW107XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IGxhc3RJdGVtID0gdGhpcy5pbmRlbnRTdGFja1t0aGlzLmluZGVudFN0YWNrLmxlbmd0aCAtIDFdO1xyXG5cdFx0XHRpZiAobGFzdEl0ZW0uYWN0dWFsU3BhY2VzID49IGFjdHVhbFNwYWNlcykge1xyXG5cdFx0XHRcdHRoaXMuaW5kZW50U3RhY2sucG9wKCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRpZiAodGhpcy5pbmRlbnRTdGFjay5sZW5ndGggPj0gdGhpcy5jb25maWcubWF4U3RhY2tTaXplKSB7XHJcblx0XHRcdHRoaXMuaW5kZW50U3RhY2suc3BsaWNlKFxyXG5cdFx0XHRcdDAsXHJcblx0XHRcdFx0dGhpcy5pbmRlbnRTdGFjay5sZW5ndGggLSB0aGlzLmNvbmZpZy5tYXhTdGFja1NpemUgKyAxXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5pbmRlbnRTdGFjay5wdXNoKHsgdGFza0lkLCBpbmRlbnRMZXZlbCwgYWN0dWFsU3BhY2VzIH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBnZXRTdGF0dXNGcm9tTWFwcGluZyhyYXdTdGF0dXM6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XHJcblx0XHQvLyBGaW5kIHN0YXR1cyBuYW1lIGNvcnJlc3BvbmRpbmcgdG8gcmF3IGNoYXJhY3RlclxyXG5cdFx0Zm9yIChjb25zdCBbc3RhdHVzTmFtZSwgbWFwcGVkQ2hhcl0gb2YgT2JqZWN0LmVudHJpZXMoXHJcblx0XHRcdHRoaXMuY29uZmlnLnN0YXR1c01hcHBpbmdcclxuXHRcdCkpIHtcclxuXHRcdFx0aWYgKG1hcHBlZENoYXIgPT09IHJhd1N0YXR1cykge1xyXG5cdFx0XHRcdHJldHVybiBzdGF0dXNOYW1lO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBleHRyYWN0SGVhZGluZyhsaW5lOiBzdHJpbmcpOiBbbnVtYmVyLCBzdHJpbmddIHwgbnVsbCB7XHJcblx0XHRjb25zdCB0cmltbWVkID0gbGluZS50cmltKCk7XHJcblx0XHRpZiAoIXRyaW1tZWQuc3RhcnRzV2l0aChcIiNcIikpIHJldHVybiBudWxsO1xyXG5cclxuXHRcdGxldCBsZXZlbCA9IDA7XHJcblx0XHRmb3IgKGNvbnN0IGNoYXIgb2YgdHJpbW1lZCkge1xyXG5cdFx0XHRpZiAoY2hhciA9PT0gXCIjXCIpIHtcclxuXHRcdFx0XHRsZXZlbCsrO1xyXG5cdFx0XHR9IGVsc2UgaWYgKGNoYXIubWF0Y2goL1xccy8pKSB7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0cmV0dXJuIG51bGw7IC8vIE5vdCBhIHZhbGlkIGhlYWRpbmcgZm9ybWF0XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRpZiAobGV2ZWwgPiAwICYmIGxldmVsIDw9IDYpIHtcclxuXHRcdFx0Y29uc3QgaGVhZGluZ1RleHQgPSB0cmltbWVkLnN1YnN0cmluZyhsZXZlbCkudHJpbSgpO1xyXG5cdFx0XHRpZiAoaGVhZGluZ1RleHQpIHtcclxuXHRcdFx0XHRyZXR1cm4gW2xldmVsLCBoZWFkaW5nVGV4dF07XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZXh0cmFjdE11bHRpbGluZUNvbW1lbnQoXHJcblx0XHRsaW5lczogc3RyaW5nW10sXHJcblx0XHRzdGFydEluZGV4OiBudW1iZXIsXHJcblx0XHRhY3R1YWxTcGFjZXM6IG51bWJlclxyXG5cdCk6IFtzdHJpbmcgfCB1bmRlZmluZWQsIG51bWJlcl0ge1xyXG5cdFx0Y29uc3QgY29tbWVudExpbmVzOiBzdHJpbmdbXSA9IFtdO1xyXG5cdFx0bGV0IGkgPSBzdGFydEluZGV4O1xyXG5cdFx0bGV0IGxpbmVzQ29uc3VtZWQgPSAwO1xyXG5cclxuXHRcdHdoaWxlIChpIDwgbGluZXMubGVuZ3RoKSB7XHJcblx0XHRcdGNvbnN0IGxpbmUgPSBsaW5lc1tpXTtcclxuXHRcdFx0Y29uc3QgdHJpbW1lZCA9IGxpbmUudHJpbVN0YXJ0KCk7XHJcblx0XHRcdGNvbnN0IG5leHRTcGFjZXMgPSBsaW5lLmxlbmd0aCAtIHRyaW1tZWQubGVuZ3RoO1xyXG5cclxuXHRcdFx0Ly8gT25seSBjb25zaWRlciBhcyBjb21tZW50IGlmIG5leHQgbGluZSBpcyBub3QgYSB0YXNrIGxpbmUgYW5kIGhhcyBkZWVwZXIgaW5kZW50YXRpb25cclxuXHRcdFx0aWYgKG5leHRTcGFjZXMgPiBhY3R1YWxTcGFjZXMgJiYgIXRoaXMuaXNUYXNrTGluZSh0cmltbWVkKSkge1xyXG5cdFx0XHRcdGNvbW1lbnRMaW5lcy5wdXNoKHRyaW1tZWQpO1xyXG5cdFx0XHRcdGxpbmVzQ29uc3VtZWQrKztcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aSsrO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChjb21tZW50TGluZXMubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdHJldHVybiBbdW5kZWZpbmVkLCAwXTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGNvbnN0IGNvbW1lbnQgPSBjb21tZW50TGluZXMuam9pbihcIlxcblwiKTtcclxuXHRcdFx0cmV0dXJuIFtjb21tZW50LCBsaW5lc0NvbnN1bWVkXTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIExlZ2FjeSBjb21wYXRpYmlsaXR5IG1ldGhvZHNcclxuXHRwcml2YXRlIGV4dHJhY3RMZWdhY3lQcmlvcml0eShcclxuXHRcdG1ldGFkYXRhOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XHJcblx0KTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcclxuXHRcdGlmICghbWV0YWRhdGEucHJpb3JpdHkpIHJldHVybiB1bmRlZmluZWQ7XHJcblxyXG5cdFx0Ly8gVXNlIHRoZSBzdGFuZGFyZCBQUklPUklUWV9NQVAgZm9yIGNvbnNpc3RlbnQgcHJpb3JpdHkgdmFsdWVzXHJcblx0XHRjb25zdCBwcmlvcml0eU1hcDogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHtcclxuXHRcdFx0aGlnaGVzdDogNSxcclxuXHRcdFx0aGlnaDogNCxcclxuXHRcdFx0bWVkaXVtOiAzLFxyXG5cdFx0XHRsb3c6IDIsXHJcblx0XHRcdGxvd2VzdDogMSxcclxuXHRcdFx0dXJnZW50OiA1LCAvLyBBbGlhcyBmb3IgaGlnaGVzdFxyXG5cdFx0XHRjcml0aWNhbDogNSwgLy8gQWxpYXMgZm9yIGhpZ2hlc3RcclxuXHRcdFx0aW1wb3J0YW50OiA0LCAvLyBBbGlhcyBmb3IgaGlnaFxyXG5cdFx0XHRub3JtYWw6IDMsIC8vIEFsaWFzIGZvciBtZWRpdW1cclxuXHRcdFx0bW9kZXJhdGU6IDMsIC8vIEFsaWFzIGZvciBtZWRpdW1cclxuXHRcdFx0bWlub3I6IDIsIC8vIEFsaWFzIGZvciBsb3dcclxuXHRcdFx0dHJpdmlhbDogMSwgLy8gQWxpYXMgZm9yIGxvd2VzdFxyXG5cdFx0XHQvLyBFbW9qaSBwcmlvcml0eSBtYXBwaW5nc1xyXG5cdFx0XHRcIvCflLpcIjogNSxcclxuXHRcdFx0XCLij6tcIjogNCxcclxuXHRcdFx0XCLwn5S8XCI6IDMsXHJcblx0XHRcdFwi8J+UvVwiOiAyLFxyXG5cdFx0XHRcIuKPrO+4j1wiOiAxLFxyXG5cdFx0XHRcIuKPrFwiOiAxLFxyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBGaXJzdCB0cnkgdG8gcGFyc2UgYXMgbnVtYmVyXHJcblx0XHRjb25zdCBudW1lcmljUHJpb3JpdHkgPSBwYXJzZUludChtZXRhZGF0YS5wcmlvcml0eSwgMTApO1xyXG5cdFx0aWYgKCFpc05hTihudW1lcmljUHJpb3JpdHkpKSB7XHJcblx0XHRcdHJldHVybiBudW1lcmljUHJpb3JpdHk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVGhlbiB0cnkgdG8gbWFwIHN0cmluZyB2YWx1ZXMgKGluY2x1ZGluZyBlbW9qaXMpXHJcblx0XHRjb25zdCBtYXBwZWRQcmlvcml0eSA9XHJcblx0XHRcdHByaW9yaXR5TWFwW21ldGFkYXRhLnByaW9yaXR5LnRvTG93ZXJDYXNlKCldIHx8XHJcblx0XHRcdHByaW9yaXR5TWFwW21ldGFkYXRhLnByaW9yaXR5XTtcclxuXHRcdHJldHVybiBtYXBwZWRQcmlvcml0eTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZXh0cmFjdExlZ2FjeURhdGUoXHJcblx0XHRtZXRhZGF0YTogUmVjb3JkPHN0cmluZywgc3RyaW5nPixcclxuXHRcdGtleTogc3RyaW5nXHJcblx0KTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcclxuXHRcdGNvbnN0IGRhdGVTdHIgPSBtZXRhZGF0YVtrZXldO1xyXG5cdFx0aWYgKCFkYXRlU3RyKSByZXR1cm4gdW5kZWZpbmVkO1xyXG5cclxuXHRcdC8vIENoZWNrIGNhY2hlIGZpcnN0IHRvIGF2b2lkIHJlcGVhdGVkIGRhdGUgcGFyc2luZ1xyXG5cdFx0Y29uc3QgY2FjaGVLZXkgPSBgJHtkYXRlU3RyfV8keyh0aGlzLmN1c3RvbURhdGVGb3JtYXRzIHx8IFtdKS5qb2luKFxyXG5cdFx0XHRcIixcIlxyXG5cdFx0KX1gO1xyXG5cdFx0Y29uc3QgY2FjaGVkRGF0ZSA9IE1hcmtkb3duVGFza1BhcnNlci5kYXRlQ2FjaGUuZ2V0KGNhY2hlS2V5KTtcclxuXHRcdGlmIChjYWNoZWREYXRlICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0cmV0dXJuIGNhY2hlZERhdGU7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUGFyc2UgZGF0ZSB3aXRoIGN1c3RvbSBmb3JtYXRzIGFuZCBjYWNoZSB0aGUgcmVzdWx0XHJcblx0XHRjb25zdCBkYXRlID0gcGFyc2VMb2NhbERhdGUoZGF0ZVN0ciwgdGhpcy5jdXN0b21EYXRlRm9ybWF0cyk7XHJcblxyXG5cdFx0Ly8gSW1wbGVtZW50IGNhY2hlIHNpemUgbGltaXQgdG8gcHJldmVudCBtZW1vcnkgaXNzdWVzXHJcblx0XHRpZiAoXHJcblx0XHRcdE1hcmtkb3duVGFza1BhcnNlci5kYXRlQ2FjaGUuc2l6ZSA+PVxyXG5cdFx0XHRNYXJrZG93blRhc2tQYXJzZXIuTUFYX0NBQ0hFX1NJWkVcclxuXHRcdCkge1xyXG5cdFx0XHQvLyBSZW1vdmUgb2xkZXN0IGVudHJpZXMgKHNpbXBsZSBGSUZPIGV2aWN0aW9uKVxyXG5cdFx0XHRjb25zdCBmaXJzdEtleSA9IE1hcmtkb3duVGFza1BhcnNlci5kYXRlQ2FjaGUua2V5cygpLm5leHQoKS52YWx1ZTtcclxuXHRcdFx0aWYgKGZpcnN0S2V5KSB7XHJcblx0XHRcdFx0TWFya2Rvd25UYXNrUGFyc2VyLmRhdGVDYWNoZS5kZWxldGUoZmlyc3RLZXkpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0TWFya2Rvd25UYXNrUGFyc2VyLmRhdGVDYWNoZS5zZXQoY2FjaGVLZXksIGRhdGUpO1xyXG5cdFx0cmV0dXJuIGRhdGU7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNvbnZlcnRUb0xlZ2FjeVRhc2soZW5oYW5jZWRUYXNrOiBFbmhhbmNlZFRhc2spOiBUYXNrIHtcclxuXHRcdC8vIEhlbHBlciBmdW5jdGlvbiB0byBzYWZlbHkgcGFyc2UgdGFncyBmcm9tIG1ldGFkYXRhXHJcblx0XHRjb25zdCBwYXJzZVRhZ3NGcm9tTWV0YWRhdGEgPSAodGFnc1N0cmluZzogc3RyaW5nKTogc3RyaW5nW10gPT4ge1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UodGFnc1N0cmluZyk7XHJcblx0XHRcdFx0cmV0dXJuIEFycmF5LmlzQXJyYXkocGFyc2VkKSA/IHBhcnNlZCA6IFtdO1xyXG5cdFx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdFx0Ly8gSWYgcGFyc2luZyBmYWlscywgdHJlYXQgYXMgYSBzaW5nbGUgdGFnXHJcblx0XHRcdFx0cmV0dXJuIFt0YWdzU3RyaW5nXTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRpZDogZW5oYW5jZWRUYXNrLmlkLFxyXG5cdFx0XHRjb250ZW50OiBlbmhhbmNlZFRhc2suY29udGVudCxcclxuXHRcdFx0ZmlsZVBhdGg6IGVuaGFuY2VkVGFzay5maWxlUGF0aCxcclxuXHRcdFx0bGluZTogZW5oYW5jZWRUYXNrLmxpbmUsXHJcblx0XHRcdGNvbXBsZXRlZDogZW5oYW5jZWRUYXNrLmNvbXBsZXRlZCxcclxuXHRcdFx0c3RhdHVzOiBlbmhhbmNlZFRhc2sucmF3U3RhdHVzLFxyXG5cdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBlbmhhbmNlZFRhc2sub3JpZ2luYWxNYXJrZG93bixcclxuXHRcdFx0Y2hpbGRyZW46IGVuaGFuY2VkVGFzay5jaGlsZHJlbiB8fCBbXSxcclxuXHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHR0YWdzOlxyXG5cdFx0XHRcdFx0ZW5oYW5jZWRUYXNrLnRhZ3MgfHxcclxuXHRcdFx0XHRcdChlbmhhbmNlZFRhc2subWV0YWRhdGEudGFnc1xyXG5cdFx0XHRcdFx0XHQ/IHBhcnNlVGFnc0Zyb21NZXRhZGF0YShlbmhhbmNlZFRhc2subWV0YWRhdGEudGFncylcclxuXHRcdFx0XHRcdFx0OiBbXSksXHJcblx0XHRcdFx0cHJpb3JpdHk6XHJcblx0XHRcdFx0XHRlbmhhbmNlZFRhc2sucHJpb3JpdHkgfHwgZW5oYW5jZWRUYXNrLm1ldGFkYXRhLnByaW9yaXR5LFxyXG5cdFx0XHRcdHN0YXJ0RGF0ZTpcclxuXHRcdFx0XHRcdGVuaGFuY2VkVGFzay5zdGFydERhdGUgfHwgZW5oYW5jZWRUYXNrLm1ldGFkYXRhLnN0YXJ0RGF0ZSxcclxuXHRcdFx0XHRkdWVEYXRlOiBlbmhhbmNlZFRhc2suZHVlRGF0ZSB8fCBlbmhhbmNlZFRhc2subWV0YWRhdGEuZHVlRGF0ZSxcclxuXHRcdFx0XHRzY2hlZHVsZWREYXRlOlxyXG5cdFx0XHRcdFx0ZW5oYW5jZWRUYXNrLnNjaGVkdWxlZERhdGUgfHxcclxuXHRcdFx0XHRcdGVuaGFuY2VkVGFzay5tZXRhZGF0YS5zY2hlZHVsZWREYXRlLFxyXG5cdFx0XHRcdGNvbXBsZXRlZERhdGU6XHJcblx0XHRcdFx0XHRlbmhhbmNlZFRhc2suY29tcGxldGVkRGF0ZSB8fFxyXG5cdFx0XHRcdFx0ZW5oYW5jZWRUYXNrLm1ldGFkYXRhLmNvbXBsZXRlZERhdGUsXHJcblx0XHRcdFx0Y3JlYXRlZERhdGU6XHJcblx0XHRcdFx0XHRlbmhhbmNlZFRhc2suY3JlYXRlZERhdGUgfHxcclxuXHRcdFx0XHRcdGVuaGFuY2VkVGFzay5tZXRhZGF0YS5jcmVhdGVkRGF0ZSxcclxuXHRcdFx0XHRjYW5jZWxsZWREYXRlOiBlbmhhbmNlZFRhc2subWV0YWRhdGEuY2FuY2VsbGVkRGF0ZSxcclxuXHRcdFx0XHRyZWN1cnJlbmNlOlxyXG5cdFx0XHRcdFx0ZW5oYW5jZWRUYXNrLnJlY3VycmVuY2UgfHwgZW5oYW5jZWRUYXNrLm1ldGFkYXRhLnJlY3VycmVuY2UsXHJcblx0XHRcdFx0cHJvamVjdDogZW5oYW5jZWRUYXNrLnByb2plY3QgfHwgZW5oYW5jZWRUYXNrLm1ldGFkYXRhLnByb2plY3QsXHJcblx0XHRcdFx0Y29udGV4dDogZW5oYW5jZWRUYXNrLmNvbnRleHQgfHwgZW5oYW5jZWRUYXNrLm1ldGFkYXRhLmNvbnRleHQsXHJcblx0XHRcdFx0YXJlYTogZW5oYW5jZWRUYXNrLm1ldGFkYXRhLmFyZWEsXHJcblx0XHRcdFx0aWQ6IGVuaGFuY2VkVGFzay5tZXRhZGF0YS5pZCxcclxuXHRcdFx0XHRkZXBlbmRzT246IGVuaGFuY2VkVGFzay5tZXRhZGF0YS5kZXBlbmRzT25cclxuXHRcdFx0XHRcdD8gZW5oYW5jZWRUYXNrLm1ldGFkYXRhLmRlcGVuZHNPblxyXG5cdFx0XHRcdFx0XHRcdC5zcGxpdChcIixcIilcclxuXHRcdFx0XHRcdFx0XHQubWFwKChpZCkgPT4gaWQudHJpbSgpKVxyXG5cdFx0XHRcdFx0XHRcdC5maWx0ZXIoKGlkKSA9PiBpZC5sZW5ndGggPiAwKVxyXG5cdFx0XHRcdFx0OiB1bmRlZmluZWQsXHJcblx0XHRcdFx0b25Db21wbGV0aW9uOiBlbmhhbmNlZFRhc2subWV0YWRhdGEub25Db21wbGV0aW9uLFxyXG5cdFx0XHRcdC8vIExlZ2FjeSBjb21wYXRpYmlsaXR5IGZpZWxkcyB0aGF0IHNob3VsZCByZW1haW4gaW4gbWV0YWRhdGFcclxuXHRcdFx0XHRjaGlsZHJlbjogZW5oYW5jZWRUYXNrLmNoaWxkcmVuLFxyXG5cdFx0XHRcdGhlYWRpbmc6IEFycmF5LmlzQXJyYXkoZW5oYW5jZWRUYXNrLmhlYWRpbmcpXHJcblx0XHRcdFx0XHQ/IGVuaGFuY2VkVGFzay5oZWFkaW5nXHJcblx0XHRcdFx0XHQ6IGVuaGFuY2VkVGFzay5oZWFkaW5nXHJcblx0XHRcdFx0XHQ/IFtlbmhhbmNlZFRhc2suaGVhZGluZ11cclxuXHRcdFx0XHRcdDogW10sXHJcblx0XHRcdFx0cGFyZW50OiBlbmhhbmNlZFRhc2sucGFyZW50SWQsXHJcblx0XHRcdFx0dGdQcm9qZWN0OiBlbmhhbmNlZFRhc2sudGdQcm9qZWN0LFxyXG5cdFx0XHR9LFxyXG5cdFx0fSBhcyBhbnk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBMb2FkIHByb2plY3QgY29uZmlndXJhdGlvbiBmb3IgdGhlIGdpdmVuIGZpbGUgcGF0aFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgbG9hZFByb2plY3RDb25maWcoZmlsZVBhdGg6IHN0cmluZyk6IHZvaWQge1xyXG5cdFx0aWYgKCF0aGlzLmNvbmZpZy5wcm9qZWN0Q29uZmlnKSByZXR1cm47XHJcblxyXG5cdFx0Ly8gVGhpcyBpcyBhIHNpbXBsaWZpZWQgaW1wbGVtZW50YXRpb24gZm9yIHRoZSB3b3JrZXIgZW52aXJvbm1lbnRcclxuXHRcdC8vIEluIGEgcmVhbCBpbXBsZW1lbnRhdGlvbiwgeW91IHdvdWxkIG5lZWQgdG8gcGFzcyBwcm9qZWN0IGNvbmZpZyBkYXRhXHJcblx0XHQvLyBmcm9tIHRoZSBtYWluIHRocmVhZCBvciBpbXBsZW1lbnQgZmlsZSByZWFkaW5nIGluIHRoZSB3b3JrZXJcclxuXHRcdHRoaXMucHJvamVjdENvbmZpZ0NhY2hlID0ge307XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBEZXRlcm1pbmUgdGdQcm9qZWN0IGZvciBhIHRhc2sgYmFzZWQgb24gdmFyaW91cyBzb3VyY2VzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBkZXRlcm1pbmVUZ1Byb2plY3QoZmlsZVBhdGg6IHN0cmluZyk6IFRnUHJvamVjdCB8IHVuZGVmaW5lZCB7XHJcblx0XHRpZiAoIXRoaXMuY29uZmlnLnByb2plY3RDb25maWc/LmVuYWJsZUVuaGFuY2VkUHJvamVjdCkge1xyXG5cdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IGNvbmZpZyA9IHRoaXMuY29uZmlnLnByb2plY3RDb25maWc7XHJcblxyXG5cdFx0Ly8gMS4gQ2hlY2sgcGF0aC1iYXNlZCBtYXBwaW5nc1xyXG5cdFx0aWYgKGNvbmZpZy5wYXRoTWFwcGluZ3MgJiYgY29uZmlnLnBhdGhNYXBwaW5ncy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdGZvciAoY29uc3QgbWFwcGluZyBvZiBjb25maWcucGF0aE1hcHBpbmdzKSB7XHJcblx0XHRcdFx0aWYgKCFtYXBwaW5nLmVuYWJsZWQpIGNvbnRpbnVlO1xyXG5cclxuXHRcdFx0XHQvLyBTaW1wbGUgcGF0aCBtYXRjaGluZyAoaW4gYSByZWFsIGltcGxlbWVudGF0aW9uLCB5b3UnZCB1c2UgZ2xvYiBwYXR0ZXJucylcclxuXHRcdFx0XHRpZiAoZmlsZVBhdGguaW5jbHVkZXMobWFwcGluZy5wYXRoUGF0dGVybikpIHtcclxuXHRcdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRcdHR5cGU6IFwicGF0aFwiLFxyXG5cdFx0XHRcdFx0XHRuYW1lOiBtYXBwaW5nLnByb2plY3ROYW1lLFxyXG5cdFx0XHRcdFx0XHRzb3VyY2U6IG1hcHBpbmcucGF0aFBhdHRlcm4sXHJcblx0XHRcdFx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHRcdFx0fTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyAyLiBDaGVjayBmaWxlIG1ldGFkYXRhIC0gb25seSBpZiBtZXRhZGF0YSBkZXRlY3Rpb24gaXMgZW5hYmxlZFxyXG5cdFx0aWYgKGNvbmZpZy5tZXRhZGF0YUNvbmZpZz8uZW5hYmxlZCAmJiB0aGlzLmZpbGVNZXRhZGF0YSkge1xyXG5cdFx0XHRjb25zdCBtZXRhZGF0YUtleSA9IGNvbmZpZy5tZXRhZGF0YUNvbmZpZy5tZXRhZGF0YUtleSB8fCBcInByb2plY3RcIjtcclxuXHRcdFx0Y29uc3QgcHJvamVjdEZyb21NZXRhZGF0YSA9IHRoaXMuZmlsZU1ldGFkYXRhW21ldGFkYXRhS2V5XTtcclxuXHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHRwcm9qZWN0RnJvbU1ldGFkYXRhICYmXHJcblx0XHRcdFx0dHlwZW9mIHByb2plY3RGcm9tTWV0YWRhdGEgPT09IFwic3RyaW5nXCJcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdHR5cGU6IFwibWV0YWRhdGFcIixcclxuXHRcdFx0XHRcdG5hbWU6IHByb2plY3RGcm9tTWV0YWRhdGEsXHJcblx0XHRcdFx0XHRzb3VyY2U6IG1ldGFkYXRhS2V5LFxyXG5cdFx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIDMuIENoZWNrIHByb2plY3QgY29uZmlnIGZpbGUgLSBvbmx5IGlmIGNvbmZpZyBmaWxlIGRldGVjdGlvbiBpcyBlbmFibGVkXHJcblx0XHRpZiAoY29uZmlnLmNvbmZpZ0ZpbGU/LmVuYWJsZWQgJiYgdGhpcy5wcm9qZWN0Q29uZmlnQ2FjaGUpIHtcclxuXHRcdFx0Y29uc3QgcHJvamVjdEZyb21Db25maWcgPSB0aGlzLnByb2plY3RDb25maWdDYWNoZS5wcm9qZWN0O1xyXG5cclxuXHRcdFx0aWYgKHByb2plY3RGcm9tQ29uZmlnICYmIHR5cGVvZiBwcm9qZWN0RnJvbUNvbmZpZyA9PT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHR0eXBlOiBcImNvbmZpZ1wiLFxyXG5cdFx0XHRcdFx0bmFtZTogcHJvamVjdEZyb21Db25maWcsXHJcblx0XHRcdFx0XHRzb3VyY2U6IGNvbmZpZy5jb25maWdGaWxlLmZpbGVOYW1lLFxyXG5cdFx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB1bmRlZmluZWQ7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTdGF0aWMgbWV0aG9kIHRvIGNsZWFyIHRoZSBkYXRlIGNhY2hlIHdoZW4gbmVlZGVkIChlLmcuLCBmb3IgbWVtb3J5IG1hbmFnZW1lbnQpXHJcblx0ICovXHJcblx0cHVibGljIHN0YXRpYyBjbGVhckRhdGVDYWNoZSgpOiB2b2lkIHtcclxuXHRcdE1hcmtkb3duVGFza1BhcnNlci5kYXRlQ2FjaGUuY2xlYXIoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFN0YXRpYyBtZXRob2QgdG8gZ2V0IGNhY2hlIHN0YXRpc3RpY3NcclxuXHQgKi9cclxuXHRwdWJsaWMgc3RhdGljIGdldERhdGVDYWNoZVN0YXRzKCk6IHsgc2l6ZTogbnVtYmVyOyBtYXhTaXplOiBudW1iZXIgfSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRzaXplOiBNYXJrZG93blRhc2tQYXJzZXIuZGF0ZUNhY2hlLnNpemUsXHJcblx0XHRcdG1heFNpemU6IE1hcmtkb3duVGFza1BhcnNlci5NQVhfQ0FDSEVfU0laRSxcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBQYXJzZSB0YWdzIGFycmF5IHRvIGV4dHJhY3Qgc3BlY2lhbCB0YWcgZm9ybWF0cyBhbmQgY29udmVydCB0aGVtIHRvIG1ldGFkYXRhXHJcblx0ICogQHBhcmFtIHRhZ3MgQXJyYXkgb2YgdGFncyB0byBwYXJzZVxyXG5cdCAqIEByZXR1cm5zIE9iamVjdCBjb250YWluaW5nIGV4dHJhY3RlZCBtZXRhZGF0YSBmcm9tIHRhZ3NcclxuXHQgKi9cclxuXHRwcml2YXRlIHBhcnNlVGFnc0Zvck1ldGFkYXRhKHRhZ3M6IHN0cmluZ1tdKTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiB7XHJcblx0XHRjb25zdCBtZXRhZGF0YTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xyXG5cclxuXHRcdGZvciAoY29uc3QgdGFnIG9mIHRhZ3MpIHtcclxuXHRcdFx0Ly8gUmVtb3ZlICMgcHJlZml4IGlmIHByZXNlbnRcclxuXHRcdFx0Y29uc3QgdGFnV2l0aG91dEhhc2ggPSB0YWcuc3RhcnRzV2l0aChcIiNcIikgPyB0YWcuc3Vic3RyaW5nKDEpIDogdGFnO1xyXG5cdFx0XHRjb25zdCBzbGFzaFBvcyA9IHRhZ1dpdGhvdXRIYXNoLmluZGV4T2YoXCIvXCIpO1xyXG5cclxuXHRcdFx0aWYgKHNsYXNoUG9zICE9PSAtMSkge1xyXG5cdFx0XHRcdGNvbnN0IHByZWZpeCA9IHRhZ1dpdGhvdXRIYXNoLnN1YnN0cmluZygwLCBzbGFzaFBvcyk7XHJcblx0XHRcdFx0Y29uc3QgdmFsdWUgPSB0YWdXaXRob3V0SGFzaC5zdWJzdHJpbmcoc2xhc2hQb3MgKyAxKTtcclxuXHJcblx0XHRcdFx0Ly8gQ2hlY2sgaWYgdGhpcyBpcyBhIHNwZWNpYWwgdGFnIHByZWZpeCB0aGF0IHNob3VsZCBiZSBjb252ZXJ0ZWQgdG8gbWV0YWRhdGFcclxuXHRcdFx0XHRjb25zdCBtZXRhZGF0YUtleSA9XHJcblx0XHRcdFx0XHR0aGlzLmNvbmZpZy5zcGVjaWFsVGFnUHJlZml4ZXNbcHJlZml4XSA/P1xyXG5cdFx0XHRcdFx0dGhpcy5jb25maWcuc3BlY2lhbFRhZ1ByZWZpeGVzW3ByZWZpeC50b0xvd2VyQ2FzZSgpXTtcclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRtZXRhZGF0YUtleSAmJlxyXG5cdFx0XHRcdFx0dGhpcy5jb25maWcubWV0YWRhdGFQYXJzZU1vZGUgIT09IE1ldGFkYXRhUGFyc2VNb2RlLk5vbmVcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdG1ldGFkYXRhW21ldGFkYXRhS2V5XSA9IHZhbHVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBtZXRhZGF0YTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIE5vcm1hbGl6ZSBhIHRhZyB0byBlbnN1cmUgaXQgaGFzIGEgIyBwcmVmaXhcclxuXHQgKiBAcGFyYW0gdGFnIFRoZSB0YWcgdG8gbm9ybWFsaXplXHJcblx0ICogQHJldHVybnMgTm9ybWFsaXplZCB0YWcgd2l0aCAjIHByZWZpeFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgbm9ybWFsaXplVGFnKHRhZzogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdGlmICh0eXBlb2YgdGFnICE9PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdHJldHVybiB0YWcgYXMgYW55O1xyXG5cdFx0fVxyXG5cdFx0Y29uc3QgdHJpbW1lZCA9IHRhZy50cmltKCk7XHJcblx0XHRpZiAoIXRyaW1tZWQgfHwgdHJpbW1lZC5zdGFydHNXaXRoKFwiI1wiKSkge1xyXG5cdFx0XHRyZXR1cm4gdHJpbW1lZDtcclxuXHRcdH1cclxuXHRcdHJldHVybiBgIyR7dHJpbW1lZH1gO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2FmZWx5IHBhcnNlIHRhZ3MgZmllbGQgZnJvbSBtZXRhZGF0YSB3aGljaCBtaWdodCBiZSBhIEpTT04gc3RyaW5nIG9yIGEgcGxhaW4gc3RyaW5nXHJcblx0ICovXHJcblx0cHJpdmF0ZSBzYWZlUGFyc2VUYWdzRmllbGQodGFnc0ZpZWxkOiBhbnkpOiBzdHJpbmdbXSB7XHJcblx0XHRpZiAoIXRhZ3NGaWVsZCkgcmV0dXJuIFtdO1xyXG5cdFx0aWYgKEFycmF5LmlzQXJyYXkodGFnc0ZpZWxkKSkgcmV0dXJuIHRhZ3NGaWVsZDtcclxuXHRcdGlmICh0eXBlb2YgdGFnc0ZpZWxkID09PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Y29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZSh0YWdzRmllbGQpO1xyXG5cdFx0XHRcdHJldHVybiBBcnJheS5pc0FycmF5KHBhcnNlZCkgPyBwYXJzZWQgOiBbdGFnc0ZpZWxkXTtcclxuXHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdHJldHVybiBbdGFnc0ZpZWxkXTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIFtdO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTWVyZ2UgdGFncyBmcm9tIGRpZmZlcmVudCBzb3VyY2VzLCByZW1vdmluZyBkdXBsaWNhdGVzXHJcblx0ICogQHBhcmFtIGJhc2VUYWdzIEJhc2UgdGFncyBhcnJheSAoZnJvbSB0YXNrKVxyXG5cdCAqIEBwYXJhbSBpbmhlcml0ZWRUYWdzIFRhZ3MgdG8gaW5oZXJpdCAoZnJvbSBmaWxlIG1ldGFkYXRhKVxyXG5cdCAqIEByZXR1cm5zIE1lcmdlZCB0YWdzIGFycmF5IHdpdGggZHVwbGljYXRlcyByZW1vdmVkXHJcblx0ICovXHJcblx0cHJpdmF0ZSBtZXJnZVRhZ3MoYmFzZVRhZ3M6IHN0cmluZ1tdLCBpbmhlcml0ZWRUYWdzOiBzdHJpbmdbXSk6IHN0cmluZ1tdIHtcclxuXHRcdC8vIE5vcm1hbGl6ZSBhbGwgdGFncyBiZWZvcmUgbWVyZ2luZ1xyXG5cdFx0Y29uc3Qgbm9ybWFsaXplZEJhc2VUYWdzID0gYmFzZVRhZ3MubWFwKCh0YWcpID0+XHJcblx0XHRcdHRoaXMubm9ybWFsaXplVGFnKHRhZylcclxuXHRcdCk7XHJcblx0XHRjb25zdCBub3JtYWxpemVkSW5oZXJpdGVkVGFncyA9IGluaGVyaXRlZFRhZ3MubWFwKCh0YWcpID0+XHJcblx0XHRcdHRoaXMubm9ybWFsaXplVGFnKHRhZylcclxuXHRcdCk7XHJcblxyXG5cdFx0Y29uc3QgbWVyZ2VkID0gWy4uLm5vcm1hbGl6ZWRCYXNlVGFnc107XHJcblxyXG5cdFx0Zm9yIChjb25zdCB0YWcgb2Ygbm9ybWFsaXplZEluaGVyaXRlZFRhZ3MpIHtcclxuXHRcdFx0aWYgKCFtZXJnZWQuaW5jbHVkZXModGFnKSkge1xyXG5cdFx0XHRcdG1lcmdlZC5wdXNoKHRhZyk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gbWVyZ2VkO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTEVHQUNZIChwcmUtZGF0YWZsb3cpOiBJbmhlcml0IG1ldGFkYXRhIGZyb20gZmlsZSBmcm9udG1hdHRlciBhbmQgcHJvamVjdCBjb25maWd1cmF0aW9uXHJcblx0ICpcclxuXHQgKiBJbiB0aGUgbmV3IGRhdGFmbG93IGFyY2hpdGVjdHVyZSwgaW5oZXJpdGFuY2UgaXMgaGFuZGxlZCBleGNsdXNpdmVseSBieSBBdWdtZW50b3IuXHJcblx0ICogVGhpcyBtZXRob2QgcmVtYWlucyBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSBhbmQgaXMgZWZmZWN0aXZlbHkgZGlzYWJsZWQgd2hlblxyXG5cdCAqIGZpbGVNZXRhZGF0YUluaGVyaXRhbmNlLmVuYWJsZWQgaXMgZmFsc2UgKHJldHVybnMge30pLiBXaGVuIGVuYWJsZWQsIFBhcnNlciBtYXkgc3RpbGxcclxuXHQgKiBwZXJmb3JtIG1pbmltYWwsIGxlZ2FjeS1jb21wYXRpYmxlIG1lcmdpbmcsIGJ1dCBhdXRob3JpdGF0aXZlIG1lcmdpbmcgc2hvdWxkIGJlIGRvbmVcclxuXHQgKiBpbiBBdWdtZW50b3IubWVyZ2UoKS5cclxuXHQgKi9cclxuXHRwcml2YXRlIGluaGVyaXRGaWxlTWV0YWRhdGEoXHJcblx0XHR0YXNrTWV0YWRhdGE6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4sXHJcblx0XHRpc1N1YnRhc2s6IGJvb2xlYW4gPSBmYWxzZVxyXG5cdCk6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4ge1xyXG5cdFx0Ly8gSGVscGVyIGZ1bmN0aW9uIHRvIGNvbnZlcnQgcHJpb3JpdHkgdmFsdWVzIHRvIG51bWJlcnNcclxuXHRcdGNvbnN0IGNvbnZlcnRQcmlvcml0eVZhbHVlID0gKHZhbHVlOiBhbnkpOiBzdHJpbmcgPT4ge1xyXG5cdFx0XHRpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gbnVsbCkge1xyXG5cdFx0XHRcdHJldHVybiBTdHJpbmcodmFsdWUpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBJZiBpdCdzIGFscmVhZHkgYSBudW1iZXIsIGNvbnZlcnQgdG8gc3RyaW5nIGFuZCByZXR1cm5cclxuXHRcdFx0aWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIikge1xyXG5cdFx0XHRcdHJldHVybiBTdHJpbmcodmFsdWUpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBJZiBpdCdzIGEgc3RyaW5nLCB0cnkgdG8gY29udmVydCBwcmlvcml0eSB2YWx1ZXMgdG8gbnVtYmVycywgYnV0IHJldHVybiBhcyBzdHJpbmdcclxuXHRcdFx0Ly8gc2luY2UgdGhlIG1ldGFkYXRhIHJlY29yZCBleHBlY3RzIHN0cmluZyB2YWx1ZXMgdGhhdCB3aWxsIGxhdGVyIGJlIHByb2Nlc3NlZCBieSBleHRyYWN0TGVnYWN5UHJpb3JpdHlcclxuXHRcdFx0Y29uc3Qgc3RyVmFsdWUgPSBTdHJpbmcodmFsdWUpO1xyXG5cdFx0XHRjb25zdCBwcmlvcml0eU1hcDogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHtcclxuXHRcdFx0XHRoaWdoZXN0OiA1LFxyXG5cdFx0XHRcdGhpZ2g6IDQsXHJcblx0XHRcdFx0bWVkaXVtOiAzLFxyXG5cdFx0XHRcdGxvdzogMixcclxuXHRcdFx0XHRsb3dlc3Q6IDEsXHJcblx0XHRcdFx0dXJnZW50OiA1LFxyXG5cdFx0XHRcdGNyaXRpY2FsOiA1LFxyXG5cdFx0XHRcdGltcG9ydGFudDogNCxcclxuXHRcdFx0XHRub3JtYWw6IDMsXHJcblx0XHRcdFx0bW9kZXJhdGU6IDMsXHJcblx0XHRcdFx0bWlub3I6IDIsXHJcblx0XHRcdFx0dHJpdmlhbDogMSxcclxuXHRcdFx0XHQvLyBFbW9qaSBwcmlvcml0eSBtYXBwaW5nc1xyXG5cdFx0XHRcdFwi8J+UulwiOiA1LFxyXG5cdFx0XHRcdFwi4o+rXCI6IDQsXHJcblx0XHRcdFx0XCLwn5S8XCI6IDMsXHJcblx0XHRcdFx0XCLwn5S9XCI6IDIsXHJcblx0XHRcdFx0XCLij6zvuI9cIjogMSxcclxuXHRcdFx0XHRcIuKPrFwiOiAxLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gVHJ5IG51bWVyaWMgY29udmVyc2lvbiBmaXJzdFxyXG5cdFx0XHRjb25zdCBudW1lcmljVmFsdWUgPSBwYXJzZUludChzdHJWYWx1ZSwgMTApO1xyXG5cdFx0XHRpZiAoIWlzTmFOKG51bWVyaWNWYWx1ZSkpIHtcclxuXHRcdFx0XHRyZXR1cm4gU3RyaW5nKG51bWVyaWNWYWx1ZSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFRyeSBwcmlvcml0eSBtYXBwaW5nIChpbmNsdWRpbmcgZW1vamlzKVxyXG5cdFx0XHRjb25zdCBtYXBwZWRQcmlvcml0eSA9XHJcblx0XHRcdFx0cHJpb3JpdHlNYXBbc3RyVmFsdWUudG9Mb3dlckNhc2UoKV0gfHwgcHJpb3JpdHlNYXBbc3RyVmFsdWVdO1xyXG5cdFx0XHRpZiAobWFwcGVkUHJpb3JpdHkgIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdHJldHVybiBTdHJpbmcobWFwcGVkUHJpb3JpdHkpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBSZXR1cm4gb3JpZ2luYWwgdmFsdWUgaWYgbm8gY29udmVyc2lvbiBhcHBsaWVzXHJcblx0XHRcdHJldHVybiBzdHJWYWx1ZTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gQWx3YXlzIGNvbnZlcnQgcHJpb3JpdHkgdmFsdWVzIGluIHRhc2sgbWV0YWRhdGEsIGV2ZW4gaWYgaW5oZXJpdGFuY2UgaXMgZGlzYWJsZWRcclxuXHRcdGNvbnN0IGluaGVyaXRlZCA9IHsgLi4udGFza01ldGFkYXRhIH07XHJcblx0XHRpZiAoaW5oZXJpdGVkLnByaW9yaXR5ICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0aW5oZXJpdGVkLnByaW9yaXR5ID0gY29udmVydFByaW9yaXR5VmFsdWUoaW5oZXJpdGVkLnByaW9yaXR5KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBFYXJseSByZXR1cm4gaWYgZW5oYW5jZWQgcHJvamVjdCBmZWF0dXJlcyBhcmUgZGlzYWJsZWRcclxuXHRcdC8vIENoZWNrIGlmIGZpbGUgbWV0YWRhdGEgaW5oZXJpdGFuY2UgaXMgZW5hYmxlZFxyXG5cdFx0aWYgKCF0aGlzLmNvbmZpZy5maWxlTWV0YWRhdGFJbmhlcml0YW5jZT8uZW5hYmxlZCkge1xyXG5cdFx0XHQvLyBJbmhlcml0YW5jZSBkaXNhYmxlZDogcHJlc2VydmUgdGFzay1sZXZlbCBtZXRhZGF0YSBhcy1pc1xyXG5cdFx0XHQvLyAoZW5oYW5jZWQgbWVyZ2luZyB3aWxsIGJlIGhhbmRsZWQgZWxzZXdoZXJlIHdoZW4gZW5hYmxlZClcclxuXHRcdFx0cmV0dXJuIGluaGVyaXRlZDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDaGVjayBpZiBmcm9udG1hdHRlciBpbmhlcml0YW5jZSBpcyBlbmFibGVkXHJcblx0XHRpZiAoIXRoaXMuY29uZmlnLmZpbGVNZXRhZGF0YUluaGVyaXRhbmNlPy5pbmhlcml0RnJvbUZyb250bWF0dGVyKSB7XHJcblx0XHRcdC8vIExlZ2FjeSBiZWhhdmlvcjogcmV0dXJuIHRhc2stb25seSBtZXRhZGF0YVxyXG5cdFx0XHRyZXR1cm4gaW5oZXJpdGVkO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENoZWNrIGlmIHN1YnRhc2sgaW5oZXJpdGFuY2UgaXMgYWxsb3dlZFxyXG5cdFx0aWYgKFxyXG5cdFx0XHRpc1N1YnRhc2sgJiZcclxuXHRcdFx0IXRoaXMuY29uZmlnLmZpbGVNZXRhZGF0YUluaGVyaXRhbmNlXHJcblx0XHRcdFx0Py5pbmhlcml0RnJvbUZyb250bWF0dGVyRm9yU3VidGFza3NcclxuXHRcdCkge1xyXG5cdFx0XHQvLyBMZWdhY3kgYmVoYXZpb3I6IGRvIG5vdCBpbmhlcml0IGZvciBzdWJ0YXNrc1xyXG5cdFx0XHRyZXR1cm4gaW5oZXJpdGVkO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIExpc3Qgb2YgZmllbGRzIHRoYXQgc2hvdWxkIE5PVCBiZSBpbmhlcml0ZWQgKHRhc2stc3BlY2lmaWMgb25seSlcclxuXHRcdGNvbnN0IG5vbkluaGVyaXRhYmxlRmllbGRzID0gbmV3IFNldChbXHJcblx0XHRcdFwiaWRcIixcclxuXHRcdFx0XCJjb250ZW50XCIsXHJcblx0XHRcdFwic3RhdHVzXCIsXHJcblx0XHRcdFwicmF3U3RhdHVzXCIsXHJcblx0XHRcdFwiY29tcGxldGVkXCIsXHJcblx0XHRcdFwibGluZVwiLFxyXG5cdFx0XHRcImxpbmVOdW1iZXJcIixcclxuXHRcdFx0XCJvcmlnaW5hbE1hcmtkb3duXCIsXHJcblx0XHRcdFwiZmlsZVBhdGhcIixcclxuXHRcdFx0XCJoZWFkaW5nXCIsXHJcblx0XHRcdFwiaGVhZGluZ0xldmVsXCIsXHJcblx0XHRcdFwicGFyZW50XCIsXHJcblx0XHRcdFwicGFyZW50SWRcIixcclxuXHJcblx0XHRcdFwiY2hpbGRyZW5cIixcclxuXHRcdFx0XCJjaGlsZHJlbklkc1wiLFxyXG5cdFx0XHRcImluZGVudExldmVsXCIsXHJcblx0XHRcdFwiYWN0dWFsSW5kZW50XCIsXHJcblx0XHRcdFwibGlzdE1hcmtlclwiLFxyXG5cdFx0XHRcInRnUHJvamVjdFwiLFxyXG5cdFx0XHRcImNvbW1lbnRcIixcclxuXHRcdFx0XCJtZXRhZGF0YVwiLCAvLyBQcmV2ZW50IHJlY3Vyc2l2ZSBtZXRhZGF0YSBpbmhlcml0YW5jZVxyXG5cdFx0XSk7XHJcblxyXG5cdFx0Ly8gTEVHQUNZOiBJbmhlcml0IGZyb20gZmlsZSBtZXRhZGF0YSAoZnJvbnRtYXR0ZXIpIGlmIGF2YWlsYWJsZVxyXG5cdFx0aWYgKHRoaXMuZmlsZU1ldGFkYXRhKSB7XHJcblx0XHRcdC8vIFdoZW4gZW5oYW5jZWQgcHJvamVjdCArIG1ldGFkYXRhIGRldGVjdGlvbiBhcmUgZW5hYmxlZCxcclxuXHRcdFx0Ly8gZG8gTk9UIGluamVjdCBmcm9udG1hdHRlciBwcm9qZWN0IGludG8gbWV0YWRhdGEucHJvamVjdCBoZXJlLlxyXG5cdFx0XHQvLyBMZXQgdGdQcm9qZWN0IGJlIGRldGVybWluZWQgdmlhIGRldGVybWluZVRnUHJvamVjdCwgYW5kIGxhdGVyXHJcblx0XHRcdC8vIEF1Z21lbnRvciB3aWxsIG1pcnJvciB0Z1Byb2plY3QubmFtZSBpbnRvIG1ldGFkYXRhLnByb2plY3QgaWYgbmVlZGVkLlxyXG5cdFx0XHRjb25zdCBlbmhhbmNlZE9uID1cclxuXHRcdFx0XHQhIXRoaXMuY29uZmlnLnByb2plY3RDb25maWc/LmVuYWJsZUVuaGFuY2VkUHJvamVjdDtcclxuXHRcdFx0Y29uc3QgbWV0YWRhdGFEZXRlY3RPbiA9XHJcblx0XHRcdFx0ISF0aGlzLmNvbmZpZy5wcm9qZWN0Q29uZmlnPy5tZXRhZGF0YUNvbmZpZz8uZW5hYmxlZDtcclxuXHRcdFx0aWYgKCEoZW5oYW5jZWRPbiAmJiBtZXRhZGF0YURldGVjdE9uKSkge1xyXG5cdFx0XHRcdC8vIE1hcCBjb25maWd1cmVkIGZyb250bWF0dGVyIHByb2plY3Qga2V5IHRvIHN0YW5kYXJkICdwcm9qZWN0J1xyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRjb25zdCBjb25maWd1cmVkUHJvamVjdEtleSA9XHJcblx0XHRcdFx0XHRcdHRoaXMuY29uZmlnLnByb2plY3RDb25maWc/Lm1ldGFkYXRhQ29uZmlnPy5tZXRhZGF0YUtleTtcclxuXHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0Y29uZmlndXJlZFByb2plY3RLZXkgJiZcclxuXHRcdFx0XHRcdFx0dGhpcy5maWxlTWV0YWRhdGFbY29uZmlndXJlZFByb2plY3RLZXldICE9PSB1bmRlZmluZWQgJiZcclxuXHRcdFx0XHRcdFx0dGhpcy5maWxlTWV0YWRhdGFbY29uZmlndXJlZFByb2plY3RLZXldICE9PSBudWxsICYmXHJcblx0XHRcdFx0XHRcdFN0cmluZyhcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmZpbGVNZXRhZGF0YVtjb25maWd1cmVkUHJvamVjdEtleV1cclxuXHRcdFx0XHRcdFx0KS50cmltKCkgIT09IFwiXCJcclxuXHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0aW5oZXJpdGVkLnByb2plY3QgPT09IHVuZGVmaW5lZCB8fFxyXG5cdFx0XHRcdFx0XHRcdGluaGVyaXRlZC5wcm9qZWN0ID09PSBudWxsIHx8XHJcblx0XHRcdFx0XHRcdFx0aW5oZXJpdGVkLnByb2plY3QgPT09IFwiXCJcclxuXHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0aW5oZXJpdGVkLnByb2plY3QgPSBTdHJpbmcoXHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLmZpbGVNZXRhZGF0YVtjb25maWd1cmVkUHJvamVjdEtleV1cclxuXHRcdFx0XHRcdFx0XHQpLnRyaW0oKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0gY2F0Y2gge31cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Zm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXModGhpcy5maWxlTWV0YWRhdGEpKSB7XHJcblx0XHRcdFx0Ly8gU3BlY2lhbCBoYW5kbGluZyBmb3IgdGFncyBmaWVsZFxyXG5cdFx0XHRcdGlmIChrZXkgPT09IFwidGFnc1wiICYmIEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XHJcblx0XHRcdFx0XHQvLyBQYXJzZSB0YWdzIHRvIGV4dHJhY3Qgc3BlY2lhbCB0YWcgZm9ybWF0cyAoZS5nLiwgI3Byb2plY3QvbXlwcm9qZWN0KVxyXG5cdFx0XHRcdFx0Y29uc3QgdGFnTWV0YWRhdGEgPSB0aGlzLnBhcnNlVGFnc0Zvck1ldGFkYXRhKHZhbHVlKTtcclxuXHJcblx0XHRcdFx0XHQvLyBNZXJnZSBleHRyYWN0ZWQgbWV0YWRhdGEgZnJvbSB0YWdzXHJcblx0XHRcdFx0XHRmb3IgKGNvbnN0IFt0YWdLZXksIHRhZ1ZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhcclxuXHRcdFx0XHRcdFx0dGFnTWV0YWRhdGFcclxuXHRcdFx0XHRcdCkpIHtcclxuXHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdCFub25Jbmhlcml0YWJsZUZpZWxkcy5oYXModGFnS2V5KSAmJlxyXG5cdFx0XHRcdFx0XHRcdChpbmhlcml0ZWRbdGFnS2V5XSA9PT0gdW5kZWZpbmVkIHx8XHJcblx0XHRcdFx0XHRcdFx0XHRpbmhlcml0ZWRbdGFnS2V5XSA9PT0gbnVsbCB8fFxyXG5cdFx0XHRcdFx0XHRcdFx0aW5oZXJpdGVkW3RhZ0tleV0gPT09IFwiXCIpICYmXHJcblx0XHRcdFx0XHRcdFx0dGFnVmFsdWUgIT09IHVuZGVmaW5lZCAmJlxyXG5cdFx0XHRcdFx0XHRcdHRhZ1ZhbHVlICE9PSBudWxsXHJcblx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdC8vIENvbnZlcnQgcHJpb3JpdHkgdmFsdWVzIHRvIG51bWJlcnMgYmVmb3JlIGluaGVyaXRhbmNlXHJcblx0XHRcdFx0XHRcdFx0aWYgKHRhZ0tleSA9PT0gXCJwcmlvcml0eVwiKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRpbmhlcml0ZWRbdGFnS2V5XSA9XHJcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnZlcnRQcmlvcml0eVZhbHVlKHRhZ1ZhbHVlKTtcclxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdFx0aW5oZXJpdGVkW3RhZ0tleV0gPSBTdHJpbmcodGFnVmFsdWUpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIFN0b3JlIHRoZSB0YWdzIGFycmF5IGl0c2VsZiBhcyB0YWdzIG1ldGFkYXRhXHJcblx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdCFub25Jbmhlcml0YWJsZUZpZWxkcy5oYXMoXCJ0YWdzXCIpICYmXHJcblx0XHRcdFx0XHRcdChpbmhlcml0ZWRbXCJ0YWdzXCJdID09PSB1bmRlZmluZWQgfHxcclxuXHRcdFx0XHRcdFx0XHRpbmhlcml0ZWRbXCJ0YWdzXCJdID09PSBudWxsIHx8XHJcblx0XHRcdFx0XHRcdFx0aW5oZXJpdGVkW1widGFnc1wiXSA9PT0gXCJcIilcclxuXHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHQvLyBOb3JtYWxpemUgdGFncyBiZWZvcmUgc3RvcmluZ1xyXG5cdFx0XHRcdFx0XHRjb25zdCBub3JtYWxpemVkVGFncyA9IHZhbHVlLm1hcCgodGFnKSA9PlxyXG5cdFx0XHRcdFx0XHRcdHRoaXMubm9ybWFsaXplVGFnKHRhZylcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0aW5oZXJpdGVkW1widGFnc1wiXSA9IEpTT04uc3RyaW5naWZ5KG5vcm1hbGl6ZWRUYWdzKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0Ly8gT25seSBpbmhlcml0IGlmOlxyXG5cdFx0XHRcdFx0Ly8gMS4gVGhlIGZpZWxkIGlzIG5vdCBpbiB0aGUgbm9uLWluaGVyaXRhYmxlIGxpc3RcclxuXHRcdFx0XHRcdC8vIDIuIFRoZSB0YXNrIGRvZXNuJ3QgYWxyZWFkeSBoYXZlIGEgbWVhbmluZ2Z1bCB2YWx1ZSBmb3IgdGhpcyBmaWVsZFxyXG5cdFx0XHRcdFx0Ly8gMy4gVGhlIGZpbGUgbWV0YWRhdGEgdmFsdWUgaXMgbm90IHVuZGVmaW5lZC9udWxsXHJcblx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdCFub25Jbmhlcml0YWJsZUZpZWxkcy5oYXMoa2V5KSAmJlxyXG5cdFx0XHRcdFx0XHQoaW5oZXJpdGVkW2tleV0gPT09IHVuZGVmaW5lZCB8fFxyXG5cdFx0XHRcdFx0XHRcdGluaGVyaXRlZFtrZXldID09PSBudWxsIHx8XHJcblx0XHRcdFx0XHRcdFx0aW5oZXJpdGVkW2tleV0gPT09IFwiXCIpICYmXHJcblx0XHRcdFx0XHRcdHZhbHVlICE9PSB1bmRlZmluZWQgJiZcclxuXHRcdFx0XHRcdFx0dmFsdWUgIT09IG51bGxcclxuXHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHQvLyBDb252ZXJ0IHByaW9yaXR5IHZhbHVlcyB0byBudW1iZXJzIGJlZm9yZSBpbmhlcml0YW5jZVxyXG5cdFx0XHRcdFx0XHRpZiAoa2V5ID09PSBcInByaW9yaXR5XCIpIHtcclxuXHRcdFx0XHRcdFx0XHRpbmhlcml0ZWRba2V5XSA9IGNvbnZlcnRQcmlvcml0eVZhbHVlKHZhbHVlKTtcclxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRpbmhlcml0ZWRba2V5XSA9IFN0cmluZyh2YWx1ZSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBMRUdBQ1k6IEluaGVyaXQgZnJvbSBwcm9qZWN0IGNvbmZpZ3VyYXRpb24gZGF0YSBpZiBhdmFpbGFibGVcclxuXHRcdGlmICh0aGlzLnByb2plY3RDb25maWdDYWNoZSkge1xyXG5cdFx0XHRmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhcclxuXHRcdFx0XHR0aGlzLnByb2plY3RDb25maWdDYWNoZVxyXG5cdFx0XHQpKSB7XHJcblx0XHRcdFx0Ly8gT25seSBpbmhlcml0IGlmOlxyXG5cdFx0XHRcdC8vIDEuIFRoZSBmaWVsZCBpcyBub3QgaW4gdGhlIG5vbi1pbmhlcml0YWJsZSBsaXN0XHJcblx0XHRcdFx0Ly8gMi4gVGhlIHRhc2sgZG9lc24ndCBhbHJlYWR5IGhhdmUgYSBtZWFuaW5nZnVsIHZhbHVlIGZvciB0aGlzIGZpZWxkICh0YXNrIG1ldGFkYXRhIHRha2VzIHByZWNlZGVuY2UpXHJcblx0XHRcdFx0Ly8gMy4gRmlsZSBtZXRhZGF0YSBkb2Vzbid0IGhhdmUgdGhpcyBmaWVsZCAoZmlsZSBtZXRhZGF0YSB0YWtlcyBwcmVjZWRlbmNlIG92ZXIgcHJvamVjdCBjb25maWcpXHJcblx0XHRcdFx0Ly8gNC4gVGhlIHZhbHVlIGlzIG5vdCB1bmRlZmluZWQvbnVsbFxyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdCFub25Jbmhlcml0YWJsZUZpZWxkcy5oYXMoa2V5KSAmJlxyXG5cdFx0XHRcdFx0KGluaGVyaXRlZFtrZXldID09PSB1bmRlZmluZWQgfHxcclxuXHRcdFx0XHRcdFx0aW5oZXJpdGVkW2tleV0gPT09IG51bGwgfHxcclxuXHRcdFx0XHRcdFx0aW5oZXJpdGVkW2tleV0gPT09IFwiXCIpICYmXHJcblx0XHRcdFx0XHQhKFxyXG5cdFx0XHRcdFx0XHR0aGlzLmZpbGVNZXRhZGF0YSAmJlxyXG5cdFx0XHRcdFx0XHR0aGlzLmZpbGVNZXRhZGF0YVtrZXldICE9PSB1bmRlZmluZWRcclxuXHRcdFx0XHRcdCkgJiZcclxuXHRcdFx0XHRcdHZhbHVlICE9PSB1bmRlZmluZWQgJiZcclxuXHRcdFx0XHRcdHZhbHVlICE9PSBudWxsXHJcblx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHQvLyBDb252ZXJ0IHByaW9yaXR5IHZhbHVlcyB0byBudW1iZXJzIGJlZm9yZSBpbmhlcml0YW5jZVxyXG5cdFx0XHRcdFx0aWYgKGtleSA9PT0gXCJwcmlvcml0eVwiKSB7XHJcblx0XHRcdFx0XHRcdGluaGVyaXRlZFtrZXldID0gY29udmVydFByaW9yaXR5VmFsdWUodmFsdWUpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0aW5oZXJpdGVkW2tleV0gPSBTdHJpbmcodmFsdWUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBpbmhlcml0ZWQ7XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQ29uZmlndXJhYmxlVGFza1BhcnNlciBleHRlbmRzIE1hcmtkb3duVGFza1BhcnNlciB7XHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRjb25maWc/OiBQYXJ0aWFsPFRhc2tQYXJzZXJDb25maWc+LFxyXG5cdFx0dGltZVBhcnNpbmdTZXJ2aWNlPzogVGltZVBhcnNpbmdTZXJ2aWNlXHJcblx0KSB7XHJcblx0XHQvLyBEZWZhdWx0IGNvbmZpZ3VyYXRpb25cclxuXHRcdGNvbnN0IGRlZmF1bHRDb25maWc6IFRhc2tQYXJzZXJDb25maWcgPSB7XHJcblx0XHRcdHBhcnNlTWV0YWRhdGE6IHRydWUsXHJcblx0XHRcdHBhcnNlVGFnczogdHJ1ZSxcclxuXHRcdFx0cGFyc2VDb21tZW50czogdHJ1ZSxcclxuXHRcdFx0cGFyc2VIZWFkaW5nczogdHJ1ZSxcclxuXHRcdFx0bWF4SW5kZW50U2l6ZTogMTAwLFxyXG5cdFx0XHRtYXhQYXJzZUl0ZXJhdGlvbnM6IDEwMCxcclxuXHRcdFx0bWF4TWV0YWRhdGFJdGVyYXRpb25zOiA1MCxcclxuXHRcdFx0bWF4VGFnTGVuZ3RoOiA1MCxcclxuXHRcdFx0bWF4RW1vamlWYWx1ZUxlbmd0aDogNTAsXHJcblx0XHRcdG1heFN0YWNrT3BlcmF0aW9uczogMTAwMCxcclxuXHRcdFx0bWF4U3RhY2tTaXplOiA1MCxcclxuXHRcdFx0c3RhdHVzTWFwcGluZzoge1xyXG5cdFx0XHRcdFRPRE86IFwiIFwiLFxyXG5cdFx0XHRcdElOX1BST0dSRVNTOiBcIi9cIixcclxuXHRcdFx0XHRET05FOiBcInhcIixcclxuXHRcdFx0XHRDQU5DRUxMRUQ6IFwiLVwiLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHRlbW9qaU1hcHBpbmc6IHtcclxuXHRcdFx0XHRcIvCfk4VcIjogXCJkdWVEYXRlXCIsXHJcblx0XHRcdFx0XCLwn5urXCI6IFwic3RhcnREYXRlXCIsXHJcblx0XHRcdFx0XCLij7NcIjogXCJzY2hlZHVsZWREYXRlXCIsXHJcblx0XHRcdFx0XCLinIVcIjogXCJjb21wbGV0ZWREYXRlXCIsXHJcblx0XHRcdFx0XCLinpVcIjogXCJjcmVhdGVkRGF0ZVwiLFxyXG5cdFx0XHRcdFwi4p2MXCI6IFwiY2FuY2VsbGVkRGF0ZVwiLFxyXG5cdFx0XHRcdFwi8J+GlFwiOiBcImlkXCIsXHJcblx0XHRcdFx0XCLim5RcIjogXCJkZXBlbmRzT25cIixcclxuXHRcdFx0XHRcIvCfj4FcIjogXCJvbkNvbXBsZXRpb25cIixcclxuXHRcdFx0XHRcIvCflIFcIjogXCJyZXBlYXRcIixcclxuXHRcdFx0XHRcIvCflLpcIjogXCJwcmlvcml0eVwiLFxyXG5cdFx0XHRcdFwi4o+rXCI6IFwicHJpb3JpdHlcIixcclxuXHRcdFx0XHRcIvCflLxcIjogXCJwcmlvcml0eVwiLFxyXG5cdFx0XHRcdFwi8J+UvVwiOiBcInByaW9yaXR5XCIsXHJcblx0XHRcdFx0XCLij6xcIjogXCJwcmlvcml0eVwiLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHRtZXRhZGF0YVBhcnNlTW9kZTogTWV0YWRhdGFQYXJzZU1vZGUuQm90aCxcclxuXHRcdFx0c3BlY2lhbFRhZ1ByZWZpeGVzOiB7XHJcblx0XHRcdFx0cHJvamVjdDogXCJwcm9qZWN0XCIsXHJcblx0XHRcdFx0XCJAXCI6IFwiY29udGV4dFwiLFxyXG5cdFx0XHR9LFxyXG5cdFx0fTtcclxuXHJcblx0XHRzdXBlcih7IC4uLmRlZmF1bHRDb25maWcsIC4uLmNvbmZpZyB9LCB0aW1lUGFyc2luZ1NlcnZpY2UpO1xyXG5cdH1cclxufVxyXG4iXX0=