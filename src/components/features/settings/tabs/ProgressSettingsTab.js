import { __awaiter } from "tslib";
import { Setting, TextAreaComponent } from "obsidian";
import { DEFAULT_SETTINGS } from "@/common/setting-definition";
import { t } from "@/translations/helper";
import { formatProgressText } from "@/editor-extensions/ui-widgets/progress-bar-widget";
export function renderProgressSettingsTab(settingTab, containerEl) {
    new Setting(containerEl)
        .setName(t("Progress bar"))
        .setDesc(t("You can customize the progress bar behind the parent task(usually at the end of the task). You can also customize the progress bar for the task below the heading."))
        .setHeading()
        .settingEl.setAttribute("data-setting-id", "progress-bar-main");
    const progressDisplaySetting = new Setting(containerEl)
        .setName(t("Progress display mode"))
        .setDesc(t("Choose how to display task progress"))
        .addDropdown((dropdown) => dropdown
        .addOption("none", t("No progress indicators"))
        .addOption("graphical", t("Graphical progress bar"))
        .addOption("text", t("Text progress indicator"))
        .addOption("both", t("Both graphical and text"))
        .setValue(settingTab.plugin.settings.progressBarDisplayMode)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        settingTab.plugin.settings.progressBarDisplayMode = value;
        settingTab.applySettingsUpdate();
        settingTab.display();
    })));
    progressDisplaySetting.settingEl.setAttribute("data-setting-id", "progress-display-mode");
    // Only show these options if some form of progress bar is enabled
    if (settingTab.plugin.settings.progressBarDisplayMode !== "none") {
        new Setting(containerEl)
            .setName(t("Enable progress bar in reading mode"))
            .setDesc(t("Toggle this to allow this plugin to show progress bars in reading mode."))
            .addToggle((toggle) => toggle
            .setValue(settingTab.plugin.settings
            .enableProgressbarInReadingMode)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.enableProgressbarInReadingMode =
                value;
            settingTab.applySettingsUpdate();
        })));
        new Setting(containerEl)
            .setName(t("Support hover to show progress info"))
            .setDesc(t("Toggle this to allow this plugin to show progress info when hovering over the progress bar."))
            .addToggle((toggle) => toggle
            .setValue(settingTab.plugin.settings
            .supportHoverToShowProgressInfo)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.supportHoverToShowProgressInfo =
                value;
            settingTab.applySettingsUpdate();
        })));
        new Setting(containerEl)
            .setName(t("Add progress bar to non-task bullet"))
            .setDesc(t("Toggle this to allow adding progress bars to regular list items (non-task bullets)."))
            .addToggle((toggle) => toggle
            .setValue(settingTab.plugin.settings.addProgressBarToNonTaskBullet)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.addProgressBarToNonTaskBullet =
                value;
            settingTab.applySettingsUpdate();
        })));
        new Setting(containerEl)
            .setName(t("Add progress bar to Projects view"))
            .setDesc(t("Show project progress in Projects header"))
            .addToggle((toggle) => toggle
            .setValue(settingTab.plugin.settings.addProgressBarToProjectsView)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.addProgressBarToProjectsView =
                value;
            settingTab.applySettingsUpdate();
        })));
        new Setting(containerEl)
            .setName(t("Add progress bar to Heading"))
            .setDesc(t("Toggle this to allow this plugin to add progress bar for Task below the headings."))
            .addToggle((toggle) => toggle
            .setValue(settingTab.plugin.settings.addTaskProgressBarToHeading)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.addTaskProgressBarToHeading =
                value;
            settingTab.applySettingsUpdate();
        })));
        new Setting(containerEl)
            .setName(t("Count sub children of current Task"))
            .setDesc(t("Toggle this to allow this plugin to count sub tasks when generating progress bar."))
            .addToggle((toggle) => toggle
            .setValue(settingTab.plugin.settings.countSubLevel)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.countSubLevel = value;
            settingTab.applySettingsUpdate();
        })));
        new Setting(containerEl)
            .setName(t("Use custom goal for progress bar"))
            .setDesc(t("Toggle this to allow this plugin to find the pattern g::number as goal of the parent task."))
            .addToggle((toggle) => toggle
            .setValue(settingTab.plugin.settings.allowCustomProgressGoal)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.allowCustomProgressGoal =
                value;
            settingTab.applySettingsUpdate();
        })));
        // Only show the number settings for modes that include text display
        if (settingTab.plugin.settings.progressBarDisplayMode === "text" ||
            settingTab.plugin.settings.progressBarDisplayMode === "both") {
            displayNumberToProgressbar(settingTab, containerEl);
        }
        new Setting(containerEl).setName(t("Hide progress bars")).setHeading();
        new Setting(containerEl)
            .setName(t("Hide progress bars based on conditions"))
            .setDesc(t("Toggle this to enable hiding progress bars based on tags, folders, or metadata."))
            .addToggle((toggle) => toggle
            .setValue(settingTab.plugin.settings
            .hideProgressBarBasedOnConditions)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.hideProgressBarBasedOnConditions =
                value;
            settingTab.applySettingsUpdate();
            setTimeout(() => {
                settingTab.display();
            }, 200);
        })));
        if (settingTab.plugin.settings.hideProgressBarBasedOnConditions) {
            new Setting(containerEl)
                .setName(t("Hide by tags"))
                .setDesc(t('Specify tags that will hide progress bars (comma-separated, without #). Example: "no-progress-bar,hide-progress"'))
                .addText((text) => text
                .setPlaceholder(DEFAULT_SETTINGS.hideProgressBarTags)
                .setValue(settingTab.plugin.settings.hideProgressBarTags)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                settingTab.plugin.settings.hideProgressBarTags =
                    value;
                settingTab.applySettingsUpdate();
            })));
            new Setting(containerEl)
                .setName(t("Hide by folders"))
                .setDesc(t('Specify folder paths that will hide progress bars (comma-separated). Example: "Daily Notes,Projects/Hidden"'))
                .addText((text) => text
                .setPlaceholder("folder1,folder2/subfolder")
                .setValue(settingTab.plugin.settings.hideProgressBarFolders)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                settingTab.plugin.settings.hideProgressBarFolders =
                    value;
                settingTab.applySettingsUpdate();
            })));
            new Setting(containerEl)
                .setName(t("Hide by metadata"))
                .setDesc(t('Specify frontmatter metadata that will hide progress bars. Example: "hide-progress-bar: true"'))
                .addText((text) => text
                .setPlaceholder(DEFAULT_SETTINGS.hideProgressBarMetadata)
                .setValue(settingTab.plugin.settings.hideProgressBarMetadata)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                settingTab.plugin.settings.hideProgressBarMetadata =
                    value;
                settingTab.applySettingsUpdate();
            })));
            new Setting(containerEl)
                .setName(t("Show progress bars based on heading"))
                .setDesc(t("Toggle this to enable showing progress bars based on heading."))
                .addText((text) => text
                .setPlaceholder(t("# heading"))
                .setValue(settingTab.plugin.settings
                .showProgressBarBasedOnHeading)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                settingTab.plugin.settings.showProgressBarBasedOnHeading =
                    value;
                settingTab.applySettingsUpdate();
            })));
        }
    }
}
function displayNumberToProgressbar(settingTab, containerEl) {
    // Add setting for display mode
    new Setting(containerEl)
        .setName(t("Progress format"))
        .setDesc(t("Choose how to display the task progress"))
        .addDropdown((dropdown) => {
        dropdown
            .addOption("percentage", t("Percentage (75%)"))
            .addOption("bracketPercentage", t("Bracketed percentage ([75%])"))
            .addOption("fraction", t("Fraction (3/4)"))
            .addOption("bracketFraction", t("Bracketed fraction ([3/4])"))
            .addOption("detailed", t("Detailed ([3✓ 1⟳ 0✗ 1? / 5])"))
            .addOption("custom", t("Custom format"))
            .addOption("range-based", t("Range-based text"))
            .setValue(settingTab.plugin.settings.displayMode || "bracketFraction")
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.displayMode = value;
            settingTab.applySettingsUpdate();
            settingTab.display();
        }));
    });
    // Show custom format setting only when custom format is selected
    if (settingTab.plugin.settings.displayMode === "custom") {
        const fragment = document.createDocumentFragment();
        fragment.createEl("div", {
            cls: "custom-format-placeholder-info",
            text: t("Use placeholders like {{COMPLETED}}, {{TOTAL}}, {{PERCENT}}, etc."),
        });
        fragment.createEl("div", {
            cls: "custom-format-placeholder-info",
            text: t("Available placeholders: {{COMPLETED}}, {{TOTAL}}, {{IN_PROGRESS}}, {{ABANDONED}}, {{PLANNED}}, {{NOT_STARTED}}, {{PERCENT}}, {{COMPLETED_SYMBOL}}, {{IN_PROGRESS_SYMBOL}}, {{ABANDONED_SYMBOL}}, {{PLANNED_SYMBOL}}"),
        });
        fragment.createEl("div", {
            cls: "custom-format-placeholder-info",
            text: t("Support expression in format, like using data.percentages to get the percentage of completed tasks. And using math or even repeat functions to get the result."),
        });
        new Setting(containerEl).setName(t("Custom format")).setDesc(fragment);
        const previewEl = containerEl.createDiv({
            cls: "custom-format-preview-container",
        });
        const previewLabel = previewEl.createDiv({
            cls: "custom-format-preview-label",
            text: t("Preview:"),
        });
        const previewContent = previewEl.createDiv({
            cls: "custom-format-preview-content",
        });
        // 初始预览
        updateFormatPreview(settingTab, containerEl, settingTab.plugin.settings.customFormat ||
            "[{{COMPLETED}}/{{TOTAL}}]");
        const textarea = containerEl.createEl("div", {
            cls: "custom-format-textarea-container",
        }, (el) => {
            const textAreaComponent = new TextAreaComponent(el);
            textAreaComponent.inputEl.toggleClass("custom-format-textarea", true);
            textAreaComponent
                .setPlaceholder("[{{COMPLETED}}/{{TOTAL}}]")
                .setValue(settingTab.plugin.settings.customFormat ||
                "[{{COMPLETED}}/{{TOTAL}}]")
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                settingTab.plugin.settings.customFormat = value;
                settingTab.applySettingsUpdate();
                // 更新预览
                updateFormatPreview(settingTab, containerEl, value);
            }));
        });
        // 添加预览区域
        // Show examples of advanced formats using expressions
        new Setting(containerEl)
            .setName(t("Expression examples"))
            .setDesc(t("Examples of advanced formats using expressions"))
            .setHeading();
        const exampleContainer = containerEl.createEl("div", {
            cls: "expression-examples",
        });
        const examples = [
            {
                name: t("Text Progress Bar"),
                code: '[${="=".repeat(Math.floor(data.percentages.completed/10)) + " ".repeat(10-Math.floor(data.percentages.completed/10))}] {{PERCENT}}%',
            },
            {
                name: t("Emoji Progress Bar"),
                code: '${="⬛".repeat(Math.floor(data.percentages.completed/10)) + "⬜".repeat(10-Math.floor(data.percentages.completed/10))} {{PERCENT}}%',
            },
            {
                name: t("Color-coded Status"),
                code: "{{COMPLETED}}/{{TOTAL}} ${=data.percentages.completed < 30 ? '🔴' : data.percentages.completed < 70 ? '🟠' : '🟢'}",
            },
            {
                name: t("Status with Icons"),
                code: "[{{COMPLETED_SYMBOL}}:{{COMPLETED}} {{IN_PROGRESS_SYMBOL}}:{{IN_PROGRESS}} {{PLANNED_SYMBOL}}:{{PLANNED}} / {{TOTAL}}]",
            },
        ];
        examples.forEach((example) => {
            const exampleItem = exampleContainer.createEl("div", {
                cls: "expression-example-item",
            });
            exampleItem.createEl("div", {
                cls: "expression-example-name",
                text: example.name,
            });
            const codeEl = exampleItem.createEl("code", {
                cls: "expression-example-code",
                text: example.code,
            });
            // 添加预览效果
            const previewEl = exampleItem.createEl("div", {
                cls: "expression-example-preview",
            });
            // 创建示例数据来渲染预览
            const sampleData = {
                completed: 3,
                total: 5,
                inProgress: 1,
                abandoned: 0,
                notStarted: 0,
                planned: 1,
                percentages: {
                    completed: 60,
                    inProgress: 20,
                    abandoned: 0,
                    notStarted: 0,
                    planned: 20,
                },
            };
            try {
                const renderedText = renderFormatPreview(settingTab, example.code, sampleData);
                previewEl.setText(`${t("Preview")}: ${renderedText}`);
            }
            catch (error) {
                previewEl.setText(`${t("Preview")}: Error`);
                previewEl.addClass("expression-preview-error");
            }
            const useButton = exampleItem.createEl("button", {
                cls: "expression-example-use",
                text: t("Use"),
            });
            useButton.addEventListener("click", () => {
                settingTab.plugin.settings.customFormat = example.code;
                settingTab.applySettingsUpdate();
                const inputs = containerEl.querySelectorAll("textarea");
                for (const input of Array.from(inputs)) {
                    if (input.placeholder === "[{{COMPLETED}}/{{TOTAL}}]") {
                        input.value = example.code;
                        break;
                    }
                }
                updateFormatPreview(settingTab, containerEl, example.code);
            });
        });
    }
    // Only show legacy percentage toggle for range-based or when displayMode is not set
    else if (settingTab.plugin.settings.displayMode === "range-based" ||
        !settingTab.plugin.settings.displayMode) {
        new Setting(containerEl)
            .setName(t("Show percentage"))
            .setDesc(t("Toggle this to show percentage instead of completed/total count."))
            .addToggle((toggle) => toggle
            .setValue(settingTab.plugin.settings.showPercentage)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.showPercentage = value;
            settingTab.applySettingsUpdate();
        })));
        // If percentage display and range-based mode is selected
        if (settingTab.plugin.settings.showPercentage &&
            settingTab.plugin.settings.displayMode === "range-based") {
            new Setting(containerEl)
                .setName(t("Customize progress ranges"))
                .setDesc(t("Toggle this to customize the text for different progress ranges."))
                .addToggle((toggle) => toggle
                .setValue(settingTab.plugin.settings.customizeProgressRanges)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                settingTab.plugin.settings.customizeProgressRanges =
                    value;
                settingTab.applySettingsUpdate();
                settingTab.display();
            })));
            if (settingTab.plugin.settings.customizeProgressRanges) {
                addProgressRangesSettings(settingTab, containerEl);
            }
        }
    }
}
function addProgressRangesSettings(settingTab, containerEl) {
    new Setting(containerEl)
        .setName(t("Progress Ranges"))
        .setDesc(t("Define progress ranges and their corresponding text representations."))
        .setHeading();
    // Display existing ranges
    settingTab.plugin.settings.progressRanges.forEach((range, index) => {
        new Setting(containerEl)
            .setName(`${t("Range")} ${index + 1}: ${range.min}%-${range.max}%`)
            .setDesc(`${t("Use")} {{PROGRESS}} ${t("as a placeholder for the percentage value")}`)
            .addText((text) => text
            .setPlaceholder(`${t("Template text with")} {{PROGRESS}} ${t("placeholder")}`)
            .setValue(range.text)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.progressRanges[index].text =
                value;
            settingTab.applySettingsUpdate();
        })))
            .addButton((button) => {
            button.setButtonText("Delete").onClick(() => __awaiter(this, void 0, void 0, function* () {
                settingTab.plugin.settings.progressRanges.splice(index, 1);
                settingTab.applySettingsUpdate();
                settingTab.display();
            }));
        });
    });
    new Setting(containerEl)
        .setName(t("Add new range"))
        .setDesc(t("Add a new progress percentage range with custom text"));
    // Add a new range
    const newRangeSetting = new Setting(containerEl);
    newRangeSetting.infoEl.detach();
    newRangeSetting
        .addText((text) => text
        .setPlaceholder(t("Min percentage (0-100)"))
        .setValue("")
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        // This will be handled when the user clicks the Add button
    })))
        .addText((text) => text
        .setPlaceholder(t("Max percentage (0-100)"))
        .setValue("")
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        // This will be handled when the user clicks the Add button
    })))
        .addText((text) => text
        .setPlaceholder(t("Text template (use {{PROGRESS}})"))
        .setValue("")
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        // This will be handled when the user clicks the Add button
    })))
        .addButton((button) => {
        button.setButtonText("Add").onClick(() => __awaiter(this, void 0, void 0, function* () {
            const settingsContainer = button.buttonEl.parentElement;
            if (!settingsContainer)
                return;
            const inputs = settingsContainer.querySelectorAll("input");
            if (inputs.length < 3)
                return;
            const min = parseInt(inputs[0].value);
            const max = parseInt(inputs[1].value);
            const text = inputs[2].value;
            if (isNaN(min) || isNaN(max) || !text) {
                return;
            }
            settingTab.plugin.settings.progressRanges.push({
                min,
                max,
                text,
            });
            // Clear inputs
            inputs[0].value = "";
            inputs[1].value = "";
            inputs[2].value = "";
            settingTab.applySettingsUpdate();
            settingTab.display();
        }));
    });
    // Reset to defaults
    new Setting(containerEl)
        .setName(t("Reset to defaults"))
        .setDesc(t("Reset progress ranges to default values"))
        .addButton((button) => {
        button.setButtonText(t("Reset")).onClick(() => __awaiter(this, void 0, void 0, function* () {
            settingTab.plugin.settings.progressRanges = [
                {
                    min: 0,
                    max: 20,
                    text: t("Just started {{PROGRESS}}%"),
                },
                {
                    min: 20,
                    max: 40,
                    text: t("Making progress {{PROGRESS}}%"),
                },
                { min: 40, max: 60, text: t("Half way {{PROGRESS}}%") },
                {
                    min: 60,
                    max: 80,
                    text: t("Good progress {{PROGRESS}}%"),
                },
                {
                    min: 80,
                    max: 100,
                    text: t("Almost there {{PROGRESS}}%"),
                },
            ];
            settingTab.applySettingsUpdate();
            settingTab.display();
        }));
    });
}
function updateFormatPreview(settingTab, containerEl, formatText) {
    const previewContainer = containerEl.querySelector(".custom-format-preview-content");
    if (!previewContainer)
        return;
    // 创建示例数据
    const sampleData = {
        completed: 3,
        total: 5,
        inProgress: 1,
        abandoned: 0,
        notStarted: 0,
        planned: 1,
        percentages: {
            completed: 60,
            inProgress: 20,
            abandoned: 0,
            notStarted: 0,
            planned: 20,
        },
    };
    try {
        const renderedText = renderFormatPreview(settingTab, formatText, sampleData);
        previewContainer.setText(renderedText);
        previewContainer.removeClass("custom-format-preview-error");
    }
    catch (error) {
        previewContainer.setText("Error rendering format");
        previewContainer.addClass("custom-format-preview-error");
    }
}
// 添加渲染格式文本的辅助方法
function renderFormatPreview(settingTab, formatText, sampleData) {
    try {
        // 保存原始的customFormat值
        const originalFormat = settingTab.plugin.settings.customFormat;
        // 临时设置customFormat为我们要预览的格式
        settingTab.plugin.settings.customFormat = formatText;
        // 使用插件的formatProgressText函数计算预览
        const result = formatProgressText(sampleData, settingTab.plugin);
        // 恢复原始的customFormat值
        settingTab.plugin.settings.customFormat = originalFormat;
        return result;
    }
    catch (error) {
        console.error("Error in renderFormatPreview:", error);
        throw error;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUHJvZ3Jlc3NTZXR0aW5nc1RhYi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlByb2dyZXNzU2V0dGluZ3NUYWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDdEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDL0QsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRTFDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRXhGLE1BQU0sVUFBVSx5QkFBeUIsQ0FDeEMsVUFBcUMsRUFDckMsV0FBd0I7SUFFeEIsSUFBSSxPQUFPLENBQUMsV0FBVyxDQUFDO1NBQ3RCLE9BQU8sQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUM7U0FDMUIsT0FBTyxDQUNQLENBQUMsQ0FDQSxvS0FBb0ssQ0FDcEssQ0FDRDtTQUNBLFVBQVUsRUFBRTtTQUNaLFNBQVMsQ0FBQyxZQUFZLENBQUMsaUJBQWlCLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztJQUVqRSxNQUFNLHNCQUFzQixHQUFHLElBQUksT0FBTyxDQUFDLFdBQVcsQ0FBQztTQUNyRCxPQUFPLENBQUMsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLENBQUM7U0FDbkMsT0FBTyxDQUFDLENBQUMsQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDO1NBQ2pELFdBQVcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQ3pCLFFBQVE7U0FDTixTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1NBQzlDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLENBQUM7U0FDbkQsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMseUJBQXlCLENBQUMsQ0FBQztTQUMvQyxTQUFTLENBQUMsTUFBTSxF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QU0sQ0FBQyxRQUFRLENBQUMsWUFBWSxHQUFHLGNBQWMsQ0FBQztRQUV6RCxPQUFPLE1BQU0sQ0FBQztLQUNkO0lBQUMsT0FBTyxLQUFLLEVBQUU7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLCtCQUErQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3RELE1BQU0sS0FBSyxDQUFDO0tBQ1o7QUFDRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU2V0dGluZywgVGV4dEFyZWFDb21wb25lbnQgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgREVGQVVMVF9TRVRUSU5HUyB9IGZyb20gXCJAL2NvbW1vbi9zZXR0aW5nLWRlZmluaXRpb25cIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHsgVGFza1Byb2dyZXNzQmFyU2V0dGluZ1RhYiB9IGZyb20gXCJAL3NldHRpbmdcIjtcclxuaW1wb3J0IHsgZm9ybWF0UHJvZ3Jlc3NUZXh0IH0gZnJvbSBcIkAvZWRpdG9yLWV4dGVuc2lvbnMvdWktd2lkZ2V0cy9wcm9ncmVzcy1iYXItd2lkZ2V0XCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyUHJvZ3Jlc3NTZXR0aW5nc1RhYihcclxuXHRzZXR0aW5nVGFiOiBUYXNrUHJvZ3Jlc3NCYXJTZXR0aW5nVGFiLFxyXG5cdGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudFxyXG4pIHtcclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJQcm9ncmVzcyBiYXJcIikpXHJcblx0XHQuc2V0RGVzYyhcclxuXHRcdFx0dChcclxuXHRcdFx0XHRcIllvdSBjYW4gY3VzdG9taXplIHRoZSBwcm9ncmVzcyBiYXIgYmVoaW5kIHRoZSBwYXJlbnQgdGFzayh1c3VhbGx5IGF0IHRoZSBlbmQgb2YgdGhlIHRhc2spLiBZb3UgY2FuIGFsc28gY3VzdG9taXplIHRoZSBwcm9ncmVzcyBiYXIgZm9yIHRoZSB0YXNrIGJlbG93IHRoZSBoZWFkaW5nLlwiXHJcblx0XHRcdClcclxuXHRcdClcclxuXHRcdC5zZXRIZWFkaW5nKClcclxuXHRcdC5zZXR0aW5nRWwuc2V0QXR0cmlidXRlKFwiZGF0YS1zZXR0aW5nLWlkXCIsIFwicHJvZ3Jlc3MtYmFyLW1haW5cIik7XHJcblxyXG5cdGNvbnN0IHByb2dyZXNzRGlzcGxheVNldHRpbmcgPSBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJQcm9ncmVzcyBkaXNwbGF5IG1vZGVcIikpXHJcblx0XHQuc2V0RGVzYyh0KFwiQ2hvb3NlIGhvdyB0byBkaXNwbGF5IHRhc2sgcHJvZ3Jlc3NcIikpXHJcblx0XHQuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PlxyXG5cdFx0XHRkcm9wZG93blxyXG5cdFx0XHRcdC5hZGRPcHRpb24oXCJub25lXCIsIHQoXCJObyBwcm9ncmVzcyBpbmRpY2F0b3JzXCIpKVxyXG5cdFx0XHRcdC5hZGRPcHRpb24oXCJncmFwaGljYWxcIiwgdChcIkdyYXBoaWNhbCBwcm9ncmVzcyBiYXJcIikpXHJcblx0XHRcdFx0LmFkZE9wdGlvbihcInRleHRcIiwgdChcIlRleHQgcHJvZ3Jlc3MgaW5kaWNhdG9yXCIpKVxyXG5cdFx0XHRcdC5hZGRPcHRpb24oXCJib3RoXCIsIHQoXCJCb3RoIGdyYXBoaWNhbCBhbmQgdGV4dFwiKSlcclxuXHRcdFx0XHQuc2V0VmFsdWUoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvZ3Jlc3NCYXJEaXNwbGF5TW9kZSlcclxuXHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlOiBhbnkpID0+IHtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByb2dyZXNzQmFyRGlzcGxheU1vZGUgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5kaXNwbGF5KCk7XHJcblx0XHRcdFx0fSlcclxuXHRcdCk7XHJcblx0cHJvZ3Jlc3NEaXNwbGF5U2V0dGluZy5zZXR0aW5nRWwuc2V0QXR0cmlidXRlKFwiZGF0YS1zZXR0aW5nLWlkXCIsIFwicHJvZ3Jlc3MtZGlzcGxheS1tb2RlXCIpO1xyXG5cclxuXHQvLyBPbmx5IHNob3cgdGhlc2Ugb3B0aW9ucyBpZiBzb21lIGZvcm0gb2YgcHJvZ3Jlc3MgYmFyIGlzIGVuYWJsZWRcclxuXHRpZiAoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvZ3Jlc3NCYXJEaXNwbGF5TW9kZSAhPT0gXCJub25lXCIpIHtcclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiRW5hYmxlIHByb2dyZXNzIGJhciBpbiByZWFkaW5nIG1vZGVcIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcIlRvZ2dsZSB0aGlzIHRvIGFsbG93IHRoaXMgcGx1Z2luIHRvIHNob3cgcHJvZ3Jlc3MgYmFycyBpbiByZWFkaW5nIG1vZGUuXCJcclxuXHRcdFx0XHQpXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxyXG5cdFx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5nc1xyXG5cdFx0XHRcdFx0XHRcdC5lbmFibGVQcm9ncmVzc2JhckluUmVhZGluZ01vZGVcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZW5hYmxlUHJvZ3Jlc3NiYXJJblJlYWRpbmdNb2RlID1cclxuXHRcdFx0XHRcdFx0XHR2YWx1ZTtcclxuXHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0fSlcclxuXHRcdFx0KTtcclxuXHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0LnNldE5hbWUodChcIlN1cHBvcnQgaG92ZXIgdG8gc2hvdyBwcm9ncmVzcyBpbmZvXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XCJUb2dnbGUgdGhpcyB0byBhbGxvdyB0aGlzIHBsdWdpbiB0byBzaG93IHByb2dyZXNzIGluZm8gd2hlbiBob3ZlcmluZyBvdmVyIHRoZSBwcm9ncmVzcyBiYXIuXCJcclxuXHRcdFx0XHQpXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxyXG5cdFx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5nc1xyXG5cdFx0XHRcdFx0XHRcdC5zdXBwb3J0SG92ZXJUb1Nob3dQcm9ncmVzc0luZm9cclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3Muc3VwcG9ydEhvdmVyVG9TaG93UHJvZ3Jlc3NJbmZvID1cclxuXHRcdFx0XHRcdFx0XHR2YWx1ZTtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiQWRkIHByb2dyZXNzIGJhciB0byBub24tdGFzayBidWxsZXRcIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcIlRvZ2dsZSB0aGlzIHRvIGFsbG93IGFkZGluZyBwcm9ncmVzcyBiYXJzIHRvIHJlZ3VsYXIgbGlzdCBpdGVtcyAobm9uLXRhc2sgYnVsbGV0cykuXCJcclxuXHRcdFx0XHQpXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxyXG5cdFx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5hZGRQcm9ncmVzc0JhclRvTm9uVGFza0J1bGxldFxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5hZGRQcm9ncmVzc0JhclRvTm9uVGFza0J1bGxldCA9XHJcblx0XHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0fSlcclxuXHRcdFx0KTtcclxuXHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0LnNldE5hbWUodChcIkFkZCBwcm9ncmVzcyBiYXIgdG8gUHJvamVjdHMgdmlld1wiKSlcclxuXHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFwiU2hvdyBwcm9qZWN0IHByb2dyZXNzIGluIFByb2plY3RzIGhlYWRlclwiXHJcblx0XHRcdFx0KVxyXG5cdFx0XHQpXHJcblx0XHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT5cclxuXHRcdFx0XHR0b2dnbGVcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuYWRkUHJvZ3Jlc3NCYXJUb1Byb2plY3RzVmlld1xyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5hZGRQcm9ncmVzc0JhclRvUHJvamVjdHNWaWV3ID1cclxuXHRcdFx0XHRcdFx0XHR2YWx1ZTtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiQWRkIHByb2dyZXNzIGJhciB0byBIZWFkaW5nXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XCJUb2dnbGUgdGhpcyB0byBhbGxvdyB0aGlzIHBsdWdpbiB0byBhZGQgcHJvZ3Jlc3MgYmFyIGZvciBUYXNrIGJlbG93IHRoZSBoZWFkaW5ncy5cIlxyXG5cdFx0XHRcdClcclxuXHRcdFx0KVxyXG5cdFx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+XHJcblx0XHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmFkZFRhc2tQcm9ncmVzc0JhclRvSGVhZGluZ1xyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5hZGRUYXNrUHJvZ3Jlc3NCYXJUb0hlYWRpbmcgPVxyXG5cdFx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJDb3VudCBzdWIgY2hpbGRyZW4gb2YgY3VycmVudCBUYXNrXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XCJUb2dnbGUgdGhpcyB0byBhbGxvdyB0aGlzIHBsdWdpbiB0byBjb3VudCBzdWIgdGFza3Mgd2hlbiBnZW5lcmF0aW5nIHByb2dyZXNzIGJhci5cIlxyXG5cdFx0XHRcdClcclxuXHRcdFx0KVxyXG5cdFx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+XHJcblx0XHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuY291bnRTdWJMZXZlbClcclxuXHRcdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuY291bnRTdWJMZXZlbCA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJVc2UgY3VzdG9tIGdvYWwgZm9yIHByb2dyZXNzIGJhclwiKSlcclxuXHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFwiVG9nZ2xlIHRoaXMgdG8gYWxsb3cgdGhpcyBwbHVnaW4gdG8gZmluZCB0aGUgcGF0dGVybiBnOjpudW1iZXIgYXMgZ29hbCBvZiB0aGUgcGFyZW50IHRhc2suXCJcclxuXHRcdFx0XHQpXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxyXG5cdFx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5hbGxvd0N1c3RvbVByb2dyZXNzR29hbFxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5hbGxvd0N1c3RvbVByb2dyZXNzR29hbCA9XHJcblx0XHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0fSlcclxuXHRcdFx0KTtcclxuXHJcblx0XHQvLyBPbmx5IHNob3cgdGhlIG51bWJlciBzZXR0aW5ncyBmb3IgbW9kZXMgdGhhdCBpbmNsdWRlIHRleHQgZGlzcGxheVxyXG5cdFx0aWYgKFxyXG5cdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9ncmVzc0JhckRpc3BsYXlNb2RlID09PSBcInRleHRcIiB8fFxyXG5cdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9ncmVzc0JhckRpc3BsYXlNb2RlID09PSBcImJvdGhcIlxyXG5cdFx0KSB7XHJcblx0XHRcdGRpc3BsYXlOdW1iZXJUb1Byb2dyZXNzYmFyKHNldHRpbmdUYWIsIGNvbnRhaW5lckVsKTtcclxuXHRcdH1cclxuXHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZSh0KFwiSGlkZSBwcm9ncmVzcyBiYXJzXCIpKS5zZXRIZWFkaW5nKCk7XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJIaWRlIHByb2dyZXNzIGJhcnMgYmFzZWQgb24gY29uZGl0aW9uc1wiKSlcclxuXHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFwiVG9nZ2xlIHRoaXMgdG8gZW5hYmxlIGhpZGluZyBwcm9ncmVzcyBiYXJzIGJhc2VkIG9uIHRhZ3MsIGZvbGRlcnMsIG9yIG1ldGFkYXRhLlwiXHJcblx0XHRcdFx0KVxyXG5cdFx0XHQpXHJcblx0XHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT5cclxuXHRcdFx0XHR0b2dnbGVcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3NcclxuXHRcdFx0XHRcdFx0XHQuaGlkZVByb2dyZXNzQmFyQmFzZWRPbkNvbmRpdGlvbnNcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuaGlkZVByb2dyZXNzQmFyQmFzZWRPbkNvbmRpdGlvbnMgPVxyXG5cdFx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHJcblx0XHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIuZGlzcGxheSgpO1xyXG5cdFx0XHRcdFx0XHR9LCAyMDApO1xyXG5cdFx0XHRcdFx0fSlcclxuXHRcdFx0KTtcclxuXHJcblx0XHRpZiAoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuaGlkZVByb2dyZXNzQmFyQmFzZWRPbkNvbmRpdGlvbnMpIHtcclxuXHRcdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdFx0LnNldE5hbWUodChcIkhpZGUgYnkgdGFnc1wiKSlcclxuXHRcdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcdCdTcGVjaWZ5IHRhZ3MgdGhhdCB3aWxsIGhpZGUgcHJvZ3Jlc3MgYmFycyAoY29tbWEtc2VwYXJhdGVkLCB3aXRob3V0ICMpLiBFeGFtcGxlOiBcIm5vLXByb2dyZXNzLWJhcixoaWRlLXByb2dyZXNzXCInXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdFx0KVxyXG5cdFx0XHRcdC5hZGRUZXh0KCh0ZXh0KSA9PlxyXG5cdFx0XHRcdFx0dGV4dFxyXG5cdFx0XHRcdFx0XHQuc2V0UGxhY2Vob2xkZXIoREVGQVVMVF9TRVRUSU5HUy5oaWRlUHJvZ3Jlc3NCYXJUYWdzKVxyXG5cdFx0XHRcdFx0XHQuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuaGlkZVByb2dyZXNzQmFyVGFnc1xyXG5cdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5oaWRlUHJvZ3Jlc3NCYXJUYWdzID1cclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0XHQuc2V0TmFtZSh0KFwiSGlkZSBieSBmb2xkZXJzXCIpKVxyXG5cdFx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFx0J1NwZWNpZnkgZm9sZGVyIHBhdGhzIHRoYXQgd2lsbCBoaWRlIHByb2dyZXNzIGJhcnMgKGNvbW1hLXNlcGFyYXRlZCkuIEV4YW1wbGU6IFwiRGFpbHkgTm90ZXMsUHJvamVjdHMvSGlkZGVuXCInXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdFx0KVxyXG5cdFx0XHRcdC5hZGRUZXh0KCh0ZXh0KSA9PlxyXG5cdFx0XHRcdFx0dGV4dFxyXG5cdFx0XHRcdFx0XHQuc2V0UGxhY2Vob2xkZXIoXCJmb2xkZXIxLGZvbGRlcjIvc3ViZm9sZGVyXCIpXHJcblx0XHRcdFx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5oaWRlUHJvZ3Jlc3NCYXJGb2xkZXJzXHJcblx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmhpZGVQcm9ncmVzc0JhckZvbGRlcnMgPVxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHRcdC5zZXROYW1lKHQoXCJIaWRlIGJ5IG1ldGFkYXRhXCIpKVxyXG5cdFx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFx0J1NwZWNpZnkgZnJvbnRtYXR0ZXIgbWV0YWRhdGEgdGhhdCB3aWxsIGhpZGUgcHJvZ3Jlc3MgYmFycy4gRXhhbXBsZTogXCJoaWRlLXByb2dyZXNzLWJhcjogdHJ1ZVwiJ1xyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdClcclxuXHRcdFx0XHQuYWRkVGV4dCgodGV4dCkgPT5cclxuXHRcdFx0XHRcdHRleHRcclxuXHRcdFx0XHRcdFx0LnNldFBsYWNlaG9sZGVyKFxyXG5cdFx0XHRcdFx0XHRcdERFRkFVTFRfU0VUVElOR1MuaGlkZVByb2dyZXNzQmFyTWV0YWRhdGFcclxuXHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHQuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuaGlkZVByb2dyZXNzQmFyTWV0YWRhdGFcclxuXHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuaGlkZVByb2dyZXNzQmFyTWV0YWRhdGEgPVxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHRcdC5zZXROYW1lKHQoXCJTaG93IHByb2dyZXNzIGJhcnMgYmFzZWQgb24gaGVhZGluZ1wiKSlcclxuXHRcdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcdFwiVG9nZ2xlIHRoaXMgdG8gZW5hYmxlIHNob3dpbmcgcHJvZ3Jlc3MgYmFycyBiYXNlZCBvbiBoZWFkaW5nLlwiXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdFx0KVxyXG5cdFx0XHRcdC5hZGRUZXh0KCh0ZXh0KSA9PlxyXG5cdFx0XHRcdFx0dGV4dFxyXG5cdFx0XHRcdFx0XHQuc2V0UGxhY2Vob2xkZXIodChcIiMgaGVhZGluZ1wiKSlcclxuXHRcdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzXHJcblx0XHRcdFx0XHRcdFx0XHQuc2hvd1Byb2dyZXNzQmFyQmFzZWRPbkhlYWRpbmdcclxuXHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3Muc2hvd1Byb2dyZXNzQmFyQmFzZWRPbkhlYWRpbmcgPVxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0KTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRpc3BsYXlOdW1iZXJUb1Byb2dyZXNzYmFyKFxyXG5cdHNldHRpbmdUYWI6IFRhc2tQcm9ncmVzc0JhclNldHRpbmdUYWIsXHJcblx0Y29udGFpbmVyRWw6IEhUTUxFbGVtZW50XHJcbik6IHZvaWQge1xyXG5cdC8vIEFkZCBzZXR0aW5nIGZvciBkaXNwbGF5IG1vZGVcclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJQcm9ncmVzcyBmb3JtYXRcIikpXHJcblx0XHQuc2V0RGVzYyh0KFwiQ2hvb3NlIGhvdyB0byBkaXNwbGF5IHRoZSB0YXNrIHByb2dyZXNzXCIpKVxyXG5cdFx0LmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xyXG5cdFx0XHRkcm9wZG93blxyXG5cdFx0XHRcdC5hZGRPcHRpb24oXCJwZXJjZW50YWdlXCIsIHQoXCJQZXJjZW50YWdlICg3NSUpXCIpKVxyXG5cdFx0XHRcdC5hZGRPcHRpb24oXHJcblx0XHRcdFx0XHRcImJyYWNrZXRQZXJjZW50YWdlXCIsXHJcblx0XHRcdFx0XHR0KFwiQnJhY2tldGVkIHBlcmNlbnRhZ2UgKFs3NSVdKVwiKVxyXG5cdFx0XHRcdClcclxuXHRcdFx0XHQuYWRkT3B0aW9uKFwiZnJhY3Rpb25cIiwgdChcIkZyYWN0aW9uICgzLzQpXCIpKVxyXG5cdFx0XHRcdC5hZGRPcHRpb24oXCJicmFja2V0RnJhY3Rpb25cIiwgdChcIkJyYWNrZXRlZCBmcmFjdGlvbiAoWzMvNF0pXCIpKVxyXG5cdFx0XHRcdC5hZGRPcHRpb24oXCJkZXRhaWxlZFwiLCB0KFwiRGV0YWlsZWQgKFsz4pyTIDHin7MgMOKclyAxPyAvIDVdKVwiKSlcclxuXHRcdFx0XHQuYWRkT3B0aW9uKFwiY3VzdG9tXCIsIHQoXCJDdXN0b20gZm9ybWF0XCIpKVxyXG5cdFx0XHRcdC5hZGRPcHRpb24oXCJyYW5nZS1iYXNlZFwiLCB0KFwiUmFuZ2UtYmFzZWQgdGV4dFwiKSlcclxuXHRcdFx0XHQuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5kaXNwbGF5TW9kZSB8fCBcImJyYWNrZXRGcmFjdGlvblwiXHJcblx0XHRcdFx0KVxyXG5cdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWU6IGFueSkgPT4ge1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZGlzcGxheU1vZGUgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5kaXNwbGF5KCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0Ly8gU2hvdyBjdXN0b20gZm9ybWF0IHNldHRpbmcgb25seSB3aGVuIGN1c3RvbSBmb3JtYXQgaXMgc2VsZWN0ZWRcclxuXHRpZiAoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZGlzcGxheU1vZGUgPT09IFwiY3VzdG9tXCIpIHtcclxuXHRcdGNvbnN0IGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xyXG5cdFx0ZnJhZ21lbnQuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHRjbHM6IFwiY3VzdG9tLWZvcm1hdC1wbGFjZWhvbGRlci1pbmZvXCIsXHJcblx0XHRcdHRleHQ6IHQoXHJcblx0XHRcdFx0XCJVc2UgcGxhY2Vob2xkZXJzIGxpa2Uge3tDT01QTEVURUR9fSwge3tUT1RBTH19LCB7e1BFUkNFTlR9fSwgZXRjLlwiXHJcblx0XHRcdCksXHJcblx0XHR9KTtcclxuXHJcblx0XHRmcmFnbWVudC5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdGNsczogXCJjdXN0b20tZm9ybWF0LXBsYWNlaG9sZGVyLWluZm9cIixcclxuXHRcdFx0dGV4dDogdChcclxuXHRcdFx0XHRcIkF2YWlsYWJsZSBwbGFjZWhvbGRlcnM6IHt7Q09NUExFVEVEfX0sIHt7VE9UQUx9fSwge3tJTl9QUk9HUkVTU319LCB7e0FCQU5ET05FRH19LCB7e1BMQU5ORUR9fSwge3tOT1RfU1RBUlRFRH19LCB7e1BFUkNFTlR9fSwge3tDT01QTEVURURfU1lNQk9MfX0sIHt7SU5fUFJPR1JFU1NfU1lNQk9MfX0sIHt7QUJBTkRPTkVEX1NZTUJPTH19LCB7e1BMQU5ORURfU1lNQk9MfX1cIlxyXG5cdFx0XHQpLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0ZnJhZ21lbnQuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHRjbHM6IFwiY3VzdG9tLWZvcm1hdC1wbGFjZWhvbGRlci1pbmZvXCIsXHJcblx0XHRcdHRleHQ6IHQoXHJcblx0XHRcdFx0XCJTdXBwb3J0IGV4cHJlc3Npb24gaW4gZm9ybWF0LCBsaWtlIHVzaW5nIGRhdGEucGVyY2VudGFnZXMgdG8gZ2V0IHRoZSBwZXJjZW50YWdlIG9mIGNvbXBsZXRlZCB0YXNrcy4gQW5kIHVzaW5nIG1hdGggb3IgZXZlbiByZXBlYXQgZnVuY3Rpb25zIHRvIGdldCB0aGUgcmVzdWx0LlwiXHJcblx0XHRcdCksXHJcblx0XHR9KTtcclxuXHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZSh0KFwiQ3VzdG9tIGZvcm1hdFwiKSkuc2V0RGVzYyhmcmFnbWVudCk7XHJcblxyXG5cdFx0Y29uc3QgcHJldmlld0VsID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImN1c3RvbS1mb3JtYXQtcHJldmlldy1jb250YWluZXJcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IHByZXZpZXdMYWJlbCA9IHByZXZpZXdFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiY3VzdG9tLWZvcm1hdC1wcmV2aWV3LWxhYmVsXCIsXHJcblx0XHRcdHRleHQ6IHQoXCJQcmV2aWV3OlwiKSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IHByZXZpZXdDb250ZW50ID0gcHJldmlld0VsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJjdXN0b20tZm9ybWF0LXByZXZpZXctY29udGVudFwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8g5Yid5aeL6aKE6KeIXHJcblx0XHR1cGRhdGVGb3JtYXRQcmV2aWV3KFxyXG5cdFx0XHRzZXR0aW5nVGFiLFxyXG5cdFx0XHRjb250YWluZXJFbCxcclxuXHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuY3VzdG9tRm9ybWF0IHx8XHJcblx0XHRcdFx0XCJbe3tDT01QTEVURUR9fS97e1RPVEFMfX1dXCJcclxuXHRcdCk7XHJcblxyXG5cdFx0Y29uc3QgdGV4dGFyZWEgPSBjb250YWluZXJFbC5jcmVhdGVFbChcclxuXHRcdFx0XCJkaXZcIixcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNsczogXCJjdXN0b20tZm9ybWF0LXRleHRhcmVhLWNvbnRhaW5lclwiLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHQoZWwpID0+IHtcclxuXHRcdFx0XHRjb25zdCB0ZXh0QXJlYUNvbXBvbmVudCA9IG5ldyBUZXh0QXJlYUNvbXBvbmVudChlbCk7XHJcblx0XHRcdFx0dGV4dEFyZWFDb21wb25lbnQuaW5wdXRFbC50b2dnbGVDbGFzcyhcclxuXHRcdFx0XHRcdFwiY3VzdG9tLWZvcm1hdC10ZXh0YXJlYVwiLFxyXG5cdFx0XHRcdFx0dHJ1ZVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0dGV4dEFyZWFDb21wb25lbnRcclxuXHRcdFx0XHRcdC5zZXRQbGFjZWhvbGRlcihcIlt7e0NPTVBMRVRFRH19L3t7VE9UQUx9fV1cIilcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuY3VzdG9tRm9ybWF0IHx8XHJcblx0XHRcdFx0XHRcdFx0XCJbe3tDT01QTEVURUR9fS97e1RPVEFMfX1dXCJcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuY3VzdG9tRm9ybWF0ID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHQvLyDmm7TmlrDpooTop4hcclxuXHRcdFx0XHRcdFx0dXBkYXRlRm9ybWF0UHJldmlldyhzZXR0aW5nVGFiLCBjb250YWluZXJFbCwgdmFsdWUpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8g5re75Yqg6aKE6KeI5Yy65Z+fXHJcblxyXG5cdFx0Ly8gU2hvdyBleGFtcGxlcyBvZiBhZHZhbmNlZCBmb3JtYXRzIHVzaW5nIGV4cHJlc3Npb25zXHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0LnNldE5hbWUodChcIkV4cHJlc3Npb24gZXhhbXBsZXNcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJFeGFtcGxlcyBvZiBhZHZhbmNlZCBmb3JtYXRzIHVzaW5nIGV4cHJlc3Npb25zXCIpKVxyXG5cdFx0XHQuc2V0SGVhZGluZygpO1xyXG5cclxuXHRcdGNvbnN0IGV4YW1wbGVDb250YWluZXIgPSBjb250YWluZXJFbC5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdGNsczogXCJleHByZXNzaW9uLWV4YW1wbGVzXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCBleGFtcGxlcyA9IFtcclxuXHRcdFx0e1xyXG5cdFx0XHRcdG5hbWU6IHQoXCJUZXh0IFByb2dyZXNzIEJhclwiKSxcclxuXHRcdFx0XHRjb2RlOiAnWyR7PVwiPVwiLnJlcGVhdChNYXRoLmZsb29yKGRhdGEucGVyY2VudGFnZXMuY29tcGxldGVkLzEwKSkgKyBcIiBcIi5yZXBlYXQoMTAtTWF0aC5mbG9vcihkYXRhLnBlcmNlbnRhZ2VzLmNvbXBsZXRlZC8xMCkpfV0ge3tQRVJDRU5UfX0lJyxcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdG5hbWU6IHQoXCJFbW9qaSBQcm9ncmVzcyBCYXJcIiksXHJcblx0XHRcdFx0Y29kZTogJyR7PVwi4qybXCIucmVwZWF0KE1hdGguZmxvb3IoZGF0YS5wZXJjZW50YWdlcy5jb21wbGV0ZWQvMTApKSArIFwi4qycXCIucmVwZWF0KDEwLU1hdGguZmxvb3IoZGF0YS5wZXJjZW50YWdlcy5jb21wbGV0ZWQvMTApKX0ge3tQRVJDRU5UfX0lJyxcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdG5hbWU6IHQoXCJDb2xvci1jb2RlZCBTdGF0dXNcIiksXHJcblx0XHRcdFx0Y29kZTogXCJ7e0NPTVBMRVRFRH19L3t7VE9UQUx9fSAkez1kYXRhLnBlcmNlbnRhZ2VzLmNvbXBsZXRlZCA8IDMwID8gJ/CflLQnIDogZGF0YS5wZXJjZW50YWdlcy5jb21wbGV0ZWQgPCA3MCA/ICfwn5+gJyA6ICfwn5+iJ31cIixcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdG5hbWU6IHQoXCJTdGF0dXMgd2l0aCBJY29uc1wiKSxcclxuXHRcdFx0XHRjb2RlOiBcIlt7e0NPTVBMRVRFRF9TWU1CT0x9fTp7e0NPTVBMRVRFRH19IHt7SU5fUFJPR1JFU1NfU1lNQk9MfX06e3tJTl9QUk9HUkVTU319IHt7UExBTk5FRF9TWU1CT0x9fTp7e1BMQU5ORUR9fSAvIHt7VE9UQUx9fV1cIixcclxuXHRcdFx0fSxcclxuXHRcdF07XHJcblxyXG5cdFx0ZXhhbXBsZXMuZm9yRWFjaCgoZXhhbXBsZSkgPT4ge1xyXG5cdFx0XHRjb25zdCBleGFtcGxlSXRlbSA9IGV4YW1wbGVDb250YWluZXIuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHRcdGNsczogXCJleHByZXNzaW9uLWV4YW1wbGUtaXRlbVwiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGV4YW1wbGVJdGVtLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0XHRjbHM6IFwiZXhwcmVzc2lvbi1leGFtcGxlLW5hbWVcIixcclxuXHRcdFx0XHR0ZXh0OiBleGFtcGxlLm5hbWUsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgY29kZUVsID0gZXhhbXBsZUl0ZW0uY3JlYXRlRWwoXCJjb2RlXCIsIHtcclxuXHRcdFx0XHRjbHM6IFwiZXhwcmVzc2lvbi1leGFtcGxlLWNvZGVcIixcclxuXHRcdFx0XHR0ZXh0OiBleGFtcGxlLmNvZGUsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8g5re75Yqg6aKE6KeI5pWI5p6cXHJcblx0XHRcdGNvbnN0IHByZXZpZXdFbCA9IGV4YW1wbGVJdGVtLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0XHRjbHM6IFwiZXhwcmVzc2lvbi1leGFtcGxlLXByZXZpZXdcIixcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyDliJvlu7rnpLrkvovmlbDmja7mnaXmuLLmn5PpooTop4hcclxuXHRcdFx0Y29uc3Qgc2FtcGxlRGF0YSA9IHtcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IDMsXHJcblx0XHRcdFx0dG90YWw6IDUsXHJcblx0XHRcdFx0aW5Qcm9ncmVzczogMSxcclxuXHRcdFx0XHRhYmFuZG9uZWQ6IDAsXHJcblx0XHRcdFx0bm90U3RhcnRlZDogMCxcclxuXHRcdFx0XHRwbGFubmVkOiAxLFxyXG5cdFx0XHRcdHBlcmNlbnRhZ2VzOiB7XHJcblx0XHRcdFx0XHRjb21wbGV0ZWQ6IDYwLFxyXG5cdFx0XHRcdFx0aW5Qcm9ncmVzczogMjAsXHJcblx0XHRcdFx0XHRhYmFuZG9uZWQ6IDAsXHJcblx0XHRcdFx0XHRub3RTdGFydGVkOiAwLFxyXG5cdFx0XHRcdFx0cGxhbm5lZDogMjAsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Y29uc3QgcmVuZGVyZWRUZXh0ID0gcmVuZGVyRm9ybWF0UHJldmlldyhcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIsXHJcblx0XHRcdFx0XHRleGFtcGxlLmNvZGUsXHJcblx0XHRcdFx0XHRzYW1wbGVEYXRhXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRwcmV2aWV3RWwuc2V0VGV4dChgJHt0KFwiUHJldmlld1wiKX06ICR7cmVuZGVyZWRUZXh0fWApO1xyXG5cdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdHByZXZpZXdFbC5zZXRUZXh0KGAke3QoXCJQcmV2aWV3XCIpfTogRXJyb3JgKTtcclxuXHRcdFx0XHRwcmV2aWV3RWwuYWRkQ2xhc3MoXCJleHByZXNzaW9uLXByZXZpZXctZXJyb3JcIik7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IHVzZUJ1dHRvbiA9IGV4YW1wbGVJdGVtLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0XHRjbHM6IFwiZXhwcmVzc2lvbi1leGFtcGxlLXVzZVwiLFxyXG5cdFx0XHRcdHRleHQ6IHQoXCJVc2VcIiksXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0dXNlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuY3VzdG9tRm9ybWF0ID0gZXhhbXBsZS5jb2RlO1xyXG5cdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cclxuXHRcdFx0XHRjb25zdCBpbnB1dHMgPSBjb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKFwidGV4dGFyZWFcIik7XHJcblx0XHRcdFx0Zm9yIChjb25zdCBpbnB1dCBvZiBBcnJheS5mcm9tKGlucHV0cykpIHtcclxuXHRcdFx0XHRcdGlmIChpbnB1dC5wbGFjZWhvbGRlciA9PT0gXCJbe3tDT01QTEVURUR9fS97e1RPVEFMfX1dXCIpIHtcclxuXHRcdFx0XHRcdFx0aW5wdXQudmFsdWUgPSBleGFtcGxlLmNvZGU7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0dXBkYXRlRm9ybWF0UHJldmlldyhzZXR0aW5nVGFiLCBjb250YWluZXJFbCwgZXhhbXBsZS5jb2RlKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblx0Ly8gT25seSBzaG93IGxlZ2FjeSBwZXJjZW50YWdlIHRvZ2dsZSBmb3IgcmFuZ2UtYmFzZWQgb3Igd2hlbiBkaXNwbGF5TW9kZSBpcyBub3Qgc2V0XHJcblx0ZWxzZSBpZiAoXHJcblx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5kaXNwbGF5TW9kZSA9PT0gXCJyYW5nZS1iYXNlZFwiIHx8XHJcblx0XHQhc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZGlzcGxheU1vZGVcclxuXHQpIHtcclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiU2hvdyBwZXJjZW50YWdlXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XCJUb2dnbGUgdGhpcyB0byBzaG93IHBlcmNlbnRhZ2UgaW5zdGVhZCBvZiBjb21wbGV0ZWQvdG90YWwgY291bnQuXCJcclxuXHRcdFx0XHQpXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxyXG5cdFx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnNob3dQZXJjZW50YWdlKVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5zaG93UGVyY2VudGFnZSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0Ly8gSWYgcGVyY2VudGFnZSBkaXNwbGF5IGFuZCByYW5nZS1iYXNlZCBtb2RlIGlzIHNlbGVjdGVkXHJcblx0XHRpZiAoXHJcblx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnNob3dQZXJjZW50YWdlICYmXHJcblx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmRpc3BsYXlNb2RlID09PSBcInJhbmdlLWJhc2VkXCJcclxuXHRcdCkge1xyXG5cdFx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0XHQuc2V0TmFtZSh0KFwiQ3VzdG9taXplIHByb2dyZXNzIHJhbmdlc1wiKSlcclxuXHRcdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcdFwiVG9nZ2xlIHRoaXMgdG8gY3VzdG9taXplIHRoZSB0ZXh0IGZvciBkaWZmZXJlbnQgcHJvZ3Jlc3MgcmFuZ2VzLlwiXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdFx0KVxyXG5cdFx0XHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT5cclxuXHRcdFx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdFx0XHQuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuY3VzdG9taXplUHJvZ3Jlc3NSYW5nZXNcclxuXHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuY3VzdG9taXplUHJvZ3Jlc3NSYW5nZXMgPVxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5kaXNwbGF5KCk7XHJcblx0XHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdGlmIChzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5jdXN0b21pemVQcm9ncmVzc1Jhbmdlcykge1xyXG5cdFx0XHRcdGFkZFByb2dyZXNzUmFuZ2VzU2V0dGluZ3Moc2V0dGluZ1RhYiwgY29udGFpbmVyRWwpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG5mdW5jdGlvbiBhZGRQcm9ncmVzc1Jhbmdlc1NldHRpbmdzKFxyXG5cdHNldHRpbmdUYWI6IFRhc2tQcm9ncmVzc0JhclNldHRpbmdUYWIsXHJcblx0Y29udGFpbmVyRWw6IEhUTUxFbGVtZW50XHJcbikge1xyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIlByb2dyZXNzIFJhbmdlc1wiKSlcclxuXHRcdC5zZXREZXNjKFxyXG5cdFx0XHR0KFxyXG5cdFx0XHRcdFwiRGVmaW5lIHByb2dyZXNzIHJhbmdlcyBhbmQgdGhlaXIgY29ycmVzcG9uZGluZyB0ZXh0IHJlcHJlc2VudGF0aW9ucy5cIlxyXG5cdFx0XHQpXHJcblx0XHQpXHJcblx0XHQuc2V0SGVhZGluZygpO1xyXG5cclxuXHQvLyBEaXNwbGF5IGV4aXN0aW5nIHJhbmdlc1xyXG5cdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByb2dyZXNzUmFuZ2VzLmZvckVhY2goKHJhbmdlLCBpbmRleCkgPT4ge1xyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKGAke3QoXCJSYW5nZVwiKX0gJHtpbmRleCArIDF9OiAke3JhbmdlLm1pbn0lLSR7cmFuZ2UubWF4fSVgKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHRgJHt0KFwiVXNlXCIpfSB7e1BST0dSRVNTfX0gJHt0KFxyXG5cdFx0XHRcdFx0XCJhcyBhIHBsYWNlaG9sZGVyIGZvciB0aGUgcGVyY2VudGFnZSB2YWx1ZVwiXHJcblx0XHRcdFx0KX1gXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZFRleHQoKHRleHQpID0+XHJcblx0XHRcdFx0dGV4dFxyXG5cdFx0XHRcdFx0LnNldFBsYWNlaG9sZGVyKFxyXG5cdFx0XHRcdFx0XHRgJHt0KFwiVGVtcGxhdGUgdGV4dCB3aXRoXCIpfSB7e1BST0dSRVNTfX0gJHt0KFxyXG5cdFx0XHRcdFx0XHRcdFwicGxhY2Vob2xkZXJcIlxyXG5cdFx0XHRcdFx0XHQpfWBcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZShyYW5nZS50ZXh0KVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9ncmVzc1Jhbmdlc1tpbmRleF0udGV4dCA9XHJcblx0XHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0fSlcclxuXHRcdFx0KVxyXG5cdFx0XHQuYWRkQnV0dG9uKChidXR0b24pID0+IHtcclxuXHRcdFx0XHRidXR0b24uc2V0QnV0dG9uVGV4dChcIkRlbGV0ZVwiKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByb2dyZXNzUmFuZ2VzLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLmFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIuZGlzcGxheSgpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiQWRkIG5ldyByYW5nZVwiKSlcclxuXHRcdC5zZXREZXNjKHQoXCJBZGQgYSBuZXcgcHJvZ3Jlc3MgcGVyY2VudGFnZSByYW5nZSB3aXRoIGN1c3RvbSB0ZXh0XCIpKTtcclxuXHJcblx0Ly8gQWRkIGEgbmV3IHJhbmdlXHJcblx0Y29uc3QgbmV3UmFuZ2VTZXR0aW5nID0gbmV3IFNldHRpbmcoY29udGFpbmVyRWwpO1xyXG5cdG5ld1JhbmdlU2V0dGluZy5pbmZvRWwuZGV0YWNoKCk7XHJcblxyXG5cdG5ld1JhbmdlU2V0dGluZ1xyXG5cdFx0LmFkZFRleHQoKHRleHQpID0+XHJcblx0XHRcdHRleHRcclxuXHRcdFx0XHQuc2V0UGxhY2Vob2xkZXIodChcIk1pbiBwZXJjZW50YWdlICgwLTEwMClcIikpXHJcblx0XHRcdFx0LnNldFZhbHVlKFwiXCIpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gVGhpcyB3aWxsIGJlIGhhbmRsZWQgd2hlbiB0aGUgdXNlciBjbGlja3MgdGhlIEFkZCBidXR0b25cclxuXHRcdFx0XHR9KVxyXG5cdFx0KVxyXG5cdFx0LmFkZFRleHQoKHRleHQpID0+XHJcblx0XHRcdHRleHRcclxuXHRcdFx0XHQuc2V0UGxhY2Vob2xkZXIodChcIk1heCBwZXJjZW50YWdlICgwLTEwMClcIikpXHJcblx0XHRcdFx0LnNldFZhbHVlKFwiXCIpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gVGhpcyB3aWxsIGJlIGhhbmRsZWQgd2hlbiB0aGUgdXNlciBjbGlja3MgdGhlIEFkZCBidXR0b25cclxuXHRcdFx0XHR9KVxyXG5cdFx0KVxyXG5cdFx0LmFkZFRleHQoKHRleHQpID0+XHJcblx0XHRcdHRleHRcclxuXHRcdFx0XHQuc2V0UGxhY2Vob2xkZXIodChcIlRleHQgdGVtcGxhdGUgKHVzZSB7e1BST0dSRVNTfX0pXCIpKVxyXG5cdFx0XHRcdC5zZXRWYWx1ZShcIlwiKVxyXG5cdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdC8vIFRoaXMgd2lsbCBiZSBoYW5kbGVkIHdoZW4gdGhlIHVzZXIgY2xpY2tzIHRoZSBBZGQgYnV0dG9uXHJcblx0XHRcdFx0fSlcclxuXHRcdClcclxuXHRcdC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xyXG5cdFx0XHRidXR0b24uc2V0QnV0dG9uVGV4dChcIkFkZFwiKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcclxuXHRcdFx0XHRjb25zdCBzZXR0aW5nc0NvbnRhaW5lciA9IGJ1dHRvbi5idXR0b25FbC5wYXJlbnRFbGVtZW50O1xyXG5cdFx0XHRcdGlmICghc2V0dGluZ3NDb250YWluZXIpIHJldHVybjtcclxuXHJcblx0XHRcdFx0Y29uc3QgaW5wdXRzID0gc2V0dGluZ3NDb250YWluZXIucXVlcnlTZWxlY3RvckFsbChcImlucHV0XCIpO1xyXG5cdFx0XHRcdGlmIChpbnB1dHMubGVuZ3RoIDwgMykgcmV0dXJuO1xyXG5cclxuXHRcdFx0XHRjb25zdCBtaW4gPSBwYXJzZUludChpbnB1dHNbMF0udmFsdWUpO1xyXG5cdFx0XHRcdGNvbnN0IG1heCA9IHBhcnNlSW50KGlucHV0c1sxXS52YWx1ZSk7XHJcblx0XHRcdFx0Y29uc3QgdGV4dCA9IGlucHV0c1syXS52YWx1ZTtcclxuXHJcblx0XHRcdFx0aWYgKGlzTmFOKG1pbikgfHwgaXNOYU4obWF4KSB8fCAhdGV4dCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvZ3Jlc3NSYW5nZXMucHVzaCh7XHJcblx0XHRcdFx0XHRtaW4sXHJcblx0XHRcdFx0XHRtYXgsXHJcblx0XHRcdFx0XHR0ZXh0LFxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyBDbGVhciBpbnB1dHNcclxuXHRcdFx0XHRpbnB1dHNbMF0udmFsdWUgPSBcIlwiO1xyXG5cdFx0XHRcdGlucHV0c1sxXS52YWx1ZSA9IFwiXCI7XHJcblx0XHRcdFx0aW5wdXRzWzJdLnZhbHVlID0gXCJcIjtcclxuXHJcblx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0c2V0dGluZ1RhYi5kaXNwbGF5KCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdC8vIFJlc2V0IHRvIGRlZmF1bHRzXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiUmVzZXQgdG8gZGVmYXVsdHNcIikpXHJcblx0XHQuc2V0RGVzYyh0KFwiUmVzZXQgcHJvZ3Jlc3MgcmFuZ2VzIHRvIGRlZmF1bHQgdmFsdWVzXCIpKVxyXG5cdFx0LmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XHJcblx0XHRcdGJ1dHRvbi5zZXRCdXR0b25UZXh0KHQoXCJSZXNldFwiKSkub25DbGljayhhc3luYyAoKSA9PiB7XHJcblx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvZ3Jlc3NSYW5nZXMgPSBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG1pbjogMCxcclxuXHRcdFx0XHRcdFx0bWF4OiAyMCxcclxuXHRcdFx0XHRcdFx0dGV4dDogdChcIkp1c3Qgc3RhcnRlZCB7e1BST0dSRVNTfX0lXCIpLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bWluOiAyMCxcclxuXHRcdFx0XHRcdFx0bWF4OiA0MCxcclxuXHRcdFx0XHRcdFx0dGV4dDogdChcIk1ha2luZyBwcm9ncmVzcyB7e1BST0dSRVNTfX0lXCIpLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHsgbWluOiA0MCwgbWF4OiA2MCwgdGV4dDogdChcIkhhbGYgd2F5IHt7UFJPR1JFU1N9fSVcIikgfSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bWluOiA2MCxcclxuXHRcdFx0XHRcdFx0bWF4OiA4MCxcclxuXHRcdFx0XHRcdFx0dGV4dDogdChcIkdvb2QgcHJvZ3Jlc3Mge3tQUk9HUkVTU319JVwiKSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG1pbjogODAsXHJcblx0XHRcdFx0XHRcdG1heDogMTAwLFxyXG5cdFx0XHRcdFx0XHR0ZXh0OiB0KFwiQWxtb3N0IHRoZXJlIHt7UFJPR1JFU1N9fSVcIiksXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdF07XHJcblx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0c2V0dGluZ1RhYi5kaXNwbGF5KCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZUZvcm1hdFByZXZpZXcoXHJcblx0c2V0dGluZ1RhYjogVGFza1Byb2dyZXNzQmFyU2V0dGluZ1RhYixcclxuXHRjb250YWluZXJFbDogSFRNTEVsZW1lbnQsXHJcblx0Zm9ybWF0VGV4dDogc3RyaW5nXHJcbik6IHZvaWQge1xyXG5cdGNvbnN0IHByZXZpZXdDb250YWluZXIgPSBjb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XCIuY3VzdG9tLWZvcm1hdC1wcmV2aWV3LWNvbnRlbnRcIlxyXG5cdCk7XHJcblx0aWYgKCFwcmV2aWV3Q29udGFpbmVyKSByZXR1cm47XHJcblxyXG5cdC8vIOWIm+W7uuekuuS+i+aVsOaNrlxyXG5cdGNvbnN0IHNhbXBsZURhdGEgPSB7XHJcblx0XHRjb21wbGV0ZWQ6IDMsXHJcblx0XHR0b3RhbDogNSxcclxuXHRcdGluUHJvZ3Jlc3M6IDEsXHJcblx0XHRhYmFuZG9uZWQ6IDAsXHJcblx0XHRub3RTdGFydGVkOiAwLFxyXG5cdFx0cGxhbm5lZDogMSxcclxuXHRcdHBlcmNlbnRhZ2VzOiB7XHJcblx0XHRcdGNvbXBsZXRlZDogNjAsXHJcblx0XHRcdGluUHJvZ3Jlc3M6IDIwLFxyXG5cdFx0XHRhYmFuZG9uZWQ6IDAsXHJcblx0XHRcdG5vdFN0YXJ0ZWQ6IDAsXHJcblx0XHRcdHBsYW5uZWQ6IDIwLFxyXG5cdFx0fSxcclxuXHR9O1xyXG5cclxuXHR0cnkge1xyXG5cdFx0Y29uc3QgcmVuZGVyZWRUZXh0ID0gcmVuZGVyRm9ybWF0UHJldmlldyhcclxuXHRcdFx0c2V0dGluZ1RhYixcclxuXHRcdFx0Zm9ybWF0VGV4dCxcclxuXHRcdFx0c2FtcGxlRGF0YVxyXG5cdFx0KTtcclxuXHRcdHByZXZpZXdDb250YWluZXIuc2V0VGV4dChyZW5kZXJlZFRleHQpO1xyXG5cdFx0cHJldmlld0NvbnRhaW5lci5yZW1vdmVDbGFzcyhcImN1c3RvbS1mb3JtYXQtcHJldmlldy1lcnJvclwiKTtcclxuXHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0cHJldmlld0NvbnRhaW5lci5zZXRUZXh0KFwiRXJyb3IgcmVuZGVyaW5nIGZvcm1hdFwiKTtcclxuXHRcdHByZXZpZXdDb250YWluZXIuYWRkQ2xhc3MoXCJjdXN0b20tZm9ybWF0LXByZXZpZXctZXJyb3JcIik7XHJcblx0fVxyXG59XHJcblxyXG4vLyDmt7vliqDmuLLmn5PmoLzlvI/mlofmnKznmoTovoXliqnmlrnms5VcclxuZnVuY3Rpb24gcmVuZGVyRm9ybWF0UHJldmlldyhcclxuXHRzZXR0aW5nVGFiOiBUYXNrUHJvZ3Jlc3NCYXJTZXR0aW5nVGFiLFxyXG5cdGZvcm1hdFRleHQ6IHN0cmluZyxcclxuXHRzYW1wbGVEYXRhOiBhbnlcclxuKTogc3RyaW5nIHtcclxuXHR0cnkge1xyXG5cdFx0Ly8g5L+d5a2Y5Y6f5aeL55qEY3VzdG9tRm9ybWF05YC8XHJcblx0XHRjb25zdCBvcmlnaW5hbEZvcm1hdCA9IHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmN1c3RvbUZvcm1hdDtcclxuXHJcblx0XHQvLyDkuLTml7borr7nva5jdXN0b21Gb3JtYXTkuLrmiJHku6zopoHpooTop4jnmoTmoLzlvI9cclxuXHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmN1c3RvbUZvcm1hdCA9IGZvcm1hdFRleHQ7XHJcblxyXG5cdFx0Ly8g5L2/55So5o+S5Lu255qEZm9ybWF0UHJvZ3Jlc3NUZXh05Ye95pWw6K6h566X6aKE6KeIXHJcblx0XHRjb25zdCByZXN1bHQgPSBmb3JtYXRQcm9ncmVzc1RleHQoc2FtcGxlRGF0YSwgc2V0dGluZ1RhYi5wbHVnaW4pO1xyXG5cclxuXHRcdC8vIOaBouWkjeWOn+Wni+eahGN1c3RvbUZvcm1hdOWAvFxyXG5cdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuY3VzdG9tRm9ybWF0ID0gb3JpZ2luYWxGb3JtYXQ7XHJcblxyXG5cdFx0cmV0dXJuIHJlc3VsdDtcclxuXHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIGluIHJlbmRlckZvcm1hdFByZXZpZXc6XCIsIGVycm9yKTtcclxuXHRcdHRocm93IGVycm9yO1xyXG5cdH1cclxufVxyXG4iXX0=