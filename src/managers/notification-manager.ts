import { App, Component, Notice, Platform, TFile, Menu } from "obsidian";
import TaskProgressBarPlugin from "../index";
import type { Task } from "../types/task";
import { TrayMenuBuilder } from "./tray-menu";
import { getTaskGeniusIcon } from "../icon";
import { t } from "@/translations/helper";

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

    const trayMode = this.plugin.settings.desktopIntegration?.trayMode || "status";

    // System tray (if allowed)
    if (trayMode === "system" || trayMode === "both") {
      if (this.plugin.settings.desktopIntegration?.enableTray) {
        const trayOk = await this.createOrAdoptElectronTray();
        if (!trayOk && trayMode === "system") {
          // Fallback to status bar if system tray not available
          this.createOrUpdateStatusBar();
        }
      }
    }

    // Status bar indicator
    if (trayMode === "status" || trayMode === "both") {
      this.createOrUpdateStatusBar();
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
        try { await this.applyThemeToTray(nativeImage); this.subscribeNativeTheme(nativeImage); } catch {}
        return true;
      }

      // Create a new tray and apply theme-based icon
      this.electronTray = new Tray(nativeImage.createEmpty());
      try { this.electronTray.setToolTip("Task Genius"); } catch {}
      try { await this.applyThemeToTray(nativeImage); this.subscribeNativeTheme(nativeImage); } catch {}

      this.electronTray.on?.("click", async () => {
        await this.sendDailySummary();
        try { (this.plugin as any).activateTaskView?.(); } catch {}
      });

      // Save globally so subsequent reloads reuse it
      const owner = Symbol("tg-tray-owner");
      // Ensure we don't leak multiple listeners on HMR/reloads
      try { g[globalKey]?.tray?.removeAllListeners?.(); } catch {}
      g[globalKey] = { tray: this.electronTray, owner };
      this.trayOwnerToken = owner;


      // Done
      return true;
    } catch (e) {
      console.warn("Failed to create/adopt Electron tray:", e);
      return false;
    }
  }

  private getNativeTheme(): any | null {
    try {
      const electron = this.getElectron();
      return (electron as any)?.nativeTheme || (electron as any)?.remote?.nativeTheme || null;
    } catch { return null; }
  }

  private isDarkTheme(): boolean {
    const nt = this.getNativeTheme();
    if (nt && typeof nt.shouldUseDarkColors === "boolean") return nt.shouldUseDarkColors;
    try { return window.matchMedia("(prefers-color-scheme: dark)").matches; } catch { return false; }
  }

  private async applyThemeToTray(nativeImage: any): Promise<void> {
    if (!this.electronTray) return;
    const isDark = this.isDarkTheme();
    const color = isDark ? "#FFFFFF" : "#000000";
    const img = await this.buildTrayNativeImage(nativeImage, color);
    try { this.electronTray.setImage?.(img); } catch {}
  }

  private subscribeNativeTheme(nativeImage: any): void {
    const nt = this.getNativeTheme();
    try {
      if (!nt) return;
      const handler = () => { this.applyThemeToTray(nativeImage).catch(() => {}); };
      nt.removeAllListeners?.("updated");
      nt.on?.("updated", handler);
    } catch {}
  }

  private async buildTrayNativeImage(nativeImage: any, color?: string): Promise<any> {
    try {
      const size = Platform.isMacOS ? 14 : 24;
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return nativeImage.createEmpty();

      // Get the actual color to use - default to current theme color
      const actualColor = color || this.getCurrentThemeColor();

      // Use Task Genius icon for all platforms with theme-aware color
      const svg = this.generateThemedTaskGeniusIcon(actualColor);
      const img = new Image();
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = url; });
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);

      const dataUrl = canvas.toDataURL("image/png");
      const ni = nativeImage.createFromDataURL(dataUrl);
      
      // Set as template image on macOS for automatic theme adaptation
      try { 
        if (Platform.isMacOS && ni.setTemplateImage) {
          ni.setTemplateImage(true);
        }
      } catch {}
      
      return ni;
    } catch {
      return nativeImage.createEmpty();
    }
  }

  private getCurrentThemeColor(): string {
    // Get current theme color based on system preference
    const isDark = this.isDarkTheme();
    // Use CSS variable or default colors
    const styles = getComputedStyle(document.body);
    const currentColor = styles.getPropertyValue('--text-normal')?.trim() || 
                        (isDark ? '#FFFFFF' : '#000000');
    return currentColor;
  }

  private generateThemedTaskGeniusIcon(color: string): string {
    // Get the original Task Genius icon and replace currentColor with the theme color
    const originalSvg = getTaskGeniusIcon();
    // Replace all instances of currentColor with the dynamic color
    return originalSvg.replace(/currentColor/g, color);
  }


  // Helper: identify ICS badge tasks to exclude from tray/status menus
  private isIcsBadge(task: Task): boolean {
    try {
      const srcType = (task as any)?.metadata?.source?.type ?? (task as any)?.source?.type;
      const isIcs = srcType === "ics";
      const isBadge = ((task as any)?.badge === true) || ((task as any)?.icsEvent?.source?.showType === "badge");
      return !!(isIcs && isBadge);
    } catch { return false; }
  }


  // Helper: identify any ICS-derived task (to exclude from summaries/menus)
  private isIcsTask(task: Task): boolean {
    try {
      if (typeof task.filePath === "string" && task.filePath.startsWith("ics://")) return true;
      const srcType = (task as any)?.metadata?.source?.type ?? (task as any)?.source?.type;
      return srcType === "ics";
    } catch { return false; }
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
      if (this.isIcsBadge(task)) continue; // skip ICS badges
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

      // Count overdue + due today (exclude ICS badges)
      const allTasks = (await queryAPI.getAllTasks()) as Task[];
      const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
      const pending = allTasks
        .filter(t => !t.completed && t.metadata?.dueDate && t.metadata.dueDate <= todayEnd.getTime())
        .filter(t => !this.isIcsBadge(t));

      // macOS 可以设置文字，Windows/Linux 更新 tooltip
      try {
        if (Platform.isMacOS && this.electronTray.setTitle) {
          this.electronTray.setTitle(pending.length > 0 ? ` ${pending.length} ${t("Tasks")}` : (" " + t("No Tasks")));
        }
      } catch {}
      try { this.electronTray.setToolTip?.(pending.length > 0 ? `${pending.length} ${t("tasks due or overdue")}` : t("No due today")); } catch {}

      // Build context menu via helper
      const builder = new TrayMenuBuilder(this.plugin);
      await builder.applyToTray(this.electronTray, {
        openVault: () => this.openVault(),
        openTaskView: () => { try { (this.plugin as TaskProgressBarPlugin).activateTaskView?.(); } catch {} },
        openTask: (task: Task) => this.openTask(task),
        completeTask: (id: string) => this.completeTask(id),
        postponeTask: (task: Task, offsetMs: number) => this.postponeTask(task, offsetMs),
        setPriority: (task: Task, level: number) => this.setPriority(task, level),
        pickCustomDate: (task: Task) => this.openDatePickerForTask(task),
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
    const trayMode = this.plugin.settings.desktopIntegration?.trayMode || "status";
    if (!(trayMode === "status" || trayMode === "both")) return;
    const queryAPI = this.getQueryAPI();
    if (!queryAPI) return;

    // Count overdue + upcoming (next 24h), exclude ICS badges
    const allTasks = (await queryAPI.getAllTasks()) as Task[];
    const horizon = Date.now() + 24 * 60 * 60 * 1000; // next 24h
    const pending = allTasks
      .filter(t => !t.completed && t.metadata?.dueDate && t.metadata.dueDate <= horizon)
      .filter(t => !this.isIcsBadge(t));

    if (!this.statusBarItem) {
      this.createOrUpdateStatusBar();
    }
    if (this.statusBarItem) {
      this.statusBarItem.empty();
      const btn = this.statusBarItem.createEl("span", { cls: "task-genius-tray" });
      btn.textContent = pending.length > 0 ? `${pending.length} ${t("Tasks")}` : t("No Tasks");
      btn.style.cursor = "pointer";
      btn.onclick = async (ev) => {
        // Build an Obsidian menu that mirrors system tray quick actions using internal submenu API
        const menu = new Menu();
        menu.addItem((i: any) => { i.setTitle("Open Task Genius").setIcon("task-genius").onClick(() => { try { (this.plugin as any).activateTaskView?.(); } catch {} }); });
        menu.addItem((i: any) => { i.setTitle("Send Daily Summary").setIcon("send").onClick(() => this.sendDailySummary()); });
        menu.addSeparator();

        // Show top 7 tasks within horizon
        const topTasks = pending.sort((a,b) => (a.metadata?.dueDate||0)-(b.metadata?.dueDate||0)).slice(0,7);
        for (const t of topTasks) {
          const label = t.content.length > 50 ? t.content.slice(0,50)+"…" : t.content;
          menu.addItem((i: any) => {
            i.setTitle(label).setIcon("circle-dot");
            const submenu = i.setSubmenu?.();
            if (submenu) {
              submenu.addItem((ii: any) => ii.setTitle("Edit in file").setIcon("file-pen").onClick(() => this.openTask(t)));
              submenu.addItem((ii: any) => ii.setTitle("Complete").setIcon("check").onClick(() => this.completeTask(t.id)));
              submenu.addSeparator();
              submenu.addItem((ii: any) => ii.setTitle("Snooze 1d").setIcon("calendar").onClick(() => this.postponeTask(t, 1*24*60*60_000)));
              submenu.addItem((ii: any) => ii.setTitle("Snooze 2d").setIcon("calendar").onClick(() => this.postponeTask(t, 2*24*60*60_000)));
              submenu.addItem((ii: any) => ii.setTitle("Snooze 3d").setIcon("calendar").onClick(() => this.postponeTask(t, 3*24*60*60_000)));
              submenu.addItem((ii: any) => ii.setTitle("Snooze 1w").setIcon("calendar").onClick(() => this.postponeTask(t, 7*24*60*60_000)));
              submenu.addItem((ii: any) => ii.setTitle("Custom date…").setIcon("calendar-plus").onClick(() => this.openDatePickerForTask(t)));
              submenu.addSeparator();
              submenu.addItem((ii: any) => {
                ii.setTitle("Priority").setIcon("flag");
                const p = ii.setSubmenu?.();
                p?.addItem((pp: any) => pp.setTitle("🔺 Highest").onClick(() => this.setPriority(t,5)));
                p?.addItem((pp: any) => pp.setTitle("⏫ High").onClick(() => this.setPriority(t,4)));
                p?.addItem((pp: any) => pp.setTitle("🔼 Medium").onClick(() => this.setPriority(t,3)));
                p?.addItem((pp: any) => pp.setTitle("🔽 Low").onClick(() => this.setPriority(t,2)));
                p?.addItem((pp: any) => pp.setTitle("⏬️ Lowest").onClick(() => this.setPriority(t,1)));
              });
            }
          });
        }

        if (topTasks.length === 0) {
          menu.addItem((i: any) => i.setTitle("No due or upcoming").setDisabled(true));
        }

        menu.addSeparator();
        menu.addItem((i: any) => i.setTitle("Refresh").setIcon("refresh-ccw").onClick(() => { this.updateStatusBar(); this.updateTray(); }));

        menu.showAtMouseEvent(ev as any);
      };
      btn.title = pending.length > 0 ? `${pending.length} tasks due or upcoming` : "No due or upcoming";
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
      const all = (await queryAPI.getAllTasks()) as Task[];
      const { from, to } = this.getDueTodayRange();
      // include overdue + due today, exclude ICS
      const pending = all.filter((t) => {
        if (t.completed || !t.metadata?.dueDate) return false;
        if (this.isIcsTask(t) || this.isIcsBadge(t)) return false;
        const due = t.metadata.dueDate;
        return due >= from && due <= to;
      });
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

  private async setPriority(task: Task, level: number): Promise<void> {
    try {
      await this.plugin.writeAPI?.updateTask({
        taskId: task.id,
        updates: { metadata: { ...(task.metadata || { tags: [] as string[] }), priority: level } as any },
      });
    } catch {}
  }

  private async openDatePickerForTask(task: Task): Promise<void> {
    try {
      const { DatePickerModal } = await import("@/components/ui/date-picker/DatePickerModal");
      const modal = new DatePickerModal(this.plugin.app as any, this.plugin, undefined, "📅");
      modal.onDateSelected = async (dateStr) => {
        if (!dateStr) return;
        const m = (window as any).moment?.(dateStr) || (this.plugin.app as any).moment?.(dateStr);
        const ts = m?.valueOf?.();
        if (!ts) return;
        await this.plugin.writeAPI?.updateTask({
          taskId: task.id,
          updates: { metadata: { ...(task.metadata || { tags: [] as string[] }), dueDate: ts } as any },
        });
      };
      modal.open();
    } catch {}
  }

  private async postponeTask(task: Task, offsetMs: number): Promise<void> {
    // Snooze based on "now" rather than existing due
    const base = Date.now();
    const newDue = base + offsetMs;
    try {
      await this.plugin.writeAPI?.updateTask({
        taskId: task.id,
        updates: { metadata: { ...(task.metadata || { tags: [] as string[] }), dueDate: newDue } as any },
      });
    } catch {}
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

