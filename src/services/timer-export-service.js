/**
 * Export and import functionality for task timer data
 */
export class TaskTimerExporter {
    constructor(timerManager) {
        this.EXPORT_VERSION = "1.0.0";
        this.timerManager = timerManager;
    }
    /**
     * Export all timer data to JSON format
     * @param includeActive Whether to include currently active timers
     * @returns JSON string of exported data
     */
    exportToJSON(includeActive = false) {
        const exportData = this.prepareExportData(includeActive);
        return JSON.stringify(exportData, null, 2);
    }
    /**
     * Export all timer data to YAML format
     * @param includeActive Whether to include currently active timers
     * @returns YAML string of exported data
     */
    exportToYAML(includeActive = false) {
        const exportData = this.prepareExportData(includeActive);
        return this.convertToYAML(exportData);
    }
    /**
     * Import timer data from JSON string
     * @param jsonData JSON string containing export data
     * @returns true if import was successful
     */
    importFromJSON(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            return this.processImportData(data);
        }
        catch (error) {
            console.error("Error importing JSON data:", error);
            return false;
        }
    }
    /**
     * Import timer data from YAML string
     * @param yamlData YAML string containing export data
     * @returns true if import was successful
     */
    importFromYAML(yamlData) {
        try {
            const data = this.parseYAML(yamlData);
            return this.processImportData(data);
        }
        catch (error) {
            console.error("Error importing YAML data:", error);
            return false;
        }
    }
    /**
     * Export active timers to a temporary backup
     * @returns Backup data as JSON string
     */
    createBackup() {
        const activeTimers = this.timerManager.getAllActiveTimers();
        const backupData = {
            version: this.EXPORT_VERSION,
            backupDate: new Date().toISOString(),
            activeTimers: activeTimers.map(timer => (Object.assign(Object.assign({}, timer), { currentDuration: this.timerManager.getCurrentDuration(timer.taskId) })))
        };
        return JSON.stringify(backupData, null, 2);
    }
    /**
     * Restore timers from backup data
     * @param backupData Backup data as JSON string
     * @returns true if restore was successful
     */
    restoreFromBackup(backupData) {
        try {
            const backup = JSON.parse(backupData);
            if (!backup.activeTimers || !Array.isArray(backup.activeTimers)) {
                return false;
            }
            // Restore each timer
            for (const timerData of backup.activeTimers) {
                // Recreate timer state in localStorage
                // Convert old format to new segments format
                const segments = [];
                if (timerData.startTime) {
                    segments.push({
                        startTime: timerData.startTime,
                        endTime: timerData.pausedTime,
                        duration: timerData.pausedTime ?
                            timerData.pausedTime - timerData.startTime - (timerData.totalPausedDuration || 0) :
                            undefined
                    });
                }
                const restoredTimer = {
                    taskId: timerData.taskId,
                    filePath: timerData.filePath,
                    blockId: timerData.blockId,
                    segments: segments,
                    status: timerData.status,
                    createdAt: timerData.createdAt,
                    // Keep legacy fields for reference
                    legacyStartTime: timerData.startTime,
                    legacyPausedTime: timerData.pausedTime,
                    legacyTotalPausedDuration: timerData.totalPausedDuration || 0
                };
                localStorage.setItem(timerData.taskId, JSON.stringify(restoredTimer));
            }
            return true;
        }
        catch (error) {
            console.error("Error restoring from backup:", error);
            return false;
        }
    }
    /**
     * Get export statistics
     * @returns Statistics about exportable data
     */
    getExportStats() {
        const activeTimers = this.timerManager.getAllActiveTimers();
        let totalDuration = 0;
        let oldestTime = Number.MAX_SAFE_INTEGER;
        let newestTime = 0;
        let oldestTimer = null;
        let newestTimer = null;
        for (const timer of activeTimers) {
            const duration = this.timerManager.getCurrentDuration(timer.taskId);
            totalDuration += duration;
            if (timer.createdAt < oldestTime) {
                oldestTime = timer.createdAt;
                oldestTimer = new Date(timer.createdAt).toLocaleString();
            }
            if (timer.createdAt > newestTime) {
                newestTime = timer.createdAt;
                newestTimer = new Date(timer.createdAt).toLocaleString();
            }
        }
        return {
            activeTimers: activeTimers.length,
            totalDuration,
            oldestTimer,
            newestTimer
        };
    }
    /**
     * Prepare data for export
     * @param includeActive Whether to include active timers
     * @returns Export data structure
     */
    prepareExportData(includeActive) {
        const activeTimers = this.timerManager.getAllActiveTimers();
        const exportTimers = [];
        for (const timer of activeTimers) {
            // Skip active timers if not requested
            if (!includeActive && (timer.status === 'running' || timer.status === 'paused')) {
                continue;
            }
            const currentDuration = this.timerManager.getCurrentDuration(timer.taskId);
            // Get the first and last segments for export
            const firstSegment = timer.segments[0];
            const lastSegment = timer.segments[timer.segments.length - 1];
            exportTimers.push({
                taskId: timer.taskId,
                filePath: timer.filePath,
                blockId: timer.blockId,
                startTime: firstSegment ? firstSegment.startTime : timer.createdAt,
                endTime: lastSegment && lastSegment.endTime ? lastSegment.endTime : undefined,
                duration: currentDuration,
                status: timer.status,
                createdAt: timer.createdAt,
                totalPausedDuration: timer.legacyTotalPausedDuration || 0
            });
        }
        return {
            version: this.EXPORT_VERSION,
            exportDate: new Date().toISOString(),
            timers: exportTimers
        };
    }
    /**
     * Process imported data and validate structure
     * @param data Imported data structure
     * @returns true if processing was successful
     */
    processImportData(data) {
        if (!this.validateImportData(data)) {
            return false;
        }
        let importedCount = 0;
        for (const timerData of data.timers) {
            try {
                // Only import completed timers to avoid conflicts
                if (timerData.status === 'idle' || timerData.endTime) {
                    // Store as historical data (could be extended for analytics)
                    const historyKey = `taskTimer_history_${timerData.blockId}_${timerData.startTime}`;
                    localStorage.setItem(historyKey, JSON.stringify(Object.assign(Object.assign({}, timerData), { importedAt: Date.now() })));
                    importedCount++;
                }
            }
            catch (error) {
                console.warn("Failed to import timer:", timerData.taskId, error);
            }
        }
        console.log(`Successfully imported ${importedCount} timer records`);
        return importedCount > 0;
    }
    /**
     * Validate imported data structure
     * @param data Data to validate
     * @returns true if data is valid
     */
    validateImportData(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }
        if (!data.version || !data.exportDate || !Array.isArray(data.timers)) {
            return false;
        }
        // Validate each timer entry
        for (const timer of data.timers) {
            if (!timer.taskId || !timer.filePath || !timer.blockId ||
                typeof timer.startTime !== 'number' ||
                typeof timer.duration !== 'number') {
                return false;
            }
        }
        return true;
    }
    /**
     * Convert object to YAML format (simple implementation)
     * @param obj Object to convert
     * @returns YAML string
     */
    convertToYAML(obj, indent = 0) {
        const spaces = '  '.repeat(indent);
        let yaml = '';
        if (Array.isArray(obj)) {
            for (const item of obj) {
                yaml += `${spaces}- ${this.convertToYAML(item, indent + 1).trim()}\n`;
            }
        }
        else if (obj !== null && typeof obj === 'object') {
            for (const [key, value] of Object.entries(obj)) {
                if (Array.isArray(value)) {
                    yaml += `${spaces}${key}:\n`;
                    yaml += this.convertToYAML(value, indent + 1);
                }
                else if (value !== null && typeof value === 'object') {
                    yaml += `${spaces}${key}:\n`;
                    yaml += this.convertToYAML(value, indent + 1);
                }
                else {
                    yaml += `${spaces}${key}: ${this.yamlEscape(value)}\n`;
                }
            }
        }
        else {
            return this.yamlEscape(obj);
        }
        return yaml;
    }
    /**
     * Parse YAML string to object (simple implementation)
     * @param yamlString YAML string to parse
     * @returns Parsed object
     */
    parseYAML(yamlString) {
        // This is a very basic YAML parser for our specific use case
        // For production use, consider using a proper YAML library
        const lines = yamlString.split('\n');
        const result = {};
        let currentObject = result;
        const objectStack = [result];
        let currentKey = '';
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.startsWith('#'))
                continue;
            const indent = line.length - line.trimLeft().length;
            const colonIndex = trimmedLine.indexOf(':');
            if (colonIndex > 0) {
                const key = trimmedLine.substring(0, colonIndex).trim();
                const value = trimmedLine.substring(colonIndex + 1).trim();
                if (value === '') {
                    // This is a parent key
                    currentObject[key] = {};
                    currentKey = key;
                }
                else if (value === '[]') {
                    currentObject[key] = [];
                }
                else {
                    // This is a key-value pair
                    currentObject[key] = this.parseYAMLValue(value);
                }
            }
            else if (trimmedLine.startsWith('- ')) {
                // This is an array item
                if (!Array.isArray(currentObject[currentKey])) {
                    currentObject[currentKey] = [];
                }
                const item = this.parseYAMLValue(trimmedLine.substring(2));
                currentObject[currentKey].push(item);
            }
        }
        return result;
    }
    /**
     * Parse individual YAML value
     * @param value String value to parse
     * @returns Parsed value
     */
    parseYAMLValue(value) {
        value = value.trim();
        if (value === 'true')
            return true;
        if (value === 'false')
            return false;
        if (value === 'null')
            return null;
        // Try to parse as number
        const numValue = Number(value);
        if (!isNaN(numValue) && isFinite(numValue)) {
            return numValue;
        }
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            return value.slice(1, -1);
        }
        return value;
    }
    /**
     * Escape value for YAML output
     * @param value Value to escape
     * @returns Escaped string
     */
    yamlEscape(value) {
        if (typeof value === 'string') {
            // Quote strings that contain special characters
            if (value.includes(':') || value.includes('\n') || value.includes('#')) {
                return `"${value.replace(/"/g, '\\"')}"`;
            }
        }
        return String(value);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZXItZXhwb3J0LXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0aW1lci1leHBvcnQtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFzQkE7O0dBRUc7QUFDSCxNQUFNLE9BQU8saUJBQWlCO0lBSTdCLFlBQVksWUFBOEI7UUFGekIsbUJBQWMsR0FBRyxPQUFPLENBQUM7UUFHekMsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7SUFDbEMsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxZQUFZLENBQUMsZ0JBQXlCLEtBQUs7UUFDMUMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3pELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsWUFBWSxDQUFDLGdCQUF5QixLQUFLO1FBQzFDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUN6RCxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxjQUFjLENBQUMsUUFBZ0I7UUFDOUIsSUFBSTtZQUNILE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFvQixDQUFDO1lBQ3JELE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3BDO1FBQUMsT0FBTyxLQUFLLEVBQUU7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLDRCQUE0QixFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ25ELE9BQU8sS0FBSyxDQUFDO1NBQ2I7SUFDRixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILGNBQWMsQ0FBQyxRQUFnQjtRQUM5QixJQUFJO1lBQ0gsTUFBTSxJQUFJ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QyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDdkUsT0FBTyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUM7YUFDekM7U0FDRDtRQUNELE9BQU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3RCLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRhc2tUaW1lck1hbmFnZXIsIFRpbWVyU3RhdGUgfSBmcm9tIFwiLi4vbWFuYWdlcnMvdGltZXItbWFuYWdlclwiO1xyXG5pbXBvcnQgeyBUYXNrVGltZXJGb3JtYXR0ZXIgfSBmcm9tIFwiLi90aW1lci1mb3JtYXQtc2VydmljZVwiO1xyXG5cclxuLyoqXHJcbiAqIERhdGEgc3RydWN0dXJlIGZvciB0aW1lciBleHBvcnQvaW1wb3J0XHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIFRpbWVyRXhwb3J0RGF0YSB7XHJcblx0dmVyc2lvbjogc3RyaW5nO1xyXG5cdGV4cG9ydERhdGU6IHN0cmluZztcclxuXHR0aW1lcnM6IHtcclxuXHRcdHRhc2tJZDogc3RyaW5nO1xyXG5cdFx0ZmlsZVBhdGg6IHN0cmluZztcclxuXHRcdGJsb2NrSWQ6IHN0cmluZztcclxuXHRcdHN0YXJ0VGltZTogbnVtYmVyO1xyXG5cdFx0ZW5kVGltZT86IG51bWJlcjtcclxuXHRcdGR1cmF0aW9uOiBudW1iZXI7XHJcblx0XHRzdGF0dXM6IHN0cmluZztcclxuXHRcdGNyZWF0ZWRBdDogbnVtYmVyO1xyXG5cdFx0dG90YWxQYXVzZWREdXJhdGlvbjogbnVtYmVyO1xyXG5cdH1bXTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEV4cG9ydCBhbmQgaW1wb3J0IGZ1bmN0aW9uYWxpdHkgZm9yIHRhc2sgdGltZXIgZGF0YVxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFRhc2tUaW1lckV4cG9ydGVyIHtcclxuXHRwcml2YXRlIHRpbWVyTWFuYWdlcjogVGFza1RpbWVyTWFuYWdlcjtcclxuXHRwcml2YXRlIHJlYWRvbmx5IEVYUE9SVF9WRVJTSU9OID0gXCIxLjAuMFwiO1xyXG5cclxuXHRjb25zdHJ1Y3Rvcih0aW1lck1hbmFnZXI6IFRhc2tUaW1lck1hbmFnZXIpIHtcclxuXHRcdHRoaXMudGltZXJNYW5hZ2VyID0gdGltZXJNYW5hZ2VyO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRXhwb3J0IGFsbCB0aW1lciBkYXRhIHRvIEpTT04gZm9ybWF0XHJcblx0ICogQHBhcmFtIGluY2x1ZGVBY3RpdmUgV2hldGhlciB0byBpbmNsdWRlIGN1cnJlbnRseSBhY3RpdmUgdGltZXJzXHJcblx0ICogQHJldHVybnMgSlNPTiBzdHJpbmcgb2YgZXhwb3J0ZWQgZGF0YVxyXG5cdCAqL1xyXG5cdGV4cG9ydFRvSlNPTihpbmNsdWRlQWN0aXZlOiBib29sZWFuID0gZmFsc2UpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgZXhwb3J0RGF0YSA9IHRoaXMucHJlcGFyZUV4cG9ydERhdGEoaW5jbHVkZUFjdGl2ZSk7XHJcblx0XHRyZXR1cm4gSlNPTi5zdHJpbmdpZnkoZXhwb3J0RGF0YSwgbnVsbCwgMik7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFeHBvcnQgYWxsIHRpbWVyIGRhdGEgdG8gWUFNTCBmb3JtYXRcclxuXHQgKiBAcGFyYW0gaW5jbHVkZUFjdGl2ZSBXaGV0aGVyIHRvIGluY2x1ZGUgY3VycmVudGx5IGFjdGl2ZSB0aW1lcnNcclxuXHQgKiBAcmV0dXJucyBZQU1MIHN0cmluZyBvZiBleHBvcnRlZCBkYXRhXHJcblx0ICovXHJcblx0ZXhwb3J0VG9ZQU1MKGluY2x1ZGVBY3RpdmU6IGJvb2xlYW4gPSBmYWxzZSk6IHN0cmluZyB7XHJcblx0XHRjb25zdCBleHBvcnREYXRhID0gdGhpcy5wcmVwYXJlRXhwb3J0RGF0YShpbmNsdWRlQWN0aXZlKTtcclxuXHRcdHJldHVybiB0aGlzLmNvbnZlcnRUb1lBTUwoZXhwb3J0RGF0YSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBJbXBvcnQgdGltZXIgZGF0YSBmcm9tIEpTT04gc3RyaW5nXHJcblx0ICogQHBhcmFtIGpzb25EYXRhIEpTT04gc3RyaW5nIGNvbnRhaW5pbmcgZXhwb3J0IGRhdGFcclxuXHQgKiBAcmV0dXJucyB0cnVlIGlmIGltcG9ydCB3YXMgc3VjY2Vzc2Z1bFxyXG5cdCAqL1xyXG5cdGltcG9ydEZyb21KU09OKGpzb25EYXRhOiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKGpzb25EYXRhKSBhcyBUaW1lckV4cG9ydERhdGE7XHJcblx0XHRcdHJldHVybiB0aGlzLnByb2Nlc3NJbXBvcnREYXRhKGRhdGEpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIGltcG9ydGluZyBKU09OIGRhdGE6XCIsIGVycm9yKTtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSW1wb3J0IHRpbWVyIGRhdGEgZnJvbSBZQU1MIHN0cmluZ1xyXG5cdCAqIEBwYXJhbSB5YW1sRGF0YSBZQU1MIHN0cmluZyBjb250YWluaW5nIGV4cG9ydCBkYXRhXHJcblx0ICogQHJldHVybnMgdHJ1ZSBpZiBpbXBvcnQgd2FzIHN1Y2Nlc3NmdWxcclxuXHQgKi9cclxuXHRpbXBvcnRGcm9tWUFNTCh5YW1sRGF0YTogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBkYXRhID0gdGhpcy5wYXJzZVlBTUwoeWFtbERhdGEpIGFzIFRpbWVyRXhwb3J0RGF0YTtcclxuXHRcdFx0cmV0dXJuIHRoaXMucHJvY2Vzc0ltcG9ydERhdGEoZGF0YSk7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRXJyb3IgaW1wb3J0aW5nIFlBTUwgZGF0YTpcIiwgZXJyb3IpO1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFeHBvcnQgYWN0aXZlIHRpbWVycyB0byBhIHRlbXBvcmFyeSBiYWNrdXBcclxuXHQgKiBAcmV0dXJucyBCYWNrdXAgZGF0YSBhcyBKU09OIHN0cmluZ1xyXG5cdCAqL1xyXG5cdGNyZWF0ZUJhY2t1cCgpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgYWN0aXZlVGltZXJzID0gdGhpcy50aW1lck1hbmFnZXIuZ2V0QWxsQWN0aXZlVGltZXJzKCk7XHJcblx0XHRjb25zdCBiYWNrdXBEYXRhID0ge1xyXG5cdFx0XHR2ZXJzaW9uOiB0aGlzLkVYUE9SVF9WRVJTSU9OLFxyXG5cdFx0XHRiYWNrdXBEYXRlOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcblx0XHRcdGFjdGl2ZVRpbWVyczogYWN0aXZlVGltZXJzLm1hcCh0aW1lciA9PiAoe1xyXG5cdFx0XHRcdC4uLnRpbWVyLFxyXG5cdFx0XHRcdGN1cnJlbnREdXJhdGlvbjogdGhpcy50aW1lck1hbmFnZXIuZ2V0Q3VycmVudER1cmF0aW9uKHRpbWVyLnRhc2tJZClcclxuXHRcdFx0fSkpXHJcblx0XHR9O1xyXG5cclxuXHRcdHJldHVybiBKU09OLnN0cmluZ2lmeShiYWNrdXBEYXRhLCBudWxsLCAyKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlc3RvcmUgdGltZXJzIGZyb20gYmFja3VwIGRhdGFcclxuXHQgKiBAcGFyYW0gYmFja3VwRGF0YSBCYWNrdXAgZGF0YSBhcyBKU09OIHN0cmluZ1xyXG5cdCAqIEByZXR1cm5zIHRydWUgaWYgcmVzdG9yZSB3YXMgc3VjY2Vzc2Z1bFxyXG5cdCAqL1xyXG5cdHJlc3RvcmVGcm9tQmFja3VwKGJhY2t1cERhdGE6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgYmFja3VwID0gSlNPTi5wYXJzZShiYWNrdXBEYXRhKTtcclxuXHRcdFx0XHJcblx0XHRcdGlmICghYmFja3VwLmFjdGl2ZVRpbWVycyB8fCAhQXJyYXkuaXNBcnJheShiYWNrdXAuYWN0aXZlVGltZXJzKSkge1xyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gUmVzdG9yZSBlYWNoIHRpbWVyXHJcblx0XHRcdGZvciAoY29uc3QgdGltZXJEYXRhIG9mIGJhY2t1cC5hY3RpdmVUaW1lcnMpIHtcclxuXHRcdFx0XHQvLyBSZWNyZWF0ZSB0aW1lciBzdGF0ZSBpbiBsb2NhbFN0b3JhZ2VcclxuXHRcdFx0XHQvLyBDb252ZXJ0IG9sZCBmb3JtYXQgdG8gbmV3IHNlZ21lbnRzIGZvcm1hdFxyXG5cdFx0XHRcdGNvbnN0IHNlZ21lbnRzID0gW107XHJcblx0XHRcdFx0aWYgKHRpbWVyRGF0YS5zdGFydFRpbWUpIHtcclxuXHRcdFx0XHRcdHNlZ21lbnRzLnB1c2goe1xyXG5cdFx0XHRcdFx0XHRzdGFydFRpbWU6IHRpbWVyRGF0YS5zdGFydFRpbWUsXHJcblx0XHRcdFx0XHRcdGVuZFRpbWU6IHRpbWVyRGF0YS5wYXVzZWRUaW1lLFxyXG5cdFx0XHRcdFx0XHRkdXJhdGlvbjogdGltZXJEYXRhLnBhdXNlZFRpbWUgPyBcclxuXHRcdFx0XHRcdFx0XHR0aW1lckRhdGEucGF1c2VkVGltZSAtIHRpbWVyRGF0YS5zdGFydFRpbWUgLSAodGltZXJEYXRhLnRvdGFsUGF1c2VkRHVyYXRpb24gfHwgMCkgOiBcclxuXHRcdFx0XHRcdFx0XHR1bmRlZmluZWRcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRcclxuXHRcdFx0XHRjb25zdCByZXN0b3JlZFRpbWVyOiBUaW1lclN0YXRlID0ge1xyXG5cdFx0XHRcdFx0dGFza0lkOiB0aW1lckRhdGEudGFza0lkLFxyXG5cdFx0XHRcdFx0ZmlsZVBhdGg6IHRpbWVyRGF0YS5maWxlUGF0aCxcclxuXHRcdFx0XHRcdGJsb2NrSWQ6IHRpbWVyRGF0YS5ibG9ja0lkLFxyXG5cdFx0XHRcdFx0c2VnbWVudHM6IHNlZ21lbnRzLFxyXG5cdFx0XHRcdFx0c3RhdHVzOiB0aW1lckRhdGEuc3RhdHVzIGFzICdpZGxlJyB8ICdydW5uaW5nJyB8ICdwYXVzZWQnLFxyXG5cdFx0XHRcdFx0Y3JlYXRlZEF0OiB0aW1lckRhdGEuY3JlYXRlZEF0LFxyXG5cdFx0XHRcdFx0Ly8gS2VlcCBsZWdhY3kgZmllbGRzIGZvciByZWZlcmVuY2VcclxuXHRcdFx0XHRcdGxlZ2FjeVN0YXJ0VGltZTogdGltZXJEYXRhLnN0YXJ0VGltZSxcclxuXHRcdFx0XHRcdGxlZ2FjeVBhdXNlZFRpbWU6IHRpbWVyRGF0YS5wYXVzZWRUaW1lLFxyXG5cdFx0XHRcdFx0bGVnYWN5VG90YWxQYXVzZWREdXJhdGlvbjogdGltZXJEYXRhLnRvdGFsUGF1c2VkRHVyYXRpb24gfHwgMFxyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdGxvY2FsU3RvcmFnZS5zZXRJdGVtKHRpbWVyRGF0YS50YXNrSWQsIEpTT04uc3RyaW5naWZ5KHJlc3RvcmVkVGltZXIpKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRXJyb3IgcmVzdG9yaW5nIGZyb20gYmFja3VwOlwiLCBlcnJvcik7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBleHBvcnQgc3RhdGlzdGljc1xyXG5cdCAqIEByZXR1cm5zIFN0YXRpc3RpY3MgYWJvdXQgZXhwb3J0YWJsZSBkYXRhXHJcblx0ICovXHJcblx0Z2V0RXhwb3J0U3RhdHMoKToge1xyXG5cdFx0YWN0aXZlVGltZXJzOiBudW1iZXI7XHJcblx0XHR0b3RhbER1cmF0aW9uOiBudW1iZXI7XHJcblx0XHRvbGRlc3RUaW1lcjogc3RyaW5nIHwgbnVsbDtcclxuXHRcdG5ld2VzdFRpbWVyOiBzdHJpbmcgfCBudWxsO1xyXG5cdH0ge1xyXG5cdFx0Y29uc3QgYWN0aXZlVGltZXJzID0gdGhpcy50aW1lck1hbmFnZXIuZ2V0QWxsQWN0aXZlVGltZXJzKCk7XHJcblx0XHRcclxuXHRcdGxldCB0b3RhbER1cmF0aW9uID0gMDtcclxuXHRcdGxldCBvbGRlc3RUaW1lID0gTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVI7XHJcblx0XHRsZXQgbmV3ZXN0VGltZSA9IDA7XHJcblx0XHRsZXQgb2xkZXN0VGltZXI6IHN0cmluZyB8IG51bGwgPSBudWxsO1xyXG5cdFx0bGV0IG5ld2VzdFRpbWVyOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcclxuXHJcblx0XHRmb3IgKGNvbnN0IHRpbWVyIG9mIGFjdGl2ZVRpbWVycykge1xyXG5cdFx0XHRjb25zdCBkdXJhdGlvbiA9IHRoaXMudGltZXJNYW5hZ2VyLmdldEN1cnJlbnREdXJhdGlvbih0aW1lci50YXNrSWQpO1xyXG5cdFx0XHR0b3RhbER1cmF0aW9uICs9IGR1cmF0aW9uO1xyXG5cclxuXHRcdFx0aWYgKHRpbWVyLmNyZWF0ZWRBdCA8IG9sZGVzdFRpbWUpIHtcclxuXHRcdFx0XHRvbGRlc3RUaW1lID0gdGltZXIuY3JlYXRlZEF0O1xyXG5cdFx0XHRcdG9sZGVzdFRpbWVyID0gbmV3IERhdGUodGltZXIuY3JlYXRlZEF0KS50b0xvY2FsZVN0cmluZygpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAodGltZXIuY3JlYXRlZEF0ID4gbmV3ZXN0VGltZSkge1xyXG5cdFx0XHRcdG5ld2VzdFRpbWUgPSB0aW1lci5jcmVhdGVkQXQ7XHJcblx0XHRcdFx0bmV3ZXN0VGltZXIgPSBuZXcgRGF0ZSh0aW1lci5jcmVhdGVkQXQpLnRvTG9jYWxlU3RyaW5nKCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRhY3RpdmVUaW1lcnM6IGFjdGl2ZVRpbWVycy5sZW5ndGgsXHJcblx0XHRcdHRvdGFsRHVyYXRpb24sXHJcblx0XHRcdG9sZGVzdFRpbWVyLFxyXG5cdFx0XHRuZXdlc3RUaW1lclxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFByZXBhcmUgZGF0YSBmb3IgZXhwb3J0XHJcblx0ICogQHBhcmFtIGluY2x1ZGVBY3RpdmUgV2hldGhlciB0byBpbmNsdWRlIGFjdGl2ZSB0aW1lcnNcclxuXHQgKiBAcmV0dXJucyBFeHBvcnQgZGF0YSBzdHJ1Y3R1cmVcclxuXHQgKi9cclxuXHRwcml2YXRlIHByZXBhcmVFeHBvcnREYXRhKGluY2x1ZGVBY3RpdmU6IGJvb2xlYW4pOiBUaW1lckV4cG9ydERhdGEge1xyXG5cdFx0Y29uc3QgYWN0aXZlVGltZXJzID0gdGhpcy50aW1lck1hbmFnZXIuZ2V0QWxsQWN0aXZlVGltZXJzKCk7XHJcblx0XHRjb25zdCBleHBvcnRUaW1lcnMgPSBbXTtcclxuXHJcblx0XHRmb3IgKGNvbnN0IHRpbWVyIG9mIGFjdGl2ZVRpbWVycykge1xyXG5cdFx0XHQvLyBTa2lwIGFjdGl2ZSB0aW1lcnMgaWYgbm90IHJlcXVlc3RlZFxyXG5cdFx0XHRpZiAoIWluY2x1ZGVBY3RpdmUgJiYgKHRpbWVyLnN0YXR1cyA9PT0gJ3J1bm5pbmcnIHx8IHRpbWVyLnN0YXR1cyA9PT0gJ3BhdXNlZCcpKSB7XHJcblx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IGN1cnJlbnREdXJhdGlvbiA9IHRoaXMudGltZXJNYW5hZ2VyLmdldEN1cnJlbnREdXJhdGlvbih0aW1lci50YXNrSWQpO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gR2V0IHRoZSBmaXJzdCBhbmQgbGFzdCBzZWdtZW50cyBmb3IgZXhwb3J0XHJcblx0XHRcdGNvbnN0IGZpcnN0U2VnbWVudCA9IHRpbWVyLnNlZ21lbnRzWzBdO1xyXG5cdFx0XHRjb25zdCBsYXN0U2VnbWVudCA9IHRpbWVyLnNlZ21lbnRzW3RpbWVyLnNlZ21lbnRzLmxlbmd0aCAtIDFdO1xyXG5cdFx0XHRcclxuXHRcdFx0ZXhwb3J0VGltZXJzLnB1c2goe1xyXG5cdFx0XHRcdHRhc2tJZDogdGltZXIudGFza0lkLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiB0aW1lci5maWxlUGF0aCxcclxuXHRcdFx0XHRibG9ja0lkOiB0aW1lci5ibG9ja0lkLFxyXG5cdFx0XHRcdHN0YXJ0VGltZTogZmlyc3RTZWdtZW50ID8gZmlyc3RTZWdtZW50LnN0YXJ0VGltZSA6IHRpbWVyLmNyZWF0ZWRBdCxcclxuXHRcdFx0XHRlbmRUaW1lOiBsYXN0U2VnbWVudCAmJiBsYXN0U2VnbWVudC5lbmRUaW1lID8gbGFzdFNlZ21lbnQuZW5kVGltZSA6IHVuZGVmaW5lZCxcclxuXHRcdFx0XHRkdXJhdGlvbjogY3VycmVudER1cmF0aW9uLFxyXG5cdFx0XHRcdHN0YXR1czogdGltZXIuc3RhdHVzLFxyXG5cdFx0XHRcdGNyZWF0ZWRBdDogdGltZXIuY3JlYXRlZEF0LFxyXG5cdFx0XHRcdHRvdGFsUGF1c2VkRHVyYXRpb246IHRpbWVyLmxlZ2FjeVRvdGFsUGF1c2VkRHVyYXRpb24gfHwgMFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHR2ZXJzaW9uOiB0aGlzLkVYUE9SVF9WRVJTSU9OLFxyXG5cdFx0XHRleHBvcnREYXRlOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcblx0XHRcdHRpbWVyczogZXhwb3J0VGltZXJzXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUHJvY2VzcyBpbXBvcnRlZCBkYXRhIGFuZCB2YWxpZGF0ZSBzdHJ1Y3R1cmVcclxuXHQgKiBAcGFyYW0gZGF0YSBJbXBvcnRlZCBkYXRhIHN0cnVjdHVyZVxyXG5cdCAqIEByZXR1cm5zIHRydWUgaWYgcHJvY2Vzc2luZyB3YXMgc3VjY2Vzc2Z1bFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgcHJvY2Vzc0ltcG9ydERhdGEoZGF0YTogVGltZXJFeHBvcnREYXRhKTogYm9vbGVhbiB7XHJcblx0XHRpZiAoIXRoaXMudmFsaWRhdGVJbXBvcnREYXRhKGRhdGEpKSB7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHRsZXQgaW1wb3J0ZWRDb3VudCA9IDA7XHJcblxyXG5cdFx0Zm9yIChjb25zdCB0aW1lckRhdGEgb2YgZGF0YS50aW1lcnMpIHtcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHQvLyBPbmx5IGltcG9ydCBjb21wbGV0ZWQgdGltZXJzIHRvIGF2b2lkIGNvbmZsaWN0c1xyXG5cdFx0XHRcdGlmICh0aW1lckRhdGEuc3RhdHVzID09PSAnaWRsZScgfHwgdGltZXJEYXRhLmVuZFRpbWUpIHtcclxuXHRcdFx0XHRcdC8vIFN0b3JlIGFzIGhpc3RvcmljYWwgZGF0YSAoY291bGQgYmUgZXh0ZW5kZWQgZm9yIGFuYWx5dGljcylcclxuXHRcdFx0XHRcdGNvbnN0IGhpc3RvcnlLZXkgPSBgdGFza1RpbWVyX2hpc3RvcnlfJHt0aW1lckRhdGEuYmxvY2tJZH1fJHt0aW1lckRhdGEuc3RhcnRUaW1lfWA7XHJcblx0XHRcdFx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbShoaXN0b3J5S2V5LCBKU09OLnN0cmluZ2lmeSh7XHJcblx0XHRcdFx0XHRcdC4uLnRpbWVyRGF0YSxcclxuXHRcdFx0XHRcdFx0aW1wb3J0ZWRBdDogRGF0ZS5ub3coKVxyXG5cdFx0XHRcdFx0fSkpO1xyXG5cdFx0XHRcdFx0aW1wb3J0ZWRDb3VudCsrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXCJGYWlsZWQgdG8gaW1wb3J0IHRpbWVyOlwiLCB0aW1lckRhdGEudGFza0lkLCBlcnJvcik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRjb25zb2xlLmxvZyhgU3VjY2Vzc2Z1bGx5IGltcG9ydGVkICR7aW1wb3J0ZWRDb3VudH0gdGltZXIgcmVjb3Jkc2ApO1xyXG5cdFx0cmV0dXJuIGltcG9ydGVkQ291bnQgPiAwO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVmFsaWRhdGUgaW1wb3J0ZWQgZGF0YSBzdHJ1Y3R1cmVcclxuXHQgKiBAcGFyYW0gZGF0YSBEYXRhIHRvIHZhbGlkYXRlXHJcblx0ICogQHJldHVybnMgdHJ1ZSBpZiBkYXRhIGlzIHZhbGlkXHJcblx0ICovXHJcblx0cHJpdmF0ZSB2YWxpZGF0ZUltcG9ydERhdGEoZGF0YTogYW55KTogZGF0YSBpcyBUaW1lckV4cG9ydERhdGEge1xyXG5cdFx0aWYgKCFkYXRhIHx8IHR5cGVvZiBkYXRhICE9PSAnb2JqZWN0Jykge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKCFkYXRhLnZlcnNpb24gfHwgIWRhdGEuZXhwb3J0RGF0ZSB8fCAhQXJyYXkuaXNBcnJheShkYXRhLnRpbWVycykpIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFZhbGlkYXRlIGVhY2ggdGltZXIgZW50cnlcclxuXHRcdGZvciAoY29uc3QgdGltZXIgb2YgZGF0YS50aW1lcnMpIHtcclxuXHRcdFx0aWYgKCF0aW1lci50YXNrSWQgfHwgIXRpbWVyLmZpbGVQYXRoIHx8ICF0aW1lci5ibG9ja0lkIHx8IFxyXG5cdFx0XHRcdHR5cGVvZiB0aW1lci5zdGFydFRpbWUgIT09ICdudW1iZXInIHx8IFxyXG5cdFx0XHRcdHR5cGVvZiB0aW1lci5kdXJhdGlvbiAhPT0gJ251bWJlcicpIHtcclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdHJ1ZTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENvbnZlcnQgb2JqZWN0IHRvIFlBTUwgZm9ybWF0IChzaW1wbGUgaW1wbGVtZW50YXRpb24pXHJcblx0ICogQHBhcmFtIG9iaiBPYmplY3QgdG8gY29udmVydFxyXG5cdCAqIEByZXR1cm5zIFlBTUwgc3RyaW5nXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjb252ZXJ0VG9ZQU1MKG9iajogYW55LCBpbmRlbnQ6IG51bWJlciA9IDApOiBzdHJpbmcge1xyXG5cdFx0Y29uc3Qgc3BhY2VzID0gJyAgJy5yZXBlYXQoaW5kZW50KTtcclxuXHRcdGxldCB5YW1sID0gJyc7XHJcblxyXG5cdFx0aWYgKEFycmF5LmlzQXJyYXkob2JqKSkge1xyXG5cdFx0XHRmb3IgKGNvbnN0IGl0ZW0gb2Ygb2JqKSB7XHJcblx0XHRcdFx0eWFtbCArPSBgJHtzcGFjZXN9LSAke3RoaXMuY29udmVydFRvWUFNTChpdGVtLCBpbmRlbnQgKyAxKS50cmltKCl9XFxuYDtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIGlmIChvYmogIT09IG51bGwgJiYgdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcpIHtcclxuXHRcdFx0Zm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMob2JqKSkge1xyXG5cdFx0XHRcdGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xyXG5cdFx0XHRcdFx0eWFtbCArPSBgJHtzcGFjZXN9JHtrZXl9OlxcbmA7XHJcblx0XHRcdFx0XHR5YW1sICs9IHRoaXMuY29udmVydFRvWUFNTCh2YWx1ZSwgaW5kZW50ICsgMSk7XHJcblx0XHRcdFx0fSBlbHNlIGlmICh2YWx1ZSAhPT0gbnVsbCAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XHJcblx0XHRcdFx0XHR5YW1sICs9IGAke3NwYWNlc30ke2tleX06XFxuYDtcclxuXHRcdFx0XHRcdHlhbWwgKz0gdGhpcy5jb252ZXJ0VG9ZQU1MKHZhbHVlLCBpbmRlbnQgKyAxKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0eWFtbCArPSBgJHtzcGFjZXN9JHtrZXl9OiAke3RoaXMueWFtbEVzY2FwZSh2YWx1ZSl9XFxuYDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHJldHVybiB0aGlzLnlhbWxFc2NhcGUob2JqKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4geWFtbDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFBhcnNlIFlBTUwgc3RyaW5nIHRvIG9iamVjdCAoc2ltcGxlIGltcGxlbWVudGF0aW9uKVxyXG5cdCAqIEBwYXJhbSB5YW1sU3RyaW5nIFlBTUwgc3RyaW5nIHRvIHBhcnNlXHJcblx0ICogQHJldHVybnMgUGFyc2VkIG9iamVjdFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgcGFyc2VZQU1MKHlhbWxTdHJpbmc6IHN0cmluZyk6IGFueSB7XHJcblx0XHQvLyBUaGlzIGlzIGEgdmVyeSBiYXNpYyBZQU1MIHBhcnNlciBmb3Igb3VyIHNwZWNpZmljIHVzZSBjYXNlXHJcblx0XHQvLyBGb3IgcHJvZHVjdGlvbiB1c2UsIGNvbnNpZGVyIHVzaW5nIGEgcHJvcGVyIFlBTUwgbGlicmFyeVxyXG5cdFx0Y29uc3QgbGluZXMgPSB5YW1sU3RyaW5nLnNwbGl0KCdcXG4nKTtcclxuXHRcdGNvbnN0IHJlc3VsdDogYW55ID0ge307XHJcblx0XHRsZXQgY3VycmVudE9iamVjdCA9IHJlc3VsdDtcclxuXHRcdGNvbnN0IG9iamVjdFN0YWNrOiBhbnlbXSA9IFtyZXN1bHRdO1xyXG5cdFx0bGV0IGN1cnJlbnRLZXkgPSAnJztcclxuXHJcblx0XHRmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcclxuXHRcdFx0Y29uc3QgdHJpbW1lZExpbmUgPSBsaW5lLnRyaW0oKTtcclxuXHRcdFx0aWYgKCF0cmltbWVkTGluZSB8fCB0cmltbWVkTGluZS5zdGFydHNXaXRoKCcjJykpIGNvbnRpbnVlO1xyXG5cclxuXHRcdFx0Y29uc3QgaW5kZW50ID0gbGluZS5sZW5ndGggLSBsaW5lLnRyaW1MZWZ0KCkubGVuZ3RoO1xyXG5cdFx0XHRjb25zdCBjb2xvbkluZGV4ID0gdHJpbW1lZExpbmUuaW5kZXhPZignOicpO1xyXG5cclxuXHRcdFx0aWYgKGNvbG9uSW5kZXggPiAwKSB7XHJcblx0XHRcdFx0Y29uc3Qga2V5ID0gdHJpbW1lZExpbmUuc3Vic3RyaW5nKDAsIGNvbG9uSW5kZXgpLnRyaW0oKTtcclxuXHRcdFx0XHRjb25zdCB2YWx1ZSA9IHRyaW1tZWRMaW5lLnN1YnN0cmluZyhjb2xvbkluZGV4ICsgMSkudHJpbSgpO1xyXG5cclxuXHRcdFx0XHRpZiAodmFsdWUgPT09ICcnKSB7XHJcblx0XHRcdFx0XHQvLyBUaGlzIGlzIGEgcGFyZW50IGtleVxyXG5cdFx0XHRcdFx0Y3VycmVudE9iamVjdFtrZXldID0ge307XHJcblx0XHRcdFx0XHRjdXJyZW50S2V5ID0ga2V5O1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAodmFsdWUgPT09ICdbXScpIHtcclxuXHRcdFx0XHRcdGN1cnJlbnRPYmplY3Rba2V5XSA9IFtdO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHQvLyBUaGlzIGlzIGEga2V5LXZhbHVlIHBhaXJcclxuXHRcdFx0XHRcdGN1cnJlbnRPYmplY3Rba2V5XSA9IHRoaXMucGFyc2VZQU1MVmFsdWUodmFsdWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIGlmICh0cmltbWVkTGluZS5zdGFydHNXaXRoKCctICcpKSB7XHJcblx0XHRcdFx0Ly8gVGhpcyBpcyBhbiBhcnJheSBpdGVtXHJcblx0XHRcdFx0aWYgKCFBcnJheS5pc0FycmF5KGN1cnJlbnRPYmplY3RbY3VycmVudEtleV0pKSB7XHJcblx0XHRcdFx0XHRjdXJyZW50T2JqZWN0W2N1cnJlbnRLZXldID0gW107XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGNvbnN0IGl0ZW0gPSB0aGlzLnBhcnNlWUFNTFZhbHVlKHRyaW1tZWRMaW5lLnN1YnN0cmluZygyKSk7XHJcblx0XHRcdFx0Y3VycmVudE9iamVjdFtjdXJyZW50S2V5XS5wdXNoKGl0ZW0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHJlc3VsdDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFBhcnNlIGluZGl2aWR1YWwgWUFNTCB2YWx1ZVxyXG5cdCAqIEBwYXJhbSB2YWx1ZSBTdHJpbmcgdmFsdWUgdG8gcGFyc2VcclxuXHQgKiBAcmV0dXJucyBQYXJzZWQgdmFsdWVcclxuXHQgKi9cclxuXHRwcml2YXRlIHBhcnNlWUFNTFZhbHVlKHZhbHVlOiBzdHJpbmcpOiBhbnkge1xyXG5cdFx0dmFsdWUgPSB2YWx1ZS50cmltKCk7XHJcblx0XHRcclxuXHRcdGlmICh2YWx1ZSA9PT0gJ3RydWUnKSByZXR1cm4gdHJ1ZTtcclxuXHRcdGlmICh2YWx1ZSA9PT0gJ2ZhbHNlJykgcmV0dXJuIGZhbHNlO1xyXG5cdFx0aWYgKHZhbHVlID09PSAnbnVsbCcpIHJldHVybiBudWxsO1xyXG5cdFx0XHJcblx0XHQvLyBUcnkgdG8gcGFyc2UgYXMgbnVtYmVyXHJcblx0XHRjb25zdCBudW1WYWx1ZSA9IE51bWJlcih2YWx1ZSk7XHJcblx0XHRpZiAoIWlzTmFOKG51bVZhbHVlKSAmJiBpc0Zpbml0ZShudW1WYWx1ZSkpIHtcclxuXHRcdFx0cmV0dXJuIG51bVZhbHVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlbW92ZSBxdW90ZXMgaWYgcHJlc2VudFxyXG5cdFx0aWYgKCh2YWx1ZS5zdGFydHNXaXRoKCdcIicpICYmIHZhbHVlLmVuZHNXaXRoKCdcIicpKSB8fFxyXG5cdFx0XHQodmFsdWUuc3RhcnRzV2l0aChcIidcIikgJiYgdmFsdWUuZW5kc1dpdGgoXCInXCIpKSkge1xyXG5cdFx0XHRyZXR1cm4gdmFsdWUuc2xpY2UoMSwgLTEpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB2YWx1ZTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEVzY2FwZSB2YWx1ZSBmb3IgWUFNTCBvdXRwdXRcclxuXHQgKiBAcGFyYW0gdmFsdWUgVmFsdWUgdG8gZXNjYXBlXHJcblx0ICogQHJldHVybnMgRXNjYXBlZCBzdHJpbmdcclxuXHQgKi9cclxuXHRwcml2YXRlIHlhbWxFc2NhcGUodmFsdWU6IGFueSk6IHN0cmluZyB7XHJcblx0XHRpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xyXG5cdFx0XHQvLyBRdW90ZSBzdHJpbmdzIHRoYXQgY29udGFpbiBzcGVjaWFsIGNoYXJhY3RlcnNcclxuXHRcdFx0aWYgKHZhbHVlLmluY2x1ZGVzKCc6JykgfHwgdmFsdWUuaW5jbHVkZXMoJ1xcbicpIHx8IHZhbHVlLmluY2x1ZGVzKCcjJykpIHtcclxuXHRcdFx0XHRyZXR1cm4gYFwiJHt2YWx1ZS5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJyl9XCJgO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gU3RyaW5nKHZhbHVlKTtcclxuXHR9XHJcbn0iXX0=