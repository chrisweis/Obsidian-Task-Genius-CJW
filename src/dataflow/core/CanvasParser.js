/**
 * Canvas file parser for extracting tasks from Obsidian Canvas files
 */
import { __awaiter } from "tslib";
import { MarkdownTaskParser } from "./ConfigurableTaskParser";
import { getConfig } from "../../common/task-parser-config";
/**
 * Default options for canvas parsing
 */
export const DEFAULT_CANVAS_PARSING_OPTIONS = {
    includeNodeIds: false,
    includePositions: false,
    nodeSeparator: "\n\n",
    preserveLineBreaks: true,
};
/**
 * Canvas file parser that extracts tasks from text nodes
 */
export class CanvasParser {
    constructor(parserConfig, options = {}) {
        this.markdownParser = new MarkdownTaskParser(parserConfig);
        this.options = Object.assign(Object.assign({}, DEFAULT_CANVAS_PARSING_OPTIONS), options);
    }
    /**
     * Parse a canvas file and extract tasks from text nodes
     */
    parseCanvasFile(canvasContent, filePath) {
        let canvasData = null;
        let parsedContent = null;
        try {
            // Parse the JSON content
            canvasData = JSON.parse(canvasContent);
            if (!canvasData) {
                return [];
            }
            // Extract and parse content
            parsedContent = this.extractCanvasContent(canvasData, filePath);
            if (!parsedContent) {
                return [];
            }
            // Parse tasks from the extracted text content
            const tasks = this.parseTasksFromCanvasContent(parsedContent);
            return tasks;
        }
        catch (error) {
            console.error(`Error parsing canvas file ${filePath}:`, error);
            return [];
        }
        finally {
            // Clear references to help garbage collection
            canvasData = null;
            parsedContent = null;
        }
    }
    /**
     * Extract text content from canvas data
     */
    extractCanvasContent(canvasData, filePath) {
        // Check if nodes exist
        if (!canvasData || !canvasData.nodes || !Array.isArray(canvasData.nodes)) {
            console.warn(`Canvas file ${filePath} has no nodes or invalid nodes structure`);
            return {
                canvasData,
                textContent: "",
                textNodes: [],
                filePath,
            };
        }
        // Filter text nodes
        const textNodes = canvasData.nodes.filter((node) => node.type === "text");
        // Extract text content from all text nodes
        const textContents = [];
        for (const textNode of textNodes) {
            let nodeContent = textNode.text;
            // Add node metadata if requested
            if (this.options.includeNodeIds) {
                nodeContent = `<!-- Node ID: ${textNode.id} -->\n${nodeContent}`;
            }
            if (this.options.includePositions) {
                nodeContent = `<!-- Position: x=${textNode.x}, y=${textNode.y} -->\n${nodeContent}`;
            }
            // Handle line breaks
            if (!this.options.preserveLineBreaks) {
                nodeContent = nodeContent.replace(/\n/g, " ");
            }
            textContents.push(nodeContent);
        }
        // Combine all text content
        const combinedText = textContents.join(this.options.nodeSeparator || "\n\n");
        return {
            canvasData,
            textContent: combinedText,
            textNodes,
            filePath,
        };
    }
    /**
     * Parse tasks from extracted canvas content
     */
    parseTasksFromCanvasContent(parsedContent) {
        const { textContent, filePath, textNodes } = parsedContent;
        // Use the markdown parser to extract tasks from the combined text
        const tasks = this.markdownParser.parseLegacy(textContent, filePath);
        // Enhance tasks with canvas-specific metadata
        return tasks.map((task) => this.enhanceTaskWithCanvasMetadata(task, parsedContent));
    }
    /**
     * Enhance a task with canvas-specific metadata
     */
    enhanceTaskWithCanvasMetadata(task, parsedContent) {
        // Try to find which text node this task came from
        const sourceNode = this.findSourceNode(task, parsedContent);
        if (sourceNode) {
            // Add canvas-specific metadata
            const canvasMetadata = Object.assign(Object.assign({}, task.metadata), { canvasNodeId: sourceNode.id, canvasPosition: {
                    x: sourceNode.x,
                    y: sourceNode.y,
                    width: sourceNode.width,
                    height: sourceNode.height,
                }, canvasColor: sourceNode.color, sourceType: "canvas" });
            task.metadata = canvasMetadata;
        }
        else {
            // Even if we can't find the source node, mark it as canvas
            task.metadata.sourceType = "canvas";
        }
        return task;
    }
    /**
     * Find the source text node for a given task
     */
    findSourceNode(task, parsedContent) {
        const { textNodes } = parsedContent;
        // Simple heuristic: find the node that contains the task content
        for (const node of textNodes) {
            if (node.text.includes(task.originalMarkdown)) {
                return node;
            }
        }
        return null;
    }
    /**
     * Update parser configuration
     */
    updateParserConfig(config) {
        this.markdownParser = new MarkdownTaskParser(config);
    }
    /**
     * Update parsing options
     */
    updateOptions(options) {
        this.options = Object.assign(Object.assign({}, this.options), options);
    }
    /**
     * Get current parsing options
     */
    getOptions() {
        return Object.assign({}, this.options);
    }
    /**
     * Validate canvas file content
     */
    static isValidCanvasContent(content) {
        try {
            const data = JSON.parse(content);
            return (typeof data === "object" &&
                data !== null &&
                Array.isArray(data.nodes) &&
                Array.isArray(data.edges));
        }
        catch (_a) {
            return false;
        }
    }
    /**
     * Extract only text content without parsing tasks (useful for preview)
     */
    extractTextOnly(canvasContent) {
        try {
            const canvasData = JSON.parse(canvasContent);
            const textNodes = canvasData.nodes.filter((node) => node.type === "text");
            return textNodes
                .map((node) => node.text)
                .join(this.options.nodeSeparator || "\n\n");
        }
        catch (error) {
            console.error("Error extracting text from canvas:", error);
            return "";
        }
    }
    /**
     * Parse Canvas JSON content safely
     * @param canvasContent Raw Canvas file content
     * @returns Parsed CanvasData or null if parsing fails
     */
    static parseCanvasJSON(canvasContent) {
        try {
            return JSON.parse(canvasContent);
        }
        catch (error) {
            console.error("Error parsing Canvas JSON:", error);
            return null;
        }
    }
    /**
     * Find a text node by ID in Canvas data
     * @param canvasData Parsed Canvas data
     * @param nodeId The node ID to find
     * @returns The text node or null if not found
     */
    static findTextNode(canvasData, nodeId) {
        const node = canvasData.nodes.find((n) => n.type === "text" && n.id === nodeId);
        return node || null;
    }
    /**
     * Get all text nodes from Canvas data
     * @param canvasData Parsed Canvas data
     * @returns Array of text nodes
     */
    static getTextNodes(canvasData) {
        return canvasData.nodes.filter((node) => node.type === "text");
    }
    /**
     * Static method for parsing Canvas files with plugin context
     * This replaces the separate parseCanvas function from CanvasEntry
     * @param plugin - The TaskProgressBarPlugin instance
     * @param file - File object with path property
     * @param content - Optional file content (if not provided, will be read from vault)
     * @returns Array of parsed tasks
     */
    static parseCanvas(plugin, file, content) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = getConfig(plugin.settings.preferMetadataFormat, plugin);
            const parser = new CanvasParser(config);
            const filePath = file.path;
            const text = content !== null && content !== void 0 ? content : yield plugin.app.vault.cachedRead(file);
            return parser.parseCanvasFile(text, filePath);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2FudmFzUGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQ2FudmFzUGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztHQUVHOztBQVVILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRTlELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUc1RDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLDhCQUE4QixHQUF5QjtJQUNuRSxjQUFjLEVBQUUsS0FBSztJQUNyQixnQkFBZ0IsRUFBRSxLQUFLO0lBQ3ZCLGFBQWEsRUFBRSxNQUFNO0lBQ3JCLGtCQUFrQixFQUFFLElBQUk7Q0FDeEIsQ0FBQztBQUVGOztHQUVHO0FBQ0gsTUFBTSxPQUFPLFlBQVk7SUFJeEIsWUFDQyxZQUE4QixFQUM5QixVQUF5QyxFQUFFO1FBRTNDLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMzRCxJQUFJLENBQUMsT0FBTyxtQ0FBUSw4QkFBOEIsR0FBSyxPQUFPLENBQUUsQ0FBQztJQUNsRSxDQUFDO0lBRUQ7O09BRUc7SUFDSSxlQUFlLENBQUMsYUFBcUIsRUFBRSxRQUFnQjtRQUM3RCxJQUFJLFVBQVUsR0FBc0IsSUFBSSxDQUFDO1FBQ3pDLElBQUksYUFBYSxHQUErQixJQUFJLENBQUM7UUFFckQsSUFBSTtZQUNILHlCQUF5QjtZQUN6QixVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUV2QyxJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUNoQixPQUFPLEVBQUUsQ0FBQzthQUNWO1lBRUQsNEJBQTRCO1lBQzVCLGFBQWEsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBRWhFLElBQUksQ0FBQyxhQUFhLEVBQUU7Z0JBQ25CLE9BQU8sRUFBRSxDQUFDO2FBQ1Y7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QUMsSUFBSSxDQUFDO1lBQzNCLE1BQU0sSUFBSSxHQUFHLE9BQU8sYUFBUCxPQUFPLGNBQVAsT0FBTyxHQUFJLE1BQU0sTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLElBQVcsQ0FBQyxDQUFDO1lBQ3ZFLE9BQU8sTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDL0MsQ0FBQztLQUFBO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQ2FudmFzIGZpbGUgcGFyc2VyIGZvciBleHRyYWN0aW5nIHRhc2tzIGZyb20gT2JzaWRpYW4gQ2FudmFzIGZpbGVzXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgVGFzaywgQ2FudmFzVGFza01ldGFkYXRhIH0gZnJvbSBcIi4uLy4uL3R5cGVzL3Rhc2tcIjtcclxuaW1wb3J0IHtcclxuXHRDYW52YXNEYXRhLFxyXG5cdENhbnZhc1RleHREYXRhLFxyXG5cdFBhcnNlZENhbnZhc0NvbnRlbnQsXHJcblx0Q2FudmFzUGFyc2luZ09wdGlvbnMsXHJcblx0QWxsQ2FudmFzTm9kZURhdGEsXHJcbn0gZnJvbSBcIi4uLy4uL3R5cGVzL2NhbnZhc1wiO1xyXG5pbXBvcnQgeyBNYXJrZG93blRhc2tQYXJzZXIgfSBmcm9tIFwiLi9Db25maWd1cmFibGVUYXNrUGFyc2VyXCI7XHJcbmltcG9ydCB7IFRhc2tQYXJzZXJDb25maWcgfSBmcm9tIFwiLi4vLi4vdHlwZXMvVGFza1BhcnNlckNvbmZpZ1wiO1xyXG5pbXBvcnQgeyBnZXRDb25maWcgfSBmcm9tIFwiLi4vLi4vY29tbW9uL3Rhc2stcGFyc2VyLWNvbmZpZ1wiO1xyXG5pbXBvcnQgdHlwZSBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIi4uLy4uL2luZGV4XCI7XHJcblxyXG4vKipcclxuICogRGVmYXVsdCBvcHRpb25zIGZvciBjYW52YXMgcGFyc2luZ1xyXG4gKi9cclxuZXhwb3J0IGNvbnN0IERFRkFVTFRfQ0FOVkFTX1BBUlNJTkdfT1BUSU9OUzogQ2FudmFzUGFyc2luZ09wdGlvbnMgPSB7XHJcblx0aW5jbHVkZU5vZGVJZHM6IGZhbHNlLFxyXG5cdGluY2x1ZGVQb3NpdGlvbnM6IGZhbHNlLFxyXG5cdG5vZGVTZXBhcmF0b3I6IFwiXFxuXFxuXCIsXHJcblx0cHJlc2VydmVMaW5lQnJlYWtzOiB0cnVlLFxyXG59O1xyXG5cclxuLyoqXHJcbiAqIENhbnZhcyBmaWxlIHBhcnNlciB0aGF0IGV4dHJhY3RzIHRhc2tzIGZyb20gdGV4dCBub2Rlc1xyXG4gKi9cclxuZXhwb3J0IGNsYXNzIENhbnZhc1BhcnNlciB7XHJcblx0cHJpdmF0ZSBtYXJrZG93blBhcnNlcjogTWFya2Rvd25UYXNrUGFyc2VyO1xyXG5cdHByaXZhdGUgb3B0aW9uczogQ2FudmFzUGFyc2luZ09wdGlvbnM7XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cGFyc2VyQ29uZmlnOiBUYXNrUGFyc2VyQ29uZmlnLFxyXG5cdFx0b3B0aW9uczogUGFydGlhbDxDYW52YXNQYXJzaW5nT3B0aW9ucz4gPSB7fVxyXG5cdCkge1xyXG5cdFx0dGhpcy5tYXJrZG93blBhcnNlciA9IG5ldyBNYXJrZG93blRhc2tQYXJzZXIocGFyc2VyQ29uZmlnKTtcclxuXHRcdHRoaXMub3B0aW9ucyA9IHsgLi4uREVGQVVMVF9DQU5WQVNfUEFSU0lOR19PUFRJT05TLCAuLi5vcHRpb25zIH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBQYXJzZSBhIGNhbnZhcyBmaWxlIGFuZCBleHRyYWN0IHRhc2tzIGZyb20gdGV4dCBub2Rlc1xyXG5cdCAqL1xyXG5cdHB1YmxpYyBwYXJzZUNhbnZhc0ZpbGUoY2FudmFzQ29udGVudDogc3RyaW5nLCBmaWxlUGF0aDogc3RyaW5nKTogVGFza1tdIHtcclxuXHRcdGxldCBjYW52YXNEYXRhOiBDYW52YXNEYXRhIHwgbnVsbCA9IG51bGw7XHJcblx0XHRsZXQgcGFyc2VkQ29udGVudDogUGFyc2VkQ2FudmFzQ29udGVudCB8IG51bGwgPSBudWxsO1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdC8vIFBhcnNlIHRoZSBKU09OIGNvbnRlbnRcclxuXHRcdFx0Y2FudmFzRGF0YSA9IEpTT04ucGFyc2UoY2FudmFzQ29udGVudCk7XHJcblxyXG5cdFx0XHRpZiAoIWNhbnZhc0RhdGEpIHtcclxuXHRcdFx0XHRyZXR1cm4gW107XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEV4dHJhY3QgYW5kIHBhcnNlIGNvbnRlbnRcclxuXHRcdFx0cGFyc2VkQ29udGVudCA9IHRoaXMuZXh0cmFjdENhbnZhc0NvbnRlbnQoY2FudmFzRGF0YSwgZmlsZVBhdGgpO1xyXG5cclxuXHRcdFx0aWYgKCFwYXJzZWRDb250ZW50KSB7XHJcblx0XHRcdFx0cmV0dXJuIFtdO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBQYXJzZSB0YXNrcyBmcm9tIHRoZSBleHRyYWN0ZWQgdGV4dCBjb250ZW50XHJcblx0XHRcdGNvbnN0IHRhc2tzID0gdGhpcy5wYXJzZVRhc2tzRnJvbUNhbnZhc0NvbnRlbnQocGFyc2VkQ29udGVudCk7XHJcblxyXG5cdFx0XHRyZXR1cm4gdGFza3M7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKGBFcnJvciBwYXJzaW5nIGNhbnZhcyBmaWxlICR7ZmlsZVBhdGh9OmAsIGVycm9yKTtcclxuXHRcdFx0cmV0dXJuIFtdO1xyXG5cdFx0fSBmaW5hbGx5IHtcclxuXHRcdFx0Ly8gQ2xlYXIgcmVmZXJlbmNlcyB0byBoZWxwIGdhcmJhZ2UgY29sbGVjdGlvblxyXG5cdFx0XHRjYW52YXNEYXRhID0gbnVsbDtcclxuXHRcdFx0cGFyc2VkQ29udGVudCA9IG51bGw7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFeHRyYWN0IHRleHQgY29udGVudCBmcm9tIGNhbnZhcyBkYXRhXHJcblx0ICovXHJcblx0cHJpdmF0ZSBleHRyYWN0Q2FudmFzQ29udGVudChcclxuXHRcdGNhbnZhc0RhdGE6IENhbnZhc0RhdGEsXHJcblx0XHRmaWxlUGF0aDogc3RyaW5nXHJcblx0KTogUGFyc2VkQ2FudmFzQ29udGVudCB7XHJcblx0XHQvLyBDaGVjayBpZiBub2RlcyBleGlzdFxyXG5cdFx0aWYgKCFjYW52YXNEYXRhIHx8ICFjYW52YXNEYXRhLm5vZGVzIHx8ICFBcnJheS5pc0FycmF5KGNhbnZhc0RhdGEubm9kZXMpKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihgQ2FudmFzIGZpbGUgJHtmaWxlUGF0aH0gaGFzIG5vIG5vZGVzIG9yIGludmFsaWQgbm9kZXMgc3RydWN0dXJlYCk7XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0Y2FudmFzRGF0YSxcclxuXHRcdFx0XHR0ZXh0Q29udGVudDogXCJcIixcclxuXHRcdFx0XHR0ZXh0Tm9kZXM6IFtdLFxyXG5cdFx0XHRcdGZpbGVQYXRoLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEZpbHRlciB0ZXh0IG5vZGVzXHJcblx0XHRjb25zdCB0ZXh0Tm9kZXMgPSBjYW52YXNEYXRhLm5vZGVzLmZpbHRlcihcclxuXHRcdFx0KG5vZGUpOiBub2RlIGlzIENhbnZhc1RleHREYXRhID0+IG5vZGUudHlwZSA9PT0gXCJ0ZXh0XCJcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gRXh0cmFjdCB0ZXh0IGNvbnRlbnQgZnJvbSBhbGwgdGV4dCBub2Rlc1xyXG5cdFx0Y29uc3QgdGV4dENvbnRlbnRzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuXHRcdGZvciAoY29uc3QgdGV4dE5vZGUgb2YgdGV4dE5vZGVzKSB7XHJcblx0XHRcdGxldCBub2RlQ29udGVudCA9IHRleHROb2RlLnRleHQ7XHJcblxyXG5cdFx0XHQvLyBBZGQgbm9kZSBtZXRhZGF0YSBpZiByZXF1ZXN0ZWRcclxuXHRcdFx0aWYgKHRoaXMub3B0aW9ucy5pbmNsdWRlTm9kZUlkcykge1xyXG5cdFx0XHRcdG5vZGVDb250ZW50ID0gYDwhLS0gTm9kZSBJRDogJHt0ZXh0Tm9kZS5pZH0gLS0+XFxuJHtub2RlQ29udGVudH1gO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAodGhpcy5vcHRpb25zLmluY2x1ZGVQb3NpdGlvbnMpIHtcclxuXHRcdFx0XHRub2RlQ29udGVudCA9IGA8IS0tIFBvc2l0aW9uOiB4PSR7dGV4dE5vZGUueH0sIHk9JHt0ZXh0Tm9kZS55fSAtLT5cXG4ke25vZGVDb250ZW50fWA7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEhhbmRsZSBsaW5lIGJyZWFrc1xyXG5cdFx0XHRpZiAoIXRoaXMub3B0aW9ucy5wcmVzZXJ2ZUxpbmVCcmVha3MpIHtcclxuXHRcdFx0XHRub2RlQ29udGVudCA9IG5vZGVDb250ZW50LnJlcGxhY2UoL1xcbi9nLCBcIiBcIik7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHRleHRDb250ZW50cy5wdXNoKG5vZGVDb250ZW50KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDb21iaW5lIGFsbCB0ZXh0IGNvbnRlbnRcclxuXHRcdGNvbnN0IGNvbWJpbmVkVGV4dCA9IHRleHRDb250ZW50cy5qb2luKFxyXG5cdFx0XHR0aGlzLm9wdGlvbnMubm9kZVNlcGFyYXRvciB8fCBcIlxcblxcblwiXHJcblx0XHQpO1xyXG5cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGNhbnZhc0RhdGEsXHJcblx0XHRcdHRleHRDb250ZW50OiBjb21iaW5lZFRleHQsXHJcblx0XHRcdHRleHROb2RlcyxcclxuXHRcdFx0ZmlsZVBhdGgsXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUGFyc2UgdGFza3MgZnJvbSBleHRyYWN0ZWQgY2FudmFzIGNvbnRlbnRcclxuXHQgKi9cclxuXHRwcml2YXRlIHBhcnNlVGFza3NGcm9tQ2FudmFzQ29udGVudChcclxuXHRcdHBhcnNlZENvbnRlbnQ6IFBhcnNlZENhbnZhc0NvbnRlbnRcclxuXHQpOiBUYXNrW10ge1xyXG5cdFx0Y29uc3QgeyB0ZXh0Q29udGVudCwgZmlsZVBhdGgsIHRleHROb2RlcyB9ID0gcGFyc2VkQ29udGVudDtcclxuXHJcblx0XHQvLyBVc2UgdGhlIG1hcmtkb3duIHBhcnNlciB0byBleHRyYWN0IHRhc2tzIGZyb20gdGhlIGNvbWJpbmVkIHRleHRcclxuXHRcdGNvbnN0IHRhc2tzID0gdGhpcy5tYXJrZG93blBhcnNlci5wYXJzZUxlZ2FjeSh0ZXh0Q29udGVudCwgZmlsZVBhdGgpO1xyXG5cclxuXHRcdC8vIEVuaGFuY2UgdGFza3Mgd2l0aCBjYW52YXMtc3BlY2lmaWMgbWV0YWRhdGFcclxuXHRcdHJldHVybiB0YXNrcy5tYXAoKHRhc2spID0+XHJcblx0XHRcdHRoaXMuZW5oYW5jZVRhc2tXaXRoQ2FudmFzTWV0YWRhdGEodGFzaywgcGFyc2VkQ29udGVudClcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFbmhhbmNlIGEgdGFzayB3aXRoIGNhbnZhcy1zcGVjaWZpYyBtZXRhZGF0YVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZW5oYW5jZVRhc2tXaXRoQ2FudmFzTWV0YWRhdGEoXHJcblx0XHR0YXNrOiBUYXNrLFxyXG5cdFx0cGFyc2VkQ29udGVudDogUGFyc2VkQ2FudmFzQ29udGVudFxyXG5cdCk6IFRhc2s8Q2FudmFzVGFza01ldGFkYXRhPiB7XHJcblx0XHQvLyBUcnkgdG8gZmluZCB3aGljaCB0ZXh0IG5vZGUgdGhpcyB0YXNrIGNhbWUgZnJvbVxyXG5cdFx0Y29uc3Qgc291cmNlTm9kZSA9IHRoaXMuZmluZFNvdXJjZU5vZGUodGFzaywgcGFyc2VkQ29udGVudCk7XHJcblxyXG5cdFx0aWYgKHNvdXJjZU5vZGUpIHtcclxuXHRcdFx0Ly8gQWRkIGNhbnZhcy1zcGVjaWZpYyBtZXRhZGF0YVxyXG5cdFx0XHRjb25zdCBjYW52YXNNZXRhZGF0YTogQ2FudmFzVGFza01ldGFkYXRhID0ge1xyXG5cdFx0XHRcdC4uLnRhc2subWV0YWRhdGEsXHJcblx0XHRcdFx0Y2FudmFzTm9kZUlkOiBzb3VyY2VOb2RlLmlkLFxyXG5cdFx0XHRcdGNhbnZhc1Bvc2l0aW9uOiB7XHJcblx0XHRcdFx0XHR4OiBzb3VyY2VOb2RlLngsXHJcblx0XHRcdFx0XHR5OiBzb3VyY2VOb2RlLnksXHJcblx0XHRcdFx0XHR3aWR0aDogc291cmNlTm9kZS53aWR0aCxcclxuXHRcdFx0XHRcdGhlaWdodDogc291cmNlTm9kZS5oZWlnaHQsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRjYW52YXNDb2xvcjogc291cmNlTm9kZS5jb2xvcixcclxuXHRcdFx0XHRzb3VyY2VUeXBlOiBcImNhbnZhc1wiLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0dGFzay5tZXRhZGF0YSA9IGNhbnZhc01ldGFkYXRhO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gRXZlbiBpZiB3ZSBjYW4ndCBmaW5kIHRoZSBzb3VyY2Ugbm9kZSwgbWFyayBpdCBhcyBjYW52YXNcclxuXHRcdFx0KHRhc2subWV0YWRhdGEgYXMgQ2FudmFzVGFza01ldGFkYXRhKS5zb3VyY2VUeXBlID0gXCJjYW52YXNcIjtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdGFzayBhcyBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT47XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBGaW5kIHRoZSBzb3VyY2UgdGV4dCBub2RlIGZvciBhIGdpdmVuIHRhc2tcclxuXHQgKi9cclxuXHRwcml2YXRlIGZpbmRTb3VyY2VOb2RlKFxyXG5cdFx0dGFzazogVGFzayxcclxuXHRcdHBhcnNlZENvbnRlbnQ6IFBhcnNlZENhbnZhc0NvbnRlbnRcclxuXHQpOiBDYW52YXNUZXh0RGF0YSB8IG51bGwge1xyXG5cdFx0Y29uc3QgeyB0ZXh0Tm9kZXMgfSA9IHBhcnNlZENvbnRlbnQ7XHJcblxyXG5cdFx0Ly8gU2ltcGxlIGhldXJpc3RpYzogZmluZCB0aGUgbm9kZSB0aGF0IGNvbnRhaW5zIHRoZSB0YXNrIGNvbnRlbnRcclxuXHRcdGZvciAoY29uc3Qgbm9kZSBvZiB0ZXh0Tm9kZXMpIHtcclxuXHRcdFx0aWYgKG5vZGUudGV4dC5pbmNsdWRlcyh0YXNrLm9yaWdpbmFsTWFya2Rvd24pKSB7XHJcblx0XHRcdFx0cmV0dXJuIG5vZGU7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBwYXJzZXIgY29uZmlndXJhdGlvblxyXG5cdCAqL1xyXG5cdHB1YmxpYyB1cGRhdGVQYXJzZXJDb25maWcoY29uZmlnOiBUYXNrUGFyc2VyQ29uZmlnKTogdm9pZCB7XHJcblx0XHR0aGlzLm1hcmtkb3duUGFyc2VyID0gbmV3IE1hcmtkb3duVGFza1BhcnNlcihjb25maWcpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIHBhcnNpbmcgb3B0aW9uc1xyXG5cdCAqL1xyXG5cdHB1YmxpYyB1cGRhdGVPcHRpb25zKG9wdGlvbnM6IFBhcnRpYWw8Q2FudmFzUGFyc2luZ09wdGlvbnM+KTogdm9pZCB7XHJcblx0XHR0aGlzLm9wdGlvbnMgPSB7IC4uLnRoaXMub3B0aW9ucywgLi4ub3B0aW9ucyB9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGN1cnJlbnQgcGFyc2luZyBvcHRpb25zXHJcblx0ICovXHJcblx0cHVibGljIGdldE9wdGlvbnMoKTogQ2FudmFzUGFyc2luZ09wdGlvbnMge1xyXG5cdFx0cmV0dXJuIHsgLi4udGhpcy5vcHRpb25zIH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBWYWxpZGF0ZSBjYW52YXMgZmlsZSBjb250ZW50XHJcblx0ICovXHJcblx0cHVibGljIHN0YXRpYyBpc1ZhbGlkQ2FudmFzQ29udGVudChjb250ZW50OiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKGNvbnRlbnQpO1xyXG5cdFx0XHRyZXR1cm4gKFxyXG5cdFx0XHRcdHR5cGVvZiBkYXRhID09PSBcIm9iamVjdFwiICYmXHJcblx0XHRcdFx0ZGF0YSAhPT0gbnVsbCAmJlxyXG5cdFx0XHRcdEFycmF5LmlzQXJyYXkoZGF0YS5ub2RlcykgJiZcclxuXHRcdFx0XHRBcnJheS5pc0FycmF5KGRhdGEuZWRnZXMpXHJcblx0XHRcdCk7XHJcblx0XHR9IGNhdGNoIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRXh0cmFjdCBvbmx5IHRleHQgY29udGVudCB3aXRob3V0IHBhcnNpbmcgdGFza3MgKHVzZWZ1bCBmb3IgcHJldmlldylcclxuXHQgKi9cclxuXHRwdWJsaWMgZXh0cmFjdFRleHRPbmx5KGNhbnZhc0NvbnRlbnQ6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBjYW52YXNEYXRhOiBDYW52YXNEYXRhID0gSlNPTi5wYXJzZShjYW52YXNDb250ZW50KTtcclxuXHRcdFx0Y29uc3QgdGV4dE5vZGVzID0gY2FudmFzRGF0YS5ub2Rlcy5maWx0ZXIoXHJcblx0XHRcdFx0KG5vZGUpOiBub2RlIGlzIENhbnZhc1RleHREYXRhID0+IG5vZGUudHlwZSA9PT0gXCJ0ZXh0XCJcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdHJldHVybiB0ZXh0Tm9kZXNcclxuXHRcdFx0XHQubWFwKChub2RlKSA9PiBub2RlLnRleHQpXHJcblx0XHRcdFx0LmpvaW4odGhpcy5vcHRpb25zLm5vZGVTZXBhcmF0b3IgfHwgXCJcXG5cXG5cIik7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRXJyb3IgZXh0cmFjdGluZyB0ZXh0IGZyb20gY2FudmFzOlwiLCBlcnJvcik7XHJcblx0XHRcdHJldHVybiBcIlwiO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUGFyc2UgQ2FudmFzIEpTT04gY29udGVudCBzYWZlbHlcclxuXHQgKiBAcGFyYW0gY2FudmFzQ29udGVudCBSYXcgQ2FudmFzIGZpbGUgY29udGVudFxyXG5cdCAqIEByZXR1cm5zIFBhcnNlZCBDYW52YXNEYXRhIG9yIG51bGwgaWYgcGFyc2luZyBmYWlsc1xyXG5cdCAqL1xyXG5cdHB1YmxpYyBzdGF0aWMgcGFyc2VDYW52YXNKU09OKGNhbnZhc0NvbnRlbnQ6IHN0cmluZyk6IENhbnZhc0RhdGEgfCBudWxsIHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdHJldHVybiBKU09OLnBhcnNlKGNhbnZhc0NvbnRlbnQpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIHBhcnNpbmcgQ2FudmFzIEpTT046XCIsIGVycm9yKTtcclxuXHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBGaW5kIGEgdGV4dCBub2RlIGJ5IElEIGluIENhbnZhcyBkYXRhXHJcblx0ICogQHBhcmFtIGNhbnZhc0RhdGEgUGFyc2VkIENhbnZhcyBkYXRhXHJcblx0ICogQHBhcmFtIG5vZGVJZCBUaGUgbm9kZSBJRCB0byBmaW5kXHJcblx0ICogQHJldHVybnMgVGhlIHRleHQgbm9kZSBvciBudWxsIGlmIG5vdCBmb3VuZFxyXG5cdCAqL1xyXG5cdHB1YmxpYyBzdGF0aWMgZmluZFRleHROb2RlKGNhbnZhc0RhdGE6IENhbnZhc0RhdGEsIG5vZGVJZDogc3RyaW5nKTogQ2FudmFzVGV4dERhdGEgfCBudWxsIHtcclxuXHRcdGNvbnN0IG5vZGUgPSBjYW52YXNEYXRhLm5vZGVzLmZpbmQoXHJcblx0XHRcdChuKTogbiBpcyBDYW52YXNUZXh0RGF0YSA9PiBuLnR5cGUgPT09IFwidGV4dFwiICYmIG4uaWQgPT09IG5vZGVJZFxyXG5cdFx0KTtcclxuXHRcdHJldHVybiBub2RlIHx8IG51bGw7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgYWxsIHRleHQgbm9kZXMgZnJvbSBDYW52YXMgZGF0YVxyXG5cdCAqIEBwYXJhbSBjYW52YXNEYXRhIFBhcnNlZCBDYW52YXMgZGF0YVxyXG5cdCAqIEByZXR1cm5zIEFycmF5IG9mIHRleHQgbm9kZXNcclxuXHQgKi9cclxuXHRwdWJsaWMgc3RhdGljIGdldFRleHROb2RlcyhjYW52YXNEYXRhOiBDYW52YXNEYXRhKTogQ2FudmFzVGV4dERhdGFbXSB7XHJcblx0XHRyZXR1cm4gY2FudmFzRGF0YS5ub2Rlcy5maWx0ZXIoXHJcblx0XHRcdChub2RlKTogbm9kZSBpcyBDYW52YXNUZXh0RGF0YSA9PiBub2RlLnR5cGUgPT09IFwidGV4dFwiXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU3RhdGljIG1ldGhvZCBmb3IgcGFyc2luZyBDYW52YXMgZmlsZXMgd2l0aCBwbHVnaW4gY29udGV4dFxyXG5cdCAqIFRoaXMgcmVwbGFjZXMgdGhlIHNlcGFyYXRlIHBhcnNlQ2FudmFzIGZ1bmN0aW9uIGZyb20gQ2FudmFzRW50cnlcclxuXHQgKiBAcGFyYW0gcGx1Z2luIC0gVGhlIFRhc2tQcm9ncmVzc0JhclBsdWdpbiBpbnN0YW5jZVxyXG5cdCAqIEBwYXJhbSBmaWxlIC0gRmlsZSBvYmplY3Qgd2l0aCBwYXRoIHByb3BlcnR5XHJcblx0ICogQHBhcmFtIGNvbnRlbnQgLSBPcHRpb25hbCBmaWxlIGNvbnRlbnQgKGlmIG5vdCBwcm92aWRlZCwgd2lsbCBiZSByZWFkIGZyb20gdmF1bHQpXHJcblx0ICogQHJldHVybnMgQXJyYXkgb2YgcGFyc2VkIHRhc2tzXHJcblx0ICovXHJcblx0cHVibGljIHN0YXRpYyBhc3luYyBwYXJzZUNhbnZhcyhcclxuXHRcdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0ZmlsZTogeyBwYXRoOiBzdHJpbmcgfSxcclxuXHRcdGNvbnRlbnQ/OiBzdHJpbmdcclxuXHQpOiBQcm9taXNlPFRhc2tbXT4ge1xyXG5cdFx0Y29uc3QgY29uZmlnID0gZ2V0Q29uZmlnKHBsdWdpbi5zZXR0aW5ncy5wcmVmZXJNZXRhZGF0YUZvcm1hdCwgcGx1Z2luKTtcclxuXHRcdGNvbnN0IHBhcnNlciA9IG5ldyBDYW52YXNQYXJzZXIoY29uZmlnKTtcclxuXHRcdGNvbnN0IGZpbGVQYXRoID0gZmlsZS5wYXRoO1xyXG5cdFx0Y29uc3QgdGV4dCA9IGNvbnRlbnQgPz8gYXdhaXQgcGx1Z2luLmFwcC52YXVsdC5jYWNoZWRSZWFkKGZpbGUgYXMgYW55KTtcclxuXHRcdHJldHVybiBwYXJzZXIucGFyc2VDYW52YXNGaWxlKHRleHQsIGZpbGVQYXRoKTtcclxuXHR9XHJcbn1cclxuIl19