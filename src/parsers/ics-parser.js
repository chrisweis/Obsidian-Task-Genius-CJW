/**
 * ICS (iCalendar) Parser
 * Parses iCalendar format data into structured events
 */
export class IcsParser {
    /**
     * Parse ICS content string into events
     * Includes caching mechanism for improved performance
     */
    static parse(content, source) {
        // Create cache key based on content hash and source id
        const cacheKey = this.createCacheKey(content, source.id);
        // Check cache first
        const cached = this.parseCache.get(cacheKey);
        if (cached) {
            // Return deep copy to prevent mutation of cached data
            return {
                events: cached.events.map(event => (Object.assign(Object.assign({}, event), { source }))),
                errors: [...cached.errors],
                metadata: Object.assign({}, cached.metadata)
            };
        }
        const result = {
            events: [],
            errors: [],
            metadata: {},
        };
        try {
            const lines = this.unfoldLines(content.split(/\r?\n/));
            let currentEvent = null;
            let inCalendar = false;
            let lineNumber = 0;
            for (const line of lines) {
                lineNumber++;
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.startsWith("#")) {
                    continue; // Skip empty lines and comments
                }
                try {
                    const [property, value] = this.parseLine(trimmedLine);
                    switch (property) {
                        case "BEGIN":
                            if (value === "VCALENDAR") {
                                inCalendar = true;
                            }
                            else if (value === "VEVENT" && inCalendar) {
                                currentEvent = { source };
                            }
                            break;
                        case "END":
                            if (value === "VEVENT" && currentEvent) {
                                const event = this.finalizeEvent(currentEvent);
                                if (event) {
                                    result.events.push(event);
                                }
                                currentEvent = null;
                            }
                            else if (value === "VCALENDAR") {
                                inCalendar = false;
                            }
                            break;
                        case "VERSION":
                            if (inCalendar && !currentEvent) {
                                result.metadata.version = value;
                            }
                            break;
                        case "PRODID":
                            if (inCalendar && !currentEvent) {
                                result.metadata.prodid = value;
                            }
                            break;
                        case "CALSCALE":
                            if (inCalendar && !currentEvent) {
                                // Usually GREGORIAN, can be ignored for most purposes
                            }
                            break;
                        case "X-WR-CALNAME":
                            if (inCalendar && !currentEvent) {
                                result.metadata.calendarName = value;
                            }
                            break;
                        case "X-WR-CALDESC":
                            if (inCalendar && !currentEvent) {
                                result.metadata.description = value;
                            }
                            break;
                        case "X-WR-TIMEZONE":
                            if (inCalendar && !currentEvent) {
                                result.metadata.timezone = value;
                            }
                            break;
                        default:
                            if (currentEvent) {
                                this.parseEventProperty(currentEvent, property, value, trimmedLine);
                            }
                            break;
                    }
                }
                catch (error) {
                    result.errors.push({
                        line: lineNumber,
                        message: `Error parsing line: ${error.message}`,
                        context: trimmedLine,
                    });
                }
            }
        }
        catch (error) {
            result.errors.push({
                message: `Fatal parsing error: ${error.message}`,
            });
        }
        // Cache the result before returning
        this.cacheResult(cacheKey, result);
        return result;
    }
    /**
     * Create cache key from content and source id
     */
    static createCacheKey(content, sourceId) {
        // Simple hash function for cache key
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return `${sourceId}-${hash}`;
    }
    /**
     * Cache parsing result with size limit
     */
    static cacheResult(key, result) {
        // Implement LRU-like behavior by clearing cache when it gets too large
        if (this.parseCache.size >= this.MAX_CACHE_SIZE) {
            // Clear oldest entries (simple approach - clear half the cache)
            const entries = Array.from(this.parseCache.entries());
            const keepCount = Math.floor(this.MAX_CACHE_SIZE / 2);
            this.parseCache.clear();
            // Keep the most recent entries
            for (let i = entries.length - keepCount; i < entries.length; i++) {
                this.parseCache.set(entries[i][0], entries[i][1]);
            }
        }
        // Store a copy to prevent external mutations
        this.parseCache.set(key, {
            events: result.events.map(event => (Object.assign({}, event))),
            errors: [...result.errors],
            metadata: Object.assign({}, result.metadata)
        });
    }
    /**
     * Unfold lines according to RFC 5545
     * Lines can be folded by inserting CRLF followed by a space or tab
     * Optimized version using array join instead of string concatenation
     */
    static unfoldLines(lines) {
        const unfolded = [];
        const currentLineParts = [];
        let hasCurrentLine = false;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const firstChar = line.charCodeAt(0);
            // Check for space (32) or tab (9) at the beginning
            if (firstChar === 32 || firstChar === 9) {
                // This is a continuation of the previous line
                if (hasCurrentLine) {
                    currentLineParts.push(' '); // Add space between folded parts
                    currentLineParts.push(line.slice(1));
                }
            }
            else {
                // This is a new line
                if (hasCurrentLine) {
                    unfolded.push(currentLineParts.join(''));
                    currentLineParts.length = 0; // Clear array efficiently
                }
                currentLineParts.push(line);
                hasCurrentLine = true;
            }
        }
        if (hasCurrentLine) {
            unfolded.push(currentLineParts.join(''));
        }
        return unfolded;
    }
    /**
     * Parse a single line into property and value
     * Optimized version with reduced string operations
     */
    static parseLine(line) {
        const colonIndex = line.indexOf(":");
        if (colonIndex === -1) {
            throw new Error("Invalid line format: missing colon");
        }
        // Extract property name (before any parameters) and value in one pass
        const semicolonIndex = line.indexOf(";");
        let property;
        if (semicolonIndex !== -1 && semicolonIndex < colonIndex) {
            // Property has parameters
            property = line.slice(0, semicolonIndex).toUpperCase();
        }
        else {
            // No parameters
            property = line.slice(0, colonIndex).toUpperCase();
        }
        const value = line.slice(colonIndex + 1);
        return [property, value];
    }
    /**
     * Parse event-specific properties
     * Optimized version using property handler map for faster lookup
     */
    static parseEventProperty(event, property, value, fullLine) {
        // Use property handler map for faster lookup
        const handler = this.PROPERTY_HANDLERS.get(property);
        if (handler) {
            handler(event, value, fullLine);
        }
        else if (property.charCodeAt(0) === 88 && property.charCodeAt(1) === 45) { // "X-"
            // Store custom properties (X- prefix check optimized)
            if (!event.customProperties) {
                event.customProperties = {};
            }
            event.customProperties[property] = value;
        }
    }
    /**
     * Parse date/time values
     * Optimized version with reduced string operations and better parsing
     */
    static parseDateTime(value, fullLine) {
        // Check if it's an all-day event (VALUE=DATE parameter)
        const isAllDay = fullLine.indexOf("VALUE=DATE") !== -1;
        // Extract actual date/time string, handling timezone info efficiently
        let dateStr = value;
        const tzidIndex = dateStr.indexOf("TZID=");
        if (tzidIndex !== -1) {
            // Extract the actual date/time part after timezone
            const colonIndex = dateStr.lastIndexOf(":");
            if (colonIndex !== -1) {
                dateStr = dateStr.slice(colonIndex + 1);
            }
        }
        // Handle UTC times (ending with Z)
        const isUtc = dateStr.charCodeAt(dateStr.length - 1) === 90; // 'Z'
        if (isUtc) {
            dateStr = dateStr.slice(0, -1);
        }
        // Parse date components using more efficient approach
        const dateStrLen = dateStr.length;
        let date;
        if (isAllDay || dateStrLen === 8) {
            // All-day event or date-only format: YYYYMMDD
            // Use direct character code parsing for better performance
            const year = this.parseIntFromString(dateStr, 0, 4);
            const month = this.parseIntFromString(dateStr, 4, 2) - 1; // Month is 0-based
            const day = this.parseIntFromString(dateStr, 6, 2);
            date = new Date(year, month, day);
        }
        else {
            // Date-time format: YYYYMMDDTHHMMSS
            const year = this.parseIntFromString(dateStr, 0, 4);
            const month = this.parseIntFromString(dateStr, 4, 2) - 1;
            const day = this.parseIntFromString(dateStr, 6, 2);
            const hour = this.parseIntFromString(dateStr, 9, 2);
            const minute = this.parseIntFromString(dateStr, 11, 2);
            const second = dateStrLen >= 15 ? this.parseIntFromString(dateStr, 13, 2) : 0;
            if (isUtc) {
                date = new Date(Date.UTC(year, month, day, hour, minute, second));
            }
            else {
                date = new Date(year, month, day, hour, minute, second);
            }
        }
        return { date, allDay: isAllDay };
    }
    /**
     * Parse integer from string slice without creating substring
     * More efficient than parseInt(str.substring(...))
     */
    static parseIntFromString(str, start, length) {
        let result = 0;
        const end = start + length;
        for (let i = start; i < end && i < str.length; i++) {
            const digit = str.charCodeAt(i) - 48; // '0' is 48
            if (digit >= 0 && digit <= 9) {
                result = result * 10 + digit;
            }
        }
        return result;
    }
    /**
     * Parse organizer information
     * Optimized version using pre-compiled regex and efficient string operations
     */
    static parseOrganizer(value, fullLine) {
        const organizer = {};
        // Extract email from MAILTO: prefix (optimized check)
        if (value.charCodeAt(0) === 77 && value.startsWith("MAILTO:")) { // 'M'
            organizer.email = value.slice(7);
        }
        // Extract name from CN parameter using pre-compiled regex
        const cnMatch = fullLine.match(this.CN_REGEX);
        if (cnMatch) {
            organizer.name = this.unescapeText(cnMatch[1]);
        }
        return organizer;
    }
    /**
     * Parse attendee information
     * Optimized version using pre-compiled regex and efficient string operations
     */
    static parseAttendee(value, fullLine) {
        const attendee = {};
        // Extract email from MAILTO: prefix (optimized check)
        if (value.charCodeAt(0) === 77 && value.startsWith("MAILTO:")) { // 'M'
            attendee.email = value.slice(7);
        }
        // Extract name from CN parameter using pre-compiled regex
        const cnMatch = fullLine.match(this.CN_REGEX);
        if (cnMatch) {
            attendee.name = this.unescapeText(cnMatch[1]);
        }
        // Extract role from ROLE parameter using pre-compiled regex
        const roleMatch = fullLine.match(this.ROLE_REGEX);
        if (roleMatch) {
            attendee.role = roleMatch[1];
        }
        // Extract status from PARTSTAT parameter using pre-compiled regex
        const statusMatch = fullLine.match(this.PARTSTAT_REGEX);
        if (statusMatch) {
            attendee.status = statusMatch[1];
        }
        return attendee;
    }
    /**
     * Unescape text according to RFC 5545
     * Optimized version that only processes if escape sequences are found
     */
    static unescapeText(text) {
        // Quick check if text contains escape sequences
        if (text.indexOf('\\') === -1) {
            return text;
        }
        // Only perform replacements if escape sequences are present
        return text
            .replace(/\\n/g, "\n")
            .replace(/\\,/g, ",")
            .replace(/\\;/g, ";")
            .replace(/\\\\/g, "\\");
    }
    /**
     * Clear parsing cache to free memory
     */
    static clearCache() {
        this.parseCache.clear();
    }
    /**
     * Get cache statistics for monitoring
     */
    static getCacheStats() {
        return {
            size: this.parseCache.size,
            maxSize: this.MAX_CACHE_SIZE
        };
    }
    /**
     * Finalize and validate event
     */
    static finalizeEvent(event) {
        var _a;
        // Required fields validation
        if (!event.uid || !event.summary || !event.dtstart) {
            return null;
        }
        // Set default values
        const finalEvent = {
            uid: event.uid,
            summary: event.summary,
            dtstart: event.dtstart,
            allDay: (_a = event.allDay) !== null && _a !== void 0 ? _a : false,
            source: event.source,
            description: event.description,
            dtend: event.dtend,
            location: event.location,
            categories: event.categories,
            status: event.status,
            rrule: event.rrule,
            exdate: event.exdate,
            created: event.created,
            lastModified: event.lastModified,
            priority: event.priority,
            transp: event.transp,
            organizer: event.organizer,
            attendees: event.attendees,
            customProperties: event.customProperties,
        };
        return finalEvent;
    }
}
// Pre-compiled regular expressions for better performance
IcsParser.CN_REGEX = /CN=([^;:]+)/;
IcsParser.ROLE_REGEX = /ROLE=([^;:]+)/;
IcsParser.PARTSTAT_REGEX = /PARTSTAT=([^;:]+)/;
// Cache for parsed content to avoid re-parsing identical content
IcsParser.parseCache = new Map();
IcsParser.MAX_CACHE_SIZE = 50; // Limit cache size to prevent memory leaks
// Property handler map for faster lookup
IcsParser.PROPERTY_HANDLERS = new Map([
    ['UID', (event, value) => { event.uid = value; }],
    ['SUMMARY', (event, value) => { event.summary = IcsParser.unescapeText(value); }],
    ['DESCRIPTION', (event, value) => { event.description = IcsParser.unescapeText(value); }],
    ['LOCATION', (event, value) => { event.location = IcsParser.unescapeText(value); }],
    ['STATUS', (event, value) => { event.status = value.toUpperCase(); }],
    ['PRIORITY', (event, value) => {
            const priority = parseInt(value, 10);
            if (!isNaN(priority))
                event.priority = priority;
        }],
    ['TRANSP', (event, value) => { event.transp = value.toUpperCase(); }],
    ['RRULE', (event, value) => { event.rrule = value; }],
    ['DTSTART', (event, value, fullLine) => {
            const result = IcsParser.parseDateTime(value, fullLine);
            event.dtstart = result.date;
            if (result.allDay !== undefined)
                event.allDay = result.allDay;
        }],
    ['DTEND', (event, value, fullLine) => {
            event.dtend = IcsParser.parseDateTime(value, fullLine).date;
        }],
    ['CREATED', (event, value, fullLine) => {
            event.created = IcsParser.parseDateTime(value, fullLine).date;
        }],
    ['LAST-MODIFIED', (event, value, fullLine) => {
            event.lastModified = IcsParser.parseDateTime(value, fullLine).date;
        }],
    ['CATEGORIES', (event, value) => {
            event.categories = value.split(",").map(cat => cat.trim());
        }],
    ['EXDATE', (event, value, fullLine) => {
            if (!event.exdate)
                event.exdate = [];
            const exdates = value.split(",");
            for (const exdate of exdates) {
                const date = IcsParser.parseDateTime(exdate.trim(), fullLine).date;
                event.exdate.push(date);
            }
        }],
    ['ORGANIZER', (event, value, fullLine) => {
            event.organizer = IcsParser.parseOrganizer(value, fullLine);
        }],
    ['ATTENDEE', (event, value, fullLine) => {
            if (!event.attendees)
                event.attendees = [];
            event.attendees.push(IcsParser.parseAttendee(value, fullLine));
        }]
]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNzLXBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImljcy1wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztHQUdHO0FBSUgsTUFBTSxPQUFPLFNBQVM7SUF3RHJCOzs7T0FHRztJQUNILE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBZSxFQUFFLE1BQWlCO1FBQzlDLHVEQUF1RDtRQUN2RCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFekQsb0JBQW9CO1FBQ3BCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzdDLElBQUksTUFBTSxFQUFFO1lBQ1gsc0RBQXNEO1lBQ3RELE9BQU87Z0JBQ04sTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsaUNBQU0sS0FBSyxLQUFFLE1BQU0sSUFBRyxDQUFDO2dCQUMxRCxNQUFNLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7Z0JBQzFCLFFBQVEsb0JBQU8sTUFBTSxDQUFDLFFBQVEsQ0FBRTthQUNoQyxDQUFDO1NBQ0Y7UUFDRCxNQUFNLE1BQU0sR0FBbUI7WUFDOUIsTUFBTSxFQUFFLEVBQUU7WUFDVixNQUFNLEVBQUUsRUFBRTtZQUNWLFFBQVEsRUFBRSxFQUFFO1NBQ1osQ0FBQztRQUVGLElBQUk7WUFDSCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUN2RCxJQUFJLFlBQVksR0FBNkIsSUFBSSxDQUFDO1lBQ2xELElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQztZQUN2QixJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUM7WUFFbkIsS0FBSyxNQUFNLElBQUksSUFB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QUssRUFBRSxRQUFRLEVBQUUsRUFBRTtZQUNyQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU07Z0JBQUUsS0FBSyxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7WUFDckMsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNqQyxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRTtnQkFDN0IsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUNuRSxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUN4QjtRQUNGLENBQUMsQ0FBQztJQUNGLENBQUMsV0FBVyxFQUFFLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsRUFBRTtZQUN4QyxLQUFLLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzdELENBQUMsQ0FBQztJQUNGLENBQUMsVUFBVSxFQUFFLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsRUFBRTtZQUN2QyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVM7Z0JBQUUsS0FBSyxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7WUFDM0MsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUNoRSxDQUFDLENBQUM7Q0FDRixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogSUNTIChpQ2FsZW5kYXIpIFBhcnNlclxyXG4gKiBQYXJzZXMgaUNhbGVuZGFyIGZvcm1hdCBkYXRhIGludG8gc3RydWN0dXJlZCBldmVudHNcclxuICovXHJcblxyXG5pbXBvcnQgeyBJY3NFdmVudCwgSWNzUGFyc2VSZXN1bHQsIEljc1NvdXJjZSB9IGZyb20gXCIuLi90eXBlcy9pY3NcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBJY3NQYXJzZXIge1xyXG5cdC8vIFByZS1jb21waWxlZCByZWd1bGFyIGV4cHJlc3Npb25zIGZvciBiZXR0ZXIgcGVyZm9ybWFuY2VcclxuXHRwcml2YXRlIHN0YXRpYyByZWFkb25seSBDTl9SRUdFWCA9IC9DTj0oW147Ol0rKS87XHJcblx0cHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgUk9MRV9SRUdFWCA9IC9ST0xFPShbXjs6XSspLztcclxuXHRwcml2YXRlIHN0YXRpYyByZWFkb25seSBQQVJUU1RBVF9SRUdFWCA9IC9QQVJUU1RBVD0oW147Ol0rKS87XHJcblxyXG5cdC8vIENhY2hlIGZvciBwYXJzZWQgY29udGVudCB0byBhdm9pZCByZS1wYXJzaW5nIGlkZW50aWNhbCBjb250ZW50XHJcblx0cHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgcGFyc2VDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBJY3NQYXJzZVJlc3VsdD4oKTtcclxuXHRwcml2YXRlIHN0YXRpYyByZWFkb25seSBNQVhfQ0FDSEVfU0laRSA9IDUwOyAvLyBMaW1pdCBjYWNoZSBzaXplIHRvIHByZXZlbnQgbWVtb3J5IGxlYWtzXHJcblxyXG5cdC8vIFByb3BlcnR5IGhhbmRsZXIgbWFwIGZvciBmYXN0ZXIgbG9va3VwXHJcblx0cHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgUFJPUEVSVFlfSEFORExFUlMgPSBuZXcgTWFwPHN0cmluZywgKGV2ZW50OiBQYXJ0aWFsPEljc0V2ZW50PiwgdmFsdWU6IHN0cmluZywgZnVsbExpbmU6IHN0cmluZykgPT4gdm9pZD4oW1xyXG5cdFx0WydVSUQnLCAoZXZlbnQsIHZhbHVlKSA9PiB7IGV2ZW50LnVpZCA9IHZhbHVlOyB9XSxcclxuXHRcdFsnU1VNTUFSWScsIChldmVudCwgdmFsdWUpID0+IHsgZXZlbnQuc3VtbWFyeSA9IEljc1BhcnNlci51bmVzY2FwZVRleHQodmFsdWUpOyB9XSxcclxuXHRcdFsnREVTQ1JJUFRJT04nLCAoZXZlbnQsIHZhbHVlKSA9PiB7IGV2ZW50LmRlc2NyaXB0aW9uID0gSWNzUGFyc2VyLnVuZXNjYXBlVGV4dCh2YWx1ZSk7IH1dLFxyXG5cdFx0WydMT0NBVElPTicsIChldmVudCwgdmFsdWUpID0+IHsgZXZlbnQubG9jYXRpb24gPSBJY3NQYXJzZXIudW5lc2NhcGVUZXh0KHZhbHVlKTsgfV0sXHJcblx0XHRbJ1NUQVRVUycsIChldmVudCwgdmFsdWUpID0+IHsgZXZlbnQuc3RhdHVzID0gdmFsdWUudG9VcHBlckNhc2UoKTsgfV0sXHJcblx0XHRbJ1BSSU9SSVRZJywgKGV2ZW50LCB2YWx1ZSkgPT4ge1xyXG5cdFx0XHRjb25zdCBwcmlvcml0eSA9IHBhcnNlSW50KHZhbHVlLCAxMCk7XHJcblx0XHRcdGlmICghaXNOYU4ocHJpb3JpdHkpKSBldmVudC5wcmlvcml0eSA9IHByaW9yaXR5O1xyXG5cdFx0fV0sXHJcblx0XHRbJ1RSQU5TUCcsIChldmVudCwgdmFsdWUpID0+IHsgZXZlbnQudHJhbnNwID0gdmFsdWUudG9VcHBlckNhc2UoKTsgfV0sXHJcblx0XHRbJ1JSVUxFJywgKGV2ZW50LCB2YWx1ZSkgPT4geyBldmVudC5ycnVsZSA9IHZhbHVlOyB9XSxcclxuXHRcdFsnRFRTVEFSVCcsIChldmVudCwgdmFsdWUsIGZ1bGxMaW5lKSA9PiB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IEljc1BhcnNlci5wYXJzZURhdGVUaW1lKHZhbHVlLCBmdWxsTGluZSk7XHJcblx0XHRcdGV2ZW50LmR0c3RhcnQgPSByZXN1bHQuZGF0ZTtcclxuXHRcdFx0aWYgKHJlc3VsdC5hbGxEYXkgIT09IHVuZGVmaW5lZCkgZXZlbnQuYWxsRGF5ID0gcmVzdWx0LmFsbERheTtcclxuXHRcdH1dLFxyXG5cdFx0WydEVEVORCcsIChldmVudCwgdmFsdWUsIGZ1bGxMaW5lKSA9PiB7XHJcblx0XHRcdGV2ZW50LmR0ZW5kID0gSWNzUGFyc2VyLnBhcnNlRGF0ZVRpbWUodmFsdWUsIGZ1bGxMaW5lKS5kYXRlO1xyXG5cdFx0fV0sXHJcblx0XHRbJ0NSRUFURUQnLCAoZXZlbnQsIHZhbHVlLCBmdWxsTGluZSkgPT4ge1xyXG5cdFx0XHRldmVudC5jcmVhdGVkID0gSWNzUGFyc2VyLnBhcnNlRGF0ZVRpbWUodmFsdWUsIGZ1bGxMaW5lKS5kYXRlO1xyXG5cdFx0fV0sXHJcblx0XHRbJ0xBU1QtTU9ESUZJRUQnLCAoZXZlbnQsIHZhbHVlLCBmdWxsTGluZSkgPT4ge1xyXG5cdFx0XHRldmVudC5sYXN0TW9kaWZpZWQgPSBJY3NQYXJzZXIucGFyc2VEYXRlVGltZSh2YWx1ZSwgZnVsbExpbmUpLmRhdGU7XHJcblx0XHR9XSxcclxuXHRcdFsnQ0FURUdPUklFUycsIChldmVudCwgdmFsdWUpID0+IHtcclxuXHRcdFx0ZXZlbnQuY2F0ZWdvcmllcyA9IHZhbHVlLnNwbGl0KFwiLFwiKS5tYXAoY2F0ID0+IGNhdC50cmltKCkpO1xyXG5cdFx0fV0sXHJcblx0XHRbJ0VYREFURScsIChldmVudCwgdmFsdWUsIGZ1bGxMaW5lKSA9PiB7XHJcblx0XHRcdGlmICghZXZlbnQuZXhkYXRlKSBldmVudC5leGRhdGUgPSBbXTtcclxuXHRcdFx0Y29uc3QgZXhkYXRlcyA9IHZhbHVlLnNwbGl0KFwiLFwiKTtcclxuXHRcdFx0Zm9yIChjb25zdCBleGRhdGUgb2YgZXhkYXRlcykge1xyXG5cdFx0XHRcdGNvbnN0IGRhdGUgPSBJY3NQYXJzZXIucGFyc2VEYXRlVGltZShleGRhdGUudHJpbSgpLCBmdWxsTGluZSkuZGF0ZTtcclxuXHRcdFx0XHRldmVudC5leGRhdGUucHVzaChkYXRlKTtcclxuXHRcdFx0fVxyXG5cdFx0fV0sXHJcblx0XHRbJ09SR0FOSVpFUicsIChldmVudCwgdmFsdWUsIGZ1bGxMaW5lKSA9PiB7XHJcblx0XHRcdGV2ZW50Lm9yZ2FuaXplciA9IEljc1BhcnNlci5wYXJzZU9yZ2FuaXplcih2YWx1ZSwgZnVsbExpbmUpO1xyXG5cdFx0fV0sXHJcblx0XHRbJ0FUVEVOREVFJywgKGV2ZW50LCB2YWx1ZSwgZnVsbExpbmUpID0+IHtcclxuXHRcdFx0aWYgKCFldmVudC5hdHRlbmRlZXMpIGV2ZW50LmF0dGVuZGVlcyA9IFtdO1xyXG5cdFx0XHRldmVudC5hdHRlbmRlZXMucHVzaChJY3NQYXJzZXIucGFyc2VBdHRlbmRlZSh2YWx1ZSwgZnVsbExpbmUpKTtcclxuXHRcdH1dXHJcblx0XSk7XHJcblx0LyoqXHJcblx0ICogUGFyc2UgSUNTIGNvbnRlbnQgc3RyaW5nIGludG8gZXZlbnRzXHJcblx0ICogSW5jbHVkZXMgY2FjaGluZyBtZWNoYW5pc20gZm9yIGltcHJvdmVkIHBlcmZvcm1hbmNlXHJcblx0ICovXHJcblx0c3RhdGljIHBhcnNlKGNvbnRlbnQ6IHN0cmluZywgc291cmNlOiBJY3NTb3VyY2UpOiBJY3NQYXJzZVJlc3VsdCB7XHJcblx0XHQvLyBDcmVhdGUgY2FjaGUga2V5IGJhc2VkIG9uIGNvbnRlbnQgaGFzaCBhbmQgc291cmNlIGlkXHJcblx0XHRjb25zdCBjYWNoZUtleSA9IHRoaXMuY3JlYXRlQ2FjaGVLZXkoY29udGVudCwgc291cmNlLmlkKTtcclxuXHJcblx0XHQvLyBDaGVjayBjYWNoZSBmaXJzdFxyXG5cdFx0Y29uc3QgY2FjaGVkID0gdGhpcy5wYXJzZUNhY2hlLmdldChjYWNoZUtleSk7XHJcblx0XHRpZiAoY2FjaGVkKSB7XHJcblx0XHRcdC8vIFJldHVybiBkZWVwIGNvcHkgdG8gcHJldmVudCBtdXRhdGlvbiBvZiBjYWNoZWQgZGF0YVxyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdGV2ZW50czogY2FjaGVkLmV2ZW50cy5tYXAoZXZlbnQgPT4gKHsgLi4uZXZlbnQsIHNvdXJjZSB9KSksXHJcblx0XHRcdFx0ZXJyb3JzOiBbLi4uY2FjaGVkLmVycm9yc10sXHJcblx0XHRcdFx0bWV0YWRhdGE6IHsgLi4uY2FjaGVkLm1ldGFkYXRhIH1cclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHRcdGNvbnN0IHJlc3VsdDogSWNzUGFyc2VSZXN1bHQgPSB7XHJcblx0XHRcdGV2ZW50czogW10sXHJcblx0XHRcdGVycm9yczogW10sXHJcblx0XHRcdG1ldGFkYXRhOiB7fSxcclxuXHRcdH07XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgbGluZXMgPSB0aGlzLnVuZm9sZExpbmVzKGNvbnRlbnQuc3BsaXQoL1xccj9cXG4vKSk7XHJcblx0XHRcdGxldCBjdXJyZW50RXZlbnQ6IFBhcnRpYWw8SWNzRXZlbnQ+IHwgbnVsbCA9IG51bGw7XHJcblx0XHRcdGxldCBpbkNhbGVuZGFyID0gZmFsc2U7XHJcblx0XHRcdGxldCBsaW5lTnVtYmVyID0gMDtcclxuXHJcblx0XHRcdGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xyXG5cdFx0XHRcdGxpbmVOdW1iZXIrKztcclxuXHRcdFx0XHRjb25zdCB0cmltbWVkTGluZSA9IGxpbmUudHJpbSgpO1xyXG5cclxuXHRcdFx0XHRpZiAoIXRyaW1tZWRMaW5lIHx8IHRyaW1tZWRMaW5lLnN0YXJ0c1dpdGgoXCIjXCIpKSB7XHJcblx0XHRcdFx0XHRjb250aW51ZTsgLy8gU2tpcCBlbXB0eSBsaW5lcyBhbmQgY29tbWVudHNcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRjb25zdCBbcHJvcGVydHksIHZhbHVlXSA9IHRoaXMucGFyc2VMaW5lKHRyaW1tZWRMaW5lKTtcclxuXHJcblx0XHRcdFx0XHRzd2l0Y2ggKHByb3BlcnR5KSB7XHJcblx0XHRcdFx0XHRcdGNhc2UgXCJCRUdJTlwiOlxyXG5cdFx0XHRcdFx0XHRcdGlmICh2YWx1ZSA9PT0gXCJWQ0FMRU5EQVJcIikge1xyXG5cdFx0XHRcdFx0XHRcdFx0aW5DYWxlbmRhciA9IHRydWU7XHJcblx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmICh2YWx1ZSA9PT0gXCJWRVZFTlRcIiAmJiBpbkNhbGVuZGFyKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRjdXJyZW50RXZlbnQgPSB7IHNvdXJjZSB9O1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHRcdGNhc2UgXCJFTkRcIjpcclxuXHRcdFx0XHRcdFx0XHRpZiAodmFsdWUgPT09IFwiVkVWRU5UXCIgJiYgY3VycmVudEV2ZW50KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBldmVudCA9IHRoaXMuZmluYWxpemVFdmVudChjdXJyZW50RXZlbnQpO1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKGV2ZW50KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHJlc3VsdC5ldmVudHMucHVzaChldmVudCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHRjdXJyZW50RXZlbnQgPSBudWxsO1xyXG5cdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAodmFsdWUgPT09IFwiVkNBTEVOREFSXCIpIHtcclxuXHRcdFx0XHRcdFx0XHRcdGluQ2FsZW5kYXIgPSBmYWxzZTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0XHRjYXNlIFwiVkVSU0lPTlwiOlxyXG5cdFx0XHRcdFx0XHRcdGlmIChpbkNhbGVuZGFyICYmICFjdXJyZW50RXZlbnQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHJlc3VsdC5tZXRhZGF0YS52ZXJzaW9uID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdFx0Y2FzZSBcIlBST0RJRFwiOlxyXG5cdFx0XHRcdFx0XHRcdGlmIChpbkNhbGVuZGFyICYmICFjdXJyZW50RXZlbnQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHJlc3VsdC5tZXRhZGF0YS5wcm9kaWQgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0XHRjYXNlIFwiQ0FMU0NBTEVcIjpcclxuXHRcdFx0XHRcdFx0XHRpZiAoaW5DYWxlbmRhciAmJiAhY3VycmVudEV2ZW50KSB7XHJcblx0XHRcdFx0XHRcdFx0XHQvLyBVc3VhbGx5IEdSRUdPUklBTiwgY2FuIGJlIGlnbm9yZWQgZm9yIG1vc3QgcHVycG9zZXNcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0XHRjYXNlIFwiWC1XUi1DQUxOQU1FXCI6XHJcblx0XHRcdFx0XHRcdFx0aWYgKGluQ2FsZW5kYXIgJiYgIWN1cnJlbnRFdmVudCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0cmVzdWx0Lm1ldGFkYXRhLmNhbGVuZGFyTmFtZSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHRcdGNhc2UgXCJYLVdSLUNBTERFU0NcIjpcclxuXHRcdFx0XHRcdFx0XHRpZiAoaW5DYWxlbmRhciAmJiAhY3VycmVudEV2ZW50KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRyZXN1bHQubWV0YWRhdGEuZGVzY3JpcHRpb24gPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0XHRjYXNlIFwiWC1XUi1USU1FWk9ORVwiOlxyXG5cdFx0XHRcdFx0XHRcdGlmIChpbkNhbGVuZGFyICYmICFjdXJyZW50RXZlbnQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHJlc3VsdC5tZXRhZGF0YS50aW1lem9uZSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0XHRcdFx0aWYgKGN1cnJlbnRFdmVudCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5wYXJzZUV2ZW50UHJvcGVydHkoXHJcblx0XHRcdFx0XHRcdFx0XHRcdGN1cnJlbnRFdmVudCxcclxuXHRcdFx0XHRcdFx0XHRcdFx0cHJvcGVydHksXHJcblx0XHRcdFx0XHRcdFx0XHRcdHZhbHVlLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR0cmltbWVkTGluZVxyXG5cdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdHJlc3VsdC5lcnJvcnMucHVzaCh7XHJcblx0XHRcdFx0XHRcdGxpbmU6IGxpbmVOdW1iZXIsXHJcblx0XHRcdFx0XHRcdG1lc3NhZ2U6IGBFcnJvciBwYXJzaW5nIGxpbmU6ICR7ZXJyb3IubWVzc2FnZX1gLFxyXG5cdFx0XHRcdFx0XHRjb250ZXh0OiB0cmltbWVkTGluZSxcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0cmVzdWx0LmVycm9ycy5wdXNoKHtcclxuXHRcdFx0XHRtZXNzYWdlOiBgRmF0YWwgcGFyc2luZyBlcnJvcjogJHtlcnJvci5tZXNzYWdlfWAsXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENhY2hlIHRoZSByZXN1bHQgYmVmb3JlIHJldHVybmluZ1xyXG5cdFx0dGhpcy5jYWNoZVJlc3VsdChjYWNoZUtleSwgcmVzdWx0KTtcclxuXHJcblx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ3JlYXRlIGNhY2hlIGtleSBmcm9tIGNvbnRlbnQgYW5kIHNvdXJjZSBpZFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgc3RhdGljIGNyZWF0ZUNhY2hlS2V5KGNvbnRlbnQ6IHN0cmluZywgc291cmNlSWQ6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHQvLyBTaW1wbGUgaGFzaCBmdW5jdGlvbiBmb3IgY2FjaGUga2V5XHJcblx0XHRsZXQgaGFzaCA9IDA7XHJcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGNvbnRlbnQubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0Y29uc3QgY2hhciA9IGNvbnRlbnQuY2hhckNvZGVBdChpKTtcclxuXHRcdFx0aGFzaCA9ICgoaGFzaCA8PCA1KSAtIGhhc2gpICsgY2hhcjtcclxuXHRcdFx0aGFzaCA9IGhhc2ggJiBoYXNoOyAvLyBDb252ZXJ0IHRvIDMyLWJpdCBpbnRlZ2VyXHJcblx0XHR9XHJcblx0XHRyZXR1cm4gYCR7c291cmNlSWR9LSR7aGFzaH1gO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2FjaGUgcGFyc2luZyByZXN1bHQgd2l0aCBzaXplIGxpbWl0XHJcblx0ICovXHJcblx0cHJpdmF0ZSBzdGF0aWMgY2FjaGVSZXN1bHQoa2V5OiBzdHJpbmcsIHJlc3VsdDogSWNzUGFyc2VSZXN1bHQpOiB2b2lkIHtcclxuXHRcdC8vIEltcGxlbWVudCBMUlUtbGlrZSBiZWhhdmlvciBieSBjbGVhcmluZyBjYWNoZSB3aGVuIGl0IGdldHMgdG9vIGxhcmdlXHJcblx0XHRpZiAodGhpcy5wYXJzZUNhY2hlLnNpemUgPj0gdGhpcy5NQVhfQ0FDSEVfU0laRSkge1xyXG5cdFx0XHQvLyBDbGVhciBvbGRlc3QgZW50cmllcyAoc2ltcGxlIGFwcHJvYWNoIC0gY2xlYXIgaGFsZiB0aGUgY2FjaGUpXHJcblx0XHRcdGNvbnN0IGVudHJpZXMgPSBBcnJheS5mcm9tKHRoaXMucGFyc2VDYWNoZS5lbnRyaWVzKCkpO1xyXG5cdFx0XHRjb25zdCBrZWVwQ291bnQgPSBNYXRoLmZsb29yKHRoaXMuTUFYX0NBQ0hFX1NJWkUgLyAyKTtcclxuXHRcdFx0dGhpcy5wYXJzZUNhY2hlLmNsZWFyKCk7XHJcblxyXG5cdFx0XHQvLyBLZWVwIHRoZSBtb3N0IHJlY2VudCBlbnRyaWVzXHJcblx0XHRcdGZvciAobGV0IGkgPSBlbnRyaWVzLmxlbmd0aCAtIGtlZXBDb3VudDsgaSA8IGVudHJpZXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHR0aGlzLnBhcnNlQ2FjaGUuc2V0KGVudHJpZXNbaV1bMF0sIGVudHJpZXNbaV1bMV0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU3RvcmUgYSBjb3B5IHRvIHByZXZlbnQgZXh0ZXJuYWwgbXV0YXRpb25zXHJcblx0XHR0aGlzLnBhcnNlQ2FjaGUuc2V0KGtleSwge1xyXG5cdFx0XHRldmVudHM6IHJlc3VsdC5ldmVudHMubWFwKGV2ZW50ID0+ICh7IC4uLmV2ZW50IH0pKSxcclxuXHRcdFx0ZXJyb3JzOiBbLi4ucmVzdWx0LmVycm9yc10sXHJcblx0XHRcdG1ldGFkYXRhOiB7IC4uLnJlc3VsdC5tZXRhZGF0YSB9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVuZm9sZCBsaW5lcyBhY2NvcmRpbmcgdG8gUkZDIDU1NDVcclxuXHQgKiBMaW5lcyBjYW4gYmUgZm9sZGVkIGJ5IGluc2VydGluZyBDUkxGIGZvbGxvd2VkIGJ5IGEgc3BhY2Ugb3IgdGFiXHJcblx0ICogT3B0aW1pemVkIHZlcnNpb24gdXNpbmcgYXJyYXkgam9pbiBpbnN0ZWFkIG9mIHN0cmluZyBjb25jYXRlbmF0aW9uXHJcblx0ICovXHJcblx0cHJpdmF0ZSBzdGF0aWMgdW5mb2xkTGluZXMobGluZXM6IHN0cmluZ1tdKTogc3RyaW5nW10ge1xyXG5cdFx0Y29uc3QgdW5mb2xkZWQ6IHN0cmluZ1tdID0gW107XHJcblx0XHRjb25zdCBjdXJyZW50TGluZVBhcnRzOiBzdHJpbmdbXSA9IFtdO1xyXG5cdFx0bGV0IGhhc0N1cnJlbnRMaW5lID0gZmFsc2U7XHJcblxyXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRjb25zdCBsaW5lID0gbGluZXNbaV07XHJcblx0XHRcdGNvbnN0IGZpcnN0Q2hhciA9IGxpbmUuY2hhckNvZGVBdCgwKTtcclxuXHJcblx0XHRcdC8vIENoZWNrIGZvciBzcGFjZSAoMzIpIG9yIHRhYiAoOSkgYXQgdGhlIGJlZ2lubmluZ1xyXG5cdFx0XHRpZiAoZmlyc3RDaGFyID09PSAzMiB8fCBmaXJzdENoYXIgPT09IDkpIHtcclxuXHRcdFx0XHQvLyBUaGlzIGlzIGEgY29udGludWF0aW9uIG9mIHRoZSBwcmV2aW91cyBsaW5lXHJcblx0XHRcdFx0aWYgKGhhc0N1cnJlbnRMaW5lKSB7XHJcblx0XHRcdFx0XHRjdXJyZW50TGluZVBhcnRzLnB1c2goJyAnKTsgLy8gQWRkIHNwYWNlIGJldHdlZW4gZm9sZGVkIHBhcnRzXHJcblx0XHRcdFx0XHRjdXJyZW50TGluZVBhcnRzLnB1c2gobGluZS5zbGljZSgxKSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIFRoaXMgaXMgYSBuZXcgbGluZVxyXG5cdFx0XHRcdGlmIChoYXNDdXJyZW50TGluZSkge1xyXG5cdFx0XHRcdFx0dW5mb2xkZWQucHVzaChjdXJyZW50TGluZVBhcnRzLmpvaW4oJycpKTtcclxuXHRcdFx0XHRcdGN1cnJlbnRMaW5lUGFydHMubGVuZ3RoID0gMDsgLy8gQ2xlYXIgYXJyYXkgZWZmaWNpZW50bHlcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Y3VycmVudExpbmVQYXJ0cy5wdXNoKGxpbmUpO1xyXG5cdFx0XHRcdGhhc0N1cnJlbnRMaW5lID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChoYXNDdXJyZW50TGluZSkge1xyXG5cdFx0XHR1bmZvbGRlZC5wdXNoKGN1cnJlbnRMaW5lUGFydHMuam9pbignJykpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB1bmZvbGRlZDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFBhcnNlIGEgc2luZ2xlIGxpbmUgaW50byBwcm9wZXJ0eSBhbmQgdmFsdWVcclxuXHQgKiBPcHRpbWl6ZWQgdmVyc2lvbiB3aXRoIHJlZHVjZWQgc3RyaW5nIG9wZXJhdGlvbnNcclxuXHQgKi9cclxuXHRwcml2YXRlIHN0YXRpYyBwYXJzZUxpbmUobGluZTogc3RyaW5nKTogW3N0cmluZywgc3RyaW5nXSB7XHJcblx0XHRjb25zdCBjb2xvbkluZGV4ID0gbGluZS5pbmRleE9mKFwiOlwiKTtcclxuXHRcdGlmIChjb2xvbkluZGV4ID09PSAtMSkge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIGxpbmUgZm9ybWF0OiBtaXNzaW5nIGNvbG9uXCIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEV4dHJhY3QgcHJvcGVydHkgbmFtZSAoYmVmb3JlIGFueSBwYXJhbWV0ZXJzKSBhbmQgdmFsdWUgaW4gb25lIHBhc3NcclxuXHRcdGNvbnN0IHNlbWljb2xvbkluZGV4ID0gbGluZS5pbmRleE9mKFwiO1wiKTtcclxuXHRcdGxldCBwcm9wZXJ0eTogc3RyaW5nO1xyXG5cclxuXHRcdGlmIChzZW1pY29sb25JbmRleCAhPT0gLTEgJiYgc2VtaWNvbG9uSW5kZXggPCBjb2xvbkluZGV4KSB7XHJcblx0XHRcdC8vIFByb3BlcnR5IGhhcyBwYXJhbWV0ZXJzXHJcblx0XHRcdHByb3BlcnR5ID0gbGluZS5zbGljZSgwLCBzZW1pY29sb25JbmRleCkudG9VcHBlckNhc2UoKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIE5vIHBhcmFtZXRlcnNcclxuXHRcdFx0cHJvcGVydHkgPSBsaW5lLnNsaWNlKDAsIGNvbG9uSW5kZXgpLnRvVXBwZXJDYXNlKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgdmFsdWUgPSBsaW5lLnNsaWNlKGNvbG9uSW5kZXggKyAxKTtcclxuXHRcdHJldHVybiBbcHJvcGVydHksIHZhbHVlXTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFBhcnNlIGV2ZW50LXNwZWNpZmljIHByb3BlcnRpZXNcclxuXHQgKiBPcHRpbWl6ZWQgdmVyc2lvbiB1c2luZyBwcm9wZXJ0eSBoYW5kbGVyIG1hcCBmb3IgZmFzdGVyIGxvb2t1cFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgc3RhdGljIHBhcnNlRXZlbnRQcm9wZXJ0eShcclxuXHRcdGV2ZW50OiBQYXJ0aWFsPEljc0V2ZW50PixcclxuXHRcdHByb3BlcnR5OiBzdHJpbmcsXHJcblx0XHR2YWx1ZTogc3RyaW5nLFxyXG5cdFx0ZnVsbExpbmU6IHN0cmluZ1xyXG5cdCk6IHZvaWQge1xyXG5cdFx0Ly8gVXNlIHByb3BlcnR5IGhhbmRsZXIgbWFwIGZvciBmYXN0ZXIgbG9va3VwXHJcblx0XHRjb25zdCBoYW5kbGVyID0gdGhpcy5QUk9QRVJUWV9IQU5ETEVSUy5nZXQocHJvcGVydHkpO1xyXG5cdFx0aWYgKGhhbmRsZXIpIHtcclxuXHRcdFx0aGFuZGxlcihldmVudCwgdmFsdWUsIGZ1bGxMaW5lKTtcclxuXHRcdH0gZWxzZSBpZiAocHJvcGVydHkuY2hhckNvZGVBdCgwKSA9PT0gODggJiYgcHJvcGVydHkuY2hhckNvZGVBdCgxKSA9PT0gNDUpIHsgLy8gXCJYLVwiXHJcblx0XHRcdC8vIFN0b3JlIGN1c3RvbSBwcm9wZXJ0aWVzIChYLSBwcmVmaXggY2hlY2sgb3B0aW1pemVkKVxyXG5cdFx0XHRpZiAoIWV2ZW50LmN1c3RvbVByb3BlcnRpZXMpIHtcclxuXHRcdFx0XHRldmVudC5jdXN0b21Qcm9wZXJ0aWVzID0ge307XHJcblx0XHRcdH1cclxuXHRcdFx0ZXZlbnQuY3VzdG9tUHJvcGVydGllc1twcm9wZXJ0eV0gPSB2YWx1ZTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFBhcnNlIGRhdGUvdGltZSB2YWx1ZXNcclxuXHQgKiBPcHRpbWl6ZWQgdmVyc2lvbiB3aXRoIHJlZHVjZWQgc3RyaW5nIG9wZXJhdGlvbnMgYW5kIGJldHRlciBwYXJzaW5nXHJcblx0ICovXHJcblx0cHJpdmF0ZSBzdGF0aWMgcGFyc2VEYXRlVGltZShcclxuXHRcdHZhbHVlOiBzdHJpbmcsXHJcblx0XHRmdWxsTGluZTogc3RyaW5nXHJcblx0KTogeyBkYXRlOiBEYXRlOyBhbGxEYXk/OiBib29sZWFuIH0ge1xyXG5cdFx0Ly8gQ2hlY2sgaWYgaXQncyBhbiBhbGwtZGF5IGV2ZW50IChWQUxVRT1EQVRFIHBhcmFtZXRlcilcclxuXHRcdGNvbnN0IGlzQWxsRGF5ID0gZnVsbExpbmUuaW5kZXhPZihcIlZBTFVFPURBVEVcIikgIT09IC0xO1xyXG5cclxuXHRcdC8vIEV4dHJhY3QgYWN0dWFsIGRhdGUvdGltZSBzdHJpbmcsIGhhbmRsaW5nIHRpbWV6b25lIGluZm8gZWZmaWNpZW50bHlcclxuXHRcdGxldCBkYXRlU3RyID0gdmFsdWU7XHJcblx0XHRjb25zdCB0emlkSW5kZXggPSBkYXRlU3RyLmluZGV4T2YoXCJUWklEPVwiKTtcclxuXHRcdGlmICh0emlkSW5kZXggIT09IC0xKSB7XHJcblx0XHRcdC8vIEV4dHJhY3QgdGhlIGFjdHVhbCBkYXRlL3RpbWUgcGFydCBhZnRlciB0aW1lem9uZVxyXG5cdFx0XHRjb25zdCBjb2xvbkluZGV4ID0gZGF0ZVN0ci5sYXN0SW5kZXhPZihcIjpcIik7XHJcblx0XHRcdGlmIChjb2xvbkluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHRcdGRhdGVTdHIgPSBkYXRlU3RyLnNsaWNlKGNvbG9uSW5kZXggKyAxKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEhhbmRsZSBVVEMgdGltZXMgKGVuZGluZyB3aXRoIFopXHJcblx0XHRjb25zdCBpc1V0YyA9IGRhdGVTdHIuY2hhckNvZGVBdChkYXRlU3RyLmxlbmd0aCAtIDEpID09PSA5MDsgLy8gJ1onXHJcblx0XHRpZiAoaXNVdGMpIHtcclxuXHRcdFx0ZGF0ZVN0ciA9IGRhdGVTdHIuc2xpY2UoMCwgLTEpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFBhcnNlIGRhdGUgY29tcG9uZW50cyB1c2luZyBtb3JlIGVmZmljaWVudCBhcHByb2FjaFxyXG5cdFx0Y29uc3QgZGF0ZVN0ckxlbiA9IGRhdGVTdHIubGVuZ3RoO1xyXG5cdFx0bGV0IGRhdGU6IERhdGU7XHJcblxyXG5cdFx0aWYgKGlzQWxsRGF5IHx8IGRhdGVTdHJMZW4gPT09IDgpIHtcclxuXHRcdFx0Ly8gQWxsLWRheSBldmVudCBvciBkYXRlLW9ubHkgZm9ybWF0OiBZWVlZTU1ERFxyXG5cdFx0XHQvLyBVc2UgZGlyZWN0IGNoYXJhY3RlciBjb2RlIHBhcnNpbmcgZm9yIGJldHRlciBwZXJmb3JtYW5jZVxyXG5cdFx0XHRjb25zdCB5ZWFyID0gdGhpcy5wYXJzZUludEZyb21TdHJpbmcoZGF0ZVN0ciwgMCwgNCk7XHJcblx0XHRcdGNvbnN0IG1vbnRoID0gdGhpcy5wYXJzZUludEZyb21TdHJpbmcoZGF0ZVN0ciwgNCwgMikgLSAxOyAvLyBNb250aCBpcyAwLWJhc2VkXHJcblx0XHRcdGNvbnN0IGRheSA9IHRoaXMucGFyc2VJbnRGcm9tU3RyaW5nKGRhdGVTdHIsIDYsIDIpO1xyXG5cdFx0XHRkYXRlID0gbmV3IERhdGUoeWVhciwgbW9udGgsIGRheSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBEYXRlLXRpbWUgZm9ybWF0OiBZWVlZTU1ERFRISE1NU1NcclxuXHRcdFx0Y29uc3QgeWVhciA9IHRoaXMucGFyc2VJbnRGcm9tU3RyaW5nKGRhdGVTdHIsIDAsIDQpO1xyXG5cdFx0XHRjb25zdCBtb250aCA9IHRoaXMucGFyc2VJbnRGcm9tU3RyaW5nKGRhdGVTdHIsIDQsIDIpIC0gMTtcclxuXHRcdFx0Y29uc3QgZGF5ID0gdGhpcy5wYXJzZUludEZyb21TdHJpbmcoZGF0ZVN0ciwgNiwgMik7XHJcblx0XHRcdGNvbnN0IGhvdXIgPSB0aGlzLnBhcnNlSW50RnJvbVN0cmluZyhkYXRlU3RyLCA5LCAyKTtcclxuXHRcdFx0Y29uc3QgbWludXRlID0gdGhpcy5wYXJzZUludEZyb21TdHJpbmcoZGF0ZVN0ciwgMTEsIDIpO1xyXG5cdFx0XHRjb25zdCBzZWNvbmQgPSBkYXRlU3RyTGVuID49IDE1ID8gdGhpcy5wYXJzZUludEZyb21TdHJpbmcoZGF0ZVN0ciwgMTMsIDIpIDogMDtcclxuXHJcblx0XHRcdGlmIChpc1V0Yykge1xyXG5cdFx0XHRcdGRhdGUgPSBuZXcgRGF0ZShEYXRlLlVUQyh5ZWFyLCBtb250aCwgZGF5LCBob3VyLCBtaW51dGUsIHNlY29uZCkpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGRhdGUgPSBuZXcgRGF0ZSh5ZWFyLCBtb250aCwgZGF5LCBob3VyLCBtaW51dGUsIHNlY29uZCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4geyBkYXRlLCBhbGxEYXk6IGlzQWxsRGF5IH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBQYXJzZSBpbnRlZ2VyIGZyb20gc3RyaW5nIHNsaWNlIHdpdGhvdXQgY3JlYXRpbmcgc3Vic3RyaW5nXHJcblx0ICogTW9yZSBlZmZpY2llbnQgdGhhbiBwYXJzZUludChzdHIuc3Vic3RyaW5nKC4uLikpXHJcblx0ICovXHJcblx0cHJpdmF0ZSBzdGF0aWMgcGFyc2VJbnRGcm9tU3RyaW5nKHN0cjogc3RyaW5nLCBzdGFydDogbnVtYmVyLCBsZW5ndGg6IG51bWJlcik6IG51bWJlciB7XHJcblx0XHRsZXQgcmVzdWx0ID0gMDtcclxuXHRcdGNvbnN0IGVuZCA9IHN0YXJ0ICsgbGVuZ3RoO1xyXG5cdFx0Zm9yIChsZXQgaSA9IHN0YXJ0OyBpIDwgZW5kICYmIGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0Y29uc3QgZGlnaXQgPSBzdHIuY2hhckNvZGVBdChpKSAtIDQ4OyAvLyAnMCcgaXMgNDhcclxuXHRcdFx0aWYgKGRpZ2l0ID49IDAgJiYgZGlnaXQgPD0gOSkge1xyXG5cdFx0XHRcdHJlc3VsdCA9IHJlc3VsdCAqIDEwICsgZGlnaXQ7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiByZXN1bHQ7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBQYXJzZSBvcmdhbml6ZXIgaW5mb3JtYXRpb25cclxuXHQgKiBPcHRpbWl6ZWQgdmVyc2lvbiB1c2luZyBwcmUtY29tcGlsZWQgcmVnZXggYW5kIGVmZmljaWVudCBzdHJpbmcgb3BlcmF0aW9uc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgc3RhdGljIHBhcnNlT3JnYW5pemVyKFxyXG5cdFx0dmFsdWU6IHN0cmluZyxcclxuXHRcdGZ1bGxMaW5lOiBzdHJpbmdcclxuXHQpOiB7IG5hbWU/OiBzdHJpbmc7IGVtYWlsPzogc3RyaW5nIH0ge1xyXG5cdFx0Y29uc3Qgb3JnYW5pemVyOiB7IG5hbWU/OiBzdHJpbmc7IGVtYWlsPzogc3RyaW5nIH0gPSB7fTtcclxuXHJcblx0XHQvLyBFeHRyYWN0IGVtYWlsIGZyb20gTUFJTFRPOiBwcmVmaXggKG9wdGltaXplZCBjaGVjaylcclxuXHRcdGlmICh2YWx1ZS5jaGFyQ29kZUF0KDApID09PSA3NyAmJiB2YWx1ZS5zdGFydHNXaXRoKFwiTUFJTFRPOlwiKSkgeyAvLyAnTSdcclxuXHRcdFx0b3JnYW5pemVyLmVtYWlsID0gdmFsdWUuc2xpY2UoNyk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRXh0cmFjdCBuYW1lIGZyb20gQ04gcGFyYW1ldGVyIHVzaW5nIHByZS1jb21waWxlZCByZWdleFxyXG5cdFx0Y29uc3QgY25NYXRjaCA9IGZ1bGxMaW5lLm1hdGNoKHRoaXMuQ05fUkVHRVgpO1xyXG5cdFx0aWYgKGNuTWF0Y2gpIHtcclxuXHRcdFx0b3JnYW5pemVyLm5hbWUgPSB0aGlzLnVuZXNjYXBlVGV4dChjbk1hdGNoWzFdKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gb3JnYW5pemVyO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUGFyc2UgYXR0ZW5kZWUgaW5mb3JtYXRpb25cclxuXHQgKiBPcHRpbWl6ZWQgdmVyc2lvbiB1c2luZyBwcmUtY29tcGlsZWQgcmVnZXggYW5kIGVmZmljaWVudCBzdHJpbmcgb3BlcmF0aW9uc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgc3RhdGljIHBhcnNlQXR0ZW5kZWUoXHJcblx0XHR2YWx1ZTogc3RyaW5nLFxyXG5cdFx0ZnVsbExpbmU6IHN0cmluZ1xyXG5cdCk6IHsgbmFtZT86IHN0cmluZzsgZW1haWw/OiBzdHJpbmc7IHJvbGU/OiBzdHJpbmc7IHN0YXR1cz86IHN0cmluZyB9IHtcclxuXHRcdGNvbnN0IGF0dGVuZGVlOiB7XHJcblx0XHRcdG5hbWU/OiBzdHJpbmc7XHJcblx0XHRcdGVtYWlsPzogc3RyaW5nO1xyXG5cdFx0XHRyb2xlPzogc3RyaW5nO1xyXG5cdFx0XHRzdGF0dXM/OiBzdHJpbmc7XHJcblx0XHR9ID0ge307XHJcblxyXG5cdFx0Ly8gRXh0cmFjdCBlbWFpbCBmcm9tIE1BSUxUTzogcHJlZml4IChvcHRpbWl6ZWQgY2hlY2spXHJcblx0XHRpZiAodmFsdWUuY2hhckNvZGVBdCgwKSA9PT0gNzcgJiYgdmFsdWUuc3RhcnRzV2l0aChcIk1BSUxUTzpcIikpIHsgLy8gJ00nXHJcblx0XHRcdGF0dGVuZGVlLmVtYWlsID0gdmFsdWUuc2xpY2UoNyk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRXh0cmFjdCBuYW1lIGZyb20gQ04gcGFyYW1ldGVyIHVzaW5nIHByZS1jb21waWxlZCByZWdleFxyXG5cdFx0Y29uc3QgY25NYXRjaCA9IGZ1bGxMaW5lLm1hdGNoKHRoaXMuQ05fUkVHRVgpO1xyXG5cdFx0aWYgKGNuTWF0Y2gpIHtcclxuXHRcdFx0YXR0ZW5kZWUubmFtZSA9IHRoaXMudW5lc2NhcGVUZXh0KGNuTWF0Y2hbMV0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEV4dHJhY3Qgcm9sZSBmcm9tIFJPTEUgcGFyYW1ldGVyIHVzaW5nIHByZS1jb21waWxlZCByZWdleFxyXG5cdFx0Y29uc3Qgcm9sZU1hdGNoID0gZnVsbExpbmUubWF0Y2godGhpcy5ST0xFX1JFR0VYKTtcclxuXHRcdGlmIChyb2xlTWF0Y2gpIHtcclxuXHRcdFx0YXR0ZW5kZWUucm9sZSA9IHJvbGVNYXRjaFsxXTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBFeHRyYWN0IHN0YXR1cyBmcm9tIFBBUlRTVEFUIHBhcmFtZXRlciB1c2luZyBwcmUtY29tcGlsZWQgcmVnZXhcclxuXHRcdGNvbnN0IHN0YXR1c01hdGNoID0gZnVsbExpbmUubWF0Y2godGhpcy5QQVJUU1RBVF9SRUdFWCk7XHJcblx0XHRpZiAoc3RhdHVzTWF0Y2gpIHtcclxuXHRcdFx0YXR0ZW5kZWUuc3RhdHVzID0gc3RhdHVzTWF0Y2hbMV07XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGF0dGVuZGVlO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVW5lc2NhcGUgdGV4dCBhY2NvcmRpbmcgdG8gUkZDIDU1NDVcclxuXHQgKiBPcHRpbWl6ZWQgdmVyc2lvbiB0aGF0IG9ubHkgcHJvY2Vzc2VzIGlmIGVzY2FwZSBzZXF1ZW5jZXMgYXJlIGZvdW5kXHJcblx0ICovXHJcblx0cHJpdmF0ZSBzdGF0aWMgdW5lc2NhcGVUZXh0KHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHQvLyBRdWljayBjaGVjayBpZiB0ZXh0IGNvbnRhaW5zIGVzY2FwZSBzZXF1ZW5jZXNcclxuXHRcdGlmICh0ZXh0LmluZGV4T2YoJ1xcXFwnKSA9PT0gLTEpIHtcclxuXHRcdFx0cmV0dXJuIHRleHQ7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gT25seSBwZXJmb3JtIHJlcGxhY2VtZW50cyBpZiBlc2NhcGUgc2VxdWVuY2VzIGFyZSBwcmVzZW50XHJcblx0XHRyZXR1cm4gdGV4dFxyXG5cdFx0XHQucmVwbGFjZSgvXFxcXG4vZywgXCJcXG5cIilcclxuXHRcdFx0LnJlcGxhY2UoL1xcXFwsL2csIFwiLFwiKVxyXG5cdFx0XHQucmVwbGFjZSgvXFxcXDsvZywgXCI7XCIpXHJcblx0XHRcdC5yZXBsYWNlKC9cXFxcXFxcXC9nLCBcIlxcXFxcIik7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDbGVhciBwYXJzaW5nIGNhY2hlIHRvIGZyZWUgbWVtb3J5XHJcblx0ICovXHJcblx0c3RhdGljIGNsZWFyQ2FjaGUoKTogdm9pZCB7XHJcblx0XHR0aGlzLnBhcnNlQ2FjaGUuY2xlYXIoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBjYWNoZSBzdGF0aXN0aWNzIGZvciBtb25pdG9yaW5nXHJcblx0ICovXHJcblx0c3RhdGljIGdldENhY2hlU3RhdHMoKTogeyBzaXplOiBudW1iZXI7IG1heFNpemU6IG51bWJlciB9IHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHNpemU6IHRoaXMucGFyc2VDYWNoZS5zaXplLFxyXG5cdFx0XHRtYXhTaXplOiB0aGlzLk1BWF9DQUNIRV9TSVpFXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRmluYWxpemUgYW5kIHZhbGlkYXRlIGV2ZW50XHJcblx0ICovXHJcblx0cHJpdmF0ZSBzdGF0aWMgZmluYWxpemVFdmVudChldmVudDogUGFydGlhbDxJY3NFdmVudD4pOiBJY3NFdmVudCB8IG51bGwge1xyXG5cdFx0Ly8gUmVxdWlyZWQgZmllbGRzIHZhbGlkYXRpb25cclxuXHRcdGlmICghZXZlbnQudWlkIHx8ICFldmVudC5zdW1tYXJ5IHx8ICFldmVudC5kdHN0YXJ0KSB7XHJcblx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFNldCBkZWZhdWx0IHZhbHVlc1xyXG5cdFx0Y29uc3QgZmluYWxFdmVudDogSWNzRXZlbnQgPSB7XHJcblx0XHRcdHVpZDogZXZlbnQudWlkLFxyXG5cdFx0XHRzdW1tYXJ5OiBldmVudC5zdW1tYXJ5LFxyXG5cdFx0XHRkdHN0YXJ0OiBldmVudC5kdHN0YXJ0LFxyXG5cdFx0XHRhbGxEYXk6IGV2ZW50LmFsbERheSA/PyBmYWxzZSxcclxuXHRcdFx0c291cmNlOiBldmVudC5zb3VyY2UhLFxyXG5cdFx0XHRkZXNjcmlwdGlvbjogZXZlbnQuZGVzY3JpcHRpb24sXHJcblx0XHRcdGR0ZW5kOiBldmVudC5kdGVuZCxcclxuXHRcdFx0bG9jYXRpb246IGV2ZW50LmxvY2F0aW9uLFxyXG5cdFx0XHRjYXRlZ29yaWVzOiBldmVudC5jYXRlZ29yaWVzLFxyXG5cdFx0XHRzdGF0dXM6IGV2ZW50LnN0YXR1cyxcclxuXHRcdFx0cnJ1bGU6IGV2ZW50LnJydWxlLFxyXG5cdFx0XHRleGRhdGU6IGV2ZW50LmV4ZGF0ZSxcclxuXHRcdFx0Y3JlYXRlZDogZXZlbnQuY3JlYXRlZCxcclxuXHRcdFx0bGFzdE1vZGlmaWVkOiBldmVudC5sYXN0TW9kaWZpZWQsXHJcblx0XHRcdHByaW9yaXR5OiBldmVudC5wcmlvcml0eSxcclxuXHRcdFx0dHJhbnNwOiBldmVudC50cmFuc3AsXHJcblx0XHRcdG9yZ2FuaXplcjogZXZlbnQub3JnYW5pemVyLFxyXG5cdFx0XHRhdHRlbmRlZXM6IGV2ZW50LmF0dGVuZGVlcyxcclxuXHRcdFx0Y3VzdG9tUHJvcGVydGllczogZXZlbnQuY3VzdG9tUHJvcGVydGllcyxcclxuXHRcdH07XHJcblxyXG5cdFx0cmV0dXJuIGZpbmFsRXZlbnQ7XHJcblx0fVxyXG59XHJcbiJdfQ==