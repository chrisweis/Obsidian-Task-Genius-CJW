import { Component } from "obsidian";
/**
 * Virtual scroll manager for handling large datasets with lazy loading
 */
export class VirtualScrollManager extends Component {
    constructor(containerEl, pageSize, callbacks) {
        super();
        this.containerEl = containerEl;
        this.pageSize = pageSize;
        this.callbacks = callbacks;
        this.rowHeight = 40; // Default row height in pixels
        this.bufferSize = 10; // Number of extra rows to render outside viewport
        this.isLoading = false;
        this.totalRows = 0;
        this.loadedRows = 0;
        // Scroll handling
        this.lastScrollTop = 0;
        this.scrollDirection = "down";
        this.scrollRAF = null;
        this.pendingScrollUpdate = false;
        // Performance optimization
        this.lastLoadTriggerTime = 0;
        this.loadCooldown = 500; // Minimum 500ms between load attempts
        this.isAtBottom = false;
        this.isAtTop = true;
        // Height stability
        this.heightStabilizer = null;
        this.stableHeight = 0;
        this.heightUpdateThrottle = 0;
        this.scrollContainer = containerEl;
        this.viewport = {
            startIndex: 0,
            endIndex: 0,
            visibleRows: [],
            totalHeight: 0,
            scrollTop: 0,
        };
    }
    onload() {
        this.setupScrollContainer();
        this.setupEventListeners();
        this.calculateViewport();
        this.initializeHeightStabilizer();
    }
    onunload() {
        this.cleanup();
    }
    /**
     * Setup scroll container
     */
    setupScrollContainer() {
        // For table view, we need to find the actual scrollable container
        // which might be the table container, not the table itself
        let scrollableContainer = this.scrollContainer;
        // If the container is not scrollable, look for a parent that is
        if (scrollableContainer.style.overflowY !== "auto" &&
            scrollableContainer.style.overflowY !== "scroll") {
            scrollableContainer.style.overflowY = "auto";
        }
        scrollableContainer.style.position = "relative";
    }
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.registerDomEvent(this.scrollContainer, "scroll", this.onScroll.bind(this));
        // Handle resize events
        this.registerDomEvent(window, "resize", this.handleResize.bind(this));
    }
    /**
     * Initialize height stabilizer to prevent scrollbar jitter
     */
    initializeHeightStabilizer() {
        // Create a transparent element that maintains consistent height
        this.heightStabilizer = document.createElement("div");
        this.heightStabilizer.style.cssText = `
			position: absolute;
			top: 0;
			left: 0;
			width: 1px;
			height: ${this.totalRows * this.rowHeight}px;
			pointer-events: none;
			visibility: hidden;
			z-index: -1;
		`;
        this.scrollContainer.appendChild(this.heightStabilizer);
        this.stableHeight = this.totalRows * this.rowHeight;
    }
    /**
     * Update content and recalculate viewport with height stability
     */
    updateContent(totalRowCount) {
        this.totalRows = totalRowCount;
        this.isAtBottom = false;
        this.isAtTop = true;
        // Update stable height gradually to prevent jumps
        const newHeight = this.totalRows * this.rowHeight;
        if (Math.abs(newHeight - this.stableHeight) > this.rowHeight) {
            this.updateStableHeight(newHeight);
        }
        this.calculateViewport();
        this.updateVirtualHeight();
    }
    /**
     * Update stable height with throttling to prevent frequent changes
     */
    updateStableHeight(newHeight) {
        const now = performance.now();
        if (now - this.heightUpdateThrottle < 100) {
            // Max 10 updates per second
            return;
        }
        this.heightUpdateThrottle = now;
        this.stableHeight = newHeight;
        if (this.heightStabilizer) {
            this.heightStabilizer.style.height = `${newHeight}px`;
        }
    }
    /**
     * Handle scroll events with requestAnimationFrame
     */
    onScroll() {
        // Set pending flag to prevent multiple RAF calls
        if (this.pendingScrollUpdate) {
            return;
        }
        this.pendingScrollUpdate = true;
        // Cancel any existing RAF
        if (this.scrollRAF) {
            cancelAnimationFrame(this.scrollRAF);
        }
        // Use requestAnimationFrame for smooth updates
        this.scrollRAF = requestAnimationFrame(() => {
            this.handleScroll();
            this.pendingScrollUpdate = false;
            this.scrollRAF = null;
        });
    }
    /**
     * Handle scroll logic with improved stability and reduced frequency
     */
    handleScroll() {
        const scrollTop = this.scrollContainer.scrollTop;
        const scrollHeight = this.scrollContainer.scrollHeight;
        const clientHeight = this.scrollContainer.clientHeight;
        // Calculate scroll delta for direction detection
        const scrollDelta = Math.abs(scrollTop - this.lastScrollTop);
        // Update scroll direction
        this.scrollDirection = scrollTop > this.lastScrollTop ? "down" : "up";
        this.lastScrollTop = scrollTop;
        // Update viewport - always calculate to ensure consistency
        this.viewport.scrollTop = scrollTop;
        const viewportChanged = this.calculateViewport();
        // Always notify callback for scroll position changes to ensure smooth rendering
        // Remove the excessive throttling that was causing white screens
        if (viewportChanged || scrollDelta > 0) {
            // Use immediate callback instead of queueMicrotask to reduce delay
            this.callbacks.onScroll(scrollTop);
        }
        // Boundary detection
        this.isAtTop = scrollTop <= 1;
        this.isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
        // Load more data logic - keep this conservative
        const currentTime = performance.now();
        const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
        const shouldLoadMore = !this.isLoading &&
            !this.isAtBottom &&
            this.scrollDirection === "down" &&
            this.loadedRows < this.totalRows &&
            scrollPercentage > 0.85 &&
            currentTime - this.lastLoadTriggerTime > this.loadCooldown;
        if (shouldLoadMore) {
            this.lastLoadTriggerTime = currentTime;
            this.loadMoreData();
        }
    }
    /**
     * Calculate visible viewport with improved stability
     */
    calculateViewport() {
        const scrollTop = this.viewport.scrollTop;
        const containerHeight = this.scrollContainer.clientHeight;
        // Calculate visible row range with bounds checking
        // Special handling for top boundary to prevent white space
        let startIndex;
        if (scrollTop <= this.rowHeight) {
            // When very close to top, always start from 0 to avoid white space
            startIndex = 0;
        }
        else {
            startIndex = Math.max(0, Math.floor(scrollTop / this.rowHeight) - this.bufferSize);
        }
        const visibleRowCount = Math.ceil(containerHeight / this.rowHeight);
        const endIndex = Math.min(this.totalRows - 1, startIndex + visibleRowCount + this.bufferSize * 2);
        // Reduce threshold for viewport changes to ensure responsive rendering during fast scrolling
        const VIEWPORT_CHANGE_THRESHOLD = 1; // Reduced from 2 to 1 for more responsive updates
        const startIndexDiff = Math.abs(this.viewport.startIndex - startIndex);
        const endIndexDiff = Math.abs(this.viewport.endIndex - endIndex);
        const viewportChanged = startIndexDiff >= VIEWPORT_CHANGE_THRESHOLD ||
            endIndexDiff >= VIEWPORT_CHANGE_THRESHOLD;
        if (viewportChanged) {
            this.viewport.startIndex = startIndex;
            this.viewport.endIndex = endIndex;
            this.viewport.totalHeight = this.stableHeight; // Use stable height
        }
        return viewportChanged;
    }
    /**
     * Update virtual height using stable height reference
     */
    updateVirtualHeight() {
        // Use the stable height instead of recalculating
        this.viewport.totalHeight = this.stableHeight;
    }
    /**
     * Get the expected total content height
     */
    getExpectedTotalHeight() {
        return this.totalRows * this.rowHeight;
    }
    /**
     * Check if the scroll container height needs adjustment
     */
    needsHeightAdjustment() {
        const expectedHeight = this.getExpectedTotalHeight();
        const currentHeight = this.scrollContainer.scrollHeight;
        return Math.abs(currentHeight - expectedHeight) > this.rowHeight;
    }
    /**
     * Load more data with improved state management
     */
    loadMoreData() {
        if (this.isLoading || this.isAtBottom)
            return;
        // Don't load if we've already loaded all data
        if (this.loadedRows >= this.totalRows) {
            this.isLoading = false;
            return;
        }
        this.isLoading = true;
        // Use microtask to ensure smooth scrolling
        queueMicrotask(() => {
            if (this.callbacks.onLoadMore) {
                this.callbacks.onLoadMore();
            }
            this.loadNextBatch();
        });
    }
    /**
     * Load next batch with better completion detection
     */
    loadNextBatch() {
        const nextBatchSize = Math.min(this.pageSize, this.totalRows - this.loadedRows);
        if (nextBatchSize <= 0) {
            this.isLoading = false;
            this.isAtBottom = true; // Mark as bottom reached
            return;
        }
        // Simulate loading delay (in real implementation, this would be async data loading)
        setTimeout(() => {
            this.loadedRows += nextBatchSize;
            this.isLoading = false;
            // Check if we've loaded everything
            if (this.loadedRows >= this.totalRows) {
                this.isAtBottom = true;
            }
            // Recalculate viewport after loading
            this.calculateViewport();
        }, 100);
    }
    /**
     * Get current viewport data
     */
    getViewport() {
        return Object.assign({}, this.viewport);
    }
    /**
     * Scroll to specific row
     */
    scrollToRow(rowIndex, behavior = "smooth") {
        const targetScrollTop = rowIndex * this.rowHeight;
        this.scrollContainer.scrollTo({
            top: targetScrollTop,
            behavior: behavior,
        });
    }
    /**
     * Scroll to top
     */
    scrollToTop(behavior = "smooth") {
        this.scrollToRow(0, behavior);
    }
    /**
     * Scroll to bottom
     */
    scrollToBottom(behavior = "smooth") {
        this.scrollToRow(this.totalRows - 1, behavior);
    }
    /**
     * Set row height (affects all calculations)
     */
    setRowHeight(height) {
        this.rowHeight = height;
        this.calculateViewport();
        this.updateVirtualHeight();
    }
    /**
     * Set buffer size (number of extra rows to render)
     */
    setBufferSize(size) {
        this.bufferSize = size;
        this.calculateViewport();
    }
    /**
     * Check if a row is currently visible
     */
    isRowVisible(rowIndex) {
        return (rowIndex >= this.viewport.startIndex &&
            rowIndex <= this.viewport.endIndex);
    }
    /**
     * Get visible row indices
     */
    getVisibleRowIndices() {
        const indices = [];
        for (let i = this.viewport.startIndex; i <= this.viewport.endIndex; i++) {
            indices.push(i);
        }
        return indices;
    }
    /**
     * Handle container resize
     */
    handleResize() {
        // Recalculate viewport on resize
        this.calculateViewport();
    }
    /**
     * Reset virtual scroll state with improved cleanup
     */
    reset() {
        this.totalRows = 0;
        this.loadedRows = 0;
        this.isLoading = false;
        this.lastScrollTop = 0;
        this.isAtBottom = false;
        this.isAtTop = true;
        this.lastLoadTriggerTime = 0;
        this.stableHeight = 0;
        this.viewport = {
            startIndex: 0,
            endIndex: 0,
            visibleRows: [],
            totalHeight: 0,
            scrollTop: 0,
        };
        // Cancel any pending scroll RAF
        if (this.scrollRAF) {
            cancelAnimationFrame(this.scrollRAF);
            this.scrollRAF = null;
        }
        // Reset height stabilizer
        if (this.heightStabilizer) {
            this.heightStabilizer.style.height = "0px";
        }
        // Scroll to top and recalculate viewport
        this.scrollToTop("auto");
        this.calculateViewport();
    }
    /**
     * Get scroll statistics
     */
    getScrollStats() {
        const scrollTop = this.viewport.scrollTop;
        const scrollHeight = this.scrollContainer.scrollHeight;
        const clientHeight = this.scrollContainer.clientHeight;
        const scrollPercentage = scrollHeight > 0 ? (scrollTop + clientHeight) / scrollHeight : 0;
        return {
            scrollTop,
            scrollHeight,
            clientHeight,
            scrollPercentage,
            direction: this.scrollDirection,
            visibleRowCount: this.viewport.endIndex - this.viewport.startIndex + 1,
            totalRows: this.totalRows,
            loadedRows: this.loadedRows,
            isLoading: this.isLoading,
        };
    }
    /**
     * Enable or disable virtual scrolling
     */
    setEnabled(enabled) {
        if (enabled) {
            this.registerDomEvent(this.scrollContainer, "scroll", this.onScroll.bind(this));
        }
        else {
            this.scrollContainer.removeEventListener("scroll", this.onScroll.bind(this));
        }
    }
    /**
     * Cleanup resources including height stabilizer
     */
    cleanup() {
        // Cancel any pending animation frame
        if (this.scrollRAF) {
            cancelAnimationFrame(this.scrollRAF);
            this.scrollRAF = null;
        }
        // Remove height stabilizer
        if (this.heightStabilizer && this.heightStabilizer.parentNode) {
            this.heightStabilizer.parentNode.removeChild(this.heightStabilizer);
            this.heightStabilizer = null;
        }
        this.scrollContainer.removeEventListener("scroll", this.onScroll.bind(this));
        window.removeEventListener("resize", this.handleResize.bind(this));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVmlydHVhbFNjcm9sbE1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJWaXJ0dWFsU2Nyb2xsTWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBR3JDOztHQUVHO0FBQ0gsTUFBTSxPQUFPLG9CQUFxQixTQUFRLFNBQVM7SUEwQmxELFlBQ1MsV0FBd0IsRUFDeEIsUUFBZ0IsRUFDaEIsU0FBaUM7UUFFekMsS0FBSyxFQUFFLENBQUM7UUFKQSxnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUN4QixhQUFRLEdBQVIsUUFBUSxDQUFRO1FBQ2hCLGNBQVMsR0FBVCxTQUFTLENBQXdCO1FBMUJsQyxjQUFTLEdBQVcsRUFBRSxDQUFDLENBQUMsK0JBQStCO1FBQ3ZELGVBQVUsR0FBVyxFQUFFLENBQUMsQ0FBQyxrREFBa0Q7UUFDM0UsY0FBUyxHQUFZLEtBQUssQ0FBQztRQUMzQixjQUFTLEdBQVcsQ0FBQyxDQUFDO1FBQ3RCLGVBQVUsR0FBVyxDQUFDLENBQUM7UUFFL0Isa0JBQWtCO1FBQ1Ysa0JBQWEsR0FBVyxDQUFDLENBQUM7UUFDMUIsb0JBQWUsR0FBa0IsTUFBTSxDQUFDO1FBQ3hDLGNBQVMsR0FBa0IsSUFBSSxDQUFDO1FBQ2hDLHdCQUFtQixHQUFZLEtBQUssQ0FBQztRQUU3QywyQkFBMkI7UUFDbkIsd0JBQW1CLEdBQVcsQ0FBQyxDQUFDO1FBQ2hDLGlCQUFZLEdBQVcsR0FBRyxDQUFDLENBQUMsc0NBQXNDO1FBQ2xFLGVBQVUsR0FBWSxLQUFLLENBQUM7UUFDNUIsWUFBTyxHQUFZLElBQUksQ0FBQztRQUVoQyxtQkFBbUI7UUFDWCxxQkFBZ0IsR0FBdUIsSUFBSSxDQUFDO1FBQzVDLGlCQUFZLEdBQVcsQ0FBQyxDQUFDO1FBQ3pCLHlCQUFvQixHQUFXLENBQUMsQ0FBQztRQVN4QyxJQUFJLENBQUMsZUFBZSxHQUFHLFdBQVcsQ0FBQztRQUNuQyxJQUFJ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O0lBQ0ssT0FBTztRQUNkLHFDQUFxQztRQUNyQyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUU7WUFDbkIsb0JBQW9CLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3JDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO1NBQ3RCO1FBRUQsMkJBQTJCO1FBQzNCLElBQUksSUFBSSxDQUFDLGdCQUFnQixJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUU7WUFDOUQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDcEUsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQztTQUM3QjtRQUVELElBQUksQ0FBQyxlQUFlLENBQUMsbUJBQW1CLENBQ3ZDLFFBQVEsRUFDUixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FDeEIsQ0FBQztRQUNGLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNwRSxDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgVmlydHVhbFNjcm9sbENhbGxiYWNrcywgVmlld3BvcnREYXRhIH0gZnJvbSBcIi4vVGFibGVUeXBlc1wiO1xyXG5cclxuLyoqXHJcbiAqIFZpcnR1YWwgc2Nyb2xsIG1hbmFnZXIgZm9yIGhhbmRsaW5nIGxhcmdlIGRhdGFzZXRzIHdpdGggbGF6eSBsb2FkaW5nXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgVmlydHVhbFNjcm9sbE1hbmFnZXIgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdHByaXZhdGUgc2Nyb2xsQ29udGFpbmVyOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIHZpZXdwb3J0OiBWaWV3cG9ydERhdGE7XHJcblx0cHJpdmF0ZSByb3dIZWlnaHQ6IG51bWJlciA9IDQwOyAvLyBEZWZhdWx0IHJvdyBoZWlnaHQgaW4gcGl4ZWxzXHJcblx0cHJpdmF0ZSBidWZmZXJTaXplOiBudW1iZXIgPSAxMDsgLy8gTnVtYmVyIG9mIGV4dHJhIHJvd3MgdG8gcmVuZGVyIG91dHNpZGUgdmlld3BvcnRcclxuXHRwcml2YXRlIGlzTG9hZGluZzogYm9vbGVhbiA9IGZhbHNlO1xyXG5cdHByaXZhdGUgdG90YWxSb3dzOiBudW1iZXIgPSAwO1xyXG5cdHByaXZhdGUgbG9hZGVkUm93czogbnVtYmVyID0gMDtcclxuXHJcblx0Ly8gU2Nyb2xsIGhhbmRsaW5nXHJcblx0cHJpdmF0ZSBsYXN0U2Nyb2xsVG9wOiBudW1iZXIgPSAwO1xyXG5cdHByaXZhdGUgc2Nyb2xsRGlyZWN0aW9uOiBcInVwXCIgfCBcImRvd25cIiA9IFwiZG93blwiO1xyXG5cdHByaXZhdGUgc2Nyb2xsUkFGOiBudW1iZXIgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIHBlbmRpbmdTY3JvbGxVcGRhdGU6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcblx0Ly8gUGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9uXHJcblx0cHJpdmF0ZSBsYXN0TG9hZFRyaWdnZXJUaW1lOiBudW1iZXIgPSAwO1xyXG5cdHByaXZhdGUgbG9hZENvb2xkb3duOiBudW1iZXIgPSA1MDA7IC8vIE1pbmltdW0gNTAwbXMgYmV0d2VlbiBsb2FkIGF0dGVtcHRzXHJcblx0cHJpdmF0ZSBpc0F0Qm90dG9tOiBib29sZWFuID0gZmFsc2U7XHJcblx0cHJpdmF0ZSBpc0F0VG9wOiBib29sZWFuID0gdHJ1ZTtcclxuXHJcblx0Ly8gSGVpZ2h0IHN0YWJpbGl0eVxyXG5cdHByaXZhdGUgaGVpZ2h0U3RhYmlsaXplcjogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIHN0YWJsZUhlaWdodDogbnVtYmVyID0gMDtcclxuXHRwcml2YXRlIGhlaWdodFVwZGF0ZVRocm90dGxlOiBudW1iZXIgPSAwO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHByaXZhdGUgY29udGFpbmVyRWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0cHJpdmF0ZSBwYWdlU2l6ZTogbnVtYmVyLFxyXG5cdFx0cHJpdmF0ZSBjYWxsYmFja3M6IFZpcnR1YWxTY3JvbGxDYWxsYmFja3NcclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblxyXG5cdFx0dGhpcy5zY3JvbGxDb250YWluZXIgPSBjb250YWluZXJFbDtcclxuXHRcdHRoaXMudmlld3BvcnQgPSB7XHJcblx0XHRcdHN0YXJ0SW5kZXg6IDAsXHJcblx0XHRcdGVuZEluZGV4OiAwLFxyXG5cdFx0XHR2aXNpYmxlUm93czogW10sXHJcblx0XHRcdHRvdGFsSGVpZ2h0OiAwLFxyXG5cdFx0XHRzY3JvbGxUb3A6IDAsXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0b25sb2FkKCkge1xyXG5cdFx0dGhpcy5zZXR1cFNjcm9sbENvbnRhaW5lcigpO1xyXG5cdFx0dGhpcy5zZXR1cEV2ZW50TGlzdGVuZXJzKCk7XHJcblx0XHR0aGlzLmNhbGN1bGF0ZVZpZXdwb3J0KCk7XHJcblx0XHR0aGlzLmluaXRpYWxpemVIZWlnaHRTdGFiaWxpemVyKCk7XHJcblx0fVxyXG5cclxuXHRvbnVubG9hZCgpIHtcclxuXHRcdHRoaXMuY2xlYW51cCgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2V0dXAgc2Nyb2xsIGNvbnRhaW5lclxyXG5cdCAqL1xyXG5cdHByaXZhdGUgc2V0dXBTY3JvbGxDb250YWluZXIoKSB7XHJcblx0XHQvLyBGb3IgdGFibGUgdmlldywgd2UgbmVlZCB0byBmaW5kIHRoZSBhY3R1YWwgc2Nyb2xsYWJsZSBjb250YWluZXJcclxuXHRcdC8vIHdoaWNoIG1pZ2h0IGJlIHRoZSB0YWJsZSBjb250YWluZXIsIG5vdCB0aGUgdGFibGUgaXRzZWxmXHJcblx0XHRsZXQgc2Nyb2xsYWJsZUNvbnRhaW5lciA9IHRoaXMuc2Nyb2xsQ29udGFpbmVyO1xyXG5cclxuXHRcdC8vIElmIHRoZSBjb250YWluZXIgaXMgbm90IHNjcm9sbGFibGUsIGxvb2sgZm9yIGEgcGFyZW50IHRoYXQgaXNcclxuXHRcdGlmIChcclxuXHRcdFx0c2Nyb2xsYWJsZUNvbnRhaW5lci5zdHlsZS5vdmVyZmxvd1kgIT09IFwiYXV0b1wiICYmXHJcblx0XHRcdHNjcm9sbGFibGVDb250YWluZXIuc3R5bGUub3ZlcmZsb3dZICE9PSBcInNjcm9sbFwiXHJcblx0XHQpIHtcclxuXHRcdFx0c2Nyb2xsYWJsZUNvbnRhaW5lci5zdHlsZS5vdmVyZmxvd1kgPSBcImF1dG9cIjtcclxuXHRcdH1cclxuXHJcblx0XHRzY3JvbGxhYmxlQ29udGFpbmVyLnN0eWxlLnBvc2l0aW9uID0gXCJyZWxhdGl2ZVwiO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2V0dXAgZXZlbnQgbGlzdGVuZXJzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBzZXR1cEV2ZW50TGlzdGVuZXJzKCkge1xyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KFxyXG5cdFx0XHR0aGlzLnNjcm9sbENvbnRhaW5lcixcclxuXHRcdFx0XCJzY3JvbGxcIixcclxuXHRcdFx0dGhpcy5vblNjcm9sbC5iaW5kKHRoaXMpXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIEhhbmRsZSByZXNpemUgZXZlbnRzXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQod2luZG93LCBcInJlc2l6ZVwiLCB0aGlzLmhhbmRsZVJlc2l6ZS5iaW5kKHRoaXMpKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEluaXRpYWxpemUgaGVpZ2h0IHN0YWJpbGl6ZXIgdG8gcHJldmVudCBzY3JvbGxiYXIgaml0dGVyXHJcblx0ICovXHJcblx0cHJpdmF0ZSBpbml0aWFsaXplSGVpZ2h0U3RhYmlsaXplcigpIHtcclxuXHRcdC8vIENyZWF0ZSBhIHRyYW5zcGFyZW50IGVsZW1lbnQgdGhhdCBtYWludGFpbnMgY29uc2lzdGVudCBoZWlnaHRcclxuXHRcdHRoaXMuaGVpZ2h0U3RhYmlsaXplciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcblx0XHR0aGlzLmhlaWdodFN0YWJpbGl6ZXIuc3R5bGUuY3NzVGV4dCA9IGBcclxuXHRcdFx0cG9zaXRpb246IGFic29sdXRlO1xyXG5cdFx0XHR0b3A6IDA7XHJcblx0XHRcdGxlZnQ6IDA7XHJcblx0XHRcdHdpZHRoOiAxcHg7XHJcblx0XHRcdGhlaWdodDogJHt0aGlzLnRvdGFsUm93cyAqIHRoaXMucm93SGVpZ2h0fXB4O1xyXG5cdFx0XHRwb2ludGVyLWV2ZW50czogbm9uZTtcclxuXHRcdFx0dmlzaWJpbGl0eTogaGlkZGVuO1xyXG5cdFx0XHR6LWluZGV4OiAtMTtcclxuXHRcdGA7XHJcblx0XHR0aGlzLnNjcm9sbENvbnRhaW5lci5hcHBlbmRDaGlsZCh0aGlzLmhlaWdodFN0YWJpbGl6ZXIpO1xyXG5cdFx0dGhpcy5zdGFibGVIZWlnaHQgPSB0aGlzLnRvdGFsUm93cyAqIHRoaXMucm93SGVpZ2h0O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIGNvbnRlbnQgYW5kIHJlY2FsY3VsYXRlIHZpZXdwb3J0IHdpdGggaGVpZ2h0IHN0YWJpbGl0eVxyXG5cdCAqL1xyXG5cdHB1YmxpYyB1cGRhdGVDb250ZW50KHRvdGFsUm93Q291bnQ6IG51bWJlcikge1xyXG5cdFx0dGhpcy50b3RhbFJvd3MgPSB0b3RhbFJvd0NvdW50O1xyXG5cdFx0dGhpcy5pc0F0Qm90dG9tID0gZmFsc2U7XHJcblx0XHR0aGlzLmlzQXRUb3AgPSB0cnVlO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSBzdGFibGUgaGVpZ2h0IGdyYWR1YWxseSB0byBwcmV2ZW50IGp1bXBzXHJcblx0XHRjb25zdCBuZXdIZWlnaHQgPSB0aGlzLnRvdGFsUm93cyAqIHRoaXMucm93SGVpZ2h0O1xyXG5cdFx0aWYgKE1hdGguYWJzKG5ld0hlaWdodCAtIHRoaXMuc3RhYmxlSGVpZ2h0KSA+IHRoaXMucm93SGVpZ2h0KSB7XHJcblx0XHRcdHRoaXMudXBkYXRlU3RhYmxlSGVpZ2h0KG5ld0hlaWdodCk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5jYWxjdWxhdGVWaWV3cG9ydCgpO1xyXG5cdFx0dGhpcy51cGRhdGVWaXJ0dWFsSGVpZ2h0KCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgc3RhYmxlIGhlaWdodCB3aXRoIHRocm90dGxpbmcgdG8gcHJldmVudCBmcmVxdWVudCBjaGFuZ2VzXHJcblx0ICovXHJcblx0cHJpdmF0ZSB1cGRhdGVTdGFibGVIZWlnaHQobmV3SGVpZ2h0OiBudW1iZXIpIHtcclxuXHRcdGNvbnN0IG5vdyA9IHBlcmZvcm1hbmNlLm5vdygpO1xyXG5cdFx0aWYgKG5vdyAtIHRoaXMuaGVpZ2h0VXBkYXRlVGhyb3R0bGUgPCAxMDApIHtcclxuXHRcdFx0Ly8gTWF4IDEwIHVwZGF0ZXMgcGVyIHNlY29uZFxyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5oZWlnaHRVcGRhdGVUaHJvdHRsZSA9IG5vdztcclxuXHRcdHRoaXMuc3RhYmxlSGVpZ2h0ID0gbmV3SGVpZ2h0O1xyXG5cclxuXHRcdGlmICh0aGlzLmhlaWdodFN0YWJpbGl6ZXIpIHtcclxuXHRcdFx0dGhpcy5oZWlnaHRTdGFiaWxpemVyLnN0eWxlLmhlaWdodCA9IGAke25ld0hlaWdodH1weGA7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBIYW5kbGUgc2Nyb2xsIGV2ZW50cyB3aXRoIHJlcXVlc3RBbmltYXRpb25GcmFtZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgb25TY3JvbGwoKSB7XHJcblx0XHQvLyBTZXQgcGVuZGluZyBmbGFnIHRvIHByZXZlbnQgbXVsdGlwbGUgUkFGIGNhbGxzXHJcblx0XHRpZiAodGhpcy5wZW5kaW5nU2Nyb2xsVXBkYXRlKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnBlbmRpbmdTY3JvbGxVcGRhdGUgPSB0cnVlO1xyXG5cclxuXHRcdC8vIENhbmNlbCBhbnkgZXhpc3RpbmcgUkFGXHJcblx0XHRpZiAodGhpcy5zY3JvbGxSQUYpIHtcclxuXHRcdFx0Y2FuY2VsQW5pbWF0aW9uRnJhbWUodGhpcy5zY3JvbGxSQUYpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFVzZSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgZm9yIHNtb290aCB1cGRhdGVzXHJcblx0XHR0aGlzLnNjcm9sbFJBRiA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XHJcblx0XHRcdHRoaXMuaGFuZGxlU2Nyb2xsKCk7XHJcblx0XHRcdHRoaXMucGVuZGluZ1Njcm9sbFVwZGF0ZSA9IGZhbHNlO1xyXG5cdFx0XHR0aGlzLnNjcm9sbFJBRiA9IG51bGw7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSBzY3JvbGwgbG9naWMgd2l0aCBpbXByb3ZlZCBzdGFiaWxpdHkgYW5kIHJlZHVjZWQgZnJlcXVlbmN5XHJcblx0ICovXHJcblx0cHVibGljIGhhbmRsZVNjcm9sbCgpIHtcclxuXHRcdGNvbnN0IHNjcm9sbFRvcCA9IHRoaXMuc2Nyb2xsQ29udGFpbmVyLnNjcm9sbFRvcDtcclxuXHRcdGNvbnN0IHNjcm9sbEhlaWdodCA9IHRoaXMuc2Nyb2xsQ29udGFpbmVyLnNjcm9sbEhlaWdodDtcclxuXHRcdGNvbnN0IGNsaWVudEhlaWdodCA9IHRoaXMuc2Nyb2xsQ29udGFpbmVyLmNsaWVudEhlaWdodDtcclxuXHJcblx0XHQvLyBDYWxjdWxhdGUgc2Nyb2xsIGRlbHRhIGZvciBkaXJlY3Rpb24gZGV0ZWN0aW9uXHJcblx0XHRjb25zdCBzY3JvbGxEZWx0YSA9IE1hdGguYWJzKHNjcm9sbFRvcCAtIHRoaXMubGFzdFNjcm9sbFRvcCk7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHNjcm9sbCBkaXJlY3Rpb25cclxuXHRcdHRoaXMuc2Nyb2xsRGlyZWN0aW9uID0gc2Nyb2xsVG9wID4gdGhpcy5sYXN0U2Nyb2xsVG9wID8gXCJkb3duXCIgOiBcInVwXCI7XHJcblx0XHR0aGlzLmxhc3RTY3JvbGxUb3AgPSBzY3JvbGxUb3A7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHZpZXdwb3J0IC0gYWx3YXlzIGNhbGN1bGF0ZSB0byBlbnN1cmUgY29uc2lzdGVuY3lcclxuXHRcdHRoaXMudmlld3BvcnQuc2Nyb2xsVG9wID0gc2Nyb2xsVG9wO1xyXG5cdFx0Y29uc3Qgdmlld3BvcnRDaGFuZ2VkID0gdGhpcy5jYWxjdWxhdGVWaWV3cG9ydCgpO1xyXG5cclxuXHRcdC8vIEFsd2F5cyBub3RpZnkgY2FsbGJhY2sgZm9yIHNjcm9sbCBwb3NpdGlvbiBjaGFuZ2VzIHRvIGVuc3VyZSBzbW9vdGggcmVuZGVyaW5nXHJcblx0XHQvLyBSZW1vdmUgdGhlIGV4Y2Vzc2l2ZSB0aHJvdHRsaW5nIHRoYXQgd2FzIGNhdXNpbmcgd2hpdGUgc2NyZWVuc1xyXG5cdFx0aWYgKHZpZXdwb3J0Q2hhbmdlZCB8fCBzY3JvbGxEZWx0YSA+IDApIHtcclxuXHRcdFx0Ly8gVXNlIGltbWVkaWF0ZSBjYWxsYmFjayBpbnN0ZWFkIG9mIHF1ZXVlTWljcm90YXNrIHRvIHJlZHVjZSBkZWxheVxyXG5cdFx0XHR0aGlzLmNhbGxiYWNrcy5vblNjcm9sbChzY3JvbGxUb3ApO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEJvdW5kYXJ5IGRldGVjdGlvblxyXG5cdFx0dGhpcy5pc0F0VG9wID0gc2Nyb2xsVG9wIDw9IDE7XHJcblx0XHR0aGlzLmlzQXRCb3R0b20gPSBzY3JvbGxUb3AgKyBjbGllbnRIZWlnaHQgPj0gc2Nyb2xsSGVpZ2h0IC0gMTA7XHJcblxyXG5cdFx0Ly8gTG9hZCBtb3JlIGRhdGEgbG9naWMgLSBrZWVwIHRoaXMgY29uc2VydmF0aXZlXHJcblx0XHRjb25zdCBjdXJyZW50VGltZSA9IHBlcmZvcm1hbmNlLm5vdygpO1xyXG5cdFx0Y29uc3Qgc2Nyb2xsUGVyY2VudGFnZSA9IChzY3JvbGxUb3AgKyBjbGllbnRIZWlnaHQpIC8gc2Nyb2xsSGVpZ2h0O1xyXG5cclxuXHRcdGNvbnN0IHNob3VsZExvYWRNb3JlID1cclxuXHRcdFx0IXRoaXMuaXNMb2FkaW5nICYmXHJcblx0XHRcdCF0aGlzLmlzQXRCb3R0b20gJiZcclxuXHRcdFx0dGhpcy5zY3JvbGxEaXJlY3Rpb24gPT09IFwiZG93blwiICYmXHJcblx0XHRcdHRoaXMubG9hZGVkUm93cyA8IHRoaXMudG90YWxSb3dzICYmXHJcblx0XHRcdHNjcm9sbFBlcmNlbnRhZ2UgPiAwLjg1ICYmXHJcblx0XHRcdGN1cnJlbnRUaW1lIC0gdGhpcy5sYXN0TG9hZFRyaWdnZXJUaW1lID4gdGhpcy5sb2FkQ29vbGRvd247XHJcblxyXG5cdFx0aWYgKHNob3VsZExvYWRNb3JlKSB7XHJcblx0XHRcdHRoaXMubGFzdExvYWRUcmlnZ2VyVGltZSA9IGN1cnJlbnRUaW1lO1xyXG5cdFx0XHR0aGlzLmxvYWRNb3JlRGF0YSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2FsY3VsYXRlIHZpc2libGUgdmlld3BvcnQgd2l0aCBpbXByb3ZlZCBzdGFiaWxpdHlcclxuXHQgKi9cclxuXHRwcml2YXRlIGNhbGN1bGF0ZVZpZXdwb3J0KCk6IGJvb2xlYW4ge1xyXG5cdFx0Y29uc3Qgc2Nyb2xsVG9wID0gdGhpcy52aWV3cG9ydC5zY3JvbGxUb3A7XHJcblx0XHRjb25zdCBjb250YWluZXJIZWlnaHQgPSB0aGlzLnNjcm9sbENvbnRhaW5lci5jbGllbnRIZWlnaHQ7XHJcblxyXG5cdFx0Ly8gQ2FsY3VsYXRlIHZpc2libGUgcm93IHJhbmdlIHdpdGggYm91bmRzIGNoZWNraW5nXHJcblx0XHQvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciB0b3AgYm91bmRhcnkgdG8gcHJldmVudCB3aGl0ZSBzcGFjZVxyXG5cdFx0bGV0IHN0YXJ0SW5kZXg6IG51bWJlcjtcclxuXHRcdGlmIChzY3JvbGxUb3AgPD0gdGhpcy5yb3dIZWlnaHQpIHtcclxuXHRcdFx0Ly8gV2hlbiB2ZXJ5IGNsb3NlIHRvIHRvcCwgYWx3YXlzIHN0YXJ0IGZyb20gMCB0byBhdm9pZCB3aGl0ZSBzcGFjZVxyXG5cdFx0XHRzdGFydEluZGV4ID0gMDtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHN0YXJ0SW5kZXggPSBNYXRoLm1heChcclxuXHRcdFx0XHQwLFxyXG5cdFx0XHRcdE1hdGguZmxvb3Ioc2Nyb2xsVG9wIC8gdGhpcy5yb3dIZWlnaHQpIC0gdGhpcy5idWZmZXJTaXplXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgdmlzaWJsZVJvd0NvdW50ID0gTWF0aC5jZWlsKGNvbnRhaW5lckhlaWdodCAvIHRoaXMucm93SGVpZ2h0KTtcclxuXHRcdGNvbnN0IGVuZEluZGV4ID0gTWF0aC5taW4oXHJcblx0XHRcdHRoaXMudG90YWxSb3dzIC0gMSxcclxuXHRcdFx0c3RhcnRJbmRleCArIHZpc2libGVSb3dDb3VudCArIHRoaXMuYnVmZmVyU2l6ZSAqIDJcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gUmVkdWNlIHRocmVzaG9sZCBmb3Igdmlld3BvcnQgY2hhbmdlcyB0byBlbnN1cmUgcmVzcG9uc2l2ZSByZW5kZXJpbmcgZHVyaW5nIGZhc3Qgc2Nyb2xsaW5nXHJcblx0XHRjb25zdCBWSUVXUE9SVF9DSEFOR0VfVEhSRVNIT0xEID0gMTsgLy8gUmVkdWNlZCBmcm9tIDIgdG8gMSBmb3IgbW9yZSByZXNwb25zaXZlIHVwZGF0ZXNcclxuXHRcdGNvbnN0IHN0YXJ0SW5kZXhEaWZmID0gTWF0aC5hYnModGhpcy52aWV3cG9ydC5zdGFydEluZGV4IC0gc3RhcnRJbmRleCk7XHJcblx0XHRjb25zdCBlbmRJbmRleERpZmYgPSBNYXRoLmFicyh0aGlzLnZpZXdwb3J0LmVuZEluZGV4IC0gZW5kSW5kZXgpO1xyXG5cclxuXHRcdGNvbnN0IHZpZXdwb3J0Q2hhbmdlZCA9XHJcblx0XHRcdHN0YXJ0SW5kZXhEaWZmID49IFZJRVdQT1JUX0NIQU5HRV9USFJFU0hPTEQgfHxcclxuXHRcdFx0ZW5kSW5kZXhEaWZmID49IFZJRVdQT1JUX0NIQU5HRV9USFJFU0hPTEQ7XHJcblxyXG5cdFx0aWYgKHZpZXdwb3J0Q2hhbmdlZCkge1xyXG5cdFx0XHR0aGlzLnZpZXdwb3J0LnN0YXJ0SW5kZXggPSBzdGFydEluZGV4O1xyXG5cdFx0XHR0aGlzLnZpZXdwb3J0LmVuZEluZGV4ID0gZW5kSW5kZXg7XHJcblx0XHRcdHRoaXMudmlld3BvcnQudG90YWxIZWlnaHQgPSB0aGlzLnN0YWJsZUhlaWdodDsgLy8gVXNlIHN0YWJsZSBoZWlnaHRcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdmlld3BvcnRDaGFuZ2VkO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIHZpcnR1YWwgaGVpZ2h0IHVzaW5nIHN0YWJsZSBoZWlnaHQgcmVmZXJlbmNlXHJcblx0ICovXHJcblx0cHJpdmF0ZSB1cGRhdGVWaXJ0dWFsSGVpZ2h0KCkge1xyXG5cdFx0Ly8gVXNlIHRoZSBzdGFibGUgaGVpZ2h0IGluc3RlYWQgb2YgcmVjYWxjdWxhdGluZ1xyXG5cdFx0dGhpcy52aWV3cG9ydC50b3RhbEhlaWdodCA9IHRoaXMuc3RhYmxlSGVpZ2h0O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHRoZSBleHBlY3RlZCB0b3RhbCBjb250ZW50IGhlaWdodFxyXG5cdCAqL1xyXG5cdHB1YmxpYyBnZXRFeHBlY3RlZFRvdGFsSGVpZ2h0KCk6IG51bWJlciB7XHJcblx0XHRyZXR1cm4gdGhpcy50b3RhbFJvd3MgKiB0aGlzLnJvd0hlaWdodDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGlmIHRoZSBzY3JvbGwgY29udGFpbmVyIGhlaWdodCBuZWVkcyBhZGp1c3RtZW50XHJcblx0ICovXHJcblx0cHVibGljIG5lZWRzSGVpZ2h0QWRqdXN0bWVudCgpOiBib29sZWFuIHtcclxuXHRcdGNvbnN0IGV4cGVjdGVkSGVpZ2h0ID0gdGhpcy5nZXRFeHBlY3RlZFRvdGFsSGVpZ2h0KCk7XHJcblx0XHRjb25zdCBjdXJyZW50SGVpZ2h0ID0gdGhpcy5zY3JvbGxDb250YWluZXIuc2Nyb2xsSGVpZ2h0O1xyXG5cdFx0cmV0dXJuIE1hdGguYWJzKGN1cnJlbnRIZWlnaHQgLSBleHBlY3RlZEhlaWdodCkgPiB0aGlzLnJvd0hlaWdodDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIExvYWQgbW9yZSBkYXRhIHdpdGggaW1wcm92ZWQgc3RhdGUgbWFuYWdlbWVudFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgbG9hZE1vcmVEYXRhKCkge1xyXG5cdFx0aWYgKHRoaXMuaXNMb2FkaW5nIHx8IHRoaXMuaXNBdEJvdHRvbSkgcmV0dXJuO1xyXG5cclxuXHRcdC8vIERvbid0IGxvYWQgaWYgd2UndmUgYWxyZWFkeSBsb2FkZWQgYWxsIGRhdGFcclxuXHRcdGlmICh0aGlzLmxvYWRlZFJvd3MgPj0gdGhpcy50b3RhbFJvd3MpIHtcclxuXHRcdFx0dGhpcy5pc0xvYWRpbmcgPSBmYWxzZTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuaXNMb2FkaW5nID0gdHJ1ZTtcclxuXHJcblx0XHQvLyBVc2UgbWljcm90YXNrIHRvIGVuc3VyZSBzbW9vdGggc2Nyb2xsaW5nXHJcblx0XHRxdWV1ZU1pY3JvdGFzaygoKSA9PiB7XHJcblx0XHRcdGlmICh0aGlzLmNhbGxiYWNrcy5vbkxvYWRNb3JlKSB7XHJcblx0XHRcdFx0dGhpcy5jYWxsYmFja3Mub25Mb2FkTW9yZSgpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHRoaXMubG9hZE5leHRCYXRjaCgpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBMb2FkIG5leHQgYmF0Y2ggd2l0aCBiZXR0ZXIgY29tcGxldGlvbiBkZXRlY3Rpb25cclxuXHQgKi9cclxuXHRwdWJsaWMgbG9hZE5leHRCYXRjaCgpIHtcclxuXHRcdGNvbnN0IG5leHRCYXRjaFNpemUgPSBNYXRoLm1pbihcclxuXHRcdFx0dGhpcy5wYWdlU2l6ZSxcclxuXHRcdFx0dGhpcy50b3RhbFJvd3MgLSB0aGlzLmxvYWRlZFJvd3NcclxuXHRcdCk7XHJcblxyXG5cdFx0aWYgKG5leHRCYXRjaFNpemUgPD0gMCkge1xyXG5cdFx0XHR0aGlzLmlzTG9hZGluZyA9IGZhbHNlO1xyXG5cdFx0XHR0aGlzLmlzQXRCb3R0b20gPSB0cnVlOyAvLyBNYXJrIGFzIGJvdHRvbSByZWFjaGVkXHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTaW11bGF0ZSBsb2FkaW5nIGRlbGF5IChpbiByZWFsIGltcGxlbWVudGF0aW9uLCB0aGlzIHdvdWxkIGJlIGFzeW5jIGRhdGEgbG9hZGluZylcclxuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHR0aGlzLmxvYWRlZFJvd3MgKz0gbmV4dEJhdGNoU2l6ZTtcclxuXHRcdFx0dGhpcy5pc0xvYWRpbmcgPSBmYWxzZTtcclxuXHJcblx0XHRcdC8vIENoZWNrIGlmIHdlJ3ZlIGxvYWRlZCBldmVyeXRoaW5nXHJcblx0XHRcdGlmICh0aGlzLmxvYWRlZFJvd3MgPj0gdGhpcy50b3RhbFJvd3MpIHtcclxuXHRcdFx0XHR0aGlzLmlzQXRCb3R0b20gPSB0cnVlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBSZWNhbGN1bGF0ZSB2aWV3cG9ydCBhZnRlciBsb2FkaW5nXHJcblx0XHRcdHRoaXMuY2FsY3VsYXRlVmlld3BvcnQoKTtcclxuXHRcdH0sIDEwMCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgY3VycmVudCB2aWV3cG9ydCBkYXRhXHJcblx0ICovXHJcblx0cHVibGljIGdldFZpZXdwb3J0KCk6IFZpZXdwb3J0RGF0YSB7XHJcblx0XHRyZXR1cm4geyAuLi50aGlzLnZpZXdwb3J0IH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTY3JvbGwgdG8gc3BlY2lmaWMgcm93XHJcblx0ICovXHJcblx0cHVibGljIHNjcm9sbFRvUm93KHJvd0luZGV4OiBudW1iZXIsIGJlaGF2aW9yOiBTY3JvbGxCZWhhdmlvciA9IFwic21vb3RoXCIpIHtcclxuXHRcdGNvbnN0IHRhcmdldFNjcm9sbFRvcCA9IHJvd0luZGV4ICogdGhpcy5yb3dIZWlnaHQ7XHJcblx0XHR0aGlzLnNjcm9sbENvbnRhaW5lci5zY3JvbGxUbyh7XHJcblx0XHRcdHRvcDogdGFyZ2V0U2Nyb2xsVG9wLFxyXG5cdFx0XHRiZWhhdmlvcjogYmVoYXZpb3IsXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNjcm9sbCB0byB0b3BcclxuXHQgKi9cclxuXHRwdWJsaWMgc2Nyb2xsVG9Ub3AoYmVoYXZpb3I6IFNjcm9sbEJlaGF2aW9yID0gXCJzbW9vdGhcIikge1xyXG5cdFx0dGhpcy5zY3JvbGxUb1JvdygwLCBiZWhhdmlvcik7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTY3JvbGwgdG8gYm90dG9tXHJcblx0ICovXHJcblx0cHVibGljIHNjcm9sbFRvQm90dG9tKGJlaGF2aW9yOiBTY3JvbGxCZWhhdmlvciA9IFwic21vb3RoXCIpIHtcclxuXHRcdHRoaXMuc2Nyb2xsVG9Sb3codGhpcy50b3RhbFJvd3MgLSAxLCBiZWhhdmlvcik7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTZXQgcm93IGhlaWdodCAoYWZmZWN0cyBhbGwgY2FsY3VsYXRpb25zKVxyXG5cdCAqL1xyXG5cdHB1YmxpYyBzZXRSb3dIZWlnaHQoaGVpZ2h0OiBudW1iZXIpIHtcclxuXHRcdHRoaXMucm93SGVpZ2h0ID0gaGVpZ2h0O1xyXG5cdFx0dGhpcy5jYWxjdWxhdGVWaWV3cG9ydCgpO1xyXG5cdFx0dGhpcy51cGRhdGVWaXJ0dWFsSGVpZ2h0KCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTZXQgYnVmZmVyIHNpemUgKG51bWJlciBvZiBleHRyYSByb3dzIHRvIHJlbmRlcilcclxuXHQgKi9cclxuXHRwdWJsaWMgc2V0QnVmZmVyU2l6ZShzaXplOiBudW1iZXIpIHtcclxuXHRcdHRoaXMuYnVmZmVyU2l6ZSA9IHNpemU7XHJcblx0XHR0aGlzLmNhbGN1bGF0ZVZpZXdwb3J0KCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDaGVjayBpZiBhIHJvdyBpcyBjdXJyZW50bHkgdmlzaWJsZVxyXG5cdCAqL1xyXG5cdHB1YmxpYyBpc1Jvd1Zpc2libGUocm93SW5kZXg6IG51bWJlcik6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIChcclxuXHRcdFx0cm93SW5kZXggPj0gdGhpcy52aWV3cG9ydC5zdGFydEluZGV4ICYmXHJcblx0XHRcdHJvd0luZGV4IDw9IHRoaXMudmlld3BvcnQuZW5kSW5kZXhcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgdmlzaWJsZSByb3cgaW5kaWNlc1xyXG5cdCAqL1xyXG5cdHB1YmxpYyBnZXRWaXNpYmxlUm93SW5kaWNlcygpOiBudW1iZXJbXSB7XHJcblx0XHRjb25zdCBpbmRpY2VzOiBudW1iZXJbXSA9IFtdO1xyXG5cdFx0Zm9yIChcclxuXHRcdFx0bGV0IGkgPSB0aGlzLnZpZXdwb3J0LnN0YXJ0SW5kZXg7XHJcblx0XHRcdGkgPD0gdGhpcy52aWV3cG9ydC5lbmRJbmRleDtcclxuXHRcdFx0aSsrXHJcblx0XHQpIHtcclxuXHRcdFx0aW5kaWNlcy5wdXNoKGkpO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIGluZGljZXM7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBIYW5kbGUgY29udGFpbmVyIHJlc2l6ZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgaGFuZGxlUmVzaXplKCkge1xyXG5cdFx0Ly8gUmVjYWxjdWxhdGUgdmlld3BvcnQgb24gcmVzaXplXHJcblx0XHR0aGlzLmNhbGN1bGF0ZVZpZXdwb3J0KCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZXNldCB2aXJ0dWFsIHNjcm9sbCBzdGF0ZSB3aXRoIGltcHJvdmVkIGNsZWFudXBcclxuXHQgKi9cclxuXHRwdWJsaWMgcmVzZXQoKSB7XHJcblx0XHR0aGlzLnRvdGFsUm93cyA9IDA7XHJcblx0XHR0aGlzLmxvYWRlZFJvd3MgPSAwO1xyXG5cdFx0dGhpcy5pc0xvYWRpbmcgPSBmYWxzZTtcclxuXHRcdHRoaXMubGFzdFNjcm9sbFRvcCA9IDA7XHJcblx0XHR0aGlzLmlzQXRCb3R0b20gPSBmYWxzZTtcclxuXHRcdHRoaXMuaXNBdFRvcCA9IHRydWU7XHJcblx0XHR0aGlzLmxhc3RMb2FkVHJpZ2dlclRpbWUgPSAwO1xyXG5cdFx0dGhpcy5zdGFibGVIZWlnaHQgPSAwO1xyXG5cclxuXHRcdHRoaXMudmlld3BvcnQgPSB7XHJcblx0XHRcdHN0YXJ0SW5kZXg6IDAsXHJcblx0XHRcdGVuZEluZGV4OiAwLFxyXG5cdFx0XHR2aXNpYmxlUm93czogW10sXHJcblx0XHRcdHRvdGFsSGVpZ2h0OiAwLFxyXG5cdFx0XHRzY3JvbGxUb3A6IDAsXHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIENhbmNlbCBhbnkgcGVuZGluZyBzY3JvbGwgUkFGXHJcblx0XHRpZiAodGhpcy5zY3JvbGxSQUYpIHtcclxuXHRcdFx0Y2FuY2VsQW5pbWF0aW9uRnJhbWUodGhpcy5zY3JvbGxSQUYpO1xyXG5cdFx0XHR0aGlzLnNjcm9sbFJBRiA9IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUmVzZXQgaGVpZ2h0IHN0YWJpbGl6ZXJcclxuXHRcdGlmICh0aGlzLmhlaWdodFN0YWJpbGl6ZXIpIHtcclxuXHRcdFx0dGhpcy5oZWlnaHRTdGFiaWxpemVyLnN0eWxlLmhlaWdodCA9IFwiMHB4XCI7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU2Nyb2xsIHRvIHRvcCBhbmQgcmVjYWxjdWxhdGUgdmlld3BvcnRcclxuXHRcdHRoaXMuc2Nyb2xsVG9Ub3AoXCJhdXRvXCIpO1xyXG5cdFx0dGhpcy5jYWxjdWxhdGVWaWV3cG9ydCgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHNjcm9sbCBzdGF0aXN0aWNzXHJcblx0ICovXHJcblx0cHVibGljIGdldFNjcm9sbFN0YXRzKCkge1xyXG5cdFx0Y29uc3Qgc2Nyb2xsVG9wID0gdGhpcy52aWV3cG9ydC5zY3JvbGxUb3A7XHJcblx0XHRjb25zdCBzY3JvbGxIZWlnaHQgPSB0aGlzLnNjcm9sbENvbnRhaW5lci5zY3JvbGxIZWlnaHQ7XHJcblx0XHRjb25zdCBjbGllbnRIZWlnaHQgPSB0aGlzLnNjcm9sbENvbnRhaW5lci5jbGllbnRIZWlnaHQ7XHJcblx0XHRjb25zdCBzY3JvbGxQZXJjZW50YWdlID1cclxuXHRcdFx0c2Nyb2xsSGVpZ2h0ID4gMCA/IChzY3JvbGxUb3AgKyBjbGllbnRIZWlnaHQpIC8gc2Nyb2xsSGVpZ2h0IDogMDtcclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRzY3JvbGxUb3AsXHJcblx0XHRcdHNjcm9sbEhlaWdodCxcclxuXHRcdFx0Y2xpZW50SGVpZ2h0LFxyXG5cdFx0XHRzY3JvbGxQZXJjZW50YWdlLFxyXG5cdFx0XHRkaXJlY3Rpb246IHRoaXMuc2Nyb2xsRGlyZWN0aW9uLFxyXG5cdFx0XHR2aXNpYmxlUm93Q291bnQ6XHJcblx0XHRcdFx0dGhpcy52aWV3cG9ydC5lbmRJbmRleCAtIHRoaXMudmlld3BvcnQuc3RhcnRJbmRleCArIDEsXHJcblx0XHRcdHRvdGFsUm93czogdGhpcy50b3RhbFJvd3MsXHJcblx0XHRcdGxvYWRlZFJvd3M6IHRoaXMubG9hZGVkUm93cyxcclxuXHRcdFx0aXNMb2FkaW5nOiB0aGlzLmlzTG9hZGluZyxcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFbmFibGUgb3IgZGlzYWJsZSB2aXJ0dWFsIHNjcm9sbGluZ1xyXG5cdCAqL1xyXG5cdHB1YmxpYyBzZXRFbmFibGVkKGVuYWJsZWQ6IGJvb2xlYW4pIHtcclxuXHRcdGlmIChlbmFibGVkKSB7XHJcblx0XHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChcclxuXHRcdFx0XHR0aGlzLnNjcm9sbENvbnRhaW5lcixcclxuXHRcdFx0XHRcInNjcm9sbFwiLFxyXG5cdFx0XHRcdHRoaXMub25TY3JvbGwuYmluZCh0aGlzKVxyXG5cdFx0XHQpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy5zY3JvbGxDb250YWluZXIucmVtb3ZlRXZlbnRMaXN0ZW5lcihcclxuXHRcdFx0XHRcInNjcm9sbFwiLFxyXG5cdFx0XHRcdHRoaXMub25TY3JvbGwuYmluZCh0aGlzKVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2xlYW51cCByZXNvdXJjZXMgaW5jbHVkaW5nIGhlaWdodCBzdGFiaWxpemVyXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjbGVhbnVwKCkge1xyXG5cdFx0Ly8gQ2FuY2VsIGFueSBwZW5kaW5nIGFuaW1hdGlvbiBmcmFtZVxyXG5cdFx0aWYgKHRoaXMuc2Nyb2xsUkFGKSB7XHJcblx0XHRcdGNhbmNlbEFuaW1hdGlvbkZyYW1lKHRoaXMuc2Nyb2xsUkFGKTtcclxuXHRcdFx0dGhpcy5zY3JvbGxSQUYgPSBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlbW92ZSBoZWlnaHQgc3RhYmlsaXplclxyXG5cdFx0aWYgKHRoaXMuaGVpZ2h0U3RhYmlsaXplciAmJiB0aGlzLmhlaWdodFN0YWJpbGl6ZXIucGFyZW50Tm9kZSkge1xyXG5cdFx0XHR0aGlzLmhlaWdodFN0YWJpbGl6ZXIucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLmhlaWdodFN0YWJpbGl6ZXIpO1xyXG5cdFx0XHR0aGlzLmhlaWdodFN0YWJpbGl6ZXIgPSBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuc2Nyb2xsQ29udGFpbmVyLnJlbW92ZUV2ZW50TGlzdGVuZXIoXHJcblx0XHRcdFwic2Nyb2xsXCIsXHJcblx0XHRcdHRoaXMub25TY3JvbGwuYmluZCh0aGlzKVxyXG5cdFx0KTtcclxuXHRcdHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKFwicmVzaXplXCIsIHRoaXMuaGFuZGxlUmVzaXplLmJpbmQodGhpcykpO1xyXG5cdH1cclxufVxyXG4iXX0=