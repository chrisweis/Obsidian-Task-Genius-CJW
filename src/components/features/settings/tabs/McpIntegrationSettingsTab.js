/**
 * MCP Integration Settings Tab Component
 */
import { __awaiter } from "tslib";
import { Setting, Notice, Platform, setIcon, requestUrl } from "obsidian";
import { t } from "@/translations/helper";
import { AuthMiddleware } from "@/mcp/auth/AuthMiddleware";
import { ConfirmModal } from "@/components/ui/modals/ConfirmModal";
import "@/styles/mcp-integration.css";
function createConfigBlock(container, config, label) {
    const blockContainer = container.createDiv("mcp-config-block");
    // Create code block
    const codeBlock = blockContainer.createEl("pre", {
        cls: "mcp-config-code",
    });
    const codeEl = codeBlock.createEl("code");
    codeEl.setText(JSON.stringify(config, null, 2));
    // Code block styling handled by CSS
    // Create copy button
    const copyBtn = blockContainer.createEl("button", {
        text: t("Copy"),
        cls: "mcp-copy-btn",
    });
    // Copy button styling handled by CSS
    copyBtn.onclick = () => __awaiter(this, void 0, void 0, function* () {
        yield navigator.clipboard.writeText(JSON.stringify(config, null, 2));
        copyBtn.setText(t("Copied!"));
        copyBtn.addClass("copied");
        setTimeout(() => {
            copyBtn.setText(t("Copy"));
            copyBtn.removeClass("copied");
        }, 2000);
    });
    // Styles are handled by CSS
}
export function renderMcpIntegrationSettingsTab(containerEl, plugin, applySettingsUpdate) {
    var _a, _b, _c, _d;
    // Only show on desktop
    if (!Platform.isDesktopApp) {
        containerEl.createEl("div", {
            text: t("MCP integration is only available on desktop"),
            cls: "setting-item-description",
        });
        return;
    }
    const mcpManager = plugin.mcpServerManager;
    // Server Status Section
    containerEl.createEl("h3", { text: t("MCP Server Status") });
    const statusContainer = containerEl.createDiv("mcp-status-container");
    updateServerStatus(statusContainer, mcpManager);
    // Enable/Disable Toggle
    new Setting(containerEl)
        .setName(t("Enable MCP Server"))
        .setDesc(t("Start the MCP server to allow external tool connections"))
        .addToggle((toggle) => {
        var _a;
        toggle
            .setValue(((_a = plugin.settings.mcpIntegration) === null || _a === void 0 ? void 0 : _a.enabled) || false)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            // Show confirmation dialog when enabling MCP
            if (value) {
                const modal = new ConfirmModal(plugin, {
                    title: t("Enable MCP Server"),
                    message: t("WARNING: Enabling the MCP server will allow external AI tools and applications to access and modify your task data. This includes:\n\n• Reading all tasks and their details\n• Creating new tasks\n• Updating existing tasks\n• Deleting tasks\n• Accessing task metadata and properties\n\nOnly enable this if you trust the applications that will connect to the MCP server. Make sure to keep your authentication token secure.\n\nDo you want to continue?"),
                    confirmText: t("Enable MCP Server"),
                    cancelText: t("Cancel"),
                    onConfirm: (confirmed) => __awaiter(this, void 0, void 0, function* () {
                        if (confirmed) {
                            // User confirmed, proceed with enabling
                            if (!plugin.settings.mcpIntegration) {
                                plugin.settings.mcpIntegration = {
                                    enabled: true,
                                    port: 7777,
                                    host: "127.0.0.1",
                                    authToken: AuthMiddleware.generateToken(),
                                    enableCors: true,
                                    logLevel: "info",
                                };
                            }
                            else {
                                plugin.settings.mcpIntegration.enabled = true;
                            }
                            yield plugin.saveSettings();
                            if (mcpManager) {
                                yield mcpManager.updateConfig({ enabled: true });
                                updateServerStatus(statusContainer, mcpManager);
                            }
                            toggle.setValue(true);
                            new Notice(t("MCP Server enabled. Keep your authentication token secure!"));
                        }
                        else {
                            // User cancelled, revert toggle
                            toggle.setValue(false);
                        }
                    })
                });
                modal.open();
            }
            else {
                // Disabling doesn't need confirmation
                if (plugin.settings.mcpIntegration) {
                    plugin.settings.mcpIntegration.enabled = false;
                }
                yield plugin.saveSettings();
                if (mcpManager) {
                    yield mcpManager.updateConfig({ enabled: false });
                    updateServerStatus(statusContainer, mcpManager);
                }
            }
        }));
    });
    // Server Configuration
    containerEl.createEl("h3", { text: t("Server Configuration") });
    // Host Setting
    new Setting(containerEl)
        .setName(t("Host"))
        .setDesc(t("Server host address. Use 127.0.0.1 for local only, 0.0.0.0 for all interfaces"))
        .addDropdown((dropdown) => {
        var _a;
        dropdown
            .addOption("127.0.0.1", "127.0.0.1 (Local only)")
            .addOption("0.0.0.0", "0.0.0.0 (All interfaces - for external access)")
            .setValue(((_a = plugin.settings.mcpIntegration) === null || _a === void 0 ? void 0 : _a.host) || "127.0.0.1")
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            if (!plugin.settings.mcpIntegration)
                return;
            // If switching to 0.0.0.0, show confirmation dialog
            if (value === "0.0.0.0" && plugin.settings.mcpIntegration.host !== "0.0.0.0") {
                const modal = new ConfirmModal(plugin, {
                    title: t("Security Warning"),
                    message: t("⚠️ **WARNING**: Switching to 0.0.0.0 will make the MCP server accessible from external networks.\n\nThis could expose your Obsidian data to:\n- Other devices on your local network\n- Potentially the internet if your firewall is misconfigured\n\n**Only proceed if you:**\n- Understand the security implications\n- Have properly configured your firewall\n- Need external access for legitimate reasons\n\nAre you sure you want to continue?"),
                    confirmText: t("Yes, I understand the risks"),
                    cancelText: t("Cancel"),
                    onConfirm: (confirmed) => __awaiter(this, void 0, void 0, function* () {
                        var _b;
                        if (confirmed) {
                            if (plugin.settings.mcpIntegration) {
                                plugin.settings.mcpIntegration.host = value;
                                applySettingsUpdate();
                            }
                            new Notice(t("Host changed to 0.0.0.0. Server is now accessible from external networks."));
                        }
                        else {
                            // Revert dropdown to previous value
                            dropdown.setValue(((_b = plugin.settings.mcpIntegration) === null || _b === void 0 ? void 0 : _b.host) || "127.0.0.1");
                        }
                    })
                });
                modal.open();
            }
            else {
                // Direct update for switching to 127.0.0.1 or no change
                plugin.settings.mcpIntegration.host = value;
                applySettingsUpdate();
            }
        }));
    });
    // Port Setting
    new Setting(containerEl)
        .setName(t("Port"))
        .setDesc(t("Server port number (default: 7777)"))
        .addText((text) => {
        var _a;
        text
            .setPlaceholder("7777")
            .setValue(String(((_a = plugin.settings.mcpIntegration) === null || _a === void 0 ? void 0 : _a.port) || 7777))
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            if (!plugin.settings.mcpIntegration)
                return;
            const port = parseInt(value);
            if (!isNaN(port) && port > 0 && port < 65536) {
                plugin.settings.mcpIntegration.port = port;
                applySettingsUpdate();
            }
        }));
    });
    // Authentication Section
    containerEl.createEl("h3", { text: t("Authentication") });
    // Auth Token Display
    const authTokenSetting = new Setting(containerEl)
        .setName(t("Authentication Token"))
        .setDesc(t("Bearer token for authenticating MCP requests (keep this secret)"));
    const tokenInput = authTokenSetting.controlEl.createEl("input", {
        type: "password",
        value: ((_a = plugin.settings.mcpIntegration) === null || _a === void 0 ? void 0 : _a.authToken) || "",
        cls: "mcp-token-input",
    });
    tokenInput.readOnly = true;
    // Show/Hide Token Button
    authTokenSetting.addButton((button) => {
        button.setButtonText(t("Show")).onClick(() => {
            if (tokenInput.type === "password") {
                tokenInput.type = "text";
                button.setButtonText(t("Hide"));
            }
            else {
                tokenInput.type = "password";
                button.setButtonText(t("Show"));
            }
        });
    });
    // Copy Token Button
    authTokenSetting.addButton((button) => {
        button.setButtonText(t("Copy")).onClick(() => __awaiter(this, void 0, void 0, function* () {
            yield navigator.clipboard.writeText(tokenInput.value);
            new Notice(t("Token copied to clipboard"));
        }));
    });
    // Regenerate Token Button
    authTokenSetting.addButton((button) => {
        button.setButtonText(t("Regenerate")).onClick(() => __awaiter(this, void 0, void 0, function* () {
            if (!plugin.settings.mcpIntegration || !mcpManager)
                return;
            const newToken = mcpManager.regenerateAuthToken();
            tokenInput.value = newToken;
            yield plugin.saveSettings();
            new Notice(t("New token generated"));
        }));
    });
    // Advanced Settings
    containerEl.createEl("h3", { text: t("Advanced Settings") });
    // CORS Setting
    new Setting(containerEl)
        .setName(t("Enable CORS"))
        .setDesc(t("Allow cross-origin requests (required for web clients)"))
        .addToggle((toggle) => {
        var _a, _b;
        toggle
            .setValue((_b = (_a = plugin.settings.mcpIntegration) === null || _a === void 0 ? void 0 : _a.enableCors) !== null && _b !== void 0 ? _b : true)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            if (!plugin.settings.mcpIntegration)
                return;
            plugin.settings.mcpIntegration.enableCors = value;
            applySettingsUpdate();
        }));
    });
    // Log Level Setting
    new Setting(containerEl)
        .setName(t("Log Level"))
        .setDesc(t("Logging verbosity for debugging"))
        .addDropdown((dropdown) => {
        var _a;
        dropdown
            .addOption("error", t("Error"))
            .addOption("warn", t("Warning"))
            .addOption("info", t("Info"))
            .addOption("debug", t("Debug"))
            .setValue(((_a = plugin.settings.mcpIntegration) === null || _a === void 0 ? void 0 : _a.logLevel) || "info")
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            if (!plugin.settings.mcpIntegration)
                return;
            plugin.settings.mcpIntegration.logLevel = value;
            applySettingsUpdate();
        }));
    });
    // Server Actions
    containerEl.createEl("h3", { text: t("Server Actions") });
    const actionsContainer = containerEl.createDiv("mcp-actions-container");
    // Test Connection Button
    new Setting(actionsContainer)
        .setName(t("Test Connection"))
        .setDesc(t("Test the MCP server connection"))
        .addButton((button) => {
        button
            .setButtonText(t("Test"))
            .onClick(() => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            button.setDisabled(true);
            button.setButtonText(t("Testing..."));
            try {
                console.log("[MCP Test] Starting connection test...");
                console.log("[MCP Test] Server URL:", serverUrl);
                console.log("[MCP Test] Auth Token:", authToken);
                console.log("[MCP Test] App ID:", appId);
                // Test 1: Basic connectivity
                console.log("[MCP Test] Test 1: Basic connectivity...");
                const healthRes = yield requestUrl({
                    url: `http://${((_a = plugin.settings.mcpIntegration) === null || _a === void 0 ? void 0 : _a.host) || "127.0.0.1"}:${((_b = plugin.settings.mcpIntegration) === null || _b === void 0 ? void 0 : _b.port) || 7777}/health`,
                    method: "GET"
                }).catch(err => {
                    console.error("[MCP Test] Health check failed:", err);
                    throw new Error(`Cannot reach server: ${err.message}`);
                });
                if (!healthRes || healthRes.status !== 200) {
                    throw new Error(`Health check failed`);
                }
                console.log("[MCP Test] Health check passed");
                // Test 2: MCP initialize with Method B (combined bearer)
                console.log("[MCP Test] Test 2: MCP initialize with Method B...");
                const initRes = yield requestUrl({
                    url: serverUrl,
                    method: "POST",
                    headers: {
                        "Authorization": bearerWithAppId,
                        "Content-Type": "application/json",
                        "Accept": "application/json, text/event-stream",
                        "MCP-Protocol-Version": "2025-06-18",
                    },
                    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" })
                }).catch(err => {
                    throw new Error(`Initialize failed: ${err.message}`);
                });
                if (initRes.status !== 200) {
                    const errorBody = initRes.text;
                    throw new Error(`Initialize failed with status ${initRes.status}: ${errorBody}`);
                }
                // Obsidian's requestUrl returns json directly
                const initJson = initRes.json;
                console.log("[MCP Test] Initialize response:", initJson);
                console.log("[MCP Test] Headers:", initRes.headers);
                if (initJson.error) {
                    throw new Error(`MCP error: ${initJson.error.message}`);
                }
                // Obsidian's requestUrl returns headers with lowercase keys
                const sessionId = initRes.headers["mcp-session-id"] ||
                    initRes.headers["Mcp-Session-Id"] ||
                    (initJson === null || initJson === void 0 ? void 0 : initJson.sessionId) ||
                    ((_c = initJson === null || initJson === void 0 ? void 0 : initJson.result) === null || _c === void 0 ? void 0 : _c.sessionId);
                if (!sessionId) {
                    console.error("[MCP Test] No session ID in response");
                    throw new Error("No session ID returned");
                }
                console.log("[MCP Test] Got session ID:", sessionId);
                // Test 3: Tools list
                console.log("[MCP Test] Test 3: Listing tools...");
                const toolsRes = yield requestUrl({
                    url: serverUrl,
                    method: "POST",
                    headers: {
                        "Authorization": bearerWithAppId,
                        "Mcp-Session-Id": sessionId,
                        "Content-Type": "application/json",
                        "Accept": "application/json, text/event-stream",
                        "MCP-Protocol-Version": "2025-06-18",
                    },
                    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" })
                });
                // Obsidian's requestUrl returns json directly
                const toolsJson = toolsRes.json;
                console.log("[MCP Test] Tools response:", toolsJson);
                if (toolsJson.error) {
                    throw new Error(`Tools list error: ${toolsJson.error.message}`);
                }
                new Notice(t("Connection test successful! MCP server is working."));
                console.log("[MCP Test] All tests passed!");
            }
            catch (error) {
                console.error("[MCP Test] Test failed:", error);
                new Notice(t("Connection test failed: ") + error.message);
            }
            finally {
                button.setDisabled(false);
                button.setButtonText(t("Test"));
            }
        }));
    });
    // Restart Server Button
    new Setting(actionsContainer)
        .setName(t("Restart Server"))
        .setDesc(t("Stop and restart the MCP server"))
        .addButton((button) => {
        button
            .setButtonText(t("Restart"))
            .setCta()
            .onClick(() => __awaiter(this, void 0, void 0, function* () {
            if (!mcpManager)
                return;
            button.setDisabled(true);
            try {
                yield mcpManager.restart();
                new Notice(t("MCP server restarted"));
                updateServerStatus(statusContainer, mcpManager);
            }
            catch (error) {
                new Notice(t("Failed to restart server: ") + error.message);
            }
            finally {
                button.setDisabled(false);
            }
        }));
    })
        // Try next available port Button
        .addButton((button) => {
        button
            .setButtonText(t("Use Next Available Port"))
            .onClick(() => __awaiter(this, void 0, void 0, function* () {
            if (!mcpManager || !plugin.settings.mcpIntegration)
                return;
            button.setDisabled(true);
            try {
                const startPort = (plugin.settings.mcpIntegration.port || 7777) + 1;
                let candidate = startPort;
                let found = false;
                // Probe a small range for availability by attempting to update (manager validates)
                for (let i = 0; i < 50; i++) {
                    try {
                        yield mcpManager.updateConfig({ port: candidate });
                        found = true;
                        break;
                    }
                    catch (_a) {
                        candidate++;
                    }
                }
                if (found) {
                    new Notice(t("Port updated to ") + String(candidate));
                    updateServerStatus(statusContainer, mcpManager);
                }
                else {
                    new Notice(t("No available port found in range"));
                }
            }
            finally {
                button.setDisabled(false);
            }
        }));
    });
    // Client Configuration
    containerEl.createEl("h3", { text: t("Client Configuration") });
    const configContainer = containerEl.createDiv("mcp-config-container");
    // Authentication Method Toggle
    let useMethodB = true; // Default to Method B
    // Forward declare update functions
    let updateClientConfigs;
    let updateExamples;
    const authMethodSetting = new Setting(configContainer)
        .setName(t("Authentication Method"))
        .setDesc(t("Choose the authentication method for client configurations"))
        .addDropdown((dropdown) => {
        dropdown
            .addOption("methodB", t("Method B: Combined Bearer (Recommended)"))
            .addOption("methodA", t("Method A: Custom Headers"))
            .setValue("methodB")
            .onChange((value) => {
            useMethodB = value === "methodB";
            updateClientConfigs();
            if (updateExamples)
                updateExamples();
        });
    });
    // Generate configuration based on current settings
    // For external access, use actual IP or localhost depending on host setting
    const configHost = ((_b = plugin.settings.mcpIntegration) === null || _b === void 0 ? void 0 : _b.host) || "127.0.0.1";
    const displayHost = configHost === "0.0.0.0" ? "127.0.0.1" : configHost; // Use localhost for display when binding to all interfaces
    const serverUrl = `http://${displayHost}:${((_c = plugin.settings.mcpIntegration) === null || _c === void 0 ? void 0 : _c.port) || 7777}/mcp`;
    const authToken = ((_d = plugin.settings.mcpIntegration) === null || _d === void 0 ? void 0 : _d.authToken) || "";
    const vaultName = plugin.app.vault.getName();
    // Create a stable, slugified tool/server name per vault: [vault]-tasks
    const toolName = `${vaultName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-tasks`;
    const appId = plugin.app.appId;
    const bearerWithAppId = `Bearer ${authToken}+${appId}`;
    // Authentication Methods Documentation
    const authMethodsContainer = configContainer.createDiv("mcp-auth-methods");
    authMethodsContainer.createEl("div", {
        text: t("Supported Authentication Methods:"),
        cls: "setting-item-description",
    });
    const authList = authMethodsContainer.createEl("ul", {
        cls: "mcp-auth-list",
    });
    // Method A
    const methodAItem = authList.createEl("li");
    methodAItem.createEl("strong", { text: "Method A (Custom Header):" });
    methodAItem.appendText(" ");
    methodAItem.createEl("code", { text: `mcp-app-id: ${appId}` });
    methodAItem.appendText(" + ");
    methodAItem.createEl("code", { text: `Authorization: Bearer ${authToken}` });
    // Method B
    const methodBItem = authList.createEl("li");
    methodBItem.createEl("strong", { text: "Method B (Combined Bearer):" });
    methodBItem.appendText(" ");
    methodBItem.createEl("code", { text: `Authorization: Bearer ${authToken}+${appId}` });
    // Container for client configs that will be updated dynamically
    const clientConfigsContainer = configContainer.createDiv("mcp-client-configs-container");
    // Function to generate client configs based on selected method
    const generateClientConfigs = () => {
        if (useMethodB) {
            // Method B: Combined Bearer Token
            return [
                {
                    name: "Cursor",
                    config: {
                        mcpServers: {
                            [toolName]: {
                                url: serverUrl,
                                headers: {
                                    Authorization: bearerWithAppId
                                }
                            }
                        }
                    }
                },
                {
                    name: "Claude Desktop",
                    config: {
                        mcpServers: {
                            [toolName]: {
                                command: "curl",
                                args: [
                                    "-X", "POST",
                                    "-H", `Authorization: ${bearerWithAppId}`,
                                    "-H", "Content-Type: application/json",
                                    "--data-raw", "@-",
                                    serverUrl
                                ]
                            }
                        }
                    }
                },
                {
                    name: "Claude Code",
                    commandLine: `claude mcp add --transport http ${toolName} ${serverUrl} --header "Authorization: ${bearerWithAppId}"`
                },
                {
                    name: "VS Code",
                    config: {
                        mcp: {
                            servers: {
                                [toolName]: {
                                    type: "http",
                                    url: serverUrl,
                                    headers: {
                                        Authorization: bearerWithAppId
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    name: "Windsurf",
                    config: {
                        mcpServers: {
                            [toolName]: {
                                serverUrl: serverUrl,
                                headers: {
                                    Authorization: bearerWithAppId
                                }
                            }
                        }
                    }
                },
                {
                    name: "Zed",
                    config: {
                        context_servers: {
                            [toolName]: {
                                command: {
                                    path: "curl",
                                    args: [
                                        "-X", "POST",
                                        "-H", `Authorization: ${bearerWithAppId}`,
                                        "-H", "Content-Type: application/json",
                                        "--data-raw", "@-",
                                        serverUrl
                                    ]
                                },
                                settings: {}
                            }
                        }
                    }
                }
            ];
        }
        else {
            // Method A: Custom Headers
            return [
                {
                    name: "Cursor",
                    config: {
                        mcpServers: {
                            [toolName]: {
                                url: serverUrl,
                                headers: {
                                    Authorization: `Bearer ${authToken}`,
                                    "mcp-app-id": appId
                                }
                            }
                        }
                    }
                },
                {
                    name: "Claude Desktop",
                    config: {
                        mcpServers: {
                            [toolName]: {
                                command: "curl",
                                args: [
                                    "-X", "POST",
                                    "-H", `Authorization: Bearer ${authToken}`,
                                    "-H", `mcp-app-id: ${appId}`,
                                    "-H", "Content-Type: application/json",
                                    "--data-raw", "@-",
                                    serverUrl
                                ]
                            }
                        }
                    }
                },
                {
                    name: "Claude Code",
                    commandLine: `claude mcp add --transport http ${toolName} ${serverUrl} --header "Authorization: Bearer ${authToken}" --header "mcp-app-id: ${appId}"`
                },
                {
                    name: "VS Code",
                    config: {
                        mcp: {
                            servers: {
                                [toolName]: {
                                    type: "http",
                                    url: serverUrl,
                                    headers: {
                                        Authorization: `Bearer ${authToken}`,
                                        "mcp-app-id": appId
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    name: "Windsurf",
                    config: {
                        mcpServers: {
                            [toolName]: {
                                serverUrl: serverUrl,
                                headers: {
                                    Authorization: `Bearer ${authToken}`,
                                    "mcp-app-id": appId
                                }
                            }
                        }
                    }
                },
                {
                    name: "Zed",
                    config: {
                        context_servers: {
                            [toolName]: {
                                command: {
                                    path: "curl",
                                    args: [
                                        "-X", "POST",
                                        "-H", `Authorization: Bearer ${authToken}`,
                                        "-H", `mcp-app-id: ${appId}`,
                                        "-H", "Content-Type: application/json",
                                        "--data-raw", "@-",
                                        serverUrl
                                    ]
                                },
                                settings: {}
                            }
                        }
                    }
                }
            ];
        }
    };
    // Function to update client configurations
    updateClientConfigs = () => {
        clientConfigsContainer.empty();
        const clientConfigs = generateClientConfigs();
        clientConfigs.forEach(client => {
            const section = clientConfigsContainer.createDiv("mcp-client-section");
            // Create collapsible header
            const header = section.createDiv("mcp-client-header");
            const arrow = header.createDiv("mcp-arrow");
            setIcon(arrow, "chevron-right");
            header.createEl("span", {
                text: client.name,
                cls: "mcp-client-name"
            });
            const content = section.createDiv("mcp-client-content");
            // Display handled by CSS
            // Toggle collapse/expand
            let isExpanded = false;
            header.onclick = () => {
                isExpanded = !isExpanded;
                if (isExpanded) {
                    content.classList.add("expanded");
                    arrow.classList.add("expanded");
                }
                else {
                    content.classList.remove("expanded");
                    arrow.classList.remove("expanded");
                }
            };
            // Add configuration content
            if (client.name === "Cursor") {
                // Add one-click install for Cursor
                const cursorInstallSection = content.createDiv("mcp-cursor-install-section");
                cursorInstallSection.createEl("h4", {
                    text: t("Quick Install"),
                    cls: "mcp-docs-subtitle",
                });
                // Generate Cursor deeplink configuration
                const cursorConfig = {
                    url: serverUrl,
                    headers: {
                        Authorization: bearerWithAppId
                    }
                };
                // Base64 encode the configuration
                const encodedConfig = btoa(JSON.stringify(cursorConfig));
                const cursorDeeplink = `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(toolName)}&config=${encodedConfig}`;
                // Create install button container
                const installContainer = cursorInstallSection.createDiv("mcp-cursor-install-container");
                // Add description
                installContainer.createEl("p", {
                    text: t("Click the button below to automatically add this MCP server to Cursor:"),
                    cls: "mcp-cursor-install-desc"
                });
                // Create install button with official Cursor SVG (dark mode style)
                const installLink = installContainer.createEl("a", {
                    href: cursorDeeplink,
                    cls: "mcp-cursor-install-link"
                });
                const installBtn = installLink.createEl("img", {
                    attr: {
                        src: "https://cursor.com/deeplink/mcp-install-dark.svg",
                        alt: `Add ${toolName} MCP server to Cursor`,
                        height: "32"
                    }
                });
                // Additional buttons container
                const additionalButtons = installContainer.createDiv("mcp-cursor-additional-buttons");
                // Copy deeplink button
                const copyDeeplinkBtn = additionalButtons.createEl("button", {
                    text: t("Copy Install Link"),
                    cls: "mcp-cursor-copy-deeplink-btn"
                });
                copyDeeplinkBtn.onclick = () => __awaiter(this, void 0, void 0, function* () {
                    yield navigator.clipboard.writeText(cursorDeeplink);
                    copyDeeplinkBtn.setText(t("Copied!"));
                    copyDeeplinkBtn.addClass("copied");
                    setTimeout(() => {
                        copyDeeplinkBtn.setText(t("Copy Install Link"));
                        copyDeeplinkBtn.removeClass("copied");
                    }, 2000);
                });
                // Add separator
                content.createEl("hr", {
                    cls: "mcp-section-separator"
                });
                // Add manual configuration section
                content.createEl("h4", {
                    text: t("Manual Configuration"),
                    cls: "mcp-docs-subtitle",
                });
                // Show the configuration JSON
                createConfigBlock(content, client.config, `${client.name} configuration`);
            }
            else if (client.config) {
                createConfigBlock(content, client.config, `${client.name} configuration`);
            }
            else if (client.commandLine) {
                // Special handling for command line configs
                const cmdBlock = content.createDiv("mcp-config-block");
                const codeBlock = cmdBlock.createEl("pre", {
                    cls: "mcp-config-code",
                });
                const codeEl = codeBlock.createEl("code");
                codeEl.setText(client.commandLine);
                // Code block styling handled by CSS
                // Create copy button
                const copyBtn = cmdBlock.createEl("button", {
                    text: t("Copy"),
                    cls: "mcp-copy-btn",
                });
                copyBtn.onclick = () => __awaiter(this, void 0, void 0, function* () {
                    yield navigator.clipboard.writeText(client.commandLine);
                    copyBtn.setText(t("Copied!"));
                    copyBtn.addClass("copied");
                    setTimeout(() => {
                        copyBtn.setText(t("Copy"));
                        copyBtn.removeClass("copied");
                    }, 2000);
                });
                // Styles are handled by CSS
            }
        });
    };
    // Initial render of client configs
    updateClientConfigs();
    // API Documentation
    containerEl.createEl("h3", { text: t("API Documentation") });
    const docsContainer = containerEl.createDiv("mcp-docs-container");
    // Server Endpoint Section
    const endpointSection = docsContainer.createDiv("mcp-docs-section");
    endpointSection.createEl("h4", {
        text: t("Server Endpoint"),
        cls: "mcp-docs-subtitle",
    });
    const endpointBox = endpointSection.createDiv("mcp-endpoint-box");
    const endpointContent = endpointBox.createDiv("mcp-endpoint-content");
    const endpointLabel = endpointContent.createSpan("mcp-endpoint-label");
    endpointLabel.setText("URL: ");
    const endpointUrl = serverUrl;
    endpointContent.createEl("code", {
        text: endpointUrl,
        cls: "mcp-endpoint-url",
    });
    // Copy endpoint button
    const copyEndpointBtn = endpointBox.createEl("button", {
        text: t("Copy URL"),
        cls: "mcp-copy-endpoint-btn",
    });
    copyEndpointBtn.onclick = () => __awaiter(this, void 0, void 0, function* () {
        yield navigator.clipboard.writeText(endpointUrl);
        copyEndpointBtn.setText(t("Copied!"));
        copyEndpointBtn.addClass("copied");
        setTimeout(() => {
            copyEndpointBtn.setText(t("Copy URL"));
            copyEndpointBtn.removeClass("copied");
        }, 2000);
    });
    // Available Tools Section
    const toolsSection = docsContainer.createDiv("mcp-docs-section");
    toolsSection.createEl("h4", {
        text: t("Available Tools"),
        cls: "mcp-docs-subtitle",
    });
    const toolsGrid = toolsSection.createDiv("mcp-tools-grid");
    const toolsInfo = toolsSection.createDiv("mcp-tools-info");
    toolsInfo.setText(t("Loading tools..."));
    function renderDynamicTools() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Step 1: initialize to get session id
                const initRes = yield requestUrl({
                    url: serverUrl,
                    method: "POST",
                    headers: {
                        "Authorization": `${bearerWithAppId}`,
                        "Content-Type": "application/json",
                        "Accept": "application/json, text/event-stream",
                        "MCP-Protocol-Version": "2025-06-18",
                    },
                    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" })
                });
                // Session ID should be in the Mcp-Session-Id header according to spec
                // Obsidian's requestUrl returns headers with lowercase keys
                const sessionId = initRes.headers["mcp-session-id"] ||
                    initRes.headers["Mcp-Session-Id"]; // Fallback for case variations
                if (!sessionId) {
                    throw new Error("No session id returned");
                }
                // Step 2: list tools
                const listRes = yield requestUrl({
                    url: serverUrl,
                    method: "POST",
                    headers: {
                        "Authorization": `${bearerWithAppId}`,
                        "Mcp-Session-Id": sessionId,
                        "Content-Type": "application/json",
                        "Accept": "application/json, text/event-stream",
                        "MCP-Protocol-Version": "2025-06-18",
                    },
                    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" })
                });
                console.log("MCP tools", listRes);
                const tools = ((_a = listRes === null || listRes === void 0 ? void 0 : listRes.json.result) === null || _a === void 0 ? void 0 : _a.tools) || [];
                toolsInfo.setText("");
                if (!tools.length) {
                    toolsInfo.setText(t("No tools available"));
                    return;
                }
                tools.forEach((tool) => {
                    const toolCard = toolsGrid.createDiv("mcp-tool-card");
                    const toolHeader = toolCard.createDiv("mcp-tool-header");
                    const iconEl = toolHeader.createDiv("mcp-tool-icon");
                    setIcon(iconEl, "wrench");
                    toolHeader.createEl("code", { text: tool.name, cls: "mcp-tool-name" });
                    const toolDesc = toolCard.createDiv("mcp-tool-desc");
                    toolDesc.setText(tool.description || "");
                });
            }
            catch (e) {
                console.error("[MCP Tools] Failed to load tools:", e);
                toolsInfo.setText(t("Failed to load tools. Is the MCP server running?"));
            }
        });
    }
    // Fire and forget; UI remains responsive
    renderDynamicTools();
    // Example Request Section
    const exampleSection = docsContainer.createDiv("mcp-docs-section");
    exampleSection.createEl("h4", {
        text: t("Example Request"),
        cls: "mcp-docs-subtitle",
    });
    const exampleContainer = exampleSection.createDiv("mcp-example-container");
    // Function to update examples based on selected authentication method
    updateExamples = () => {
        exampleContainer.empty();
        renderExamples();
    };
    const renderExamples = () => {
        // Tab buttons for different examples
        const tabContainer = exampleContainer.createDiv("mcp-example-tabs");
        const curlTab = tabContainer.createEl("button", {
            text: "cURL",
            cls: "mcp-example-tab active",
        });
        const jsTab = tabContainer.createEl("button", {
            text: "JavaScript",
            cls: "mcp-example-tab",
        });
        const pythonTab = tabContainer.createEl("button", {
            text: "Python",
            cls: "mcp-example-tab",
        });
        // Example code blocks
        const exampleCodeContainer = exampleContainer.createDiv("mcp-example-code-container");
        // cURL example
        const curlExample = exampleCodeContainer.createDiv("mcp-example-block active");
        curlExample.createEl("div", { text: "1) Initialize", cls: "mcp-example-subtitle" });
        const curlPreInit = curlExample.createEl("pre", { cls: "mcp-example-code" });
        if (useMethodB) {
            curlPreInit.createEl("code", {
                text: `curl -i -X POST ${endpointUrl} \\
  -H "Authorization: ${bearerWithAppId}" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}'`
            });
        }
        else {
            curlPreInit.createEl("code", {
                text: `curl -i -X POST ${endpointUrl} \\
  -H "Authorization: Bearer ${authToken}" \\
  -H "mcp-app-id: ${appId}" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}'`
            });
        }
        curlExample.createEl("div", { text: "2) Call tool with session id", cls: "mcp-example-subtitle" });
        const curlPreCall = curlExample.createEl("pre", { cls: "mcp-example-code" });
        if (useMethodB) {
            curlPreCall.createEl("code", {
                text: `curl -X POST ${endpointUrl} \\
  -H "Authorization: ${bearerWithAppId}" \\
  -H "mcp-session-id: REPLACE_WITH_SESSION_ID" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"query_tasks","arguments":{"filter":{"completed":false,"priority":5},"limit":10}}}'`
            });
        }
        else {
            curlPreCall.createEl("code", {
                text: `curl -X POST ${endpointUrl} \\
  -H "Authorization: Bearer ${authToken}" \\
  -H "mcp-app-id: ${appId}" \\
  -H "mcp-session-id: REPLACE_WITH_SESSION_ID" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"query_tasks","arguments":{"filter":{"completed":false,"priority":5},"limit":10}}}'`
            });
        }
        // JavaScript example (Init + Call)
        const jsExample = exampleCodeContainer.createDiv("mcp-example-block");
        jsExample.createEl("div", { text: "1) Initialize", cls: "mcp-example-subtitle" });
        const jsPreInit = jsExample.createEl("pre", { cls: "mcp-example-code" });
        if (useMethodB) {
            jsPreInit.createEl("code", {
                text: `const initRes = await fetch('${endpointUrl}', {\n  method: 'POST',\n  headers: {\n    'Authorization': '${bearerWithAppId}',\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' })\n});\nconst sessionId = initRes.headers.get('mcp-session-id');`
            });
        }
        else {
            jsPreInit.createEl("code", {
                text: `const initRes = await fetch('${endpointUrl}', {\n  method: 'POST',\n  headers: {\n    'Authorization': 'Bearer ${authToken}',\n    'mcp-app-id': '${appId}',\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' })\n});\nconst sessionId = initRes.headers.get('mcp-session-id');`
            });
        }
        jsExample.createEl("div", { text: "2) Call tool with session id", cls: "mcp-example-subtitle" });
        const jsPreCall = jsExample.createEl("pre", { cls: "mcp-example-code" });
        if (useMethodB) {
            jsPreCall.createEl("code", {
                text: `const callRes = await fetch('${endpointUrl}', {\n  method: 'POST',\n  headers: {\n    'Authorization': '${bearerWithAppId}',\n    'mcp-session-id': sessionId,\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify({\n    jsonrpc: '2.0',\n    id: 2,\n    method: 'tools/call',\n    params: { name: 'query_tasks', arguments: { filter: { completed: false, priority: 5 }, limit: 10 } }\n  })\n});\nconsole.log(await callRes.json());`
            });
        }
        else {
            jsPreCall.createEl("code", {
                text: `const callRes = await fetch('${endpointUrl}', {\n  method: 'POST',\n  headers: {\n    'Authorization': 'Bearer ${authToken}',\n    'mcp-app-id': '${appId}',\n    'mcp-session-id': sessionId,\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify({\n    jsonrpc: '2.0',\n    id: 2,\n    method: 'tools/call',\n    params: { name: 'query_tasks', arguments: { filter: { completed: false, priority: 5 }, limit: 10 } }\n  })\n});\nconsole.log(await callRes.json());`
            });
        }
        // Python example (Init + Call)
        const pythonExample = exampleCodeContainer.createDiv("mcp-example-block");
        pythonExample.createEl("div", { text: "1) Initialize", cls: "mcp-example-subtitle" });
        const pythonPreInit = pythonExample.createEl("pre", { cls: "mcp-example-code" });
        if (useMethodB) {
            pythonPreInit.createEl("code", {
                text: `import requests

# Initialize session
init_res = requests.post(
    '${endpointUrl}',
    headers={
        'Authorization': '${bearerWithAppId}',
        'Content-Type': 'application/json'
    },
    json={'jsonrpc': '2.0', 'id': 1, 'method': 'initialize'}
)
session_id = init_res.headers.get('mcp-session-id')
print(f"Session ID: {session_id}")`,
            });
        }
        else {
            pythonPreInit.createEl("code", {
                text: `import requests

# Initialize session
init_res = requests.post(
    '${endpointUrl}',
    headers={
        'Authorization': 'Bearer ${authToken}',
        'mcp-app-id': '${appId}',
        'Content-Type': 'application/json'
    },
    json={'jsonrpc': '2.0', 'id': 1, 'method': 'initialize'}
)
session_id = init_res.headers.get('mcp-session-id')
print(f"Session ID: {session_id}")`,
            });
        }
        pythonExample.createEl("div", { text: "2) Call tool with session id", cls: "mcp-example-subtitle" });
        const pythonPreCall = pythonExample.createEl("pre", { cls: "mcp-example-code" });
        if (useMethodB) {
            pythonPreCall.createEl("code", {
                text: `# Call tool
call_res = requests.post(
    '${endpointUrl}',
    headers={
        'Authorization': '${bearerWithAppId}',
        'mcp-session-id': session_id,
        'Content-Type': 'application/json'
    },
    json={
        'jsonrpc': '2.0',
        'id': 2,
        'method': 'tools/call',
        'params': {
            'name': 'query_tasks',
            'arguments': {
                'filter': {'completed': False, 'priority': 5},
                'limit': 10
            }
        }
    }
)
print(call_res.json())`,
            });
        }
        else {
            pythonPreCall.createEl("code", {
                text: `# Call tool
call_res = requests.post(
    '${endpointUrl}',
    headers={
        'Authorization': 'Bearer ${authToken}',
        'mcp-app-id': '${appId}',
        'mcp-session-id': session_id,
        'Content-Type': 'application/json'
    },
    json={
        'jsonrpc': '2.0',
        'id': 2,
        'method': 'tools/call',
        'params': {
            'name': 'query_tasks',
            'arguments': {
                'filter': {'completed': False, 'priority': 5},
                'limit': 10
            }
        }
    }
)
print(call_res.json())`,
            });
        }
        // Tab switching logic
        const tabs = [curlTab, jsTab, pythonTab];
        const examples = [curlExample, jsExample, pythonExample];
        tabs.forEach((tab, index) => {
            tab.onclick = () => {
                tabs.forEach(t => t.removeClass("active"));
                examples.forEach(e => e.removeClass("active"));
                tab.addClass("active");
                examples[index].addClass("active");
            };
        });
        // Add copy button for each code block
        examples.forEach((example) => {
            const codeBlocks = example.querySelectorAll("pre.mcp-example-code");
            codeBlocks.forEach((preBlock) => {
                const codeElement = preBlock.querySelector("code");
                if (!codeElement)
                    return;
                const copyBtn = preBlock.createEl("button", {
                    text: t("Copy"),
                    cls: "mcp-example-copy-btn",
                });
                copyBtn.onclick = () => __awaiter(this, void 0, void 0, function* () {
                    const code = codeElement.textContent || "";
                    yield navigator.clipboard.writeText(code);
                    copyBtn.setText(t("Copied!"));
                    copyBtn.addClass("copied");
                    setTimeout(() => {
                        copyBtn.setText(t("Copy"));
                        copyBtn.removeClass("copied");
                    }, 2000);
                });
            });
        });
    };
    // Initial render of examples
    renderExamples();
}
function updateServerStatus(container, mcpManager) {
    container.empty();
    if (!mcpManager) {
        container.createEl("div", {
            text: t("MCP Server not initialized"),
            cls: "mcp-status-error",
        });
        return;
    }
    const status = mcpManager.getStatus();
    const statusEl = container.createDiv("mcp-status");
    // Status Indicator
    const indicatorEl = statusEl.createDiv("mcp-status-indicator");
    indicatorEl.addClass(status.running ? "running" : "stopped");
    indicatorEl.createSpan({
        text: status.running ? "●" : "○",
        cls: "status-dot",
    });
    indicatorEl.createSpan({
        text: status.running ? t("Running") : t("Stopped"),
        cls: "status-text",
    });
    // Status Details
    if (status.running && status.port) {
        const detailsEl = statusEl.createDiv("mcp-status-details");
        detailsEl.createEl("div", {
            text: `${t("Port")}: ${status.port}`,
        });
        if (status.startTime) {
            const uptime = Date.now() - status.startTime.getTime();
            const hours = Math.floor(uptime / 3600000);
            const minutes = Math.floor((uptime % 3600000) / 60000);
            detailsEl.createEl("div", {
                text: `${t("Uptime")}: ${hours}h ${minutes}m`,
            });
        }
        if (status.requestCount !== undefined) {
            detailsEl.createEl("div", {
                text: `${t("Requests")}: ${status.requestCount}`,
            });
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWNwSW50ZWdyYXRpb25TZXR0aW5nc1RhYi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIk1jcEludGVncmF0aW9uU2V0dGluZ3NUYWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0dBRUc7O0FBRUgsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDMUUsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRzFDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUMzRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbkUsT0FBTyw4QkFBOEIsQ0FBQztBQUV0QyxTQUFTLGlCQUFpQixDQUN6QixTQUFzQixFQUN0QixNQUFXLEVBQ1gsS0FBYTtJQUViLE1BQU0sY0FBYyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUUvRCxvQkFBb0I7SUFDcEIsTUFBTSxTQUFTLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUU7UUFDaEQsR0FBRyxFQUFFLGlCQUFpQjtLQUN0QixDQUFDLENBQUM7SUFDSCxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFaEQsb0NBQW9DO0lBRXBDLHFCQUFxQjtJQUNyQixNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRTtRQUNqRCxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUNmLEdBQUcsRUFBRSxjQUFjO0tBQ25CLENBQUMsQ0FBQztJQUNILHFDQUFxQztJQUVyQyxPQUFPLENBQUMsT0FBTyxHQUFHLEdBQVMsRUFBRTtRQUM1QixNQUFNLFNBQVMsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JFLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDOUIsT0FBTyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMzQixVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ2YsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUMzQixPQUFPLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQy9CLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNWLENBQUMsQ0FBQSxDQUFDO0lBRUYsNEJBQTRCO0FBQzdCLENBQUM7QUFFRCxNQUFNLFVBQVUsK0JBQStCLENBQzlDLFdBQXdCLEVBQ3hCLE1BQTZCLEVBQzdCLG1CQUErQjs7SUFFL0IsdUJBQXVCO0lBQ3ZCLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFO1FBQzNCLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFO1lBQzNCLElBQUksRUFBRSxDQUFDLENBQUMsOENBQThDLENBQUM7WUFDdkQsR0FBRyxFQUFFLDBCQUEwQjtTQUMvQixDQUFDLENBQUM7UUFDSCxPQUFPO0tBQ1A7SUFFRCxNQUFNLFVBQVUsR0FBSSxNQUFnQyxDQUFDLGdCQUV6QyxDQUFDO0lBRWIsd0JBQXdCO0lBQ3hCLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFDLENBQUMsQ0FBQztJQUUzRCxNQUFNLGVBQWUsR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLENBQUM7SUFDdEUsa0JBQWtCLENBQUMsZUFBZSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBRWhELHdCQUF3QjtJQUN4QixJQUFJLE9BQU8sQ0FBQyxXQUFXLENBQUM7U0FDdEIsT0FBTyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1NBQy9CLE9BQU8sQ0FBQyxDQUFDLENBQUMseURBQXlELENBQUMsQ0FBQztTQUNyRSxTQUFTLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTs7UUFDckIsTUFBTTthQUNKLFFBQVEsQ0FBQyxDQUFBLE1BQUEsTUFBTSxDQUFDLFFBQVEsQ0FBQyxjQUFjLDBDQUFFLE9BQU8sS0FBSSxLQUFLLENBQUM7YUFDMUQsUUFBUSxDQUFDLENBQU8sS0FBSyxFQUFFLEVBQUU7WUFDekIsNkNBQTZDO1lBQzdDLElBQUksS0FBSyxFQUFFO2dCQUNWLE1BQU0sS0FBSyxHQUFHLElBQUksWUFBWSxDQUFDLE1BQU0sRUFBRTtvQkFDdEMsS0FBSyxFQUFFLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQztvQkFDN0IsT0FBTyxFQUFFLENBQUMsQ0FBQyxpY0FBaWMsQ0FBQztvQkFDN2MsV0FBVyxFQUFFLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQztvQkFDbkMsVUFBVSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUM7b0JBQ3ZCLFNBQVMsRUFBRSxDQUFPLFNBQVMsRUFBRSxFQUFFO3dCQUM5QixJQUFJLFNBQVMsRUFBRTs0QkFDZCx3Q0FBd0M7NEJBQ3hDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRTtnQ0FDcEMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxjQUFjLEdBQUc7b0NBQ2hDLE9BQU8sRUFBRSxJQUFJO29DQUNiLElBQUksRUFBRSxJQUFJO29DQUNWLElBQUksRUFBRSxXQUFXO29DQUNqQixTQUFTLEVBQUUsY0FBYyxDQUFDLGFBQWEsRUFBRTtvQ0FDekMsVUFBVSxFQUFFLElBQUk7b0NBQ2hCLFFBQVEsRUFBRSxNQUFNO2lDQUNoQixDQUFDOzZCQUNGO2lDQUFNO2dDQUNOLE1BQU0sQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7NkJBQzlDOzRCQUVELE1BQU0sTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDOzRCQUU1QixJQUFJLFVBQVUsRUFBRTtnQ0FDZixNQUFNLFVBQVUsQ0FBQyxZQUFZLENBQUMsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztnQ0FDL0Msa0JBQWtCLENBQUMsZUFBZSxFQUFFLFVBQVUsQ0FBQyxDQUFDOzZCQUNoRDs0QkFFRCxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDOzRCQUN0QixJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsNERBQTRELENBQUMsQ0FBQyxDQUFDO3lCQUM1RTs2QkFBTTs0QkFDTixnQ0FBZ0M7NEJBQ2hDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7eUJBQ3ZCO29CQUNGLENBQUMsQ0FBQTtpQkFDRCxDQUFDLENBQUM7Z0JBQ0gsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO2FBQ2I7aUJBQU07Z0JBQ04sc0NBQXNDO2dCQUN0QyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFO29CQUNuQyxNQUFNLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO2lCQUMvQztnQkFFRCxNQUFNLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFFNUIsSUFBSSxVQUFVLEVBQUU7b0JBQ2YsTUFBTSxVQUFVLENBQUMsWUFBWSxDQUFDLEVBQUMsT0FBTyxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUM7b0JBQ2hELGtCQUFrQixDQUFDLGVBQWUsRUFBRSxVQUFVLENBQUMsQ0FBQztpQkFDaEQ7YUFDRDtRQUNGLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVKLHVCQUF1QjtJQUN2QixXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFDLElBQUksRUFBRSxDQUFDLENBQUMsc0JBQXNCLENBQUMsRUFBQyxDQUFDLENBQUM7SUFFOUQsZUFBZTtJQUNmLElBQUksT0FBTyxDQUFDLFdBQVcsQ0FBQztTQUN0QixPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ2xCLE9BQU8sQ0FBQyxDQUFDLENBQUMsK0VBQStFLENBQUMsQ0FBQztTQUMzRixXQUFXLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTs7UUFDekIsUUFBUTthQUNOLFNBQVMsQ0FBQyxXQUFXLEVBQUUsd0JBQXdCLENBQUM7YUFDaEQsU0FBUyxDQUFDLFNBQVMsRUFBRSxnREFBZ0QsQ0FBQzthQUN0RSxRQUFRLENBQUMsQ0FBQSxNQUFBLE1BQU0sQ0FBQyxRQUFRLENBQUMsY0FBYywwQ0FBRSxJQUFJLEtBQUksV0FBVyxDQUFDO2FBQzdELFFBQVEsQ0FBQyxDQUFPLEtBQUssRUFBRSxFQUFFO1lBQ3pCLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGNBQWM7Z0JBQUUsT0FBTztZQUU1QyxvREFBb0Q7WUFDcEQsSUFBSSxLQUFLLEtBQUssU0FBUyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUU7Z0JBQzdFLE1BQU0sS0FBSyxHQUFHLElBQUksWUFBWSxDQUFDLE1BQU0sRUFBRTtvQkFDdEMsS0FBSyxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQztvQkFDNUIsT0FBTyxFQUFFLENBQUMsQ0FBQyxzYkFBc2IsQ0FBQztvQkFDbGMsV0FBVyxFQUFFLENBQUMsQ0FBQyw2QkFBNkIsQ0FBQztvQkFDN0MsVUFBVSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUM7b0JBQ3ZCLFNBQVMsRUFBRSxDQUFPLFNBQVMsRUFBRSxFQUFFOzt3QkFDOUIsSUFBSSxTQUFTLEVBQUU7NEJBQ2QsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRTtnQ0FDbkMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQztnQ0FDNUMsbUJBQW1CLEVBQUUsQ0FBQzs2QkFDdEI7NEJBQ0QsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLDJFQUEyRSxDQUFDLENBQUMsQ0FBQzt5QkFDM0Y7NkJBQU07NEJBQ04sb0NBQW9DOzRCQUNwQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUEsTUFBQSxNQUFNLENBQUMsUUFBUSxDQUFDLGNBQWMsMENBQUUsSUFBSSxLQUFJLFdBQVcsQ0FBQyxDQUFDO3lCQUN2RTtvQkFDRixDQUFDLENBQUE7aUJBRUQsQ0FBQyxDQUFDO2dCQUNILEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQzthQUNiO2lCQUFNO2dCQUNOLHdEQUF3RDtnQkFDeEQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQztnQkFDNUMsbUJBQW1CLEVBQUUsQ0FBQzthQUN0QjtRQUNGLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVKLGVBQWU7SUFDZixJQUFJLE9BQU8sQ0FBQyxXQUFXLENBQUM7U0FDdEIsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUNsQixPQUFPLENBQUMsQ0FBQyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7U0FDaEQsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7O1FBQ2pCLElBQUk7YUFDRixjQUFjLENBQUMsTUFBTSxDQUFDO2FBQ3RCLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQSxNQUFBLE1BQU0sQ0FBQyxRQUFRLENBQUMsY0FBYywwQ0FBRSxJQUFJLEtBQUksSUFBSSxDQUFDLENBQUM7YUFDOUQsUUFBUSxDQUFDLENBQU8sS0FBSyxFQUFFLEVBQUU7WUFDekIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsY0FBYztnQkFBRSxPQUFPO1lBQzVDLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM3QixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLElBQUksSUFBSSxHQUFHLEtBQUssRUFBRTtnQkFDN0MsTUFBTSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztnQkFDM0MsbUJBQW1CLEVBQUUsQ0FBQzthQUN0QjtRQUNGLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVKLHlCQUF5QjtJQUN6QixXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFDLElBQUksRUFBRSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsRUFBQyxDQUFDLENBQUM7SUFFeEQscUJBQXFCO0lBQ3JCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxPQUFPLENBQUMsV0FBVyxDQUFDO1NBQy9DLE9BQU8sQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsQ0FBQztTQUNsQyxPQUFPLENBQ1AsQ0FBQyxDQUFDLGlFQUFpRSxDQUFDLENBQ3BFLENBQUM7SUFFSCxNQUFNLFVBQVUsR0FBRyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRTtRQUMvRCxJQUFJLEVBQUUsVUFBVTtRQUNoQixLQUFLLEVBQUUsQ0FBQSxNQUFBLE1BQU0sQ0FBQyxRQUFRLENBQUMsY0FBYywwQ0FBRSxTQUFTLEtBQUksRUFBRTtRQUN0RCxHQUFHLEVBQUUsaUJBQWlCO0tBQ3RCLENBQUMsQ0FBQztJQUVILFVBQVUsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO0lBRTNCLHlCQUF5QjtJQUN6QixnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtRQUNyQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUU7WUFDNUMsSUFBSSxVQUFVLENBQUMsSUFBSSxLQUFLLFVBQVUsRUFBRTtnQkFDbkMsVUFBVSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUM7Z0JBQ3pCLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7YUFDaEM7aUJBQU07Z0JBQ04sVUFBVSxDQUFDLElBQUksR0FBRyxVQUFVLENBQUM7Z0JBQzdCLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7YUFDaEM7UUFDRixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsb0JBQW9CO0lBQ3BCLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1FBQ3JDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQVMsRUFBRTtZQUNsRCxNQUFNLFNBQVMsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN0RCxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDO1FBQzVDLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILDBCQUEwQjtJQUMxQixnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtRQUNyQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFTLEVBQUU7WUFDeEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsY0FBYyxJQUFJLENBQUMsVUFBVTtnQkFBRSxPQUFPO1lBRTNELE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQ2xELFVBQVUsQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDO1lBQzVCLE1BQU0sTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQzVCLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7UUFDdEMsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsb0JBQW9CO0lBQ3BCLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFDLENBQUMsQ0FBQztJQUUzRCxlQUFlO0lBQ2YsSUFBSSxPQUFPLENBQUMsV0FBVyxDQUFDO1NBQ3RCLE9BQU8sQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUM7U0FDekIsT0FBTyxDQUFDLENBQUMsQ0FBQyx3REFBd0QsQ0FBQyxDQUFDO1NBQ3BFLFNBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFOztRQUNyQixNQUFNO2FBQ0osUUFBUSxDQUFDLE1BQUEsTUFBQSxNQUFNLENBQUMsUUFBUSxDQUFDLGNBQWMsMENBQUUsVUFBVSxtQ0FBSSxJQUFJLENBQUM7YUFDNUQsUUFBUSxDQUFDLENBQU8sS0FBSyxFQUFFLEVBQUU7WUFDekIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsY0FBYztnQkFBRSxPQUFPO1lBQzVDLE1BQU0sQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUM7WUFDbEQsbUJBQW1CLEVBQUUsQ0FBQztRQUN2QixDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSixvQkFBb0I7SUFDcEIsSUFBSSxPQUFPLENBQUMsV0FBVyxDQUFDO1NBQ3RCLE9BQU8sQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7U0FDdkIsT0FBTyxDQUFDLENBQUMsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO1NBQzdDLFdBQVcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFOztRQUN6QixRQUFRO2FBQ04sU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDOUIsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7YUFDL0IsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDNUIsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDOUIsUUFBUSxDQUFDLENBQUEsTUFBQSxNQUFNLENBQUMsUUFBUSxDQUFDLGNBQWMsMENBQUUsUUFBUSxLQUFJLE1BQU0sQ0FBQzthQUM1RCxRQUFRLENBQUMsQ0FBTyxLQUFVLEVBQUUsRUFBRTtZQUM5QixJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxjQUFjO2dCQUFFLE9BQU87WUFDNUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQztZQUNoRCxtQkFBbUIsRUFBRSxDQUFDO1FBQ3ZCLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVKLGlCQUFpQjtJQUNqQixXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFDLElBQUksRUFBRSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsRUFBQyxDQUFDLENBQUM7SUFFeEQsTUFBTSxnQkFBZ0IsR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFDLHVCQUF1QixDQUFDLENBQUM7SUFFeEUseUJBQXlCO0lBQ3pCLElBQUksT0FBTyxDQUFDLGdCQUFnQixDQUFDO1NBQzNCLE9BQU8sQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQztTQUM3QixPQUFPLENBQUMsQ0FBQyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7U0FDNUMsU0FBUyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7UUFDckIsTUFBTTthQUNKLGFBQWEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDeEIsT0FBTyxDQUFDLEdBQVMsRUFBRTs7WUFDbkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN6QixNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1lBRXRDLElBQUk7Z0JBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDO2dCQUN0RCxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUNqRCxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUNqRCxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUV6Qyw2QkFBNkI7Z0JBQzdCLE9BQU8sQ0FBQyxHQUFHLENBQUMsMENBQTBDLENBQUMsQ0FBQztnQkFDeEQsTUFBTSxTQUFTLEdBQUcsTUFBTSxVQUFVLENBQUM7b0JBQ2xDLEdBQUcsRUFBRSxVQUFVLENBQUEsTUFBQSxNQUFNLENBQUMsUUFBUSxDQUFDLGNBQWMsMENBQUUsSUFBSSxLQUFJLFdBQVcsSUFBSSxDQUFBLE1BQUEsTUFBTSxDQUFDLFFBQVEsQ0FBQyxjQUFjLDBDQUFFLElBQUksS0FBSSxJQUFJLFNBQVM7b0JBQzNILE1BQU0sRUFBRSxLQUFLO2lCQUNiLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUU7b0JBQ2QsT0FBTyxDQUFDLEtBQUssQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLENBQUMsQ0FBQztvQkFDdEQsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7Z0JBQ3hELENBQUMsQ0FBQyxDQUFDO2dCQUVILElBQUksQ0FBQyxTQUFTLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxHQUFHLEVBQUU7b0JBQzNDLE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQztpQkFDdkM7Z0JBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO2dCQUU5Qyx5REFBeUQ7Z0JBQ3pELE9BQU8sQ0FBQyxHQUFHLENBQUMsb0RBQW9ELENBQUMsQ0FBQztnQkFDbEUsTUFBTSxPQUFPLEdBQUcsTUFBTSxVQUFVLENBQUM7b0JBQ2hDLEdBQUcsRUFBRSxTQUFTO29CQUNkLE1BQU0sRUFBRSxNQUFNO29CQUNkLE9BQU8sRUFBRTt3QkFDUixlQUFlLEVBQUUsZUFBZTt3QkFDaEMsY0FBYyxFQUFFLGtCQUFrQjt3QkFDbEMsUUFBUSxFQUFFLHFDQUFxQzt3QkFDL0Msc0JBQXNCLEVBQUUsWUFBWTtxQkFDcEM7b0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBQyxDQUFDO2lCQUNuRSxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO29CQUNkLE1BQU0sSUFBSSxLQUFLLENBQUMsc0JBQXNCLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO2dCQUN0RCxDQUFDLENBQUMsQ0FBQztnQkFFSCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssR0FBRyxFQUFFO29CQUMzQixNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDO29CQUMvQixNQUFNLElBQUksS0FBSyxDQUFDLGlDQUFpQyxPQUFPLENBQUMsTUFBTSxLQUFLLFNBQVMsRUFBRSxDQUFDLENBQUM7aUJBQ2pGO2dCQUVELDhDQUE4QztnQkFDOUMsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztnQkFDOUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQ0FBaUMsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDekQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBRXBELElBQUksUUFBUSxDQUFDLEtBQUssRUFBRTtvQkFDbkIsTUFBTSxJQUFJLEtBQUssQ0FBQyxjQUFjLFFBQVEsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztpQkFDeEQ7Z0JBRUQsNERBQTREO2dCQUM1RCxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDO29CQUNsRCxPQUFPLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDO3FCQUNqQyxRQUFRLGFBQVIsUUFBUSx1QkFBUixRQUFRLENBQUUsU0FBUyxDQUFBO3FCQUNuQixNQUFBLFFBQVEsYUFBUixRQUFRLHVCQUFSLFFBQVEsQ0FBRSxNQUFNLDBDQUFFLFNBQVMsQ0FBQSxDQUFDO2dCQUU3QixJQUFJLENBQUMsU0FBUyxFQUFFO29CQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsc0NBQXNDLENBQUMsQ0FBQztvQkFDdEQsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO2lCQUMxQztnQkFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLDRCQUE0QixFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUVyRCxxQkFBcUI7Z0JBQ3JCLE9BQU8sQ0FBQyxHQUFHLENBQUMscUNBQXFDLENBQUMsQ0FBQztnQkFDbkQsTUFBTSxRQUFRLEdBQUcsTUFBTSxVQUFVLENBQUM7b0JBQ2pDLEdBQUcsRUFBRSxTQUFTO29CQUNkLE1BQU0sRUFBRSxNQUFNO29CQUNkLE9BQU8sRUFBRTt3QkFDUixlQUFlLEVBQUUsZUFBZTt3QkFDaEMsZ0JBQWdCLEVBQUUsU0FBUzt3QkFDM0IsY0FBYyxFQUFFLGtCQUFrQjt3QkFDbEMsUUFBUSxFQUFFLHFDQUFxQzt3QkFDL0Msc0JBQXNCLEVBQUUsWUFBWTtxQkFDcEM7b0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBQyxDQUFDO2lCQUNuRSxDQUFDLENBQUM7Z0JBRUgsOENBQThDO2dCQUM5QyxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDO2dCQUNoQyxPQUFPLENBQUMsR0FBRyxDQUFDLDRCQUE0QixFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUVyRCxJQUFJLFNBQVMsQ0FBQyxLQUFLLEVBQUU7b0JBQ3BCLE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLFNBQVMsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztpQkFDaEU7Z0JBRUQsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLG9EQUFvRCxDQUFDLENBQUMsQ0FBQztnQkFDcEUsT0FBTyxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO2FBRTVDO1lBQUMsT0FBTyxLQUFVLEVBQUU7Z0JBQ3BCLE9BQU8sQ0FBQyxLQUFLLENBQUMseUJBQXlCLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ2hELElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUMxRDtvQkFBUztnQkFDVCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUMxQixNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2FBQ2hDO1FBQ0YsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUosd0JBQXdCO0lBQ3hCLElBQUksT0FBTyxDQUFDLGdCQUFnQixDQUFDO1NBQzNCLE9BQU8sQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztTQUM1QixPQUFPLENBQUMsQ0FBQyxDQUFDLGlDQUFpQyxDQUFDLENBQUM7U0FDN0MsU0FBUyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7UUFDckIsTUFBTTthQUNKLGFBQWEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7YUFDM0IsTUFBTSxFQUFFO2FBQ1IsT0FBTyxDQUFDLEdBQVMsRUFBRTtZQUNuQixJQUFJLENBQUMsVUFBVTtnQkFBRSxPQUFPO1lBQ3hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDekIsSUFBSTtnQkFDSCxNQUFNLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQztnQkFDdEMsa0JBQWtCLENBQUMsZUFBZSxFQUFFLFVBQVUsQ0FBQyxDQUFDO2FBQ2hEO1lBQUMsT0FBTyxLQUFVLEVBQUU7Z0JBQ3BCLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUM1RDtvQkFBUztnQkFDVCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQzFCO1FBQ0YsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQztRQUNGLGlDQUFpQztTQUNoQyxTQUFTLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtRQUNyQixNQUFNO2FBQ0osYUFBYSxDQUFDLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO2FBQzNDLE9BQU8sQ0FBQyxHQUFTLEVBQUU7WUFDbkIsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsY0FBYztnQkFBRSxPQUFPO1lBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDekIsSUFBSTtnQkFDSCxNQUFNLFNBQVMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3BFLElBQUksU0FBUyxHQUFHLFNBQVMsQ0FBQztnQkFDMUIsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDO2dCQUNsQixtRkFBbUY7Z0JBQ25GLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUU7b0JBQzVCLElBQUk7d0JBQ0gsTUFBTSxVQUFVLENBQUMsWUFBWSxDQUFDLEVBQUMsSUFBSSxFQUFFLFNBQVMsRUFBQyxDQUFDLENBQUM7d0JBQ2pELEtBQUssR0FBRyxJQUFJLENBQUM7d0JBQ2IsTUFBTTtxQkFDTjtvQkFBQyxXQUFNO3dCQUNQLFNBQVMsRUFBRSxDQUFDO3FCQUNaO2lCQUNEO2dCQUNELElBQUksS0FBSyxFQUFFO29CQUNWLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO29CQUN0RCxrQkFBa0IsQ0FBQyxlQUFlLEVBQUUsVUFBVSxDQUFDLENBQUM7aUJBQ2hEO3FCQUFNO29CQUNOLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDLENBQUM7aUJBQ2xEO2FBQ0Q7b0JBQVM7Z0JBQ1QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUMxQjtRQUNGLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVKLHVCQUF1QjtJQUN2QixXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFDLElBQUksRUFBRSxDQUFDLENBQUMsc0JBQXNCLENBQUMsRUFBQyxDQUFDLENBQUM7SUFFOUQsTUFBTSxlQUFlLEdBQUcsV0FBVyxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0lBRXRFLCtCQUErQjtJQUMvQixJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsQ0FBQyxzQkFBc0I7SUFFN0MsbUNBQW1DO0lBQ25DLElBQUksbUJBQStCLENBQUM7SUFDcEMsSUFBSSxjQUEwQixDQUFDO0lBRS9CLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxPQUFPLENBQUMsZUFBZSxDQUFDO1NBQ3BELE9BQU8sQ0FBQyxDQUFDLENBQUMsdUJBQXVCLENBQUMsQ0FBQztTQUNuQyxPQUFPLENBQUMsQ0FBQyxDQUFDLDREQUE0RCxDQUFDLENBQUM7U0FDeEUsV0FBVyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7UUFDekIsUUFBUTthQUNOLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLHlDQUF5QyxDQUFDLENBQUM7YUFDbEUsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsMEJBQTBCLENBQUMsQ0FBQzthQUNuRCxRQUFRLENBQUMsU0FBUyxDQUFDO2FBQ25CLFFBQVEsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ25CLFVBQVUsR0FBRyxLQUFLLEtBQUssU0FBUyxDQUFDO1lBQ2pDLG1CQUFtQixFQUFFLENBQUM7WUFDdEIsSUFBSSxjQUFjO2dCQUFFLGNBQWMsRUFBRSxDQUFDO1FBQ3RDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSixtREFBbUQ7SUFDbkQsNEVBQTRFO0lBQzVFLE1BQU0sVUFBVSxHQUFHLENBQUEsTUFBQSxNQUFNLENBQUMsUUFBUSxDQUFDLGNBQWMsMENBQUUsSUFBSSxLQUFJLFdBQVcsQ0FBQztJQUN2RSxNQUFNLFdBQVcsR0FBRyxVQUFVLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLDJEQUEyRDtJQUNwSSxNQUFNLFNBQVMsR0FBRyxVQUFVLFdBQVcsSUFBSSxDQUFBLE1BQUEsTUFBTSxDQUFDLFFBQVEsQ0FBQyxjQUFjLDBDQUFFLElBQUksS0FBSSxJQUFJLE1BQU0sQ0FBQztJQUU5RixNQUFNLFNBQVMsR0FBRyxDQUFBLE1BQUEsTUFBTSxDQUFDLFFBQVEsQ0FBQyxjQUFjLDBDQUFFLFNBQVMsS0FBSSxFQUFFLENBQUM7SUFDbEUsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDN0MsdUVBQXVFO0lBQ3ZFLE1BQU0sUUFBUSxHQUFHLEdBQUcsU0FBUyxDQUFDLFdBQVcsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDO0lBQy9HLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO0lBQy9CLE1BQU0sZUFBZSxHQUFHLFVBQVUsU0FBUyxJQUFJLEtBQUssRUFBRSxDQUFDO0lBRXZELHVDQUF1QztJQUN2QyxNQUFNLG9CQUFvQixHQUFHLGVBQWUsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUMzRSxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFO1FBQ3BDLElBQUksRUFBRSxDQUFDLENBQUMsbUNBQW1DLENBQUM7UUFDNUMsR0FBRyxFQUFFLDBCQUEwQjtLQUMvQixDQUFDLENBQUM7SUFDSCxNQUFNLFFBQVEsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFO1FBQ3BELEdBQUcsRUFBRSxlQUFlO0tBQ3BCLENBQUMsQ0FBQztJQUVILFdBQVc7SUFDWCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzVDLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUMsSUFBSSxFQUFFLDJCQUEyQixFQUFDLENBQUMsQ0FBQztJQUNwRSxXQUFXLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzVCLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUMsSUFBSSxFQUFFLGVBQWUsS0FBSyxFQUFFLEVBQUMsQ0FBQyxDQUFDO0lBQzdELFdBQVcsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDOUIsV0FBVyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBQyxJQUFJLEVBQUUseUJBQXlCLFNBQVMsRUFBRSxFQUFDLENBQUMsQ0FBQztJQUUzRSxXQUFXO0lBQ1gsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM1QyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFDLElBQUksRUFBRSw2QkFBNkIsRUFBQyxDQUFDLENBQUM7SUFDdEUsV0FBVyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM1QixXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFDLElBQUksRUFBRSx5QkFBeUIsU0FBUyxJQUFJLEtBQUssRUFBRSxFQUFDLENBQUMsQ0FBQztJQUVwRixnRUFBZ0U7SUFDaEUsTUFBTSxzQkFBc0IsR0FBRyxlQUFlLENBQUMsU0FBUyxDQUFDLDhCQUE4QixDQUFDLENBQUM7SUFFekYsK0RBQStEO0lBQy9ELE1BQU0scUJBQXFCLEdBQUcsR0FBRyxFQUFFO1FBQ2xDLElBQUksVUFBVSxFQUFFO1lBQ2Ysa0NBQWtDO1lBQ2xDLE9BQU87Z0JBQ047b0JBQ0MsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsTUFBTSxFQUFFO3dCQUNQLFVBQVUsRUFBRTs0QkFDWCxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dDQUNYLEdBQUcsRUFBRSxTQUFTO2dDQUNkLE9BQU8sRUFBRTtvQ0FDUixhQUFhLEVBQUUsZUFBZTtpQ0FDOUI7NkJBQ0Q7eUJBQ0Q7cUJBQ0Q7aUJBQ0Q7Z0JBQ0Q7b0JBQ0MsSUFBSSxFQUFFLGdCQUFnQjtvQkFDdEIsTUFBTSxFQUFFO3dCQUNQLFVBQVUsRUFBRTs0QkFDWCxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dDQUNYLE9BQU8sRUFBRSxNQUFNO2dDQUNmLElBQUksRUFBRTtvQ0FDTCxJQUFJLEVBQUUsTUFBTTtvQ0FDWixJQUFJLEVBQUUsa0JBQWtCLGVBQWUsRUFBRTtvQ0FDekMsSUFBSSxFQUFFLGdDQUFnQztvQ0FDdEMsWUFBWSxFQUFFLElBQUk7b0NBQ2xCLFNBQVM7aUNBQ1Q7NkJBQ0Q7eUJBQ0Q7cUJBQ0Q7aUJBQ0Q7Z0JBQ0Q7b0JBQ0MsSUFBSSxFQUFFLGFBQWE7b0JBQ25CLFdBQVcsRUFBRSxtQ0FBbUMsUUFBUSxJQUFJLFNBQVMsNkJBQTZCLGVBQWUsR0FBRztpQkFDcEg7Z0JBQ0Q7b0JBQ0MsSUFBSSxFQUFFLFNBQVM7b0JBQ2YsTUFBTSxFQUFFO3dCQUNQLEdBQUcsRUFBRTs0QkFDSixPQUFPLEVBQUU7Z0NBQ1IsQ0FBQyxRQUFRLENBQUMsRUFBRTtvQ0FDWCxJQUFJLEVBQUUsTUFBTTtvQ0FDWixHQUFHLEVBQUUsU0FBUztvQ0FDZCxPQUFPLEVBQUU7d0NBQ1IsYUFBYSxFQUFFLGVBQWU7cUNBQzlCO2lDQUNEOzZCQUNEO3lCQUNEO3FCQUNEO2lCQUNEO2dCQUNEO29CQUNDLElBQUksRUFBRSxVQUFVO29CQUNoQixNQUFNLEVBQUU7d0JBQ1AsVUFBVSxFQUFFOzRCQUNYLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0NBQ1gsU0FBUyxFQUFFLFNBQVM7Z0NBQ3BCLE9BQU8sRUFBRTtvQ0FDUixhQUFhLEVBQUUsZUFBZTtpQ0FDOUI7NkJBQ0Q7eUJBQ0Q7cUJBQ0Q7aUJBQ0Q7Z0JBQ0Q7b0JBQ0MsSUFBSSxFQUFFLEtBQUs7b0JBQ1gsTUFBTSxFQUFFO3dCQUNQLGVBQWUsRUFBRTs0QkFDaEIsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQ0FDWCxPQUFPLEVBQUU7b0NBQ1IsSUFBSSxFQUFFLE1BQU07b0NBQ1osSUFBSSxFQUFFO3dDQUNMLElBQUksRUFBRSxNQUFNO3dDQUNaLElBQUksRUFBRSxrQkFBa0IsZUFBZSxFQUFFO3dDQUN6QyxJQUFJLEVBQUUsZ0NBQWdDO3dDQUN0QyxZQUFZLEVBQUUsSUFBSTt3Q0FDbEIsU0FBUztxQ0FDVDtpQ0FDRDtnQ0FDRCxRQUFRLEVBQUUsRUFBRTs2QkFDWjt5QkFDRDtxQkFDRDtpQkFDRDthQUNELENBQUM7U0FDRjthQUFNO1lBQ04sMkJBQTJCO1lBQzNCLE9BQU87Z0JBQ047b0JBQ0MsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsTUFBTSxFQUFFO3dCQUNQLFVBQVUsRUFBRTs0QkFDWCxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dDQUNYLEdBQUcsRUFBRSxTQUFTO2dDQUNkLE9BQU8sRUFBRTtvQ0FDUixhQUFhLEVBQUUsVUFBVSxTQUFTLEVBQUU7b0NBQ3BDLFlBQVksRUFBRSxLQUFLO2lDQUNuQjs2QkFDRDt5QkFDRDtxQkFDRDtpQkFDRDtnQkFDRDtvQkFDQyxJQUFJLEVBQUUsZ0JBQWdCO29CQUN0QixNQUFNLEVBQUU7d0JBQ1AsVUFBVSxFQUFFOzRCQUNYLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0NBQ1gsT0FBTyxFQUFFLE1BQU07Z0NBQ2YsSUFBSSxFQUFFO29DQUNMLElBQUksRUFBRSxNQUFNO29DQUNaLElBQUksRUFBRSx5QkFBeUIsU0FBUyxFQUFFO29DQUMxQyxJQUFJLEVBQUUsZUFBZSxLQUFLLEVBQUU7b0NBQzVCLElBQUksRUFBRSxnQ0FBZ0M7b0NBQ3RDLFlBQVksRUFBRSxJQUFJO29DQUNsQixTQUFTO2lDQUNUOzZCQUNEO3lCQUNEO3FCQUNEO2lCQUNEO2dCQUNEO29CQUNDLElBQUksRUFBRSxhQUFhO29CQUNuQixXQUFXLEVBQUUsbUNBQW1DLFFBQVEsSUFBSSxTQUFTLG9DQUFvQyxTQUFTLDJCQUEyQixLQUFLLEdBQUc7aUJBQ3JKO2dCQUNEO29CQUNDLElBQUksRUFBRSxTQUFTO29CQUNmLE1BQU0sRUFBRTt3QkFDUCxHQUFHLEVBQUU7NEJBQ0osT0FBTyxFQUFFO2dDQUNSLENBQUMsUUFBUSxDQUFDLEVBQUU7b0NBQ1gsSUFBSSxFQUFFLE1BQU07b0NBQ1osR0FBRyxFQUFFLFNBQVM7b0NBQ2QsT0FBTyxFQUFFO3dDQUNSLGFBQWEsRUFBRSxVQUFVLFNBQVMsRUFBRTt3Q0FDcEMsWUFBWSxFQUFFLEtBQUs7cUNBQ25CO2lDQUNEOzZCQUNEO3lCQUNEO3FCQUNEO2lCQUNEO2dCQUNEO29CQUNDLElBQUksRUFBRSxVQUFVO29CQUNoQixNQUFNLEVBQUU7d0JBQ1AsVUFBVSxFQUFFOzRCQUNYLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0NBQ1gsU0FBUyxFQUFFLFNBQVM7Z0NBQ3BCLE9BQU8sRUFBRTtvQ0FDUixhQUFhLEVBQUUsVUFBVSxTQUFTLEVBQUU7b0NBQ3BDLFlBQVksRUFBRSxLQUFLO2lDQUNuQjs2QkFDRDt5QkFDRDtxQkFDRDtpQkFDRDtnQkFDRDtvQkFDQyxJQUFJLEVBQUUsS0FBSztvQkFDWCxNQUFNLEVBQUU7d0JBQ1AsZUFBZSxFQUFFOzRCQUNoQixDQUFDLFFBQVEsQ0FBQyxFQUFFO2dDQUNYLE9BQU8sRUFBRTtvQ0FDUixJQUFJLEVBQUUsTUFBTTtvQ0FDWixJQUFJLEVBQUU7d0NBQ0wsSUFBSSxFQUFFLE1BQU07d0NBQ1osSUFBSSxFQUFFLHlCQUF5QixTQUFTLEVBQUU7d0NBQzFDLElBQUksRUFBRSxlQUFlLEtBQUssRUFBRTt3Q0FDNUIsSUFBSSxFQUFFLGdDQUFnQzt3Q0FDdEMsWUFBWSxFQUFFLElBQUk7d0NBQ2xCLFNBQVM7cUNBQ1Q7aUNBQ0Q7Z0NBQ0QsUUFBUSxFQUFFLEVBQUU7NkJBQ1o7eUJBQ0Q7cUJBQ0Q7aUJBQ0Q7YUFDRCxDQUFDO1NBQ0Y7SUFDRixDQUFDLENBQUM7SUFFRiwyQ0FBMkM7SUFDM0MsbUJBQW1CLEdBQUcsR0FBRyxFQUFFO1FBQzFCLHNCQUFzQixDQUFDLEtBQUssRUFBRSxDQUFDO1FBQy9CLE1BQU0sYUFBYSxHQUFHLHFCQUFxQixFQUFFLENBQUM7UUFFOUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUM5QixNQUFNLE9BQU8sR0FBRyxzQkFBc0IsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsQ0FBQztZQUV2RSw0QkFBNEI7WUFDNUIsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1lBRXRELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDNUMsT0FBTyxDQUFDLEtBQUssRUFBRSxlQUFlLENBQUMsQ0FBQztZQUVoQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRTtnQkFDdkIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJO2dCQUNqQixHQUFHLEVBQUUsaUJBQWlCO2FBQ3RCLENBQUMsQ0FBQztZQUVILE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsQ0FBQztZQUN4RCx5QkFBeUI7WUFFekIseUJBQXlCO1lBQ3pCLElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQztZQUN2QixNQUFNLENBQUMsT0FBTyxHQUFHLEdBQUcsRUFBRTtnQkFDckIsVUFBVSxHQUFHLENBQUMsVUFBVSxDQUFDO2dCQUN6QixJQUFJLFVBQVUsRUFBRTtvQkFDZixPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDbEMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7aUJBQ2hDO3FCQUFNO29CQUNOLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUNyQyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztpQkFDbkM7WUFDRixDQUFDLENBQUM7WUFFRiw0QkFBNEI7WUFDNUIsSUFBSSxNQUFNLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRTtnQkFDN0IsbUNBQW1DO2dCQUNuQyxNQUFNLG9CQUFvQixHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsNEJBQTRCLENBQUMsQ0FBQztnQkFDN0Usb0JBQW9CLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRTtvQkFDbkMsSUFBSSxFQUFFLENBQUMsQ0FBQyxlQUFlLENBQUM7b0JBQ3hCLEdBQUcsRUFBRSxtQkFBbUI7aUJBQ3hCLENBQUMsQ0FBQztnQkFFSCx5Q0FBeUM7Z0JBQ3pDLE1BQU0sWUFBWSxHQUFHO29CQUNwQixHQUFHLEVBQUUsU0FBUztvQkFDZCxPQUFPLEVBQUU7d0JBQ1IsYUFBYSxFQUFFLGVBQWU7cUJBQzlCO2lCQUNELENBQUM7Z0JBRUYsa0NBQWtDO2dCQUNsQyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO2dCQUN6RCxNQUFNLGNBQWMsR0FBRyx1REFBdUQsa0JBQWtCLENBQUMsUUFBUSxDQUFDLFdBQVcsYUFBYSxFQUFFLENBQUM7Z0JBRXJJLGtDQUFrQztnQkFDbEMsTUFBTSxnQkFBZ0IsR0FBRyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsOEJBQThCLENBQUMsQ0FBQztnQkFFeEYsa0JBQWtCO2dCQUNsQixnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFO29CQUM5QixJQUFJLEVBQUUsQ0FBQyxDQUFDLHdFQUF3RSxDQUFDO29CQUNqRixHQUFHLEVBQUUseUJBQXlCO2lCQUM5QixDQUFDLENBQUM7Z0JBRUgsbUVBQW1FO2dCQUNuRSxNQUFNLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFO29CQUNsRCxJQUFJLEVBQUUsY0FBYztvQkFDcEIsR0FBRyxFQUFFLHlCQUF5QjtpQkFDOUIsQ0FBQyxDQUFDO2dCQUVILE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFO29CQUM5QyxJQUFJLEVBQUU7d0JBQ0wsR0FBRyxFQUFFLGtEQUFrRDt3QkFDdkQsR0FBRyxFQUFFLE9BQU8sUUFBUSx1QkFBdUI7d0JBQzNDLE1BQU0sRUFBRSxJQUFJO3FCQUNaO2lCQUNELENBQUMsQ0FBQztnQkFFSCwrQkFBK0I7Z0JBQy9CLE1BQU0saUJBQWlCLEdBQUcsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLCtCQUErQixDQUFDLENBQUM7Z0JBRXRGLHVCQUF1QjtnQkFDdkIsTUFBTSxlQUFlLEdBQUcsaUJBQWlCLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRTtvQkFDNUQsSUFBSSxFQUFFLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQztvQkFDNUIsR0FBRyxFQUFFLDhCQUE4QjtpQkFDbkMsQ0FBQyxDQUFDO2dCQUVILGVBQWUsQ0FBQyxPQUFPLEdBQUcsR0FBUyxFQUFFO29CQUNwQyxNQUFNLFNBQVMsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO29CQUNwRCxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO29CQUN0QyxlQUFlLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUNuQyxVQUFVLENBQUMsR0FBRyxFQUFFO3dCQUNmLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQzt3QkFDaEQsZUFBZSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDdkMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNWLENBQUMsQ0FBQSxDQUFDO2dCQUVGLGdCQUFnQjtnQkFDaEIsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUU7b0JBQ3RCLEdBQUcsRUFBRSx1QkFBdUI7aUJBQzVCLENBQUMsQ0FBQztnQkFFSCxtQ0FBbUM7Z0JBQ25DLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFO29CQUN0QixJQUFJLEVBQUUsQ0FBQyxDQUFDLHNCQUFzQixDQUFDO29CQUMvQixHQUFHLEVBQUUsbUJBQW1CO2lCQUN4QixDQUFDLENBQUM7Z0JBRUgsOEJBQThCO2dCQUM5QixpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxJQUFJLGdCQUFnQixDQUFDLENBQUM7YUFDMUU7aUJBQU0sSUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFO2dCQUN6QixpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxJQUFJLGdCQUFnQixDQUFDLENBQUM7YUFDMUU7aUJBQU0sSUFBSSxNQUFNLENBQUMsV0FBVyxFQUFFO2dCQUM5Qiw0Q0FBNEM7Z0JBQzVDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FBQztnQkFDdkQsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUU7b0JBQzFDLEdBQUcsRUFBRSxpQkFBaUI7aUJBQ3RCLENBQUMsQ0FBQztnQkFDSCxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUMxQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFFbkMsb0NBQW9DO2dCQUVwQyxxQkFBcUI7Z0JBQ3JCLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFO29CQUMzQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQztvQkFDZixHQUFHLEVBQUUsY0FBYztpQkFDbkIsQ0FBQyxDQUFDO2dCQUNILE9BQU8sQ0FBQyxPQUFPLEdBQUcsR0FBUyxFQUFFO29CQUM1QixNQUFNLFNBQVMsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxXQUFZLENBQUMsQ0FBQztvQkFDekQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztvQkFDOUIsT0FBTyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDM0IsVUFBVSxDQUFDLEdBQUcsRUFBRTt3QkFDZixPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO3dCQUMzQixPQUFPLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUMvQixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ1YsQ0FBQyxDQUFBLENBQUM7Z0JBRUYsNEJBQTRCO2FBQzVCO1FBQ0YsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUM7SUFFRixtQ0FBbUM7SUFDbkMsbUJBQW1CLEVBQUUsQ0FBQztJQUV0QixvQkFBb0I7SUFDcEIsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLEVBQUMsQ0FBQyxDQUFDO0lBRTNELE1BQU0sYUFBYSxHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsQ0FBQztJQUVsRSwwQkFBMEI7SUFDMUIsTUFBTSxlQUFlLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQ3BFLGVBQWUsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFO1FBQzlCLElBQUksRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUM7UUFDMUIsR0FBRyxFQUFFLG1CQUFtQjtLQUN4QixDQUFDLENBQUM7SUFFSCxNQUFNLFdBQVcsR0FBRyxlQUFlLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDbEUsTUFBTSxlQUFlLEdBQUcsV0FBVyxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0lBRXRFLE1BQU0sYUFBYSxHQUFHLGVBQWUsQ0FBQyxVQUFVLENBQUMsb0JBQW9CLENBQUMsQ0FBQztJQUN2RSxhQUFhLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRS9CLE1BQU0sV0FBVyxHQUFHLFNBQVMsQ0FBQztJQUM5QixlQUFlLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRTtRQUNoQyxJQUFJLEVBQUUsV0FBVztRQUNqQixHQUFHLEVBQUUsa0JBQWtCO0tBQ3ZCLENBQUMsQ0FBQztJQUVILHVCQUF1QjtJQUN2QixNQUFNLGVBQWUsR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRTtRQUN0RCxJQUFJLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQztRQUNuQixHQUFHLEVBQUUsdUJBQXVCO0tBQzVCLENBQUMsQ0FBQztJQUNILGVBQWUsQ0FBQyxPQUFPLEdBQUcsR0FBUyxFQUFFO1FBQ3BDLE1BQU0sU0FBUyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDakQsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUN0QyxlQUFlLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ25DLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDZixlQUFlLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQ3ZDLGVBQWUsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdkMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ1YsQ0FBQyxDQUFBLENBQUM7SUFFRiwwQkFBMEI7SUFDMUIsTUFBTSxZQUFZLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQ2pFLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFO1FBQzNCLElBQUksRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUM7UUFDMUIsR0FBRyxFQUFFLG1CQUFtQjtLQUN4QixDQUFDLENBQUM7SUFFSCxNQUFNLFNBQVMsR0FBRyxZQUFZLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDM0QsTUFBTSxTQUFTLEdBQUcsWUFBWSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQzNELFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFXLENBQUMsQ0FBQztJQUVuRCxTQUFlLGtCQUFrQjs7O1lBQ2hDLElBQUk7Z0JBQ0gsdUNBQXVDO2dCQUN2QyxNQUFNLE9BQU8sR0FBRyxNQUFNLFVBQVUsQ0FBQztvQkFDaEMsR0FBRyxFQUFFLFNBQVM7b0JBQ2QsTUFBTSxFQUFFLE1BQU07b0JBQ2QsT0FBTyxFQUFFO3dCQUNSLGVBQWUsRUFBRSxHQUFHLGVBQWUsRUFBRTt3QkFDckMsY0FBYyxFQUFFLGtCQUFrQjt3QkFDbEMsUUFBUSxFQUFFLHFDQUFxQzt3QkFDL0Msc0JBQXNCLEVBQUUsWUFBWTtxQkFDcEM7b0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBQyxDQUFDO2lCQUNuRSxDQUFDLENBQUM7Z0JBRUgsc0VBQXNFO2dCQUN0RSw0REFBNEQ7Z0JBQzVELE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUM7b0JBQ2xELE9BQU8sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFFLCtCQUErQjtnQkFFcEUsSUFBSSxDQUFDLFNBQVMsRUFBRTtvQkFDZixNQUFNLElBQUksS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUM7aUJBQzFDO2dCQUVELHFCQUFxQjtnQkFDckIsTUFBTSxPQUFPLEdBQUcsTUFBTSxVQUFVLENBQUM7b0JBQ2hDLEdBQUcsRUFBRSxTQUFTO29CQUNkLE1BQU0sRUFBRSxNQUFNO29CQUNkLE9BQU8sRUFBRTt3QkFDUixlQUFlLEVBQUUsR0FBRyxlQUFlLEVBQUU7d0JBQ3JDLGdCQUFnQixFQUFFLFNBQVM7d0JBQzNCLGNBQWMsRUFBRSxrQkFBa0I7d0JBQ2xDLFFBQVEsRUFBRSxxQ0FBcUM7d0JBQy9DLHNCQUFzQixFQUFFLFlBQVk7cUJBQ3BDO29CQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUMsQ0FBQztpQkFDbkUsQ0FBQyxDQUFDO2dCQUVILE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUVsQyxNQUFNLEtBQUssR0FBRyxDQUFBLE1BQUEsT0FBTyxhQUFQLE9BQU8sdUJBQVAsT0FBTyxDQUFFLElBQUksQ0FBQyxNQUFNLDBDQUFFLEtBQUssS0FBSSxFQUFFLENBQUM7Z0JBRWhELFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3RCLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFO29CQUNsQixTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBVyxDQUFDLENBQUM7b0JBQ3JELE9BQU87aUJBQ1A7Z0JBRUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQVMsRUFBRSxFQUFFO29CQUMzQixNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDO29CQUN0RCxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLENBQUM7b0JBQ3pELE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUM7b0JBQ3JELE9BQU8sQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7b0JBQzFCLFVBQVUsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLGVBQWUsRUFBQyxDQUFDLENBQUM7b0JBQ3JFLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUM7b0JBQ3JELFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFdBQVcsSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFDMUMsQ0FBQyxDQUFDLENBQUM7YUFDSDtZQUFDLE9BQU8sQ0FBTSxFQUFFO2dCQUNoQixPQUFPLENBQUMsS0FBSyxDQUFDLG1DQUFtQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUN0RCxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxrREFBa0QsQ0FBVyxDQUFDLENBQUM7YUFDbkY7O0tBQ0Q7SUFFRCx5Q0FBeUM7SUFDekMsa0JBQWtCLEVBQUUsQ0FBQztJQUVyQiwwQkFBMEI7SUFDMUIsTUFBTSxjQUFjLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQ25FLGNBQWMsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFO1FBQzdCLElBQUksRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUM7UUFDMUIsR0FBRyxFQUFFLG1CQUFtQjtLQUN4QixDQUFDLENBQUM7SUFFSCxNQUFNLGdCQUFnQixHQUFHLGNBQWMsQ0FBQyxTQUFTLENBQUMsdUJBQXVCLENBQUMsQ0FBQztJQUUzRSxzRUFBc0U7SUFDdEUsY0FBYyxHQUFHLEdBQUcsRUFBRTtRQUNyQixnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN6QixjQUFjLEVBQUUsQ0FBQztJQUNsQixDQUFDLENBQUM7SUFFRixNQUFNLGNBQWMsR0FBRyxHQUFHLEVBQUU7UUFDM0IscUNBQXFDO1FBQ3JDLE1BQU0sWUFBWSxHQUFHLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFO1lBQy9DLElBQUksRUFBRSxNQUFNO1lBQ1osR0FBRyxFQUFFLHdCQUF3QjtTQUM3QixDQUFDLENBQUM7UUFDSCxNQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRTtZQUM3QyxJQUFJLEVBQUUsWUFBWTtZQUNsQixHQUFHLEVBQUUsaUJBQWlCO1NBQ3RCLENBQUMsQ0FBQztRQUNILE1BQU0sU0FBUyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFO1lBQ2pELElBQUksRUFBRSxRQUFRO1lBQ2QsR0FBRyxFQUFFLGlCQUFpQjtTQUN0QixDQUFDLENBQUM7UUFFSCxzQkFBc0I7UUFDdEIsTUFBTSxvQkFBb0IsR0FBRyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsNEJBQTRCLENBQUMsQ0FBQztRQUV0RixlQUFlO1FBQ2YsTUFBTSxXQUFXLEdBQUcsb0JBQW9CLENBQUMsU0FBUyxDQUFDLDBCQUEwQixDQUFDLENBQUM7UUFDL0UsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBQyxJQUFJLEVBQUUsZUFBZSxFQUFFLEdBQUcsRUFBRSxzQkFBc0IsRUFBQyxDQUFDLENBQUM7UUFDbEYsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBQyxHQUFHLEVBQUUsa0JBQWtCLEVBQUMsQ0FBQyxDQUFDO1FBRTNFLElBQUksVUFBVSxFQUFFO1lBQ2YsV0FBVyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUU7Z0JBQzVCLElBQUksRUFBRSxtQkFBbUIsV0FBVzt1QkFDakIsZUFBZTs7c0RBRWdCO2FBQ2xELENBQUMsQ0FBQztTQUNIO2FBQU07WUFDTixXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRTtnQkFDNUIsSUFBSSxFQUFFLG1CQUFtQixXQUFXOzhCQUNWLFNBQVM7b0JBQ25CLEtBQUs7O3NEQUU2QjthQUNsRCxDQUFDLENBQUM7U0FDSDtRQUVELFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQUMsSUFBSSxFQUFFLDhCQUE4QixFQUFFLEdBQUcsRUFBRSxzQkFBc0IsRUFBQyxDQUFDLENBQUM7UUFDakcsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBQyxHQUFHLEVBQUUsa0JBQWtCLEVBQUMsQ0FBQyxDQUFDO1FBRTNFLElBQUksVUFBVSxFQUFFO1lBQ2YsV0FBVyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUU7Z0JBQzVCLElBQUksRUFBRSxnQkFBZ0IsV0FBVzt1QkFDZCxlQUFlOzs7eUpBR21IO2FBQ3JKLENBQUMsQ0FBQztTQUNIO2FBQU07WUFDTixXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRTtnQkFDNUIsSUFBSSxFQUFFLGdCQUFnQixXQUFXOzhCQUNQLFNBQVM7b0JBQ25CLEtBQUs7Ozt5SkFHZ0k7YUFDckosQ0FBQyxDQUFDO1NBQ0g7UUFFRCxtQ0FBbUM7UUFDbkMsTUFBTSxTQUFTLEdBQUcsb0JBQW9CLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDdEUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBQyxJQUFJLEVBQUUsZUFBZSxFQUFFLEdBQUcsRUFBRSxzQkFBc0IsRUFBQyxDQUFDLENBQUM7UUFDaEYsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBQyxHQUFHLEVBQUUsa0JBQWtCLEVBQUMsQ0FBQyxDQUFDO1FBRXZFLElBQUksVUFBVSxFQUFFO1lBQ2YsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUU7Z0JBQzFCLElBQUksRUFBRSxnQ0FBZ0MsV0FBVyxnRUFBZ0UsZUFBZSwwTEFBMEw7YUFDMVQsQ0FBQyxDQUFDO1NBQ0g7YUFBTTtZQUNOLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFO2dCQUMxQixJQUFJLEVBQUUsZ0NBQWdDLFdBQVcsdUVBQXVFLFNBQVMsMEJBQTBCLEtBQUssMExBQTBMO2FBQzFWLENBQUMsQ0FBQztTQUNIO1FBRUQsU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBQyxJQUFJLEVBQUUsOEJBQThCLEVBQUUsR0FBRyxFQUFFLHNCQUFzQixFQUFDLENBQUMsQ0FBQztRQUMvRixNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxFQUFDLEdBQUcsRUFBRSxrQkFBa0IsRUFBQyxDQUFDLENBQUM7UUFFdkUsSUFBSSxVQUFVLEVBQUU7WUFDZixTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRTtnQkFDMUIsSUFBSSxFQUFFLGdDQUFnQyxXQUFXLGdFQUFnRSxlQUFlLG1VQUFtVTthQUNuYyxDQUFDLENBQUM7U0FDSDthQUFNO1lBQ04sU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUU7Z0JBQzFCLElBQUksRUFBRSxnQ0FBZ0MsV0FBVyx1RUFBdUUsU0FBUywwQkFBMEIsS0FBSyxtVUFBbVU7YUFDbmUsQ0FBQyxDQUFDO1NBQ0g7UUFFRCwrQkFBK0I7UUFDL0IsTUFBTSxhQUFhLEdBQUcsb0JBQW9CLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDMUUsYUFBYSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBQyxJQUFJLEVBQUUsZUFBZSxFQUFFLEdBQUcsRUFBRSxzQkFBc0IsRUFBQyxDQUFDLENBQUM7UUFDcEYsTUFBTSxhQUFhLEdBQUcsYUFBYSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBQyxHQUFHLEVBQUUsa0JBQWtCLEVBQUMsQ0FBQyxDQUFDO1FBRS9FLElBQUksVUFBVSxFQUFFO1lBQ2YsYUFBYSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUU7Z0JBQzlCLElBQUksRUFBRTs7OztPQUlILFdBQVc7OzRCQUVVLGVBQWU7Ozs7OzttQ0FNUjthQUMvQixDQUFDLENBQUM7U0FDSDthQUFNO1lBQ04sYUFBYSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUU7Z0JBQzlCLElBQUksRUFBRTs7OztPQUlILFdBQVc7O21DQUVpQixTQUFTO3lCQUNuQixLQUFLOzs7Ozs7bUNBTUs7YUFDL0IsQ0FBQyxDQUFDO1NBQ0g7UUFFRCxhQUFhLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxFQUFDLElBQUksRUFBRSw4QkFBOEIsRUFBRSxHQUFHLEVBQUUsc0JBQXNCLEVBQUMsQ0FBQyxDQUFDO1FBQ25HLE1BQU0sYUFBYSxHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQUMsR0FBRyxFQUFFLGtCQUFrQixFQUFDLENBQUMsQ0FBQztRQUUvRSxJQUFJLFVBQVUsRUFBRTtZQUNmLGFBQWEsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFO2dCQUM5QixJQUFJLEVBQUU7O09BRUgsV0FBVzs7NEJBRVUsZUFBZTs7Ozs7Ozs7Ozs7Ozs7Ozs7dUJBaUJwQjthQUNuQixDQUFDLENBQUM7U0FDSDthQUFNO1lBQ04sYUFBYSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUU7Z0JBQzlCLElBQUksRUFBRTs7T0FFSCxXQUFXOzttQ0FFaUIsU0FBUzt5QkFDbkIsS0FBSzs7Ozs7Ozs7Ozs7Ozs7Ozs7dUJBaUJQO2FBQ25CLENBQUMsQ0FBQztTQUNIO1FBRUQsc0JBQXNCO1FBQ3RCLE1BQU0sSUFBSSxHQUFHLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN6QyxNQUFNLFFBQVEsR0FBRyxDQUFDLFdBQVcsRUFBRSxTQUFTLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFFekQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUMzQixHQUFHLENBQUMsT0FBTyxHQUFHLEdBQUcsRUFBRTtnQkFDbEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDM0MsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDL0MsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDdkIsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNwQyxDQUFDLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVILHNDQUFzQztRQUN0QyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDNUIsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLHNCQUFzQixDQUFDLENBQUM7WUFDcEUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO2dCQUMvQixNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNuRCxJQUFJLENBQUMsV0FBVztvQkFBRSxPQUFPO2dCQUV6QixNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRTtvQkFDM0MsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUM7b0JBQ2YsR0FBRyxFQUFFLHNCQUFzQjtpQkFDM0IsQ0FBQyxDQUFDO2dCQUNILE9BQU8sQ0FBQyxPQUFPLEdBQUcsR0FBUyxFQUFFO29CQUM1QixNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsV0FBVyxJQUFJLEVBQUUsQ0FBQztvQkFDM0MsTUFBTSxTQUFTLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDMUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztvQkFDOUIsT0FBTyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDM0IsVUFBVSxDQUFDLEdBQUcsRUFBRTt3QkFDZixPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO3dCQUMzQixPQUFPLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUMvQixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ1YsQ0FBQyxDQUFBLENBQUM7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDO0lBRUYsNkJBQTZCO0lBQzdCLGNBQWMsRUFBRSxDQUFDO0FBQ2xCLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUMxQixTQUFzQixFQUN0QixVQUE2QjtJQUU3QixTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7SUFFbEIsSUFBSSxDQUFDLFVBQVUsRUFBRTtRQUNoQixTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRTtZQUN6QixJQUFJLEVBQUUsQ0FBQyxDQUFDLDRCQUE0QixDQUFDO1lBQ3JDLEdBQUcsRUFBRSxrQkFBa0I7U0FDdkIsQ0FBQyxDQUFDO1FBQ0gsT0FBTztLQUNQO0lBRUQsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ3RDLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUM7SUFFbkQsbUJBQW1CO0lBQ25CLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsc0JBQXNCLENBQUMsQ0FBQztJQUMvRCxXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDN0QsV0FBVyxDQUFDLFVBQVUsQ0FBQztRQUN0QixJQUFJLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHO1FBQ2hDLEdBQUcsRUFBRSxZQUFZO0tBQ2pCLENBQUMsQ0FBQztJQUNILFdBQVcsQ0FBQyxVQUFVLENBQUM7UUFDdEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUNsRCxHQUFHLEVBQUUsYUFBYTtLQUNsQixDQUFDLENBQUM7SUFFSCxpQkFBaUI7SUFDakIsSUFBSSxNQUFNLENBQUMsT0FBTyxJQUFJLE1BQU0sQ0FBQyxJQUFJLEVBQUU7UUFDbEMsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQzNELFNBQVMsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFO1lBQ3pCLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFO1NBQ3BDLENBQUMsQ0FBQztRQUVILElBQUksTUFBTSxDQUFDLFNBQVMsRUFBRTtZQUNyQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN2RCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsQ0FBQztZQUMzQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDO1lBQ3ZELFNBQVMsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFO2dCQUN6QixJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssS0FBSyxLQUFLLE9BQU8sR0FBRzthQUM3QyxDQUFDLENBQUM7U0FDSDtRQUVELElBQUksTUFBTSxDQUFDLFlBQVksS0FBSyxTQUFTLEVBQUU7WUFDdEMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUU7Z0JBQ3pCLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxNQUFNLENBQUMsWUFBWSxFQUFFO2FBQ2hELENBQUMsQ0FBQztTQUNIO0tBQ0Q7QUFDRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIE1DUCBJbnRlZ3JhdGlvbiBTZXR0aW5ncyBUYWIgQ29tcG9uZW50XHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgU2V0dGluZywgTm90aWNlLCBQbGF0Zm9ybSwgc2V0SWNvbiwgcmVxdWVzdFVybCB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7IE1jcFNlcnZlck1hbmFnZXIgfSBmcm9tIFwiQC9tY3AvTWNwU2VydmVyTWFuYWdlclwiO1xyXG5pbXBvcnQgeyBBdXRoTWlkZGxld2FyZSB9IGZyb20gXCJAL21jcC9hdXRoL0F1dGhNaWRkbGV3YXJlXCI7XHJcbmltcG9ydCB7IENvbmZpcm1Nb2RhbCB9IGZyb20gXCJAL2NvbXBvbmVudHMvdWkvbW9kYWxzL0NvbmZpcm1Nb2RhbFwiO1xyXG5pbXBvcnQgXCJAL3N0eWxlcy9tY3AtaW50ZWdyYXRpb24uY3NzXCI7XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVDb25maWdCbG9jayhcclxuXHRjb250YWluZXI6IEhUTUxFbGVtZW50LFxyXG5cdGNvbmZpZzogYW55LFxyXG5cdGxhYmVsOiBzdHJpbmdcclxuKTogdm9pZCB7XHJcblx0Y29uc3QgYmxvY2tDb250YWluZXIgPSBjb250YWluZXIuY3JlYXRlRGl2KFwibWNwLWNvbmZpZy1ibG9ja1wiKTtcclxuXHJcblx0Ly8gQ3JlYXRlIGNvZGUgYmxvY2tcclxuXHRjb25zdCBjb2RlQmxvY2sgPSBibG9ja0NvbnRhaW5lci5jcmVhdGVFbChcInByZVwiLCB7XHJcblx0XHRjbHM6IFwibWNwLWNvbmZpZy1jb2RlXCIsXHJcblx0fSk7XHJcblx0Y29uc3QgY29kZUVsID0gY29kZUJsb2NrLmNyZWF0ZUVsKFwiY29kZVwiKTtcclxuXHRjb2RlRWwuc2V0VGV4dChKU09OLnN0cmluZ2lmeShjb25maWcsIG51bGwsIDIpKTtcclxuXHJcblx0Ly8gQ29kZSBibG9jayBzdHlsaW5nIGhhbmRsZWQgYnkgQ1NTXHJcblxyXG5cdC8vIENyZWF0ZSBjb3B5IGJ1dHRvblxyXG5cdGNvbnN0IGNvcHlCdG4gPSBibG9ja0NvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHR0ZXh0OiB0KFwiQ29weVwiKSxcclxuXHRcdGNsczogXCJtY3AtY29weS1idG5cIixcclxuXHR9KTtcclxuXHQvLyBDb3B5IGJ1dHRvbiBzdHlsaW5nIGhhbmRsZWQgYnkgQ1NTXHJcblxyXG5cdGNvcHlCdG4ub25jbGljayA9IGFzeW5jICgpID0+IHtcclxuXHRcdGF3YWl0IG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KEpTT04uc3RyaW5naWZ5KGNvbmZpZywgbnVsbCwgMikpO1xyXG5cdFx0Y29weUJ0bi5zZXRUZXh0KHQoXCJDb3BpZWQhXCIpKTtcclxuXHRcdGNvcHlCdG4uYWRkQ2xhc3MoXCJjb3BpZWRcIik7XHJcblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0Y29weUJ0bi5zZXRUZXh0KHQoXCJDb3B5XCIpKTtcclxuXHRcdFx0Y29weUJ0bi5yZW1vdmVDbGFzcyhcImNvcGllZFwiKTtcclxuXHRcdH0sIDIwMDApO1xyXG5cdH07XHJcblxyXG5cdC8vIFN0eWxlcyBhcmUgaGFuZGxlZCBieSBDU1NcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlck1jcEludGVncmF0aW9uU2V0dGluZ3NUYWIoXHJcblx0Y29udGFpbmVyRWw6IEhUTUxFbGVtZW50LFxyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdGFwcGx5U2V0dGluZ3NVcGRhdGU6ICgpID0+IHZvaWRcclxuKTogdm9pZCB7XHJcblx0Ly8gT25seSBzaG93IG9uIGRlc2t0b3BcclxuXHRpZiAoIVBsYXRmb3JtLmlzRGVza3RvcEFwcCkge1xyXG5cdFx0Y29udGFpbmVyRWwuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFwiTUNQIGludGVncmF0aW9uIGlzIG9ubHkgYXZhaWxhYmxlIG9uIGRlc2t0b3BcIiksXHJcblx0XHRcdGNsczogXCJzZXR0aW5nLWl0ZW0tZGVzY3JpcHRpb25cIixcclxuXHRcdH0pO1xyXG5cdFx0cmV0dXJuO1xyXG5cdH1cclxuXHJcblx0Y29uc3QgbWNwTWFuYWdlciA9IChwbHVnaW4gYXMgVGFza1Byb2dyZXNzQmFyUGx1Z2luKS5tY3BTZXJ2ZXJNYW5hZ2VyIGFzXHJcblx0XHR8IE1jcFNlcnZlck1hbmFnZXJcclxuXHRcdHwgdW5kZWZpbmVkO1xyXG5cclxuXHQvLyBTZXJ2ZXIgU3RhdHVzIFNlY3Rpb25cclxuXHRjb250YWluZXJFbC5jcmVhdGVFbChcImgzXCIsIHt0ZXh0OiB0KFwiTUNQIFNlcnZlciBTdGF0dXNcIil9KTtcclxuXHJcblx0Y29uc3Qgc3RhdHVzQ29udGFpbmVyID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KFwibWNwLXN0YXR1cy1jb250YWluZXJcIik7XHJcblx0dXBkYXRlU2VydmVyU3RhdHVzKHN0YXR1c0NvbnRhaW5lciwgbWNwTWFuYWdlcik7XHJcblxyXG5cdC8vIEVuYWJsZS9EaXNhYmxlIFRvZ2dsZVxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIkVuYWJsZSBNQ1AgU2VydmVyXCIpKVxyXG5cdFx0LnNldERlc2ModChcIlN0YXJ0IHRoZSBNQ1Agc2VydmVyIHRvIGFsbG93IGV4dGVybmFsIHRvb2wgY29ubmVjdGlvbnNcIikpXHJcblx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcclxuXHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0LnNldFZhbHVlKHBsdWdpbi5zZXR0aW5ncy5tY3BJbnRlZ3JhdGlvbj8uZW5hYmxlZCB8fCBmYWxzZSlcclxuXHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHQvLyBTaG93IGNvbmZpcm1hdGlvbiBkaWFsb2cgd2hlbiBlbmFibGluZyBNQ1BcclxuXHRcdFx0XHRcdGlmICh2YWx1ZSkge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBtb2RhbCA9IG5ldyBDb25maXJtTW9kYWwocGx1Z2luLCB7XHJcblx0XHRcdFx0XHRcdFx0dGl0bGU6IHQoXCJFbmFibGUgTUNQIFNlcnZlclwiKSxcclxuXHRcdFx0XHRcdFx0XHRtZXNzYWdlOiB0KFwiV0FSTklORzogRW5hYmxpbmcgdGhlIE1DUCBzZXJ2ZXIgd2lsbCBhbGxvdyBleHRlcm5hbCBBSSB0b29scyBhbmQgYXBwbGljYXRpb25zIHRvIGFjY2VzcyBhbmQgbW9kaWZ5IHlvdXIgdGFzayBkYXRhLiBUaGlzIGluY2x1ZGVzOlxcblxcbuKAoiBSZWFkaW5nIGFsbCB0YXNrcyBhbmQgdGhlaXIgZGV0YWlsc1xcbuKAoiBDcmVhdGluZyBuZXcgdGFza3NcXG7igKIgVXBkYXRpbmcgZXhpc3RpbmcgdGFza3NcXG7igKIgRGVsZXRpbmcgdGFza3NcXG7igKIgQWNjZXNzaW5nIHRhc2sgbWV0YWRhdGEgYW5kIHByb3BlcnRpZXNcXG5cXG5Pbmx5IGVuYWJsZSB0aGlzIGlmIHlvdSB0cnVzdCB0aGUgYXBwbGljYXRpb25zIHRoYXQgd2lsbCBjb25uZWN0IHRvIHRoZSBNQ1Agc2VydmVyLiBNYWtlIHN1cmUgdG8ga2VlcCB5b3VyIGF1dGhlbnRpY2F0aW9uIHRva2VuIHNlY3VyZS5cXG5cXG5EbyB5b3Ugd2FudCB0byBjb250aW51ZT9cIiksXHJcblx0XHRcdFx0XHRcdFx0Y29uZmlybVRleHQ6IHQoXCJFbmFibGUgTUNQIFNlcnZlclwiKSxcclxuXHRcdFx0XHRcdFx0XHRjYW5jZWxUZXh0OiB0KFwiQ2FuY2VsXCIpLFxyXG5cdFx0XHRcdFx0XHRcdG9uQ29uZmlybTogYXN5bmMgKGNvbmZpcm1lZCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKGNvbmZpcm1lZCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBVc2VyIGNvbmZpcm1lZCwgcHJvY2VlZCB3aXRoIGVuYWJsaW5nXHJcblx0XHRcdFx0XHRcdFx0XHRcdGlmICghcGx1Z2luLnNldHRpbmdzLm1jcEludGVncmF0aW9uKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLm1jcEludGVncmF0aW9uID0ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHBvcnQ6IDc3NzcsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRob3N0OiBcIjEyNy4wLjAuMVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0YXV0aFRva2VuOiBBdXRoTWlkZGxld2FyZS5nZW5lcmF0ZVRva2VuKCksXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRlbmFibGVDb3JzOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0bG9nTGV2ZWw6IFwiaW5mb1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLm1jcEludGVncmF0aW9uLmVuYWJsZWQgPSB0cnVlO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0XHRhd2FpdCBwbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAobWNwTWFuYWdlcikge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGF3YWl0IG1jcE1hbmFnZXIudXBkYXRlQ29uZmlnKHtlbmFibGVkOiB0cnVlfSk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0dXBkYXRlU2VydmVyU3RhdHVzKHN0YXR1c0NvbnRhaW5lciwgbWNwTWFuYWdlcik7XHJcblx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0XHRcdHRvZ2dsZS5zZXRWYWx1ZSh0cnVlKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0bmV3IE5vdGljZSh0KFwiTUNQIFNlcnZlciBlbmFibGVkLiBLZWVwIHlvdXIgYXV0aGVudGljYXRpb24gdG9rZW4gc2VjdXJlIVwiKSk7XHJcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBVc2VyIGNhbmNlbGxlZCwgcmV2ZXJ0IHRvZ2dsZVxyXG5cdFx0XHRcdFx0XHRcdFx0XHR0b2dnbGUuc2V0VmFsdWUoZmFsc2UpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdG1vZGFsLm9wZW4oKTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdC8vIERpc2FibGluZyBkb2Vzbid0IG5lZWQgY29uZmlybWF0aW9uXHJcblx0XHRcdFx0XHRcdGlmIChwbHVnaW4uc2V0dGluZ3MubWNwSW50ZWdyYXRpb24pIHtcclxuXHRcdFx0XHRcdFx0XHRwbHVnaW4uc2V0dGluZ3MubWNwSW50ZWdyYXRpb24uZW5hYmxlZCA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRhd2FpdCBwbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblxyXG5cdFx0XHRcdFx0XHRpZiAobWNwTWFuYWdlcikge1xyXG5cdFx0XHRcdFx0XHRcdGF3YWl0IG1jcE1hbmFnZXIudXBkYXRlQ29uZmlnKHtlbmFibGVkOiBmYWxzZX0pO1xyXG5cdFx0XHRcdFx0XHRcdHVwZGF0ZVNlcnZlclN0YXR1cyhzdGF0dXNDb250YWluZXIsIG1jcE1hbmFnZXIpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0Ly8gU2VydmVyIENvbmZpZ3VyYXRpb25cclxuXHRjb250YWluZXJFbC5jcmVhdGVFbChcImgzXCIsIHt0ZXh0OiB0KFwiU2VydmVyIENvbmZpZ3VyYXRpb25cIil9KTtcclxuXHJcblx0Ly8gSG9zdCBTZXR0aW5nXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiSG9zdFwiKSlcclxuXHRcdC5zZXREZXNjKHQoXCJTZXJ2ZXIgaG9zdCBhZGRyZXNzLiBVc2UgMTI3LjAuMC4xIGZvciBsb2NhbCBvbmx5LCAwLjAuMC4wIGZvciBhbGwgaW50ZXJmYWNlc1wiKSlcclxuXHRcdC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcclxuXHRcdFx0ZHJvcGRvd25cclxuXHRcdFx0XHQuYWRkT3B0aW9uKFwiMTI3LjAuMC4xXCIsIFwiMTI3LjAuMC4xIChMb2NhbCBvbmx5KVwiKVxyXG5cdFx0XHRcdC5hZGRPcHRpb24oXCIwLjAuMC4wXCIsIFwiMC4wLjAuMCAoQWxsIGludGVyZmFjZXMgLSBmb3IgZXh0ZXJuYWwgYWNjZXNzKVwiKVxyXG5cdFx0XHRcdC5zZXRWYWx1ZShwbHVnaW4uc2V0dGluZ3MubWNwSW50ZWdyYXRpb24/Lmhvc3QgfHwgXCIxMjcuMC4wLjFcIilcclxuXHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAoIXBsdWdpbi5zZXR0aW5ncy5tY3BJbnRlZ3JhdGlvbikgcmV0dXJuO1xyXG5cclxuXHRcdFx0XHRcdC8vIElmIHN3aXRjaGluZyB0byAwLjAuMC4wLCBzaG93IGNvbmZpcm1hdGlvbiBkaWFsb2dcclxuXHRcdFx0XHRcdGlmICh2YWx1ZSA9PT0gXCIwLjAuMC4wXCIgJiYgcGx1Z2luLnNldHRpbmdzLm1jcEludGVncmF0aW9uLmhvc3QgIT09IFwiMC4wLjAuMFwiKSB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IG1vZGFsID0gbmV3IENvbmZpcm1Nb2RhbChwbHVnaW4sIHtcclxuXHRcdFx0XHRcdFx0XHR0aXRsZTogdChcIlNlY3VyaXR5IFdhcm5pbmdcIiksXHJcblx0XHRcdFx0XHRcdFx0bWVzc2FnZTogdChcIuKaoO+4jyAqKldBUk5JTkcqKjogU3dpdGNoaW5nIHRvIDAuMC4wLjAgd2lsbCBtYWtlIHRoZSBNQ1Agc2VydmVyIGFjY2Vzc2libGUgZnJvbSBleHRlcm5hbCBuZXR3b3Jrcy5cXG5cXG5UaGlzIGNvdWxkIGV4cG9zZSB5b3VyIE9ic2lkaWFuIGRhdGEgdG86XFxuLSBPdGhlciBkZXZpY2VzIG9uIHlvdXIgbG9jYWwgbmV0d29ya1xcbi0gUG90ZW50aWFsbHkgdGhlIGludGVybmV0IGlmIHlvdXIgZmlyZXdhbGwgaXMgbWlzY29uZmlndXJlZFxcblxcbioqT25seSBwcm9jZWVkIGlmIHlvdToqKlxcbi0gVW5kZXJzdGFuZCB0aGUgc2VjdXJpdHkgaW1wbGljYXRpb25zXFxuLSBIYXZlIHByb3Blcmx5IGNvbmZpZ3VyZWQgeW91ciBmaXJld2FsbFxcbi0gTmVlZCBleHRlcm5hbCBhY2Nlc3MgZm9yIGxlZ2l0aW1hdGUgcmVhc29uc1xcblxcbkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBjb250aW51ZT9cIiksXHJcblx0XHRcdFx0XHRcdFx0Y29uZmlybVRleHQ6IHQoXCJZZXMsIEkgdW5kZXJzdGFuZCB0aGUgcmlza3NcIiksXHJcblx0XHRcdFx0XHRcdFx0Y2FuY2VsVGV4dDogdChcIkNhbmNlbFwiKSxcclxuXHRcdFx0XHRcdFx0XHRvbkNvbmZpcm06IGFzeW5jIChjb25maXJtZWQpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdGlmIChjb25maXJtZWQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKHBsdWdpbi5zZXR0aW5ncy5tY3BJbnRlZ3JhdGlvbikge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHBsdWdpbi5zZXR0aW5ncy5tY3BJbnRlZ3JhdGlvbi5ob3N0ID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0YXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHRcdG5ldyBOb3RpY2UodChcIkhvc3QgY2hhbmdlZCB0byAwLjAuMC4wLiBTZXJ2ZXIgaXMgbm93IGFjY2Vzc2libGUgZnJvbSBleHRlcm5hbCBuZXR3b3Jrcy5cIikpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gUmV2ZXJ0IGRyb3Bkb3duIHRvIHByZXZpb3VzIHZhbHVlXHJcblx0XHRcdFx0XHRcdFx0XHRcdGRyb3Bkb3duLnNldFZhbHVlKHBsdWdpbi5zZXR0aW5ncy5tY3BJbnRlZ3JhdGlvbj8uaG9zdCB8fCBcIjEyNy4wLjAuMVwiKTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0bW9kYWwub3BlbigpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0Ly8gRGlyZWN0IHVwZGF0ZSBmb3Igc3dpdGNoaW5nIHRvIDEyNy4wLjAuMSBvciBubyBjaGFuZ2VcclxuXHRcdFx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLm1jcEludGVncmF0aW9uLmhvc3QgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0YXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdC8vIFBvcnQgU2V0dGluZ1xyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIlBvcnRcIikpXHJcblx0XHQuc2V0RGVzYyh0KFwiU2VydmVyIHBvcnQgbnVtYmVyIChkZWZhdWx0OiA3Nzc3KVwiKSlcclxuXHRcdC5hZGRUZXh0KCh0ZXh0KSA9PiB7XHJcblx0XHRcdHRleHRcclxuXHRcdFx0XHQuc2V0UGxhY2Vob2xkZXIoXCI3Nzc3XCIpXHJcblx0XHRcdFx0LnNldFZhbHVlKFN0cmluZyhwbHVnaW4uc2V0dGluZ3MubWNwSW50ZWdyYXRpb24/LnBvcnQgfHwgNzc3NykpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKCFwbHVnaW4uc2V0dGluZ3MubWNwSW50ZWdyYXRpb24pIHJldHVybjtcclxuXHRcdFx0XHRcdGNvbnN0IHBvcnQgPSBwYXJzZUludCh2YWx1ZSk7XHJcblx0XHRcdFx0XHRpZiAoIWlzTmFOKHBvcnQpICYmIHBvcnQgPiAwICYmIHBvcnQgPCA2NTUzNikge1xyXG5cdFx0XHRcdFx0XHRwbHVnaW4uc2V0dGluZ3MubWNwSW50ZWdyYXRpb24ucG9ydCA9IHBvcnQ7XHJcblx0XHRcdFx0XHRcdGFwcGx5U2V0dGluZ3NVcGRhdGUoKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHQvLyBBdXRoZW50aWNhdGlvbiBTZWN0aW9uXHJcblx0Y29udGFpbmVyRWwuY3JlYXRlRWwoXCJoM1wiLCB7dGV4dDogdChcIkF1dGhlbnRpY2F0aW9uXCIpfSk7XHJcblxyXG5cdC8vIEF1dGggVG9rZW4gRGlzcGxheVxyXG5cdGNvbnN0IGF1dGhUb2tlblNldHRpbmcgPSBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJBdXRoZW50aWNhdGlvbiBUb2tlblwiKSlcclxuXHRcdC5zZXREZXNjKFxyXG5cdFx0XHR0KFwiQmVhcmVyIHRva2VuIGZvciBhdXRoZW50aWNhdGluZyBNQ1AgcmVxdWVzdHMgKGtlZXAgdGhpcyBzZWNyZXQpXCIpXHJcblx0XHQpO1xyXG5cclxuXHRjb25zdCB0b2tlbklucHV0ID0gYXV0aFRva2VuU2V0dGluZy5jb250cm9sRWwuY3JlYXRlRWwoXCJpbnB1dFwiLCB7XHJcblx0XHR0eXBlOiBcInBhc3N3b3JkXCIsXHJcblx0XHR2YWx1ZTogcGx1Z2luLnNldHRpbmdzLm1jcEludGVncmF0aW9uPy5hdXRoVG9rZW4gfHwgXCJcIixcclxuXHRcdGNsczogXCJtY3AtdG9rZW4taW5wdXRcIixcclxuXHR9KTtcclxuXHJcblx0dG9rZW5JbnB1dC5yZWFkT25seSA9IHRydWU7XHJcblxyXG5cdC8vIFNob3cvSGlkZSBUb2tlbiBCdXR0b25cclxuXHRhdXRoVG9rZW5TZXR0aW5nLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XHJcblx0XHRidXR0b24uc2V0QnV0dG9uVGV4dCh0KFwiU2hvd1wiKSkub25DbGljaygoKSA9PiB7XHJcblx0XHRcdGlmICh0b2tlbklucHV0LnR5cGUgPT09IFwicGFzc3dvcmRcIikge1xyXG5cdFx0XHRcdHRva2VuSW5wdXQudHlwZSA9IFwidGV4dFwiO1xyXG5cdFx0XHRcdGJ1dHRvbi5zZXRCdXR0b25UZXh0KHQoXCJIaWRlXCIpKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0b2tlbklucHV0LnR5cGUgPSBcInBhc3N3b3JkXCI7XHJcblx0XHRcdFx0YnV0dG9uLnNldEJ1dHRvblRleHQodChcIlNob3dcIikpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0Ly8gQ29weSBUb2tlbiBCdXR0b25cclxuXHRhdXRoVG9rZW5TZXR0aW5nLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XHJcblx0XHRidXR0b24uc2V0QnV0dG9uVGV4dCh0KFwiQ29weVwiKSkub25DbGljayhhc3luYyAoKSA9PiB7XHJcblx0XHRcdGF3YWl0IG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KHRva2VuSW5wdXQudmFsdWUpO1xyXG5cdFx0XHRuZXcgTm90aWNlKHQoXCJUb2tlbiBjb3BpZWQgdG8gY2xpcGJvYXJkXCIpKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHQvLyBSZWdlbmVyYXRlIFRva2VuIEJ1dHRvblxyXG5cdGF1dGhUb2tlblNldHRpbmcuYWRkQnV0dG9uKChidXR0b24pID0+IHtcclxuXHRcdGJ1dHRvbi5zZXRCdXR0b25UZXh0KHQoXCJSZWdlbmVyYXRlXCIpKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcclxuXHRcdFx0aWYgKCFwbHVnaW4uc2V0dGluZ3MubWNwSW50ZWdyYXRpb24gfHwgIW1jcE1hbmFnZXIpIHJldHVybjtcclxuXHJcblx0XHRcdGNvbnN0IG5ld1Rva2VuID0gbWNwTWFuYWdlci5yZWdlbmVyYXRlQXV0aFRva2VuKCk7XHJcblx0XHRcdHRva2VuSW5wdXQudmFsdWUgPSBuZXdUb2tlbjtcclxuXHRcdFx0YXdhaXQgcGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHRuZXcgTm90aWNlKHQoXCJOZXcgdG9rZW4gZ2VuZXJhdGVkXCIpKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHQvLyBBZHZhbmNlZCBTZXR0aW5nc1xyXG5cdGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDNcIiwge3RleHQ6IHQoXCJBZHZhbmNlZCBTZXR0aW5nc1wiKX0pO1xyXG5cclxuXHQvLyBDT1JTIFNldHRpbmdcclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJFbmFibGUgQ09SU1wiKSlcclxuXHRcdC5zZXREZXNjKHQoXCJBbGxvdyBjcm9zcy1vcmlnaW4gcmVxdWVzdHMgKHJlcXVpcmVkIGZvciB3ZWIgY2xpZW50cylcIikpXHJcblx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcclxuXHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0LnNldFZhbHVlKHBsdWdpbi5zZXR0aW5ncy5tY3BJbnRlZ3JhdGlvbj8uZW5hYmxlQ29ycyA/PyB0cnVlKVxyXG5cdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdGlmICghcGx1Z2luLnNldHRpbmdzLm1jcEludGVncmF0aW9uKSByZXR1cm47XHJcblx0XHRcdFx0XHRwbHVnaW4uc2V0dGluZ3MubWNwSW50ZWdyYXRpb24uZW5hYmxlQ29ycyA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0YXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdC8vIExvZyBMZXZlbCBTZXR0aW5nXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiTG9nIExldmVsXCIpKVxyXG5cdFx0LnNldERlc2ModChcIkxvZ2dpbmcgdmVyYm9zaXR5IGZvciBkZWJ1Z2dpbmdcIikpXHJcblx0XHQuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XHJcblx0XHRcdGRyb3Bkb3duXHJcblx0XHRcdFx0LmFkZE9wdGlvbihcImVycm9yXCIsIHQoXCJFcnJvclwiKSlcclxuXHRcdFx0XHQuYWRkT3B0aW9uKFwid2FyblwiLCB0KFwiV2FybmluZ1wiKSlcclxuXHRcdFx0XHQuYWRkT3B0aW9uKFwiaW5mb1wiLCB0KFwiSW5mb1wiKSlcclxuXHRcdFx0XHQuYWRkT3B0aW9uKFwiZGVidWdcIiwgdChcIkRlYnVnXCIpKVxyXG5cdFx0XHRcdC5zZXRWYWx1ZShwbHVnaW4uc2V0dGluZ3MubWNwSW50ZWdyYXRpb24/LmxvZ0xldmVsIHx8IFwiaW5mb1wiKVxyXG5cdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWU6IGFueSkgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKCFwbHVnaW4uc2V0dGluZ3MubWNwSW50ZWdyYXRpb24pIHJldHVybjtcclxuXHRcdFx0XHRcdHBsdWdpbi5zZXR0aW5ncy5tY3BJbnRlZ3JhdGlvbi5sb2dMZXZlbCA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0YXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdC8vIFNlcnZlciBBY3Rpb25zXHJcblx0Y29udGFpbmVyRWwuY3JlYXRlRWwoXCJoM1wiLCB7dGV4dDogdChcIlNlcnZlciBBY3Rpb25zXCIpfSk7XHJcblxyXG5cdGNvbnN0IGFjdGlvbnNDb250YWluZXIgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoXCJtY3AtYWN0aW9ucy1jb250YWluZXJcIik7XHJcblxyXG5cdC8vIFRlc3QgQ29ubmVjdGlvbiBCdXR0b25cclxuXHRuZXcgU2V0dGluZyhhY3Rpb25zQ29udGFpbmVyKVxyXG5cdFx0LnNldE5hbWUodChcIlRlc3QgQ29ubmVjdGlvblwiKSlcclxuXHRcdC5zZXREZXNjKHQoXCJUZXN0IHRoZSBNQ1Agc2VydmVyIGNvbm5lY3Rpb25cIikpXHJcblx0XHQuYWRkQnV0dG9uKChidXR0b24pID0+IHtcclxuXHRcdFx0YnV0dG9uXHJcblx0XHRcdFx0LnNldEJ1dHRvblRleHQodChcIlRlc3RcIikpXHJcblx0XHRcdFx0Lm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRcdFx0YnV0dG9uLnNldERpc2FibGVkKHRydWUpO1xyXG5cdFx0XHRcdFx0YnV0dG9uLnNldEJ1dHRvblRleHQodChcIlRlc3RpbmcuLi5cIikpO1xyXG5cclxuXHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiW01DUCBUZXN0XSBTdGFydGluZyBjb25uZWN0aW9uIHRlc3QuLi5cIik7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiW01DUCBUZXN0XSBTZXJ2ZXIgVVJMOlwiLCBzZXJ2ZXJVcmwpO1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIltNQ1AgVGVzdF0gQXV0aCBUb2tlbjpcIiwgYXV0aFRva2VuKTtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coXCJbTUNQIFRlc3RdIEFwcCBJRDpcIiwgYXBwSWQpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gVGVzdCAxOiBCYXNpYyBjb25uZWN0aXZpdHlcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coXCJbTUNQIFRlc3RdIFRlc3QgMTogQmFzaWMgY29ubmVjdGl2aXR5Li4uXCIpO1xyXG5cdFx0XHRcdFx0XHRjb25zdCBoZWFsdGhSZXMgPSBhd2FpdCByZXF1ZXN0VXJsKHtcclxuXHRcdFx0XHRcdFx0XHR1cmw6IGBodHRwOi8vJHtwbHVnaW4uc2V0dGluZ3MubWNwSW50ZWdyYXRpb24/Lmhvc3QgfHwgXCIxMjcuMC4wLjFcIn06JHtwbHVnaW4uc2V0dGluZ3MubWNwSW50ZWdyYXRpb24/LnBvcnQgfHwgNzc3N30vaGVhbHRoYCxcclxuXHRcdFx0XHRcdFx0XHRtZXRob2Q6IFwiR0VUXCJcclxuXHRcdFx0XHRcdFx0fSkuY2F0Y2goZXJyID0+IHtcclxuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmVycm9yKFwiW01DUCBUZXN0XSBIZWFsdGggY2hlY2sgZmFpbGVkOlwiLCBlcnIpO1xyXG5cdFx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihgQ2Fubm90IHJlYWNoIHNlcnZlcjogJHtlcnIubWVzc2FnZX1gKTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0XHRpZiAoIWhlYWx0aFJlcyB8fCBoZWFsdGhSZXMuc3RhdHVzICE9PSAyMDApIHtcclxuXHRcdFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoYEhlYWx0aCBjaGVjayBmYWlsZWRgKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIltNQ1AgVGVzdF0gSGVhbHRoIGNoZWNrIHBhc3NlZFwiKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIFRlc3QgMjogTUNQIGluaXRpYWxpemUgd2l0aCBNZXRob2QgQiAoY29tYmluZWQgYmVhcmVyKVxyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIltNQ1AgVGVzdF0gVGVzdCAyOiBNQ1AgaW5pdGlhbGl6ZSB3aXRoIE1ldGhvZCBCLi4uXCIpO1xyXG5cdFx0XHRcdFx0XHRjb25zdCBpbml0UmVzID0gYXdhaXQgcmVxdWVzdFVybCh7XHJcblx0XHRcdFx0XHRcdFx0dXJsOiBzZXJ2ZXJVcmwsXHJcblx0XHRcdFx0XHRcdFx0bWV0aG9kOiBcIlBPU1RcIixcclxuXHRcdFx0XHRcdFx0XHRoZWFkZXJzOiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcIkF1dGhvcml6YXRpb25cIjogYmVhcmVyV2l0aEFwcElkLFxyXG5cdFx0XHRcdFx0XHRcdFx0XCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcIkFjY2VwdFwiOiBcImFwcGxpY2F0aW9uL2pzb24sIHRleHQvZXZlbnQtc3RyZWFtXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcIk1DUC1Qcm90b2NvbC1WZXJzaW9uXCI6IFwiMjAyNS0wNi0xOFwiLFxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0Ym9keTogSlNPTi5zdHJpbmdpZnkoe2pzb25ycGM6IFwiMi4wXCIsIGlkOiAxLCBtZXRob2Q6IFwiaW5pdGlhbGl6ZVwifSlcclxuXHRcdFx0XHRcdFx0fSkuY2F0Y2goZXJyID0+IHtcclxuXHRcdFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoYEluaXRpYWxpemUgZmFpbGVkOiAke2Vyci5tZXNzYWdlfWApO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRcdGlmIChpbml0UmVzLnN0YXR1cyAhPT0gMjAwKSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgZXJyb3JCb2R5ID0gaW5pdFJlcy50ZXh0O1xyXG5cdFx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihgSW5pdGlhbGl6ZSBmYWlsZWQgd2l0aCBzdGF0dXMgJHtpbml0UmVzLnN0YXR1c306ICR7ZXJyb3JCb2R5fWApO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBPYnNpZGlhbidzIHJlcXVlc3RVcmwgcmV0dXJucyBqc29uIGRpcmVjdGx5XHJcblx0XHRcdFx0XHRcdGNvbnN0IGluaXRKc29uID0gaW5pdFJlcy5qc29uO1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIltNQ1AgVGVzdF0gSW5pdGlhbGl6ZSByZXNwb25zZTpcIiwgaW5pdEpzb24pO1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIltNQ1AgVGVzdF0gSGVhZGVyczpcIiwgaW5pdFJlcy5oZWFkZXJzKTtcclxuXHJcblx0XHRcdFx0XHRcdGlmIChpbml0SnNvbi5lcnJvcikge1xyXG5cdFx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihgTUNQIGVycm9yOiAke2luaXRKc29uLmVycm9yLm1lc3NhZ2V9YCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdC8vIE9ic2lkaWFuJ3MgcmVxdWVzdFVybCByZXR1cm5zIGhlYWRlcnMgd2l0aCBsb3dlcmNhc2Uga2V5c1xyXG5cdFx0XHRcdFx0XHRjb25zdCBzZXNzaW9uSWQgPSBpbml0UmVzLmhlYWRlcnNbXCJtY3Atc2Vzc2lvbi1pZFwiXSB8fFxyXG5cdFx0XHRcdFx0XHRcdGluaXRSZXMuaGVhZGVyc1tcIk1jcC1TZXNzaW9uLUlkXCJdIHx8XHJcblx0XHRcdFx0XHRcdFx0aW5pdEpzb24/LnNlc3Npb25JZCB8fFxyXG5cdFx0XHRcdFx0XHRcdGluaXRKc29uPy5yZXN1bHQ/LnNlc3Npb25JZDtcclxuXHJcblx0XHRcdFx0XHRcdGlmICghc2Vzc2lvbklkKSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcIltNQ1AgVGVzdF0gTm8gc2Vzc2lvbiBJRCBpbiByZXNwb25zZVwiKTtcclxuXHRcdFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJObyBzZXNzaW9uIElEIHJldHVybmVkXCIpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIltNQ1AgVGVzdF0gR290IHNlc3Npb24gSUQ6XCIsIHNlc3Npb25JZCk7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBUZXN0IDM6IFRvb2xzIGxpc3RcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coXCJbTUNQIFRlc3RdIFRlc3QgMzogTGlzdGluZyB0b29scy4uLlwiKTtcclxuXHRcdFx0XHRcdFx0Y29uc3QgdG9vbHNSZXMgPSBhd2FpdCByZXF1ZXN0VXJsKHtcclxuXHRcdFx0XHRcdFx0XHR1cmw6IHNlcnZlclVybCxcclxuXHRcdFx0XHRcdFx0XHRtZXRob2Q6IFwiUE9TVFwiLFxyXG5cdFx0XHRcdFx0XHRcdGhlYWRlcnM6IHtcclxuXHRcdFx0XHRcdFx0XHRcdFwiQXV0aG9yaXphdGlvblwiOiBiZWFyZXJXaXRoQXBwSWQsXHJcblx0XHRcdFx0XHRcdFx0XHRcIk1jcC1TZXNzaW9uLUlkXCI6IHNlc3Npb25JZCxcclxuXHRcdFx0XHRcdFx0XHRcdFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XCJBY2NlcHRcIjogXCJhcHBsaWNhdGlvbi9qc29uLCB0ZXh0L2V2ZW50LXN0cmVhbVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XCJNQ1AtUHJvdG9jb2wtVmVyc2lvblwiOiBcIjIwMjUtMDYtMThcIixcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdGJvZHk6IEpTT04uc3RyaW5naWZ5KHtqc29ucnBjOiBcIjIuMFwiLCBpZDogMiwgbWV0aG9kOiBcInRvb2xzL2xpc3RcIn0pXHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gT2JzaWRpYW4ncyByZXF1ZXN0VXJsIHJldHVybnMganNvbiBkaXJlY3RseVxyXG5cdFx0XHRcdFx0XHRjb25zdCB0b29sc0pzb24gPSB0b29sc1Jlcy5qc29uO1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIltNQ1AgVGVzdF0gVG9vbHMgcmVzcG9uc2U6XCIsIHRvb2xzSnNvbik7XHJcblxyXG5cdFx0XHRcdFx0XHRpZiAodG9vbHNKc29uLmVycm9yKSB7XHJcblx0XHRcdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGBUb29scyBsaXN0IGVycm9yOiAke3Rvb2xzSnNvbi5lcnJvci5tZXNzYWdlfWApO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRuZXcgTm90aWNlKHQoXCJDb25uZWN0aW9uIHRlc3Qgc3VjY2Vzc2Z1bCEgTUNQIHNlcnZlciBpcyB3b3JraW5nLlwiKSk7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiW01DUCBUZXN0XSBBbGwgdGVzdHMgcGFzc2VkIVwiKTtcclxuXHJcblx0XHRcdFx0XHR9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJbTUNQIFRlc3RdIFRlc3QgZmFpbGVkOlwiLCBlcnJvcik7XHJcblx0XHRcdFx0XHRcdG5ldyBOb3RpY2UodChcIkNvbm5lY3Rpb24gdGVzdCBmYWlsZWQ6IFwiKSArIGVycm9yLm1lc3NhZ2UpO1xyXG5cdFx0XHRcdFx0fSBmaW5hbGx5IHtcclxuXHRcdFx0XHRcdFx0YnV0dG9uLnNldERpc2FibGVkKGZhbHNlKTtcclxuXHRcdFx0XHRcdFx0YnV0dG9uLnNldEJ1dHRvblRleHQodChcIlRlc3RcIikpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdC8vIFJlc3RhcnQgU2VydmVyIEJ1dHRvblxyXG5cdG5ldyBTZXR0aW5nKGFjdGlvbnNDb250YWluZXIpXHJcblx0XHQuc2V0TmFtZSh0KFwiUmVzdGFydCBTZXJ2ZXJcIikpXHJcblx0XHQuc2V0RGVzYyh0KFwiU3RvcCBhbmQgcmVzdGFydCB0aGUgTUNQIHNlcnZlclwiKSlcclxuXHRcdC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xyXG5cdFx0XHRidXR0b25cclxuXHRcdFx0XHQuc2V0QnV0dG9uVGV4dCh0KFwiUmVzdGFydFwiKSlcclxuXHRcdFx0XHQuc2V0Q3RhKClcclxuXHRcdFx0XHQub25DbGljayhhc3luYyAoKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAoIW1jcE1hbmFnZXIpIHJldHVybjtcclxuXHRcdFx0XHRcdGJ1dHRvbi5zZXREaXNhYmxlZCh0cnVlKTtcclxuXHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdGF3YWl0IG1jcE1hbmFnZXIucmVzdGFydCgpO1xyXG5cdFx0XHRcdFx0XHRuZXcgTm90aWNlKHQoXCJNQ1Agc2VydmVyIHJlc3RhcnRlZFwiKSk7XHJcblx0XHRcdFx0XHRcdHVwZGF0ZVNlcnZlclN0YXR1cyhzdGF0dXNDb250YWluZXIsIG1jcE1hbmFnZXIpO1xyXG5cdFx0XHRcdFx0fSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG5cdFx0XHRcdFx0XHRuZXcgTm90aWNlKHQoXCJGYWlsZWQgdG8gcmVzdGFydCBzZXJ2ZXI6IFwiKSArIGVycm9yLm1lc3NhZ2UpO1xyXG5cdFx0XHRcdFx0fSBmaW5hbGx5IHtcclxuXHRcdFx0XHRcdFx0YnV0dG9uLnNldERpc2FibGVkKGZhbHNlKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdH0pXHJcblx0XHQvLyBUcnkgbmV4dCBhdmFpbGFibGUgcG9ydCBCdXR0b25cclxuXHRcdC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xyXG5cdFx0XHRidXR0b25cclxuXHRcdFx0XHQuc2V0QnV0dG9uVGV4dCh0KFwiVXNlIE5leHQgQXZhaWxhYmxlIFBvcnRcIikpXHJcblx0XHRcdFx0Lm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKCFtY3BNYW5hZ2VyIHx8ICFwbHVnaW4uc2V0dGluZ3MubWNwSW50ZWdyYXRpb24pIHJldHVybjtcclxuXHRcdFx0XHRcdGJ1dHRvbi5zZXREaXNhYmxlZCh0cnVlKTtcclxuXHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IHN0YXJ0UG9ydCA9IChwbHVnaW4uc2V0dGluZ3MubWNwSW50ZWdyYXRpb24ucG9ydCB8fCA3Nzc3KSArIDE7XHJcblx0XHRcdFx0XHRcdGxldCBjYW5kaWRhdGUgPSBzdGFydFBvcnQ7XHJcblx0XHRcdFx0XHRcdGxldCBmb3VuZCA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHQvLyBQcm9iZSBhIHNtYWxsIHJhbmdlIGZvciBhdmFpbGFiaWxpdHkgYnkgYXR0ZW1wdGluZyB0byB1cGRhdGUgKG1hbmFnZXIgdmFsaWRhdGVzKVxyXG5cdFx0XHRcdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IDUwOyBpKyspIHtcclxuXHRcdFx0XHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0XHRcdFx0YXdhaXQgbWNwTWFuYWdlci51cGRhdGVDb25maWcoe3BvcnQ6IGNhbmRpZGF0ZX0pO1xyXG5cdFx0XHRcdFx0XHRcdFx0Zm91bmQgPSB0cnVlO1xyXG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcdFx0fSBjYXRjaCB7XHJcblx0XHRcdFx0XHRcdFx0XHRjYW5kaWRhdGUrKztcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0aWYgKGZvdW5kKSB7XHJcblx0XHRcdFx0XHRcdFx0bmV3IE5vdGljZSh0KFwiUG9ydCB1cGRhdGVkIHRvIFwiKSArIFN0cmluZyhjYW5kaWRhdGUpKTtcclxuXHRcdFx0XHRcdFx0XHR1cGRhdGVTZXJ2ZXJTdGF0dXMoc3RhdHVzQ29udGFpbmVyLCBtY3BNYW5hZ2VyKTtcclxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRuZXcgTm90aWNlKHQoXCJObyBhdmFpbGFibGUgcG9ydCBmb3VuZCBpbiByYW5nZVwiKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0gZmluYWxseSB7XHJcblx0XHRcdFx0XHRcdGJ1dHRvbi5zZXREaXNhYmxlZChmYWxzZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0Ly8gQ2xpZW50IENvbmZpZ3VyYXRpb25cclxuXHRjb250YWluZXJFbC5jcmVhdGVFbChcImgzXCIsIHt0ZXh0OiB0KFwiQ2xpZW50IENvbmZpZ3VyYXRpb25cIil9KTtcclxuXHJcblx0Y29uc3QgY29uZmlnQ29udGFpbmVyID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KFwibWNwLWNvbmZpZy1jb250YWluZXJcIik7XHJcblxyXG5cdC8vIEF1dGhlbnRpY2F0aW9uIE1ldGhvZCBUb2dnbGVcclxuXHRsZXQgdXNlTWV0aG9kQiA9IHRydWU7IC8vIERlZmF1bHQgdG8gTWV0aG9kIEJcclxuXHJcblx0Ly8gRm9yd2FyZCBkZWNsYXJlIHVwZGF0ZSBmdW5jdGlvbnNcclxuXHRsZXQgdXBkYXRlQ2xpZW50Q29uZmlnczogKCkgPT4gdm9pZDtcclxuXHRsZXQgdXBkYXRlRXhhbXBsZXM6ICgpID0+IHZvaWQ7XHJcblxyXG5cdGNvbnN0IGF1dGhNZXRob2RTZXR0aW5nID0gbmV3IFNldHRpbmcoY29uZmlnQ29udGFpbmVyKVxyXG5cdFx0LnNldE5hbWUodChcIkF1dGhlbnRpY2F0aW9uIE1ldGhvZFwiKSlcclxuXHRcdC5zZXREZXNjKHQoXCJDaG9vc2UgdGhlIGF1dGhlbnRpY2F0aW9uIG1ldGhvZCBmb3IgY2xpZW50IGNvbmZpZ3VyYXRpb25zXCIpKVxyXG5cdFx0LmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xyXG5cdFx0XHRkcm9wZG93blxyXG5cdFx0XHRcdC5hZGRPcHRpb24oXCJtZXRob2RCXCIsIHQoXCJNZXRob2QgQjogQ29tYmluZWQgQmVhcmVyIChSZWNvbW1lbmRlZClcIikpXHJcblx0XHRcdFx0LmFkZE9wdGlvbihcIm1ldGhvZEFcIiwgdChcIk1ldGhvZCBBOiBDdXN0b20gSGVhZGVyc1wiKSlcclxuXHRcdFx0XHQuc2V0VmFsdWUoXCJtZXRob2RCXCIpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0dXNlTWV0aG9kQiA9IHZhbHVlID09PSBcIm1ldGhvZEJcIjtcclxuXHRcdFx0XHRcdHVwZGF0ZUNsaWVudENvbmZpZ3MoKTtcclxuXHRcdFx0XHRcdGlmICh1cGRhdGVFeGFtcGxlcykgdXBkYXRlRXhhbXBsZXMoKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHQvLyBHZW5lcmF0ZSBjb25maWd1cmF0aW9uIGJhc2VkIG9uIGN1cnJlbnQgc2V0dGluZ3NcclxuXHQvLyBGb3IgZXh0ZXJuYWwgYWNjZXNzLCB1c2UgYWN0dWFsIElQIG9yIGxvY2FsaG9zdCBkZXBlbmRpbmcgb24gaG9zdCBzZXR0aW5nXHJcblx0Y29uc3QgY29uZmlnSG9zdCA9IHBsdWdpbi5zZXR0aW5ncy5tY3BJbnRlZ3JhdGlvbj8uaG9zdCB8fCBcIjEyNy4wLjAuMVwiO1xyXG5cdGNvbnN0IGRpc3BsYXlIb3N0ID0gY29uZmlnSG9zdCA9PT0gXCIwLjAuMC4wXCIgPyBcIjEyNy4wLjAuMVwiIDogY29uZmlnSG9zdDsgLy8gVXNlIGxvY2FsaG9zdCBmb3IgZGlzcGxheSB3aGVuIGJpbmRpbmcgdG8gYWxsIGludGVyZmFjZXNcclxuXHRjb25zdCBzZXJ2ZXJVcmwgPSBgaHR0cDovLyR7ZGlzcGxheUhvc3R9OiR7cGx1Z2luLnNldHRpbmdzLm1jcEludGVncmF0aW9uPy5wb3J0IHx8IDc3Nzd9L21jcGA7XHJcblxyXG5cdGNvbnN0IGF1dGhUb2tlbiA9IHBsdWdpbi5zZXR0aW5ncy5tY3BJbnRlZ3JhdGlvbj8uYXV0aFRva2VuIHx8IFwiXCI7XHJcblx0Y29uc3QgdmF1bHROYW1lID0gcGx1Z2luLmFwcC52YXVsdC5nZXROYW1lKCk7XHJcblx0Ly8gQ3JlYXRlIGEgc3RhYmxlLCBzbHVnaWZpZWQgdG9vbC9zZXJ2ZXIgbmFtZSBwZXIgdmF1bHQ6IFt2YXVsdF0tdGFza3NcclxuXHRjb25zdCB0b29sTmFtZSA9IGAke3ZhdWx0TmFtZS50b0xvd2VyQ2FzZSgpLnRyaW0oKS5yZXBsYWNlKC9bXmEtejAtOV0rL2csIFwiLVwiKS5yZXBsYWNlKC9eLSt8LSskL2csIFwiXCIpfS10YXNrc2A7XHJcblx0Y29uc3QgYXBwSWQgPSBwbHVnaW4uYXBwLmFwcElkO1xyXG5cdGNvbnN0IGJlYXJlcldpdGhBcHBJZCA9IGBCZWFyZXIgJHthdXRoVG9rZW59KyR7YXBwSWR9YDtcclxuXHJcblx0Ly8gQXV0aGVudGljYXRpb24gTWV0aG9kcyBEb2N1bWVudGF0aW9uXHJcblx0Y29uc3QgYXV0aE1ldGhvZHNDb250YWluZXIgPSBjb25maWdDb250YWluZXIuY3JlYXRlRGl2KFwibWNwLWF1dGgtbWV0aG9kc1wiKTtcclxuXHRhdXRoTWV0aG9kc0NvbnRhaW5lci5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHR0ZXh0OiB0KFwiU3VwcG9ydGVkIEF1dGhlbnRpY2F0aW9uIE1ldGhvZHM6XCIpLFxyXG5cdFx0Y2xzOiBcInNldHRpbmctaXRlbS1kZXNjcmlwdGlvblwiLFxyXG5cdH0pO1xyXG5cdGNvbnN0IGF1dGhMaXN0ID0gYXV0aE1ldGhvZHNDb250YWluZXIuY3JlYXRlRWwoXCJ1bFwiLCB7XHJcblx0XHRjbHM6IFwibWNwLWF1dGgtbGlzdFwiLFxyXG5cdH0pO1xyXG5cclxuXHQvLyBNZXRob2QgQVxyXG5cdGNvbnN0IG1ldGhvZEFJdGVtID0gYXV0aExpc3QuY3JlYXRlRWwoXCJsaVwiKTtcclxuXHRtZXRob2RBSXRlbS5jcmVhdGVFbChcInN0cm9uZ1wiLCB7dGV4dDogXCJNZXRob2QgQSAoQ3VzdG9tIEhlYWRlcik6XCJ9KTtcclxuXHRtZXRob2RBSXRlbS5hcHBlbmRUZXh0KFwiIFwiKTtcclxuXHRtZXRob2RBSXRlbS5jcmVhdGVFbChcImNvZGVcIiwge3RleHQ6IGBtY3AtYXBwLWlkOiAke2FwcElkfWB9KTtcclxuXHRtZXRob2RBSXRlbS5hcHBlbmRUZXh0KFwiICsgXCIpO1xyXG5cdG1ldGhvZEFJdGVtLmNyZWF0ZUVsKFwiY29kZVwiLCB7dGV4dDogYEF1dGhvcml6YXRpb246IEJlYXJlciAke2F1dGhUb2tlbn1gfSk7XHJcblxyXG5cdC8vIE1ldGhvZCBCXHJcblx0Y29uc3QgbWV0aG9kQkl0ZW0gPSBhdXRoTGlzdC5jcmVhdGVFbChcImxpXCIpO1xyXG5cdG1ldGhvZEJJdGVtLmNyZWF0ZUVsKFwic3Ryb25nXCIsIHt0ZXh0OiBcIk1ldGhvZCBCIChDb21iaW5lZCBCZWFyZXIpOlwifSk7XHJcblx0bWV0aG9kQkl0ZW0uYXBwZW5kVGV4dChcIiBcIik7XHJcblx0bWV0aG9kQkl0ZW0uY3JlYXRlRWwoXCJjb2RlXCIsIHt0ZXh0OiBgQXV0aG9yaXphdGlvbjogQmVhcmVyICR7YXV0aFRva2VufSske2FwcElkfWB9KTtcclxuXHJcblx0Ly8gQ29udGFpbmVyIGZvciBjbGllbnQgY29uZmlncyB0aGF0IHdpbGwgYmUgdXBkYXRlZCBkeW5hbWljYWxseVxyXG5cdGNvbnN0IGNsaWVudENvbmZpZ3NDb250YWluZXIgPSBjb25maWdDb250YWluZXIuY3JlYXRlRGl2KFwibWNwLWNsaWVudC1jb25maWdzLWNvbnRhaW5lclwiKTtcclxuXHJcblx0Ly8gRnVuY3Rpb24gdG8gZ2VuZXJhdGUgY2xpZW50IGNvbmZpZ3MgYmFzZWQgb24gc2VsZWN0ZWQgbWV0aG9kXHJcblx0Y29uc3QgZ2VuZXJhdGVDbGllbnRDb25maWdzID0gKCkgPT4ge1xyXG5cdFx0aWYgKHVzZU1ldGhvZEIpIHtcclxuXHRcdFx0Ly8gTWV0aG9kIEI6IENvbWJpbmVkIEJlYXJlciBUb2tlblxyXG5cdFx0XHRyZXR1cm4gW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdG5hbWU6IFwiQ3Vyc29yXCIsXHJcblx0XHRcdFx0XHRjb25maWc6IHtcclxuXHRcdFx0XHRcdFx0bWNwU2VydmVyczoge1xyXG5cdFx0XHRcdFx0XHRcdFt0b29sTmFtZV06IHtcclxuXHRcdFx0XHRcdFx0XHRcdHVybDogc2VydmVyVXJsLFxyXG5cdFx0XHRcdFx0XHRcdFx0aGVhZGVyczoge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRBdXRob3JpemF0aW9uOiBiZWFyZXJXaXRoQXBwSWRcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdG5hbWU6IFwiQ2xhdWRlIERlc2t0b3BcIixcclxuXHRcdFx0XHRcdGNvbmZpZzoge1xyXG5cdFx0XHRcdFx0XHRtY3BTZXJ2ZXJzOiB7XHJcblx0XHRcdFx0XHRcdFx0W3Rvb2xOYW1lXToge1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29tbWFuZDogXCJjdXJsXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRhcmdzOiBbXHJcblx0XHRcdFx0XHRcdFx0XHRcdFwiLVhcIiwgXCJQT1NUXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFwiLUhcIiwgYEF1dGhvcml6YXRpb246ICR7YmVhcmVyV2l0aEFwcElkfWAsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFwiLUhcIiwgXCJDb250ZW50LVR5cGU6IGFwcGxpY2F0aW9uL2pzb25cIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0XCItLWRhdGEtcmF3XCIsIFwiQC1cIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0c2VydmVyVXJsXHJcblx0XHRcdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRuYW1lOiBcIkNsYXVkZSBDb2RlXCIsXHJcblx0XHRcdFx0XHRjb21tYW5kTGluZTogYGNsYXVkZSBtY3AgYWRkIC0tdHJhbnNwb3J0IGh0dHAgJHt0b29sTmFtZX0gJHtzZXJ2ZXJVcmx9IC0taGVhZGVyIFwiQXV0aG9yaXphdGlvbjogJHtiZWFyZXJXaXRoQXBwSWR9XCJgXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRuYW1lOiBcIlZTIENvZGVcIixcclxuXHRcdFx0XHRcdGNvbmZpZzoge1xyXG5cdFx0XHRcdFx0XHRtY3A6IHtcclxuXHRcdFx0XHRcdFx0XHRzZXJ2ZXJzOiB7XHJcblx0XHRcdFx0XHRcdFx0XHRbdG9vbE5hbWVdOiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHR5cGU6IFwiaHR0cFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR1cmw6IHNlcnZlclVybCxcclxuXHRcdFx0XHRcdFx0XHRcdFx0aGVhZGVyczoge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdEF1dGhvcml6YXRpb246IGJlYXJlcldpdGhBcHBJZFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRuYW1lOiBcIldpbmRzdXJmXCIsXHJcblx0XHRcdFx0XHRjb25maWc6IHtcclxuXHRcdFx0XHRcdFx0bWNwU2VydmVyczoge1xyXG5cdFx0XHRcdFx0XHRcdFt0b29sTmFtZV06IHtcclxuXHRcdFx0XHRcdFx0XHRcdHNlcnZlclVybDogc2VydmVyVXJsLFxyXG5cdFx0XHRcdFx0XHRcdFx0aGVhZGVyczoge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRBdXRob3JpemF0aW9uOiBiZWFyZXJXaXRoQXBwSWRcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdG5hbWU6IFwiWmVkXCIsXHJcblx0XHRcdFx0XHRjb25maWc6IHtcclxuXHRcdFx0XHRcdFx0Y29udGV4dF9zZXJ2ZXJzOiB7XHJcblx0XHRcdFx0XHRcdFx0W3Rvb2xOYW1lXToge1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29tbWFuZDoge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRwYXRoOiBcImN1cmxcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0YXJnczogW1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFwiLVhcIiwgXCJQT1NUXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XCItSFwiLCBgQXV0aG9yaXphdGlvbjogJHtiZWFyZXJXaXRoQXBwSWR9YCxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcIi1IXCIsIFwiQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi9qc29uXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XCItLWRhdGEtcmF3XCIsIFwiQC1cIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRzZXJ2ZXJVcmxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHRcdHNldHRpbmdzOiB7fVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIE1ldGhvZCBBOiBDdXN0b20gSGVhZGVyc1xyXG5cdFx0XHRyZXR1cm4gW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdG5hbWU6IFwiQ3Vyc29yXCIsXHJcblx0XHRcdFx0XHRjb25maWc6IHtcclxuXHRcdFx0XHRcdFx0bWNwU2VydmVyczoge1xyXG5cdFx0XHRcdFx0XHRcdFt0b29sTmFtZV06IHtcclxuXHRcdFx0XHRcdFx0XHRcdHVybDogc2VydmVyVXJsLFxyXG5cdFx0XHRcdFx0XHRcdFx0aGVhZGVyczoge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7YXV0aFRva2VufWAsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFwibWNwLWFwcC1pZFwiOiBhcHBJZFxyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0bmFtZTogXCJDbGF1ZGUgRGVza3RvcFwiLFxyXG5cdFx0XHRcdFx0Y29uZmlnOiB7XHJcblx0XHRcdFx0XHRcdG1jcFNlcnZlcnM6IHtcclxuXHRcdFx0XHRcdFx0XHRbdG9vbE5hbWVdOiB7XHJcblx0XHRcdFx0XHRcdFx0XHRjb21tYW5kOiBcImN1cmxcIixcclxuXHRcdFx0XHRcdFx0XHRcdGFyZ3M6IFtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XCItWFwiLCBcIlBPU1RcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0XCItSFwiLCBgQXV0aG9yaXphdGlvbjogQmVhcmVyICR7YXV0aFRva2VufWAsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFwiLUhcIiwgYG1jcC1hcHAtaWQ6ICR7YXBwSWR9YCxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XCItSFwiLCBcIkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvblwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcIi0tZGF0YS1yYXdcIiwgXCJALVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRzZXJ2ZXJVcmxcclxuXHRcdFx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdG5hbWU6IFwiQ2xhdWRlIENvZGVcIixcclxuXHRcdFx0XHRcdGNvbW1hbmRMaW5lOiBgY2xhdWRlIG1jcCBhZGQgLS10cmFuc3BvcnQgaHR0cCAke3Rvb2xOYW1lfSAke3NlcnZlclVybH0gLS1oZWFkZXIgXCJBdXRob3JpemF0aW9uOiBCZWFyZXIgJHthdXRoVG9rZW59XCIgLS1oZWFkZXIgXCJtY3AtYXBwLWlkOiAke2FwcElkfVwiYFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0bmFtZTogXCJWUyBDb2RlXCIsXHJcblx0XHRcdFx0XHRjb25maWc6IHtcclxuXHRcdFx0XHRcdFx0bWNwOiB7XHJcblx0XHRcdFx0XHRcdFx0c2VydmVyczoge1xyXG5cdFx0XHRcdFx0XHRcdFx0W3Rvb2xOYW1lXToge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0eXBlOiBcImh0dHBcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0dXJsOiBzZXJ2ZXJVcmwsXHJcblx0XHRcdFx0XHRcdFx0XHRcdGhlYWRlcnM6IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7YXV0aFRva2VufWAsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XCJtY3AtYXBwLWlkXCI6IGFwcElkXHJcblx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdG5hbWU6IFwiV2luZHN1cmZcIixcclxuXHRcdFx0XHRcdGNvbmZpZzoge1xyXG5cdFx0XHRcdFx0XHRtY3BTZXJ2ZXJzOiB7XHJcblx0XHRcdFx0XHRcdFx0W3Rvb2xOYW1lXToge1xyXG5cdFx0XHRcdFx0XHRcdFx0c2VydmVyVXJsOiBzZXJ2ZXJVcmwsXHJcblx0XHRcdFx0XHRcdFx0XHRoZWFkZXJzOiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHthdXRoVG9rZW59YCxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XCJtY3AtYXBwLWlkXCI6IGFwcElkXHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRuYW1lOiBcIlplZFwiLFxyXG5cdFx0XHRcdFx0Y29uZmlnOiB7XHJcblx0XHRcdFx0XHRcdGNvbnRleHRfc2VydmVyczoge1xyXG5cdFx0XHRcdFx0XHRcdFt0b29sTmFtZV06IHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbW1hbmQ6IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0cGF0aDogXCJjdXJsXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdGFyZ3M6IFtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcIi1YXCIsIFwiUE9TVFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFwiLUhcIiwgYEF1dGhvcml6YXRpb246IEJlYXJlciAke2F1dGhUb2tlbn1gLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFwiLUhcIiwgYG1jcC1hcHAtaWQ6ICR7YXBwSWR9YCxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcIi1IXCIsIFwiQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi9qc29uXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XCItLWRhdGEtcmF3XCIsIFwiQC1cIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRzZXJ2ZXJVcmxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHRcdHNldHRpbmdzOiB7fVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XTtcclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHQvLyBGdW5jdGlvbiB0byB1cGRhdGUgY2xpZW50IGNvbmZpZ3VyYXRpb25zXHJcblx0dXBkYXRlQ2xpZW50Q29uZmlncyA9ICgpID0+IHtcclxuXHRcdGNsaWVudENvbmZpZ3NDb250YWluZXIuZW1wdHkoKTtcclxuXHRcdGNvbnN0IGNsaWVudENvbmZpZ3MgPSBnZW5lcmF0ZUNsaWVudENvbmZpZ3MoKTtcclxuXHJcblx0XHRjbGllbnRDb25maWdzLmZvckVhY2goY2xpZW50ID0+IHtcclxuXHRcdFx0Y29uc3Qgc2VjdGlvbiA9IGNsaWVudENvbmZpZ3NDb250YWluZXIuY3JlYXRlRGl2KFwibWNwLWNsaWVudC1zZWN0aW9uXCIpO1xyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIGNvbGxhcHNpYmxlIGhlYWRlclxyXG5cdFx0XHRjb25zdCBoZWFkZXIgPSBzZWN0aW9uLmNyZWF0ZURpdihcIm1jcC1jbGllbnQtaGVhZGVyXCIpO1xyXG5cclxuXHRcdFx0Y29uc3QgYXJyb3cgPSBoZWFkZXIuY3JlYXRlRGl2KFwibWNwLWFycm93XCIpO1xyXG5cdFx0XHRzZXRJY29uKGFycm93LCBcImNoZXZyb24tcmlnaHRcIik7XHJcblxyXG5cdFx0XHRoZWFkZXIuY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdFx0XHR0ZXh0OiBjbGllbnQubmFtZSxcclxuXHRcdFx0XHRjbHM6IFwibWNwLWNsaWVudC1uYW1lXCJcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCBjb250ZW50ID0gc2VjdGlvbi5jcmVhdGVEaXYoXCJtY3AtY2xpZW50LWNvbnRlbnRcIik7XHJcblx0XHRcdC8vIERpc3BsYXkgaGFuZGxlZCBieSBDU1NcclxuXHJcblx0XHRcdC8vIFRvZ2dsZSBjb2xsYXBzZS9leHBhbmRcclxuXHRcdFx0bGV0IGlzRXhwYW5kZWQgPSBmYWxzZTtcclxuXHRcdFx0aGVhZGVyLm9uY2xpY2sgPSAoKSA9PiB7XHJcblx0XHRcdFx0aXNFeHBhbmRlZCA9ICFpc0V4cGFuZGVkO1xyXG5cdFx0XHRcdGlmIChpc0V4cGFuZGVkKSB7XHJcblx0XHRcdFx0XHRjb250ZW50LmNsYXNzTGlzdC5hZGQoXCJleHBhbmRlZFwiKTtcclxuXHRcdFx0XHRcdGFycm93LmNsYXNzTGlzdC5hZGQoXCJleHBhbmRlZFwiKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0Y29udGVudC5jbGFzc0xpc3QucmVtb3ZlKFwiZXhwYW5kZWRcIik7XHJcblx0XHRcdFx0XHRhcnJvdy5jbGFzc0xpc3QucmVtb3ZlKFwiZXhwYW5kZWRcIik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gQWRkIGNvbmZpZ3VyYXRpb24gY29udGVudFxyXG5cdFx0XHRpZiAoY2xpZW50Lm5hbWUgPT09IFwiQ3Vyc29yXCIpIHtcclxuXHRcdFx0XHQvLyBBZGQgb25lLWNsaWNrIGluc3RhbGwgZm9yIEN1cnNvclxyXG5cdFx0XHRcdGNvbnN0IGN1cnNvckluc3RhbGxTZWN0aW9uID0gY29udGVudC5jcmVhdGVEaXYoXCJtY3AtY3Vyc29yLWluc3RhbGwtc2VjdGlvblwiKTtcclxuXHRcdFx0XHRjdXJzb3JJbnN0YWxsU2VjdGlvbi5jcmVhdGVFbChcImg0XCIsIHtcclxuXHRcdFx0XHRcdHRleHQ6IHQoXCJRdWljayBJbnN0YWxsXCIpLFxyXG5cdFx0XHRcdFx0Y2xzOiBcIm1jcC1kb2NzLXN1YnRpdGxlXCIsXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIEdlbmVyYXRlIEN1cnNvciBkZWVwbGluayBjb25maWd1cmF0aW9uXHJcblx0XHRcdFx0Y29uc3QgY3Vyc29yQ29uZmlnID0ge1xyXG5cdFx0XHRcdFx0dXJsOiBzZXJ2ZXJVcmwsXHJcblx0XHRcdFx0XHRoZWFkZXJzOiB7XHJcblx0XHRcdFx0XHRcdEF1dGhvcml6YXRpb246IGJlYXJlcldpdGhBcHBJZFxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdC8vIEJhc2U2NCBlbmNvZGUgdGhlIGNvbmZpZ3VyYXRpb25cclxuXHRcdFx0XHRjb25zdCBlbmNvZGVkQ29uZmlnID0gYnRvYShKU09OLnN0cmluZ2lmeShjdXJzb3JDb25maWcpKTtcclxuXHRcdFx0XHRjb25zdCBjdXJzb3JEZWVwbGluayA9IGBjdXJzb3I6Ly9hbnlzcGhlcmUuY3Vyc29yLWRlZXBsaW5rL21jcC9pbnN0YWxsP25hbWU9JHtlbmNvZGVVUklDb21wb25lbnQodG9vbE5hbWUpfSZjb25maWc9JHtlbmNvZGVkQ29uZmlnfWA7XHJcblxyXG5cdFx0XHRcdC8vIENyZWF0ZSBpbnN0YWxsIGJ1dHRvbiBjb250YWluZXJcclxuXHRcdFx0XHRjb25zdCBpbnN0YWxsQ29udGFpbmVyID0gY3Vyc29ySW5zdGFsbFNlY3Rpb24uY3JlYXRlRGl2KFwibWNwLWN1cnNvci1pbnN0YWxsLWNvbnRhaW5lclwiKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHQvLyBBZGQgZGVzY3JpcHRpb25cclxuXHRcdFx0XHRpbnN0YWxsQ29udGFpbmVyLmNyZWF0ZUVsKFwicFwiLCB7XHJcblx0XHRcdFx0XHR0ZXh0OiB0KFwiQ2xpY2sgdGhlIGJ1dHRvbiBiZWxvdyB0byBhdXRvbWF0aWNhbGx5IGFkZCB0aGlzIE1DUCBzZXJ2ZXIgdG8gQ3Vyc29yOlwiKSxcclxuXHRcdFx0XHRcdGNsczogXCJtY3AtY3Vyc29yLWluc3RhbGwtZGVzY1wiXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIENyZWF0ZSBpbnN0YWxsIGJ1dHRvbiB3aXRoIG9mZmljaWFsIEN1cnNvciBTVkcgKGRhcmsgbW9kZSBzdHlsZSlcclxuXHRcdFx0XHRjb25zdCBpbnN0YWxsTGluayA9IGluc3RhbGxDb250YWluZXIuY3JlYXRlRWwoXCJhXCIsIHtcclxuXHRcdFx0XHRcdGhyZWY6IGN1cnNvckRlZXBsaW5rLFxyXG5cdFx0XHRcdFx0Y2xzOiBcIm1jcC1jdXJzb3ItaW5zdGFsbC1saW5rXCJcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Y29uc3QgaW5zdGFsbEJ0biA9IGluc3RhbGxMaW5rLmNyZWF0ZUVsKFwiaW1nXCIsIHtcclxuXHRcdFx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHRcdFx0c3JjOiBcImh0dHBzOi8vY3Vyc29yLmNvbS9kZWVwbGluay9tY3AtaW5zdGFsbC1kYXJrLnN2Z1wiLFxyXG5cdFx0XHRcdFx0XHRhbHQ6IGBBZGQgJHt0b29sTmFtZX0gTUNQIHNlcnZlciB0byBDdXJzb3JgLFxyXG5cdFx0XHRcdFx0XHRoZWlnaHQ6IFwiMzJcIlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyBBZGRpdGlvbmFsIGJ1dHRvbnMgY29udGFpbmVyXHJcblx0XHRcdFx0Y29uc3QgYWRkaXRpb25hbEJ1dHRvbnMgPSBpbnN0YWxsQ29udGFpbmVyLmNyZWF0ZURpdihcIm1jcC1jdXJzb3ItYWRkaXRpb25hbC1idXR0b25zXCIpO1xyXG5cclxuXHRcdFx0XHQvLyBDb3B5IGRlZXBsaW5rIGJ1dHRvblxyXG5cdFx0XHRcdGNvbnN0IGNvcHlEZWVwbGlua0J0biA9IGFkZGl0aW9uYWxCdXR0b25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0XHRcdHRleHQ6IHQoXCJDb3B5IEluc3RhbGwgTGlua1wiKSxcclxuXHRcdFx0XHRcdGNsczogXCJtY3AtY3Vyc29yLWNvcHktZGVlcGxpbmstYnRuXCJcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Y29weURlZXBsaW5rQnRuLm9uY2xpY2sgPSBhc3luYyAoKSA9PiB7XHJcblx0XHRcdFx0XHRhd2FpdCBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChjdXJzb3JEZWVwbGluayk7XHJcblx0XHRcdFx0XHRjb3B5RGVlcGxpbmtCdG4uc2V0VGV4dCh0KFwiQ29waWVkIVwiKSk7XHJcblx0XHRcdFx0XHRjb3B5RGVlcGxpbmtCdG4uYWRkQ2xhc3MoXCJjb3BpZWRcIik7XHJcblx0XHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRcdFx0Y29weURlZXBsaW5rQnRuLnNldFRleHQodChcIkNvcHkgSW5zdGFsbCBMaW5rXCIpKTtcclxuXHRcdFx0XHRcdFx0Y29weURlZXBsaW5rQnRuLnJlbW92ZUNsYXNzKFwiY29waWVkXCIpO1xyXG5cdFx0XHRcdFx0fSwgMjAwMCk7XHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0Ly8gQWRkIHNlcGFyYXRvclxyXG5cdFx0XHRcdGNvbnRlbnQuY3JlYXRlRWwoXCJoclwiLCB7XHJcblx0XHRcdFx0XHRjbHM6IFwibWNwLXNlY3Rpb24tc2VwYXJhdG9yXCJcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gQWRkIG1hbnVhbCBjb25maWd1cmF0aW9uIHNlY3Rpb25cclxuXHRcdFx0XHRjb250ZW50LmNyZWF0ZUVsKFwiaDRcIiwge1xyXG5cdFx0XHRcdFx0dGV4dDogdChcIk1hbnVhbCBDb25maWd1cmF0aW9uXCIpLFxyXG5cdFx0XHRcdFx0Y2xzOiBcIm1jcC1kb2NzLXN1YnRpdGxlXCIsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Ly8gU2hvdyB0aGUgY29uZmlndXJhdGlvbiBKU09OXHJcblx0XHRcdFx0Y3JlYXRlQ29uZmlnQmxvY2soY29udGVudCwgY2xpZW50LmNvbmZpZywgYCR7Y2xpZW50Lm5hbWV9IGNvbmZpZ3VyYXRpb25gKTtcclxuXHRcdFx0fSBlbHNlIGlmIChjbGllbnQuY29uZmlnKSB7XHJcblx0XHRcdFx0Y3JlYXRlQ29uZmlnQmxvY2soY29udGVudCwgY2xpZW50LmNvbmZpZywgYCR7Y2xpZW50Lm5hbWV9IGNvbmZpZ3VyYXRpb25gKTtcclxuXHRcdFx0fSBlbHNlIGlmIChjbGllbnQuY29tbWFuZExpbmUpIHtcclxuXHRcdFx0XHQvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciBjb21tYW5kIGxpbmUgY29uZmlnc1xyXG5cdFx0XHRcdGNvbnN0IGNtZEJsb2NrID0gY29udGVudC5jcmVhdGVEaXYoXCJtY3AtY29uZmlnLWJsb2NrXCIpO1xyXG5cdFx0XHRcdGNvbnN0IGNvZGVCbG9jayA9IGNtZEJsb2NrLmNyZWF0ZUVsKFwicHJlXCIsIHtcclxuXHRcdFx0XHRcdGNsczogXCJtY3AtY29uZmlnLWNvZGVcIixcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRjb25zdCBjb2RlRWwgPSBjb2RlQmxvY2suY3JlYXRlRWwoXCJjb2RlXCIpO1xyXG5cdFx0XHRcdGNvZGVFbC5zZXRUZXh0KGNsaWVudC5jb21tYW5kTGluZSk7XHJcblxyXG5cdFx0XHRcdC8vIENvZGUgYmxvY2sgc3R5bGluZyBoYW5kbGVkIGJ5IENTU1xyXG5cclxuXHRcdFx0XHQvLyBDcmVhdGUgY29weSBidXR0b25cclxuXHRcdFx0XHRjb25zdCBjb3B5QnRuID0gY21kQmxvY2suY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHRcdFx0dGV4dDogdChcIkNvcHlcIiksXHJcblx0XHRcdFx0XHRjbHM6IFwibWNwLWNvcHktYnRuXCIsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0Y29weUJ0bi5vbmNsaWNrID0gYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRcdFx0YXdhaXQgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQoY2xpZW50LmNvbW1hbmRMaW5lISk7XHJcblx0XHRcdFx0XHRjb3B5QnRuLnNldFRleHQodChcIkNvcGllZCFcIikpO1xyXG5cdFx0XHRcdFx0Y29weUJ0bi5hZGRDbGFzcyhcImNvcGllZFwiKTtcclxuXHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRjb3B5QnRuLnNldFRleHQodChcIkNvcHlcIikpO1xyXG5cdFx0XHRcdFx0XHRjb3B5QnRuLnJlbW92ZUNsYXNzKFwiY29waWVkXCIpO1xyXG5cdFx0XHRcdFx0fSwgMjAwMCk7XHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0Ly8gU3R5bGVzIGFyZSBoYW5kbGVkIGJ5IENTU1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9O1xyXG5cclxuXHQvLyBJbml0aWFsIHJlbmRlciBvZiBjbGllbnQgY29uZmlnc1xyXG5cdHVwZGF0ZUNsaWVudENvbmZpZ3MoKTtcclxuXHJcblx0Ly8gQVBJIERvY3VtZW50YXRpb25cclxuXHRjb250YWluZXJFbC5jcmVhdGVFbChcImgzXCIsIHt0ZXh0OiB0KFwiQVBJIERvY3VtZW50YXRpb25cIil9KTtcclxuXHJcblx0Y29uc3QgZG9jc0NvbnRhaW5lciA9IGNvbnRhaW5lckVsLmNyZWF0ZURpdihcIm1jcC1kb2NzLWNvbnRhaW5lclwiKTtcclxuXHJcblx0Ly8gU2VydmVyIEVuZHBvaW50IFNlY3Rpb25cclxuXHRjb25zdCBlbmRwb2ludFNlY3Rpb24gPSBkb2NzQ29udGFpbmVyLmNyZWF0ZURpdihcIm1jcC1kb2NzLXNlY3Rpb25cIik7XHJcblx0ZW5kcG9pbnRTZWN0aW9uLmNyZWF0ZUVsKFwiaDRcIiwge1xyXG5cdFx0dGV4dDogdChcIlNlcnZlciBFbmRwb2ludFwiKSxcclxuXHRcdGNsczogXCJtY3AtZG9jcy1zdWJ0aXRsZVwiLFxyXG5cdH0pO1xyXG5cclxuXHRjb25zdCBlbmRwb2ludEJveCA9IGVuZHBvaW50U2VjdGlvbi5jcmVhdGVEaXYoXCJtY3AtZW5kcG9pbnQtYm94XCIpO1xyXG5cdGNvbnN0IGVuZHBvaW50Q29udGVudCA9IGVuZHBvaW50Qm94LmNyZWF0ZURpdihcIm1jcC1lbmRwb2ludC1jb250ZW50XCIpO1xyXG5cclxuXHRjb25zdCBlbmRwb2ludExhYmVsID0gZW5kcG9pbnRDb250ZW50LmNyZWF0ZVNwYW4oXCJtY3AtZW5kcG9pbnQtbGFiZWxcIik7XHJcblx0ZW5kcG9pbnRMYWJlbC5zZXRUZXh0KFwiVVJMOiBcIik7XHJcblxyXG5cdGNvbnN0IGVuZHBvaW50VXJsID0gc2VydmVyVXJsO1xyXG5cdGVuZHBvaW50Q29udGVudC5jcmVhdGVFbChcImNvZGVcIiwge1xyXG5cdFx0dGV4dDogZW5kcG9pbnRVcmwsXHJcblx0XHRjbHM6IFwibWNwLWVuZHBvaW50LXVybFwiLFxyXG5cdH0pO1xyXG5cclxuXHQvLyBDb3B5IGVuZHBvaW50IGJ1dHRvblxyXG5cdGNvbnN0IGNvcHlFbmRwb2ludEJ0biA9IGVuZHBvaW50Qm94LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdHRleHQ6IHQoXCJDb3B5IFVSTFwiKSxcclxuXHRcdGNsczogXCJtY3AtY29weS1lbmRwb2ludC1idG5cIixcclxuXHR9KTtcclxuXHRjb3B5RW5kcG9pbnRCdG4ub25jbGljayA9IGFzeW5jICgpID0+IHtcclxuXHRcdGF3YWl0IG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KGVuZHBvaW50VXJsKTtcclxuXHRcdGNvcHlFbmRwb2ludEJ0bi5zZXRUZXh0KHQoXCJDb3BpZWQhXCIpKTtcclxuXHRcdGNvcHlFbmRwb2ludEJ0bi5hZGRDbGFzcyhcImNvcGllZFwiKTtcclxuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRjb3B5RW5kcG9pbnRCdG4uc2V0VGV4dCh0KFwiQ29weSBVUkxcIikpO1xyXG5cdFx0XHRjb3B5RW5kcG9pbnRCdG4ucmVtb3ZlQ2xhc3MoXCJjb3BpZWRcIik7XHJcblx0XHR9LCAyMDAwKTtcclxuXHR9O1xyXG5cclxuXHQvLyBBdmFpbGFibGUgVG9vbHMgU2VjdGlvblxyXG5cdGNvbnN0IHRvb2xzU2VjdGlvbiA9IGRvY3NDb250YWluZXIuY3JlYXRlRGl2KFwibWNwLWRvY3Mtc2VjdGlvblwiKTtcclxuXHR0b29sc1NlY3Rpb24uY3JlYXRlRWwoXCJoNFwiLCB7XHJcblx0XHR0ZXh0OiB0KFwiQXZhaWxhYmxlIFRvb2xzXCIpLFxyXG5cdFx0Y2xzOiBcIm1jcC1kb2NzLXN1YnRpdGxlXCIsXHJcblx0fSk7XHJcblxyXG5cdGNvbnN0IHRvb2xzR3JpZCA9IHRvb2xzU2VjdGlvbi5jcmVhdGVEaXYoXCJtY3AtdG9vbHMtZ3JpZFwiKTtcclxuXHRjb25zdCB0b29sc0luZm8gPSB0b29sc1NlY3Rpb24uY3JlYXRlRGl2KFwibWNwLXRvb2xzLWluZm9cIik7XHJcblx0dG9vbHNJbmZvLnNldFRleHQodChcIkxvYWRpbmcgdG9vbHMuLi5cIikgYXMgc3RyaW5nKTtcclxuXHJcblx0YXN5bmMgZnVuY3Rpb24gcmVuZGVyRHluYW1pY1Rvb2xzKCkge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Ly8gU3RlcCAxOiBpbml0aWFsaXplIHRvIGdldCBzZXNzaW9uIGlkXHJcblx0XHRcdGNvbnN0IGluaXRSZXMgPSBhd2FpdCByZXF1ZXN0VXJsKHtcclxuXHRcdFx0XHR1cmw6IHNlcnZlclVybCxcclxuXHRcdFx0XHRtZXRob2Q6IFwiUE9TVFwiLFxyXG5cdFx0XHRcdGhlYWRlcnM6IHtcclxuXHRcdFx0XHRcdFwiQXV0aG9yaXphdGlvblwiOiBgJHtiZWFyZXJXaXRoQXBwSWR9YCxcclxuXHRcdFx0XHRcdFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxyXG5cdFx0XHRcdFx0XCJBY2NlcHRcIjogXCJhcHBsaWNhdGlvbi9qc29uLCB0ZXh0L2V2ZW50LXN0cmVhbVwiLFxyXG5cdFx0XHRcdFx0XCJNQ1AtUHJvdG9jb2wtVmVyc2lvblwiOiBcIjIwMjUtMDYtMThcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGJvZHk6IEpTT04uc3RyaW5naWZ5KHtqc29ucnBjOiBcIjIuMFwiLCBpZDogMSwgbWV0aG9kOiBcImluaXRpYWxpemVcIn0pXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gU2Vzc2lvbiBJRCBzaG91bGQgYmUgaW4gdGhlIE1jcC1TZXNzaW9uLUlkIGhlYWRlciBhY2NvcmRpbmcgdG8gc3BlY1xyXG5cdFx0XHQvLyBPYnNpZGlhbidzIHJlcXVlc3RVcmwgcmV0dXJucyBoZWFkZXJzIHdpdGggbG93ZXJjYXNlIGtleXNcclxuXHRcdFx0Y29uc3Qgc2Vzc2lvbklkID0gaW5pdFJlcy5oZWFkZXJzW1wibWNwLXNlc3Npb24taWRcIl0gfHxcclxuXHRcdFx0XHRpbml0UmVzLmhlYWRlcnNbXCJNY3AtU2Vzc2lvbi1JZFwiXTsgIC8vIEZhbGxiYWNrIGZvciBjYXNlIHZhcmlhdGlvbnNcclxuXHJcblx0XHRcdGlmICghc2Vzc2lvbklkKSB7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm8gc2Vzc2lvbiBpZCByZXR1cm5lZFwiKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gU3RlcCAyOiBsaXN0IHRvb2xzXHJcblx0XHRcdGNvbnN0IGxpc3RSZXMgPSBhd2FpdCByZXF1ZXN0VXJsKHtcclxuXHRcdFx0XHR1cmw6IHNlcnZlclVybCxcclxuXHRcdFx0XHRtZXRob2Q6IFwiUE9TVFwiLFxyXG5cdFx0XHRcdGhlYWRlcnM6IHtcclxuXHRcdFx0XHRcdFwiQXV0aG9yaXphdGlvblwiOiBgJHtiZWFyZXJXaXRoQXBwSWR9YCxcclxuXHRcdFx0XHRcdFwiTWNwLVNlc3Npb24tSWRcIjogc2Vzc2lvbklkLFxyXG5cdFx0XHRcdFx0XCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXHJcblx0XHRcdFx0XHRcIkFjY2VwdFwiOiBcImFwcGxpY2F0aW9uL2pzb24sIHRleHQvZXZlbnQtc3RyZWFtXCIsXHJcblx0XHRcdFx0XHRcIk1DUC1Qcm90b2NvbC1WZXJzaW9uXCI6IFwiMjAyNS0wNi0xOFwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0Ym9keTogSlNPTi5zdHJpbmdpZnkoe2pzb25ycGM6IFwiMi4wXCIsIGlkOiAyLCBtZXRob2Q6IFwidG9vbHMvbGlzdFwifSlcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zb2xlLmxvZyhcIk1DUCB0b29sc1wiLCBsaXN0UmVzKTtcclxuXHJcblx0XHRcdGNvbnN0IHRvb2xzID0gbGlzdFJlcz8uanNvbi5yZXN1bHQ/LnRvb2xzIHx8IFtdO1xyXG5cclxuXHRcdFx0dG9vbHNJbmZvLnNldFRleHQoXCJcIik7XHJcblx0XHRcdGlmICghdG9vbHMubGVuZ3RoKSB7XHJcblx0XHRcdFx0dG9vbHNJbmZvLnNldFRleHQodChcIk5vIHRvb2xzIGF2YWlsYWJsZVwiKSBhcyBzdHJpbmcpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dG9vbHMuZm9yRWFjaCgodG9vbDogYW55KSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgdG9vbENhcmQgPSB0b29sc0dyaWQuY3JlYXRlRGl2KFwibWNwLXRvb2wtY2FyZFwiKTtcclxuXHRcdFx0XHRjb25zdCB0b29sSGVhZGVyID0gdG9vbENhcmQuY3JlYXRlRGl2KFwibWNwLXRvb2wtaGVhZGVyXCIpO1xyXG5cdFx0XHRcdGNvbnN0IGljb25FbCA9IHRvb2xIZWFkZXIuY3JlYXRlRGl2KFwibWNwLXRvb2wtaWNvblwiKTtcclxuXHRcdFx0XHRzZXRJY29uKGljb25FbCwgXCJ3cmVuY2hcIik7XHJcblx0XHRcdFx0dG9vbEhlYWRlci5jcmVhdGVFbChcImNvZGVcIiwge3RleHQ6IHRvb2wubmFtZSwgY2xzOiBcIm1jcC10b29sLW5hbWVcIn0pO1xyXG5cdFx0XHRcdGNvbnN0IHRvb2xEZXNjID0gdG9vbENhcmQuY3JlYXRlRGl2KFwibWNwLXRvb2wtZGVzY1wiKTtcclxuXHRcdFx0XHR0b29sRGVzYy5zZXRUZXh0KHRvb2wuZGVzY3JpcHRpb24gfHwgXCJcIik7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSBjYXRjaCAoZTogYW55KSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJbTUNQIFRvb2xzXSBGYWlsZWQgdG8gbG9hZCB0b29sczpcIiwgZSk7XHJcblx0XHRcdHRvb2xzSW5mby5zZXRUZXh0KHQoXCJGYWlsZWQgdG8gbG9hZCB0b29scy4gSXMgdGhlIE1DUCBzZXJ2ZXIgcnVubmluZz9cIikgYXMgc3RyaW5nKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIEZpcmUgYW5kIGZvcmdldDsgVUkgcmVtYWlucyByZXNwb25zaXZlXHJcblx0cmVuZGVyRHluYW1pY1Rvb2xzKCk7XHJcblxyXG5cdC8vIEV4YW1wbGUgUmVxdWVzdCBTZWN0aW9uXHJcblx0Y29uc3QgZXhhbXBsZVNlY3Rpb24gPSBkb2NzQ29udGFpbmVyLmNyZWF0ZURpdihcIm1jcC1kb2NzLXNlY3Rpb25cIik7XHJcblx0ZXhhbXBsZVNlY3Rpb24uY3JlYXRlRWwoXCJoNFwiLCB7XHJcblx0XHR0ZXh0OiB0KFwiRXhhbXBsZSBSZXF1ZXN0XCIpLFxyXG5cdFx0Y2xzOiBcIm1jcC1kb2NzLXN1YnRpdGxlXCIsXHJcblx0fSk7XHJcblxyXG5cdGNvbnN0IGV4YW1wbGVDb250YWluZXIgPSBleGFtcGxlU2VjdGlvbi5jcmVhdGVEaXYoXCJtY3AtZXhhbXBsZS1jb250YWluZXJcIik7XHJcblxyXG5cdC8vIEZ1bmN0aW9uIHRvIHVwZGF0ZSBleGFtcGxlcyBiYXNlZCBvbiBzZWxlY3RlZCBhdXRoZW50aWNhdGlvbiBtZXRob2RcclxuXHR1cGRhdGVFeGFtcGxlcyA9ICgpID0+IHtcclxuXHRcdGV4YW1wbGVDb250YWluZXIuZW1wdHkoKTtcclxuXHRcdHJlbmRlckV4YW1wbGVzKCk7XHJcblx0fTtcclxuXHJcblx0Y29uc3QgcmVuZGVyRXhhbXBsZXMgPSAoKSA9PiB7XHJcblx0XHQvLyBUYWIgYnV0dG9ucyBmb3IgZGlmZmVyZW50IGV4YW1wbGVzXHJcblx0XHRjb25zdCB0YWJDb250YWluZXIgPSBleGFtcGxlQ29udGFpbmVyLmNyZWF0ZURpdihcIm1jcC1leGFtcGxlLXRhYnNcIik7XHJcblx0XHRjb25zdCBjdXJsVGFiID0gdGFiQ29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0dGV4dDogXCJjVVJMXCIsXHJcblx0XHRcdGNsczogXCJtY3AtZXhhbXBsZS10YWIgYWN0aXZlXCIsXHJcblx0XHR9KTtcclxuXHRcdGNvbnN0IGpzVGFiID0gdGFiQ29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0dGV4dDogXCJKYXZhU2NyaXB0XCIsXHJcblx0XHRcdGNsczogXCJtY3AtZXhhbXBsZS10YWJcIixcclxuXHRcdH0pO1xyXG5cdFx0Y29uc3QgcHl0aG9uVGFiID0gdGFiQ29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0dGV4dDogXCJQeXRob25cIixcclxuXHRcdFx0Y2xzOiBcIm1jcC1leGFtcGxlLXRhYlwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gRXhhbXBsZSBjb2RlIGJsb2Nrc1xyXG5cdFx0Y29uc3QgZXhhbXBsZUNvZGVDb250YWluZXIgPSBleGFtcGxlQ29udGFpbmVyLmNyZWF0ZURpdihcIm1jcC1leGFtcGxlLWNvZGUtY29udGFpbmVyXCIpO1xyXG5cclxuXHRcdC8vIGNVUkwgZXhhbXBsZVxyXG5cdFx0Y29uc3QgY3VybEV4YW1wbGUgPSBleGFtcGxlQ29kZUNvbnRhaW5lci5jcmVhdGVEaXYoXCJtY3AtZXhhbXBsZS1ibG9jayBhY3RpdmVcIik7XHJcblx0XHRjdXJsRXhhbXBsZS5jcmVhdGVFbChcImRpdlwiLCB7dGV4dDogXCIxKSBJbml0aWFsaXplXCIsIGNsczogXCJtY3AtZXhhbXBsZS1zdWJ0aXRsZVwifSk7XHJcblx0XHRjb25zdCBjdXJsUHJlSW5pdCA9IGN1cmxFeGFtcGxlLmNyZWF0ZUVsKFwicHJlXCIsIHtjbHM6IFwibWNwLWV4YW1wbGUtY29kZVwifSk7XHJcblxyXG5cdFx0aWYgKHVzZU1ldGhvZEIpIHtcclxuXHRcdFx0Y3VybFByZUluaXQuY3JlYXRlRWwoXCJjb2RlXCIsIHtcclxuXHRcdFx0XHR0ZXh0OiBgY3VybCAtaSAtWCBQT1NUICR7ZW5kcG9pbnRVcmx9IFxcXFxcclxuICAtSCBcIkF1dGhvcml6YXRpb246ICR7YmVhcmVyV2l0aEFwcElkfVwiIFxcXFxcclxuICAtSCBcIkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvblwiIFxcXFxcclxuICAtZCAne1wianNvbnJwY1wiOlwiMi4wXCIsXCJpZFwiOjEsXCJtZXRob2RcIjpcImluaXRpYWxpemVcIn0nYFxyXG5cdFx0XHR9KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGN1cmxQcmVJbml0LmNyZWF0ZUVsKFwiY29kZVwiLCB7XHJcblx0XHRcdFx0dGV4dDogYGN1cmwgLWkgLVggUE9TVCAke2VuZHBvaW50VXJsfSBcXFxcXHJcbiAgLUggXCJBdXRob3JpemF0aW9uOiBCZWFyZXIgJHthdXRoVG9rZW59XCIgXFxcXFxyXG4gIC1IIFwibWNwLWFwcC1pZDogJHthcHBJZH1cIiBcXFxcXHJcbiAgLUggXCJDb250ZW50LVR5cGU6IGFwcGxpY2F0aW9uL2pzb25cIiBcXFxcXHJcbiAgLWQgJ3tcImpzb25ycGNcIjpcIjIuMFwiLFwiaWRcIjoxLFwibWV0aG9kXCI6XCJpbml0aWFsaXplXCJ9J2BcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Y3VybEV4YW1wbGUuY3JlYXRlRWwoXCJkaXZcIiwge3RleHQ6IFwiMikgQ2FsbCB0b29sIHdpdGggc2Vzc2lvbiBpZFwiLCBjbHM6IFwibWNwLWV4YW1wbGUtc3VidGl0bGVcIn0pO1xyXG5cdFx0Y29uc3QgY3VybFByZUNhbGwgPSBjdXJsRXhhbXBsZS5jcmVhdGVFbChcInByZVwiLCB7Y2xzOiBcIm1jcC1leGFtcGxlLWNvZGVcIn0pO1xyXG5cclxuXHRcdGlmICh1c2VNZXRob2RCKSB7XHJcblx0XHRcdGN1cmxQcmVDYWxsLmNyZWF0ZUVsKFwiY29kZVwiLCB7XHJcblx0XHRcdFx0dGV4dDogYGN1cmwgLVggUE9TVCAke2VuZHBvaW50VXJsfSBcXFxcXHJcbiAgLUggXCJBdXRob3JpemF0aW9uOiAke2JlYXJlcldpdGhBcHBJZH1cIiBcXFxcXHJcbiAgLUggXCJtY3Atc2Vzc2lvbi1pZDogUkVQTEFDRV9XSVRIX1NFU1NJT05fSURcIiBcXFxcXHJcbiAgLUggXCJDb250ZW50LVR5cGU6IGFwcGxpY2F0aW9uL2pzb25cIiBcXFxcXHJcbiAgLWQgJ3tcImpzb25ycGNcIjpcIjIuMFwiLFwiaWRcIjoyLFwibWV0aG9kXCI6XCJ0b29scy9jYWxsXCIsXCJwYXJhbXNcIjp7XCJuYW1lXCI6XCJxdWVyeV90YXNrc1wiLFwiYXJndW1lbnRzXCI6e1wiZmlsdGVyXCI6e1wiY29tcGxldGVkXCI6ZmFsc2UsXCJwcmlvcml0eVwiOjV9LFwibGltaXRcIjoxMH19fSdgXHJcblx0XHRcdH0pO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Y3VybFByZUNhbGwuY3JlYXRlRWwoXCJjb2RlXCIsIHtcclxuXHRcdFx0XHR0ZXh0OiBgY3VybCAtWCBQT1NUICR7ZW5kcG9pbnRVcmx9IFxcXFxcclxuICAtSCBcIkF1dGhvcml6YXRpb246IEJlYXJlciAke2F1dGhUb2tlbn1cIiBcXFxcXHJcbiAgLUggXCJtY3AtYXBwLWlkOiAke2FwcElkfVwiIFxcXFxcclxuICAtSCBcIm1jcC1zZXNzaW9uLWlkOiBSRVBMQUNFX1dJVEhfU0VTU0lPTl9JRFwiIFxcXFxcclxuICAtSCBcIkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvblwiIFxcXFxcclxuICAtZCAne1wianNvbnJwY1wiOlwiMi4wXCIsXCJpZFwiOjIsXCJtZXRob2RcIjpcInRvb2xzL2NhbGxcIixcInBhcmFtc1wiOntcIm5hbWVcIjpcInF1ZXJ5X3Rhc2tzXCIsXCJhcmd1bWVudHNcIjp7XCJmaWx0ZXJcIjp7XCJjb21wbGV0ZWRcIjpmYWxzZSxcInByaW9yaXR5XCI6NX0sXCJsaW1pdFwiOjEwfX19J2BcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSmF2YVNjcmlwdCBleGFtcGxlIChJbml0ICsgQ2FsbClcclxuXHRcdGNvbnN0IGpzRXhhbXBsZSA9IGV4YW1wbGVDb2RlQ29udGFpbmVyLmNyZWF0ZURpdihcIm1jcC1leGFtcGxlLWJsb2NrXCIpO1xyXG5cdFx0anNFeGFtcGxlLmNyZWF0ZUVsKFwiZGl2XCIsIHt0ZXh0OiBcIjEpIEluaXRpYWxpemVcIiwgY2xzOiBcIm1jcC1leGFtcGxlLXN1YnRpdGxlXCJ9KTtcclxuXHRcdGNvbnN0IGpzUHJlSW5pdCA9IGpzRXhhbXBsZS5jcmVhdGVFbChcInByZVwiLCB7Y2xzOiBcIm1jcC1leGFtcGxlLWNvZGVcIn0pO1xyXG5cclxuXHRcdGlmICh1c2VNZXRob2RCKSB7XHJcblx0XHRcdGpzUHJlSW5pdC5jcmVhdGVFbChcImNvZGVcIiwge1xyXG5cdFx0XHRcdHRleHQ6IGBjb25zdCBpbml0UmVzID0gYXdhaXQgZmV0Y2goJyR7ZW5kcG9pbnRVcmx9Jywge1xcbiAgbWV0aG9kOiAnUE9TVCcsXFxuICBoZWFkZXJzOiB7XFxuICAgICdBdXRob3JpemF0aW9uJzogJyR7YmVhcmVyV2l0aEFwcElkfScsXFxuICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcXG4gIH0sXFxuICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGpzb25ycGM6ICcyLjAnLCBpZDogMSwgbWV0aG9kOiAnaW5pdGlhbGl6ZScgfSlcXG59KTtcXG5jb25zdCBzZXNzaW9uSWQgPSBpbml0UmVzLmhlYWRlcnMuZ2V0KCdtY3Atc2Vzc2lvbi1pZCcpO2BcclxuXHRcdFx0fSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRqc1ByZUluaXQuY3JlYXRlRWwoXCJjb2RlXCIsIHtcclxuXHRcdFx0XHR0ZXh0OiBgY29uc3QgaW5pdFJlcyA9IGF3YWl0IGZldGNoKCcke2VuZHBvaW50VXJsfScsIHtcXG4gIG1ldGhvZDogJ1BPU1QnLFxcbiAgaGVhZGVyczoge1xcbiAgICAnQXV0aG9yaXphdGlvbic6ICdCZWFyZXIgJHthdXRoVG9rZW59JyxcXG4gICAgJ21jcC1hcHAtaWQnOiAnJHthcHBJZH0nLFxcbiAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXFxuICB9LFxcbiAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBqc29ucnBjOiAnMi4wJywgaWQ6IDEsIG1ldGhvZDogJ2luaXRpYWxpemUnIH0pXFxufSk7XFxuY29uc3Qgc2Vzc2lvbklkID0gaW5pdFJlcy5oZWFkZXJzLmdldCgnbWNwLXNlc3Npb24taWQnKTtgXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdGpzRXhhbXBsZS5jcmVhdGVFbChcImRpdlwiLCB7dGV4dDogXCIyKSBDYWxsIHRvb2wgd2l0aCBzZXNzaW9uIGlkXCIsIGNsczogXCJtY3AtZXhhbXBsZS1zdWJ0aXRsZVwifSk7XHJcblx0XHRjb25zdCBqc1ByZUNhbGwgPSBqc0V4YW1wbGUuY3JlYXRlRWwoXCJwcmVcIiwge2NsczogXCJtY3AtZXhhbXBsZS1jb2RlXCJ9KTtcclxuXHJcblx0XHRpZiAodXNlTWV0aG9kQikge1xyXG5cdFx0XHRqc1ByZUNhbGwuY3JlYXRlRWwoXCJjb2RlXCIsIHtcclxuXHRcdFx0XHR0ZXh0OiBgY29uc3QgY2FsbFJlcyA9IGF3YWl0IGZldGNoKCcke2VuZHBvaW50VXJsfScsIHtcXG4gIG1ldGhvZDogJ1BPU1QnLFxcbiAgaGVhZGVyczoge1xcbiAgICAnQXV0aG9yaXphdGlvbic6ICcke2JlYXJlcldpdGhBcHBJZH0nLFxcbiAgICAnbWNwLXNlc3Npb24taWQnOiBzZXNzaW9uSWQsXFxuICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcXG4gIH0sXFxuICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XFxuICAgIGpzb25ycGM6ICcyLjAnLFxcbiAgICBpZDogMixcXG4gICAgbWV0aG9kOiAndG9vbHMvY2FsbCcsXFxuICAgIHBhcmFtczogeyBuYW1lOiAncXVlcnlfdGFza3MnLCBhcmd1bWVudHM6IHsgZmlsdGVyOiB7IGNvbXBsZXRlZDogZmFsc2UsIHByaW9yaXR5OiA1IH0sIGxpbWl0OiAxMCB9IH1cXG4gIH0pXFxufSk7XFxuY29uc29sZS5sb2coYXdhaXQgY2FsbFJlcy5qc29uKCkpO2BcclxuXHRcdFx0fSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRqc1ByZUNhbGwuY3JlYXRlRWwoXCJjb2RlXCIsIHtcclxuXHRcdFx0XHR0ZXh0OiBgY29uc3QgY2FsbFJlcyA9IGF3YWl0IGZldGNoKCcke2VuZHBvaW50VXJsfScsIHtcXG4gIG1ldGhvZDogJ1BPU1QnLFxcbiAgaGVhZGVyczoge1xcbiAgICAnQXV0aG9yaXphdGlvbic6ICdCZWFyZXIgJHthdXRoVG9rZW59JyxcXG4gICAgJ21jcC1hcHAtaWQnOiAnJHthcHBJZH0nLFxcbiAgICAnbWNwLXNlc3Npb24taWQnOiBzZXNzaW9uSWQsXFxuICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcXG4gIH0sXFxuICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XFxuICAgIGpzb25ycGM6ICcyLjAnLFxcbiAgICBpZDogMixcXG4gICAgbWV0aG9kOiAndG9vbHMvY2FsbCcsXFxuICAgIHBhcmFtczogeyBuYW1lOiAncXVlcnlfdGFza3MnLCBhcmd1bWVudHM6IHsgZmlsdGVyOiB7IGNvbXBsZXRlZDogZmFsc2UsIHByaW9yaXR5OiA1IH0sIGxpbWl0OiAxMCB9IH1cXG4gIH0pXFxufSk7XFxuY29uc29sZS5sb2coYXdhaXQgY2FsbFJlcy5qc29uKCkpO2BcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUHl0aG9uIGV4YW1wbGUgKEluaXQgKyBDYWxsKVxyXG5cdFx0Y29uc3QgcHl0aG9uRXhhbXBsZSA9IGV4YW1wbGVDb2RlQ29udGFpbmVyLmNyZWF0ZURpdihcIm1jcC1leGFtcGxlLWJsb2NrXCIpO1xyXG5cdFx0cHl0aG9uRXhhbXBsZS5jcmVhdGVFbChcImRpdlwiLCB7dGV4dDogXCIxKSBJbml0aWFsaXplXCIsIGNsczogXCJtY3AtZXhhbXBsZS1zdWJ0aXRsZVwifSk7XHJcblx0XHRjb25zdCBweXRob25QcmVJbml0ID0gcHl0aG9uRXhhbXBsZS5jcmVhdGVFbChcInByZVwiLCB7Y2xzOiBcIm1jcC1leGFtcGxlLWNvZGVcIn0pO1xyXG5cclxuXHRcdGlmICh1c2VNZXRob2RCKSB7XHJcblx0XHRcdHB5dGhvblByZUluaXQuY3JlYXRlRWwoXCJjb2RlXCIsIHtcclxuXHRcdFx0XHR0ZXh0OiBgaW1wb3J0IHJlcXVlc3RzXHJcblxyXG4jIEluaXRpYWxpemUgc2Vzc2lvblxyXG5pbml0X3JlcyA9IHJlcXVlc3RzLnBvc3QoXHJcbiAgICAnJHtlbmRwb2ludFVybH0nLFxyXG4gICAgaGVhZGVycz17XHJcbiAgICAgICAgJ0F1dGhvcml6YXRpb24nOiAnJHtiZWFyZXJXaXRoQXBwSWR9JyxcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXHJcbiAgICB9LFxyXG4gICAganNvbj17J2pzb25ycGMnOiAnMi4wJywgJ2lkJzogMSwgJ21ldGhvZCc6ICdpbml0aWFsaXplJ31cclxuKVxyXG5zZXNzaW9uX2lkID0gaW5pdF9yZXMuaGVhZGVycy5nZXQoJ21jcC1zZXNzaW9uLWlkJylcclxucHJpbnQoZlwiU2Vzc2lvbiBJRDoge3Nlc3Npb25faWR9XCIpYCxcclxuXHRcdFx0fSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRweXRob25QcmVJbml0LmNyZWF0ZUVsKFwiY29kZVwiLCB7XHJcblx0XHRcdFx0dGV4dDogYGltcG9ydCByZXF1ZXN0c1xyXG5cclxuIyBJbml0aWFsaXplIHNlc3Npb25cclxuaW5pdF9yZXMgPSByZXF1ZXN0cy5wb3N0KFxyXG4gICAgJyR7ZW5kcG9pbnRVcmx9JyxcclxuICAgIGhlYWRlcnM9e1xyXG4gICAgICAgICdBdXRob3JpemF0aW9uJzogJ0JlYXJlciAke2F1dGhUb2tlbn0nLFxyXG4gICAgICAgICdtY3AtYXBwLWlkJzogJyR7YXBwSWR9JyxcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXHJcbiAgICB9LFxyXG4gICAganNvbj17J2pzb25ycGMnOiAnMi4wJywgJ2lkJzogMSwgJ21ldGhvZCc6ICdpbml0aWFsaXplJ31cclxuKVxyXG5zZXNzaW9uX2lkID0gaW5pdF9yZXMuaGVhZGVycy5nZXQoJ21jcC1zZXNzaW9uLWlkJylcclxucHJpbnQoZlwiU2Vzc2lvbiBJRDoge3Nlc3Npb25faWR9XCIpYCxcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0cHl0aG9uRXhhbXBsZS5jcmVhdGVFbChcImRpdlwiLCB7dGV4dDogXCIyKSBDYWxsIHRvb2wgd2l0aCBzZXNzaW9uIGlkXCIsIGNsczogXCJtY3AtZXhhbXBsZS1zdWJ0aXRsZVwifSk7XHJcblx0XHRjb25zdCBweXRob25QcmVDYWxsID0gcHl0aG9uRXhhbXBsZS5jcmVhdGVFbChcInByZVwiLCB7Y2xzOiBcIm1jcC1leGFtcGxlLWNvZGVcIn0pO1xyXG5cclxuXHRcdGlmICh1c2VNZXRob2RCKSB7XHJcblx0XHRcdHB5dGhvblByZUNhbGwuY3JlYXRlRWwoXCJjb2RlXCIsIHtcclxuXHRcdFx0XHR0ZXh0OiBgIyBDYWxsIHRvb2xcclxuY2FsbF9yZXMgPSByZXF1ZXN0cy5wb3N0KFxyXG4gICAgJyR7ZW5kcG9pbnRVcmx9JyxcclxuICAgIGhlYWRlcnM9e1xyXG4gICAgICAgICdBdXRob3JpemF0aW9uJzogJyR7YmVhcmVyV2l0aEFwcElkfScsXHJcbiAgICAgICAgJ21jcC1zZXNzaW9uLWlkJzogc2Vzc2lvbl9pZCxcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXHJcbiAgICB9LFxyXG4gICAganNvbj17XHJcbiAgICAgICAgJ2pzb25ycGMnOiAnMi4wJyxcclxuICAgICAgICAnaWQnOiAyLFxyXG4gICAgICAgICdtZXRob2QnOiAndG9vbHMvY2FsbCcsXHJcbiAgICAgICAgJ3BhcmFtcyc6IHtcclxuICAgICAgICAgICAgJ25hbWUnOiAncXVlcnlfdGFza3MnLFxyXG4gICAgICAgICAgICAnYXJndW1lbnRzJzoge1xyXG4gICAgICAgICAgICAgICAgJ2ZpbHRlcic6IHsnY29tcGxldGVkJzogRmFsc2UsICdwcmlvcml0eSc6IDV9LFxyXG4gICAgICAgICAgICAgICAgJ2xpbWl0JzogMTBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuKVxyXG5wcmludChjYWxsX3Jlcy5qc29uKCkpYCxcclxuXHRcdFx0fSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRweXRob25QcmVDYWxsLmNyZWF0ZUVsKFwiY29kZVwiLCB7XHJcblx0XHRcdFx0dGV4dDogYCMgQ2FsbCB0b29sXHJcbmNhbGxfcmVzID0gcmVxdWVzdHMucG9zdChcclxuICAgICcke2VuZHBvaW50VXJsfScsXHJcbiAgICBoZWFkZXJzPXtcclxuICAgICAgICAnQXV0aG9yaXphdGlvbic6ICdCZWFyZXIgJHthdXRoVG9rZW59JyxcclxuICAgICAgICAnbWNwLWFwcC1pZCc6ICcke2FwcElkfScsXHJcbiAgICAgICAgJ21jcC1zZXNzaW9uLWlkJzogc2Vzc2lvbl9pZCxcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXHJcbiAgICB9LFxyXG4gICAganNvbj17XHJcbiAgICAgICAgJ2pzb25ycGMnOiAnMi4wJyxcclxuICAgICAgICAnaWQnOiAyLFxyXG4gICAgICAgICdtZXRob2QnOiAndG9vbHMvY2FsbCcsXHJcbiAgICAgICAgJ3BhcmFtcyc6IHtcclxuICAgICAgICAgICAgJ25hbWUnOiAncXVlcnlfdGFza3MnLFxyXG4gICAgICAgICAgICAnYXJndW1lbnRzJzoge1xyXG4gICAgICAgICAgICAgICAgJ2ZpbHRlcic6IHsnY29tcGxldGVkJzogRmFsc2UsICdwcmlvcml0eSc6IDV9LFxyXG4gICAgICAgICAgICAgICAgJ2xpbWl0JzogMTBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuKVxyXG5wcmludChjYWxsX3Jlcy5qc29uKCkpYCxcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVGFiIHN3aXRjaGluZyBsb2dpY1xyXG5cdFx0Y29uc3QgdGFicyA9IFtjdXJsVGFiLCBqc1RhYiwgcHl0aG9uVGFiXTtcclxuXHRcdGNvbnN0IGV4YW1wbGVzID0gW2N1cmxFeGFtcGxlLCBqc0V4YW1wbGUsIHB5dGhvbkV4YW1wbGVdO1xyXG5cclxuXHRcdHRhYnMuZm9yRWFjaCgodGFiLCBpbmRleCkgPT4ge1xyXG5cdFx0XHR0YWIub25jbGljayA9ICgpID0+IHtcclxuXHRcdFx0XHR0YWJzLmZvckVhY2godCA9PiB0LnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpKTtcclxuXHRcdFx0XHRleGFtcGxlcy5mb3JFYWNoKGUgPT4gZS5yZW1vdmVDbGFzcyhcImFjdGl2ZVwiKSk7XHJcblx0XHRcdFx0dGFiLmFkZENsYXNzKFwiYWN0aXZlXCIpO1xyXG5cdFx0XHRcdGV4YW1wbGVzW2luZGV4XS5hZGRDbGFzcyhcImFjdGl2ZVwiKTtcclxuXHRcdFx0fTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEFkZCBjb3B5IGJ1dHRvbiBmb3IgZWFjaCBjb2RlIGJsb2NrXHJcblx0XHRleGFtcGxlcy5mb3JFYWNoKChleGFtcGxlKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvZGVCbG9ja3MgPSBleGFtcGxlLnF1ZXJ5U2VsZWN0b3JBbGwoXCJwcmUubWNwLWV4YW1wbGUtY29kZVwiKTtcclxuXHRcdFx0Y29kZUJsb2Nrcy5mb3JFYWNoKChwcmVCbG9jaykgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IGNvZGVFbGVtZW50ID0gcHJlQmxvY2sucXVlcnlTZWxlY3RvcihcImNvZGVcIik7XHJcblx0XHRcdFx0aWYgKCFjb2RlRWxlbWVudCkgcmV0dXJuO1xyXG5cclxuXHRcdFx0XHRjb25zdCBjb3B5QnRuID0gcHJlQmxvY2suY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHRcdFx0dGV4dDogdChcIkNvcHlcIiksXHJcblx0XHRcdFx0XHRjbHM6IFwibWNwLWV4YW1wbGUtY29weS1idG5cIixcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRjb3B5QnRuLm9uY2xpY2sgPSBhc3luYyAoKSA9PiB7XHJcblx0XHRcdFx0XHRjb25zdCBjb2RlID0gY29kZUVsZW1lbnQudGV4dENvbnRlbnQgfHwgXCJcIjtcclxuXHRcdFx0XHRcdGF3YWl0IG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KGNvZGUpO1xyXG5cdFx0XHRcdFx0Y29weUJ0bi5zZXRUZXh0KHQoXCJDb3BpZWQhXCIpKTtcclxuXHRcdFx0XHRcdGNvcHlCdG4uYWRkQ2xhc3MoXCJjb3BpZWRcIik7XHJcblx0XHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRcdFx0Y29weUJ0bi5zZXRUZXh0KHQoXCJDb3B5XCIpKTtcclxuXHRcdFx0XHRcdFx0Y29weUJ0bi5yZW1vdmVDbGFzcyhcImNvcGllZFwiKTtcclxuXHRcdFx0XHRcdH0sIDIwMDApO1xyXG5cdFx0XHRcdH07XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fTtcclxuXHJcblx0Ly8gSW5pdGlhbCByZW5kZXIgb2YgZXhhbXBsZXNcclxuXHRyZW5kZXJFeGFtcGxlcygpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVTZXJ2ZXJTdGF0dXMoXHJcblx0Y29udGFpbmVyOiBIVE1MRWxlbWVudCxcclxuXHRtY3BNYW5hZ2VyPzogTWNwU2VydmVyTWFuYWdlclxyXG4pOiB2b2lkIHtcclxuXHRjb250YWluZXIuZW1wdHkoKTtcclxuXHJcblx0aWYgKCFtY3BNYW5hZ2VyKSB7XHJcblx0XHRjb250YWluZXIuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFwiTUNQIFNlcnZlciBub3QgaW5pdGlhbGl6ZWRcIiksXHJcblx0XHRcdGNsczogXCJtY3Atc3RhdHVzLWVycm9yXCIsXHJcblx0XHR9KTtcclxuXHRcdHJldHVybjtcclxuXHR9XHJcblxyXG5cdGNvbnN0IHN0YXR1cyA9IG1jcE1hbmFnZXIuZ2V0U3RhdHVzKCk7XHJcblx0Y29uc3Qgc3RhdHVzRWwgPSBjb250YWluZXIuY3JlYXRlRGl2KFwibWNwLXN0YXR1c1wiKTtcclxuXHJcblx0Ly8gU3RhdHVzIEluZGljYXRvclxyXG5cdGNvbnN0IGluZGljYXRvckVsID0gc3RhdHVzRWwuY3JlYXRlRGl2KFwibWNwLXN0YXR1cy1pbmRpY2F0b3JcIik7XHJcblx0aW5kaWNhdG9yRWwuYWRkQ2xhc3Moc3RhdHVzLnJ1bm5pbmcgPyBcInJ1bm5pbmdcIiA6IFwic3RvcHBlZFwiKTtcclxuXHRpbmRpY2F0b3JFbC5jcmVhdGVTcGFuKHtcclxuXHRcdHRleHQ6IHN0YXR1cy5ydW5uaW5nID8gXCLil49cIiA6IFwi4peLXCIsXHJcblx0XHRjbHM6IFwic3RhdHVzLWRvdFwiLFxyXG5cdH0pO1xyXG5cdGluZGljYXRvckVsLmNyZWF0ZVNwYW4oe1xyXG5cdFx0dGV4dDogc3RhdHVzLnJ1bm5pbmcgPyB0KFwiUnVubmluZ1wiKSA6IHQoXCJTdG9wcGVkXCIpLFxyXG5cdFx0Y2xzOiBcInN0YXR1cy10ZXh0XCIsXHJcblx0fSk7XHJcblxyXG5cdC8vIFN0YXR1cyBEZXRhaWxzXHJcblx0aWYgKHN0YXR1cy5ydW5uaW5nICYmIHN0YXR1cy5wb3J0KSB7XHJcblx0XHRjb25zdCBkZXRhaWxzRWwgPSBzdGF0dXNFbC5jcmVhdGVEaXYoXCJtY3Atc3RhdHVzLWRldGFpbHNcIik7XHJcblx0XHRkZXRhaWxzRWwuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHR0ZXh0OiBgJHt0KFwiUG9ydFwiKX06ICR7c3RhdHVzLnBvcnR9YCxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGlmIChzdGF0dXMuc3RhcnRUaW1lKSB7XHJcblx0XHRcdGNvbnN0IHVwdGltZSA9IERhdGUubm93KCkgLSBzdGF0dXMuc3RhcnRUaW1lLmdldFRpbWUoKTtcclxuXHRcdFx0Y29uc3QgaG91cnMgPSBNYXRoLmZsb29yKHVwdGltZSAvIDM2MDAwMDApO1xyXG5cdFx0XHRjb25zdCBtaW51dGVzID0gTWF0aC5mbG9vcigodXB0aW1lICUgMzYwMDAwMCkgLyA2MDAwMCk7XHJcblx0XHRcdGRldGFpbHNFbC5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdFx0dGV4dDogYCR7dChcIlVwdGltZVwiKX06ICR7aG91cnN9aCAke21pbnV0ZXN9bWAsXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChzdGF0dXMucmVxdWVzdENvdW50ICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0ZGV0YWlsc0VsLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0XHR0ZXh0OiBgJHt0KFwiUmVxdWVzdHNcIil9OiAke3N0YXR1cy5yZXF1ZXN0Q291bnR9YCxcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG4iXX0=