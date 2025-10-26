import { EditorSuggest, setIcon, } from "obsidian";
import { getSuggestOptionsByTrigger } from "./SpecialCharacterSuggests";
import "@/styles/universal-suggest.css";
/**
 * Universal EditorSuggest that handles multiple special characters
 * and provides dynamic priority management
 */
export class UniversalEditorSuggest extends EditorSuggest {
    constructor(app, plugin, config) {
        super(app);
        this.suggestOptions = [];
        this.isEnabled = false;
        this.plugin = plugin;
        this.config = config;
        this.initializeSuggestOptions();
    }
    /**
     * Initialize suggest options for all supported special characters
     */
    initializeSuggestOptions() {
        // Initialize with empty array - options will be loaded dynamically
        this.suggestOptions = [];
    }
    /**
     * Enable this suggest instance
     */
    enable() {
        this.isEnabled = true;
    }
    /**
     * Disable this suggest instance
     */
    disable() {
        this.isEnabled = false;
    }
    /**
     * Check if suggestion should be triggered
     */
    onTrigger(cursor, editor, file) {
        // Only trigger if enabled
        if (!this.isEnabled) {
            return null;
        }
        // Apply context filter if provided
        if (this.config.contextFilter &&
            !this.config.contextFilter(editor, file)) {
            return null;
        }
        // Get the current line
        const line = editor.getLine(cursor.line);
        // Check if cursor is right after any of our trigger characters
        if (cursor.ch > 0) {
            const charBefore = line.charAt(cursor.ch - 1);
            if (this.config.triggerChars.includes(charBefore)) {
                return {
                    start: { line: cursor.line, ch: cursor.ch - 1 },
                    end: cursor,
                    query: charBefore,
                };
            }
        }
        return null;
    }
    /**
     * Get suggestions based on the trigger character
     */
    getSuggestions(context) {
        const triggerChar = context.query;
        // Get dynamic suggestions based on trigger character
        return getSuggestOptionsByTrigger(triggerChar, this.plugin);
    }
    /**
     * Render suggestion in the popup
     */
    renderSuggestion(suggestion, el) {
        const container = el.createDiv({ cls: "universal-suggest-item" });
        // Icon
        container.createDiv({ cls: "universal-suggest-container" }, (el) => {
            const icon = el.createDiv({ cls: "universal-suggest-icon" });
            setIcon(icon, suggestion.icon);
            el.createDiv({
                cls: "universal-suggest-label",
                text: suggestion.label,
            });
        });
    }
    /**
     * Handle suggestion selection
     */
    selectSuggestion(suggestion, evt) {
        var _a, _b;
        const editor = (_a = this.context) === null || _a === void 0 ? void 0 : _a.editor;
        const cursor = (_b = this.context) === null || _b === void 0 ? void 0 : _b.end;
        if (!editor || !cursor)
            return;
        // Replace the trigger character with the replacement
        const startPos = { line: cursor.line, ch: cursor.ch - 1 };
        const endPos = cursor;
        editor.replaceRange(suggestion.replacement, startPos, endPos);
        // Move cursor to after the replacement
        const newCursor = {
            line: cursor.line,
            ch: cursor.ch - 1 + suggestion.replacement.length,
        };
        editor.setCursor(newCursor);
        // Execute custom action if provided
        if (suggestion.action) {
            suggestion.action(editor, newCursor);
        }
    }
    /**
     * Add a custom suggest option
     */
    addSuggestOption(option) {
        this.suggestOptions.push(option);
        if (!this.config.triggerChars.includes(option.trigger)) {
            this.config.triggerChars.push(option.trigger);
        }
    }
    /**
     * Remove a suggest option by id
     */
    removeSuggestOption(id) {
        this.suggestOptions = this.suggestOptions.filter((option) => option.id !== id);
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return Object.assign({}, this.config);
    }
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = Object.assign(Object.assign({}, this.config), newConfig);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVW5pdmVyc2FsRWRpdG9yU3VnZ2VzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlVuaXZlcnNhbEVkaXRvclN1Z2dlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUlOLGFBQWEsRUFJYixPQUFPLEdBQ1AsTUFBTSxVQUFVLENBQUM7QUFHbEIsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDeEUsT0FBTyxnQ0FBZ0MsQ0FBQztBQWtCeEM7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLHNCQUF1QixTQUFRLGFBQTRCO0lBTXZFLFlBQ0MsR0FBUSxFQUNSLE1BQTZCLEVBQzdCLE1BQThCO1FBRTlCLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQVJKLG1CQUFjLEdBQW9CLEVBQUUsQ0FBQztRQUNyQyxjQUFTLEdBQVksS0FBSyxDQUFDO1FBUWxDLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO0lBQ2pDLENBQUM7SUFFRDs7T0FFRztJQUNLLHdCQUF3QjtRQUMvQixtRUFBbUU7UUFDbkUsSUFBSSxDQUFDLGNBQWMsR0FBRyxFQUFFLENBQUM7SUFDMUIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsTUFBTTtRQUNMLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO0lBQ3ZCLENBQUM7SUFFRDs7T0FFRztJQUNILE9BQU87UUFDTixJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztJQUN4QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxTQUFTLENBQ1IsTUFBc0IsRUFDdEIsTUFBYyxFQUNkLElBQVc7UUFFWCwwQkFBMEI7UUFDMUIsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUU7WUFDcEIsT0FBTyxJQUFJLENBQUM7U0FDWjtRQUVELG1DQUFtQztRQUNuQyxJQUNDLElB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QUMsU0FBUyxDQUFDLENBQUM7UUFFNUIsb0NBQW9DO1FBQ3BDLElBQUksVUFBVSxDQUFDLE1BQU0sRUFBRTtZQUN0QixVQUFVLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztTQUNyQztJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNILGdCQUFnQixDQUFDLE1BQXFCO1FBQ3JDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ3ZELElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7U0FDOUM7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSCxtQkFBbUIsQ0FBQyxFQUFVO1FBQzdCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQy9DLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FDNUIsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNILFNBQVM7UUFDUix5QkFBWSxJQUFJLENBQUMsTUFBTSxFQUFHO0lBQzNCLENBQUM7SUFFRDs7T0FFRztJQUNILFlBQVksQ0FBQyxTQUEwQztRQUN0RCxJQUFJLENBQUMsTUFBTSxtQ0FBUSxJQUFJLENBQUMsTUFBTSxHQUFLLFNBQVMsQ0FBRSxDQUFDO0lBQ2hELENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XHJcblx0QXBwLFxyXG5cdEVkaXRvcixcclxuXHRFZGl0b3JQb3NpdGlvbixcclxuXHRFZGl0b3JTdWdnZXN0LFxyXG5cdEVkaXRvclN1Z2dlc3RDb250ZXh0LFxyXG5cdEVkaXRvclN1Z2dlc3RUcmlnZ2VySW5mbyxcclxuXHRURmlsZSxcclxuXHRzZXRJY29uLFxyXG59IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCB7IGdldFN1Z2dlc3RPcHRpb25zQnlUcmlnZ2VyIH0gZnJvbSBcIi4vU3BlY2lhbENoYXJhY3RlclN1Z2dlc3RzXCI7XHJcbmltcG9ydCBcIkAvc3R5bGVzL3VuaXZlcnNhbC1zdWdnZXN0LmNzc1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBTdWdnZXN0T3B0aW9uIHtcclxuXHRpZDogc3RyaW5nO1xyXG5cdGxhYmVsOiBzdHJpbmc7XHJcblx0aWNvbjogc3RyaW5nO1xyXG5cdGRlc2NyaXB0aW9uOiBzdHJpbmc7XHJcblx0cmVwbGFjZW1lbnQ6IHN0cmluZztcclxuXHR0cmlnZ2VyOiBzdHJpbmc7XHJcblx0YWN0aW9uPzogKGVkaXRvcjogRWRpdG9yLCBjdXJzb3I6IEVkaXRvclBvc2l0aW9uKSA9PiB2b2lkO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFVuaXZlcnNhbFN1Z2dlc3RDb25maWcge1xyXG5cdHRyaWdnZXJDaGFyczogc3RyaW5nW107XHJcblx0Y29udGV4dEZpbHRlcj86IChlZGl0b3I6IEVkaXRvciwgZmlsZTogVEZpbGUpID0+IGJvb2xlYW47XHJcblx0cHJpb3JpdHk/OiBudW1iZXI7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBVbml2ZXJzYWwgRWRpdG9yU3VnZ2VzdCB0aGF0IGhhbmRsZXMgbXVsdGlwbGUgc3BlY2lhbCBjaGFyYWN0ZXJzXHJcbiAqIGFuZCBwcm92aWRlcyBkeW5hbWljIHByaW9yaXR5IG1hbmFnZW1lbnRcclxuICovXHJcbmV4cG9ydCBjbGFzcyBVbml2ZXJzYWxFZGl0b3JTdWdnZXN0IGV4dGVuZHMgRWRpdG9yU3VnZ2VzdDxTdWdnZXN0T3B0aW9uPiB7XHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblx0cHJpdmF0ZSBjb25maWc6IFVuaXZlcnNhbFN1Z2dlc3RDb25maWc7XHJcblx0cHJpdmF0ZSBzdWdnZXN0T3B0aW9uczogU3VnZ2VzdE9wdGlvbltdID0gW107XHJcblx0cHJpdmF0ZSBpc0VuYWJsZWQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRhcHA6IEFwcCxcclxuXHRcdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0Y29uZmlnOiBVbml2ZXJzYWxTdWdnZXN0Q29uZmlnXHJcblx0KSB7XHJcblx0XHRzdXBlcihhcHApO1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0XHR0aGlzLmNvbmZpZyA9IGNvbmZpZztcclxuXHRcdHRoaXMuaW5pdGlhbGl6ZVN1Z2dlc3RPcHRpb25zKCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBJbml0aWFsaXplIHN1Z2dlc3Qgb3B0aW9ucyBmb3IgYWxsIHN1cHBvcnRlZCBzcGVjaWFsIGNoYXJhY3RlcnNcclxuXHQgKi9cclxuXHRwcml2YXRlIGluaXRpYWxpemVTdWdnZXN0T3B0aW9ucygpOiB2b2lkIHtcclxuXHRcdC8vIEluaXRpYWxpemUgd2l0aCBlbXB0eSBhcnJheSAtIG9wdGlvbnMgd2lsbCBiZSBsb2FkZWQgZHluYW1pY2FsbHlcclxuXHRcdHRoaXMuc3VnZ2VzdE9wdGlvbnMgPSBbXTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEVuYWJsZSB0aGlzIHN1Z2dlc3QgaW5zdGFuY2VcclxuXHQgKi9cclxuXHRlbmFibGUoKTogdm9pZCB7XHJcblx0XHR0aGlzLmlzRW5hYmxlZCA9IHRydWU7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBEaXNhYmxlIHRoaXMgc3VnZ2VzdCBpbnN0YW5jZVxyXG5cdCAqL1xyXG5cdGRpc2FibGUoKTogdm9pZCB7XHJcblx0XHR0aGlzLmlzRW5hYmxlZCA9IGZhbHNlO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgc3VnZ2VzdGlvbiBzaG91bGQgYmUgdHJpZ2dlcmVkXHJcblx0ICovXHJcblx0b25UcmlnZ2VyKFxyXG5cdFx0Y3Vyc29yOiBFZGl0b3JQb3NpdGlvbixcclxuXHRcdGVkaXRvcjogRWRpdG9yLFxyXG5cdFx0ZmlsZTogVEZpbGVcclxuXHQpOiBFZGl0b3JTdWdnZXN0VHJpZ2dlckluZm8gfCBudWxsIHtcclxuXHRcdC8vIE9ubHkgdHJpZ2dlciBpZiBlbmFibGVkXHJcblx0XHRpZiAoIXRoaXMuaXNFbmFibGVkKSB7XHJcblx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFwcGx5IGNvbnRleHQgZmlsdGVyIGlmIHByb3ZpZGVkXHJcblx0XHRpZiAoXHJcblx0XHRcdHRoaXMuY29uZmlnLmNvbnRleHRGaWx0ZXIgJiZcclxuXHRcdFx0IXRoaXMuY29uZmlnLmNvbnRleHRGaWx0ZXIoZWRpdG9yLCBmaWxlKVxyXG5cdFx0KSB7XHJcblx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEdldCB0aGUgY3VycmVudCBsaW5lXHJcblx0XHRjb25zdCBsaW5lID0gZWRpdG9yLmdldExpbmUoY3Vyc29yLmxpbmUpO1xyXG5cclxuXHRcdC8vIENoZWNrIGlmIGN1cnNvciBpcyByaWdodCBhZnRlciBhbnkgb2Ygb3VyIHRyaWdnZXIgY2hhcmFjdGVyc1xyXG5cdFx0aWYgKGN1cnNvci5jaCA+IDApIHtcclxuXHRcdFx0Y29uc3QgY2hhckJlZm9yZSA9IGxpbmUuY2hhckF0KGN1cnNvci5jaCAtIDEpO1xyXG5cdFx0XHRpZiAodGhpcy5jb25maWcudHJpZ2dlckNoYXJzLmluY2x1ZGVzKGNoYXJCZWZvcmUpKSB7XHJcblx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdHN0YXJ0OiB7IGxpbmU6IGN1cnNvci5saW5lLCBjaDogY3Vyc29yLmNoIC0gMSB9LFxyXG5cdFx0XHRcdFx0ZW5kOiBjdXJzb3IsXHJcblx0XHRcdFx0XHRxdWVyeTogY2hhckJlZm9yZSxcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIG51bGw7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgc3VnZ2VzdGlvbnMgYmFzZWQgb24gdGhlIHRyaWdnZXIgY2hhcmFjdGVyXHJcblx0ICovXHJcblx0Z2V0U3VnZ2VzdGlvbnMoY29udGV4dDogRWRpdG9yU3VnZ2VzdENvbnRleHQpOiBTdWdnZXN0T3B0aW9uW10ge1xyXG5cdFx0Y29uc3QgdHJpZ2dlckNoYXIgPSBjb250ZXh0LnF1ZXJ5O1xyXG5cdFx0Ly8gR2V0IGR5bmFtaWMgc3VnZ2VzdGlvbnMgYmFzZWQgb24gdHJpZ2dlciBjaGFyYWN0ZXJcclxuXHRcdHJldHVybiBnZXRTdWdnZXN0T3B0aW9uc0J5VHJpZ2dlcih0cmlnZ2VyQ2hhciwgdGhpcy5wbHVnaW4pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVuZGVyIHN1Z2dlc3Rpb24gaW4gdGhlIHBvcHVwXHJcblx0ICovXHJcblx0cmVuZGVyU3VnZ2VzdGlvbihzdWdnZXN0aW9uOiBTdWdnZXN0T3B0aW9uLCBlbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdGNvbnN0IGNvbnRhaW5lciA9IGVsLmNyZWF0ZURpdih7IGNsczogXCJ1bml2ZXJzYWwtc3VnZ2VzdC1pdGVtXCIgfSk7XHJcblxyXG5cdFx0Ly8gSWNvblxyXG5cdFx0Y29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJ1bml2ZXJzYWwtc3VnZ2VzdC1jb250YWluZXJcIiB9LChlbCk9PntcclxuXHRcdFx0Y29uc3QgaWNvbiA9IGVsLmNyZWF0ZURpdih7IGNsczogXCJ1bml2ZXJzYWwtc3VnZ2VzdC1pY29uXCIgfSk7XHJcblx0XHRcdHNldEljb24oaWNvbiwgc3VnZ2VzdGlvbi5pY29uKTtcclxuXHJcblx0XHRcdGVsLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcInVuaXZlcnNhbC1zdWdnZXN0LWxhYmVsXCIsXHJcblx0XHRcdFx0dGV4dDogc3VnZ2VzdGlvbi5sYWJlbCxcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSBzdWdnZXN0aW9uIHNlbGVjdGlvblxyXG5cdCAqL1xyXG5cdHNlbGVjdFN1Z2dlc3Rpb24oXHJcblx0XHRzdWdnZXN0aW9uOiBTdWdnZXN0T3B0aW9uLFxyXG5cdFx0ZXZ0OiBNb3VzZUV2ZW50IHwgS2V5Ym9hcmRFdmVudFxyXG5cdCk6IHZvaWQge1xyXG5cdFx0Y29uc3QgZWRpdG9yID0gdGhpcy5jb250ZXh0Py5lZGl0b3I7XHJcblx0XHRjb25zdCBjdXJzb3IgPSB0aGlzLmNvbnRleHQ/LmVuZDtcclxuXHJcblx0XHRpZiAoIWVkaXRvciB8fCAhY3Vyc29yKSByZXR1cm47XHJcblxyXG5cdFx0Ly8gUmVwbGFjZSB0aGUgdHJpZ2dlciBjaGFyYWN0ZXIgd2l0aCB0aGUgcmVwbGFjZW1lbnRcclxuXHRcdGNvbnN0IHN0YXJ0UG9zID0geyBsaW5lOiBjdXJzb3IubGluZSwgY2g6IGN1cnNvci5jaCAtIDEgfTtcclxuXHRcdGNvbnN0IGVuZFBvcyA9IGN1cnNvcjtcclxuXHJcblx0XHRlZGl0b3IucmVwbGFjZVJhbmdlKHN1Z2dlc3Rpb24ucmVwbGFjZW1lbnQsIHN0YXJ0UG9zLCBlbmRQb3MpO1xyXG5cclxuXHRcdC8vIE1vdmUgY3Vyc29yIHRvIGFmdGVyIHRoZSByZXBsYWNlbWVudFxyXG5cdFx0Y29uc3QgbmV3Q3Vyc29yID0ge1xyXG5cdFx0XHRsaW5lOiBjdXJzb3IubGluZSxcclxuXHRcdFx0Y2g6IGN1cnNvci5jaCAtIDEgKyBzdWdnZXN0aW9uLnJlcGxhY2VtZW50Lmxlbmd0aCxcclxuXHRcdH07XHJcblx0XHRlZGl0b3Iuc2V0Q3Vyc29yKG5ld0N1cnNvcik7XHJcblxyXG5cdFx0Ly8gRXhlY3V0ZSBjdXN0b20gYWN0aW9uIGlmIHByb3ZpZGVkXHJcblx0XHRpZiAoc3VnZ2VzdGlvbi5hY3Rpb24pIHtcclxuXHRcdFx0c3VnZ2VzdGlvbi5hY3Rpb24oZWRpdG9yLCBuZXdDdXJzb3IpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQWRkIGEgY3VzdG9tIHN1Z2dlc3Qgb3B0aW9uXHJcblx0ICovXHJcblx0YWRkU3VnZ2VzdE9wdGlvbihvcHRpb246IFN1Z2dlc3RPcHRpb24pOiB2b2lkIHtcclxuXHRcdHRoaXMuc3VnZ2VzdE9wdGlvbnMucHVzaChvcHRpb24pO1xyXG5cdFx0aWYgKCF0aGlzLmNvbmZpZy50cmlnZ2VyQ2hhcnMuaW5jbHVkZXMob3B0aW9uLnRyaWdnZXIpKSB7XHJcblx0XHRcdHRoaXMuY29uZmlnLnRyaWdnZXJDaGFycy5wdXNoKG9wdGlvbi50cmlnZ2VyKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbW92ZSBhIHN1Z2dlc3Qgb3B0aW9uIGJ5IGlkXHJcblx0ICovXHJcblx0cmVtb3ZlU3VnZ2VzdE9wdGlvbihpZDogc3RyaW5nKTogdm9pZCB7XHJcblx0XHR0aGlzLnN1Z2dlc3RPcHRpb25zID0gdGhpcy5zdWdnZXN0T3B0aW9ucy5maWx0ZXIoXHJcblx0XHRcdChvcHRpb24pID0+IG9wdGlvbi5pZCAhPT0gaWRcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgY3VycmVudCBjb25maWd1cmF0aW9uXHJcblx0ICovXHJcblx0Z2V0Q29uZmlnKCk6IFVuaXZlcnNhbFN1Z2dlc3RDb25maWcge1xyXG5cdFx0cmV0dXJuIHsgLi4udGhpcy5jb25maWcgfTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBjb25maWd1cmF0aW9uXHJcblx0ICovXHJcblx0dXBkYXRlQ29uZmlnKG5ld0NvbmZpZzogUGFydGlhbDxVbml2ZXJzYWxTdWdnZXN0Q29uZmlnPik6IHZvaWQge1xyXG5cdFx0dGhpcy5jb25maWcgPSB7IC4uLnRoaXMuY29uZmlnLCAuLi5uZXdDb25maWcgfTtcclxuXHR9XHJcbn1cclxuIl19