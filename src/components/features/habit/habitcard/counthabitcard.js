import { ButtonComponent, Notice } from "obsidian";
import { HabitCard } from "./habitcard";
import { t } from "@/translations/helper";
import { getTodayLocalDateString } from "@/utils/date/date-formatter";
export class CountHabitCard extends HabitCard {
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
        var _a;
        super.render();
        const card = this.container.createDiv({
            cls: "habit-card count-habit-card",
        });
        const contentWrapper = card.createDiv({ cls: "card-content-wrapper" });
        const button = new ButtonComponent(contentWrapper)
            .setClass("habit-icon-button")
            .setIcon(this.habit.icon || "plus-circle")
            .onClick(() => {
            this.toggleHabitCompletion(this.habit.id);
            if (this.habit.max && countToday + 1 === this.habit.max) {
                new Notice(`${t("Goal reached")} ${this.habit.name}! ✅`);
            }
            else if (this.habit.max && countToday + 1 > this.habit.max) {
                new Notice(`${t("Exceeded goal")} ${this.habit.name}! 💪`);
            }
        });
        const today = getTodayLocalDateString();
        let countToday = (_a = this.habit.completions[today]) !== null && _a !== void 0 ? _a : 0;
        const infoDiv = contentWrapper.createDiv({ cls: "habit-info" }, (el) => {
            el.createEl("div", {
                cls: "habit-card-name",
                text: this.habit.name,
            });
            // For count habit, show today's numeric value instead of completed/inactive
            const unit = this.habit.countUnit
                ? ` ${this.habit.countUnit}`
                : "";
            el.createEl("span", {
                cls: "habit-active-day",
                text: `${t("Today")}: ${countToday}${unit}`,
            });
        });
        const progressArea = contentWrapper.createDiv({
            cls: "habit-progress-area",
        });
        const heatmapContainer = progressArea.createDiv({
            cls: "habit-heatmap-small",
        });
        // Always render heatmap for count habits; fill rule depends on max if provided
        this.renderHeatmap(heatmapContainer, this.habit.completions, "md", (value) => {
            if (typeof value !== "number")
                return false;
            if (this.habit.max && this.habit.max > 0) {
                return value >= this.habit.max;
            }
            return value > 0;
        });
        // Only render progress bar when a goal (max) is configured
        if (this.habit.max && this.habit.max > 0) {
            this.renderProgressBar(progressArea, countToday, this.habit.max);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY291bnRoYWJpdGNhcmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb3VudGhhYml0Y2FyZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsZUFBZSxFQUFhLE1BQU0sRUFBVyxNQUFNLFVBQVUsQ0FBQztBQUV2RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ3hDLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUUxQyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUV0RSxNQUFNLE9BQU8sY0FBZSxTQUFRLFNBQVM7SUFDNUMsWUFDUSxLQUFzQixFQUN0QixTQUFzQixFQUN0QixNQUE2QjtRQUVwQyxLQUFLLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUp6QixVQUFLLEdBQUwsS0FBSyxDQUFpQjtRQUN0QixjQUFTLEdBQVQsU0FBUyxDQUFhO1FBQ3RCLFdBQU0sR0FBTixNQUFNLENBQXVCO0lBR3JDLENBQUM7SUFFRCxNQUFNO1FBQ0wsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2YsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ2YsQ0FBQztJQUVELE1BQU07O1FBQ0wsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBRWYsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUM7WUFDckMsR0FBRyxFQUFFLDZCQUE2QjtTQUNsQyxDQUFDLENBQUM7UUFFSCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLHNCQUFzQixFQUFFLENBQUMsQ0FBQztRQUV2RSxNQUFNLE1BQU0sR0FBRyxJQUFJLGVBQWUsQ0FBQyxjQUFjLENBQUM7YUFDaEQsUUFBUSxDQUFDLG1CQUFtQixDQUFDO2FBQzdCLE9BQU8sQ0FBRSxJQUFJLENBQUMsS0FBSyxDQUFD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S0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ2pFO0lBQ0YsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQnV0dG9uQ29tcG9uZW50LCBDb21wb25lbnQsIE5vdGljZSwgc2V0SWNvbiB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBDb3VudEhhYml0UHJvcHMgfSBmcm9tIFwiQC90eXBlcy9oYWJpdC1jYXJkXCI7XHJcbmltcG9ydCB7IEhhYml0Q2FyZCB9IGZyb20gXCIuL2hhYml0Y2FyZFwiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7IGdldFRvZGF5TG9jYWxEYXRlU3RyaW5nIH0gZnJvbSBcIkAvdXRpbHMvZGF0ZS9kYXRlLWZvcm1hdHRlclwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIENvdW50SGFiaXRDYXJkIGV4dGVuZHMgSGFiaXRDYXJkIHtcclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHB1YmxpYyBoYWJpdDogQ291bnRIYWJpdFByb3BzLFxyXG5cdFx0cHVibGljIGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXHJcblx0XHRwdWJsaWMgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW5cclxuXHQpIHtcclxuXHRcdHN1cGVyKGhhYml0LCBjb250YWluZXIsIHBsdWdpbik7XHJcblx0fVxyXG5cclxuXHRvbmxvYWQoKTogdm9pZCB7XHJcblx0XHRzdXBlci5vbmxvYWQoKTtcclxuXHRcdHRoaXMucmVuZGVyKCk7XHJcblx0fVxyXG5cclxuXHRyZW5kZXIoKTogdm9pZCB7XHJcblx0XHRzdXBlci5yZW5kZXIoKTtcclxuXHJcblx0XHRjb25zdCBjYXJkID0gdGhpcy5jb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImhhYml0LWNhcmQgY291bnQtaGFiaXQtY2FyZFwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgY29udGVudFdyYXBwZXIgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJjYXJkLWNvbnRlbnQtd3JhcHBlclwiIH0pO1xyXG5cclxuXHRcdGNvbnN0IGJ1dHRvbiA9IG5ldyBCdXR0b25Db21wb25lbnQoY29udGVudFdyYXBwZXIpXHJcblx0XHRcdC5zZXRDbGFzcyhcImhhYml0LWljb24tYnV0dG9uXCIpXHJcblx0XHRcdC5zZXRJY29uKCh0aGlzLmhhYml0Lmljb24gYXMgc3RyaW5nKSB8fCBcInBsdXMtY2lyY2xlXCIpXHJcblx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHR0aGlzLnRvZ2dsZUhhYml0Q29tcGxldGlvbih0aGlzLmhhYml0LmlkKTtcclxuXHRcdFx0XHRpZiAodGhpcy5oYWJpdC5tYXggJiYgY291bnRUb2RheSArIDEgPT09IHRoaXMuaGFiaXQubWF4KSB7XHJcblx0XHRcdFx0XHRuZXcgTm90aWNlKGAke3QoXCJHb2FsIHJlYWNoZWRcIil9ICR7dGhpcy5oYWJpdC5uYW1lfSEg4pyFYCk7XHJcblx0XHRcdFx0fSBlbHNlIGlmICh0aGlzLmhhYml0Lm1heCAmJiBjb3VudFRvZGF5ICsgMSA+IHRoaXMuaGFiaXQubWF4KSB7XHJcblx0XHRcdFx0XHRuZXcgTm90aWNlKGAke3QoXCJFeGNlZWRlZCBnb2FsXCIpfSAke3RoaXMuaGFiaXQubmFtZX0hIPCfkqpgKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IHRvZGF5ID0gZ2V0VG9kYXlMb2NhbERhdGVTdHJpbmcoKTtcclxuXHRcdGxldCBjb3VudFRvZGF5ID0gdGhpcy5oYWJpdC5jb21wbGV0aW9uc1t0b2RheV0gPz8gMDtcclxuXHJcblx0XHRjb25zdCBpbmZvRGl2ID0gY29udGVudFdyYXBwZXIuY3JlYXRlRGl2KFxyXG5cdFx0XHR7IGNsczogXCJoYWJpdC1pbmZvXCIgfSxcclxuXHRcdFx0KGVsKSA9PiB7XHJcblx0XHRcdFx0ZWwuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHRcdFx0Y2xzOiBcImhhYml0LWNhcmQtbmFtZVwiLFxyXG5cdFx0XHRcdFx0dGV4dDogdGhpcy5oYWJpdC5uYW1lLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdC8vIEZvciBjb3VudCBoYWJpdCwgc2hvdyB0b2RheSdzIG51bWVyaWMgdmFsdWUgaW5zdGVhZCBvZiBjb21wbGV0ZWQvaW5hY3RpdmVcclxuXHRcdFx0XHRjb25zdCB1bml0ID0gdGhpcy5oYWJpdC5jb3VudFVuaXRcclxuXHRcdFx0XHRcdD8gYCAke3RoaXMuaGFiaXQuY291bnRVbml0fWBcclxuXHRcdFx0XHRcdDogXCJcIjtcclxuXHRcdFx0XHRlbC5jcmVhdGVFbChcInNwYW5cIiwge1xyXG5cdFx0XHRcdFx0Y2xzOiBcImhhYml0LWFjdGl2ZS1kYXlcIixcclxuXHRcdFx0XHRcdHRleHQ6IGAke3QoXCJUb2RheVwiKX06ICR7Y291bnRUb2RheX0ke3VuaXR9YCxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0KTtcclxuXHJcblx0XHRjb25zdCBwcm9ncmVzc0FyZWEgPSBjb250ZW50V3JhcHBlci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiaGFiaXQtcHJvZ3Jlc3MtYXJlYVwiLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCBoZWF0bWFwQ29udGFpbmVyID0gcHJvZ3Jlc3NBcmVhLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJoYWJpdC1oZWF0bWFwLXNtYWxsXCIsXHJcblx0XHR9KTtcclxuXHRcdC8vIEFsd2F5cyByZW5kZXIgaGVhdG1hcCBmb3IgY291bnQgaGFiaXRzOyBmaWxsIHJ1bGUgZGVwZW5kcyBvbiBtYXggaWYgcHJvdmlkZWRcclxuXHRcdHRoaXMucmVuZGVySGVhdG1hcChcclxuXHRcdFx0aGVhdG1hcENvbnRhaW5lcixcclxuXHRcdFx0dGhpcy5oYWJpdC5jb21wbGV0aW9ucyxcclxuXHRcdFx0XCJtZFwiLFxyXG5cdFx0XHQodmFsdWU6IGFueSkgPT4ge1xyXG5cdFx0XHRcdGlmICh0eXBlb2YgdmFsdWUgIT09IFwibnVtYmVyXCIpIHJldHVybiBmYWxzZTtcclxuXHRcdFx0XHRpZiAodGhpcy5oYWJpdC5tYXggJiYgdGhpcy5oYWJpdC5tYXggPiAwKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gdmFsdWUgPj0gdGhpcy5oYWJpdC5tYXg7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHJldHVybiB2YWx1ZSA+IDA7XHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblx0XHQvLyBPbmx5IHJlbmRlciBwcm9ncmVzcyBiYXIgd2hlbiBhIGdvYWwgKG1heCkgaXMgY29uZmlndXJlZFxyXG5cdFx0aWYgKHRoaXMuaGFiaXQubWF4ICYmIHRoaXMuaGFiaXQubWF4ID4gMCkge1xyXG5cdFx0XHR0aGlzLnJlbmRlclByb2dyZXNzQmFyKHByb2dyZXNzQXJlYSwgY291bnRUb2RheSwgdGhpcy5oYWJpdC5tYXgpO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG4iXX0=