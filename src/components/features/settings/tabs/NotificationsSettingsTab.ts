import { Setting, Platform } from "obsidian";
import { t } from "@/translations/helper";
import { TaskProgressBarSettingTab } from "@/setting";

export function renderNotificationsSettingsTab(
  settingTab: TaskProgressBarSettingTab,
  containerEl: HTMLElement
) {
  // Header
  new Setting(containerEl)
    .setName(t("Notifications"))
    .setDesc(t("Configure reminders and desktop tray/quick access"))
    .setHeading();

  // Desktop only hint
  if (!Platform.isDesktopApp) {
    new Setting(containerEl)
      .setName(t("Desktop only"))
      .setDesc(t("Notifications and tray are available on desktop"));
    return;
  }

  // Enable notifications (global)
  new Setting(containerEl)
    .setName(t("Enable notifications"))
    .setDesc(t("Use system notifications when possible"))
    .addToggle((toggle) => {
      toggle.setValue(!!settingTab.plugin.settings.notifications?.enabled);
      toggle.onChange((value) => {
        const s = settingTab.plugin.settings;
        s.notifications = s.notifications || {
          enabled: false,
          dailySummary: { enabled: true, time: "09:00" },
          perTask: { enabled: false, leadMinutes: 10 },
        };
        s.notifications.enabled = value;
        settingTab.applySettingsUpdate();
      });
    });

  // Daily summary
  new Setting(containerEl)
    .setName(t("Daily summary"))
    .setDesc(t("Send one notification for today's due tasks at a specific time (HH:mm)"))
    .addToggle((toggle) => {
      const ns = settingTab.plugin.settings.notifications;
      toggle.setValue(!!ns?.dailySummary?.enabled);
      toggle.onChange((value) => {
        const s = settingTab.plugin.settings;
        s.notifications = s.notifications || { enabled: false, dailySummary: { enabled: true, time: "09:00" }, perTask: { enabled: false, leadMinutes: 10 } };
        s.notifications.dailySummary = s.notifications.dailySummary || { enabled: true, time: "09:00" };
        s.notifications.dailySummary.enabled = value;
        settingTab.applySettingsUpdate();
      });
    })
    .addText((text) => {
      const time = settingTab.plugin.settings.notifications?.dailySummary?.time || "09:00";
      text.setPlaceholder("09:00").setValue(time).onChange((val) => {
        const s = settingTab.plugin.settings;
        s.notifications = s.notifications || { enabled: false, dailySummary: { enabled: true, time: "09:00" }, perTask: { enabled: false, leadMinutes: 10 } };
        s.notifications.dailySummary = s.notifications.dailySummary || { enabled: true, time: "09:00" };
        s.notifications.dailySummary.time = val || "09:00";
        settingTab.applySettingsUpdate();
      });
    })
    .addButton((btn) => {
      btn.setButtonText(t("Send now"));
      btn.onClick(async () => {
        await settingTab.plugin.notificationManager?.triggerDailySummary();
      });
    });

  // Per task reminders
  new Setting(containerEl)
    .setName(t("Per-task reminders"))
    .setDesc(t("Notify shortly before each task's due time"))
    .addToggle((toggle) => {
      const ns = settingTab.plugin.settings.notifications;
      toggle.setValue(!!ns?.perTask?.enabled);
      toggle.onChange((value) => {
        const s = settingTab.plugin.settings;
        s.notifications = s.notifications || { enabled: false, dailySummary: { enabled: true, time: "09:00" }, perTask: { enabled: false, leadMinutes: 10 } };
        s.notifications.perTask = s.notifications.perTask || { enabled: false, leadMinutes: 10 };
        s.notifications.perTask.enabled = value;
        settingTab.applySettingsUpdate();
      });
    })
    .addText((text) => {
      const lead = String(settingTab.plugin.settings.notifications?.perTask?.leadMinutes ?? 10);
      text.setPlaceholder("10").setValue(lead).onChange((val) => {
        const minutes = Math.max(0, parseInt(val || "0", 10) || 0);
        const s = settingTab.plugin.settings;
        s.notifications = s.notifications || { enabled: false, dailySummary: { enabled: true, time: "09:00" }, perTask: { enabled: false, leadMinutes: 10 } };
        s.notifications.perTask = s.notifications.perTask || { enabled: false, leadMinutes: 10 };
        s.notifications.perTask.leadMinutes = minutes;
        settingTab.applySettingsUpdate();
      });
    })
    .addButton((btn) => {
      btn.setButtonText(t("Scan now"));
      btn.onClick(() => settingTab.plugin.notificationManager?.triggerImminentScan());
    });

  // Tray / Quick access
  new Setting(containerEl)
    .setName(t("Enable tray (status bar / system)"))
    .setDesc(t("Show a bell with today's due count; on supported setups, creates a system tray icon"))
    .addToggle((toggle) => {
      toggle.setValue(!!settingTab.plugin.settings.desktopIntegration?.enableTray);
      toggle.onChange((value) => {
        const s = settingTab.plugin.settings;
        s.desktopIntegration = s.desktopIntegration || { enableTray: false };
        s.desktopIntegration.enableTray = value;
        settingTab.applySettingsUpdate();
      });
    })
    .addButton((btn) => {
      btn.setButtonText(t("Update tray"));
      btn.onClick(async () => {
        await settingTab.plugin.notificationManager?.triggerDailySummary();
      });
    });

  // External quick view actions
  new Setting(containerEl)
    .setName(t("Open Task Genius view"))
    .setDesc(t("Quickly open main view to review tasks"))
    .addButton((btn) => {
      btn.setButtonText(t("Open"));
      btn.onClick(() => (settingTab.plugin as any).activateTaskView?.());
    });
}

