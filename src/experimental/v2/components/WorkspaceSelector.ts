import { Menu, setIcon } from "obsidian";
import type TaskProgressBarPlugin from "@/index";
import { WorkspaceData } from "@/experimental/v2/types/workspace";
import { t } from "@/translations/helper";
import {
	CreateWorkspaceModal,
	RenameWorkspaceModal,
	DeleteWorkspaceModal,
} from "@/experimental/v2/components/modals/WorkspaceModals";

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
		setIcon(workspaceIcon, currentWorkspace.icon || "layers");

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
					.setIcon(workspace.icon || "layers")
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

					setTimeout(() => {
						if (this.plugin.settingTab) {
							this.plugin.settingTab.openTab("workspaces");
						}
					}, 100);
				});
		});

		menu.showAtMouseEvent(event);
	}

	private showCreateWorkspaceDialog() {
		new CreateWorkspaceModal(this.plugin, (workspace) => {
			this.onWorkspaceChange(workspace.id);
			this.currentWorkspaceId = workspace.id;
			this.render();
		}).open();
	}

	private showRenameWorkspaceDialog(workspace: WorkspaceData) {
		new RenameWorkspaceModal(this.plugin, workspace, () => {
			this.render();
		}).open();
	}

	private showDeleteWorkspaceDialog(workspace: WorkspaceData) {
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
