import { WorkspaceLeaf } from "obsidian";
import TaskProgressBarPlugin from "../../index";
import { TaskViewV2, TASK_VIEW_V2_TYPE } from "./TaskViewV2";
import "./styles/v2.css";

export class V2Integration {
	private plugin: TaskProgressBarPlugin;

	constructor(plugin: TaskProgressBarPlugin) {
		this.plugin = plugin;
	}

	/**
	 * Register V2 view and commands
	 */
	public register() {
		// Only register if experimental features are enabled
		if (!this.isV2Enabled()) {
			return;
		}

		// Register the V2 view
		this.plugin.registerView(
			TASK_VIEW_V2_TYPE,
			(leaf: WorkspaceLeaf) => new TaskViewV2(leaf, this.plugin),
		);

		// Add command to open V2 view
		this.plugin.addCommand({
			id: "open-task-view-v2",
			name: "Open Task View V2 (Experimental)",
			callback: () => {
				this.openV2View();
			},
		});

		// Add ribbon icon if enabled in settings
		if (this.plugin.settings.experimental?.showV2Ribbon) {
			this.plugin.addRibbonIcon(
				"layout-dashboard",
				"Task Genius V2",
				() => {
					this.openV2View();
				},
			);
		}
	}

	/**
	 * Open the V2 view
	 */
	private async openV2View() {
		const { workspace } = this.plugin.app;

		// Check if V2 view is already open
		const leaves = workspace.getLeavesOfType(TASK_VIEW_V2_TYPE);
		if (leaves.length > 0) {
			// Focus existing view
			workspace.revealLeaf(leaves[0]);
			return;
		}

		// Create new V2 view
		const leaf = workspace.getLeaf("tab");
		await leaf.setViewState({
			type: TASK_VIEW_V2_TYPE,
			active: true,
		});

		workspace.revealLeaf(leaf);
	}

	/**
	 * Check if V2 features are enabled
	 */
	private isV2Enabled(): boolean {
		return this.plugin.settings.experimental?.enableV2 ?? false;
	}

	/**
	 * Migrate settings from V1 to V2
	 */
	public async migrateSettings() {
		if (!this.plugin.settings.experimental) {
			this.plugin.settings.experimental = {
				enableV2: false,
				showV2Ribbon: false,
			};
		}

		// Default workspace configuration
		if (!this.plugin.settings.experimental!.workspaces) {
			this.plugin.settings.experimental!.workspaces = [
				{ id: "default", name: "Default", color: "#3498db" },
			];
		}

		// Default V2 configuration
		if (this.plugin.settings.experimental!.v2Config === undefined) {
			this.plugin.settings.experimental!.v2Config = {
				enableWorkspaces: true,
				defaultWorkspace: "default",
				showTopNavigation: true,
				showNewSidebar: true,
				allowViewSwitching: true,
				persistViewMode: true,
			};
		}

		await this.plugin.saveSettings();
	}

	/**
	 * Toggle between V1 and V2 views
	 */
	public async toggleVersion() {
		const { workspace } = this.plugin.app;

		// Close all V1 views
		const v1Leaves = workspace.getLeavesOfType("task-genius-view");
		v1Leaves.forEach((leaf) => leaf.detach());

		// Close all V2 views
		const v2Leaves = workspace.getLeavesOfType(TASK_VIEW_V2_TYPE);
		v2Leaves.forEach((leaf) => leaf.detach());

		// Toggle the setting
		if (!this.plugin.settings.experimental) {
			this.plugin.settings.experimental = {
				enableV2: false,
				showV2Ribbon: false,
			};
		}
		this.plugin.settings.experimental!.enableV2 =
			!this.plugin.settings.experimental!.enableV2;
		await this.plugin.saveSettings();

		// Open the appropriate view
		if (this.plugin.settings.experimental!.enableV2) {
			await this.openV2View();
		} else {
			// Open V1 view
			const leaf = workspace.getLeaf("tab");
			await leaf.setViewState({
				type: "task-genius-view",
				active: true,
			});
			workspace.revealLeaf(leaf);
		}
	}
}
