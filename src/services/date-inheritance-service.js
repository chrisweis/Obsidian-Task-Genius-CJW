/**
 * Date Inheritance Service for Time-Only Expressions
 *
 * This service handles date resolution for time-only expressions (like "12:00～13:00")
 * by implementing a priority-based inheritance system:
 * 1. Current line date > file metadata date = daily note title date > file ctime
 * 2. Parent task date inheritance for hierarchical structures
 * 3. Efficient caching to avoid frequent file system calls
 */
import { __awaiter } from "tslib";
/**
 * Service for handling date inheritance for time-only expressions
 */
export class DateInheritanceService {
    constructor(app, vault, metadataCache) {
        this.app = app;
        this.vault = vault;
        this.metadataCache = metadataCache;
        this.fileDateCache = new Map();
        this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
        this.MAX_CACHE_SIZE = 500;
        // Daily note patterns for different date formats and common naming conventions
        // Order matters - more specific patterns should come first
        this.DAILY_NOTE_PATTERNS = [
            // Week format: YYYY-W## (must come before YYYY-MM)
            { pattern: /(\d{4})-W(\d{2})/, format: "YYYY-W##" },
            // Standard ISO format: YYYY-MM-DD
            { pattern: /(\d{4})-(\d{2})-(\d{2})/, format: "YYYY-MM-DD" },
            // Dot separated: YYYY.MM.DD
            { pattern: /(\d{4})\.(\d{2})\.(\d{2})/, format: "YYYY.MM.DD" },
            // Underscore separated: YYYY_MM_DD
            { pattern: /(\d{4})_(\d{2})_(\d{2})/, format: "YYYY_MM_DD" },
            // Compact format: YYYYMMDD (be careful with this one)
            { pattern: /(\d{4})(\d{2})(\d{2})/, format: "YYYYMMDD" },
            // US format: MM-DD-YYYY
            { pattern: /(\d{2})-(\d{2})-(\d{4})/, format: "MM-DD-YYYY" },
            // European format: DD.MM.YYYY
            { pattern: /(\d{2})\.(\d{2})\.(\d{4})/, format: "DD.MM.YYYY" },
            // Alternative US format: MM/DD/YYYY
            { pattern: /(\d{2})\/(\d{2})\/(\d{4})/, format: "MM/DD/YYYY" },
            // Alternative European format: DD/MM/YYYY (ambiguous with US, will use context)
            { pattern: /(\d{2})\/(\d{2})\/(\d{4})/, format: "DD/MM/YYYY" },
            // Year-month format: YYYY-MM (for monthly notes) - must come after YYYY-MM-DD
            // Use negative lookahead to avoid matching YYYY-MM-DD patterns
            { pattern: /(\d{4})-(\d{2})(?!-\d{2})/, format: "YYYY-MM" },
        ];
        // Common daily note folder patterns
        this.DAILY_NOTE_FOLDER_PATTERNS = [
            /daily\s*notes?/i,
            /journal/i,
            /diary/i,
            /log/i,
            /\d{4}\/\d{2}/,
            /\d{4}-\d{2}/, // Year-Month structure
        ];
        // File metadata property names that commonly contain dates
        this.DATE_PROPERTY_NAMES = [
            // Standard properties
            'date', 'created', 'creation-date', 'created-date', 'creation_date',
            'day', 'daily-note-date', 'note-date', 'file-date',
            // Obsidian properties
            'created-at', 'created_at', 'createdAt',
            'modified', 'modified-date', 'modified_date', 'updated', 'updated-date',
            // Custom properties
            'publish-date', 'publish_date', 'publishDate',
            'event-date', 'event_date', 'eventDate',
            'due-date', 'due_date', 'dueDate',
            'start-date', 'start_date', 'startDate',
            // Templater and other plugin properties
            'tp.date', 'tp.file.creation_date', 'tp.file.last_modified_date',
            // Dataview properties
            'file.ctime', 'file.mtime', 'file.cday', 'file.mday',
        ];
        // Date patterns for line-level date detection
        this.LINE_DATE_PATTERNS = [
            // Standard date formats
            /\b(\d{4})-(\d{2})-(\d{2})\b/,
            /\b(\d{2})\/(\d{2})\/(\d{4})\b/,
            /\b(\d{2})-(\d{2})-(\d{4})\b/,
            // Natural language dates (basic patterns)
            /\b(today|tomorrow|yesterday)\b/i,
            /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
        ];
    }
    /**
     * Resolve date for time-only expressions using priority logic
     */
    resolveDateForTimeOnly(task, timeComponent, context) {
        return __awaiter(this, void 0, void 0, function* () {
            // Priority 1: Current line date
            const lineDate = this.extractDateFromLine(context.currentLine, context.lineNumber, context.allLines);
            if (lineDate) {
                return {
                    resolvedDate: lineDate,
                    source: "line-date",
                    confidence: "high",
                    usedFallback: false,
                    context: "Found explicit date in current line"
                };
            }
            // Priority 2: Parent task date inheritance (with hierarchical support)
            if (context.parentTask) {
                try {
                    const hierarchicalResult = yield this.extractDateFromParentHierarchy(context.parentTask, context);
                    if (hierarchicalResult) {
                        const confidence = hierarchicalResult.depth === 0 ? "high" :
                            hierarchicalResult.depth === 1 ? "medium" : "low";
                        return {
                            resolvedDate: hierarchicalResult.date,
                            source: "parent-task",
                            confidence,
                            usedFallback: false,
                            context: `Inherited from ${hierarchicalResult.source} (depth: ${hierarchicalResult.depth})`
                        };
                    }
                }
                catch (error) {
                    console.warn('[DateInheritanceService] Error in hierarchical parent date extraction:', error);
                    // Fall back to simple parent extraction
                    const parentDate = this.extractDateFromParentTask(context.parentTask);
                    if (parentDate) {
                        return {
                            resolvedDate: parentDate,
                            source: "parent-task",
                            confidence: "high",
                            usedFallback: false,
                            context: "Inherited from parent task (fallback)"
                        };
                    }
                }
            }
            // Priority 3: File metadata date = daily note title date (equal priority)
            const fileDateInfo = yield this.getFileDateInfo(context.filePath);
            // Check daily note date first (slightly higher confidence for explicit daily notes)
            if (fileDateInfo.dailyNoteDate && fileDateInfo.isDailyNote) {
                return {
                    resolvedDate: fileDateInfo.dailyNoteDate,
                    source: "daily-note-date",
                    confidence: "high",
                    usedFallback: false,
                    context: "Extracted from daily note title/path"
                };
            }
            // Check file metadata date
            if (fileDateInfo.metadataDate) {
                return {
                    resolvedDate: fileDateInfo.metadataDate,
                    source: "metadata-date",
                    confidence: "medium",
                    usedFallback: false,
                    context: "Found in file frontmatter/properties"
                };
            }
            // Check daily note date for non-daily note files
            if (fileDateInfo.dailyNoteDate) {
                return {
                    resolvedDate: fileDateInfo.dailyNoteDate,
                    source: "daily-note-date",
                    confidence: "medium",
                    usedFallback: false,
                    context: "Extracted from file path date pattern"
                };
            }
            // Priority 4: File creation time (fallback)
            return {
                resolvedDate: fileDateInfo.ctime,
                source: "file-ctime",
                confidence: "low",
                usedFallback: true,
                context: "Using file creation time as fallback"
            };
        });
    }
    /**
     * Get file-based date information with caching
     */
    getFileDateInfo(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check cache first
            const cached = this.fileDateCache.get(filePath);
            if (cached && this.isCacheValid(cached)) {
                return cached;
            }
            // Get file stats
            const file = this.vault.getAbstractFileByPath(filePath);
            if (!file) {
                // Return default info for non-existent files
                return {
                    ctime: new Date(),
                    dailyNoteDate: undefined,
                    metadataDate: undefined,
                    isDailyNote: false,
                    cachedAt: new Date(),
                    mtime: 0
                };
            }
            const fileStat = yield this.vault.adapter.stat(filePath);
            const ctime = new Date((fileStat === null || fileStat === void 0 ? void 0 : fileStat.ctime) || Date.now());
            const mtime = (fileStat === null || fileStat === void 0 ? void 0 : fileStat.mtime) || 0;
            // Extract daily note date from file path/title
            const dailyNoteDateResult = this.extractDailyNoteDate(filePath);
            const dailyNoteDate = dailyNoteDateResult !== null && dailyNoteDateResult !== void 0 ? dailyNoteDateResult : undefined;
            const isDailyNote = dailyNoteDateResult !== null;
            // Extract metadata date from frontmatter
            const metadataDateResult = yield this.extractMetadataDate(file);
            const metadataDate = metadataDateResult !== null && metadataDateResult !== void 0 ? metadataDateResult : undefined;
            const fileDateInfo = {
                ctime,
                metadataDate,
                dailyNoteDate,
                isDailyNote,
                cachedAt: new Date(),
                mtime
            };
            // Cache the result
            this.cacheFileDateInfo(filePath, fileDateInfo);
            return fileDateInfo;
        });
    }
    /**
     * Extract daily note date from file path/title with enhanced pattern matching
     */
    extractDailyNoteDate(filePath) {
        var _a;
        const fileName = ((_a = filePath.split('/').pop()) === null || _a === void 0 ? void 0 : _a.replace(/\.md$/, '')) || '';
        const fullPath = filePath;
        const folderPath = filePath.substring(0, filePath.lastIndexOf('/'));
        // Check if this looks like a daily note based on folder structure
        const isDailyNoteFolder = this.isDailyNoteFolder(folderPath);
        // Try each pattern on filename first, then full path
        for (const { pattern, format } of this.DAILY_NOTE_PATTERNS) {
            // Try filename first
            let match = fileName.match(pattern);
            let matchSource = 'filename';
            if (!match) {
                // Try full path
                match = fullPath.match(pattern);
                matchSource = 'fullpath';
            }
            if (match) {
                try {
                    const date = this.parseDateFromPatternMatch(match, format, isDailyNoteFolder);
                    if (date) {
                        // Additional validation for daily notes
                        if (this.isValidDailyNoteDate(date, filePath, matchSource)) {
                            return date;
                        }
                    }
                }
                catch (error) {
                    // Continue to next pattern if parsing fails
                    continue;
                }
            }
        }
        return null;
    }
    /**
     * Check if folder path indicates this is likely a daily note
     */
    isDailyNoteFolder(folderPath) {
        if (!folderPath)
            return false;
        const lowerPath = folderPath.toLowerCase();
        return this.DAILY_NOTE_FOLDER_PATTERNS.some(pattern => pattern.test(lowerPath));
    }
    /**
     * Parse date from pattern match based on format
     */
    parseDateFromPatternMatch(match, format, isDailyNoteFolder) {
        let year, month, day;
        switch (format) {
            case "YYYY-MM-DD":
            case "YYYY.MM.DD":
            case "YYYY_MM_DD":
                year = parseInt(match[1], 10);
                month = parseInt(match[2], 10);
                day = parseInt(match[3], 10);
                break;
            case "YYYYMMDD":
                year = parseInt(match[1], 10);
                month = parseInt(match[2], 10);
                day = parseInt(match[3], 10);
                break;
            case "MM-DD-YYYY":
            case "MM/DD/YYYY":
                month = parseInt(match[1], 10);
                day = parseInt(match[2], 10);
                year = parseInt(match[3], 10);
                break;
            case "DD.MM.YYYY":
            case "DD/MM/YYYY":
                day = parseInt(match[1], 10);
                month = parseInt(match[2], 10);
                year = parseInt(match[3], 10);
                break;
            case "YYYY-MM":
                // Monthly note - use first day of month
                year = parseInt(match[1], 10);
                month = parseInt(match[2], 10);
                day = 1;
                break;
            case "YYYY-W##":
                // Weekly note - calculate date from week number
                year = parseInt(match[1], 10);
                const weekNum = parseInt(match[2], 10);
                return this.getDateFromWeekNumber(year, weekNum);
            default:
                return null;
        }
        // Handle ambiguous DD/MM vs MM/DD formats
        if (format === "DD/MM/YYYY" || format === "MM/DD/YYYY") {
            // Use context clues to determine format
            const preferEuropean = isDailyNoteFolder && this.detectEuropeanDatePreference();
            if (format === "DD/MM/YYYY" && !preferEuropean) {
                // Switch to MM/DD interpretation
                [month, day] = [day, month];
            }
        }
        // Validate date components
        if (year >= 1900 && year <= 2100 &&
            month >= 1 && month <= 12 &&
            day >= 1 && day <= 31) {
            const date = new Date(year, month - 1, day); // month is 0-indexed
            // Verify the date is valid (handles invalid dates like Feb 30)
            if (date.getFullYear() === year &&
                date.getMonth() === month - 1 &&
                date.getDate() === day) {
                return date;
            }
        }
        return null;
    }
    /**
     * Get date from ISO week number
     */
    getDateFromWeekNumber(year, week) {
        if (week < 1 || week > 53)
            return null;
        // January 4th is always in week 1
        const jan4 = new Date(year, 0, 4);
        const jan4Day = jan4.getDay() || 7; // Sunday = 7, Monday = 1
        // Calculate the Monday of week 1
        const week1Monday = new Date(jan4);
        week1Monday.setDate(jan4.getDate() - jan4Day + 1);
        // Calculate the target week's Monday
        const targetDate = new Date(week1Monday);
        targetDate.setDate(week1Monday.getDate() + (week - 1) * 7);
        return targetDate;
    }
    /**
     * Detect if European date format (DD/MM) is preferred based on context
     */
    detectEuropeanDatePreference() {
        // This could be enhanced with user settings or locale detection
        // For now, return false (prefer US format MM/DD)
        return false;
    }
    /**
     * Validate if the extracted date makes sense for a daily note
     */
    isValidDailyNoteDate(date, filePath, matchSource) {
        // Allow a very wide range for daily notes to accommodate various use cases
        // including historical research, archival notes, and future planning
        const minDate = new Date(1900, 0, 1);
        const maxDate = new Date(2100, 11, 31);
        // Basic sanity check - date should be within reasonable bounds
        if (date < minDate || date > maxDate) {
            return false;
        }
        // Additional validation could be added here based on specific requirements
        // For now, we'll be permissive to support various use cases
        return true;
    }
    /**
     * Extract metadata date from file frontmatter/properties with comprehensive property support
     */
    extractMetadataDate(file) {
        return __awaiter(this, void 0, void 0, function* () {
            const fileCache = this.metadataCache.getFileCache(file);
            const frontmatter = fileCache === null || fileCache === void 0 ? void 0 : fileCache.frontmatter;
            if (!frontmatter) {
                return null;
            }
            // Try each date property in order of preference
            for (const prop of this.DATE_PROPERTY_NAMES) {
                const value = frontmatter[prop];
                if (value !== undefined && value !== null) {
                    const date = this.parseMetadataDate(value, prop);
                    if (date) {
                        return date;
                    }
                }
            }
            // Also check for nested properties (e.g., file.ctime in Dataview)
            const nestedDate = this.extractNestedMetadataDate(frontmatter);
            if (nestedDate) {
                return nestedDate;
            }
            return null;
        });
    }
    /**
     * Extract dates from nested metadata properties
     */
    extractNestedMetadataDate(frontmatter) {
        // Check for Dataview file properties
        if (frontmatter.file) {
            const fileProps = frontmatter.file;
            const dateProps = ['ctime', 'mtime', 'cday', 'mday', 'created', 'modified'];
            for (const prop of dateProps) {
                if (fileProps[prop]) {
                    const date = this.parseMetadataDate(fileProps[prop], `file.${prop}`);
                    if (date) {
                        return date;
                    }
                }
            }
        }
        // Check for Templater properties
        if (frontmatter.tp) {
            const tpProps = frontmatter.tp;
            if (tpProps.date) {
                const date = this.parseMetadataDate(tpProps.date, 'tp.date');
                if (date) {
                    return date;
                }
            }
            if (tpProps.file) {
                const tpFileProps = tpProps.file;
                const dateProps = ['creation_date', 'last_modified_date'];
                for (const prop of dateProps) {
                    if (tpFileProps[prop]) {
                        const date = this.parseMetadataDate(tpFileProps[prop], `tp.file.${prop}`);
                        if (date) {
                            return date;
                        }
                    }
                }
            }
        }
        return null;
    }
    /**
     * Parse various metadata date formats with enhanced support
     */
    parseMetadataDate(value, propertyName) {
        if (!value)
            return null;
        // Handle different value types
        if (value instanceof Date) {
            return value;
        }
        if (typeof value === 'number') {
            // Assume timestamp
            return new Date(value);
        }
        if (typeof value === 'string') {
            // Handle special string formats first
            const trimmedValue = value.trim();
            // Handle relative dates
            if (this.isRelativeDateString(trimmedValue)) {
                const relativeDate = this.parseRelativeDateString(trimmedValue);
                if (relativeDate) {
                    return relativeDate;
                }
            }
            // Handle natural language dates
            if (this.isNaturalLanguageDate(trimmedValue)) {
                const naturalDate = this.parseNaturalLanguageDate(trimmedValue);
                if (naturalDate) {
                    return naturalDate;
                }
            }
            // Try common date formats with enhanced pattern matching
            const datePatterns = [
                { pattern: /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/, format: "ISO_DATETIME" },
                { pattern: /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/, format: "ISO_DATETIME_SHORT" },
                { pattern: /^(\d{4})-(\d{2})-(\d{2})$/, format: "YYYY-MM-DD" },
                { pattern: /^(\d{2})\/(\d{2})\/(\d{4})$/, format: "MM/DD/YYYY" },
                { pattern: /^(\d{2})-(\d{2})-(\d{4})$/, format: "DD-MM-YYYY" },
                { pattern: /^(\d{4})\.(\d{2})\.(\d{2})$/, format: "YYYY.MM.DD" },
                { pattern: /^(\d{2})\.(\d{2})\.(\d{4})$/, format: "DD.MM.YYYY" },
                { pattern: /^(\d{4})\/(\d{2})\/(\d{2})$/, format: "YYYY/MM/DD" },
                { pattern: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, format: "M/D/YYYY" },
                { pattern: /^(\d{4})(\d{2})(\d{2})$/, format: "YYYYMMDD" },
            ];
            for (const { pattern, format } of datePatterns) {
                const match = trimmedValue.match(pattern);
                if (match) {
                    try {
                        const date = this.parseDateFromFormat(match, format);
                        if (date && this.isValidMetadataDate(date, propertyName)) {
                            return date;
                        }
                    }
                    catch (error) {
                        continue;
                    }
                }
            }
            // Try parsing as ISO date as fallback
            try {
                const isoDate = new Date(trimmedValue);
                if (!isNaN(isoDate.getTime()) && this.isValidMetadataDate(isoDate, propertyName)) {
                    return isoDate;
                }
            }
            catch (error) {
                // Continue to next attempt
            }
            // Try parsing with Date.parse as final fallback
            try {
                const parsedTime = Date.parse(trimmedValue);
                if (!isNaN(parsedTime)) {
                    const date = new Date(parsedTime);
                    if (this.isValidMetadataDate(date, propertyName)) {
                        return date;
                    }
                }
            }
            catch (error) {
                // Final fallback failed
            }
        }
        return null;
    }
    /**
     * Extract date from current line context
     */
    extractDateFromLine(currentLine, lineNumber, allLines) {
        // First check the current line itself
        for (const pattern of this.LINE_DATE_PATTERNS) {
            const match = currentLine.match(pattern);
            if (match) {
                const date = this.parseDateFromMatch(match, pattern);
                if (date) {
                    return date;
                }
            }
        }
        // If we have context of all lines, check nearby lines (within 3 lines)
        if (allLines && lineNumber !== undefined) {
            const searchRange = 3;
            const startLine = Math.max(0, lineNumber - searchRange);
            const endLine = Math.min(allLines.length - 1, lineNumber + searchRange);
            for (let i = startLine; i <= endLine; i++) {
                if (i === lineNumber)
                    continue; // Already checked current line
                const line = allLines[i];
                for (const pattern of this.LINE_DATE_PATTERNS) {
                    const match = line.match(pattern);
                    if (match) {
                        const date = this.parseDateFromMatch(match, pattern);
                        if (date) {
                            return date;
                        }
                    }
                }
            }
        }
        return null;
    }
    /**
     * Parse date from regex match
     */
    parseDateFromMatch(match, pattern) {
        try {
            const matchStr = match[0].toLowerCase();
            // Handle natural language dates
            if (matchStr === 'today') {
                return new Date();
            }
            else if (matchStr === 'tomorrow') {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                return tomorrow;
            }
            else if (matchStr === 'yesterday') {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                return yesterday;
            }
            // Handle weekdays (find next occurrence)
            const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const weekdayIndex = weekdays.indexOf(matchStr);
            if (weekdayIndex !== -1) {
                const today = new Date();
                const currentDay = today.getDay();
                let daysToAdd = weekdayIndex - currentDay;
                if (daysToAdd <= 0) {
                    daysToAdd += 7; // Next week
                }
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() + daysToAdd);
                return targetDate;
            }
            // Handle numeric date patterns
            if (match.length >= 4) {
                let year, month, day;
                if (pattern.source.includes('(\\d{4})-(\\d{2})-(\\d{2})')) {
                    // YYYY-MM-DD
                    year = parseInt(match[1], 10);
                    month = parseInt(match[2], 10);
                    day = parseInt(match[3], 10);
                }
                else if (pattern.source.includes('(\\d{2})\\/(\\d{2})\\/(\\d{4})')) {
                    // MM/DD/YYYY
                    month = parseInt(match[1], 10);
                    day = parseInt(match[2], 10);
                    year = parseInt(match[3], 10);
                }
                else if (pattern.source.includes('(\\d{2})-(\\d{2})-(\\d{4})')) {
                    // DD-MM-YYYY
                    day = parseInt(match[1], 10);
                    month = parseInt(match[2], 10);
                    year = parseInt(match[3], 10);
                }
                else {
                    return null;
                }
                const date = new Date(year, month - 1, day);
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
        }
        catch (error) {
            // Continue if parsing fails
        }
        return null;
    }
    /**
     * Extract date from parent task with hierarchical inheritance support
     */
    extractDateFromParentTask(parentTask) {
        // Check various date fields in priority order
        // Priority 1: Explicit dates on the parent task
        if (parentTask.metadata.startDate) {
            return new Date(parentTask.metadata.startDate);
        }
        if (parentTask.metadata.dueDate) {
            return new Date(parentTask.metadata.dueDate);
        }
        if (parentTask.metadata.scheduledDate) {
            return new Date(parentTask.metadata.scheduledDate);
        }
        // Priority 2: Enhanced datetime objects (if available)
        const enhancedMetadata = parentTask.metadata;
        if (enhancedMetadata.enhancedDates) {
            if (enhancedMetadata.enhancedDates.startDateTime) {
                return new Date(enhancedMetadata.enhancedDates.startDateTime);
            }
            if (enhancedMetadata.enhancedDates.dueDateTime) {
                return new Date(enhancedMetadata.enhancedDates.dueDateTime);
            }
            if (enhancedMetadata.enhancedDates.scheduledDateTime) {
                return new Date(enhancedMetadata.enhancedDates.scheduledDateTime);
            }
        }
        // Priority 3: Creation date as fallback
        if (parentTask.metadata.createdDate) {
            return new Date(parentTask.metadata.createdDate);
        }
        return null;
    }
    /**
     * Extract date from parent task hierarchy with recursive inheritance
     * This method supports multi-level inheritance (parent -> grandparent -> etc.)
     */
    extractDateFromParentHierarchy(parentTask, context, maxDepth = 3, currentDepth = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            if (currentDepth >= maxDepth) {
                return null;
            }
            // Try to get date from current parent
            const parentDate = this.extractDateFromParentTask(parentTask);
            if (parentDate) {
                return {
                    date: parentDate,
                    source: `parent-task-L${currentDepth}`,
                    depth: currentDepth
                };
            }
            // If parent doesn't have a date, try to find the parent's parent
            // This requires access to all tasks in the context
            if (context.allTasks && parentTask.metadata.parent) {
                const grandparentTask = context.allTasks.find(task => task.id === parentTask.metadata.parent);
                if (grandparentTask) {
                    // Recursively check grandparent
                    const grandparentResult = yield this.extractDateFromParentHierarchy(grandparentTask, context, maxDepth, currentDepth + 1);
                    if (grandparentResult) {
                        return grandparentResult;
                    }
                }
            }
            return null;
        });
    }
    /**
     * Check if cache entry is still valid
     */
    isCacheValid(cached) {
        const now = Date.now();
        const cacheAge = now - cached.cachedAt.getTime();
        return cacheAge < this.CACHE_TTL;
    }
    /**
     * Cache file date info with LRU eviction
     */
    cacheFileDateInfo(filePath, info) {
        // Implement LRU eviction
        if (this.fileDateCache.size >= this.MAX_CACHE_SIZE) {
            // Remove oldest entry
            const firstKey = this.fileDateCache.keys().next().value;
            if (firstKey) {
                this.fileDateCache.delete(firstKey);
            }
        }
        this.fileDateCache.set(filePath, info);
    }
    /**
     * Clear the cache (useful for testing or settings changes)
     */
    clearCache() {
        this.fileDateCache.clear();
    }
    /**
     * Check if string represents a relative date
     */
    isRelativeDateString(value) {
        const relativeDatePatterns = [
            /^today$/i,
            /^tomorrow$/i,
            /^yesterday$/i,
            /^now$/i,
            /^\+\d+[dwmy]$/i,
            /^-\d+[dwmy]$/i, // -1d, -2w, -1m, -1y
        ];
        return relativeDatePatterns.some(pattern => pattern.test(value));
    }
    /**
     * Parse relative date strings
     */
    parseRelativeDateString(value) {
        const now = new Date();
        const lowerValue = value.toLowerCase();
        switch (lowerValue) {
            case 'today':
            case 'now':
                return new Date(now.getFullYear(), now.getMonth(), now.getDate());
            case 'tomorrow':
                return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            case 'yesterday':
                return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        }
        // Handle +/-N[dwmy] format
        const offsetMatch = value.match(/^([+-])(\d+)([dwmy])$/i);
        if (offsetMatch) {
            const sign = offsetMatch[1] === '+' ? 1 : -1;
            const amount = parseInt(offsetMatch[2], 10) * sign;
            const unit = offsetMatch[3].toLowerCase();
            const result = new Date(now);
            switch (unit) {
                case 'd':
                    result.setDate(result.getDate() + amount);
                    break;
                case 'w':
                    result.setDate(result.getDate() + amount * 7);
                    break;
                case 'm':
                    result.setMonth(result.getMonth() + amount);
                    break;
                case 'y':
                    result.setFullYear(result.getFullYear() + amount);
                    break;
            }
            return result;
        }
        return null;
    }
    /**
     * Check if string represents natural language date
     */
    isNaturalLanguageDate(value) {
        const naturalPatterns = [
            /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i,
            /^(next|last)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i,
            /^(next|last)\s+(week|month|year)$/i,
            /^(this|next|last)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i,
        ];
        return naturalPatterns.some(pattern => pattern.test(value));
    }
    /**
     * Parse natural language date strings
     */
    parseNaturalLanguageDate(value) {
        var _a;
        const now = new Date();
        const lowerValue = value.toLowerCase().trim();
        // Handle weekdays
        const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const weekdayMatch = lowerValue.match(/^(?:(next|last|this)\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i);
        if (weekdayMatch) {
            const modifier = (_a = weekdayMatch[1]) === null || _a === void 0 ? void 0 : _a.toLowerCase();
            const weekdayName = weekdayMatch[2].toLowerCase();
            const targetWeekday = weekdays.indexOf(weekdayName);
            if (targetWeekday !== -1) {
                const currentWeekday = now.getDay();
                let daysToAdd = targetWeekday - currentWeekday;
                if (modifier === 'next') {
                    if (daysToAdd <= 0)
                        daysToAdd += 7;
                }
                else if (modifier === 'last') {
                    if (daysToAdd >= 0)
                        daysToAdd -= 7;
                }
                else if (modifier === 'this') {
                    // Keep as is
                }
                else {
                    // No modifier - assume next occurrence
                    if (daysToAdd <= 0)
                        daysToAdd += 7;
                }
                const result = new Date(now);
                result.setDate(now.getDate() + daysToAdd);
                return result;
            }
        }
        // Handle other natural language patterns
        if (lowerValue === 'next week') {
            const result = new Date(now);
            result.setDate(now.getDate() + 7);
            return result;
        }
        else if (lowerValue === 'last week') {
            const result = new Date(now);
            result.setDate(now.getDate() - 7);
            return result;
        }
        else if (lowerValue === 'next month') {
            const result = new Date(now);
            result.setMonth(now.getMonth() + 1);
            return result;
        }
        else if (lowerValue === 'last month') {
            const result = new Date(now);
            result.setMonth(now.getMonth() - 1);
            return result;
        }
        return null;
    }
    /**
     * Parse date from format-specific match
     */
    parseDateFromFormat(match, format) {
        let year, month, day, hour = 0, minute = 0, second = 0;
        switch (format) {
            case "ISO_DATETIME":
                year = parseInt(match[1], 10);
                month = parseInt(match[2], 10);
                day = parseInt(match[3], 10);
                hour = parseInt(match[4], 10);
                minute = parseInt(match[5], 10);
                second = parseInt(match[6], 10);
                break;
            case "ISO_DATETIME_SHORT":
                year = parseInt(match[1], 10);
                month = parseInt(match[2], 10);
                day = parseInt(match[3], 10);
                hour = parseInt(match[4], 10);
                minute = parseInt(match[5], 10);
                break;
            case "YYYY-MM-DD":
            case "YYYY.MM.DD":
            case "YYYY/MM/DD":
                year = parseInt(match[1], 10);
                month = parseInt(match[2], 10);
                day = parseInt(match[3], 10);
                break;
            case "MM/DD/YYYY":
            case "M/D/YYYY":
                month = parseInt(match[1], 10);
                day = parseInt(match[2], 10);
                year = parseInt(match[3], 10);
                break;
            case "DD-MM-YYYY":
            case "DD.MM.YYYY":
                day = parseInt(match[1], 10);
                month = parseInt(match[2], 10);
                year = parseInt(match[3], 10);
                break;
            case "YYYYMMDD":
                year = parseInt(match[1], 10);
                month = parseInt(match[2], 10);
                day = parseInt(match[3], 10);
                break;
            default:
                return null;
        }
        // Validate date components
        if (year >= 1900 && year <= 2100 &&
            month >= 1 && month <= 12 &&
            day >= 1 && day <= 31 &&
            hour >= 0 && hour <= 23 &&
            minute >= 0 && minute <= 59 &&
            second >= 0 && second <= 59) {
            const date = new Date(year, month - 1, day, hour, minute, second);
            // Verify the date is valid
            if (date.getFullYear() === year &&
                date.getMonth() === month - 1 &&
                date.getDate() === day) {
                return date;
            }
        }
        return null;
    }
    /**
     * Validate if metadata date is reasonable
     */
    isValidMetadataDate(date, propertyName) {
        const now = new Date();
        const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
        const twoYearsFromNow = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
        // Most metadata dates should be within a reasonable range
        if (date < fiveYearsAgo || date > twoYearsFromNow) {
            // Allow wider range for certain property types
            if (propertyName && this.isArchivalProperty(propertyName)) {
                // Allow much older dates for archival properties
                const tenYearsAgo = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());
                return date >= tenYearsAgo && date <= twoYearsFromNow;
            }
            return false;
        }
        return true;
    }
    /**
     * Check if property name suggests archival/historical data
     */
    isArchivalProperty(propertyName) {
        const archivalPatterns = [
            /creation/i,
            /created/i,
            /original/i,
            /archive/i,
            /historical/i,
            /legacy/i,
        ];
        return archivalPatterns.some(pattern => pattern.test(propertyName));
    }
    /**
     * Get cache statistics for debugging
     */
    getCacheStats() {
        return {
            size: this.fileDateCache.size,
            maxSize: this.MAX_CACHE_SIZE
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0ZS1pbmhlcml0YW5jZS1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGF0ZS1pbmhlcml0YW5jZS1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7OztHQVFHOztBQTRESDs7R0FFRztBQUNILE1BQU0sT0FBTyxzQkFBc0I7SUF1RWxDLFlBQ1MsR0FBUSxFQUNSLEtBQVksRUFDWixhQUE0QjtRQUY1QixRQUFHLEdBQUgsR0FBRyxDQUFLO1FBQ1IsVUFBSyxHQUFMLEtBQUssQ0FBTztRQUNaLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBekU3QixrQkFBYSxHQUFHLElBQUksR0FBRyxFQUF3QixDQUFDO1FBQ3ZDLGNBQVMsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLFlBQVk7UUFDdkMsbUJBQWMsR0FBRyxHQUFHLENBQUM7UUFFdEMsK0VBQStFO1FBQy9FLDJEQUEyRDtRQUMxQyx3QkFBbUIsR0FBRztZQUN0QyxtREFBbUQ7WUFDbkQsRUFBRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRTtZQUNuRCxrQ0FBa0M7WUFDbEMsRUFBRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRTtZQUM1RCw0QkFBNEI7WUFDNUIsRUFBRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRTtZQUM5RCxtQ0FBbUM7WUFDbkMsRUFBRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRTtZQUM1RCxzREFBc0Q7WUFDdEQsRUFBRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRTtZQUN4RCx3QkFBd0I7WUFDeEIsRUFBRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRTtZQUM1RCw4QkFBOEI7WUFDOUIsRUFBRSxPQUFPLEVBQUUsMkJBQTJC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QVEsRUFBRSxFQUFFLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBRXZGLDBEQUEwRDtRQUMxRCxJQUFJLElBQUksR0FBRyxZQUFZLElBQUksSUFBSSxHQUFHLGVBQWUsRUFBRTtZQUNsRCwrQ0FBK0M7WUFDL0MsSUFBSSxZQUFZLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxFQUFFO2dCQUMxRCxpREFBaUQ7Z0JBQ2pELE1BQU0sV0FBVyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO2dCQUNwRixPQUFPLElBQUksSUFBSSxXQUFXLElBQUksSUFBSSxJQUFJLGVBQWUsQ0FBQzthQUN0RDtZQUNELE9BQU8sS0FBSyxDQUFDO1NBQ2I7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRDs7T0FFRztJQUNLLGtCQUFrQixDQUFDLFlBQW9CO1FBQzlDLE1BQU0sZ0JBQWdCLEdBQUc7WUFDeEIsV0FBVztZQUNYLFVBQVU7WUFDVixXQUFXO1lBQ1gsVUFBVTtZQUNWLGFBQWE7WUFDYixTQUFTO1NBQ1QsQ0FBQztRQUVGLE9BQU8sZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFFRDs7T0FFRztJQUNILGFBQWE7UUFDWixPQUFPO1lBQ04sSUFBSSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSTtZQUM3QixPQUFPLEVBQUUsSUFBSSxDQUFDLGNBQWM7U0FDNUIsQ0FBQztJQUNILENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBEYXRlIEluaGVyaXRhbmNlIFNlcnZpY2UgZm9yIFRpbWUtT25seSBFeHByZXNzaW9uc1xyXG4gKiBcclxuICogVGhpcyBzZXJ2aWNlIGhhbmRsZXMgZGF0ZSByZXNvbHV0aW9uIGZvciB0aW1lLW9ubHkgZXhwcmVzc2lvbnMgKGxpa2UgXCIxMjowMO+9njEzOjAwXCIpXHJcbiAqIGJ5IGltcGxlbWVudGluZyBhIHByaW9yaXR5LWJhc2VkIGluaGVyaXRhbmNlIHN5c3RlbTpcclxuICogMS4gQ3VycmVudCBsaW5lIGRhdGUgPiBmaWxlIG1ldGFkYXRhIGRhdGUgPSBkYWlseSBub3RlIHRpdGxlIGRhdGUgPiBmaWxlIGN0aW1lXHJcbiAqIDIuIFBhcmVudCB0YXNrIGRhdGUgaW5oZXJpdGFuY2UgZm9yIGhpZXJhcmNoaWNhbCBzdHJ1Y3R1cmVzXHJcbiAqIDMuIEVmZmljaWVudCBjYWNoaW5nIHRvIGF2b2lkIGZyZXF1ZW50IGZpbGUgc3lzdGVtIGNhbGxzXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQXBwLCBURmlsZSwgVmF1bHQsIE1ldGFkYXRhQ2FjaGUgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgVGltZUNvbXBvbmVudCB9IGZyb20gXCIuLi90eXBlcy90aW1lLXBhcnNpbmdcIjtcclxuaW1wb3J0IHR5cGUgeyBUYXNrIH0gZnJvbSBcIi4uL3R5cGVzL3Rhc2tcIjtcclxuXHJcbi8qKlxyXG4gKiBDb250ZXh0IGluZm9ybWF0aW9uIGZvciBkYXRlIHJlc29sdXRpb25cclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgRGF0ZVJlc29sdXRpb25Db250ZXh0IHtcclxuXHQvKiogQ3VycmVudCBsaW5lIGJlaW5nIHBhcnNlZCAqL1xyXG5cdGN1cnJlbnRMaW5lOiBzdHJpbmc7XHJcblx0LyoqIEZpbGUgcGF0aCBvZiB0aGUgdGFzayAqL1xyXG5cdGZpbGVQYXRoOiBzdHJpbmc7XHJcblx0LyoqIFBhcmVudCB0YXNrIGluZm9ybWF0aW9uIGZvciBpbmhlcml0YW5jZSAqL1xyXG5cdHBhcmVudFRhc2s/OiBUYXNrO1xyXG5cdC8qKiBGaWxlIG1ldGFkYXRhIGNhY2hlICovXHJcblx0ZmlsZU1ldGFkYXRhQ2FjaGU/OiBNYXA8c3RyaW5nLCBGaWxlRGF0ZUluZm8+O1xyXG5cdC8qKiBMaW5lIG51bWJlciBpbiB0aGUgZmlsZSAqL1xyXG5cdGxpbmVOdW1iZXI/OiBudW1iZXI7XHJcblx0LyoqIEFsbCBsaW5lcyBpbiB0aGUgZmlsZSBmb3IgY29udGV4dCBhbmFseXNpcyAqL1xyXG5cdGFsbExpbmVzPzogc3RyaW5nW107XHJcblx0LyoqIEFsbCB0YXNrcyBpbiB0aGUgZmlsZSBmb3IgaGllcmFyY2hpY2FsIHBhcmVudCBpbmhlcml0YW5jZSAqL1xyXG5cdGFsbFRhc2tzPzogVGFza1tdO1xyXG59XHJcblxyXG4vKipcclxuICogRmlsZSBkYXRlIGluZm9ybWF0aW9uIHN0cnVjdHVyZVxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBGaWxlRGF0ZUluZm8ge1xyXG5cdC8qKiBGaWxlIGNyZWF0aW9uIHRpbWUgKi9cclxuXHRjdGltZTogRGF0ZTtcclxuXHQvKiogRGF0ZSBmcm9tIGZpbGUgbWV0YWRhdGEvZnJvbnRtYXR0ZXIgKi9cclxuXHRtZXRhZGF0YURhdGU/OiBEYXRlO1xyXG5cdC8qKiBEYXRlIGV4dHJhY3RlZCBmcm9tIGRhaWx5IG5vdGUgdGl0bGUvcGF0aCAqL1xyXG5cdGRhaWx5Tm90ZURhdGU/OiBEYXRlO1xyXG5cdC8qKiBXaGV0aGVyIHRoaXMgZmlsZSBpcyBpZGVudGlmaWVkIGFzIGEgZGFpbHkgbm90ZSAqL1xyXG5cdGlzRGFpbHlOb3RlOiBib29sZWFuO1xyXG5cdC8qKiBDYWNoZSB0aW1lc3RhbXAgKi9cclxuXHRjYWNoZWRBdDogRGF0ZTtcclxuXHQvKiogRmlsZSBtb2RpZmljYXRpb24gdGltZSBmb3IgY2FjaGUgdmFsaWRhdGlvbiAqL1xyXG5cdG10aW1lOiBudW1iZXI7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEYXRlIHByaW9yaXR5IHJlc29sdXRpb24gcmVzdWx0XHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIERhdGVSZXNvbHV0aW9uUmVzdWx0IHtcclxuXHQvKiogUmVzb2x2ZWQgZGF0ZSAqL1xyXG5cdHJlc29sdmVkRGF0ZTogRGF0ZTtcclxuXHQvKiogU291cmNlIG9mIHRoZSBkYXRlICovXHJcblx0c291cmNlOiBcImxpbmUtZGF0ZVwiIHwgXCJtZXRhZGF0YS1kYXRlXCIgfCBcImRhaWx5LW5vdGUtZGF0ZVwiIHwgXCJmaWxlLWN0aW1lXCIgfCBcInBhcmVudC10YXNrXCI7XHJcblx0LyoqIENvbmZpZGVuY2UgbGV2ZWwgb2YgdGhlIHJlc29sdXRpb24gKi9cclxuXHRjb25maWRlbmNlOiBcImhpZ2hcIiB8IFwibWVkaXVtXCIgfCBcImxvd1wiO1xyXG5cdC8qKiBXaGV0aGVyIGZhbGxiYWNrIHdhcyB1c2VkICovXHJcblx0dXNlZEZhbGxiYWNrOiBib29sZWFuO1xyXG5cdC8qKiBBZGRpdGlvbmFsIGNvbnRleHQgYWJvdXQgdGhlIHJlc29sdXRpb24gKi9cclxuXHRjb250ZXh0Pzogc3RyaW5nO1xyXG59XHJcblxyXG4vKipcclxuICogU2VydmljZSBmb3IgaGFuZGxpbmcgZGF0ZSBpbmhlcml0YW5jZSBmb3IgdGltZS1vbmx5IGV4cHJlc3Npb25zXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgRGF0ZUluaGVyaXRhbmNlU2VydmljZSB7XHJcblx0cHJpdmF0ZSBmaWxlRGF0ZUNhY2hlID0gbmV3IE1hcDxzdHJpbmcsIEZpbGVEYXRlSW5mbz4oKTtcclxuXHRwcml2YXRlIHJlYWRvbmx5IENBQ0hFX1RUTCA9IDUgKiA2MCAqIDEwMDA7IC8vIDUgbWludXRlc1xyXG5cdHByaXZhdGUgcmVhZG9ubHkgTUFYX0NBQ0hFX1NJWkUgPSA1MDA7XHJcblxyXG5cdC8vIERhaWx5IG5vdGUgcGF0dGVybnMgZm9yIGRpZmZlcmVudCBkYXRlIGZvcm1hdHMgYW5kIGNvbW1vbiBuYW1pbmcgY29udmVudGlvbnNcclxuXHQvLyBPcmRlciBtYXR0ZXJzIC0gbW9yZSBzcGVjaWZpYyBwYXR0ZXJucyBzaG91bGQgY29tZSBmaXJzdFxyXG5cdHByaXZhdGUgcmVhZG9ubHkgREFJTFlfTk9URV9QQVRURVJOUyA9IFtcclxuXHRcdC8vIFdlZWsgZm9ybWF0OiBZWVlZLVcjIyAobXVzdCBjb21lIGJlZm9yZSBZWVlZLU1NKVxyXG5cdFx0eyBwYXR0ZXJuOiAvKFxcZHs0fSktVyhcXGR7Mn0pLywgZm9ybWF0OiBcIllZWVktVyMjXCIgfSxcclxuXHRcdC8vIFN0YW5kYXJkIElTTyBmb3JtYXQ6IFlZWVktTU0tRERcclxuXHRcdHsgcGF0dGVybjogLyhcXGR7NH0pLShcXGR7Mn0pLShcXGR7Mn0pLywgZm9ybWF0OiBcIllZWVktTU0tRERcIiB9LFxyXG5cdFx0Ly8gRG90IHNlcGFyYXRlZDogWVlZWS5NTS5ERFxyXG5cdFx0eyBwYXR0ZXJuOiAvKFxcZHs0fSlcXC4oXFxkezJ9KVxcLihcXGR7Mn0pLywgZm9ybWF0OiBcIllZWVkuTU0uRERcIiB9LFxyXG5cdFx0Ly8gVW5kZXJzY29yZSBzZXBhcmF0ZWQ6IFlZWVlfTU1fRERcclxuXHRcdHsgcGF0dGVybjogLyhcXGR7NH0pXyhcXGR7Mn0pXyhcXGR7Mn0pLywgZm9ybWF0OiBcIllZWVlfTU1fRERcIiB9LFxyXG5cdFx0Ly8gQ29tcGFjdCBmb3JtYXQ6IFlZWVlNTUREIChiZSBjYXJlZnVsIHdpdGggdGhpcyBvbmUpXHJcblx0XHR7IHBhdHRlcm46IC8oXFxkezR9KShcXGR7Mn0pKFxcZHsyfSkvLCBmb3JtYXQ6IFwiWVlZWU1NRERcIiB9LFxyXG5cdFx0Ly8gVVMgZm9ybWF0OiBNTS1ERC1ZWVlZXHJcblx0XHR7IHBhdHRlcm46IC8oXFxkezJ9KS0oXFxkezJ9KS0oXFxkezR9KS8sIGZvcm1hdDogXCJNTS1ERC1ZWVlZXCIgfSxcclxuXHRcdC8vIEV1cm9wZWFuIGZvcm1hdDogREQuTU0uWVlZWVxyXG5cdFx0eyBwYXR0ZXJuOiAvKFxcZHsyfSlcXC4oXFxkezJ9KVxcLihcXGR7NH0pLywgZm9ybWF0OiBcIkRELk1NLllZWVlcIiB9LFxyXG5cdFx0Ly8gQWx0ZXJuYXRpdmUgVVMgZm9ybWF0OiBNTS9ERC9ZWVlZXHJcblx0XHR7IHBhdHRlcm46IC8oXFxkezJ9KVxcLyhcXGR7Mn0pXFwvKFxcZHs0fSkvLCBmb3JtYXQ6IFwiTU0vREQvWVlZWVwiIH0sXHJcblx0XHQvLyBBbHRlcm5hdGl2ZSBFdXJvcGVhbiBmb3JtYXQ6IEREL01NL1lZWVkgKGFtYmlndW91cyB3aXRoIFVTLCB3aWxsIHVzZSBjb250ZXh0KVxyXG5cdFx0eyBwYXR0ZXJuOiAvKFxcZHsyfSlcXC8oXFxkezJ9KVxcLyhcXGR7NH0pLywgZm9ybWF0OiBcIkREL01NL1lZWVlcIiB9LFxyXG5cdFx0Ly8gWWVhci1tb250aCBmb3JtYXQ6IFlZWVktTU0gKGZvciBtb250aGx5IG5vdGVzKSAtIG11c3QgY29tZSBhZnRlciBZWVlZLU1NLUREXHJcblx0XHQvLyBVc2UgbmVnYXRpdmUgbG9va2FoZWFkIHRvIGF2b2lkIG1hdGNoaW5nIFlZWVktTU0tREQgcGF0dGVybnNcclxuXHRcdHsgcGF0dGVybjogLyhcXGR7NH0pLShcXGR7Mn0pKD8hLVxcZHsyfSkvLCBmb3JtYXQ6IFwiWVlZWS1NTVwiIH0sXHJcblx0XTtcclxuXHJcblx0Ly8gQ29tbW9uIGRhaWx5IG5vdGUgZm9sZGVyIHBhdHRlcm5zXHJcblx0cHJpdmF0ZSByZWFkb25seSBEQUlMWV9OT1RFX0ZPTERFUl9QQVRURVJOUyA9IFtcclxuXHRcdC9kYWlseVxccypub3Rlcz8vaSxcclxuXHRcdC9qb3VybmFsL2ksXHJcblx0XHQvZGlhcnkvaSxcclxuXHRcdC9sb2cvaSxcclxuXHRcdC9cXGR7NH1cXC9cXGR7Mn0vLCAvLyBZZWFyL01vbnRoIHN0cnVjdHVyZVxyXG5cdFx0L1xcZHs0fS1cXGR7Mn0vLCAvLyBZZWFyLU1vbnRoIHN0cnVjdHVyZVxyXG5cdF07XHJcblxyXG5cdC8vIEZpbGUgbWV0YWRhdGEgcHJvcGVydHkgbmFtZXMgdGhhdCBjb21tb25seSBjb250YWluIGRhdGVzXHJcblx0cHJpdmF0ZSByZWFkb25seSBEQVRFX1BST1BFUlRZX05BTUVTID0gW1xyXG5cdFx0Ly8gU3RhbmRhcmQgcHJvcGVydGllc1xyXG5cdFx0J2RhdGUnLCAnY3JlYXRlZCcsICdjcmVhdGlvbi1kYXRlJywgJ2NyZWF0ZWQtZGF0ZScsICdjcmVhdGlvbl9kYXRlJyxcclxuXHRcdCdkYXknLCAnZGFpbHktbm90ZS1kYXRlJywgJ25vdGUtZGF0ZScsICdmaWxlLWRhdGUnLFxyXG5cdFx0Ly8gT2JzaWRpYW4gcHJvcGVydGllc1xyXG5cdFx0J2NyZWF0ZWQtYXQnLCAnY3JlYXRlZF9hdCcsICdjcmVhdGVkQXQnLFxyXG5cdFx0J21vZGlmaWVkJywgJ21vZGlmaWVkLWRhdGUnLCAnbW9kaWZpZWRfZGF0ZScsICd1cGRhdGVkJywgJ3VwZGF0ZWQtZGF0ZScsXHJcblx0XHQvLyBDdXN0b20gcHJvcGVydGllc1xyXG5cdFx0J3B1Ymxpc2gtZGF0ZScsICdwdWJsaXNoX2RhdGUnLCAncHVibGlzaERhdGUnLFxyXG5cdFx0J2V2ZW50LWRhdGUnLCAnZXZlbnRfZGF0ZScsICdldmVudERhdGUnLFxyXG5cdFx0J2R1ZS1kYXRlJywgJ2R1ZV9kYXRlJywgJ2R1ZURhdGUnLFxyXG5cdFx0J3N0YXJ0LWRhdGUnLCAnc3RhcnRfZGF0ZScsICdzdGFydERhdGUnLFxyXG5cdFx0Ly8gVGVtcGxhdGVyIGFuZCBvdGhlciBwbHVnaW4gcHJvcGVydGllc1xyXG5cdFx0J3RwLmRhdGUnLCAndHAuZmlsZS5jcmVhdGlvbl9kYXRlJywgJ3RwLmZpbGUubGFzdF9tb2RpZmllZF9kYXRlJyxcclxuXHRcdC8vIERhdGF2aWV3IHByb3BlcnRpZXNcclxuXHRcdCdmaWxlLmN0aW1lJywgJ2ZpbGUubXRpbWUnLCAnZmlsZS5jZGF5JywgJ2ZpbGUubWRheScsXHJcblx0XTtcclxuXHJcblx0Ly8gRGF0ZSBwYXR0ZXJucyBmb3IgbGluZS1sZXZlbCBkYXRlIGRldGVjdGlvblxyXG5cdHByaXZhdGUgcmVhZG9ubHkgTElORV9EQVRFX1BBVFRFUk5TID0gW1xyXG5cdFx0Ly8gU3RhbmRhcmQgZGF0ZSBmb3JtYXRzXHJcblx0XHQvXFxiKFxcZHs0fSktKFxcZHsyfSktKFxcZHsyfSlcXGIvLFxyXG5cdFx0L1xcYihcXGR7Mn0pXFwvKFxcZHsyfSlcXC8oXFxkezR9KVxcYi8sXHJcblx0XHQvXFxiKFxcZHsyfSktKFxcZHsyfSktKFxcZHs0fSlcXGIvLFxyXG5cdFx0Ly8gTmF0dXJhbCBsYW5ndWFnZSBkYXRlcyAoYmFzaWMgcGF0dGVybnMpXHJcblx0XHQvXFxiKHRvZGF5fHRvbW9ycm93fHllc3RlcmRheSlcXGIvaSxcclxuXHRcdC9cXGIobW9uZGF5fHR1ZXNkYXl8d2VkbmVzZGF5fHRodXJzZGF5fGZyaWRheXxzYXR1cmRheXxzdW5kYXkpXFxiL2ksXHJcblx0XTtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwcml2YXRlIGFwcDogQXBwLFxyXG5cdFx0cHJpdmF0ZSB2YXVsdDogVmF1bHQsXHJcblx0XHRwcml2YXRlIG1ldGFkYXRhQ2FjaGU6IE1ldGFkYXRhQ2FjaGVcclxuXHQpIHt9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlc29sdmUgZGF0ZSBmb3IgdGltZS1vbmx5IGV4cHJlc3Npb25zIHVzaW5nIHByaW9yaXR5IGxvZ2ljXHJcblx0ICovXHJcblx0YXN5bmMgcmVzb2x2ZURhdGVGb3JUaW1lT25seShcclxuXHRcdHRhc2s6IFRhc2ssXHJcblx0XHR0aW1lQ29tcG9uZW50OiBUaW1lQ29tcG9uZW50LFxyXG5cdFx0Y29udGV4dDogRGF0ZVJlc29sdXRpb25Db250ZXh0XHJcblx0KTogUHJvbWlzZTxEYXRlUmVzb2x1dGlvblJlc3VsdD4ge1xyXG5cdFx0Ly8gUHJpb3JpdHkgMTogQ3VycmVudCBsaW5lIGRhdGVcclxuXHRcdGNvbnN0IGxpbmVEYXRlID0gdGhpcy5leHRyYWN0RGF0ZUZyb21MaW5lKGNvbnRleHQuY3VycmVudExpbmUsIGNvbnRleHQubGluZU51bWJlciwgY29udGV4dC5hbGxMaW5lcyk7XHJcblx0XHRpZiAobGluZURhdGUpIHtcclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRyZXNvbHZlZERhdGU6IGxpbmVEYXRlLFxyXG5cdFx0XHRcdHNvdXJjZTogXCJsaW5lLWRhdGVcIixcclxuXHRcdFx0XHRjb25maWRlbmNlOiBcImhpZ2hcIixcclxuXHRcdFx0XHR1c2VkRmFsbGJhY2s6IGZhbHNlLFxyXG5cdFx0XHRcdGNvbnRleHQ6IFwiRm91bmQgZXhwbGljaXQgZGF0ZSBpbiBjdXJyZW50IGxpbmVcIlxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFByaW9yaXR5IDI6IFBhcmVudCB0YXNrIGRhdGUgaW5oZXJpdGFuY2UgKHdpdGggaGllcmFyY2hpY2FsIHN1cHBvcnQpXHJcblx0XHRpZiAoY29udGV4dC5wYXJlbnRUYXNrKSB7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Y29uc3QgaGllcmFyY2hpY2FsUmVzdWx0ID0gYXdhaXQgdGhpcy5leHRyYWN0RGF0ZUZyb21QYXJlbnRIaWVyYXJjaHkoXHJcblx0XHRcdFx0XHRjb250ZXh0LnBhcmVudFRhc2ssXHJcblx0XHRcdFx0XHRjb250ZXh0XHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRpZiAoaGllcmFyY2hpY2FsUmVzdWx0KSB7XHJcblx0XHRcdFx0XHRjb25zdCBjb25maWRlbmNlID0gaGllcmFyY2hpY2FsUmVzdWx0LmRlcHRoID09PSAwID8gXCJoaWdoXCIgOiBcclxuXHRcdFx0XHRcdFx0XHRcdFx0IGhpZXJhcmNoaWNhbFJlc3VsdC5kZXB0aCA9PT0gMSA/IFwibWVkaXVtXCIgOiBcImxvd1wiO1xyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0XHRyZXNvbHZlZERhdGU6IGhpZXJhcmNoaWNhbFJlc3VsdC5kYXRlLFxyXG5cdFx0XHRcdFx0XHRzb3VyY2U6IFwicGFyZW50LXRhc2tcIixcclxuXHRcdFx0XHRcdFx0Y29uZmlkZW5jZSxcclxuXHRcdFx0XHRcdFx0dXNlZEZhbGxiYWNrOiBmYWxzZSxcclxuXHRcdFx0XHRcdFx0Y29udGV4dDogYEluaGVyaXRlZCBmcm9tICR7aGllcmFyY2hpY2FsUmVzdWx0LnNvdXJjZX0gKGRlcHRoOiAke2hpZXJhcmNoaWNhbFJlc3VsdC5kZXB0aH0pYFxyXG5cdFx0XHRcdFx0fTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Y29uc29sZS53YXJuKCdbRGF0ZUluaGVyaXRhbmNlU2VydmljZV0gRXJyb3IgaW4gaGllcmFyY2hpY2FsIHBhcmVudCBkYXRlIGV4dHJhY3Rpb246JywgZXJyb3IpO1xyXG5cdFx0XHRcdC8vIEZhbGwgYmFjayB0byBzaW1wbGUgcGFyZW50IGV4dHJhY3Rpb25cclxuXHRcdFx0XHRjb25zdCBwYXJlbnREYXRlID0gdGhpcy5leHRyYWN0RGF0ZUZyb21QYXJlbnRUYXNrKGNvbnRleHQucGFyZW50VGFzayk7XHJcblx0XHRcdFx0aWYgKHBhcmVudERhdGUpIHtcclxuXHRcdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRcdHJlc29sdmVkRGF0ZTogcGFyZW50RGF0ZSxcclxuXHRcdFx0XHRcdFx0c291cmNlOiBcInBhcmVudC10YXNrXCIsXHJcblx0XHRcdFx0XHRcdGNvbmZpZGVuY2U6IFwiaGlnaFwiLFxyXG5cdFx0XHRcdFx0XHR1c2VkRmFsbGJhY2s6IGZhbHNlLFxyXG5cdFx0XHRcdFx0XHRjb250ZXh0OiBcIkluaGVyaXRlZCBmcm9tIHBhcmVudCB0YXNrIChmYWxsYmFjaylcIlxyXG5cdFx0XHRcdFx0fTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBQcmlvcml0eSAzOiBGaWxlIG1ldGFkYXRhIGRhdGUgPSBkYWlseSBub3RlIHRpdGxlIGRhdGUgKGVxdWFsIHByaW9yaXR5KVxyXG5cdFx0Y29uc3QgZmlsZURhdGVJbmZvID0gYXdhaXQgdGhpcy5nZXRGaWxlRGF0ZUluZm8oY29udGV4dC5maWxlUGF0aCk7XHJcblx0XHRcclxuXHRcdC8vIENoZWNrIGRhaWx5IG5vdGUgZGF0ZSBmaXJzdCAoc2xpZ2h0bHkgaGlnaGVyIGNvbmZpZGVuY2UgZm9yIGV4cGxpY2l0IGRhaWx5IG5vdGVzKVxyXG5cdFx0aWYgKGZpbGVEYXRlSW5mby5kYWlseU5vdGVEYXRlICYmIGZpbGVEYXRlSW5mby5pc0RhaWx5Tm90ZSkge1xyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdHJlc29sdmVkRGF0ZTogZmlsZURhdGVJbmZvLmRhaWx5Tm90ZURhdGUsXHJcblx0XHRcdFx0c291cmNlOiBcImRhaWx5LW5vdGUtZGF0ZVwiLFxyXG5cdFx0XHRcdGNvbmZpZGVuY2U6IFwiaGlnaFwiLFxyXG5cdFx0XHRcdHVzZWRGYWxsYmFjazogZmFsc2UsXHJcblx0XHRcdFx0Y29udGV4dDogXCJFeHRyYWN0ZWQgZnJvbSBkYWlseSBub3RlIHRpdGxlL3BhdGhcIlxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENoZWNrIGZpbGUgbWV0YWRhdGEgZGF0ZVxyXG5cdFx0aWYgKGZpbGVEYXRlSW5mby5tZXRhZGF0YURhdGUpIHtcclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRyZXNvbHZlZERhdGU6IGZpbGVEYXRlSW5mby5tZXRhZGF0YURhdGUsXHJcblx0XHRcdFx0c291cmNlOiBcIm1ldGFkYXRhLWRhdGVcIixcclxuXHRcdFx0XHRjb25maWRlbmNlOiBcIm1lZGl1bVwiLFxyXG5cdFx0XHRcdHVzZWRGYWxsYmFjazogZmFsc2UsXHJcblx0XHRcdFx0Y29udGV4dDogXCJGb3VuZCBpbiBmaWxlIGZyb250bWF0dGVyL3Byb3BlcnRpZXNcIlxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENoZWNrIGRhaWx5IG5vdGUgZGF0ZSBmb3Igbm9uLWRhaWx5IG5vdGUgZmlsZXNcclxuXHRcdGlmIChmaWxlRGF0ZUluZm8uZGFpbHlOb3RlRGF0ZSkge1xyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdHJlc29sdmVkRGF0ZTogZmlsZURhdGVJbmZvLmRhaWx5Tm90ZURhdGUsXHJcblx0XHRcdFx0c291cmNlOiBcImRhaWx5LW5vdGUtZGF0ZVwiLFxyXG5cdFx0XHRcdGNvbmZpZGVuY2U6IFwibWVkaXVtXCIsXHJcblx0XHRcdFx0dXNlZEZhbGxiYWNrOiBmYWxzZSxcclxuXHRcdFx0XHRjb250ZXh0OiBcIkV4dHJhY3RlZCBmcm9tIGZpbGUgcGF0aCBkYXRlIHBhdHRlcm5cIlxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFByaW9yaXR5IDQ6IEZpbGUgY3JlYXRpb24gdGltZSAoZmFsbGJhY2spXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRyZXNvbHZlZERhdGU6IGZpbGVEYXRlSW5mby5jdGltZSxcclxuXHRcdFx0c291cmNlOiBcImZpbGUtY3RpbWVcIixcclxuXHRcdFx0Y29uZmlkZW5jZTogXCJsb3dcIixcclxuXHRcdFx0dXNlZEZhbGxiYWNrOiB0cnVlLFxyXG5cdFx0XHRjb250ZXh0OiBcIlVzaW5nIGZpbGUgY3JlYXRpb24gdGltZSBhcyBmYWxsYmFja1wiXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGZpbGUtYmFzZWQgZGF0ZSBpbmZvcm1hdGlvbiB3aXRoIGNhY2hpbmdcclxuXHQgKi9cclxuXHRhc3luYyBnZXRGaWxlRGF0ZUluZm8oZmlsZVBhdGg6IHN0cmluZyk6IFByb21pc2U8RmlsZURhdGVJbmZvPiB7XHJcblx0XHQvLyBDaGVjayBjYWNoZSBmaXJzdFxyXG5cdFx0Y29uc3QgY2FjaGVkID0gdGhpcy5maWxlRGF0ZUNhY2hlLmdldChmaWxlUGF0aCk7XHJcblx0XHRpZiAoY2FjaGVkICYmIHRoaXMuaXNDYWNoZVZhbGlkKGNhY2hlZCkpIHtcclxuXHRcdFx0cmV0dXJuIGNhY2hlZDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBHZXQgZmlsZSBzdGF0c1xyXG5cdFx0Y29uc3QgZmlsZSA9IHRoaXMudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGZpbGVQYXRoKSBhcyBURmlsZTtcclxuXHRcdGlmICghZmlsZSkge1xyXG5cdFx0XHQvLyBSZXR1cm4gZGVmYXVsdCBpbmZvIGZvciBub24tZXhpc3RlbnQgZmlsZXNcclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRjdGltZTogbmV3IERhdGUoKSxcclxuXHRcdFx0XHRkYWlseU5vdGVEYXRlOiB1bmRlZmluZWQsXHJcblx0XHRcdFx0bWV0YWRhdGFEYXRlOiB1bmRlZmluZWQsXHJcblx0XHRcdFx0aXNEYWlseU5vdGU6IGZhbHNlLFxyXG5cdFx0XHRcdGNhY2hlZEF0OiBuZXcgRGF0ZSgpLFxyXG5cdFx0XHRcdG10aW1lOiAwXHJcblx0XHRcdH07XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgZmlsZVN0YXQgPSBhd2FpdCB0aGlzLnZhdWx0LmFkYXB0ZXIuc3RhdChmaWxlUGF0aCk7XHJcblx0XHRjb25zdCBjdGltZSA9IG5ldyBEYXRlKGZpbGVTdGF0Py5jdGltZSB8fCBEYXRlLm5vdygpKTtcclxuXHRcdGNvbnN0IG10aW1lID0gZmlsZVN0YXQ/Lm10aW1lIHx8IDA7XHJcblxyXG5cdFx0Ly8gRXh0cmFjdCBkYWlseSBub3RlIGRhdGUgZnJvbSBmaWxlIHBhdGgvdGl0bGVcclxuXHRcdGNvbnN0IGRhaWx5Tm90ZURhdGVSZXN1bHQgPSB0aGlzLmV4dHJhY3REYWlseU5vdGVEYXRlKGZpbGVQYXRoKTtcclxuXHRcdGNvbnN0IGRhaWx5Tm90ZURhdGUgPSBkYWlseU5vdGVEYXRlUmVzdWx0ID8/IHVuZGVmaW5lZDtcclxuXHRcdGNvbnN0IGlzRGFpbHlOb3RlID0gZGFpbHlOb3RlRGF0ZVJlc3VsdCAhPT0gbnVsbDtcclxuXHJcblx0XHQvLyBFeHRyYWN0IG1ldGFkYXRhIGRhdGUgZnJvbSBmcm9udG1hdHRlclxyXG5cdFx0Y29uc3QgbWV0YWRhdGFEYXRlUmVzdWx0ID0gYXdhaXQgdGhpcy5leHRyYWN0TWV0YWRhdGFEYXRlKGZpbGUpO1xyXG5cdFx0Y29uc3QgbWV0YWRhdGFEYXRlID0gbWV0YWRhdGFEYXRlUmVzdWx0ID8/IHVuZGVmaW5lZDtcclxuXHJcblx0XHRjb25zdCBmaWxlRGF0ZUluZm86IEZpbGVEYXRlSW5mbyA9IHtcclxuXHRcdFx0Y3RpbWUsXHJcblx0XHRcdG1ldGFkYXRhRGF0ZSxcclxuXHRcdFx0ZGFpbHlOb3RlRGF0ZSxcclxuXHRcdFx0aXNEYWlseU5vdGUsXHJcblx0XHRcdGNhY2hlZEF0OiBuZXcgRGF0ZSgpLFxyXG5cdFx0XHRtdGltZVxyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBDYWNoZSB0aGUgcmVzdWx0XHJcblx0XHR0aGlzLmNhY2hlRmlsZURhdGVJbmZvKGZpbGVQYXRoLCBmaWxlRGF0ZUluZm8pO1xyXG5cclxuXHRcdHJldHVybiBmaWxlRGF0ZUluZm87XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFeHRyYWN0IGRhaWx5IG5vdGUgZGF0ZSBmcm9tIGZpbGUgcGF0aC90aXRsZSB3aXRoIGVuaGFuY2VkIHBhdHRlcm4gbWF0Y2hpbmdcclxuXHQgKi9cclxuXHRwdWJsaWMgZXh0cmFjdERhaWx5Tm90ZURhdGUoZmlsZVBhdGg6IHN0cmluZyk6IERhdGUgfCBudWxsIHtcclxuXHRcdGNvbnN0IGZpbGVOYW1lID0gZmlsZVBhdGguc3BsaXQoJy8nKS5wb3AoKT8ucmVwbGFjZSgvXFwubWQkLywgJycpIHx8ICcnO1xyXG5cdFx0Y29uc3QgZnVsbFBhdGggPSBmaWxlUGF0aDtcclxuXHRcdGNvbnN0IGZvbGRlclBhdGggPSBmaWxlUGF0aC5zdWJzdHJpbmcoMCwgZmlsZVBhdGgubGFzdEluZGV4T2YoJy8nKSk7XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgdGhpcyBsb29rcyBsaWtlIGEgZGFpbHkgbm90ZSBiYXNlZCBvbiBmb2xkZXIgc3RydWN0dXJlXHJcblx0XHRjb25zdCBpc0RhaWx5Tm90ZUZvbGRlciA9IHRoaXMuaXNEYWlseU5vdGVGb2xkZXIoZm9sZGVyUGF0aCk7XHJcblxyXG5cdFx0Ly8gVHJ5IGVhY2ggcGF0dGVybiBvbiBmaWxlbmFtZSBmaXJzdCwgdGhlbiBmdWxsIHBhdGhcclxuXHRcdGZvciAoY29uc3QgeyBwYXR0ZXJuLCBmb3JtYXQgfSBvZiB0aGlzLkRBSUxZX05PVEVfUEFUVEVSTlMpIHtcclxuXHRcdFx0Ly8gVHJ5IGZpbGVuYW1lIGZpcnN0XHJcblx0XHRcdGxldCBtYXRjaCA9IGZpbGVOYW1lLm1hdGNoKHBhdHRlcm4pO1xyXG5cdFx0XHRsZXQgbWF0Y2hTb3VyY2UgPSAnZmlsZW5hbWUnO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKCFtYXRjaCkge1xyXG5cdFx0XHRcdC8vIFRyeSBmdWxsIHBhdGhcclxuXHRcdFx0XHRtYXRjaCA9IGZ1bGxQYXRoLm1hdGNoKHBhdHRlcm4pO1xyXG5cdFx0XHRcdG1hdGNoU291cmNlID0gJ2Z1bGxwYXRoJztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKG1hdGNoKSB7XHJcblx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdGNvbnN0IGRhdGUgPSB0aGlzLnBhcnNlRGF0ZUZyb21QYXR0ZXJuTWF0Y2gobWF0Y2gsIGZvcm1hdCwgaXNEYWlseU5vdGVGb2xkZXIpO1xyXG5cdFx0XHRcdFx0aWYgKGRhdGUpIHtcclxuXHRcdFx0XHRcdFx0Ly8gQWRkaXRpb25hbCB2YWxpZGF0aW9uIGZvciBkYWlseSBub3Rlc1xyXG5cdFx0XHRcdFx0XHRpZiAodGhpcy5pc1ZhbGlkRGFpbHlOb3RlRGF0ZShkYXRlLCBmaWxlUGF0aCwgbWF0Y2hTb3VyY2UpKSB7XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGRhdGU7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdFx0Ly8gQ29udGludWUgdG8gbmV4dCBwYXR0ZXJuIGlmIHBhcnNpbmcgZmFpbHNcclxuXHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBudWxsO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgZm9sZGVyIHBhdGggaW5kaWNhdGVzIHRoaXMgaXMgbGlrZWx5IGEgZGFpbHkgbm90ZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgaXNEYWlseU5vdGVGb2xkZXIoZm9sZGVyUGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0XHRpZiAoIWZvbGRlclBhdGgpIHJldHVybiBmYWxzZTtcclxuXHJcblx0XHRjb25zdCBsb3dlclBhdGggPSBmb2xkZXJQYXRoLnRvTG93ZXJDYXNlKCk7XHJcblx0XHRyZXR1cm4gdGhpcy5EQUlMWV9OT1RFX0ZPTERFUl9QQVRURVJOUy5zb21lKHBhdHRlcm4gPT4gcGF0dGVybi50ZXN0KGxvd2VyUGF0aCkpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUGFyc2UgZGF0ZSBmcm9tIHBhdHRlcm4gbWF0Y2ggYmFzZWQgb24gZm9ybWF0XHJcblx0ICovXHJcblx0cHJpdmF0ZSBwYXJzZURhdGVGcm9tUGF0dGVybk1hdGNoKG1hdGNoOiBSZWdFeHBNYXRjaEFycmF5LCBmb3JtYXQ6IHN0cmluZywgaXNEYWlseU5vdGVGb2xkZXI6IGJvb2xlYW4pOiBEYXRlIHwgbnVsbCB7XHJcblx0XHRsZXQgeWVhcjogbnVtYmVyLCBtb250aDogbnVtYmVyLCBkYXk6IG51bWJlcjtcclxuXHJcblx0XHRzd2l0Y2ggKGZvcm1hdCkge1xyXG5cdFx0XHRjYXNlIFwiWVlZWS1NTS1ERFwiOlxyXG5cdFx0XHRjYXNlIFwiWVlZWS5NTS5ERFwiOlxyXG5cdFx0XHRjYXNlIFwiWVlZWV9NTV9ERFwiOlxyXG5cdFx0XHRcdHllYXIgPSBwYXJzZUludChtYXRjaFsxXSwgMTApO1xyXG5cdFx0XHRcdG1vbnRoID0gcGFyc2VJbnQobWF0Y2hbMl0sIDEwKTtcclxuXHRcdFx0XHRkYXkgPSBwYXJzZUludChtYXRjaFszXSwgMTApO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0Y2FzZSBcIllZWVlNTUREXCI6XHJcblx0XHRcdFx0eWVhciA9IHBhcnNlSW50KG1hdGNoWzFdLCAxMCk7XHJcblx0XHRcdFx0bW9udGggPSBwYXJzZUludChtYXRjaFsyXSwgMTApO1xyXG5cdFx0XHRcdGRheSA9IHBhcnNlSW50KG1hdGNoWzNdLCAxMCk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRjYXNlIFwiTU0tREQtWVlZWVwiOlxyXG5cdFx0XHRjYXNlIFwiTU0vREQvWVlZWVwiOlxyXG5cdFx0XHRcdG1vbnRoID0gcGFyc2VJbnQobWF0Y2hbMV0sIDEwKTtcclxuXHRcdFx0XHRkYXkgPSBwYXJzZUludChtYXRjaFsyXSwgMTApO1xyXG5cdFx0XHRcdHllYXIgPSBwYXJzZUludChtYXRjaFszXSwgMTApO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0Y2FzZSBcIkRELk1NLllZWVlcIjpcclxuXHRcdFx0Y2FzZSBcIkREL01NL1lZWVlcIjpcclxuXHRcdFx0XHRkYXkgPSBwYXJzZUludChtYXRjaFsxXSwgMTApO1xyXG5cdFx0XHRcdG1vbnRoID0gcGFyc2VJbnQobWF0Y2hbMl0sIDEwKTtcclxuXHRcdFx0XHR5ZWFyID0gcGFyc2VJbnQobWF0Y2hbM10sIDEwKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdGNhc2UgXCJZWVlZLU1NXCI6XHJcblx0XHRcdFx0Ly8gTW9udGhseSBub3RlIC0gdXNlIGZpcnN0IGRheSBvZiBtb250aFxyXG5cdFx0XHRcdHllYXIgPSBwYXJzZUludChtYXRjaFsxXSwgMTApO1xyXG5cdFx0XHRcdG1vbnRoID0gcGFyc2VJbnQobWF0Y2hbMl0sIDEwKTtcclxuXHRcdFx0XHRkYXkgPSAxO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0Y2FzZSBcIllZWVktVyMjXCI6XHJcblx0XHRcdFx0Ly8gV2Vla2x5IG5vdGUgLSBjYWxjdWxhdGUgZGF0ZSBmcm9tIHdlZWsgbnVtYmVyXHJcblx0XHRcdFx0eWVhciA9IHBhcnNlSW50KG1hdGNoWzFdLCAxMCk7XHJcblx0XHRcdFx0Y29uc3Qgd2Vla051bSA9IHBhcnNlSW50KG1hdGNoWzJdLCAxMCk7XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuZ2V0RGF0ZUZyb21XZWVrTnVtYmVyKHllYXIsIHdlZWtOdW0pO1xyXG5cclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBIYW5kbGUgYW1iaWd1b3VzIEREL01NIHZzIE1NL0REIGZvcm1hdHNcclxuXHRcdGlmIChmb3JtYXQgPT09IFwiREQvTU0vWVlZWVwiIHx8IGZvcm1hdCA9PT0gXCJNTS9ERC9ZWVlZXCIpIHtcclxuXHRcdFx0Ly8gVXNlIGNvbnRleHQgY2x1ZXMgdG8gZGV0ZXJtaW5lIGZvcm1hdFxyXG5cdFx0XHRjb25zdCBwcmVmZXJFdXJvcGVhbiA9IGlzRGFpbHlOb3RlRm9sZGVyICYmIHRoaXMuZGV0ZWN0RXVyb3BlYW5EYXRlUHJlZmVyZW5jZSgpO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKGZvcm1hdCA9PT0gXCJERC9NTS9ZWVlZXCIgJiYgIXByZWZlckV1cm9wZWFuKSB7XHJcblx0XHRcdFx0Ly8gU3dpdGNoIHRvIE1NL0REIGludGVycHJldGF0aW9uXHJcblx0XHRcdFx0W21vbnRoLCBkYXldID0gW2RheSwgbW9udGhdO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVmFsaWRhdGUgZGF0ZSBjb21wb25lbnRzXHJcblx0XHRpZiAoeWVhciA+PSAxOTAwICYmIHllYXIgPD0gMjEwMCAmJiBcclxuXHRcdFx0bW9udGggPj0gMSAmJiBtb250aCA8PSAxMiAmJiBcclxuXHRcdFx0ZGF5ID49IDEgJiYgZGF5IDw9IDMxKSB7XHJcblx0XHRcdGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSh5ZWFyLCBtb250aCAtIDEsIGRheSk7IC8vIG1vbnRoIGlzIDAtaW5kZXhlZFxyXG5cdFx0XHRcclxuXHRcdFx0Ly8gVmVyaWZ5IHRoZSBkYXRlIGlzIHZhbGlkIChoYW5kbGVzIGludmFsaWQgZGF0ZXMgbGlrZSBGZWIgMzApXHJcblx0XHRcdGlmIChkYXRlLmdldEZ1bGxZZWFyKCkgPT09IHllYXIgJiYgXHJcblx0XHRcdFx0ZGF0ZS5nZXRNb250aCgpID09PSBtb250aCAtIDEgJiYgXHJcblx0XHRcdFx0ZGF0ZS5nZXREYXRlKCkgPT09IGRheSkge1xyXG5cdFx0XHRcdHJldHVybiBkYXRlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIG51bGw7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgZGF0ZSBmcm9tIElTTyB3ZWVrIG51bWJlclxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZ2V0RGF0ZUZyb21XZWVrTnVtYmVyKHllYXI6IG51bWJlciwgd2VlazogbnVtYmVyKTogRGF0ZSB8IG51bGwge1xyXG5cdFx0aWYgKHdlZWsgPCAxIHx8IHdlZWsgPiA1MykgcmV0dXJuIG51bGw7XHJcblxyXG5cdFx0Ly8gSmFudWFyeSA0dGggaXMgYWx3YXlzIGluIHdlZWsgMVxyXG5cdFx0Y29uc3QgamFuNCA9IG5ldyBEYXRlKHllYXIsIDAsIDQpO1xyXG5cdFx0Y29uc3QgamFuNERheSA9IGphbjQuZ2V0RGF5KCkgfHwgNzsgLy8gU3VuZGF5ID0gNywgTW9uZGF5ID0gMVxyXG5cdFx0XHJcblx0XHQvLyBDYWxjdWxhdGUgdGhlIE1vbmRheSBvZiB3ZWVrIDFcclxuXHRcdGNvbnN0IHdlZWsxTW9uZGF5ID0gbmV3IERhdGUoamFuNCk7XHJcblx0XHR3ZWVrMU1vbmRheS5zZXREYXRlKGphbjQuZ2V0RGF0ZSgpIC0gamFuNERheSArIDEpO1xyXG5cdFx0XHJcblx0XHQvLyBDYWxjdWxhdGUgdGhlIHRhcmdldCB3ZWVrJ3MgTW9uZGF5XHJcblx0XHRjb25zdCB0YXJnZXREYXRlID0gbmV3IERhdGUod2VlazFNb25kYXkpO1xyXG5cdFx0dGFyZ2V0RGF0ZS5zZXREYXRlKHdlZWsxTW9uZGF5LmdldERhdGUoKSArICh3ZWVrIC0gMSkgKiA3KTtcclxuXHRcdFxyXG5cdFx0cmV0dXJuIHRhcmdldERhdGU7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBEZXRlY3QgaWYgRXVyb3BlYW4gZGF0ZSBmb3JtYXQgKEREL01NKSBpcyBwcmVmZXJyZWQgYmFzZWQgb24gY29udGV4dFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZGV0ZWN0RXVyb3BlYW5EYXRlUHJlZmVyZW5jZSgpOiBib29sZWFuIHtcclxuXHRcdC8vIFRoaXMgY291bGQgYmUgZW5oYW5jZWQgd2l0aCB1c2VyIHNldHRpbmdzIG9yIGxvY2FsZSBkZXRlY3Rpb25cclxuXHRcdC8vIEZvciBub3csIHJldHVybiBmYWxzZSAocHJlZmVyIFVTIGZvcm1hdCBNTS9ERClcclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFZhbGlkYXRlIGlmIHRoZSBleHRyYWN0ZWQgZGF0ZSBtYWtlcyBzZW5zZSBmb3IgYSBkYWlseSBub3RlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBpc1ZhbGlkRGFpbHlOb3RlRGF0ZShkYXRlOiBEYXRlLCBmaWxlUGF0aDogc3RyaW5nLCBtYXRjaFNvdXJjZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0XHQvLyBBbGxvdyBhIHZlcnkgd2lkZSByYW5nZSBmb3IgZGFpbHkgbm90ZXMgdG8gYWNjb21tb2RhdGUgdmFyaW91cyB1c2UgY2FzZXNcclxuXHRcdC8vIGluY2x1ZGluZyBoaXN0b3JpY2FsIHJlc2VhcmNoLCBhcmNoaXZhbCBub3RlcywgYW5kIGZ1dHVyZSBwbGFubmluZ1xyXG5cdFx0Y29uc3QgbWluRGF0ZSA9IG5ldyBEYXRlKDE5MDAsIDAsIDEpO1xyXG5cdFx0Y29uc3QgbWF4RGF0ZSA9IG5ldyBEYXRlKDIxMDAsIDExLCAzMSk7XHJcblx0XHRcclxuXHRcdC8vIEJhc2ljIHNhbml0eSBjaGVjayAtIGRhdGUgc2hvdWxkIGJlIHdpdGhpbiByZWFzb25hYmxlIGJvdW5kc1xyXG5cdFx0aWYgKGRhdGUgPCBtaW5EYXRlIHx8IGRhdGUgPiBtYXhEYXRlKSB7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGRpdGlvbmFsIHZhbGlkYXRpb24gY291bGQgYmUgYWRkZWQgaGVyZSBiYXNlZCBvbiBzcGVjaWZpYyByZXF1aXJlbWVudHNcclxuXHRcdC8vIEZvciBub3csIHdlJ2xsIGJlIHBlcm1pc3NpdmUgdG8gc3VwcG9ydCB2YXJpb3VzIHVzZSBjYXNlc1xyXG5cdFx0cmV0dXJuIHRydWU7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFeHRyYWN0IG1ldGFkYXRhIGRhdGUgZnJvbSBmaWxlIGZyb250bWF0dGVyL3Byb3BlcnRpZXMgd2l0aCBjb21wcmVoZW5zaXZlIHByb3BlcnR5IHN1cHBvcnRcclxuXHQgKi9cclxuXHRwcml2YXRlIGFzeW5jIGV4dHJhY3RNZXRhZGF0YURhdGUoZmlsZTogVEZpbGUpOiBQcm9taXNlPERhdGUgfCBudWxsPiB7XHJcblx0XHRjb25zdCBmaWxlQ2FjaGUgPSB0aGlzLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpO1xyXG5cdFx0Y29uc3QgZnJvbnRtYXR0ZXIgPSBmaWxlQ2FjaGU/LmZyb250bWF0dGVyO1xyXG5cclxuXHRcdGlmICghZnJvbnRtYXR0ZXIpIHtcclxuXHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVHJ5IGVhY2ggZGF0ZSBwcm9wZXJ0eSBpbiBvcmRlciBvZiBwcmVmZXJlbmNlXHJcblx0XHRmb3IgKGNvbnN0IHByb3Agb2YgdGhpcy5EQVRFX1BST1BFUlRZX05BTUVTKSB7XHJcblx0XHRcdGNvbnN0IHZhbHVlID0gZnJvbnRtYXR0ZXJbcHJvcF07XHJcblx0XHRcdGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsKSB7XHJcblx0XHRcdFx0Y29uc3QgZGF0ZSA9IHRoaXMucGFyc2VNZXRhZGF0YURhdGUodmFsdWUsIHByb3ApO1xyXG5cdFx0XHRcdGlmIChkYXRlKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gZGF0ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBBbHNvIGNoZWNrIGZvciBuZXN0ZWQgcHJvcGVydGllcyAoZS5nLiwgZmlsZS5jdGltZSBpbiBEYXRhdmlldylcclxuXHRcdGNvbnN0IG5lc3RlZERhdGUgPSB0aGlzLmV4dHJhY3ROZXN0ZWRNZXRhZGF0YURhdGUoZnJvbnRtYXR0ZXIpO1xyXG5cdFx0aWYgKG5lc3RlZERhdGUpIHtcclxuXHRcdFx0cmV0dXJuIG5lc3RlZERhdGU7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIG51bGw7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFeHRyYWN0IGRhdGVzIGZyb20gbmVzdGVkIG1ldGFkYXRhIHByb3BlcnRpZXNcclxuXHQgKi9cclxuXHRwcml2YXRlIGV4dHJhY3ROZXN0ZWRNZXRhZGF0YURhdGUoZnJvbnRtYXR0ZXI6IFJlY29yZDxzdHJpbmcsIGFueT4pOiBEYXRlIHwgbnVsbCB7XHJcblx0XHQvLyBDaGVjayBmb3IgRGF0YXZpZXcgZmlsZSBwcm9wZXJ0aWVzXHJcblx0XHRpZiAoZnJvbnRtYXR0ZXIuZmlsZSkge1xyXG5cdFx0XHRjb25zdCBmaWxlUHJvcHMgPSBmcm9udG1hdHRlci5maWxlO1xyXG5cdFx0XHRjb25zdCBkYXRlUHJvcHMgPSBbJ2N0aW1lJywgJ210aW1lJywgJ2NkYXknLCAnbWRheScsICdjcmVhdGVkJywgJ21vZGlmaWVkJ107XHJcblx0XHRcdFxyXG5cdFx0XHRmb3IgKGNvbnN0IHByb3Agb2YgZGF0ZVByb3BzKSB7XHJcblx0XHRcdFx0aWYgKGZpbGVQcm9wc1twcm9wXSkge1xyXG5cdFx0XHRcdFx0Y29uc3QgZGF0ZSA9IHRoaXMucGFyc2VNZXRhZGF0YURhdGUoZmlsZVByb3BzW3Byb3BdLCBgZmlsZS4ke3Byb3B9YCk7XHJcblx0XHRcdFx0XHRpZiAoZGF0ZSkge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gZGF0ZTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBDaGVjayBmb3IgVGVtcGxhdGVyIHByb3BlcnRpZXNcclxuXHRcdGlmIChmcm9udG1hdHRlci50cCkge1xyXG5cdFx0XHRjb25zdCB0cFByb3BzID0gZnJvbnRtYXR0ZXIudHA7XHJcblx0XHRcdGlmICh0cFByb3BzLmRhdGUpIHtcclxuXHRcdFx0XHRjb25zdCBkYXRlID0gdGhpcy5wYXJzZU1ldGFkYXRhRGF0ZSh0cFByb3BzLmRhdGUsICd0cC5kYXRlJyk7XHJcblx0XHRcdFx0aWYgKGRhdGUpIHtcclxuXHRcdFx0XHRcdHJldHVybiBkYXRlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0aWYgKHRwUHJvcHMuZmlsZSkge1xyXG5cdFx0XHRcdGNvbnN0IHRwRmlsZVByb3BzID0gdHBQcm9wcy5maWxlO1xyXG5cdFx0XHRcdGNvbnN0IGRhdGVQcm9wcyA9IFsnY3JlYXRpb25fZGF0ZScsICdsYXN0X21vZGlmaWVkX2RhdGUnXTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRmb3IgKGNvbnN0IHByb3Agb2YgZGF0ZVByb3BzKSB7XHJcblx0XHRcdFx0XHRpZiAodHBGaWxlUHJvcHNbcHJvcF0pIHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgZGF0ZSA9IHRoaXMucGFyc2VNZXRhZGF0YURhdGUodHBGaWxlUHJvcHNbcHJvcF0sIGB0cC5maWxlLiR7cHJvcH1gKTtcclxuXHRcdFx0XHRcdFx0aWYgKGRhdGUpIHtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gZGF0ZTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBudWxsO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUGFyc2UgdmFyaW91cyBtZXRhZGF0YSBkYXRlIGZvcm1hdHMgd2l0aCBlbmhhbmNlZCBzdXBwb3J0XHJcblx0ICovXHJcblx0cHJpdmF0ZSBwYXJzZU1ldGFkYXRhRGF0ZSh2YWx1ZTogYW55LCBwcm9wZXJ0eU5hbWU/OiBzdHJpbmcpOiBEYXRlIHwgbnVsbCB7XHJcblx0XHRpZiAoIXZhbHVlKSByZXR1cm4gbnVsbDtcclxuXHJcblx0XHQvLyBIYW5kbGUgZGlmZmVyZW50IHZhbHVlIHR5cGVzXHJcblx0XHRpZiAodmFsdWUgaW5zdGFuY2VvZiBEYXRlKSB7XHJcblx0XHRcdHJldHVybiB2YWx1ZTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xyXG5cdFx0XHQvLyBBc3N1bWUgdGltZXN0YW1wXHJcblx0XHRcdHJldHVybiBuZXcgRGF0ZSh2YWx1ZSk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcclxuXHRcdFx0Ly8gSGFuZGxlIHNwZWNpYWwgc3RyaW5nIGZvcm1hdHMgZmlyc3RcclxuXHRcdFx0Y29uc3QgdHJpbW1lZFZhbHVlID0gdmFsdWUudHJpbSgpO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gSGFuZGxlIHJlbGF0aXZlIGRhdGVzXHJcblx0XHRcdGlmICh0aGlzLmlzUmVsYXRpdmVEYXRlU3RyaW5nKHRyaW1tZWRWYWx1ZSkpIHtcclxuXHRcdFx0XHRjb25zdCByZWxhdGl2ZURhdGUgPSB0aGlzLnBhcnNlUmVsYXRpdmVEYXRlU3RyaW5nKHRyaW1tZWRWYWx1ZSk7XHJcblx0XHRcdFx0aWYgKHJlbGF0aXZlRGF0ZSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHJlbGF0aXZlRGF0ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEhhbmRsZSBuYXR1cmFsIGxhbmd1YWdlIGRhdGVzXHJcblx0XHRcdGlmICh0aGlzLmlzTmF0dXJhbExhbmd1YWdlRGF0ZSh0cmltbWVkVmFsdWUpKSB7XHJcblx0XHRcdFx0Y29uc3QgbmF0dXJhbERhdGUgPSB0aGlzLnBhcnNlTmF0dXJhbExhbmd1YWdlRGF0ZSh0cmltbWVkVmFsdWUpO1xyXG5cdFx0XHRcdGlmIChuYXR1cmFsRGF0ZSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIG5hdHVyYWxEYXRlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVHJ5IGNvbW1vbiBkYXRlIGZvcm1hdHMgd2l0aCBlbmhhbmNlZCBwYXR0ZXJuIG1hdGNoaW5nXHJcblx0XHRcdGNvbnN0IGRhdGVQYXR0ZXJucyA9IFtcclxuXHRcdFx0XHR7IHBhdHRlcm46IC9eKFxcZHs0fSktKFxcZHsyfSktKFxcZHsyfSlUKFxcZHsyfSk6KFxcZHsyfSk6KFxcZHsyfSkvLCBmb3JtYXQ6IFwiSVNPX0RBVEVUSU1FXCIgfSxcclxuXHRcdFx0XHR7IHBhdHRlcm46IC9eKFxcZHs0fSktKFxcZHsyfSktKFxcZHsyfSlUKFxcZHsyfSk6KFxcZHsyfSkvLCBmb3JtYXQ6IFwiSVNPX0RBVEVUSU1FX1NIT1JUXCIgfSxcclxuXHRcdFx0XHR7IHBhdHRlcm46IC9eKFxcZHs0fSktKFxcZHsyfSktKFxcZHsyfSkkLywgZm9ybWF0OiBcIllZWVktTU0tRERcIiB9LFxyXG5cdFx0XHRcdHsgcGF0dGVybjogL14oXFxkezJ9KVxcLyhcXGR7Mn0pXFwvKFxcZHs0fSkkLywgZm9ybWF0OiBcIk1NL0REL1lZWVlcIiB9LFxyXG5cdFx0XHRcdHsgcGF0dGVybjogL14oXFxkezJ9KS0oXFxkezJ9KS0oXFxkezR9KSQvLCBmb3JtYXQ6IFwiREQtTU0tWVlZWVwiIH0sXHJcblx0XHRcdFx0eyBwYXR0ZXJuOiAvXihcXGR7NH0pXFwuKFxcZHsyfSlcXC4oXFxkezJ9KSQvLCBmb3JtYXQ6IFwiWVlZWS5NTS5ERFwiIH0sXHJcblx0XHRcdFx0eyBwYXR0ZXJuOiAvXihcXGR7Mn0pXFwuKFxcZHsyfSlcXC4oXFxkezR9KSQvLCBmb3JtYXQ6IFwiREQuTU0uWVlZWVwiIH0sXHJcblx0XHRcdFx0eyBwYXR0ZXJuOiAvXihcXGR7NH0pXFwvKFxcZHsyfSlcXC8oXFxkezJ9KSQvLCBmb3JtYXQ6IFwiWVlZWS9NTS9ERFwiIH0sXHJcblx0XHRcdFx0eyBwYXR0ZXJuOiAvXihcXGR7MSwyfSlcXC8oXFxkezEsMn0pXFwvKFxcZHs0fSkkLywgZm9ybWF0OiBcIk0vRC9ZWVlZXCIgfSxcclxuXHRcdFx0XHR7IHBhdHRlcm46IC9eKFxcZHs0fSkoXFxkezJ9KShcXGR7Mn0pJC8sIGZvcm1hdDogXCJZWVlZTU1ERFwiIH0sXHJcblx0XHRcdF07XHJcblxyXG5cdFx0XHRmb3IgKGNvbnN0IHsgcGF0dGVybiwgZm9ybWF0IH0gb2YgZGF0ZVBhdHRlcm5zKSB7XHJcblx0XHRcdFx0Y29uc3QgbWF0Y2ggPSB0cmltbWVkVmFsdWUubWF0Y2gocGF0dGVybik7XHJcblx0XHRcdFx0aWYgKG1hdGNoKSB7XHJcblx0XHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBkYXRlID0gdGhpcy5wYXJzZURhdGVGcm9tRm9ybWF0KG1hdGNoLCBmb3JtYXQpO1xyXG5cdFx0XHRcdFx0XHRpZiAoZGF0ZSAmJiB0aGlzLmlzVmFsaWRNZXRhZGF0YURhdGUoZGF0ZSwgcHJvcGVydHlOYW1lKSkge1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybiBkYXRlO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFRyeSBwYXJzaW5nIGFzIElTTyBkYXRlIGFzIGZhbGxiYWNrXHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Y29uc3QgaXNvRGF0ZSA9IG5ldyBEYXRlKHRyaW1tZWRWYWx1ZSk7XHJcblx0XHRcdFx0aWYgKCFpc05hTihpc29EYXRlLmdldFRpbWUoKSkgJiYgdGhpcy5pc1ZhbGlkTWV0YWRhdGFEYXRlKGlzb0RhdGUsIHByb3BlcnR5TmFtZSkpIHtcclxuXHRcdFx0XHRcdHJldHVybiBpc29EYXRlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHQvLyBDb250aW51ZSB0byBuZXh0IGF0dGVtcHRcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVHJ5IHBhcnNpbmcgd2l0aCBEYXRlLnBhcnNlIGFzIGZpbmFsIGZhbGxiYWNrXHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Y29uc3QgcGFyc2VkVGltZSA9IERhdGUucGFyc2UodHJpbW1lZFZhbHVlKTtcclxuXHRcdFx0XHRpZiAoIWlzTmFOKHBhcnNlZFRpbWUpKSB7XHJcblx0XHRcdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUocGFyc2VkVGltZSk7XHJcblx0XHRcdFx0XHRpZiAodGhpcy5pc1ZhbGlkTWV0YWRhdGFEYXRlKGRhdGUsIHByb3BlcnR5TmFtZSkpIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIGRhdGU7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdC8vIEZpbmFsIGZhbGxiYWNrIGZhaWxlZFxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIG51bGw7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFeHRyYWN0IGRhdGUgZnJvbSBjdXJyZW50IGxpbmUgY29udGV4dFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZXh0cmFjdERhdGVGcm9tTGluZShjdXJyZW50TGluZTogc3RyaW5nLCBsaW5lTnVtYmVyPzogbnVtYmVyLCBhbGxMaW5lcz86IHN0cmluZ1tdKTogRGF0ZSB8IG51bGwge1xyXG5cdFx0Ly8gRmlyc3QgY2hlY2sgdGhlIGN1cnJlbnQgbGluZSBpdHNlbGZcclxuXHRcdGZvciAoY29uc3QgcGF0dGVybiBvZiB0aGlzLkxJTkVfREFURV9QQVRURVJOUykge1xyXG5cdFx0XHRjb25zdCBtYXRjaCA9IGN1cnJlbnRMaW5lLm1hdGNoKHBhdHRlcm4pO1xyXG5cdFx0XHRpZiAobWF0Y2gpIHtcclxuXHRcdFx0XHRjb25zdCBkYXRlID0gdGhpcy5wYXJzZURhdGVGcm9tTWF0Y2gobWF0Y2gsIHBhdHRlcm4pO1xyXG5cdFx0XHRcdGlmIChkYXRlKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gZGF0ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBJZiB3ZSBoYXZlIGNvbnRleHQgb2YgYWxsIGxpbmVzLCBjaGVjayBuZWFyYnkgbGluZXMgKHdpdGhpbiAzIGxpbmVzKVxyXG5cdFx0aWYgKGFsbExpbmVzICYmIGxpbmVOdW1iZXIgIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRjb25zdCBzZWFyY2hSYW5nZSA9IDM7XHJcblx0XHRcdGNvbnN0IHN0YXJ0TGluZSA9IE1hdGgubWF4KDAsIGxpbmVOdW1iZXIgLSBzZWFyY2hSYW5nZSk7XHJcblx0XHRcdGNvbnN0IGVuZExpbmUgPSBNYXRoLm1pbihhbGxMaW5lcy5sZW5ndGggLSAxLCBsaW5lTnVtYmVyICsgc2VhcmNoUmFuZ2UpO1xyXG5cclxuXHRcdFx0Zm9yIChsZXQgaSA9IHN0YXJ0TGluZTsgaSA8PSBlbmRMaW5lOyBpKyspIHtcclxuXHRcdFx0XHRpZiAoaSA9PT0gbGluZU51bWJlcikgY29udGludWU7IC8vIEFscmVhZHkgY2hlY2tlZCBjdXJyZW50IGxpbmVcclxuXHJcblx0XHRcdFx0Y29uc3QgbGluZSA9IGFsbExpbmVzW2ldO1xyXG5cdFx0XHRcdGZvciAoY29uc3QgcGF0dGVybiBvZiB0aGlzLkxJTkVfREFURV9QQVRURVJOUykge1xyXG5cdFx0XHRcdFx0Y29uc3QgbWF0Y2ggPSBsaW5lLm1hdGNoKHBhdHRlcm4pO1xyXG5cdFx0XHRcdFx0aWYgKG1hdGNoKSB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IGRhdGUgPSB0aGlzLnBhcnNlRGF0ZUZyb21NYXRjaChtYXRjaCwgcGF0dGVybik7XHJcblx0XHRcdFx0XHRcdGlmIChkYXRlKSB7XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGRhdGU7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFBhcnNlIGRhdGUgZnJvbSByZWdleCBtYXRjaFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgcGFyc2VEYXRlRnJvbU1hdGNoKG1hdGNoOiBSZWdFeHBNYXRjaEFycmF5LCBwYXR0ZXJuOiBSZWdFeHApOiBEYXRlIHwgbnVsbCB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBtYXRjaFN0ciA9IG1hdGNoWzBdLnRvTG93ZXJDYXNlKCk7XHJcblxyXG5cdFx0XHQvLyBIYW5kbGUgbmF0dXJhbCBsYW5ndWFnZSBkYXRlc1xyXG5cdFx0XHRpZiAobWF0Y2hTdHIgPT09ICd0b2RheScpIHtcclxuXHRcdFx0XHRyZXR1cm4gbmV3IERhdGUoKTtcclxuXHRcdFx0fSBlbHNlIGlmIChtYXRjaFN0ciA9PT0gJ3RvbW9ycm93Jykge1xyXG5cdFx0XHRcdGNvbnN0IHRvbW9ycm93ID0gbmV3IERhdGUoKTtcclxuXHRcdFx0XHR0b21vcnJvdy5zZXREYXRlKHRvbW9ycm93LmdldERhdGUoKSArIDEpO1xyXG5cdFx0XHRcdHJldHVybiB0b21vcnJvdztcclxuXHRcdFx0fSBlbHNlIGlmIChtYXRjaFN0ciA9PT0gJ3llc3RlcmRheScpIHtcclxuXHRcdFx0XHRjb25zdCB5ZXN0ZXJkYXkgPSBuZXcgRGF0ZSgpO1xyXG5cdFx0XHRcdHllc3RlcmRheS5zZXREYXRlKHllc3RlcmRheS5nZXREYXRlKCkgLSAxKTtcclxuXHRcdFx0XHRyZXR1cm4geWVzdGVyZGF5O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBIYW5kbGUgd2Vla2RheXMgKGZpbmQgbmV4dCBvY2N1cnJlbmNlKVxyXG5cdFx0XHRjb25zdCB3ZWVrZGF5cyA9IFsnc3VuZGF5JywgJ21vbmRheScsICd0dWVzZGF5JywgJ3dlZG5lc2RheScsICd0aHVyc2RheScsICdmcmlkYXknLCAnc2F0dXJkYXknXTtcclxuXHRcdFx0Y29uc3Qgd2Vla2RheUluZGV4ID0gd2Vla2RheXMuaW5kZXhPZihtYXRjaFN0cik7XHJcblx0XHRcdGlmICh3ZWVrZGF5SW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0Y29uc3QgdG9kYXkgPSBuZXcgRGF0ZSgpO1xyXG5cdFx0XHRcdGNvbnN0IGN1cnJlbnREYXkgPSB0b2RheS5nZXREYXkoKTtcclxuXHRcdFx0XHRsZXQgZGF5c1RvQWRkID0gd2Vla2RheUluZGV4IC0gY3VycmVudERheTtcclxuXHRcdFx0XHRpZiAoZGF5c1RvQWRkIDw9IDApIHtcclxuXHRcdFx0XHRcdGRheXNUb0FkZCArPSA3OyAvLyBOZXh0IHdlZWtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Y29uc3QgdGFyZ2V0RGF0ZSA9IG5ldyBEYXRlKHRvZGF5KTtcclxuXHRcdFx0XHR0YXJnZXREYXRlLnNldERhdGUodG9kYXkuZ2V0RGF0ZSgpICsgZGF5c1RvQWRkKTtcclxuXHRcdFx0XHRyZXR1cm4gdGFyZ2V0RGF0ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSGFuZGxlIG51bWVyaWMgZGF0ZSBwYXR0ZXJuc1xyXG5cdFx0XHRpZiAobWF0Y2gubGVuZ3RoID49IDQpIHtcclxuXHRcdFx0XHRsZXQgeWVhcjogbnVtYmVyLCBtb250aDogbnVtYmVyLCBkYXk6IG51bWJlcjtcclxuXHJcblx0XHRcdFx0aWYgKHBhdHRlcm4uc291cmNlLmluY2x1ZGVzKCcoXFxcXGR7NH0pLShcXFxcZHsyfSktKFxcXFxkezJ9KScpKSB7XHJcblx0XHRcdFx0XHQvLyBZWVlZLU1NLUREXHJcblx0XHRcdFx0XHR5ZWFyID0gcGFyc2VJbnQobWF0Y2hbMV0sIDEwKTtcclxuXHRcdFx0XHRcdG1vbnRoID0gcGFyc2VJbnQobWF0Y2hbMl0sIDEwKTtcclxuXHRcdFx0XHRcdGRheSA9IHBhcnNlSW50KG1hdGNoWzNdLCAxMCk7XHJcblx0XHRcdFx0fSBlbHNlIGlmIChwYXR0ZXJuLnNvdXJjZS5pbmNsdWRlcygnKFxcXFxkezJ9KVxcXFwvKFxcXFxkezJ9KVxcXFwvKFxcXFxkezR9KScpKSB7XHJcblx0XHRcdFx0XHQvLyBNTS9ERC9ZWVlZXHJcblx0XHRcdFx0XHRtb250aCA9IHBhcnNlSW50KG1hdGNoWzFdLCAxMCk7XHJcblx0XHRcdFx0XHRkYXkgPSBwYXJzZUludChtYXRjaFsyXSwgMTApO1xyXG5cdFx0XHRcdFx0eWVhciA9IHBhcnNlSW50KG1hdGNoWzNdLCAxMCk7XHJcblx0XHRcdFx0fSBlbHNlIGlmIChwYXR0ZXJuLnNvdXJjZS5pbmNsdWRlcygnKFxcXFxkezJ9KS0oXFxcXGR7Mn0pLShcXFxcZHs0fSknKSkge1xyXG5cdFx0XHRcdFx0Ly8gREQtTU0tWVlZWVxyXG5cdFx0XHRcdFx0ZGF5ID0gcGFyc2VJbnQobWF0Y2hbMV0sIDEwKTtcclxuXHRcdFx0XHRcdG1vbnRoID0gcGFyc2VJbnQobWF0Y2hbMl0sIDEwKTtcclxuXHRcdFx0XHRcdHllYXIgPSBwYXJzZUludChtYXRjaFszXSwgMTApO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSh5ZWFyLCBtb250aCAtIDEsIGRheSk7XHJcblx0XHRcdFx0aWYgKCFpc05hTihkYXRlLmdldFRpbWUoKSkpIHtcclxuXHRcdFx0XHRcdHJldHVybiBkYXRlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Ly8gQ29udGludWUgaWYgcGFyc2luZyBmYWlsc1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBudWxsO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRXh0cmFjdCBkYXRlIGZyb20gcGFyZW50IHRhc2sgd2l0aCBoaWVyYXJjaGljYWwgaW5oZXJpdGFuY2Ugc3VwcG9ydFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZXh0cmFjdERhdGVGcm9tUGFyZW50VGFzayhwYXJlbnRUYXNrOiBUYXNrKTogRGF0ZSB8IG51bGwge1xyXG5cdFx0Ly8gQ2hlY2sgdmFyaW91cyBkYXRlIGZpZWxkcyBpbiBwcmlvcml0eSBvcmRlclxyXG5cdFx0Ly8gUHJpb3JpdHkgMTogRXhwbGljaXQgZGF0ZXMgb24gdGhlIHBhcmVudCB0YXNrXHJcblx0XHRpZiAocGFyZW50VGFzay5tZXRhZGF0YS5zdGFydERhdGUpIHtcclxuXHRcdFx0cmV0dXJuIG5ldyBEYXRlKHBhcmVudFRhc2subWV0YWRhdGEuc3RhcnREYXRlKTtcclxuXHRcdH1cclxuXHRcdGlmIChwYXJlbnRUYXNrLm1ldGFkYXRhLmR1ZURhdGUpIHtcclxuXHRcdFx0cmV0dXJuIG5ldyBEYXRlKHBhcmVudFRhc2subWV0YWRhdGEuZHVlRGF0ZSk7XHJcblx0XHR9XHJcblx0XHRpZiAocGFyZW50VGFzay5tZXRhZGF0YS5zY2hlZHVsZWREYXRlKSB7XHJcblx0XHRcdHJldHVybiBuZXcgRGF0ZShwYXJlbnRUYXNrLm1ldGFkYXRhLnNjaGVkdWxlZERhdGUpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFByaW9yaXR5IDI6IEVuaGFuY2VkIGRhdGV0aW1lIG9iamVjdHMgKGlmIGF2YWlsYWJsZSlcclxuXHRcdGNvbnN0IGVuaGFuY2VkTWV0YWRhdGEgPSBwYXJlbnRUYXNrLm1ldGFkYXRhIGFzIGFueTtcclxuXHRcdGlmIChlbmhhbmNlZE1ldGFkYXRhLmVuaGFuY2VkRGF0ZXMpIHtcclxuXHRcdFx0aWYgKGVuaGFuY2VkTWV0YWRhdGEuZW5oYW5jZWREYXRlcy5zdGFydERhdGVUaW1lKSB7XHJcblx0XHRcdFx0cmV0dXJuIG5ldyBEYXRlKGVuaGFuY2VkTWV0YWRhdGEuZW5oYW5jZWREYXRlcy5zdGFydERhdGVUaW1lKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoZW5oYW5jZWRNZXRhZGF0YS5lbmhhbmNlZERhdGVzLmR1ZURhdGVUaW1lKSB7XHJcblx0XHRcdFx0cmV0dXJuIG5ldyBEYXRlKGVuaGFuY2VkTWV0YWRhdGEuZW5oYW5jZWREYXRlcy5kdWVEYXRlVGltZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKGVuaGFuY2VkTWV0YWRhdGEuZW5oYW5jZWREYXRlcy5zY2hlZHVsZWREYXRlVGltZSkge1xyXG5cdFx0XHRcdHJldHVybiBuZXcgRGF0ZShlbmhhbmNlZE1ldGFkYXRhLmVuaGFuY2VkRGF0ZXMuc2NoZWR1bGVkRGF0ZVRpbWUpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUHJpb3JpdHkgMzogQ3JlYXRpb24gZGF0ZSBhcyBmYWxsYmFja1xyXG5cdFx0aWYgKHBhcmVudFRhc2subWV0YWRhdGEuY3JlYXRlZERhdGUpIHtcclxuXHRcdFx0cmV0dXJuIG5ldyBEYXRlKHBhcmVudFRhc2subWV0YWRhdGEuY3JlYXRlZERhdGUpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBudWxsO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRXh0cmFjdCBkYXRlIGZyb20gcGFyZW50IHRhc2sgaGllcmFyY2h5IHdpdGggcmVjdXJzaXZlIGluaGVyaXRhbmNlXHJcblx0ICogVGhpcyBtZXRob2Qgc3VwcG9ydHMgbXVsdGktbGV2ZWwgaW5oZXJpdGFuY2UgKHBhcmVudCAtPiBncmFuZHBhcmVudCAtPiBldGMuKVxyXG5cdCAqL1xyXG5cdGFzeW5jIGV4dHJhY3REYXRlRnJvbVBhcmVudEhpZXJhcmNoeShcclxuXHRcdHBhcmVudFRhc2s6IFRhc2ssXHJcblx0XHRjb250ZXh0OiBEYXRlUmVzb2x1dGlvbkNvbnRleHQsXHJcblx0XHRtYXhEZXB0aDogbnVtYmVyID0gMyxcclxuXHRcdGN1cnJlbnREZXB0aDogbnVtYmVyID0gMFxyXG5cdCk6IFByb21pc2U8eyBkYXRlOiBEYXRlOyBzb3VyY2U6IHN0cmluZzsgZGVwdGg6IG51bWJlciB9IHwgbnVsbD4ge1xyXG5cdFx0aWYgKGN1cnJlbnREZXB0aCA+PSBtYXhEZXB0aCkge1xyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBUcnkgdG8gZ2V0IGRhdGUgZnJvbSBjdXJyZW50IHBhcmVudFxyXG5cdFx0Y29uc3QgcGFyZW50RGF0ZSA9IHRoaXMuZXh0cmFjdERhdGVGcm9tUGFyZW50VGFzayhwYXJlbnRUYXNrKTtcclxuXHRcdGlmIChwYXJlbnREYXRlKSB7XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0ZGF0ZTogcGFyZW50RGF0ZSxcclxuXHRcdFx0XHRzb3VyY2U6IGBwYXJlbnQtdGFzay1MJHtjdXJyZW50RGVwdGh9YCxcclxuXHRcdFx0XHRkZXB0aDogY3VycmVudERlcHRoXHJcblx0XHRcdH07XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSWYgcGFyZW50IGRvZXNuJ3QgaGF2ZSBhIGRhdGUsIHRyeSB0byBmaW5kIHRoZSBwYXJlbnQncyBwYXJlbnRcclxuXHRcdC8vIFRoaXMgcmVxdWlyZXMgYWNjZXNzIHRvIGFsbCB0YXNrcyBpbiB0aGUgY29udGV4dFxyXG5cdFx0aWYgKGNvbnRleHQuYWxsVGFza3MgJiYgcGFyZW50VGFzay5tZXRhZGF0YS5wYXJlbnQpIHtcclxuXHRcdFx0Y29uc3QgZ3JhbmRwYXJlbnRUYXNrID0gY29udGV4dC5hbGxUYXNrcy5maW5kKFxyXG5cdFx0XHRcdHRhc2sgPT4gdGFzay5pZCA9PT0gcGFyZW50VGFzay5tZXRhZGF0YS5wYXJlbnRcclxuXHRcdFx0KTtcclxuXHRcdFx0XHJcblx0XHRcdGlmIChncmFuZHBhcmVudFRhc2spIHtcclxuXHRcdFx0XHQvLyBSZWN1cnNpdmVseSBjaGVjayBncmFuZHBhcmVudFxyXG5cdFx0XHRcdGNvbnN0IGdyYW5kcGFyZW50UmVzdWx0ID0gYXdhaXQgdGhpcy5leHRyYWN0RGF0ZUZyb21QYXJlbnRIaWVyYXJjaHkoXHJcblx0XHRcdFx0XHRncmFuZHBhcmVudFRhc2ssXHJcblx0XHRcdFx0XHRjb250ZXh0LFxyXG5cdFx0XHRcdFx0bWF4RGVwdGgsXHJcblx0XHRcdFx0XHRjdXJyZW50RGVwdGggKyAxXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRpZiAoZ3JhbmRwYXJlbnRSZXN1bHQpIHtcclxuXHRcdFx0XHRcdHJldHVybiBncmFuZHBhcmVudFJlc3VsdDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGlmIGNhY2hlIGVudHJ5IGlzIHN0aWxsIHZhbGlkXHJcblx0ICovXHJcblx0cHJpdmF0ZSBpc0NhY2hlVmFsaWQoY2FjaGVkOiBGaWxlRGF0ZUluZm8pOiBib29sZWFuIHtcclxuXHRcdGNvbnN0IG5vdyA9IERhdGUubm93KCk7XHJcblx0XHRjb25zdCBjYWNoZUFnZSA9IG5vdyAtIGNhY2hlZC5jYWNoZWRBdC5nZXRUaW1lKCk7XHJcblx0XHRyZXR1cm4gY2FjaGVBZ2UgPCB0aGlzLkNBQ0hFX1RUTDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENhY2hlIGZpbGUgZGF0ZSBpbmZvIHdpdGggTFJVIGV2aWN0aW9uXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjYWNoZUZpbGVEYXRlSW5mbyhmaWxlUGF0aDogc3RyaW5nLCBpbmZvOiBGaWxlRGF0ZUluZm8pOiB2b2lkIHtcclxuXHRcdC8vIEltcGxlbWVudCBMUlUgZXZpY3Rpb25cclxuXHRcdGlmICh0aGlzLmZpbGVEYXRlQ2FjaGUuc2l6ZSA+PSB0aGlzLk1BWF9DQUNIRV9TSVpFKSB7XHJcblx0XHRcdC8vIFJlbW92ZSBvbGRlc3QgZW50cnlcclxuXHRcdFx0Y29uc3QgZmlyc3RLZXkgPSB0aGlzLmZpbGVEYXRlQ2FjaGUua2V5cygpLm5leHQoKS52YWx1ZTtcclxuXHRcdFx0aWYgKGZpcnN0S2V5KSB7XHJcblx0XHRcdFx0dGhpcy5maWxlRGF0ZUNhY2hlLmRlbGV0ZShmaXJzdEtleSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmZpbGVEYXRlQ2FjaGUuc2V0KGZpbGVQYXRoLCBpbmZvKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsZWFyIHRoZSBjYWNoZSAodXNlZnVsIGZvciB0ZXN0aW5nIG9yIHNldHRpbmdzIGNoYW5nZXMpXHJcblx0ICovXHJcblx0Y2xlYXJDYWNoZSgpOiB2b2lkIHtcclxuXHRcdHRoaXMuZmlsZURhdGVDYWNoZS5jbGVhcigpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgc3RyaW5nIHJlcHJlc2VudHMgYSByZWxhdGl2ZSBkYXRlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBpc1JlbGF0aXZlRGF0ZVN0cmluZyh2YWx1ZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0XHRjb25zdCByZWxhdGl2ZURhdGVQYXR0ZXJucyA9IFtcclxuXHRcdFx0L150b2RheSQvaSxcclxuXHRcdFx0L150b21vcnJvdyQvaSxcclxuXHRcdFx0L155ZXN0ZXJkYXkkL2ksXHJcblx0XHRcdC9ebm93JC9pLFxyXG5cdFx0XHQvXlxcK1xcZCtbZHdteV0kL2ksIC8vICsxZCwgKzJ3LCArMW0sICsxeVxyXG5cdFx0XHQvXi1cXGQrW2R3bXldJC9pLCAgLy8gLTFkLCAtMncsIC0xbSwgLTF5XHJcblx0XHRdO1xyXG5cclxuXHRcdHJldHVybiByZWxhdGl2ZURhdGVQYXR0ZXJucy5zb21lKHBhdHRlcm4gPT4gcGF0dGVybi50ZXN0KHZhbHVlKSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBQYXJzZSByZWxhdGl2ZSBkYXRlIHN0cmluZ3NcclxuXHQgKi9cclxuXHRwcml2YXRlIHBhcnNlUmVsYXRpdmVEYXRlU3RyaW5nKHZhbHVlOiBzdHJpbmcpOiBEYXRlIHwgbnVsbCB7XHJcblx0XHRjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xyXG5cdFx0Y29uc3QgbG93ZXJWYWx1ZSA9IHZhbHVlLnRvTG93ZXJDYXNlKCk7XHJcblxyXG5cdFx0c3dpdGNoIChsb3dlclZhbHVlKSB7XHJcblx0XHRcdGNhc2UgJ3RvZGF5JzpcclxuXHRcdFx0Y2FzZSAnbm93JzpcclxuXHRcdFx0XHRyZXR1cm4gbmV3IERhdGUobm93LmdldEZ1bGxZZWFyKCksIG5vdy5nZXRNb250aCgpLCBub3cuZ2V0RGF0ZSgpKTtcclxuXHRcdFx0Y2FzZSAndG9tb3Jyb3cnOlxyXG5cdFx0XHRcdHJldHVybiBuZXcgRGF0ZShub3cuZ2V0RnVsbFllYXIoKSwgbm93LmdldE1vbnRoKCksIG5vdy5nZXREYXRlKCkgKyAxKTtcclxuXHRcdFx0Y2FzZSAneWVzdGVyZGF5JzpcclxuXHRcdFx0XHRyZXR1cm4gbmV3IERhdGUobm93LmdldEZ1bGxZZWFyKCksIG5vdy5nZXRNb250aCgpLCBub3cuZ2V0RGF0ZSgpIC0gMSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSGFuZGxlICsvLU5bZHdteV0gZm9ybWF0XHJcblx0XHRjb25zdCBvZmZzZXRNYXRjaCA9IHZhbHVlLm1hdGNoKC9eKFsrLV0pKFxcZCspKFtkd215XSkkL2kpO1xyXG5cdFx0aWYgKG9mZnNldE1hdGNoKSB7XHJcblx0XHRcdGNvbnN0IHNpZ24gPSBvZmZzZXRNYXRjaFsxXSA9PT0gJysnID8gMSA6IC0xO1xyXG5cdFx0XHRjb25zdCBhbW91bnQgPSBwYXJzZUludChvZmZzZXRNYXRjaFsyXSwgMTApICogc2lnbjtcclxuXHRcdFx0Y29uc3QgdW5pdCA9IG9mZnNldE1hdGNoWzNdLnRvTG93ZXJDYXNlKCk7XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBuZXcgRGF0ZShub3cpO1xyXG5cdFx0XHRzd2l0Y2ggKHVuaXQpIHtcclxuXHRcdFx0XHRjYXNlICdkJzpcclxuXHRcdFx0XHRcdHJlc3VsdC5zZXREYXRlKHJlc3VsdC5nZXREYXRlKCkgKyBhbW91bnQpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAndyc6XHJcblx0XHRcdFx0XHRyZXN1bHQuc2V0RGF0ZShyZXN1bHQuZ2V0RGF0ZSgpICsgYW1vdW50ICogNyk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICdtJzpcclxuXHRcdFx0XHRcdHJlc3VsdC5zZXRNb250aChyZXN1bHQuZ2V0TW9udGgoKSArIGFtb3VudCk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICd5JzpcclxuXHRcdFx0XHRcdHJlc3VsdC5zZXRGdWxsWWVhcihyZXN1bHQuZ2V0RnVsbFllYXIoKSArIGFtb3VudCk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBudWxsO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgc3RyaW5nIHJlcHJlc2VudHMgbmF0dXJhbCBsYW5ndWFnZSBkYXRlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBpc05hdHVyYWxMYW5ndWFnZURhdGUodmFsdWU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0Y29uc3QgbmF0dXJhbFBhdHRlcm5zID0gW1xyXG5cdFx0XHQvXihtb25kYXl8dHVlc2RheXx3ZWRuZXNkYXl8dGh1cnNkYXl8ZnJpZGF5fHNhdHVyZGF5fHN1bmRheSkkL2ksXHJcblx0XHRcdC9eKG5leHR8bGFzdClcXHMrKG1vbmRheXx0dWVzZGF5fHdlZG5lc2RheXx0aHVyc2RheXxmcmlkYXl8c2F0dXJkYXl8c3VuZGF5KSQvaSxcclxuXHRcdFx0L14obmV4dHxsYXN0KVxccysod2Vla3xtb250aHx5ZWFyKSQvaSxcclxuXHRcdFx0L14odGhpc3xuZXh0fGxhc3QpXFxzKyhtb25kYXl8dHVlc2RheXx3ZWRuZXNkYXl8dGh1cnNkYXl8ZnJpZGF5fHNhdHVyZGF5fHN1bmRheSkkL2ksXHJcblx0XHRdO1xyXG5cclxuXHRcdHJldHVybiBuYXR1cmFsUGF0dGVybnMuc29tZShwYXR0ZXJuID0+IHBhdHRlcm4udGVzdCh2YWx1ZSkpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUGFyc2UgbmF0dXJhbCBsYW5ndWFnZSBkYXRlIHN0cmluZ3NcclxuXHQgKi9cclxuXHRwcml2YXRlIHBhcnNlTmF0dXJhbExhbmd1YWdlRGF0ZSh2YWx1ZTogc3RyaW5nKTogRGF0ZSB8IG51bGwge1xyXG5cdFx0Y29uc3Qgbm93ID0gbmV3IERhdGUoKTtcclxuXHRcdGNvbnN0IGxvd2VyVmFsdWUgPSB2YWx1ZS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcclxuXHJcblx0XHQvLyBIYW5kbGUgd2Vla2RheXNcclxuXHRcdGNvbnN0IHdlZWtkYXlzID0gWydzdW5kYXknLCAnbW9uZGF5JywgJ3R1ZXNkYXknLCAnd2VkbmVzZGF5JywgJ3RodXJzZGF5JywgJ2ZyaWRheScsICdzYXR1cmRheSddO1xyXG5cdFx0Y29uc3Qgd2Vla2RheU1hdGNoID0gbG93ZXJWYWx1ZS5tYXRjaCgvXig/OihuZXh0fGxhc3R8dGhpcylcXHMrKT8obW9uZGF5fHR1ZXNkYXl8d2VkbmVzZGF5fHRodXJzZGF5fGZyaWRheXxzYXR1cmRheXxzdW5kYXkpJC9pKTtcclxuXHRcdFxyXG5cdFx0aWYgKHdlZWtkYXlNYXRjaCkge1xyXG5cdFx0XHRjb25zdCBtb2RpZmllciA9IHdlZWtkYXlNYXRjaFsxXT8udG9Mb3dlckNhc2UoKTtcclxuXHRcdFx0Y29uc3Qgd2Vla2RheU5hbWUgPSB3ZWVrZGF5TWF0Y2hbMl0udG9Mb3dlckNhc2UoKTtcclxuXHRcdFx0Y29uc3QgdGFyZ2V0V2Vla2RheSA9IHdlZWtkYXlzLmluZGV4T2Yod2Vla2RheU5hbWUpO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKHRhcmdldFdlZWtkYXkgIT09IC0xKSB7XHJcblx0XHRcdFx0Y29uc3QgY3VycmVudFdlZWtkYXkgPSBub3cuZ2V0RGF5KCk7XHJcblx0XHRcdFx0bGV0IGRheXNUb0FkZCA9IHRhcmdldFdlZWtkYXkgLSBjdXJyZW50V2Vla2RheTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRpZiAobW9kaWZpZXIgPT09ICduZXh0Jykge1xyXG5cdFx0XHRcdFx0aWYgKGRheXNUb0FkZCA8PSAwKSBkYXlzVG9BZGQgKz0gNztcclxuXHRcdFx0XHR9IGVsc2UgaWYgKG1vZGlmaWVyID09PSAnbGFzdCcpIHtcclxuXHRcdFx0XHRcdGlmIChkYXlzVG9BZGQgPj0gMCkgZGF5c1RvQWRkIC09IDc7XHJcblx0XHRcdFx0fSBlbHNlIGlmIChtb2RpZmllciA9PT0gJ3RoaXMnKSB7XHJcblx0XHRcdFx0XHQvLyBLZWVwIGFzIGlzXHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdC8vIE5vIG1vZGlmaWVyIC0gYXNzdW1lIG5leHQgb2NjdXJyZW5jZVxyXG5cdFx0XHRcdFx0aWYgKGRheXNUb0FkZCA8PSAwKSBkYXlzVG9BZGQgKz0gNztcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gbmV3IERhdGUobm93KTtcclxuXHRcdFx0XHRyZXN1bHQuc2V0RGF0ZShub3cuZ2V0RGF0ZSgpICsgZGF5c1RvQWRkKTtcclxuXHRcdFx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSGFuZGxlIG90aGVyIG5hdHVyYWwgbGFuZ3VhZ2UgcGF0dGVybnNcclxuXHRcdGlmIChsb3dlclZhbHVlID09PSAnbmV4dCB3ZWVrJykge1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBuZXcgRGF0ZShub3cpO1xyXG5cdFx0XHRyZXN1bHQuc2V0RGF0ZShub3cuZ2V0RGF0ZSgpICsgNyk7XHJcblx0XHRcdHJldHVybiByZXN1bHQ7XHJcblx0XHR9IGVsc2UgaWYgKGxvd2VyVmFsdWUgPT09ICdsYXN0IHdlZWsnKSB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IG5ldyBEYXRlKG5vdyk7XHJcblx0XHRcdHJlc3VsdC5zZXREYXRlKG5vdy5nZXREYXRlKCkgLSA3KTtcclxuXHRcdFx0cmV0dXJuIHJlc3VsdDtcclxuXHRcdH0gZWxzZSBpZiAobG93ZXJWYWx1ZSA9PT0gJ25leHQgbW9udGgnKSB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IG5ldyBEYXRlKG5vdyk7XHJcblx0XHRcdHJlc3VsdC5zZXRNb250aChub3cuZ2V0TW9udGgoKSArIDEpO1xyXG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdFx0fSBlbHNlIGlmIChsb3dlclZhbHVlID09PSAnbGFzdCBtb250aCcpIHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gbmV3IERhdGUobm93KTtcclxuXHRcdFx0cmVzdWx0LnNldE1vbnRoKG5vdy5nZXRNb250aCgpIC0gMSk7XHJcblx0XHRcdHJldHVybiByZXN1bHQ7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIG51bGw7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBQYXJzZSBkYXRlIGZyb20gZm9ybWF0LXNwZWNpZmljIG1hdGNoXHJcblx0ICovXHJcblx0cHJpdmF0ZSBwYXJzZURhdGVGcm9tRm9ybWF0KG1hdGNoOiBSZWdFeHBNYXRjaEFycmF5LCBmb3JtYXQ6IHN0cmluZyk6IERhdGUgfCBudWxsIHtcclxuXHRcdGxldCB5ZWFyOiBudW1iZXIsIG1vbnRoOiBudW1iZXIsIGRheTogbnVtYmVyLCBob3VyID0gMCwgbWludXRlID0gMCwgc2Vjb25kID0gMDtcclxuXHJcblx0XHRzd2l0Y2ggKGZvcm1hdCkge1xyXG5cdFx0XHRjYXNlIFwiSVNPX0RBVEVUSU1FXCI6XHJcblx0XHRcdFx0eWVhciA9IHBhcnNlSW50KG1hdGNoWzFdLCAxMCk7XHJcblx0XHRcdFx0bW9udGggPSBwYXJzZUludChtYXRjaFsyXSwgMTApO1xyXG5cdFx0XHRcdGRheSA9IHBhcnNlSW50KG1hdGNoWzNdLCAxMCk7XHJcblx0XHRcdFx0aG91ciA9IHBhcnNlSW50KG1hdGNoWzRdLCAxMCk7XHJcblx0XHRcdFx0bWludXRlID0gcGFyc2VJbnQobWF0Y2hbNV0sIDEwKTtcclxuXHRcdFx0XHRzZWNvbmQgPSBwYXJzZUludChtYXRjaFs2XSwgMTApO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0Y2FzZSBcIklTT19EQVRFVElNRV9TSE9SVFwiOlxyXG5cdFx0XHRcdHllYXIgPSBwYXJzZUludChtYXRjaFsxXSwgMTApO1xyXG5cdFx0XHRcdG1vbnRoID0gcGFyc2VJbnQobWF0Y2hbMl0sIDEwKTtcclxuXHRcdFx0XHRkYXkgPSBwYXJzZUludChtYXRjaFszXSwgMTApO1xyXG5cdFx0XHRcdGhvdXIgPSBwYXJzZUludChtYXRjaFs0XSwgMTApO1xyXG5cdFx0XHRcdG1pbnV0ZSA9IHBhcnNlSW50KG1hdGNoWzVdLCAxMCk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRjYXNlIFwiWVlZWS1NTS1ERFwiOlxyXG5cdFx0XHRjYXNlIFwiWVlZWS5NTS5ERFwiOlxyXG5cdFx0XHRjYXNlIFwiWVlZWS9NTS9ERFwiOlxyXG5cdFx0XHRcdHllYXIgPSBwYXJzZUludChtYXRjaFsxXSwgMTApO1xyXG5cdFx0XHRcdG1vbnRoID0gcGFyc2VJbnQobWF0Y2hbMl0sIDEwKTtcclxuXHRcdFx0XHRkYXkgPSBwYXJzZUludChtYXRjaFszXSwgMTApO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0Y2FzZSBcIk1NL0REL1lZWVlcIjpcclxuXHRcdFx0Y2FzZSBcIk0vRC9ZWVlZXCI6XHJcblx0XHRcdFx0bW9udGggPSBwYXJzZUludChtYXRjaFsxXSwgMTApO1xyXG5cdFx0XHRcdGRheSA9IHBhcnNlSW50KG1hdGNoWzJdLCAxMCk7XHJcblx0XHRcdFx0eWVhciA9IHBhcnNlSW50KG1hdGNoWzNdLCAxMCk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRjYXNlIFwiREQtTU0tWVlZWVwiOlxyXG5cdFx0XHRjYXNlIFwiREQuTU0uWVlZWVwiOlxyXG5cdFx0XHRcdGRheSA9IHBhcnNlSW50KG1hdGNoWzFdLCAxMCk7XHJcblx0XHRcdFx0bW9udGggPSBwYXJzZUludChtYXRjaFsyXSwgMTApO1xyXG5cdFx0XHRcdHllYXIgPSBwYXJzZUludChtYXRjaFszXSwgMTApO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0Y2FzZSBcIllZWVlNTUREXCI6XHJcblx0XHRcdFx0eWVhciA9IHBhcnNlSW50KG1hdGNoWzFdLCAxMCk7XHJcblx0XHRcdFx0bW9udGggPSBwYXJzZUludChtYXRjaFsyXSwgMTApO1xyXG5cdFx0XHRcdGRheSA9IHBhcnNlSW50KG1hdGNoWzNdLCAxMCk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFZhbGlkYXRlIGRhdGUgY29tcG9uZW50c1xyXG5cdFx0aWYgKHllYXIgPj0gMTkwMCAmJiB5ZWFyIDw9IDIxMDAgJiYgXHJcblx0XHRcdG1vbnRoID49IDEgJiYgbW9udGggPD0gMTIgJiYgXHJcblx0XHRcdGRheSA+PSAxICYmIGRheSA8PSAzMSAmJlxyXG5cdFx0XHRob3VyID49IDAgJiYgaG91ciA8PSAyMyAmJlxyXG5cdFx0XHRtaW51dGUgPj0gMCAmJiBtaW51dGUgPD0gNTkgJiZcclxuXHRcdFx0c2Vjb25kID49IDAgJiYgc2Vjb25kIDw9IDU5KSB7XHJcblx0XHRcdFxyXG5cdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUoeWVhciwgbW9udGggLSAxLCBkYXksIGhvdXIsIG1pbnV0ZSwgc2Vjb25kKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIFZlcmlmeSB0aGUgZGF0ZSBpcyB2YWxpZFxyXG5cdFx0XHRpZiAoZGF0ZS5nZXRGdWxsWWVhcigpID09PSB5ZWFyICYmIFxyXG5cdFx0XHRcdGRhdGUuZ2V0TW9udGgoKSA9PT0gbW9udGggLSAxICYmIFxyXG5cdFx0XHRcdGRhdGUuZ2V0RGF0ZSgpID09PSBkYXkpIHtcclxuXHRcdFx0XHRyZXR1cm4gZGF0ZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBudWxsO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVmFsaWRhdGUgaWYgbWV0YWRhdGEgZGF0ZSBpcyByZWFzb25hYmxlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBpc1ZhbGlkTWV0YWRhdGFEYXRlKGRhdGU6IERhdGUsIHByb3BlcnR5TmFtZT86IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0Y29uc3Qgbm93ID0gbmV3IERhdGUoKTtcclxuXHRcdGNvbnN0IGZpdmVZZWFyc0FnbyA9IG5ldyBEYXRlKG5vdy5nZXRGdWxsWWVhcigpIC0gNSwgbm93LmdldE1vbnRoKCksIG5vdy5nZXREYXRlKCkpO1xyXG5cdFx0Y29uc3QgdHdvWWVhcnNGcm9tTm93ID0gbmV3IERhdGUobm93LmdldEZ1bGxZZWFyKCkgKyAyLCBub3cuZ2V0TW9udGgoKSwgbm93LmdldERhdGUoKSk7XHJcblxyXG5cdFx0Ly8gTW9zdCBtZXRhZGF0YSBkYXRlcyBzaG91bGQgYmUgd2l0aGluIGEgcmVhc29uYWJsZSByYW5nZVxyXG5cdFx0aWYgKGRhdGUgPCBmaXZlWWVhcnNBZ28gfHwgZGF0ZSA+IHR3b1llYXJzRnJvbU5vdykge1xyXG5cdFx0XHQvLyBBbGxvdyB3aWRlciByYW5nZSBmb3IgY2VydGFpbiBwcm9wZXJ0eSB0eXBlc1xyXG5cdFx0XHRpZiAocHJvcGVydHlOYW1lICYmIHRoaXMuaXNBcmNoaXZhbFByb3BlcnR5KHByb3BlcnR5TmFtZSkpIHtcclxuXHRcdFx0XHQvLyBBbGxvdyBtdWNoIG9sZGVyIGRhdGVzIGZvciBhcmNoaXZhbCBwcm9wZXJ0aWVzXHJcblx0XHRcdFx0Y29uc3QgdGVuWWVhcnNBZ28gPSBuZXcgRGF0ZShub3cuZ2V0RnVsbFllYXIoKSAtIDEwLCBub3cuZ2V0TW9udGgoKSwgbm93LmdldERhdGUoKSk7XHJcblx0XHRcdFx0cmV0dXJuIGRhdGUgPj0gdGVuWWVhcnNBZ28gJiYgZGF0ZSA8PSB0d29ZZWFyc0Zyb21Ob3c7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0cnVlO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgcHJvcGVydHkgbmFtZSBzdWdnZXN0cyBhcmNoaXZhbC9oaXN0b3JpY2FsIGRhdGFcclxuXHQgKi9cclxuXHRwcml2YXRlIGlzQXJjaGl2YWxQcm9wZXJ0eShwcm9wZXJ0eU5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0Y29uc3QgYXJjaGl2YWxQYXR0ZXJucyA9IFtcclxuXHRcdFx0L2NyZWF0aW9uL2ksXHJcblx0XHRcdC9jcmVhdGVkL2ksXHJcblx0XHRcdC9vcmlnaW5hbC9pLFxyXG5cdFx0XHQvYXJjaGl2ZS9pLFxyXG5cdFx0XHQvaGlzdG9yaWNhbC9pLFxyXG5cdFx0XHQvbGVnYWN5L2ksXHJcblx0XHRdO1xyXG5cclxuXHRcdHJldHVybiBhcmNoaXZhbFBhdHRlcm5zLnNvbWUocGF0dGVybiA9PiBwYXR0ZXJuLnRlc3QocHJvcGVydHlOYW1lKSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgY2FjaGUgc3RhdGlzdGljcyBmb3IgZGVidWdnaW5nXHJcblx0ICovXHJcblx0Z2V0Q2FjaGVTdGF0cygpOiB7IHNpemU6IG51bWJlcjsgbWF4U2l6ZTogbnVtYmVyOyBoaXRSYXRlPzogbnVtYmVyIH0ge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0c2l6ZTogdGhpcy5maWxlRGF0ZUNhY2hlLnNpemUsXHJcblx0XHRcdG1heFNpemU6IHRoaXMuTUFYX0NBQ0hFX1NJWkVcclxuXHRcdH07XHJcblx0fVxyXG59Il19