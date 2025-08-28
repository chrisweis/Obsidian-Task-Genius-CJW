import type TaskProgressBarPlugin from "@/index";
import type { Task } from "@/types/task";

export class TrayMenuBuilder {
  constructor(private plugin: TaskProgressBarPlugin) {}

  private getElectron(): any | null {
    try {
      const injected = (window as any).electron || (globalThis as any).electron;
      if (injected) return injected;
      const req = (window as any).require || (globalThis as any).require;
      return req ? req("electron") : null;
    } catch { return null; }
  }

  private getVaultOpenURI(): string {
    const vaultName = this.plugin.app.vault.getName();
    return `obsidian://open?vault=${encodeURIComponent(vaultName)}`;
  }

  private async buildDueTasks(limit: number = 5): Promise<Task[]> {
    const df = this.plugin.dataflowOrchestrator as any;
    const queryAPI = df?.getQueryAPI?.();
    if (!queryAPI) return [];
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
    const tasks = await queryAPI.getTasksByDateRange({ from: today.getTime(), to: tomorrow.getTime(), field: "due" });
    return (tasks as Task[]).filter(t => !t.completed).slice(0, limit);
  }

  async applyToTray(tray: any, actions: {
    openVault: () => void;
    openTaskView: () => void;
    completeTask: (id: string) => Promise<void>;
    postponeTask: (task: Task, offsetMs: number) => Promise<void>;
    sendDaily: () => Promise<void>;
  }): Promise<void> {
    const electron = this.getElectron();
    const Menu = electron?.Menu || electron?.remote?.Menu;
    if (!Menu || !tray) return;
    const tasks = await this.buildDueTasks(5);
    const template: any[] = [];
    template.push({ label: `Vault: ${this.plugin.app.vault.getName()}`, enabled: false });
    template.push({ label: "Open Vault", click: () => actions.openVault() });
    template.push({ label: "Open Task Genius", click: () => actions.openTaskView() });
    template.push({ label: "Send Daily Summary", click: () => actions.sendDaily() });
    template.push({ type: "separator" });
    for (const t of tasks) {
      template.push({
        label: t.content.length > 40 ? t.content.slice(0,40) + "…" : t.content,
        submenu: [
          { label: "Open", click: () => actions.openTaskView() },
          { label: "Complete", click: () => actions.completeTask(t.id) },
          { label: "Snooze 10m", click: () => actions.postponeTask(t, 10*60_000) },
          { label: "Snooze 1h", click: () => actions.postponeTask(t, 60*60_000) },
          { label: "Snooze 1d", click: () => actions.postponeTask(t, 24*60*60_000) },
        ]
      });
    }
    if (tasks.length === 0) template.push({ label: "No tasks due today", enabled: false });
    template.push({ type: "separator" });
    template.push({ label: "Refresh", click: () => { /* handled by caller update */ } });
    const menu = Menu.buildFromTemplate(template);
    try { tray.setContextMenu(menu); } catch {}
  }
}

