import { __awaiter } from "tslib";
import { getFrontMatterInfo, TFile } from "obsidian";
import { moment } from "obsidian";
/**
 * Get template file with automatic .md extension detection
 * @param app - Obsidian app instance
 * @param templatePath - Template file path (may or may not include .md extension)
 * @returns TFile instance if found, null otherwise
 */
function getTemplateFile(app, templatePath) {
    // First try the original path
    let templateFile = app.vault.getFileByPath(templatePath);
    if (!templateFile && !templatePath.endsWith(".md")) {
        // If not found and doesn't end with .md, try adding .md extension
        const pathWithExtension = `${templatePath}.md`;
        templateFile = app.vault.getFileByPath(pathWithExtension);
    }
    return templateFile;
}
/**
 * Sanitize filename by replacing unsafe characters with safe alternatives
 * This function only sanitizes the filename part, not directory separators
 * @param filename - The filename to sanitize
 * @returns The sanitized filename
 */
function sanitizeFilename(filename) {
    // Replace unsafe characters with safe alternatives, but keep forward slashes for paths
    return filename
        .replace(/[<>:"|*?\\]/g, "-") // Replace unsafe chars with dash
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim(); // Remove leading/trailing whitespace
}
/**
 * Sanitize a file path by sanitizing only the filename part while preserving directory structure
 * @param filePath - The file path to sanitize
 * @returns The sanitized file path
 */
function sanitizeFilePath(filePath) {
    const pathParts = filePath.split("/");
    // Sanitize each part of the path except preserve the directory structure
    const sanitizedParts = pathParts.map((part, index) => {
        // For the last part (filename), we can be more restrictive
        if (index === pathParts.length - 1) {
            return sanitizeFilename(part);
        }
        // For directory names, we still need to avoid problematic characters but can be less restrictive
        return part
            .replace(/[<>:"|*?\\]/g, "-")
            .replace(/\s+/g, " ")
            .trim();
    });
    return sanitizedParts.join("/");
}
/**
 * Process file path with date templates
 * Replaces {{DATE:format}} patterns with current date formatted using moment.js
 * Note: Use file-system safe formats (avoid characters like : < > | " * ? \)
 * @param filePath - The file path that may contain date templates
 * @returns The processed file path with date templates replaced
 */
export function processDateTemplates(filePath) {
    // Match patterns like {{DATE:YYYY-MM-DD}} or {{date:YYYY-MM-DD-HHmm}}
    const dateTemplateRegex = /\{\{DATE?:([^}]+)\}\}/gi;
    const processedPath = filePath.replace(dateTemplateRegex, (match, format) => {
        try {
            // Check if format is empty or only whitespace
            if (!format || format.trim() === "") {
                return match; // Return original match for empty formats
            }
            // Use moment to format the current date with the specified format
            const formattedDate = moment().format(format);
            // Return the formatted date without sanitizing here to preserve path structure
            return formattedDate;
        }
        catch (error) {
            console.warn(`Invalid date format in template: ${format}`, error);
            // Return the original match if formatting fails
            return match;
        }
    });
    // Sanitize the entire path while preserving directory structure
    return sanitizeFilePath(processedPath);
}
// Save the captured content to the target file
export function saveCapture(app, content, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const { targetFile, appendToFile, targetType, targetHeading, dailyNoteSettings, } = options;
        let filePath;
        // Determine the target file path based on target type
        if (targetType === "daily-note" && dailyNoteSettings) {
            // Generate daily note file path
            const dateStr = moment().format(dailyNoteSettings.format);
            // For daily notes, the format might include path separators (e.g., YYYY-MM/YYYY-MM-DD)
            // We need to preserve the path structure and only sanitize the final filename
            const pathWithDate = dailyNoteSettings.folder
                ? `${dailyNoteSettings.folder}/${dateStr}.md`
                : `${dateStr}.md`;
            filePath = sanitizeFilePath(pathWithDate);
        }
        else {
            // Use fixed file path
            const rawFilePath = targetFile || "Quick Capture.md";
            filePath = processDateTemplates(rawFilePath);
        }
        let file = app.vault.getFileByPath(filePath);
        if (!file) {
            // Create directory structure if needed
            const pathParts = filePath.split("/");
            if (pathParts.length > 1) {
                const dirPath = pathParts.slice(0, -1).join("/");
                try {
                    yield app.vault.createFolder(dirPath);
                }
                catch (e) {
                    // Directory might already exist, ignore error
                }
            }
            // Create initial content for new file
            let initialContent = "";
            // If it's a daily note and has a template, use the template
            if (targetType === "daily-note" && (dailyNoteSettings === null || dailyNoteSettings === void 0 ? void 0 : dailyNoteSettings.template)) {
                const templateFile = getTemplateFile(app, dailyNoteSettings.template);
                if (templateFile instanceof TFile) {
                    try {
                        initialContent = yield app.vault.read(templateFile);
                    }
                    catch (e) {
                        console.warn("Failed to read template file:", e);
                    }
                }
                else {
                    console.warn(`Template file not found: ${dailyNoteSettings.template} (tried with and without .md extension)`);
                }
            }
            // Add content based on append mode and heading
            if (targetHeading) {
                // If heading is specified, add content under that heading
                if (initialContent) {
                    // Check if heading already exists in template
                    const headingRegex = new RegExp(`^#{1,6}\\s+${targetHeading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m");
                    if (headingRegex.test(initialContent)) {
                        // Heading exists, add content after it
                        initialContent = initialContent.replace(headingRegex, `$&\n\n${content}`);
                    }
                    else {
                        // Heading doesn't exist, add it with content
                        initialContent += `\n\n## ${targetHeading}\n\n${content}`;
                    }
                }
                else {
                    initialContent = `## ${targetHeading}\n\n${content}`;
                }
            }
            else {
                // No specific heading
                if (appendToFile === "prepend") {
                    initialContent = initialContent
                        ? `${content}\n\n${initialContent}`
                        : content;
                }
                else {
                    initialContent = initialContent
                        ? `${initialContent}\n\n${content}`
                        : content;
                }
            }
            // Create the file
            file = yield app.vault.create(filePath, initialContent);
        }
        else if (file instanceof TFile) {
            // Append or replace content in existing file
            yield app.vault.process(file, (data) => {
                // If heading is specified, try to add content under that heading
                if (targetHeading) {
                    return addContentUnderHeading(data, content, targetHeading, appendToFile || "append");
                }
                // Original logic for no heading specified
                switch (appendToFile) {
                    case "append": {
                        // Get frontmatter information using Obsidian API
                        const fmInfo = getFrontMatterInfo(data);
                        // Add a newline before the new content if needed
                        const separator = data.endsWith("\n") ? "" : "\n";
                        if (fmInfo.exists) {
                            // If frontmatter exists, use the contentStart position to append after it
                            const contentStartPos = fmInfo.contentStart;
                            if (contentStartPos !== undefined) {
                                const contentBeforeFrontmatter = data.slice(0, contentStartPos);
                                const contentAfterFrontmatter = data.slice(contentStartPos);
                                return (contentBeforeFrontmatter +
                                    contentAfterFrontmatter +
                                    separator +
                                    content);
                            }
                            else {
                                // Fallback if we can't get the exact position
                                return data + separator + content;
                            }
                        }
                        else {
                            // No frontmatter, just append to the end
                            return data + separator + content;
                        }
                    }
                    case "prepend": {
                        // Get frontmatter information
                        const fmInfo = getFrontMatterInfo(data);
                        const separator = "\n";
                        if (fmInfo.exists && fmInfo.contentStart !== undefined) {
                            // Insert after frontmatter but before content
                            return (data.slice(0, fmInfo.contentStart) +
                                content +
                                separator +
                                data.slice(fmInfo.contentStart));
                        }
                        else {
                            // No frontmatter, prepend to beginning
                            return content + separator + data;
                        }
                    }
                    case "replace":
                    default:
                        return content;
                }
            });
        }
        else {
            throw new Error("Target is not a file");
        }
        return;
    });
}
/**
 * Add content under a specific heading in markdown text
 * @param data - The original markdown content
 * @param content - The content to add
 * @param heading - The heading to add content under
 * @param mode - How to add the content (append/prepend)
 * @returns The modified markdown content
 */
function addContentUnderHeading(data, content, heading, mode) {
    const lines = data.split("\n");
    const headingRegex = new RegExp(`^(#{1,6})\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i");
    let headingIndex = -1;
    let headingLevel = 0;
    // Find the target heading
    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(headingRegex);
        if (match) {
            headingIndex = i;
            headingLevel = match[1].length;
            break;
        }
    }
    if (headingIndex === -1) {
        // Heading not found, add it at the end
        const separator = data.endsWith("\n") ? "" : "\n";
        return `${data}${separator}\n## ${heading}\n\n${content}`;
    }
    // Find the end of this section (next heading of same or higher level)
    let sectionEndIndex = lines.length;
    for (let i = headingIndex + 1; i < lines.length; i++) {
        const line = lines[i];
        const headingMatch = line.match(/^(#{1,6})\s+/);
        if (headingMatch && headingMatch[1].length <= headingLevel) {
            sectionEndIndex = i;
            break;
        }
    }
    // Find the insertion point within the section
    let insertIndex;
    if (mode === "prepend") {
        // Insert right after the heading (skip empty lines)
        insertIndex = headingIndex + 1;
        while (insertIndex < sectionEndIndex &&
            lines[insertIndex].trim() === "") {
            insertIndex++;
        }
    }
    else {
        // Insert at the end of the section (before next heading)
        insertIndex = sectionEndIndex;
        // Skip trailing empty lines in the section
        while (insertIndex > headingIndex + 1 &&
            lines[insertIndex - 1].trim() === "") {
            insertIndex--;
        }
    }
    // Insert the content
    const contentLines = content.split("\n");
    const result = [
        ...lines.slice(0, insertIndex),
        "",
        ...contentLines,
        "",
        ...lines.slice(insertIndex),
    ];
    return result.join("\n");
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS1vcGVyYXRpb25zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZS1vcGVyYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBQU8sa0JBQWtCLEVBQUUsS0FBSyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBRTFELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFFbEM7Ozs7O0dBS0c7QUFDSCxTQUFTLGVBQWUsQ0FBQyxHQUFRLEVBQUUsWUFBb0I7SUFDdEQsOEJBQThCO0lBQzlCLElBQUksWUFBWSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBRXpELElBQUksQ0FBQyxZQUFZLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQ25ELGtFQUFrRTtRQUNsRSxNQUFNLGlCQUFpQixHQUFHLEdBQUcsWUFBWSxLQUFLLENBQUM7UUFDL0MsWUFBWSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLENBQUM7S0FDMUQ7SUFFRCxPQUFPLFlBQVksQ0FBQztBQUNyQixDQUFDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxTQUFTLGdCQUFnQixDQUFDLFFBQWdCO0lBQ3pDLHVGQUF1RjtJQUN2RixPQUFPLFFBQVE7U0FDYixPQUFPLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxDQUFDLGlDQUFpQztTQUM5RCxPQUFPLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLHVCQUF1QjtTQUM1QyxJQUFJLEVBQUUsQ0FBQyxDQUFDLHFDQUFxQztBQUNoRCxDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILFNBQVMsZ0JBQWdCLENBQUMsUUFBZ0I7SUFDekMsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN0Qyx5RUFBeUU7SUFDekUsTUFBTSxjQUFjLEdBQUcs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Q0FBQztRQUM5QiwyQ0FBMkM7UUFDM0MsT0FDQyxXQUFXLEdBQUcsWUFBWSxHQUFHLENBQUM7WUFDOUIsS0FBSyxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQ2xDO1lBQ0YsV0FBVyxFQUFFLENBQUM7U0FDZDtLQUNEO0lBRUQscUJBQXFCO0lBQ3JCLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDekMsTUFBTSxNQUFNLEdBQUc7UUFDZCxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQztRQUM5QixFQUFFO1FBQ0YsR0FBRyxZQUFZO1FBQ2YsRUFBRTtRQUNGLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUM7S0FDM0IsQ0FBQztJQUVGLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMxQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwLCBnZXRGcm9udE1hdHRlckluZm8sIFRGaWxlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFF1aWNrQ2FwdHVyZU9wdGlvbnMgfSBmcm9tIFwiQC9lZGl0b3ItZXh0ZW5zaW9ucy9jb3JlL3F1aWNrLWNhcHR1cmUtcGFuZWxcIjtcclxuaW1wb3J0IHsgbW9tZW50IH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcblxyXG4vKipcclxuICogR2V0IHRlbXBsYXRlIGZpbGUgd2l0aCBhdXRvbWF0aWMgLm1kIGV4dGVuc2lvbiBkZXRlY3Rpb25cclxuICogQHBhcmFtIGFwcCAtIE9ic2lkaWFuIGFwcCBpbnN0YW5jZVxyXG4gKiBAcGFyYW0gdGVtcGxhdGVQYXRoIC0gVGVtcGxhdGUgZmlsZSBwYXRoIChtYXkgb3IgbWF5IG5vdCBpbmNsdWRlIC5tZCBleHRlbnNpb24pXHJcbiAqIEByZXR1cm5zIFRGaWxlIGluc3RhbmNlIGlmIGZvdW5kLCBudWxsIG90aGVyd2lzZVxyXG4gKi9cclxuZnVuY3Rpb24gZ2V0VGVtcGxhdGVGaWxlKGFwcDogQXBwLCB0ZW1wbGF0ZVBhdGg6IHN0cmluZyk6IFRGaWxlIHwgbnVsbCB7XHJcblx0Ly8gRmlyc3QgdHJ5IHRoZSBvcmlnaW5hbCBwYXRoXHJcblx0bGV0IHRlbXBsYXRlRmlsZSA9IGFwcC52YXVsdC5nZXRGaWxlQnlQYXRoKHRlbXBsYXRlUGF0aCk7XHJcblxyXG5cdGlmICghdGVtcGxhdGVGaWxlICYmICF0ZW1wbGF0ZVBhdGguZW5kc1dpdGgoXCIubWRcIikpIHtcclxuXHRcdC8vIElmIG5vdCBmb3VuZCBhbmQgZG9lc24ndCBlbmQgd2l0aCAubWQsIHRyeSBhZGRpbmcgLm1kIGV4dGVuc2lvblxyXG5cdFx0Y29uc3QgcGF0aFdpdGhFeHRlbnNpb24gPSBgJHt0ZW1wbGF0ZVBhdGh9Lm1kYDtcclxuXHRcdHRlbXBsYXRlRmlsZSA9IGFwcC52YXVsdC5nZXRGaWxlQnlQYXRoKHBhdGhXaXRoRXh0ZW5zaW9uKTtcclxuXHR9XHJcblxyXG5cdHJldHVybiB0ZW1wbGF0ZUZpbGU7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTYW5pdGl6ZSBmaWxlbmFtZSBieSByZXBsYWNpbmcgdW5zYWZlIGNoYXJhY3RlcnMgd2l0aCBzYWZlIGFsdGVybmF0aXZlc1xyXG4gKiBUaGlzIGZ1bmN0aW9uIG9ubHkgc2FuaXRpemVzIHRoZSBmaWxlbmFtZSBwYXJ0LCBub3QgZGlyZWN0b3J5IHNlcGFyYXRvcnNcclxuICogQHBhcmFtIGZpbGVuYW1lIC0gVGhlIGZpbGVuYW1lIHRvIHNhbml0aXplXHJcbiAqIEByZXR1cm5zIFRoZSBzYW5pdGl6ZWQgZmlsZW5hbWVcclxuICovXHJcbmZ1bmN0aW9uIHNhbml0aXplRmlsZW5hbWUoZmlsZW5hbWU6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0Ly8gUmVwbGFjZSB1bnNhZmUgY2hhcmFjdGVycyB3aXRoIHNhZmUgYWx0ZXJuYXRpdmVzLCBidXQga2VlcCBmb3J3YXJkIHNsYXNoZXMgZm9yIHBhdGhzXHJcblx0cmV0dXJuIGZpbGVuYW1lXHJcblx0XHQucmVwbGFjZSgvWzw+OlwifCo/XFxcXF0vZywgXCItXCIpIC8vIFJlcGxhY2UgdW5zYWZlIGNoYXJzIHdpdGggZGFzaFxyXG5cdFx0LnJlcGxhY2UoL1xccysvZywgXCIgXCIpIC8vIE5vcm1hbGl6ZSB3aGl0ZXNwYWNlXHJcblx0XHQudHJpbSgpOyAvLyBSZW1vdmUgbGVhZGluZy90cmFpbGluZyB3aGl0ZXNwYWNlXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTYW5pdGl6ZSBhIGZpbGUgcGF0aCBieSBzYW5pdGl6aW5nIG9ubHkgdGhlIGZpbGVuYW1lIHBhcnQgd2hpbGUgcHJlc2VydmluZyBkaXJlY3Rvcnkgc3RydWN0dXJlXHJcbiAqIEBwYXJhbSBmaWxlUGF0aCAtIFRoZSBmaWxlIHBhdGggdG8gc2FuaXRpemVcclxuICogQHJldHVybnMgVGhlIHNhbml0aXplZCBmaWxlIHBhdGhcclxuICovXHJcbmZ1bmN0aW9uIHNhbml0aXplRmlsZVBhdGgoZmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0Y29uc3QgcGF0aFBhcnRzID0gZmlsZVBhdGguc3BsaXQoXCIvXCIpO1xyXG5cdC8vIFNhbml0aXplIGVhY2ggcGFydCBvZiB0aGUgcGF0aCBleGNlcHQgcHJlc2VydmUgdGhlIGRpcmVjdG9yeSBzdHJ1Y3R1cmVcclxuXHRjb25zdCBzYW5pdGl6ZWRQYXJ0cyA9IHBhdGhQYXJ0cy5tYXAoKHBhcnQsIGluZGV4KSA9PiB7XHJcblx0XHQvLyBGb3IgdGhlIGxhc3QgcGFydCAoZmlsZW5hbWUpLCB3ZSBjYW4gYmUgbW9yZSByZXN0cmljdGl2ZVxyXG5cdFx0aWYgKGluZGV4ID09PSBwYXRoUGFydHMubGVuZ3RoIC0gMSkge1xyXG5cdFx0XHRyZXR1cm4gc2FuaXRpemVGaWxlbmFtZShwYXJ0KTtcclxuXHRcdH1cclxuXHRcdC8vIEZvciBkaXJlY3RvcnkgbmFtZXMsIHdlIHN0aWxsIG5lZWQgdG8gYXZvaWQgcHJvYmxlbWF0aWMgY2hhcmFjdGVycyBidXQgY2FuIGJlIGxlc3MgcmVzdHJpY3RpdmVcclxuXHRcdHJldHVybiBwYXJ0XHJcblx0XHRcdC5yZXBsYWNlKC9bPD46XCJ8Kj9cXFxcXS9nLCBcIi1cIilcclxuXHRcdFx0LnJlcGxhY2UoL1xccysvZywgXCIgXCIpXHJcblx0XHRcdC50cmltKCk7XHJcblx0fSk7XHJcblx0cmV0dXJuIHNhbml0aXplZFBhcnRzLmpvaW4oXCIvXCIpO1xyXG59XHJcblxyXG4vKipcclxuICogUHJvY2VzcyBmaWxlIHBhdGggd2l0aCBkYXRlIHRlbXBsYXRlc1xyXG4gKiBSZXBsYWNlcyB7e0RBVEU6Zm9ybWF0fX0gcGF0dGVybnMgd2l0aCBjdXJyZW50IGRhdGUgZm9ybWF0dGVkIHVzaW5nIG1vbWVudC5qc1xyXG4gKiBOb3RlOiBVc2UgZmlsZS1zeXN0ZW0gc2FmZSBmb3JtYXRzIChhdm9pZCBjaGFyYWN0ZXJzIGxpa2UgOiA8ID4gfCBcIiAqID8gXFwpXHJcbiAqIEBwYXJhbSBmaWxlUGF0aCAtIFRoZSBmaWxlIHBhdGggdGhhdCBtYXkgY29udGFpbiBkYXRlIHRlbXBsYXRlc1xyXG4gKiBAcmV0dXJucyBUaGUgcHJvY2Vzc2VkIGZpbGUgcGF0aCB3aXRoIGRhdGUgdGVtcGxhdGVzIHJlcGxhY2VkXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcHJvY2Vzc0RhdGVUZW1wbGF0ZXMoZmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0Ly8gTWF0Y2ggcGF0dGVybnMgbGlrZSB7e0RBVEU6WVlZWS1NTS1ERH19IG9yIHt7ZGF0ZTpZWVlZLU1NLURELUhIbW19fVxyXG5cdGNvbnN0IGRhdGVUZW1wbGF0ZVJlZ2V4ID0gL1xce1xce0RBVEU/OihbXn1dKylcXH1cXH0vZ2k7XHJcblxyXG5cdGNvbnN0IHByb2Nlc3NlZFBhdGggPSBmaWxlUGF0aC5yZXBsYWNlKFxyXG5cdFx0ZGF0ZVRlbXBsYXRlUmVnZXgsXHJcblx0XHQobWF0Y2gsIGZvcm1hdCkgPT4ge1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdC8vIENoZWNrIGlmIGZvcm1hdCBpcyBlbXB0eSBvciBvbmx5IHdoaXRlc3BhY2VcclxuXHRcdFx0XHRpZiAoIWZvcm1hdCB8fCBmb3JtYXQudHJpbSgpID09PSBcIlwiKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gbWF0Y2g7IC8vIFJldHVybiBvcmlnaW5hbCBtYXRjaCBmb3IgZW1wdHkgZm9ybWF0c1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gVXNlIG1vbWVudCB0byBmb3JtYXQgdGhlIGN1cnJlbnQgZGF0ZSB3aXRoIHRoZSBzcGVjaWZpZWQgZm9ybWF0XHJcblx0XHRcdFx0Y29uc3QgZm9ybWF0dGVkRGF0ZSA9IG1vbWVudCgpLmZvcm1hdChmb3JtYXQpO1xyXG5cdFx0XHRcdC8vIFJldHVybiB0aGUgZm9ybWF0dGVkIGRhdGUgd2l0aG91dCBzYW5pdGl6aW5nIGhlcmUgdG8gcHJlc2VydmUgcGF0aCBzdHJ1Y3R1cmVcclxuXHRcdFx0XHRyZXR1cm4gZm9ybWF0dGVkRGF0ZTtcclxuXHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRgSW52YWxpZCBkYXRlIGZvcm1hdCBpbiB0ZW1wbGF0ZTogJHtmb3JtYXR9YCxcclxuXHRcdFx0XHRcdGVycm9yXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHQvLyBSZXR1cm4gdGhlIG9yaWdpbmFsIG1hdGNoIGlmIGZvcm1hdHRpbmcgZmFpbHNcclxuXHRcdFx0XHRyZXR1cm4gbWF0Y2g7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHQpO1xyXG5cclxuXHQvLyBTYW5pdGl6ZSB0aGUgZW50aXJlIHBhdGggd2hpbGUgcHJlc2VydmluZyBkaXJlY3Rvcnkgc3RydWN0dXJlXHJcblx0cmV0dXJuIHNhbml0aXplRmlsZVBhdGgocHJvY2Vzc2VkUGF0aCk7XHJcbn1cclxuXHJcbi8vIFNhdmUgdGhlIGNhcHR1cmVkIGNvbnRlbnQgdG8gdGhlIHRhcmdldCBmaWxlXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzYXZlQ2FwdHVyZShcclxuXHRhcHA6IEFwcCxcclxuXHRjb250ZW50OiBzdHJpbmcsXHJcblx0b3B0aW9uczogUXVpY2tDYXB0dXJlT3B0aW9uc1xyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRjb25zdCB7XHJcblx0XHR0YXJnZXRGaWxlLFxyXG5cdFx0YXBwZW5kVG9GaWxlLFxyXG5cdFx0dGFyZ2V0VHlwZSxcclxuXHRcdHRhcmdldEhlYWRpbmcsXHJcblx0XHRkYWlseU5vdGVTZXR0aW5ncyxcclxuXHR9ID0gb3B0aW9ucztcclxuXHJcblx0bGV0IGZpbGVQYXRoOiBzdHJpbmc7XHJcblxyXG5cdC8vIERldGVybWluZSB0aGUgdGFyZ2V0IGZpbGUgcGF0aCBiYXNlZCBvbiB0YXJnZXQgdHlwZVxyXG5cdGlmICh0YXJnZXRUeXBlID09PSBcImRhaWx5LW5vdGVcIiAmJiBkYWlseU5vdGVTZXR0aW5ncykge1xyXG5cdFx0Ly8gR2VuZXJhdGUgZGFpbHkgbm90ZSBmaWxlIHBhdGhcclxuXHRcdGNvbnN0IGRhdGVTdHIgPSBtb21lbnQoKS5mb3JtYXQoZGFpbHlOb3RlU2V0dGluZ3MuZm9ybWF0KTtcclxuXHRcdC8vIEZvciBkYWlseSBub3RlcywgdGhlIGZvcm1hdCBtaWdodCBpbmNsdWRlIHBhdGggc2VwYXJhdG9ycyAoZS5nLiwgWVlZWS1NTS9ZWVlZLU1NLUREKVxyXG5cdFx0Ly8gV2UgbmVlZCB0byBwcmVzZXJ2ZSB0aGUgcGF0aCBzdHJ1Y3R1cmUgYW5kIG9ubHkgc2FuaXRpemUgdGhlIGZpbmFsIGZpbGVuYW1lXHJcblx0XHRjb25zdCBwYXRoV2l0aERhdGUgPSBkYWlseU5vdGVTZXR0aW5ncy5mb2xkZXJcclxuXHRcdFx0PyBgJHtkYWlseU5vdGVTZXR0aW5ncy5mb2xkZXJ9LyR7ZGF0ZVN0cn0ubWRgXHJcblx0XHRcdDogYCR7ZGF0ZVN0cn0ubWRgO1xyXG5cdFx0ZmlsZVBhdGggPSBzYW5pdGl6ZUZpbGVQYXRoKHBhdGhXaXRoRGF0ZSk7XHJcblx0fSBlbHNlIHtcclxuXHRcdC8vIFVzZSBmaXhlZCBmaWxlIHBhdGhcclxuXHRcdGNvbnN0IHJhd0ZpbGVQYXRoID0gdGFyZ2V0RmlsZSB8fCBcIlF1aWNrIENhcHR1cmUubWRcIjtcclxuXHRcdGZpbGVQYXRoID0gcHJvY2Vzc0RhdGVUZW1wbGF0ZXMocmF3RmlsZVBhdGgpO1xyXG5cdH1cclxuXHJcblx0bGV0IGZpbGUgPSBhcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aChmaWxlUGF0aCk7XHJcblxyXG5cdGlmICghZmlsZSkge1xyXG5cdFx0Ly8gQ3JlYXRlIGRpcmVjdG9yeSBzdHJ1Y3R1cmUgaWYgbmVlZGVkXHJcblx0XHRjb25zdCBwYXRoUGFydHMgPSBmaWxlUGF0aC5zcGxpdChcIi9cIik7XHJcblx0XHRpZiAocGF0aFBhcnRzLmxlbmd0aCA+IDEpIHtcclxuXHRcdFx0Y29uc3QgZGlyUGF0aCA9IHBhdGhQYXJ0cy5zbGljZSgwLCAtMSkuam9pbihcIi9cIik7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0YXdhaXQgYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihkaXJQYXRoKTtcclxuXHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdC8vIERpcmVjdG9yeSBtaWdodCBhbHJlYWR5IGV4aXN0LCBpZ25vcmUgZXJyb3JcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENyZWF0ZSBpbml0aWFsIGNvbnRlbnQgZm9yIG5ldyBmaWxlXHJcblx0XHRsZXQgaW5pdGlhbENvbnRlbnQgPSBcIlwiO1xyXG5cclxuXHRcdC8vIElmIGl0J3MgYSBkYWlseSBub3RlIGFuZCBoYXMgYSB0ZW1wbGF0ZSwgdXNlIHRoZSB0ZW1wbGF0ZVxyXG5cdFx0aWYgKHRhcmdldFR5cGUgPT09IFwiZGFpbHktbm90ZVwiICYmIGRhaWx5Tm90ZVNldHRpbmdzPy50ZW1wbGF0ZSkge1xyXG5cdFx0XHRjb25zdCB0ZW1wbGF0ZUZpbGUgPSBnZXRUZW1wbGF0ZUZpbGUoXHJcblx0XHRcdFx0YXBwLFxyXG5cdFx0XHRcdGRhaWx5Tm90ZVNldHRpbmdzLnRlbXBsYXRlXHJcblx0XHRcdCk7XHJcblx0XHRcdGlmICh0ZW1wbGF0ZUZpbGUgaW5zdGFuY2VvZiBURmlsZSkge1xyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRpbml0aWFsQ29udGVudCA9IGF3YWl0IGFwcC52YXVsdC5yZWFkKHRlbXBsYXRlRmlsZSk7XHJcblx0XHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdFx0Y29uc29sZS53YXJuKFwiRmFpbGVkIHRvIHJlYWQgdGVtcGxhdGUgZmlsZTpcIiwgZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcdGBUZW1wbGF0ZSBmaWxlIG5vdCBmb3VuZDogJHtkYWlseU5vdGVTZXR0aW5ncy50ZW1wbGF0ZX0gKHRyaWVkIHdpdGggYW5kIHdpdGhvdXQgLm1kIGV4dGVuc2lvbilgXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFkZCBjb250ZW50IGJhc2VkIG9uIGFwcGVuZCBtb2RlIGFuZCBoZWFkaW5nXHJcblx0XHRpZiAodGFyZ2V0SGVhZGluZykge1xyXG5cdFx0XHQvLyBJZiBoZWFkaW5nIGlzIHNwZWNpZmllZCwgYWRkIGNvbnRlbnQgdW5kZXIgdGhhdCBoZWFkaW5nXHJcblx0XHRcdGlmIChpbml0aWFsQ29udGVudCkge1xyXG5cdFx0XHRcdC8vIENoZWNrIGlmIGhlYWRpbmcgYWxyZWFkeSBleGlzdHMgaW4gdGVtcGxhdGVcclxuXHRcdFx0XHRjb25zdCBoZWFkaW5nUmVnZXggPSBuZXcgUmVnRXhwKFxyXG5cdFx0XHRcdFx0YF4jezEsNn1cXFxccyske3RhcmdldEhlYWRpbmcucmVwbGFjZShcclxuXHRcdFx0XHRcdFx0L1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLFxyXG5cdFx0XHRcdFx0XHRcIlxcXFwkJlwiXHJcblx0XHRcdFx0XHQpfVxcXFxzKiRgLFxyXG5cdFx0XHRcdFx0XCJtXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGlmIChoZWFkaW5nUmVnZXgudGVzdChpbml0aWFsQ29udGVudCkpIHtcclxuXHRcdFx0XHRcdC8vIEhlYWRpbmcgZXhpc3RzLCBhZGQgY29udGVudCBhZnRlciBpdFxyXG5cdFx0XHRcdFx0aW5pdGlhbENvbnRlbnQgPSBpbml0aWFsQ29udGVudC5yZXBsYWNlKFxyXG5cdFx0XHRcdFx0XHRoZWFkaW5nUmVnZXgsXHJcblx0XHRcdFx0XHRcdGAkJlxcblxcbiR7Y29udGVudH1gXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHQvLyBIZWFkaW5nIGRvZXNuJ3QgZXhpc3QsIGFkZCBpdCB3aXRoIGNvbnRlbnRcclxuXHRcdFx0XHRcdGluaXRpYWxDb250ZW50ICs9IGBcXG5cXG4jIyAke3RhcmdldEhlYWRpbmd9XFxuXFxuJHtjb250ZW50fWA7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGluaXRpYWxDb250ZW50ID0gYCMjICR7dGFyZ2V0SGVhZGluZ31cXG5cXG4ke2NvbnRlbnR9YDtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gTm8gc3BlY2lmaWMgaGVhZGluZ1xyXG5cdFx0XHRpZiAoYXBwZW5kVG9GaWxlID09PSBcInByZXBlbmRcIikge1xyXG5cdFx0XHRcdGluaXRpYWxDb250ZW50ID0gaW5pdGlhbENvbnRlbnRcclxuXHRcdFx0XHRcdD8gYCR7Y29udGVudH1cXG5cXG4ke2luaXRpYWxDb250ZW50fWBcclxuXHRcdFx0XHRcdDogY29udGVudDtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRpbml0aWFsQ29udGVudCA9IGluaXRpYWxDb250ZW50XHJcblx0XHRcdFx0XHQ/IGAke2luaXRpYWxDb250ZW50fVxcblxcbiR7Y29udGVudH1gXHJcblx0XHRcdFx0XHQ6IGNvbnRlbnQ7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBDcmVhdGUgdGhlIGZpbGVcclxuXHRcdGZpbGUgPSBhd2FpdCBhcHAudmF1bHQuY3JlYXRlKGZpbGVQYXRoLCBpbml0aWFsQ29udGVudCk7XHJcblx0fSBlbHNlIGlmIChmaWxlIGluc3RhbmNlb2YgVEZpbGUpIHtcclxuXHRcdC8vIEFwcGVuZCBvciByZXBsYWNlIGNvbnRlbnQgaW4gZXhpc3RpbmcgZmlsZVxyXG5cdFx0YXdhaXQgYXBwLnZhdWx0LnByb2Nlc3MoZmlsZSwgKGRhdGEpID0+IHtcclxuXHRcdFx0Ly8gSWYgaGVhZGluZyBpcyBzcGVjaWZpZWQsIHRyeSB0byBhZGQgY29udGVudCB1bmRlciB0aGF0IGhlYWRpbmdcclxuXHRcdFx0aWYgKHRhcmdldEhlYWRpbmcpIHtcclxuXHRcdFx0XHRyZXR1cm4gYWRkQ29udGVudFVuZGVySGVhZGluZyhcclxuXHRcdFx0XHRcdGRhdGEsXHJcblx0XHRcdFx0XHRjb250ZW50LFxyXG5cdFx0XHRcdFx0dGFyZ2V0SGVhZGluZyxcclxuXHRcdFx0XHRcdGFwcGVuZFRvRmlsZSB8fCBcImFwcGVuZFwiXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gT3JpZ2luYWwgbG9naWMgZm9yIG5vIGhlYWRpbmcgc3BlY2lmaWVkXHJcblx0XHRcdHN3aXRjaCAoYXBwZW5kVG9GaWxlKSB7XHJcblx0XHRcdFx0Y2FzZSBcImFwcGVuZFwiOiB7XHJcblx0XHRcdFx0XHQvLyBHZXQgZnJvbnRtYXR0ZXIgaW5mb3JtYXRpb24gdXNpbmcgT2JzaWRpYW4gQVBJXHJcblx0XHRcdFx0XHRjb25zdCBmbUluZm8gPSBnZXRGcm9udE1hdHRlckluZm8oZGF0YSk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gQWRkIGEgbmV3bGluZSBiZWZvcmUgdGhlIG5ldyBjb250ZW50IGlmIG5lZWRlZFxyXG5cdFx0XHRcdFx0Y29uc3Qgc2VwYXJhdG9yID0gZGF0YS5lbmRzV2l0aChcIlxcblwiKSA/IFwiXCIgOiBcIlxcblwiO1xyXG5cclxuXHRcdFx0XHRcdGlmIChmbUluZm8uZXhpc3RzKSB7XHJcblx0XHRcdFx0XHRcdC8vIElmIGZyb250bWF0dGVyIGV4aXN0cywgdXNlIHRoZSBjb250ZW50U3RhcnQgcG9zaXRpb24gdG8gYXBwZW5kIGFmdGVyIGl0XHJcblx0XHRcdFx0XHRcdGNvbnN0IGNvbnRlbnRTdGFydFBvcyA9IGZtSW5mby5jb250ZW50U3RhcnQ7XHJcblxyXG5cdFx0XHRcdFx0XHRpZiAoY29udGVudFN0YXJ0UG9zICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBjb250ZW50QmVmb3JlRnJvbnRtYXR0ZXIgPSBkYXRhLnNsaWNlKFxyXG5cdFx0XHRcdFx0XHRcdFx0MCxcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnRlbnRTdGFydFBvc1xyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgY29udGVudEFmdGVyRnJvbnRtYXR0ZXIgPVxyXG5cdFx0XHRcdFx0XHRcdFx0ZGF0YS5zbGljZShjb250ZW50U3RhcnRQb3MpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gKFxyXG5cdFx0XHRcdFx0XHRcdFx0Y29udGVudEJlZm9yZUZyb250bWF0dGVyICtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnRlbnRBZnRlckZyb250bWF0dGVyICtcclxuXHRcdFx0XHRcdFx0XHRcdHNlcGFyYXRvciArXHJcblx0XHRcdFx0XHRcdFx0XHRjb250ZW50XHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHQvLyBGYWxsYmFjayBpZiB3ZSBjYW4ndCBnZXQgdGhlIGV4YWN0IHBvc2l0aW9uXHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGRhdGEgKyBzZXBhcmF0b3IgKyBjb250ZW50O1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHQvLyBObyBmcm9udG1hdHRlciwganVzdCBhcHBlbmQgdG8gdGhlIGVuZFxyXG5cdFx0XHRcdFx0XHRyZXR1cm4gZGF0YSArIHNlcGFyYXRvciArIGNvbnRlbnQ7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGNhc2UgXCJwcmVwZW5kXCI6IHtcclxuXHRcdFx0XHRcdC8vIEdldCBmcm9udG1hdHRlciBpbmZvcm1hdGlvblxyXG5cdFx0XHRcdFx0Y29uc3QgZm1JbmZvID0gZ2V0RnJvbnRNYXR0ZXJJbmZvKGRhdGEpO1xyXG5cdFx0XHRcdFx0Y29uc3Qgc2VwYXJhdG9yID0gXCJcXG5cIjtcclxuXHJcblx0XHRcdFx0XHRpZiAoZm1JbmZvLmV4aXN0cyAmJiBmbUluZm8uY29udGVudFN0YXJ0ICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0XHRcdFx0Ly8gSW5zZXJ0IGFmdGVyIGZyb250bWF0dGVyIGJ1dCBiZWZvcmUgY29udGVudFxyXG5cdFx0XHRcdFx0XHRyZXR1cm4gKFxyXG5cdFx0XHRcdFx0XHRcdGRhdGEuc2xpY2UoMCwgZm1JbmZvLmNvbnRlbnRTdGFydCkgK1xyXG5cdFx0XHRcdFx0XHRcdGNvbnRlbnQgK1xyXG5cdFx0XHRcdFx0XHRcdHNlcGFyYXRvciArXHJcblx0XHRcdFx0XHRcdFx0ZGF0YS5zbGljZShmbUluZm8uY29udGVudFN0YXJ0KVxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0Ly8gTm8gZnJvbnRtYXR0ZXIsIHByZXBlbmQgdG8gYmVnaW5uaW5nXHJcblx0XHRcdFx0XHRcdHJldHVybiBjb250ZW50ICsgc2VwYXJhdG9yICsgZGF0YTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Y2FzZSBcInJlcGxhY2VcIjpcclxuXHRcdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdFx0cmV0dXJuIGNvbnRlbnQ7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH0gZWxzZSB7XHJcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJUYXJnZXQgaXMgbm90IGEgZmlsZVwiKTtcclxuXHR9XHJcblxyXG5cdHJldHVybjtcclxufVxyXG5cclxuLyoqXHJcbiAqIEFkZCBjb250ZW50IHVuZGVyIGEgc3BlY2lmaWMgaGVhZGluZyBpbiBtYXJrZG93biB0ZXh0XHJcbiAqIEBwYXJhbSBkYXRhIC0gVGhlIG9yaWdpbmFsIG1hcmtkb3duIGNvbnRlbnRcclxuICogQHBhcmFtIGNvbnRlbnQgLSBUaGUgY29udGVudCB0byBhZGRcclxuICogQHBhcmFtIGhlYWRpbmcgLSBUaGUgaGVhZGluZyB0byBhZGQgY29udGVudCB1bmRlclxyXG4gKiBAcGFyYW0gbW9kZSAtIEhvdyB0byBhZGQgdGhlIGNvbnRlbnQgKGFwcGVuZC9wcmVwZW5kKVxyXG4gKiBAcmV0dXJucyBUaGUgbW9kaWZpZWQgbWFya2Rvd24gY29udGVudFxyXG4gKi9cclxuZnVuY3Rpb24gYWRkQ29udGVudFVuZGVySGVhZGluZyhcclxuXHRkYXRhOiBzdHJpbmcsXHJcblx0Y29udGVudDogc3RyaW5nLFxyXG5cdGhlYWRpbmc6IHN0cmluZyxcclxuXHRtb2RlOiBcImFwcGVuZFwiIHwgXCJwcmVwZW5kXCIgfCBcInJlcGxhY2VcIlxyXG4pOiBzdHJpbmcge1xyXG5cdGNvbnN0IGxpbmVzID0gZGF0YS5zcGxpdChcIlxcblwiKTtcclxuXHRjb25zdCBoZWFkaW5nUmVnZXggPSBuZXcgUmVnRXhwKFxyXG5cdFx0YF4oI3sxLDZ9KVxcXFxzKyR7aGVhZGluZy5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxdXFxcXF0vZywgXCJcXFxcJCZcIil9XFxcXHMqJGAsXHJcblx0XHRcImlcIlxyXG5cdCk7XHJcblxyXG5cdGxldCBoZWFkaW5nSW5kZXggPSAtMTtcclxuXHRsZXQgaGVhZGluZ0xldmVsID0gMDtcclxuXHJcblx0Ly8gRmluZCB0aGUgdGFyZ2V0IGhlYWRpbmdcclxuXHRmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRjb25zdCBtYXRjaCA9IGxpbmVzW2ldLm1hdGNoKGhlYWRpbmdSZWdleCk7XHJcblx0XHRpZiAobWF0Y2gpIHtcclxuXHRcdFx0aGVhZGluZ0luZGV4ID0gaTtcclxuXHRcdFx0aGVhZGluZ0xldmVsID0gbWF0Y2hbMV0ubGVuZ3RoO1xyXG5cdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGlmIChoZWFkaW5nSW5kZXggPT09IC0xKSB7XHJcblx0XHQvLyBIZWFkaW5nIG5vdCBmb3VuZCwgYWRkIGl0IGF0IHRoZSBlbmRcclxuXHRcdGNvbnN0IHNlcGFyYXRvciA9IGRhdGEuZW5kc1dpdGgoXCJcXG5cIikgPyBcIlwiIDogXCJcXG5cIjtcclxuXHRcdHJldHVybiBgJHtkYXRhfSR7c2VwYXJhdG9yfVxcbiMjICR7aGVhZGluZ31cXG5cXG4ke2NvbnRlbnR9YDtcclxuXHR9XHJcblxyXG5cdC8vIEZpbmQgdGhlIGVuZCBvZiB0aGlzIHNlY3Rpb24gKG5leHQgaGVhZGluZyBvZiBzYW1lIG9yIGhpZ2hlciBsZXZlbClcclxuXHRsZXQgc2VjdGlvbkVuZEluZGV4ID0gbGluZXMubGVuZ3RoO1xyXG5cdGZvciAobGV0IGkgPSBoZWFkaW5nSW5kZXggKyAxOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdGNvbnN0IGxpbmUgPSBsaW5lc1tpXTtcclxuXHRcdGNvbnN0IGhlYWRpbmdNYXRjaCA9IGxpbmUubWF0Y2goL14oI3sxLDZ9KVxccysvKTtcclxuXHRcdGlmIChoZWFkaW5nTWF0Y2ggJiYgaGVhZGluZ01hdGNoWzFdLmxlbmd0aCA8PSBoZWFkaW5nTGV2ZWwpIHtcclxuXHRcdFx0c2VjdGlvbkVuZEluZGV4ID0gaTtcclxuXHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBGaW5kIHRoZSBpbnNlcnRpb24gcG9pbnQgd2l0aGluIHRoZSBzZWN0aW9uXHJcblx0bGV0IGluc2VydEluZGV4OiBudW1iZXI7XHJcblx0aWYgKG1vZGUgPT09IFwicHJlcGVuZFwiKSB7XHJcblx0XHQvLyBJbnNlcnQgcmlnaHQgYWZ0ZXIgdGhlIGhlYWRpbmcgKHNraXAgZW1wdHkgbGluZXMpXHJcblx0XHRpbnNlcnRJbmRleCA9IGhlYWRpbmdJbmRleCArIDE7XHJcblx0XHR3aGlsZSAoXHJcblx0XHRcdGluc2VydEluZGV4IDwgc2VjdGlvbkVuZEluZGV4ICYmXHJcblx0XHRcdGxpbmVzW2luc2VydEluZGV4XS50cmltKCkgPT09IFwiXCJcclxuXHRcdFx0KSB7XHJcblx0XHRcdGluc2VydEluZGV4Kys7XHJcblx0XHR9XHJcblx0fSBlbHNlIHtcclxuXHRcdC8vIEluc2VydCBhdCB0aGUgZW5kIG9mIHRoZSBzZWN0aW9uIChiZWZvcmUgbmV4dCBoZWFkaW5nKVxyXG5cdFx0aW5zZXJ0SW5kZXggPSBzZWN0aW9uRW5kSW5kZXg7XHJcblx0XHQvLyBTa2lwIHRyYWlsaW5nIGVtcHR5IGxpbmVzIGluIHRoZSBzZWN0aW9uXHJcblx0XHR3aGlsZSAoXHJcblx0XHRcdGluc2VydEluZGV4ID4gaGVhZGluZ0luZGV4ICsgMSAmJlxyXG5cdFx0XHRsaW5lc1tpbnNlcnRJbmRleCAtIDFdLnRyaW0oKSA9PT0gXCJcIlxyXG5cdFx0XHQpIHtcclxuXHRcdFx0aW5zZXJ0SW5kZXgtLTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIEluc2VydCB0aGUgY29udGVudFxyXG5cdGNvbnN0IGNvbnRlbnRMaW5lcyA9IGNvbnRlbnQuc3BsaXQoXCJcXG5cIik7XHJcblx0Y29uc3QgcmVzdWx0ID0gW1xyXG5cdFx0Li4ubGluZXMuc2xpY2UoMCwgaW5zZXJ0SW5kZXgpLFxyXG5cdFx0XCJcIiwgLy8gQWRkIGVtcHR5IGxpbmUgYmVmb3JlIGNvbnRlbnRcclxuXHRcdC4uLmNvbnRlbnRMaW5lcyxcclxuXHRcdFwiXCIsIC8vIEFkZCBlbXB0eSBsaW5lIGFmdGVyIGNvbnRlbnRcclxuXHRcdC4uLmxpbmVzLnNsaWNlKGluc2VydEluZGV4KSxcclxuXHRdO1xyXG5cclxuXHRyZXR1cm4gcmVzdWx0LmpvaW4oXCJcXG5cIik7XHJcbn1cclxuIl19