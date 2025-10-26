import { __awaiter } from "tslib";
import { Setting, Platform } from "obsidian";
import { t } from "@/translations/helper";
export function renderDesktopIntegrationSettingsTab(settingTab, containerEl) {
    var _a;
    // Header
    new Setting(containerEl)
        .setName(t("Desktop Integration"))
        .setDesc(t("Configure system tray, notifications, and desktop features"))
        .setHeading();
    // Desktop only hint
    if (!Platform.isDesktopApp) {
        new Setting(containerEl)
            .setName(t("Desktop only"))
            .setDesc(t("Desktop integration features are only available in the desktop app"));
        return;
    }
    // Enable notifications (global)
    new Setting(containerEl)
        .setName(t("Enable notifications"))
        .setDesc(t("Use system notifications when possible"))
        .addToggle((toggle) => {
        var _a;
        toggle.setValue(!!((_a = settingTab.plugin.settings.notifications) === null || _a === void 0 ? void 0 : _a.enabled));
        toggle.onChange((value) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
            const s = settingTab.plugin.settings;
            s.notifications = Object.assign(Object.assign({}, s.notifications), { enabled: value, dailySummary: {
                    enabled: (_c = (_b = (_a = s.notifications) === null || _a === void 0 ? void 0 : _a.dailySummary) === null || _b === void 0 ? void 0 : _b.enabled) !== null && _c !== void 0 ? _c : true,
                    time: (_f = (_e = (_d = s.notifications) === null || _d === void 0 ? void 0 : _d.dailySummary) === null || _e === void 0 ? void 0 : _e.time) !== null && _f !== void 0 ? _f : "09:00",
                }, perTask: {
                    enabled: (_j = (_h = (_g = s.notifications) === null || _g === void 0 ? void 0 : _g.perTask) === null || _h === void 0 ? void 0 : _h.enabled) !== null && _j !== void 0 ? _j : false,
                    leadMinutes: (_m = (_l = (_k = s.notifications) === null || _k === void 0 ? void 0 : _k.perTask) === null || _l === void 0 ? void 0 : _l.leadMinutes) !== null && _m !== void 0 ? _m : 10,
                } });
            settingTab.applyNotificationsUpdateLight();
            setTimeout(() => {
                settingTab.display();
            }, 200);
        });
    });
    if ((_a = settingTab.plugin.settings.notifications) === null || _a === void 0 ? void 0 : _a.enabled) {
        // Daily summary
        new Setting(containerEl)
            .setName(t("Daily summary"))
            .setDesc(t("Send one notification for today's due tasks at a specific time (HH:mm)"))
            .addToggle((toggle) => {
            var _a;
            const ns = settingTab.plugin.settings.notifications;
            toggle.setValue(!!((_a = ns === null || ns === void 0 ? void 0 : ns.dailySummary) === null || _a === void 0 ? void 0 : _a.enabled));
            toggle.onChange((value) => {
                var _a, _b, _c;
                const s = settingTab.plugin.settings;
                s.notifications = Object.assign(Object.assign({}, s.notifications), { dailySummary: {
                        enabled: value,
                        time: (_c = (_b = (_a = s.notifications) === null || _a === void 0 ? void 0 : _a.dailySummary) === null || _b === void 0 ? void 0 : _b.time) !== null && _c !== void 0 ? _c : "09:00",
                    } });
                settingTab.applyNotificationsUpdateLight();
            });
        })
            .addText((text) => {
            var _a, _b;
            const time = ((_b = (_a = settingTab.plugin.settings.notifications) === null || _a === void 0 ? void 0 : _a.dailySummary) === null || _b === void 0 ? void 0 : _b.time) || "09:00";
            text.setPlaceholder("09:00")
                .setValue(time)
                .onChange((val) => {
                var _a, _b, _c;
                const s = settingTab.plugin.settings;
                s.notifications = Object.assign(Object.assign({}, s.notifications), { dailySummary: {
                        enabled: (_c = (_b = (_a = s.notifications) === null || _a === void 0 ? void 0 : _a.dailySummary) === null || _b === void 0 ? void 0 : _b.enabled) !== null && _c !== void 0 ? _c : true,
                        time: val || "09:00",
                    } });
                settingTab.applyNotificationsUpdateLight();
            });
            // Change input type to time picker
            text.inputEl.type = "time";
        })
            .addButton((btn) => {
            btn.setButtonText(t("Send now"));
            btn.onClick(() => __awaiter(this, void 0, void 0, function* () {
                var _a;
                yield ((_a = settingTab.plugin.notificationManager) === null || _a === void 0 ? void 0 : _a.triggerDailySummary());
            }));
        });
        // Per task reminders
        new Setting(containerEl)
            .setName(t("Per-task reminders"))
            .setDesc(t("Notify shortly before each task's due time"))
            .addToggle((toggle) => {
            var _a;
            const ns = settingTab.plugin.settings.notifications;
            toggle.setValue(!!((_a = ns === null || ns === void 0 ? void 0 : ns.perTask) === null || _a === void 0 ? void 0 : _a.enabled));
            toggle.onChange((value) => {
                var _a, _b, _c;
                const s = settingTab.plugin.settings;
                s.notifications = Object.assign(Object.assign({}, s.notifications), { perTask: {
                        enabled: value,
                        leadMinutes: (_c = (_b = (_a = s.notifications) === null || _a === void 0 ? void 0 : _a.perTask) === null || _b === void 0 ? void 0 : _b.leadMinutes) !== null && _c !== void 0 ? _c : 10,
                    } });
                settingTab.applyNotificationsUpdateLight();
            });
        })
            .addText((text) => {
            var _a, _b, _c;
            const lead = String((_c = (_b = (_a = settingTab.plugin.settings.notifications) === null || _a === void 0 ? void 0 : _a.perTask) === null || _b === void 0 ? void 0 : _b.leadMinutes) !== null && _c !== void 0 ? _c : 10);
            text.setPlaceholder("10")
                .setValue(lead)
                .onChange((val) => {
                var _a, _b, _c;
                const minutes = Math.max(0, parseInt(val || "0", 10) || 0);
                const s = settingTab.plugin.settings;
                s.notifications = Object.assign(Object.assign({}, s.notifications), { perTask: {
                        enabled: (_c = (_b = (_a = s.notifications) === null || _a === void 0 ? void 0 : _a.perTask) === null || _b === void 0 ? void 0 : _b.enabled) !== null && _c !== void 0 ? _c : false,
                        leadMinutes: minutes,
                    } });
                settingTab.applyNotificationsUpdateLight();
            });
            // Change input type to number with constraints
            text.inputEl.type = "number";
            text.inputEl.min = "0";
            text.inputEl.max = "1440"; // Max 24 hours in minutes
            text.inputEl.step = "5"; // Step by 5 minutes
        })
            .addButton((btn) => {
            btn.setButtonText(t("Scan now"));
            btn.onClick(() => { var _a; return (_a = settingTab.plugin.notificationManager) === null || _a === void 0 ? void 0 : _a.triggerImminentScan(); });
        });
    }
    // Tray / Quick access
    new Setting(containerEl)
        .setName(t("Tray indicator"))
        .setDesc(t("Show a bell with count in system tray, status bar, or both"))
        .addDropdown((dd) => {
        const s = settingTab.plugin.settings;
        s.desktopIntegration = s.desktopIntegration || {
            enableTray: false,
        };
        const mode = s.desktopIntegration.trayMode || "status";
        dd.addOptions({
            system: "System tray",
            status: "Status bar",
            both: "Both",
        })
            .setValue(mode)
            .onChange((v) => {
            s.desktopIntegration = Object.assign(Object.assign({}, s.desktopIntegration), { trayMode: v, enableTray: v !== "status" });
            settingTab.applyNotificationsUpdateLight();
        });
    })
        .addButton((btn) => {
        btn.setButtonText(t("Update now"));
        btn.onClick(() => __awaiter(this, void 0, void 0, function* () {
            var _a;
            yield ((_a = settingTab.plugin.notificationManager) === null || _a === void 0 ? void 0 : _a.triggerDailySummary());
        }));
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGVza3RvcEludGVncmF0aW9uU2V0dGluZ3NUYWIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJEZXNrdG9wSW50ZWdyYXRpb25TZXR0aW5nc1RhYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDN0MsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBSTFDLE1BQU0sVUFBVSxtQ0FBbUMsQ0FDbEQsVUFBcUMsRUFDckMsV0FBd0I7O0lBRXhCLFNBQVM7SUFDVCxJQUFJLE9BQU8sQ0FBQyxXQUFXLENBQUM7U0FDdEIsT0FBTyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1NBQ2pDLE9BQU8sQ0FDUCxDQUFDLENBQUMsNERBQTRELENBQUMsQ0FDL0Q7U0FDQSxVQUFVLEVBQUUsQ0FBQztJQUVmLG9CQUFvQjtJQUNwQixJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRTtRQUMzQixJQUFJLE9BQU8sQ0FBQyxXQUFXLENBQUM7YUFDdEIsT0FBTyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQzthQUMxQixPQUFPLENBQ1AsQ0FBQyxDQUNBLG9FQUFvRSxDQUNwRSxDQUNELENBQUM7UUFDSCxPQUFPO0tBQ1A7SUFFRCxnQ0FBZ0M7SUFDaEMsSUFBSSxPQUFPLENBQUMsV0FBVyxDQUFDO1NBQ3RCLE9BQU8sQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsQ0FBQztTQUNsQyxPQUFPLENBQUMsQ0FBQyxDQUFDLHdDQUF3QyxDQUFDLENBQUM7U0FDcEQsU0FBUyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7O1FBQ3JCLE1BQU0sQ0FBQyxRQUFRLENBQ2QsQ0FBQyxDQUFDLENBQUEsTUFBQSxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxhQUFhLDBDQUFFLE9BQU8sQ0FBQSxDQUNuRCxDQUFDO1FBQ0YsTUFBTSxD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O1lBQ2IsTUFBTSxFQUFFLGFBQWE7WUFDckIsTUFBTSxFQUFFLFlBQVk7WUFDcEIsSUFBSSxFQUFFLE1BQU07U0FDWixDQUFDO2FBQ0EsUUFBUSxDQUFDLElBQUksQ0FBQzthQUNkLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ2YsQ0FBQyxDQUFDLGtCQUFrQixtQ0FDaEIsQ0FBQyxDQUFDLGtCQUFrQixLQUN2QixRQUFRLEVBQUUsQ0FBUSxFQUNsQixVQUFVLEVBQUUsQ0FBQyxLQUFLLFFBQVEsR0FDMUIsQ0FBQztZQUNGLFVBQVUsQ0FBQyw2QkFBNkIsRUFBRSxDQUFDO1FBQzVDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDO1NBQ0QsU0FBUyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7UUFDbEIsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUNuQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQVMsRUFBRTs7WUFDdEIsTUFBTSxDQUFBLE1BQUEsVUFBVSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsMENBQUUsbUJBQW1CLEVBQUUsQ0FBQSxDQUFDO1FBQ3BFLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTZXR0aW5nLCBQbGF0Zm9ybSB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgeyBUYXNrUHJvZ3Jlc3NCYXJTZXR0aW5nVGFiIH0gZnJvbSBcIkAvc2V0dGluZ1wiO1xyXG5pbXBvcnQgeyBERUZBVUxUX1NFVFRJTkdTIH0gZnJvbSBcIkAvY29tbW9uL3NldHRpbmctZGVmaW5pdGlvblwiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlckRlc2t0b3BJbnRlZ3JhdGlvblNldHRpbmdzVGFiKFxyXG5cdHNldHRpbmdUYWI6IFRhc2tQcm9ncmVzc0JhclNldHRpbmdUYWIsXHJcblx0Y29udGFpbmVyRWw6IEhUTUxFbGVtZW50XHJcbikge1xyXG5cdC8vIEhlYWRlclxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIkRlc2t0b3AgSW50ZWdyYXRpb25cIikpXHJcblx0XHQuc2V0RGVzYyhcclxuXHRcdFx0dChcIkNvbmZpZ3VyZSBzeXN0ZW0gdHJheSwgbm90aWZpY2F0aW9ucywgYW5kIGRlc2t0b3AgZmVhdHVyZXNcIilcclxuXHRcdClcclxuXHRcdC5zZXRIZWFkaW5nKCk7XHJcblxyXG5cdC8vIERlc2t0b3Agb25seSBoaW50XHJcblx0aWYgKCFQbGF0Zm9ybS5pc0Rlc2t0b3BBcHApIHtcclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiRGVza3RvcCBvbmx5XCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XCJEZXNrdG9wIGludGVncmF0aW9uIGZlYXR1cmVzIGFyZSBvbmx5IGF2YWlsYWJsZSBpbiB0aGUgZGVza3RvcCBhcHBcIlxyXG5cdFx0XHRcdClcclxuXHRcdFx0KTtcclxuXHRcdHJldHVybjtcclxuXHR9XHJcblxyXG5cdC8vIEVuYWJsZSBub3RpZmljYXRpb25zIChnbG9iYWwpXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiRW5hYmxlIG5vdGlmaWNhdGlvbnNcIikpXHJcblx0XHQuc2V0RGVzYyh0KFwiVXNlIHN5c3RlbSBub3RpZmljYXRpb25zIHdoZW4gcG9zc2libGVcIikpXHJcblx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcclxuXHRcdFx0dG9nZ2xlLnNldFZhbHVlKFxyXG5cdFx0XHRcdCEhc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3Mubm90aWZpY2F0aW9ucz8uZW5hYmxlZFxyXG5cdFx0XHQpO1xyXG5cdFx0XHR0b2dnbGUub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgcyA9IHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzO1xyXG5cdFx0XHRcdHMubm90aWZpY2F0aW9ucyA9IHtcclxuXHRcdFx0XHRcdC4uLnMubm90aWZpY2F0aW9ucyxcclxuXHRcdFx0XHRcdGVuYWJsZWQ6IHZhbHVlLFxyXG5cdFx0XHRcdFx0ZGFpbHlTdW1tYXJ5OiB7XHJcblx0XHRcdFx0XHRcdGVuYWJsZWQ6IHMubm90aWZpY2F0aW9ucz8uZGFpbHlTdW1tYXJ5Py5lbmFibGVkID8/IHRydWUsXHJcblx0XHRcdFx0XHRcdHRpbWU6IHMubm90aWZpY2F0aW9ucz8uZGFpbHlTdW1tYXJ5Py50aW1lID8/IFwiMDk6MDBcIixcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRwZXJUYXNrOiB7XHJcblx0XHRcdFx0XHRcdGVuYWJsZWQ6IHMubm90aWZpY2F0aW9ucz8ucGVyVGFzaz8uZW5hYmxlZCA/PyBmYWxzZSxcclxuXHRcdFx0XHRcdFx0bGVhZE1pbnV0ZXM6XHJcblx0XHRcdFx0XHRcdFx0cy5ub3RpZmljYXRpb25zPy5wZXJUYXNrPy5sZWFkTWludXRlcyA/PyAxMCxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5Tm90aWZpY2F0aW9uc1VwZGF0ZUxpZ2h0KCk7XHJcblxyXG5cdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5kaXNwbGF5KCk7XHJcblx0XHRcdFx0fSwgMjAwKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0aWYgKHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLm5vdGlmaWNhdGlvbnM/LmVuYWJsZWQpIHtcclxuXHRcdC8vIERhaWx5IHN1bW1hcnlcclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiRGFpbHkgc3VtbWFyeVwiKSlcclxuXHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFwiU2VuZCBvbmUgbm90aWZpY2F0aW9uIGZvciB0b2RheSdzIGR1ZSB0YXNrcyBhdCBhIHNwZWNpZmljIHRpbWUgKEhIOm1tKVwiXHJcblx0XHRcdFx0KVxyXG5cdFx0XHQpXHJcblx0XHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IG5zID0gc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3Mubm90aWZpY2F0aW9ucztcclxuXHRcdFx0XHR0b2dnbGUuc2V0VmFsdWUoISFucz8uZGFpbHlTdW1tYXJ5Py5lbmFibGVkKTtcclxuXHRcdFx0XHR0b2dnbGUub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRjb25zdCBzID0gc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3M7XHJcblx0XHRcdFx0XHRzLm5vdGlmaWNhdGlvbnMgPSB7XHJcblx0XHRcdFx0XHRcdC4uLnMubm90aWZpY2F0aW9ucyxcclxuXHRcdFx0XHRcdFx0ZGFpbHlTdW1tYXJ5OiB7XHJcblx0XHRcdFx0XHRcdFx0ZW5hYmxlZDogdmFsdWUsXHJcblx0XHRcdFx0XHRcdFx0dGltZTpcclxuXHRcdFx0XHRcdFx0XHRcdHMubm90aWZpY2F0aW9ucz8uZGFpbHlTdW1tYXJ5Py50aW1lID8/IFwiMDk6MDBcIixcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdH0gYXMgYW55O1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseU5vdGlmaWNhdGlvbnNVcGRhdGVMaWdodCgpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KVxyXG5cdFx0XHQuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IHRpbWUgPVxyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3Mubm90aWZpY2F0aW9ucz8uZGFpbHlTdW1tYXJ5XHJcblx0XHRcdFx0XHRcdD8udGltZSB8fCBcIjA5OjAwXCI7XHJcblx0XHRcdFx0dGV4dC5zZXRQbGFjZWhvbGRlcihcIjA5OjAwXCIpXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUodGltZSlcclxuXHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsKSA9PiB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IHMgPSBzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncztcclxuXHRcdFx0XHRcdFx0cy5ub3RpZmljYXRpb25zID0ge1xyXG5cdFx0XHRcdFx0XHRcdC4uLnMubm90aWZpY2F0aW9ucyxcclxuXHRcdFx0XHRcdFx0XHRkYWlseVN1bW1hcnk6IHtcclxuXHRcdFx0XHRcdFx0XHRcdGVuYWJsZWQ6XHJcblx0XHRcdFx0XHRcdFx0XHRcdHMubm90aWZpY2F0aW9ucz8uZGFpbHlTdW1tYXJ5Py5lbmFibGVkID8/XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRydWUsXHJcblx0XHRcdFx0XHRcdFx0XHR0aW1lOiB2YWwgfHwgXCIwOTowMFwiLFxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdH0gYXMgYW55O1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5Tm90aWZpY2F0aW9uc1VwZGF0ZUxpZ2h0KCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHQvLyBDaGFuZ2UgaW5wdXQgdHlwZSB0byB0aW1lIHBpY2tlclxyXG5cdFx0XHRcdHRleHQuaW5wdXRFbC50eXBlID0gXCJ0aW1lXCI7XHJcblx0XHRcdH0pXHJcblx0XHRcdC5hZGRCdXR0b24oKGJ0bikgPT4ge1xyXG5cdFx0XHRcdGJ0bi5zZXRCdXR0b25UZXh0KHQoXCJTZW5kIG5vd1wiKSk7XHJcblx0XHRcdFx0YnRuLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRcdFx0YXdhaXQgc2V0dGluZ1RhYi5wbHVnaW4ubm90aWZpY2F0aW9uTWFuYWdlcj8udHJpZ2dlckRhaWx5U3VtbWFyeSgpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHQvLyBQZXIgdGFzayByZW1pbmRlcnNcclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiUGVyLXRhc2sgcmVtaW5kZXJzXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyh0KFwiTm90aWZ5IHNob3J0bHkgYmVmb3JlIGVhY2ggdGFzaydzIGR1ZSB0aW1lXCIpKVxyXG5cdFx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcclxuXHRcdFx0XHRjb25zdCBucyA9IHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLm5vdGlmaWNhdGlvbnM7XHJcblx0XHRcdFx0dG9nZ2xlLnNldFZhbHVlKCEhbnM/LnBlclRhc2s/LmVuYWJsZWQpO1xyXG5cdFx0XHRcdHRvZ2dsZS5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdGNvbnN0IHMgPSBzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncztcclxuXHRcdFx0XHRcdHMubm90aWZpY2F0aW9ucyA9IHtcclxuXHRcdFx0XHRcdFx0Li4ucy5ub3RpZmljYXRpb25zLFxyXG5cdFx0XHRcdFx0XHRwZXJUYXNrOiB7XHJcblx0XHRcdFx0XHRcdFx0ZW5hYmxlZDogdmFsdWUsXHJcblx0XHRcdFx0XHRcdFx0bGVhZE1pbnV0ZXM6XHJcblx0XHRcdFx0XHRcdFx0XHRzLm5vdGlmaWNhdGlvbnM/LnBlclRhc2s/LmxlYWRNaW51dGVzID8/IDEwLFxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0fSBhcyBhbnk7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5Tm90aWZpY2F0aW9uc1VwZGF0ZUxpZ2h0KCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pXHJcblx0XHRcdC5hZGRUZXh0KCh0ZXh0KSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgbGVhZCA9IFN0cmluZyhcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLm5vdGlmaWNhdGlvbnM/LnBlclRhc2tcclxuXHRcdFx0XHRcdFx0Py5sZWFkTWludXRlcyA/PyAxMFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0dGV4dC5zZXRQbGFjZWhvbGRlcihcIjEwXCIpXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUobGVhZClcclxuXHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsKSA9PiB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IG1pbnV0ZXMgPSBNYXRoLm1heChcclxuXHRcdFx0XHRcdFx0XHQwLFxyXG5cdFx0XHRcdFx0XHRcdHBhcnNlSW50KHZhbCB8fCBcIjBcIiwgMTApIHx8IDBcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0Y29uc3QgcyA9IHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzO1xyXG5cdFx0XHRcdFx0XHRzLm5vdGlmaWNhdGlvbnMgPSB7XHJcblx0XHRcdFx0XHRcdFx0Li4ucy5ub3RpZmljYXRpb25zLFxyXG5cdFx0XHRcdFx0XHRcdHBlclRhc2s6IHtcclxuXHRcdFx0XHRcdFx0XHRcdGVuYWJsZWQ6XHJcblx0XHRcdFx0XHRcdFx0XHRcdHMubm90aWZpY2F0aW9ucz8ucGVyVGFzaz8uZW5hYmxlZCA/PyBmYWxzZSxcclxuXHRcdFx0XHRcdFx0XHRcdGxlYWRNaW51dGVzOiBtaW51dGVzLFxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdH0gYXMgYW55O1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5Tm90aWZpY2F0aW9uc1VwZGF0ZUxpZ2h0KCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHQvLyBDaGFuZ2UgaW5wdXQgdHlwZSB0byBudW1iZXIgd2l0aCBjb25zdHJhaW50c1xyXG5cdFx0XHRcdHRleHQuaW5wdXRFbC50eXBlID0gXCJudW1iZXJcIjtcclxuXHRcdFx0XHR0ZXh0LmlucHV0RWwubWluID0gXCIwXCI7XHJcblx0XHRcdFx0dGV4dC5pbnB1dEVsLm1heCA9IFwiMTQ0MFwiOyAvLyBNYXggMjQgaG91cnMgaW4gbWludXRlc1xyXG5cdFx0XHRcdHRleHQuaW5wdXRFbC5zdGVwID0gXCI1XCI7IC8vIFN0ZXAgYnkgNSBtaW51dGVzXHJcblx0XHRcdH0pXHJcblx0XHRcdC5hZGRCdXR0b24oKGJ0bikgPT4ge1xyXG5cdFx0XHRcdGJ0bi5zZXRCdXR0b25UZXh0KHQoXCJTY2FuIG5vd1wiKSk7XHJcblx0XHRcdFx0YnRuLm9uQ2xpY2soKCkgPT5cclxuXHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLm5vdGlmaWNhdGlvbk1hbmFnZXI/LnRyaWdnZXJJbW1pbmVudFNjYW4oKVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gVHJheSAvIFF1aWNrIGFjY2Vzc1xyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIlRyYXkgaW5kaWNhdG9yXCIpKVxyXG5cdFx0LnNldERlc2MoXHJcblx0XHRcdHQoXCJTaG93IGEgYmVsbCB3aXRoIGNvdW50IGluIHN5c3RlbSB0cmF5LCBzdGF0dXMgYmFyLCBvciBib3RoXCIpXHJcblx0XHQpXHJcblx0XHQuYWRkRHJvcGRvd24oKGRkKSA9PiB7XHJcblx0XHRcdGNvbnN0IHMgPSBzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncztcclxuXHRcdFx0cy5kZXNrdG9wSW50ZWdyYXRpb24gPSBzLmRlc2t0b3BJbnRlZ3JhdGlvbiB8fCB7XHJcblx0XHRcdFx0ZW5hYmxlVHJheTogZmFsc2UsXHJcblx0XHRcdH07XHJcblx0XHRcdGNvbnN0IG1vZGUgPSBzLmRlc2t0b3BJbnRlZ3JhdGlvbi50cmF5TW9kZSB8fCBcInN0YXR1c1wiO1xyXG5cdFx0XHRkZC5hZGRPcHRpb25zKHtcclxuXHRcdFx0XHRzeXN0ZW06IFwiU3lzdGVtIHRyYXlcIixcclxuXHRcdFx0XHRzdGF0dXM6IFwiU3RhdHVzIGJhclwiLFxyXG5cdFx0XHRcdGJvdGg6IFwiQm90aFwiLFxyXG5cdFx0XHR9KVxyXG5cdFx0XHRcdC5zZXRWYWx1ZShtb2RlKVxyXG5cdFx0XHRcdC5vbkNoYW5nZSgodikgPT4ge1xyXG5cdFx0XHRcdFx0cy5kZXNrdG9wSW50ZWdyYXRpb24gPSB7XHJcblx0XHRcdFx0XHRcdC4uLnMuZGVza3RvcEludGVncmF0aW9uLFxyXG5cdFx0XHRcdFx0XHR0cmF5TW9kZTogdiBhcyBhbnksXHJcblx0XHRcdFx0XHRcdGVuYWJsZVRyYXk6IHYgIT09IFwic3RhdHVzXCIsXHJcblx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseU5vdGlmaWNhdGlvbnNVcGRhdGVMaWdodCgpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fSlcclxuXHRcdC5hZGRCdXR0b24oKGJ0bikgPT4ge1xyXG5cdFx0XHRidG4uc2V0QnV0dG9uVGV4dCh0KFwiVXBkYXRlIG5vd1wiKSk7XHJcblx0XHRcdGJ0bi5vbkNsaWNrKGFzeW5jICgpID0+IHtcclxuXHRcdFx0XHRhd2FpdCBzZXR0aW5nVGFiLnBsdWdpbi5ub3RpZmljYXRpb25NYW5hZ2VyPy50cmlnZ2VyRGFpbHlTdW1tYXJ5KCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcbn1cclxuIl19