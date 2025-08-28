import { App, Component, Notice, Platform, TFile } from "obsidian";
import TaskProgressBarPlugin from "../index";
import type { Task } from "../types/task";
import { TrayMenuBuilder } from "./tray-menu";

/** Desktop notification manager based on dataflow QueryAPI */
export class NotificationManager extends Component {
  private tickInterval: number | null = null;
  private dailyTimeout: number | null = null;
  private midnightTimeout: number | null = null;
  private notifiedKeys: Set<string> = new Set();
  private statusBarItem: HTMLElement | null = null;
  private electronTray: any | null = null;
  private trayOwnerToken?: symbol;

  constructor(private plugin: TaskProgressBarPlugin) {
    super();
  }

  async onload() {
    // Initialize on load
    if (!Platform.isDesktopApp) return;

    // Optional system tray (if Electron allows) or status bar fallback
    if (this.plugin.settings.desktopIntegration?.enableTray) {
      const trayOk = await this.createOrAdoptElectronTray();
      if (!trayOk) {
        this.createOrUpdateStatusBar();
      }
    }

    this.setupDailySummary();
    this.startPerTaskTicker();

    // Initial updates
    this.updateStatusBar().catch(() => {});
    this.updateTray().catch(() => {});
  }

  onunload(): void {
    if (this.tickInterval) window.clearInterval(this.tickInterval);
    if (this.dailyTimeout) window.clearTimeout(this.dailyTimeout);
    if (this.midnightTimeout) window.clearTimeout(this.midnightTimeout);
    this.tickInterval = null;
    this.dailyTimeout = null;
    this.midnightTimeout = null;
    this.notifiedKeys.clear();
    if (this.statusBarItem) {
      this.statusBarItem.detach();
      this.statusBarItem = null;
    }
    try { this.electronTray?.destroy?.(); } catch {}
    this.electronTray = null;
  }

  // Called when settings change
  public reloadSettings(): void {
    this.onunload();
    this.onload();
  }

  // External nudge when task cache updates
  public onTaskCacheUpdated(): void {
    // Do a quick pass to catch any imminently due items
    this.scanAndNotifyPerTask().catch(() => {});
    // Update status bar counts
    this.updateStatusBar().catch(() => {});
    this.updateTray().catch(() => {});
  }

  // Public triggers for settings/actions
  public async triggerDailySummary(): Promise<void> {
    await this.sendDailySummary();
  }
  public triggerImminentScan(): void {
    this.scanAndNotifyPerTask().catch(() => {});
  }

  private getQueryAPI() {
    const df = this.plugin.dataflowOrchestrator as any;
    if (!df) return null;
    return df.getQueryAPI?.();
  }

  private getElectron(): any | null {
    try {
      // Prefer window.electron injected by preload (per your change)
      const injected = (window as any).electron || (globalThis as any).electron;
      if (injected) return injected;
      // Fallback to require when available
      const req = (window as any).require || (globalThis as any).require;
      return req ? req("electron") : null;
    } catch {
      return null;
    }
  }

  private async createOrAdoptElectronTray(): Promise<boolean> {
    try {
      const electron = this.getElectron();
      if (!electron) return false;
      const Tray = (electron as any).Tray || (electron as any).remote?.Tray;
      const nativeImage = (electron as any).nativeImage || (electron as any).remote?.nativeImage;
      if (!Tray || !nativeImage) return false;

      // Reuse existing tray if global singleton exists
      const globalKey = "__tg_tray_singleton__";
      const g: any = (window as any);
      if (g[globalKey]?.tray && g[globalKey]?.owner) {
        // Adopt existing tray - don't recreate
        this.electronTray = g[globalKey].tray;
        this.trayOwnerToken = g[globalKey].owner;
        return true;
      }

      // Create a new tray and register as singleton
      const img = nativeImage.createEmpty ? nativeImage.createEmpty() : nativeImage.createFromDataURL("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAt8BjePz7p8AAAAASUVORK5CYII=");
      const tray = new Tray(img);
      tray.setToolTip("Task Genius");

      try {
        if ((process as any)?.platform === "darwin" && tray.setTitle) {
          tray.setTitle("🔔");
        }
      } catch {}

      tray.on?.("click", async () => {
        await this.sendDailySummary();
        try { (this.plugin as any).activateTaskView?.(); } catch {}
      });

      // Save globally so subsequent reloads reuse it
      const owner = Symbol("tg-tray-owner");
      // Ensure we don't leak multiple listeners on HMR/reloads
      try { g[globalKey]?.tray?.removeAllListeners?.(); } catch {}
      g[globalKey] = { tray, owner };
      this.electronTray = tray;
      this.trayOwnerToken = owner;
      return true;
    } catch (e) {
      console.warn("Failed to create/adopt Electron tray:", e);
      return false;
    }
  }

  private getDueTodayRange(): { from: number; to: number } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { from: today.getTime(), to: tomorrow.getTime() };
  }

  private startPerTaskTicker(): void {
    const cfg = this.plugin.settings.notifications?.perTask;
    const enabled = !!this.plugin.settings.notifications?.enabled && !!cfg?.enabled;
    if (!enabled) return;

    // Immediate scan
    this.scanAndNotifyPerTask().catch(() => {});

    // Then every minute
    this.tickInterval = window.setInterval(() => {
      this.scanAndNotifyPerTask().catch(() => {});
    }, 60_000);

    // Reset notified keys at midnight
    this.scheduleMidnightReset();
  }

  private scheduleMidnightReset(): void {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const ms = midnight.getTime() - now.getTime();
    this.midnightTimeout = window.setTimeout(() => {
      this.notifiedKeys.clear();
      this.scheduleMidnightReset();
      this.updateStatusBar().catch(() => {});
      this.updateTray().catch(() => {});
    }, ms);
  }

  private async scanAndNotifyPerTask(): Promise<void> {
    const cfg = this.plugin.settings.notifications?.perTask;
    if (!cfg || !this.plugin.settings.notifications?.enabled || !cfg.enabled) return;

    const queryAPI = this.getQueryAPI();
    if (!queryAPI) return;

    // Prefer sync cache for speed; fall back to async if empty
    const all = queryAPI.getAllTasksSync?.() as Task[] | undefined;
    const tasks = (all && all.length ? all : await queryAPI.getAllTasks()) as Task[];

    const leadMs = Math.max(0, (cfg.leadMinutes ?? 0) * 60_000);
    const now = Date.now();
    const windowEnd = now + 60_000; // next minute

    for (const task of tasks) {
      if (task.completed) continue;
      const due = task.metadata?.dueDate;
      if (!due) continue;
      const fireAt = due - leadMs;
      if (fireAt >= now && fireAt < windowEnd) {
        const key = `${task.id || task.metadata?.id || task.filePath + ":" + task.line}@${due}`;
        if (this.notifiedKeys.has(key)) continue;
        this.notifiedKeys.add(key);
        this.showTaskDueNotification(task, due, leadMs);
      }
    }
  }

  private async updateTray(): Promise<void> {
    if (!this.electronTray) return;
    try {
      const queryAPI = this.getQueryAPI();
      if (!queryAPI) return;
      const { from, to } = this.getDueTodayRange();
      const todays = await queryAPI.getTasksByDateRange({ from, to, field: "due" });
      const pending = (todays as Task[]).filter((t) => !t.completed);

      // macOS 可以设置文字，Windows/Linux 更新 tooltip
      try {
        if ((process as any)?.platform === "darwin" && this.electronTray.setTitle) {
          this.electronTray.setTitle(pending.length > 0 ? `🔔 ${pending.length}` : "🔔");
        }
      } catch {}
      try { this.electronTray.setToolTip?.(pending.length > 0 ? `${pending.length} tasks due today` : "No tasks due today"); } catch {}

      // Build context menu via helper
      const builder = new TrayMenuBuilder(this.plugin);
      await builder.applyToTray(this.electronTray, {
        openVault: () => this.openVault(),
        openTaskView: () => { try { (this.plugin as any).activateTaskView?.(); } catch {} },
        completeTask: (id: string) => this.completeTask(id),
        postponeTask: (task: Task, offsetMs: number) => this.postponeTask(task, offsetMs),
        sendDaily: () => this.sendDailySummary(),
      });
    } catch (e) {
      console.warn("Failed to update tray:", e);
    }
  }

  private setupDailySummary(): void {
    const cfg = this.plugin.settings.notifications?.dailySummary;
    const enabled = !!this.plugin.settings.notifications?.enabled && !!cfg?.enabled;
    if (!enabled) return;

    const time = cfg!.time || "09:00";
    const [hh, mm] = time.split(":").map((n) => parseInt(n, 10));
    const now = new Date();
    const target = new Date();
    target.setHours(hh || 9, mm || 0, 0, 0);
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    const ms = target.getTime() - now.getTime();
    this.dailyTimeout = window.setTimeout(async () => {
      await this.sendDailySummary();
      // Reschedule next day
      this.setupDailySummary();
    }, ms);
  }

  private async updateStatusBar(): Promise<void> {
    if (!this.plugin.settings.desktopIntegration?.enableTray) return;
    const queryAPI = this.getQueryAPI();
    if (!queryAPI) return;
    const { from, to } = this.getDueTodayRange();
    const todays = await queryAPI.getTasksByDateRange({ from, to, field: "due" });
    const pending = (todays as Task[]).filter((t) => !t.completed);

    if (!this.statusBarItem) {
      this.createOrUpdateStatusBar();
    }
    if (this.statusBarItem) {
      this.statusBarItem.empty();
      const btn = this.statusBarItem.createEl("span", { cls: "task-genius-tray" });
      btn.textContent = pending.length > 0 ? `🔔 ${pending.length}` : "🔔";
      btn.style.cursor = "pointer";
      btn.onclick = async () => {
        await this.sendDailySummary();
        // Try to open Task Genius view
        try {
          (this.plugin as any).activateTaskView?.();
        } catch {}
      };
      btn.title = pending.length > 0 ? `${pending.length} tasks due today` : "No tasks due today";
    }
  }

  private createOrUpdateStatusBar(): void {
    if (!this.statusBarItem) {
      try {
        // @ts-ignore addStatusBarItem exists on Plugin
        this.statusBarItem = (this.plugin as any).addStatusBarItem();
      } catch (e) {
        console.warn("Failed to create status bar item for tray:", e);
      }
    }
  }

  private async sendDailySummary(): Promise<void> {
    const queryAPI = this.getQueryAPI();
    if (!queryAPI) return;
    try {
      const { from, to } = this.getDueTodayRange();
      const todays = await queryAPI.getTasksByDateRange({ from, to, field: "due" });
      const pending = (todays as Task[]).filter((t) => !t.completed);
      if (!pending.length) {
        new Notice("No tasks due today", 2000);
        return;
      }
      const body = this.formatDailySummaryBody(pending);
      this.showNotification("Today's tasks", body);
    } catch (e) {
      console.warn("Daily summary failed", e);
    }
  }

  private formatDailySummaryBody(tasks: Task[]): string {
    const maxList = 5;
    const items = tasks.slice(0, maxList).map((t) => `• ${t.content}`);
    const more = tasks.length > maxList ? `\n… and ${tasks.length - maxList} more` : "";
    return `${tasks.length} tasks due today:\n${items.join("\n")}${more}`;
  }

  private async showTaskDueNotification(task: Task, _due: number, leadMs: number) {
    const minutes = Math.round(leadMs / 60000);
    const title = minutes > 0 ? `Due in ${minutes} min` : "Task due";
    const body = `${task.content}`;
    const n = await this.showNotification(title, body);
    if (n) {
      n.onclick = () => {
        this.openTask(task).catch(() => {});
        // Close after click
        // @ts-ignore
        n.close?.();
      };
    }
  }

  private getVaultOpenURI(): string {
    const vaultName = this.plugin.app.vault.getName();
    return `obsidian://open?vault=${encodeURIComponent(vaultName)}`;
  }

  private openVault(): void {
    const url = this.getVaultOpenURI();
    try { window.open(url, "_blank"); } catch {}
  }

  private async completeTask(taskId: string): Promise<void> {
    try { await this.plugin.writeAPI?.updateTaskStatus({ taskId, completed: true }); } catch {}
  }

  private async postponeTask(task: Task, offsetMs: number): Promise<void> {
    const base = task.metadata?.dueDate || Date.now();
    const newDue = base + offsetMs;
    try { await this.plugin.writeAPI?.updateTask({ taskId: task.id, updates: { metadata: { dueDate: newDue } as any } }); } catch {}
  }

  private tryElectronNotification(title: string, body: string): any | null {
    try {
      const req = (window as any).require || (globalThis as any).require;
      const electron = req ? req("electron") : null;
      const ElectronNotification = electron?.Notification;
      if (ElectronNotification) {
        const n = new ElectronNotification({ title, body });
        // Some Electron versions require show()
        if (typeof n.show === "function") n.show();
        return n;
      }
    } catch {
      // ignore
    }
    return null;
  }

  private async showNotification(title: string, body: string): Promise<Notification | null> {
    try {
      // Try Electron native notification first (desktop main-bridged in some builds)
      const en = this.tryElectronNotification(title, body);
      if (en) return en as any;

      // Fallback to Web Notifications in renderer (Electron implements this API)
      if ("Notification" in window) {
        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }
        if (Notification.permission === "granted") {
          return new Notification(title, { body });
        }
      }
      // Fallback to Obsidian Notice
      new Notice(`${title}: ${body}`, 5000);
    } catch (e) {
      console.warn("Notification error", e);
      new Notice(`${title}: ${body}`, 5000);
    }
    return null;
  }

  private async openTask(task: Task): Promise<void> {
    const file = this.plugin.app.vault.getAbstractFileByPath(task.filePath) as TFile | null;
    if (!file) return;
    const leaf = this.plugin.app.workspace.getLeaf(true);
    await leaf.openFile(file);
    try {
      // Reveal line if available
      const view = this.plugin.app.workspace.getActiveViewOfType((window as any).MarkdownView);
      const editor = (view as any)?.editor;
      if (editor && typeof task.line === "number") {
        editor.setCursor({ line: Math.max(0, task.line - 1), ch: 0 });
        editor.scrollIntoView({ from: { line: Math.max(0, task.line - 1), ch: 0 }, to: { line: Math.max(0, task.line - 1), ch: 0 } }, true);
      }
    } catch {}
  }
}

export default NotificationManager;

