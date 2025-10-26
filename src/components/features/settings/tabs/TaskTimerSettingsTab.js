import { __awaiter } from "tslib";
import { Setting } from "obsidian";
export function renderTaskTimerSettingTab(settingTab, containerEl) {
    var _a;
    // Create task timer settings section
    const timerSection = containerEl.createDiv();
    timerSection.addClass("task-timer-settings-section");
    // Main enable/disable setting
    new Setting(timerSection)
        .setName("Enable Task Timer")
        .setDesc("Enable task timer functionality for tracking time spent on tasks")
        .addToggle((toggle) => {
        var _a;
        toggle
            .setValue(((_a = settingTab.plugin.settings.taskTimer) === null || _a === void 0 ? void 0 : _a.enabled) || false)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            if (!settingTab.plugin.settings.taskTimer) {
                settingTab.plugin.settings.taskTimer = {
                    enabled: false,
                    metadataDetection: {
                        frontmatter: "task-timer",
                        folders: [],
                        tags: [],
                    },
                    timeFormat: "{h}hrs{m}mins",
                    blockRefPrefix: "timer",
                };
            }
            settingTab.plugin.settings.taskTimer.enabled = value;
            settingTab.applySettingsUpdate();
            // Re-render the section to show/hide additional options
            settingTab.display();
        }));
    });
    // Show additional settings only if timer is enabled
    if ((_a = settingTab.plugin.settings.taskTimer) === null || _a === void 0 ? void 0 : _a.enabled) {
        // Metadata detection section
        const metadataSection = timerSection.createDiv();
        metadataSection.addClass("task-timer-metadata-section");
        const metadataHeading = metadataSection.createEl("h3");
        metadataHeading.setText("Metadata Detection");
        metadataHeading.addClass("task-timer-section-heading");
        // Frontmatter field setting
        new Setting(metadataSection)
            .setName("Frontmatter field")
            .setDesc("Field name in frontmatter to check for enabling task timer (e.g., 'task-timer: true')")
            .addText((text) => {
            var _a, _b;
            text.setValue(((_b = (_a = settingTab.plugin.settings.taskTimer) === null || _a === void 0 ? void 0 : _a.metadataDetection) === null || _b === void 0 ? void 0 : _b.frontmatter) || "task-timer").onChange((value) => __awaiter(this, void 0, void 0, function* () {
                var _c;
                if ((_c = settingTab.plugin.settings.taskTimer) === null || _c === void 0 ? void 0 : _c.metadataDetection) {
                    settingTab.plugin.settings.taskTimer.metadataDetection.frontmatter =
                        value;
                    settingTab.applySettingsUpdate();
                }
            }));
        });
        // Folder paths setting
        new Setting(metadataSection)
            .setName("Folder paths")
            .setDesc("Comma-separated list of folder paths where task timer should be enabled")
            .addTextArea((textArea) => {
            var _a, _b, _c;
            textArea
                .setValue(((_c = (_b = (_a = settingTab.plugin.settings.taskTimer) === null || _a === void 0 ? void 0 : _a.metadataDetection) === null || _b === void 0 ? void 0 : _b.folders) === null || _c === void 0 ? void 0 : _c.join(", ")) || "")
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                var _d;
                if ((_d = settingTab.plugin.settings.taskTimer) === null || _d === void 0 ? void 0 : _d.metadataDetection) {
                    settingTab.plugin.settings.taskTimer.metadataDetection.folders =
                        value
                            .split(",")
                            .map((f) => f.trim())
                            .filter((f) => f);
                    settingTab.applySettingsUpdate();
                }
            }));
            textArea.inputEl.rows = 3;
        });
        // Tags setting
        new Setting(metadataSection)
            .setName("Tags")
            .setDesc("Comma-separated list of tags that enable task timer")
            .addTextArea((textArea) => {
            var _a, _b, _c;
            textArea
                .setValue(((_c = (_b = (_a = settingTab.plugin.settings.taskTimer) === null || _a === void 0 ? void 0 : _a.metadataDetection) === null || _b === void 0 ? void 0 : _b.tags) === null || _c === void 0 ? void 0 : _c.join(", ")) || "")
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                var _d;
                if ((_d = settingTab.plugin.settings.taskTimer) === null || _d === void 0 ? void 0 : _d.metadataDetection) {
                    settingTab.plugin.settings.taskTimer.metadataDetection.tags =
                        value
                            .split(",")
                            .map((t) => t.trim())
                            .filter((t) => t);
                    settingTab.applySettingsUpdate();
                }
            }));
            textArea.inputEl.rows = 3;
        });
        // Time format section
        const formatSection = timerSection.createDiv();
        formatSection.addClass("task-timer-format-section");
        const formatHeading = formatSection.createEl("h3");
        formatHeading.setText("Time Format");
        formatHeading.addClass("task-timer-section-heading");
        // Time format template setting
        new Setting(formatSection)
            .setName("Time format template")
            .setDesc("Template for displaying completed task time. Use {h} for hours, {m} for minutes, {s} for seconds")
            .addText((text) => {
            var _a;
            text.setValue(((_a = settingTab.plugin.settings.taskTimer) === null || _a === void 0 ? void 0 : _a.timeFormat) ||
                "{h}hrs{m}mins").onChange((value) => __awaiter(this, void 0, void 0, function* () {
                if (settingTab.plugin.settings.taskTimer) {
                    settingTab.plugin.settings.taskTimer.timeFormat = value;
                    settingTab.applySettingsUpdate();
                }
            }));
        });
        // Format examples
        const examplesDiv = formatSection.createDiv();
        examplesDiv.addClass("task-timer-examples");
        const examplesTitle = examplesDiv.createDiv();
        examplesTitle.addClass("task-timer-examples-title");
        examplesTitle.setText("Format Examples:");
        const examplesList = examplesDiv.createEl("ul");
        const examples = [
            { format: "{h}hrs{m}mins", result: "2hrs30mins" },
            { format: "{h}h {m}m {s}s", result: "2h 30m 45s" },
            { format: "{h}:{m}:{s}", result: "2:30:45" },
            { format: "({m}mins)", result: "(150mins)" },
        ];
        examples.forEach((example) => {
            const listItem = examplesList.createEl("li");
            const codeEl = listItem.createEl("code");
            codeEl.setText(example.format);
            listItem.appendText(" → " + example.result);
        });
        // Block reference section
        const blockRefSection = timerSection.createDiv();
        blockRefSection.addClass("task-timer-blockref-section");
        const blockRefHeading = blockRefSection.createEl("h3");
        blockRefHeading.setText("Block References");
        blockRefHeading.addClass("task-timer-section-heading");
        // Block reference prefix setting
        new Setting(blockRefSection)
            .setName("Block reference prefix")
            .setDesc("Prefix for generated block reference IDs (e.g., 'timer' creates ^timer-123456-7890)")
            .addText((text) => {
            var _a;
            text.setValue(((_a = settingTab.plugin.settings.taskTimer) === null || _a === void 0 ? void 0 : _a.blockRefPrefix) ||
                "timer").onChange((value) => __awaiter(this, void 0, void 0, function* () {
                if (settingTab.plugin.settings.taskTimer) {
                    settingTab.plugin.settings.taskTimer.blockRefPrefix =
                        value;
                    settingTab.applySettingsUpdate();
                }
            }));
        });
        // Commands section
        const commandsSection = timerSection.createDiv();
        commandsSection.addClass("task-timer-commands-section");
        const commandsHeading = commandsSection.createEl("h3");
        commandsHeading.setText("Data Management");
        commandsHeading.addClass("task-timer-section-heading");
        const commandsDesc = commandsSection.createDiv();
        commandsDesc.addClass("task-timer-commands-desc");
        const descParagraph = commandsDesc.createEl("p");
        descParagraph.setText("Use the command palette to access timer data management:");
        const commandsList = commandsDesc.createEl("ul");
        const commands = [
            {
                name: "Export task timer data",
                desc: "Export all timer data to JSON",
            },
            {
                name: "Import task timer data",
                desc: "Import timer data from JSON file",
            },
            {
                name: "Export task timer data (YAML)",
                desc: "Export to YAML format",
            },
            {
                name: "Create task timer backup",
                desc: "Create a backup of active timers",
            },
            {
                name: "Show task timer statistics",
                desc: "Display timer usage statistics",
            },
        ];
        commands.forEach((command) => {
            const listItem = commandsList.createEl("li");
            const strongEl = listItem.createEl("strong");
            strongEl.setText(command.name);
            listItem.appendText(" - " + command.desc);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGFza1RpbWVyU2V0dGluZ3NUYWIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJUYXNrVGltZXJTZXR0aW5nc1RhYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUduQyxNQUFNLFVBQVUseUJBQXlCLENBQ3hDLFVBQXFDLEVBQ3JDLFdBQXdCOztJQUVyQixxQ0FBcUM7SUFDdkMsTUFBTSxZQUFZLEdBQUcsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQzdDLFlBQVksQ0FBQyxRQUFRLENBQUMsNkJBQTZCLENBQUMsQ0FBQztJQUVyRCw4QkFBOEI7SUFDOUIsSUFBSSxPQUFPLENBQUMsWUFBWSxDQUFDO1NBQ3ZCLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQztTQUM1QixPQUFPLENBQ1Asa0VBQWtFLENBQ2xFO1NBQ0EsU0FBUyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7O1FBQ3JCLE1BQU07YUFDSixRQUFRLENBQUMsQ0FBQSxNQUFBLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVMsMENBQUUsT0FBTyxLQUFJLEtBQUssQ0FBQzthQUNoRSxRQUFRLENBQUMsQ0FBTyxLQUFLLEVBQUUsRUFBRTtZQUN6QixJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFO2dCQUMxQyxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEdBQUc7b0JBQ3RDLE9BQU8sRUFBRSxLQUFLO29CQUNkLGlCQUFpQixFQUFFO3dCQUNsQixXQUFXLEVBQUUsWUFBWTt3QkFDekIsT0FBTyxFQUFFLEVBQUU7d0JBQ1gsSUFBSSxFQUFFLEVBQUU7cUJBQ1I7b0JBQ0QsVUFBVSxFQUFFLGVBQWU7b0JBQzNCLGNBQWMsRUFBRSxPQUFPO2lCQUN2QixDQUFDO2FBQ0Y7WUFDRCxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENB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LElBQUksRUFBRSx1QkFBdUI7YUFDN0I7WUFDRDtnQkFDQyxJQUFJLEVBQUUsMEJBQTBCO2dCQUNoQyxJQUFJLEVBQUUsa0NBQWtDO2FBQ3hDO1lBQ0Q7Z0JBQ0MsSUFBSSxFQUFFLDRCQUE0QjtnQkFDbEMsSUFBSSxFQUFFLGdDQUFnQzthQUN0QztTQUNELENBQUM7UUFFRixRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDNUIsTUFBTSxRQUFRLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM3QyxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzdDLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQy9CLFFBQVEsQ0FBQyxVQUFVLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzQyxDQUFDLENBQUMsQ0FBQztLQUNIO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFNldHRpbmcgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgVGFza1Byb2dyZXNzQmFyU2V0dGluZ1RhYiB9IGZyb20gXCJAL3NldHRpbmdcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJUYXNrVGltZXJTZXR0aW5nVGFiKFxyXG5cdHNldHRpbmdUYWI6IFRhc2tQcm9ncmVzc0JhclNldHRpbmdUYWIsXHJcblx0Y29udGFpbmVyRWw6IEhUTUxFbGVtZW50XHJcbikge1xyXG4gICAgLy8gQ3JlYXRlIHRhc2sgdGltZXIgc2V0dGluZ3Mgc2VjdGlvblxyXG5cdFx0Y29uc3QgdGltZXJTZWN0aW9uID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KCk7XHJcblx0XHR0aW1lclNlY3Rpb24uYWRkQ2xhc3MoXCJ0YXNrLXRpbWVyLXNldHRpbmdzLXNlY3Rpb25cIik7XHJcblxyXG5cdFx0Ly8gTWFpbiBlbmFibGUvZGlzYWJsZSBzZXR0aW5nXHJcblx0XHRuZXcgU2V0dGluZyh0aW1lclNlY3Rpb24pXHJcblx0XHRcdC5zZXROYW1lKFwiRW5hYmxlIFRhc2sgVGltZXJcIilcclxuXHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0XCJFbmFibGUgdGFzayB0aW1lciBmdW5jdGlvbmFsaXR5IGZvciB0cmFja2luZyB0aW1lIHNwZW50IG9uIHRhc2tzXCIsXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XHJcblx0XHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudGFza1RpbWVyPy5lbmFibGVkIHx8IGZhbHNlKVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRpZiAoIXNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnRhc2tUaW1lcikge1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnRhc2tUaW1lciA9IHtcclxuXHRcdFx0XHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdFx0XHRcdFx0bWV0YWRhdGFEZXRlY3Rpb246IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0ZnJvbnRtYXR0ZXI6IFwidGFzay10aW1lclwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRmb2xkZXJzOiBbXSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdFx0dGltZUZvcm1hdDogXCJ7aH1ocnN7bX1taW5zXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRibG9ja1JlZlByZWZpeDogXCJ0aW1lclwiLFxyXG5cdFx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudGFza1RpbWVyLmVuYWJsZWQgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBSZS1yZW5kZXIgdGhlIHNlY3Rpb24gdG8gc2hvdy9oaWRlIGFkZGl0aW9uYWwgb3B0aW9uc1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmRpc3BsYXkoKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHQvLyBTaG93IGFkZGl0aW9uYWwgc2V0dGluZ3Mgb25seSBpZiB0aW1lciBpcyBlbmFibGVkXHJcblx0XHRpZiAoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudGFza1RpbWVyPy5lbmFibGVkKSB7XHJcblx0XHRcdC8vIE1ldGFkYXRhIGRldGVjdGlvbiBzZWN0aW9uXHJcblx0XHRcdGNvbnN0IG1ldGFkYXRhU2VjdGlvbiA9IHRpbWVyU2VjdGlvbi5jcmVhdGVEaXYoKTtcclxuXHRcdFx0bWV0YWRhdGFTZWN0aW9uLmFkZENsYXNzKFwidGFzay10aW1lci1tZXRhZGF0YS1zZWN0aW9uXCIpO1xyXG5cclxuXHRcdFx0Y29uc3QgbWV0YWRhdGFIZWFkaW5nID0gbWV0YWRhdGFTZWN0aW9uLmNyZWF0ZUVsKFwiaDNcIik7XHJcblx0XHRcdG1ldGFkYXRhSGVhZGluZy5zZXRUZXh0KFwiTWV0YWRhdGEgRGV0ZWN0aW9uXCIpO1xyXG5cdFx0XHRtZXRhZGF0YUhlYWRpbmcuYWRkQ2xhc3MoXCJ0YXNrLXRpbWVyLXNlY3Rpb24taGVhZGluZ1wiKTtcclxuXHJcblx0XHRcdC8vIEZyb250bWF0dGVyIGZpZWxkIHNldHRpbmdcclxuXHRcdFx0bmV3IFNldHRpbmcobWV0YWRhdGFTZWN0aW9uKVxyXG5cdFx0XHRcdC5zZXROYW1lKFwiRnJvbnRtYXR0ZXIgZmllbGRcIilcclxuXHRcdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHRcdFwiRmllbGQgbmFtZSBpbiBmcm9udG1hdHRlciB0byBjaGVjayBmb3IgZW5hYmxpbmcgdGFzayB0aW1lciAoZS5nLiwgJ3Rhc2stdGltZXI6IHRydWUnKVwiLFxyXG5cdFx0XHRcdClcclxuXHRcdFx0XHQuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHRcdFx0dGV4dC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudGFza1RpbWVyPy5tZXRhZGF0YURldGVjdGlvblxyXG5cdFx0XHRcdFx0XHRcdD8uZnJvbnRtYXR0ZXIgfHwgXCJ0YXNrLXRpbWVyXCIsXHJcblx0XHRcdFx0XHQpLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRpZiAoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudGFza1RpbWVyPy5tZXRhZGF0YURldGVjdGlvbikge1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnRhc2tUaW1lci5tZXRhZGF0YURldGVjdGlvbi5mcm9udG1hdHRlciA9XHJcblx0XHRcdFx0XHRcdFx0XHR2YWx1ZTtcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBGb2xkZXIgcGF0aHMgc2V0dGluZ1xyXG5cdFx0XHRuZXcgU2V0dGluZyhtZXRhZGF0YVNlY3Rpb24pXHJcblx0XHRcdFx0LnNldE5hbWUoXCJGb2xkZXIgcGF0aHNcIilcclxuXHRcdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHRcdFwiQ29tbWEtc2VwYXJhdGVkIGxpc3Qgb2YgZm9sZGVyIHBhdGhzIHdoZXJlIHRhc2sgdGltZXIgc2hvdWxkIGJlIGVuYWJsZWRcIixcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0LmFkZFRleHRBcmVhKCh0ZXh0QXJlYSkgPT4ge1xyXG5cdFx0XHRcdFx0dGV4dEFyZWFcclxuXHRcdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnRhc2tUaW1lcj8ubWV0YWRhdGFEZXRlY3Rpb24/LmZvbGRlcnM/LmpvaW4oXHJcblx0XHRcdFx0XHRcdFx0XHRcIiwgXCIsXHJcblx0XHRcdFx0XHRcdFx0KSB8fCBcIlwiLFxyXG5cdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy50YXNrVGltZXJcclxuXHRcdFx0XHRcdFx0XHRcdFx0Py5tZXRhZGF0YURldGVjdGlvblxyXG5cdFx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudGFza1RpbWVyLm1ldGFkYXRhRGV0ZWN0aW9uLmZvbGRlcnMgPVxyXG5cdFx0XHRcdFx0XHRcdFx0XHR2YWx1ZVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdC5zcGxpdChcIixcIilcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQubWFwKChmKSA9PiBmLnRyaW0oKSlcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQuZmlsdGVyKChmKSA9PiBmKTtcclxuXHRcdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR0ZXh0QXJlYS5pbnB1dEVsLnJvd3MgPSAzO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gVGFncyBzZXR0aW5nXHJcblx0XHRcdG5ldyBTZXR0aW5nKG1ldGFkYXRhU2VjdGlvbilcclxuXHRcdFx0XHQuc2V0TmFtZShcIlRhZ3NcIilcclxuXHRcdFx0XHQuc2V0RGVzYyhcIkNvbW1hLXNlcGFyYXRlZCBsaXN0IG9mIHRhZ3MgdGhhdCBlbmFibGUgdGFzayB0aW1lclwiKVxyXG5cdFx0XHRcdC5hZGRUZXh0QXJlYSgodGV4dEFyZWEpID0+IHtcclxuXHRcdFx0XHRcdHRleHRBcmVhXHJcblx0XHRcdFx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy50YXNrVGltZXI/Lm1ldGFkYXRhRGV0ZWN0aW9uPy50YWdzPy5qb2luKFxyXG5cdFx0XHRcdFx0XHRcdFx0XCIsIFwiLFxyXG5cdFx0XHRcdFx0XHRcdCkgfHwgXCJcIixcclxuXHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudGFza1RpbWVyXHJcblx0XHRcdFx0XHRcdFx0XHRcdD8ubWV0YWRhdGFEZXRlY3Rpb25cclxuXHRcdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnRhc2tUaW1lci5tZXRhZGF0YURldGVjdGlvbi50YWdzID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0dmFsdWVcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQuc3BsaXQoXCIsXCIpXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0Lm1hcCgodCkgPT4gdC50cmltKCkpXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0LmZpbHRlcigodCkgPT4gdCk7XHJcblx0XHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0dGV4dEFyZWEuaW5wdXRFbC5yb3dzID0gMztcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIFRpbWUgZm9ybWF0IHNlY3Rpb25cclxuXHRcdFx0Y29uc3QgZm9ybWF0U2VjdGlvbiA9IHRpbWVyU2VjdGlvbi5jcmVhdGVEaXYoKTtcclxuXHRcdFx0Zm9ybWF0U2VjdGlvbi5hZGRDbGFzcyhcInRhc2stdGltZXItZm9ybWF0LXNlY3Rpb25cIik7XHJcblxyXG5cdFx0XHRjb25zdCBmb3JtYXRIZWFkaW5nID0gZm9ybWF0U2VjdGlvbi5jcmVhdGVFbChcImgzXCIpO1xyXG5cdFx0XHRmb3JtYXRIZWFkaW5nLnNldFRleHQoXCJUaW1lIEZvcm1hdFwiKTtcclxuXHRcdFx0Zm9ybWF0SGVhZGluZy5hZGRDbGFzcyhcInRhc2stdGltZXItc2VjdGlvbi1oZWFkaW5nXCIpO1xyXG5cclxuXHRcdFx0Ly8gVGltZSBmb3JtYXQgdGVtcGxhdGUgc2V0dGluZ1xyXG5cdFx0XHRuZXcgU2V0dGluZyhmb3JtYXRTZWN0aW9uKVxyXG5cdFx0XHRcdC5zZXROYW1lKFwiVGltZSBmb3JtYXQgdGVtcGxhdGVcIilcclxuXHRcdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHRcdFwiVGVtcGxhdGUgZm9yIGRpc3BsYXlpbmcgY29tcGxldGVkIHRhc2sgdGltZS4gVXNlIHtofSBmb3IgaG91cnMsIHttfSBmb3IgbWludXRlcywge3N9IGZvciBzZWNvbmRzXCIsXHJcblx0XHRcdFx0KVxyXG5cdFx0XHRcdC5hZGRUZXh0KCh0ZXh0KSA9PiB7XHJcblx0XHRcdFx0XHR0ZXh0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy50YXNrVGltZXI/LnRpbWVGb3JtYXQgfHxcclxuXHRcdFx0XHRcdFx0XHRcIntofWhyc3ttfW1pbnNcIixcclxuXHRcdFx0XHRcdCkub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdGlmIChzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy50YXNrVGltZXIpIHtcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy50YXNrVGltZXIudGltZUZvcm1hdCA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIEZvcm1hdCBleGFtcGxlc1xyXG5cdFx0XHRjb25zdCBleGFtcGxlc0RpdiA9IGZvcm1hdFNlY3Rpb24uY3JlYXRlRGl2KCk7XHJcblx0XHRcdGV4YW1wbGVzRGl2LmFkZENsYXNzKFwidGFzay10aW1lci1leGFtcGxlc1wiKTtcclxuXHJcblx0XHRcdGNvbnN0IGV4YW1wbGVzVGl0bGUgPSBleGFtcGxlc0Rpdi5jcmVhdGVEaXYoKTtcclxuXHRcdFx0ZXhhbXBsZXNUaXRsZS5hZGRDbGFzcyhcInRhc2stdGltZXItZXhhbXBsZXMtdGl0bGVcIik7XHJcblx0XHRcdGV4YW1wbGVzVGl0bGUuc2V0VGV4dChcIkZvcm1hdCBFeGFtcGxlczpcIik7XHJcblxyXG5cdFx0XHRjb25zdCBleGFtcGxlc0xpc3QgPSBleGFtcGxlc0Rpdi5jcmVhdGVFbChcInVsXCIpO1xyXG5cclxuXHRcdFx0Y29uc3QgZXhhbXBsZXMgPSBbXHJcblx0XHRcdFx0eyBmb3JtYXQ6IFwie2h9aHJze219bWluc1wiLCByZXN1bHQ6IFwiMmhyczMwbWluc1wiIH0sXHJcblx0XHRcdFx0eyBmb3JtYXQ6IFwie2h9aCB7bX1tIHtzfXNcIiwgcmVzdWx0OiBcIjJoIDMwbSA0NXNcIiB9LFxyXG5cdFx0XHRcdHsgZm9ybWF0OiBcIntofTp7bX06e3N9XCIsIHJlc3VsdDogXCIyOjMwOjQ1XCIgfSxcclxuXHRcdFx0XHR7IGZvcm1hdDogXCIoe219bWlucylcIiwgcmVzdWx0OiBcIigxNTBtaW5zKVwiIH0sXHJcblx0XHRcdF07XHJcblxyXG5cdFx0XHRleGFtcGxlcy5mb3JFYWNoKChleGFtcGxlKSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgbGlzdEl0ZW0gPSBleGFtcGxlc0xpc3QuY3JlYXRlRWwoXCJsaVwiKTtcclxuXHRcdFx0XHRjb25zdCBjb2RlRWwgPSBsaXN0SXRlbS5jcmVhdGVFbChcImNvZGVcIik7XHJcblx0XHRcdFx0Y29kZUVsLnNldFRleHQoZXhhbXBsZS5mb3JtYXQpO1xyXG5cdFx0XHRcdGxpc3RJdGVtLmFwcGVuZFRleHQoXCIg4oaSIFwiICsgZXhhbXBsZS5yZXN1bHQpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIEJsb2NrIHJlZmVyZW5jZSBzZWN0aW9uXHJcblx0XHRcdGNvbnN0IGJsb2NrUmVmU2VjdGlvbiA9IHRpbWVyU2VjdGlvbi5jcmVhdGVEaXYoKTtcclxuXHRcdFx0YmxvY2tSZWZTZWN0aW9uLmFkZENsYXNzKFwidGFzay10aW1lci1ibG9ja3JlZi1zZWN0aW9uXCIpO1xyXG5cclxuXHRcdFx0Y29uc3QgYmxvY2tSZWZIZWFkaW5nID0gYmxvY2tSZWZTZWN0aW9uLmNyZWF0ZUVsKFwiaDNcIik7XHJcblx0XHRcdGJsb2NrUmVmSGVhZGluZy5zZXRUZXh0KFwiQmxvY2sgUmVmZXJlbmNlc1wiKTtcclxuXHRcdFx0YmxvY2tSZWZIZWFkaW5nLmFkZENsYXNzKFwidGFzay10aW1lci1zZWN0aW9uLWhlYWRpbmdcIik7XHJcblxyXG5cdFx0XHQvLyBCbG9jayByZWZlcmVuY2UgcHJlZml4IHNldHRpbmdcclxuXHRcdFx0bmV3IFNldHRpbmcoYmxvY2tSZWZTZWN0aW9uKVxyXG5cdFx0XHRcdC5zZXROYW1lKFwiQmxvY2sgcmVmZXJlbmNlIHByZWZpeFwiKVxyXG5cdFx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdFx0XCJQcmVmaXggZm9yIGdlbmVyYXRlZCBibG9jayByZWZlcmVuY2UgSURzIChlLmcuLCAndGltZXInIGNyZWF0ZXMgXnRpbWVyLTEyMzQ1Ni03ODkwKVwiLFxyXG5cdFx0XHRcdClcclxuXHRcdFx0XHQuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHRcdFx0dGV4dC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MudGFza1RpbWVyPy5ibG9ja1JlZlByZWZpeCB8fFxyXG5cdFx0XHRcdFx0XHRcdFwidGltZXJcIixcclxuXHRcdFx0XHRcdCkub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdGlmIChzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy50YXNrVGltZXIpIHtcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy50YXNrVGltZXIuYmxvY2tSZWZQcmVmaXggPVxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQ29tbWFuZHMgc2VjdGlvblxyXG5cdFx0XHRjb25zdCBjb21tYW5kc1NlY3Rpb24gPSB0aW1lclNlY3Rpb24uY3JlYXRlRGl2KCk7XHJcblx0XHRcdGNvbW1hbmRzU2VjdGlvbi5hZGRDbGFzcyhcInRhc2stdGltZXItY29tbWFuZHMtc2VjdGlvblwiKTtcclxuXHJcblx0XHRcdGNvbnN0IGNvbW1hbmRzSGVhZGluZyA9IGNvbW1hbmRzU2VjdGlvbi5jcmVhdGVFbChcImgzXCIpO1xyXG5cdFx0XHRjb21tYW5kc0hlYWRpbmcuc2V0VGV4dChcIkRhdGEgTWFuYWdlbWVudFwiKTtcclxuXHRcdFx0Y29tbWFuZHNIZWFkaW5nLmFkZENsYXNzKFwidGFzay10aW1lci1zZWN0aW9uLWhlYWRpbmdcIik7XHJcblxyXG5cdFx0XHRjb25zdCBjb21tYW5kc0Rlc2MgPSBjb21tYW5kc1NlY3Rpb24uY3JlYXRlRGl2KCk7XHJcblx0XHRcdGNvbW1hbmRzRGVzYy5hZGRDbGFzcyhcInRhc2stdGltZXItY29tbWFuZHMtZGVzY1wiKTtcclxuXHJcblx0XHRcdGNvbnN0IGRlc2NQYXJhZ3JhcGggPSBjb21tYW5kc0Rlc2MuY3JlYXRlRWwoXCJwXCIpO1xyXG5cdFx0XHRkZXNjUGFyYWdyYXBoLnNldFRleHQoXHJcblx0XHRcdFx0XCJVc2UgdGhlIGNvbW1hbmQgcGFsZXR0ZSB0byBhY2Nlc3MgdGltZXIgZGF0YSBtYW5hZ2VtZW50OlwiLFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Y29uc3QgY29tbWFuZHNMaXN0ID0gY29tbWFuZHNEZXNjLmNyZWF0ZUVsKFwidWxcIik7XHJcblxyXG5cdFx0XHRjb25zdCBjb21tYW5kcyA9IFtcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRuYW1lOiBcIkV4cG9ydCB0YXNrIHRpbWVyIGRhdGFcIixcclxuXHRcdFx0XHRcdGRlc2M6IFwiRXhwb3J0IGFsbCB0aW1lciBkYXRhIHRvIEpTT05cIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdG5hbWU6IFwiSW1wb3J0IHRhc2sgdGltZXIgZGF0YVwiLFxyXG5cdFx0XHRcdFx0ZGVzYzogXCJJbXBvcnQgdGltZXIgZGF0YSBmcm9tIEpTT04gZmlsZVwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0bmFtZTogXCJFeHBvcnQgdGFzayB0aW1lciBkYXRhIChZQU1MKVwiLFxyXG5cdFx0XHRcdFx0ZGVzYzogXCJFeHBvcnQgdG8gWUFNTCBmb3JtYXRcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdG5hbWU6IFwiQ3JlYXRlIHRhc2sgdGltZXIgYmFja3VwXCIsXHJcblx0XHRcdFx0XHRkZXNjOiBcIkNyZWF0ZSBhIGJhY2t1cCBvZiBhY3RpdmUgdGltZXJzXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRuYW1lOiBcIlNob3cgdGFzayB0aW1lciBzdGF0aXN0aWNzXCIsXHJcblx0XHRcdFx0XHRkZXNjOiBcIkRpc3BsYXkgdGltZXIgdXNhZ2Ugc3RhdGlzdGljc1wiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdF07XHJcblxyXG5cdFx0XHRjb21tYW5kcy5mb3JFYWNoKChjb21tYW5kKSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgbGlzdEl0ZW0gPSBjb21tYW5kc0xpc3QuY3JlYXRlRWwoXCJsaVwiKTtcclxuXHRcdFx0XHRjb25zdCBzdHJvbmdFbCA9IGxpc3RJdGVtLmNyZWF0ZUVsKFwic3Ryb25nXCIpO1xyXG5cdFx0XHRcdHN0cm9uZ0VsLnNldFRleHQoY29tbWFuZC5uYW1lKTtcclxuXHRcdFx0XHRsaXN0SXRlbS5hcHBlbmRUZXh0KFwiIC0gXCIgKyBjb21tYW5kLmRlc2MpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxufSJdfQ==