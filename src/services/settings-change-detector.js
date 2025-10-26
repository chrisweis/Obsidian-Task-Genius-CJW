import { DEFAULT_SETTINGS } from "../common/setting-definition";
import { t } from "../translations/helper";
/**
 * Service to detect if user has made changes to plugin settings
 * Used to determine if onboarding should be offered
 */
export class SettingsChangeDetector {
    constructor(plugin) {
        this.plugin = plugin;
    }
    /**
     * Check if user has made significant changes to settings that would indicate
     * they have already configured the plugin
     */
    hasUserMadeChanges() {
        const current = this.plugin.settings;
        const defaults = DEFAULT_SETTINGS;
        // Check for significant configuration changes
        const significantChanges = [
            // Custom views added
            this.hasCustomViews(current),
            // Progress bar settings changed
            this.isProgressBarCustomized(current, defaults),
            // Task status settings changed
            this.isTaskStatusCustomized(current, defaults),
            // Quick capture configured differently
            this.isQuickCaptureCustomized(current, defaults),
            // Workflow settings changed
            this.isWorkflowCustomized(current, defaults),
            // Advanced features enabled
            this.areAdvancedFeaturesEnabled(current, defaults),
            // File parsing customized
            this.isFileParsingCustomized(current, defaults),
        ];
        return significantChanges.some(changed => changed);
    }
    /**
     * Get a summary of what changes the user has made
     */
    getChangesSummary() {
        var _a;
        const changes = [];
        const current = this.plugin.settings;
        const defaults = DEFAULT_SETTINGS;
        if (this.hasCustomViews(current)) {
            const customViewCount = ((_a = current.viewConfiguration) === null || _a === void 0 ? void 0 : _a.filter(v => v.type === 'custom').length) || 0;
            changes.push(t("Custom views created") + ` (${customViewCount})`);
        }
        if (this.isProgressBarCustomized(current, defaults)) {
            changes.push(t("Progress bar settings modified"));
        }
        if (this.isTaskStatusCustomized(current, defaults)) {
            changes.push(t("Task status settings configured"));
        }
        if (this.isQuickCaptureCustomized(current, defaults)) {
            changes.push(t("Quick capture configured"));
        }
        if (this.isWorkflowCustomized(current, defaults)) {
            changes.push(t("Workflow settings enabled"));
        }
        if (this.areAdvancedFeaturesEnabled(current, defaults)) {
            changes.push(t("Advanced features enabled"));
        }
        if (this.isFileParsingCustomized(current, defaults)) {
            changes.push(t("File parsing customized"));
        }
        return changes;
    }
    /**
     * Check if user has created custom views
     */
    hasCustomViews(settings) {
        var _a, _b;
        return (_b = (_a = settings.viewConfiguration) === null || _a === void 0 ? void 0 : _a.some(view => view.type === 'custom')) !== null && _b !== void 0 ? _b : false;
    }
    /**
     * Check if progress bar settings have been customized
     */
    isProgressBarCustomized(current, defaults) {
        return (current.progressBarDisplayMode !== defaults.progressBarDisplayMode ||
            current.displayMode !== defaults.displayMode ||
            current.showPercentage !== defaults.showPercentage ||
            current.customizeProgressRanges !== defaults.customizeProgressRanges ||
            current.allowCustomProgressGoal !== defaults.allowCustomProgressGoal ||
            current.hideProgressBarBasedOnConditions !== defaults.hideProgressBarBasedOnConditions);
    }
    /**
     * Check if task status settings have been customized
     */
    isTaskStatusCustomized(current, defaults) {
        return (current.enableTaskStatusSwitcher !== defaults.enableTaskStatusSwitcher ||
            current.enableCustomTaskMarks !== defaults.enableCustomTaskMarks ||
            current.enableCycleCompleteStatus !== defaults.enableCycleCompleteStatus);
    }
    /**
     * Check if quick capture has been customized
     */
    isQuickCaptureCustomized(current, defaults) {
        const currentQC = current.quickCapture || defaults.quickCapture;
        const defaultQC = defaults.quickCapture;
        return (currentQC.enableQuickCapture !== defaultQC.enableQuickCapture ||
            currentQC.enableMinimalMode !== defaultQC.enableMinimalMode);
    }
    /**
     * Check if workflow has been customized
     */
    isWorkflowCustomized(current, defaults) {
        const currentWF = current.workflow || defaults.workflow;
        const defaultWF = defaults.workflow;
        return (currentWF.enableWorkflow !== defaultWF.enableWorkflow ||
            currentWF.autoAddTimestamp !== defaultWF.autoAddTimestamp ||
            currentWF.calculateSpentTime !== defaultWF.calculateSpentTime);
    }
    /**
     * Check if advanced features are enabled
     */
    areAdvancedFeaturesEnabled(current, defaults) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        return (((_a = current.rewards) === null || _a === void 0 ? void 0 : _a.enableRewards) !== ((_b = defaults.rewards) === null || _b === void 0 ? void 0 : _b.enableRewards) ||
            ((_c = current.habit) === null || _c === void 0 ? void 0 : _c.enableHabits) !== ((_d = defaults.habit) === null || _d === void 0 ? void 0 : _d.enableHabits) ||
            ((_e = current.timelineSidebar) === null || _e === void 0 ? void 0 : _e.enableTimelineSidebar) !== ((_f = defaults.timelineSidebar) === null || _f === void 0 ? void 0 : _f.enableTimelineSidebar) ||
            ((_g = current.betaTest) === null || _g === void 0 ? void 0 : _g.enableBaseView) !== ((_h = defaults.betaTest) === null || _h === void 0 ? void 0 : _h.enableBaseView));
    }
    /**
     * Check if file parsing has been customized
     */
    isFileParsingCustomized(current, defaults) {
        const currentFP = current.fileParsingConfig || defaults.fileParsingConfig;
        const defaultFP = defaults.fileParsingConfig;
        return (currentFP.enableWorkerProcessing !== defaultFP.enableWorkerProcessing ||
            currentFP.enableFileMetadataParsing !== defaultFP.enableFileMetadataParsing ||
            currentFP.enableTagBasedTaskParsing !== defaultFP.enableTagBasedTaskParsing ||
            currentFP.enableMtimeOptimization !== defaultFP.enableMtimeOptimization);
    }
    /**
     * Create a settings snapshot for later comparison
     */
    createSettingsSnapshot() {
        var _a, _b, _c, _d, _e, _f;
        const snapshot = {
            customViewCount: ((_a = this.plugin.settings.viewConfiguration) === null || _a === void 0 ? void 0 : _a.filter(v => v.type === 'custom').length) || 0,
            progressBarMode: this.plugin.settings.progressBarDisplayMode,
            taskStatusEnabled: this.plugin.settings.enableTaskStatusSwitcher,
            quickCaptureEnabled: (_b = this.plugin.settings.quickCapture) === null || _b === void 0 ? void 0 : _b.enableQuickCapture,
            workflowEnabled: (_c = this.plugin.settings.workflow) === null || _c === void 0 ? void 0 : _c.enableWorkflow,
            rewardsEnabled: (_d = this.plugin.settings.rewards) === null || _d === void 0 ? void 0 : _d.enableRewards,
            habitsEnabled: (_e = this.plugin.settings.habit) === null || _e === void 0 ? void 0 : _e.enableHabits,
            workerProcessingEnabled: (_f = this.plugin.settings.fileParsingConfig) === null || _f === void 0 ? void 0 : _f.enableWorkerProcessing,
            timestamp: Date.now()
        };
        return JSON.stringify(snapshot);
    }
    /**
     * Compare current settings with a snapshot to detect changes
     */
    hasChangedSinceSnapshot(snapshot) {
        try {
            const oldSnapshot = JSON.parse(snapshot);
            const currentSnapshot = JSON.parse(this.createSettingsSnapshot());
            // Compare key fields (excluding timestamp)
            const fieldsToCompare = [
                'customViewCount', 'progressBarMode', 'taskStatusEnabled',
                'quickCaptureEnabled', 'workflowEnabled', 'rewardsEnabled',
                'habitsEnabled', 'workerProcessingEnabled'
            ];
            return fieldsToCompare.some(field => oldSnapshot[field] !== currentSnapshot[field]);
        }
        catch (error) {
            console.warn("Failed to compare settings snapshot:", error);
            return true; // Assume changes if we can't compare
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3MtY2hhbmdlLWRldGVjdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2V0dGluZ3MtY2hhbmdlLWRldGVjdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBMkIsZ0JBQWdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN6RixPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFFM0M7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLHNCQUFzQjtJQUdsQyxZQUFZLE1BQTZCO1FBQ3hDLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3RCLENBQUM7SUFFRDs7O09BR0c7SUFDSCxrQkFBa0I7UUFDakIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7UUFDckMsTUFBTSxRQUFRLEdBQUcsZ0JBQWdCLENBQUM7UUFFbEMsOENBQThDO1FBQzlDLE1BQU0sa0JBQWtCLEdBQUc7WUFDMUIscUJBQXFCO1lBQ3JCLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDO1lBRTVCLGdDQUFnQztZQUNoQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQztZQUUvQywrQkFBK0I7WUFDL0IsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUM7WUFFOUMsdUNBQXVDO1lBQ3ZDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDO1lBRWhELDRCQUE0QjtZQUM1QixJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQztZQUU1Qyw0QkFBNEI7WUFDNUIsSUFBSSxDQUFDLDBCQUEwQixDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUM7WUFFbEQsMEJBQTBCO1lBQzFCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDO1NBQy9DLENBQUM7UUFFRixPQUFPLGtC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QyxJQUFJLENBQUMsc0NBQXNDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDNUQsT0FBTyxJQUFJLENBQUMsQ0FBQyxxQ0FBcUM7U0FDbEQ7SUFDRixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgdHlwZSBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIi4uL2luZGV4XCI7XHJcbmltcG9ydCB7IFRhc2tQcm9ncmVzc0JhclNldHRpbmdzLCBERUZBVUxUX1NFVFRJTkdTIH0gZnJvbSBcIi4uL2NvbW1vbi9zZXR0aW5nLWRlZmluaXRpb25cIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCIuLi90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcblxyXG4vKipcclxuICogU2VydmljZSB0byBkZXRlY3QgaWYgdXNlciBoYXMgbWFkZSBjaGFuZ2VzIHRvIHBsdWdpbiBzZXR0aW5nc1xyXG4gKiBVc2VkIHRvIGRldGVybWluZSBpZiBvbmJvYXJkaW5nIHNob3VsZCBiZSBvZmZlcmVkXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgU2V0dGluZ3NDaGFuZ2VEZXRlY3RvciB7XHJcblx0cHJpdmF0ZSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbjtcclxuXHJcblx0Y29uc3RydWN0b3IocGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4pIHtcclxuXHRcdHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgdXNlciBoYXMgbWFkZSBzaWduaWZpY2FudCBjaGFuZ2VzIHRvIHNldHRpbmdzIHRoYXQgd291bGQgaW5kaWNhdGVcclxuXHQgKiB0aGV5IGhhdmUgYWxyZWFkeSBjb25maWd1cmVkIHRoZSBwbHVnaW5cclxuXHQgKi9cclxuXHRoYXNVc2VyTWFkZUNoYW5nZXMoKTogYm9vbGVhbiB7XHJcblx0XHRjb25zdCBjdXJyZW50ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3M7XHJcblx0XHRjb25zdCBkZWZhdWx0cyA9IERFRkFVTFRfU0VUVElOR1M7XHJcblxyXG5cdFx0Ly8gQ2hlY2sgZm9yIHNpZ25pZmljYW50IGNvbmZpZ3VyYXRpb24gY2hhbmdlc1xyXG5cdFx0Y29uc3Qgc2lnbmlmaWNhbnRDaGFuZ2VzID0gW1xyXG5cdFx0XHQvLyBDdXN0b20gdmlld3MgYWRkZWRcclxuXHRcdFx0dGhpcy5oYXNDdXN0b21WaWV3cyhjdXJyZW50KSxcclxuXHRcdFx0XHJcblx0XHRcdC8vIFByb2dyZXNzIGJhciBzZXR0aW5ncyBjaGFuZ2VkXHJcblx0XHRcdHRoaXMuaXNQcm9ncmVzc0JhckN1c3RvbWl6ZWQoY3VycmVudCwgZGVmYXVsdHMpLFxyXG5cdFx0XHRcclxuXHRcdFx0Ly8gVGFzayBzdGF0dXMgc2V0dGluZ3MgY2hhbmdlZFxyXG5cdFx0XHR0aGlzLmlzVGFza1N0YXR1c0N1c3RvbWl6ZWQoY3VycmVudCwgZGVmYXVsdHMpLFxyXG5cdFx0XHRcclxuXHRcdFx0Ly8gUXVpY2sgY2FwdHVyZSBjb25maWd1cmVkIGRpZmZlcmVudGx5XHJcblx0XHRcdHRoaXMuaXNRdWlja0NhcHR1cmVDdXN0b21pemVkKGN1cnJlbnQsIGRlZmF1bHRzKSxcclxuXHRcdFx0XHJcblx0XHRcdC8vIFdvcmtmbG93IHNldHRpbmdzIGNoYW5nZWRcclxuXHRcdFx0dGhpcy5pc1dvcmtmbG93Q3VzdG9taXplZChjdXJyZW50LCBkZWZhdWx0cyksXHJcblx0XHRcdFxyXG5cdFx0XHQvLyBBZHZhbmNlZCBmZWF0dXJlcyBlbmFibGVkXHJcblx0XHRcdHRoaXMuYXJlQWR2YW5jZWRGZWF0dXJlc0VuYWJsZWQoY3VycmVudCwgZGVmYXVsdHMpLFxyXG5cdFx0XHRcclxuXHRcdFx0Ly8gRmlsZSBwYXJzaW5nIGN1c3RvbWl6ZWRcclxuXHRcdFx0dGhpcy5pc0ZpbGVQYXJzaW5nQ3VzdG9taXplZChjdXJyZW50LCBkZWZhdWx0cyksXHJcblx0XHRdO1xyXG5cclxuXHRcdHJldHVybiBzaWduaWZpY2FudENoYW5nZXMuc29tZShjaGFuZ2VkID0+IGNoYW5nZWQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGEgc3VtbWFyeSBvZiB3aGF0IGNoYW5nZXMgdGhlIHVzZXIgaGFzIG1hZGVcclxuXHQgKi9cclxuXHRnZXRDaGFuZ2VzU3VtbWFyeSgpOiBzdHJpbmdbXSB7XHJcblx0XHRjb25zdCBjaGFuZ2VzOiBzdHJpbmdbXSA9IFtdO1xyXG5cdFx0Y29uc3QgY3VycmVudCA9IHRoaXMucGx1Z2luLnNldHRpbmdzO1xyXG5cdFx0Y29uc3QgZGVmYXVsdHMgPSBERUZBVUxUX1NFVFRJTkdTO1xyXG5cclxuXHRcdGlmICh0aGlzLmhhc0N1c3RvbVZpZXdzKGN1cnJlbnQpKSB7XHJcblx0XHRcdGNvbnN0IGN1c3RvbVZpZXdDb3VudCA9IGN1cnJlbnQudmlld0NvbmZpZ3VyYXRpb24/LmZpbHRlcih2ID0+IHYudHlwZSA9PT0gJ2N1c3RvbScpLmxlbmd0aCB8fCAwO1xyXG5cdFx0XHRjaGFuZ2VzLnB1c2godChcIkN1c3RvbSB2aWV3cyBjcmVhdGVkXCIpICsgYCAoJHtjdXN0b21WaWV3Q291bnR9KWApO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0aGlzLmlzUHJvZ3Jlc3NCYXJDdXN0b21pemVkKGN1cnJlbnQsIGRlZmF1bHRzKSkge1xyXG5cdFx0XHRjaGFuZ2VzLnB1c2godChcIlByb2dyZXNzIGJhciBzZXR0aW5ncyBtb2RpZmllZFwiKSk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHRoaXMuaXNUYXNrU3RhdHVzQ3VzdG9taXplZChjdXJyZW50LCBkZWZhdWx0cykpIHtcclxuXHRcdFx0Y2hhbmdlcy5wdXNoKHQoXCJUYXNrIHN0YXR1cyBzZXR0aW5ncyBjb25maWd1cmVkXCIpKTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAodGhpcy5pc1F1aWNrQ2FwdHVyZUN1c3RvbWl6ZWQoY3VycmVudCwgZGVmYXVsdHMpKSB7XHJcblx0XHRcdGNoYW5nZXMucHVzaCh0KFwiUXVpY2sgY2FwdHVyZSBjb25maWd1cmVkXCIpKTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAodGhpcy5pc1dvcmtmbG93Q3VzdG9taXplZChjdXJyZW50LCBkZWZhdWx0cykpIHtcclxuXHRcdFx0Y2hhbmdlcy5wdXNoKHQoXCJXb3JrZmxvdyBzZXR0aW5ncyBlbmFibGVkXCIpKTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAodGhpcy5hcmVBZHZhbmNlZEZlYXR1cmVzRW5hYmxlZChjdXJyZW50LCBkZWZhdWx0cykpIHtcclxuXHRcdFx0Y2hhbmdlcy5wdXNoKHQoXCJBZHZhbmNlZCBmZWF0dXJlcyBlbmFibGVkXCIpKTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAodGhpcy5pc0ZpbGVQYXJzaW5nQ3VzdG9taXplZChjdXJyZW50LCBkZWZhdWx0cykpIHtcclxuXHRcdFx0Y2hhbmdlcy5wdXNoKHQoXCJGaWxlIHBhcnNpbmcgY3VzdG9taXplZFwiKSk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGNoYW5nZXM7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDaGVjayBpZiB1c2VyIGhhcyBjcmVhdGVkIGN1c3RvbSB2aWV3c1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgaGFzQ3VzdG9tVmlld3Moc2V0dGluZ3M6IFRhc2tQcm9ncmVzc0JhclNldHRpbmdzKTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gc2V0dGluZ3Mudmlld0NvbmZpZ3VyYXRpb24/LnNvbWUodmlldyA9PiB2aWV3LnR5cGUgPT09ICdjdXN0b20nKSA/PyBmYWxzZTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGlmIHByb2dyZXNzIGJhciBzZXR0aW5ncyBoYXZlIGJlZW4gY3VzdG9taXplZFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgaXNQcm9ncmVzc0JhckN1c3RvbWl6ZWQoY3VycmVudDogVGFza1Byb2dyZXNzQmFyU2V0dGluZ3MsIGRlZmF1bHRzOiBUYXNrUHJvZ3Jlc3NCYXJTZXR0aW5ncyk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIChcclxuXHRcdFx0Y3VycmVudC5wcm9ncmVzc0JhckRpc3BsYXlNb2RlICE9PSBkZWZhdWx0cy5wcm9ncmVzc0JhckRpc3BsYXlNb2RlIHx8XHJcblx0XHRcdGN1cnJlbnQuZGlzcGxheU1vZGUgIT09IGRlZmF1bHRzLmRpc3BsYXlNb2RlIHx8XHJcblx0XHRcdGN1cnJlbnQuc2hvd1BlcmNlbnRhZ2UgIT09IGRlZmF1bHRzLnNob3dQZXJjZW50YWdlIHx8XHJcblx0XHRcdGN1cnJlbnQuY3VzdG9taXplUHJvZ3Jlc3NSYW5nZXMgIT09IGRlZmF1bHRzLmN1c3RvbWl6ZVByb2dyZXNzUmFuZ2VzIHx8XHJcblx0XHRcdGN1cnJlbnQuYWxsb3dDdXN0b21Qcm9ncmVzc0dvYWwgIT09IGRlZmF1bHRzLmFsbG93Q3VzdG9tUHJvZ3Jlc3NHb2FsIHx8XHJcblx0XHRcdGN1cnJlbnQuaGlkZVByb2dyZXNzQmFyQmFzZWRPbkNvbmRpdGlvbnMgIT09IGRlZmF1bHRzLmhpZGVQcm9ncmVzc0JhckJhc2VkT25Db25kaXRpb25zXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgdGFzayBzdGF0dXMgc2V0dGluZ3MgaGF2ZSBiZWVuIGN1c3RvbWl6ZWRcclxuXHQgKi9cclxuXHRwcml2YXRlIGlzVGFza1N0YXR1c0N1c3RvbWl6ZWQoY3VycmVudDogVGFza1Byb2dyZXNzQmFyU2V0dGluZ3MsIGRlZmF1bHRzOiBUYXNrUHJvZ3Jlc3NCYXJTZXR0aW5ncyk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIChcclxuXHRcdFx0Y3VycmVudC5lbmFibGVUYXNrU3RhdHVzU3dpdGNoZXIgIT09IGRlZmF1bHRzLmVuYWJsZVRhc2tTdGF0dXNTd2l0Y2hlciB8fFxyXG5cdFx0XHRjdXJyZW50LmVuYWJsZUN1c3RvbVRhc2tNYXJrcyAhPT0gZGVmYXVsdHMuZW5hYmxlQ3VzdG9tVGFza01hcmtzIHx8XHJcblx0XHRcdGN1cnJlbnQuZW5hYmxlQ3ljbGVDb21wbGV0ZVN0YXR1cyAhPT0gZGVmYXVsdHMuZW5hYmxlQ3ljbGVDb21wbGV0ZVN0YXR1c1xyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGlmIHF1aWNrIGNhcHR1cmUgaGFzIGJlZW4gY3VzdG9taXplZFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgaXNRdWlja0NhcHR1cmVDdXN0b21pemVkKGN1cnJlbnQ6IFRhc2tQcm9ncmVzc0JhclNldHRpbmdzLCBkZWZhdWx0czogVGFza1Byb2dyZXNzQmFyU2V0dGluZ3MpOiBib29sZWFuIHtcclxuXHRcdGNvbnN0IGN1cnJlbnRRQyA9IGN1cnJlbnQucXVpY2tDYXB0dXJlIHx8IGRlZmF1bHRzLnF1aWNrQ2FwdHVyZTtcclxuXHRcdGNvbnN0IGRlZmF1bHRRQyA9IGRlZmF1bHRzLnF1aWNrQ2FwdHVyZTtcclxuXHRcdFxyXG5cdFx0cmV0dXJuIChcclxuXHRcdFx0Y3VycmVudFFDLmVuYWJsZVF1aWNrQ2FwdHVyZSAhPT0gZGVmYXVsdFFDLmVuYWJsZVF1aWNrQ2FwdHVyZSB8fFxyXG5cdFx0XHRjdXJyZW50UUMuZW5hYmxlTWluaW1hbE1vZGUgIT09IGRlZmF1bHRRQy5lbmFibGVNaW5pbWFsTW9kZVxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGlmIHdvcmtmbG93IGhhcyBiZWVuIGN1c3RvbWl6ZWRcclxuXHQgKi9cclxuXHRwcml2YXRlIGlzV29ya2Zsb3dDdXN0b21pemVkKGN1cnJlbnQ6IFRhc2tQcm9ncmVzc0JhclNldHRpbmdzLCBkZWZhdWx0czogVGFza1Byb2dyZXNzQmFyU2V0dGluZ3MpOiBib29sZWFuIHtcclxuXHRcdGNvbnN0IGN1cnJlbnRXRiA9IGN1cnJlbnQud29ya2Zsb3cgfHwgZGVmYXVsdHMud29ya2Zsb3c7XHJcblx0XHRjb25zdCBkZWZhdWx0V0YgPSBkZWZhdWx0cy53b3JrZmxvdztcclxuXHRcdFxyXG5cdFx0cmV0dXJuIChcclxuXHRcdFx0Y3VycmVudFdGLmVuYWJsZVdvcmtmbG93ICE9PSBkZWZhdWx0V0YuZW5hYmxlV29ya2Zsb3cgfHxcclxuXHRcdFx0Y3VycmVudFdGLmF1dG9BZGRUaW1lc3RhbXAgIT09IGRlZmF1bHRXRi5hdXRvQWRkVGltZXN0YW1wIHx8XHJcblx0XHRcdGN1cnJlbnRXRi5jYWxjdWxhdGVTcGVudFRpbWUgIT09IGRlZmF1bHRXRi5jYWxjdWxhdGVTcGVudFRpbWVcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDaGVjayBpZiBhZHZhbmNlZCBmZWF0dXJlcyBhcmUgZW5hYmxlZFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXJlQWR2YW5jZWRGZWF0dXJlc0VuYWJsZWQoY3VycmVudDogVGFza1Byb2dyZXNzQmFyU2V0dGluZ3MsIGRlZmF1bHRzOiBUYXNrUHJvZ3Jlc3NCYXJTZXR0aW5ncyk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIChcclxuXHRcdFx0Y3VycmVudC5yZXdhcmRzPy5lbmFibGVSZXdhcmRzICE9PSBkZWZhdWx0cy5yZXdhcmRzPy5lbmFibGVSZXdhcmRzIHx8XHJcblx0XHRcdGN1cnJlbnQuaGFiaXQ/LmVuYWJsZUhhYml0cyAhPT0gZGVmYXVsdHMuaGFiaXQ/LmVuYWJsZUhhYml0cyB8fFxyXG5cdFx0XHRjdXJyZW50LnRpbWVsaW5lU2lkZWJhcj8uZW5hYmxlVGltZWxpbmVTaWRlYmFyICE9PSBkZWZhdWx0cy50aW1lbGluZVNpZGViYXI/LmVuYWJsZVRpbWVsaW5lU2lkZWJhciB8fFxyXG5cdFx0XHRjdXJyZW50LmJldGFUZXN0Py5lbmFibGVCYXNlVmlldyAhPT0gZGVmYXVsdHMuYmV0YVRlc3Q/LmVuYWJsZUJhc2VWaWV3XHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgZmlsZSBwYXJzaW5nIGhhcyBiZWVuIGN1c3RvbWl6ZWRcclxuXHQgKi9cclxuXHRwcml2YXRlIGlzRmlsZVBhcnNpbmdDdXN0b21pemVkKGN1cnJlbnQ6IFRhc2tQcm9ncmVzc0JhclNldHRpbmdzLCBkZWZhdWx0czogVGFza1Byb2dyZXNzQmFyU2V0dGluZ3MpOiBib29sZWFuIHtcclxuXHRcdGNvbnN0IGN1cnJlbnRGUCA9IGN1cnJlbnQuZmlsZVBhcnNpbmdDb25maWcgfHwgZGVmYXVsdHMuZmlsZVBhcnNpbmdDb25maWc7XHJcblx0XHRjb25zdCBkZWZhdWx0RlAgPSBkZWZhdWx0cy5maWxlUGFyc2luZ0NvbmZpZztcclxuXHRcdFxyXG5cdFx0cmV0dXJuIChcclxuXHRcdFx0Y3VycmVudEZQLmVuYWJsZVdvcmtlclByb2Nlc3NpbmcgIT09IGRlZmF1bHRGUC5lbmFibGVXb3JrZXJQcm9jZXNzaW5nIHx8XHJcblx0XHRcdGN1cnJlbnRGUC5lbmFibGVGaWxlTWV0YWRhdGFQYXJzaW5nICE9PSBkZWZhdWx0RlAuZW5hYmxlRmlsZU1ldGFkYXRhUGFyc2luZyB8fFxyXG5cdFx0XHRjdXJyZW50RlAuZW5hYmxlVGFnQmFzZWRUYXNrUGFyc2luZyAhPT0gZGVmYXVsdEZQLmVuYWJsZVRhZ0Jhc2VkVGFza1BhcnNpbmcgfHxcclxuXHRcdFx0Y3VycmVudEZQLmVuYWJsZU10aW1lT3B0aW1pemF0aW9uICE9PSBkZWZhdWx0RlAuZW5hYmxlTXRpbWVPcHRpbWl6YXRpb25cclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDcmVhdGUgYSBzZXR0aW5ncyBzbmFwc2hvdCBmb3IgbGF0ZXIgY29tcGFyaXNvblxyXG5cdCAqL1xyXG5cdGNyZWF0ZVNldHRpbmdzU25hcHNob3QoKTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IHNuYXBzaG90ID0ge1xyXG5cdFx0XHRjdXN0b21WaWV3Q291bnQ6IHRoaXMucGx1Z2luLnNldHRpbmdzLnZpZXdDb25maWd1cmF0aW9uPy5maWx0ZXIodiA9PiB2LnR5cGUgPT09ICdjdXN0b20nKS5sZW5ndGggfHwgMCxcclxuXHRcdFx0cHJvZ3Jlc3NCYXJNb2RlOiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm9ncmVzc0JhckRpc3BsYXlNb2RlLFxyXG5cdFx0XHR0YXNrU3RhdHVzRW5hYmxlZDogdGhpcy5wbHVnaW4uc2V0dGluZ3MuZW5hYmxlVGFza1N0YXR1c1N3aXRjaGVyLFxyXG5cdFx0XHRxdWlja0NhcHR1cmVFbmFibGVkOiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmU/LmVuYWJsZVF1aWNrQ2FwdHVyZSxcclxuXHRcdFx0d29ya2Zsb3dFbmFibGVkOiB0aGlzLnBsdWdpbi5zZXR0aW5ncy53b3JrZmxvdz8uZW5hYmxlV29ya2Zsb3csXHJcblx0XHRcdHJld2FyZHNFbmFibGVkOiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5yZXdhcmRzPy5lbmFibGVSZXdhcmRzLFxyXG5cdFx0XHRoYWJpdHNFbmFibGVkOiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5oYWJpdD8uZW5hYmxlSGFiaXRzLFxyXG5cdFx0XHR3b3JrZXJQcm9jZXNzaW5nRW5hYmxlZDogdGhpcy5wbHVnaW4uc2V0dGluZ3MuZmlsZVBhcnNpbmdDb25maWc/LmVuYWJsZVdvcmtlclByb2Nlc3NpbmcsXHJcblx0XHRcdHRpbWVzdGFtcDogRGF0ZS5ub3coKVxyXG5cdFx0fTtcclxuXHRcdFxyXG5cdFx0cmV0dXJuIEpTT04uc3RyaW5naWZ5KHNuYXBzaG90KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENvbXBhcmUgY3VycmVudCBzZXR0aW5ncyB3aXRoIGEgc25hcHNob3QgdG8gZGV0ZWN0IGNoYW5nZXNcclxuXHQgKi9cclxuXHRoYXNDaGFuZ2VkU2luY2VTbmFwc2hvdChzbmFwc2hvdDogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBvbGRTbmFwc2hvdCA9IEpTT04ucGFyc2Uoc25hcHNob3QpO1xyXG5cdFx0XHRjb25zdCBjdXJyZW50U25hcHNob3QgPSBKU09OLnBhcnNlKHRoaXMuY3JlYXRlU2V0dGluZ3NTbmFwc2hvdCgpKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIENvbXBhcmUga2V5IGZpZWxkcyAoZXhjbHVkaW5nIHRpbWVzdGFtcClcclxuXHRcdFx0Y29uc3QgZmllbGRzVG9Db21wYXJlID0gW1xyXG5cdFx0XHRcdCdjdXN0b21WaWV3Q291bnQnLCAncHJvZ3Jlc3NCYXJNb2RlJywgJ3Rhc2tTdGF0dXNFbmFibGVkJyxcclxuXHRcdFx0XHQncXVpY2tDYXB0dXJlRW5hYmxlZCcsICd3b3JrZmxvd0VuYWJsZWQnLCAncmV3YXJkc0VuYWJsZWQnLFxyXG5cdFx0XHRcdCdoYWJpdHNFbmFibGVkJywgJ3dvcmtlclByb2Nlc3NpbmdFbmFibGVkJ1xyXG5cdFx0XHRdO1xyXG5cdFx0XHRcclxuXHRcdFx0cmV0dXJuIGZpZWxkc1RvQ29tcGFyZS5zb21lKGZpZWxkID0+IG9sZFNuYXBzaG90W2ZpZWxkXSAhPT0gY3VycmVudFNuYXBzaG90W2ZpZWxkXSk7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXCJGYWlsZWQgdG8gY29tcGFyZSBzZXR0aW5ncyBzbmFwc2hvdDpcIiwgZXJyb3IpO1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTsgLy8gQXNzdW1lIGNoYW5nZXMgaWYgd2UgY2FuJ3QgY29tcGFyZVxyXG5cdFx0fVxyXG5cdH1cclxufSJdfQ==