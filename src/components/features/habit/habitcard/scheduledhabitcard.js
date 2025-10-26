import { DropdownComponent, Notice, setIcon, } from "obsidian";
import { HabitCard } from "./habitcard";
import { t } from "@/translations/helper";
import { EventDetailModal } from "../habit";
import { getTodayLocalDateString } from "@/utils/date/date-formatter";
function renderPieDotSVG(completed, total) {
    if (total <= 0)
        return "";
    const percentage = (completed / total) * 100;
    const radius = 8; // SVG viewbox units
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    // Simple SVG circle progress
    return `
        <svg viewBox="0 0 20 20" width="100%" height="100%">
            <circle cx="10" cy="10" r="${radius}" fill="transparent" stroke="var(--background-modifier-border)" stroke-width="3"></circle>
            <circle cx="10" cy="10" r="${radius}" fill="transparent"
                    stroke="var(--interactive-accent)"
                    stroke-width="3"
                    stroke-dasharray="${circumference}"
                    stroke-dashoffset="${offset}"
                    transform="rotate(-90 10 10)">
            </circle>
            ${completed > 0
        ? `<text x="10" y="10" text-anchor="middle" dy=".3em" font-size="8px" fill="var(--text-muted)">${completed}</text>`
        : ""}
        </svg>
    `;
}
export class ScheduledHabitCard extends HabitCard {
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
            cls: "habit-card scheduled-habit-card",
        });
        const header = card.createDiv({ cls: "card-header" });
        const titleDiv = header.createDiv({ cls: "card-title" });
        const iconEl = titleDiv.createSpan({ cls: "habit-icon" });
        setIcon(iconEl, this.habit.icon || "calendar-clock"); // Better default icon
        titleDiv
            .createSpan({ text: this.habit.name, cls: "habit-name" })
            .onClickEvent(() => {
            new Notice(`Chart for ${this.habit.name} (Not Implemented)`);
            // TODO: Implement Chart Dialog
        });
        const contentWrapper = card.createDiv({ cls: "card-content-wrapper" });
        const heatmapContainer = contentWrapper.createDiv({
            cls: "habit-heatmap-medium",
        });
        this.renderHeatmap(heatmapContainer, this.habit.completions, "md", (value) => value &&
            typeof value === "object" &&
            Object.keys(value).length > 0, // Check if it's an object with keys
        (value) => {
            // Custom cell renderer
            if (!value ||
                typeof value !== "object" ||
                Object.keys(value).length === 0)
                return null;
            const completedCount = Object.keys(value).length;
            // Ensure events array exists and has length
            const totalEvents = Array.isArray(this.habit.events)
                ? this.habit.events.length
                : 0;
            const pieDiv = createDiv({ cls: "pie-dot-container" });
            pieDiv.innerHTML = renderPieDotSVG(completedCount, totalEvents);
            // Add tooltip showing completed events for the day
            const tooltipText = Object.entries(value)
                .map(([name, detail]) => detail ? `${name}: ${detail}` : name)
                .join("\n");
            pieDiv.setAttribute("aria-label", tooltipText || "No events completed");
            return pieDiv;
        });
        const controlsDiv = contentWrapper.createDiv({ cls: "habit-controls" });
        const today = getTodayLocalDateString();
        // Ensure completions for today exists and is an object
        const todaysCompletions = typeof this.habit.completions[today] === "object" &&
            this.habit.completions[today] !== null
            ? this.habit.completions[today]
            : {};
        const completedEventsToday = Object.keys(todaysCompletions).length;
        const totalEvents = Array.isArray(this.habit.events)
            ? this.habit.events.length
            : 0;
        const allEventsDoneToday = totalEvents > 0 && completedEventsToday >= totalEvents;
        // Use Obsidian Setting for dropdown
        const eventDropdown = new DropdownComponent(controlsDiv)
            .addOption("", allEventsDoneToday ? t("All Done!") : t("Select event..."))
            .setValue("")
            .onChange((eventName) => {
            if (eventName) {
                // Open modal to get details
                new EventDetailModal(this.plugin.app, eventName, (details) => {
                    this.toggleHabitCompletion(this.habit.id, {
                        id: eventName,
                        details: details,
                    });
                }).open();
            }
            // Reset dropdown after selection or modal close
            eventDropdown.setValue("");
        })
            .setDisabled(allEventsDoneToday || totalEvents === 0);
        if (Array.isArray(this.habit.events)) {
            this.habit.events.forEach((event) => {
                // Ensure event name exists and is not already completed
                if ((event === null || event === void 0 ? void 0 : event.name) && !todaysCompletions[event.name]) {
                    eventDropdown.addOption(event.name, event.name);
                }
            });
        }
        eventDropdown.selectEl.toggleClass("habit-event-dropdown", true);
        this.renderProgressBar(controlsDiv, completedEventsToday, totalEvents);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZWR1bGVkaGFiaXRjYXJkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2NoZWR1bGVkaGFiaXRjYXJkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFFTixpQkFBaUIsRUFDakIsTUFBTSxFQUNOLE9BQU8sR0FFUCxNQUFNLFVBQVUsQ0FBQztBQUVsQixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRXhDLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUMxQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDNUMsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFdEUsU0FBUyxlQUFlLENBQUMsU0FBaUIsRUFBRSxLQUFhO0lBQ3hELElBQUksS0FBSyxJQUFJLENBQUM7UUFBRSxPQUFPLEVBQUUsQ0FBQztJQUMxQixNQUFNLFVBQVUsR0FBRyxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUMsR0FBRyxHQUFHLENBQUM7SUFDN0MsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsb0JBQW9CO0lBQ3RDLE1BQU0sYUFBYSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLE1BQU0sQ0FBQztJQUMzQyxNQUFNLE1BQU0sR0FBRyxhQUFhLEdBQUcsQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLEdBQUcsYUFBYSxDQUFDO0lBRWxFLDZCQUE2QjtJQUM3QixPQUFPOzt5Q0FFaUMsTUFBTTt5Q0FDTixNQUFNOzs7d0NBR1AsYUFBYTt5Q0FDWixNQUFNOzs7Y0FJM0MsU0FBUyxHQUFHLENBQUM7UUFDWixDQUFDLENBQUMsK0ZBQStGLFNBQVMsU0FBUztRQUNuSCxDQUFDLENBQUMsRUFDSjs7S0FFRSxDQUFDO0FBQ04sQ0FBQztBQUVELE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxTQUFTO0lBQ2hELFlBQ1EsS0FBMEIsRUFDMUIsU0FB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QUFLLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ2xELGFBQWEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ2hEO1lBQ0YsQ0FBQyxDQUFDLENBQUM7U0FDSDtRQUVELGFBQWEsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLHNCQUFzQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBRWpFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsb0JBQW9CLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDeEUsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcclxuXHRDb21wb25lbnQsXHJcblx0RHJvcGRvd25Db21wb25lbnQsXHJcblx0Tm90aWNlLFxyXG5cdHNldEljb24sXHJcblx0U2V0dGluZyxcclxufSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgU2NoZWR1bGVkSGFiaXRQcm9wcyB9IGZyb20gXCJAL3R5cGVzL2hhYml0LWNhcmRcIjtcclxuaW1wb3J0IHsgSGFiaXRDYXJkIH0gZnJvbSBcIi4vaGFiaXRjYXJkXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHsgRXZlbnREZXRhaWxNb2RhbCB9IGZyb20gXCIuLi9oYWJpdFwiO1xyXG5pbXBvcnQgeyBnZXRUb2RheUxvY2FsRGF0ZVN0cmluZyB9IGZyb20gXCJAL3V0aWxzL2RhdGUvZGF0ZS1mb3JtYXR0ZXJcIjtcclxuXHJcbmZ1bmN0aW9uIHJlbmRlclBpZURvdFNWRyhjb21wbGV0ZWQ6IG51bWJlciwgdG90YWw6IG51bWJlcik6IHN0cmluZyB7XHJcblx0aWYgKHRvdGFsIDw9IDApIHJldHVybiBcIlwiO1xyXG5cdGNvbnN0IHBlcmNlbnRhZ2UgPSAoY29tcGxldGVkIC8gdG90YWwpICogMTAwO1xyXG5cdGNvbnN0IHJhZGl1cyA9IDg7IC8vIFNWRyB2aWV3Ym94IHVuaXRzXHJcblx0Y29uc3QgY2lyY3VtZmVyZW5jZSA9IDIgKiBNYXRoLlBJICogcmFkaXVzO1xyXG5cdGNvbnN0IG9mZnNldCA9IGNpcmN1bWZlcmVuY2UgLSAocGVyY2VudGFnZSAvIDEwMCkgKiBjaXJjdW1mZXJlbmNlO1xyXG5cclxuXHQvLyBTaW1wbGUgU1ZHIGNpcmNsZSBwcm9ncmVzc1xyXG5cdHJldHVybiBgXHJcbiAgICAgICAgPHN2ZyB2aWV3Qm94PVwiMCAwIDIwIDIwXCIgd2lkdGg9XCIxMDAlXCIgaGVpZ2h0PVwiMTAwJVwiPlxyXG4gICAgICAgICAgICA8Y2lyY2xlIGN4PVwiMTBcIiBjeT1cIjEwXCIgcj1cIiR7cmFkaXVzfVwiIGZpbGw9XCJ0cmFuc3BhcmVudFwiIHN0cm9rZT1cInZhcigtLWJhY2tncm91bmQtbW9kaWZpZXItYm9yZGVyKVwiIHN0cm9rZS13aWR0aD1cIjNcIj48L2NpcmNsZT5cclxuICAgICAgICAgICAgPGNpcmNsZSBjeD1cIjEwXCIgY3k9XCIxMFwiIHI9XCIke3JhZGl1c31cIiBmaWxsPVwidHJhbnNwYXJlbnRcIlxyXG4gICAgICAgICAgICAgICAgICAgIHN0cm9rZT1cInZhcigtLWludGVyYWN0aXZlLWFjY2VudClcIlxyXG4gICAgICAgICAgICAgICAgICAgIHN0cm9rZS13aWR0aD1cIjNcIlxyXG4gICAgICAgICAgICAgICAgICAgIHN0cm9rZS1kYXNoYXJyYXk9XCIke2NpcmN1bWZlcmVuY2V9XCJcclxuICAgICAgICAgICAgICAgICAgICBzdHJva2UtZGFzaG9mZnNldD1cIiR7b2Zmc2V0fVwiXHJcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtPVwicm90YXRlKC05MCAxMCAxMClcIj5cclxuICAgICAgICAgICAgPC9jaXJjbGU+XHJcbiAgICAgICAgICAgICR7XHJcblx0XHRcdFx0Y29tcGxldGVkID4gMFxyXG5cdFx0XHRcdFx0PyBgPHRleHQgeD1cIjEwXCIgeT1cIjEwXCIgdGV4dC1hbmNob3I9XCJtaWRkbGVcIiBkeT1cIi4zZW1cIiBmb250LXNpemU9XCI4cHhcIiBmaWxsPVwidmFyKC0tdGV4dC1tdXRlZClcIj4ke2NvbXBsZXRlZH08L3RleHQ+YFxyXG5cdFx0XHRcdFx0OiBcIlwiXHJcblx0XHRcdH1cclxuICAgICAgICA8L3N2Zz5cclxuICAgIGA7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBTY2hlZHVsZWRIYWJpdENhcmQgZXh0ZW5kcyBIYWJpdENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cHVibGljIGhhYml0OiBTY2hlZHVsZWRIYWJpdFByb3BzLFxyXG5cdFx0cHVibGljIGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXHJcblx0XHRwdWJsaWMgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW5cclxuXHQpIHtcclxuXHRcdHN1cGVyKGhhYml0LCBjb250YWluZXIsIHBsdWdpbik7XHJcblx0fVxyXG5cclxuXHRvbmxvYWQoKTogdm9pZCB7XHJcblx0XHRzdXBlci5vbmxvYWQoKTtcclxuXHRcdHRoaXMucmVuZGVyKCk7XHJcblx0fVxyXG5cclxuXHRyZW5kZXIoKTogdm9pZCB7XHJcblx0XHRzdXBlci5yZW5kZXIoKTtcclxuXHJcblx0XHRjb25zdCBjYXJkID0gdGhpcy5jb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImhhYml0LWNhcmQgc2NoZWR1bGVkLWhhYml0LWNhcmRcIixcclxuXHRcdH0pO1xyXG5cdFx0Y29uc3QgaGVhZGVyID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwiY2FyZC1oZWFkZXJcIiB9KTtcclxuXHRcdGNvbnN0IHRpdGxlRGl2ID0gaGVhZGVyLmNyZWF0ZURpdih7IGNsczogXCJjYXJkLXRpdGxlXCIgfSk7XHJcblx0XHRjb25zdCBpY29uRWwgPSB0aXRsZURpdi5jcmVhdGVTcGFuKHsgY2xzOiBcImhhYml0LWljb25cIiB9KTtcclxuXHRcdHNldEljb24oaWNvbkVsLCAodGhpcy5oYWJpdC5pY29uIGFzIHN0cmluZykgfHwgXCJjYWxlbmRhci1jbG9ja1wiKTsgLy8gQmV0dGVyIGRlZmF1bHQgaWNvblxyXG5cdFx0dGl0bGVEaXZcclxuXHRcdFx0LmNyZWF0ZVNwYW4oeyB0ZXh0OiB0aGlzLmhhYml0Lm5hbWUsIGNsczogXCJoYWJpdC1uYW1lXCIgfSlcclxuXHRcdFx0Lm9uQ2xpY2tFdmVudCgoKSA9PiB7XHJcblx0XHRcdFx0bmV3IE5vdGljZShgQ2hhcnQgZm9yICR7dGhpcy5oYWJpdC5uYW1lfSAoTm90IEltcGxlbWVudGVkKWApO1xyXG5cdFx0XHRcdC8vIFRPRE86IEltcGxlbWVudCBDaGFydCBEaWFsb2dcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgY29udGVudFdyYXBwZXIgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJjYXJkLWNvbnRlbnQtd3JhcHBlclwiIH0pO1xyXG5cclxuXHRcdGNvbnN0IGhlYXRtYXBDb250YWluZXIgPSBjb250ZW50V3JhcHBlci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiaGFiaXQtaGVhdG1hcC1tZWRpdW1cIixcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy5yZW5kZXJIZWF0bWFwKFxyXG5cdFx0XHRoZWF0bWFwQ29udGFpbmVyLFxyXG5cdFx0XHR0aGlzLmhhYml0LmNvbXBsZXRpb25zLFxyXG5cdFx0XHRcIm1kXCIsXHJcblx0XHRcdCh2YWx1ZTogYW55KSA9PlxyXG5cdFx0XHRcdHZhbHVlICYmXHJcblx0XHRcdFx0dHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiICYmXHJcblx0XHRcdFx0T2JqZWN0LmtleXModmFsdWUpLmxlbmd0aCA+IDAsIC8vIENoZWNrIGlmIGl0J3MgYW4gb2JqZWN0IHdpdGgga2V5c1xyXG5cdFx0XHQodmFsdWU6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4pID0+IHtcclxuXHRcdFx0XHQvLyBDdXN0b20gY2VsbCByZW5kZXJlclxyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdCF2YWx1ZSB8fFxyXG5cdFx0XHRcdFx0dHlwZW9mIHZhbHVlICE9PSBcIm9iamVjdFwiIHx8XHJcblx0XHRcdFx0XHRPYmplY3Qua2V5cyh2YWx1ZSkubGVuZ3RoID09PSAwXHJcblx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHRcdFx0Y29uc3QgY29tcGxldGVkQ291bnQgPSBPYmplY3Qua2V5cyh2YWx1ZSkubGVuZ3RoO1xyXG5cdFx0XHRcdC8vIEVuc3VyZSBldmVudHMgYXJyYXkgZXhpc3RzIGFuZCBoYXMgbGVuZ3RoXHJcblx0XHRcdFx0Y29uc3QgdG90YWxFdmVudHMgPSBBcnJheS5pc0FycmF5KHRoaXMuaGFiaXQuZXZlbnRzKVxyXG5cdFx0XHRcdFx0PyB0aGlzLmhhYml0LmV2ZW50cy5sZW5ndGhcclxuXHRcdFx0XHRcdDogMDtcclxuXHRcdFx0XHRjb25zdCBwaWVEaXYgPSBjcmVhdGVEaXYoeyBjbHM6IFwicGllLWRvdC1jb250YWluZXJcIiB9KTtcclxuXHRcdFx0XHRwaWVEaXYuaW5uZXJIVE1MID0gcmVuZGVyUGllRG90U1ZHKGNvbXBsZXRlZENvdW50LCB0b3RhbEV2ZW50cyk7XHJcblx0XHRcdFx0Ly8gQWRkIHRvb2x0aXAgc2hvd2luZyBjb21wbGV0ZWQgZXZlbnRzIGZvciB0aGUgZGF5XHJcblx0XHRcdFx0Y29uc3QgdG9vbHRpcFRleHQgPSBPYmplY3QuZW50cmllcyh2YWx1ZSlcclxuXHRcdFx0XHRcdC5tYXAoKFtuYW1lLCBkZXRhaWxdKSA9PlxyXG5cdFx0XHRcdFx0XHRkZXRhaWwgPyBgJHtuYW1lfTogJHtkZXRhaWx9YCA6IG5hbWVcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdC5qb2luKFwiXFxuXCIpO1xyXG5cdFx0XHRcdHBpZURpdi5zZXRBdHRyaWJ1dGUoXHJcblx0XHRcdFx0XHRcImFyaWEtbGFiZWxcIixcclxuXHRcdFx0XHRcdHRvb2x0aXBUZXh0IHx8IFwiTm8gZXZlbnRzIGNvbXBsZXRlZFwiXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRyZXR1cm4gcGllRGl2O1xyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cclxuXHRcdGNvbnN0IGNvbnRyb2xzRGl2ID0gY29udGVudFdyYXBwZXIuY3JlYXRlRGl2KHsgY2xzOiBcImhhYml0LWNvbnRyb2xzXCIgfSk7XHJcblx0XHRjb25zdCB0b2RheSA9IGdldFRvZGF5TG9jYWxEYXRlU3RyaW5nKCk7XHJcblx0XHQvLyBFbnN1cmUgY29tcGxldGlvbnMgZm9yIHRvZGF5IGV4aXN0cyBhbmQgaXMgYW4gb2JqZWN0XHJcblx0XHRjb25zdCB0b2RheXNDb21wbGV0aW9uczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9XHJcblx0XHRcdHR5cGVvZiB0aGlzLmhhYml0LmNvbXBsZXRpb25zW3RvZGF5XSA9PT0gXCJvYmplY3RcIiAmJlxyXG5cdFx0XHR0aGlzLmhhYml0LmNvbXBsZXRpb25zW3RvZGF5XSAhPT0gbnVsbFxyXG5cdFx0XHRcdD8gdGhpcy5oYWJpdC5jb21wbGV0aW9uc1t0b2RheV1cclxuXHRcdFx0XHQ6IHt9O1xyXG5cdFx0Y29uc3QgY29tcGxldGVkRXZlbnRzVG9kYXkgPSBPYmplY3Qua2V5cyh0b2RheXNDb21wbGV0aW9ucykubGVuZ3RoO1xyXG5cdFx0Y29uc3QgdG90YWxFdmVudHMgPSBBcnJheS5pc0FycmF5KHRoaXMuaGFiaXQuZXZlbnRzKVxyXG5cdFx0XHQ/IHRoaXMuaGFiaXQuZXZlbnRzLmxlbmd0aFxyXG5cdFx0XHQ6IDA7XHJcblx0XHRjb25zdCBhbGxFdmVudHNEb25lVG9kYXkgPVxyXG5cdFx0XHR0b3RhbEV2ZW50cyA+IDAgJiYgY29tcGxldGVkRXZlbnRzVG9kYXkgPj0gdG90YWxFdmVudHM7XHJcblxyXG5cdFx0Ly8gVXNlIE9ic2lkaWFuIFNldHRpbmcgZm9yIGRyb3Bkb3duXHJcblx0XHRjb25zdCBldmVudERyb3Bkb3duID0gbmV3IERyb3Bkb3duQ29tcG9uZW50KGNvbnRyb2xzRGl2KVxyXG5cdFx0XHQuYWRkT3B0aW9uKFxyXG5cdFx0XHRcdFwiXCIsXHJcblx0XHRcdFx0YWxsRXZlbnRzRG9uZVRvZGF5ID8gdChcIkFsbCBEb25lIVwiKSA6IHQoXCJTZWxlY3QgZXZlbnQuLi5cIilcclxuXHRcdFx0KVxyXG5cdFx0XHQuc2V0VmFsdWUoXCJcIilcclxuXHRcdFx0Lm9uQ2hhbmdlKChldmVudE5hbWUpID0+IHtcclxuXHRcdFx0XHRpZiAoZXZlbnROYW1lKSB7XHJcblx0XHRcdFx0XHQvLyBPcGVuIG1vZGFsIHRvIGdldCBkZXRhaWxzXHJcblx0XHRcdFx0XHRuZXcgRXZlbnREZXRhaWxNb2RhbChcclxuXHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uYXBwLFxyXG5cdFx0XHRcdFx0XHRldmVudE5hbWUsXHJcblx0XHRcdFx0XHRcdChkZXRhaWxzOiBzdHJpbmcpID0+IHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnRvZ2dsZUhhYml0Q29tcGxldGlvbih0aGlzLmhhYml0LmlkLCB7XHJcblx0XHRcdFx0XHRcdFx0XHRpZDogZXZlbnROYW1lLFxyXG5cdFx0XHRcdFx0XHRcdFx0ZGV0YWlsczogZGV0YWlscyxcclxuXHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0KS5vcGVuKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIFJlc2V0IGRyb3Bkb3duIGFmdGVyIHNlbGVjdGlvbiBvciBtb2RhbCBjbG9zZVxyXG5cdFx0XHRcdGV2ZW50RHJvcGRvd24uc2V0VmFsdWUoXCJcIik7XHJcblx0XHRcdH0pXHJcblx0XHRcdC5zZXREaXNhYmxlZChhbGxFdmVudHNEb25lVG9kYXkgfHwgdG90YWxFdmVudHMgPT09IDApO1xyXG5cdFx0aWYgKEFycmF5LmlzQXJyYXkodGhpcy5oYWJpdC5ldmVudHMpKSB7XHJcblx0XHRcdHRoaXMuaGFiaXQuZXZlbnRzLmZvckVhY2goKGV2ZW50KSA9PiB7XHJcblx0XHRcdFx0Ly8gRW5zdXJlIGV2ZW50IG5hbWUgZXhpc3RzIGFuZCBpcyBub3QgYWxyZWFkeSBjb21wbGV0ZWRcclxuXHRcdFx0XHRpZiAoZXZlbnQ/Lm5hbWUgJiYgIXRvZGF5c0NvbXBsZXRpb25zW2V2ZW50Lm5hbWVdKSB7XHJcblx0XHRcdFx0XHRldmVudERyb3Bkb3duLmFkZE9wdGlvbihldmVudC5uYW1lLCBldmVudC5uYW1lKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdGV2ZW50RHJvcGRvd24uc2VsZWN0RWwudG9nZ2xlQ2xhc3MoXCJoYWJpdC1ldmVudC1kcm9wZG93blwiLCB0cnVlKTtcclxuXHJcblx0XHR0aGlzLnJlbmRlclByb2dyZXNzQmFyKGNvbnRyb2xzRGl2LCBjb21wbGV0ZWRFdmVudHNUb2RheSwgdG90YWxFdmVudHMpO1xyXG5cdH1cclxufVxyXG4iXX0=