import { ButtonComponent, Notice, setIcon, SliderComponent, } from "obsidian";
import { HabitCard } from "./habitcard";
import { getTodayLocalDateString } from "@/utils/date/date-formatter";
export class MappingHabitCard extends HabitCard {
    constructor(habit, container, plugin) {
        super(habit, container, plugin);
        this.habit = habit;
        this.container = container;
        this.plugin = plugin;
    }
    onload() {
        super.onload();
        this.render();
    }
    render() {
        var _a, _b;
        super.render();
        const card = this.container.createDiv({
            cls: "habit-card mapping-habit-card",
        });
        const header = card.createDiv({ cls: "card-header" });
        const titleDiv = header.createDiv({ cls: "card-title" });
        const iconEl = titleDiv.createSpan({ cls: "habit-icon" });
        setIcon(iconEl, this.habit.icon || "smile-plus"); // Better default icon
        titleDiv.createSpan({ text: this.habit.name, cls: "habit-name" });
        const contentWrapper = card.createDiv({ cls: "card-content-wrapper" });
        const heatmapContainer = contentWrapper.createDiv({
            cls: "habit-heatmap-medium",
        });
        this.renderHeatmap(heatmapContainer, this.habit.completions, "md", (value) => typeof value === "number" && value > 0, // Check if it's a positive number
        (value) => {
            var _a;
            // Custom renderer for emoji
            if (typeof value !== "number" || value <= 0)
                return null;
            const emoji = ((_a = this.habit.mapping) === null || _a === void 0 ? void 0 : _a[value]) || "?";
            const cellContent = createSpan({ text: emoji });
            // Add tooltip showing the mapped value label if available
            if (this.habit.mapping && this.habit.mapping[value]) {
                cellContent.setAttribute("aria-label", `${this.habit.mapping[value]}`);
                cellContent.addClass("has-tooltip");
            }
            else {
                cellContent.setAttribute("aria-label", `Value: ${value}`);
            }
            return cellContent;
        });
        const controlsDiv = contentWrapper.createDiv({ cls: "habit-controls" });
        const today = getTodayLocalDateString();
        const defaultValue = Object.keys(this.habit.mapping || {})
            .map(Number)
            .includes(3)
            ? 3
            : Object.keys(this.habit.mapping || {})
                .map(Number)
                .sort((a, b) => a - b)[0] || 1;
        let currentSelection = (_a = this.habit.completions[today]) !== null && _a !== void 0 ? _a : defaultValue;
        const mappingButton = new ButtonComponent(controlsDiv)
            .setButtonText(((_b = this.habit.mapping) === null || _b === void 0 ? void 0 : _b[currentSelection]) || "?")
            .setClass("habit-mapping-button")
            .onClick(() => {
            var _a;
            if (currentSelection > 0 &&
                ((_a = this.habit.mapping) === null || _a === void 0 ? void 0 : _a[currentSelection])) {
                // Ensure a valid selection is made
                this.toggleHabitCompletion(this.habit.id, currentSelection);
                const noticeText = this.habit.mapping &&
                    this.habit.mapping[currentSelection]
                    ? `Recorded ${this.habit.name} as ${this.habit.mapping[currentSelection]}`
                    : `Recorded ${this.habit.name} as ${this.habit.mapping[currentSelection]}`;
                new Notice(noticeText);
            }
            else {
                new Notice("Please select a valid value using the slider first.");
            }
        });
        // Slider using Obsidian Setting
        const slider = new SliderComponent(controlsDiv);
        const mappingKeys = Object.keys(this.habit.mapping || {})
            .map(Number)
            .sort((a, b) => a - b);
        const min = mappingKeys[0] || 1;
        const max = mappingKeys[mappingKeys.length - 1] || 5;
        slider
            .setLimits(min, max, 1)
            .setValue(currentSelection)
            .setDynamicTooltip()
            .onChange((value) => {
            var _a, _b;
            currentSelection = value;
            console.log((_a = this.habit.mapping) === null || _a === void 0 ? void 0 : _a[currentSelection]);
            mappingButton.buttonEl.setText(((_b = this.habit.mapping) === null || _b === void 0 ? void 0 : _b[currentSelection]) || "?");
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwcGluZ2hhYml0Y2FyZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1hcHBpbmdoYWJpdGNhcmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUNOLGVBQWUsRUFFZixNQUFNLEVBQ04sT0FBTyxFQUVQLGVBQWUsR0FDZixNQUFNLFVBQVUsQ0FBQztBQUVsQixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRXhDLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRXRFLE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxTQUFTO0lBQzlDLFlBQ1EsS0FBd0IsRUFDeEIsU0FBc0IsRUFDdEIsTUFBNkI7UUFFcEMsS0FBSyxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFKekIsVUFBSyxHQUFMLEtBQUssQ0FBbUI7UUFDeEIsY0FBUyxHQUFULFNBQVMsQ0FBYTtRQUN0QixXQUFNLEdBQU4sTUFBTSxDQUF1QjtJQUdyQyxDQUFDO0lBRUQsTUFBTTtRQUNMLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNmLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNmLENBQUM7SUFFRCxNQUFNOztRQUNMLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUVmLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDO1lBQ3JDLEdBQUcsRUFBRSwrQkFBK0I7U0FDcEMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQztRQUN6RCxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsR0FBRyxF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QyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDeEIsTUFBTSxHQUFHLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNoQyxNQUFNLEdBQUcsR0FBRyxXQUFXLENBQUMsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckQsTUFBTTthQUNKLFNBQVMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQzthQUN0QixRQUFRLENBQUMsZ0JBQWdCLENBQUM7YUFDMUIsaUJBQWlCLEVBQUU7YUFDbkIsUUFBUSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7O1lBQ25CLGdCQUFnQixHQUFHLEtBQUssQ0FBQztZQUV6QixPQUFPLENBQUMsR0FBRyxDQUFDLE1BQUEsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLDBDQUFHLGdCQUFnQixDQUFDLENBQUMsQ0FBQztZQUVwRCxhQUFhLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FDN0IsQ0FBQSxNQUFBLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTywwQ0FBRyxnQkFBZ0IsQ0FBQyxLQUFJLEdBQUcsQ0FDN0MsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcclxuXHRCdXR0b25Db21wb25lbnQsXHJcblx0Q29tcG9uZW50LFxyXG5cdE5vdGljZSxcclxuXHRzZXRJY29uLFxyXG5cdFNldHRpbmcsXHJcblx0U2xpZGVyQ29tcG9uZW50LFxyXG59IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBNYXBwaW5nSGFiaXRQcm9wcyB9IGZyb20gXCJAL3R5cGVzL2hhYml0LWNhcmRcIjtcclxuaW1wb3J0IHsgSGFiaXRDYXJkIH0gZnJvbSBcIi4vaGFiaXRjYXJkXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjtcclxuaW1wb3J0IHsgZ2V0VG9kYXlMb2NhbERhdGVTdHJpbmcgfSBmcm9tIFwiQC91dGlscy9kYXRlL2RhdGUtZm9ybWF0dGVyXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgTWFwcGluZ0hhYml0Q2FyZCBleHRlbmRzIEhhYml0Q2FyZCB7XHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwdWJsaWMgaGFiaXQ6IE1hcHBpbmdIYWJpdFByb3BzLFxyXG5cdFx0cHVibGljIGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXHJcblx0XHRwdWJsaWMgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW5cclxuXHQpIHtcclxuXHRcdHN1cGVyKGhhYml0LCBjb250YWluZXIsIHBsdWdpbik7XHJcblx0fVxyXG5cclxuXHRvbmxvYWQoKTogdm9pZCB7XHJcblx0XHRzdXBlci5vbmxvYWQoKTtcclxuXHRcdHRoaXMucmVuZGVyKCk7XHJcblx0fVxyXG5cclxuXHRyZW5kZXIoKTogdm9pZCB7XHJcblx0XHRzdXBlci5yZW5kZXIoKTtcclxuXHJcblx0XHRjb25zdCBjYXJkID0gdGhpcy5jb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImhhYml0LWNhcmQgbWFwcGluZy1oYWJpdC1jYXJkXCIsXHJcblx0XHR9KTtcclxuXHRcdGNvbnN0IGhlYWRlciA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcImNhcmQtaGVhZGVyXCIgfSk7XHJcblx0XHRjb25zdCB0aXRsZURpdiA9IGhlYWRlci5jcmVhdGVEaXYoeyBjbHM6IFwiY2FyZC10aXRsZVwiIH0pO1xyXG5cdFx0Y29uc3QgaWNvbkVsID0gdGl0bGVEaXYuY3JlYXRlU3Bhbih7IGNsczogXCJoYWJpdC1pY29uXCIgfSk7XHJcblx0XHRzZXRJY29uKGljb25FbCwgKHRoaXMuaGFiaXQuaWNvbiBhcyBzdHJpbmcpIHx8IFwic21pbGUtcGx1c1wiKTsgLy8gQmV0dGVyIGRlZmF1bHQgaWNvblxyXG5cdFx0dGl0bGVEaXYuY3JlYXRlU3Bhbih7IHRleHQ6IHRoaXMuaGFiaXQubmFtZSwgY2xzOiBcImhhYml0LW5hbWVcIiB9KTtcclxuXHJcblx0XHRjb25zdCBjb250ZW50V3JhcHBlciA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcImNhcmQtY29udGVudC13cmFwcGVyXCIgfSk7XHJcblxyXG5cdFx0Y29uc3QgaGVhdG1hcENvbnRhaW5lciA9IGNvbnRlbnRXcmFwcGVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJoYWJpdC1oZWF0bWFwLW1lZGl1bVwiLFxyXG5cdFx0fSk7XHJcblx0XHR0aGlzLnJlbmRlckhlYXRtYXAoXHJcblx0XHRcdGhlYXRtYXBDb250YWluZXIsXHJcblx0XHRcdHRoaXMuaGFiaXQuY29tcGxldGlvbnMsXHJcblx0XHRcdFwibWRcIixcclxuXHRcdFx0KHZhbHVlOiBhbnkpID0+IHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIiAmJiB2YWx1ZSA+IDAsIC8vIENoZWNrIGlmIGl0J3MgYSBwb3NpdGl2ZSBudW1iZXJcclxuXHRcdFx0KHZhbHVlOiBudW1iZXIpID0+IHtcclxuXHRcdFx0XHQvLyBDdXN0b20gcmVuZGVyZXIgZm9yIGVtb2ppXHJcblx0XHRcdFx0aWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJudW1iZXJcIiB8fCB2YWx1ZSA8PSAwKSByZXR1cm4gbnVsbDtcclxuXHRcdFx0XHRjb25zdCBlbW9qaSA9IHRoaXMuaGFiaXQubWFwcGluZz8uW3ZhbHVlXSB8fCBcIj9cIjtcclxuXHRcdFx0XHRjb25zdCBjZWxsQ29udGVudCA9IGNyZWF0ZVNwYW4oeyB0ZXh0OiBlbW9qaSB9KTtcclxuXHJcblx0XHRcdFx0Ly8gQWRkIHRvb2x0aXAgc2hvd2luZyB0aGUgbWFwcGVkIHZhbHVlIGxhYmVsIGlmIGF2YWlsYWJsZVxyXG5cdFx0XHRcdGlmICh0aGlzLmhhYml0Lm1hcHBpbmcgJiYgdGhpcy5oYWJpdC5tYXBwaW5nW3ZhbHVlXSkge1xyXG5cdFx0XHRcdFx0Y2VsbENvbnRlbnQuc2V0QXR0cmlidXRlKFxyXG5cdFx0XHRcdFx0XHRcImFyaWEtbGFiZWxcIixcclxuXHRcdFx0XHRcdFx0YCR7dGhpcy5oYWJpdC5tYXBwaW5nW3ZhbHVlXX1gXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0Y2VsbENvbnRlbnQuYWRkQ2xhc3MoXCJoYXMtdG9vbHRpcFwiKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0Y2VsbENvbnRlbnQuc2V0QXR0cmlidXRlKFwiYXJpYS1sYWJlbFwiLCBgVmFsdWU6ICR7dmFsdWV9YCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRyZXR1cm4gY2VsbENvbnRlbnQ7XHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblxyXG5cdFx0Y29uc3QgY29udHJvbHNEaXYgPSBjb250ZW50V3JhcHBlci5jcmVhdGVEaXYoeyBjbHM6IFwiaGFiaXQtY29udHJvbHNcIiB9KTtcclxuXHRcdGNvbnN0IHRvZGF5ID0gZ2V0VG9kYXlMb2NhbERhdGVTdHJpbmcoKTtcclxuXHRcdGNvbnN0IGRlZmF1bHRWYWx1ZSA9IE9iamVjdC5rZXlzKHRoaXMuaGFiaXQubWFwcGluZyB8fCB7fSlcclxuXHRcdFx0Lm1hcChOdW1iZXIpXHJcblx0XHRcdC5pbmNsdWRlcygzKVxyXG5cdFx0XHQ/IDNcclxuXHRcdFx0OiBPYmplY3Qua2V5cyh0aGlzLmhhYml0Lm1hcHBpbmcgfHwge30pXHJcblx0XHRcdFx0XHQubWFwKE51bWJlcilcclxuXHRcdFx0XHRcdC5zb3J0KChhLCBiKSA9PiBhIC0gYilbMF0gfHwgMTtcclxuXHRcdGxldCBjdXJyZW50U2VsZWN0aW9uID0gdGhpcy5oYWJpdC5jb21wbGV0aW9uc1t0b2RheV0gPz8gZGVmYXVsdFZhbHVlO1xyXG5cclxuXHRcdGNvbnN0IG1hcHBpbmdCdXR0b24gPSBuZXcgQnV0dG9uQ29tcG9uZW50KGNvbnRyb2xzRGl2KVxyXG5cdFx0XHQuc2V0QnV0dG9uVGV4dCh0aGlzLmhhYml0Lm1hcHBpbmc/LltjdXJyZW50U2VsZWN0aW9uXSB8fCBcIj9cIilcclxuXHRcdFx0LnNldENsYXNzKFwiaGFiaXQtbWFwcGluZy1idXR0b25cIilcclxuXHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdGN1cnJlbnRTZWxlY3Rpb24gPiAwICYmXHJcblx0XHRcdFx0XHR0aGlzLmhhYml0Lm1hcHBpbmc/LltjdXJyZW50U2VsZWN0aW9uXVxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0Ly8gRW5zdXJlIGEgdmFsaWQgc2VsZWN0aW9uIGlzIG1hZGVcclxuXHRcdFx0XHRcdHRoaXMudG9nZ2xlSGFiaXRDb21wbGV0aW9uKHRoaXMuaGFiaXQuaWQsIGN1cnJlbnRTZWxlY3Rpb24pO1xyXG5cclxuXHRcdFx0XHRcdGNvbnN0IG5vdGljZVRleHQgPVxyXG5cdFx0XHRcdFx0XHR0aGlzLmhhYml0Lm1hcHBpbmcgJiZcclxuXHRcdFx0XHRcdFx0dGhpcy5oYWJpdC5tYXBwaW5nW2N1cnJlbnRTZWxlY3Rpb25dXHJcblx0XHRcdFx0XHRcdFx0PyBgUmVjb3JkZWQgJHt0aGlzLmhhYml0Lm5hbWV9IGFzICR7dGhpcy5oYWJpdC5tYXBwaW5nW2N1cnJlbnRTZWxlY3Rpb25dfWBcclxuXHRcdFx0XHRcdFx0XHQ6IGBSZWNvcmRlZCAke3RoaXMuaGFiaXQubmFtZX0gYXMgJHt0aGlzLmhhYml0Lm1hcHBpbmdbY3VycmVudFNlbGVjdGlvbl19YDtcclxuXHJcblx0XHRcdFx0XHRuZXcgTm90aWNlKG5vdGljZVRleHQpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRuZXcgTm90aWNlKFxyXG5cdFx0XHRcdFx0XHRcIlBsZWFzZSBzZWxlY3QgYSB2YWxpZCB2YWx1ZSB1c2luZyB0aGUgc2xpZGVyIGZpcnN0LlwiXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gU2xpZGVyIHVzaW5nIE9ic2lkaWFuIFNldHRpbmdcclxuXHJcblx0XHRjb25zdCBzbGlkZXIgPSBuZXcgU2xpZGVyQ29tcG9uZW50KGNvbnRyb2xzRGl2KTtcclxuXHRcdGNvbnN0IG1hcHBpbmdLZXlzID0gT2JqZWN0LmtleXModGhpcy5oYWJpdC5tYXBwaW5nIHx8IHt9KVxyXG5cdFx0XHQubWFwKE51bWJlcilcclxuXHRcdFx0LnNvcnQoKGEsIGIpID0+IGEgLSBiKTtcclxuXHRcdGNvbnN0IG1pbiA9IG1hcHBpbmdLZXlzWzBdIHx8IDE7XHJcblx0XHRjb25zdCBtYXggPSBtYXBwaW5nS2V5c1ttYXBwaW5nS2V5cy5sZW5ndGggLSAxXSB8fCA1O1xyXG5cdFx0c2xpZGVyXHJcblx0XHRcdC5zZXRMaW1pdHMobWluLCBtYXgsIDEpXHJcblx0XHRcdC5zZXRWYWx1ZShjdXJyZW50U2VsZWN0aW9uKVxyXG5cdFx0XHQuc2V0RHluYW1pY1Rvb2x0aXAoKVxyXG5cdFx0XHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0Y3VycmVudFNlbGVjdGlvbiA9IHZhbHVlO1xyXG5cclxuXHRcdFx0XHRjb25zb2xlLmxvZyh0aGlzLmhhYml0Lm1hcHBpbmc/LltjdXJyZW50U2VsZWN0aW9uXSk7XHJcblxyXG5cdFx0XHRcdG1hcHBpbmdCdXR0b24uYnV0dG9uRWwuc2V0VGV4dChcclxuXHRcdFx0XHRcdHRoaXMuaGFiaXQubWFwcGluZz8uW2N1cnJlbnRTZWxlY3Rpb25dIHx8IFwiP1wiXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fSk7XHJcblx0fVxyXG59XHJcbiJdfQ==