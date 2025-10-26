import { UniversalEditorSuggest } from "./UniversalEditorSuggest";
/**
 * Manages dynamic suggest registration and priority in workspace
 */
export class SuggestManager {
    constructor(app, plugin, config) {
        this.activeSuggests = new Map();
        this.originalSuggestsOrder = [];
        this.isManaging = false;
        this.app = app;
        this.plugin = plugin;
        this.config = Object.assign({ enableDynamicPriority: true, defaultTriggerChars: ["!", "~", "*", "#"], contextFilters: {} }, config);
    }
    /**
     * Start managing suggests with dynamic priority
     */
    startManaging() {
        if (this.isManaging)
            return;
        this.isManaging = true;
        // Store original order for restoration
        this.originalSuggestsOrder = [...this.app.workspace.editorSuggest.suggests];
    }
    /**
     * Stop managing and restore original order
     */
    stopManaging() {
        if (!this.isManaging)
            return;
        // Remove all our managed suggests
        this.removeAllManagedSuggests();
        // Restore original order if needed
        if (this.originalSuggestsOrder.length > 0) {
            this.app.workspace.editorSuggest.suggests = [...this.originalSuggestsOrder];
        }
        this.isManaging = false;
        this.originalSuggestsOrder = [];
    }
    /**
     * Add a suggest with high priority (insert at beginning)
     */
    addSuggestWithPriority(suggest, id) {
        if (!this.isManaging) {
            console.warn("SuggestManager: Not managing, call startManaging() first");
            return;
        }
        // Remove if already exists
        this.removeManagedSuggest(id);
        // Add to our tracking
        this.activeSuggests.set(id, suggest);
        // Insert at the beginning for high priority
        this.app.workspace.editorSuggest.suggests.unshift(suggest);
    }
    /**
     * Remove a managed suggest
     */
    removeManagedSuggest(id) {
        const suggest = this.activeSuggests.get(id);
        if (!suggest)
            return;
        // Remove from workspace
        const index = this.app.workspace.editorSuggest.suggests.indexOf(suggest);
        if (index !== -1) {
            this.app.workspace.editorSuggest.suggests.splice(index, 1);
        }
        // Remove from our tracking
        this.activeSuggests.delete(id);
    }
    /**
     * Remove all managed suggests
     */
    removeAllManagedSuggests() {
        for (const [id] of this.activeSuggests) {
            this.removeManagedSuggest(id);
        }
    }
    /**
     * Create and add a universal suggest for specific context
     */
    createUniversalSuggest(contextId, config = {}) {
        const suggestConfig = Object.assign({ triggerChars: this.config.defaultTriggerChars, contextFilter: this.config.contextFilters[contextId], priority: 1 }, config);
        const suggest = new UniversalEditorSuggest(this.app, this.plugin, suggestConfig);
        // Add with priority
        this.addSuggestWithPriority(suggest, `universal-${contextId}`);
        return suggest;
    }
    /**
     * Enable suggests for a specific editor context
     */
    enableForEditor(editor, contextId = "default") {
        const suggest = this.createUniversalSuggest(contextId, {
            contextFilter: (ed, file) => ed === editor,
        });
        suggest.enable();
        return suggest;
    }
    /**
     * Disable suggests for a specific context
     */
    disableForContext(contextId) {
        this.removeManagedSuggest(`universal-${contextId}`);
    }
    /**
     * Enable suggests for minimal quick capture modal
     */
    enableForMinimalModal(editor) {
        return this.createUniversalSuggest("minimal-modal", {
            contextFilter: (ed, file) => {
                var _a;
                // Check if we're in a minimal quick capture context
                const editorEl = (_a = ed.cm) === null || _a === void 0 ? void 0 : _a.dom;
                return (editorEl === null || editorEl === void 0 ? void 0 : editorEl.closest(".quick-capture-modal.minimal")) !== null;
            },
        });
    }
    /**
     * Enable suggests for regular quick capture modal
     */
    enableForQuickCaptureModal(editor) {
        return this.createUniversalSuggest("quick-capture-modal", {
            contextFilter: (ed, file) => {
                var _a;
                // Check if we're in a quick capture context
                const editorEl = (_a = ed.cm) === null || _a === void 0 ? void 0 : _a.dom;
                return (editorEl === null || editorEl === void 0 ? void 0 : editorEl.closest(".quick-capture-modal")) !== null;
            },
        });
    }
    /**
     * Add a custom context filter
     */
    addContextFilter(contextId, filter) {
        this.config.contextFilters[contextId] = filter;
    }
    /**
     * Remove a context filter
     */
    removeContextFilter(contextId) {
        delete this.config.contextFilters[contextId];
    }
    /**
     * Get all active suggests
     */
    getActiveSuggests() {
        return new Map(this.activeSuggests);
    }
    /**
     * Check if currently managing
     */
    isCurrentlyManaging() {
        return this.isManaging;
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
    /**
     * Debug: Log current suggest order
     */
    debugLogSuggestOrder() {
        console.log("Current suggest order:", this.app.workspace.editorSuggest.suggests);
        console.log("Managed suggests:", Array.from(this.activeSuggests.keys()));
    }
    /**
     * Cleanup method for proper disposal
     */
    cleanup() {
        this.stopManaging();
        this.activeSuggests.clear();
        this.config.contextFilters = {};
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3VnZ2VzdE1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJTdWdnZXN0TWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFQSxPQUFPLEVBQUUsc0JBQXNCLEVBQTBCLE1BQU0sMEJBQTBCLENBQUM7QUFVMUY7O0dBRUc7QUFDSCxNQUFNLE9BQU8sY0FBYztJQVExQixZQUFZLEdBQVEsRUFBRSxNQUE2QixFQUFFLE1BQXNDO1FBSm5GLG1CQUFjLEdBQW9DLElBQUksR0FBRyxFQUFFLENBQUM7UUFDNUQsMEJBQXFCLEdBQXlCLEVBQUUsQ0FBQztRQUNqRCxlQUFVLEdBQVksS0FBSyxDQUFDO1FBR25DLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO1FBQ2YsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLE1BQU0sbUJBQ1YscUJBQXFCLEVBQUUsSUFBSSxFQUMzQixtQkFBbUIsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUN6QyxjQUFjLEVBQUUsRUFBRSxJQUNmLE1BQU0sQ0FDVCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsYUFBYTtRQUNaLElBQUksSUFBSSxDQUFDLFVBQVU7WUFBRSxPQUFPO1FBRTVCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO1FBQ3ZCLHVDQUF1QztRQUN2QyxJQUFJLENBQUMscUJBQXFCLEdBQUcsQ0FBQyxHQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBaUIsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDdEYsQ0FBQztJQUVEOztPQUVHO0lBQ0gsWUFBWTtRQUNYLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVTtZQUFFLE9BQU87UUFFN0Isa0NBQWtDO1FBQ2xDLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1FBRWhDLG1DQUFtQztRQUNuQyxJQUFJLElBQUksQ0FBQyxx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bUIsQ0FBQyxTQUFpQjtRQUNwQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFFRDs7T0FFRztJQUNILGlCQUFpQjtRQUNoQixPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxtQkFBbUI7UUFDbEIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO0lBQ3hCLENBQUM7SUFFRDs7T0FFRztJQUNILFNBQVM7UUFDUix5QkFBWSxJQUFJLENBQUMsTUFBTSxFQUFHO0lBQzNCLENBQUM7SUFFRDs7T0FFRztJQUNILFlBQVksQ0FBQyxTQUF3QztRQUNwRCxJQUFJLENBQUMsTUFBTSxtQ0FBUSxJQUFJLENBQUMsTUFBTSxHQUFLLFNBQVMsQ0FBRSxDQUFDO0lBQ2hELENBQUM7SUFFRDs7T0FFRztJQUNILG9CQUFvQjtRQUNuQixPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixFQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBaUIsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDMUYsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzFFLENBQUM7SUFFRDs7T0FFRztJQUNILE9BQU87UUFDTixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDcEIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUM1QixJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsR0FBRyxFQUFFLENBQUM7SUFDakMsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwLCBFZGl0b3IsIEVkaXRvclN1Z2dlc3QsIFRGaWxlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjtcclxuaW1wb3J0IHsgVW5pdmVyc2FsRWRpdG9yU3VnZ2VzdCwgVW5pdmVyc2FsU3VnZ2VzdENvbmZpZyB9IGZyb20gXCIuL1VuaXZlcnNhbEVkaXRvclN1Z2dlc3RcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgU3VnZ2VzdE1hbmFnZXJDb25maWcge1xyXG5cdGVuYWJsZUR5bmFtaWNQcmlvcml0eTogYm9vbGVhbjtcclxuXHRkZWZhdWx0VHJpZ2dlckNoYXJzOiBzdHJpbmdbXTtcclxuXHRjb250ZXh0RmlsdGVyczoge1xyXG5cdFx0W2tleTogc3RyaW5nXTogKGVkaXRvcjogRWRpdG9yLCBmaWxlOiBURmlsZSkgPT4gYm9vbGVhbjtcclxuXHR9O1xyXG59XHJcblxyXG4vKipcclxuICogTWFuYWdlcyBkeW5hbWljIHN1Z2dlc3QgcmVnaXN0cmF0aW9uIGFuZCBwcmlvcml0eSBpbiB3b3Jrc3BhY2VcclxuICovXHJcbmV4cG9ydCBjbGFzcyBTdWdnZXN0TWFuYWdlciB7XHJcblx0cHJpdmF0ZSBhcHA6IEFwcDtcclxuXHRwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luO1xyXG5cdHByaXZhdGUgY29uZmlnOiBTdWdnZXN0TWFuYWdlckNvbmZpZztcclxuXHRwcml2YXRlIGFjdGl2ZVN1Z2dlc3RzOiBNYXA8c3RyaW5nLCBFZGl0b3JTdWdnZXN0PGFueT4+ID0gbmV3IE1hcCgpO1xyXG5cdHByaXZhdGUgb3JpZ2luYWxTdWdnZXN0c09yZGVyOiBFZGl0b3JTdWdnZXN0PGFueT5bXSA9IFtdO1xyXG5cdHByaXZhdGUgaXNNYW5hZ2luZzogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sIGNvbmZpZz86IFBhcnRpYWw8U3VnZ2VzdE1hbmFnZXJDb25maWc+KSB7XHJcblx0XHR0aGlzLmFwcCA9IGFwcDtcclxuXHRcdHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG5cdFx0dGhpcy5jb25maWcgPSB7XHJcblx0XHRcdGVuYWJsZUR5bmFtaWNQcmlvcml0eTogdHJ1ZSxcclxuXHRcdFx0ZGVmYXVsdFRyaWdnZXJDaGFyczogW1wiIVwiLCBcIn5cIiwgXCIqXCIsIFwiI1wiXSxcclxuXHRcdFx0Y29udGV4dEZpbHRlcnM6IHt9LFxyXG5cdFx0XHQuLi5jb25maWcsXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU3RhcnQgbWFuYWdpbmcgc3VnZ2VzdHMgd2l0aCBkeW5hbWljIHByaW9yaXR5XHJcblx0ICovXHJcblx0c3RhcnRNYW5hZ2luZygpOiB2b2lkIHtcclxuXHRcdGlmICh0aGlzLmlzTWFuYWdpbmcpIHJldHVybjtcclxuXHJcblx0XHR0aGlzLmlzTWFuYWdpbmcgPSB0cnVlO1xyXG5cdFx0Ly8gU3RvcmUgb3JpZ2luYWwgb3JkZXIgZm9yIHJlc3RvcmF0aW9uXHJcblx0XHR0aGlzLm9yaWdpbmFsU3VnZ2VzdHNPcmRlciA9IFsuLi4odGhpcy5hcHAud29ya3NwYWNlIGFzIGFueSkuZWRpdG9yU3VnZ2VzdC5zdWdnZXN0c107XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTdG9wIG1hbmFnaW5nIGFuZCByZXN0b3JlIG9yaWdpbmFsIG9yZGVyXHJcblx0ICovXHJcblx0c3RvcE1hbmFnaW5nKCk6IHZvaWQge1xyXG5cdFx0aWYgKCF0aGlzLmlzTWFuYWdpbmcpIHJldHVybjtcclxuXHJcblx0XHQvLyBSZW1vdmUgYWxsIG91ciBtYW5hZ2VkIHN1Z2dlc3RzXHJcblx0XHR0aGlzLnJlbW92ZUFsbE1hbmFnZWRTdWdnZXN0cygpO1xyXG5cclxuXHRcdC8vIFJlc3RvcmUgb3JpZ2luYWwgb3JkZXIgaWYgbmVlZGVkXHJcblx0XHRpZiAodGhpcy5vcmlnaW5hbFN1Z2dlc3RzT3JkZXIubGVuZ3RoID4gMCkge1xyXG5cdFx0XHQodGhpcy5hcHAud29ya3NwYWNlIGFzIGFueSkuZWRpdG9yU3VnZ2VzdC5zdWdnZXN0cyA9IFsuLi50aGlzLm9yaWdpbmFsU3VnZ2VzdHNPcmRlcl07XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5pc01hbmFnaW5nID0gZmFsc2U7XHJcblx0XHR0aGlzLm9yaWdpbmFsU3VnZ2VzdHNPcmRlciA9IFtdO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQWRkIGEgc3VnZ2VzdCB3aXRoIGhpZ2ggcHJpb3JpdHkgKGluc2VydCBhdCBiZWdpbm5pbmcpXHJcblx0ICovXHJcblx0YWRkU3VnZ2VzdFdpdGhQcmlvcml0eShzdWdnZXN0OiBFZGl0b3JTdWdnZXN0PGFueT4sIGlkOiBzdHJpbmcpOiB2b2lkIHtcclxuXHRcdGlmICghdGhpcy5pc01hbmFnaW5nKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcIlN1Z2dlc3RNYW5hZ2VyOiBOb3QgbWFuYWdpbmcsIGNhbGwgc3RhcnRNYW5hZ2luZygpIGZpcnN0XCIpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIGlmIGFscmVhZHkgZXhpc3RzXHJcblx0XHR0aGlzLnJlbW92ZU1hbmFnZWRTdWdnZXN0KGlkKTtcclxuXHJcblx0XHQvLyBBZGQgdG8gb3VyIHRyYWNraW5nXHJcblx0XHR0aGlzLmFjdGl2ZVN1Z2dlc3RzLnNldChpZCwgc3VnZ2VzdCk7XHJcblxyXG5cdFx0Ly8gSW5zZXJ0IGF0IHRoZSBiZWdpbm5pbmcgZm9yIGhpZ2ggcHJpb3JpdHlcclxuXHRcdCh0aGlzLmFwcC53b3Jrc3BhY2UgYXMgYW55KS5lZGl0b3JTdWdnZXN0LnN1Z2dlc3RzLnVuc2hpZnQoc3VnZ2VzdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW1vdmUgYSBtYW5hZ2VkIHN1Z2dlc3RcclxuXHQgKi9cclxuXHRyZW1vdmVNYW5hZ2VkU3VnZ2VzdChpZDogc3RyaW5nKTogdm9pZCB7XHJcblx0XHRjb25zdCBzdWdnZXN0ID0gdGhpcy5hY3RpdmVTdWdnZXN0cy5nZXQoaWQpO1xyXG5cdFx0aWYgKCFzdWdnZXN0KSByZXR1cm47XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIGZyb20gd29ya3NwYWNlXHJcblx0XHRjb25zdCBpbmRleCA9ICh0aGlzLmFwcC53b3Jrc3BhY2UgYXMgYW55KS5lZGl0b3JTdWdnZXN0LnN1Z2dlc3RzLmluZGV4T2Yoc3VnZ2VzdCk7XHJcblx0XHRpZiAoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdCh0aGlzLmFwcC53b3Jrc3BhY2UgYXMgYW55KS5lZGl0b3JTdWdnZXN0LnN1Z2dlc3RzLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIGZyb20gb3VyIHRyYWNraW5nXHJcblx0XHR0aGlzLmFjdGl2ZVN1Z2dlc3RzLmRlbGV0ZShpZCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW1vdmUgYWxsIG1hbmFnZWQgc3VnZ2VzdHNcclxuXHQgKi9cclxuXHRyZW1vdmVBbGxNYW5hZ2VkU3VnZ2VzdHMoKTogdm9pZCB7XHJcblx0XHRmb3IgKGNvbnN0IFtpZF0gb2YgdGhpcy5hY3RpdmVTdWdnZXN0cykge1xyXG5cdFx0XHR0aGlzLnJlbW92ZU1hbmFnZWRTdWdnZXN0KGlkKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZSBhbmQgYWRkIGEgdW5pdmVyc2FsIHN1Z2dlc3QgZm9yIHNwZWNpZmljIGNvbnRleHRcclxuXHQgKi9cclxuXHRjcmVhdGVVbml2ZXJzYWxTdWdnZXN0KFxyXG5cdFx0Y29udGV4dElkOiBzdHJpbmcsXHJcblx0XHRjb25maWc6IFBhcnRpYWw8VW5pdmVyc2FsU3VnZ2VzdENvbmZpZz4gPSB7fVxyXG5cdCk6IFVuaXZlcnNhbEVkaXRvclN1Z2dlc3Qge1xyXG5cdFx0Y29uc3Qgc3VnZ2VzdENvbmZpZzogVW5pdmVyc2FsU3VnZ2VzdENvbmZpZyA9IHtcclxuXHRcdFx0dHJpZ2dlckNoYXJzOiB0aGlzLmNvbmZpZy5kZWZhdWx0VHJpZ2dlckNoYXJzLFxyXG5cdFx0XHRjb250ZXh0RmlsdGVyOiB0aGlzLmNvbmZpZy5jb250ZXh0RmlsdGVyc1tjb250ZXh0SWRdLFxyXG5cdFx0XHRwcmlvcml0eTogMSxcclxuXHRcdFx0Li4uY29uZmlnLFxyXG5cdFx0fTtcclxuXHJcblx0XHRjb25zdCBzdWdnZXN0ID0gbmV3IFVuaXZlcnNhbEVkaXRvclN1Z2dlc3QodGhpcy5hcHAsIHRoaXMucGx1Z2luLCBzdWdnZXN0Q29uZmlnKTtcclxuXHRcdFxyXG5cdFx0Ly8gQWRkIHdpdGggcHJpb3JpdHlcclxuXHRcdHRoaXMuYWRkU3VnZ2VzdFdpdGhQcmlvcml0eShzdWdnZXN0LCBgdW5pdmVyc2FsLSR7Y29udGV4dElkfWApO1xyXG5cdFx0XHJcblx0XHRyZXR1cm4gc3VnZ2VzdDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEVuYWJsZSBzdWdnZXN0cyBmb3IgYSBzcGVjaWZpYyBlZGl0b3IgY29udGV4dFxyXG5cdCAqL1xyXG5cdGVuYWJsZUZvckVkaXRvcihlZGl0b3I6IEVkaXRvciwgY29udGV4dElkOiBzdHJpbmcgPSBcImRlZmF1bHRcIik6IFVuaXZlcnNhbEVkaXRvclN1Z2dlc3Qge1xyXG5cdFx0Y29uc3Qgc3VnZ2VzdCA9IHRoaXMuY3JlYXRlVW5pdmVyc2FsU3VnZ2VzdChjb250ZXh0SWQsIHtcclxuXHRcdFx0Y29udGV4dEZpbHRlcjogKGVkLCBmaWxlKSA9PiBlZCA9PT0gZWRpdG9yLFxyXG5cdFx0fSk7XHJcblx0XHRcclxuXHRcdHN1Z2dlc3QuZW5hYmxlKCk7XHJcblx0XHRyZXR1cm4gc3VnZ2VzdDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIERpc2FibGUgc3VnZ2VzdHMgZm9yIGEgc3BlY2lmaWMgY29udGV4dFxyXG5cdCAqL1xyXG5cdGRpc2FibGVGb3JDb250ZXh0KGNvbnRleHRJZDogc3RyaW5nKTogdm9pZCB7XHJcblx0XHR0aGlzLnJlbW92ZU1hbmFnZWRTdWdnZXN0KGB1bml2ZXJzYWwtJHtjb250ZXh0SWR9YCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFbmFibGUgc3VnZ2VzdHMgZm9yIG1pbmltYWwgcXVpY2sgY2FwdHVyZSBtb2RhbFxyXG5cdCAqL1xyXG5cdGVuYWJsZUZvck1pbmltYWxNb2RhbChlZGl0b3I6IEVkaXRvcik6IFVuaXZlcnNhbEVkaXRvclN1Z2dlc3Qge1xyXG5cdFx0cmV0dXJuIHRoaXMuY3JlYXRlVW5pdmVyc2FsU3VnZ2VzdChcIm1pbmltYWwtbW9kYWxcIiwge1xyXG5cdFx0XHRjb250ZXh0RmlsdGVyOiAoZWQsIGZpbGUpID0+IHtcclxuXHRcdFx0XHQvLyBDaGVjayBpZiB3ZSdyZSBpbiBhIG1pbmltYWwgcXVpY2sgY2FwdHVyZSBjb250ZXh0XHJcblx0XHRcdFx0Y29uc3QgZWRpdG9yRWwgPSAoZWQgYXMgYW55KS5jbT8uZG9tIGFzIEhUTUxFbGVtZW50O1xyXG5cdFx0XHRcdHJldHVybiBlZGl0b3JFbD8uY2xvc2VzdChcIi5xdWljay1jYXB0dXJlLW1vZGFsLm1pbmltYWxcIikgIT09IG51bGw7XHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEVuYWJsZSBzdWdnZXN0cyBmb3IgcmVndWxhciBxdWljayBjYXB0dXJlIG1vZGFsXHJcblx0ICovXHJcblx0ZW5hYmxlRm9yUXVpY2tDYXB0dXJlTW9kYWwoZWRpdG9yOiBFZGl0b3IpOiBVbml2ZXJzYWxFZGl0b3JTdWdnZXN0IHtcclxuXHRcdHJldHVybiB0aGlzLmNyZWF0ZVVuaXZlcnNhbFN1Z2dlc3QoXCJxdWljay1jYXB0dXJlLW1vZGFsXCIsIHtcclxuXHRcdFx0Y29udGV4dEZpbHRlcjogKGVkLCBmaWxlKSA9PiB7XHJcblx0XHRcdFx0Ly8gQ2hlY2sgaWYgd2UncmUgaW4gYSBxdWljayBjYXB0dXJlIGNvbnRleHRcclxuXHRcdFx0XHRjb25zdCBlZGl0b3JFbCA9IChlZCBhcyBhbnkpLmNtPy5kb20gYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRcdFx0cmV0dXJuIGVkaXRvckVsPy5jbG9zZXN0KFwiLnF1aWNrLWNhcHR1cmUtbW9kYWxcIikgIT09IG51bGw7XHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEFkZCBhIGN1c3RvbSBjb250ZXh0IGZpbHRlclxyXG5cdCAqL1xyXG5cdGFkZENvbnRleHRGaWx0ZXIoXHJcblx0XHRjb250ZXh0SWQ6IHN0cmluZyxcclxuXHRcdGZpbHRlcjogKGVkaXRvcjogRWRpdG9yLCBmaWxlOiBURmlsZSkgPT4gYm9vbGVhblxyXG5cdCk6IHZvaWQge1xyXG5cdFx0dGhpcy5jb25maWcuY29udGV4dEZpbHRlcnNbY29udGV4dElkXSA9IGZpbHRlcjtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbW92ZSBhIGNvbnRleHQgZmlsdGVyXHJcblx0ICovXHJcblx0cmVtb3ZlQ29udGV4dEZpbHRlcihjb250ZXh0SWQ6IHN0cmluZyk6IHZvaWQge1xyXG5cdFx0ZGVsZXRlIHRoaXMuY29uZmlnLmNvbnRleHRGaWx0ZXJzW2NvbnRleHRJZF07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgYWxsIGFjdGl2ZSBzdWdnZXN0c1xyXG5cdCAqL1xyXG5cdGdldEFjdGl2ZVN1Z2dlc3RzKCk6IE1hcDxzdHJpbmcsIEVkaXRvclN1Z2dlc3Q8YW55Pj4ge1xyXG5cdFx0cmV0dXJuIG5ldyBNYXAodGhpcy5hY3RpdmVTdWdnZXN0cyk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDaGVjayBpZiBjdXJyZW50bHkgbWFuYWdpbmdcclxuXHQgKi9cclxuXHRpc0N1cnJlbnRseU1hbmFnaW5nKCk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIHRoaXMuaXNNYW5hZ2luZztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBjdXJyZW50IGNvbmZpZ3VyYXRpb25cclxuXHQgKi9cclxuXHRnZXRDb25maWcoKTogU3VnZ2VzdE1hbmFnZXJDb25maWcge1xyXG5cdFx0cmV0dXJuIHsgLi4udGhpcy5jb25maWcgfTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBjb25maWd1cmF0aW9uXHJcblx0ICovXHJcblx0dXBkYXRlQ29uZmlnKG5ld0NvbmZpZzogUGFydGlhbDxTdWdnZXN0TWFuYWdlckNvbmZpZz4pOiB2b2lkIHtcclxuXHRcdHRoaXMuY29uZmlnID0geyAuLi50aGlzLmNvbmZpZywgLi4ubmV3Q29uZmlnIH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBEZWJ1ZzogTG9nIGN1cnJlbnQgc3VnZ2VzdCBvcmRlclxyXG5cdCAqL1xyXG5cdGRlYnVnTG9nU3VnZ2VzdE9yZGVyKCk6IHZvaWQge1xyXG5cdFx0Y29uc29sZS5sb2coXCJDdXJyZW50IHN1Z2dlc3Qgb3JkZXI6XCIsICh0aGlzLmFwcC53b3Jrc3BhY2UgYXMgYW55KS5lZGl0b3JTdWdnZXN0LnN1Z2dlc3RzKTtcclxuXHRcdGNvbnNvbGUubG9nKFwiTWFuYWdlZCBzdWdnZXN0czpcIiwgQXJyYXkuZnJvbSh0aGlzLmFjdGl2ZVN1Z2dlc3RzLmtleXMoKSkpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2xlYW51cCBtZXRob2QgZm9yIHByb3BlciBkaXNwb3NhbFxyXG5cdCAqL1xyXG5cdGNsZWFudXAoKTogdm9pZCB7XHJcblx0XHR0aGlzLnN0b3BNYW5hZ2luZygpO1xyXG5cdFx0dGhpcy5hY3RpdmVTdWdnZXN0cy5jbGVhcigpO1xyXG5cdFx0dGhpcy5jb25maWcuY29udGV4dEZpbHRlcnMgPSB7fTtcclxuXHR9XHJcbn1cclxuIl19