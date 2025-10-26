/**
 * Version Manager for handling plugin version detection and upgrade logic
 */
import { __awaiter } from "tslib";
import { Component } from "obsidian";
import { LocalStorageCache } from "../cache/local-storage-cache";
/**
 * Manages plugin version detection and handles version-based operations
 */
export class VersionManager extends Component {
    constructor(app, plugin) {
        super();
        this.app = app;
        this.plugin = plugin;
        this.VERSION_STORAGE_KEY = "plugin-version";
        this.persister = new LocalStorageCache(this.app.appId);
        this.currentVersion = this.getCurrentVersionFromManifest();
    }
    /**
     * Get the current plugin version from the manifest
     */
    getCurrentVersionFromManifest() {
        var _a;
        // Try to get version from plugin manifest
        if ((_a = this.plugin.manifest) === null || _a === void 0 ? void 0 : _a.version) {
            return this.plugin.manifest.version;
        }
        // Fallback to a default version if manifest is not available
        console.warn("Could not determine plugin version from manifest, using fallback");
        return "unknown";
    }
    /**
     * Get the previously stored version from cache
     */
    getPreviousVersion() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cached = yield this.persister.loadFile(this.VERSION_STORAGE_KEY);
                return (cached === null || cached === void 0 ? void 0 : cached.data) || null;
            }
            catch (error) {
                console.error("Error loading previous version:", error);
                return null;
            }
        });
    }
    /**
     * Store the current version to cache
     */
    storeCurrentVersion() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.persister.storeFile(this.VERSION_STORAGE_KEY, this.currentVersion);
            }
            catch (error) {
                console.error("Error storing current version:", error);
            }
        });
    }
    /**
     * Compare two version strings using semantic versioning
     * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
     */
    compareVersions(v1, v2) {
        if (v1 === v2)
            return 0;
        if (v1 === "unknown" || v2 === "unknown")
            return 0; // Treat unknown versions as equal
        const v1Parts = v1.split(".").map((n) => parseInt(n, 10) || 0);
        const v2Parts = v2.split(".").map((n) => parseInt(n, 10) || 0);
        // Pad arrays to same length
        const maxLength = Math.max(v1Parts.length, v2Parts.length);
        while (v1Parts.length < maxLength)
            v1Parts.push(0);
        while (v2Parts.length < maxLength)
            v2Parts.push(0);
        for (let i = 0; i < maxLength; i++) {
            if (v1Parts[i] < v2Parts[i])
                return -1;
            if (v1Parts[i] > v2Parts[i])
                return 1;
        }
        return 0;
    }
    /**
     * Check for version changes and determine if rebuild is required
     */
    checkVersionChange() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const previousVersion = yield this.getPreviousVersion();
                const isFirstInstall = previousVersion === null;
                let isUpgrade = false;
                let isDowngrade = false;
                let requiresRebuild = false;
                let rebuildReason;
                if (!isFirstInstall && previousVersion) {
                    // Handle corrupted version data
                    if (!this.isValidVersionString(previousVersion)) {
                        console.warn(`Corrupted version data detected: ${previousVersion}, forcing rebuild`);
                        requiresRebuild = true;
                        rebuildReason = `Corrupted version data detected (${previousVersion}) - rebuilding index`;
                    }
                    else {
                        const comparison = this.compareVersions(this.currentVersion, previousVersion);
                        isUpgrade = comparison > 0;
                        isDowngrade = comparison < 0;
                    }
                }
                // Determine if rebuild is required
                if (isFirstInstall) {
                    requiresRebuild = true;
                    rebuildReason = "First installation - building initial index";
                }
                else if (isUpgrade) {
                    requiresRebuild = true;
                    rebuildReason = `Plugin upgraded from ${previousVersion} to ${this.currentVersion} - rebuilding index for compatibility`;
                }
                else if (isDowngrade) {
                    requiresRebuild = true;
                    rebuildReason = `Plugin downgraded from ${previousVersion} to ${this.currentVersion} - rebuilding index for compatibility`;
                }
                const versionInfo = {
                    current: this.currentVersion,
                    previous: previousVersion,
                    isFirstInstall,
                    isUpgrade,
                    isDowngrade,
                };
                return {
                    versionInfo,
                    requiresRebuild,
                    rebuildReason,
                };
            }
            catch (error) {
                console.error("Error checking version change:", error);
                // On error, assume rebuild is needed for safety
                return {
                    versionInfo: {
                        current: this.currentVersion,
                        previous: null,
                        isFirstInstall: true,
                        isUpgrade: false,
                        isDowngrade: false,
                    },
                    requiresRebuild: true,
                    rebuildReason: `Error checking version (${error.message}) - rebuilding index for safety`,
                };
            }
        });
    }
    /**
     * Mark the current version as processed (store it)
     */
    markVersionProcessed() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.storeCurrentVersion();
        });
    }
    /**
     * Get current version info
     */
    getCurrentVersion() {
        return this.currentVersion;
    }
    /**
     * Force a version mismatch (useful for testing or manual rebuild)
     */
    forceVersionMismatch() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.persister.storeFile(this.VERSION_STORAGE_KEY, "0.0.0");
            }
            catch (error) {
                console.error("Error forcing version mismatch:", error);
            }
        });
    }
    /**
     * Clear version information (useful for testing)
     */
    clearVersionInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.persister.removeFile(this.VERSION_STORAGE_KEY);
            }
            catch (error) {
                console.error("Error clearing version info:", error);
            }
        });
    }
    /**
     * Validate if a version string is in a valid format
     */
    isValidVersionString(version) {
        if (!version || typeof version !== "string") {
            return false;
        }
        // Allow "unknown" as a valid version
        if (version === "unknown") {
            return true;
        }
        // Check for semantic versioning pattern (e.g., "1.0.0", "1.0.0-beta.1")
        const semverPattern = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9\-\.]+))?$/;
        return semverPattern.test(version);
    }
    /**
     * Recover from corrupted version data
     */
    recoverFromCorruptedVersion() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log("Attempting to recover from corrupted version data");
                // Clear the corrupted version data
                yield this.clearVersionInfo();
                // Store the current version as if it's a fresh install
                yield this.storeCurrentVersion();
                console.log(`Version recovery complete, set to ${this.currentVersion}`);
            }
            catch (error) {
                console.error("Error during version recovery:", error);
                throw new Error(`Failed to recover from corrupted version: ${error.message}`);
            }
        });
    }
    /**
     * Handle emergency rebuild scenarios
     */
    handleEmergencyRebuild(reason) {
        return __awaiter(this, void 0, void 0, function* () {
            console.warn(`Emergency rebuild triggered: ${reason}`);
            return {
                versionInfo: {
                    current: this.currentVersion,
                    previous: null,
                    isFirstInstall: false,
                    isUpgrade: false,
                    isDowngrade: false,
                },
                requiresRebuild: true,
                rebuildReason: `Emergency rebuild: ${reason}`,
            };
        });
    }
    /**
     * Validate the integrity of version storage
     */
    validateVersionStorage() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Test if we can read and write version data
                const testVersion = "test-version";
                const originalVersion = yield this.getPreviousVersion();
                // Store test version
                yield this.persister.storeFile(this.VERSION_STORAGE_KEY, testVersion);
                // Read it back
                const readVersion = yield this.getPreviousVersion();
                // Restore original version
                if (originalVersion) {
                    yield this.persister.storeFile(this.VERSION_STORAGE_KEY, originalVersion);
                }
                else {
                    yield this.clearVersionInfo();
                }
                return readVersion === testVersion;
            }
            catch (error) {
                console.error("Version storage validation failed:", error);
                return false;
            }
        });
    }
    /**
     * Get diagnostic information about version state
     */
    getDiagnosticInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            const previousVersion = yield this.getPreviousVersion();
            const storageValid = yield this.validateVersionStorage();
            const versionValid = previousVersion
                ? this.isValidVersionString(previousVersion)
                : true;
            // Test write capability
            let canWrite = false;
            try {
                yield this.persister.storeFile(`${this.VERSION_STORAGE_KEY}-test`, "test");
                yield this.persister.removeFile(`${this.VERSION_STORAGE_KEY}-test`);
                canWrite = true;
            }
            catch (error) {
                console.error("Write test failed:", error);
            }
            return {
                currentVersion: this.currentVersion,
                previousVersion,
                storageValid,
                versionValid,
                canWrite,
            };
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVyc2lvbi1tYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidmVyc2lvbi1tYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztHQUVHOztBQUVILE9BQU8sRUFBTyxTQUFTLEVBQTZCLE1BQU0sVUFBVSxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBeUJqRTs7R0FFRztBQUNILE1BQU0sT0FBTyxjQUFlLFNBQVEsU0FBUztJQUs1QyxZQUFvQixHQUFRLEVBQVUsTUFBNkI7UUFDbEUsS0FBSyxFQUFFLENBQUM7UUFEVyxRQUFHLEdBQUgsR0FBRyxDQUFLO1FBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBdUI7UUFKbEQsd0JBQW1CLEdBQUcsZ0JBQWdCLENBQUM7UUFNdkQsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLGlCQUFpQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsNkJBQTZCLEVBQUUsQ0FBQztJQUM1RCxDQUFDO0lBRUQ7O09BRUc7SUFDSyw2QkFBNkI7O1FBQ3BDLDBDQUEwQztRQUMxQyxJQUFJLE1BQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLDBDQUFFLE9BQU8sRUFBRTtZQUNsQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQztTQUNwQztRQUVELDZEQUE2RDtRQUM3RCxPQUFPLENBQUMsSUFBSSxDQUNYLGtFQUFrRSxDQUNsRSxDQUFDO1FBQ0YsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVEOztPQUVHO0lBQ1csa0JBQWtCOztZQUMvQixJQUFJO2dCQUNILE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQzNDLElBQUksQ0FBQyxtQkFBbUIsQ0FDeEIsQ0FBQztnQkFDRixPQUFPLENBQUEs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LG1CQUFtQixPQUFPLEVBQ2xDLE1BQU0sQ0FDTixDQUFDO2dCQUNGLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsR0FBRyxJQUFJLENBQUMsbUJBQW1CLE9BQU8sQ0FBQyxDQUFDO2dCQUNwRSxRQUFRLEdBQUcsSUFBSSxDQUFDO2FBQ2hCO1lBQUMsT0FBTyxLQUFLLEVBQUU7Z0JBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxLQUFLLENBQUMsQ0FBQzthQUMzQztZQUVELE9BQU87Z0JBQ04sY0FBYyxFQUFFLElBQUksQ0FBQyxjQUFjO2dCQUNuQyxlQUFlO2dCQUNmLFlBQVk7Z0JBQ1osWUFBWTtnQkFDWixRQUFRO2FBQ1IsQ0FBQztRQUNILENBQUM7S0FBQTtDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFZlcnNpb24gTWFuYWdlciBmb3IgaGFuZGxpbmcgcGx1Z2luIHZlcnNpb24gZGV0ZWN0aW9uIGFuZCB1cGdyYWRlIGxvZ2ljXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQXBwLCBDb21wb25lbnQsIE5vdGljZSwgcmVxdWlyZUFwaVZlcnNpb24gfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgTG9jYWxTdG9yYWdlQ2FjaGUgfSBmcm9tIFwiLi4vY2FjaGUvbG9jYWwtc3RvcmFnZS1jYWNoZVwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCIuLi9pbmRleFwiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBWZXJzaW9uSW5mbyB7XHJcblx0LyoqIEN1cnJlbnQgcGx1Z2luIHZlcnNpb24gKi9cclxuXHRjdXJyZW50OiBzdHJpbmc7XHJcblx0LyoqIFByZXZpb3VzbHkgc3RvcmVkIHZlcnNpb24gKi9cclxuXHRwcmV2aW91czogc3RyaW5nIHwgbnVsbDtcclxuXHQvKiogV2hldGhlciB0aGlzIGlzIGEgZmlyc3QgaW5zdGFsbGF0aW9uICovXHJcblx0aXNGaXJzdEluc3RhbGw6IGJvb2xlYW47XHJcblx0LyoqIFdoZXRoZXIgdGhpcyBpcyBhbiB1cGdyYWRlICovXHJcblx0aXNVcGdyYWRlOiBib29sZWFuO1xyXG5cdC8qKiBXaGV0aGVyIHRoaXMgaXMgYSBkb3duZ3JhZGUgKi9cclxuXHRpc0Rvd25ncmFkZTogYm9vbGVhbjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBWZXJzaW9uQ2hhbmdlUmVzdWx0IHtcclxuXHQvKiogVmVyc2lvbiBpbmZvcm1hdGlvbiAqL1xyXG5cdHZlcnNpb25JbmZvOiBWZXJzaW9uSW5mbztcclxuXHQvKiogV2hldGhlciBhIHJlYnVpbGQgaXMgcmVxdWlyZWQgKi9cclxuXHRyZXF1aXJlc1JlYnVpbGQ6IGJvb2xlYW47XHJcblx0LyoqIFJlYXNvbiBmb3IgcmVidWlsZCByZXF1aXJlbWVudCAqL1xyXG5cdHJlYnVpbGRSZWFzb24/OiBzdHJpbmc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBNYW5hZ2VzIHBsdWdpbiB2ZXJzaW9uIGRldGVjdGlvbiBhbmQgaGFuZGxlcyB2ZXJzaW9uLWJhc2VkIG9wZXJhdGlvbnNcclxuICovXHJcbmV4cG9ydCBjbGFzcyBWZXJzaW9uTWFuYWdlciBleHRlbmRzIENvbXBvbmVudCB7XHJcblx0cHJpdmF0ZSByZWFkb25seSBWRVJTSU9OX1NUT1JBR0VfS0VZID0gXCJwbHVnaW4tdmVyc2lvblwiO1xyXG5cdHByaXZhdGUgcGVyc2lzdGVyOiBMb2NhbFN0b3JhZ2VDYWNoZTtcclxuXHRwcml2YXRlIGN1cnJlbnRWZXJzaW9uOiBzdHJpbmc7XHJcblxyXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgYXBwOiBBcHAsIHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4pIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLnBlcnNpc3RlciA9IG5ldyBMb2NhbFN0b3JhZ2VDYWNoZSh0aGlzLmFwcC5hcHBJZCk7XHJcblx0XHR0aGlzLmN1cnJlbnRWZXJzaW9uID0gdGhpcy5nZXRDdXJyZW50VmVyc2lvbkZyb21NYW5pZmVzdCgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHRoZSBjdXJyZW50IHBsdWdpbiB2ZXJzaW9uIGZyb20gdGhlIG1hbmlmZXN0XHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZXRDdXJyZW50VmVyc2lvbkZyb21NYW5pZmVzdCgpOiBzdHJpbmcge1xyXG5cdFx0Ly8gVHJ5IHRvIGdldCB2ZXJzaW9uIGZyb20gcGx1Z2luIG1hbmlmZXN0XHJcblx0XHRpZiAodGhpcy5wbHVnaW4ubWFuaWZlc3Q/LnZlcnNpb24pIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMucGx1Z2luLm1hbmlmZXN0LnZlcnNpb247XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRmFsbGJhY2sgdG8gYSBkZWZhdWx0IHZlcnNpb24gaWYgbWFuaWZlc3QgaXMgbm90IGF2YWlsYWJsZVxyXG5cdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcIkNvdWxkIG5vdCBkZXRlcm1pbmUgcGx1Z2luIHZlcnNpb24gZnJvbSBtYW5pZmVzdCwgdXNpbmcgZmFsbGJhY2tcIlxyXG5cdFx0KTtcclxuXHRcdHJldHVybiBcInVua25vd25cIjtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0aGUgcHJldmlvdXNseSBzdG9yZWQgdmVyc2lvbiBmcm9tIGNhY2hlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhc3luYyBnZXRQcmV2aW91c1ZlcnNpb24oKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBjYWNoZWQgPSBhd2FpdCB0aGlzLnBlcnNpc3Rlci5sb2FkRmlsZTxzdHJpbmc+KFxyXG5cdFx0XHRcdHRoaXMuVkVSU0lPTl9TVE9SQUdFX0tFWVxyXG5cdFx0XHQpO1xyXG5cdFx0XHRyZXR1cm4gY2FjaGVkPy5kYXRhIHx8IG51bGw7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRXJyb3IgbG9hZGluZyBwcmV2aW91cyB2ZXJzaW9uOlwiLCBlcnJvcik7XHJcblx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU3RvcmUgdGhlIGN1cnJlbnQgdmVyc2lvbiB0byBjYWNoZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgc3RvcmVDdXJyZW50VmVyc2lvbigpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGF3YWl0IHRoaXMucGVyc2lzdGVyLnN0b3JlRmlsZShcclxuXHRcdFx0XHR0aGlzLlZFUlNJT05fU1RPUkFHRV9LRVksXHJcblx0XHRcdFx0dGhpcy5jdXJyZW50VmVyc2lvblxyXG5cdFx0XHQpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIHN0b3JpbmcgY3VycmVudCB2ZXJzaW9uOlwiLCBlcnJvcik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDb21wYXJlIHR3byB2ZXJzaW9uIHN0cmluZ3MgdXNpbmcgc2VtYW50aWMgdmVyc2lvbmluZ1xyXG5cdCAqIFJldHVybnM6IC0xIGlmIHYxIDwgdjIsIDAgaWYgdjEgPT09IHYyLCAxIGlmIHYxID4gdjJcclxuXHQgKi9cclxuXHRwcml2YXRlIGNvbXBhcmVWZXJzaW9ucyh2MTogc3RyaW5nLCB2Mjogc3RyaW5nKTogbnVtYmVyIHtcclxuXHRcdGlmICh2MSA9PT0gdjIpIHJldHVybiAwO1xyXG5cdFx0aWYgKHYxID09PSBcInVua25vd25cIiB8fCB2MiA9PT0gXCJ1bmtub3duXCIpIHJldHVybiAwOyAvLyBUcmVhdCB1bmtub3duIHZlcnNpb25zIGFzIGVxdWFsXHJcblxyXG5cdFx0Y29uc3QgdjFQYXJ0cyA9IHYxLnNwbGl0KFwiLlwiKS5tYXAoKG4pID0+IHBhcnNlSW50KG4sIDEwKSB8fCAwKTtcclxuXHRcdGNvbnN0IHYyUGFydHMgPSB2Mi5zcGxpdChcIi5cIikubWFwKChuKSA9PiBwYXJzZUludChuLCAxMCkgfHwgMCk7XHJcblxyXG5cdFx0Ly8gUGFkIGFycmF5cyB0byBzYW1lIGxlbmd0aFxyXG5cdFx0Y29uc3QgbWF4TGVuZ3RoID0gTWF0aC5tYXgodjFQYXJ0cy5sZW5ndGgsIHYyUGFydHMubGVuZ3RoKTtcclxuXHRcdHdoaWxlICh2MVBhcnRzLmxlbmd0aCA8IG1heExlbmd0aCkgdjFQYXJ0cy5wdXNoKDApO1xyXG5cdFx0d2hpbGUgKHYyUGFydHMubGVuZ3RoIDwgbWF4TGVuZ3RoKSB2MlBhcnRzLnB1c2goMCk7XHJcblxyXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBtYXhMZW5ndGg7IGkrKykge1xyXG5cdFx0XHRpZiAodjFQYXJ0c1tpXSA8IHYyUGFydHNbaV0pIHJldHVybiAtMTtcclxuXHRcdFx0aWYgKHYxUGFydHNbaV0gPiB2MlBhcnRzW2ldKSByZXR1cm4gMTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gMDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGZvciB2ZXJzaW9uIGNoYW5nZXMgYW5kIGRldGVybWluZSBpZiByZWJ1aWxkIGlzIHJlcXVpcmVkXHJcblx0ICovXHJcblx0cHVibGljIGFzeW5jIGNoZWNrVmVyc2lvbkNoYW5nZSgpOiBQcm9taXNlPFZlcnNpb25DaGFuZ2VSZXN1bHQ+IHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IHByZXZpb3VzVmVyc2lvbiA9IGF3YWl0IHRoaXMuZ2V0UHJldmlvdXNWZXJzaW9uKCk7XHJcblx0XHRcdGNvbnN0IGlzRmlyc3RJbnN0YWxsID0gcHJldmlvdXNWZXJzaW9uID09PSBudWxsO1xyXG5cclxuXHRcdFx0bGV0IGlzVXBncmFkZSA9IGZhbHNlO1xyXG5cdFx0XHRsZXQgaXNEb3duZ3JhZGUgPSBmYWxzZTtcclxuXHRcdFx0bGV0IHJlcXVpcmVzUmVidWlsZCA9IGZhbHNlO1xyXG5cdFx0XHRsZXQgcmVidWlsZFJlYXNvbjogc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG5cclxuXHRcdFx0aWYgKCFpc0ZpcnN0SW5zdGFsbCAmJiBwcmV2aW91c1ZlcnNpb24pIHtcclxuXHRcdFx0XHQvLyBIYW5kbGUgY29ycnVwdGVkIHZlcnNpb24gZGF0YVxyXG5cdFx0XHRcdGlmICghdGhpcy5pc1ZhbGlkVmVyc2lvblN0cmluZyhwcmV2aW91c1ZlcnNpb24pKSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRcdGBDb3JydXB0ZWQgdmVyc2lvbiBkYXRhIGRldGVjdGVkOiAke3ByZXZpb3VzVmVyc2lvbn0sIGZvcmNpbmcgcmVidWlsZGBcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRyZXF1aXJlc1JlYnVpbGQgPSB0cnVlO1xyXG5cdFx0XHRcdFx0cmVidWlsZFJlYXNvbiA9IGBDb3JydXB0ZWQgdmVyc2lvbiBkYXRhIGRldGVjdGVkICgke3ByZXZpb3VzVmVyc2lvbn0pIC0gcmVidWlsZGluZyBpbmRleGA7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGNvbnN0IGNvbXBhcmlzb24gPSB0aGlzLmNvbXBhcmVWZXJzaW9ucyhcclxuXHRcdFx0XHRcdFx0dGhpcy5jdXJyZW50VmVyc2lvbixcclxuXHRcdFx0XHRcdFx0cHJldmlvdXNWZXJzaW9uXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0aXNVcGdyYWRlID0gY29tcGFyaXNvbiA+IDA7XHJcblx0XHRcdFx0XHRpc0Rvd25ncmFkZSA9IGNvbXBhcmlzb24gPCAwO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gRGV0ZXJtaW5lIGlmIHJlYnVpbGQgaXMgcmVxdWlyZWRcclxuXHRcdFx0aWYgKGlzRmlyc3RJbnN0YWxsKSB7XHJcblx0XHRcdFx0cmVxdWlyZXNSZWJ1aWxkID0gdHJ1ZTtcclxuXHRcdFx0XHRyZWJ1aWxkUmVhc29uID0gXCJGaXJzdCBpbnN0YWxsYXRpb24gLSBidWlsZGluZyBpbml0aWFsIGluZGV4XCI7XHJcblx0XHRcdH0gZWxzZSBpZiAoaXNVcGdyYWRlKSB7XHJcblx0XHRcdFx0cmVxdWlyZXNSZWJ1aWxkID0gdHJ1ZTtcclxuXHRcdFx0XHRyZWJ1aWxkUmVhc29uID0gYFBsdWdpbiB1cGdyYWRlZCBmcm9tICR7cHJldmlvdXNWZXJzaW9ufSB0byAke3RoaXMuY3VycmVudFZlcnNpb259IC0gcmVidWlsZGluZyBpbmRleCBmb3IgY29tcGF0aWJpbGl0eWA7XHJcblx0XHRcdH0gZWxzZSBpZiAoaXNEb3duZ3JhZGUpIHtcclxuXHRcdFx0XHRyZXF1aXJlc1JlYnVpbGQgPSB0cnVlO1xyXG5cdFx0XHRcdHJlYnVpbGRSZWFzb24gPSBgUGx1Z2luIGRvd25ncmFkZWQgZnJvbSAke3ByZXZpb3VzVmVyc2lvbn0gdG8gJHt0aGlzLmN1cnJlbnRWZXJzaW9ufSAtIHJlYnVpbGRpbmcgaW5kZXggZm9yIGNvbXBhdGliaWxpdHlgO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCB2ZXJzaW9uSW5mbzogVmVyc2lvbkluZm8gPSB7XHJcblx0XHRcdFx0Y3VycmVudDogdGhpcy5jdXJyZW50VmVyc2lvbixcclxuXHRcdFx0XHRwcmV2aW91czogcHJldmlvdXNWZXJzaW9uLFxyXG5cdFx0XHRcdGlzRmlyc3RJbnN0YWxsLFxyXG5cdFx0XHRcdGlzVXBncmFkZSxcclxuXHRcdFx0XHRpc0Rvd25ncmFkZSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0dmVyc2lvbkluZm8sXHJcblx0XHRcdFx0cmVxdWlyZXNSZWJ1aWxkLFxyXG5cdFx0XHRcdHJlYnVpbGRSZWFzb24sXHJcblx0XHRcdH07XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRXJyb3IgY2hlY2tpbmcgdmVyc2lvbiBjaGFuZ2U6XCIsIGVycm9yKTtcclxuXHRcdFx0Ly8gT24gZXJyb3IsIGFzc3VtZSByZWJ1aWxkIGlzIG5lZWRlZCBmb3Igc2FmZXR5XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0dmVyc2lvbkluZm86IHtcclxuXHRcdFx0XHRcdGN1cnJlbnQ6IHRoaXMuY3VycmVudFZlcnNpb24sXHJcblx0XHRcdFx0XHRwcmV2aW91czogbnVsbCxcclxuXHRcdFx0XHRcdGlzRmlyc3RJbnN0YWxsOiB0cnVlLFxyXG5cdFx0XHRcdFx0aXNVcGdyYWRlOiBmYWxzZSxcclxuXHRcdFx0XHRcdGlzRG93bmdyYWRlOiBmYWxzZSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHJlcXVpcmVzUmVidWlsZDogdHJ1ZSxcclxuXHRcdFx0XHRyZWJ1aWxkUmVhc29uOiBgRXJyb3IgY2hlY2tpbmcgdmVyc2lvbiAoJHtlcnJvci5tZXNzYWdlfSkgLSByZWJ1aWxkaW5nIGluZGV4IGZvciBzYWZldHlgLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTWFyayB0aGUgY3VycmVudCB2ZXJzaW9uIGFzIHByb2Nlc3NlZCAoc3RvcmUgaXQpXHJcblx0ICovXHJcblx0cHVibGljIGFzeW5jIG1hcmtWZXJzaW9uUHJvY2Vzc2VkKCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0YXdhaXQgdGhpcy5zdG9yZUN1cnJlbnRWZXJzaW9uKCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgY3VycmVudCB2ZXJzaW9uIGluZm9cclxuXHQgKi9cclxuXHRwdWJsaWMgZ2V0Q3VycmVudFZlcnNpb24oKTogc3RyaW5nIHtcclxuXHRcdHJldHVybiB0aGlzLmN1cnJlbnRWZXJzaW9uO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRm9yY2UgYSB2ZXJzaW9uIG1pc21hdGNoICh1c2VmdWwgZm9yIHRlc3Rpbmcgb3IgbWFudWFsIHJlYnVpbGQpXHJcblx0ICovXHJcblx0cHVibGljIGFzeW5jIGZvcmNlVmVyc2lvbk1pc21hdGNoKCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0YXdhaXQgdGhpcy5wZXJzaXN0ZXIuc3RvcmVGaWxlKHRoaXMuVkVSU0lPTl9TVE9SQUdFX0tFWSwgXCIwLjAuMFwiKTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFcnJvciBmb3JjaW5nIHZlcnNpb24gbWlzbWF0Y2g6XCIsIGVycm9yKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsZWFyIHZlcnNpb24gaW5mb3JtYXRpb24gKHVzZWZ1bCBmb3IgdGVzdGluZylcclxuXHQgKi9cclxuXHRwdWJsaWMgYXN5bmMgY2xlYXJWZXJzaW9uSW5mbygpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGF3YWl0IHRoaXMucGVyc2lzdGVyLnJlbW92ZUZpbGUodGhpcy5WRVJTSU9OX1NUT1JBR0VfS0VZKTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFcnJvciBjbGVhcmluZyB2ZXJzaW9uIGluZm86XCIsIGVycm9yKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFZhbGlkYXRlIGlmIGEgdmVyc2lvbiBzdHJpbmcgaXMgaW4gYSB2YWxpZCBmb3JtYXRcclxuXHQgKi9cclxuXHRwcml2YXRlIGlzVmFsaWRWZXJzaW9uU3RyaW5nKHZlcnNpb246IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0aWYgKCF2ZXJzaW9uIHx8IHR5cGVvZiB2ZXJzaW9uICE9PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBBbGxvdyBcInVua25vd25cIiBhcyBhIHZhbGlkIHZlcnNpb25cclxuXHRcdGlmICh2ZXJzaW9uID09PSBcInVua25vd25cIikge1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDaGVjayBmb3Igc2VtYW50aWMgdmVyc2lvbmluZyBwYXR0ZXJuIChlLmcuLCBcIjEuMC4wXCIsIFwiMS4wLjAtYmV0YS4xXCIpXHJcblx0XHRjb25zdCBzZW12ZXJQYXR0ZXJuID0gL14oXFxkKylcXC4oXFxkKylcXC4oXFxkKykoPzotKFthLXpBLVowLTlcXC1cXC5dKykpPyQvO1xyXG5cdFx0cmV0dXJuIHNlbXZlclBhdHRlcm4udGVzdCh2ZXJzaW9uKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlY292ZXIgZnJvbSBjb3JydXB0ZWQgdmVyc2lvbiBkYXRhXHJcblx0ICovXHJcblx0cHVibGljIGFzeW5jIHJlY292ZXJGcm9tQ29ycnVwdGVkVmVyc2lvbigpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiQXR0ZW1wdGluZyB0byByZWNvdmVyIGZyb20gY29ycnVwdGVkIHZlcnNpb24gZGF0YVwiKTtcclxuXHJcblx0XHRcdC8vIENsZWFyIHRoZSBjb3JydXB0ZWQgdmVyc2lvbiBkYXRhXHJcblx0XHRcdGF3YWl0IHRoaXMuY2xlYXJWZXJzaW9uSW5mbygpO1xyXG5cclxuXHRcdFx0Ly8gU3RvcmUgdGhlIGN1cnJlbnQgdmVyc2lvbiBhcyBpZiBpdCdzIGEgZnJlc2ggaW5zdGFsbFxyXG5cdFx0XHRhd2FpdCB0aGlzLnN0b3JlQ3VycmVudFZlcnNpb24oKTtcclxuXHJcblx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdGBWZXJzaW9uIHJlY292ZXJ5IGNvbXBsZXRlLCBzZXQgdG8gJHt0aGlzLmN1cnJlbnRWZXJzaW9ufWBcclxuXHRcdFx0KTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFcnJvciBkdXJpbmcgdmVyc2lvbiByZWNvdmVyeTpcIiwgZXJyb3IpO1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXHJcblx0XHRcdFx0YEZhaWxlZCB0byByZWNvdmVyIGZyb20gY29ycnVwdGVkIHZlcnNpb246ICR7ZXJyb3IubWVzc2FnZX1gXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBIYW5kbGUgZW1lcmdlbmN5IHJlYnVpbGQgc2NlbmFyaW9zXHJcblx0ICovXHJcblx0cHVibGljIGFzeW5jIGhhbmRsZUVtZXJnZW5jeVJlYnVpbGQoXHJcblx0XHRyZWFzb246IHN0cmluZ1xyXG5cdCk6IFByb21pc2U8VmVyc2lvbkNoYW5nZVJlc3VsdD4ge1xyXG5cdFx0Y29uc29sZS53YXJuKGBFbWVyZ2VuY3kgcmVidWlsZCB0cmlnZ2VyZWQ6ICR7cmVhc29ufWApO1xyXG5cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHZlcnNpb25JbmZvOiB7XHJcblx0XHRcdFx0Y3VycmVudDogdGhpcy5jdXJyZW50VmVyc2lvbixcclxuXHRcdFx0XHRwcmV2aW91czogbnVsbCxcclxuXHRcdFx0XHRpc0ZpcnN0SW5zdGFsbDogZmFsc2UsXHJcblx0XHRcdFx0aXNVcGdyYWRlOiBmYWxzZSxcclxuXHRcdFx0XHRpc0Rvd25ncmFkZTogZmFsc2UsXHJcblx0XHRcdH0sXHJcblx0XHRcdHJlcXVpcmVzUmVidWlsZDogdHJ1ZSxcclxuXHRcdFx0cmVidWlsZFJlYXNvbjogYEVtZXJnZW5jeSByZWJ1aWxkOiAke3JlYXNvbn1gLFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFZhbGlkYXRlIHRoZSBpbnRlZ3JpdHkgb2YgdmVyc2lvbiBzdG9yYWdlXHJcblx0ICovXHJcblx0cHVibGljIGFzeW5jIHZhbGlkYXRlVmVyc2lvblN0b3JhZ2UoKTogUHJvbWlzZTxib29sZWFuPiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBUZXN0IGlmIHdlIGNhbiByZWFkIGFuZCB3cml0ZSB2ZXJzaW9uIGRhdGFcclxuXHRcdFx0Y29uc3QgdGVzdFZlcnNpb24gPSBcInRlc3QtdmVyc2lvblwiO1xyXG5cdFx0XHRjb25zdCBvcmlnaW5hbFZlcnNpb24gPSBhd2FpdCB0aGlzLmdldFByZXZpb3VzVmVyc2lvbigpO1xyXG5cclxuXHRcdFx0Ly8gU3RvcmUgdGVzdCB2ZXJzaW9uXHJcblx0XHRcdGF3YWl0IHRoaXMucGVyc2lzdGVyLnN0b3JlRmlsZShcclxuXHRcdFx0XHR0aGlzLlZFUlNJT05fU1RPUkFHRV9LRVksXHJcblx0XHRcdFx0dGVzdFZlcnNpb25cclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIFJlYWQgaXQgYmFja1xyXG5cdFx0XHRjb25zdCByZWFkVmVyc2lvbiA9IGF3YWl0IHRoaXMuZ2V0UHJldmlvdXNWZXJzaW9uKCk7XHJcblxyXG5cdFx0XHQvLyBSZXN0b3JlIG9yaWdpbmFsIHZlcnNpb25cclxuXHRcdFx0aWYgKG9yaWdpbmFsVmVyc2lvbikge1xyXG5cdFx0XHRcdGF3YWl0IHRoaXMucGVyc2lzdGVyLnN0b3JlRmlsZShcclxuXHRcdFx0XHRcdHRoaXMuVkVSU0lPTl9TVE9SQUdFX0tFWSxcclxuXHRcdFx0XHRcdG9yaWdpbmFsVmVyc2lvblxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0YXdhaXQgdGhpcy5jbGVhclZlcnNpb25JbmZvKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiByZWFkVmVyc2lvbiA9PT0gdGVzdFZlcnNpb247XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiVmVyc2lvbiBzdG9yYWdlIHZhbGlkYXRpb24gZmFpbGVkOlwiLCBlcnJvcik7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBkaWFnbm9zdGljIGluZm9ybWF0aW9uIGFib3V0IHZlcnNpb24gc3RhdGVcclxuXHQgKi9cclxuXHRwdWJsaWMgYXN5bmMgZ2V0RGlhZ25vc3RpY0luZm8oKTogUHJvbWlzZTx7XHJcblx0XHRjdXJyZW50VmVyc2lvbjogc3RyaW5nO1xyXG5cdFx0cHJldmlvdXNWZXJzaW9uOiBzdHJpbmcgfCBudWxsO1xyXG5cdFx0c3RvcmFnZVZhbGlkOiBib29sZWFuO1xyXG5cdFx0dmVyc2lvblZhbGlkOiBib29sZWFuO1xyXG5cdFx0Y2FuV3JpdGU6IGJvb2xlYW47XHJcblx0fT4ge1xyXG5cdFx0Y29uc3QgcHJldmlvdXNWZXJzaW9uID0gYXdhaXQgdGhpcy5nZXRQcmV2aW91c1ZlcnNpb24oKTtcclxuXHRcdGNvbnN0IHN0b3JhZ2VWYWxpZCA9IGF3YWl0IHRoaXMudmFsaWRhdGVWZXJzaW9uU3RvcmFnZSgpO1xyXG5cdFx0Y29uc3QgdmVyc2lvblZhbGlkID0gcHJldmlvdXNWZXJzaW9uXHJcblx0XHRcdD8gdGhpcy5pc1ZhbGlkVmVyc2lvblN0cmluZyhwcmV2aW91c1ZlcnNpb24pXHJcblx0XHRcdDogdHJ1ZTtcclxuXHJcblx0XHQvLyBUZXN0IHdyaXRlIGNhcGFiaWxpdHlcclxuXHRcdGxldCBjYW5Xcml0ZSA9IGZhbHNlO1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0YXdhaXQgdGhpcy5wZXJzaXN0ZXIuc3RvcmVGaWxlKFxyXG5cdFx0XHRcdGAke3RoaXMuVkVSU0lPTl9TVE9SQUdFX0tFWX0tdGVzdGAsXHJcblx0XHRcdFx0XCJ0ZXN0XCJcclxuXHRcdFx0KTtcclxuXHRcdFx0YXdhaXQgdGhpcy5wZXJzaXN0ZXIucmVtb3ZlRmlsZShgJHt0aGlzLlZFUlNJT05fU1RPUkFHRV9LRVl9LXRlc3RgKTtcclxuXHRcdFx0Y2FuV3JpdGUgPSB0cnVlO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIldyaXRlIHRlc3QgZmFpbGVkOlwiLCBlcnJvcik7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0Y3VycmVudFZlcnNpb246IHRoaXMuY3VycmVudFZlcnNpb24sXHJcblx0XHRcdHByZXZpb3VzVmVyc2lvbixcclxuXHRcdFx0c3RvcmFnZVZhbGlkLFxyXG5cdFx0XHR2ZXJzaW9uVmFsaWQsXHJcblx0XHRcdGNhbldyaXRlLFxyXG5cdFx0fTtcclxuXHR9XHJcbn1cclxuIl19