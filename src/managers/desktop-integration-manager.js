import { __awaiter } from "tslib";
import { Component, Notice, Platform, TFile, Menu } from "obsidian";
import { TrayMenuBuilder } from "./tray-menu";
import { getTaskGeniusIcon } from "../icon";
import { t } from "@/translations/helper";
import { ElectronQuickCapture } from "./electron-quick-capture";
/** Desktop integration manager for system tray, notifications, and desktop features */
export class DesktopIntegrationManager extends Component {
    constructor(plugin) {
        super();
        this.plugin = plugin;
        this.dailyTimeout = null;
        this.midnightTimeout = null;
        this.notifiedKeys = new Set();
        this.statusBarItem = null;
        this.electronTray = null;
    }
    onload() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            // Initialize on load
            if (!Platform.isDesktopApp)
                return;
            // Initialize quick capture manager
            this.electronQuickCapture = new ElectronQuickCapture(this.plugin);
            // Minimal-change safeguard for hard reloads (window.location)
            try {
                this.beforeUnloadHandler = () => {
                    var _a, _b, _c, _d, _e;
                    try {
                        (_b = (_a = this.electronTray) === null || _a === void 0 ? void 0 : _a.removeAllListeners) === null || _b === void 0 ? void 0 : _b.call(_a);
                        const g = window;
                        const globalKey = "__tg_tray_singleton__" + this.plugin.app.appId;
                        // Only destroy the tray if we own it
                        if (((_c = g[globalKey]) === null || _c === void 0 ? void 0 : _c.owner) === this.trayOwnerToken) {
                            (_e = (_d = this.electronTray) === null || _d === void 0 ? void 0 : _d.destroy) === null || _e === void 0 ? void 0 : _e.call(_d);
                            delete g[globalKey];
                        }
                    }
                    catch (_f) { }
                };
                this.registerDomEvent(window, "beforeunload", this.beforeUnloadHandler);
                this.register(() => {
                    if (this.beforeUnloadHandler) {
                        window.removeEventListener("beforeunload", this.beforeUnloadHandler);
                        this.beforeUnloadHandler = undefined;
                    }
                });
            }
            catch (_c) { }
            const trayMode = ((_a = this.plugin.settings.desktopIntegration) === null || _a === void 0 ? void 0 : _a.trayMode) || "status";
            // System tray (if allowed) — defer to avoid blocking plugin load
            if (trayMode === "system" || trayMode === "both") {
                if ((_b = this.plugin.settings.desktopIntegration) === null || _b === void 0 ? void 0 : _b.enableTray) {
                    setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                        const trayOk = yield this.createOrAdoptElectronTray();
                        if (!trayOk && trayMode === "system") {
                            // Fallback to status bar if system tray not available
                            this.createOrUpdateStatusBar();
                        }
                        // Ensure tray reflects current state after creation
                        this.updateTray().catch(() => { });
                    }), 0);
                }
            }
            // Status bar indicator
            if (trayMode === "status" || trayMode === "both") {
                this.createOrUpdateStatusBar();
            }
            this.setupDailySummary();
            this.startPerTaskTicker();
            // Initial updates
            this.updateStatusBar().catch(() => { });
            this.updateTray().catch(() => { });
        });
    }
    onunload() {
        var _a, _b, _c, _d, _e, _f, _g;
        console.log("[TrayDebug] onunload called");
        if (this.dailyTimeout)
            window.clearTimeout(this.dailyTimeout);
        if (this.midnightTimeout)
            window.clearTimeout(this.midnightTimeout);
        this.dailyTimeout = null;
        this.midnightTimeout = null;
        this.notifiedKeys.clear();
        if (this.statusBarItem) {
            console.log("[TrayDebug] Detaching status bar item");
            this.statusBarItem.detach();
            this.statusBarItem = null;
        }
        // Remove beforeunload window listener if registered
        if (this.beforeUnloadHandler) {
            window.removeEventListener("beforeunload", this.beforeUnloadHandler);
            this.beforeUnloadHandler = undefined;
        }
        // Clean up tray properly
        const globalKey = "__tg_tray_singleton__" + this.plugin.app.appId;
        const g = window;
        if (this.electronTray) {
            console.log("[TrayDebug] Cleaning up electron tray");
            try {
                // Remove all listeners first
                (_b = (_a = this.electronTray).removeAllListeners) === null || _b === void 0 ? void 0 : _b.call(_a);
                // Only destroy if we own this tray
                if (((_c = g[globalKey]) === null || _c === void 0 ? void 0 : _c.owner) === this.trayOwnerToken) {
                    console.log("[TrayDebug] Destroying owned tray");
                    (_e = (_d = this.electronTray).destroy) === null || _e === void 0 ? void 0 : _e.call(_d);
                    // Clear the global reference since we destroyed it
                    delete g[globalKey];
                }
                else {
                    console.log("[TrayDebug] Not destroying tray - not owner");
                    // If we don't own it, replace context menu with an empty one to drop closures referencing this instance
                    try {
                        const electron = this.getElectron();
                        const Menu = (electron === null || electron === void 0 ? void 0 : electron.Menu) || ((_f = electron === null || electron === void 0 ? void 0 : electron.remote) === null || _f === void 0 ? void 0 : _f.Menu);
                        if (Menu && ((_g = this.electronTray) === null || _g === void 0 ? void 0 : _g.setContextMenu)) {
                            this.electronTray.setContextMenu(Menu.buildFromTemplate([]));
                        }
                    }
                    catch (_h) { }
                    // Also clear any stored global click handler reference
                    if (g[globalKey]) {
                        g[globalKey].clickHandler = undefined;
                    }
                }
            }
            catch (e) {
                console.error("[TrayDebug] Error cleaning up tray:", e);
            }
        }
        this.electronTray = null;
        this.trayOwnerToken = undefined;
        // Clean up quick capture
        if (this.electronQuickCapture) {
            this.electronQuickCapture.destroy();
            this.electronQuickCapture = undefined;
        }
    }
    // Called when settings change
    reloadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("[TrayDebug] reloadSettings called");
            this.onunload();
            // Add a small delay to ensure cleanup completes
            yield new Promise((resolve) => setTimeout(resolve, 100));
            yield this.onload();
            console.log("[TrayDebug] reloadSettings completed");
        });
    }
    // External nudge when task cache updates
    onTaskCacheUpdated() {
        // Do a quick pass to catch any imminently due items
        this.scanAndNotifyPerTask().catch(() => { });
        // Update status bar counts
        this.updateStatusBar().catch(() => { });
        this.updateTray().catch(() => { });
    }
    // Public triggers for settings/actions
    triggerDailySummary() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.sendDailySummary();
        });
    }
    triggerImminentScan() {
        this.scanAndNotifyPerTask().catch(() => { });
    }
    getQueryAPI() {
        var _a;
        const df = this.plugin.dataflowOrchestrator;
        if (!df)
            return null;
        return (_a = df.getQueryAPI) === null || _a === void 0 ? void 0 : _a.call(df);
    }
    getElectron() {
        try {
            // Prefer window.electron injected by preload (per your change)
            const injected = window.electron || globalThis.electron;
            if (injected)
                return injected;
            // Fallback to require when available
            const req = window.require || globalThis.require;
            return req ? req("electron") : null;
        }
        catch (_a) {
            return null;
        }
    }
    createOrAdoptElectronTray() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log("[TrayDebug] createOrAdoptElectronTray called");
                const electron = this.getElectron();
                if (!electron) {
                    console.log("[TrayDebug] No electron available");
                    return false;
                }
                // Prefer creating tray in main process via remote when available
                const Tray = ((_a = electron.remote) === null || _a === void 0 ? void 0 : _a.Tray) || electron.Tray;
                const nativeImage = ((_b = electron.remote) === null || _b === void 0 ? void 0 : _b.nativeImage) ||
                    electron.nativeImage;
                if (!Tray || !nativeImage) {
                    console.log("[TrayDebug] Tray or nativeImage not available");
                    return false;
                }
                // Reuse existing tray if global singleton exists
                const globalKey = "__tg_tray_singleton__" + this.plugin.app.appId;
                const g = window;
                if (((_c = g[globalKey]) === null || _c === void 0 ? void 0 : _c.tray) && ((_d = g[globalKey]) === null || _d === void 0 ? void 0 : _d.owner)) {
                    console.log("[TrayDebug] Checking existing tray...");
                    // Check if the tray is still valid (not destroyed)
                    try {
                        // Try to access a property to check if tray is alive
                        const isDestroyed = (_g = (_f = (_e = g[globalKey].tray).isDestroyed) === null || _f === void 0 ? void 0 : _f.call(_e)) !== null && _g !== void 0 ? _g : false;
                        if (isDestroyed) {
                            console.log("[TrayDebug] Existing tray is destroyed, cleaning up");
                            delete g[globalKey];
                        }
                        else {
                            console.log("[TrayDebug] Adopting existing valid tray");
                            // Adopt existing tray - don't recreate
                            this.electronTray = g[globalKey].tray;
                            this.trayOwnerToken = g[globalKey].owner;
                            try {
                                // Ensure no stale listeners from previous instance remain
                                (_j = (_h = this.electronTray).removeAllListeners) === null || _j === void 0 ? void 0 : _j.call(_h);
                                // Attach a fresh click handler bound to this instance
                                const clickHandler = () => __awaiter(this, void 0, void 0, function* () {
                                    var _y, _z;
                                    yield this.sendDailySummary();
                                    try {
                                        (_z = (_y = this.plugin).activateTaskView) === null || _z === void 0 ? void 0 : _z.call(_y);
                                    }
                                    catch (_0) { }
                                });
                                (_l = (_k = this.electronTray).on) === null || _l === void 0 ? void 0 : _l.call(_k, "click", clickHandler);
                                // Replace global click handler reference to avoid pinning old plugin instance
                                g[globalKey].clickHandler = clickHandler;
                                yield this.applyThemeToTray(nativeImage);
                                this.subscribeNativeTheme(nativeImage);
                            }
                            catch (_u) { }
                            return true;
                        }
                    }
                    catch (e) {
                        console.log("[TrayDebug] Error checking tray validity:", e);
                        delete g[globalKey];
                    }
                }
                // Create a new tray and apply theme-based icon
                console.log("[TrayDebug] Creating new tray");
                this.electronTray = new Tray(nativeImage.createEmpty());
                try {
                    this.electronTray.setToolTip("Task Genius");
                }
                catch (_v) { }
                try {
                    yield this.applyThemeToTray(nativeImage);
                    this.subscribeNativeTheme(nativeImage);
                }
                catch (_w) { }
                // Store click handler reference for cleanup
                this.trayClickHandler = () => __awaiter(this, void 0, void 0, function* () {
                    var _1, _2;
                    yield this.sendDailySummary();
                    try {
                        (_2 = (_1 = this.plugin).activateTaskView) === null || _2 === void 0 ? void 0 : _2.call(_1);
                    }
                    catch (_3) { }
                });
                (_o = (_m = this.electronTray).removeAllListeners) === null || _o === void 0 ? void 0 : _o.call(_m);
                (_q = (_p = this.electronTray).on) === null || _q === void 0 ? void 0 : _q.call(_p, "click", this.trayClickHandler);
                // Save globally so subsequent reloads reuse it
                const owner = Symbol("tg-tray-owner");
                // Ensure we don't leak multiple listeners on HMR/reloads
                try {
                    (_t = (_s = (_r = g[globalKey]) === null || _r === void 0 ? void 0 : _r.tray) === null || _s === void 0 ? void 0 : _s.removeAllListeners) === null || _t === void 0 ? void 0 : _t.call(_s);
                }
                catch (_x) { }
                g[globalKey] = {
                    tray: this.electronTray,
                    owner,
                    clickHandler: this.trayClickHandler,
                };
                this.trayOwnerToken = owner;
                console.log("[TrayDebug] New tray created and saved globally");
                // Done
                return true;
            }
            catch (e) {
                console.warn("Failed to create/adopt Electron tray:", e);
                return false;
            }
        });
    }
    getNativeTheme() {
        var _a;
        try {
            const electron = this.getElectron();
            return ((electron === null || electron === void 0 ? void 0 : electron.nativeTheme) ||
                ((_a = electron === null || electron === void 0 ? void 0 : electron.remote) === null || _a === void 0 ? void 0 : _a.nativeTheme) ||
                null);
        }
        catch (_b) {
            return null;
        }
    }
    isDarkTheme() {
        const nt = this.getNativeTheme();
        if (nt && typeof nt.shouldUseDarkColors === "boolean")
            return nt.shouldUseDarkColors;
        try {
            return window.matchMedia("(prefers-color-scheme: dark)").matches;
        }
        catch (_a) {
            return false;
        }
    }
    applyThemeToTray(nativeImage) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            console.log(this.electronTray, "tray");
            if (!this.electronTray)
                return;
            // For macOS, always use black and let Template Image handle theme
            // For Windows/Linux, manually set color based on theme
            const useTemplateImage = Platform.isMacOS;
            const img = yield this.buildTrayNativeImage(nativeImage, useTemplateImage);
            try {
                (_b = (_a = this.electronTray).setImage) === null || _b === void 0 ? void 0 : _b.call(_a, img);
            }
            catch (_c) { }
        });
    }
    subscribeNativeTheme(nativeImage) {
        var _a, _b, _c, _d, _e, _f;
        const nt = this.getNativeTheme();
        try {
            if (!nt)
                return;
            // Remove only our previous handler to avoid interfering with others
            if (this.nativeThemeHandler) {
                try {
                    (_b = (_a = nt).off) === null || _b === void 0 ? void 0 : _b.call(_a, "updated", this.nativeThemeHandler);
                }
                catch (_g) { }
                try {
                    (_d = (_c = nt).removeListener) === null || _d === void 0 ? void 0 : _d.call(_c, "updated", this.nativeThemeHandler);
                }
                catch (_h) { }
            }
            const handler = () => {
                console.log("[TrayDebug] Theme changed, updating tray icon");
                this.applyThemeToTray(nativeImage).catch(() => { });
            };
            this.nativeThemeHandler = handler;
            (_f = (_e = nt).on) === null || _f === void 0 ? void 0 : _f.call(_e, "updated", handler);
            // Ensure cleanup on unload
            try {
                // @ts-ignore Component.register exists to register disposers
                this.register(() => {
                    var _a, _b;
                    const ntt = this.getNativeTheme();
                    try {
                        (_a = ntt === null || ntt === void 0 ? void 0 : ntt.off) === null || _a === void 0 ? void 0 : _a.call(ntt, "updated", handler);
                    }
                    catch (_c) { }
                    try {
                        (_b = ntt === null || ntt === void 0 ? void 0 : ntt.removeListener) === null || _b === void 0 ? void 0 : _b.call(ntt, "updated", handler);
                    }
                    catch (_d) { }
                });
            }
            catch (_j) { }
        }
        catch (_k) { }
    }
    buildTrayNativeImage(nativeImage, useTemplateImage = false) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const size = Platform.isMacOS ? 14 : 24;
                const canvas = document.createElement("canvas");
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext("2d");
                if (!ctx)
                    return nativeImage.createEmpty();
                // For Template Images (macOS), always use black
                // For regular images (Windows/Linux), use neutral gray
                let actualColor;
                if (useTemplateImage) {
                    // Template images should be pure black - macOS will handle inversion
                    actualColor = "#000000";
                }
                else {
                    // For Windows/Linux, use a neutral gray that works on any background
                    // #666666 provides good contrast on both light and dark backgrounds
                    actualColor = "#c7c7c7ff";
                }
                // Use Task Genius icon with appropriate color
                const svg = this.generateThemedTaskGeniusIcon(actualColor);
                const img = new Image();
                const blob = new Blob([svg], { type: "image/svg+xml" });
                const url = URL.createObjectURL(blob);
                yield new Promise((resolve) => {
                    img.onload = () => resolve();
                    img.src = url;
                });
                ctx.clearRect(0, 0, size, size);
                ctx.drawImage(img, 0, 0, size, size);
                URL.revokeObjectURL(url);
                const dataUrl = canvas.toDataURL("image/png");
                const ni = nativeImage.createFromDataURL(dataUrl);
                // Set as template image if requested (macOS)
                try {
                    if (useTemplateImage && ni.setTemplateImage) {
                        console.log("[TrayDebug] Setting as template image");
                        ni.setTemplateImage(true);
                    }
                }
                catch (_a) { }
                return ni;
            }
            catch (_b) {
                return nativeImage.createEmpty();
            }
        });
    }
    getCurrentThemeColor() {
        var _a;
        // Get current theme color based on system preference
        const isDark = this.isDarkTheme();
        // Use CSS variable or default colors
        const styles = getComputedStyle(document.body);
        const currentColor = ((_a = styles.getPropertyValue("--text-normal")) === null || _a === void 0 ? void 0 : _a.trim()) ||
            (isDark ? "#FFFFFF" : "#000000");
        return currentColor;
    }
    generateThemedTaskGeniusIcon(color) {
        // Get the original Task Genius icon and replace currentColor with the theme color
        const originalSvg = getTaskGeniusIcon();
        // Replace all instances of currentColor with the dynamic color
        return originalSvg.replace(/currentColor/g, color);
    }
    // Helper: identify ICS badge tasks to exclude from tray/status menus
    isIcsBadge(task) {
        var _a, _b, _c, _d, _e, _f;
        try {
            const srcType = (_c = (_b = (_a = task === null || task === void 0 ? void 0 : task.metadata) === null || _a === void 0 ? void 0 : _a.source) === null || _b === void 0 ? void 0 : _b.type) !== null && _c !== void 0 ? _c : (_d = task === null || task === void 0 ? void 0 : task.source) === null || _d === void 0 ? void 0 : _d.type;
            const isIcs = srcType === "ics";
            const isBadge = (task === null || task === void 0 ? void 0 : task.badge) === true ||
                ((_f = (_e = task === null || task === void 0 ? void 0 : task.icsEvent) === null || _e === void 0 ? void 0 : _e.source) === null || _f === void 0 ? void 0 : _f.showType) === "badge";
            return !!(isIcs && isBadge);
        }
        catch (_g) {
            return false;
        }
    }
    // Helper: identify any ICS-derived task (to exclude from summaries/menus)
    isIcsTask(task) {
        var _a, _b, _c, _d;
        try {
            if (typeof task.filePath === "string" &&
                task.filePath.startsWith("ics://"))
                return true;
            const srcType = (_c = (_b = (_a = task === null || task === void 0 ? void 0 : task.metadata) === null || _a === void 0 ? void 0 : _a.source) === null || _b === void 0 ? void 0 : _b.type) !== null && _c !== void 0 ? _c : (_d = task === null || task === void 0 ? void 0 : task.source) === null || _d === void 0 ? void 0 : _d.type;
            return srcType === "ics";
        }
        catch (_e) {
            return false;
        }
    }
    getDueTodayRange() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return { from: today.getTime(), to: tomorrow.getTime() };
    }
    startPerTaskTicker() {
        var _a, _b;
        const cfg = (_a = this.plugin.settings.notifications) === null || _a === void 0 ? void 0 : _a.perTask;
        const enabled = !!((_b = this.plugin.settings.notifications) === null || _b === void 0 ? void 0 : _b.enabled) && !!(cfg === null || cfg === void 0 ? void 0 : cfg.enabled);
        if (!enabled)
            return;
        // Immediate scan
        this.scanAndNotifyPerTask().catch(() => { });
        // Then every minute
        this.registerInterval(window.setInterval(() => {
            this.scanAndNotifyPerTask().catch(() => { });
        }, 60000));
        // Reset notified keys at midnight
        this.scheduleMidnightReset();
    }
    scheduleMidnightReset() {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        const ms = midnight.getTime() - now.getTime();
        this.midnightTimeout = window.setTimeout(() => {
            this.notifiedKeys.clear();
            this.scheduleMidnightReset();
            this.updateStatusBar().catch(() => { });
            this.updateTray().catch(() => { });
        }, ms);
    }
    scanAndNotifyPerTask() {
        var _a, _b, _c, _d, _e, _f;
        return __awaiter(this, void 0, void 0, function* () {
            const cfg = (_a = this.plugin.settings.notifications) === null || _a === void 0 ? void 0 : _a.perTask;
            if (!cfg ||
                !((_b = this.plugin.settings.notifications) === null || _b === void 0 ? void 0 : _b.enabled) ||
                !cfg.enabled)
                return;
            const queryAPI = this.getQueryAPI();
            if (!queryAPI)
                return;
            // Prefer sync cache for speed; fall back to async if empty
            const all = (_c = queryAPI.getAllTasksSync) === null || _c === void 0 ? void 0 : _c.call(queryAPI);
            const tasks = (all && all.length ? all : yield queryAPI.getAllTasks());
            const leadMs = Math.max(0, ((_d = cfg.leadMinutes) !== null && _d !== void 0 ? _d : 0) * 60000);
            const now = Date.now();
            const windowEnd = now + 60000; // next minute
            for (const task of tasks) {
                if (task.completed)
                    continue;
                if (this.isIcsBadge(task))
                    continue; // skip ICS badges
                const due = (_e = task.metadata) === null || _e === void 0 ? void 0 : _e.dueDate;
                if (!due)
                    continue;
                const fireAt = due - leadMs;
                if (fireAt >= now && fireAt < windowEnd) {
                    const key = `${task.id ||
                        ((_f = task.metadata) === null || _f === void 0 ? void 0 : _f.id) ||
                        task.filePath + ":" + task.line}@${due}`;
                    if (this.notifiedKeys.has(key))
                        continue;
                    this.notifiedKeys.add(key);
                    this.showTaskDueNotification(task, due, leadMs);
                }
            }
        });
    }
    updateTray() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.electronTray)
                return;
            try {
                const queryAPI = this.getQueryAPI();
                if (!queryAPI)
                    return;
                // Count overdue + due today (exclude ICS badges)
                const allTasks = (yield queryAPI.getAllTasks());
                const todayEnd = new Date();
                todayEnd.setHours(23, 59, 59, 999);
                const pending = allTasks
                    .filter((t) => {
                    var _a;
                    return !t.completed &&
                        ((_a = t.metadata) === null || _a === void 0 ? void 0 : _a.dueDate) &&
                        t.metadata.dueDate <= todayEnd.getTime();
                })
                    .filter((t) => !this.isIcsBadge(t));
                // macOS 可以设置文字，Windows/Linux 更新 tooltip
                try {
                    if (Platform.isMacOS && this.electronTray.setTitle) {
                        this.electronTray.setTitle(pending.length > 0
                            ? ` ${pending.length} ${t("Tasks")}`
                            : " " + t("No Tasks"));
                    }
                }
                catch (_c) { }
                try {
                    (_b = (_a = this.electronTray).setToolTip) === null || _b === void 0 ? void 0 : _b.call(_a, pending.length > 0
                        ? `${pending.length} ${t("tasks due or overdue")}`
                        : t("No due today"));
                }
                catch (_d) { }
                // Build context menu via helper
                const builder = new TrayMenuBuilder(this.plugin);
                yield builder.applyToTray(this.electronTray, {
                    openVault: () => this.openVault(),
                    openTaskView: () => {
                        var _a, _b;
                        try {
                            (_b = (_a = this.plugin).activateTaskView) === null || _b === void 0 ? void 0 : _b.call(_a);
                        }
                        catch (_c) { }
                    },
                    openTask: (task) => this.openTask(task),
                    completeTask: (id) => this.completeTask(id),
                    postponeTask: (task, offsetMs) => this.postponeTask(task, offsetMs),
                    setPriority: (task, level) => this.setPriority(task, level),
                    pickCustomDate: (task) => this.openDatePickerForTask(task),
                    sendDaily: () => this.sendDailySummary(),
                    quickCapture: () => this.openQuickCaptureWindow(),
                });
            }
            catch (e) {
                console.warn("Failed to update tray:", e);
            }
        });
    }
    setupDailySummary() {
        var _a, _b;
        const cfg = (_a = this.plugin.settings.notifications) === null || _a === void 0 ? void 0 : _a.dailySummary;
        const enabled = !!((_b = this.plugin.settings.notifications) === null || _b === void 0 ? void 0 : _b.enabled) && !!(cfg === null || cfg === void 0 ? void 0 : cfg.enabled);
        if (!enabled)
            return;
        const time = cfg.time || "09:00";
        const [hh, mm] = time.split(":").map((n) => parseInt(n, 10));
        const now = new Date();
        const target = new Date();
        target.setHours(hh || 9, mm || 0, 0, 0);
        if (target.getTime() <= now.getTime()) {
            target.setDate(target.getDate() + 1);
        }
        const ms = target.getTime() - now.getTime();
        this.dailyTimeout = window.setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            yield this.sendDailySummary();
            // Reschedule next day
            this.setupDailySummary();
        }), ms);
    }
    updateStatusBar() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const trayMode = ((_a = this.plugin.settings.desktopIntegration) === null || _a === void 0 ? void 0 : _a.trayMode) || "status";
            if (!(trayMode === "status" || trayMode === "both"))
                return;
            const queryAPI = this.getQueryAPI();
            if (!queryAPI)
                return;
            // Count overdue + due today, exclude ICS badges
            const allTasks = (yield queryAPI.getAllTasks());
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);
            const pending = allTasks
                .filter((t) => {
                var _a;
                return !t.completed &&
                    ((_a = t.metadata) === null || _a === void 0 ? void 0 : _a.dueDate) &&
                    t.metadata.dueDate <= todayEnd.getTime();
            })
                .filter((t) => !this.isIcsBadge(t));
            if (!this.statusBarItem) {
                this.createOrUpdateStatusBar();
            }
            if (this.statusBarItem) {
                this.statusBarItem.empty();
                const btn = this.statusBarItem.createEl("span", {
                    cls: "task-genius-tray",
                });
                btn.textContent =
                    pending.length > 0
                        ? `${pending.length} ${t("Tasks")}`
                        : t("No Tasks");
                btn.style.cursor = "pointer";
                btn.onclick = (ev) => __awaiter(this, void 0, void 0, function* () {
                    // Build an Obsidian menu that mirrors system tray quick actions using internal submenu API
                    const menu = new Menu();
                    menu.addItem((i) => {
                        i.setTitle("Open Task Genius")
                            .setIcon("task-genius")
                            .onClick(() => {
                            var _a, _b;
                            try {
                                (_b = (_a = this.plugin).activateTaskView) === null || _b === void 0 ? void 0 : _b.call(_a);
                            }
                            catch (_c) { }
                        });
                    });
                    menu.addSeparator();
                    menu.addItem((i) => {
                        i.setTitle("Quick Capture...")
                            .setIcon("plus-circle")
                            .onClick(() => {
                            this.openQuickCaptureWindow();
                        });
                    });
                    menu.addSeparator();
                    // Show top 7 tasks within horizon
                    const topTasks = pending
                        .sort((a, b) => {
                        var _a, _b;
                        return (((_a = a.metadata) === null || _a === void 0 ? void 0 : _a.dueDate) || 0) -
                            (((_b = b.metadata) === null || _b === void 0 ? void 0 : _b.dueDate) || 0);
                    })
                        .slice(0, 7);
                    for (const t of topTasks) {
                        const label = t.content.length > 50
                            ? t.content.slice(0, 50) + "…"
                            : t.content;
                        menu.addItem((i) => {
                            var _a;
                            i.setTitle(label).setIcon("circle-dot");
                            const submenu = (_a = i.setSubmenu) === null || _a === void 0 ? void 0 : _a.call(i);
                            if (submenu) {
                                submenu.addItem((ii) => ii
                                    .setTitle("Edit in file")
                                    .setIcon("file-pen")
                                    .onClick(() => this.openTask(t)));
                                submenu.addItem((ii) => ii
                                    .setTitle("Complete")
                                    .setIcon("check")
                                    .onClick(() => this.completeTask(t.id)));
                                submenu.addSeparator();
                                submenu.addItem((ii) => ii
                                    .setTitle("Snooze 1d")
                                    .setIcon("calendar")
                                    .onClick(() => this.postponeTask(t, 1 * 24 * 60 * 60000)));
                                submenu.addItem((ii) => ii
                                    .setTitle("Snooze 2d")
                                    .setIcon("calendar")
                                    .onClick(() => this.postponeTask(t, 2 * 24 * 60 * 60000)));
                                submenu.addItem((ii) => ii
                                    .setTitle("Snooze 3d")
                                    .setIcon("calendar")
                                    .onClick(() => this.postponeTask(t, 3 * 24 * 60 * 60000)));
                                submenu.addItem((ii) => ii
                                    .setTitle("Snooze 1w")
                                    .setIcon("calendar")
                                    .onClick(() => this.postponeTask(t, 7 * 24 * 60 * 60000)));
                                submenu.addItem((ii) => ii
                                    .setTitle("Custom date…")
                                    .setIcon("calendar-plus")
                                    .onClick(() => this.openDatePickerForTask(t)));
                                submenu.addSeparator();
                                submenu.addItem((ii) => {
                                    var _a;
                                    ii.setTitle("Priority").setIcon("flag");
                                    const p = (_a = ii.setSubmenu) === null || _a === void 0 ? void 0 : _a.call(ii);
                                    p === null || p === void 0 ? void 0 : p.addItem((pp) => pp
                                        .setTitle("🔺 Highest")
                                        .onClick(() => this.setPriority(t, 5)));
                                    p === null || p === void 0 ? void 0 : p.addItem((pp) => pp
                                        .setTitle("⏫ High")
                                        .onClick(() => this.setPriority(t, 4)));
                                    p === null || p === void 0 ? void 0 : p.addItem((pp) => pp
                                        .setTitle("🔼 Medium")
                                        .onClick(() => this.setPriority(t, 3)));
                                    p === null || p === void 0 ? void 0 : p.addItem((pp) => pp
                                        .setTitle("🔽 Low")
                                        .onClick(() => this.setPriority(t, 2)));
                                    p === null || p === void 0 ? void 0 : p.addItem((pp) => pp
                                        .setTitle("⏬️ Lowest")
                                        .onClick(() => this.setPriority(t, 1)));
                                });
                            }
                        });
                    }
                    if (topTasks.length === 0) {
                        menu.addItem((i) => i.setTitle("No due or upcoming").setDisabled(true));
                    }
                    menu.addSeparator();
                    menu.addItem((i) => i
                        .setTitle("Refresh")
                        .setIcon("refresh-ccw")
                        .onClick(() => {
                        this.updateStatusBar();
                        this.updateTray();
                    }));
                    menu.showAtMouseEvent(ev);
                });
                btn.title =
                    pending.length > 0
                        ? `${pending.length} tasks due or upcoming`
                        : "No due or upcoming";
            }
        });
    }
    createOrUpdateStatusBar() {
        if (!this.statusBarItem) {
            try {
                // @ts-ignore addStatusBarItem exists on Plugin
                this.statusBarItem = this.plugin.addStatusBarItem();
            }
            catch (e) {
                console.warn("Failed to create status bar item for tray:", e);
            }
        }
    }
    sendDailySummary() {
        return __awaiter(this, void 0, void 0, function* () {
            const queryAPI = this.getQueryAPI();
            if (!queryAPI)
                return;
            try {
                const all = (yield queryAPI.getAllTasks());
                const { from, to } = this.getDueTodayRange();
                // include overdue + due today, exclude ICS
                const pending = all.filter((t) => {
                    var _a;
                    if (t.completed || !((_a = t.metadata) === null || _a === void 0 ? void 0 : _a.dueDate))
                        return false;
                    if (this.isIcsTask(t) || this.isIcsBadge(t))
                        return false;
                    const due = t.metadata.dueDate;
                    return due >= from && due <= to;
                });
                if (!pending.length) {
                    new Notice("No tasks due today", 2000);
                    return;
                }
                const body = this.formatDailySummaryBody(pending);
                this.showNotification("Today's tasks", body);
            }
            catch (e) {
                console.warn("Daily summary failed", e);
            }
        });
    }
    formatDailySummaryBody(tasks) {
        const maxList = 5;
        const items = tasks.slice(0, maxList).map((t) => `• ${t.content}`);
        const more = tasks.length > maxList
            ? `\n… and ${tasks.length - maxList} more`
            : "";
        return `${tasks.length} tasks due today:\n${items.join("\n")}${more}`;
    }
    showTaskDueNotification(task, _due, leadMs) {
        return __awaiter(this, void 0, void 0, function* () {
            const minutes = Math.round(leadMs / 60000);
            const title = minutes > 0 ? `Due in ${minutes} min` : "Task due";
            const body = `${task.content}`;
            const n = yield this.showNotification(title, body);
            if (n) {
                n.onclick = () => {
                    var _a;
                    this.openTask(task).catch(() => { });
                    // Close after click
                    // @ts-ignore
                    (_a = n.close) === null || _a === void 0 ? void 0 : _a.call(n);
                };
            }
        });
    }
    getVaultOpenURI() {
        const vaultName = this.plugin.app.vault.getName();
        return `obsidian://open?vault=${encodeURIComponent(vaultName)}`;
    }
    openVault() {
        // Try to focus the window directly first
        this.focusObsidianWindow();
        // Also try the URI approach as fallback
        const url = this.getVaultOpenURI();
        try {
            window.open(url, "_blank");
        }
        catch (_a) { }
    }
    completeTask(taskId) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield ((_a = this.plugin.writeAPI) === null || _a === void 0 ? void 0 : _a.updateTaskStatus({
                    taskId,
                    completed: true,
                }));
            }
            catch (_b) { }
        });
    }
    setPriority(task, level) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield ((_a = this.plugin.writeAPI) === null || _a === void 0 ? void 0 : _a.updateTask({
                    taskId: task.id,
                    updates: {
                        metadata: Object.assign(Object.assign({}, (task.metadata || { tags: [] })), { priority: level }),
                    },
                }));
            }
            catch (_b) { }
        });
    }
    openDatePickerForTask(task) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { DatePickerModal } = yield import("@/components/ui/date-picker/DatePickerModal");
                const modal = new DatePickerModal(this.plugin.app, this.plugin, undefined, "📅");
                modal.onDateSelected = (dateStr) => __awaiter(this, void 0, void 0, function* () {
                    var _b, _c, _d, _e, _f, _g;
                    if (!dateStr)
                        return;
                    const m = ((_c = (_b = window).moment) === null || _c === void 0 ? void 0 : _c.call(_b, dateStr)) ||
                        ((_e = (_d = this.plugin.app).moment) === null || _e === void 0 ? void 0 : _e.call(_d, dateStr));
                    const ts = (_f = m === null || m === void 0 ? void 0 : m.valueOf) === null || _f === void 0 ? void 0 : _f.call(m);
                    if (!ts)
                        return;
                    yield ((_g = this.plugin.writeAPI) === null || _g === void 0 ? void 0 : _g.updateTask({
                        taskId: task.id,
                        updates: {
                            metadata: Object.assign(Object.assign({}, (task.metadata || { tags: [] })), { dueDate: ts }),
                        },
                    }));
                });
                modal.open();
            }
            catch (_a) { }
        });
    }
    postponeTask(task, offsetMs) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // Snooze based on "now" rather than existing due
            const base = Date.now();
            const newDue = base + offsetMs;
            try {
                yield ((_a = this.plugin.writeAPI) === null || _a === void 0 ? void 0 : _a.updateTask({
                    taskId: task.id,
                    updates: {
                        metadata: Object.assign(Object.assign({}, (task.metadata || { tags: [] })), { dueDate: newDue }),
                    },
                }));
            }
            catch (_b) { }
        });
    }
    tryElectronNotification(title, body) {
        try {
            const req = window.require || globalThis.require;
            const electron = req ? req("electron") : null;
            const ElectronNotification = electron === null || electron === void 0 ? void 0 : electron.Notification;
            if (ElectronNotification) {
                const n = new ElectronNotification({ title, body });
                // Some Electron versions require show()
                if (typeof n.show === "function")
                    n.show();
                return n;
            }
        }
        catch (_a) {
            // ignore
        }
        return null;
    }
    showNotification(title, body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Try Electron native notification first (desktop main-bridged in some builds)
                const en = this.tryElectronNotification(title, body);
                if (en)
                    return en;
                // Fallback to Web Notifications in renderer (Electron implements this API)
                if ("Notification" in window) {
                    if (Notification.permission === "default") {
                        yield Notification.requestPermission();
                    }
                    if (Notification.permission === "granted") {
                        return new Notification(title, { body });
                    }
                }
                // Fallback to Obsidian Notice
                new Notice(`${title}: ${body}`, 5000);
            }
            catch (e) {
                console.warn("Notification error", e);
                new Notice(`${title}: ${body}`, 5000);
            }
            return null;
        });
    }
    openTask(task) {
        return __awaiter(this, void 0, void 0, function* () {
            // First, bring the window to front
            this.focusObsidianWindow();
            const file = this.plugin.app.vault.getFileByPath(task.filePath);
            if (!file)
                return;
            // Open file in current tab (false) or new tab based on preference
            const leaf = this.plugin.app.workspace.getLeaf(false);
            yield leaf.openFile(file);
            if (!(file instanceof TFile))
                return;
            yield leaf.openFile(file, {
                eState: {
                    line: task.line,
                },
            });
        });
    }
    openQuickCaptureWindow() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.electronQuickCapture) {
                new Notice(t("Quick capture not available"));
                return;
            }
            try {
                yield this.electronQuickCapture.openCaptureWindow();
            }
            catch (error) {
                console.error("Failed to open quick capture:", error);
                new Notice(t("Failed to open quick capture window"));
            }
        });
    }
    focusObsidianWindow() {
        var _a, _b, _c, _d, _e, _f, _g;
        try {
            const electron = this.getElectron();
            if (!electron)
                return;
            // Get the current BrowserWindow
            const BrowserWindow = ((_a = electron.remote) === null || _a === void 0 ? void 0 : _a.BrowserWindow) || electron.BrowserWindow;
            const getCurrentWindow = ((_b = electron.remote) === null || _b === void 0 ? void 0 : _b.getCurrentWindow) ||
                (() => {
                    var _a, _b, _c, _d, _e;
                    // Fallback: try to get window from webContents
                    const webContents = ((_b = (_a = electron.remote) === null || _a === void 0 ? void 0 : _a.getCurrentWebContents) === null || _b === void 0 ? void 0 : _b.call(_a)) ||
                        ((_d = (_c = electron.webContents) === null || _c === void 0 ? void 0 : _c.getFocusedWebContents) === null || _d === void 0 ? void 0 : _d.call(_c));
                    return webContents
                        ? (_e = BrowserWindow === null || BrowserWindow === void 0 ? void 0 : BrowserWindow.fromWebContents) === null || _e === void 0 ? void 0 : _e.call(BrowserWindow, webContents)
                        : null;
                });
            const win = getCurrentWindow === null || getCurrentWindow === void 0 ? void 0 : getCurrentWindow();
            if (win) {
                // Show window if minimized
                if ((_c = win.isMinimized) === null || _c === void 0 ? void 0 : _c.call(win)) {
                    (_d = win.restore) === null || _d === void 0 ? void 0 : _d.call(win);
                }
                // Bring window to front
                (_e = win.show) === null || _e === void 0 ? void 0 : _e.call(win);
                (_f = win.focus) === null || _f === void 0 ? void 0 : _f.call(win);
                // On Windows, sometimes need extra steps to bring to front
                if (Platform.isWin) {
                    (_g = win.setAlwaysOnTop) === null || _g === void 0 ? void 0 : _g.call(win, true);
                    setTimeout(() => {
                        var _a;
                        (_a = win.setAlwaysOnTop) === null || _a === void 0 ? void 0 : _a.call(win, false);
                    }, 100);
                }
            }
        }
        catch (e) {
            console.log("[TrayDebug] Could not focus window:", e);
        }
    }
}
export default DesktopIntegrationManager;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVza3RvcC1pbnRlZ3JhdGlvbi1tYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGVza3RvcC1pbnRlZ3JhdGlvbi1tYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBQU8sU0FBUyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUd6RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQzlDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUM1QyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDMUMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFaEUsdUZBQXVGO0FBQ3ZGLE1BQU0sT0FBTyx5QkFBMEIsU0FBUSxTQUFTO0lBWXZELFlBQW9CLE1BQTZCO1FBQ2hELEtBQUssRUFBRSxDQUFDO1FBRFcsV0FBTSxHQUFOLE1BQU0sQ0FBdUI7UUFYekMsaUJBQVksR0FBa0IsSUFBSSxDQUFDO1FBQ25DLG9CQUFlLEdBQWtCLElBQUksQ0FBQztRQUN0QyxpQkFBWSxHQUFnQixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ3RDLGtCQUFhLEdBQXVCLElBQUksQ0FBQztRQUN6QyxpQkFBWSxHQUFlLElBQUksQ0FBQztJQVN4QyxDQUFDO0lBRUssTUFBTTs7O1lBQ1gscUJBQXFCO1lBQ3JCLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWTtnQkFBRSxPQUFPO1lBRW5DLG1DQUFtQztZQUNuQyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFbEUsOERBQThEO1lBQzlELElBQUk7Z0JBQ0gsSUFBSSxDQUFDLG1CQUFtQixHQUFHLEdBQUcsRUFBRTs7b0JBQy9CLElBQUk7d0JBQ0gsTUFBQSxNQUFBLElBQUksQ0FBQyxZQUFZLDBDQUFFLGtCQUFrQixrREFBSSxDQUFDO3dCQUMxQyxNQUFNLENBQUMsR0FBUSxNQUFhLENBQUM7d0JBQzdCLE1BQU0sU0FBUyxHQUNkLHVCQUF1QixHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQzt3QkFDakQscUNBQXFDO3dCQUNyQyxJQUFJLENBQUEsTUFBQSxDQUFDLENBQUMsU0FBUyxDQUFDLDBDQUFFLEtBQUssTUFBSyxJQUFJLENBQUMsY0FBYyxFQUFFOzRCQUNoRCxNQUFBLE1BQUEsSUFBSSxDQUFDLFlBQVksMENBQUUsT0FBTyxrREFBSSxDQUFDOzRCQUMvQixPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQzt5QkFDcEI7cUJBQ0Q7b0JBQUMsV0FBTSxHQUFFO2dCQUNYLENBQUMsQ0FBQztnQkFFRixJQUFJLENBQUMsZ0JBQWdCLENBQ3BCLE1BQU0sRUFDTixjQUFjLEVBQ2QsSUFBSSxDQUFDLG1CQUFtQixDQUN4QixDQUFDO2dCQUVGLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFO29CQUNsQixJQUFJLElBQUksQ0FBQyxtQkFBbUIsRUFBRTt3QkFDN0IsTUFBTSxDQUFDLG1CQUFtQixDQUN6QixjQUFjLEVBQ2QsSUFBSSxDQUFDLG1CQUFtQixDQUN4QixDQUFDO3dCQUNGLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxTQUFTLENBQUM7cUJBQ3JDO2dCQUNGLENBQUMsQ0FBQyxDQUFDO2FBQ0g7WUFBQyxXQUFNLEdBQUU7WUFFVixNQUFNLFFBQVEsR0FDYixDQUFBLE1BQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsa0JBQWtCLDBDQUFFLFFBQVEsS0FBSSxRQUFRLENBQUM7WUFFL0QsaUVBQWlFO1lBQ2pFLElBQUksUUFBUSxLQUFLLFFBQVEsSUFBSSxRQUFRLEtBQUssTUFBTSxFQUFFO2dCQUNqRCxJQUFJLE1BQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsa0JBQWtCLDBDQUFFLFVBQVUsRUFBRTtvQkFDeEQsVUFBVSxDQUFDLEdBQVMsRUFBRTt3QkFDckIsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQzt3QkFDdEQsSUFBSSxDQUFDLE1BQU0sSUFBSSxRQUFRLEtBQUssUUFBUSxFQUFFOzRCQUNyQyxzREFBc0Q7NEJBQ3RELElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO3lCQUMvQjt3QkFDRCxvREFBb0Q7d0JBQ3BELElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ25DLENBQUMsQ0FBQSxFQUFFLENBQUMsQ0FBQyxDQUFDO2lCQUNOO2FBQ0Q7WUFFRCx1QkFBdUI7WUFDdkIsSUFBSSxRQUFRLEtBQUssUUFBUSxJQUFJLFFBQVEsS0FBSyxNQUFNLEVBQUU7Z0JBQ2pELElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO2FBQy9CO1lBRUQsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDekIsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFFMUIsa0JBQWtCO1lBQ2xCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDLENBQUM7WUFDdkMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsR0FBRSxDQUFDLENBQUMsQ0FBQzs7S0FDbEM7SUFFRCxRQUFROztRQUNQLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsQ0FBQztRQUMzQyxJQUFJLElBQUksQ0FBQyxZQUFZO1lBQUUsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDOUQsSUFBSSxJQUFJLENBQUMsZUFBZTtZQUFFLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBRXBFLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO1FBQzVCLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDMUIsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFO1lBQ3ZCLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUNBQXVDLENBQUMsQ0FBQztZQUNyRCxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO1NBQzFCO1FBRUQsb0RBQW9EO1FBQ3BELElBQUksSUFBSSxDQUFDLG1CQUFtQixFQUFFO1lBQzdCLE1BQU0sQ0FBQyxtQkFBbUIsQ0FDekIsY0FBYyxFQUNkLElBQUksQ0FBQyxtQkFBbUIsQ0FDeEIsQ0FBQztZQUNGLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxTQUFTLENBQUM7U0FDckM7UUFFRCx5QkFBeUI7UUFDekIsTUFBTSxTQUFTLEdBQUcsdUJBQXVCLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBQ2xFLE1BQU0sQ0FBQyxHQUFRLE1BQWEsQ0FBQztRQUU3QixJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUU7WUFDdEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDO1lBQ3JELElBQUk7Z0JBQ0gsNkJBQTZCO2dCQUM3QixNQUFBLE1BQUEsSUFBSSxDQUFDLFlBQVksRUFBQyxrQkFBa0Isa0RBQUksQ0FBQztnQkFFekMsbUNBQW1DO2dCQUNuQyxJQUFJLENBQUEsTUFBQSxDQUFDLENBQUMsU0FBUyxDQUFDLDBDQUFFLEtBQUssTUFBSyxJQUFJLENBQUMsY0FBYyxFQUFFO29CQUNoRCxPQUFPLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7b0JBQ2pELE1BQUEsTUFBQSxJQUFJLENBQUMsWUFBWSxFQUFDLE9BQU8sa0RBQUksQ0FBQztvQkFDOUIsbURBQW1EO29CQUNuRCxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztpQkFDcEI7cUJBQU07b0JBQ04sT0FBTyxDQUFDLEdBQUcsQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDO29CQUMzRCx3R0FBd0c7b0JBQ3hHLElBQUk7d0JBQ0gsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO3dCQUNwQyxNQUFNLElBQUksR0FBRyxDQUFBLFFBQVEsYUFBUixRQUFRLHVCQUFSLFFBQVEsQ0FBRSxJQUFJLE1BQUksTUFBQSxRQUFRLGFBQVIsUUFBUSx1QkFBUixRQUFRLENBQUUsTUFBTSwwQ0FBRSxJQUFJLENBQUEsQ0FBQzt3QkFDdEQsSUFBSSxJQUFJLEtBQUksTUFBQSxJQUFJLENBQUMsWUFBWSwwQ0FBRSxjQUFjLENBQUEsRUFBRTs0QkFDOUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQy9CLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsQ0FDMUIsQ0FBQzt5QkFDRjtxQkFDRDtvQkFBQyxXQUFNLEdBQUU7b0JBQ1YsdURBQXVEO29CQUN2RCxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRTt3QkFDakIsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFlBQVksR0FBRyxTQUFTLENBQUM7cUJBQ3RDO2lCQUNEO2FBQ0Q7WUFBQyxPQUFPLENBQUMsRUFBRTtnQkFDWCxPQUFPLENBQUMsS0FBSyxDQUFDLHFDQUFxQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ3hEO1NBQ0Q7UUFDRCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztRQUN6QixJQUFJLENBQUMsY0FBYyxHQUFHLFNBQVMsQ0FBQztRQUVoQyx5QkFBeUI7UUFDekIsSUFBSSxJQUFJLENBQUMsb0JBQW9CLEVBQUU7WUFDOUIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxTQUFTLENBQUM7U0FDdEM7SUFDRixDQUFDO0lBRUQsOEJBQThCO0lBQ2pCLGNBQWM7O1lBQzFCLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUNBQW1DLENBQUMsQ0FBQztZQUNqRCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDaEIsZ0RBQWdEO1lBQ2hELE1BQU0sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUN6RCxNQUFNLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNwQixPQUFPLENBQUMsR0FBRyxDQUFDLHNDQUFzQyxDQUFDLENBQUM7UUFDckQsQ0FBQztLQUFBO0lBRUQseUNBQXlDO0lBQ2xDLGtCQUFrQjtRQUN4QixvREFBb0Q7UUFDcEQsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxHQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVDLDJCQUEyQjtRQUMzQixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxHQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUVELHVDQUF1QztJQUMxQixtQkFBbUI7O1lBQy9CLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDL0IsQ0FBQztLQUFBO0lBQ00sbUJBQW1CO1FBQ3pCLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsR0FBRSxDQUFDLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRU8sV0FBVzs7UUFDbEIsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxvQkFBMkIsQ0FBQztRQUNuRCxJQUFJLENBQUMsRUFBRTtZQUFFLE9BQU8sSUFBSSxDQUFDO1FBQ3JCLE9BQU8sTUFBQSxFQUFFLENBQUMsV0FBVyxrREFBSSxDQUFDO0lBQzNCLENBQUM7SUFFTyxXQUFXO1FBQ2xCLElBQUk7WUFDSCwrREFBK0Q7WUFDL0QsTUFBTSxRQUFRLEdBQ1osTUFBYyxDQUFDLFFBQVEsSUFBSyxVQUFrQixDQUFDLFFBQVEsQ0FBQztZQUMxRCxJQUFJLFFBQVE7Z0JBQUUsT0FBTyxRQUFRLENBQUM7WUFDOUIscUNBQXFDO1lBQ3JDLE1BQU0sR0FBRyxHQUFJLE1BQWMsQ0FBQyxPQUFPLElBQUssVUFBa0IsQ0FBQyxPQUFPLENBQUM7WUFDbkUsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1NBQ3BDO1FBQUMsV0FBTTtZQUNQLE9BQU8sSUFBSSxDQUFDO1NBQ1o7SUFDRixDQUFDO0lBRWEseUJBQXlCOzs7WUFDdEMsSUFBSTtnQkFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLDhDQUE4QyxDQUFDLENBQUM7Z0JBQzVELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDcEMsSUFBSSxDQUFDLFFBQVEsRUFBRTtvQkFDZCxPQUFPLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7b0JBQ2pELE9BQU8sS0FBSyxDQUFDO2lCQUNiO2dCQUNELGlFQUFpRTtnQkFDakUsTUFBTSxJQUFJLEdBQ1QsQ0FBQSxNQUFDLFFBQWdCLENBQUMsTUFBTSwwQ0FBRSxJQUFJLEtBQUssUUFBZ0IsQ0FBQyxJQUFJLENBQUM7Z0JBQzFELE1BQU0sV0FBVyxHQUNoQixDQUFBLE1BQUMsUUFBZ0IsQ0FBQyxNQUFNLDBDQUFFLFdBQVc7b0JBQ3BDLFFBQWdCLENBQUMsV0FBVyxDQUFDO2dCQUMvQixJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFO29CQUMxQixPQUFPLENBQUMsR0FBRyxDQUFDLCtDQUErQyxDQUFDLENBQUM7b0JBQzdELE9BQU8sS0FBSyxDQUFDO2lCQUNiO2dCQUVELGlEQUFpRDtnQkFDakQsTUFBTSxTQUFTLEdBQUcsdUJBQXVCLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO2dCQUNsRSxNQUFNLENBQUMsR0FBUSxNQUFhLENBQUM7Z0JBQzdCLElBQUksQ0FBQSxNQUFBLENBQUMsQ0FBQyxTQUFTLENBQUMsMENBQUUsSUFBSSxNQUFJLE1BQUEsQ0FBQyxDQUFDLFNBQVMsQ0FBQywwQ0FBRSxLQUFLLENBQUEsRUFBRTtvQkFDOUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDO29CQUNyRCxtREFBbUQ7b0JBQ25ELElBQUk7d0JBQ0gscURBQXFEO3dCQUNyRCxNQUFNLFdBQVcsR0FDaEIsTUFBQSxNQUFBLE1BQUEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksRUFBQyxXQUFXLGtEQUFJLG1DQUFJLEtBQUssQ0FBQzt3QkFDNUMsSUFBSSxXQUFXLEVBQUU7NEJBQ2hCLE9BQU8sQ0FBQyxHQUFHLENBQ1YscURBQXFELENBQ3JELENBQUM7NEJBQ0YsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7eUJBQ3BCOzZCQUFNOzRCQUNOLE9BQU8sQ0FBQyxHQUFHLENBQUMsMENBQTBDLENBQUMsQ0FBQzs0QkFDeEQsdUNBQXVDOzRCQUN2QyxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUM7NEJBQ3RDLElBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEtBQUssQ0FBQzs0QkFDekMsSUFBSTtnQ0FDSCwwREFBMEQ7Z0NBQzFELE1BQUEsTUFBQSxJQUFJLENBQUMsWUFBWSxFQUFDLGtCQUFrQixrREFBSSxDQUFDO2dDQUN6QyxzREFBc0Q7Z0NBQ3RELE1BQU0sWUFBWSxHQUFHLEdBQVMsRUFBRTs7b0NBQy9CLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7b0NBQzlCLElBQUk7d0NBQ0gsTUFBQSxNQUFDLElBQUksQ0FBQyxNQUFjLEVBQUMsZ0JBQWdCLGtEQUFJLENBQUM7cUNBQzFDO29DQUFDLFdBQU0sR0FBRTtnQ0FDWCxDQUFDLENBQUEsQ0FBQztnQ0FDRixNQUFBLE1BQUEsSUFBSSxDQUFDLFlBQVksRUFBQyxFQUFFLG1EQUFHLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQztnQ0FDOUMsOEVBQThFO2dDQUM5RSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztnQ0FDekMsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLENBQUM7Z0NBQ3pDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsQ0FBQzs2QkFDdkM7NEJBQUMsV0FBTSxHQUFFOzRCQUNWLE9BQU8sSUFBSSxDQUFDO3lCQUNaO3FCQUNEO29CQUFDLE9BQU8sQ0FBQyxFQUFFO3dCQUNYLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkNBQTJDLEVBQUUsQ0FBQyxDQUFDLENBQUM7d0JBQzVELE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO3FCQUNwQjtpQkFDRDtnQkFFRCwrQ0FBK0M7Z0JBQy9DLE9BQU8sQ0FBQyxHQUFHLENBQUMsK0JBQStCLENBQUMsQ0FBQztnQkFDN0MsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztnQkFDeEQsSUFBSTtvQkFDSCxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQztpQkFDNUM7Z0JBQUMsV0FBTSxHQUFFO2dCQUNWLElBQUk7b0JBQ0gsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLENBQUM7b0JBQ3pDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztpQkFDdkM7Z0JBQUMsV0FBTSxHQUFFO2dCQUVWLDRDQUE0QztnQkFDNUMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLEdBQVMsRUFBRTs7b0JBQ2xDLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7b0JBQzlCLElBQUk7d0JBQ0gsTUFBQSxNQUFDLElBQUksQ0FBQyxNQUFjLEVBQUMsZ0JBQWdCLGtEQUFJLENBQUM7cUJBQzFDO29CQUFDLFdBQU0sR0FBRTtnQkFDWCxDQUFDLENBQUEsQ0FBQztnQkFDRixNQUFBLE1BQUEsSUFBSSxDQUFDLFlBQVksRUFBQyxrQkFBa0Isa0RBQUksQ0FBQztnQkFDekMsTUFBQSxNQUFBLElBQUksQ0FBQyxZQUFZLEVBQUMsRUFBRSxtREFBRyxPQUFPLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7Z0JBRXZELCtDQUErQztnQkFDL0MsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUN0Qyx5REFBeUQ7Z0JBQ3pELElBQUk7b0JBQ0gsTUFBQSxNQUFBLE1BQUEsQ0FBQyxDQUFDLFNBQVMsQ0FBQywwQ0FBRSxJQUFJLDBDQUFFLGtCQUFrQixrREFBSSxDQUFDO2lCQUMzQztnQkFBQyxXQUFNLEdBQUU7Z0JBQ1YsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHO29CQUNkLElBQUksRUFBRSxJQUFJLENBQUMsWUFBWTtvQkFDdkIsS0FBSztvQkFDTCxZQUFZLEVBQUUsSUFBSSxDQUFDLGdCQUFnQjtpQkFDbkMsQ0FBQztnQkFDRixJQUFJLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQztnQkFDNUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpREFBaUQsQ0FBQyxDQUFDO2dCQUUvRCxPQUFPO2dCQUNQLE9BQU8sSUFBSSxDQUFDO2FBQ1o7WUFBQyxPQUFPLENBQUMsRUFBRTtnQkFDWCxPQUFPLENBQUMsSUFBSSxDQUFDLHVDQUF1QyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUN6RCxPQUFPLEtBQUssQ0FBQzthQUNiOztLQUNEO0lBRU8sY0FBYzs7UUFDckIsSUFBSTtZQUNILE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNwQyxPQUFPLENBQ04sQ0FBQyxRQUFnQixhQUFoQixRQUFRLHVCQUFSLFFBQVEsQ0FBVSxXQUFXO2lCQUM5QixNQUFDLFFBQWdCLGFBQWhCLFFBQVEsdUJBQVIsUUFBUSxDQUFVLE1BQU0sMENBQUUsV0FBVyxDQUFBO2dCQUN0QyxJQUFJLENBQ0osQ0FBQztTQUNGO1FBQUMsV0FBTTtZQUNQLE9BQU8sSUFBSSxDQUFDO1NBQ1o7SUFDRixDQUFDO0lBRU8sV0FBVztRQUNsQixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFFakMsSUFBSSxFQUFFLElBQUksT0FBTyxFQUFFLENBQUMsbUJBQW1CLEtBQUssU0FBUztZQUNwRCxPQUFPLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQztRQUMvQixJQUFJO1lBQ0gsT0FBTyxNQUFNLENBQUMsVUFBVSxDQUFDLDhCQUE4QixDQUFDLENBQUMsT0FBTyxDQUFDO1NBQ2pFO1FBQUMsV0FBTTtZQUNQLE9BQU8sS0FBSyxDQUFDO1NBQ2I7SUFDRixDQUFDO0lBRWEsZ0JBQWdCLENBQUMsV0FBZ0I7OztZQUM5QyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDdkMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZO2dCQUFFLE9BQU87WUFFL0Isa0VBQWtFO1lBQ2xFLHVEQUF1RDtZQUN2RCxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7WUFDMUMsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQzFDLFdBQVcsRUFDWCxnQkFBZ0IsQ0FDaEIsQ0FBQztZQUNGLElBQUk7Z0JBQ0gsTUFBQSxNQUFBLElBQUksQ0FBQyxZQUFZLEVBQUMsUUFBUSxtREFBRyxHQUFHLENBQUMsQ0FBQzthQUNsQztZQUFDLFdBQU0sR0FBRTs7S0FDVjtJQUVPLG9CQUFvQixDQUFDLFdBQWdCOztRQUM1QyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDakMsSUFBSTtZQUNILElBQUksQ0FBQyxFQUFFO2dCQUFFLE9BQU87WUFDaEIsb0VBQW9FO1lBQ3BFLElBQUksSUFBSSxDQUFDLGtCQUFrQixFQUFFO2dCQUM1QixJQUFJO29CQUNILE1BQUEsTUFBQyxFQUFVLEVBQUMsR0FBRyxtREFBRyxTQUFTLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7aUJBQ3REO2dCQUFDLFdBQU0sR0FBRTtnQkFDVixJQUFJO29CQUNILE1BQUEsTUFBQyxFQUFVLEVBQUMsY0FBYyxtREFDekIsU0FBUyxFQUNULElBQUksQ0FBQyxrQkFBa0IsQ0FDdkIsQ0FBQztpQkFDRjtnQkFBQyxXQUFNLEdBQUU7YUFDVjtZQUNELE1BQU0sT0FBTyxHQUFHLEdBQUcsRUFBRTtnQkFDcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQ0FBK0MsQ0FBQyxDQUFDO2dCQUM3RCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxHQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3BELENBQUMsQ0FBQztZQUNGLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxPQUFPLENBQUM7WUFDbEMsTUFBQSxNQUFDLEVBQVUsRUFBQyxFQUFFLG1EQUFHLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNyQywyQkFBMkI7WUFDM0IsSUFBSTtnQkFDSCw2REFBNkQ7Z0JBQzdELElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFOztvQkFDbEIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO29CQUNsQyxJQUFJO3dCQUNILE1BQUMsR0FBVyxhQUFYLEdBQUcsdUJBQUgsR0FBRyxDQUFVLEdBQUcsb0RBQUcsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO3FCQUN4QztvQkFBQyxXQUFNLEdBQUU7b0JBQ1YsSUFBSTt3QkFDSCxNQUFDLEdBQVcsYUFBWCxHQUFHLHVCQUFILEdBQUcsQ0FBVSxjQUFjLG9EQUFHLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztxQkFDbkQ7b0JBQUMsV0FBTSxHQUFFO2dCQUNYLENBQUMsQ0FBQyxDQUFDO2FBQ0g7WUFBQyxXQUFNLEdBQUU7U0FDVjtRQUFDLFdBQU0sR0FBRTtJQUNYLENBQUM7SUFFYSxvQkFBb0IsQ0FDakMsV0FBZ0IsRUFDaEIsbUJBQTRCLEtBQUs7O1lBRWpDLElBQUk7Z0JBQ0gsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3hDLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ2hELE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO2dCQUNwQixNQUFNLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztnQkFDckIsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDcEMsSUFBSSxDQUFDLEdBQUc7b0JBQUUsT0FBTyxXQUFXLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBRTNDLGdEQUFnRDtnQkFDaEQsdURBQXVEO2dCQUN2RCxJQUFJLFdBQW1CLENBQUM7Z0JBQ3hCLElBQUksZ0JBQWdCLEVBQUU7b0JBQ3JCLHFFQUFxRTtvQkFDckUsV0FBVyxHQUFHLFNBQVMsQ0FBQztpQkFDeEI7cUJBQU07b0JBQ04scUVBQXFFO29CQUNyRSxvRUFBb0U7b0JBQ3BFLFdBQVcsR0FBRyxXQUFXLENBQUM7aUJBQzFCO2dCQUVELDhDQUE4QztnQkFDOUMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLDRCQUE0QixDQUFDLFdBQVcsQ0FBQyxDQUFDO2dCQUUzRCxNQUFNLEdBQUcsR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUN4QixNQUFNLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxDQUFDLENBQUM7Z0JBQ3hELE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3RDLE1BQU0sSUFBSSxPQUFPLENBQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRTtvQkFDbkMsR0FBRyxDQUFDLE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDN0IsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7Z0JBQ2YsQ0FBQyxDQUFDLENBQUM7Z0JBQ0gsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDaEMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3JDLEdBQUcsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBRXpCLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQzlDLE1BQU0sRUFBRSxHQUFHLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFFbEQsNkNBQTZDO2dCQUM3QyxJQUFJO29CQUNILElBQUksZ0JBQWdCLElBQUksRUFBRSxDQUFDLGdCQUFnQixFQUFFO3dCQUM1QyxPQUFPLENBQUMsR0FBRyxDQUFDLHVDQUF1QyxDQUFDLENBQUM7d0JBQ3JELEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztxQkFDMUI7aUJBQ0Q7Z0JBQUMsV0FBTSxHQUFFO2dCQUVWLE9BQU8sRUFBRSxDQUFDO2FBQ1Y7WUFBQyxXQUFNO2dCQUNQLE9BQU8sV0FBVyxDQUFDLFdBQVcsRUFBRSxDQUFDO2FBQ2pDO1FBQ0YsQ0FBQztLQUFBO0lBRU8sb0JBQW9COztRQUMzQixxREFBcUQ7UUFDckQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ2xDLHFDQUFxQztRQUNyQyxNQUFNLE1BQU0sR0FBRyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0MsTUFBTSxZQUFZLEdBQ2pCLENBQUEsTUFBQSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLDBDQUFFLElBQUksRUFBRTtZQUNoRCxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNsQyxPQUFPLFlBQVksQ0FBQztJQUNyQixDQUFDO0lBRU8sNEJBQTRCLENBQUMsS0FBYTtRQUNqRCxrRkFBa0Y7UUFDbEYsTUFBTSxXQUFXLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQztRQUN4QywrREFBK0Q7UUFFL0QsT0FBTyxXQUFXLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBRUQscUVBQXFFO0lBQzdELFVBQVUsQ0FBQyxJQUFVOztRQUM1QixJQUFJO1lBQ0gsTUFBTSxPQUFPLEdBQ1osTUFBQSxNQUFBLE1BQUMsSUFBWSxhQUFaLElBQUksdUJBQUosSUFBSSxDQUFVLFFBQVEsMENBQUUsTUFBTSwwQ0FBRSxJQUFJLG1DQUNyQyxNQUFDLElBQVksYUFBWixJQUFJLHVCQUFKLElBQUksQ0FBVSxNQUFNLDBDQUFFLElBQUksQ0FBQztZQUM3QixNQUFNLEtBQUssR0FBRyxPQUFPLEtBQUssS0FBSyxDQUFDO1lBQ2hDLE1BQU0sT0FBTyxHQUNaLENBQUMsSUFBWSxhQUFaLElBQUksdUJBQUosSUFBSSxDQUFVLEtBQUssTUFBSyxJQUFJO2dCQUM3QixDQUFBLE1BQUEsTUFBQyxJQUFZLGFBQVosSUFBSSx1QkFBSixJQUFJLENBQVUsUUFBUSwwQ0FBRSxNQUFNLDBDQUFFLFFBQVEsTUFBSyxPQUFPLENBQUM7WUFDdkQsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksT0FBTyxDQUFDLENBQUM7U0FDNUI7UUFBQyxXQUFNO1lBQ1AsT0FBTyxLQUFLLENBQUM7U0FDYjtJQUNGLENBQUM7SUFFRCwwRUFBMEU7SUFDbEUsU0FBUyxDQUFDLElBQVU7O1FBQzNCLElBQUk7WUFDSCxJQUNDLE9BQU8sSUFBSSxDQUFDLFFBQVEsS0FBSyxRQUFRO2dCQUNqQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUM7Z0JBRWxDLE9BQU8sSUFBSSxDQUFDO1lBQ2IsTUFBTSxPQUFPLEdBQ1osTUFBQSxNQUFBLE1BQUMsSUFBWSxhQUFaLElBQUksdUJBQUosSUFBSSxDQUFVLFFBQVEsMENBQUUsTUFBTSwwQ0FBRSxJQUFJLG1DQUNyQyxNQUFDLElBQVksYUFBWixJQUFJLHVCQUFKLElBQUksQ0FBVSxNQUFNLDBDQUFFLElBQUksQ0FBQztZQUM3QixPQUFPLE9BQU8sS0FBSyxLQUFLLENBQUM7U0FDekI7UUFBQyxXQUFNO1lBQ1AsT0FBTyxLQUFLLENBQUM7U0FDYjtJQUNGLENBQUM7SUFFTyxnQkFBZ0I7UUFDdkIsTUFBTSxLQUFLLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUN6QixLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzNCLE1BQU0sUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2pDLFFBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE9BQU8sRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsRUFBRSxRQUFRLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztJQUMxRCxDQUFDO0lBRU8sa0JBQWtCOztRQUN6QixNQUFNLEdBQUcsR0FBRyxNQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGFBQWEsMENBQUUsT0FBTyxDQUFDO1FBQ3hELE1BQU0sT0FBTyxHQUNaLENBQUMsQ0FBQyxDQUFBLE1BQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsYUFBYSwwQ0FBRSxPQUFPLENBQUEsSUFBSSxDQUFDLENBQUMsQ0FBQSxHQUFHLGFBQUgsR0FBRyx1QkFBSCxHQUFHLENBQUUsT0FBTyxDQUFBLENBQUM7UUFDakUsSUFBSSxDQUFDLE9BQU87WUFBRSxPQUFPO1FBRXJCLGlCQUFpQjtRQUNqQixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDLENBQUM7UUFFNUMsb0JBQW9CO1FBQ3BCLElBQUksQ0FBQyxnQkFBZ0IsQ0FDcEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUU7WUFDdkIsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxHQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdDLENBQUMsRUFBRSxLQUFNLENBQUMsQ0FDVixDQUFDO1FBRUYsa0NBQWtDO1FBQ2xDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFFTyxxQkFBcUI7UUFDNUIsTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUN2QixNQUFNLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMvQixRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQy9CLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxPQUFPLEVBQUUsR0FBRyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDOUMsSUFBSSxDQUFDLGVBQWUsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUM3QyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDLENBQUM7WUFDdkMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsR0FBRSxDQUFDLENBQUMsQ0FBQztRQUNuQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDUixDQUFDO0lBRWEsb0JBQW9COzs7WUFDakMsTUFBTSxHQUFHLEdBQUcsTUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxhQUFhLDBDQUFFLE9BQU8sQ0FBQztZQUN4RCxJQUNDLENBQUMsR0FBRztnQkFDSixDQUFDLENBQUEsTUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxhQUFhLDBDQUFFLE9BQU8sQ0FBQTtnQkFDNUMsQ0FBQyxHQUFHLENBQUMsT0FBTztnQkFFWixPQUFPO1lBRVIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxRQUFRO2dCQUFFLE9BQU87WUFFdEIsMkRBQTJEO1lBQzNELE1BQU0sR0FBRyxHQUFHLE1BQUEsUUFBUSxDQUFDLGVBQWUsd0RBQTBCLENBQUM7WUFDL0QsTUFBTSxLQUFLLEdBQUcsQ0FDYixHQUFHLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FDNUMsQ0FBQztZQUVaLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBQSxHQUFHLENBQUMsV0FBVyxtQ0FBSSxDQUFDLENBQUMsR0FBRyxLQUFNLENBQUMsQ0FBQztZQUM1RCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDdkIsTUFBTSxTQUFTLEdBQUcsR0FBRyxHQUFHLEtBQU0sQ0FBQyxDQUFDLGNBQWM7WUFFOUMsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7Z0JBQ3pCLElBQUksSUFBSSxDQUFDLFNBQVM7b0JBQUUsU0FBUztnQkFDN0IsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztvQkFBRSxTQUFTLENBQUMsa0JBQWtCO2dCQUN2RCxNQUFNLEdBQUcsR0FBRyxNQUFBLElBQUksQ0FBQyxRQUFRLDBDQUFFLE9BQU8sQ0FBQztnQkFDbkMsSUFBSSxDQUFDLEdBQUc7b0JBQUUsU0FBUztnQkFDbkIsTUFBTSxNQUFNLEdBQUcsR0FBRyxHQUFHLE1BQU0sQ0FBQztnQkFDNUIsSUFBSSxNQUFNLElBQUksR0FBRyxJQUFJLE1BQU0sR0FBRyxTQUFTLEVBQUU7b0JBQ3hDLE1BQU0sR0FBRyxHQUFHLEdBQ1gsSUFBSSxDQUFDLEVBQUU7eUJBQ1AsTUFBQSxJQUFJLENBQUMsUUFBUSwwQ0FBRSxFQUFFLENBQUE7d0JBQ2pCLElBQUksQ0FBQyxRQUFRLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUM1QixJQUFJLEdBQUcsRUFBRSxDQUFDO29CQUNWLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO3dCQUFFLFNBQVM7b0JBQ3pDLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUMzQixJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztpQkFDaEQ7YUFDRDs7S0FDRDtJQUVhLFVBQVU7OztZQUN2QixJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVk7Z0JBQUUsT0FBTztZQUMvQixJQUFJO2dCQUNILE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDcEMsSUFBSSxDQUFDLFFBQVE7b0JBQUUsT0FBTztnQkFFdEIsaURBQWlEO2dCQUNqRCxNQUFNLFFBQVEsR0FBRyxDQUFDLE1BQU0sUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFXLENBQUM7Z0JBQzFELE1BQU0sUUFBUSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQzVCLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ25DLE1BQU0sT0FBTyxHQUFHLFFBQVE7cUJBQ3RCLE1BQU0sQ0FDTixDQUFDLENBQUMsRUFBRSxFQUFFOztvQkFDTCxPQUFBLENBQUMsQ0FBQyxDQUFDLFNBQVM7eUJBQ1osTUFBQSxDQUFDLENBQUMsUUFBUSwwQ0FBRSxPQUFPLENBQUE7d0JBQ25CLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxJQUFJLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtpQkFBQSxDQUN6QztxQkFDQSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUVyQyx3Q0FBd0M7Z0JBQ3hDLElBQUk7b0JBQ0gsSUFBSSxRQUFRLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFO3dCQUNuRCxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FDekIsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDOzRCQUNqQixDQUFDLENBQUMsSUFBSSxPQUFPLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRTs0QkFDcEMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQ3RCLENBQUM7cUJBQ0Y7aUJBQ0Q7Z0JBQUMsV0FBTSxHQUFFO2dCQUNWLElBQUk7b0JBQ0gsTUFBQSxNQUFBLElBQUksQ0FBQyxZQUFZLEVBQUMsVUFBVSxtREFDM0IsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDO3dCQUNqQixDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFO3dCQUNsRCxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUNwQixDQUFDO2lCQUNGO2dCQUFDLFdBQU0sR0FBRTtnQkFFVixnQ0FBZ0M7Z0JBQ2hDLE1BQU0sT0FBTyxHQUFHLElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDakQsTUFBTSxPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUU7b0JBQzVDLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFO29CQUNqQyxZQUFZLEVBQUUsR0FBRyxFQUFFOzt3QkFDbEIsSUFBSTs0QkFDSCxNQUFBLE1BQ0MsSUFBSSxDQUFDLE1BQ0wsRUFBQyxnQkFBZ0Isa0RBQUksQ0FBQzt5QkFDdkI7d0JBQUMsV0FBTSxHQUFFO29CQUNYLENBQUM7b0JBQ0QsUUFBUSxFQUFFLENBQUMsSUFBVSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztvQkFDN0MsWUFBWSxFQUFFLENBQUMsRUFBVSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztvQkFDbkQsWUFBWSxFQUFFLENBQUMsSUFBVSxFQUFFLFFBQWdCLEVBQUUsRUFBRSxDQUM5QyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUM7b0JBQ2xDLFdBQVcsRUFBRSxDQUFDLElBQVUsRUFBRSxLQUFhLEVBQUUsRUFBRSxDQUMxQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUM7b0JBQzlCLGNBQWMsRUFBRSxDQUFDLElBQVUsRUFBRSxFQUFFLENBQzlCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUM7b0JBQ2pDLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUU7b0JBQ3hDLFlBQVksRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLEVBQUU7aUJBQ2pELENBQUMsQ0FBQzthQUNIO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ1gsT0FBTyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDLENBQUMsQ0FBQzthQUMxQzs7S0FDRDtJQUVPLGlCQUFpQjs7UUFDeEIsTUFBTSxHQUFHLEdBQUcsTUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxhQUFhLDBDQUFFLFlBQVksQ0FBQztRQUM3RCxNQUFNLE9BQU8sR0FDWixDQUFDLENBQUMsQ0FBQSxNQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGFBQWEsMENBQUUsT0FBTyxDQUFBLElBQUksQ0FBQyxDQUFDLENBQUEsR0FBRyxhQUFILEdBQUcsdUJBQUgsR0FBRyxDQUFFLE9BQU8sQ0FBQSxDQUFDO1FBQ2pFLElBQUksQ0FBQyxPQUFPO1lBQUUsT0FBTztRQUVyQixNQUFNLElBQUksR0FBRyxHQUFJLENBQUMsSUFBSSxJQUFJLE9BQU8sQ0FBQztRQUNsQyxNQUFNLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUN2QixNQUFNLE1BQU0sR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1FBQzFCLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN4QyxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsSUFBSSxHQUFHLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDdEMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDckM7UUFDRCxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsT0FBTyxFQUFFLEdBQUcsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzVDLElBQUksQ0FBQyxZQUFZLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFTLEVBQUU7WUFDaEQsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUM5QixzQkFBc0I7WUFDdEIsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDMUIsQ0FBQyxDQUFBLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDUixDQUFDO0lBRWEsZUFBZTs7O1lBQzVCLE1BQU0sUUFBUSxHQUNiLENBQUEsTUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsMENBQUUsUUFBUSxLQUFJLFFBQVEsQ0FBQztZQUMvRCxJQUFJLENBQUMsQ0FBQyxRQUFRLEtBQUssUUFBUSxJQUFJLFFBQVEsS0FBSyxNQUFNLENBQUM7Z0JBQUUsT0FBTztZQUM1RCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDcEMsSUFBSSxDQUFDLFFBQVE7Z0JBQUUsT0FBTztZQUV0QixnREFBZ0Q7WUFDaEQsTUFBTSxRQUFRLEdBQUcsQ0FBQyxNQUFNLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBVyxDQUFDO1lBQzFELE1BQU0sUUFBUSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7WUFDNUIsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNuQyxNQUFNLE9BQU8sR0FBRyxRQUFRO2lCQUN0QixNQUFNLENBQ04sQ0FBQyxDQUFDLEVBQUUsRUFBRTs7Z0JBQ0wsT0FBQSxDQUFDLENBQUMsQ0FBQyxTQUFTO3FCQUNaLE1BQUEsQ0FBQyxDQUFDLFFBQVEsMENBQUUsT0FBTyxDQUFBO29CQUNuQixDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sSUFBSSxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUE7YUFBQSxDQUN6QztpQkFDQSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXJDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFO2dCQUN4QixJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQzthQUMvQjtZQUNELElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRTtnQkFDdkIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDM0IsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFO29CQUMvQyxHQUFHLEVBQUUsa0JBQWtCO2lCQUN2QixDQUFDLENBQUM7Z0JBQ0gsR0FBRyxDQUFDLFdBQVc7b0JBQ2QsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDO3dCQUNqQixDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRTt3QkFDbkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDbEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDO2dCQUM3QixHQUFHLENBQUMsT0FBTyxHQUFHLENBQU8sRUFBRSxFQUFFLEVBQUU7b0JBQzFCLDJGQUEyRjtvQkFDM0YsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztvQkFDeEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFO3dCQUN2QixDQUFDLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDOzZCQUM1QixPQUFPLENBQUMsYUFBYSxDQUFDOzZCQUN0QixPQUFPLENBQUMsR0FBRyxFQUFFOzs0QkFDYixJQUFJO2dDQUNILE1BQUEsTUFBQyxJQUFJLENBQUMsTUFBYyxFQUFDLGdCQUFnQixrREFBSSxDQUFDOzZCQUMxQzs0QkFBQyxXQUFNLEdBQUU7d0JBQ1gsQ0FBQyxDQUFDLENBQUM7b0JBQ0wsQ0FBQyxDQUFDLENBQUM7b0JBQ0gsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO29CQUNwQixJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBTSxFQUFFLEVBQUU7d0JBQ3ZCLENBQUMsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUM7NkJBQzVCLE9BQU8sQ0FBQyxhQUFhLENBQUM7NkJBQ3RCLE9BQU8sQ0FBQyxHQUFHLEVBQUU7NEJBQ2IsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7d0JBQy9CLENBQUMsQ0FBQyxDQUFDO29CQUNMLENBQUMsQ0FBQyxDQUFDO29CQUNILElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFFcEIsa0NBQWtDO29CQUNsQyxNQUFNLFFBQVEsR0FBRyxPQUFPO3lCQUN0QixJQUFJLENBQ0osQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7O3dCQUNSLE9BQUEsQ0FBQyxDQUFBLE1BQUEsQ0FBQyxDQUFDLFFBQVEsMENBQUUsT0FBTyxLQUFJLENBQUMsQ0FBQzs0QkFDMUIsQ0FBQyxDQUFBLE1BQUEsQ0FBQyxDQUFDLFFBQVEsMENBQUUsT0FBTyxLQUFJLENBQUMsQ0FBQyxDQUFBO3FCQUFBLENBQzNCO3lCQUNBLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ2QsS0FBSyxNQUFNLENBQUMsSUFBSSxRQUFRLEVBQUU7d0JBQ3pCLE1BQU0sS0FBSyxHQUNWLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLEVBQUU7NEJBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRzs0QkFDOUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7d0JBQ2QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFOzs0QkFDdkIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7NEJBQ3hDLE1BQU0sT0FBTyxHQUFHLE1BQUEsQ0FBQyxDQUFDLFVBQVUsaURBQUksQ0FBQzs0QkFDakMsSUFBSSxPQUFPLEVBQUU7Z0NBQ1osT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQU8sRUFBRSxFQUFFLENBQzNCLEVBQUU7cUNBQ0EsUUFBUSxDQUFDLGNBQWMsQ0FBQztxQ0FDeEIsT0FBTyxDQUFDLFVBQVUsQ0FBQztxQ0FDbkIsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDakMsQ0FBQztnQ0FDRixPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBTyxFQUFFLEVBQUUsQ0FDM0IsRUFBRTtxQ0FDQSxRQUFRLENBQUMsVUFBVSxDQUFDO3FDQUNwQixPQUFPLENBQUMsT0FBTyxDQUFDO3FDQUNoQixPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDeEMsQ0FBQztnQ0FDRixPQUFPLENBQUMsWUFBWSxFQUFFLENBQUM7Z0NBQ3ZCLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFPLEVBQUUsRUFBRSxDQUMzQixFQUFFO3FDQUNBLFFBQVEsQ0FBQyxXQUFXLENBQUM7cUNBQ3JCLE9BQU8sQ0FBQyxVQUFVLENBQUM7cUNBQ25CLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FDYixJQUFJLENBQUMsWUFBWSxDQUNoQixDQUFDLEVBQ0QsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsS0FBTSxDQUNwQixDQUNELENBQ0YsQ0FBQztnQ0FDRixPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBTyxFQUFFLEVBQUUsQ0FDM0IsRUFBRTtxQ0FDQSxRQUFRLENBQUMsV0FBVyxDQUFDO3FDQUNyQixPQUFPLENBQUMsVUFBVSxDQUFDO3FDQUNuQixPQUFPLENBQUMsR0FBRyxFQUFFLENBQ2IsSUFBSSxDQUFDLFlBQVksQ0FDaEIsQ0FBQyxFQUNELENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEtBQU0sQ0FDcEIsQ0FDRCxDQUNGLENBQUM7Z0NBQ0YsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQU8sRUFBRSxFQUFFLENBQzNCLEVBQUU7cUNBQ0EsUUFBUSxDQUFDLFdBQVcsQ0FBQztxQ0FDckIsT0FBTyxDQUFDLFVBQVUsQ0FBQztxQ0FDbkIsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUNiLElBQUksQ0FBQyxZQUFZLENBQ2hCLENBQUMsRUFDRCxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxLQUFNLENBQ3BCLENBQ0QsQ0FDRixDQUFDO2dDQUNGLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFPLEVBQUUsRUFBRSxDQUMzQixFQUFFO3FDQUNBLFFBQVEsQ0FBQyxXQUFXLENBQUM7cUNBQ3JCLE9BQU8sQ0FBQyxVQUFVLENBQUM7cUNBQ25CLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FDYixJQUFJLENBQUMsWUFBWSxDQUNoQixDQUFDLEVBQ0QsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsS0FBTSxDQUNwQixDQUNELENBQ0YsQ0FBQztnQ0FDRixPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBTyxFQUFFLEVBQUUsQ0FDM0IsRUFBRTtxQ0FDQSxRQUFRLENBQUMsY0FBYyxDQUFDO3FDQUN4QixPQUFPLENBQUMsZUFBZSxDQUFDO3FDQUN4QixPQUFPLENBQUMsR0FBRyxFQUFFLENBQ2IsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUM3QixDQUNGLENBQUM7Z0NBQ0YsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDO2dDQUN2QixPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBTyxFQUFFLEVBQUU7O29DQUMzQixFQUFFLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztvQ0FDeEMsTUFBTSxDQUFDLEdBQUcsTUFBQSxFQUFFLENBQUMsVUFBVSxrREFBSSxDQUFDO29DQUM1QixDQUFDLGFBQUQsQ0FBQyx1QkFBRCxDQUFDLENBQUUsT0FBTyxDQUFDLENBQUMsRUFBTyxFQUFFLEVBQUUsQ0FDdEIsRUFBRTt5Q0FDQSxRQUFRLENBQUMsWUFBWSxDQUFDO3lDQUN0QixPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FDdkMsQ0FBQztvQ0FDRixDQUFDLGFBQUQsQ0FBQyx1QkFBRCxDQUFDLENBQUUsT0FBTyxDQUFDLENBQUMsRUFBTyxFQUFFLEVBQUUsQ0FDdEIsRUFBRTt5Q0FDQSxRQUFRLENBQUMsUUFBUSxDQUFDO3lDQUNsQixPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FDdkMsQ0FBQztvQ0FDRixDQUFDLGFBQUQsQ0FBQyx1QkFBRCxDQUFDLENBQUUsT0FBTyxDQUFDLENBQUMsRUFBTyxFQUFFLEVBQUUsQ0FDdEIsRUFBRTt5Q0FDQSxRQUFRLENBQUMsV0FBVyxDQUFDO3lDQUNyQixPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FDdkMsQ0FBQztvQ0FDRixDQUFDLGFBQUQsQ0FBQyx1QkFBRCxDQUFDLENBQUUsT0FBTyxDQUFDLENBQUMsRUFBTyxFQUFFLEVBQUUsQ0FDdEIsRUFBRTt5Q0FDQSxRQUFRLENBQUMsUUFBUSxDQUFDO3lDQUNsQixPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FDdkMsQ0FBQztvQ0FDRixDQUFDLGFBQUQsQ0FBQyx1QkFBRCxDQUFDLENBQUUsT0FBTyxDQUFDLENBQUMsRUFBTyxFQUFFLEVBQUUsQ0FDdEIsRUFBRTt5Q0FDQSxRQUFRLENBQUMsV0FBVyxDQUFDO3lDQUNyQixPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FDdkMsQ0FBQztnQ0FDSCxDQUFDLENBQUMsQ0FBQzs2QkFDSDt3QkFDRixDQUFDLENBQUMsQ0FBQztxQkFDSDtvQkFFRCxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO3dCQUMxQixJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBTSxFQUFFLEVBQUUsQ0FDdkIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FDbEQsQ0FBQztxQkFDRjtvQkFFRCxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7b0JBQ3BCLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFNLEVBQUUsRUFBRSxDQUN2QixDQUFDO3lCQUNDLFFBQVEsQ0FBQyxTQUFTLENBQUM7eUJBQ25CLE9BQU8sQ0FBQyxhQUFhLENBQUM7eUJBQ3RCLE9BQU8sQ0FBQyxHQUFHLEVBQUU7d0JBQ2IsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO3dCQUN2QixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7b0JBQ25CLENBQUMsQ0FBQyxDQUNILENBQUM7b0JBRUYsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEVBQVMsQ0FBQyxDQUFDO2dCQUNsQyxDQUFDLENBQUEsQ0FBQztnQkFDRixHQUFHLENBQUMsS0FBSztvQkFDUixPQUFPLENBQUMsTUFBTSxHQUFHLENBQUM7d0JBQ2pCLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLHdCQUF3Qjt3QkFDM0MsQ0FBQyxDQUFDLG9CQUFvQixDQUFDO2FBQ3pCOztLQUNEO0lBRU8sdUJBQXVCO1FBQzlCLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFO1lBQ3hCLElBQUk7Z0JBQ0gsK0NBQStDO2dCQUMvQyxJQUFJLENBQUMsYUFBYSxHQUFJLElBQUksQ0FBQyxNQUFjLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQzthQUM3RDtZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNYLE9BQU8sQ0FBQyxJQUFJLENBQUMsNENBQTRDLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDOUQ7U0FDRDtJQUNGLENBQUM7SUFFYSxnQkFBZ0I7O1lBQzdCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNwQyxJQUFJLENBQUMsUUFBUTtnQkFBRSxPQUFPO1lBQ3RCLElBQUk7Z0JBQ0gsTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFNLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBVyxDQUFDO2dCQUNyRCxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUM3QywyQ0FBMkM7Z0JBQzNDLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTs7b0JBQ2hDLElBQUksQ0FBQyxDQUFDLFNBQVMsSUFBSSxDQUFDLENBQUEsTUFBQSxDQUFDLENBQUMsUUFBUSwwQ0FBRSxPQUFPLENBQUE7d0JBQUUsT0FBTyxLQUFLLENBQUM7b0JBQ3RELElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQzt3QkFBRSxPQUFPLEtBQUssQ0FBQztvQkFDMUQsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7b0JBQy9CLE9BQU8sR0FBRyxJQUFJLElBQUksSUFBSSxHQUFHLElBQUksRUFBRSxDQUFDO2dCQUNqQyxDQUFDLENBQUMsQ0FBQztnQkFDSCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRTtvQkFDcEIsSUFBSSxNQUFNLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQ3ZDLE9BQU87aUJBQ1A7Z0JBQ0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNsRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQzdDO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ1gsT0FBTyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUMsQ0FBQzthQUN4QztRQUNGLENBQUM7S0FBQTtJQUVPLHNCQUFzQixDQUFDLEtBQWE7UUFDM0MsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDO1FBQ2xCLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUNuRSxNQUFNLElBQUksR0FDVCxLQUFLLENBQUMsTUFBTSxHQUFHLE9BQU87WUFDckIsQ0FBQyxDQUFDLFdBQVcsS0FBSyxDQUFDLE1BQU0sR0FBRyxPQUFPLE9BQU87WUFDMUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNQLE9BQU8sR0FBRyxLQUFLLENBQUMsTUFBTSxzQkFBc0IsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQztJQUN2RSxDQUFDO0lBRWEsdUJBQXVCLENBQ3BDLElBQVUsRUFDVixJQUFZLEVBQ1osTUFBYzs7WUFFZCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsQ0FBQztZQUMzQyxNQUFNLEtBQUssR0FBRyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUM7WUFDakUsTUFBTSxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDL0IsTUFBTSxDQUFDLEdBQUcsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ25ELElBQUksQ0FBQyxFQUFFO2dCQUNOLENBQUMsQ0FBQyxPQUFPLEdBQUcsR0FBRyxFQUFFOztvQkFDaEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ3BDLG9CQUFvQjtvQkFDcEIsYUFBYTtvQkFDYixNQUFBLENBQUMsQ0FBQyxLQUFLLGlEQUFJLENBQUM7Z0JBQ2IsQ0FBQyxDQUFDO2FBQ0Y7UUFDRixDQUFDO0tBQUE7SUFFTyxlQUFlO1FBQ3RCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNsRCxPQUFPLHlCQUF5QixrQkFBa0IsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO0lBQ2pFLENBQUM7SUFFTyxTQUFTO1FBQ2hCLHlDQUF5QztRQUN6QyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUUzQix3Q0FBd0M7UUFDeEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ25DLElBQUk7WUFDSCxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQztTQUMzQjtRQUFDLFdBQU0sR0FBRTtJQUNYLENBQUM7SUFFYSxZQUFZLENBQUMsTUFBYzs7O1lBQ3hDLElBQUk7Z0JBQ0gsTUFBTSxDQUFBLE1BQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLDBDQUFFLGdCQUFnQixDQUFDO29CQUM1QyxNQUFNO29CQUNOLFNBQVMsRUFBRSxJQUFJO2lCQUNmLENBQUMsQ0FBQSxDQUFDO2FBQ0g7WUFBQyxXQUFNLEdBQUU7O0tBQ1Y7SUFFYSxXQUFXLENBQUMsSUFBVSxFQUFFLEtBQWE7OztZQUNsRCxJQUFJO2dCQUNILE1BQU0sQ0FBQSxNQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSwwQ0FBRSxVQUFVLENBQUM7b0JBQ3RDLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRTtvQkFDZixPQUFPLEVBQUU7d0JBQ1IsUUFBUSxFQUFFLGdDQUNOLENBQUMsSUFBSSxDQUFDLFFBQVEsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFjLEVBQUUsQ0FBQyxLQUM5QyxRQUFRLEVBQUUsS0FBSyxHQUNSO3FCQUNSO2lCQUNELENBQUMsQ0FBQSxDQUFDO2FBQ0g7WUFBQyxXQUFNLEdBQUU7O0tBQ1Y7SUFFYSxxQkFBcUIsQ0FBQyxJQUFVOztZQUM3QyxJQUFJO2dCQUNILE1BQU0sRUFBRSxlQUFlLEVBQUUsR0FBRyxNQUFNLE1BQU0sQ0FDdkMsNkNBQTZDLENBQzdDLENBQUM7Z0JBQ0YsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLENBQ2hDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBVSxFQUN0QixJQUFJLENBQUMsTUFBTSxFQUNYLFNBQVMsRUFDVCxJQUFJLENBQ0osQ0FBQztnQkFDRixLQUFLLENBQUMsY0FBYyxHQUFHLENBQU8sT0FBTyxFQUFFLEVBQUU7O29CQUN4QyxJQUFJLENBQUMsT0FBTzt3QkFBRSxPQUFPO29CQUNyQixNQUFNLENBQUMsR0FDTixDQUFBLE1BQUEsTUFBQyxNQUFjLEVBQUMsTUFBTSxtREFBRyxPQUFPLENBQUM7eUJBQ2pDLE1BQUEsTUFBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQVcsRUFBQyxNQUFNLG1EQUFHLE9BQU8sQ0FBQyxDQUFBLENBQUM7b0JBQzVDLE1BQU0sRUFBRSxHQUFHLE1BQUEsQ0FBQyxhQUFELENBQUMsdUJBQUQsQ0FBQyxDQUFFLE9BQU8saURBQUksQ0FBQztvQkFDMUIsSUFBSSxDQUFDLEVBQUU7d0JBQUUsT0FBTztvQkFDaEIsTUFBTSxDQUFBLE1BQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLDBDQUFFLFVBQVUsQ0FBQzt3QkFDdEMsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFO3dCQUNmLE9BQU8sRUFBRTs0QkFDUixRQUFRLEVBQUUsZ0NBQ04sQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQWMsRUFBRSxDQUFDLEtBQzlDLE9BQU8sRUFBRSxFQUFFLEdBQ0o7eUJBQ1I7cUJBQ0QsQ0FBQyxDQUFBLENBQUM7Z0JBQ0osQ0FBQyxDQUFBLENBQUM7Z0JBQ0YsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO2FBQ2I7WUFBQyxXQUFNLEdBQUU7UUFDWCxDQUFDO0tBQUE7SUFFYSxZQUFZLENBQUMsSUFBVSxFQUFFLFFBQWdCOzs7WUFDdEQsaURBQWlEO1lBQ2pELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUN4QixNQUFNLE1BQU0sR0FBRyxJQUFJLEdBQUcsUUFBUSxDQUFDO1lBQy9CLElBQUk7Z0JBQ0gsTUFBTSxDQUFBLE1BQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLDBDQUFFLFVBQVUsQ0FBQztvQkFDdEMsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFO29CQUNmLE9BQU8sRUFBRTt3QkFDUixRQUFRLEVBQUUsZ0NBQ04sQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQWMsRUFBRSxDQUFDLEtBQzlDLE9BQU8sRUFBRSxNQUFNLEdBQ1I7cUJBQ1I7aUJBQ0QsQ0FBQyxDQUFBLENBQUM7YUFDSDtZQUFDLFdBQU0sR0FBRTs7S0FDVjtJQUVPLHVCQUF1QixDQUFDLEtBQWEsRUFBRSxJQUFZO1FBQzFELElBQUk7WUFDSCxNQUFNLEdBQUcsR0FBSSxNQUFjLENBQUMsT0FBTyxJQUFLLFVBQWtCLENBQUMsT0FBTyxDQUFDO1lBQ25FLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDOUMsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLGFBQVIsUUFBUSx1QkFBUixRQUFRLENBQUUsWUFBWSxDQUFDO1lBQ3BELElBQUksb0JBQW9CLEVBQUU7Z0JBQ3pCLE1BQU0sQ0FBQyxHQUFHLElBQUksb0JBQW9CLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFDcEQsd0NBQXdDO2dCQUN4QyxJQUFJLE9BQU8sQ0FBQyxDQUFDLElBQUksS0FBSyxVQUFVO29CQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDM0MsT0FBTyxDQUFDLENBQUM7YUFDVDtTQUNEO1FBQUMsV0FBTTtZQUNQLFNBQVM7U0FDVDtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVhLGdCQUFnQixDQUM3QixLQUFhLEVBQ2IsSUFBWTs7WUFFWixJQUFJO2dCQUNILCtFQUErRTtnQkFDL0UsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDckQsSUFBSSxFQUFFO29CQUFFLE9BQU8sRUFBUyxDQUFDO2dCQUV6QiwyRUFBMkU7Z0JBQzNFLElBQUksY0FBYyxJQUFJLE1BQU0sRUFBRTtvQkFDN0IsSUFBSSxZQUFZLENBQUMsVUFBVSxLQUFLLFNBQVMsRUFBRTt3QkFDMUMsTUFBTSxZQUFZLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztxQkFDdkM7b0JBQ0QsSUFBSSxZQUFZLENBQUMsVUFBVSxLQUFLLFNBQVMsRUFBRTt3QkFDMUMsT0FBTyxJQUFJLFlBQVksQ0FBQyxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO3FCQUN6QztpQkFDRDtnQkFDRCw4QkFBOEI7Z0JBQzlCLElBQUksTUFBTSxDQUFDLEdBQUcsS0FBSyxLQUFLLElBQUksRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQ3RDO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ1gsT0FBTyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDdEMsSUFBSSxNQUFNLENBQUMsR0FBRyxLQUFLLEtBQUssSUFBSSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7YUFDdEM7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7S0FBQTtJQUVhLFFBQVEsQ0FBQyxJQUFVOztZQUNoQyxtQ0FBbUM7WUFDbkMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFFM0IsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FDL0MsSUFBSSxDQUFDLFFBQVEsQ0FDRyxDQUFDO1lBQ2xCLElBQUksQ0FBQyxJQUFJO2dCQUFFLE9BQU87WUFFbEIsa0VBQWtFO1lBQ2xFLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdEQsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRTFCLElBQUksQ0FBQyxDQUFDLElBQUksWUFBWSxLQUFLLENBQUM7Z0JBQUUsT0FBTztZQUVyQyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFO2dCQUN6QixNQUFNLEVBQUU7b0JBQ1AsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO2lCQUNmO2FBQ0QsQ0FBQyxDQUFDO1FBQ0osQ0FBQztLQUFBO0lBRWEsc0JBQXNCOztZQUNuQyxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFO2dCQUMvQixJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFDO2dCQUM3QyxPQUFPO2FBQ1A7WUFFRCxJQUFJO2dCQUNILE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLGlCQUFpQixFQUFFLENBQUM7YUFDcEQ7WUFBQyxPQUFPLEtBQUssRUFBRTtnQkFDZixPQUFPLENBQUMsS0FBSyxDQUFDLCtCQUErQixFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUN0RCxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMscUNBQXFDLENBQUMsQ0FBQyxDQUFDO2FBQ3JEO1FBQ0YsQ0FBQztLQUFBO0lBRU8sbUJBQW1COztRQUMxQixJQUFJO1lBQ0gsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxRQUFRO2dCQUFFLE9BQU87WUFFdEIsZ0NBQWdDO1lBQ2hDLE1BQU0sYUFBYSxHQUNsQixDQUFBLE1BQUEsUUFBUSxDQUFDLE1BQU0sMENBQUUsYUFBYSxLQUFJLFFBQVEsQ0FBQyxhQUFhLENBQUM7WUFDMUQsTUFBTSxnQkFBZ0IsR0FDckIsQ0FBQSxNQUFBLFFBQVEsQ0FBQyxNQUFNLDBDQUFFLGdCQUFnQjtnQkFDakMsQ0FBQyxHQUFHLEVBQUU7O29CQUNMLCtDQUErQztvQkFDL0MsTUFBTSxXQUFXLEdBQ2hCLENBQUEsTUFBQSxNQUFBLFFBQVEsQ0FBQyxNQUFNLDBDQUFFLHFCQUFxQixrREFBSTt5QkFDMUMsTUFBQSxNQUFBLFFBQVEsQ0FBQyxXQUFXLDBDQUFFLHFCQUFxQixrREFBSSxDQUFBLENBQUM7b0JBQ2pELE9BQU8sV0FBVzt3QkFDakIsQ0FBQyxDQUFDLE1BQUEsYUFBYSxhQUFiLGFBQWEsdUJBQWIsYUFBYSxDQUFFLGVBQWUsOERBQUcsV0FBVyxDQUFDO3dCQUMvQyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUNULENBQUMsQ0FBQyxDQUFDO1lBRUosTUFBTSxHQUFHLEdBQUcsZ0JBQWdCLGFBQWhCLGdCQUFnQix1QkFBaEIsZ0JBQWdCLEVBQUksQ0FBQztZQUNqQyxJQUFJLEdBQUcsRUFBRTtnQkFDUiwyQkFBMkI7Z0JBQzNCLElBQUksTUFBQSxHQUFHLENBQUMsV0FBVyxtREFBSSxFQUFFO29CQUN4QixNQUFBLEdBQUcsQ0FBQyxPQUFPLG1EQUFJLENBQUM7aUJBQ2hCO2dCQUNELHdCQUF3QjtnQkFDeEIsTUFBQSxHQUFHLENBQUMsSUFBSSxtREFBSSxDQUFDO2dCQUNiLE1BQUEsR0FBRyxDQUFDLEtBQUssbURBQUksQ0FBQztnQkFFZCwyREFBMkQ7Z0JBQzNELElBQUksUUFBUSxDQUFDLEtBQUssRUFBRTtvQkFDbkIsTUFBQSxHQUFHLENBQUMsY0FBYyxvREFBRyxJQUFJLENBQUMsQ0FBQztvQkFDM0IsVUFBVSxDQUFDLEdBQUcsRUFBRTs7d0JBQ2YsTUFBQSxHQUFHLENBQUMsY0FBYyxvREFBRyxLQUFLLENBQUMsQ0FBQztvQkFDN0IsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2lCQUNSO2FBQ0Q7U0FDRDtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQ0FBcUMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUN0RDtJQUNGLENBQUM7Q0FDRDtBQUVELGVBQWUseUJBQXlCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHAsIENvbXBvbmVudCwgTm90aWNlLCBQbGF0Zm9ybSwgVEZpbGUsIE1lbnUgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiLi4vaW5kZXhcIjtcclxuaW1wb3J0IHR5cGUgeyBUYXNrIH0gZnJvbSBcIi4uL3R5cGVzL3Rhc2tcIjtcclxuaW1wb3J0IHsgVHJheU1lbnVCdWlsZGVyIH0gZnJvbSBcIi4vdHJheS1tZW51XCI7XHJcbmltcG9ydCB7IGdldFRhc2tHZW5pdXNJY29uIH0gZnJvbSBcIi4uL2ljb25cIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHsgRWxlY3Ryb25RdWlja0NhcHR1cmUgfSBmcm9tIFwiLi9lbGVjdHJvbi1xdWljay1jYXB0dXJlXCI7XHJcblxyXG4vKiogRGVza3RvcCBpbnRlZ3JhdGlvbiBtYW5hZ2VyIGZvciBzeXN0ZW0gdHJheSwgbm90aWZpY2F0aW9ucywgYW5kIGRlc2t0b3AgZmVhdHVyZXMgKi9cclxuZXhwb3J0IGNsYXNzIERlc2t0b3BJbnRlZ3JhdGlvbk1hbmFnZXIgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdHByaXZhdGUgZGFpbHlUaW1lb3V0OiBudW1iZXIgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIG1pZG5pZ2h0VGltZW91dDogbnVtYmVyIHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBub3RpZmllZEtleXM6IFNldDxzdHJpbmc+ID0gbmV3IFNldCgpO1xyXG5cdHByaXZhdGUgc3RhdHVzQmFySXRlbTogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIGVsZWN0cm9uVHJheTogYW55IHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSB0cmF5T3duZXJUb2tlbj86IHN5bWJvbDtcclxuXHRwcml2YXRlIG5hdGl2ZVRoZW1lSGFuZGxlcj86ICgpID0+IHZvaWQ7XHJcblx0cHJpdmF0ZSBiZWZvcmVVbmxvYWRIYW5kbGVyPzogKCkgPT4gdm9pZDtcclxuXHRwcml2YXRlIHRyYXlDbGlja0hhbmRsZXI/OiAoKSA9PiB2b2lkO1xyXG5cdHByaXZhdGUgZWxlY3Ryb25RdWlja0NhcHR1cmU/OiBFbGVjdHJvblF1aWNrQ2FwdHVyZTtcclxuXHJcblx0Y29uc3RydWN0b3IocHJpdmF0ZSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbikge1xyXG5cdFx0c3VwZXIoKTtcclxuXHR9XHJcblxyXG5cdGFzeW5jIG9ubG9hZCgpIHtcclxuXHRcdC8vIEluaXRpYWxpemUgb24gbG9hZFxyXG5cdFx0aWYgKCFQbGF0Zm9ybS5pc0Rlc2t0b3BBcHApIHJldHVybjtcclxuXHJcblx0XHQvLyBJbml0aWFsaXplIHF1aWNrIGNhcHR1cmUgbWFuYWdlclxyXG5cdFx0dGhpcy5lbGVjdHJvblF1aWNrQ2FwdHVyZSA9IG5ldyBFbGVjdHJvblF1aWNrQ2FwdHVyZSh0aGlzLnBsdWdpbik7XHJcblxyXG5cdFx0Ly8gTWluaW1hbC1jaGFuZ2Ugc2FmZWd1YXJkIGZvciBoYXJkIHJlbG9hZHMgKHdpbmRvdy5sb2NhdGlvbilcclxuXHRcdHRyeSB7XHJcblx0XHRcdHRoaXMuYmVmb3JlVW5sb2FkSGFuZGxlciA9ICgpID0+IHtcclxuXHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0dGhpcy5lbGVjdHJvblRyYXk/LnJlbW92ZUFsbExpc3RlbmVycz8uKCk7XHJcblx0XHRcdFx0XHRjb25zdCBnOiBhbnkgPSB3aW5kb3cgYXMgYW55O1xyXG5cdFx0XHRcdFx0Y29uc3QgZ2xvYmFsS2V5ID1cclxuXHRcdFx0XHRcdFx0XCJfX3RnX3RyYXlfc2luZ2xldG9uX19cIiArIHRoaXMucGx1Z2luLmFwcC5hcHBJZDtcclxuXHRcdFx0XHRcdC8vIE9ubHkgZGVzdHJveSB0aGUgdHJheSBpZiB3ZSBvd24gaXRcclxuXHRcdFx0XHRcdGlmIChnW2dsb2JhbEtleV0/Lm93bmVyID09PSB0aGlzLnRyYXlPd25lclRva2VuKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMuZWxlY3Ryb25UcmF5Py5kZXN0cm95Py4oKTtcclxuXHRcdFx0XHRcdFx0ZGVsZXRlIGdbZ2xvYmFsS2V5XTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9IGNhdGNoIHt9XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoXHJcblx0XHRcdFx0d2luZG93LFxyXG5cdFx0XHRcdFwiYmVmb3JldW5sb2FkXCIsXHJcblx0XHRcdFx0dGhpcy5iZWZvcmVVbmxvYWRIYW5kbGVyXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyKCgpID0+IHtcclxuXHRcdFx0XHRpZiAodGhpcy5iZWZvcmVVbmxvYWRIYW5kbGVyKSB7XHJcblx0XHRcdFx0XHR3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcclxuXHRcdFx0XHRcdFx0XCJiZWZvcmV1bmxvYWRcIixcclxuXHRcdFx0XHRcdFx0dGhpcy5iZWZvcmVVbmxvYWRIYW5kbGVyXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0dGhpcy5iZWZvcmVVbmxvYWRIYW5kbGVyID0gdW5kZWZpbmVkO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9IGNhdGNoIHt9XHJcblxyXG5cdFx0Y29uc3QgdHJheU1vZGUgPVxyXG5cdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5kZXNrdG9wSW50ZWdyYXRpb24/LnRyYXlNb2RlIHx8IFwic3RhdHVzXCI7XHJcblxyXG5cdFx0Ly8gU3lzdGVtIHRyYXkgKGlmIGFsbG93ZWQpIOKAlCBkZWZlciB0byBhdm9pZCBibG9ja2luZyBwbHVnaW4gbG9hZFxyXG5cdFx0aWYgKHRyYXlNb2RlID09PSBcInN5c3RlbVwiIHx8IHRyYXlNb2RlID09PSBcImJvdGhcIikge1xyXG5cdFx0XHRpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVza3RvcEludGVncmF0aW9uPy5lbmFibGVUcmF5KSB7XHJcblx0XHRcdFx0c2V0VGltZW91dChhc3luYyAoKSA9PiB7XHJcblx0XHRcdFx0XHRjb25zdCB0cmF5T2sgPSBhd2FpdCB0aGlzLmNyZWF0ZU9yQWRvcHRFbGVjdHJvblRyYXkoKTtcclxuXHRcdFx0XHRcdGlmICghdHJheU9rICYmIHRyYXlNb2RlID09PSBcInN5c3RlbVwiKSB7XHJcblx0XHRcdFx0XHRcdC8vIEZhbGxiYWNrIHRvIHN0YXR1cyBiYXIgaWYgc3lzdGVtIHRyYXkgbm90IGF2YWlsYWJsZVxyXG5cdFx0XHRcdFx0XHR0aGlzLmNyZWF0ZU9yVXBkYXRlU3RhdHVzQmFyKCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHQvLyBFbnN1cmUgdHJheSByZWZsZWN0cyBjdXJyZW50IHN0YXRlIGFmdGVyIGNyZWF0aW9uXHJcblx0XHRcdFx0XHR0aGlzLnVwZGF0ZVRyYXkoKS5jYXRjaCgoKSA9PiB7fSk7XHJcblx0XHRcdFx0fSwgMCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBTdGF0dXMgYmFyIGluZGljYXRvclxyXG5cdFx0aWYgKHRyYXlNb2RlID09PSBcInN0YXR1c1wiIHx8IHRyYXlNb2RlID09PSBcImJvdGhcIikge1xyXG5cdFx0XHR0aGlzLmNyZWF0ZU9yVXBkYXRlU3RhdHVzQmFyKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5zZXR1cERhaWx5U3VtbWFyeSgpO1xyXG5cdFx0dGhpcy5zdGFydFBlclRhc2tUaWNrZXIoKTtcclxuXHJcblx0XHQvLyBJbml0aWFsIHVwZGF0ZXNcclxuXHRcdHRoaXMudXBkYXRlU3RhdHVzQmFyKCkuY2F0Y2goKCkgPT4ge30pO1xyXG5cdFx0dGhpcy51cGRhdGVUcmF5KCkuY2F0Y2goKCkgPT4ge30pO1xyXG5cdH1cclxuXHJcblx0b251bmxvYWQoKTogdm9pZCB7XHJcblx0XHRjb25zb2xlLmxvZyhcIltUcmF5RGVidWddIG9udW5sb2FkIGNhbGxlZFwiKTtcclxuXHRcdGlmICh0aGlzLmRhaWx5VGltZW91dCkgd2luZG93LmNsZWFyVGltZW91dCh0aGlzLmRhaWx5VGltZW91dCk7XHJcblx0XHRpZiAodGhpcy5taWRuaWdodFRpbWVvdXQpIHdpbmRvdy5jbGVhclRpbWVvdXQodGhpcy5taWRuaWdodFRpbWVvdXQpO1xyXG5cclxuXHRcdHRoaXMuZGFpbHlUaW1lb3V0ID0gbnVsbDtcclxuXHRcdHRoaXMubWlkbmlnaHRUaW1lb3V0ID0gbnVsbDtcclxuXHRcdHRoaXMubm90aWZpZWRLZXlzLmNsZWFyKCk7XHJcblx0XHRpZiAodGhpcy5zdGF0dXNCYXJJdGVtKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiW1RyYXlEZWJ1Z10gRGV0YWNoaW5nIHN0YXR1cyBiYXIgaXRlbVwiKTtcclxuXHRcdFx0dGhpcy5zdGF0dXNCYXJJdGVtLmRldGFjaCgpO1xyXG5cdFx0XHR0aGlzLnN0YXR1c0Jhckl0ZW0gPSBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlbW92ZSBiZWZvcmV1bmxvYWQgd2luZG93IGxpc3RlbmVyIGlmIHJlZ2lzdGVyZWRcclxuXHRcdGlmICh0aGlzLmJlZm9yZVVubG9hZEhhbmRsZXIpIHtcclxuXHRcdFx0d2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXHJcblx0XHRcdFx0XCJiZWZvcmV1bmxvYWRcIixcclxuXHRcdFx0XHR0aGlzLmJlZm9yZVVubG9hZEhhbmRsZXJcclxuXHRcdFx0KTtcclxuXHRcdFx0dGhpcy5iZWZvcmVVbmxvYWRIYW5kbGVyID0gdW5kZWZpbmVkO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENsZWFuIHVwIHRyYXkgcHJvcGVybHlcclxuXHRcdGNvbnN0IGdsb2JhbEtleSA9IFwiX190Z190cmF5X3NpbmdsZXRvbl9fXCIgKyB0aGlzLnBsdWdpbi5hcHAuYXBwSWQ7XHJcblx0XHRjb25zdCBnOiBhbnkgPSB3aW5kb3cgYXMgYW55O1xyXG5cclxuXHRcdGlmICh0aGlzLmVsZWN0cm9uVHJheSkge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIltUcmF5RGVidWddIENsZWFuaW5nIHVwIGVsZWN0cm9uIHRyYXlcIik7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Ly8gUmVtb3ZlIGFsbCBsaXN0ZW5lcnMgZmlyc3RcclxuXHRcdFx0XHR0aGlzLmVsZWN0cm9uVHJheS5yZW1vdmVBbGxMaXN0ZW5lcnM/LigpO1xyXG5cclxuXHRcdFx0XHQvLyBPbmx5IGRlc3Ryb3kgaWYgd2Ugb3duIHRoaXMgdHJheVxyXG5cdFx0XHRcdGlmIChnW2dsb2JhbEtleV0/Lm93bmVyID09PSB0aGlzLnRyYXlPd25lclRva2VuKSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIltUcmF5RGVidWddIERlc3Ryb3lpbmcgb3duZWQgdHJheVwiKTtcclxuXHRcdFx0XHRcdHRoaXMuZWxlY3Ryb25UcmF5LmRlc3Ryb3k/LigpO1xyXG5cdFx0XHRcdFx0Ly8gQ2xlYXIgdGhlIGdsb2JhbCByZWZlcmVuY2Ugc2luY2Ugd2UgZGVzdHJveWVkIGl0XHJcblx0XHRcdFx0XHRkZWxldGUgZ1tnbG9iYWxLZXldO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIltUcmF5RGVidWddIE5vdCBkZXN0cm95aW5nIHRyYXkgLSBub3Qgb3duZXJcIik7XHJcblx0XHRcdFx0XHQvLyBJZiB3ZSBkb24ndCBvd24gaXQsIHJlcGxhY2UgY29udGV4dCBtZW51IHdpdGggYW4gZW1wdHkgb25lIHRvIGRyb3AgY2xvc3VyZXMgcmVmZXJlbmNpbmcgdGhpcyBpbnN0YW5jZVxyXG5cdFx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgZWxlY3Ryb24gPSB0aGlzLmdldEVsZWN0cm9uKCk7XHJcblx0XHRcdFx0XHRcdGNvbnN0IE1lbnUgPSBlbGVjdHJvbj8uTWVudSB8fCBlbGVjdHJvbj8ucmVtb3RlPy5NZW51O1xyXG5cdFx0XHRcdFx0XHRpZiAoTWVudSAmJiB0aGlzLmVsZWN0cm9uVHJheT8uc2V0Q29udGV4dE1lbnUpIHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmVsZWN0cm9uVHJheS5zZXRDb250ZXh0TWVudShcclxuXHRcdFx0XHRcdFx0XHRcdE1lbnUuYnVpbGRGcm9tVGVtcGxhdGUoW10pXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSBjYXRjaCB7fVxyXG5cdFx0XHRcdFx0Ly8gQWxzbyBjbGVhciBhbnkgc3RvcmVkIGdsb2JhbCBjbGljayBoYW5kbGVyIHJlZmVyZW5jZVxyXG5cdFx0XHRcdFx0aWYgKGdbZ2xvYmFsS2V5XSkge1xyXG5cdFx0XHRcdFx0XHRnW2dsb2JhbEtleV0uY2xpY2tIYW5kbGVyID0gdW5kZWZpbmVkO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJbVHJheURlYnVnXSBFcnJvciBjbGVhbmluZyB1cCB0cmF5OlwiLCBlKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0dGhpcy5lbGVjdHJvblRyYXkgPSBudWxsO1xyXG5cdFx0dGhpcy50cmF5T3duZXJUb2tlbiA9IHVuZGVmaW5lZDtcclxuXHJcblx0XHQvLyBDbGVhbiB1cCBxdWljayBjYXB0dXJlXHJcblx0XHRpZiAodGhpcy5lbGVjdHJvblF1aWNrQ2FwdHVyZSkge1xyXG5cdFx0XHR0aGlzLmVsZWN0cm9uUXVpY2tDYXB0dXJlLmRlc3Ryb3koKTtcclxuXHRcdFx0dGhpcy5lbGVjdHJvblF1aWNrQ2FwdHVyZSA9IHVuZGVmaW5lZDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIENhbGxlZCB3aGVuIHNldHRpbmdzIGNoYW5nZVxyXG5cdHB1YmxpYyBhc3luYyByZWxvYWRTZXR0aW5ncygpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGNvbnNvbGUubG9nKFwiW1RyYXlEZWJ1Z10gcmVsb2FkU2V0dGluZ3MgY2FsbGVkXCIpO1xyXG5cdFx0dGhpcy5vbnVubG9hZCgpO1xyXG5cdFx0Ly8gQWRkIGEgc21hbGwgZGVsYXkgdG8gZW5zdXJlIGNsZWFudXAgY29tcGxldGVzXHJcblx0XHRhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDApKTtcclxuXHRcdGF3YWl0IHRoaXMub25sb2FkKCk7XHJcblx0XHRjb25zb2xlLmxvZyhcIltUcmF5RGVidWddIHJlbG9hZFNldHRpbmdzIGNvbXBsZXRlZFwiKTtcclxuXHR9XHJcblxyXG5cdC8vIEV4dGVybmFsIG51ZGdlIHdoZW4gdGFzayBjYWNoZSB1cGRhdGVzXHJcblx0cHVibGljIG9uVGFza0NhY2hlVXBkYXRlZCgpOiB2b2lkIHtcclxuXHRcdC8vIERvIGEgcXVpY2sgcGFzcyB0byBjYXRjaCBhbnkgaW1taW5lbnRseSBkdWUgaXRlbXNcclxuXHRcdHRoaXMuc2NhbkFuZE5vdGlmeVBlclRhc2soKS5jYXRjaCgoKSA9PiB7fSk7XHJcblx0XHQvLyBVcGRhdGUgc3RhdHVzIGJhciBjb3VudHNcclxuXHRcdHRoaXMudXBkYXRlU3RhdHVzQmFyKCkuY2F0Y2goKCkgPT4ge30pO1xyXG5cdFx0dGhpcy51cGRhdGVUcmF5KCkuY2F0Y2goKCkgPT4ge30pO1xyXG5cdH1cclxuXHJcblx0Ly8gUHVibGljIHRyaWdnZXJzIGZvciBzZXR0aW5ncy9hY3Rpb25zXHJcblx0cHVibGljIGFzeW5jIHRyaWdnZXJEYWlseVN1bW1hcnkoKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRhd2FpdCB0aGlzLnNlbmREYWlseVN1bW1hcnkoKTtcclxuXHR9XHJcblx0cHVibGljIHRyaWdnZXJJbW1pbmVudFNjYW4oKTogdm9pZCB7XHJcblx0XHR0aGlzLnNjYW5BbmROb3RpZnlQZXJUYXNrKCkuY2F0Y2goKCkgPT4ge30pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBnZXRRdWVyeUFQSSgpIHtcclxuXHRcdGNvbnN0IGRmID0gdGhpcy5wbHVnaW4uZGF0YWZsb3dPcmNoZXN0cmF0b3IgYXMgYW55O1xyXG5cdFx0aWYgKCFkZikgcmV0dXJuIG51bGw7XHJcblx0XHRyZXR1cm4gZGYuZ2V0UXVlcnlBUEk/LigpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBnZXRFbGVjdHJvbigpOiBhbnkgfCBudWxsIHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdC8vIFByZWZlciB3aW5kb3cuZWxlY3Ryb24gaW5qZWN0ZWQgYnkgcHJlbG9hZCAocGVyIHlvdXIgY2hhbmdlKVxyXG5cdFx0XHRjb25zdCBpbmplY3RlZCA9XHJcblx0XHRcdFx0KHdpbmRvdyBhcyBhbnkpLmVsZWN0cm9uIHx8IChnbG9iYWxUaGlzIGFzIGFueSkuZWxlY3Ryb247XHJcblx0XHRcdGlmIChpbmplY3RlZCkgcmV0dXJuIGluamVjdGVkO1xyXG5cdFx0XHQvLyBGYWxsYmFjayB0byByZXF1aXJlIHdoZW4gYXZhaWxhYmxlXHJcblx0XHRcdGNvbnN0IHJlcSA9ICh3aW5kb3cgYXMgYW55KS5yZXF1aXJlIHx8IChnbG9iYWxUaGlzIGFzIGFueSkucmVxdWlyZTtcclxuXHRcdFx0cmV0dXJuIHJlcSA/IHJlcShcImVsZWN0cm9uXCIpIDogbnVsbDtcclxuXHRcdH0gY2F0Y2gge1xyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgY3JlYXRlT3JBZG9wdEVsZWN0cm9uVHJheSgpOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiW1RyYXlEZWJ1Z10gY3JlYXRlT3JBZG9wdEVsZWN0cm9uVHJheSBjYWxsZWRcIik7XHJcblx0XHRcdGNvbnN0IGVsZWN0cm9uID0gdGhpcy5nZXRFbGVjdHJvbigpO1xyXG5cdFx0XHRpZiAoIWVsZWN0cm9uKSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXCJbVHJheURlYnVnXSBObyBlbGVjdHJvbiBhdmFpbGFibGVcIik7XHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHRcdC8vIFByZWZlciBjcmVhdGluZyB0cmF5IGluIG1haW4gcHJvY2VzcyB2aWEgcmVtb3RlIHdoZW4gYXZhaWxhYmxlXHJcblx0XHRcdGNvbnN0IFRyYXkgPVxyXG5cdFx0XHRcdChlbGVjdHJvbiBhcyBhbnkpLnJlbW90ZT8uVHJheSB8fCAoZWxlY3Ryb24gYXMgYW55KS5UcmF5O1xyXG5cdFx0XHRjb25zdCBuYXRpdmVJbWFnZSA9XHJcblx0XHRcdFx0KGVsZWN0cm9uIGFzIGFueSkucmVtb3RlPy5uYXRpdmVJbWFnZSB8fFxyXG5cdFx0XHRcdChlbGVjdHJvbiBhcyBhbnkpLm5hdGl2ZUltYWdlO1xyXG5cdFx0XHRpZiAoIVRyYXkgfHwgIW5hdGl2ZUltYWdlKSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXCJbVHJheURlYnVnXSBUcmF5IG9yIG5hdGl2ZUltYWdlIG5vdCBhdmFpbGFibGVcIik7XHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBSZXVzZSBleGlzdGluZyB0cmF5IGlmIGdsb2JhbCBzaW5nbGV0b24gZXhpc3RzXHJcblx0XHRcdGNvbnN0IGdsb2JhbEtleSA9IFwiX190Z190cmF5X3NpbmdsZXRvbl9fXCIgKyB0aGlzLnBsdWdpbi5hcHAuYXBwSWQ7XHJcblx0XHRcdGNvbnN0IGc6IGFueSA9IHdpbmRvdyBhcyBhbnk7XHJcblx0XHRcdGlmIChnW2dsb2JhbEtleV0/LnRyYXkgJiYgZ1tnbG9iYWxLZXldPy5vd25lcikge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiW1RyYXlEZWJ1Z10gQ2hlY2tpbmcgZXhpc3RpbmcgdHJheS4uLlwiKTtcclxuXHRcdFx0XHQvLyBDaGVjayBpZiB0aGUgdHJheSBpcyBzdGlsbCB2YWxpZCAobm90IGRlc3Ryb3llZClcclxuXHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0Ly8gVHJ5IHRvIGFjY2VzcyBhIHByb3BlcnR5IHRvIGNoZWNrIGlmIHRyYXkgaXMgYWxpdmVcclxuXHRcdFx0XHRcdGNvbnN0IGlzRGVzdHJveWVkID1cclxuXHRcdFx0XHRcdFx0Z1tnbG9iYWxLZXldLnRyYXkuaXNEZXN0cm95ZWQ/LigpID8/IGZhbHNlO1xyXG5cdFx0XHRcdFx0aWYgKGlzRGVzdHJveWVkKSB7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRcdFwiW1RyYXlEZWJ1Z10gRXhpc3RpbmcgdHJheSBpcyBkZXN0cm95ZWQsIGNsZWFuaW5nIHVwXCJcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0ZGVsZXRlIGdbZ2xvYmFsS2V5XTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiW1RyYXlEZWJ1Z10gQWRvcHRpbmcgZXhpc3RpbmcgdmFsaWQgdHJheVwiKTtcclxuXHRcdFx0XHRcdFx0Ly8gQWRvcHQgZXhpc3RpbmcgdHJheSAtIGRvbid0IHJlY3JlYXRlXHJcblx0XHRcdFx0XHRcdHRoaXMuZWxlY3Ryb25UcmF5ID0gZ1tnbG9iYWxLZXldLnRyYXk7XHJcblx0XHRcdFx0XHRcdHRoaXMudHJheU93bmVyVG9rZW4gPSBnW2dsb2JhbEtleV0ub3duZXI7XHJcblx0XHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gRW5zdXJlIG5vIHN0YWxlIGxpc3RlbmVycyBmcm9tIHByZXZpb3VzIGluc3RhbmNlIHJlbWFpblxyXG5cdFx0XHRcdFx0XHRcdHRoaXMuZWxlY3Ryb25UcmF5LnJlbW92ZUFsbExpc3RlbmVycz8uKCk7XHJcblx0XHRcdFx0XHRcdFx0Ly8gQXR0YWNoIGEgZnJlc2ggY2xpY2sgaGFuZGxlciBib3VuZCB0byB0aGlzIGluc3RhbmNlXHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgY2xpY2tIYW5kbGVyID0gYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0YXdhaXQgdGhpcy5zZW5kRGFpbHlTdW1tYXJ5KCk7XHJcblx0XHRcdFx0XHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHQodGhpcy5wbHVnaW4gYXMgYW55KS5hY3RpdmF0ZVRhc2tWaWV3Py4oKTtcclxuXHRcdFx0XHRcdFx0XHRcdH0gY2F0Y2gge31cclxuXHRcdFx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMuZWxlY3Ryb25UcmF5Lm9uPy4oXCJjbGlja1wiLCBjbGlja0hhbmRsZXIpO1xyXG5cdFx0XHRcdFx0XHRcdC8vIFJlcGxhY2UgZ2xvYmFsIGNsaWNrIGhhbmRsZXIgcmVmZXJlbmNlIHRvIGF2b2lkIHBpbm5pbmcgb2xkIHBsdWdpbiBpbnN0YW5jZVxyXG5cdFx0XHRcdFx0XHRcdGdbZ2xvYmFsS2V5XS5jbGlja0hhbmRsZXIgPSBjbGlja0hhbmRsZXI7XHJcblx0XHRcdFx0XHRcdFx0YXdhaXQgdGhpcy5hcHBseVRoZW1lVG9UcmF5KG5hdGl2ZUltYWdlKTtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnN1YnNjcmliZU5hdGl2ZVRoZW1lKG5hdGl2ZUltYWdlKTtcclxuXHRcdFx0XHRcdFx0fSBjYXRjaCB7fVxyXG5cdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIltUcmF5RGVidWddIEVycm9yIGNoZWNraW5nIHRyYXkgdmFsaWRpdHk6XCIsIGUpO1xyXG5cdFx0XHRcdFx0ZGVsZXRlIGdbZ2xvYmFsS2V5XTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENyZWF0ZSBhIG5ldyB0cmF5IGFuZCBhcHBseSB0aGVtZS1iYXNlZCBpY29uXHJcblx0XHRcdGNvbnNvbGUubG9nKFwiW1RyYXlEZWJ1Z10gQ3JlYXRpbmcgbmV3IHRyYXlcIik7XHJcblx0XHRcdHRoaXMuZWxlY3Ryb25UcmF5ID0gbmV3IFRyYXkobmF0aXZlSW1hZ2UuY3JlYXRlRW1wdHkoKSk7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0dGhpcy5lbGVjdHJvblRyYXkuc2V0VG9vbFRpcChcIlRhc2sgR2VuaXVzXCIpO1xyXG5cdFx0XHR9IGNhdGNoIHt9XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0YXdhaXQgdGhpcy5hcHBseVRoZW1lVG9UcmF5KG5hdGl2ZUltYWdlKTtcclxuXHRcdFx0XHR0aGlzLnN1YnNjcmliZU5hdGl2ZVRoZW1lKG5hdGl2ZUltYWdlKTtcclxuXHRcdFx0fSBjYXRjaCB7fVxyXG5cclxuXHRcdFx0Ly8gU3RvcmUgY2xpY2sgaGFuZGxlciByZWZlcmVuY2UgZm9yIGNsZWFudXBcclxuXHRcdFx0dGhpcy50cmF5Q2xpY2tIYW5kbGVyID0gYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRcdGF3YWl0IHRoaXMuc2VuZERhaWx5U3VtbWFyeSgpO1xyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHQodGhpcy5wbHVnaW4gYXMgYW55KS5hY3RpdmF0ZVRhc2tWaWV3Py4oKTtcclxuXHRcdFx0XHR9IGNhdGNoIHt9XHJcblx0XHRcdH07XHJcblx0XHRcdHRoaXMuZWxlY3Ryb25UcmF5LnJlbW92ZUFsbExpc3RlbmVycz8uKCk7XHJcblx0XHRcdHRoaXMuZWxlY3Ryb25UcmF5Lm9uPy4oXCJjbGlja1wiLCB0aGlzLnRyYXlDbGlja0hhbmRsZXIpO1xyXG5cclxuXHRcdFx0Ly8gU2F2ZSBnbG9iYWxseSBzbyBzdWJzZXF1ZW50IHJlbG9hZHMgcmV1c2UgaXRcclxuXHRcdFx0Y29uc3Qgb3duZXIgPSBTeW1ib2woXCJ0Zy10cmF5LW93bmVyXCIpO1xyXG5cdFx0XHQvLyBFbnN1cmUgd2UgZG9uJ3QgbGVhayBtdWx0aXBsZSBsaXN0ZW5lcnMgb24gSE1SL3JlbG9hZHNcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRnW2dsb2JhbEtleV0/LnRyYXk/LnJlbW92ZUFsbExpc3RlbmVycz8uKCk7XHJcblx0XHRcdH0gY2F0Y2gge31cclxuXHRcdFx0Z1tnbG9iYWxLZXldID0ge1xyXG5cdFx0XHRcdHRyYXk6IHRoaXMuZWxlY3Ryb25UcmF5LFxyXG5cdFx0XHRcdG93bmVyLFxyXG5cdFx0XHRcdGNsaWNrSGFuZGxlcjogdGhpcy50cmF5Q2xpY2tIYW5kbGVyLFxyXG5cdFx0XHR9O1xyXG5cdFx0XHR0aGlzLnRyYXlPd25lclRva2VuID0gb3duZXI7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiW1RyYXlEZWJ1Z10gTmV3IHRyYXkgY3JlYXRlZCBhbmQgc2F2ZWQgZ2xvYmFsbHlcIik7XHJcblxyXG5cdFx0XHQvLyBEb25lXHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXCJGYWlsZWQgdG8gY3JlYXRlL2Fkb3B0IEVsZWN0cm9uIHRyYXk6XCIsIGUpO1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldE5hdGl2ZVRoZW1lKCk6IGFueSB8IG51bGwge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgZWxlY3Ryb24gPSB0aGlzLmdldEVsZWN0cm9uKCk7XHJcblx0XHRcdHJldHVybiAoXHJcblx0XHRcdFx0KGVsZWN0cm9uIGFzIGFueSk/Lm5hdGl2ZVRoZW1lIHx8XHJcblx0XHRcdFx0KGVsZWN0cm9uIGFzIGFueSk/LnJlbW90ZT8ubmF0aXZlVGhlbWUgfHxcclxuXHRcdFx0XHRudWxsXHJcblx0XHRcdCk7XHJcblx0XHR9IGNhdGNoIHtcclxuXHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGlzRGFya1RoZW1lKCk6IGJvb2xlYW4ge1xyXG5cdFx0Y29uc3QgbnQgPSB0aGlzLmdldE5hdGl2ZVRoZW1lKCk7XHJcblxyXG5cdFx0aWYgKG50ICYmIHR5cGVvZiBudC5zaG91bGRVc2VEYXJrQ29sb3JzID09PSBcImJvb2xlYW5cIilcclxuXHRcdFx0cmV0dXJuIG50LnNob3VsZFVzZURhcmtDb2xvcnM7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRyZXR1cm4gd2luZG93Lm1hdGNoTWVkaWEoXCIocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspXCIpLm1hdGNoZXM7XHJcblx0XHR9IGNhdGNoIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBhcHBseVRoZW1lVG9UcmF5KG5hdGl2ZUltYWdlOiBhbnkpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGNvbnNvbGUubG9nKHRoaXMuZWxlY3Ryb25UcmF5LCBcInRyYXlcIik7XHJcblx0XHRpZiAoIXRoaXMuZWxlY3Ryb25UcmF5KSByZXR1cm47XHJcblxyXG5cdFx0Ly8gRm9yIG1hY09TLCBhbHdheXMgdXNlIGJsYWNrIGFuZCBsZXQgVGVtcGxhdGUgSW1hZ2UgaGFuZGxlIHRoZW1lXHJcblx0XHQvLyBGb3IgV2luZG93cy9MaW51eCwgbWFudWFsbHkgc2V0IGNvbG9yIGJhc2VkIG9uIHRoZW1lXHJcblx0XHRjb25zdCB1c2VUZW1wbGF0ZUltYWdlID0gUGxhdGZvcm0uaXNNYWNPUztcclxuXHRcdGNvbnN0IGltZyA9IGF3YWl0IHRoaXMuYnVpbGRUcmF5TmF0aXZlSW1hZ2UoXHJcblx0XHRcdG5hdGl2ZUltYWdlLFxyXG5cdFx0XHR1c2VUZW1wbGF0ZUltYWdlXHJcblx0XHQpO1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0dGhpcy5lbGVjdHJvblRyYXkuc2V0SW1hZ2U/LihpbWcpO1xyXG5cdFx0fSBjYXRjaCB7fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBzdWJzY3JpYmVOYXRpdmVUaGVtZShuYXRpdmVJbWFnZTogYW55KTogdm9pZCB7XHJcblx0XHRjb25zdCBudCA9IHRoaXMuZ2V0TmF0aXZlVGhlbWUoKTtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGlmICghbnQpIHJldHVybjtcclxuXHRcdFx0Ly8gUmVtb3ZlIG9ubHkgb3VyIHByZXZpb3VzIGhhbmRsZXIgdG8gYXZvaWQgaW50ZXJmZXJpbmcgd2l0aCBvdGhlcnNcclxuXHRcdFx0aWYgKHRoaXMubmF0aXZlVGhlbWVIYW5kbGVyKSB7XHJcblx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdChudCBhcyBhbnkpLm9mZj8uKFwidXBkYXRlZFwiLCB0aGlzLm5hdGl2ZVRoZW1lSGFuZGxlcik7XHJcblx0XHRcdFx0fSBjYXRjaCB7fVxyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHQobnQgYXMgYW55KS5yZW1vdmVMaXN0ZW5lcj8uKFxyXG5cdFx0XHRcdFx0XHRcInVwZGF0ZWRcIixcclxuXHRcdFx0XHRcdFx0dGhpcy5uYXRpdmVUaGVtZUhhbmRsZXJcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fSBjYXRjaCB7fVxyXG5cdFx0XHR9XHJcblx0XHRcdGNvbnN0IGhhbmRsZXIgPSAoKSA9PiB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXCJbVHJheURlYnVnXSBUaGVtZSBjaGFuZ2VkLCB1cGRhdGluZyB0cmF5IGljb25cIik7XHJcblx0XHRcdFx0dGhpcy5hcHBseVRoZW1lVG9UcmF5KG5hdGl2ZUltYWdlKS5jYXRjaCgoKSA9PiB7fSk7XHJcblx0XHRcdH07XHJcblx0XHRcdHRoaXMubmF0aXZlVGhlbWVIYW5kbGVyID0gaGFuZGxlcjtcclxuXHRcdFx0KG50IGFzIGFueSkub24/LihcInVwZGF0ZWRcIiwgaGFuZGxlcik7XHJcblx0XHRcdC8vIEVuc3VyZSBjbGVhbnVwIG9uIHVubG9hZFxyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdC8vIEB0cy1pZ25vcmUgQ29tcG9uZW50LnJlZ2lzdGVyIGV4aXN0cyB0byByZWdpc3RlciBkaXNwb3NlcnNcclxuXHRcdFx0XHR0aGlzLnJlZ2lzdGVyKCgpID0+IHtcclxuXHRcdFx0XHRcdGNvbnN0IG50dCA9IHRoaXMuZ2V0TmF0aXZlVGhlbWUoKTtcclxuXHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdChudHQgYXMgYW55KT8ub2ZmPy4oXCJ1cGRhdGVkXCIsIGhhbmRsZXIpO1xyXG5cdFx0XHRcdFx0fSBjYXRjaCB7fVxyXG5cdFx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdFx0KG50dCBhcyBhbnkpPy5yZW1vdmVMaXN0ZW5lcj8uKFwidXBkYXRlZFwiLCBoYW5kbGVyKTtcclxuXHRcdFx0XHRcdH0gY2F0Y2gge31cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSBjYXRjaCB7fVxyXG5cdFx0fSBjYXRjaCB7fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBidWlsZFRyYXlOYXRpdmVJbWFnZShcclxuXHRcdG5hdGl2ZUltYWdlOiBhbnksXHJcblx0XHR1c2VUZW1wbGF0ZUltYWdlOiBib29sZWFuID0gZmFsc2VcclxuXHQpOiBQcm9taXNlPGFueT4ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3Qgc2l6ZSA9IFBsYXRmb3JtLmlzTWFjT1MgPyAxNCA6IDI0O1xyXG5cdFx0XHRjb25zdCBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpO1xyXG5cdFx0XHRjYW52YXMud2lkdGggPSBzaXplO1xyXG5cdFx0XHRjYW52YXMuaGVpZ2h0ID0gc2l6ZTtcclxuXHRcdFx0Y29uc3QgY3R4ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuXHRcdFx0aWYgKCFjdHgpIHJldHVybiBuYXRpdmVJbWFnZS5jcmVhdGVFbXB0eSgpO1xyXG5cclxuXHRcdFx0Ly8gRm9yIFRlbXBsYXRlIEltYWdlcyAobWFjT1MpLCBhbHdheXMgdXNlIGJsYWNrXHJcblx0XHRcdC8vIEZvciByZWd1bGFyIGltYWdlcyAoV2luZG93cy9MaW51eCksIHVzZSBuZXV0cmFsIGdyYXlcclxuXHRcdFx0bGV0IGFjdHVhbENvbG9yOiBzdHJpbmc7XHJcblx0XHRcdGlmICh1c2VUZW1wbGF0ZUltYWdlKSB7XHJcblx0XHRcdFx0Ly8gVGVtcGxhdGUgaW1hZ2VzIHNob3VsZCBiZSBwdXJlIGJsYWNrIC0gbWFjT1Mgd2lsbCBoYW5kbGUgaW52ZXJzaW9uXHJcblx0XHRcdFx0YWN0dWFsQ29sb3IgPSBcIiMwMDAwMDBcIjtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBGb3IgV2luZG93cy9MaW51eCwgdXNlIGEgbmV1dHJhbCBncmF5IHRoYXQgd29ya3Mgb24gYW55IGJhY2tncm91bmRcclxuXHRcdFx0XHQvLyAjNjY2NjY2IHByb3ZpZGVzIGdvb2QgY29udHJhc3Qgb24gYm90aCBsaWdodCBhbmQgZGFyayBiYWNrZ3JvdW5kc1xyXG5cdFx0XHRcdGFjdHVhbENvbG9yID0gXCIjYzdjN2M3ZmZcIjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVXNlIFRhc2sgR2VuaXVzIGljb24gd2l0aCBhcHByb3ByaWF0ZSBjb2xvclxyXG5cdFx0XHRjb25zdCBzdmcgPSB0aGlzLmdlbmVyYXRlVGhlbWVkVGFza0dlbml1c0ljb24oYWN0dWFsQ29sb3IpO1xyXG5cclxuXHRcdFx0Y29uc3QgaW1nID0gbmV3IEltYWdlKCk7XHJcblx0XHRcdGNvbnN0IGJsb2IgPSBuZXcgQmxvYihbc3ZnXSwgeyB0eXBlOiBcImltYWdlL3N2Zyt4bWxcIiB9KTtcclxuXHRcdFx0Y29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcclxuXHRcdFx0YXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUpID0+IHtcclxuXHRcdFx0XHRpbWcub25sb2FkID0gKCkgPT4gcmVzb2x2ZSgpO1xyXG5cdFx0XHRcdGltZy5zcmMgPSB1cmw7XHJcblx0XHRcdH0pO1xyXG5cdFx0XHRjdHguY2xlYXJSZWN0KDAsIDAsIHNpemUsIHNpemUpO1xyXG5cdFx0XHRjdHguZHJhd0ltYWdlKGltZywgMCwgMCwgc2l6ZSwgc2l6ZSk7XHJcblx0XHRcdFVSTC5yZXZva2VPYmplY3RVUkwodXJsKTtcclxuXHJcblx0XHRcdGNvbnN0IGRhdGFVcmwgPSBjYW52YXMudG9EYXRhVVJMKFwiaW1hZ2UvcG5nXCIpO1xyXG5cdFx0XHRjb25zdCBuaSA9IG5hdGl2ZUltYWdlLmNyZWF0ZUZyb21EYXRhVVJMKGRhdGFVcmwpO1xyXG5cclxuXHRcdFx0Ly8gU2V0IGFzIHRlbXBsYXRlIGltYWdlIGlmIHJlcXVlc3RlZCAobWFjT1MpXHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0aWYgKHVzZVRlbXBsYXRlSW1hZ2UgJiYgbmkuc2V0VGVtcGxhdGVJbWFnZSkge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXCJbVHJheURlYnVnXSBTZXR0aW5nIGFzIHRlbXBsYXRlIGltYWdlXCIpO1xyXG5cdFx0XHRcdFx0bmkuc2V0VGVtcGxhdGVJbWFnZSh0cnVlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gY2F0Y2gge31cclxuXHJcblx0XHRcdHJldHVybiBuaTtcclxuXHRcdH0gY2F0Y2gge1xyXG5cdFx0XHRyZXR1cm4gbmF0aXZlSW1hZ2UuY3JlYXRlRW1wdHkoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZ2V0Q3VycmVudFRoZW1lQ29sb3IoKTogc3RyaW5nIHtcclxuXHRcdC8vIEdldCBjdXJyZW50IHRoZW1lIGNvbG9yIGJhc2VkIG9uIHN5c3RlbSBwcmVmZXJlbmNlXHJcblx0XHRjb25zdCBpc0RhcmsgPSB0aGlzLmlzRGFya1RoZW1lKCk7XHJcblx0XHQvLyBVc2UgQ1NTIHZhcmlhYmxlIG9yIGRlZmF1bHQgY29sb3JzXHJcblx0XHRjb25zdCBzdHlsZXMgPSBnZXRDb21wdXRlZFN0eWxlKGRvY3VtZW50LmJvZHkpO1xyXG5cdFx0Y29uc3QgY3VycmVudENvbG9yID1cclxuXHRcdFx0c3R5bGVzLmdldFByb3BlcnR5VmFsdWUoXCItLXRleHQtbm9ybWFsXCIpPy50cmltKCkgfHxcclxuXHRcdFx0KGlzRGFyayA/IFwiI0ZGRkZGRlwiIDogXCIjMDAwMDAwXCIpO1xyXG5cdFx0cmV0dXJuIGN1cnJlbnRDb2xvcjtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZ2VuZXJhdGVUaGVtZWRUYXNrR2VuaXVzSWNvbihjb2xvcjogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdC8vIEdldCB0aGUgb3JpZ2luYWwgVGFzayBHZW5pdXMgaWNvbiBhbmQgcmVwbGFjZSBjdXJyZW50Q29sb3Igd2l0aCB0aGUgdGhlbWUgY29sb3JcclxuXHRcdGNvbnN0IG9yaWdpbmFsU3ZnID0gZ2V0VGFza0dlbml1c0ljb24oKTtcclxuXHRcdC8vIFJlcGxhY2UgYWxsIGluc3RhbmNlcyBvZiBjdXJyZW50Q29sb3Igd2l0aCB0aGUgZHluYW1pYyBjb2xvclxyXG5cclxuXHRcdHJldHVybiBvcmlnaW5hbFN2Zy5yZXBsYWNlKC9jdXJyZW50Q29sb3IvZywgY29sb3IpO1xyXG5cdH1cclxuXHJcblx0Ly8gSGVscGVyOiBpZGVudGlmeSBJQ1MgYmFkZ2UgdGFza3MgdG8gZXhjbHVkZSBmcm9tIHRyYXkvc3RhdHVzIG1lbnVzXHJcblx0cHJpdmF0ZSBpc0ljc0JhZGdlKHRhc2s6IFRhc2spOiBib29sZWFuIHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IHNyY1R5cGUgPVxyXG5cdFx0XHRcdCh0YXNrIGFzIGFueSk/Lm1ldGFkYXRhPy5zb3VyY2U/LnR5cGUgPz9cclxuXHRcdFx0XHQodGFzayBhcyBhbnkpPy5zb3VyY2U/LnR5cGU7XHJcblx0XHRcdGNvbnN0IGlzSWNzID0gc3JjVHlwZSA9PT0gXCJpY3NcIjtcclxuXHRcdFx0Y29uc3QgaXNCYWRnZSA9XHJcblx0XHRcdFx0KHRhc2sgYXMgYW55KT8uYmFkZ2UgPT09IHRydWUgfHxcclxuXHRcdFx0XHQodGFzayBhcyBhbnkpPy5pY3NFdmVudD8uc291cmNlPy5zaG93VHlwZSA9PT0gXCJiYWRnZVwiO1xyXG5cdFx0XHRyZXR1cm4gISEoaXNJY3MgJiYgaXNCYWRnZSk7XHJcblx0XHR9IGNhdGNoIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gSGVscGVyOiBpZGVudGlmeSBhbnkgSUNTLWRlcml2ZWQgdGFzayAodG8gZXhjbHVkZSBmcm9tIHN1bW1hcmllcy9tZW51cylcclxuXHRwcml2YXRlIGlzSWNzVGFzayh0YXNrOiBUYXNrKTogYm9vbGVhbiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0dHlwZW9mIHRhc2suZmlsZVBhdGggPT09IFwic3RyaW5nXCIgJiZcclxuXHRcdFx0XHR0YXNrLmZpbGVQYXRoLnN0YXJ0c1dpdGgoXCJpY3M6Ly9cIilcclxuXHRcdFx0KVxyXG5cdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHRjb25zdCBzcmNUeXBlID1cclxuXHRcdFx0XHQodGFzayBhcyBhbnkpPy5tZXRhZGF0YT8uc291cmNlPy50eXBlID8/XHJcblx0XHRcdFx0KHRhc2sgYXMgYW55KT8uc291cmNlPy50eXBlO1xyXG5cdFx0XHRyZXR1cm4gc3JjVHlwZSA9PT0gXCJpY3NcIjtcclxuXHRcdH0gY2F0Y2gge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldER1ZVRvZGF5UmFuZ2UoKTogeyBmcm9tOiBudW1iZXI7IHRvOiBudW1iZXIgfSB7XHJcblx0XHRjb25zdCB0b2RheSA9IG5ldyBEYXRlKCk7XHJcblx0XHR0b2RheS5zZXRIb3VycygwLCAwLCAwLCAwKTtcclxuXHRcdGNvbnN0IHRvbW9ycm93ID0gbmV3IERhdGUodG9kYXkpO1xyXG5cdFx0dG9tb3Jyb3cuc2V0RGF0ZSh0b21vcnJvdy5nZXREYXRlKCkgKyAxKTtcclxuXHRcdHJldHVybiB7IGZyb206IHRvZGF5LmdldFRpbWUoKSwgdG86IHRvbW9ycm93LmdldFRpbWUoKSB9O1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBzdGFydFBlclRhc2tUaWNrZXIoKTogdm9pZCB7XHJcblx0XHRjb25zdCBjZmcgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ub3RpZmljYXRpb25zPy5wZXJUYXNrO1xyXG5cdFx0Y29uc3QgZW5hYmxlZCA9XHJcblx0XHRcdCEhdGhpcy5wbHVnaW4uc2V0dGluZ3Mubm90aWZpY2F0aW9ucz8uZW5hYmxlZCAmJiAhIWNmZz8uZW5hYmxlZDtcclxuXHRcdGlmICghZW5hYmxlZCkgcmV0dXJuO1xyXG5cclxuXHRcdC8vIEltbWVkaWF0ZSBzY2FuXHJcblx0XHR0aGlzLnNjYW5BbmROb3RpZnlQZXJUYXNrKCkuY2F0Y2goKCkgPT4ge30pO1xyXG5cclxuXHRcdC8vIFRoZW4gZXZlcnkgbWludXRlXHJcblx0XHR0aGlzLnJlZ2lzdGVySW50ZXJ2YWwoXHJcblx0XHRcdHdpbmRvdy5zZXRJbnRlcnZhbCgoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5zY2FuQW5kTm90aWZ5UGVyVGFzaygpLmNhdGNoKCgpID0+IHt9KTtcclxuXHRcdFx0fSwgNjBfMDAwKVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBSZXNldCBub3RpZmllZCBrZXlzIGF0IG1pZG5pZ2h0XHJcblx0XHR0aGlzLnNjaGVkdWxlTWlkbmlnaHRSZXNldCgpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBzY2hlZHVsZU1pZG5pZ2h0UmVzZXQoKTogdm9pZCB7XHJcblx0XHRjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xyXG5cdFx0Y29uc3QgbWlkbmlnaHQgPSBuZXcgRGF0ZShub3cpO1xyXG5cdFx0bWlkbmlnaHQuc2V0SG91cnMoMjQsIDAsIDAsIDApO1xyXG5cdFx0Y29uc3QgbXMgPSBtaWRuaWdodC5nZXRUaW1lKCkgLSBub3cuZ2V0VGltZSgpO1xyXG5cdFx0dGhpcy5taWRuaWdodFRpbWVvdXQgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdHRoaXMubm90aWZpZWRLZXlzLmNsZWFyKCk7XHJcblx0XHRcdHRoaXMuc2NoZWR1bGVNaWRuaWdodFJlc2V0KCk7XHJcblx0XHRcdHRoaXMudXBkYXRlU3RhdHVzQmFyKCkuY2F0Y2goKCkgPT4ge30pO1xyXG5cdFx0XHR0aGlzLnVwZGF0ZVRyYXkoKS5jYXRjaCgoKSA9PiB7fSk7XHJcblx0XHR9LCBtcyk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIHNjYW5BbmROb3RpZnlQZXJUYXNrKCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Y29uc3QgY2ZnID0gdGhpcy5wbHVnaW4uc2V0dGluZ3Mubm90aWZpY2F0aW9ucz8ucGVyVGFzaztcclxuXHRcdGlmIChcclxuXHRcdFx0IWNmZyB8fFxyXG5cdFx0XHQhdGhpcy5wbHVnaW4uc2V0dGluZ3Mubm90aWZpY2F0aW9ucz8uZW5hYmxlZCB8fFxyXG5cdFx0XHQhY2ZnLmVuYWJsZWRcclxuXHRcdClcclxuXHRcdFx0cmV0dXJuO1xyXG5cclxuXHRcdGNvbnN0IHF1ZXJ5QVBJID0gdGhpcy5nZXRRdWVyeUFQSSgpO1xyXG5cdFx0aWYgKCFxdWVyeUFQSSkgcmV0dXJuO1xyXG5cclxuXHRcdC8vIFByZWZlciBzeW5jIGNhY2hlIGZvciBzcGVlZDsgZmFsbCBiYWNrIHRvIGFzeW5jIGlmIGVtcHR5XHJcblx0XHRjb25zdCBhbGwgPSBxdWVyeUFQSS5nZXRBbGxUYXNrc1N5bmM/LigpIGFzIFRhc2tbXSB8IHVuZGVmaW5lZDtcclxuXHRcdGNvbnN0IHRhc2tzID0gKFxyXG5cdFx0XHRhbGwgJiYgYWxsLmxlbmd0aCA/IGFsbCA6IGF3YWl0IHF1ZXJ5QVBJLmdldEFsbFRhc2tzKClcclxuXHRcdCkgYXMgVGFza1tdO1xyXG5cclxuXHRcdGNvbnN0IGxlYWRNcyA9IE1hdGgubWF4KDAsIChjZmcubGVhZE1pbnV0ZXMgPz8gMCkgKiA2MF8wMDApO1xyXG5cdFx0Y29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcclxuXHRcdGNvbnN0IHdpbmRvd0VuZCA9IG5vdyArIDYwXzAwMDsgLy8gbmV4dCBtaW51dGVcclxuXHJcblx0XHRmb3IgKGNvbnN0IHRhc2sgb2YgdGFza3MpIHtcclxuXHRcdFx0aWYgKHRhc2suY29tcGxldGVkKSBjb250aW51ZTtcclxuXHRcdFx0aWYgKHRoaXMuaXNJY3NCYWRnZSh0YXNrKSkgY29udGludWU7IC8vIHNraXAgSUNTIGJhZGdlc1xyXG5cdFx0XHRjb25zdCBkdWUgPSB0YXNrLm1ldGFkYXRhPy5kdWVEYXRlO1xyXG5cdFx0XHRpZiAoIWR1ZSkgY29udGludWU7XHJcblx0XHRcdGNvbnN0IGZpcmVBdCA9IGR1ZSAtIGxlYWRNcztcclxuXHRcdFx0aWYgKGZpcmVBdCA+PSBub3cgJiYgZmlyZUF0IDwgd2luZG93RW5kKSB7XHJcblx0XHRcdFx0Y29uc3Qga2V5ID0gYCR7XHJcblx0XHRcdFx0XHR0YXNrLmlkIHx8XHJcblx0XHRcdFx0XHR0YXNrLm1ldGFkYXRhPy5pZCB8fFxyXG5cdFx0XHRcdFx0dGFzay5maWxlUGF0aCArIFwiOlwiICsgdGFzay5saW5lXHJcblx0XHRcdFx0fUAke2R1ZX1gO1xyXG5cdFx0XHRcdGlmICh0aGlzLm5vdGlmaWVkS2V5cy5oYXMoa2V5KSkgY29udGludWU7XHJcblx0XHRcdFx0dGhpcy5ub3RpZmllZEtleXMuYWRkKGtleSk7XHJcblx0XHRcdFx0dGhpcy5zaG93VGFza0R1ZU5vdGlmaWNhdGlvbih0YXNrLCBkdWUsIGxlYWRNcyk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgdXBkYXRlVHJheSgpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGlmICghdGhpcy5lbGVjdHJvblRyYXkpIHJldHVybjtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IHF1ZXJ5QVBJID0gdGhpcy5nZXRRdWVyeUFQSSgpO1xyXG5cdFx0XHRpZiAoIXF1ZXJ5QVBJKSByZXR1cm47XHJcblxyXG5cdFx0XHQvLyBDb3VudCBvdmVyZHVlICsgZHVlIHRvZGF5IChleGNsdWRlIElDUyBiYWRnZXMpXHJcblx0XHRcdGNvbnN0IGFsbFRhc2tzID0gKGF3YWl0IHF1ZXJ5QVBJLmdldEFsbFRhc2tzKCkpIGFzIFRhc2tbXTtcclxuXHRcdFx0Y29uc3QgdG9kYXlFbmQgPSBuZXcgRGF0ZSgpO1xyXG5cdFx0XHR0b2RheUVuZC5zZXRIb3VycygyMywgNTksIDU5LCA5OTkpO1xyXG5cdFx0XHRjb25zdCBwZW5kaW5nID0gYWxsVGFza3NcclxuXHRcdFx0XHQuZmlsdGVyKFxyXG5cdFx0XHRcdFx0KHQpID0+XHJcblx0XHRcdFx0XHRcdCF0LmNvbXBsZXRlZCAmJlxyXG5cdFx0XHRcdFx0XHR0Lm1ldGFkYXRhPy5kdWVEYXRlICYmXHJcblx0XHRcdFx0XHRcdHQubWV0YWRhdGEuZHVlRGF0ZSA8PSB0b2RheUVuZC5nZXRUaW1lKClcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0LmZpbHRlcigodCkgPT4gIXRoaXMuaXNJY3NCYWRnZSh0KSk7XHJcblxyXG5cdFx0XHQvLyBtYWNPUyDlj6/ku6Xorr7nva7mloflrZfvvIxXaW5kb3dzL0xpbnV4IOabtOaWsCB0b29sdGlwXHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0aWYgKFBsYXRmb3JtLmlzTWFjT1MgJiYgdGhpcy5lbGVjdHJvblRyYXkuc2V0VGl0bGUpIHtcclxuXHRcdFx0XHRcdHRoaXMuZWxlY3Ryb25UcmF5LnNldFRpdGxlKFxyXG5cdFx0XHRcdFx0XHRwZW5kaW5nLmxlbmd0aCA+IDBcclxuXHRcdFx0XHRcdFx0XHQ/IGAgJHtwZW5kaW5nLmxlbmd0aH0gJHt0KFwiVGFza3NcIil9YFxyXG5cdFx0XHRcdFx0XHRcdDogXCIgXCIgKyB0KFwiTm8gVGFza3NcIilcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGNhdGNoIHt9XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0dGhpcy5lbGVjdHJvblRyYXkuc2V0VG9vbFRpcD8uKFxyXG5cdFx0XHRcdFx0cGVuZGluZy5sZW5ndGggPiAwXHJcblx0XHRcdFx0XHRcdD8gYCR7cGVuZGluZy5sZW5ndGh9ICR7dChcInRhc2tzIGR1ZSBvciBvdmVyZHVlXCIpfWBcclxuXHRcdFx0XHRcdFx0OiB0KFwiTm8gZHVlIHRvZGF5XCIpXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fSBjYXRjaCB7fVxyXG5cclxuXHRcdFx0Ly8gQnVpbGQgY29udGV4dCBtZW51IHZpYSBoZWxwZXJcclxuXHRcdFx0Y29uc3QgYnVpbGRlciA9IG5ldyBUcmF5TWVudUJ1aWxkZXIodGhpcy5wbHVnaW4pO1xyXG5cdFx0XHRhd2FpdCBidWlsZGVyLmFwcGx5VG9UcmF5KHRoaXMuZWxlY3Ryb25UcmF5LCB7XHJcblx0XHRcdFx0b3BlblZhdWx0OiAoKSA9PiB0aGlzLm9wZW5WYXVsdCgpLFxyXG5cdFx0XHRcdG9wZW5UYXNrVmlldzogKCkgPT4ge1xyXG5cdFx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdFx0KFxyXG5cdFx0XHRcdFx0XHRcdHRoaXMucGx1Z2luIGFzIFRhc2tQcm9ncmVzc0JhclBsdWdpblxyXG5cdFx0XHRcdFx0XHQpLmFjdGl2YXRlVGFza1ZpZXc/LigpO1xyXG5cdFx0XHRcdFx0fSBjYXRjaCB7fVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0b3BlblRhc2s6ICh0YXNrOiBUYXNrKSA9PiB0aGlzLm9wZW5UYXNrKHRhc2spLFxyXG5cdFx0XHRcdGNvbXBsZXRlVGFzazogKGlkOiBzdHJpbmcpID0+IHRoaXMuY29tcGxldGVUYXNrKGlkKSxcclxuXHRcdFx0XHRwb3N0cG9uZVRhc2s6ICh0YXNrOiBUYXNrLCBvZmZzZXRNczogbnVtYmVyKSA9PlxyXG5cdFx0XHRcdFx0dGhpcy5wb3N0cG9uZVRhc2sodGFzaywgb2Zmc2V0TXMpLFxyXG5cdFx0XHRcdHNldFByaW9yaXR5OiAodGFzazogVGFzaywgbGV2ZWw6IG51bWJlcikgPT5cclxuXHRcdFx0XHRcdHRoaXMuc2V0UHJpb3JpdHkodGFzaywgbGV2ZWwpLFxyXG5cdFx0XHRcdHBpY2tDdXN0b21EYXRlOiAodGFzazogVGFzaykgPT5cclxuXHRcdFx0XHRcdHRoaXMub3BlbkRhdGVQaWNrZXJGb3JUYXNrKHRhc2spLFxyXG5cdFx0XHRcdHNlbmREYWlseTogKCkgPT4gdGhpcy5zZW5kRGFpbHlTdW1tYXJ5KCksXHJcblx0XHRcdFx0cXVpY2tDYXB0dXJlOiAoKSA9PiB0aGlzLm9wZW5RdWlja0NhcHR1cmVXaW5kb3coKSxcclxuXHRcdFx0fSk7XHJcblx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcIkZhaWxlZCB0byB1cGRhdGUgdHJheTpcIiwgZSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHNldHVwRGFpbHlTdW1tYXJ5KCk6IHZvaWQge1xyXG5cdFx0Y29uc3QgY2ZnID0gdGhpcy5wbHVnaW4uc2V0dGluZ3Mubm90aWZpY2F0aW9ucz8uZGFpbHlTdW1tYXJ5O1xyXG5cdFx0Y29uc3QgZW5hYmxlZCA9XHJcblx0XHRcdCEhdGhpcy5wbHVnaW4uc2V0dGluZ3Mubm90aWZpY2F0aW9ucz8uZW5hYmxlZCAmJiAhIWNmZz8uZW5hYmxlZDtcclxuXHRcdGlmICghZW5hYmxlZCkgcmV0dXJuO1xyXG5cclxuXHRcdGNvbnN0IHRpbWUgPSBjZmchLnRpbWUgfHwgXCIwOTowMFwiO1xyXG5cdFx0Y29uc3QgW2hoLCBtbV0gPSB0aW1lLnNwbGl0KFwiOlwiKS5tYXAoKG4pID0+IHBhcnNlSW50KG4sIDEwKSk7XHJcblx0XHRjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xyXG5cdFx0Y29uc3QgdGFyZ2V0ID0gbmV3IERhdGUoKTtcclxuXHRcdHRhcmdldC5zZXRIb3VycyhoaCB8fCA5LCBtbSB8fCAwLCAwLCAwKTtcclxuXHRcdGlmICh0YXJnZXQuZ2V0VGltZSgpIDw9IG5vdy5nZXRUaW1lKCkpIHtcclxuXHRcdFx0dGFyZ2V0LnNldERhdGUodGFyZ2V0LmdldERhdGUoKSArIDEpO1xyXG5cdFx0fVxyXG5cdFx0Y29uc3QgbXMgPSB0YXJnZXQuZ2V0VGltZSgpIC0gbm93LmdldFRpbWUoKTtcclxuXHRcdHRoaXMuZGFpbHlUaW1lb3V0ID0gd2luZG93LnNldFRpbWVvdXQoYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRhd2FpdCB0aGlzLnNlbmREYWlseVN1bW1hcnkoKTtcclxuXHRcdFx0Ly8gUmVzY2hlZHVsZSBuZXh0IGRheVxyXG5cdFx0XHR0aGlzLnNldHVwRGFpbHlTdW1tYXJ5KCk7XHJcblx0XHR9LCBtcyk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIHVwZGF0ZVN0YXR1c0JhcigpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGNvbnN0IHRyYXlNb2RlID1cclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVza3RvcEludGVncmF0aW9uPy50cmF5TW9kZSB8fCBcInN0YXR1c1wiO1xyXG5cdFx0aWYgKCEodHJheU1vZGUgPT09IFwic3RhdHVzXCIgfHwgdHJheU1vZGUgPT09IFwiYm90aFwiKSkgcmV0dXJuO1xyXG5cdFx0Y29uc3QgcXVlcnlBUEkgPSB0aGlzLmdldFF1ZXJ5QVBJKCk7XHJcblx0XHRpZiAoIXF1ZXJ5QVBJKSByZXR1cm47XHJcblxyXG5cdFx0Ly8gQ291bnQgb3ZlcmR1ZSArIGR1ZSB0b2RheSwgZXhjbHVkZSBJQ1MgYmFkZ2VzXHJcblx0XHRjb25zdCBhbGxUYXNrcyA9IChhd2FpdCBxdWVyeUFQSS5nZXRBbGxUYXNrcygpKSBhcyBUYXNrW107XHJcblx0XHRjb25zdCB0b2RheUVuZCA9IG5ldyBEYXRlKCk7XHJcblx0XHR0b2RheUVuZC5zZXRIb3VycygyMywgNTksIDU5LCA5OTkpO1xyXG5cdFx0Y29uc3QgcGVuZGluZyA9IGFsbFRhc2tzXHJcblx0XHRcdC5maWx0ZXIoXHJcblx0XHRcdFx0KHQpID0+XHJcblx0XHRcdFx0XHQhdC5jb21wbGV0ZWQgJiZcclxuXHRcdFx0XHRcdHQubWV0YWRhdGE/LmR1ZURhdGUgJiZcclxuXHRcdFx0XHRcdHQubWV0YWRhdGEuZHVlRGF0ZSA8PSB0b2RheUVuZC5nZXRUaW1lKClcclxuXHRcdFx0KVxyXG5cdFx0XHQuZmlsdGVyKCh0KSA9PiAhdGhpcy5pc0ljc0JhZGdlKHQpKTtcclxuXHJcblx0XHRpZiAoIXRoaXMuc3RhdHVzQmFySXRlbSkge1xyXG5cdFx0XHR0aGlzLmNyZWF0ZU9yVXBkYXRlU3RhdHVzQmFyKCk7XHJcblx0XHR9XHJcblx0XHRpZiAodGhpcy5zdGF0dXNCYXJJdGVtKSB7XHJcblx0XHRcdHRoaXMuc3RhdHVzQmFySXRlbS5lbXB0eSgpO1xyXG5cdFx0XHRjb25zdCBidG4gPSB0aGlzLnN0YXR1c0Jhckl0ZW0uY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdFx0XHRjbHM6IFwidGFzay1nZW5pdXMtdHJheVwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0YnRuLnRleHRDb250ZW50ID1cclxuXHRcdFx0XHRwZW5kaW5nLmxlbmd0aCA+IDBcclxuXHRcdFx0XHRcdD8gYCR7cGVuZGluZy5sZW5ndGh9ICR7dChcIlRhc2tzXCIpfWBcclxuXHRcdFx0XHRcdDogdChcIk5vIFRhc2tzXCIpO1xyXG5cdFx0XHRidG4uc3R5bGUuY3Vyc29yID0gXCJwb2ludGVyXCI7XHJcblx0XHRcdGJ0bi5vbmNsaWNrID0gYXN5bmMgKGV2KSA9PiB7XHJcblx0XHRcdFx0Ly8gQnVpbGQgYW4gT2JzaWRpYW4gbWVudSB0aGF0IG1pcnJvcnMgc3lzdGVtIHRyYXkgcXVpY2sgYWN0aW9ucyB1c2luZyBpbnRlcm5hbCBzdWJtZW51IEFQSVxyXG5cdFx0XHRcdGNvbnN0IG1lbnUgPSBuZXcgTWVudSgpO1xyXG5cdFx0XHRcdG1lbnUuYWRkSXRlbSgoaTogYW55KSA9PiB7XHJcblx0XHRcdFx0XHRpLnNldFRpdGxlKFwiT3BlbiBUYXNrIEdlbml1c1wiKVxyXG5cdFx0XHRcdFx0XHQuc2V0SWNvbihcInRhc2stZ2VuaXVzXCIpXHJcblx0XHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0XHRcdFx0KHRoaXMucGx1Z2luIGFzIGFueSkuYWN0aXZhdGVUYXNrVmlldz8uKCk7XHJcblx0XHRcdFx0XHRcdFx0fSBjYXRjaCB7fVxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRtZW51LmFkZFNlcGFyYXRvcigpO1xyXG5cdFx0XHRcdG1lbnUuYWRkSXRlbSgoaTogYW55KSA9PiB7XHJcblx0XHRcdFx0XHRpLnNldFRpdGxlKFwiUXVpY2sgQ2FwdHVyZS4uLlwiKVxyXG5cdFx0XHRcdFx0XHQuc2V0SWNvbihcInBsdXMtY2lyY2xlXCIpXHJcblx0XHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLm9wZW5RdWlja0NhcHR1cmVXaW5kb3coKTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0bWVudS5hZGRTZXBhcmF0b3IoKTtcclxuXHJcblx0XHRcdFx0Ly8gU2hvdyB0b3AgNyB0YXNrcyB3aXRoaW4gaG9yaXpvblxyXG5cdFx0XHRcdGNvbnN0IHRvcFRhc2tzID0gcGVuZGluZ1xyXG5cdFx0XHRcdFx0LnNvcnQoXHJcblx0XHRcdFx0XHRcdChhLCBiKSA9PlxyXG5cdFx0XHRcdFx0XHRcdChhLm1ldGFkYXRhPy5kdWVEYXRlIHx8IDApIC1cclxuXHRcdFx0XHRcdFx0XHQoYi5tZXRhZGF0YT8uZHVlRGF0ZSB8fCAwKVxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0LnNsaWNlKDAsIDcpO1xyXG5cdFx0XHRcdGZvciAoY29uc3QgdCBvZiB0b3BUYXNrcykge1xyXG5cdFx0XHRcdFx0Y29uc3QgbGFiZWwgPVxyXG5cdFx0XHRcdFx0XHR0LmNvbnRlbnQubGVuZ3RoID4gNTBcclxuXHRcdFx0XHRcdFx0XHQ/IHQuY29udGVudC5zbGljZSgwLCA1MCkgKyBcIuKAplwiXHJcblx0XHRcdFx0XHRcdFx0OiB0LmNvbnRlbnQ7XHJcblx0XHRcdFx0XHRtZW51LmFkZEl0ZW0oKGk6IGFueSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRpLnNldFRpdGxlKGxhYmVsKS5zZXRJY29uKFwiY2lyY2xlLWRvdFwiKTtcclxuXHRcdFx0XHRcdFx0Y29uc3Qgc3VibWVudSA9IGkuc2V0U3VibWVudT8uKCk7XHJcblx0XHRcdFx0XHRcdGlmIChzdWJtZW51KSB7XHJcblx0XHRcdFx0XHRcdFx0c3VibWVudS5hZGRJdGVtKChpaTogYW55KSA9PlxyXG5cdFx0XHRcdFx0XHRcdFx0aWlcclxuXHRcdFx0XHRcdFx0XHRcdFx0LnNldFRpdGxlKFwiRWRpdCBpbiBmaWxlXCIpXHJcblx0XHRcdFx0XHRcdFx0XHRcdC5zZXRJY29uKFwiZmlsZS1wZW5cIilcclxuXHRcdFx0XHRcdFx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4gdGhpcy5vcGVuVGFzayh0KSlcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdHN1Ym1lbnUuYWRkSXRlbSgoaWk6IGFueSkgPT5cclxuXHRcdFx0XHRcdFx0XHRcdGlpXHJcblx0XHRcdFx0XHRcdFx0XHRcdC5zZXRUaXRsZShcIkNvbXBsZXRlXCIpXHJcblx0XHRcdFx0XHRcdFx0XHRcdC5zZXRJY29uKFwiY2hlY2tcIilcclxuXHRcdFx0XHRcdFx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4gdGhpcy5jb21wbGV0ZVRhc2sodC5pZCkpXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRzdWJtZW51LmFkZFNlcGFyYXRvcigpO1xyXG5cdFx0XHRcdFx0XHRcdHN1Ym1lbnUuYWRkSXRlbSgoaWk6IGFueSkgPT5cclxuXHRcdFx0XHRcdFx0XHRcdGlpXHJcblx0XHRcdFx0XHRcdFx0XHRcdC5zZXRUaXRsZShcIlNub296ZSAxZFwiKVxyXG5cdFx0XHRcdFx0XHRcdFx0XHQuc2V0SWNvbihcImNhbGVuZGFyXCIpXHJcblx0XHRcdFx0XHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5wb3N0cG9uZVRhc2soXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0LFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0MSAqIDI0ICogNjAgKiA2MF8wMDBcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdHN1Ym1lbnUuYWRkSXRlbSgoaWk6IGFueSkgPT5cclxuXHRcdFx0XHRcdFx0XHRcdGlpXHJcblx0XHRcdFx0XHRcdFx0XHRcdC5zZXRUaXRsZShcIlNub296ZSAyZFwiKVxyXG5cdFx0XHRcdFx0XHRcdFx0XHQuc2V0SWNvbihcImNhbGVuZGFyXCIpXHJcblx0XHRcdFx0XHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5wb3N0cG9uZVRhc2soXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0LFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0MiAqIDI0ICogNjAgKiA2MF8wMDBcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdHN1Ym1lbnUuYWRkSXRlbSgoaWk6IGFueSkgPT5cclxuXHRcdFx0XHRcdFx0XHRcdGlpXHJcblx0XHRcdFx0XHRcdFx0XHRcdC5zZXRUaXRsZShcIlNub296ZSAzZFwiKVxyXG5cdFx0XHRcdFx0XHRcdFx0XHQuc2V0SWNvbihcImNhbGVuZGFyXCIpXHJcblx0XHRcdFx0XHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5wb3N0cG9uZVRhc2soXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0LFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0MyAqIDI0ICogNjAgKiA2MF8wMDBcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdHN1Ym1lbnUuYWRkSXRlbSgoaWk6IGFueSkgPT5cclxuXHRcdFx0XHRcdFx0XHRcdGlpXHJcblx0XHRcdFx0XHRcdFx0XHRcdC5zZXRUaXRsZShcIlNub296ZSAxd1wiKVxyXG5cdFx0XHRcdFx0XHRcdFx0XHQuc2V0SWNvbihcImNhbGVuZGFyXCIpXHJcblx0XHRcdFx0XHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5wb3N0cG9uZVRhc2soXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0LFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0NyAqIDI0ICogNjAgKiA2MF8wMDBcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdHN1Ym1lbnUuYWRkSXRlbSgoaWk6IGFueSkgPT5cclxuXHRcdFx0XHRcdFx0XHRcdGlpXHJcblx0XHRcdFx0XHRcdFx0XHRcdC5zZXRUaXRsZShcIkN1c3RvbSBkYXRl4oCmXCIpXHJcblx0XHRcdFx0XHRcdFx0XHRcdC5zZXRJY29uKFwiY2FsZW5kYXItcGx1c1wiKVxyXG5cdFx0XHRcdFx0XHRcdFx0XHQub25DbGljaygoKSA9PlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMub3BlbkRhdGVQaWNrZXJGb3JUYXNrKHQpXHJcblx0XHRcdFx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdHN1Ym1lbnUuYWRkU2VwYXJhdG9yKCk7XHJcblx0XHRcdFx0XHRcdFx0c3VibWVudS5hZGRJdGVtKChpaTogYW55KSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRpaS5zZXRUaXRsZShcIlByaW9yaXR5XCIpLnNldEljb24oXCJmbGFnXCIpO1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgcCA9IGlpLnNldFN1Ym1lbnU/LigpO1xyXG5cdFx0XHRcdFx0XHRcdFx0cD8uYWRkSXRlbSgocHA6IGFueSkgPT5cclxuXHRcdFx0XHRcdFx0XHRcdFx0cHBcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQuc2V0VGl0bGUoXCLwn5S6IEhpZ2hlc3RcIilcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQub25DbGljaygoKSA9PiB0aGlzLnNldFByaW9yaXR5KHQsIDUpKVxyXG5cdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdHA/LmFkZEl0ZW0oKHBwOiBhbnkpID0+XHJcblx0XHRcdFx0XHRcdFx0XHRcdHBwXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0LnNldFRpdGxlKFwi4o+rIEhpZ2hcIilcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQub25DbGljaygoKSA9PiB0aGlzLnNldFByaW9yaXR5KHQsIDQpKVxyXG5cdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdHA/LmFkZEl0ZW0oKHBwOiBhbnkpID0+XHJcblx0XHRcdFx0XHRcdFx0XHRcdHBwXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0LnNldFRpdGxlKFwi8J+UvCBNZWRpdW1cIilcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQub25DbGljaygoKSA9PiB0aGlzLnNldFByaW9yaXR5KHQsIDMpKVxyXG5cdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdHA/LmFkZEl0ZW0oKHBwOiBhbnkpID0+XHJcblx0XHRcdFx0XHRcdFx0XHRcdHBwXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0LnNldFRpdGxlKFwi8J+UvSBMb3dcIilcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQub25DbGljaygoKSA9PiB0aGlzLnNldFByaW9yaXR5KHQsIDIpKVxyXG5cdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdHA/LmFkZEl0ZW0oKHBwOiBhbnkpID0+XHJcblx0XHRcdFx0XHRcdFx0XHRcdHBwXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0LnNldFRpdGxlKFwi4o+s77iPIExvd2VzdFwiKVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHRoaXMuc2V0UHJpb3JpdHkodCwgMSkpXHJcblx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGlmICh0b3BUYXNrcy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0XHRcdG1lbnUuYWRkSXRlbSgoaTogYW55KSA9PlxyXG5cdFx0XHRcdFx0XHRpLnNldFRpdGxlKFwiTm8gZHVlIG9yIHVwY29taW5nXCIpLnNldERpc2FibGVkKHRydWUpXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0bWVudS5hZGRTZXBhcmF0b3IoKTtcclxuXHRcdFx0XHRtZW51LmFkZEl0ZW0oKGk6IGFueSkgPT5cclxuXHRcdFx0XHRcdGlcclxuXHRcdFx0XHRcdFx0LnNldFRpdGxlKFwiUmVmcmVzaFwiKVxyXG5cdFx0XHRcdFx0XHQuc2V0SWNvbihcInJlZnJlc2gtY2N3XCIpXHJcblx0XHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnVwZGF0ZVN0YXR1c0JhcigpO1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMudXBkYXRlVHJheSgpO1xyXG5cdFx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdG1lbnUuc2hvd0F0TW91c2VFdmVudChldiBhcyBhbnkpO1xyXG5cdFx0XHR9O1xyXG5cdFx0XHRidG4udGl0bGUgPVxyXG5cdFx0XHRcdHBlbmRpbmcubGVuZ3RoID4gMFxyXG5cdFx0XHRcdFx0PyBgJHtwZW5kaW5nLmxlbmd0aH0gdGFza3MgZHVlIG9yIHVwY29taW5nYFxyXG5cdFx0XHRcdFx0OiBcIk5vIGR1ZSBvciB1cGNvbWluZ1wiO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVPclVwZGF0ZVN0YXR1c0JhcigpOiB2b2lkIHtcclxuXHRcdGlmICghdGhpcy5zdGF0dXNCYXJJdGVtKSB7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Ly8gQHRzLWlnbm9yZSBhZGRTdGF0dXNCYXJJdGVtIGV4aXN0cyBvbiBQbHVnaW5cclxuXHRcdFx0XHR0aGlzLnN0YXR1c0Jhckl0ZW0gPSAodGhpcy5wbHVnaW4gYXMgYW55KS5hZGRTdGF0dXNCYXJJdGVtKCk7XHJcblx0XHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXCJGYWlsZWQgdG8gY3JlYXRlIHN0YXR1cyBiYXIgaXRlbSBmb3IgdHJheTpcIiwgZSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgc2VuZERhaWx5U3VtbWFyeSgpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGNvbnN0IHF1ZXJ5QVBJID0gdGhpcy5nZXRRdWVyeUFQSSgpO1xyXG5cdFx0aWYgKCFxdWVyeUFQSSkgcmV0dXJuO1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgYWxsID0gKGF3YWl0IHF1ZXJ5QVBJLmdldEFsbFRhc2tzKCkpIGFzIFRhc2tbXTtcclxuXHRcdFx0Y29uc3QgeyBmcm9tLCB0byB9ID0gdGhpcy5nZXREdWVUb2RheVJhbmdlKCk7XHJcblx0XHRcdC8vIGluY2x1ZGUgb3ZlcmR1ZSArIGR1ZSB0b2RheSwgZXhjbHVkZSBJQ1NcclxuXHRcdFx0Y29uc3QgcGVuZGluZyA9IGFsbC5maWx0ZXIoKHQpID0+IHtcclxuXHRcdFx0XHRpZiAodC5jb21wbGV0ZWQgfHwgIXQubWV0YWRhdGE/LmR1ZURhdGUpIHJldHVybiBmYWxzZTtcclxuXHRcdFx0XHRpZiAodGhpcy5pc0ljc1Rhc2sodCkgfHwgdGhpcy5pc0ljc0JhZGdlKHQpKSByZXR1cm4gZmFsc2U7XHJcblx0XHRcdFx0Y29uc3QgZHVlID0gdC5tZXRhZGF0YS5kdWVEYXRlO1xyXG5cdFx0XHRcdHJldHVybiBkdWUgPj0gZnJvbSAmJiBkdWUgPD0gdG87XHJcblx0XHRcdH0pO1xyXG5cdFx0XHRpZiAoIXBlbmRpbmcubGVuZ3RoKSB7XHJcblx0XHRcdFx0bmV3IE5vdGljZShcIk5vIHRhc2tzIGR1ZSB0b2RheVwiLCAyMDAwKTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdFx0Y29uc3QgYm9keSA9IHRoaXMuZm9ybWF0RGFpbHlTdW1tYXJ5Qm9keShwZW5kaW5nKTtcclxuXHRcdFx0dGhpcy5zaG93Tm90aWZpY2F0aW9uKFwiVG9kYXkncyB0YXNrc1wiLCBib2R5KTtcclxuXHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFwiRGFpbHkgc3VtbWFyeSBmYWlsZWRcIiwgZSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGZvcm1hdERhaWx5U3VtbWFyeUJvZHkodGFza3M6IFRhc2tbXSk6IHN0cmluZyB7XHJcblx0XHRjb25zdCBtYXhMaXN0ID0gNTtcclxuXHRcdGNvbnN0IGl0ZW1zID0gdGFza3Muc2xpY2UoMCwgbWF4TGlzdCkubWFwKCh0KSA9PiBg4oCiICR7dC5jb250ZW50fWApO1xyXG5cdFx0Y29uc3QgbW9yZSA9XHJcblx0XHRcdHRhc2tzLmxlbmd0aCA+IG1heExpc3RcclxuXHRcdFx0XHQ/IGBcXG7igKYgYW5kICR7dGFza3MubGVuZ3RoIC0gbWF4TGlzdH0gbW9yZWBcclxuXHRcdFx0XHQ6IFwiXCI7XHJcblx0XHRyZXR1cm4gYCR7dGFza3MubGVuZ3RofSB0YXNrcyBkdWUgdG9kYXk6XFxuJHtpdGVtcy5qb2luKFwiXFxuXCIpfSR7bW9yZX1gO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBzaG93VGFza0R1ZU5vdGlmaWNhdGlvbihcclxuXHRcdHRhc2s6IFRhc2ssXHJcblx0XHRfZHVlOiBudW1iZXIsXHJcblx0XHRsZWFkTXM6IG51bWJlclxyXG5cdCkge1xyXG5cdFx0Y29uc3QgbWludXRlcyA9IE1hdGgucm91bmQobGVhZE1zIC8gNjAwMDApO1xyXG5cdFx0Y29uc3QgdGl0bGUgPSBtaW51dGVzID4gMCA/IGBEdWUgaW4gJHttaW51dGVzfSBtaW5gIDogXCJUYXNrIGR1ZVwiO1xyXG5cdFx0Y29uc3QgYm9keSA9IGAke3Rhc2suY29udGVudH1gO1xyXG5cdFx0Y29uc3QgbiA9IGF3YWl0IHRoaXMuc2hvd05vdGlmaWNhdGlvbih0aXRsZSwgYm9keSk7XHJcblx0XHRpZiAobikge1xyXG5cdFx0XHRuLm9uY2xpY2sgPSAoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5vcGVuVGFzayh0YXNrKS5jYXRjaCgoKSA9PiB7fSk7XHJcblx0XHRcdFx0Ly8gQ2xvc2UgYWZ0ZXIgY2xpY2tcclxuXHRcdFx0XHQvLyBAdHMtaWdub3JlXHJcblx0XHRcdFx0bi5jbG9zZT8uKCk7XHJcblx0XHRcdH07XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldFZhdWx0T3BlblVSSSgpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgdmF1bHROYW1lID0gdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmdldE5hbWUoKTtcclxuXHRcdHJldHVybiBgb2JzaWRpYW46Ly9vcGVuP3ZhdWx0PSR7ZW5jb2RlVVJJQ29tcG9uZW50KHZhdWx0TmFtZSl9YDtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgb3BlblZhdWx0KCk6IHZvaWQge1xyXG5cdFx0Ly8gVHJ5IHRvIGZvY3VzIHRoZSB3aW5kb3cgZGlyZWN0bHkgZmlyc3RcclxuXHRcdHRoaXMuZm9jdXNPYnNpZGlhbldpbmRvdygpO1xyXG5cclxuXHRcdC8vIEFsc28gdHJ5IHRoZSBVUkkgYXBwcm9hY2ggYXMgZmFsbGJhY2tcclxuXHRcdGNvbnN0IHVybCA9IHRoaXMuZ2V0VmF1bHRPcGVuVVJJKCk7XHJcblx0XHR0cnkge1xyXG5cdFx0XHR3aW5kb3cub3Blbih1cmwsIFwiX2JsYW5rXCIpO1xyXG5cdFx0fSBjYXRjaCB7fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBjb21wbGV0ZVRhc2sodGFza0lkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGF3YWl0IHRoaXMucGx1Z2luLndyaXRlQVBJPy51cGRhdGVUYXNrU3RhdHVzKHtcclxuXHRcdFx0XHR0YXNrSWQsXHJcblx0XHRcdFx0Y29tcGxldGVkOiB0cnVlLFxyXG5cdFx0XHR9KTtcclxuXHRcdH0gY2F0Y2gge31cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgc2V0UHJpb3JpdHkodGFzazogVGFzaywgbGV2ZWw6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0YXdhaXQgdGhpcy5wbHVnaW4ud3JpdGVBUEk/LnVwZGF0ZVRhc2soe1xyXG5cdFx0XHRcdHRhc2tJZDogdGFzay5pZCxcclxuXHRcdFx0XHR1cGRhdGVzOiB7XHJcblx0XHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0XHQuLi4odGFzay5tZXRhZGF0YSB8fCB7IHRhZ3M6IFtdIGFzIHN0cmluZ1tdIH0pLFxyXG5cdFx0XHRcdFx0XHRwcmlvcml0eTogbGV2ZWwsXHJcblx0XHRcdFx0XHR9IGFzIGFueSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHRcdH0gY2F0Y2gge31cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgb3BlbkRhdGVQaWNrZXJGb3JUYXNrKHRhc2s6IFRhc2spOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IHsgRGF0ZVBpY2tlck1vZGFsIH0gPSBhd2FpdCBpbXBvcnQoXHJcblx0XHRcdFx0XCJAL2NvbXBvbmVudHMvdWkvZGF0ZS1waWNrZXIvRGF0ZVBpY2tlck1vZGFsXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0Y29uc3QgbW9kYWwgPSBuZXcgRGF0ZVBpY2tlck1vZGFsKFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLmFwcCBhcyBhbnksXHJcblx0XHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdFx0dW5kZWZpbmVkLFxyXG5cdFx0XHRcdFwi8J+ThVwiXHJcblx0XHRcdCk7XHJcblx0XHRcdG1vZGFsLm9uRGF0ZVNlbGVjdGVkID0gYXN5bmMgKGRhdGVTdHIpID0+IHtcclxuXHRcdFx0XHRpZiAoIWRhdGVTdHIpIHJldHVybjtcclxuXHRcdFx0XHRjb25zdCBtID1cclxuXHRcdFx0XHRcdCh3aW5kb3cgYXMgYW55KS5tb21lbnQ/LihkYXRlU3RyKSB8fFxyXG5cdFx0XHRcdFx0KHRoaXMucGx1Z2luLmFwcCBhcyBhbnkpLm1vbWVudD8uKGRhdGVTdHIpO1xyXG5cdFx0XHRcdGNvbnN0IHRzID0gbT8udmFsdWVPZj8uKCk7XHJcblx0XHRcdFx0aWYgKCF0cykgcmV0dXJuO1xyXG5cdFx0XHRcdGF3YWl0IHRoaXMucGx1Z2luLndyaXRlQVBJPy51cGRhdGVUYXNrKHtcclxuXHRcdFx0XHRcdHRhc2tJZDogdGFzay5pZCxcclxuXHRcdFx0XHRcdHVwZGF0ZXM6IHtcclxuXHRcdFx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdFx0XHQuLi4odGFzay5tZXRhZGF0YSB8fCB7IHRhZ3M6IFtdIGFzIHN0cmluZ1tdIH0pLFxyXG5cdFx0XHRcdFx0XHRcdGR1ZURhdGU6IHRzLFxyXG5cdFx0XHRcdFx0XHR9IGFzIGFueSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH07XHJcblx0XHRcdG1vZGFsLm9wZW4oKTtcclxuXHRcdH0gY2F0Y2gge31cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgcG9zdHBvbmVUYXNrKHRhc2s6IFRhc2ssIG9mZnNldE1zOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdC8vIFNub296ZSBiYXNlZCBvbiBcIm5vd1wiIHJhdGhlciB0aGFuIGV4aXN0aW5nIGR1ZVxyXG5cdFx0Y29uc3QgYmFzZSA9IERhdGUubm93KCk7XHJcblx0XHRjb25zdCBuZXdEdWUgPSBiYXNlICsgb2Zmc2V0TXM7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRhd2FpdCB0aGlzLnBsdWdpbi53cml0ZUFQST8udXBkYXRlVGFzayh7XHJcblx0XHRcdFx0dGFza0lkOiB0YXNrLmlkLFxyXG5cdFx0XHRcdHVwZGF0ZXM6IHtcclxuXHRcdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRcdC4uLih0YXNrLm1ldGFkYXRhIHx8IHsgdGFnczogW10gYXMgc3RyaW5nW10gfSksXHJcblx0XHRcdFx0XHRcdGR1ZURhdGU6IG5ld0R1ZSxcclxuXHRcdFx0XHRcdH0gYXMgYW55LFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0fSBjYXRjaCB7fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSB0cnlFbGVjdHJvbk5vdGlmaWNhdGlvbih0aXRsZTogc3RyaW5nLCBib2R5OiBzdHJpbmcpOiBhbnkgfCBudWxsIHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IHJlcSA9ICh3aW5kb3cgYXMgYW55KS5yZXF1aXJlIHx8IChnbG9iYWxUaGlzIGFzIGFueSkucmVxdWlyZTtcclxuXHRcdFx0Y29uc3QgZWxlY3Ryb24gPSByZXEgPyByZXEoXCJlbGVjdHJvblwiKSA6IG51bGw7XHJcblx0XHRcdGNvbnN0IEVsZWN0cm9uTm90aWZpY2F0aW9uID0gZWxlY3Ryb24/Lk5vdGlmaWNhdGlvbjtcclxuXHRcdFx0aWYgKEVsZWN0cm9uTm90aWZpY2F0aW9uKSB7XHJcblx0XHRcdFx0Y29uc3QgbiA9IG5ldyBFbGVjdHJvbk5vdGlmaWNhdGlvbih7IHRpdGxlLCBib2R5IH0pO1xyXG5cdFx0XHRcdC8vIFNvbWUgRWxlY3Ryb24gdmVyc2lvbnMgcmVxdWlyZSBzaG93KClcclxuXHRcdFx0XHRpZiAodHlwZW9mIG4uc2hvdyA9PT0gXCJmdW5jdGlvblwiKSBuLnNob3coKTtcclxuXHRcdFx0XHRyZXR1cm4gbjtcclxuXHRcdFx0fVxyXG5cdFx0fSBjYXRjaCB7XHJcblx0XHRcdC8vIGlnbm9yZVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIG51bGw7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIHNob3dOb3RpZmljYXRpb24oXHJcblx0XHR0aXRsZTogc3RyaW5nLFxyXG5cdFx0Ym9keTogc3RyaW5nXHJcblx0KTogUHJvbWlzZTxOb3RpZmljYXRpb24gfCBudWxsPiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBUcnkgRWxlY3Ryb24gbmF0aXZlIG5vdGlmaWNhdGlvbiBmaXJzdCAoZGVza3RvcCBtYWluLWJyaWRnZWQgaW4gc29tZSBidWlsZHMpXHJcblx0XHRcdGNvbnN0IGVuID0gdGhpcy50cnlFbGVjdHJvbk5vdGlmaWNhdGlvbih0aXRsZSwgYm9keSk7XHJcblx0XHRcdGlmIChlbikgcmV0dXJuIGVuIGFzIGFueTtcclxuXHJcblx0XHRcdC8vIEZhbGxiYWNrIHRvIFdlYiBOb3RpZmljYXRpb25zIGluIHJlbmRlcmVyIChFbGVjdHJvbiBpbXBsZW1lbnRzIHRoaXMgQVBJKVxyXG5cdFx0XHRpZiAoXCJOb3RpZmljYXRpb25cIiBpbiB3aW5kb3cpIHtcclxuXHRcdFx0XHRpZiAoTm90aWZpY2F0aW9uLnBlcm1pc3Npb24gPT09IFwiZGVmYXVsdFwiKSB7XHJcblx0XHRcdFx0XHRhd2FpdCBOb3RpZmljYXRpb24ucmVxdWVzdFBlcm1pc3Npb24oKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aWYgKE5vdGlmaWNhdGlvbi5wZXJtaXNzaW9uID09PSBcImdyYW50ZWRcIikge1xyXG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBOb3RpZmljYXRpb24odGl0bGUsIHsgYm9keSB9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gRmFsbGJhY2sgdG8gT2JzaWRpYW4gTm90aWNlXHJcblx0XHRcdG5ldyBOb3RpY2UoYCR7dGl0bGV9OiAke2JvZHl9YCwgNTAwMCk7XHJcblx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcIk5vdGlmaWNhdGlvbiBlcnJvclwiLCBlKTtcclxuXHRcdFx0bmV3IE5vdGljZShgJHt0aXRsZX06ICR7Ym9keX1gLCA1MDAwKTtcclxuXHRcdH1cclxuXHRcdHJldHVybiBudWxsO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBvcGVuVGFzayh0YXNrOiBUYXNrKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHQvLyBGaXJzdCwgYnJpbmcgdGhlIHdpbmRvdyB0byBmcm9udFxyXG5cdFx0dGhpcy5mb2N1c09ic2lkaWFuV2luZG93KCk7XHJcblxyXG5cdFx0Y29uc3QgZmlsZSA9IHRoaXMucGx1Z2luLmFwcC52YXVsdC5nZXRGaWxlQnlQYXRoKFxyXG5cdFx0XHR0YXNrLmZpbGVQYXRoXHJcblx0XHQpIGFzIFRGaWxlIHwgbnVsbDtcclxuXHRcdGlmICghZmlsZSkgcmV0dXJuO1xyXG5cclxuXHRcdC8vIE9wZW4gZmlsZSBpbiBjdXJyZW50IHRhYiAoZmFsc2UpIG9yIG5ldyB0YWIgYmFzZWQgb24gcHJlZmVyZW5jZVxyXG5cdFx0Y29uc3QgbGVhZiA9IHRoaXMucGx1Z2luLmFwcC53b3Jrc3BhY2UuZ2V0TGVhZihmYWxzZSk7XHJcblx0XHRhd2FpdCBsZWFmLm9wZW5GaWxlKGZpbGUpO1xyXG5cclxuXHRcdGlmICghKGZpbGUgaW5zdGFuY2VvZiBURmlsZSkpIHJldHVybjtcclxuXHJcblx0XHRhd2FpdCBsZWFmLm9wZW5GaWxlKGZpbGUsIHtcclxuXHRcdFx0ZVN0YXRlOiB7XHJcblx0XHRcdFx0bGluZTogdGFzay5saW5lLFxyXG5cdFx0XHR9LFxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIG9wZW5RdWlja0NhcHR1cmVXaW5kb3coKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRpZiAoIXRoaXMuZWxlY3Ryb25RdWlja0NhcHR1cmUpIHtcclxuXHRcdFx0bmV3IE5vdGljZSh0KFwiUXVpY2sgY2FwdHVyZSBub3QgYXZhaWxhYmxlXCIpKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdGF3YWl0IHRoaXMuZWxlY3Ryb25RdWlja0NhcHR1cmUub3BlbkNhcHR1cmVXaW5kb3coKTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gb3BlbiBxdWljayBjYXB0dXJlOlwiLCBlcnJvcik7XHJcblx0XHRcdG5ldyBOb3RpY2UodChcIkZhaWxlZCB0byBvcGVuIHF1aWNrIGNhcHR1cmUgd2luZG93XCIpKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZm9jdXNPYnNpZGlhbldpbmRvdygpOiB2b2lkIHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IGVsZWN0cm9uID0gdGhpcy5nZXRFbGVjdHJvbigpO1xyXG5cdFx0XHRpZiAoIWVsZWN0cm9uKSByZXR1cm47XHJcblxyXG5cdFx0XHQvLyBHZXQgdGhlIGN1cnJlbnQgQnJvd3NlcldpbmRvd1xyXG5cdFx0XHRjb25zdCBCcm93c2VyV2luZG93ID1cclxuXHRcdFx0XHRlbGVjdHJvbi5yZW1vdGU/LkJyb3dzZXJXaW5kb3cgfHwgZWxlY3Ryb24uQnJvd3NlcldpbmRvdztcclxuXHRcdFx0Y29uc3QgZ2V0Q3VycmVudFdpbmRvdyA9XHJcblx0XHRcdFx0ZWxlY3Ryb24ucmVtb3RlPy5nZXRDdXJyZW50V2luZG93IHx8XHJcblx0XHRcdFx0KCgpID0+IHtcclxuXHRcdFx0XHRcdC8vIEZhbGxiYWNrOiB0cnkgdG8gZ2V0IHdpbmRvdyBmcm9tIHdlYkNvbnRlbnRzXHJcblx0XHRcdFx0XHRjb25zdCB3ZWJDb250ZW50cyA9XHJcblx0XHRcdFx0XHRcdGVsZWN0cm9uLnJlbW90ZT8uZ2V0Q3VycmVudFdlYkNvbnRlbnRzPy4oKSB8fFxyXG5cdFx0XHRcdFx0XHRlbGVjdHJvbi53ZWJDb250ZW50cz8uZ2V0Rm9jdXNlZFdlYkNvbnRlbnRzPy4oKTtcclxuXHRcdFx0XHRcdHJldHVybiB3ZWJDb250ZW50c1xyXG5cdFx0XHRcdFx0XHQ/IEJyb3dzZXJXaW5kb3c/LmZyb21XZWJDb250ZW50cz8uKHdlYkNvbnRlbnRzKVxyXG5cdFx0XHRcdFx0XHQ6IG51bGw7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCB3aW4gPSBnZXRDdXJyZW50V2luZG93Py4oKTtcclxuXHRcdFx0aWYgKHdpbikge1xyXG5cdFx0XHRcdC8vIFNob3cgd2luZG93IGlmIG1pbmltaXplZFxyXG5cdFx0XHRcdGlmICh3aW4uaXNNaW5pbWl6ZWQ/LigpKSB7XHJcblx0XHRcdFx0XHR3aW4ucmVzdG9yZT8uKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIEJyaW5nIHdpbmRvdyB0byBmcm9udFxyXG5cdFx0XHRcdHdpbi5zaG93Py4oKTtcclxuXHRcdFx0XHR3aW4uZm9jdXM/LigpO1xyXG5cclxuXHRcdFx0XHQvLyBPbiBXaW5kb3dzLCBzb21ldGltZXMgbmVlZCBleHRyYSBzdGVwcyB0byBicmluZyB0byBmcm9udFxyXG5cdFx0XHRcdGlmIChQbGF0Zm9ybS5pc1dpbikge1xyXG5cdFx0XHRcdFx0d2luLnNldEFsd2F5c09uVG9wPy4odHJ1ZSk7XHJcblx0XHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRcdFx0d2luLnNldEFsd2F5c09uVG9wPy4oZmFsc2UpO1xyXG5cdFx0XHRcdFx0fSwgMTAwKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJbVHJheURlYnVnXSBDb3VsZCBub3QgZm9jdXMgd2luZG93OlwiLCBlKTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IERlc2t0b3BJbnRlZ3JhdGlvbk1hbmFnZXI7XHJcbiJdfQ==