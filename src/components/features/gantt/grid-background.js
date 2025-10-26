import { Component } from "obsidian";
import { DateHelper } from "@/utils/date/date-helper"; // Corrected import path again
export class GridBackgroundComponent extends Component {
    constructor(app, svgGroupEl) {
        super();
        this.params = null;
        // Use DateHelper for date calculations
        this.dateHelper = new DateHelper();
        this.app = app;
        this.svgGroupEl = svgGroupEl;
    }
    onload() {
        console.log("GridBackgroundComponent loaded.");
        // Initial render happens when updateParams is called
    }
    onunload() {
        console.log("GridBackgroundComponent unloaded.");
        this.svgGroupEl.empty(); // Clear the grid group
    }
    updateParams(newParams) {
        this.params = newParams;
        this.render();
    }
    render() {
        if (!this.params) {
            console.warn("GridBackgroundComponent: Cannot render, params not set.");
            return;
        }
        this.svgGroupEl.empty(); // Clear previous grid
        const { startDate, // Overall start for coordinate calculations
        endDate, // Overall end for today marker check
        visibleStartDate, // Use these for rendering loops
        visibleEndDate, totalWidth, // Still needed for horizontal line width
        totalHeight, visibleTasks, // Use filtered tasks
        timescale, rowHeight, dateHelper, // Use passed dateHelper
        shouldDrawMajorTick, shouldDrawMinorTick, } = this.params;
        // --- Vertical Lines (Optimized) ---
        // Determine the date range to render vertical lines for
        const renderBufferDays = 30; // Match header buffer or adjust as needed
        let renderStartDate = dateHelper.addDays(visibleStartDate, -renderBufferDays);
        let renderEndDate = dateHelper.addDays(visibleEndDate, renderBufferDays);
        // Clamp render range to the overall gantt chart bounds
        renderStartDate = new Date(Math.max(renderStartDate.getTime(), startDate.getTime()));
        renderEndDate = new Date(Math.min(renderEndDate.getTime(), endDate.getTime()));
        // Start iteration from the beginning of the renderStartDate's day
        let currentDate = dateHelper.startOfDay(renderStartDate);
        while (currentDate <= renderEndDate) {
            // Iterate only over render range
            const x = dateHelper.dateToX(currentDate, startDate, // Base calculation still uses overall startDate
            this.params.dayWidth);
            if (shouldDrawMajorTick(currentDate)) {
                this.svgGroupEl.createSvg("line", {
                    attr: {
                        x1: x,
                        y1: 0,
                        x2: x,
                        y2: totalHeight,
                        class: "gantt-grid-line-major",
                    },
                });
            }
            else if (shouldDrawMinorTick(currentDate) ||
                timescale === "Day") {
                // Draw day lines in Day view
                this.svgGroupEl.createSvg("line", {
                    attr: {
                        x1: x,
                        y1: 0,
                        x2: x,
                        y2: totalHeight,
                        class: "gantt-grid-line-minor",
                    },
                });
            }
            // Stop iterating if we've passed the render end date
            if (currentDate > renderEndDate) {
                break;
            }
            currentDate = dateHelper.addDays(currentDate, 1);
        }
        // --- Horizontal Lines (Simplified) ---
        // Draw a line every rowHeight up to totalHeight
        for (let y = rowHeight; y <= totalHeight; y += rowHeight) {
            this.svgGroupEl.createSvg("line", {
                attr: {
                    x1: 0,
                    y1: y,
                    x2: totalWidth,
                    y2: y,
                    class: "gantt-grid-line-horizontal",
                },
            });
        }
        // --- Today Marker Line in Grid (No change needed, already checks bounds) ---
        const today = dateHelper.startOfDay(new Date());
        if (today >= startDate && today <= endDate) {
            const todayX = dateHelper.dateToX(today, startDate, this.params.dayWidth);
            this.svgGroupEl.createSvg("line", {
                attr: {
                    x1: todayX,
                    y1: 0,
                    x2: todayX,
                    y2: totalHeight,
                    class: "gantt-grid-today-marker",
                },
            });
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JpZC1iYWNrZ3JvdW5kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ3JpZC1iYWNrZ3JvdW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQU8sTUFBTSxVQUFVLENBQUM7QUFFMUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDBCQUEwQixDQUFDLENBQUMsOEJBQThCO0FBbUJyRixNQUFNLE9BQU8sdUJBQXdCLFNBQVEsU0FBUztJQVFyRCxZQUFZLEdBQVEsRUFBRSxVQUF1QjtRQUM1QyxLQUFLLEVBQUUsQ0FBQztRQU5ELFdBQU0sR0FBZ0MsSUFBSSxDQUFDO1FBRW5ELHVDQUF1QztRQUMvQixlQUFVLEdBQUcsSUFBSSxVQUFVLEVBQUUsQ0FBQztRQUlyQyxJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztRQUNmLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO0lBQzlCLENBQUM7SUFFRCxNQUFNO1FBQ0wsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO1FBQy9DLHFEQUFxRDtJQUN0RCxDQUFDO0lBRUQsUUFBUTtRQUNQLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUNBQW1DLENBQUMsQ0FBQztRQUNqRCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsdUJBQXVCO0lBQ2pELENBQUM7SUFFRCxZQUFZLENBQUMsU0FBK0I7UUFDM0MsSUFBSSxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUM7UUFDeEIsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ2YsQ0FBQztJQUVPLE1BQU07UUFDYixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNqQixPQUFPLENBQUMsSUFBSSxDQUNYLHlEQUF5RCxDQUN6RCxDQUFDO1lBQ0YsT0FBTztTQUNQO1FBRUQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLHNCQUFzQjtRQUUvQyxN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O29CQUNMLEtBQUssRUFBRSw0QkFBNEI7aUJBQ25DO2FBQ0QsQ0FBQyxDQUFDO1NBQ0g7UUFFRCw4RUFBOEU7UUFDOUUsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUM7UUFDaEQsSUFBSSxLQUFLLElBQUksU0FBUyxJQUFJLEtBQUssSUFBSSxPQUFPLEVBQUU7WUFDM0MsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FDaEMsS0FBSyxFQUNMLFNBQVMsRUFDVCxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FDcEIsQ0FBQztZQUNGLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRTtnQkFDakMsSUFBSSxFQUFFO29CQUNMLEVBQUUsRUFBRSxNQUFNO29CQUNWLEVBQUUsRUFBRSxDQUFDO29CQUNMLEVBQUUsRUFBRSxNQUFNO29CQUNWLEVBQUUsRUFBRSxXQUFXO29CQUNmLEtBQUssRUFBRSx5QkFBeUI7aUJBQ2hDO2FBQ0QsQ0FBQyxDQUFDO1NBQ0g7SUFDRixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQsIEFwcCB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBHYW50dFRhc2tJdGVtLCBUaW1lc2NhbGUsIFBsYWNlZEdhbnR0VGFza0l0ZW0gfSBmcm9tICcuL2dhbnR0JzsgLy8gQ29ycmVjdGx5IGltcG9ydHMgUGxhY2VkR2FudHRUYXNrSXRlbSBub3dcclxuaW1wb3J0IHsgRGF0ZUhlbHBlciB9IGZyb20gXCJAL3V0aWxzL2RhdGUvZGF0ZS1oZWxwZXJcIjsgLy8gQ29ycmVjdGVkIGltcG9ydCBwYXRoIGFnYWluXHJcblxyXG4vLyBJbnRlcmZhY2UgZm9yIHBhcmFtZXRlcnMgbmVlZGVkIGJ5IHRoZSBncmlkIGNvbXBvbmVudFxyXG5pbnRlcmZhY2UgR3JpZEJhY2tncm91bmRQYXJhbXMge1xyXG5cdHN0YXJ0RGF0ZTogRGF0ZTtcclxuXHRlbmREYXRlOiBEYXRlO1xyXG5cdHZpc2libGVTdGFydERhdGU6IERhdGU7IC8vIE5lZWQgdmlzaWJsZSByYW5nZSBmb3Igb3B0aW1pemF0aW9uXHJcblx0dmlzaWJsZUVuZERhdGU6IERhdGU7IC8vIE5lZWQgdmlzaWJsZSByYW5nZSBmb3Igb3B0aW1pemF0aW9uXHJcblx0dG90YWxXaWR0aDogbnVtYmVyO1xyXG5cdHRvdGFsSGVpZ2h0OiBudW1iZXI7XHJcblx0dmlzaWJsZVRhc2tzOiBQbGFjZWRHYW50dFRhc2tJdGVtW107IC8vIFVzZSBmaWx0ZXJlZCB0YXNrc1xyXG5cdHRpbWVzY2FsZTogVGltZXNjYWxlO1xyXG5cdGRheVdpZHRoOiBudW1iZXI7XHJcblx0cm93SGVpZ2h0OiBudW1iZXI7XHJcblx0ZGF0ZUhlbHBlcjogRGF0ZUhlbHBlcjsgLy8gUGFzcyBoZWxwZXIgZnVuY3Rpb25zXHJcblx0c2hvdWxkRHJhd01ham9yVGljazogKGRhdGU6IERhdGUpID0+IGJvb2xlYW47XHJcblx0c2hvdWxkRHJhd01pbm9yVGljazogKGRhdGU6IERhdGUpID0+IGJvb2xlYW47XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBHcmlkQmFja2dyb3VuZENvbXBvbmVudCBleHRlbmRzIENvbXBvbmVudCB7XHJcblx0cHJpdmF0ZSBhcHA6IEFwcDtcclxuXHRwcml2YXRlIHN2Z0dyb3VwRWw6IFNWR0dFbGVtZW50OyAvLyBUaGUgPGc+IGVsZW1lbnQgdG8gZHJhdyBpbnRvXHJcblx0cHJpdmF0ZSBwYXJhbXM6IEdyaWRCYWNrZ3JvdW5kUGFyYW1zIHwgbnVsbCA9IG51bGw7XHJcblxyXG5cdC8vIFVzZSBEYXRlSGVscGVyIGZvciBkYXRlIGNhbGN1bGF0aW9uc1xyXG5cdHByaXZhdGUgZGF0ZUhlbHBlciA9IG5ldyBEYXRlSGVscGVyKCk7XHJcblxyXG5cdGNvbnN0cnVjdG9yKGFwcDogQXBwLCBzdmdHcm91cEVsOiBTVkdHRWxlbWVudCkge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMuYXBwID0gYXBwO1xyXG5cdFx0dGhpcy5zdmdHcm91cEVsID0gc3ZnR3JvdXBFbDtcclxuXHR9XHJcblxyXG5cdG9ubG9hZCgpIHtcclxuXHRcdGNvbnNvbGUubG9nKFwiR3JpZEJhY2tncm91bmRDb21wb25lbnQgbG9hZGVkLlwiKTtcclxuXHRcdC8vIEluaXRpYWwgcmVuZGVyIGhhcHBlbnMgd2hlbiB1cGRhdGVQYXJhbXMgaXMgY2FsbGVkXHJcblx0fVxyXG5cclxuXHRvbnVubG9hZCgpIHtcclxuXHRcdGNvbnNvbGUubG9nKFwiR3JpZEJhY2tncm91bmRDb21wb25lbnQgdW5sb2FkZWQuXCIpO1xyXG5cdFx0dGhpcy5zdmdHcm91cEVsLmVtcHR5KCk7IC8vIENsZWFyIHRoZSBncmlkIGdyb3VwXHJcblx0fVxyXG5cclxuXHR1cGRhdGVQYXJhbXMobmV3UGFyYW1zOiBHcmlkQmFja2dyb3VuZFBhcmFtcykge1xyXG5cdFx0dGhpcy5wYXJhbXMgPSBuZXdQYXJhbXM7XHJcblx0XHR0aGlzLnJlbmRlcigpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSByZW5kZXIoKSB7XHJcblx0XHRpZiAoIXRoaXMucGFyYW1zKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcIkdyaWRCYWNrZ3JvdW5kQ29tcG9uZW50OiBDYW5ub3QgcmVuZGVyLCBwYXJhbXMgbm90IHNldC5cIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5zdmdHcm91cEVsLmVtcHR5KCk7IC8vIENsZWFyIHByZXZpb3VzIGdyaWRcclxuXHJcblx0XHRjb25zdCB7XHJcblx0XHRcdHN0YXJ0RGF0ZSwgLy8gT3ZlcmFsbCBzdGFydCBmb3IgY29vcmRpbmF0ZSBjYWxjdWxhdGlvbnNcclxuXHRcdFx0ZW5kRGF0ZSwgLy8gT3ZlcmFsbCBlbmQgZm9yIHRvZGF5IG1hcmtlciBjaGVja1xyXG5cdFx0XHR2aXNpYmxlU3RhcnREYXRlLCAvLyBVc2UgdGhlc2UgZm9yIHJlbmRlcmluZyBsb29wc1xyXG5cdFx0XHR2aXNpYmxlRW5kRGF0ZSxcclxuXHRcdFx0dG90YWxXaWR0aCwgLy8gU3RpbGwgbmVlZGVkIGZvciBob3Jpem9udGFsIGxpbmUgd2lkdGhcclxuXHRcdFx0dG90YWxIZWlnaHQsXHJcblx0XHRcdHZpc2libGVUYXNrcywgLy8gVXNlIGZpbHRlcmVkIHRhc2tzXHJcblx0XHRcdHRpbWVzY2FsZSxcclxuXHRcdFx0cm93SGVpZ2h0LFxyXG5cdFx0XHRkYXRlSGVscGVyLCAvLyBVc2UgcGFzc2VkIGRhdGVIZWxwZXJcclxuXHRcdFx0c2hvdWxkRHJhd01ham9yVGljayxcclxuXHRcdFx0c2hvdWxkRHJhd01pbm9yVGljayxcclxuXHRcdH0gPSB0aGlzLnBhcmFtcztcclxuXHJcblx0XHQvLyAtLS0gVmVydGljYWwgTGluZXMgKE9wdGltaXplZCkgLS0tXHJcblx0XHQvLyBEZXRlcm1pbmUgdGhlIGRhdGUgcmFuZ2UgdG8gcmVuZGVyIHZlcnRpY2FsIGxpbmVzIGZvclxyXG5cdFx0Y29uc3QgcmVuZGVyQnVmZmVyRGF5cyA9IDMwOyAvLyBNYXRjaCBoZWFkZXIgYnVmZmVyIG9yIGFkanVzdCBhcyBuZWVkZWRcclxuXHRcdGxldCByZW5kZXJTdGFydERhdGUgPSBkYXRlSGVscGVyLmFkZERheXMoXHJcblx0XHRcdHZpc2libGVTdGFydERhdGUsXHJcblx0XHRcdC1yZW5kZXJCdWZmZXJEYXlzXHJcblx0XHQpO1xyXG5cdFx0bGV0IHJlbmRlckVuZERhdGUgPSBkYXRlSGVscGVyLmFkZERheXMoXHJcblx0XHRcdHZpc2libGVFbmREYXRlLFxyXG5cdFx0XHRyZW5kZXJCdWZmZXJEYXlzXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIENsYW1wIHJlbmRlciByYW5nZSB0byB0aGUgb3ZlcmFsbCBnYW50dCBjaGFydCBib3VuZHNcclxuXHRcdHJlbmRlclN0YXJ0RGF0ZSA9IG5ldyBEYXRlKFxyXG5cdFx0XHRNYXRoLm1heChyZW5kZXJTdGFydERhdGUuZ2V0VGltZSgpLCBzdGFydERhdGUuZ2V0VGltZSgpKVxyXG5cdFx0KTtcclxuXHRcdHJlbmRlckVuZERhdGUgPSBuZXcgRGF0ZShcclxuXHRcdFx0TWF0aC5taW4ocmVuZGVyRW5kRGF0ZS5nZXRUaW1lKCksIGVuZERhdGUuZ2V0VGltZSgpKVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBTdGFydCBpdGVyYXRpb24gZnJvbSB0aGUgYmVnaW5uaW5nIG9mIHRoZSByZW5kZXJTdGFydERhdGUncyBkYXlcclxuXHRcdGxldCBjdXJyZW50RGF0ZSA9IGRhdGVIZWxwZXIuc3RhcnRPZkRheShyZW5kZXJTdGFydERhdGUpO1xyXG5cclxuXHRcdHdoaWxlIChjdXJyZW50RGF0ZSA8PSByZW5kZXJFbmREYXRlKSB7XHJcblx0XHRcdC8vIEl0ZXJhdGUgb25seSBvdmVyIHJlbmRlciByYW5nZVxyXG5cdFx0XHRjb25zdCB4ID0gZGF0ZUhlbHBlci5kYXRlVG9YKFxyXG5cdFx0XHRcdGN1cnJlbnREYXRlLFxyXG5cdFx0XHRcdHN0YXJ0RGF0ZSwgLy8gQmFzZSBjYWxjdWxhdGlvbiBzdGlsbCB1c2VzIG92ZXJhbGwgc3RhcnREYXRlXHJcblx0XHRcdFx0dGhpcy5wYXJhbXMuZGF5V2lkdGhcclxuXHRcdFx0KTtcclxuXHRcdFx0aWYgKHNob3VsZERyYXdNYWpvclRpY2soY3VycmVudERhdGUpKSB7XHJcblx0XHRcdFx0dGhpcy5zdmdHcm91cEVsLmNyZWF0ZVN2ZyhcImxpbmVcIiwge1xyXG5cdFx0XHRcdFx0YXR0cjoge1xyXG5cdFx0XHRcdFx0XHR4MTogeCxcclxuXHRcdFx0XHRcdFx0eTE6IDAsXHJcblx0XHRcdFx0XHRcdHgyOiB4LFxyXG5cdFx0XHRcdFx0XHR5MjogdG90YWxIZWlnaHQsXHJcblx0XHRcdFx0XHRcdGNsYXNzOiBcImdhbnR0LWdyaWQtbGluZS1tYWpvclwiLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSBlbHNlIGlmIChcclxuXHRcdFx0XHRzaG91bGREcmF3TWlub3JUaWNrKGN1cnJlbnREYXRlKSB8fFxyXG5cdFx0XHRcdHRpbWVzY2FsZSA9PT0gXCJEYXlcIlxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHQvLyBEcmF3IGRheSBsaW5lcyBpbiBEYXkgdmlld1xyXG5cdFx0XHRcdHRoaXMuc3ZnR3JvdXBFbC5jcmVhdGVTdmcoXCJsaW5lXCIsIHtcclxuXHRcdFx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHRcdFx0eDE6IHgsXHJcblx0XHRcdFx0XHRcdHkxOiAwLFxyXG5cdFx0XHRcdFx0XHR4MjogeCxcclxuXHRcdFx0XHRcdFx0eTI6IHRvdGFsSGVpZ2h0LFxyXG5cdFx0XHRcdFx0XHRjbGFzczogXCJnYW50dC1ncmlkLWxpbmUtbWlub3JcIixcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFN0b3AgaXRlcmF0aW5nIGlmIHdlJ3ZlIHBhc3NlZCB0aGUgcmVuZGVyIGVuZCBkYXRlXHJcblx0XHRcdGlmIChjdXJyZW50RGF0ZSA+IHJlbmRlckVuZERhdGUpIHtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y3VycmVudERhdGUgPSBkYXRlSGVscGVyLmFkZERheXMoY3VycmVudERhdGUsIDEpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIC0tLSBIb3Jpem9udGFsIExpbmVzIChTaW1wbGlmaWVkKSAtLS1cclxuXHRcdC8vIERyYXcgYSBsaW5lIGV2ZXJ5IHJvd0hlaWdodCB1cCB0byB0b3RhbEhlaWdodFxyXG5cdFx0Zm9yIChsZXQgeSA9IHJvd0hlaWdodDsgeSA8PSB0b3RhbEhlaWdodDsgeSArPSByb3dIZWlnaHQpIHtcclxuXHRcdFx0dGhpcy5zdmdHcm91cEVsLmNyZWF0ZVN2ZyhcImxpbmVcIiwge1xyXG5cdFx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHRcdHgxOiAwLFxyXG5cdFx0XHRcdFx0eTE6IHksXHJcblx0XHRcdFx0XHR4MjogdG90YWxXaWR0aCxcclxuXHRcdFx0XHRcdHkyOiB5LFxyXG5cdFx0XHRcdFx0Y2xhc3M6IFwiZ2FudHQtZ3JpZC1saW5lLWhvcml6b250YWxcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyAtLS0gVG9kYXkgTWFya2VyIExpbmUgaW4gR3JpZCAoTm8gY2hhbmdlIG5lZWRlZCwgYWxyZWFkeSBjaGVja3MgYm91bmRzKSAtLS1cclxuXHRcdGNvbnN0IHRvZGF5ID0gZGF0ZUhlbHBlci5zdGFydE9mRGF5KG5ldyBEYXRlKCkpO1xyXG5cdFx0aWYgKHRvZGF5ID49IHN0YXJ0RGF0ZSAmJiB0b2RheSA8PSBlbmREYXRlKSB7XHJcblx0XHRcdGNvbnN0IHRvZGF5WCA9IGRhdGVIZWxwZXIuZGF0ZVRvWChcclxuXHRcdFx0XHR0b2RheSxcclxuXHRcdFx0XHRzdGFydERhdGUsXHJcblx0XHRcdFx0dGhpcy5wYXJhbXMuZGF5V2lkdGhcclxuXHRcdFx0KTtcclxuXHRcdFx0dGhpcy5zdmdHcm91cEVsLmNyZWF0ZVN2ZyhcImxpbmVcIiwge1xyXG5cdFx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHRcdHgxOiB0b2RheVgsXHJcblx0XHRcdFx0XHR5MTogMCxcclxuXHRcdFx0XHRcdHgyOiB0b2RheVgsXHJcblx0XHRcdFx0XHR5MjogdG90YWxIZWlnaHQsXHJcblx0XHRcdFx0XHRjbGFzczogXCJnYW50dC1ncmlkLXRvZGF5LW1hcmtlclwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG4iXX0=