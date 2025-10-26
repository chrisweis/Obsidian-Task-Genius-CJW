/**
 * Manager for task timer state and localStorage operations
 */
export class TaskTimerManager {
    constructor(settings) {
        this.STORAGE_PREFIX = "taskTimer_";
        this.TIMER_LIST_KEY = "taskTimer_activeList";
        this.settings = settings;
    }
    /**
     * Generate a unique block reference ID
     * @param prefix Optional prefix to use (defaults to settings)
     * @returns Generated block ID
     */
    generateBlockId(prefix) {
        const actualPrefix = prefix || this.settings.blockRefPrefix;
        const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `${actualPrefix}-${timestamp}-${random}`;
    }
    /**
     * Generate storage key for a timer
     * @param filePath File path
     * @param blockId Block reference ID
     * @returns Storage key
     */
    getStorageKey(filePath, blockId) {
        return `${this.STORAGE_PREFIX}${filePath}#${blockId}`;
    }
    /**
     * Start a timer for a task
     * @param filePath Path of the file containing the task
     * @param existingBlockId Optional existing block ID to resume
     * @returns Generated or used block ID
     */
    startTimer(filePath, existingBlockId) {
        try {
            console.log(`[TaskTimerManager] Starting timer for file: ${filePath}, blockId: ${existingBlockId || 'new'}`);
            const blockId = existingBlockId || this.generateBlockId();
            const taskId = this.getStorageKey(filePath, blockId);
            const now = Date.now();
            if (!blockId) {
                console.error("[TaskTimerManager] Failed to generate or use block ID");
                throw new Error("Block ID generation failed");
            }
            // Check if timer already exists
            const existingTimer = this.getTimerState(taskId);
            if (existingTimer) {
                console.log(`[TaskTimerManager] Found existing timer with status: ${existingTimer.status}`);
                // Resume existing timer
                if (existingTimer.status === 'paused') {
                    this.resumeTimer(taskId);
                }
                return blockId;
            }
            // Create new timer with initial segment
            const timerState = {
                taskId,
                filePath,
                blockId,
                segments: [{
                        startTime: now
                    }],
                status: 'running',
                createdAt: now
            };
            // Save timer state
            try {
                localStorage.setItem(taskId, JSON.stringify(timerState));
                this.addToActiveList(taskId);
                console.log(`[TaskTimerManager] Successfully created new timer: ${taskId}`);
            }
            catch (storageError) {
                console.error("[TaskTimerManager] Failed to save timer to localStorage:", storageError);
                throw new Error("Failed to save timer state - localStorage may be full or unavailable");
            }
            return blockId;
        }
        catch (error) {
            console.error("[TaskTimerManager] Critical error starting timer:", error);
            throw error; // Re-throw to let caller handle
        }
    }
    /**
     * Pause a timer
     * @param taskId Timer task ID
     */
    pauseTimer(taskId) {
        const timerState = this.getTimerState(taskId);
        if (!timerState || timerState.status !== 'running') {
            return;
        }
        const now = Date.now();
        // Close the current segment
        const currentSegment = timerState.segments[timerState.segments.length - 1];
        if (currentSegment && !currentSegment.endTime) {
            currentSegment.endTime = now;
            currentSegment.duration = now - currentSegment.startTime;
        }
        timerState.status = 'paused';
        localStorage.setItem(taskId, JSON.stringify(timerState));
    }
    /**
     * Resume a paused timer
     * @param taskId Timer task ID
     */
    resumeTimer(taskId) {
        const timerState = this.getTimerState(taskId);
        if (!timerState || timerState.status !== 'paused') {
            return;
        }
        const now = Date.now();
        // Create a new segment for the resumed work
        timerState.segments.push({
            startTime: now
        });
        timerState.status = 'running';
        localStorage.setItem(taskId, JSON.stringify(timerState));
    }
    /**
     * Reset a timer
     * @param taskId Timer task ID
     */
    resetTimer(taskId) {
        const timerState = this.getTimerState(taskId);
        if (!timerState) {
            return;
        }
        const now = Date.now();
        // Clear all segments and start fresh
        timerState.segments = [{
                startTime: now
            }];
        timerState.status = 'running';
        localStorage.setItem(taskId, JSON.stringify(timerState));
    }
    /**
     * Complete a timer and return formatted duration
     * @param taskId Timer task ID
     * @returns Formatted duration string
     */
    completeTimer(taskId) {
        try {
            console.log(`[TaskTimerManager] Completing timer: ${taskId}`);
            const timerState = this.getTimerState(taskId);
            if (!timerState) {
                console.warn(`[TaskTimerManager] Timer not found for completion: ${taskId}`);
                return "";
            }
            const now = Date.now();
            // Close the current segment if running
            if (timerState.status === 'running') {
                const currentSegment = timerState.segments[timerState.segments.length - 1];
                if (currentSegment && !currentSegment.endTime) {
                    currentSegment.endTime = now;
                    currentSegment.duration = now - currentSegment.startTime;
                }
            }
            // Calculate total duration from all segments
            const totalDuration = this.calculateTotalDuration(timerState);
            console.log(`[TaskTimerManager] Total duration from ${timerState.segments.length} segments: ${totalDuration}ms`);
            // Validate duration
            if (totalDuration < 0) {
                console.error(`[TaskTimerManager] Invalid duration calculated: ${totalDuration}ms`);
                return this.formatDuration(0);
            }
            // Remove from storage
            try {
                this.removeTimer(taskId);
                console.log(`[TaskTimerManager] Successfully removed completed timer from storage`);
            }
            catch (removalError) {
                console.error("[TaskTimerManager] Failed to remove timer from storage:", removalError);
                // Continue anyway - we can still return the duration
            }
            // Format and return duration
            const formattedDuration = this.formatDuration(totalDuration);
            console.log(`[TaskTimerManager] Timer completed successfully, duration: ${formattedDuration}`);
            return formattedDuration;
        }
        catch (error) {
            console.error("[TaskTimerManager] Critical error completing timer:", error);
            // Return empty string to prevent crashes, but log the issue
            return "";
        }
    }
    /**
     * Get current timer state
     * @param taskId Timer task ID
     * @returns Timer state or null if not found
     */
    getTimerState(taskId) {
        try {
            const stored = localStorage.getItem(taskId);
            if (!stored) {
                return null;
            }
            const parsed = JSON.parse(stored);
            // Check if this is a legacy format that needs migration
            if (this.isLegacyFormat(parsed)) {
                console.log(`[TaskTimerManager] Migrating legacy timer state for ${taskId}`);
                const migrated = this.migrateLegacyState(parsed);
                // Save migrated state
                localStorage.setItem(taskId, JSON.stringify(migrated));
                return migrated;
            }
            // Validate the parsed state structure
            if (!this.validateTimerState(parsed)) {
                console.error(`[TaskTimerManager] Invalid timer state structure for ${taskId}:`, parsed);
                // Clean up corrupted data
                localStorage.removeItem(taskId);
                return null;
            }
            return parsed;
        }
        catch (error) {
            console.error(`[TaskTimerManager] Error retrieving timer state for ${taskId}:`, error);
            // Clean up corrupted data
            try {
                localStorage.removeItem(taskId);
            }
            catch (cleanupError) {
                console.error("[TaskTimerManager] Failed to clean up corrupted timer data:", cleanupError);
            }
            return null;
        }
    }
    /**
     * Check if the state is in legacy format
     * @param state State to check
     * @returns true if legacy format
     */
    isLegacyFormat(state) {
        return (state &&
            typeof state.startTime === 'number' &&
            !state.segments &&
            typeof state.totalPausedDuration === 'number');
    }
    /**
     * Migrate legacy timer state to new format
     * @param legacy Legacy timer state
     * @returns Migrated timer state
     */
    migrateLegacyState(legacy) {
        const segments = [];
        // Create segment from legacy data
        if (legacy.status === 'running') {
            // Running timer - create an open segment
            segments.push({
                startTime: legacy.startTime + legacy.totalPausedDuration
            });
        }
        else if (legacy.status === 'paused' && legacy.pausedTime) {
            // Paused timer - create a closed segment
            segments.push({
                startTime: legacy.startTime + legacy.totalPausedDuration,
                endTime: legacy.pausedTime,
                duration: legacy.pausedTime - legacy.startTime - legacy.totalPausedDuration
            });
        }
        return {
            taskId: legacy.taskId,
            filePath: legacy.filePath,
            blockId: legacy.blockId,
            segments,
            status: legacy.status,
            createdAt: legacy.createdAt,
            // Keep legacy fields for reference
            legacyStartTime: legacy.startTime,
            legacyPausedTime: legacy.pausedTime,
            legacyTotalPausedDuration: legacy.totalPausedDuration
        };
    }
    /**
     * Validate timer state structure
     * @param state Parsed timer state to validate
     * @returns true if valid, false otherwise
     */
    validateTimerState(state) {
        return (state &&
            typeof state.taskId === 'string' &&
            typeof state.filePath === 'string' &&
            typeof state.blockId === 'string' &&
            Array.isArray(state.segments) &&
            typeof state.createdAt === 'number' &&
            ['idle', 'running', 'paused'].includes(state.status));
    }
    /**
     * Get all active timers
     * @returns Array of active timer states
     */
    getAllActiveTimers() {
        const activeList = this.getActiveList();
        const timers = [];
        for (const taskId of activeList) {
            const timer = this.getTimerState(taskId);
            if (timer) {
                timers.push(timer);
            }
            else {
                // Clean up orphaned references
                this.removeFromActiveList(taskId);
            }
        }
        return timers;
    }
    /**
     * Get timer by file path and block ID
     * @param filePath File path
     * @param blockId Block ID
     * @returns Timer state or null
     */
    getTimerByFileAndBlock(filePath, blockId) {
        const taskId = this.getStorageKey(filePath, blockId);
        return this.getTimerState(taskId);
    }
    /**
     * Remove a timer from storage
     * @param taskId Timer task ID
     */
    removeTimer(taskId) {
        localStorage.removeItem(taskId);
        this.removeFromActiveList(taskId);
    }
    /**
     * Calculate total duration from all segments
     * @param timerState Timer state
     * @returns Total duration in milliseconds
     */
    calculateTotalDuration(timerState) {
        const now = Date.now();
        return timerState.segments.reduce((total, segment) => {
            let segmentDuration;
            if (segment.duration) {
                // Use cached duration if available
                segmentDuration = segment.duration;
            }
            else if (segment.endTime) {
                // Calculate duration for completed segment
                segmentDuration = segment.endTime - segment.startTime;
            }
            else {
                // Calculate duration for running segment
                segmentDuration = now - segment.startTime;
            }
            return total + segmentDuration;
        }, 0);
    }
    /**
     * Get current running time for a timer
     * @param taskId Timer task ID
     * @returns Current duration in milliseconds, or 0 if not found/running
     */
    getCurrentDuration(taskId) {
        const timerState = this.getTimerState(taskId);
        if (!timerState) {
            return 0;
        }
        return this.calculateTotalDuration(timerState);
    }
    /**
     * Get the number of time segments (sessions) for a timer
     * @param taskId Timer task ID
     * @returns Number of segments
     */
    getSegmentCount(taskId) {
        const timerState = this.getTimerState(taskId);
        if (!timerState) {
            return 0;
        }
        return timerState.segments.length;
    }
    /**
     * Get all time segments for a timer
     * @param taskId Timer task ID
     * @returns Array of time segments
     */
    getSegments(taskId) {
        const timerState = this.getTimerState(taskId);
        if (!timerState) {
            return [];
        }
        return timerState.segments;
    }
    /**
     * Format duration in milliseconds to readable string
     * @param duration Duration in milliseconds
     * @returns Formatted duration string
     */
    formatDuration(duration) {
        const seconds = Math.floor(duration / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        const remainingSeconds = seconds % 60;
        // Use template format from settings
        let template = this.settings.timeFormat;
        // Replace placeholders
        template = template.replace("{h}", hours.toString());
        template = template.replace("{m}", remainingMinutes.toString());
        template = template.replace("{s}", remainingSeconds.toString());
        template = template.replace("{ms}", duration.toString());
        // Clean up zero values (remove 0hrs, 0mins if they are zero)
        // Use word boundaries to avoid matching 10hrs, 20mins etc.
        template = template.replace(/\b0hrs\b/g, "");
        template = template.replace(/\b0mins\b/g, "");
        // Clean up leading/trailing spaces and multiple spaces
        template = template.replace(/\s+/g, " ").trim();
        return template || "0s";
    }
    /**
     * Get active timer list from localStorage
     * @returns Array of active timer task IDs
     */
    getActiveList() {
        const stored = localStorage.getItem(this.TIMER_LIST_KEY);
        if (!stored) {
            return [];
        }
        try {
            return JSON.parse(stored);
        }
        catch (error) {
            console.error("Error parsing active timer list:", error);
            return [];
        }
    }
    /**
     * Add timer to active list
     * @param taskId Timer task ID
     */
    addToActiveList(taskId) {
        const activeList = this.getActiveList();
        if (!activeList.includes(taskId)) {
            activeList.push(taskId);
            localStorage.setItem(this.TIMER_LIST_KEY, JSON.stringify(activeList));
        }
    }
    /**
     * Remove timer from active list
     * @param taskId Timer task ID
     */
    removeFromActiveList(taskId) {
        const activeList = this.getActiveList();
        const filtered = activeList.filter(id => id !== taskId);
        localStorage.setItem(this.TIMER_LIST_KEY, JSON.stringify(filtered));
    }
    /**
     * Update settings for this manager instance
     * @param settings New settings to use
     */
    updateSettings(settings) {
        this.settings = settings;
    }
    /**
     * Clean up expired or orphaned timers
     * @param maxAgeHours Maximum age in hours for keeping completed timers
     */
    cleanup(maxAgeHours = 24) {
        const activeList = this.getActiveList();
        const now = Date.now();
        const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
        for (const taskId of activeList) {
            const timer = this.getTimerState(taskId);
            if (!timer) {
                // Remove orphaned reference
                this.removeFromActiveList(taskId);
                continue;
            }
            // Remove very old timers
            if (now - timer.createdAt > maxAge) {
                this.removeTimer(taskId);
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZXItbWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRpbWVyLW1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBeUNBOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGdCQUFnQjtJQUs1QixZQUFZLFFBQTJCO1FBSHRCLG1CQUFjLEdBQUcsWUFBWSxDQUFDO1FBQzlCLG1CQUFjLEdBQUcsc0JBQXNCLENBQUM7UUFHeEQsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7SUFDMUIsQ0FBQztJQUVEOzs7O09BSUc7SUFDSSxlQUFlLENBQUMsTUFBZTtRQUNyQyxNQUFNLFlBQVksR0FBRyxNQUFNLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUM7UUFDNUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsNkJBQTZCO1FBQ2hGLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDN0UsT0FBTyxHQUFHLFlBQVksSUFBSSxTQUFTLElBQUksTUFBTSxFQUFFLENBQUM7SUFDakQsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ssYUFBYSxDQUFDLFFBQWdCLEVBQUUsT0FBZTtRQUN0RCxPQUFPLEdBQUcsSUFBSSxDQUFDLGNBQWMsR0FBRyxRQUFRLElBQUksT0FBTyxFQUFFLENBQUM7SUFDdkQsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0gsVUFBVSxDQUFDLFFBQWdCLEVBQUUsZUFBd0I7UUFDcEQsSUFBSTtZQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsK0NBQStDLFFBQVEsY0FBYyxlQUFlLElBQUksS0FBSyxFQUFFLENBQUMsQ0FBQztZ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QUFDLFFBQTJCO1FBQ3pDLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO0lBQzFCLENBQUM7SUFFRDs7O09BR0c7SUFDSCxPQUFPLENBQUMsY0FBc0IsRUFBRTtRQUMvQixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDeEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sTUFBTSxHQUFHLFdBQVcsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLDBCQUEwQjtRQUV2RSxLQUFLLE1BQU0sTUFBTSxJQUFJLFVBQVUsRUFBRTtZQUNoQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pDLElBQUksQ0FBQyxLQUFLLEVBQUU7Z0JBQ1gsNEJBQTRCO2dCQUM1QixJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ2xDLFNBQVM7YUFDVDtZQUVELHlCQUF5QjtZQUN6QixJQUFJLEdBQUcsR0FBRyxLQUFLLENBQUMsU0FBUyxHQUFHLE1BQU0sRUFBRTtnQkFDbkMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQzthQUN6QjtTQUNEO0lBQ0YsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVGFza1RpbWVyU2V0dGluZ3MgfSBmcm9tIFwiLi4vY29tbW9uL3NldHRpbmctZGVmaW5pdGlvblwiO1xyXG5cclxuLyoqXHJcbiAqIFRpbWUgc2VnbWVudCBpbnRlcmZhY2UgLSByZXByZXNlbnRzIGEgc2luZ2xlIHdvcmsgc2Vzc2lvblxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBUaW1lU2VnbWVudCB7XHJcblx0c3RhcnRUaW1lOiBudW1iZXI7XHJcblx0ZW5kVGltZT86IG51bWJlcjsgLy8gdW5kZWZpbmVkIG1lYW5zIHN0aWxsIHJ1bm5pbmdcclxuXHRkdXJhdGlvbj86IG51bWJlcjsgLy8gY2FjaGVkIGR1cmF0aW9uIGZvciBjb21wbGV0ZWQgc2VnbWVudHNcclxufVxyXG5cclxuLyoqXHJcbiAqIFRpbWVyIHN0YXRlIGludGVyZmFjZVxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBUaW1lclN0YXRlIHtcclxuXHR0YXNrSWQ6IHN0cmluZztcclxuXHRmaWxlUGF0aDogc3RyaW5nO1xyXG5cdGJsb2NrSWQ6IHN0cmluZztcclxuXHRzZWdtZW50czogVGltZVNlZ21lbnRbXTsgLy8gQXJyYXkgb2YgdGltZSBzZWdtZW50c1xyXG5cdHN0YXR1czogJ2lkbGUnIHwgJ3J1bm5pbmcnIHwgJ3BhdXNlZCc7XHJcblx0Y3JlYXRlZEF0OiBudW1iZXI7XHJcblx0Ly8gTGVnYWN5IGZpZWxkcyBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eVxyXG5cdGxlZ2FjeVN0YXJ0VGltZT86IG51bWJlcjtcclxuXHRsZWdhY3lQYXVzZWRUaW1lPzogbnVtYmVyO1xyXG5cdGxlZ2FjeVRvdGFsUGF1c2VkRHVyYXRpb24/OiBudW1iZXI7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBMZWdhY3kgdGltZXIgc3RhdGUgaW50ZXJmYWNlIGZvciBtaWdyYXRpb25cclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgTGVnYWN5VGltZXJTdGF0ZSB7XHJcblx0dGFza0lkOiBzdHJpbmc7XHJcblx0ZmlsZVBhdGg6IHN0cmluZztcclxuXHRibG9ja0lkOiBzdHJpbmc7XHJcblx0c3RhcnRUaW1lOiBudW1iZXI7XHJcblx0cGF1c2VkVGltZT86IG51bWJlcjtcclxuXHR0b3RhbFBhdXNlZER1cmF0aW9uOiBudW1iZXI7XHJcblx0c3RhdHVzOiAnaWRsZScgfCAncnVubmluZycgfCAncGF1c2VkJztcclxuXHRjcmVhdGVkQXQ6IG51bWJlcjtcclxufVxyXG5cclxuLyoqXHJcbiAqIE1hbmFnZXIgZm9yIHRhc2sgdGltZXIgc3RhdGUgYW5kIGxvY2FsU3RvcmFnZSBvcGVyYXRpb25zXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgVGFza1RpbWVyTWFuYWdlciB7XHJcblx0cHJpdmF0ZSBzZXR0aW5nczogVGFza1RpbWVyU2V0dGluZ3M7XHJcblx0cHJpdmF0ZSByZWFkb25seSBTVE9SQUdFX1BSRUZJWCA9IFwidGFza1RpbWVyX1wiO1xyXG5cdHByaXZhdGUgcmVhZG9ubHkgVElNRVJfTElTVF9LRVkgPSBcInRhc2tUaW1lcl9hY3RpdmVMaXN0XCI7XHJcblxyXG5cdGNvbnN0cnVjdG9yKHNldHRpbmdzOiBUYXNrVGltZXJTZXR0aW5ncykge1xyXG5cdFx0dGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2VuZXJhdGUgYSB1bmlxdWUgYmxvY2sgcmVmZXJlbmNlIElEXHJcblx0ICogQHBhcmFtIHByZWZpeCBPcHRpb25hbCBwcmVmaXggdG8gdXNlIChkZWZhdWx0cyB0byBzZXR0aW5ncylcclxuXHQgKiBAcmV0dXJucyBHZW5lcmF0ZWQgYmxvY2sgSURcclxuXHQgKi9cclxuXHRwdWJsaWMgZ2VuZXJhdGVCbG9ja0lkKHByZWZpeD86IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHRjb25zdCBhY3R1YWxQcmVmaXggPSBwcmVmaXggfHwgdGhpcy5zZXR0aW5ncy5ibG9ja1JlZlByZWZpeDtcclxuXHRcdGNvbnN0IHRpbWVzdGFtcCA9IERhdGUubm93KCkudG9TdHJpbmcoKS5zbGljZSgtNik7IC8vIExhc3QgNiBkaWdpdHMgb2YgdGltZXN0YW1wXHJcblx0XHRjb25zdCByYW5kb20gPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMCkudG9TdHJpbmcoKS5wYWRTdGFydCg0LCAnMCcpO1xyXG5cdFx0cmV0dXJuIGAke2FjdHVhbFByZWZpeH0tJHt0aW1lc3RhbXB9LSR7cmFuZG9tfWA7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZW5lcmF0ZSBzdG9yYWdlIGtleSBmb3IgYSB0aW1lclxyXG5cdCAqIEBwYXJhbSBmaWxlUGF0aCBGaWxlIHBhdGhcclxuXHQgKiBAcGFyYW0gYmxvY2tJZCBCbG9jayByZWZlcmVuY2UgSURcclxuXHQgKiBAcmV0dXJucyBTdG9yYWdlIGtleVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZ2V0U3RvcmFnZUtleShmaWxlUGF0aDogc3RyaW5nLCBibG9ja0lkOiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIGAke3RoaXMuU1RPUkFHRV9QUkVGSVh9JHtmaWxlUGF0aH0jJHtibG9ja0lkfWA7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTdGFydCBhIHRpbWVyIGZvciBhIHRhc2tcclxuXHQgKiBAcGFyYW0gZmlsZVBhdGggUGF0aCBvZiB0aGUgZmlsZSBjb250YWluaW5nIHRoZSB0YXNrXHJcblx0ICogQHBhcmFtIGV4aXN0aW5nQmxvY2tJZCBPcHRpb25hbCBleGlzdGluZyBibG9jayBJRCB0byByZXN1bWVcclxuXHQgKiBAcmV0dXJucyBHZW5lcmF0ZWQgb3IgdXNlZCBibG9jayBJRFxyXG5cdCAqL1xyXG5cdHN0YXJ0VGltZXIoZmlsZVBhdGg6IHN0cmluZywgZXhpc3RpbmdCbG9ja0lkPzogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKGBbVGFza1RpbWVyTWFuYWdlcl0gU3RhcnRpbmcgdGltZXIgZm9yIGZpbGU6ICR7ZmlsZVBhdGh9LCBibG9ja0lkOiAke2V4aXN0aW5nQmxvY2tJZCB8fCAnbmV3J31gKTtcclxuXHRcdFx0XHJcblx0XHRcdGNvbnN0IGJsb2NrSWQgPSBleGlzdGluZ0Jsb2NrSWQgfHwgdGhpcy5nZW5lcmF0ZUJsb2NrSWQoKTtcclxuXHRcdFx0Y29uc3QgdGFza0lkID0gdGhpcy5nZXRTdG9yYWdlS2V5KGZpbGVQYXRoLCBibG9ja0lkKTtcclxuXHRcdFx0Y29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcclxuXHJcblx0XHRcdGlmICghYmxvY2tJZCkge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJbVGFza1RpbWVyTWFuYWdlcl0gRmFpbGVkIHRvIGdlbmVyYXRlIG9yIHVzZSBibG9jayBJRFwiKTtcclxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJCbG9jayBJRCBnZW5lcmF0aW9uIGZhaWxlZFwiKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgaWYgdGltZXIgYWxyZWFkeSBleGlzdHNcclxuXHRcdFx0Y29uc3QgZXhpc3RpbmdUaW1lciA9IHRoaXMuZ2V0VGltZXJTdGF0ZSh0YXNrSWQpO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKGV4aXN0aW5nVGltZXIpIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhgW1Rhc2tUaW1lck1hbmFnZXJdIEZvdW5kIGV4aXN0aW5nIHRpbWVyIHdpdGggc3RhdHVzOiAke2V4aXN0aW5nVGltZXIuc3RhdHVzfWApO1xyXG5cdFx0XHRcdC8vIFJlc3VtZSBleGlzdGluZyB0aW1lclxyXG5cdFx0XHRcdGlmIChleGlzdGluZ1RpbWVyLnN0YXR1cyA9PT0gJ3BhdXNlZCcpIHtcclxuXHRcdFx0XHRcdHRoaXMucmVzdW1lVGltZXIodGFza0lkKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cmV0dXJuIGJsb2NrSWQ7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENyZWF0ZSBuZXcgdGltZXIgd2l0aCBpbml0aWFsIHNlZ21lbnRcclxuXHRcdFx0Y29uc3QgdGltZXJTdGF0ZTogVGltZXJTdGF0ZSA9IHtcclxuXHRcdFx0XHR0YXNrSWQsXHJcblx0XHRcdFx0ZmlsZVBhdGgsXHJcblx0XHRcdFx0YmxvY2tJZCxcclxuXHRcdFx0XHRzZWdtZW50czogW3tcclxuXHRcdFx0XHRcdHN0YXJ0VGltZTogbm93XHJcblx0XHRcdFx0fV0sXHJcblx0XHRcdFx0c3RhdHVzOiAncnVubmluZycsXHJcblx0XHRcdFx0Y3JlYXRlZEF0OiBub3dcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIFNhdmUgdGltZXIgc3RhdGVcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbSh0YXNrSWQsIEpTT04uc3RyaW5naWZ5KHRpbWVyU3RhdGUpKTtcclxuXHRcdFx0XHR0aGlzLmFkZFRvQWN0aXZlTGlzdCh0YXNrSWQpO1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKGBbVGFza1RpbWVyTWFuYWdlcl0gU3VjY2Vzc2Z1bGx5IGNyZWF0ZWQgbmV3IHRpbWVyOiAke3Rhc2tJZH1gKTtcclxuXHRcdFx0fSBjYXRjaCAoc3RvcmFnZUVycm9yKSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcihcIltUYXNrVGltZXJNYW5hZ2VyXSBGYWlsZWQgdG8gc2F2ZSB0aW1lciB0byBsb2NhbFN0b3JhZ2U6XCIsIHN0b3JhZ2VFcnJvcik7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiRmFpbGVkIHRvIHNhdmUgdGltZXIgc3RhdGUgLSBsb2NhbFN0b3JhZ2UgbWF5IGJlIGZ1bGwgb3IgdW5hdmFpbGFibGVcIik7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBibG9ja0lkO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIltUYXNrVGltZXJNYW5hZ2VyXSBDcml0aWNhbCBlcnJvciBzdGFydGluZyB0aW1lcjpcIiwgZXJyb3IpO1xyXG5cdFx0XHR0aHJvdyBlcnJvcjsgLy8gUmUtdGhyb3cgdG8gbGV0IGNhbGxlciBoYW5kbGVcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFBhdXNlIGEgdGltZXJcclxuXHQgKiBAcGFyYW0gdGFza0lkIFRpbWVyIHRhc2sgSURcclxuXHQgKi9cclxuXHRwYXVzZVRpbWVyKHRhc2tJZDogc3RyaW5nKTogdm9pZCB7XHJcblx0XHRjb25zdCB0aW1lclN0YXRlID0gdGhpcy5nZXRUaW1lclN0YXRlKHRhc2tJZCk7XHJcblx0XHRpZiAoIXRpbWVyU3RhdGUgfHwgdGltZXJTdGF0ZS5zdGF0dXMgIT09ICdydW5uaW5nJykge1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcclxuXHRcdFxyXG5cdFx0Ly8gQ2xvc2UgdGhlIGN1cnJlbnQgc2VnbWVudFxyXG5cdFx0Y29uc3QgY3VycmVudFNlZ21lbnQgPSB0aW1lclN0YXRlLnNlZ21lbnRzW3RpbWVyU3RhdGUuc2VnbWVudHMubGVuZ3RoIC0gMV07XHJcblx0XHRpZiAoY3VycmVudFNlZ21lbnQgJiYgIWN1cnJlbnRTZWdtZW50LmVuZFRpbWUpIHtcclxuXHRcdFx0Y3VycmVudFNlZ21lbnQuZW5kVGltZSA9IG5vdztcclxuXHRcdFx0Y3VycmVudFNlZ21lbnQuZHVyYXRpb24gPSBub3cgLSBjdXJyZW50U2VnbWVudC5zdGFydFRpbWU7XHJcblx0XHR9XHJcblxyXG5cdFx0dGltZXJTdGF0ZS5zdGF0dXMgPSAncGF1c2VkJztcclxuXHJcblx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbSh0YXNrSWQsIEpTT04uc3RyaW5naWZ5KHRpbWVyU3RhdGUpKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlc3VtZSBhIHBhdXNlZCB0aW1lclxyXG5cdCAqIEBwYXJhbSB0YXNrSWQgVGltZXIgdGFzayBJRFxyXG5cdCAqL1xyXG5cdHJlc3VtZVRpbWVyKHRhc2tJZDogc3RyaW5nKTogdm9pZCB7XHJcblx0XHRjb25zdCB0aW1lclN0YXRlID0gdGhpcy5nZXRUaW1lclN0YXRlKHRhc2tJZCk7XHJcblx0XHRpZiAoIXRpbWVyU3RhdGUgfHwgdGltZXJTdGF0ZS5zdGF0dXMgIT09ICdwYXVzZWQnKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBub3cgPSBEYXRlLm5vdygpO1xyXG5cdFx0XHJcblx0XHQvLyBDcmVhdGUgYSBuZXcgc2VnbWVudCBmb3IgdGhlIHJlc3VtZWQgd29ya1xyXG5cdFx0dGltZXJTdGF0ZS5zZWdtZW50cy5wdXNoKHtcclxuXHRcdFx0c3RhcnRUaW1lOiBub3dcclxuXHRcdH0pO1xyXG5cdFx0XHJcblx0XHR0aW1lclN0YXRlLnN0YXR1cyA9ICdydW5uaW5nJztcclxuXHJcblx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbSh0YXNrSWQsIEpTT04uc3RyaW5naWZ5KHRpbWVyU3RhdGUpKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlc2V0IGEgdGltZXJcclxuXHQgKiBAcGFyYW0gdGFza0lkIFRpbWVyIHRhc2sgSURcclxuXHQgKi9cclxuXHRyZXNldFRpbWVyKHRhc2tJZDogc3RyaW5nKTogdm9pZCB7XHJcblx0XHRjb25zdCB0aW1lclN0YXRlID0gdGhpcy5nZXRUaW1lclN0YXRlKHRhc2tJZCk7XHJcblx0XHRpZiAoIXRpbWVyU3RhdGUpIHtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IG5vdyA9IERhdGUubm93KCk7XHJcblx0XHRcclxuXHRcdC8vIENsZWFyIGFsbCBzZWdtZW50cyBhbmQgc3RhcnQgZnJlc2hcclxuXHRcdHRpbWVyU3RhdGUuc2VnbWVudHMgPSBbe1xyXG5cdFx0XHRzdGFydFRpbWU6IG5vd1xyXG5cdFx0fV07XHJcblx0XHR0aW1lclN0YXRlLnN0YXR1cyA9ICdydW5uaW5nJztcclxuXHJcblx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbSh0YXNrSWQsIEpTT04uc3RyaW5naWZ5KHRpbWVyU3RhdGUpKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENvbXBsZXRlIGEgdGltZXIgYW5kIHJldHVybiBmb3JtYXR0ZWQgZHVyYXRpb25cclxuXHQgKiBAcGFyYW0gdGFza0lkIFRpbWVyIHRhc2sgSURcclxuXHQgKiBAcmV0dXJucyBGb3JtYXR0ZWQgZHVyYXRpb24gc3RyaW5nXHJcblx0ICovXHJcblx0Y29tcGxldGVUaW1lcih0YXNrSWQ6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhgW1Rhc2tUaW1lck1hbmFnZXJdIENvbXBsZXRpbmcgdGltZXI6ICR7dGFza0lkfWApO1xyXG5cdFx0XHRcclxuXHRcdFx0Y29uc3QgdGltZXJTdGF0ZSA9IHRoaXMuZ2V0VGltZXJTdGF0ZSh0YXNrSWQpO1xyXG5cdFx0XHRpZiAoIXRpbWVyU3RhdGUpIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oYFtUYXNrVGltZXJNYW5hZ2VyXSBUaW1lciBub3QgZm91bmQgZm9yIGNvbXBsZXRpb246ICR7dGFza0lkfWApO1xyXG5cdFx0XHRcdHJldHVybiBcIlwiO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBub3cgPSBEYXRlLm5vdygpO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gQ2xvc2UgdGhlIGN1cnJlbnQgc2VnbWVudCBpZiBydW5uaW5nXHJcblx0XHRcdGlmICh0aW1lclN0YXRlLnN0YXR1cyA9PT0gJ3J1bm5pbmcnKSB7XHJcblx0XHRcdFx0Y29uc3QgY3VycmVudFNlZ21lbnQgPSB0aW1lclN0YXRlLnNlZ21lbnRzW3RpbWVyU3RhdGUuc2VnbWVudHMubGVuZ3RoIC0gMV07XHJcblx0XHRcdFx0aWYgKGN1cnJlbnRTZWdtZW50ICYmICFjdXJyZW50U2VnbWVudC5lbmRUaW1lKSB7XHJcblx0XHRcdFx0XHRjdXJyZW50U2VnbWVudC5lbmRUaW1lID0gbm93O1xyXG5cdFx0XHRcdFx0Y3VycmVudFNlZ21lbnQuZHVyYXRpb24gPSBub3cgLSBjdXJyZW50U2VnbWVudC5zdGFydFRpbWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBDYWxjdWxhdGUgdG90YWwgZHVyYXRpb24gZnJvbSBhbGwgc2VnbWVudHNcclxuXHRcdFx0Y29uc3QgdG90YWxEdXJhdGlvbiA9IHRoaXMuY2FsY3VsYXRlVG90YWxEdXJhdGlvbih0aW1lclN0YXRlKTtcclxuXHRcdFx0Y29uc29sZS5sb2coYFtUYXNrVGltZXJNYW5hZ2VyXSBUb3RhbCBkdXJhdGlvbiBmcm9tICR7dGltZXJTdGF0ZS5zZWdtZW50cy5sZW5ndGh9IHNlZ21lbnRzOiAke3RvdGFsRHVyYXRpb259bXNgKTtcclxuXHJcblx0XHRcdC8vIFZhbGlkYXRlIGR1cmF0aW9uXHJcblx0XHRcdGlmICh0b3RhbER1cmF0aW9uIDwgMCkge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoYFtUYXNrVGltZXJNYW5hZ2VyXSBJbnZhbGlkIGR1cmF0aW9uIGNhbGN1bGF0ZWQ6ICR7dG90YWxEdXJhdGlvbn1tc2ApO1xyXG5cdFx0XHRcdHJldHVybiB0aGlzLmZvcm1hdER1cmF0aW9uKDApO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBSZW1vdmUgZnJvbSBzdG9yYWdlXHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0dGhpcy5yZW1vdmVUaW1lcih0YXNrSWQpO1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKGBbVGFza1RpbWVyTWFuYWdlcl0gU3VjY2Vzc2Z1bGx5IHJlbW92ZWQgY29tcGxldGVkIHRpbWVyIGZyb20gc3RvcmFnZWApO1xyXG5cdFx0XHR9IGNhdGNoIChyZW1vdmFsRXJyb3IpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiW1Rhc2tUaW1lck1hbmFnZXJdIEZhaWxlZCB0byByZW1vdmUgdGltZXIgZnJvbSBzdG9yYWdlOlwiLCByZW1vdmFsRXJyb3IpO1xyXG5cdFx0XHRcdC8vIENvbnRpbnVlIGFueXdheSAtIHdlIGNhbiBzdGlsbCByZXR1cm4gdGhlIGR1cmF0aW9uXHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEZvcm1hdCBhbmQgcmV0dXJuIGR1cmF0aW9uXHJcblx0XHRcdGNvbnN0IGZvcm1hdHRlZER1cmF0aW9uID0gdGhpcy5mb3JtYXREdXJhdGlvbih0b3RhbER1cmF0aW9uKTtcclxuXHRcdFx0Y29uc29sZS5sb2coYFtUYXNrVGltZXJNYW5hZ2VyXSBUaW1lciBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5LCBkdXJhdGlvbjogJHtmb3JtYXR0ZWREdXJhdGlvbn1gKTtcclxuXHRcdFx0cmV0dXJuIGZvcm1hdHRlZER1cmF0aW9uO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIltUYXNrVGltZXJNYW5hZ2VyXSBDcml0aWNhbCBlcnJvciBjb21wbGV0aW5nIHRpbWVyOlwiLCBlcnJvcik7XHJcblx0XHRcdC8vIFJldHVybiBlbXB0eSBzdHJpbmcgdG8gcHJldmVudCBjcmFzaGVzLCBidXQgbG9nIHRoZSBpc3N1ZVxyXG5cdFx0XHRyZXR1cm4gXCJcIjtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBjdXJyZW50IHRpbWVyIHN0YXRlXHJcblx0ICogQHBhcmFtIHRhc2tJZCBUaW1lciB0YXNrIElEXHJcblx0ICogQHJldHVybnMgVGltZXIgc3RhdGUgb3IgbnVsbCBpZiBub3QgZm91bmRcclxuXHQgKi9cclxuXHRnZXRUaW1lclN0YXRlKHRhc2tJZDogc3RyaW5nKTogVGltZXJTdGF0ZSB8IG51bGwge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3Qgc3RvcmVkID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0odGFza0lkKTtcclxuXHRcdFx0aWYgKCFzdG9yZWQpIHtcclxuXHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShzdG9yZWQpO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gQ2hlY2sgaWYgdGhpcyBpcyBhIGxlZ2FjeSBmb3JtYXQgdGhhdCBuZWVkcyBtaWdyYXRpb25cclxuXHRcdFx0aWYgKHRoaXMuaXNMZWdhY3lGb3JtYXQocGFyc2VkKSkge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKGBbVGFza1RpbWVyTWFuYWdlcl0gTWlncmF0aW5nIGxlZ2FjeSB0aW1lciBzdGF0ZSBmb3IgJHt0YXNrSWR9YCk7XHJcblx0XHRcdFx0Y29uc3QgbWlncmF0ZWQgPSB0aGlzLm1pZ3JhdGVMZWdhY3lTdGF0ZShwYXJzZWQgYXMgTGVnYWN5VGltZXJTdGF0ZSk7XHJcblx0XHRcdFx0Ly8gU2F2ZSBtaWdyYXRlZCBzdGF0ZVxyXG5cdFx0XHRcdGxvY2FsU3RvcmFnZS5zZXRJdGVtKHRhc2tJZCwgSlNPTi5zdHJpbmdpZnkobWlncmF0ZWQpKTtcclxuXHRcdFx0XHRyZXR1cm4gbWlncmF0ZWQ7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdC8vIFZhbGlkYXRlIHRoZSBwYXJzZWQgc3RhdGUgc3RydWN0dXJlXHJcblx0XHRcdGlmICghdGhpcy52YWxpZGF0ZVRpbWVyU3RhdGUocGFyc2VkKSkge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoYFtUYXNrVGltZXJNYW5hZ2VyXSBJbnZhbGlkIHRpbWVyIHN0YXRlIHN0cnVjdHVyZSBmb3IgJHt0YXNrSWR9OmAsIHBhcnNlZCk7XHJcblx0XHRcdFx0Ly8gQ2xlYW4gdXAgY29ycnVwdGVkIGRhdGFcclxuXHRcdFx0XHRsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSh0YXNrSWQpO1xyXG5cdFx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRyZXR1cm4gcGFyc2VkIGFzIFRpbWVyU3RhdGU7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKGBbVGFza1RpbWVyTWFuYWdlcl0gRXJyb3IgcmV0cmlldmluZyB0aW1lciBzdGF0ZSBmb3IgJHt0YXNrSWR9OmAsIGVycm9yKTtcclxuXHRcdFx0Ly8gQ2xlYW4gdXAgY29ycnVwdGVkIGRhdGFcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSh0YXNrSWQpO1xyXG5cdFx0XHR9IGNhdGNoIChjbGVhbnVwRXJyb3IpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiW1Rhc2tUaW1lck1hbmFnZXJdIEZhaWxlZCB0byBjbGVhbiB1cCBjb3JydXB0ZWQgdGltZXIgZGF0YTpcIiwgY2xlYW51cEVycm9yKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGlmIHRoZSBzdGF0ZSBpcyBpbiBsZWdhY3kgZm9ybWF0XHJcblx0ICogQHBhcmFtIHN0YXRlIFN0YXRlIHRvIGNoZWNrXHJcblx0ICogQHJldHVybnMgdHJ1ZSBpZiBsZWdhY3kgZm9ybWF0XHJcblx0ICovXHJcblx0cHJpdmF0ZSBpc0xlZ2FjeUZvcm1hdChzdGF0ZTogYW55KTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gKFxyXG5cdFx0XHRzdGF0ZSAmJlxyXG5cdFx0XHR0eXBlb2Ygc3RhdGUuc3RhcnRUaW1lID09PSAnbnVtYmVyJyAmJlxyXG5cdFx0XHQhc3RhdGUuc2VnbWVudHMgJiZcclxuXHRcdFx0dHlwZW9mIHN0YXRlLnRvdGFsUGF1c2VkRHVyYXRpb24gPT09ICdudW1iZXInXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTWlncmF0ZSBsZWdhY3kgdGltZXIgc3RhdGUgdG8gbmV3IGZvcm1hdFxyXG5cdCAqIEBwYXJhbSBsZWdhY3kgTGVnYWN5IHRpbWVyIHN0YXRlXHJcblx0ICogQHJldHVybnMgTWlncmF0ZWQgdGltZXIgc3RhdGVcclxuXHQgKi9cclxuXHRwcml2YXRlIG1pZ3JhdGVMZWdhY3lTdGF0ZShsZWdhY3k6IExlZ2FjeVRpbWVyU3RhdGUpOiBUaW1lclN0YXRlIHtcclxuXHRcdGNvbnN0IHNlZ21lbnRzOiBUaW1lU2VnbWVudFtdID0gW107XHJcblx0XHRcclxuXHRcdC8vIENyZWF0ZSBzZWdtZW50IGZyb20gbGVnYWN5IGRhdGFcclxuXHRcdGlmIChsZWdhY3kuc3RhdHVzID09PSAncnVubmluZycpIHtcclxuXHRcdFx0Ly8gUnVubmluZyB0aW1lciAtIGNyZWF0ZSBhbiBvcGVuIHNlZ21lbnRcclxuXHRcdFx0c2VnbWVudHMucHVzaCh7XHJcblx0XHRcdFx0c3RhcnRUaW1lOiBsZWdhY3kuc3RhcnRUaW1lICsgbGVnYWN5LnRvdGFsUGF1c2VkRHVyYXRpb25cclxuXHRcdFx0fSk7XHJcblx0XHR9IGVsc2UgaWYgKGxlZ2FjeS5zdGF0dXMgPT09ICdwYXVzZWQnICYmIGxlZ2FjeS5wYXVzZWRUaW1lKSB7XHJcblx0XHRcdC8vIFBhdXNlZCB0aW1lciAtIGNyZWF0ZSBhIGNsb3NlZCBzZWdtZW50XHJcblx0XHRcdHNlZ21lbnRzLnB1c2goe1xyXG5cdFx0XHRcdHN0YXJ0VGltZTogbGVnYWN5LnN0YXJ0VGltZSArIGxlZ2FjeS50b3RhbFBhdXNlZER1cmF0aW9uLFxyXG5cdFx0XHRcdGVuZFRpbWU6IGxlZ2FjeS5wYXVzZWRUaW1lLFxyXG5cdFx0XHRcdGR1cmF0aW9uOiBsZWdhY3kucGF1c2VkVGltZSAtIGxlZ2FjeS5zdGFydFRpbWUgLSBsZWdhY3kudG90YWxQYXVzZWREdXJhdGlvblxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0dGFza0lkOiBsZWdhY3kudGFza0lkLFxyXG5cdFx0XHRmaWxlUGF0aDogbGVnYWN5LmZpbGVQYXRoLFxyXG5cdFx0XHRibG9ja0lkOiBsZWdhY3kuYmxvY2tJZCxcclxuXHRcdFx0c2VnbWVudHMsXHJcblx0XHRcdHN0YXR1czogbGVnYWN5LnN0YXR1cyxcclxuXHRcdFx0Y3JlYXRlZEF0OiBsZWdhY3kuY3JlYXRlZEF0LFxyXG5cdFx0XHQvLyBLZWVwIGxlZ2FjeSBmaWVsZHMgZm9yIHJlZmVyZW5jZVxyXG5cdFx0XHRsZWdhY3lTdGFydFRpbWU6IGxlZ2FjeS5zdGFydFRpbWUsXHJcblx0XHRcdGxlZ2FjeVBhdXNlZFRpbWU6IGxlZ2FjeS5wYXVzZWRUaW1lLFxyXG5cdFx0XHRsZWdhY3lUb3RhbFBhdXNlZER1cmF0aW9uOiBsZWdhY3kudG90YWxQYXVzZWREdXJhdGlvblxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFZhbGlkYXRlIHRpbWVyIHN0YXRlIHN0cnVjdHVyZVxyXG5cdCAqIEBwYXJhbSBzdGF0ZSBQYXJzZWQgdGltZXIgc3RhdGUgdG8gdmFsaWRhdGVcclxuXHQgKiBAcmV0dXJucyB0cnVlIGlmIHZhbGlkLCBmYWxzZSBvdGhlcndpc2VcclxuXHQgKi9cclxuXHRwcml2YXRlIHZhbGlkYXRlVGltZXJTdGF0ZShzdGF0ZTogYW55KTogc3RhdGUgaXMgVGltZXJTdGF0ZSB7XHJcblx0XHRyZXR1cm4gKFxyXG5cdFx0XHRzdGF0ZSAmJlxyXG5cdFx0XHR0eXBlb2Ygc3RhdGUudGFza0lkID09PSAnc3RyaW5nJyAmJlxyXG5cdFx0XHR0eXBlb2Ygc3RhdGUuZmlsZVBhdGggPT09ICdzdHJpbmcnICYmXHJcblx0XHRcdHR5cGVvZiBzdGF0ZS5ibG9ja0lkID09PSAnc3RyaW5nJyAmJlxyXG5cdFx0XHRBcnJheS5pc0FycmF5KHN0YXRlLnNlZ21lbnRzKSAmJlxyXG5cdFx0XHR0eXBlb2Ygc3RhdGUuY3JlYXRlZEF0ID09PSAnbnVtYmVyJyAmJlxyXG5cdFx0XHRbJ2lkbGUnLCAncnVubmluZycsICdwYXVzZWQnXS5pbmNsdWRlcyhzdGF0ZS5zdGF0dXMpXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGFsbCBhY3RpdmUgdGltZXJzXHJcblx0ICogQHJldHVybnMgQXJyYXkgb2YgYWN0aXZlIHRpbWVyIHN0YXRlc1xyXG5cdCAqL1xyXG5cdGdldEFsbEFjdGl2ZVRpbWVycygpOiBUaW1lclN0YXRlW10ge1xyXG5cdFx0Y29uc3QgYWN0aXZlTGlzdCA9IHRoaXMuZ2V0QWN0aXZlTGlzdCgpO1xyXG5cdFx0Y29uc3QgdGltZXJzOiBUaW1lclN0YXRlW10gPSBbXTtcclxuXHJcblx0XHRmb3IgKGNvbnN0IHRhc2tJZCBvZiBhY3RpdmVMaXN0KSB7XHJcblx0XHRcdGNvbnN0IHRpbWVyID0gdGhpcy5nZXRUaW1lclN0YXRlKHRhc2tJZCk7XHJcblx0XHRcdGlmICh0aW1lcikge1xyXG5cdFx0XHRcdHRpbWVycy5wdXNoKHRpbWVyKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBDbGVhbiB1cCBvcnBoYW5lZCByZWZlcmVuY2VzXHJcblx0XHRcdFx0dGhpcy5yZW1vdmVGcm9tQWN0aXZlTGlzdCh0YXNrSWQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHRpbWVycztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0aW1lciBieSBmaWxlIHBhdGggYW5kIGJsb2NrIElEXHJcblx0ICogQHBhcmFtIGZpbGVQYXRoIEZpbGUgcGF0aFxyXG5cdCAqIEBwYXJhbSBibG9ja0lkIEJsb2NrIElEXHJcblx0ICogQHJldHVybnMgVGltZXIgc3RhdGUgb3IgbnVsbFxyXG5cdCAqL1xyXG5cdGdldFRpbWVyQnlGaWxlQW5kQmxvY2soZmlsZVBhdGg6IHN0cmluZywgYmxvY2tJZDogc3RyaW5nKTogVGltZXJTdGF0ZSB8IG51bGwge1xyXG5cdFx0Y29uc3QgdGFza0lkID0gdGhpcy5nZXRTdG9yYWdlS2V5KGZpbGVQYXRoLCBibG9ja0lkKTtcclxuXHRcdHJldHVybiB0aGlzLmdldFRpbWVyU3RhdGUodGFza0lkKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbW92ZSBhIHRpbWVyIGZyb20gc3RvcmFnZVxyXG5cdCAqIEBwYXJhbSB0YXNrSWQgVGltZXIgdGFzayBJRFxyXG5cdCAqL1xyXG5cdHJlbW92ZVRpbWVyKHRhc2tJZDogc3RyaW5nKTogdm9pZCB7XHJcblx0XHRsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSh0YXNrSWQpO1xyXG5cdFx0dGhpcy5yZW1vdmVGcm9tQWN0aXZlTGlzdCh0YXNrSWQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2FsY3VsYXRlIHRvdGFsIGR1cmF0aW9uIGZyb20gYWxsIHNlZ21lbnRzXHJcblx0ICogQHBhcmFtIHRpbWVyU3RhdGUgVGltZXIgc3RhdGVcclxuXHQgKiBAcmV0dXJucyBUb3RhbCBkdXJhdGlvbiBpbiBtaWxsaXNlY29uZHNcclxuXHQgKi9cclxuXHRwcml2YXRlIGNhbGN1bGF0ZVRvdGFsRHVyYXRpb24odGltZXJTdGF0ZTogVGltZXJTdGF0ZSk6IG51bWJlciB7XHJcblx0XHRjb25zdCBub3cgPSBEYXRlLm5vdygpO1xyXG5cdFx0XHJcblx0XHRyZXR1cm4gdGltZXJTdGF0ZS5zZWdtZW50cy5yZWR1Y2UoKHRvdGFsLCBzZWdtZW50KSA9PiB7XHJcblx0XHRcdGxldCBzZWdtZW50RHVyYXRpb246IG51bWJlcjtcclxuXHRcdFx0XHJcblx0XHRcdGlmIChzZWdtZW50LmR1cmF0aW9uKSB7XHJcblx0XHRcdFx0Ly8gVXNlIGNhY2hlZCBkdXJhdGlvbiBpZiBhdmFpbGFibGVcclxuXHRcdFx0XHRzZWdtZW50RHVyYXRpb24gPSBzZWdtZW50LmR1cmF0aW9uO1xyXG5cdFx0XHR9IGVsc2UgaWYgKHNlZ21lbnQuZW5kVGltZSkge1xyXG5cdFx0XHRcdC8vIENhbGN1bGF0ZSBkdXJhdGlvbiBmb3IgY29tcGxldGVkIHNlZ21lbnRcclxuXHRcdFx0XHRzZWdtZW50RHVyYXRpb24gPSBzZWdtZW50LmVuZFRpbWUgLSBzZWdtZW50LnN0YXJ0VGltZTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBDYWxjdWxhdGUgZHVyYXRpb24gZm9yIHJ1bm5pbmcgc2VnbWVudFxyXG5cdFx0XHRcdHNlZ21lbnREdXJhdGlvbiA9IG5vdyAtIHNlZ21lbnQuc3RhcnRUaW1lO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRyZXR1cm4gdG90YWwgKyBzZWdtZW50RHVyYXRpb247XHJcblx0XHR9LCAwKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBjdXJyZW50IHJ1bm5pbmcgdGltZSBmb3IgYSB0aW1lclxyXG5cdCAqIEBwYXJhbSB0YXNrSWQgVGltZXIgdGFzayBJRFxyXG5cdCAqIEByZXR1cm5zIEN1cnJlbnQgZHVyYXRpb24gaW4gbWlsbGlzZWNvbmRzLCBvciAwIGlmIG5vdCBmb3VuZC9ydW5uaW5nXHJcblx0ICovXHJcblx0Z2V0Q3VycmVudER1cmF0aW9uKHRhc2tJZDogc3RyaW5nKTogbnVtYmVyIHtcclxuXHRcdGNvbnN0IHRpbWVyU3RhdGUgPSB0aGlzLmdldFRpbWVyU3RhdGUodGFza0lkKTtcclxuXHRcdGlmICghdGltZXJTdGF0ZSkge1xyXG5cdFx0XHRyZXR1cm4gMDtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdGhpcy5jYWxjdWxhdGVUb3RhbER1cmF0aW9uKHRpbWVyU3RhdGUpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHRoZSBudW1iZXIgb2YgdGltZSBzZWdtZW50cyAoc2Vzc2lvbnMpIGZvciBhIHRpbWVyXHJcblx0ICogQHBhcmFtIHRhc2tJZCBUaW1lciB0YXNrIElEXHJcblx0ICogQHJldHVybnMgTnVtYmVyIG9mIHNlZ21lbnRzXHJcblx0ICovXHJcblx0Z2V0U2VnbWVudENvdW50KHRhc2tJZDogc3RyaW5nKTogbnVtYmVyIHtcclxuXHRcdGNvbnN0IHRpbWVyU3RhdGUgPSB0aGlzLmdldFRpbWVyU3RhdGUodGFza0lkKTtcclxuXHRcdGlmICghdGltZXJTdGF0ZSkge1xyXG5cdFx0XHRyZXR1cm4gMDtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdGltZXJTdGF0ZS5zZWdtZW50cy5sZW5ndGg7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgYWxsIHRpbWUgc2VnbWVudHMgZm9yIGEgdGltZXJcclxuXHQgKiBAcGFyYW0gdGFza0lkIFRpbWVyIHRhc2sgSURcclxuXHQgKiBAcmV0dXJucyBBcnJheSBvZiB0aW1lIHNlZ21lbnRzXHJcblx0ICovXHJcblx0Z2V0U2VnbWVudHModGFza0lkOiBzdHJpbmcpOiBUaW1lU2VnbWVudFtdIHtcclxuXHRcdGNvbnN0IHRpbWVyU3RhdGUgPSB0aGlzLmdldFRpbWVyU3RhdGUodGFza0lkKTtcclxuXHRcdGlmICghdGltZXJTdGF0ZSkge1xyXG5cdFx0XHRyZXR1cm4gW107XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHRpbWVyU3RhdGUuc2VnbWVudHM7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBGb3JtYXQgZHVyYXRpb24gaW4gbWlsbGlzZWNvbmRzIHRvIHJlYWRhYmxlIHN0cmluZ1xyXG5cdCAqIEBwYXJhbSBkdXJhdGlvbiBEdXJhdGlvbiBpbiBtaWxsaXNlY29uZHNcclxuXHQgKiBAcmV0dXJucyBGb3JtYXR0ZWQgZHVyYXRpb24gc3RyaW5nXHJcblx0ICovXHJcblx0Zm9ybWF0RHVyYXRpb24oZHVyYXRpb246IG51bWJlcik6IHN0cmluZyB7XHJcblx0XHRjb25zdCBzZWNvbmRzID0gTWF0aC5mbG9vcihkdXJhdGlvbiAvIDEwMDApO1xyXG5cdFx0Y29uc3QgbWludXRlcyA9IE1hdGguZmxvb3Ioc2Vjb25kcyAvIDYwKTtcclxuXHRcdGNvbnN0IGhvdXJzID0gTWF0aC5mbG9vcihtaW51dGVzIC8gNjApO1xyXG5cclxuXHRcdGNvbnN0IHJlbWFpbmluZ01pbnV0ZXMgPSBtaW51dGVzICUgNjA7XHJcblx0XHRjb25zdCByZW1haW5pbmdTZWNvbmRzID0gc2Vjb25kcyAlIDYwO1xyXG5cclxuXHRcdC8vIFVzZSB0ZW1wbGF0ZSBmb3JtYXQgZnJvbSBzZXR0aW5nc1xyXG5cdFx0bGV0IHRlbXBsYXRlID0gdGhpcy5zZXR0aW5ncy50aW1lRm9ybWF0O1xyXG5cdFx0XHJcblx0XHQvLyBSZXBsYWNlIHBsYWNlaG9sZGVyc1xyXG5cdFx0dGVtcGxhdGUgPSB0ZW1wbGF0ZS5yZXBsYWNlKFwie2h9XCIsIGhvdXJzLnRvU3RyaW5nKCkpO1xyXG5cdFx0dGVtcGxhdGUgPSB0ZW1wbGF0ZS5yZXBsYWNlKFwie219XCIsIHJlbWFpbmluZ01pbnV0ZXMudG9TdHJpbmcoKSk7XHJcblx0XHR0ZW1wbGF0ZSA9IHRlbXBsYXRlLnJlcGxhY2UoXCJ7c31cIiwgcmVtYWluaW5nU2Vjb25kcy50b1N0cmluZygpKTtcclxuXHRcdHRlbXBsYXRlID0gdGVtcGxhdGUucmVwbGFjZShcInttc31cIiwgZHVyYXRpb24udG9TdHJpbmcoKSk7XHJcblxyXG5cdFx0Ly8gQ2xlYW4gdXAgemVybyB2YWx1ZXMgKHJlbW92ZSAwaHJzLCAwbWlucyBpZiB0aGV5IGFyZSB6ZXJvKVxyXG5cdFx0Ly8gVXNlIHdvcmQgYm91bmRhcmllcyB0byBhdm9pZCBtYXRjaGluZyAxMGhycywgMjBtaW5zIGV0Yy5cclxuXHRcdHRlbXBsYXRlID0gdGVtcGxhdGUucmVwbGFjZSgvXFxiMGhyc1xcYi9nLCBcIlwiKTtcclxuXHRcdHRlbXBsYXRlID0gdGVtcGxhdGUucmVwbGFjZSgvXFxiMG1pbnNcXGIvZywgXCJcIik7XHJcblx0XHRcclxuXHRcdC8vIENsZWFuIHVwIGxlYWRpbmcvdHJhaWxpbmcgc3BhY2VzIGFuZCBtdWx0aXBsZSBzcGFjZXNcclxuXHRcdHRlbXBsYXRlID0gdGVtcGxhdGUucmVwbGFjZSgvXFxzKy9nLCBcIiBcIikudHJpbSgpO1xyXG5cclxuXHRcdHJldHVybiB0ZW1wbGF0ZSB8fCBcIjBzXCI7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgYWN0aXZlIHRpbWVyIGxpc3QgZnJvbSBsb2NhbFN0b3JhZ2VcclxuXHQgKiBAcmV0dXJucyBBcnJheSBvZiBhY3RpdmUgdGltZXIgdGFzayBJRHNcclxuXHQgKi9cclxuXHRwcml2YXRlIGdldEFjdGl2ZUxpc3QoKTogc3RyaW5nW10ge1xyXG5cdFx0Y29uc3Qgc3RvcmVkID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0odGhpcy5USU1FUl9MSVNUX0tFWSk7XHJcblx0XHRpZiAoIXN0b3JlZCkge1xyXG5cdFx0XHRyZXR1cm4gW107XHJcblx0XHR9XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0cmV0dXJuIEpTT04ucGFyc2Uoc3RvcmVkKSBhcyBzdHJpbmdbXTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFcnJvciBwYXJzaW5nIGFjdGl2ZSB0aW1lciBsaXN0OlwiLCBlcnJvcik7XHJcblx0XHRcdHJldHVybiBbXTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEFkZCB0aW1lciB0byBhY3RpdmUgbGlzdFxyXG5cdCAqIEBwYXJhbSB0YXNrSWQgVGltZXIgdGFzayBJRFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYWRkVG9BY3RpdmVMaXN0KHRhc2tJZDogc3RyaW5nKTogdm9pZCB7XHJcblx0XHRjb25zdCBhY3RpdmVMaXN0ID0gdGhpcy5nZXRBY3RpdmVMaXN0KCk7XHJcblx0XHRpZiAoIWFjdGl2ZUxpc3QuaW5jbHVkZXModGFza0lkKSkge1xyXG5cdFx0XHRhY3RpdmVMaXN0LnB1c2godGFza0lkKTtcclxuXHRcdFx0bG9jYWxTdG9yYWdlLnNldEl0ZW0odGhpcy5USU1FUl9MSVNUX0tFWSwgSlNPTi5zdHJpbmdpZnkoYWN0aXZlTGlzdCkpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVtb3ZlIHRpbWVyIGZyb20gYWN0aXZlIGxpc3RcclxuXHQgKiBAcGFyYW0gdGFza0lkIFRpbWVyIHRhc2sgSURcclxuXHQgKi9cclxuXHRwcml2YXRlIHJlbW92ZUZyb21BY3RpdmVMaXN0KHRhc2tJZDogc3RyaW5nKTogdm9pZCB7XHJcblx0XHRjb25zdCBhY3RpdmVMaXN0ID0gdGhpcy5nZXRBY3RpdmVMaXN0KCk7XHJcblx0XHRjb25zdCBmaWx0ZXJlZCA9IGFjdGl2ZUxpc3QuZmlsdGVyKGlkID0+IGlkICE9PSB0YXNrSWQpO1xyXG5cdFx0bG9jYWxTdG9yYWdlLnNldEl0ZW0odGhpcy5USU1FUl9MSVNUX0tFWSwgSlNPTi5zdHJpbmdpZnkoZmlsdGVyZWQpKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBzZXR0aW5ncyBmb3IgdGhpcyBtYW5hZ2VyIGluc3RhbmNlXHJcblx0ICogQHBhcmFtIHNldHRpbmdzIE5ldyBzZXR0aW5ncyB0byB1c2VcclxuXHQgKi9cclxuXHR1cGRhdGVTZXR0aW5ncyhzZXR0aW5nczogVGFza1RpbWVyU2V0dGluZ3MpOiB2b2lkIHtcclxuXHRcdHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsZWFuIHVwIGV4cGlyZWQgb3Igb3JwaGFuZWQgdGltZXJzXHJcblx0ICogQHBhcmFtIG1heEFnZUhvdXJzIE1heGltdW0gYWdlIGluIGhvdXJzIGZvciBrZWVwaW5nIGNvbXBsZXRlZCB0aW1lcnNcclxuXHQgKi9cclxuXHRjbGVhbnVwKG1heEFnZUhvdXJzOiBudW1iZXIgPSAyNCk6IHZvaWQge1xyXG5cdFx0Y29uc3QgYWN0aXZlTGlzdCA9IHRoaXMuZ2V0QWN0aXZlTGlzdCgpO1xyXG5cdFx0Y29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcclxuXHRcdGNvbnN0IG1heEFnZSA9IG1heEFnZUhvdXJzICogNjAgKiA2MCAqIDEwMDA7IC8vIENvbnZlcnQgdG8gbWlsbGlzZWNvbmRzXHJcblxyXG5cdFx0Zm9yIChjb25zdCB0YXNrSWQgb2YgYWN0aXZlTGlzdCkge1xyXG5cdFx0XHRjb25zdCB0aW1lciA9IHRoaXMuZ2V0VGltZXJTdGF0ZSh0YXNrSWQpO1xyXG5cdFx0XHRpZiAoIXRpbWVyKSB7XHJcblx0XHRcdFx0Ly8gUmVtb3ZlIG9ycGhhbmVkIHJlZmVyZW5jZVxyXG5cdFx0XHRcdHRoaXMucmVtb3ZlRnJvbUFjdGl2ZUxpc3QodGFza0lkKTtcclxuXHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gUmVtb3ZlIHZlcnkgb2xkIHRpbWVyc1xyXG5cdFx0XHRpZiAobm93IC0gdGltZXIuY3JlYXRlZEF0ID4gbWF4QWdlKSB7XHJcblx0XHRcdFx0dGhpcy5yZW1vdmVUaW1lcih0YXNrSWQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG59Il19