/**
 * ICS Manager
 * Manages ICS sources, fetching, caching, and synchronization
 */
import { __awaiter } from "tslib";
import { Component, requestUrl } from "obsidian";
import { IcsParser } from "../parsers/ics-parser";
import { HolidayDetector } from "../parsers/holiday-detector";
import { StatusMapper } from "../parsers/ics-status-mapper";
import { WebcalUrlConverter } from "../parsers/webcal-converter";
export class IcsManager extends Component {
    constructor(config, pluginSettings, plugin, timeParsingService) {
        super();
        this.cache = new Map();
        this.syncStatuses = new Map();
        this.refreshIntervals = new Map();
        this.lastSyncTime = 0;
        this.SYNC_DEBOUNCE_MS = 30000; // 30 seconds debounce
        this.syncPromise = null;
        this.config = config;
        this.pluginSettings = pluginSettings;
        this.plugin = plugin;
        this.timeParsingService = timeParsingService;
    }
    /**
     * Initialize the ICS manager
     */
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            // Initialize sync statuses for all sources
            for (const source of this.config.sources) {
                this.syncStatuses.set(source.id, {
                    sourceId: source.id,
                    status: source.enabled ? "idle" : "disabled",
                });
            }
            // Start background refresh if enabled
            if (this.config.enableBackgroundRefresh) {
                this.startBackgroundRefresh();
            }
            console.log("ICS Manager initialized");
            // Notify listeners (e.g., IcsSource) that ICS is ready/config updated
            // try {
            // 	this.plugin.app?.workspace?.trigger?.(
            // 		"task-genius:ics-config-changed",
            // 	);
            // } catch (e) {
            // 	console.warn(
            // 		"[IcsManager] Failed to trigger ics-config-changed on initialize",
            // 		e,
            // 	);
            // }
        });
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        this.config = config;
        // Update sync statuses for new/removed sources
        const currentSourceIds = new Set(this.config.sources.map((s) => s.id));
        // Remove statuses for deleted sources
        for (const [sourceId] of this.syncStatuses) {
            if (!currentSourceIds.has(sourceId)) {
                this.syncStatuses.delete(sourceId);
                this.clearRefreshInterval(sourceId);
            }
        }
        // Add statuses for new sources
        for (const source of this.config.sources) {
            if (!this.syncStatuses.has(source.id)) {
                this.syncStatuses.set(source.id, {
                    sourceId: source.id,
                    status: source.enabled ? "idle" : "disabled",
                });
            }
        }
        // Restart background refresh
        if (this.config.enableBackgroundRefresh) {
            this.startBackgroundRefresh();
        }
        else {
            this.stopBackgroundRefresh();
        }
        // try {
        // 	this.plugin.app?.workspace?.trigger?.(
        // 		"task-genius:ics-config-changed",
        // 	);
        // } catch (e) {
        // 	console.warn(
        // 		"[IcsManager] Failed to trigger ics-config-changed",
        // 		e,
        // 	);
        // }
    }
    /**
     * Set event update callback
     */
    setOnEventsUpdated(callback) {
        this.onEventsUpdated = callback;
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return this.config;
    }
    /**
     * Get all events from all enabled sources
     */
    getAllEvents() {
        const allEvents = [];
        console.log("getAllEvents: cache size", this.cache.size);
        console.log("getAllEvents: config sources", this.config.sources);
        for (const [sourceId, cacheEntry] of this.cache) {
            const source = this.config.sources.find((s) => s.id === sourceId);
            console.log("source", source, "sourceId", sourceId);
            console.log("cacheEntry events count", cacheEntry.events.length);
            if (source === null || source === void 0 ? void 0 : source.enabled) {
                console.log("Source is enabled, applying filters");
                // Apply filters if configured
                const filteredEvents = this.applyFilters(cacheEntry.events, source);
                console.log("filteredEvents count", filteredEvents.length);
                allEvents.push(...filteredEvents);
            }
            else {
                console.log("Source not enabled or not found", source === null || source === void 0 ? void 0 : source.enabled);
            }
        }
        console.log("getAllEvents: total events", allEvents.length);
        return allEvents;
    }
    /**
     * Get all events with holiday detection and filtering
     */
    getAllEventsWithHolidayDetection() {
        var _a;
        const allEvents = [];
        console.log("getAllEventsWithHolidayDetection: cache size", this.cache.size);
        console.log("getAllEventsWithHolidayDetection: config sources", this.config.sources);
        for (const [sourceId, cacheEntry] of this.cache) {
            const source = this.config.sources.find((s) => s.id === sourceId);
            console.log("Processing source:", sourceId, "enabled:", source === null || source === void 0 ? void 0 : source.enabled);
            console.log("Cache entry events count:", cacheEntry.events.length);
            if (source === null || source === void 0 ? void 0 : source.enabled) {
                // Apply filters first
                const filteredEvents = this.applyFilters(cacheEntry.events, source);
                console.log("Filtered events count:", filteredEvents.length);
                // Apply holiday detection if configured
                let processedEvents;
                if ((_a = source.holidayConfig) === null || _a === void 0 ? void 0 : _a.enabled) {
                    processedEvents =
                        HolidayDetector.processEventsWithHolidayDetection(filteredEvents, source.holidayConfig);
                }
                else {
                    // Convert to IcsEventWithHoliday format without holiday detection
                    processedEvents = filteredEvents.map((event) => (Object.assign(Object.assign({}, event), { isHoliday: false, showInForecast: true })));
                }
                console.log("Processed events count:", processedEvents.length);
                allEvents.push(...processedEvents);
            }
        }
        console.log("getAllEventsWithHolidayDetection: total events", allEvents.length);
        return allEvents;
    }
    /**
     * Get all events from all enabled sources with forced sync
     * This will trigger a sync for all enabled sources before returning events
     * Includes debouncing to prevent excessive syncing and deduplication of concurrent requests
     */
    getAllEventsWithSync() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = Date.now();
            // If there's already a sync in progress, wait for it
            if (this.syncPromise) {
                console.log("ICS: Waiting for existing sync to complete");
                yield this.syncPromise;
                return this.getAllEvents();
            }
            // Only sync if enough time has passed since last sync
            if (now - this.lastSyncTime > this.SYNC_DEBOUNCE_MS) {
                console.log("ICS: Starting sync (debounced)");
                this.syncPromise = this.syncAllSources().finally(() => {
                    this.syncPromise = null;
                });
                yield this.syncPromise;
                this.lastSyncTime = now;
            }
            else {
                console.log("ICS: Skipping sync (debounced)");
            }
            // Return all events after sync
            return this.getAllEvents();
        });
    }
    /**
     * Get all events from all enabled sources without blocking
     * This will return cached data immediately and optionally trigger background sync
     */
    getAllEventsNonBlocking(triggerBackgroundSync = true) {
        const events = this.getAllEvents();
        // Optionally trigger background sync if data might be stale
        if (triggerBackgroundSync) {
            this.triggerBackgroundSyncIfNeeded();
        }
        return events;
    }
    /**
     * Trigger background sync if needed (non-blocking)
     */
    triggerBackgroundSyncIfNeeded() {
        const now = Date.now();
        // Check if we need to sync any sources
        const needsSync = this.config.sources.some((source) => {
            if (!source.enabled)
                return false;
            const cacheEntry = this.cache.get(source.id);
            if (!cacheEntry)
                return true; // No cache, needs sync
            // Check if cache is expired
            const isExpired = now > cacheEntry.expiresAt;
            return isExpired;
        });
        // Only sync if enough time has passed since last sync and we need it
        if (needsSync && now - this.lastSyncTime > this.SYNC_DEBOUNCE_MS) {
            // Start background sync without waiting
            this.syncAllSources().catch((error) => {
                console.warn("Background ICS sync failed:", error);
            });
        }
    }
    /**
     * Get events from a specific source
     */
    getEventsFromSource(sourceId) {
        const cacheEntry = this.cache.get(sourceId);
        const source = this.config.sources.find((s) => s.id === sourceId);
        if (!cacheEntry || !(source === null || source === void 0 ? void 0 : source.enabled)) {
            return [];
        }
        return this.applyFilters(cacheEntry.events, source);
    }
    /**
     * Convert ICS events to Task format
     */
    convertEventsToTasks(events) {
        return events.map((event) => this.convertEventToTask(event));
    }
    /**
     * Convert ICS events with holiday detection to Task format
     */
    convertEventsWithHolidayToTasks(events) {
        return events
            .filter((event) => event.showInForecast) // Filter out events that shouldn't show in forecast
            .map((event) => this.convertEventWithHolidayToTask(event));
    }
    /**
     * Convert single ICS event to Task format
     */
    convertEventToTask(event) {
        var _a;
        // Apply text replacements to the event
        const processedEvent = this.applyTextReplacements(event);
        // Apply status mapping
        const mappedStatus = StatusMapper.applyStatusMapping(event, event.source.statusMapping, this.pluginSettings);
        // Extract time components from event description and preserve original ICS time information
        const enhancedMetadata = this.extractTimeComponentsFromIcsEvent(event, Object.assign(Object.assign({}, event), processedEvent));
        const task = {
            id: `ics-${event.source.id}-${event.uid}`,
            content: processedEvent.summary,
            filePath: `ics://${event.source.name}`,
            line: 0,
            completed: mappedStatus === "x" ||
                mappedStatus ===
                    this.pluginSettings.taskStatusMarks["Completed"],
            status: mappedStatus,
            originalMarkdown: `- [${mappedStatus}] ${processedEvent.summary}`,
            metadata: Object.assign({ tags: event.categories || [], children: [], priority: this.mapIcsPriorityToTaskPriority(event.priority), startDate: event.dtstart.getTime(), dueDate: (_a = event.dtend) === null || _a === void 0 ? void 0 : _a.getTime(), scheduledDate: event.dtstart.getTime(), project: event.source.name, context: processedEvent.location, heading: [] }, enhancedMetadata),
            icsEvent: Object.assign(Object.assign({}, event), { summary: processedEvent.summary, description: processedEvent.description, location: processedEvent.location }),
            readonly: true,
            badge: event.source.showType === "badge",
            source: {
                type: "ics",
                name: event.source.name,
                id: event.source.id,
            },
        };
        return task;
    }
    /**
     * Convert single ICS event with holiday detection to Task format
     */
    convertEventWithHolidayToTask(event) {
        var _a;
        // Apply text replacements to the event
        const processedEvent = this.applyTextReplacements(event);
        // Use holiday group title if available and strategy is summary
        let displayTitle = processedEvent.summary;
        if (event.holidayGroup &&
            event.holidayGroup.displayStrategy === "summary") {
            displayTitle = event.holidayGroup.title;
        }
        // Apply status mapping
        const mappedStatus = StatusMapper.applyStatusMapping(event, event.source.statusMapping, this.pluginSettings);
        // Extract time components from event description and preserve original ICS time information
        const enhancedMetadata = this.extractTimeComponentsFromIcsEvent(event, Object.assign(Object.assign({}, event), processedEvent));
        const task = {
            id: `ics-${event.source.id}-${event.uid}`,
            content: displayTitle,
            filePath: `ics://${event.source.name}`,
            line: 0,
            completed: mappedStatus === "x" ||
                mappedStatus ===
                    this.pluginSettings.taskStatusMarks["Completed"],
            status: mappedStatus,
            originalMarkdown: `- [${mappedStatus}] ${displayTitle}`,
            metadata: Object.assign({ tags: event.categories || [], children: [], priority: this.mapIcsPriorityToTaskPriority(event.priority), startDate: event.dtstart.getTime(), dueDate: (_a = event.dtend) === null || _a === void 0 ? void 0 : _a.getTime(), scheduledDate: event.dtstart.getTime(), project: event.source.name, context: processedEvent.location, heading: [] }, enhancedMetadata),
            icsEvent: Object.assign(Object.assign({}, event), { summary: processedEvent.summary, description: processedEvent.description, location: processedEvent.location }),
            readonly: true,
            badge: event.source.showType === "badge",
            source: {
                type: "ics",
                name: event.source.name,
                id: event.source.id,
            },
        };
        return task;
    }
    /**
     * Extract time components from ICS event and preserve original time information
     */
    extractTimeComponentsFromIcsEvent(event, processedEvent) {
        if (!this.timeParsingService) {
            return {};
        }
        try {
            // Create time components from ICS event times
            const timeComponents = {};
            // Extract time from ICS dtstart (start time)
            if (event.dtstart && !event.allDay) {
                const startTimeComponent = this.createTimeComponentFromDate(event.dtstart);
                if (startTimeComponent) {
                    timeComponents.startTime = startTimeComponent;
                    timeComponents.scheduledTime = startTimeComponent; // ICS events are typically scheduled
                }
            }
            // Extract time from ICS dtend (end time)
            if (event.dtend && !event.allDay) {
                const endTimeComponent = this.createTimeComponentFromDate(event.dtend);
                if (endTimeComponent) {
                    timeComponents.endTime = endTimeComponent;
                    timeComponents.dueTime = endTimeComponent; // End time can be considered due time
                    // Create range relationship if both start and end exist
                    if (timeComponents.startTime) {
                        timeComponents.startTime.isRange = true;
                        timeComponents.startTime.rangePartner = endTimeComponent;
                        endTimeComponent.isRange = true;
                        endTimeComponent.rangePartner = timeComponents.startTime;
                    }
                }
            }
            // Also parse time components from event description and summary if available
            let descriptionTimeComponents = {};
            const textToParse = [processedEvent.summary, processedEvent.description, processedEvent.location]
                .filter(Boolean)
                .join(' ');
            if (textToParse.trim()) {
                const { timeComponents: parsedComponents } = this.timeParsingService.parseTimeComponents(textToParse);
                descriptionTimeComponents = parsedComponents;
            }
            // Merge ICS time components with parsed description components
            // ICS times take precedence, but description can provide additional context
            const mergedTimeComponents = Object.assign(Object.assign({}, descriptionTimeComponents), timeComponents);
            // Create enhanced datetime objects
            const enhancedDates = this.createEnhancedDateTimesFromIcs(event, mergedTimeComponents);
            const enhancedMetadata = {};
            if (Object.keys(mergedTimeComponents).length > 0) {
                enhancedMetadata.timeComponents = mergedTimeComponents;
            }
            if (enhancedDates && Object.keys(enhancedDates).length > 0) {
                enhancedMetadata.enhancedDates = enhancedDates;
            }
            return enhancedMetadata;
        }
        catch (error) {
            console.error(`[IcsManager] Failed to extract time components from ICS event ${event.uid}:`, error);
            return {};
        }
    }
    /**
     * Create TimeComponent from Date object
     */
    createTimeComponentFromDate(date) {
        if (!date || isNaN(date.getTime())) {
            return null;
        }
        // Format time as HH:MM or HH:MM:SS depending on whether seconds are present
        const hours = date.getUTCHours().toString().padStart(2, '0');
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        const seconds = date.getUTCSeconds();
        let originalText = `${hours}:${minutes}`;
        if (seconds > 0) {
            originalText += `:${seconds.toString().padStart(2, '0')}`;
        }
        return {
            hour: parseInt(hours, 10),
            minute: parseInt(minutes, 10),
            second: seconds > 0 ? seconds : undefined,
            originalText,
            isRange: false,
        };
    }
    /**
     * Create enhanced datetime objects from ICS event and time components
     */
    createEnhancedDateTimesFromIcs(event, timeComponents) {
        const enhancedDates = {};
        // Use ICS event dates directly as they already contain the correct date and time
        if (event.dtstart) {
            enhancedDates.startDateTime = new Date(event.dtstart);
            enhancedDates.scheduledDateTime = new Date(event.dtstart); // ICS events are typically scheduled
        }
        if (event.dtend) {
            enhancedDates.endDateTime = new Date(event.dtend);
            enhancedDates.dueDateTime = new Date(event.dtend); // End time can be considered due time
        }
        // If we have time components from description parsing but no ICS times (all-day events),
        // try to combine the date from ICS with the parsed time components
        if (event.allDay && timeComponents) {
            const eventDate = new Date(event.dtstart);
            if (timeComponents.startTime) {
                const startDateTime = new Date(eventDate);
                startDateTime.setHours(timeComponents.startTime.hour, timeComponents.startTime.minute, timeComponents.startTime.second || 0);
                enhancedDates.startDateTime = startDateTime;
                enhancedDates.scheduledDateTime = startDateTime;
            }
            if (timeComponents.endTime) {
                const endDateTime = new Date(eventDate);
                endDateTime.setHours(timeComponents.endTime.hour, timeComponents.endTime.minute, timeComponents.endTime.second || 0);
                // Handle midnight crossing for time ranges
                if (timeComponents.startTime && timeComponents.endTime.hour < timeComponents.startTime.hour) {
                    endDateTime.setDate(endDateTime.getDate() + 1);
                }
                enhancedDates.endDateTime = endDateTime;
                enhancedDates.dueDateTime = endDateTime;
            }
            if (timeComponents.dueTime && !enhancedDates.dueDateTime) {
                const dueDateTime = new Date(eventDate);
                dueDateTime.setHours(timeComponents.dueTime.hour, timeComponents.dueTime.minute, timeComponents.dueTime.second || 0);
                enhancedDates.dueDateTime = dueDateTime;
            }
            if (timeComponents.scheduledTime && !enhancedDates.scheduledDateTime) {
                const scheduledDateTime = new Date(eventDate);
                scheduledDateTime.setHours(timeComponents.scheduledTime.hour, timeComponents.scheduledTime.minute, timeComponents.scheduledTime.second || 0);
                enhancedDates.scheduledDateTime = scheduledDateTime;
            }
        }
        return Object.keys(enhancedDates).length > 0 ? enhancedDates : undefined;
    }
    /**
     * Map ICS status to task status
     */
    mapIcsStatusToTaskStatus(icsStatus) {
        switch (icsStatus === null || icsStatus === void 0 ? void 0 : icsStatus.toUpperCase()) {
            case "COMPLETED":
                return "x";
            case "CANCELLED":
                return "-";
            case "TENTATIVE":
                return "?";
            case "CONFIRMED":
            default:
                return " ";
        }
    }
    /**
     * Map ICS priority to task priority
     */
    mapIcsPriorityToTaskPriority(icsPriority) {
        if (icsPriority === undefined)
            return undefined;
        // ICS priority: 0 (undefined), 1-4 (high), 5 (normal), 6-9 (low)
        // Task priority: 1 (highest), 2 (high), 3 (medium), 4 (low), 5 (lowest)
        if (icsPriority >= 1 && icsPriority <= 4)
            return 1; // High
        if (icsPriority === 5)
            return 3; // Medium
        if (icsPriority >= 6 && icsPriority <= 9)
            return 5; // Low
        return undefined;
    }
    /**
     * Manually sync a specific source
     */
    syncSource(sourceId) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const source = this.config.sources.find((s) => s.id === sourceId);
            if (!source) {
                throw new Error(`Source not found: ${sourceId}`);
            }
            this.updateSyncStatus(sourceId, { status: "syncing" });
            try {
                const result = yield this.fetchIcsData(source);
                console.log("syncSource: result", result);
                if (result.success && result.data) {
                    // Update cache
                    const cacheEntry = {
                        sourceId,
                        events: result.data.events,
                        timestamp: result.timestamp,
                        expiresAt: result.timestamp +
                            this.config.maxCacheAge * 60 * 60 * 1000,
                    };
                    this.cache.set(sourceId, cacheEntry);
                    // Update sync status
                    this.updateSyncStatus(sourceId, {
                        status: "idle",
                        lastSync: result.timestamp,
                        eventCount: result.data.events.length,
                    });
                    // Notify listeners
                    (_a = this.onEventsUpdated) === null || _a === void 0 ? void 0 : _a.call(this, sourceId, result.data.events);
                    // Broadcast workspace event so IcsSource can reload
                    // try {
                    // 	this.plugin.app?.workspace?.trigger?.(
                    // 		"task-genius:ics-cache-updated",
                    // 	);
                    // } catch (e) {
                    // 	console.warn(
                    // 		"[IcsManager] Failed to trigger ics-cache-updated",
                    // 		e,
                    // 	);
                    // }
                }
                else {
                    // Handle different types of errors with appropriate logging
                    const errorType = this.categorizeError(result.error);
                    console.warn(`ICS sync failed for source ${sourceId} (${errorType}):`, result.error);
                    this.updateSyncStatus(sourceId, {
                        status: "error",
                        error: `${errorType}: ${result.error || "Unknown error"}`,
                    });
                }
                return result;
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                const errorType = this.categorizeError(errorMessage);
                console.warn(`ICS sync exception for source ${sourceId} (${errorType}):`, error);
                this.updateSyncStatus(sourceId, {
                    status: "error",
                    error: `${errorType}: ${errorMessage}`,
                });
                return {
                    success: false,
                    error: errorMessage,
                    timestamp: Date.now(),
                };
            }
        });
    }
    /**
     * Sync all enabled sources
     */
    syncAllSources() {
        return __awaiter(this, void 0, void 0, function* () {
            const results = new Map();
            const syncPromises = this.config.sources
                .filter((source) => source.enabled)
                .map((source) => __awaiter(this, void 0, void 0, function* () {
                const result = yield this.syncSource(source.id);
                results.set(source.id, result);
                return result;
            }));
            yield Promise.allSettled(syncPromises);
            return results;
        });
    }
    /**
     * Get sync status for a source
     */
    getSyncStatus(sourceId) {
        return this.syncStatuses.get(sourceId);
    }
    /**
     * Get sync statuses for all sources
     */
    getAllSyncStatuses() {
        return new Map(this.syncStatuses);
    }
    /**
     * Clear cache for a specific source
     */
    clearSourceCache(sourceId) {
        this.cache.delete(sourceId);
    }
    /**
     * Clear all cache
     */
    clearAllCache() {
        this.cache.clear();
    }
    /**
     * Fetch ICS data from a source
     */
    fetchIcsData(source) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Convert webcal URL if needed
                const conversionResult = WebcalUrlConverter.convertWebcalUrl(source.url);
                if (!conversionResult.success) {
                    return {
                        success: false,
                        error: `URL validation failed: ${conversionResult.error}`,
                        timestamp: Date.now(),
                    };
                }
                const fetchUrl = conversionResult.convertedUrl;
                const requestParams = {
                    url: fetchUrl,
                    method: "GET",
                    headers: Object.assign({ "User-Agent": "Obsidian Task Progress Bar Plugin" }, (_a = source.auth) === null || _a === void 0 ? void 0 : _a.headers),
                };
                // Add authentication if configured
                if (source.auth) {
                    switch (source.auth.type) {
                        case "basic":
                            if (source.auth.username && source.auth.password) {
                                const credentials = btoa(`${source.auth.username}:${source.auth.password}`);
                                requestParams.headers["Authorization"] =
                                    `Basic ${credentials}`;
                            }
                            break;
                        case "bearer":
                            if (source.auth.token) {
                                requestParams.headers["Authorization"] =
                                    `Bearer ${source.auth.token}`;
                            }
                            break;
                    }
                }
                // Check cache headers
                const cacheEntry = this.cache.get(source.id);
                if (cacheEntry === null || cacheEntry === void 0 ? void 0 : cacheEntry.etag) {
                    requestParams.headers["If-None-Match"] = cacheEntry.etag;
                }
                if (cacheEntry === null || cacheEntry === void 0 ? void 0 : cacheEntry.lastModified) {
                    requestParams.headers["If-Modified-Since"] =
                        cacheEntry.lastModified;
                }
                // Create timeout promise
                const timeoutMs = this.config.networkTimeout * 1000;
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => {
                        reject(new Error(`Request timeout after ${this.config.networkTimeout} seconds`));
                    }, timeoutMs);
                });
                // Race between request and timeout
                const response = yield Promise.race([
                    requestUrl(requestParams),
                    timeoutPromise,
                ]);
                // Handle 304 Not Modified
                if (response.status === 304 && cacheEntry) {
                    return {
                        success: true,
                        data: {
                            events: cacheEntry.events,
                            errors: [],
                            metadata: {},
                        },
                        timestamp: Date.now(),
                    };
                }
                if (response.status !== 200) {
                    return {
                        success: false,
                        error: `HTTP ${response.status}: ${response.text || "Unknown error"}`,
                        statusCode: response.status,
                        timestamp: Date.now(),
                    };
                }
                // Parse ICS content
                const parseResult = IcsParser.parse(response.text, source);
                // Update cache with HTTP headers
                if (cacheEntry) {
                    cacheEntry.etag = response.headers["etag"];
                    cacheEntry.lastModified = response.headers["last-modified"];
                }
                return {
                    success: true,
                    data: parseResult,
                    timestamp: Date.now(),
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                    timestamp: Date.now(),
                };
            }
        });
    }
    /**
     * Apply filters to events
     */
    applyFilters(events, source) {
        let filteredEvents = [...events];
        console.log("applyFilters: initial events count", events.length);
        console.log("applyFilters: source config", {
            showAllDayEvents: source.showAllDayEvents,
            showTimedEvents: source.showTimedEvents,
            filters: source.filters,
        });
        // Apply event type filters
        if (!source.showAllDayEvents) {
            const beforeFilter = filteredEvents.length;
            filteredEvents = filteredEvents.filter((event) => !event.allDay);
            console.log(`Filtered out all-day events: ${beforeFilter} -> ${filteredEvents.length}`);
        }
        if (!source.showTimedEvents) {
            const beforeFilter = filteredEvents.length;
            filteredEvents = filteredEvents.filter((event) => event.allDay);
            console.log(`Filtered out timed events: ${beforeFilter} -> ${filteredEvents.length}`);
        }
        // Apply custom filters
        if (source.filters) {
            filteredEvents = filteredEvents.filter((event) => {
                var _a, _b, _c, _d, _e, _f, _g, _h;
                // Include filters
                if (source.filters.include) {
                    const include = source.filters.include;
                    let shouldInclude = true;
                    if ((_a = include.summary) === null || _a === void 0 ? void 0 : _a.length) {
                        shouldInclude =
                            shouldInclude &&
                                include.summary.some((pattern) => this.matchesPattern(event.summary, pattern));
                    }
                    if (((_b = include.description) === null || _b === void 0 ? void 0 : _b.length) && event.description) {
                        shouldInclude =
                            shouldInclude &&
                                include.description.some((pattern) => this.matchesPattern(event.description, pattern));
                    }
                    if (((_c = include.location) === null || _c === void 0 ? void 0 : _c.length) && event.location) {
                        shouldInclude =
                            shouldInclude &&
                                include.location.some((pattern) => this.matchesPattern(event.location, pattern));
                    }
                    if (((_d = include.categories) === null || _d === void 0 ? void 0 : _d.length) && event.categories) {
                        shouldInclude =
                            shouldInclude &&
                                include.categories.some((category) => event.categories.includes(category));
                    }
                    if (!shouldInclude)
                        return false;
                }
                // Exclude filters
                if (source.filters.exclude) {
                    const exclude = source.filters.exclude;
                    if ((_e = exclude.summary) === null || _e === void 0 ? void 0 : _e.length) {
                        if (exclude.summary.some((pattern) => this.matchesPattern(event.summary, pattern))) {
                            return false;
                        }
                    }
                    if (((_f = exclude.description) === null || _f === void 0 ? void 0 : _f.length) && event.description) {
                        if (exclude.description.some((pattern) => this.matchesPattern(event.description, pattern))) {
                            return false;
                        }
                    }
                    if (((_g = exclude.location) === null || _g === void 0 ? void 0 : _g.length) && event.location) {
                        if (exclude.location.some((pattern) => this.matchesPattern(event.location, pattern))) {
                            return false;
                        }
                    }
                    if (((_h = exclude.categories) === null || _h === void 0 ? void 0 : _h.length) && event.categories) {
                        if (exclude.categories.some((category) => event.categories.includes(category))) {
                            return false;
                        }
                    }
                }
                return true;
            });
        }
        // Limit number of events
        if (filteredEvents.length > this.config.maxEventsPerSource) {
            const beforeLimit = filteredEvents.length;
            filteredEvents = filteredEvents
                .sort((a, b) => b.dtstart.getTime() - a.dtstart.getTime()) // 倒序：最新的事件在前
                .slice(0, this.config.maxEventsPerSource);
            console.log(`Limited events: ${beforeLimit} -> ${filteredEvents.length} (max: ${this.config.maxEventsPerSource}) - keeping newest events`);
        }
        console.log("applyFilters: final events count", filteredEvents.length);
        return filteredEvents;
    }
    /**
     * Check if text matches a pattern (supports regex)
     */
    matchesPattern(text, pattern) {
        try {
            // Try to use as regex first
            const regex = new RegExp(pattern, "i");
            return regex.test(text);
        }
        catch (_a) {
            // Fall back to simple string matching
            return text.toLowerCase().includes(pattern.toLowerCase());
        }
    }
    /**
     * Apply text replacement rules to an ICS event
     */
    applyTextReplacements(event) {
        const source = event.source;
        const replacements = source.textReplacements;
        // If no replacements configured, return original values
        if (!replacements || replacements.length === 0) {
            return {
                summary: event.summary,
                description: event.description,
                location: event.location,
            };
        }
        let processedSummary = event.summary;
        let processedDescription = event.description;
        let processedLocation = event.location;
        // Apply each enabled replacement rule
        for (const rule of replacements) {
            if (!rule.enabled) {
                continue;
            }
            try {
                const regex = new RegExp(rule.pattern, rule.flags || "g");
                // Apply to specific target or all fields
                switch (rule.target) {
                    case "summary":
                        processedSummary = processedSummary.replace(regex, rule.replacement);
                        break;
                    case "description":
                        if (processedDescription) {
                            processedDescription = processedDescription.replace(regex, rule.replacement);
                        }
                        break;
                    case "location":
                        if (processedLocation) {
                            processedLocation = processedLocation.replace(regex, rule.replacement);
                        }
                        break;
                    case "all":
                        processedSummary = processedSummary.replace(regex, rule.replacement);
                        if (processedDescription) {
                            processedDescription = processedDescription.replace(regex, rule.replacement);
                        }
                        if (processedLocation) {
                            processedLocation = processedLocation.replace(regex, rule.replacement);
                        }
                        break;
                }
            }
            catch (error) {
                console.warn(`Invalid regex pattern in text replacement rule "${rule.name}": ${rule.pattern}`, error);
            }
        }
        return {
            summary: processedSummary,
            description: processedDescription,
            location: processedLocation,
        };
    }
    /**
     * Update sync status
     */
    updateSyncStatus(sourceId, updates) {
        const current = this.syncStatuses.get(sourceId) || {
            sourceId,
            status: "idle",
        };
        this.syncStatuses.set(sourceId, Object.assign(Object.assign({}, current), updates));
    }
    /**
     * Categorize error types for better handling
     */
    categorizeError(errorMessage) {
        if (!errorMessage)
            return "unknown";
        const message = errorMessage.toLowerCase();
        if (message.includes("timeout") ||
            message.includes("request timeout")) {
            return "timeout";
        }
        if (message.includes("connection") ||
            message.includes("network") ||
            message.includes("err_connection")) {
            return "network";
        }
        if (message.includes("404") || message.includes("not found")) {
            return "not-found";
        }
        if (message.includes("403") ||
            message.includes("unauthorized") ||
            message.includes("401")) {
            return "auth";
        }
        if (message.includes("500") ||
            message.includes("502") ||
            message.includes("503")) {
            return "server";
        }
        if (message.includes("parse") || message.includes("invalid")) {
            return "parse";
        }
        return "unknown";
    }
    /**
     * Start background refresh for all sources
     */
    startBackgroundRefresh() {
        this.stopBackgroundRefresh(); // Clear existing intervals
        for (const source of this.config.sources) {
            if (source.enabled) {
                const interval = source.refreshInterval || this.config.globalRefreshInterval;
                const intervalId = setInterval(() => {
                    this.syncSource(source.id).catch((error) => {
                        console.error(`Background sync failed for source ${source.id}:`, error);
                    });
                }, interval * 60 * 1000); // Convert minutes to milliseconds
                this.refreshIntervals.set(source.id, intervalId);
            }
        }
    }
    /**
     * Stop background refresh
     */
    stopBackgroundRefresh() {
        for (const [sourceId, intervalId] of this.refreshIntervals) {
            clearInterval(intervalId);
        }
        this.refreshIntervals.clear();
    }
    /**
     * Clear refresh interval for a specific source
     */
    clearRefreshInterval(sourceId) {
        const intervalId = this.refreshIntervals.get(sourceId);
        if (intervalId) {
            clearInterval(intervalId);
            this.refreshIntervals.delete(sourceId);
        }
    }
    /**
     * Cleanup when component is unloaded
     */
    onunload() {
        this.stopBackgroundRefresh();
        super.onunload();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNzLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpY3MtbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0dBR0c7O0FBRUgsT0FBTyxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQW1CLE1BQU0sVUFBVSxDQUFDO0FBYWxFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDOUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzVELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBTWpFLE1BQU0sT0FBTyxVQUFXLFNBQVEsU0FBUztJQVd4QyxZQUNDLE1BQXdCLEVBQ3hCLGNBQXVDLEVBQ3ZDLE1BQThCLEVBQzlCLGtCQUF1QztRQUV2QyxLQUFLLEVBQUUsQ0FBQztRQWZELFVBQUssR0FBK0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUM5QyxpQkFBWSxHQUErQixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ3JELHFCQUFnQixHQUF3QixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBa05sRCxpQkFBWSxHQUFHLENBQUMsQ0FBQztRQUNSLHFCQUFnQixHQUFHLEtBQUssQ0FBQyxDQUFDLHNCQUFzQjtRQUN6RCxnQkFBVyxHQUFnRCxJQUFJLENBQUM7UUF0TXZFLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxrQkFBa0IsQ0FBQztJQUM5QyxDQUFDO0lBRUQ7O09BRUc7SUFDRyxVQUFVOztZQUNmLDJDQUEyQztZQUMzQyxLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsT0FB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RUQ7O09BRUc7SUFDTSxRQUFRO1FBQ2hCLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1FBQzdCLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNsQixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogSUNTIE1hbmFnZXJcclxuICogTWFuYWdlcyBJQ1Mgc291cmNlcywgZmV0Y2hpbmcsIGNhY2hpbmcsIGFuZCBzeW5jaHJvbml6YXRpb25cclxuICovXHJcblxyXG5pbXBvcnQgeyBDb21wb25lbnQsIHJlcXVlc3RVcmwsIFJlcXVlc3RVcmxQYXJhbSB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQge1xyXG5cdEljc1NvdXJjZSxcclxuXHRJY3NFdmVudCxcclxuXHRJY3NGZXRjaFJlc3VsdCxcclxuXHRJY3NDYWNoZUVudHJ5LFxyXG5cdEljc01hbmFnZXJDb25maWcsXHJcblx0SWNzU3luY1N0YXR1cyxcclxuXHRJY3NUYXNrLFxyXG5cdEljc1RleHRSZXBsYWNlbWVudCxcclxuXHRJY3NFdmVudFdpdGhIb2xpZGF5LFxyXG59IGZyb20gXCIuLi90eXBlcy9pY3NcIjtcclxuaW1wb3J0IHsgVGFzaywgRXh0ZW5kZWRNZXRhZGF0YSwgRW5oYW5jZWRTdGFuZGFyZFRhc2tNZXRhZGF0YSB9IGZyb20gXCIuLi90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7IEljc1BhcnNlciB9IGZyb20gXCIuLi9wYXJzZXJzL2ljcy1wYXJzZXJcIjtcclxuaW1wb3J0IHsgSG9saWRheURldGVjdG9yIH0gZnJvbSBcIi4uL3BhcnNlcnMvaG9saWRheS1kZXRlY3RvclwiO1xyXG5pbXBvcnQgeyBTdGF0dXNNYXBwZXIgfSBmcm9tIFwiLi4vcGFyc2Vycy9pY3Mtc3RhdHVzLW1hcHBlclwiO1xyXG5pbXBvcnQgeyBXZWJjYWxVcmxDb252ZXJ0ZXIgfSBmcm9tIFwiLi4vcGFyc2Vycy93ZWJjYWwtY29udmVydGVyXCI7XHJcbmltcG9ydCB7IFRhc2tQcm9ncmVzc0JhclNldHRpbmdzIH0gZnJvbSBcIi4uL2NvbW1vbi9zZXR0aW5nLWRlZmluaXRpb25cIjtcclxuaW1wb3J0IHsgVGltZVBhcnNpbmdTZXJ2aWNlIH0gZnJvbSBcIi4uL3NlcnZpY2VzL3RpbWUtcGFyc2luZy1zZXJ2aWNlXCI7XHJcbmltcG9ydCB7IFRpbWVDb21wb25lbnQgfSBmcm9tIFwiLi4vdHlwZXMvdGltZS1wYXJzaW5nXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcInNyY1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEljc01hbmFnZXIgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdHByaXZhdGUgY29uZmlnOiBJY3NNYW5hZ2VyQ29uZmlnO1xyXG5cdHByaXZhdGUgY2FjaGU6IE1hcDxzdHJpbmcsIEljc0NhY2hlRW50cnk+ID0gbmV3IE1hcCgpO1xyXG5cdHByaXZhdGUgc3luY1N0YXR1c2VzOiBNYXA8c3RyaW5nLCBJY3NTeW5jU3RhdHVzPiA9IG5ldyBNYXAoKTtcclxuXHRwcml2YXRlIHJlZnJlc2hJbnRlcnZhbHM6IE1hcDxzdHJpbmcsIG51bWJlcj4gPSBuZXcgTWFwKCk7XHJcblx0cHJpdmF0ZSBvbkV2ZW50c1VwZGF0ZWQ/OiAoc291cmNlSWQ6IHN0cmluZywgZXZlbnRzOiBJY3NFdmVudFtdKSA9PiB2b2lkO1xyXG5cdHByaXZhdGUgcGx1Z2luU2V0dGluZ3M6IFRhc2tQcm9ncmVzc0JhclNldHRpbmdzO1xyXG5cdHByaXZhdGUgdGltZVBhcnNpbmdTZXJ2aWNlPzogVGltZVBhcnNpbmdTZXJ2aWNlO1xyXG5cclxuXHRwcml2YXRlIHBsdWdpbj86IFRhc2tQcm9ncmVzc0JhclBsdWdpbjtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRjb25maWc6IEljc01hbmFnZXJDb25maWcsXHJcblx0XHRwbHVnaW5TZXR0aW5nczogVGFza1Byb2dyZXNzQmFyU2V0dGluZ3MsXHJcblx0XHRwbHVnaW4/OiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHR0aW1lUGFyc2luZ1NlcnZpY2U/OiBUaW1lUGFyc2luZ1NlcnZpY2UsXHJcblx0KSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5jb25maWcgPSBjb25maWc7XHJcblx0XHR0aGlzLnBsdWdpblNldHRpbmdzID0gcGx1Z2luU2V0dGluZ3M7XHJcblx0XHR0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuXHRcdHRoaXMudGltZVBhcnNpbmdTZXJ2aWNlID0gdGltZVBhcnNpbmdTZXJ2aWNlO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSW5pdGlhbGl6ZSB0aGUgSUNTIG1hbmFnZXJcclxuXHQgKi9cclxuXHRhc3luYyBpbml0aWFsaXplKCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBzeW5jIHN0YXR1c2VzIGZvciBhbGwgc291cmNlc1xyXG5cdFx0Zm9yIChjb25zdCBzb3VyY2Ugb2YgdGhpcy5jb25maWcuc291cmNlcykge1xyXG5cdFx0XHR0aGlzLnN5bmNTdGF0dXNlcy5zZXQoc291cmNlLmlkLCB7XHJcblx0XHRcdFx0c291cmNlSWQ6IHNvdXJjZS5pZCxcclxuXHRcdFx0XHRzdGF0dXM6IHNvdXJjZS5lbmFibGVkID8gXCJpZGxlXCIgOiBcImRpc2FibGVkXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFN0YXJ0IGJhY2tncm91bmQgcmVmcmVzaCBpZiBlbmFibGVkXHJcblx0XHRpZiAodGhpcy5jb25maWcuZW5hYmxlQmFja2dyb3VuZFJlZnJlc2gpIHtcclxuXHRcdFx0dGhpcy5zdGFydEJhY2tncm91bmRSZWZyZXNoKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc29sZS5sb2coXCJJQ1MgTWFuYWdlciBpbml0aWFsaXplZFwiKTtcclxuXHJcblx0XHQvLyBOb3RpZnkgbGlzdGVuZXJzIChlLmcuLCBJY3NTb3VyY2UpIHRoYXQgSUNTIGlzIHJlYWR5L2NvbmZpZyB1cGRhdGVkXHJcblx0XHQvLyB0cnkge1xyXG5cdFx0Ly8gXHR0aGlzLnBsdWdpbi5hcHA/LndvcmtzcGFjZT8udHJpZ2dlcj8uKFxyXG5cdFx0Ly8gXHRcdFwidGFzay1nZW5pdXM6aWNzLWNvbmZpZy1jaGFuZ2VkXCIsXHJcblx0XHQvLyBcdCk7XHJcblx0XHQvLyB9IGNhdGNoIChlKSB7XHJcblx0XHQvLyBcdGNvbnNvbGUud2FybihcclxuXHRcdC8vIFx0XHRcIltJY3NNYW5hZ2VyXSBGYWlsZWQgdG8gdHJpZ2dlciBpY3MtY29uZmlnLWNoYW5nZWQgb24gaW5pdGlhbGl6ZVwiLFxyXG5cdFx0Ly8gXHRcdGUsXHJcblx0XHQvLyBcdCk7XHJcblx0XHQvLyB9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgY29uZmlndXJhdGlvblxyXG5cdCAqL1xyXG5cdHVwZGF0ZUNvbmZpZyhjb25maWc6IEljc01hbmFnZXJDb25maWcpOiB2b2lkIHtcclxuXHRcdHRoaXMuY29uZmlnID0gY29uZmlnO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSBzeW5jIHN0YXR1c2VzIGZvciBuZXcvcmVtb3ZlZCBzb3VyY2VzXHJcblx0XHRjb25zdCBjdXJyZW50U291cmNlSWRzID0gbmV3IFNldCh0aGlzLmNvbmZpZy5zb3VyY2VzLm1hcCgocykgPT4gcy5pZCkpO1xyXG5cclxuXHRcdC8vIFJlbW92ZSBzdGF0dXNlcyBmb3IgZGVsZXRlZCBzb3VyY2VzXHJcblx0XHRmb3IgKGNvbnN0IFtzb3VyY2VJZF0gb2YgdGhpcy5zeW5jU3RhdHVzZXMpIHtcclxuXHRcdFx0aWYgKCFjdXJyZW50U291cmNlSWRzLmhhcyhzb3VyY2VJZCkpIHtcclxuXHRcdFx0XHR0aGlzLnN5bmNTdGF0dXNlcy5kZWxldGUoc291cmNlSWQpO1xyXG5cdFx0XHRcdHRoaXMuY2xlYXJSZWZyZXNoSW50ZXJ2YWwoc291cmNlSWQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWRkIHN0YXR1c2VzIGZvciBuZXcgc291cmNlc1xyXG5cdFx0Zm9yIChjb25zdCBzb3VyY2Ugb2YgdGhpcy5jb25maWcuc291cmNlcykge1xyXG5cdFx0XHRpZiAoIXRoaXMuc3luY1N0YXR1c2VzLmhhcyhzb3VyY2UuaWQpKSB7XHJcblx0XHRcdFx0dGhpcy5zeW5jU3RhdHVzZXMuc2V0KHNvdXJjZS5pZCwge1xyXG5cdFx0XHRcdFx0c291cmNlSWQ6IHNvdXJjZS5pZCxcclxuXHRcdFx0XHRcdHN0YXR1czogc291cmNlLmVuYWJsZWQgPyBcImlkbGVcIiA6IFwiZGlzYWJsZWRcIixcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlc3RhcnQgYmFja2dyb3VuZCByZWZyZXNoXHJcblx0XHRpZiAodGhpcy5jb25maWcuZW5hYmxlQmFja2dyb3VuZFJlZnJlc2gpIHtcclxuXHRcdFx0dGhpcy5zdGFydEJhY2tncm91bmRSZWZyZXNoKCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLnN0b3BCYWNrZ3JvdW5kUmVmcmVzaCgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIHRyeSB7XHJcblx0XHQvLyBcdHRoaXMucGx1Z2luLmFwcD8ud29ya3NwYWNlPy50cmlnZ2VyPy4oXHJcblx0XHQvLyBcdFx0XCJ0YXNrLWdlbml1czppY3MtY29uZmlnLWNoYW5nZWRcIixcclxuXHRcdC8vIFx0KTtcclxuXHRcdC8vIH0gY2F0Y2ggKGUpIHtcclxuXHRcdC8vIFx0Y29uc29sZS53YXJuKFxyXG5cdFx0Ly8gXHRcdFwiW0ljc01hbmFnZXJdIEZhaWxlZCB0byB0cmlnZ2VyIGljcy1jb25maWctY2hhbmdlZFwiLFxyXG5cdFx0Ly8gXHRcdGUsXHJcblx0XHQvLyBcdCk7XHJcblx0XHQvLyB9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTZXQgZXZlbnQgdXBkYXRlIGNhbGxiYWNrXHJcblx0ICovXHJcblx0c2V0T25FdmVudHNVcGRhdGVkKFxyXG5cdFx0Y2FsbGJhY2s6IChzb3VyY2VJZDogc3RyaW5nLCBldmVudHM6IEljc0V2ZW50W10pID0+IHZvaWQsXHJcblx0KTogdm9pZCB7XHJcblx0XHR0aGlzLm9uRXZlbnRzVXBkYXRlZCA9IGNhbGxiYWNrO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGN1cnJlbnQgY29uZmlndXJhdGlvblxyXG5cdCAqL1xyXG5cdGdldENvbmZpZygpOiBJY3NNYW5hZ2VyQ29uZmlnIHtcclxuXHRcdHJldHVybiB0aGlzLmNvbmZpZztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBhbGwgZXZlbnRzIGZyb20gYWxsIGVuYWJsZWQgc291cmNlc1xyXG5cdCAqL1xyXG5cdGdldEFsbEV2ZW50cygpOiBJY3NFdmVudFtdIHtcclxuXHRcdGNvbnN0IGFsbEV2ZW50czogSWNzRXZlbnRbXSA9IFtdO1xyXG5cclxuXHRcdGNvbnNvbGUubG9nKFwiZ2V0QWxsRXZlbnRzOiBjYWNoZSBzaXplXCIsIHRoaXMuY2FjaGUuc2l6ZSk7XHJcblx0XHRjb25zb2xlLmxvZyhcImdldEFsbEV2ZW50czogY29uZmlnIHNvdXJjZXNcIiwgdGhpcy5jb25maWcuc291cmNlcyk7XHJcblxyXG5cdFx0Zm9yIChjb25zdCBbc291cmNlSWQsIGNhY2hlRW50cnldIG9mIHRoaXMuY2FjaGUpIHtcclxuXHRcdFx0Y29uc3Qgc291cmNlID0gdGhpcy5jb25maWcuc291cmNlcy5maW5kKChzKSA9PiBzLmlkID09PSBzb3VyY2VJZCk7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwic291cmNlXCIsIHNvdXJjZSwgXCJzb3VyY2VJZFwiLCBzb3VyY2VJZCk7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiY2FjaGVFbnRyeSBldmVudHMgY291bnRcIiwgY2FjaGVFbnRyeS5ldmVudHMubGVuZ3RoKTtcclxuXHJcblx0XHRcdGlmIChzb3VyY2U/LmVuYWJsZWQpIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcIlNvdXJjZSBpcyBlbmFibGVkLCBhcHBseWluZyBmaWx0ZXJzXCIpO1xyXG5cdFx0XHRcdC8vIEFwcGx5IGZpbHRlcnMgaWYgY29uZmlndXJlZFxyXG5cdFx0XHRcdGNvbnN0IGZpbHRlcmVkRXZlbnRzID0gdGhpcy5hcHBseUZpbHRlcnMoXHJcblx0XHRcdFx0XHRjYWNoZUVudHJ5LmV2ZW50cyxcclxuXHRcdFx0XHRcdHNvdXJjZSxcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiZmlsdGVyZWRFdmVudHMgY291bnRcIiwgZmlsdGVyZWRFdmVudHMubGVuZ3RoKTtcclxuXHRcdFx0XHRhbGxFdmVudHMucHVzaCguLi5maWx0ZXJlZEV2ZW50cyk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXCJTb3VyY2Ugbm90IGVuYWJsZWQgb3Igbm90IGZvdW5kXCIsIHNvdXJjZT8uZW5hYmxlZCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRjb25zb2xlLmxvZyhcImdldEFsbEV2ZW50czogdG90YWwgZXZlbnRzXCIsIGFsbEV2ZW50cy5sZW5ndGgpO1xyXG5cdFx0cmV0dXJuIGFsbEV2ZW50cztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBhbGwgZXZlbnRzIHdpdGggaG9saWRheSBkZXRlY3Rpb24gYW5kIGZpbHRlcmluZ1xyXG5cdCAqL1xyXG5cdGdldEFsbEV2ZW50c1dpdGhIb2xpZGF5RGV0ZWN0aW9uKCk6IEljc0V2ZW50V2l0aEhvbGlkYXlbXSB7XHJcblx0XHRjb25zdCBhbGxFdmVudHM6IEljc0V2ZW50V2l0aEhvbGlkYXlbXSA9IFtdO1xyXG5cclxuXHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcImdldEFsbEV2ZW50c1dpdGhIb2xpZGF5RGV0ZWN0aW9uOiBjYWNoZSBzaXplXCIsXHJcblx0XHRcdHRoaXMuY2FjaGUuc2l6ZSxcclxuXHRcdCk7XHJcblx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XCJnZXRBbGxFdmVudHNXaXRoSG9saWRheURldGVjdGlvbjogY29uZmlnIHNvdXJjZXNcIixcclxuXHRcdFx0dGhpcy5jb25maWcuc291cmNlcyxcclxuXHRcdCk7XHJcblxyXG5cdFx0Zm9yIChjb25zdCBbc291cmNlSWQsIGNhY2hlRW50cnldIG9mIHRoaXMuY2FjaGUpIHtcclxuXHRcdFx0Y29uc3Qgc291cmNlID0gdGhpcy5jb25maWcuc291cmNlcy5maW5kKChzKSA9PiBzLmlkID09PSBzb3VyY2VJZCk7XHJcblxyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcIlByb2Nlc3Npbmcgc291cmNlOlwiLFxyXG5cdFx0XHRcdHNvdXJjZUlkLFxyXG5cdFx0XHRcdFwiZW5hYmxlZDpcIixcclxuXHRcdFx0XHRzb3VyY2U/LmVuYWJsZWQsXHJcblx0XHRcdCk7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiQ2FjaGUgZW50cnkgZXZlbnRzIGNvdW50OlwiLCBjYWNoZUVudHJ5LmV2ZW50cy5sZW5ndGgpO1xyXG5cclxuXHRcdFx0aWYgKHNvdXJjZT8uZW5hYmxlZCkge1xyXG5cdFx0XHRcdC8vIEFwcGx5IGZpbHRlcnMgZmlyc3RcclxuXHRcdFx0XHRjb25zdCBmaWx0ZXJlZEV2ZW50cyA9IHRoaXMuYXBwbHlGaWx0ZXJzKFxyXG5cdFx0XHRcdFx0Y2FjaGVFbnRyeS5ldmVudHMsXHJcblx0XHRcdFx0XHRzb3VyY2UsXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0Y29uc29sZS5sb2coXCJGaWx0ZXJlZCBldmVudHMgY291bnQ6XCIsIGZpbHRlcmVkRXZlbnRzLmxlbmd0aCk7XHJcblxyXG5cdFx0XHRcdC8vIEFwcGx5IGhvbGlkYXkgZGV0ZWN0aW9uIGlmIGNvbmZpZ3VyZWRcclxuXHRcdFx0XHRsZXQgcHJvY2Vzc2VkRXZlbnRzOiBJY3NFdmVudFdpdGhIb2xpZGF5W107XHJcblx0XHRcdFx0aWYgKHNvdXJjZS5ob2xpZGF5Q29uZmlnPy5lbmFibGVkKSB7XHJcblx0XHRcdFx0XHRwcm9jZXNzZWRFdmVudHMgPVxyXG5cdFx0XHRcdFx0XHRIb2xpZGF5RGV0ZWN0b3IucHJvY2Vzc0V2ZW50c1dpdGhIb2xpZGF5RGV0ZWN0aW9uKFxyXG5cdFx0XHRcdFx0XHRcdGZpbHRlcmVkRXZlbnRzLFxyXG5cdFx0XHRcdFx0XHRcdHNvdXJjZS5ob2xpZGF5Q29uZmlnLFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHQvLyBDb252ZXJ0IHRvIEljc0V2ZW50V2l0aEhvbGlkYXkgZm9ybWF0IHdpdGhvdXQgaG9saWRheSBkZXRlY3Rpb25cclxuXHRcdFx0XHRcdHByb2Nlc3NlZEV2ZW50cyA9IGZpbHRlcmVkRXZlbnRzLm1hcCgoZXZlbnQpID0+ICh7XHJcblx0XHRcdFx0XHRcdC4uLmV2ZW50LFxyXG5cdFx0XHRcdFx0XHRpc0hvbGlkYXk6IGZhbHNlLFxyXG5cdFx0XHRcdFx0XHRzaG93SW5Gb3JlY2FzdDogdHJ1ZSxcclxuXHRcdFx0XHRcdH0pKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiUHJvY2Vzc2VkIGV2ZW50cyBjb3VudDpcIiwgcHJvY2Vzc2VkRXZlbnRzLmxlbmd0aCk7XHJcblx0XHRcdFx0YWxsRXZlbnRzLnB1c2goLi4ucHJvY2Vzc2VkRXZlbnRzKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcImdldEFsbEV2ZW50c1dpdGhIb2xpZGF5RGV0ZWN0aW9uOiB0b3RhbCBldmVudHNcIixcclxuXHRcdFx0YWxsRXZlbnRzLmxlbmd0aCxcclxuXHRcdCk7XHJcblx0XHRyZXR1cm4gYWxsRXZlbnRzO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBsYXN0U3luY1RpbWUgPSAwO1xyXG5cdHByaXZhdGUgcmVhZG9ubHkgU1lOQ19ERUJPVU5DRV9NUyA9IDMwMDAwOyAvLyAzMCBzZWNvbmRzIGRlYm91bmNlXHJcblx0cHJpdmF0ZSBzeW5jUHJvbWlzZTogUHJvbWlzZTxNYXA8c3RyaW5nLCBJY3NGZXRjaFJlc3VsdD4+IHwgbnVsbCA9IG51bGw7XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBhbGwgZXZlbnRzIGZyb20gYWxsIGVuYWJsZWQgc291cmNlcyB3aXRoIGZvcmNlZCBzeW5jXHJcblx0ICogVGhpcyB3aWxsIHRyaWdnZXIgYSBzeW5jIGZvciBhbGwgZW5hYmxlZCBzb3VyY2VzIGJlZm9yZSByZXR1cm5pbmcgZXZlbnRzXHJcblx0ICogSW5jbHVkZXMgZGVib3VuY2luZyB0byBwcmV2ZW50IGV4Y2Vzc2l2ZSBzeW5jaW5nIGFuZCBkZWR1cGxpY2F0aW9uIG9mIGNvbmN1cnJlbnQgcmVxdWVzdHNcclxuXHQgKi9cclxuXHRhc3luYyBnZXRBbGxFdmVudHNXaXRoU3luYygpOiBQcm9taXNlPEljc0V2ZW50W10+IHtcclxuXHRcdGNvbnN0IG5vdyA9IERhdGUubm93KCk7XHJcblxyXG5cdFx0Ly8gSWYgdGhlcmUncyBhbHJlYWR5IGEgc3luYyBpbiBwcm9ncmVzcywgd2FpdCBmb3IgaXRcclxuXHRcdGlmICh0aGlzLnN5bmNQcm9taXNlKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiSUNTOiBXYWl0aW5nIGZvciBleGlzdGluZyBzeW5jIHRvIGNvbXBsZXRlXCIpO1xyXG5cdFx0XHRhd2FpdCB0aGlzLnN5bmNQcm9taXNlO1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5nZXRBbGxFdmVudHMoKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBPbmx5IHN5bmMgaWYgZW5vdWdoIHRpbWUgaGFzIHBhc3NlZCBzaW5jZSBsYXN0IHN5bmNcclxuXHRcdGlmIChub3cgLSB0aGlzLmxhc3RTeW5jVGltZSA+IHRoaXMuU1lOQ19ERUJPVU5DRV9NUykge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIklDUzogU3RhcnRpbmcgc3luYyAoZGVib3VuY2VkKVwiKTtcclxuXHRcdFx0dGhpcy5zeW5jUHJvbWlzZSA9IHRoaXMuc3luY0FsbFNvdXJjZXMoKS5maW5hbGx5KCgpID0+IHtcclxuXHRcdFx0XHR0aGlzLnN5bmNQcm9taXNlID0gbnVsbDtcclxuXHRcdFx0fSk7XHJcblx0XHRcdGF3YWl0IHRoaXMuc3luY1Byb21pc2U7XHJcblx0XHRcdHRoaXMubGFzdFN5bmNUaW1lID0gbm93O1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJJQ1M6IFNraXBwaW5nIHN5bmMgKGRlYm91bmNlZClcIik7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUmV0dXJuIGFsbCBldmVudHMgYWZ0ZXIgc3luY1xyXG5cdFx0cmV0dXJuIHRoaXMuZ2V0QWxsRXZlbnRzKCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgYWxsIGV2ZW50cyBmcm9tIGFsbCBlbmFibGVkIHNvdXJjZXMgd2l0aG91dCBibG9ja2luZ1xyXG5cdCAqIFRoaXMgd2lsbCByZXR1cm4gY2FjaGVkIGRhdGEgaW1tZWRpYXRlbHkgYW5kIG9wdGlvbmFsbHkgdHJpZ2dlciBiYWNrZ3JvdW5kIHN5bmNcclxuXHQgKi9cclxuXHRnZXRBbGxFdmVudHNOb25CbG9ja2luZyh0cmlnZ2VyQmFja2dyb3VuZFN5bmM6IGJvb2xlYW4gPSB0cnVlKTogSWNzRXZlbnRbXSB7XHJcblx0XHRjb25zdCBldmVudHMgPSB0aGlzLmdldEFsbEV2ZW50cygpO1xyXG5cclxuXHRcdC8vIE9wdGlvbmFsbHkgdHJpZ2dlciBiYWNrZ3JvdW5kIHN5bmMgaWYgZGF0YSBtaWdodCBiZSBzdGFsZVxyXG5cdFx0aWYgKHRyaWdnZXJCYWNrZ3JvdW5kU3luYykge1xyXG5cdFx0XHR0aGlzLnRyaWdnZXJCYWNrZ3JvdW5kU3luY0lmTmVlZGVkKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGV2ZW50cztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFRyaWdnZXIgYmFja2dyb3VuZCBzeW5jIGlmIG5lZWRlZCAobm9uLWJsb2NraW5nKVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgdHJpZ2dlckJhY2tncm91bmRTeW5jSWZOZWVkZWQoKTogdm9pZCB7XHJcblx0XHRjb25zdCBub3cgPSBEYXRlLm5vdygpO1xyXG5cclxuXHRcdC8vIENoZWNrIGlmIHdlIG5lZWQgdG8gc3luYyBhbnkgc291cmNlc1xyXG5cdFx0Y29uc3QgbmVlZHNTeW5jID0gdGhpcy5jb25maWcuc291cmNlcy5zb21lKChzb3VyY2UpID0+IHtcclxuXHRcdFx0aWYgKCFzb3VyY2UuZW5hYmxlZCkgcmV0dXJuIGZhbHNlO1xyXG5cclxuXHRcdFx0Y29uc3QgY2FjaGVFbnRyeSA9IHRoaXMuY2FjaGUuZ2V0KHNvdXJjZS5pZCk7XHJcblx0XHRcdGlmICghY2FjaGVFbnRyeSkgcmV0dXJuIHRydWU7IC8vIE5vIGNhY2hlLCBuZWVkcyBzeW5jXHJcblxyXG5cdFx0XHQvLyBDaGVjayBpZiBjYWNoZSBpcyBleHBpcmVkXHJcblx0XHRcdGNvbnN0IGlzRXhwaXJlZCA9IG5vdyA+IGNhY2hlRW50cnkuZXhwaXJlc0F0O1xyXG5cdFx0XHRyZXR1cm4gaXNFeHBpcmVkO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gT25seSBzeW5jIGlmIGVub3VnaCB0aW1lIGhhcyBwYXNzZWQgc2luY2UgbGFzdCBzeW5jIGFuZCB3ZSBuZWVkIGl0XHJcblx0XHRpZiAobmVlZHNTeW5jICYmIG5vdyAtIHRoaXMubGFzdFN5bmNUaW1lID4gdGhpcy5TWU5DX0RFQk9VTkNFX01TKSB7XHJcblx0XHRcdC8vIFN0YXJ0IGJhY2tncm91bmQgc3luYyB3aXRob3V0IHdhaXRpbmdcclxuXHRcdFx0dGhpcy5zeW5jQWxsU291cmNlcygpLmNhdGNoKChlcnJvcikgPT4ge1xyXG5cdFx0XHRcdGNvbnNvbGUud2FybihcIkJhY2tncm91bmQgSUNTIHN5bmMgZmFpbGVkOlwiLCBlcnJvcik7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGV2ZW50cyBmcm9tIGEgc3BlY2lmaWMgc291cmNlXHJcblx0ICovXHJcblx0Z2V0RXZlbnRzRnJvbVNvdXJjZShzb3VyY2VJZDogc3RyaW5nKTogSWNzRXZlbnRbXSB7XHJcblx0XHRjb25zdCBjYWNoZUVudHJ5ID0gdGhpcy5jYWNoZS5nZXQoc291cmNlSWQpO1xyXG5cdFx0Y29uc3Qgc291cmNlID0gdGhpcy5jb25maWcuc291cmNlcy5maW5kKChzKSA9PiBzLmlkID09PSBzb3VyY2VJZCk7XHJcblxyXG5cdFx0aWYgKCFjYWNoZUVudHJ5IHx8ICFzb3VyY2U/LmVuYWJsZWQpIHtcclxuXHRcdFx0cmV0dXJuIFtdO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0aGlzLmFwcGx5RmlsdGVycyhjYWNoZUVudHJ5LmV2ZW50cywgc291cmNlKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENvbnZlcnQgSUNTIGV2ZW50cyB0byBUYXNrIGZvcm1hdFxyXG5cdCAqL1xyXG5cdGNvbnZlcnRFdmVudHNUb1Rhc2tzKGV2ZW50czogSWNzRXZlbnRbXSk6IEljc1Rhc2tbXSB7XHJcblx0XHRyZXR1cm4gZXZlbnRzLm1hcCgoZXZlbnQpID0+IHRoaXMuY29udmVydEV2ZW50VG9UYXNrKGV2ZW50KSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDb252ZXJ0IElDUyBldmVudHMgd2l0aCBob2xpZGF5IGRldGVjdGlvbiB0byBUYXNrIGZvcm1hdFxyXG5cdCAqL1xyXG5cdGNvbnZlcnRFdmVudHNXaXRoSG9saWRheVRvVGFza3MoZXZlbnRzOiBJY3NFdmVudFdpdGhIb2xpZGF5W10pOiBJY3NUYXNrW10ge1xyXG5cdFx0cmV0dXJuIGV2ZW50c1xyXG5cdFx0XHQuZmlsdGVyKChldmVudCkgPT4gZXZlbnQuc2hvd0luRm9yZWNhc3QpIC8vIEZpbHRlciBvdXQgZXZlbnRzIHRoYXQgc2hvdWxkbid0IHNob3cgaW4gZm9yZWNhc3RcclxuXHRcdFx0Lm1hcCgoZXZlbnQpID0+IHRoaXMuY29udmVydEV2ZW50V2l0aEhvbGlkYXlUb1Rhc2soZXZlbnQpKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENvbnZlcnQgc2luZ2xlIElDUyBldmVudCB0byBUYXNrIGZvcm1hdFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgY29udmVydEV2ZW50VG9UYXNrKGV2ZW50OiBJY3NFdmVudCk6IEljc1Rhc2sge1xyXG5cdFx0Ly8gQXBwbHkgdGV4dCByZXBsYWNlbWVudHMgdG8gdGhlIGV2ZW50XHJcblx0XHRjb25zdCBwcm9jZXNzZWRFdmVudCA9IHRoaXMuYXBwbHlUZXh0UmVwbGFjZW1lbnRzKGV2ZW50KTtcclxuXHJcblx0XHQvLyBBcHBseSBzdGF0dXMgbWFwcGluZ1xyXG5cdFx0Y29uc3QgbWFwcGVkU3RhdHVzID0gU3RhdHVzTWFwcGVyLmFwcGx5U3RhdHVzTWFwcGluZyhcclxuXHRcdFx0ZXZlbnQsXHJcblx0XHRcdGV2ZW50LnNvdXJjZS5zdGF0dXNNYXBwaW5nLFxyXG5cdFx0XHR0aGlzLnBsdWdpblNldHRpbmdzLFxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBFeHRyYWN0IHRpbWUgY29tcG9uZW50cyBmcm9tIGV2ZW50IGRlc2NyaXB0aW9uIGFuZCBwcmVzZXJ2ZSBvcmlnaW5hbCBJQ1MgdGltZSBpbmZvcm1hdGlvblxyXG5cdFx0Y29uc3QgZW5oYW5jZWRNZXRhZGF0YSA9IHRoaXMuZXh0cmFjdFRpbWVDb21wb25lbnRzRnJvbUljc0V2ZW50KGV2ZW50LCB7XHJcblx0XHRcdC4uLmV2ZW50LFxyXG5cdFx0XHQuLi5wcm9jZXNzZWRFdmVudCxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IHRhc2s6IEljc1Rhc2sgPSB7XHJcblx0XHRcdGlkOiBgaWNzLSR7ZXZlbnQuc291cmNlLmlkfS0ke2V2ZW50LnVpZH1gLFxyXG5cdFx0XHRjb250ZW50OiBwcm9jZXNzZWRFdmVudC5zdW1tYXJ5LFxyXG5cdFx0XHRmaWxlUGF0aDogYGljczovLyR7ZXZlbnQuc291cmNlLm5hbWV9YCxcclxuXHRcdFx0bGluZTogMCxcclxuXHRcdFx0Y29tcGxldGVkOlxyXG5cdFx0XHRcdG1hcHBlZFN0YXR1cyA9PT0gXCJ4XCIgfHxcclxuXHRcdFx0XHRtYXBwZWRTdGF0dXMgPT09XHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpblNldHRpbmdzLnRhc2tTdGF0dXNNYXJrc1tcIkNvbXBsZXRlZFwiXSxcclxuXHRcdFx0c3RhdHVzOiBtYXBwZWRTdGF0dXMsXHJcblx0XHRcdG9yaWdpbmFsTWFya2Rvd246IGAtIFske21hcHBlZFN0YXR1c31dICR7cHJvY2Vzc2VkRXZlbnQuc3VtbWFyeX1gLFxyXG5cdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdHRhZ3M6IGV2ZW50LmNhdGVnb3JpZXMgfHwgW10sXHJcblx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdHByaW9yaXR5OiB0aGlzLm1hcEljc1ByaW9yaXR5VG9UYXNrUHJpb3JpdHkoZXZlbnQucHJpb3JpdHkpLFxyXG5cdFx0XHRcdHN0YXJ0RGF0ZTogZXZlbnQuZHRzdGFydC5nZXRUaW1lKCksXHJcblx0XHRcdFx0ZHVlRGF0ZTogZXZlbnQuZHRlbmQ/LmdldFRpbWUoKSxcclxuXHRcdFx0XHRzY2hlZHVsZWREYXRlOiBldmVudC5kdHN0YXJ0LmdldFRpbWUoKSxcclxuXHRcdFx0XHRwcm9qZWN0OiBldmVudC5zb3VyY2UubmFtZSxcclxuXHRcdFx0XHRjb250ZXh0OiBwcm9jZXNzZWRFdmVudC5sb2NhdGlvbixcclxuXHRcdFx0XHRoZWFkaW5nOiBbXSxcclxuXHRcdFx0XHRcclxuXHRcdFx0XHQvLyBFbmhhbmNlZCB0aW1lIGNvbXBvbmVudHNcclxuXHRcdFx0XHQuLi5lbmhhbmNlZE1ldGFkYXRhLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHRpY3NFdmVudDoge1xyXG5cdFx0XHRcdC4uLmV2ZW50LFxyXG5cdFx0XHRcdHN1bW1hcnk6IHByb2Nlc3NlZEV2ZW50LnN1bW1hcnksXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IHByb2Nlc3NlZEV2ZW50LmRlc2NyaXB0aW9uLFxyXG5cdFx0XHRcdGxvY2F0aW9uOiBwcm9jZXNzZWRFdmVudC5sb2NhdGlvbixcclxuXHRcdFx0fSxcclxuXHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdGJhZGdlOiBldmVudC5zb3VyY2Uuc2hvd1R5cGUgPT09IFwiYmFkZ2VcIixcclxuXHRcdFx0c291cmNlOiB7XHJcblx0XHRcdFx0dHlwZTogXCJpY3NcIixcclxuXHRcdFx0XHRuYW1lOiBldmVudC5zb3VyY2UubmFtZSxcclxuXHRcdFx0XHRpZDogZXZlbnQuc291cmNlLmlkLFxyXG5cdFx0XHR9LFxyXG5cdFx0fTtcclxuXHJcblx0XHRyZXR1cm4gdGFzaztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENvbnZlcnQgc2luZ2xlIElDUyBldmVudCB3aXRoIGhvbGlkYXkgZGV0ZWN0aW9uIHRvIFRhc2sgZm9ybWF0XHJcblx0ICovXHJcblx0cHJpdmF0ZSBjb252ZXJ0RXZlbnRXaXRoSG9saWRheVRvVGFzayhcclxuXHRcdGV2ZW50OiBJY3NFdmVudFdpdGhIb2xpZGF5LFxyXG5cdCk6IFRhc2s8RXh0ZW5kZWRNZXRhZGF0YT4gJiB7XHJcblx0XHRpY3NFdmVudDogSWNzRXZlbnQ7XHJcblx0XHRyZWFkb25seTogdHJ1ZTtcclxuXHRcdGJhZGdlOiBib29sZWFuO1xyXG5cdFx0c291cmNlOiB7IHR5cGU6IFwiaWNzXCI7IG5hbWU6IHN0cmluZzsgaWQ6IHN0cmluZyB9O1xyXG5cdH0ge1xyXG5cdFx0Ly8gQXBwbHkgdGV4dCByZXBsYWNlbWVudHMgdG8gdGhlIGV2ZW50XHJcblx0XHRjb25zdCBwcm9jZXNzZWRFdmVudCA9IHRoaXMuYXBwbHlUZXh0UmVwbGFjZW1lbnRzKGV2ZW50KTtcclxuXHJcblx0XHQvLyBVc2UgaG9saWRheSBncm91cCB0aXRsZSBpZiBhdmFpbGFibGUgYW5kIHN0cmF0ZWd5IGlzIHN1bW1hcnlcclxuXHRcdGxldCBkaXNwbGF5VGl0bGUgPSBwcm9jZXNzZWRFdmVudC5zdW1tYXJ5O1xyXG5cdFx0aWYgKFxyXG5cdFx0XHRldmVudC5ob2xpZGF5R3JvdXAgJiZcclxuXHRcdFx0ZXZlbnQuaG9saWRheUdyb3VwLmRpc3BsYXlTdHJhdGVneSA9PT0gXCJzdW1tYXJ5XCJcclxuXHRcdCkge1xyXG5cdFx0XHRkaXNwbGF5VGl0bGUgPSBldmVudC5ob2xpZGF5R3JvdXAudGl0bGU7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQXBwbHkgc3RhdHVzIG1hcHBpbmdcclxuXHRcdGNvbnN0IG1hcHBlZFN0YXR1cyA9IFN0YXR1c01hcHBlci5hcHBseVN0YXR1c01hcHBpbmcoXHJcblx0XHRcdGV2ZW50LFxyXG5cdFx0XHRldmVudC5zb3VyY2Uuc3RhdHVzTWFwcGluZyxcclxuXHRcdFx0dGhpcy5wbHVnaW5TZXR0aW5ncyxcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gRXh0cmFjdCB0aW1lIGNvbXBvbmVudHMgZnJvbSBldmVudCBkZXNjcmlwdGlvbiBhbmQgcHJlc2VydmUgb3JpZ2luYWwgSUNTIHRpbWUgaW5mb3JtYXRpb25cclxuXHRcdGNvbnN0IGVuaGFuY2VkTWV0YWRhdGEgPSB0aGlzLmV4dHJhY3RUaW1lQ29tcG9uZW50c0Zyb21JY3NFdmVudChldmVudCwge1xyXG5cdFx0XHQuLi5ldmVudCxcclxuXHRcdFx0Li4ucHJvY2Vzc2VkRXZlbnQsXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCB0YXNrOiBJY3NUYXNrID0ge1xyXG5cdFx0XHRpZDogYGljcy0ke2V2ZW50LnNvdXJjZS5pZH0tJHtldmVudC51aWR9YCxcclxuXHRcdFx0Y29udGVudDogZGlzcGxheVRpdGxlLFxyXG5cdFx0XHRmaWxlUGF0aDogYGljczovLyR7ZXZlbnQuc291cmNlLm5hbWV9YCxcclxuXHRcdFx0bGluZTogMCxcclxuXHRcdFx0Y29tcGxldGVkOlxyXG5cdFx0XHRcdG1hcHBlZFN0YXR1cyA9PT0gXCJ4XCIgfHxcclxuXHRcdFx0XHRtYXBwZWRTdGF0dXMgPT09XHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpblNldHRpbmdzLnRhc2tTdGF0dXNNYXJrc1tcIkNvbXBsZXRlZFwiXSxcclxuXHRcdFx0c3RhdHVzOiBtYXBwZWRTdGF0dXMsXHJcblx0XHRcdG9yaWdpbmFsTWFya2Rvd246IGAtIFske21hcHBlZFN0YXR1c31dICR7ZGlzcGxheVRpdGxlfWAsXHJcblx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0dGFnczogZXZlbnQuY2F0ZWdvcmllcyB8fCBbXSxcclxuXHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0cHJpb3JpdHk6IHRoaXMubWFwSWNzUHJpb3JpdHlUb1Rhc2tQcmlvcml0eShldmVudC5wcmlvcml0eSksXHJcblx0XHRcdFx0c3RhcnREYXRlOiBldmVudC5kdHN0YXJ0LmdldFRpbWUoKSxcclxuXHRcdFx0XHRkdWVEYXRlOiBldmVudC5kdGVuZD8uZ2V0VGltZSgpLFxyXG5cdFx0XHRcdHNjaGVkdWxlZERhdGU6IGV2ZW50LmR0c3RhcnQuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdHByb2plY3Q6IGV2ZW50LnNvdXJjZS5uYW1lLFxyXG5cdFx0XHRcdGNvbnRleHQ6IHByb2Nlc3NlZEV2ZW50LmxvY2F0aW9uLFxyXG5cdFx0XHRcdGhlYWRpbmc6IFtdLFxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdC8vIEVuaGFuY2VkIHRpbWUgY29tcG9uZW50c1xyXG5cdFx0XHRcdC4uLmVuaGFuY2VkTWV0YWRhdGEsXHJcblx0XHRcdH0gYXMgYW55LCAvLyBVc2UgYW55IHRvIGFsbG93IGFkZGl0aW9uYWwgaG9saWRheSBmaWVsZHNcclxuXHRcdFx0aWNzRXZlbnQ6IHtcclxuXHRcdFx0XHQuLi5ldmVudCxcclxuXHRcdFx0XHRzdW1tYXJ5OiBwcm9jZXNzZWRFdmVudC5zdW1tYXJ5LFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBwcm9jZXNzZWRFdmVudC5kZXNjcmlwdGlvbixcclxuXHRcdFx0XHRsb2NhdGlvbjogcHJvY2Vzc2VkRXZlbnQubG9jYXRpb24sXHJcblx0XHRcdH0sXHJcblx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0XHRiYWRnZTogZXZlbnQuc291cmNlLnNob3dUeXBlID09PSBcImJhZGdlXCIsXHJcblx0XHRcdHNvdXJjZToge1xyXG5cdFx0XHRcdHR5cGU6IFwiaWNzXCIsXHJcblx0XHRcdFx0bmFtZTogZXZlbnQuc291cmNlLm5hbWUsXHJcblx0XHRcdFx0aWQ6IGV2ZW50LnNvdXJjZS5pZCxcclxuXHRcdFx0fSxcclxuXHRcdH07XHJcblxyXG5cdFx0cmV0dXJuIHRhc2s7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFeHRyYWN0IHRpbWUgY29tcG9uZW50cyBmcm9tIElDUyBldmVudCBhbmQgcHJlc2VydmUgb3JpZ2luYWwgdGltZSBpbmZvcm1hdGlvblxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZXh0cmFjdFRpbWVDb21wb25lbnRzRnJvbUljc0V2ZW50KFxyXG5cdFx0ZXZlbnQ6IEljc0V2ZW50LFxyXG5cdFx0cHJvY2Vzc2VkRXZlbnQ6IEljc0V2ZW50XHJcblx0KTogUGFydGlhbDxFbmhhbmNlZFN0YW5kYXJkVGFza01ldGFkYXRhPiB7XHJcblx0XHRpZiAoIXRoaXMudGltZVBhcnNpbmdTZXJ2aWNlKSB7XHJcblx0XHRcdHJldHVybiB7fTtcclxuXHRcdH1cclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBDcmVhdGUgdGltZSBjb21wb25lbnRzIGZyb20gSUNTIGV2ZW50IHRpbWVzXHJcblx0XHRcdGNvbnN0IHRpbWVDb21wb25lbnRzOiBFbmhhbmNlZFN0YW5kYXJkVGFza01ldGFkYXRhW1widGltZUNvbXBvbmVudHNcIl0gPSB7fTtcclxuXHJcblx0XHRcdC8vIEV4dHJhY3QgdGltZSBmcm9tIElDUyBkdHN0YXJ0IChzdGFydCB0aW1lKVxyXG5cdFx0XHRpZiAoZXZlbnQuZHRzdGFydCAmJiAhZXZlbnQuYWxsRGF5KSB7XHJcblx0XHRcdFx0Y29uc3Qgc3RhcnRUaW1lQ29tcG9uZW50ID0gdGhpcy5jcmVhdGVUaW1lQ29tcG9uZW50RnJvbURhdGUoZXZlbnQuZHRzdGFydCk7XHJcblx0XHRcdFx0aWYgKHN0YXJ0VGltZUNvbXBvbmVudCkge1xyXG5cdFx0XHRcdFx0dGltZUNvbXBvbmVudHMuc3RhcnRUaW1lID0gc3RhcnRUaW1lQ29tcG9uZW50O1xyXG5cdFx0XHRcdFx0dGltZUNvbXBvbmVudHMuc2NoZWR1bGVkVGltZSA9IHN0YXJ0VGltZUNvbXBvbmVudDsgLy8gSUNTIGV2ZW50cyBhcmUgdHlwaWNhbGx5IHNjaGVkdWxlZFxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gRXh0cmFjdCB0aW1lIGZyb20gSUNTIGR0ZW5kIChlbmQgdGltZSlcclxuXHRcdFx0aWYgKGV2ZW50LmR0ZW5kICYmICFldmVudC5hbGxEYXkpIHtcclxuXHRcdFx0XHRjb25zdCBlbmRUaW1lQ29tcG9uZW50ID0gdGhpcy5jcmVhdGVUaW1lQ29tcG9uZW50RnJvbURhdGUoZXZlbnQuZHRlbmQpO1xyXG5cdFx0XHRcdGlmIChlbmRUaW1lQ29tcG9uZW50KSB7XHJcblx0XHRcdFx0XHR0aW1lQ29tcG9uZW50cy5lbmRUaW1lID0gZW5kVGltZUNvbXBvbmVudDtcclxuXHRcdFx0XHRcdHRpbWVDb21wb25lbnRzLmR1ZVRpbWUgPSBlbmRUaW1lQ29tcG9uZW50OyAvLyBFbmQgdGltZSBjYW4gYmUgY29uc2lkZXJlZCBkdWUgdGltZVxyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0XHQvLyBDcmVhdGUgcmFuZ2UgcmVsYXRpb25zaGlwIGlmIGJvdGggc3RhcnQgYW5kIGVuZCBleGlzdFxyXG5cdFx0XHRcdFx0aWYgKHRpbWVDb21wb25lbnRzLnN0YXJ0VGltZSkge1xyXG5cdFx0XHRcdFx0XHR0aW1lQ29tcG9uZW50cy5zdGFydFRpbWUuaXNSYW5nZSA9IHRydWU7XHJcblx0XHRcdFx0XHRcdHRpbWVDb21wb25lbnRzLnN0YXJ0VGltZS5yYW5nZVBhcnRuZXIgPSBlbmRUaW1lQ29tcG9uZW50O1xyXG5cdFx0XHRcdFx0XHRlbmRUaW1lQ29tcG9uZW50LmlzUmFuZ2UgPSB0cnVlO1xyXG5cdFx0XHRcdFx0XHRlbmRUaW1lQ29tcG9uZW50LnJhbmdlUGFydG5lciA9IHRpbWVDb21wb25lbnRzLnN0YXJ0VGltZTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEFsc28gcGFyc2UgdGltZSBjb21wb25lbnRzIGZyb20gZXZlbnQgZGVzY3JpcHRpb24gYW5kIHN1bW1hcnkgaWYgYXZhaWxhYmxlXHJcblx0XHRcdGxldCBkZXNjcmlwdGlvblRpbWVDb21wb25lbnRzOiBFbmhhbmNlZFN0YW5kYXJkVGFza01ldGFkYXRhW1widGltZUNvbXBvbmVudHNcIl0gPSB7fTtcclxuXHRcdFx0Y29uc3QgdGV4dFRvUGFyc2UgPSBbcHJvY2Vzc2VkRXZlbnQuc3VtbWFyeSwgcHJvY2Vzc2VkRXZlbnQuZGVzY3JpcHRpb24sIHByb2Nlc3NlZEV2ZW50LmxvY2F0aW9uXVxyXG5cdFx0XHRcdC5maWx0ZXIoQm9vbGVhbilcclxuXHRcdFx0XHQuam9pbignICcpO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKHRleHRUb1BhcnNlLnRyaW0oKSkge1xyXG5cdFx0XHRcdGNvbnN0IHsgdGltZUNvbXBvbmVudHM6IHBhcnNlZENvbXBvbmVudHMgfSA9IHRoaXMudGltZVBhcnNpbmdTZXJ2aWNlLnBhcnNlVGltZUNvbXBvbmVudHModGV4dFRvUGFyc2UpO1xyXG5cdFx0XHRcdGRlc2NyaXB0aW9uVGltZUNvbXBvbmVudHMgPSBwYXJzZWRDb21wb25lbnRzO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBNZXJnZSBJQ1MgdGltZSBjb21wb25lbnRzIHdpdGggcGFyc2VkIGRlc2NyaXB0aW9uIGNvbXBvbmVudHNcclxuXHRcdFx0Ly8gSUNTIHRpbWVzIHRha2UgcHJlY2VkZW5jZSwgYnV0IGRlc2NyaXB0aW9uIGNhbiBwcm92aWRlIGFkZGl0aW9uYWwgY29udGV4dFxyXG5cdFx0XHRjb25zdCBtZXJnZWRUaW1lQ29tcG9uZW50cyA9IHtcclxuXHRcdFx0XHQuLi5kZXNjcmlwdGlvblRpbWVDb21wb25lbnRzLFxyXG5cdFx0XHRcdC4uLnRpbWVDb21wb25lbnRzLCAvLyBJQ1MgdGltZXMgb3ZlcnJpZGUgZGVzY3JpcHRpb24gdGltZXNcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIENyZWF0ZSBlbmhhbmNlZCBkYXRldGltZSBvYmplY3RzXHJcblx0XHRcdGNvbnN0IGVuaGFuY2VkRGF0ZXMgPSB0aGlzLmNyZWF0ZUVuaGFuY2VkRGF0ZVRpbWVzRnJvbUljcyhldmVudCwgbWVyZ2VkVGltZUNvbXBvbmVudHMpO1xyXG5cclxuXHRcdFx0Y29uc3QgZW5oYW5jZWRNZXRhZGF0YTogUGFydGlhbDxFbmhhbmNlZFN0YW5kYXJkVGFza01ldGFkYXRhPiA9IHt9O1xyXG5cclxuXHRcdFx0aWYgKE9iamVjdC5rZXlzKG1lcmdlZFRpbWVDb21wb25lbnRzKS5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0ZW5oYW5jZWRNZXRhZGF0YS50aW1lQ29tcG9uZW50cyA9IG1lcmdlZFRpbWVDb21wb25lbnRzO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoZW5oYW5jZWREYXRlcyAmJiBPYmplY3Qua2V5cyhlbmhhbmNlZERhdGVzKS5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0ZW5oYW5jZWRNZXRhZGF0YS5lbmhhbmNlZERhdGVzID0gZW5oYW5jZWREYXRlcztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIGVuaGFuY2VkTWV0YWRhdGE7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKGBbSWNzTWFuYWdlcl0gRmFpbGVkIHRvIGV4dHJhY3QgdGltZSBjb21wb25lbnRzIGZyb20gSUNTIGV2ZW50ICR7ZXZlbnQudWlkfTpgLCBlcnJvcik7XHJcblx0XHRcdHJldHVybiB7fTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZSBUaW1lQ29tcG9uZW50IGZyb20gRGF0ZSBvYmplY3RcclxuXHQgKi9cclxuXHRwcml2YXRlIGNyZWF0ZVRpbWVDb21wb25lbnRGcm9tRGF0ZShkYXRlOiBEYXRlKTogVGltZUNvbXBvbmVudCB8IG51bGwge1xyXG5cdFx0aWYgKCFkYXRlIHx8IGlzTmFOKGRhdGUuZ2V0VGltZSgpKSkge1xyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBGb3JtYXQgdGltZSBhcyBISDpNTSBvciBISDpNTTpTUyBkZXBlbmRpbmcgb24gd2hldGhlciBzZWNvbmRzIGFyZSBwcmVzZW50XHJcblx0XHRjb25zdCBob3VycyA9IGRhdGUuZ2V0VVRDSG91cnMoKS50b1N0cmluZygpLnBhZFN0YXJ0KDIsICcwJyk7XHJcblx0XHRjb25zdCBtaW51dGVzID0gZGF0ZS5nZXRVVENNaW51dGVzKCkudG9TdHJpbmcoKS5wYWRTdGFydCgyLCAnMCcpO1xyXG5cdFx0Y29uc3Qgc2Vjb25kcyA9IGRhdGUuZ2V0VVRDU2Vjb25kcygpO1xyXG5cdFx0XHJcblx0XHRsZXQgb3JpZ2luYWxUZXh0ID0gYCR7aG91cnN9OiR7bWludXRlc31gO1xyXG5cdFx0aWYgKHNlY29uZHMgPiAwKSB7XHJcblx0XHRcdG9yaWdpbmFsVGV4dCArPSBgOiR7c2Vjb25kcy50b1N0cmluZygpLnBhZFN0YXJ0KDIsICcwJyl9YDtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRob3VyOiBwYXJzZUludChob3VycywgMTApLFxyXG5cdFx0XHRtaW51dGU6IHBhcnNlSW50KG1pbnV0ZXMsIDEwKSxcclxuXHRcdFx0c2Vjb25kOiBzZWNvbmRzID4gMCA/IHNlY29uZHMgOiB1bmRlZmluZWQsXHJcblx0XHRcdG9yaWdpbmFsVGV4dCxcclxuXHRcdFx0aXNSYW5nZTogZmFsc2UsXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ3JlYXRlIGVuaGFuY2VkIGRhdGV0aW1lIG9iamVjdHMgZnJvbSBJQ1MgZXZlbnQgYW5kIHRpbWUgY29tcG9uZW50c1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgY3JlYXRlRW5oYW5jZWREYXRlVGltZXNGcm9tSWNzKFxyXG5cdFx0ZXZlbnQ6IEljc0V2ZW50LFxyXG5cdFx0dGltZUNvbXBvbmVudHM6IEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGFbXCJ0aW1lQ29tcG9uZW50c1wiXVxyXG5cdCk6IEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGFbXCJlbmhhbmNlZERhdGVzXCJdIHtcclxuXHRcdGNvbnN0IGVuaGFuY2VkRGF0ZXM6IEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGFbXCJlbmhhbmNlZERhdGVzXCJdID0ge307XHJcblxyXG5cdFx0Ly8gVXNlIElDUyBldmVudCBkYXRlcyBkaXJlY3RseSBhcyB0aGV5IGFscmVhZHkgY29udGFpbiB0aGUgY29ycmVjdCBkYXRlIGFuZCB0aW1lXHJcblx0XHRpZiAoZXZlbnQuZHRzdGFydCkge1xyXG5cdFx0XHRlbmhhbmNlZERhdGVzLnN0YXJ0RGF0ZVRpbWUgPSBuZXcgRGF0ZShldmVudC5kdHN0YXJ0KTtcclxuXHRcdFx0ZW5oYW5jZWREYXRlcy5zY2hlZHVsZWREYXRlVGltZSA9IG5ldyBEYXRlKGV2ZW50LmR0c3RhcnQpOyAvLyBJQ1MgZXZlbnRzIGFyZSB0eXBpY2FsbHkgc2NoZWR1bGVkXHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKGV2ZW50LmR0ZW5kKSB7XHJcblx0XHRcdGVuaGFuY2VkRGF0ZXMuZW5kRGF0ZVRpbWUgPSBuZXcgRGF0ZShldmVudC5kdGVuZCk7XHJcblx0XHRcdGVuaGFuY2VkRGF0ZXMuZHVlRGF0ZVRpbWUgPSBuZXcgRGF0ZShldmVudC5kdGVuZCk7IC8vIEVuZCB0aW1lIGNhbiBiZSBjb25zaWRlcmVkIGR1ZSB0aW1lXHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSWYgd2UgaGF2ZSB0aW1lIGNvbXBvbmVudHMgZnJvbSBkZXNjcmlwdGlvbiBwYXJzaW5nIGJ1dCBubyBJQ1MgdGltZXMgKGFsbC1kYXkgZXZlbnRzKSxcclxuXHRcdC8vIHRyeSB0byBjb21iaW5lIHRoZSBkYXRlIGZyb20gSUNTIHdpdGggdGhlIHBhcnNlZCB0aW1lIGNvbXBvbmVudHNcclxuXHRcdGlmIChldmVudC5hbGxEYXkgJiYgdGltZUNvbXBvbmVudHMpIHtcclxuXHRcdFx0Y29uc3QgZXZlbnREYXRlID0gbmV3IERhdGUoZXZlbnQuZHRzdGFydCk7XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAodGltZUNvbXBvbmVudHMuc3RhcnRUaW1lKSB7XHJcblx0XHRcdFx0Y29uc3Qgc3RhcnREYXRlVGltZSA9IG5ldyBEYXRlKGV2ZW50RGF0ZSk7XHJcblx0XHRcdFx0c3RhcnREYXRlVGltZS5zZXRIb3Vycyh0aW1lQ29tcG9uZW50cy5zdGFydFRpbWUuaG91ciwgdGltZUNvbXBvbmVudHMuc3RhcnRUaW1lLm1pbnV0ZSwgdGltZUNvbXBvbmVudHMuc3RhcnRUaW1lLnNlY29uZCB8fCAwKTtcclxuXHRcdFx0XHRlbmhhbmNlZERhdGVzLnN0YXJ0RGF0ZVRpbWUgPSBzdGFydERhdGVUaW1lO1xyXG5cdFx0XHRcdGVuaGFuY2VkRGF0ZXMuc2NoZWR1bGVkRGF0ZVRpbWUgPSBzdGFydERhdGVUaW1lO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAodGltZUNvbXBvbmVudHMuZW5kVGltZSkge1xyXG5cdFx0XHRcdGNvbnN0IGVuZERhdGVUaW1lID0gbmV3IERhdGUoZXZlbnREYXRlKTtcclxuXHRcdFx0XHRlbmREYXRlVGltZS5zZXRIb3Vycyh0aW1lQ29tcG9uZW50cy5lbmRUaW1lLmhvdXIsIHRpbWVDb21wb25lbnRzLmVuZFRpbWUubWludXRlLCB0aW1lQ29tcG9uZW50cy5lbmRUaW1lLnNlY29uZCB8fCAwKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHQvLyBIYW5kbGUgbWlkbmlnaHQgY3Jvc3NpbmcgZm9yIHRpbWUgcmFuZ2VzXHJcblx0XHRcdFx0aWYgKHRpbWVDb21wb25lbnRzLnN0YXJ0VGltZSAmJiB0aW1lQ29tcG9uZW50cy5lbmRUaW1lLmhvdXIgPCB0aW1lQ29tcG9uZW50cy5zdGFydFRpbWUuaG91cikge1xyXG5cdFx0XHRcdFx0ZW5kRGF0ZVRpbWUuc2V0RGF0ZShlbmREYXRlVGltZS5nZXREYXRlKCkgKyAxKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0ZW5oYW5jZWREYXRlcy5lbmREYXRlVGltZSA9IGVuZERhdGVUaW1lO1xyXG5cdFx0XHRcdGVuaGFuY2VkRGF0ZXMuZHVlRGF0ZVRpbWUgPSBlbmREYXRlVGltZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0aWYgKHRpbWVDb21wb25lbnRzLmR1ZVRpbWUgJiYgIWVuaGFuY2VkRGF0ZXMuZHVlRGF0ZVRpbWUpIHtcclxuXHRcdFx0XHRjb25zdCBkdWVEYXRlVGltZSA9IG5ldyBEYXRlKGV2ZW50RGF0ZSk7XHJcblx0XHRcdFx0ZHVlRGF0ZVRpbWUuc2V0SG91cnModGltZUNvbXBvbmVudHMuZHVlVGltZS5ob3VyLCB0aW1lQ29tcG9uZW50cy5kdWVUaW1lLm1pbnV0ZSwgdGltZUNvbXBvbmVudHMuZHVlVGltZS5zZWNvbmQgfHwgMCk7XHJcblx0XHRcdFx0ZW5oYW5jZWREYXRlcy5kdWVEYXRlVGltZSA9IGR1ZURhdGVUaW1lO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAodGltZUNvbXBvbmVudHMuc2NoZWR1bGVkVGltZSAmJiAhZW5oYW5jZWREYXRlcy5zY2hlZHVsZWREYXRlVGltZSkge1xyXG5cdFx0XHRcdGNvbnN0IHNjaGVkdWxlZERhdGVUaW1lID0gbmV3IERhdGUoZXZlbnREYXRlKTtcclxuXHRcdFx0XHRzY2hlZHVsZWREYXRlVGltZS5zZXRIb3Vycyh0aW1lQ29tcG9uZW50cy5zY2hlZHVsZWRUaW1lLmhvdXIsIHRpbWVDb21wb25lbnRzLnNjaGVkdWxlZFRpbWUubWludXRlLCB0aW1lQ29tcG9uZW50cy5zY2hlZHVsZWRUaW1lLnNlY29uZCB8fCAwKTtcclxuXHRcdFx0XHRlbmhhbmNlZERhdGVzLnNjaGVkdWxlZERhdGVUaW1lID0gc2NoZWR1bGVkRGF0ZVRpbWU7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gT2JqZWN0LmtleXMoZW5oYW5jZWREYXRlcykubGVuZ3RoID4gMCA/IGVuaGFuY2VkRGF0ZXMgOiB1bmRlZmluZWQ7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBNYXAgSUNTIHN0YXR1cyB0byB0YXNrIHN0YXR1c1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgbWFwSWNzU3RhdHVzVG9UYXNrU3RhdHVzKGljc1N0YXR1cz86IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHRzd2l0Y2ggKGljc1N0YXR1cz8udG9VcHBlckNhc2UoKSkge1xyXG5cdFx0XHRjYXNlIFwiQ09NUExFVEVEXCI6XHJcblx0XHRcdFx0cmV0dXJuIFwieFwiO1xyXG5cdFx0XHRjYXNlIFwiQ0FOQ0VMTEVEXCI6XHJcblx0XHRcdFx0cmV0dXJuIFwiLVwiO1xyXG5cdFx0XHRjYXNlIFwiVEVOVEFUSVZFXCI6XHJcblx0XHRcdFx0cmV0dXJuIFwiP1wiO1xyXG5cdFx0XHRjYXNlIFwiQ09ORklSTUVEXCI6XHJcblx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0cmV0dXJuIFwiIFwiO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTWFwIElDUyBwcmlvcml0eSB0byB0YXNrIHByaW9yaXR5XHJcblx0ICovXHJcblx0cHJpdmF0ZSBtYXBJY3NQcmlvcml0eVRvVGFza1ByaW9yaXR5KFxyXG5cdFx0aWNzUHJpb3JpdHk/OiBudW1iZXIsXHJcblx0KTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcclxuXHRcdGlmIChpY3NQcmlvcml0eSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdW5kZWZpbmVkO1xyXG5cclxuXHRcdC8vIElDUyBwcmlvcml0eTogMCAodW5kZWZpbmVkKSwgMS00IChoaWdoKSwgNSAobm9ybWFsKSwgNi05IChsb3cpXHJcblx0XHQvLyBUYXNrIHByaW9yaXR5OiAxIChoaWdoZXN0KSwgMiAoaGlnaCksIDMgKG1lZGl1bSksIDQgKGxvdyksIDUgKGxvd2VzdClcclxuXHRcdGlmIChpY3NQcmlvcml0eSA+PSAxICYmIGljc1ByaW9yaXR5IDw9IDQpIHJldHVybiAxOyAvLyBIaWdoXHJcblx0XHRpZiAoaWNzUHJpb3JpdHkgPT09IDUpIHJldHVybiAzOyAvLyBNZWRpdW1cclxuXHRcdGlmIChpY3NQcmlvcml0eSA+PSA2ICYmIGljc1ByaW9yaXR5IDw9IDkpIHJldHVybiA1OyAvLyBMb3dcclxuXHRcdHJldHVybiB1bmRlZmluZWQ7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBNYW51YWxseSBzeW5jIGEgc3BlY2lmaWMgc291cmNlXHJcblx0ICovXHJcblx0YXN5bmMgc3luY1NvdXJjZShzb3VyY2VJZDogc3RyaW5nKTogUHJvbWlzZTxJY3NGZXRjaFJlc3VsdD4ge1xyXG5cdFx0Y29uc3Qgc291cmNlID0gdGhpcy5jb25maWcuc291cmNlcy5maW5kKChzKSA9PiBzLmlkID09PSBzb3VyY2VJZCk7XHJcblx0XHRpZiAoIXNvdXJjZSkge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYFNvdXJjZSBub3QgZm91bmQ6ICR7c291cmNlSWR9YCk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy51cGRhdGVTeW5jU3RhdHVzKHNvdXJjZUlkLCB7IHN0YXR1czogXCJzeW5jaW5nXCIgfSk7XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5mZXRjaEljc0RhdGEoc291cmNlKTtcclxuXHJcblx0XHRcdGNvbnNvbGUubG9nKFwic3luY1NvdXJjZTogcmVzdWx0XCIsIHJlc3VsdCk7XHJcblxyXG5cdFx0XHRpZiAocmVzdWx0LnN1Y2Nlc3MgJiYgcmVzdWx0LmRhdGEpIHtcclxuXHRcdFx0XHQvLyBVcGRhdGUgY2FjaGVcclxuXHRcdFx0XHRjb25zdCBjYWNoZUVudHJ5OiBJY3NDYWNoZUVudHJ5ID0ge1xyXG5cdFx0XHRcdFx0c291cmNlSWQsXHJcblx0XHRcdFx0XHRldmVudHM6IHJlc3VsdC5kYXRhLmV2ZW50cyxcclxuXHRcdFx0XHRcdHRpbWVzdGFtcDogcmVzdWx0LnRpbWVzdGFtcCxcclxuXHRcdFx0XHRcdGV4cGlyZXNBdDpcclxuXHRcdFx0XHRcdFx0cmVzdWx0LnRpbWVzdGFtcCArXHJcblx0XHRcdFx0XHRcdHRoaXMuY29uZmlnLm1heENhY2hlQWdlICogNjAgKiA2MCAqIDEwMDAsXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHR0aGlzLmNhY2hlLnNldChzb3VyY2VJZCwgY2FjaGVFbnRyeSk7XHJcblxyXG5cdFx0XHRcdC8vIFVwZGF0ZSBzeW5jIHN0YXR1c1xyXG5cdFx0XHRcdHRoaXMudXBkYXRlU3luY1N0YXR1cyhzb3VyY2VJZCwge1xyXG5cdFx0XHRcdFx0c3RhdHVzOiBcImlkbGVcIixcclxuXHRcdFx0XHRcdGxhc3RTeW5jOiByZXN1bHQudGltZXN0YW1wLFxyXG5cdFx0XHRcdFx0ZXZlbnRDb3VudDogcmVzdWx0LmRhdGEuZXZlbnRzLmxlbmd0aCxcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gTm90aWZ5IGxpc3RlbmVyc1xyXG5cdFx0XHRcdHRoaXMub25FdmVudHNVcGRhdGVkPy4oc291cmNlSWQsIHJlc3VsdC5kYXRhLmV2ZW50cyk7XHJcblxyXG5cdFx0XHRcdC8vIEJyb2FkY2FzdCB3b3Jrc3BhY2UgZXZlbnQgc28gSWNzU291cmNlIGNhbiByZWxvYWRcclxuXHRcdFx0XHQvLyB0cnkge1xyXG5cdFx0XHRcdC8vIFx0dGhpcy5wbHVnaW4uYXBwPy53b3Jrc3BhY2U/LnRyaWdnZXI/LihcclxuXHRcdFx0XHQvLyBcdFx0XCJ0YXNrLWdlbml1czppY3MtY2FjaGUtdXBkYXRlZFwiLFxyXG5cdFx0XHRcdC8vIFx0KTtcclxuXHRcdFx0XHQvLyB9IGNhdGNoIChlKSB7XHJcblx0XHRcdFx0Ly8gXHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0Ly8gXHRcdFwiW0ljc01hbmFnZXJdIEZhaWxlZCB0byB0cmlnZ2VyIGljcy1jYWNoZS11cGRhdGVkXCIsXHJcblx0XHRcdFx0Ly8gXHRcdGUsXHJcblx0XHRcdFx0Ly8gXHQpO1xyXG5cdFx0XHRcdC8vIH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBIYW5kbGUgZGlmZmVyZW50IHR5cGVzIG9mIGVycm9ycyB3aXRoIGFwcHJvcHJpYXRlIGxvZ2dpbmdcclxuXHRcdFx0XHRjb25zdCBlcnJvclR5cGUgPSB0aGlzLmNhdGVnb3JpemVFcnJvcihyZXN1bHQuZXJyb3IpO1xyXG5cdFx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcdGBJQ1Mgc3luYyBmYWlsZWQgZm9yIHNvdXJjZSAke3NvdXJjZUlkfSAoJHtlcnJvclR5cGV9KTpgLFxyXG5cdFx0XHRcdFx0cmVzdWx0LmVycm9yLFxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdHRoaXMudXBkYXRlU3luY1N0YXR1cyhzb3VyY2VJZCwge1xyXG5cdFx0XHRcdFx0c3RhdHVzOiBcImVycm9yXCIsXHJcblx0XHRcdFx0XHRlcnJvcjogYCR7ZXJyb3JUeXBlfTogJHtyZXN1bHQuZXJyb3IgfHwgXCJVbmtub3duIGVycm9yXCJ9YCxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHJlc3VsdDtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnN0IGVycm9yTWVzc2FnZSA9XHJcblx0XHRcdFx0ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBcIlVua25vd24gZXJyb3JcIjtcclxuXHRcdFx0Y29uc3QgZXJyb3JUeXBlID0gdGhpcy5jYXRlZ29yaXplRXJyb3IoZXJyb3JNZXNzYWdlKTtcclxuXHJcblx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRgSUNTIHN5bmMgZXhjZXB0aW9uIGZvciBzb3VyY2UgJHtzb3VyY2VJZH0gKCR7ZXJyb3JUeXBlfSk6YCxcclxuXHRcdFx0XHRlcnJvcixcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdHRoaXMudXBkYXRlU3luY1N0YXR1cyhzb3VyY2VJZCwge1xyXG5cdFx0XHRcdHN0YXR1czogXCJlcnJvclwiLFxyXG5cdFx0XHRcdGVycm9yOiBgJHtlcnJvclR5cGV9OiAke2Vycm9yTWVzc2FnZX1gLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0c3VjY2VzczogZmFsc2UsXHJcblx0XHRcdFx0ZXJyb3I6IGVycm9yTWVzc2FnZSxcclxuXHRcdFx0XHR0aW1lc3RhbXA6IERhdGUubm93KCksXHJcblx0XHRcdH07XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTeW5jIGFsbCBlbmFibGVkIHNvdXJjZXNcclxuXHQgKi9cclxuXHRhc3luYyBzeW5jQWxsU291cmNlcygpOiBQcm9taXNlPE1hcDxzdHJpbmcsIEljc0ZldGNoUmVzdWx0Pj4ge1xyXG5cdFx0Y29uc3QgcmVzdWx0cyA9IG5ldyBNYXA8c3RyaW5nLCBJY3NGZXRjaFJlc3VsdD4oKTtcclxuXHJcblx0XHRjb25zdCBzeW5jUHJvbWlzZXMgPSB0aGlzLmNvbmZpZy5zb3VyY2VzXHJcblx0XHRcdC5maWx0ZXIoKHNvdXJjZSkgPT4gc291cmNlLmVuYWJsZWQpXHJcblx0XHRcdC5tYXAoYXN5bmMgKHNvdXJjZSkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuc3luY1NvdXJjZShzb3VyY2UuaWQpO1xyXG5cdFx0XHRcdHJlc3VsdHMuc2V0KHNvdXJjZS5pZCwgcmVzdWx0KTtcclxuXHRcdFx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRhd2FpdCBQcm9taXNlLmFsbFNldHRsZWQoc3luY1Byb21pc2VzKTtcclxuXHRcdHJldHVybiByZXN1bHRzO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHN5bmMgc3RhdHVzIGZvciBhIHNvdXJjZVxyXG5cdCAqL1xyXG5cdGdldFN5bmNTdGF0dXMoc291cmNlSWQ6IHN0cmluZyk6IEljc1N5bmNTdGF0dXMgfCB1bmRlZmluZWQge1xyXG5cdFx0cmV0dXJuIHRoaXMuc3luY1N0YXR1c2VzLmdldChzb3VyY2VJZCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgc3luYyBzdGF0dXNlcyBmb3IgYWxsIHNvdXJjZXNcclxuXHQgKi9cclxuXHRnZXRBbGxTeW5jU3RhdHVzZXMoKTogTWFwPHN0cmluZywgSWNzU3luY1N0YXR1cz4ge1xyXG5cdFx0cmV0dXJuIG5ldyBNYXAodGhpcy5zeW5jU3RhdHVzZXMpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2xlYXIgY2FjaGUgZm9yIGEgc3BlY2lmaWMgc291cmNlXHJcblx0ICovXHJcblx0Y2xlYXJTb3VyY2VDYWNoZShzb3VyY2VJZDogc3RyaW5nKTogdm9pZCB7XHJcblx0XHR0aGlzLmNhY2hlLmRlbGV0ZShzb3VyY2VJZCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDbGVhciBhbGwgY2FjaGVcclxuXHQgKi9cclxuXHRjbGVhckFsbENhY2hlKCk6IHZvaWQge1xyXG5cdFx0dGhpcy5jYWNoZS5jbGVhcigpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRmV0Y2ggSUNTIGRhdGEgZnJvbSBhIHNvdXJjZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgZmV0Y2hJY3NEYXRhKHNvdXJjZTogSWNzU291cmNlKTogUHJvbWlzZTxJY3NGZXRjaFJlc3VsdD4ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Ly8gQ29udmVydCB3ZWJjYWwgVVJMIGlmIG5lZWRlZFxyXG5cdFx0XHRjb25zdCBjb252ZXJzaW9uUmVzdWx0ID0gV2ViY2FsVXJsQ29udmVydGVyLmNvbnZlcnRXZWJjYWxVcmwoXHJcblx0XHRcdFx0c291cmNlLnVybCxcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGlmICghY29udmVyc2lvblJlc3VsdC5zdWNjZXNzKSB7XHJcblx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxyXG5cdFx0XHRcdFx0ZXJyb3I6IGBVUkwgdmFsaWRhdGlvbiBmYWlsZWQ6ICR7Y29udmVyc2lvblJlc3VsdC5lcnJvcn1gLFxyXG5cdFx0XHRcdFx0dGltZXN0YW1wOiBEYXRlLm5vdygpLFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IGZldGNoVXJsID0gY29udmVyc2lvblJlc3VsdC5jb252ZXJ0ZWRVcmwhO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVxdWVzdFBhcmFtczogUmVxdWVzdFVybFBhcmFtID0ge1xyXG5cdFx0XHRcdHVybDogZmV0Y2hVcmwsXHJcblx0XHRcdFx0bWV0aG9kOiBcIkdFVFwiLFxyXG5cdFx0XHRcdGhlYWRlcnM6IHtcclxuXHRcdFx0XHRcdFwiVXNlci1BZ2VudFwiOiBcIk9ic2lkaWFuIFRhc2sgUHJvZ3Jlc3MgQmFyIFBsdWdpblwiLFxyXG5cdFx0XHRcdFx0Li4uc291cmNlLmF1dGg/LmhlYWRlcnMsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIEFkZCBhdXRoZW50aWNhdGlvbiBpZiBjb25maWd1cmVkXHJcblx0XHRcdGlmIChzb3VyY2UuYXV0aCkge1xyXG5cdFx0XHRcdHN3aXRjaCAoc291cmNlLmF1dGgudHlwZSkge1xyXG5cdFx0XHRcdFx0Y2FzZSBcImJhc2ljXCI6XHJcblx0XHRcdFx0XHRcdGlmIChzb3VyY2UuYXV0aC51c2VybmFtZSAmJiBzb3VyY2UuYXV0aC5wYXNzd29yZCkge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGNyZWRlbnRpYWxzID0gYnRvYShcclxuXHRcdFx0XHRcdFx0XHRcdGAke3NvdXJjZS5hdXRoLnVzZXJuYW1lfToke3NvdXJjZS5hdXRoLnBhc3N3b3JkfWAsXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRyZXF1ZXN0UGFyYW1zLmhlYWRlcnMhW1wiQXV0aG9yaXphdGlvblwiXSA9XHJcblx0XHRcdFx0XHRcdFx0XHRgQmFzaWMgJHtjcmVkZW50aWFsc31gO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcImJlYXJlclwiOlxyXG5cdFx0XHRcdFx0XHRpZiAoc291cmNlLmF1dGgudG9rZW4pIHtcclxuXHRcdFx0XHRcdFx0XHRyZXF1ZXN0UGFyYW1zLmhlYWRlcnMhW1wiQXV0aG9yaXphdGlvblwiXSA9XHJcblx0XHRcdFx0XHRcdFx0XHRgQmVhcmVyICR7c291cmNlLmF1dGgudG9rZW59YDtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENoZWNrIGNhY2hlIGhlYWRlcnNcclxuXHRcdFx0Y29uc3QgY2FjaGVFbnRyeSA9IHRoaXMuY2FjaGUuZ2V0KHNvdXJjZS5pZCk7XHJcblx0XHRcdGlmIChjYWNoZUVudHJ5Py5ldGFnKSB7XHJcblx0XHRcdFx0cmVxdWVzdFBhcmFtcy5oZWFkZXJzIVtcIklmLU5vbmUtTWF0Y2hcIl0gPSBjYWNoZUVudHJ5LmV0YWc7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKGNhY2hlRW50cnk/Lmxhc3RNb2RpZmllZCkge1xyXG5cdFx0XHRcdHJlcXVlc3RQYXJhbXMuaGVhZGVycyFbXCJJZi1Nb2RpZmllZC1TaW5jZVwiXSA9XHJcblx0XHRcdFx0XHRjYWNoZUVudHJ5Lmxhc3RNb2RpZmllZDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIHRpbWVvdXQgcHJvbWlzZVxyXG5cdFx0XHRjb25zdCB0aW1lb3V0TXMgPSB0aGlzLmNvbmZpZy5uZXR3b3JrVGltZW91dCAqIDEwMDA7XHJcblx0XHRcdGNvbnN0IHRpbWVvdXRQcm9taXNlID0gbmV3IFByb21pc2U8bmV2ZXI+KChfLCByZWplY3QpID0+IHtcclxuXHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRcdHJlamVjdChcclxuXHRcdFx0XHRcdFx0bmV3IEVycm9yKFxyXG5cdFx0XHRcdFx0XHRcdGBSZXF1ZXN0IHRpbWVvdXQgYWZ0ZXIgJHt0aGlzLmNvbmZpZy5uZXR3b3JrVGltZW91dH0gc2Vjb25kc2AsXHJcblx0XHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH0sIHRpbWVvdXRNcyk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gUmFjZSBiZXR3ZWVuIHJlcXVlc3QgYW5kIHRpbWVvdXRcclxuXHRcdFx0Y29uc3QgcmVzcG9uc2UgPSBhd2FpdCBQcm9taXNlLnJhY2UoW1xyXG5cdFx0XHRcdHJlcXVlc3RVcmwocmVxdWVzdFBhcmFtcyksXHJcblx0XHRcdFx0dGltZW91dFByb21pc2UsXHJcblx0XHRcdF0pO1xyXG5cclxuXHRcdFx0Ly8gSGFuZGxlIDMwNCBOb3QgTW9kaWZpZWRcclxuXHRcdFx0aWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gMzA0ICYmIGNhY2hlRW50cnkpIHtcclxuXHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0c3VjY2VzczogdHJ1ZSxcclxuXHRcdFx0XHRcdGRhdGE6IHtcclxuXHRcdFx0XHRcdFx0ZXZlbnRzOiBjYWNoZUVudHJ5LmV2ZW50cyxcclxuXHRcdFx0XHRcdFx0ZXJyb3JzOiBbXSxcclxuXHRcdFx0XHRcdFx0bWV0YWRhdGE6IHt9LFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAocmVzcG9uc2Uuc3RhdHVzICE9PSAyMDApIHtcclxuXHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0c3VjY2VzczogZmFsc2UsXHJcblx0XHRcdFx0XHRlcnJvcjogYEhUVFAgJHtyZXNwb25zZS5zdGF0dXN9OiAke1xyXG5cdFx0XHRcdFx0XHRyZXNwb25zZS50ZXh0IHx8IFwiVW5rbm93biBlcnJvclwiXHJcblx0XHRcdFx0XHR9YCxcclxuXHRcdFx0XHRcdHN0YXR1c0NvZGU6IHJlc3BvbnNlLnN0YXR1cyxcclxuXHRcdFx0XHRcdHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBQYXJzZSBJQ1MgY29udGVudFxyXG5cdFx0XHRjb25zdCBwYXJzZVJlc3VsdCA9IEljc1BhcnNlci5wYXJzZShyZXNwb25zZS50ZXh0LCBzb3VyY2UpO1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIGNhY2hlIHdpdGggSFRUUCBoZWFkZXJzXHJcblx0XHRcdGlmIChjYWNoZUVudHJ5KSB7XHJcblx0XHRcdFx0Y2FjaGVFbnRyeS5ldGFnID0gcmVzcG9uc2UuaGVhZGVyc1tcImV0YWdcIl07XHJcblx0XHRcdFx0Y2FjaGVFbnRyeS5sYXN0TW9kaWZpZWQgPSByZXNwb25zZS5oZWFkZXJzW1wibGFzdC1tb2RpZmllZFwiXTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRzdWNjZXNzOiB0cnVlLFxyXG5cdFx0XHRcdGRhdGE6IHBhcnNlUmVzdWx0LFxyXG5cdFx0XHRcdHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcclxuXHRcdFx0fTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0c3VjY2VzczogZmFsc2UsXHJcblx0XHRcdFx0ZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogXCJVbmtub3duIGVycm9yXCIsXHJcblx0XHRcdFx0dGltZXN0YW1wOiBEYXRlLm5vdygpLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQXBwbHkgZmlsdGVycyB0byBldmVudHNcclxuXHQgKi9cclxuXHRwcml2YXRlIGFwcGx5RmlsdGVycyhldmVudHM6IEljc0V2ZW50W10sIHNvdXJjZTogSWNzU291cmNlKTogSWNzRXZlbnRbXSB7XHJcblx0XHRsZXQgZmlsdGVyZWRFdmVudHMgPSBbLi4uZXZlbnRzXTtcclxuXHRcdGNvbnNvbGUubG9nKFwiYXBwbHlGaWx0ZXJzOiBpbml0aWFsIGV2ZW50cyBjb3VudFwiLCBldmVudHMubGVuZ3RoKTtcclxuXHRcdGNvbnNvbGUubG9nKFwiYXBwbHlGaWx0ZXJzOiBzb3VyY2UgY29uZmlnXCIsIHtcclxuXHRcdFx0c2hvd0FsbERheUV2ZW50czogc291cmNlLnNob3dBbGxEYXlFdmVudHMsXHJcblx0XHRcdHNob3dUaW1lZEV2ZW50czogc291cmNlLnNob3dUaW1lZEV2ZW50cyxcclxuXHRcdFx0ZmlsdGVyczogc291cmNlLmZpbHRlcnMsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBBcHBseSBldmVudCB0eXBlIGZpbHRlcnNcclxuXHRcdGlmICghc291cmNlLnNob3dBbGxEYXlFdmVudHMpIHtcclxuXHRcdFx0Y29uc3QgYmVmb3JlRmlsdGVyID0gZmlsdGVyZWRFdmVudHMubGVuZ3RoO1xyXG5cdFx0XHRmaWx0ZXJlZEV2ZW50cyA9IGZpbHRlcmVkRXZlbnRzLmZpbHRlcigoZXZlbnQpID0+ICFldmVudC5hbGxEYXkpO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRgRmlsdGVyZWQgb3V0IGFsbC1kYXkgZXZlbnRzOiAke2JlZm9yZUZpbHRlcn0gLT4gJHtmaWx0ZXJlZEV2ZW50cy5sZW5ndGh9YCxcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHRcdGlmICghc291cmNlLnNob3dUaW1lZEV2ZW50cykge1xyXG5cdFx0XHRjb25zdCBiZWZvcmVGaWx0ZXIgPSBmaWx0ZXJlZEV2ZW50cy5sZW5ndGg7XHJcblx0XHRcdGZpbHRlcmVkRXZlbnRzID0gZmlsdGVyZWRFdmVudHMuZmlsdGVyKChldmVudCkgPT4gZXZlbnQuYWxsRGF5KTtcclxuXHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0YEZpbHRlcmVkIG91dCB0aW1lZCBldmVudHM6ICR7YmVmb3JlRmlsdGVyfSAtPiAke2ZpbHRlcmVkRXZlbnRzLmxlbmd0aH1gLFxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFwcGx5IGN1c3RvbSBmaWx0ZXJzXHJcblx0XHRpZiAoc291cmNlLmZpbHRlcnMpIHtcclxuXHRcdFx0ZmlsdGVyZWRFdmVudHMgPSBmaWx0ZXJlZEV2ZW50cy5maWx0ZXIoKGV2ZW50KSA9PiB7XHJcblx0XHRcdFx0Ly8gSW5jbHVkZSBmaWx0ZXJzXHJcblx0XHRcdFx0aWYgKHNvdXJjZS5maWx0ZXJzIS5pbmNsdWRlKSB7XHJcblx0XHRcdFx0XHRjb25zdCBpbmNsdWRlID0gc291cmNlLmZpbHRlcnMhLmluY2x1ZGU7XHJcblx0XHRcdFx0XHRsZXQgc2hvdWxkSW5jbHVkZSA9IHRydWU7XHJcblxyXG5cdFx0XHRcdFx0aWYgKGluY2x1ZGUuc3VtbWFyeT8ubGVuZ3RoKSB7XHJcblx0XHRcdFx0XHRcdHNob3VsZEluY2x1ZGUgPVxyXG5cdFx0XHRcdFx0XHRcdHNob3VsZEluY2x1ZGUgJiZcclxuXHRcdFx0XHRcdFx0XHRpbmNsdWRlLnN1bW1hcnkuc29tZSgocGF0dGVybikgPT5cclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMubWF0Y2hlc1BhdHRlcm4oZXZlbnQuc3VtbWFyeSwgcGF0dGVybiksXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGlmIChpbmNsdWRlLmRlc2NyaXB0aW9uPy5sZW5ndGggJiYgZXZlbnQuZGVzY3JpcHRpb24pIHtcclxuXHRcdFx0XHRcdFx0c2hvdWxkSW5jbHVkZSA9XHJcblx0XHRcdFx0XHRcdFx0c2hvdWxkSW5jbHVkZSAmJlxyXG5cdFx0XHRcdFx0XHRcdGluY2x1ZGUuZGVzY3JpcHRpb24uc29tZSgocGF0dGVybikgPT5cclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMubWF0Y2hlc1BhdHRlcm4oXHJcblx0XHRcdFx0XHRcdFx0XHRcdGV2ZW50LmRlc2NyaXB0aW9uISxcclxuXHRcdFx0XHRcdFx0XHRcdFx0cGF0dGVybixcclxuXHRcdFx0XHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGlmIChpbmNsdWRlLmxvY2F0aW9uPy5sZW5ndGggJiYgZXZlbnQubG9jYXRpb24pIHtcclxuXHRcdFx0XHRcdFx0c2hvdWxkSW5jbHVkZSA9XHJcblx0XHRcdFx0XHRcdFx0c2hvdWxkSW5jbHVkZSAmJlxyXG5cdFx0XHRcdFx0XHRcdGluY2x1ZGUubG9jYXRpb24uc29tZSgocGF0dGVybikgPT5cclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMubWF0Y2hlc1BhdHRlcm4oZXZlbnQubG9jYXRpb24hLCBwYXR0ZXJuKSxcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0aWYgKGluY2x1ZGUuY2F0ZWdvcmllcz8ubGVuZ3RoICYmIGV2ZW50LmNhdGVnb3JpZXMpIHtcclxuXHRcdFx0XHRcdFx0c2hvdWxkSW5jbHVkZSA9XHJcblx0XHRcdFx0XHRcdFx0c2hvdWxkSW5jbHVkZSAmJlxyXG5cdFx0XHRcdFx0XHRcdGluY2x1ZGUuY2F0ZWdvcmllcy5zb21lKChjYXRlZ29yeSkgPT5cclxuXHRcdFx0XHRcdFx0XHRcdGV2ZW50LmNhdGVnb3JpZXMhLmluY2x1ZGVzKGNhdGVnb3J5KSxcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdGlmICghc2hvdWxkSW5jbHVkZSkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gRXhjbHVkZSBmaWx0ZXJzXHJcblx0XHRcdFx0aWYgKHNvdXJjZS5maWx0ZXJzIS5leGNsdWRlKSB7XHJcblx0XHRcdFx0XHRjb25zdCBleGNsdWRlID0gc291cmNlLmZpbHRlcnMhLmV4Y2x1ZGU7XHJcblxyXG5cdFx0XHRcdFx0aWYgKGV4Y2x1ZGUuc3VtbWFyeT8ubGVuZ3RoKSB7XHJcblx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHRleGNsdWRlLnN1bW1hcnkuc29tZSgocGF0dGVybikgPT5cclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMubWF0Y2hlc1BhdHRlcm4oZXZlbnQuc3VtbWFyeSwgcGF0dGVybiksXHJcblx0XHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGlmIChleGNsdWRlLmRlc2NyaXB0aW9uPy5sZW5ndGggJiYgZXZlbnQuZGVzY3JpcHRpb24pIHtcclxuXHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdGV4Y2x1ZGUuZGVzY3JpcHRpb24uc29tZSgocGF0dGVybikgPT5cclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMubWF0Y2hlc1BhdHRlcm4oXHJcblx0XHRcdFx0XHRcdFx0XHRcdGV2ZW50LmRlc2NyaXB0aW9uISxcclxuXHRcdFx0XHRcdFx0XHRcdFx0cGF0dGVybixcclxuXHRcdFx0XHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGlmIChleGNsdWRlLmxvY2F0aW9uPy5sZW5ndGggJiYgZXZlbnQubG9jYXRpb24pIHtcclxuXHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdGV4Y2x1ZGUubG9jYXRpb24uc29tZSgocGF0dGVybikgPT5cclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMubWF0Y2hlc1BhdHRlcm4oZXZlbnQubG9jYXRpb24hLCBwYXR0ZXJuKSxcclxuXHRcdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0aWYgKGV4Y2x1ZGUuY2F0ZWdvcmllcz8ubGVuZ3RoICYmIGV2ZW50LmNhdGVnb3JpZXMpIHtcclxuXHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdGV4Y2x1ZGUuY2F0ZWdvcmllcy5zb21lKChjYXRlZ29yeSkgPT5cclxuXHRcdFx0XHRcdFx0XHRcdGV2ZW50LmNhdGVnb3JpZXMhLmluY2x1ZGVzKGNhdGVnb3J5KSxcclxuXHRcdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIExpbWl0IG51bWJlciBvZiBldmVudHNcclxuXHRcdGlmIChmaWx0ZXJlZEV2ZW50cy5sZW5ndGggPiB0aGlzLmNvbmZpZy5tYXhFdmVudHNQZXJTb3VyY2UpIHtcclxuXHRcdFx0Y29uc3QgYmVmb3JlTGltaXQgPSBmaWx0ZXJlZEV2ZW50cy5sZW5ndGg7XHJcblx0XHRcdGZpbHRlcmVkRXZlbnRzID0gZmlsdGVyZWRFdmVudHNcclxuXHRcdFx0XHQuc29ydCgoYSwgYikgPT4gYi5kdHN0YXJ0LmdldFRpbWUoKSAtIGEuZHRzdGFydC5nZXRUaW1lKCkpIC8vIOWAkuW6j++8muacgOaWsOeahOS6i+S7tuWcqOWJjVxyXG5cdFx0XHRcdC5zbGljZSgwLCB0aGlzLmNvbmZpZy5tYXhFdmVudHNQZXJTb3VyY2UpO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRgTGltaXRlZCBldmVudHM6ICR7YmVmb3JlTGltaXR9IC0+ICR7ZmlsdGVyZWRFdmVudHMubGVuZ3RofSAobWF4OiAke3RoaXMuY29uZmlnLm1heEV2ZW50c1BlclNvdXJjZX0pIC0ga2VlcGluZyBuZXdlc3QgZXZlbnRzYCxcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zb2xlLmxvZyhcImFwcGx5RmlsdGVyczogZmluYWwgZXZlbnRzIGNvdW50XCIsIGZpbHRlcmVkRXZlbnRzLmxlbmd0aCk7XHJcblx0XHRyZXR1cm4gZmlsdGVyZWRFdmVudHM7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDaGVjayBpZiB0ZXh0IG1hdGNoZXMgYSBwYXR0ZXJuIChzdXBwb3J0cyByZWdleClcclxuXHQgKi9cclxuXHRwcml2YXRlIG1hdGNoZXNQYXR0ZXJuKHRleHQ6IHN0cmluZywgcGF0dGVybjogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBUcnkgdG8gdXNlIGFzIHJlZ2V4IGZpcnN0XHJcblx0XHRcdGNvbnN0IHJlZ2V4ID0gbmV3IFJlZ0V4cChwYXR0ZXJuLCBcImlcIik7XHJcblx0XHRcdHJldHVybiByZWdleC50ZXN0KHRleHQpO1xyXG5cdFx0fSBjYXRjaCB7XHJcblx0XHRcdC8vIEZhbGwgYmFjayB0byBzaW1wbGUgc3RyaW5nIG1hdGNoaW5nXHJcblx0XHRcdHJldHVybiB0ZXh0LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMocGF0dGVybi50b0xvd2VyQ2FzZSgpKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEFwcGx5IHRleHQgcmVwbGFjZW1lbnQgcnVsZXMgdG8gYW4gSUNTIGV2ZW50XHJcblx0ICovXHJcblx0cHJpdmF0ZSBhcHBseVRleHRSZXBsYWNlbWVudHMoZXZlbnQ6IEljc0V2ZW50KToge1xyXG5cdFx0c3VtbWFyeTogc3RyaW5nO1xyXG5cdFx0ZGVzY3JpcHRpb24/OiBzdHJpbmc7XHJcblx0XHRsb2NhdGlvbj86IHN0cmluZztcclxuXHR9IHtcclxuXHRcdGNvbnN0IHNvdXJjZSA9IGV2ZW50LnNvdXJjZTtcclxuXHRcdGNvbnN0IHJlcGxhY2VtZW50cyA9IHNvdXJjZS50ZXh0UmVwbGFjZW1lbnRzO1xyXG5cclxuXHRcdC8vIElmIG5vIHJlcGxhY2VtZW50cyBjb25maWd1cmVkLCByZXR1cm4gb3JpZ2luYWwgdmFsdWVzXHJcblx0XHRpZiAoIXJlcGxhY2VtZW50cyB8fCByZXBsYWNlbWVudHMubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0c3VtbWFyeTogZXZlbnQuc3VtbWFyeSxcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogZXZlbnQuZGVzY3JpcHRpb24sXHJcblx0XHRcdFx0bG9jYXRpb246IGV2ZW50LmxvY2F0aW9uLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cclxuXHRcdGxldCBwcm9jZXNzZWRTdW1tYXJ5ID0gZXZlbnQuc3VtbWFyeTtcclxuXHRcdGxldCBwcm9jZXNzZWREZXNjcmlwdGlvbiA9IGV2ZW50LmRlc2NyaXB0aW9uO1xyXG5cdFx0bGV0IHByb2Nlc3NlZExvY2F0aW9uID0gZXZlbnQubG9jYXRpb247XHJcblxyXG5cdFx0Ly8gQXBwbHkgZWFjaCBlbmFibGVkIHJlcGxhY2VtZW50IHJ1bGVcclxuXHRcdGZvciAoY29uc3QgcnVsZSBvZiByZXBsYWNlbWVudHMpIHtcclxuXHRcdFx0aWYgKCFydWxlLmVuYWJsZWQpIHtcclxuXHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRjb25zdCByZWdleCA9IG5ldyBSZWdFeHAocnVsZS5wYXR0ZXJuLCBydWxlLmZsYWdzIHx8IFwiZ1wiKTtcclxuXHJcblx0XHRcdFx0Ly8gQXBwbHkgdG8gc3BlY2lmaWMgdGFyZ2V0IG9yIGFsbCBmaWVsZHNcclxuXHRcdFx0XHRzd2l0Y2ggKHJ1bGUudGFyZ2V0KSB7XHJcblx0XHRcdFx0XHRjYXNlIFwic3VtbWFyeVwiOlxyXG5cdFx0XHRcdFx0XHRwcm9jZXNzZWRTdW1tYXJ5ID0gcHJvY2Vzc2VkU3VtbWFyeS5yZXBsYWNlKFxyXG5cdFx0XHRcdFx0XHRcdHJlZ2V4LFxyXG5cdFx0XHRcdFx0XHRcdHJ1bGUucmVwbGFjZW1lbnQsXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcImRlc2NyaXB0aW9uXCI6XHJcblx0XHRcdFx0XHRcdGlmIChwcm9jZXNzZWREZXNjcmlwdGlvbikge1xyXG5cdFx0XHRcdFx0XHRcdHByb2Nlc3NlZERlc2NyaXB0aW9uID0gcHJvY2Vzc2VkRGVzY3JpcHRpb24ucmVwbGFjZShcclxuXHRcdFx0XHRcdFx0XHRcdHJlZ2V4LFxyXG5cdFx0XHRcdFx0XHRcdFx0cnVsZS5yZXBsYWNlbWVudCxcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcImxvY2F0aW9uXCI6XHJcblx0XHRcdFx0XHRcdGlmIChwcm9jZXNzZWRMb2NhdGlvbikge1xyXG5cdFx0XHRcdFx0XHRcdHByb2Nlc3NlZExvY2F0aW9uID0gcHJvY2Vzc2VkTG9jYXRpb24ucmVwbGFjZShcclxuXHRcdFx0XHRcdFx0XHRcdHJlZ2V4LFxyXG5cdFx0XHRcdFx0XHRcdFx0cnVsZS5yZXBsYWNlbWVudCxcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcImFsbFwiOlxyXG5cdFx0XHRcdFx0XHRwcm9jZXNzZWRTdW1tYXJ5ID0gcHJvY2Vzc2VkU3VtbWFyeS5yZXBsYWNlKFxyXG5cdFx0XHRcdFx0XHRcdHJlZ2V4LFxyXG5cdFx0XHRcdFx0XHRcdHJ1bGUucmVwbGFjZW1lbnQsXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdGlmIChwcm9jZXNzZWREZXNjcmlwdGlvbikge1xyXG5cdFx0XHRcdFx0XHRcdHByb2Nlc3NlZERlc2NyaXB0aW9uID0gcHJvY2Vzc2VkRGVzY3JpcHRpb24ucmVwbGFjZShcclxuXHRcdFx0XHRcdFx0XHRcdHJlZ2V4LFxyXG5cdFx0XHRcdFx0XHRcdFx0cnVsZS5yZXBsYWNlbWVudCxcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdGlmIChwcm9jZXNzZWRMb2NhdGlvbikge1xyXG5cdFx0XHRcdFx0XHRcdHByb2Nlc3NlZExvY2F0aW9uID0gcHJvY2Vzc2VkTG9jYXRpb24ucmVwbGFjZShcclxuXHRcdFx0XHRcdFx0XHRcdHJlZ2V4LFxyXG5cdFx0XHRcdFx0XHRcdFx0cnVsZS5yZXBsYWNlbWVudCxcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRgSW52YWxpZCByZWdleCBwYXR0ZXJuIGluIHRleHQgcmVwbGFjZW1lbnQgcnVsZSBcIiR7cnVsZS5uYW1lfVwiOiAke3J1bGUucGF0dGVybn1gLFxyXG5cdFx0XHRcdFx0ZXJyb3IsXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHN1bW1hcnk6IHByb2Nlc3NlZFN1bW1hcnksXHJcblx0XHRcdGRlc2NyaXB0aW9uOiBwcm9jZXNzZWREZXNjcmlwdGlvbixcclxuXHRcdFx0bG9jYXRpb246IHByb2Nlc3NlZExvY2F0aW9uLFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBzeW5jIHN0YXR1c1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgdXBkYXRlU3luY1N0YXR1cyhcclxuXHRcdHNvdXJjZUlkOiBzdHJpbmcsXHJcblx0XHR1cGRhdGVzOiBQYXJ0aWFsPEljc1N5bmNTdGF0dXM+LFxyXG5cdCk6IHZvaWQge1xyXG5cdFx0Y29uc3QgY3VycmVudCA9IHRoaXMuc3luY1N0YXR1c2VzLmdldChzb3VyY2VJZCkgfHwge1xyXG5cdFx0XHRzb3VyY2VJZCxcclxuXHRcdFx0c3RhdHVzOiBcImlkbGVcIixcclxuXHRcdH07XHJcblx0XHR0aGlzLnN5bmNTdGF0dXNlcy5zZXQoc291cmNlSWQsIHsgLi4uY3VycmVudCwgLi4udXBkYXRlcyB9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENhdGVnb3JpemUgZXJyb3IgdHlwZXMgZm9yIGJldHRlciBoYW5kbGluZ1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgY2F0ZWdvcml6ZUVycm9yKGVycm9yTWVzc2FnZT86IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHRpZiAoIWVycm9yTWVzc2FnZSkgcmV0dXJuIFwidW5rbm93blwiO1xyXG5cclxuXHRcdGNvbnN0IG1lc3NhZ2UgPSBlcnJvck1lc3NhZ2UudG9Mb3dlckNhc2UoKTtcclxuXHJcblx0XHRpZiAoXHJcblx0XHRcdG1lc3NhZ2UuaW5jbHVkZXMoXCJ0aW1lb3V0XCIpIHx8XHJcblx0XHRcdG1lc3NhZ2UuaW5jbHVkZXMoXCJyZXF1ZXN0IHRpbWVvdXRcIilcclxuXHRcdCkge1xyXG5cdFx0XHRyZXR1cm4gXCJ0aW1lb3V0XCI7XHJcblx0XHR9XHJcblx0XHRpZiAoXHJcblx0XHRcdG1lc3NhZ2UuaW5jbHVkZXMoXCJjb25uZWN0aW9uXCIpIHx8XHJcblx0XHRcdG1lc3NhZ2UuaW5jbHVkZXMoXCJuZXR3b3JrXCIpIHx8XHJcblx0XHRcdG1lc3NhZ2UuaW5jbHVkZXMoXCJlcnJfY29ubmVjdGlvblwiKVxyXG5cdFx0KSB7XHJcblx0XHRcdHJldHVybiBcIm5ldHdvcmtcIjtcclxuXHRcdH1cclxuXHRcdGlmIChtZXNzYWdlLmluY2x1ZGVzKFwiNDA0XCIpIHx8IG1lc3NhZ2UuaW5jbHVkZXMoXCJub3QgZm91bmRcIikpIHtcclxuXHRcdFx0cmV0dXJuIFwibm90LWZvdW5kXCI7XHJcblx0XHR9XHJcblx0XHRpZiAoXHJcblx0XHRcdG1lc3NhZ2UuaW5jbHVkZXMoXCI0MDNcIikgfHxcclxuXHRcdFx0bWVzc2FnZS5pbmNsdWRlcyhcInVuYXV0aG9yaXplZFwiKSB8fFxyXG5cdFx0XHRtZXNzYWdlLmluY2x1ZGVzKFwiNDAxXCIpXHJcblx0XHQpIHtcclxuXHRcdFx0cmV0dXJuIFwiYXV0aFwiO1xyXG5cdFx0fVxyXG5cdFx0aWYgKFxyXG5cdFx0XHRtZXNzYWdlLmluY2x1ZGVzKFwiNTAwXCIpIHx8XHJcblx0XHRcdG1lc3NhZ2UuaW5jbHVkZXMoXCI1MDJcIikgfHxcclxuXHRcdFx0bWVzc2FnZS5pbmNsdWRlcyhcIjUwM1wiKVxyXG5cdFx0KSB7XHJcblx0XHRcdHJldHVybiBcInNlcnZlclwiO1xyXG5cdFx0fVxyXG5cdFx0aWYgKG1lc3NhZ2UuaW5jbHVkZXMoXCJwYXJzZVwiKSB8fCBtZXNzYWdlLmluY2x1ZGVzKFwiaW52YWxpZFwiKSkge1xyXG5cdFx0XHRyZXR1cm4gXCJwYXJzZVwiO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBcInVua25vd25cIjtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFN0YXJ0IGJhY2tncm91bmQgcmVmcmVzaCBmb3IgYWxsIHNvdXJjZXNcclxuXHQgKi9cclxuXHRwcml2YXRlIHN0YXJ0QmFja2dyb3VuZFJlZnJlc2goKTogdm9pZCB7XHJcblx0XHR0aGlzLnN0b3BCYWNrZ3JvdW5kUmVmcmVzaCgpOyAvLyBDbGVhciBleGlzdGluZyBpbnRlcnZhbHNcclxuXHJcblx0XHRmb3IgKGNvbnN0IHNvdXJjZSBvZiB0aGlzLmNvbmZpZy5zb3VyY2VzKSB7XHJcblx0XHRcdGlmIChzb3VyY2UuZW5hYmxlZCkge1xyXG5cdFx0XHRcdGNvbnN0IGludGVydmFsID1cclxuXHRcdFx0XHRcdHNvdXJjZS5yZWZyZXNoSW50ZXJ2YWwgfHwgdGhpcy5jb25maWcuZ2xvYmFsUmVmcmVzaEludGVydmFsO1xyXG5cdFx0XHRcdGNvbnN0IGludGVydmFsSWQgPSBzZXRJbnRlcnZhbChcclxuXHRcdFx0XHRcdCgpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5zeW5jU291cmNlKHNvdXJjZS5pZCkuY2F0Y2goKGVycm9yKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcclxuXHRcdFx0XHRcdFx0XHRcdGBCYWNrZ3JvdW5kIHN5bmMgZmFpbGVkIGZvciBzb3VyY2UgJHtzb3VyY2UuaWR9OmAsXHJcblx0XHRcdFx0XHRcdFx0XHRlcnJvcixcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRpbnRlcnZhbCAqIDYwICogMTAwMCxcclxuXHRcdFx0XHQpOyAvLyBDb252ZXJ0IG1pbnV0ZXMgdG8gbWlsbGlzZWNvbmRzXHJcblxyXG5cdFx0XHRcdHRoaXMucmVmcmVzaEludGVydmFscy5zZXQoc291cmNlLmlkLCBpbnRlcnZhbElkIGFzIGFueSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFN0b3AgYmFja2dyb3VuZCByZWZyZXNoXHJcblx0ICovXHJcblx0cHJpdmF0ZSBzdG9wQmFja2dyb3VuZFJlZnJlc2goKTogdm9pZCB7XHJcblx0XHRmb3IgKGNvbnN0IFtzb3VyY2VJZCwgaW50ZXJ2YWxJZF0gb2YgdGhpcy5yZWZyZXNoSW50ZXJ2YWxzKSB7XHJcblx0XHRcdGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWxJZCk7XHJcblx0XHR9XHJcblx0XHR0aGlzLnJlZnJlc2hJbnRlcnZhbHMuY2xlYXIoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsZWFyIHJlZnJlc2ggaW50ZXJ2YWwgZm9yIGEgc3BlY2lmaWMgc291cmNlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjbGVhclJlZnJlc2hJbnRlcnZhbChzb3VyY2VJZDogc3RyaW5nKTogdm9pZCB7XHJcblx0XHRjb25zdCBpbnRlcnZhbElkID0gdGhpcy5yZWZyZXNoSW50ZXJ2YWxzLmdldChzb3VyY2VJZCk7XHJcblx0XHRpZiAoaW50ZXJ2YWxJZCkge1xyXG5cdFx0XHRjbGVhckludGVydmFsKGludGVydmFsSWQpO1xyXG5cdFx0XHR0aGlzLnJlZnJlc2hJbnRlcnZhbHMuZGVsZXRlKHNvdXJjZUlkKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsZWFudXAgd2hlbiBjb21wb25lbnQgaXMgdW5sb2FkZWRcclxuXHQgKi9cclxuXHRvdmVycmlkZSBvbnVubG9hZCgpOiB2b2lkIHtcclxuXHRcdHRoaXMuc3RvcEJhY2tncm91bmRSZWZyZXNoKCk7XHJcblx0XHRzdXBlci5vbnVubG9hZCgpO1xyXG5cdH1cclxufVxyXG4iXX0=