import { EditorSuggest, setIcon, moment, } from "obsidian";
import { Transaction } from "@codemirror/state";
import { t } from "../../translations/helper";
export class QuickCaptureSuggest extends EditorSuggest {
    constructor(app, plugin) {
        super(app);
        this.isQuickCaptureMode = false;
        this.taskMetadata = null;
        this.updateButtonState = null;
        this.dateButton = null;
        this.priorityButton = null;
        this.tagsButton = null;
        this.targetFileUpdater = null;
        this.plugin = plugin;
    }
    /**
     * Set the quick capture context
     */
    setQuickCaptureContext(isActive, metadata, updateButtonState, buttons, targetFileUpdater) {
        this.isQuickCaptureMode = isActive;
        this.taskMetadata = metadata;
        this.updateButtonState = updateButtonState;
        if (buttons) {
            this.dateButton = buttons.dateButton;
            this.priorityButton = buttons.priorityButton;
            this.tagsButton = buttons.tagsButton;
        }
        this.targetFileUpdater = targetFileUpdater || null;
    }
    /**
     * Get the trigger regex for the suggestion
     */
    onTrigger(cursor, editor, file) {
        var _a;
        // Only trigger in quick capture mode
        if (!this.isQuickCaptureMode) {
            return null;
        }
        // Check if we're in a quick capture context
        const editorEl = (_a = editor.cm) === null || _a === void 0 ? void 0 : _a.dom;
        if (!editorEl || !editorEl.closest(".quick-capture-panel")) {
            return null;
        }
        // Get the current line
        const line = editor.getLine(cursor.line);
        // Define all possible trigger characters
        const allTriggers = ["~", "!", "#", "*", "@"];
        // Look backwards from cursor to find a trigger character
        for (let i = cursor.ch - 1; i >= 0; i--) {
            const char = line.charAt(i);
            // If we find a trigger character
            if (allTriggers.includes(char)) {
                // Check if there's a space or start of line before it
                if (i === 0 || /\s/.test(line.charAt(i - 1))) {
                    // Extract the query text after the trigger
                    const query = line.substring(i + 1, cursor.ch);
                    return {
                        start: { line: cursor.line, ch: i },
                        end: cursor,
                        query: char + query, // Include trigger char and query text
                    };
                }
                // If there's no space before the trigger, don't trigger
                break;
            }
            // Stop searching if we hit a space or special character (except for valid query chars)
            if (/[\s~!#*@]/.test(char)) {
                break;
            }
        }
        return null;
    }
    /**
     * Get suggestions based on the trigger
     */
    getSuggestions(context) {
        // Extract trigger character and search query
        const triggerChar = context.query.charAt(0);
        const searchQuery = context.query.substring(1).toLowerCase();
        let suggestions = [];
        switch (triggerChar) {
            case "~":
                suggestions = this.getDateSuggestions();
                break;
            case "!":
                suggestions = this.getPrioritySuggestions();
                break;
            case "#":
                suggestions = this.getTagSuggestions();
                break;
            case "*":
            case "@":
                suggestions = this.getLocationSuggestions();
                break;
            default:
                return [];
        }
        // Filter suggestions based on search query if present
        if (searchQuery) {
            suggestions = suggestions.filter(s => s.label.toLowerCase().includes(searchQuery) ||
                s.description.toLowerCase().includes(searchQuery));
        }
        return suggestions;
    }
    getDateSuggestions() {
        return [
            {
                id: "date-today",
                label: t("Today"),
                icon: "calendar",
                description: moment().format("YYYY-MM-DD"),
                replacement: `📅 ${moment().format("YYYY-MM-DD")}`,
                trigger: "~",
                action: (editor, cursor, metadata) => {
                    if (this.taskMetadata) {
                        this.taskMetadata.dueDate = moment().toDate();
                    }
                    if (this.updateButtonState && this.dateButton) {
                        this.updateButtonState(this.dateButton, true);
                    }
                }
            },
            {
                id: "date-tomorrow",
                label: t("Tomorrow"),
                icon: "calendar",
                description: moment().add(1, "day").format("YYYY-MM-DD"),
                replacement: `📅 ${moment().add(1, "day").format("YYYY-MM-DD")}`,
                trigger: "~",
                action: (editor, cursor, metadata) => {
                    if (this.taskMetadata) {
                        this.taskMetadata.dueDate = moment().add(1, "day").toDate();
                    }
                    if (this.updateButtonState && this.dateButton) {
                        this.updateButtonState(this.dateButton, true);
                    }
                }
            },
            {
                id: "date-next-week",
                label: t("Next week"),
                icon: "calendar",
                description: moment().add(1, "week").format("YYYY-MM-DD"),
                replacement: `📅 ${moment().add(1, "week").format("YYYY-MM-DD")}`,
                trigger: "~",
                action: (editor, cursor, metadata) => {
                    if (this.taskMetadata) {
                        this.taskMetadata.dueDate = moment().add(1, "week").toDate();
                    }
                    if (this.updateButtonState && this.dateButton) {
                        this.updateButtonState(this.dateButton, true);
                    }
                }
            },
            {
                id: "date-next-month",
                label: t("Next month"),
                icon: "calendar",
                description: moment().add(1, "month").format("YYYY-MM-DD"),
                replacement: `📅 ${moment().add(1, "month").format("YYYY-MM-DD")}`,
                trigger: "~",
                action: (editor, cursor, metadata) => {
                    if (this.taskMetadata) {
                        this.taskMetadata.dueDate = moment().add(1, "month").toDate();
                    }
                    if (this.updateButtonState && this.dateButton) {
                        this.updateButtonState(this.dateButton, true);
                    }
                }
            }
        ];
    }
    getPrioritySuggestions() {
        return [
            {
                id: "priority-highest",
                label: t("Highest"),
                icon: "arrow-up",
                description: t("🔺 Highest priority"),
                replacement: "🔺",
                trigger: "!",
                action: (editor, cursor, metadata) => {
                    if (this.taskMetadata) {
                        this.taskMetadata.priority = 5;
                    }
                    if (this.updateButtonState && this.priorityButton) {
                        this.updateButtonState(this.priorityButton, true);
                    }
                }
            },
            {
                id: "priority-high",
                label: t("High"),
                icon: "arrow-up",
                description: t("⏫ High priority"),
                replacement: "⏫",
                trigger: "!",
                action: (editor, cursor, metadata) => {
                    if (this.taskMetadata) {
                        this.taskMetadata.priority = 4;
                    }
                    if (this.updateButtonState && this.priorityButton) {
                        this.updateButtonState(this.priorityButton, true);
                    }
                }
            },
            {
                id: "priority-medium",
                label: t("Medium"),
                icon: "minus",
                description: t("🔼 Medium priority"),
                replacement: "🔼",
                trigger: "!",
                action: (editor, cursor, metadata) => {
                    if (this.taskMetadata) {
                        this.taskMetadata.priority = 3;
                    }
                    if (this.updateButtonState && this.priorityButton) {
                        this.updateButtonState(this.priorityButton, true);
                    }
                }
            },
            {
                id: "priority-low",
                label: t("Low"),
                icon: "arrow-down",
                description: t("🔽 Low priority"),
                replacement: "🔽",
                trigger: "!",
                action: (editor, cursor, metadata) => {
                    if (this.taskMetadata) {
                        this.taskMetadata.priority = 2;
                    }
                    if (this.updateButtonState && this.priorityButton) {
                        this.updateButtonState(this.priorityButton, true);
                    }
                }
            },
            {
                id: "priority-lowest",
                label: t("Lowest"),
                icon: "arrow-down",
                description: t("⏬ Lowest priority"),
                replacement: "⏬",
                trigger: "!",
                action: (editor, cursor, metadata) => {
                    if (this.taskMetadata) {
                        this.taskMetadata.priority = 1;
                    }
                    if (this.updateButtonState && this.priorityButton) {
                        this.updateButtonState(this.priorityButton, true);
                    }
                }
            }
        ];
    }
    getTagSuggestions() {
        const commonTags = ["important", "urgent", "todo", "review", "idea", "question", "work", "personal"];
        return commonTags.map(tag => ({
            id: `tag-${tag}`,
            label: `#${tag}`,
            icon: "tag",
            description: t(`Add tag: ${tag}`),
            replacement: `#${tag}`,
            trigger: "#",
            action: (editor, cursor, metadata) => {
                if (this.taskMetadata) {
                    if (!this.taskMetadata.tags) {
                        this.taskMetadata.tags = [];
                    }
                    if (!this.taskMetadata.tags.includes(tag)) {
                        this.taskMetadata.tags.push(tag);
                    }
                }
                if (this.updateButtonState && this.tagsButton) {
                    this.updateButtonState(this.tagsButton, true);
                }
            }
        }));
    }
    getLocationSuggestions() {
        const suggestions = [];
        // Get the current settings
        const settings = this.plugin.settings.quickCapture;
        const dailyNoteSettings = settings.dailyNoteSettings || {};
        // Calculate the daily note path once
        const dateStr = moment().format(dailyNoteSettings.format || "YYYY-MM-DD");
        let dailyNotePath = dateStr + ".md";
        if (dailyNoteSettings.folder && dailyNoteSettings.folder.trim() !== "") {
            // Remove trailing slash if present
            const folder = dailyNoteSettings.folder.replace(/\/$/, "");
            dailyNotePath = `${folder}/${dateStr}.md`;
        }
        // Option 1: Fixed file (from settings)
        suggestions.push({
            id: "location-fixed",
            label: t("Fixed File"),
            icon: "file",
            description: settings.targetFile || "Quick Capture.md",
            replacement: "",
            trigger: "*",
            action: (editor, cursor, metadata) => {
                // Always use the current fixed file from settings
                const fixedPath = this.plugin.settings.quickCapture.targetFile || "Quick Capture.md";
                if (this.targetFileUpdater) {
                    this.targetFileUpdater(fixedPath);
                }
            }
        });
        // Option 2: Daily Note
        suggestions.push({
            id: "location-daily",
            label: t("Daily Note"),
            icon: "calendar-days",
            description: dailyNotePath,
            replacement: "",
            trigger: "*",
            action: (editor, cursor, metadata) => {
                // Recalculate daily note path to ensure it's current
                const currentSettings = this.plugin.settings.quickCapture.dailyNoteSettings || {};
                const currentDateStr = moment().format(currentSettings.format || "YYYY-MM-DD");
                let currentDailyPath = currentDateStr + ".md";
                if (currentSettings.folder && currentSettings.folder.trim() !== "") {
                    const folder = currentSettings.folder.replace(/\/$/, "");
                    currentDailyPath = `${folder}/${currentDateStr}.md`;
                }
                // Update the selected target path in the panel
                if (this.targetFileUpdater) {
                    this.targetFileUpdater(currentDailyPath);
                }
            }
        });
        // Additional quick option: Inbox
        suggestions.push({
            id: "location-inbox",
            label: t("Inbox"),
            icon: "inbox",
            description: t("Save to Inbox.md"),
            replacement: "",
            trigger: "*",
            action: (editor, cursor, metadata) => {
                if (this.targetFileUpdater) {
                    this.targetFileUpdater("Inbox.md");
                }
            }
        });
        return suggestions;
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
        // Create description element
        if (suggestion.description) {
            const descEl = el.createDiv("menu-item-description");
            descEl.textContent = suggestion.description;
        }
    }
    /**
     * Handle suggestion selection
     */
    selectSuggestion(suggestion, evt) {
        var _a, _b, _c, _d;
        const editor = (_a = this.context) === null || _a === void 0 ? void 0 : _a.editor;
        const start = (_b = this.context) === null || _b === void 0 ? void 0 : _b.start;
        const end = (_c = this.context) === null || _c === void 0 ? void 0 : _c.end;
        if (!editor || !start || !end)
            return;
        // Replace the entire trigger + query with the replacement text
        const view = editor.cm;
        if (!view) {
            // Fallback to old method if view is not available
            editor.replaceRange(suggestion.replacement, start, end);
        }
        else if ((_d = view.state) === null || _d === void 0 ? void 0 : _d.doc) {
            // Use CodeMirror 6 changes API
            const startOffset = view.state.doc.line(start.line + 1).from + start.ch;
            const endOffset = view.state.doc.line(end.line + 1).from + end.ch;
            view.dispatch({
                changes: {
                    from: startOffset,
                    to: endOffset,
                    insert: suggestion.replacement,
                },
                annotations: [Transaction.userEvent.of("input")],
            });
        }
        // Execute custom action if provided
        if (suggestion.action) {
            suggestion.action(editor, end, this.taskMetadata);
        }
        // Close this suggest
        this.close();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFzay1tZXRhZGF0YS1zdWdnZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGFzay1tZXRhZGF0YS1zdWdnZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFJTixhQUFhLEVBSWIsT0FBTyxFQUNQLE1BQU0sR0FDTixNQUFNLFVBQVUsQ0FBQztBQUVsQixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFFaEQsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBWTlDLE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxhQUE0QjtJQVVwRSxZQUFZLEdBQVEsRUFBRSxNQUE2QjtRQUNsRCxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFUSix1QkFBa0IsR0FBWSxLQUFLLENBQUM7UUFDcEMsaUJBQVksR0FBUSxJQUFJLENBQUM7UUFDekIsc0JBQWlCLEdBQVEsSUFBSSxDQUFDO1FBQzlCLGVBQVUsR0FBNkIsSUFBSSxDQUFDO1FBQzVDLG1CQUFjLEdBQTZCLElBQUksQ0FBQztRQUNoRCxlQUFVLEdBQTZCLElBQUksQ0FBQztRQUM1QyxzQkFBaUIsR0FBb0MsSUFBSSxDQUFDO1FBSWpFLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3RCLENBQUM7SUFFRDs7T0FFRztJQUNILHNCQUFzQixDQUNyQixRQUFpQixFQUNqQixRQUFjLEVBQ2QsaUJBQXVCLEVBQ3ZCLE9BSUMsRUFDRCxpQkFBMEM7UUFFMUMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLFFBQVEsQ0FBQztRQUNuQyxJQUFJLENBQUMsWUFBWSxHQUFHLFFBQVEsQ0FBQztRQUM3QixJQUFJLENBQUMsaUJBQWlCLEdBQUcsaUJBQWlCLENBQUM7UUFDM0MsSUFBSSxPQUFPLEVBQUU7WUFDWixJQUFJLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUM7WUFDckMsSUFBSSxDQUFDLGNBQWMsR0FBRyxPQUFPLENBQUMs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b24sXHJcblx0RWRpdG9yU3VnZ2VzdCxcclxuXHRFZGl0b3JTdWdnZXN0Q29udGV4dCxcclxuXHRFZGl0b3JTdWdnZXN0VHJpZ2dlckluZm8sXHJcblx0VEZpbGUsXHJcblx0c2V0SWNvbixcclxuXHRtb21lbnQsXHJcbn0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IEVkaXRvclZpZXcgfSBmcm9tIFwiQGNvZGVtaXJyb3Ivdmlld1wiO1xyXG5pbXBvcnQgeyBUcmFuc2FjdGlvbiB9IGZyb20gXCJAY29kZW1pcnJvci9zdGF0ZVwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCIuLi8uLi9pbmRleFwiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIi4uLy4uL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuXHJcbmludGVyZmFjZSBTdWdnZXN0T3B0aW9uIHtcclxuXHRpZDogc3RyaW5nO1xyXG5cdGxhYmVsOiBzdHJpbmc7XHJcblx0aWNvbjogc3RyaW5nO1xyXG5cdGRlc2NyaXB0aW9uOiBzdHJpbmc7XHJcblx0cmVwbGFjZW1lbnQ6IHN0cmluZztcclxuXHR0cmlnZ2VyPzogc3RyaW5nO1xyXG5cdGFjdGlvbj86IChlZGl0b3I6IEVkaXRvciwgY3Vyc29yOiBFZGl0b3JQb3NpdGlvbiwgbWV0YWRhdGE6IGFueSkgPT4gdm9pZDtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFF1aWNrQ2FwdHVyZVN1Z2dlc3QgZXh0ZW5kcyBFZGl0b3JTdWdnZXN0PFN1Z2dlc3RPcHRpb24+IHtcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbjtcclxuXHRwcml2YXRlIGlzUXVpY2tDYXB0dXJlTW9kZTogYm9vbGVhbiA9IGZhbHNlO1xyXG5cdHByaXZhdGUgdGFza01ldGFkYXRhOiBhbnkgPSBudWxsO1xyXG5cdHByaXZhdGUgdXBkYXRlQnV0dG9uU3RhdGU6IGFueSA9IG51bGw7XHJcblx0cHJpdmF0ZSBkYXRlQnV0dG9uOiBIVE1MQnV0dG9uRWxlbWVudCB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgcHJpb3JpdHlCdXR0b246IEhUTUxCdXR0b25FbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSB0YWdzQnV0dG9uOiBIVE1MQnV0dG9uRWxlbWVudCB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgdGFyZ2V0RmlsZVVwZGF0ZXI6ICgocGF0aDogc3RyaW5nKSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4pIHtcclxuXHRcdHN1cGVyKGFwcCk7XHJcblx0XHR0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNldCB0aGUgcXVpY2sgY2FwdHVyZSBjb250ZXh0XHJcblx0ICovXHJcblx0c2V0UXVpY2tDYXB0dXJlQ29udGV4dChcclxuXHRcdGlzQWN0aXZlOiBib29sZWFuLCBcclxuXHRcdG1ldGFkYXRhPzogYW55LCBcclxuXHRcdHVwZGF0ZUJ1dHRvblN0YXRlPzogYW55LFxyXG5cdFx0YnV0dG9ucz86IHtcclxuXHRcdFx0ZGF0ZUJ1dHRvbjogSFRNTEJ1dHRvbkVsZW1lbnQ7XHJcblx0XHRcdHByaW9yaXR5QnV0dG9uOiBIVE1MQnV0dG9uRWxlbWVudDtcclxuXHRcdFx0dGFnc0J1dHRvbjogSFRNTEJ1dHRvbkVsZW1lbnQ7XHJcblx0XHR9LFxyXG5cdFx0dGFyZ2V0RmlsZVVwZGF0ZXI/OiAocGF0aDogc3RyaW5nKSA9PiB2b2lkXHJcblx0KTogdm9pZCB7XHJcblx0XHR0aGlzLmlzUXVpY2tDYXB0dXJlTW9kZSA9IGlzQWN0aXZlO1xyXG5cdFx0dGhpcy50YXNrTWV0YWRhdGEgPSBtZXRhZGF0YTtcclxuXHRcdHRoaXMudXBkYXRlQnV0dG9uU3RhdGUgPSB1cGRhdGVCdXR0b25TdGF0ZTtcclxuXHRcdGlmIChidXR0b25zKSB7XHJcblx0XHRcdHRoaXMuZGF0ZUJ1dHRvbiA9IGJ1dHRvbnMuZGF0ZUJ1dHRvbjtcclxuXHRcdFx0dGhpcy5wcmlvcml0eUJ1dHRvbiA9IGJ1dHRvbnMucHJpb3JpdHlCdXR0b247XHJcblx0XHRcdHRoaXMudGFnc0J1dHRvbiA9IGJ1dHRvbnMudGFnc0J1dHRvbjtcclxuXHRcdH1cclxuXHRcdHRoaXMudGFyZ2V0RmlsZVVwZGF0ZXIgPSB0YXJnZXRGaWxlVXBkYXRlciB8fCBudWxsO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHRoZSB0cmlnZ2VyIHJlZ2V4IGZvciB0aGUgc3VnZ2VzdGlvblxyXG5cdCAqL1xyXG5cdG9uVHJpZ2dlcihcclxuXHRcdGN1cnNvcjogRWRpdG9yUG9zaXRpb24sXHJcblx0XHRlZGl0b3I6IEVkaXRvcixcclxuXHRcdGZpbGU6IFRGaWxlIHwgbnVsbFxyXG5cdCk6IEVkaXRvclN1Z2dlc3RUcmlnZ2VySW5mbyB8IG51bGwge1xyXG5cdFx0Ly8gT25seSB0cmlnZ2VyIGluIHF1aWNrIGNhcHR1cmUgbW9kZVxyXG5cdFx0aWYgKCF0aGlzLmlzUXVpY2tDYXB0dXJlTW9kZSkge1xyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDaGVjayBpZiB3ZSdyZSBpbiBhIHF1aWNrIGNhcHR1cmUgY29udGV4dFxyXG5cdFx0Y29uc3QgZWRpdG9yRWwgPSAoZWRpdG9yIGFzIGFueSkuY20/LmRvbSBhcyBIVE1MRWxlbWVudDtcclxuXHRcdGlmICghZWRpdG9yRWwgfHwgIWVkaXRvckVsLmNsb3Nlc3QoXCIucXVpY2stY2FwdHVyZS1wYW5lbFwiKSkge1xyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBHZXQgdGhlIGN1cnJlbnQgbGluZVxyXG5cdFx0Y29uc3QgbGluZSA9IGVkaXRvci5nZXRMaW5lKGN1cnNvci5saW5lKTtcclxuXHRcdFxyXG5cdFx0Ly8gRGVmaW5lIGFsbCBwb3NzaWJsZSB0cmlnZ2VyIGNoYXJhY3RlcnNcclxuXHRcdGNvbnN0IGFsbFRyaWdnZXJzID0gW1wiflwiLCBcIiFcIiwgXCIjXCIsIFwiKlwiLCBcIkBcIl07XHJcblx0XHRcclxuXHRcdC8vIExvb2sgYmFja3dhcmRzIGZyb20gY3Vyc29yIHRvIGZpbmQgYSB0cmlnZ2VyIGNoYXJhY3RlclxyXG5cdFx0Zm9yIChsZXQgaSA9IGN1cnNvci5jaCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcblx0XHRcdGNvbnN0IGNoYXIgPSBsaW5lLmNoYXJBdChpKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIElmIHdlIGZpbmQgYSB0cmlnZ2VyIGNoYXJhY3RlclxyXG5cdFx0XHRpZiAoYWxsVHJpZ2dlcnMuaW5jbHVkZXMoY2hhcikpIHtcclxuXHRcdFx0XHQvLyBDaGVjayBpZiB0aGVyZSdzIGEgc3BhY2Ugb3Igc3RhcnQgb2YgbGluZSBiZWZvcmUgaXRcclxuXHRcdFx0XHRpZiAoaSA9PT0gMCB8fCAvXFxzLy50ZXN0KGxpbmUuY2hhckF0KGkgLSAxKSkpIHtcclxuXHRcdFx0XHRcdC8vIEV4dHJhY3QgdGhlIHF1ZXJ5IHRleHQgYWZ0ZXIgdGhlIHRyaWdnZXJcclxuXHRcdFx0XHRcdGNvbnN0IHF1ZXJ5ID0gbGluZS5zdWJzdHJpbmcoaSArIDEsIGN1cnNvci5jaCk7XHJcblx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRcdHN0YXJ0OiB7IGxpbmU6IGN1cnNvci5saW5lLCBjaDogaSB9LFxyXG5cdFx0XHRcdFx0XHRlbmQ6IGN1cnNvcixcclxuXHRcdFx0XHRcdFx0cXVlcnk6IGNoYXIgKyBxdWVyeSwgLy8gSW5jbHVkZSB0cmlnZ2VyIGNoYXIgYW5kIHF1ZXJ5IHRleHRcclxuXHRcdFx0XHRcdH07XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIElmIHRoZXJlJ3Mgbm8gc3BhY2UgYmVmb3JlIHRoZSB0cmlnZ2VyLCBkb24ndCB0cmlnZ2VyXHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdC8vIFN0b3Agc2VhcmNoaW5nIGlmIHdlIGhpdCBhIHNwYWNlIG9yIHNwZWNpYWwgY2hhcmFjdGVyIChleGNlcHQgZm9yIHZhbGlkIHF1ZXJ5IGNoYXJzKVxyXG5cdFx0XHRpZiAoL1tcXHN+ISMqQF0vLnRlc3QoY2hhcikpIHtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBudWxsO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHN1Z2dlc3Rpb25zIGJhc2VkIG9uIHRoZSB0cmlnZ2VyXHJcblx0ICovXHJcblx0Z2V0U3VnZ2VzdGlvbnMoY29udGV4dDogRWRpdG9yU3VnZ2VzdENvbnRleHQpOiBTdWdnZXN0T3B0aW9uW10ge1xyXG5cdFx0Ly8gRXh0cmFjdCB0cmlnZ2VyIGNoYXJhY3RlciBhbmQgc2VhcmNoIHF1ZXJ5XHJcblx0XHRjb25zdCB0cmlnZ2VyQ2hhciA9IGNvbnRleHQucXVlcnkuY2hhckF0KDApO1xyXG5cdFx0Y29uc3Qgc2VhcmNoUXVlcnkgPSBjb250ZXh0LnF1ZXJ5LnN1YnN0cmluZygxKS50b0xvd2VyQ2FzZSgpO1xyXG5cclxuXHRcdGxldCBzdWdnZXN0aW9uczogU3VnZ2VzdE9wdGlvbltdID0gW107XHJcblxyXG5cdFx0c3dpdGNoICh0cmlnZ2VyQ2hhcikge1xyXG5cdFx0XHRjYXNlIFwiflwiOlxyXG5cdFx0XHRcdHN1Z2dlc3Rpb25zID0gdGhpcy5nZXREYXRlU3VnZ2VzdGlvbnMoKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBcIiFcIjpcclxuXHRcdFx0XHRzdWdnZXN0aW9ucyA9IHRoaXMuZ2V0UHJpb3JpdHlTdWdnZXN0aW9ucygpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwiI1wiOlxyXG5cdFx0XHRcdHN1Z2dlc3Rpb25zID0gdGhpcy5nZXRUYWdTdWdnZXN0aW9ucygpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwiKlwiOlxyXG5cdFx0XHRjYXNlIFwiQFwiOlxyXG5cdFx0XHRcdHN1Z2dlc3Rpb25zID0gdGhpcy5nZXRMb2NhdGlvblN1Z2dlc3Rpb25zKCk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0cmV0dXJuIFtdO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEZpbHRlciBzdWdnZXN0aW9ucyBiYXNlZCBvbiBzZWFyY2ggcXVlcnkgaWYgcHJlc2VudFxyXG5cdFx0aWYgKHNlYXJjaFF1ZXJ5KSB7XHJcblx0XHRcdHN1Z2dlc3Rpb25zID0gc3VnZ2VzdGlvbnMuZmlsdGVyKHMgPT4gXHJcblx0XHRcdFx0cy5sYWJlbC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHNlYXJjaFF1ZXJ5KSB8fFxyXG5cdFx0XHRcdHMuZGVzY3JpcHRpb24udG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhzZWFyY2hRdWVyeSlcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gc3VnZ2VzdGlvbnM7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldERhdGVTdWdnZXN0aW9ucygpOiBTdWdnZXN0T3B0aW9uW10ge1xyXG5cdFx0cmV0dXJuIFtcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGlkOiBcImRhdGUtdG9kYXlcIixcclxuXHRcdFx0XHRsYWJlbDogdChcIlRvZGF5XCIpLFxyXG5cdFx0XHRcdGljb246IFwiY2FsZW5kYXJcIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogbW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKSxcclxuXHRcdFx0XHRyZXBsYWNlbWVudDogYPCfk4UgJHttb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpfWAsXHJcblx0XHRcdFx0dHJpZ2dlcjogXCJ+XCIsXHJcblx0XHRcdFx0YWN0aW9uOiAoZWRpdG9yLCBjdXJzb3IsIG1ldGFkYXRhKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAodGhpcy50YXNrTWV0YWRhdGEpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEuZHVlRGF0ZSA9IG1vbWVudCgpLnRvRGF0ZSgpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0aWYgKHRoaXMudXBkYXRlQnV0dG9uU3RhdGUgJiYgdGhpcy5kYXRlQnV0dG9uKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMudXBkYXRlQnV0dG9uU3RhdGUodGhpcy5kYXRlQnV0dG9uLCB0cnVlKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRpZDogXCJkYXRlLXRvbW9ycm93XCIsXHJcblx0XHRcdFx0bGFiZWw6IHQoXCJUb21vcnJvd1wiKSxcclxuXHRcdFx0XHRpY29uOiBcImNhbGVuZGFyXCIsXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IG1vbWVudCgpLmFkZCgxLCBcImRheVwiKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpLFxyXG5cdFx0XHRcdHJlcGxhY2VtZW50OiBg8J+ThSAke21vbWVudCgpLmFkZCgxLCBcImRheVwiKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpfWAsXHJcblx0XHRcdFx0dHJpZ2dlcjogXCJ+XCIsXHJcblx0XHRcdFx0YWN0aW9uOiAoZWRpdG9yLCBjdXJzb3IsIG1ldGFkYXRhKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAodGhpcy50YXNrTWV0YWRhdGEpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEuZHVlRGF0ZSA9IG1vbWVudCgpLmFkZCgxLCBcImRheVwiKS50b0RhdGUoKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGlmICh0aGlzLnVwZGF0ZUJ1dHRvblN0YXRlICYmIHRoaXMuZGF0ZUJ1dHRvbikge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnVwZGF0ZUJ1dHRvblN0YXRlKHRoaXMuZGF0ZUJ1dHRvbiwgdHJ1ZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0aWQ6IFwiZGF0ZS1uZXh0LXdlZWtcIixcclxuXHRcdFx0XHRsYWJlbDogdChcIk5leHQgd2Vla1wiKSxcclxuXHRcdFx0XHRpY29uOiBcImNhbGVuZGFyXCIsXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IG1vbWVudCgpLmFkZCgxLCBcIndlZWtcIikuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKSxcclxuXHRcdFx0XHRyZXBsYWNlbWVudDogYPCfk4UgJHttb21lbnQoKS5hZGQoMSwgXCJ3ZWVrXCIpLmZvcm1hdChcIllZWVktTU0tRERcIil9YCxcclxuXHRcdFx0XHR0cmlnZ2VyOiBcIn5cIixcclxuXHRcdFx0XHRhY3Rpb246IChlZGl0b3IsIGN1cnNvciwgbWV0YWRhdGEpID0+IHtcclxuXHRcdFx0XHRcdGlmICh0aGlzLnRhc2tNZXRhZGF0YSkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS5kdWVEYXRlID0gbW9tZW50KCkuYWRkKDEsIFwid2Vla1wiKS50b0RhdGUoKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGlmICh0aGlzLnVwZGF0ZUJ1dHRvblN0YXRlICYmIHRoaXMuZGF0ZUJ1dHRvbikge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnVwZGF0ZUJ1dHRvblN0YXRlKHRoaXMuZGF0ZUJ1dHRvbiwgdHJ1ZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0aWQ6IFwiZGF0ZS1uZXh0LW1vbnRoXCIsXHJcblx0XHRcdFx0bGFiZWw6IHQoXCJOZXh0IG1vbnRoXCIpLFxyXG5cdFx0XHRcdGljb246IFwiY2FsZW5kYXJcIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogbW9tZW50KCkuYWRkKDEsIFwibW9udGhcIikuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKSxcclxuXHRcdFx0XHRyZXBsYWNlbWVudDogYPCfk4UgJHttb21lbnQoKS5hZGQoMSwgXCJtb250aFwiKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpfWAsXHJcblx0XHRcdFx0dHJpZ2dlcjogXCJ+XCIsXHJcblx0XHRcdFx0YWN0aW9uOiAoZWRpdG9yLCBjdXJzb3IsIG1ldGFkYXRhKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAodGhpcy50YXNrTWV0YWRhdGEpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEuZHVlRGF0ZSA9IG1vbWVudCgpLmFkZCgxLCBcIm1vbnRoXCIpLnRvRGF0ZSgpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0aWYgKHRoaXMudXBkYXRlQnV0dG9uU3RhdGUgJiYgdGhpcy5kYXRlQnV0dG9uKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMudXBkYXRlQnV0dG9uU3RhdGUodGhpcy5kYXRlQnV0dG9uLCB0cnVlKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdF07XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldFByaW9yaXR5U3VnZ2VzdGlvbnMoKTogU3VnZ2VzdE9wdGlvbltdIHtcclxuXHRcdHJldHVybiBbXHJcblx0XHRcdHtcclxuXHRcdFx0XHRpZDogXCJwcmlvcml0eS1oaWdoZXN0XCIsXHJcblx0XHRcdFx0bGFiZWw6IHQoXCJIaWdoZXN0XCIpLFxyXG5cdFx0XHRcdGljb246IFwiYXJyb3ctdXBcIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogdChcIvCflLogSGlnaGVzdCBwcmlvcml0eVwiKSxcclxuXHRcdFx0XHRyZXBsYWNlbWVudDogXCLwn5S6XCIsXHJcblx0XHRcdFx0dHJpZ2dlcjogXCIhXCIsXHJcblx0XHRcdFx0YWN0aW9uOiAoZWRpdG9yLCBjdXJzb3IsIG1ldGFkYXRhKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAodGhpcy50YXNrTWV0YWRhdGEpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEucHJpb3JpdHkgPSA1O1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0aWYgKHRoaXMudXBkYXRlQnV0dG9uU3RhdGUgJiYgdGhpcy5wcmlvcml0eUJ1dHRvbikge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnVwZGF0ZUJ1dHRvblN0YXRlKHRoaXMucHJpb3JpdHlCdXR0b24sIHRydWUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGlkOiBcInByaW9yaXR5LWhpZ2hcIixcclxuXHRcdFx0XHRsYWJlbDogdChcIkhpZ2hcIiksXHJcblx0XHRcdFx0aWNvbjogXCJhcnJvdy11cFwiLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiB0KFwi4o+rIEhpZ2ggcHJpb3JpdHlcIiksXHJcblx0XHRcdFx0cmVwbGFjZW1lbnQ6IFwi4o+rXCIsXHJcblx0XHRcdFx0dHJpZ2dlcjogXCIhXCIsXHJcblx0XHRcdFx0YWN0aW9uOiAoZWRpdG9yLCBjdXJzb3IsIG1ldGFkYXRhKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAodGhpcy50YXNrTWV0YWRhdGEpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEucHJpb3JpdHkgPSA0O1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0aWYgKHRoaXMudXBkYXRlQnV0dG9uU3RhdGUgJiYgdGhpcy5wcmlvcml0eUJ1dHRvbikge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnVwZGF0ZUJ1dHRvblN0YXRlKHRoaXMucHJpb3JpdHlCdXR0b24sIHRydWUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGlkOiBcInByaW9yaXR5LW1lZGl1bVwiLFxyXG5cdFx0XHRcdGxhYmVsOiB0KFwiTWVkaXVtXCIpLFxyXG5cdFx0XHRcdGljb246IFwibWludXNcIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogdChcIvCflLwgTWVkaXVtIHByaW9yaXR5XCIpLFxyXG5cdFx0XHRcdHJlcGxhY2VtZW50OiBcIvCflLxcIixcclxuXHRcdFx0XHR0cmlnZ2VyOiBcIiFcIixcclxuXHRcdFx0XHRhY3Rpb246IChlZGl0b3IsIGN1cnNvciwgbWV0YWRhdGEpID0+IHtcclxuXHRcdFx0XHRcdGlmICh0aGlzLnRhc2tNZXRhZGF0YSkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS5wcmlvcml0eSA9IDM7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRpZiAodGhpcy51cGRhdGVCdXR0b25TdGF0ZSAmJiB0aGlzLnByaW9yaXR5QnV0dG9uKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMudXBkYXRlQnV0dG9uU3RhdGUodGhpcy5wcmlvcml0eUJ1dHRvbiwgdHJ1ZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0aWQ6IFwicHJpb3JpdHktbG93XCIsXHJcblx0XHRcdFx0bGFiZWw6IHQoXCJMb3dcIiksXHJcblx0XHRcdFx0aWNvbjogXCJhcnJvdy1kb3duXCIsXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IHQoXCLwn5S9IExvdyBwcmlvcml0eVwiKSxcclxuXHRcdFx0XHRyZXBsYWNlbWVudDogXCLwn5S9XCIsXHJcblx0XHRcdFx0dHJpZ2dlcjogXCIhXCIsXHJcblx0XHRcdFx0YWN0aW9uOiAoZWRpdG9yLCBjdXJzb3IsIG1ldGFkYXRhKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAodGhpcy50YXNrTWV0YWRhdGEpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEucHJpb3JpdHkgPSAyO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0aWYgKHRoaXMudXBkYXRlQnV0dG9uU3RhdGUgJiYgdGhpcy5wcmlvcml0eUJ1dHRvbikge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnVwZGF0ZUJ1dHRvblN0YXRlKHRoaXMucHJpb3JpdHlCdXR0b24sIHRydWUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGlkOiBcInByaW9yaXR5LWxvd2VzdFwiLFxyXG5cdFx0XHRcdGxhYmVsOiB0KFwiTG93ZXN0XCIpLFxyXG5cdFx0XHRcdGljb246IFwiYXJyb3ctZG93blwiLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiB0KFwi4o+sIExvd2VzdCBwcmlvcml0eVwiKSxcclxuXHRcdFx0XHRyZXBsYWNlbWVudDogXCLij6xcIixcclxuXHRcdFx0XHR0cmlnZ2VyOiBcIiFcIixcclxuXHRcdFx0XHRhY3Rpb246IChlZGl0b3IsIGN1cnNvciwgbWV0YWRhdGEpID0+IHtcclxuXHRcdFx0XHRcdGlmICh0aGlzLnRhc2tNZXRhZGF0YSkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnRhc2tNZXRhZGF0YS5wcmlvcml0eSA9IDE7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRpZiAodGhpcy51cGRhdGVCdXR0b25TdGF0ZSAmJiB0aGlzLnByaW9yaXR5QnV0dG9uKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMudXBkYXRlQnV0dG9uU3RhdGUodGhpcy5wcmlvcml0eUJ1dHRvbiwgdHJ1ZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRdO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBnZXRUYWdTdWdnZXN0aW9ucygpOiBTdWdnZXN0T3B0aW9uW10ge1xyXG5cdFx0Y29uc3QgY29tbW9uVGFncyA9IFtcImltcG9ydGFudFwiLCBcInVyZ2VudFwiLCBcInRvZG9cIiwgXCJyZXZpZXdcIiwgXCJpZGVhXCIsIFwicXVlc3Rpb25cIiwgXCJ3b3JrXCIsIFwicGVyc29uYWxcIl07XHJcblx0XHRcclxuXHRcdHJldHVybiBjb21tb25UYWdzLm1hcCh0YWcgPT4gKHtcclxuXHRcdFx0aWQ6IGB0YWctJHt0YWd9YCxcclxuXHRcdFx0bGFiZWw6IGAjJHt0YWd9YCxcclxuXHRcdFx0aWNvbjogXCJ0YWdcIixcclxuXHRcdFx0ZGVzY3JpcHRpb246IHQoYEFkZCB0YWc6ICR7dGFnfWApLFxyXG5cdFx0XHRyZXBsYWNlbWVudDogYCMke3RhZ31gLFxyXG5cdFx0XHR0cmlnZ2VyOiBcIiNcIixcclxuXHRcdFx0YWN0aW9uOiAoZWRpdG9yLCBjdXJzb3IsIG1ldGFkYXRhKSA9PiB7XHJcblx0XHRcdFx0aWYgKHRoaXMudGFza01ldGFkYXRhKSB7XHJcblx0XHRcdFx0XHRpZiAoIXRoaXMudGFza01ldGFkYXRhLnRhZ3MpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEudGFncyA9IFtdO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0aWYgKCF0aGlzLnRhc2tNZXRhZGF0YS50YWdzLmluY2x1ZGVzKHRhZykpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy50YXNrTWV0YWRhdGEudGFncy5wdXNoKHRhZyk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGlmICh0aGlzLnVwZGF0ZUJ1dHRvblN0YXRlICYmIHRoaXMudGFnc0J1dHRvbikge1xyXG5cdFx0XHRcdFx0dGhpcy51cGRhdGVCdXR0b25TdGF0ZSh0aGlzLnRhZ3NCdXR0b24sIHRydWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSkpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBnZXRMb2NhdGlvblN1Z2dlc3Rpb25zKCk6IFN1Z2dlc3RPcHRpb25bXSB7XHJcblx0XHRjb25zdCBzdWdnZXN0aW9uczogU3VnZ2VzdE9wdGlvbltdID0gW107XHJcblx0XHRcclxuXHRcdC8vIEdldCB0aGUgY3VycmVudCBzZXR0aW5nc1xyXG5cdFx0Y29uc3Qgc2V0dGluZ3MgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmU7XHJcblx0XHRjb25zdCBkYWlseU5vdGVTZXR0aW5ncyA9IHNldHRpbmdzLmRhaWx5Tm90ZVNldHRpbmdzIHx8IHt9O1xyXG5cdFx0XHJcblx0XHQvLyBDYWxjdWxhdGUgdGhlIGRhaWx5IG5vdGUgcGF0aCBvbmNlXHJcblx0XHRjb25zdCBkYXRlU3RyID0gbW9tZW50KCkuZm9ybWF0KGRhaWx5Tm90ZVNldHRpbmdzLmZvcm1hdCB8fCBcIllZWVktTU0tRERcIik7XHJcblx0XHRsZXQgZGFpbHlOb3RlUGF0aCA9IGRhdGVTdHIgKyBcIi5tZFwiO1xyXG5cdFx0aWYgKGRhaWx5Tm90ZVNldHRpbmdzLmZvbGRlciAmJiBkYWlseU5vdGVTZXR0aW5ncy5mb2xkZXIudHJpbSgpICE9PSBcIlwiKSB7XHJcblx0XHRcdC8vIFJlbW92ZSB0cmFpbGluZyBzbGFzaCBpZiBwcmVzZW50XHJcblx0XHRcdGNvbnN0IGZvbGRlciA9IGRhaWx5Tm90ZVNldHRpbmdzLmZvbGRlci5yZXBsYWNlKC9cXC8kLywgXCJcIik7XHJcblx0XHRcdGRhaWx5Tm90ZVBhdGggPSBgJHtmb2xkZXJ9LyR7ZGF0ZVN0cn0ubWRgO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvLyBPcHRpb24gMTogRml4ZWQgZmlsZSAoZnJvbSBzZXR0aW5ncylcclxuXHRcdHN1Z2dlc3Rpb25zLnB1c2goe1xyXG5cdFx0XHRpZDogXCJsb2NhdGlvbi1maXhlZFwiLFxyXG5cdFx0XHRsYWJlbDogdChcIkZpeGVkIEZpbGVcIiksXHJcblx0XHRcdGljb246IFwiZmlsZVwiLFxyXG5cdFx0XHRkZXNjcmlwdGlvbjogc2V0dGluZ3MudGFyZ2V0RmlsZSB8fCBcIlF1aWNrIENhcHR1cmUubWRcIixcclxuXHRcdFx0cmVwbGFjZW1lbnQ6IFwiXCIsXHJcblx0XHRcdHRyaWdnZXI6IFwiKlwiLFxyXG5cdFx0XHRhY3Rpb246IChlZGl0b3IsIGN1cnNvciwgbWV0YWRhdGEpID0+IHtcclxuXHRcdFx0XHQvLyBBbHdheXMgdXNlIHRoZSBjdXJyZW50IGZpeGVkIGZpbGUgZnJvbSBzZXR0aW5nc1xyXG5cdFx0XHRcdGNvbnN0IGZpeGVkUGF0aCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZS50YXJnZXRGaWxlIHx8IFwiUXVpY2sgQ2FwdHVyZS5tZFwiO1xyXG5cdFx0XHRcdGlmICh0aGlzLnRhcmdldEZpbGVVcGRhdGVyKSB7XHJcblx0XHRcdFx0XHR0aGlzLnRhcmdldEZpbGVVcGRhdGVyKGZpeGVkUGF0aCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBPcHRpb24gMjogRGFpbHkgTm90ZVxyXG5cdFx0c3VnZ2VzdGlvbnMucHVzaCh7XHJcblx0XHRcdGlkOiBcImxvY2F0aW9uLWRhaWx5XCIsXHJcblx0XHRcdGxhYmVsOiB0KFwiRGFpbHkgTm90ZVwiKSxcclxuXHRcdFx0aWNvbjogXCJjYWxlbmRhci1kYXlzXCIsXHJcblx0XHRcdGRlc2NyaXB0aW9uOiBkYWlseU5vdGVQYXRoLFxyXG5cdFx0XHRyZXBsYWNlbWVudDogXCJcIixcclxuXHRcdFx0dHJpZ2dlcjogXCIqXCIsXHJcblx0XHRcdGFjdGlvbjogKGVkaXRvciwgY3Vyc29yLCBtZXRhZGF0YSkgPT4ge1xyXG5cdFx0XHRcdC8vIFJlY2FsY3VsYXRlIGRhaWx5IG5vdGUgcGF0aCB0byBlbnN1cmUgaXQncyBjdXJyZW50XHJcblx0XHRcdFx0Y29uc3QgY3VycmVudFNldHRpbmdzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLmRhaWx5Tm90ZVNldHRpbmdzIHx8IHt9O1xyXG5cdFx0XHRcdGNvbnN0IGN1cnJlbnREYXRlU3RyID0gbW9tZW50KCkuZm9ybWF0KGN1cnJlbnRTZXR0aW5ncy5mb3JtYXQgfHwgXCJZWVlZLU1NLUREXCIpO1xyXG5cdFx0XHRcdGxldCBjdXJyZW50RGFpbHlQYXRoID0gY3VycmVudERhdGVTdHIgKyBcIi5tZFwiO1xyXG5cdFx0XHRcdGlmIChjdXJyZW50U2V0dGluZ3MuZm9sZGVyICYmIGN1cnJlbnRTZXR0aW5ncy5mb2xkZXIudHJpbSgpICE9PSBcIlwiKSB7XHJcblx0XHRcdFx0XHRjb25zdCBmb2xkZXIgPSBjdXJyZW50U2V0dGluZ3MuZm9sZGVyLnJlcGxhY2UoL1xcLyQvLCBcIlwiKTtcclxuXHRcdFx0XHRcdGN1cnJlbnREYWlseVBhdGggPSBgJHtmb2xkZXJ9LyR7Y3VycmVudERhdGVTdHJ9Lm1kYDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Ly8gVXBkYXRlIHRoZSBzZWxlY3RlZCB0YXJnZXQgcGF0aCBpbiB0aGUgcGFuZWxcclxuXHRcdFx0XHRpZiAodGhpcy50YXJnZXRGaWxlVXBkYXRlcikge1xyXG5cdFx0XHRcdFx0dGhpcy50YXJnZXRGaWxlVXBkYXRlcihjdXJyZW50RGFpbHlQYXRoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEFkZGl0aW9uYWwgcXVpY2sgb3B0aW9uOiBJbmJveFxyXG5cdFx0c3VnZ2VzdGlvbnMucHVzaCh7XHJcblx0XHRcdGlkOiBcImxvY2F0aW9uLWluYm94XCIsXHJcblx0XHRcdGxhYmVsOiB0KFwiSW5ib3hcIiksXHJcblx0XHRcdGljb246IFwiaW5ib3hcIixcclxuXHRcdFx0ZGVzY3JpcHRpb246IHQoXCJTYXZlIHRvIEluYm94Lm1kXCIpLFxyXG5cdFx0XHRyZXBsYWNlbWVudDogXCJcIixcclxuXHRcdFx0dHJpZ2dlcjogXCIqXCIsXHJcblx0XHRcdGFjdGlvbjogKGVkaXRvciwgY3Vyc29yLCBtZXRhZGF0YSkgPT4ge1xyXG5cdFx0XHRcdGlmICh0aGlzLnRhcmdldEZpbGVVcGRhdGVyKSB7XHJcblx0XHRcdFx0XHR0aGlzLnRhcmdldEZpbGVVcGRhdGVyKFwiSW5ib3gubWRcIik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gc3VnZ2VzdGlvbnM7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW5kZXIgc3VnZ2VzdGlvbiB1c2luZyBPYnNpZGlhbiBNZW51IERPTSBzdHJ1Y3R1cmVcclxuXHQgKi9cclxuXHRyZW5kZXJTdWdnZXN0aW9uKHN1Z2dlc3Rpb246IFN1Z2dlc3RPcHRpb24sIGVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xyXG5cdFx0ZWwuYWRkQ2xhc3MoXCJtZW51LWl0ZW1cIik7XHJcblx0XHRlbC5hZGRDbGFzcyhcInRhcHBhYmxlXCIpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBpY29uIGVsZW1lbnRcclxuXHRcdGNvbnN0IGljb25FbCA9IGVsLmNyZWF0ZURpdihcIm1lbnUtaXRlbS1pY29uXCIpO1xyXG5cdFx0c2V0SWNvbihpY29uRWwsIHN1Z2dlc3Rpb24uaWNvbik7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIHRpdGxlIGVsZW1lbnRcclxuXHRcdGNvbnN0IHRpdGxlRWwgPSBlbC5jcmVhdGVEaXYoXCJtZW51LWl0ZW0tdGl0bGVcIik7XHJcblx0XHR0aXRsZUVsLnRleHRDb250ZW50ID0gc3VnZ2VzdGlvbi5sYWJlbDtcclxuXHJcblx0XHQvLyBDcmVhdGUgZGVzY3JpcHRpb24gZWxlbWVudFxyXG5cdFx0aWYgKHN1Z2dlc3Rpb24uZGVzY3JpcHRpb24pIHtcclxuXHRcdFx0Y29uc3QgZGVzY0VsID0gZWwuY3JlYXRlRGl2KFwibWVudS1pdGVtLWRlc2NyaXB0aW9uXCIpO1xyXG5cdFx0XHRkZXNjRWwudGV4dENvbnRlbnQgPSBzdWdnZXN0aW9uLmRlc2NyaXB0aW9uO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSGFuZGxlIHN1Z2dlc3Rpb24gc2VsZWN0aW9uXHJcblx0ICovXHJcblx0c2VsZWN0U3VnZ2VzdGlvbihcclxuXHRcdHN1Z2dlc3Rpb246IFN1Z2dlc3RPcHRpb24sXHJcblx0XHRldnQ6IE1vdXNlRXZlbnQgfCBLZXlib2FyZEV2ZW50XHJcblx0KTogdm9pZCB7XHJcblx0XHRjb25zdCBlZGl0b3IgPSB0aGlzLmNvbnRleHQ/LmVkaXRvcjtcclxuXHRcdGNvbnN0IHN0YXJ0ID0gdGhpcy5jb250ZXh0Py5zdGFydDtcclxuXHRcdGNvbnN0IGVuZCA9IHRoaXMuY29udGV4dD8uZW5kO1xyXG5cclxuXHRcdGlmICghZWRpdG9yIHx8ICFzdGFydCB8fCAhZW5kKSByZXR1cm47XHJcblxyXG5cdFx0Ly8gUmVwbGFjZSB0aGUgZW50aXJlIHRyaWdnZXIgKyBxdWVyeSB3aXRoIHRoZSByZXBsYWNlbWVudCB0ZXh0XHJcblx0XHRjb25zdCB2aWV3ID0gKGVkaXRvciBhcyBhbnkpLmNtIGFzIEVkaXRvclZpZXc7XHJcblx0XHRpZiAoIXZpZXcpIHtcclxuXHRcdFx0Ly8gRmFsbGJhY2sgdG8gb2xkIG1ldGhvZCBpZiB2aWV3IGlzIG5vdCBhdmFpbGFibGVcclxuXHRcdFx0ZWRpdG9yLnJlcGxhY2VSYW5nZShzdWdnZXN0aW9uLnJlcGxhY2VtZW50LCBzdGFydCwgZW5kKTtcclxuXHRcdH0gZWxzZSBpZiAodmlldy5zdGF0ZT8uZG9jKSB7XHJcblx0XHRcdC8vIFVzZSBDb2RlTWlycm9yIDYgY2hhbmdlcyBBUElcclxuXHRcdFx0Y29uc3Qgc3RhcnRPZmZzZXQgPSB2aWV3LnN0YXRlLmRvYy5saW5lKHN0YXJ0LmxpbmUgKyAxKS5mcm9tICsgc3RhcnQuY2g7XHJcblx0XHRcdGNvbnN0IGVuZE9mZnNldCA9IHZpZXcuc3RhdGUuZG9jLmxpbmUoZW5kLmxpbmUgKyAxKS5mcm9tICsgZW5kLmNoO1xyXG5cdFx0XHRcclxuXHRcdFx0dmlldy5kaXNwYXRjaCh7XHJcblx0XHRcdFx0Y2hhbmdlczoge1xyXG5cdFx0XHRcdFx0ZnJvbTogc3RhcnRPZmZzZXQsXHJcblx0XHRcdFx0XHR0bzogZW5kT2Zmc2V0LFxyXG5cdFx0XHRcdFx0aW5zZXJ0OiBzdWdnZXN0aW9uLnJlcGxhY2VtZW50LFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0YW5ub3RhdGlvbnM6IFtUcmFuc2FjdGlvbi51c2VyRXZlbnQub2YoXCJpbnB1dFwiKV0sXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEV4ZWN1dGUgY3VzdG9tIGFjdGlvbiBpZiBwcm92aWRlZFxyXG5cdFx0aWYgKHN1Z2dlc3Rpb24uYWN0aW9uKSB7XHJcblx0XHRcdHN1Z2dlc3Rpb24uYWN0aW9uKGVkaXRvciwgZW5kLCB0aGlzLnRhc2tNZXRhZGF0YSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2xvc2UgdGhpcyBzdWdnZXN0XHJcblx0XHR0aGlzLmNsb3NlKCk7XHJcblx0fVxyXG59Il19