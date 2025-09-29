import { Setting, Notice } from "obsidian";
import { TaskProgressBarSettingTab } from "@/setting";
import { t } from "@/translations/helper";

export function renderBetaTestSettingsTab(
	settingTab: TaskProgressBarSettingTab,
	containerEl: HTMLElement
) {
	new Setting(containerEl)
		.setName(t("Beta Test Features"))
		.setDesc(
			t(
				"Experimental features that are currently in testing phase. These features may be unstable and could change or be removed in future updates."
			)
		)
		.setHeading();

	// Warning banner
	const warningBanner = containerEl.createDiv({
		cls: "beta-test-warning-banner",
	});

	warningBanner.createEl("div", {
		cls: "beta-warning-icon",
		text: "⚠️",
	});

	const warningContent = warningBanner.createDiv({
		cls: "beta-warning-content",
	});

	warningContent.createEl("div", {
		cls: "beta-warning-title",
		text: t("Beta Features Warning"),
	});

	const warningText = warningContent.createEl("div", {
		cls: "beta-warning-text",
		text: t(
			"These features are experimental and may be unstable. They could change significantly or be removed in future updates due to Obsidian API changes or other factors. Please use with caution and provide feedback to help improve these features."
		),
	});

	// Base View Settings

	// V2 View Settings
	new Setting(containerEl)
		.setName(t("Task Genius Fluent Interface"))
		.setDesc(
			t(
				"Enable the experimental V2 interface with improved layout and workspace support"
			)
		)
		.addToggle((toggle) => {
			toggle
				.setValue(
					settingTab.plugin.settings.experimental?.enableV2 ?? false
				)
				.onChange(async (value) => {
					if (!settingTab.plugin.settings.experimental) {
						settingTab.plugin.settings.experimental = {
							enableV2: false,
							showV2Ribbon: false,
						};
					}
					settingTab.plugin.settings.experimental!.enableV2 = value;
					await settingTab.plugin.saveSettings();

					// Notify user
					new Notice(
						value
							? t(
									"Fluent interface enabled. Use the command 'Open Task View V2' to launch."
							  )
							: t("Fluent interface disabled.")
					);
				});
		});

	new Setting(containerEl)
		.setName(t("Show Fluent(beta) View Ribbon Icon"))
		.setDesc(t("Show a ribbon icon for quick access to Fluent interface"))
		.addToggle((toggle) => {
			toggle
				.setValue(
					settingTab.plugin.settings.experimental?.showV2Ribbon ??
						false
				)
				.onChange(async (value) => {
					if (!settingTab.plugin.settings.experimental) {
						settingTab.plugin.settings.experimental = {
							enableV2: false,
							showV2Ribbon: false,
						};
					}
					settingTab.plugin.settings.experimental!.showV2Ribbon =
						value;
					await settingTab.plugin.saveSettings();

					new Notice(
						t(
							"Please reload the plugin for ribbon icon changes to take effect."
						)
					);
				});
		});

	// V2: Use workspace side leaves for Sidebar & Details
	new Setting(containerEl)
		.setName(t("Fluent: Use Workspace Side Leaves"))
		.setDesc(
			t(
				"Use left/right workspace side leaves for Sidebar and Details. When enabled, the main V2 view won't render in-view sidebar or details."
			)
		)
		.addToggle((toggle) => {
			const current = !!((settingTab.plugin.settings.experimental as any)?.v2Config?.useWorkspaceSideLeaves ?? true);
			toggle
				.setValue(current)
				.onChange(async (value) => {
					if (!settingTab.plugin.settings.experimental) {
						settingTab.plugin.settings.experimental = {
							enableV2: false,
							showV2Ribbon: false,
						};
					}
					if (!settingTab.plugin.settings.experimental.v2Config) {
						settingTab.plugin.settings.experimental.v2Config = {
							enableWorkspaces: true,
							defaultWorkspace: "default",
							showTopNavigation: true,
							showNewSidebar: true,
							allowViewSwitching: true,
							persistViewMode: true,
						};
					}
					// Store via 'any' to avoid typing constraints for experimental backfill
					((settingTab.plugin.settings.experimental as any).v2Config).useWorkspaceSideLeaves = value;
					await settingTab.plugin.saveSettings();
					new Notice(t("Saved. Reopen the view to apply."));
				});
		});

	// V2 Sidebar Other Views overflow threshold
	new Setting(containerEl)
		.setName(t("Fluent: Max Other Views before overflow"))
		.setDesc(
			t(
				"Number of 'Other Views' to show before grouping the rest into an overflow menu (ellipsis)"
			)
		)
		.addText((text) => {
			const current =
				settingTab.plugin.settings.experimental?.v2Config
					?.maxOtherViewsBeforeOverflow ?? 5;
			text.setPlaceholder("5")
				.setValue(String(current))
				.onChange(async (value) => {
					const n = parseInt(value, 10);
					if (!isNaN(n) && n >= 1 && n <= 50) {
						if (!settingTab.plugin.settings.experimental) {
							settingTab.plugin.settings.experimental = {
								enableV2: false,
								showV2Ribbon: false,
							};
						}
						if (!settingTab.plugin.settings.experimental.v2Config) {
							settingTab.plugin.settings.experimental.v2Config = {
								enableWorkspaces: true,
								defaultWorkspace: "default",
								showTopNavigation: true,
								showNewSidebar: true,
								allowViewSwitching: true,
								persistViewMode: true,
							};
						}
						settingTab.plugin.settings.experimental.v2Config.maxOtherViewsBeforeOverflow =
							n;
						await settingTab.plugin.saveSettings();
					}
				});
		});

	// Feedback section
	new Setting(containerEl)
		.setName(t("Beta Feedback"))
		.setDesc(
			t(
				"Help improve these features by providing feedback on your experience."
			)
		)
		.setHeading();

	new Setting(containerEl)
		.setName(t("Report Issues"))
		.setDesc(
			t(
				"If you encounter any issues with beta features, please report them to help improve the plugin."
			)
		)
		.addButton((button) => {
			button.setButtonText(t("Report Issue")).onClick(() => {
				window.open(
					"https://github.com/quorafind/obsidian-task-genius/issues"
				);
			});
		});
}
