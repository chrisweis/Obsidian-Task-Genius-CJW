/**
 * IcsSource - Event source for ICS calendar data
 *
 * This source integrates external calendar events into the dataflow architecture.
 * It listens to IcsManager updates and emits standardized dataflow events.
 */
import { __awaiter } from "tslib";
import { Events, emit, Seq } from "../events/Events";
export class IcsSource {
    constructor(app, getIcsManager) {
        this.app = app;
        this.getIcsManager = getIcsManager;
        this.eventRefs = [];
        this.isInitialized = false;
        this.lastIcsUpdateSeq = 0;
    }
    /**
     * Initialize the ICS source and start listening for calendar updates
     */
    initialize() {
        if (this.isInitialized)
            return;
        console.log("[IcsSource] Initializing ICS event source...");
        // Subscribe to ICS manager updates first so we don't miss early signals
        this.subscribeToIcsUpdates();
        // Initial load of ICS events (may be no-op if manager not ready yet)
        this.loadAndEmitIcsEvents();
        // Fallback: retry until ICS manager becomes available (up to ~30s)
        this.ensureManagerAndLoad(0);
        this.isInitialized = true;
    }
    /**
     * Ensure ICS manager becomes available shortly after startup and then load
     */
    ensureManagerAndLoad(attempt) {
        const maxAttempts = 30; // ~30s with 1s interval
        if (this.getIcsManager()) {
            this.loadAndEmitIcsEvents();
            return;
        }
        if (attempt >= maxAttempts) {
            console.warn("[IcsSource] ICS manager not available after retries");
            return;
        }
        setTimeout(() => this.ensureManagerAndLoad(attempt + 1), 1000);
    }
    /**
     * Subscribe to ICS manager update events
     */
    subscribeToIcsUpdates() {
        // Listen for ICS cache updates
        this.app.workspace.on("ics-cache-updated", () => {
            console.log("[IcsSource] ICS cache updated, reloading events...");
            this.loadAndEmitIcsEvents();
        });
        // Listen for ICS configuration changes
        // this.app.workspace.on("task-genius:ics-config-changed", () => {
        // 	console.log("[IcsSource] ICS config changed, reloading events...");
        // 	this.loadAndEmitIcsEvents();
        // });
    }
    /**
     * Load ICS events from manager and emit update event
     */
    loadAndEmitIcsEvents() {
        return __awaiter(this, void 0, void 0, function* () {
            const icsManager = this.getIcsManager();
            if (!icsManager) {
                console.log("[IcsSource] No ICS manager available");
                return;
            }
            try {
                // Get all ICS events with sync
                const icsEvents = yield icsManager.getAllEventsWithSync();
                // Convert ICS events to IcsTask format via manager to ensure proper shape
                const icsTasks = icsManager.convertEventsToTasks(icsEvents);
                console.log(`[IcsSource] Loaded ${icsTasks.length} ICS events`);
                // Generate sequence for this update
                this.lastIcsUpdateSeq = Seq.next();
                // Emit ICS events update
                emit(this.app, Events.ICS_EVENTS_UPDATED, {
                    events: icsTasks,
                    timestamp: Date.now(),
                    seq: this.lastIcsUpdateSeq,
                    stats: {
                        total: icsTasks.length,
                        sources: this.getSourceStats(icsTasks),
                    },
                });
            }
            catch (error) {
                console.error("[IcsSource] Error loading ICS events:", error);
                // Emit empty update on error to clear stale data
                emit(this.app, Events.ICS_EVENTS_UPDATED, {
                    events: [],
                    timestamp: Date.now(),
                    seq: Seq.next(),
                    error: error.message,
                });
            }
        });
    }
    /**
     * Get statistics about ICS sources
     */
    getSourceStats(events) {
        var _a, _b;
        const stats = {};
        for (const event of events) {
            const sourceId = ((_b = (_a = event.metadata) === null || _a === void 0 ? void 0 : _a.source) === null || _b === void 0 ? void 0 : _b.id) || "unknown";
            stats[sourceId] = (stats[sourceId] || 0) + 1;
        }
        return stats;
    }
    /**
     * Refresh ICS events manually
     */
    refresh() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("[IcsSource] Manual refresh triggered");
            yield this.loadAndEmitIcsEvents();
        });
    }
    /**
     * Get current statistics
     */
    getStats() {
        return {
            initialized: this.isInitialized,
            lastUpdateSeq: this.lastIcsUpdateSeq,
        };
    }
    /**
     * Cleanup and destroy the source
     */
    destroy() {
        console.log("[IcsSource] Destroying ICS source...");
        // Clear event listeners
        for (const ref of this.eventRefs) {
            this.app.vault.offref(ref);
        }
        this.eventRefs = [];
        // Emit clear event
        emit(this.app, Events.ICS_EVENTS_UPDATED, {
            events: [],
            timestamp: Date.now(),
            seq: Seq.next(),
            destroyed: true,
        });
        this.isInitialized = false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSWNzU291cmNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiSWNzU291cmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7OztHQUtHOztBQUdILE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBSXJELE1BQU0sT0FBTyxTQUFTO0lBS3JCLFlBQ1MsR0FBUSxFQUNSLGFBQTJDO1FBRDNDLFFBQUcsR0FBSCxHQUFHLENBQUs7UUFDUixrQkFBYSxHQUFiLGFBQWEsQ0FBOEI7UUFONUMsY0FBUyxHQUFlLEVBQUUsQ0FBQztRQUMzQixrQkFBYSxHQUFHLEtBQUssQ0FBQztRQUN0QixxQkFBZ0IsR0FBRyxDQUFDLENBQUM7SUFLMUIsQ0FBQztJQUVKOztPQUVHO0lBQ0gsVUFBVTtRQUNULElBQUksSUFBSSxDQUFDLGFBQWE7WUFBRSxPQUFPO1FBRS9CLE9BQU8sQ0FBQyxHQUFHLENBQUMsOENBQThDLENBQUMsQ0FBQztRQUU1RCx3RUFBd0U7UUFDeEUsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7UUFFN0IscUVBQXFFO1FBQ3JFLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBRTVCLG1FQUFtRTtRQUNuRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFN0IsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7SUFDM0IsQ0FBQztJQUNEOztPQUVHO0lBQ0ssb0JBQW9CLENBQUMsT0FBZTtRQUMzQyxNQUFNLFdBQVcsR0FBRyxFQUFFLENBQUMsQ0FBQyx3QkFBd0I7UUFDaEQsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLEVBQUU7WUFDekIsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDNUIsT0FBTztTQUNQO1FBQ0QsSUFBSSxPQUFPLElBQUksV0FBVyxFQUFFO1lBQzNCLE9BQU8sQ0FBQyxJQUFJLENBQUMscURBQXFELENBQUMsQ0FBQztZ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QztZQUNwRCxNQUFNLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBQ25DLENBQUM7S0FBQTtJQUVEOztPQUVHO0lBQ0gsUUFBUTtRQUlQLE9BQU87WUFDTixXQUFXLEVBQUUsSUFBSSxDQUFDLGFBQWE7WUFDL0IsYUFBYSxFQUFFLElBQUksQ0FBQyxnQkFBZ0I7U0FDcEMsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNILE9BQU87UUFDTixPQUFPLENBQUMsR0FBRyxDQUFDLHNDQUFzQyxDQUFDLENBQUM7UUFFcEQsd0JBQXdCO1FBQ3hCLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRTtZQUNqQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDM0I7UUFDRCxJQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztRQUVwQixtQkFBbUI7UUFDbkIsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLGtCQUFrQixFQUFFO1lBQ3pDLE1BQU0sRUFBRSxFQUFFO1lBQ1YsU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDckIsR0FBRyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUU7WUFDZixTQUFTLEVBQUUsSUFBSTtTQUNmLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFDO0lBQzVCLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBJY3NTb3VyY2UgLSBFdmVudCBzb3VyY2UgZm9yIElDUyBjYWxlbmRhciBkYXRhXHJcbiAqXHJcbiAqIFRoaXMgc291cmNlIGludGVncmF0ZXMgZXh0ZXJuYWwgY2FsZW5kYXIgZXZlbnRzIGludG8gdGhlIGRhdGFmbG93IGFyY2hpdGVjdHVyZS5cclxuICogSXQgbGlzdGVucyB0byBJY3NNYW5hZ2VyIHVwZGF0ZXMgYW5kIGVtaXRzIHN0YW5kYXJkaXplZCBkYXRhZmxvdyBldmVudHMuXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQXBwLCBFdmVudFJlZiB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBFdmVudHMsIGVtaXQsIFNlcSB9IGZyb20gXCIuLi9ldmVudHMvRXZlbnRzXCI7XHJcbmltcG9ydCB0eXBlIHsgSWNzTWFuYWdlciB9IGZyb20gXCJAL21hbmFnZXJzL2ljcy1tYW5hZ2VyXCI7XHJcbmltcG9ydCB0eXBlIHsgVGFzayB9IGZyb20gXCJAL3R5cGVzL3Rhc2tcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBJY3NTb3VyY2Uge1xyXG5cdHByaXZhdGUgZXZlbnRSZWZzOiBFdmVudFJlZltdID0gW107XHJcblx0cHJpdmF0ZSBpc0luaXRpYWxpemVkID0gZmFsc2U7XHJcblx0cHJpdmF0ZSBsYXN0SWNzVXBkYXRlU2VxID0gMDtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwcml2YXRlIGFwcDogQXBwLFxyXG5cdFx0cHJpdmF0ZSBnZXRJY3NNYW5hZ2VyOiAoKSA9PiBJY3NNYW5hZ2VyIHwgdW5kZWZpbmVkLFxyXG5cdCkge31cclxuXHJcblx0LyoqXHJcblx0ICogSW5pdGlhbGl6ZSB0aGUgSUNTIHNvdXJjZSBhbmQgc3RhcnQgbGlzdGVuaW5nIGZvciBjYWxlbmRhciB1cGRhdGVzXHJcblx0ICovXHJcblx0aW5pdGlhbGl6ZSgpOiB2b2lkIHtcclxuXHRcdGlmICh0aGlzLmlzSW5pdGlhbGl6ZWQpIHJldHVybjtcclxuXHJcblx0XHRjb25zb2xlLmxvZyhcIltJY3NTb3VyY2VdIEluaXRpYWxpemluZyBJQ1MgZXZlbnQgc291cmNlLi4uXCIpO1xyXG5cclxuXHRcdC8vIFN1YnNjcmliZSB0byBJQ1MgbWFuYWdlciB1cGRhdGVzIGZpcnN0IHNvIHdlIGRvbid0IG1pc3MgZWFybHkgc2lnbmFsc1xyXG5cdFx0dGhpcy5zdWJzY3JpYmVUb0ljc1VwZGF0ZXMoKTtcclxuXHJcblx0XHQvLyBJbml0aWFsIGxvYWQgb2YgSUNTIGV2ZW50cyAobWF5IGJlIG5vLW9wIGlmIG1hbmFnZXIgbm90IHJlYWR5IHlldClcclxuXHRcdHRoaXMubG9hZEFuZEVtaXRJY3NFdmVudHMoKTtcclxuXHJcblx0XHQvLyBGYWxsYmFjazogcmV0cnkgdW50aWwgSUNTIG1hbmFnZXIgYmVjb21lcyBhdmFpbGFibGUgKHVwIHRvIH4zMHMpXHJcblx0XHR0aGlzLmVuc3VyZU1hbmFnZXJBbmRMb2FkKDApO1xyXG5cclxuXHRcdHRoaXMuaXNJbml0aWFsaXplZCA9IHRydWU7XHJcblx0fVxyXG5cdC8qKlxyXG5cdCAqIEVuc3VyZSBJQ1MgbWFuYWdlciBiZWNvbWVzIGF2YWlsYWJsZSBzaG9ydGx5IGFmdGVyIHN0YXJ0dXAgYW5kIHRoZW4gbG9hZFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZW5zdXJlTWFuYWdlckFuZExvYWQoYXR0ZW1wdDogbnVtYmVyKTogdm9pZCB7XHJcblx0XHRjb25zdCBtYXhBdHRlbXB0cyA9IDMwOyAvLyB+MzBzIHdpdGggMXMgaW50ZXJ2YWxcclxuXHRcdGlmICh0aGlzLmdldEljc01hbmFnZXIoKSkge1xyXG5cdFx0XHR0aGlzLmxvYWRBbmRFbWl0SWNzRXZlbnRzKCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdGlmIChhdHRlbXB0ID49IG1heEF0dGVtcHRzKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcIltJY3NTb3VyY2VdIElDUyBtYW5hZ2VyIG5vdCBhdmFpbGFibGUgYWZ0ZXIgcmV0cmllc1wiKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0c2V0VGltZW91dCgoKSA9PiB0aGlzLmVuc3VyZU1hbmFnZXJBbmRMb2FkKGF0dGVtcHQgKyAxKSwgMTAwMCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTdWJzY3JpYmUgdG8gSUNTIG1hbmFnZXIgdXBkYXRlIGV2ZW50c1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgc3Vic2NyaWJlVG9JY3NVcGRhdGVzKCk6IHZvaWQge1xyXG5cdFx0Ly8gTGlzdGVuIGZvciBJQ1MgY2FjaGUgdXBkYXRlc1xyXG5cdFx0dGhpcy5hcHAud29ya3NwYWNlLm9uKFwiaWNzLWNhY2hlLXVwZGF0ZWRcIiBhcyBhbnksICgpID0+IHtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJbSWNzU291cmNlXSBJQ1MgY2FjaGUgdXBkYXRlZCwgcmVsb2FkaW5nIGV2ZW50cy4uLlwiKTtcclxuXHRcdFx0dGhpcy5sb2FkQW5kRW1pdEljc0V2ZW50cygpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gTGlzdGVuIGZvciBJQ1MgY29uZmlndXJhdGlvbiBjaGFuZ2VzXHJcblx0XHQvLyB0aGlzLmFwcC53b3Jrc3BhY2Uub24oXCJ0YXNrLWdlbml1czppY3MtY29uZmlnLWNoYW5nZWRcIiwgKCkgPT4ge1xyXG5cdFx0Ly8gXHRjb25zb2xlLmxvZyhcIltJY3NTb3VyY2VdIElDUyBjb25maWcgY2hhbmdlZCwgcmVsb2FkaW5nIGV2ZW50cy4uLlwiKTtcclxuXHRcdC8vIFx0dGhpcy5sb2FkQW5kRW1pdEljc0V2ZW50cygpO1xyXG5cdFx0Ly8gfSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBMb2FkIElDUyBldmVudHMgZnJvbSBtYW5hZ2VyIGFuZCBlbWl0IHVwZGF0ZSBldmVudFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgbG9hZEFuZEVtaXRJY3NFdmVudHMoKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRjb25zdCBpY3NNYW5hZ2VyID0gdGhpcy5nZXRJY3NNYW5hZ2VyKCk7XHJcblx0XHRpZiAoIWljc01hbmFnZXIpIHtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJbSWNzU291cmNlXSBObyBJQ1MgbWFuYWdlciBhdmFpbGFibGVcIik7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBHZXQgYWxsIElDUyBldmVudHMgd2l0aCBzeW5jXHJcblx0XHRcdGNvbnN0IGljc0V2ZW50cyA9IGF3YWl0IGljc01hbmFnZXIuZ2V0QWxsRXZlbnRzV2l0aFN5bmMoKTtcclxuXHJcblx0XHRcdC8vIENvbnZlcnQgSUNTIGV2ZW50cyB0byBJY3NUYXNrIGZvcm1hdCB2aWEgbWFuYWdlciB0byBlbnN1cmUgcHJvcGVyIHNoYXBlXHJcblx0XHRcdGNvbnN0IGljc1Rhc2tzOiBUYXNrW10gPSBpY3NNYW5hZ2VyLmNvbnZlcnRFdmVudHNUb1Rhc2tzKGljc0V2ZW50cyk7XHJcblxyXG5cdFx0XHRjb25zb2xlLmxvZyhgW0ljc1NvdXJjZV0gTG9hZGVkICR7aWNzVGFza3MubGVuZ3RofSBJQ1MgZXZlbnRzYCk7XHJcblxyXG5cdFx0XHQvLyBHZW5lcmF0ZSBzZXF1ZW5jZSBmb3IgdGhpcyB1cGRhdGVcclxuXHRcdFx0dGhpcy5sYXN0SWNzVXBkYXRlU2VxID0gU2VxLm5leHQoKTtcclxuXHJcblx0XHRcdC8vIEVtaXQgSUNTIGV2ZW50cyB1cGRhdGVcclxuXHRcdFx0ZW1pdCh0aGlzLmFwcCwgRXZlbnRzLklDU19FVkVOVFNfVVBEQVRFRCwge1xyXG5cdFx0XHRcdGV2ZW50czogaWNzVGFza3MsXHJcblx0XHRcdFx0dGltZXN0YW1wOiBEYXRlLm5vdygpLFxyXG5cdFx0XHRcdHNlcTogdGhpcy5sYXN0SWNzVXBkYXRlU2VxLFxyXG5cdFx0XHRcdHN0YXRzOiB7XHJcblx0XHRcdFx0XHR0b3RhbDogaWNzVGFza3MubGVuZ3RoLFxyXG5cdFx0XHRcdFx0c291cmNlczogdGhpcy5nZXRTb3VyY2VTdGF0cyhpY3NUYXNrcyksXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiW0ljc1NvdXJjZV0gRXJyb3IgbG9hZGluZyBJQ1MgZXZlbnRzOlwiLCBlcnJvcik7XHJcblxyXG5cdFx0XHQvLyBFbWl0IGVtcHR5IHVwZGF0ZSBvbiBlcnJvciB0byBjbGVhciBzdGFsZSBkYXRhXHJcblx0XHRcdGVtaXQodGhpcy5hcHAsIEV2ZW50cy5JQ1NfRVZFTlRTX1VQREFURUQsIHtcclxuXHRcdFx0XHRldmVudHM6IFtdLFxyXG5cdFx0XHRcdHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcclxuXHRcdFx0XHRzZXE6IFNlcS5uZXh0KCksXHJcblx0XHRcdFx0ZXJyb3I6IGVycm9yLm1lc3NhZ2UsXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHN0YXRpc3RpY3MgYWJvdXQgSUNTIHNvdXJjZXNcclxuXHQgKi9cclxuXHRwcml2YXRlIGdldFNvdXJjZVN0YXRzKGV2ZW50czogVGFza1tdKTogUmVjb3JkPHN0cmluZywgbnVtYmVyPiB7XHJcblx0XHRjb25zdCBzdGF0czogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHt9O1xyXG5cclxuXHRcdGZvciAoY29uc3QgZXZlbnQgb2YgZXZlbnRzKSB7XHJcblx0XHRcdGNvbnN0IHNvdXJjZUlkID0gZXZlbnQubWV0YWRhdGE/LnNvdXJjZT8uaWQgfHwgXCJ1bmtub3duXCI7XHJcblx0XHRcdHN0YXRzW3NvdXJjZUlkXSA9IChzdGF0c1tzb3VyY2VJZF0gfHwgMCkgKyAxO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBzdGF0cztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlZnJlc2ggSUNTIGV2ZW50cyBtYW51YWxseVxyXG5cdCAqL1xyXG5cdGFzeW5jIHJlZnJlc2goKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRjb25zb2xlLmxvZyhcIltJY3NTb3VyY2VdIE1hbnVhbCByZWZyZXNoIHRyaWdnZXJlZFwiKTtcclxuXHRcdGF3YWl0IHRoaXMubG9hZEFuZEVtaXRJY3NFdmVudHMoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBjdXJyZW50IHN0YXRpc3RpY3NcclxuXHQgKi9cclxuXHRnZXRTdGF0cygpOiB7XHJcblx0XHRpbml0aWFsaXplZDogYm9vbGVhbjtcclxuXHRcdGxhc3RVcGRhdGVTZXE6IG51bWJlcjtcclxuXHR9IHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGluaXRpYWxpemVkOiB0aGlzLmlzSW5pdGlhbGl6ZWQsXHJcblx0XHRcdGxhc3RVcGRhdGVTZXE6IHRoaXMubGFzdEljc1VwZGF0ZVNlcSxcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDbGVhbnVwIGFuZCBkZXN0cm95IHRoZSBzb3VyY2VcclxuXHQgKi9cclxuXHRkZXN0cm95KCk6IHZvaWQge1xyXG5cdFx0Y29uc29sZS5sb2coXCJbSWNzU291cmNlXSBEZXN0cm95aW5nIElDUyBzb3VyY2UuLi5cIik7XHJcblxyXG5cdFx0Ly8gQ2xlYXIgZXZlbnQgbGlzdGVuZXJzXHJcblx0XHRmb3IgKGNvbnN0IHJlZiBvZiB0aGlzLmV2ZW50UmVmcykge1xyXG5cdFx0XHR0aGlzLmFwcC52YXVsdC5vZmZyZWYocmVmKTtcclxuXHRcdH1cclxuXHRcdHRoaXMuZXZlbnRSZWZzID0gW107XHJcblxyXG5cdFx0Ly8gRW1pdCBjbGVhciBldmVudFxyXG5cdFx0ZW1pdCh0aGlzLmFwcCwgRXZlbnRzLklDU19FVkVOVFNfVVBEQVRFRCwge1xyXG5cdFx0XHRldmVudHM6IFtdLFxyXG5cdFx0XHR0aW1lc3RhbXA6IERhdGUubm93KCksXHJcblx0XHRcdHNlcTogU2VxLm5leHQoKSxcclxuXHRcdFx0ZGVzdHJveWVkOiB0cnVlLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5pc0luaXRpYWxpemVkID0gZmFsc2U7XHJcblx0fVxyXG59XHJcbiJdfQ==