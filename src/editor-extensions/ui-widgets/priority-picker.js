import { ViewPlugin, Decoration, WidgetType, MatchDecorator, } from "@codemirror/view";
import { editorLivePreviewField, Menu } from "obsidian";
import { Annotation } from "@codemirror/state";
// @ts-ignore - This import is necessary but TypeScript can't find it
import { syntaxTree, tokenClassNodeProp } from "@codemirror/language";
import { t } from "../../translations/helper";
export const priorityChangeAnnotation = Annotation.define();
// Priority definitions for emoji format (Tasks plugin style)
export const TASK_PRIORITIES = {
    highest: {
        emoji: "🔺",
        text: t("Highest priority"),
        regex: "🔺",
        dataviewValue: "highest",
        numericValue: 5,
    },
    high: {
        emoji: "⏫",
        text: t("High priority"),
        regex: "⏫",
        dataviewValue: "high",
        numericValue: 4,
    },
    medium: {
        emoji: "🔼",
        text: t("Medium priority"),
        regex: "🔼",
        dataviewValue: "medium",
        numericValue: 3,
    },
    none: {
        emoji: "",
        text: t("No priority"),
        regex: "",
        dataviewValue: "none",
        numericValue: 0,
    },
    low: {
        emoji: "🔽",
        text: t("Low priority"),
        regex: "🔽",
        dataviewValue: "low",
        numericValue: 2,
    },
    lowest: {
        emoji: "⏬️",
        text: t("Lowest priority"),
        regex: "⏬️",
        dataviewValue: "lowest",
        numericValue: 1,
    },
};
// Task plugin format priorities (letter format)
export const LETTER_PRIORITIES = {
    A: {
        text: t("Priority A"),
        regex: "\\[#A\\]",
        numericValue: 4,
    },
    B: {
        text: t("Priority B"),
        regex: "\\[#B\\]",
        numericValue: 3,
    },
    C: {
        text: t("Priority C"),
        regex: "\\[#C\\]",
        numericValue: 2,
    },
};
// Combined regular expressions for detecting priorities
const emojiPriorityRegex = Object.values(TASK_PRIORITIES)
    .map((p) => p.regex)
    .filter((r) => r)
    .join("|");
const letterPriorityRegex = Object.values(LETTER_PRIORITIES)
    .map((p) => p.regex)
    .join("|");
// Dataview priorities regex - improved to handle various formats
const dataviewPriorityRegex = /\[priority::\s*(highest|high|medium|none|low|lowest|\d+)\]/gi;
// Helper to detect priority mode for a given line
function detectPriorityMode(lineText, useDataviewFormat) {
    // Create non-global version for testing to avoid side effects
    const dataviewTestRegex = /\[priority::\s*(highest|high|medium|none|low|lowest|\d+)\]/i;
    // If user prefers dataview format, prioritize dataview detection
    if (useDataviewFormat) {
        if (dataviewTestRegex.test(lineText)) {
            return "dataview";
        }
    }
    // Check for emoji priorities (Tasks plugin format)
    if (/(🔺|⏫|🔼|🔽|⏬️)/.test(lineText)) {
        return "tasks";
    }
    // Check for letter priorities
    if (/\[#([ABC])\]/.test(lineText)) {
        return "letter";
    }
    // Check for dataview format if not preferred but present
    if (!useDataviewFormat && dataviewTestRegex.test(lineText)) {
        return "dataview";
    }
    return "none";
}
// Helper to get priority display text based on mode and value
function getPriorityDisplayText(priority, mode) {
    var _a;
    switch (mode) {
        case "dataview":
            // Extract the priority value from dataview format
            const match = priority.match(/\[priority::\s*(\w+|\d+)\]/i);
            if (match) {
                const value = match[1].toLowerCase();
                const taskPriority = Object.values(TASK_PRIORITIES).find((p) => p.dataviewValue === value);
                return taskPriority
                    ? `${taskPriority.emoji} ${taskPriority.text}`
                    : priority;
            }
            return priority;
        case "tasks":
            const taskPriority = Object.values(TASK_PRIORITIES).find((p) => p.emoji === priority);
            return taskPriority
                ? `${taskPriority.emoji} ${taskPriority.text}`
                : priority;
        case "letter":
            const letter = (_a = priority.match(/\[#([ABC])\]/)) === null || _a === void 0 ? void 0 : _a[1];
            const letterPriority = letter
                ? LETTER_PRIORITIES[letter]
                : null;
            return letterPriority ? letterPriority.text : priority;
        default:
            return priority;
    }
}
class PriorityWidget extends WidgetType {
    constructor(app, plugin, view, from, to, currentPriority, mode) {
        super();
        this.app = app;
        this.plugin = plugin;
        this.view = view;
        this.from = from;
        this.to = to;
        this.currentPriority = currentPriority;
        this.mode = mode;
    }
    eq(other) {
        return (this.from === other.from &&
            this.to === other.to &&
            this.currentPriority === other.currentPriority &&
            this.mode === other.mode);
    }
    toDOM() {
        try {
            const wrapper = createEl("span", {
                cls: "priority-widget",
                attr: {
                    "aria-label": t("Task Priority"),
                },
            });
            let prioritySpan;
            if (this.mode === "letter") {
                // Create spans for letter format priority [#A]
                const leftBracket = document.createElement("span");
                leftBracket.classList.add("cm-formatting", "cm-formatting-link", "cm-hmd-barelink", "cm-link", "cm-list-1");
                leftBracket.setAttribute("spellcheck", "false");
                leftBracket.textContent = "[";
                prioritySpan = document.createElement("span");
                prioritySpan.classList.add("cm-hmd-barelink", "cm-link", "cm-list-1");
                prioritySpan.textContent = this.currentPriority.slice(1, -1); // Remove brackets
                const rightBracket = document.createElement("span");
                rightBracket.classList.add("cm-formatting", "cm-formatting-link", "cm-hmd-barelink", "cm-link", "cm-list-1");
                rightBracket.setAttribute("spellcheck", "false");
                rightBracket.textContent = "]";
                wrapper.appendChild(leftBracket);
                wrapper.appendChild(prioritySpan);
                wrapper.appendChild(rightBracket);
            }
            else if (this.mode === "dataview") {
                prioritySpan = document.createElement("span");
                prioritySpan.classList.add("task-priority-dataview");
                prioritySpan.textContent = this.currentPriority;
                wrapper.appendChild(prioritySpan);
            }
            else {
                prioritySpan = document.createElement("span");
                prioritySpan.classList.add("task-priority");
                prioritySpan.textContent = this.currentPriority;
                wrapper.appendChild(prioritySpan);
            }
            // Attach click event to the inner span
            prioritySpan.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showPriorityMenu(e);
            });
            return wrapper;
        }
        catch (error) {
            console.error("Error creating priority widget DOM:", error);
            // Return a fallback element to prevent crashes
            const fallback = createEl("span", {
                cls: "priority-widget-error",
                text: this.currentPriority,
            });
            return fallback;
        }
    }
    showPriorityMenu(e) {
        try {
            const menu = new Menu();
            const useDataviewFormat = this.plugin.settings.preferMetadataFormat === "dataview";
            if (this.mode === "letter") {
                // Only show letter priorities
                Object.entries(LETTER_PRIORITIES).forEach(([key, priority]) => {
                    menu.addItem((item) => {
                        item.setTitle(priority.text);
                        item.onClick(() => {
                            this.setPriority(`[#${key}]`, "letter");
                        });
                    });
                });
                menu.addItem((item) => {
                    item.setTitle(t("Remove Priority"));
                    item.onClick(() => {
                        this.removePriority("letter");
                    });
                });
            }
            else {
                // Show the 6 priority levels based on user preference, excluding 'none'
                Object.entries(TASK_PRIORITIES).forEach(([key, priority]) => {
                    if (key !== "none") {
                        menu.addItem((item) => {
                            const displayText = useDataviewFormat
                                ? priority.text
                                : `${priority.emoji} ${priority.text}`;
                            item.setTitle(displayText);
                            item.onClick(() => {
                                if (useDataviewFormat) {
                                    this.setPriority(`[priority:: ${priority.dataviewValue}]`, "dataview");
                                }
                                else {
                                    this.setPriority(priority.emoji, "tasks");
                                }
                            });
                        });
                    }
                });
                // Add "Remove Priority" option at the bottom
                menu.addItem((item) => {
                    item.setTitle(t("Remove Priority"));
                    item.onClick(() => {
                        this.removePriority(useDataviewFormat ? "dataview" : "tasks");
                    });
                });
            }
            menu.showAtMouseEvent(e);
        }
        catch (error) {
            console.error("Error showing priority menu:", error);
        }
    }
    setPriority(priority, mode) {
        try {
            // Validate view state before making changes
            if (!this.view || this.view.state.doc.length < this.to) {
                console.warn("Invalid view state, skipping priority update");
                return;
            }
            const line = this.view.state.doc.lineAt(this.from);
            let newLine = line.text;
            // Remove existing priority first
            newLine = this.removeExistingPriority(newLine);
            // Add new priority at the end
            newLine = newLine.trimEnd() + " " + priority;
            const transaction = this.view.state.update({
                changes: { from: line.from, to: line.to, insert: newLine },
                annotations: [priorityChangeAnnotation.of(true)],
            });
            this.view.dispatch(transaction);
        }
        catch (error) {
            console.error("Error setting priority:", error);
        }
    }
    removePriority(mode) {
        try {
            // Validate view state before making changes
            if (!this.view || this.view.state.doc.length < this.to) {
                console.warn("Invalid view state, skipping priority removal");
                return;
            }
            const line = this.view.state.doc.lineAt(this.from);
            const newLine = this.removeExistingPriority(line.text).trimEnd();
            const transaction = this.view.state.update({
                changes: { from: line.from, to: line.to, insert: newLine },
                annotations: [priorityChangeAnnotation.of(true)],
            });
            this.view.dispatch(transaction);
        }
        catch (error) {
            console.error("Error removing priority:", error);
        }
    }
    removeExistingPriority(lineText) {
        let newLine = lineText;
        // Remove dataview priority
        newLine = newLine.replace(/\[priority::\s*\w+\]/i, "");
        // Remove emoji priorities
        newLine = newLine.replace(/(🔺|⏫|🔼|🔽|⏬️)/g, "");
        // Remove letter priorities
        newLine = newLine.replace(/\[#([ABC])\]/g, "");
        // Clean up extra spaces
        newLine = newLine.replace(/\s+/g, " ");
        return newLine;
    }
}
export function priorityPickerExtension(app, plugin) {
    // Don't enable if the setting is off
    if (!plugin.settings.enablePriorityPicker) {
        return [];
    }
    class PriorityViewPluginValue {
        constructor(view) {
            this.decorations = Decoration.none;
            this.lastUpdate = 0;
            this.updateThreshold = 50;
            this.isDestroyed = false;
            // Emoji priorities matcher
            this.emojiMatch = new MatchDecorator({
                regexp: new RegExp(`(${emojiPriorityRegex})`, "g"),
                decorate: (add, from, to, match, view) => {
                    try {
                        if (!this.shouldRender(view, from, to)) {
                            return;
                        }
                        const useDataviewFormat = this.plugin.settings.preferMetadataFormat ===
                            "dataview";
                        const line = this.view.state.doc.lineAt(from);
                        const mode = detectPriorityMode(line.text, useDataviewFormat);
                        add(from, to, Decoration.replace({
                            widget: new PriorityWidget(app, plugin, view, from, to, match[0], mode),
                        }));
                    }
                    catch (error) {
                        console.warn("Error decorating emoji priority:", error);
                    }
                },
            });
            // Letter priorities matcher
            this.letterMatch = new MatchDecorator({
                regexp: new RegExp(`(${letterPriorityRegex})`, "g"),
                decorate: (add, from, to, match, view) => {
                    try {
                        if (!this.shouldRender(view, from, to)) {
                            return;
                        }
                        add(from, to, Decoration.replace({
                            widget: new PriorityWidget(app, plugin, view, from, to, match[0], "letter"),
                        }));
                    }
                    catch (error) {
                        console.warn("Error decorating letter priority:", error);
                    }
                },
            });
            // Dataview priorities matcher
            this.dataviewMatch = new MatchDecorator({
                regexp: dataviewPriorityRegex,
                decorate: (add, from, to, match, view) => {
                    try {
                        if (!this.shouldRender(view, from, to)) {
                            return;
                        }
                        add(from, to, Decoration.replace({
                            widget: new PriorityWidget(app, plugin, view, from, to, match[0], "dataview"),
                        }));
                    }
                    catch (error) {
                        console.warn("Error decorating dataview priority:", error);
                    }
                },
            });
            this.view = view;
            this.plugin = plugin;
            this.updateDecorations(view);
        }
        update(update) {
            if (this.isDestroyed)
                return;
            try {
                if (update.docChanged ||
                    update.viewportChanged ||
                    update.selectionSet ||
                    update.transactions.some((tr) => tr.annotation(priorityChangeAnnotation))) {
                    // Throttle updates to avoid performance issues with large documents
                    const now = Date.now();
                    if (now - this.lastUpdate > this.updateThreshold) {
                        this.lastUpdate = now;
                        this.updateDecorations(update.view, update);
                    }
                    else {
                        // Schedule an update in the near future to ensure rendering
                        setTimeout(() => {
                            if (this.view && !this.isDestroyed) {
                                this.updateDecorations(this.view);
                            }
                        }, this.updateThreshold);
                    }
                }
            }
            catch (error) {
                console.error("Error in priority picker update:", error);
            }
        }
        destroy() {
            this.isDestroyed = true;
            this.decorations = Decoration.none;
        }
        updateDecorations(view, update) {
            if (this.isDestroyed)
                return;
            // Only apply in live preview mode
            if (!this.isLivePreview(view.state)) {
                this.decorations = Decoration.none;
                return;
            }
            try {
                const useDataviewFormat = this.plugin.settings.preferMetadataFormat === "dataview";
                // Use incremental update when possible for better performance
                if (update && !update.docChanged && this.decorations.size > 0) {
                    // Update decorations based on user preference
                    if (useDataviewFormat) {
                        // Prioritize dataview decorations
                        const dataviewDecos = this.dataviewMatch.updateDeco(update, this.decorations);
                        if (dataviewDecos.size > 0) {
                            this.decorations = dataviewDecos;
                            return;
                        }
                    }
                    // Try emoji decorations
                    const emojiDecos = this.emojiMatch.updateDeco(update, this.decorations);
                    if (emojiDecos.size > 0) {
                        this.decorations = emojiDecos;
                        return;
                    }
                    // Try letter decorations
                    const letterDecos = this.letterMatch.updateDeco(update, this.decorations);
                    if (letterDecos.size > 0) {
                        this.decorations = letterDecos;
                        return;
                    }
                    // Try dataview decorations if not preferred
                    if (!useDataviewFormat) {
                        const dataviewDecos = this.dataviewMatch.updateDeco(update, this.decorations);
                        this.decorations = dataviewDecos;
                    }
                }
                else {
                    // Create new decorations from scratch
                    let decorations = Decoration.none;
                    if (useDataviewFormat) {
                        // Prioritize dataview format
                        decorations = this.dataviewMatch.createDeco(view);
                        if (decorations.size === 0) {
                            // Fallback to emoji format
                            decorations = this.emojiMatch.createDeco(view);
                        }
                    }
                    else {
                        // Prioritize emoji format
                        decorations = this.emojiMatch.createDeco(view);
                        if (decorations.size === 0) {
                            // Fallback to dataview format
                            decorations = this.dataviewMatch.createDeco(view);
                        }
                    }
                    // Always check for letter format as it's independent
                    const letterDecos = this.letterMatch.createDeco(view);
                    if (letterDecos.size > 0) {
                        // Merge letter decorations with existing decorations
                        const ranges = [];
                        const iter = letterDecos.iter();
                        while (iter.value !== null) {
                            ranges.push({
                                from: iter.from,
                                to: iter.to,
                                value: iter.value,
                            });
                            iter.next();
                        }
                        if (ranges.length > 0) {
                            decorations = decorations.update({
                                add: ranges,
                            });
                        }
                    }
                    this.decorations = decorations;
                }
            }
            catch (e) {
                console.warn("Error updating priority decorations, clearing decorations", e);
                // Clear decorations on error to prevent crashes
                this.decorations = Decoration.none;
            }
        }
        isLivePreview(state) {
            try {
                return state.field(editorLivePreviewField);
            }
            catch (error) {
                console.warn("Error checking live preview state:", error);
                return false;
            }
        }
        shouldRender(view, decorationFrom, decorationTo) {
            try {
                // Validate positions
                if (decorationFrom < 0 ||
                    decorationTo > view.state.doc.length ||
                    decorationFrom >= decorationTo) {
                    return false;
                }
                const syntaxNode = syntaxTree(view.state).resolveInner(decorationFrom + 1);
                const nodeProps = syntaxNode.type.prop(tokenClassNodeProp);
                if (nodeProps) {
                    const props = nodeProps.split(" ");
                    if (props.includes("hmd-codeblock") ||
                        props.includes("hmd-frontmatter")) {
                        return false;
                    }
                }
                const selection = view.state.selection;
                const overlap = selection.ranges.some((r) => {
                    return !(r.to <= decorationFrom || r.from >= decorationTo);
                });
                return !overlap && this.isLivePreview(view.state);
            }
            catch (e) {
                // If an error occurs, default to not rendering to avoid breaking the editor
                console.warn("Error checking if priority should render", e);
                return false;
            }
        }
    }
    const PriorityViewPluginSpec = {
        decorations: (plugin) => {
            try {
                if (plugin.isDestroyed) {
                    return Decoration.none;
                }
                return plugin.decorations.update({
                    filter: (rangeFrom, rangeTo, deco) => {
                        var _a;
                        try {
                            const widget = (_a = deco.spec) === null || _a === void 0 ? void 0 : _a.widget;
                            if (widget.error) {
                                return false;
                            }
                            // Validate range
                            if (rangeFrom < 0 ||
                                rangeTo > plugin.view.state.doc.length ||
                                rangeFrom >= rangeTo) {
                                return false;
                            }
                            const selection = plugin.view.state.selection;
                            // Remove decorations when cursor is inside them
                            for (const range of selection.ranges) {
                                if (!(range.to <= rangeFrom ||
                                    range.from >= rangeTo)) {
                                    return false;
                                }
                            }
                            return true;
                        }
                        catch (e) {
                            console.warn("Error filtering priority decoration", e);
                            return false; // Remove decoration on error
                        }
                    },
                });
            }
            catch (e) {
                console.error("Failed to update decorations filter", e);
                return plugin.decorations; // Return current decorations to avoid breaking the editor
            }
        },
    };
    // Create the plugin with our implementation
    const pluginInstance = ViewPlugin.fromClass(PriorityViewPluginValue, PriorityViewPluginSpec);
    return pluginInstance;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJpb3JpdHktcGlja2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicHJpb3JpdHktcGlja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFFTixVQUFVLEVBRVYsVUFBVSxFQUVWLFVBQVUsRUFDVixjQUFjLEdBR2QsTUFBTSxrQkFBa0IsQ0FBQztBQUMxQixPQUFPLEVBQU8sc0JBQXNCLEVBQVUsSUFBSSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBRXJFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUMvQyxxRUFBcUU7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ3RFLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUM5QyxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUM7QUFFNUQsNkRBQTZEO0FBQzdELE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRztJQUM5QixPQUFPLEVBQUU7UUFDUixLQUFLLEVBQUUsSUFBSTtRQUNYLElBQUksRUFBRSxDQUFDLENBQUMsa0JBQWtCLENBQUM7UUFDM0IsS0FBSyxFQUFFLElBQUk7UUFDWCxhQUFhLEVBQUUsU0FBUztRQUN4QixZQUFZLEVBQUUsQ0FBQztLQUNmO0lBQ0QsSUFBSSxFQUFFO1FBQ0wsS0FBSyxFQUFFLEdBQUc7UUFDVixJQUFJLEVBQUUsQ0FBQyxDQUFDLGVBQWUsQ0FBQztRQUN4QixLQUFLLEVBQUUsR0FBRztRQUNWLGFBQWEsRUFBRSxNQUFNO1FBQ3JCLFlBQVksRUFBRSxDQUFDO0tBQ2Y7SUFDRCxNQUFNLEVBQUU7UUFDUCxLQUFLLEVBQUUsSUFBSTtRQUNYLElBQUksRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUM7UUFDMUIsS0FBSyxFQUFFLElBQUk7UUFDWCxhQUFhLEVBQUUsUUFBUTtRQUN2QixZQUFZLEVBQUUs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QUFDLEtBQUssQ0FBQyxxQ0FBcUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDeEQsT0FBTyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsMERBQTBEO2FBQ3JGO1FBQ0YsQ0FBQztLQUNELENBQUM7SUFFRiw0Q0FBNEM7SUFDNUMsTUFBTSxjQUFjLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FDMUMsdUJBQXVCLEVBQ3ZCLHNCQUFzQixDQUN0QixDQUFDO0lBRUYsT0FBTyxjQUFjLENBQUM7QUFDdkIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XHJcblx0RWRpdG9yVmlldyxcclxuXHRWaWV3UGx1Z2luLFxyXG5cdFZpZXdVcGRhdGUsXHJcblx0RGVjb3JhdGlvbixcclxuXHREZWNvcmF0aW9uU2V0LFxyXG5cdFdpZGdldFR5cGUsXHJcblx0TWF0Y2hEZWNvcmF0b3IsXHJcblx0UGx1Z2luVmFsdWUsXHJcblx0UGx1Z2luU3BlYyxcclxufSBmcm9tIFwiQGNvZGVtaXJyb3Ivdmlld1wiO1xyXG5pbXBvcnQgeyBBcHAsIGVkaXRvckxpdmVQcmV2aWV3RmllbGQsIEtleW1hcCwgTWVudSB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCIuLi8uLi9pbmRleFwiO1xyXG5pbXBvcnQgeyBBbm5vdGF0aW9uIH0gZnJvbSBcIkBjb2RlbWlycm9yL3N0YXRlXCI7XHJcbi8vIEB0cy1pZ25vcmUgLSBUaGlzIGltcG9ydCBpcyBuZWNlc3NhcnkgYnV0IFR5cGVTY3JpcHQgY2FuJ3QgZmluZCBpdFxyXG5pbXBvcnQgeyBzeW50YXhUcmVlLCB0b2tlbkNsYXNzTm9kZVByb3AgfSBmcm9tIFwiQGNvZGVtaXJyb3IvbGFuZ3VhZ2VcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCIuLi8uLi90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmV4cG9ydCBjb25zdCBwcmlvcml0eUNoYW5nZUFubm90YXRpb24gPSBBbm5vdGF0aW9uLmRlZmluZSgpO1xyXG5cclxuLy8gUHJpb3JpdHkgZGVmaW5pdGlvbnMgZm9yIGVtb2ppIGZvcm1hdCAoVGFza3MgcGx1Z2luIHN0eWxlKVxyXG5leHBvcnQgY29uc3QgVEFTS19QUklPUklUSUVTID0ge1xyXG5cdGhpZ2hlc3Q6IHtcclxuXHRcdGVtb2ppOiBcIvCflLpcIixcclxuXHRcdHRleHQ6IHQoXCJIaWdoZXN0IHByaW9yaXR5XCIpLFxyXG5cdFx0cmVnZXg6IFwi8J+UulwiLFxyXG5cdFx0ZGF0YXZpZXdWYWx1ZTogXCJoaWdoZXN0XCIsXHJcblx0XHRudW1lcmljVmFsdWU6IDUsXHJcblx0fSxcclxuXHRoaWdoOiB7XHJcblx0XHRlbW9qaTogXCLij6tcIixcclxuXHRcdHRleHQ6IHQoXCJIaWdoIHByaW9yaXR5XCIpLFxyXG5cdFx0cmVnZXg6IFwi4o+rXCIsXHJcblx0XHRkYXRhdmlld1ZhbHVlOiBcImhpZ2hcIixcclxuXHRcdG51bWVyaWNWYWx1ZTogNCxcclxuXHR9LFxyXG5cdG1lZGl1bToge1xyXG5cdFx0ZW1vamk6IFwi8J+UvFwiLFxyXG5cdFx0dGV4dDogdChcIk1lZGl1bSBwcmlvcml0eVwiKSxcclxuXHRcdHJlZ2V4OiBcIvCflLxcIixcclxuXHRcdGRhdGF2aWV3VmFsdWU6IFwibWVkaXVtXCIsXHJcblx0XHRudW1lcmljVmFsdWU6IDMsXHJcblx0fSxcclxuXHRub25lOiB7XHJcblx0XHRlbW9qaTogXCJcIixcclxuXHRcdHRleHQ6IHQoXCJObyBwcmlvcml0eVwiKSxcclxuXHRcdHJlZ2V4OiBcIlwiLFxyXG5cdFx0ZGF0YXZpZXdWYWx1ZTogXCJub25lXCIsXHJcblx0XHRudW1lcmljVmFsdWU6IDAsXHJcblx0fSxcclxuXHRsb3c6IHtcclxuXHRcdGVtb2ppOiBcIvCflL1cIixcclxuXHRcdHRleHQ6IHQoXCJMb3cgcHJpb3JpdHlcIiksXHJcblx0XHRyZWdleDogXCLwn5S9XCIsXHJcblx0XHRkYXRhdmlld1ZhbHVlOiBcImxvd1wiLFxyXG5cdFx0bnVtZXJpY1ZhbHVlOiAyLFxyXG5cdH0sXHJcblx0bG93ZXN0OiB7XHJcblx0XHRlbW9qaTogXCLij6zvuI9cIixcclxuXHRcdHRleHQ6IHQoXCJMb3dlc3QgcHJpb3JpdHlcIiksXHJcblx0XHRyZWdleDogXCLij6zvuI9cIixcclxuXHRcdGRhdGF2aWV3VmFsdWU6IFwibG93ZXN0XCIsXHJcblx0XHRudW1lcmljVmFsdWU6IDEsXHJcblx0fSxcclxufTtcclxuXHJcbi8vIFRhc2sgcGx1Z2luIGZvcm1hdCBwcmlvcml0aWVzIChsZXR0ZXIgZm9ybWF0KVxyXG5leHBvcnQgY29uc3QgTEVUVEVSX1BSSU9SSVRJRVMgPSB7XHJcblx0QToge1xyXG5cdFx0dGV4dDogdChcIlByaW9yaXR5IEFcIiksXHJcblx0XHRyZWdleDogXCJcXFxcWyNBXFxcXF1cIixcclxuXHRcdG51bWVyaWNWYWx1ZTogNCxcclxuXHR9LFxyXG5cdEI6IHtcclxuXHRcdHRleHQ6IHQoXCJQcmlvcml0eSBCXCIpLFxyXG5cdFx0cmVnZXg6IFwiXFxcXFsjQlxcXFxdXCIsXHJcblx0XHRudW1lcmljVmFsdWU6IDMsXHJcblx0fSxcclxuXHRDOiB7XHJcblx0XHR0ZXh0OiB0KFwiUHJpb3JpdHkgQ1wiKSxcclxuXHRcdHJlZ2V4OiBcIlxcXFxbI0NcXFxcXVwiLFxyXG5cdFx0bnVtZXJpY1ZhbHVlOiAyLFxyXG5cdH0sXHJcbn07XHJcblxyXG4vLyBDb21iaW5lZCByZWd1bGFyIGV4cHJlc3Npb25zIGZvciBkZXRlY3RpbmcgcHJpb3JpdGllc1xyXG5jb25zdCBlbW9qaVByaW9yaXR5UmVnZXggPSBPYmplY3QudmFsdWVzKFRBU0tfUFJJT1JJVElFUylcclxuXHQubWFwKChwKSA9PiBwLnJlZ2V4KVxyXG5cdC5maWx0ZXIoKHIpID0+IHIpXHJcblx0LmpvaW4oXCJ8XCIpO1xyXG5cclxuY29uc3QgbGV0dGVyUHJpb3JpdHlSZWdleCA9IE9iamVjdC52YWx1ZXMoTEVUVEVSX1BSSU9SSVRJRVMpXHJcblx0Lm1hcCgocCkgPT4gcC5yZWdleClcclxuXHQuam9pbihcInxcIik7XHJcblxyXG4vLyBEYXRhdmlldyBwcmlvcml0aWVzIHJlZ2V4IC0gaW1wcm92ZWQgdG8gaGFuZGxlIHZhcmlvdXMgZm9ybWF0c1xyXG5jb25zdCBkYXRhdmlld1ByaW9yaXR5UmVnZXggPVxyXG5cdC9cXFtwcmlvcml0eTo6XFxzKihoaWdoZXN0fGhpZ2h8bWVkaXVtfG5vbmV8bG93fGxvd2VzdHxcXGQrKVxcXS9naTtcclxuXHJcbi8vIFByaW9yaXR5IG1vZGUgZGV0ZWN0aW9uIHR5cGVcclxudHlwZSBQcmlvcml0eU1vZGUgPSBcInRhc2tzXCIgfCBcImRhdGF2aWV3XCIgfCBcImxldHRlclwiIHwgXCJub25lXCI7XHJcblxyXG4vLyBIZWxwZXIgdG8gZGV0ZWN0IHByaW9yaXR5IG1vZGUgZm9yIGEgZ2l2ZW4gbGluZVxyXG5mdW5jdGlvbiBkZXRlY3RQcmlvcml0eU1vZGUoXHJcblx0bGluZVRleHQ6IHN0cmluZyxcclxuXHR1c2VEYXRhdmlld0Zvcm1hdDogYm9vbGVhblxyXG4pOiBQcmlvcml0eU1vZGUge1xyXG5cdC8vIENyZWF0ZSBub24tZ2xvYmFsIHZlcnNpb24gZm9yIHRlc3RpbmcgdG8gYXZvaWQgc2lkZSBlZmZlY3RzXHJcblx0Y29uc3QgZGF0YXZpZXdUZXN0UmVnZXggPVxyXG5cdFx0L1xcW3ByaW9yaXR5OjpcXHMqKGhpZ2hlc3R8aGlnaHxtZWRpdW18bm9uZXxsb3d8bG93ZXN0fFxcZCspXFxdL2k7XHJcblxyXG5cdC8vIElmIHVzZXIgcHJlZmVycyBkYXRhdmlldyBmb3JtYXQsIHByaW9yaXRpemUgZGF0YXZpZXcgZGV0ZWN0aW9uXHJcblx0aWYgKHVzZURhdGF2aWV3Rm9ybWF0KSB7XHJcblx0XHRpZiAoZGF0YXZpZXdUZXN0UmVnZXgudGVzdChsaW5lVGV4dCkpIHtcclxuXHRcdFx0cmV0dXJuIFwiZGF0YXZpZXdcIjtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIENoZWNrIGZvciBlbW9qaSBwcmlvcml0aWVzIChUYXNrcyBwbHVnaW4gZm9ybWF0KVxyXG5cdGlmICgvKPCflLp84o+rfPCflLx88J+UvXzij6zvuI8pLy50ZXN0KGxpbmVUZXh0KSkge1xyXG5cdFx0cmV0dXJuIFwidGFza3NcIjtcclxuXHR9XHJcblxyXG5cdC8vIENoZWNrIGZvciBsZXR0ZXIgcHJpb3JpdGllc1xyXG5cdGlmICgvXFxbIyhbQUJDXSlcXF0vLnRlc3QobGluZVRleHQpKSB7XHJcblx0XHRyZXR1cm4gXCJsZXR0ZXJcIjtcclxuXHR9XHJcblxyXG5cdC8vIENoZWNrIGZvciBkYXRhdmlldyBmb3JtYXQgaWYgbm90IHByZWZlcnJlZCBidXQgcHJlc2VudFxyXG5cdGlmICghdXNlRGF0YXZpZXdGb3JtYXQgJiYgZGF0YXZpZXdUZXN0UmVnZXgudGVzdChsaW5lVGV4dCkpIHtcclxuXHRcdHJldHVybiBcImRhdGF2aWV3XCI7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gXCJub25lXCI7XHJcbn1cclxuXHJcbi8vIEhlbHBlciB0byBnZXQgcHJpb3JpdHkgZGlzcGxheSB0ZXh0IGJhc2VkIG9uIG1vZGUgYW5kIHZhbHVlXHJcbmZ1bmN0aW9uIGdldFByaW9yaXR5RGlzcGxheVRleHQocHJpb3JpdHk6IHN0cmluZywgbW9kZTogUHJpb3JpdHlNb2RlKTogc3RyaW5nIHtcclxuXHRzd2l0Y2ggKG1vZGUpIHtcclxuXHRcdGNhc2UgXCJkYXRhdmlld1wiOlxyXG5cdFx0XHQvLyBFeHRyYWN0IHRoZSBwcmlvcml0eSB2YWx1ZSBmcm9tIGRhdGF2aWV3IGZvcm1hdFxyXG5cdFx0XHRjb25zdCBtYXRjaCA9IHByaW9yaXR5Lm1hdGNoKC9cXFtwcmlvcml0eTo6XFxzKihcXHcrfFxcZCspXFxdL2kpO1xyXG5cdFx0XHRpZiAobWF0Y2gpIHtcclxuXHRcdFx0XHRjb25zdCB2YWx1ZSA9IG1hdGNoWzFdLnRvTG93ZXJDYXNlKCk7XHJcblx0XHRcdFx0Y29uc3QgdGFza1ByaW9yaXR5ID0gT2JqZWN0LnZhbHVlcyhUQVNLX1BSSU9SSVRJRVMpLmZpbmQoXHJcblx0XHRcdFx0XHQocCkgPT4gcC5kYXRhdmlld1ZhbHVlID09PSB2YWx1ZVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0cmV0dXJuIHRhc2tQcmlvcml0eVxyXG5cdFx0XHRcdFx0PyBgJHt0YXNrUHJpb3JpdHkuZW1vaml9ICR7dGFza1ByaW9yaXR5LnRleHR9YFxyXG5cdFx0XHRcdFx0OiBwcmlvcml0eTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gcHJpb3JpdHk7XHJcblx0XHRjYXNlIFwidGFza3NcIjpcclxuXHRcdFx0Y29uc3QgdGFza1ByaW9yaXR5ID0gT2JqZWN0LnZhbHVlcyhUQVNLX1BSSU9SSVRJRVMpLmZpbmQoXHJcblx0XHRcdFx0KHApID0+IHAuZW1vamkgPT09IHByaW9yaXR5XHJcblx0XHRcdCk7XHJcblx0XHRcdHJldHVybiB0YXNrUHJpb3JpdHlcclxuXHRcdFx0XHQ/IGAke3Rhc2tQcmlvcml0eS5lbW9qaX0gJHt0YXNrUHJpb3JpdHkudGV4dH1gXHJcblx0XHRcdFx0OiBwcmlvcml0eTtcclxuXHRcdGNhc2UgXCJsZXR0ZXJcIjpcclxuXHRcdFx0Y29uc3QgbGV0dGVyID0gcHJpb3JpdHkubWF0Y2goL1xcWyMoW0FCQ10pXFxdLyk/LlsxXTtcclxuXHRcdFx0Y29uc3QgbGV0dGVyUHJpb3JpdHkgPSBsZXR0ZXJcclxuXHRcdFx0XHQ/IExFVFRFUl9QUklPUklUSUVTW2xldHRlciBhcyBrZXlvZiB0eXBlb2YgTEVUVEVSX1BSSU9SSVRJRVNdXHJcblx0XHRcdFx0OiBudWxsO1xyXG5cdFx0XHRyZXR1cm4gbGV0dGVyUHJpb3JpdHkgPyBsZXR0ZXJQcmlvcml0eS50ZXh0IDogcHJpb3JpdHk7XHJcblx0XHRkZWZhdWx0OlxyXG5cdFx0XHRyZXR1cm4gcHJpb3JpdHk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBQcmlvcml0eVdpZGdldCBleHRlbmRzIFdpZGdldFR5cGUge1xyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cmVhZG9ubHkgYXBwOiBBcHAsXHJcblx0XHRyZWFkb25seSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdHJlYWRvbmx5IHZpZXc6IEVkaXRvclZpZXcsXHJcblx0XHRyZWFkb25seSBmcm9tOiBudW1iZXIsXHJcblx0XHRyZWFkb25seSB0bzogbnVtYmVyLFxyXG5cdFx0cmVhZG9ubHkgY3VycmVudFByaW9yaXR5OiBzdHJpbmcsXHJcblx0XHRyZWFkb25seSBtb2RlOiBQcmlvcml0eU1vZGVcclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0fVxyXG5cclxuXHRlcShvdGhlcjogUHJpb3JpdHlXaWRnZXQpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiAoXHJcblx0XHRcdHRoaXMuZnJvbSA9PT0gb3RoZXIuZnJvbSAmJlxyXG5cdFx0XHR0aGlzLnRvID09PSBvdGhlci50byAmJlxyXG5cdFx0XHR0aGlzLmN1cnJlbnRQcmlvcml0eSA9PT0gb3RoZXIuY3VycmVudFByaW9yaXR5ICYmXHJcblx0XHRcdHRoaXMubW9kZSA9PT0gb3RoZXIubW9kZVxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdHRvRE9NKCk6IEhUTUxFbGVtZW50IHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IHdyYXBwZXIgPSBjcmVhdGVFbChcInNwYW5cIiwge1xyXG5cdFx0XHRcdGNsczogXCJwcmlvcml0eS13aWRnZXRcIixcclxuXHRcdFx0XHRhdHRyOiB7XHJcblx0XHRcdFx0XHRcImFyaWEtbGFiZWxcIjogdChcIlRhc2sgUHJpb3JpdHlcIiksXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRsZXQgcHJpb3JpdHlTcGFuOiBIVE1MRWxlbWVudDtcclxuXHJcblx0XHRcdGlmICh0aGlzLm1vZGUgPT09IFwibGV0dGVyXCIpIHtcclxuXHRcdFx0XHQvLyBDcmVhdGUgc3BhbnMgZm9yIGxldHRlciBmb3JtYXQgcHJpb3JpdHkgWyNBXVxyXG5cdFx0XHRcdGNvbnN0IGxlZnRCcmFja2V0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNwYW5cIik7XHJcblx0XHRcdFx0bGVmdEJyYWNrZXQuY2xhc3NMaXN0LmFkZChcclxuXHRcdFx0XHRcdFwiY20tZm9ybWF0dGluZ1wiLFxyXG5cdFx0XHRcdFx0XCJjbS1mb3JtYXR0aW5nLWxpbmtcIixcclxuXHRcdFx0XHRcdFwiY20taG1kLWJhcmVsaW5rXCIsXHJcblx0XHRcdFx0XHRcImNtLWxpbmtcIixcclxuXHRcdFx0XHRcdFwiY20tbGlzdC0xXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGxlZnRCcmFja2V0LnNldEF0dHJpYnV0ZShcInNwZWxsY2hlY2tcIiwgXCJmYWxzZVwiKTtcclxuXHRcdFx0XHRsZWZ0QnJhY2tldC50ZXh0Q29udGVudCA9IFwiW1wiO1xyXG5cclxuXHRcdFx0XHRwcmlvcml0eVNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3BhblwiKTtcclxuXHRcdFx0XHRwcmlvcml0eVNwYW4uY2xhc3NMaXN0LmFkZChcclxuXHRcdFx0XHRcdFwiY20taG1kLWJhcmVsaW5rXCIsXHJcblx0XHRcdFx0XHRcImNtLWxpbmtcIixcclxuXHRcdFx0XHRcdFwiY20tbGlzdC0xXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHByaW9yaXR5U3Bhbi50ZXh0Q29udGVudCA9IHRoaXMuY3VycmVudFByaW9yaXR5LnNsaWNlKDEsIC0xKTsgLy8gUmVtb3ZlIGJyYWNrZXRzXHJcblxyXG5cdFx0XHRcdGNvbnN0IHJpZ2h0QnJhY2tldCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpO1xyXG5cdFx0XHRcdHJpZ2h0QnJhY2tldC5jbGFzc0xpc3QuYWRkKFxyXG5cdFx0XHRcdFx0XCJjbS1mb3JtYXR0aW5nXCIsXHJcblx0XHRcdFx0XHRcImNtLWZvcm1hdHRpbmctbGlua1wiLFxyXG5cdFx0XHRcdFx0XCJjbS1obWQtYmFyZWxpbmtcIixcclxuXHRcdFx0XHRcdFwiY20tbGlua1wiLFxyXG5cdFx0XHRcdFx0XCJjbS1saXN0LTFcIlxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0cmlnaHRCcmFja2V0LnNldEF0dHJpYnV0ZShcInNwZWxsY2hlY2tcIiwgXCJmYWxzZVwiKTtcclxuXHRcdFx0XHRyaWdodEJyYWNrZXQudGV4dENvbnRlbnQgPSBcIl1cIjtcclxuXHJcblx0XHRcdFx0d3JhcHBlci5hcHBlbmRDaGlsZChsZWZ0QnJhY2tldCk7XHJcblx0XHRcdFx0d3JhcHBlci5hcHBlbmRDaGlsZChwcmlvcml0eVNwYW4pO1xyXG5cdFx0XHRcdHdyYXBwZXIuYXBwZW5kQ2hpbGQocmlnaHRCcmFja2V0KTtcclxuXHRcdFx0fSBlbHNlIGlmICh0aGlzLm1vZGUgPT09IFwiZGF0YXZpZXdcIikge1xyXG5cdFx0XHRcdHByaW9yaXR5U3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpO1xyXG5cdFx0XHRcdHByaW9yaXR5U3Bhbi5jbGFzc0xpc3QuYWRkKFwidGFzay1wcmlvcml0eS1kYXRhdmlld1wiKTtcclxuXHRcdFx0XHRwcmlvcml0eVNwYW4udGV4dENvbnRlbnQgPSB0aGlzLmN1cnJlbnRQcmlvcml0eTtcclxuXHRcdFx0XHR3cmFwcGVyLmFwcGVuZENoaWxkKHByaW9yaXR5U3Bhbik7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0cHJpb3JpdHlTcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNwYW5cIik7XHJcblx0XHRcdFx0cHJpb3JpdHlTcGFuLmNsYXNzTGlzdC5hZGQoXCJ0YXNrLXByaW9yaXR5XCIpO1xyXG5cdFx0XHRcdHByaW9yaXR5U3Bhbi50ZXh0Q29udGVudCA9IHRoaXMuY3VycmVudFByaW9yaXR5O1xyXG5cdFx0XHRcdHdyYXBwZXIuYXBwZW5kQ2hpbGQocHJpb3JpdHlTcGFuKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQXR0YWNoIGNsaWNrIGV2ZW50IHRvIHRoZSBpbm5lciBzcGFuXHJcblx0XHRcdHByaW9yaXR5U3Bhbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGUpID0+IHtcclxuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHRcdFx0XHR0aGlzLnNob3dQcmlvcml0eU1lbnUoZSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0cmV0dXJuIHdyYXBwZXI7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRXJyb3IgY3JlYXRpbmcgcHJpb3JpdHkgd2lkZ2V0IERPTTpcIiwgZXJyb3IpO1xyXG5cdFx0XHQvLyBSZXR1cm4gYSBmYWxsYmFjayBlbGVtZW50IHRvIHByZXZlbnQgY3Jhc2hlc1xyXG5cdFx0XHRjb25zdCBmYWxsYmFjayA9IGNyZWF0ZUVsKFwic3BhblwiLCB7XHJcblx0XHRcdFx0Y2xzOiBcInByaW9yaXR5LXdpZGdldC1lcnJvclwiLFxyXG5cdFx0XHRcdHRleHQ6IHRoaXMuY3VycmVudFByaW9yaXR5LFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0cmV0dXJuIGZhbGxiYWNrO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBzaG93UHJpb3JpdHlNZW51KGU6IE1vdXNlRXZlbnQpIHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IG1lbnUgPSBuZXcgTWVudSgpO1xyXG5cdFx0XHRjb25zdCB1c2VEYXRhdmlld0Zvcm1hdCA9XHJcblx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucHJlZmVyTWV0YWRhdGFGb3JtYXQgPT09IFwiZGF0YXZpZXdcIjtcclxuXHJcblx0XHRcdGlmICh0aGlzLm1vZGUgPT09IFwibGV0dGVyXCIpIHtcclxuXHRcdFx0XHQvLyBPbmx5IHNob3cgbGV0dGVyIHByaW9yaXRpZXNcclxuXHRcdFx0XHRPYmplY3QuZW50cmllcyhMRVRURVJfUFJJT1JJVElFUykuZm9yRWFjaCgoW2tleSwgcHJpb3JpdHldKSA9PiB7XHJcblx0XHRcdFx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRcdFx0aXRlbS5zZXRUaXRsZShwcmlvcml0eS50ZXh0KTtcclxuXHRcdFx0XHRcdFx0aXRlbS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnNldFByaW9yaXR5KGBbIyR7a2V5fV1gLCBcImxldHRlclwiKTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRcdGl0ZW0uc2V0VGl0bGUodChcIlJlbW92ZSBQcmlvcml0eVwiKSk7XHJcblx0XHRcdFx0XHRpdGVtLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnJlbW92ZVByaW9yaXR5KFwibGV0dGVyXCIpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gU2hvdyB0aGUgNiBwcmlvcml0eSBsZXZlbHMgYmFzZWQgb24gdXNlciBwcmVmZXJlbmNlLCBleGNsdWRpbmcgJ25vbmUnXHJcblx0XHRcdFx0T2JqZWN0LmVudHJpZXMoVEFTS19QUklPUklUSUVTKS5mb3JFYWNoKChba2V5LCBwcmlvcml0eV0pID0+IHtcclxuXHRcdFx0XHRcdGlmIChrZXkgIT09IFwibm9uZVwiKSB7XHJcblx0XHRcdFx0XHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGRpc3BsYXlUZXh0ID0gdXNlRGF0YXZpZXdGb3JtYXRcclxuXHRcdFx0XHRcdFx0XHRcdD8gcHJpb3JpdHkudGV4dFxyXG5cdFx0XHRcdFx0XHRcdFx0OiBgJHtwcmlvcml0eS5lbW9qaX0gJHtwcmlvcml0eS50ZXh0fWA7XHJcblx0XHRcdFx0XHRcdFx0aXRlbS5zZXRUaXRsZShkaXNwbGF5VGV4dCk7XHJcblx0XHRcdFx0XHRcdFx0aXRlbS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdGlmICh1c2VEYXRhdmlld0Zvcm1hdCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnNldFByaW9yaXR5KFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGBbcHJpb3JpdHk6OiAke3ByaW9yaXR5LmRhdGF2aWV3VmFsdWV9XWAsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XCJkYXRhdmlld1wiXHJcblx0XHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnNldFByaW9yaXR5KHByaW9yaXR5LmVtb2ppLCBcInRhc2tzXCIpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gQWRkIFwiUmVtb3ZlIFByaW9yaXR5XCIgb3B0aW9uIGF0IHRoZSBib3R0b21cclxuXHRcdFx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRcdGl0ZW0uc2V0VGl0bGUodChcIlJlbW92ZSBQcmlvcml0eVwiKSk7XHJcblx0XHRcdFx0XHRpdGVtLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnJlbW92ZVByaW9yaXR5KFxyXG5cdFx0XHRcdFx0XHRcdHVzZURhdGF2aWV3Rm9ybWF0ID8gXCJkYXRhdmlld1wiIDogXCJ0YXNrc1wiXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0bWVudS5zaG93QXRNb3VzZUV2ZW50KGUpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIHNob3dpbmcgcHJpb3JpdHkgbWVudTpcIiwgZXJyb3IpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBzZXRQcmlvcml0eShwcmlvcml0eTogc3RyaW5nLCBtb2RlOiBQcmlvcml0eU1vZGUpIHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdC8vIFZhbGlkYXRlIHZpZXcgc3RhdGUgYmVmb3JlIG1ha2luZyBjaGFuZ2VzXHJcblx0XHRcdGlmICghdGhpcy52aWV3IHx8IHRoaXMudmlldy5zdGF0ZS5kb2MubGVuZ3RoIDwgdGhpcy50bykge1xyXG5cdFx0XHRcdGNvbnNvbGUud2FybihcIkludmFsaWQgdmlldyBzdGF0ZSwgc2tpcHBpbmcgcHJpb3JpdHkgdXBkYXRlXCIpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgbGluZSA9IHRoaXMudmlldy5zdGF0ZS5kb2MubGluZUF0KHRoaXMuZnJvbSk7XHJcblx0XHRcdGxldCBuZXdMaW5lID0gbGluZS50ZXh0O1xyXG5cclxuXHRcdFx0Ly8gUmVtb3ZlIGV4aXN0aW5nIHByaW9yaXR5IGZpcnN0XHJcblx0XHRcdG5ld0xpbmUgPSB0aGlzLnJlbW92ZUV4aXN0aW5nUHJpb3JpdHkobmV3TGluZSk7XHJcblxyXG5cdFx0XHQvLyBBZGQgbmV3IHByaW9yaXR5IGF0IHRoZSBlbmRcclxuXHRcdFx0bmV3TGluZSA9IG5ld0xpbmUudHJpbUVuZCgpICsgXCIgXCIgKyBwcmlvcml0eTtcclxuXHJcblx0XHRcdGNvbnN0IHRyYW5zYWN0aW9uID0gdGhpcy52aWV3LnN0YXRlLnVwZGF0ZSh7XHJcblx0XHRcdFx0Y2hhbmdlczogeyBmcm9tOiBsaW5lLmZyb20sIHRvOiBsaW5lLnRvLCBpbnNlcnQ6IG5ld0xpbmUgfSxcclxuXHRcdFx0XHRhbm5vdGF0aW9uczogW3ByaW9yaXR5Q2hhbmdlQW5ub3RhdGlvbi5vZih0cnVlKV0sXHJcblx0XHRcdH0pO1xyXG5cdFx0XHR0aGlzLnZpZXcuZGlzcGF0Y2godHJhbnNhY3Rpb24pO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIHNldHRpbmcgcHJpb3JpdHk6XCIsIGVycm9yKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVtb3ZlUHJpb3JpdHkobW9kZTogUHJpb3JpdHlNb2RlKSB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBWYWxpZGF0ZSB2aWV3IHN0YXRlIGJlZm9yZSBtYWtpbmcgY2hhbmdlc1xyXG5cdFx0XHRpZiAoIXRoaXMudmlldyB8fCB0aGlzLnZpZXcuc3RhdGUuZG9jLmxlbmd0aCA8IHRoaXMudG8pIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXCJJbnZhbGlkIHZpZXcgc3RhdGUsIHNraXBwaW5nIHByaW9yaXR5IHJlbW92YWxcIik7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBsaW5lID0gdGhpcy52aWV3LnN0YXRlLmRvYy5saW5lQXQodGhpcy5mcm9tKTtcclxuXHRcdFx0Y29uc3QgbmV3TGluZSA9IHRoaXMucmVtb3ZlRXhpc3RpbmdQcmlvcml0eShsaW5lLnRleHQpLnRyaW1FbmQoKTtcclxuXHJcblx0XHRcdGNvbnN0IHRyYW5zYWN0aW9uID0gdGhpcy52aWV3LnN0YXRlLnVwZGF0ZSh7XHJcblx0XHRcdFx0Y2hhbmdlczogeyBmcm9tOiBsaW5lLmZyb20sIHRvOiBsaW5lLnRvLCBpbnNlcnQ6IG5ld0xpbmUgfSxcclxuXHRcdFx0XHRhbm5vdGF0aW9uczogW3ByaW9yaXR5Q2hhbmdlQW5ub3RhdGlvbi5vZih0cnVlKV0sXHJcblx0XHRcdH0pO1xyXG5cdFx0XHR0aGlzLnZpZXcuZGlzcGF0Y2godHJhbnNhY3Rpb24pO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIHJlbW92aW5nIHByaW9yaXR5OlwiLCBlcnJvcik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbW92ZUV4aXN0aW5nUHJpb3JpdHkobGluZVRleHQ6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHRsZXQgbmV3TGluZSA9IGxpbmVUZXh0O1xyXG5cclxuXHRcdC8vIFJlbW92ZSBkYXRhdmlldyBwcmlvcml0eVxyXG5cdFx0bmV3TGluZSA9IG5ld0xpbmUucmVwbGFjZSgvXFxbcHJpb3JpdHk6OlxccypcXHcrXFxdL2ksIFwiXCIpO1xyXG5cclxuXHRcdC8vIFJlbW92ZSBlbW9qaSBwcmlvcml0aWVzXHJcblx0XHRuZXdMaW5lID0gbmV3TGluZS5yZXBsYWNlKC8o8J+Uunzij6t88J+UvHzwn5S9fOKPrO+4jykvZywgXCJcIik7XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIGxldHRlciBwcmlvcml0aWVzXHJcblx0XHRuZXdMaW5lID0gbmV3TGluZS5yZXBsYWNlKC9cXFsjKFtBQkNdKVxcXS9nLCBcIlwiKTtcclxuXHJcblx0XHQvLyBDbGVhbiB1cCBleHRyYSBzcGFjZXNcclxuXHRcdG5ld0xpbmUgPSBuZXdMaW5lLnJlcGxhY2UoL1xccysvZywgXCIgXCIpO1xyXG5cclxuXHRcdHJldHVybiBuZXdMaW5lO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHByaW9yaXR5UGlja2VyRXh0ZW5zaW9uKFxyXG5cdGFwcDogQXBwLFxyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luXHJcbikge1xyXG5cdC8vIERvbid0IGVuYWJsZSBpZiB0aGUgc2V0dGluZyBpcyBvZmZcclxuXHRpZiAoIXBsdWdpbi5zZXR0aW5ncy5lbmFibGVQcmlvcml0eVBpY2tlcikge1xyXG5cdFx0cmV0dXJuIFtdO1xyXG5cdH1cclxuXHJcblx0Y2xhc3MgUHJpb3JpdHlWaWV3UGx1Z2luVmFsdWUgaW1wbGVtZW50cyBQbHVnaW5WYWx1ZSB7XHJcblx0XHRwdWJsaWMgcmVhZG9ubHkgdmlldzogRWRpdG9yVmlldztcclxuXHRcdHB1YmxpYyByZWFkb25seSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbjtcclxuXHRcdGRlY29yYXRpb25zOiBEZWNvcmF0aW9uU2V0ID0gRGVjb3JhdGlvbi5ub25lO1xyXG5cdFx0cHJpdmF0ZSBsYXN0VXBkYXRlOiBudW1iZXIgPSAwO1xyXG5cdFx0cHJpdmF0ZSByZWFkb25seSB1cGRhdGVUaHJlc2hvbGQ6IG51bWJlciA9IDUwO1xyXG5cdFx0cHVibGljIGlzRGVzdHJveWVkOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG5cdFx0Ly8gRW1vamkgcHJpb3JpdGllcyBtYXRjaGVyXHJcblx0XHRwcml2YXRlIHJlYWRvbmx5IGVtb2ppTWF0Y2ggPSBuZXcgTWF0Y2hEZWNvcmF0b3Ioe1xyXG5cdFx0XHRyZWdleHA6IG5ldyBSZWdFeHAoYCgke2Vtb2ppUHJpb3JpdHlSZWdleH0pYCwgXCJnXCIpLFxyXG5cdFx0XHRkZWNvcmF0ZTogKFxyXG5cdFx0XHRcdGFkZCxcclxuXHRcdFx0XHRmcm9tOiBudW1iZXIsXHJcblx0XHRcdFx0dG86IG51bWJlcixcclxuXHRcdFx0XHRtYXRjaDogUmVnRXhwRXhlY0FycmF5LFxyXG5cdFx0XHRcdHZpZXc6IEVkaXRvclZpZXdcclxuXHRcdFx0KSA9PiB7XHJcblx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdGlmICghdGhpcy5zaG91bGRSZW5kZXIodmlldywgZnJvbSwgdG8pKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRjb25zdCB1c2VEYXRhdmlld0Zvcm1hdCA9XHJcblx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnByZWZlck1ldGFkYXRhRm9ybWF0ID09PVxyXG5cdFx0XHRcdFx0XHRcImRhdGF2aWV3XCI7XHJcblx0XHRcdFx0XHRjb25zdCBsaW5lID0gdGhpcy52aWV3LnN0YXRlLmRvYy5saW5lQXQoZnJvbSk7XHJcblx0XHRcdFx0XHRjb25zdCBtb2RlID0gZGV0ZWN0UHJpb3JpdHlNb2RlKFxyXG5cdFx0XHRcdFx0XHRsaW5lLnRleHQsXHJcblx0XHRcdFx0XHRcdHVzZURhdGF2aWV3Rm9ybWF0XHJcblx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdGFkZChcclxuXHRcdFx0XHRcdFx0ZnJvbSxcclxuXHRcdFx0XHRcdFx0dG8sXHJcblx0XHRcdFx0XHRcdERlY29yYXRpb24ucmVwbGFjZSh7XHJcblx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBuZXcgUHJpb3JpdHlXaWRnZXQoXHJcblx0XHRcdFx0XHRcdFx0XHRhcHAsXHJcblx0XHRcdFx0XHRcdFx0XHRwbHVnaW4sXHJcblx0XHRcdFx0XHRcdFx0XHR2aWV3LFxyXG5cdFx0XHRcdFx0XHRcdFx0ZnJvbSxcclxuXHRcdFx0XHRcdFx0XHRcdHRvLFxyXG5cdFx0XHRcdFx0XHRcdFx0bWF0Y2hbMF0sXHJcblx0XHRcdFx0XHRcdFx0XHRtb2RlXHJcblx0XHRcdFx0XHRcdFx0KSxcclxuXHRcdFx0XHRcdFx0fSlcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUud2FybihcIkVycm9yIGRlY29yYXRpbmcgZW1vamkgcHJpb3JpdHk6XCIsIGVycm9yKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBMZXR0ZXIgcHJpb3JpdGllcyBtYXRjaGVyXHJcblx0XHRwcml2YXRlIHJlYWRvbmx5IGxldHRlck1hdGNoID0gbmV3IE1hdGNoRGVjb3JhdG9yKHtcclxuXHRcdFx0cmVnZXhwOiBuZXcgUmVnRXhwKGAoJHtsZXR0ZXJQcmlvcml0eVJlZ2V4fSlgLCBcImdcIiksXHJcblx0XHRcdGRlY29yYXRlOiAoXHJcblx0XHRcdFx0YWRkLFxyXG5cdFx0XHRcdGZyb206IG51bWJlcixcclxuXHRcdFx0XHR0bzogbnVtYmVyLFxyXG5cdFx0XHRcdG1hdGNoOiBSZWdFeHBFeGVjQXJyYXksXHJcblx0XHRcdFx0dmlldzogRWRpdG9yVmlld1xyXG5cdFx0XHQpID0+IHtcclxuXHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0aWYgKCF0aGlzLnNob3VsZFJlbmRlcih2aWV3LCBmcm9tLCB0bykpIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdGFkZChcclxuXHRcdFx0XHRcdFx0ZnJvbSxcclxuXHRcdFx0XHRcdFx0dG8sXHJcblx0XHRcdFx0XHRcdERlY29yYXRpb24ucmVwbGFjZSh7XHJcblx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBuZXcgUHJpb3JpdHlXaWRnZXQoXHJcblx0XHRcdFx0XHRcdFx0XHRhcHAsXHJcblx0XHRcdFx0XHRcdFx0XHRwbHVnaW4sXHJcblx0XHRcdFx0XHRcdFx0XHR2aWV3LFxyXG5cdFx0XHRcdFx0XHRcdFx0ZnJvbSxcclxuXHRcdFx0XHRcdFx0XHRcdHRvLFxyXG5cdFx0XHRcdFx0XHRcdFx0bWF0Y2hbMF0sXHJcblx0XHRcdFx0XHRcdFx0XHRcImxldHRlclwiXHJcblx0XHRcdFx0XHRcdFx0KSxcclxuXHRcdFx0XHRcdFx0fSlcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUud2FybihcIkVycm9yIGRlY29yYXRpbmcgbGV0dGVyIHByaW9yaXR5OlwiLCBlcnJvcik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gRGF0YXZpZXcgcHJpb3JpdGllcyBtYXRjaGVyXHJcblx0XHRwcml2YXRlIHJlYWRvbmx5IGRhdGF2aWV3TWF0Y2ggPSBuZXcgTWF0Y2hEZWNvcmF0b3Ioe1xyXG5cdFx0XHRyZWdleHA6IGRhdGF2aWV3UHJpb3JpdHlSZWdleCxcclxuXHRcdFx0ZGVjb3JhdGU6IChcclxuXHRcdFx0XHRhZGQsXHJcblx0XHRcdFx0ZnJvbTogbnVtYmVyLFxyXG5cdFx0XHRcdHRvOiBudW1iZXIsXHJcblx0XHRcdFx0bWF0Y2g6IFJlZ0V4cEV4ZWNBcnJheSxcclxuXHRcdFx0XHR2aWV3OiBFZGl0b3JWaWV3XHJcblx0XHRcdCkgPT4ge1xyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRpZiAoIXRoaXMuc2hvdWxkUmVuZGVyKHZpZXcsIGZyb20sIHRvKSkge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRhZGQoXHJcblx0XHRcdFx0XHRcdGZyb20sXHJcblx0XHRcdFx0XHRcdHRvLFxyXG5cdFx0XHRcdFx0XHREZWNvcmF0aW9uLnJlcGxhY2Uoe1xyXG5cdFx0XHRcdFx0XHRcdHdpZGdldDogbmV3IFByaW9yaXR5V2lkZ2V0KFxyXG5cdFx0XHRcdFx0XHRcdFx0YXBwLFxyXG5cdFx0XHRcdFx0XHRcdFx0cGx1Z2luLFxyXG5cdFx0XHRcdFx0XHRcdFx0dmlldyxcclxuXHRcdFx0XHRcdFx0XHRcdGZyb20sXHJcblx0XHRcdFx0XHRcdFx0XHR0byxcclxuXHRcdFx0XHRcdFx0XHRcdG1hdGNoWzBdLFxyXG5cdFx0XHRcdFx0XHRcdFx0XCJkYXRhdmlld1wiXHJcblx0XHRcdFx0XHRcdFx0KSxcclxuXHRcdFx0XHRcdFx0fSlcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUud2FybihcIkVycm9yIGRlY29yYXRpbmcgZGF0YXZpZXcgcHJpb3JpdHk6XCIsIGVycm9yKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdHJ1Y3Rvcih2aWV3OiBFZGl0b3JWaWV3KSB7XHJcblx0XHRcdHRoaXMudmlldyA9IHZpZXc7XHJcblx0XHRcdHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG5cdFx0XHR0aGlzLnVwZGF0ZURlY29yYXRpb25zKHZpZXcpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHVwZGF0ZSh1cGRhdGU6IFZpZXdVcGRhdGUpOiB2b2lkIHtcclxuXHRcdFx0aWYgKHRoaXMuaXNEZXN0cm95ZWQpIHJldHVybjtcclxuXHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0dXBkYXRlLmRvY0NoYW5nZWQgfHxcclxuXHRcdFx0XHRcdHVwZGF0ZS52aWV3cG9ydENoYW5nZWQgfHxcclxuXHRcdFx0XHRcdHVwZGF0ZS5zZWxlY3Rpb25TZXQgfHxcclxuXHRcdFx0XHRcdHVwZGF0ZS50cmFuc2FjdGlvbnMuc29tZSgodHIpID0+XHJcblx0XHRcdFx0XHRcdHRyLmFubm90YXRpb24ocHJpb3JpdHlDaGFuZ2VBbm5vdGF0aW9uKVxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0Ly8gVGhyb3R0bGUgdXBkYXRlcyB0byBhdm9pZCBwZXJmb3JtYW5jZSBpc3N1ZXMgd2l0aCBsYXJnZSBkb2N1bWVudHNcclxuXHRcdFx0XHRcdGNvbnN0IG5vdyA9IERhdGUubm93KCk7XHJcblx0XHRcdFx0XHRpZiAobm93IC0gdGhpcy5sYXN0VXBkYXRlID4gdGhpcy51cGRhdGVUaHJlc2hvbGQpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5sYXN0VXBkYXRlID0gbm93O1xyXG5cdFx0XHRcdFx0XHR0aGlzLnVwZGF0ZURlY29yYXRpb25zKHVwZGF0ZS52aWV3LCB1cGRhdGUpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0Ly8gU2NoZWR1bGUgYW4gdXBkYXRlIGluIHRoZSBuZWFyIGZ1dHVyZSB0byBlbnN1cmUgcmVuZGVyaW5nXHJcblx0XHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdGlmICh0aGlzLnZpZXcgJiYgIXRoaXMuaXNEZXN0cm95ZWQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMudXBkYXRlRGVjb3JhdGlvbnModGhpcy52aWV3KTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH0sIHRoaXMudXBkYXRlVGhyZXNob2xkKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIGluIHByaW9yaXR5IHBpY2tlciB1cGRhdGU6XCIsIGVycm9yKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGRlc3Ryb3koKTogdm9pZCB7XHJcblx0XHRcdHRoaXMuaXNEZXN0cm95ZWQgPSB0cnVlO1xyXG5cdFx0XHR0aGlzLmRlY29yYXRpb25zID0gRGVjb3JhdGlvbi5ub25lO1xyXG5cdFx0fVxyXG5cclxuXHRcdHVwZGF0ZURlY29yYXRpb25zKHZpZXc6IEVkaXRvclZpZXcsIHVwZGF0ZT86IFZpZXdVcGRhdGUpIHtcclxuXHRcdFx0aWYgKHRoaXMuaXNEZXN0cm95ZWQpIHJldHVybjtcclxuXHJcblx0XHRcdC8vIE9ubHkgYXBwbHkgaW4gbGl2ZSBwcmV2aWV3IG1vZGVcclxuXHRcdFx0aWYgKCF0aGlzLmlzTGl2ZVByZXZpZXcodmlldy5zdGF0ZSkpIHtcclxuXHRcdFx0XHR0aGlzLmRlY29yYXRpb25zID0gRGVjb3JhdGlvbi5ub25lO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRjb25zdCB1c2VEYXRhdmlld0Zvcm1hdCA9XHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcmVmZXJNZXRhZGF0YUZvcm1hdCA9PT0gXCJkYXRhdmlld1wiO1xyXG5cclxuXHRcdFx0XHQvLyBVc2UgaW5jcmVtZW50YWwgdXBkYXRlIHdoZW4gcG9zc2libGUgZm9yIGJldHRlciBwZXJmb3JtYW5jZVxyXG5cdFx0XHRcdGlmICh1cGRhdGUgJiYgIXVwZGF0ZS5kb2NDaGFuZ2VkICYmIHRoaXMuZGVjb3JhdGlvbnMuc2l6ZSA+IDApIHtcclxuXHRcdFx0XHRcdC8vIFVwZGF0ZSBkZWNvcmF0aW9ucyBiYXNlZCBvbiB1c2VyIHByZWZlcmVuY2VcclxuXHRcdFx0XHRcdGlmICh1c2VEYXRhdmlld0Zvcm1hdCkge1xyXG5cdFx0XHRcdFx0XHQvLyBQcmlvcml0aXplIGRhdGF2aWV3IGRlY29yYXRpb25zXHJcblx0XHRcdFx0XHRcdGNvbnN0IGRhdGF2aWV3RGVjb3MgPSB0aGlzLmRhdGF2aWV3TWF0Y2gudXBkYXRlRGVjbyhcclxuXHRcdFx0XHRcdFx0XHR1cGRhdGUsXHJcblx0XHRcdFx0XHRcdFx0dGhpcy5kZWNvcmF0aW9uc1xyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRpZiAoZGF0YXZpZXdEZWNvcy5zaXplID4gMCkge1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMuZGVjb3JhdGlvbnMgPSBkYXRhdmlld0RlY29zO1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIFRyeSBlbW9qaSBkZWNvcmF0aW9uc1xyXG5cdFx0XHRcdFx0Y29uc3QgZW1vamlEZWNvcyA9IHRoaXMuZW1vamlNYXRjaC51cGRhdGVEZWNvKFxyXG5cdFx0XHRcdFx0XHR1cGRhdGUsXHJcblx0XHRcdFx0XHRcdHRoaXMuZGVjb3JhdGlvbnNcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRpZiAoZW1vamlEZWNvcy5zaXplID4gMCkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLmRlY29yYXRpb25zID0gZW1vamlEZWNvcztcclxuXHRcdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIFRyeSBsZXR0ZXIgZGVjb3JhdGlvbnNcclxuXHRcdFx0XHRcdGNvbnN0IGxldHRlckRlY29zID0gdGhpcy5sZXR0ZXJNYXRjaC51cGRhdGVEZWNvKFxyXG5cdFx0XHRcdFx0XHR1cGRhdGUsXHJcblx0XHRcdFx0XHRcdHRoaXMuZGVjb3JhdGlvbnNcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRpZiAobGV0dGVyRGVjb3Muc2l6ZSA+IDApIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5kZWNvcmF0aW9ucyA9IGxldHRlckRlY29zO1xyXG5cdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gVHJ5IGRhdGF2aWV3IGRlY29yYXRpb25zIGlmIG5vdCBwcmVmZXJyZWRcclxuXHRcdFx0XHRcdGlmICghdXNlRGF0YXZpZXdGb3JtYXQpIHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgZGF0YXZpZXdEZWNvcyA9IHRoaXMuZGF0YXZpZXdNYXRjaC51cGRhdGVEZWNvKFxyXG5cdFx0XHRcdFx0XHRcdHVwZGF0ZSxcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmRlY29yYXRpb25zXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdHRoaXMuZGVjb3JhdGlvbnMgPSBkYXRhdmlld0RlY29zO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHQvLyBDcmVhdGUgbmV3IGRlY29yYXRpb25zIGZyb20gc2NyYXRjaFxyXG5cdFx0XHRcdFx0bGV0IGRlY29yYXRpb25zID0gRGVjb3JhdGlvbi5ub25lO1xyXG5cclxuXHRcdFx0XHRcdGlmICh1c2VEYXRhdmlld0Zvcm1hdCkge1xyXG5cdFx0XHRcdFx0XHQvLyBQcmlvcml0aXplIGRhdGF2aWV3IGZvcm1hdFxyXG5cdFx0XHRcdFx0XHRkZWNvcmF0aW9ucyA9IHRoaXMuZGF0YXZpZXdNYXRjaC5jcmVhdGVEZWNvKHZpZXcpO1xyXG5cdFx0XHRcdFx0XHRpZiAoZGVjb3JhdGlvbnMuc2l6ZSA9PT0gMCkge1xyXG5cdFx0XHRcdFx0XHRcdC8vIEZhbGxiYWNrIHRvIGVtb2ppIGZvcm1hdFxyXG5cdFx0XHRcdFx0XHRcdGRlY29yYXRpb25zID0gdGhpcy5lbW9qaU1hdGNoLmNyZWF0ZURlY28odmlldyk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdC8vIFByaW9yaXRpemUgZW1vamkgZm9ybWF0XHJcblx0XHRcdFx0XHRcdGRlY29yYXRpb25zID0gdGhpcy5lbW9qaU1hdGNoLmNyZWF0ZURlY28odmlldyk7XHJcblx0XHRcdFx0XHRcdGlmIChkZWNvcmF0aW9ucy5zaXplID09PSAwKSB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gRmFsbGJhY2sgdG8gZGF0YXZpZXcgZm9ybWF0XHJcblx0XHRcdFx0XHRcdFx0ZGVjb3JhdGlvbnMgPSB0aGlzLmRhdGF2aWV3TWF0Y2guY3JlYXRlRGVjbyh2aWV3KTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIEFsd2F5cyBjaGVjayBmb3IgbGV0dGVyIGZvcm1hdCBhcyBpdCdzIGluZGVwZW5kZW50XHJcblx0XHRcdFx0XHRjb25zdCBsZXR0ZXJEZWNvcyA9IHRoaXMubGV0dGVyTWF0Y2guY3JlYXRlRGVjbyh2aWV3KTtcclxuXHRcdFx0XHRcdGlmIChsZXR0ZXJEZWNvcy5zaXplID4gMCkge1xyXG5cdFx0XHRcdFx0XHQvLyBNZXJnZSBsZXR0ZXIgZGVjb3JhdGlvbnMgd2l0aCBleGlzdGluZyBkZWNvcmF0aW9uc1xyXG5cdFx0XHRcdFx0XHRjb25zdCByYW5nZXM6IHtcclxuXHRcdFx0XHRcdFx0XHRmcm9tOiBudW1iZXI7XHJcblx0XHRcdFx0XHRcdFx0dG86IG51bWJlcjtcclxuXHRcdFx0XHRcdFx0XHR2YWx1ZTogRGVjb3JhdGlvbjtcclxuXHRcdFx0XHRcdFx0fVtdID0gW107XHJcblx0XHRcdFx0XHRcdGNvbnN0IGl0ZXIgPSBsZXR0ZXJEZWNvcy5pdGVyKCk7XHJcblx0XHRcdFx0XHRcdHdoaWxlIChpdGVyLnZhbHVlICE9PSBudWxsKSB7XHJcblx0XHRcdFx0XHRcdFx0cmFuZ2VzLnB1c2goe1xyXG5cdFx0XHRcdFx0XHRcdFx0ZnJvbTogaXRlci5mcm9tLFxyXG5cdFx0XHRcdFx0XHRcdFx0dG86IGl0ZXIudG8sXHJcblx0XHRcdFx0XHRcdFx0XHR2YWx1ZTogaXRlci52YWx1ZSxcclxuXHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0XHRpdGVyLm5leHQoKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0aWYgKHJhbmdlcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0XHRcdFx0ZGVjb3JhdGlvbnMgPSBkZWNvcmF0aW9ucy51cGRhdGUoe1xyXG5cdFx0XHRcdFx0XHRcdFx0YWRkOiByYW5nZXMsXHJcblx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHR0aGlzLmRlY29yYXRpb25zID0gZGVjb3JhdGlvbnM7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0XCJFcnJvciB1cGRhdGluZyBwcmlvcml0eSBkZWNvcmF0aW9ucywgY2xlYXJpbmcgZGVjb3JhdGlvbnNcIixcclxuXHRcdFx0XHRcdGVcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdC8vIENsZWFyIGRlY29yYXRpb25zIG9uIGVycm9yIHRvIHByZXZlbnQgY3Jhc2hlc1xyXG5cdFx0XHRcdHRoaXMuZGVjb3JhdGlvbnMgPSBEZWNvcmF0aW9uLm5vbmU7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRpc0xpdmVQcmV2aWV3KHN0YXRlOiBFZGl0b3JWaWV3W1wic3RhdGVcIl0pOiBib29sZWFuIHtcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRyZXR1cm4gc3RhdGUuZmllbGQoZWRpdG9yTGl2ZVByZXZpZXdGaWVsZCk7XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Y29uc29sZS53YXJuKFwiRXJyb3IgY2hlY2tpbmcgbGl2ZSBwcmV2aWV3IHN0YXRlOlwiLCBlcnJvcik7XHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0c2hvdWxkUmVuZGVyKFxyXG5cdFx0XHR2aWV3OiBFZGl0b3JWaWV3LFxyXG5cdFx0XHRkZWNvcmF0aW9uRnJvbTogbnVtYmVyLFxyXG5cdFx0XHRkZWNvcmF0aW9uVG86IG51bWJlclxyXG5cdFx0KSB7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Ly8gVmFsaWRhdGUgcG9zaXRpb25zXHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0ZGVjb3JhdGlvbkZyb20gPCAwIHx8XHJcblx0XHRcdFx0XHRkZWNvcmF0aW9uVG8gPiB2aWV3LnN0YXRlLmRvYy5sZW5ndGggfHxcclxuXHRcdFx0XHRcdGRlY29yYXRpb25Gcm9tID49IGRlY29yYXRpb25Ub1xyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Y29uc3Qgc3ludGF4Tm9kZSA9IHN5bnRheFRyZWUodmlldy5zdGF0ZSkucmVzb2x2ZUlubmVyKFxyXG5cdFx0XHRcdFx0ZGVjb3JhdGlvbkZyb20gKyAxXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRjb25zdCBub2RlUHJvcHMgPSBzeW50YXhOb2RlLnR5cGUucHJvcCh0b2tlbkNsYXNzTm9kZVByb3ApO1xyXG5cclxuXHRcdFx0XHRpZiAobm9kZVByb3BzKSB7XHJcblx0XHRcdFx0XHRjb25zdCBwcm9wcyA9IG5vZGVQcm9wcy5zcGxpdChcIiBcIik7XHJcblx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdHByb3BzLmluY2x1ZGVzKFwiaG1kLWNvZGVibG9ja1wiKSB8fFxyXG5cdFx0XHRcdFx0XHRwcm9wcy5pbmNsdWRlcyhcImhtZC1mcm9udG1hdHRlclwiKVxyXG5cdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGNvbnN0IHNlbGVjdGlvbiA9IHZpZXcuc3RhdGUuc2VsZWN0aW9uO1xyXG5cclxuXHRcdFx0XHRjb25zdCBvdmVybGFwID0gc2VsZWN0aW9uLnJhbmdlcy5zb21lKChyKSA9PiB7XHJcblx0XHRcdFx0XHRyZXR1cm4gIShyLnRvIDw9IGRlY29yYXRpb25Gcm9tIHx8IHIuZnJvbSA+PSBkZWNvcmF0aW9uVG8pO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4gIW92ZXJsYXAgJiYgdGhpcy5pc0xpdmVQcmV2aWV3KHZpZXcuc3RhdGUpO1xyXG5cdFx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdFx0Ly8gSWYgYW4gZXJyb3Igb2NjdXJzLCBkZWZhdWx0IHRvIG5vdCByZW5kZXJpbmcgdG8gYXZvaWQgYnJlYWtpbmcgdGhlIGVkaXRvclxyXG5cdFx0XHRcdGNvbnNvbGUud2FybihcIkVycm9yIGNoZWNraW5nIGlmIHByaW9yaXR5IHNob3VsZCByZW5kZXJcIiwgZSk7XHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRjb25zdCBQcmlvcml0eVZpZXdQbHVnaW5TcGVjOiBQbHVnaW5TcGVjPFByaW9yaXR5Vmlld1BsdWdpblZhbHVlPiA9IHtcclxuXHRcdGRlY29yYXRpb25zOiAocGx1Z2luKSA9PiB7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0aWYgKHBsdWdpbi5pc0Rlc3Ryb3llZCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIERlY29yYXRpb24ubm9uZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHJldHVybiBwbHVnaW4uZGVjb3JhdGlvbnMudXBkYXRlKHtcclxuXHRcdFx0XHRcdGZpbHRlcjogKFxyXG5cdFx0XHRcdFx0XHRyYW5nZUZyb206IG51bWJlcixcclxuXHRcdFx0XHRcdFx0cmFuZ2VUbzogbnVtYmVyLFxyXG5cdFx0XHRcdFx0XHRkZWNvOiBEZWNvcmF0aW9uXHJcblx0XHRcdFx0XHQpID0+IHtcclxuXHRcdFx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCB3aWRnZXQgPSBkZWNvLnNwZWM/LndpZGdldDtcclxuXHRcdFx0XHRcdFx0XHRpZiAoKHdpZGdldCBhcyBhbnkpLmVycm9yKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyBWYWxpZGF0ZSByYW5nZVxyXG5cdFx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHRcdHJhbmdlRnJvbSA8IDAgfHxcclxuXHRcdFx0XHRcdFx0XHRcdHJhbmdlVG8gPiBwbHVnaW4udmlldy5zdGF0ZS5kb2MubGVuZ3RoIHx8XHJcblx0XHRcdFx0XHRcdFx0XHRyYW5nZUZyb20gPj0gcmFuZ2VUb1xyXG5cdFx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0Y29uc3Qgc2VsZWN0aW9uID0gcGx1Z2luLnZpZXcuc3RhdGUuc2VsZWN0aW9uO1xyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyBSZW1vdmUgZGVjb3JhdGlvbnMgd2hlbiBjdXJzb3IgaXMgaW5zaWRlIHRoZW1cclxuXHRcdFx0XHRcdFx0XHRmb3IgKGNvbnN0IHJhbmdlIG9mIHNlbGVjdGlvbi5yYW5nZXMpIHtcclxuXHRcdFx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHRcdFx0IShcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRyYW5nZS50byA8PSByYW5nZUZyb20gfHxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRyYW5nZS5mcm9tID49IHJhbmdlVG9cclxuXHRcdFx0XHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHRcdFx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0XHRcdFx0XCJFcnJvciBmaWx0ZXJpbmcgcHJpb3JpdHkgZGVjb3JhdGlvblwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0ZVxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlOyAvLyBSZW1vdmUgZGVjb3JhdGlvbiBvbiBlcnJvclxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkZhaWxlZCB0byB1cGRhdGUgZGVjb3JhdGlvbnMgZmlsdGVyXCIsIGUpO1xyXG5cdFx0XHRcdHJldHVybiBwbHVnaW4uZGVjb3JhdGlvbnM7IC8vIFJldHVybiBjdXJyZW50IGRlY29yYXRpb25zIHRvIGF2b2lkIGJyZWFraW5nIHRoZSBlZGl0b3JcclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHR9O1xyXG5cclxuXHQvLyBDcmVhdGUgdGhlIHBsdWdpbiB3aXRoIG91ciBpbXBsZW1lbnRhdGlvblxyXG5cdGNvbnN0IHBsdWdpbkluc3RhbmNlID0gVmlld1BsdWdpbi5mcm9tQ2xhc3MoXHJcblx0XHRQcmlvcml0eVZpZXdQbHVnaW5WYWx1ZSxcclxuXHRcdFByaW9yaXR5Vmlld1BsdWdpblNwZWNcclxuXHQpO1xyXG5cclxuXHRyZXR1cm4gcGx1Z2luSW5zdGFuY2U7XHJcbn1cclxuIl19