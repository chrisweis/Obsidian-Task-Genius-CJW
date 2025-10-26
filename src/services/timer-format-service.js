/**
 * Task Timer Formatter - Handles time duration formatting with template support
 */
/**
 * Utility class for formatting time durations using template strings
 */
export class TaskTimerFormatter {
    /**
     * Parse duration in milliseconds to time components
     * @param duration Duration in milliseconds
     * @returns Time components object
     */
    static parseTimeComponents(duration) {
        const totalSeconds = Math.floor(duration / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return {
            hours,
            minutes,
            seconds,
            totalMilliseconds: duration
        };
    }
    /**
     * Format duration using a template string
     * @param duration Duration in milliseconds
     * @param template Template string with placeholders
     * @returns Formatted duration string
     */
    static formatDuration(duration, template) {
        if (duration < 0) {
            duration = 0;
        }
        const components = this.parseTimeComponents(duration);
        let result = template;
        // Replace all placeholders
        result = result.replace(/\{h\}/g, components.hours.toString());
        result = result.replace(/\{m\}/g, components.minutes.toString());
        result = result.replace(/\{s\}/g, components.seconds.toString());
        result = result.replace(/\{ms\}/g, components.totalMilliseconds.toString());
        // Handle zero cleanup - remove segments that are zero
        result = this.cleanupZeroValues(result);
        // Clean up whitespace
        result = result.replace(/\s+/g, ' ').trim();
        // Return "0s" if result is empty
        return result || "0s";
    }
    /**
     * Format duration with smart unit selection
     * @param duration Duration in milliseconds
     * @returns Formatted duration string with appropriate units
     */
    static formatDurationSmart(duration) {
        const components = this.parseTimeComponents(duration);
        if (components.hours > 0) {
            if (components.minutes > 0) {
                return `${components.hours}hrs${components.minutes}mins`;
            }
            else {
                return `${components.hours}hrs`;
            }
        }
        else if (components.minutes > 0) {
            if (components.seconds > 30) { // Round up if seconds > 30
                return `${components.minutes + 1}mins`;
            }
            else {
                return `${components.minutes}mins`;
            }
        }
        else if (components.seconds > 0) {
            return `${components.seconds}s`;
        }
        else {
            return "0s";
        }
    }
    /**
     * Format duration for display in different contexts
     * @param duration Duration in milliseconds
     * @param context Context for formatting ('compact', 'detailed', 'precise')
     * @returns Formatted duration string
     */
    static formatForContext(duration, context) {
        const components = this.parseTimeComponents(duration);
        switch (context) {
            case 'compact':
                return this.formatDurationSmart(duration);
            case 'detailed':
                const parts = [];
                if (components.hours > 0)
                    parts.push(`${components.hours}h`);
                if (components.minutes > 0)
                    parts.push(`${components.minutes}m`);
                if (components.seconds > 0)
                    parts.push(`${components.seconds}s`);
                return parts.join(' ') || '0s';
            case 'precise':
                if (components.hours > 0) {
                    return `${components.hours}:${components.minutes.toString().padStart(2, '0')}:${components.seconds.toString().padStart(2, '0')}`;
                }
                else {
                    return `${components.minutes}:${components.seconds.toString().padStart(2, '0')}`;
                }
            default:
                return this.formatDurationSmart(duration);
        }
    }
    /**
     * Validate template string
     * @param template Template string to validate
     * @returns true if template is valid
     */
    static validateTemplate(template) {
        // Check for valid placeholders
        const validPlaceholders = /\{[hms]\}/g;
        const invalidPlaceholders = /\{[^hms\}]*\}/g;
        // Template should have at least one valid placeholder
        const hasValidPlaceholders = validPlaceholders.test(template);
        // Template should not have invalid placeholders
        const hasInvalidPlaceholders = invalidPlaceholders.test(template);
        return hasValidPlaceholders && !hasInvalidPlaceholders;
    }
    /**
     * Get default template suggestions
     * @returns Array of template suggestions with descriptions
     */
    static getTemplateSuggestions() {
        const sampleDuration = 2 * 3600000 + 35 * 60000 + 42 * 1000; // 2h 35m 42s
        return [
            {
                template: "{h}hrs{m}mins",
                description: "Hours and minutes (default)",
                example: this.formatDuration(sampleDuration, "{h}hrs{m}mins")
            },
            {
                template: "{h}h {m}m {s}s",
                description: "Full time with spaces",
                example: this.formatDuration(sampleDuration, "{h}h {m}m {s}s")
            },
            {
                template: "{h}:{m}:{s}",
                description: "Clock format",
                example: this.formatDuration(sampleDuration, "{h}:{m}:{s}")
            },
            {
                template: "{m}mins",
                description: "Minutes only",
                example: this.formatDuration(sampleDuration, "{m}mins")
            },
            {
                template: "({h}h{m}m)",
                description: "Parentheses format",
                example: this.formatDuration(sampleDuration, "({h}h{m}m)")
            }
        ];
    }
    /**
     * Clean up zero values from formatted string
     * @param formatted Formatted string with potential zero values
     * @returns Cleaned string
     */
    static cleanupZeroValues(formatted) {
        // Remove zero hours, minutes, seconds if they appear at the start
        formatted = formatted.replace(/^0hrs?\b/i, '');
        formatted = formatted.replace(/^0mins?\b/i, '');
        formatted = formatted.replace(/^0secs?\b/i, '');
        formatted = formatted.replace(/^0s\b/i, '');
        // Remove zero values that appear after spaces (use word boundaries)
        formatted = formatted.replace(/\s+0hrs?\b/gi, '');
        formatted = formatted.replace(/\s+0mins?\b/gi, '');
        formatted = formatted.replace(/\s+0secs?\b/gi, '');
        formatted = formatted.replace(/\s+0s\b/gi, '');
        // Handle patterns like "0h 0m 15s" -> "15s"
        formatted = formatted.replace(/\b0[hm]\b\s*/g, '');
        return formatted;
    }
    /**
     * Parse human-readable time string back to milliseconds
     * @param timeString Human-readable time string (e.g., "2hrs30mins")
     * @returns Duration in milliseconds, or 0 if parsing fails
     */
    static parseTimeString(timeString) {
        let totalMs = 0;
        // Match hours
        const hoursMatch = timeString.match(/(\d+)hrs?/i);
        if (hoursMatch) {
            totalMs += parseInt(hoursMatch[1]) * 3600000;
        }
        // Match minutes
        const minutesMatch = timeString.match(/(\d+)mins?/i);
        if (minutesMatch) {
            totalMs += parseInt(minutesMatch[1]) * 60000;
        }
        // Match seconds
        const secondsMatch = timeString.match(/(\d+)s(?:ecs?)?/i);
        if (secondsMatch) {
            totalMs += parseInt(secondsMatch[1]) * 1000;
        }
        return totalMs;
    }
    /**
     * Format duration for export/import purposes
     * @param duration Duration in milliseconds
     * @returns ISO 8601 duration string
     */
    static formatForExport(duration) {
        const components = this.parseTimeComponents(duration);
        return `PT${components.hours}H${components.minutes}M${components.seconds}S`;
    }
    /**
     * Parse ISO 8601 duration string
     * @param isoDuration ISO 8601 duration string
     * @returns Duration in milliseconds
     */
    static parseFromExport(isoDuration) {
        const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) {
            return 0;
        }
        const hours = parseInt(match[1] || '0');
        const minutes = parseInt(match[2] || '0');
        const seconds = parseInt(match[3] || '0');
        return hours * 3600000 + minutes * 60000 + seconds * 1000;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZXItZm9ybWF0LXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0aW1lci1mb3JtYXQtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7R0FFRztBQVNIOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGtCQUFrQjtJQUM5Qjs7OztPQUlHO0lBQ0gsTUFBTSxDQUFDLG1CQUFtQixDQUFDLFFBQWdCO1FBQzFDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQ2pELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQzlDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDdkQsTUFBTSxPQUFPLEdBQUcsWUFBWSxHQUFHLEVBQUUsQ0FBQztRQUVsQyxPQUFPO1lBQ04sS0FBSztZQUNMLE9BQU87WUFDUCxPQUFPO1lBQ1AsaUJBQWlCLEVBQUUsUUFBUTtTQUMzQixDQUFDO0lBQ0gsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0gsTUFBTSxDQUFDLGNBQWMsQ0FBQyxRQUFnQixFQUFFLFFBQWdCO1FBQ3ZELElBQUksUUFBUSxHQUFHLENBQUMsRUFBRTtZQUNqQixRQUFRLEdBQUcsQ0FBQyxDQUFDO1NBQ2I7UUFFRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdEQsSUFBSSxNQUFNLEdBQUcsUUFBUSxDQUFDO1FBRXRCLDJCQUEyQjtRQUMzQixNQUFNLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQy9ELE1BQU0sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLFFB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QUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3RELE9BQU8sS0FBSyxVQUFVLENBQUMsS0FBSyxJQUFJLFVBQVUsQ0FBQyxPQUFPLElBQUksVUFBVSxDQUFDLE9BQU8sR0FBRyxDQUFDO0lBQzdFLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsTUFBTSxDQUFDLGVBQWUsQ0FBQyxXQUFtQjtRQUN6QyxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLHFDQUFxQyxDQUFDLENBQUM7UUFDdkUsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNYLE9BQU8sQ0FBQyxDQUFDO1NBQ1Q7UUFFRCxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7UUFDMUMsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQztRQUUxQyxPQUFPLEtBQUssR0FBRyxPQUFPLEdBQUcsT0FBTyxHQUFHLEtBQUssR0FBRyxPQUFPLEdBQUcsSUFBSSxDQUFDO0lBQzNELENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBUYXNrIFRpbWVyIEZvcm1hdHRlciAtIEhhbmRsZXMgdGltZSBkdXJhdGlvbiBmb3JtYXR0aW5nIHdpdGggdGVtcGxhdGUgc3VwcG9ydFxyXG4gKi9cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVGltZUNvbXBvbmVudHMge1xyXG5cdGhvdXJzOiBudW1iZXI7XHJcblx0bWludXRlczogbnVtYmVyO1xyXG5cdHNlY29uZHM6IG51bWJlcjtcclxuXHR0b3RhbE1pbGxpc2Vjb25kczogbnVtYmVyO1xyXG59XHJcblxyXG4vKipcclxuICogVXRpbGl0eSBjbGFzcyBmb3IgZm9ybWF0dGluZyB0aW1lIGR1cmF0aW9ucyB1c2luZyB0ZW1wbGF0ZSBzdHJpbmdzXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgVGFza1RpbWVyRm9ybWF0dGVyIHtcclxuXHQvKipcclxuXHQgKiBQYXJzZSBkdXJhdGlvbiBpbiBtaWxsaXNlY29uZHMgdG8gdGltZSBjb21wb25lbnRzXHJcblx0ICogQHBhcmFtIGR1cmF0aW9uIER1cmF0aW9uIGluIG1pbGxpc2Vjb25kc1xyXG5cdCAqIEByZXR1cm5zIFRpbWUgY29tcG9uZW50cyBvYmplY3RcclxuXHQgKi9cclxuXHRzdGF0aWMgcGFyc2VUaW1lQ29tcG9uZW50cyhkdXJhdGlvbjogbnVtYmVyKTogVGltZUNvbXBvbmVudHMge1xyXG5cdFx0Y29uc3QgdG90YWxTZWNvbmRzID0gTWF0aC5mbG9vcihkdXJhdGlvbiAvIDEwMDApO1xyXG5cdFx0Y29uc3QgaG91cnMgPSBNYXRoLmZsb29yKHRvdGFsU2Vjb25kcyAvIDM2MDApO1xyXG5cdFx0Y29uc3QgbWludXRlcyA9IE1hdGguZmxvb3IoKHRvdGFsU2Vjb25kcyAlIDM2MDApIC8gNjApO1xyXG5cdFx0Y29uc3Qgc2Vjb25kcyA9IHRvdGFsU2Vjb25kcyAlIDYwO1xyXG5cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGhvdXJzLFxyXG5cdFx0XHRtaW51dGVzLFxyXG5cdFx0XHRzZWNvbmRzLFxyXG5cdFx0XHR0b3RhbE1pbGxpc2Vjb25kczogZHVyYXRpb25cclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBGb3JtYXQgZHVyYXRpb24gdXNpbmcgYSB0ZW1wbGF0ZSBzdHJpbmdcclxuXHQgKiBAcGFyYW0gZHVyYXRpb24gRHVyYXRpb24gaW4gbWlsbGlzZWNvbmRzXHJcblx0ICogQHBhcmFtIHRlbXBsYXRlIFRlbXBsYXRlIHN0cmluZyB3aXRoIHBsYWNlaG9sZGVyc1xyXG5cdCAqIEByZXR1cm5zIEZvcm1hdHRlZCBkdXJhdGlvbiBzdHJpbmdcclxuXHQgKi9cclxuXHRzdGF0aWMgZm9ybWF0RHVyYXRpb24oZHVyYXRpb246IG51bWJlciwgdGVtcGxhdGU6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHRpZiAoZHVyYXRpb24gPCAwKSB7XHJcblx0XHRcdGR1cmF0aW9uID0gMDtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBjb21wb25lbnRzID0gdGhpcy5wYXJzZVRpbWVDb21wb25lbnRzKGR1cmF0aW9uKTtcclxuXHRcdGxldCByZXN1bHQgPSB0ZW1wbGF0ZTtcclxuXHJcblx0XHQvLyBSZXBsYWNlIGFsbCBwbGFjZWhvbGRlcnNcclxuXHRcdHJlc3VsdCA9IHJlc3VsdC5yZXBsYWNlKC9cXHtoXFx9L2csIGNvbXBvbmVudHMuaG91cnMudG9TdHJpbmcoKSk7XHJcblx0XHRyZXN1bHQgPSByZXN1bHQucmVwbGFjZSgvXFx7bVxcfS9nLCBjb21wb25lbnRzLm1pbnV0ZXMudG9TdHJpbmcoKSk7XHJcblx0XHRyZXN1bHQgPSByZXN1bHQucmVwbGFjZSgvXFx7c1xcfS9nLCBjb21wb25lbnRzLnNlY29uZHMudG9TdHJpbmcoKSk7XHJcblx0XHRyZXN1bHQgPSByZXN1bHQucmVwbGFjZSgvXFx7bXNcXH0vZywgY29tcG9uZW50cy50b3RhbE1pbGxpc2Vjb25kcy50b1N0cmluZygpKTtcclxuXHJcblx0XHQvLyBIYW5kbGUgemVybyBjbGVhbnVwIC0gcmVtb3ZlIHNlZ21lbnRzIHRoYXQgYXJlIHplcm9cclxuXHRcdHJlc3VsdCA9IHRoaXMuY2xlYW51cFplcm9WYWx1ZXMocmVzdWx0KTtcclxuXHJcblx0XHQvLyBDbGVhbiB1cCB3aGl0ZXNwYWNlXHJcblx0XHRyZXN1bHQgPSByZXN1bHQucmVwbGFjZSgvXFxzKy9nLCAnICcpLnRyaW0oKTtcclxuXHJcblx0XHQvLyBSZXR1cm4gXCIwc1wiIGlmIHJlc3VsdCBpcyBlbXB0eVxyXG5cdFx0cmV0dXJuIHJlc3VsdCB8fCBcIjBzXCI7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBGb3JtYXQgZHVyYXRpb24gd2l0aCBzbWFydCB1bml0IHNlbGVjdGlvblxyXG5cdCAqIEBwYXJhbSBkdXJhdGlvbiBEdXJhdGlvbiBpbiBtaWxsaXNlY29uZHNcclxuXHQgKiBAcmV0dXJucyBGb3JtYXR0ZWQgZHVyYXRpb24gc3RyaW5nIHdpdGggYXBwcm9wcmlhdGUgdW5pdHNcclxuXHQgKi9cclxuXHRzdGF0aWMgZm9ybWF0RHVyYXRpb25TbWFydChkdXJhdGlvbjogbnVtYmVyKTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IGNvbXBvbmVudHMgPSB0aGlzLnBhcnNlVGltZUNvbXBvbmVudHMoZHVyYXRpb24pO1xyXG5cclxuXHRcdGlmIChjb21wb25lbnRzLmhvdXJzID4gMCkge1xyXG5cdFx0XHRpZiAoY29tcG9uZW50cy5taW51dGVzID4gMCkge1xyXG5cdFx0XHRcdHJldHVybiBgJHtjb21wb25lbnRzLmhvdXJzfWhycyR7Y29tcG9uZW50cy5taW51dGVzfW1pbnNgO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHJldHVybiBgJHtjb21wb25lbnRzLmhvdXJzfWhyc2A7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSBpZiAoY29tcG9uZW50cy5taW51dGVzID4gMCkge1xyXG5cdFx0XHRpZiAoY29tcG9uZW50cy5zZWNvbmRzID4gMzApIHsgLy8gUm91bmQgdXAgaWYgc2Vjb25kcyA+IDMwXHJcblx0XHRcdFx0cmV0dXJuIGAke2NvbXBvbmVudHMubWludXRlcyArIDF9bWluc2A7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0cmV0dXJuIGAke2NvbXBvbmVudHMubWludXRlc31taW5zYDtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIGlmIChjb21wb25lbnRzLnNlY29uZHMgPiAwKSB7XHJcblx0XHRcdHJldHVybiBgJHtjb21wb25lbnRzLnNlY29uZHN9c2A7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRyZXR1cm4gXCIwc1wiO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRm9ybWF0IGR1cmF0aW9uIGZvciBkaXNwbGF5IGluIGRpZmZlcmVudCBjb250ZXh0c1xyXG5cdCAqIEBwYXJhbSBkdXJhdGlvbiBEdXJhdGlvbiBpbiBtaWxsaXNlY29uZHNcclxuXHQgKiBAcGFyYW0gY29udGV4dCBDb250ZXh0IGZvciBmb3JtYXR0aW5nICgnY29tcGFjdCcsICdkZXRhaWxlZCcsICdwcmVjaXNlJylcclxuXHQgKiBAcmV0dXJucyBGb3JtYXR0ZWQgZHVyYXRpb24gc3RyaW5nXHJcblx0ICovXHJcblx0c3RhdGljIGZvcm1hdEZvckNvbnRleHQoZHVyYXRpb246IG51bWJlciwgY29udGV4dDogJ2NvbXBhY3QnIHwgJ2RldGFpbGVkJyB8ICdwcmVjaXNlJyk6IHN0cmluZyB7XHJcblx0XHRjb25zdCBjb21wb25lbnRzID0gdGhpcy5wYXJzZVRpbWVDb21wb25lbnRzKGR1cmF0aW9uKTtcclxuXHJcblx0XHRzd2l0Y2ggKGNvbnRleHQpIHtcclxuXHRcdFx0Y2FzZSAnY29tcGFjdCc6XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuZm9ybWF0RHVyYXRpb25TbWFydChkdXJhdGlvbik7XHJcblxyXG5cdFx0XHRjYXNlICdkZXRhaWxlZCc6XHJcblx0XHRcdFx0Y29uc3QgcGFydHM6IHN0cmluZ1tdID0gW107XHJcblx0XHRcdFx0aWYgKGNvbXBvbmVudHMuaG91cnMgPiAwKSBwYXJ0cy5wdXNoKGAke2NvbXBvbmVudHMuaG91cnN9aGApO1xyXG5cdFx0XHRcdGlmIChjb21wb25lbnRzLm1pbnV0ZXMgPiAwKSBwYXJ0cy5wdXNoKGAke2NvbXBvbmVudHMubWludXRlc31tYCk7XHJcblx0XHRcdFx0aWYgKGNvbXBvbmVudHMuc2Vjb25kcyA+IDApIHBhcnRzLnB1c2goYCR7Y29tcG9uZW50cy5zZWNvbmRzfXNgKTtcclxuXHRcdFx0XHRyZXR1cm4gcGFydHMuam9pbignICcpIHx8ICcwcyc7XHJcblxyXG5cdFx0XHRjYXNlICdwcmVjaXNlJzpcclxuXHRcdFx0XHRpZiAoY29tcG9uZW50cy5ob3VycyA+IDApIHtcclxuXHRcdFx0XHRcdHJldHVybiBgJHtjb21wb25lbnRzLmhvdXJzfToke2NvbXBvbmVudHMubWludXRlcy50b1N0cmluZygpLnBhZFN0YXJ0KDIsICcwJyl9OiR7Y29tcG9uZW50cy5zZWNvbmRzLnRvU3RyaW5nKCkucGFkU3RhcnQoMiwgJzAnKX1gO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gYCR7Y29tcG9uZW50cy5taW51dGVzfToke2NvbXBvbmVudHMuc2Vjb25kcy50b1N0cmluZygpLnBhZFN0YXJ0KDIsICcwJyl9YDtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdHJldHVybiB0aGlzLmZvcm1hdER1cmF0aW9uU21hcnQoZHVyYXRpb24pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVmFsaWRhdGUgdGVtcGxhdGUgc3RyaW5nXHJcblx0ICogQHBhcmFtIHRlbXBsYXRlIFRlbXBsYXRlIHN0cmluZyB0byB2YWxpZGF0ZVxyXG5cdCAqIEByZXR1cm5zIHRydWUgaWYgdGVtcGxhdGUgaXMgdmFsaWRcclxuXHQgKi9cclxuXHRzdGF0aWMgdmFsaWRhdGVUZW1wbGF0ZSh0ZW1wbGF0ZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0XHQvLyBDaGVjayBmb3IgdmFsaWQgcGxhY2Vob2xkZXJzXHJcblx0XHRjb25zdCB2YWxpZFBsYWNlaG9sZGVycyA9IC9cXHtbaG1zXVxcfS9nO1xyXG5cdFx0Y29uc3QgaW52YWxpZFBsYWNlaG9sZGVycyA9IC9cXHtbXmhtc1xcfV0qXFx9L2c7XHJcblxyXG5cdFx0Ly8gVGVtcGxhdGUgc2hvdWxkIGhhdmUgYXQgbGVhc3Qgb25lIHZhbGlkIHBsYWNlaG9sZGVyXHJcblx0XHRjb25zdCBoYXNWYWxpZFBsYWNlaG9sZGVycyA9IHZhbGlkUGxhY2Vob2xkZXJzLnRlc3QodGVtcGxhdGUpO1xyXG5cdFx0XHJcblx0XHQvLyBUZW1wbGF0ZSBzaG91bGQgbm90IGhhdmUgaW52YWxpZCBwbGFjZWhvbGRlcnNcclxuXHRcdGNvbnN0IGhhc0ludmFsaWRQbGFjZWhvbGRlcnMgPSBpbnZhbGlkUGxhY2Vob2xkZXJzLnRlc3QodGVtcGxhdGUpO1xyXG5cclxuXHRcdHJldHVybiBoYXNWYWxpZFBsYWNlaG9sZGVycyAmJiAhaGFzSW52YWxpZFBsYWNlaG9sZGVycztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBkZWZhdWx0IHRlbXBsYXRlIHN1Z2dlc3Rpb25zXHJcblx0ICogQHJldHVybnMgQXJyYXkgb2YgdGVtcGxhdGUgc3VnZ2VzdGlvbnMgd2l0aCBkZXNjcmlwdGlvbnNcclxuXHQgKi9cclxuXHRzdGF0aWMgZ2V0VGVtcGxhdGVTdWdnZXN0aW9ucygpOiBBcnJheTx7IHRlbXBsYXRlOiBzdHJpbmc7IGRlc2NyaXB0aW9uOiBzdHJpbmc7IGV4YW1wbGU6IHN0cmluZyB9PiB7XHJcblx0XHRjb25zdCBzYW1wbGVEdXJhdGlvbiA9IDIgKiAzNjAwMDAwICsgMzUgKiA2MDAwMCArIDQyICogMTAwMDsgLy8gMmggMzVtIDQyc1xyXG5cclxuXHRcdHJldHVybiBbXHJcblx0XHRcdHtcclxuXHRcdFx0XHR0ZW1wbGF0ZTogXCJ7aH1ocnN7bX1taW5zXCIsXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IFwiSG91cnMgYW5kIG1pbnV0ZXMgKGRlZmF1bHQpXCIsXHJcblx0XHRcdFx0ZXhhbXBsZTogdGhpcy5mb3JtYXREdXJhdGlvbihzYW1wbGVEdXJhdGlvbiwgXCJ7aH1ocnN7bX1taW5zXCIpXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHR0ZW1wbGF0ZTogXCJ7aH1oIHttfW0ge3N9c1wiLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBcIkZ1bGwgdGltZSB3aXRoIHNwYWNlc1wiLFxyXG5cdFx0XHRcdGV4YW1wbGU6IHRoaXMuZm9ybWF0RHVyYXRpb24oc2FtcGxlRHVyYXRpb24sIFwie2h9aCB7bX1tIHtzfXNcIilcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHRlbXBsYXRlOiBcIntofTp7bX06e3N9XCIsXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IFwiQ2xvY2sgZm9ybWF0XCIsXHJcblx0XHRcdFx0ZXhhbXBsZTogdGhpcy5mb3JtYXREdXJhdGlvbihzYW1wbGVEdXJhdGlvbiwgXCJ7aH06e219OntzfVwiKVxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0dGVtcGxhdGU6IFwie219bWluc1wiLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBcIk1pbnV0ZXMgb25seVwiLFxyXG5cdFx0XHRcdGV4YW1wbGU6IHRoaXMuZm9ybWF0RHVyYXRpb24oc2FtcGxlRHVyYXRpb24sIFwie219bWluc1wiKVxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0dGVtcGxhdGU6IFwiKHtofWh7bX1tKVwiLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBcIlBhcmVudGhlc2VzIGZvcm1hdFwiLFxyXG5cdFx0XHRcdGV4YW1wbGU6IHRoaXMuZm9ybWF0RHVyYXRpb24oc2FtcGxlRHVyYXRpb24sIFwiKHtofWh7bX1tKVwiKVxyXG5cdFx0XHR9XHJcblx0XHRdO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2xlYW4gdXAgemVybyB2YWx1ZXMgZnJvbSBmb3JtYXR0ZWQgc3RyaW5nXHJcblx0ICogQHBhcmFtIGZvcm1hdHRlZCBGb3JtYXR0ZWQgc3RyaW5nIHdpdGggcG90ZW50aWFsIHplcm8gdmFsdWVzXHJcblx0ICogQHJldHVybnMgQ2xlYW5lZCBzdHJpbmdcclxuXHQgKi9cclxuXHRwcml2YXRlIHN0YXRpYyBjbGVhbnVwWmVyb1ZhbHVlcyhmb3JtYXR0ZWQ6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHQvLyBSZW1vdmUgemVybyBob3VycywgbWludXRlcywgc2Vjb25kcyBpZiB0aGV5IGFwcGVhciBhdCB0aGUgc3RhcnRcclxuXHRcdGZvcm1hdHRlZCA9IGZvcm1hdHRlZC5yZXBsYWNlKC9eMGhycz9cXGIvaSwgJycpO1xyXG5cdFx0Zm9ybWF0dGVkID0gZm9ybWF0dGVkLnJlcGxhY2UoL14wbWlucz9cXGIvaSwgJycpO1xyXG5cdFx0Zm9ybWF0dGVkID0gZm9ybWF0dGVkLnJlcGxhY2UoL14wc2Vjcz9cXGIvaSwgJycpO1xyXG5cdFx0Zm9ybWF0dGVkID0gZm9ybWF0dGVkLnJlcGxhY2UoL14wc1xcYi9pLCAnJyk7XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIHplcm8gdmFsdWVzIHRoYXQgYXBwZWFyIGFmdGVyIHNwYWNlcyAodXNlIHdvcmQgYm91bmRhcmllcylcclxuXHRcdGZvcm1hdHRlZCA9IGZvcm1hdHRlZC5yZXBsYWNlKC9cXHMrMGhycz9cXGIvZ2ksICcnKTtcclxuXHRcdGZvcm1hdHRlZCA9IGZvcm1hdHRlZC5yZXBsYWNlKC9cXHMrMG1pbnM/XFxiL2dpLCAnJyk7XHJcblx0XHRmb3JtYXR0ZWQgPSBmb3JtYXR0ZWQucmVwbGFjZSgvXFxzKzBzZWNzP1xcYi9naSwgJycpO1xyXG5cdFx0Zm9ybWF0dGVkID0gZm9ybWF0dGVkLnJlcGxhY2UoL1xccyswc1xcYi9naSwgJycpO1xyXG5cclxuXHRcdC8vIEhhbmRsZSBwYXR0ZXJucyBsaWtlIFwiMGggMG0gMTVzXCIgLT4gXCIxNXNcIlxyXG5cdFx0Zm9ybWF0dGVkID0gZm9ybWF0dGVkLnJlcGxhY2UoL1xcYjBbaG1dXFxiXFxzKi9nLCAnJyk7XHJcblxyXG5cdFx0cmV0dXJuIGZvcm1hdHRlZDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFBhcnNlIGh1bWFuLXJlYWRhYmxlIHRpbWUgc3RyaW5nIGJhY2sgdG8gbWlsbGlzZWNvbmRzXHJcblx0ICogQHBhcmFtIHRpbWVTdHJpbmcgSHVtYW4tcmVhZGFibGUgdGltZSBzdHJpbmcgKGUuZy4sIFwiMmhyczMwbWluc1wiKVxyXG5cdCAqIEByZXR1cm5zIER1cmF0aW9uIGluIG1pbGxpc2Vjb25kcywgb3IgMCBpZiBwYXJzaW5nIGZhaWxzXHJcblx0ICovXHJcblx0c3RhdGljIHBhcnNlVGltZVN0cmluZyh0aW1lU3RyaW5nOiBzdHJpbmcpOiBudW1iZXIge1xyXG5cdFx0bGV0IHRvdGFsTXMgPSAwO1xyXG5cclxuXHRcdC8vIE1hdGNoIGhvdXJzXHJcblx0XHRjb25zdCBob3Vyc01hdGNoID0gdGltZVN0cmluZy5tYXRjaCgvKFxcZCspaHJzPy9pKTtcclxuXHRcdGlmIChob3Vyc01hdGNoKSB7XHJcblx0XHRcdHRvdGFsTXMgKz0gcGFyc2VJbnQoaG91cnNNYXRjaFsxXSkgKiAzNjAwMDAwO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIE1hdGNoIG1pbnV0ZXNcclxuXHRcdGNvbnN0IG1pbnV0ZXNNYXRjaCA9IHRpbWVTdHJpbmcubWF0Y2goLyhcXGQrKW1pbnM/L2kpO1xyXG5cdFx0aWYgKG1pbnV0ZXNNYXRjaCkge1xyXG5cdFx0XHR0b3RhbE1zICs9IHBhcnNlSW50KG1pbnV0ZXNNYXRjaFsxXSkgKiA2MDAwMDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBNYXRjaCBzZWNvbmRzXHJcblx0XHRjb25zdCBzZWNvbmRzTWF0Y2ggPSB0aW1lU3RyaW5nLm1hdGNoKC8oXFxkKylzKD86ZWNzPyk/L2kpO1xyXG5cdFx0aWYgKHNlY29uZHNNYXRjaCkge1xyXG5cdFx0XHR0b3RhbE1zICs9IHBhcnNlSW50KHNlY29uZHNNYXRjaFsxXSkgKiAxMDAwO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0b3RhbE1zO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRm9ybWF0IGR1cmF0aW9uIGZvciBleHBvcnQvaW1wb3J0IHB1cnBvc2VzXHJcblx0ICogQHBhcmFtIGR1cmF0aW9uIER1cmF0aW9uIGluIG1pbGxpc2Vjb25kc1xyXG5cdCAqIEByZXR1cm5zIElTTyA4NjAxIGR1cmF0aW9uIHN0cmluZ1xyXG5cdCAqL1xyXG5cdHN0YXRpYyBmb3JtYXRGb3JFeHBvcnQoZHVyYXRpb246IG51bWJlcik6IHN0cmluZyB7XHJcblx0XHRjb25zdCBjb21wb25lbnRzID0gdGhpcy5wYXJzZVRpbWVDb21wb25lbnRzKGR1cmF0aW9uKTtcclxuXHRcdHJldHVybiBgUFQke2NvbXBvbmVudHMuaG91cnN9SCR7Y29tcG9uZW50cy5taW51dGVzfU0ke2NvbXBvbmVudHMuc2Vjb25kc31TYDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFBhcnNlIElTTyA4NjAxIGR1cmF0aW9uIHN0cmluZ1xyXG5cdCAqIEBwYXJhbSBpc29EdXJhdGlvbiBJU08gODYwMSBkdXJhdGlvbiBzdHJpbmdcclxuXHQgKiBAcmV0dXJucyBEdXJhdGlvbiBpbiBtaWxsaXNlY29uZHNcclxuXHQgKi9cclxuXHRzdGF0aWMgcGFyc2VGcm9tRXhwb3J0KGlzb0R1cmF0aW9uOiBzdHJpbmcpOiBudW1iZXIge1xyXG5cdFx0Y29uc3QgbWF0Y2ggPSBpc29EdXJhdGlvbi5tYXRjaCgvUFQoPzooXFxkKylIKT8oPzooXFxkKylNKT8oPzooXFxkKylTKT8vKTtcclxuXHRcdGlmICghbWF0Y2gpIHtcclxuXHRcdFx0cmV0dXJuIDA7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgaG91cnMgPSBwYXJzZUludChtYXRjaFsxXSB8fCAnMCcpO1xyXG5cdFx0Y29uc3QgbWludXRlcyA9IHBhcnNlSW50KG1hdGNoWzJdIHx8ICcwJyk7XHJcblx0XHRjb25zdCBzZWNvbmRzID0gcGFyc2VJbnQobWF0Y2hbM10gfHwgJzAnKTtcclxuXHJcblx0XHRyZXR1cm4gaG91cnMgKiAzNjAwMDAwICsgbWludXRlcyAqIDYwMDAwICsgc2Vjb25kcyAqIDEwMDA7XHJcblx0fVxyXG59Il19