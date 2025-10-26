import { __awaiter } from "tslib";
import localforage from "localforage";
/** Storage wrapper for persistent caching with IndexedDB/localStorage */
export class LocalStorageCache {
    /**
     * Create a new local storage cache
     * @param appId The application ID for the cache namespace
     * @param version Current plugin version for cache invalidation
     */
    constructor(appId, version) {
        this.appId = appId;
        /** Storage namespace prefix */
        this.cachePrefix = "taskgenius/cache/";
        /** Whether initialization is complete */
        this.initialized = false;
        /** Current plugin version for cache invalidation */
        this.currentVersion = "unknown";
        this.currentVersion = version || "unknown";
        this.persister = localforage.createInstance({
            name: this.cachePrefix + this.appId,
            driver: [localforage.INDEXEDDB],
            description: "TaskGenius metadata cache for files and tasks",
        });
        // Attempt initial setup
        this.initialize();
    }
    /**
     * Initialize the storage backend and verify it's working
     */
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Test write/read
                yield this.persister.setItem(`${this.appId}:__test__`, true);
                yield this.persister.removeItem(`${this.appId}:__test__`);
                this.initialized = true;
            }
            catch (error) {
                console.error("Failed to initialize IndexedDB cache, falling back to localStorage:", error);
                this.persister = localforage.createInstance({
                    name: this.cachePrefix + this.appId,
                    driver: [localforage.LOCALSTORAGE],
                    description: "TaskGenius metadata fallback cache",
                });
                this.initialized = true;
            }
        });
    }
    /**
     * Drop and recreate the storage instance
     */
    recreate() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield localforage.dropInstance({
                    name: this.cachePrefix + this.appId,
                });
            }
            catch (error) {
                console.error("Error dropping storage instance:", error);
            }
            this.persister = localforage.createInstance({
                name: this.cachePrefix + this.appId,
                driver: [localforage.INDEXEDDB],
                description: "TaskGenius metadata cache for files and tasks",
            });
            this.initialized = false;
            yield this.initialize();
        });
    }
    /**
     * Load metadata for a file from cache
     * @param path File path to load
     * @returns Cached data or null if not found
     */
    loadFile(path) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.initialized)
                yield this.initialize();
            try {
                const key = this.fileKey(path);
                const data = yield this.persister.getItem(key);
                return data;
            }
            catch (error) {
                console.error(`Error loading cache for ${path}:`, error);
                return null;
            }
        });
    }
    /**
     * Store metadata for a file in cache
     * @param path File path to store
     * @param data Data to cache
     */
    storeFile(path, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.initialized)
                yield this.initialize();
            try {
                const key = this.fileKey(path);
                yield this.persister.setItem(key, {
                    version: this.currentVersion,
                    time: Date.now(),
                    data,
                });
            }
            catch (error) {
                console.error(`Error storing cache for ${path}:`, error);
            }
        });
    }
    /**
     * Remove stale file entries from cache
     * @param existing Set of paths that should remain in cache
     * @returns Set of removed paths
     */
    synchronize(existing) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.initialized)
                yield this.initialize();
            try {
                const existingPaths = new Set(existing);
                const cachedFiles = yield this.allFiles();
                const staleFiles = new Set();
                for (const file of cachedFiles) {
                    if (!existingPaths.has(file)) {
                        staleFiles.add(file);
                        yield this.persister.removeItem(this.fileKey(file));
                    }
                }
                return staleFiles;
            }
            catch (error) {
                console.error("Error synchronizing cache:", error);
                return new Set();
            }
        });
    }
    /**
     * Get all keys in the cache
     */
    allKeys() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.initialized)
                yield this.initialize();
            try {
                const keys = yield this.persister.keys();
                return keys.filter((key) => key.startsWith(`${this.appId}:`));
            }
            catch (error) {
                console.error("Error getting cache keys:", error);
                return [];
            }
        });
    }
    /**
     * Get all file paths stored in cache
     */
    allFiles() {
        return __awaiter(this, void 0, void 0, function* () {
            const filePrefix = `${this.appId}:file:`;
            try {
                const keys = yield this.allKeys();
                return keys
                    .filter((key) => key.startsWith(filePrefix))
                    .map((key) => key.substring(filePrefix.length));
            }
            catch (error) {
                console.error("Error getting cached files:", error);
                return [];
            }
        });
    }
    /**
     * Get storage key for a file path
     */
    fileKey(path) {
        return `${this.appId}:file:${path}`;
    }
    /**
     * Check if a file exists in cache
     */
    hasFile(path) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.initialized)
                yield this.initialize();
            try {
                return (yield this.persister.getItem(this.fileKey(path))) !== null;
            }
            catch (_a) {
                return false;
            }
        });
    }
    /**
     * Remove a file from cache
     */
    removeFile(path) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.initialized)
                yield this.initialize();
            try {
                yield this.persister.removeItem(this.fileKey(path));
            }
            catch (error) {
                console.error(`Error removing cache for ${path}:`, error);
            }
        });
    }
    /**
     * Get cache statistics
     */
    getStats() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const files = yield this.allFiles();
                return {
                    totalFiles: files.length,
                    cacheSize: files.length,
                };
            }
            catch (error) {
                console.error("Error getting cache stats:", error);
                return { totalFiles: 0, cacheSize: 0 };
            }
        });
    }
    /**
     * Clear all entries from the cache
     */
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.initialized)
                yield this.initialize();
            try {
                const keys = yield this.allKeys();
                for (const key of keys) {
                    yield this.persister.removeItem(key);
                }
            }
            catch (error) {
                console.error("Error clearing cache:", error);
                // Fallback if clear fails: try to recreate the storage
                yield this.recreate();
            }
        });
    }
    /**
     * Store a consolidated cache of all tasks for faster loading
     * @param tasks A TaskCache object containing all task data
     */
    storeConsolidatedCache(key, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.initialized)
                yield this.initialize();
            try {
                const cacheKey = `${this.appId}:consolidated:${key}`;
                yield this.persister.setItem(cacheKey, {
                    version: this.currentVersion,
                    time: Date.now(),
                    data,
                });
            }
            catch (error) {
                console.error(`Error storing consolidated cache for ${key}:`, error);
            }
        });
    }
    /**
     * Load the consolidated tasks cache
     * @returns The cached TaskCache object or null if not found
     */
    loadConsolidatedCache(key) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.initialized)
                yield this.initialize();
            try {
                const cacheKey = `${this.appId}:consolidated:${key}`;
                const data = yield this.persister.getItem(cacheKey);
                return data;
            }
            catch (error) {
                console.error(`Error loading consolidated cache for ${key}:`, error);
                return null;
            }
        });
    }
    /**
     * Get all cached files with their data
     * @returns Object with file paths as keys and cached data as values
     */
    getAll() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.initialized)
                yield this.initialize();
            try {
                const files = yield this.allFiles();
                const result = {};
                for (const file of files) {
                    result[file] = yield this.loadFile(file);
                }
                return result;
            }
            catch (error) {
                console.error("Error getting all cached files:", error);
                return {};
            }
        });
    }
    /**
     * Update the current version for cache invalidation
     * @param version New version string
     */
    setVersion(version) {
        this.currentVersion = version;
    }
    /**
     * Get the current version being used for caching
     */
    getVersion() {
        return this.currentVersion;
    }
    /**
     * Check if cached data is compatible with current version
     * @param cached Cached data to check
     * @param strictVersionCheck Whether to require exact version match
     */
    isVersionCompatible(cached, strictVersionCheck = false) {
        if (!cached.version) {
            // Old cache format without version - consider incompatible
            return false;
        }
        if (strictVersionCheck) {
            return cached.version === this.currentVersion;
        }
        // For non-strict checking, we could implement more sophisticated logic
        // For now, treat any version mismatch as incompatible to be safe
        return cached.version === this.currentVersion;
    }
    /**
     * Clear all cache entries that are incompatible with current version
     */
    clearIncompatibleCache() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.initialized)
                yield this.initialize();
            let clearedCount = 0;
            try {
                const keys = yield this.allKeys();
                for (const key of keys) {
                    try {
                        const data = yield this.persister.getItem(key);
                        if (data && !this.isVersionCompatible(data)) {
                            yield this.persister.removeItem(key);
                            clearedCount++;
                        }
                    }
                    catch (error) {
                        // If we can't read the data, remove it
                        yield this.persister.removeItem(key);
                        clearedCount++;
                    }
                }
            }
            catch (error) {
                console.error("Error clearing incompatible cache:", error);
            }
            return clearedCount;
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWwtc3RvcmFnZS1jYWNoZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImxvY2FsLXN0b3JhZ2UtY2FjaGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sV0FBVyxNQUFNLGFBQWEsQ0FBQztBQVl0Qyx5RUFBeUU7QUFDekUsTUFBTSxPQUFPLGlCQUFpQjtJQVU3Qjs7OztPQUlHO0lBQ0gsWUFBNEIsS0FBYSxFQUFFLE9BQWdCO1FBQS9CLFVBQUssR0FBTCxLQUFLLENBQVE7UUFaekMsK0JBQStCO1FBQ2QsZ0JBQVcsR0FBRyxtQkFBbUIsQ0FBQztRQUNuRCx5Q0FBeUM7UUFDakMsZ0JBQVcsR0FBRyxLQUFLLENBQUM7UUFDNUIsb0RBQW9EO1FBQzVDLG1CQUFjLEdBQVcsU0FBUyxDQUFDO1FBUTFDLElBQUksQ0FBQyxjQUFjLEdBQUcsT0FBTyxJQUFJLFNBQVMsQ0FBQztRQUMzQyxJQUFJLENBQUMsU0FBUyxHQUFHLFdBQVcsQ0FBQyxjQUFjLENBQUM7WUFDM0MsSUFBSSxFQUFFLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUs7WUFDbkMsTUFBTSxFQUFFLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQztZQUMvQixXQUFXLEVBQUUsK0NBQStDO1NBQzVELENBQUMsQ0FBQztRQUVILHdCQUF3QjtRQUN4QixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDbkIsQ0FBQztJQUVEOztPQUVHO0lBQ1csVUFBVTs7WUFDdkIsSUFBSTtnQkFDSCxrQkFBa0I7Z0JBQ2xCLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQzdELE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxXQUFXLENBQUMsQ0FBQztnQkFDMUQsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7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SUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBRS9DLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQztZQUNyQixJQUFJO2dCQUNILE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUVsQyxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksRUFBRTtvQkFDdkIsSUFBSTt3QkFDSCxNQUFNLElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFjLEdBQUcsQ0FBQyxDQUFDO3dCQUM1RCxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsRUFBRTs0QkFDNUMsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQzs0QkFDckMsWUFBWSxFQUFFLENBQUM7eUJBQ2Y7cUJBQ0Q7b0JBQUMsT0FBTyxLQUFLLEVBQUU7d0JBQ2YsdUNBQXVDO3dCQUN2QyxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO3dCQUNyQyxZQUFZLEVBQUUsQ0FBQztxQkFDZjtpQkFDRDthQUNEO1lBQUMsT0FBTyxLQUFLLEVBQUU7Z0JBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxvQ0FBb0MsRUFBRSxLQUFLLENBQUMsQ0FBQzthQUMzRDtZQUVELE9BQU8sWUFBWSxDQUFDO1FBQ3JCLENBQUM7S0FBQTtDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGxvY2FsZm9yYWdlIGZyb20gXCJsb2NhbGZvcmFnZVwiO1xyXG5cclxuLyoqIEEgcGllY2Ugb2YgZGF0YSB0aGF0IGhhcyBiZWVuIGNhY2hlZCBmb3IgYSBzcGVjaWZpYyB2ZXJzaW9uIGFuZCB0aW1lLiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIENhY2hlZDxUPiB7XHJcblx0LyoqIFRoZSB2ZXJzaW9uIG9mIHRoZSBwbHVnaW4gdGhhdCB0aGUgZGF0YSB3YXMgd3JpdHRlbiB0byBjYWNoZSB3aXRoLiAqL1xyXG5cdHZlcnNpb246IHN0cmluZztcclxuXHQvKiogVGhlIFVOSVggZXBvY2ggdGltZSBpbiBtaWxsaXNlY29uZHMgdGhhdCB0aGUgZGF0YSB3YXMgd3JpdHRlbiB0byBjYWNoZS4gKi9cclxuXHR0aW1lOiBudW1iZXI7XHJcblx0LyoqIFRoZSBkYXRhIHRoYXQgd2FzIGNhY2hlZC4gKi9cclxuXHRkYXRhOiBUO1xyXG59XHJcblxyXG4vKiogU3RvcmFnZSB3cmFwcGVyIGZvciBwZXJzaXN0ZW50IGNhY2hpbmcgd2l0aCBJbmRleGVkREIvbG9jYWxTdG9yYWdlICovXHJcbmV4cG9ydCBjbGFzcyBMb2NhbFN0b3JhZ2VDYWNoZSB7XHJcblx0LyoqIE1haW4gc3RvcmFnZSBpbnN0YW5jZSAqL1xyXG5cdHB1YmxpYyBwZXJzaXN0ZXI6IExvY2FsRm9yYWdlO1xyXG5cdC8qKiBTdG9yYWdlIG5hbWVzcGFjZSBwcmVmaXggKi9cclxuXHRwcml2YXRlIHJlYWRvbmx5IGNhY2hlUHJlZml4ID0gXCJ0YXNrZ2VuaXVzL2NhY2hlL1wiO1xyXG5cdC8qKiBXaGV0aGVyIGluaXRpYWxpemF0aW9uIGlzIGNvbXBsZXRlICovXHJcblx0cHJpdmF0ZSBpbml0aWFsaXplZCA9IGZhbHNlO1xyXG5cdC8qKiBDdXJyZW50IHBsdWdpbiB2ZXJzaW9uIGZvciBjYWNoZSBpbnZhbGlkYXRpb24gKi9cclxuXHRwcml2YXRlIGN1cnJlbnRWZXJzaW9uOiBzdHJpbmcgPSBcInVua25vd25cIjtcclxuXHJcblx0LyoqXHJcblx0ICogQ3JlYXRlIGEgbmV3IGxvY2FsIHN0b3JhZ2UgY2FjaGVcclxuXHQgKiBAcGFyYW0gYXBwSWQgVGhlIGFwcGxpY2F0aW9uIElEIGZvciB0aGUgY2FjaGUgbmFtZXNwYWNlXHJcblx0ICogQHBhcmFtIHZlcnNpb24gQ3VycmVudCBwbHVnaW4gdmVyc2lvbiBmb3IgY2FjaGUgaW52YWxpZGF0aW9uXHJcblx0ICovXHJcblx0Y29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IGFwcElkOiBzdHJpbmcsIHZlcnNpb24/OiBzdHJpbmcpIHtcclxuXHRcdHRoaXMuY3VycmVudFZlcnNpb24gPSB2ZXJzaW9uIHx8IFwidW5rbm93blwiO1xyXG5cdFx0dGhpcy5wZXJzaXN0ZXIgPSBsb2NhbGZvcmFnZS5jcmVhdGVJbnN0YW5jZSh7XHJcblx0XHRcdG5hbWU6IHRoaXMuY2FjaGVQcmVmaXggKyB0aGlzLmFwcElkLFxyXG5cdFx0XHRkcml2ZXI6IFtsb2NhbGZvcmFnZS5JTkRFWEVEREJdLFxyXG5cdFx0XHRkZXNjcmlwdGlvbjogXCJUYXNrR2VuaXVzIG1ldGFkYXRhIGNhY2hlIGZvciBmaWxlcyBhbmQgdGFza3NcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEF0dGVtcHQgaW5pdGlhbCBzZXR1cFxyXG5cdFx0dGhpcy5pbml0aWFsaXplKCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBJbml0aWFsaXplIHRoZSBzdG9yYWdlIGJhY2tlbmQgYW5kIHZlcmlmeSBpdCdzIHdvcmtpbmdcclxuXHQgKi9cclxuXHRwcml2YXRlIGFzeW5jIGluaXRpYWxpemUoKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBUZXN0IHdyaXRlL3JlYWRcclxuXHRcdFx0YXdhaXQgdGhpcy5wZXJzaXN0ZXIuc2V0SXRlbShgJHt0aGlzLmFwcElkfTpfX3Rlc3RfX2AsIHRydWUpO1xyXG5cdFx0XHRhd2FpdCB0aGlzLnBlcnNpc3Rlci5yZW1vdmVJdGVtKGAke3RoaXMuYXBwSWR9Ol9fdGVzdF9fYCk7XHJcblx0XHRcdHRoaXMuaW5pdGlhbGl6ZWQgPSB0cnVlO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcclxuXHRcdFx0XHRcIkZhaWxlZCB0byBpbml0aWFsaXplIEluZGV4ZWREQiBjYWNoZSwgZmFsbGluZyBiYWNrIHRvIGxvY2FsU3RvcmFnZTpcIixcclxuXHRcdFx0XHRlcnJvclxyXG5cdFx0XHQpO1xyXG5cdFx0XHR0aGlzLnBlcnNpc3RlciA9IGxvY2FsZm9yYWdlLmNyZWF0ZUluc3RhbmNlKHtcclxuXHRcdFx0XHRuYW1lOiB0aGlzLmNhY2hlUHJlZml4ICsgdGhpcy5hcHBJZCxcclxuXHRcdFx0XHRkcml2ZXI6IFtsb2NhbGZvcmFnZS5MT0NBTFNUT1JBR0VdLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBcIlRhc2tHZW5pdXMgbWV0YWRhdGEgZmFsbGJhY2sgY2FjaGVcIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdHRoaXMuaW5pdGlhbGl6ZWQgPSB0cnVlO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRHJvcCBhbmQgcmVjcmVhdGUgdGhlIHN0b3JhZ2UgaW5zdGFuY2VcclxuXHQgKi9cclxuXHRwdWJsaWMgYXN5bmMgcmVjcmVhdGUoKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRhd2FpdCBsb2NhbGZvcmFnZS5kcm9wSW5zdGFuY2Uoe1xyXG5cdFx0XHRcdG5hbWU6IHRoaXMuY2FjaGVQcmVmaXggKyB0aGlzLmFwcElkLFxyXG5cdFx0XHR9KTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFcnJvciBkcm9wcGluZyBzdG9yYWdlIGluc3RhbmNlOlwiLCBlcnJvcik7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5wZXJzaXN0ZXIgPSBsb2NhbGZvcmFnZS5jcmVhdGVJbnN0YW5jZSh7XHJcblx0XHRcdG5hbWU6IHRoaXMuY2FjaGVQcmVmaXggKyB0aGlzLmFwcElkLFxyXG5cdFx0XHRkcml2ZXI6IFtsb2NhbGZvcmFnZS5JTkRFWEVEREJdLFxyXG5cdFx0XHRkZXNjcmlwdGlvbjogXCJUYXNrR2VuaXVzIG1ldGFkYXRhIGNhY2hlIGZvciBmaWxlcyBhbmQgdGFza3NcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuaW5pdGlhbGl6ZWQgPSBmYWxzZTtcclxuXHRcdGF3YWl0IHRoaXMuaW5pdGlhbGl6ZSgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTG9hZCBtZXRhZGF0YSBmb3IgYSBmaWxlIGZyb20gY2FjaGVcclxuXHQgKiBAcGFyYW0gcGF0aCBGaWxlIHBhdGggdG8gbG9hZFxyXG5cdCAqIEByZXR1cm5zIENhY2hlZCBkYXRhIG9yIG51bGwgaWYgbm90IGZvdW5kXHJcblx0ICovXHJcblx0cHVibGljIGFzeW5jIGxvYWRGaWxlPFQgPSBhbnk+KHBhdGg6IHN0cmluZyk6IFByb21pc2U8Q2FjaGVkPFQ+IHwgbnVsbD4ge1xyXG5cdFx0aWYgKCF0aGlzLmluaXRpYWxpemVkKSBhd2FpdCB0aGlzLmluaXRpYWxpemUoKTtcclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBrZXkgPSB0aGlzLmZpbGVLZXkocGF0aCk7XHJcblx0XHRcdGNvbnN0IGRhdGEgPSBhd2FpdCB0aGlzLnBlcnNpc3Rlci5nZXRJdGVtPENhY2hlZDxUPj4oa2V5KTtcclxuXHRcdFx0cmV0dXJuIGRhdGE7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKGBFcnJvciBsb2FkaW5nIGNhY2hlIGZvciAke3BhdGh9OmAsIGVycm9yKTtcclxuXHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTdG9yZSBtZXRhZGF0YSBmb3IgYSBmaWxlIGluIGNhY2hlXHJcblx0ICogQHBhcmFtIHBhdGggRmlsZSBwYXRoIHRvIHN0b3JlXHJcblx0ICogQHBhcmFtIGRhdGEgRGF0YSB0byBjYWNoZVxyXG5cdCAqL1xyXG5cdHB1YmxpYyBhc3luYyBzdG9yZUZpbGU8VCA9IGFueT4ocGF0aDogc3RyaW5nLCBkYXRhOiBUKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRpZiAoIXRoaXMuaW5pdGlhbGl6ZWQpIGF3YWl0IHRoaXMuaW5pdGlhbGl6ZSgpO1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IGtleSA9IHRoaXMuZmlsZUtleShwYXRoKTtcclxuXHRcdFx0YXdhaXQgdGhpcy5wZXJzaXN0ZXIuc2V0SXRlbShrZXksIHtcclxuXHRcdFx0XHR2ZXJzaW9uOiB0aGlzLmN1cnJlbnRWZXJzaW9uLFxyXG5cdFx0XHRcdHRpbWU6IERhdGUubm93KCksXHJcblx0XHRcdFx0ZGF0YSxcclxuXHRcdFx0fSBhcyBDYWNoZWQ8VD4pO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihgRXJyb3Igc3RvcmluZyBjYWNoZSBmb3IgJHtwYXRofTpgLCBlcnJvcik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW1vdmUgc3RhbGUgZmlsZSBlbnRyaWVzIGZyb20gY2FjaGVcclxuXHQgKiBAcGFyYW0gZXhpc3RpbmcgU2V0IG9mIHBhdGhzIHRoYXQgc2hvdWxkIHJlbWFpbiBpbiBjYWNoZVxyXG5cdCAqIEByZXR1cm5zIFNldCBvZiByZW1vdmVkIHBhdGhzXHJcblx0ICovXHJcblx0cHVibGljIGFzeW5jIHN5bmNocm9uaXplKFxyXG5cdFx0ZXhpc3Rpbmc6IHN0cmluZ1tdIHwgU2V0PHN0cmluZz5cclxuXHQpOiBQcm9taXNlPFNldDxzdHJpbmc+PiB7XHJcblx0XHRpZiAoIXRoaXMuaW5pdGlhbGl6ZWQpIGF3YWl0IHRoaXMuaW5pdGlhbGl6ZSgpO1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IGV4aXN0aW5nUGF0aHMgPSBuZXcgU2V0KGV4aXN0aW5nKTtcclxuXHRcdFx0Y29uc3QgY2FjaGVkRmlsZXMgPSBhd2FpdCB0aGlzLmFsbEZpbGVzKCk7XHJcblx0XHRcdGNvbnN0IHN0YWxlRmlsZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuXHJcblx0XHRcdGZvciAoY29uc3QgZmlsZSBvZiBjYWNoZWRGaWxlcykge1xyXG5cdFx0XHRcdGlmICghZXhpc3RpbmdQYXRocy5oYXMoZmlsZSkpIHtcclxuXHRcdFx0XHRcdHN0YWxlRmlsZXMuYWRkKGZpbGUpO1xyXG5cdFx0XHRcdFx0YXdhaXQgdGhpcy5wZXJzaXN0ZXIucmVtb3ZlSXRlbSh0aGlzLmZpbGVLZXkoZmlsZSkpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHN0YWxlRmlsZXM7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRXJyb3Igc3luY2hyb25pemluZyBjYWNoZTpcIiwgZXJyb3IpO1xyXG5cdFx0XHRyZXR1cm4gbmV3IFNldCgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGFsbCBrZXlzIGluIHRoZSBjYWNoZVxyXG5cdCAqL1xyXG5cdHB1YmxpYyBhc3luYyBhbGxLZXlzKCk6IFByb21pc2U8c3RyaW5nW10+IHtcclxuXHRcdGlmICghdGhpcy5pbml0aWFsaXplZCkgYXdhaXQgdGhpcy5pbml0aWFsaXplKCk7XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3Qga2V5cyA9IGF3YWl0IHRoaXMucGVyc2lzdGVyLmtleXMoKTtcclxuXHRcdFx0cmV0dXJuIGtleXMuZmlsdGVyKChrZXkpID0+IGtleS5zdGFydHNXaXRoKGAke3RoaXMuYXBwSWR9OmApKTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFcnJvciBnZXR0aW5nIGNhY2hlIGtleXM6XCIsIGVycm9yKTtcclxuXHRcdFx0cmV0dXJuIFtdO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGFsbCBmaWxlIHBhdGhzIHN0b3JlZCBpbiBjYWNoZVxyXG5cdCAqL1xyXG5cdHB1YmxpYyBhc3luYyBhbGxGaWxlcygpOiBQcm9taXNlPHN0cmluZ1tdPiB7XHJcblx0XHRjb25zdCBmaWxlUHJlZml4ID0gYCR7dGhpcy5hcHBJZH06ZmlsZTpgO1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IGtleXMgPSBhd2FpdCB0aGlzLmFsbEtleXMoKTtcclxuXHRcdFx0cmV0dXJuIGtleXNcclxuXHRcdFx0XHQuZmlsdGVyKChrZXkpID0+IGtleS5zdGFydHNXaXRoKGZpbGVQcmVmaXgpKVxyXG5cdFx0XHRcdC5tYXAoKGtleSkgPT4ga2V5LnN1YnN0cmluZyhmaWxlUHJlZml4Lmxlbmd0aCkpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIGdldHRpbmcgY2FjaGVkIGZpbGVzOlwiLCBlcnJvcik7XHJcblx0XHRcdHJldHVybiBbXTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBzdG9yYWdlIGtleSBmb3IgYSBmaWxlIHBhdGhcclxuXHQgKi9cclxuXHRwdWJsaWMgZmlsZUtleShwYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIGAke3RoaXMuYXBwSWR9OmZpbGU6JHtwYXRofWA7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDaGVjayBpZiBhIGZpbGUgZXhpc3RzIGluIGNhY2hlXHJcblx0ICovXHJcblx0cHVibGljIGFzeW5jIGhhc0ZpbGUocGF0aDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XHJcblx0XHRpZiAoIXRoaXMuaW5pdGlhbGl6ZWQpIGF3YWl0IHRoaXMuaW5pdGlhbGl6ZSgpO1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdHJldHVybiAoYXdhaXQgdGhpcy5wZXJzaXN0ZXIuZ2V0SXRlbSh0aGlzLmZpbGVLZXkocGF0aCkpKSAhPT0gbnVsbDtcclxuXHRcdH0gY2F0Y2gge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW1vdmUgYSBmaWxlIGZyb20gY2FjaGVcclxuXHQgKi9cclxuXHRwdWJsaWMgYXN5bmMgcmVtb3ZlRmlsZShwYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGlmICghdGhpcy5pbml0aWFsaXplZCkgYXdhaXQgdGhpcy5pbml0aWFsaXplKCk7XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0YXdhaXQgdGhpcy5wZXJzaXN0ZXIucmVtb3ZlSXRlbSh0aGlzLmZpbGVLZXkocGF0aCkpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihgRXJyb3IgcmVtb3ZpbmcgY2FjaGUgZm9yICR7cGF0aH06YCwgZXJyb3IpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGNhY2hlIHN0YXRpc3RpY3NcclxuXHQgKi9cclxuXHRwdWJsaWMgYXN5bmMgZ2V0U3RhdHMoKTogUHJvbWlzZTx7XHJcblx0XHR0b3RhbEZpbGVzOiBudW1iZXI7XHJcblx0XHRjYWNoZVNpemU6IG51bWJlcjtcclxuXHR9PiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBmaWxlcyA9IGF3YWl0IHRoaXMuYWxsRmlsZXMoKTtcclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHR0b3RhbEZpbGVzOiBmaWxlcy5sZW5ndGgsXHJcblx0XHRcdFx0Y2FjaGVTaXplOiBmaWxlcy5sZW5ndGgsXHJcblx0XHRcdH07XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRXJyb3IgZ2V0dGluZyBjYWNoZSBzdGF0czpcIiwgZXJyb3IpO1xyXG5cdFx0XHRyZXR1cm4geyB0b3RhbEZpbGVzOiAwLCBjYWNoZVNpemU6IDAgfTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsZWFyIGFsbCBlbnRyaWVzIGZyb20gdGhlIGNhY2hlXHJcblx0ICovXHJcblx0cHVibGljIGFzeW5jIGNsZWFyKCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0aWYgKCF0aGlzLmluaXRpYWxpemVkKSBhd2FpdCB0aGlzLmluaXRpYWxpemUoKTtcclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBrZXlzID0gYXdhaXQgdGhpcy5hbGxLZXlzKCk7XHJcblx0XHRcdGZvciAoY29uc3Qga2V5IG9mIGtleXMpIHtcclxuXHRcdFx0XHRhd2FpdCB0aGlzLnBlcnNpc3Rlci5yZW1vdmVJdGVtKGtleSk7XHJcblx0XHRcdH1cclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFcnJvciBjbGVhcmluZyBjYWNoZTpcIiwgZXJyb3IpO1xyXG5cclxuXHRcdFx0Ly8gRmFsbGJhY2sgaWYgY2xlYXIgZmFpbHM6IHRyeSB0byByZWNyZWF0ZSB0aGUgc3RvcmFnZVxyXG5cdFx0XHRhd2FpdCB0aGlzLnJlY3JlYXRlKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTdG9yZSBhIGNvbnNvbGlkYXRlZCBjYWNoZSBvZiBhbGwgdGFza3MgZm9yIGZhc3RlciBsb2FkaW5nXHJcblx0ICogQHBhcmFtIHRhc2tzIEEgVGFza0NhY2hlIG9iamVjdCBjb250YWluaW5nIGFsbCB0YXNrIGRhdGFcclxuXHQgKi9cclxuXHRwdWJsaWMgYXN5bmMgc3RvcmVDb25zb2xpZGF0ZWRDYWNoZTxUID0gYW55PihcclxuXHRcdGtleTogc3RyaW5nLFxyXG5cdFx0ZGF0YTogVFxyXG5cdCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0aWYgKCF0aGlzLmluaXRpYWxpemVkKSBhd2FpdCB0aGlzLmluaXRpYWxpemUoKTtcclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBjYWNoZUtleSA9IGAke3RoaXMuYXBwSWR9OmNvbnNvbGlkYXRlZDoke2tleX1gO1xyXG5cdFx0XHRhd2FpdCB0aGlzLnBlcnNpc3Rlci5zZXRJdGVtKGNhY2hlS2V5LCB7XHJcblx0XHRcdFx0dmVyc2lvbjogdGhpcy5jdXJyZW50VmVyc2lvbixcclxuXHRcdFx0XHR0aW1lOiBEYXRlLm5vdygpLFxyXG5cdFx0XHRcdGRhdGEsXHJcblx0XHRcdH0gYXMgQ2FjaGVkPFQ+KTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXHJcblx0XHRcdFx0YEVycm9yIHN0b3JpbmcgY29uc29saWRhdGVkIGNhY2hlIGZvciAke2tleX06YCxcclxuXHRcdFx0XHRlcnJvclxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTG9hZCB0aGUgY29uc29saWRhdGVkIHRhc2tzIGNhY2hlXHJcblx0ICogQHJldHVybnMgVGhlIGNhY2hlZCBUYXNrQ2FjaGUgb2JqZWN0IG9yIG51bGwgaWYgbm90IGZvdW5kXHJcblx0ICovXHJcblx0cHVibGljIGFzeW5jIGxvYWRDb25zb2xpZGF0ZWRDYWNoZTxUID0gYW55PihcclxuXHRcdGtleTogc3RyaW5nXHJcblx0KTogUHJvbWlzZTxDYWNoZWQ8VD4gfCBudWxsPiB7XHJcblx0XHRpZiAoIXRoaXMuaW5pdGlhbGl6ZWQpIGF3YWl0IHRoaXMuaW5pdGlhbGl6ZSgpO1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IGNhY2hlS2V5ID0gYCR7dGhpcy5hcHBJZH06Y29uc29saWRhdGVkOiR7a2V5fWA7XHJcblx0XHRcdGNvbnN0IGRhdGEgPSBhd2FpdCB0aGlzLnBlcnNpc3Rlci5nZXRJdGVtPENhY2hlZDxUPj4oY2FjaGVLZXkpO1xyXG5cdFx0XHRyZXR1cm4gZGF0YTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXHJcblx0XHRcdFx0YEVycm9yIGxvYWRpbmcgY29uc29saWRhdGVkIGNhY2hlIGZvciAke2tleX06YCxcclxuXHRcdFx0XHRlcnJvclxyXG5cdFx0XHQpO1xyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBhbGwgY2FjaGVkIGZpbGVzIHdpdGggdGhlaXIgZGF0YVxyXG5cdCAqIEByZXR1cm5zIE9iamVjdCB3aXRoIGZpbGUgcGF0aHMgYXMga2V5cyBhbmQgY2FjaGVkIGRhdGEgYXMgdmFsdWVzXHJcblx0ICovXHJcblx0cHVibGljIGFzeW5jIGdldEFsbDxUID0gYW55PigpOiBQcm9taXNlPFJlY29yZDxzdHJpbmcsIENhY2hlZDxUPiB8IG51bGw+PiB7XHJcblx0XHRpZiAoIXRoaXMuaW5pdGlhbGl6ZWQpIGF3YWl0IHRoaXMuaW5pdGlhbGl6ZSgpO1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IGZpbGVzID0gYXdhaXQgdGhpcy5hbGxGaWxlcygpO1xyXG5cdFx0XHRjb25zdCByZXN1bHQ6IFJlY29yZDxzdHJpbmcsIENhY2hlZDxUPiB8IG51bGw+ID0ge307XHJcblxyXG5cdFx0XHRmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcclxuXHRcdFx0XHRyZXN1bHRbZmlsZV0gPSBhd2FpdCB0aGlzLmxvYWRGaWxlPFQ+KGZpbGUpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIGdldHRpbmcgYWxsIGNhY2hlZCBmaWxlczpcIiwgZXJyb3IpO1xyXG5cdFx0XHRyZXR1cm4ge307XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgdGhlIGN1cnJlbnQgdmVyc2lvbiBmb3IgY2FjaGUgaW52YWxpZGF0aW9uXHJcblx0ICogQHBhcmFtIHZlcnNpb24gTmV3IHZlcnNpb24gc3RyaW5nXHJcblx0ICovXHJcblx0cHVibGljIHNldFZlcnNpb24odmVyc2lvbjogc3RyaW5nKTogdm9pZCB7XHJcblx0XHR0aGlzLmN1cnJlbnRWZXJzaW9uID0gdmVyc2lvbjtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0aGUgY3VycmVudCB2ZXJzaW9uIGJlaW5nIHVzZWQgZm9yIGNhY2hpbmdcclxuXHQgKi9cclxuXHRwdWJsaWMgZ2V0VmVyc2lvbigpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIHRoaXMuY3VycmVudFZlcnNpb247XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDaGVjayBpZiBjYWNoZWQgZGF0YSBpcyBjb21wYXRpYmxlIHdpdGggY3VycmVudCB2ZXJzaW9uXHJcblx0ICogQHBhcmFtIGNhY2hlZCBDYWNoZWQgZGF0YSB0byBjaGVja1xyXG5cdCAqIEBwYXJhbSBzdHJpY3RWZXJzaW9uQ2hlY2sgV2hldGhlciB0byByZXF1aXJlIGV4YWN0IHZlcnNpb24gbWF0Y2hcclxuXHQgKi9cclxuXHRwdWJsaWMgaXNWZXJzaW9uQ29tcGF0aWJsZTxUPihcclxuXHRcdGNhY2hlZDogQ2FjaGVkPFQ+LFxyXG5cdFx0c3RyaWN0VmVyc2lvbkNoZWNrOiBib29sZWFuID0gZmFsc2VcclxuXHQpOiBib29sZWFuIHtcclxuXHRcdGlmICghY2FjaGVkLnZlcnNpb24pIHtcclxuXHRcdFx0Ly8gT2xkIGNhY2hlIGZvcm1hdCB3aXRob3V0IHZlcnNpb24gLSBjb25zaWRlciBpbmNvbXBhdGlibGVcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChzdHJpY3RWZXJzaW9uQ2hlY2spIHtcclxuXHRcdFx0cmV0dXJuIGNhY2hlZC52ZXJzaW9uID09PSB0aGlzLmN1cnJlbnRWZXJzaW9uO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEZvciBub24tc3RyaWN0IGNoZWNraW5nLCB3ZSBjb3VsZCBpbXBsZW1lbnQgbW9yZSBzb3BoaXN0aWNhdGVkIGxvZ2ljXHJcblx0XHQvLyBGb3Igbm93LCB0cmVhdCBhbnkgdmVyc2lvbiBtaXNtYXRjaCBhcyBpbmNvbXBhdGlibGUgdG8gYmUgc2FmZVxyXG5cdFx0cmV0dXJuIGNhY2hlZC52ZXJzaW9uID09PSB0aGlzLmN1cnJlbnRWZXJzaW9uO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2xlYXIgYWxsIGNhY2hlIGVudHJpZXMgdGhhdCBhcmUgaW5jb21wYXRpYmxlIHdpdGggY3VycmVudCB2ZXJzaW9uXHJcblx0ICovXHJcblx0cHVibGljIGFzeW5jIGNsZWFySW5jb21wYXRpYmxlQ2FjaGUoKTogUHJvbWlzZTxudW1iZXI+IHtcclxuXHRcdGlmICghdGhpcy5pbml0aWFsaXplZCkgYXdhaXQgdGhpcy5pbml0aWFsaXplKCk7XHJcblxyXG5cdFx0bGV0IGNsZWFyZWRDb3VudCA9IDA7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBrZXlzID0gYXdhaXQgdGhpcy5hbGxLZXlzKCk7XHJcblxyXG5cdFx0XHRmb3IgKGNvbnN0IGtleSBvZiBrZXlzKSB7XHJcblx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdGNvbnN0IGRhdGEgPSBhd2FpdCB0aGlzLnBlcnNpc3Rlci5nZXRJdGVtPENhY2hlZDxhbnk+PihrZXkpO1xyXG5cdFx0XHRcdFx0aWYgKGRhdGEgJiYgIXRoaXMuaXNWZXJzaW9uQ29tcGF0aWJsZShkYXRhKSkge1xyXG5cdFx0XHRcdFx0XHRhd2FpdCB0aGlzLnBlcnNpc3Rlci5yZW1vdmVJdGVtKGtleSk7XHJcblx0XHRcdFx0XHRcdGNsZWFyZWRDb3VudCsrO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0XHQvLyBJZiB3ZSBjYW4ndCByZWFkIHRoZSBkYXRhLCByZW1vdmUgaXRcclxuXHRcdFx0XHRcdGF3YWl0IHRoaXMucGVyc2lzdGVyLnJlbW92ZUl0ZW0oa2V5KTtcclxuXHRcdFx0XHRcdGNsZWFyZWRDb3VudCsrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIGNsZWFyaW5nIGluY29tcGF0aWJsZSBjYWNoZTpcIiwgZXJyb3IpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBjbGVhcmVkQ291bnQ7XHJcblx0fVxyXG59XHJcbiJdfQ==