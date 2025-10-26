import { Component } from "obsidian";
import { createPopper } from "@popperjs/core";
import { DatePickerComponent } from "./DatePickerComponent";
export class DatePickerPopover extends Component {
    constructor(app, plugin, initialDate, dateMark = "📅") {
        super();
        this.popoverRef = null;
        this.popperInstance = null;
        this.onDateSelected = null;
        this.clickOutside = (e) => {
            if (this.popoverRef && !this.popoverRef.contains(e.target)) {
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
        this.initialDate = initialDate;
        this.dateMark = dateMark;
        this.win = app.workspace.containerEl.win || window;
        this.scrollParent = this.win;
    }
    /**
     * Shows the date picker popover at the given position.
     */
    showAtPosition(position) {
        if (this.popoverRef) {
            this.close();
        }
        // Create content container
        const contentEl = createDiv({ cls: "date-picker-popover-content" });
        // Prevent clicks inside the popover from bubbling up
        this.registerDomEvent(contentEl, "click", (e) => {
            e.stopPropagation();
        });
        // Create date picker component
        this.datePickerComponent = new DatePickerComponent(contentEl, this.app, this.plugin, this.initialDate, this.dateMark);
        // Initialize component
        this.datePickerComponent.onload();
        // Set up date change callback
        this.datePickerComponent.setOnDateChange((date) => {
            if (this.onDateSelected) {
                this.onDateSelected(date);
            }
            this.close();
        });
        // Create the popover
        this.popoverRef = this.app.workspace.containerEl.createDiv({
            cls: "date-picker-popover tg-menu bm-menu",
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
        if (this.popoverRef) {
            this.popoverRef.remove();
            this.popoverRef = null;
        }
        this.win.removeEventListener("click", this.clickOutside);
        this.scrollParent.removeEventListener("scroll", this.scrollHandler, true);
        if (this.datePickerComponent) {
            this.datePickerComponent.onunload();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGF0ZVBpY2tlclBvcG92ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJEYXRlUGlja2VyUG9wb3Zlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQU8sU0FBUyxFQUFzQixNQUFNLFVBQVUsQ0FBQztBQUM5RCxPQUFPLEVBQUUsWUFBWSxFQUE4QixNQUFNLGdCQUFnQixDQUFDO0FBQzFFLE9BQU8sRUFBRSxtQkFBbUIsRUFBbUIsTUFBTSx1QkFBdUIsQ0FBQztBQUc3RSxNQUFNLE9BQU8saUJBQWtCLFNBQVEsU0FBUztJQVkvQyxZQUNDLEdBQVEsRUFDUixNQUE4QixFQUM5QixXQUFvQixFQUNwQixXQUFtQixJQUFJO1FBRXZCLEtBQUssRUFBRSxDQUFDO1FBaEJGLGVBQVUsR0FBMEIsSUFBSSxDQUFDO1FBSXhDLG1CQUFjLEdBQTBCLElBQUksQ0FBQztRQUM5QyxtQkFBYyxHQUEyQyxJQUFJLENBQUM7UUErSDdELGlCQUFZLEdBQUcsQ0FBQyxDQUFhLEVBQUUsRUFBRTtZQUN4QyxJQUFJLElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBYyxDQUFDLEVBQUU7Z0JBQ25FLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQzthQUNiO1FBQ0YsQ0FBQyxDQUFDO1FBRU0sa0JBQWEsR0FBRyxDQUFDLENBQVEsRUFBRSxFQUFFO1lBQ3BDLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRTtnQkFDcEIsSUFDQyxDQUFDLENBQUMsTUFBTSxZQUFZLElBQUk7b0JBQ3hCLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFDakM7b0JBQ0QsTUFBTSxhQUFhLEdBQUcsQ0FBQyxDQUFDLE1BQXFCLENBQUM7b0JBQzlDLElBQ0MsYUFBYSxDQUFDLFlBQVksR0FBRyxhQUFhLENBQUMsWUFBWTt3QkFDdkQsYUFBYSxDQUFDLFdBQVcs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QUFHLElBQUksQ0FBQztTQUN2QjtRQUVELElBQUksQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN6RCxJQUFJLENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUNwQyxRQUFRLEVBQ1IsSUFBSSxDQUFDLGFBQWEsRUFDbEIsSUFBSSxDQUNKLENBQUM7UUFFRixJQUFJLElBQUksQ0FBQyxtQkFBbUIsRUFBRTtZQUM3QixJQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxFQUFFLENBQUM7U0FDcEM7SUFDRixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHAsIENvbXBvbmVudCwgQ2xvc2VhYmxlQ29tcG9uZW50IH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IGNyZWF0ZVBvcHBlciwgSW5zdGFuY2UgYXMgUG9wcGVySW5zdGFuY2UgfSBmcm9tIFwiQHBvcHBlcmpzL2NvcmVcIjtcclxuaW1wb3J0IHsgRGF0ZVBpY2tlckNvbXBvbmVudCwgRGF0ZVBpY2tlclN0YXRlIH0gZnJvbSBcIi4vRGF0ZVBpY2tlckNvbXBvbmVudFwiO1xyXG5pbXBvcnQgdHlwZSBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBEYXRlUGlja2VyUG9wb3ZlciBleHRlbmRzIENvbXBvbmVudCBpbXBsZW1lbnRzIENsb3NlYWJsZUNvbXBvbmVudCB7XHJcblx0cHJpdmF0ZSBhcHA6IEFwcDtcclxuXHRwdWJsaWMgcG9wb3ZlclJlZjogSFRNTERpdkVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHRwdWJsaWMgZGF0ZVBpY2tlckNvbXBvbmVudDogRGF0ZVBpY2tlckNvbXBvbmVudDtcclxuXHRwcml2YXRlIHdpbjogV2luZG93O1xyXG5cdHByaXZhdGUgc2Nyb2xsUGFyZW50OiBIVE1MRWxlbWVudCB8IFdpbmRvdztcclxuXHRwcml2YXRlIHBvcHBlckluc3RhbmNlOiBQb3BwZXJJbnN0YW5jZSB8IG51bGwgPSBudWxsO1xyXG5cdHB1YmxpYyBvbkRhdGVTZWxlY3RlZDogKChkYXRlOiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgcGx1Z2luPzogVGFza1Byb2dyZXNzQmFyUGx1Z2luO1xyXG5cdHByaXZhdGUgaW5pdGlhbERhdGU/OiBzdHJpbmc7XHJcblx0cHJpdmF0ZSBkYXRlTWFyazogc3RyaW5nO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdGFwcDogQXBwLFxyXG5cdFx0cGx1Z2luPzogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0aW5pdGlhbERhdGU/OiBzdHJpbmcsXHJcblx0XHRkYXRlTWFyazogc3RyaW5nID0gXCLwn5OFXCJcclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLmFwcCA9IGFwcDtcclxuXHRcdHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG5cdFx0dGhpcy5pbml0aWFsRGF0ZSA9IGluaXRpYWxEYXRlO1xyXG5cdFx0dGhpcy5kYXRlTWFyayA9IGRhdGVNYXJrO1xyXG5cdFx0dGhpcy53aW4gPSBhcHAud29ya3NwYWNlLmNvbnRhaW5lckVsLndpbiB8fCB3aW5kb3c7XHJcblx0XHR0aGlzLnNjcm9sbFBhcmVudCA9IHRoaXMud2luO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2hvd3MgdGhlIGRhdGUgcGlja2VyIHBvcG92ZXIgYXQgdGhlIGdpdmVuIHBvc2l0aW9uLlxyXG5cdCAqL1xyXG5cdHNob3dBdFBvc2l0aW9uKHBvc2l0aW9uOiB7IHg6IG51bWJlcjsgeTogbnVtYmVyIH0pIHtcclxuXHRcdGlmICh0aGlzLnBvcG92ZXJSZWYpIHtcclxuXHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENyZWF0ZSBjb250ZW50IGNvbnRhaW5lclxyXG5cdFx0Y29uc3QgY29udGVudEVsID0gY3JlYXRlRGl2KHsgY2xzOiBcImRhdGUtcGlja2VyLXBvcG92ZXItY29udGVudFwiIH0pO1xyXG5cclxuXHRcdC8vIFByZXZlbnQgY2xpY2tzIGluc2lkZSB0aGUgcG9wb3ZlciBmcm9tIGJ1YmJsaW5nIHVwXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoY29udGVudEVsLCBcImNsaWNrXCIsIChlKSA9PiB7XHJcblx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDcmVhdGUgZGF0ZSBwaWNrZXIgY29tcG9uZW50XHJcblx0XHR0aGlzLmRhdGVQaWNrZXJDb21wb25lbnQgPSBuZXcgRGF0ZVBpY2tlckNvbXBvbmVudChcclxuXHRcdFx0Y29udGVudEVsLFxyXG5cdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdHRoaXMuaW5pdGlhbERhdGUsXHJcblx0XHRcdHRoaXMuZGF0ZU1hcmtcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBjb21wb25lbnRcclxuXHRcdHRoaXMuZGF0ZVBpY2tlckNvbXBvbmVudC5vbmxvYWQoKTtcclxuXHJcblx0XHQvLyBTZXQgdXAgZGF0ZSBjaGFuZ2UgY2FsbGJhY2tcclxuXHRcdHRoaXMuZGF0ZVBpY2tlckNvbXBvbmVudC5zZXRPbkRhdGVDaGFuZ2UoKGRhdGU6IHN0cmluZykgPT4ge1xyXG5cdFx0XHRpZiAodGhpcy5vbkRhdGVTZWxlY3RlZCkge1xyXG5cdFx0XHRcdHRoaXMub25EYXRlU2VsZWN0ZWQoZGF0ZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIHRoZSBwb3BvdmVyXHJcblx0XHR0aGlzLnBvcG92ZXJSZWYgPSB0aGlzLmFwcC53b3Jrc3BhY2UuY29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImRhdGUtcGlja2VyLXBvcG92ZXIgdGctbWVudSBibS1tZW51XCIsXHJcblx0XHR9KTtcclxuXHRcdHRoaXMucG9wb3ZlclJlZi5hcHBlbmRDaGlsZChjb250ZW50RWwpO1xyXG5cclxuXHRcdGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5wb3BvdmVyUmVmKTtcclxuXHJcblx0XHQvLyBDcmVhdGUgYSB2aXJ0dWFsIGVsZW1lbnQgZm9yIFBvcHBlci5qc1xyXG5cdFx0Y29uc3QgdmlydHVhbEVsZW1lbnQgPSB7XHJcblx0XHRcdGdldEJvdW5kaW5nQ2xpZW50UmVjdDogKCkgPT4gKHtcclxuXHRcdFx0XHR3aWR0aDogMCxcclxuXHRcdFx0XHRoZWlnaHQ6IDAsXHJcblx0XHRcdFx0dG9wOiBwb3NpdGlvbi55LFxyXG5cdFx0XHRcdHJpZ2h0OiBwb3NpdGlvbi54LFxyXG5cdFx0XHRcdGJvdHRvbTogcG9zaXRpb24ueSxcclxuXHRcdFx0XHRsZWZ0OiBwb3NpdGlvbi54LFxyXG5cdFx0XHRcdHg6IHBvc2l0aW9uLngsXHJcblx0XHRcdFx0eTogcG9zaXRpb24ueSxcclxuXHRcdFx0XHR0b0pTT046IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdHJldHVybiB0aGlzO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pLFxyXG5cdFx0fTtcclxuXHJcblx0XHRpZiAodGhpcy5wb3BvdmVyUmVmKSB7XHJcblx0XHRcdHRoaXMucG9wcGVySW5zdGFuY2UgPSBjcmVhdGVQb3BwZXIoXHJcblx0XHRcdFx0dmlydHVhbEVsZW1lbnQsXHJcblx0XHRcdFx0dGhpcy5wb3BvdmVyUmVmLFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHBsYWNlbWVudDogXCJib3R0b20tc3RhcnRcIixcclxuXHRcdFx0XHRcdG1vZGlmaWVyczogW1xyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0bmFtZTogXCJvZmZzZXRcIixcclxuXHRcdFx0XHRcdFx0XHRvcHRpb25zOiB7XHJcblx0XHRcdFx0XHRcdFx0XHRvZmZzZXQ6IFswLCA4XSwgLy8gT2Zmc2V0IHRoZSBwb3BvdmVyIHNsaWdodGx5IGZyb20gdGhlIHJlZmVyZW5jZVxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRuYW1lOiBcInByZXZlbnRPdmVyZmxvd1wiLFxyXG5cdFx0XHRcdFx0XHRcdG9wdGlvbnM6IHtcclxuXHRcdFx0XHRcdFx0XHRcdHBhZGRpbmc6IDEwLCAvLyBQYWRkaW5nIGZyb20gdmlld3BvcnQgZWRnZXNcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0bmFtZTogXCJmbGlwXCIsXHJcblx0XHRcdFx0XHRcdFx0b3B0aW9uczoge1xyXG5cdFx0XHRcdFx0XHRcdFx0ZmFsbGJhY2tQbGFjZW1lbnRzOiBbXHJcblx0XHRcdFx0XHRcdFx0XHRcdFwidG9wLXN0YXJ0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFwicmlnaHQtc3RhcnRcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0XCJsZWZ0LXN0YXJ0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRdLFxyXG5cdFx0XHRcdFx0XHRcdFx0cGFkZGluZzogMTAsXHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdF0sXHJcblx0XHRcdFx0fVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFVzZSB0aW1lb3V0IHRvIGVuc3VyZSBwb3BvdmVyIGlzIHJlbmRlcmVkIGJlZm9yZSBhZGRpbmcgbGlzdGVuZXJzXHJcblx0XHR0aGlzLndpbi5zZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0dGhpcy53aW4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHRoaXMuY2xpY2tPdXRzaWRlKTtcclxuXHRcdFx0dGhpcy5zY3JvbGxQYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihcclxuXHRcdFx0XHRcInNjcm9sbFwiLFxyXG5cdFx0XHRcdHRoaXMuc2Nyb2xsSGFuZGxlcixcclxuXHRcdFx0XHR0cnVlXHJcblx0XHRcdCk7IC8vIFVzZSBjYXB0dXJlIGZvciBzY3JvbGxcclxuXHRcdH0sIDEwKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY2xpY2tPdXRzaWRlID0gKGU6IE1vdXNlRXZlbnQpID0+IHtcclxuXHRcdGlmICh0aGlzLnBvcG92ZXJSZWYgJiYgIXRoaXMucG9wb3ZlclJlZi5jb250YWlucyhlLnRhcmdldCBhcyBOb2RlKSkge1xyXG5cdFx0XHR0aGlzLmNsb3NlKCk7XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0cHJpdmF0ZSBzY3JvbGxIYW5kbGVyID0gKGU6IEV2ZW50KSA9PiB7XHJcblx0XHRpZiAodGhpcy5wb3BvdmVyUmVmKSB7XHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHRlLnRhcmdldCBpbnN0YW5jZW9mIE5vZGUgJiZcclxuXHRcdFx0XHR0aGlzLnBvcG92ZXJSZWYuY29udGFpbnMoZS50YXJnZXQpXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdGNvbnN0IHRhcmdldEVsZW1lbnQgPSBlLnRhcmdldCBhcyBIVE1MRWxlbWVudDtcclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHR0YXJnZXRFbGVtZW50LnNjcm9sbEhlaWdodCA+IHRhcmdldEVsZW1lbnQuY2xpZW50SGVpZ2h0IHx8XHJcblx0XHRcdFx0XHR0YXJnZXRFbGVtZW50LnNjcm9sbFdpZHRoID4gdGFyZ2V0RWxlbWVudC5jbGllbnRXaWR0aFxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHR0aGlzLmNsb3NlKCk7XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0LyoqXHJcblx0ICogQ2xvc2VzIHRoZSBwb3BvdmVyLlxyXG5cdCAqL1xyXG5cdGNsb3NlKCkge1xyXG5cdFx0aWYgKHRoaXMucG9wcGVySW5zdGFuY2UpIHtcclxuXHRcdFx0dGhpcy5wb3BwZXJJbnN0YW5jZS5kZXN0cm95KCk7XHJcblx0XHRcdHRoaXMucG9wcGVySW5zdGFuY2UgPSBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0aGlzLnBvcG92ZXJSZWYpIHtcclxuXHRcdFx0dGhpcy5wb3BvdmVyUmVmLnJlbW92ZSgpO1xyXG5cdFx0XHR0aGlzLnBvcG92ZXJSZWYgPSBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMud2luLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCB0aGlzLmNsaWNrT3V0c2lkZSk7XHJcblx0XHR0aGlzLnNjcm9sbFBhcmVudC5yZW1vdmVFdmVudExpc3RlbmVyKFxyXG5cdFx0XHRcInNjcm9sbFwiLFxyXG5cdFx0XHR0aGlzLnNjcm9sbEhhbmRsZXIsXHJcblx0XHRcdHRydWVcclxuXHRcdCk7XHJcblxyXG5cdFx0aWYgKHRoaXMuZGF0ZVBpY2tlckNvbXBvbmVudCkge1xyXG5cdFx0XHR0aGlzLmRhdGVQaWNrZXJDb21wb25lbnQub251bmxvYWQoKTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuIl19