import { ItemView, WorkspaceLeaf } from "obsidian";
import type TaskProgressBarPlugin from "@/index";
import { FluentSidebar } from "@/components/features/fluent/components/FluentSidebar";
import { emitSidebarSelectionChanged, onSidebarSelectionChanged } from "@/components/features/fluent/events/ui-event";
import { QuickCaptureModal } from "@/components/features/quick-capture/modals/QuickCaptureModal";
import { t } from "@/translations/helper";


export const TG_LEFT_SIDEBAR_VIEW_TYPE = "tg-left-sidebar" as const;

export class LeftSidebarView extends ItemView {
	private rootEl!: HTMLElement;
	private sidebar!: FluentSidebar;

	constructor(leaf: WorkspaceLeaf, private plugin: TaskProgressBarPlugin) {
		super(leaf);
	}

	getViewType(): string {
		return TG_LEFT_SIDEBAR_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Task Genius" + t("Sidebar");
	}

	getIcon(): string {
		return "panel-left-dashed";
	}

	async onOpen() {
		const el = this.containerEl.children[1];
		el.empty();
		this.rootEl = el.createDiv({cls: "tg-left-sidebar-view"});

		// Mount existing V2Sidebar component and translate callbacks to cross-view events
		this.sidebar = new FluentSidebar(
			this.rootEl,
			this.plugin,
			// Emit view navigation to main view (or open new task modal)
			(viewId: string) => {
				// Special handling for new task button
				if (viewId === "new-task") {
					new QuickCaptureModal(this.app, this.plugin).open();
					return;
				}

				emitSidebarSelectionChanged(this.app, {
					selectionType: "view",
					selectionId: viewId,
					source: "left",
					workspaceId: this.plugin.workspaceManager?.getActiveWorkspace().id,
				});
			},
			// Emit project-based filtering
			(projectId: string) => {
				emitSidebarSelectionChanged(this.app, {
					selectionType: "project",
					selectionId: projectId,
					source: "left",
					workspaceId: this.plugin.workspaceManager?.getActiveWorkspace().id,
				});
			},
			// Emit search query changes
			(query: string) => {
				emitSidebarSelectionChanged(this.app, {
					selectionType: "search",
					selectionId: query,
					source: "left",
					workspaceId: this.plugin.workspaceManager?.getActiveWorkspace().id,
				});
			},
			// Emit filter selection changes
			(configId: string | null) => {
				emitSidebarSelectionChanged(this.app, {
					selectionType: "filter",
					selectionId: configId || "",
					source: "left",
					workspaceId: this.plugin.workspaceManager?.getActiveWorkspace().id,
				});
			},
			false
		);
		this.addChild(this.sidebar);
		this.sidebar.load();
		// Sync active highlight when main view changes (ignore events from left to prevent echo)
		this.registerEvent(
			onSidebarSelectionChanged(this.app, (payload) => {
				const activeId = this.plugin.workspaceManager?.getActiveWorkspace().id;
				if (payload.workspaceId && activeId && payload.workspaceId !== activeId) return;
				if (payload.selectionType === "view" && payload.selectionId && payload.source === "main") {
					this.sidebar?.setActiveItem(payload.selectionId);
				}
			})
		);

	}

	async onClose() {
		// cleanup is handled by Component lifecycle
	}
}

