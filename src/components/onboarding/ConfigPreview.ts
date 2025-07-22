import { OnboardingConfig } from "../../utils/OnboardingConfigManager";
import { t } from "../../translations/helper";
import { setIcon } from "obsidian";

export class ConfigPreview {
	/**
	 * Render configuration preview
	 */
	render(containerEl: HTMLElement, config: OnboardingConfig) {
		containerEl.empty();

		// Configuration overview
		const overviewSection = containerEl.createDiv("config-overview");
		
		const selectedModeEl = overviewSection.createDiv("selected-mode");
		selectedModeEl.createEl("h3", { text: t("Selected Mode") });
		
		const modeCard = selectedModeEl.createDiv("mode-card");
		const modeIcon = modeCard.createDiv("mode-icon");
		setIcon(modeIcon, this.getConfigIcon(config.mode));
		
		const modeContent = modeCard.createDiv("mode-content");
		modeContent.createEl("h4", { text: config.name });
		modeContent.createEl("p", { text: config.description });

		// Features that will be enabled
		const featuresSection = containerEl.createDiv("config-features");
		featuresSection.createEl("h3", { text: t("Features that will be enabled") });
		
		const featuresList = featuresSection.createEl("ul", { cls: "enabled-features-list" });
		config.features.forEach(feature => {
			const featureItem = featuresList.createEl("li");
			const checkIcon = featureItem.createSpan("feature-check");
			setIcon(checkIcon, "check");
			featureItem.createSpan("feature-text").setText(feature);
		});

		// Views that will be available
		this.renderViewsPreview(containerEl, config);

		// Settings summary
		this.renderSettingsSummary(containerEl, config);

		// Note about customization
		const customizationNote = containerEl.createDiv("customization-note");
		customizationNote.createEl("p", { 
			text: t("Don't worry! You can customize any of these settings later in the plugin settings."),
			cls: "note-text"
		});
	}

	/**
	 * Render views preview
	 */
	private renderViewsPreview(containerEl: HTMLElement, config: OnboardingConfig) {
		if (!config.settings.viewConfiguration) return;

		const viewsSection = containerEl.createDiv("config-views");
		viewsSection.createEl("h3", { text: t("Available views") });

		const viewsGrid = viewsSection.createDiv("views-grid");
		
		config.settings.viewConfiguration.forEach(view => {
			const viewItem = viewsGrid.createDiv("view-item");
			
			const viewIcon = viewItem.createDiv("view-icon");
			// Use native Obsidian icon from view.icon
			setIcon(viewIcon, view.icon || "list");
			
			const viewName = viewItem.createDiv("view-name");
			viewName.setText(view.name);
		});
	}

	/**
	 * Render settings summary
	 */
	private renderSettingsSummary(containerEl: HTMLElement, config: OnboardingConfig) {
		const settingsSection = containerEl.createDiv("config-settings");
		settingsSection.createEl("h3", { text: t("Key settings") });

		const settingsList = settingsSection.createEl("ul", { cls: "settings-summary-list" });

		// Progress bars
		if (config.settings.progressBarDisplayMode) {
			const item = settingsList.createEl("li");
			item.createSpan("setting-label").setText(t("Progress bars") + ":");
			item.createSpan("setting-value").setText(
				config.settings.progressBarDisplayMode === "both" ? 
					t("Enabled (both graphical and text)") : 
					config.settings.progressBarDisplayMode
			);
		}

		// Task status switching
		if (config.settings.enableTaskStatusSwitcher !== undefined) {
			const item = settingsList.createEl("li");
			item.createSpan("setting-label").setText(t("Task status switching") + ":");
			item.createSpan("setting-value").setText(
				config.settings.enableTaskStatusSwitcher ? t("Enabled") : t("Disabled")
			);
		}

		// Quick capture
		if (config.settings.quickCapture?.enableQuickCapture !== undefined) {
			const item = settingsList.createEl("li");
			item.createSpan("setting-label").setText(t("Quick capture") + ":");
			item.createSpan("setting-value").setText(
				config.settings.quickCapture.enableQuickCapture ? t("Enabled") : t("Disabled")
			);
		}

		// Workflow
		if (config.settings.workflow?.enableWorkflow !== undefined) {
			const item = settingsList.createEl("li");
			item.createSpan("setting-label").setText(t("Workflow management") + ":");
			item.createSpan("setting-value").setText(
				config.settings.workflow.enableWorkflow ? t("Enabled") : t("Disabled")
			);
		}

		// Rewards
		if (config.settings.rewards?.enableRewards !== undefined) {
			const item = settingsList.createEl("li");
			item.createSpan("setting-label").setText(t("Reward system") + ":");
			item.createSpan("setting-value").setText(
				config.settings.rewards.enableRewards ? t("Enabled") : t("Disabled")
			);
		}

		// Habits
		if (config.settings.habit?.enableHabits !== undefined) {
			const item = settingsList.createEl("li");
			item.createSpan("setting-label").setText(t("Habit tracking") + ":");
			item.createSpan("setting-value").setText(
				config.settings.habit.enableHabits ? t("Enabled") : t("Disabled")
			);
		}

		// Performance features
		if (config.settings.fileParsingConfig?.enableWorkerProcessing !== undefined) {
			const item = settingsList.createEl("li");
			item.createSpan("setting-label").setText(t("Performance optimization") + ":");
			item.createSpan("setting-value").setText(
				config.settings.fileParsingConfig.enableWorkerProcessing ? t("Enabled") : t("Disabled")
			);
		}
	}

	/**
	 * Get icon for configuration mode
	 */
	private getConfigIcon(mode: string): string {
		switch (mode) {
			case 'beginner':
				return "edit-3"; // Lucide edit icon
			case 'advanced':
				return "settings"; // Lucide settings icon  
			case 'power':
				return "zap"; // Lucide lightning bolt icon
			default:
				return "clipboard-list"; // Lucide clipboard icon
		}
	}

}