import { Component } from "obsidian";
import { createPopper } from "@popperjs/core";
import { TaskFilterComponent } from "./ViewTaskFilter";
export class ViewTaskFilterPopover extends Component {
    constructor(app, leafId, plugin) {
        super();
        this.leafId = leafId;
        this.popoverRef = null;
        this.popperInstance = null;
        this.onClose = null;
        this.clickOutside = (e) => {
            if (this.popoverRef && !this.popoverRef.contains(e.target)) {
                console.log("clickOutside - closing popover", {
                    target: e.target,
                    popoverRef: this.popoverRef,
                    contains: this.popoverRef.contains(e.target),
                });
                this.close();
            }
        };
        this.scrollHandler = (e) => {
            if (this.popoverRef) {
                if (e.target instanceof Node &&
                    this.popoverRef.contains(e.target)) {
                    const targetElement = e.target;
                    if (targetElement.scrollHeight > targetElement.clientHeight ||
                        targetElement.scrollWidth > targetElement.clientWidth) {
                        return;
                    }
                }
                this.close();
            }
        };
        this.app = app;
        this.plugin = plugin;
        this.win = app.workspace.containerEl.win || window;
        this.scrollParent = this.win;
    }
    /**
     * Shows the task details popover at the given position.
     */
    showAtPosition(position) {
        if (this.popoverRef) {
            this.close();
        }
        // Create content container
        const contentEl = createDiv({ cls: "task-popover-content" });
        // Prevent clicks inside the popover from bubbling up
        this.registerDomEvent(contentEl, "click", (e) => {
            e.stopPropagation();
        });
        // Create metadata editor, use compact mode
        this.taskFilterComponent = new TaskFilterComponent(contentEl, this.app, this.leafId, this.plugin);
        // Ensure the component is properly loaded
        this.taskFilterComponent.onload();
        // Create the popover
        this.popoverRef = this.app.workspace.containerEl.createDiv({
            cls: "filter-menu tg-menu bm-menu", // Borrowing some classes from IconMenu
        });
        this.popoverRef.appendChild(contentEl);
        document.body.appendChild(this.popoverRef);
        // Create a virtual element for Popper.js
        const virtualElement = {
            getBoundingClientRect: () => ({
                width: 0,
                height: 0,
                top: position.y,
                right: position.x,
                bottom: position.y,
                left: position.x,
                x: position.x,
                y: position.y,
                toJSON: function () {
                    return this;
                },
            }),
        };
        if (this.popoverRef) {
            this.popperInstance = createPopper(virtualElement, this.popoverRef, {
                placement: "bottom-start",
                modifiers: [
                    {
                        name: "offset",
                        options: {
                            offset: [0, 8], // Offset the popover slightly from the reference
                        },
                    },
                    {
                        name: "preventOverflow",
                        options: {
                            padding: 10, // Padding from viewport edges
                        },
                    },
                    {
                        name: "flip",
                        options: {
                            fallbackPlacements: [
                                "top-start",
                                "right-start",
                                "left-start",
                            ],
                            padding: 10,
                        },
                    },
                ],
            });
        }
        // Use timeout to ensure popover is rendered before adding listeners
        this.win.setTimeout(() => {
            this.win.addEventListener("click", this.clickOutside);
            this.scrollParent.addEventListener("scroll", this.scrollHandler, true); // Use capture for scroll
        }, 10);
    }
    /**
     * Closes the popover.
     */
    close() {
        if (this.popperInstance) {
            this.popperInstance.destroy();
            this.popperInstance = null;
        }
        // 在关闭前获取过滤状态并触发回调
        let filterState = undefined;
        if (this.taskFilterComponent) {
            try {
                filterState = this.taskFilterComponent.getFilterState();
            }
            catch (error) {
                console.error("Failed to get filter state before close", error);
            }
        }
        if (this.popoverRef) {
            this.popoverRef.remove();
            this.popoverRef = null;
        }
        this.win.removeEventListener("click", this.clickOutside);
        this.scrollParent.removeEventListener("scroll", this.scrollHandler, true);
        if (this.taskFilterComponent) {
            this.taskFilterComponent.onunload();
        }
        // 调用关闭回调
        if (this.onClose) {
            try {
                this.onClose(filterState);
            }
            catch (error) {
                console.error("Error in onClose callback", error);
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVmlld1Rhc2tGaWx0ZXJQb3BvdmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiVmlld1Rhc2tGaWx0ZXJQb3BvdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBc0IsU0FBUyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQ3pELE9BQU8sRUFBRSxZQUFZLEVBQThCLE1BQU0sZ0JBQWdCLENBQUM7QUFDMUUsT0FBTyxFQUFFLG1CQUFtQixFQUFtQixNQUFNLGtCQUFrQixDQUFDO0FBR3hFLE1BQU0sT0FBTyxxQkFDWixTQUFRLFNBQVM7SUFZakIsWUFDQyxHQUFRLEVBQ0EsTUFBMkIsRUFDbkMsTUFBOEI7UUFFOUIsS0FBSyxFQUFFLENBQUM7UUFIQSxXQUFNLEdBQU4sTUFBTSxDQUFxQjtRQVY3QixlQUFVLEdBQTBCLElBQUksQ0FBQztRQUl4QyxtQkFBYyxHQUEwQixJQUFJLENBQUM7UUFDOUMsWUFBTyxHQUFxRCxJQUFJLENBQUM7UUFpSGhFLGlCQUFZLEdBQUcsQ0FBQyxDQUFhLEVBQUUsRUFBRTtZQUN4QyxJQUFJLElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBYyxDQUFDLEVBQUU7Z0JBQ25FLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0NBQWdDLEVBQUU7b0JBQzdDLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTTtvQkFDaEIsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO29CQUMzQixRQUFRLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQWMsQ0FBQztpQkFDcEQsQ0FBQyxDQUFDO2dCQUNILElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQzthQUNiO1FBQ0YsQ0FBQyxDQUFDO1FBRU0sa0JBQWEsR0FBRyxDQUFDLENBQVEsRUFBRSxFQUFFO1lBQ3BDLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRTtnQkFDcEIsSUFD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LE9BQU8sQ0FBQyxLQUFLLENBQUMseUNBQXlDLEVBQUUsS0FBSyxDQUFDLENBQUM7YUFDaEU7U0FDRDtRQUVELElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRTtZQUNwQixJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO1NBQ3ZCO1FBRUQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3pELElBQUksQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQ3BDLFFBQVEsRUFDUixJQUFJLENBQUMsYUFBYSxFQUNsQixJQUFJLENBQ0osQ0FBQztRQUVGLElBQUksSUFBSSxDQUFDLG1CQUFtQixFQUFFO1lBQzdCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztTQUNwQztRQUVELFNBQVM7UUFDVCxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDakIsSUFBSTtnQkFDSCxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO2FBQzFCO1lBQUMsT0FBTyxLQUFLLEVBQUU7Z0JBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQywyQkFBMkIsRUFBRSxLQUFLLENBQUMsQ0FBQzthQUNsRDtTQUNEO0lBQ0YsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IENsb3NlYWJsZUNvbXBvbmVudCwgQ29tcG9uZW50IH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IGNyZWF0ZVBvcHBlciwgSW5zdGFuY2UgYXMgUG9wcGVySW5zdGFuY2UgfSBmcm9tIFwiQHBvcHBlcmpzL2NvcmVcIjtcclxuaW1wb3J0IHsgVGFza0ZpbHRlckNvbXBvbmVudCwgUm9vdEZpbHRlclN0YXRlIH0gZnJvbSBcIi4vVmlld1Rhc2tGaWx0ZXJcIjtcclxuaW1wb3J0IHR5cGUgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcblxyXG5leHBvcnQgY2xhc3MgVmlld1Rhc2tGaWx0ZXJQb3BvdmVyXHJcblx0ZXh0ZW5kcyBDb21wb25lbnRcclxuXHRpbXBsZW1lbnRzIENsb3NlYWJsZUNvbXBvbmVudFxyXG57XHJcblx0cHJpdmF0ZSBhcHA6IEFwcDtcclxuXHRwdWJsaWMgcG9wb3ZlclJlZjogSFRNTERpdkVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHRwdWJsaWMgdGFza0ZpbHRlckNvbXBvbmVudDogVGFza0ZpbHRlckNvbXBvbmVudDtcclxuXHRwcml2YXRlIHdpbjogV2luZG93O1xyXG5cdHByaXZhdGUgc2Nyb2xsUGFyZW50OiBIVE1MRWxlbWVudCB8IFdpbmRvdztcclxuXHRwcml2YXRlIHBvcHBlckluc3RhbmNlOiBQb3BwZXJJbnN0YW5jZSB8IG51bGwgPSBudWxsO1xyXG5cdHB1YmxpYyBvbkNsb3NlOiAoKGZpbHRlclN0YXRlPzogUm9vdEZpbHRlclN0YXRlKSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgcGx1Z2luPzogVGFza1Byb2dyZXNzQmFyUGx1Z2luO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdGFwcDogQXBwLFxyXG5cdFx0cHJpdmF0ZSBsZWFmSWQ/OiBzdHJpbmcgfCB1bmRlZmluZWQsXHJcblx0XHRwbHVnaW4/OiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW5cclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLmFwcCA9IGFwcDtcclxuXHRcdHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG5cdFx0dGhpcy53aW4gPSBhcHAud29ya3NwYWNlLmNvbnRhaW5lckVsLndpbiB8fCB3aW5kb3c7XHJcblxyXG5cdFx0dGhpcy5zY3JvbGxQYXJlbnQgPSB0aGlzLndpbjtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNob3dzIHRoZSB0YXNrIGRldGFpbHMgcG9wb3ZlciBhdCB0aGUgZ2l2ZW4gcG9zaXRpb24uXHJcblx0ICovXHJcblx0c2hvd0F0UG9zaXRpb24ocG9zaXRpb246IHsgeDogbnVtYmVyOyB5OiBudW1iZXIgfSkge1xyXG5cdFx0aWYgKHRoaXMucG9wb3ZlclJlZikge1xyXG5cdFx0XHR0aGlzLmNsb3NlKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGNvbnRlbnQgY29udGFpbmVyXHJcblx0XHRjb25zdCBjb250ZW50RWwgPSBjcmVhdGVEaXYoeyBjbHM6IFwidGFzay1wb3BvdmVyLWNvbnRlbnRcIiB9KTtcclxuXHJcblx0XHQvLyBQcmV2ZW50IGNsaWNrcyBpbnNpZGUgdGhlIHBvcG92ZXIgZnJvbSBidWJibGluZyB1cFxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGNvbnRlbnRFbCwgXCJjbGlja1wiLCAoZSkgPT4ge1xyXG5cdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIG1ldGFkYXRhIGVkaXRvciwgdXNlIGNvbXBhY3QgbW9kZVxyXG5cdFx0dGhpcy50YXNrRmlsdGVyQ29tcG9uZW50ID0gbmV3IFRhc2tGaWx0ZXJDb21wb25lbnQoXHJcblx0XHRcdGNvbnRlbnRFbCxcclxuXHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdHRoaXMubGVhZklkLFxyXG5cdFx0XHR0aGlzLnBsdWdpblxyXG5cdFx0KTtcclxuXHRcdC8vIEVuc3VyZSB0aGUgY29tcG9uZW50IGlzIHByb3Blcmx5IGxvYWRlZFxyXG5cdFx0dGhpcy50YXNrRmlsdGVyQ29tcG9uZW50Lm9ubG9hZCgpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSB0aGUgcG9wb3ZlclxyXG5cdFx0dGhpcy5wb3BvdmVyUmVmID0gdGhpcy5hcHAud29ya3NwYWNlLmNvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmaWx0ZXItbWVudSB0Zy1tZW51IGJtLW1lbnVcIiwgLy8gQm9ycm93aW5nIHNvbWUgY2xhc3NlcyBmcm9tIEljb25NZW51XHJcblx0XHR9KTtcclxuXHRcdHRoaXMucG9wb3ZlclJlZi5hcHBlbmRDaGlsZChjb250ZW50RWwpO1xyXG5cclxuXHRcdGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5wb3BvdmVyUmVmKTtcclxuXHJcblx0XHQvLyBDcmVhdGUgYSB2aXJ0dWFsIGVsZW1lbnQgZm9yIFBvcHBlci5qc1xyXG5cdFx0Y29uc3QgdmlydHVhbEVsZW1lbnQgPSB7XHJcblx0XHRcdGdldEJvdW5kaW5nQ2xpZW50UmVjdDogKCkgPT4gKHtcclxuXHRcdFx0XHR3aWR0aDogMCxcclxuXHRcdFx0XHRoZWlnaHQ6IDAsXHJcblx0XHRcdFx0dG9wOiBwb3NpdGlvbi55LFxyXG5cdFx0XHRcdHJpZ2h0OiBwb3NpdGlvbi54LFxyXG5cdFx0XHRcdGJvdHRvbTogcG9zaXRpb24ueSxcclxuXHRcdFx0XHRsZWZ0OiBwb3NpdGlvbi54LFxyXG5cdFx0XHRcdHg6IHBvc2l0aW9uLngsXHJcblx0XHRcdFx0eTogcG9zaXRpb24ueSxcclxuXHRcdFx0XHR0b0pTT046IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdHJldHVybiB0aGlzO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pLFxyXG5cdFx0fTtcclxuXHJcblx0XHRpZiAodGhpcy5wb3BvdmVyUmVmKSB7XHJcblx0XHRcdHRoaXMucG9wcGVySW5zdGFuY2UgPSBjcmVhdGVQb3BwZXIoXHJcblx0XHRcdFx0dmlydHVhbEVsZW1lbnQsXHJcblx0XHRcdFx0dGhpcy5wb3BvdmVyUmVmLFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHBsYWNlbWVudDogXCJib3R0b20tc3RhcnRcIixcclxuXHRcdFx0XHRcdG1vZGlmaWVyczogW1xyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0bmFtZTogXCJvZmZzZXRcIixcclxuXHRcdFx0XHRcdFx0XHRvcHRpb25zOiB7XHJcblx0XHRcdFx0XHRcdFx0XHRvZmZzZXQ6IFswLCA4XSwgLy8gT2Zmc2V0IHRoZSBwb3BvdmVyIHNsaWdodGx5IGZyb20gdGhlIHJlZmVyZW5jZVxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRuYW1lOiBcInByZXZlbnRPdmVyZmxvd1wiLFxyXG5cdFx0XHRcdFx0XHRcdG9wdGlvbnM6IHtcclxuXHRcdFx0XHRcdFx0XHRcdHBhZGRpbmc6IDEwLCAvLyBQYWRkaW5nIGZyb20gdmlld3BvcnQgZWRnZXNcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0bmFtZTogXCJmbGlwXCIsXHJcblx0XHRcdFx0XHRcdFx0b3B0aW9uczoge1xyXG5cdFx0XHRcdFx0XHRcdFx0ZmFsbGJhY2tQbGFjZW1lbnRzOiBbXHJcblx0XHRcdFx0XHRcdFx0XHRcdFwidG9wLXN0YXJ0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFwicmlnaHQtc3RhcnRcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0XCJsZWZ0LXN0YXJ0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRdLFxyXG5cdFx0XHRcdFx0XHRcdFx0cGFkZGluZzogMTAsXHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdF0sXHJcblx0XHRcdFx0fVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFVzZSB0aW1lb3V0IHRvIGVuc3VyZSBwb3BvdmVyIGlzIHJlbmRlcmVkIGJlZm9yZSBhZGRpbmcgbGlzdGVuZXJzXHJcblx0XHR0aGlzLndpbi5zZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0dGhpcy53aW4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHRoaXMuY2xpY2tPdXRzaWRlKTtcclxuXHRcdFx0dGhpcy5zY3JvbGxQYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihcclxuXHRcdFx0XHRcInNjcm9sbFwiLFxyXG5cdFx0XHRcdHRoaXMuc2Nyb2xsSGFuZGxlcixcclxuXHRcdFx0XHR0cnVlXHJcblx0XHRcdCk7IC8vIFVzZSBjYXB0dXJlIGZvciBzY3JvbGxcclxuXHRcdH0sIDEwKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY2xpY2tPdXRzaWRlID0gKGU6IE1vdXNlRXZlbnQpID0+IHtcclxuXHRcdGlmICh0aGlzLnBvcG92ZXJSZWYgJiYgIXRoaXMucG9wb3ZlclJlZi5jb250YWlucyhlLnRhcmdldCBhcyBOb2RlKSkge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcImNsaWNrT3V0c2lkZSAtIGNsb3NpbmcgcG9wb3ZlclwiLCB7XHJcblx0XHRcdFx0dGFyZ2V0OiBlLnRhcmdldCxcclxuXHRcdFx0XHRwb3BvdmVyUmVmOiB0aGlzLnBvcG92ZXJSZWYsXHJcblx0XHRcdFx0Y29udGFpbnM6IHRoaXMucG9wb3ZlclJlZi5jb250YWlucyhlLnRhcmdldCBhcyBOb2RlKSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdHRoaXMuY2xvc2UoKTtcclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHRwcml2YXRlIHNjcm9sbEhhbmRsZXIgPSAoZTogRXZlbnQpID0+IHtcclxuXHRcdGlmICh0aGlzLnBvcG92ZXJSZWYpIHtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdGUudGFyZ2V0IGluc3RhbmNlb2YgTm9kZSAmJlxyXG5cdFx0XHRcdHRoaXMucG9wb3ZlclJlZi5jb250YWlucyhlLnRhcmdldClcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0Y29uc3QgdGFyZ2V0RWxlbWVudCA9IGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdHRhcmdldEVsZW1lbnQuc2Nyb2xsSGVpZ2h0ID4gdGFyZ2V0RWxlbWVudC5jbGllbnRIZWlnaHQgfHxcclxuXHRcdFx0XHRcdHRhcmdldEVsZW1lbnQuc2Nyb2xsV2lkdGggPiB0YXJnZXRFbGVtZW50LmNsaWVudFdpZHRoXHJcblx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdHRoaXMuY2xvc2UoKTtcclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHQvKipcclxuXHQgKiBDbG9zZXMgdGhlIHBvcG92ZXIuXHJcblx0ICovXHJcblx0Y2xvc2UoKSB7XHJcblx0XHRpZiAodGhpcy5wb3BwZXJJbnN0YW5jZSkge1xyXG5cdFx0XHR0aGlzLnBvcHBlckluc3RhbmNlLmRlc3Ryb3koKTtcclxuXHRcdFx0dGhpcy5wb3BwZXJJbnN0YW5jZSA9IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8g5Zyo5YWz6Zet5YmN6I635Y+W6L+H5ruk54q25oCB5bm26Kem5Y+R5Zue6LCDXHJcblx0XHRsZXQgZmlsdGVyU3RhdGU6IFJvb3RGaWx0ZXJTdGF0ZSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcclxuXHRcdGlmICh0aGlzLnRhc2tGaWx0ZXJDb21wb25lbnQpIHtcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRmaWx0ZXJTdGF0ZSA9IHRoaXMudGFza0ZpbHRlckNvbXBvbmVudC5nZXRGaWx0ZXJTdGF0ZSgpO1xyXG5cdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gZ2V0IGZpbHRlciBzdGF0ZSBiZWZvcmUgY2xvc2VcIiwgZXJyb3IpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHRoaXMucG9wb3ZlclJlZikge1xyXG5cdFx0XHR0aGlzLnBvcG92ZXJSZWYucmVtb3ZlKCk7XHJcblx0XHRcdHRoaXMucG9wb3ZlclJlZiA9IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy53aW4ucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHRoaXMuY2xpY2tPdXRzaWRlKTtcclxuXHRcdHRoaXMuc2Nyb2xsUGFyZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXHJcblx0XHRcdFwic2Nyb2xsXCIsXHJcblx0XHRcdHRoaXMuc2Nyb2xsSGFuZGxlcixcclxuXHRcdFx0dHJ1ZVxyXG5cdFx0KTtcclxuXHJcblx0XHRpZiAodGhpcy50YXNrRmlsdGVyQ29tcG9uZW50KSB7XHJcblx0XHRcdHRoaXMudGFza0ZpbHRlckNvbXBvbmVudC5vbnVubG9hZCgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIOiwg+eUqOWFs+mXreWbnuiwg1xyXG5cdFx0aWYgKHRoaXMub25DbG9zZSkge1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdHRoaXMub25DbG9zZShmaWx0ZXJTdGF0ZSk7XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIGluIG9uQ2xvc2UgY2FsbGJhY2tcIiwgZXJyb3IpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG59XHJcbiJdfQ==