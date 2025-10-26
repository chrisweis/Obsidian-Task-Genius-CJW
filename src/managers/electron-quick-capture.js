import { __awaiter } from "tslib";
import { Notice } from "obsidian";
import { t } from "../translations/helper";
import { moment } from "obsidian";
export class ElectronQuickCapture {
    constructor(plugin) {
        this.captureWindow = null;
        this.ipcRenderer = null;
        this.ipcMain = null;
        this.BrowserWindow = null;
        // private ownerWindow: any = null; // Removed - no longer using parent window
        this.captureResolve = null;
        this.captureReject = null;
        this.isClosingNormally = false;
        this.plugin = plugin;
        this.app = plugin.app;
        this.initializeElectron();
    }
    getElectron() {
        try {
            const injected = window.electron || globalThis.electron;
            if (injected)
                return injected;
            const req = window.require || globalThis.require;
            return req ? req("electron") : null;
        }
        catch (_a) {
            return null;
        }
    }
    initializeElectron() {
        var _a, _b;
        const electron = this.getElectron();
        if (!electron)
            return false;
        this.BrowserWindow =
            ((_a = electron.remote) === null || _a === void 0 ? void 0 : _a.BrowserWindow) || electron.BrowserWindow;
        this.ipcRenderer = electron.ipcRenderer;
        this.ipcMain = ((_b = electron.remote) === null || _b === void 0 ? void 0 : _b.ipcMain) || electron.ipcMain;
        // No longer getting owner window since we don't use parent
        return !!(this.BrowserWindow && this.ipcRenderer);
    }
    openCaptureWindow() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.BrowserWindow) {
                new Notice(t("Electron not available for quick capture"));
                return null;
            }
            // If window already exists, focus it
            if (this.captureWindow && !this.captureWindow.isDestroyed()) {
                this.captureWindow.show();
                this.captureWindow.focus();
                return null;
            }
            return new Promise((resolve, reject) => {
                this.captureResolve = resolve;
                this.captureReject = reject;
                try {
                    // Create window with optimal settings for quick capture
                    this.captureWindow = new this.BrowserWindow({
                        width: 600,
                        height: 400,
                        useContentSize: true,
                        minWidth: 400,
                        minHeight: 250,
                        // parent: this.ownerWindow, // Remove parent to avoid bringing main window to front
                        modal: false,
                        show: false,
                        frame: true,
                        autoHideMenuBar: true,
                        alwaysOnTop: true,
                        resizable: true,
                        minimizable: false,
                        maximizable: false,
                        fullscreenable: false,
                        skipTaskbar: true,
                        title: "Quick Capture - Task Genius",
                        backgroundColor: this.getBackgroundColor(),
                        webPreferences: {
                            nodeIntegration: true,
                            contextIsolation: false,
                            webSecurity: false,
                        },
                    });
                    // Generate and load the HTML content
                    const html = this.generateCaptureHTML();
                    this.captureWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
                    // Setup IPC handlers
                    this.setupIPCHandlers();
                    // Handle window events
                    this.captureWindow.once("ready-to-show", () => {
                        var _a, _b;
                        // Use showInactive on macOS to avoid bringing main window to front
                        if (process.platform === "darwin" && ((_a = this.captureWindow) === null || _a === void 0 ? void 0 : _a.showInactive)) {
                            this.captureWindow.showInactive();
                        }
                        else {
                            (_b = this.captureWindow) === null || _b === void 0 ? void 0 : _b.show();
                        }
                        // Only focus when necessary for keyboard input
                        setTimeout(() => {
                            var _a;
                            (_a = this.captureWindow) === null || _a === void 0 ? void 0 : _a.focus();
                        }, 100);
                        // Send initial data to window
                        this.captureWindow.webContents.executeJavaScript(`
						window.postMessage({ 
							type: 'init', 
							settings: ${JSON.stringify(this.getQuickCaptureSettings())}
						}, '*');
					`);
                    });
                    // Auto-adjust window size to content after loading
                    this.captureWindow.webContents.once("did-finish-load", () => __awaiter(this, void 0, void 0, function* () {
                        var _a;
                        try {
                            const size = yield ((_a = this.captureWindow) === null || _a === void 0 ? void 0 : _a.webContents.executeJavaScript(`({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight})`));
                            if (size && this.captureWindow && !this.captureWindow.isDestroyed()) {
                                this.captureWindow.setContentSize(Math.max(500, Math.min(800, size.w)), Math.max(320, Math.min(600, size.h)), true);
                            }
                        }
                        catch (e) {
                            console.log('Could not auto-adjust window size:', e);
                        }
                    }));
                    this.captureWindow.on("closed", () => {
                        this.captureWindow = null;
                        this.cleanupIPCHandlers();
                        // Only reject if not closing normally (e.g., user clicked X or pressed Escape)
                        if (!this.isClosingNormally) {
                            if (this.captureResolve) {
                                // Resolve with null to indicate user cancelled
                                this.captureResolve(null);
                            }
                        }
                        // Reset state
                        this.captureResolve = null;
                        this.captureReject = null;
                        this.isClosingNormally = false;
                    });
                }
                catch (error) {
                    console.error("Failed to create capture window:", error);
                    new Notice(t("Failed to open quick capture window"));
                    reject(error);
                }
            });
        });
    }
    setupIPCHandlers() {
        var _a;
        if (!this.captureWindow)
            return;
        console.log("[ElectronQuickCapture] Setting up IPC handlers");
        // Try to get ipcMain for handling messages
        const electron = this.getElectron();
        const ipcMain = (electron === null || electron === void 0 ? void 0 : electron.ipcMain) || ((_a = electron === null || electron === void 0 ? void 0 : electron.remote) === null || _a === void 0 ? void 0 : _a.ipcMain);
        if (ipcMain) {
            // Use ipcMain handlers (preferred method)
            try {
                // Remove existing handlers if any
                ipcMain.removeHandler('quick-capture-save');
                ipcMain.removeHandler('quick-capture-cancel');
                ipcMain.removeHandler('quick-capture-request-data');
                // Handle save
                ipcMain.handle('quick-capture-save', (event, data) => __awaiter(this, void 0, void 0, function* () {
                    console.log("[ElectronQuickCapture] IPC received save:", data);
                    yield this.handleSaveTask(data);
                }));
                // Handle cancel  
                ipcMain.handle('quick-capture-cancel', () => __awaiter(this, void 0, void 0, function* () {
                    console.log("[ElectronQuickCapture] IPC received cancel");
                    this.closeCaptureWindow();
                }));
                // Handle data requests
                ipcMain.handle('quick-capture-request-data', (event, type) => __awaiter(this, void 0, void 0, function* () {
                    console.log("[ElectronQuickCapture] IPC requesting data:", type);
                    return yield this.getDataForWindow(type);
                }));
                this._ipcHandlers = { ipcMain, registered: true };
                console.log("[ElectronQuickCapture] IPC handlers registered with ipcMain.handle");
            }
            catch (e) {
                console.warn("[ElectronQuickCapture] Failed to set up ipcMain handlers:", e);
            }
        }
        // Fallback: Listen for regular IPC messages
        this.captureWindow.webContents.on('ipc-message', (_event, channel, ...args) => __awaiter(this, void 0, void 0, function* () {
            var _b, _c;
            console.log("[ElectronQuickCapture] Received ipc-message:", channel, args);
            if (channel === 'quick-capture-save') {
                yield this.handleSaveTask(args[0]);
            }
            else if (channel === 'quick-capture-cancel') {
                this.closeCaptureWindow();
            }
            else if (channel === 'quick-capture-request-data') {
                const data = yield this.getDataForWindow(args[0]);
                // Send data back to window
                (_c = (_b = this.captureWindow) === null || _b === void 0 ? void 0 : _b.webContents) === null || _c === void 0 ? void 0 : _c.executeJavaScript(`
					window.receiveSuggestions('${args[0]}', ${JSON.stringify(data)});
				`);
            }
        }));
        // Also listen for direct channel messages (for newer Electron versions)
        if (ipcMain) {
            ipcMain.on('quick-capture-save', (event, data) => __awaiter(this, void 0, void 0, function* () {
                console.log("[ElectronQuickCapture] Direct IPC received save:", data);
                yield this.handleSaveTask(data);
            }));
            ipcMain.on('quick-capture-cancel', () => {
                console.log("[ElectronQuickCapture] Direct IPC received cancel");
                this.closeCaptureWindow();
            });
            ipcMain.on('quick-capture-request-data', (event, type) => __awaiter(this, void 0, void 0, function* () {
                console.log("[ElectronQuickCapture] Direct IPC requesting data:", type);
                const data = yield this.getDataForWindow(type);
                event.reply('quick-capture-data-response', type, data);
            }));
            this._ipcHandlers = { ipcMain, registered: true };
        }
    }
    // Not currently used but kept for potential future use
    injectWindowHandlers() {
        // Inject handlers directly into the window if IPC is not available
        if (!this.captureWindow)
            return;
        const handleSave = `
			window.handleQuickCaptureSave = async (data) => {
				return ${JSON.stringify({ handler: 'save' })};
			};
		`;
        const handleCancel = `
			window.handleQuickCaptureCancel = () => {
				window.close();
			};
		`;
        this.captureWindow.webContents.executeJavaScript(handleSave);
        this.captureWindow.webContents.executeJavaScript(handleCancel);
        // Set up message passing through window.postMessage
        this.captureWindow.webContents.on('ipc-message', (_event, channel, ...args) => __awaiter(this, void 0, void 0, function* () {
            if (channel === 'quick-capture-save') {
                yield this.handleSaveTask(args[0]);
            }
            else if (channel === 'quick-capture-cancel') {
                this.closeCaptureWindow();
            }
        }));
    }
    cleanupIPCHandlers() {
        if (!this._ipcHandlers)
            return;
        const { ipcMain } = this._ipcHandlers;
        if (ipcMain) {
            // Remove IPC handlers
            try {
                // Remove handle-based handlers
                ipcMain.removeHandler("quick-capture-save");
                ipcMain.removeHandler("quick-capture-cancel");
                ipcMain.removeHandler("quick-capture-request-data");
                // Remove event-based listeners
                ipcMain.removeAllListeners("quick-capture-save");
                ipcMain.removeAllListeners("quick-capture-cancel");
                ipcMain.removeAllListeners("quick-capture-request-data");
            }
            catch (_a) {
                // Ignore errors during cleanup
            }
        }
        delete this._ipcHandlers;
    }
    handleSaveTask(data) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log("[ElectronQuickCapture] handleSaveTask called with data:", data);
                // Parse the task content and metadata
                const { content, project, context, dueDate, priority, tags } = data;
                if (!(content === null || content === void 0 ? void 0 : content.trim())) {
                    (_b = (_a = this.captureWindow) === null || _a === void 0 ? void 0 : _a.webContents) === null || _b === void 0 ? void 0 : _b.executeJavaScript(`
					showError('Task content cannot be empty');
				`);
                    return;
                }
                // Prepare task creation arguments
                const taskArgs = {
                    content: content.trim(),
                };
                // Add optional metadata
                if (project)
                    taskArgs.project = project;
                if (context)
                    taskArgs.context = context;
                if (priority)
                    taskArgs.priority = priority;
                if (tags && tags.length > 0)
                    taskArgs.tags = tags;
                // Parse due date if provided
                if (dueDate) {
                    const parsedDate = this.parseDueDate(dueDate);
                    if (parsedDate) {
                        taskArgs.dueDate = parsedDate;
                    }
                }
                // Create the task using the write API
                console.log("[ElectronQuickCapture] Calling createTask with args:", taskArgs);
                const result = yield this.createTask(taskArgs);
                if (result.success) {
                    new Notice(t("Task captured successfully"));
                    // Mark as normal closing before closing the window
                    this.isClosingNormally = true;
                    if (this.captureResolve) {
                        this.captureResolve(result.task);
                        this.captureResolve = null;
                        this.captureReject = null;
                    }
                    this.closeCaptureWindow();
                }
                else {
                    throw new Error(result.error || "Failed to create task");
                }
            }
            catch (error) {
                console.error("Failed to save task:", error);
                const errorMsg = error.message || "Failed to save task";
                (_d = (_c = this.captureWindow) === null || _c === void 0 ? void 0 : _c.webContents) === null || _d === void 0 ? void 0 : _d.executeJavaScript(`
				showError('${errorMsg.replace(/'/g, "\\'")}');
			`);
            }
        });
    }
    createTask(args) {
        return __awaiter(this, void 0, void 0, function* () {
            // Use the plugin's write API to create the task
            if (!this.plugin.writeAPI) {
                console.error("[ElectronQuickCapture] WriteAPI not available");
                return { success: false, error: "Write API not available" };
            }
            console.log("[ElectronQuickCapture] Creating task with args:", args);
            // Determine target based on quick capture settings
            const qc = this.plugin.settings.quickCapture;
            const targetType = (qc === null || qc === void 0 ? void 0 : qc.targetType) || "daily-note";
            try {
                let result;
                if (targetType === "daily-note") {
                    // Create in daily note
                    console.log("[ElectronQuickCapture] Creating task in daily note");
                    result = yield this.plugin.writeAPI.createTaskInDailyNote(args);
                }
                else if (targetType === "fixed" && (qc === null || qc === void 0 ? void 0 : qc.targetFile)) {
                    // Create in fixed file
                    console.log("[ElectronQuickCapture] Creating task in fixed file:", qc.targetFile);
                    args.filePath = qc.targetFile;
                    result = yield this.plugin.writeAPI.createTask(args);
                }
                else {
                    // Default to daily note
                    console.log("[ElectronQuickCapture] Creating task in daily note (default)");
                    result = yield this.plugin.writeAPI.createTaskInDailyNote(args);
                }
                console.log("[ElectronQuickCapture] Task creation result:", result);
                return result;
            }
            catch (error) {
                console.error("[ElectronQuickCapture] Error creating task:", error);
                return { success: false, error: error.message || "Failed to create task" };
            }
        });
    }
    parseDueDate(dateStr) {
        if (!dateStr)
            return undefined;
        try {
            // Try natural language parsing first
            const naturalParsers = [
                { pattern: /^today$/i, offset: 0 },
                { pattern: /^tomorrow$/i, offset: 1 },
                { pattern: /^next week$/i, offset: 7 },
                { pattern: /^in (\d+) days?$/i, offsetMatch: 1 },
            ];
            for (const parser of naturalParsers) {
                const match = dateStr.match(parser.pattern);
                if (match) {
                    const offset = parser.offsetMatch
                        ? parseInt(match[parser.offsetMatch])
                        : parser.offset;
                    const date = moment().add(offset, 'days');
                    return date.format('YYYY-MM-DD');
                }
            }
            // Try parsing as date
            const parsed = moment(dateStr);
            if (parsed.isValid()) {
                return parsed.format('YYYY-MM-DD');
            }
        }
        catch (_a) {
            // Ignore parsing errors
        }
        return undefined;
    }
    getDataForWindow(type) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (type) {
                case "projects":
                    return yield this.getProjects();
                case "contexts":
                    return yield this.getContexts();
                case "tags":
                    return yield this.getTags();
                default:
                    return [];
            }
        });
    }
    getProjects() {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const queryAPI = (_b = (_a = this.plugin.dataflowOrchestrator) === null || _a === void 0 ? void 0 : _a.getQueryAPI) === null || _b === void 0 ? void 0 : _b.call(_a);
                if (!queryAPI)
                    return [];
                const allTasks = yield queryAPI.getAllTasks();
                const projects = new Set();
                for (const task of allTasks) {
                    if ((_c = task.metadata) === null || _c === void 0 ? void 0 : _c.project) {
                        projects.add(task.metadata.project);
                    }
                }
                return Array.from(projects).sort();
            }
            catch (_d) {
                return [];
            }
        });
    }
    getContexts() {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const queryAPI = (_b = (_a = this.plugin.dataflowOrchestrator) === null || _a === void 0 ? void 0 : _a.getQueryAPI) === null || _b === void 0 ? void 0 : _b.call(_a);
                if (!queryAPI)
                    return [];
                const allTasks = yield queryAPI.getAllTasks();
                const contexts = new Set();
                for (const task of allTasks) {
                    if ((_c = task.metadata) === null || _c === void 0 ? void 0 : _c.context) {
                        contexts.add(task.metadata.context);
                    }
                }
                return Array.from(contexts).sort();
            }
            catch (_d) {
                return [];
            }
        });
    }
    getTags() {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const queryAPI = (_b = (_a = this.plugin.dataflowOrchestrator) === null || _a === void 0 ? void 0 : _a.getQueryAPI) === null || _b === void 0 ? void 0 : _b.call(_a);
                if (!queryAPI)
                    return [];
                const allTasks = yield queryAPI.getAllTasks();
                const tags = new Set();
                for (const task of allTasks) {
                    if (((_c = task.metadata) === null || _c === void 0 ? void 0 : _c.tags) && Array.isArray(task.metadata.tags)) {
                        task.metadata.tags.forEach((tag) => tags.add(tag));
                    }
                }
                return Array.from(tags).sort();
            }
            catch (_d) {
                return [];
            }
        });
    }
    closeCaptureWindow() {
        if (this.captureWindow && !this.captureWindow.isDestroyed()) {
            // Set flag if not already set (for cancel operations)
            if (!this.isClosingNormally) {
                this.isClosingNormally = true;
            }
            this.captureWindow.close();
        }
        this.captureWindow = null;
    }
    getBackgroundColor() {
        try {
            const isDark = this.isDarkTheme();
            return isDark ? "#202020" : "#ffffff";
        }
        catch (_a) {
            return "#ffffff";
        }
    }
    isDarkTheme() {
        var _a;
        try {
            const electron = this.getElectron();
            const nativeTheme = (electron === null || electron === void 0 ? void 0 : electron.nativeTheme) || ((_a = electron === null || electron === void 0 ? void 0 : electron.remote) === null || _a === void 0 ? void 0 : _a.nativeTheme);
            if (nativeTheme && typeof nativeTheme.shouldUseDarkColors === "boolean") {
                return nativeTheme.shouldUseDarkColors;
            }
            return window.matchMedia("(prefers-color-scheme: dark)").matches;
        }
        catch (_b) {
            return false;
        }
    }
    getQuickCaptureSettings() {
        const qc = this.plugin.settings.quickCapture || {};
        // Return all metadata fields as visible by default
        // since there are no specific show/hide settings for them
        return {
            targetType: qc.targetType || "daily-note",
            showProject: true,
            showContext: true,
            showDueDate: true,
            showPriority: true,
            showTags: true,
        };
    }
    generateCaptureHTML() {
        const isDark = this.isDarkTheme();
        // Define Obsidian-like CSS variables for consistent styling
        const cssVars = `
		:root {
			--background-primary: ${isDark ? "#202020" : "#ffffff"};
			--background-primary-alt: ${isDark ? "#1a1a1a" : "#fafafa"};
			--background-secondary: ${isDark ? "#2a2a2a" : "#f5f5f5"};
			--background-secondary-alt: ${isDark ? "#333333" : "#e3e3e3"};
			--background-modifier-border: ${isDark ? "#404040" : "#d0d0d0"};
			--background-modifier-hover: ${isDark ? "#353535" : "#ebebeb"};
			--text-normal: ${isDark ? "#e0e0e0" : "#333333"};
			--text-muted: ${isDark ? "#a0a0a0" : "#666666"};
			--text-faint: ${isDark ? "#808080" : "#999999"};
			--text-on-accent: #ffffff;
			--interactive-normal: ${isDark ? "#2a2a2a" : "#f5f5f5"};
			--interactive-hover: ${isDark ? "#3a3a3a" : "#e8e8e8"};
			--interactive-accent: #7c3aed;
			--interactive-accent-hover: #6d28d9;
			--radius-s: 6px;
			--radius-m: 8px;
		}
		`;
        return `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<title>Quick Capture - Task Genius</title>
	<style>
		${cssVars}
		
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}

		html, body {
			height: 100%;
			width: 100%;
		}

		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
			background-color: var(--background-primary);
			color: var(--text-normal);
			padding: 12px;
			display: flex;
			flex-direction: column;
			overflow: hidden;
		}

		.container {
			flex: 1;
			display: flex;
			flex-direction: column;
			gap: 16px;
			overflow-y: auto;
			padding: 8px;
		}

		.title {
			font-size: 18px;
			font-weight: 600;
			margin-bottom: 8px;
		}

		.input-group {
			display: flex;
			flex-direction: column;
			gap: 8px;
		}

		label {
			font-size: 12px;
			font-weight: 500;
			color: var(--text-muted);
		}

		input[type="text"],
		textarea,
		select {
			width: 100%;
			padding: 8px 12px;
			background-color: var(--background-secondary);
			color: var(--text-normal);
			border: 1px solid var(--background-modifier-border);
			border-radius: var(--radius-s);
			font-size: 14px;
			outline: none;
			transition: all 0.2s;
		}

		input[type="text"]:focus,
		textarea:focus,
		select:focus {
			border-color: var(--interactive-accent);
			box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.2);
		}

		textarea {
			resize: none;
			min-height: 80px;
			max-height: 300px;
			font-family: inherit;
			line-height: 1.5;
			overflow-y: auto;
		}

		.metadata {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 12px;
		}

		.metadata-item {
			display: flex;
			flex-direction: column;
			gap: 4px;
		}

		.buttons {
			display: flex;
			justify-content: flex-end;
			gap: 12px;
			margin-top: auto;
			padding: 12px;
			border-top: 1px solid var(--background-modifier-border);
			background: var(--background-primary);
		}

		button {
			padding: 8px 20px;
			border: none;
			border-radius: var(--radius-s);
			font-size: 14px;
			font-weight: 500;
			cursor: pointer;
			transition: all 0.2s;
		}

		.btn-primary {
			background-color: var(--interactive-accent);
			color: var(--text-on-accent);
		}

		.btn-primary:hover {
			background-color: var(--interactive-accent-hover);
			transform: translateY(-1px);
		}

		.btn-secondary {
			background-color: var(--background-secondary);
			color: var(--text-normal);
			border: 1px solid var(--background-modifier-border);
		}

		.btn-secondary:hover {
			background-color: var(--background-modifier-hover);
		}

		.error-message {
			color: #ef4444;
			font-size: 12px;
			margin-top: 4px;
			display: none;
		}

		.error-message.show {
			display: block;
		}

		.help-text {
			font-size: 11px;
			color: var(--text-faint);
			margin-top: 2px;
		}

		.priority-select {
			display: flex;
			gap: 8px;
		}

		.priority-btn {
			flex: 1;
			padding: 6px;
			text-align: center;
			border: 1px solid var(--background-modifier-border);
			border-radius: 4px;
			cursor: pointer;
			transition: all 0.2s;
			background-color: var(--background-secondary);
		}

		.priority-btn:hover {
			background-color: rgba(124, 58, 237, 0.1);
			border-color: var(--interactive-accent);
		}

		.priority-btn.selected {
			background-color: var(--interactive-accent);
			color: var(--text-on-accent);
			border-color: var(--interactive-accent);
		}

		.date-input-wrapper {
			display: flex;
			gap: 8px;
			align-items: center;
		}

		.date-picker, .date-text {
			flex: 1;
		}

		.date-toggle {
			width: 32px;
			height: 32px;
			padding: 4px;
			background: var(--background-secondary);
			border: 1px solid var(--background-modifier-border);
			border-radius: 4px;
			cursor: pointer;
			font-size: 16px;
			transition: all 0.2s;
		}

		.date-toggle:hover {
			background: rgba(124, 58, 237, 0.1);
			border-color: var(--interactive-accent);
		}

		@media (max-width: 500px) {
			.metadata {
				grid-template-columns: 1fr;
			}
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="title">Quick Capture</div>
		
		<div class="input-group">
			<textarea 
				id="task-content" 
				placeholder="Enter your task..." 
				autofocus
			></textarea>
			<div class="error-message" id="content-error"></div>
		</div>

		<div class="metadata" id="metadata-section">
			<div class="metadata-item">
				<label>Project</label>
				<input type="text" id="project" list="project-list" placeholder="e.g., Work, Personal">
				<datalist id="project-list"></datalist>
			</div>

			<div class="metadata-item">
				<label>Context</label>
				<input type="text" id="context" list="context-list" placeholder="e.g., @home, @office">
				<datalist id="context-list"></datalist>
			</div>

			<div class="metadata-item">
				<label>Start Date</label>
				<div class="date-input-wrapper">
					<input type="date" id="start-date-picker" class="date-picker">
					<input type="text" id="start-date-text" placeholder="today, tomorrow" class="date-text" style="display:none">
					<button type="button" class="date-toggle" data-date-type="start" title="Toggle input type">🛫</button>
				</div>
			</div>

			<div class="metadata-item">
				<label>Due Date</label>
				<div class="date-input-wrapper">
					<input type="date" id="due-date-picker" class="date-picker">
					<input type="text" id="due-date-text" placeholder="tomorrow, next week" class="date-text" style="display:none">
					<button type="button" class="date-toggle" data-date-type="due" title="Toggle input type">📅</button>
				</div>
			</div>

			<div class="metadata-item">
				<label>Scheduled Date</label>
				<div class="date-input-wrapper">
					<input type="date" id="scheduled-date-picker" class="date-picker">
					<input type="text" id="scheduled-date-text" placeholder="next monday" class="date-text" style="display:none">
					<button type="button" class="date-toggle" data-date-type="scheduled" title="Toggle input type">⏳</button>
				</div>
			</div>

			<div class="metadata-item">
				<label>Priority</label>
				<div class="priority-select">
					<div class="priority-btn" data-priority="1">1</div>
					<div class="priority-btn" data-priority="2">2</div>
					<div class="priority-btn" data-priority="3">3</div>
					<div class="priority-btn" data-priority="4">4</div>
					<div class="priority-btn" data-priority="5">5</div>
				</div>
			</div>

			<div class="metadata-item">
				<label>Tags</label>
				<input type="text" id="tags" list="tags-list" placeholder="e.g., important, urgent">
				<datalist id="tags-list"></datalist>
				<div class="help-text">Comma separated</div>
			</div>
		</div>

		<div class="buttons">
			<button class="btn-secondary" onclick="cancel()">
				Cancel (Esc)
			</button>
			<button class="btn-primary" onclick="save()">
				Save (Enter)
			</button>
		</div>
	</div>

	<script>
		// Use a bridge approach for IPC communication
		let selectedPriority = null;
		let bridge = null;
		let dateInputModes = {
			start: 'picker',
			due: 'picker',
			scheduled: 'picker'
		}; // Track mode for each date field

		// Set up communication bridge
		try {
			// Try to get ipcRenderer from various sources
			const electron = window.require ? window.require('electron') : null;
			const ipcRenderer = electron?.ipcRenderer;
			
			if (ipcRenderer) {
				console.log('IPC bridge established');
				bridge = {
					save: (data) => {
						console.log('Sending save via IPC:', data);
						// Try both old and new IPC methods
						ipcRenderer.send('quick-capture-save', data);
						return Promise.resolve();
					},
					cancel: () => {
						console.log('Sending cancel via IPC');
						ipcRenderer.send('quick-capture-cancel');
						return Promise.resolve();
					},
					requestData: (type) => {
						return new Promise((resolve) => {
							// Set up receiver for suggestions
							window.receiveSuggestions = (dataType, items) => {
								if (dataType === type) {
									resolve(items);
									delete window.receiveSuggestions;
								}
							};
							ipcRenderer.send('quick-capture-request-data', type);
							// Timeout after 2 seconds
							setTimeout(() => resolve([]), 2000);
						});
					}
				};
			} else {
				console.log('IPC not available - no ipcRenderer');
			}
		} catch (e) {
			console.log('IPC not available - error:', e);
		}

		// Auto-resize textarea
		function autoResizeTextarea(textarea) {
			if (!textarea) return;
			
			// Reset height to measure content
			textarea.style.height = 'auto';
			
			// Calculate new height based on scroll height
			const newHeight = Math.min(textarea.scrollHeight, 300);
			textarea.style.height = newHeight + 'px';
			
			// Don't resize the window - let the container handle overflow
			// The window size should remain stable
		}

		// Initialize
		document.addEventListener('DOMContentLoaded', () => {
			const taskContent = document.getElementById('task-content');
			
			// Focus on task content
			if (taskContent) {
				taskContent.focus();
				
				// Auto-resize on input
				taskContent.addEventListener('input', () => {
					autoResizeTextarea(taskContent);
				});
				
				// Initial resize
				setTimeout(() => autoResizeTextarea(taskContent), 0);
			}

			// Load suggestions
			loadSuggestions();

			// Date input toggles
			document.querySelectorAll('.date-toggle').forEach(btn => {
				btn.addEventListener('click', (e) => {
					const dateType = e.target.dataset.dateType;
					if (dateType) {
						toggleDateInput(dateType);
					}
				});
			});

			// Handle date picker changes for all date fields
			['start', 'due', 'scheduled'].forEach(dateType => {
				const picker = document.getElementById(dateType + '-date-picker');
				const text = document.getElementById(dateType + '-date-text');
				
				if (picker) {
					picker.addEventListener('change', (e) => {
						// Sync to text field
						if (text) text.value = e.target.value;
					});
				}
				
				// Handle natural language date input
				if (text) {
					text.addEventListener('blur', (e) => {
						const parsed = parseNaturalDate(e.target.value);
						if (parsed && parsed !== e.target.value) {
							e.target.value = parsed;
							if (picker) picker.value = parsed;
						}
					});
				}
			})

			// Handle priority buttons
			document.querySelectorAll('.priority-btn').forEach(btn => {
				btn.addEventListener('click', () => {
					document.querySelectorAll('.priority-btn').forEach(b => 
						b.classList.remove('selected')
					);
					btn.classList.add('selected');
					selectedPriority = parseInt(btn.dataset.priority);
				});
			});

			// Keyboard shortcuts
			document.addEventListener('keydown', (e) => {
				if (e.key === 'Escape') {
					e.preventDefault();
					cancel();
				} else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
					e.preventDefault();
					save();
				} else if (e.key === 'Tab' && e.target.id === 'task-content') {
					// Allow Tab in textarea to insert tabs
					if (!e.shiftKey) {
						e.preventDefault();
						const textarea = e.target;
						const start = textarea.selectionStart;
						const end = textarea.selectionEnd;
						const value = textarea.value;
						textarea.value = value.substring(0, start) + '\t' + value.substring(end);
						textarea.selectionStart = textarea.selectionEnd = start + 1;
						autoResizeTextarea(textarea);
					}
				} else if ((e.key >= '1' && e.key <= '5') && e.altKey) {
					// Alt+1 through Alt+5 for priority
					e.preventDefault();
					const priority = parseInt(e.key);
					document.querySelectorAll('.priority-btn').forEach(btn => {
						btn.classList.remove('selected');
						if (parseInt(btn.dataset.priority) === priority) {
							btn.classList.add('selected');
							selectedPriority = priority;
						}
					});
				}
			});

			// Handle settings from main process
			window.addEventListener('message', (event) => {
				if (event.data.type === 'init' && event.data.settings) {
					applySettings(event.data.settings);
				}
			});
		});

		// Toggle date input between picker and text for specific date type
		function toggleDateInput(dateType) {
			const picker = document.getElementById(dateType + '-date-picker');
			const text = document.getElementById(dateType + '-date-text');
			
			if (!picker || !text) return;
			
			if (dateInputModes[dateType] === 'picker') {
				picker.style.display = 'none';
				text.style.display = 'block';
				text.focus();
				dateInputModes[dateType] = 'text';
			} else {
				text.style.display = 'none';
				picker.style.display = 'block';
				picker.focus();
				dateInputModes[dateType] = 'picker';
			}
		}

		// Load auto-complete suggestions
		async function loadSuggestions() {
			if (bridge && bridge.requestData) {
				try {
					// Request and populate projects
					const projects = await bridge.requestData('projects');
					populateDatalist('project-list', projects || []);
					
					// Request and populate contexts
					const contexts = await bridge.requestData('contexts');
					populateDatalist('context-list', contexts || []);
					
					// Request and populate tags
					const tags = await bridge.requestData('tags');
					populateDatalist('tags-list', tags || []);
				} catch (e) {
					console.error('Failed to load suggestions:', e);
				}
			}
		}

		// Populate datalist with items
		function populateDatalist(listId, items) {
			const datalist = document.getElementById(listId);
			if (!datalist || !items) return;
			
			datalist.innerHTML = '';
			items.forEach(item => {
				const option = document.createElement('option');
				option.value = item;
				datalist.appendChild(option);
			});
		}

		function applySettings(settings) {
			// Show/hide metadata fields based on settings
			const metadata = document.getElementById('metadata-section');
			if (!settings.showProject && !settings.showContext && 
				!settings.showDueDate && !settings.showPriority) {
				metadata.style.display = 'none';
			} else {
				// Hide individual fields based on settings
				if (!settings.showProject) {
					const projectEl = document.getElementById('project');
					if (projectEl && projectEl.parentElement) {
						projectEl.parentElement.style.display = 'none';
					}
				}
				if (!settings.showContext) {
					const contextEl = document.getElementById('context');
					if (contextEl && contextEl.parentElement) {
						contextEl.parentElement.style.display = 'none';
					}
				}
				if (!settings.showDueDate) {
					const dueDatePicker = document.getElementById('due-date-picker');
					if (dueDatePicker && dueDatePicker.parentElement && dueDatePicker.parentElement.parentElement) {
						dueDatePicker.parentElement.parentElement.style.display = 'none';
					}
				}
				if (!settings.showPriority) {
					const priorityEls = document.querySelectorAll('.priority-btn');
					if (priorityEls.length > 0 && priorityEls[0].parentElement) {
						priorityEls[0].parentElement.parentElement.style.display = 'none';
					}
				}
			}
		}

		async function save() {
			const content = document.getElementById('task-content').value;
			
			if (!content.trim()) {
				showError('Task content cannot be empty');
				return;
			}

			// Get date values from either picker or text input for each date type
			function getDateValue(dateType) {
				const pickerValue = document.getElementById(dateType + '-date-picker').value;
				const textValue = document.getElementById(dateType + '-date-text').value;
				const dateValue = pickerValue || textValue;
				return dateValue ? parseNaturalDate(dateValue) : '';
			}

			const startDate = getDateValue('start');
			const dueDate = getDateValue('due');
			const scheduledDate = getDateValue('scheduled');

			// Get tags and split by comma
			const tagsInput = document.getElementById('tags').value.trim();
			const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];
			
			// Process content to convert to task format if needed
			const processedContent = processTaskContent(content.trim());

			const data = {
				content: processedContent,
				project: document.getElementById('project').value.trim(),
				context: document.getElementById('context').value.trim(),
				startDate: startDate ? startDate.trim() : '',
				dueDate: dueDate ? dueDate.trim() : '',
				scheduledDate: scheduledDate ? scheduledDate.trim() : '',
				priority: selectedPriority,
				tags: tags
			};

			if (bridge) {
				try {
					await bridge.save(data);
					window.close();
				} catch (error) {
					console.error('Failed to save:', error);
					showError('Failed to save task');
				}
			} else {
				// Fallback: try to communicate through parent window
				if (window.opener) {
					window.opener.postMessage({ type: 'quick-capture-save', data }, '*');
					window.close();
				} else {
					console.log('Would save:', data);
					showError('Communication bridge not available');
				}
			}
		}

		async function cancel() {
			if (bridge) {
				try {
					await bridge.cancel();
				} catch {}
			}
			window.close();
		}

		function showError(message) {
			const errorEl = document.getElementById('content-error');
			errorEl.textContent = message;
			errorEl.classList.add('show');
			setTimeout(() => {
				errorEl.classList.remove('show');
			}, 3000);
		}
		
		// Process content to ensure it's in task format
		function processTaskContent(content) {
			if (!content) return '';
			
			const lines = content.split('\\n');
			const processedLines = [];
			
			for (let line of lines) {
				if (!line.trim()) {
					processedLines.push(line);
					continue;
				}
				
				// Check if line starts with a task marker
				const taskRegex = /^[\\s]*[-*+\\d+.]\\s*(\\[[^\\]]*\\])?/;
				if (taskRegex.test(line)) {
					// Already a task or list item
					processedLines.push(line);
				} else {
					// Convert to task
					processedLines.push('- [ ] ' + line.trim());
				}
			}
			
			return processedLines.join('\\n');
		}
		
		// Parse natural language dates
		function parseNaturalDate(input) {
			if (!input) return '';
			
			const lower = input.toLowerCase().trim();
			const today = new Date();
			
			// Natural language patterns
			if (lower === 'today' || lower === 'tod') {
				return formatDate(today);
			}
			if (lower === 'tomorrow' || lower === 'tom' || lower === 'tmr') {
				const tomorrow = new Date(today);
				tomorrow.setDate(tomorrow.getDate() + 1);
				return formatDate(tomorrow);
			}
			if (lower === 'yesterday') {
				const yesterday = new Date(today);
				yesterday.setDate(yesterday.getDate() - 1);
				return formatDate(yesterday);
			}
			if (lower === 'next week' || lower === 'nw') {
				const nextWeek = new Date(today);
				nextWeek.setDate(nextWeek.getDate() + 7);
				return formatDate(nextWeek);
			}
			if (lower === 'next month' || lower === 'nm') {
				const nextMonth = new Date(today);
				nextMonth.setMonth(nextMonth.getMonth() + 1);
				return formatDate(nextMonth);
			}
			
			// Weekday names
			const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
			const weekdayIndex = weekdays.indexOf(lower);
			if (weekdayIndex >= 0) {
				const currentDay = today.getDay();
				let daysUntil = weekdayIndex - currentDay;
				if (daysUntil <= 0) daysUntil += 7; // Next occurrence
				const targetDate = new Date(today);
				targetDate.setDate(targetDate.getDate() + daysUntil);
				return formatDate(targetDate);
			}
			
			// "next" + weekday
			const nextWeekdayMatch = lower.match(/^next (\\w+)$/);
			if (nextWeekdayMatch) {
				const weekdayName = nextWeekdayMatch[1];
				const idx = weekdays.indexOf(weekdayName);
				if (idx >= 0) {
					const currentDay = today.getDay();
					let daysUntil = idx - currentDay;
					if (daysUntil <= 0) daysUntil += 7;
					daysUntil += 7; // "next" means skip this week
					const targetDate = new Date(today);
					targetDate.setDate(targetDate.getDate() + daysUntil);
					return formatDate(targetDate);
				}
			}
			
			// Match patterns like "in X days"
			const inDaysMatch = lower.match(/^in (\\d+) days?$/);
			if (inDaysMatch) {
				const days = parseInt(inDaysMatch[1]);
				const future = new Date(today);
				future.setDate(future.getDate() + days);
				return formatDate(future);
			}
			
			// Match patterns like "X days"
			const daysMatch = lower.match(/^(\\d+) days?$/);
			if (daysMatch) {
				const days = parseInt(daysMatch[1]);
				const future = new Date(today);
				future.setDate(future.getDate() + days);
				return formatDate(future);
			}
			
			// Try to parse as a regular date
			try {
				const parsed = new Date(input);
				if (!isNaN(parsed.getTime())) {
					return formatDate(parsed);
				}
			} catch {}
			
			// If not a natural language pattern, return original
			return input;
		}
		
		function formatDate(date) {
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			return year + '-' + month + '-' + day;
		}
	</script>
</body>
</html>`;
    }
    destroy() {
        this.closeCaptureWindow();
        this.cleanupIPCHandlers();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxlY3Ryb24tcXVpY2stY2FwdHVyZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImVsZWN0cm9uLXF1aWNrLWNhcHR1cmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBTyxNQUFNLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFFdkMsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzNDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFFbEMsTUFBTSxPQUFPLG9CQUFvQjtJQVloQyxZQUFZLE1BQTZCO1FBWGpDLGtCQUFhLEdBQVEsSUFBSSxDQUFDO1FBRzFCLGdCQUFXLEdBQVEsSUFBSSxDQUFDO1FBQ3hCLFlBQU8sR0FBUSxJQUFJLENBQUM7UUFDcEIsa0JBQWEsR0FBUSxJQUFJLENBQUM7UUFDbEMsOEVBQThFO1FBQ3RFLG1CQUFjLEdBQWtDLElBQUksQ0FBQztRQUNyRCxrQkFBYSxHQUFvQyxJQUFJLENBQUM7UUFDdEQsc0JBQWlCLEdBQVksS0FBSyxDQUFDO1FBRzFDLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQztRQUN0QixJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBRU8sV0FBVztRQUNsQixJQUFJO1lBQ0gsTUFBTSxRQUFRLEdBQ1osTUFBYyxDQUFDLFFBQVEsSUFBSyxVQUFrQixDQUFDLFFBQVEsQ0FBQztZQUMxRCxJQUFJLFFBQVE7Z0JBQUUsT0FBTyxRQUFRLENBQUM7WUFDOUIsTUFBTSxHQUFHLEdBQUksTUFBYyxDQUFDLE9BQU8sSUFBSyxVQUFrQixDQUFDLE9BQU8sQ0FBQztZQUNuRSxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7U0FDcEM7UUFBQyxXQUFNO1lBQ1As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K0JBQzFCLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTOzZCQUNoQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUztpQ0FDMUIsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVM7bUNBQzVCLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTO2tDQUMvQixNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUztvQkFDNUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVM7bUJBQy9CLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTO21CQUM5QixNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUzs7MkJBRXRCLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTOzBCQUMvQixNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUzs7Ozs7O0dBTXJELENBQUM7UUFFRixPQUFPOzs7Ozs7SUFNTCxPQUFPOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7UUFvdkJILENBQUM7SUFDUixDQUFDO0lBRU0sT0FBTztRQUNiLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBQzFCLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO0lBQzNCLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcCwgTm90aWNlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIi4uL2luZGV4XCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiLi4vdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgeyBtb21lbnQgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBFbGVjdHJvblF1aWNrQ2FwdHVyZSB7XHJcblx0cHJpdmF0ZSBjYXB0dXJlV2luZG93OiBhbnkgPSBudWxsO1xyXG5cdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblx0cHJpdmF0ZSBhcHA6IEFwcDtcclxuXHRwcml2YXRlIGlwY1JlbmRlcmVyOiBhbnkgPSBudWxsO1xyXG5cdHByaXZhdGUgaXBjTWFpbjogYW55ID0gbnVsbDtcclxuXHRwcml2YXRlIEJyb3dzZXJXaW5kb3c6IGFueSA9IG51bGw7XHJcblx0Ly8gcHJpdmF0ZSBvd25lcldpbmRvdzogYW55ID0gbnVsbDsgLy8gUmVtb3ZlZCAtIG5vIGxvbmdlciB1c2luZyBwYXJlbnQgd2luZG93XHJcblx0cHJpdmF0ZSBjYXB0dXJlUmVzb2x2ZTogKCh2YWx1ZTogYW55KSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgY2FwdHVyZVJlamVjdDogKChyZWFzb24/OiBhbnkpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBpc0Nsb3NpbmdOb3JtYWxseTogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbikge1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0XHR0aGlzLmFwcCA9IHBsdWdpbi5hcHA7XHJcblx0XHR0aGlzLmluaXRpYWxpemVFbGVjdHJvbigpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBnZXRFbGVjdHJvbigpOiBhbnkgfCBudWxsIHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IGluamVjdGVkID1cclxuXHRcdFx0XHQod2luZG93IGFzIGFueSkuZWxlY3Ryb24gfHwgKGdsb2JhbFRoaXMgYXMgYW55KS5lbGVjdHJvbjtcclxuXHRcdFx0aWYgKGluamVjdGVkKSByZXR1cm4gaW5qZWN0ZWQ7XHJcblx0XHRcdGNvbnN0IHJlcSA9ICh3aW5kb3cgYXMgYW55KS5yZXF1aXJlIHx8IChnbG9iYWxUaGlzIGFzIGFueSkucmVxdWlyZTtcclxuXHRcdFx0cmV0dXJuIHJlcSA/IHJlcShcImVsZWN0cm9uXCIpIDogbnVsbDtcclxuXHRcdH0gY2F0Y2gge1xyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaW5pdGlhbGl6ZUVsZWN0cm9uKCk6IGJvb2xlYW4ge1xyXG5cdFx0Y29uc3QgZWxlY3Ryb24gPSB0aGlzLmdldEVsZWN0cm9uKCk7XHJcblx0XHRpZiAoIWVsZWN0cm9uKSByZXR1cm4gZmFsc2U7XHJcblxyXG5cdFx0dGhpcy5Ccm93c2VyV2luZG93ID1cclxuXHRcdFx0ZWxlY3Ryb24ucmVtb3RlPy5Ccm93c2VyV2luZG93IHx8IGVsZWN0cm9uLkJyb3dzZXJXaW5kb3c7XHJcblx0XHR0aGlzLmlwY1JlbmRlcmVyID0gZWxlY3Ryb24uaXBjUmVuZGVyZXI7XHJcblx0XHR0aGlzLmlwY01haW4gPSBlbGVjdHJvbi5yZW1vdGU/LmlwY01haW4gfHwgZWxlY3Ryb24uaXBjTWFpbjtcclxuXHJcblx0XHQvLyBObyBsb25nZXIgZ2V0dGluZyBvd25lciB3aW5kb3cgc2luY2Ugd2UgZG9uJ3QgdXNlIHBhcmVudFxyXG5cclxuXHRcdHJldHVybiAhISh0aGlzLkJyb3dzZXJXaW5kb3cgJiYgdGhpcy5pcGNSZW5kZXJlcik7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgYXN5bmMgb3BlbkNhcHR1cmVXaW5kb3coKTogUHJvbWlzZTxhbnk+IHtcclxuXHRcdGlmICghdGhpcy5Ccm93c2VyV2luZG93KSB7XHJcblx0XHRcdG5ldyBOb3RpY2UodChcIkVsZWN0cm9uIG5vdCBhdmFpbGFibGUgZm9yIHF1aWNrIGNhcHR1cmVcIikpO1xyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBJZiB3aW5kb3cgYWxyZWFkeSBleGlzdHMsIGZvY3VzIGl0XHJcblx0XHRpZiAodGhpcy5jYXB0dXJlV2luZG93ICYmICF0aGlzLmNhcHR1cmVXaW5kb3cuaXNEZXN0cm95ZWQoKSkge1xyXG5cdFx0XHR0aGlzLmNhcHR1cmVXaW5kb3cuc2hvdygpO1xyXG5cdFx0XHR0aGlzLmNhcHR1cmVXaW5kb3cuZm9jdXMoKTtcclxuXHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuXHRcdFx0dGhpcy5jYXB0dXJlUmVzb2x2ZSA9IHJlc29sdmU7XHJcblx0XHRcdHRoaXMuY2FwdHVyZVJlamVjdCA9IHJlamVjdDtcclxuXHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Ly8gQ3JlYXRlIHdpbmRvdyB3aXRoIG9wdGltYWwgc2V0dGluZ3MgZm9yIHF1aWNrIGNhcHR1cmVcclxuXHRcdFx0XHR0aGlzLmNhcHR1cmVXaW5kb3cgPSBuZXcgdGhpcy5Ccm93c2VyV2luZG93KHtcclxuXHRcdFx0XHRcdHdpZHRoOiA2MDAsXHJcblx0XHRcdFx0XHRoZWlnaHQ6IDQwMCxcclxuXHRcdFx0XHRcdHVzZUNvbnRlbnRTaXplOiB0cnVlLCAvLyBVc2UgY29udGVudCBzaXplIGZvciBkaW1lbnNpb25zXHJcblx0XHRcdFx0XHRtaW5XaWR0aDogNDAwLFxyXG5cdFx0XHRcdFx0bWluSGVpZ2h0OiAyNTAsXHJcblx0XHRcdFx0XHQvLyBwYXJlbnQ6IHRoaXMub3duZXJXaW5kb3csIC8vIFJlbW92ZSBwYXJlbnQgdG8gYXZvaWQgYnJpbmdpbmcgbWFpbiB3aW5kb3cgdG8gZnJvbnRcclxuXHRcdFx0XHRcdG1vZGFsOiBmYWxzZSxcclxuXHRcdFx0XHRcdHNob3c6IGZhbHNlLFxyXG5cdFx0XHRcdFx0ZnJhbWU6IHRydWUsXHJcblx0XHRcdFx0XHRhdXRvSGlkZU1lbnVCYXI6IHRydWUsXHJcblx0XHRcdFx0XHRhbHdheXNPblRvcDogdHJ1ZSxcclxuXHRcdFx0XHRcdHJlc2l6YWJsZTogdHJ1ZSxcclxuXHRcdFx0XHRcdG1pbmltaXphYmxlOiBmYWxzZSxcclxuXHRcdFx0XHRcdG1heGltaXphYmxlOiBmYWxzZSxcclxuXHRcdFx0XHRcdGZ1bGxzY3JlZW5hYmxlOiBmYWxzZSxcclxuXHRcdFx0XHRcdHNraXBUYXNrYmFyOiB0cnVlLFxyXG5cdFx0XHRcdFx0dGl0bGU6IFwiUXVpY2sgQ2FwdHVyZSAtIFRhc2sgR2VuaXVzXCIsXHJcblx0XHRcdFx0XHRiYWNrZ3JvdW5kQ29sb3I6IHRoaXMuZ2V0QmFja2dyb3VuZENvbG9yKCksXHJcblx0XHRcdFx0XHR3ZWJQcmVmZXJlbmNlczoge1xyXG5cdFx0XHRcdFx0XHRub2RlSW50ZWdyYXRpb246IHRydWUsXHJcblx0XHRcdFx0XHRcdGNvbnRleHRJc29sYXRpb246IGZhbHNlLFxyXG5cdFx0XHRcdFx0XHR3ZWJTZWN1cml0eTogZmFsc2UsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyBHZW5lcmF0ZSBhbmQgbG9hZCB0aGUgSFRNTCBjb250ZW50XHJcblx0XHRcdFx0Y29uc3QgaHRtbCA9IHRoaXMuZ2VuZXJhdGVDYXB0dXJlSFRNTCgpO1xyXG5cdFx0XHRcdHRoaXMuY2FwdHVyZVdpbmRvdy5sb2FkVVJMKFxyXG5cdFx0XHRcdFx0YGRhdGE6dGV4dC9odG1sO2NoYXJzZXQ9dXRmLTgsJHtlbmNvZGVVUklDb21wb25lbnQoaHRtbCl9YFxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdC8vIFNldHVwIElQQyBoYW5kbGVyc1xyXG5cdFx0XHRcdHRoaXMuc2V0dXBJUENIYW5kbGVycygpO1xyXG5cclxuXHRcdFx0XHQvLyBIYW5kbGUgd2luZG93IGV2ZW50c1xyXG5cdFx0XHRcdHRoaXMuY2FwdHVyZVdpbmRvdy5vbmNlKFwicmVhZHktdG8tc2hvd1wiLCAoKSA9PiB7XHJcblx0XHRcdFx0XHQvLyBVc2Ugc2hvd0luYWN0aXZlIG9uIG1hY09TIHRvIGF2b2lkIGJyaW5naW5nIG1haW4gd2luZG93IHRvIGZyb250XHJcblx0XHRcdFx0XHRpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gXCJkYXJ3aW5cIiAmJiB0aGlzLmNhcHR1cmVXaW5kb3c/LnNob3dJbmFjdGl2ZSkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLmNhcHR1cmVXaW5kb3cuc2hvd0luYWN0aXZlKCk7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHR0aGlzLmNhcHR1cmVXaW5kb3c/LnNob3coKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdC8vIE9ubHkgZm9jdXMgd2hlbiBuZWNlc3NhcnkgZm9yIGtleWJvYXJkIGlucHV0XHJcblx0XHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5jYXB0dXJlV2luZG93Py5mb2N1cygpO1xyXG5cdFx0XHRcdFx0fSwgMTAwKTtcclxuXHRcdFx0XHRcdC8vIFNlbmQgaW5pdGlhbCBkYXRhIHRvIHdpbmRvd1xyXG5cdFx0XHRcdFx0dGhpcy5jYXB0dXJlV2luZG93LndlYkNvbnRlbnRzLmV4ZWN1dGVKYXZhU2NyaXB0KGBcclxuXHRcdFx0XHRcdFx0d2luZG93LnBvc3RNZXNzYWdlKHsgXHJcblx0XHRcdFx0XHRcdFx0dHlwZTogJ2luaXQnLCBcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nczogJHtKU09OLnN0cmluZ2lmeSh0aGlzLmdldFF1aWNrQ2FwdHVyZVNldHRpbmdzKCkpfVxyXG5cdFx0XHRcdFx0XHR9LCAnKicpO1xyXG5cdFx0XHRcdFx0YCk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIEF1dG8tYWRqdXN0IHdpbmRvdyBzaXplIHRvIGNvbnRlbnQgYWZ0ZXIgbG9hZGluZ1xyXG5cdFx0XHRcdHRoaXMuY2FwdHVyZVdpbmRvdy53ZWJDb250ZW50cy5vbmNlKFwiZGlkLWZpbmlzaC1sb2FkXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IHNpemUgPSBhd2FpdCB0aGlzLmNhcHR1cmVXaW5kb3c/LndlYkNvbnRlbnRzLmV4ZWN1dGVKYXZhU2NyaXB0KFxyXG5cdFx0XHRcdFx0XHRcdGAoe3c6ZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFdpZHRoLGg6ZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbEhlaWdodH0pYFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRpZiAoc2l6ZSAmJiB0aGlzLmNhcHR1cmVXaW5kb3cgJiYgIXRoaXMuY2FwdHVyZVdpbmRvdy5pc0Rlc3Ryb3llZCgpKSB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5jYXB0dXJlV2luZG93LnNldENvbnRlbnRTaXplKFxyXG5cdFx0XHRcdFx0XHRcdFx0TWF0aC5tYXgoNTAwLCBNYXRoLm1pbig4MDAsIHNpemUudykpLCBcclxuXHRcdFx0XHRcdFx0XHRcdE1hdGgubWF4KDMyMCwgTWF0aC5taW4oNjAwLCBzaXplLmgpKSwgXHJcblx0XHRcdFx0XHRcdFx0XHR0cnVlXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnQ291bGQgbm90IGF1dG8tYWRqdXN0IHdpbmRvdyBzaXplOicsIGUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHR0aGlzLmNhcHR1cmVXaW5kb3cub24oXCJjbG9zZWRcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5jYXB0dXJlV2luZG93ID0gbnVsbDtcclxuXHRcdFx0XHRcdHRoaXMuY2xlYW51cElQQ0hhbmRsZXJzKCk7XHJcblx0XHRcdFx0XHQvLyBPbmx5IHJlamVjdCBpZiBub3QgY2xvc2luZyBub3JtYWxseSAoZS5nLiwgdXNlciBjbGlja2VkIFggb3IgcHJlc3NlZCBFc2NhcGUpXHJcblx0XHRcdFx0XHRpZiAoIXRoaXMuaXNDbG9zaW5nTm9ybWFsbHkpIHtcclxuXHRcdFx0XHRcdFx0aWYgKHRoaXMuY2FwdHVyZVJlc29sdmUpIHtcclxuXHRcdFx0XHRcdFx0XHQvLyBSZXNvbHZlIHdpdGggbnVsbCB0byBpbmRpY2F0ZSB1c2VyIGNhbmNlbGxlZFxyXG5cdFx0XHRcdFx0XHRcdHRoaXMuY2FwdHVyZVJlc29sdmUobnVsbCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdC8vIFJlc2V0IHN0YXRlXHJcblx0XHRcdFx0XHR0aGlzLmNhcHR1cmVSZXNvbHZlID0gbnVsbDtcclxuXHRcdFx0XHRcdHRoaXMuY2FwdHVyZVJlamVjdCA9IG51bGw7XHJcblx0XHRcdFx0XHR0aGlzLmlzQ2xvc2luZ05vcm1hbGx5ID0gZmFsc2U7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gY3JlYXRlIGNhcHR1cmUgd2luZG93OlwiLCBlcnJvcik7XHJcblx0XHRcdFx0bmV3IE5vdGljZSh0KFwiRmFpbGVkIHRvIG9wZW4gcXVpY2sgY2FwdHVyZSB3aW5kb3dcIikpO1xyXG5cdFx0XHRcdHJlamVjdChlcnJvcik7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBzZXR1cElQQ0hhbmRsZXJzKCk6IHZvaWQge1xyXG5cdFx0aWYgKCF0aGlzLmNhcHR1cmVXaW5kb3cpIHJldHVybjtcclxuXHJcblx0XHRjb25zb2xlLmxvZyhcIltFbGVjdHJvblF1aWNrQ2FwdHVyZV0gU2V0dGluZyB1cCBJUEMgaGFuZGxlcnNcIik7XHJcblxyXG5cdFx0Ly8gVHJ5IHRvIGdldCBpcGNNYWluIGZvciBoYW5kbGluZyBtZXNzYWdlc1xyXG5cdFx0Y29uc3QgZWxlY3Ryb24gPSB0aGlzLmdldEVsZWN0cm9uKCk7XHJcblx0XHRjb25zdCBpcGNNYWluID0gZWxlY3Ryb24/LmlwY01haW4gfHwgZWxlY3Ryb24/LnJlbW90ZT8uaXBjTWFpbjtcclxuXHJcblx0XHRpZiAoaXBjTWFpbikge1xyXG5cdFx0XHQvLyBVc2UgaXBjTWFpbiBoYW5kbGVycyAocHJlZmVycmVkIG1ldGhvZClcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHQvLyBSZW1vdmUgZXhpc3RpbmcgaGFuZGxlcnMgaWYgYW55XHJcblx0XHRcdFx0aXBjTWFpbi5yZW1vdmVIYW5kbGVyKCdxdWljay1jYXB0dXJlLXNhdmUnKTtcclxuXHRcdFx0XHRpcGNNYWluLnJlbW92ZUhhbmRsZXIoJ3F1aWNrLWNhcHR1cmUtY2FuY2VsJyk7XHJcblx0XHRcdFx0aXBjTWFpbi5yZW1vdmVIYW5kbGVyKCdxdWljay1jYXB0dXJlLXJlcXVlc3QtZGF0YScpO1xyXG5cclxuXHRcdFx0XHQvLyBIYW5kbGUgc2F2ZVxyXG5cdFx0XHRcdGlwY01haW4uaGFuZGxlKCdxdWljay1jYXB0dXJlLXNhdmUnLCBhc3luYyAoZXZlbnQ6IGFueSwgZGF0YTogYW55KSA9PiB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIltFbGVjdHJvblF1aWNrQ2FwdHVyZV0gSVBDIHJlY2VpdmVkIHNhdmU6XCIsIGRhdGEpO1xyXG5cdFx0XHRcdFx0YXdhaXQgdGhpcy5oYW5kbGVTYXZlVGFzayhkYXRhKTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gSGFuZGxlIGNhbmNlbCAgXHJcblx0XHRcdFx0aXBjTWFpbi5oYW5kbGUoJ3F1aWNrLWNhcHR1cmUtY2FuY2VsJywgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXCJbRWxlY3Ryb25RdWlja0NhcHR1cmVdIElQQyByZWNlaXZlZCBjYW5jZWxcIik7XHJcblx0XHRcdFx0XHR0aGlzLmNsb3NlQ2FwdHVyZVdpbmRvdygpO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyBIYW5kbGUgZGF0YSByZXF1ZXN0c1xyXG5cdFx0XHRcdGlwY01haW4uaGFuZGxlKCdxdWljay1jYXB0dXJlLXJlcXVlc3QtZGF0YScsIGFzeW5jIChldmVudDogYW55LCB0eXBlOiBzdHJpbmcpID0+IHtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiW0VsZWN0cm9uUXVpY2tDYXB0dXJlXSBJUEMgcmVxdWVzdGluZyBkYXRhOlwiLCB0eXBlKTtcclxuXHRcdFx0XHRcdHJldHVybiBhd2FpdCB0aGlzLmdldERhdGFGb3JXaW5kb3codHlwZSk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdCh0aGlzIGFzIGFueSkuX2lwY0hhbmRsZXJzID0geyBpcGNNYWluLCByZWdpc3RlcmVkOiB0cnVlIH07XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXCJbRWxlY3Ryb25RdWlja0NhcHR1cmVdIElQQyBoYW5kbGVycyByZWdpc3RlcmVkIHdpdGggaXBjTWFpbi5oYW5kbGVcIik7XHJcblx0XHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXCJbRWxlY3Ryb25RdWlja0NhcHR1cmVdIEZhaWxlZCB0byBzZXQgdXAgaXBjTWFpbiBoYW5kbGVyczpcIiwgZSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBGYWxsYmFjazogTGlzdGVuIGZvciByZWd1bGFyIElQQyBtZXNzYWdlc1xyXG5cdFx0dGhpcy5jYXB0dXJlV2luZG93LndlYkNvbnRlbnRzLm9uKCdpcGMtbWVzc2FnZScsIGFzeW5jIChfZXZlbnQ6IGFueSwgY2hhbm5lbDogc3RyaW5nLCAuLi5hcmdzOiBhbnlbXSkgPT4ge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIltFbGVjdHJvblF1aWNrQ2FwdHVyZV0gUmVjZWl2ZWQgaXBjLW1lc3NhZ2U6XCIsIGNoYW5uZWwsIGFyZ3MpO1xyXG5cdFx0XHRpZiAoY2hhbm5lbCA9PT0gJ3F1aWNrLWNhcHR1cmUtc2F2ZScpIHtcclxuXHRcdFx0XHRhd2FpdCB0aGlzLmhhbmRsZVNhdmVUYXNrKGFyZ3NbMF0pO1xyXG5cdFx0XHR9IGVsc2UgaWYgKGNoYW5uZWwgPT09ICdxdWljay1jYXB0dXJlLWNhbmNlbCcpIHtcclxuXHRcdFx0XHR0aGlzLmNsb3NlQ2FwdHVyZVdpbmRvdygpO1xyXG5cdFx0XHR9IGVsc2UgaWYgKGNoYW5uZWwgPT09ICdxdWljay1jYXB0dXJlLXJlcXVlc3QtZGF0YScpIHtcclxuXHRcdFx0XHRjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5nZXREYXRhRm9yV2luZG93KGFyZ3NbMF0pO1xyXG5cdFx0XHRcdC8vIFNlbmQgZGF0YSBiYWNrIHRvIHdpbmRvd1xyXG5cdFx0XHRcdHRoaXMuY2FwdHVyZVdpbmRvdz8ud2ViQ29udGVudHM/LmV4ZWN1dGVKYXZhU2NyaXB0KGBcclxuXHRcdFx0XHRcdHdpbmRvdy5yZWNlaXZlU3VnZ2VzdGlvbnMoJyR7YXJnc1swXX0nLCAke0pTT04uc3RyaW5naWZ5KGRhdGEpfSk7XHJcblx0XHRcdFx0YCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEFsc28gbGlzdGVuIGZvciBkaXJlY3QgY2hhbm5lbCBtZXNzYWdlcyAoZm9yIG5ld2VyIEVsZWN0cm9uIHZlcnNpb25zKVxyXG5cdFx0aWYgKGlwY01haW4pIHtcclxuXHRcdFx0aXBjTWFpbi5vbigncXVpY2stY2FwdHVyZS1zYXZlJywgYXN5bmMgKGV2ZW50OiBhbnksIGRhdGE6IGFueSkgPT4ge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiW0VsZWN0cm9uUXVpY2tDYXB0dXJlXSBEaXJlY3QgSVBDIHJlY2VpdmVkIHNhdmU6XCIsIGRhdGEpO1xyXG5cdFx0XHRcdGF3YWl0IHRoaXMuaGFuZGxlU2F2ZVRhc2soZGF0YSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0aXBjTWFpbi5vbigncXVpY2stY2FwdHVyZS1jYW5jZWwnLCAoKSA9PiB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXCJbRWxlY3Ryb25RdWlja0NhcHR1cmVdIERpcmVjdCBJUEMgcmVjZWl2ZWQgY2FuY2VsXCIpO1xyXG5cdFx0XHRcdHRoaXMuY2xvc2VDYXB0dXJlV2luZG93KCk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0aXBjTWFpbi5vbigncXVpY2stY2FwdHVyZS1yZXF1ZXN0LWRhdGEnLCBhc3luYyAoZXZlbnQ6IGFueSwgdHlwZTogc3RyaW5nKSA9PiB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXCJbRWxlY3Ryb25RdWlja0NhcHR1cmVdIERpcmVjdCBJUEMgcmVxdWVzdGluZyBkYXRhOlwiLCB0eXBlKTtcclxuXHRcdFx0XHRjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5nZXREYXRhRm9yV2luZG93KHR5cGUpO1xyXG5cdFx0XHRcdGV2ZW50LnJlcGx5KCdxdWljay1jYXB0dXJlLWRhdGEtcmVzcG9uc2UnLCB0eXBlLCBkYXRhKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQodGhpcyBhcyBhbnkpLl9pcGNIYW5kbGVycyA9IHsgaXBjTWFpbiwgcmVnaXN0ZXJlZDogdHJ1ZSB9O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gTm90IGN1cnJlbnRseSB1c2VkIGJ1dCBrZXB0IGZvciBwb3RlbnRpYWwgZnV0dXJlIHVzZVxyXG5cdHByaXZhdGUgaW5qZWN0V2luZG93SGFuZGxlcnMoKTogdm9pZCB7XHJcblx0XHQvLyBJbmplY3QgaGFuZGxlcnMgZGlyZWN0bHkgaW50byB0aGUgd2luZG93IGlmIElQQyBpcyBub3QgYXZhaWxhYmxlXHJcblx0XHRpZiAoIXRoaXMuY2FwdHVyZVdpbmRvdykgcmV0dXJuO1xyXG5cclxuXHRcdGNvbnN0IGhhbmRsZVNhdmUgPSBgXHJcblx0XHRcdHdpbmRvdy5oYW5kbGVRdWlja0NhcHR1cmVTYXZlID0gYXN5bmMgKGRhdGEpID0+IHtcclxuXHRcdFx0XHRyZXR1cm4gJHtKU09OLnN0cmluZ2lmeSh7IGhhbmRsZXI6ICdzYXZlJyB9KX07XHJcblx0XHRcdH07XHJcblx0XHRgO1xyXG5cclxuXHRcdGNvbnN0IGhhbmRsZUNhbmNlbCA9IGBcclxuXHRcdFx0d2luZG93LmhhbmRsZVF1aWNrQ2FwdHVyZUNhbmNlbCA9ICgpID0+IHtcclxuXHRcdFx0XHR3aW5kb3cuY2xvc2UoKTtcclxuXHRcdFx0fTtcclxuXHRcdGA7XHJcblxyXG5cdFx0dGhpcy5jYXB0dXJlV2luZG93LndlYkNvbnRlbnRzLmV4ZWN1dGVKYXZhU2NyaXB0KGhhbmRsZVNhdmUpO1xyXG5cdFx0dGhpcy5jYXB0dXJlV2luZG93LndlYkNvbnRlbnRzLmV4ZWN1dGVKYXZhU2NyaXB0KGhhbmRsZUNhbmNlbCk7XHJcblxyXG5cdFx0Ly8gU2V0IHVwIG1lc3NhZ2UgcGFzc2luZyB0aHJvdWdoIHdpbmRvdy5wb3N0TWVzc2FnZVxyXG5cdFx0dGhpcy5jYXB0dXJlV2luZG93LndlYkNvbnRlbnRzLm9uKCdpcGMtbWVzc2FnZScsIGFzeW5jIChfZXZlbnQ6IGFueSwgY2hhbm5lbDogc3RyaW5nLCAuLi5hcmdzOiBhbnlbXSkgPT4ge1xyXG5cdFx0XHRpZiAoY2hhbm5lbCA9PT0gJ3F1aWNrLWNhcHR1cmUtc2F2ZScpIHtcclxuXHRcdFx0XHRhd2FpdCB0aGlzLmhhbmRsZVNhdmVUYXNrKGFyZ3NbMF0pO1xyXG5cdFx0XHR9IGVsc2UgaWYgKGNoYW5uZWwgPT09ICdxdWljay1jYXB0dXJlLWNhbmNlbCcpIHtcclxuXHRcdFx0XHR0aGlzLmNsb3NlQ2FwdHVyZVdpbmRvdygpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY2xlYW51cElQQ0hhbmRsZXJzKCk6IHZvaWQge1xyXG5cdFx0aWYgKCEodGhpcyBhcyBhbnkpLl9pcGNIYW5kbGVycykgcmV0dXJuO1xyXG5cclxuXHRcdGNvbnN0IHsgaXBjTWFpbiB9ID0gKHRoaXMgYXMgYW55KS5faXBjSGFuZGxlcnM7XHJcblx0XHRpZiAoaXBjTWFpbikge1xyXG5cdFx0XHQvLyBSZW1vdmUgSVBDIGhhbmRsZXJzXHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Ly8gUmVtb3ZlIGhhbmRsZS1iYXNlZCBoYW5kbGVyc1xyXG5cdFx0XHRcdGlwY01haW4ucmVtb3ZlSGFuZGxlcihcInF1aWNrLWNhcHR1cmUtc2F2ZVwiKTtcclxuXHRcdFx0XHRpcGNNYWluLnJlbW92ZUhhbmRsZXIoXCJxdWljay1jYXB0dXJlLWNhbmNlbFwiKTtcclxuXHRcdFx0XHRpcGNNYWluLnJlbW92ZUhhbmRsZXIoXCJxdWljay1jYXB0dXJlLXJlcXVlc3QtZGF0YVwiKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHQvLyBSZW1vdmUgZXZlbnQtYmFzZWQgbGlzdGVuZXJzXHJcblx0XHRcdFx0aXBjTWFpbi5yZW1vdmVBbGxMaXN0ZW5lcnMoXCJxdWljay1jYXB0dXJlLXNhdmVcIik7XHJcblx0XHRcdFx0aXBjTWFpbi5yZW1vdmVBbGxMaXN0ZW5lcnMoXCJxdWljay1jYXB0dXJlLWNhbmNlbFwiKTtcclxuXHRcdFx0XHRpcGNNYWluLnJlbW92ZUFsbExpc3RlbmVycyhcInF1aWNrLWNhcHR1cmUtcmVxdWVzdC1kYXRhXCIpO1xyXG5cdFx0XHR9IGNhdGNoIHtcclxuXHRcdFx0XHQvLyBJZ25vcmUgZXJyb3JzIGR1cmluZyBjbGVhbnVwXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRkZWxldGUgKHRoaXMgYXMgYW55KS5faXBjSGFuZGxlcnM7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIGhhbmRsZVNhdmVUYXNrKGRhdGE6IGFueSk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJbRWxlY3Ryb25RdWlja0NhcHR1cmVdIGhhbmRsZVNhdmVUYXNrIGNhbGxlZCB3aXRoIGRhdGE6XCIsIGRhdGEpO1xyXG5cdFx0XHQvLyBQYXJzZSB0aGUgdGFzayBjb250ZW50IGFuZCBtZXRhZGF0YVxyXG5cdFx0XHRjb25zdCB7IGNvbnRlbnQsIHByb2plY3QsIGNvbnRleHQsIGR1ZURhdGUsIHByaW9yaXR5LCB0YWdzIH0gPSBkYXRhO1xyXG5cclxuXHRcdFx0aWYgKCFjb250ZW50Py50cmltKCkpIHtcclxuXHRcdFx0XHR0aGlzLmNhcHR1cmVXaW5kb3c/LndlYkNvbnRlbnRzPy5leGVjdXRlSmF2YVNjcmlwdChgXHJcblx0XHRcdFx0XHRzaG93RXJyb3IoJ1Rhc2sgY29udGVudCBjYW5ub3QgYmUgZW1wdHknKTtcclxuXHRcdFx0XHRgKTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFByZXBhcmUgdGFzayBjcmVhdGlvbiBhcmd1bWVudHNcclxuXHRcdFx0Y29uc3QgdGFza0FyZ3M6IGFueSA9IHtcclxuXHRcdFx0XHRjb250ZW50OiBjb250ZW50LnRyaW0oKSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIEFkZCBvcHRpb25hbCBtZXRhZGF0YVxyXG5cdFx0XHRpZiAocHJvamVjdCkgdGFza0FyZ3MucHJvamVjdCA9IHByb2plY3Q7XHJcblx0XHRcdGlmIChjb250ZXh0KSB0YXNrQXJncy5jb250ZXh0ID0gY29udGV4dDtcclxuXHRcdFx0aWYgKHByaW9yaXR5KSB0YXNrQXJncy5wcmlvcml0eSA9IHByaW9yaXR5O1xyXG5cdFx0XHRpZiAodGFncyAmJiB0YWdzLmxlbmd0aCA+IDApIHRhc2tBcmdzLnRhZ3MgPSB0YWdzO1xyXG5cclxuXHRcdFx0Ly8gUGFyc2UgZHVlIGRhdGUgaWYgcHJvdmlkZWRcclxuXHRcdFx0aWYgKGR1ZURhdGUpIHtcclxuXHRcdFx0XHRjb25zdCBwYXJzZWREYXRlID0gdGhpcy5wYXJzZUR1ZURhdGUoZHVlRGF0ZSk7XHJcblx0XHRcdFx0aWYgKHBhcnNlZERhdGUpIHtcclxuXHRcdFx0XHRcdHRhc2tBcmdzLmR1ZURhdGUgPSBwYXJzZWREYXRlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIHRoZSB0YXNrIHVzaW5nIHRoZSB3cml0ZSBBUElcclxuXHRcdFx0Y29uc29sZS5sb2coXCJbRWxlY3Ryb25RdWlja0NhcHR1cmVdIENhbGxpbmcgY3JlYXRlVGFzayB3aXRoIGFyZ3M6XCIsIHRhc2tBcmdzKTtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5jcmVhdGVUYXNrKHRhc2tBcmdzKTtcclxuXHJcblx0XHRcdGlmIChyZXN1bHQuc3VjY2Vzcykge1xyXG5cdFx0XHRcdG5ldyBOb3RpY2UodChcIlRhc2sgY2FwdHVyZWQgc3VjY2Vzc2Z1bGx5XCIpKTtcclxuXHRcdFx0XHQvLyBNYXJrIGFzIG5vcm1hbCBjbG9zaW5nIGJlZm9yZSBjbG9zaW5nIHRoZSB3aW5kb3dcclxuXHRcdFx0XHR0aGlzLmlzQ2xvc2luZ05vcm1hbGx5ID0gdHJ1ZTtcclxuXHRcdFx0XHRpZiAodGhpcy5jYXB0dXJlUmVzb2x2ZSkge1xyXG5cdFx0XHRcdFx0dGhpcy5jYXB0dXJlUmVzb2x2ZShyZXN1bHQudGFzayk7XHJcblx0XHRcdFx0XHR0aGlzLmNhcHR1cmVSZXNvbHZlID0gbnVsbDtcclxuXHRcdFx0XHRcdHRoaXMuY2FwdHVyZVJlamVjdCA9IG51bGw7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHRoaXMuY2xvc2VDYXB0dXJlV2luZG93KCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKHJlc3VsdC5lcnJvciB8fCBcIkZhaWxlZCB0byBjcmVhdGUgdGFza1wiKTtcclxuXHRcdFx0fVxyXG5cdFx0fSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIHNhdmUgdGFzazpcIiwgZXJyb3IpO1xyXG5cdFx0XHRjb25zdCBlcnJvck1zZyA9IGVycm9yLm1lc3NhZ2UgfHwgXCJGYWlsZWQgdG8gc2F2ZSB0YXNrXCI7XHJcblx0XHRcdHRoaXMuY2FwdHVyZVdpbmRvdz8ud2ViQ29udGVudHM/LmV4ZWN1dGVKYXZhU2NyaXB0KGBcclxuXHRcdFx0XHRzaG93RXJyb3IoJyR7ZXJyb3JNc2cucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpfScpO1xyXG5cdFx0XHRgKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgY3JlYXRlVGFzayhhcmdzOiBhbnkpOiBQcm9taXNlPGFueT4ge1xyXG5cdFx0Ly8gVXNlIHRoZSBwbHVnaW4ncyB3cml0ZSBBUEkgdG8gY3JlYXRlIHRoZSB0YXNrXHJcblx0XHRpZiAoIXRoaXMucGx1Z2luLndyaXRlQVBJKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJbRWxlY3Ryb25RdWlja0NhcHR1cmVdIFdyaXRlQVBJIG5vdCBhdmFpbGFibGVcIik7XHJcblx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJXcml0ZSBBUEkgbm90IGF2YWlsYWJsZVwiIH07XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc29sZS5sb2coXCJbRWxlY3Ryb25RdWlja0NhcHR1cmVdIENyZWF0aW5nIHRhc2sgd2l0aCBhcmdzOlwiLCBhcmdzKTtcclxuXHJcblx0XHQvLyBEZXRlcm1pbmUgdGFyZ2V0IGJhc2VkIG9uIHF1aWNrIGNhcHR1cmUgc2V0dGluZ3NcclxuXHRcdGNvbnN0IHFjID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlO1xyXG5cdFx0Y29uc3QgdGFyZ2V0VHlwZSA9IHFjPy50YXJnZXRUeXBlIHx8IFwiZGFpbHktbm90ZVwiO1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdGxldCByZXN1bHQ7XHJcblx0XHRcdGlmICh0YXJnZXRUeXBlID09PSBcImRhaWx5LW5vdGVcIikge1xyXG5cdFx0XHRcdC8vIENyZWF0ZSBpbiBkYWlseSBub3RlXHJcblx0XHRcdFx0Y29uc29sZS5sb2coXCJbRWxlY3Ryb25RdWlja0NhcHR1cmVdIENyZWF0aW5nIHRhc2sgaW4gZGFpbHkgbm90ZVwiKTtcclxuXHRcdFx0XHRyZXN1bHQgPSBhd2FpdCB0aGlzLnBsdWdpbi53cml0ZUFQSS5jcmVhdGVUYXNrSW5EYWlseU5vdGUoYXJncyk7XHJcblx0XHRcdH0gZWxzZSBpZiAodGFyZ2V0VHlwZSA9PT0gXCJmaXhlZFwiICYmIHFjPy50YXJnZXRGaWxlKSB7XHJcblx0XHRcdFx0Ly8gQ3JlYXRlIGluIGZpeGVkIGZpbGVcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcIltFbGVjdHJvblF1aWNrQ2FwdHVyZV0gQ3JlYXRpbmcgdGFzayBpbiBmaXhlZCBmaWxlOlwiLCBxYy50YXJnZXRGaWxlKTtcclxuXHRcdFx0XHRhcmdzLmZpbGVQYXRoID0gcWMudGFyZ2V0RmlsZTtcclxuXHRcdFx0XHRyZXN1bHQgPSBhd2FpdCB0aGlzLnBsdWdpbi53cml0ZUFQSS5jcmVhdGVUYXNrKGFyZ3MpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIERlZmF1bHQgdG8gZGFpbHkgbm90ZVxyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiW0VsZWN0cm9uUXVpY2tDYXB0dXJlXSBDcmVhdGluZyB0YXNrIGluIGRhaWx5IG5vdGUgKGRlZmF1bHQpXCIpO1xyXG5cdFx0XHRcdHJlc3VsdCA9IGF3YWl0IHRoaXMucGx1Z2luLndyaXRlQVBJLmNyZWF0ZVRhc2tJbkRhaWx5Tm90ZShhcmdzKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRjb25zb2xlLmxvZyhcIltFbGVjdHJvblF1aWNrQ2FwdHVyZV0gVGFzayBjcmVhdGlvbiByZXN1bHQ6XCIsIHJlc3VsdCk7XHJcblx0XHRcdHJldHVybiByZXN1bHQ7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiW0VsZWN0cm9uUXVpY2tDYXB0dXJlXSBFcnJvciBjcmVhdGluZyB0YXNrOlwiLCBlcnJvcik7XHJcblx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB8fCBcIkZhaWxlZCB0byBjcmVhdGUgdGFza1wiIH07XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHBhcnNlRHVlRGF0ZShkYXRlU3RyOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xyXG5cdFx0aWYgKCFkYXRlU3RyKSByZXR1cm4gdW5kZWZpbmVkO1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdC8vIFRyeSBuYXR1cmFsIGxhbmd1YWdlIHBhcnNpbmcgZmlyc3RcclxuXHRcdFx0Y29uc3QgbmF0dXJhbFBhcnNlcnMgPSBbXHJcblx0XHRcdFx0eyBwYXR0ZXJuOiAvXnRvZGF5JC9pLCBvZmZzZXQ6IDAgfSxcclxuXHRcdFx0XHR7IHBhdHRlcm46IC9edG9tb3Jyb3ckL2ksIG9mZnNldDogMSB9LFxyXG5cdFx0XHRcdHsgcGF0dGVybjogL15uZXh0IHdlZWskL2ksIG9mZnNldDogNyB9LFxyXG5cdFx0XHRcdHsgcGF0dGVybjogL15pbiAoXFxkKykgZGF5cz8kL2ksIG9mZnNldE1hdGNoOiAxIH0sXHJcblx0XHRcdF07XHJcblxyXG5cdFx0XHRmb3IgKGNvbnN0IHBhcnNlciBvZiBuYXR1cmFsUGFyc2Vycykge1xyXG5cdFx0XHRcdGNvbnN0IG1hdGNoID0gZGF0ZVN0ci5tYXRjaChwYXJzZXIucGF0dGVybik7XHJcblx0XHRcdFx0aWYgKG1hdGNoKSB7XHJcblx0XHRcdFx0XHRjb25zdCBvZmZzZXQgPSBwYXJzZXIub2Zmc2V0TWF0Y2ggXHJcblx0XHRcdFx0XHRcdD8gcGFyc2VJbnQobWF0Y2hbcGFyc2VyLm9mZnNldE1hdGNoXSkgXHJcblx0XHRcdFx0XHRcdDogcGFyc2VyLm9mZnNldDtcclxuXHRcdFx0XHRcdGNvbnN0IGRhdGUgPSBtb21lbnQoKS5hZGQob2Zmc2V0LCAnZGF5cycpO1xyXG5cdFx0XHRcdFx0cmV0dXJuIGRhdGUuZm9ybWF0KCdZWVlZLU1NLUREJyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBUcnkgcGFyc2luZyBhcyBkYXRlXHJcblx0XHRcdGNvbnN0IHBhcnNlZCA9IG1vbWVudChkYXRlU3RyKTtcclxuXHRcdFx0aWYgKHBhcnNlZC5pc1ZhbGlkKCkpIHtcclxuXHRcdFx0XHRyZXR1cm4gcGFyc2VkLmZvcm1hdCgnWVlZWS1NTS1ERCcpO1xyXG5cdFx0XHR9XHJcblx0XHR9IGNhdGNoIHtcclxuXHRcdFx0Ly8gSWdub3JlIHBhcnNpbmcgZXJyb3JzXHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgZ2V0RGF0YUZvcldpbmRvdyh0eXBlOiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xyXG5cdFx0c3dpdGNoICh0eXBlKSB7XHJcblx0XHRcdGNhc2UgXCJwcm9qZWN0c1wiOlxyXG5cdFx0XHRcdHJldHVybiBhd2FpdCB0aGlzLmdldFByb2plY3RzKCk7XHJcblx0XHRcdGNhc2UgXCJjb250ZXh0c1wiOlxyXG5cdFx0XHRcdHJldHVybiBhd2FpdCB0aGlzLmdldENvbnRleHRzKCk7XHJcblx0XHRcdGNhc2UgXCJ0YWdzXCI6XHJcblx0XHRcdFx0cmV0dXJuIGF3YWl0IHRoaXMuZ2V0VGFncygpO1xyXG5cdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdHJldHVybiBbXTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgZ2V0UHJvamVjdHMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgcXVlcnlBUEkgPSAodGhpcy5wbHVnaW4gYXMgYW55KS5kYXRhZmxvd09yY2hlc3RyYXRvcj8uZ2V0UXVlcnlBUEk/LigpO1xyXG5cdFx0XHRpZiAoIXF1ZXJ5QVBJKSByZXR1cm4gW107XHJcblx0XHRcdGNvbnN0IGFsbFRhc2tzID0gYXdhaXQgcXVlcnlBUEkuZ2V0QWxsVGFza3MoKTtcclxuXHRcdFx0Y29uc3QgcHJvamVjdHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuXHRcdFx0Zm9yIChjb25zdCB0YXNrIG9mIGFsbFRhc2tzKSB7XHJcblx0XHRcdFx0aWYgKHRhc2subWV0YWRhdGE/LnByb2plY3QpIHtcclxuXHRcdFx0XHRcdHByb2plY3RzLmFkZCh0YXNrLm1ldGFkYXRhLnByb2plY3QpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gQXJyYXkuZnJvbShwcm9qZWN0cykuc29ydCgpO1xyXG5cdFx0fSBjYXRjaCB7XHJcblx0XHRcdHJldHVybiBbXTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgZ2V0Q29udGV4dHMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgcXVlcnlBUEkgPSAodGhpcy5wbHVnaW4gYXMgYW55KS5kYXRhZmxvd09yY2hlc3RyYXRvcj8uZ2V0UXVlcnlBUEk/LigpO1xyXG5cdFx0XHRpZiAoIXF1ZXJ5QVBJKSByZXR1cm4gW107XHJcblx0XHRcdGNvbnN0IGFsbFRhc2tzID0gYXdhaXQgcXVlcnlBUEkuZ2V0QWxsVGFza3MoKTtcclxuXHRcdFx0Y29uc3QgY29udGV4dHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuXHRcdFx0Zm9yIChjb25zdCB0YXNrIG9mIGFsbFRhc2tzKSB7XHJcblx0XHRcdFx0aWYgKHRhc2subWV0YWRhdGE/LmNvbnRleHQpIHtcclxuXHRcdFx0XHRcdGNvbnRleHRzLmFkZCh0YXNrLm1ldGFkYXRhLmNvbnRleHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gQXJyYXkuZnJvbShjb250ZXh0cykuc29ydCgpO1xyXG5cdFx0fSBjYXRjaCB7XHJcblx0XHRcdHJldHVybiBbXTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgZ2V0VGFncygpOiBQcm9taXNlPHN0cmluZ1tdPiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBxdWVyeUFQSSA9ICh0aGlzLnBsdWdpbiBhcyBhbnkpLmRhdGFmbG93T3JjaGVzdHJhdG9yPy5nZXRRdWVyeUFQST8uKCk7XHJcblx0XHRcdGlmICghcXVlcnlBUEkpIHJldHVybiBbXTtcclxuXHRcdFx0Y29uc3QgYWxsVGFza3MgPSBhd2FpdCBxdWVyeUFQSS5nZXRBbGxUYXNrcygpO1xyXG5cdFx0XHRjb25zdCB0YWdzID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcblx0XHRcdGZvciAoY29uc3QgdGFzayBvZiBhbGxUYXNrcykge1xyXG5cdFx0XHRcdGlmICh0YXNrLm1ldGFkYXRhPy50YWdzICYmIEFycmF5LmlzQXJyYXkodGFzay5tZXRhZGF0YS50YWdzKSkge1xyXG5cdFx0XHRcdFx0dGFzay5tZXRhZGF0YS50YWdzLmZvckVhY2goKHRhZzogc3RyaW5nKSA9PiB0YWdzLmFkZCh0YWcpKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIEFycmF5LmZyb20odGFncykuc29ydCgpO1xyXG5cdFx0fSBjYXRjaCB7XHJcblx0XHRcdHJldHVybiBbXTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY2xvc2VDYXB0dXJlV2luZG93KCk6IHZvaWQge1xyXG5cdFx0aWYgKHRoaXMuY2FwdHVyZVdpbmRvdyAmJiAhdGhpcy5jYXB0dXJlV2luZG93LmlzRGVzdHJveWVkKCkpIHtcclxuXHRcdFx0Ly8gU2V0IGZsYWcgaWYgbm90IGFscmVhZHkgc2V0IChmb3IgY2FuY2VsIG9wZXJhdGlvbnMpXHJcblx0XHRcdGlmICghdGhpcy5pc0Nsb3NpbmdOb3JtYWxseSkge1xyXG5cdFx0XHRcdHRoaXMuaXNDbG9zaW5nTm9ybWFsbHkgPSB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHRcdHRoaXMuY2FwdHVyZVdpbmRvdy5jbG9zZSgpO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5jYXB0dXJlV2luZG93ID0gbnVsbDtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZ2V0QmFja2dyb3VuZENvbG9yKCk6IHN0cmluZyB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBpc0RhcmsgPSB0aGlzLmlzRGFya1RoZW1lKCk7XHJcblx0XHRcdHJldHVybiBpc0RhcmsgPyBcIiMyMDIwMjBcIiA6IFwiI2ZmZmZmZlwiO1xyXG5cdFx0fSBjYXRjaCB7XHJcblx0XHRcdHJldHVybiBcIiNmZmZmZmZcIjtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaXNEYXJrVGhlbWUoKTogYm9vbGVhbiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBlbGVjdHJvbiA9IHRoaXMuZ2V0RWxlY3Ryb24oKTtcclxuXHRcdFx0Y29uc3QgbmF0aXZlVGhlbWUgPVxyXG5cdFx0XHRcdGVsZWN0cm9uPy5uYXRpdmVUaGVtZSB8fCBlbGVjdHJvbj8ucmVtb3RlPy5uYXRpdmVUaGVtZTtcclxuXHRcdFx0aWYgKG5hdGl2ZVRoZW1lICYmIHR5cGVvZiBuYXRpdmVUaGVtZS5zaG91bGRVc2VEYXJrQ29sb3JzID09PSBcImJvb2xlYW5cIikge1xyXG5cdFx0XHRcdHJldHVybiBuYXRpdmVUaGVtZS5zaG91bGRVc2VEYXJrQ29sb3JzO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiB3aW5kb3cubWF0Y2hNZWRpYShcIihwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaylcIikubWF0Y2hlcztcclxuXHRcdH0gY2F0Y2gge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldFF1aWNrQ2FwdHVyZVNldHRpbmdzKCk6IGFueSB7XHJcblx0XHRjb25zdCBxYyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnF1aWNrQ2FwdHVyZSB8fCB7fTtcclxuXHRcdC8vIFJldHVybiBhbGwgbWV0YWRhdGEgZmllbGRzIGFzIHZpc2libGUgYnkgZGVmYXVsdFxyXG5cdFx0Ly8gc2luY2UgdGhlcmUgYXJlIG5vIHNwZWNpZmljIHNob3cvaGlkZSBzZXR0aW5ncyBmb3IgdGhlbVxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0dGFyZ2V0VHlwZTogcWMudGFyZ2V0VHlwZSB8fCBcImRhaWx5LW5vdGVcIixcclxuXHRcdFx0c2hvd1Byb2plY3Q6IHRydWUsXHJcblx0XHRcdHNob3dDb250ZXh0OiB0cnVlLFxyXG5cdFx0XHRzaG93RHVlRGF0ZTogdHJ1ZSxcclxuXHRcdFx0c2hvd1ByaW9yaXR5OiB0cnVlLFxyXG5cdFx0XHRzaG93VGFnczogdHJ1ZSxcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdlbmVyYXRlQ2FwdHVyZUhUTUwoKTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IGlzRGFyayA9IHRoaXMuaXNEYXJrVGhlbWUoKTtcclxuXHRcdFxyXG5cdFx0Ly8gRGVmaW5lIE9ic2lkaWFuLWxpa2UgQ1NTIHZhcmlhYmxlcyBmb3IgY29uc2lzdGVudCBzdHlsaW5nXHJcblx0XHRjb25zdCBjc3NWYXJzID0gYFxyXG5cdFx0OnJvb3Qge1xyXG5cdFx0XHQtLWJhY2tncm91bmQtcHJpbWFyeTogJHtpc0RhcmsgPyBcIiMyMDIwMjBcIiA6IFwiI2ZmZmZmZlwifTtcclxuXHRcdFx0LS1iYWNrZ3JvdW5kLXByaW1hcnktYWx0OiAke2lzRGFyayA/IFwiIzFhMWExYVwiIDogXCIjZmFmYWZhXCJ9O1xyXG5cdFx0XHQtLWJhY2tncm91bmQtc2Vjb25kYXJ5OiAke2lzRGFyayA/IFwiIzJhMmEyYVwiIDogXCIjZjVmNWY1XCJ9O1xyXG5cdFx0XHQtLWJhY2tncm91bmQtc2Vjb25kYXJ5LWFsdDogJHtpc0RhcmsgPyBcIiMzMzMzMzNcIiA6IFwiI2UzZTNlM1wifTtcclxuXHRcdFx0LS1iYWNrZ3JvdW5kLW1vZGlmaWVyLWJvcmRlcjogJHtpc0RhcmsgPyBcIiM0MDQwNDBcIiA6IFwiI2QwZDBkMFwifTtcclxuXHRcdFx0LS1iYWNrZ3JvdW5kLW1vZGlmaWVyLWhvdmVyOiAke2lzRGFyayA/IFwiIzM1MzUzNVwiIDogXCIjZWJlYmViXCJ9O1xyXG5cdFx0XHQtLXRleHQtbm9ybWFsOiAke2lzRGFyayA/IFwiI2UwZTBlMFwiIDogXCIjMzMzMzMzXCJ9O1xyXG5cdFx0XHQtLXRleHQtbXV0ZWQ6ICR7aXNEYXJrID8gXCIjYTBhMGEwXCIgOiBcIiM2NjY2NjZcIn07XHJcblx0XHRcdC0tdGV4dC1mYWludDogJHtpc0RhcmsgPyBcIiM4MDgwODBcIiA6IFwiIzk5OTk5OVwifTtcclxuXHRcdFx0LS10ZXh0LW9uLWFjY2VudDogI2ZmZmZmZjtcclxuXHRcdFx0LS1pbnRlcmFjdGl2ZS1ub3JtYWw6ICR7aXNEYXJrID8gXCIjMmEyYTJhXCIgOiBcIiNmNWY1ZjVcIn07XHJcblx0XHRcdC0taW50ZXJhY3RpdmUtaG92ZXI6ICR7aXNEYXJrID8gXCIjM2EzYTNhXCIgOiBcIiNlOGU4ZThcIn07XHJcblx0XHRcdC0taW50ZXJhY3RpdmUtYWNjZW50OiAjN2MzYWVkO1xyXG5cdFx0XHQtLWludGVyYWN0aXZlLWFjY2VudC1ob3ZlcjogIzZkMjhkOTtcclxuXHRcdFx0LS1yYWRpdXMtczogNnB4O1xyXG5cdFx0XHQtLXJhZGl1cy1tOiA4cHg7XHJcblx0XHR9XHJcblx0XHRgO1xyXG5cclxuXHRcdHJldHVybiBgPCFET0NUWVBFIGh0bWw+XHJcbjxodG1sPlxyXG48aGVhZD5cclxuXHQ8bWV0YSBjaGFyc2V0PVwiVVRGLThcIj5cclxuXHQ8dGl0bGU+UXVpY2sgQ2FwdHVyZSAtIFRhc2sgR2VuaXVzPC90aXRsZT5cclxuXHQ8c3R5bGU+XHJcblx0XHQke2Nzc1ZhcnN9XHJcblx0XHRcclxuXHRcdCoge1xyXG5cdFx0XHRtYXJnaW46IDA7XHJcblx0XHRcdHBhZGRpbmc6IDA7XHJcblx0XHRcdGJveC1zaXppbmc6IGJvcmRlci1ib3g7XHJcblx0XHR9XHJcblxyXG5cdFx0aHRtbCwgYm9keSB7XHJcblx0XHRcdGhlaWdodDogMTAwJTtcclxuXHRcdFx0d2lkdGg6IDEwMCU7XHJcblx0XHR9XHJcblxyXG5cdFx0Ym9keSB7XHJcblx0XHRcdGZvbnQtZmFtaWx5OiAtYXBwbGUtc3lzdGVtLCBCbGlua01hY1N5c3RlbUZvbnQsICdTZWdvZSBVSScsIFJvYm90bywgT3h5Z2VuLCBVYnVudHUsIHNhbnMtc2VyaWY7XHJcblx0XHRcdGJhY2tncm91bmQtY29sb3I6IHZhcigtLWJhY2tncm91bmQtcHJpbWFyeSk7XHJcblx0XHRcdGNvbG9yOiB2YXIoLS10ZXh0LW5vcm1hbCk7XHJcblx0XHRcdHBhZGRpbmc6IDEycHg7XHJcblx0XHRcdGRpc3BsYXk6IGZsZXg7XHJcblx0XHRcdGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XHJcblx0XHRcdG92ZXJmbG93OiBoaWRkZW47XHJcblx0XHR9XHJcblxyXG5cdFx0LmNvbnRhaW5lciB7XHJcblx0XHRcdGZsZXg6IDE7XHJcblx0XHRcdGRpc3BsYXk6IGZsZXg7XHJcblx0XHRcdGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XHJcblx0XHRcdGdhcDogMTZweDtcclxuXHRcdFx0b3ZlcmZsb3cteTogYXV0bztcclxuXHRcdFx0cGFkZGluZzogOHB4O1xyXG5cdFx0fVxyXG5cclxuXHRcdC50aXRsZSB7XHJcblx0XHRcdGZvbnQtc2l6ZTogMThweDtcclxuXHRcdFx0Zm9udC13ZWlnaHQ6IDYwMDtcclxuXHRcdFx0bWFyZ2luLWJvdHRvbTogOHB4O1xyXG5cdFx0fVxyXG5cclxuXHRcdC5pbnB1dC1ncm91cCB7XHJcblx0XHRcdGRpc3BsYXk6IGZsZXg7XHJcblx0XHRcdGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XHJcblx0XHRcdGdhcDogOHB4O1xyXG5cdFx0fVxyXG5cclxuXHRcdGxhYmVsIHtcclxuXHRcdFx0Zm9udC1zaXplOiAxMnB4O1xyXG5cdFx0XHRmb250LXdlaWdodDogNTAwO1xyXG5cdFx0XHRjb2xvcjogdmFyKC0tdGV4dC1tdXRlZCk7XHJcblx0XHR9XHJcblxyXG5cdFx0aW5wdXRbdHlwZT1cInRleHRcIl0sXHJcblx0XHR0ZXh0YXJlYSxcclxuXHRcdHNlbGVjdCB7XHJcblx0XHRcdHdpZHRoOiAxMDAlO1xyXG5cdFx0XHRwYWRkaW5nOiA4cHggMTJweDtcclxuXHRcdFx0YmFja2dyb3VuZC1jb2xvcjogdmFyKC0tYmFja2dyb3VuZC1zZWNvbmRhcnkpO1xyXG5cdFx0XHRjb2xvcjogdmFyKC0tdGV4dC1ub3JtYWwpO1xyXG5cdFx0XHRib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1iYWNrZ3JvdW5kLW1vZGlmaWVyLWJvcmRlcik7XHJcblx0XHRcdGJvcmRlci1yYWRpdXM6IHZhcigtLXJhZGl1cy1zKTtcclxuXHRcdFx0Zm9udC1zaXplOiAxNHB4O1xyXG5cdFx0XHRvdXRsaW5lOiBub25lO1xyXG5cdFx0XHR0cmFuc2l0aW9uOiBhbGwgMC4ycztcclxuXHRcdH1cclxuXHJcblx0XHRpbnB1dFt0eXBlPVwidGV4dFwiXTpmb2N1cyxcclxuXHRcdHRleHRhcmVhOmZvY3VzLFxyXG5cdFx0c2VsZWN0OmZvY3VzIHtcclxuXHRcdFx0Ym9yZGVyLWNvbG9yOiB2YXIoLS1pbnRlcmFjdGl2ZS1hY2NlbnQpO1xyXG5cdFx0XHRib3gtc2hhZG93OiAwIDAgMCAzcHggcmdiYSgxMjQsIDU4LCAyMzcsIDAuMik7XHJcblx0XHR9XHJcblxyXG5cdFx0dGV4dGFyZWEge1xyXG5cdFx0XHRyZXNpemU6IG5vbmU7XHJcblx0XHRcdG1pbi1oZWlnaHQ6IDgwcHg7XHJcblx0XHRcdG1heC1oZWlnaHQ6IDMwMHB4O1xyXG5cdFx0XHRmb250LWZhbWlseTogaW5oZXJpdDtcclxuXHRcdFx0bGluZS1oZWlnaHQ6IDEuNTtcclxuXHRcdFx0b3ZlcmZsb3cteTogYXV0bztcclxuXHRcdH1cclxuXHJcblx0XHQubWV0YWRhdGEge1xyXG5cdFx0XHRkaXNwbGF5OiBncmlkO1xyXG5cdFx0XHRncmlkLXRlbXBsYXRlLWNvbHVtbnM6IDFmciAxZnI7XHJcblx0XHRcdGdhcDogMTJweDtcclxuXHRcdH1cclxuXHJcblx0XHQubWV0YWRhdGEtaXRlbSB7XHJcblx0XHRcdGRpc3BsYXk6IGZsZXg7XHJcblx0XHRcdGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XHJcblx0XHRcdGdhcDogNHB4O1xyXG5cdFx0fVxyXG5cclxuXHRcdC5idXR0b25zIHtcclxuXHRcdFx0ZGlzcGxheTogZmxleDtcclxuXHRcdFx0anVzdGlmeS1jb250ZW50OiBmbGV4LWVuZDtcclxuXHRcdFx0Z2FwOiAxMnB4O1xyXG5cdFx0XHRtYXJnaW4tdG9wOiBhdXRvO1xyXG5cdFx0XHRwYWRkaW5nOiAxMnB4O1xyXG5cdFx0XHRib3JkZXItdG9wOiAxcHggc29saWQgdmFyKC0tYmFja2dyb3VuZC1tb2RpZmllci1ib3JkZXIpO1xyXG5cdFx0XHRiYWNrZ3JvdW5kOiB2YXIoLS1iYWNrZ3JvdW5kLXByaW1hcnkpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGJ1dHRvbiB7XHJcblx0XHRcdHBhZGRpbmc6IDhweCAyMHB4O1xyXG5cdFx0XHRib3JkZXI6IG5vbmU7XHJcblx0XHRcdGJvcmRlci1yYWRpdXM6IHZhcigtLXJhZGl1cy1zKTtcclxuXHRcdFx0Zm9udC1zaXplOiAxNHB4O1xyXG5cdFx0XHRmb250LXdlaWdodDogNTAwO1xyXG5cdFx0XHRjdXJzb3I6IHBvaW50ZXI7XHJcblx0XHRcdHRyYW5zaXRpb246IGFsbCAwLjJzO1xyXG5cdFx0fVxyXG5cclxuXHRcdC5idG4tcHJpbWFyeSB7XHJcblx0XHRcdGJhY2tncm91bmQtY29sb3I6IHZhcigtLWludGVyYWN0aXZlLWFjY2VudCk7XHJcblx0XHRcdGNvbG9yOiB2YXIoLS10ZXh0LW9uLWFjY2VudCk7XHJcblx0XHR9XHJcblxyXG5cdFx0LmJ0bi1wcmltYXJ5OmhvdmVyIHtcclxuXHRcdFx0YmFja2dyb3VuZC1jb2xvcjogdmFyKC0taW50ZXJhY3RpdmUtYWNjZW50LWhvdmVyKTtcclxuXHRcdFx0dHJhbnNmb3JtOiB0cmFuc2xhdGVZKC0xcHgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC5idG4tc2Vjb25kYXJ5IHtcclxuXHRcdFx0YmFja2dyb3VuZC1jb2xvcjogdmFyKC0tYmFja2dyb3VuZC1zZWNvbmRhcnkpO1xyXG5cdFx0XHRjb2xvcjogdmFyKC0tdGV4dC1ub3JtYWwpO1xyXG5cdFx0XHRib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1iYWNrZ3JvdW5kLW1vZGlmaWVyLWJvcmRlcik7XHJcblx0XHR9XHJcblxyXG5cdFx0LmJ0bi1zZWNvbmRhcnk6aG92ZXIge1xyXG5cdFx0XHRiYWNrZ3JvdW5kLWNvbG9yOiB2YXIoLS1iYWNrZ3JvdW5kLW1vZGlmaWVyLWhvdmVyKTtcclxuXHRcdH1cclxuXHJcblx0XHQuZXJyb3ItbWVzc2FnZSB7XHJcblx0XHRcdGNvbG9yOiAjZWY0NDQ0O1xyXG5cdFx0XHRmb250LXNpemU6IDEycHg7XHJcblx0XHRcdG1hcmdpbi10b3A6IDRweDtcclxuXHRcdFx0ZGlzcGxheTogbm9uZTtcclxuXHRcdH1cclxuXHJcblx0XHQuZXJyb3ItbWVzc2FnZS5zaG93IHtcclxuXHRcdFx0ZGlzcGxheTogYmxvY2s7XHJcblx0XHR9XHJcblxyXG5cdFx0LmhlbHAtdGV4dCB7XHJcblx0XHRcdGZvbnQtc2l6ZTogMTFweDtcclxuXHRcdFx0Y29sb3I6IHZhcigtLXRleHQtZmFpbnQpO1xyXG5cdFx0XHRtYXJnaW4tdG9wOiAycHg7XHJcblx0XHR9XHJcblxyXG5cdFx0LnByaW9yaXR5LXNlbGVjdCB7XHJcblx0XHRcdGRpc3BsYXk6IGZsZXg7XHJcblx0XHRcdGdhcDogOHB4O1xyXG5cdFx0fVxyXG5cclxuXHRcdC5wcmlvcml0eS1idG4ge1xyXG5cdFx0XHRmbGV4OiAxO1xyXG5cdFx0XHRwYWRkaW5nOiA2cHg7XHJcblx0XHRcdHRleHQtYWxpZ246IGNlbnRlcjtcclxuXHRcdFx0Ym9yZGVyOiAxcHggc29saWQgdmFyKC0tYmFja2dyb3VuZC1tb2RpZmllci1ib3JkZXIpO1xyXG5cdFx0XHRib3JkZXItcmFkaXVzOiA0cHg7XHJcblx0XHRcdGN1cnNvcjogcG9pbnRlcjtcclxuXHRcdFx0dHJhbnNpdGlvbjogYWxsIDAuMnM7XHJcblx0XHRcdGJhY2tncm91bmQtY29sb3I6IHZhcigtLWJhY2tncm91bmQtc2Vjb25kYXJ5KTtcclxuXHRcdH1cclxuXHJcblx0XHQucHJpb3JpdHktYnRuOmhvdmVyIHtcclxuXHRcdFx0YmFja2dyb3VuZC1jb2xvcjogcmdiYSgxMjQsIDU4LCAyMzcsIDAuMSk7XHJcblx0XHRcdGJvcmRlci1jb2xvcjogdmFyKC0taW50ZXJhY3RpdmUtYWNjZW50KTtcclxuXHRcdH1cclxuXHJcblx0XHQucHJpb3JpdHktYnRuLnNlbGVjdGVkIHtcclxuXHRcdFx0YmFja2dyb3VuZC1jb2xvcjogdmFyKC0taW50ZXJhY3RpdmUtYWNjZW50KTtcclxuXHRcdFx0Y29sb3I6IHZhcigtLXRleHQtb24tYWNjZW50KTtcclxuXHRcdFx0Ym9yZGVyLWNvbG9yOiB2YXIoLS1pbnRlcmFjdGl2ZS1hY2NlbnQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC5kYXRlLWlucHV0LXdyYXBwZXIge1xyXG5cdFx0XHRkaXNwbGF5OiBmbGV4O1xyXG5cdFx0XHRnYXA6IDhweDtcclxuXHRcdFx0YWxpZ24taXRlbXM6IGNlbnRlcjtcclxuXHRcdH1cclxuXHJcblx0XHQuZGF0ZS1waWNrZXIsIC5kYXRlLXRleHQge1xyXG5cdFx0XHRmbGV4OiAxO1xyXG5cdFx0fVxyXG5cclxuXHRcdC5kYXRlLXRvZ2dsZSB7XHJcblx0XHRcdHdpZHRoOiAzMnB4O1xyXG5cdFx0XHRoZWlnaHQ6IDMycHg7XHJcblx0XHRcdHBhZGRpbmc6IDRweDtcclxuXHRcdFx0YmFja2dyb3VuZDogdmFyKC0tYmFja2dyb3VuZC1zZWNvbmRhcnkpO1xyXG5cdFx0XHRib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1iYWNrZ3JvdW5kLW1vZGlmaWVyLWJvcmRlcik7XHJcblx0XHRcdGJvcmRlci1yYWRpdXM6IDRweDtcclxuXHRcdFx0Y3Vyc29yOiBwb2ludGVyO1xyXG5cdFx0XHRmb250LXNpemU6IDE2cHg7XHJcblx0XHRcdHRyYW5zaXRpb246IGFsbCAwLjJzO1xyXG5cdFx0fVxyXG5cclxuXHRcdC5kYXRlLXRvZ2dsZTpob3ZlciB7XHJcblx0XHRcdGJhY2tncm91bmQ6IHJnYmEoMTI0LCA1OCwgMjM3LCAwLjEpO1xyXG5cdFx0XHRib3JkZXItY29sb3I6IHZhcigtLWludGVyYWN0aXZlLWFjY2VudCk7XHJcblx0XHR9XHJcblxyXG5cdFx0QG1lZGlhIChtYXgtd2lkdGg6IDUwMHB4KSB7XHJcblx0XHRcdC5tZXRhZGF0YSB7XHJcblx0XHRcdFx0Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiAxZnI7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHQ8L3N0eWxlPlxyXG48L2hlYWQ+XHJcbjxib2R5PlxyXG5cdDxkaXYgY2xhc3M9XCJjb250YWluZXJcIj5cclxuXHRcdDxkaXYgY2xhc3M9XCJ0aXRsZVwiPlF1aWNrIENhcHR1cmU8L2Rpdj5cclxuXHRcdFxyXG5cdFx0PGRpdiBjbGFzcz1cImlucHV0LWdyb3VwXCI+XHJcblx0XHRcdDx0ZXh0YXJlYSBcclxuXHRcdFx0XHRpZD1cInRhc2stY29udGVudFwiIFxyXG5cdFx0XHRcdHBsYWNlaG9sZGVyPVwiRW50ZXIgeW91ciB0YXNrLi4uXCIgXHJcblx0XHRcdFx0YXV0b2ZvY3VzXHJcblx0XHRcdD48L3RleHRhcmVhPlxyXG5cdFx0XHQ8ZGl2IGNsYXNzPVwiZXJyb3ItbWVzc2FnZVwiIGlkPVwiY29udGVudC1lcnJvclwiPjwvZGl2PlxyXG5cdFx0PC9kaXY+XHJcblxyXG5cdFx0PGRpdiBjbGFzcz1cIm1ldGFkYXRhXCIgaWQ9XCJtZXRhZGF0YS1zZWN0aW9uXCI+XHJcblx0XHRcdDxkaXYgY2xhc3M9XCJtZXRhZGF0YS1pdGVtXCI+XHJcblx0XHRcdFx0PGxhYmVsPlByb2plY3Q8L2xhYmVsPlxyXG5cdFx0XHRcdDxpbnB1dCB0eXBlPVwidGV4dFwiIGlkPVwicHJvamVjdFwiIGxpc3Q9XCJwcm9qZWN0LWxpc3RcIiBwbGFjZWhvbGRlcj1cImUuZy4sIFdvcmssIFBlcnNvbmFsXCI+XHJcblx0XHRcdFx0PGRhdGFsaXN0IGlkPVwicHJvamVjdC1saXN0XCI+PC9kYXRhbGlzdD5cclxuXHRcdFx0PC9kaXY+XHJcblxyXG5cdFx0XHQ8ZGl2IGNsYXNzPVwibWV0YWRhdGEtaXRlbVwiPlxyXG5cdFx0XHRcdDxsYWJlbD5Db250ZXh0PC9sYWJlbD5cclxuXHRcdFx0XHQ8aW5wdXQgdHlwZT1cInRleHRcIiBpZD1cImNvbnRleHRcIiBsaXN0PVwiY29udGV4dC1saXN0XCIgcGxhY2Vob2xkZXI9XCJlLmcuLCBAaG9tZSwgQG9mZmljZVwiPlxyXG5cdFx0XHRcdDxkYXRhbGlzdCBpZD1cImNvbnRleHQtbGlzdFwiPjwvZGF0YWxpc3Q+XHJcblx0XHRcdDwvZGl2PlxyXG5cclxuXHRcdFx0PGRpdiBjbGFzcz1cIm1ldGFkYXRhLWl0ZW1cIj5cclxuXHRcdFx0XHQ8bGFiZWw+U3RhcnQgRGF0ZTwvbGFiZWw+XHJcblx0XHRcdFx0PGRpdiBjbGFzcz1cImRhdGUtaW5wdXQtd3JhcHBlclwiPlxyXG5cdFx0XHRcdFx0PGlucHV0IHR5cGU9XCJkYXRlXCIgaWQ9XCJzdGFydC1kYXRlLXBpY2tlclwiIGNsYXNzPVwiZGF0ZS1waWNrZXJcIj5cclxuXHRcdFx0XHRcdDxpbnB1dCB0eXBlPVwidGV4dFwiIGlkPVwic3RhcnQtZGF0ZS10ZXh0XCIgcGxhY2Vob2xkZXI9XCJ0b2RheSwgdG9tb3Jyb3dcIiBjbGFzcz1cImRhdGUtdGV4dFwiIHN0eWxlPVwiZGlzcGxheTpub25lXCI+XHJcblx0XHRcdFx0XHQ8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImRhdGUtdG9nZ2xlXCIgZGF0YS1kYXRlLXR5cGU9XCJzdGFydFwiIHRpdGxlPVwiVG9nZ2xlIGlucHV0IHR5cGVcIj7wn5urPC9idXR0b24+XHJcblx0XHRcdFx0PC9kaXY+XHJcblx0XHRcdDwvZGl2PlxyXG5cclxuXHRcdFx0PGRpdiBjbGFzcz1cIm1ldGFkYXRhLWl0ZW1cIj5cclxuXHRcdFx0XHQ8bGFiZWw+RHVlIERhdGU8L2xhYmVsPlxyXG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJkYXRlLWlucHV0LXdyYXBwZXJcIj5cclxuXHRcdFx0XHRcdDxpbnB1dCB0eXBlPVwiZGF0ZVwiIGlkPVwiZHVlLWRhdGUtcGlja2VyXCIgY2xhc3M9XCJkYXRlLXBpY2tlclwiPlxyXG5cdFx0XHRcdFx0PGlucHV0IHR5cGU9XCJ0ZXh0XCIgaWQ9XCJkdWUtZGF0ZS10ZXh0XCIgcGxhY2Vob2xkZXI9XCJ0b21vcnJvdywgbmV4dCB3ZWVrXCIgY2xhc3M9XCJkYXRlLXRleHRcIiBzdHlsZT1cImRpc3BsYXk6bm9uZVwiPlxyXG5cdFx0XHRcdFx0PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJkYXRlLXRvZ2dsZVwiIGRhdGEtZGF0ZS10eXBlPVwiZHVlXCIgdGl0bGU9XCJUb2dnbGUgaW5wdXQgdHlwZVwiPvCfk4U8L2J1dHRvbj5cclxuXHRcdFx0XHQ8L2Rpdj5cclxuXHRcdFx0PC9kaXY+XHJcblxyXG5cdFx0XHQ8ZGl2IGNsYXNzPVwibWV0YWRhdGEtaXRlbVwiPlxyXG5cdFx0XHRcdDxsYWJlbD5TY2hlZHVsZWQgRGF0ZTwvbGFiZWw+XHJcblx0XHRcdFx0PGRpdiBjbGFzcz1cImRhdGUtaW5wdXQtd3JhcHBlclwiPlxyXG5cdFx0XHRcdFx0PGlucHV0IHR5cGU9XCJkYXRlXCIgaWQ9XCJzY2hlZHVsZWQtZGF0ZS1waWNrZXJcIiBjbGFzcz1cImRhdGUtcGlja2VyXCI+XHJcblx0XHRcdFx0XHQ8aW5wdXQgdHlwZT1cInRleHRcIiBpZD1cInNjaGVkdWxlZC1kYXRlLXRleHRcIiBwbGFjZWhvbGRlcj1cIm5leHQgbW9uZGF5XCIgY2xhc3M9XCJkYXRlLXRleHRcIiBzdHlsZT1cImRpc3BsYXk6bm9uZVwiPlxyXG5cdFx0XHRcdFx0PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJkYXRlLXRvZ2dsZVwiIGRhdGEtZGF0ZS10eXBlPVwic2NoZWR1bGVkXCIgdGl0bGU9XCJUb2dnbGUgaW5wdXQgdHlwZVwiPuKPszwvYnV0dG9uPlxyXG5cdFx0XHRcdDwvZGl2PlxyXG5cdFx0XHQ8L2Rpdj5cclxuXHJcblx0XHRcdDxkaXYgY2xhc3M9XCJtZXRhZGF0YS1pdGVtXCI+XHJcblx0XHRcdFx0PGxhYmVsPlByaW9yaXR5PC9sYWJlbD5cclxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwicHJpb3JpdHktc2VsZWN0XCI+XHJcblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwicHJpb3JpdHktYnRuXCIgZGF0YS1wcmlvcml0eT1cIjFcIj4xPC9kaXY+XHJcblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwicHJpb3JpdHktYnRuXCIgZGF0YS1wcmlvcml0eT1cIjJcIj4yPC9kaXY+XHJcblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwicHJpb3JpdHktYnRuXCIgZGF0YS1wcmlvcml0eT1cIjNcIj4zPC9kaXY+XHJcblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwicHJpb3JpdHktYnRuXCIgZGF0YS1wcmlvcml0eT1cIjRcIj40PC9kaXY+XHJcblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwicHJpb3JpdHktYnRuXCIgZGF0YS1wcmlvcml0eT1cIjVcIj41PC9kaXY+XHJcblx0XHRcdFx0PC9kaXY+XHJcblx0XHRcdDwvZGl2PlxyXG5cclxuXHRcdFx0PGRpdiBjbGFzcz1cIm1ldGFkYXRhLWl0ZW1cIj5cclxuXHRcdFx0XHQ8bGFiZWw+VGFnczwvbGFiZWw+XHJcblx0XHRcdFx0PGlucHV0IHR5cGU9XCJ0ZXh0XCIgaWQ9XCJ0YWdzXCIgbGlzdD1cInRhZ3MtbGlzdFwiIHBsYWNlaG9sZGVyPVwiZS5nLiwgaW1wb3J0YW50LCB1cmdlbnRcIj5cclxuXHRcdFx0XHQ8ZGF0YWxpc3QgaWQ9XCJ0YWdzLWxpc3RcIj48L2RhdGFsaXN0PlxyXG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJoZWxwLXRleHRcIj5Db21tYSBzZXBhcmF0ZWQ8L2Rpdj5cclxuXHRcdFx0PC9kaXY+XHJcblx0XHQ8L2Rpdj5cclxuXHJcblx0XHQ8ZGl2IGNsYXNzPVwiYnV0dG9uc1wiPlxyXG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVwiYnRuLXNlY29uZGFyeVwiIG9uY2xpY2s9XCJjYW5jZWwoKVwiPlxyXG5cdFx0XHRcdENhbmNlbCAoRXNjKVxyXG5cdFx0XHQ8L2J1dHRvbj5cclxuXHRcdFx0PGJ1dHRvbiBjbGFzcz1cImJ0bi1wcmltYXJ5XCIgb25jbGljaz1cInNhdmUoKVwiPlxyXG5cdFx0XHRcdFNhdmUgKEVudGVyKVxyXG5cdFx0XHQ8L2J1dHRvbj5cclxuXHRcdDwvZGl2PlxyXG5cdDwvZGl2PlxyXG5cclxuXHQ8c2NyaXB0PlxyXG5cdFx0Ly8gVXNlIGEgYnJpZGdlIGFwcHJvYWNoIGZvciBJUEMgY29tbXVuaWNhdGlvblxyXG5cdFx0bGV0IHNlbGVjdGVkUHJpb3JpdHkgPSBudWxsO1xyXG5cdFx0bGV0IGJyaWRnZSA9IG51bGw7XHJcblx0XHRsZXQgZGF0ZUlucHV0TW9kZXMgPSB7XHJcblx0XHRcdHN0YXJ0OiAncGlja2VyJyxcclxuXHRcdFx0ZHVlOiAncGlja2VyJyxcclxuXHRcdFx0c2NoZWR1bGVkOiAncGlja2VyJ1xyXG5cdFx0fTsgLy8gVHJhY2sgbW9kZSBmb3IgZWFjaCBkYXRlIGZpZWxkXHJcblxyXG5cdFx0Ly8gU2V0IHVwIGNvbW11bmljYXRpb24gYnJpZGdlXHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBUcnkgdG8gZ2V0IGlwY1JlbmRlcmVyIGZyb20gdmFyaW91cyBzb3VyY2VzXHJcblx0XHRcdGNvbnN0IGVsZWN0cm9uID0gd2luZG93LnJlcXVpcmUgPyB3aW5kb3cucmVxdWlyZSgnZWxlY3Ryb24nKSA6IG51bGw7XHJcblx0XHRcdGNvbnN0IGlwY1JlbmRlcmVyID0gZWxlY3Ryb24/LmlwY1JlbmRlcmVyO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKGlwY1JlbmRlcmVyKSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ0lQQyBicmlkZ2UgZXN0YWJsaXNoZWQnKTtcclxuXHRcdFx0XHRicmlkZ2UgPSB7XHJcblx0XHRcdFx0XHRzYXZlOiAoZGF0YSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnU2VuZGluZyBzYXZlIHZpYSBJUEM6JywgZGF0YSk7XHJcblx0XHRcdFx0XHRcdC8vIFRyeSBib3RoIG9sZCBhbmQgbmV3IElQQyBtZXRob2RzXHJcblx0XHRcdFx0XHRcdGlwY1JlbmRlcmVyLnNlbmQoJ3F1aWNrLWNhcHR1cmUtc2F2ZScsIGRhdGEpO1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0Y2FuY2VsOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdTZW5kaW5nIGNhbmNlbCB2aWEgSVBDJyk7XHJcblx0XHRcdFx0XHRcdGlwY1JlbmRlcmVyLnNlbmQoJ3F1aWNrLWNhcHR1cmUtY2FuY2VsJyk7XHJcblx0XHRcdFx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRyZXF1ZXN0RGF0YTogKHR5cGUpID0+IHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gU2V0IHVwIHJlY2VpdmVyIGZvciBzdWdnZXN0aW9uc1xyXG5cdFx0XHRcdFx0XHRcdHdpbmRvdy5yZWNlaXZlU3VnZ2VzdGlvbnMgPSAoZGF0YVR5cGUsIGl0ZW1zKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRpZiAoZGF0YVR5cGUgPT09IHR5cGUpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0cmVzb2x2ZShpdGVtcyk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGRlbGV0ZSB3aW5kb3cucmVjZWl2ZVN1Z2dlc3Rpb25zO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHRcdFx0aXBjUmVuZGVyZXIuc2VuZCgncXVpY2stY2FwdHVyZS1yZXF1ZXN0LWRhdGEnLCB0eXBlKTtcclxuXHRcdFx0XHRcdFx0XHQvLyBUaW1lb3V0IGFmdGVyIDIgc2Vjb25kc1xyXG5cdFx0XHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4gcmVzb2x2ZShbXSksIDIwMDApO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdJUEMgbm90IGF2YWlsYWJsZSAtIG5vIGlwY1JlbmRlcmVyJyk7XHJcblx0XHRcdH1cclxuXHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0Y29uc29sZS5sb2coJ0lQQyBub3QgYXZhaWxhYmxlIC0gZXJyb3I6JywgZSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQXV0by1yZXNpemUgdGV4dGFyZWFcclxuXHRcdGZ1bmN0aW9uIGF1dG9SZXNpemVUZXh0YXJlYSh0ZXh0YXJlYSkge1xyXG5cdFx0XHRpZiAoIXRleHRhcmVhKSByZXR1cm47XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBSZXNldCBoZWlnaHQgdG8gbWVhc3VyZSBjb250ZW50XHJcblx0XHRcdHRleHRhcmVhLnN0eWxlLmhlaWdodCA9ICdhdXRvJztcclxuXHRcdFx0XHJcblx0XHRcdC8vIENhbGN1bGF0ZSBuZXcgaGVpZ2h0IGJhc2VkIG9uIHNjcm9sbCBoZWlnaHRcclxuXHRcdFx0Y29uc3QgbmV3SGVpZ2h0ID0gTWF0aC5taW4odGV4dGFyZWEuc2Nyb2xsSGVpZ2h0LCAzMDApO1xyXG5cdFx0XHR0ZXh0YXJlYS5zdHlsZS5oZWlnaHQgPSBuZXdIZWlnaHQgKyAncHgnO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gRG9uJ3QgcmVzaXplIHRoZSB3aW5kb3cgLSBsZXQgdGhlIGNvbnRhaW5lciBoYW5kbGUgb3ZlcmZsb3dcclxuXHRcdFx0Ly8gVGhlIHdpbmRvdyBzaXplIHNob3VsZCByZW1haW4gc3RhYmxlXHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZVxyXG5cdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFza0NvbnRlbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndGFzay1jb250ZW50Jyk7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBGb2N1cyBvbiB0YXNrIGNvbnRlbnRcclxuXHRcdFx0aWYgKHRhc2tDb250ZW50KSB7XHJcblx0XHRcdFx0dGFza0NvbnRlbnQuZm9jdXMoKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHQvLyBBdXRvLXJlc2l6ZSBvbiBpbnB1dFxyXG5cdFx0XHRcdHRhc2tDb250ZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgKCkgPT4ge1xyXG5cdFx0XHRcdFx0YXV0b1Jlc2l6ZVRleHRhcmVhKHRhc2tDb250ZW50KTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHQvLyBJbml0aWFsIHJlc2l6ZVxyXG5cdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4gYXV0b1Jlc2l6ZVRleHRhcmVhKHRhc2tDb250ZW50KSwgMCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIExvYWQgc3VnZ2VzdGlvbnNcclxuXHRcdFx0bG9hZFN1Z2dlc3Rpb25zKCk7XHJcblxyXG5cdFx0XHQvLyBEYXRlIGlucHV0IHRvZ2dsZXNcclxuXHRcdFx0ZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmRhdGUtdG9nZ2xlJykuZm9yRWFjaChidG4gPT4ge1xyXG5cdFx0XHRcdGJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XHJcblx0XHRcdFx0XHRjb25zdCBkYXRlVHlwZSA9IGUudGFyZ2V0LmRhdGFzZXQuZGF0ZVR5cGU7XHJcblx0XHRcdFx0XHRpZiAoZGF0ZVR5cGUpIHtcclxuXHRcdFx0XHRcdFx0dG9nZ2xlRGF0ZUlucHV0KGRhdGVUeXBlKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBIYW5kbGUgZGF0ZSBwaWNrZXIgY2hhbmdlcyBmb3IgYWxsIGRhdGUgZmllbGRzXHJcblx0XHRcdFsnc3RhcnQnLCAnZHVlJywgJ3NjaGVkdWxlZCddLmZvckVhY2goZGF0ZVR5cGUgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IHBpY2tlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGRhdGVUeXBlICsgJy1kYXRlLXBpY2tlcicpO1xyXG5cdFx0XHRcdGNvbnN0IHRleHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChkYXRlVHlwZSArICctZGF0ZS10ZXh0Jyk7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0aWYgKHBpY2tlcikge1xyXG5cdFx0XHRcdFx0cGlja2VyLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIChlKSA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIFN5bmMgdG8gdGV4dCBmaWVsZFxyXG5cdFx0XHRcdFx0XHRpZiAodGV4dCkgdGV4dC52YWx1ZSA9IGUudGFyZ2V0LnZhbHVlO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdC8vIEhhbmRsZSBuYXR1cmFsIGxhbmd1YWdlIGRhdGUgaW5wdXRcclxuXHRcdFx0XHRpZiAodGV4dCkge1xyXG5cdFx0XHRcdFx0dGV4dC5hZGRFdmVudExpc3RlbmVyKCdibHVyJywgKGUpID0+IHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgcGFyc2VkID0gcGFyc2VOYXR1cmFsRGF0ZShlLnRhcmdldC52YWx1ZSk7XHJcblx0XHRcdFx0XHRcdGlmIChwYXJzZWQgJiYgcGFyc2VkICE9PSBlLnRhcmdldC52YWx1ZSkge1xyXG5cdFx0XHRcdFx0XHRcdGUudGFyZ2V0LnZhbHVlID0gcGFyc2VkO1xyXG5cdFx0XHRcdFx0XHRcdGlmIChwaWNrZXIpIHBpY2tlci52YWx1ZSA9IHBhcnNlZDtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KVxyXG5cclxuXHRcdFx0Ly8gSGFuZGxlIHByaW9yaXR5IGJ1dHRvbnNcclxuXHRcdFx0ZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnByaW9yaXR5LWJ0bicpLmZvckVhY2goYnRuID0+IHtcclxuXHRcdFx0XHRidG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XHJcblx0XHRcdFx0XHRkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcucHJpb3JpdHktYnRuJykuZm9yRWFjaChiID0+IFxyXG5cdFx0XHRcdFx0XHRiLmNsYXNzTGlzdC5yZW1vdmUoJ3NlbGVjdGVkJylcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRidG4uY2xhc3NMaXN0LmFkZCgnc2VsZWN0ZWQnKTtcclxuXHRcdFx0XHRcdHNlbGVjdGVkUHJpb3JpdHkgPSBwYXJzZUludChidG4uZGF0YXNldC5wcmlvcml0eSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gS2V5Ym9hcmQgc2hvcnRjdXRzXHJcblx0XHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCAoZSkgPT4ge1xyXG5cdFx0XHRcdGlmIChlLmtleSA9PT0gJ0VzY2FwZScpIHtcclxuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0XHRcdGNhbmNlbCgpO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAoZS5rZXkgPT09ICdFbnRlcicgJiYgKGUuY3RybEtleSB8fCBlLm1ldGFLZXkpKSB7XHJcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0XHRzYXZlKCk7XHJcblx0XHRcdFx0fSBlbHNlIGlmIChlLmtleSA9PT0gJ1RhYicgJiYgZS50YXJnZXQuaWQgPT09ICd0YXNrLWNvbnRlbnQnKSB7XHJcblx0XHRcdFx0XHQvLyBBbGxvdyBUYWIgaW4gdGV4dGFyZWEgdG8gaW5zZXJ0IHRhYnNcclxuXHRcdFx0XHRcdGlmICghZS5zaGlmdEtleSkge1xyXG5cdFx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0XHRcdGNvbnN0IHRleHRhcmVhID0gZS50YXJnZXQ7XHJcblx0XHRcdFx0XHRcdGNvbnN0IHN0YXJ0ID0gdGV4dGFyZWEuc2VsZWN0aW9uU3RhcnQ7XHJcblx0XHRcdFx0XHRcdGNvbnN0IGVuZCA9IHRleHRhcmVhLnNlbGVjdGlvbkVuZDtcclxuXHRcdFx0XHRcdFx0Y29uc3QgdmFsdWUgPSB0ZXh0YXJlYS52YWx1ZTtcclxuXHRcdFx0XHRcdFx0dGV4dGFyZWEudmFsdWUgPSB2YWx1ZS5zdWJzdHJpbmcoMCwgc3RhcnQpICsgJ1xcdCcgKyB2YWx1ZS5zdWJzdHJpbmcoZW5kKTtcclxuXHRcdFx0XHRcdFx0dGV4dGFyZWEuc2VsZWN0aW9uU3RhcnQgPSB0ZXh0YXJlYS5zZWxlY3Rpb25FbmQgPSBzdGFydCArIDE7XHJcblx0XHRcdFx0XHRcdGF1dG9SZXNpemVUZXh0YXJlYSh0ZXh0YXJlYSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSBlbHNlIGlmICgoZS5rZXkgPj0gJzEnICYmIGUua2V5IDw9ICc1JykgJiYgZS5hbHRLZXkpIHtcclxuXHRcdFx0XHRcdC8vIEFsdCsxIHRocm91Z2ggQWx0KzUgZm9yIHByaW9yaXR5XHJcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0XHRjb25zdCBwcmlvcml0eSA9IHBhcnNlSW50KGUua2V5KTtcclxuXHRcdFx0XHRcdGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5wcmlvcml0eS1idG4nKS5mb3JFYWNoKGJ0biA9PiB7XHJcblx0XHRcdFx0XHRcdGJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdzZWxlY3RlZCcpO1xyXG5cdFx0XHRcdFx0XHRpZiAocGFyc2VJbnQoYnRuLmRhdGFzZXQucHJpb3JpdHkpID09PSBwcmlvcml0eSkge1xyXG5cdFx0XHRcdFx0XHRcdGJ0bi5jbGFzc0xpc3QuYWRkKCdzZWxlY3RlZCcpO1xyXG5cdFx0XHRcdFx0XHRcdHNlbGVjdGVkUHJpb3JpdHkgPSBwcmlvcml0eTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIEhhbmRsZSBzZXR0aW5ncyBmcm9tIG1haW4gcHJvY2Vzc1xyXG5cdFx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIChldmVudCkgPT4ge1xyXG5cdFx0XHRcdGlmIChldmVudC5kYXRhLnR5cGUgPT09ICdpbml0JyAmJiBldmVudC5kYXRhLnNldHRpbmdzKSB7XHJcblx0XHRcdFx0XHRhcHBseVNldHRpbmdzKGV2ZW50LmRhdGEuc2V0dGluZ3MpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBUb2dnbGUgZGF0ZSBpbnB1dCBiZXR3ZWVuIHBpY2tlciBhbmQgdGV4dCBmb3Igc3BlY2lmaWMgZGF0ZSB0eXBlXHJcblx0XHRmdW5jdGlvbiB0b2dnbGVEYXRlSW5wdXQoZGF0ZVR5cGUpIHtcclxuXHRcdFx0Y29uc3QgcGlja2VyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZGF0ZVR5cGUgKyAnLWRhdGUtcGlja2VyJyk7XHJcblx0XHRcdGNvbnN0IHRleHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChkYXRlVHlwZSArICctZGF0ZS10ZXh0Jyk7XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoIXBpY2tlciB8fCAhdGV4dCkgcmV0dXJuO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKGRhdGVJbnB1dE1vZGVzW2RhdGVUeXBlXSA9PT0gJ3BpY2tlcicpIHtcclxuXHRcdFx0XHRwaWNrZXIuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuXHRcdFx0XHR0ZXh0LnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xyXG5cdFx0XHRcdHRleHQuZm9jdXMoKTtcclxuXHRcdFx0XHRkYXRlSW5wdXRNb2Rlc1tkYXRlVHlwZV0gPSAndGV4dCc7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGV4dC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG5cdFx0XHRcdHBpY2tlci5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcclxuXHRcdFx0XHRwaWNrZXIuZm9jdXMoKTtcclxuXHRcdFx0XHRkYXRlSW5wdXRNb2Rlc1tkYXRlVHlwZV0gPSAncGlja2VyJztcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIExvYWQgYXV0by1jb21wbGV0ZSBzdWdnZXN0aW9uc1xyXG5cdFx0YXN5bmMgZnVuY3Rpb24gbG9hZFN1Z2dlc3Rpb25zKCkge1xyXG5cdFx0XHRpZiAoYnJpZGdlICYmIGJyaWRnZS5yZXF1ZXN0RGF0YSkge1xyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHQvLyBSZXF1ZXN0IGFuZCBwb3B1bGF0ZSBwcm9qZWN0c1xyXG5cdFx0XHRcdFx0Y29uc3QgcHJvamVjdHMgPSBhd2FpdCBicmlkZ2UucmVxdWVzdERhdGEoJ3Byb2plY3RzJyk7XHJcblx0XHRcdFx0XHRwb3B1bGF0ZURhdGFsaXN0KCdwcm9qZWN0LWxpc3QnLCBwcm9qZWN0cyB8fCBbXSk7XHJcblx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdC8vIFJlcXVlc3QgYW5kIHBvcHVsYXRlIGNvbnRleHRzXHJcblx0XHRcdFx0XHRjb25zdCBjb250ZXh0cyA9IGF3YWl0IGJyaWRnZS5yZXF1ZXN0RGF0YSgnY29udGV4dHMnKTtcclxuXHRcdFx0XHRcdHBvcHVsYXRlRGF0YWxpc3QoJ2NvbnRleHQtbGlzdCcsIGNvbnRleHRzIHx8IFtdKTtcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0Ly8gUmVxdWVzdCBhbmQgcG9wdWxhdGUgdGFnc1xyXG5cdFx0XHRcdFx0Y29uc3QgdGFncyA9IGF3YWl0IGJyaWRnZS5yZXF1ZXN0RGF0YSgndGFncycpO1xyXG5cdFx0XHRcdFx0cG9wdWxhdGVEYXRhbGlzdCgndGFncy1saXN0JywgdGFncyB8fCBbXSk7XHJcblx0XHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5lcnJvcignRmFpbGVkIHRvIGxvYWQgc3VnZ2VzdGlvbnM6JywgZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUG9wdWxhdGUgZGF0YWxpc3Qgd2l0aCBpdGVtc1xyXG5cdFx0ZnVuY3Rpb24gcG9wdWxhdGVEYXRhbGlzdChsaXN0SWQsIGl0ZW1zKSB7XHJcblx0XHRcdGNvbnN0IGRhdGFsaXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobGlzdElkKTtcclxuXHRcdFx0aWYgKCFkYXRhbGlzdCB8fCAhaXRlbXMpIHJldHVybjtcclxuXHRcdFx0XHJcblx0XHRcdGRhdGFsaXN0LmlubmVySFRNTCA9ICcnO1xyXG5cdFx0XHRpdGVtcy5mb3JFYWNoKGl0ZW0gPT4ge1xyXG5cdFx0XHRcdGNvbnN0IG9wdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ29wdGlvbicpO1xyXG5cdFx0XHRcdG9wdGlvbi52YWx1ZSA9IGl0ZW07XHJcblx0XHRcdFx0ZGF0YWxpc3QuYXBwZW5kQ2hpbGQob3B0aW9uKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gYXBwbHlTZXR0aW5ncyhzZXR0aW5ncykge1xyXG5cdFx0XHQvLyBTaG93L2hpZGUgbWV0YWRhdGEgZmllbGRzIGJhc2VkIG9uIHNldHRpbmdzXHJcblx0XHRcdGNvbnN0IG1ldGFkYXRhID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21ldGFkYXRhLXNlY3Rpb24nKTtcclxuXHRcdFx0aWYgKCFzZXR0aW5ncy5zaG93UHJvamVjdCAmJiAhc2V0dGluZ3Muc2hvd0NvbnRleHQgJiYgXHJcblx0XHRcdFx0IXNldHRpbmdzLnNob3dEdWVEYXRlICYmICFzZXR0aW5ncy5zaG93UHJpb3JpdHkpIHtcclxuXHRcdFx0XHRtZXRhZGF0YS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIEhpZGUgaW5kaXZpZHVhbCBmaWVsZHMgYmFzZWQgb24gc2V0dGluZ3NcclxuXHRcdFx0XHRpZiAoIXNldHRpbmdzLnNob3dQcm9qZWN0KSB7XHJcblx0XHRcdFx0XHRjb25zdCBwcm9qZWN0RWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJvamVjdCcpO1xyXG5cdFx0XHRcdFx0aWYgKHByb2plY3RFbCAmJiBwcm9qZWN0RWwucGFyZW50RWxlbWVudCkge1xyXG5cdFx0XHRcdFx0XHRwcm9qZWN0RWwucGFyZW50RWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZiAoIXNldHRpbmdzLnNob3dDb250ZXh0KSB7XHJcblx0XHRcdFx0XHRjb25zdCBjb250ZXh0RWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29udGV4dCcpO1xyXG5cdFx0XHRcdFx0aWYgKGNvbnRleHRFbCAmJiBjb250ZXh0RWwucGFyZW50RWxlbWVudCkge1xyXG5cdFx0XHRcdFx0XHRjb250ZXh0RWwucGFyZW50RWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZiAoIXNldHRpbmdzLnNob3dEdWVEYXRlKSB7XHJcblx0XHRcdFx0XHRjb25zdCBkdWVEYXRlUGlja2VyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2R1ZS1kYXRlLXBpY2tlcicpO1xyXG5cdFx0XHRcdFx0aWYgKGR1ZURhdGVQaWNrZXIgJiYgZHVlRGF0ZVBpY2tlci5wYXJlbnRFbGVtZW50ICYmIGR1ZURhdGVQaWNrZXIucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50KSB7XHJcblx0XHRcdFx0XHRcdGR1ZURhdGVQaWNrZXIucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGlmICghc2V0dGluZ3Muc2hvd1ByaW9yaXR5KSB7XHJcblx0XHRcdFx0XHRjb25zdCBwcmlvcml0eUVscyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5wcmlvcml0eS1idG4nKTtcclxuXHRcdFx0XHRcdGlmIChwcmlvcml0eUVscy5sZW5ndGggPiAwICYmIHByaW9yaXR5RWxzWzBdLnBhcmVudEVsZW1lbnQpIHtcclxuXHRcdFx0XHRcdFx0cHJpb3JpdHlFbHNbMF0ucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0YXN5bmMgZnVuY3Rpb24gc2F2ZSgpIHtcclxuXHRcdFx0Y29uc3QgY29udGVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0YXNrLWNvbnRlbnQnKS52YWx1ZTtcclxuXHRcdFx0XHJcblx0XHRcdGlmICghY29udGVudC50cmltKCkpIHtcclxuXHRcdFx0XHRzaG93RXJyb3IoJ1Rhc2sgY29udGVudCBjYW5ub3QgYmUgZW1wdHknKTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEdldCBkYXRlIHZhbHVlcyBmcm9tIGVpdGhlciBwaWNrZXIgb3IgdGV4dCBpbnB1dCBmb3IgZWFjaCBkYXRlIHR5cGVcclxuXHRcdFx0ZnVuY3Rpb24gZ2V0RGF0ZVZhbHVlKGRhdGVUeXBlKSB7XHJcblx0XHRcdFx0Y29uc3QgcGlja2VyVmFsdWUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChkYXRlVHlwZSArICctZGF0ZS1waWNrZXInKS52YWx1ZTtcclxuXHRcdFx0XHRjb25zdCB0ZXh0VmFsdWUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChkYXRlVHlwZSArICctZGF0ZS10ZXh0JykudmFsdWU7XHJcblx0XHRcdFx0Y29uc3QgZGF0ZVZhbHVlID0gcGlja2VyVmFsdWUgfHwgdGV4dFZhbHVlO1xyXG5cdFx0XHRcdHJldHVybiBkYXRlVmFsdWUgPyBwYXJzZU5hdHVyYWxEYXRlKGRhdGVWYWx1ZSkgOiAnJztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3Qgc3RhcnREYXRlID0gZ2V0RGF0ZVZhbHVlKCdzdGFydCcpO1xyXG5cdFx0XHRjb25zdCBkdWVEYXRlID0gZ2V0RGF0ZVZhbHVlKCdkdWUnKTtcclxuXHRcdFx0Y29uc3Qgc2NoZWR1bGVkRGF0ZSA9IGdldERhdGVWYWx1ZSgnc2NoZWR1bGVkJyk7XHJcblxyXG5cdFx0XHQvLyBHZXQgdGFncyBhbmQgc3BsaXQgYnkgY29tbWFcclxuXHRcdFx0Y29uc3QgdGFnc0lucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RhZ3MnKS52YWx1ZS50cmltKCk7XHJcblx0XHRcdGNvbnN0IHRhZ3MgPSB0YWdzSW5wdXQgPyB0YWdzSW5wdXQuc3BsaXQoJywnKS5tYXAodCA9PiB0LnRyaW0oKSkuZmlsdGVyKHQgPT4gdCkgOiBbXTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIFByb2Nlc3MgY29udGVudCB0byBjb252ZXJ0IHRvIHRhc2sgZm9ybWF0IGlmIG5lZWRlZFxyXG5cdFx0XHRjb25zdCBwcm9jZXNzZWRDb250ZW50ID0gcHJvY2Vzc1Rhc2tDb250ZW50KGNvbnRlbnQudHJpbSgpKTtcclxuXHJcblx0XHRcdGNvbnN0IGRhdGEgPSB7XHJcblx0XHRcdFx0Y29udGVudDogcHJvY2Vzc2VkQ29udGVudCxcclxuXHRcdFx0XHRwcm9qZWN0OiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJvamVjdCcpLnZhbHVlLnRyaW0oKSxcclxuXHRcdFx0XHRjb250ZXh0OiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29udGV4dCcpLnZhbHVlLnRyaW0oKSxcclxuXHRcdFx0XHRzdGFydERhdGU6IHN0YXJ0RGF0ZSA/IHN0YXJ0RGF0ZS50cmltKCkgOiAnJyxcclxuXHRcdFx0XHRkdWVEYXRlOiBkdWVEYXRlID8gZHVlRGF0ZS50cmltKCkgOiAnJyxcclxuXHRcdFx0XHRzY2hlZHVsZWREYXRlOiBzY2hlZHVsZWREYXRlID8gc2NoZWR1bGVkRGF0ZS50cmltKCkgOiAnJyxcclxuXHRcdFx0XHRwcmlvcml0eTogc2VsZWN0ZWRQcmlvcml0eSxcclxuXHRcdFx0XHR0YWdzOiB0YWdzXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRpZiAoYnJpZGdlKSB7XHJcblx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdGF3YWl0IGJyaWRnZS5zYXZlKGRhdGEpO1xyXG5cdFx0XHRcdFx0d2luZG93LmNsb3NlKCk7XHJcblx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBzYXZlOicsIGVycm9yKTtcclxuXHRcdFx0XHRcdHNob3dFcnJvcignRmFpbGVkIHRvIHNhdmUgdGFzaycpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBGYWxsYmFjazogdHJ5IHRvIGNvbW11bmljYXRlIHRocm91Z2ggcGFyZW50IHdpbmRvd1xyXG5cdFx0XHRcdGlmICh3aW5kb3cub3BlbmVyKSB7XHJcblx0XHRcdFx0XHR3aW5kb3cub3BlbmVyLnBvc3RNZXNzYWdlKHsgdHlwZTogJ3F1aWNrLWNhcHR1cmUtc2F2ZScsIGRhdGEgfSwgJyonKTtcclxuXHRcdFx0XHRcdHdpbmRvdy5jbG9zZSgpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnV291bGQgc2F2ZTonLCBkYXRhKTtcclxuXHRcdFx0XHRcdHNob3dFcnJvcignQ29tbXVuaWNhdGlvbiBicmlkZ2Ugbm90IGF2YWlsYWJsZScpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGFzeW5jIGZ1bmN0aW9uIGNhbmNlbCgpIHtcclxuXHRcdFx0aWYgKGJyaWRnZSkge1xyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRhd2FpdCBicmlkZ2UuY2FuY2VsKCk7XHJcblx0XHRcdFx0fSBjYXRjaCB7fVxyXG5cdFx0XHR9XHJcblx0XHRcdHdpbmRvdy5jbG9zZSgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIHNob3dFcnJvcihtZXNzYWdlKSB7XHJcblx0XHRcdGNvbnN0IGVycm9yRWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29udGVudC1lcnJvcicpO1xyXG5cdFx0XHRlcnJvckVsLnRleHRDb250ZW50ID0gbWVzc2FnZTtcclxuXHRcdFx0ZXJyb3JFbC5jbGFzc0xpc3QuYWRkKCdzaG93Jyk7XHJcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdGVycm9yRWwuY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpO1xyXG5cdFx0XHR9LCAzMDAwKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Ly8gUHJvY2VzcyBjb250ZW50IHRvIGVuc3VyZSBpdCdzIGluIHRhc2sgZm9ybWF0XHJcblx0XHRmdW5jdGlvbiBwcm9jZXNzVGFza0NvbnRlbnQoY29udGVudCkge1xyXG5cdFx0XHRpZiAoIWNvbnRlbnQpIHJldHVybiAnJztcclxuXHRcdFx0XHJcblx0XHRcdGNvbnN0IGxpbmVzID0gY29udGVudC5zcGxpdCgnXFxcXG4nKTtcclxuXHRcdFx0Y29uc3QgcHJvY2Vzc2VkTGluZXMgPSBbXTtcclxuXHRcdFx0XHJcblx0XHRcdGZvciAobGV0IGxpbmUgb2YgbGluZXMpIHtcclxuXHRcdFx0XHRpZiAoIWxpbmUudHJpbSgpKSB7XHJcblx0XHRcdFx0XHRwcm9jZXNzZWRMaW5lcy5wdXNoKGxpbmUpO1xyXG5cdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdC8vIENoZWNrIGlmIGxpbmUgc3RhcnRzIHdpdGggYSB0YXNrIG1hcmtlclxyXG5cdFx0XHRcdGNvbnN0IHRhc2tSZWdleCA9IC9eW1xcXFxzXSpbLSorXFxcXGQrLl1cXFxccyooXFxcXFtbXlxcXFxdXSpcXFxcXSk/LztcclxuXHRcdFx0XHRpZiAodGFza1JlZ2V4LnRlc3QobGluZSkpIHtcclxuXHRcdFx0XHRcdC8vIEFscmVhZHkgYSB0YXNrIG9yIGxpc3QgaXRlbVxyXG5cdFx0XHRcdFx0cHJvY2Vzc2VkTGluZXMucHVzaChsaW5lKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0Ly8gQ29udmVydCB0byB0YXNrXHJcblx0XHRcdFx0XHRwcm9jZXNzZWRMaW5lcy5wdXNoKCctIFsgXSAnICsgbGluZS50cmltKCkpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0cmV0dXJuIHByb2Nlc3NlZExpbmVzLmpvaW4oJ1xcXFxuJyk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdC8vIFBhcnNlIG5hdHVyYWwgbGFuZ3VhZ2UgZGF0ZXNcclxuXHRcdGZ1bmN0aW9uIHBhcnNlTmF0dXJhbERhdGUoaW5wdXQpIHtcclxuXHRcdFx0aWYgKCFpbnB1dCkgcmV0dXJuICcnO1xyXG5cdFx0XHRcclxuXHRcdFx0Y29uc3QgbG93ZXIgPSBpbnB1dC50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcclxuXHRcdFx0Y29uc3QgdG9kYXkgPSBuZXcgRGF0ZSgpO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gTmF0dXJhbCBsYW5ndWFnZSBwYXR0ZXJuc1xyXG5cdFx0XHRpZiAobG93ZXIgPT09ICd0b2RheScgfHwgbG93ZXIgPT09ICd0b2QnKSB7XHJcblx0XHRcdFx0cmV0dXJuIGZvcm1hdERhdGUodG9kYXkpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChsb3dlciA9PT0gJ3RvbW9ycm93JyB8fCBsb3dlciA9PT0gJ3RvbScgfHwgbG93ZXIgPT09ICd0bXInKSB7XHJcblx0XHRcdFx0Y29uc3QgdG9tb3Jyb3cgPSBuZXcgRGF0ZSh0b2RheSk7XHJcblx0XHRcdFx0dG9tb3Jyb3cuc2V0RGF0ZSh0b21vcnJvdy5nZXREYXRlKCkgKyAxKTtcclxuXHRcdFx0XHRyZXR1cm4gZm9ybWF0RGF0ZSh0b21vcnJvdyk7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKGxvd2VyID09PSAneWVzdGVyZGF5Jykge1xyXG5cdFx0XHRcdGNvbnN0IHllc3RlcmRheSA9IG5ldyBEYXRlKHRvZGF5KTtcclxuXHRcdFx0XHR5ZXN0ZXJkYXkuc2V0RGF0ZSh5ZXN0ZXJkYXkuZ2V0RGF0ZSgpIC0gMSk7XHJcblx0XHRcdFx0cmV0dXJuIGZvcm1hdERhdGUoeWVzdGVyZGF5KTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAobG93ZXIgPT09ICduZXh0IHdlZWsnIHx8IGxvd2VyID09PSAnbncnKSB7XHJcblx0XHRcdFx0Y29uc3QgbmV4dFdlZWsgPSBuZXcgRGF0ZSh0b2RheSk7XHJcblx0XHRcdFx0bmV4dFdlZWsuc2V0RGF0ZShuZXh0V2Vlay5nZXREYXRlKCkgKyA3KTtcclxuXHRcdFx0XHRyZXR1cm4gZm9ybWF0RGF0ZShuZXh0V2Vlayk7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKGxvd2VyID09PSAnbmV4dCBtb250aCcgfHwgbG93ZXIgPT09ICdubScpIHtcclxuXHRcdFx0XHRjb25zdCBuZXh0TW9udGggPSBuZXcgRGF0ZSh0b2RheSk7XHJcblx0XHRcdFx0bmV4dE1vbnRoLnNldE1vbnRoKG5leHRNb250aC5nZXRNb250aCgpICsgMSk7XHJcblx0XHRcdFx0cmV0dXJuIGZvcm1hdERhdGUobmV4dE1vbnRoKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0Ly8gV2Vla2RheSBuYW1lc1xyXG5cdFx0XHRjb25zdCB3ZWVrZGF5cyA9IFsnc3VuZGF5JywgJ21vbmRheScsICd0dWVzZGF5JywgJ3dlZG5lc2RheScsICd0aHVyc2RheScsICdmcmlkYXknLCAnc2F0dXJkYXknXTtcclxuXHRcdFx0Y29uc3Qgd2Vla2RheUluZGV4ID0gd2Vla2RheXMuaW5kZXhPZihsb3dlcik7XHJcblx0XHRcdGlmICh3ZWVrZGF5SW5kZXggPj0gMCkge1xyXG5cdFx0XHRcdGNvbnN0IGN1cnJlbnREYXkgPSB0b2RheS5nZXREYXkoKTtcclxuXHRcdFx0XHRsZXQgZGF5c1VudGlsID0gd2Vla2RheUluZGV4IC0gY3VycmVudERheTtcclxuXHRcdFx0XHRpZiAoZGF5c1VudGlsIDw9IDApIGRheXNVbnRpbCArPSA3OyAvLyBOZXh0IG9jY3VycmVuY2VcclxuXHRcdFx0XHRjb25zdCB0YXJnZXREYXRlID0gbmV3IERhdGUodG9kYXkpO1xyXG5cdFx0XHRcdHRhcmdldERhdGUuc2V0RGF0ZSh0YXJnZXREYXRlLmdldERhdGUoKSArIGRheXNVbnRpbCk7XHJcblx0XHRcdFx0cmV0dXJuIGZvcm1hdERhdGUodGFyZ2V0RGF0ZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdC8vIFwibmV4dFwiICsgd2Vla2RheVxyXG5cdFx0XHRjb25zdCBuZXh0V2Vla2RheU1hdGNoID0gbG93ZXIubWF0Y2goL15uZXh0IChcXFxcdyspJC8pO1xyXG5cdFx0XHRpZiAobmV4dFdlZWtkYXlNYXRjaCkge1xyXG5cdFx0XHRcdGNvbnN0IHdlZWtkYXlOYW1lID0gbmV4dFdlZWtkYXlNYXRjaFsxXTtcclxuXHRcdFx0XHRjb25zdCBpZHggPSB3ZWVrZGF5cy5pbmRleE9mKHdlZWtkYXlOYW1lKTtcclxuXHRcdFx0XHRpZiAoaWR4ID49IDApIHtcclxuXHRcdFx0XHRcdGNvbnN0IGN1cnJlbnREYXkgPSB0b2RheS5nZXREYXkoKTtcclxuXHRcdFx0XHRcdGxldCBkYXlzVW50aWwgPSBpZHggLSBjdXJyZW50RGF5O1xyXG5cdFx0XHRcdFx0aWYgKGRheXNVbnRpbCA8PSAwKSBkYXlzVW50aWwgKz0gNztcclxuXHRcdFx0XHRcdGRheXNVbnRpbCArPSA3OyAvLyBcIm5leHRcIiBtZWFucyBza2lwIHRoaXMgd2Vla1xyXG5cdFx0XHRcdFx0Y29uc3QgdGFyZ2V0RGF0ZSA9IG5ldyBEYXRlKHRvZGF5KTtcclxuXHRcdFx0XHRcdHRhcmdldERhdGUuc2V0RGF0ZSh0YXJnZXREYXRlLmdldERhdGUoKSArIGRheXNVbnRpbCk7XHJcblx0XHRcdFx0XHRyZXR1cm4gZm9ybWF0RGF0ZSh0YXJnZXREYXRlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdC8vIE1hdGNoIHBhdHRlcm5zIGxpa2UgXCJpbiBYIGRheXNcIlxyXG5cdFx0XHRjb25zdCBpbkRheXNNYXRjaCA9IGxvd2VyLm1hdGNoKC9eaW4gKFxcXFxkKykgZGF5cz8kLyk7XHJcblx0XHRcdGlmIChpbkRheXNNYXRjaCkge1xyXG5cdFx0XHRcdGNvbnN0IGRheXMgPSBwYXJzZUludChpbkRheXNNYXRjaFsxXSk7XHJcblx0XHRcdFx0Y29uc3QgZnV0dXJlID0gbmV3IERhdGUodG9kYXkpO1xyXG5cdFx0XHRcdGZ1dHVyZS5zZXREYXRlKGZ1dHVyZS5nZXREYXRlKCkgKyBkYXlzKTtcclxuXHRcdFx0XHRyZXR1cm4gZm9ybWF0RGF0ZShmdXR1cmUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBNYXRjaCBwYXR0ZXJucyBsaWtlIFwiWCBkYXlzXCJcclxuXHRcdFx0Y29uc3QgZGF5c01hdGNoID0gbG93ZXIubWF0Y2goL14oXFxcXGQrKSBkYXlzPyQvKTtcclxuXHRcdFx0aWYgKGRheXNNYXRjaCkge1xyXG5cdFx0XHRcdGNvbnN0IGRheXMgPSBwYXJzZUludChkYXlzTWF0Y2hbMV0pO1xyXG5cdFx0XHRcdGNvbnN0IGZ1dHVyZSA9IG5ldyBEYXRlKHRvZGF5KTtcclxuXHRcdFx0XHRmdXR1cmUuc2V0RGF0ZShmdXR1cmUuZ2V0RGF0ZSgpICsgZGF5cyk7XHJcblx0XHRcdFx0cmV0dXJuIGZvcm1hdERhdGUoZnV0dXJlKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0Ly8gVHJ5IHRvIHBhcnNlIGFzIGEgcmVndWxhciBkYXRlXHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Y29uc3QgcGFyc2VkID0gbmV3IERhdGUoaW5wdXQpO1xyXG5cdFx0XHRcdGlmICghaXNOYU4ocGFyc2VkLmdldFRpbWUoKSkpIHtcclxuXHRcdFx0XHRcdHJldHVybiBmb3JtYXREYXRlKHBhcnNlZCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGNhdGNoIHt9XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBJZiBub3QgYSBuYXR1cmFsIGxhbmd1YWdlIHBhdHRlcm4sIHJldHVybiBvcmlnaW5hbFxyXG5cdFx0XHRyZXR1cm4gaW5wdXQ7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGZ1bmN0aW9uIGZvcm1hdERhdGUoZGF0ZSkge1xyXG5cdFx0XHRjb25zdCB5ZWFyID0gZGF0ZS5nZXRGdWxsWWVhcigpO1xyXG5cdFx0XHRjb25zdCBtb250aCA9IFN0cmluZyhkYXRlLmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpO1xyXG5cdFx0XHRjb25zdCBkYXkgPSBTdHJpbmcoZGF0ZS5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsICcwJyk7XHJcblx0XHRcdHJldHVybiB5ZWFyICsgJy0nICsgbW9udGggKyAnLScgKyBkYXk7XHJcblx0XHR9XHJcblx0PC9zY3JpcHQ+XHJcbjwvYm9keT5cclxuPC9odG1sPmA7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgZGVzdHJveSgpOiB2b2lkIHtcclxuXHRcdHRoaXMuY2xvc2VDYXB0dXJlV2luZG93KCk7XHJcblx0XHR0aGlzLmNsZWFudXBJUENIYW5kbGVycygpO1xyXG5cdH1cclxufSJdfQ==