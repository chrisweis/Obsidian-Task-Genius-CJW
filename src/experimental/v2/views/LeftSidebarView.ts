import { ItemView, WorkspaceLeaf } from "obsidian";
import type TaskProgressBarPlugin from "@/index";
import { V2Sidebar } from "@/experimental/v2/components/V2Sidebar";
import { emitSidebarSelectionChanged } from "@/experimental/v2/events/ui-event";

export const TG_LEFT_SIDEBAR_VIEW_TYPE = "tg-left-sidebar" as const;

export class LeftSidebarView extends ItemView {
  private rootEl!: HTMLElement;
  private sidebar!: V2Sidebar;

  constructor(leaf: WorkspaceLeaf, private plugin: TaskProgressBarPlugin) {
    super(leaf);
  }

  getViewType(): string { return TG_LEFT_SIDEBAR_VIEW_TYPE; }
  getDisplayText(): string { return "Task Genius Sidebar"; }
  getIcon(): string { return "layout-sidebar-left"; }

  async onOpen() {
    const el = this.containerEl.children[1];
    el.empty();
    this.rootEl = el.createDiv({ cls: "tg-left-sidebar-view" });

    // Mount existing V2Sidebar component and translate callbacks to cross-view events
    this.sidebar = new V2Sidebar(
      this.rootEl,
      this.plugin,
      // For now, only support project-based filtering; ignore view navigation
      (_viewId: string) => { /* no-op */ },
      (projectId: string) => {
        emitSidebarSelectionChanged(this.app, {
          selectionType: "project",
          selectionId: projectId,
          source: "left",
          workspaceId: (this.plugin as any)?.workspaceManager?.currentWorkspaceId,
        });
      },
      false
    );
    this.addChild(this.sidebar);
    this.sidebar.load();
  }

  async onClose() {
    // cleanup is handled by Component lifecycle
  }
}

