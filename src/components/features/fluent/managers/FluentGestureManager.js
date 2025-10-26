import { Component, Platform } from "obsidian";
/**
 * FluentGestureManager - Manages mobile touch gestures
 *
 * Responsibilities:
 * - Edge swipe to open drawer (from left edge)
 * - Swipe left to close drawer (when open)
 * - Touch event handling with vertical scroll detection
 */
export class FluentGestureManager extends Component {
    constructor(rootContainerEl) {
        super();
        this.rootContainerEl = rootContainerEl;
        // Touch gesture tracking
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchCurrentX = 0;
        this.isSwiping = false;
        this.swipeThreshold = 50;
    }
    /**
     * Set drawer callbacks
     */
    setDrawerCallbacks(callbacks) {
        this.onOpenDrawer = callbacks.onOpenDrawer;
        this.onCloseDrawer = callbacks.onCloseDrawer;
        this.getIsMobileDrawerOpen = callbacks.getIsMobileDrawerOpen;
    }
    /**
     * Initialize mobile swipe gestures for drawer
     */
    initializeMobileSwipeGestures() {
        if (!Platform.isPhone)
            return;
        // Edge swipe to open drawer
        this.registerDomEvent(document, "touchstart", (e) => {
            var _a, _b;
            const isMobileDrawerOpen = (_b = (_a = this.getIsMobileDrawerOpen) === null || _a === void 0 ? void 0 : _a.call(this)) !== null && _b !== void 0 ? _b : false;
            if (isMobileDrawerOpen) {
                // Track for swipe-to-close when drawer is open
                const touch = e.touches[0];
                this.touchStartX = touch.clientX;
                this.touchStartY = touch.clientY;
                this.isSwiping = true;
            }
            else {
                // Check if touch started from left edge
                const touch = e.touches[0];
                if (touch.clientX < 20) {
                    // 20px edge detection zone
                    this.touchStartX = touch.clientX;
                    this.touchStartY = touch.clientY;
                    this.isSwiping = true;
                }
            }
        });
        this.registerDomEvent(document, "touchmove", (e) => {
            var _a, _b, _c, _d, _e;
            if (!this.isSwiping)
                return;
            const touch = e.touches[0];
            this.touchCurrentX = touch.clientX;
            const deltaX = this.touchCurrentX - this.touchStartX;
            const deltaY = Math.abs(touch.clientY - this.touchStartY);
            // Check if horizontal swipe (not vertical scroll)
            if (deltaY > 50) {
                this.isSwiping = false;
                return;
            }
            const isMobileDrawerOpen = (_b = (_a = this.getIsMobileDrawerOpen) === null || _a === void 0 ? void 0 : _a.call(this)) !== null && _b !== void 0 ? _b : false;
            if (!isMobileDrawerOpen && deltaX > this.swipeThreshold) {
                // Swipe right from edge - open drawer
                (_c = this.onOpenDrawer) === null || _c === void 0 ? void 0 : _c.call(this);
                this.isSwiping = false;
            }
            else if (isMobileDrawerOpen && deltaX < -this.swipeThreshold) {
                // Swipe left when drawer is open - close it
                const sidebarEl = (_d = this.rootContainerEl) === null || _d === void 0 ? void 0 : _d.querySelector(".tg-fluent-sidebar-container");
                if (sidebarEl) {
                    const sidebarRect = sidebarEl.getBoundingClientRect();
                    // Only close if swipe started on the sidebar
                    if (this.touchStartX < sidebarRect.right) {
                        (_e = this.onCloseDrawer) === null || _e === void 0 ? void 0 : _e.call(this);
                        this.isSwiping = false;
                    }
                }
            }
        });
        this.registerDomEvent(document, "touchend", () => {
            this.isSwiping = false;
            this.touchStartX = 0;
            this.touchCurrentX = 0;
        });
        this.registerDomEvent(document, "touchcancel", () => {
            this.isSwiping = false;
            this.touchStartX = 0;
            this.touchCurrentX = 0;
        });
    }
    /**
     * Clean up on unload
     */
    onunload() {
        // Event listeners will be cleaned up by Component lifecycle
        super.onunload();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmx1ZW50R2VzdHVyZU1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJGbHVlbnRHZXN0dXJlTWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUUvQzs7Ozs7OztHQU9HO0FBQ0gsTUFBTSxPQUFPLG9CQUFxQixTQUFRLFNBQVM7SUFhbEQsWUFBb0IsZUFBNEI7UUFDL0MsS0FBSyxFQUFFLENBQUM7UUFEVyxvQkFBZSxHQUFmLGVBQWUsQ0FBYTtRQVpoRCx5QkFBeUI7UUFDakIsZ0JBQVcsR0FBRyxDQUFDLENBQUM7UUFDaEIsZ0JBQVcsR0FBRyxDQUFDLENBQUM7UUFDaEIsa0JBQWEsR0FBRyxDQUFDLENBQUM7UUFDbEIsY0FBUyxHQUFHLEtBQUssQ0FBQztRQUNsQixtQkFBYyxHQUFHLEVBQUUsQ0FBQztJQVM1QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxrQkFBa0IsQ0FBQyxTQUlsQjtRQUNBLElBQUksQ0FBQyxZQUFZLEdBQUcsU0FBUyxDQUFDLFlBQVksQ0FBQztRQUMzQyxJQUFJLENBQUMsYUFBYSxHQUFHLFNBQVMsQ0FBQyxhQUFhLENBQUM7UUFDN0MsSUFBSSxDQUFDLHFCQUFxQixHQUFHLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQztJQUM5RCxDQUFDO0lBRUQ7O09BRUc7SUFDSCw2QkFBNkI7UUFDNUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPO1lBQUUsT0FBTztRQUU5Qiw0QkFBNEI7UUFDNUIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFhLEVBQUUsRUFBRTs7WUFDL0QsTUFBTSxrQkFBa0IsR0FBRyxNQUFBLE1BQUEsSUFBSSxDQUFDLHFCQUFxQixvREFBSSxtQ0FBSSxLQUFLLENBQUM7WUFFbkUsSUFBSSxrQkFBa0IsRUFBRTtnQkFDdkIsK0NBQStDO2dCQUMvQyxNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMzQixJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUM7Z0JBQ2pDLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQztnQkFDakMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7YUFDdEI7aUJBQU07Z0JBQ04sd0NBQXdDO2dCQUN4QyxNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMzQixJQUFJLEtBQUssQ0FBQyxPQUFPLEdBQUcsRUFBRSxFQUFFO29CQUN2QiwyQkFBMkI7b0JBQzNCLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQztvQkFDakMsSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDO29CQUNqQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztpQkFDdEI7YUFDRDtRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFhLEVBQUUsRUFBRTs7WUFDOUQsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTO2dCQUFFLE9BQU87WUFFNUIsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMzQixJQUFJLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUM7WUFDbkMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO1lBQ3JELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7WUFFMUQsa0RBQWtEO1lBQ2xELElBQUksTUFBTSxHQUFHLEVBQUUsRUFBRTtnQkFDaEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7Z0JBQ3ZCLE9BQU87YUFDUDtZQUVELE1BQU0sa0JBQWtCLEdBQUcsTUFBQSxNQUFBLElBQUksQ0FBQyxxQkFBcUIsb0RBQUksbUNBQUksS0FBSyxDQUFDO1lBRW5FLElBQUksQ0FBQyxrQkFBa0IsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLGNBQWMsRUFBRTtnQkFDeEQsc0NBQXNDO2dCQUN0QyxNQUFBLElBQUksQ0FBQyxZQUFZLG9EQUFJLENBQUM7Z0JBQ3RCLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO2FBQ3ZCO2lCQUFNLElBQUksa0JBQWtCLElBQUksTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRTtnQkFDL0QsNENBQTRDO2dCQUM1QyxNQUFNLFNBQVMsR0FBRyxNQUFBLElBQUksQ0FBQyxlQUFlLDBDQUFFLGFBQWEsQ0FDcEQsOEJBQThCLENBQzlCLENBQUM7Z0JBQ0YsSUFBSSxTQUFTLEVBQUU7b0JBQ2QsTUFBTSxXQUFXLEdBQUcsU0FBUyxDQUFDLHFCQUFxQixFQUFFLENBQUM7b0JBQ3RELDZDQUE2QztvQkFDN0MsSUFBSSxJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQyxLQUFLLEVBQUU7d0JBQ3pDLE1BQUEsSUFBSSxDQUFDLGFBQWEsb0RBQUksQ0FBQzt3QkFDdkIsSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7cUJBQ3ZCO2lCQUNEO2FBQ0Q7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRTtZQUNoRCxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztZQUN2QixJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQztZQUNyQixJQUFJLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQztRQUN4QixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsYUFBYSxFQUFFLEdBQUcsRUFBRTtZQUNuRCxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztZQUN2QixJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQztZQUNyQixJQUFJLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQztRQUN4QixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRDs7T0FFRztJQUNILFFBQVE7UUFDUCw0REFBNEQ7UUFDNUQsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ2xCLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbXBvbmVudCwgUGxhdGZvcm0gfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuXHJcbi8qKlxyXG4gKiBGbHVlbnRHZXN0dXJlTWFuYWdlciAtIE1hbmFnZXMgbW9iaWxlIHRvdWNoIGdlc3R1cmVzXHJcbiAqXHJcbiAqIFJlc3BvbnNpYmlsaXRpZXM6XHJcbiAqIC0gRWRnZSBzd2lwZSB0byBvcGVuIGRyYXdlciAoZnJvbSBsZWZ0IGVkZ2UpXHJcbiAqIC0gU3dpcGUgbGVmdCB0byBjbG9zZSBkcmF3ZXIgKHdoZW4gb3BlbilcclxuICogLSBUb3VjaCBldmVudCBoYW5kbGluZyB3aXRoIHZlcnRpY2FsIHNjcm9sbCBkZXRlY3Rpb25cclxuICovXHJcbmV4cG9ydCBjbGFzcyBGbHVlbnRHZXN0dXJlTWFuYWdlciBleHRlbmRzIENvbXBvbmVudCB7XHJcblx0Ly8gVG91Y2ggZ2VzdHVyZSB0cmFja2luZ1xyXG5cdHByaXZhdGUgdG91Y2hTdGFydFggPSAwO1xyXG5cdHByaXZhdGUgdG91Y2hTdGFydFkgPSAwO1xyXG5cdHByaXZhdGUgdG91Y2hDdXJyZW50WCA9IDA7XHJcblx0cHJpdmF0ZSBpc1N3aXBpbmcgPSBmYWxzZTtcclxuXHRwcml2YXRlIHN3aXBlVGhyZXNob2xkID0gNTA7XHJcblxyXG5cdC8vIENhbGxiYWNrc1xyXG5cdHByaXZhdGUgb25PcGVuRHJhd2VyPzogKCkgPT4gdm9pZDtcclxuXHRwcml2YXRlIG9uQ2xvc2VEcmF3ZXI/OiAoKSA9PiB2b2lkO1xyXG5cdHByaXZhdGUgZ2V0SXNNb2JpbGVEcmF3ZXJPcGVuPzogKCkgPT4gYm9vbGVhbjtcclxuXHJcblx0Y29uc3RydWN0b3IocHJpdmF0ZSByb290Q29udGFpbmVyRWw6IEhUTUxFbGVtZW50KSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2V0IGRyYXdlciBjYWxsYmFja3NcclxuXHQgKi9cclxuXHRzZXREcmF3ZXJDYWxsYmFja3MoY2FsbGJhY2tzOiB7XHJcblx0XHRvbk9wZW5EcmF3ZXI6ICgpID0+IHZvaWQ7XHJcblx0XHRvbkNsb3NlRHJhd2VyOiAoKSA9PiB2b2lkO1xyXG5cdFx0Z2V0SXNNb2JpbGVEcmF3ZXJPcGVuOiAoKSA9PiBib29sZWFuO1xyXG5cdH0pOiB2b2lkIHtcclxuXHRcdHRoaXMub25PcGVuRHJhd2VyID0gY2FsbGJhY2tzLm9uT3BlbkRyYXdlcjtcclxuXHRcdHRoaXMub25DbG9zZURyYXdlciA9IGNhbGxiYWNrcy5vbkNsb3NlRHJhd2VyO1xyXG5cdFx0dGhpcy5nZXRJc01vYmlsZURyYXdlck9wZW4gPSBjYWxsYmFja3MuZ2V0SXNNb2JpbGVEcmF3ZXJPcGVuO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSW5pdGlhbGl6ZSBtb2JpbGUgc3dpcGUgZ2VzdHVyZXMgZm9yIGRyYXdlclxyXG5cdCAqL1xyXG5cdGluaXRpYWxpemVNb2JpbGVTd2lwZUdlc3R1cmVzKCk6IHZvaWQge1xyXG5cdFx0aWYgKCFQbGF0Zm9ybS5pc1Bob25lKSByZXR1cm47XHJcblxyXG5cdFx0Ly8gRWRnZSBzd2lwZSB0byBvcGVuIGRyYXdlclxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGRvY3VtZW50LCBcInRvdWNoc3RhcnRcIiwgKGU6IFRvdWNoRXZlbnQpID0+IHtcclxuXHRcdFx0Y29uc3QgaXNNb2JpbGVEcmF3ZXJPcGVuID0gdGhpcy5nZXRJc01vYmlsZURyYXdlck9wZW4/LigpID8/IGZhbHNlO1xyXG5cclxuXHRcdFx0aWYgKGlzTW9iaWxlRHJhd2VyT3Blbikge1xyXG5cdFx0XHRcdC8vIFRyYWNrIGZvciBzd2lwZS10by1jbG9zZSB3aGVuIGRyYXdlciBpcyBvcGVuXHJcblx0XHRcdFx0Y29uc3QgdG91Y2ggPSBlLnRvdWNoZXNbMF07XHJcblx0XHRcdFx0dGhpcy50b3VjaFN0YXJ0WCA9IHRvdWNoLmNsaWVudFg7XHJcblx0XHRcdFx0dGhpcy50b3VjaFN0YXJ0WSA9IHRvdWNoLmNsaWVudFk7XHJcblx0XHRcdFx0dGhpcy5pc1N3aXBpbmcgPSB0cnVlO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIENoZWNrIGlmIHRvdWNoIHN0YXJ0ZWQgZnJvbSBsZWZ0IGVkZ2VcclxuXHRcdFx0XHRjb25zdCB0b3VjaCA9IGUudG91Y2hlc1swXTtcclxuXHRcdFx0XHRpZiAodG91Y2guY2xpZW50WCA8IDIwKSB7XHJcblx0XHRcdFx0XHQvLyAyMHB4IGVkZ2UgZGV0ZWN0aW9uIHpvbmVcclxuXHRcdFx0XHRcdHRoaXMudG91Y2hTdGFydFggPSB0b3VjaC5jbGllbnRYO1xyXG5cdFx0XHRcdFx0dGhpcy50b3VjaFN0YXJ0WSA9IHRvdWNoLmNsaWVudFk7XHJcblx0XHRcdFx0XHR0aGlzLmlzU3dpcGluZyA9IHRydWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZG9jdW1lbnQsIFwidG91Y2htb3ZlXCIsIChlOiBUb3VjaEV2ZW50KSA9PiB7XHJcblx0XHRcdGlmICghdGhpcy5pc1N3aXBpbmcpIHJldHVybjtcclxuXHJcblx0XHRcdGNvbnN0IHRvdWNoID0gZS50b3VjaGVzWzBdO1xyXG5cdFx0XHR0aGlzLnRvdWNoQ3VycmVudFggPSB0b3VjaC5jbGllbnRYO1xyXG5cdFx0XHRjb25zdCBkZWx0YVggPSB0aGlzLnRvdWNoQ3VycmVudFggLSB0aGlzLnRvdWNoU3RhcnRYO1xyXG5cdFx0XHRjb25zdCBkZWx0YVkgPSBNYXRoLmFicyh0b3VjaC5jbGllbnRZIC0gdGhpcy50b3VjaFN0YXJ0WSk7XHJcblxyXG5cdFx0XHQvLyBDaGVjayBpZiBob3Jpem9udGFsIHN3aXBlIChub3QgdmVydGljYWwgc2Nyb2xsKVxyXG5cdFx0XHRpZiAoZGVsdGFZID4gNTApIHtcclxuXHRcdFx0XHR0aGlzLmlzU3dpcGluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgaXNNb2JpbGVEcmF3ZXJPcGVuID0gdGhpcy5nZXRJc01vYmlsZURyYXdlck9wZW4/LigpID8/IGZhbHNlO1xyXG5cclxuXHRcdFx0aWYgKCFpc01vYmlsZURyYXdlck9wZW4gJiYgZGVsdGFYID4gdGhpcy5zd2lwZVRocmVzaG9sZCkge1xyXG5cdFx0XHRcdC8vIFN3aXBlIHJpZ2h0IGZyb20gZWRnZSAtIG9wZW4gZHJhd2VyXHJcblx0XHRcdFx0dGhpcy5vbk9wZW5EcmF3ZXI/LigpO1xyXG5cdFx0XHRcdHRoaXMuaXNTd2lwaW5nID0gZmFsc2U7XHJcblx0XHRcdH0gZWxzZSBpZiAoaXNNb2JpbGVEcmF3ZXJPcGVuICYmIGRlbHRhWCA8IC10aGlzLnN3aXBlVGhyZXNob2xkKSB7XHJcblx0XHRcdFx0Ly8gU3dpcGUgbGVmdCB3aGVuIGRyYXdlciBpcyBvcGVuIC0gY2xvc2UgaXRcclxuXHRcdFx0XHRjb25zdCBzaWRlYmFyRWwgPSB0aGlzLnJvb3RDb250YWluZXJFbD8ucXVlcnlTZWxlY3RvcihcclxuXHRcdFx0XHRcdFwiLnRnLWZsdWVudC1zaWRlYmFyLWNvbnRhaW5lclwiXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRpZiAoc2lkZWJhckVsKSB7XHJcblx0XHRcdFx0XHRjb25zdCBzaWRlYmFyUmVjdCA9IHNpZGViYXJFbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuXHRcdFx0XHRcdC8vIE9ubHkgY2xvc2UgaWYgc3dpcGUgc3RhcnRlZCBvbiB0aGUgc2lkZWJhclxyXG5cdFx0XHRcdFx0aWYgKHRoaXMudG91Y2hTdGFydFggPCBzaWRlYmFyUmVjdC5yaWdodCkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLm9uQ2xvc2VEcmF3ZXI/LigpO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmlzU3dpcGluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGRvY3VtZW50LCBcInRvdWNoZW5kXCIsICgpID0+IHtcclxuXHRcdFx0dGhpcy5pc1N3aXBpbmcgPSBmYWxzZTtcclxuXHRcdFx0dGhpcy50b3VjaFN0YXJ0WCA9IDA7XHJcblx0XHRcdHRoaXMudG91Y2hDdXJyZW50WCA9IDA7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZG9jdW1lbnQsIFwidG91Y2hjYW5jZWxcIiwgKCkgPT4ge1xyXG5cdFx0XHR0aGlzLmlzU3dpcGluZyA9IGZhbHNlO1xyXG5cdFx0XHR0aGlzLnRvdWNoU3RhcnRYID0gMDtcclxuXHRcdFx0dGhpcy50b3VjaEN1cnJlbnRYID0gMDtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2xlYW4gdXAgb24gdW5sb2FkXHJcblx0ICovXHJcblx0b251bmxvYWQoKTogdm9pZCB7XHJcblx0XHQvLyBFdmVudCBsaXN0ZW5lcnMgd2lsbCBiZSBjbGVhbmVkIHVwIGJ5IENvbXBvbmVudCBsaWZlY3ljbGVcclxuXHRcdHN1cGVyLm9udW5sb2FkKCk7XHJcblx0fVxyXG59XHJcbiJdfQ==