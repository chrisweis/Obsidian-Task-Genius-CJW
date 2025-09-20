import { Menu, setIcon } from 'obsidian';
import { Workspace } from '../types';

export class WorkspaceSelector {
	private containerEl: HTMLElement;
	private currentWorkspace: Workspace;
	private workspaces: Workspace[];
	private onWorkspaceChange: (workspace: Workspace) => void;

	constructor(
		containerEl: HTMLElement,
		workspaces: Workspace[],
		currentWorkspace: Workspace,
		onWorkspaceChange: (workspace: Workspace) => void
	) {
		this.containerEl = containerEl;
		this.workspaces = workspaces;
		this.currentWorkspace = currentWorkspace;
		this.onWorkspaceChange = onWorkspaceChange;

		this.render();
	}

	private render() {
		this.containerEl.empty();
		this.containerEl.addClass('workspace-selector');

		const selectorButton = this.containerEl.createDiv({
			cls: 'workspace-selector-button',
		});

		const workspaceInfo = selectorButton.createDiv({
			cls: 'workspace-info'
		});

		const workspaceIcon = workspaceInfo.createDiv({
			cls: 'workspace-icon',
		});
		workspaceIcon.style.backgroundColor = this.currentWorkspace.color;
		setIcon(workspaceIcon, 'layers');

		const workspaceDetails = workspaceInfo.createDiv({
			cls: 'workspace-details'
		});
		workspaceDetails.createDiv({
			cls: 'workspace-name',
			text: this.currentWorkspace.name
		});
		workspaceDetails.createDiv({
			cls: 'workspace-label',
			text: 'Workspace'
		});

		const dropdownIcon = selectorButton.createDiv({
			cls: 'workspace-dropdown-icon'
		});
		setIcon(dropdownIcon, 'chevron-down');

		selectorButton.addEventListener('click', (e) => {
			e.preventDefault();
			this.showWorkspaceMenu(e);
		});
	}

	private showWorkspaceMenu(event: MouseEvent) {
		const menu = new Menu();

		this.workspaces.forEach(workspace => {
			menu.addItem(item => {
				item.setTitle(workspace.name)
					.setIcon('layers')
					.onClick(() => {
						this.currentWorkspace = workspace;
						this.onWorkspaceChange(workspace);
						this.render();
					});

				if (workspace.id === this.currentWorkspace.id) {
					item.setChecked(true);
				}
			});
		});

		menu.addSeparator();

		menu.addItem(item => {
			item.setTitle('Create Workspace')
				.setIcon('plus')
				.onClick(() => {
					console.log('Create new workspace');
				});
		});

		menu.showAtMouseEvent(event);
	}

	public setWorkspace(workspace: Workspace) {
		this.currentWorkspace = workspace;
		this.render();
	}
}
