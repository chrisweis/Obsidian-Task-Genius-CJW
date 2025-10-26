/**
 * McpServerManager - Manages the lifecycle of the MCP server
 */
import { __awaiter } from "tslib";
import { Notice, Platform } from "obsidian";
import { McpServer } from "./McpServer";
import { AuthMiddleware } from "./auth/AuthMiddleware";
export class McpServerManager {
    constructor(plugin) {
        this.plugin = plugin;
        this.autoRestartAttempts = 0;
        this.maxAutoRestartAttempts = 3;
        // Load config from settings or use defaults
        this.config = this.getDefaultConfig();
        this.loadConfig();
    }
    // Check if a port is available on the given host
    isPortAvailable(port, host) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const net = require("net");
        return new Promise((resolve) => {
            const tester = net
                .createServer()
                .once("error", (err) => {
                if (err && (err.code === "EADDRINUSE" || err.code === "EACCES")) {
                    resolve(false);
                }
                else {
                    resolve(false);
                }
            })
                .once("listening", () => {
                tester.close(() => resolve(true));
            })
                .listen(port, host);
        });
    }
    getDefaultConfig() {
        return {
            enabled: false,
            port: 7777,
            host: "127.0.0.1",
            authToken: AuthMiddleware.generateToken(),
            enableCors: true,
            logLevel: "info",
        };
    }
    loadConfig() {
        const settings = this.plugin.settings;
        if (settings.mcpIntegration) {
            this.config = Object.assign(Object.assign({}, this.config), settings.mcpIntegration);
        }
    }
    saveConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.mcpIntegration = this.config;
            yield this.plugin.saveSettings();
        });
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            // Only initialize on desktop
            if (!Platform.isDesktopApp) {
                console.log("MCP Server is only available on desktop");
                return;
            }
            if (this.config.enabled) {
                yield this.start();
            }
        });
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.server) {
                yield this.stop();
            }
            // Proactively check for port availability to better handle multi-vault scenarios
            const available = yield this.isPortAvailable(this.config.port, this.config.host);
            if (!available) {
                new Notice(`Port ${this.config.port} on ${this.config.host} is already in use. Please choose another port in MCP settings.`);
                console.warn(`MCP Server port conflict detected on ${this.config.host}:${this.config.port}`);
                return;
            }
            try {
                this.server = new McpServer(this.plugin, this.config);
                yield this.server.start();
                this.autoRestartAttempts = 0;
                const status = this.server.getStatus();
                new Notice(`MCP Server started on ${this.config.host}:${status.port}`);
            }
            catch (error) {
                console.error("Failed to start MCP Server:", error);
                if ((error === null || error === void 0 ? void 0 : error.code) === "EADDRINUSE" || /EADDRINUSE/.test((error === null || error === void 0 ? void 0 : error.message) || "")) {
                    new Notice(`Port ${this.config.port} on ${this.config.host} is already in use. Please change the port in settings.`);
                    return;
                }
                new Notice(`Failed to start MCP Server: ${error.message}`);
                // Auto-restart logic for transient errors only
                if (this.autoRestartAttempts < this.maxAutoRestartAttempts) {
                    this.autoRestartAttempts++;
                    console.log(`Attempting auto-restart (${this.autoRestartAttempts}/${this.maxAutoRestartAttempts})`);
                    setTimeout(() => this.start(), 5000);
                }
            }
        });
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.server) {
                return;
            }
            try {
                yield this.server.stop();
                this.server = undefined;
                new Notice("MCP Server stopped");
            }
            catch (error) {
                console.error("Failed to stop MCP Server:", error);
                new Notice(`Failed to stop MCP Server: ${error.message}`);
            }
        });
    }
    restart() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.stop();
            yield this.start();
        });
    }
    toggle() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isRunning()) {
                yield this.stop();
                this.config.enabled = false;
            }
            else {
                this.config.enabled = true;
                yield this.start();
            }
            yield this.saveConfig();
        });
    }
    isRunning() {
        var _a;
        return ((_a = this.server) === null || _a === void 0 ? void 0 : _a.getStatus().running) || false;
    }
    getStatus() {
        if (!this.server) {
            return {
                running: false,
            };
        }
        const status = this.server.getStatus();
        return {
            running: status.running,
            port: status.port,
            startTime: status.startTime,
            requestCount: status.requestCount,
        };
    }
    getConfig() {
        return Object.assign({}, this.config);
    }
    updateConfig(updates) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const wasRunning = this.isRunning();
            const desiredPort = (_a = updates.port) !== null && _a !== void 0 ? _a : this.config.port;
            const desiredHost = (_b = updates.host) !== null && _b !== void 0 ? _b : this.config.host;
            const portChanged = updates.port !== undefined && updates.port !== this.config.port;
            const hostChanged = updates.host !== undefined && updates.host !== this.config.host;
            // If network settings are changing, validate availability first
            if (portChanged || hostChanged) {
                const available = yield this.isPortAvailable(desiredPort, desiredHost);
                if (!available) {
                    new Notice(`Port ${desiredHost}:${desiredPort} is already in use. Please choose another port.`);
                    throw new Error("Port in use");
                }
            }
            // Update config (after validation)
            this.config = Object.assign(Object.assign({}, this.config), updates);
            // Save to settings
            yield this.saveConfig();
            // Update running server config
            if (this.server) {
                this.server.updateConfig(updates);
                // Restart if network settings changed
                if (wasRunning && (portChanged || hostChanged)) {
                    yield this.restart();
                }
            }
            // Start/stop based on enabled state
            if (updates.enabled !== undefined) {
                if (updates.enabled && !wasRunning) {
                    yield this.start();
                }
                else if (!updates.enabled && wasRunning) {
                    yield this.stop();
                }
            }
        });
    }
    getAuthToken() {
        return this.config.authToken;
    }
    regenerateAuthToken() {
        const newToken = AuthMiddleware.generateToken();
        this.config.authToken = newToken;
        if (this.server) {
            this.server.updateConfig({ authToken: newToken });
        }
        this.saveConfig();
        return newToken;
    }
    cleanup() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.stop();
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWNwU2VydmVyTWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIk1jcFNlcnZlck1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0dBRUc7O0FBRUgsT0FBTyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDNUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUd4QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFdkQsTUFBTSxPQUFPLGdCQUFnQjtJQTJCNUIsWUFBb0IsTUFBNkI7UUFBN0IsV0FBTSxHQUFOLE1BQU0sQ0FBdUI7UUF4QnpDLHdCQUFtQixHQUFXLENBQUMsQ0FBQztRQUNoQywyQkFBc0IsR0FBVyxDQUFDLENBQUM7UUF3QjFDLDRDQUE0QztRQUM1QyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3RDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUNuQixDQUFDO0lBekJELGlEQUFpRDtJQUN6QyxlQUFlLENBQUMsSUFBWSxFQUFFLElBQVk7UUFDakQsOERBQThEO1FBQzlELE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMzQixPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDOUIsTUFBTSxNQUFNLEdBQUcsR0FBRztpQkFDaEIsWUFBWSxFQUFFO2lCQUNkLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFRLEVBQUUsRUFBRTtnQkFDM0IsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLFlBQVksSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxFQUFFO29CQUNoRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7aUJBQ2Y7cUJBQU07b0JBQ04sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFD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QUFzQztnQkFDdEMsSUFBSSxVQUFVLElBQUksQ0FBQyxXQUFXLElBQUksV0FBVyxDQUFDLEVBQUU7b0JBQy9DLE1BQU0sSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2lCQUNyQjthQUNEO1lBRUQsb0NBQW9DO1lBQ3BDLElBQUksT0FBTyxDQUFDLE9BQU8sS0FBSyxTQUFTLEVBQUU7Z0JBQ2xDLElBQUksT0FBTyxDQUFDLE9BQU8sSUFBSSxDQUFDLFVBQVUsRUFBRTtvQkFDbkMsTUFBTSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7aUJBQ25CO3FCQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxJQUFJLFVBQVUsRUFBRTtvQkFDMUMsTUFBTSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7aUJBQ2xCO2FBQ0Q7O0tBQ0Q7SUFFRCxZQUFZO1FBQ1gsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQztJQUM5QixDQUFDO0lBRUQsbUJBQW1CO1FBQ2xCLE1BQU0sUUFBUSxHQUFHLGNBQWMsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUNoRCxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUM7UUFFakMsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ2hCLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7U0FDbEQ7UUFFRCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDbEIsT0FBTyxRQUFRLENBQUM7SUFDakIsQ0FBQztJQUVLLE9BQU87O1lBQ1osTUFBTSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDbkIsQ0FBQztLQUFBO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogTWNwU2VydmVyTWFuYWdlciAtIE1hbmFnZXMgdGhlIGxpZmVjeWNsZSBvZiB0aGUgTUNQIHNlcnZlclxyXG4gKi9cclxuXHJcbmltcG9ydCB7IE5vdGljZSwgUGxhdGZvcm0gfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgTWNwU2VydmVyIH0gZnJvbSBcIi4vTWNwU2VydmVyXCI7XHJcbmltcG9ydCB7IE1jcFNlcnZlckNvbmZpZywgTWNwU2VydmVyU3RhdHVzIH0gZnJvbSBcIi4vdHlwZXMvbWNwXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIi4uL2luZGV4XCI7XHJcbmltcG9ydCB7IEF1dGhNaWRkbGV3YXJlIH0gZnJvbSBcIi4vYXV0aC9BdXRoTWlkZGxld2FyZVwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIE1jcFNlcnZlck1hbmFnZXIge1xyXG5cdHByaXZhdGUgc2VydmVyPzogTWNwU2VydmVyO1xyXG5cdHByaXZhdGUgY29uZmlnOiBNY3BTZXJ2ZXJDb25maWc7XHJcblx0cHJpdmF0ZSBhdXRvUmVzdGFydEF0dGVtcHRzOiBudW1iZXIgPSAwO1xyXG5cdHByaXZhdGUgbWF4QXV0b1Jlc3RhcnRBdHRlbXB0czogbnVtYmVyID0gMztcclxuXHJcblx0Ly8gQ2hlY2sgaWYgYSBwb3J0IGlzIGF2YWlsYWJsZSBvbiB0aGUgZ2l2ZW4gaG9zdFxyXG5cdHByaXZhdGUgaXNQb3J0QXZhaWxhYmxlKHBvcnQ6IG51bWJlciwgaG9zdDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XHJcblx0XHQvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXZhci1yZXF1aXJlc1xyXG5cdFx0Y29uc3QgbmV0ID0gcmVxdWlyZShcIm5ldFwiKTtcclxuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xyXG5cdFx0XHRjb25zdCB0ZXN0ZXIgPSBuZXRcclxuXHRcdFx0XHQuY3JlYXRlU2VydmVyKClcclxuXHRcdFx0XHQub25jZShcImVycm9yXCIsIChlcnI6IGFueSkgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKGVyciAmJiAoZXJyLmNvZGUgPT09IFwiRUFERFJJTlVTRVwiIHx8IGVyci5jb2RlID09PSBcIkVBQ0NFU1wiKSkge1xyXG5cdFx0XHRcdFx0XHRyZXNvbHZlKGZhbHNlKTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdHJlc29sdmUoZmFsc2UpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pXHJcblx0XHRcdFx0Lm9uY2UoXCJsaXN0ZW5pbmdcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGVzdGVyLmNsb3NlKCgpID0+IHJlc29sdmUodHJ1ZSkpO1xyXG5cdFx0XHRcdH0pXHJcblx0XHRcdFx0Lmxpc3Rlbihwb3J0LCBob3N0KTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Y29uc3RydWN0b3IocHJpdmF0ZSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbikge1xyXG5cdFx0Ly8gTG9hZCBjb25maWcgZnJvbSBzZXR0aW5ncyBvciB1c2UgZGVmYXVsdHNcclxuXHRcdHRoaXMuY29uZmlnID0gdGhpcy5nZXREZWZhdWx0Q29uZmlnKCk7XHJcblx0XHR0aGlzLmxvYWRDb25maWcoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZ2V0RGVmYXVsdENvbmZpZygpOiBNY3BTZXJ2ZXJDb25maWcge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdHBvcnQ6IDc3NzcsXHJcblx0XHRcdGhvc3Q6IFwiMTI3LjAuMC4xXCIsXHJcblx0XHRcdGF1dGhUb2tlbjogQXV0aE1pZGRsZXdhcmUuZ2VuZXJhdGVUb2tlbigpLFxyXG5cdFx0XHRlbmFibGVDb3JzOiB0cnVlLFxyXG5cdFx0XHRsb2dMZXZlbDogXCJpbmZvXCIsXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBsb2FkQ29uZmlnKCk6IHZvaWQge1xyXG5cdFx0Y29uc3Qgc2V0dGluZ3MgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncztcclxuXHRcdGlmIChzZXR0aW5ncy5tY3BJbnRlZ3JhdGlvbikge1xyXG5cdFx0XHR0aGlzLmNvbmZpZyA9IHtcclxuXHRcdFx0XHQuLi50aGlzLmNvbmZpZyxcclxuXHRcdFx0XHQuLi5zZXR0aW5ncy5tY3BJbnRlZ3JhdGlvbixcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGFzeW5jIHNhdmVDb25maWcoKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5tY3BJbnRlZ3JhdGlvbiA9IHRoaXMuY29uZmlnO1xyXG5cdFx0YXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0fVxyXG5cclxuXHRhc3luYyBpbml0aWFsaXplKCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Ly8gT25seSBpbml0aWFsaXplIG9uIGRlc2t0b3BcclxuXHRcdGlmICghUGxhdGZvcm0uaXNEZXNrdG9wQXBwKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiTUNQIFNlcnZlciBpcyBvbmx5IGF2YWlsYWJsZSBvbiBkZXNrdG9wXCIpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHRoaXMuY29uZmlnLmVuYWJsZWQpIHtcclxuXHRcdFx0YXdhaXQgdGhpcy5zdGFydCgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0YXN5bmMgc3RhcnQoKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRpZiAodGhpcy5zZXJ2ZXIpIHtcclxuXHRcdFx0YXdhaXQgdGhpcy5zdG9wKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUHJvYWN0aXZlbHkgY2hlY2sgZm9yIHBvcnQgYXZhaWxhYmlsaXR5IHRvIGJldHRlciBoYW5kbGUgbXVsdGktdmF1bHQgc2NlbmFyaW9zXHJcblx0XHRjb25zdCBhdmFpbGFibGUgPSBhd2FpdCB0aGlzLmlzUG9ydEF2YWlsYWJsZSh0aGlzLmNvbmZpZy5wb3J0LCB0aGlzLmNvbmZpZy5ob3N0KTtcclxuXHRcdGlmICghYXZhaWxhYmxlKSB7XHJcblx0XHRcdG5ldyBOb3RpY2UoXHJcblx0XHRcdFx0YFBvcnQgJHt0aGlzLmNvbmZpZy5wb3J0fSBvbiAke3RoaXMuY29uZmlnLmhvc3R9IGlzIGFscmVhZHkgaW4gdXNlLiBQbGVhc2UgY2hvb3NlIGFub3RoZXIgcG9ydCBpbiBNQ1Agc2V0dGluZ3MuYFxyXG5cdFx0XHQpO1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0YE1DUCBTZXJ2ZXIgcG9ydCBjb25mbGljdCBkZXRlY3RlZCBvbiAke3RoaXMuY29uZmlnLmhvc3R9OiR7dGhpcy5jb25maWcucG9ydH1gXHJcblx0XHRcdCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHR0aGlzLnNlcnZlciA9IG5ldyBNY3BTZXJ2ZXIodGhpcy5wbHVnaW4sIHRoaXMuY29uZmlnKTtcclxuXHRcdFx0YXdhaXQgdGhpcy5zZXJ2ZXIuc3RhcnQoKTtcclxuXHRcdFx0dGhpcy5hdXRvUmVzdGFydEF0dGVtcHRzID0gMDtcclxuXHRcdFx0Y29uc3Qgc3RhdHVzID0gdGhpcy5zZXJ2ZXIuZ2V0U3RhdHVzKCk7XHJcblx0XHRcdG5ldyBOb3RpY2UoXHJcblx0XHRcdFx0YE1DUCBTZXJ2ZXIgc3RhcnRlZCBvbiAke3RoaXMuY29uZmlnLmhvc3R9OiR7c3RhdHVzLnBvcnR9YFxyXG5cdFx0XHQpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIHN0YXJ0IE1DUCBTZXJ2ZXI6XCIsIGVycm9yKTtcclxuXHRcdFx0aWYgKGVycm9yPy5jb2RlID09PSBcIkVBRERSSU5VU0VcIiB8fCAvRUFERFJJTlVTRS8udGVzdChlcnJvcj8ubWVzc2FnZSB8fCBcIlwiKSkge1xyXG5cdFx0XHRcdG5ldyBOb3RpY2UoXHJcblx0XHRcdFx0XHRgUG9ydCAke3RoaXMuY29uZmlnLnBvcnR9IG9uICR7dGhpcy5jb25maWcuaG9zdH0gaXMgYWxyZWFkeSBpbiB1c2UuIFBsZWFzZSBjaGFuZ2UgdGhlIHBvcnQgaW4gc2V0dGluZ3MuYFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblx0XHRcdG5ldyBOb3RpY2UoYEZhaWxlZCB0byBzdGFydCBNQ1AgU2VydmVyOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcblxyXG5cdFx0XHQvLyBBdXRvLXJlc3RhcnQgbG9naWMgZm9yIHRyYW5zaWVudCBlcnJvcnMgb25seVxyXG5cdFx0XHRpZiAodGhpcy5hdXRvUmVzdGFydEF0dGVtcHRzIDwgdGhpcy5tYXhBdXRvUmVzdGFydEF0dGVtcHRzKSB7XHJcblx0XHRcdFx0dGhpcy5hdXRvUmVzdGFydEF0dGVtcHRzKys7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRgQXR0ZW1wdGluZyBhdXRvLXJlc3RhcnQgKCR7dGhpcy5hdXRvUmVzdGFydEF0dGVtcHRzfS8ke3RoaXMubWF4QXV0b1Jlc3RhcnRBdHRlbXB0c30pYFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB0aGlzLnN0YXJ0KCksIDUwMDApO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRhc3luYyBzdG9wKCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0aWYgKCF0aGlzLnNlcnZlcikge1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0YXdhaXQgdGhpcy5zZXJ2ZXIuc3RvcCgpO1xyXG5cdFx0XHR0aGlzLnNlcnZlciA9IHVuZGVmaW5lZDtcclxuXHRcdFx0bmV3IE5vdGljZShcIk1DUCBTZXJ2ZXIgc3RvcHBlZFwiKTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBzdG9wIE1DUCBTZXJ2ZXI6XCIsIGVycm9yKTtcclxuXHRcdFx0bmV3IE5vdGljZShgRmFpbGVkIHRvIHN0b3AgTUNQIFNlcnZlcjogJHtlcnJvci5tZXNzYWdlfWApO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0YXN5bmMgcmVzdGFydCgpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGF3YWl0IHRoaXMuc3RvcCgpO1xyXG5cdFx0YXdhaXQgdGhpcy5zdGFydCgpO1xyXG5cdH1cclxuXHJcblx0YXN5bmMgdG9nZ2xlKCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0aWYgKHRoaXMuaXNSdW5uaW5nKCkpIHtcclxuXHRcdFx0YXdhaXQgdGhpcy5zdG9wKCk7XHJcblx0XHRcdHRoaXMuY29uZmlnLmVuYWJsZWQgPSBmYWxzZTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMuY29uZmlnLmVuYWJsZWQgPSB0cnVlO1xyXG5cdFx0XHRhd2FpdCB0aGlzLnN0YXJ0KCk7XHJcblx0XHR9XHJcblx0XHRhd2FpdCB0aGlzLnNhdmVDb25maWcoKTtcclxuXHR9XHJcblxyXG5cdGlzUnVubmluZygpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiB0aGlzLnNlcnZlcj8uZ2V0U3RhdHVzKCkucnVubmluZyB8fCBmYWxzZTtcclxuXHR9XHJcblxyXG5cdGdldFN0YXR1cygpOiBNY3BTZXJ2ZXJTdGF0dXMge1xyXG5cdFx0aWYgKCF0aGlzLnNlcnZlcikge1xyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdHJ1bm5pbmc6IGZhbHNlLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHN0YXR1cyA9IHRoaXMuc2VydmVyLmdldFN0YXR1cygpO1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cnVubmluZzogc3RhdHVzLnJ1bm5pbmcsXHJcblx0XHRcdHBvcnQ6IHN0YXR1cy5wb3J0LFxyXG5cdFx0XHRzdGFydFRpbWU6IHN0YXR1cy5zdGFydFRpbWUsXHJcblx0XHRcdHJlcXVlc3RDb3VudDogc3RhdHVzLnJlcXVlc3RDb3VudCxcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHRnZXRDb25maWcoKTogTWNwU2VydmVyQ29uZmlnIHtcclxuXHRcdHJldHVybiB7IC4uLnRoaXMuY29uZmlnIH07XHJcblx0fVxyXG5cclxuXHRhc3luYyB1cGRhdGVDb25maWcodXBkYXRlczogUGFydGlhbDxNY3BTZXJ2ZXJDb25maWc+KTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRjb25zdCB3YXNSdW5uaW5nID0gdGhpcy5pc1J1bm5pbmcoKTtcclxuXHRcdGNvbnN0IGRlc2lyZWRQb3J0ID0gdXBkYXRlcy5wb3J0ID8/IHRoaXMuY29uZmlnLnBvcnQ7XHJcblx0XHRjb25zdCBkZXNpcmVkSG9zdCA9IHVwZGF0ZXMuaG9zdCA/PyB0aGlzLmNvbmZpZy5ob3N0O1xyXG5cdFx0Y29uc3QgcG9ydENoYW5nZWQgPSB1cGRhdGVzLnBvcnQgIT09IHVuZGVmaW5lZCAmJiB1cGRhdGVzLnBvcnQgIT09IHRoaXMuY29uZmlnLnBvcnQ7XHJcblx0XHRjb25zdCBob3N0Q2hhbmdlZCA9IHVwZGF0ZXMuaG9zdCAhPT0gdW5kZWZpbmVkICYmIHVwZGF0ZXMuaG9zdCAhPT0gdGhpcy5jb25maWcuaG9zdDtcclxuXHJcblx0XHQvLyBJZiBuZXR3b3JrIHNldHRpbmdzIGFyZSBjaGFuZ2luZywgdmFsaWRhdGUgYXZhaWxhYmlsaXR5IGZpcnN0XHJcblx0XHRpZiAocG9ydENoYW5nZWQgfHwgaG9zdENoYW5nZWQpIHtcclxuXHRcdFx0Y29uc3QgYXZhaWxhYmxlID0gYXdhaXQgdGhpcy5pc1BvcnRBdmFpbGFibGUoZGVzaXJlZFBvcnQsIGRlc2lyZWRIb3N0KTtcclxuXHRcdFx0aWYgKCFhdmFpbGFibGUpIHtcclxuXHRcdFx0XHRuZXcgTm90aWNlKFxyXG5cdFx0XHRcdFx0YFBvcnQgJHtkZXNpcmVkSG9zdH06JHtkZXNpcmVkUG9ydH0gaXMgYWxyZWFkeSBpbiB1c2UuIFBsZWFzZSBjaG9vc2UgYW5vdGhlciBwb3J0LmBcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIlBvcnQgaW4gdXNlXCIpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVXBkYXRlIGNvbmZpZyAoYWZ0ZXIgdmFsaWRhdGlvbilcclxuXHRcdHRoaXMuY29uZmlnID0ge1xyXG5cdFx0XHQuLi50aGlzLmNvbmZpZyxcclxuXHRcdFx0Li4udXBkYXRlcyxcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gU2F2ZSB0byBzZXR0aW5nc1xyXG5cdFx0YXdhaXQgdGhpcy5zYXZlQ29uZmlnKCk7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHJ1bm5pbmcgc2VydmVyIGNvbmZpZ1xyXG5cdFx0aWYgKHRoaXMuc2VydmVyKSB7XHJcblx0XHRcdHRoaXMuc2VydmVyLnVwZGF0ZUNvbmZpZyh1cGRhdGVzKTtcclxuXHJcblx0XHRcdC8vIFJlc3RhcnQgaWYgbmV0d29yayBzZXR0aW5ncyBjaGFuZ2VkXHJcblx0XHRcdGlmICh3YXNSdW5uaW5nICYmIChwb3J0Q2hhbmdlZCB8fCBob3N0Q2hhbmdlZCkpIHtcclxuXHRcdFx0XHRhd2FpdCB0aGlzLnJlc3RhcnQoKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFN0YXJ0L3N0b3AgYmFzZWQgb24gZW5hYmxlZCBzdGF0ZVxyXG5cdFx0aWYgKHVwZGF0ZXMuZW5hYmxlZCAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdGlmICh1cGRhdGVzLmVuYWJsZWQgJiYgIXdhc1J1bm5pbmcpIHtcclxuXHRcdFx0XHRhd2FpdCB0aGlzLnN0YXJ0KCk7XHJcblx0XHRcdH0gZWxzZSBpZiAoIXVwZGF0ZXMuZW5hYmxlZCAmJiB3YXNSdW5uaW5nKSB7XHJcblx0XHRcdFx0YXdhaXQgdGhpcy5zdG9wKCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGdldEF1dGhUb2tlbigpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIHRoaXMuY29uZmlnLmF1dGhUb2tlbjtcclxuXHR9XHJcblxyXG5cdHJlZ2VuZXJhdGVBdXRoVG9rZW4oKTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IG5ld1Rva2VuID0gQXV0aE1pZGRsZXdhcmUuZ2VuZXJhdGVUb2tlbigpO1xyXG5cdFx0dGhpcy5jb25maWcuYXV0aFRva2VuID0gbmV3VG9rZW47XHJcblx0XHRcclxuXHRcdGlmICh0aGlzLnNlcnZlcikge1xyXG5cdFx0XHR0aGlzLnNlcnZlci51cGRhdGVDb25maWcoeyBhdXRoVG9rZW46IG5ld1Rva2VuIH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuc2F2ZUNvbmZpZygpO1xyXG5cdFx0cmV0dXJuIG5ld1Rva2VuO1xyXG5cdH1cclxuXHJcblx0YXN5bmMgY2xlYW51cCgpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGF3YWl0IHRoaXMuc3RvcCgpO1xyXG5cdH1cclxufSJdfQ==