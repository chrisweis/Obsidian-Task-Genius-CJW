import { __awaiter } from "tslib";
import { Component, Modal, Setting, Notice, ButtonComponent, ExtraButtonComponent, } from "obsidian";
import { DailyHabitCard, CountHabitCard, ScheduledHabitCard, MappingHabitCard, } from "./habitcard/index"; // Import the habit card classes
import { t } from "@/translations/helper";
import "@/styles/habit.css";
import { HabitEditDialog } from "@/components/features/habit/components/HabitEditDialog";
export class Habit extends Component {
    constructor(plugin, parentEl) {
        super();
        // Redraw the entire habit view
        this.redraw = () => {
            const scrollState = this.containerEl.scrollTop;
            this.containerEl.empty(); // Clear previous content
            const habits = this.getHabitData(); // Method to fetch habit data
            if (!habits || habits.length === 0) {
                this.renderEmptyState();
            }
            else {
                this.renderHabitList(habits);
            }
            this.containerEl.scrollTop = scrollState; // Restore scroll position
        };
        this.plugin = plugin;
        this.containerEl = parentEl.createDiv("tg-habit-component-container");
    }
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.plugin) {
                // Cast to any to avoid TypeScript error about event name
                this.registerEvent(this.plugin.app.workspace.on("task-genius:habit-index-updated", () => {
                    this.redraw();
                }));
            }
            this.redraw(); // Initial draw
        });
    }
    onunload() {
        console.log("HabitView unloaded.");
        this.containerEl.empty(); // Clear the container on unload
    }
    getHabitData() {
        var _a;
        const habits = ((_a = this.plugin.habitManager) === null || _a === void 0 ? void 0 : _a.habits) || [];
        return habits;
    }
    renderEmptyState() {
        const emptyDiv = this.containerEl.createDiv({
            cls: "habit-empty-state",
        });
        emptyDiv.createEl("h2", { text: t("No Habits Yet") });
        emptyDiv.createEl("p", {
            text: t("Click the open habit button to create a new habit."),
        }); // Adjust text based on UI
        emptyDiv.createEl("br");
        new ButtonComponent(emptyDiv)
            .setButtonText("Open Habit")
            .onClick(() => {
            this.plugin.app.setting.open();
            this.plugin.app.setting.openTabById(this.plugin.manifest.id);
            this.plugin.settingTab.openTab("habit");
        });
    }
    renderHabitList(habits) {
        console.log("renderHabitList", habits);
        const listContainer = this.containerEl.createDiv({
            cls: "habit-list-container",
        });
        habits.forEach((habit) => {
            const habitCardContainer = listContainer.createDiv({
                cls: "habit-card-wrapper",
            }); // Wrapper for context menu, etc.
            this.renderHabitCard(habitCardContainer, habit);
        });
        // Add create new habit button at the bottom left
        const buttonContainer = listContainer.createDiv({
            cls: "habit-create-button-container",
        });
        new ExtraButtonComponent(buttonContainer)
            .setIcon("plus")
            .setTooltip(t("Create new habit"))
            .onClick(() => {
            this.openCreateHabitDialog();
        });
    }
    openCreateHabitDialog() {
        new HabitEditDialog(this.plugin.app, this.plugin, null, // null for new habit
        (habitData) => __awaiter(this, void 0, void 0, function* () {
            // Save the new habit
            if (!this.plugin.settings.habit.habits) {
                this.plugin.settings.habit.habits = [];
            }
            this.plugin.settings.habit.habits.push(habitData);
            yield this.plugin.saveSettings();
            // Reload habits
            if (this.plugin.habitManager) {
                yield this.plugin.habitManager.initializeHabits();
            }
            new Notice(t("Habit created successfully"));
            this.redraw();
        })).open();
    }
    renderHabitCard(container, habit) {
        // Ensure completions is an object
        habit.completions = habit.completions || {};
        switch (habit.type) {
            case "daily":
                const dailyCard = new DailyHabitCard(habit, container, this.plugin);
                this.addChild(dailyCard);
                break;
            case "count":
                const countCard = new CountHabitCard(habit, container, this.plugin);
                this.addChild(countCard);
                break;
            case "scheduled":
                const scheduledCard = new ScheduledHabitCard(habit, container, this.plugin);
                this.addChild(scheduledCard);
                break;
            case "mapping":
                const mappingCard = new MappingHabitCard(habit, container, this.plugin);
                this.addChild(mappingCard);
                break;
            default:
                // Use a type assertion to handle potential future types or errors
                const unknownHabit = habit;
                console.warn(`Unsupported habit type: ${unknownHabit === null || unknownHabit === void 0 ? void 0 : unknownHabit.type}`);
                container.createDiv({
                    text: `Unsupported habit: ${(unknownHabit === null || unknownHabit === void 0 ? void 0 : unknownHabit.name) || "Unknown"}`,
                });
        }
    }
}
// --- Modal for Scheduled Event Details ---
export class EventDetailModal extends Modal {
    constructor(app, eventName, onSubmit) {
        super(app);
        this.details = "";
        this.eventName = eventName;
        this.onSubmit = onSubmit;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.addClass("habit-event-modal");
        contentEl.createEl("h2", {
            text: `Record Details for ${this.eventName}`,
        });
        new Setting(contentEl).setName("Details").addText((text) => text
            .setPlaceholder(`Enter details for ${this.eventName}...`)
            .onChange((value) => {
            this.details = value;
        }));
        new Setting(contentEl)
            .addButton((btn) => btn
            .setButtonText("Cancel")
            .setWarning()
            .onClick(() => {
            this.close();
        }))
            .addButton((btn) => btn
            .setButtonText("Submit")
            .setCta()
            .onClick(() => {
            this.close();
            if (!this.details) {
                new Notice(t("Please enter details"));
                return;
            }
            this.onSubmit(this.details);
        }));
    }
    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFiaXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJoYWJpdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUNOLFNBQVMsRUFFVCxLQUFLLEVBQ0wsT0FBTyxFQUNQLE1BQU0sRUFDTixlQUFlLEVBQ2Ysb0JBQW9CLEdBQ3BCLE1BQU0sVUFBVSxDQUFDO0FBU2xCLE9BQU8sRUFDTixjQUFjLEVBQ2QsY0FBYyxFQUNkLGtCQUFrQixFQUNsQixnQkFBZ0IsR0FDaEIsTUFBTSxtQkFBbUIsQ0FBQyxDQUFDLGdDQUFnQztBQUM1RCxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDMUMsT0FBTyxvQkFBb0IsQ0FBQztBQUM1QixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFFekYsTUFBTSxPQUFPLEtBQU0sU0FBUSxTQUFTO0lBSW5DLFlBQVksTUFBNkIsRUFBRSxRQUFxQjtRQUMvRCxLQUFLLEVBQUUsQ0FBQztRQXlCVCwrQkFBK0I7UUFDL0IsV0FBTSxHQUFHLEdBQUcsRUFBRTtZQUNiLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDO1lBQy9DLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyx5QkFBeUI7WUFFbkQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsNkJBQTZCO1lBRWpFLElBQUksQ0FBQyxNQUFNLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQ25DLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2FBQ3hCO2lCQUFNO2dCQUNOLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDN0I7WUFDRCxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsR0FBRyxXQUFXLENBQUMsQ0FBQywwQkFBMEI7UUFDckUsQ0FBQyxDQUFDO1FBckNELElBQUks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QUUsQ0FDbEIsR0FBRzthQUNELGFBQWEsQ0FBQyxRQUFRLENBQUM7YUFDdkIsTUFBTSxFQUFFO2FBQ1IsT0FBTyxDQUFDLEdBQUcsRUFBRTtZQUNiLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNiLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFO2dCQUNsQixJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDO2dCQUN0QyxPQUFPO2FBQ1A7WUFDRCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM3QixDQUFDLENBQUMsQ0FDSCxDQUFDO0lBQ0osQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLEVBQUMsU0FBUyxFQUFDLEdBQUcsSUFBSSxDQUFDO1FBQ3ZCLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNuQixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xyXG5cdENvbXBvbmVudCxcclxuXHRBcHAsXHJcblx0TW9kYWwsXHJcblx0U2V0dGluZyxcclxuXHROb3RpY2UsXHJcblx0QnV0dG9uQ29tcG9uZW50LFxyXG5cdEV4dHJhQnV0dG9uQ29tcG9uZW50LFxyXG59IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQge1xyXG5cdEhhYml0UHJvcHMsXHJcblx0RGFpbHlIYWJpdFByb3BzLFxyXG5cdENvdW50SGFiaXRQcm9wcyxcclxuXHRTY2hlZHVsZWRIYWJpdFByb3BzLFxyXG5cdE1hcHBpbmdIYWJpdFByb3BzLFxyXG59IGZyb20gXCJAL3R5cGVzL2hhYml0LWNhcmRcIjsgLy8gQXNzdW1pbmcgdHlwZXMgYXJlIGluIHNyYy90eXBlc1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7XHJcblx0RGFpbHlIYWJpdENhcmQsXHJcblx0Q291bnRIYWJpdENhcmQsXHJcblx0U2NoZWR1bGVkSGFiaXRDYXJkLFxyXG5cdE1hcHBpbmdIYWJpdENhcmQsXHJcbn0gZnJvbSBcIi4vaGFiaXRjYXJkL2luZGV4XCI7IC8vIEltcG9ydCB0aGUgaGFiaXQgY2FyZCBjbGFzc2VzXHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCBcIkAvc3R5bGVzL2hhYml0LmNzc1wiO1xyXG5pbXBvcnQgeyBIYWJpdEVkaXREaWFsb2cgfSBmcm9tIFwiQC9jb21wb25lbnRzL2ZlYXR1cmVzL2hhYml0L2NvbXBvbmVudHMvSGFiaXRFZGl0RGlhbG9nXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgSGFiaXQgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luO1xyXG5cdGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudDsgLy8gVGhlIGVsZW1lbnQgd2hlcmUgdGhlIHZpZXcgd2lsbCBiZSByZW5kZXJlZFxyXG5cclxuXHRjb25zdHJ1Y3RvcihwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbiwgcGFyZW50RWw6IEhUTUxFbGVtZW50KSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsID0gcGFyZW50RWwuY3JlYXRlRGl2KFwidGctaGFiaXQtY29tcG9uZW50LWNvbnRhaW5lclwiKTtcclxuXHR9XHJcblxyXG5cdGFzeW5jIG9ubG9hZCgpIHtcclxuXHRcdGlmICh0aGlzLnBsdWdpbikge1xyXG5cdFx0XHQvLyBDYXN0IHRvIGFueSB0byBhdm9pZCBUeXBlU2NyaXB0IGVycm9yIGFib3V0IGV2ZW50IG5hbWVcclxuXHRcdFx0dGhpcy5yZWdpc3RlckV2ZW50KFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLmFwcC53b3Jrc3BhY2Uub24oXHJcblx0XHRcdFx0XHRcInRhc2stZ2VuaXVzOmhhYml0LWluZGV4LXVwZGF0ZWRcIixcclxuXHRcdFx0XHRcdCgpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5yZWRyYXcoKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHQpXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblx0XHR0aGlzLnJlZHJhdygpOyAvLyBJbml0aWFsIGRyYXdcclxuXHR9XHJcblxyXG5cdG9udW5sb2FkKCkge1xyXG5cdFx0Y29uc29sZS5sb2coXCJIYWJpdFZpZXcgdW5sb2FkZWQuXCIpO1xyXG5cdFx0dGhpcy5jb250YWluZXJFbC5lbXB0eSgpOyAvLyBDbGVhciB0aGUgY29udGFpbmVyIG9uIHVubG9hZFxyXG5cdH1cclxuXHJcblx0Ly8gUmVkcmF3IHRoZSBlbnRpcmUgaGFiaXQgdmlld1xyXG5cdHJlZHJhdyA9ICgpID0+IHtcclxuXHRcdGNvbnN0IHNjcm9sbFN0YXRlID0gdGhpcy5jb250YWluZXJFbC5zY3JvbGxUb3A7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLmVtcHR5KCk7IC8vIENsZWFyIHByZXZpb3VzIGNvbnRlbnRcclxuXHJcblx0XHRjb25zdCBoYWJpdHMgPSB0aGlzLmdldEhhYml0RGF0YSgpOyAvLyBNZXRob2QgdG8gZmV0Y2ggaGFiaXQgZGF0YVxyXG5cclxuXHRcdGlmICghaGFiaXRzIHx8IGhhYml0cy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0dGhpcy5yZW5kZXJFbXB0eVN0YXRlKCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLnJlbmRlckhhYml0TGlzdChoYWJpdHMpO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5jb250YWluZXJFbC5zY3JvbGxUb3AgPSBzY3JvbGxTdGF0ZTsgLy8gUmVzdG9yZSBzY3JvbGwgcG9zaXRpb25cclxuXHR9O1xyXG5cclxuXHRnZXRIYWJpdERhdGEoKTogSGFiaXRQcm9wc1tdIHtcclxuXHRcdGNvbnN0IGhhYml0cyA9IHRoaXMucGx1Z2luLmhhYml0TWFuYWdlcj8uaGFiaXRzIHx8IFtdO1xyXG5cdFx0cmV0dXJuIGhhYml0cztcclxuXHR9XHJcblxyXG5cdHJlbmRlckVtcHR5U3RhdGUoKSB7XHJcblx0XHRjb25zdCBlbXB0eURpdiA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImhhYml0LWVtcHR5LXN0YXRlXCIsXHJcblx0XHR9KTtcclxuXHRcdGVtcHR5RGl2LmNyZWF0ZUVsKFwiaDJcIiwge3RleHQ6IHQoXCJObyBIYWJpdHMgWWV0XCIpfSk7XHJcblx0XHRlbXB0eURpdi5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFwiQ2xpY2sgdGhlIG9wZW4gaGFiaXQgYnV0dG9uIHRvIGNyZWF0ZSBhIG5ldyBoYWJpdC5cIiksXHJcblx0XHR9KTsgLy8gQWRqdXN0IHRleHQgYmFzZWQgb24gVUlcclxuXHRcdGVtcHR5RGl2LmNyZWF0ZUVsKFwiYnJcIik7XHJcblx0XHRuZXcgQnV0dG9uQ29tcG9uZW50KGVtcHR5RGl2KVxyXG5cdFx0XHQuc2V0QnV0dG9uVGV4dChcIk9wZW4gSGFiaXRcIilcclxuXHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMucGx1Z2luLmFwcC5zZXR0aW5nLm9wZW4oKTtcclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5hcHAuc2V0dGluZy5vcGVuVGFiQnlJZCh0aGlzLnBsdWdpbi5tYW5pZmVzdC5pZCk7XHJcblxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdUYWIub3BlblRhYihcImhhYml0XCIpO1xyXG5cdFx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHJlbmRlckhhYml0TGlzdChoYWJpdHM6IEhhYml0UHJvcHNbXSkge1xyXG5cdFx0Y29uc29sZS5sb2coXCJyZW5kZXJIYWJpdExpc3RcIiwgaGFiaXRzKTtcclxuXHRcdGNvbnN0IGxpc3RDb250YWluZXIgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJoYWJpdC1saXN0LWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0aGFiaXRzLmZvckVhY2goKGhhYml0KSA9PiB7XHJcblx0XHRcdGNvbnN0IGhhYml0Q2FyZENvbnRhaW5lciA9IGxpc3RDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwiaGFiaXQtY2FyZC13cmFwcGVyXCIsXHJcblx0XHRcdH0pOyAvLyBXcmFwcGVyIGZvciBjb250ZXh0IG1lbnUsIGV0Yy5cclxuXHRcdFx0dGhpcy5yZW5kZXJIYWJpdENhcmQoaGFiaXRDYXJkQ29udGFpbmVyLCBoYWJpdCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBBZGQgY3JlYXRlIG5ldyBoYWJpdCBidXR0b24gYXQgdGhlIGJvdHRvbSBsZWZ0XHJcblx0XHRjb25zdCBidXR0b25Db250YWluZXIgPSBsaXN0Q29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJoYWJpdC1jcmVhdGUtYnV0dG9uLWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0bmV3IEV4dHJhQnV0dG9uQ29tcG9uZW50KGJ1dHRvbkNvbnRhaW5lcilcclxuXHRcdFx0LnNldEljb24oXCJwbHVzXCIpXHJcblx0XHRcdC5zZXRUb29sdGlwKHQoXCJDcmVhdGUgbmV3IGhhYml0XCIpKVxyXG5cdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5vcGVuQ3JlYXRlSGFiaXREaWFsb2coKTtcclxuXHRcdFx0fSk7XHJcblx0fVxyXG5cclxuXHRvcGVuQ3JlYXRlSGFiaXREaWFsb2coKSB7XHJcblx0XHRuZXcgSGFiaXRFZGl0RGlhbG9nKFxyXG5cdFx0XHR0aGlzLnBsdWdpbi5hcHAsXHJcblx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHRudWxsLCAvLyBudWxsIGZvciBuZXcgaGFiaXRcclxuXHRcdFx0YXN5bmMgKGhhYml0RGF0YSkgPT4ge1xyXG5cdFx0XHRcdC8vIFNhdmUgdGhlIG5ldyBoYWJpdFxyXG5cdFx0XHRcdGlmICghdGhpcy5wbHVnaW4uc2V0dGluZ3MuaGFiaXQuaGFiaXRzKSB7XHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5oYWJpdC5oYWJpdHMgPSBbXTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuaGFiaXQuaGFiaXRzLnB1c2goaGFiaXREYXRhKTtcclxuXHRcdFx0XHRhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHJcblx0XHRcdFx0Ly8gUmVsb2FkIGhhYml0c1xyXG5cdFx0XHRcdGlmICh0aGlzLnBsdWdpbi5oYWJpdE1hbmFnZXIpIHtcclxuXHRcdFx0XHRcdGF3YWl0IHRoaXMucGx1Z2luLmhhYml0TWFuYWdlci5pbml0aWFsaXplSGFiaXRzKCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRuZXcgTm90aWNlKHQoXCJIYWJpdCBjcmVhdGVkIHN1Y2Nlc3NmdWxseVwiKSk7XHJcblx0XHRcdFx0dGhpcy5yZWRyYXcoKTtcclxuXHRcdFx0fVxyXG5cdFx0KS5vcGVuKCk7XHJcblx0fVxyXG5cclxuXHRyZW5kZXJIYWJpdENhcmQoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgaGFiaXQ6IEhhYml0UHJvcHMpIHtcclxuXHRcdC8vIEVuc3VyZSBjb21wbGV0aW9ucyBpcyBhbiBvYmplY3RcclxuXHRcdGhhYml0LmNvbXBsZXRpb25zID0gaGFiaXQuY29tcGxldGlvbnMgfHwge307XHJcblxyXG5cdFx0c3dpdGNoIChoYWJpdC50eXBlKSB7XHJcblx0XHRcdGNhc2UgXCJkYWlseVwiOlxyXG5cdFx0XHRcdGNvbnN0IGRhaWx5Q2FyZCA9IG5ldyBEYWlseUhhYml0Q2FyZChcclxuXHRcdFx0XHRcdGhhYml0IGFzIERhaWx5SGFiaXRQcm9wcyxcclxuXHRcdFx0XHRcdGNvbnRhaW5lcixcclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHR0aGlzLmFkZENoaWxkKGRhaWx5Q2FyZCk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgXCJjb3VudFwiOlxyXG5cdFx0XHRcdGNvbnN0IGNvdW50Q2FyZCA9IG5ldyBDb3VudEhhYml0Q2FyZChcclxuXHRcdFx0XHRcdGhhYml0IGFzIENvdW50SGFiaXRQcm9wcyxcclxuXHRcdFx0XHRcdGNvbnRhaW5lcixcclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHR0aGlzLmFkZENoaWxkKGNvdW50Q2FyZCk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgXCJzY2hlZHVsZWRcIjpcclxuXHRcdFx0XHRjb25zdCBzY2hlZHVsZWRDYXJkID0gbmV3IFNjaGVkdWxlZEhhYml0Q2FyZChcclxuXHRcdFx0XHRcdGhhYml0IGFzIFNjaGVkdWxlZEhhYml0UHJvcHMsXHJcblx0XHRcdFx0XHRjb250YWluZXIsXHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpblxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0dGhpcy5hZGRDaGlsZChzY2hlZHVsZWRDYXJkKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBcIm1hcHBpbmdcIjpcclxuXHRcdFx0XHRjb25zdCBtYXBwaW5nQ2FyZCA9IG5ldyBNYXBwaW5nSGFiaXRDYXJkKFxyXG5cdFx0XHRcdFx0aGFiaXQgYXMgTWFwcGluZ0hhYml0UHJvcHMsXHJcblx0XHRcdFx0XHRjb250YWluZXIsXHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpblxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0dGhpcy5hZGRDaGlsZChtYXBwaW5nQ2FyZCk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0Ly8gVXNlIGEgdHlwZSBhc3NlcnRpb24gdG8gaGFuZGxlIHBvdGVudGlhbCBmdXR1cmUgdHlwZXMgb3IgZXJyb3JzXHJcblx0XHRcdFx0Y29uc3QgdW5rbm93bkhhYml0ID0gaGFiaXQgYXMgYW55O1xyXG5cdFx0XHRcdGNvbnNvbGUud2FybihgVW5zdXBwb3J0ZWQgaGFiaXQgdHlwZTogJHt1bmtub3duSGFiaXQ/LnR5cGV9YCk7XHJcblx0XHRcdFx0Y29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0XHR0ZXh0OiBgVW5zdXBwb3J0ZWQgaGFiaXQ6ICR7XHJcblx0XHRcdFx0XHRcdHVua25vd25IYWJpdD8ubmFtZSB8fCBcIlVua25vd25cIlxyXG5cdFx0XHRcdFx0fWAsXHJcblx0XHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG4vLyAtLS0gTW9kYWwgZm9yIFNjaGVkdWxlZCBFdmVudCBEZXRhaWxzIC0tLVxyXG5leHBvcnQgY2xhc3MgRXZlbnREZXRhaWxNb2RhbCBleHRlbmRzIE1vZGFsIHtcclxuXHRldmVudE5hbWU6IHN0cmluZztcclxuXHRvblN1Ym1pdDogKGRldGFpbHM6IHN0cmluZykgPT4gdm9pZDtcclxuXHRkZXRhaWxzOiBzdHJpbmcgPSBcIlwiO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdGFwcDogQXBwLFxyXG5cdFx0ZXZlbnROYW1lOiBzdHJpbmcsXHJcblx0XHRvblN1Ym1pdDogKGRldGFpbHM6IHN0cmluZykgPT4gdm9pZFxyXG5cdCkge1xyXG5cdFx0c3VwZXIoYXBwKTtcclxuXHRcdHRoaXMuZXZlbnROYW1lID0gZXZlbnROYW1lO1xyXG5cdFx0dGhpcy5vblN1Ym1pdCA9IG9uU3VibWl0O1xyXG5cdH1cclxuXHJcblx0b25PcGVuKCkge1xyXG5cdFx0Y29uc3Qge2NvbnRlbnRFbH0gPSB0aGlzO1xyXG5cdFx0Y29udGVudEVsLmFkZENsYXNzKFwiaGFiaXQtZXZlbnQtbW9kYWxcIik7XHJcblx0XHRjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7XHJcblx0XHRcdHRleHQ6IGBSZWNvcmQgRGV0YWlscyBmb3IgJHt0aGlzLmV2ZW50TmFtZX1gLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiRGV0YWlsc1wiKS5hZGRUZXh0KCh0ZXh0KSA9PlxyXG5cdFx0XHR0ZXh0XHJcblx0XHRcdFx0LnNldFBsYWNlaG9sZGVyKGBFbnRlciBkZXRhaWxzIGZvciAke3RoaXMuZXZlbnROYW1lfS4uLmApXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5kZXRhaWxzID0gdmFsdWU7XHJcblx0XHRcdFx0fSlcclxuXHRcdCk7XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGVudEVsKVxyXG5cdFx0XHQuYWRkQnV0dG9uKChidG4pID0+XHJcblx0XHRcdFx0YnRuXHJcblx0XHRcdFx0XHQuc2V0QnV0dG9uVGV4dChcIkNhbmNlbFwiKVxyXG5cdFx0XHRcdFx0LnNldFdhcm5pbmcoKVxyXG5cdFx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLmNsb3NlKCk7XHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHQpXHJcblx0XHRcdC5hZGRCdXR0b24oKGJ0bikgPT5cclxuXHRcdFx0XHRidG5cclxuXHRcdFx0XHRcdC5zZXRCdXR0b25UZXh0KFwiU3VibWl0XCIpXHJcblx0XHRcdFx0XHQuc2V0Q3RhKClcclxuXHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0XHRcdFx0XHRpZiAoIXRoaXMuZGV0YWlscykge1xyXG5cdFx0XHRcdFx0XHRcdG5ldyBOb3RpY2UodChcIlBsZWFzZSBlbnRlciBkZXRhaWxzXCIpKTtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0dGhpcy5vblN1Ym1pdCh0aGlzLmRldGFpbHMpO1xyXG5cdFx0XHRcdFx0fSlcclxuXHRcdFx0KTtcclxuXHR9XHJcblxyXG5cdG9uQ2xvc2UoKSB7XHJcblx0XHRsZXQge2NvbnRlbnRFbH0gPSB0aGlzO1xyXG5cdFx0Y29udGVudEVsLmVtcHR5KCk7XHJcblx0fVxyXG59XHJcbiJdfQ==