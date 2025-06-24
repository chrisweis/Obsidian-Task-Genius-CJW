import { Setting, Notice, setIcon, DropdownComponent } from "obsidian";
import { TaskProgressBarSettingTab } from "../../setting";
import { t } from "../../translations/helper";
import { FilterMode, FileFilterRule } from "../../common/setting-definition";
import { FolderSuggest } from "../AutoComplete";
import "../../styles/file-filter-settings.css";

export function renderFileFilterSettingsTab(
	settingTab: TaskProgressBarSettingTab,
	containerEl: HTMLElement
) {
	new Setting(containerEl).setName(t("File Filter")).setHeading();

	new Setting(containerEl)
		.setName(t("Enable File Filter"))
		.setDesc(
			t(
				"Toggle this to enable file and folder filtering during task indexing. This can significantly improve performance for large vaults."
			)
		)
		.addToggle((toggle) =>
			toggle
				.setValue(settingTab.plugin.settings.fileFilter.enabled)
				.onChange(async (value) => {
					settingTab.plugin.settings.fileFilter.enabled = value;
					await settingTab.plugin.saveSettings();

					// Update the task manager's filter configuration
					settingTab.plugin.taskManager?.updateFileFilterConfiguration();

					// Refresh the settings display to show/hide relevant options
					setTimeout(() => {
						settingTab.display();
					}, 100);
				})
		);

	if (!settingTab.plugin.settings.fileFilter.enabled) return;

	// Filter mode selection
	new Setting(containerEl)
		.setName(t("File Filter Mode"))
		.setDesc(
			t(
				"Choose whether to include only specified files/folders (whitelist) or exclude them (blacklist)"
			)
		)
		.addDropdown((dropdown) =>
			dropdown
				.addOption(FilterMode.WHITELIST, t("Whitelist (Include only)"))
				.addOption(FilterMode.BLACKLIST, t("Blacklist (Exclude)"))
				.setValue(settingTab.plugin.settings.fileFilter.mode)
				.onChange(async (value: FilterMode) => {
					settingTab.plugin.settings.fileFilter.mode = value;
					await settingTab.plugin.saveSettings();
					settingTab.plugin.taskManager?.updateFileFilterConfiguration();
				})
		);

	// Filter rules section
	new Setting(containerEl)
		.setName(t("File Filter Rules"))
		.setDesc(
			t(
				"Configure which files and folders to include or exclude from task indexing"
			)
		);

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
				.onChange(async (value: "file" | "folder" | "pattern") => {
					rule.type = value;
					await settingTab.plugin.saveSettings();
					settingTab.plugin.taskManager?.updateFileFilterConfiguration();
				});

			// Path input
			const pathContainer = ruleContainer.createDiv({
				cls: "file-filter-rule-path",
			});
			pathContainer.createEl("label", { text: t("Path:") });

			const pathInput = pathContainer.createEl("input", {
				type: "text",
				value: rule.path,
				placeholder:
					rule.type === "pattern"
						? "*.tmp, temp/*"
						: "path/to/file/or/folder",
			});

			// Add folder suggest for folder type
			if (rule.type === "folder") {
				new FolderSuggest(
					settingTab.app,
					pathInput,
					settingTab.plugin,
					"single"
				);
			}

			pathInput.addEventListener("input", async () => {
				rule.path = pathInput.value;
				await settingTab.plugin.saveSettings();
				settingTab.plugin.taskManager?.updateFileFilterConfiguration();
			});

			// Enabled toggle
			const enabledContainer = ruleContainer.createDiv({
				cls: "file-filter-rule-enabled",
			});
			enabledContainer.createEl("label", { text: t("Enabled:") });

			const enabledCheckbox = enabledContainer.createEl("input", {
				type: "checkbox",
			});
			enabledCheckbox.checked = rule.enabled;

			enabledCheckbox.addEventListener("change", async () => {
				rule.enabled = enabledCheckbox.checked;
				await settingTab.plugin.saveSettings();
				settingTab.plugin.taskManager?.updateFileFilterConfiguration();
			});

			// Delete button
			const deleteButton = ruleContainer.createEl("button", {
				cls: "file-filter-rule-delete mod-destructive",
			});
			setIcon(deleteButton, "trash");
			deleteButton.title = t("Delete rule");

			deleteButton.addEventListener("click", async () => {
				settingTab.plugin.settings.fileFilter.rules.splice(index, 1);
				await settingTab.plugin.saveSettings();
				settingTab.plugin.taskManager?.updateFileFilterConfiguration();
				renderRules();
			});
		});
	};

	// Add rule button
	const addRuleContainer = containerEl.createDiv({
		cls: "file-filter-add-rule",
	});

	new Setting(addRuleContainer)
		.setName(t("Add Filter Rule"))
		.addButton((button) =>
			button.setButtonText(t("Add File Rule")).onClick(async () => {
				const newRule: FileFilterRule = {
					type: "file",
					path: "",
					enabled: true,
				};
				settingTab.plugin.settings.fileFilter.rules.push(newRule);
				await settingTab.plugin.saveSettings();
				settingTab.plugin.taskManager?.updateFileFilterConfiguration();
				renderRules();
			})
		)
		.addButton((button) =>
			button.setButtonText(t("Add Folder Rule")).onClick(async () => {
				const newRule: FileFilterRule = {
					type: "folder",
					path: "",
					enabled: true,
				};
				settingTab.plugin.settings.fileFilter.rules.push(newRule);
				await settingTab.plugin.saveSettings();
				settingTab.plugin.taskManager?.updateFileFilterConfiguration();
				renderRules();
			})
		)
		.addButton((button) =>
			button.setButtonText(t("Add Pattern Rule")).onClick(async () => {
				const newRule: FileFilterRule = {
					type: "pattern",
					path: "",
					enabled: true,
				};
				settingTab.plugin.settings.fileFilter.rules.push(newRule);
				await settingTab.plugin.saveSettings();
				settingTab.plugin.taskManager?.updateFileFilterConfiguration();
				renderRules();
			})
		);

	// Filter statistics
	const statsContainer = containerEl.createDiv({
		cls: "file-filter-stats",
	});

	const updateStats = () => {
		const filterManager =
			settingTab.plugin.taskManager?.getFileFilterManager?.();
		if (filterManager) {
			const stats = filterManager.getStats();

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
				text: stats.enabled ? t("Enabled") : t("Disabled"),
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
				if (
					node === containerEl ||
					(node as Element)?.contains?.(containerEl)
				) {
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
