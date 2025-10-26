import { __awaiter } from "tslib";
import { Setting, Notice, TFile, TFolder } from "obsidian";
import { t } from "@/translations/helper";
import { FolderSuggest } from "@/components/ui/inputs/AutoComplete";
export function renderQuickCaptureSettingsTab(settingTab, containerEl) {
    var _a;
    new Setting(containerEl).setName(t("Quick capture")).setHeading();
    new Setting(containerEl)
        .setName(t("Enable quick capture"))
        .setDesc(t("Toggle this to enable Org-mode style quick capture panel."))
        .addToggle((toggle) => toggle
        .setValue(settingTab.plugin.settings.quickCapture.enableQuickCapture)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        settingTab.plugin.settings.quickCapture.enableQuickCapture =
            value;
        settingTab.applySettingsUpdate();
        setTimeout(() => {
            settingTab.display();
        }, 200);
    })));
    if (!settingTab.plugin.settings.quickCapture.enableQuickCapture)
        return;
    // Target type selection
    new Setting(containerEl)
        .setName(t("Target type"))
        .setDesc(t("Choose whether to capture to a fixed file or daily note"))
        .addDropdown((dropdown) => dropdown
        .addOption("fixed", t("Fixed file"))
        .addOption("daily-note", t("Daily note"))
        .setValue(settingTab.plugin.settings.quickCapture.targetType)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        settingTab.plugin.settings.quickCapture.targetType =
            value;
        settingTab.applySettingsUpdate();
        // Refresh the settings display to show/hide relevant options
        setTimeout(() => {
            settingTab.display();
        }, 100);
    })));
    // Fixed file settings
    if (settingTab.plugin.settings.quickCapture.targetType === "fixed") {
        new Setting(containerEl)
            .setName(t("Target file"))
            .setDesc(t("The file where captured text will be saved. You can include a path, e.g., 'folder/Quick Capture.md'. Supports date templates like {{DATE:YYYY-MM-DD}} or {{date:YYYY-MM-DD-HHmm}}"))
            .addText((text) => text
            .setValue(settingTab.plugin.settings.quickCapture.targetFile)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.quickCapture.targetFile =
                value;
            settingTab.applySettingsUpdate();
        })));
    }
    // Daily note settings
    if (settingTab.plugin.settings.quickCapture.targetType === "daily-note") {
        // Sync with daily notes plugin button
        new Setting(containerEl)
            .setName(t("Sync with Daily Notes plugin"))
            .setDesc(t("Automatically sync settings from the Daily Notes plugin"))
            .addButton((button) => button.setButtonText(t("Sync now")).onClick(() => __awaiter(this, void 0, void 0, function* () {
            var _b;
            try {
                // Get daily notes plugin settings
                const dailyNotesPlugin = settingTab.app
                    .internalPlugins.plugins["daily-notes"];
                if (dailyNotesPlugin && dailyNotesPlugin.enabled) {
                    const dailyNotesSettings = ((_b = dailyNotesPlugin.instance) === null || _b === void 0 ? void 0 : _b.options) || {};
                    console.log(dailyNotesSettings);
                    settingTab.plugin.settings.quickCapture.dailyNoteSettings =
                        {
                            format: dailyNotesSettings.format ||
                                "YYYY-MM-DD",
                            folder: dailyNotesSettings.folder || "",
                            template: dailyNotesSettings.template || "",
                        };
                    yield settingTab.plugin.saveSettings();
                    // Refresh the settings display
                    setTimeout(() => {
                        settingTab.display();
                    }, 200);
                    new Notice(t("Daily notes settings synced successfully"));
                }
                else {
                    new Notice(t("Daily Notes plugin is not enabled"));
                }
            }
            catch (error) {
                console.error("Failed to sync daily notes settings:", error);
                new Notice(t("Failed to sync daily notes settings"));
            }
        })));
        new Setting(containerEl)
            .setName(t("Daily note format"))
            .setDesc(t("Date format for daily notes (e.g., YYYY-MM-DD)"))
            .addText((text) => {
            var _a;
            return text
                .setValue(((_a = settingTab.plugin.settings.quickCapture
                .dailyNoteSettings) === null || _a === void 0 ? void 0 : _a.format) || "YYYY-MM-DD")
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                settingTab.plugin.settings.quickCapture.dailyNoteSettings.format =
                    value;
                settingTab.applySettingsUpdate();
            }));
        });
        new Setting(containerEl)
            .setName(t("Daily note folder"))
            .setDesc(t("Folder path for daily notes (leave empty for root)"))
            .addText((text) => {
            var _a;
            return text
                .setValue(((_a = settingTab.plugin.settings.quickCapture
                .dailyNoteSettings) === null || _a === void 0 ? void 0 : _a.folder) || "")
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                settingTab.plugin.settings.quickCapture.dailyNoteSettings.folder =
                    value;
                settingTab.applySettingsUpdate();
            }));
        });
        new Setting(containerEl)
            .setName(t("Daily note template"))
            .setDesc(t("Template file path for new daily notes (optional)"))
            .addText((text) => {
            var _a;
            return text
                .setValue(((_a = settingTab.plugin.settings.quickCapture
                .dailyNoteSettings) === null || _a === void 0 ? void 0 : _a.template) || "")
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                settingTab.plugin.settings.quickCapture.dailyNoteSettings.template =
                    value;
                settingTab.applySettingsUpdate();
            }));
        });
    }
    // Target heading setting (for both types)
    new Setting(containerEl)
        .setName(t("Target heading"))
        .setDesc(t("Optional heading to append content under (leave empty to append to file)"))
        .addText((text) => text
        .setValue(settingTab.plugin.settings.quickCapture.targetHeading || "")
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        settingTab.plugin.settings.quickCapture.targetHeading =
            value;
        settingTab.applySettingsUpdate();
    })));
    new Setting(containerEl)
        .setName(t("Placeholder text"))
        .setDesc(t("Placeholder text to display in the capture panel"))
        .addText((text) => text
        .setValue(settingTab.plugin.settings.quickCapture.placeholder)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        settingTab.plugin.settings.quickCapture.placeholder = value;
        settingTab.applySettingsUpdate();
    })));
    new Setting(containerEl)
        .setName(t("Append to file"))
        .setDesc(t("How to add captured content to the target location"))
        .addDropdown((dropdown) => dropdown
        .addOption("append", t("Append"))
        .addOption("prepend", t("Prepend"))
        .addOption("replace", t("Replace"))
        .setValue(settingTab.plugin.settings.quickCapture.appendToFile)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        settingTab.plugin.settings.quickCapture.appendToFile =
            value;
        settingTab.applySettingsUpdate();
    })));
    // Task prefix setting
    new Setting(containerEl)
        .setName(t("Auto-add task prefix"))
        .setDesc(t("Automatically add task checkbox prefix to captured content"))
        .addToggle((toggle) => {
        var _a;
        return toggle
            .setValue((_a = settingTab.plugin.settings.quickCapture.autoAddTaskPrefix) !== null && _a !== void 0 ? _a : true)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.quickCapture.autoAddTaskPrefix =
                value;
            settingTab.applySettingsUpdate();
            // Refresh to show/hide the prefix format field
            setTimeout(() => {
                settingTab.display();
            }, 100);
        }));
    });
    // Custom task prefix
    if (settingTab.plugin.settings.quickCapture.autoAddTaskPrefix) {
        new Setting(containerEl)
            .setName(t("Task prefix format"))
            .setDesc(t("The prefix to add before captured content (e.g., '- [ ]' for task, '- ' for list item)"))
            .addText((text) => text
            .setValue(settingTab.plugin.settings.quickCapture.taskPrefix ||
            "- [ ]")
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.quickCapture.taskPrefix =
                value || "- [ ]";
            settingTab.applySettingsUpdate();
        })));
    }
    new Setting(containerEl).setName(t("Enhanced")).setHeading();
    // Keep open after capture
    new Setting(containerEl)
        .setName(t("Keep open after capture"))
        .setDesc(t("Keep the modal open after capturing content"))
        .addToggle((toggle) => toggle
        .setValue(settingTab.plugin.settings.quickCapture
        .keepOpenAfterCapture || false)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        settingTab.plugin.settings.quickCapture.keepOpenAfterCapture =
            value;
        settingTab.applySettingsUpdate();
    })));
    // Remember last mode
    new Setting(containerEl)
        .setName(t("Remember last mode"))
        .setDesc(t("Remember the last used quick capture mode"))
        .addToggle((toggle) => {
        var _a;
        return toggle
            .setValue((_a = settingTab.plugin.settings.quickCapture.rememberLastMode) !== null && _a !== void 0 ? _a : true)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.quickCapture.rememberLastMode =
                value;
            settingTab.applySettingsUpdate();
        }));
    });
    // File creation mode settings
    new Setting(containerEl).setName(t("File Creation Mode")).setHeading();
    // Initialize createFileMode if not exists and keep a local reference for type safety
    const createFileMode = ((_a = settingTab.plugin.settings.quickCapture).createFileMode || (_a.createFileMode = {
        defaultFolder: "",
        useTemplate: false,
        templateFile: "",
    }));
    // Default folder for file creation
    new Setting(containerEl)
        .setName(t("Default folder for new files"))
        .setDesc(t("Used by File mode (requires FileSource). Leave empty for vault root."))
        .addText((text) => text
        .setValue(createFileMode.defaultFolder || "")
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        createFileMode.defaultFolder = value;
        settingTab.applySettingsUpdate();
    })));
    // Use template for new files
    new Setting(containerEl)
        .setName(t("Use template for new files"))
        .setDesc(t("When File mode is used, create the new note from a template and then insert the captured content."))
        .addToggle((toggle) => toggle
        .setValue(createFileMode.useTemplate || false)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        createFileMode.useTemplate = value;
        settingTab.applySettingsUpdate();
        // Refresh to show/hide template field
        setTimeout(() => {
            settingTab.display();
        }, 100);
    })));
    // Write content tags (#tags) to frontmatter
    new Setting(containerEl)
        .setName(t("Write content tags to frontmatter"))
        .setDesc(t("If enabled, #tags in the editor content are written into YAML frontmatter tags (merged and deduplicated)"))
        .addToggle((toggle) => toggle
        .setValue(createFileMode.writeContentTagsToFrontmatter || false)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        createFileMode.writeContentTagsToFrontmatter = value;
        settingTab.applySettingsUpdate();
    })));
    // Default file name template (File mode)
    new Setting(containerEl)
        .setName(t("Default file name template"))
        .setDesc(t("Used by File mode to prefill the file name input (supports date templates like {{DATE:YYYY-MM-DD}})"))
        .addText((text) => text
        .setValue(settingTab.plugin.settings.quickCapture
        .defaultFileNameTemplate || "{{DATE:YYYY-MM-DD}} - ")
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        settingTab.plugin.settings.quickCapture.defaultFileNameTemplate =
            value;
        settingTab.applySettingsUpdate();
    })));
    // Template file path
    if (createFileMode.useTemplate) {
        const templateFolderPath = (createFileMode.templateFolder || "").trim();
        const folderFile = templateFolderPath
            ? settingTab.app.vault.getAbstractFileByPath(templateFolderPath)
            : null;
        const folderExists = folderFile instanceof TFolder;
        const templateFiles = [];
        if (folderExists) {
            const collectMarkdownFiles = (folder) => {
                for (const child of folder.children) {
                    if (child instanceof TFolder) {
                        collectMarkdownFiles(child);
                    }
                    else if (child instanceof TFile &&
                        child.extension.toLowerCase() === "md") {
                        templateFiles.push(child);
                    }
                }
            };
            collectMarkdownFiles(folderFile);
            templateFiles.sort((a, b) => a.path.localeCompare(b.path));
        }
        new Setting(containerEl)
            .setName(t("Template folder"))
            .setDesc(folderExists || !templateFolderPath
            ? t("Folder that contains Quick Capture templates for File mode.")
            : t("Selected folder was not found in the vault."))
            .addText((text) => {
            text
                .setPlaceholder(t("Templates/Quick Capture"))
                .setValue(createFileMode.templateFolder || "")
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                const previous = createFileMode.templateFolder || "";
                const normalized = value.trim();
                createFileMode.templateFolder = normalized;
                if (previous !== normalized) {
                    createFileMode.templateFile = "";
                }
                settingTab.applySettingsUpdate();
                setTimeout(() => {
                    settingTab.display();
                }, 100);
            }));
            new FolderSuggest(settingTab.app, text.inputEl, settingTab.plugin, "single");
        });
        new Setting(containerEl)
            .setName(t("Template note"))
            .setDesc(!templateFolderPath
            ? t("Select a template folder above to enable the dropdown.")
            : !folderExists
                ? t("Template folder is invalid; update the folder to continue.")
                : templateFiles.length > 0
                    ? t("Choose the note that should be copied; {{CONTENT}} placeholders are replaced, otherwise the captured text is appended.")
                    : t("No markdown notes were found in the selected folder."))
            .addDropdown((dropdown) => {
            dropdown.addOption("", t("None"));
            const existingTemplate = createFileMode.templateFile || "";
            if (existingTemplate &&
                !templateFiles.some((file) => file.path === existingTemplate)) {
                dropdown.addOption(existingTemplate, existingTemplate);
            }
            for (const file of templateFiles) {
                dropdown.addOption(file.path, file.basename);
            }
            dropdown.setValue(createFileMode.templateFile || "");
            dropdown.onChange((value) => __awaiter(this, void 0, void 0, function* () {
                createFileMode.templateFile = value;
                settingTab.applySettingsUpdate();
            }));
            if (!templateFiles.length || !folderExists) {
                dropdown.selectEl.disabled = true;
            }
        });
    }
    // Minimal mode settings
    new Setting(containerEl).setName(t("Minimal Mode")).setHeading();
    new Setting(containerEl)
        .setName(t("Enable minimal mode"))
        .setDesc(t("Enable simplified single-line quick capture with inline suggestions"))
        .addToggle((toggle) => toggle
        .setValue(settingTab.plugin.settings.quickCapture.enableMinimalMode)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        settingTab.plugin.settings.quickCapture.enableMinimalMode =
            value;
        settingTab.applySettingsUpdate();
        // Refresh the settings display to show/hide minimal mode options
        setTimeout(() => {
            settingTab.display();
        }, 100);
    })));
    if (!settingTab.plugin.settings.quickCapture.enableMinimalMode)
        return;
    if (!settingTab.plugin.settings.quickCapture.minimalModeSettings) {
        settingTab.plugin.settings.quickCapture.minimalModeSettings = {
            suggestTrigger: "/",
        };
    }
    // Suggest trigger character
    new Setting(containerEl)
        .setName(t("Suggest trigger character"))
        .setDesc(t("Character to trigger the suggestion menu"))
        .addText((text) => text
        .setValue(settingTab.plugin.settings.quickCapture.minimalModeSettings
        .suggestTrigger)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        settingTab.plugin.settings.quickCapture.minimalModeSettings.suggestTrigger =
            value || "/";
        settingTab.applySettingsUpdate();
    })));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUXVpY2tDYXB0dXJlU2V0dGluZ3NUYWIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJRdWlja0NhcHR1cmVTZXR0aW5nc1RhYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUUzRCxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDMUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRXBFLE1BQU0sVUFBVSw2QkFBNkIsQ0FDNUMsVUFBcUMsRUFDckMsV0FBd0I7O0lBRXhCLElBQUksT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUVsRSxJQUFJLE9BQU8sQ0FBQyxXQUFXLENBQUM7U0FDdEIsT0FBTyxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1NBQ2xDLE9BQU8sQ0FBQyxDQUFDLENBQUMsMkRBQTJELENBQUMsQ0FBQztTQUN2RSxTQUFTLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUNyQixNQUFNO1NBQ0osUUFBUSxDQUNSLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxrQkFBa0IsQ0FDMUQ7U0FDQSxRQUFRLENBQUMsQ0FBTyxLQUFLLEVBQUUsRUFBRTtRQUN6QixVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsa0JBQWtCO1lBQ3pELEtBQUssQ0FBQztRQUNQLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBRWpDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDZixVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDdEIsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ1QsQ0FBQyxDQUFBLENBQUMs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WUFDN0QsY0FBYyxFQUFFLEdBQUc7U0FDbkIsQ0FBQztLQUNGO0lBRUQsNEJBQTRCO0lBQzVCLElBQUksT0FBTyxDQUFDLFdBQVcsQ0FBQztTQUN0QixPQUFPLENBQUMsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUM7U0FDdkMsT0FBTyxDQUFDLENBQUMsQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDO1NBQ3RELE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQ2pCLElBQUk7U0FDRixRQUFRLENBQ1IsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLG1CQUFtQjtTQUN6RCxjQUFjLENBQ2hCO1NBQ0EsUUFBUSxDQUFDLENBQU8sS0FBSyxFQUFFLEVBQUU7UUFDekIsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUFDLGNBQWM7WUFDekUsS0FBSyxJQUFJLEdBQUcsQ0FBQztRQUNkLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO0lBQ2xDLENBQUMsQ0FBQSxDQUFDLENBQ0gsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTZXR0aW5nLCBOb3RpY2UsIFRGaWxlLCBURm9sZGVyIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFRhc2tQcm9ncmVzc0JhclNldHRpbmdUYWIgfSBmcm9tIFwiQC9zZXR0aW5nXCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCB7IEZvbGRlclN1Z2dlc3QgfSBmcm9tIFwiQC9jb21wb25lbnRzL3VpL2lucHV0cy9BdXRvQ29tcGxldGVcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJRdWlja0NhcHR1cmVTZXR0aW5nc1RhYihcclxuXHRzZXR0aW5nVGFiOiBUYXNrUHJvZ3Jlc3NCYXJTZXR0aW5nVGFiLFxyXG5cdGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudFxyXG4pIHtcclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZSh0KFwiUXVpY2sgY2FwdHVyZVwiKSkuc2V0SGVhZGluZygpO1xyXG5cclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJFbmFibGUgcXVpY2sgY2FwdHVyZVwiKSlcclxuXHRcdC5zZXREZXNjKHQoXCJUb2dnbGUgdGhpcyB0byBlbmFibGUgT3JnLW1vZGUgc3R5bGUgcXVpY2sgY2FwdHVyZSBwYW5lbC5cIikpXHJcblx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+XHJcblx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZS5lbmFibGVRdWlja0NhcHR1cmVcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLmVuYWJsZVF1aWNrQ2FwdHVyZSA9XHJcblx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblxyXG5cdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIuZGlzcGxheSgpO1xyXG5cdFx0XHRcdFx0fSwgMjAwKTtcclxuXHRcdFx0XHR9KVxyXG5cdFx0KTtcclxuXHJcblx0aWYgKCFzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUuZW5hYmxlUXVpY2tDYXB0dXJlKSByZXR1cm47XHJcblxyXG5cdC8vIFRhcmdldCB0eXBlIHNlbGVjdGlvblxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIlRhcmdldCB0eXBlXCIpKVxyXG5cdFx0LnNldERlc2ModChcIkNob29zZSB3aGV0aGVyIHRvIGNhcHR1cmUgdG8gYSBmaXhlZCBmaWxlIG9yIGRhaWx5IG5vdGVcIikpXHJcblx0XHQuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PlxyXG5cdFx0XHRkcm9wZG93blxyXG5cdFx0XHRcdC5hZGRPcHRpb24oXCJmaXhlZFwiLCB0KFwiRml4ZWQgZmlsZVwiKSlcclxuXHRcdFx0XHQuYWRkT3B0aW9uKFwiZGFpbHktbm90ZVwiLCB0KFwiRGFpbHkgbm90ZVwiKSlcclxuXHRcdFx0XHQuc2V0VmFsdWUoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLnRhcmdldFR5cGUpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLnRhcmdldFR5cGUgPVxyXG5cdFx0XHRcdFx0XHR2YWx1ZSBhcyBcImZpeGVkXCIgfCBcImRhaWx5LW5vdGVcIjtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0Ly8gUmVmcmVzaCB0aGUgc2V0dGluZ3MgZGlzcGxheSB0byBzaG93L2hpZGUgcmVsZXZhbnQgb3B0aW9uc1xyXG5cdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIuZGlzcGxheSgpO1xyXG5cdFx0XHRcdFx0fSwgMTAwKTtcclxuXHRcdFx0XHR9KVxyXG5cdFx0KTtcclxuXHJcblx0Ly8gRml4ZWQgZmlsZSBzZXR0aW5nc1xyXG5cdGlmIChzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUudGFyZ2V0VHlwZSA9PT0gXCJmaXhlZFwiKSB7XHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0LnNldE5hbWUodChcIlRhcmdldCBmaWxlXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XCJUaGUgZmlsZSB3aGVyZSBjYXB0dXJlZCB0ZXh0IHdpbGwgYmUgc2F2ZWQuIFlvdSBjYW4gaW5jbHVkZSBhIHBhdGgsIGUuZy4sICdmb2xkZXIvUXVpY2sgQ2FwdHVyZS5tZCcuIFN1cHBvcnRzIGRhdGUgdGVtcGxhdGVzIGxpa2Uge3tEQVRFOllZWVktTU0tRER9fSBvciB7e2RhdGU6WVlZWS1NTS1ERC1ISG1tfX1cIlxyXG5cdFx0XHRcdClcclxuXHRcdFx0KVxyXG5cdFx0XHQuYWRkVGV4dCgodGV4dCkgPT5cclxuXHRcdFx0XHR0ZXh0XHJcblx0XHRcdFx0XHQuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZS50YXJnZXRGaWxlXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZS50YXJnZXRGaWxlID1cclxuXHRcdFx0XHRcdFx0XHR2YWx1ZTtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHQpO1xyXG5cdH1cclxuXHJcblx0Ly8gRGFpbHkgbm90ZSBzZXR0aW5nc1xyXG5cdGlmIChzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUudGFyZ2V0VHlwZSA9PT0gXCJkYWlseS1ub3RlXCIpIHtcclxuXHRcdC8vIFN5bmMgd2l0aCBkYWlseSBub3RlcyBwbHVnaW4gYnV0dG9uXHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0LnNldE5hbWUodChcIlN5bmMgd2l0aCBEYWlseSBOb3RlcyBwbHVnaW5cIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdHQoXCJBdXRvbWF0aWNhbGx5IHN5bmMgc2V0dGluZ3MgZnJvbSB0aGUgRGFpbHkgTm90ZXMgcGx1Z2luXCIpXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZEJ1dHRvbigoYnV0dG9uKSA9PlxyXG5cdFx0XHRcdGJ1dHRvbi5zZXRCdXR0b25UZXh0KHQoXCJTeW5jIG5vd1wiKSkub25DbGljayhhc3luYyAoKSA9PiB7XHJcblx0XHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0XHQvLyBHZXQgZGFpbHkgbm90ZXMgcGx1Z2luIHNldHRpbmdzXHJcblx0XHRcdFx0XHRcdGNvbnN0IGRhaWx5Tm90ZXNQbHVnaW4gPSAoc2V0dGluZ1RhYi5hcHAgYXMgYW55KVxyXG5cdFx0XHRcdFx0XHRcdC5pbnRlcm5hbFBsdWdpbnMucGx1Z2luc1tcImRhaWx5LW5vdGVzXCJdO1xyXG5cdFx0XHRcdFx0XHRpZiAoZGFpbHlOb3Rlc1BsdWdpbiAmJiBkYWlseU5vdGVzUGx1Z2luLmVuYWJsZWQpIHtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBkYWlseU5vdGVzU2V0dGluZ3MgPVxyXG5cdFx0XHRcdFx0XHRcdFx0ZGFpbHlOb3Rlc1BsdWdpbi5pbnN0YW5jZT8ub3B0aW9ucyB8fCB7fTtcclxuXHJcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coZGFpbHlOb3Rlc1NldHRpbmdzKTtcclxuXHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLmRhaWx5Tm90ZVNldHRpbmdzID1cclxuXHRcdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Zm9ybWF0OlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGRhaWx5Tm90ZXNTZXR0aW5ncy5mb3JtYXQgfHxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcIllZWVktTU0tRERcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0Zm9sZGVyOiBkYWlseU5vdGVzU2V0dGluZ3MuZm9sZGVyIHx8IFwiXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdHRlbXBsYXRlOiBkYWlseU5vdGVzU2V0dGluZ3MudGVtcGxhdGUgfHwgXCJcIixcclxuXHRcdFx0XHRcdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdFx0XHRcdGF3YWl0IHNldHRpbmdUYWIucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyBSZWZyZXNoIHRoZSBzZXR0aW5ncyBkaXNwbGF5XHJcblx0XHRcdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmRpc3BsYXkoKTtcclxuXHRcdFx0XHRcdFx0XHR9LCAyMDApO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRuZXcgTm90aWNlKFxyXG5cdFx0XHRcdFx0XHRcdFx0dChcIkRhaWx5IG5vdGVzIHNldHRpbmdzIHN5bmNlZCBzdWNjZXNzZnVsbHlcIilcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdG5ldyBOb3RpY2UodChcIkRhaWx5IE5vdGVzIHBsdWdpbiBpcyBub3QgZW5hYmxlZFwiKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXHJcblx0XHRcdFx0XHRcdFx0XCJGYWlsZWQgdG8gc3luYyBkYWlseSBub3RlcyBzZXR0aW5nczpcIixcclxuXHRcdFx0XHRcdFx0XHRlcnJvclxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRuZXcgTm90aWNlKHQoXCJGYWlsZWQgdG8gc3luYyBkYWlseSBub3RlcyBzZXR0aW5nc1wiKSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSlcclxuXHRcdFx0KTtcclxuXHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0LnNldE5hbWUodChcIkRhaWx5IG5vdGUgZm9ybWF0XCIpKVxyXG5cdFx0XHQuc2V0RGVzYyh0KFwiRGF0ZSBmb3JtYXQgZm9yIGRhaWx5IG5vdGVzIChlLmcuLCBZWVlZLU1NLUREKVwiKSlcclxuXHRcdFx0LmFkZFRleHQoKHRleHQpID0+XHJcblx0XHRcdFx0dGV4dFxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmVcclxuXHRcdFx0XHRcdFx0XHQuZGFpbHlOb3RlU2V0dGluZ3M/LmZvcm1hdCB8fCBcIllZWVktTU0tRERcIlxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUuZGFpbHlOb3RlU2V0dGluZ3MuZm9ybWF0ID1cclxuXHRcdFx0XHRcdFx0XHR2YWx1ZTtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiRGFpbHkgbm90ZSBmb2xkZXJcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJGb2xkZXIgcGF0aCBmb3IgZGFpbHkgbm90ZXMgKGxlYXZlIGVtcHR5IGZvciByb290KVwiKSlcclxuXHRcdFx0LmFkZFRleHQoKHRleHQpID0+XHJcblx0XHRcdFx0dGV4dFxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmVcclxuXHRcdFx0XHRcdFx0XHQuZGFpbHlOb3RlU2V0dGluZ3M/LmZvbGRlciB8fCBcIlwiXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZS5kYWlseU5vdGVTZXR0aW5ncy5mb2xkZXIgPVxyXG5cdFx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJEYWlseSBub3RlIHRlbXBsYXRlXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyh0KFwiVGVtcGxhdGUgZmlsZSBwYXRoIGZvciBuZXcgZGFpbHkgbm90ZXMgKG9wdGlvbmFsKVwiKSlcclxuXHRcdFx0LmFkZFRleHQoKHRleHQpID0+XHJcblx0XHRcdFx0dGV4dFxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmVcclxuXHRcdFx0XHRcdFx0XHQuZGFpbHlOb3RlU2V0dGluZ3M/LnRlbXBsYXRlIHx8IFwiXCJcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLmRhaWx5Tm90ZVNldHRpbmdzLnRlbXBsYXRlID1cclxuXHRcdFx0XHRcdFx0XHR2YWx1ZTtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHQpO1xyXG5cdH1cclxuXHJcblx0Ly8gVGFyZ2V0IGhlYWRpbmcgc2V0dGluZyAoZm9yIGJvdGggdHlwZXMpXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiVGFyZ2V0IGhlYWRpbmdcIikpXHJcblx0XHQuc2V0RGVzYyhcclxuXHRcdFx0dChcclxuXHRcdFx0XHRcIk9wdGlvbmFsIGhlYWRpbmcgdG8gYXBwZW5kIGNvbnRlbnQgdW5kZXIgKGxlYXZlIGVtcHR5IHRvIGFwcGVuZCB0byBmaWxlKVwiXHJcblx0XHRcdClcclxuXHRcdClcclxuXHRcdC5hZGRUZXh0KCh0ZXh0KSA9PlxyXG5cdFx0XHR0ZXh0XHJcblx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLnRhcmdldEhlYWRpbmcgfHwgXCJcIlxyXG5cdFx0XHRcdClcclxuXHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUudGFyZ2V0SGVhZGluZyA9XHJcblx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0fSlcclxuXHRcdCk7XHJcblxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIlBsYWNlaG9sZGVyIHRleHRcIikpXHJcblx0XHQuc2V0RGVzYyh0KFwiUGxhY2Vob2xkZXIgdGV4dCB0byBkaXNwbGF5IGluIHRoZSBjYXB0dXJlIHBhbmVsXCIpKVxyXG5cdFx0LmFkZFRleHQoKHRleHQpID0+XHJcblx0XHRcdHRleHRcclxuXHRcdFx0XHQuc2V0VmFsdWUoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLnBsYWNlaG9sZGVyKVxyXG5cdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZS5wbGFjZWhvbGRlciA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0fSlcclxuXHRcdCk7XHJcblxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIkFwcGVuZCB0byBmaWxlXCIpKVxyXG5cdFx0LnNldERlc2ModChcIkhvdyB0byBhZGQgY2FwdHVyZWQgY29udGVudCB0byB0aGUgdGFyZ2V0IGxvY2F0aW9uXCIpKVxyXG5cdFx0LmFkZERyb3Bkb3duKChkcm9wZG93bikgPT5cclxuXHRcdFx0ZHJvcGRvd25cclxuXHRcdFx0XHQuYWRkT3B0aW9uKFwiYXBwZW5kXCIsIHQoXCJBcHBlbmRcIikpXHJcblx0XHRcdFx0LmFkZE9wdGlvbihcInByZXBlbmRcIiwgdChcIlByZXBlbmRcIikpXHJcblx0XHRcdFx0LmFkZE9wdGlvbihcInJlcGxhY2VcIiwgdChcIlJlcGxhY2VcIikpXHJcblx0XHRcdFx0LnNldFZhbHVlKHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZS5hcHBlbmRUb0ZpbGUpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLmFwcGVuZFRvRmlsZSA9XHJcblx0XHRcdFx0XHRcdHZhbHVlIGFzIFwiYXBwZW5kXCIgfCBcInByZXBlbmRcIiB8IFwicmVwbGFjZVwiO1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0fSlcclxuXHRcdCk7XHJcblxyXG5cdC8vIFRhc2sgcHJlZml4IHNldHRpbmdcclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJBdXRvLWFkZCB0YXNrIHByZWZpeFwiKSlcclxuXHRcdC5zZXREZXNjKFxyXG5cdFx0XHR0KFwiQXV0b21hdGljYWxseSBhZGQgdGFzayBjaGVja2JveCBwcmVmaXggdG8gY2FwdHVyZWQgY29udGVudFwiKVxyXG5cdFx0KVxyXG5cdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxyXG5cdFx0XHR0b2dnbGVcclxuXHRcdFx0XHQuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUuYXV0b0FkZFRhc2tQcmVmaXggPz9cclxuXHRcdFx0XHRcdFx0dHJ1ZVxyXG5cdFx0XHRcdClcclxuXHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUuYXV0b0FkZFRhc2tQcmVmaXggPVxyXG5cdFx0XHRcdFx0XHR2YWx1ZTtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0Ly8gUmVmcmVzaCB0byBzaG93L2hpZGUgdGhlIHByZWZpeCBmb3JtYXQgZmllbGRcclxuXHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmRpc3BsYXkoKTtcclxuXHRcdFx0XHRcdH0sIDEwMCk7XHJcblx0XHRcdFx0fSlcclxuXHRcdCk7XHJcblxyXG5cdC8vIEN1c3RvbSB0YXNrIHByZWZpeFxyXG5cdGlmIChzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUuYXV0b0FkZFRhc2tQcmVmaXgpIHtcclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiVGFzayBwcmVmaXggZm9ybWF0XCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XCJUaGUgcHJlZml4IHRvIGFkZCBiZWZvcmUgY2FwdHVyZWQgY29udGVudCAoZS5nLiwgJy0gWyBdJyBmb3IgdGFzaywgJy0gJyBmb3IgbGlzdCBpdGVtKVwiXHJcblx0XHRcdFx0KVxyXG5cdFx0XHQpXHJcblx0XHRcdC5hZGRUZXh0KCh0ZXh0KSA9PlxyXG5cdFx0XHRcdHRleHRcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLnRhc2tQcmVmaXggfHxcclxuXHRcdFx0XHRcdFx0XHRcIi0gWyBdXCJcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLnRhc2tQcmVmaXggPVxyXG5cdFx0XHRcdFx0XHRcdHZhbHVlIHx8IFwiLSBbIF1cIjtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHQpO1xyXG5cdH1cclxuXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpLnNldE5hbWUodChcIkVuaGFuY2VkXCIpKS5zZXRIZWFkaW5nKCk7XHJcblxyXG5cdC8vIEtlZXAgb3BlbiBhZnRlciBjYXB0dXJlXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiS2VlcCBvcGVuIGFmdGVyIGNhcHR1cmVcIikpXHJcblx0XHQuc2V0RGVzYyh0KFwiS2VlcCB0aGUgbW9kYWwgb3BlbiBhZnRlciBjYXB0dXJpbmcgY29udGVudFwiKSlcclxuXHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT5cclxuXHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlXHJcblx0XHRcdFx0XHRcdC5rZWVwT3BlbkFmdGVyQ2FwdHVyZSB8fCBmYWxzZVxyXG5cdFx0XHRcdClcclxuXHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUua2VlcE9wZW5BZnRlckNhcHR1cmUgPVxyXG5cdFx0XHRcdFx0XHR2YWx1ZTtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdH0pXHJcblx0XHQpO1xyXG5cclxuXHQvLyBSZW1lbWJlciBsYXN0IG1vZGVcclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJSZW1lbWJlciBsYXN0IG1vZGVcIikpXHJcblx0XHQuc2V0RGVzYyh0KFwiUmVtZW1iZXIgdGhlIGxhc3QgdXNlZCBxdWljayBjYXB0dXJlIG1vZGVcIikpXHJcblx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+XHJcblx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZS5yZW1lbWJlckxhc3RNb2RlID8/XHJcblx0XHRcdFx0XHRcdHRydWVcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLnJlbWVtYmVyTGFzdE1vZGUgPVxyXG5cdFx0XHRcdFx0XHR2YWx1ZTtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdH0pXHJcblx0XHQpO1xyXG5cclxuXHQvLyBGaWxlIGNyZWF0aW9uIG1vZGUgc2V0dGluZ3NcclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZSh0KFwiRmlsZSBDcmVhdGlvbiBNb2RlXCIpKS5zZXRIZWFkaW5nKCk7XHJcblxyXG5cdC8vIEluaXRpYWxpemUgY3JlYXRlRmlsZU1vZGUgaWYgbm90IGV4aXN0cyBhbmQga2VlcCBhIGxvY2FsIHJlZmVyZW5jZSBmb3IgdHlwZSBzYWZldHlcclxuXHRjb25zdCBjcmVhdGVGaWxlTW9kZSA9XHJcblx0XHQoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLmNyZWF0ZUZpbGVNb2RlIHx8PSB7XHJcblx0XHRcdGRlZmF1bHRGb2xkZXI6IFwiXCIsXHJcblx0XHRcdHVzZVRlbXBsYXRlOiBmYWxzZSxcclxuXHRcdFx0dGVtcGxhdGVGaWxlOiBcIlwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdC8vIERlZmF1bHQgZm9sZGVyIGZvciBmaWxlIGNyZWF0aW9uXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiRGVmYXVsdCBmb2xkZXIgZm9yIG5ldyBmaWxlc1wiKSlcclxuXHRcdC5zZXREZXNjKFxyXG5cdFx0XHR0KFxyXG5cdFx0XHRcdFwiVXNlZCBieSBGaWxlIG1vZGUgKHJlcXVpcmVzIEZpbGVTb3VyY2UpLiBMZWF2ZSBlbXB0eSBmb3IgdmF1bHQgcm9vdC5cIlxyXG5cdFx0XHQpXHJcblx0XHQpXHJcblx0XHQuYWRkVGV4dCgodGV4dCkgPT5cclxuXHRcdFx0dGV4dFxyXG5cdFx0XHRcdC5zZXRWYWx1ZShjcmVhdGVGaWxlTW9kZS5kZWZhdWx0Rm9sZGVyIHx8IFwiXCIpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0Y3JlYXRlRmlsZU1vZGUuZGVmYXVsdEZvbGRlciA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0fSlcclxuXHRcdCk7XHJcblxyXG5cdC8vIFVzZSB0ZW1wbGF0ZSBmb3IgbmV3IGZpbGVzXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiVXNlIHRlbXBsYXRlIGZvciBuZXcgZmlsZXNcIikpXHJcblx0XHQuc2V0RGVzYyhcclxuXHRcdFx0dChcclxuXHRcdFx0XHRcIldoZW4gRmlsZSBtb2RlIGlzIHVzZWQsIGNyZWF0ZSB0aGUgbmV3IG5vdGUgZnJvbSBhIHRlbXBsYXRlIGFuZCB0aGVuIGluc2VydCB0aGUgY2FwdHVyZWQgY29udGVudC5cIlxyXG5cdFx0XHQpXHJcblx0XHQpXHJcblx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+XHJcblx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdC5zZXRWYWx1ZShjcmVhdGVGaWxlTW9kZS51c2VUZW1wbGF0ZSB8fCBmYWxzZSlcclxuXHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRjcmVhdGVGaWxlTW9kZS51c2VUZW1wbGF0ZSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHQvLyBSZWZyZXNoIHRvIHNob3cvaGlkZSB0ZW1wbGF0ZSBmaWVsZFxyXG5cdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIuZGlzcGxheSgpO1xyXG5cdFx0XHRcdFx0fSwgMTAwKTtcclxuXHRcdFx0XHR9KVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBXcml0ZSBjb250ZW50IHRhZ3MgKCN0YWdzKSB0byBmcm9udG1hdHRlclxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJXcml0ZSBjb250ZW50IHRhZ3MgdG8gZnJvbnRtYXR0ZXJcIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcIklmIGVuYWJsZWQsICN0YWdzIGluIHRoZSBlZGl0b3IgY29udGVudCBhcmUgd3JpdHRlbiBpbnRvIFlBTUwgZnJvbnRtYXR0ZXIgdGFncyAobWVyZ2VkIGFuZCBkZWR1cGxpY2F0ZWQpXCJcclxuXHRcdFx0XHQpXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxyXG5cdFx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKGNyZWF0ZUZpbGVNb2RlLndyaXRlQ29udGVudFRhZ3NUb0Zyb250bWF0dGVyIHx8IGZhbHNlKVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRjcmVhdGVGaWxlTW9kZS53cml0ZUNvbnRlbnRUYWdzVG9Gcm9udG1hdHRlciA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdCk7XHJcblxyXG5cclxuXHQvLyBEZWZhdWx0IGZpbGUgbmFtZSB0ZW1wbGF0ZSAoRmlsZSBtb2RlKVxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIkRlZmF1bHQgZmlsZSBuYW1lIHRlbXBsYXRlXCIpKVxyXG5cdFx0LnNldERlc2MoXHJcblx0XHRcdHQoXHJcblx0XHRcdFx0XCJVc2VkIGJ5IEZpbGUgbW9kZSB0byBwcmVmaWxsIHRoZSBmaWxlIG5hbWUgaW5wdXQgKHN1cHBvcnRzIGRhdGUgdGVtcGxhdGVzIGxpa2Uge3tEQVRFOllZWVktTU0tRER9fSlcIlxyXG5cdFx0XHQpXHJcblx0XHQpXHJcblx0XHQuYWRkVGV4dCgodGV4dCkgPT5cclxuXHRcdFx0dGV4dFxyXG5cdFx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZVxyXG5cdFx0XHRcdFx0XHQuZGVmYXVsdEZpbGVOYW1lVGVtcGxhdGUgfHwgXCJ7e0RBVEU6WVlZWS1NTS1ERH19IC0gXCJcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLmRlZmF1bHRGaWxlTmFtZVRlbXBsYXRlID1cclxuXHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHR9KVxyXG5cdFx0KTtcclxuXHJcblx0Ly8gVGVtcGxhdGUgZmlsZSBwYXRoXHJcblx0aWYgKGNyZWF0ZUZpbGVNb2RlLnVzZVRlbXBsYXRlKSB7XHJcblx0XHRjb25zdCB0ZW1wbGF0ZUZvbGRlclBhdGggPSAoY3JlYXRlRmlsZU1vZGUudGVtcGxhdGVGb2xkZXIgfHwgXCJcIikudHJpbSgpO1xyXG5cdFx0Y29uc3QgZm9sZGVyRmlsZSA9IHRlbXBsYXRlRm9sZGVyUGF0aFxyXG5cdFx0XHQ/IHNldHRpbmdUYWIuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh0ZW1wbGF0ZUZvbGRlclBhdGgpXHJcblx0XHRcdDogbnVsbDtcclxuXHRcdGNvbnN0IGZvbGRlckV4aXN0cyA9IGZvbGRlckZpbGUgaW5zdGFuY2VvZiBURm9sZGVyO1xyXG5cdFx0Y29uc3QgdGVtcGxhdGVGaWxlczogVEZpbGVbXSA9IFtdO1xyXG5cclxuXHRcdGlmIChmb2xkZXJFeGlzdHMpIHtcclxuXHRcdFx0Y29uc3QgY29sbGVjdE1hcmtkb3duRmlsZXMgPSAoZm9sZGVyOiBURm9sZGVyKSA9PiB7XHJcblx0XHRcdFx0Zm9yIChjb25zdCBjaGlsZCBvZiBmb2xkZXIuY2hpbGRyZW4pIHtcclxuXHRcdFx0XHRcdGlmIChjaGlsZCBpbnN0YW5jZW9mIFRGb2xkZXIpIHtcclxuXHRcdFx0XHRcdFx0Y29sbGVjdE1hcmtkb3duRmlsZXMoY2hpbGQpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIGlmIChcclxuXHRcdFx0XHRcdFx0Y2hpbGQgaW5zdGFuY2VvZiBURmlsZSAmJlxyXG5cdFx0XHRcdFx0XHRjaGlsZC5leHRlbnNpb24udG9Mb3dlckNhc2UoKSA9PT0gXCJtZFwiXHJcblx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0dGVtcGxhdGVGaWxlcy5wdXNoKGNoaWxkKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblx0XHRcdGNvbGxlY3RNYXJrZG93bkZpbGVzKGZvbGRlckZpbGUpO1xyXG5cdFx0XHR0ZW1wbGF0ZUZpbGVzLnNvcnQoKGEsIGIpID0+IGEucGF0aC5sb2NhbGVDb21wYXJlKGIucGF0aCkpO1xyXG5cdFx0fVxyXG5cclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiVGVtcGxhdGUgZm9sZGVyXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHRmb2xkZXJFeGlzdHMgfHwgIXRlbXBsYXRlRm9sZGVyUGF0aFxyXG5cdFx0XHRcdFx0PyB0KFwiRm9sZGVyIHRoYXQgY29udGFpbnMgUXVpY2sgQ2FwdHVyZSB0ZW1wbGF0ZXMgZm9yIEZpbGUgbW9kZS5cIilcclxuXHRcdFx0XHRcdDogdChcIlNlbGVjdGVkIGZvbGRlciB3YXMgbm90IGZvdW5kIGluIHRoZSB2YXVsdC5cIilcclxuXHRcdFx0KVxyXG5cdFx0XHQuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHRcdHRleHRcclxuXHRcdFx0XHRcdC5zZXRQbGFjZWhvbGRlcih0KFwiVGVtcGxhdGVzL1F1aWNrIENhcHR1cmVcIikpXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUoY3JlYXRlRmlsZU1vZGUudGVtcGxhdGVGb2xkZXIgfHwgXCJcIilcclxuXHRcdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgcHJldmlvdXMgPSBjcmVhdGVGaWxlTW9kZS50ZW1wbGF0ZUZvbGRlciB8fCBcIlwiO1xyXG5cdFx0XHRcdFx0XHRjb25zdCBub3JtYWxpemVkID0gdmFsdWUudHJpbSgpO1xyXG5cdFx0XHRcdFx0XHRjcmVhdGVGaWxlTW9kZS50ZW1wbGF0ZUZvbGRlciA9IG5vcm1hbGl6ZWQ7XHJcblx0XHRcdFx0XHRcdGlmIChwcmV2aW91cyAhPT0gbm9ybWFsaXplZCkge1xyXG5cdFx0XHRcdFx0XHRcdGNyZWF0ZUZpbGVNb2RlLnRlbXBsYXRlRmlsZSA9IFwiXCI7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIuZGlzcGxheSgpO1xyXG5cdFx0XHRcdFx0XHR9LCAxMDApO1xyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdG5ldyBGb2xkZXJTdWdnZXN0KFxyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHAsXHJcblx0XHRcdFx0XHR0ZXh0LmlucHV0RWwsXHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbixcclxuXHRcdFx0XHRcdFwic2luZ2xlXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0LnNldE5hbWUodChcIlRlbXBsYXRlIG5vdGVcIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdCF0ZW1wbGF0ZUZvbGRlclBhdGhcclxuXHRcdFx0XHRcdD8gdChcIlNlbGVjdCBhIHRlbXBsYXRlIGZvbGRlciBhYm92ZSB0byBlbmFibGUgdGhlIGRyb3Bkb3duLlwiKVxyXG5cdFx0XHRcdFx0OiAhZm9sZGVyRXhpc3RzXHJcblx0XHRcdFx0XHQ/IHQoXCJUZW1wbGF0ZSBmb2xkZXIgaXMgaW52YWxpZDsgdXBkYXRlIHRoZSBmb2xkZXIgdG8gY29udGludWUuXCIpXHJcblx0XHRcdFx0XHQ6IHRlbXBsYXRlRmlsZXMubGVuZ3RoID4gMFxyXG5cdFx0XHRcdFx0PyB0KFxyXG5cdFx0XHRcdFx0XHRcdFwiQ2hvb3NlIHRoZSBub3RlIHRoYXQgc2hvdWxkIGJlIGNvcGllZDsge3tDT05URU5UfX0gcGxhY2Vob2xkZXJzIGFyZSByZXBsYWNlZCwgb3RoZXJ3aXNlIHRoZSBjYXB0dXJlZCB0ZXh0IGlzIGFwcGVuZGVkLlwiXHJcblx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdDogdChcIk5vIG1hcmtkb3duIG5vdGVzIHdlcmUgZm91bmQgaW4gdGhlIHNlbGVjdGVkIGZvbGRlci5cIilcclxuXHRcdFx0KVxyXG5cdFx0XHQuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XHJcblx0XHRcdFx0ZHJvcGRvd24uYWRkT3B0aW9uKFwiXCIsIHQoXCJOb25lXCIpKTtcclxuXHJcblx0XHRcdFx0Y29uc3QgZXhpc3RpbmdUZW1wbGF0ZSA9IGNyZWF0ZUZpbGVNb2RlLnRlbXBsYXRlRmlsZSB8fCBcIlwiO1xyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdGV4aXN0aW5nVGVtcGxhdGUgJiZcclxuXHRcdFx0XHRcdCF0ZW1wbGF0ZUZpbGVzLnNvbWUoKGZpbGUpID0+IGZpbGUucGF0aCA9PT0gZXhpc3RpbmdUZW1wbGF0ZSlcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdGRyb3Bkb3duLmFkZE9wdGlvbihleGlzdGluZ1RlbXBsYXRlLCBleGlzdGluZ1RlbXBsYXRlKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGZvciAoY29uc3QgZmlsZSBvZiB0ZW1wbGF0ZUZpbGVzKSB7XHJcblx0XHRcdFx0XHRkcm9wZG93bi5hZGRPcHRpb24oZmlsZS5wYXRoLCBmaWxlLmJhc2VuYW1lKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGRyb3Bkb3duLnNldFZhbHVlKGNyZWF0ZUZpbGVNb2RlLnRlbXBsYXRlRmlsZSB8fCBcIlwiKTtcclxuXHRcdFx0XHRkcm9wZG93bi5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdGNyZWF0ZUZpbGVNb2RlLnRlbXBsYXRlRmlsZSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdGlmICghdGVtcGxhdGVGaWxlcy5sZW5ndGggfHwgIWZvbGRlckV4aXN0cykge1xyXG5cdFx0XHRcdFx0ZHJvcGRvd24uc2VsZWN0RWwuZGlzYWJsZWQgPSB0cnVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyBNaW5pbWFsIG1vZGUgc2V0dGluZ3NcclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZSh0KFwiTWluaW1hbCBNb2RlXCIpKS5zZXRIZWFkaW5nKCk7XHJcblxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIkVuYWJsZSBtaW5pbWFsIG1vZGVcIikpXHJcblx0XHQuc2V0RGVzYyhcclxuXHRcdFx0dChcclxuXHRcdFx0XHRcIkVuYWJsZSBzaW1wbGlmaWVkIHNpbmdsZS1saW5lIHF1aWNrIGNhcHR1cmUgd2l0aCBpbmxpbmUgc3VnZ2VzdGlvbnNcIlxyXG5cdFx0XHQpXHJcblx0XHQpXHJcblx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+XHJcblx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZS5lbmFibGVNaW5pbWFsTW9kZVxyXG5cdFx0XHRcdClcclxuXHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUuZW5hYmxlTWluaW1hbE1vZGUgPVxyXG5cdFx0XHRcdFx0XHR2YWx1ZTtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0Ly8gUmVmcmVzaCB0aGUgc2V0dGluZ3MgZGlzcGxheSB0byBzaG93L2hpZGUgbWluaW1hbCBtb2RlIG9wdGlvbnNcclxuXHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmRpc3BsYXkoKTtcclxuXHRcdFx0XHRcdH0sIDEwMCk7XHJcblx0XHRcdFx0fSlcclxuXHRcdCk7XHJcblxyXG5cdGlmICghc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLmVuYWJsZU1pbmltYWxNb2RlKSByZXR1cm47XHJcblxyXG5cdGlmICghc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLm1pbmltYWxNb2RlU2V0dGluZ3MpIHtcclxuXHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZS5taW5pbWFsTW9kZVNldHRpbmdzID0ge1xyXG5cdFx0XHRzdWdnZXN0VHJpZ2dlcjogXCIvXCIsXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0Ly8gU3VnZ2VzdCB0cmlnZ2VyIGNoYXJhY3RlclxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIlN1Z2dlc3QgdHJpZ2dlciBjaGFyYWN0ZXJcIikpXHJcblx0XHQuc2V0RGVzYyh0KFwiQ2hhcmFjdGVyIHRvIHRyaWdnZXIgdGhlIHN1Z2dlc3Rpb24gbWVudVwiKSlcclxuXHRcdC5hZGRUZXh0KCh0ZXh0KSA9PlxyXG5cdFx0XHR0ZXh0XHJcblx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlLm1pbmltYWxNb2RlU2V0dGluZ3NcclxuXHRcdFx0XHRcdFx0LnN1Z2dlc3RUcmlnZ2VyXHJcblx0XHRcdFx0KVxyXG5cdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZS5taW5pbWFsTW9kZVNldHRpbmdzLnN1Z2dlc3RUcmlnZ2VyID1cclxuXHRcdFx0XHRcdFx0dmFsdWUgfHwgXCIvXCI7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHR9KVxyXG5cdFx0KTtcclxufVxyXG4iXX0=