import { Component } from "obsidian";
import { getTodayLocalDateString, getLocalDateString, } from "@/utils/date/date-formatter";
function getDatesInRange(startDate, endDate) {
    const dates = [];
    let currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);
    while (currentDate <= endDateObj) {
        dates.push(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
}
export class HabitCard extends Component {
    constructor(habit, container, plugin) {
        super();
        this.habit = habit;
        this.container = container;
        this.plugin = plugin;
        this.heatmapDateRange = 30; // Default number of days for heatmaps
    }
    render() {
        // Base rendering logic
        this.container.empty();
    }
    getHabitData() {
        var _a;
        const habits = ((_a = this.plugin.habitManager) === null || _a === void 0 ? void 0 : _a.habits) || [];
        return habits;
    }
    renderProgressBar(container, value, max) {
        const progressContainer = container.createDiv({
            cls: "habit-progress-container",
        });
        const progressBar = progressContainer.createDiv({
            cls: "habit-progress-bar",
        });
        const progressText = progressContainer.createDiv({
            cls: "habit-progress-text",
        });
        value = Math.max(0, value); // Ensure value is not negative
        max = Math.max(1, max); // Ensure max is at least 1 to avoid division by zero
        const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
        progressBar.style.width = `${percentage}%`;
        progressText.setText(`${value}/${max}`);
        progressContainer.setAttribute("aria-label", `Progress: ${value} out of ${max}`);
        // Mark as filled when reaching or exceeding the goal
        if (value >= max) {
            progressContainer.toggleClass("filled", true);
        }
        else {
            progressContainer.toggleClass("filled", false);
        }
    }
    // Basic heatmap renderer (shows last N days)
    renderHeatmap(container, completions, size, getVariantCondition, // Function to determine if cell is "filled"
    getCellValue // Optional function to get custom cell content
    ) {
        const countsMap = {
            sm: 18,
            md: 18,
            lg: 30,
        };
        const heatmapRoot = container.createDiv({
            cls: `tg-heatmap-root heatmap-${size}`,
        });
        const heatmapContainer = heatmapRoot.createDiv({
            cls: `heatmap-container-simple`,
        });
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - (countsMap[size] - 1) * 24 * 60 * 60 * 1000);
        const dates = getDatesInRange(getLocalDateString(startDate), getLocalDateString(endDate));
        // Render dates in reverse chronological order (most recent first)
        dates.reverse().forEach((date) => {
            const cellValue = completions[date];
            const isFilled = getVariantCondition(cellValue);
            const customContent = getCellValue ? getCellValue(cellValue) : null;
            const cell = heatmapContainer.createDiv({
                cls: `heatmap-cell heatmap-cell-square`, // Base class
            });
            cell.dataset.date = date;
            // Determine tooltip content
            let tooltipText = `${date}: `;
            if (cellValue === undefined || cellValue === null) {
                tooltipText += "Missed";
            }
            else if (typeof cellValue === "object") {
                // For scheduled: handled by custom renderer's aria-label
                if (!cell.hasAttribute("aria-label")) {
                    // Set default if not set by custom renderer
                    tooltipText += "Recorded";
                }
            }
            else if (typeof cellValue === "number" && !customContent) {
                // Count habit (any size)
                tooltipText += `${cellValue} times`;
            }
            else if (typeof cellValue === "number" && customContent) {
                // Mapping habit (emoji shown)
                tooltipText += `${customContent instanceof HTMLElement
                    ? customContent.textContent
                    : customContent}`; // Show emoji
            }
            else if (isFilled) {
                tooltipText += "Completed";
            }
            else {
                tooltipText += "Missed";
            }
            if (!cell.hasAttribute("aria-label")) {
                cell.setAttribute("aria-label", tooltipText);
            }
            if (customContent) {
                cell.addClass("has-custom-content");
                if (typeof customContent === "string") {
                    cell.addClass("has-text-content");
                    cell.setText(customContent);
                }
                else if (customContent instanceof HTMLElement) {
                    cell.appendChild(customContent);
                }
            }
            else if (isFilled) {
                cell.addClass("filled");
            }
            else {
                cell.addClass("default");
            }
        });
    }
    // Render heatmap for a custom date range [startDateStr, endDateStr]
    renderHeatmapRange(container, completions, startDateStr, endDateStr, size, getVariantCondition, getCellValue) {
        const heatmapRoot = container.createDiv({
            cls: `tg-heatmap-root heatmap-${size}`,
        });
        const heatmapContainer = heatmapRoot.createDiv({
            cls: `heatmap-container-simple`,
        });
        const dates = getDatesInRange(startDateStr, endDateStr);
        // Render dates in reverse chronological order (most recent first)
        dates.reverse().forEach((date) => {
            const cellValue = completions[date];
            const isFilled = getVariantCondition(cellValue);
            const customContent = getCellValue ? getCellValue(cellValue) : null;
            const cell = heatmapContainer.createDiv({
                cls: `heatmap-cell heatmap-cell-square`,
            });
            cell.dataset.date = date;
            // Determine tooltip content
            let tooltipText = `${date}: `;
            if (cellValue === undefined || cellValue === null) {
                tooltipText += "Missed";
            }
            else if (typeof cellValue === "object") {
                if (!cell.hasAttribute("aria-label")) {
                    tooltipText += "Recorded";
                }
            }
            else if (typeof cellValue === "number" && !customContent) {
                tooltipText += `${cellValue} times`;
            }
            else if (typeof cellValue === "number" && customContent) {
                tooltipText += `${customContent instanceof HTMLElement
                    ? customContent.textContent
                    : customContent}`;
            }
            else if (isFilled) {
                tooltipText += "Completed";
            }
            else {
                tooltipText += "Missed";
            }
            if (!cell.hasAttribute("aria-label")) {
                cell.setAttribute("aria-label", tooltipText);
            }
            if (customContent) {
                cell.addClass("has-custom-content");
                if (typeof customContent === "string") {
                    cell.addClass("has-text-content");
                    cell.setText(customContent);
                }
                else if (customContent instanceof HTMLElement) {
                    cell.appendChild(customContent);
                }
            }
            else if (isFilled) {
                cell.addClass("filled");
            }
            else {
                cell.addClass("default");
            }
        });
    }
    toggleHabitCompletion(habitId, data) {
        var _a, _b;
        console.log(`Toggling completion for ${habitId}`, data);
        // 1. Get current habit state (use a deep copy to avoid mutation issues)
        const currentHabits = this.getHabitData(); // In real scenario, fetch from indexer
        const habitIndex = currentHabits.findIndex((h) => h.id === habitId);
        if (habitIndex === -1) {
            console.error("Habit not found:", habitId);
            return;
        }
        // Create a deep copy to modify - simple version for this example
        const habitToUpdate = JSON.parse(JSON.stringify(currentHabits[habitIndex]));
        const today = getTodayLocalDateString();
        // 2. Calculate new completion state based on habit type
        let newCompletionValue;
        habitToUpdate.completions = habitToUpdate.completions || {}; // Ensure completions exists
        const currentCompletionToday = habitToUpdate.completions[today];
        switch (habitToUpdate.type) {
            case "daily":
                const dailyHabit = habitToUpdate;
                if (dailyHabit.completionText) {
                    newCompletionValue =
                        currentCompletionToday === 1 ? null : 1;
                }
                else {
                    // Default behavior: toggle between true and false
                    newCompletionValue = currentCompletionToday ? false : true;
                }
                break;
            case "count":
                newCompletionValue =
                    (typeof currentCompletionToday === "number"
                        ? currentCompletionToday
                        : 0) + 1;
                break;
            case "scheduled":
                if (!data || !data.id) {
                    console.error("Missing event data for scheduled habit toggle");
                    return;
                }
                // Ensure current completion is an object
                const currentEvents = typeof currentCompletionToday === "object" &&
                    currentCompletionToday !== null
                    ? currentCompletionToday
                    : {};
                newCompletionValue = Object.assign(Object.assign({}, currentEvents), { [data.id]: (_a = data.details) !== null && _a !== void 0 ? _a : "" });
                break;
            case "mapping":
                if (data === undefined ||
                    data === null ||
                    typeof data !== "number") {
                    console.error("Invalid value for mapping habit toggle");
                    return;
                }
                const mappingHabit = habitToUpdate;
                // Ensure the value is valid for this mapping
                if (!mappingHabit.mapping[data]) {
                    console.error(`Invalid mapping value: ${data}`);
                    return;
                }
                newCompletionValue = data; // Value comes from slider/button
                break;
            default:
                console.error("Unhandled habit type in toggleCompletion");
                return;
        }
        // Update the completion for today
        habitToUpdate.completions[today] = newCompletionValue;
        (_b = this.plugin.habitManager) === null || _b === void 0 ? void 0 : _b.updateHabitInObsidian(habitToUpdate, today);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFiaXRjYXJkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaGFiaXRjYXJkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFPckMsT0FBTyxFQUNOLHVCQUF1QixFQUN2QixrQkFBa0IsR0FDbEIsTUFBTSw2QkFBNkIsQ0FBQztBQUVyQyxTQUFTLGVBQWUsQ0FBQyxTQUFpQixFQUFFLE9BQWU7SUFDMUQsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDO0lBQ2pCLElBQUksV0FBVyxHQUFHLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3RDLE1BQU0sVUFBVSxHQUFHLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRXJDLE9BQU8sV0FBVyxJQUFJLFVBQVUsRUFBRTtRQUNqQyxLQUFLLENBQUMsSUFBSSxDQUNULEdBQUcsV0FBVyxDQUFDLFdBQVcsRUFBRSxJQUFJLE1BQU0sQ0FDckMsV0FBVyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FDMUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQzNELENBQUMsRUFDRCxHQUFHLENBQ0gsRUFBRSxDQUNILENBQUM7UUFDRixXQUFXLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztLQUMvQztJQUVELE9BQU8sS0FBSyxDQUFDO0FBQ2QsQ0FBQztBQUVELE1BQU0sT0FBTyxTQUFVLFNBQVEsU0FBUztJQUd2QyxZQUNRLEtBQWlCLEVBQ2pCLFNBQXNCLEVBQ3RCLE1BQTZCO1FBRXBDLEtBQUssRUFBRSxDQUFDO1FBSkQsVUFBSyxHQUFMLEtBQUssQ0FBWTtRQUNqQixjQUFTLEdBQVQsU0FBUyxDQUFhO1FBQ3RCLFdBQU0sR0FBTixNQUFNLENBQXVC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QyxDQUFDLGlDQUFpQztnQkFDNUQsTUFBTTtZQUNQO2dCQUNDLE9BQU8sQ0FBQyxLQUFLLENBQUMsMENBQTBDLENBQUMsQ0FBQztnQkFDMUQsT0FBTztTQUNSO1FBRUQsa0NBQWtDO1FBQ2xDLGFBQWEsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsa0JBQWtCLENBQUM7UUFFdEQsTUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksMENBQUUscUJBQXFCLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3ZFLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbXBvbmVudCB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQge1xyXG5cdERhaWx5SGFiaXRQcm9wcyxcclxuXHRIYWJpdFByb3BzLFxyXG5cdE1hcHBpbmdIYWJpdFByb3BzLFxyXG59IGZyb20gXCJAL3R5cGVzL2hhYml0LWNhcmRcIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5pbXBvcnQge1xyXG5cdGdldFRvZGF5TG9jYWxEYXRlU3RyaW5nLFxyXG5cdGdldExvY2FsRGF0ZVN0cmluZyxcclxufSBmcm9tIFwiQC91dGlscy9kYXRlL2RhdGUtZm9ybWF0dGVyXCI7XHJcblxyXG5mdW5jdGlvbiBnZXREYXRlc0luUmFuZ2Uoc3RhcnREYXRlOiBzdHJpbmcsIGVuZERhdGU6IHN0cmluZyk6IHN0cmluZ1tdIHtcclxuXHRjb25zdCBkYXRlcyA9IFtdO1xyXG5cdGxldCBjdXJyZW50RGF0ZSA9IG5ldyBEYXRlKHN0YXJ0RGF0ZSk7XHJcblx0Y29uc3QgZW5kRGF0ZU9iaiA9IG5ldyBEYXRlKGVuZERhdGUpO1xyXG5cclxuXHR3aGlsZSAoY3VycmVudERhdGUgPD0gZW5kRGF0ZU9iaikge1xyXG5cdFx0ZGF0ZXMucHVzaChcclxuXHRcdFx0YCR7Y3VycmVudERhdGUuZ2V0RnVsbFllYXIoKX0tJHtTdHJpbmcoXHJcblx0XHRcdFx0Y3VycmVudERhdGUuZ2V0TW9udGgoKSArIDFcclxuXHRcdFx0KS5wYWRTdGFydCgyLCBcIjBcIil9LSR7U3RyaW5nKGN1cnJlbnREYXRlLmdldERhdGUoKSkucGFkU3RhcnQoXHJcblx0XHRcdFx0MixcclxuXHRcdFx0XHRcIjBcIlxyXG5cdFx0XHQpfWBcclxuXHRcdCk7XHJcblx0XHRjdXJyZW50RGF0ZS5zZXREYXRlKGN1cnJlbnREYXRlLmdldERhdGUoKSArIDEpO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIGRhdGVzO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgSGFiaXRDYXJkIGV4dGVuZHMgQ29tcG9uZW50IHtcclxuXHRoZWF0bWFwRGF0ZVJhbmdlOiBudW1iZXIgPSAzMDsgLy8gRGVmYXVsdCBudW1iZXIgb2YgZGF5cyBmb3IgaGVhdG1hcHNcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwdWJsaWMgaGFiaXQ6IEhhYml0UHJvcHMsXHJcblx0XHRwdWJsaWMgY29udGFpbmVyOiBIVE1MRWxlbWVudCxcclxuXHRcdHB1YmxpYyBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpblxyXG5cdCkge1xyXG5cdFx0c3VwZXIoKTtcclxuXHR9XHJcblxyXG5cdHJlbmRlcigpOiB2b2lkIHtcclxuXHRcdC8vIEJhc2UgcmVuZGVyaW5nIGxvZ2ljXHJcblx0XHR0aGlzLmNvbnRhaW5lci5lbXB0eSgpO1xyXG5cdH1cclxuXHJcblx0Z2V0SGFiaXREYXRhKCk6IEhhYml0UHJvcHNbXSB7XHJcblx0XHRjb25zdCBoYWJpdHMgPSB0aGlzLnBsdWdpbi5oYWJpdE1hbmFnZXI/LmhhYml0cyB8fCBbXTtcclxuXHRcdHJldHVybiBoYWJpdHM7XHJcblx0fVxyXG5cclxuXHRyZW5kZXJQcm9ncmVzc0Jhcihjb250YWluZXI6IEhUTUxFbGVtZW50LCB2YWx1ZTogbnVtYmVyLCBtYXg6IG51bWJlcikge1xyXG5cdFx0Y29uc3QgcHJvZ3Jlc3NDb250YWluZXIgPSBjb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImhhYml0LXByb2dyZXNzLWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCBwcm9ncmVzc0JhciA9IHByb2dyZXNzQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJoYWJpdC1wcm9ncmVzcy1iYXJcIixcclxuXHRcdH0pO1xyXG5cdFx0Y29uc3QgcHJvZ3Jlc3NUZXh0ID0gcHJvZ3Jlc3NDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImhhYml0LXByb2dyZXNzLXRleHRcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdHZhbHVlID0gTWF0aC5tYXgoMCwgdmFsdWUpOyAvLyBFbnN1cmUgdmFsdWUgaXMgbm90IG5lZ2F0aXZlXHJcblx0XHRtYXggPSBNYXRoLm1heCgxLCBtYXgpOyAvLyBFbnN1cmUgbWF4IGlzIGF0IGxlYXN0IDEgdG8gYXZvaWQgZGl2aXNpb24gYnkgemVyb1xyXG5cclxuXHRcdGNvbnN0IHBlcmNlbnRhZ2UgPVxyXG5cdFx0XHRtYXggPiAwID8gTWF0aC5taW4oMTAwLCBNYXRoLm1heCgwLCAodmFsdWUgLyBtYXgpICogMTAwKSkgOiAwO1xyXG5cdFx0cHJvZ3Jlc3NCYXIuc3R5bGUud2lkdGggPSBgJHtwZXJjZW50YWdlfSVgO1xyXG5cdFx0cHJvZ3Jlc3NUZXh0LnNldFRleHQoYCR7dmFsdWV9LyR7bWF4fWApO1xyXG5cdFx0cHJvZ3Jlc3NDb250YWluZXIuc2V0QXR0cmlidXRlKFxyXG5cdFx0XHRcImFyaWEtbGFiZWxcIixcclxuXHRcdFx0YFByb2dyZXNzOiAke3ZhbHVlfSBvdXQgb2YgJHttYXh9YFxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBNYXJrIGFzIGZpbGxlZCB3aGVuIHJlYWNoaW5nIG9yIGV4Y2VlZGluZyB0aGUgZ29hbFxyXG5cdFx0aWYgKHZhbHVlID49IG1heCkge1xyXG5cdFx0XHRwcm9ncmVzc0NvbnRhaW5lci50b2dnbGVDbGFzcyhcImZpbGxlZFwiLCB0cnVlKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHByb2dyZXNzQ29udGFpbmVyLnRvZ2dsZUNsYXNzKFwiZmlsbGVkXCIsIGZhbHNlKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIEJhc2ljIGhlYXRtYXAgcmVuZGVyZXIgKHNob3dzIGxhc3QgTiBkYXlzKVxyXG5cdHJlbmRlckhlYXRtYXAoXHJcblx0XHRjb250YWluZXI6IEhUTUxFbGVtZW50LFxyXG5cdFx0Y29tcGxldGlvbnM6IFJlY29yZDxzdHJpbmcsIGFueT4sXHJcblx0XHRzaXplOiBcInNtXCIgfCBcIm1kXCIgfCBcImxnXCIsXHJcblx0XHRnZXRWYXJpYW50Q29uZGl0aW9uOiAodmFsdWU6IGFueSkgPT4gYm9vbGVhbiwgLy8gRnVuY3Rpb24gdG8gZGV0ZXJtaW5lIGlmIGNlbGwgaXMgXCJmaWxsZWRcIlxyXG5cdFx0Z2V0Q2VsbFZhbHVlPzogKHZhbHVlOiBhbnkpID0+IHN0cmluZyB8IEhUTUxFbGVtZW50IHwgbnVsbCAvLyBPcHRpb25hbCBmdW5jdGlvbiB0byBnZXQgY3VzdG9tIGNlbGwgY29udGVudFxyXG5cdCkge1xyXG5cdFx0Y29uc3QgY291bnRzTWFwID0ge1xyXG5cdFx0XHRzbTogMTgsXHJcblx0XHRcdG1kOiAxOCxcclxuXHRcdFx0bGc6IDMwLFxyXG5cdFx0fTtcclxuXHRcdGNvbnN0IGhlYXRtYXBSb290ID0gY29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogYHRnLWhlYXRtYXAtcm9vdCBoZWF0bWFwLSR7c2l6ZX1gLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCBoZWF0bWFwQ29udGFpbmVyID0gaGVhdG1hcFJvb3QuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBgaGVhdG1hcC1jb250YWluZXItc2ltcGxlYCxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IGVuZERhdGUgPSBuZXcgRGF0ZSgpO1xyXG5cdFx0Y29uc3Qgc3RhcnREYXRlID0gbmV3IERhdGUoXHJcblx0XHRcdGVuZERhdGUuZ2V0VGltZSgpIC0gKGNvdW50c01hcFtzaXplXSAtIDEpICogMjQgKiA2MCAqIDYwICogMTAwMFxyXG5cdFx0KTtcclxuXHRcdGNvbnN0IGRhdGVzID0gZ2V0RGF0ZXNJblJhbmdlKFxyXG5cdFx0XHRnZXRMb2NhbERhdGVTdHJpbmcoc3RhcnREYXRlKSxcclxuXHRcdFx0Z2V0TG9jYWxEYXRlU3RyaW5nKGVuZERhdGUpXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIFJlbmRlciBkYXRlcyBpbiByZXZlcnNlIGNocm9ub2xvZ2ljYWwgb3JkZXIgKG1vc3QgcmVjZW50IGZpcnN0KVxyXG5cdFx0ZGF0ZXMucmV2ZXJzZSgpLmZvckVhY2goKGRhdGUpID0+IHtcclxuXHRcdFx0Y29uc3QgY2VsbFZhbHVlID0gY29tcGxldGlvbnNbZGF0ZV07XHJcblx0XHRcdGNvbnN0IGlzRmlsbGVkID0gZ2V0VmFyaWFudENvbmRpdGlvbihjZWxsVmFsdWUpO1xyXG5cdFx0XHRjb25zdCBjdXN0b21Db250ZW50ID0gZ2V0Q2VsbFZhbHVlID8gZ2V0Q2VsbFZhbHVlKGNlbGxWYWx1ZSkgOiBudWxsO1xyXG5cclxuXHRcdFx0Y29uc3QgY2VsbCA9IGhlYXRtYXBDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IGBoZWF0bWFwLWNlbGwgaGVhdG1hcC1jZWxsLXNxdWFyZWAsIC8vIEJhc2UgY2xhc3NcclxuXHRcdFx0fSk7XHJcblx0XHRcdGNlbGwuZGF0YXNldC5kYXRlID0gZGF0ZTtcclxuXHJcblx0XHRcdC8vIERldGVybWluZSB0b29sdGlwIGNvbnRlbnRcclxuXHRcdFx0bGV0IHRvb2x0aXBUZXh0ID0gYCR7ZGF0ZX06IGA7XHJcblx0XHRcdGlmIChjZWxsVmFsdWUgPT09IHVuZGVmaW5lZCB8fCBjZWxsVmFsdWUgPT09IG51bGwpIHtcclxuXHRcdFx0XHR0b29sdGlwVGV4dCArPSBcIk1pc3NlZFwiO1xyXG5cdFx0XHR9IGVsc2UgaWYgKHR5cGVvZiBjZWxsVmFsdWUgPT09IFwib2JqZWN0XCIpIHtcclxuXHRcdFx0XHQvLyBGb3Igc2NoZWR1bGVkOiBoYW5kbGVkIGJ5IGN1c3RvbSByZW5kZXJlcidzIGFyaWEtbGFiZWxcclxuXHRcdFx0XHRpZiAoIWNlbGwuaGFzQXR0cmlidXRlKFwiYXJpYS1sYWJlbFwiKSkge1xyXG5cdFx0XHRcdFx0Ly8gU2V0IGRlZmF1bHQgaWYgbm90IHNldCBieSBjdXN0b20gcmVuZGVyZXJcclxuXHRcdFx0XHRcdHRvb2x0aXBUZXh0ICs9IFwiUmVjb3JkZWRcIjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSBpZiAodHlwZW9mIGNlbGxWYWx1ZSA9PT0gXCJudW1iZXJcIiAmJiAhY3VzdG9tQ29udGVudCkge1xyXG5cdFx0XHRcdC8vIENvdW50IGhhYml0IChhbnkgc2l6ZSlcclxuXHRcdFx0XHR0b29sdGlwVGV4dCArPSBgJHtjZWxsVmFsdWV9IHRpbWVzYDtcclxuXHRcdFx0fSBlbHNlIGlmICh0eXBlb2YgY2VsbFZhbHVlID09PSBcIm51bWJlclwiICYmIGN1c3RvbUNvbnRlbnQpIHtcclxuXHRcdFx0XHQvLyBNYXBwaW5nIGhhYml0IChlbW9qaSBzaG93bilcclxuXHRcdFx0XHR0b29sdGlwVGV4dCArPSBgJHtcclxuXHRcdFx0XHRcdGN1c3RvbUNvbnRlbnQgaW5zdGFuY2VvZiBIVE1MRWxlbWVudFxyXG5cdFx0XHRcdFx0XHQ/IGN1c3RvbUNvbnRlbnQudGV4dENvbnRlbnRcclxuXHRcdFx0XHRcdFx0OiBjdXN0b21Db250ZW50XHJcblx0XHRcdFx0fWA7IC8vIFNob3cgZW1vamlcclxuXHRcdFx0fSBlbHNlIGlmIChpc0ZpbGxlZCkge1xyXG5cdFx0XHRcdHRvb2x0aXBUZXh0ICs9IFwiQ29tcGxldGVkXCI7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dG9vbHRpcFRleHQgKz0gXCJNaXNzZWRcIjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKCFjZWxsLmhhc0F0dHJpYnV0ZShcImFyaWEtbGFiZWxcIikpIHtcclxuXHRcdFx0XHRjZWxsLnNldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIiwgdG9vbHRpcFRleHQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoY3VzdG9tQ29udGVudCkge1xyXG5cdFx0XHRcdGNlbGwuYWRkQ2xhc3MoXCJoYXMtY3VzdG9tLWNvbnRlbnRcIik7XHJcblx0XHRcdFx0aWYgKHR5cGVvZiBjdXN0b21Db250ZW50ID09PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdFx0XHRjZWxsLmFkZENsYXNzKFwiaGFzLXRleHQtY29udGVudFwiKTtcclxuXHRcdFx0XHRcdGNlbGwuc2V0VGV4dChjdXN0b21Db250ZW50KTtcclxuXHRcdFx0XHR9IGVsc2UgaWYgKGN1c3RvbUNvbnRlbnQgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkge1xyXG5cdFx0XHRcdFx0Y2VsbC5hcHBlbmRDaGlsZChjdXN0b21Db250ZW50KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSBpZiAoaXNGaWxsZWQpIHtcclxuXHRcdFx0XHRjZWxsLmFkZENsYXNzKFwiZmlsbGVkXCIpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGNlbGwuYWRkQ2xhc3MoXCJkZWZhdWx0XCIpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIFJlbmRlciBoZWF0bWFwIGZvciBhIGN1c3RvbSBkYXRlIHJhbmdlIFtzdGFydERhdGVTdHIsIGVuZERhdGVTdHJdXHJcblx0cmVuZGVySGVhdG1hcFJhbmdlKFxyXG5cdFx0Y29udGFpbmVyOiBIVE1MRWxlbWVudCxcclxuXHRcdGNvbXBsZXRpb25zOiBSZWNvcmQ8c3RyaW5nLCBhbnk+LFxyXG5cdFx0c3RhcnREYXRlU3RyOiBzdHJpbmcsXHJcblx0XHRlbmREYXRlU3RyOiBzdHJpbmcsXHJcblx0XHRzaXplOiBcInNtXCIgfCBcIm1kXCIgfCBcImxnXCIsXHJcblx0XHRnZXRWYXJpYW50Q29uZGl0aW9uOiAodmFsdWU6IGFueSkgPT4gYm9vbGVhbixcclxuXHRcdGdldENlbGxWYWx1ZT86ICh2YWx1ZTogYW55KSA9PiBzdHJpbmcgfCBIVE1MRWxlbWVudCB8IG51bGxcclxuXHQpIHtcclxuXHRcdGNvbnN0IGhlYXRtYXBSb290ID0gY29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogYHRnLWhlYXRtYXAtcm9vdCBoZWF0bWFwLSR7c2l6ZX1gLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCBoZWF0bWFwQ29udGFpbmVyID0gaGVhdG1hcFJvb3QuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBgaGVhdG1hcC1jb250YWluZXItc2ltcGxlYCxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IGRhdGVzID0gZ2V0RGF0ZXNJblJhbmdlKHN0YXJ0RGF0ZVN0ciwgZW5kRGF0ZVN0cik7XHJcblxyXG5cdFx0Ly8gUmVuZGVyIGRhdGVzIGluIHJldmVyc2UgY2hyb25vbG9naWNhbCBvcmRlciAobW9zdCByZWNlbnQgZmlyc3QpXHJcblx0XHRkYXRlcy5yZXZlcnNlKCkuZm9yRWFjaCgoZGF0ZSkgPT4ge1xyXG5cdFx0XHRjb25zdCBjZWxsVmFsdWUgPSBjb21wbGV0aW9uc1tkYXRlXTtcclxuXHRcdFx0Y29uc3QgaXNGaWxsZWQgPSBnZXRWYXJpYW50Q29uZGl0aW9uKGNlbGxWYWx1ZSk7XHJcblx0XHRcdGNvbnN0IGN1c3RvbUNvbnRlbnQgPSBnZXRDZWxsVmFsdWUgPyBnZXRDZWxsVmFsdWUoY2VsbFZhbHVlKSA6IG51bGw7XHJcblxyXG5cdFx0XHRjb25zdCBjZWxsID0gaGVhdG1hcENvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogYGhlYXRtYXAtY2VsbCBoZWF0bWFwLWNlbGwtc3F1YXJlYCxcclxuXHRcdFx0fSk7XHJcblx0XHRcdGNlbGwuZGF0YXNldC5kYXRlID0gZGF0ZTtcclxuXHJcblx0XHRcdC8vIERldGVybWluZSB0b29sdGlwIGNvbnRlbnRcclxuXHRcdFx0bGV0IHRvb2x0aXBUZXh0ID0gYCR7ZGF0ZX06IGA7XHJcblx0XHRcdGlmIChjZWxsVmFsdWUgPT09IHVuZGVmaW5lZCB8fCBjZWxsVmFsdWUgPT09IG51bGwpIHtcclxuXHRcdFx0XHR0b29sdGlwVGV4dCArPSBcIk1pc3NlZFwiO1xyXG5cdFx0XHR9IGVsc2UgaWYgKHR5cGVvZiBjZWxsVmFsdWUgPT09IFwib2JqZWN0XCIpIHtcclxuXHRcdFx0XHRpZiAoIWNlbGwuaGFzQXR0cmlidXRlKFwiYXJpYS1sYWJlbFwiKSkge1xyXG5cdFx0XHRcdFx0dG9vbHRpcFRleHQgKz0gXCJSZWNvcmRlZFwiO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIGlmICh0eXBlb2YgY2VsbFZhbHVlID09PSBcIm51bWJlclwiICYmICFjdXN0b21Db250ZW50KSB7XHJcblx0XHRcdFx0dG9vbHRpcFRleHQgKz0gYCR7Y2VsbFZhbHVlfSB0aW1lc2A7XHJcblx0XHRcdH0gZWxzZSBpZiAodHlwZW9mIGNlbGxWYWx1ZSA9PT0gXCJudW1iZXJcIiAmJiBjdXN0b21Db250ZW50KSB7XHJcblx0XHRcdFx0dG9vbHRpcFRleHQgKz0gYCR7XHJcblx0XHRcdFx0XHRjdXN0b21Db250ZW50IGluc3RhbmNlb2YgSFRNTEVsZW1lbnRcclxuXHRcdFx0XHRcdFx0PyBjdXN0b21Db250ZW50LnRleHRDb250ZW50XHJcblx0XHRcdFx0XHRcdDogY3VzdG9tQ29udGVudFxyXG5cdFx0XHRcdH1gO1xyXG5cdFx0XHR9IGVsc2UgaWYgKGlzRmlsbGVkKSB7XHJcblx0XHRcdFx0dG9vbHRpcFRleHQgKz0gXCJDb21wbGV0ZWRcIjtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0b29sdGlwVGV4dCArPSBcIk1pc3NlZFwiO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoIWNlbGwuaGFzQXR0cmlidXRlKFwiYXJpYS1sYWJlbFwiKSkge1xyXG5cdFx0XHRcdGNlbGwuc2V0QXR0cmlidXRlKFwiYXJpYS1sYWJlbFwiLCB0b29sdGlwVGV4dCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChjdXN0b21Db250ZW50KSB7XHJcblx0XHRcdFx0Y2VsbC5hZGRDbGFzcyhcImhhcy1jdXN0b20tY29udGVudFwiKTtcclxuXHRcdFx0XHRpZiAodHlwZW9mIGN1c3RvbUNvbnRlbnQgPT09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0XHRcdGNlbGwuYWRkQ2xhc3MoXCJoYXMtdGV4dC1jb250ZW50XCIpO1xyXG5cdFx0XHRcdFx0Y2VsbC5zZXRUZXh0KGN1c3RvbUNvbnRlbnQpO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAoY3VzdG9tQ29udGVudCBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XHJcblx0XHRcdFx0XHRjZWxsLmFwcGVuZENoaWxkKGN1c3RvbUNvbnRlbnQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIGlmIChpc0ZpbGxlZCkge1xyXG5cdFx0XHRcdGNlbGwuYWRkQ2xhc3MoXCJmaWxsZWRcIik7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Y2VsbC5hZGRDbGFzcyhcImRlZmF1bHRcIik7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0dG9nZ2xlSGFiaXRDb21wbGV0aW9uKGhhYml0SWQ6IHN0cmluZywgZGF0YT86IGFueSkge1xyXG5cdFx0Y29uc29sZS5sb2coYFRvZ2dsaW5nIGNvbXBsZXRpb24gZm9yICR7aGFiaXRJZH1gLCBkYXRhKTtcclxuXHJcblx0XHQvLyAxLiBHZXQgY3VycmVudCBoYWJpdCBzdGF0ZSAodXNlIGEgZGVlcCBjb3B5IHRvIGF2b2lkIG11dGF0aW9uIGlzc3VlcylcclxuXHRcdGNvbnN0IGN1cnJlbnRIYWJpdHMgPSB0aGlzLmdldEhhYml0RGF0YSgpOyAvLyBJbiByZWFsIHNjZW5hcmlvLCBmZXRjaCBmcm9tIGluZGV4ZXJcclxuXHRcdGNvbnN0IGhhYml0SW5kZXggPSBjdXJyZW50SGFiaXRzLmZpbmRJbmRleCgoaCkgPT4gaC5pZCA9PT0gaGFiaXRJZCk7XHJcblx0XHRpZiAoaGFiaXRJbmRleCA9PT0gLTEpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkhhYml0IG5vdCBmb3VuZDpcIiwgaGFiaXRJZCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdC8vIENyZWF0ZSBhIGRlZXAgY29weSB0byBtb2RpZnkgLSBzaW1wbGUgdmVyc2lvbiBmb3IgdGhpcyBleGFtcGxlXHJcblx0XHRjb25zdCBoYWJpdFRvVXBkYXRlID0gSlNPTi5wYXJzZShcclxuXHRcdFx0SlNPTi5zdHJpbmdpZnkoY3VycmVudEhhYml0c1toYWJpdEluZGV4XSlcclxuXHRcdCk7XHJcblx0XHRjb25zdCB0b2RheSA9IGdldFRvZGF5TG9jYWxEYXRlU3RyaW5nKCk7XHJcblxyXG5cdFx0Ly8gMi4gQ2FsY3VsYXRlIG5ldyBjb21wbGV0aW9uIHN0YXRlIGJhc2VkIG9uIGhhYml0IHR5cGVcclxuXHRcdGxldCBuZXdDb21wbGV0aW9uVmFsdWU6IGFueTtcclxuXHRcdGhhYml0VG9VcGRhdGUuY29tcGxldGlvbnMgPSBoYWJpdFRvVXBkYXRlLmNvbXBsZXRpb25zIHx8IHt9OyAvLyBFbnN1cmUgY29tcGxldGlvbnMgZXhpc3RzXHJcblx0XHRjb25zdCBjdXJyZW50Q29tcGxldGlvblRvZGF5ID0gaGFiaXRUb1VwZGF0ZS5jb21wbGV0aW9uc1t0b2RheV07XHJcblxyXG5cdFx0c3dpdGNoIChoYWJpdFRvVXBkYXRlLnR5cGUpIHtcclxuXHRcdFx0Y2FzZSBcImRhaWx5XCI6XHJcblx0XHRcdFx0Y29uc3QgZGFpbHlIYWJpdCA9IGhhYml0VG9VcGRhdGUgYXMgRGFpbHlIYWJpdFByb3BzO1xyXG5cdFx0XHRcdGlmIChkYWlseUhhYml0LmNvbXBsZXRpb25UZXh0KSB7XHJcblx0XHRcdFx0XHRuZXdDb21wbGV0aW9uVmFsdWUgPVxyXG5cdFx0XHRcdFx0XHRjdXJyZW50Q29tcGxldGlvblRvZGF5ID09PSAxID8gbnVsbCA6IDE7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdC8vIERlZmF1bHQgYmVoYXZpb3I6IHRvZ2dsZSBiZXR3ZWVuIHRydWUgYW5kIGZhbHNlXHJcblx0XHRcdFx0XHRuZXdDb21wbGV0aW9uVmFsdWUgPSBjdXJyZW50Q29tcGxldGlvblRvZGF5ID8gZmFsc2UgOiB0cnVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBcImNvdW50XCI6XHJcblx0XHRcdFx0bmV3Q29tcGxldGlvblZhbHVlID1cclxuXHRcdFx0XHRcdCh0eXBlb2YgY3VycmVudENvbXBsZXRpb25Ub2RheSA9PT0gXCJudW1iZXJcIlxyXG5cdFx0XHRcdFx0XHQ/IGN1cnJlbnRDb21wbGV0aW9uVG9kYXlcclxuXHRcdFx0XHRcdFx0OiAwKSArIDE7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgXCJzY2hlZHVsZWRcIjpcclxuXHRcdFx0XHRpZiAoIWRhdGEgfHwgIWRhdGEuaWQpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXHJcblx0XHRcdFx0XHRcdFwiTWlzc2luZyBldmVudCBkYXRhIGZvciBzY2hlZHVsZWQgaGFiaXQgdG9nZ2xlXCJcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIEVuc3VyZSBjdXJyZW50IGNvbXBsZXRpb24gaXMgYW4gb2JqZWN0XHJcblx0XHRcdFx0Y29uc3QgY3VycmVudEV2ZW50cyA9XHJcblx0XHRcdFx0XHR0eXBlb2YgY3VycmVudENvbXBsZXRpb25Ub2RheSA9PT0gXCJvYmplY3RcIiAmJlxyXG5cdFx0XHRcdFx0Y3VycmVudENvbXBsZXRpb25Ub2RheSAhPT0gbnVsbFxyXG5cdFx0XHRcdFx0XHQ/IGN1cnJlbnRDb21wbGV0aW9uVG9kYXlcclxuXHRcdFx0XHRcdFx0OiB7fTtcclxuXHRcdFx0XHRuZXdDb21wbGV0aW9uVmFsdWUgPSB7XHJcblx0XHRcdFx0XHQuLi5jdXJyZW50RXZlbnRzLFxyXG5cdFx0XHRcdFx0W2RhdGEuaWRdOiBkYXRhLmRldGFpbHMgPz8gXCJcIiwgLy8gU3RvcmUgZGV0YWlscywgZGVmYXVsdCB0byBlbXB0eSBzdHJpbmdcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwibWFwcGluZ1wiOlxyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdGRhdGEgPT09IHVuZGVmaW5lZCB8fFxyXG5cdFx0XHRcdFx0ZGF0YSA9PT0gbnVsbCB8fFxyXG5cdFx0XHRcdFx0dHlwZW9mIGRhdGEgIT09IFwibnVtYmVyXCJcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJJbnZhbGlkIHZhbHVlIGZvciBtYXBwaW5nIGhhYml0IHRvZ2dsZVwiKTtcclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Y29uc3QgbWFwcGluZ0hhYml0ID0gaGFiaXRUb1VwZGF0ZSBhcyBNYXBwaW5nSGFiaXRQcm9wcztcclxuXHRcdFx0XHQvLyBFbnN1cmUgdGhlIHZhbHVlIGlzIHZhbGlkIGZvciB0aGlzIG1hcHBpbmdcclxuXHRcdFx0XHRpZiAoIW1hcHBpbmdIYWJpdC5tYXBwaW5nW2RhdGFdKSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmVycm9yKGBJbnZhbGlkIG1hcHBpbmcgdmFsdWU6ICR7ZGF0YX1gKTtcclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0bmV3Q29tcGxldGlvblZhbHVlID0gZGF0YTsgLy8gVmFsdWUgY29tZXMgZnJvbSBzbGlkZXIvYnV0dG9uXHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcihcIlVuaGFuZGxlZCBoYWJpdCB0eXBlIGluIHRvZ2dsZUNvbXBsZXRpb25cIik7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFVwZGF0ZSB0aGUgY29tcGxldGlvbiBmb3IgdG9kYXlcclxuXHRcdGhhYml0VG9VcGRhdGUuY29tcGxldGlvbnNbdG9kYXldID0gbmV3Q29tcGxldGlvblZhbHVlO1xyXG5cclxuXHRcdHRoaXMucGx1Z2luLmhhYml0TWFuYWdlcj8udXBkYXRlSGFiaXRJbk9ic2lkaWFuKGhhYml0VG9VcGRhdGUsIHRvZGF5KTtcclxuXHR9XHJcbn1cclxuIl19