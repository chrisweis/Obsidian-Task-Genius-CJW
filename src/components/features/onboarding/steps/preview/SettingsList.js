import { t } from "@/translations/helper";
/**
 * Settings List Component - Display key settings summary
 */
export class SettingsList {
    /**
     * Render settings list
     */
    static render(container, config) {
        var _a, _b, _c, _d, _e;
        const section = container.createDiv("config-settings");
        section.createEl("h3", { text: t("Key settings") });
        const list = section.createEl("ul", {
            cls: "settings-summary-list",
        });
        // Progress bars
        if (config.settings.progressBarDisplayMode) {
            this.addSetting(list, t("Progress bars"), this.formatProgressBarMode(config.settings.progressBarDisplayMode));
        }
        // Task status switching
        if (config.settings.enableTaskStatusSwitcher !== undefined) {
            this.addSetting(list, t("Task status switching"), config.settings.enableTaskStatusSwitcher
                ? t("Enabled")
                : t("Disabled"));
        }
        // Quick capture
        if (((_a = config.settings.quickCapture) === null || _a === void 0 ? void 0 : _a.enableQuickCapture) !== undefined) {
            this.addSetting(list, t("Quick capture"), config.settings.quickCapture.enableQuickCapture
                ? t("Enabled")
                : t("Disabled"));
        }
        // Workflow
        if (((_b = config.settings.workflow) === null || _b === void 0 ? void 0 : _b.enableWorkflow) !== undefined) {
            this.addSetting(list, t("Workflow management"), config.settings.workflow.enableWorkflow
                ? t("Enabled")
                : t("Disabled"));
        }
        // Rewards
        if (((_c = config.settings.rewards) === null || _c === void 0 ? void 0 : _c.enableRewards) !== undefined) {
            this.addSetting(list, t("Reward system"), config.settings.rewards.enableRewards
                ? t("Enabled")
                : t("Disabled"));
        }
        // Habits
        if (((_d = config.settings.habit) === null || _d === void 0 ? void 0 : _d.enableHabits) !== undefined) {
            this.addSetting(list, t("Habit tracking"), config.settings.habit.enableHabits
                ? t("Enabled")
                : t("Disabled"));
        }
        // Performance
        if (((_e = config.settings.fileParsingConfig) === null || _e === void 0 ? void 0 : _e.enableWorkerProcessing) !==
            undefined) {
            this.addSetting(list, t("Performance optimization"), config.settings.fileParsingConfig.enableWorkerProcessing
                ? t("Enabled")
                : t("Disabled"));
        }
    }
    /**
     * Add a setting row
     */
    static addSetting(list, label, value) {
        const item = list.createEl("li");
        item.createSpan("setting-label").setText(label + ":");
        item.createSpan("setting-value").setText(value);
    }
    /**
     * Format progress bar mode
     */
    static formatProgressBarMode(mode) {
        switch (mode) {
            case "both":
                return t("Enabled (both graphical and text)");
            default:
                return mode;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2V0dGluZ3NMaXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiU2V0dGluZ3NMaXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUcxQzs7R0FFRztBQUNILE1BQU0sT0FBTyxZQUFZO0lBQ3hCOztPQUVHO0lBQ0gsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFzQixFQUFFLE1BQXdCOztRQUM3RCxNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDdkQsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUVwRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRTtZQUNuQyxHQUFHLEVBQUUsdUJBQXVCO1NBQzVCLENBQUMsQ0FBQztRQUVILGdCQUFnQjtRQUNoQixJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUU7WUFDM0MsSUFBSSxDQUFDLFVBQVUsQ0FDZCxJQUFJLEVBQ0osQ0FBQyxDQUFDLGVBQWUsQ0FBQyxFQUNsQixJQUFJLENBQUMscUJBQXFCLENBQ3pCLE1BQU0sQ0FBQyxRQUFRLENBQUMsc0JBQXNCLENBQ3RDLENBQ0QsQ0FBQztTQUNGO1FBRUQsd0JBQXdCO1FBQ3hCLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsS0FBSyxTQUFTLEVBQUU7WUFDM0QsSUFBSSxDQUFDLFVBQVUsQ0FDZCxJQUFJLEVBQ0osQ0FBQyxDQUFDLHVCQUF1QixDQUFDLEVBQzFCLE1BQU0sQ0FBQyxRQUFRLENBQUMsd0JBQXdCO2dCQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztnQkFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUNoQixDQUFDO1NBQ0Y7UUFFRCxnQkFBZ0I7UUFDaEIsSUFBSSxDQUFBLE1BQUEsTUFBTSxDQUFDLFFBQVEsQ0FBQyxZQUFZLDBDQUFFLGtCQUFrQixNQUFLLFNBQVMsRUFBRTtZQUNuRSxJQUFJLENBQUMsVUFBVSxDQUNkLElBQUksRUFDSixDQUFDLENBQUMsZUFBZSxDQUFDLEVBQ2xCLE1BQU0sQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLGtCQUFrQjtnQkFDOUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7Z0JBQ2QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FDaEIsQ0FBQztTQUNGO1FBRUQsV0FBVztRQUNYLElBQUksQ0FBQSxNQUFBLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSwwQ0FBRSxjQUFjLE1BQUssU0FBUyxFQUFFO1lBQzNELElBQUksQ0FBQyxVQUFVLENBQ2QsSUFBSSxFQUNKLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxFQUN4QixNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxjQUFjO2dCQUN0QyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztnQkFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUNoQixDQUFDO1NBQ0Y7UUFFRCxVQUFVO1FBQ1YsSUFBSSxDQUFBLE1BQUEsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLDBDQUFFLGFBQWEsTUFBSyxTQUFTLEVBQUU7WUFDekQsSUFBSSxDQUFDLFVBQVUsQ0FDZCxJQUFJLEVBQ0osQ0FBQyxDQUFDLGVBQWUsQ0FBQyxFQUNsQixNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxhQUFhO2dCQUNwQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztnQkFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUNoQixDQUFDO1NBQ0Y7UUFFRCxTQUFTO1FBQ1QsSUFBSSxDQUFBLE1BQUEsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLDBDQUFFLFlBQVksTUFBSyxTQUFTLEVBQUU7WUFDdEQsSUFBSSxDQUFDLFVBQVUsQ0FDZCxJQUFJLEVBQ0osQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEVBQ25CLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFlBQVk7Z0JBQ2pDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO2dCQUNkLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQ2hCLENBQUM7U0FDRjtRQUVELGNBQWM7UUFDZCxJQUNDLENBQUEsTUFBQSxNQUFNLENBQUMsUUFBUSxDQUFDLGlCQUFpQiwwQ0FBRSxzQkFBc0I7WUFDekQsU0FBUyxFQUNSO1lBQ0QsSUFBSSxDQUFDLFVBQVUsQ0FDZCxJQUFJLEVBQ0osQ0FBQyxDQUFDLDBCQUEwQixDQUFDLEVBQzdCLE1BQU0sQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsc0JBQXNCO2dCQUN2RCxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztnQkFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUNoQixDQUFDO1NBQ0Y7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSyxNQUFNLENBQUMsVUFBVSxDQUN4QixJQUFpQixFQUNqQixLQUFhLEVBQ2IsS0FBYTtRQUViLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQ3RELElBQUksQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2pELENBQUM7SUFFRDs7T0FFRztJQUNLLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxJQUFZO1FBQ2hELFFBQVEsSUFBSSxFQUFFO1lBQ2IsS0FBSyxNQUFNO2dCQUNWLE9BQU8sQ0FBQyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7WUFDL0M7Z0JBQ0MsT0FBTyxJQUFJLENBQUM7U0FDYjtJQUNGLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCB7IE9uYm9hcmRpbmdDb25maWcgfSBmcm9tIFwiQC9tYW5hZ2Vycy9vbmJvYXJkaW5nLW1hbmFnZXJcIjtcclxuXHJcbi8qKlxyXG4gKiBTZXR0aW5ncyBMaXN0IENvbXBvbmVudCAtIERpc3BsYXkga2V5IHNldHRpbmdzIHN1bW1hcnlcclxuICovXHJcbmV4cG9ydCBjbGFzcyBTZXR0aW5nc0xpc3Qge1xyXG5cdC8qKlxyXG5cdCAqIFJlbmRlciBzZXR0aW5ncyBsaXN0XHJcblx0ICovXHJcblx0c3RhdGljIHJlbmRlcihjb250YWluZXI6IEhUTUxFbGVtZW50LCBjb25maWc6IE9uYm9hcmRpbmdDb25maWcpIHtcclxuXHRcdGNvbnN0IHNlY3Rpb24gPSBjb250YWluZXIuY3JlYXRlRGl2KFwiY29uZmlnLXNldHRpbmdzXCIpO1xyXG5cdFx0c2VjdGlvbi5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogdChcIktleSBzZXR0aW5nc1wiKSB9KTtcclxuXHJcblx0XHRjb25zdCBsaXN0ID0gc2VjdGlvbi5jcmVhdGVFbChcInVsXCIsIHtcclxuXHRcdFx0Y2xzOiBcInNldHRpbmdzLXN1bW1hcnktbGlzdFwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gUHJvZ3Jlc3MgYmFyc1xyXG5cdFx0aWYgKGNvbmZpZy5zZXR0aW5ncy5wcm9ncmVzc0JhckRpc3BsYXlNb2RlKSB7XHJcblx0XHRcdHRoaXMuYWRkU2V0dGluZyhcclxuXHRcdFx0XHRsaXN0LFxyXG5cdFx0XHRcdHQoXCJQcm9ncmVzcyBiYXJzXCIpLFxyXG5cdFx0XHRcdHRoaXMuZm9ybWF0UHJvZ3Jlc3NCYXJNb2RlKFxyXG5cdFx0XHRcdFx0Y29uZmlnLnNldHRpbmdzLnByb2dyZXNzQmFyRGlzcGxheU1vZGVcclxuXHRcdFx0XHQpXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVGFzayBzdGF0dXMgc3dpdGNoaW5nXHJcblx0XHRpZiAoY29uZmlnLnNldHRpbmdzLmVuYWJsZVRhc2tTdGF0dXNTd2l0Y2hlciAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdHRoaXMuYWRkU2V0dGluZyhcclxuXHRcdFx0XHRsaXN0LFxyXG5cdFx0XHRcdHQoXCJUYXNrIHN0YXR1cyBzd2l0Y2hpbmdcIiksXHJcblx0XHRcdFx0Y29uZmlnLnNldHRpbmdzLmVuYWJsZVRhc2tTdGF0dXNTd2l0Y2hlclxyXG5cdFx0XHRcdFx0PyB0KFwiRW5hYmxlZFwiKVxyXG5cdFx0XHRcdFx0OiB0KFwiRGlzYWJsZWRcIilcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBRdWljayBjYXB0dXJlXHJcblx0XHRpZiAoY29uZmlnLnNldHRpbmdzLnF1aWNrQ2FwdHVyZT8uZW5hYmxlUXVpY2tDYXB0dXJlICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0dGhpcy5hZGRTZXR0aW5nKFxyXG5cdFx0XHRcdGxpc3QsXHJcblx0XHRcdFx0dChcIlF1aWNrIGNhcHR1cmVcIiksXHJcblx0XHRcdFx0Y29uZmlnLnNldHRpbmdzLnF1aWNrQ2FwdHVyZS5lbmFibGVRdWlja0NhcHR1cmVcclxuXHRcdFx0XHRcdD8gdChcIkVuYWJsZWRcIilcclxuXHRcdFx0XHRcdDogdChcIkRpc2FibGVkXCIpXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gV29ya2Zsb3dcclxuXHRcdGlmIChjb25maWcuc2V0dGluZ3Mud29ya2Zsb3c/LmVuYWJsZVdvcmtmbG93ICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0dGhpcy5hZGRTZXR0aW5nKFxyXG5cdFx0XHRcdGxpc3QsXHJcblx0XHRcdFx0dChcIldvcmtmbG93IG1hbmFnZW1lbnRcIiksXHJcblx0XHRcdFx0Y29uZmlnLnNldHRpbmdzLndvcmtmbG93LmVuYWJsZVdvcmtmbG93XHJcblx0XHRcdFx0XHQ/IHQoXCJFbmFibGVkXCIpXHJcblx0XHRcdFx0XHQ6IHQoXCJEaXNhYmxlZFwiKVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJld2FyZHNcclxuXHRcdGlmIChjb25maWcuc2V0dGluZ3MucmV3YXJkcz8uZW5hYmxlUmV3YXJkcyAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdHRoaXMuYWRkU2V0dGluZyhcclxuXHRcdFx0XHRsaXN0LFxyXG5cdFx0XHRcdHQoXCJSZXdhcmQgc3lzdGVtXCIpLFxyXG5cdFx0XHRcdGNvbmZpZy5zZXR0aW5ncy5yZXdhcmRzLmVuYWJsZVJld2FyZHNcclxuXHRcdFx0XHRcdD8gdChcIkVuYWJsZWRcIilcclxuXHRcdFx0XHRcdDogdChcIkRpc2FibGVkXCIpXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSGFiaXRzXHJcblx0XHRpZiAoY29uZmlnLnNldHRpbmdzLmhhYml0Py5lbmFibGVIYWJpdHMgIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHR0aGlzLmFkZFNldHRpbmcoXHJcblx0XHRcdFx0bGlzdCxcclxuXHRcdFx0XHR0KFwiSGFiaXQgdHJhY2tpbmdcIiksXHJcblx0XHRcdFx0Y29uZmlnLnNldHRpbmdzLmhhYml0LmVuYWJsZUhhYml0c1xyXG5cdFx0XHRcdFx0PyB0KFwiRW5hYmxlZFwiKVxyXG5cdFx0XHRcdFx0OiB0KFwiRGlzYWJsZWRcIilcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBQZXJmb3JtYW5jZVxyXG5cdFx0aWYgKFxyXG5cdFx0XHRjb25maWcuc2V0dGluZ3MuZmlsZVBhcnNpbmdDb25maWc/LmVuYWJsZVdvcmtlclByb2Nlc3NpbmcgIT09XHJcblx0XHRcdHVuZGVmaW5lZFxyXG5cdFx0KSB7XHJcblx0XHRcdHRoaXMuYWRkU2V0dGluZyhcclxuXHRcdFx0XHRsaXN0LFxyXG5cdFx0XHRcdHQoXCJQZXJmb3JtYW5jZSBvcHRpbWl6YXRpb25cIiksXHJcblx0XHRcdFx0Y29uZmlnLnNldHRpbmdzLmZpbGVQYXJzaW5nQ29uZmlnLmVuYWJsZVdvcmtlclByb2Nlc3NpbmdcclxuXHRcdFx0XHRcdD8gdChcIkVuYWJsZWRcIilcclxuXHRcdFx0XHRcdDogdChcIkRpc2FibGVkXCIpXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBBZGQgYSBzZXR0aW5nIHJvd1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgc3RhdGljIGFkZFNldHRpbmcoXHJcblx0XHRsaXN0OiBIVE1MRWxlbWVudCxcclxuXHRcdGxhYmVsOiBzdHJpbmcsXHJcblx0XHR2YWx1ZTogc3RyaW5nXHJcblx0KSB7XHJcblx0XHRjb25zdCBpdGVtID0gbGlzdC5jcmVhdGVFbChcImxpXCIpO1xyXG5cdFx0aXRlbS5jcmVhdGVTcGFuKFwic2V0dGluZy1sYWJlbFwiKS5zZXRUZXh0KGxhYmVsICsgXCI6XCIpO1xyXG5cdFx0aXRlbS5jcmVhdGVTcGFuKFwic2V0dGluZy12YWx1ZVwiKS5zZXRUZXh0KHZhbHVlKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEZvcm1hdCBwcm9ncmVzcyBiYXIgbW9kZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgc3RhdGljIGZvcm1hdFByb2dyZXNzQmFyTW9kZShtb2RlOiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0c3dpdGNoIChtb2RlKSB7XHJcblx0XHRcdGNhc2UgXCJib3RoXCI6XHJcblx0XHRcdFx0cmV0dXJuIHQoXCJFbmFibGVkIChib3RoIGdyYXBoaWNhbCBhbmQgdGV4dClcIik7XHJcblx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0cmV0dXJuIG1vZGU7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcbiJdfQ==