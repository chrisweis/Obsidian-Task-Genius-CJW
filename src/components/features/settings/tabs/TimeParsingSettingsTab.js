import { __awaiter } from "tslib";
import { Setting } from "obsidian";
import { t } from "@/translations/helper";
export function renderTimeParsingSettingsTab(pluginSettingTab, containerEl) {
    containerEl.createEl("h2", { text: t("Time Parsing Settings") });
    // Ensure timeParsing settings exist with enhanced configuration
    if (!pluginSettingTab.plugin.settings.timeParsing) {
        pluginSettingTab.plugin.settings.timeParsing = {
            enabled: true,
            supportedLanguages: ["en", "zh"],
            dateKeywords: {
                start: ["start", "begin", "from", "开始", "从"],
                due: ["due", "deadline", "by", "until", "截止", "到期", "之前"],
                scheduled: ["scheduled", "on", "at", "安排", "计划", "在"],
            },
            removeOriginalText: true,
            perLineProcessing: true,
            realTimeReplacement: true,
            timePatterns: {
                singleTime: [
                    /\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/g,
                    /\b(1[0-2]|0?[1-9]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM|am|pm)\b/g,
                ],
                timeRange: [
                    /\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\s*[-~～]\s*([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/g,
                    /\b(1[0-2]|0?[1-9]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM|am|pm)?\s*[-~～]\s*(1[0-2]|0?[1-9]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM|am|pm)\b/g,
                ],
                rangeSeparators: ["-", "~", "～", " - ", " ~ ", " ～ "],
            },
            timeDefaults: {
                preferredFormat: "24h",
                defaultPeriod: "AM",
                midnightCrossing: "next-day",
            },
        };
    }
    // Enable Time Parsing
    new Setting(containerEl)
        .setName(t("Enable Time Parsing"))
        .setDesc(t("Automatically parse natural language time expressions and specific times (12:00, 1:30 PM, 12:00-13:00)"))
        .addToggle((toggle) => toggle
        .setValue(pluginSettingTab.plugin.settings.timeParsing.enabled)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        pluginSettingTab.plugin.settings.timeParsing.enabled = value;
        pluginSettingTab.applySettingsUpdate();
    })));
    // Remove Original Text
    new Setting(containerEl)
        .setName(t("Remove Original Time Expressions"))
        .setDesc(t("Remove parsed time expressions from the task text"))
        .addToggle((toggle) => {
        var _a, _b;
        return toggle
            .setValue((_b = (_a = pluginSettingTab.plugin.settings.timeParsing) === null || _a === void 0 ? void 0 : _a.removeOriginalText) !== null && _b !== void 0 ? _b : true)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            if (!pluginSettingTab.plugin.settings.timeParsing)
                return;
            pluginSettingTab.plugin.settings.timeParsing.removeOriginalText =
                value;
            pluginSettingTab.applySettingsUpdate();
        }));
    });
    // Supported Languages
    containerEl.createEl("h3", { text: t("Supported Languages") });
    containerEl.createEl("p", {
        text: t("Currently supports English and Chinese time expressions. More languages may be added in future updates."),
        cls: "setting-item-description",
    });
    // Date Keywords Configuration
    containerEl.createEl("h3", { text: t("Date Keywords Configuration") });
    // Start Date Keywords
    new Setting(containerEl)
        .setName(t("Start Date Keywords"))
        .setDesc(t("Keywords that indicate start dates (comma-separated)"))
        .addTextArea((text) => {
        var _a, _b;
        const keywords = ((_b = (_a = pluginSettingTab.plugin.settings.timeParsing) === null || _a === void 0 ? void 0 : _a.dateKeywords) === null || _b === void 0 ? void 0 : _b.start) || [];
        text.setValue(keywords.join(", "))
            .setPlaceholder("start, begin, from, 开始, 从")
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            if (!pluginSettingTab.plugin.settings.timeParsing)
                return;
            pluginSettingTab.plugin.settings.timeParsing.dateKeywords.start =
                value
                    .split(",")
                    .map((k) => k.trim())
                    .filter((k) => k.length > 0);
            pluginSettingTab.applySettingsUpdate();
        }));
        text.inputEl.rows = 2;
    });
    // Due Date Keywords
    new Setting(containerEl)
        .setName(t("Due Date Keywords"))
        .setDesc(t("Keywords that indicate due dates (comma-separated)"))
        .addTextArea((text) => {
        var _a, _b;
        const keywords = ((_b = (_a = pluginSettingTab.plugin.settings.timeParsing) === null || _a === void 0 ? void 0 : _a.dateKeywords) === null || _b === void 0 ? void 0 : _b.due) || [];
        text.setValue(keywords.join(", "))
            .setPlaceholder("due, deadline, by, until, 截止, 到期, 之前")
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            if (!pluginSettingTab.plugin.settings.timeParsing)
                return;
            pluginSettingTab.plugin.settings.timeParsing.dateKeywords.due =
                value
                    .split(",")
                    .map((k) => k.trim())
                    .filter((k) => k.length > 0);
            pluginSettingTab.applySettingsUpdate();
        }));
        text.inputEl.rows = 2;
    });
    // Scheduled Date Keywords
    new Setting(containerEl)
        .setName(t("Scheduled Date Keywords"))
        .setDesc(t("Keywords that indicate scheduled dates (comma-separated)"))
        .addTextArea((text) => {
        var _a, _b;
        const keywords = ((_b = (_a = pluginSettingTab.plugin.settings.timeParsing) === null || _a === void 0 ? void 0 : _a.dateKeywords) === null || _b === void 0 ? void 0 : _b.scheduled) || [];
        text.setValue(keywords.join(", "))
            .setPlaceholder("scheduled, on, at, 安排, 计划, 在")
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            if (!pluginSettingTab.plugin.settings.timeParsing)
                return;
            pluginSettingTab.plugin.settings.timeParsing.dateKeywords.scheduled =
                value
                    .split(",")
                    .map((k) => k.trim())
                    .filter((k) => k.length > 0);
            pluginSettingTab.applySettingsUpdate();
        }));
        text.inputEl.rows = 2;
    });
    // Time Format Configuration
    containerEl.createEl("h3", { text: t("Time Format Configuration") });
    // Preferred Time Format
    new Setting(containerEl)
        .setName(t("Preferred Time Format"))
        .setDesc(t("Default format preference for ambiguous time expressions"))
        .addDropdown((dropdown) => {
        var _a;
        dropdown
            .addOption("12h", t("12-hour format (1:30 PM)"))
            .addOption("24h", t("24-hour format (13:30)"))
            .setValue(((_a = pluginSettingTab.plugin.settings.timeParsing.timeDefaults) === null || _a === void 0 ? void 0 : _a.preferredFormat) || "24h")
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            if (!pluginSettingTab.plugin.settings.timeParsing.timeDefaults) {
                pluginSettingTab.plugin.settings.timeParsing.timeDefaults = {
                    preferredFormat: value,
                    defaultPeriod: "AM",
                    midnightCrossing: "next-day",
                };
            }
            else {
                pluginSettingTab.plugin.settings.timeParsing.timeDefaults.preferredFormat = value;
            }
            pluginSettingTab.applySettingsUpdate();
        }));
    });
    // Default AM/PM Period
    new Setting(containerEl)
        .setName(t("Default AM/PM Period"))
        .setDesc(t("Default period when AM/PM is ambiguous in 12-hour format"))
        .addDropdown((dropdown) => {
        var _a;
        dropdown
            .addOption("AM", t("AM (Morning)"))
            .addOption("PM", t("PM (Afternoon/Evening)"))
            .setValue(((_a = pluginSettingTab.plugin.settings.timeParsing.timeDefaults) === null || _a === void 0 ? void 0 : _a.defaultPeriod) || "AM")
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            if (!pluginSettingTab.plugin.settings.timeParsing.timeDefaults) {
                pluginSettingTab.plugin.settings.timeParsing.timeDefaults = {
                    preferredFormat: "24h",
                    defaultPeriod: value,
                    midnightCrossing: "next-day",
                };
            }
            else {
                pluginSettingTab.plugin.settings.timeParsing.timeDefaults.defaultPeriod = value;
            }
            pluginSettingTab.applySettingsUpdate();
        }));
    });
    // Midnight Crossing Behavior
    new Setting(containerEl)
        .setName(t("Midnight Crossing Behavior"))
        .setDesc(t("How to handle time ranges that cross midnight (e.g., 23:00-01:00)"))
        .addDropdown((dropdown) => {
        var _a;
        dropdown
            .addOption("next-day", t("Next day (23:00 today - 01:00 tomorrow)"))
            .addOption("same-day", t("Same day (treat as error)"))
            .addOption("error", t("Show error"))
            .setValue(((_a = pluginSettingTab.plugin.settings.timeParsing.timeDefaults) === null || _a === void 0 ? void 0 : _a.midnightCrossing) || "next-day")
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            if (!pluginSettingTab.plugin.settings.timeParsing.timeDefaults) {
                pluginSettingTab.plugin.settings.timeParsing.timeDefaults = {
                    preferredFormat: "24h",
                    defaultPeriod: "AM",
                    midnightCrossing: value,
                };
            }
            else {
                pluginSettingTab.plugin.settings.timeParsing.timeDefaults.midnightCrossing = value;
            }
            pluginSettingTab.applySettingsUpdate();
        }));
    });
    // Time Range Separators
    new Setting(containerEl)
        .setName(t("Time Range Separators"))
        .setDesc(t("Characters used to separate time ranges (comma-separated)"))
        .addTextArea((text) => {
        var _a;
        const separators = ((_a = pluginSettingTab.plugin.settings.timeParsing.timePatterns) === null || _a === void 0 ? void 0 : _a.rangeSeparators) || ["-", "~", "～"];
        text.setValue(separators.join(", "))
            .setPlaceholder("-, ~, ～, ' - ', ' ~ '")
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            if (!pluginSettingTab.plugin.settings.timeParsing.timePatterns) {
                pluginSettingTab.plugin.settings.timeParsing.timePatterns = {
                    singleTime: [],
                    timeRange: [],
                    rangeSeparators: value.split(",").map(s => s.trim()).filter(s => s.length > 0),
                };
            }
            else {
                pluginSettingTab.plugin.settings.timeParsing.timePatterns.rangeSeparators =
                    value.split(",").map(s => s.trim()).filter(s => s.length > 0);
            }
            pluginSettingTab.applySettingsUpdate();
        }));
        text.inputEl.rows = 2;
    });
    // Examples
    containerEl.createEl("h3", { text: t("Examples") });
    const examplesEl = containerEl.createEl("div", {
        cls: "time-parsing-examples",
    });
    const examples = [
        // Date examples
        { input: "go to bed tomorrow", output: "go to bed 📅 2025-01-05" },
        { input: "meeting next week", output: "meeting 📅 2025-01-11" },
        { input: "project due by Friday", output: "project 📅 2025-01-04" },
        { input: "明天开会", output: "开会 📅 2025-01-05" },
        { input: "3天后完成", output: "完成 📅 2025-01-07" },
        // Time examples
        { input: "meeting at 2:30 PM", output: "meeting 📅 2025-01-04 ⏰ 14:30" },
        { input: "workshop 9:00-17:00", output: "workshop 📅 2025-01-04 ⏰ 09:00-17:00" },
        { input: "call scheduled 12:00", output: "call 📅 2025-01-04 ⏰ 12:00" },
        { input: "lunch 12:00～13:00", output: "lunch 📅 2025-01-04 ⏰ 12:00-13:00" },
    ];
    examples.forEach((example) => {
        const exampleEl = examplesEl.createEl("div", {
            cls: "time-parsing-example",
        });
        exampleEl.createEl("span", {
            text: "Input: ",
            cls: "example-label",
        });
        exampleEl.createEl("code", {
            text: example.input,
            cls: "example-input",
        });
        exampleEl.createEl("br");
        exampleEl.createEl("span", {
            text: "Output: ",
            cls: "example-label",
        });
        exampleEl.createEl("code", {
            text: example.output,
            cls: "example-output",
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGltZVBhcnNpbmdTZXR0aW5nc1RhYi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlRpbWVQYXJzaW5nU2V0dGluZ3NUYWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBb0IsT0FBTyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQ3JELE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUkxQyxNQUFNLFVBQVUsNEJBQTRCLENBQzNDLGdCQUEyQyxFQUMzQyxXQUF3QjtJQUV4QixXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsdUJBQXVCLENBQUMsRUFBRSxDQUFDLENBQUM7SUFFakUsZ0VBQWdFO0lBQ2hFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRTtRQUNsRCxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFdBQVcsR0FBRztZQUM5QyxPQUFPLEVBQUUsSUFBSTtZQUNiLGtCQUFrQixFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQztZQUNoQyxZQUFZLEVBQUU7Z0JBQ2IsS0FBSyxFQUFFLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQztnQkFDNUMsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO2dCQUN6RCxTQUFTLEVBQUUsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQzthQUNyRDtZQUNELGtCQUFrQixFQUFFLElBQUk7WUFDeEIsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixtQkFBbUIsRUFBRSxJQUFJO1lBQ3pCLFlBQVksRUFBRTtnQkFDYixVQUFVLEVBQUU7b0JBQ1gsZ0RBQWdEO29CQUNoRCxnRUFBZ0U7aUJBQ2hFO2dCQUNELFNBQVMsRUFBRTtvQkFDVixvR0FBb0c7b0JBQ3BHLHFJQUFxSTtpQkFDckk7Z0JBQ0QsZUFBZSxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUM7YUFDckQ7WUFDRCxZQUFZLEVBQUU7Z0JBQ2IsZUFBZSxFQUFFLEtBQWM7Z0JBQy9CLGFBQWEsRUFBRSxJQUFhO2dCQUM1QixnQkFBZ0IsRUFBRSxVQUFtQjthQUNyQztTQUM0QixDQUFDO0tBQy9CO0lBRUQsc0JBQXNCO0lBQ3RCLElBQUksT0FBTyxDQUFDLFdBQVcsQ0FBQztTQUN0QixPQUFPLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUM7U0FDakMsT0FBTyxDQUNQLENBQUMsQ0FDQSx3R0FBd0csQ0FDeEcsQ0FDRDtTQUNBLFNBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQ3JCLE1BQU07U0FDSixRQUFRLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDO1NBQzlELFFBQVEsQ0FBQyxDQUFPLEtBQUssRUFBRSxFQUFFO1FBQ3pCLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7UUFDN0QsZ0JBQWdCLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztJQUN4QyxDQUFDLENBQUEsQ0FBQyxDQUNILENBQUM7SUFFSCx1QkFBdUI7SUFDdkIsSUFBSSxPQUFPLENBQUMsV0FBVyxDQUFDO1NBQ3RCLE9BQU8sQ0FBQyxDQUFDLENBQUMsa0NBQWtDLENBQUMsQ0FBQztTQUM5QyxPQUFPLENBQUMsQ0FBQyxDQUFDLG1EQUFtRCxDQUFDLENBQUM7U0FDL0QsU0FBUyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7O1FBQ3JCLE9BQUEsTUFBTTthQUNKLFFBQVEsQ0FDUixNQUFBLE1BQUEsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxXQUFXLDBDQUN6QyxrQkFBa0IsbUNBQUksSUFBSSxDQUM3QjthQUNBLFFBQVEsQ0FBQyxDQUFPLEtBQUssRUFBRSxFQUFFO1lBQ3pCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFdBQVc7Z0JBQUUsT0FBTztZQUMxRCxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0I7Z0JBQzlELEtBQUssQ0FBQztZQUNQLGdCQUFnQixDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDeEMsQ0FBQyxDQUFBLENBQUMsQ0FBQTtLQUFBLENBQ0gsQ0FBQztJQUVILHNCQUFzQjtJQUN0QixXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDL0QsV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDekIsSUFBSSxFQUFFLENBQUMsQ0FDTix5R0FBeUcsQ0FDekc7UUFDRCxHQUFHLEVBQUUsMEJBQTBCO0tBQy9CLENBQUMsQ0FBQztJQUVILDhCQUE4QjtJQUM5QixXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsNkJBQTZCLENBQUMsRUFBRSxDQUFDLENBQUM7SUFFdkUsc0JBQXNCO0lBQ3RCLElBQUksT0FBTyxDQUFDLFdBQVcsQ0FBQztTQUN0QixPQUFPLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUM7U0FDakMsT0FBTyxDQUFDLENBQUMsQ0FBQyxzREFBc0QsQ0FBQyxDQUFDO1NBQ2xFLFdBQVcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFOztRQUNyQixNQUFNLFFBQVEsR0FDYixDQUFBLE1BQUEsTUFBQSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFdBQVcsMENBQUUsWUFBWSwwQ0FDdkQsS0FBSyxLQUFJLEVBQUUsQ0FBQztRQUNoQixJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDaEMsY0FBYyxDQUFDLDJCQUEyQixDQUFDO2FBQzNDLFFBQVEsQ0FBQyxDQUFPLEtBQUssRUFBRSxFQUFFO1lBQ3pCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFdBQVc7Z0JBQUUsT0FBTztZQUMxRCxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsS0FBSztnQkFDOUQsS0FBSztxQkFDSCxLQUFLLENBQUMsR0FBRyxDQUFDO3FCQUNWLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO3FCQUNwQixNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsZ0JBQWdCLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUN4QyxDQUFDLENBQUEsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZCLENBQUMsQ0FBQyxDQUFDO0lBRUosb0JBQW9CO0lBQ3BCLElBQUksT0FBTyxDQUFDLFdBQVcsQ0FBQztTQUN0QixPQUFPLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUM7U0FDL0IsT0FBTyxDQUFDLENBQUMsQ0FBQyxvREFBb0QsQ0FBQyxDQUFDO1NBQ2hFLFdBQVcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFOztRQUNyQixNQUFNLFFBQVEsR0FDYixDQUFBLE1BQUEsTUFBQSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFdBQVcsMENBQUUsWUFBWSwwQ0FDdkQsR0FBRyxLQUFJLEVBQUUsQ0FBQztRQUNkLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNoQyxjQUFjLENBQUMsc0NBQXNDLENBQUM7YUFDdEQsUUFBUSxDQUFDLENBQU8sS0FBSyxFQUFFLEVBQUU7WUFDekIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVztnQkFBRSxPQUFPO1lBQzFELGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxHQUFHO2dCQUM1RCxLQUFLO3FCQUNILEtBQUssQ0FBQyxHQUFHLENBQUM7cUJBQ1YsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7cUJBQ3BCLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixnQkFBZ0IsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBQ3hDLENBQUMsQ0FBQSxDQUFDLENBQUM7UUFDSixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7SUFDdkIsQ0FBQyxDQUFDLENBQUM7SUFFSiwwQkFBMEI7SUFDMUIsSUFBSSxPQUFPLENBQUMsV0FBVyxDQUFDO1NBQ3RCLE9BQU8sQ0FBQyxDQUFDLENBQUMseUJBQXlCLENBQUMsQ0FBQztTQUNyQyxPQUFPLENBQUMsQ0FBQyxDQUFDLDBEQUEwRCxDQUFDLENBQUM7U0FDdEUsV0FBVyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7O1FBQ3JCLE1BQU0sUUFBUSxHQUNiLENBQUEsTUFBQSxNQUFBLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVywwQ0FBRSxZQUFZLDBDQUN2RCxTQUFTLEtBQUksRUFBRSxDQUFDO1FBQ3BCLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNoQyxjQUFjLENBQUMsOEJBQThCLENBQUM7YUFDOUMsUUFBUSxDQUFDLENBQU8sS0FBSyxFQUFFLEVBQUU7WUFDekIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVztnQkFBRSxPQUFPO1lBQzFELGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxTQUFTO2dCQUNsRSxLQUFLO3FCQUNILEtBQUssQ0FBQyxHQUFHLENBQUM7cUJBQ1YsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7cUJBQ3BCLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixnQkFBZ0IsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBQ3hDLENBQUMsQ0FBQSxDQUFDLENBQUM7UUFDSixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7SUFDdkIsQ0FBQyxDQUFDLENBQUM7SUFFSiw0QkFBNEI7SUFDNUIsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBRXJFLHdCQUF3QjtJQUN4QixJQUFJLE9BQU8sQ0FBQyxXQUFXLENBQUM7U0FDdEIsT0FBTyxDQUFDLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1NBQ25DLE9BQU8sQ0FBQyxDQUFDLENBQUMsMERBQTBELENBQUMsQ0FBQztTQUN0RSxXQUFXLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTs7UUFDekIsUUFBUTthQUNOLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLDBCQUEwQixDQUFDLENBQUM7YUFDL0MsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsd0JBQXdCLENBQUMsQ0FBQzthQUM3QyxRQUFRLENBQUMsQ0FBQSxNQUFBLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFlBQVksMENBQUUsZUFBZSxLQUFJLEtBQUssQ0FBQzthQUM3RixRQUFRLENBQUMsQ0FBTyxLQUFvQixFQUFFLEVBQUU7WUFDeEMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRTtnQkFDL0QsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsWUFBWSxHQUFHO29CQUMzRCxlQUFlLEVBQUUsS0FBSztvQkFDdEIsYUFBYSxFQUFFLElBQUk7b0JBQ25CLGdCQUFnQixFQUFFLFVBQVU7aUJBQzVCLENBQUM7YUFDRjtpQkFBTTtnQkFDTixnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsZUFBZSxHQUFHLEtBQUssQ0FBQzthQUNsRjtZQUNELGdCQUFnQixDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDeEMsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUosdUJBQXVCO0lBQ3ZCLElBQUksT0FBTyxDQUFDLFdBQVcsQ0FBQztTQUN0QixPQUFPLENBQUMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLENBQUM7U0FDbEMsT0FBTyxDQUFDLENBQUMsQ0FBQywwREFBMEQsQ0FBQyxDQUFDO1NBQ3RFLFdBQVcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFOztRQUN6QixRQUFRO2FBQ04sU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUM7YUFDbEMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsd0JBQXdCLENBQUMsQ0FBQzthQUM1QyxRQUFRLENBQUMsQ0FBQSxNQUFBLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFlBQVksMENBQUUsYUFBYSxLQUFJLElBQUksQ0FBQzthQUMxRixRQUFRLENBQUMsQ0FBTyxLQUFrQixFQUFFLEVBQUU7WUFDdEMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRTtnQkFDL0QsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsWUFBWSxHQUFHO29CQUMzRCxlQUFlLEVBQUUsS0FBSztvQkFDdEIsYUFBYSxFQUFFLEtBQUs7b0JBQ3BCLGdCQUFnQixFQUFFLFVBQVU7aUJBQzVCLENBQUM7YUFDRjtpQkFBTTtnQkFDTixnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQzthQUNoRjtZQUNELGdCQUFnQixDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDeEMsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUosNkJBQTZCO0lBQzdCLElBQUksT0FBTyxDQUFDLFdBQVcsQ0FBQztTQUN0QixPQUFPLENBQUMsQ0FBQyxDQUFDLDRCQUE0QixDQUFDLENBQUM7U0FDeEMsT0FBTyxDQUFDLENBQUMsQ0FBQyxtRUFBbUUsQ0FBQyxDQUFDO1NBQy9FLFdBQVcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFOztRQUN6QixRQUFRO2FBQ04sU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMseUNBQXlDLENBQUMsQ0FBQzthQUNuRSxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO2FBQ3JELFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDO2FBQ25DLFFBQVEsQ0FBQyxDQUFBLE1BQUEsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsWUFBWSwwQ0FBRSxnQkFBZ0IsS0FBSSxVQUFVLENBQUM7YUFDbkcsUUFBUSxDQUFDLENBQU8sS0FBd0MsRUFBRSxFQUFFO1lBQzVELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUU7Z0JBQy9ELGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFlBQVksR0FBRztvQkFDM0QsZUFBZSxFQUFFLEtBQUs7b0JBQ3RCLGFBQWEsRUFBRSxJQUFJO29CQUNuQixnQkFBZ0IsRUFBRSxLQUFLO2lCQUN2QixDQUFDO2FBQ0Y7aUJBQU07Z0JBQ04sZ0JBQWdCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLGdCQUFnQixHQUFHLEtBQUssQ0FBQzthQUNuRjtZQUNELGdCQUFnQixDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDeEMsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUosd0JBQXdCO0lBQ3hCLElBQUksT0FBTyxDQUFDLFdBQVcsQ0FBQztTQUN0QixPQUFPLENBQUMsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLENBQUM7U0FDbkMsT0FBTyxDQUFDLENBQUMsQ0FBQywyREFBMkQsQ0FBQyxDQUFDO1NBQ3ZFLFdBQVcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFOztRQUNyQixNQUFNLFVBQVUsR0FBRyxDQUFBLE1BQUEsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsWUFBWSwwQ0FBRSxlQUFlLEtBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2pILElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNsQyxjQUFjLENBQUMsdUJBQXVCLENBQUM7YUFDdkMsUUFBUSxDQUFDLENBQU8sS0FBSyxFQUFFLEVBQUU7WUFDekIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRTtnQkFDL0QsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsWUFBWSxHQUFHO29CQUMzRCxVQUFVLEVBQUUsRUFBRTtvQkFDZCxTQUFTLEVBQUUsRUFBRTtvQkFDYixlQUFlLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztpQkFDOUUsQ0FBQzthQUNGO2lCQUFNO2dCQUNOLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxlQUFlO29CQUN4RSxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7YUFDL0Q7WUFDRCxnQkFBZ0IsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBQ3hDLENBQUMsQ0FBQSxDQUFDLENBQUM7UUFDSixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7SUFDdkIsQ0FBQyxDQUFDLENBQUM7SUFFSixXQUFXO0lBQ1gsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNwRCxNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRTtRQUM5QyxHQUFHLEVBQUUsdUJBQXVCO0tBQzVCLENBQUMsQ0FBQztJQUVILE1BQU0sUUFBUSxHQUFHO1FBQ2hCLGdCQUFnQjtRQUNoQixFQUFFLEtBQUssRUFBRSxvQkFBb0IsRUFBRSxNQUFNLEVBQUUseUJBQXlCLEVBQUU7UUFDbEUsRUFBRSxLQUFLLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxFQUFFLHVCQUF1QixFQUFFO1FBQy9ELEVBQUUsS0FBSyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sRUFBRSx1QkFBdUIsRUFBRTtRQUNuRSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixFQUFFO1FBQzdDLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsa0JBQWtCLEVBQUU7UUFDOUMsZ0JBQWdCO1FBQ2hCLEVBQUUsS0FBSyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sRUFBRSwrQkFBK0IsRUFBRTtRQUN4RSxFQUFFLEtBQUssRUFBRSxxQkFBcUIsRUFBRSxNQUFNLEVBQUUsc0NBQXNDLEVBQUU7UUFDaEYsRUFBRSxLQUFLLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxFQUFFLDRCQUE0QixFQUFFO1FBQ3ZFLEVBQUUsS0FBSyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sRUFBRSxtQ0FBbUMsRUFBRTtLQUMzRSxDQUFDO0lBRUYsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1FBQzVCLE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFO1lBQzVDLEdBQUcsRUFBRSxzQkFBc0I7U0FDM0IsQ0FBQyxDQUFDO1FBQ0gsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUU7WUFDMUIsSUFBSSxFQUFFLFNBQVM7WUFDZixHQUFHLEVBQUUsZUFBZTtTQUNwQixDQUFDLENBQUM7UUFDSCxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRTtZQUMxQixJQUFJLEVBQUUsT0FBTyxDQUFDLEtBQUs7WUFDbkIsR0FBRyxFQUFFLGVBQWU7U0FDcEIsQ0FBQyxDQUFDO1FBQ0gsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6QixTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRTtZQUMxQixJQUFJLEVBQUUsVUFBVTtZQUNoQixHQUFHLEVBQUUsZUFBZTtTQUNwQixDQUFDLENBQUM7UUFDSCxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRTtZQUMxQixJQUFJLEVBQUUsT0FBTyxDQUFDLE1BQU07WUFDcEIsR0FBRyxFQUFFLGdCQUFnQjtTQUNyQixDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBQbHVnaW5TZXR0aW5nVGFiLCBTZXR0aW5nIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCB7IFRhc2tQcm9ncmVzc0JhclNldHRpbmdUYWIgfSBmcm9tIFwiQC9zZXR0aW5nXCI7XHJcbmltcG9ydCB0eXBlIHsgRW5oYW5jZWRUaW1lUGFyc2luZ0NvbmZpZyB9IGZyb20gXCJAL3R5cGVzL3RpbWUtcGFyc2luZ1wiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlclRpbWVQYXJzaW5nU2V0dGluZ3NUYWIoXHJcblx0cGx1Z2luU2V0dGluZ1RhYjogVGFza1Byb2dyZXNzQmFyU2V0dGluZ1RhYixcclxuXHRjb250YWluZXJFbDogSFRNTEVsZW1lbnRcclxuKSB7XHJcblx0Y29udGFpbmVyRWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IHQoXCJUaW1lIFBhcnNpbmcgU2V0dGluZ3NcIikgfSk7XHJcblxyXG5cdC8vIEVuc3VyZSB0aW1lUGFyc2luZyBzZXR0aW5ncyBleGlzdCB3aXRoIGVuaGFuY2VkIGNvbmZpZ3VyYXRpb25cclxuXHRpZiAoIXBsdWdpblNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnRpbWVQYXJzaW5nKSB7XHJcblx0XHRwbHVnaW5TZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy50aW1lUGFyc2luZyA9IHtcclxuXHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0c3VwcG9ydGVkTGFuZ3VhZ2VzOiBbXCJlblwiLCBcInpoXCJdLFxyXG5cdFx0XHRkYXRlS2V5d29yZHM6IHtcclxuXHRcdFx0XHRzdGFydDogW1wic3RhcnRcIiwgXCJiZWdpblwiLCBcImZyb21cIiwgXCLlvIDlp4tcIiwgXCLku45cIl0sXHJcblx0XHRcdFx0ZHVlOiBbXCJkdWVcIiwgXCJkZWFkbGluZVwiLCBcImJ5XCIsIFwidW50aWxcIiwgXCLmiKrmraJcIiwgXCLliLDmnJ9cIiwgXCLkuYvliY1cIl0sXHJcblx0XHRcdFx0c2NoZWR1bGVkOiBbXCJzY2hlZHVsZWRcIiwgXCJvblwiLCBcImF0XCIsIFwi5a6J5o6SXCIsIFwi6K6h5YiSXCIsIFwi5ZyoXCJdLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHRyZW1vdmVPcmlnaW5hbFRleHQ6IHRydWUsXHJcblx0XHRcdHBlckxpbmVQcm9jZXNzaW5nOiB0cnVlLFxyXG5cdFx0XHRyZWFsVGltZVJlcGxhY2VtZW50OiB0cnVlLFxyXG5cdFx0XHR0aW1lUGF0dGVybnM6IHtcclxuXHRcdFx0XHRzaW5nbGVUaW1lOiBbXHJcblx0XHRcdFx0XHQvXFxiKFswMV0/XFxkfDJbMC0zXSk6KFswLTVdXFxkKSg/OjooWzAtNV1cXGQpKT9cXGIvZyxcclxuXHRcdFx0XHRcdC9cXGIoMVswLTJdfDA/WzEtOV0pOihbMC01XVxcZCkoPzo6KFswLTVdXFxkKSk/XFxzKihBTXxQTXxhbXxwbSlcXGIvZyxcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdHRpbWVSYW5nZTogW1xyXG5cdFx0XHRcdFx0L1xcYihbMDFdP1xcZHwyWzAtM10pOihbMC01XVxcZCkoPzo6KFswLTVdXFxkKSk/XFxzKlstfu+9nl1cXHMqKFswMV0/XFxkfDJbMC0zXSk6KFswLTVdXFxkKSg/OjooWzAtNV1cXGQpKT9cXGIvZyxcclxuXHRcdFx0XHRcdC9cXGIoMVswLTJdfDA/WzEtOV0pOihbMC01XVxcZCkoPzo6KFswLTVdXFxkKSk/XFxzKihBTXxQTXxhbXxwbSk/XFxzKlstfu+9nl1cXHMqKDFbMC0yXXwwP1sxLTldKTooWzAtNV1cXGQpKD86OihbMC01XVxcZCkpP1xccyooQU18UE18YW18cG0pXFxiL2csXHJcblx0XHRcdFx0XSxcclxuXHRcdFx0XHRyYW5nZVNlcGFyYXRvcnM6IFtcIi1cIiwgXCJ+XCIsIFwi772eXCIsIFwiIC0gXCIsIFwiIH4gXCIsIFwiIO+9niBcIl0sXHJcblx0XHRcdH0sXHJcblx0XHRcdHRpbWVEZWZhdWx0czoge1xyXG5cdFx0XHRcdHByZWZlcnJlZEZvcm1hdDogXCIyNGhcIiBhcyBjb25zdCxcclxuXHRcdFx0XHRkZWZhdWx0UGVyaW9kOiBcIkFNXCIgYXMgY29uc3QsXHJcblx0XHRcdFx0bWlkbmlnaHRDcm9zc2luZzogXCJuZXh0LWRheVwiIGFzIGNvbnN0LFxyXG5cdFx0XHR9LFxyXG5cdFx0fSBhcyBFbmhhbmNlZFRpbWVQYXJzaW5nQ29uZmlnO1xyXG5cdH1cclxuXHJcblx0Ly8gRW5hYmxlIFRpbWUgUGFyc2luZ1xyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIkVuYWJsZSBUaW1lIFBhcnNpbmdcIikpXHJcblx0XHQuc2V0RGVzYyhcclxuXHRcdFx0dChcclxuXHRcdFx0XHRcIkF1dG9tYXRpY2FsbHkgcGFyc2UgbmF0dXJhbCBsYW5ndWFnZSB0aW1lIGV4cHJlc3Npb25zIGFuZCBzcGVjaWZpYyB0aW1lcyAoMTI6MDAsIDE6MzAgUE0sIDEyOjAwLTEzOjAwKVwiXHJcblx0XHRcdClcclxuXHRcdClcclxuXHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT5cclxuXHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0LnNldFZhbHVlKHBsdWdpblNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnRpbWVQYXJzaW5nLmVuYWJsZWQpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0cGx1Z2luU2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudGltZVBhcnNpbmcuZW5hYmxlZCA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0cGx1Z2luU2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0fSlcclxuXHRcdCk7XHJcblxyXG5cdC8vIFJlbW92ZSBPcmlnaW5hbCBUZXh0XHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiUmVtb3ZlIE9yaWdpbmFsIFRpbWUgRXhwcmVzc2lvbnNcIikpXHJcblx0XHQuc2V0RGVzYyh0KFwiUmVtb3ZlIHBhcnNlZCB0aW1lIGV4cHJlc3Npb25zIGZyb20gdGhlIHRhc2sgdGV4dFwiKSlcclxuXHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT5cclxuXHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0cGx1Z2luU2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudGltZVBhcnNpbmdcclxuXHRcdFx0XHRcdFx0Py5yZW1vdmVPcmlnaW5hbFRleHQgPz8gdHJ1ZVxyXG5cdFx0XHRcdClcclxuXHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAoIXBsdWdpblNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnRpbWVQYXJzaW5nKSByZXR1cm47XHJcblx0XHRcdFx0XHRwbHVnaW5TZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy50aW1lUGFyc2luZy5yZW1vdmVPcmlnaW5hbFRleHQgPVxyXG5cdFx0XHRcdFx0XHR2YWx1ZTtcclxuXHRcdFx0XHRcdHBsdWdpblNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdH0pXHJcblx0XHQpO1xyXG5cclxuXHQvLyBTdXBwb3J0ZWQgTGFuZ3VhZ2VzXHJcblx0Y29udGFpbmVyRWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IHQoXCJTdXBwb3J0ZWQgTGFuZ3VhZ2VzXCIpIH0pO1xyXG5cdGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XHJcblx0XHR0ZXh0OiB0KFxyXG5cdFx0XHRcIkN1cnJlbnRseSBzdXBwb3J0cyBFbmdsaXNoIGFuZCBDaGluZXNlIHRpbWUgZXhwcmVzc2lvbnMuIE1vcmUgbGFuZ3VhZ2VzIG1heSBiZSBhZGRlZCBpbiBmdXR1cmUgdXBkYXRlcy5cIlxyXG5cdFx0KSxcclxuXHRcdGNsczogXCJzZXR0aW5nLWl0ZW0tZGVzY3JpcHRpb25cIixcclxuXHR9KTtcclxuXHJcblx0Ly8gRGF0ZSBLZXl3b3JkcyBDb25maWd1cmF0aW9uXHJcblx0Y29udGFpbmVyRWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IHQoXCJEYXRlIEtleXdvcmRzIENvbmZpZ3VyYXRpb25cIikgfSk7XHJcblxyXG5cdC8vIFN0YXJ0IERhdGUgS2V5d29yZHNcclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJTdGFydCBEYXRlIEtleXdvcmRzXCIpKVxyXG5cdFx0LnNldERlc2ModChcIktleXdvcmRzIHRoYXQgaW5kaWNhdGUgc3RhcnQgZGF0ZXMgKGNvbW1hLXNlcGFyYXRlZClcIikpXHJcblx0XHQuYWRkVGV4dEFyZWEoKHRleHQpID0+IHtcclxuXHRcdFx0Y29uc3Qga2V5d29yZHMgPVxyXG5cdFx0XHRcdHBsdWdpblNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnRpbWVQYXJzaW5nPy5kYXRlS2V5d29yZHNcclxuXHRcdFx0XHRcdD8uc3RhcnQgfHwgW107XHJcblx0XHRcdHRleHQuc2V0VmFsdWUoa2V5d29yZHMuam9pbihcIiwgXCIpKVxyXG5cdFx0XHRcdC5zZXRQbGFjZWhvbGRlcihcInN0YXJ0LCBiZWdpbiwgZnJvbSwg5byA5aeLLCDku45cIilcclxuXHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAoIXBsdWdpblNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnRpbWVQYXJzaW5nKSByZXR1cm47XHJcblx0XHRcdFx0XHRwbHVnaW5TZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy50aW1lUGFyc2luZy5kYXRlS2V5d29yZHMuc3RhcnQgPVxyXG5cdFx0XHRcdFx0XHR2YWx1ZVxyXG5cdFx0XHRcdFx0XHRcdC5zcGxpdChcIixcIilcclxuXHRcdFx0XHRcdFx0XHQubWFwKChrKSA9PiBrLnRyaW0oKSlcclxuXHRcdFx0XHRcdFx0XHQuZmlsdGVyKChrKSA9PiBrLmxlbmd0aCA+IDApO1xyXG5cdFx0XHRcdFx0cGx1Z2luU2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdHRleHQuaW5wdXRFbC5yb3dzID0gMjtcclxuXHRcdH0pO1xyXG5cclxuXHQvLyBEdWUgRGF0ZSBLZXl3b3Jkc1xyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIkR1ZSBEYXRlIEtleXdvcmRzXCIpKVxyXG5cdFx0LnNldERlc2ModChcIktleXdvcmRzIHRoYXQgaW5kaWNhdGUgZHVlIGRhdGVzIChjb21tYS1zZXBhcmF0ZWQpXCIpKVxyXG5cdFx0LmFkZFRleHRBcmVhKCh0ZXh0KSA9PiB7XHJcblx0XHRcdGNvbnN0IGtleXdvcmRzID1cclxuXHRcdFx0XHRwbHVnaW5TZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy50aW1lUGFyc2luZz8uZGF0ZUtleXdvcmRzXHJcblx0XHRcdFx0XHQ/LmR1ZSB8fCBbXTtcclxuXHRcdFx0dGV4dC5zZXRWYWx1ZShrZXl3b3Jkcy5qb2luKFwiLCBcIikpXHJcblx0XHRcdFx0LnNldFBsYWNlaG9sZGVyKFwiZHVlLCBkZWFkbGluZSwgYnksIHVudGlsLCDmiKrmraIsIOWIsOacnywg5LmL5YmNXCIpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKCFwbHVnaW5TZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy50aW1lUGFyc2luZykgcmV0dXJuO1xyXG5cdFx0XHRcdFx0cGx1Z2luU2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudGltZVBhcnNpbmcuZGF0ZUtleXdvcmRzLmR1ZSA9XHJcblx0XHRcdFx0XHRcdHZhbHVlXHJcblx0XHRcdFx0XHRcdFx0LnNwbGl0KFwiLFwiKVxyXG5cdFx0XHRcdFx0XHRcdC5tYXAoKGspID0+IGsudHJpbSgpKVxyXG5cdFx0XHRcdFx0XHRcdC5maWx0ZXIoKGspID0+IGsubGVuZ3RoID4gMCk7XHJcblx0XHRcdFx0XHRwbHVnaW5TZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0dGV4dC5pbnB1dEVsLnJvd3MgPSAyO1xyXG5cdFx0fSk7XHJcblxyXG5cdC8vIFNjaGVkdWxlZCBEYXRlIEtleXdvcmRzXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiU2NoZWR1bGVkIERhdGUgS2V5d29yZHNcIikpXHJcblx0XHQuc2V0RGVzYyh0KFwiS2V5d29yZHMgdGhhdCBpbmRpY2F0ZSBzY2hlZHVsZWQgZGF0ZXMgKGNvbW1hLXNlcGFyYXRlZClcIikpXHJcblx0XHQuYWRkVGV4dEFyZWEoKHRleHQpID0+IHtcclxuXHRcdFx0Y29uc3Qga2V5d29yZHMgPVxyXG5cdFx0XHRcdHBsdWdpblNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnRpbWVQYXJzaW5nPy5kYXRlS2V5d29yZHNcclxuXHRcdFx0XHRcdD8uc2NoZWR1bGVkIHx8IFtdO1xyXG5cdFx0XHR0ZXh0LnNldFZhbHVlKGtleXdvcmRzLmpvaW4oXCIsIFwiKSlcclxuXHRcdFx0XHQuc2V0UGxhY2Vob2xkZXIoXCJzY2hlZHVsZWQsIG9uLCBhdCwg5a6J5o6SLCDorqHliJIsIOWcqFwiKVxyXG5cdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdGlmICghcGx1Z2luU2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudGltZVBhcnNpbmcpIHJldHVybjtcclxuXHRcdFx0XHRcdHBsdWdpblNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnRpbWVQYXJzaW5nLmRhdGVLZXl3b3Jkcy5zY2hlZHVsZWQgPVxyXG5cdFx0XHRcdFx0XHR2YWx1ZVxyXG5cdFx0XHRcdFx0XHRcdC5zcGxpdChcIixcIilcclxuXHRcdFx0XHRcdFx0XHQubWFwKChrKSA9PiBrLnRyaW0oKSlcclxuXHRcdFx0XHRcdFx0XHQuZmlsdGVyKChrKSA9PiBrLmxlbmd0aCA+IDApO1xyXG5cdFx0XHRcdFx0cGx1Z2luU2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdHRleHQuaW5wdXRFbC5yb3dzID0gMjtcclxuXHRcdH0pO1xyXG5cclxuXHQvLyBUaW1lIEZvcm1hdCBDb25maWd1cmF0aW9uXHJcblx0Y29udGFpbmVyRWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IHQoXCJUaW1lIEZvcm1hdCBDb25maWd1cmF0aW9uXCIpIH0pO1xyXG5cclxuXHQvLyBQcmVmZXJyZWQgVGltZSBGb3JtYXRcclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJQcmVmZXJyZWQgVGltZSBGb3JtYXRcIikpXHJcblx0XHQuc2V0RGVzYyh0KFwiRGVmYXVsdCBmb3JtYXQgcHJlZmVyZW5jZSBmb3IgYW1iaWd1b3VzIHRpbWUgZXhwcmVzc2lvbnNcIikpXHJcblx0XHQuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XHJcblx0XHRcdGRyb3Bkb3duXHJcblx0XHRcdFx0LmFkZE9wdGlvbihcIjEyaFwiLCB0KFwiMTItaG91ciBmb3JtYXQgKDE6MzAgUE0pXCIpKVxyXG5cdFx0XHRcdC5hZGRPcHRpb24oXCIyNGhcIiwgdChcIjI0LWhvdXIgZm9ybWF0ICgxMzozMClcIikpXHJcblx0XHRcdFx0LnNldFZhbHVlKHBsdWdpblNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnRpbWVQYXJzaW5nLnRpbWVEZWZhdWx0cz8ucHJlZmVycmVkRm9ybWF0IHx8IFwiMjRoXCIpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZTogXCIxMmhcIiB8IFwiMjRoXCIpID0+IHtcclxuXHRcdFx0XHRcdGlmICghcGx1Z2luU2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudGltZVBhcnNpbmcudGltZURlZmF1bHRzKSB7XHJcblx0XHRcdFx0XHRcdHBsdWdpblNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnRpbWVQYXJzaW5nLnRpbWVEZWZhdWx0cyA9IHtcclxuXHRcdFx0XHRcdFx0XHRwcmVmZXJyZWRGb3JtYXQ6IHZhbHVlLFxyXG5cdFx0XHRcdFx0XHRcdGRlZmF1bHRQZXJpb2Q6IFwiQU1cIixcclxuXHRcdFx0XHRcdFx0XHRtaWRuaWdodENyb3NzaW5nOiBcIm5leHQtZGF5XCIsXHJcblx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRwbHVnaW5TZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy50aW1lUGFyc2luZy50aW1lRGVmYXVsdHMucHJlZmVycmVkRm9ybWF0ID0gdmFsdWU7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRwbHVnaW5TZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHQvLyBEZWZhdWx0IEFNL1BNIFBlcmlvZFxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIkRlZmF1bHQgQU0vUE0gUGVyaW9kXCIpKVxyXG5cdFx0LnNldERlc2ModChcIkRlZmF1bHQgcGVyaW9kIHdoZW4gQU0vUE0gaXMgYW1iaWd1b3VzIGluIDEyLWhvdXIgZm9ybWF0XCIpKVxyXG5cdFx0LmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xyXG5cdFx0XHRkcm9wZG93blxyXG5cdFx0XHRcdC5hZGRPcHRpb24oXCJBTVwiLCB0KFwiQU0gKE1vcm5pbmcpXCIpKVxyXG5cdFx0XHRcdC5hZGRPcHRpb24oXCJQTVwiLCB0KFwiUE0gKEFmdGVybm9vbi9FdmVuaW5nKVwiKSlcclxuXHRcdFx0XHQuc2V0VmFsdWUocGx1Z2luU2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudGltZVBhcnNpbmcudGltZURlZmF1bHRzPy5kZWZhdWx0UGVyaW9kIHx8IFwiQU1cIilcclxuXHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlOiBcIkFNXCIgfCBcIlBNXCIpID0+IHtcclxuXHRcdFx0XHRcdGlmICghcGx1Z2luU2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudGltZVBhcnNpbmcudGltZURlZmF1bHRzKSB7XHJcblx0XHRcdFx0XHRcdHBsdWdpblNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnRpbWVQYXJzaW5nLnRpbWVEZWZhdWx0cyA9IHtcclxuXHRcdFx0XHRcdFx0XHRwcmVmZXJyZWRGb3JtYXQ6IFwiMjRoXCIsXHJcblx0XHRcdFx0XHRcdFx0ZGVmYXVsdFBlcmlvZDogdmFsdWUsXHJcblx0XHRcdFx0XHRcdFx0bWlkbmlnaHRDcm9zc2luZzogXCJuZXh0LWRheVwiLFxyXG5cdFx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0cGx1Z2luU2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudGltZVBhcnNpbmcudGltZURlZmF1bHRzLmRlZmF1bHRQZXJpb2QgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdHBsdWdpblNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdC8vIE1pZG5pZ2h0IENyb3NzaW5nIEJlaGF2aW9yXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiTWlkbmlnaHQgQ3Jvc3NpbmcgQmVoYXZpb3JcIikpXHJcblx0XHQuc2V0RGVzYyh0KFwiSG93IHRvIGhhbmRsZSB0aW1lIHJhbmdlcyB0aGF0IGNyb3NzIG1pZG5pZ2h0IChlLmcuLCAyMzowMC0wMTowMClcIikpXHJcblx0XHQuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XHJcblx0XHRcdGRyb3Bkb3duXHJcblx0XHRcdFx0LmFkZE9wdGlvbihcIm5leHQtZGF5XCIsIHQoXCJOZXh0IGRheSAoMjM6MDAgdG9kYXkgLSAwMTowMCB0b21vcnJvdylcIikpXHJcblx0XHRcdFx0LmFkZE9wdGlvbihcInNhbWUtZGF5XCIsIHQoXCJTYW1lIGRheSAodHJlYXQgYXMgZXJyb3IpXCIpKVxyXG5cdFx0XHRcdC5hZGRPcHRpb24oXCJlcnJvclwiLCB0KFwiU2hvdyBlcnJvclwiKSlcclxuXHRcdFx0XHQuc2V0VmFsdWUocGx1Z2luU2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudGltZVBhcnNpbmcudGltZURlZmF1bHRzPy5taWRuaWdodENyb3NzaW5nIHx8IFwibmV4dC1kYXlcIilcclxuXHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlOiBcIm5leHQtZGF5XCIgfCBcInNhbWUtZGF5XCIgfCBcImVycm9yXCIpID0+IHtcclxuXHRcdFx0XHRcdGlmICghcGx1Z2luU2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudGltZVBhcnNpbmcudGltZURlZmF1bHRzKSB7XHJcblx0XHRcdFx0XHRcdHBsdWdpblNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnRpbWVQYXJzaW5nLnRpbWVEZWZhdWx0cyA9IHtcclxuXHRcdFx0XHRcdFx0XHRwcmVmZXJyZWRGb3JtYXQ6IFwiMjRoXCIsXHJcblx0XHRcdFx0XHRcdFx0ZGVmYXVsdFBlcmlvZDogXCJBTVwiLFxyXG5cdFx0XHRcdFx0XHRcdG1pZG5pZ2h0Q3Jvc3Npbmc6IHZhbHVlLFxyXG5cdFx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0cGx1Z2luU2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudGltZVBhcnNpbmcudGltZURlZmF1bHRzLm1pZG5pZ2h0Q3Jvc3NpbmcgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdHBsdWdpblNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdC8vIFRpbWUgUmFuZ2UgU2VwYXJhdG9yc1xyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIlRpbWUgUmFuZ2UgU2VwYXJhdG9yc1wiKSlcclxuXHRcdC5zZXREZXNjKHQoXCJDaGFyYWN0ZXJzIHVzZWQgdG8gc2VwYXJhdGUgdGltZSByYW5nZXMgKGNvbW1hLXNlcGFyYXRlZClcIikpXHJcblx0XHQuYWRkVGV4dEFyZWEoKHRleHQpID0+IHtcclxuXHRcdFx0Y29uc3Qgc2VwYXJhdG9ycyA9IHBsdWdpblNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnRpbWVQYXJzaW5nLnRpbWVQYXR0ZXJucz8ucmFuZ2VTZXBhcmF0b3JzIHx8IFtcIi1cIiwgXCJ+XCIsIFwi772eXCJdO1xyXG5cdFx0XHR0ZXh0LnNldFZhbHVlKHNlcGFyYXRvcnMuam9pbihcIiwgXCIpKVxyXG5cdFx0XHRcdC5zZXRQbGFjZWhvbGRlcihcIi0sIH4sIO+9niwgJyAtICcsICcgfiAnXCIpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKCFwbHVnaW5TZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy50aW1lUGFyc2luZy50aW1lUGF0dGVybnMpIHtcclxuXHRcdFx0XHRcdFx0cGx1Z2luU2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudGltZVBhcnNpbmcudGltZVBhdHRlcm5zID0ge1xyXG5cdFx0XHRcdFx0XHRcdHNpbmdsZVRpbWU6IFtdLFxyXG5cdFx0XHRcdFx0XHRcdHRpbWVSYW5nZTogW10sXHJcblx0XHRcdFx0XHRcdFx0cmFuZ2VTZXBhcmF0b3JzOiB2YWx1ZS5zcGxpdChcIixcIikubWFwKHMgPT4gcy50cmltKCkpLmZpbHRlcihzID0+IHMubGVuZ3RoID4gMCksXHJcblx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRwbHVnaW5TZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy50aW1lUGFyc2luZy50aW1lUGF0dGVybnMucmFuZ2VTZXBhcmF0b3JzID0gXHJcblx0XHRcdFx0XHRcdFx0dmFsdWUuc3BsaXQoXCIsXCIpLm1hcChzID0+IHMudHJpbSgpKS5maWx0ZXIocyA9PiBzLmxlbmd0aCA+IDApO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0cGx1Z2luU2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdHRleHQuaW5wdXRFbC5yb3dzID0gMjtcclxuXHRcdH0pO1xyXG5cclxuXHQvLyBFeGFtcGxlc1xyXG5cdGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiB0KFwiRXhhbXBsZXNcIikgfSk7XHJcblx0Y29uc3QgZXhhbXBsZXNFbCA9IGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdGNsczogXCJ0aW1lLXBhcnNpbmctZXhhbXBsZXNcIixcclxuXHR9KTtcclxuXHJcblx0Y29uc3QgZXhhbXBsZXMgPSBbXHJcblx0XHQvLyBEYXRlIGV4YW1wbGVzXHJcblx0XHR7IGlucHV0OiBcImdvIHRvIGJlZCB0b21vcnJvd1wiLCBvdXRwdXQ6IFwiZ28gdG8gYmVkIPCfk4UgMjAyNS0wMS0wNVwiIH0sXHJcblx0XHR7IGlucHV0OiBcIm1lZXRpbmcgbmV4dCB3ZWVrXCIsIG91dHB1dDogXCJtZWV0aW5nIPCfk4UgMjAyNS0wMS0xMVwiIH0sXHJcblx0XHR7IGlucHV0OiBcInByb2plY3QgZHVlIGJ5IEZyaWRheVwiLCBvdXRwdXQ6IFwicHJvamVjdCDwn5OFIDIwMjUtMDEtMDRcIiB9LFxyXG5cdFx0eyBpbnB1dDogXCLmmI7lpKnlvIDkvJpcIiwgb3V0cHV0OiBcIuW8gOS8miDwn5OFIDIwMjUtMDEtMDVcIiB9LFxyXG5cdFx0eyBpbnB1dDogXCIz5aSp5ZCO5a6M5oiQXCIsIG91dHB1dDogXCLlrozmiJAg8J+ThSAyMDI1LTAxLTA3XCIgfSxcclxuXHRcdC8vIFRpbWUgZXhhbXBsZXNcclxuXHRcdHsgaW5wdXQ6IFwibWVldGluZyBhdCAyOjMwIFBNXCIsIG91dHB1dDogXCJtZWV0aW5nIPCfk4UgMjAyNS0wMS0wNCDij7AgMTQ6MzBcIiB9LFxyXG5cdFx0eyBpbnB1dDogXCJ3b3Jrc2hvcCA5OjAwLTE3OjAwXCIsIG91dHB1dDogXCJ3b3Jrc2hvcCDwn5OFIDIwMjUtMDEtMDQg4o+wIDA5OjAwLTE3OjAwXCIgfSxcclxuXHRcdHsgaW5wdXQ6IFwiY2FsbCBzY2hlZHVsZWQgMTI6MDBcIiwgb3V0cHV0OiBcImNhbGwg8J+ThSAyMDI1LTAxLTA0IOKPsCAxMjowMFwiIH0sXHJcblx0XHR7IGlucHV0OiBcImx1bmNoIDEyOjAw772eMTM6MDBcIiwgb3V0cHV0OiBcImx1bmNoIPCfk4UgMjAyNS0wMS0wNCDij7AgMTI6MDAtMTM6MDBcIiB9LFxyXG5cdF07XHJcblxyXG5cdGV4YW1wbGVzLmZvckVhY2goKGV4YW1wbGUpID0+IHtcclxuXHRcdGNvbnN0IGV4YW1wbGVFbCA9IGV4YW1wbGVzRWwuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHRjbHM6IFwidGltZS1wYXJzaW5nLWV4YW1wbGVcIixcclxuXHRcdH0pO1xyXG5cdFx0ZXhhbXBsZUVsLmNyZWF0ZUVsKFwic3BhblwiLCB7XHJcblx0XHRcdHRleHQ6IFwiSW5wdXQ6IFwiLFxyXG5cdFx0XHRjbHM6IFwiZXhhbXBsZS1sYWJlbFwiLFxyXG5cdFx0fSk7XHJcblx0XHRleGFtcGxlRWwuY3JlYXRlRWwoXCJjb2RlXCIsIHtcclxuXHRcdFx0dGV4dDogZXhhbXBsZS5pbnB1dCxcclxuXHRcdFx0Y2xzOiBcImV4YW1wbGUtaW5wdXRcIixcclxuXHRcdH0pO1xyXG5cdFx0ZXhhbXBsZUVsLmNyZWF0ZUVsKFwiYnJcIik7XHJcblx0XHRleGFtcGxlRWwuY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdFx0dGV4dDogXCJPdXRwdXQ6IFwiLFxyXG5cdFx0XHRjbHM6IFwiZXhhbXBsZS1sYWJlbFwiLFxyXG5cdFx0fSk7XHJcblx0XHRleGFtcGxlRWwuY3JlYXRlRWwoXCJjb2RlXCIsIHtcclxuXHRcdFx0dGV4dDogZXhhbXBsZS5vdXRwdXQsXHJcblx0XHRcdGNsczogXCJleGFtcGxlLW91dHB1dFwiLFxyXG5cdFx0fSk7XHJcblx0fSk7XHJcbn1cclxuIl19