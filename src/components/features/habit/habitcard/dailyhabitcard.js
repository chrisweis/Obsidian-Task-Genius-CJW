import { Notice, setIcon } from "obsidian";
import { HabitCard } from "./habitcard";
import { t } from "@/translations/helper";
import { getTodayLocalDateString } from "@/utils/date/date-formatter";
import { HabitChartModal } from "@/components/features/habit/modals/HabitChartModal";
export class DailyHabitCard extends HabitCard {
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
        super.render();
        const card = this.container.createDiv({
            cls: "habit-card daily-habit-card",
        });
        const header = card.createDiv({ cls: "card-header" });
        const titleDiv = header.createDiv({ cls: "card-title" });
        const iconEl = titleDiv.createSpan({ cls: "habit-icon" });
        setIcon(iconEl, this.habit.icon || "dice"); // Use default icon 'dice' if none provided
        // Add completion text indicator if defined
        const titleText = this.habit.completionText
            ? `${this.habit.name} (${this.habit.completionText})`
            : this.habit.name;
        titleDiv
            .createSpan({ text: titleText, cls: "habit-name" })
            .onClickEvent(() => {
            new HabitChartModal(this.plugin.app, this, this.habit).open();
        });
        const checkboxContainer = header.createDiv({
            cls: "habit-checkbox-container",
        });
        const checkbox = checkboxContainer.createEl("input", {
            type: "checkbox",
            cls: "habit-checkbox",
        });
        const today = getTodayLocalDateString();
        // Check if completed based on completion text or any value
        let isCompletedToday = false;
        const todayValue = this.habit.completions[today];
        if (this.habit.completionText) {
            // If completionText is defined, check if value is 1 (meaning it matched completionText)
            isCompletedToday = todayValue === 1;
        }
        else {
            // Default behavior: check for boolean true
            isCompletedToday = todayValue === true;
        }
        checkbox.checked = isCompletedToday;
        this.registerDomEvent(checkbox, "click", (e) => {
            e.preventDefault(); // Prevent default toggle, handle manually
            this.toggleHabitCompletion(this.habit.id);
            if (!isCompletedToday) {
                // Optional: trigger confetti only on completion
                new Notice(`${t("Completed")} ${this.habit.name}! 🎉`);
            }
        });
        const contentWrapper = card.createDiv({ cls: "card-content-wrapper" });
        this.renderHeatmap(contentWrapper, this.habit.completions, "lg", (value) => {
            // If completionText is defined, check if value is 1 (meaning it matched completionText)
            if (this.habit.completionText) {
                return value === 1;
            }
            // Default behavior: check for boolean true
            return value === true;
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGFpbHloYWJpdGNhcmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkYWlseWhhYml0Y2FyZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQWEsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUV0RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ3hDLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUUxQyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUV0RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFFckYsTUFBTSxPQUFPLGNBQWUsU0FBUSxTQUFTO0lBQzVDLFlBQ1EsS0FBc0IsRUFDdEIsU0FBc0IsRUFDdEIsTUFBNkI7UUFFcEMsS0FBSyxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFKekIsVUFBSyxHQUFMLEtBQUssQ0FBaUI7UUFDdEIsY0FBUyxHQUFULFNBQVMsQ0FBYTtRQUN0QixXQUFNLEdBQU4sTUFBTSxDQUF1QjtJQUdyQyxDQUFDO0lBRUQsTUFBTTtRQUNMLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNmLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNmLENBQUM7SUFFRCxNQUFNO1FBQ0wsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBRWYsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUM7WUFDckMsR0FBRyxFQUFFLDZCQUE2QjtTQUNsQyxDQUFDLENBQUM7UUFDSCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUM7UUFFdEQsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxZQUFZLEVBQUUsQ0FB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ZXNDb250ZW50IjpbImltcG9ydCB7IENvbXBvbmVudCwgTm90aWNlLCBzZXRJY29uIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IERhaWx5SGFiaXRQcm9wcyB9IGZyb20gXCJAL3R5cGVzL2hhYml0LWNhcmRcIjtcclxuaW1wb3J0IHsgSGFiaXRDYXJkIH0gZnJvbSBcIi4vaGFiaXRjYXJkXCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjtcclxuaW1wb3J0IHsgZ2V0VG9kYXlMb2NhbERhdGVTdHJpbmcgfSBmcm9tIFwiQC91dGlscy9kYXRlL2RhdGUtZm9ybWF0dGVyXCI7XHJcblxyXG5pbXBvcnQgeyBIYWJpdENoYXJ0TW9kYWwgfSBmcm9tIFwiQC9jb21wb25lbnRzL2ZlYXR1cmVzL2hhYml0L21vZGFscy9IYWJpdENoYXJ0TW9kYWxcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBEYWlseUhhYml0Q2FyZCBleHRlbmRzIEhhYml0Q2FyZCB7XHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwdWJsaWMgaGFiaXQ6IERhaWx5SGFiaXRQcm9wcyxcclxuXHRcdHB1YmxpYyBjb250YWluZXI6IEhUTUxFbGVtZW50LFxyXG5cdFx0cHVibGljIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luXHJcblx0KSB7XHJcblx0XHRzdXBlcihoYWJpdCwgY29udGFpbmVyLCBwbHVnaW4pO1xyXG5cdH1cclxuXHJcblx0b25sb2FkKCk6IHZvaWQge1xyXG5cdFx0c3VwZXIub25sb2FkKCk7XHJcblx0XHR0aGlzLnJlbmRlcigpO1xyXG5cdH1cclxuXHJcblx0cmVuZGVyKCk6IHZvaWQge1xyXG5cdFx0c3VwZXIucmVuZGVyKCk7XHJcblxyXG5cdFx0Y29uc3QgY2FyZCA9IHRoaXMuY29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJoYWJpdC1jYXJkIGRhaWx5LWhhYml0LWNhcmRcIixcclxuXHRcdH0pO1xyXG5cdFx0Y29uc3QgaGVhZGVyID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwiY2FyZC1oZWFkZXJcIiB9KTtcclxuXHJcblx0XHRjb25zdCB0aXRsZURpdiA9IGhlYWRlci5jcmVhdGVEaXYoeyBjbHM6IFwiY2FyZC10aXRsZVwiIH0pO1xyXG5cdFx0Y29uc3QgaWNvbkVsID0gdGl0bGVEaXYuY3JlYXRlU3Bhbih7IGNsczogXCJoYWJpdC1pY29uXCIgfSk7XHJcblx0XHRzZXRJY29uKGljb25FbCwgKHRoaXMuaGFiaXQuaWNvbiBhcyBzdHJpbmcpIHx8IFwiZGljZVwiKTsgLy8gVXNlIGRlZmF1bHQgaWNvbiAnZGljZScgaWYgbm9uZSBwcm92aWRlZFxyXG5cclxuXHRcdC8vIEFkZCBjb21wbGV0aW9uIHRleHQgaW5kaWNhdG9yIGlmIGRlZmluZWRcclxuXHRcdGNvbnN0IHRpdGxlVGV4dCA9IHRoaXMuaGFiaXQuY29tcGxldGlvblRleHRcclxuXHRcdFx0PyBgJHt0aGlzLmhhYml0Lm5hbWV9ICgke3RoaXMuaGFiaXQuY29tcGxldGlvblRleHR9KWBcclxuXHRcdFx0OiB0aGlzLmhhYml0Lm5hbWU7XHJcblxyXG5cdFx0dGl0bGVEaXZcclxuXHRcdFx0LmNyZWF0ZVNwYW4oeyB0ZXh0OiB0aXRsZVRleHQsIGNsczogXCJoYWJpdC1uYW1lXCIgfSlcclxuXHRcdFx0Lm9uQ2xpY2tFdmVudCgoKSA9PiB7XHJcblx0XHRcdFx0bmV3IEhhYml0Q2hhcnRNb2RhbCh0aGlzLnBsdWdpbi5hcHAsIHRoaXMsIHRoaXMuaGFiaXQpLm9wZW4oKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgY2hlY2tib3hDb250YWluZXIgPSBoZWFkZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImhhYml0LWNoZWNrYm94LWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCBjaGVja2JveCA9IGNoZWNrYm94Q29udGFpbmVyLmNyZWF0ZUVsKFwiaW5wdXRcIiwge1xyXG5cdFx0XHR0eXBlOiBcImNoZWNrYm94XCIsXHJcblx0XHRcdGNsczogXCJoYWJpdC1jaGVja2JveFwiLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCB0b2RheSA9IGdldFRvZGF5TG9jYWxEYXRlU3RyaW5nKCk7XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgY29tcGxldGVkIGJhc2VkIG9uIGNvbXBsZXRpb24gdGV4dCBvciBhbnkgdmFsdWVcclxuXHRcdGxldCBpc0NvbXBsZXRlZFRvZGF5ID0gZmFsc2U7XHJcblx0XHRjb25zdCB0b2RheVZhbHVlID0gdGhpcy5oYWJpdC5jb21wbGV0aW9uc1t0b2RheV07XHJcblxyXG5cdFx0aWYgKHRoaXMuaGFiaXQuY29tcGxldGlvblRleHQpIHtcclxuXHRcdFx0Ly8gSWYgY29tcGxldGlvblRleHQgaXMgZGVmaW5lZCwgY2hlY2sgaWYgdmFsdWUgaXMgMSAobWVhbmluZyBpdCBtYXRjaGVkIGNvbXBsZXRpb25UZXh0KVxyXG5cdFx0XHRpc0NvbXBsZXRlZFRvZGF5ID0gdG9kYXlWYWx1ZSA9PT0gMTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIERlZmF1bHQgYmVoYXZpb3I6IGNoZWNrIGZvciBib29sZWFuIHRydWVcclxuXHRcdFx0aXNDb21wbGV0ZWRUb2RheSA9IHRvZGF5VmFsdWUgPT09IHRydWU7XHJcblx0XHR9XHJcblxyXG5cdFx0Y2hlY2tib3guY2hlY2tlZCA9IGlzQ29tcGxldGVkVG9kYXk7XHJcblxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGNoZWNrYm94LCBcImNsaWNrXCIsIChlKSA9PiB7XHJcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTsgLy8gUHJldmVudCBkZWZhdWx0IHRvZ2dsZSwgaGFuZGxlIG1hbnVhbGx5XHJcblx0XHRcdHRoaXMudG9nZ2xlSGFiaXRDb21wbGV0aW9uKHRoaXMuaGFiaXQuaWQpO1xyXG5cdFx0XHRpZiAoIWlzQ29tcGxldGVkVG9kYXkpIHtcclxuXHRcdFx0XHQvLyBPcHRpb25hbDogdHJpZ2dlciBjb25mZXR0aSBvbmx5IG9uIGNvbXBsZXRpb25cclxuXHRcdFx0XHRuZXcgTm90aWNlKGAke3QoXCJDb21wbGV0ZWRcIil9ICR7dGhpcy5oYWJpdC5uYW1lfSEg8J+OiWApO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCBjb250ZW50V3JhcHBlciA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcImNhcmQtY29udGVudC13cmFwcGVyXCIgfSk7XHJcblx0XHR0aGlzLnJlbmRlckhlYXRtYXAoXHJcblx0XHRcdGNvbnRlbnRXcmFwcGVyLFxyXG5cdFx0XHR0aGlzLmhhYml0LmNvbXBsZXRpb25zLFxyXG5cdFx0XHRcImxnXCIsXHJcblx0XHRcdCh2YWx1ZTogYW55KSA9PiB7XHJcblx0XHRcdFx0Ly8gSWYgY29tcGxldGlvblRleHQgaXMgZGVmaW5lZCwgY2hlY2sgaWYgdmFsdWUgaXMgMSAobWVhbmluZyBpdCBtYXRjaGVkIGNvbXBsZXRpb25UZXh0KVxyXG5cdFx0XHRcdGlmICh0aGlzLmhhYml0LmNvbXBsZXRpb25UZXh0KSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gdmFsdWUgPT09IDE7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIERlZmF1bHQgYmVoYXZpb3I6IGNoZWNrIGZvciBib29sZWFuIHRydWVcclxuXHRcdFx0XHRyZXR1cm4gdmFsdWUgPT09IHRydWU7XHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblx0fVxyXG59XHJcbiJdfQ==