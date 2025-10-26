import { __awaiter } from "tslib";
import { Component, MarkdownRenderer as ObsidianMarkdownRenderer, } from "obsidian";
import { DEFAULT_SYMBOLS, TAG_REGEX } from "@/common/default-symbol";
// Use a non-global, start-anchored tag matcher to allow index checks
const TAG_HEAD = new RegExp("^" + TAG_REGEX.source);
/**
 * Remove tags while protecting content inside wiki links
 */
function removeTagsWithLinkProtection(text) {
    let result = "";
    let i = 0;
    // Helper: check if '#' at index i is escaped by odd number of backslashes
    function isEscapedHash(idx) {
        let bs = 0;
        let j = idx - 1;
        while (j >= 0 && text[j] === "\\") {
            bs++;
            j--;
        }
        return bs % 2 === 1;
    }
    while (i < text.length) {
        // Check if we're at the start of a wiki link
        if (i < text.length - 1 && text[i] === "[" && text[i + 1] === "[") {
            // Find the end of the wiki link
            let linkEnd = i + 2;
            let bracketCount = 1;
            while (linkEnd < text.length - 1 && bracketCount > 0) {
                if (text[linkEnd] === "]" && text[linkEnd + 1] === "]") {
                    bracketCount--;
                    if (bracketCount === 0) {
                        linkEnd += 2;
                        break;
                    }
                }
                else if (text[linkEnd] === "[" && text[linkEnd + 1] === "[") {
                    bracketCount++;
                    linkEnd++;
                }
                linkEnd++;
            }
            // Add the entire wiki link without tag processing
            result += text.substring(i, linkEnd);
            i = linkEnd;
        }
        else if (text[i] === "#") {
            // Ignore escaped \#
            if (isEscapedHash(i)) {
                result += text[i];
                i++;
                continue;
            }
            // Check if this is a tag (not inside a link)
            const headMatch = TAG_HEAD.exec(text.substring(i));
            if (headMatch) {
                const full = headMatch[0];
                const body = full.slice(1);
                // Preserve only pure numeric tokens like #123 (not a tag by spec)
                if (/^\d+$/.test(body)) {
                    result += full; // keep as plain text
                }
                // Otherwise treat as tag and remove it
                i += full.length;
            }
            else {
                // Not a tag, keep the character
                result += text[i];
                i++;
            }
        }
        else {
            // Regular character, keep it
            result += text[i];
            i++;
        }
    }
    return result;
}
export function clearAllMarks(markdown) {
    if (!markdown)
        return markdown;
    let cleanedMarkdown = markdown;
    // --- Remove Emoji/Symbol Style Metadata ---
    const symbolsToRemove = [
        DEFAULT_SYMBOLS.startDateSymbol,
        DEFAULT_SYMBOLS.createdDateSymbol,
        DEFAULT_SYMBOLS.scheduledDateSymbol,
        DEFAULT_SYMBOLS.dueDateSymbol,
        DEFAULT_SYMBOLS.doneDateSymbol,
        "❌", // cancelledDate
    ].filter(Boolean); // Filter out any potentially undefined symbols
    // Special handling for tilde prefix dates: remove ~ and 📅 but keep date
    cleanedMarkdown = cleanedMarkdown.replace(/\s*~\s*📅\s*/g, " ");
    // Remove date fields (symbol followed by date) - normal case
    symbolsToRemove.forEach((symbol) => {
        if (!symbol)
            return; // Should be redundant due to filter, but safe
        // Escape the symbol for use in regex
        const escapedSymbol = symbol.replace(/[.*+?^${}()|[\\\]]/g, "\\$&");
        const regex = new RegExp(`${escapedSymbol}\\uFE0F? *\\d{4}-\\d{2}-\\d{2}`, // Use escaped symbol
        "gu");
        cleanedMarkdown = cleanedMarkdown.replace(regex, "");
    });
    // Remove priority markers (Emoji and Taskpaper style)
    // First remove priority emojis anywhere in the text (with optional variation selector)
    cleanedMarkdown = cleanedMarkdown.replace(/(?:🔺|⏫|🔼|🔽|⏬️?|\[#[A-E]\])/gu, "");
    // Remove standalone exclamation marks (priority indicators)
    // These might be used as priority indicators in some formats
    cleanedMarkdown = cleanedMarkdown.replace(/\s+!+(?:\s|$)/g, " ");
    cleanedMarkdown = cleanedMarkdown.replace(/^!+\s*/, "");
    cleanedMarkdown = cleanedMarkdown.replace(/\s*!+$/, "");
    // Remove non-date metadata fields (id, dependsOn, onCompletion)
    cleanedMarkdown = cleanedMarkdown.replace(/🆔\s*[^\s]+/g, ""); // Remove id
    cleanedMarkdown = cleanedMarkdown.replace(/⛔\s*[^\s]+/g, ""); // Remove dependsOn
    cleanedMarkdown = cleanedMarkdown.replace(/🏁\s*[^\s]+/g, ""); // Remove onCompletion
    // Remove recurrence information (Symbol + value)
    if (DEFAULT_SYMBOLS.recurrenceSymbol) {
        const escapedRecurrenceSymbol = DEFAULT_SYMBOLS.recurrenceSymbol.replace(/[.*+?^${}()|[\\\]]/g, "\\$&");
        // Create a string of escaped date/completion symbols for the lookahead
        const escapedOtherSymbols = symbolsToRemove
            .map((s) => s.replace(/[.*+?^${}()|[\\\]]/g, "\\$&"))
            .join("");
        // Add escaped non-date symbols to lookahead
        const escapedNonDateSymbols = ["🆔", "⛔", "🏁"]
            .map((s) => s.replace(/[.*+?^${}()|[\\\]]/g, "\\$&"))
            .join("");
        const recurrenceRegex = new RegExp(`${escapedRecurrenceSymbol}\\uFE0F? *.*?` +
            // Lookahead for: space followed by (any date/completion/recurrence symbol OR non-date symbols OR @ OR #) OR end of string
            `(?=\s(?:[${escapedOtherSymbols}${escapedNonDateSymbols}${escapedRecurrenceSymbol}]|@|#)|$)`, "gu");
        cleanedMarkdown = cleanedMarkdown.replace(recurrenceRegex, "");
    }
    // --- Remove Dataview Style Metadata ---
    cleanedMarkdown = cleanedMarkdown.replace(/\[(?:due|📅|completion|✅|created|➕|start|🛫|scheduled|⏳|cancelled|❌|id|🆔|dependsOn|⛔|onCompletion|🏁|priority|repeat|recurrence|🔁|project|context)::\s*[^\]]+\]/gi, 
    // Corrected the emoji in the previous attempt
    "");
    const preservedSegments = [];
    const inlineCodeRegex = /`([^`]+?)`/g; // Matches `code`
    const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
    const markdownLinkRegex = /\[([^\[\]]*)\]\((.*?)\)/g; // Regex for [text](link)
    let match;
    let segmentCounter = 0;
    // Find all inline code blocks first
    inlineCodeRegex.lastIndex = 0;
    while ((match = inlineCodeRegex.exec(cleanedMarkdown)) !== null) {
        preservedSegments.push({
            text: match[0],
            index: match.index,
            length: match[0].length,
            id: `code_${segmentCounter++}`,
        });
    }
    // Find all wiki links (avoid overlaps with already found segments like inline code)
    wikiLinkRegex.lastIndex = 0;
    while ((match = wikiLinkRegex.exec(cleanedMarkdown)) !== null) {
        const currentStart = match.index;
        const currentEnd = currentStart + match[0].length;
        const overlaps = preservedSegments.some((ps) => Math.max(ps.index, currentStart) <
            Math.min(ps.index + ps.length, currentEnd));
        if (!overlaps) {
            preservedSegments.push({
                text: match[0],
                index: currentStart,
                length: match[0].length,
                id: `wiki_${segmentCounter++}`,
            });
        }
    }
    // Find all markdown links (avoid overlaps with existing segments)
    markdownLinkRegex.lastIndex = 0;
    while ((match = markdownLinkRegex.exec(cleanedMarkdown)) !== null) {
        const currentStart = match.index;
        const currentEnd = currentStart + match[0].length;
        const overlaps = preservedSegments.some((ps) => Math.max(ps.index, currentStart) <
            Math.min(ps.index + ps.length, currentEnd));
        if (!overlaps) {
            preservedSegments.push({
                text: match[0],
                index: currentStart,
                length: match[0].length,
                id: `md_${segmentCounter++}`,
            });
        }
    }
    // Create a temporary version of markdown with all preserved segments replaced by unique placeholders
    let tempMarkdown = cleanedMarkdown;
    const placeholderMap = new Map(); // Map placeholder to original text
    if (preservedSegments.length > 0) {
        // Sort segments by index in descending order to process from end to beginning
        // This prevents indices from shifting when replacing
        preservedSegments.sort((a, b) => b.index - a.index);
        for (const segment of preservedSegments) {
            // Use unique placeholder with segment ID to avoid conflicts
            const placeholder = `__PRESERVED_${segment.id}__`;
            placeholderMap.set(placeholder, segment.text);
            tempMarkdown =
                tempMarkdown.substring(0, segment.index) +
                    placeholder +
                    tempMarkdown.substring(segment.index + segment.length);
        }
    }
    // Remove tags from temporary markdown (where links/code are placeholders)
    tempMarkdown = removeTagsWithLinkProtection(tempMarkdown);
    // Remove context tags from temporary markdown
    tempMarkdown = tempMarkdown.replace(/@[\w-]+/g, "");
    // Remove target location patterns (like "target: office 📁")
    tempMarkdown = tempMarkdown.replace(/\btarget:\s*/gi, "");
    tempMarkdown = tempMarkdown.replace(/\s*📁\s*/g, " ");
    // Remove any remaining simple tags but preserve special tags like #123-123-123
    // Also ignore escaped \# (do not treat as tag)
    tempMarkdown = (function removeSimpleTagsIgnoringEscapes(input) {
        let out = "";
        let i = 0;
        function isEscapedHashAt(idx) {
            let bs = 0;
            let j = idx - 1;
            while (j >= 0 && input[j] === "\\") {
                bs++;
                j--;
            }
            return bs % 2 === 1;
        }
        while (i < input.length) {
            if (input[i] === "#") {
                if (isEscapedHashAt(i)) {
                    out += "#";
                    i++;
                    continue;
                }
                const rest = input.substring(i);
                const m = TAG_HEAD.exec(rest);
                if (m) {
                    const full = m[0];
                    const body = full.slice(1);
                    // Preserve only pure numeric tokens like #123; others are tags to remove
                    if (/^\d+$/.test(body)) {
                        out += full;
                    }
                    i += full.length;
                    continue;
                }
                // not a tag, keep '#'
                out += "#";
                i++;
                continue;
            }
            out += input[i];
            i++;
        }
        return out;
    })(tempMarkdown);
    // Remove any remaining tilde symbols (~ symbol) that weren't handled by the special case
    tempMarkdown = tempMarkdown.replace(/\s+~\s+/g, " ");
    tempMarkdown = tempMarkdown.replace(/\s+~(?=\s|$)/g, "");
    tempMarkdown = tempMarkdown.replace(/^~\s+/, "");
    // Now restore the preserved segments by replacing placeholders with original content
    for (const [placeholder, originalText] of placeholderMap) {
        tempMarkdown = tempMarkdown.replace(placeholder, originalText);
    }
    // Task marker and final cleaning (applied to the string with links/code restored)
    tempMarkdown = tempMarkdown.replace(/^([\s>]*)?(-|\d+\.|\*|\+)\s\[([^\[\]]{1})\]\s*/, "");
    tempMarkdown = tempMarkdown.replace(/^# /, "");
    tempMarkdown = tempMarkdown.replace(/\s+/g, " ").trim();
    return tempMarkdown;
}
/**
 * A wrapper component for Obsidian's MarkdownRenderer
 * This provides a simpler interface for rendering markdown content in the plugin
 * with additional features for managing render state and optimizing updates
 */
export class MarkdownRendererComponent extends Component {
    constructor(app, container, sourcePath = "", hideMarks = true) {
        super();
        this.app = app;
        this.hideMarks = hideMarks;
        this.currentFile = null;
        this.renderQueue = [];
        this.isRendering = false;
        this.blockElements = new Map();
        this.container = container;
        this.sourcePath = sourcePath;
    }
    /**
     * Set the current file context for rendering
     * @param file The file to use as context for rendering
     */
    setFile(file) {
        this.currentFile = file;
        this.sourcePath = file.path;
    }
    /**
     * Get the current file being used for rendering context
     */
    get file() {
        return this.currentFile;
    }
    /**
     * Render markdown content to the container
     * @param markdown The markdown content to render
     * @param clearContainer Whether to clear the container before rendering
     */
    render(markdown, clearContainer = true) {
        return __awaiter(this, void 0, void 0, function* () {
            if (clearContainer) {
                this.clear();
            }
            // Split content into blocks based on double line breaks
            const blocks = this.splitIntoBlocks(markdown);
            // Create block elements for each content block
            for (let i = 0; i < blocks.length; i++) {
                const blockId = `block-${Date.now()}-${i}`;
                const blockEl = this.container.createEl("div", {
                    cls: ["markdown-block", "markdown-renderer"],
                });
                blockEl.dataset.blockId = blockId;
                this.blockElements.set(blockId, blockEl);
                // Queue this block for rendering
                this.queueRender(blocks[i], blockId);
            }
            // Start processing the queue
            this.processRenderQueue();
        });
    }
    /**
     * Split markdown content into blocks based on double line breaks
     */
    splitIntoBlocks(markdown) {
        if (!this.hideMarks) {
            return markdown
                .split(/\n\s*\n/)
                .filter((block) => block.trim().length > 0);
        }
        // Split on double newlines (paragraph breaks)
        return clearAllMarks(markdown)
            .split(/\n\s*\n/)
            .filter((block) => block.trim().length > 0);
    }
    /**
     * Queue a markdown block for rendering
     */
    queueRender(markdown, blockId) {
        this.renderQueue.push({ markdown, blockId });
        this.processRenderQueue();
    }
    /**
     * Process the render queue if not already processing
     */
    processRenderQueue() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isRendering || this.renderQueue.length === 0) {
                return;
            }
            this.isRendering = true;
            try {
                while (this.renderQueue.length > 0) {
                    const item = this.renderQueue.shift();
                    if (!item)
                        continue;
                    const { markdown, blockId } = item;
                    if (blockId) {
                        // Render to a specific block
                        const blockEl = this.blockElements.get(blockId);
                        if (blockEl) {
                            blockEl.empty();
                            yield ObsidianMarkdownRenderer.render(this.app, markdown, blockEl, this.sourcePath, this);
                        }
                    }
                    else {
                        // Render to the main container
                        yield ObsidianMarkdownRenderer.render(this.app, markdown, this.container, this.sourcePath, this);
                    }
                    // Small delay to prevent UI freezing with large content
                    yield new Promise((resolve) => setTimeout(resolve, 0));
                }
            }
            finally {
                this.isRendering = false;
            }
        });
    }
    /**
     * Update a specific block with new content
     * @param blockId The ID of the block to update
     * @param markdown The new markdown content
     */
    updateBlock(blockId, markdown) {
        if (this.blockElements.has(blockId)) {
            this.queueRender(markdown, blockId);
        }
    }
    /**
     * Update the entire content with new markdown
     * @param markdown The new markdown content
     */
    update(markdown) {
        // Clear existing queue
        this.renderQueue = [];
        // Render the new content
        this.render(markdown, true);
    }
    /**
     * Add a new block at the end of the container
     * @param markdown The markdown content for the new block
     * @returns The ID of the new block
     */
    addBlock(markdown) {
        const blockId = `block-${Date.now()}-${this.blockElements.size}`;
        const blockEl = this.container.createEl("div", {
            cls: "markdown-block",
        });
        blockEl.dataset.blockId = blockId;
        this.blockElements.set(blockId, blockEl);
        this.queueRender(markdown, blockId);
        return blockId;
    }
    /**
     * Remove a specific block
     * @param blockId The ID of the block to remove
     */
    removeBlock(blockId) {
        const blockEl = this.blockElements.get(blockId);
        if (blockEl) {
            blockEl.remove();
            this.blockElements.delete(blockId);
        }
    }
    /**
     * Clear all content and blocks
     */
    clear() {
        this.container.empty();
        this.blockElements.clear();
        this.renderQueue = [];
    }
    onunload() {
        this.clear();
        super.onunload();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWFya2Rvd25SZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIk1hcmtkb3duUmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFFTixTQUFTLEVBQ1QsZ0JBQWdCLElBQUksd0JBQXdCLEdBRTVDLE1BQU0sVUFBVSxDQUFDO0FBQ2xCLE9BQU8sRUFBRSxlQUFlLEVBQUUsU0FBUyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFckUscUVBQXFFO0FBQ3JFLE1BQU0sUUFBUSxHQUFHLElBQUksTUFBTSxDQUFDLEdBQUcsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7QUFFcEQ7O0dBRUc7QUFDSCxTQUFTLDRCQUE0QixDQUFDLElBQVk7SUFDakQsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDO0lBQ2hCLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUVWLDBFQUEwRTtJQUMxRSxTQUFTLGFBQWEsQ0FBQyxHQUFXO1FBQ2pDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNYLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDaEIsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDbEMsRUFBRSxFQUFFLENBQUM7WUFDTCxDQUFDLEVBQUUsQ0FBQztTQUNKO1FBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNyQixDQUFDO0lBRUQsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRTtRQUN2Qiw2Q0FBNkM7UUFDN0MsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtZQUNsRSxnQ0FBZ0M7WUFDaEMsSUFBSSxP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QUFJLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBRUQsUUFBUTtRQUNQLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNiLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNsQixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xyXG5cdEFwcCxcclxuXHRDb21wb25lbnQsXHJcblx0TWFya2Rvd25SZW5kZXJlciBhcyBPYnNpZGlhbk1hcmtkb3duUmVuZGVyZXIsXHJcblx0VEZpbGUsXHJcbn0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IERFRkFVTFRfU1lNQk9MUywgVEFHX1JFR0VYIH0gZnJvbSBcIkAvY29tbW9uL2RlZmF1bHQtc3ltYm9sXCI7XHJcblxyXG4vLyBVc2UgYSBub24tZ2xvYmFsLCBzdGFydC1hbmNob3JlZCB0YWcgbWF0Y2hlciB0byBhbGxvdyBpbmRleCBjaGVja3NcclxuY29uc3QgVEFHX0hFQUQgPSBuZXcgUmVnRXhwKFwiXlwiICsgVEFHX1JFR0VYLnNvdXJjZSk7XHJcblxyXG4vKipcclxuICogUmVtb3ZlIHRhZ3Mgd2hpbGUgcHJvdGVjdGluZyBjb250ZW50IGluc2lkZSB3aWtpIGxpbmtzXHJcbiAqL1xyXG5mdW5jdGlvbiByZW1vdmVUYWdzV2l0aExpbmtQcm90ZWN0aW9uKHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0bGV0IHJlc3VsdCA9IFwiXCI7XHJcblx0bGV0IGkgPSAwO1xyXG5cclxuXHQvLyBIZWxwZXI6IGNoZWNrIGlmICcjJyBhdCBpbmRleCBpIGlzIGVzY2FwZWQgYnkgb2RkIG51bWJlciBvZiBiYWNrc2xhc2hlc1xyXG5cdGZ1bmN0aW9uIGlzRXNjYXBlZEhhc2goaWR4OiBudW1iZXIpOiBib29sZWFuIHtcclxuXHRcdGxldCBicyA9IDA7XHJcblx0XHRsZXQgaiA9IGlkeCAtIDE7XHJcblx0XHR3aGlsZSAoaiA+PSAwICYmIHRleHRbal0gPT09IFwiXFxcXFwiKSB7XHJcblx0XHRcdGJzKys7XHJcblx0XHRcdGotLTtcclxuXHRcdH1cclxuXHRcdHJldHVybiBicyAlIDIgPT09IDE7XHJcblx0fVxyXG5cclxuXHR3aGlsZSAoaSA8IHRleHQubGVuZ3RoKSB7XHJcblx0XHQvLyBDaGVjayBpZiB3ZSdyZSBhdCB0aGUgc3RhcnQgb2YgYSB3aWtpIGxpbmtcclxuXHRcdGlmIChpIDwgdGV4dC5sZW5ndGggLSAxICYmIHRleHRbaV0gPT09IFwiW1wiICYmIHRleHRbaSArIDFdID09PSBcIltcIikge1xyXG5cdFx0XHQvLyBGaW5kIHRoZSBlbmQgb2YgdGhlIHdpa2kgbGlua1xyXG5cdFx0XHRsZXQgbGlua0VuZCA9IGkgKyAyO1xyXG5cdFx0XHRsZXQgYnJhY2tldENvdW50ID0gMTtcclxuXHJcblx0XHRcdHdoaWxlIChsaW5rRW5kIDwgdGV4dC5sZW5ndGggLSAxICYmIGJyYWNrZXRDb3VudCA+IDApIHtcclxuXHRcdFx0XHRpZiAodGV4dFtsaW5rRW5kXSA9PT0gXCJdXCIgJiYgdGV4dFtsaW5rRW5kICsgMV0gPT09IFwiXVwiKSB7XHJcblx0XHRcdFx0XHRicmFja2V0Q291bnQtLTtcclxuXHRcdFx0XHRcdGlmIChicmFja2V0Q291bnQgPT09IDApIHtcclxuXHRcdFx0XHRcdFx0bGlua0VuZCArPSAyO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9IGVsc2UgaWYgKHRleHRbbGlua0VuZF0gPT09IFwiW1wiICYmIHRleHRbbGlua0VuZCArIDFdID09PSBcIltcIikge1xyXG5cdFx0XHRcdFx0YnJhY2tldENvdW50Kys7XHJcblx0XHRcdFx0XHRsaW5rRW5kKys7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGxpbmtFbmQrKztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQWRkIHRoZSBlbnRpcmUgd2lraSBsaW5rIHdpdGhvdXQgdGFnIHByb2Nlc3NpbmdcclxuXHRcdFx0cmVzdWx0ICs9IHRleHQuc3Vic3RyaW5nKGksIGxpbmtFbmQpO1xyXG5cdFx0XHRpID0gbGlua0VuZDtcclxuXHRcdH0gZWxzZSBpZiAodGV4dFtpXSA9PT0gXCIjXCIpIHtcclxuXHRcdFx0Ly8gSWdub3JlIGVzY2FwZWQgXFwjXHJcblx0XHRcdGlmIChpc0VzY2FwZWRIYXNoKGkpKSB7XHJcblx0XHRcdFx0cmVzdWx0ICs9IHRleHRbaV07XHJcblx0XHRcdFx0aSsrO1xyXG5cdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHR9XHJcblx0XHRcdC8vIENoZWNrIGlmIHRoaXMgaXMgYSB0YWcgKG5vdCBpbnNpZGUgYSBsaW5rKVxyXG5cdFx0XHRjb25zdCBoZWFkTWF0Y2ggPSBUQUdfSEVBRC5leGVjKHRleHQuc3Vic3RyaW5nKGkpKTtcclxuXHRcdFx0aWYgKGhlYWRNYXRjaCkge1xyXG5cdFx0XHRcdGNvbnN0IGZ1bGwgPSBoZWFkTWF0Y2hbMF07XHJcblx0XHRcdFx0Y29uc3QgYm9keSA9IGZ1bGwuc2xpY2UoMSk7XHJcblx0XHRcdFx0Ly8gUHJlc2VydmUgb25seSBwdXJlIG51bWVyaWMgdG9rZW5zIGxpa2UgIzEyMyAobm90IGEgdGFnIGJ5IHNwZWMpXHJcblx0XHRcdFx0aWYgKC9eXFxkKyQvLnRlc3QoYm9keSkpIHtcclxuXHRcdFx0XHRcdHJlc3VsdCArPSBmdWxsOyAvLyBrZWVwIGFzIHBsYWluIHRleHRcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gT3RoZXJ3aXNlIHRyZWF0IGFzIHRhZyBhbmQgcmVtb3ZlIGl0XHJcblx0XHRcdFx0aSArPSBmdWxsLmxlbmd0aDtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBOb3QgYSB0YWcsIGtlZXAgdGhlIGNoYXJhY3RlclxyXG5cdFx0XHRcdHJlc3VsdCArPSB0ZXh0W2ldO1xyXG5cdFx0XHRcdGkrKztcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gUmVndWxhciBjaGFyYWN0ZXIsIGtlZXAgaXRcclxuXHRcdFx0cmVzdWx0ICs9IHRleHRbaV07XHJcblx0XHRcdGkrKztcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjbGVhckFsbE1hcmtzKG1hcmtkb3duOiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdGlmICghbWFya2Rvd24pIHJldHVybiBtYXJrZG93bjtcclxuXHJcblx0bGV0IGNsZWFuZWRNYXJrZG93biA9IG1hcmtkb3duO1xyXG5cclxuXHQvLyAtLS0gUmVtb3ZlIEVtb2ppL1N5bWJvbCBTdHlsZSBNZXRhZGF0YSAtLS1cclxuXHJcblx0Y29uc3Qgc3ltYm9sc1RvUmVtb3ZlID0gW1xyXG5cdFx0REVGQVVMVF9TWU1CT0xTLnN0YXJ0RGF0ZVN5bWJvbCwgLy8g8J+bq1xyXG5cdFx0REVGQVVMVF9TWU1CT0xTLmNyZWF0ZWREYXRlU3ltYm9sLCAvLyDinpVcclxuXHRcdERFRkFVTFRfU1lNQk9MUy5zY2hlZHVsZWREYXRlU3ltYm9sLCAvLyDij7NcclxuXHRcdERFRkFVTFRfU1lNQk9MUy5kdWVEYXRlU3ltYm9sLCAvLyDwn5OFXHJcblx0XHRERUZBVUxUX1NZTUJPTFMuZG9uZURhdGVTeW1ib2wsIC8vIOKchVxyXG5cdFx0XCLinYxcIiwgLy8gY2FuY2VsbGVkRGF0ZVxyXG5cdF0uZmlsdGVyKEJvb2xlYW4pOyAvLyBGaWx0ZXIgb3V0IGFueSBwb3RlbnRpYWxseSB1bmRlZmluZWQgc3ltYm9sc1xyXG5cclxuXHQvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciB0aWxkZSBwcmVmaXggZGF0ZXM6IHJlbW92ZSB+IGFuZCDwn5OFIGJ1dCBrZWVwIGRhdGVcclxuXHRjbGVhbmVkTWFya2Rvd24gPSBjbGVhbmVkTWFya2Rvd24ucmVwbGFjZSgvXFxzKn5cXHMq8J+ThVxccyovZywgXCIgXCIpO1xyXG5cclxuXHQvLyBSZW1vdmUgZGF0ZSBmaWVsZHMgKHN5bWJvbCBmb2xsb3dlZCBieSBkYXRlKSAtIG5vcm1hbCBjYXNlXHJcblx0c3ltYm9sc1RvUmVtb3ZlLmZvckVhY2goKHN5bWJvbCkgPT4ge1xyXG5cdFx0aWYgKCFzeW1ib2wpIHJldHVybjsgLy8gU2hvdWxkIGJlIHJlZHVuZGFudCBkdWUgdG8gZmlsdGVyLCBidXQgc2FmZVxyXG5cdFx0Ly8gRXNjYXBlIHRoZSBzeW1ib2wgZm9yIHVzZSBpbiByZWdleFxyXG5cdFx0Y29uc3QgZXNjYXBlZFN5bWJvbCA9IHN5bWJvbC5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxcXFxcXV0vZywgXCJcXFxcJCZcIik7XHJcblx0XHRjb25zdCByZWdleCA9IG5ldyBSZWdFeHAoXHJcblx0XHRcdGAke2VzY2FwZWRTeW1ib2x9XFxcXHVGRTBGPyAqXFxcXGR7NH0tXFxcXGR7Mn0tXFxcXGR7Mn1gLCAvLyBVc2UgZXNjYXBlZCBzeW1ib2xcclxuXHRcdFx0XCJndVwiXHJcblx0XHQpO1xyXG5cdFx0Y2xlYW5lZE1hcmtkb3duID0gY2xlYW5lZE1hcmtkb3duLnJlcGxhY2UocmVnZXgsIFwiXCIpO1xyXG5cdH0pO1xyXG5cclxuXHQvLyBSZW1vdmUgcHJpb3JpdHkgbWFya2VycyAoRW1vamkgYW5kIFRhc2twYXBlciBzdHlsZSlcclxuXHQvLyBGaXJzdCByZW1vdmUgcHJpb3JpdHkgZW1vamlzIGFueXdoZXJlIGluIHRoZSB0ZXh0ICh3aXRoIG9wdGlvbmFsIHZhcmlhdGlvbiBzZWxlY3RvcilcclxuXHRjbGVhbmVkTWFya2Rvd24gPSBjbGVhbmVkTWFya2Rvd24ucmVwbGFjZShcclxuXHRcdC8oPzrwn5S6fOKPq3zwn5S8fPCflL184o+s77iPP3xcXFsjW0EtRV1cXF0pL2d1LFxyXG5cdFx0XCJcIlxyXG5cdCk7XHJcblxyXG5cdC8vIFJlbW92ZSBzdGFuZGFsb25lIGV4Y2xhbWF0aW9uIG1hcmtzIChwcmlvcml0eSBpbmRpY2F0b3JzKVxyXG5cdC8vIFRoZXNlIG1pZ2h0IGJlIHVzZWQgYXMgcHJpb3JpdHkgaW5kaWNhdG9ycyBpbiBzb21lIGZvcm1hdHNcclxuXHRjbGVhbmVkTWFya2Rvd24gPSBjbGVhbmVkTWFya2Rvd24ucmVwbGFjZSgvXFxzKyErKD86XFxzfCQpL2csIFwiIFwiKTtcclxuXHRjbGVhbmVkTWFya2Rvd24gPSBjbGVhbmVkTWFya2Rvd24ucmVwbGFjZSgvXiErXFxzKi8sIFwiXCIpO1xyXG5cdGNsZWFuZWRNYXJrZG93biA9IGNsZWFuZWRNYXJrZG93bi5yZXBsYWNlKC9cXHMqISskLywgXCJcIik7XHJcblxyXG5cdC8vIFJlbW92ZSBub24tZGF0ZSBtZXRhZGF0YSBmaWVsZHMgKGlkLCBkZXBlbmRzT24sIG9uQ29tcGxldGlvbilcclxuXHRjbGVhbmVkTWFya2Rvd24gPSBjbGVhbmVkTWFya2Rvd24ucmVwbGFjZSgv8J+GlFxccypbXlxcc10rL2csIFwiXCIpOyAvLyBSZW1vdmUgaWRcclxuXHRjbGVhbmVkTWFya2Rvd24gPSBjbGVhbmVkTWFya2Rvd24ucmVwbGFjZSgv4puUXFxzKlteXFxzXSsvZywgXCJcIik7IC8vIFJlbW92ZSBkZXBlbmRzT25cclxuXHRjbGVhbmVkTWFya2Rvd24gPSBjbGVhbmVkTWFya2Rvd24ucmVwbGFjZSgv8J+PgVxccypbXlxcc10rL2csIFwiXCIpOyAvLyBSZW1vdmUgb25Db21wbGV0aW9uXHJcblxyXG5cdC8vIFJlbW92ZSByZWN1cnJlbmNlIGluZm9ybWF0aW9uIChTeW1ib2wgKyB2YWx1ZSlcclxuXHRpZiAoREVGQVVMVF9TWU1CT0xTLnJlY3VycmVuY2VTeW1ib2wpIHtcclxuXHRcdGNvbnN0IGVzY2FwZWRSZWN1cnJlbmNlU3ltYm9sID1cclxuXHRcdFx0REVGQVVMVF9TWU1CT0xTLnJlY3VycmVuY2VTeW1ib2wucmVwbGFjZShcclxuXHRcdFx0XHQvWy4qKz9eJHt9KCl8W1xcXFxcXF1dL2csXHJcblx0XHRcdFx0XCJcXFxcJCZcIlxyXG5cdFx0XHQpO1xyXG5cdFx0Ly8gQ3JlYXRlIGEgc3RyaW5nIG9mIGVzY2FwZWQgZGF0ZS9jb21wbGV0aW9uIHN5bWJvbHMgZm9yIHRoZSBsb29rYWhlYWRcclxuXHRcdGNvbnN0IGVzY2FwZWRPdGhlclN5bWJvbHMgPSBzeW1ib2xzVG9SZW1vdmVcclxuXHRcdFx0Lm1hcCgocykgPT4gcyEucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXFxcXF1dL2csIFwiXFxcXCQmXCIpKVxyXG5cdFx0XHQuam9pbihcIlwiKTtcclxuXHJcblx0XHQvLyBBZGQgZXNjYXBlZCBub24tZGF0ZSBzeW1ib2xzIHRvIGxvb2thaGVhZFxyXG5cdFx0Y29uc3QgZXNjYXBlZE5vbkRhdGVTeW1ib2xzID0gW1wi8J+GlFwiLCBcIuKblFwiLCBcIvCfj4FcIl1cclxuXHRcdFx0Lm1hcCgocykgPT4gcy5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxcXFxcXV0vZywgXCJcXFxcJCZcIikpXHJcblx0XHRcdC5qb2luKFwiXCIpO1xyXG5cclxuXHRcdGNvbnN0IHJlY3VycmVuY2VSZWdleCA9IG5ldyBSZWdFeHAoXHJcblx0XHRcdGAke2VzY2FwZWRSZWN1cnJlbmNlU3ltYm9sfVxcXFx1RkUwRj8gKi4qP2AgK1xyXG5cdFx0XHQvLyBMb29rYWhlYWQgZm9yOiBzcGFjZSBmb2xsb3dlZCBieSAoYW55IGRhdGUvY29tcGxldGlvbi9yZWN1cnJlbmNlIHN5bWJvbCBPUiBub24tZGF0ZSBzeW1ib2xzIE9SIEAgT1IgIykgT1IgZW5kIG9mIHN0cmluZ1xyXG5cdFx0XHRgKD89XFxzKD86WyR7ZXNjYXBlZE90aGVyU3ltYm9sc30ke2VzY2FwZWROb25EYXRlU3ltYm9sc30ke2VzY2FwZWRSZWN1cnJlbmNlU3ltYm9sfV18QHwjKXwkKWAsXHJcblx0XHRcdFwiZ3VcIlxyXG5cdFx0KTtcclxuXHRcdGNsZWFuZWRNYXJrZG93biA9IGNsZWFuZWRNYXJrZG93bi5yZXBsYWNlKHJlY3VycmVuY2VSZWdleCwgXCJcIik7XHJcblx0fVxyXG5cclxuXHQvLyAtLS0gUmVtb3ZlIERhdGF2aWV3IFN0eWxlIE1ldGFkYXRhIC0tLVxyXG5cdGNsZWFuZWRNYXJrZG93biA9IGNsZWFuZWRNYXJrZG93bi5yZXBsYWNlKFxyXG5cdFx0L1xcWyg/OmR1ZXzwn5OFfGNvbXBsZXRpb2584pyFfGNyZWF0ZWR84p6VfHN0YXJ0fPCfm6t8c2NoZWR1bGVkfOKPs3xjYW5jZWxsZWR84p2MfGlkfPCfhpR8ZGVwZW5kc09ufOKblHxvbkNvbXBsZXRpb2588J+PgXxwcmlvcml0eXxyZXBlYXR8cmVjdXJyZW5jZXzwn5SBfHByb2plY3R8Y29udGV4dCk6OlxccypbXlxcXV0rXFxdL2dpLFxyXG5cdFx0Ly8gQ29ycmVjdGVkIHRoZSBlbW9qaSBpbiB0aGUgcHJldmlvdXMgYXR0ZW1wdFxyXG5cdFx0XCJcIlxyXG5cdCk7XHJcblxyXG5cdC8vIC0tLSBHZW5lcmFsIENsZWFuaW5nIC0tLVxyXG5cdC8vIFByb2Nlc3MgdGFncyBhbmQgY29udGV4dCB0YWdzIHdoaWxlIHByZXNlcnZpbmcgbGlua3MgKGJvdGggd2lraSBhbmQgbWFya2Rvd24pIGFuZCBpbmxpbmUgY29kZVxyXG5cclxuXHRpbnRlcmZhY2UgUHJlc2VydmVkU2VnbWVudCB7XHJcblx0XHR0ZXh0OiBzdHJpbmc7XHJcblx0XHRpbmRleDogbnVtYmVyO1xyXG5cdFx0bGVuZ3RoOiBudW1iZXI7XHJcblx0XHRpZDogc3RyaW5nOyAvLyBBZGQgdW5pcXVlIGlkZW50aWZpZXIgZm9yIGJldHRlciB0cmFja2luZ1xyXG5cdH1cclxuXHJcblx0Y29uc3QgcHJlc2VydmVkU2VnbWVudHM6IFByZXNlcnZlZFNlZ21lbnRbXSA9IFtdO1xyXG5cdGNvbnN0IGlubGluZUNvZGVSZWdleCA9IC9gKFteYF0rPylgL2c7IC8vIE1hdGNoZXMgYGNvZGVgXHJcblx0Y29uc3Qgd2lraUxpbmtSZWdleCA9IC9cXFtcXFsoW15cXF1dKylcXF1cXF0vZztcclxuXHRjb25zdCBtYXJrZG93bkxpbmtSZWdleCA9IC9cXFsoW15cXFtcXF1dKilcXF1cXCgoLio/KVxcKS9nOyAvLyBSZWdleCBmb3IgW3RleHRdKGxpbmspXHJcblx0bGV0IG1hdGNoOiBSZWdFeHBFeGVjQXJyYXkgfCBudWxsO1xyXG5cdGxldCBzZWdtZW50Q291bnRlciA9IDA7XHJcblxyXG5cdC8vIEZpbmQgYWxsIGlubGluZSBjb2RlIGJsb2NrcyBmaXJzdFxyXG5cdGlubGluZUNvZGVSZWdleC5sYXN0SW5kZXggPSAwO1xyXG5cdHdoaWxlICgobWF0Y2ggPSBpbmxpbmVDb2RlUmVnZXguZXhlYyhjbGVhbmVkTWFya2Rvd24pKSAhPT0gbnVsbCkge1xyXG5cdFx0cHJlc2VydmVkU2VnbWVudHMucHVzaCh7XHJcblx0XHRcdHRleHQ6IG1hdGNoWzBdLFxyXG5cdFx0XHRpbmRleDogbWF0Y2guaW5kZXgsXHJcblx0XHRcdGxlbmd0aDogbWF0Y2hbMF0ubGVuZ3RoLFxyXG5cdFx0XHRpZDogYGNvZGVfJHtzZWdtZW50Q291bnRlcisrfWAsXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIEZpbmQgYWxsIHdpa2kgbGlua3MgKGF2b2lkIG92ZXJsYXBzIHdpdGggYWxyZWFkeSBmb3VuZCBzZWdtZW50cyBsaWtlIGlubGluZSBjb2RlKVxyXG5cdHdpa2lMaW5rUmVnZXgubGFzdEluZGV4ID0gMDtcclxuXHR3aGlsZSAoKG1hdGNoID0gd2lraUxpbmtSZWdleC5leGVjKGNsZWFuZWRNYXJrZG93bikpICE9PSBudWxsKSB7XHJcblx0XHRjb25zdCBjdXJyZW50U3RhcnQgPSBtYXRjaC5pbmRleDtcclxuXHRcdGNvbnN0IGN1cnJlbnRFbmQgPSBjdXJyZW50U3RhcnQgKyBtYXRjaFswXS5sZW5ndGg7XHJcblx0XHRjb25zdCBvdmVybGFwcyA9IHByZXNlcnZlZFNlZ21lbnRzLnNvbWUoXHJcblx0XHRcdChwcykgPT5cclxuXHRcdFx0XHRNYXRoLm1heChwcy5pbmRleCwgY3VycmVudFN0YXJ0KSA8XHJcblx0XHRcdFx0TWF0aC5taW4ocHMuaW5kZXggKyBwcy5sZW5ndGgsIGN1cnJlbnRFbmQpXHJcblx0XHQpO1xyXG5cdFx0aWYgKCFvdmVybGFwcykge1xyXG5cdFx0XHRwcmVzZXJ2ZWRTZWdtZW50cy5wdXNoKHtcclxuXHRcdFx0XHR0ZXh0OiBtYXRjaFswXSxcclxuXHRcdFx0XHRpbmRleDogY3VycmVudFN0YXJ0LFxyXG5cdFx0XHRcdGxlbmd0aDogbWF0Y2hbMF0ubGVuZ3RoLFxyXG5cdFx0XHRcdGlkOiBgd2lraV8ke3NlZ21lbnRDb3VudGVyKyt9YCxcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBGaW5kIGFsbCBtYXJrZG93biBsaW5rcyAoYXZvaWQgb3ZlcmxhcHMgd2l0aCBleGlzdGluZyBzZWdtZW50cylcclxuXHRtYXJrZG93bkxpbmtSZWdleC5sYXN0SW5kZXggPSAwO1xyXG5cdHdoaWxlICgobWF0Y2ggPSBtYXJrZG93bkxpbmtSZWdleC5leGVjKGNsZWFuZWRNYXJrZG93bikpICE9PSBudWxsKSB7XHJcblx0XHRjb25zdCBjdXJyZW50U3RhcnQgPSBtYXRjaC5pbmRleDtcclxuXHRcdGNvbnN0IGN1cnJlbnRFbmQgPSBjdXJyZW50U3RhcnQgKyBtYXRjaFswXS5sZW5ndGg7XHJcblx0XHRjb25zdCBvdmVybGFwcyA9IHByZXNlcnZlZFNlZ21lbnRzLnNvbWUoXHJcblx0XHRcdChwcykgPT5cclxuXHRcdFx0XHRNYXRoLm1heChwcy5pbmRleCwgY3VycmVudFN0YXJ0KSA8XHJcblx0XHRcdFx0TWF0aC5taW4ocHMuaW5kZXggKyBwcy5sZW5ndGgsIGN1cnJlbnRFbmQpXHJcblx0XHQpO1xyXG5cdFx0aWYgKCFvdmVybGFwcykge1xyXG5cdFx0XHRwcmVzZXJ2ZWRTZWdtZW50cy5wdXNoKHtcclxuXHRcdFx0XHR0ZXh0OiBtYXRjaFswXSxcclxuXHRcdFx0XHRpbmRleDogY3VycmVudFN0YXJ0LFxyXG5cdFx0XHRcdGxlbmd0aDogbWF0Y2hbMF0ubGVuZ3RoLFxyXG5cdFx0XHRcdGlkOiBgbWRfJHtzZWdtZW50Q291bnRlcisrfWAsXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gQ3JlYXRlIGEgdGVtcG9yYXJ5IHZlcnNpb24gb2YgbWFya2Rvd24gd2l0aCBhbGwgcHJlc2VydmVkIHNlZ21lbnRzIHJlcGxhY2VkIGJ5IHVuaXF1ZSBwbGFjZWhvbGRlcnNcclxuXHRsZXQgdGVtcE1hcmtkb3duID0gY2xlYW5lZE1hcmtkb3duO1xyXG5cdGNvbnN0IHBsYWNlaG9sZGVyTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTsgLy8gTWFwIHBsYWNlaG9sZGVyIHRvIG9yaWdpbmFsIHRleHRcclxuXHJcblx0aWYgKHByZXNlcnZlZFNlZ21lbnRzLmxlbmd0aCA+IDApIHtcclxuXHRcdC8vIFNvcnQgc2VnbWVudHMgYnkgaW5kZXggaW4gZGVzY2VuZGluZyBvcmRlciB0byBwcm9jZXNzIGZyb20gZW5kIHRvIGJlZ2lubmluZ1xyXG5cdFx0Ly8gVGhpcyBwcmV2ZW50cyBpbmRpY2VzIGZyb20gc2hpZnRpbmcgd2hlbiByZXBsYWNpbmdcclxuXHRcdHByZXNlcnZlZFNlZ21lbnRzLnNvcnQoKGEsIGIpID0+IGIuaW5kZXggLSBhLmluZGV4KTtcclxuXHJcblx0XHRmb3IgKGNvbnN0IHNlZ21lbnQgb2YgcHJlc2VydmVkU2VnbWVudHMpIHtcclxuXHRcdFx0Ly8gVXNlIHVuaXF1ZSBwbGFjZWhvbGRlciB3aXRoIHNlZ21lbnQgSUQgdG8gYXZvaWQgY29uZmxpY3RzXHJcblx0XHRcdGNvbnN0IHBsYWNlaG9sZGVyID0gYF9fUFJFU0VSVkVEXyR7c2VnbWVudC5pZH1fX2A7XHJcblx0XHRcdHBsYWNlaG9sZGVyTWFwLnNldChwbGFjZWhvbGRlciwgc2VnbWVudC50ZXh0KTtcclxuXHJcblx0XHRcdHRlbXBNYXJrZG93biA9XHJcblx0XHRcdFx0dGVtcE1hcmtkb3duLnN1YnN0cmluZygwLCBzZWdtZW50LmluZGV4KSArXHJcblx0XHRcdFx0cGxhY2Vob2xkZXIgK1xyXG5cdFx0XHRcdHRlbXBNYXJrZG93bi5zdWJzdHJpbmcoc2VnbWVudC5pbmRleCArIHNlZ21lbnQubGVuZ3RoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIFJlbW92ZSB0YWdzIGZyb20gdGVtcG9yYXJ5IG1hcmtkb3duICh3aGVyZSBsaW5rcy9jb2RlIGFyZSBwbGFjZWhvbGRlcnMpXHJcblx0dGVtcE1hcmtkb3duID0gcmVtb3ZlVGFnc1dpdGhMaW5rUHJvdGVjdGlvbih0ZW1wTWFya2Rvd24pO1xyXG5cclxuXHQvLyBSZW1vdmUgY29udGV4dCB0YWdzIGZyb20gdGVtcG9yYXJ5IG1hcmtkb3duXHJcblx0dGVtcE1hcmtkb3duID0gdGVtcE1hcmtkb3duLnJlcGxhY2UoL0BbXFx3LV0rL2csIFwiXCIpO1xyXG5cclxuXHQvLyBSZW1vdmUgdGFyZ2V0IGxvY2F0aW9uIHBhdHRlcm5zIChsaWtlIFwidGFyZ2V0OiBvZmZpY2Ug8J+TgVwiKVxyXG5cdHRlbXBNYXJrZG93biA9IHRlbXBNYXJrZG93bi5yZXBsYWNlKC9cXGJ0YXJnZXQ6XFxzKi9naSwgXCJcIik7XHJcblx0dGVtcE1hcmtkb3duID0gdGVtcE1hcmtkb3duLnJlcGxhY2UoL1xccyrwn5OBXFxzKi9nLCBcIiBcIik7XHJcblxyXG5cdC8vIFJlbW92ZSBhbnkgcmVtYWluaW5nIHNpbXBsZSB0YWdzIGJ1dCBwcmVzZXJ2ZSBzcGVjaWFsIHRhZ3MgbGlrZSAjMTIzLTEyMy0xMjNcclxuXHQvLyBBbHNvIGlnbm9yZSBlc2NhcGVkIFxcIyAoZG8gbm90IHRyZWF0IGFzIHRhZylcclxuXHR0ZW1wTWFya2Rvd24gPSAoZnVuY3Rpb24gcmVtb3ZlU2ltcGxlVGFnc0lnbm9yaW5nRXNjYXBlcyhcclxuXHRcdGlucHV0OiBzdHJpbmdcclxuXHQpOiBzdHJpbmcge1xyXG5cdFx0bGV0IG91dCA9IFwiXCI7XHJcblx0XHRsZXQgaSA9IDA7XHJcblxyXG5cdFx0ZnVuY3Rpb24gaXNFc2NhcGVkSGFzaEF0KGlkeDogbnVtYmVyKTogYm9vbGVhbiB7XHJcblx0XHRcdGxldCBicyA9IDA7XHJcblx0XHRcdGxldCBqID0gaWR4IC0gMTtcclxuXHRcdFx0d2hpbGUgKGogPj0gMCAmJiBpbnB1dFtqXSA9PT0gXCJcXFxcXCIpIHtcclxuXHRcdFx0XHRicysrO1xyXG5cdFx0XHRcdGotLTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gYnMgJSAyID09PSAxO1xyXG5cdFx0fVxyXG5cclxuXHRcdHdoaWxlIChpIDwgaW5wdXQubGVuZ3RoKSB7XHJcblx0XHRcdGlmIChpbnB1dFtpXSA9PT0gXCIjXCIpIHtcclxuXHRcdFx0XHRpZiAoaXNFc2NhcGVkSGFzaEF0KGkpKSB7XHJcblx0XHRcdFx0XHRvdXQgKz0gXCIjXCI7XHJcblx0XHRcdFx0XHRpKys7XHJcblx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Y29uc3QgcmVzdCA9IGlucHV0LnN1YnN0cmluZyhpKTtcclxuXHRcdFx0XHRjb25zdCBtID0gVEFHX0hFQUQuZXhlYyhyZXN0KTtcclxuXHRcdFx0XHRpZiAobSkge1xyXG5cdFx0XHRcdFx0Y29uc3QgZnVsbCA9IG1bMF07XHJcblx0XHRcdFx0XHRjb25zdCBib2R5ID0gZnVsbC5zbGljZSgxKTtcclxuXHRcdFx0XHRcdC8vIFByZXNlcnZlIG9ubHkgcHVyZSBudW1lcmljIHRva2VucyBsaWtlICMxMjM7IG90aGVycyBhcmUgdGFncyB0byByZW1vdmVcclxuXHRcdFx0XHRcdGlmICgvXlxcZCskLy50ZXN0KGJvZHkpKSB7XHJcblx0XHRcdFx0XHRcdG91dCArPSBmdWxsO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0aSArPSBmdWxsLmxlbmd0aDtcclxuXHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvLyBub3QgYSB0YWcsIGtlZXAgJyMnXHJcblx0XHRcdFx0b3V0ICs9IFwiI1wiO1xyXG5cdFx0XHRcdGkrKztcclxuXHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRvdXQgKz0gaW5wdXRbaV07XHJcblx0XHRcdGkrKztcclxuXHRcdH1cclxuXHRcdHJldHVybiBvdXQ7XHJcblx0fSkodGVtcE1hcmtkb3duKTtcclxuXHJcblx0Ly8gUmVtb3ZlIGFueSByZW1haW5pbmcgdGlsZGUgc3ltYm9scyAofiBzeW1ib2wpIHRoYXQgd2VyZW4ndCBoYW5kbGVkIGJ5IHRoZSBzcGVjaWFsIGNhc2VcclxuXHR0ZW1wTWFya2Rvd24gPSB0ZW1wTWFya2Rvd24ucmVwbGFjZSgvXFxzK35cXHMrL2csIFwiIFwiKTtcclxuXHR0ZW1wTWFya2Rvd24gPSB0ZW1wTWFya2Rvd24ucmVwbGFjZSgvXFxzK34oPz1cXHN8JCkvZywgXCJcIik7XHJcblx0dGVtcE1hcmtkb3duID0gdGVtcE1hcmtkb3duLnJlcGxhY2UoL15+XFxzKy8sIFwiXCIpO1xyXG5cclxuXHQvLyBOb3cgcmVzdG9yZSB0aGUgcHJlc2VydmVkIHNlZ21lbnRzIGJ5IHJlcGxhY2luZyBwbGFjZWhvbGRlcnMgd2l0aCBvcmlnaW5hbCBjb250ZW50XHJcblx0Zm9yIChjb25zdCBbcGxhY2Vob2xkZXIsIG9yaWdpbmFsVGV4dF0gb2YgcGxhY2Vob2xkZXJNYXApIHtcclxuXHRcdHRlbXBNYXJrZG93biA9IHRlbXBNYXJrZG93bi5yZXBsYWNlKHBsYWNlaG9sZGVyLCBvcmlnaW5hbFRleHQpO1xyXG5cdH1cclxuXHJcblx0Ly8gVGFzayBtYXJrZXIgYW5kIGZpbmFsIGNsZWFuaW5nIChhcHBsaWVkIHRvIHRoZSBzdHJpbmcgd2l0aCBsaW5rcy9jb2RlIHJlc3RvcmVkKVxyXG5cdHRlbXBNYXJrZG93biA9IHRlbXBNYXJrZG93bi5yZXBsYWNlKFxyXG5cdFx0L14oW1xccz5dKik/KC18XFxkK1xcLnxcXCp8XFwrKVxcc1xcWyhbXlxcW1xcXV17MX0pXFxdXFxzKi8sXHJcblx0XHRcIlwiXHJcblx0KTtcclxuXHR0ZW1wTWFya2Rvd24gPSB0ZW1wTWFya2Rvd24ucmVwbGFjZSgvXiMgLywgXCJcIik7XHJcblx0dGVtcE1hcmtkb3duID0gdGVtcE1hcmtkb3duLnJlcGxhY2UoL1xccysvZywgXCIgXCIpLnRyaW0oKTtcclxuXHJcblx0cmV0dXJuIHRlbXBNYXJrZG93bjtcclxufVxyXG5cclxuLyoqXHJcbiAqIEEgd3JhcHBlciBjb21wb25lbnQgZm9yIE9ic2lkaWFuJ3MgTWFya2Rvd25SZW5kZXJlclxyXG4gKiBUaGlzIHByb3ZpZGVzIGEgc2ltcGxlciBpbnRlcmZhY2UgZm9yIHJlbmRlcmluZyBtYXJrZG93biBjb250ZW50IGluIHRoZSBwbHVnaW5cclxuICogd2l0aCBhZGRpdGlvbmFsIGZlYXR1cmVzIGZvciBtYW5hZ2luZyByZW5kZXIgc3RhdGUgYW5kIG9wdGltaXppbmcgdXBkYXRlc1xyXG4gKi9cclxuZXhwb3J0IGNsYXNzIE1hcmtkb3duUmVuZGVyZXJDb21wb25lbnQgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdHByaXZhdGUgY29udGFpbmVyOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIHNvdXJjZVBhdGg6IHN0cmluZztcclxuXHRwcml2YXRlIGN1cnJlbnRGaWxlOiBURmlsZSB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgcmVuZGVyUXVldWU6IEFycmF5PHsgbWFya2Rvd246IHN0cmluZzsgYmxvY2tJZD86IHN0cmluZyB9PiA9IFtdO1xyXG5cdHByaXZhdGUgaXNSZW5kZXJpbmc6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHRwcml2YXRlIGJsb2NrRWxlbWVudHM6IE1hcDxzdHJpbmcsIEhUTUxFbGVtZW50PiA9IG5ldyBNYXAoKTtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwcml2YXRlIGFwcDogQXBwLFxyXG5cdFx0Y29udGFpbmVyOiBIVE1MRWxlbWVudCxcclxuXHRcdHNvdXJjZVBhdGg6IHN0cmluZyA9IFwiXCIsXHJcblx0XHRwcml2YXRlIGhpZGVNYXJrczogYm9vbGVhbiA9IHRydWVcclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLmNvbnRhaW5lciA9IGNvbnRhaW5lcjtcclxuXHRcdHRoaXMuc291cmNlUGF0aCA9IHNvdXJjZVBhdGg7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTZXQgdGhlIGN1cnJlbnQgZmlsZSBjb250ZXh0IGZvciByZW5kZXJpbmdcclxuXHQgKiBAcGFyYW0gZmlsZSBUaGUgZmlsZSB0byB1c2UgYXMgY29udGV4dCBmb3IgcmVuZGVyaW5nXHJcblx0ICovXHJcblx0cHVibGljIHNldEZpbGUoZmlsZTogVEZpbGUpIHtcclxuXHRcdHRoaXMuY3VycmVudEZpbGUgPSBmaWxlO1xyXG5cdFx0dGhpcy5zb3VyY2VQYXRoID0gZmlsZS5wYXRoO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHRoZSBjdXJyZW50IGZpbGUgYmVpbmcgdXNlZCBmb3IgcmVuZGVyaW5nIGNvbnRleHRcclxuXHQgKi9cclxuXHRwdWJsaWMgZ2V0IGZpbGUoKTogVEZpbGUgfCBudWxsIHtcclxuXHRcdHJldHVybiB0aGlzLmN1cnJlbnRGaWxlO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVuZGVyIG1hcmtkb3duIGNvbnRlbnQgdG8gdGhlIGNvbnRhaW5lclxyXG5cdCAqIEBwYXJhbSBtYXJrZG93biBUaGUgbWFya2Rvd24gY29udGVudCB0byByZW5kZXJcclxuXHQgKiBAcGFyYW0gY2xlYXJDb250YWluZXIgV2hldGhlciB0byBjbGVhciB0aGUgY29udGFpbmVyIGJlZm9yZSByZW5kZXJpbmdcclxuXHQgKi9cclxuXHRwdWJsaWMgYXN5bmMgcmVuZGVyKFxyXG5cdFx0bWFya2Rvd246IHN0cmluZyxcclxuXHRcdGNsZWFyQ29udGFpbmVyOiBib29sZWFuID0gdHJ1ZVxyXG5cdCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0aWYgKGNsZWFyQ29udGFpbmVyKSB7XHJcblx0XHRcdHRoaXMuY2xlYXIoKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTcGxpdCBjb250ZW50IGludG8gYmxvY2tzIGJhc2VkIG9uIGRvdWJsZSBsaW5lIGJyZWFrc1xyXG5cdFx0Y29uc3QgYmxvY2tzID0gdGhpcy5zcGxpdEludG9CbG9ja3MobWFya2Rvd24pO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBibG9jayBlbGVtZW50cyBmb3IgZWFjaCBjb250ZW50IGJsb2NrXHJcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGJsb2Nrcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRjb25zdCBibG9ja0lkID0gYGJsb2NrLSR7RGF0ZS5ub3coKX0tJHtpfWA7XHJcblx0XHRcdGNvbnN0IGJsb2NrRWwgPSB0aGlzLmNvbnRhaW5lci5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdFx0Y2xzOiBbXCJtYXJrZG93bi1ibG9ja1wiLCBcIm1hcmtkb3duLXJlbmRlcmVyXCJdLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0YmxvY2tFbC5kYXRhc2V0LmJsb2NrSWQgPSBibG9ja0lkO1xyXG5cdFx0XHR0aGlzLmJsb2NrRWxlbWVudHMuc2V0KGJsb2NrSWQsIGJsb2NrRWwpO1xyXG5cclxuXHRcdFx0Ly8gUXVldWUgdGhpcyBibG9jayBmb3IgcmVuZGVyaW5nXHJcblx0XHRcdHRoaXMucXVldWVSZW5kZXIoYmxvY2tzW2ldLCBibG9ja0lkKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTdGFydCBwcm9jZXNzaW5nIHRoZSBxdWV1ZVxyXG5cdFx0dGhpcy5wcm9jZXNzUmVuZGVyUXVldWUoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNwbGl0IG1hcmtkb3duIGNvbnRlbnQgaW50byBibG9ja3MgYmFzZWQgb24gZG91YmxlIGxpbmUgYnJlYWtzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBzcGxpdEludG9CbG9ja3MobWFya2Rvd246IHN0cmluZyk6IHN0cmluZ1tdIHtcclxuXHRcdGlmICghdGhpcy5oaWRlTWFya3MpIHtcclxuXHRcdFx0cmV0dXJuIG1hcmtkb3duXHJcblx0XHRcdFx0LnNwbGl0KC9cXG5cXHMqXFxuLylcclxuXHRcdFx0XHQuZmlsdGVyKChibG9jaykgPT4gYmxvY2sudHJpbSgpLmxlbmd0aCA+IDApO1xyXG5cdFx0fVxyXG5cdFx0Ly8gU3BsaXQgb24gZG91YmxlIG5ld2xpbmVzIChwYXJhZ3JhcGggYnJlYWtzKVxyXG5cdFx0cmV0dXJuIGNsZWFyQWxsTWFya3MobWFya2Rvd24pXHJcblx0XHRcdC5zcGxpdCgvXFxuXFxzKlxcbi8pXHJcblx0XHRcdC5maWx0ZXIoKGJsb2NrKSA9PiBibG9jay50cmltKCkubGVuZ3RoID4gMCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBRdWV1ZSBhIG1hcmtkb3duIGJsb2NrIGZvciByZW5kZXJpbmdcclxuXHQgKi9cclxuXHRwcml2YXRlIHF1ZXVlUmVuZGVyKG1hcmtkb3duOiBzdHJpbmcsIGJsb2NrSWQ/OiBzdHJpbmcpOiB2b2lkIHtcclxuXHRcdHRoaXMucmVuZGVyUXVldWUucHVzaCh7bWFya2Rvd24sIGJsb2NrSWR9KTtcclxuXHRcdHRoaXMucHJvY2Vzc1JlbmRlclF1ZXVlKCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBQcm9jZXNzIHRoZSByZW5kZXIgcXVldWUgaWYgbm90IGFscmVhZHkgcHJvY2Vzc2luZ1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgcHJvY2Vzc1JlbmRlclF1ZXVlKCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0aWYgKHRoaXMuaXNSZW5kZXJpbmcgfHwgdGhpcy5yZW5kZXJRdWV1ZS5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuaXNSZW5kZXJpbmcgPSB0cnVlO1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdHdoaWxlICh0aGlzLnJlbmRlclF1ZXVlLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRjb25zdCBpdGVtID0gdGhpcy5yZW5kZXJRdWV1ZS5zaGlmdCgpO1xyXG5cdFx0XHRcdGlmICghaXRlbSkgY29udGludWU7XHJcblxyXG5cdFx0XHRcdGNvbnN0IHttYXJrZG93biwgYmxvY2tJZH0gPSBpdGVtO1xyXG5cclxuXHRcdFx0XHRpZiAoYmxvY2tJZCkge1xyXG5cdFx0XHRcdFx0Ly8gUmVuZGVyIHRvIGEgc3BlY2lmaWMgYmxvY2tcclxuXHRcdFx0XHRcdGNvbnN0IGJsb2NrRWwgPSB0aGlzLmJsb2NrRWxlbWVudHMuZ2V0KGJsb2NrSWQpO1xyXG5cdFx0XHRcdFx0aWYgKGJsb2NrRWwpIHtcclxuXHRcdFx0XHRcdFx0YmxvY2tFbC5lbXB0eSgpO1xyXG5cdFx0XHRcdFx0XHRhd2FpdCBPYnNpZGlhbk1hcmtkb3duUmVuZGVyZXIucmVuZGVyKFxyXG5cdFx0XHRcdFx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHRcdFx0XHRcdG1hcmtkb3duLFxyXG5cdFx0XHRcdFx0XHRcdGJsb2NrRWwsXHJcblx0XHRcdFx0XHRcdFx0dGhpcy5zb3VyY2VQYXRoLFxyXG5cdFx0XHRcdFx0XHRcdHRoaXNcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0Ly8gUmVuZGVyIHRvIHRoZSBtYWluIGNvbnRhaW5lclxyXG5cdFx0XHRcdFx0YXdhaXQgT2JzaWRpYW5NYXJrZG93blJlbmRlcmVyLnJlbmRlcihcclxuXHRcdFx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0XHRcdG1hcmtkb3duLFxyXG5cdFx0XHRcdFx0XHR0aGlzLmNvbnRhaW5lcixcclxuXHRcdFx0XHRcdFx0dGhpcy5zb3VyY2VQYXRoLFxyXG5cdFx0XHRcdFx0XHR0aGlzXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gU21hbGwgZGVsYXkgdG8gcHJldmVudCBVSSBmcmVlemluZyB3aXRoIGxhcmdlIGNvbnRlbnRcclxuXHRcdFx0XHRhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gc2V0VGltZW91dChyZXNvbHZlLCAwKSk7XHJcblx0XHRcdH1cclxuXHRcdH0gZmluYWxseSB7XHJcblx0XHRcdHRoaXMuaXNSZW5kZXJpbmcgPSBmYWxzZTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBhIHNwZWNpZmljIGJsb2NrIHdpdGggbmV3IGNvbnRlbnRcclxuXHQgKiBAcGFyYW0gYmxvY2tJZCBUaGUgSUQgb2YgdGhlIGJsb2NrIHRvIHVwZGF0ZVxyXG5cdCAqIEBwYXJhbSBtYXJrZG93biBUaGUgbmV3IG1hcmtkb3duIGNvbnRlbnRcclxuXHQgKi9cclxuXHRwdWJsaWMgdXBkYXRlQmxvY2soYmxvY2tJZDogc3RyaW5nLCBtYXJrZG93bjogc3RyaW5nKTogdm9pZCB7XHJcblx0XHRpZiAodGhpcy5ibG9ja0VsZW1lbnRzLmhhcyhibG9ja0lkKSkge1xyXG5cdFx0XHR0aGlzLnF1ZXVlUmVuZGVyKG1hcmtkb3duLCBibG9ja0lkKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSB0aGUgZW50aXJlIGNvbnRlbnQgd2l0aCBuZXcgbWFya2Rvd25cclxuXHQgKiBAcGFyYW0gbWFya2Rvd24gVGhlIG5ldyBtYXJrZG93biBjb250ZW50XHJcblx0ICovXHJcblx0cHVibGljIHVwZGF0ZShtYXJrZG93bjogc3RyaW5nKTogdm9pZCB7XHJcblx0XHQvLyBDbGVhciBleGlzdGluZyBxdWV1ZVxyXG5cdFx0dGhpcy5yZW5kZXJRdWV1ZSA9IFtdO1xyXG5cdFx0Ly8gUmVuZGVyIHRoZSBuZXcgY29udGVudFxyXG5cdFx0dGhpcy5yZW5kZXIobWFya2Rvd24sIHRydWUpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQWRkIGEgbmV3IGJsb2NrIGF0IHRoZSBlbmQgb2YgdGhlIGNvbnRhaW5lclxyXG5cdCAqIEBwYXJhbSBtYXJrZG93biBUaGUgbWFya2Rvd24gY29udGVudCBmb3IgdGhlIG5ldyBibG9ja1xyXG5cdCAqIEByZXR1cm5zIFRoZSBJRCBvZiB0aGUgbmV3IGJsb2NrXHJcblx0ICovXHJcblx0cHVibGljIGFkZEJsb2NrKG1hcmtkb3duOiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgYmxvY2tJZCA9IGBibG9jay0ke0RhdGUubm93KCl9LSR7dGhpcy5ibG9ja0VsZW1lbnRzLnNpemV9YDtcclxuXHRcdGNvbnN0IGJsb2NrRWwgPSB0aGlzLmNvbnRhaW5lci5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdGNsczogXCJtYXJrZG93bi1ibG9ja1wiLFxyXG5cdFx0fSk7XHJcblx0XHRibG9ja0VsLmRhdGFzZXQuYmxvY2tJZCA9IGJsb2NrSWQ7XHJcblx0XHR0aGlzLmJsb2NrRWxlbWVudHMuc2V0KGJsb2NrSWQsIGJsb2NrRWwpO1xyXG5cclxuXHRcdHRoaXMucXVldWVSZW5kZXIobWFya2Rvd24sIGJsb2NrSWQpO1xyXG5cdFx0cmV0dXJuIGJsb2NrSWQ7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW1vdmUgYSBzcGVjaWZpYyBibG9ja1xyXG5cdCAqIEBwYXJhbSBibG9ja0lkIFRoZSBJRCBvZiB0aGUgYmxvY2sgdG8gcmVtb3ZlXHJcblx0ICovXHJcblx0cHVibGljIHJlbW92ZUJsb2NrKGJsb2NrSWQ6IHN0cmluZyk6IHZvaWQge1xyXG5cdFx0Y29uc3QgYmxvY2tFbCA9IHRoaXMuYmxvY2tFbGVtZW50cy5nZXQoYmxvY2tJZCk7XHJcblx0XHRpZiAoYmxvY2tFbCkge1xyXG5cdFx0XHRibG9ja0VsLnJlbW92ZSgpO1xyXG5cdFx0XHR0aGlzLmJsb2NrRWxlbWVudHMuZGVsZXRlKGJsb2NrSWQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2xlYXIgYWxsIGNvbnRlbnQgYW5kIGJsb2Nrc1xyXG5cdCAqL1xyXG5cdHB1YmxpYyBjbGVhcigpOiB2b2lkIHtcclxuXHRcdHRoaXMuY29udGFpbmVyLmVtcHR5KCk7XHJcblx0XHR0aGlzLmJsb2NrRWxlbWVudHMuY2xlYXIoKTtcclxuXHRcdHRoaXMucmVuZGVyUXVldWUgPSBbXTtcclxuXHR9XHJcblxyXG5cdG9udW5sb2FkKCk6IHZvaWQge1xyXG5cdFx0dGhpcy5jbGVhcigpO1xyXG5cdFx0c3VwZXIub251bmxvYWQoKTtcclxuXHR9XHJcbn1cclxuIl19