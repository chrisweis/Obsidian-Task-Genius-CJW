import { EditorSuggest, setIcon, } from "obsidian";
import { Transaction } from "@codemirror/state";
import { t } from '@/translations/helper';
import { getSuggestOptionsByTrigger } from '@/components/ui/suggest';
export class MinimalQuickCaptureSuggest extends EditorSuggest {
    constructor(app, plugin) {
        super(app);
        this.isMinimalMode = false;
        this.plugin = plugin;
    }
    /**
     * Set the minimal mode context
     * This should be called by MinimalQuickCaptureModal to activate this suggest
     */
    setMinimalMode(isMinimal) {
        this.isMinimalMode = isMinimal;
    }
    /**
     * Get the trigger regex for the suggestion
     */
    onTrigger(cursor, editor, file) {
        var _a, _b;
        // Only trigger in minimal mode
        if (!this.isMinimalMode) {
            return null;
        }
        // Check if we're in a minimal quick capture context
        const editorEl = (_a = editor.cm) === null || _a === void 0 ? void 0 : _a.dom;
        if (!editorEl || !editorEl.closest(".quick-capture-modal.minimal")) {
            return null;
        }
        // Get the current line
        const line = editor.getLine(cursor.line);
        const triggerChar = ((_b = this.plugin.settings.quickCapture.minimalModeSettings) === null || _b === void 0 ? void 0 : _b.suggestTrigger) || "/";
        // Define all possible trigger characters
        // Always include "/" for the main menu, plus the configured trigger and special chars
        const allTriggers = ["/", triggerChar, "~", "!", "*", "#"];
        // Check if the cursor is right after any trigger character
        if (cursor.ch > 0) {
            const charBeforeCursor = line.charAt(cursor.ch - 1);
            if (allTriggers.includes(charBeforeCursor)) {
                return {
                    start: { line: cursor.line, ch: cursor.ch - 1 },
                    end: cursor,
                    query: charBeforeCursor,
                };
            }
        }
        return null;
    }
    /**
     * Get suggestions based on the trigger
     */
    getSuggestions(context) {
        const triggerChar = context.query;
        // If trigger is "/", show all special character options
        if (triggerChar === "/") {
            return [
                {
                    id: "date",
                    label: t("Date"),
                    icon: "calendar",
                    description: t("Add date (triggers ~)"),
                    replacement: "~",
                    trigger: "/",
                },
                {
                    id: "priority",
                    label: t("Priority"),
                    icon: "zap",
                    description: t("Set priority (triggers !)"),
                    replacement: "!",
                    trigger: "/",
                },
                {
                    id: "target",
                    label: t("Target Location"),
                    icon: "folder",
                    description: t("Set target location (triggers *)"),
                    replacement: "*",
                    trigger: "/",
                },
                {
                    id: "tag",
                    label: t("Tag"),
                    icon: "tag",
                    description: t("Add tags (triggers #)"),
                    replacement: "#",
                    trigger: "/",
                },
            ];
        }
        // For special characters, get their specific suggestions
        // Map old @ to new * for backward compatibility
        const mappedTrigger = triggerChar === "@" ? "*" : triggerChar;
        return getSuggestOptionsByTrigger(mappedTrigger, this.plugin);
    }
    /**
     * Render suggestion using Obsidian Menu DOM structure
     */
    renderSuggestion(suggestion, el) {
        el.addClass("menu-item");
        el.addClass("tappable");
        // Create icon element
        const iconEl = el.createDiv("menu-item-icon");
        setIcon(iconEl, suggestion.icon);
        // Create title element
        const titleEl = el.createDiv("menu-item-title");
        titleEl.textContent = suggestion.label;
    }
    /**
     * Handle suggestion selection
     */
    selectSuggestion(suggestion, evt) {
        var _a, _b, _c, _d, _e;
        const editor = (_a = this.context) === null || _a === void 0 ? void 0 : _a.editor;
        const cursor = (_b = this.context) === null || _b === void 0 ? void 0 : _b.end;
        if (!editor || !cursor)
            return;
        // Get the current trigger character
        const currentTrigger = ((_c = this.context) === null || _c === void 0 ? void 0 : _c.query) || "";
        // Check if this is a specific metadata selection (not the main menu items)
        const isSpecificMetadataSelection = ["!", "~", "#", "*"].includes(currentTrigger) &&
            !["date", "priority", "target", "tag"].includes(suggestion.id);
        if (isSpecificMetadataSelection) {
            // This is a specific metadata selection (e.g., "High Priority" from "!" menu)
            // Just remove the trigger character, don't insert anything
            const view = editor.cm;
            if (!view) {
                // Fallback to old method if view is not available
                const startPos = { line: cursor.line, ch: cursor.ch - 1 };
                const endPos = cursor;
                editor.replaceRange("", startPos, endPos);
                editor.setCursor(startPos);
            }
            else {
                // Use CodeMirror 6 changes API to remove the trigger character
                const startOffset = view.state.doc.line(cursor.line + 1).from + cursor.ch - 1;
                const endOffset = view.state.doc.line(cursor.line + 1).from + cursor.ch;
                view.dispatch({
                    changes: {
                        from: startOffset,
                        to: endOffset,
                        insert: "",
                    },
                    annotations: [Transaction.userEvent.of("input")],
                });
            }
        }
        else {
            // This is either:
            // 1. A main menu selection from "/" (replace with special character)
            // 2. A general category selection that should insert the replacement
            const view = editor.cm;
            if (!view) {
                // Fallback to old method if view is not available
                const startPos = { line: cursor.line, ch: cursor.ch - 1 };
                const endPos = cursor;
                editor.replaceRange(suggestion.replacement, startPos, endPos);
                const newCursor = {
                    line: cursor.line,
                    ch: cursor.ch - 1 + suggestion.replacement.length,
                };
                editor.setCursor(newCursor);
            }
            else if ((_d = view.state) === null || _d === void 0 ? void 0 : _d.doc) {
                // Use CodeMirror 6 changes API
                const startOffset = view.state.doc.line(cursor.line + 1).from + cursor.ch - 1;
                const endOffset = view.state.doc.line(cursor.line + 1).from + cursor.ch;
                view.dispatch({
                    changes: {
                        from: startOffset,
                        to: endOffset,
                        insert: suggestion.replacement,
                    },
                    annotations: [Transaction.userEvent.of("input")],
                });
            }
            else {
                // Fallback if view.state is not available
                const startPos = { line: cursor.line, ch: cursor.ch - 1 };
                const endPos = cursor;
                editor.replaceRange(suggestion.replacement, startPos, endPos);
                const newCursor = {
                    line: cursor.line,
                    ch: cursor.ch - 1 + suggestion.replacement.length,
                };
                editor.setCursor(newCursor);
            }
        }
        // Get the modal instance to update button states
        const editorEl = (_e = editor.cm) === null || _e === void 0 ? void 0 : _e.dom;
        const modalEl = editorEl === null || editorEl === void 0 ? void 0 : editorEl.closest(".quick-capture-modal.minimal");
        const modal = modalEl === null || modalEl === void 0 ? void 0 : modalEl.__minimalQuickCaptureModal;
        // Execute custom action if provided
        if (suggestion.action) {
            const newCursor = {
                line: cursor.line,
                ch: cursor.ch - 1 + suggestion.replacement.length,
            };
            suggestion.action(editor, newCursor);
        }
        // Update modal state if available
        if (modal && typeof modal.parseContentAndUpdateButtons === "function") {
            // Delay to ensure content is updated
            setTimeout(() => {
                modal.parseContentAndUpdateButtons();
            }, 50);
        }
        // Close this suggest to allow the next one to trigger
        this.close();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWluaW1hbFF1aWNrQ2FwdHVyZVN1Z2dlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJNaW5pbWFsUXVpY2tDYXB0dXJlU3VnZ2VzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBSU4sYUFBYSxFQUliLE9BQU8sR0FDUCxNQUFNLFVBQVUsQ0FBQztBQUNsQixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFHaEQsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzFDLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBWXJFLE1BQU0sT0FBTywwQkFBMkIsU0FBUSxhQUE0QjtJQUkzRSxZQUFZLEdBQVEsRUFBRSxNQUE2QjtRQUNsRCxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFISixrQkFBYSxHQUFZLEtBQUssQ0FBQztRQUl0QyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUN0QixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsY0FBYyxDQUFDLFNBQWtCO1FBQ2hDLElBQUksQ0FBQyxhQUFhLEdBQUcsU0FBUyxDQUFDO0lBQ2hDLENBQUM7SUFFRDs7T0FFRztJQUNILFNBQVMsQ0FDUixNQUFzQixFQUN0QixNQUFjLEVBQ2QsSUFBVzs7UUFFWCwrQkFBK0I7UUFDL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUU7WUFDeEIsT0FBTyxJQUFJLENBQUM7U0FDWjtRQUVELG9EQUFvRDtRQUNwRCxNQUFNLFFBQVEsR0FBRyxNQUFDLE1BQWMsQ0FBQyxFQUFFLDBDQUFFLEdBQWtCLENBQUM7UUFDeEQsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsOEJBQThCLENBQUMsRUFBRTtZQUNuRSxPQUFPLElBQUksQ0FBQztTQUNaO1FBRUQsdUJBQXVCO1FBQ3ZCLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxPQUFP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QUFFO2dCQUNmLEtBQUssQ0FBQyw0QkFBNEIsRUFBRSxDQUFDO1lBQ3RDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUNQO1FBRUQsc0RBQXNEO1FBQ3RELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNkLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XHJcblx0QXBwLFxyXG5cdEVkaXRvcixcclxuXHRFZGl0b3JQb3NpdGlvbixcclxuXHRFZGl0b3JTdWdnZXN0LFxyXG5cdEVkaXRvclN1Z2dlc3RDb250ZXh0LFxyXG5cdEVkaXRvclN1Z2dlc3RUcmlnZ2VySW5mbyxcclxuXHRURmlsZSxcclxuXHRzZXRJY29uLFxyXG59IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBUcmFuc2FjdGlvbiB9IGZyb20gXCJAY29kZW1pcnJvci9zdGF0ZVwiO1xyXG5pbXBvcnQgeyBFZGl0b3JWaWV3IH0gZnJvbSBcIkBjb2RlbWlycm9yL3ZpZXdcIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tICdAL2luZGV4JztcclxuaW1wb3J0IHsgdCB9IGZyb20gJ0AvdHJhbnNsYXRpb25zL2hlbHBlcic7XHJcbmltcG9ydCB7IGdldFN1Z2dlc3RPcHRpb25zQnlUcmlnZ2VyIH0gZnJvbSAnQC9jb21wb25lbnRzL3VpL3N1Z2dlc3QnO1xyXG5cclxuaW50ZXJmYWNlIFN1Z2dlc3RPcHRpb24ge1xyXG5cdGlkOiBzdHJpbmc7XHJcblx0bGFiZWw6IHN0cmluZztcclxuXHRpY29uOiBzdHJpbmc7XHJcblx0ZGVzY3JpcHRpb246IHN0cmluZztcclxuXHRyZXBsYWNlbWVudDogc3RyaW5nO1xyXG5cdHRyaWdnZXI/OiBzdHJpbmc7XHJcblx0YWN0aW9uPzogKGVkaXRvcjogRWRpdG9yLCBjdXJzb3I6IEVkaXRvclBvc2l0aW9uKSA9PiB2b2lkO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWluaW1hbFF1aWNrQ2FwdHVyZVN1Z2dlc3QgZXh0ZW5kcyBFZGl0b3JTdWdnZXN0PFN1Z2dlc3RPcHRpb24+IHtcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbjtcclxuXHRwcml2YXRlIGlzTWluaW1hbE1vZGU6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcblx0Y29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luKSB7XHJcblx0XHRzdXBlcihhcHApO1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTZXQgdGhlIG1pbmltYWwgbW9kZSBjb250ZXh0XHJcblx0ICogVGhpcyBzaG91bGQgYmUgY2FsbGVkIGJ5IE1pbmltYWxRdWlja0NhcHR1cmVNb2RhbCB0byBhY3RpdmF0ZSB0aGlzIHN1Z2dlc3RcclxuXHQgKi9cclxuXHRzZXRNaW5pbWFsTW9kZShpc01pbmltYWw6IGJvb2xlYW4pOiB2b2lkIHtcclxuXHRcdHRoaXMuaXNNaW5pbWFsTW9kZSA9IGlzTWluaW1hbDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0aGUgdHJpZ2dlciByZWdleCBmb3IgdGhlIHN1Z2dlc3Rpb25cclxuXHQgKi9cclxuXHRvblRyaWdnZXIoXHJcblx0XHRjdXJzb3I6IEVkaXRvclBvc2l0aW9uLFxyXG5cdFx0ZWRpdG9yOiBFZGl0b3IsXHJcblx0XHRmaWxlOiBURmlsZVxyXG5cdCk6IEVkaXRvclN1Z2dlc3RUcmlnZ2VySW5mbyB8IG51bGwge1xyXG5cdFx0Ly8gT25seSB0cmlnZ2VyIGluIG1pbmltYWwgbW9kZVxyXG5cdFx0aWYgKCF0aGlzLmlzTWluaW1hbE1vZGUpIHtcclxuXHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgd2UncmUgaW4gYSBtaW5pbWFsIHF1aWNrIGNhcHR1cmUgY29udGV4dFxyXG5cdFx0Y29uc3QgZWRpdG9yRWwgPSAoZWRpdG9yIGFzIGFueSkuY20/LmRvbSBhcyBIVE1MRWxlbWVudDtcclxuXHRcdGlmICghZWRpdG9yRWwgfHwgIWVkaXRvckVsLmNsb3Nlc3QoXCIucXVpY2stY2FwdHVyZS1tb2RhbC5taW5pbWFsXCIpKSB7XHJcblx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEdldCB0aGUgY3VycmVudCBsaW5lXHJcblx0XHRjb25zdCBsaW5lID0gZWRpdG9yLmdldExpbmUoY3Vyc29yLmxpbmUpO1xyXG5cdFx0Y29uc3QgdHJpZ2dlckNoYXIgPVxyXG5cdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUubWluaW1hbE1vZGVTZXR0aW5nc1xyXG5cdFx0XHRcdD8uc3VnZ2VzdFRyaWdnZXIgfHwgXCIvXCI7XHJcblxyXG5cdFx0Ly8gRGVmaW5lIGFsbCBwb3NzaWJsZSB0cmlnZ2VyIGNoYXJhY3RlcnNcclxuXHRcdC8vIEFsd2F5cyBpbmNsdWRlIFwiL1wiIGZvciB0aGUgbWFpbiBtZW51LCBwbHVzIHRoZSBjb25maWd1cmVkIHRyaWdnZXIgYW5kIHNwZWNpYWwgY2hhcnNcclxuXHRcdGNvbnN0IGFsbFRyaWdnZXJzID0gW1wiL1wiLCB0cmlnZ2VyQ2hhciwgXCJ+XCIsIFwiIVwiLCBcIipcIiwgXCIjXCJdO1xyXG5cdFx0XHJcblx0XHQvLyBDaGVjayBpZiB0aGUgY3Vyc29yIGlzIHJpZ2h0IGFmdGVyIGFueSB0cmlnZ2VyIGNoYXJhY3RlclxyXG5cdFx0aWYgKGN1cnNvci5jaCA+IDApIHtcclxuXHRcdFx0Y29uc3QgY2hhckJlZm9yZUN1cnNvciA9IGxpbmUuY2hhckF0KGN1cnNvci5jaCAtIDEpO1xyXG5cdFx0XHRpZiAoYWxsVHJpZ2dlcnMuaW5jbHVkZXMoY2hhckJlZm9yZUN1cnNvcikpIHtcclxuXHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0c3RhcnQ6IHsgbGluZTogY3Vyc29yLmxpbmUsIGNoOiBjdXJzb3IuY2ggLSAxIH0sXHJcblx0XHRcdFx0XHRlbmQ6IGN1cnNvcixcclxuXHRcdFx0XHRcdHF1ZXJ5OiBjaGFyQmVmb3JlQ3Vyc29yLFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBzdWdnZXN0aW9ucyBiYXNlZCBvbiB0aGUgdHJpZ2dlclxyXG5cdCAqL1xyXG5cdGdldFN1Z2dlc3Rpb25zKGNvbnRleHQ6IEVkaXRvclN1Z2dlc3RDb250ZXh0KTogU3VnZ2VzdE9wdGlvbltdIHtcclxuXHRcdGNvbnN0IHRyaWdnZXJDaGFyID0gY29udGV4dC5xdWVyeTtcclxuXHJcblx0XHQvLyBJZiB0cmlnZ2VyIGlzIFwiL1wiLCBzaG93IGFsbCBzcGVjaWFsIGNoYXJhY3RlciBvcHRpb25zXHJcblx0XHRpZiAodHJpZ2dlckNoYXIgPT09IFwiL1wiKSB7XHJcblx0XHRcdHJldHVybiBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0aWQ6IFwiZGF0ZVwiLFxyXG5cdFx0XHRcdFx0bGFiZWw6IHQoXCJEYXRlXCIpLFxyXG5cdFx0XHRcdFx0aWNvbjogXCJjYWxlbmRhclwiLFxyXG5cdFx0XHRcdFx0ZGVzY3JpcHRpb246IHQoXCJBZGQgZGF0ZSAodHJpZ2dlcnMgfilcIiksXHJcblx0XHRcdFx0XHRyZXBsYWNlbWVudDogXCJ+XCIsXHJcblx0XHRcdFx0XHR0cmlnZ2VyOiBcIi9cIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGlkOiBcInByaW9yaXR5XCIsXHJcblx0XHRcdFx0XHRsYWJlbDogdChcIlByaW9yaXR5XCIpLFxyXG5cdFx0XHRcdFx0aWNvbjogXCJ6YXBcIixcclxuXHRcdFx0XHRcdGRlc2NyaXB0aW9uOiB0KFwiU2V0IHByaW9yaXR5ICh0cmlnZ2VycyAhKVwiKSxcclxuXHRcdFx0XHRcdHJlcGxhY2VtZW50OiBcIiFcIixcclxuXHRcdFx0XHRcdHRyaWdnZXI6IFwiL1wiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0aWQ6IFwidGFyZ2V0XCIsXHJcblx0XHRcdFx0XHRsYWJlbDogdChcIlRhcmdldCBMb2NhdGlvblwiKSxcclxuXHRcdFx0XHRcdGljb246IFwiZm9sZGVyXCIsXHJcblx0XHRcdFx0XHRkZXNjcmlwdGlvbjogdChcIlNldCB0YXJnZXQgbG9jYXRpb24gKHRyaWdnZXJzICopXCIpLFxyXG5cdFx0XHRcdFx0cmVwbGFjZW1lbnQ6IFwiKlwiLFxyXG5cdFx0XHRcdFx0dHJpZ2dlcjogXCIvXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRpZDogXCJ0YWdcIixcclxuXHRcdFx0XHRcdGxhYmVsOiB0KFwiVGFnXCIpLFxyXG5cdFx0XHRcdFx0aWNvbjogXCJ0YWdcIixcclxuXHRcdFx0XHRcdGRlc2NyaXB0aW9uOiB0KFwiQWRkIHRhZ3MgKHRyaWdnZXJzICMpXCIpLFxyXG5cdFx0XHRcdFx0cmVwbGFjZW1lbnQ6IFwiI1wiLFxyXG5cdFx0XHRcdFx0dHJpZ2dlcjogXCIvXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBGb3Igc3BlY2lhbCBjaGFyYWN0ZXJzLCBnZXQgdGhlaXIgc3BlY2lmaWMgc3VnZ2VzdGlvbnNcclxuXHRcdC8vIE1hcCBvbGQgQCB0byBuZXcgKiBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eVxyXG5cdFx0Y29uc3QgbWFwcGVkVHJpZ2dlciA9IHRyaWdnZXJDaGFyID09PSBcIkBcIiA/IFwiKlwiIDogdHJpZ2dlckNoYXI7XHJcblx0XHRyZXR1cm4gZ2V0U3VnZ2VzdE9wdGlvbnNCeVRyaWdnZXIobWFwcGVkVHJpZ2dlciwgdGhpcy5wbHVnaW4pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVuZGVyIHN1Z2dlc3Rpb24gdXNpbmcgT2JzaWRpYW4gTWVudSBET00gc3RydWN0dXJlXHJcblx0ICovXHJcblx0cmVuZGVyU3VnZ2VzdGlvbihzdWdnZXN0aW9uOiBTdWdnZXN0T3B0aW9uLCBlbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdGVsLmFkZENsYXNzKFwibWVudS1pdGVtXCIpO1xyXG5cdFx0ZWwuYWRkQ2xhc3MoXCJ0YXBwYWJsZVwiKTtcclxuXHJcblx0XHQvLyBDcmVhdGUgaWNvbiBlbGVtZW50XHJcblx0XHRjb25zdCBpY29uRWwgPSBlbC5jcmVhdGVEaXYoXCJtZW51LWl0ZW0taWNvblwiKTtcclxuXHRcdHNldEljb24oaWNvbkVsLCBzdWdnZXN0aW9uLmljb24pO1xyXG5cclxuXHRcdC8vIENyZWF0ZSB0aXRsZSBlbGVtZW50XHJcblx0XHRjb25zdCB0aXRsZUVsID0gZWwuY3JlYXRlRGl2KFwibWVudS1pdGVtLXRpdGxlXCIpO1xyXG5cdFx0dGl0bGVFbC50ZXh0Q29udGVudCA9IHN1Z2dlc3Rpb24ubGFiZWw7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBIYW5kbGUgc3VnZ2VzdGlvbiBzZWxlY3Rpb25cclxuXHQgKi9cclxuXHRzZWxlY3RTdWdnZXN0aW9uKFxyXG5cdFx0c3VnZ2VzdGlvbjogU3VnZ2VzdE9wdGlvbixcclxuXHRcdGV2dDogTW91c2VFdmVudCB8IEtleWJvYXJkRXZlbnRcclxuXHQpOiB2b2lkIHtcclxuXHRcdGNvbnN0IGVkaXRvciA9IHRoaXMuY29udGV4dD8uZWRpdG9yO1xyXG5cdFx0Y29uc3QgY3Vyc29yID0gdGhpcy5jb250ZXh0Py5lbmQ7XHJcblxyXG5cdFx0aWYgKCFlZGl0b3IgfHwgIWN1cnNvcikgcmV0dXJuO1xyXG5cclxuXHRcdC8vIEdldCB0aGUgY3VycmVudCB0cmlnZ2VyIGNoYXJhY3RlclxyXG5cdFx0Y29uc3QgY3VycmVudFRyaWdnZXIgPSB0aGlzLmNvbnRleHQ/LnF1ZXJ5IHx8IFwiXCI7XHJcblx0XHRcclxuXHRcdC8vIENoZWNrIGlmIHRoaXMgaXMgYSBzcGVjaWZpYyBtZXRhZGF0YSBzZWxlY3Rpb24gKG5vdCB0aGUgbWFpbiBtZW51IGl0ZW1zKVxyXG5cdFx0Y29uc3QgaXNTcGVjaWZpY01ldGFkYXRhU2VsZWN0aW9uID0gW1wiIVwiLCBcIn5cIiwgXCIjXCIsIFwiKlwiXS5pbmNsdWRlcyhjdXJyZW50VHJpZ2dlcikgJiYgXHJcblx0XHRcdCFbXCJkYXRlXCIsIFwicHJpb3JpdHlcIiwgXCJ0YXJnZXRcIiwgXCJ0YWdcIl0uaW5jbHVkZXMoc3VnZ2VzdGlvbi5pZCk7XHJcblx0XHRcclxuXHRcdGlmIChpc1NwZWNpZmljTWV0YWRhdGFTZWxlY3Rpb24pIHtcclxuXHRcdFx0Ly8gVGhpcyBpcyBhIHNwZWNpZmljIG1ldGFkYXRhIHNlbGVjdGlvbiAoZS5nLiwgXCJIaWdoIFByaW9yaXR5XCIgZnJvbSBcIiFcIiBtZW51KVxyXG5cdFx0XHQvLyBKdXN0IHJlbW92ZSB0aGUgdHJpZ2dlciBjaGFyYWN0ZXIsIGRvbid0IGluc2VydCBhbnl0aGluZ1xyXG5cdFx0XHRjb25zdCB2aWV3ID0gKGVkaXRvciBhcyBhbnkpLmNtIGFzIEVkaXRvclZpZXc7XHJcblx0XHRcdGlmICghdmlldykge1xyXG5cdFx0XHRcdC8vIEZhbGxiYWNrIHRvIG9sZCBtZXRob2QgaWYgdmlldyBpcyBub3QgYXZhaWxhYmxlXHJcblx0XHRcdFx0Y29uc3Qgc3RhcnRQb3MgPSB7IGxpbmU6IGN1cnNvci5saW5lLCBjaDogY3Vyc29yLmNoIC0gMSB9O1xyXG5cdFx0XHRcdGNvbnN0IGVuZFBvcyA9IGN1cnNvcjtcclxuXHRcdFx0XHRlZGl0b3IucmVwbGFjZVJhbmdlKFwiXCIsIHN0YXJ0UG9zLCBlbmRQb3MpO1xyXG5cdFx0XHRcdGVkaXRvci5zZXRDdXJzb3Ioc3RhcnRQb3MpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIFVzZSBDb2RlTWlycm9yIDYgY2hhbmdlcyBBUEkgdG8gcmVtb3ZlIHRoZSB0cmlnZ2VyIGNoYXJhY3RlclxyXG5cdFx0XHRcdGNvbnN0IHN0YXJ0T2Zmc2V0ID0gdmlldy5zdGF0ZS5kb2MubGluZShjdXJzb3IubGluZSArIDEpLmZyb20gKyBjdXJzb3IuY2ggLSAxO1xyXG5cdFx0XHRcdGNvbnN0IGVuZE9mZnNldCA9IHZpZXcuc3RhdGUuZG9jLmxpbmUoY3Vyc29yLmxpbmUgKyAxKS5mcm9tICsgY3Vyc29yLmNoO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHZpZXcuZGlzcGF0Y2goe1xyXG5cdFx0XHRcdFx0Y2hhbmdlczoge1xyXG5cdFx0XHRcdFx0XHRmcm9tOiBzdGFydE9mZnNldCxcclxuXHRcdFx0XHRcdFx0dG86IGVuZE9mZnNldCxcclxuXHRcdFx0XHRcdFx0aW5zZXJ0OiBcIlwiLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdGFubm90YXRpb25zOiBbVHJhbnNhY3Rpb24udXNlckV2ZW50Lm9mKFwiaW5wdXRcIildLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBUaGlzIGlzIGVpdGhlcjpcclxuXHRcdFx0Ly8gMS4gQSBtYWluIG1lbnUgc2VsZWN0aW9uIGZyb20gXCIvXCIgKHJlcGxhY2Ugd2l0aCBzcGVjaWFsIGNoYXJhY3RlcilcclxuXHRcdFx0Ly8gMi4gQSBnZW5lcmFsIGNhdGVnb3J5IHNlbGVjdGlvbiB0aGF0IHNob3VsZCBpbnNlcnQgdGhlIHJlcGxhY2VtZW50XHJcblx0XHRcdGNvbnN0IHZpZXcgPSAoZWRpdG9yIGFzIGFueSkuY20gYXMgRWRpdG9yVmlldztcclxuXHRcdFx0aWYgKCF2aWV3KSB7XHJcblx0XHRcdFx0Ly8gRmFsbGJhY2sgdG8gb2xkIG1ldGhvZCBpZiB2aWV3IGlzIG5vdCBhdmFpbGFibGVcclxuXHRcdFx0XHRjb25zdCBzdGFydFBvcyA9IHsgbGluZTogY3Vyc29yLmxpbmUsIGNoOiBjdXJzb3IuY2ggLSAxIH07XHJcblx0XHRcdFx0Y29uc3QgZW5kUG9zID0gY3Vyc29yO1xyXG5cdFx0XHRcdGVkaXRvci5yZXBsYWNlUmFuZ2Uoc3VnZ2VzdGlvbi5yZXBsYWNlbWVudCwgc3RhcnRQb3MsIGVuZFBvcyk7XHJcblx0XHRcdFx0Y29uc3QgbmV3Q3Vyc29yID0ge1xyXG5cdFx0XHRcdFx0bGluZTogY3Vyc29yLmxpbmUsXHJcblx0XHRcdFx0XHRjaDogY3Vyc29yLmNoIC0gMSArIHN1Z2dlc3Rpb24ucmVwbGFjZW1lbnQubGVuZ3RoLFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0ZWRpdG9yLnNldEN1cnNvcihuZXdDdXJzb3IpO1xyXG5cdFx0XHR9IGVsc2UgaWYgKHZpZXcuc3RhdGU/LmRvYykge1xyXG5cdFx0XHRcdC8vIFVzZSBDb2RlTWlycm9yIDYgY2hhbmdlcyBBUElcclxuXHRcdFx0XHRjb25zdCBzdGFydE9mZnNldCA9IHZpZXcuc3RhdGUuZG9jLmxpbmUoY3Vyc29yLmxpbmUgKyAxKS5mcm9tICsgY3Vyc29yLmNoIC0gMTtcclxuXHRcdFx0XHRjb25zdCBlbmRPZmZzZXQgPSB2aWV3LnN0YXRlLmRvYy5saW5lKGN1cnNvci5saW5lICsgMSkuZnJvbSArIGN1cnNvci5jaDtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR2aWV3LmRpc3BhdGNoKHtcclxuXHRcdFx0XHRcdGNoYW5nZXM6IHtcclxuXHRcdFx0XHRcdFx0ZnJvbTogc3RhcnRPZmZzZXQsXHJcblx0XHRcdFx0XHRcdHRvOiBlbmRPZmZzZXQsXHJcblx0XHRcdFx0XHRcdGluc2VydDogc3VnZ2VzdGlvbi5yZXBsYWNlbWVudCxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRhbm5vdGF0aW9uczogW1RyYW5zYWN0aW9uLnVzZXJFdmVudC5vZihcImlucHV0XCIpXSxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBGYWxsYmFjayBpZiB2aWV3LnN0YXRlIGlzIG5vdCBhdmFpbGFibGVcclxuXHRcdFx0XHRjb25zdCBzdGFydFBvcyA9IHsgbGluZTogY3Vyc29yLmxpbmUsIGNoOiBjdXJzb3IuY2ggLSAxIH07XHJcblx0XHRcdFx0Y29uc3QgZW5kUG9zID0gY3Vyc29yO1xyXG5cdFx0XHRcdGVkaXRvci5yZXBsYWNlUmFuZ2Uoc3VnZ2VzdGlvbi5yZXBsYWNlbWVudCwgc3RhcnRQb3MsIGVuZFBvcyk7XHJcblx0XHRcdFx0Y29uc3QgbmV3Q3Vyc29yID0ge1xyXG5cdFx0XHRcdFx0bGluZTogY3Vyc29yLmxpbmUsXHJcblx0XHRcdFx0XHRjaDogY3Vyc29yLmNoIC0gMSArIHN1Z2dlc3Rpb24ucmVwbGFjZW1lbnQubGVuZ3RoLFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0ZWRpdG9yLnNldEN1cnNvcihuZXdDdXJzb3IpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gR2V0IHRoZSBtb2RhbCBpbnN0YW5jZSB0byB1cGRhdGUgYnV0dG9uIHN0YXRlc1xyXG5cdFx0Y29uc3QgZWRpdG9yRWwgPSAoZWRpdG9yIGFzIGFueSkuY20/LmRvbSBhcyBIVE1MRWxlbWVudDtcclxuXHRcdGNvbnN0IG1vZGFsRWwgPSBlZGl0b3JFbD8uY2xvc2VzdChcIi5xdWljay1jYXB0dXJlLW1vZGFsLm1pbmltYWxcIik7XHJcblx0XHRjb25zdCBtb2RhbCA9IChtb2RhbEVsIGFzIGFueSk/Ll9fbWluaW1hbFF1aWNrQ2FwdHVyZU1vZGFsO1xyXG5cclxuXHRcdC8vIEV4ZWN1dGUgY3VzdG9tIGFjdGlvbiBpZiBwcm92aWRlZFxyXG5cdFx0aWYgKHN1Z2dlc3Rpb24uYWN0aW9uKSB7XHJcblx0XHRcdGNvbnN0IG5ld0N1cnNvciA9IHtcclxuXHRcdFx0XHRsaW5lOiBjdXJzb3IubGluZSxcclxuXHRcdFx0XHRjaDogY3Vyc29yLmNoIC0gMSArIHN1Z2dlc3Rpb24ucmVwbGFjZW1lbnQubGVuZ3RoLFxyXG5cdFx0XHR9O1xyXG5cdFx0XHRzdWdnZXN0aW9uLmFjdGlvbihlZGl0b3IsIG5ld0N1cnNvcik7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVXBkYXRlIG1vZGFsIHN0YXRlIGlmIGF2YWlsYWJsZVxyXG5cdFx0aWYgKG1vZGFsICYmIHR5cGVvZiBtb2RhbC5wYXJzZUNvbnRlbnRBbmRVcGRhdGVCdXR0b25zID09PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0Ly8gRGVsYXkgdG8gZW5zdXJlIGNvbnRlbnQgaXMgdXBkYXRlZFxyXG5cdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRtb2RhbC5wYXJzZUNvbnRlbnRBbmRVcGRhdGVCdXR0b25zKCk7XHJcblx0XHRcdH0sIDUwKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDbG9zZSB0aGlzIHN1Z2dlc3QgdG8gYWxsb3cgdGhlIG5leHQgb25lIHRvIHRyaWdnZXJcclxuXHRcdHRoaXMuY2xvc2UoKTtcclxuXHR9XHJcbn1cclxuIl19