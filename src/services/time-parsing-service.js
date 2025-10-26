// Use require for chrono-node to avoid import issues in browser environment
import * as chrono from "chrono-node";
export class TimeParsingService {
    constructor(config) {
        this.parseCache = new Map();
        this.maxCacheSize = 100;
        // Time pattern regexes
        this.TIME_PATTERNS = {
            // 24-hour format: 12:00, 12:00:00
            TIME_24H: /\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/g,
            // 12-hour format: 1:30 PM, 1:30:00 PM
            TIME_12H: /\b(1[0-2]|0?[1-9]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM|am|pm)\b/g,
            // Time range: 12:00-13:00, 12:00~13:00, 12:00 - 13:00
            TIME_RANGE: /\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\s*[-~～]\s*([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/g,
            // Time range with 12-hour format
            TIME_RANGE_12H: /\b(1[0-2]|0?[1-9]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM|am|pm)?\s*[-~～]\s*(1[0-2]|0?[1-9]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM|am|pm)\b/g,
        };
        this.config = config;
    }
    /**
     * Parse time components from text (public method for subtask 3.1)
     * @param text - Text containing time expressions
     * @returns Object with extracted time components and metadata
     */
    parseTimeComponents(text) {
        const errors = [];
        const warnings = [];
        try {
            const { timeComponents } = this.extractTimeComponents(text);
            return { timeComponents, errors, warnings };
        }
        catch (error) {
            const timeError = {
                type: "invalid-format",
                originalText: text,
                position: 0,
                message: error instanceof Error
                    ? error.message
                    : "Unknown error during time parsing",
                fallbackUsed: true,
            };
            errors.push(timeError);
            return {
                timeComponents: {},
                errors,
                warnings,
            };
        }
    }
    /**
     * Parse time expressions from a single line and return line-specific result
     * @param line - Input line containing potential time expressions
     * @returns LineParseResult with extracted dates and cleaned line
     */
    parseTimeExpressionsForLine(line) {
        const result = this.parseTimeExpressions(line);
        return {
            originalLine: line,
            cleanedLine: result.cleanedText,
            startDate: result.startDate,
            dueDate: result.dueDate,
            scheduledDate: result.scheduledDate,
            parsedExpressions: result.parsedExpressions,
        };
    }
    /**
     * Parse time expressions from multiple lines and return line-specific results
     * @param lines - Array of lines containing potential time expressions
     * @returns Array of LineParseResult with extracted dates and cleaned lines
     */
    parseTimeExpressionsPerLine(lines) {
        return lines.map((line) => this.parseTimeExpressionsForLine(line));
    }
    /**
     * Parse time component from text (e.g., "12:00", "1:30 PM")
     * @param timeText - Time text to parse
     * @returns TimeComponent or null if invalid
     */
    parseTimeComponent(timeText) {
        // Clean input
        const cleanedText = timeText.trim();
        // Try 12-hour format first (more specific)
        const match12h = cleanedText.match(/^(1[0-2]|0?[1-9]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM|am|pm)$/i);
        if (match12h) {
            let hour = parseInt(match12h[1], 10);
            const minute = parseInt(match12h[2], 10);
            const second = match12h[3] ? parseInt(match12h[3], 10) : undefined;
            const period = match12h[4].toUpperCase();
            // Convert to 24-hour format
            if (period === "PM" && hour !== 12) {
                hour += 12;
            }
            else if (period === "AM" && hour === 12) {
                hour = 0;
            }
            return {
                hour,
                minute,
                second,
                originalText: cleanedText,
                isRange: false,
            };
        }
        // Try 24-hour format
        const match24h = cleanedText.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
        if (match24h) {
            let hour = parseInt(match24h[1], 10);
            const minute = parseInt(match24h[2], 10);
            const second = match24h[3] ? parseInt(match24h[3], 10) : undefined;
            // Validate ranges
            if (hour > 23 ||
                minute > 59 ||
                (second !== undefined && second > 59)) {
                return null;
            }
            // Handle ambiguous times (e.g., 3:00 could be AM or PM)
            // Note: Only apply defaults when explicitly configured and for truly ambiguous times
            const isEnhancedConfig = (config) => {
                return config && "timeDefaults" in config;
            };
            // Check if this is a user-configured scenario for ambiguous time handling
            // For now, we'll keep 24-hour times as-is unless there's specific context
            return {
                hour,
                minute,
                second,
                originalText: cleanedText,
                isRange: false,
            };
        }
        return null;
    }
    /**
     * Extract time components from text
     * @param text - Text containing time expressions
     * @returns Object with extracted time components
     */
    extractTimeComponents(text) {
        const timeComponents = {};
        const componentSources = {};
        const timeExpressions = [];
        // Check for time ranges first (they contain single times too)
        const rangeMatches = [...text.matchAll(this.TIME_PATTERNS.TIME_RANGE)];
        const range12hMatches = [
            ...text.matchAll(this.TIME_PATTERNS.TIME_RANGE_12H),
        ];
        for (const match of [...rangeMatches, ...range12hMatches]) {
            const fullMatch = match[0];
            const index = match.index || 0;
            // Parse start and end times
            const parts = fullMatch.split(/\s*[-~\uff5e]\s*/);
            if (parts.length === 2) {
                const startTime = this.parseTimeComponent(parts[0]);
                const endTime = this.parseTimeComponent(parts[1]);
                if (startTime && endTime) {
                    startTime.isRange = true;
                    endTime.isRange = true;
                    startTime.rangePartner = endTime;
                    endTime.rangePartner = startTime;
                    timeExpressions.push({
                        text: fullMatch,
                        index,
                        isRange: true,
                        rangeStart: startTime,
                        rangeEnd: endTime,
                    });
                    // Determine context for time range
                    const context = this.determineTimeContext(text, fullMatch, index);
                    if (context === "start" || !timeComponents.startTime) {
                        timeComponents.startTime = startTime;
                        timeComponents.endTime = endTime;
                        componentSources.startTime =
                            context === "start" ? "explicit" : "inferred";
                    }
                }
            }
        }
        // Check for single times (not part of ranges)
        // Process 12-hour format first (more specific) to avoid conflicts
        const time12hMatches = [...text.matchAll(this.TIME_PATTERNS.TIME_12H)];
        const time24hMatches = [...text.matchAll(this.TIME_PATTERNS.TIME_24H)];
        // Track processed positions to avoid duplicates
        const processedPositions = new Set();
        // Process 12-hour times first
        for (const match of time12hMatches) {
            const fullMatch = match[0];
            const index = match.index || 0;
            // Skip if this time is part of a range we already found
            const isPartOfRange = timeExpressions.some((expr) => expr.isRange &&
                index >= expr.index &&
                index < expr.index + expr.text.length);
            if (!isPartOfRange) {
                const timeComponent = this.parseTimeComponent(fullMatch);
                if (timeComponent) {
                    const nextChar = text[index + fullMatch.length];
                    const followingChar = text[index + fullMatch.length + 1];
                    const prevChar = index > 0 ? text[index - 1] : undefined;
                    const prevPrevChar = index > 1 ? text[index - 2] : undefined;
                    if (nextChar === ":" &&
                        followingChar !== undefined &&
                        /\d/.test(followingChar)) {
                        continue;
                    }
                    if (nextChar === "-" && followingChar === "-") {
                        continue;
                    }
                    if (prevChar === "-" && prevPrevChar === "-") {
                        continue;
                    }
                    processedPositions.add(index);
                    timeExpressions.push({
                        text: fullMatch,
                        index,
                        timeComponent,
                        isRange: false,
                    });
                    // Determine context and assign to appropriate field
                    const context = this.determineTimeContext(text, fullMatch, index);
                    switch (context) {
                        case "start":
                            timeComponents.startTime = timeComponent;
                            componentSources.startTime = "explicit";
                            break;
                        case "due":
                            if (!timeComponents.dueTime ||
                                componentSources.dueTime !== "explicit") {
                                timeComponents.dueTime = timeComponent;
                                componentSources.dueTime = "explicit";
                            }
                            break;
                        case "scheduled":
                            if (!timeComponents.scheduledTime ||
                                componentSources.scheduledTime !== "explicit") {
                                timeComponents.scheduledTime = timeComponent;
                                componentSources.scheduledTime = "explicit";
                            }
                            break;
                    }
                }
            }
        }
        // Process 24-hour times (skip if already processed as 12-hour)
        for (const match of time24hMatches) {
            const fullMatch = match[0];
            const index = match.index || 0;
            // Skip if already processed as 12-hour format
            if (processedPositions.has(index)) {
                continue;
            }
            // Skip if this time is part of a range we already found
            const isPartOfRange = timeExpressions.some((expr) => expr.isRange &&
                index >= expr.index &&
                index < expr.index + expr.text.length);
            if (!isPartOfRange) {
                const timeComponent = this.parseTimeComponent(fullMatch);
                if (timeComponent) {
                    const nextChar = text[index + fullMatch.length];
                    const followingChar = text[index + fullMatch.length + 1];
                    const prevChar = index > 0 ? text[index - 1] : undefined;
                    const prevPrevChar = index > 1 ? text[index - 2] : undefined;
                    if (nextChar === ":" &&
                        followingChar !== undefined &&
                        /\d/.test(followingChar)) {
                        continue;
                    }
                    if (nextChar === "-" && followingChar === "-") {
                        continue;
                    }
                    if (prevChar === "-" && prevPrevChar === "-") {
                        continue;
                    }
                    timeExpressions.push({
                        text: fullMatch,
                        index,
                        timeComponent,
                        isRange: false,
                    });
                    // Determine context and assign to appropriate field
                    const context = this.determineTimeContext(text, fullMatch, index);
                    switch (context) {
                        case "start":
                            timeComponents.startTime = timeComponent;
                            componentSources.startTime = "explicit";
                            break;
                        case "due":
                            if (!timeComponents.dueTime ||
                                componentSources.dueTime !== "explicit") {
                                timeComponents.dueTime = timeComponent;
                                componentSources.dueTime = "explicit";
                            }
                            break;
                        case "scheduled":
                            if (!timeComponents.scheduledTime ||
                                componentSources.scheduledTime !== "explicit") {
                                timeComponents.scheduledTime = timeComponent;
                                componentSources.scheduledTime = "explicit";
                            }
                            break;
                    }
                }
            }
        }
        if (timeComponents.startTime && !timeComponents.scheduledTime) {
            timeComponents.scheduledTime = timeComponents.startTime;
        }
        return { timeComponents, timeExpressions };
    }
    /**
     * Determine time context based on surrounding keywords
     */
    determineTimeContext(text, expression, index) {
        // Get text before the expression (look back up to 20 characters)
        const beforeText = text
            .substring(Math.max(0, index - 20), index)
            .toLowerCase();
        // Get text after the expression (look ahead up to 20 characters)
        const afterText = text
            .substring(index + expression.length, Math.min(text.length, index + expression.length + 20))
            .toLowerCase();
        // Combine surrounding context
        const context = beforeText + " " + afterText;
        // Check for start keywords first (most specific)
        for (const keyword of this.config.dateKeywords.start) {
            if (context.includes(keyword.toLowerCase())) {
                return "start";
            }
        }
        // Check for scheduled keywords (including "at")
        for (const keyword of this.config.dateKeywords.scheduled) {
            if (context.includes(keyword.toLowerCase())) {
                return "scheduled";
            }
        }
        // Check for due keywords
        for (const keyword of this.config.dateKeywords.due) {
            if (context.includes(keyword.toLowerCase())) {
                return "due";
            }
        }
        // Default based on common patterns
        if (context.includes("at") || context.includes("@")) {
            return "scheduled";
        }
        // Default to due if no specific context found
        return "due";
    }
    /**
     * Parse time expressions from text and return structured result
     * @param text - Input text containing potential time expressions
     * @returns ParsedTimeResult with extracted dates and cleaned text
     */
    parseTimeExpressions(text) {
        var _a;
        const safeText = text !== null && text !== void 0 ? text : "";
        if (!this.config.enabled) {
            return {
                originalText: safeText,
                cleanedText: safeText,
                parsedExpressions: [],
            };
        }
        // Check cache first
        const cacheKey = this.generateCacheKey(safeText);
        if (this.parseCache.has(cacheKey)) {
            return this.parseCache.get(cacheKey);
        }
        // Extract time components first
        const { timeComponents, timeExpressions } = this.extractTimeComponents(safeText);
        // Create enhanced result if time components found
        const result = {
            originalText: safeText,
            cleanedText: safeText,
            parsedExpressions: [],
            timeComponents: timeComponents,
        };
        try {
            if (safeText.trim().length === 0) {
                return result;
            }
            // Parse all date expressions using chrono-node
            // For better Chinese support, we can use specific locale parsers
            const chronoModule = chrono;
            let parseResults;
            try {
                parseResults = chronoModule.parse(safeText);
            }
            catch (chronoError) {
                console.warn("TimeParsingService: Chrono parsing failed:", chronoError);
                parseResults = [];
            }
            // If no results found with default parser and text contains Chinese characters,
            // try with different locale parsers as fallback
            if (parseResults.length === 0 && /[\u4e00-\u9fff]/.test(safeText)) {
                try {
                    // Try Chinese traditional (zh.hant) first if available
                    if (chronoModule.zh &&
                        chronoModule.zh.hant &&
                        typeof chronoModule.zh.hant.parse === "function") {
                        const zhHantResult = chronoModule.zh.parse(safeText);
                        if (zhHantResult && zhHantResult.length > 0) {
                            parseResults = zhHantResult;
                        }
                    }
                    // If still no results, try simplified Chinese (zh) if available
                    if (parseResults.length === 0 &&
                        chronoModule.zh &&
                        typeof chronoModule.zh.parse === "function") {
                        const zhResult = chronoModule.zh.parse(safeText);
                        if (zhResult && zhResult.length > 0) {
                            parseResults = zhResult;
                        }
                    }
                    // If still no results, fallback to custom Chinese parsing
                    if (parseResults.length === 0) {
                        parseResults =
                            this.parseChineseTimeExpressions(safeText);
                    }
                }
                catch (chineseParsingError) {
                    console.warn("TimeParsingService: Chinese parsing failed:", chineseParsingError);
                    // Fallback to custom Chinese parsing
                    try {
                        parseResults =
                            this.parseChineseTimeExpressions(safeText);
                    }
                    catch (customParsingError) {
                        console.warn("TimeParsingService: Custom Chinese parsing failed:", customParsingError);
                        parseResults = [];
                    }
                }
            }
            for (const parseResult of parseResults) {
                try {
                    // Validate parse result structure
                    if (!parseResult ||
                        !parseResult.text ||
                        !parseResult.start) {
                        console.warn("TimeParsingService: Invalid parse result structure:", parseResult);
                        continue;
                    }
                    const expressionText = parseResult.text;
                    let date;
                    try {
                        date = parseResult.start.date();
                    }
                    catch (dateError) {
                        console.warn("TimeParsingService: Failed to extract date from parse result:", dateError);
                        continue;
                    }
                    // Validate the extracted date
                    if (!date || isNaN(date.getTime())) {
                        console.warn("TimeParsingService: Invalid date extracted:", date);
                        continue;
                    }
                    const index = (_a = parseResult.index) !== null && _a !== void 0 ? _a : 0;
                    const length = expressionText.length;
                    // Determine the type of date based on keywords in the surrounding context
                    let type;
                    try {
                        type = this.determineTimeType(safeText, expressionText, index);
                    }
                    catch (typeError) {
                        console.warn("TimeParsingService: Failed to determine time type:", typeError);
                        type = "due"; // Default fallback
                    }
                    // Check if this date expression has an associated time component
                    let matchingTimeExpr = timeExpressions.find((te) => te.index >= index - 10 &&
                        te.index <= index + length + 10);
                    // Check if time range crosses midnight
                    let crossesMidnight = false;
                    if ((matchingTimeExpr === null || matchingTimeExpr === void 0 ? void 0 : matchingTimeExpr.rangeStart) &&
                        (matchingTimeExpr === null || matchingTimeExpr === void 0 ? void 0 : matchingTimeExpr.rangeEnd)) {
                        crossesMidnight =
                            matchingTimeExpr.rangeStart.hour >
                                matchingTimeExpr.rangeEnd.hour;
                    }
                    const expression = {
                        text: expressionText,
                        date: date,
                        type: type,
                        index: index,
                        length: length,
                        timeComponent: matchingTimeExpr === null || matchingTimeExpr === void 0 ? void 0 : matchingTimeExpr.timeComponent,
                        isTimeRange: (matchingTimeExpr === null || matchingTimeExpr === void 0 ? void 0 : matchingTimeExpr.isRange) || false,
                        rangeStart: matchingTimeExpr === null || matchingTimeExpr === void 0 ? void 0 : matchingTimeExpr.rangeStart,
                        rangeEnd: matchingTimeExpr === null || matchingTimeExpr === void 0 ? void 0 : matchingTimeExpr.rangeEnd,
                        crossesMidnight: crossesMidnight || undefined,
                    };
                    result.parsedExpressions.push(expression);
                    // Set the appropriate date field based on type
                    switch (type) {
                        case "start":
                            if (!result.startDate)
                                result.startDate = date;
                            break;
                        case "due":
                            if (!result.dueDate)
                                result.dueDate = date;
                            break;
                        case "scheduled":
                            if (!result.scheduledDate)
                                result.scheduledDate = date;
                            break;
                        default:
                            console.warn("TimeParsingService: Unknown date type:", type);
                            break;
                    }
                }
                catch (expressionError) {
                    console.warn("TimeParsingService: Error processing expression:", expressionError);
                    continue;
                }
            }
            // Clean the text by removing parsed expressions
            result.cleanedText = this.cleanTextFromTimeExpressions(text, result.parsedExpressions);
        }
        catch (error) {
            console.warn("Time parsing error:", error);
            // Return original text if parsing fails
        }
        finally {
            // Cache the result for future use
            this.cacheResult(cacheKey, result);
        }
        return result;
    }
    /**
     * Generate a cache key for the given text and current configuration
     */
    generateCacheKey(text) {
        // Include configuration hash to invalidate cache when config changes
        const configHash = JSON.stringify({
            enabled: this.config.enabled,
            removeOriginalText: this.config.removeOriginalText,
            supportedLanguages: this.config.supportedLanguages,
            dateKeywords: this.config.dateKeywords,
        });
        return `${text}|${configHash}`;
    }
    /**
     * Cache the parsing result with LRU eviction
     */
    cacheResult(key, result) {
        // Implement LRU cache eviction
        if (this.parseCache.size >= this.maxCacheSize) {
            // Remove the oldest entry (first entry in Map)
            const firstKey = this.parseCache.keys().next().value;
            if (firstKey) {
                this.parseCache.delete(firstKey);
            }
        }
        this.parseCache.set(key, result);
    }
    /**
     * Clear the parsing cache
     */
    clearCache() {
        this.parseCache.clear();
    }
    /**
     * Clean text by removing parsed time expressions
     * @param text - Original text
     * @param expressions - Parsed expressions to remove
     * @returns Cleaned text
     */
    cleanTextFromTimeExpressions(text, expressions) {
        var _a;
        if (!this.config.removeOriginalText || expressions.length === 0) {
            return text;
        }
        // Sort expressions by index in descending order to remove from end to start
        // This prevents index shifting issues when removing multiple expressions
        const sortedExpressions = [...expressions].sort((a, b) => b.index - a.index);
        let cleanedText = text;
        for (const expression of sortedExpressions) {
            const beforeExpression = cleanedText.substring(0, expression.index);
            const afterExpression = cleanedText.substring(expression.index + expression.length);
            // Check if we need to clean up extra whitespace
            let cleanedBefore = beforeExpression;
            let cleanedAfter = afterExpression;
            // Remove trailing whitespace from before text if the expression is at word boundary
            if (beforeExpression.endsWith(" ") &&
                afterExpression.startsWith(" ")) {
                cleanedAfter = afterExpression.trimStart();
            }
            else if (beforeExpression.endsWith(" ") &&
                !afterExpression.startsWith(" ")) {
                // Keep one space if there's no space after
                cleanedBefore = beforeExpression.trimEnd() + " ";
            }
            // Handle punctuation and spacing around time expressions
            // Case 1: "word, tomorrow, word" -> "word, word"
            // Case 2: "word tomorrow, word" -> "word word"
            // Case 3: "word, tomorrow word" -> "word word"
            // Check for punctuation before the expression
            const beforeHasPunctuation = cleanedBefore.match(/[,;]\s*$/);
            // Check for punctuation after the expression
            const afterHasPunctuation = cleanedAfter.match(/^[,;]\s*/);
            if (beforeHasPunctuation && afterHasPunctuation) {
                // Both sides have punctuation: "word, tomorrow, word" -> "word, word"
                cleanedBefore = cleanedBefore.replace(/[,;]\s*$/, "");
                const punctuation = ((_a = cleanedAfter.match(/^[,;]/)) === null || _a === void 0 ? void 0 : _a[0]) || "";
                cleanedAfter = cleanedAfter.replace(/^[,;]\s*/, "");
                if (cleanedAfter.trim()) {
                    cleanedBefore += punctuation + " ";
                }
            }
            else if (beforeHasPunctuation && !afterHasPunctuation) {
                // Only before has punctuation: "word, tomorrow word" -> "word word"
                cleanedBefore = cleanedBefore.replace(/[,;]\s*$/, "");
                if (cleanedAfter.trim() && !cleanedBefore.endsWith(" ")) {
                    cleanedBefore += " ";
                }
            }
            else if (!beforeHasPunctuation && afterHasPunctuation) {
                // Only after has punctuation: "word tomorrow, word" -> "word word"
                cleanedAfter = cleanedAfter.replace(/^[,;]\s*/, "");
                if (cleanedBefore &&
                    cleanedAfter.trim() &&
                    !cleanedBefore.endsWith(" ")) {
                    cleanedBefore += " ";
                }
            }
            else {
                // No punctuation around: "word tomorrow word" -> "word word"
                if (cleanedBefore &&
                    cleanedAfter.trim() &&
                    !cleanedBefore.endsWith(" ")) {
                    cleanedBefore += " ";
                }
            }
            cleanedText = cleanedBefore + cleanedAfter;
        }
        // Clean up multiple consecutive spaces and tabs, but preserve newlines
        cleanedText = cleanedText.replace(/[ \t]+/g, " ");
        // Only trim whitespace at the very beginning and end, preserving internal newlines
        cleanedText = cleanedText.replace(/^[ \t]+|[ \t]+$/g, "");
        return cleanedText;
    }
    /**
     * Update parsing configuration
     * @param config - New configuration
     */
    updateConfig(config) {
        this.config = Object.assign(Object.assign({}, this.config), config);
    }
    /**
     * Get current configuration
     * @returns Current configuration
     */
    getConfig() {
        return Object.assign({}, this.config);
    }
    /**
     * Determine the type of time expression based on surrounding context
     * @param text - Full text
     * @param expression - Time expression text
     * @param index - Position of expression in text
     * @returns Type of time expression
     */
    determineTimeType(text, expression, index) {
        // Get text before the expression (look back up to 20 characters)
        const beforeText = text
            .substring(Math.max(0, index - 20), index)
            .toLowerCase();
        // Get text after the expression (look ahead up to 20 characters)
        const afterText = text
            .substring(index + expression.length, Math.min(text.length, index + expression.length + 20))
            .toLowerCase();
        // Combine surrounding context
        const context = beforeText + " " + afterText;
        // Check for start keywords
        for (const keyword of this.config.dateKeywords.start) {
            if (context.includes(keyword.toLowerCase())) {
                return "start";
            }
        }
        // Check for due keywords
        for (const keyword of this.config.dateKeywords.due) {
            if (context.includes(keyword.toLowerCase())) {
                return "due";
            }
        }
        // Check for scheduled keywords
        for (const keyword of this.config.dateKeywords.scheduled) {
            if (context.includes(keyword.toLowerCase())) {
                return "scheduled";
            }
        }
        // Default to due date if no specific keywords found
        return "due";
    }
    /**
     * Parse Chinese time expressions using custom patterns
     * @param text - Text containing Chinese time expressions
     * @returns Array of parse results
     */
    parseChineseTimeExpressions(text) {
        const results = [];
        const usedIndices = new Set(); // Track used positions to avoid conflicts
        // Common Chinese date patterns - ordered from most specific to most general
        const chinesePatterns = [
            // 下周一, 下周二, ... 下周日 (支持星期和礼拜两种表达) - MUST come before general patterns
            /(?:下|上|这)(?:周|礼拜|星期)(?:一|二|三|四|五|六|日|天)/g,
            // 数字+天后, 数字+周后, 数字+月后
            /(\d+)[天周月]后/g,
            // 数字+天内, 数字+周内, 数字+月内
            /(\d+)[天周月]内/g,
            // 星期一, 星期二, ... 星期日
            /星期(?:一|二|三|四|五|六|日|天)/g,
            // 周一, 周二, ... 周日
            /周(?:一|二|三|四|五|六|日|天)/g,
            // 礼拜一, 礼拜二, ... 礼拜日
            /礼拜(?:一|二|三|四|五|六|日|天)/g,
            // 明天, 后天, 昨天, 前天
            /明天|后天|昨天|前天/g,
            // 下周, 上周, 这周 (general week patterns - MUST come after specific weekday patterns)
            /下周|上周|这周/g,
            // 下个月, 上个月, 这个月
            /下个?月|上个?月|这个?月/g,
            // 明年, 去年, 今年
            /明年|去年|今年/g,
        ];
        for (const pattern of chinesePatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const matchText = match[0];
                const matchIndex = match.index;
                const matchEnd = matchIndex + matchText.length;
                // Check if this position is already used by a more specific pattern
                let isOverlapping = false;
                for (let i = matchIndex; i < matchEnd; i++) {
                    if (usedIndices.has(i)) {
                        isOverlapping = true;
                        break;
                    }
                }
                if (isOverlapping) {
                    continue; // Skip this match as it overlaps with a more specific one
                }
                const date = this.parseChineseDate(matchText);
                if (date) {
                    // Mark this range as used
                    for (let i = matchIndex; i < matchEnd; i++) {
                        usedIndices.add(i);
                    }
                    results.push({
                        text: matchText,
                        index: matchIndex,
                        length: matchText.length,
                        start: {
                            date: () => date,
                        },
                    });
                }
            }
        }
        return results;
    }
    /**
     * Convert Chinese date expression to actual date
     * @param expression - Chinese date expression
     * @returns Date object or null
     */
    parseChineseDate(expression) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        // Helper function to get weekday number (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
        const getWeekdayNumber = (dayStr) => {
            var _a;
            const dayMap = {
                日: 0,
                天: 0,
                一: 1,
                二: 2,
                三: 3,
                四: 4,
                五: 5,
                六: 6,
            };
            return (_a = dayMap[dayStr]) !== null && _a !== void 0 ? _a : -1;
        };
        // Helper function to get date for specific weekday
        const getDateForWeekday = (targetWeekday, weekOffset = 0) => {
            const currentWeekday = today.getDay();
            let daysToAdd = targetWeekday - currentWeekday;
            // Add week offset
            daysToAdd += weekOffset * 7;
            // If we're looking for the same weekday in current week and it's already passed,
            // move to next week (except for "这周" which should stay in current week)
            if (weekOffset === 0 && daysToAdd <= 0) {
                daysToAdd += 7;
            }
            return new Date(today.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
        };
        // Handle weekday expressions
        const weekdayMatch = expression.match(/(?:(下|上|这)?(?:周|礼拜|星期)?)([一二三四五六日天])/);
        if (weekdayMatch) {
            const [, weekPrefix, dayStr] = weekdayMatch;
            const targetWeekday = getWeekdayNumber(dayStr);
            if (targetWeekday !== -1) {
                let weekOffset = 0;
                if (weekPrefix === "下") {
                    weekOffset = 1; // Next week
                }
                else if (weekPrefix === "上") {
                    weekOffset = -1; // Last week
                }
                else if (weekPrefix === "这") {
                    weekOffset = 0; // This week
                }
                else {
                    // No prefix (like "星期一", "周一", "礼拜一"), assume next occurrence
                    weekOffset = 0;
                }
                return getDateForWeekday(targetWeekday, weekOffset);
            }
        }
        switch (expression) {
            case "明天":
                return new Date(today.getTime() + 24 * 60 * 60 * 1000);
            case "后天":
                return new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
            case "昨天":
                return new Date(today.getTime() - 24 * 60 * 60 * 1000);
            case "前天":
                return new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
            case "下周":
                return new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
            case "上周":
                return new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            case "这周":
                return today;
            case "下个月":
            case "下月":
                return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
            case "上个月":
            case "上月":
                return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            case "这个月":
            case "这月":
                return today;
            case "明年":
                return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
            case "去年":
                return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            case "今年":
                return today;
            default:
                // Handle patterns like "3天后", "2周后", "1月后"
                const relativeMatch = expression.match(/(\d+)([天周月])[后内]/);
                if (relativeMatch) {
                    const num = parseInt(relativeMatch[1]);
                    const unit = relativeMatch[2];
                    switch (unit) {
                        case "天":
                            return new Date(today.getTime() + num * 24 * 60 * 60 * 1000);
                        case "周":
                            return new Date(today.getTime() + num * 7 * 24 * 60 * 60 * 1000);
                        case "月":
                            return new Date(now.getFullYear(), now.getMonth() + num, now.getDate());
                    }
                }
                return null;
        }
    }
}
// Default configuration
export const DEFAULT_TIME_PARSING_CONFIG = {
    enabled: true,
    supportedLanguages: ["en", "zh"],
    dateKeywords: {
        start: [
            "start",
            "begin",
            "from",
            "starting",
            "begins",
            "开始",
            "从",
            "起始",
            "起",
            "始于",
            "自",
        ],
        due: [
            "due",
            "deadline",
            "by",
            "until",
            "before",
            "expires",
            "ends",
            "截止",
            "到期",
            "之前",
            "期限",
            "最晚",
            "结束",
            "终止",
            "完成于",
        ],
        scheduled: [
            "scheduled",
            "on",
            "at",
            "planned",
            "set for",
            "arranged",
            "安排",
            "计划",
            "在",
            "定于",
            "预定",
            "约定",
            "设定",
        ],
    },
    removeOriginalText: true,
    perLineProcessing: true,
    realTimeReplacement: false,
    // Enhanced time parsing configuration
    timePatterns: {
        singleTime: [
            /\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/,
            /\b(1[0-2]|0?[1-9]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM|am|pm)\b/,
        ],
        timeRange: [
            /\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\s*[-~\uff5e]\s*([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/,
            /\b(1[0-2]|0?[1-9]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM|am|pm)?\s*[-~\uff5e]\s*(1[0-2]|0?[1-9]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM|am|pm)\b/,
        ],
        rangeSeparators: ["-", "~", "\uff5e", " - ", " ~ "],
    },
    timeDefaults: {
        preferredFormat: "24h",
        defaultPeriod: "PM",
        midnightCrossing: "next-day",
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZS1wYXJzaW5nLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0aW1lLXBhcnNpbmctc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSw0RUFBNEU7QUFDNUUsT0FBTyxLQUFLLE1BQU0sTUFBTSxhQUFhLENBQUM7QUFvRHRDLE1BQU0sT0FBTyxrQkFBa0I7SUF1QjlCLFlBQVksTUFBcUQ7UUFyQnpELGVBQVUsR0FHZCxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ04saUJBQVksR0FBVyxHQUFHLENBQUM7UUFFbkMsdUJBQXVCO1FBQ04sa0JBQWEsR0FBRztZQUNoQyxrQ0FBa0M7WUFDbEMsUUFBUSxFQUFFLGdEQUFnRDtZQUMxRCxzQ0FBc0M7WUFDdEMsUUFBUSxFQUNQLGdFQUFnRTtZQUNqRSxzREFBc0Q7WUFDdEQsVUFBVSxFQUNULG9HQUFvRztZQUNyRyxpQ0FBaUM7WUFDakMsY0FBYyxFQUNiLHFJQUFxSTtTQUN0SSxDQUFDO1FBR0QsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDdEIsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxtQkFBbUIsQ0FBQyxJQUFZO1FBSy9CLE1BQU0sTUFBTSxHQUF1QixFQUFFLENBQUM7UUFDdEMsTUFBTSxRQUFRLEdBQWEsRUFBRSxDQUFDO1FBRTlCLElBQUk7WUFDSCxNQUFNLEVBQUUsY0FBYyxFQUFFLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzVELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxDQUFDO1NBQzVDO1FBQUMsT0FBTyxLQUFLLEVBQUU7WUFDZixNQUFNLFNBQVMsR0FBcUI7Z0JBQ25DLElBQUksRUFBRSxnQkFBZ0I7Z0JBQ3RCLFlBQVksRUFBRSxJQUFJO2dCQUNsQixRQUFRLEVBQUUsQ0FBQztnQkFDWCxPQUFPLEVBQ04sS0FBSyxZQUFZLEtBQUs7b0JBQ3JCLENBQUMsQ0FBQyxLQUFL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QVM7WUFDVCxVQUFVO1lBQ1YsSUFBSTtZQUNKLElBQUk7WUFDSixHQUFHO1lBQ0gsSUFBSTtZQUNKLElBQUk7WUFDSixJQUFJO1lBQ0osSUFBSTtTQUNKO0tBQ0Q7SUFDRCxrQkFBa0IsRUFBRSxJQUFJO0lBQ3hCLGlCQUFpQixFQUFFLElBQUk7SUFDdkIsbUJBQW1CLEVBQUUsS0FBSztJQUMxQixzQ0FBc0M7SUFDdEMsWUFBWSxFQUFFO1FBQ2IsVUFBVSxFQUFFO1lBQ1gsK0NBQStDO1lBQy9DLCtEQUErRDtTQUMvRDtRQUNELFNBQVMsRUFBRTtZQUNWLHdHQUF3RztZQUN4Ryx5SUFBeUk7U0FDekk7UUFDRCxlQUFlLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDO0tBQ25EO0lBQ0QsWUFBWSxFQUFFO1FBQ2IsZUFBZSxFQUFFLEtBQUs7UUFDdEIsYUFBYSxFQUFFLElBQUk7UUFDbkIsZ0JBQWdCLEVBQUUsVUFBVTtLQUM1QjtDQUNELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBVc2UgcmVxdWlyZSBmb3IgY2hyb25vLW5vZGUgdG8gYXZvaWQgaW1wb3J0IGlzc3VlcyBpbiBicm93c2VyIGVudmlyb25tZW50XHJcbmltcG9ydCAqIGFzIGNocm9ubyBmcm9tIFwiY2hyb25vLW5vZGVcIjtcclxuaW1wb3J0IHR5cGUge1xyXG5cdFRpbWVDb21wb25lbnQsXHJcblx0RW5oYW5jZWRQYXJzZWRUaW1lUmVzdWx0LFxyXG5cdEVuaGFuY2VkVGltZUV4cHJlc3Npb24sXHJcblx0RW5oYW5jZWRUaW1lUGFyc2luZ0NvbmZpZyxcclxuXHRUaW1lUGFyc2luZ0Vycm9yLFxyXG59IGZyb20gXCIuLi90eXBlcy90aW1lLXBhcnNpbmdcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUGFyc2VkVGltZVJlc3VsdCB7XHJcblx0c3RhcnREYXRlPzogRGF0ZTtcclxuXHRkdWVEYXRlPzogRGF0ZTtcclxuXHRzY2hlZHVsZWREYXRlPzogRGF0ZTtcclxuXHRvcmlnaW5hbFRleHQ6IHN0cmluZztcclxuXHRjbGVhbmVkVGV4dDogc3RyaW5nO1xyXG5cdHBhcnNlZEV4cHJlc3Npb25zOiBBcnJheTx7XHJcblx0XHR0ZXh0OiBzdHJpbmc7XHJcblx0XHRkYXRlOiBEYXRlO1xyXG5cdFx0dHlwZTogXCJzdGFydFwiIHwgXCJkdWVcIiB8IFwic2NoZWR1bGVkXCI7XHJcblx0XHRpbmRleDogbnVtYmVyO1xyXG5cdFx0bGVuZ3RoOiBudW1iZXI7XHJcblx0fT47XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTGluZVBhcnNlUmVzdWx0IHtcclxuXHRvcmlnaW5hbExpbmU6IHN0cmluZztcclxuXHRjbGVhbmVkTGluZTogc3RyaW5nO1xyXG5cdHN0YXJ0RGF0ZT86IERhdGU7XHJcblx0ZHVlRGF0ZT86IERhdGU7XHJcblx0c2NoZWR1bGVkRGF0ZT86IERhdGU7XHJcblx0cGFyc2VkRXhwcmVzc2lvbnM6IEFycmF5PHtcclxuXHRcdHRleHQ6IHN0cmluZztcclxuXHRcdGRhdGU6IERhdGU7XHJcblx0XHR0eXBlOiBcInN0YXJ0XCIgfCBcImR1ZVwiIHwgXCJzY2hlZHVsZWRcIjtcclxuXHRcdGluZGV4OiBudW1iZXI7XHJcblx0XHRsZW5ndGg6IG51bWJlcjtcclxuXHR9PjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBUaW1lUGFyc2luZ0NvbmZpZyB7XHJcblx0ZW5hYmxlZDogYm9vbGVhbjtcclxuXHRzdXBwb3J0ZWRMYW5ndWFnZXM6IHN0cmluZ1tdO1xyXG5cdGRhdGVLZXl3b3Jkczoge1xyXG5cdFx0c3RhcnQ6IHN0cmluZ1tdO1xyXG5cdFx0ZHVlOiBzdHJpbmdbXTtcclxuXHRcdHNjaGVkdWxlZDogc3RyaW5nW107XHJcblx0fTtcclxuXHRyZW1vdmVPcmlnaW5hbFRleHQ6IGJvb2xlYW47XHJcblx0cGVyTGluZVByb2Nlc3Npbmc6IGJvb2xlYW47IC8vIEVuYWJsZSBwZXItbGluZSBwcm9jZXNzaW5nIGluc3RlYWQgb2YgZ2xvYmFsIHByb2Nlc3NpbmdcclxuXHRyZWFsVGltZVJlcGxhY2VtZW50OiBib29sZWFuOyAvLyBFbmFibGUgcmVhbC10aW1lIHJlcGxhY2VtZW50IGluIGVkaXRvclxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVGltZVBhcnNpbmdTZXJ2aWNlIHtcclxuXHRwcml2YXRlIGNvbmZpZzogVGltZVBhcnNpbmdDb25maWcgfCBFbmhhbmNlZFRpbWVQYXJzaW5nQ29uZmlnO1xyXG5cdHByaXZhdGUgcGFyc2VDYWNoZTogTWFwPFxyXG5cdFx0c3RyaW5nLFxyXG5cdFx0UGFyc2VkVGltZVJlc3VsdCB8IEVuaGFuY2VkUGFyc2VkVGltZVJlc3VsdFxyXG5cdD4gPSBuZXcgTWFwKCk7XHJcblx0cHJpdmF0ZSBtYXhDYWNoZVNpemU6IG51bWJlciA9IDEwMDtcclxuXHJcblx0Ly8gVGltZSBwYXR0ZXJuIHJlZ2V4ZXNcclxuXHRwcml2YXRlIHJlYWRvbmx5IFRJTUVfUEFUVEVSTlMgPSB7XHJcblx0XHQvLyAyNC1ob3VyIGZvcm1hdDogMTI6MDAsIDEyOjAwOjAwXHJcblx0XHRUSU1FXzI0SDogL1xcYihbMDFdP1xcZHwyWzAtM10pOihbMC01XVxcZCkoPzo6KFswLTVdXFxkKSk/XFxiL2csXHJcblx0XHQvLyAxMi1ob3VyIGZvcm1hdDogMTozMCBQTSwgMTozMDowMCBQTVxyXG5cdFx0VElNRV8xMkg6XHJcblx0XHRcdC9cXGIoMVswLTJdfDA/WzEtOV0pOihbMC01XVxcZCkoPzo6KFswLTVdXFxkKSk/XFxzKihBTXxQTXxhbXxwbSlcXGIvZyxcclxuXHRcdC8vIFRpbWUgcmFuZ2U6IDEyOjAwLTEzOjAwLCAxMjowMH4xMzowMCwgMTI6MDAgLSAxMzowMFxyXG5cdFx0VElNRV9SQU5HRTpcclxuXHRcdFx0L1xcYihbMDFdP1xcZHwyWzAtM10pOihbMC01XVxcZCkoPzo6KFswLTVdXFxkKSk/XFxzKlstfu+9nl1cXHMqKFswMV0/XFxkfDJbMC0zXSk6KFswLTVdXFxkKSg/OjooWzAtNV1cXGQpKT9cXGIvZyxcclxuXHRcdC8vIFRpbWUgcmFuZ2Ugd2l0aCAxMi1ob3VyIGZvcm1hdFxyXG5cdFx0VElNRV9SQU5HRV8xMkg6XHJcblx0XHRcdC9cXGIoMVswLTJdfDA/WzEtOV0pOihbMC01XVxcZCkoPzo6KFswLTVdXFxkKSk/XFxzKihBTXxQTXxhbXxwbSk/XFxzKlstfu+9nl1cXHMqKDFbMC0yXXwwP1sxLTldKTooWzAtNV1cXGQpKD86OihbMC01XVxcZCkpP1xccyooQU18UE18YW18cG0pXFxiL2csXHJcblx0fTtcclxuXHJcblx0Y29uc3RydWN0b3IoY29uZmlnOiBUaW1lUGFyc2luZ0NvbmZpZyB8IEVuaGFuY2VkVGltZVBhcnNpbmdDb25maWcpIHtcclxuXHRcdHRoaXMuY29uZmlnID0gY29uZmlnO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUGFyc2UgdGltZSBjb21wb25lbnRzIGZyb20gdGV4dCAocHVibGljIG1ldGhvZCBmb3Igc3VidGFzayAzLjEpXHJcblx0ICogQHBhcmFtIHRleHQgLSBUZXh0IGNvbnRhaW5pbmcgdGltZSBleHByZXNzaW9uc1xyXG5cdCAqIEByZXR1cm5zIE9iamVjdCB3aXRoIGV4dHJhY3RlZCB0aW1lIGNvbXBvbmVudHMgYW5kIG1ldGFkYXRhXHJcblx0ICovXHJcblx0cGFyc2VUaW1lQ29tcG9uZW50cyh0ZXh0OiBzdHJpbmcpOiB7XHJcblx0XHR0aW1lQ29tcG9uZW50czogRW5oYW5jZWRQYXJzZWRUaW1lUmVzdWx0W1widGltZUNvbXBvbmVudHNcIl07XHJcblx0XHRlcnJvcnM6IFRpbWVQYXJzaW5nRXJyb3JbXTtcclxuXHRcdHdhcm5pbmdzOiBzdHJpbmdbXTtcclxuXHR9IHtcclxuXHRcdGNvbnN0IGVycm9yczogVGltZVBhcnNpbmdFcnJvcltdID0gW107XHJcblx0XHRjb25zdCB3YXJuaW5nczogc3RyaW5nW10gPSBbXTtcclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCB7IHRpbWVDb21wb25lbnRzIH0gPSB0aGlzLmV4dHJhY3RUaW1lQ29tcG9uZW50cyh0ZXh0KTtcclxuXHRcdFx0cmV0dXJuIHsgdGltZUNvbXBvbmVudHMsIGVycm9ycywgd2FybmluZ3MgfTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnN0IHRpbWVFcnJvcjogVGltZVBhcnNpbmdFcnJvciA9IHtcclxuXHRcdFx0XHR0eXBlOiBcImludmFsaWQtZm9ybWF0XCIsXHJcblx0XHRcdFx0b3JpZ2luYWxUZXh0OiB0ZXh0LFxyXG5cdFx0XHRcdHBvc2l0aW9uOiAwLFxyXG5cdFx0XHRcdG1lc3NhZ2U6XHJcblx0XHRcdFx0XHRlcnJvciBpbnN0YW5jZW9mIEVycm9yXHJcblx0XHRcdFx0XHRcdD8gZXJyb3IubWVzc2FnZVxyXG5cdFx0XHRcdFx0XHQ6IFwiVW5rbm93biBlcnJvciBkdXJpbmcgdGltZSBwYXJzaW5nXCIsXHJcblx0XHRcdFx0ZmFsbGJhY2tVc2VkOiB0cnVlLFxyXG5cdFx0XHR9O1xyXG5cdFx0XHRlcnJvcnMucHVzaCh0aW1lRXJyb3IpO1xyXG5cclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHR0aW1lQ29tcG9uZW50czoge30sXHJcblx0XHRcdFx0ZXJyb3JzLFxyXG5cdFx0XHRcdHdhcm5pbmdzLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUGFyc2UgdGltZSBleHByZXNzaW9ucyBmcm9tIGEgc2luZ2xlIGxpbmUgYW5kIHJldHVybiBsaW5lLXNwZWNpZmljIHJlc3VsdFxyXG5cdCAqIEBwYXJhbSBsaW5lIC0gSW5wdXQgbGluZSBjb250YWluaW5nIHBvdGVudGlhbCB0aW1lIGV4cHJlc3Npb25zXHJcblx0ICogQHJldHVybnMgTGluZVBhcnNlUmVzdWx0IHdpdGggZXh0cmFjdGVkIGRhdGVzIGFuZCBjbGVhbmVkIGxpbmVcclxuXHQgKi9cclxuXHRwYXJzZVRpbWVFeHByZXNzaW9uc0ZvckxpbmUobGluZTogc3RyaW5nKTogTGluZVBhcnNlUmVzdWx0IHtcclxuXHRcdGNvbnN0IHJlc3VsdCA9IHRoaXMucGFyc2VUaW1lRXhwcmVzc2lvbnMobGluZSk7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRvcmlnaW5hbExpbmU6IGxpbmUsXHJcblx0XHRcdGNsZWFuZWRMaW5lOiByZXN1bHQuY2xlYW5lZFRleHQsXHJcblx0XHRcdHN0YXJ0RGF0ZTogcmVzdWx0LnN0YXJ0RGF0ZSxcclxuXHRcdFx0ZHVlRGF0ZTogcmVzdWx0LmR1ZURhdGUsXHJcblx0XHRcdHNjaGVkdWxlZERhdGU6IHJlc3VsdC5zY2hlZHVsZWREYXRlLFxyXG5cdFx0XHRwYXJzZWRFeHByZXNzaW9uczogcmVzdWx0LnBhcnNlZEV4cHJlc3Npb25zLFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFBhcnNlIHRpbWUgZXhwcmVzc2lvbnMgZnJvbSBtdWx0aXBsZSBsaW5lcyBhbmQgcmV0dXJuIGxpbmUtc3BlY2lmaWMgcmVzdWx0c1xyXG5cdCAqIEBwYXJhbSBsaW5lcyAtIEFycmF5IG9mIGxpbmVzIGNvbnRhaW5pbmcgcG90ZW50aWFsIHRpbWUgZXhwcmVzc2lvbnNcclxuXHQgKiBAcmV0dXJucyBBcnJheSBvZiBMaW5lUGFyc2VSZXN1bHQgd2l0aCBleHRyYWN0ZWQgZGF0ZXMgYW5kIGNsZWFuZWQgbGluZXNcclxuXHQgKi9cclxuXHRwYXJzZVRpbWVFeHByZXNzaW9uc1BlckxpbmUobGluZXM6IHN0cmluZ1tdKTogTGluZVBhcnNlUmVzdWx0W10ge1xyXG5cdFx0cmV0dXJuIGxpbmVzLm1hcCgobGluZSkgPT4gdGhpcy5wYXJzZVRpbWVFeHByZXNzaW9uc0ZvckxpbmUobGluZSkpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUGFyc2UgdGltZSBjb21wb25lbnQgZnJvbSB0ZXh0IChlLmcuLCBcIjEyOjAwXCIsIFwiMTozMCBQTVwiKVxyXG5cdCAqIEBwYXJhbSB0aW1lVGV4dCAtIFRpbWUgdGV4dCB0byBwYXJzZVxyXG5cdCAqIEByZXR1cm5zIFRpbWVDb21wb25lbnQgb3IgbnVsbCBpZiBpbnZhbGlkXHJcblx0ICovXHJcblx0cHJpdmF0ZSBwYXJzZVRpbWVDb21wb25lbnQodGltZVRleHQ6IHN0cmluZyk6IFRpbWVDb21wb25lbnQgfCBudWxsIHtcclxuXHRcdC8vIENsZWFuIGlucHV0XHJcblx0XHRjb25zdCBjbGVhbmVkVGV4dCA9IHRpbWVUZXh0LnRyaW0oKTtcclxuXHJcblx0XHQvLyBUcnkgMTItaG91ciBmb3JtYXQgZmlyc3QgKG1vcmUgc3BlY2lmaWMpXHJcblx0XHRjb25zdCBtYXRjaDEyaCA9IGNsZWFuZWRUZXh0Lm1hdGNoKFxyXG5cdFx0XHQvXigxWzAtMl18MD9bMS05XSk6KFswLTVdXFxkKSg/OjooWzAtNV1cXGQpKT9cXHMqKEFNfFBNfGFtfHBtKSQvaSxcclxuXHRcdCk7XHJcblx0XHRpZiAobWF0Y2gxMmgpIHtcclxuXHRcdFx0bGV0IGhvdXIgPSBwYXJzZUludChtYXRjaDEyaFsxXSwgMTApO1xyXG5cdFx0XHRjb25zdCBtaW51dGUgPSBwYXJzZUludChtYXRjaDEyaFsyXSwgMTApO1xyXG5cdFx0XHRjb25zdCBzZWNvbmQgPSBtYXRjaDEyaFszXSA/IHBhcnNlSW50KG1hdGNoMTJoWzNdLCAxMCkgOiB1bmRlZmluZWQ7XHJcblx0XHRcdGNvbnN0IHBlcmlvZCA9IG1hdGNoMTJoWzRdLnRvVXBwZXJDYXNlKCk7XHJcblxyXG5cdFx0XHQvLyBDb252ZXJ0IHRvIDI0LWhvdXIgZm9ybWF0XHJcblx0XHRcdGlmIChwZXJpb2QgPT09IFwiUE1cIiAmJiBob3VyICE9PSAxMikge1xyXG5cdFx0XHRcdGhvdXIgKz0gMTI7XHJcblx0XHRcdH0gZWxzZSBpZiAocGVyaW9kID09PSBcIkFNXCIgJiYgaG91ciA9PT0gMTIpIHtcclxuXHRcdFx0XHRob3VyID0gMDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRob3VyLFxyXG5cdFx0XHRcdG1pbnV0ZSxcclxuXHRcdFx0XHRzZWNvbmQsXHJcblx0XHRcdFx0b3JpZ2luYWxUZXh0OiBjbGVhbmVkVGV4dCxcclxuXHRcdFx0XHRpc1JhbmdlOiBmYWxzZSxcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBUcnkgMjQtaG91ciBmb3JtYXRcclxuXHRcdGNvbnN0IG1hdGNoMjRoID0gY2xlYW5lZFRleHQubWF0Y2goXHJcblx0XHRcdC9eKFswMV0/XFxkfDJbMC0zXSk6KFswLTVdXFxkKSg/OjooWzAtNV1cXGQpKT8kLyxcclxuXHRcdCk7XHJcblx0XHRpZiAobWF0Y2gyNGgpIHtcclxuXHRcdFx0bGV0IGhvdXIgPSBwYXJzZUludChtYXRjaDI0aFsxXSwgMTApO1xyXG5cdFx0XHRjb25zdCBtaW51dGUgPSBwYXJzZUludChtYXRjaDI0aFsyXSwgMTApO1xyXG5cdFx0XHRjb25zdCBzZWNvbmQgPSBtYXRjaDI0aFszXSA/IHBhcnNlSW50KG1hdGNoMjRoWzNdLCAxMCkgOiB1bmRlZmluZWQ7XHJcblxyXG5cdFx0XHQvLyBWYWxpZGF0ZSByYW5nZXNcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdGhvdXIgPiAyMyB8fFxyXG5cdFx0XHRcdG1pbnV0ZSA+IDU5IHx8XHJcblx0XHRcdFx0KHNlY29uZCAhPT0gdW5kZWZpbmVkICYmIHNlY29uZCA+IDU5KVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSGFuZGxlIGFtYmlndW91cyB0aW1lcyAoZS5nLiwgMzowMCBjb3VsZCBiZSBBTSBvciBQTSlcclxuXHRcdFx0Ly8gTm90ZTogT25seSBhcHBseSBkZWZhdWx0cyB3aGVuIGV4cGxpY2l0bHkgY29uZmlndXJlZCBhbmQgZm9yIHRydWx5IGFtYmlndW91cyB0aW1lc1xyXG5cdFx0XHRjb25zdCBpc0VuaGFuY2VkQ29uZmlnID0gKFxyXG5cdFx0XHRcdGNvbmZpZzogYW55LFxyXG5cdFx0XHQpOiBjb25maWcgaXMgRW5oYW5jZWRUaW1lUGFyc2luZ0NvbmZpZyA9PiB7XHJcblx0XHRcdFx0cmV0dXJuIGNvbmZpZyAmJiBcInRpbWVEZWZhdWx0c1wiIGluIGNvbmZpZztcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIENoZWNrIGlmIHRoaXMgaXMgYSB1c2VyLWNvbmZpZ3VyZWQgc2NlbmFyaW8gZm9yIGFtYmlndW91cyB0aW1lIGhhbmRsaW5nXHJcblx0XHRcdC8vIEZvciBub3csIHdlJ2xsIGtlZXAgMjQtaG91ciB0aW1lcyBhcy1pcyB1bmxlc3MgdGhlcmUncyBzcGVjaWZpYyBjb250ZXh0XHJcblxyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdGhvdXIsXHJcblx0XHRcdFx0bWludXRlLFxyXG5cdFx0XHRcdHNlY29uZCxcclxuXHRcdFx0XHRvcmlnaW5hbFRleHQ6IGNsZWFuZWRUZXh0LFxyXG5cdFx0XHRcdGlzUmFuZ2U6IGZhbHNlLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBudWxsO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRXh0cmFjdCB0aW1lIGNvbXBvbmVudHMgZnJvbSB0ZXh0XHJcblx0ICogQHBhcmFtIHRleHQgLSBUZXh0IGNvbnRhaW5pbmcgdGltZSBleHByZXNzaW9uc1xyXG5cdCAqIEByZXR1cm5zIE9iamVjdCB3aXRoIGV4dHJhY3RlZCB0aW1lIGNvbXBvbmVudHNcclxuXHQgKi9cclxuXHRwcml2YXRlIGV4dHJhY3RUaW1lQ29tcG9uZW50cyh0ZXh0OiBzdHJpbmcpOiB7XHJcblx0XHR0aW1lQ29tcG9uZW50czogRW5oYW5jZWRQYXJzZWRUaW1lUmVzdWx0W1widGltZUNvbXBvbmVudHNcIl07XHJcblx0XHR0aW1lRXhwcmVzc2lvbnM6IEFycmF5PHtcclxuXHRcdFx0dGV4dDogc3RyaW5nO1xyXG5cdFx0XHRpbmRleDogbnVtYmVyO1xyXG5cdFx0XHR0aW1lQ29tcG9uZW50PzogVGltZUNvbXBvbmVudDtcclxuXHRcdFx0aXNSYW5nZTogYm9vbGVhbjtcclxuXHRcdFx0cmFuZ2VTdGFydD86IFRpbWVDb21wb25lbnQ7XHJcblx0XHRcdHJhbmdlRW5kPzogVGltZUNvbXBvbmVudDtcclxuXHRcdH0+O1xyXG5cdH0ge1xyXG5cdFx0Y29uc3QgdGltZUNvbXBvbmVudHM6IEVuaGFuY2VkUGFyc2VkVGltZVJlc3VsdFtcInRpbWVDb21wb25lbnRzXCJdID0ge307XHJcblx0XHRjb25zdCBjb21wb25lbnRTb3VyY2VzOiBQYXJ0aWFsPFxyXG5cdFx0XHRSZWNvcmQ8XHJcblx0XHRcdFx0a2V5b2YgTm9uTnVsbGFibGU8RW5oYW5jZWRQYXJzZWRUaW1lUmVzdWx0W1widGltZUNvbXBvbmVudHNcIl0+LFxyXG5cdFx0XHRcdFwiZXhwbGljaXRcIiB8IFwiaW5mZXJyZWRcIlxyXG5cdFx0XHQ+XHJcblx0XHQ+ID0ge307XHJcblx0XHRjb25zdCB0aW1lRXhwcmVzc2lvbnM6IEFycmF5PHtcclxuXHRcdFx0dGV4dDogc3RyaW5nO1xyXG5cdFx0XHRpbmRleDogbnVtYmVyO1xyXG5cdFx0XHR0aW1lQ29tcG9uZW50PzogVGltZUNvbXBvbmVudDtcclxuXHRcdFx0aXNSYW5nZTogYm9vbGVhbjtcclxuXHRcdFx0cmFuZ2VTdGFydD86IFRpbWVDb21wb25lbnQ7XHJcblx0XHRcdHJhbmdlRW5kPzogVGltZUNvbXBvbmVudDtcclxuXHRcdH0+ID0gW107XHJcblxyXG5cdFx0Ly8gQ2hlY2sgZm9yIHRpbWUgcmFuZ2VzIGZpcnN0ICh0aGV5IGNvbnRhaW4gc2luZ2xlIHRpbWVzIHRvbylcclxuXHRcdGNvbnN0IHJhbmdlTWF0Y2hlcyA9IFsuLi50ZXh0Lm1hdGNoQWxsKHRoaXMuVElNRV9QQVRURVJOUy5USU1FX1JBTkdFKV07XHJcblx0XHRjb25zdCByYW5nZTEyaE1hdGNoZXMgPSBbXHJcblx0XHRcdC4uLnRleHQubWF0Y2hBbGwodGhpcy5USU1FX1BBVFRFUk5TLlRJTUVfUkFOR0VfMTJIKSxcclxuXHRcdF07XHJcblxyXG5cdFx0Zm9yIChjb25zdCBtYXRjaCBvZiBbLi4ucmFuZ2VNYXRjaGVzLCAuLi5yYW5nZTEyaE1hdGNoZXNdKSB7XHJcblx0XHRcdGNvbnN0IGZ1bGxNYXRjaCA9IG1hdGNoWzBdO1xyXG5cdFx0XHRjb25zdCBpbmRleCA9IG1hdGNoLmluZGV4IHx8IDA7XHJcblxyXG5cdFx0XHQvLyBQYXJzZSBzdGFydCBhbmQgZW5kIHRpbWVzXHJcblx0XHRcdGNvbnN0IHBhcnRzID0gZnVsbE1hdGNoLnNwbGl0KC9cXHMqWy1+XFx1ZmY1ZV1cXHMqLyk7XHJcblx0XHRcdGlmIChwYXJ0cy5sZW5ndGggPT09IDIpIHtcclxuXHRcdFx0XHRjb25zdCBzdGFydFRpbWUgPSB0aGlzLnBhcnNlVGltZUNvbXBvbmVudChwYXJ0c1swXSk7XHJcblx0XHRcdFx0Y29uc3QgZW5kVGltZSA9IHRoaXMucGFyc2VUaW1lQ29tcG9uZW50KHBhcnRzWzFdKTtcclxuXHJcblx0XHRcdFx0aWYgKHN0YXJ0VGltZSAmJiBlbmRUaW1lKSB7XHJcblx0XHRcdFx0XHRzdGFydFRpbWUuaXNSYW5nZSA9IHRydWU7XHJcblx0XHRcdFx0XHRlbmRUaW1lLmlzUmFuZ2UgPSB0cnVlO1xyXG5cdFx0XHRcdFx0c3RhcnRUaW1lLnJhbmdlUGFydG5lciA9IGVuZFRpbWU7XHJcblx0XHRcdFx0XHRlbmRUaW1lLnJhbmdlUGFydG5lciA9IHN0YXJ0VGltZTtcclxuXHJcblx0XHRcdFx0XHR0aW1lRXhwcmVzc2lvbnMucHVzaCh7XHJcblx0XHRcdFx0XHRcdHRleHQ6IGZ1bGxNYXRjaCxcclxuXHRcdFx0XHRcdFx0aW5kZXgsXHJcblx0XHRcdFx0XHRcdGlzUmFuZ2U6IHRydWUsXHJcblx0XHRcdFx0XHRcdHJhbmdlU3RhcnQ6IHN0YXJ0VGltZSxcclxuXHRcdFx0XHRcdFx0cmFuZ2VFbmQ6IGVuZFRpbWUsXHJcblx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHQvLyBEZXRlcm1pbmUgY29udGV4dCBmb3IgdGltZSByYW5nZVxyXG5cdFx0XHRcdFx0Y29uc3QgY29udGV4dCA9IHRoaXMuZGV0ZXJtaW5lVGltZUNvbnRleHQoXHJcblx0XHRcdFx0XHRcdHRleHQsXHJcblx0XHRcdFx0XHRcdGZ1bGxNYXRjaCxcclxuXHRcdFx0XHRcdFx0aW5kZXgsXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0aWYgKGNvbnRleHQgPT09IFwic3RhcnRcIiB8fCAhdGltZUNvbXBvbmVudHMuc3RhcnRUaW1lKSB7XHJcblx0XHRcdFx0XHRcdHRpbWVDb21wb25lbnRzLnN0YXJ0VGltZSA9IHN0YXJ0VGltZTtcclxuXHRcdFx0XHRcdFx0dGltZUNvbXBvbmVudHMuZW5kVGltZSA9IGVuZFRpbWU7XHJcblx0XHRcdFx0XHRcdGNvbXBvbmVudFNvdXJjZXMuc3RhcnRUaW1lID1cclxuXHRcdFx0XHRcdFx0XHRjb250ZXh0ID09PSBcInN0YXJ0XCIgPyBcImV4cGxpY2l0XCIgOiBcImluZmVycmVkXCI7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2hlY2sgZm9yIHNpbmdsZSB0aW1lcyAobm90IHBhcnQgb2YgcmFuZ2VzKVxyXG5cdFx0Ly8gUHJvY2VzcyAxMi1ob3VyIGZvcm1hdCBmaXJzdCAobW9yZSBzcGVjaWZpYykgdG8gYXZvaWQgY29uZmxpY3RzXHJcblx0XHRjb25zdCB0aW1lMTJoTWF0Y2hlcyA9IFsuLi50ZXh0Lm1hdGNoQWxsKHRoaXMuVElNRV9QQVRURVJOUy5USU1FXzEySCldO1xyXG5cdFx0Y29uc3QgdGltZTI0aE1hdGNoZXMgPSBbLi4udGV4dC5tYXRjaEFsbCh0aGlzLlRJTUVfUEFUVEVSTlMuVElNRV8yNEgpXTtcclxuXHJcblx0XHQvLyBUcmFjayBwcm9jZXNzZWQgcG9zaXRpb25zIHRvIGF2b2lkIGR1cGxpY2F0ZXNcclxuXHRcdGNvbnN0IHByb2Nlc3NlZFBvc2l0aW9ucyA9IG5ldyBTZXQ8bnVtYmVyPigpO1xyXG5cclxuXHRcdC8vIFByb2Nlc3MgMTItaG91ciB0aW1lcyBmaXJzdFxyXG5cdFx0Zm9yIChjb25zdCBtYXRjaCBvZiB0aW1lMTJoTWF0Y2hlcykge1xyXG5cdFx0XHRjb25zdCBmdWxsTWF0Y2ggPSBtYXRjaFswXTtcclxuXHRcdFx0Y29uc3QgaW5kZXggPSBtYXRjaC5pbmRleCB8fCAwO1xyXG5cclxuXHRcdFx0Ly8gU2tpcCBpZiB0aGlzIHRpbWUgaXMgcGFydCBvZiBhIHJhbmdlIHdlIGFscmVhZHkgZm91bmRcclxuXHRcdFx0Y29uc3QgaXNQYXJ0T2ZSYW5nZSA9IHRpbWVFeHByZXNzaW9ucy5zb21lKFxyXG5cdFx0XHRcdChleHByKSA9PlxyXG5cdFx0XHRcdFx0ZXhwci5pc1JhbmdlICYmXHJcblx0XHRcdFx0XHRpbmRleCA+PSBleHByLmluZGV4ICYmXHJcblx0XHRcdFx0XHRpbmRleCA8IGV4cHIuaW5kZXggKyBleHByLnRleHQubGVuZ3RoLFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0aWYgKCFpc1BhcnRPZlJhbmdlKSB7XHJcblx0XHRcdFx0Y29uc3QgdGltZUNvbXBvbmVudCA9IHRoaXMucGFyc2VUaW1lQ29tcG9uZW50KGZ1bGxNYXRjaCk7XHJcblx0XHRcdFx0aWYgKHRpbWVDb21wb25lbnQpIHtcclxuXHRcdFx0XHRcdGNvbnN0IG5leHRDaGFyID0gdGV4dFtpbmRleCArIGZ1bGxNYXRjaC5sZW5ndGhdO1xyXG5cdFx0XHRcdFx0Y29uc3QgZm9sbG93aW5nQ2hhciA9IHRleHRbaW5kZXggKyBmdWxsTWF0Y2gubGVuZ3RoICsgMV07XHJcblx0XHRcdFx0XHRjb25zdCBwcmV2Q2hhciA9IGluZGV4ID4gMCA/IHRleHRbaW5kZXggLSAxXSA6IHVuZGVmaW5lZDtcclxuXHRcdFx0XHRcdGNvbnN0IHByZXZQcmV2Q2hhciA9XHJcblx0XHRcdFx0XHRcdGluZGV4ID4gMSA/IHRleHRbaW5kZXggLSAyXSA6IHVuZGVmaW5lZDtcclxuXHJcblx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdG5leHRDaGFyID09PSBcIjpcIiAmJlxyXG5cdFx0XHRcdFx0XHRmb2xsb3dpbmdDaGFyICE9PSB1bmRlZmluZWQgJiZcclxuXHRcdFx0XHRcdFx0L1xcZC8udGVzdChmb2xsb3dpbmdDaGFyKVxyXG5cdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdGlmIChuZXh0Q2hhciA9PT0gXCItXCIgJiYgZm9sbG93aW5nQ2hhciA9PT0gXCItXCIpIHtcclxuXHRcdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0aWYgKHByZXZDaGFyID09PSBcIi1cIiAmJiBwcmV2UHJldkNoYXIgPT09IFwiLVwiKSB7XHJcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdHByb2Nlc3NlZFBvc2l0aW9ucy5hZGQoaW5kZXgpO1xyXG5cdFx0XHRcdFx0dGltZUV4cHJlc3Npb25zLnB1c2goe1xyXG5cdFx0XHRcdFx0XHR0ZXh0OiBmdWxsTWF0Y2gsXHJcblx0XHRcdFx0XHRcdGluZGV4LFxyXG5cdFx0XHRcdFx0XHR0aW1lQ29tcG9uZW50LFxyXG5cdFx0XHRcdFx0XHRpc1JhbmdlOiBmYWxzZSxcclxuXHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdC8vIERldGVybWluZSBjb250ZXh0IGFuZCBhc3NpZ24gdG8gYXBwcm9wcmlhdGUgZmllbGRcclxuXHRcdFx0XHRcdGNvbnN0IGNvbnRleHQgPSB0aGlzLmRldGVybWluZVRpbWVDb250ZXh0KFxyXG5cdFx0XHRcdFx0XHR0ZXh0LFxyXG5cdFx0XHRcdFx0XHRmdWxsTWF0Y2gsXHJcblx0XHRcdFx0XHRcdGluZGV4LFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdHN3aXRjaCAoY29udGV4dCkge1xyXG5cdFx0XHRcdFx0XHRjYXNlIFwic3RhcnRcIjpcclxuXHRcdFx0XHRcdFx0XHR0aW1lQ29tcG9uZW50cy5zdGFydFRpbWUgPSB0aW1lQ29tcG9uZW50O1xyXG5cdFx0XHRcdFx0XHRcdGNvbXBvbmVudFNvdXJjZXMuc3RhcnRUaW1lID0gXCJleHBsaWNpdFwiO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHRjYXNlIFwiZHVlXCI6XHJcblx0XHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdFx0IXRpbWVDb21wb25lbnRzLmR1ZVRpbWUgfHxcclxuXHRcdFx0XHRcdFx0XHRcdGNvbXBvbmVudFNvdXJjZXMuZHVlVGltZSAhPT0gXCJleHBsaWNpdFwiXHJcblx0XHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0XHR0aW1lQ29tcG9uZW50cy5kdWVUaW1lID0gdGltZUNvbXBvbmVudDtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbXBvbmVudFNvdXJjZXMuZHVlVGltZSA9IFwiZXhwbGljaXRcIjtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcdGNhc2UgXCJzY2hlZHVsZWRcIjpcclxuXHRcdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0XHQhdGltZUNvbXBvbmVudHMuc2NoZWR1bGVkVGltZSB8fFxyXG5cdFx0XHRcdFx0XHRcdFx0Y29tcG9uZW50U291cmNlcy5zY2hlZHVsZWRUaW1lICE9PSBcImV4cGxpY2l0XCJcclxuXHRcdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHRpbWVDb21wb25lbnRzLnNjaGVkdWxlZFRpbWUgPSB0aW1lQ29tcG9uZW50O1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29tcG9uZW50U291cmNlcy5zY2hlZHVsZWRUaW1lID0gXCJleHBsaWNpdFwiO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBQcm9jZXNzIDI0LWhvdXIgdGltZXMgKHNraXAgaWYgYWxyZWFkeSBwcm9jZXNzZWQgYXMgMTItaG91cilcclxuXHRcdGZvciAoY29uc3QgbWF0Y2ggb2YgdGltZTI0aE1hdGNoZXMpIHtcclxuXHRcdFx0Y29uc3QgZnVsbE1hdGNoID0gbWF0Y2hbMF07XHJcblx0XHRcdGNvbnN0IGluZGV4ID0gbWF0Y2guaW5kZXggfHwgMDtcclxuXHJcblx0XHRcdC8vIFNraXAgaWYgYWxyZWFkeSBwcm9jZXNzZWQgYXMgMTItaG91ciBmb3JtYXRcclxuXHRcdFx0aWYgKHByb2Nlc3NlZFBvc2l0aW9ucy5oYXMoaW5kZXgpKSB7XHJcblx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFNraXAgaWYgdGhpcyB0aW1lIGlzIHBhcnQgb2YgYSByYW5nZSB3ZSBhbHJlYWR5IGZvdW5kXHJcblx0XHRcdGNvbnN0IGlzUGFydE9mUmFuZ2UgPSB0aW1lRXhwcmVzc2lvbnMuc29tZShcclxuXHRcdFx0XHQoZXhwcikgPT5cclxuXHRcdFx0XHRcdGV4cHIuaXNSYW5nZSAmJlxyXG5cdFx0XHRcdFx0aW5kZXggPj0gZXhwci5pbmRleCAmJlxyXG5cdFx0XHRcdFx0aW5kZXggPCBleHByLmluZGV4ICsgZXhwci50ZXh0Lmxlbmd0aCxcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGlmICghaXNQYXJ0T2ZSYW5nZSkge1xyXG5cdFx0XHRcdGNvbnN0IHRpbWVDb21wb25lbnQgPSB0aGlzLnBhcnNlVGltZUNvbXBvbmVudChmdWxsTWF0Y2gpO1xyXG5cdFx0XHRcdGlmICh0aW1lQ29tcG9uZW50KSB7XHJcblx0XHRcdFx0XHRjb25zdCBuZXh0Q2hhciA9IHRleHRbaW5kZXggKyBmdWxsTWF0Y2gubGVuZ3RoXTtcclxuXHRcdFx0XHRcdGNvbnN0IGZvbGxvd2luZ0NoYXIgPSB0ZXh0W2luZGV4ICsgZnVsbE1hdGNoLmxlbmd0aCArIDFdO1xyXG5cdFx0XHRcdFx0Y29uc3QgcHJldkNoYXIgPSBpbmRleCA+IDAgPyB0ZXh0W2luZGV4IC0gMV0gOiB1bmRlZmluZWQ7XHJcblx0XHRcdFx0XHRjb25zdCBwcmV2UHJldkNoYXIgPVxyXG5cdFx0XHRcdFx0XHRpbmRleCA+IDEgPyB0ZXh0W2luZGV4IC0gMl0gOiB1bmRlZmluZWQ7XHJcblxyXG5cdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRuZXh0Q2hhciA9PT0gXCI6XCIgJiZcclxuXHRcdFx0XHRcdFx0Zm9sbG93aW5nQ2hhciAhPT0gdW5kZWZpbmVkICYmXHJcblx0XHRcdFx0XHRcdC9cXGQvLnRlc3QoZm9sbG93aW5nQ2hhcilcclxuXHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRpZiAobmV4dENoYXIgPT09IFwiLVwiICYmIGZvbGxvd2luZ0NoYXIgPT09IFwiLVwiKSB7XHJcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdGlmIChwcmV2Q2hhciA9PT0gXCItXCIgJiYgcHJldlByZXZDaGFyID09PSBcIi1cIikge1xyXG5cdFx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHR0aW1lRXhwcmVzc2lvbnMucHVzaCh7XHJcblx0XHRcdFx0XHRcdHRleHQ6IGZ1bGxNYXRjaCxcclxuXHRcdFx0XHRcdFx0aW5kZXgsXHJcblx0XHRcdFx0XHRcdHRpbWVDb21wb25lbnQsXHJcblx0XHRcdFx0XHRcdGlzUmFuZ2U6IGZhbHNlLFxyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gRGV0ZXJtaW5lIGNvbnRleHQgYW5kIGFzc2lnbiB0byBhcHByb3ByaWF0ZSBmaWVsZFxyXG5cdFx0XHRcdFx0Y29uc3QgY29udGV4dCA9IHRoaXMuZGV0ZXJtaW5lVGltZUNvbnRleHQoXHJcblx0XHRcdFx0XHRcdHRleHQsXHJcblx0XHRcdFx0XHRcdGZ1bGxNYXRjaCxcclxuXHRcdFx0XHRcdFx0aW5kZXgsXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0c3dpdGNoIChjb250ZXh0KSB7XHJcblx0XHRcdFx0XHRcdGNhc2UgXCJzdGFydFwiOlxyXG5cdFx0XHRcdFx0XHRcdHRpbWVDb21wb25lbnRzLnN0YXJ0VGltZSA9IHRpbWVDb21wb25lbnQ7XHJcblx0XHRcdFx0XHRcdFx0Y29tcG9uZW50U291cmNlcy5zdGFydFRpbWUgPSBcImV4cGxpY2l0XCI7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcdGNhc2UgXCJkdWVcIjpcclxuXHRcdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0XHQhdGltZUNvbXBvbmVudHMuZHVlVGltZSB8fFxyXG5cdFx0XHRcdFx0XHRcdFx0Y29tcG9uZW50U291cmNlcy5kdWVUaW1lICE9PSBcImV4cGxpY2l0XCJcclxuXHRcdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHRpbWVDb21wb25lbnRzLmR1ZVRpbWUgPSB0aW1lQ29tcG9uZW50O1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29tcG9uZW50U291cmNlcy5kdWVUaW1lID0gXCJleHBsaWNpdFwiO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFx0Y2FzZSBcInNjaGVkdWxlZFwiOlxyXG5cdFx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHRcdCF0aW1lQ29tcG9uZW50cy5zY2hlZHVsZWRUaW1lIHx8XHJcblx0XHRcdFx0XHRcdFx0XHRjb21wb25lbnRTb3VyY2VzLnNjaGVkdWxlZFRpbWUgIT09IFwiZXhwbGljaXRcIlxyXG5cdFx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0dGltZUNvbXBvbmVudHMuc2NoZWR1bGVkVGltZSA9IHRpbWVDb21wb25lbnQ7XHJcblx0XHRcdFx0XHRcdFx0XHRjb21wb25lbnRTb3VyY2VzLnNjaGVkdWxlZFRpbWUgPSBcImV4cGxpY2l0XCI7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0aW1lQ29tcG9uZW50cy5zdGFydFRpbWUgJiYgIXRpbWVDb21wb25lbnRzLnNjaGVkdWxlZFRpbWUpIHtcclxuXHRcdFx0dGltZUNvbXBvbmVudHMuc2NoZWR1bGVkVGltZSA9IHRpbWVDb21wb25lbnRzLnN0YXJ0VGltZTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4geyB0aW1lQ29tcG9uZW50cywgdGltZUV4cHJlc3Npb25zIH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBEZXRlcm1pbmUgdGltZSBjb250ZXh0IGJhc2VkIG9uIHN1cnJvdW5kaW5nIGtleXdvcmRzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBkZXRlcm1pbmVUaW1lQ29udGV4dChcclxuXHRcdHRleHQ6IHN0cmluZyxcclxuXHRcdGV4cHJlc3Npb246IHN0cmluZyxcclxuXHRcdGluZGV4OiBudW1iZXIsXHJcblx0KTogXCJzdGFydFwiIHwgXCJkdWVcIiB8IFwic2NoZWR1bGVkXCIge1xyXG5cdFx0Ly8gR2V0IHRleHQgYmVmb3JlIHRoZSBleHByZXNzaW9uIChsb29rIGJhY2sgdXAgdG8gMjAgY2hhcmFjdGVycylcclxuXHRcdGNvbnN0IGJlZm9yZVRleHQgPSB0ZXh0XHJcblx0XHRcdC5zdWJzdHJpbmcoTWF0aC5tYXgoMCwgaW5kZXggLSAyMCksIGluZGV4KVxyXG5cdFx0XHQudG9Mb3dlckNhc2UoKTtcclxuXHJcblx0XHQvLyBHZXQgdGV4dCBhZnRlciB0aGUgZXhwcmVzc2lvbiAobG9vayBhaGVhZCB1cCB0byAyMCBjaGFyYWN0ZXJzKVxyXG5cdFx0Y29uc3QgYWZ0ZXJUZXh0ID0gdGV4dFxyXG5cdFx0XHQuc3Vic3RyaW5nKFxyXG5cdFx0XHRcdGluZGV4ICsgZXhwcmVzc2lvbi5sZW5ndGgsXHJcblx0XHRcdFx0TWF0aC5taW4odGV4dC5sZW5ndGgsIGluZGV4ICsgZXhwcmVzc2lvbi5sZW5ndGggKyAyMCksXHJcblx0XHRcdClcclxuXHRcdFx0LnRvTG93ZXJDYXNlKCk7XHJcblxyXG5cdFx0Ly8gQ29tYmluZSBzdXJyb3VuZGluZyBjb250ZXh0XHJcblx0XHRjb25zdCBjb250ZXh0ID0gYmVmb3JlVGV4dCArIFwiIFwiICsgYWZ0ZXJUZXh0O1xyXG5cclxuXHRcdC8vIENoZWNrIGZvciBzdGFydCBrZXl3b3JkcyBmaXJzdCAobW9zdCBzcGVjaWZpYylcclxuXHRcdGZvciAoY29uc3Qga2V5d29yZCBvZiB0aGlzLmNvbmZpZy5kYXRlS2V5d29yZHMuc3RhcnQpIHtcclxuXHRcdFx0aWYgKGNvbnRleHQuaW5jbHVkZXMoa2V5d29yZC50b0xvd2VyQ2FzZSgpKSkge1xyXG5cdFx0XHRcdHJldHVybiBcInN0YXJ0XCI7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBDaGVjayBmb3Igc2NoZWR1bGVkIGtleXdvcmRzIChpbmNsdWRpbmcgXCJhdFwiKVxyXG5cdFx0Zm9yIChjb25zdCBrZXl3b3JkIG9mIHRoaXMuY29uZmlnLmRhdGVLZXl3b3Jkcy5zY2hlZHVsZWQpIHtcclxuXHRcdFx0aWYgKGNvbnRleHQuaW5jbHVkZXMoa2V5d29yZC50b0xvd2VyQ2FzZSgpKSkge1xyXG5cdFx0XHRcdHJldHVybiBcInNjaGVkdWxlZFwiO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2hlY2sgZm9yIGR1ZSBrZXl3b3Jkc1xyXG5cdFx0Zm9yIChjb25zdCBrZXl3b3JkIG9mIHRoaXMuY29uZmlnLmRhdGVLZXl3b3Jkcy5kdWUpIHtcclxuXHRcdFx0aWYgKGNvbnRleHQuaW5jbHVkZXMoa2V5d29yZC50b0xvd2VyQ2FzZSgpKSkge1xyXG5cdFx0XHRcdHJldHVybiBcImR1ZVwiO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRGVmYXVsdCBiYXNlZCBvbiBjb21tb24gcGF0dGVybnNcclxuXHRcdGlmIChjb250ZXh0LmluY2x1ZGVzKFwiYXRcIikgfHwgY29udGV4dC5pbmNsdWRlcyhcIkBcIikpIHtcclxuXHRcdFx0cmV0dXJuIFwic2NoZWR1bGVkXCI7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRGVmYXVsdCB0byBkdWUgaWYgbm8gc3BlY2lmaWMgY29udGV4dCBmb3VuZFxyXG5cdFx0cmV0dXJuIFwiZHVlXCI7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBQYXJzZSB0aW1lIGV4cHJlc3Npb25zIGZyb20gdGV4dCBhbmQgcmV0dXJuIHN0cnVjdHVyZWQgcmVzdWx0XHJcblx0ICogQHBhcmFtIHRleHQgLSBJbnB1dCB0ZXh0IGNvbnRhaW5pbmcgcG90ZW50aWFsIHRpbWUgZXhwcmVzc2lvbnNcclxuXHQgKiBAcmV0dXJucyBQYXJzZWRUaW1lUmVzdWx0IHdpdGggZXh0cmFjdGVkIGRhdGVzIGFuZCBjbGVhbmVkIHRleHRcclxuXHQgKi9cclxuXHRwYXJzZVRpbWVFeHByZXNzaW9ucyhcclxuXHRcdHRleHQ6IHN0cmluZyxcclxuXHQpOiBQYXJzZWRUaW1lUmVzdWx0IHwgRW5oYW5jZWRQYXJzZWRUaW1lUmVzdWx0IHtcclxuXHRcdGNvbnN0IHNhZmVUZXh0ID0gdGV4dCA/PyBcIlwiO1xyXG5cclxuXHRcdGlmICghdGhpcy5jb25maWcuZW5hYmxlZCkge1xyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdG9yaWdpbmFsVGV4dDogc2FmZVRleHQsXHJcblx0XHRcdFx0Y2xlYW5lZFRleHQ6IHNhZmVUZXh0LFxyXG5cdFx0XHRcdHBhcnNlZEV4cHJlc3Npb25zOiBbXSxcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDaGVjayBjYWNoZSBmaXJzdFxyXG5cdFx0Y29uc3QgY2FjaGVLZXkgPSB0aGlzLmdlbmVyYXRlQ2FjaGVLZXkoc2FmZVRleHQpO1xyXG5cdFx0aWYgKHRoaXMucGFyc2VDYWNoZS5oYXMoY2FjaGVLZXkpKSB7XHJcblx0XHRcdHJldHVybiB0aGlzLnBhcnNlQ2FjaGUuZ2V0KGNhY2hlS2V5KSE7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRXh0cmFjdCB0aW1lIGNvbXBvbmVudHMgZmlyc3RcclxuXHRcdGNvbnN0IHsgdGltZUNvbXBvbmVudHMsIHRpbWVFeHByZXNzaW9ucyB9ID1cclxuXHRcdFx0dGhpcy5leHRyYWN0VGltZUNvbXBvbmVudHMoc2FmZVRleHQpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBlbmhhbmNlZCByZXN1bHQgaWYgdGltZSBjb21wb25lbnRzIGZvdW5kXHJcblx0XHRjb25zdCByZXN1bHQ6IEVuaGFuY2VkUGFyc2VkVGltZVJlc3VsdCA9IHtcclxuXHRcdFx0b3JpZ2luYWxUZXh0OiBzYWZlVGV4dCxcclxuXHRcdFx0Y2xlYW5lZFRleHQ6IHNhZmVUZXh0LFxyXG5cdFx0XHRwYXJzZWRFeHByZXNzaW9uczogW10sXHJcblx0XHRcdHRpbWVDb21wb25lbnRzOiB0aW1lQ29tcG9uZW50cyxcclxuXHRcdH07XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0aWYgKHNhZmVUZXh0LnRyaW0oKS5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBQYXJzZSBhbGwgZGF0ZSBleHByZXNzaW9ucyB1c2luZyBjaHJvbm8tbm9kZVxyXG5cdFx0XHQvLyBGb3IgYmV0dGVyIENoaW5lc2Ugc3VwcG9ydCwgd2UgY2FuIHVzZSBzcGVjaWZpYyBsb2NhbGUgcGFyc2Vyc1xyXG5cdFx0XHRjb25zdCBjaHJvbm9Nb2R1bGUgPSBjaHJvbm87XHJcblx0XHRcdGxldCBwYXJzZVJlc3VsdHM7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0cGFyc2VSZXN1bHRzID0gY2hyb25vTW9kdWxlLnBhcnNlKHNhZmVUZXh0KTtcclxuXHRcdFx0fSBjYXRjaCAoY2hyb25vRXJyb3IpIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRcIlRpbWVQYXJzaW5nU2VydmljZTogQ2hyb25vIHBhcnNpbmcgZmFpbGVkOlwiLFxyXG5cdFx0XHRcdFx0Y2hyb25vRXJyb3IsXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRwYXJzZVJlc3VsdHMgPSBbXTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSWYgbm8gcmVzdWx0cyBmb3VuZCB3aXRoIGRlZmF1bHQgcGFyc2VyIGFuZCB0ZXh0IGNvbnRhaW5zIENoaW5lc2UgY2hhcmFjdGVycyxcclxuXHRcdFx0Ly8gdHJ5IHdpdGggZGlmZmVyZW50IGxvY2FsZSBwYXJzZXJzIGFzIGZhbGxiYWNrXHJcblx0XHRcdGlmIChwYXJzZVJlc3VsdHMubGVuZ3RoID09PSAwICYmIC9bXFx1NGUwMC1cXHU5ZmZmXS8udGVzdChzYWZlVGV4dCkpIHtcclxuXHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0Ly8gVHJ5IENoaW5lc2UgdHJhZGl0aW9uYWwgKHpoLmhhbnQpIGZpcnN0IGlmIGF2YWlsYWJsZVxyXG5cdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRjaHJvbm9Nb2R1bGUuemggJiZcclxuXHRcdFx0XHRcdFx0Y2hyb25vTW9kdWxlLnpoLmhhbnQgJiZcclxuXHRcdFx0XHRcdFx0dHlwZW9mIGNocm9ub01vZHVsZS56aC5oYW50LnBhcnNlID09PSBcImZ1bmN0aW9uXCJcclxuXHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRjb25zdCB6aEhhbnRSZXN1bHQgPSBjaHJvbm9Nb2R1bGUuemgucGFyc2Uoc2FmZVRleHQpO1xyXG5cdFx0XHRcdFx0XHRpZiAoemhIYW50UmVzdWx0ICYmIHpoSGFudFJlc3VsdC5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0XHRcdFx0cGFyc2VSZXN1bHRzID0gemhIYW50UmVzdWx0O1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gSWYgc3RpbGwgbm8gcmVzdWx0cywgdHJ5IHNpbXBsaWZpZWQgQ2hpbmVzZSAoemgpIGlmIGF2YWlsYWJsZVxyXG5cdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRwYXJzZVJlc3VsdHMubGVuZ3RoID09PSAwICYmXHJcblx0XHRcdFx0XHRcdGNocm9ub01vZHVsZS56aCAmJlxyXG5cdFx0XHRcdFx0XHR0eXBlb2YgY2hyb25vTW9kdWxlLnpoLnBhcnNlID09PSBcImZ1bmN0aW9uXCJcclxuXHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRjb25zdCB6aFJlc3VsdCA9IGNocm9ub01vZHVsZS56aC5wYXJzZShzYWZlVGV4dCk7XHJcblx0XHRcdFx0XHRcdGlmICh6aFJlc3VsdCAmJiB6aFJlc3VsdC5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0XHRcdFx0cGFyc2VSZXN1bHRzID0gemhSZXN1bHQ7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBJZiBzdGlsbCBubyByZXN1bHRzLCBmYWxsYmFjayB0byBjdXN0b20gQ2hpbmVzZSBwYXJzaW5nXHJcblx0XHRcdFx0XHRpZiAocGFyc2VSZXN1bHRzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRcdFx0XHRwYXJzZVJlc3VsdHMgPVxyXG5cdFx0XHRcdFx0XHRcdHRoaXMucGFyc2VDaGluZXNlVGltZUV4cHJlc3Npb25zKHNhZmVUZXh0KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9IGNhdGNoIChjaGluZXNlUGFyc2luZ0Vycm9yKSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRcdFwiVGltZVBhcnNpbmdTZXJ2aWNlOiBDaGluZXNlIHBhcnNpbmcgZmFpbGVkOlwiLFxyXG5cdFx0XHRcdFx0XHRjaGluZXNlUGFyc2luZ0Vycm9yLFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdC8vIEZhbGxiYWNrIHRvIGN1c3RvbSBDaGluZXNlIHBhcnNpbmdcclxuXHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdHBhcnNlUmVzdWx0cyA9XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5wYXJzZUNoaW5lc2VUaW1lRXhwcmVzc2lvbnMoc2FmZVRleHQpO1xyXG5cdFx0XHRcdFx0fSBjYXRjaCAoY3VzdG9tUGFyc2luZ0Vycm9yKSB7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcdFx0XHRcIlRpbWVQYXJzaW5nU2VydmljZTogQ3VzdG9tIENoaW5lc2UgcGFyc2luZyBmYWlsZWQ6XCIsXHJcblx0XHRcdFx0XHRcdFx0Y3VzdG9tUGFyc2luZ0Vycm9yLFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRwYXJzZVJlc3VsdHMgPSBbXTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGZvciAoY29uc3QgcGFyc2VSZXN1bHQgb2YgcGFyc2VSZXN1bHRzKSB7XHJcblx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdC8vIFZhbGlkYXRlIHBhcnNlIHJlc3VsdCBzdHJ1Y3R1cmVcclxuXHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0IXBhcnNlUmVzdWx0IHx8XHJcblx0XHRcdFx0XHRcdCFwYXJzZVJlc3VsdC50ZXh0IHx8XHJcblx0XHRcdFx0XHRcdCFwYXJzZVJlc3VsdC5zdGFydFxyXG5cdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcdFx0XHRcIlRpbWVQYXJzaW5nU2VydmljZTogSW52YWxpZCBwYXJzZSByZXN1bHQgc3RydWN0dXJlOlwiLFxyXG5cdFx0XHRcdFx0XHRcdHBhcnNlUmVzdWx0LFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRjb25zdCBleHByZXNzaW9uVGV4dCA9IHBhcnNlUmVzdWx0LnRleHQ7XHJcblx0XHRcdFx0XHRsZXQgZGF0ZTtcclxuXHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdGRhdGUgPSBwYXJzZVJlc3VsdC5zdGFydC5kYXRlKCk7XHJcblx0XHRcdFx0XHR9IGNhdGNoIChkYXRlRXJyb3IpIHtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0XHRcdFwiVGltZVBhcnNpbmdTZXJ2aWNlOiBGYWlsZWQgdG8gZXh0cmFjdCBkYXRlIGZyb20gcGFyc2UgcmVzdWx0OlwiLFxyXG5cdFx0XHRcdFx0XHRcdGRhdGVFcnJvcixcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gVmFsaWRhdGUgdGhlIGV4dHJhY3RlZCBkYXRlXHJcblx0XHRcdFx0XHRpZiAoIWRhdGUgfHwgaXNOYU4oZGF0ZS5nZXRUaW1lKCkpKSB7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcdFx0XHRcIlRpbWVQYXJzaW5nU2VydmljZTogSW52YWxpZCBkYXRlIGV4dHJhY3RlZDpcIixcclxuXHRcdFx0XHRcdFx0XHRkYXRlLFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRjb25zdCBpbmRleCA9IHBhcnNlUmVzdWx0LmluZGV4ID8/IDA7XHJcblx0XHRcdFx0XHRjb25zdCBsZW5ndGggPSBleHByZXNzaW9uVGV4dC5sZW5ndGg7XHJcblxyXG5cdFx0XHRcdFx0Ly8gRGV0ZXJtaW5lIHRoZSB0eXBlIG9mIGRhdGUgYmFzZWQgb24ga2V5d29yZHMgaW4gdGhlIHN1cnJvdW5kaW5nIGNvbnRleHRcclxuXHRcdFx0XHRcdGxldCB0eXBlOiBcInN0YXJ0XCIgfCBcImR1ZVwiIHwgXCJzY2hlZHVsZWRcIjtcclxuXHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdHR5cGUgPSB0aGlzLmRldGVybWluZVRpbWVUeXBlKFxyXG5cdFx0XHRcdFx0XHRcdHNhZmVUZXh0LFxyXG5cdFx0XHRcdFx0XHRcdGV4cHJlc3Npb25UZXh0LFxyXG5cdFx0XHRcdFx0XHRcdGluZGV4LFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fSBjYXRjaCAodHlwZUVycm9yKSB7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcdFx0XHRcIlRpbWVQYXJzaW5nU2VydmljZTogRmFpbGVkIHRvIGRldGVybWluZSB0aW1lIHR5cGU6XCIsXHJcblx0XHRcdFx0XHRcdFx0dHlwZUVycm9yLFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHR0eXBlID0gXCJkdWVcIjsgLy8gRGVmYXVsdCBmYWxsYmFja1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIENoZWNrIGlmIHRoaXMgZGF0ZSBleHByZXNzaW9uIGhhcyBhbiBhc3NvY2lhdGVkIHRpbWUgY29tcG9uZW50XHJcblx0XHRcdFx0XHRsZXQgbWF0Y2hpbmdUaW1lRXhwciA9IHRpbWVFeHByZXNzaW9ucy5maW5kKFxyXG5cdFx0XHRcdFx0XHQodGUpID0+XHJcblx0XHRcdFx0XHRcdFx0dGUuaW5kZXggPj0gaW5kZXggLSAxMCAmJlxyXG5cdFx0XHRcdFx0XHRcdHRlLmluZGV4IDw9IGluZGV4ICsgbGVuZ3RoICsgMTAsXHJcblx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdC8vIENoZWNrIGlmIHRpbWUgcmFuZ2UgY3Jvc3NlcyBtaWRuaWdodFxyXG5cdFx0XHRcdFx0bGV0IGNyb3NzZXNNaWRuaWdodCA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRtYXRjaGluZ1RpbWVFeHByPy5yYW5nZVN0YXJ0ICYmXHJcblx0XHRcdFx0XHRcdG1hdGNoaW5nVGltZUV4cHI/LnJhbmdlRW5kXHJcblx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0Y3Jvc3Nlc01pZG5pZ2h0ID1cclxuXHRcdFx0XHRcdFx0XHRtYXRjaGluZ1RpbWVFeHByLnJhbmdlU3RhcnQuaG91ciA+XHJcblx0XHRcdFx0XHRcdFx0bWF0Y2hpbmdUaW1lRXhwci5yYW5nZUVuZC5ob3VyO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdGNvbnN0IGV4cHJlc3Npb246IEVuaGFuY2VkVGltZUV4cHJlc3Npb24gPSB7XHJcblx0XHRcdFx0XHRcdHRleHQ6IGV4cHJlc3Npb25UZXh0LFxyXG5cdFx0XHRcdFx0XHRkYXRlOiBkYXRlLFxyXG5cdFx0XHRcdFx0XHR0eXBlOiB0eXBlLFxyXG5cdFx0XHRcdFx0XHRpbmRleDogaW5kZXgsXHJcblx0XHRcdFx0XHRcdGxlbmd0aDogbGVuZ3RoLFxyXG5cdFx0XHRcdFx0XHR0aW1lQ29tcG9uZW50OiBtYXRjaGluZ1RpbWVFeHByPy50aW1lQ29tcG9uZW50LFxyXG5cdFx0XHRcdFx0XHRpc1RpbWVSYW5nZTogbWF0Y2hpbmdUaW1lRXhwcj8uaXNSYW5nZSB8fCBmYWxzZSxcclxuXHRcdFx0XHRcdFx0cmFuZ2VTdGFydDogbWF0Y2hpbmdUaW1lRXhwcj8ucmFuZ2VTdGFydCxcclxuXHRcdFx0XHRcdFx0cmFuZ2VFbmQ6IG1hdGNoaW5nVGltZUV4cHI/LnJhbmdlRW5kLFxyXG5cdFx0XHRcdFx0XHRjcm9zc2VzTWlkbmlnaHQ6IGNyb3NzZXNNaWRuaWdodCB8fCB1bmRlZmluZWQsXHJcblx0XHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRcdHJlc3VsdC5wYXJzZWRFeHByZXNzaW9ucy5wdXNoKGV4cHJlc3Npb24pO1xyXG5cclxuXHRcdFx0XHRcdC8vIFNldCB0aGUgYXBwcm9wcmlhdGUgZGF0ZSBmaWVsZCBiYXNlZCBvbiB0eXBlXHJcblx0XHRcdFx0XHRzd2l0Y2ggKHR5cGUpIHtcclxuXHRcdFx0XHRcdFx0Y2FzZSBcInN0YXJ0XCI6XHJcblx0XHRcdFx0XHRcdFx0aWYgKCFyZXN1bHQuc3RhcnREYXRlKSByZXN1bHQuc3RhcnREYXRlID0gZGF0ZTtcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFx0Y2FzZSBcImR1ZVwiOlxyXG5cdFx0XHRcdFx0XHRcdGlmICghcmVzdWx0LmR1ZURhdGUpIHJlc3VsdC5kdWVEYXRlID0gZGF0ZTtcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFx0Y2FzZSBcInNjaGVkdWxlZFwiOlxyXG5cdFx0XHRcdFx0XHRcdGlmICghcmVzdWx0LnNjaGVkdWxlZERhdGUpXHJcblx0XHRcdFx0XHRcdFx0XHRyZXN1bHQuc2NoZWR1bGVkRGF0ZSA9IGRhdGU7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0XHRcdFx0XCJUaW1lUGFyc2luZ1NlcnZpY2U6IFVua25vd24gZGF0ZSB0eXBlOlwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dHlwZSxcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0gY2F0Y2ggKGV4cHJlc3Npb25FcnJvcikge1xyXG5cdFx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0XHRcIlRpbWVQYXJzaW5nU2VydmljZTogRXJyb3IgcHJvY2Vzc2luZyBleHByZXNzaW9uOlwiLFxyXG5cdFx0XHRcdFx0XHRleHByZXNzaW9uRXJyb3IsXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBDbGVhbiB0aGUgdGV4dCBieSByZW1vdmluZyBwYXJzZWQgZXhwcmVzc2lvbnNcclxuXHRcdFx0cmVzdWx0LmNsZWFuZWRUZXh0ID0gdGhpcy5jbGVhblRleHRGcm9tVGltZUV4cHJlc3Npb25zKFxyXG5cdFx0XHRcdHRleHQsXHJcblx0XHRcdFx0cmVzdWx0LnBhcnNlZEV4cHJlc3Npb25zLFxyXG5cdFx0XHQpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFwiVGltZSBwYXJzaW5nIGVycm9yOlwiLCBlcnJvcik7XHJcblx0XHRcdC8vIFJldHVybiBvcmlnaW5hbCB0ZXh0IGlmIHBhcnNpbmcgZmFpbHNcclxuXHRcdH0gZmluYWxseSB7XHJcblx0XHRcdC8vIENhY2hlIHRoZSByZXN1bHQgZm9yIGZ1dHVyZSB1c2VcclxuXHRcdFx0dGhpcy5jYWNoZVJlc3VsdChjYWNoZUtleSwgcmVzdWx0KTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2VuZXJhdGUgYSBjYWNoZSBrZXkgZm9yIHRoZSBnaXZlbiB0ZXh0IGFuZCBjdXJyZW50IGNvbmZpZ3VyYXRpb25cclxuXHQgKi9cclxuXHRwcml2YXRlIGdlbmVyYXRlQ2FjaGVLZXkodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdC8vIEluY2x1ZGUgY29uZmlndXJhdGlvbiBoYXNoIHRvIGludmFsaWRhdGUgY2FjaGUgd2hlbiBjb25maWcgY2hhbmdlc1xyXG5cdFx0Y29uc3QgY29uZmlnSGFzaCA9IEpTT04uc3RyaW5naWZ5KHtcclxuXHRcdFx0ZW5hYmxlZDogdGhpcy5jb25maWcuZW5hYmxlZCxcclxuXHRcdFx0cmVtb3ZlT3JpZ2luYWxUZXh0OiB0aGlzLmNvbmZpZy5yZW1vdmVPcmlnaW5hbFRleHQsXHJcblx0XHRcdHN1cHBvcnRlZExhbmd1YWdlczogdGhpcy5jb25maWcuc3VwcG9ydGVkTGFuZ3VhZ2VzLFxyXG5cdFx0XHRkYXRlS2V5d29yZHM6IHRoaXMuY29uZmlnLmRhdGVLZXl3b3JkcyxcclxuXHRcdH0pO1xyXG5cdFx0cmV0dXJuIGAke3RleHR9fCR7Y29uZmlnSGFzaH1gO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2FjaGUgdGhlIHBhcnNpbmcgcmVzdWx0IHdpdGggTFJVIGV2aWN0aW9uXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjYWNoZVJlc3VsdChrZXk6IHN0cmluZywgcmVzdWx0OiBQYXJzZWRUaW1lUmVzdWx0KTogdm9pZCB7XHJcblx0XHQvLyBJbXBsZW1lbnQgTFJVIGNhY2hlIGV2aWN0aW9uXHJcblx0XHRpZiAodGhpcy5wYXJzZUNhY2hlLnNpemUgPj0gdGhpcy5tYXhDYWNoZVNpemUpIHtcclxuXHRcdFx0Ly8gUmVtb3ZlIHRoZSBvbGRlc3QgZW50cnkgKGZpcnN0IGVudHJ5IGluIE1hcClcclxuXHRcdFx0Y29uc3QgZmlyc3RLZXkgPSB0aGlzLnBhcnNlQ2FjaGUua2V5cygpLm5leHQoKS52YWx1ZTtcclxuXHRcdFx0aWYgKGZpcnN0S2V5KSB7XHJcblx0XHRcdFx0dGhpcy5wYXJzZUNhY2hlLmRlbGV0ZShmaXJzdEtleSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHRoaXMucGFyc2VDYWNoZS5zZXQoa2V5LCByZXN1bHQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2xlYXIgdGhlIHBhcnNpbmcgY2FjaGVcclxuXHQgKi9cclxuXHRjbGVhckNhY2hlKCk6IHZvaWQge1xyXG5cdFx0dGhpcy5wYXJzZUNhY2hlLmNsZWFyKCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDbGVhbiB0ZXh0IGJ5IHJlbW92aW5nIHBhcnNlZCB0aW1lIGV4cHJlc3Npb25zXHJcblx0ICogQHBhcmFtIHRleHQgLSBPcmlnaW5hbCB0ZXh0XHJcblx0ICogQHBhcmFtIGV4cHJlc3Npb25zIC0gUGFyc2VkIGV4cHJlc3Npb25zIHRvIHJlbW92ZVxyXG5cdCAqIEByZXR1cm5zIENsZWFuZWQgdGV4dFxyXG5cdCAqL1xyXG5cdGNsZWFuVGV4dEZyb21UaW1lRXhwcmVzc2lvbnMoXHJcblx0XHR0ZXh0OiBzdHJpbmcsXHJcblx0XHRleHByZXNzaW9uczogUGFyc2VkVGltZVJlc3VsdFtcInBhcnNlZEV4cHJlc3Npb25zXCJdLFxyXG5cdCk6IHN0cmluZyB7XHJcblx0XHRpZiAoIXRoaXMuY29uZmlnLnJlbW92ZU9yaWdpbmFsVGV4dCB8fCBleHByZXNzaW9ucy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0cmV0dXJuIHRleHQ7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU29ydCBleHByZXNzaW9ucyBieSBpbmRleCBpbiBkZXNjZW5kaW5nIG9yZGVyIHRvIHJlbW92ZSBmcm9tIGVuZCB0byBzdGFydFxyXG5cdFx0Ly8gVGhpcyBwcmV2ZW50cyBpbmRleCBzaGlmdGluZyBpc3N1ZXMgd2hlbiByZW1vdmluZyBtdWx0aXBsZSBleHByZXNzaW9uc1xyXG5cdFx0Y29uc3Qgc29ydGVkRXhwcmVzc2lvbnMgPSBbLi4uZXhwcmVzc2lvbnNdLnNvcnQoXHJcblx0XHRcdChhLCBiKSA9PiBiLmluZGV4IC0gYS5pbmRleCxcclxuXHRcdCk7XHJcblxyXG5cdFx0bGV0IGNsZWFuZWRUZXh0ID0gdGV4dDtcclxuXHJcblx0XHRmb3IgKGNvbnN0IGV4cHJlc3Npb24gb2Ygc29ydGVkRXhwcmVzc2lvbnMpIHtcclxuXHRcdFx0Y29uc3QgYmVmb3JlRXhwcmVzc2lvbiA9IGNsZWFuZWRUZXh0LnN1YnN0cmluZygwLCBleHByZXNzaW9uLmluZGV4KTtcclxuXHRcdFx0Y29uc3QgYWZ0ZXJFeHByZXNzaW9uID0gY2xlYW5lZFRleHQuc3Vic3RyaW5nKFxyXG5cdFx0XHRcdGV4cHJlc3Npb24uaW5kZXggKyBleHByZXNzaW9uLmxlbmd0aCxcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIENoZWNrIGlmIHdlIG5lZWQgdG8gY2xlYW4gdXAgZXh0cmEgd2hpdGVzcGFjZVxyXG5cdFx0XHRsZXQgY2xlYW5lZEJlZm9yZSA9IGJlZm9yZUV4cHJlc3Npb247XHJcblx0XHRcdGxldCBjbGVhbmVkQWZ0ZXIgPSBhZnRlckV4cHJlc3Npb247XHJcblxyXG5cdFx0XHQvLyBSZW1vdmUgdHJhaWxpbmcgd2hpdGVzcGFjZSBmcm9tIGJlZm9yZSB0ZXh0IGlmIHRoZSBleHByZXNzaW9uIGlzIGF0IHdvcmQgYm91bmRhcnlcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdGJlZm9yZUV4cHJlc3Npb24uZW5kc1dpdGgoXCIgXCIpICYmXHJcblx0XHRcdFx0YWZ0ZXJFeHByZXNzaW9uLnN0YXJ0c1dpdGgoXCIgXCIpXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdGNsZWFuZWRBZnRlciA9IGFmdGVyRXhwcmVzc2lvbi50cmltU3RhcnQoKTtcclxuXHRcdFx0fSBlbHNlIGlmIChcclxuXHRcdFx0XHRiZWZvcmVFeHByZXNzaW9uLmVuZHNXaXRoKFwiIFwiKSAmJlxyXG5cdFx0XHRcdCFhZnRlckV4cHJlc3Npb24uc3RhcnRzV2l0aChcIiBcIilcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0Ly8gS2VlcCBvbmUgc3BhY2UgaWYgdGhlcmUncyBubyBzcGFjZSBhZnRlclxyXG5cdFx0XHRcdGNsZWFuZWRCZWZvcmUgPSBiZWZvcmVFeHByZXNzaW9uLnRyaW1FbmQoKSArIFwiIFwiO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBIYW5kbGUgcHVuY3R1YXRpb24gYW5kIHNwYWNpbmcgYXJvdW5kIHRpbWUgZXhwcmVzc2lvbnNcclxuXHRcdFx0Ly8gQ2FzZSAxOiBcIndvcmQsIHRvbW9ycm93LCB3b3JkXCIgLT4gXCJ3b3JkLCB3b3JkXCJcclxuXHRcdFx0Ly8gQ2FzZSAyOiBcIndvcmQgdG9tb3Jyb3csIHdvcmRcIiAtPiBcIndvcmQgd29yZFwiXHJcblx0XHRcdC8vIENhc2UgMzogXCJ3b3JkLCB0b21vcnJvdyB3b3JkXCIgLT4gXCJ3b3JkIHdvcmRcIlxyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgZm9yIHB1bmN0dWF0aW9uIGJlZm9yZSB0aGUgZXhwcmVzc2lvblxyXG5cdFx0XHRjb25zdCBiZWZvcmVIYXNQdW5jdHVhdGlvbiA9IGNsZWFuZWRCZWZvcmUubWF0Y2goL1ssO11cXHMqJC8pO1xyXG5cdFx0XHQvLyBDaGVjayBmb3IgcHVuY3R1YXRpb24gYWZ0ZXIgdGhlIGV4cHJlc3Npb25cclxuXHRcdFx0Y29uc3QgYWZ0ZXJIYXNQdW5jdHVhdGlvbiA9IGNsZWFuZWRBZnRlci5tYXRjaCgvXlssO11cXHMqLyk7XHJcblxyXG5cdFx0XHRpZiAoYmVmb3JlSGFzUHVuY3R1YXRpb24gJiYgYWZ0ZXJIYXNQdW5jdHVhdGlvbikge1xyXG5cdFx0XHRcdC8vIEJvdGggc2lkZXMgaGF2ZSBwdW5jdHVhdGlvbjogXCJ3b3JkLCB0b21vcnJvdywgd29yZFwiIC0+IFwid29yZCwgd29yZFwiXHJcblx0XHRcdFx0Y2xlYW5lZEJlZm9yZSA9IGNsZWFuZWRCZWZvcmUucmVwbGFjZSgvWyw7XVxccyokLywgXCJcIik7XHJcblx0XHRcdFx0Y29uc3QgcHVuY3R1YXRpb24gPSBjbGVhbmVkQWZ0ZXIubWF0Y2goL15bLDtdLyk/LlswXSB8fCBcIlwiO1xyXG5cdFx0XHRcdGNsZWFuZWRBZnRlciA9IGNsZWFuZWRBZnRlci5yZXBsYWNlKC9eWyw7XVxccyovLCBcIlwiKTtcclxuXHRcdFx0XHRpZiAoY2xlYW5lZEFmdGVyLnRyaW0oKSkge1xyXG5cdFx0XHRcdFx0Y2xlYW5lZEJlZm9yZSArPSBwdW5jdHVhdGlvbiArIFwiIFwiO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIGlmIChiZWZvcmVIYXNQdW5jdHVhdGlvbiAmJiAhYWZ0ZXJIYXNQdW5jdHVhdGlvbikge1xyXG5cdFx0XHRcdC8vIE9ubHkgYmVmb3JlIGhhcyBwdW5jdHVhdGlvbjogXCJ3b3JkLCB0b21vcnJvdyB3b3JkXCIgLT4gXCJ3b3JkIHdvcmRcIlxyXG5cdFx0XHRcdGNsZWFuZWRCZWZvcmUgPSBjbGVhbmVkQmVmb3JlLnJlcGxhY2UoL1ssO11cXHMqJC8sIFwiXCIpO1xyXG5cdFx0XHRcdGlmIChjbGVhbmVkQWZ0ZXIudHJpbSgpICYmICFjbGVhbmVkQmVmb3JlLmVuZHNXaXRoKFwiIFwiKSkge1xyXG5cdFx0XHRcdFx0Y2xlYW5lZEJlZm9yZSArPSBcIiBcIjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSBpZiAoIWJlZm9yZUhhc1B1bmN0dWF0aW9uICYmIGFmdGVySGFzUHVuY3R1YXRpb24pIHtcclxuXHRcdFx0XHQvLyBPbmx5IGFmdGVyIGhhcyBwdW5jdHVhdGlvbjogXCJ3b3JkIHRvbW9ycm93LCB3b3JkXCIgLT4gXCJ3b3JkIHdvcmRcIlxyXG5cdFx0XHRcdGNsZWFuZWRBZnRlciA9IGNsZWFuZWRBZnRlci5yZXBsYWNlKC9eWyw7XVxccyovLCBcIlwiKTtcclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRjbGVhbmVkQmVmb3JlICYmXHJcblx0XHRcdFx0XHRjbGVhbmVkQWZ0ZXIudHJpbSgpICYmXHJcblx0XHRcdFx0XHQhY2xlYW5lZEJlZm9yZS5lbmRzV2l0aChcIiBcIilcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdGNsZWFuZWRCZWZvcmUgKz0gXCIgXCI7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIE5vIHB1bmN0dWF0aW9uIGFyb3VuZDogXCJ3b3JkIHRvbW9ycm93IHdvcmRcIiAtPiBcIndvcmQgd29yZFwiXHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0Y2xlYW5lZEJlZm9yZSAmJlxyXG5cdFx0XHRcdFx0Y2xlYW5lZEFmdGVyLnRyaW0oKSAmJlxyXG5cdFx0XHRcdFx0IWNsZWFuZWRCZWZvcmUuZW5kc1dpdGgoXCIgXCIpXHJcblx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRjbGVhbmVkQmVmb3JlICs9IFwiIFwiO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y2xlYW5lZFRleHQgPSBjbGVhbmVkQmVmb3JlICsgY2xlYW5lZEFmdGVyO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENsZWFuIHVwIG11bHRpcGxlIGNvbnNlY3V0aXZlIHNwYWNlcyBhbmQgdGFicywgYnV0IHByZXNlcnZlIG5ld2xpbmVzXHJcblx0XHRjbGVhbmVkVGV4dCA9IGNsZWFuZWRUZXh0LnJlcGxhY2UoL1sgXFx0XSsvZywgXCIgXCIpO1xyXG5cclxuXHRcdC8vIE9ubHkgdHJpbSB3aGl0ZXNwYWNlIGF0IHRoZSB2ZXJ5IGJlZ2lubmluZyBhbmQgZW5kLCBwcmVzZXJ2aW5nIGludGVybmFsIG5ld2xpbmVzXHJcblx0XHRjbGVhbmVkVGV4dCA9IGNsZWFuZWRUZXh0LnJlcGxhY2UoL15bIFxcdF0rfFsgXFx0XSskL2csIFwiXCIpO1xyXG5cclxuXHRcdHJldHVybiBjbGVhbmVkVGV4dDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBwYXJzaW5nIGNvbmZpZ3VyYXRpb25cclxuXHQgKiBAcGFyYW0gY29uZmlnIC0gTmV3IGNvbmZpZ3VyYXRpb25cclxuXHQgKi9cclxuXHR1cGRhdGVDb25maWcoY29uZmlnOiBQYXJ0aWFsPFRpbWVQYXJzaW5nQ29uZmlnPik6IHZvaWQge1xyXG5cdFx0dGhpcy5jb25maWcgPSB7IC4uLnRoaXMuY29uZmlnLCAuLi5jb25maWcgfTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBjdXJyZW50IGNvbmZpZ3VyYXRpb25cclxuXHQgKiBAcmV0dXJucyBDdXJyZW50IGNvbmZpZ3VyYXRpb25cclxuXHQgKi9cclxuXHRnZXRDb25maWcoKTogVGltZVBhcnNpbmdDb25maWcge1xyXG5cdFx0cmV0dXJuIHsgLi4udGhpcy5jb25maWcgfTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIERldGVybWluZSB0aGUgdHlwZSBvZiB0aW1lIGV4cHJlc3Npb24gYmFzZWQgb24gc3Vycm91bmRpbmcgY29udGV4dFxyXG5cdCAqIEBwYXJhbSB0ZXh0IC0gRnVsbCB0ZXh0XHJcblx0ICogQHBhcmFtIGV4cHJlc3Npb24gLSBUaW1lIGV4cHJlc3Npb24gdGV4dFxyXG5cdCAqIEBwYXJhbSBpbmRleCAtIFBvc2l0aW9uIG9mIGV4cHJlc3Npb24gaW4gdGV4dFxyXG5cdCAqIEByZXR1cm5zIFR5cGUgb2YgdGltZSBleHByZXNzaW9uXHJcblx0ICovXHJcblx0cHJpdmF0ZSBkZXRlcm1pbmVUaW1lVHlwZShcclxuXHRcdHRleHQ6IHN0cmluZyxcclxuXHRcdGV4cHJlc3Npb246IHN0cmluZyxcclxuXHRcdGluZGV4OiBudW1iZXIsXHJcblx0KTogXCJzdGFydFwiIHwgXCJkdWVcIiB8IFwic2NoZWR1bGVkXCIge1xyXG5cdFx0Ly8gR2V0IHRleHQgYmVmb3JlIHRoZSBleHByZXNzaW9uIChsb29rIGJhY2sgdXAgdG8gMjAgY2hhcmFjdGVycylcclxuXHRcdGNvbnN0IGJlZm9yZVRleHQgPSB0ZXh0XHJcblx0XHRcdC5zdWJzdHJpbmcoTWF0aC5tYXgoMCwgaW5kZXggLSAyMCksIGluZGV4KVxyXG5cdFx0XHQudG9Mb3dlckNhc2UoKTtcclxuXHJcblx0XHQvLyBHZXQgdGV4dCBhZnRlciB0aGUgZXhwcmVzc2lvbiAobG9vayBhaGVhZCB1cCB0byAyMCBjaGFyYWN0ZXJzKVxyXG5cdFx0Y29uc3QgYWZ0ZXJUZXh0ID0gdGV4dFxyXG5cdFx0XHQuc3Vic3RyaW5nKFxyXG5cdFx0XHRcdGluZGV4ICsgZXhwcmVzc2lvbi5sZW5ndGgsXHJcblx0XHRcdFx0TWF0aC5taW4odGV4dC5sZW5ndGgsIGluZGV4ICsgZXhwcmVzc2lvbi5sZW5ndGggKyAyMCksXHJcblx0XHRcdClcclxuXHRcdFx0LnRvTG93ZXJDYXNlKCk7XHJcblxyXG5cdFx0Ly8gQ29tYmluZSBzdXJyb3VuZGluZyBjb250ZXh0XHJcblx0XHRjb25zdCBjb250ZXh0ID0gYmVmb3JlVGV4dCArIFwiIFwiICsgYWZ0ZXJUZXh0O1xyXG5cclxuXHRcdC8vIENoZWNrIGZvciBzdGFydCBrZXl3b3Jkc1xyXG5cdFx0Zm9yIChjb25zdCBrZXl3b3JkIG9mIHRoaXMuY29uZmlnLmRhdGVLZXl3b3Jkcy5zdGFydCkge1xyXG5cdFx0XHRpZiAoY29udGV4dC5pbmNsdWRlcyhrZXl3b3JkLnRvTG93ZXJDYXNlKCkpKSB7XHJcblx0XHRcdFx0cmV0dXJuIFwic3RhcnRcIjtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENoZWNrIGZvciBkdWUga2V5d29yZHNcclxuXHRcdGZvciAoY29uc3Qga2V5d29yZCBvZiB0aGlzLmNvbmZpZy5kYXRlS2V5d29yZHMuZHVlKSB7XHJcblx0XHRcdGlmIChjb250ZXh0LmluY2x1ZGVzKGtleXdvcmQudG9Mb3dlckNhc2UoKSkpIHtcclxuXHRcdFx0XHRyZXR1cm4gXCJkdWVcIjtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENoZWNrIGZvciBzY2hlZHVsZWQga2V5d29yZHNcclxuXHRcdGZvciAoY29uc3Qga2V5d29yZCBvZiB0aGlzLmNvbmZpZy5kYXRlS2V5d29yZHMuc2NoZWR1bGVkKSB7XHJcblx0XHRcdGlmIChjb250ZXh0LmluY2x1ZGVzKGtleXdvcmQudG9Mb3dlckNhc2UoKSkpIHtcclxuXHRcdFx0XHRyZXR1cm4gXCJzY2hlZHVsZWRcIjtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIERlZmF1bHQgdG8gZHVlIGRhdGUgaWYgbm8gc3BlY2lmaWMga2V5d29yZHMgZm91bmRcclxuXHRcdHJldHVybiBcImR1ZVwiO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUGFyc2UgQ2hpbmVzZSB0aW1lIGV4cHJlc3Npb25zIHVzaW5nIGN1c3RvbSBwYXR0ZXJuc1xyXG5cdCAqIEBwYXJhbSB0ZXh0IC0gVGV4dCBjb250YWluaW5nIENoaW5lc2UgdGltZSBleHByZXNzaW9uc1xyXG5cdCAqIEByZXR1cm5zIEFycmF5IG9mIHBhcnNlIHJlc3VsdHNcclxuXHQgKi9cclxuXHRwcml2YXRlIHBhcnNlQ2hpbmVzZVRpbWVFeHByZXNzaW9ucyh0ZXh0OiBzdHJpbmcpOiBhbnlbXSB7XHJcblx0XHRjb25zdCByZXN1bHRzOiBhbnlbXSA9IFtdO1xyXG5cdFx0Y29uc3QgdXNlZEluZGljZXMgPSBuZXcgU2V0PG51bWJlcj4oKTsgLy8gVHJhY2sgdXNlZCBwb3NpdGlvbnMgdG8gYXZvaWQgY29uZmxpY3RzXHJcblxyXG5cdFx0Ly8gQ29tbW9uIENoaW5lc2UgZGF0ZSBwYXR0ZXJucyAtIG9yZGVyZWQgZnJvbSBtb3N0IHNwZWNpZmljIHRvIG1vc3QgZ2VuZXJhbFxyXG5cdFx0Y29uc3QgY2hpbmVzZVBhdHRlcm5zID0gW1xyXG5cdFx0XHQvLyDkuIvlkajkuIAsIOS4i+WRqOS6jCwgLi4uIOS4i+WRqOaXpSAo5pSv5oyB5pif5pyf5ZKM56S85ouc5Lik56eN6KGo6L6+KSAtIE1VU1QgY29tZSBiZWZvcmUgZ2VuZXJhbCBwYXR0ZXJuc1xyXG5cdFx0XHQvKD865LiLfOS4inzov5kpKD865ZGofOekvOaLnHzmmJ/mnJ8pKD865LiAfOS6jHzkuIl85ZubfOS6lHzlha185pelfOWkqSkvZyxcclxuXHRcdFx0Ly8g5pWw5a2XK+WkqeWQjiwg5pWw5a2XK+WRqOWQjiwg5pWw5a2XK+aciOWQjlxyXG5cdFx0XHQvKFxcZCspW+WkqeWRqOaciF3lkI4vZyxcclxuXHRcdFx0Ly8g5pWw5a2XK+WkqeWGhSwg5pWw5a2XK+WRqOWGhSwg5pWw5a2XK+aciOWGhVxyXG5cdFx0XHQvKFxcZCspW+WkqeWRqOaciF3lhoUvZyxcclxuXHRcdFx0Ly8g5pif5pyf5LiALCDmmJ/mnJ/kuowsIC4uLiDmmJ/mnJ/ml6VcclxuXHRcdFx0L+aYn+acnyg/OuS4gHzkuox85LiJfOWbm3zkupR85YWtfOaXpXzlpKkpL2csXHJcblx0XHRcdC8vIOWRqOS4gCwg5ZGo5LqMLCAuLi4g5ZGo5pelXHJcblx0XHRcdC/lkagoPzrkuIB85LqMfOS4iXzlm5t85LqUfOWFrXzml6V85aSpKS9nLFxyXG5cdFx0XHQvLyDnpLzmi5zkuIAsIOekvOaLnOS6jCwgLi4uIOekvOaLnOaXpVxyXG5cdFx0XHQv56S85oucKD865LiAfOS6jHzkuIl85ZubfOS6lHzlha185pelfOWkqSkvZyxcclxuXHRcdFx0Ly8g5piO5aSpLCDlkI7lpKksIOaYqOWkqSwg5YmN5aSpXHJcblx0XHRcdC/mmI7lpKl85ZCO5aSpfOaYqOWkqXzliY3lpKkvZyxcclxuXHRcdFx0Ly8g5LiL5ZGoLCDkuIrlkagsIOi/meWRqCAoZ2VuZXJhbCB3ZWVrIHBhdHRlcm5zIC0gTVVTVCBjb21lIGFmdGVyIHNwZWNpZmljIHdlZWtkYXkgcGF0dGVybnMpXHJcblx0XHRcdC/kuIvlkah85LiK5ZGofOi/meWRqC9nLFxyXG5cdFx0XHQvLyDkuIvkuKrmnIgsIOS4iuS4quaciCwg6L+Z5Liq5pyIXHJcblx0XHRcdC/kuIvkuKo/5pyIfOS4iuS4qj/mnIh86L+Z5LiqP+aciC9nLFxyXG5cdFx0XHQvLyDmmI7lubQsIOWOu+W5tCwg5LuK5bm0XHJcblx0XHRcdC/mmI7lubR85Y675bm0fOS7iuW5tC9nLFxyXG5cdFx0XTtcclxuXHJcblx0XHRmb3IgKGNvbnN0IHBhdHRlcm4gb2YgY2hpbmVzZVBhdHRlcm5zKSB7XHJcblx0XHRcdGxldCBtYXRjaDtcclxuXHRcdFx0d2hpbGUgKChtYXRjaCA9IHBhdHRlcm4uZXhlYyh0ZXh0KSkgIT09IG51bGwpIHtcclxuXHRcdFx0XHRjb25zdCBtYXRjaFRleHQgPSBtYXRjaFswXTtcclxuXHRcdFx0XHRjb25zdCBtYXRjaEluZGV4ID0gbWF0Y2guaW5kZXg7XHJcblx0XHRcdFx0Y29uc3QgbWF0Y2hFbmQgPSBtYXRjaEluZGV4ICsgbWF0Y2hUZXh0Lmxlbmd0aDtcclxuXHJcblx0XHRcdFx0Ly8gQ2hlY2sgaWYgdGhpcyBwb3NpdGlvbiBpcyBhbHJlYWR5IHVzZWQgYnkgYSBtb3JlIHNwZWNpZmljIHBhdHRlcm5cclxuXHRcdFx0XHRsZXQgaXNPdmVybGFwcGluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdGZvciAobGV0IGkgPSBtYXRjaEluZGV4OyBpIDwgbWF0Y2hFbmQ7IGkrKykge1xyXG5cdFx0XHRcdFx0aWYgKHVzZWRJbmRpY2VzLmhhcyhpKSkge1xyXG5cdFx0XHRcdFx0XHRpc092ZXJsYXBwaW5nID0gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRpZiAoaXNPdmVybGFwcGluZykge1xyXG5cdFx0XHRcdFx0Y29udGludWU7IC8vIFNraXAgdGhpcyBtYXRjaCBhcyBpdCBvdmVybGFwcyB3aXRoIGEgbW9yZSBzcGVjaWZpYyBvbmVcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGNvbnN0IGRhdGUgPSB0aGlzLnBhcnNlQ2hpbmVzZURhdGUobWF0Y2hUZXh0KTtcclxuXHJcblx0XHRcdFx0aWYgKGRhdGUpIHtcclxuXHRcdFx0XHRcdC8vIE1hcmsgdGhpcyByYW5nZSBhcyB1c2VkXHJcblx0XHRcdFx0XHRmb3IgKGxldCBpID0gbWF0Y2hJbmRleDsgaSA8IG1hdGNoRW5kOyBpKyspIHtcclxuXHRcdFx0XHRcdFx0dXNlZEluZGljZXMuYWRkKGkpO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdHJlc3VsdHMucHVzaCh7XHJcblx0XHRcdFx0XHRcdHRleHQ6IG1hdGNoVGV4dCxcclxuXHRcdFx0XHRcdFx0aW5kZXg6IG1hdGNoSW5kZXgsXHJcblx0XHRcdFx0XHRcdGxlbmd0aDogbWF0Y2hUZXh0Lmxlbmd0aCxcclxuXHRcdFx0XHRcdFx0c3RhcnQ6IHtcclxuXHRcdFx0XHRcdFx0XHRkYXRlOiAoKSA9PiBkYXRlLFxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHJlc3VsdHM7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDb252ZXJ0IENoaW5lc2UgZGF0ZSBleHByZXNzaW9uIHRvIGFjdHVhbCBkYXRlXHJcblx0ICogQHBhcmFtIGV4cHJlc3Npb24gLSBDaGluZXNlIGRhdGUgZXhwcmVzc2lvblxyXG5cdCAqIEByZXR1cm5zIERhdGUgb2JqZWN0IG9yIG51bGxcclxuXHQgKi9cclxuXHRwcml2YXRlIHBhcnNlQ2hpbmVzZURhdGUoZXhwcmVzc2lvbjogc3RyaW5nKTogRGF0ZSB8IG51bGwge1xyXG5cdFx0Y29uc3Qgbm93ID0gbmV3IERhdGUoKTtcclxuXHRcdGNvbnN0IHRvZGF5ID0gbmV3IERhdGUoXHJcblx0XHRcdG5vdy5nZXRGdWxsWWVhcigpLFxyXG5cdFx0XHRub3cuZ2V0TW9udGgoKSxcclxuXHRcdFx0bm93LmdldERhdGUoKSxcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gSGVscGVyIGZ1bmN0aW9uIHRvIGdldCB3ZWVrZGF5IG51bWJlciAoMCA9IFN1bmRheSwgMSA9IE1vbmRheSwgLi4uLCA2ID0gU2F0dXJkYXkpXHJcblx0XHRjb25zdCBnZXRXZWVrZGF5TnVtYmVyID0gKGRheVN0cjogc3RyaW5nKTogbnVtYmVyID0+IHtcclxuXHRcdFx0Y29uc3QgZGF5TWFwOiB7IFtrZXk6IHN0cmluZ106IG51bWJlciB9ID0ge1xyXG5cdFx0XHRcdOaXpTogMCxcclxuXHRcdFx0XHTlpKk6IDAsXHJcblx0XHRcdFx05LiAOiAxLFxyXG5cdFx0XHRcdOS6jDogMixcclxuXHRcdFx0XHTkuIk6IDMsXHJcblx0XHRcdFx05ZubOiA0LFxyXG5cdFx0XHRcdOS6lDogNSxcclxuXHRcdFx0XHTlha06IDYsXHJcblx0XHRcdH07XHJcblx0XHRcdHJldHVybiBkYXlNYXBbZGF5U3RyXSA/PyAtMTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gSGVscGVyIGZ1bmN0aW9uIHRvIGdldCBkYXRlIGZvciBzcGVjaWZpYyB3ZWVrZGF5XHJcblx0XHRjb25zdCBnZXREYXRlRm9yV2Vla2RheSA9IChcclxuXHRcdFx0dGFyZ2V0V2Vla2RheTogbnVtYmVyLFxyXG5cdFx0XHR3ZWVrT2Zmc2V0OiBudW1iZXIgPSAwLFxyXG5cdFx0KTogRGF0ZSA9PiB7XHJcblx0XHRcdGNvbnN0IGN1cnJlbnRXZWVrZGF5ID0gdG9kYXkuZ2V0RGF5KCk7XHJcblx0XHRcdGxldCBkYXlzVG9BZGQgPSB0YXJnZXRXZWVrZGF5IC0gY3VycmVudFdlZWtkYXk7XHJcblxyXG5cdFx0XHQvLyBBZGQgd2VlayBvZmZzZXRcclxuXHRcdFx0ZGF5c1RvQWRkICs9IHdlZWtPZmZzZXQgKiA3O1xyXG5cclxuXHRcdFx0Ly8gSWYgd2UncmUgbG9va2luZyBmb3IgdGhlIHNhbWUgd2Vla2RheSBpbiBjdXJyZW50IHdlZWsgYW5kIGl0J3MgYWxyZWFkeSBwYXNzZWQsXHJcblx0XHRcdC8vIG1vdmUgdG8gbmV4dCB3ZWVrIChleGNlcHQgZm9yIFwi6L+Z5ZGoXCIgd2hpY2ggc2hvdWxkIHN0YXkgaW4gY3VycmVudCB3ZWVrKVxyXG5cdFx0XHRpZiAod2Vla09mZnNldCA9PT0gMCAmJiBkYXlzVG9BZGQgPD0gMCkge1xyXG5cdFx0XHRcdGRheXNUb0FkZCArPSA3O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gbmV3IERhdGUodG9kYXkuZ2V0VGltZSgpICsgZGF5c1RvQWRkICogMjQgKiA2MCAqIDYwICogMTAwMCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIEhhbmRsZSB3ZWVrZGF5IGV4cHJlc3Npb25zXHJcblx0XHRjb25zdCB3ZWVrZGF5TWF0Y2ggPSBleHByZXNzaW9uLm1hdGNoKFxyXG5cdFx0XHQvKD86KOS4i3zkuIp86L+ZKT8oPzrlkah856S85oucfOaYn+acnyk/KShb5LiA5LqM5LiJ5Zub5LqU5YWt5pel5aSpXSkvLFxyXG5cdFx0KTtcclxuXHRcdGlmICh3ZWVrZGF5TWF0Y2gpIHtcclxuXHRcdFx0Y29uc3QgWywgd2Vla1ByZWZpeCwgZGF5U3RyXSA9IHdlZWtkYXlNYXRjaDtcclxuXHRcdFx0Y29uc3QgdGFyZ2V0V2Vla2RheSA9IGdldFdlZWtkYXlOdW1iZXIoZGF5U3RyKTtcclxuXHJcblx0XHRcdGlmICh0YXJnZXRXZWVrZGF5ICE9PSAtMSkge1xyXG5cdFx0XHRcdGxldCB3ZWVrT2Zmc2V0ID0gMDtcclxuXHJcblx0XHRcdFx0aWYgKHdlZWtQcmVmaXggPT09IFwi5LiLXCIpIHtcclxuXHRcdFx0XHRcdHdlZWtPZmZzZXQgPSAxOyAvLyBOZXh0IHdlZWtcclxuXHRcdFx0XHR9IGVsc2UgaWYgKHdlZWtQcmVmaXggPT09IFwi5LiKXCIpIHtcclxuXHRcdFx0XHRcdHdlZWtPZmZzZXQgPSAtMTsgLy8gTGFzdCB3ZWVrXHJcblx0XHRcdFx0fSBlbHNlIGlmICh3ZWVrUHJlZml4ID09PSBcIui/mVwiKSB7XHJcblx0XHRcdFx0XHR3ZWVrT2Zmc2V0ID0gMDsgLy8gVGhpcyB3ZWVrXHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdC8vIE5vIHByZWZpeCAobGlrZSBcIuaYn+acn+S4gFwiLCBcIuWRqOS4gFwiLCBcIuekvOaLnOS4gFwiKSwgYXNzdW1lIG5leHQgb2NjdXJyZW5jZVxyXG5cdFx0XHRcdFx0d2Vla09mZnNldCA9IDA7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRyZXR1cm4gZ2V0RGF0ZUZvcldlZWtkYXkodGFyZ2V0V2Vla2RheSwgd2Vla09mZnNldCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRzd2l0Y2ggKGV4cHJlc3Npb24pIHtcclxuXHRcdFx0Y2FzZSBcIuaYjuWkqVwiOlxyXG5cdFx0XHRcdHJldHVybiBuZXcgRGF0ZSh0b2RheS5nZXRUaW1lKCkgKyAyNCAqIDYwICogNjAgKiAxMDAwKTtcclxuXHRcdFx0Y2FzZSBcIuWQjuWkqVwiOlxyXG5cdFx0XHRcdHJldHVybiBuZXcgRGF0ZSh0b2RheS5nZXRUaW1lKCkgKyAyICogMjQgKiA2MCAqIDYwICogMTAwMCk7XHJcblx0XHRcdGNhc2UgXCLmmKjlpKlcIjpcclxuXHRcdFx0XHRyZXR1cm4gbmV3IERhdGUodG9kYXkuZ2V0VGltZSgpIC0gMjQgKiA2MCAqIDYwICogMTAwMCk7XHJcblx0XHRcdGNhc2UgXCLliY3lpKlcIjpcclxuXHRcdFx0XHRyZXR1cm4gbmV3IERhdGUodG9kYXkuZ2V0VGltZSgpIC0gMiAqIDI0ICogNjAgKiA2MCAqIDEwMDApO1xyXG5cdFx0XHRjYXNlIFwi5LiL5ZGoXCI6XHJcblx0XHRcdFx0cmV0dXJuIG5ldyBEYXRlKHRvZGF5LmdldFRpbWUoKSArIDcgKiAyNCAqIDYwICogNjAgKiAxMDAwKTtcclxuXHRcdFx0Y2FzZSBcIuS4iuWRqFwiOlxyXG5cdFx0XHRcdHJldHVybiBuZXcgRGF0ZSh0b2RheS5nZXRUaW1lKCkgLSA3ICogMjQgKiA2MCAqIDYwICogMTAwMCk7XHJcblx0XHRcdGNhc2UgXCLov5nlkahcIjpcclxuXHRcdFx0XHRyZXR1cm4gdG9kYXk7XHJcblx0XHRcdGNhc2UgXCLkuIvkuKrmnIhcIjpcclxuXHRcdFx0Y2FzZSBcIuS4i+aciFwiOlxyXG5cdFx0XHRcdHJldHVybiBuZXcgRGF0ZShcclxuXHRcdFx0XHRcdG5vdy5nZXRGdWxsWWVhcigpLFxyXG5cdFx0XHRcdFx0bm93LmdldE1vbnRoKCkgKyAxLFxyXG5cdFx0XHRcdFx0bm93LmdldERhdGUoKSxcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRjYXNlIFwi5LiK5Liq5pyIXCI6XHJcblx0XHRcdGNhc2UgXCLkuIrmnIhcIjpcclxuXHRcdFx0XHRyZXR1cm4gbmV3IERhdGUoXHJcblx0XHRcdFx0XHRub3cuZ2V0RnVsbFllYXIoKSxcclxuXHRcdFx0XHRcdG5vdy5nZXRNb250aCgpIC0gMSxcclxuXHRcdFx0XHRcdG5vdy5nZXREYXRlKCksXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0Y2FzZSBcIui/meS4quaciFwiOlxyXG5cdFx0XHRjYXNlIFwi6L+Z5pyIXCI6XHJcblx0XHRcdFx0cmV0dXJuIHRvZGF5O1xyXG5cdFx0XHRjYXNlIFwi5piO5bm0XCI6XHJcblx0XHRcdFx0cmV0dXJuIG5ldyBEYXRlKFxyXG5cdFx0XHRcdFx0bm93LmdldEZ1bGxZZWFyKCkgKyAxLFxyXG5cdFx0XHRcdFx0bm93LmdldE1vbnRoKCksXHJcblx0XHRcdFx0XHRub3cuZ2V0RGF0ZSgpLFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdGNhc2UgXCLljrvlubRcIjpcclxuXHRcdFx0XHRyZXR1cm4gbmV3IERhdGUoXHJcblx0XHRcdFx0XHRub3cuZ2V0RnVsbFllYXIoKSAtIDEsXHJcblx0XHRcdFx0XHRub3cuZ2V0TW9udGgoKSxcclxuXHRcdFx0XHRcdG5vdy5nZXREYXRlKCksXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0Y2FzZSBcIuS7iuW5tFwiOlxyXG5cdFx0XHRcdHJldHVybiB0b2RheTtcclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHQvLyBIYW5kbGUgcGF0dGVybnMgbGlrZSBcIjPlpKnlkI5cIiwgXCIy5ZGo5ZCOXCIsIFwiMeaciOWQjlwiXHJcblx0XHRcdFx0Y29uc3QgcmVsYXRpdmVNYXRjaCA9IGV4cHJlc3Npb24ubWF0Y2goLyhcXGQrKShb5aSp5ZGo5pyIXSlb5ZCO5YaFXS8pO1xyXG5cdFx0XHRcdGlmIChyZWxhdGl2ZU1hdGNoKSB7XHJcblx0XHRcdFx0XHRjb25zdCBudW0gPSBwYXJzZUludChyZWxhdGl2ZU1hdGNoWzFdKTtcclxuXHRcdFx0XHRcdGNvbnN0IHVuaXQgPSByZWxhdGl2ZU1hdGNoWzJdO1xyXG5cclxuXHRcdFx0XHRcdHN3aXRjaCAodW5pdCkge1xyXG5cdFx0XHRcdFx0XHRjYXNlIFwi5aSpXCI6XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIG5ldyBEYXRlKFxyXG5cdFx0XHRcdFx0XHRcdFx0dG9kYXkuZ2V0VGltZSgpICsgbnVtICogMjQgKiA2MCAqIDYwICogMTAwMCxcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRjYXNlIFwi5ZGoXCI6XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIG5ldyBEYXRlKFxyXG5cdFx0XHRcdFx0XHRcdFx0dG9kYXkuZ2V0VGltZSgpICsgbnVtICogNyAqIDI0ICogNjAgKiA2MCAqIDEwMDAsXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0Y2FzZSBcIuaciFwiOlxyXG5cdFx0XHRcdFx0XHRcdHJldHVybiBuZXcgRGF0ZShcclxuXHRcdFx0XHRcdFx0XHRcdG5vdy5nZXRGdWxsWWVhcigpLFxyXG5cdFx0XHRcdFx0XHRcdFx0bm93LmdldE1vbnRoKCkgKyBudW0sXHJcblx0XHRcdFx0XHRcdFx0XHRub3cuZ2V0RGF0ZSgpLFxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuLy8gRGVmYXVsdCBjb25maWd1cmF0aW9uXHJcbmV4cG9ydCBjb25zdCBERUZBVUxUX1RJTUVfUEFSU0lOR19DT05GSUc6IFRpbWVQYXJzaW5nQ29uZmlnICZcclxuXHRQYXJ0aWFsPEVuaGFuY2VkVGltZVBhcnNpbmdDb25maWc+ID0ge1xyXG5cdGVuYWJsZWQ6IHRydWUsXHJcblx0c3VwcG9ydGVkTGFuZ3VhZ2VzOiBbXCJlblwiLCBcInpoXCJdLFxyXG5cdGRhdGVLZXl3b3Jkczoge1xyXG5cdFx0c3RhcnQ6IFtcclxuXHRcdFx0XCJzdGFydFwiLFxyXG5cdFx0XHRcImJlZ2luXCIsXHJcblx0XHRcdFwiZnJvbVwiLFxyXG5cdFx0XHRcInN0YXJ0aW5nXCIsXHJcblx0XHRcdFwiYmVnaW5zXCIsXHJcblx0XHRcdFwi5byA5aeLXCIsXHJcblx0XHRcdFwi5LuOXCIsXHJcblx0XHRcdFwi6LW35aeLXCIsXHJcblx0XHRcdFwi6LW3XCIsXHJcblx0XHRcdFwi5aeL5LqOXCIsXHJcblx0XHRcdFwi6IeqXCIsXHJcblx0XHRdLFxyXG5cdFx0ZHVlOiBbXHJcblx0XHRcdFwiZHVlXCIsXHJcblx0XHRcdFwiZGVhZGxpbmVcIixcclxuXHRcdFx0XCJieVwiLFxyXG5cdFx0XHRcInVudGlsXCIsXHJcblx0XHRcdFwiYmVmb3JlXCIsXHJcblx0XHRcdFwiZXhwaXJlc1wiLFxyXG5cdFx0XHRcImVuZHNcIixcclxuXHRcdFx0XCLmiKrmraJcIixcclxuXHRcdFx0XCLliLDmnJ9cIixcclxuXHRcdFx0XCLkuYvliY1cIixcclxuXHRcdFx0XCLmnJ/pmZBcIixcclxuXHRcdFx0XCLmnIDmmZpcIixcclxuXHRcdFx0XCLnu5PmnZ9cIixcclxuXHRcdFx0XCLnu4jmraJcIixcclxuXHRcdFx0XCLlrozmiJDkuo5cIixcclxuXHRcdF0sXHJcblx0XHRzY2hlZHVsZWQ6IFtcclxuXHRcdFx0XCJzY2hlZHVsZWRcIixcclxuXHRcdFx0XCJvblwiLFxyXG5cdFx0XHRcImF0XCIsXHJcblx0XHRcdFwicGxhbm5lZFwiLFxyXG5cdFx0XHRcInNldCBmb3JcIixcclxuXHRcdFx0XCJhcnJhbmdlZFwiLFxyXG5cdFx0XHRcIuWuieaOklwiLFxyXG5cdFx0XHRcIuiuoeWIklwiLFxyXG5cdFx0XHRcIuWcqFwiLFxyXG5cdFx0XHRcIuWumuS6jlwiLFxyXG5cdFx0XHRcIumihOWumlwiLFxyXG5cdFx0XHRcIue6puWumlwiLFxyXG5cdFx0XHRcIuiuvuWumlwiLFxyXG5cdFx0XSxcclxuXHR9LFxyXG5cdHJlbW92ZU9yaWdpbmFsVGV4dDogdHJ1ZSxcclxuXHRwZXJMaW5lUHJvY2Vzc2luZzogdHJ1ZSwgLy8gRW5hYmxlIHBlci1saW5lIHByb2Nlc3NpbmcgYnkgZGVmYXVsdCBmb3IgYmV0dGVyIG11bHRpbGluZSBzdXBwb3J0XHJcblx0cmVhbFRpbWVSZXBsYWNlbWVudDogZmFsc2UsIC8vIERpc2FibGUgcmVhbC10aW1lIHJlcGxhY2VtZW50IGJ5IGRlZmF1bHQgdG8gYXZvaWQgaW50ZXJmZXJpbmcgd2l0aCB1c2VyIGlucHV0XHJcblx0Ly8gRW5oYW5jZWQgdGltZSBwYXJzaW5nIGNvbmZpZ3VyYXRpb25cclxuXHR0aW1lUGF0dGVybnM6IHtcclxuXHRcdHNpbmdsZVRpbWU6IFtcclxuXHRcdFx0L1xcYihbMDFdP1xcZHwyWzAtM10pOihbMC01XVxcZCkoPzo6KFswLTVdXFxkKSk/XFxiLyxcclxuXHRcdFx0L1xcYigxWzAtMl18MD9bMS05XSk6KFswLTVdXFxkKSg/OjooWzAtNV1cXGQpKT9cXHMqKEFNfFBNfGFtfHBtKVxcYi8sXHJcblx0XHRdLFxyXG5cdFx0dGltZVJhbmdlOiBbXHJcblx0XHRcdC9cXGIoWzAxXT9cXGR8MlswLTNdKTooWzAtNV1cXGQpKD86OihbMC01XVxcZCkpP1xccypbLX5cXHVmZjVlXVxccyooWzAxXT9cXGR8MlswLTNdKTooWzAtNV1cXGQpKD86OihbMC01XVxcZCkpP1xcYi8sXHJcblx0XHRcdC9cXGIoMVswLTJdfDA/WzEtOV0pOihbMC01XVxcZCkoPzo6KFswLTVdXFxkKSk/XFxzKihBTXxQTXxhbXxwbSk/XFxzKlstflxcdWZmNWVdXFxzKigxWzAtMl18MD9bMS05XSk6KFswLTVdXFxkKSg/OjooWzAtNV1cXGQpKT9cXHMqKEFNfFBNfGFtfHBtKVxcYi8sXHJcblx0XHRdLFxyXG5cdFx0cmFuZ2VTZXBhcmF0b3JzOiBbXCItXCIsIFwiflwiLCBcIlxcdWZmNWVcIiwgXCIgLSBcIiwgXCIgfiBcIl0sXHJcblx0fSxcclxuXHR0aW1lRGVmYXVsdHM6IHtcclxuXHRcdHByZWZlcnJlZEZvcm1hdDogXCIyNGhcIixcclxuXHRcdGRlZmF1bHRQZXJpb2Q6IFwiUE1cIixcclxuXHRcdG1pZG5pZ2h0Q3Jvc3Npbmc6IFwibmV4dC1kYXlcIixcclxuXHR9LFxyXG59O1xyXG4iXX0=