import { __awaiter } from "tslib";
import { Setting, setIcon, DropdownComponent, debounce } from "obsidian";
import { t } from "@/translations/helper";
import { FilterMode } from "@/common/setting-definition";
import { FolderSuggest, SimpleFileSuggest as FileSuggest, } from "@/components/ui/inputs/AutoComplete";
import "@/styles/file-filter-settings.css";
export function renderFileFilterSettingsTab(settingTab, containerEl) {
    new Setting(containerEl).setName(t("File Filter")).setHeading();
    new Setting(containerEl)
        .setName(t("Enable File Filter"))
        .setDesc(t("Toggle this to enable file and folder filtering during task indexing. This can significantly improve performance for large vaults."))
        .addToggle((toggle) => toggle
        .setValue(settingTab.plugin.settings.fileFilter.enabled)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        settingTab.plugin.settings.fileFilter.enabled = value;
        // Apply settings via orchestrator (incremental) to avoid full rebuilds
        settingTab.applySettingsUpdate();
        // Refresh the settings display immediately to show/hide relevant options
        containerEl.empty();
        renderFileFilterSettingsTab(settingTab, containerEl);
    })));
    if (!settingTab.plugin.settings.fileFilter.enabled)
        return;
    // Filter mode selection
    new Setting(containerEl)
        .setName(t("File Filter Mode"))
        .setDesc(t("Choose whether to include only specified files/folders (whitelist) or exclude them (blacklist)"))
        .addDropdown((dropdown) => dropdown
        .addOption(FilterMode.WHITELIST, t("Whitelist (Include only)"))
        .addOption(FilterMode.BLACKLIST, t("Blacklist (Exclude)"))
        .setValue(settingTab.plugin.settings.fileFilter.mode)
        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
        settingTab.plugin.settings.fileFilter.mode = value;
        debouncedApplySettingsUpdate();
        // File filter configuration is now handled by dataflow
        debouncedUpdateStats();
    })));
    // Filter scope selection has been deprecated; use per-rule scope instead
    // This block intentionally left as a no-op to maintain layout spacing.
    // Filter rules section
    new Setting(containerEl)
        .setName(t("File Filter Rules"))
        .setDesc(t("Configure which files and folders to include or exclude from task indexing"));
    // Container for filter rules
    const rulesContainer = containerEl.createDiv({
        cls: "file-filter-rules-container",
    });
    // Function to render all rules
    const renderRules = () => {
        rulesContainer.empty();
        settingTab.plugin.settings.fileFilter.rules.forEach((rule, index) => {
            const ruleContainer = rulesContainer.createDiv({
                cls: "file-filter-rule",
            });
            // Rule type dropdown
            const typeContainer = ruleContainer.createDiv({
                cls: "file-filter-rule-type",
            });
            typeContainer.createEl("label", { text: t("Type:") });
            new DropdownComponent(typeContainer)
                .addOption("file", t("File"))
                .addOption("folder", t("Folder"))
                .addOption("pattern", t("Pattern"))
                .setValue(rule.type)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                rule.type = value;
                debouncedApplySettingsUpdate();
                // File filter configuration is now handled by dataflow
                debouncedUpdateStats();
                // Re-render rules to update suggest components
                renderRules();
            }));
            // Rule scope dropdown (per-rule)
            const scopeContainer = ruleContainer.createDiv({
                cls: "file-filter-rule-scope",
            });
            scopeContainer.createEl("label", { text: t("Scope:") });
            new DropdownComponent(scopeContainer)
                .addOption("both", t("Both"))
                .addOption("inline", t("Inline"))
                .addOption("file", t("File"))
                .setValue(rule.scope || "both")
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                rule.scope = value;
                debouncedApplySettingsUpdate();
                debouncedUpdateStats();
            }));
            // Path input
            const pathContainer = ruleContainer.createDiv({
                cls: "file-filter-rule-path",
            });
            pathContainer.createEl("label", { text: t("Path:") });
            const pathInput = pathContainer.createEl("input", {
                type: "text",
                value: rule.path,
                placeholder: rule.type === "pattern"
                    ? "*.tmp, temp/*"
                    : rule.type === "folder"
                        ? "path/to/folder"
                        : "path/to/file.md",
            });
            // Add appropriate suggest based on rule type
            if (rule.type === "folder") {
                new FolderSuggest(settingTab.app, pathInput, settingTab.plugin, "single");
            }
            else if (rule.type === "file") {
                new FileSuggest(pathInput, settingTab.plugin, (file) => {
                    rule.path = file.path;
                    pathInput.value = file.path;
                    debouncedApplySettingsUpdate();
                    // File filter configuration is now handled by dataflow
                    debouncedUpdateStats();
                });
            }
            pathInput.addEventListener("input", () => __awaiter(this, void 0, void 0, function* () {
                rule.path = pathInput.value;
                debouncedApplySettingsUpdate();
                // File filter configuration is now handled by dataflow
                debouncedUpdateStats();
            }));
            // Enabled toggle
            const enabledContainer = ruleContainer.createDiv({
                cls: "file-filter-rule-enabled",
            });
            enabledContainer.createEl("label", { text: t("Enabled:") });
            const enabledCheckbox = enabledContainer.createEl("input", {
                type: "checkbox",
            });
            enabledCheckbox.checked = rule.enabled;
            enabledCheckbox.addEventListener("change", () => __awaiter(this, void 0, void 0, function* () {
                rule.enabled = enabledCheckbox.checked;
                debouncedApplySettingsUpdate();
                // File filter configuration is now handled by dataflow
                debouncedUpdateStats();
            }));
            // Delete button
            const deleteButton = ruleContainer.createEl("button", {
                cls: "file-filter-rule-delete mod-destructive",
            });
            setIcon(deleteButton, "trash");
            deleteButton.title = t("Delete rule");
            deleteButton.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
                settingTab.plugin.settings.fileFilter.rules.splice(index, 1);
                debouncedApplySettingsUpdate();
                // File filter configuration is now handled by dataflow
                renderRules();
                debouncedUpdateStats();
            }));
        });
    };
    // Add rule button
    const addRuleContainer = containerEl.createDiv({
        cls: "file-filter-add-rule",
    });
    new Setting(addRuleContainer)
        .setName(t("Add Filter Rule"))
        .addButton((button) => button.setButtonText(t("Add File Rule")).onClick(() => __awaiter(this, void 0, void 0, function* () {
        const newRule = {
            type: "file",
            path: "",
            enabled: true,
        };
        settingTab.plugin.settings.fileFilter.rules.push(newRule);
        debouncedApplySettingsUpdate();
        // File filter configuration is now handled by dataflow
        renderRules();
        debouncedUpdateStats();
    })))
        .addButton((button) => button.setButtonText(t("Add Folder Rule")).onClick(() => __awaiter(this, void 0, void 0, function* () {
        const newRule = {
            type: "folder",
            path: "",
            enabled: true,
        };
        settingTab.plugin.settings.fileFilter.rules.push(newRule);
        debouncedApplySettingsUpdate();
        // File filter configuration is now handled by dataflow
        renderRules();
        debouncedUpdateStats();
    })))
        .addButton((button) => button.setButtonText(t("Add Pattern Rule")).onClick(() => __awaiter(this, void 0, void 0, function* () {
        const newRule = {
            type: "pattern",
            path: "",
            enabled: true,
        };
        settingTab.plugin.settings.fileFilter.rules.push(newRule);
        debouncedApplySettingsUpdate();
        // File filter configuration is now handled by dataflow
        renderRules();
        debouncedUpdateStats();
    })));
    // Manual refresh button for statistics
    new Setting(containerEl)
        .setName(t("Refresh Statistics"))
        .setDesc(t("Manually refresh filter statistics to see current data"))
        .addButton((button) => button.setButtonText(t("Refresh")).onClick(() => {
        button.setDisabled(true);
        button.setButtonText(t("Refreshing..."));
        // Add visual feedback
        setTimeout(() => {
            updateStats();
            button.setDisabled(false);
            button.setButtonText(t("Refresh"));
        }, 100);
    }));
    // Filter statistics
    const statsContainer = containerEl.createDiv({
        cls: "file-filter-stats",
    });
    // Debounced apply of settings update to avoid heavy rebuilds on rapid edits
    const debouncedApplySettingsUpdate = debounce(() => settingTab.applySettingsUpdate(), 300, true);
    // Create debounced version of updateStats to avoid excessive calls
    const debouncedUpdateStats = debounce(() => updateStats(), 200, true);
    const updateStats = () => {
        try {
            // TODO: Get file filter stats from dataflow when available
            const stats = {
                rulesCount: settingTab.plugin.settings.fileFilter.rules.filter((r) => r.enabled).length,
                cacheSize: 0,
                processedFiles: 0,
                filteredFiles: 0,
            };
            // Clear existing content
            statsContainer.empty();
            // Active Rules stat
            const activeRulesStat = statsContainer.createDiv({
                cls: "file-filter-stat",
            });
            activeRulesStat.createEl("span", {
                cls: "stat-label",
                text: `${t("Active Rules")}:`,
            });
            activeRulesStat.createEl("span", {
                cls: "stat-value",
                text: stats.rulesCount.toString(),
            });
            // Cache Size stat
            const cacheSizeStat = statsContainer.createDiv({
                cls: "file-filter-stat",
            });
            cacheSizeStat.createEl("span", {
                cls: "stat-label",
                text: `${t("Cache Size")}:`,
            });
            cacheSizeStat.createEl("span", {
                cls: "stat-value",
                text: stats.cacheSize.toString(),
            });
            // Status stat
            const statusStat = statsContainer.createDiv({
                cls: "file-filter-stat",
            });
            statusStat.createEl("span", {
                cls: "stat-label",
                text: `${t("Status")}:`,
            });
            statusStat.createEl("span", {
                cls: "stat-value",
                text: settingTab.plugin.settings.fileFilter.enabled
                    ? t("Enabled")
                    : t("Disabled"),
            });
        }
        catch (error) {
            console.error("Error updating filter statistics:", error);
            statsContainer.empty();
            const errorStat = statsContainer.createDiv({
                cls: "file-filter-stat error",
            });
            errorStat.createEl("span", {
                cls: "stat-label",
                text: t("Error loading statistics"),
            });
        }
    };
    // Initial render
    renderRules();
    updateStats();
    // Update stats periodically
    const statsInterval = setInterval(updateStats, 5000);
    // Clean up interval when container is removed
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.removedNodes.forEach((node) => {
                var _a;
                if (node === containerEl ||
                    ((_a = node === null || node === void 0 ? void 0 : node.contains) === null || _a === void 0 ? void 0 : _a.call(node, containerEl))) {
                    clearInterval(statsInterval);
                    observer.disconnect();
                }
            });
        });
    });
    if (containerEl.parentNode) {
        observer.observe(containerEl.parentNode, {
            childList: true,
            subtree: true,
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmlsZUZpbHRlclNldHRpbmdzVGFiLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiRmlsZUZpbHRlclNldHRpbmdzVGFiLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBQUUsT0FBTyxFQUFVLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFFakYsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzFDLE9BQU8sRUFBRSxVQUFVLEVBQWtCLE1BQU0sNkJBQTZCLENBQUM7QUFDekUsT0FBTyxFQUNOLGFBQWEsRUFDYixpQkFBaUIsSUFBSSxXQUFXLEdBQ2hDLE1BQU0scUNBQXFDLENBQUM7QUFDN0MsT0FBTyxtQ0FBbUMsQ0FBQztBQUUzQyxNQUFNLFVBQVUsMkJBQTJCLENBQzFDLFVBQXFDLEVBQ3JDLFdBQXdCO0lBRXhCLElBQUksT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUVoRSxJQUFJLE9BQU8sQ0FBQyxXQUFXLENBQUM7U0FDdEIsT0FBTyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1NBQ2hDLE9BQU8sQ0FDUCxDQUFDLENBQ0Esb0lBQW9JLENBQ3BJLENBQ0Q7U0FDQSxTQUFTLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUNyQixNQUFNO1NBQ0osUUFBUSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUM7U0FDdkQsUUFBUSxDQUFDLENBQU8sS0FBSyxFQUFFLEVBQUU7UUFDekIsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7UUFDdEQsdUVBQXVFO1FBQ3ZFLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBQ2pDLHlFQUF5RTtRQUN6RSxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDcEIsMkJBQTJCLENBQUMsVUFBVSxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ3RELENBQUMsQ0FBQSxDQUFDLENBQ0gsQ0FBQztJQUVILElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTztRQUFFLE9BQU87SUFFM0Qsd0JBQXdCO0lBQ3hCLElBQUksT0FBTyxDQUFDLFdBQVcsQ0FBQztTQUN0QixPQUFPLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUM7U0FDOUIsT0FBTyxDQUNQLENBQUMsQ0FDQSxnR0FBZ0csQ0FDaEcsQ0FDRDtTQUNBLFdBQVcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQ3pCLFFBQVE7U0FDTixTQUFTLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsMEJBQTBCLENBQUMsQ0FBQztTQUM5RCxTQUFTLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQztTQUN6RCxRQUFRLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztTQUNwRCxRQUFRLENBQUMsQ0FBTyxLQUFpQixFQUFFLEVBQUU7UUFDckMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7UUFDbkQsNEJBQTRCLEVBQUUsQ0FBQztRQUMvQix1REFBdUQ7UUFDdkQsb0JBQW9CLEVBQUUsQ0FBQztJQUN4QixDQUFDLENBQUEsQ0FBQyxDQUNILENBQUM7SUFFSCx5RUFBeUU7SUFDekUsdUVBQXVFO0lBRXZFLHVCQUF1QjtJQUN2QixJQUFJLE9BQU8sQ0FBQyxXQUFXLENBQUM7U0FDdEIsT0FBTyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1NBQy9CLE9BQU8sQ0FDUCxDQUFDLENBQ0EsNEVBQTRFLENBQzVFLENBQ0QsQ0FBQztJQUVILDZCQUE2QjtJQUM3QixNQUFNLGNBQWMsR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFDO1FBQzVDLEdBQUcsRUFBRSw2QkFBNkI7S0FDbEMsQ0FBQyxDQUFDO0lBRUgsK0JBQStCO0lBQy9CLE1BQU0sV0FBVyxHQUFHLEdBQUcsRUFBRTtRQUN4QixjQUFjLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFdkIsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFDbkUsTUFBTSxhQUFhLEdBQUcsY0FBYyxDQUFDLFNBQVMsQ0FBQztnQkFDOUMsR0FBRyxFQUFFLGtCQUFrQjthQUN2QixDQUFDLENBQUM7WUFFSCxxQkFBcUI7WUFDckIsTUFBTSxhQUFhLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQztnQkFDN0MsR0FBRyxFQUFFLHVCQUF1QjthQUM1QixDQUFDLENBQUM7WUFDSCxhQUFhLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBRXRELElBQUksaUJBQWlCLENBQUMsYUFBYSxDQUFDO2lCQUNsQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztpQkFDNUIsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7aUJBQ2hDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2lCQUNsQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztpQkFDbkIsUUFBUSxDQUFDLENBQU8sS0FBb0MsRUFBRSxFQUFFO2dCQUN4RCxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQztnQkFDbEIsNEJBQTRCLEVBQUUsQ0FBQztnQkFDL0IsdURBQXVEO2dCQUN2RCxvQkFBb0IsRUFBRSxDQUFDO2dCQUN2QiwrQ0FBK0M7Z0JBQy9DLFdBQVcsRUFBRSxDQUFDO1lBQ2YsQ0FBQyxDQUFBLENBQUMsQ0FBQztZQUVKLGlDQUFpQztZQUNqQyxNQUFNLGNBQWMsR0FBRyxhQUFhLENBQUMsU0FBUyxDQUFDO2dCQUM5QyxHQUFHLEVBQUUsd0JBQXdCO2FBQzdCLENBQUMsQ0FBQztZQUNILGNBQWMsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDeEQsSUFBSSxpQkFBaUIsQ0FBQyxjQUFjLENBQUM7aUJBQ25DLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2lCQUM1QixTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztpQkFDaEMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7aUJBQzVCLFFBQVEsQ0FBRSxJQUFZLENBQUMsS0FBSyxJQUFJLE1BQU0sQ0FBQztpQkFDdkMsUUFBUSxDQUFDLENBQU8sS0FBaUMsRUFBRSxFQUFFO2dCQUNwRCxJQUFZLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztnQkFDNUIsNEJBQTRCLEVBQUUsQ0FBQztnQkFDL0Isb0JBQW9CLEVBQUUsQ0FBQztZQUN4QixDQUFDLENBQUEsQ0FBQyxDQUFDO1lBRUosYUFBYTtZQUNiLE1BQU0sYUFBYSxHQUFHLGFBQWEsQ0FBQyxTQUFTLENBQUM7Z0JBQzdDLEdBQUcsRUFBRSx1QkFBdUI7YUFDNUIsQ0FBQyxDQUFDO1lBQ0gsYUFBYSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUV0RCxNQUFNLFNBQVMsR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRTtnQkFDakQsSUFBSSxFQUFFLE1BQU07Z0JBQ1osS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJO2dCQUNoQixXQUFXLEVBQ1YsSUFBSSxDQUFDLElBQUksS0FBSyxTQUFTO29CQUN0QixDQUFDLENBQUMsZUFBZTtvQkFDakIsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssUUFBUTt3QkFDeEIsQ0FBQyxDQUFDLGdCQUFnQjt3QkFDbEIsQ0FBQyxDQUFDLGlCQUFpQjthQUNyQixDQUFDLENBQUM7WUFFSCw2Q0FBNkM7WUFDN0MsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRTtnQkFDM0IsSUFBSSxhQUFhLENBQ2hCLFVBQVUsQ0FBQyxHQUFHLEVBQ2QsU0FBUyxFQUNULFVBQVUsQ0FBQyxNQUFNLEVBQ2pCLFFBQVEsQ0FDUixDQUFDO2FBQ0Y7aUJBQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRTtnQkFDaEMsSUFBSSxXQUFXLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtvQkFDdEQsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO29CQUN0QixTQUFTLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7b0JBQzVCLDRCQUE0QixFQUFFLENBQUM7b0JBQy9CLHVEQUF1RDtvQkFDdkQsb0JBQW9CLEVBQUUsQ0FBQztnQkFDeEIsQ0FBQyxDQUFDLENBQUM7YUFDSDtZQUVELFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsR0FBUyxFQUFFO2dCQUM5QyxJQUFJLENBQUMsSUFBSSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUM7Z0JBQzVCLDRCQUE0QixFQUFFLENBQUM7Z0JBQy9CLHVEQUF1RDtnQkFDdkQsb0JBQW9CLEVBQUUsQ0FBQztZQUN4QixDQUFDLENBQUEsQ0FBQyxDQUFDO1lBRUgsaUJBQWlCO1lBQ2pCLE1BQU0sZ0JBQWdCLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQztnQkFDaEQsR0FBRyxFQUFFLDBCQUEwQjthQUMvQixDQUFDLENBQUM7WUFDSCxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFNUQsTUFBTSxlQUFlLEdBQUcsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRTtnQkFDMUQsSUFBSSxFQUFFLFVBQVU7YUFDaEIsQ0FBQyxDQUFDO1lBQ0gsZUFBZSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBRXZDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsR0FBUyxFQUFFO2dCQUNyRCxJQUFJLENBQUMsT0FBTyxHQUFHLGVBQWUsQ0FBQyxPQUFPLENBQUM7Z0JBQ3ZDLDRCQUE0QixFQUFFLENBQUM7Z0JBQy9CLHVEQUF1RDtnQkFDdkQsb0JBQW9CLEVBQUUsQ0FBQztZQUN4QixDQUFDLENBQUEsQ0FBQyxDQUFDO1lBRUgsZ0JBQWdCO1lBQ2hCLE1BQU0sWUFBWSxHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFO2dCQUNyRCxHQUFHLEVBQUUseUNBQXlDO2FBQzlDLENBQUMsQ0FBQztZQUNILE9BQU8sQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDL0IsWUFBWSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUM7WUFFdEMsWUFBWSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxHQUFTLEVBQUU7Z0JBQ2pELFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDN0QsNEJBQTRCLEVBQUUsQ0FBQztnQkFDL0IsdURBQXVEO2dCQUN2RCxXQUFXLEVBQUUsQ0FBQztnQkFDZCxvQkFBb0IsRUFBRSxDQUFDO1lBQ3hCLENBQUMsQ0FBQSxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQztJQUVGLGtCQUFrQjtJQUNsQixNQUFNLGdCQUFnQixHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQUM7UUFDOUMsR0FBRyxFQUFFLHNCQUFzQjtLQUMzQixDQUFDLENBQUM7SUFFSCxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQztTQUMzQixPQUFPLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUM7U0FDN0IsU0FBUyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FDckIsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBUyxFQUFFO1FBQzNELE1BQU0sT0FBTyxHQUFtQjtZQUMvQixJQUFJLEVBQUUsTUFBTTtZQUNaLElBQUksRUFBRSxFQUFFO1lBQ1IsT0FBTyxFQUFFLElBQUk7U0FDYixDQUFDO1FBQ0YsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDMUQsNEJBQTRCLEVBQUUsQ0FBQztRQUMvQix1REFBdUQ7UUFDdkQsV0FBVyxFQUFFLENBQUM7UUFDZCxvQkFBb0IsRUFBRSxDQUFDO0lBQ3hCLENBQUMsQ0FBQSxDQUFDLENBQ0Y7U0FDQSxTQUFTLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUNyQixNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQVMsRUFBRTtRQUM3RCxNQUFNLE9BQU8sR0FBbUI7WUFDL0IsSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsRUFBRTtZQUNSLE9BQU8sRUFBRSxJQUFJO1NBQ2IsQ0FBQztRQUNGLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzFELDRCQUE0QixFQUFFLENBQUM7UUFDL0IsdURBQXVEO1FBQ3ZELFdBQVcsRUFBRSxDQUFDO1FBQ2Qsb0JBQW9CLEVBQUUsQ0FBQztJQUN4QixDQUFDLENBQUEsQ0FBQyxDQUNGO1NBQ0EsU0FBUyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FDckIsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFTLEVBQUU7UUFDOUQsTUFBTSxPQUFPLEdBQW1CO1lBQy9CLElBQUksRUFBRSxTQUFTO1lBQ2YsSUFBSSxFQUFFLEVBQUU7WUFDUixPQUFPLEVBQUUsSUFBSTtTQUNiLENBQUM7UUFDRixVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMxRCw0QkFBNEIsRUFBRSxDQUFDO1FBQy9CLHVEQUF1RDtRQUN2RCxXQUFXLEVBQUUsQ0FBQztRQUNkLG9CQUFvQixFQUFFLENBQUM7SUFDeEIsQ0FBQyxDQUFBLENBQUMsQ0FDRixDQUFDO0lBRUgsdUNBQXVDO0lBRXZDLElBQUksT0FBTyxDQUFDLFdBQVcsQ0FBQztTQUN0QixPQUFPLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUM7U0FDaEMsT0FBTyxDQUFDLENBQUMsQ0FBQyx3REFBd0QsQ0FBQyxDQUFDO1NBQ3BFLFNBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQ3JCLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRTtRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pCLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7UUFFekMsc0JBQXNCO1FBQ3RCLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDZixXQUFXLEVBQUUsQ0FBQztZQUNkLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDMUIsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUNwQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDVCxDQUFDLENBQUMsQ0FDRixDQUFDO0lBRUgsb0JBQW9CO0lBQ3BCLE1BQU0sY0FBYyxHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQUM7UUFDNUMsR0FBRyxFQUFFLG1CQUFtQjtLQUN4QixDQUFDLENBQUM7SUFFSCw0RUFBNEU7SUFDNUUsTUFBTSw0QkFBNEIsR0FBRyxRQUFRLENBQzVDLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxFQUN0QyxHQUFHLEVBQ0gsSUFBSSxDQUNKLENBQUM7SUFFRixtRUFBbUU7SUFDbkUsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQ3BDLEdBQUcsRUFBRSxDQUFDLFdBQVcsRUFBRSxFQUNuQixHQUFHLEVBQ0gsSUFBSSxDQUNKLENBQUM7SUFFRixNQUFNLFdBQVcsR0FBRyxHQUFHLEVBQUU7UUFDeEIsSUFBSTtZQUNILDJEQUEyRDtZQUMzRCxNQUFNLEtBQUssR0FBRztnQkFDYixVQUFVLEVBQUUsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQzdELENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUNoQixDQUFDLE1BQU07Z0JBQ1IsU0FBUyxFQUFFLENBQUM7Z0JBQ1osY0FBYyxFQUFFLENBQUM7Z0JBQ2pCLGFBQWEsRUFBRSxDQUFDO2FBQ2hCLENBQUM7WUFFRix5QkFBeUI7WUFDekIsY0FBYyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBRXZCLG9CQUFvQjtZQUNwQixNQUFNLGVBQWUsR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFDO2dCQUNoRCxHQUFHLEVBQUUsa0JBQWtCO2FBQ3ZCLENBQUMsQ0FBQztZQUNILGVBQWUsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFO2dCQUNoQyxHQUFHLEVBQUUsWUFBWTtnQkFDakIsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxHQUFHO2FBQzdCLENBQUMsQ0FBQztZQUNILGVBQWUsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFO2dCQUNoQyxHQUFHLEVBQUUsWUFBWTtnQkFDakIsSUFBSSxFQUFFLEtBQUssQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFO2FBQ2pDLENBQUMsQ0FBQztZQUVILGtCQUFrQjtZQUNsQixNQUFNLGFBQWEsR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFDO2dCQUM5QyxHQUFHLEVBQUUsa0JBQWtCO2FBQ3ZCLENBQUMsQ0FBQztZQUNILGFBQWEsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFO2dCQUM5QixHQUFHLEVBQUUsWUFBWTtnQkFDakIsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLFlBQVksQ0FBQyxHQUFHO2FBQzNCLENBQUMsQ0FBQztZQUNILGFBQWEsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFO2dCQUM5QixHQUFHLEVBQUUsWUFBWTtnQkFDakIsSUFBSSxFQUFFLEtBQUssQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFO2FBQ2hDLENBQUMsQ0FBQztZQUVILGNBQWM7WUFDZCxNQUFNLFVBQVUsR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFDO2dCQUMzQyxHQUFHLEVBQUUsa0JBQWtCO2FBQ3ZCLENBQUMsQ0FBQztZQUNILFVBQVUsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFO2dCQUMzQixHQUFHLEVBQUUsWUFBWTtnQkFDakIsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHO2FBQ3ZCLENBQUMsQ0FBQztZQUNILFVBQVUsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFO2dCQUMzQixHQUFHLEVBQUUsWUFBWTtnQkFDakIsSUFBSSxFQUFFLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxPQUFPO29CQUNsRCxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztvQkFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQzthQUNoQixDQUFDLENBQUM7U0FDSDtRQUFDLE9BQU8sS0FBSyxFQUFFO1lBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxtQ0FBbUMsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUMxRCxjQUFjLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDdkIsTUFBTSxTQUFTLEdBQUcsY0FBYyxDQUFDLFNBQVMsQ0FBQztnQkFDMUMsR0FBRyxFQUFFLHdCQUF3QjthQUM3QixDQUFDLENBQUM7WUFDSCxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRTtnQkFDMUIsR0FBRyxFQUFFLFlBQVk7Z0JBQ2pCLElBQUksRUFBRSxDQUFDLENBQUMsMEJBQTBCLENBQUM7YUFDbkMsQ0FBQyxDQUFDO1NBQ0g7SUFDRixDQUFDLENBQUM7SUFFRixpQkFBaUI7SUFDakIsV0FBVyxFQUFFLENBQUM7SUFDZCxXQUFXLEVBQUUsQ0FBQztJQUVkLDRCQUE0QjtJQUM1QixNQUFNLGFBQWEsR0FBRyxXQUFXLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBRXJELDhDQUE4QztJQUM5QyxNQUFNLFFBQVEsR0FBRyxJQUFJLGdCQUFnQixDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUU7UUFDbkQsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQzlCLFFBQVEsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7O2dCQUN0QyxJQUNDLElBQUksS0FBSyxXQUFXO3FCQUNwQixNQUFDLElBQWdCLGFBQWhCLElBQUksdUJBQUosSUFBSSxDQUFjLFFBQVEscURBQUcsV0FBVyxDQUFDLENBQUEsRUFDekM7b0JBQ0QsYUFBYSxDQUFDLGFBQWEsQ0FBQyxDQUFDO29CQUM3QixRQUFRLENBQUMsVUFBVSxFQUFFLENBQUM7aUJBQ3RCO1lBQ0YsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxXQUFXLENBQUMsVUFBVSxFQUFFO1FBQzNCLFFBQVEsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRTtZQUN4QyxTQUFTLEVBQUUsSUFBSTtZQUNmLE9BQU8sRUFBRSxJQUFJO1NBQ2IsQ0FBQyxDQUFDO0tBQ0g7QUFDRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU2V0dGluZywgTm90aWNlLCBzZXRJY29uLCBEcm9wZG93bkNvbXBvbmVudCwgZGVib3VuY2UgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgVGFza1Byb2dyZXNzQmFyU2V0dGluZ1RhYiB9IGZyb20gXCJAL3NldHRpbmdcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHsgRmlsdGVyTW9kZSwgRmlsZUZpbHRlclJ1bGUgfSBmcm9tIFwiQC9jb21tb24vc2V0dGluZy1kZWZpbml0aW9uXCI7XHJcbmltcG9ydCB7XHJcblx0Rm9sZGVyU3VnZ2VzdCxcclxuXHRTaW1wbGVGaWxlU3VnZ2VzdCBhcyBGaWxlU3VnZ2VzdCxcclxufSBmcm9tIFwiQC9jb21wb25lbnRzL3VpL2lucHV0cy9BdXRvQ29tcGxldGVcIjtcclxuaW1wb3J0IFwiQC9zdHlsZXMvZmlsZS1maWx0ZXItc2V0dGluZ3MuY3NzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyRmlsZUZpbHRlclNldHRpbmdzVGFiKFxyXG5cdHNldHRpbmdUYWI6IFRhc2tQcm9ncmVzc0JhclNldHRpbmdUYWIsXHJcblx0Y29udGFpbmVyRWw6IEhUTUxFbGVtZW50XHJcbikge1xyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKHQoXCJGaWxlIEZpbHRlclwiKSkuc2V0SGVhZGluZygpO1xyXG5cclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJFbmFibGUgRmlsZSBGaWx0ZXJcIikpXHJcblx0XHQuc2V0RGVzYyhcclxuXHRcdFx0dChcclxuXHRcdFx0XHRcIlRvZ2dsZSB0aGlzIHRvIGVuYWJsZSBmaWxlIGFuZCBmb2xkZXIgZmlsdGVyaW5nIGR1cmluZyB0YXNrIGluZGV4aW5nLiBUaGlzIGNhbiBzaWduaWZpY2FudGx5IGltcHJvdmUgcGVyZm9ybWFuY2UgZm9yIGxhcmdlIHZhdWx0cy5cIlxyXG5cdFx0XHQpXHJcblx0XHQpXHJcblx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+XHJcblx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdC5zZXRWYWx1ZShzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5maWxlRmlsdGVyLmVuYWJsZWQpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZmlsZUZpbHRlci5lbmFibGVkID0gdmFsdWU7XHJcblx0XHRcdFx0XHQvLyBBcHBseSBzZXR0aW5ncyB2aWEgb3JjaGVzdHJhdG9yIChpbmNyZW1lbnRhbCkgdG8gYXZvaWQgZnVsbCByZWJ1aWxkc1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHQvLyBSZWZyZXNoIHRoZSBzZXR0aW5ncyBkaXNwbGF5IGltbWVkaWF0ZWx5IHRvIHNob3cvaGlkZSByZWxldmFudCBvcHRpb25zXHJcblx0XHRcdFx0XHRjb250YWluZXJFbC5lbXB0eSgpO1xyXG5cdFx0XHRcdFx0cmVuZGVyRmlsZUZpbHRlclNldHRpbmdzVGFiKHNldHRpbmdUYWIsIGNvbnRhaW5lckVsKTtcclxuXHRcdFx0XHR9KVxyXG5cdFx0KTtcclxuXHJcblx0aWYgKCFzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5maWxlRmlsdGVyLmVuYWJsZWQpIHJldHVybjtcclxuXHJcblx0Ly8gRmlsdGVyIG1vZGUgc2VsZWN0aW9uXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiRmlsZSBGaWx0ZXIgTW9kZVwiKSlcclxuXHRcdC5zZXREZXNjKFxyXG5cdFx0XHR0KFxyXG5cdFx0XHRcdFwiQ2hvb3NlIHdoZXRoZXIgdG8gaW5jbHVkZSBvbmx5IHNwZWNpZmllZCBmaWxlcy9mb2xkZXJzICh3aGl0ZWxpc3QpIG9yIGV4Y2x1ZGUgdGhlbSAoYmxhY2tsaXN0KVwiXHJcblx0XHRcdClcclxuXHRcdClcclxuXHRcdC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+XHJcblx0XHRcdGRyb3Bkb3duXHJcblx0XHRcdFx0LmFkZE9wdGlvbihGaWx0ZXJNb2RlLldISVRFTElTVCwgdChcIldoaXRlbGlzdCAoSW5jbHVkZSBvbmx5KVwiKSlcclxuXHRcdFx0XHQuYWRkT3B0aW9uKEZpbHRlck1vZGUuQkxBQ0tMSVNULCB0KFwiQmxhY2tsaXN0IChFeGNsdWRlKVwiKSlcclxuXHRcdFx0XHQuc2V0VmFsdWUoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZmlsZUZpbHRlci5tb2RlKVxyXG5cdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWU6IEZpbHRlck1vZGUpID0+IHtcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmZpbGVGaWx0ZXIubW9kZSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0ZGVib3VuY2VkQXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0Ly8gRmlsZSBmaWx0ZXIgY29uZmlndXJhdGlvbiBpcyBub3cgaGFuZGxlZCBieSBkYXRhZmxvd1xyXG5cdFx0XHRcdFx0ZGVib3VuY2VkVXBkYXRlU3RhdHMoKTtcclxuXHRcdFx0XHR9KVxyXG5cdFx0KTtcclxuXHJcblx0Ly8gRmlsdGVyIHNjb3BlIHNlbGVjdGlvbiBoYXMgYmVlbiBkZXByZWNhdGVkOyB1c2UgcGVyLXJ1bGUgc2NvcGUgaW5zdGVhZFxyXG5cdC8vIFRoaXMgYmxvY2sgaW50ZW50aW9uYWxseSBsZWZ0IGFzIGEgbm8tb3AgdG8gbWFpbnRhaW4gbGF5b3V0IHNwYWNpbmcuXHJcblxyXG5cdC8vIEZpbHRlciBydWxlcyBzZWN0aW9uXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiRmlsZSBGaWx0ZXIgUnVsZXNcIikpXHJcblx0XHQuc2V0RGVzYyhcclxuXHRcdFx0dChcclxuXHRcdFx0XHRcIkNvbmZpZ3VyZSB3aGljaCBmaWxlcyBhbmQgZm9sZGVycyB0byBpbmNsdWRlIG9yIGV4Y2x1ZGUgZnJvbSB0YXNrIGluZGV4aW5nXCJcclxuXHRcdFx0KVxyXG5cdFx0KTtcclxuXHJcblx0Ly8gQ29udGFpbmVyIGZvciBmaWx0ZXIgcnVsZXNcclxuXHRjb25zdCBydWxlc0NvbnRhaW5lciA9IGNvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRjbHM6IFwiZmlsZS1maWx0ZXItcnVsZXMtY29udGFpbmVyXCIsXHJcblx0fSk7XHJcblxyXG5cdC8vIEZ1bmN0aW9uIHRvIHJlbmRlciBhbGwgcnVsZXNcclxuXHRjb25zdCByZW5kZXJSdWxlcyA9ICgpID0+IHtcclxuXHRcdHJ1bGVzQ29udGFpbmVyLmVtcHR5KCk7XHJcblxyXG5cdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZmlsZUZpbHRlci5ydWxlcy5mb3JFYWNoKChydWxlLCBpbmRleCkgPT4ge1xyXG5cdFx0XHRjb25zdCBydWxlQ29udGFpbmVyID0gcnVsZXNDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwiZmlsZS1maWx0ZXItcnVsZVwiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIFJ1bGUgdHlwZSBkcm9wZG93blxyXG5cdFx0XHRjb25zdCB0eXBlQ29udGFpbmVyID0gcnVsZUNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJmaWxlLWZpbHRlci1ydWxlLXR5cGVcIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdHR5cGVDb250YWluZXIuY3JlYXRlRWwoXCJsYWJlbFwiLCB7IHRleHQ6IHQoXCJUeXBlOlwiKSB9KTtcclxuXHJcblx0XHRcdG5ldyBEcm9wZG93bkNvbXBvbmVudCh0eXBlQ29udGFpbmVyKVxyXG5cdFx0XHRcdC5hZGRPcHRpb24oXCJmaWxlXCIsIHQoXCJGaWxlXCIpKVxyXG5cdFx0XHRcdC5hZGRPcHRpb24oXCJmb2xkZXJcIiwgdChcIkZvbGRlclwiKSlcclxuXHRcdFx0XHQuYWRkT3B0aW9uKFwicGF0dGVyblwiLCB0KFwiUGF0dGVyblwiKSlcclxuXHRcdFx0XHQuc2V0VmFsdWUocnVsZS50eXBlKVxyXG5cdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWU6IFwiZmlsZVwiIHwgXCJmb2xkZXJcIiB8IFwicGF0dGVyblwiKSA9PiB7XHJcblx0XHRcdFx0XHRydWxlLnR5cGUgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdGRlYm91bmNlZEFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdC8vIEZpbGUgZmlsdGVyIGNvbmZpZ3VyYXRpb24gaXMgbm93IGhhbmRsZWQgYnkgZGF0YWZsb3dcclxuXHRcdFx0XHRcdGRlYm91bmNlZFVwZGF0ZVN0YXRzKCk7XHJcblx0XHRcdFx0XHQvLyBSZS1yZW5kZXIgcnVsZXMgdG8gdXBkYXRlIHN1Z2dlc3QgY29tcG9uZW50c1xyXG5cdFx0XHRcdFx0cmVuZGVyUnVsZXMoKTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIFJ1bGUgc2NvcGUgZHJvcGRvd24gKHBlci1ydWxlKVxyXG5cdFx0XHRjb25zdCBzY29wZUNvbnRhaW5lciA9IHJ1bGVDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwiZmlsZS1maWx0ZXItcnVsZS1zY29wZVwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0c2NvcGVDb250YWluZXIuY3JlYXRlRWwoXCJsYWJlbFwiLCB7IHRleHQ6IHQoXCJTY29wZTpcIikgfSk7XHJcblx0XHRcdG5ldyBEcm9wZG93bkNvbXBvbmVudChzY29wZUNvbnRhaW5lcilcclxuXHRcdFx0XHQuYWRkT3B0aW9uKFwiYm90aFwiLCB0KFwiQm90aFwiKSlcclxuXHRcdFx0XHQuYWRkT3B0aW9uKFwiaW5saW5lXCIsIHQoXCJJbmxpbmVcIikpXHJcblx0XHRcdFx0LmFkZE9wdGlvbihcImZpbGVcIiwgdChcIkZpbGVcIikpXHJcblx0XHRcdFx0LnNldFZhbHVlKChydWxlIGFzIGFueSkuc2NvcGUgfHwgXCJib3RoXCIpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZTogXCJib3RoXCIgfCBcImlubGluZVwiIHwgXCJmaWxlXCIpID0+IHtcclxuXHRcdFx0XHRcdChydWxlIGFzIGFueSkuc2NvcGUgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdGRlYm91bmNlZEFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdGRlYm91bmNlZFVwZGF0ZVN0YXRzKCk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBQYXRoIGlucHV0XHJcblx0XHRcdGNvbnN0IHBhdGhDb250YWluZXIgPSBydWxlQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcImZpbGUtZmlsdGVyLXJ1bGUtcGF0aFwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0cGF0aENvbnRhaW5lci5jcmVhdGVFbChcImxhYmVsXCIsIHsgdGV4dDogdChcIlBhdGg6XCIpIH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgcGF0aElucHV0ID0gcGF0aENvbnRhaW5lci5jcmVhdGVFbChcImlucHV0XCIsIHtcclxuXHRcdFx0XHR0eXBlOiBcInRleHRcIixcclxuXHRcdFx0XHR2YWx1ZTogcnVsZS5wYXRoLFxyXG5cdFx0XHRcdHBsYWNlaG9sZGVyOlxyXG5cdFx0XHRcdFx0cnVsZS50eXBlID09PSBcInBhdHRlcm5cIlxyXG5cdFx0XHRcdFx0XHQ/IFwiKi50bXAsIHRlbXAvKlwiXHJcblx0XHRcdFx0XHRcdDogcnVsZS50eXBlID09PSBcImZvbGRlclwiXHJcblx0XHRcdFx0XHRcdD8gXCJwYXRoL3RvL2ZvbGRlclwiXHJcblx0XHRcdFx0XHRcdDogXCJwYXRoL3RvL2ZpbGUubWRcIixcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBBZGQgYXBwcm9wcmlhdGUgc3VnZ2VzdCBiYXNlZCBvbiBydWxlIHR5cGVcclxuXHRcdFx0aWYgKHJ1bGUudHlwZSA9PT0gXCJmb2xkZXJcIikge1xyXG5cdFx0XHRcdG5ldyBGb2xkZXJTdWdnZXN0KFxyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHAsXHJcblx0XHRcdFx0XHRwYXRoSW5wdXQsXHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbixcclxuXHRcdFx0XHRcdFwic2luZ2xlXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9IGVsc2UgaWYgKHJ1bGUudHlwZSA9PT0gXCJmaWxlXCIpIHtcclxuXHRcdFx0XHRuZXcgRmlsZVN1Z2dlc3QocGF0aElucHV0LCBzZXR0aW5nVGFiLnBsdWdpbiwgKGZpbGUpID0+IHtcclxuXHRcdFx0XHRcdHJ1bGUucGF0aCA9IGZpbGUucGF0aDtcclxuXHRcdFx0XHRcdHBhdGhJbnB1dC52YWx1ZSA9IGZpbGUucGF0aDtcclxuXHRcdFx0XHRcdGRlYm91bmNlZEFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdC8vIEZpbGUgZmlsdGVyIGNvbmZpZ3VyYXRpb24gaXMgbm93IGhhbmRsZWQgYnkgZGF0YWZsb3dcclxuXHRcdFx0XHRcdGRlYm91bmNlZFVwZGF0ZVN0YXRzKCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHBhdGhJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiaW5wdXRcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRcdHJ1bGUucGF0aCA9IHBhdGhJbnB1dC52YWx1ZTtcclxuXHRcdFx0XHRkZWJvdW5jZWRBcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0Ly8gRmlsZSBmaWx0ZXIgY29uZmlndXJhdGlvbiBpcyBub3cgaGFuZGxlZCBieSBkYXRhZmxvd1xyXG5cdFx0XHRcdGRlYm91bmNlZFVwZGF0ZVN0YXRzKCk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gRW5hYmxlZCB0b2dnbGVcclxuXHRcdFx0Y29uc3QgZW5hYmxlZENvbnRhaW5lciA9IHJ1bGVDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwiZmlsZS1maWx0ZXItcnVsZS1lbmFibGVkXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRlbmFibGVkQ29udGFpbmVyLmNyZWF0ZUVsKFwibGFiZWxcIiwgeyB0ZXh0OiB0KFwiRW5hYmxlZDpcIikgfSk7XHJcblxyXG5cdFx0XHRjb25zdCBlbmFibGVkQ2hlY2tib3ggPSBlbmFibGVkQ29udGFpbmVyLmNyZWF0ZUVsKFwiaW5wdXRcIiwge1xyXG5cdFx0XHRcdHR5cGU6IFwiY2hlY2tib3hcIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdGVuYWJsZWRDaGVja2JveC5jaGVja2VkID0gcnVsZS5lbmFibGVkO1xyXG5cclxuXHRcdFx0ZW5hYmxlZENoZWNrYm94LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRcdHJ1bGUuZW5hYmxlZCA9IGVuYWJsZWRDaGVja2JveC5jaGVja2VkO1xyXG5cdFx0XHRcdGRlYm91bmNlZEFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHQvLyBGaWxlIGZpbHRlciBjb25maWd1cmF0aW9uIGlzIG5vdyBoYW5kbGVkIGJ5IGRhdGFmbG93XHJcblx0XHRcdFx0ZGVib3VuY2VkVXBkYXRlU3RhdHMoKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBEZWxldGUgYnV0dG9uXHJcblx0XHRcdGNvbnN0IGRlbGV0ZUJ1dHRvbiA9IHJ1bGVDb250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHRcdGNsczogXCJmaWxlLWZpbHRlci1ydWxlLWRlbGV0ZSBtb2QtZGVzdHJ1Y3RpdmVcIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdHNldEljb24oZGVsZXRlQnV0dG9uLCBcInRyYXNoXCIpO1xyXG5cdFx0XHRkZWxldGVCdXR0b24udGl0bGUgPSB0KFwiRGVsZXRlIHJ1bGVcIik7XHJcblxyXG5cdFx0XHRkZWxldGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5maWxlRmlsdGVyLnJ1bGVzLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdFx0ZGVib3VuY2VkQXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdC8vIEZpbGUgZmlsdGVyIGNvbmZpZ3VyYXRpb24gaXMgbm93IGhhbmRsZWQgYnkgZGF0YWZsb3dcclxuXHRcdFx0XHRyZW5kZXJSdWxlcygpO1xyXG5cdFx0XHRcdGRlYm91bmNlZFVwZGF0ZVN0YXRzKCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fTtcclxuXHJcblx0Ly8gQWRkIHJ1bGUgYnV0dG9uXHJcblx0Y29uc3QgYWRkUnVsZUNvbnRhaW5lciA9IGNvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRjbHM6IFwiZmlsZS1maWx0ZXItYWRkLXJ1bGVcIixcclxuXHR9KTtcclxuXHJcblx0bmV3IFNldHRpbmcoYWRkUnVsZUNvbnRhaW5lcilcclxuXHRcdC5zZXROYW1lKHQoXCJBZGQgRmlsdGVyIFJ1bGVcIikpXHJcblx0XHQuYWRkQnV0dG9uKChidXR0b24pID0+XHJcblx0XHRcdGJ1dHRvbi5zZXRCdXR0b25UZXh0KHQoXCJBZGQgRmlsZSBSdWxlXCIpKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcclxuXHRcdFx0XHRjb25zdCBuZXdSdWxlOiBGaWxlRmlsdGVyUnVsZSA9IHtcclxuXHRcdFx0XHRcdHR5cGU6IFwiZmlsZVwiLFxyXG5cdFx0XHRcdFx0cGF0aDogXCJcIixcclxuXHRcdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5maWxlRmlsdGVyLnJ1bGVzLnB1c2gobmV3UnVsZSk7XHJcblx0XHRcdFx0ZGVib3VuY2VkQXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdC8vIEZpbGUgZmlsdGVyIGNvbmZpZ3VyYXRpb24gaXMgbm93IGhhbmRsZWQgYnkgZGF0YWZsb3dcclxuXHRcdFx0XHRyZW5kZXJSdWxlcygpO1xyXG5cdFx0XHRcdGRlYm91bmNlZFVwZGF0ZVN0YXRzKCk7XHJcblx0XHRcdH0pXHJcblx0XHQpXHJcblx0XHQuYWRkQnV0dG9uKChidXR0b24pID0+XHJcblx0XHRcdGJ1dHRvbi5zZXRCdXR0b25UZXh0KHQoXCJBZGQgRm9sZGVyIFJ1bGVcIikpLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IG5ld1J1bGU6IEZpbGVGaWx0ZXJSdWxlID0ge1xyXG5cdFx0XHRcdFx0dHlwZTogXCJmb2xkZXJcIixcclxuXHRcdFx0XHRcdHBhdGg6IFwiXCIsXHJcblx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZmlsZUZpbHRlci5ydWxlcy5wdXNoKG5ld1J1bGUpO1xyXG5cdFx0XHRcdGRlYm91bmNlZEFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHQvLyBGaWxlIGZpbHRlciBjb25maWd1cmF0aW9uIGlzIG5vdyBoYW5kbGVkIGJ5IGRhdGFmbG93XHJcblx0XHRcdFx0cmVuZGVyUnVsZXMoKTtcclxuXHRcdFx0XHRkZWJvdW5jZWRVcGRhdGVTdGF0cygpO1xyXG5cdFx0XHR9KVxyXG5cdFx0KVxyXG5cdFx0LmFkZEJ1dHRvbigoYnV0dG9uKSA9PlxyXG5cdFx0XHRidXR0b24uc2V0QnV0dG9uVGV4dCh0KFwiQWRkIFBhdHRlcm4gUnVsZVwiKSkub25DbGljayhhc3luYyAoKSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgbmV3UnVsZTogRmlsZUZpbHRlclJ1bGUgPSB7XHJcblx0XHRcdFx0XHR0eXBlOiBcInBhdHRlcm5cIixcclxuXHRcdFx0XHRcdHBhdGg6IFwiXCIsXHJcblx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZmlsZUZpbHRlci5ydWxlcy5wdXNoKG5ld1J1bGUpO1xyXG5cdFx0XHRcdGRlYm91bmNlZEFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHQvLyBGaWxlIGZpbHRlciBjb25maWd1cmF0aW9uIGlzIG5vdyBoYW5kbGVkIGJ5IGRhdGFmbG93XHJcblx0XHRcdFx0cmVuZGVyUnVsZXMoKTtcclxuXHRcdFx0XHRkZWJvdW5jZWRVcGRhdGVTdGF0cygpO1xyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHJcblx0Ly8gTWFudWFsIHJlZnJlc2ggYnV0dG9uIGZvciBzdGF0aXN0aWNzXHJcblxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIlJlZnJlc2ggU3RhdGlzdGljc1wiKSlcclxuXHRcdC5zZXREZXNjKHQoXCJNYW51YWxseSByZWZyZXNoIGZpbHRlciBzdGF0aXN0aWNzIHRvIHNlZSBjdXJyZW50IGRhdGFcIikpXHJcblx0XHQuYWRkQnV0dG9uKChidXR0b24pID0+XHJcblx0XHRcdGJ1dHRvbi5zZXRCdXR0b25UZXh0KHQoXCJSZWZyZXNoXCIpKS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRidXR0b24uc2V0RGlzYWJsZWQodHJ1ZSk7XHJcblx0XHRcdFx0YnV0dG9uLnNldEJ1dHRvblRleHQodChcIlJlZnJlc2hpbmcuLi5cIikpO1xyXG5cclxuXHRcdFx0XHQvLyBBZGQgdmlzdWFsIGZlZWRiYWNrXHJcblx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0XHR1cGRhdGVTdGF0cygpO1xyXG5cdFx0XHRcdFx0YnV0dG9uLnNldERpc2FibGVkKGZhbHNlKTtcclxuXHRcdFx0XHRcdGJ1dHRvbi5zZXRCdXR0b25UZXh0KHQoXCJSZWZyZXNoXCIpKTtcclxuXHRcdFx0XHR9LCAxMDApO1xyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHJcblx0Ly8gRmlsdGVyIHN0YXRpc3RpY3NcclxuXHRjb25zdCBzdGF0c0NvbnRhaW5lciA9IGNvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRjbHM6IFwiZmlsZS1maWx0ZXItc3RhdHNcIixcclxuXHR9KTtcclxuXHJcblx0Ly8gRGVib3VuY2VkIGFwcGx5IG9mIHNldHRpbmdzIHVwZGF0ZSB0byBhdm9pZCBoZWF2eSByZWJ1aWxkcyBvbiByYXBpZCBlZGl0c1xyXG5cdGNvbnN0IGRlYm91bmNlZEFwcGx5U2V0dGluZ3NVcGRhdGUgPSBkZWJvdW5jZShcclxuXHRcdCgpID0+IHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpLFxyXG5cdFx0MzAwLFxyXG5cdFx0dHJ1ZVxyXG5cdCk7XHJcblxyXG5cdC8vIENyZWF0ZSBkZWJvdW5jZWQgdmVyc2lvbiBvZiB1cGRhdGVTdGF0cyB0byBhdm9pZCBleGNlc3NpdmUgY2FsbHNcclxuXHRjb25zdCBkZWJvdW5jZWRVcGRhdGVTdGF0cyA9IGRlYm91bmNlKFxyXG5cdFx0KCkgPT4gdXBkYXRlU3RhdHMoKSxcclxuXHRcdDIwMCxcclxuXHRcdHRydWVcclxuXHQpO1xyXG5cclxuXHRjb25zdCB1cGRhdGVTdGF0cyA9ICgpID0+IHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdC8vIFRPRE86IEdldCBmaWxlIGZpbHRlciBzdGF0cyBmcm9tIGRhdGFmbG93IHdoZW4gYXZhaWxhYmxlXHJcblx0XHRcdGNvbnN0IHN0YXRzID0ge1xyXG5cdFx0XHRcdHJ1bGVzQ291bnQ6IHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmZpbGVGaWx0ZXIucnVsZXMuZmlsdGVyKFxyXG5cdFx0XHRcdFx0KHIpID0+IHIuZW5hYmxlZFxyXG5cdFx0XHRcdCkubGVuZ3RoLFxyXG5cdFx0XHRcdGNhY2hlU2l6ZTogMCxcclxuXHRcdFx0XHRwcm9jZXNzZWRGaWxlczogMCxcclxuXHRcdFx0XHRmaWx0ZXJlZEZpbGVzOiAwLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gQ2xlYXIgZXhpc3RpbmcgY29udGVudFxyXG5cdFx0XHRzdGF0c0NvbnRhaW5lci5lbXB0eSgpO1xyXG5cclxuXHRcdFx0Ly8gQWN0aXZlIFJ1bGVzIHN0YXRcclxuXHRcdFx0Y29uc3QgYWN0aXZlUnVsZXNTdGF0ID0gc3RhdHNDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwiZmlsZS1maWx0ZXItc3RhdFwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0YWN0aXZlUnVsZXNTdGF0LmNyZWF0ZUVsKFwic3BhblwiLCB7XHJcblx0XHRcdFx0Y2xzOiBcInN0YXQtbGFiZWxcIixcclxuXHRcdFx0XHR0ZXh0OiBgJHt0KFwiQWN0aXZlIFJ1bGVzXCIpfTpgLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0YWN0aXZlUnVsZXNTdGF0LmNyZWF0ZUVsKFwic3BhblwiLCB7XHJcblx0XHRcdFx0Y2xzOiBcInN0YXQtdmFsdWVcIixcclxuXHRcdFx0XHR0ZXh0OiBzdGF0cy5ydWxlc0NvdW50LnRvU3RyaW5nKCksXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQ2FjaGUgU2l6ZSBzdGF0XHJcblx0XHRcdGNvbnN0IGNhY2hlU2l6ZVN0YXQgPSBzdGF0c0NvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJmaWxlLWZpbHRlci1zdGF0XCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRjYWNoZVNpemVTdGF0LmNyZWF0ZUVsKFwic3BhblwiLCB7XHJcblx0XHRcdFx0Y2xzOiBcInN0YXQtbGFiZWxcIixcclxuXHRcdFx0XHR0ZXh0OiBgJHt0KFwiQ2FjaGUgU2l6ZVwiKX06YCxcclxuXHRcdFx0fSk7XHJcblx0XHRcdGNhY2hlU2l6ZVN0YXQuY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdFx0XHRjbHM6IFwic3RhdC12YWx1ZVwiLFxyXG5cdFx0XHRcdHRleHQ6IHN0YXRzLmNhY2hlU2l6ZS50b1N0cmluZygpLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIFN0YXR1cyBzdGF0XHJcblx0XHRcdGNvbnN0IHN0YXR1c1N0YXQgPSBzdGF0c0NvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJmaWxlLWZpbHRlci1zdGF0XCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRzdGF0dXNTdGF0LmNyZWF0ZUVsKFwic3BhblwiLCB7XHJcblx0XHRcdFx0Y2xzOiBcInN0YXQtbGFiZWxcIixcclxuXHRcdFx0XHR0ZXh0OiBgJHt0KFwiU3RhdHVzXCIpfTpgLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0c3RhdHVzU3RhdC5jcmVhdGVFbChcInNwYW5cIiwge1xyXG5cdFx0XHRcdGNsczogXCJzdGF0LXZhbHVlXCIsXHJcblx0XHRcdFx0dGV4dDogc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZmlsZUZpbHRlci5lbmFibGVkXHJcblx0XHRcdFx0XHQ/IHQoXCJFbmFibGVkXCIpXHJcblx0XHRcdFx0XHQ6IHQoXCJEaXNhYmxlZFwiKSxcclxuXHRcdFx0fSk7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRXJyb3IgdXBkYXRpbmcgZmlsdGVyIHN0YXRpc3RpY3M6XCIsIGVycm9yKTtcclxuXHRcdFx0c3RhdHNDb250YWluZXIuZW1wdHkoKTtcclxuXHRcdFx0Y29uc3QgZXJyb3JTdGF0ID0gc3RhdHNDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwiZmlsZS1maWx0ZXItc3RhdCBlcnJvclwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0ZXJyb3JTdGF0LmNyZWF0ZUVsKFwic3BhblwiLCB7XHJcblx0XHRcdFx0Y2xzOiBcInN0YXQtbGFiZWxcIixcclxuXHRcdFx0XHR0ZXh0OiB0KFwiRXJyb3IgbG9hZGluZyBzdGF0aXN0aWNzXCIpLFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHQvLyBJbml0aWFsIHJlbmRlclxyXG5cdHJlbmRlclJ1bGVzKCk7XHJcblx0dXBkYXRlU3RhdHMoKTtcclxuXHJcblx0Ly8gVXBkYXRlIHN0YXRzIHBlcmlvZGljYWxseVxyXG5cdGNvbnN0IHN0YXRzSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCh1cGRhdGVTdGF0cywgNTAwMCk7XHJcblxyXG5cdC8vIENsZWFuIHVwIGludGVydmFsIHdoZW4gY29udGFpbmVyIGlzIHJlbW92ZWRcclxuXHRjb25zdCBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKChtdXRhdGlvbnMpID0+IHtcclxuXHRcdG11dGF0aW9ucy5mb3JFYWNoKChtdXRhdGlvbikgPT4ge1xyXG5cdFx0XHRtdXRhdGlvbi5yZW1vdmVkTm9kZXMuZm9yRWFjaCgobm9kZSkgPT4ge1xyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdG5vZGUgPT09IGNvbnRhaW5lckVsIHx8XHJcblx0XHRcdFx0XHQobm9kZSBhcyBFbGVtZW50KT8uY29udGFpbnM/Lihjb250YWluZXJFbClcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdGNsZWFySW50ZXJ2YWwoc3RhdHNJbnRlcnZhbCk7XHJcblx0XHRcdFx0XHRvYnNlcnZlci5kaXNjb25uZWN0KCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRpZiAoY29udGFpbmVyRWwucGFyZW50Tm9kZSkge1xyXG5cdFx0b2JzZXJ2ZXIub2JzZXJ2ZShjb250YWluZXJFbC5wYXJlbnROb2RlLCB7XHJcblx0XHRcdGNoaWxkTGlzdDogdHJ1ZSxcclxuXHRcdFx0c3VidHJlZTogdHJ1ZSxcclxuXHRcdH0pO1xyXG5cdH1cclxufVxyXG4iXX0=