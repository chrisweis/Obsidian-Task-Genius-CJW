import { ButtonComponent, ExtraButtonComponent, Modal, Notice, setIcon, } from "obsidian";
import { HabitEditDialog } from "@/components/features/habit/components/HabitEditDialog";
import { t } from "@/translations/helper";
import "@/styles/habit-list.css";
export class HabitList {
    constructor(plugin, containerEl) {
        this.plugin = plugin;
        this.containerEl = containerEl;
        this.app = plugin.app;
        this.render();
    }
    render() {
        const { containerEl } = this;
        containerEl.empty();
        const addButtonContainer = containerEl.createDiv({
            cls: "habit-add-button-container",
        });
        new ButtonComponent(addButtonContainer)
            .setButtonText(t("Add new habit"))
            .setClass("habit-add-button")
            .onClick(() => {
            this.openHabitEditDialog();
        });
        if (!this.plugin.settings.habit) {
            this.plugin.settings.habit = { habits: [], enableHabits: true };
        }
        else if (!this.plugin.settings.habit.enableHabits) {
            this.plugin.settings.habit.enableHabits = true;
        }
        if (!this.plugin.settings.habit.habits) {
            this.plugin.settings.habit.habits = [];
        }
        const habits = this.plugin.settings.habit.habits || [];
        if (habits.length === 0) {
            this.renderEmptyState();
        }
        else {
            this.renderHabitList(habits);
        }
    }
    renderEmptyState() {
        const emptyState = this.containerEl.createDiv({
            cls: "habit-empty-state",
        });
        emptyState.createEl("h2", { text: t("No habits yet") });
        emptyState.createEl("p", {
            text: t("Click the button above to add your first habit"),
        });
    }
    renderHabitList(habits) {
        const { containerEl } = this;
        const listContainer = containerEl.createDiv({
            cls: "habit-items-container",
        });
        habits.forEach((habit) => {
            const habitItem = listContainer.createDiv({ cls: "habit-item" });
            const iconEl = habitItem.createDiv({ cls: "habit-item-icon" });
            setIcon(iconEl, habit.icon || "circle-check");
            const infoEl = habitItem.createDiv({ cls: "habit-item-info" });
            infoEl.createEl("div", {
                cls: "habit-item-name",
                text: habit.name,
            });
            if (habit.description) {
                infoEl.createEl("div", {
                    cls: "habit-item-description",
                    text: habit.description,
                });
            }
            const typeLabels = {
                daily: t("Daily habit"),
                count: t("Count habit"),
                mapping: t("Mapping habit"),
                scheduled: t("Scheduled habit"),
            };
            const typeEl = infoEl.createEl("div", {
                cls: "habit-item-type",
                text: typeLabels[habit.type] || habit.type,
            });
            habitItem.createDiv({
                cls: "habit-item-actions",
            }, (el) => {
                new ExtraButtonComponent(el)
                    .setTooltip(t("Edit"))
                    .setIcon("edit")
                    .onClick(() => {
                    this.openHabitEditDialog(habit);
                });
                new ExtraButtonComponent(el)
                    .setTooltip(t("Delete"))
                    .setIcon("trash")
                    .onClick(() => {
                    this.deleteHabit(habit);
                });
            });
        });
    }
    openHabitEditDialog(habitData) {
        const dialog = new HabitEditDialog(this.app, this.plugin, habitData || null, (updatedHabit) => {
            var _a;
            // 确保habits数组已初始化
            if (!this.plugin.settings.habit.habits) {
                this.plugin.settings.habit.habits = [];
            }
            if (habitData) {
                // 更新已有习惯
                const habits = this.plugin.settings.habit.habits;
                const index = habits.findIndex((h) => h.id === habitData.id);
                if (index > -1) {
                    habits[index] = updatedHabit;
                }
            }
            else {
                // 添加新习惯
                this.plugin.settings.habit.habits.push(updatedHabit);
            }
            // 保存设置并刷新显示
            this.plugin.saveSettings();
            // 重新初始化习惯索引，通知视图刷新
            void ((_a = this.plugin.habitManager) === null || _a === void 0 ? void 0 : _a.initializeHabits());
            this.render();
            new Notice(habitData ? t("Habit updated") : t("Habit added"));
        });
        dialog.open();
    }
    deleteHabit(habit) {
        // 显示确认对话框
        const habitName = habit.name;
        const modal = new Modal(this.app);
        modal.titleEl.setText(t("Delete habit"));
        const content = modal.contentEl.createDiv();
        content.setText(t(`Are you sure you want to delete the habit `) +
            `"${habitName}"?` +
            t("This action cannot be undone."));
        modal.contentEl.createDiv({
            cls: "habit-delete-modal-buttons",
        }, (el) => {
            new ButtonComponent(el)
                .setButtonText(t("Cancel"))
                .setClass("habit-cancel-button")
                .onClick(() => {
                modal.close();
            });
            new ButtonComponent(el)
                .setWarning()
                .setButtonText(t("Delete"))
                .setClass("habit-delete-button-confirm")
                .onClick(() => {
                var _a;
                // 确保habits数组已初始化
                if (!this.plugin.settings.habit.habits) {
                    this.plugin.settings.habit.habits = [];
                    modal.close();
                    return;
                }
                const habits = this.plugin.settings.habit.habits;
                const index = habits.findIndex((h) => h.id === habit.id);
                if (index > -1) {
                    habits.splice(index, 1);
                    this.plugin.saveSettings();
                    // 重新初始化习惯索引，通知视图刷新
                    void ((_a = this.plugin.habitManager) === null || _a === void 0 ? void 0 : _a.initializeHabits());
                    this.render();
                    new Notice(t("Habit deleted"));
                }
                modal.close();
            });
        });
        modal.open();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSGFiaXRTZXR0aW5nTGlzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkhhYml0U2V0dGluZ0xpc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUVOLGVBQWUsRUFDZixvQkFBb0IsRUFDcEIsS0FBSyxFQUNMLE1BQU0sRUFDTixPQUFPLEdBQ1AsTUFBTSxVQUFVLENBQUM7QUFHbEIsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUMxQyxPQUFPLHlCQUF5QixDQUFDO0FBT2pDLE1BQU0sT0FBTyxTQUFTO0lBS3JCLFlBQVksTUFBNkIsRUFBRSxXQUF3QjtRQUNsRSxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztRQUMvQixJQUFJLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUM7UUFDdEIsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ2YsQ0FBQztJQUVELE1BQU07UUFDTCxNQUFNLEVBQUUsV0FBVyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBQzdCLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUVwQixNQUFNLGtCQUFrQixHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQUM7WUFDaEQsR0FBRyxFQUFFLDRCQUE0QjtTQUNqQyxDQUFDLENBQUM7UUFDSCxJQUFJLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQzthQUNyQyxhQUFhLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDO2FBQ2pDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQzthQUM1QixPQUFPLENBQUMsR0FBRyxFQUFFO1lBQ2IsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDNUIsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENB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TUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztnQkFDakQsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FDN0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FDeEIsQ0FBQztnQkFDRixJQUFJLEtBQUssR0FBRyxDQUFDLENBQUMsRUFBRTtvQkFDZixNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDeEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFDM0IsbUJBQW1CO29CQUNuQixLQUFLLENBQUEsTUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksMENBQUUsZ0JBQWdCLEVBQUUsQ0FBQSxDQUFDO29CQUNsRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ2QsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7aUJBQy9CO2dCQUNELEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNmLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUNELENBQUM7UUFFRixLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDZCxDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xyXG5cdEFwcCxcclxuXHRCdXR0b25Db21wb25lbnQsXHJcblx0RXh0cmFCdXR0b25Db21wb25lbnQsXHJcblx0TW9kYWwsXHJcblx0Tm90aWNlLFxyXG5cdHNldEljb24sXHJcbn0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IEJhc2VIYWJpdERhdGEgfSBmcm9tIFwiQC90eXBlcy9oYWJpdC1jYXJkXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjtcclxuaW1wb3J0IHsgSGFiaXRFZGl0RGlhbG9nIH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy9oYWJpdC9jb21wb25lbnRzL0hhYml0RWRpdERpYWxvZ1wiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgXCJAL3N0eWxlcy9oYWJpdC1saXN0LmNzc1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBIYWJpdFNldHRpbmdzIHtcclxuXHRoYWJpdHM6IEJhc2VIYWJpdERhdGFbXTtcclxuXHRlbmFibGVIYWJpdHM6IGJvb2xlYW47XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBIYWJpdExpc3Qge1xyXG5cdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblx0cHJpdmF0ZSBjb250YWluZXJFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBhcHA6IEFwcDtcclxuXHJcblx0Y29uc3RydWN0b3IocGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sIGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCkge1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsID0gY29udGFpbmVyRWw7XHJcblx0XHR0aGlzLmFwcCA9IHBsdWdpbi5hcHA7XHJcblx0XHR0aGlzLnJlbmRlcigpO1xyXG5cdH1cclxuXHJcblx0cmVuZGVyKCk6IHZvaWQge1xyXG5cdFx0Y29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpcztcclxuXHRcdGNvbnRhaW5lckVsLmVtcHR5KCk7XHJcblxyXG5cdFx0Y29uc3QgYWRkQnV0dG9uQ29udGFpbmVyID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImhhYml0LWFkZC1idXR0b24tY29udGFpbmVyXCIsXHJcblx0XHR9KTtcclxuXHRcdG5ldyBCdXR0b25Db21wb25lbnQoYWRkQnV0dG9uQ29udGFpbmVyKVxyXG5cdFx0XHQuc2V0QnV0dG9uVGV4dCh0KFwiQWRkIG5ldyBoYWJpdFwiKSlcclxuXHRcdFx0LnNldENsYXNzKFwiaGFiaXQtYWRkLWJ1dHRvblwiKVxyXG5cdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5vcGVuSGFiaXRFZGl0RGlhbG9nKCk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdGlmICghdGhpcy5wbHVnaW4uc2V0dGluZ3MuaGFiaXQpIHtcclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuaGFiaXQgPSB7IGhhYml0czogW10sIGVuYWJsZUhhYml0czogdHJ1ZSB9O1xyXG5cdFx0fSBlbHNlIGlmICghdGhpcy5wbHVnaW4uc2V0dGluZ3MuaGFiaXQuZW5hYmxlSGFiaXRzKSB7XHJcblx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLmhhYml0LmVuYWJsZUhhYml0cyA9IHRydWU7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKCF0aGlzLnBsdWdpbi5zZXR0aW5ncy5oYWJpdC5oYWJpdHMpIHtcclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuaGFiaXQuaGFiaXRzID0gW107XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgaGFiaXRzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuaGFiaXQuaGFiaXRzIHx8IFtdO1xyXG5cclxuXHRcdGlmIChoYWJpdHMubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdHRoaXMucmVuZGVyRW1wdHlTdGF0ZSgpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy5yZW5kZXJIYWJpdExpc3QoaGFiaXRzKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyRW1wdHlTdGF0ZSgpOiB2b2lkIHtcclxuXHRcdGNvbnN0IGVtcHR5U3RhdGUgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJoYWJpdC1lbXB0eS1zdGF0ZVwiLFxyXG5cdFx0fSk7XHJcblx0XHRlbXB0eVN0YXRlLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiB0KFwiTm8gaGFiaXRzIHlldFwiKSB9KTtcclxuXHRcdGVtcHR5U3RhdGUuY3JlYXRlRWwoXCJwXCIsIHtcclxuXHRcdFx0dGV4dDogdChcIkNsaWNrIHRoZSBidXR0b24gYWJvdmUgdG8gYWRkIHlvdXIgZmlyc3QgaGFiaXRcIiksXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVySGFiaXRMaXN0KGhhYml0czogQmFzZUhhYml0RGF0YVtdKTogdm9pZCB7XHJcblx0XHRjb25zdCB7IGNvbnRhaW5lckVsIH0gPSB0aGlzO1xyXG5cclxuXHRcdGNvbnN0IGxpc3RDb250YWluZXIgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiaGFiaXQtaXRlbXMtY29udGFpbmVyXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHRoYWJpdHMuZm9yRWFjaCgoaGFiaXQpID0+IHtcclxuXHRcdFx0Y29uc3QgaGFiaXRJdGVtID0gbGlzdENvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwiaGFiaXQtaXRlbVwiIH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgaWNvbkVsID0gaGFiaXRJdGVtLmNyZWF0ZURpdih7IGNsczogXCJoYWJpdC1pdGVtLWljb25cIiB9KTtcclxuXHRcdFx0c2V0SWNvbihpY29uRWwsIGhhYml0Lmljb24gfHwgXCJjaXJjbGUtY2hlY2tcIik7XHJcblxyXG5cdFx0XHRjb25zdCBpbmZvRWwgPSBoYWJpdEl0ZW0uY3JlYXRlRGl2KHsgY2xzOiBcImhhYml0LWl0ZW0taW5mb1wiIH0pO1xyXG5cdFx0XHRpbmZvRWwuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHRcdGNsczogXCJoYWJpdC1pdGVtLW5hbWVcIixcclxuXHRcdFx0XHR0ZXh0OiBoYWJpdC5uYW1lLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGlmIChoYWJpdC5kZXNjcmlwdGlvbikge1xyXG5cdFx0XHRcdGluZm9FbC5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdFx0XHRjbHM6IFwiaGFiaXQtaXRlbS1kZXNjcmlwdGlvblwiLFxyXG5cdFx0XHRcdFx0dGV4dDogaGFiaXQuZGVzY3JpcHRpb24sXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IHR5cGVMYWJlbHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XHJcblx0XHRcdFx0ZGFpbHk6IHQoXCJEYWlseSBoYWJpdFwiKSxcclxuXHRcdFx0XHRjb3VudDogdChcIkNvdW50IGhhYml0XCIpLFxyXG5cdFx0XHRcdG1hcHBpbmc6IHQoXCJNYXBwaW5nIGhhYml0XCIpLFxyXG5cdFx0XHRcdHNjaGVkdWxlZDogdChcIlNjaGVkdWxlZCBoYWJpdFwiKSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHR5cGVFbCA9IGluZm9FbC5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdFx0Y2xzOiBcImhhYml0LWl0ZW0tdHlwZVwiLFxyXG5cdFx0XHRcdHRleHQ6IHR5cGVMYWJlbHNbaGFiaXQudHlwZV0gfHwgaGFiaXQudHlwZSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRoYWJpdEl0ZW0uY3JlYXRlRGl2KFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGNsczogXCJoYWJpdC1pdGVtLWFjdGlvbnNcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdChlbCkgPT4ge1xyXG5cdFx0XHRcdFx0bmV3IEV4dHJhQnV0dG9uQ29tcG9uZW50KGVsKVxyXG5cdFx0XHRcdFx0XHQuc2V0VG9vbHRpcCh0KFwiRWRpdFwiKSlcclxuXHRcdFx0XHRcdFx0LnNldEljb24oXCJlZGl0XCIpXHJcblx0XHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLm9wZW5IYWJpdEVkaXREaWFsb2coaGFiaXQpO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRuZXcgRXh0cmFCdXR0b25Db21wb25lbnQoZWwpXHJcblx0XHRcdFx0XHRcdC5zZXRUb29sdGlwKHQoXCJEZWxldGVcIikpXHJcblx0XHRcdFx0XHRcdC5zZXRJY29uKFwidHJhc2hcIilcclxuXHRcdFx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMuZGVsZXRlSGFiaXQoaGFiaXQpO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdCk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgb3BlbkhhYml0RWRpdERpYWxvZyhoYWJpdERhdGE/OiBCYXNlSGFiaXREYXRhKTogdm9pZCB7XHJcblx0XHRjb25zdCBkaWFsb2cgPSBuZXcgSGFiaXRFZGl0RGlhbG9nKFxyXG5cdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdGhhYml0RGF0YSB8fCBudWxsLFxyXG5cdFx0XHQodXBkYXRlZEhhYml0OiBCYXNlSGFiaXREYXRhKSA9PiB7XHJcblx0XHRcdFx0Ly8g56Gu5L+daGFiaXRz5pWw57uE5bey5Yid5aeL5YyWXHJcblx0XHRcdFx0aWYgKCF0aGlzLnBsdWdpbi5zZXR0aW5ncy5oYWJpdC5oYWJpdHMpIHtcclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLmhhYml0LmhhYml0cyA9IFtdO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0aWYgKGhhYml0RGF0YSkge1xyXG5cdFx0XHRcdFx0Ly8g5pu05paw5bey5pyJ5Lmg5oOvXHJcblx0XHRcdFx0XHRjb25zdCBoYWJpdHMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5oYWJpdC5oYWJpdHM7XHJcblx0XHRcdFx0XHRjb25zdCBpbmRleCA9IGhhYml0cy5maW5kSW5kZXgoXHJcblx0XHRcdFx0XHRcdChoKSA9PiBoLmlkID09PSBoYWJpdERhdGEuaWRcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRpZiAoaW5kZXggPiAtMSkge1xyXG5cdFx0XHRcdFx0XHRoYWJpdHNbaW5kZXhdID0gdXBkYXRlZEhhYml0O1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHQvLyDmt7vliqDmlrDkuaDmg69cclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLmhhYml0LmhhYml0cy5wdXNoKHVwZGF0ZWRIYWJpdCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyDkv53lrZjorr7nva7lubbliLfmlrDmmL7npLpcclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHQvLyDph43mlrDliJ3lp4vljJbkuaDmg6/ntKLlvJXvvIzpgJrnn6Xop4blm77liLfmlrBcclxuXHRcdFx0XHR2b2lkIHRoaXMucGx1Z2luLmhhYml0TWFuYWdlcj8uaW5pdGlhbGl6ZUhhYml0cygpO1xyXG5cdFx0XHRcdHRoaXMucmVuZGVyKCk7XHJcblx0XHRcdFx0bmV3IE5vdGljZShoYWJpdERhdGEgPyB0KFwiSGFiaXQgdXBkYXRlZFwiKSA6IHQoXCJIYWJpdCBhZGRlZFwiKSk7XHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblxyXG5cdFx0ZGlhbG9nLm9wZW4oKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZGVsZXRlSGFiaXQoaGFiaXQ6IEJhc2VIYWJpdERhdGEpOiB2b2lkIHtcclxuXHRcdC8vIOaYvuekuuehruiupOWvueivneahhlxyXG5cdFx0Y29uc3QgaGFiaXROYW1lID0gaGFiaXQubmFtZTtcclxuXHRcdGNvbnN0IG1vZGFsID0gbmV3IE1vZGFsKHRoaXMuYXBwKTtcclxuXHRcdG1vZGFsLnRpdGxlRWwuc2V0VGV4dCh0KFwiRGVsZXRlIGhhYml0XCIpKTtcclxuXHJcblx0XHRjb25zdCBjb250ZW50ID0gbW9kYWwuY29udGVudEVsLmNyZWF0ZURpdigpO1xyXG5cdFx0Y29udGVudC5zZXRUZXh0KFxyXG5cdFx0XHR0KGBBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gZGVsZXRlIHRoZSBoYWJpdCBgKSArXHJcblx0XHRcdFx0YFwiJHtoYWJpdE5hbWV9XCI/YCArXHJcblx0XHRcdFx0dChcIlRoaXMgYWN0aW9uIGNhbm5vdCBiZSB1bmRvbmUuXCIpXHJcblx0XHQpO1xyXG5cclxuXHRcdG1vZGFsLmNvbnRlbnRFbC5jcmVhdGVEaXYoXHJcblx0XHRcdHtcclxuXHRcdFx0XHRjbHM6IFwiaGFiaXQtZGVsZXRlLW1vZGFsLWJ1dHRvbnNcIixcclxuXHRcdFx0fSxcclxuXHRcdFx0KGVsKSA9PiB7XHJcblx0XHRcdFx0bmV3IEJ1dHRvbkNvbXBvbmVudChlbClcclxuXHRcdFx0XHRcdC5zZXRCdXR0b25UZXh0KHQoXCJDYW5jZWxcIikpXHJcblx0XHRcdFx0XHQuc2V0Q2xhc3MoXCJoYWJpdC1jYW5jZWwtYnV0dG9uXCIpXHJcblx0XHRcdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRcdG1vZGFsLmNsb3NlKCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0bmV3IEJ1dHRvbkNvbXBvbmVudChlbClcclxuXHRcdFx0XHRcdC5zZXRXYXJuaW5nKClcclxuXHRcdFx0XHRcdC5zZXRCdXR0b25UZXh0KHQoXCJEZWxldGVcIikpXHJcblx0XHRcdFx0XHQuc2V0Q2xhc3MoXCJoYWJpdC1kZWxldGUtYnV0dG9uLWNvbmZpcm1cIilcclxuXHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8g56Gu5L+daGFiaXRz5pWw57uE5bey5Yid5aeL5YyWXHJcblx0XHRcdFx0XHRcdGlmICghdGhpcy5wbHVnaW4uc2V0dGluZ3MuaGFiaXQuaGFiaXRzKSB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuaGFiaXQuaGFiaXRzID0gW107XHJcblx0XHRcdFx0XHRcdFx0bW9kYWwuY2xvc2UoKTtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdGNvbnN0IGhhYml0cyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmhhYml0LmhhYml0cztcclxuXHRcdFx0XHRcdFx0Y29uc3QgaW5kZXggPSBoYWJpdHMuZmluZEluZGV4KFxyXG5cdFx0XHRcdFx0XHRcdChoKSA9PiBoLmlkID09PSBoYWJpdC5pZFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRpZiAoaW5kZXggPiAtMSkge1xyXG5cdFx0XHRcdFx0XHRcdGhhYml0cy5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdFx0XHRcdC8vIOmHjeaWsOWIneWni+WMluS5oOaDr+e0ouW8le+8jOmAmuefpeinhuWbvuWIt+aWsFxyXG5cdFx0XHRcdFx0XHRcdHZvaWQgdGhpcy5wbHVnaW4uaGFiaXRNYW5hZ2VyPy5pbml0aWFsaXplSGFiaXRzKCk7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5yZW5kZXIoKTtcclxuXHRcdFx0XHRcdFx0XHRuZXcgTm90aWNlKHQoXCJIYWJpdCBkZWxldGVkXCIpKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRtb2RhbC5jbG9zZSgpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblxyXG5cdFx0bW9kYWwub3BlbigpO1xyXG5cdH1cclxufVxyXG4iXX0=