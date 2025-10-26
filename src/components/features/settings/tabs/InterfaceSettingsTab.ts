import { Setting, Notice } from "obsidian";
import { TaskProgressBarSettingTab } from "@/setting";
import { t } from "@/translations/helper";
import { renderViewSettingsTab } from "./ViewSettingsTab";

export function renderInterfaceSettingsTab(
	settingTab: TaskProgressBarSettingTab,
	containerEl: HTMLElement
) {
	// Header
	new Setting(containerEl)
		.setName(t("Interface & Views"))
		.setDesc(
			t(
				"Configure how Task Genius displays in your workspace and manage your views."
			)
		)
		.setHeading();

	// Interface Settings Section
	new Setting(containerEl)
		.setName(t("Interface Settings"))
		.setDesc(t("Configure interface display options."))
		.setHeading();

	// Use workspace side leaves for Sidebar & Details
	new Setting(containerEl)
		.setName(t("Use Workspace Side Leaves"))
		.setDesc(
			t(
				"Use left/right workspace side leaves for Sidebar and Details. When enabled, the sidebar and details panels appear in separate Obsidian panes instead of within the main Task Genius view."
			)
		)
		.addToggle((toggle) => {
			const current = settingTab.plugin.settings.fluentView?.useWorkspaceSideLeaves ?? true;
			toggle
				.setValue(current)
				.onChange(async (value) => {
					if (!settingTab.plugin.settings.fluentView) {
						settingTab.plugin.settings.fluentView = {
							enableFluent: true,
							showFluentRibbon: false,
						};
					}
					if (!settingTab.plugin.settings.fluentView.fluentConfig) {
						settingTab.plugin.settings.fluentView.fluentConfig = {
							enableWorkspaces: true,
							defaultWorkspace: "default",
							showTopNavigation: true,
							showNewSidebar: true,
							allowViewSwitching: true,
							persistViewMode: true,
						};
					}
					// Store via 'any' to avoid typing constraints for experimental backfill
					(settingTab.plugin.settings.fluentView as any).useWorkspaceSideLeaves = value;
					await settingTab.plugin.saveSettings();
					new Notice(t("Saved. Reopen the view to apply changes."));
				});
		});

	// Add spacer before Views section
	containerEl.createDiv({ cls: "setting-item-heading-spacer" });

	// Render Views Settings
	renderViewSettingsTab(settingTab, containerEl);
}
