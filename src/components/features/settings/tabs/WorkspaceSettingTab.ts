import { Menu, Setting, setIcon } from "obsidian";
import { TaskProgressBarSettingTab } from "@/setting";
import TaskProgressBarPlugin from "@/index";
import { WorkspaceData } from "@/experimental/v2/types/workspace";
import { t } from "@/translations/helper";
import {
	CreateWorkspaceModal,
	RenameWorkspaceModal,
	DeleteWorkspaceModal,
} from "@/experimental/v2/components/modals/WorkspaceModals";

export function renderWorkspaceSettingsTab(settingTab: TaskProgressBarSettingTab, containerEl: HTMLElement) {
	const workspacesSection = containerEl.createDiv();
	workspacesSection.addClass("workspaces-settings-section");

	// Section header
	const headerEl = workspacesSection.createEl("h2");
	headerEl.setText(t("Workspace Management"));
	headerEl.addClass("workspaces-section-heading");

	// Description
	const descEl = workspacesSection.createDiv();
	descEl.addClass("workspaces-description");
	descEl.setText(
		t(
			"Manage workspaces to organize different contexts with their own settings and filters."
		)
	);

	if (!settingTab.plugin.workspaceManager) {
		const warningEl = workspacesSection.createDiv();
		warningEl.addClass("workspaces-warning");
		warningEl.setText(t("Workspace manager is not available."));
		return;
	}

	// Current workspace info
	const currentWorkspace =
		settingTab.plugin.workspaceManager.getActiveWorkspace();
	const isDefault = settingTab.plugin.workspaceManager.isDefaultWorkspace(
		currentWorkspace.id
	);

	new Setting(workspacesSection)
		.setName(t("Current Workspace"))
		.setDesc(
			`${currentWorkspace.name}${
				isDefault ? " (" + t("Default") + ")" : ""
			}`
		)
		.addButton((button) => {
			button.setButtonText(t("Switch Workspace")).onClick((evt) => {
				showWorkspaceSelector(settingTab, evt);
			});
		});

	// Workspace list
	const allWorkspaces = settingTab.plugin.workspaceManager.getAllWorkspaces();

	const workspaceListEl = workspacesSection.createDiv();
	workspaceListEl.addClass("workspace-list");

	const listHeaderEl = workspaceListEl.createEl("h3");
	listHeaderEl.setText(t("All Workspaces"));

	allWorkspaces.forEach((workspace) => {
		const workspaceItemEl = workspaceListEl.createDiv();
		workspaceItemEl.addClass("workspace-item");

		const isCurrentActive = workspace.id === currentWorkspace.id;
		const isDefaultWs =
			settingTab.plugin.workspaceManager!.isDefaultWorkspace(workspace.id);

		if (isCurrentActive) {
			workspaceItemEl.addClass("workspace-item-active");
		}

		const setting = new Setting(workspaceItemEl);

		// Add workspace icon to the name
		const nameWithIcon = setting.nameEl.createDiv({cls: "workspace-name-with-icon"});
		const iconEl = nameWithIcon.createDiv({cls: "workspace-list-icon"});
		setIcon(iconEl, workspace.icon || "layers");
		nameWithIcon.createSpan({text: workspace.name});

		setting.setDesc(
				isDefaultWs
					? t("Default workspace")
					: t("Last updated: {{date}}", {
						interpolation: {
							date: new Date(
								workspace.updatedAt
							).toLocaleDateString(),
						},
					})
			)
			.addButton((button) => {
				if (isCurrentActive) {
					button.setButtonText(t("Active")).setDisabled(true);
				} else {
					button.setButtonText(t("Switch")).onClick(async () => {
						console.log("[TG-WORKSPACE] settings:switch", {
							to: workspace.id,
						});
						await settingTab.plugin.workspaceManager!.setActiveWorkspace(
							workspace.id
						);
						this.display();
					});
				}
			})
			.addButton((button) => {
				button
					.setIcon("edit")
					.setTooltip(t("Rename"))
					.onClick(() => {
						showRenameWorkspaceDialog(settingTab, workspace);
					});
			})
			.addButton((button) => {
				if (isDefaultWs) {
					button
						.setIcon("trash")
						.setTooltip(
							t("Default workspace cannot be deleted")
						);
					button.setDisabled(true);
				} else {
					button
						.setIcon("trash")
						.setTooltip(t("Delete"))
						.onClick(() => {
							showDeleteWorkspaceDialog(settingTab, workspace);
						});
				}
			});
	});

	// Create new workspace button
	new Setting(workspacesSection)
		.setName(t("Create New Workspace"))
		.setDesc(t("Create a new workspace with custom settings"))
		.addButton((button) => {
			button
				.setButtonText(t("Create"))
				.setCta()
				.onClick(() => {
					showCreateWorkspaceDialog(settingTab);
				});
		});
}

function showWorkspaceSelector(settingTab: TaskProgressBarSettingTab, event: MouseEvent) {
	if (!settingTab.plugin.workspaceManager) return;

	const menu = new Menu();
	const workspaces = settingTab.plugin.workspaceManager.getAllWorkspaces();
	const currentWorkspace =
		settingTab.plugin.workspaceManager.getActiveWorkspace();

	workspaces.forEach((workspace) => {
		menu.addItem((item) => {
			item.setTitle(workspace.name)
				.setIcon("layers")
				.onClick(async () => {
					await settingTab.plugin.workspaceManager?.setActiveWorkspace(
						workspace.id
					);
					console.log("[TG-WORKSPACE] settings:menu switch", {
						to: workspace.id,
					});

					this.display();
				});

			if (workspace.id === currentWorkspace.id) {
				item.setChecked(true);
			}
		});
	});

	menu.showAtMouseEvent(event);
}

function showCreateWorkspaceDialog(settingTab: TaskProgressBarSettingTab) {
	if (!settingTab.plugin.workspaceManager) return;

	new CreateWorkspaceModal(settingTab.plugin, () => {
		settingTab.display();
	}).open();
}

function showRenameWorkspaceDialog(settingTab: TaskProgressBarSettingTab, workspace: WorkspaceData) {
	if (!settingTab.plugin.workspaceManager) return;

	new RenameWorkspaceModal(settingTab.plugin, workspace, () => {
		settingTab.display();
	}).open();
}

function showDeleteWorkspaceDialog(settingTab: TaskProgressBarSettingTab, workspace: WorkspaceData) {
	if (!settingTab.plugin.workspaceManager) return;

	new DeleteWorkspaceModal(settingTab.plugin, workspace, () => {
		settingTab.display();
	}).open();
}
