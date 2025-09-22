import { Menu, setIcon, Notice, Modal, Setting } from "obsidian";
import type TaskProgressBarPlugin from "@/index";
import { WorkspaceData } from "@/experimental/v2/types/workspace";
import { t } from "@/translations/helper";

export class WorkspaceSelector {
	private containerEl: HTMLElement;
	private plugin: TaskProgressBarPlugin;
	private currentWorkspaceId: string;
	private onWorkspaceChange: (workspaceId: string) => void;

	constructor(
		containerEl: HTMLElement,
		plugin: TaskProgressBarPlugin,
		onWorkspaceChange: (workspaceId: string) => void
	) {
		this.containerEl = containerEl;
		this.plugin = plugin;
		this.currentWorkspaceId =
			plugin.workspaceManager?.getActiveWorkspace().id || "";
		this.onWorkspaceChange = onWorkspaceChange;

		this.render();
	}

	private render() {
		this.containerEl.empty();
		this.containerEl.addClass("workspace-selector");

		if (!this.plugin.workspaceManager) return;

		const currentWorkspace =
			this.plugin.workspaceManager.getActiveWorkspace();
		const isDefault = this.plugin.workspaceManager.isDefaultWorkspace(
			currentWorkspace.id
		);

		const selectorButton = this.containerEl.createDiv({
			cls: "workspace-selector-button",
		});

		const workspaceInfo = selectorButton.createDiv({
			cls: "workspace-info",
		});

		const workspaceIcon = workspaceInfo.createDiv({
			cls: "workspace-icon",
		});
		// Use a color scheme for workspaces if needed
		workspaceIcon.style.backgroundColor =
			this.getWorkspaceColor(currentWorkspace);
		setIcon(workspaceIcon, "layers");

		const workspaceDetails = workspaceInfo.createDiv({
			cls: "workspace-details",
		});

		const nameContainer = workspaceDetails.createDiv({
			cls: "workspace-name-container",
		});

		nameContainer.createSpan({
			cls: "workspace-name",
			text: currentWorkspace.name,
		});

		workspaceDetails.createDiv({
			cls: "workspace-label",
			text: t("Workspace"),
		});

		const dropdownIcon = selectorButton.createDiv({
			cls: "workspace-dropdown-icon",
		});
		setIcon(dropdownIcon, "chevron-down");

		selectorButton.addEventListener("click", (e) => {
			e.preventDefault();
			this.showWorkspaceMenu(e);
		});
	}

	private getWorkspaceColor(workspace: WorkspaceData): string {
		// Generate a color based on workspace ID or use predefined colors
		const colors = [
			"#e74c3c",
			"#3498db",
			"#2ecc71",
			"#f39c12",
			"#9b59b6",
			"#1abc9c",
			"#34495e",
			"#e67e22",
		];
		const index =
			Math.abs(
				workspace.id
					.split("")
					.reduce((acc, char) => acc + char.charCodeAt(0), 0)
			) % colors.length;
		return colors[index];
	}

	private showWorkspaceMenu(event: MouseEvent) {
		if (!this.plugin.workspaceManager) return;

		const menu = new Menu();
		const workspaces = this.plugin.workspaceManager.getAllWorkspaces();
		const currentWorkspace =
			this.plugin.workspaceManager.getActiveWorkspace();

		// Add workspace items
		workspaces.forEach((workspace) => {
			menu.addItem((item) => {
				const isDefault =
					this.plugin.workspaceManager?.isDefaultWorkspace(
						workspace.id
					);
				const title = isDefault ? `${workspace.name}` : workspace.name;

				item.setTitle(title)
					.setIcon("layers")
					.onClick(async () => {
						await this.onWorkspaceChange(workspace.id);
						this.currentWorkspaceId = workspace.id;
						this.render();
					});

				if (workspace.id === currentWorkspace.id) {
					item.setChecked(true);
				}
			});
		});

		menu.addSeparator();

		// Add management options
		menu.addItem((item) => {
			item.setTitle(t("Create Workspace"))
				.setIcon("plus")
				.onClick(() => {
					this.showCreateWorkspaceDialog();
				});
		});

		// Only show rename/delete for non-default workspaces
		if (
			!this.plugin.workspaceManager.isDefaultWorkspace(
				currentWorkspace.id
			)
		) {
			menu.addItem((item) => {
				item.setTitle(t("Rename Current Workspace"))
					.setIcon("edit")
					.onClick(() => {
						this.showRenameWorkspaceDialog(currentWorkspace);
					});
			});

			menu.addItem((item) => {
				item.setTitle(t("Delete Current Workspace"))
					.setIcon("trash")
					.onClick(() => {
						this.showDeleteWorkspaceDialog(currentWorkspace);
					});
			});
		}

		menu.addSeparator();

		menu.addItem((item) => {
			item.setTitle(t("Manage Workspaces..."))
				.setIcon("settings")
				.onClick(() => {
					// Open settings to workspace tab
					// @ts-ignore
					this.plugin.app.setting.open();
					// @ts-ignore
					this.plugin.app.setting.openTabById(
						"obsidian-task-progress-bar"
					);
				});
		});

		menu.showAtMouseEvent(event);
	}

	private showCreateWorkspaceDialog() {
		class CreateWorkspaceModal extends Modal {
			private nameInput: HTMLInputElement;
			private baseWorkspaceSelect: HTMLSelectElement;
			private name: string = "";
			private selectWorkspaceId: string = "";

			constructor(
				private plugin: TaskProgressBarPlugin,
				private onCreated: (workspace: WorkspaceData) => void
			) {
				super(plugin.app);
			}

			onOpen() {
				const { contentEl } = this;
				contentEl.createEl("h2", { text: t("Create New Workspace") });

				// Name input
				new Setting(contentEl)
					.setName(t("Workspace Name"))
					.setDesc(t("A descriptive name for the workspace"))
					.addText((text) => {
						text.setPlaceholder(t("Workspace Name"))
							.setValue("")
							.onChange((value) => {
								this.name = value;
							});
					});

				const currentWorkspace =
					this.plugin.workspaceManager?.getActiveWorkspace();

				// Base workspace selector
				new Setting(contentEl)
					.setName(t("Copy Settings From"))
					.setDesc(t("Copy settings from an existing workspace"))
					.addDropdown((dropdown) => {
						dropdown.addOption("", t("Select a workspace..."));
						if (currentWorkspace) {
							dropdown.addOption(
								currentWorkspace.id,
								`Current (${currentWorkspace.name})`
							);
						}
						this.plugin.workspaceManager
							?.getAllWorkspaces()
							.forEach((ws) => {
								dropdown.addOption(ws.id, ws.name);
							});

						dropdown.onChange((value) => {
							this.selectWorkspaceId = value;
						});
					});

				// Buttons
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
					const name = this.name.trim();

					if (!name) {
						new Notice(t("Please enter a workspace name"));
						return;
					}
					const baseId = this.selectWorkspaceId;

					if (name && this.plugin.workspaceManager) {
						const workspace =
							await this.plugin.workspaceManager.createWorkspace(
								name,
								baseId
							);
						new Notice(
							t('Workspace "{{name}}" created', {
								interpolation: { name: name },
							})
						);
						this.onCreated(workspace);
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
				const { contentEl } = this;
				contentEl.empty();
			}
		}

		new CreateWorkspaceModal(this.plugin, (workspace) => {
			this.onWorkspaceChange(workspace.id);
			this.currentWorkspaceId = workspace.id;
			this.render();
		}).open();
	}

	private showRenameWorkspaceDialog(workspace: WorkspaceData) {
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
				const { contentEl } = this;
				contentEl.createEl("h2", { text: t("Rename Workspace") });

				const inputContainer = contentEl.createDiv({
					cls: "setting-item",
				});
				inputContainer.createEl("label", { text: t("New Name") + ":" });
				this.nameInput = inputContainer.createEl("input", {
					type: "text",
					value: this.workspace.name,
					placeholder: t("Enter workspace name..."),
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
						await this.plugin.workspaceManager.renameWorkspace(
							this.workspace.id,
							newName
						);
						new Notice(
							t('Workspace renamed to "{{name}}"', {
								interpolation: { name: newName },
							})
						);
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
				const { contentEl } = this;
				contentEl.empty();
			}
		}

		new RenameWorkspaceModal(this.plugin, workspace, () => {
			this.render();
		}).open();
	}

	private showDeleteWorkspaceDialog(workspace: WorkspaceData) {
		class DeleteWorkspaceModal extends Modal {
			constructor(
				private plugin: TaskProgressBarPlugin,
				private workspace: WorkspaceData,
				private onDeleted: () => void
			) {
				super(plugin.app);
			}

			onOpen() {
				const { contentEl } = this;
				contentEl.createEl("h2", { text: t("Delete Workspace") });

				contentEl.createEl("p", {
					text: t(
						'Are you sure you want to delete the workspace "{{name}}"? This action cannot be undone.',
						{ interpolation: { name: this.workspace.name } }
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
						await this.plugin.workspaceManager.deleteWorkspace(
							this.workspace.id
						);
						new Notice(
							t('Workspace "{{name}}" deleted', {
								interpolation: {
									name: this.workspace.name,
								},
							})
						);
						this.onDeleted();
						this.close();
					}
				});

				cancelButton.addEventListener("click", () => {
					this.close();
				});
			}

			onClose() {
				const { contentEl } = this;
				contentEl.empty();
			}
		}

		new DeleteWorkspaceModal(this.plugin, workspace, () => {
			// After deletion, workspace manager will automatically switch to default
			this.currentWorkspaceId =
				this.plugin.workspaceManager?.getActiveWorkspace().id || "";
			this.render();
		}).open();
	}

	public setWorkspace(workspaceId: string) {
		this.currentWorkspaceId = workspaceId;
		this.render();
	}
}
