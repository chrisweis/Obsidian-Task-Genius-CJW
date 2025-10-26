/**
 * Settings Migration Manager
 *
 * Integrates with the main plugin to handle automatic migration of duplicate
 * settings when the plugin loads or settings are updated.
 */
import { __awaiter } from "tslib";
import { Notice } from "obsidian";
import { runAllMigrations, hasSettingsDuplicates } from "./SettingsMigration";
import { t } from "../translations/helper";
export class SettingsMigrationManager {
    constructor(plugin) {
        this.migrationCompleted = false;
        this.plugin = plugin;
    }
    /**
     * Check and run migrations when plugin loads
     */
    onPluginLoad() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (hasSettingsDuplicates(this.plugin.settings)) {
                    yield this.runMigrationWithUserConsent();
                }
            }
            catch (error) {
                console.error("Settings migration failed:", error);
                new Notice(t("Settings migration failed. Please check console for details."));
            }
        });
    }
    /**
     * Check for duplicates before saving settings
     */
    onBeforeSave() {
        return __awaiter(this, void 0, void 0, function* () {
            // If migration was already completed this session, don't run again
            if (this.migrationCompleted) {
                return true;
            }
            // Check if we need to migrate
            if (hasSettingsDuplicates(this.plugin.settings)) {
                const result = yield this.runSilentMigration();
                return result.migrated;
            }
            return true;
        });
    }
    /**
     * Run migration with user notification
     */
    runMigrationWithUserConsent() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = runAllMigrations(this.plugin.settings);
            if (result.migrated) {
                this.migrationCompleted = true;
                yield this.plugin.saveSettings();
                // Show user-friendly notice
                new Notice(t("Task Genius: Settings have been automatically migrated to remove duplicates. ") +
                    t("FileSource is now the unified system for file-based task recognition."), 10000);
                // Log details for advanced users
                console.log("Task Genius Settings Migration:", {
                    details: result.details,
                    warnings: result.warnings
                });
            }
            // Show warnings if any
            if (result.warnings.length > 0) {
                console.warn("Task Genius Migration Warnings:", result.warnings);
            }
        });
    }
    /**
     * Run migration silently without user notification
     */
    runSilentMigration() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = runAllMigrations(this.plugin.settings);
            if (result.migrated) {
                this.migrationCompleted = true;
                // Settings will be saved by the calling function
                console.log("Task Genius: Silent settings migration completed", result.details);
            }
            return result;
        });
    }
    /**
     * Force migration (for manual execution)
     */
    forceMigration() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = runAllMigrations(this.plugin.settings);
            if (result.migrated) {
                this.migrationCompleted = true;
                yield this.plugin.saveSettings();
                new Notice(t("Settings migration completed: ") + result.details.length + t(" changes applied"), 5000);
            }
            else {
                new Notice(t("No settings migration needed"), 3000);
            }
            return result;
        });
    }
    /**
     * Check if user has conflicting settings
     */
    hasConflicts() {
        return hasSettingsDuplicates(this.plugin.settings);
    }
    /**
     * Get migration status for display in settings
     */
    getMigrationStatus() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const needsMigration = hasSettingsDuplicates(this.plugin.settings);
        // Count conflicts
        let conflictCount = 0;
        const settings = this.plugin.settings;
        if (((_a = settings.fileParsingConfig) === null || _a === void 0 ? void 0 : _a.enableFileMetadataParsing) && !((_b = settings.fileSource) === null || _b === void 0 ? void 0 : _b.enabled)) {
            conflictCount++;
        }
        if (((_c = settings.fileParsingConfig) === null || _c === void 0 ? void 0 : _c.enableTagBasedTaskParsing) && !((_f = (_e = (_d = settings.fileSource) === null || _d === void 0 ? void 0 : _d.recognitionStrategies) === null || _e === void 0 ? void 0 : _e.tags) === null || _f === void 0 ? void 0 : _f.enabled)) {
            conflictCount++;
        }
        if (((_g = settings.fileParsingConfig) === null || _g === void 0 ? void 0 : _g.enableWorkerProcessing) !== ((_j = (_h = settings.fileSource) === null || _h === void 0 ? void 0 : _h.performance) === null || _j === void 0 ? void 0 : _j.enableWorkerProcessing)) {
            conflictCount++;
        }
        return {
            needsMigration,
            completedThisSession: this.migrationCompleted,
            conflictCount
        };
    }
    /**
     * Reset migration state (for testing)
     */
    resetMigrationState() {
        this.migrationCompleted = false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2V0dGluZ3NNaWdyYXRpb25NYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiU2V0dGluZ3NNaWdyYXRpb25NYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7OztHQUtHOztBQUVILE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFFbEMsT0FBTyxFQUNMLGdCQUFnQixFQUNoQixxQkFBcUIsRUFFdEIsTUFBTSxxQkFBcUIsQ0FBQztBQUM3QixPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFFM0MsTUFBTSxPQUFPLHdCQUF3QjtJQUluQyxZQUFZLE1BQTZCO1FBRmpDLHVCQUFrQixHQUFHLEtBQUssQ0FBQztRQUdqQyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUN2QixDQUFDO0lBRUQ7O09BRUc7SUFDRyxZQUFZOztZQUNoQixJQUFJO2dCQUNGLElBQUkscUJBQXFCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRTtvQkFDL0MsTUFBTSxJQUFJLENBQUMsMkJBQTJCLEVBQUUsQ0FBQztpQkFDMUM7YUFDRjtZQUFDLE9BQU8sS0FBSyxFQUFFO2dCQUNkLE9BQU8sQ0FBQyxLQUFLLENBQUMsNEJBQTRCLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ25ELElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyw4REFBOEQsQ0FBQyxDQUFDLENBQUM7YUFDL0U7UUFDSCxDQUFDO0tBQUE7SUFFRDs7T0FFRztJQUNHLFlBQVk7O1lBQ2hCLG1FQUFtRTtZQUNuRSxJQUFJLElBQUksQ0FBQyxrQkFBa0IsRUFBRTtnQkFDM0IsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELDhCQUE4QjtZQUM5QixJQUFJLHFCQUFxQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQy9DLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFr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QzFGLGFBQWEsRUFBRSxDQUFDO1NBQ2pCO1FBQ0QsSUFBSSxDQUFBLE1BQUEsUUFBUSxDQUFDLGlCQUFpQiwwQ0FBRSx5QkFBeUIsS0FBSSxDQUFDLENBQUEsTUFBQSxNQUFBLE1BQUEsUUFBUSxDQUFDLFVBQVUsMENBQUUscUJBQXFCLDBDQUFFLElBQUksMENBQUUsT0FBTyxDQUFBLEVBQUU7WUFDdkgsYUFBYSxFQUFFLENBQUM7U0FDakI7UUFDRCxJQUFJLENBQUEsTUFBQSxRQUFRLENBQUMsaUJBQWlCLDBDQUFFLHNCQUFzQixPQUFLLE1BQUEsTUFBQSxRQUFRLENBQUMsVUFBVSwwQ0FBRSxXQUFXLDBDQUFFLHNCQUFzQixDQUFBLEVBQUU7WUFDbkgsYUFBYSxFQUFFLENBQUM7U0FDakI7UUFFRCxPQUFPO1lBQ0wsY0FBYztZQUNkLG9CQUFvQixFQUFFLElBQUksQ0FBQyxrQkFBa0I7WUFDN0MsYUFBYTtTQUNkLENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDSCxtQkFBbUI7UUFDakIsSUFBSSxDQUFDLGtCQUFrQixHQUFHLEtBQUssQ0FBQztJQUNsQyxDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogU2V0dGluZ3MgTWlncmF0aW9uIE1hbmFnZXJcclxuICogXHJcbiAqIEludGVncmF0ZXMgd2l0aCB0aGUgbWFpbiBwbHVnaW4gdG8gaGFuZGxlIGF1dG9tYXRpYyBtaWdyYXRpb24gb2YgZHVwbGljYXRlXHJcbiAqIHNldHRpbmdzIHdoZW4gdGhlIHBsdWdpbiBsb2FkcyBvciBzZXR0aW5ncyBhcmUgdXBkYXRlZC5cclxuICovXHJcblxyXG5pbXBvcnQgeyBOb3RpY2UgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHR5cGUgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCIuLi9pbmRleFwiO1xyXG5pbXBvcnQgeyBcclxuICBydW5BbGxNaWdyYXRpb25zLCBcclxuICBoYXNTZXR0aW5nc0R1cGxpY2F0ZXMsIFxyXG4gIHR5cGUgTWlncmF0aW9uUmVzdWx0IFxyXG59IGZyb20gXCIuL1NldHRpbmdzTWlncmF0aW9uXCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiLi4vdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFNldHRpbmdzTWlncmF0aW9uTWFuYWdlciB7XHJcbiAgcHJpdmF0ZSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbjtcclxuICBwcml2YXRlIG1pZ3JhdGlvbkNvbXBsZXRlZCA9IGZhbHNlO1xyXG5cclxuICBjb25zdHJ1Y3RvcihwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbikge1xyXG4gICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVjayBhbmQgcnVuIG1pZ3JhdGlvbnMgd2hlbiBwbHVnaW4gbG9hZHNcclxuICAgKi9cclxuICBhc3luYyBvblBsdWdpbkxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBpZiAoaGFzU2V0dGluZ3NEdXBsaWNhdGVzKHRoaXMucGx1Z2luLnNldHRpbmdzKSkge1xyXG4gICAgICAgIGF3YWl0IHRoaXMucnVuTWlncmF0aW9uV2l0aFVzZXJDb25zZW50KCk7XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJTZXR0aW5ncyBtaWdyYXRpb24gZmFpbGVkOlwiLCBlcnJvcik7XHJcbiAgICAgIG5ldyBOb3RpY2UodChcIlNldHRpbmdzIG1pZ3JhdGlvbiBmYWlsZWQuIFBsZWFzZSBjaGVjayBjb25zb2xlIGZvciBkZXRhaWxzLlwiKSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVjayBmb3IgZHVwbGljYXRlcyBiZWZvcmUgc2F2aW5nIHNldHRpbmdzXHJcbiAgICovXHJcbiAgYXN5bmMgb25CZWZvcmVTYXZlKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgLy8gSWYgbWlncmF0aW9uIHdhcyBhbHJlYWR5IGNvbXBsZXRlZCB0aGlzIHNlc3Npb24sIGRvbid0IHJ1biBhZ2FpblxyXG4gICAgaWYgKHRoaXMubWlncmF0aW9uQ29tcGxldGVkKSB7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGlmIHdlIG5lZWQgdG8gbWlncmF0ZVxyXG4gICAgaWYgKGhhc1NldHRpbmdzRHVwbGljYXRlcyh0aGlzLnBsdWdpbi5zZXR0aW5ncykpIHtcclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5ydW5TaWxlbnRNaWdyYXRpb24oKTtcclxuICAgICAgcmV0dXJuIHJlc3VsdC5taWdyYXRlZDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJ1biBtaWdyYXRpb24gd2l0aCB1c2VyIG5vdGlmaWNhdGlvblxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgcnVuTWlncmF0aW9uV2l0aFVzZXJDb25zZW50KCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgY29uc3QgcmVzdWx0ID0gcnVuQWxsTWlncmF0aW9ucyh0aGlzLnBsdWdpbi5zZXR0aW5ncyk7XHJcbiAgICBcclxuICAgIGlmIChyZXN1bHQubWlncmF0ZWQpIHtcclxuICAgICAgdGhpcy5taWdyYXRpb25Db21wbGV0ZWQgPSB0cnVlO1xyXG4gICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgXHJcbiAgICAgIC8vIFNob3cgdXNlci1mcmllbmRseSBub3RpY2VcclxuICAgICAgbmV3IE5vdGljZShcclxuICAgICAgICB0KFwiVGFzayBHZW5pdXM6IFNldHRpbmdzIGhhdmUgYmVlbiBhdXRvbWF0aWNhbGx5IG1pZ3JhdGVkIHRvIHJlbW92ZSBkdXBsaWNhdGVzLiBcIikgK1xyXG4gICAgICAgIHQoXCJGaWxlU291cmNlIGlzIG5vdyB0aGUgdW5pZmllZCBzeXN0ZW0gZm9yIGZpbGUtYmFzZWQgdGFzayByZWNvZ25pdGlvbi5cIiksXHJcbiAgICAgICAgMTAwMDBcclxuICAgICAgKTtcclxuXHJcbiAgICAgIC8vIExvZyBkZXRhaWxzIGZvciBhZHZhbmNlZCB1c2Vyc1xyXG4gICAgICBjb25zb2xlLmxvZyhcIlRhc2sgR2VuaXVzIFNldHRpbmdzIE1pZ3JhdGlvbjpcIiwge1xyXG4gICAgICAgIGRldGFpbHM6IHJlc3VsdC5kZXRhaWxzLFxyXG4gICAgICAgIHdhcm5pbmdzOiByZXN1bHQud2FybmluZ3NcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gU2hvdyB3YXJuaW5ncyBpZiBhbnlcclxuICAgIGlmIChyZXN1bHQud2FybmluZ3MubGVuZ3RoID4gMCkge1xyXG4gICAgICBjb25zb2xlLndhcm4oXCJUYXNrIEdlbml1cyBNaWdyYXRpb24gV2FybmluZ3M6XCIsIHJlc3VsdC53YXJuaW5ncyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSdW4gbWlncmF0aW9uIHNpbGVudGx5IHdpdGhvdXQgdXNlciBub3RpZmljYXRpb25cclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIHJ1blNpbGVudE1pZ3JhdGlvbigpOiBQcm9taXNlPE1pZ3JhdGlvblJlc3VsdD4ge1xyXG4gICAgY29uc3QgcmVzdWx0ID0gcnVuQWxsTWlncmF0aW9ucyh0aGlzLnBsdWdpbi5zZXR0aW5ncyk7XHJcbiAgICBcclxuICAgIGlmIChyZXN1bHQubWlncmF0ZWQpIHtcclxuICAgICAgdGhpcy5taWdyYXRpb25Db21wbGV0ZWQgPSB0cnVlO1xyXG4gICAgICAvLyBTZXR0aW5ncyB3aWxsIGJlIHNhdmVkIGJ5IHRoZSBjYWxsaW5nIGZ1bmN0aW9uXHJcbiAgICAgIGNvbnNvbGUubG9nKFwiVGFzayBHZW5pdXM6IFNpbGVudCBzZXR0aW5ncyBtaWdyYXRpb24gY29tcGxldGVkXCIsIHJlc3VsdC5kZXRhaWxzKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRm9yY2UgbWlncmF0aW9uIChmb3IgbWFudWFsIGV4ZWN1dGlvbilcclxuICAgKi9cclxuICBhc3luYyBmb3JjZU1pZ3JhdGlvbigpOiBQcm9taXNlPE1pZ3JhdGlvblJlc3VsdD4ge1xyXG4gICAgY29uc3QgcmVzdWx0ID0gcnVuQWxsTWlncmF0aW9ucyh0aGlzLnBsdWdpbi5zZXR0aW5ncyk7XHJcbiAgICBcclxuICAgIGlmIChyZXN1bHQubWlncmF0ZWQpIHtcclxuICAgICAgdGhpcy5taWdyYXRpb25Db21wbGV0ZWQgPSB0cnVlO1xyXG4gICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgXHJcbiAgICAgIG5ldyBOb3RpY2UoXHJcbiAgICAgICAgdChcIlNldHRpbmdzIG1pZ3JhdGlvbiBjb21wbGV0ZWQ6IFwiKSArIHJlc3VsdC5kZXRhaWxzLmxlbmd0aCArIHQoXCIgY2hhbmdlcyBhcHBsaWVkXCIpLFxyXG4gICAgICAgIDUwMDBcclxuICAgICAgKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIG5ldyBOb3RpY2UodChcIk5vIHNldHRpbmdzIG1pZ3JhdGlvbiBuZWVkZWRcIiksIDMwMDApO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVjayBpZiB1c2VyIGhhcyBjb25mbGljdGluZyBzZXR0aW5nc1xyXG4gICAqL1xyXG4gIGhhc0NvbmZsaWN0cygpOiBib29sZWFuIHtcclxuICAgIHJldHVybiBoYXNTZXR0aW5nc0R1cGxpY2F0ZXModGhpcy5wbHVnaW4uc2V0dGluZ3MpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IG1pZ3JhdGlvbiBzdGF0dXMgZm9yIGRpc3BsYXkgaW4gc2V0dGluZ3NcclxuICAgKi9cclxuICBnZXRNaWdyYXRpb25TdGF0dXMoKToge1xyXG4gICAgbmVlZHNNaWdyYXRpb246IGJvb2xlYW47XHJcbiAgICBjb21wbGV0ZWRUaGlzU2Vzc2lvbjogYm9vbGVhbjtcclxuICAgIGNvbmZsaWN0Q291bnQ6IG51bWJlcjtcclxuICB9IHtcclxuICAgIGNvbnN0IG5lZWRzTWlncmF0aW9uID0gaGFzU2V0dGluZ3NEdXBsaWNhdGVzKHRoaXMucGx1Z2luLnNldHRpbmdzKTtcclxuICAgIFxyXG4gICAgLy8gQ291bnQgY29uZmxpY3RzXHJcbiAgICBsZXQgY29uZmxpY3RDb3VudCA9IDA7XHJcbiAgICBjb25zdCBzZXR0aW5ncyA9IHRoaXMucGx1Z2luLnNldHRpbmdzO1xyXG4gICAgXHJcbiAgICBpZiAoc2V0dGluZ3MuZmlsZVBhcnNpbmdDb25maWc/LmVuYWJsZUZpbGVNZXRhZGF0YVBhcnNpbmcgJiYgIXNldHRpbmdzLmZpbGVTb3VyY2U/LmVuYWJsZWQpIHtcclxuICAgICAgY29uZmxpY3RDb3VudCsrO1xyXG4gICAgfVxyXG4gICAgaWYgKHNldHRpbmdzLmZpbGVQYXJzaW5nQ29uZmlnPy5lbmFibGVUYWdCYXNlZFRhc2tQYXJzaW5nICYmICFzZXR0aW5ncy5maWxlU291cmNlPy5yZWNvZ25pdGlvblN0cmF0ZWdpZXM/LnRhZ3M/LmVuYWJsZWQpIHtcclxuICAgICAgY29uZmxpY3RDb3VudCsrO1xyXG4gICAgfVxyXG4gICAgaWYgKHNldHRpbmdzLmZpbGVQYXJzaW5nQ29uZmlnPy5lbmFibGVXb3JrZXJQcm9jZXNzaW5nICE9PSBzZXR0aW5ncy5maWxlU291cmNlPy5wZXJmb3JtYW5jZT8uZW5hYmxlV29ya2VyUHJvY2Vzc2luZykge1xyXG4gICAgICBjb25mbGljdENvdW50Kys7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgbmVlZHNNaWdyYXRpb24sXHJcbiAgICAgIGNvbXBsZXRlZFRoaXNTZXNzaW9uOiB0aGlzLm1pZ3JhdGlvbkNvbXBsZXRlZCxcclxuICAgICAgY29uZmxpY3RDb3VudFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlc2V0IG1pZ3JhdGlvbiBzdGF0ZSAoZm9yIHRlc3RpbmcpXHJcbiAgICovXHJcbiAgcmVzZXRNaWdyYXRpb25TdGF0ZSgpOiB2b2lkIHtcclxuICAgIHRoaXMubWlncmF0aW9uQ29tcGxldGVkID0gZmFsc2U7XHJcbiAgfVxyXG59Il19