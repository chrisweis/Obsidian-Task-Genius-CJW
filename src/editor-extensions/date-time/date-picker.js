import { ViewPlugin, Decoration, WidgetType, MatchDecorator, } from "@codemirror/view";
import { editorLivePreviewField, Platform, } from "obsidian";
import { Annotation } from "@codemirror/state";
// @ts-ignore - This import is necessary but TypeScript can't find it
import { syntaxTree, tokenClassNodeProp } from "@codemirror/language";
import { DatePickerPopover } from "@/components/ui/date-picker/DatePickerPopover";
import { DatePickerModal } from "@/components/ui/date-picker/DatePickerModal";
export const dateChangeAnnotation = Annotation.define();
class DatePickerWidget extends WidgetType {
    constructor(app, plugin, view, from, to, currentDate, dateMark) {
        super();
        this.app = app;
        this.plugin = plugin;
        this.view = view;
        this.from = from;
        this.to = to;
        this.currentDate = currentDate;
        this.dateMark = dateMark;
    }
    eq(other) {
        return (this.from === other.from &&
            this.to === other.to &&
            this.currentDate === other.currentDate);
    }
    toDOM() {
        try {
            const wrapper = createEl("span", {
                cls: "date-picker-widget",
                attr: {
                    "aria-label": "Task Date",
                },
            });
            const dateText = createSpan({
                cls: "task-date-text",
                text: this.currentDate,
            });
            // Handle click to show date menu
            dateText.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showDateMenu(e);
            });
            wrapper.appendChild(dateText);
            return wrapper;
        }
        catch (error) {
            console.error("Error creating date picker widget DOM:", error);
            // Return a fallback element to prevent crashes
            const fallback = createEl("span", {
                cls: "date-picker-widget-error",
                text: this.currentDate,
            });
            return fallback;
        }
    }
    showDateMenu(e) {
        try {
            // Extract current date from the widget text
            const currentDateMatch = this.currentDate.match(/\d{4}-\d{2}-\d{2}/);
            const currentDate = currentDateMatch ? currentDateMatch[0] : null;
            if (Platform.isDesktop) {
                // Desktop environment - show Popover
                const popover = new DatePickerPopover(this.app, this.plugin, currentDate || undefined, this.dateMark);
                popover.onDateSelected = (date) => {
                    if (date) {
                        this.setDate(date);
                    }
                    else {
                        // Clear date
                        this.setDate("");
                    }
                };
                popover.showAtPosition({
                    x: e.clientX,
                    y: e.clientY,
                });
            }
            else {
                // Mobile environment - show Modal
                const modal = new DatePickerModal(this.app, this.plugin, currentDate || undefined, this.dateMark);
                modal.onDateSelected = (date) => {
                    if (date) {
                        this.setDate(date);
                    }
                    else {
                        // Clear date
                        this.setDate("");
                    }
                };
                modal.open();
            }
        }
        catch (error) {
            console.error("Error showing date menu:", error);
        }
    }
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    // Resolve the current range of this widget's date in the live document
    resolveCurrentRange() {
        var _a;
        try {
            const state = (_a = this.view) === null || _a === void 0 ? void 0 : _a.state;
            if (!state)
                return null;
            const line = state.doc.lineAt(this.from);
            const text = line.text;
            const useDataviewFormat = this.plugin.settings.preferMetadataFormat === "dataview";
            if (useDataviewFormat) {
                // Match [field:: YYYY-MM-DD] on this line only
                const regex = /\[[^\]]+::\s*\d{4}-\d{2}-\d{2}\]/g;
                let m;
                while ((m = regex.exec(text)) !== null) {
                    const absFrom = line.from + m.index;
                    const absTo = absFrom + m[0].length;
                    // Prefer the one starting with the same prefix as dateMark
                    if (m[0].startsWith(this.dateMark) ||
                        (this.from >= absFrom && this.from <= absTo)) {
                        return { from: absFrom, to: absTo };
                    }
                }
            }
            else {
                // Match the specific emoji marker followed by date
                const pattern = new RegExp(`${this.escapeRegex(this.dateMark)}\\s*\\d{4}-\\d{2}-\\d{2}`, "g");
                let m;
                while ((m = pattern.exec(text)) !== null) {
                    const absFrom = line.from + m.index;
                    const absTo = absFrom + m[0].length;
                    if (this.from >= absFrom && this.from <= absTo) {
                        return { from: absFrom, to: absTo };
                    }
                }
            }
            return null;
        }
        catch (e) {
            console.warn("Failed to resolve current date range:", e);
            return null;
        }
    }
    setDate(date) {
        try {
            // Validate the view
            if (!this.view) {
                console.warn("Invalid view state, skipping date update");
                return;
            }
            // Re-resolve the current range in case the document changed since widget creation
            const range = this.resolveCurrentRange();
            if (!range) {
                console.warn("Could not locate current date range; skipping update");
                return;
            }
            // Extra safety: ensure single-line range
            const fromLine = this.view.state.doc.lineAt(range.from);
            const toLine = this.view.state.doc.lineAt(range.to);
            if (fromLine.number !== toLine.number) {
                console.warn("Refusing to replace multi-line range for date");
                return;
            }
            const useDataviewFormat = this.plugin.settings.preferMetadataFormat === "dataview";
            let newText = "";
            if (date) {
                if (useDataviewFormat) {
                    // For dataview format: reconstruct [xxx:: date] pattern
                    newText = `${this.dateMark}${date}]`;
                }
                else {
                    // For tasks format: emoji + space + date
                    newText = `${this.dateMark} ${date}`;
                }
            }
            const transaction = this.view.state.update({
                changes: { from: range.from, to: range.to, insert: newText },
                annotations: [dateChangeAnnotation.of(true)],
            });
            this.view.dispatch(transaction);
        }
        catch (error) {
            console.error("Error setting date:", error);
        }
    }
}
export function datePickerExtension(app, plugin) {
    // Don't enable if the setting is off
    if (!plugin.settings.enableDatePicker) {
        return [];
    }
    class DatePickerViewPluginValue {
        constructor(view) {
            this.decorations = Decoration.none;
            this.lastUpdate = 0;
            this.updateThreshold = 50; // Increased threshold for better stability
            this.isDestroyed = false;
            // Date matcher
            this.dateMatch = new MatchDecorator({
                regexp: this.createDateRegex(plugin.settings.preferMetadataFormat),
                decorate: (add, from, to, match, view) => {
                    try {
                        if (!this.shouldRender(view, from, to)) {
                            return;
                        }
                        const useDataviewFormat = this.plugin.settings.preferMetadataFormat ===
                            "dataview";
                        let fullMatch;
                        let dateMark;
                        if (useDataviewFormat) {
                            // For dataview format: match[0] is full match, match[1] is [xxx::, match[2] is date
                            fullMatch = match[0]; // e.g., "[start:: 2024-01-01]"
                            dateMark = match[1]; // e.g., "[start:: "
                        }
                        else {
                            // For tasks format: match[0] is full match, match[1] is emoji, match[2] is date
                            fullMatch = match[0]; // e.g., "📅 2024-01-01"
                            dateMark = match[1]; // e.g., "📅"
                        }
                        add(from, to, Decoration.replace({
                            widget: new DatePickerWidget(app, plugin, view, from, to, fullMatch, dateMark),
                        }));
                    }
                    catch (error) {
                        console.warn("Error decorating date:", error);
                    }
                },
            });
            this.view = view;
            this.plugin = plugin;
            this.updateDecorations(view);
        }
        /**
         * Create date regex based on preferMetadataFormat setting
         */
        createDateRegex(preferMetadataFormat) {
            const useDataviewFormat = preferMetadataFormat === "dataview";
            if (useDataviewFormat) {
                // For dataview format: match [xxx:: yyyy-mm-dd] pattern on a single line (no line breaks)
                return new RegExp(`(\\[[^\\]\\\n]+::\\s*)(\\d{4}-\\d{2}-\\d{2})\\]`, "g");
            }
            else {
                // For tasks format: match emoji + date pattern
                // Using Unicode property escapes to match all emojis
                return new RegExp(`([\\p{Emoji}\\p{Emoji_Modifier}\\p{Emoji_Component}\\p{Emoji_Modifier_Base}\\p{Emoji_Presentation}])\\s*(\\d{4}-\\d{2}-\\d{2})`, "gu");
            }
        }
        update(update) {
            if (this.isDestroyed)
                return;
            try {
                // More aggressive updates to handle content changes
                if (update.docChanged ||
                    update.viewportChanged ||
                    update.selectionSet ||
                    update.transactions.some((tr) => tr.annotation(dateChangeAnnotation))) {
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
                console.error("Error in date picker update:", error);
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
                // Check if we can incrementally update, otherwise do a full recreation
                if (update && !update.docChanged && this.decorations.size > 0) {
                    this.decorations = this.dateMatch.updateDeco(update, this.decorations);
                }
                else {
                    this.decorations = this.dateMatch.createDeco(view);
                }
            }
            catch (e) {
                console.warn("Error updating date decorations, clearing decorations", e);
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
            // Skip checking in code blocks or frontmatter
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
                // Avoid rendering over selected text
                const overlap = selection.ranges.some((r) => {
                    return !(r.to <= decorationFrom || r.from >= decorationTo);
                });
                return !overlap && this.isLivePreview(view.state);
            }
            catch (e) {
                // If error in checking, default to not rendering to avoid breaking the editor
                console.warn("Error checking if date should render", e);
                return false;
            }
        }
    }
    const DatePickerViewPluginSpec = {
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
                        catch (error) {
                            console.warn("Error filtering date decoration:", error);
                            return false;
                        }
                    },
                });
            }
            catch (e) {
                // If error in filtering, return current decorations to avoid breaking the editor
                console.warn("Error filtering date decorations", e);
                return plugin.decorations;
            }
        },
    };
    // Create the plugin with our implementation
    const pluginInstance = ViewPlugin.fromClass(DatePickerViewPluginValue, DatePickerViewPluginSpec);
    return pluginInstance;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0ZS1waWNrZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkYXRlLXBpY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBRU4sVUFBVSxFQUVWLFVBQVUsRUFFVixVQUFVLEVBQ1YsY0FBYyxHQUdkLE1BQU0sa0JBQWtCLENBQUM7QUFDMUIsT0FBTyxFQUVOLHNCQUFzQixFQUl0QixRQUFRLEdBQ1IsTUFBTSxVQUFVLENBQUM7QUFFbEIsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQy9DLHFFQUFxRTtBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFFdEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDbEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzlFLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUV4RCxNQUFNLGdCQUFpQixTQUFRLFVBQVU7SUFDeEMsWUFDVSxHQUFRLEVBQ1IsTUFBNkIsRUFDN0IsSUFBZ0IsRUFDaEIsSUFBWSxFQUNaLEVBQVUsRUFDVixXQUFtQixFQUNuQixRQUFnQjtRQUV6QixLQUFLLEVBQUUsQ0FBQztRQVJDLFFBQUcsR0FBSCxHQUFHLENBQUs7UUFDUixXQUFNLEdBQU4sTUFBTSxDQUF1QjtRQUM3QixTQUFJLEdBQUosSUFBSSxDQUFZO1FBQ2hCLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixPQUFFLEdBQUYsRUFBRSxDQUFRO1FBQ1YsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFDbkIsYUFBUSxHQUFSLFFBQVEsQ0FBUTtJQUcxQixDQUFDO0lBRUQsRUFBRSxDQUFDLEtBQXVCO1FBQ3pCLE9BQU8sQ0FDTixJQUFJLENBQUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxJQUFJO1lBQ3hCLElBQUksQ0FBQyxFQUFFLEtBQUssS0FBSyxDQUFDLEVBQUU7WUFDcEIsSUFBSSxDQUFDLFdBQVcsS0FBSyxLQUFLLENBQUMsV0FBVyxDQUN0QyxDQUFDO0lBQ0gsQ0FBQztJQUVELEtBQUs7UUFDSixJQUFJO1lBQ0gsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRTtnQkFDaEMsR0FBRyxFQUFFLG9CQUFvQjtnQkFDekIsSUFBSSxFQUFFO29CQUNMLFlBQVksRUFBRSxXQUFXO2lCQUN6QjthQUNELENBQUMsQ0FBQztZQUVILE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQztnQkFDM0IsR0FBRyxFQUFFLGdCQUFnQjtnQkFDckIsSUFBSSxFQUFFLElBQUksQ0FBQyxXQUFXO2FBQ3RCLENBQUMsQ0FBQztZQUVILGlDQUFpQztZQUNqQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3hDLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDbkIsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUNwQixJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3RCLENBQUMsQ0FBQyxDQUFDO1lBRUgsT0FBTyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUM5QixPQUFPLE9BQU8sQ0FBQztTQUNmO1FBQUMsT0FBTyxLQUFLLEVBQUU7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLHdDQUF3QyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQy9ELCtDQUErQztZQUMvQyxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFO2dCQUNqQyxHQUFHLEVBQUUsMEJBQTBCO2dCQUMvQixJQUFJLEVBQUUsSUFBSSxDQUFDLFdBQVc7YUFDdEIsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxRQUFRLENBQUM7U0FDaEI7SUFDRixDQUFDO0lBRU8sWUFBWSxDQUFDLENBQWE7UUFDakMsSUFBSTtZQUNILDRDQUE0QztZQUM1QyxNQUFNLGdCQUFnQixHQUNyQixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1lBQzdDLE1BQU0sV0FBVyxHQUFHLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBRWxFLElBQUksUUFBUSxDQUFDLFNBQVMsRUFBRTtnQkFDdkIscUNBQXFDO2dCQUNyQyxNQUFNLE9BQU8sR0FBRyxJQUFJLGlCQUFpQixDQUNwQyxJQUFJLENBQUMsR0FBRyxFQUNSLElBQUksQ0FBQyxNQUFNLEVBQ1gsV0FBVyxJQUFJLFNBQVMsRUFDeEIsSUFBSSxDQUFDLFFBQVEsQ0FDYixDQUFDO2dCQUVGLE9BQU8sQ0FBQyxjQUFjLEdBQUcsQ0FBQyxJQUFtQixFQUFFLEVBQUU7b0JBQ2hELElBQUksSUFBSSxFQUFFO3dCQUNULElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7cUJBQ25CO3lCQUFNO3dCQUNOLGFBQWE7d0JBQ2IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztxQkFDakI7Z0JBQ0YsQ0FBQyxDQUFDO2dCQUVGLE9BQU8sQ0FBQyxjQUFjLENBQUM7b0JBQ3RCLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTztvQkFDWixDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU87aUJBQ1osQ0FBQyxDQUFDO2FBQ0g7aUJBQU07Z0JBQ04sa0NBQWtDO2dCQUNsQyxNQUFNLEtBQUssR0FBRyxJQUFJLGVBQWUsQ0FDaEMsSUFBSSxDQUFDLEdBQUcsRUFDUixJQUFJLENBQUMsTUFBTSxFQUNYLFdBQVcsSUFBSSxTQUFTLEVBQ3hCLElBQUksQ0FBQyxRQUFRLENBQ2IsQ0FBQztnQkFFRixLQUFLLENBQUMsY0FBYyxHQUFHLENBQUMsSUFBbUIsRUFBRSxFQUFFO29CQUM5QyxJQUFJLElBQUksRUFBRTt3QkFDVCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO3FCQUNuQjt5QkFBTTt3QkFDTixhQUFhO3dCQUNiLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7cUJBQ2pCO2dCQUNGLENBQUMsQ0FBQztnQkFFRixLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7YUFDYjtTQUNEO1FBQUMsT0FBTyxLQUFLLEVBQUU7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLDBCQUEwQixFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQ2pEO0lBQ0YsQ0FBQztJQUVPLFdBQVcsQ0FBQyxHQUFXO1FBQzlCLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBRUQsdUVBQXVFO0lBQy9ELG1CQUFtQjs7UUFDMUIsSUFBSTtZQUNILE1BQU0sS0FBSyxHQUFHLE1BQUEsSUFBSSxDQUFDLElBQUksMENBQUUsS0FBSyxDQUFDO1lBQy9CLElBQUksQ0FBQyxLQUFLO2dCQUFFLE9BQU8sSUFBSSxDQUFDO1lBQ3hCLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN6QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQ3ZCLE1BQU0saUJBQWlCLEdBQ3RCLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLG9CQUFvQixLQUFLLFVBQVUsQ0FBQztZQUMxRCxJQUFJLGlCQUFpQixFQUFFO2dCQUN0QiwrQ0FBK0M7Z0JBQy9DLE1BQU0sS0FBSyxHQUFHLG1DQUFtQyxDQUFDO2dCQUNsRCxJQUFJLENBQXlCLENBQUM7Z0JBQzlCLE9BQU8sQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRTtvQkFDdkMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO29CQUNwQyxNQUFNLEtBQUssR0FBRyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztvQkFDcEMsMkRBQTJEO29CQUMzRCxJQUNDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQzt3QkFDOUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLEtBQUssQ0FBQyxFQUMzQzt3QkFDRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUM7cUJBQ3BDO2lCQUNEO2FBQ0Q7aUJBQU07Z0JBQ04sbURBQW1EO2dCQUNuRCxNQUFNLE9BQU8sR0FBRyxJQUFJLE1BQU0sQ0FDekIsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUNsQixJQUFJLENBQUMsUUFBUSxDQUNiLDBCQUEwQixFQUMzQixHQUFHLENBQ0gsQ0FBQztnQkFDRixJQUFJLENBQXlCLENBQUM7Z0JBQzlCLE9BQU8sQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRTtvQkFDekMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO29CQUNwQyxNQUFNLEtBQUssR0FBRyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztvQkFDcEMsSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLEtBQUssRUFBRTt3QkFDL0MsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDO3FCQUNwQztpQkFDRDthQUNEO1lBQ0QsT0FBTyxJQUFJLENBQUM7U0FDWjtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1gsT0FBTyxDQUFDLElBQUksQ0FBQyx1Q0FBdUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN6RCxPQUFPLElBQUksQ0FBQztTQUNaO0lBQ0YsQ0FBQztJQUVPLE9BQU8sQ0FBQyxJQUFZO1FBQzNCLElBQUk7WUFDSCxvQkFBb0I7WUFDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7Z0JBQ2YsT0FBTyxDQUFDLElBQUksQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDO2dCQUN6RCxPQUFPO2FBQ1A7WUFFRCxrRkFBa0Y7WUFDbEYsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDekMsSUFBSSxDQUFDLEtBQUssRUFBRTtnQkFDWCxPQUFPLENBQUMsSUFBSSxDQUNYLHNEQUFzRCxDQUN0RCxDQUFDO2dCQUNGLE9BQU87YUFDUDtZQUNELHlDQUF5QztZQUN6QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN4RCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNwRCxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUFDLE1BQU0sRUFBRTtnQkFDdEMsT0FBTyxDQUFDLElBQUksQ0FBQywrQ0FBK0MsQ0FBQyxDQUFDO2dCQUM5RCxPQUFPO2FBQ1A7WUFFRCxNQUFNLGlCQUFpQixHQUN0QixJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsS0FBSyxVQUFVLENBQUM7WUFDMUQsSUFBSSxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBRWpCLElBQUksSUFBSSxFQUFFO2dCQUNULElBQUksaUJBQWlCLEVBQUU7b0JBQ3RCLHdEQUF3RDtvQkFDeEQsT0FBTyxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLEdBQUcsQ0FBQztpQkFDckM7cUJBQU07b0JBQ04seUNBQXlDO29CQUN6QyxPQUFPLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksRUFBRSxDQUFDO2lCQUNyQzthQUNEO1lBRUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO2dCQUMxQyxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFO2dCQUM1RCxXQUFXLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDNUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7U0FDaEM7UUFBQyxPQUFPLEtBQUssRUFBRTtZQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMscUJBQXFCLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDNUM7SUFDRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLFVBQVUsbUJBQW1CLENBQUMsR0FBUSxFQUFFLE1BQTZCO0lBQzFFLHFDQUFxQztJQUNyQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRTtRQUN0QyxPQUFPLEVBQUUsQ0FBQztLQUNWO0lBRUQsTUFBTSx5QkFBeUI7UUE0RDlCLFlBQVksSUFBZ0I7WUF6RDVCLGdCQUFXLEdBQWtCLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFDckMsZUFBVSxHQUFXLENBQUMsQ0FBQztZQUNkLG9CQUFlLEdBQVcsRUFBRSxDQUFDLENBQUMsMkNBQTJDO1lBQ25GLGdCQUFXLEdBQVksS0FBSyxDQUFDO1lBRXBDLGVBQWU7WUFDRSxjQUFTLEdBQUcsSUFBSSxjQUFjLENBQUM7Z0JBQy9DLE1BQU0sRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsb0JBQW9CLENBQUM7Z0JBQ2xFLFFBQVEsRUFBRSxDQUNULEdBQUcsRUFDSCxJQUFZLEVBQ1osRUFBVSxFQUNWLEtBQXNCLEVBQ3RCLElBQWdCLEVBQ2YsRUFBRTtvQkFDSCxJQUFJO3dCQUNILElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLEVBQUU7NEJBQ3ZDLE9BQU87eUJBQ1A7d0JBRUQsTUFBTSxpQkFBaUIsR0FDdEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsb0JBQW9COzRCQUN6QyxVQUFVLENBQUM7d0JBQ1osSUFBSSxTQUFpQixDQUFDO3dCQUN0QixJQUFJLFFBQWdCLENBQUM7d0JBRXJCLElBQUksaUJBQWlCLEVBQUU7NEJBQ3RCLG9GQUFvRjs0QkFDcEYsU0FBUyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLCtCQUErQjs0QkFDckQsUUFBUSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLG9CQUFvQjt5QkFDekM7NkJBQU07NEJBQ04sZ0ZBQWdGOzRCQUNoRixTQUFTLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsd0JBQXdCOzRCQUM5QyxRQUFRLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYTt5QkFDbEM7d0JBRUQsR0FBRyxDQUNGLElBQUksRUFDSixFQUFFLEVBQ0YsVUFBVSxDQUFDLE9BQU8sQ0FBQzs0QkFDbEIsTUFBTSxFQUFFLElBQUksZ0JBQWdCLENBQzNCLEdBQUcsRUFDSCxNQUFNLEVBQ04sSUFBSSxFQUNKLElBQUksRUFDSixFQUFFLEVBQ0YsU0FBUyxFQUNULFFBQVEsQ0FDUjt5QkFDRCxDQUFDLENBQ0YsQ0FBQztxQkFDRjtvQkFBQyxPQUFPLEtBQUssRUFBRTt3QkFDZixPQUFPLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUFFLEtBQUssQ0FBQyxDQUFDO3FCQUM5QztnQkFDRixDQUFDO2FBQ0QsQ0FBQyxDQUFDO1lBR0YsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7WUFDakIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7WUFDckIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzlCLENBQUM7UUFFRDs7V0FFRztRQUNLLGVBQWUsQ0FBQyxvQkFBNEI7WUFDbkQsTUFBTSxpQkFBaUIsR0FBRyxvQkFBb0IsS0FBSyxVQUFVLENBQUM7WUFFOUQsSUFBSSxpQkFBaUIsRUFBRTtnQkFDdEIsMEZBQTBGO2dCQUMxRixPQUFPLElBQUksTUFBTSxDQUNoQixpREFBaUQsRUFDakQsR0FBRyxDQUNILENBQUM7YUFDRjtpQkFBTTtnQkFDTiwrQ0FBK0M7Z0JBQy9DLHFEQUFxRDtnQkFDckQsT0FBTyxJQUFJLE1BQU0sQ0FDaEIsZ0lBQWdJLEVBQ2hJLElBQUksQ0FDSixDQUFDO2FBQ0Y7UUFDRixDQUFDO1FBRUQsTUFBTSxDQUFDLE1BQWtCO1lBQ3hCLElBQUksSUFBSSxDQUFDLFdBQVc7Z0JBQUUsT0FBTztZQUU3QixJQUFJO2dCQUNILG9EQUFvRDtnQkFDcEQsSUFDQyxNQUFNLENBQUMsVUFBVTtvQkFDakIsTUFBTSxDQUFDLGVBQWU7b0JBQ3RCLE1BQU0sQ0FBQyxZQUFZO29CQUNuQixNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQy9CLEVBQUUsQ0FBQyxVQUFVLENBQUMsb0JBQW9CLENBQUMsQ0FDbkMsRUFDQTtvQkFDRCxvRUFBb0U7b0JBQ3BFLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztvQkFDdkIsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFO3dCQUNqRCxJQUFJLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQzt3QkFDdEIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7cUJBQzVDO3lCQUFNO3dCQUNOLDREQUE0RDt3QkFDNUQsVUFBVSxDQUFDLEdBQUcsRUFBRTs0QkFDZixJQUFJLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFO2dDQUNuQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDOzZCQUNsQzt3QkFDRixDQUFDLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO3FCQUN6QjtpQkFDRDthQUNEO1lBQUMsT0FBTyxLQUFLLEVBQUU7Z0JBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyw4QkFBOEIsRUFBRSxLQUFLLENBQUMsQ0FBQzthQUNyRDtRQUNGLENBQUM7UUFFRCxPQUFPO1lBQ04sSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7WUFDeEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDO1FBQ3BDLENBQUM7UUFFRCxpQkFBaUIsQ0FBQyxJQUFnQixFQUFFLE1BQW1CO1lBQ3RELElBQUksSUFBSSxDQUFDLFdBQVc7Z0JBQUUsT0FBTztZQUU3QixrQ0FBa0M7WUFDbEMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUNwQyxJQUFJLENBQUMsV0FBVyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUM7Z0JBQ25DLE9BQU87YUFDUDtZQUVELElBQUk7Z0JBQ0gsdUVBQXVFO2dCQUN2RSxJQUFJLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxFQUFFO29CQUM5RCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUMzQyxNQUFNLEVBQ04sSUFBSSxDQUFDLFdBQVcsQ0FDaEIsQ0FBQztpQkFDRjtxQkFBTTtvQkFDTixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUNuRDthQUNEO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ1gsT0FBTyxDQUFDLElBQUksQ0FDWCx1REFBdUQsRUFDdkQsQ0FBQyxDQUNELENBQUM7Z0JBQ0YsZ0RBQWdEO2dCQUNoRCxJQUFJLENBQUMsV0FBVyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUM7YUFDbkM7UUFDRixDQUFDO1FBRUQsYUFBYSxDQUFDLEtBQTBCO1lBQ3ZDLElBQUk7Z0JBQ0gsT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDLHNCQUFzQixDQUFDLENBQUM7YUFDM0M7WUFBQyxPQUFPLEtBQUssRUFBRTtnQkFDZixPQUFPLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUMxRCxPQUFPLEtBQUssQ0FBQzthQUNiO1FBQ0YsQ0FBQztRQUVELFlBQVksQ0FDWCxJQUFnQixFQUNoQixjQUFzQixFQUN0QixZQUFvQjtZQUVwQiw4Q0FBOEM7WUFDOUMsSUFBSTtnQkFDSCxxQkFBcUI7Z0JBQ3JCLElBQ0MsY0FBYyxHQUFHLENBQUM7b0JBQ2xCLFlBQVksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNO29CQUNwQyxjQUFjLElBQUksWUFBWSxFQUM3QjtvQkFDRCxPQUFPLEtBQUssQ0FBQztpQkFDYjtnQkFFRCxNQUFNLFVBQVUsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLFlBQVksQ0FDckQsY0FBYyxHQUFHLENBQUMsQ0FDbEIsQ0FBQztnQkFDRixNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO2dCQUUzRCxJQUFJLFNBQVMsRUFBRTtvQkFDZCxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNuQyxJQUNDLEtBQUssQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDO3dCQUMvQixLQUFLLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLEVBQ2hDO3dCQUNELE9BQU8sS0FBSyxDQUFDO3FCQUNiO2lCQUNEO2dCQUVELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDO2dCQUV2QyxxQ0FBcUM7Z0JBQ3JDLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7b0JBQzNDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksY0FBYyxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksWUFBWSxDQUFDLENBQUM7Z0JBQzVELENBQUMsQ0FBQyxDQUFDO2dCQUVILE9BQU8sQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDbEQ7WUFBQyxPQUFPLENBQUMsRUFBRTtnQkFDWCw4RUFBOEU7Z0JBQzlFLE9BQU8sQ0FBQyxJQUFJLENBQUMsc0NBQXNDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hELE9BQU8sS0FBSyxDQUFDO2FBQ2I7UUFDRixDQUFDO0tBQ0Q7SUFFRCxNQUFNLHdCQUF3QixHQUEwQztRQUN2RSxXQUFXLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUN2QixJQUFJO2dCQUNILElBQUksTUFBTSxDQUFDLFdBQVcsRUFBRTtvQkFDdkIsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDO2lCQUN2QjtnQkFFRCxPQUFPLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDO29CQUNoQyxNQUFNLEVBQUUsQ0FDUCxTQUFpQixFQUNqQixPQUFlLEVBQ2YsSUFBZ0IsRUFDZixFQUFFOzt3QkFDSCxJQUFJOzRCQUNILE1BQU0sTUFBTSxHQUFHLE1BQUEsSUFBSSxDQUFDLElBQUksMENBQUUsTUFBTSxDQUFDOzRCQUNqQyxJQUFLLE1BQWMsQ0FBQyxLQUFLLEVBQUU7Z0NBQzFCLE9BQU8sS0FBSyxDQUFDOzZCQUNiOzRCQUVELGlCQUFpQjs0QkFDakIsSUFDQyxTQUFTLEdBQUcsQ0FBQztnQ0FDYixPQUFPLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU07Z0NBQ3RDLFNBQVMsSUFBSSxPQUFPLEVBQ25CO2dDQUNELE9BQU8sS0FBSyxDQUFDOzZCQUNiOzRCQUVELE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQzs0QkFFOUMsZ0RBQWdEOzRCQUNoRCxLQUFLLE1BQU0sS0FBSyxJQUFJLFNBQVMsQ0FBQyxNQUFNLEVBQUU7Z0NBQ3JDLElBQ0MsQ0FBQyxDQUNBLEtBQUssQ0FBQyxFQUFFLElBQUksU0FBUztvQ0FDckIsS0FBSyxDQUFDLElBQUksSUFBSSxPQUFPLENBQ3JCLEVBQ0E7b0NBQ0QsT0FBTyxLQUFLLENBQUM7aUNBQ2I7NkJBQ0Q7NEJBRUQsT0FBTyxJQUFJLENBQUM7eUJBQ1o7d0JBQUMsT0FBTyxLQUFLLEVBQUU7NEJBQ2YsT0FBTyxDQUFDLElBQUksQ0FDWCxrQ0FBa0MsRUFDbEMsS0FBSyxDQUNMLENBQUM7NEJBQ0YsT0FBTyxLQUFLLENBQUM7eUJBQ2I7b0JBQ0YsQ0FBQztpQkFDRCxDQUFDLENBQUM7YUFDSDtZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNYLGlGQUFpRjtnQkFDakYsT0FBTyxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDcEQsT0FBTyxNQUFNLENBQUMsV0FBVyxDQUFDO2FBQzFCO1FBQ0YsQ0FBQztLQUNELENBQUM7SUFFRiw0Q0FBNEM7SUFDNUMsTUFBTSxjQUFjLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FDMUMseUJBQXlCLEVBQ3pCLHdCQUF3QixDQUN4QixDQUFDO0lBRUYsT0FBTyxjQUFjLENBQUM7QUFDdkIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XHJcblx0RWRpdG9yVmlldyxcclxuXHRWaWV3UGx1Z2luLFxyXG5cdFZpZXdVcGRhdGUsXHJcblx0RGVjb3JhdGlvbixcclxuXHREZWNvcmF0aW9uU2V0LFxyXG5cdFdpZGdldFR5cGUsXHJcblx0TWF0Y2hEZWNvcmF0b3IsXHJcblx0UGx1Z2luVmFsdWUsXHJcblx0UGx1Z2luU3BlYyxcclxufSBmcm9tIFwiQGNvZGVtaXJyb3Ivdmlld1wiO1xyXG5pbXBvcnQge1xyXG5cdEFwcCxcclxuXHRlZGl0b3JMaXZlUHJldmlld0ZpZWxkLFxyXG5cdE1lbnUsXHJcblx0TWVudUl0ZW0sXHJcblx0bW9tZW50LFxyXG5cdFBsYXRmb3JtLFxyXG59IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCIuLi8uLi9pbmRleFwiO1xyXG5pbXBvcnQgeyBBbm5vdGF0aW9uIH0gZnJvbSBcIkBjb2RlbWlycm9yL3N0YXRlXCI7XHJcbi8vIEB0cy1pZ25vcmUgLSBUaGlzIGltcG9ydCBpcyBuZWNlc3NhcnkgYnV0IFR5cGVTY3JpcHQgY2FuJ3QgZmluZCBpdFxyXG5pbXBvcnQgeyBzeW50YXhUcmVlLCB0b2tlbkNsYXNzTm9kZVByb3AgfSBmcm9tIFwiQGNvZGVtaXJyb3IvbGFuZ3VhZ2VcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCIuLi8uLi90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCB7IERhdGVQaWNrZXJQb3BvdmVyIH0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9kYXRlLXBpY2tlci9EYXRlUGlja2VyUG9wb3ZlclwiO1xyXG5pbXBvcnQgeyBEYXRlUGlja2VyTW9kYWwgfSBmcm9tIFwiQC9jb21wb25lbnRzL3VpL2RhdGUtcGlja2VyL0RhdGVQaWNrZXJNb2RhbFwiO1xyXG5leHBvcnQgY29uc3QgZGF0ZUNoYW5nZUFubm90YXRpb24gPSBBbm5vdGF0aW9uLmRlZmluZSgpO1xyXG5cclxuY2xhc3MgRGF0ZVBpY2tlcldpZGdldCBleHRlbmRzIFdpZGdldFR5cGUge1xyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cmVhZG9ubHkgYXBwOiBBcHAsXHJcblx0XHRyZWFkb25seSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdHJlYWRvbmx5IHZpZXc6IEVkaXRvclZpZXcsXHJcblx0XHRyZWFkb25seSBmcm9tOiBudW1iZXIsXHJcblx0XHRyZWFkb25seSB0bzogbnVtYmVyLFxyXG5cdFx0cmVhZG9ubHkgY3VycmVudERhdGU6IHN0cmluZyxcclxuXHRcdHJlYWRvbmx5IGRhdGVNYXJrOiBzdHJpbmdcclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0fVxyXG5cclxuXHRlcShvdGhlcjogRGF0ZVBpY2tlcldpZGdldCk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIChcclxuXHRcdFx0dGhpcy5mcm9tID09PSBvdGhlci5mcm9tICYmXHJcblx0XHRcdHRoaXMudG8gPT09IG90aGVyLnRvICYmXHJcblx0XHRcdHRoaXMuY3VycmVudERhdGUgPT09IG90aGVyLmN1cnJlbnREYXRlXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0dG9ET00oKTogSFRNTEVsZW1lbnQge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3Qgd3JhcHBlciA9IGNyZWF0ZUVsKFwic3BhblwiLCB7XHJcblx0XHRcdFx0Y2xzOiBcImRhdGUtcGlja2VyLXdpZGdldFwiLFxyXG5cdFx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHRcdFwiYXJpYS1sYWJlbFwiOiBcIlRhc2sgRGF0ZVwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgZGF0ZVRleHQgPSBjcmVhdGVTcGFuKHtcclxuXHRcdFx0XHRjbHM6IFwidGFzay1kYXRlLXRleHRcIixcclxuXHRcdFx0XHR0ZXh0OiB0aGlzLmN1cnJlbnREYXRlLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIEhhbmRsZSBjbGljayB0byBzaG93IGRhdGUgbWVudVxyXG5cdFx0XHRkYXRlVGV4dC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGUpID0+IHtcclxuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHRcdFx0XHR0aGlzLnNob3dEYXRlTWVudShlKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHR3cmFwcGVyLmFwcGVuZENoaWxkKGRhdGVUZXh0KTtcclxuXHRcdFx0cmV0dXJuIHdyYXBwZXI7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRXJyb3IgY3JlYXRpbmcgZGF0ZSBwaWNrZXIgd2lkZ2V0IERPTTpcIiwgZXJyb3IpO1xyXG5cdFx0XHQvLyBSZXR1cm4gYSBmYWxsYmFjayBlbGVtZW50IHRvIHByZXZlbnQgY3Jhc2hlc1xyXG5cdFx0XHRjb25zdCBmYWxsYmFjayA9IGNyZWF0ZUVsKFwic3BhblwiLCB7XHJcblx0XHRcdFx0Y2xzOiBcImRhdGUtcGlja2VyLXdpZGdldC1lcnJvclwiLFxyXG5cdFx0XHRcdHRleHQ6IHRoaXMuY3VycmVudERhdGUsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRyZXR1cm4gZmFsbGJhY2s7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHNob3dEYXRlTWVudShlOiBNb3VzZUV2ZW50KSB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBFeHRyYWN0IGN1cnJlbnQgZGF0ZSBmcm9tIHRoZSB3aWRnZXQgdGV4dFxyXG5cdFx0XHRjb25zdCBjdXJyZW50RGF0ZU1hdGNoID1cclxuXHRcdFx0XHR0aGlzLmN1cnJlbnREYXRlLm1hdGNoKC9cXGR7NH0tXFxkezJ9LVxcZHsyfS8pO1xyXG5cdFx0XHRjb25zdCBjdXJyZW50RGF0ZSA9IGN1cnJlbnREYXRlTWF0Y2ggPyBjdXJyZW50RGF0ZU1hdGNoWzBdIDogbnVsbDtcclxuXHJcblx0XHRcdGlmIChQbGF0Zm9ybS5pc0Rlc2t0b3ApIHtcclxuXHRcdFx0XHQvLyBEZXNrdG9wIGVudmlyb25tZW50IC0gc2hvdyBQb3BvdmVyXHJcblx0XHRcdFx0Y29uc3QgcG9wb3ZlciA9IG5ldyBEYXRlUGlja2VyUG9wb3ZlcihcclxuXHRcdFx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdFx0XHRjdXJyZW50RGF0ZSB8fCB1bmRlZmluZWQsXHJcblx0XHRcdFx0XHR0aGlzLmRhdGVNYXJrXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0cG9wb3Zlci5vbkRhdGVTZWxlY3RlZCA9IChkYXRlOiBzdHJpbmcgfCBudWxsKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAoZGF0ZSkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnNldERhdGUoZGF0ZSk7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHQvLyBDbGVhciBkYXRlXHJcblx0XHRcdFx0XHRcdHRoaXMuc2V0RGF0ZShcIlwiKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRwb3BvdmVyLnNob3dBdFBvc2l0aW9uKHtcclxuXHRcdFx0XHRcdHg6IGUuY2xpZW50WCxcclxuXHRcdFx0XHRcdHk6IGUuY2xpZW50WSxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBNb2JpbGUgZW52aXJvbm1lbnQgLSBzaG93IE1vZGFsXHJcblx0XHRcdFx0Y29uc3QgbW9kYWwgPSBuZXcgRGF0ZVBpY2tlck1vZGFsKFxyXG5cdFx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0XHRcdGN1cnJlbnREYXRlIHx8IHVuZGVmaW5lZCxcclxuXHRcdFx0XHRcdHRoaXMuZGF0ZU1hcmtcclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRtb2RhbC5vbkRhdGVTZWxlY3RlZCA9IChkYXRlOiBzdHJpbmcgfCBudWxsKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAoZGF0ZSkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnNldERhdGUoZGF0ZSk7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHQvLyBDbGVhciBkYXRlXHJcblx0XHRcdFx0XHRcdHRoaXMuc2V0RGF0ZShcIlwiKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRtb2RhbC5vcGVuKCk7XHJcblx0XHRcdH1cclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFcnJvciBzaG93aW5nIGRhdGUgbWVudTpcIiwgZXJyb3IpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBlc2NhcGVSZWdleChzdHI6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHRyZXR1cm4gc3RyLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLCBcIlxcXFwkJlwiKTtcclxuXHR9XHJcblxyXG5cdC8vIFJlc29sdmUgdGhlIGN1cnJlbnQgcmFuZ2Ugb2YgdGhpcyB3aWRnZXQncyBkYXRlIGluIHRoZSBsaXZlIGRvY3VtZW50XHJcblx0cHJpdmF0ZSByZXNvbHZlQ3VycmVudFJhbmdlKCk6IHsgZnJvbTogbnVtYmVyOyB0bzogbnVtYmVyIH0gfCBudWxsIHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IHN0YXRlID0gdGhpcy52aWV3Py5zdGF0ZTtcclxuXHRcdFx0aWYgKCFzdGF0ZSkgcmV0dXJuIG51bGw7XHJcblx0XHRcdGNvbnN0IGxpbmUgPSBzdGF0ZS5kb2MubGluZUF0KHRoaXMuZnJvbSk7XHJcblx0XHRcdGNvbnN0IHRleHQgPSBsaW5lLnRleHQ7XHJcblx0XHRcdGNvbnN0IHVzZURhdGF2aWV3Rm9ybWF0ID1cclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcmVmZXJNZXRhZGF0YUZvcm1hdCA9PT0gXCJkYXRhdmlld1wiO1xyXG5cdFx0XHRpZiAodXNlRGF0YXZpZXdGb3JtYXQpIHtcclxuXHRcdFx0XHQvLyBNYXRjaCBbZmllbGQ6OiBZWVlZLU1NLUREXSBvbiB0aGlzIGxpbmUgb25seVxyXG5cdFx0XHRcdGNvbnN0IHJlZ2V4ID0gL1xcW1teXFxdXSs6OlxccypcXGR7NH0tXFxkezJ9LVxcZHsyfVxcXS9nO1xyXG5cdFx0XHRcdGxldCBtOiBSZWdFeHBFeGVjQXJyYXkgfCBudWxsO1xyXG5cdFx0XHRcdHdoaWxlICgobSA9IHJlZ2V4LmV4ZWModGV4dCkpICE9PSBudWxsKSB7XHJcblx0XHRcdFx0XHRjb25zdCBhYnNGcm9tID0gbGluZS5mcm9tICsgbS5pbmRleDtcclxuXHRcdFx0XHRcdGNvbnN0IGFic1RvID0gYWJzRnJvbSArIG1bMF0ubGVuZ3RoO1xyXG5cdFx0XHRcdFx0Ly8gUHJlZmVyIHRoZSBvbmUgc3RhcnRpbmcgd2l0aCB0aGUgc2FtZSBwcmVmaXggYXMgZGF0ZU1hcmtcclxuXHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0bVswXS5zdGFydHNXaXRoKHRoaXMuZGF0ZU1hcmspIHx8XHJcblx0XHRcdFx0XHRcdCh0aGlzLmZyb20gPj0gYWJzRnJvbSAmJiB0aGlzLmZyb20gPD0gYWJzVG8pXHJcblx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIHsgZnJvbTogYWJzRnJvbSwgdG86IGFic1RvIH07XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIE1hdGNoIHRoZSBzcGVjaWZpYyBlbW9qaSBtYXJrZXIgZm9sbG93ZWQgYnkgZGF0ZVxyXG5cdFx0XHRcdGNvbnN0IHBhdHRlcm4gPSBuZXcgUmVnRXhwKFxyXG5cdFx0XHRcdFx0YCR7dGhpcy5lc2NhcGVSZWdleChcclxuXHRcdFx0XHRcdFx0dGhpcy5kYXRlTWFya1xyXG5cdFx0XHRcdFx0KX1cXFxccypcXFxcZHs0fS1cXFxcZHsyfS1cXFxcZHsyfWAsXHJcblx0XHRcdFx0XHRcImdcIlxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0bGV0IG06IFJlZ0V4cEV4ZWNBcnJheSB8IG51bGw7XHJcblx0XHRcdFx0d2hpbGUgKChtID0gcGF0dGVybi5leGVjKHRleHQpKSAhPT0gbnVsbCkge1xyXG5cdFx0XHRcdFx0Y29uc3QgYWJzRnJvbSA9IGxpbmUuZnJvbSArIG0uaW5kZXg7XHJcblx0XHRcdFx0XHRjb25zdCBhYnNUbyA9IGFic0Zyb20gKyBtWzBdLmxlbmd0aDtcclxuXHRcdFx0XHRcdGlmICh0aGlzLmZyb20gPj0gYWJzRnJvbSAmJiB0aGlzLmZyb20gPD0gYWJzVG8pIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIHsgZnJvbTogYWJzRnJvbSwgdG86IGFic1RvIH07XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXCJGYWlsZWQgdG8gcmVzb2x2ZSBjdXJyZW50IGRhdGUgcmFuZ2U6XCIsIGUpO1xyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc2V0RGF0ZShkYXRlOiBzdHJpbmcpIHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdC8vIFZhbGlkYXRlIHRoZSB2aWV3XHJcblx0XHRcdGlmICghdGhpcy52aWV3KSB7XHJcblx0XHRcdFx0Y29uc29sZS53YXJuKFwiSW52YWxpZCB2aWV3IHN0YXRlLCBza2lwcGluZyBkYXRlIHVwZGF0ZVwiKTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFJlLXJlc29sdmUgdGhlIGN1cnJlbnQgcmFuZ2UgaW4gY2FzZSB0aGUgZG9jdW1lbnQgY2hhbmdlZCBzaW5jZSB3aWRnZXQgY3JlYXRpb25cclxuXHRcdFx0Y29uc3QgcmFuZ2UgPSB0aGlzLnJlc29sdmVDdXJyZW50UmFuZ2UoKTtcclxuXHRcdFx0aWYgKCFyYW5nZSkge1xyXG5cdFx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcdFwiQ291bGQgbm90IGxvY2F0ZSBjdXJyZW50IGRhdGUgcmFuZ2U7IHNraXBwaW5nIHVwZGF0ZVwiXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gRXh0cmEgc2FmZXR5OiBlbnN1cmUgc2luZ2xlLWxpbmUgcmFuZ2VcclxuXHRcdFx0Y29uc3QgZnJvbUxpbmUgPSB0aGlzLnZpZXcuc3RhdGUuZG9jLmxpbmVBdChyYW5nZS5mcm9tKTtcclxuXHRcdFx0Y29uc3QgdG9MaW5lID0gdGhpcy52aWV3LnN0YXRlLmRvYy5saW5lQXQocmFuZ2UudG8pO1xyXG5cdFx0XHRpZiAoZnJvbUxpbmUubnVtYmVyICE9PSB0b0xpbmUubnVtYmVyKSB7XHJcblx0XHRcdFx0Y29uc29sZS53YXJuKFwiUmVmdXNpbmcgdG8gcmVwbGFjZSBtdWx0aS1saW5lIHJhbmdlIGZvciBkYXRlXCIpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgdXNlRGF0YXZpZXdGb3JtYXQgPVxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnByZWZlck1ldGFkYXRhRm9ybWF0ID09PSBcImRhdGF2aWV3XCI7XHJcblx0XHRcdGxldCBuZXdUZXh0ID0gXCJcIjtcclxuXHJcblx0XHRcdGlmIChkYXRlKSB7XHJcblx0XHRcdFx0aWYgKHVzZURhdGF2aWV3Rm9ybWF0KSB7XHJcblx0XHRcdFx0XHQvLyBGb3IgZGF0YXZpZXcgZm9ybWF0OiByZWNvbnN0cnVjdCBbeHh4OjogZGF0ZV0gcGF0dGVyblxyXG5cdFx0XHRcdFx0bmV3VGV4dCA9IGAke3RoaXMuZGF0ZU1hcmt9JHtkYXRlfV1gO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHQvLyBGb3IgdGFza3MgZm9ybWF0OiBlbW9qaSArIHNwYWNlICsgZGF0ZVxyXG5cdFx0XHRcdFx0bmV3VGV4dCA9IGAke3RoaXMuZGF0ZU1hcmt9ICR7ZGF0ZX1gO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgdHJhbnNhY3Rpb24gPSB0aGlzLnZpZXcuc3RhdGUudXBkYXRlKHtcclxuXHRcdFx0XHRjaGFuZ2VzOiB7IGZyb206IHJhbmdlLmZyb20sIHRvOiByYW5nZS50bywgaW5zZXJ0OiBuZXdUZXh0IH0sXHJcblx0XHRcdFx0YW5ub3RhdGlvbnM6IFtkYXRlQ2hhbmdlQW5ub3RhdGlvbi5vZih0cnVlKV0sXHJcblx0XHRcdH0pO1xyXG5cdFx0XHR0aGlzLnZpZXcuZGlzcGF0Y2godHJhbnNhY3Rpb24pO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIHNldHRpbmcgZGF0ZTpcIiwgZXJyb3IpO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGRhdGVQaWNrZXJFeHRlbnNpb24oYXBwOiBBcHAsIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luKSB7XHJcblx0Ly8gRG9uJ3QgZW5hYmxlIGlmIHRoZSBzZXR0aW5nIGlzIG9mZlxyXG5cdGlmICghcGx1Z2luLnNldHRpbmdzLmVuYWJsZURhdGVQaWNrZXIpIHtcclxuXHRcdHJldHVybiBbXTtcclxuXHR9XHJcblxyXG5cdGNsYXNzIERhdGVQaWNrZXJWaWV3UGx1Z2luVmFsdWUgaW1wbGVtZW50cyBQbHVnaW5WYWx1ZSB7XHJcblx0XHRwdWJsaWMgcmVhZG9ubHkgdmlldzogRWRpdG9yVmlldztcclxuXHRcdHB1YmxpYyByZWFkb25seSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbjtcclxuXHRcdGRlY29yYXRpb25zOiBEZWNvcmF0aW9uU2V0ID0gRGVjb3JhdGlvbi5ub25lO1xyXG5cdFx0cHJpdmF0ZSBsYXN0VXBkYXRlOiBudW1iZXIgPSAwO1xyXG5cdFx0cHJpdmF0ZSByZWFkb25seSB1cGRhdGVUaHJlc2hvbGQ6IG51bWJlciA9IDUwOyAvLyBJbmNyZWFzZWQgdGhyZXNob2xkIGZvciBiZXR0ZXIgc3RhYmlsaXR5XHJcblx0XHRwdWJsaWMgaXNEZXN0cm95ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcblx0XHQvLyBEYXRlIG1hdGNoZXJcclxuXHRcdHByaXZhdGUgcmVhZG9ubHkgZGF0ZU1hdGNoID0gbmV3IE1hdGNoRGVjb3JhdG9yKHtcclxuXHRcdFx0cmVnZXhwOiB0aGlzLmNyZWF0ZURhdGVSZWdleChwbHVnaW4uc2V0dGluZ3MucHJlZmVyTWV0YWRhdGFGb3JtYXQpLFxyXG5cdFx0XHRkZWNvcmF0ZTogKFxyXG5cdFx0XHRcdGFkZCxcclxuXHRcdFx0XHRmcm9tOiBudW1iZXIsXHJcblx0XHRcdFx0dG86IG51bWJlcixcclxuXHRcdFx0XHRtYXRjaDogUmVnRXhwRXhlY0FycmF5LFxyXG5cdFx0XHRcdHZpZXc6IEVkaXRvclZpZXdcclxuXHRcdFx0KSA9PiB7XHJcblx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdGlmICghdGhpcy5zaG91bGRSZW5kZXIodmlldywgZnJvbSwgdG8pKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRjb25zdCB1c2VEYXRhdmlld0Zvcm1hdCA9XHJcblx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnByZWZlck1ldGFkYXRhRm9ybWF0ID09PVxyXG5cdFx0XHRcdFx0XHRcImRhdGF2aWV3XCI7XHJcblx0XHRcdFx0XHRsZXQgZnVsbE1hdGNoOiBzdHJpbmc7XHJcblx0XHRcdFx0XHRsZXQgZGF0ZU1hcms6IHN0cmluZztcclxuXHJcblx0XHRcdFx0XHRpZiAodXNlRGF0YXZpZXdGb3JtYXQpIHtcclxuXHRcdFx0XHRcdFx0Ly8gRm9yIGRhdGF2aWV3IGZvcm1hdDogbWF0Y2hbMF0gaXMgZnVsbCBtYXRjaCwgbWF0Y2hbMV0gaXMgW3h4eDo6LCBtYXRjaFsyXSBpcyBkYXRlXHJcblx0XHRcdFx0XHRcdGZ1bGxNYXRjaCA9IG1hdGNoWzBdOyAvLyBlLmcuLCBcIltzdGFydDo6IDIwMjQtMDEtMDFdXCJcclxuXHRcdFx0XHRcdFx0ZGF0ZU1hcmsgPSBtYXRjaFsxXTsgLy8gZS5nLiwgXCJbc3RhcnQ6OiBcIlxyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0Ly8gRm9yIHRhc2tzIGZvcm1hdDogbWF0Y2hbMF0gaXMgZnVsbCBtYXRjaCwgbWF0Y2hbMV0gaXMgZW1vamksIG1hdGNoWzJdIGlzIGRhdGVcclxuXHRcdFx0XHRcdFx0ZnVsbE1hdGNoID0gbWF0Y2hbMF07IC8vIGUuZy4sIFwi8J+ThSAyMDI0LTAxLTAxXCJcclxuXHRcdFx0XHRcdFx0ZGF0ZU1hcmsgPSBtYXRjaFsxXTsgLy8gZS5nLiwgXCLwn5OFXCJcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRhZGQoXHJcblx0XHRcdFx0XHRcdGZyb20sXHJcblx0XHRcdFx0XHRcdHRvLFxyXG5cdFx0XHRcdFx0XHREZWNvcmF0aW9uLnJlcGxhY2Uoe1xyXG5cdFx0XHRcdFx0XHRcdHdpZGdldDogbmV3IERhdGVQaWNrZXJXaWRnZXQoXHJcblx0XHRcdFx0XHRcdFx0XHRhcHAsXHJcblx0XHRcdFx0XHRcdFx0XHRwbHVnaW4sXHJcblx0XHRcdFx0XHRcdFx0XHR2aWV3LFxyXG5cdFx0XHRcdFx0XHRcdFx0ZnJvbSxcclxuXHRcdFx0XHRcdFx0XHRcdHRvLFxyXG5cdFx0XHRcdFx0XHRcdFx0ZnVsbE1hdGNoLFxyXG5cdFx0XHRcdFx0XHRcdFx0ZGF0ZU1hcmtcclxuXHRcdFx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdFx0Y29uc29sZS53YXJuKFwiRXJyb3IgZGVjb3JhdGluZyBkYXRlOlwiLCBlcnJvcik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3RydWN0b3IodmlldzogRWRpdG9yVmlldykge1xyXG5cdFx0XHR0aGlzLnZpZXcgPSB2aWV3O1xyXG5cdFx0XHR0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuXHRcdFx0dGhpcy51cGRhdGVEZWNvcmF0aW9ucyh2aWV3KTtcclxuXHRcdH1cclxuXHJcblx0XHQvKipcclxuXHRcdCAqIENyZWF0ZSBkYXRlIHJlZ2V4IGJhc2VkIG9uIHByZWZlck1ldGFkYXRhRm9ybWF0IHNldHRpbmdcclxuXHRcdCAqL1xyXG5cdFx0cHJpdmF0ZSBjcmVhdGVEYXRlUmVnZXgocHJlZmVyTWV0YWRhdGFGb3JtYXQ6IHN0cmluZyk6IFJlZ0V4cCB7XHJcblx0XHRcdGNvbnN0IHVzZURhdGF2aWV3Rm9ybWF0ID0gcHJlZmVyTWV0YWRhdGFGb3JtYXQgPT09IFwiZGF0YXZpZXdcIjtcclxuXHJcblx0XHRcdGlmICh1c2VEYXRhdmlld0Zvcm1hdCkge1xyXG5cdFx0XHRcdC8vIEZvciBkYXRhdmlldyBmb3JtYXQ6IG1hdGNoIFt4eHg6OiB5eXl5LW1tLWRkXSBwYXR0ZXJuIG9uIGEgc2luZ2xlIGxpbmUgKG5vIGxpbmUgYnJlYWtzKVxyXG5cdFx0XHRcdHJldHVybiBuZXcgUmVnRXhwKFxyXG5cdFx0XHRcdFx0YChcXFxcW1teXFxcXF1cXFxcXFxuXSs6OlxcXFxzKikoXFxcXGR7NH0tXFxcXGR7Mn0tXFxcXGR7Mn0pXFxcXF1gLFxyXG5cdFx0XHRcdFx0XCJnXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIEZvciB0YXNrcyBmb3JtYXQ6IG1hdGNoIGVtb2ppICsgZGF0ZSBwYXR0ZXJuXHJcblx0XHRcdFx0Ly8gVXNpbmcgVW5pY29kZSBwcm9wZXJ0eSBlc2NhcGVzIHRvIG1hdGNoIGFsbCBlbW9qaXNcclxuXHRcdFx0XHRyZXR1cm4gbmV3IFJlZ0V4cChcclxuXHRcdFx0XHRcdGAoW1xcXFxwe0Vtb2ppfVxcXFxwe0Vtb2ppX01vZGlmaWVyfVxcXFxwe0Vtb2ppX0NvbXBvbmVudH1cXFxccHtFbW9qaV9Nb2RpZmllcl9CYXNlfVxcXFxwe0Vtb2ppX1ByZXNlbnRhdGlvbn1dKVxcXFxzKihcXFxcZHs0fS1cXFxcZHsyfS1cXFxcZHsyfSlgLFxyXG5cdFx0XHRcdFx0XCJndVwiXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHVwZGF0ZSh1cGRhdGU6IFZpZXdVcGRhdGUpOiB2b2lkIHtcclxuXHRcdFx0aWYgKHRoaXMuaXNEZXN0cm95ZWQpIHJldHVybjtcclxuXHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Ly8gTW9yZSBhZ2dyZXNzaXZlIHVwZGF0ZXMgdG8gaGFuZGxlIGNvbnRlbnQgY2hhbmdlc1xyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdHVwZGF0ZS5kb2NDaGFuZ2VkIHx8XHJcblx0XHRcdFx0XHR1cGRhdGUudmlld3BvcnRDaGFuZ2VkIHx8XHJcblx0XHRcdFx0XHR1cGRhdGUuc2VsZWN0aW9uU2V0IHx8XHJcblx0XHRcdFx0XHR1cGRhdGUudHJhbnNhY3Rpb25zLnNvbWUoKHRyKSA9PlxyXG5cdFx0XHRcdFx0XHR0ci5hbm5vdGF0aW9uKGRhdGVDaGFuZ2VBbm5vdGF0aW9uKVxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0Ly8gVGhyb3R0bGUgdXBkYXRlcyB0byBhdm9pZCBwZXJmb3JtYW5jZSBpc3N1ZXMgd2l0aCBsYXJnZSBkb2N1bWVudHNcclxuXHRcdFx0XHRcdGNvbnN0IG5vdyA9IERhdGUubm93KCk7XHJcblx0XHRcdFx0XHRpZiAobm93IC0gdGhpcy5sYXN0VXBkYXRlID4gdGhpcy51cGRhdGVUaHJlc2hvbGQpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5sYXN0VXBkYXRlID0gbm93O1xyXG5cdFx0XHRcdFx0XHR0aGlzLnVwZGF0ZURlY29yYXRpb25zKHVwZGF0ZS52aWV3LCB1cGRhdGUpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0Ly8gU2NoZWR1bGUgYW4gdXBkYXRlIGluIHRoZSBuZWFyIGZ1dHVyZSB0byBlbnN1cmUgcmVuZGVyaW5nXHJcblx0XHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdGlmICh0aGlzLnZpZXcgJiYgIXRoaXMuaXNEZXN0cm95ZWQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMudXBkYXRlRGVjb3JhdGlvbnModGhpcy52aWV3KTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH0sIHRoaXMudXBkYXRlVGhyZXNob2xkKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIGluIGRhdGUgcGlja2VyIHVwZGF0ZTpcIiwgZXJyb3IpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0ZGVzdHJveSgpOiB2b2lkIHtcclxuXHRcdFx0dGhpcy5pc0Rlc3Ryb3llZCA9IHRydWU7XHJcblx0XHRcdHRoaXMuZGVjb3JhdGlvbnMgPSBEZWNvcmF0aW9uLm5vbmU7XHJcblx0XHR9XHJcblxyXG5cdFx0dXBkYXRlRGVjb3JhdGlvbnModmlldzogRWRpdG9yVmlldywgdXBkYXRlPzogVmlld1VwZGF0ZSkge1xyXG5cdFx0XHRpZiAodGhpcy5pc0Rlc3Ryb3llZCkgcmV0dXJuO1xyXG5cclxuXHRcdFx0Ly8gT25seSBhcHBseSBpbiBsaXZlIHByZXZpZXcgbW9kZVxyXG5cdFx0XHRpZiAoIXRoaXMuaXNMaXZlUHJldmlldyh2aWV3LnN0YXRlKSkge1xyXG5cdFx0XHRcdHRoaXMuZGVjb3JhdGlvbnMgPSBEZWNvcmF0aW9uLm5vbmU7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdC8vIENoZWNrIGlmIHdlIGNhbiBpbmNyZW1lbnRhbGx5IHVwZGF0ZSwgb3RoZXJ3aXNlIGRvIGEgZnVsbCByZWNyZWF0aW9uXHJcblx0XHRcdFx0aWYgKHVwZGF0ZSAmJiAhdXBkYXRlLmRvY0NoYW5nZWQgJiYgdGhpcy5kZWNvcmF0aW9ucy5zaXplID4gMCkge1xyXG5cdFx0XHRcdFx0dGhpcy5kZWNvcmF0aW9ucyA9IHRoaXMuZGF0ZU1hdGNoLnVwZGF0ZURlY28oXHJcblx0XHRcdFx0XHRcdHVwZGF0ZSxcclxuXHRcdFx0XHRcdFx0dGhpcy5kZWNvcmF0aW9uc1xyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0dGhpcy5kZWNvcmF0aW9ucyA9IHRoaXMuZGF0ZU1hdGNoLmNyZWF0ZURlY28odmlldyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0XCJFcnJvciB1cGRhdGluZyBkYXRlIGRlY29yYXRpb25zLCBjbGVhcmluZyBkZWNvcmF0aW9uc1wiLFxyXG5cdFx0XHRcdFx0ZVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0Ly8gQ2xlYXIgZGVjb3JhdGlvbnMgb24gZXJyb3IgdG8gcHJldmVudCBjcmFzaGVzXHJcblx0XHRcdFx0dGhpcy5kZWNvcmF0aW9ucyA9IERlY29yYXRpb24ubm9uZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGlzTGl2ZVByZXZpZXcoc3RhdGU6IEVkaXRvclZpZXdbXCJzdGF0ZVwiXSk6IGJvb2xlYW4ge1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdHJldHVybiBzdGF0ZS5maWVsZChlZGl0b3JMaXZlUHJldmlld0ZpZWxkKTtcclxuXHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXCJFcnJvciBjaGVja2luZyBsaXZlIHByZXZpZXcgc3RhdGU6XCIsIGVycm9yKTtcclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRzaG91bGRSZW5kZXIoXHJcblx0XHRcdHZpZXc6IEVkaXRvclZpZXcsXHJcblx0XHRcdGRlY29yYXRpb25Gcm9tOiBudW1iZXIsXHJcblx0XHRcdGRlY29yYXRpb25UbzogbnVtYmVyXHJcblx0XHQpIHtcclxuXHRcdFx0Ly8gU2tpcCBjaGVja2luZyBpbiBjb2RlIGJsb2NrcyBvciBmcm9udG1hdHRlclxyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdC8vIFZhbGlkYXRlIHBvc2l0aW9uc1xyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdGRlY29yYXRpb25Gcm9tIDwgMCB8fFxyXG5cdFx0XHRcdFx0ZGVjb3JhdGlvblRvID4gdmlldy5zdGF0ZS5kb2MubGVuZ3RoIHx8XHJcblx0XHRcdFx0XHRkZWNvcmF0aW9uRnJvbSA+PSBkZWNvcmF0aW9uVG9cclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGNvbnN0IHN5bnRheE5vZGUgPSBzeW50YXhUcmVlKHZpZXcuc3RhdGUpLnJlc29sdmVJbm5lcihcclxuXHRcdFx0XHRcdGRlY29yYXRpb25Gcm9tICsgMVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0Y29uc3Qgbm9kZVByb3BzID0gc3ludGF4Tm9kZS50eXBlLnByb3AodG9rZW5DbGFzc05vZGVQcm9wKTtcclxuXHJcblx0XHRcdFx0aWYgKG5vZGVQcm9wcykge1xyXG5cdFx0XHRcdFx0Y29uc3QgcHJvcHMgPSBub2RlUHJvcHMuc3BsaXQoXCIgXCIpO1xyXG5cdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRwcm9wcy5pbmNsdWRlcyhcImhtZC1jb2RlYmxvY2tcIikgfHxcclxuXHRcdFx0XHRcdFx0cHJvcHMuaW5jbHVkZXMoXCJobWQtZnJvbnRtYXR0ZXJcIilcclxuXHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRjb25zdCBzZWxlY3Rpb24gPSB2aWV3LnN0YXRlLnNlbGVjdGlvbjtcclxuXHJcblx0XHRcdFx0Ly8gQXZvaWQgcmVuZGVyaW5nIG92ZXIgc2VsZWN0ZWQgdGV4dFxyXG5cdFx0XHRcdGNvbnN0IG92ZXJsYXAgPSBzZWxlY3Rpb24ucmFuZ2VzLnNvbWUoKHIpID0+IHtcclxuXHRcdFx0XHRcdHJldHVybiAhKHIudG8gPD0gZGVjb3JhdGlvbkZyb20gfHwgci5mcm9tID49IGRlY29yYXRpb25Ubyk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdHJldHVybiAhb3ZlcmxhcCAmJiB0aGlzLmlzTGl2ZVByZXZpZXcodmlldy5zdGF0ZSk7XHJcblx0XHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0XHQvLyBJZiBlcnJvciBpbiBjaGVja2luZywgZGVmYXVsdCB0byBub3QgcmVuZGVyaW5nIHRvIGF2b2lkIGJyZWFraW5nIHRoZSBlZGl0b3JcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXCJFcnJvciBjaGVja2luZyBpZiBkYXRlIHNob3VsZCByZW5kZXJcIiwgZSk7XHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRjb25zdCBEYXRlUGlja2VyVmlld1BsdWdpblNwZWM6IFBsdWdpblNwZWM8RGF0ZVBpY2tlclZpZXdQbHVnaW5WYWx1ZT4gPSB7XHJcblx0XHRkZWNvcmF0aW9uczogKHBsdWdpbikgPT4ge1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdGlmIChwbHVnaW4uaXNEZXN0cm95ZWQpIHtcclxuXHRcdFx0XHRcdHJldHVybiBEZWNvcmF0aW9uLm5vbmU7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRyZXR1cm4gcGx1Z2luLmRlY29yYXRpb25zLnVwZGF0ZSh7XHJcblx0XHRcdFx0XHRmaWx0ZXI6IChcclxuXHRcdFx0XHRcdFx0cmFuZ2VGcm9tOiBudW1iZXIsXHJcblx0XHRcdFx0XHRcdHJhbmdlVG86IG51bWJlcixcclxuXHRcdFx0XHRcdFx0ZGVjbzogRGVjb3JhdGlvblxyXG5cdFx0XHRcdFx0KSA9PiB7XHJcblx0XHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3Qgd2lkZ2V0ID0gZGVjby5zcGVjPy53aWRnZXQ7XHJcblx0XHRcdFx0XHRcdFx0aWYgKCh3aWRnZXQgYXMgYW55KS5lcnJvcikge1xyXG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gVmFsaWRhdGUgcmFuZ2VcclxuXHRcdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0XHRyYW5nZUZyb20gPCAwIHx8XHJcblx0XHRcdFx0XHRcdFx0XHRyYW5nZVRvID4gcGx1Z2luLnZpZXcuc3RhdGUuZG9jLmxlbmd0aCB8fFxyXG5cdFx0XHRcdFx0XHRcdFx0cmFuZ2VGcm9tID49IHJhbmdlVG9cclxuXHRcdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHNlbGVjdGlvbiA9IHBsdWdpbi52aWV3LnN0YXRlLnNlbGVjdGlvbjtcclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gUmVtb3ZlIGRlY29yYXRpb25zIHdoZW4gY3Vyc29yIGlzIGluc2lkZSB0aGVtXHJcblx0XHRcdFx0XHRcdFx0Zm9yIChjb25zdCByYW5nZSBvZiBzZWxlY3Rpb24ucmFuZ2VzKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0XHRcdCEoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0cmFuZ2UudG8gPD0gcmFuZ2VGcm9tIHx8XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0cmFuZ2UuZnJvbSA+PSByYW5nZVRvXHJcblx0XHRcdFx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRcdFx0XHRcIkVycm9yIGZpbHRlcmluZyBkYXRlIGRlY29yYXRpb246XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRlcnJvclxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdFx0Ly8gSWYgZXJyb3IgaW4gZmlsdGVyaW5nLCByZXR1cm4gY3VycmVudCBkZWNvcmF0aW9ucyB0byBhdm9pZCBicmVha2luZyB0aGUgZWRpdG9yXHJcblx0XHRcdFx0Y29uc29sZS53YXJuKFwiRXJyb3IgZmlsdGVyaW5nIGRhdGUgZGVjb3JhdGlvbnNcIiwgZSk7XHJcblx0XHRcdFx0cmV0dXJuIHBsdWdpbi5kZWNvcmF0aW9ucztcclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHR9O1xyXG5cclxuXHQvLyBDcmVhdGUgdGhlIHBsdWdpbiB3aXRoIG91ciBpbXBsZW1lbnRhdGlvblxyXG5cdGNvbnN0IHBsdWdpbkluc3RhbmNlID0gVmlld1BsdWdpbi5mcm9tQ2xhc3MoXHJcblx0XHREYXRlUGlja2VyVmlld1BsdWdpblZhbHVlLFxyXG5cdFx0RGF0ZVBpY2tlclZpZXdQbHVnaW5TcGVjXHJcblx0KTtcclxuXHJcblx0cmV0dXJuIHBsdWdpbkluc3RhbmNlO1xyXG59XHJcbiJdfQ==