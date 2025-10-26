import { Component } from "obsidian";
export class TimelineHeaderComponent extends Component {
    constructor(app, headerContainerEl) {
        super();
        this.svgEl = null;
        this.params = null;
        this.app = app;
        this.headerContainerEl = headerContainerEl;
        // Add class? Maybe managed by parent
    }
    onload() {
        console.log("TimelineHeaderComponent loaded.");
        // Initial render happens when updateParams is called
    }
    onunload() {
        console.log("TimelineHeaderComponent unloaded.");
        if (this.svgEl) {
            this.svgEl.remove();
            this.svgEl = null;
        }
        this.headerContainerEl.empty(); // Clear the container
    }
    updateParams(newParams) {
        this.params = newParams;
        this.render();
    }
    render() {
        if (!this.params) {
            console.warn("TimelineHeaderComponent: Cannot render, params not set.");
            return;
        }
        const { startDate, endDate, totalWidth, timescale, scrollLeft, headerHeight, dateHelper, shouldDrawMajorTick, shouldDrawMinorTick, formatMajorTick, formatMinorTick, formatDayTick, } = this.params;
        // Clear previous header SVG
        this.headerContainerEl.empty();
        this.svgEl = this.headerContainerEl.createSvg("svg", {
            cls: "gantt-header-svg",
        });
        this.svgEl.setAttribute("width", "100%"); // Take full width of header container
        this.svgEl.setAttribute("height", `${headerHeight}`);
        const headerGroup = this.svgEl.createSvg("g", {
            cls: "gantt-header-content",
        });
        // Apply scroll offset to the header content
        headerGroup.setAttribute("transform", `translate(${-scrollLeft}, 0)`);
        // Background for the entire scrollable header width
        headerGroup.createSvg("rect", {
            attr: {
                x: 0,
                y: 0,
                width: totalWidth,
                height: headerHeight,
                class: "gantt-header-bg",
            },
        });
        // --- Render Ticks and Labels --- //
        // Logic adapted from GanttComponent.renderHeaderOnly
        // Determine the range to render based on visible area + buffer
        const renderBufferDays = 30; // Render 30 days before/after visible range
        let renderStartDate = dateHelper.addDays(this.params.visibleStartDate, -renderBufferDays);
        let renderEndDate = dateHelper.addDays(this.params.visibleEndDate, renderBufferDays);
        // Clamp render range to the overall gantt chart bounds
        renderStartDate = new Date(Math.max(renderStartDate.getTime(), startDate.getTime()));
        renderEndDate = new Date(Math.min(renderEndDate.getTime(), endDate.getTime()));
        // Start iteration from the beginning of the renderStartDate's day
        let currentDate = dateHelper.startOfDay(renderStartDate);
        // --- TEMPORARY: Revert to iterating over full range for debugging ---
        // let currentDate = new Date(startDate.getTime()); // Comment this out
        const uniqueMonths = {};
        const uniqueWeeks = {};
        const uniqueDays = {};
        while (currentDate <= renderEndDate) {
            const x = dateHelper.dateToX(currentDate, startDate, this.params.dayWidth);
            const nextDate = dateHelper.addDays(currentDate, 1);
            const nextX = dateHelper.dateToX(nextDate, startDate, this.params.dayWidth);
            const width = nextX - x; // Width of this day/tick
            // Major Ticks (Months/Years depending on timescale)
            if (shouldDrawMajorTick(currentDate)) {
                headerGroup.createSvg("line", {
                    attr: {
                        x1: x,
                        y1: 0,
                        x2: x,
                        y2: headerHeight,
                        class: "gantt-header-tick-major",
                    },
                });
                const label = formatMajorTick(currentDate);
                if (label && width > 10) {
                    // Only add label if space allows
                    const yearMonth = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
                    if (!uniqueMonths[yearMonth]) {
                        uniqueMonths[yearMonth] = { x: x + 5, label: label };
                    }
                }
            }
            // Minor Ticks (Weeks/Days depending on timescale)
            if (shouldDrawMinorTick(currentDate)) {
                headerGroup.createSvg("line", {
                    attr: {
                        x1: x,
                        y1: headerHeight * 0.5,
                        x2: x,
                        y2: headerHeight,
                        class: "gantt-header-tick-minor",
                    },
                });
                const label = formatMinorTick(currentDate);
                if (label && width > 2) {
                    // Only add label if space allows
                    if (timescale === "Day" || timescale === "Week") {
                        const yearWeek = `${currentDate.getFullYear()}-W${dateHelper.getWeekNumber(currentDate)}`;
                        if (!uniqueWeeks[yearWeek]) {
                            uniqueWeeks[yearWeek] = { x: x + 5, label: label };
                        }
                    }
                    else if (timescale === "Month") {
                        // Show day number in month view if space
                        const dayLabel = currentDate.getDate().toString();
                        const yearMonthDay = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;
                        if (!uniqueDays[yearMonthDay]) {
                            uniqueDays[yearMonthDay] = {
                                x: x + width / 2,
                                label: dayLabel,
                            };
                        }
                    }
                }
            }
            // Day Ticks (only in Day view if space permits)
            if (timescale === "Day") {
                headerGroup.createSvg("line", {
                    attr: {
                        x1: x,
                        y1: headerHeight * 0.7,
                        x2: x,
                        y2: headerHeight,
                        class: "gantt-header-tick-day",
                    },
                });
                const label = formatDayTick(currentDate);
                if (label && width > 2) {
                    const yearMonthDay = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;
                    if (!uniqueDays[yearMonthDay]) {
                        uniqueDays[yearMonthDay] = {
                            x: x + width / 2,
                            label: label,
                        };
                    }
                }
            }
            // Stop iterating if we've passed the render end date
            if (currentDate > renderEndDate) {
                break;
            }
            currentDate = nextDate;
        }
        // Render collected labels to avoid overlaps
        Object.values(uniqueMonths).forEach((item) => {
            headerGroup.createSvg("text", {
                attr: {
                    x: item.x,
                    y: headerHeight * 0.35,
                    class: "gantt-header-label-major",
                },
            }).textContent = item.label;
        });
        Object.values(uniqueWeeks).forEach((item) => {
            headerGroup.createSvg("text", {
                attr: {
                    x: item.x,
                    y: headerHeight * 0.65,
                    class: "gantt-header-label-minor",
                },
            }).textContent = item.label;
        });
        Object.values(uniqueDays).forEach((item) => {
            headerGroup.createSvg("text", {
                attr: {
                    x: item.x,
                    y: headerHeight * 0.85,
                    class: "gantt-header-label-day",
                    "text-anchor": "middle",
                },
            }).textContent = item.label;
        });
        // --- Today Marker ---
        const today = dateHelper.startOfDay(new Date());
        if (today >= startDate && today <= endDate) {
            const todayX = dateHelper.dateToX(today, startDate, this.params.dayWidth);
            headerGroup.createSvg("line", {
                attr: {
                    x1: todayX,
                    y1: 0,
                    x2: todayX,
                    y2: headerHeight,
                    class: "gantt-header-today-marker",
                },
            });
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZWxpbmUtaGVhZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGltZWxpbmUtaGVhZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQU8sTUFBTSxVQUFVLENBQUM7QUF1QjFDLE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxTQUFTO0lBTXJELFlBQVksR0FBUSxFQUFFLGlCQUE4QjtRQUNuRCxLQUFLLEVBQUUsQ0FBQztRQUpELFVBQUssR0FBeUIsSUFBSSxDQUFDO1FBQ25DLFdBQU0sR0FBZ0MsSUFBSSxDQUFDO1FBSWxELElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO1FBQ2YsSUFBSSxDQUFDLGlCQUFpQixHQUFHLGlCQUFpQixDQUFDO1FBQzNDLHFDQUFxQztJQUN0QyxDQUFDO0lBRUQsTUFBTTtRQUNMLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUNBQWlDLENBQUMsQ0FBQztRQUMvQyxxREFBcUQ7SUFDdEQsQ0FBQztJQUVELFFBQVE7UUFDUCxPQUFPLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7UUFDakQsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFO1lBQ2YsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztTQUNsQjtRQUNELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLHNCQUFzQjtJQUN2RCxDQUFDO0lBRUQsWUFBWSxDQUFDLFNBQStCO1FBQzNDLElBQUksQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNmLENBQUM7SUFFTyxNQUFNO1FBQ2IsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDakIsT0FBTyxDQUFDLElBQUksQ0FDWCx5REFBeUQsQ0FDekQsQ0FBQztZQUNGLE9BQU87U0FDUDtRQUVE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QUFFLEVBQUUsWUFBWTtvQkFDaEIsS0FBSyxFQUFFLDJCQUEyQjtpQkFDbEM7YUFDRCxDQUFDLENBQUM7U0FDSDtJQUNGLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbXBvbmVudCwgQXBwIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFRpbWVzY2FsZSB9IGZyb20gJy4vZ2FudHQnOyAvLyBBc3N1bWluZyB0eXBlcyBhcmUgZXhwb3J0ZWQgb3IgbW92ZWRcclxuaW1wb3J0IHsgRGF0ZUhlbHBlciB9IGZyb20gXCJAL3V0aWxzL2RhdGUvZGF0ZS1oZWxwZXJcIjsgLy8gQXNzdW1pbmcgRGF0ZUhlbHBlciBleGlzdHNcclxuXHJcbi8vIEludGVyZmFjZSBmb3IgcGFyYW1ldGVycyBuZWVkZWQgYnkgdGhlIGhlYWRlciBjb21wb25lbnRcclxuaW50ZXJmYWNlIFRpbWVsaW5lSGVhZGVyUGFyYW1zIHtcclxuXHRzdGFydERhdGU6IERhdGU7XHJcblx0ZW5kRGF0ZTogRGF0ZTtcclxuXHR2aXNpYmxlU3RhcnREYXRlOiBEYXRlO1xyXG5cdHZpc2libGVFbmREYXRlOiBEYXRlOyAvLyBDYWxjdWxhdGVkIHZpc2libGUgZW5kIGRhdGVcclxuXHR0b3RhbFdpZHRoOiBudW1iZXI7XHJcblx0dGltZXNjYWxlOiBUaW1lc2NhbGU7XHJcblx0ZGF5V2lkdGg6IG51bWJlcjtcclxuXHRzY3JvbGxMZWZ0OiBudW1iZXI7XHJcblx0aGVhZGVySGVpZ2h0OiBudW1iZXI7XHJcblx0ZGF0ZUhlbHBlcjogRGF0ZUhlbHBlcjsgLy8gUGFzcyBoZWxwZXIgZnVuY3Rpb25zXHJcblx0c2hvdWxkRHJhd01ham9yVGljazogKGRhdGU6IERhdGUpID0+IGJvb2xlYW47XHJcblx0c2hvdWxkRHJhd01pbm9yVGljazogKGRhdGU6IERhdGUpID0+IGJvb2xlYW47XHJcblx0Zm9ybWF0TWFqb3JUaWNrOiAoZGF0ZTogRGF0ZSkgPT4gc3RyaW5nO1xyXG5cdGZvcm1hdE1pbm9yVGljazogKGRhdGU6IERhdGUpID0+IHN0cmluZztcclxuXHRmb3JtYXREYXlUaWNrOiAoZGF0ZTogRGF0ZSkgPT4gc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVGltZWxpbmVIZWFkZXJDb21wb25lbnQgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdHByaXZhdGUgYXBwOiBBcHA7XHJcblx0cHJpdmF0ZSBoZWFkZXJDb250YWluZXJFbDogSFRNTEVsZW1lbnQ7IC8vIFRoZSBkaXYgY29udGFpbmVyIGZvciB0aGUgaGVhZGVyIFNWR1xyXG5cdHByaXZhdGUgc3ZnRWw6IFNWR1NWR0VsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIHBhcmFtczogVGltZWxpbmVIZWFkZXJQYXJhbXMgfCBudWxsID0gbnVsbDtcclxuXHJcblx0Y29uc3RydWN0b3IoYXBwOiBBcHAsIGhlYWRlckNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCkge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMuYXBwID0gYXBwO1xyXG5cdFx0dGhpcy5oZWFkZXJDb250YWluZXJFbCA9IGhlYWRlckNvbnRhaW5lckVsO1xyXG5cdFx0Ly8gQWRkIGNsYXNzPyBNYXliZSBtYW5hZ2VkIGJ5IHBhcmVudFxyXG5cdH1cclxuXHJcblx0b25sb2FkKCkge1xyXG5cdFx0Y29uc29sZS5sb2coXCJUaW1lbGluZUhlYWRlckNvbXBvbmVudCBsb2FkZWQuXCIpO1xyXG5cdFx0Ly8gSW5pdGlhbCByZW5kZXIgaGFwcGVucyB3aGVuIHVwZGF0ZVBhcmFtcyBpcyBjYWxsZWRcclxuXHR9XHJcblxyXG5cdG9udW5sb2FkKCkge1xyXG5cdFx0Y29uc29sZS5sb2coXCJUaW1lbGluZUhlYWRlckNvbXBvbmVudCB1bmxvYWRlZC5cIik7XHJcblx0XHRpZiAodGhpcy5zdmdFbCkge1xyXG5cdFx0XHR0aGlzLnN2Z0VsLnJlbW92ZSgpO1xyXG5cdFx0XHR0aGlzLnN2Z0VsID0gbnVsbDtcclxuXHRcdH1cclxuXHRcdHRoaXMuaGVhZGVyQ29udGFpbmVyRWwuZW1wdHkoKTsgLy8gQ2xlYXIgdGhlIGNvbnRhaW5lclxyXG5cdH1cclxuXHJcblx0dXBkYXRlUGFyYW1zKG5ld1BhcmFtczogVGltZWxpbmVIZWFkZXJQYXJhbXMpIHtcclxuXHRcdHRoaXMucGFyYW1zID0gbmV3UGFyYW1zO1xyXG5cdFx0dGhpcy5yZW5kZXIoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyKCkge1xyXG5cdFx0aWYgKCF0aGlzLnBhcmFtcykge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XCJUaW1lbGluZUhlYWRlckNvbXBvbmVudDogQ2Fubm90IHJlbmRlciwgcGFyYW1zIG5vdCBzZXQuXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHtcclxuXHRcdFx0c3RhcnREYXRlLFxyXG5cdFx0XHRlbmREYXRlLFxyXG5cdFx0XHR0b3RhbFdpZHRoLFxyXG5cdFx0XHR0aW1lc2NhbGUsXHJcblx0XHRcdHNjcm9sbExlZnQsXHJcblx0XHRcdGhlYWRlckhlaWdodCxcclxuXHRcdFx0ZGF0ZUhlbHBlcixcclxuXHRcdFx0c2hvdWxkRHJhd01ham9yVGljayxcclxuXHRcdFx0c2hvdWxkRHJhd01pbm9yVGljayxcclxuXHRcdFx0Zm9ybWF0TWFqb3JUaWNrLFxyXG5cdFx0XHRmb3JtYXRNaW5vclRpY2ssXHJcblx0XHRcdGZvcm1hdERheVRpY2ssXHJcblx0XHR9ID0gdGhpcy5wYXJhbXM7XHJcblxyXG5cdFx0Ly8gQ2xlYXIgcHJldmlvdXMgaGVhZGVyIFNWR1xyXG5cdFx0dGhpcy5oZWFkZXJDb250YWluZXJFbC5lbXB0eSgpO1xyXG5cclxuXHRcdHRoaXMuc3ZnRWwgPSB0aGlzLmhlYWRlckNvbnRhaW5lckVsLmNyZWF0ZVN2ZyhcInN2Z1wiLCB7XHJcblx0XHRcdGNsczogXCJnYW50dC1oZWFkZXItc3ZnXCIsXHJcblx0XHR9KTtcclxuXHRcdHRoaXMuc3ZnRWwuc2V0QXR0cmlidXRlKFwid2lkdGhcIiwgXCIxMDAlXCIpOyAvLyBUYWtlIGZ1bGwgd2lkdGggb2YgaGVhZGVyIGNvbnRhaW5lclxyXG5cdFx0dGhpcy5zdmdFbC5zZXRBdHRyaWJ1dGUoXCJoZWlnaHRcIiwgYCR7aGVhZGVySGVpZ2h0fWApO1xyXG5cclxuXHRcdGNvbnN0IGhlYWRlckdyb3VwID0gdGhpcy5zdmdFbC5jcmVhdGVTdmcoXCJnXCIsIHtcclxuXHRcdFx0Y2xzOiBcImdhbnR0LWhlYWRlci1jb250ZW50XCIsXHJcblx0XHR9KTtcclxuXHRcdC8vIEFwcGx5IHNjcm9sbCBvZmZzZXQgdG8gdGhlIGhlYWRlciBjb250ZW50XHJcblx0XHRoZWFkZXJHcm91cC5zZXRBdHRyaWJ1dGUoXCJ0cmFuc2Zvcm1cIiwgYHRyYW5zbGF0ZSgkey1zY3JvbGxMZWZ0fSwgMClgKTtcclxuXHJcblx0XHQvLyBCYWNrZ3JvdW5kIGZvciB0aGUgZW50aXJlIHNjcm9sbGFibGUgaGVhZGVyIHdpZHRoXHJcblx0XHRoZWFkZXJHcm91cC5jcmVhdGVTdmcoXCJyZWN0XCIsIHtcclxuXHRcdFx0YXR0cjoge1xyXG5cdFx0XHRcdHg6IDAsXHJcblx0XHRcdFx0eTogMCxcclxuXHRcdFx0XHR3aWR0aDogdG90YWxXaWR0aCwgLy8gQmFja2dyb3VuZCBjb3ZlcnMgdGhlIHRvdGFsIHdpZHRoXHJcblx0XHRcdFx0aGVpZ2h0OiBoZWFkZXJIZWlnaHQsXHJcblx0XHRcdFx0Y2xhc3M6IFwiZ2FudHQtaGVhZGVyLWJnXCIsXHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyAtLS0gUmVuZGVyIFRpY2tzIGFuZCBMYWJlbHMgLS0tIC8vXHJcblx0XHQvLyBMb2dpYyBhZGFwdGVkIGZyb20gR2FudHRDb21wb25lbnQucmVuZGVySGVhZGVyT25seVxyXG5cclxuXHRcdC8vIERldGVybWluZSB0aGUgcmFuZ2UgdG8gcmVuZGVyIGJhc2VkIG9uIHZpc2libGUgYXJlYSArIGJ1ZmZlclxyXG5cdFx0Y29uc3QgcmVuZGVyQnVmZmVyRGF5cyA9IDMwOyAvLyBSZW5kZXIgMzAgZGF5cyBiZWZvcmUvYWZ0ZXIgdmlzaWJsZSByYW5nZVxyXG5cdFx0bGV0IHJlbmRlclN0YXJ0RGF0ZSA9IGRhdGVIZWxwZXIuYWRkRGF5cyhcclxuXHRcdFx0dGhpcy5wYXJhbXMudmlzaWJsZVN0YXJ0RGF0ZSxcclxuXHRcdFx0LXJlbmRlckJ1ZmZlckRheXNcclxuXHRcdCk7XHJcblx0XHRsZXQgcmVuZGVyRW5kRGF0ZSA9IGRhdGVIZWxwZXIuYWRkRGF5cyhcclxuXHRcdFx0dGhpcy5wYXJhbXMudmlzaWJsZUVuZERhdGUsXHJcblx0XHRcdHJlbmRlckJ1ZmZlckRheXNcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gQ2xhbXAgcmVuZGVyIHJhbmdlIHRvIHRoZSBvdmVyYWxsIGdhbnR0IGNoYXJ0IGJvdW5kc1xyXG5cdFx0cmVuZGVyU3RhcnREYXRlID0gbmV3IERhdGUoXHJcblx0XHRcdE1hdGgubWF4KHJlbmRlclN0YXJ0RGF0ZS5nZXRUaW1lKCksIHN0YXJ0RGF0ZS5nZXRUaW1lKCkpXHJcblx0XHQpO1xyXG5cdFx0cmVuZGVyRW5kRGF0ZSA9IG5ldyBEYXRlKFxyXG5cdFx0XHRNYXRoLm1pbihyZW5kZXJFbmREYXRlLmdldFRpbWUoKSwgZW5kRGF0ZS5nZXRUaW1lKCkpXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIFN0YXJ0IGl0ZXJhdGlvbiBmcm9tIHRoZSBiZWdpbm5pbmcgb2YgdGhlIHJlbmRlclN0YXJ0RGF0ZSdzIGRheVxyXG5cdFx0bGV0IGN1cnJlbnREYXRlID0gZGF0ZUhlbHBlci5zdGFydE9mRGF5KHJlbmRlclN0YXJ0RGF0ZSk7XHJcblxyXG5cdFx0Ly8gLS0tIFRFTVBPUkFSWTogUmV2ZXJ0IHRvIGl0ZXJhdGluZyBvdmVyIGZ1bGwgcmFuZ2UgZm9yIGRlYnVnZ2luZyAtLS1cclxuXHRcdC8vIGxldCBjdXJyZW50RGF0ZSA9IG5ldyBEYXRlKHN0YXJ0RGF0ZS5nZXRUaW1lKCkpOyAvLyBDb21tZW50IHRoaXMgb3V0XHJcblxyXG5cdFx0Y29uc3QgdW5pcXVlTW9udGhzOiB7IFtrZXk6IHN0cmluZ106IHsgeDogbnVtYmVyOyBsYWJlbDogc3RyaW5nIH0gfSA9XHJcblx0XHRcdHt9O1xyXG5cdFx0Y29uc3QgdW5pcXVlV2Vla3M6IHsgW2tleTogc3RyaW5nXTogeyB4OiBudW1iZXI7IGxhYmVsOiBzdHJpbmcgfSB9ID0ge307XHJcblx0XHRjb25zdCB1bmlxdWVEYXlzOiB7IFtrZXk6IHN0cmluZ106IHsgeDogbnVtYmVyOyBsYWJlbDogc3RyaW5nIH0gfSA9IHt9O1xyXG5cclxuXHRcdHdoaWxlIChjdXJyZW50RGF0ZSA8PSByZW5kZXJFbmREYXRlKSB7XHJcblx0XHRcdGNvbnN0IHggPSBkYXRlSGVscGVyLmRhdGVUb1goXHJcblx0XHRcdFx0Y3VycmVudERhdGUsXHJcblx0XHRcdFx0c3RhcnREYXRlLFxyXG5cdFx0XHRcdHRoaXMucGFyYW1zLmRheVdpZHRoXHJcblx0XHRcdCk7XHJcblx0XHRcdGNvbnN0IG5leHREYXRlID0gZGF0ZUhlbHBlci5hZGREYXlzKGN1cnJlbnREYXRlLCAxKTtcclxuXHRcdFx0Y29uc3QgbmV4dFggPSBkYXRlSGVscGVyLmRhdGVUb1goXHJcblx0XHRcdFx0bmV4dERhdGUsXHJcblx0XHRcdFx0c3RhcnREYXRlLFxyXG5cdFx0XHRcdHRoaXMucGFyYW1zLmRheVdpZHRoXHJcblx0XHRcdCk7XHJcblx0XHRcdGNvbnN0IHdpZHRoID0gbmV4dFggLSB4OyAvLyBXaWR0aCBvZiB0aGlzIGRheS90aWNrXHJcblxyXG5cdFx0XHQvLyBNYWpvciBUaWNrcyAoTW9udGhzL1llYXJzIGRlcGVuZGluZyBvbiB0aW1lc2NhbGUpXHJcblx0XHRcdGlmIChzaG91bGREcmF3TWFqb3JUaWNrKGN1cnJlbnREYXRlKSkge1xyXG5cdFx0XHRcdGhlYWRlckdyb3VwLmNyZWF0ZVN2ZyhcImxpbmVcIiwge1xyXG5cdFx0XHRcdFx0YXR0cjoge1xyXG5cdFx0XHRcdFx0XHR4MTogeCxcclxuXHRcdFx0XHRcdFx0eTE6IDAsXHJcblx0XHRcdFx0XHRcdHgyOiB4LFxyXG5cdFx0XHRcdFx0XHR5MjogaGVhZGVySGVpZ2h0LFxyXG5cdFx0XHRcdFx0XHRjbGFzczogXCJnYW50dC1oZWFkZXItdGljay1tYWpvclwiLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRjb25zdCBsYWJlbCA9IGZvcm1hdE1ham9yVGljayhjdXJyZW50RGF0ZSk7XHJcblx0XHRcdFx0aWYgKGxhYmVsICYmIHdpZHRoID4gMTApIHtcclxuXHRcdFx0XHRcdC8vIE9ubHkgYWRkIGxhYmVsIGlmIHNwYWNlIGFsbG93c1xyXG5cdFx0XHRcdFx0Y29uc3QgeWVhck1vbnRoID0gYCR7Y3VycmVudERhdGUuZ2V0RnVsbFllYXIoKX0tJHtjdXJyZW50RGF0ZS5nZXRNb250aCgpfWA7XHJcblx0XHRcdFx0XHRpZiAoIXVuaXF1ZU1vbnRoc1t5ZWFyTW9udGhdKSB7XHJcblx0XHRcdFx0XHRcdHVuaXF1ZU1vbnRoc1t5ZWFyTW9udGhdID0geyB4OiB4ICsgNSwgbGFiZWw6IGxhYmVsIH07XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBNaW5vciBUaWNrcyAoV2Vla3MvRGF5cyBkZXBlbmRpbmcgb24gdGltZXNjYWxlKVxyXG5cdFx0XHRpZiAoc2hvdWxkRHJhd01pbm9yVGljayhjdXJyZW50RGF0ZSkpIHtcclxuXHRcdFx0XHRoZWFkZXJHcm91cC5jcmVhdGVTdmcoXCJsaW5lXCIsIHtcclxuXHRcdFx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHRcdFx0eDE6IHgsXHJcblx0XHRcdFx0XHRcdHkxOiBoZWFkZXJIZWlnaHQgKiAwLjUsXHJcblx0XHRcdFx0XHRcdHgyOiB4LFxyXG5cdFx0XHRcdFx0XHR5MjogaGVhZGVySGVpZ2h0LFxyXG5cdFx0XHRcdFx0XHRjbGFzczogXCJnYW50dC1oZWFkZXItdGljay1taW5vclwiLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRjb25zdCBsYWJlbCA9IGZvcm1hdE1pbm9yVGljayhjdXJyZW50RGF0ZSk7XHJcblx0XHRcdFx0aWYgKGxhYmVsICYmIHdpZHRoID4gMikge1xyXG5cdFx0XHRcdFx0Ly8gT25seSBhZGQgbGFiZWwgaWYgc3BhY2UgYWxsb3dzXHJcblx0XHRcdFx0XHRpZiAodGltZXNjYWxlID09PSBcIkRheVwiIHx8IHRpbWVzY2FsZSA9PT0gXCJXZWVrXCIpIHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgeWVhcldlZWsgPSBgJHtjdXJyZW50RGF0ZS5nZXRGdWxsWWVhcigpfS1XJHtkYXRlSGVscGVyLmdldFdlZWtOdW1iZXIoXHJcblx0XHRcdFx0XHRcdFx0Y3VycmVudERhdGVcclxuXHRcdFx0XHRcdFx0KX1gO1xyXG5cdFx0XHRcdFx0XHRpZiAoIXVuaXF1ZVdlZWtzW3llYXJXZWVrXSkge1xyXG5cdFx0XHRcdFx0XHRcdHVuaXF1ZVdlZWtzW3llYXJXZWVrXSA9IHsgeDogeCArIDUsIGxhYmVsOiBsYWJlbCB9O1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHRpbWVzY2FsZSA9PT0gXCJNb250aFwiKSB7XHJcblx0XHRcdFx0XHRcdC8vIFNob3cgZGF5IG51bWJlciBpbiBtb250aCB2aWV3IGlmIHNwYWNlXHJcblx0XHRcdFx0XHRcdGNvbnN0IGRheUxhYmVsID0gY3VycmVudERhdGUuZ2V0RGF0ZSgpLnRvU3RyaW5nKCk7XHJcblx0XHRcdFx0XHRcdGNvbnN0IHllYXJNb250aERheSA9IGAke2N1cnJlbnREYXRlLmdldEZ1bGxZZWFyKCl9LSR7Y3VycmVudERhdGUuZ2V0TW9udGgoKX0tJHtjdXJyZW50RGF0ZS5nZXREYXRlKCl9YDtcclxuXHRcdFx0XHRcdFx0aWYgKCF1bmlxdWVEYXlzW3llYXJNb250aERheV0pIHtcclxuXHRcdFx0XHRcdFx0XHR1bmlxdWVEYXlzW3llYXJNb250aERheV0gPSB7XHJcblx0XHRcdFx0XHRcdFx0XHR4OiB4ICsgd2lkdGggLyAyLFxyXG5cdFx0XHRcdFx0XHRcdFx0bGFiZWw6IGRheUxhYmVsLFxyXG5cdFx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIERheSBUaWNrcyAob25seSBpbiBEYXkgdmlldyBpZiBzcGFjZSBwZXJtaXRzKVxyXG5cdFx0XHRpZiAodGltZXNjYWxlID09PSBcIkRheVwiKSB7XHJcblx0XHRcdFx0aGVhZGVyR3JvdXAuY3JlYXRlU3ZnKFwibGluZVwiLCB7XHJcblx0XHRcdFx0XHRhdHRyOiB7XHJcblx0XHRcdFx0XHRcdHgxOiB4LFxyXG5cdFx0XHRcdFx0XHR5MTogaGVhZGVySGVpZ2h0ICogMC43LFxyXG5cdFx0XHRcdFx0XHR4MjogeCxcclxuXHRcdFx0XHRcdFx0eTI6IGhlYWRlckhlaWdodCxcclxuXHRcdFx0XHRcdFx0Y2xhc3M6IFwiZ2FudHQtaGVhZGVyLXRpY2stZGF5XCIsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGNvbnN0IGxhYmVsID0gZm9ybWF0RGF5VGljayhjdXJyZW50RGF0ZSk7XHJcblx0XHRcdFx0aWYgKGxhYmVsICYmIHdpZHRoID4gMikge1xyXG5cdFx0XHRcdFx0Y29uc3QgeWVhck1vbnRoRGF5ID0gYCR7Y3VycmVudERhdGUuZ2V0RnVsbFllYXIoKX0tJHtjdXJyZW50RGF0ZS5nZXRNb250aCgpfS0ke2N1cnJlbnREYXRlLmdldERhdGUoKX1gO1xyXG5cdFx0XHRcdFx0aWYgKCF1bmlxdWVEYXlzW3llYXJNb250aERheV0pIHtcclxuXHRcdFx0XHRcdFx0dW5pcXVlRGF5c1t5ZWFyTW9udGhEYXldID0ge1xyXG5cdFx0XHRcdFx0XHRcdHg6IHggKyB3aWR0aCAvIDIsXHJcblx0XHRcdFx0XHRcdFx0bGFiZWw6IGxhYmVsLFxyXG5cdFx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gU3RvcCBpdGVyYXRpbmcgaWYgd2UndmUgcGFzc2VkIHRoZSByZW5kZXIgZW5kIGRhdGVcclxuXHRcdFx0aWYgKGN1cnJlbnREYXRlID4gcmVuZGVyRW5kRGF0ZSkge1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjdXJyZW50RGF0ZSA9IG5leHREYXRlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlbmRlciBjb2xsZWN0ZWQgbGFiZWxzIHRvIGF2b2lkIG92ZXJsYXBzXHJcblx0XHRPYmplY3QudmFsdWVzKHVuaXF1ZU1vbnRocykuZm9yRWFjaCgoaXRlbSkgPT4ge1xyXG5cdFx0XHRoZWFkZXJHcm91cC5jcmVhdGVTdmcoXCJ0ZXh0XCIsIHtcclxuXHRcdFx0XHRhdHRyOiB7XHJcblx0XHRcdFx0XHR4OiBpdGVtLngsXHJcblx0XHRcdFx0XHR5OiBoZWFkZXJIZWlnaHQgKiAwLjM1LFxyXG5cdFx0XHRcdFx0Y2xhc3M6IFwiZ2FudHQtaGVhZGVyLWxhYmVsLW1ham9yXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSkudGV4dENvbnRlbnQgPSBpdGVtLmxhYmVsO1xyXG5cdFx0fSk7XHJcblx0XHRPYmplY3QudmFsdWVzKHVuaXF1ZVdlZWtzKS5mb3JFYWNoKChpdGVtKSA9PiB7XHJcblx0XHRcdGhlYWRlckdyb3VwLmNyZWF0ZVN2ZyhcInRleHRcIiwge1xyXG5cdFx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHRcdHg6IGl0ZW0ueCxcclxuXHRcdFx0XHRcdHk6IGhlYWRlckhlaWdodCAqIDAuNjUsXHJcblx0XHRcdFx0XHRjbGFzczogXCJnYW50dC1oZWFkZXItbGFiZWwtbWlub3JcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KS50ZXh0Q29udGVudCA9IGl0ZW0ubGFiZWw7XHJcblx0XHR9KTtcclxuXHRcdE9iamVjdC52YWx1ZXModW5pcXVlRGF5cykuZm9yRWFjaCgoaXRlbSkgPT4ge1xyXG5cdFx0XHRoZWFkZXJHcm91cC5jcmVhdGVTdmcoXCJ0ZXh0XCIsIHtcclxuXHRcdFx0XHRhdHRyOiB7XHJcblx0XHRcdFx0XHR4OiBpdGVtLngsXHJcblx0XHRcdFx0XHR5OiBoZWFkZXJIZWlnaHQgKiAwLjg1LFxyXG5cdFx0XHRcdFx0Y2xhc3M6IFwiZ2FudHQtaGVhZGVyLWxhYmVsLWRheVwiLFxyXG5cdFx0XHRcdFx0XCJ0ZXh0LWFuY2hvclwiOiBcIm1pZGRsZVwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pLnRleHRDb250ZW50ID0gaXRlbS5sYWJlbDtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIC0tLSBUb2RheSBNYXJrZXIgLS0tXHJcblx0XHRjb25zdCB0b2RheSA9IGRhdGVIZWxwZXIuc3RhcnRPZkRheShuZXcgRGF0ZSgpKTtcclxuXHRcdGlmICh0b2RheSA+PSBzdGFydERhdGUgJiYgdG9kYXkgPD0gZW5kRGF0ZSkge1xyXG5cdFx0XHRjb25zdCB0b2RheVggPSBkYXRlSGVscGVyLmRhdGVUb1goXHJcblx0XHRcdFx0dG9kYXksXHJcblx0XHRcdFx0c3RhcnREYXRlLFxyXG5cdFx0XHRcdHRoaXMucGFyYW1zLmRheVdpZHRoXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRoZWFkZXJHcm91cC5jcmVhdGVTdmcoXCJsaW5lXCIsIHtcclxuXHRcdFx0XHRhdHRyOiB7XHJcblx0XHRcdFx0XHR4MTogdG9kYXlYLFxyXG5cdFx0XHRcdFx0eTE6IDAsXHJcblx0XHRcdFx0XHR4MjogdG9kYXlYLFxyXG5cdFx0XHRcdFx0eTI6IGhlYWRlckhlaWdodCxcclxuXHRcdFx0XHRcdGNsYXNzOiBcImdhbnR0LWhlYWRlci10b2RheS1tYXJrZXJcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuIl19