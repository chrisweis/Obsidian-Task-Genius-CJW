import { Menu, Modal, Notice, Setting } from "obsidian";
import { TaskProgressBarSettingTab } from "@/setting";
import TaskProgressBarPlugin from "@/index";
import { WorkspaceData } from "@/experimental/v2/types/workspace";
import { t } from "@/translations/helper";

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

		new Setting(workspaceItemEl)
			.setName(workspace.name)
			.setDesc(
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
		this.display();
	}).open();
}

function showRenameWorkspaceDialog(settingTab: TaskProgressBarSettingTab, workspace: WorkspaceData) {
	if (!settingTab.plugin.workspaceManager) return;


	new RenameWorkspaceModal(settingTab.plugin, workspace, () => {
		this.display();
	}).open();
}

function showDeleteWorkspaceDialog(settingTab: TaskProgressBarSettingTab, workspace: WorkspaceData) {
	if (!settingTab.plugin.workspaceManager) return;


	new DeleteWorkspaceModal(settingTab.plugin, workspace, () => {
		this.display();
	}).open();
}

class CreateWorkspaceModal extends Modal {
	private nameInput: HTMLInputElement;
	private baseSelect: HTMLSelectElement;

	constructor(
		private plugin: TaskProgressBarPlugin,
		private onCreated: () => void
	) {
		super(plugin.app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.createEl("h2", {text: t("Create New Workspace")});

		new Setting(contentEl)
			.setName(t("Workspace Name"))
			.addText((text) => {
				text.setPlaceholder(t("Enter workspace name"));
				this.nameInput = text.inputEl;
			});

		new Setting(contentEl)
			.setName(t("Copy Settings From"))
			.addDropdown((dropdown) => {
				dropdown.addOption("", t("Default settings"));
				this.plugin.workspaceManager
					?.getAllWorkspaces()
					.forEach((ws) => {
						dropdown.addOption(ws.id, ws.name);
					});
				this.baseSelect = dropdown.selectEl;
			});

		const buttonContainer = contentEl.createDiv({
			cls: "modal-button-container",
		});

		const createButton = buttonContainer.createEl("button", {
			text: t("Create"),
			cls: "mod-cta",
		});

		const cancelButton = buttonContainer.createEl("button", {
			text: t("Cancel"),
		});

		createButton.addEventListener("click", async () => {
			const name = this.nameInput.value.trim();
			const baseId = this.baseSelect.value || undefined;

			if (name && this.plugin.workspaceManager) {
				console.log("[TG-WORKSPACE] settings:create", {
					name,
					baseId,
				});
				await this.plugin.workspaceManager.createWorkspace(
					name,
					baseId
				);
				new Notice(t("Workspace created"));
				this.onCreated();
				this.close();
			} else {
				new Notice(t("Please enter a workspace name"));
			}
		});

		cancelButton.addEventListener("click", () => {
			this.close();
		});
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class RenameWorkspaceModal extends Modal {
	private nameInput: HTMLInputElement;

	constructor(
		private plugin: TaskProgressBarPlugin,
		private workspace: WorkspaceData,
		private onRenamed: () => void
	) {
		super(plugin.app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.createEl("h2", {text: t("Rename Workspace")});

		new Setting(contentEl)
			.setName(t("New Name"))
			.addText((text) => {
				text.setValue(this.workspace.name).setPlaceholder(
					t("Enter new name")
				);
				this.nameInput = text.inputEl;
			});

		const buttonContainer = contentEl.createDiv({
			cls: "modal-button-container",
		});

		const renameButton = buttonContainer.createEl("button", {
			text: t("Rename"),
			cls: "mod-cta",
		});

		const cancelButton = buttonContainer.createEl("button", {
			text: t("Cancel"),
		});

		renameButton.addEventListener("click", async () => {
			const newName = this.nameInput.value.trim();
			if (
				newName &&
				newName !== this.workspace.name &&
				this.plugin.workspaceManager
			) {
				console.log("[TG-WORKSPACE] settings:rename", {
					id: this.workspace.id,
					to: newName,
				});
				await this.plugin.workspaceManager.renameWorkspace(
					this.workspace.id,
					newName
				);
				new Notice(t("Workspace renamed"));
				this.onRenamed();
				this.close();
			} else {
				new Notice(t("Please enter a different name"));
			}
		});

		cancelButton.addEventListener("click", () => {
			this.close();
		});

		this.nameInput.focus();
		this.nameInput.select();
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class DeleteWorkspaceModal extends Modal {
	constructor(
		private plugin: TaskProgressBarPlugin,
		private workspace: WorkspaceData,
		private onDeleted: () => void
	) {
		super(plugin.app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.createEl("h2", {text: t("Delete Workspace")});

		contentEl.createEl("p", {
			text: t(
				'Are you sure you want to delete "{{name}}"? This action cannot be undone.',
				{name: this.workspace.name}
			),
		});

		const buttonContainer = contentEl.createDiv({
			cls: "modal-button-container",
		});

		const deleteButton = buttonContainer.createEl("button", {
			text: t("Delete"),
			cls: "mod-warning",
		});

		const cancelButton = buttonContainer.createEl("button", {
			text: t("Cancel"),
		});

		deleteButton.addEventListener("click", async () => {
			if (this.plugin.workspaceManager) {
				console.log("[TG-WORKSPACE] settings:delete", {
					id: this.workspace.id,
				});
				await this.plugin.workspaceManager.deleteWorkspace(
					this.workspace.id
				);
				new Notice(t("Workspace deleted"));
				this.onDeleted();
				this.close();
			}
		});

		cancelButton.addEventListener("click", () => {
			this.close();
		});
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}
