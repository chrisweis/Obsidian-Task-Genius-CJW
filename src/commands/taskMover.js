import { __awaiter } from "tslib";
import { FuzzySuggestModal, Notice, SuggestModal, } from "obsidian";
import { buildIndentString } from "../utils";
import { t } from "../translations/helper";
import { isSupportedFile } from "../utils/file/file-type-detector";
/**
 * Modal for selecting a target file to move tasks to
 */
export class FileSelectionModal extends FuzzySuggestModal {
    constructor(app, plugin, editor, currentFile, taskLine) {
        super(app);
        this.plugin = plugin;
        this.editor = editor;
        this.currentFile = currentFile;
        this.taskLine = taskLine;
        this.setPlaceholder("Select a file or type to create a new one");
    }
    getItems() {
        // Get all supported files (markdown and canvas)
        const allFiles = this.app.vault.getFiles();
        const supportedFiles = allFiles.filter(file => isSupportedFile(file));
        // Filter out the current file
        const filteredFiles = supportedFiles.filter((file) => file.path !== this.currentFile.path);
        // Sort files by path
        filteredFiles.sort((a, b) => a.path.localeCompare(b.path));
        return filteredFiles;
    }
    getItemText(item) {
        if (typeof item === "string") {
            return `Create new file: ${item}`;
        }
        return item.path;
    }
    renderSuggestion(item, el) {
        const match = item.item;
        if (typeof match === "string") {
            el.createEl("div", { text: `${t("Create new file:")} ${match}` });
        }
        else {
            el.createEl("div", { text: match.path });
        }
    }
    onChooseItem(item, evt) {
        if (typeof item === "string") {
            // Create a new file
            this.createNewFileWithTasks(item);
        }
        else {
            // Show modal to select insertion point in existing file
            new BlockSelectionModal(this.app, this.plugin, this.editor, this.currentFile, item, this.taskLine).open();
        }
    }
    // If the query doesn't match any existing files, add an option to create a new file
    getSuggestions(query) {
        const suggestions = super.getSuggestions(query);
        if (query &&
            !suggestions.some((match) => typeof match.item === "string" && match.item === query)) {
            // Check if it's a valid file path
            if (this.isValidFileName(query)) {
                // Add option to create a new file with this name
                suggestions.push({
                    item: query,
                    match: { score: 1, matches: [] },
                });
            }
        }
        // Limit results to 20 to avoid performance issues
        return suggestions.slice(0, 20);
    }
    isValidFileName(name) {
        // Basic validation for file names
        return name.length > 0 && !name.includes("/") && !name.includes("\\");
    }
    createNewFileWithTasks(fileName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Ensure file name has .md extension
                if (!fileName.endsWith(".md")) {
                    fileName += ".md";
                }
                // Get task content
                const taskContent = this.getTaskWithChildren();
                // Reset indentation for new file (remove all indentation from tasks)
                const resetIndentContent = this.resetIndentation(taskContent);
                // Create file in the same folder as current file
                const folder = this.currentFile.parent;
                const filePath = folder ? `${folder.path}/${fileName}` : fileName;
                // Create the file
                const newFile = yield this.app.vault.create(filePath, resetIndentContent);
                // Remove the task from the current file
                this.removeTaskFromCurrentFile();
                // Open the new file
                this.app.workspace.getLeaf(true).openFile(newFile);
                new Notice(`${t("Task moved to")} ${fileName}`);
            }
            catch (error) {
                new Notice(`${t("Failed to create file:")} ${error}`);
                console.error(error);
            }
        });
    }
    getTaskWithChildren() {
        const content = this.editor.getValue();
        const lines = content.split("\n");
        // Get the current task line
        const currentLine = lines[this.taskLine];
        const currentIndent = this.getIndentation(currentLine);
        // Include the current line and all child tasks
        const resultLines = [currentLine];
        // Look for child tasks (with more indentation)
        for (let i = this.taskLine + 1; i < lines.length; i++) {
            const line = lines[i];
            const lineIndent = this.getIndentation(line);
            // If indentation is less or equal to current task, we've exited the child tasks
            if (lineIndent <= currentIndent) {
                break;
            }
            resultLines.push(line);
        }
        return resultLines.join("\n");
    }
    removeTaskFromCurrentFile() {
        const content = this.editor.getValue();
        const lines = content.split("\n");
        const currentIndent = this.getIndentation(lines[this.taskLine]);
        // Find the range of lines to remove
        let endLine = this.taskLine;
        for (let i = this.taskLine + 1; i < lines.length; i++) {
            const lineIndent = this.getIndentation(lines[i]);
            if (lineIndent <= currentIndent) {
                break;
            }
            endLine = i;
        }
        // Remove the task lines using replaceRange
        this.editor.replaceRange("", { line: this.taskLine, ch: 0 }, { line: endLine + 1, ch: 0 });
    }
    getIndentation(line) {
        const match = line.match(/^(\s*)/);
        return match ? match[1].length : 0;
    }
    // Reset indentation for new files
    resetIndentation(content) {
        const lines = content.split("\n");
        // Find the minimum indentation in all lines
        let minIndent = Number.MAX_SAFE_INTEGER;
        for (const line of lines) {
            if (line.trim().length === 0)
                continue; // Skip empty lines
            const indent = this.getIndentation(line);
            minIndent = Math.min(minIndent, indent);
        }
        // If no valid minimum found, or it's already 0, return as is
        if (minIndent === Number.MAX_SAFE_INTEGER || minIndent === 0) {
            return content;
        }
        // Remove the minimum indentation from each line
        return lines
            .map((line) => {
            if (line.trim().length === 0)
                return line; // Keep empty lines unchanged
            return line.substring(minIndent);
        })
            .join("\n");
    }
}
/**
 * Modal for selecting a heading to insert after in the target file
 */
export class BlockSelectionModal extends SuggestModal {
    constructor(app, plugin, editor, sourceFile, targetFile, taskLine) {
        super(app);
        this.plugin = plugin;
        this.editor = editor;
        this.sourceFile = sourceFile;
        this.targetFile = targetFile;
        this.taskLine = taskLine;
        this.metadataCache = app.metadataCache;
        this.setPlaceholder("Select where to insert the task");
    }
    getSuggestions(query) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get file content
            const fileContent = yield this.app.vault.read(this.targetFile);
            const lines = fileContent.split("\n");
            // Get file cache to find headings
            const fileCache = this.metadataCache.getFileCache(this.targetFile);
            let blocks = [];
            // Add options to insert at the beginning or end of the file
            blocks.push({
                id: "beginning",
                text: t("Beginning of file"),
                level: 0,
                line: 0,
            });
            blocks.push({
                id: "end",
                text: t("End of file"),
                level: 0,
                line: lines.length,
            });
            // Add headings
            if (fileCache && fileCache.headings) {
                for (const heading of fileCache.headings) {
                    const text = lines[heading.position.start.line];
                    blocks.push({
                        id: `heading-start-${heading.position.start.line}`,
                        text: `${t("After heading")}: ${text}`,
                        level: heading.level,
                        line: heading.position.start.line,
                    });
                    // Add option to insert at end of section
                    blocks.push({
                        id: `heading-end-${heading.position.start.line}`,
                        text: `${t("End of section")}: ${text}`,
                        level: heading.level,
                        line: heading.position.start.line,
                    });
                }
            }
            // Filter blocks based on query
            if (query) {
                blocks = blocks.filter((block) => block.text.toLowerCase().includes(query.toLowerCase()));
            }
            // Limit results to 20 to avoid performance issues
            return blocks.slice(0, 20);
        });
    }
    renderSuggestion(block, el) {
        const indent = "  ".repeat(block.level);
        el.createEl("div", { text: `${indent}${block.text}` });
    }
    onChooseSuggestion(block, evt) {
        this.moveTaskToTargetFile(block);
    }
    moveTaskToTargetFile(block) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get task content
                const taskContent = this.getTaskWithChildren();
                // Read target file content
                const fileContent = yield this.app.vault.read(this.targetFile);
                const lines = fileContent.split("\n");
                let insertPosition;
                let indentLevel = 0;
                if (block.id === "beginning") {
                    insertPosition = 0;
                }
                else if (block.id === "end") {
                    insertPosition = lines.length;
                }
                else if (block.id.startsWith("heading-start-")) {
                    // Insert after the heading
                    insertPosition = block.line + 1;
                    // Add one level of indentation for content under a heading
                    indentLevel = buildIndentString(this.app).length;
                }
                else if (block.id.startsWith("heading-end-")) {
                    // Find the end of this section (next heading of same or lower level)
                    insertPosition = this.findSectionEnd(lines, block.line, block.level);
                    // Add one level of indentation for content under a heading
                    indentLevel = buildIndentString(this.app).length;
                }
                else {
                    throw new Error("Invalid block ID");
                }
                // Reset task indentation to 0 and then add target indentation
                const resetIndentContent = this.resetIndentation(taskContent);
                const indentedTaskContent = this.addIndentation(resetIndentContent, 0);
                // Insert task at the position
                yield this.app.vault.modify(this.targetFile, [
                    ...lines.slice(0, insertPosition),
                    indentedTaskContent,
                    ...lines.slice(insertPosition),
                ].join("\n"));
                // Remove task from source file
                this.removeTaskFromSourceFile();
                new Notice(`${t("Task moved to")} ${this.targetFile.path}`);
            }
            catch (error) {
                new Notice(`${t("Failed to move task:")} ${error}`);
                console.error(error);
            }
        });
    }
    // Find the end of a section (line number of the next heading with same or lower level)
    findSectionEnd(lines, headingLine, headingLevel) {
        for (let i = headingLine + 1; i < lines.length; i++) {
            const line = lines[i];
            // Check if this line is a heading with same or lower level
            const headingMatch = line.match(/^(#+)\s+/);
            if (headingMatch && headingMatch[1].length <= headingLevel) {
                return i;
            }
        }
        // If no matching heading found, return end of file
        return lines.length;
    }
    getTaskWithChildren() {
        const content = this.editor.getValue();
        const lines = content.split("\n");
        // Get the current task line
        const currentLine = lines[this.taskLine];
        const currentIndent = this.getIndentation(currentLine);
        // Include the current line and all child tasks
        const resultLines = [currentLine];
        // Look for child tasks (with more indentation)
        for (let i = this.taskLine + 1; i < lines.length; i++) {
            const line = lines[i];
            const lineIndent = this.getIndentation(line);
            // If indentation is less or equal to current task, we've exited the child tasks
            if (lineIndent <= currentIndent) {
                break;
            }
            resultLines.push(line);
        }
        return resultLines.join("\n");
    }
    // Reset all indentation to 0
    resetIndentation(content) {
        const lines = content.split("\n");
        // Find the minimum indentation in all lines
        let minIndent = Number.MAX_SAFE_INTEGER;
        for (const line of lines) {
            if (line.trim().length === 0)
                continue; // Skip empty lines
            const indent = this.getIndentation(line);
            minIndent = Math.min(minIndent, indent);
        }
        // If no valid minimum found, or it's already 0, return as is
        if (minIndent === Number.MAX_SAFE_INTEGER || minIndent === 0) {
            return content;
        }
        // Remove the minimum indentation from each line
        return lines
            .map((line) => {
            if (line.trim().length === 0)
                return line; // Keep empty lines unchanged
            return line.substring(minIndent);
        })
            .join("\n");
    }
    // Add indentation to all lines
    addIndentation(content, indentSize) {
        if (indentSize <= 0)
            return content;
        const indentStr = buildIndentString(this.app).repeat(indentSize / buildIndentString(this.app).length);
        return content
            .split("\n")
            .map((line) => (line.length > 0 ? indentStr + line : line))
            .join("\n");
    }
    removeTaskFromSourceFile() {
        const content = this.editor.getValue();
        const lines = content.split("\n");
        const currentIndent = this.getIndentation(lines[this.taskLine]);
        // Find the range of lines to remove
        let endLine = this.taskLine;
        for (let i = this.taskLine + 1; i < lines.length; i++) {
            const lineIndent = this.getIndentation(lines[i]);
            if (lineIndent <= currentIndent) {
                break;
            }
            endLine = i;
        }
        // Remove the task lines using replaceRange
        this.editor.replaceRange("", { line: this.taskLine, ch: 0 }, { line: endLine + 1, ch: 0 });
    }
    getIndentation(line) {
        const match = line.match(/^(\s*)/);
        return match ? match[1].length : 0;
    }
}
/**
 * Command to move the current task to another file
 */
export function moveTaskCommand(checking, editor, ctx, plugin) {
    // Get the current file
    const currentFile = ctx.file;
    if (checking) {
        // If checking, return true if we're in a supported file and cursor is on a task line
        if (!currentFile || !isSupportedFile(currentFile)) {
            return false;
        }
        // For markdown files, check if cursor is on a task line
        if (currentFile.extension === "md") {
            const cursor = editor.getCursor();
            const line = editor.getLine(cursor.line);
            // Check if line is a task with any of the supported list markers (-, 1., *)
            return line.match(/^\s*(-|\d+\.|\*) \[(.)\]/i) !== null;
        }
        // For canvas files, we don't support direct editing yet
        // This command is primarily for markdown files
        return false;
    }
    // Execute the command
    if (!currentFile) {
        new Notice(t("No active file found"));
        return false;
    }
    const cursor = editor.getCursor();
    new FileSelectionModal(plugin.app, plugin, editor, currentFile, cursor.line).open();
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza01vdmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGFza01vdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBRU4saUJBQWlCLEVBRWpCLE1BQU0sRUFHTixZQUFZLEdBSVosTUFBTSxVQUFVLENBQUM7QUFFbEIsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQzdDLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUMzQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFbkU7O0dBRUc7QUFDSCxNQUFNLE9BQU8sa0JBQW1CLFNBQVEsaUJBQWlDO0lBTXhFLFlBQ0MsR0FBUSxFQUNSLE1BQTZCLEVBQzdCLE1BQWMsRUFDZCxXQUFrQixFQUNsQixRQUFnQjtRQUVoQixLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDWCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztRQUMvQixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUN6QixJQUFJLENBQUMsY0FBYyxDQUFDLDJDQUEyQyxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUVELFFBQVE7UUFDUCxnREFBZ0Q7UUFDaEQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDM0MsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBRXRFLDhCQUE4QjtRQUM5QixNQUFNLGFBQWEsR0FBRyxjQUFjLENBQUMsTUFBTSxDQUMxQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLElB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LENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDO1FBQ3RDLE9BQU8sS0FBSyxDQUFDO0tBQ2I7SUFFRCxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDbEMsSUFBSSxrQkFBa0IsQ0FDckIsTUFBTSxDQUFDLEdBQUcsRUFDVixNQUFNLEVBQ04sTUFBTSxFQUNOLFdBQVcsRUFDWCxNQUFNLENBQUMsSUFBSSxDQUNYLENBQUMsSUFBSSxFQUFFLENBQUM7SUFFVCxPQUFPLElBQUksQ0FBQztBQUNiLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xyXG5cdEFwcCxcclxuXHRGdXp6eVN1Z2dlc3RNb2RhbCxcclxuXHRURmlsZSxcclxuXHROb3RpY2UsXHJcblx0RWRpdG9yLFxyXG5cdEZ1enp5TWF0Y2gsXHJcblx0U3VnZ2VzdE1vZGFsLFxyXG5cdE1ldGFkYXRhQ2FjaGUsXHJcblx0TWFya2Rvd25WaWV3LFxyXG5cdE1hcmtkb3duRmlsZUluZm8sXHJcbn0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIi4uL2luZGV4XCI7XHJcbmltcG9ydCB7IGJ1aWxkSW5kZW50U3RyaW5nIH0gZnJvbSBcIi4uL3V0aWxzXCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiLi4vdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgeyBpc1N1cHBvcnRlZEZpbGUgfSBmcm9tIFwiLi4vdXRpbHMvZmlsZS9maWxlLXR5cGUtZGV0ZWN0b3JcIjtcclxuXHJcbi8qKlxyXG4gKiBNb2RhbCBmb3Igc2VsZWN0aW5nIGEgdGFyZ2V0IGZpbGUgdG8gbW92ZSB0YXNrcyB0b1xyXG4gKi9cclxuZXhwb3J0IGNsYXNzIEZpbGVTZWxlY3Rpb25Nb2RhbCBleHRlbmRzIEZ1enp5U3VnZ2VzdE1vZGFsPFRGaWxlIHwgc3RyaW5nPiB7XHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblx0ZWRpdG9yOiBFZGl0b3I7XHJcblx0Y3VycmVudEZpbGU6IFRGaWxlO1xyXG5cdHRhc2tMaW5lOiBudW1iZXI7XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0YXBwOiBBcHAsXHJcblx0XHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdGVkaXRvcjogRWRpdG9yLFxyXG5cdFx0Y3VycmVudEZpbGU6IFRGaWxlLFxyXG5cdFx0dGFza0xpbmU6IG51bWJlclxyXG5cdCkge1xyXG5cdFx0c3VwZXIoYXBwKTtcclxuXHRcdHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG5cdFx0dGhpcy5lZGl0b3IgPSBlZGl0b3I7XHJcblx0XHR0aGlzLmN1cnJlbnRGaWxlID0gY3VycmVudEZpbGU7XHJcblx0XHR0aGlzLnRhc2tMaW5lID0gdGFza0xpbmU7XHJcblx0XHR0aGlzLnNldFBsYWNlaG9sZGVyKFwiU2VsZWN0IGEgZmlsZSBvciB0eXBlIHRvIGNyZWF0ZSBhIG5ldyBvbmVcIik7XHJcblx0fVxyXG5cclxuXHRnZXRJdGVtcygpOiAoVEZpbGUgfCBzdHJpbmcpW10ge1xyXG5cdFx0Ly8gR2V0IGFsbCBzdXBwb3J0ZWQgZmlsZXMgKG1hcmtkb3duIGFuZCBjYW52YXMpXHJcblx0XHRjb25zdCBhbGxGaWxlcyA9IHRoaXMuYXBwLnZhdWx0LmdldEZpbGVzKCk7XHJcblx0XHRjb25zdCBzdXBwb3J0ZWRGaWxlcyA9IGFsbEZpbGVzLmZpbHRlcihmaWxlID0+IGlzU3VwcG9ydGVkRmlsZShmaWxlKSk7XHJcblxyXG5cdFx0Ly8gRmlsdGVyIG91dCB0aGUgY3VycmVudCBmaWxlXHJcblx0XHRjb25zdCBmaWx0ZXJlZEZpbGVzID0gc3VwcG9ydGVkRmlsZXMuZmlsdGVyKFxyXG5cdFx0XHQoZmlsZSkgPT4gZmlsZS5wYXRoICE9PSB0aGlzLmN1cnJlbnRGaWxlLnBhdGhcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gU29ydCBmaWxlcyBieSBwYXRoXHJcblx0XHRmaWx0ZXJlZEZpbGVzLnNvcnQoKGEsIGIpID0+IGEucGF0aC5sb2NhbGVDb21wYXJlKGIucGF0aCkpO1xyXG5cclxuXHRcdHJldHVybiBmaWx0ZXJlZEZpbGVzO1xyXG5cdH1cclxuXHJcblx0Z2V0SXRlbVRleHQoaXRlbTogVEZpbGUgfCBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0aWYgKHR5cGVvZiBpdGVtID09PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdHJldHVybiBgQ3JlYXRlIG5ldyBmaWxlOiAke2l0ZW19YDtcclxuXHRcdH1cclxuXHRcdHJldHVybiBpdGVtLnBhdGg7XHJcblx0fVxyXG5cclxuXHRyZW5kZXJTdWdnZXN0aW9uKGl0ZW06IEZ1enp5TWF0Y2g8VEZpbGUgfCBzdHJpbmc+LCBlbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdGNvbnN0IG1hdGNoID0gaXRlbS5pdGVtO1xyXG5cdFx0aWYgKHR5cGVvZiBtYXRjaCA9PT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHRlbC5jcmVhdGVFbChcImRpdlwiLCB7IHRleHQ6IGAke3QoXCJDcmVhdGUgbmV3IGZpbGU6XCIpfSAke21hdGNofWAgfSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRlbC5jcmVhdGVFbChcImRpdlwiLCB7IHRleHQ6IG1hdGNoLnBhdGggfSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRvbkNob29zZUl0ZW0oaXRlbTogVEZpbGUgfCBzdHJpbmcsIGV2dDogTW91c2VFdmVudCB8IEtleWJvYXJkRXZlbnQpOiB2b2lkIHtcclxuXHRcdGlmICh0eXBlb2YgaXRlbSA9PT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHQvLyBDcmVhdGUgYSBuZXcgZmlsZVxyXG5cdFx0XHR0aGlzLmNyZWF0ZU5ld0ZpbGVXaXRoVGFza3MoaXRlbSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBTaG93IG1vZGFsIHRvIHNlbGVjdCBpbnNlcnRpb24gcG9pbnQgaW4gZXhpc3RpbmcgZmlsZVxyXG5cdFx0XHRuZXcgQmxvY2tTZWxlY3Rpb25Nb2RhbChcclxuXHRcdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0XHR0aGlzLmVkaXRvcixcclxuXHRcdFx0XHR0aGlzLmN1cnJlbnRGaWxlLFxyXG5cdFx0XHRcdGl0ZW0sXHJcblx0XHRcdFx0dGhpcy50YXNrTGluZVxyXG5cdFx0XHQpLm9wZW4oKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIElmIHRoZSBxdWVyeSBkb2Vzbid0IG1hdGNoIGFueSBleGlzdGluZyBmaWxlcywgYWRkIGFuIG9wdGlvbiB0byBjcmVhdGUgYSBuZXcgZmlsZVxyXG5cdGdldFN1Z2dlc3Rpb25zKHF1ZXJ5OiBzdHJpbmcpOiBGdXp6eU1hdGNoPFRGaWxlIHwgc3RyaW5nPltdIHtcclxuXHRcdGNvbnN0IHN1Z2dlc3Rpb25zID0gc3VwZXIuZ2V0U3VnZ2VzdGlvbnMocXVlcnkpO1xyXG5cclxuXHRcdGlmIChcclxuXHRcdFx0cXVlcnkgJiZcclxuXHRcdFx0IXN1Z2dlc3Rpb25zLnNvbWUoXHJcblx0XHRcdFx0KG1hdGNoKSA9PlxyXG5cdFx0XHRcdFx0dHlwZW9mIG1hdGNoLml0ZW0gPT09IFwic3RyaW5nXCIgJiYgbWF0Y2guaXRlbSA9PT0gcXVlcnlcclxuXHRcdFx0KVxyXG5cdFx0KSB7XHJcblx0XHRcdC8vIENoZWNrIGlmIGl0J3MgYSB2YWxpZCBmaWxlIHBhdGhcclxuXHRcdFx0aWYgKHRoaXMuaXNWYWxpZEZpbGVOYW1lKHF1ZXJ5KSkge1xyXG5cdFx0XHRcdC8vIEFkZCBvcHRpb24gdG8gY3JlYXRlIGEgbmV3IGZpbGUgd2l0aCB0aGlzIG5hbWVcclxuXHRcdFx0XHRzdWdnZXN0aW9ucy5wdXNoKHtcclxuXHRcdFx0XHRcdGl0ZW06IHF1ZXJ5LFxyXG5cdFx0XHRcdFx0bWF0Y2g6IHsgc2NvcmU6IDEsIG1hdGNoZXM6IFtdIH0sXHJcblx0XHRcdFx0fSBhcyBGdXp6eU1hdGNoPHN0cmluZz4pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gTGltaXQgcmVzdWx0cyB0byAyMCB0byBhdm9pZCBwZXJmb3JtYW5jZSBpc3N1ZXNcclxuXHRcdHJldHVybiBzdWdnZXN0aW9ucy5zbGljZSgwLCAyMCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGlzVmFsaWRGaWxlTmFtZShuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHRcdC8vIEJhc2ljIHZhbGlkYXRpb24gZm9yIGZpbGUgbmFtZXNcclxuXHRcdHJldHVybiBuYW1lLmxlbmd0aCA+IDAgJiYgIW5hbWUuaW5jbHVkZXMoXCIvXCIpICYmICFuYW1lLmluY2x1ZGVzKFwiXFxcXFwiKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgY3JlYXRlTmV3RmlsZVdpdGhUYXNrcyhmaWxlTmFtZTogc3RyaW5nKSB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBFbnN1cmUgZmlsZSBuYW1lIGhhcyAubWQgZXh0ZW5zaW9uXHJcblx0XHRcdGlmICghZmlsZU5hbWUuZW5kc1dpdGgoXCIubWRcIikpIHtcclxuXHRcdFx0XHRmaWxlTmFtZSArPSBcIi5tZFwiO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBHZXQgdGFzayBjb250ZW50XHJcblx0XHRcdGNvbnN0IHRhc2tDb250ZW50ID0gdGhpcy5nZXRUYXNrV2l0aENoaWxkcmVuKCk7XHJcblxyXG5cdFx0XHQvLyBSZXNldCBpbmRlbnRhdGlvbiBmb3IgbmV3IGZpbGUgKHJlbW92ZSBhbGwgaW5kZW50YXRpb24gZnJvbSB0YXNrcylcclxuXHRcdFx0Y29uc3QgcmVzZXRJbmRlbnRDb250ZW50ID0gdGhpcy5yZXNldEluZGVudGF0aW9uKHRhc2tDb250ZW50KTtcclxuXHJcblx0XHRcdC8vIENyZWF0ZSBmaWxlIGluIHRoZSBzYW1lIGZvbGRlciBhcyBjdXJyZW50IGZpbGVcclxuXHRcdFx0Y29uc3QgZm9sZGVyID0gdGhpcy5jdXJyZW50RmlsZS5wYXJlbnQ7XHJcblx0XHRcdGNvbnN0IGZpbGVQYXRoID0gZm9sZGVyID8gYCR7Zm9sZGVyLnBhdGh9LyR7ZmlsZU5hbWV9YCA6IGZpbGVOYW1lO1xyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIHRoZSBmaWxlXHJcblx0XHRcdGNvbnN0IG5ld0ZpbGUgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGUoXHJcblx0XHRcdFx0ZmlsZVBhdGgsXHJcblx0XHRcdFx0cmVzZXRJbmRlbnRDb250ZW50XHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBSZW1vdmUgdGhlIHRhc2sgZnJvbSB0aGUgY3VycmVudCBmaWxlXHJcblx0XHRcdHRoaXMucmVtb3ZlVGFza0Zyb21DdXJyZW50RmlsZSgpO1xyXG5cclxuXHRcdFx0Ly8gT3BlbiB0aGUgbmV3IGZpbGVcclxuXHRcdFx0dGhpcy5hcHAud29ya3NwYWNlLmdldExlYWYodHJ1ZSkub3BlbkZpbGUobmV3RmlsZSk7XHJcblxyXG5cdFx0XHRuZXcgTm90aWNlKGAke3QoXCJUYXNrIG1vdmVkIHRvXCIpfSAke2ZpbGVOYW1lfWApO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0bmV3IE5vdGljZShgJHt0KFwiRmFpbGVkIHRvIGNyZWF0ZSBmaWxlOlwiKX0gJHtlcnJvcn1gKTtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihlcnJvcik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldFRhc2tXaXRoQ2hpbGRyZW4oKTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IGNvbnRlbnQgPSB0aGlzLmVkaXRvci5nZXRWYWx1ZSgpO1xyXG5cdFx0Y29uc3QgbGluZXMgPSBjb250ZW50LnNwbGl0KFwiXFxuXCIpO1xyXG5cclxuXHRcdC8vIEdldCB0aGUgY3VycmVudCB0YXNrIGxpbmVcclxuXHRcdGNvbnN0IGN1cnJlbnRMaW5lID0gbGluZXNbdGhpcy50YXNrTGluZV07XHJcblx0XHRjb25zdCBjdXJyZW50SW5kZW50ID0gdGhpcy5nZXRJbmRlbnRhdGlvbihjdXJyZW50TGluZSk7XHJcblxyXG5cdFx0Ly8gSW5jbHVkZSB0aGUgY3VycmVudCBsaW5lIGFuZCBhbGwgY2hpbGQgdGFza3NcclxuXHRcdGNvbnN0IHJlc3VsdExpbmVzID0gW2N1cnJlbnRMaW5lXTtcclxuXHJcblx0XHQvLyBMb29rIGZvciBjaGlsZCB0YXNrcyAod2l0aCBtb3JlIGluZGVudGF0aW9uKVxyXG5cdFx0Zm9yIChsZXQgaSA9IHRoaXMudGFza0xpbmUgKyAxOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0Y29uc3QgbGluZSA9IGxpbmVzW2ldO1xyXG5cdFx0XHRjb25zdCBsaW5lSW5kZW50ID0gdGhpcy5nZXRJbmRlbnRhdGlvbihsaW5lKTtcclxuXHJcblx0XHRcdC8vIElmIGluZGVudGF0aW9uIGlzIGxlc3Mgb3IgZXF1YWwgdG8gY3VycmVudCB0YXNrLCB3ZSd2ZSBleGl0ZWQgdGhlIGNoaWxkIHRhc2tzXHJcblx0XHRcdGlmIChsaW5lSW5kZW50IDw9IGN1cnJlbnRJbmRlbnQpIHtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmVzdWx0TGluZXMucHVzaChsaW5lKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gcmVzdWx0TGluZXMuam9pbihcIlxcblwiKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVtb3ZlVGFza0Zyb21DdXJyZW50RmlsZSgpIHtcclxuXHRcdGNvbnN0IGNvbnRlbnQgPSB0aGlzLmVkaXRvci5nZXRWYWx1ZSgpO1xyXG5cdFx0Y29uc3QgbGluZXMgPSBjb250ZW50LnNwbGl0KFwiXFxuXCIpO1xyXG5cclxuXHRcdGNvbnN0IGN1cnJlbnRJbmRlbnQgPSB0aGlzLmdldEluZGVudGF0aW9uKGxpbmVzW3RoaXMudGFza0xpbmVdKTtcclxuXHJcblx0XHQvLyBGaW5kIHRoZSByYW5nZSBvZiBsaW5lcyB0byByZW1vdmVcclxuXHRcdGxldCBlbmRMaW5lID0gdGhpcy50YXNrTGluZTtcclxuXHRcdGZvciAobGV0IGkgPSB0aGlzLnRhc2tMaW5lICsgMTsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGNvbnN0IGxpbmVJbmRlbnQgPSB0aGlzLmdldEluZGVudGF0aW9uKGxpbmVzW2ldKTtcclxuXHJcblx0XHRcdGlmIChsaW5lSW5kZW50IDw9IGN1cnJlbnRJbmRlbnQpIHtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0ZW5kTGluZSA9IGk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIHRoZSB0YXNrIGxpbmVzIHVzaW5nIHJlcGxhY2VSYW5nZVxyXG5cdFx0dGhpcy5lZGl0b3IucmVwbGFjZVJhbmdlKFxyXG5cdFx0XHRcIlwiLFxyXG5cdFx0XHR7IGxpbmU6IHRoaXMudGFza0xpbmUsIGNoOiAwIH0sXHJcblx0XHRcdHsgbGluZTogZW5kTGluZSArIDEsIGNoOiAwIH1cclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldEluZGVudGF0aW9uKGxpbmU6IHN0cmluZyk6IG51bWJlciB7XHJcblx0XHRjb25zdCBtYXRjaCA9IGxpbmUubWF0Y2goL14oXFxzKikvKTtcclxuXHRcdHJldHVybiBtYXRjaCA/IG1hdGNoWzFdLmxlbmd0aCA6IDA7XHJcblx0fVxyXG5cclxuXHQvLyBSZXNldCBpbmRlbnRhdGlvbiBmb3IgbmV3IGZpbGVzXHJcblx0cHJpdmF0ZSByZXNldEluZGVudGF0aW9uKGNvbnRlbnQ6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHRjb25zdCBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoXCJcXG5cIik7XHJcblxyXG5cdFx0Ly8gRmluZCB0aGUgbWluaW11bSBpbmRlbnRhdGlvbiBpbiBhbGwgbGluZXNcclxuXHRcdGxldCBtaW5JbmRlbnQgPSBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUjtcclxuXHRcdGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xyXG5cdFx0XHRpZiAobGluZS50cmltKCkubGVuZ3RoID09PSAwKSBjb250aW51ZTsgLy8gU2tpcCBlbXB0eSBsaW5lc1xyXG5cdFx0XHRjb25zdCBpbmRlbnQgPSB0aGlzLmdldEluZGVudGF0aW9uKGxpbmUpO1xyXG5cdFx0XHRtaW5JbmRlbnQgPSBNYXRoLm1pbihtaW5JbmRlbnQsIGluZGVudCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSWYgbm8gdmFsaWQgbWluaW11bSBmb3VuZCwgb3IgaXQncyBhbHJlYWR5IDAsIHJldHVybiBhcyBpc1xyXG5cdFx0aWYgKG1pbkluZGVudCA9PT0gTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVIgfHwgbWluSW5kZW50ID09PSAwKSB7XHJcblx0XHRcdHJldHVybiBjb250ZW50O1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlbW92ZSB0aGUgbWluaW11bSBpbmRlbnRhdGlvbiBmcm9tIGVhY2ggbGluZVxyXG5cdFx0cmV0dXJuIGxpbmVzXHJcblx0XHRcdC5tYXAoKGxpbmUpID0+IHtcclxuXHRcdFx0XHRpZiAobGluZS50cmltKCkubGVuZ3RoID09PSAwKSByZXR1cm4gbGluZTsgLy8gS2VlcCBlbXB0eSBsaW5lcyB1bmNoYW5nZWRcclxuXHRcdFx0XHRyZXR1cm4gbGluZS5zdWJzdHJpbmcobWluSW5kZW50KTtcclxuXHRcdFx0fSlcclxuXHRcdFx0LmpvaW4oXCJcXG5cIik7XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICogTW9kYWwgZm9yIHNlbGVjdGluZyBhIGhlYWRpbmcgdG8gaW5zZXJ0IGFmdGVyIGluIHRoZSB0YXJnZXQgZmlsZVxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIEJsb2NrU2VsZWN0aW9uTW9kYWwgZXh0ZW5kcyBTdWdnZXN0TW9kYWw8e1xyXG5cdGlkOiBzdHJpbmc7XHJcblx0dGV4dDogc3RyaW5nO1xyXG5cdGxldmVsOiBudW1iZXI7XHJcblx0bGluZTogbnVtYmVyO1xyXG59PiB7XHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblx0ZWRpdG9yOiBFZGl0b3I7XHJcblx0c291cmNlRmlsZTogVEZpbGU7XHJcblx0dGFyZ2V0RmlsZTogVEZpbGU7XHJcblx0dGFza0xpbmU6IG51bWJlcjtcclxuXHRtZXRhZGF0YUNhY2hlOiBNZXRhZGF0YUNhY2hlO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdGFwcDogQXBwLFxyXG5cdFx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRlZGl0b3I6IEVkaXRvcixcclxuXHRcdHNvdXJjZUZpbGU6IFRGaWxlLFxyXG5cdFx0dGFyZ2V0RmlsZTogVEZpbGUsXHJcblx0XHR0YXNrTGluZTogbnVtYmVyXHJcblx0KSB7XHJcblx0XHRzdXBlcihhcHApO1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0XHR0aGlzLmVkaXRvciA9IGVkaXRvcjtcclxuXHRcdHRoaXMuc291cmNlRmlsZSA9IHNvdXJjZUZpbGU7XHJcblx0XHR0aGlzLnRhcmdldEZpbGUgPSB0YXJnZXRGaWxlO1xyXG5cdFx0dGhpcy50YXNrTGluZSA9IHRhc2tMaW5lO1xyXG5cdFx0dGhpcy5tZXRhZGF0YUNhY2hlID0gYXBwLm1ldGFkYXRhQ2FjaGU7XHJcblx0XHR0aGlzLnNldFBsYWNlaG9sZGVyKFwiU2VsZWN0IHdoZXJlIHRvIGluc2VydCB0aGUgdGFza1wiKTtcclxuXHR9XHJcblxyXG5cdGFzeW5jIGdldFN1Z2dlc3Rpb25zKFxyXG5cdFx0cXVlcnk6IHN0cmluZ1xyXG5cdCk6IFByb21pc2U8eyBpZDogc3RyaW5nOyB0ZXh0OiBzdHJpbmc7IGxldmVsOiBudW1iZXI7IGxpbmU6IG51bWJlciB9W10+IHtcclxuXHRcdC8vIEdldCBmaWxlIGNvbnRlbnRcclxuXHRcdGNvbnN0IGZpbGVDb250ZW50ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZCh0aGlzLnRhcmdldEZpbGUpO1xyXG5cdFx0Y29uc3QgbGluZXMgPSBmaWxlQ29udGVudC5zcGxpdChcIlxcblwiKTtcclxuXHJcblx0XHQvLyBHZXQgZmlsZSBjYWNoZSB0byBmaW5kIGhlYWRpbmdzXHJcblx0XHRjb25zdCBmaWxlQ2FjaGUgPSB0aGlzLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKHRoaXMudGFyZ2V0RmlsZSk7XHJcblxyXG5cdFx0bGV0IGJsb2Nrczoge1xyXG5cdFx0XHRpZDogc3RyaW5nO1xyXG5cdFx0XHR0ZXh0OiBzdHJpbmc7XHJcblx0XHRcdGxldmVsOiBudW1iZXI7XHJcblx0XHRcdGxpbmU6IG51bWJlcjtcclxuXHRcdH1bXSA9IFtdO1xyXG5cclxuXHRcdC8vIEFkZCBvcHRpb25zIHRvIGluc2VydCBhdCB0aGUgYmVnaW5uaW5nIG9yIGVuZCBvZiB0aGUgZmlsZVxyXG5cdFx0YmxvY2tzLnB1c2goe1xyXG5cdFx0XHRpZDogXCJiZWdpbm5pbmdcIixcclxuXHRcdFx0dGV4dDogdChcIkJlZ2lubmluZyBvZiBmaWxlXCIpLFxyXG5cdFx0XHRsZXZlbDogMCxcclxuXHRcdFx0bGluZTogMCxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGJsb2Nrcy5wdXNoKHtcclxuXHRcdFx0aWQ6IFwiZW5kXCIsXHJcblx0XHRcdHRleHQ6IHQoXCJFbmQgb2YgZmlsZVwiKSxcclxuXHRcdFx0bGV2ZWw6IDAsXHJcblx0XHRcdGxpbmU6IGxpbmVzLmxlbmd0aCxcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEFkZCBoZWFkaW5nc1xyXG5cdFx0aWYgKGZpbGVDYWNoZSAmJiBmaWxlQ2FjaGUuaGVhZGluZ3MpIHtcclxuXHRcdFx0Zm9yIChjb25zdCBoZWFkaW5nIG9mIGZpbGVDYWNoZS5oZWFkaW5ncykge1xyXG5cdFx0XHRcdGNvbnN0IHRleHQgPSBsaW5lc1toZWFkaW5nLnBvc2l0aW9uLnN0YXJ0LmxpbmVdO1xyXG5cdFx0XHRcdGJsb2Nrcy5wdXNoKHtcclxuXHRcdFx0XHRcdGlkOiBgaGVhZGluZy1zdGFydC0ke2hlYWRpbmcucG9zaXRpb24uc3RhcnQubGluZX1gLFxyXG5cdFx0XHRcdFx0dGV4dDogYCR7dChcIkFmdGVyIGhlYWRpbmdcIil9OiAke3RleHR9YCxcclxuXHRcdFx0XHRcdGxldmVsOiBoZWFkaW5nLmxldmVsLFxyXG5cdFx0XHRcdFx0bGluZTogaGVhZGluZy5wb3NpdGlvbi5zdGFydC5saW5lLFxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyBBZGQgb3B0aW9uIHRvIGluc2VydCBhdCBlbmQgb2Ygc2VjdGlvblxyXG5cdFx0XHRcdGJsb2Nrcy5wdXNoKHtcclxuXHRcdFx0XHRcdGlkOiBgaGVhZGluZy1lbmQtJHtoZWFkaW5nLnBvc2l0aW9uLnN0YXJ0LmxpbmV9YCxcclxuXHRcdFx0XHRcdHRleHQ6IGAke3QoXCJFbmQgb2Ygc2VjdGlvblwiKX06ICR7dGV4dH1gLFxyXG5cdFx0XHRcdFx0bGV2ZWw6IGhlYWRpbmcubGV2ZWwsXHJcblx0XHRcdFx0XHRsaW5lOiBoZWFkaW5nLnBvc2l0aW9uLnN0YXJ0LmxpbmUsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBGaWx0ZXIgYmxvY2tzIGJhc2VkIG9uIHF1ZXJ5XHJcblx0XHRpZiAocXVlcnkpIHtcclxuXHRcdFx0YmxvY2tzID0gYmxvY2tzLmZpbHRlcigoYmxvY2spID0+XHJcblx0XHRcdFx0YmxvY2sudGV4dC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHF1ZXJ5LnRvTG93ZXJDYXNlKCkpXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gTGltaXQgcmVzdWx0cyB0byAyMCB0byBhdm9pZCBwZXJmb3JtYW5jZSBpc3N1ZXNcclxuXHRcdHJldHVybiBibG9ja3Muc2xpY2UoMCwgMjApO1xyXG5cdH1cclxuXHJcblx0cmVuZGVyU3VnZ2VzdGlvbihcclxuXHRcdGJsb2NrOiB7IGlkOiBzdHJpbmc7IHRleHQ6IHN0cmluZzsgbGV2ZWw6IG51bWJlcjsgbGluZTogbnVtYmVyIH0sXHJcblx0XHRlbDogSFRNTEVsZW1lbnRcclxuXHQpIHtcclxuXHRcdGNvbnN0IGluZGVudCA9IFwiICBcIi5yZXBlYXQoYmxvY2subGV2ZWwpO1xyXG5cdFx0ZWwuY3JlYXRlRWwoXCJkaXZcIiwgeyB0ZXh0OiBgJHtpbmRlbnR9JHtibG9jay50ZXh0fWAgfSk7XHJcblx0fVxyXG5cclxuXHRvbkNob29zZVN1Z2dlc3Rpb24oXHJcblx0XHRibG9jazogeyBpZDogc3RyaW5nOyB0ZXh0OiBzdHJpbmc7IGxldmVsOiBudW1iZXI7IGxpbmU6IG51bWJlciB9LFxyXG5cdFx0ZXZ0OiBNb3VzZUV2ZW50IHwgS2V5Ym9hcmRFdmVudFxyXG5cdCkge1xyXG5cdFx0dGhpcy5tb3ZlVGFza1RvVGFyZ2V0RmlsZShibG9jayk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIG1vdmVUYXNrVG9UYXJnZXRGaWxlKGJsb2NrOiB7XHJcblx0XHRpZDogc3RyaW5nO1xyXG5cdFx0dGV4dDogc3RyaW5nO1xyXG5cdFx0bGV2ZWw6IG51bWJlcjtcclxuXHRcdGxpbmU6IG51bWJlcjtcclxuXHR9KSB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBHZXQgdGFzayBjb250ZW50XHJcblx0XHRcdGNvbnN0IHRhc2tDb250ZW50ID0gdGhpcy5nZXRUYXNrV2l0aENoaWxkcmVuKCk7XHJcblxyXG5cdFx0XHQvLyBSZWFkIHRhcmdldCBmaWxlIGNvbnRlbnRcclxuXHRcdFx0Y29uc3QgZmlsZUNvbnRlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKHRoaXMudGFyZ2V0RmlsZSk7XHJcblx0XHRcdGNvbnN0IGxpbmVzID0gZmlsZUNvbnRlbnQuc3BsaXQoXCJcXG5cIik7XHJcblxyXG5cdFx0XHRsZXQgaW5zZXJ0UG9zaXRpb246IG51bWJlcjtcclxuXHRcdFx0bGV0IGluZGVudExldmVsOiBudW1iZXIgPSAwO1xyXG5cclxuXHRcdFx0aWYgKGJsb2NrLmlkID09PSBcImJlZ2lubmluZ1wiKSB7XHJcblx0XHRcdFx0aW5zZXJ0UG9zaXRpb24gPSAwO1xyXG5cdFx0XHR9IGVsc2UgaWYgKGJsb2NrLmlkID09PSBcImVuZFwiKSB7XHJcblx0XHRcdFx0aW5zZXJ0UG9zaXRpb24gPSBsaW5lcy5sZW5ndGg7XHJcblx0XHRcdH0gZWxzZSBpZiAoYmxvY2suaWQuc3RhcnRzV2l0aChcImhlYWRpbmctc3RhcnQtXCIpKSB7XHJcblx0XHRcdFx0Ly8gSW5zZXJ0IGFmdGVyIHRoZSBoZWFkaW5nXHJcblx0XHRcdFx0aW5zZXJ0UG9zaXRpb24gPSBibG9jay5saW5lICsgMTtcclxuXHRcdFx0XHQvLyBBZGQgb25lIGxldmVsIG9mIGluZGVudGF0aW9uIGZvciBjb250ZW50IHVuZGVyIGEgaGVhZGluZ1xyXG5cdFx0XHRcdGluZGVudExldmVsID0gYnVpbGRJbmRlbnRTdHJpbmcodGhpcy5hcHApLmxlbmd0aDtcclxuXHRcdFx0fSBlbHNlIGlmIChibG9jay5pZC5zdGFydHNXaXRoKFwiaGVhZGluZy1lbmQtXCIpKSB7XHJcblx0XHRcdFx0Ly8gRmluZCB0aGUgZW5kIG9mIHRoaXMgc2VjdGlvbiAobmV4dCBoZWFkaW5nIG9mIHNhbWUgb3IgbG93ZXIgbGV2ZWwpXHJcblx0XHRcdFx0aW5zZXJ0UG9zaXRpb24gPSB0aGlzLmZpbmRTZWN0aW9uRW5kKFxyXG5cdFx0XHRcdFx0bGluZXMsXHJcblx0XHRcdFx0XHRibG9jay5saW5lLFxyXG5cdFx0XHRcdFx0YmxvY2subGV2ZWxcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdC8vIEFkZCBvbmUgbGV2ZWwgb2YgaW5kZW50YXRpb24gZm9yIGNvbnRlbnQgdW5kZXIgYSBoZWFkaW5nXHJcblx0XHRcdFx0aW5kZW50TGV2ZWwgPSBidWlsZEluZGVudFN0cmluZyh0aGlzLmFwcCkubGVuZ3RoO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgYmxvY2sgSURcIik7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFJlc2V0IHRhc2sgaW5kZW50YXRpb24gdG8gMCBhbmQgdGhlbiBhZGQgdGFyZ2V0IGluZGVudGF0aW9uXHJcblx0XHRcdGNvbnN0IHJlc2V0SW5kZW50Q29udGVudCA9IHRoaXMucmVzZXRJbmRlbnRhdGlvbih0YXNrQ29udGVudCk7XHJcblx0XHRcdGNvbnN0IGluZGVudGVkVGFza0NvbnRlbnQgPSB0aGlzLmFkZEluZGVudGF0aW9uKFxyXG5cdFx0XHRcdHJlc2V0SW5kZW50Q29udGVudCxcclxuXHRcdFx0XHQwXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBJbnNlcnQgdGFzayBhdCB0aGUgcG9zaXRpb25cclxuXHRcdFx0YXdhaXQgdGhpcy5hcHAudmF1bHQubW9kaWZ5KFxyXG5cdFx0XHRcdHRoaXMudGFyZ2V0RmlsZSxcclxuXHRcdFx0XHRbXHJcblx0XHRcdFx0XHQuLi5saW5lcy5zbGljZSgwLCBpbnNlcnRQb3NpdGlvbiksXHJcblx0XHRcdFx0XHRpbmRlbnRlZFRhc2tDb250ZW50LFxyXG5cdFx0XHRcdFx0Li4ubGluZXMuc2xpY2UoaW5zZXJ0UG9zaXRpb24pLFxyXG5cdFx0XHRcdF0uam9pbihcIlxcblwiKVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gUmVtb3ZlIHRhc2sgZnJvbSBzb3VyY2UgZmlsZVxyXG5cdFx0XHR0aGlzLnJlbW92ZVRhc2tGcm9tU291cmNlRmlsZSgpO1xyXG5cclxuXHRcdFx0bmV3IE5vdGljZShgJHt0KFwiVGFzayBtb3ZlZCB0b1wiKX0gJHt0aGlzLnRhcmdldEZpbGUucGF0aH1gKTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdG5ldyBOb3RpY2UoYCR7dChcIkZhaWxlZCB0byBtb3ZlIHRhc2s6XCIpfSAke2Vycm9yfWApO1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKGVycm9yKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIEZpbmQgdGhlIGVuZCBvZiBhIHNlY3Rpb24gKGxpbmUgbnVtYmVyIG9mIHRoZSBuZXh0IGhlYWRpbmcgd2l0aCBzYW1lIG9yIGxvd2VyIGxldmVsKVxyXG5cdHByaXZhdGUgZmluZFNlY3Rpb25FbmQoXHJcblx0XHRsaW5lczogc3RyaW5nW10sXHJcblx0XHRoZWFkaW5nTGluZTogbnVtYmVyLFxyXG5cdFx0aGVhZGluZ0xldmVsOiBudW1iZXJcclxuXHQpOiBudW1iZXIge1xyXG5cdFx0Zm9yIChsZXQgaSA9IGhlYWRpbmdMaW5lICsgMTsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGNvbnN0IGxpbmUgPSBsaW5lc1tpXTtcclxuXHRcdFx0Ly8gQ2hlY2sgaWYgdGhpcyBsaW5lIGlzIGEgaGVhZGluZyB3aXRoIHNhbWUgb3IgbG93ZXIgbGV2ZWxcclxuXHRcdFx0Y29uc3QgaGVhZGluZ01hdGNoID0gbGluZS5tYXRjaCgvXigjKylcXHMrLyk7XHJcblx0XHRcdGlmIChoZWFkaW5nTWF0Y2ggJiYgaGVhZGluZ01hdGNoWzFdLmxlbmd0aCA8PSBoZWFkaW5nTGV2ZWwpIHtcclxuXHRcdFx0XHRyZXR1cm4gaTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0Ly8gSWYgbm8gbWF0Y2hpbmcgaGVhZGluZyBmb3VuZCwgcmV0dXJuIGVuZCBvZiBmaWxlXHJcblx0XHRyZXR1cm4gbGluZXMubGVuZ3RoO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBnZXRUYXNrV2l0aENoaWxkcmVuKCk6IHN0cmluZyB7XHJcblx0XHRjb25zdCBjb250ZW50ID0gdGhpcy5lZGl0b3IuZ2V0VmFsdWUoKTtcclxuXHRcdGNvbnN0IGxpbmVzID0gY29udGVudC5zcGxpdChcIlxcblwiKTtcclxuXHJcblx0XHQvLyBHZXQgdGhlIGN1cnJlbnQgdGFzayBsaW5lXHJcblx0XHRjb25zdCBjdXJyZW50TGluZSA9IGxpbmVzW3RoaXMudGFza0xpbmVdO1xyXG5cdFx0Y29uc3QgY3VycmVudEluZGVudCA9IHRoaXMuZ2V0SW5kZW50YXRpb24oY3VycmVudExpbmUpO1xyXG5cclxuXHRcdC8vIEluY2x1ZGUgdGhlIGN1cnJlbnQgbGluZSBhbmQgYWxsIGNoaWxkIHRhc2tzXHJcblx0XHRjb25zdCByZXN1bHRMaW5lcyA9IFtjdXJyZW50TGluZV07XHJcblxyXG5cdFx0Ly8gTG9vayBmb3IgY2hpbGQgdGFza3MgKHdpdGggbW9yZSBpbmRlbnRhdGlvbilcclxuXHRcdGZvciAobGV0IGkgPSB0aGlzLnRhc2tMaW5lICsgMTsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGNvbnN0IGxpbmUgPSBsaW5lc1tpXTtcclxuXHRcdFx0Y29uc3QgbGluZUluZGVudCA9IHRoaXMuZ2V0SW5kZW50YXRpb24obGluZSk7XHJcblxyXG5cdFx0XHQvLyBJZiBpbmRlbnRhdGlvbiBpcyBsZXNzIG9yIGVxdWFsIHRvIGN1cnJlbnQgdGFzaywgd2UndmUgZXhpdGVkIHRoZSBjaGlsZCB0YXNrc1xyXG5cdFx0XHRpZiAobGluZUluZGVudCA8PSBjdXJyZW50SW5kZW50KSB7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJlc3VsdExpbmVzLnB1c2gobGluZSk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHJlc3VsdExpbmVzLmpvaW4oXCJcXG5cIik7XHJcblx0fVxyXG5cclxuXHQvLyBSZXNldCBhbGwgaW5kZW50YXRpb24gdG8gMFxyXG5cdHByaXZhdGUgcmVzZXRJbmRlbnRhdGlvbihjb250ZW50OiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgbGluZXMgPSBjb250ZW50LnNwbGl0KFwiXFxuXCIpO1xyXG5cclxuXHRcdC8vIEZpbmQgdGhlIG1pbmltdW0gaW5kZW50YXRpb24gaW4gYWxsIGxpbmVzXHJcblx0XHRsZXQgbWluSW5kZW50ID0gTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVI7XHJcblx0XHRmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcclxuXHRcdFx0aWYgKGxpbmUudHJpbSgpLmxlbmd0aCA9PT0gMCkgY29udGludWU7IC8vIFNraXAgZW1wdHkgbGluZXNcclxuXHRcdFx0Y29uc3QgaW5kZW50ID0gdGhpcy5nZXRJbmRlbnRhdGlvbihsaW5lKTtcclxuXHRcdFx0bWluSW5kZW50ID0gTWF0aC5taW4obWluSW5kZW50LCBpbmRlbnQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIElmIG5vIHZhbGlkIG1pbmltdW0gZm91bmQsIG9yIGl0J3MgYWxyZWFkeSAwLCByZXR1cm4gYXMgaXNcclxuXHRcdGlmIChtaW5JbmRlbnQgPT09IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSIHx8IG1pbkluZGVudCA9PT0gMCkge1xyXG5cdFx0XHRyZXR1cm4gY29udGVudDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZW1vdmUgdGhlIG1pbmltdW0gaW5kZW50YXRpb24gZnJvbSBlYWNoIGxpbmVcclxuXHRcdHJldHVybiBsaW5lc1xyXG5cdFx0XHQubWFwKChsaW5lKSA9PiB7XHJcblx0XHRcdFx0aWYgKGxpbmUudHJpbSgpLmxlbmd0aCA9PT0gMCkgcmV0dXJuIGxpbmU7IC8vIEtlZXAgZW1wdHkgbGluZXMgdW5jaGFuZ2VkXHJcblx0XHRcdFx0cmV0dXJuIGxpbmUuc3Vic3RyaW5nKG1pbkluZGVudCk7XHJcblx0XHRcdH0pXHJcblx0XHRcdC5qb2luKFwiXFxuXCIpO1xyXG5cdH1cclxuXHJcblx0Ly8gQWRkIGluZGVudGF0aW9uIHRvIGFsbCBsaW5lc1xyXG5cdHByaXZhdGUgYWRkSW5kZW50YXRpb24oY29udGVudDogc3RyaW5nLCBpbmRlbnRTaXplOiBudW1iZXIpOiBzdHJpbmcge1xyXG5cdFx0aWYgKGluZGVudFNpemUgPD0gMCkgcmV0dXJuIGNvbnRlbnQ7XHJcblxyXG5cdFx0Y29uc3QgaW5kZW50U3RyID0gYnVpbGRJbmRlbnRTdHJpbmcodGhpcy5hcHApLnJlcGVhdChcclxuXHRcdFx0aW5kZW50U2l6ZSAvIGJ1aWxkSW5kZW50U3RyaW5nKHRoaXMuYXBwKS5sZW5ndGhcclxuXHRcdCk7XHJcblx0XHRyZXR1cm4gY29udGVudFxyXG5cdFx0XHQuc3BsaXQoXCJcXG5cIilcclxuXHRcdFx0Lm1hcCgobGluZSkgPT4gKGxpbmUubGVuZ3RoID4gMCA/IGluZGVudFN0ciArIGxpbmUgOiBsaW5lKSlcclxuXHRcdFx0LmpvaW4oXCJcXG5cIik7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbW92ZVRhc2tGcm9tU291cmNlRmlsZSgpIHtcclxuXHRcdGNvbnN0IGNvbnRlbnQgPSB0aGlzLmVkaXRvci5nZXRWYWx1ZSgpO1xyXG5cdFx0Y29uc3QgbGluZXMgPSBjb250ZW50LnNwbGl0KFwiXFxuXCIpO1xyXG5cclxuXHRcdGNvbnN0IGN1cnJlbnRJbmRlbnQgPSB0aGlzLmdldEluZGVudGF0aW9uKGxpbmVzW3RoaXMudGFza0xpbmVdKTtcclxuXHJcblx0XHQvLyBGaW5kIHRoZSByYW5nZSBvZiBsaW5lcyB0byByZW1vdmVcclxuXHRcdGxldCBlbmRMaW5lID0gdGhpcy50YXNrTGluZTtcclxuXHRcdGZvciAobGV0IGkgPSB0aGlzLnRhc2tMaW5lICsgMTsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGNvbnN0IGxpbmVJbmRlbnQgPSB0aGlzLmdldEluZGVudGF0aW9uKGxpbmVzW2ldKTtcclxuXHJcblx0XHRcdGlmIChsaW5lSW5kZW50IDw9IGN1cnJlbnRJbmRlbnQpIHtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0ZW5kTGluZSA9IGk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIHRoZSB0YXNrIGxpbmVzIHVzaW5nIHJlcGxhY2VSYW5nZVxyXG5cdFx0dGhpcy5lZGl0b3IucmVwbGFjZVJhbmdlKFxyXG5cdFx0XHRcIlwiLFxyXG5cdFx0XHR7IGxpbmU6IHRoaXMudGFza0xpbmUsIGNoOiAwIH0sXHJcblx0XHRcdHsgbGluZTogZW5kTGluZSArIDEsIGNoOiAwIH1cclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldEluZGVudGF0aW9uKGxpbmU6IHN0cmluZyk6IG51bWJlciB7XHJcblx0XHRjb25zdCBtYXRjaCA9IGxpbmUubWF0Y2goL14oXFxzKikvKTtcclxuXHRcdHJldHVybiBtYXRjaCA/IG1hdGNoWzFdLmxlbmd0aCA6IDA7XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICogQ29tbWFuZCB0byBtb3ZlIHRoZSBjdXJyZW50IHRhc2sgdG8gYW5vdGhlciBmaWxlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbW92ZVRhc2tDb21tYW5kKFxyXG5cdGNoZWNraW5nOiBib29sZWFuLFxyXG5cdGVkaXRvcjogRWRpdG9yLFxyXG5cdGN0eDogTWFya2Rvd25WaWV3IHwgTWFya2Rvd25GaWxlSW5mbyxcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpblxyXG4pOiBib29sZWFuIHtcclxuXHQvLyBHZXQgdGhlIGN1cnJlbnQgZmlsZVxyXG5cdGNvbnN0IGN1cnJlbnRGaWxlID0gY3R4LmZpbGU7XHJcblxyXG5cdGlmIChjaGVja2luZykge1xyXG5cdFx0Ly8gSWYgY2hlY2tpbmcsIHJldHVybiB0cnVlIGlmIHdlJ3JlIGluIGEgc3VwcG9ydGVkIGZpbGUgYW5kIGN1cnNvciBpcyBvbiBhIHRhc2sgbGluZVxyXG5cdFx0aWYgKCFjdXJyZW50RmlsZSB8fCAhaXNTdXBwb3J0ZWRGaWxlKGN1cnJlbnRGaWxlKSkge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRm9yIG1hcmtkb3duIGZpbGVzLCBjaGVjayBpZiBjdXJzb3IgaXMgb24gYSB0YXNrIGxpbmVcclxuXHRcdGlmIChjdXJyZW50RmlsZS5leHRlbnNpb24gPT09IFwibWRcIikge1xyXG5cdFx0XHRjb25zdCBjdXJzb3IgPSBlZGl0b3IuZ2V0Q3Vyc29yKCk7XHJcblx0XHRcdGNvbnN0IGxpbmUgPSBlZGl0b3IuZ2V0TGluZShjdXJzb3IubGluZSk7XHJcblxyXG5cdFx0XHQvLyBDaGVjayBpZiBsaW5lIGlzIGEgdGFzayB3aXRoIGFueSBvZiB0aGUgc3VwcG9ydGVkIGxpc3QgbWFya2VycyAoLSwgMS4sICopXHJcblx0XHRcdHJldHVybiBsaW5lLm1hdGNoKC9eXFxzKigtfFxcZCtcXC58XFwqKSBcXFsoLilcXF0vaSkgIT09IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRm9yIGNhbnZhcyBmaWxlcywgd2UgZG9uJ3Qgc3VwcG9ydCBkaXJlY3QgZWRpdGluZyB5ZXRcclxuXHRcdC8vIFRoaXMgY29tbWFuZCBpcyBwcmltYXJpbHkgZm9yIG1hcmtkb3duIGZpbGVzXHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblx0fVxyXG5cclxuXHQvLyBFeGVjdXRlIHRoZSBjb21tYW5kXHJcblx0aWYgKCFjdXJyZW50RmlsZSkge1xyXG5cdFx0bmV3IE5vdGljZSh0KFwiTm8gYWN0aXZlIGZpbGUgZm91bmRcIikpO1xyXG5cdFx0cmV0dXJuIGZhbHNlO1xyXG5cdH1cclxuXHJcblx0Y29uc3QgY3Vyc29yID0gZWRpdG9yLmdldEN1cnNvcigpO1xyXG5cdG5ldyBGaWxlU2VsZWN0aW9uTW9kYWwoXHJcblx0XHRwbHVnaW4uYXBwLFxyXG5cdFx0cGx1Z2luLFxyXG5cdFx0ZWRpdG9yLFxyXG5cdFx0Y3VycmVudEZpbGUsXHJcblx0XHRjdXJzb3IubGluZVxyXG5cdCkub3BlbigpO1xyXG5cclxuXHRyZXR1cm4gdHJ1ZTtcclxufVxyXG4iXX0=