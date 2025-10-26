/**
 * Context Detector for Tag Parsing
 *
 * This utility class provides context-aware detection of protected regions
 * where hash symbols (#) should not be interpreted as tag markers.
 *
 * Protected contexts include:
 * - Links (Obsidian [[...]], Markdown [...](url), direct URLs)
 * - Color codes (#RGB, #RRGGBB)
 * - Inline code (`code`)
 * - Other special contexts
 */
/**
 * Context detector for identifying protected regions in markdown content
 */
export class ContextDetector {
    constructor(content) {
        this.protectedRanges = [];
        this.content = content;
        this.protectedRanges = [];
    }
    /**
     * Detect all protected ranges in the content
     * @returns Array of protected ranges sorted by start position
     */
    detectAllProtectedRanges() {
        this.protectedRanges = [];
        // Detect different types of protected content
        // Order matters: more specific patterns should be detected first
        this.detectObsidianLinks();
        this.detectMarkdownLinks();
        this.detectInlineCode();
        this.detectDirectUrls(); // After markdown links to avoid conflicts
        this.detectColorCodes();
        // Merge overlapping ranges and sort
        return this.mergeAndSortRanges();
    }
    /**
     * Check if a position is within any protected range
     * @param position Position to check
     * @returns True if position is protected
     */
    isPositionProtected(position) {
        return this.protectedRanges.some((range) => position >= range.start && position < range.end);
    }
    /**
     * Find the next unprotected hash symbol starting from a given position
     * @param startPos Starting position to search from
     * @returns Position of next unprotected hash, or -1 if none found
     */
    findNextUnprotectedHash(startPos = 0) {
        let pos = startPos;
        while (pos < this.content.length) {
            const hashPos = this.content.indexOf("#", pos);
            if (hashPos === -1) {
                return -1; // No more hash symbols found
            }
            if (!this.isPositionProtected(hashPos)) {
                return hashPos; // Found unprotected hash
            }
            pos = hashPos + 1; // Continue searching after this hash
        }
        return -1;
    }
    /**
     * Detect Obsidian-style links [[...]]
     */
    detectObsidianLinks() {
        const regex = /\[\[([^\]]+)\]\]/g;
        let match;
        while ((match = regex.exec(this.content)) !== null) {
            this.protectedRanges.push({
                start: match.index,
                end: match.index + match[0].length,
                type: "obsidian-link",
                content: match[0],
            });
        }
    }
    /**
     * Detect Markdown-style links [text](url)
     */
    detectMarkdownLinks() {
        // Match [text](url) format, handling nested brackets and parentheses
        const regex = /\[([^\]]*)\]\(([^)]+)\)/g;
        let match;
        while ((match = regex.exec(this.content)) !== null) {
            this.protectedRanges.push({
                start: match.index,
                end: match.index + match[0].length,
                type: "markdown-link",
                content: match[0],
            });
        }
    }
    /**
     * Detect direct URLs (http, https, ftp, mailto, etc.)
     */
    detectDirectUrls() {
        // Match common URL schemes
        const urlRegex = /(?:https?|ftp|mailto|file):\/\/[^\s<>"{}|\\^`\[\]]+/g;
        let match;
        while ((match = urlRegex.exec(this.content)) !== null) {
            this.protectedRanges.push({
                start: match.index,
                end: match.index + match[0].length,
                type: "url",
                content: match[0],
            });
        }
    }
    /**
     * Detect CSS color codes (#RGB, #RRGGBB)
     */
    detectColorCodes() {
        // Match 3 or 6 digit hex color codes
        const colorRegex = /#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})(?![0-9A-Fa-f])/g;
        let match;
        while ((match = colorRegex.exec(this.content)) !== null) {
            // Additional validation: check if it's likely a color code
            if (this.isLikelyColorCode(match.index, match[0])) {
                this.protectedRanges.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    type: "color-code",
                    content: match[0],
                });
            }
        }
    }
    /**
     * Detect inline code blocks (`code`)
     */
    detectInlineCode() {
        // Handle single and multiple backticks
        const codeRegex = /(`+)([^`]|[^`].*?[^`])\1(?!`)/g;
        let match;
        while ((match = codeRegex.exec(this.content)) !== null) {
            this.protectedRanges.push({
                start: match.index,
                end: match.index + match[0].length,
                type: "inline-code",
                content: match[0],
            });
        }
    }
    /**
     * Check if a hash symbol is likely a color code based on context
     */
    isLikelyColorCode(position, colorCode) {
        // Check preceding character - color codes are usually preceded by whitespace,
        // CSS property syntax, or other non-alphanumeric characters
        const prevChar = position > 0 ? this.content[position - 1] : " ";
        const nextPos = position + colorCode.length;
        const nextChar = nextPos < this.content.length ? this.content[nextPos] : " ";
        // Color codes are typically:
        // 1. At word boundaries
        // 2. In CSS-like contexts
        // 3. Not followed by alphanumeric characters (already handled by regex)
        const isWordBoundary = /\s|^|[^a-zA-Z0-9]/.test(prevChar);
        const isValidTermination = /\s|$|[^a-zA-Z0-9]/.test(nextChar);
        return isWordBoundary && isValidTermination;
    }
    /**
     * Merge overlapping ranges and sort by start position
     */
    mergeAndSortRanges() {
        if (this.protectedRanges.length === 0) {
            return [];
        }
        // Sort by start position
        this.protectedRanges.sort((a, b) => a.start - b.start);
        const merged = [];
        let current = this.protectedRanges[0];
        for (let i = 1; i < this.protectedRanges.length; i++) {
            const next = this.protectedRanges[i];
            if (current.end > next.start) {
                // Truly overlapping ranges - merge them
                // Prefer the more specific type (first detected)
                current = {
                    start: current.start,
                    end: Math.max(current.end, next.end),
                    type: current.type,
                    content: this.content.substring(current.start, Math.max(current.end, next.end)),
                };
            }
            else {
                // Non-overlapping - add current and move to next
                merged.push(current);
                current = next;
            }
        }
        // Add the last range
        merged.push(current);
        this.protectedRanges = merged;
        return merged;
    }
    /**
     * Get debug information about detected ranges
     */
    getDebugInfo() {
        const ranges = this.detectAllProtectedRanges();
        return ranges
            .map((range) => `${range.type}: [${range.start}-${range.end}] "${range.content}"`)
            .join("\n");
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dC1kZXRlY3Rvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvbnRleHQtZGV0ZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7O0dBV0c7QUFzQkg7O0dBRUc7QUFDSCxNQUFNLE9BQU8sZUFBZTtJQUkzQixZQUFZLE9BQWU7UUFGbkIsb0JBQWUsR0FBcUIsRUFBRSxDQUFDO1FBRzlDLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxlQUFlLEdBQUcsRUFBRSxDQUFDO0lBQzNCLENBQUM7SUFFRDs7O09BR0c7SUFDSSx3QkFBd0I7UUFDOUIsSUFBSSxDQUFDLGVBQWUsR0FBRyxFQUFFLENBQUM7UUFFMUIsOENBQThDO1FBQzlDLGlFQUFpRTtRQUNqRSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUMzQixJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUMzQixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUN4QixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLDBDQUEwQztRQUNuRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUV4QixvQ0FBb0M7UUFDcEMsT0FBTyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztJQUNsQyxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNJLG1CQUFtQixDQUFDLFFBQWdCO1FBQzFDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQy9CLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxRQUFRLElBQUksS0FBSyxDQUFDLEtBQUssSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FDMUQsQ0FBQztJQUNILENBQUM7SUFFRDs7OztPQUlHO0lBQ0ksdUJBQXVCLENBQUMsV0FBbUIsQ0FBQztRQUNsRCxJQUFJLEdBQUcsR0FBRyxRQUFRLENBQUM7UUFDbkIsT0FBTyxHQUFHLEdBQUcsSUFBSSxDQUFD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T0FBTyxDQUFDLEtBQUs7b0JBQ3BCLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQztvQkFDcEMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO29CQUNsQixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQzlCLE9BQU8sQ0FBQyxLQUFLLEVBQ2IsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FDL0I7aUJBQ0QsQ0FBQzthQUNGO2lCQUFNO2dCQUNOLGlEQUFpRDtnQkFDakQsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDckIsT0FBTyxHQUFHLElBQUksQ0FBQzthQUNmO1NBQ0Q7UUFFRCxxQkFBcUI7UUFDckIsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVyQixJQUFJLENBQUMsZUFBZSxHQUFHLE1BQU0sQ0FBQztRQUM5QixPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFRDs7T0FFRztJQUNJLFlBQVk7UUFDbEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7UUFDL0MsT0FBTyxNQUFNO2FBQ1gsR0FBRyxDQUNILENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FDVCxHQUFHLEtBQUssQ0FBQyxJQUFJLE1BQU0sS0FBSyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsR0FBRyxNQUFNLEtBQUssQ0FBQyxPQUFPLEdBQUcsQ0FDbEU7YUFDQSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDZCxDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQ29udGV4dCBEZXRlY3RvciBmb3IgVGFnIFBhcnNpbmdcclxuICpcclxuICogVGhpcyB1dGlsaXR5IGNsYXNzIHByb3ZpZGVzIGNvbnRleHQtYXdhcmUgZGV0ZWN0aW9uIG9mIHByb3RlY3RlZCByZWdpb25zXHJcbiAqIHdoZXJlIGhhc2ggc3ltYm9scyAoIykgc2hvdWxkIG5vdCBiZSBpbnRlcnByZXRlZCBhcyB0YWcgbWFya2Vycy5cclxuICpcclxuICogUHJvdGVjdGVkIGNvbnRleHRzIGluY2x1ZGU6XHJcbiAqIC0gTGlua3MgKE9ic2lkaWFuIFtbLi4uXV0sIE1hcmtkb3duIFsuLi5dKHVybCksIGRpcmVjdCBVUkxzKVxyXG4gKiAtIENvbG9yIGNvZGVzICgjUkdCLCAjUlJHR0JCKVxyXG4gKiAtIElubGluZSBjb2RlIChgY29kZWApXHJcbiAqIC0gT3RoZXIgc3BlY2lhbCBjb250ZXh0c1xyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBSZXByZXNlbnRzIGEgcHJvdGVjdGVkIHJhbmdlIGluIHRoZSBjb250ZW50IHdoZXJlIHRhZyBwYXJzaW5nIHNob3VsZCBiZSBza2lwcGVkXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIFByb3RlY3RlZFJhbmdlIHtcclxuXHQvKiogU3RhcnQgcG9zaXRpb24gKGluY2x1c2l2ZSkgKi9cclxuXHRzdGFydDogbnVtYmVyO1xyXG5cdC8qKiBFbmQgcG9zaXRpb24gKGV4Y2x1c2l2ZSkgKi9cclxuXHRlbmQ6IG51bWJlcjtcclxuXHQvKiogVHlwZSBvZiBwcm90ZWN0aW9uIGZvciBkZWJ1Z2dpbmcvbG9nZ2luZyAqL1xyXG5cdHR5cGU6XHJcblx0XHR8IFwib2JzaWRpYW4tbGlua1wiXHJcblx0XHR8IFwibWFya2Rvd24tbGlua1wiXHJcblx0XHR8IFwidXJsXCJcclxuXHRcdHwgXCJjb2xvci1jb2RlXCJcclxuXHRcdHwgXCJpbmxpbmUtY29kZVwiXHJcblx0XHR8IFwib3RoZXJcIjtcclxuXHQvKiogT3JpZ2luYWwgbWF0Y2hlZCBjb250ZW50IGZvciBkZWJ1Z2dpbmcgKi9cclxuXHRjb250ZW50Pzogc3RyaW5nO1xyXG59XHJcblxyXG4vKipcclxuICogQ29udGV4dCBkZXRlY3RvciBmb3IgaWRlbnRpZnlpbmcgcHJvdGVjdGVkIHJlZ2lvbnMgaW4gbWFya2Rvd24gY29udGVudFxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIENvbnRleHREZXRlY3RvciB7XHJcblx0cHJpdmF0ZSBjb250ZW50OiBzdHJpbmc7XHJcblx0cHJpdmF0ZSBwcm90ZWN0ZWRSYW5nZXM6IFByb3RlY3RlZFJhbmdlW10gPSBbXTtcclxuXHJcblx0Y29uc3RydWN0b3IoY29udGVudDogc3RyaW5nKSB7XHJcblx0XHR0aGlzLmNvbnRlbnQgPSBjb250ZW50O1xyXG5cdFx0dGhpcy5wcm90ZWN0ZWRSYW5nZXMgPSBbXTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIERldGVjdCBhbGwgcHJvdGVjdGVkIHJhbmdlcyBpbiB0aGUgY29udGVudFxyXG5cdCAqIEByZXR1cm5zIEFycmF5IG9mIHByb3RlY3RlZCByYW5nZXMgc29ydGVkIGJ5IHN0YXJ0IHBvc2l0aW9uXHJcblx0ICovXHJcblx0cHVibGljIGRldGVjdEFsbFByb3RlY3RlZFJhbmdlcygpOiBQcm90ZWN0ZWRSYW5nZVtdIHtcclxuXHRcdHRoaXMucHJvdGVjdGVkUmFuZ2VzID0gW107XHJcblxyXG5cdFx0Ly8gRGV0ZWN0IGRpZmZlcmVudCB0eXBlcyBvZiBwcm90ZWN0ZWQgY29udGVudFxyXG5cdFx0Ly8gT3JkZXIgbWF0dGVyczogbW9yZSBzcGVjaWZpYyBwYXR0ZXJucyBzaG91bGQgYmUgZGV0ZWN0ZWQgZmlyc3RcclxuXHRcdHRoaXMuZGV0ZWN0T2JzaWRpYW5MaW5rcygpO1xyXG5cdFx0dGhpcy5kZXRlY3RNYXJrZG93bkxpbmtzKCk7XHJcblx0XHR0aGlzLmRldGVjdElubGluZUNvZGUoKTtcclxuXHRcdHRoaXMuZGV0ZWN0RGlyZWN0VXJscygpOyAvLyBBZnRlciBtYXJrZG93biBsaW5rcyB0byBhdm9pZCBjb25mbGljdHNcclxuXHRcdHRoaXMuZGV0ZWN0Q29sb3JDb2RlcygpO1xyXG5cclxuXHRcdC8vIE1lcmdlIG92ZXJsYXBwaW5nIHJhbmdlcyBhbmQgc29ydFxyXG5cdFx0cmV0dXJuIHRoaXMubWVyZ2VBbmRTb3J0UmFuZ2VzKCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDaGVjayBpZiBhIHBvc2l0aW9uIGlzIHdpdGhpbiBhbnkgcHJvdGVjdGVkIHJhbmdlXHJcblx0ICogQHBhcmFtIHBvc2l0aW9uIFBvc2l0aW9uIHRvIGNoZWNrXHJcblx0ICogQHJldHVybnMgVHJ1ZSBpZiBwb3NpdGlvbiBpcyBwcm90ZWN0ZWRcclxuXHQgKi9cclxuXHRwdWJsaWMgaXNQb3NpdGlvblByb3RlY3RlZChwb3NpdGlvbjogbnVtYmVyKTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gdGhpcy5wcm90ZWN0ZWRSYW5nZXMuc29tZShcclxuXHRcdFx0KHJhbmdlKSA9PiBwb3NpdGlvbiA+PSByYW5nZS5zdGFydCAmJiBwb3NpdGlvbiA8IHJhbmdlLmVuZFxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEZpbmQgdGhlIG5leHQgdW5wcm90ZWN0ZWQgaGFzaCBzeW1ib2wgc3RhcnRpbmcgZnJvbSBhIGdpdmVuIHBvc2l0aW9uXHJcblx0ICogQHBhcmFtIHN0YXJ0UG9zIFN0YXJ0aW5nIHBvc2l0aW9uIHRvIHNlYXJjaCBmcm9tXHJcblx0ICogQHJldHVybnMgUG9zaXRpb24gb2YgbmV4dCB1bnByb3RlY3RlZCBoYXNoLCBvciAtMSBpZiBub25lIGZvdW5kXHJcblx0ICovXHJcblx0cHVibGljIGZpbmROZXh0VW5wcm90ZWN0ZWRIYXNoKHN0YXJ0UG9zOiBudW1iZXIgPSAwKTogbnVtYmVyIHtcclxuXHRcdGxldCBwb3MgPSBzdGFydFBvcztcclxuXHRcdHdoaWxlIChwb3MgPCB0aGlzLmNvbnRlbnQubGVuZ3RoKSB7XHJcblx0XHRcdGNvbnN0IGhhc2hQb3MgPSB0aGlzLmNvbnRlbnQuaW5kZXhPZihcIiNcIiwgcG9zKTtcclxuXHRcdFx0aWYgKGhhc2hQb3MgPT09IC0xKSB7XHJcblx0XHRcdFx0cmV0dXJuIC0xOyAvLyBObyBtb3JlIGhhc2ggc3ltYm9scyBmb3VuZFxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoIXRoaXMuaXNQb3NpdGlvblByb3RlY3RlZChoYXNoUG9zKSkge1xyXG5cdFx0XHRcdHJldHVybiBoYXNoUG9zOyAvLyBGb3VuZCB1bnByb3RlY3RlZCBoYXNoXHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHBvcyA9IGhhc2hQb3MgKyAxOyAvLyBDb250aW51ZSBzZWFyY2hpbmcgYWZ0ZXIgdGhpcyBoYXNoXHJcblx0XHR9XHJcblx0XHRyZXR1cm4gLTE7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBEZXRlY3QgT2JzaWRpYW4tc3R5bGUgbGlua3MgW1suLi5dXVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZGV0ZWN0T2JzaWRpYW5MaW5rcygpOiB2b2lkIHtcclxuXHRcdGNvbnN0IHJlZ2V4ID0gL1xcW1xcWyhbXlxcXV0rKVxcXVxcXS9nO1xyXG5cdFx0bGV0IG1hdGNoO1xyXG5cclxuXHRcdHdoaWxlICgobWF0Y2ggPSByZWdleC5leGVjKHRoaXMuY29udGVudCkpICE9PSBudWxsKSB7XHJcblx0XHRcdHRoaXMucHJvdGVjdGVkUmFuZ2VzLnB1c2goe1xyXG5cdFx0XHRcdHN0YXJ0OiBtYXRjaC5pbmRleCxcclxuXHRcdFx0XHRlbmQ6IG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoLFxyXG5cdFx0XHRcdHR5cGU6IFwib2JzaWRpYW4tbGlua1wiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IG1hdGNoWzBdLFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIERldGVjdCBNYXJrZG93bi1zdHlsZSBsaW5rcyBbdGV4dF0odXJsKVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZGV0ZWN0TWFya2Rvd25MaW5rcygpOiB2b2lkIHtcclxuXHRcdC8vIE1hdGNoIFt0ZXh0XSh1cmwpIGZvcm1hdCwgaGFuZGxpbmcgbmVzdGVkIGJyYWNrZXRzIGFuZCBwYXJlbnRoZXNlc1xyXG5cdFx0Y29uc3QgcmVnZXggPSAvXFxbKFteXFxdXSopXFxdXFwoKFteKV0rKVxcKS9nO1xyXG5cdFx0bGV0IG1hdGNoO1xyXG5cclxuXHRcdHdoaWxlICgobWF0Y2ggPSByZWdleC5leGVjKHRoaXMuY29udGVudCkpICE9PSBudWxsKSB7XHJcblx0XHRcdHRoaXMucHJvdGVjdGVkUmFuZ2VzLnB1c2goe1xyXG5cdFx0XHRcdHN0YXJ0OiBtYXRjaC5pbmRleCxcclxuXHRcdFx0XHRlbmQ6IG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoLFxyXG5cdFx0XHRcdHR5cGU6IFwibWFya2Rvd24tbGlua1wiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IG1hdGNoWzBdLFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIERldGVjdCBkaXJlY3QgVVJMcyAoaHR0cCwgaHR0cHMsIGZ0cCwgbWFpbHRvLCBldGMuKVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZGV0ZWN0RGlyZWN0VXJscygpOiB2b2lkIHtcclxuXHRcdC8vIE1hdGNoIGNvbW1vbiBVUkwgc2NoZW1lc1xyXG5cdFx0Y29uc3QgdXJsUmVnZXggPSAvKD86aHR0cHM/fGZ0cHxtYWlsdG98ZmlsZSk6XFwvXFwvW15cXHM8Plwie318XFxcXF5gXFxbXFxdXSsvZztcclxuXHRcdGxldCBtYXRjaDtcclxuXHJcblx0XHR3aGlsZSAoKG1hdGNoID0gdXJsUmVnZXguZXhlYyh0aGlzLmNvbnRlbnQpKSAhPT0gbnVsbCkge1xyXG5cdFx0XHR0aGlzLnByb3RlY3RlZFJhbmdlcy5wdXNoKHtcclxuXHRcdFx0XHRzdGFydDogbWF0Y2guaW5kZXgsXHJcblx0XHRcdFx0ZW5kOiBtYXRjaC5pbmRleCArIG1hdGNoWzBdLmxlbmd0aCxcclxuXHRcdFx0XHR0eXBlOiBcInVybFwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IG1hdGNoWzBdLFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIERldGVjdCBDU1MgY29sb3IgY29kZXMgKCNSR0IsICNSUkdHQkIpXHJcblx0ICovXHJcblx0cHJpdmF0ZSBkZXRlY3RDb2xvckNvZGVzKCk6IHZvaWQge1xyXG5cdFx0Ly8gTWF0Y2ggMyBvciA2IGRpZ2l0IGhleCBjb2xvciBjb2Rlc1xyXG5cdFx0Y29uc3QgY29sb3JSZWdleCA9IC8jKFswLTlBLUZhLWZdezN9fFswLTlBLUZhLWZdezZ9KSg/IVswLTlBLUZhLWZdKS9nO1xyXG5cdFx0bGV0IG1hdGNoO1xyXG5cclxuXHRcdHdoaWxlICgobWF0Y2ggPSBjb2xvclJlZ2V4LmV4ZWModGhpcy5jb250ZW50KSkgIT09IG51bGwpIHtcclxuXHRcdFx0Ly8gQWRkaXRpb25hbCB2YWxpZGF0aW9uOiBjaGVjayBpZiBpdCdzIGxpa2VseSBhIGNvbG9yIGNvZGVcclxuXHRcdFx0aWYgKHRoaXMuaXNMaWtlbHlDb2xvckNvZGUobWF0Y2guaW5kZXgsIG1hdGNoWzBdKSkge1xyXG5cdFx0XHRcdHRoaXMucHJvdGVjdGVkUmFuZ2VzLnB1c2goe1xyXG5cdFx0XHRcdFx0c3RhcnQ6IG1hdGNoLmluZGV4LFxyXG5cdFx0XHRcdFx0ZW5kOiBtYXRjaC5pbmRleCArIG1hdGNoWzBdLmxlbmd0aCxcclxuXHRcdFx0XHRcdHR5cGU6IFwiY29sb3ItY29kZVwiLFxyXG5cdFx0XHRcdFx0Y29udGVudDogbWF0Y2hbMF0sXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIERldGVjdCBpbmxpbmUgY29kZSBibG9ja3MgKGBjb2RlYClcclxuXHQgKi9cclxuXHRwcml2YXRlIGRldGVjdElubGluZUNvZGUoKTogdm9pZCB7XHJcblx0XHQvLyBIYW5kbGUgc2luZ2xlIGFuZCBtdWx0aXBsZSBiYWNrdGlja3NcclxuXHRcdGNvbnN0IGNvZGVSZWdleCA9IC8oYCspKFteYF18W15gXS4qP1teYF0pXFwxKD8hYCkvZztcclxuXHRcdGxldCBtYXRjaDtcclxuXHJcblx0XHR3aGlsZSAoKG1hdGNoID0gY29kZVJlZ2V4LmV4ZWModGhpcy5jb250ZW50KSkgIT09IG51bGwpIHtcclxuXHRcdFx0dGhpcy5wcm90ZWN0ZWRSYW5nZXMucHVzaCh7XHJcblx0XHRcdFx0c3RhcnQ6IG1hdGNoLmluZGV4LFxyXG5cdFx0XHRcdGVuZDogbWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGgsXHJcblx0XHRcdFx0dHlwZTogXCJpbmxpbmUtY29kZVwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IG1hdGNoWzBdLFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGlmIGEgaGFzaCBzeW1ib2wgaXMgbGlrZWx5IGEgY29sb3IgY29kZSBiYXNlZCBvbiBjb250ZXh0XHJcblx0ICovXHJcblx0cHJpdmF0ZSBpc0xpa2VseUNvbG9yQ29kZShwb3NpdGlvbjogbnVtYmVyLCBjb2xvckNvZGU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0Ly8gQ2hlY2sgcHJlY2VkaW5nIGNoYXJhY3RlciAtIGNvbG9yIGNvZGVzIGFyZSB1c3VhbGx5IHByZWNlZGVkIGJ5IHdoaXRlc3BhY2UsXHJcblx0XHQvLyBDU1MgcHJvcGVydHkgc3ludGF4LCBvciBvdGhlciBub24tYWxwaGFudW1lcmljIGNoYXJhY3RlcnNcclxuXHRcdGNvbnN0IHByZXZDaGFyID0gcG9zaXRpb24gPiAwID8gdGhpcy5jb250ZW50W3Bvc2l0aW9uIC0gMV0gOiBcIiBcIjtcclxuXHRcdGNvbnN0IG5leHRQb3MgPSBwb3NpdGlvbiArIGNvbG9yQ29kZS5sZW5ndGg7XHJcblx0XHRjb25zdCBuZXh0Q2hhciA9XHJcblx0XHRcdG5leHRQb3MgPCB0aGlzLmNvbnRlbnQubGVuZ3RoID8gdGhpcy5jb250ZW50W25leHRQb3NdIDogXCIgXCI7XHJcblxyXG5cdFx0Ly8gQ29sb3IgY29kZXMgYXJlIHR5cGljYWxseTpcclxuXHRcdC8vIDEuIEF0IHdvcmQgYm91bmRhcmllc1xyXG5cdFx0Ly8gMi4gSW4gQ1NTLWxpa2UgY29udGV4dHNcclxuXHRcdC8vIDMuIE5vdCBmb2xsb3dlZCBieSBhbHBoYW51bWVyaWMgY2hhcmFjdGVycyAoYWxyZWFkeSBoYW5kbGVkIGJ5IHJlZ2V4KVxyXG5cdFx0Y29uc3QgaXNXb3JkQm91bmRhcnkgPSAvXFxzfF58W15hLXpBLVowLTldLy50ZXN0KHByZXZDaGFyKTtcclxuXHRcdGNvbnN0IGlzVmFsaWRUZXJtaW5hdGlvbiA9IC9cXHN8JHxbXmEtekEtWjAtOV0vLnRlc3QobmV4dENoYXIpO1xyXG5cclxuXHRcdHJldHVybiBpc1dvcmRCb3VuZGFyeSAmJiBpc1ZhbGlkVGVybWluYXRpb247XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBNZXJnZSBvdmVybGFwcGluZyByYW5nZXMgYW5kIHNvcnQgYnkgc3RhcnQgcG9zaXRpb25cclxuXHQgKi9cclxuXHRwcml2YXRlIG1lcmdlQW5kU29ydFJhbmdlcygpOiBQcm90ZWN0ZWRSYW5nZVtdIHtcclxuXHRcdGlmICh0aGlzLnByb3RlY3RlZFJhbmdlcy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0cmV0dXJuIFtdO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFNvcnQgYnkgc3RhcnQgcG9zaXRpb25cclxuXHRcdHRoaXMucHJvdGVjdGVkUmFuZ2VzLnNvcnQoKGEsIGIpID0+IGEuc3RhcnQgLSBiLnN0YXJ0KTtcclxuXHJcblx0XHRjb25zdCBtZXJnZWQ6IFByb3RlY3RlZFJhbmdlW10gPSBbXTtcclxuXHRcdGxldCBjdXJyZW50ID0gdGhpcy5wcm90ZWN0ZWRSYW5nZXNbMF07XHJcblxyXG5cdFx0Zm9yIChsZXQgaSA9IDE7IGkgPCB0aGlzLnByb3RlY3RlZFJhbmdlcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRjb25zdCBuZXh0ID0gdGhpcy5wcm90ZWN0ZWRSYW5nZXNbaV07XHJcblxyXG5cdFx0XHRpZiAoY3VycmVudC5lbmQgPiBuZXh0LnN0YXJ0KSB7XHJcblx0XHRcdFx0Ly8gVHJ1bHkgb3ZlcmxhcHBpbmcgcmFuZ2VzIC0gbWVyZ2UgdGhlbVxyXG5cdFx0XHRcdC8vIFByZWZlciB0aGUgbW9yZSBzcGVjaWZpYyB0eXBlIChmaXJzdCBkZXRlY3RlZClcclxuXHRcdFx0XHRjdXJyZW50ID0ge1xyXG5cdFx0XHRcdFx0c3RhcnQ6IGN1cnJlbnQuc3RhcnQsXHJcblx0XHRcdFx0XHRlbmQ6IE1hdGgubWF4KGN1cnJlbnQuZW5kLCBuZXh0LmVuZCksXHJcblx0XHRcdFx0XHR0eXBlOiBjdXJyZW50LnR5cGUsIC8vIEtlZXAgdGhlIGZpcnN0IChtb3JlIHNwZWNpZmljKSB0eXBlXHJcblx0XHRcdFx0XHRjb250ZW50OiB0aGlzLmNvbnRlbnQuc3Vic3RyaW5nKFxyXG5cdFx0XHRcdFx0XHRjdXJyZW50LnN0YXJ0LFxyXG5cdFx0XHRcdFx0XHRNYXRoLm1heChjdXJyZW50LmVuZCwgbmV4dC5lbmQpXHJcblx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gTm9uLW92ZXJsYXBwaW5nIC0gYWRkIGN1cnJlbnQgYW5kIG1vdmUgdG8gbmV4dFxyXG5cdFx0XHRcdG1lcmdlZC5wdXNoKGN1cnJlbnQpO1xyXG5cdFx0XHRcdGN1cnJlbnQgPSBuZXh0O1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWRkIHRoZSBsYXN0IHJhbmdlXHJcblx0XHRtZXJnZWQucHVzaChjdXJyZW50KTtcclxuXHJcblx0XHR0aGlzLnByb3RlY3RlZFJhbmdlcyA9IG1lcmdlZDtcclxuXHRcdHJldHVybiBtZXJnZWQ7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgZGVidWcgaW5mb3JtYXRpb24gYWJvdXQgZGV0ZWN0ZWQgcmFuZ2VzXHJcblx0ICovXHJcblx0cHVibGljIGdldERlYnVnSW5mbygpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgcmFuZ2VzID0gdGhpcy5kZXRlY3RBbGxQcm90ZWN0ZWRSYW5nZXMoKTtcclxuXHRcdHJldHVybiByYW5nZXNcclxuXHRcdFx0Lm1hcChcclxuXHRcdFx0XHQocmFuZ2UpID0+XHJcblx0XHRcdFx0XHRgJHtyYW5nZS50eXBlfTogWyR7cmFuZ2Uuc3RhcnR9LSR7cmFuZ2UuZW5kfV0gXCIke3JhbmdlLmNvbnRlbnR9XCJgXHJcblx0XHRcdClcclxuXHRcdFx0LmpvaW4oXCJcXG5cIik7XHJcblx0fVxyXG59XHJcbiJdfQ==