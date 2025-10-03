import { Setting, Notice, setIcon, DropdownComponent } from "obsidian";
import { t } from "@/translations/helper";
import { OnboardingController } from "../OnboardingController";
import { FilterMode, FileFilterRule } from "@/common/setting-definition";
import TaskProgressBarPlugin from "@/index";
import "@/styles/onboarding-components.css";
import "@/styles/file-filter-settings.css";

/**
 * File Filter Configuration Step
 */
export class FileFilterStep {
	/**
	 * Render the file filter configuration step
	 */
	static render(
		headerEl: HTMLElement,
		contentEl: HTMLElement,
		controller: OnboardingController,
		plugin: TaskProgressBarPlugin
	) {
		// Clear
		headerEl.empty();
		contentEl.empty();

		// Header
		headerEl.createEl("h1", { text: t("Optimize Performance") });
		headerEl.createEl("p", {
			text: t(
				"Configure file filtering to improve indexing performance and focus on relevant content"
			),
			cls: "onboarding-subtitle",
		});

		// Two-column layout
		const showcase = contentEl.createDiv({ cls: "component-showcase" });

		// Left: Configuration
		const configSection = showcase.createDiv({
			cls: "component-showcase-preview file-filter-preview",
		});

		// Right: Description and recommendations
		const descSection = showcase.createDiv({
			cls: "component-showcase-description",
		});

		// Render configuration UI
		this.renderConfiguration(configSection, plugin);

		// Render description and recommendations
		this.renderDescription(descSection, plugin);
	}

	/**
	 * Render configuration UI
	 */
	private static renderConfiguration(
		container: HTMLElement,
		plugin: TaskProgressBarPlugin
	) {
		// Enable/Disable toggle
		new Setting(container)
			.setName(t("Enable File Filter"))
			.setDesc(
				t(
					"Filter files during task indexing to improve performance"
				)
			)
			.addToggle((toggle) =>
				toggle
					.setValue(plugin.settings.fileFilter.enabled)
					.onChange(async (value) => {
						plugin.settings.fileFilter.enabled = value;
						await plugin.saveSettings();
						// Re-render to show/hide configuration
						this.render(
							container.parentElement?.previousElementSibling as HTMLElement,
							container.parentElement?.parentElement as HTMLElement,
							{} as OnboardingController,
							plugin
						);
					})
			);

		if (!plugin.settings.fileFilter.enabled) {
			return;
		}

		// Filter mode selection
		new Setting(container)
			.setName(t("Filter Mode"))
			.setDesc(
				t(
					"Whitelist: Include only specified paths | Blacklist: Exclude specified paths"
				)
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOption(FilterMode.WHITELIST, t("Whitelist (Include only)"))
					.addOption(FilterMode.BLACKLIST, t("Blacklist (Exclude)"))
					.setValue(plugin.settings.fileFilter.mode)
					.onChange(async (value: FilterMode) => {
						plugin.settings.fileFilter.mode = value;
						await plugin.saveSettings();
						this.updateStats(container, plugin);
					})
			);

		// Quick add rules section
		const quickAddContainer = container.createDiv({
			cls: "file-filter-config",
		});
		quickAddContainer.createEl("h4", { text: t("Quick Add Rules") });

		const buttonsContainer = quickAddContainer.createDiv({
			cls: "setting-item-control",
		});

		// Add folder rule button
		const addFolderBtn = buttonsContainer.createEl("button", {
			text: t("Add Folder"),
			cls: "mod-cta",
		});
		addFolderBtn.addEventListener("click", () => {
			const folderPath = prompt(t("Enter folder path:"), "");
			if (folderPath) {
				plugin.settings.fileFilter.rules.push({
					type: "folder",
					path: folderPath,
					enabled: true,
				});
				plugin.saveSettings();
				this.updateStats(container, plugin);
				new Notice(t("Folder rule added"));
			}
		});

		// Add pattern rule button
		const addPatternBtn = buttonsContainer.createEl("button", {
			text: t("Add Pattern"),
		});
		addPatternBtn.addEventListener("click", () => {
			const pattern = prompt(t("Enter file pattern (e.g., *.tmp):"), "");
			if (pattern) {
				plugin.settings.fileFilter.rules.push({
					type: "pattern",
					path: pattern,
					enabled: true,
				});
				plugin.saveSettings();
				this.updateStats(container, plugin);
				new Notice(t("Pattern rule added"));
			}
		});

		// Current rules list
		const rulesContainer = container.createDiv({
			cls: "file-filter-rules-container",
		});
		this.renderRules(rulesContainer, plugin);

		// Statistics
		const statsContainer = container.createDiv({
			cls: "file-filter-stats-preview",
		});
		this.updateStats(statsContainer, plugin);
	}

	/**
	 * Render current rules
	 */
	private static renderRules(
		container: HTMLElement,
		plugin: TaskProgressBarPlugin
	) {
		container.empty();

		if (plugin.settings.fileFilter.rules.length === 0) {
			container.createEl("p", {
				text: t("No filter rules configured yet"),
				cls: "setting-item-description",
			});
			return;
		}

		plugin.settings.fileFilter.rules.forEach((rule, index) => {
			const ruleEl = container.createDiv({ cls: "file-filter-rule" });

			// Rule type icon
			const typeIcon = ruleEl.createSpan({ cls: "file-filter-rule-type" });
			setIcon(
				typeIcon,
				rule.type === "folder"
					? "folder"
					: rule.type === "file"
					? "file"
					: "regex"
			);

			// Rule path
			ruleEl.createSpan({
				text: rule.path,
				cls: "file-filter-rule-path",
			});

			// Delete button
			const deleteBtn = ruleEl.createSpan({ cls: "clickable-icon" });
			setIcon(deleteBtn, "trash");
			deleteBtn.addEventListener("click", async () => {
				plugin.settings.fileFilter.rules.splice(index, 1);
				await plugin.saveSettings();
				this.renderRules(container, plugin);
				this.updateStats(
					container.parentElement?.querySelector(
						".file-filter-stats-preview"
					) as HTMLElement,
					plugin
				);
			});
		});
	}

	/**
	 * Update statistics display
	 */
	private static updateStats(container: HTMLElement, plugin: TaskProgressBarPlugin) {
		if (!container) return;

		container.empty();

		const activeRules = plugin.settings.fileFilter.rules.filter(
			(r) => r.enabled
		).length;

		const stats = [
			{
				label: t("Active Rules"),
				value: activeRules.toString(),
			},
			{
				label: t("Filter Mode"),
				value:
					plugin.settings.fileFilter.mode === FilterMode.WHITELIST
						? t("Whitelist")
						: t("Blacklist"),
			},
			{
				label: t("Status"),
				value: plugin.settings.fileFilter.enabled
					? t("Enabled")
					: t("Disabled"),
			},
		];

		stats.forEach((stat) => {
			const statItem = container.createDiv({ cls: "filter-stat-item" });
			statItem.createSpan({
				text: stat.value,
				cls: "filter-stat-value",
			});
			statItem.createSpan({
				text: stat.label,
				cls: "filter-stat-label",
			});
		});
	}

	/**
	 * Render description and recommendations
	 */
	private static renderDescription(
		container: HTMLElement,
		plugin: TaskProgressBarPlugin
	) {
		container.createEl("h3", { text: t("Why File Filtering?") });
		container.createEl("p", {
			text: t(
				"File filtering helps you focus on relevant content while improving performance, especially in large vaults."
			),
		});

		const benefits = container.createEl("ul", {
			cls: "component-feature-list",
		});

		[
			t("Faster task indexing in large vaults"),
			t("Exclude temporary or archive files"),
			t("Focus on specific project folders"),
			t("Reduce memory usage"),
			t("Improve search performance"),
		].forEach((benefit) => {
			benefits.createEl("li", { text: benefit });
		});

		// Recommended configurations
		const recsContainer = container.createDiv({
			cls: "recommended-configs",
		});
		recsContainer.createEl("h4", { text: t("Recommended Configurations") });

		const recommendations = [
			{
				title: t("Exclude Temporary Files"),
				description: t("Ignore system and temporary files"),
				rules: [
					{ type: "pattern" as const, path: "*.tmp" },
					{ type: "pattern" as const, path: ".DS_Store" },
					{ type: "pattern" as const, path: "*~" },
				],
			},
			{
				title: t("Exclude Archive Folder"),
				description: t("Skip archived content"),
				rules: [{ type: "folder" as const, path: "Archive" }],
			},
			{
				title: t("Focus on Projects"),
				description: t("Index only specific project folders"),
				rules: [
					{ type: "folder" as const, path: "Projects" },
					{ type: "folder" as const, path: "Work" },
				],
				mode: FilterMode.WHITELIST,
			},
		];

		recommendations.forEach((rec) => {
			const recEl = recsContainer.createDiv({
				cls: "recommended-config-item",
			});
			recEl.createEl("h4", { text: rec.title });
			recEl.createEl("p", { text: rec.description });

			recEl.addEventListener("click", async () => {
				// Apply recommended configuration
				if (rec.mode) {
					plugin.settings.fileFilter.mode = rec.mode;
				}
				rec.rules.forEach((rule) => {
					// Check if rule already exists
					const exists = plugin.settings.fileFilter.rules.some(
						(r) => r.path === rule.path && r.type === rule.type
					);
					if (!exists) {
						plugin.settings.fileFilter.rules.push({
							...rule,
							enabled: true,
						});
					}
				});
				plugin.settings.fileFilter.enabled = true;
				await plugin.saveSettings();

				new Notice(
					t("Applied recommended configuration: ") + rec.title
				);

				// Re-render configuration section
				const configSection =
					container.parentElement?.querySelector(
						".file-filter-preview"
					);
				if (configSection) {
					this.renderConfiguration(
						configSection as HTMLElement,
						plugin
					);
				}
			});
		});
	}
}
