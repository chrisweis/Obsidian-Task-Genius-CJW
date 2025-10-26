import { __awaiter } from "tslib";
import { LocalStorageCache } from "../../cache/local-storage-cache";
/**
 * Storage key namespace definitions
 */
export const Keys = {
    raw: (path) => `tasks.raw:${path}`,
    project: (path) => `project.data:${path}`,
    augmented: (path) => `tasks.augmented:${path}`,
    consolidated: () => `consolidated:taskIndex`,
    icsEvents: () => `ics:events`,
    meta: {
        version: () => `meta:version`,
        schemaVersion: () => `meta:schemaVersion`,
        custom: (key) => `meta:${key}`,
    },
};
/**
 * Storage adapter that integrates with LocalStorageCache
 * Provides namespace management, versioning, and content hashing
 */
export class Storage {
    constructor(appId, version) {
        this.schemaVersion = 1;
        this.currentVersion = version || "1.0.0"; // Use stable version instead of "unknown"
        this.cache = new LocalStorageCache(appId, this.currentVersion);
        console.log(`[Storage] Initialized with appId: ${appId}, version: ${this.currentVersion}`);
    }
    /**
     * Generate content hash for cache validation
     * Using a simple hash function suitable for browser environment
     */
    generateHash(content) {
        const str = JSON.stringify(content);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
    }
    /**
     * Check if a cached record is valid based on version and schema
     */
    isVersionValid(record) {
        return (record.version === this.currentVersion &&
            record.schema === this.schemaVersion);
    }
    /**
     * Load raw tasks for a file
     */
    loadRaw(path) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cached = yield this.cache.loadFile(Keys.raw(path));
                if (!cached || !cached.data)
                    return null;
                // Check version compatibility
                if (!this.isVersionValid(cached.data)) {
                    yield this.cache.removeFile(Keys.raw(path));
                    return null;
                }
                return cached.data;
            }
            catch (error) {
                console.error(`Error loading raw tasks for ${path}:`, error);
                return null;
            }
        });
    }
    /**
     * Store raw tasks for a file
     */
    storeRaw(path, tasks, fileContent, mtime) {
        return __awaiter(this, void 0, void 0, function* () {
            const record = {
                hash: this.generateHash(fileContent || tasks),
                time: Date.now(),
                version: this.currentVersion,
                schema: this.schemaVersion,
                data: tasks,
                mtime: mtime, // Store file modification time
            };
            yield this.cache.storeFile(Keys.raw(path), record);
        });
    }
    /**
     * Check if raw tasks are valid based on content hash and modification time
     */
    isRawValid(path, record, fileContent, mtime) {
        if (!this.isVersionValid(record))
            return false;
        // Check modification time if provided
        if (mtime !== undefined && record.mtime !== undefined) {
            if (record.mtime !== mtime) {
                return false; // File has been modified
            }
        }
        // If file content provided, check hash
        if (fileContent) {
            const expectedHash = this.generateHash(fileContent);
            return record.hash === expectedHash;
        }
        return true;
    }
    /**
     * Load project data for a file
     */
    loadProject(path) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cached = yield this.cache.loadFile(Keys.project(path));
                if (!cached || !cached.data)
                    return null;
                // Check version compatibility
                if (!this.isVersionValid(cached.data)) {
                    yield this.cache.removeFile(Keys.project(path));
                    return null;
                }
                return cached.data;
            }
            catch (error) {
                console.error(`Error loading project data for ${path}:`, error);
                return null;
            }
        });
    }
    /**
     * Store project data for a file
     */
    storeProject(path, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const record = {
                hash: this.generateHash(data),
                time: Date.now(),
                version: this.currentVersion,
                schema: this.schemaVersion,
                data,
            };
            yield this.cache.storeFile(Keys.project(path), record);
        });
    }
    /**
     * Load augmented tasks for a file
     */
    loadAugmented(path) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cached = yield this.cache.loadFile(Keys.augmented(path));
                if (!cached || !cached.data)
                    return null;
                // Check version compatibility
                if (!this.isVersionValid(cached.data)) {
                    yield this.cache.removeFile(Keys.augmented(path));
                    return null;
                }
                return cached.data;
            }
            catch (error) {
                console.error(`Error loading augmented tasks for ${path}:`, error);
                return null;
            }
        });
    }
    /**
     * Store augmented tasks for a file
     */
    storeAugmented(path, tasks) {
        return __awaiter(this, void 0, void 0, function* () {
            const record = {
                hash: this.generateHash(tasks),
                time: Date.now(),
                version: this.currentVersion,
                schema: this.schemaVersion,
                data: tasks,
            };
            yield this.cache.storeFile(Keys.augmented(path), record);
        });
    }
    /**
     * Store ICS events
     */
    storeIcsEvents(events) {
        return __awaiter(this, void 0, void 0, function* () {
            const record = {
                time: Date.now(),
                version: this.currentVersion,
                schema: this.schemaVersion,
                data: events,
            };
            yield this.cache.storeFile(Keys.icsEvents(), record);
            console.log(`[Storage] Stored ${events.length} ICS events`);
        });
    }
    /**
     * Load ICS events
     */
    loadIcsEvents() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cached = yield this.cache.loadFile(Keys.icsEvents());
                if (!cached || !cached.data) {
                    return [];
                }
                // Check version compatibility
                if (!this.isVersionValid(cached.data)) {
                    yield this.cache.removeFile(Keys.icsEvents());
                    return [];
                }
                return cached.data.data || [];
            }
            catch (error) {
                console.error("[Storage] Error loading ICS events:", error);
                return [];
            }
        });
    }
    /**
     * Load consolidated task index
     */
    loadConsolidated() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cached = yield this.cache.loadConsolidatedCache("taskIndex");
                if (!cached || !cached.data) {
                    console.log("[Storage] No consolidated cache found");
                    return null;
                }
                // Check version compatibility
                if (!this.isVersionValid(cached.data)) {
                    console.log("[Storage] Consolidated cache version mismatch, clearing...");
                    yield this.cache.removeFile(Keys.consolidated());
                    return null;
                }
                console.log(`[Storage] Loaded consolidated cache with ${cached.data.data ? Object.keys(cached.data.data).length : 0} entries`);
                return cached.data;
            }
            catch (error) {
                console.error("[Storage] Error loading consolidated index:", error);
                return null;
            }
        });
    }
    /**
     * Store consolidated task index
     */
    storeConsolidated(taskCache) {
        return __awaiter(this, void 0, void 0, function* () {
            const record = {
                time: Date.now(),
                version: this.currentVersion,
                schema: this.schemaVersion,
                data: taskCache,
            };
            const count = taskCache ? Object.keys(taskCache).length : 0;
            console.log(`[Storage] Storing consolidated cache with ${count} entries`);
            yield this.cache.storeConsolidatedCache("taskIndex", record);
        });
    }
    /**
     * Save arbitrary meta data (small JSON)
     */
    saveMeta(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.cache.storeFile(Keys.meta.custom(key), value);
        });
    }
    /**
     * Load arbitrary meta data
     */
    loadMeta(key) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const rec = yield this.cache.loadFile(Keys.meta.custom(key));
            return (_a = rec === null || rec === void 0 ? void 0 : rec.data) !== null && _a !== void 0 ? _a : null;
        });
    }
    /**
     * List all augmented paths (lightweight: from keys only)
     */
    listAugmentedPaths() {
        return __awaiter(this, void 0, void 0, function* () {
            const all = yield this.cache.allFiles();
            const prefix = "tasks.augmented:";
            return all
                .filter((k) => k.startsWith(prefix))
                .map((k) => k.substring(prefix.length));
        });
    }
    /**
     * List all raw paths (lightweight: from keys only)
     */
    listRawPaths() {
        return __awaiter(this, void 0, void 0, function* () {
            const all = yield this.cache.allFiles();
            const prefix = "tasks.raw:";
            return all
                .filter((k) => k.startsWith(prefix))
                .map((k) => k.substring(prefix.length));
        });
    }
    /**
     * Clear storage for a specific file
     */
    clearFile(path) {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([
                this.cache.removeFile(Keys.raw(path)),
                this.cache.removeFile(Keys.project(path)),
                this.cache.removeFile(Keys.augmented(path)),
            ]);
        });
    }
    /**
     * Clear all storage
     */
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.cache.clear();
        });
    }
    /**
     * Clear storage for a specific namespace
     */
    clearNamespace(namespace) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get all file paths and filter by namespace
            const allFiles = yield this.cache.allFiles();
            // Map namespace to prefix patterns
            const prefixMap = {
                raw: "tasks.raw:",
                project: "project.data:",
                augmented: "tasks.augmented:",
                consolidated: "consolidated:",
            };
            const prefix = prefixMap[namespace];
            const filesToDelete = allFiles.filter((file) => file.startsWith(prefix));
            for (const file of filesToDelete) {
                yield this.cache.removeFile(file);
            }
        });
    }
    /**
     * Update version information
     */
    updateVersion(version, schemaVersion) {
        return __awaiter(this, void 0, void 0, function* () {
            this.currentVersion = version;
            if (schemaVersion !== undefined) {
                this.schemaVersion = schemaVersion;
            }
            // Store version metadata
            yield this.cache.storeFile(Keys.meta.version(), {
                version: this.currentVersion,
            });
            yield this.cache.storeFile(Keys.meta.schemaVersion(), {
                schema: this.schemaVersion,
            });
        });
    }
    /**
     * Load version information
     */
    loadVersion() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const versionData = yield this.cache.loadFile(Keys.meta.version());
                const schemaData = yield this.cache.loadFile(Keys.meta.schemaVersion());
                if (versionData && schemaData) {
                    return {
                        version: versionData.data.version,
                        schema: schemaData.data.schema,
                    };
                }
            }
            catch (error) {
                console.error("Error loading version information:", error);
            }
            return null;
        });
    }
    /**
     * Get storage statistics
     */
    getStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const allFiles = yield this.cache.allFiles();
            const byNamespace = {
                raw: 0,
                project: 0,
                augmented: 0,
                consolidated: 0,
                meta: 0,
            };
            for (const file of allFiles) {
                if (file.startsWith("tasks.raw:"))
                    byNamespace.raw++;
                else if (file.startsWith("project.data:"))
                    byNamespace.project++;
                else if (file.startsWith("tasks.augmented:"))
                    byNamespace.augmented++;
                else if (file.startsWith("consolidated:"))
                    byNamespace.consolidated++;
                else if (file.startsWith("meta:"))
                    byNamespace.meta++;
            }
            return {
                totalKeys: allFiles.length,
                byNamespace,
            };
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3RvcmFnZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlN0b3JhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUNBLE9BQU8sRUFBRSxpQkFBaUIsRUFBVSxNQUFNLGlDQUFpQyxDQUFDO0FBd0M1RTs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLElBQUksR0FBRztJQUNuQixHQUFHLEVBQUUsQ0FBQyxJQUFZLEVBQUUsRUFBRSxDQUFDLGFBQWEsSUFBSSxFQUFFO0lBQzFDLE9BQU8sRUFBRSxDQUFDLElBQVksRUFBRSxFQUFFLENBQUMsZ0JBQWdCLElBQUksRUFBRTtJQUNqRCxTQUFTLEVBQUUsQ0FBQyxJQUFZLEVBQUUsRUFBRSxDQUFDLG1CQUFtQixJQUFJLEVBQUU7SUFDdEQsWUFBWSxFQUFFLEdBQUcsRUFBRSxDQUFDLHdCQUF3QjtJQUM1QyxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsWUFBWTtJQUM3QixJQUFJLEVBQUU7UUFDTCxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsY0FBYztRQUM3QixhQUFhLEVBQUUsR0FBRyxFQUFFLENBQUMsb0JBQW9CO1FBQ3pDLE1BQU0sRUFBRSxDQUFDLEdBQVcsRUFBRSxFQUFFLENBQUMsUUFBUSxHQUFHLEVBQUU7S0FDdEM7Q0FDRCxDQUFDO0FBRUY7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLE9BQU87SUFLbkIsWUFBWSxLQUFhLEVBQUUsT0FBZ0I7UUFGbkMsa0JBQWEsR0FBVyxDQUFDLENBQUM7UUFHakMsSUFBSSxDQUFDLGNBQWMsR0FBRyxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsMENBQTBDO1FBQ3BGLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQy9ELE9BQU8sQ0FBQyxHQUFHLENBQ1YscUNBQXFDLEtBQUssY0FBYyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQzdFLENBQUM7SUFDSCxDQUFDO0lB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RTtnQkFDNUIsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQztvQkFBRSxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUM7cUJBQ2hELElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUM7b0JBQUUsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO3FCQUM1RCxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUM7b0JBQzNDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQztxQkFDcEIsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQztvQkFDeEMsV0FBVyxDQUFDLFlBQVksRUFBRSxDQUFDO3FCQUN2QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDO29CQUFFLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQzthQUN0RDtZQUVELE9BQU87Z0JBQ04sU0FBUyxFQUFFLFFBQVEsQ0FBQyxNQUFNO2dCQUMxQixXQUFXO2FBQ1gsQ0FBQztRQUNILENBQUM7S0FBQTtDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHR5cGUgeyBUYXNrLCBUYXNrQ2FjaGUgfSBmcm9tIFwiLi4vLi4vdHlwZXMvdGFza1wiO1xyXG5pbXBvcnQgeyBMb2NhbFN0b3JhZ2VDYWNoZSwgQ2FjaGVkIH0gZnJvbSBcIi4uLy4uL2NhY2hlL2xvY2FsLXN0b3JhZ2UtY2FjaGVcIjtcclxuXHJcbi8qKlxyXG4gKiBTdG9yYWdlIHJlY29yZCB0eXBlcyB3aXRoIHZlcnNpb25pbmcgYW5kIGhhc2hpbmdcclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgUmF3UmVjb3JkIHtcclxuXHRoYXNoOiBzdHJpbmc7XHJcblx0dGltZTogbnVtYmVyO1xyXG5cdHZlcnNpb246IHN0cmluZztcclxuXHRzY2hlbWE6IG51bWJlcjtcclxuXHRkYXRhOiBUYXNrW107XHJcblx0bXRpbWU/OiBudW1iZXI7IC8vIEZpbGUgbW9kaWZpY2F0aW9uIHRpbWVcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBQcm9qZWN0UmVjb3JkIHtcclxuXHRoYXNoOiBzdHJpbmc7XHJcblx0dGltZTogbnVtYmVyO1xyXG5cdHZlcnNpb246IHN0cmluZztcclxuXHRzY2hlbWE6IG51bWJlcjtcclxuXHRkYXRhOiB7XHJcblx0XHR0Z1Byb2plY3Q/OiBhbnk7XHJcblx0XHRlbmhhbmNlZE1ldGFkYXRhOiBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xyXG5cdH07XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQXVnbWVudGVkUmVjb3JkIHtcclxuXHRoYXNoOiBzdHJpbmc7XHJcblx0dGltZTogbnVtYmVyO1xyXG5cdHZlcnNpb246IHN0cmluZztcclxuXHRzY2hlbWE6IG51bWJlcjtcclxuXHRkYXRhOiBUYXNrW107XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ29uc29saWRhdGVkUmVjb3JkIHtcclxuXHR0aW1lOiBudW1iZXI7XHJcblx0dmVyc2lvbjogc3RyaW5nO1xyXG5cdHNjaGVtYTogbnVtYmVyO1xyXG5cdGRhdGE6IFRhc2tDYWNoZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFN0b3JhZ2Uga2V5IG5hbWVzcGFjZSBkZWZpbml0aW9uc1xyXG4gKi9cclxuZXhwb3J0IGNvbnN0IEtleXMgPSB7XHJcblx0cmF3OiAocGF0aDogc3RyaW5nKSA9PiBgdGFza3MucmF3OiR7cGF0aH1gLFxyXG5cdHByb2plY3Q6IChwYXRoOiBzdHJpbmcpID0+IGBwcm9qZWN0LmRhdGE6JHtwYXRofWAsXHJcblx0YXVnbWVudGVkOiAocGF0aDogc3RyaW5nKSA9PiBgdGFza3MuYXVnbWVudGVkOiR7cGF0aH1gLFxyXG5cdGNvbnNvbGlkYXRlZDogKCkgPT4gYGNvbnNvbGlkYXRlZDp0YXNrSW5kZXhgLFxyXG5cdGljc0V2ZW50czogKCkgPT4gYGljczpldmVudHNgLFxyXG5cdG1ldGE6IHtcclxuXHRcdHZlcnNpb246ICgpID0+IGBtZXRhOnZlcnNpb25gLFxyXG5cdFx0c2NoZW1hVmVyc2lvbjogKCkgPT4gYG1ldGE6c2NoZW1hVmVyc2lvbmAsXHJcblx0XHRjdXN0b206IChrZXk6IHN0cmluZykgPT4gYG1ldGE6JHtrZXl9YCxcclxuXHR9LFxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFN0b3JhZ2UgYWRhcHRlciB0aGF0IGludGVncmF0ZXMgd2l0aCBMb2NhbFN0b3JhZ2VDYWNoZVxyXG4gKiBQcm92aWRlcyBuYW1lc3BhY2UgbWFuYWdlbWVudCwgdmVyc2lvbmluZywgYW5kIGNvbnRlbnQgaGFzaGluZ1xyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFN0b3JhZ2Uge1xyXG5cdHByaXZhdGUgY2FjaGU6IExvY2FsU3RvcmFnZUNhY2hlO1xyXG5cdHByaXZhdGUgY3VycmVudFZlcnNpb246IHN0cmluZztcclxuXHRwcml2YXRlIHNjaGVtYVZlcnNpb246IG51bWJlciA9IDE7XHJcblxyXG5cdGNvbnN0cnVjdG9yKGFwcElkOiBzdHJpbmcsIHZlcnNpb24/OiBzdHJpbmcpIHtcclxuXHRcdHRoaXMuY3VycmVudFZlcnNpb24gPSB2ZXJzaW9uIHx8IFwiMS4wLjBcIjsgLy8gVXNlIHN0YWJsZSB2ZXJzaW9uIGluc3RlYWQgb2YgXCJ1bmtub3duXCJcclxuXHRcdHRoaXMuY2FjaGUgPSBuZXcgTG9jYWxTdG9yYWdlQ2FjaGUoYXBwSWQsIHRoaXMuY3VycmVudFZlcnNpb24pO1xyXG5cdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdGBbU3RvcmFnZV0gSW5pdGlhbGl6ZWQgd2l0aCBhcHBJZDogJHthcHBJZH0sIHZlcnNpb246ICR7dGhpcy5jdXJyZW50VmVyc2lvbn1gXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2VuZXJhdGUgY29udGVudCBoYXNoIGZvciBjYWNoZSB2YWxpZGF0aW9uXHJcblx0ICogVXNpbmcgYSBzaW1wbGUgaGFzaCBmdW5jdGlvbiBzdWl0YWJsZSBmb3IgYnJvd3NlciBlbnZpcm9ubWVudFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZ2VuZXJhdGVIYXNoKGNvbnRlbnQ6IGFueSk6IHN0cmluZyB7XHJcblx0XHRjb25zdCBzdHIgPSBKU09OLnN0cmluZ2lmeShjb250ZW50KTtcclxuXHRcdGxldCBoYXNoID0gMDtcclxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGNvbnN0IGNoYXIgPSBzdHIuY2hhckNvZGVBdChpKTtcclxuXHRcdFx0aGFzaCA9IChoYXNoIDw8IDUpIC0gaGFzaCArIGNoYXI7XHJcblx0XHRcdGhhc2ggPSBoYXNoICYgaGFzaDsgLy8gQ29udmVydCB0byAzMmJpdCBpbnRlZ2VyXHJcblx0XHR9XHJcblx0XHRyZXR1cm4gTWF0aC5hYnMoaGFzaCkudG9TdHJpbmcoMTYpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgYSBjYWNoZWQgcmVjb3JkIGlzIHZhbGlkIGJhc2VkIG9uIHZlcnNpb24gYW5kIHNjaGVtYVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgaXNWZXJzaW9uVmFsaWQocmVjb3JkOiB7XHJcblx0XHR2ZXJzaW9uPzogc3RyaW5nO1xyXG5cdFx0c2NoZW1hPzogbnVtYmVyO1xyXG5cdH0pOiBib29sZWFuIHtcclxuXHRcdHJldHVybiAoXHJcblx0XHRcdHJlY29yZC52ZXJzaW9uID09PSB0aGlzLmN1cnJlbnRWZXJzaW9uICYmXHJcblx0XHRcdHJlY29yZC5zY2hlbWEgPT09IHRoaXMuc2NoZW1hVmVyc2lvblxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIExvYWQgcmF3IHRhc2tzIGZvciBhIGZpbGVcclxuXHQgKi9cclxuXHRhc3luYyBsb2FkUmF3KHBhdGg6IHN0cmluZyk6IFByb21pc2U8UmF3UmVjb3JkIHwgbnVsbD4ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgY2FjaGVkID0gYXdhaXQgdGhpcy5jYWNoZS5sb2FkRmlsZTxSYXdSZWNvcmQ+KEtleXMucmF3KHBhdGgpKTtcclxuXHRcdFx0aWYgKCFjYWNoZWQgfHwgIWNhY2hlZC5kYXRhKSByZXR1cm4gbnVsbDtcclxuXHJcblx0XHRcdC8vIENoZWNrIHZlcnNpb24gY29tcGF0aWJpbGl0eVxyXG5cdFx0XHRpZiAoIXRoaXMuaXNWZXJzaW9uVmFsaWQoY2FjaGVkLmRhdGEpKSB7XHJcblx0XHRcdFx0YXdhaXQgdGhpcy5jYWNoZS5yZW1vdmVGaWxlKEtleXMucmF3KHBhdGgpKTtcclxuXHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIGNhY2hlZC5kYXRhO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihgRXJyb3IgbG9hZGluZyByYXcgdGFza3MgZm9yICR7cGF0aH06YCwgZXJyb3IpO1xyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFN0b3JlIHJhdyB0YXNrcyBmb3IgYSBmaWxlXHJcblx0ICovXHJcblx0YXN5bmMgc3RvcmVSYXcoXHJcblx0XHRwYXRoOiBzdHJpbmcsXHJcblx0XHR0YXNrczogVGFza1tdLFxyXG5cdFx0ZmlsZUNvbnRlbnQ/OiBzdHJpbmcsXHJcblx0XHRtdGltZT86IG51bWJlclxyXG5cdCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Y29uc3QgcmVjb3JkOiBSYXdSZWNvcmQgPSB7XHJcblx0XHRcdGhhc2g6IHRoaXMuZ2VuZXJhdGVIYXNoKGZpbGVDb250ZW50IHx8IHRhc2tzKSxcclxuXHRcdFx0dGltZTogRGF0ZS5ub3coKSxcclxuXHRcdFx0dmVyc2lvbjogdGhpcy5jdXJyZW50VmVyc2lvbixcclxuXHRcdFx0c2NoZW1hOiB0aGlzLnNjaGVtYVZlcnNpb24sXHJcblx0XHRcdGRhdGE6IHRhc2tzLFxyXG5cdFx0XHRtdGltZTogbXRpbWUsIC8vIFN0b3JlIGZpbGUgbW9kaWZpY2F0aW9uIHRpbWVcclxuXHRcdH07XHJcblxyXG5cdFx0YXdhaXQgdGhpcy5jYWNoZS5zdG9yZUZpbGUoS2V5cy5yYXcocGF0aCksIHJlY29yZCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDaGVjayBpZiByYXcgdGFza3MgYXJlIHZhbGlkIGJhc2VkIG9uIGNvbnRlbnQgaGFzaCBhbmQgbW9kaWZpY2F0aW9uIHRpbWVcclxuXHQgKi9cclxuXHRpc1Jhd1ZhbGlkKFxyXG5cdFx0cGF0aDogc3RyaW5nLFxyXG5cdFx0cmVjb3JkOiBSYXdSZWNvcmQsXHJcblx0XHRmaWxlQ29udGVudD86IHN0cmluZyxcclxuXHRcdG10aW1lPzogbnVtYmVyXHJcblx0KTogYm9vbGVhbiB7XHJcblx0XHRpZiAoIXRoaXMuaXNWZXJzaW9uVmFsaWQocmVjb3JkKSkgcmV0dXJuIGZhbHNlO1xyXG5cclxuXHRcdC8vIENoZWNrIG1vZGlmaWNhdGlvbiB0aW1lIGlmIHByb3ZpZGVkXHJcblx0XHRpZiAobXRpbWUgIT09IHVuZGVmaW5lZCAmJiByZWNvcmQubXRpbWUgIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRpZiAocmVjb3JkLm10aW1lICE9PSBtdGltZSkge1xyXG5cdFx0XHRcdHJldHVybiBmYWxzZTsgLy8gRmlsZSBoYXMgYmVlbiBtb2RpZmllZFxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSWYgZmlsZSBjb250ZW50IHByb3ZpZGVkLCBjaGVjayBoYXNoXHJcblx0XHRpZiAoZmlsZUNvbnRlbnQpIHtcclxuXHRcdFx0Y29uc3QgZXhwZWN0ZWRIYXNoID0gdGhpcy5nZW5lcmF0ZUhhc2goZmlsZUNvbnRlbnQpO1xyXG5cdFx0XHRyZXR1cm4gcmVjb3JkLmhhc2ggPT09IGV4cGVjdGVkSGFzaDtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdHJ1ZTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIExvYWQgcHJvamVjdCBkYXRhIGZvciBhIGZpbGVcclxuXHQgKi9cclxuXHRhc3luYyBsb2FkUHJvamVjdChwYXRoOiBzdHJpbmcpOiBQcm9taXNlPFByb2plY3RSZWNvcmQgfCBudWxsPiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBjYWNoZWQgPSBhd2FpdCB0aGlzLmNhY2hlLmxvYWRGaWxlPFByb2plY3RSZWNvcmQ+KFxyXG5cdFx0XHRcdEtleXMucHJvamVjdChwYXRoKVxyXG5cdFx0XHQpO1xyXG5cdFx0XHRpZiAoIWNhY2hlZCB8fCAhY2FjaGVkLmRhdGEpIHJldHVybiBudWxsO1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgdmVyc2lvbiBjb21wYXRpYmlsaXR5XHJcblx0XHRcdGlmICghdGhpcy5pc1ZlcnNpb25WYWxpZChjYWNoZWQuZGF0YSkpIHtcclxuXHRcdFx0XHRhd2FpdCB0aGlzLmNhY2hlLnJlbW92ZUZpbGUoS2V5cy5wcm9qZWN0KHBhdGgpKTtcclxuXHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIGNhY2hlZC5kYXRhO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihgRXJyb3IgbG9hZGluZyBwcm9qZWN0IGRhdGEgZm9yICR7cGF0aH06YCwgZXJyb3IpO1xyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFN0b3JlIHByb2plY3QgZGF0YSBmb3IgYSBmaWxlXHJcblx0ICovXHJcblx0YXN5bmMgc3RvcmVQcm9qZWN0KFxyXG5cdFx0cGF0aDogc3RyaW5nLFxyXG5cdFx0ZGF0YTogeyB0Z1Byb2plY3Q/OiBhbnk7IGVuaGFuY2VkTWV0YWRhdGE6IFJlY29yZDxzdHJpbmcsIGFueT4gfVxyXG5cdCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Y29uc3QgcmVjb3JkOiBQcm9qZWN0UmVjb3JkID0ge1xyXG5cdFx0XHRoYXNoOiB0aGlzLmdlbmVyYXRlSGFzaChkYXRhKSxcclxuXHRcdFx0dGltZTogRGF0ZS5ub3coKSxcclxuXHRcdFx0dmVyc2lvbjogdGhpcy5jdXJyZW50VmVyc2lvbixcclxuXHRcdFx0c2NoZW1hOiB0aGlzLnNjaGVtYVZlcnNpb24sXHJcblx0XHRcdGRhdGEsXHJcblx0XHR9O1xyXG5cclxuXHRcdGF3YWl0IHRoaXMuY2FjaGUuc3RvcmVGaWxlKEtleXMucHJvamVjdChwYXRoKSwgcmVjb3JkKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIExvYWQgYXVnbWVudGVkIHRhc2tzIGZvciBhIGZpbGVcclxuXHQgKi9cclxuXHRhc3luYyBsb2FkQXVnbWVudGVkKHBhdGg6IHN0cmluZyk6IFByb21pc2U8QXVnbWVudGVkUmVjb3JkIHwgbnVsbD4ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgY2FjaGVkID0gYXdhaXQgdGhpcy5jYWNoZS5sb2FkRmlsZTxBdWdtZW50ZWRSZWNvcmQ+KFxyXG5cdFx0XHRcdEtleXMuYXVnbWVudGVkKHBhdGgpXHJcblx0XHRcdCk7XHJcblx0XHRcdGlmICghY2FjaGVkIHx8ICFjYWNoZWQuZGF0YSkgcmV0dXJuIG51bGw7XHJcblxyXG5cdFx0XHQvLyBDaGVjayB2ZXJzaW9uIGNvbXBhdGliaWxpdHlcclxuXHRcdFx0aWYgKCF0aGlzLmlzVmVyc2lvblZhbGlkKGNhY2hlZC5kYXRhKSkge1xyXG5cdFx0XHRcdGF3YWl0IHRoaXMuY2FjaGUucmVtb3ZlRmlsZShLZXlzLmF1Z21lbnRlZChwYXRoKSk7XHJcblx0XHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBjYWNoZWQuZGF0YTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoYEVycm9yIGxvYWRpbmcgYXVnbWVudGVkIHRhc2tzIGZvciAke3BhdGh9OmAsIGVycm9yKTtcclxuXHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTdG9yZSBhdWdtZW50ZWQgdGFza3MgZm9yIGEgZmlsZVxyXG5cdCAqL1xyXG5cdGFzeW5jIHN0b3JlQXVnbWVudGVkKHBhdGg6IHN0cmluZywgdGFza3M6IFRhc2tbXSk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Y29uc3QgcmVjb3JkOiBBdWdtZW50ZWRSZWNvcmQgPSB7XHJcblx0XHRcdGhhc2g6IHRoaXMuZ2VuZXJhdGVIYXNoKHRhc2tzKSxcclxuXHRcdFx0dGltZTogRGF0ZS5ub3coKSxcclxuXHRcdFx0dmVyc2lvbjogdGhpcy5jdXJyZW50VmVyc2lvbixcclxuXHRcdFx0c2NoZW1hOiB0aGlzLnNjaGVtYVZlcnNpb24sXHJcblx0XHRcdGRhdGE6IHRhc2tzLFxyXG5cdFx0fTtcclxuXHJcblx0XHRhd2FpdCB0aGlzLmNhY2hlLnN0b3JlRmlsZShLZXlzLmF1Z21lbnRlZChwYXRoKSwgcmVjb3JkKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFN0b3JlIElDUyBldmVudHNcclxuXHQgKi9cclxuXHRhc3luYyBzdG9yZUljc0V2ZW50cyhldmVudHM6IFRhc2tbXSk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Y29uc3QgcmVjb3JkID0ge1xyXG5cdFx0XHR0aW1lOiBEYXRlLm5vdygpLFxyXG5cdFx0XHR2ZXJzaW9uOiB0aGlzLmN1cnJlbnRWZXJzaW9uLFxyXG5cdFx0XHRzY2hlbWE6IHRoaXMuc2NoZW1hVmVyc2lvbixcclxuXHRcdFx0ZGF0YTogZXZlbnRzLFxyXG5cdFx0fTtcclxuXHJcblx0XHRhd2FpdCB0aGlzLmNhY2hlLnN0b3JlRmlsZShLZXlzLmljc0V2ZW50cygpLCByZWNvcmQpO1xyXG5cdFx0Y29uc29sZS5sb2coYFtTdG9yYWdlXSBTdG9yZWQgJHtldmVudHMubGVuZ3RofSBJQ1MgZXZlbnRzYCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBMb2FkIElDUyBldmVudHNcclxuXHQgKi9cclxuXHRhc3luYyBsb2FkSWNzRXZlbnRzKCk6IFByb21pc2U8VGFza1tdPiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBjYWNoZWQgPSBhd2FpdCB0aGlzLmNhY2hlLmxvYWRGaWxlPGFueT4oS2V5cy5pY3NFdmVudHMoKSk7XHJcblx0XHRcdGlmICghY2FjaGVkIHx8ICFjYWNoZWQuZGF0YSkge1xyXG5cdFx0XHRcdHJldHVybiBbXTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgdmVyc2lvbiBjb21wYXRpYmlsaXR5XHJcblx0XHRcdGlmICghdGhpcy5pc1ZlcnNpb25WYWxpZChjYWNoZWQuZGF0YSkpIHtcclxuXHRcdFx0XHRhd2FpdCB0aGlzLmNhY2hlLnJlbW92ZUZpbGUoS2V5cy5pY3NFdmVudHMoKSk7XHJcblx0XHRcdFx0cmV0dXJuIFtdO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gY2FjaGVkLmRhdGEuZGF0YSB8fCBbXTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJbU3RvcmFnZV0gRXJyb3IgbG9hZGluZyBJQ1MgZXZlbnRzOlwiLCBlcnJvcik7XHJcblx0XHRcdHJldHVybiBbXTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIExvYWQgY29uc29saWRhdGVkIHRhc2sgaW5kZXhcclxuXHQgKi9cclxuXHRhc3luYyBsb2FkQ29uc29saWRhdGVkKCk6IFByb21pc2U8Q29uc29saWRhdGVkUmVjb3JkIHwgbnVsbD4ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgY2FjaGVkID1cclxuXHRcdFx0XHRhd2FpdCB0aGlzLmNhY2hlLmxvYWRDb25zb2xpZGF0ZWRDYWNoZTxDb25zb2xpZGF0ZWRSZWNvcmQ+KFxyXG5cdFx0XHRcdFx0XCJ0YXNrSW5kZXhcIlxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdGlmICghY2FjaGVkIHx8ICFjYWNoZWQuZGF0YSkge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiW1N0b3JhZ2VdIE5vIGNvbnNvbGlkYXRlZCBjYWNoZSBmb3VuZFwiKTtcclxuXHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgdmVyc2lvbiBjb21wYXRpYmlsaXR5XHJcblx0XHRcdGlmICghdGhpcy5pc1ZlcnNpb25WYWxpZChjYWNoZWQuZGF0YSkpIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdFwiW1N0b3JhZ2VdIENvbnNvbGlkYXRlZCBjYWNoZSB2ZXJzaW9uIG1pc21hdGNoLCBjbGVhcmluZy4uLlwiXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRhd2FpdCB0aGlzLmNhY2hlLnJlbW92ZUZpbGUoS2V5cy5jb25zb2xpZGF0ZWQoKSk7XHJcblx0XHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdGBbU3RvcmFnZV0gTG9hZGVkIGNvbnNvbGlkYXRlZCBjYWNoZSB3aXRoICR7XHJcblx0XHRcdFx0XHRjYWNoZWQuZGF0YS5kYXRhID8gT2JqZWN0LmtleXMoY2FjaGVkLmRhdGEuZGF0YSkubGVuZ3RoIDogMFxyXG5cdFx0XHRcdH0gZW50cmllc2BcclxuXHRcdFx0KTtcclxuXHRcdFx0cmV0dXJuIGNhY2hlZC5kYXRhO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIltTdG9yYWdlXSBFcnJvciBsb2FkaW5nIGNvbnNvbGlkYXRlZCBpbmRleDpcIiwgZXJyb3IpO1xyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFN0b3JlIGNvbnNvbGlkYXRlZCB0YXNrIGluZGV4XHJcblx0ICovXHJcblx0YXN5bmMgc3RvcmVDb25zb2xpZGF0ZWQodGFza0NhY2hlOiBUYXNrQ2FjaGUpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGNvbnN0IHJlY29yZDogQ29uc29saWRhdGVkUmVjb3JkID0ge1xyXG5cdFx0XHR0aW1lOiBEYXRlLm5vdygpLFxyXG5cdFx0XHR2ZXJzaW9uOiB0aGlzLmN1cnJlbnRWZXJzaW9uLFxyXG5cdFx0XHRzY2hlbWE6IHRoaXMuc2NoZW1hVmVyc2lvbixcclxuXHRcdFx0ZGF0YTogdGFza0NhY2hlLFxyXG5cdFx0fTtcclxuXHRcdGNvbnN0IGNvdW50ID0gdGFza0NhY2hlID8gT2JqZWN0LmtleXModGFza0NhY2hlKS5sZW5ndGggOiAwO1xyXG5cdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdGBbU3RvcmFnZV0gU3RvcmluZyBjb25zb2xpZGF0ZWQgY2FjaGUgd2l0aCAke2NvdW50fSBlbnRyaWVzYFxyXG5cdFx0KTtcclxuXHRcdGF3YWl0IHRoaXMuY2FjaGUuc3RvcmVDb25zb2xpZGF0ZWRDYWNoZShcInRhc2tJbmRleFwiLCByZWNvcmQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2F2ZSBhcmJpdHJhcnkgbWV0YSBkYXRhIChzbWFsbCBKU09OKVxyXG5cdCAqL1xyXG5cdGFzeW5jIHNhdmVNZXRhPFQgPSBhbnk+KGtleTogc3RyaW5nLCB2YWx1ZTogVCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0YXdhaXQgdGhpcy5jYWNoZS5zdG9yZUZpbGUoS2V5cy5tZXRhLmN1c3RvbShrZXkpLCB2YWx1ZSBhcyBhbnkpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTG9hZCBhcmJpdHJhcnkgbWV0YSBkYXRhXHJcblx0ICovXHJcblx0YXN5bmMgbG9hZE1ldGE8VCA9IGFueT4oa2V5OiBzdHJpbmcpOiBQcm9taXNlPFQgfCBudWxsPiB7XHJcblx0XHRjb25zdCByZWMgPSBhd2FpdCB0aGlzLmNhY2hlLmxvYWRGaWxlPFQ+KEtleXMubWV0YS5jdXN0b20oa2V5KSk7XHJcblx0XHRyZXR1cm4gcmVjPy5kYXRhID8/IG51bGw7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBMaXN0IGFsbCBhdWdtZW50ZWQgcGF0aHMgKGxpZ2h0d2VpZ2h0OiBmcm9tIGtleXMgb25seSlcclxuXHQgKi9cclxuXHRhc3luYyBsaXN0QXVnbWVudGVkUGF0aHMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xyXG5cdFx0Y29uc3QgYWxsID0gYXdhaXQgdGhpcy5jYWNoZS5hbGxGaWxlcygpO1xyXG5cdFx0Y29uc3QgcHJlZml4ID0gXCJ0YXNrcy5hdWdtZW50ZWQ6XCI7XHJcblx0XHRyZXR1cm4gYWxsXHJcblx0XHRcdC5maWx0ZXIoKGspID0+IGsuc3RhcnRzV2l0aChwcmVmaXgpKVxyXG5cdFx0XHQubWFwKChrKSA9PiBrLnN1YnN0cmluZyhwcmVmaXgubGVuZ3RoKSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBMaXN0IGFsbCByYXcgcGF0aHMgKGxpZ2h0d2VpZ2h0OiBmcm9tIGtleXMgb25seSlcclxuXHQgKi9cclxuXHRhc3luYyBsaXN0UmF3UGF0aHMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xyXG5cdFx0Y29uc3QgYWxsID0gYXdhaXQgdGhpcy5jYWNoZS5hbGxGaWxlcygpO1xyXG5cdFx0Y29uc3QgcHJlZml4ID0gXCJ0YXNrcy5yYXc6XCI7XHJcblx0XHRyZXR1cm4gYWxsXHJcblx0XHRcdC5maWx0ZXIoKGspID0+IGsuc3RhcnRzV2l0aChwcmVmaXgpKVxyXG5cdFx0XHQubWFwKChrKSA9PiBrLnN1YnN0cmluZyhwcmVmaXgubGVuZ3RoKSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDbGVhciBzdG9yYWdlIGZvciBhIHNwZWNpZmljIGZpbGVcclxuXHQgKi9cclxuXHRhc3luYyBjbGVhckZpbGUocGF0aDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRhd2FpdCBQcm9taXNlLmFsbChbXHJcblx0XHRcdHRoaXMuY2FjaGUucmVtb3ZlRmlsZShLZXlzLnJhdyhwYXRoKSksXHJcblx0XHRcdHRoaXMuY2FjaGUucmVtb3ZlRmlsZShLZXlzLnByb2plY3QocGF0aCkpLFxyXG5cdFx0XHR0aGlzLmNhY2hlLnJlbW92ZUZpbGUoS2V5cy5hdWdtZW50ZWQocGF0aCkpLFxyXG5cdFx0XSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDbGVhciBhbGwgc3RvcmFnZVxyXG5cdCAqL1xyXG5cdGFzeW5jIGNsZWFyKCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0YXdhaXQgdGhpcy5jYWNoZS5jbGVhcigpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2xlYXIgc3RvcmFnZSBmb3IgYSBzcGVjaWZpYyBuYW1lc3BhY2VcclxuXHQgKi9cclxuXHRhc3luYyBjbGVhck5hbWVzcGFjZShcclxuXHRcdG5hbWVzcGFjZTogXCJyYXdcIiB8IFwicHJvamVjdFwiIHwgXCJhdWdtZW50ZWRcIiB8IFwiY29uc29saWRhdGVkXCJcclxuXHQpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdC8vIEdldCBhbGwgZmlsZSBwYXRocyBhbmQgZmlsdGVyIGJ5IG5hbWVzcGFjZVxyXG5cdFx0Y29uc3QgYWxsRmlsZXMgPSBhd2FpdCB0aGlzLmNhY2hlLmFsbEZpbGVzKCk7XHJcblxyXG5cdFx0Ly8gTWFwIG5hbWVzcGFjZSB0byBwcmVmaXggcGF0dGVybnNcclxuXHRcdGNvbnN0IHByZWZpeE1hcCA9IHtcclxuXHRcdFx0cmF3OiBcInRhc2tzLnJhdzpcIixcclxuXHRcdFx0cHJvamVjdDogXCJwcm9qZWN0LmRhdGE6XCIsXHJcblx0XHRcdGF1Z21lbnRlZDogXCJ0YXNrcy5hdWdtZW50ZWQ6XCIsXHJcblx0XHRcdGNvbnNvbGlkYXRlZDogXCJjb25zb2xpZGF0ZWQ6XCIsXHJcblx0XHR9O1xyXG5cclxuXHRcdGNvbnN0IHByZWZpeCA9IHByZWZpeE1hcFtuYW1lc3BhY2VdO1xyXG5cdFx0Y29uc3QgZmlsZXNUb0RlbGV0ZSA9IGFsbEZpbGVzLmZpbHRlcigoZmlsZSkgPT5cclxuXHRcdFx0ZmlsZS5zdGFydHNXaXRoKHByZWZpeClcclxuXHRcdCk7XHJcblxyXG5cdFx0Zm9yIChjb25zdCBmaWxlIG9mIGZpbGVzVG9EZWxldGUpIHtcclxuXHRcdFx0YXdhaXQgdGhpcy5jYWNoZS5yZW1vdmVGaWxlKGZpbGUpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIHZlcnNpb24gaW5mb3JtYXRpb25cclxuXHQgKi9cclxuXHRhc3luYyB1cGRhdGVWZXJzaW9uKFxyXG5cdFx0dmVyc2lvbjogc3RyaW5nLFxyXG5cdFx0c2NoZW1hVmVyc2lvbj86IG51bWJlclxyXG5cdCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0dGhpcy5jdXJyZW50VmVyc2lvbiA9IHZlcnNpb247XHJcblx0XHRpZiAoc2NoZW1hVmVyc2lvbiAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdHRoaXMuc2NoZW1hVmVyc2lvbiA9IHNjaGVtYVZlcnNpb247XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU3RvcmUgdmVyc2lvbiBtZXRhZGF0YVxyXG5cdFx0YXdhaXQgdGhpcy5jYWNoZS5zdG9yZUZpbGUoS2V5cy5tZXRhLnZlcnNpb24oKSwge1xyXG5cdFx0XHR2ZXJzaW9uOiB0aGlzLmN1cnJlbnRWZXJzaW9uLFxyXG5cdFx0fSk7XHJcblx0XHRhd2FpdCB0aGlzLmNhY2hlLnN0b3JlRmlsZShLZXlzLm1ldGEuc2NoZW1hVmVyc2lvbigpLCB7XHJcblx0XHRcdHNjaGVtYTogdGhpcy5zY2hlbWFWZXJzaW9uLFxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBMb2FkIHZlcnNpb24gaW5mb3JtYXRpb25cclxuXHQgKi9cclxuXHRhc3luYyBsb2FkVmVyc2lvbigpOiBQcm9taXNlPHsgdmVyc2lvbjogc3RyaW5nOyBzY2hlbWE6IG51bWJlciB9IHwgbnVsbD4ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgdmVyc2lvbkRhdGEgPSBhd2FpdCB0aGlzLmNhY2hlLmxvYWRGaWxlPHsgdmVyc2lvbjogc3RyaW5nIH0+KFxyXG5cdFx0XHRcdEtleXMubWV0YS52ZXJzaW9uKClcclxuXHRcdFx0KTtcclxuXHRcdFx0Y29uc3Qgc2NoZW1hRGF0YSA9IGF3YWl0IHRoaXMuY2FjaGUubG9hZEZpbGU8eyBzY2hlbWE6IG51bWJlciB9PihcclxuXHRcdFx0XHRLZXlzLm1ldGEuc2NoZW1hVmVyc2lvbigpXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRpZiAodmVyc2lvbkRhdGEgJiYgc2NoZW1hRGF0YSkge1xyXG5cdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHR2ZXJzaW9uOiB2ZXJzaW9uRGF0YS5kYXRhLnZlcnNpb24sXHJcblx0XHRcdFx0XHRzY2hlbWE6IHNjaGVtYURhdGEuZGF0YS5zY2hlbWEsXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIGxvYWRpbmcgdmVyc2lvbiBpbmZvcm1hdGlvbjpcIiwgZXJyb3IpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBudWxsO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHN0b3JhZ2Ugc3RhdGlzdGljc1xyXG5cdCAqL1xyXG5cdGFzeW5jIGdldFN0YXRzKCk6IFByb21pc2U8e1xyXG5cdFx0dG90YWxLZXlzOiBudW1iZXI7XHJcblx0XHRieU5hbWVzcGFjZTogUmVjb3JkPHN0cmluZywgbnVtYmVyPjtcclxuXHR9PiB7XHJcblx0XHRjb25zdCBhbGxGaWxlcyA9IGF3YWl0IHRoaXMuY2FjaGUuYWxsRmlsZXMoKTtcclxuXHJcblx0XHRjb25zdCBieU5hbWVzcGFjZTogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHtcclxuXHRcdFx0cmF3OiAwLFxyXG5cdFx0XHRwcm9qZWN0OiAwLFxyXG5cdFx0XHRhdWdtZW50ZWQ6IDAsXHJcblx0XHRcdGNvbnNvbGlkYXRlZDogMCxcclxuXHRcdFx0bWV0YTogMCxcclxuXHRcdH07XHJcblxyXG5cdFx0Zm9yIChjb25zdCBmaWxlIG9mIGFsbEZpbGVzKSB7XHJcblx0XHRcdGlmIChmaWxlLnN0YXJ0c1dpdGgoXCJ0YXNrcy5yYXc6XCIpKSBieU5hbWVzcGFjZS5yYXcrKztcclxuXHRcdFx0ZWxzZSBpZiAoZmlsZS5zdGFydHNXaXRoKFwicHJvamVjdC5kYXRhOlwiKSkgYnlOYW1lc3BhY2UucHJvamVjdCsrO1xyXG5cdFx0XHRlbHNlIGlmIChmaWxlLnN0YXJ0c1dpdGgoXCJ0YXNrcy5hdWdtZW50ZWQ6XCIpKVxyXG5cdFx0XHRcdGJ5TmFtZXNwYWNlLmF1Z21lbnRlZCsrO1xyXG5cdFx0XHRlbHNlIGlmIChmaWxlLnN0YXJ0c1dpdGgoXCJjb25zb2xpZGF0ZWQ6XCIpKVxyXG5cdFx0XHRcdGJ5TmFtZXNwYWNlLmNvbnNvbGlkYXRlZCsrO1xyXG5cdFx0XHRlbHNlIGlmIChmaWxlLnN0YXJ0c1dpdGgoXCJtZXRhOlwiKSkgYnlOYW1lc3BhY2UubWV0YSsrO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHRvdGFsS2V5czogYWxsRmlsZXMubGVuZ3RoLFxyXG5cdFx0XHRieU5hbWVzcGFjZSxcclxuXHRcdH07XHJcblx0fVxyXG59XHJcbiJdfQ==