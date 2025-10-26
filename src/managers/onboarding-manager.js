import { __awaiter } from "tslib";
import { DEFAULT_SETTINGS } from "../common/setting-definition";
import { t } from "../translations/helper";
export class OnboardingConfigManager {
    constructor(plugin) {
        this.plugin = plugin;
    }
    /**
     * Get all available onboarding configuration templates
     */
    getOnboardingConfigs() {
        return [
            this.getBeginnerConfig(),
            this.getAdvancedConfig(),
            this.getPowerUserConfig()
        ];
    }
    /**
     * Get beginner configuration template
     */
    getBeginnerConfig() {
        const beginnerViews = DEFAULT_SETTINGS.viewConfiguration.filter(view => ['inbox', 'forecast', 'projects'].includes(view.id));
        return {
            mode: 'beginner',
            name: t('Beginner'),
            description: t('Basic task management with essential features'),
            features: [
                t('Basic progress bars'),
                t('Essential views (Inbox, Forecast, Projects)'),
                t('Simple task status tracking'),
                t('Quick task capture'),
                t('Date picker functionality')
            ],
            settings: {
                // Progress Bar Settings - Simple
                progressBarDisplayMode: "both",
                displayMode: "bracketFraction",
                showPercentage: false,
                customizeProgressRanges: false,
                allowCustomProgressGoal: false,
                hideProgressBarBasedOnConditions: false,
                // Task Status Settings - Basic
                enableTaskStatusSwitcher: false,
                enableCustomTaskMarks: false,
                enableCycleCompleteStatus: false,
                // Views - Essential only
                enableView: true,
                enableInlineEditor: false,
                viewConfiguration: beginnerViews,
                // Features - Minimal
                enableDatePicker: true,
                enablePriorityPicker: false,
                quickCapture: Object.assign(Object.assign({}, DEFAULT_SETTINGS.quickCapture), { enableQuickCapture: true }),
                // Disable advanced features
                workflow: Object.assign(Object.assign({}, DEFAULT_SETTINGS.workflow), { enableWorkflow: false }),
                rewards: Object.assign(Object.assign({}, DEFAULT_SETTINGS.rewards), { enableRewards: false }),
                habit: Object.assign(Object.assign({}, DEFAULT_SETTINGS.habit), { enableHabits: false }),
                fileParsingConfig: Object.assign(Object.assign({}, DEFAULT_SETTINGS.fileParsingConfig), { enableWorkerProcessing: false, enableFileMetadataParsing: false, enableTagBasedTaskParsing: false }),
                timelineSidebar: Object.assign(Object.assign({}, DEFAULT_SETTINGS.timelineSidebar), { enableTimelineSidebar: false }),
                betaTest: {
                    enableBaseView: false
                }
            }
        };
    }
    /**
     * Get advanced configuration template
     */
    getAdvancedConfig() {
        const advancedViews = DEFAULT_SETTINGS.viewConfiguration.filter(view => ['inbox', 'forecast', 'projects', 'tags', 'kanban', 'calendar', 'table'].includes(view.id));
        return {
            mode: 'advanced',
            name: t('Advanced'),
            description: t('Project management with enhanced workflows'),
            features: [
                t('Full progress bar customization'),
                t('Extended views (Kanban, Calendar, Table)'),
                t('Project management features'),
                t('Basic workflow automation'),
                t('Task status switching'),
                t('Advanced filtering and sorting')
            ],
            settings: {
                // Progress Bar Settings - Full customization
                progressBarDisplayMode: "both",
                displayMode: "bracketFraction",
                showPercentage: true,
                customizeProgressRanges: true,
                allowCustomProgressGoal: true,
                hideProgressBarBasedOnConditions: false,
                // Task Status Settings - Enhanced
                enableTaskStatusSwitcher: true,
                enableCycleCompleteStatus: true,
                enableCustomTaskMarks: false,
                // Views - Extended set
                enableView: true,
                enableInlineEditor: true,
                viewConfiguration: advancedViews,
                // Features - Intermediate
                enableDatePicker: true,
                enablePriorityPicker: true,
                quickCapture: Object.assign(Object.assign({}, DEFAULT_SETTINGS.quickCapture), { enableQuickCapture: true }),
                // Project Management
                projectConfig: Object.assign(Object.assign({}, DEFAULT_SETTINGS.projectConfig), { enableEnhancedProject: true }),
                fileMetadataInheritance: Object.assign(Object.assign({}, DEFAULT_SETTINGS.fileMetadataInheritance), { enabled: true }),
                // Basic Workflow
                workflow: Object.assign(Object.assign({}, DEFAULT_SETTINGS.workflow), { enableWorkflow: true, autoAddTimestamp: true }),
                autoDateManager: Object.assign(Object.assign({}, DEFAULT_SETTINGS.autoDateManager), { enabled: true }),
                // Task Management
                completedTaskMover: Object.assign(Object.assign({}, DEFAULT_SETTINGS.completedTaskMover), { enableCompletedTaskMover: true }),
                // Still disabled features
                rewards: Object.assign(Object.assign({}, DEFAULT_SETTINGS.rewards), { enableRewards: false }),
                habit: Object.assign(Object.assign({}, DEFAULT_SETTINGS.habit), { enableHabits: false }),
                fileParsingConfig: Object.assign(Object.assign({}, DEFAULT_SETTINGS.fileParsingConfig), { enableWorkerProcessing: true, enableFileMetadataParsing: false }),
                timelineSidebar: Object.assign(Object.assign({}, DEFAULT_SETTINGS.timelineSidebar), { enableTimelineSidebar: false })
            }
        };
    }
    /**
     * Get power user configuration template
     */
    getPowerUserConfig() {
        return {
            mode: 'power',
            name: t('Power User'),
            description: t('Full-featured experience with all capabilities'),
            features: [
                t('All views and advanced configurations'),
                t('Complex workflow definitions'),
                t('Reward and habit tracking systems'),
                t('Performance optimizations'),
                t('Advanced integrations'),
                t('Experimental features'),
                t('Timeline and calendar sync')
            ],
            settings: {
                // All progress bar features
                progressBarDisplayMode: "both",
                displayMode: "custom",
                showPercentage: true,
                customizeProgressRanges: true,
                allowCustomProgressGoal: true,
                hideProgressBarBasedOnConditions: true,
                // Advanced task status
                enableTaskStatusSwitcher: true,
                enableCustomTaskMarks: true,
                enableCycleCompleteStatus: true,
                // All views enabled
                enableView: true,
                enableInlineEditor: true,
                viewConfiguration: DEFAULT_SETTINGS.viewConfiguration,
                // All features enabled
                enableDatePicker: true,
                enablePriorityPicker: true,
                quickCapture: Object.assign(Object.assign({}, DEFAULT_SETTINGS.quickCapture), { enableQuickCapture: true, enableMinimalMode: true }),
                // Advanced project features
                projectConfig: Object.assign(Object.assign({}, DEFAULT_SETTINGS.projectConfig), { enableEnhancedProject: true }),
                fileMetadataInheritance: Object.assign(Object.assign({}, DEFAULT_SETTINGS.fileMetadataInheritance), { enabled: true, inheritFromFrontmatter: true, inheritFromFrontmatterForSubtasks: true }),
                // Advanced features
                workflow: Object.assign(Object.assign({}, DEFAULT_SETTINGS.workflow), { enableWorkflow: true, autoAddTimestamp: true, calculateSpentTime: true }),
                rewards: Object.assign(Object.assign({}, DEFAULT_SETTINGS.rewards), { enableRewards: true }),
                habit: Object.assign(Object.assign({}, DEFAULT_SETTINGS.habit), { enableHabits: true }),
                // Performance optimizations
                fileParsingConfig: Object.assign(Object.assign({}, DEFAULT_SETTINGS.fileParsingConfig), { enableWorkerProcessing: true, enableFileMetadataParsing: true, enableTagBasedTaskParsing: true, enableMtimeOptimization: true }),
                // Advanced integrations
                timelineSidebar: Object.assign(Object.assign({}, DEFAULT_SETTINGS.timelineSidebar), { enableTimelineSidebar: true }),
                autoDateManager: Object.assign(Object.assign({}, DEFAULT_SETTINGS.autoDateManager), { enabled: true, manageCompletedDate: true, manageStartDate: true }),
                completedTaskMover: Object.assign(Object.assign({}, DEFAULT_SETTINGS.completedTaskMover), { enableCompletedTaskMover: true, enableAutoMove: true }),
                // Beta features
                betaTest: {
                    enableBaseView: true
                }
            }
        };
    }
    /**
     * Apply configuration template to plugin settings with safe view merging
     */
    applyConfiguration(mode) {
        return __awaiter(this, void 0, void 0, function* () {
            const configs = this.getOnboardingConfigs();
            const selectedConfig = configs.find(config => config.mode === mode);
            if (!selectedConfig) {
                throw new Error(`Configuration mode ${mode} not found`);
            }
            // Preserve user's custom views before applying configuration
            const currentViews = this.plugin.settings.viewConfiguration || [];
            const userCustomViews = currentViews.filter(view => view.type === 'custom');
            const templateViews = selectedConfig.settings.viewConfiguration || [];
            // Smart merge: keep user custom views, update/add template views
            const mergedViews = this.mergeViewConfigurations(templateViews, userCustomViews);
            // Deep merge the selected configuration with current settings, excluding viewConfiguration
            const configWithoutViews = Object.assign({}, selectedConfig.settings);
            delete configWithoutViews.viewConfiguration;
            const newSettings = this.deepMerge(this.plugin.settings, configWithoutViews);
            // Apply the safely merged view configuration
            newSettings.viewConfiguration = mergedViews;
            // Update onboarding status
            if (!newSettings.onboarding) {
                newSettings.onboarding = DEFAULT_SETTINGS.onboarding;
            }
            newSettings.onboarding.configMode = mode;
            // Apply new settings
            this.plugin.settings = newSettings;
            yield this.plugin.saveSettings();
            console.log(`Applied ${mode} configuration template with ${userCustomViews.length} user custom views preserved`);
        });
    }
    /**
     * Mark onboarding as completed
     */
    completeOnboarding(mode) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.plugin.settings.onboarding) {
                this.plugin.settings.onboarding = Object.assign({}, DEFAULT_SETTINGS.onboarding);
            }
            this.plugin.settings.onboarding.completed = true;
            this.plugin.settings.onboarding.configMode = mode;
            this.plugin.settings.onboarding.completedAt = new Date().toISOString();
            this.plugin.settings.onboarding.version = this.plugin.manifest.version;
            yield this.plugin.saveSettings();
            console.log(`Onboarding completed with ${mode} configuration`);
        });
    }
    /**
     * Check if user should see onboarding
     */
    shouldShowOnboarding() {
        var _a, _b;
        return !((_a = this.plugin.settings.onboarding) === null || _a === void 0 ? void 0 : _a.completed) &&
            !((_b = this.plugin.settings.onboarding) === null || _b === void 0 ? void 0 : _b.skipOnboarding);
    }
    /**
     * Skip onboarding
     */
    skipOnboarding() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.plugin.settings.onboarding) {
                this.plugin.settings.onboarding = Object.assign({}, DEFAULT_SETTINGS.onboarding);
            }
            this.plugin.settings.onboarding.skipOnboarding = true;
            this.plugin.settings.onboarding.version = this.plugin.manifest.version;
            yield this.plugin.saveSettings();
            console.log('Onboarding skipped');
        });
    }
    /**
     * Reset onboarding status (for restart functionality)
     */
    resetOnboarding() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.plugin.settings.onboarding) {
                this.plugin.settings.onboarding = Object.assign({}, DEFAULT_SETTINGS.onboarding);
            }
            this.plugin.settings.onboarding.completed = false;
            this.plugin.settings.onboarding.skipOnboarding = false;
            this.plugin.settings.onboarding.completedAt = "";
            yield this.plugin.saveSettings();
            console.log('Onboarding reset');
        });
    }
    /**
     * Get current configuration mode display name
     */
    getCurrentConfigModeDisplay() {
        var _a;
        const mode = (_a = this.plugin.settings.onboarding) === null || _a === void 0 ? void 0 : _a.configMode;
        if (!mode)
            return t('Not configured');
        const configs = this.getOnboardingConfigs();
        const currentConfig = configs.find(config => config.mode === mode);
        return currentConfig ? currentConfig.name : t('Custom');
    }
    /**
     * Merge view configurations safely, preserving user custom views
     */
    mergeViewConfigurations(templateViews, userCustomViews) {
        // Start with template views (these define which default views are enabled for this mode)
        const mergedViews = [...templateViews];
        // Add all user custom views (these are always preserved)
        userCustomViews.forEach(userView => {
            // Ensure no duplicate IDs (shouldn't happen with custom views, but safety first)
            if (!mergedViews.find(view => view.id === userView.id)) {
                mergedViews.push(userView);
            }
        });
        return mergedViews;
    }
    /**
     * Get preview of configuration changes without applying them
     */
    getConfigurationPreview(mode) {
        var _a, _b, _c, _d, _e, _f;
        const configs = this.getOnboardingConfigs();
        const selectedConfig = configs.find(config => config.mode === mode);
        if (!selectedConfig) {
            throw new Error(`Configuration mode ${mode} not found`);
        }
        const currentViews = this.plugin.settings.viewConfiguration || [];
        const userCustomViews = currentViews.filter(view => view.type === 'custom');
        const templateViews = selectedConfig.settings.viewConfiguration || [];
        const currentViewIds = new Set(currentViews.map(view => view.id));
        const viewsToAdd = templateViews.filter(view => !currentViewIds.has(view.id));
        const viewsToUpdate = templateViews.filter(view => currentViewIds.has(view.id));
        // Analyze setting changes (simplified for now)
        const settingsChanges = [];
        if (selectedConfig.settings.enableView !== this.plugin.settings.enableView) {
            settingsChanges.push(`Views ${selectedConfig.settings.enableView ? 'enabled' : 'disabled'}`);
        }
        if (((_a = selectedConfig.settings.quickCapture) === null || _a === void 0 ? void 0 : _a.enableQuickCapture) !== ((_b = this.plugin.settings.quickCapture) === null || _b === void 0 ? void 0 : _b.enableQuickCapture)) {
            settingsChanges.push(`Quick Capture ${((_c = selectedConfig.settings.quickCapture) === null || _c === void 0 ? void 0 : _c.enableQuickCapture) ? 'enabled' : 'disabled'}`);
        }
        if (((_d = selectedConfig.settings.workflow) === null || _d === void 0 ? void 0 : _d.enableWorkflow) !== ((_e = this.plugin.settings.workflow) === null || _e === void 0 ? void 0 : _e.enableWorkflow)) {
            settingsChanges.push(`Workflow ${((_f = selectedConfig.settings.workflow) === null || _f === void 0 ? void 0 : _f.enableWorkflow) ? 'enabled' : 'disabled'}`);
        }
        return {
            viewsToAdd,
            viewsToUpdate,
            userCustomViewsPreserved: userCustomViews,
            settingsChanges
        };
    }
    /**
     * Deep merge utility function
     */
    deepMerge(target, source) {
        const result = Object.assign({}, target);
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = this.deepMerge(result[key] || {}, source[key]);
                }
                else {
                    result[key] = source[key];
                }
            }
        }
        return result;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib25ib2FyZGluZy1tYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsib25ib2FyZGluZy1tYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBQTJCLGdCQUFnQixFQUFjLE1BQU0sOEJBQThCLENBQUM7QUFFckcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBWTNDLE1BQU0sT0FBTyx1QkFBdUI7SUFHbkMsWUFBWSxNQUE2QjtRQUN4QyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUN0QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxvQkFBb0I7UUFDbkIsT0FBTztZQUNOLElBQUksQ0FBQyxpQkFBaUIsRUFBRTtZQUN4QixJQUFJLENBQUMsaUJBQWlCLEVBQUU7WUFDeEIsSUFBSSxDQUFDLGtCQUFrQixFQUFFO1NBQ3pCLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSyxpQkFBaUI7UUFDeEIsTUFBTSxhQUFhLEdBQWlCLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUNwRixDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FDbkQsQ0FBQztRQUVGLE9BQU87WUFDTixJQUFJLEVBQUUsVUFBVTtZQUNoQixJQUFJLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQztZQUNuQixXQUFXLEVBQUUsQ0FBQyxDQUFDLCtDQUErQyxDQUFDO1lBQy9ELFFBQVEsRUFBRTtnQkFDVCxDQUFDLENBQUMscUJBQXFCLENBQUM7Z0JBQ3hCLENBQUMsQ0FBQyw2Q0FBNkMsQ0FBQztnQkFDaEQsQ0FBQyxDQUFDLDZCQUE2QixDQUFDO2dCQUNoQyxDQUFDLENBQUMsb0JBQW9CLENBQUM7Z0JBQ3ZCLENBQUMsQ0FBQywyQkFBMkIsQ0FBQzthQUM5QjtZQUNELFFBQVEsRUFBRTtnQkFDVCxpQ0FBaUM7Z0JBQ2pDLHNCQUFzQixFQUFFLE1BQU07Z0JBQzlCLFdBQVcsRUFBRSxpQkFBaUI7Z0JBQzlCLGNBQWMsRUFBRSxLQUFLO2dCQUNyQix1QkFBdUIsRUFBRSxLQUFLO2dCQUM5Qix1QkFBdUIsRUFBRSxLQUFLO2dCQUM5QixnQ0FBZ0MsRUFBRSxLQUFLO2dCQUV2QywrQkFBK0I7Z0JBQy9CLHdCQUF3QixFQUFFLEtBQUs7Z0JBQy9CLHFCQUFxQixFQUFFLEtBQUs7Z0JBQzVCLHlCQUF5QixFQUFFLEtBQUs7Z0JBRWhDLHlCQUF5QjtnQkFDekIsVUFBVSxFQUFFLElBQUk7Z0JBQ2hCLGtCQUFrQixFQUFFLEtBQUs7Z0JBQ3pCLGlCQUFpQixFQUFFLGFBQWE7Z0JBRWhDLHFCQUFxQjtnQkFDckIsZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsb0JBQW9CLEVBQUUsS0FBSztnQkFDM0IsWUFBWSxrQ0FDUixnQkFBZ0IsQ0FBQyxZQUFZLEtBQ2hDLGtCQUFrQixFQUFFLElBQUksR0FDeEI7Z0JBRUQsNEJBQTRCO2dCQUM1QixRQUFRLGtDQUNKLGdCQUFnQixDQUFDLFFBQVEsS0FDNUIsY0FBYyxFQUFFLEtBQUssR0FDckI7Z0JBQ0QsT0FBTyxrQ0FDSCxnQkFBZ0IsQ0FBQyxPQUFPLEtBQzNCLGFBQWEsRUFBRSxLQUFLLEdBQ3BCO2dCQUNELEtBQUssa0NBQ0QsZ0JBQWdCLENBQUMsS0FBSyxLQUN6QixZQUFZLEVBQUUsS0FBSyxHQUNuQjtnQkFDRCxpQkFBaUIsa0NBQ2IsZ0JBQWdCLENBQUMsaUJBQWlCLEtBQ3JDLHNCQUFzQixFQUFFLEtBQUssRUFDN0IseUJBQXlCLEVBQUUsS0FBSyxFQUNoQyx5QkFBeUIsRUFBRSxLQUFLLEdBQ2hDO2dCQUNELGVBQWUsa0NBQ1gsZ0JBQWdCLENBQUMsZUFBZSxLQUNuQyxxQkFBcUIsRUFBRSxLQUFLLEdBQzVCO2dCQUNELFFBQVEsRUFBRTtvQkFDVCxjQUFjLEVBQUUsS0FBSztpQkFDckI7YUFDRDtTQUNELENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSyxpQkFBaUI7UUFDeEIsTUFBTSxhQUFhLEdBQWlCLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUNwRixDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQzFGLENBQUM7UUFFRixPQUFPO1lBQ04sSUFBSSxFQUFFLFVBQVU7WUFDaEIsSUFBSSxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUM7WUFDbkIsV0FBVyxFQUFFLENBQUMsQ0FBQyw0Q0FBNEMsQ0FBQztZQUM1RCxRQUFRLEVBQUU7Z0JBQ1QsQ0FBQyxDQUFDLGlDQUFpQyxDQUFDO2dCQUNwQyxDQUFDLENBQUMsMENBQTBDLENBQUM7Z0JBQzdDLENBQUMsQ0FBQyw2QkFBNkIsQ0FBQztnQkFDaEMsQ0FBQyxDQUFDLDJCQUEyQixDQUFDO2dCQUM5QixDQUFDLENBQUMsdUJBQXVCLENBQUM7Z0JBQzFCLENBQUMsQ0FBQyxnQ0FBZ0MsQ0FBQzthQUNuQztZQUNELFFBQVEsRUFBRTtnQkFDVCw2Q0FBNkM7Z0JBQzdDLHNCQUFzQixFQUFFLE1BQU07Z0JBQzlCLFdBQVcsRUFBRSxpQkFBaUI7Z0JBQzlCLGNBQWMsRUFBRSxJQUFJO2dCQUNwQix1QkFBdUIsRUFBRSxJQUFJO2dCQUM3Qix1QkFBdUIsRUFBRSxJQUFJO2dCQUM3QixnQ0FBZ0MsRUFBRSxLQUFLO2dCQUV2QyxrQ0FBa0M7Z0JBQ2xDLHdCQUF3QixFQUFFLElBQUk7Z0JBQzlCLHlCQUF5QixFQUFFLElBQUk7Z0JBQy9CLHFCQUFxQixFQUFFLEtBQUs7Z0JBRTVCLHVCQUF1QjtnQkFDdkIsVUFBVSxFQUFFLElBQUk7Z0JBQ2hCLGtCQUFrQixFQUFFLElBQUk7Z0JBQ3hCLGlCQUFpQixFQUFFLGFBQWE7Z0JBRWhDLDBCQUEwQjtnQkFDMUIsZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsb0JBQW9CLEVBQUUsSUFBSTtnQkFDMUIsWUFBWSxrQ0FDUixnQkFBZ0IsQ0FBQyxZQUFZLEtBQ2hDLGtCQUFrQixFQUFFLElBQUksR0FDeEI7Z0JBRUQscUJBQXFCO2dCQUNyQixhQUFhLGtDQUNULGdCQUFnQixDQUFDLGFBQWEsS0FDakMscUJBQXFCLEVBQUUsSUFBSSxHQUMzQjtnQkFDRCx1QkFBdUIsa0NBQ25CLGdCQUFnQixDQUFDLHVCQUF1QixLQUMzQyxPQUFPLEVBQUUsSUFBSSxHQUNiO2dCQUVELGlCQUFpQjtnQkFDakIsUUFBUSxrQ0FDSixnQkFBZ0IsQ0FBQyxRQUFRLEtBQzVCLGNBQWMsRUFBRSxJQUFJLEVBQ3BCLGdCQUFnQixFQUFFLElBQUksR0FDdEI7Z0JBQ0QsZUFBZSxrQ0FDWCxnQkFBZ0IsQ0FBQyxlQUFlLEtBQ25DLE9BQU8sRUFBRSxJQUFJLEdBQ2I7Z0JBRUQsa0JBQWtCO2dCQUNsQixrQkFBa0Isa0NBQ2QsZ0JBQWdCLENBQUMsa0JBQWtCLEtBQ3RDLHdCQUF3QixFQUFFLElBQUksR0FDOUI7Z0JBRUQsMEJBQTBCO2dCQUMxQixPQUFPLGtDQUNILGdCQUFnQixDQUFDLE9BQU8sS0FDM0IsYUFBYSxFQUFFLEtBQUssR0FDcEI7Z0JBQ0QsS0FBSyxrQ0FDRCxnQkFBZ0IsQ0FBQyxLQUFLLEtBQ3pCLFlBQVksRUFBRSxLQUFLLEdBQ25CO2dCQUNELGlCQUFpQixrQ0FDYixnQkFBZ0IsQ0FBQyxpQkFBaUIsS0FDckMsc0JBQXNCLEVBQUUsSUFBSSxFQUM1Qix5QkFBeUIsRUFBRSxLQUFLLEdBQ2hDO2dCQUNELGVBQWUsa0NBQ1gsZ0JBQWdCLENBQUMsZUFBZSxLQUNuQyxxQkFBcUIsRUFBRSxLQUFLLEdBQzVCO2FBQ0Q7U0FDRCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0ssa0JBQWtCO1FBQ3pCLE9BQU87WUFDTixJQUFJLEVBQUUsT0FBTztZQUNiLElBQUksRUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDO1lBQ3JCLFdBQVcsRUFBRSxDQUFDLENBQUMsZ0RBQWdELENBQUM7WUFDaEUsUUFBUSxFQUFFO2dCQUNULENBQUMsQ0FBQyx1Q0FBdUMsQ0FBQztnQkFDMUMsQ0FBQyxDQUFDLDhCQUE4QixDQUFDO2dCQUNqQyxDQUFDLENBQUMsbUNBQW1DLENBQUM7Z0JBQ3RDLENBQUMsQ0FBQywyQkFBMkIsQ0FBQztnQkFDOUIsQ0FBQyxDQUFDLHVCQUF1QixDQUFDO2dCQUMxQixDQUFDLENBQUMsdUJBQXVCLENBQUM7Z0JBQzFCLENBQUMsQ0FBQyw0QkFBNEIsQ0FBQzthQUMvQjtZQUNELFFBQVEsRUFBRTtnQkFDVCw0QkFBNEI7Z0JBQzVCLHNCQUFzQixFQUFFLE1BQU07Z0JBQzlCLFdBQVcsRUFBRSxRQUFRO2dCQUNyQixjQUFjLEVBQUUsSUFBSTtnQkFDcEIsdUJBQXVCLEVBQUUsSUFBSTtnQkFDN0IsdUJBQXVCLEVBQUUsSUFBSTtnQkFDN0IsZ0NBQWdDLEVBQUUsSUFBSTtnQkFFdEMsdUJBQXVCO2dCQUN2Qix3QkFBd0IsRUFBRSxJQUFJO2dCQUM5QixxQkFBcUIsRUFBRSxJQUFJO2dCQUMzQix5QkFBeUIsRUFBRSxJQUFJO2dCQUUvQixvQkFBb0I7Z0JBQ3BCLFVBQVUsRUFBRSxJQUFJO2dCQUNoQixrQkFBa0IsRUFBRSxJQUFJO2dCQUN4QixpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxpQkFBaUI7Z0JBRXJELHVCQUF1QjtnQkFDdkIsZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsb0JBQW9CLEVBQUUsSUFBSTtnQkFDMUIsWUFBWSxrQ0FDUixnQkFBZ0IsQ0FBQyxZQUFZLEtBQ2hDLGtCQUFrQixFQUFFLElBQUksRUFDeEIsaUJBQWlCLEVBQUUsSUFBSSxHQUN2QjtnQkFFRCw0QkFBNEI7Z0JBQzVCLGFBQWEsa0NBQ1QsZ0JBQWdCLENBQUMsYUFBYSxLQUNqQyxxQkFBcUIsRUFBRSxJQUFJLEdBQzNCO2dCQUNELHVCQUF1QixrQ0FDbkIsZ0JBQWdCLENBQUMsdUJBQXVCLEtBQzNDLE9BQU8sRUFBRSxJQUFJLEVBQ2Isc0JBQXNCLEVBQUUsSUFBSSxFQUM1QixpQ0FBaUMsRUFBRSxJQUFJLEdBQ3ZDO2dCQUVELG9CQUFvQjtnQkFDcEIsUUFBUSxrQ0FDSixnQkFBZ0IsQ0FBQyxRQUFRLEtBQzVCLGNBQWMsRUFBRSxJQUFJLEVBQ3BCLGdCQUFnQixFQUFFLElBQUksRUFDdEIsa0JBQWtCLEVBQUUsSUFBSSxHQUN4QjtnQkFDRCxPQUFPLGtDQUNILGdCQUFnQixDQUFDLE9BQU8sS0FDM0IsYUFBYSxFQUFFLElBQUksR0FDbkI7Z0JBQ0QsS0FBSyxrQ0FDRCxnQkFBZ0IsQ0FBQyxLQUFLLEtBQ3pCLFlBQVksRUFBRSxJQUFJLEdBQ2xCO2dCQUVELDRCQUE0QjtnQkFDNUIsaUJBQWlCLGtDQUNiLGdCQUFnQixDQUFDLGlCQUFpQixLQUNyQyxzQkFBc0IsRUFBRSxJQUFJLEVBQzVCLHlCQUF5QixFQUFFLElBQUksRUFDL0IseUJBQXlCLEVBQUUsSUFBSSxFQUMvQix1QkFBdUIsRUFBRSxJQUFJLEdBQzdCO2dCQUVELHdCQUF3QjtnQkFDeEIsZUFBZSxrQ0FDWCxnQkFBZ0IsQ0FBQyxlQUFlLEtBQ25DLHFCQUFxQixFQUFFLElBQUksR0FDM0I7Z0JBQ0QsZUFBZSxrQ0FDWCxnQkFBZ0IsQ0FBQyxlQUFlLEtBQ25DLE9BQU8sRUFBRSxJQUFJLEVBQ2IsbUJBQW1CLEVBQUUsSUFBSSxFQUN6QixlQUFlLEVBQUUsSUFBSSxHQUNyQjtnQkFDRCxrQkFBa0Isa0NBQ2QsZ0JBQWdCLENBQUMsa0JBQWtCLEtBQ3RDLHdCQUF3QixFQUFFLElBQUksRUFDOUIsY0FBYyxFQUFFLElBQUksR0FDcEI7Z0JBRUQsZ0JBQWdCO2dCQUNoQixRQUFRLEVBQUU7b0JBQ1QsY0FBYyxFQUFFLElBQUk7aUJBQ3BCO2FBQ0Q7U0FDRCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0csa0JBQWtCLENBQUMsSUFBMEI7O1lBQ2xELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQzVDLE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxDQUFDO1lBRXBFLElBQUksQ0FBQyxjQUFjLEVBQUU7Z0JBQ3BCLE1BQU0sSUFBSSxLQUFLLENBQUMsc0JBQXNCLElBQUksWUFBWSxDQUFDLENBQUM7YUFDeEQ7WUFFRCw2REFBNkQ7WUFDN0QsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsaUJBQWlCLElBQUksRUFBRSxDQUFDO1lBQ2xFLE1BQU0sZUFBZSxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFDO1lBQzVFLE1BQU0sYUFBYSxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLElBQUksRUFBRSxDQUFDO1lBRXRFLGlFQUFpRTtZQUNqRSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsYUFBYSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1lBRWpGLDJGQUEyRjtZQUMzRixNQUFNLGtCQUFrQixxQkFBUSxjQUFjLENBQUMsUUFBUSxDQUFFLENBQUM7WUFDMUQsT0FBTyxrQkFBa0IsQ0FBQyxpQkFBaUIsQ0FBQztZQUU1QyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLGtCQUFrQixDQUFDLENBQUM7WUFFN0UsNkNBQTZDO1lBQzdDLFdBQVcsQ0FBQyxpQkFBaUIsR0FBRyxXQUFXLENBQUM7WUFFNUMsMkJBQTJCO1lBQzNCLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFO2dCQUM1QixXQUFXLENBQUMsVUFBVSxHQUFHLGdCQUFnQixDQUFDLFVBQVUsQ0FBQzthQUNyRDtZQUNELFdBQVcsQ0FBQyxVQUFVLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztZQUV6QyxxQkFBcUI7WUFDckIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEdBQUcsV0FBc0MsQ0FBQztZQUM5RCxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUM7WUFFakMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLElBQUksZ0NBQWdDLGVBQWUsQ0FBQyxNQUFNLDhCQUE4QixDQUFDLENBQUM7UUFDbEgsQ0FBQztLQUFBO0lBRUQ7O09BRUc7SUFDRyxrQkFBa0IsQ0FBQyxJQUEwQjs7WUFDbEQsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRTtnQkFDckMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxxQkFBTyxnQkFBZ0IsQ0FBQyxVQUFXLENBQUMsQ0FBQzthQUNwRTtZQUVELElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO1lBQ2pELElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO1lBQ2xELElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN2RSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQztZQUV2RSxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDakMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2hFLENBQUM7S0FBQTtJQUVEOztPQUVHO0lBQ0gsb0JBQW9COztRQUNuQixPQUFPLENBQUMsQ0FBQSxNQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsMENBQUUsU0FBUyxDQUFBO1lBQzlDLENBQUMsQ0FBQSxNQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsMENBQUUsY0FBYyxDQUFBLENBQUM7SUFDdEQsQ0FBQztJQUVEOztPQUVHO0lBQ0csY0FBYzs7WUFDbkIsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRTtnQkFDckMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxxQkFBTyxnQkFBZ0IsQ0FBQyxVQUFXLENBQUMsQ0FBQzthQUNwRTtZQUVELElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO1lBQ3RELElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDO1lBQ3ZFLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNqQyxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDbkMsQ0FBQztLQUFBO0lBRUQ7O09BRUc7SUFDRyxlQUFlOztZQUNwQixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFO2dCQUNyQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLHFCQUFPLGdCQUFnQixDQUFDLFVBQVcsQ0FBQyxDQUFDO2FBQ3BFO1lBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7WUFDbEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUM7WUFDdkQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUM7WUFDakQsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ2pDLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUNqQyxDQUFDO0tBQUE7SUFFRDs7T0FFRztJQUNILDJCQUEyQjs7UUFDMUIsTUFBTSxJQUFJLEdBQUcsTUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLDBDQUFFLFVBQVUsQ0FBQztRQUN6RCxJQUFJLENBQUMsSUFBSTtZQUFFLE9BQU8sQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFFdEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDNUMsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUM7UUFDbkUsT0FBTyxhQUFhLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN6RCxDQUFDO0lBRUQ7O09BRUc7SUFDSyx1QkFBdUIsQ0FBQyxhQUEyQixFQUFFLGVBQTZCO1FBQ3pGLHlGQUF5RjtRQUN6RixNQUFNLFdBQVcsR0FBaUIsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxDQUFDO1FBRXJELHlEQUF5RDtRQUN6RCxlQUFlLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQ2xDLGlGQUFpRjtZQUNqRixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFO2dCQUN2RCxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQzNCO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLFdBQVcsQ0FBQztJQUNwQixDQUFDO0lBRUQ7O09BRUc7SUFDSCx1QkFBdUIsQ0FBQyxJQUEwQjs7UUFNakQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDNUMsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUM7UUFFcEUsSUFBSSxDQUFDLGNBQWMsRUFBRTtZQUNwQixNQUFNLElBQUksS0FBSyxDQUFDLHNCQUFzQixJQUFJLFlBQVksQ0FBQyxDQUFDO1NBQ3hEO1FBRUQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsaUJBQWlCLElBQUksRUFBRSxDQUFDO1FBQ2xFLE1BQU0sZUFBZSxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFDO1FBQzVFLE1BQU0sYUFBYSxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLElBQUksRUFBRSxDQUFDO1FBRXRFLE1BQU0sY0FBYyxHQUFHLElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsRSxNQUFNLFVBQVUsR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzlFLE1BQU0sYUFBYSxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRWhGLCtDQUErQztRQUMvQyxNQUFNLGVBQWUsR0FBYSxFQUFFLENBQUM7UUFDckMsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLFVBQVUsS0FBSyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUU7WUFDM0UsZUFBZSxDQUFDLElBQUksQ0FBQyxTQUFTLGNBQWMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7U0FDN0Y7UUFDRCxJQUFJLENBQUEsTUFBQSxjQUFjLENBQUMsUUFBUSxDQUFDLFlBQVksMENBQUUsa0JBQWtCLE9BQUssTUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxZQUFZLDBDQUFFLGtCQUFrQixDQUFBLEVBQUU7WUFDdkgsZUFBZSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQSxNQUFBLGNBQWMsQ0FBQyxRQUFRLENBQUMsWUFBWSwwQ0FBRSxrQkFBa0IsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO1NBQzNIO1FBQ0QsSUFBSSxDQUFBLE1BQUEsY0FBYyxDQUFDLFFBQVEsQ0FBQyxRQUFRLDBDQUFFLGNBQWMsT0FBSyxNQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsMENBQUUsY0FBYyxDQUFBLEVBQUU7WUFDdkcsZUFBZSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUEsTUFBQSxjQUFjLENBQUMsUUFBUSxDQUFDLFFBQVEsMENBQUUsY0FBYyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7U0FDOUc7UUFFRCxPQUFPO1lBQ04sVUFBVTtZQUNWLGFBQWE7WUFDYix3QkFBd0IsRUFBRSxlQUFlO1lBQ3pDLGVBQWU7U0FDZixDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0ssU0FBUyxDQUFDLE1BQVcsRUFBRSxNQUFXO1FBQ3pDLE1BQU0sTUFBTSxxQkFBUSxNQUFNLENBQUUsQ0FBQztRQUU3QixLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sRUFBRTtZQUN6QixJQUFJLE1BQU0sQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQy9CLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLE9BQU8sTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLFFBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUU7b0JBQ2xGLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7aUJBQzdEO3FCQUFNO29CQUNOLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQzFCO2FBQ0Q7U0FDRDtRQUVELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVGFza1Byb2dyZXNzQmFyU2V0dGluZ3MsIERFRkFVTFRfU0VUVElOR1MsIFZpZXdDb25maWcgfSBmcm9tIFwiLi4vY29tbW9uL3NldHRpbmctZGVmaW5pdGlvblwiO1xyXG5pbXBvcnQgdHlwZSBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIi4uL2luZGV4XCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiLi4vdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5cclxuZXhwb3J0IHR5cGUgT25ib2FyZGluZ0NvbmZpZ01vZGUgPSAnYmVnaW5uZXInIHwgJ2FkdmFuY2VkJyB8ICdwb3dlcic7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE9uYm9hcmRpbmdDb25maWcge1xyXG5cdG1vZGU6IE9uYm9hcmRpbmdDb25maWdNb2RlO1xyXG5cdG5hbWU6IHN0cmluZztcclxuXHRkZXNjcmlwdGlvbjogc3RyaW5nO1xyXG5cdGZlYXR1cmVzOiBzdHJpbmdbXTtcclxuXHRzZXR0aW5nczogUGFydGlhbDxUYXNrUHJvZ3Jlc3NCYXJTZXR0aW5ncz47XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBPbmJvYXJkaW5nQ29uZmlnTWFuYWdlciB7XHJcblx0cHJpdmF0ZSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbjtcclxuXHJcblx0Y29uc3RydWN0b3IocGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4pIHtcclxuXHRcdHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGFsbCBhdmFpbGFibGUgb25ib2FyZGluZyBjb25maWd1cmF0aW9uIHRlbXBsYXRlc1xyXG5cdCAqL1xyXG5cdGdldE9uYm9hcmRpbmdDb25maWdzKCk6IE9uYm9hcmRpbmdDb25maWdbXSB7XHJcblx0XHRyZXR1cm4gW1xyXG5cdFx0XHR0aGlzLmdldEJlZ2lubmVyQ29uZmlnKCksXHJcblx0XHRcdHRoaXMuZ2V0QWR2YW5jZWRDb25maWcoKSxcclxuXHRcdFx0dGhpcy5nZXRQb3dlclVzZXJDb25maWcoKVxyXG5cdFx0XTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBiZWdpbm5lciBjb25maWd1cmF0aW9uIHRlbXBsYXRlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZXRCZWdpbm5lckNvbmZpZygpOiBPbmJvYXJkaW5nQ29uZmlnIHtcclxuXHRcdGNvbnN0IGJlZ2lubmVyVmlld3M6IFZpZXdDb25maWdbXSA9IERFRkFVTFRfU0VUVElOR1Mudmlld0NvbmZpZ3VyYXRpb24uZmlsdGVyKHZpZXcgPT4gXHJcblx0XHRcdFsnaW5ib3gnLCAnZm9yZWNhc3QnLCAncHJvamVjdHMnXS5pbmNsdWRlcyh2aWV3LmlkKVxyXG5cdFx0KTtcclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRtb2RlOiAnYmVnaW5uZXInLFxyXG5cdFx0XHRuYW1lOiB0KCdCZWdpbm5lcicpLFxyXG5cdFx0XHRkZXNjcmlwdGlvbjogdCgnQmFzaWMgdGFzayBtYW5hZ2VtZW50IHdpdGggZXNzZW50aWFsIGZlYXR1cmVzJyksXHJcblx0XHRcdGZlYXR1cmVzOiBbXHJcblx0XHRcdFx0dCgnQmFzaWMgcHJvZ3Jlc3MgYmFycycpLFxyXG5cdFx0XHRcdHQoJ0Vzc2VudGlhbCB2aWV3cyAoSW5ib3gsIEZvcmVjYXN0LCBQcm9qZWN0cyknKSxcclxuXHRcdFx0XHR0KCdTaW1wbGUgdGFzayBzdGF0dXMgdHJhY2tpbmcnKSxcclxuXHRcdFx0XHR0KCdRdWljayB0YXNrIGNhcHR1cmUnKSxcclxuXHRcdFx0XHR0KCdEYXRlIHBpY2tlciBmdW5jdGlvbmFsaXR5JylcclxuXHRcdFx0XSxcclxuXHRcdFx0c2V0dGluZ3M6IHtcclxuXHRcdFx0XHQvLyBQcm9ncmVzcyBCYXIgU2V0dGluZ3MgLSBTaW1wbGVcclxuXHRcdFx0XHRwcm9ncmVzc0JhckRpc3BsYXlNb2RlOiBcImJvdGhcIixcclxuXHRcdFx0XHRkaXNwbGF5TW9kZTogXCJicmFja2V0RnJhY3Rpb25cIixcclxuXHRcdFx0XHRzaG93UGVyY2VudGFnZTogZmFsc2UsXHJcblx0XHRcdFx0Y3VzdG9taXplUHJvZ3Jlc3NSYW5nZXM6IGZhbHNlLFxyXG5cdFx0XHRcdGFsbG93Q3VzdG9tUHJvZ3Jlc3NHb2FsOiBmYWxzZSxcclxuXHRcdFx0XHRoaWRlUHJvZ3Jlc3NCYXJCYXNlZE9uQ29uZGl0aW9uczogZmFsc2UsXHJcblxyXG5cdFx0XHRcdC8vIFRhc2sgU3RhdHVzIFNldHRpbmdzIC0gQmFzaWNcclxuXHRcdFx0XHRlbmFibGVUYXNrU3RhdHVzU3dpdGNoZXI6IGZhbHNlLFxyXG5cdFx0XHRcdGVuYWJsZUN1c3RvbVRhc2tNYXJrczogZmFsc2UsXHJcblx0XHRcdFx0ZW5hYmxlQ3ljbGVDb21wbGV0ZVN0YXR1czogZmFsc2UsXHJcblxyXG5cdFx0XHRcdC8vIFZpZXdzIC0gRXNzZW50aWFsIG9ubHlcclxuXHRcdFx0XHRlbmFibGVWaWV3OiB0cnVlLFxyXG5cdFx0XHRcdGVuYWJsZUlubGluZUVkaXRvcjogZmFsc2UsXHJcblx0XHRcdFx0dmlld0NvbmZpZ3VyYXRpb246IGJlZ2lubmVyVmlld3MsXHJcblxyXG5cdFx0XHRcdC8vIEZlYXR1cmVzIC0gTWluaW1hbFxyXG5cdFx0XHRcdGVuYWJsZURhdGVQaWNrZXI6IHRydWUsXHJcblx0XHRcdFx0ZW5hYmxlUHJpb3JpdHlQaWNrZXI6IGZhbHNlLFxyXG5cdFx0XHRcdHF1aWNrQ2FwdHVyZToge1xyXG5cdFx0XHRcdFx0Li4uREVGQVVMVF9TRVRUSU5HUy5xdWlja0NhcHR1cmUsXHJcblx0XHRcdFx0XHRlbmFibGVRdWlja0NhcHR1cmU6IHRydWVcclxuXHRcdFx0XHR9LFxyXG5cclxuXHRcdFx0XHQvLyBEaXNhYmxlIGFkdmFuY2VkIGZlYXR1cmVzXHJcblx0XHRcdFx0d29ya2Zsb3c6IHtcclxuXHRcdFx0XHRcdC4uLkRFRkFVTFRfU0VUVElOR1Mud29ya2Zsb3csXHJcblx0XHRcdFx0XHRlbmFibGVXb3JrZmxvdzogZmFsc2VcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHJld2FyZHM6IHtcclxuXHRcdFx0XHRcdC4uLkRFRkFVTFRfU0VUVElOR1MucmV3YXJkcyxcclxuXHRcdFx0XHRcdGVuYWJsZVJld2FyZHM6IGZhbHNlXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRoYWJpdDoge1xyXG5cdFx0XHRcdFx0Li4uREVGQVVMVF9TRVRUSU5HUy5oYWJpdCxcclxuXHRcdFx0XHRcdGVuYWJsZUhhYml0czogZmFsc2VcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGZpbGVQYXJzaW5nQ29uZmlnOiB7XHJcblx0XHRcdFx0XHQuLi5ERUZBVUxUX1NFVFRJTkdTLmZpbGVQYXJzaW5nQ29uZmlnLFxyXG5cdFx0XHRcdFx0ZW5hYmxlV29ya2VyUHJvY2Vzc2luZzogZmFsc2UsXHJcblx0XHRcdFx0XHRlbmFibGVGaWxlTWV0YWRhdGFQYXJzaW5nOiBmYWxzZSxcclxuXHRcdFx0XHRcdGVuYWJsZVRhZ0Jhc2VkVGFza1BhcnNpbmc6IGZhbHNlXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR0aW1lbGluZVNpZGViYXI6IHtcclxuXHRcdFx0XHRcdC4uLkRFRkFVTFRfU0VUVElOR1MudGltZWxpbmVTaWRlYmFyLFxyXG5cdFx0XHRcdFx0ZW5hYmxlVGltZWxpbmVTaWRlYmFyOiBmYWxzZVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0YmV0YVRlc3Q6IHtcclxuXHRcdFx0XHRcdGVuYWJsZUJhc2VWaWV3OiBmYWxzZVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBhZHZhbmNlZCBjb25maWd1cmF0aW9uIHRlbXBsYXRlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZXRBZHZhbmNlZENvbmZpZygpOiBPbmJvYXJkaW5nQ29uZmlnIHtcclxuXHRcdGNvbnN0IGFkdmFuY2VkVmlld3M6IFZpZXdDb25maWdbXSA9IERFRkFVTFRfU0VUVElOR1Mudmlld0NvbmZpZ3VyYXRpb24uZmlsdGVyKHZpZXcgPT4gXHJcblx0XHRcdFsnaW5ib3gnLCAnZm9yZWNhc3QnLCAncHJvamVjdHMnLCAndGFncycsICdrYW5iYW4nLCAnY2FsZW5kYXInLCAndGFibGUnXS5pbmNsdWRlcyh2aWV3LmlkKVxyXG5cdFx0KTtcclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRtb2RlOiAnYWR2YW5jZWQnLFxyXG5cdFx0XHRuYW1lOiB0KCdBZHZhbmNlZCcpLFxyXG5cdFx0XHRkZXNjcmlwdGlvbjogdCgnUHJvamVjdCBtYW5hZ2VtZW50IHdpdGggZW5oYW5jZWQgd29ya2Zsb3dzJyksXHJcblx0XHRcdGZlYXR1cmVzOiBbXHJcblx0XHRcdFx0dCgnRnVsbCBwcm9ncmVzcyBiYXIgY3VzdG9taXphdGlvbicpLFxyXG5cdFx0XHRcdHQoJ0V4dGVuZGVkIHZpZXdzIChLYW5iYW4sIENhbGVuZGFyLCBUYWJsZSknKSxcclxuXHRcdFx0XHR0KCdQcm9qZWN0IG1hbmFnZW1lbnQgZmVhdHVyZXMnKSxcclxuXHRcdFx0XHR0KCdCYXNpYyB3b3JrZmxvdyBhdXRvbWF0aW9uJyksXHJcblx0XHRcdFx0dCgnVGFzayBzdGF0dXMgc3dpdGNoaW5nJyksXHJcblx0XHRcdFx0dCgnQWR2YW5jZWQgZmlsdGVyaW5nIGFuZCBzb3J0aW5nJylcclxuXHRcdFx0XSxcclxuXHRcdFx0c2V0dGluZ3M6IHtcclxuXHRcdFx0XHQvLyBQcm9ncmVzcyBCYXIgU2V0dGluZ3MgLSBGdWxsIGN1c3RvbWl6YXRpb25cclxuXHRcdFx0XHRwcm9ncmVzc0JhckRpc3BsYXlNb2RlOiBcImJvdGhcIixcclxuXHRcdFx0XHRkaXNwbGF5TW9kZTogXCJicmFja2V0RnJhY3Rpb25cIixcclxuXHRcdFx0XHRzaG93UGVyY2VudGFnZTogdHJ1ZSxcclxuXHRcdFx0XHRjdXN0b21pemVQcm9ncmVzc1JhbmdlczogdHJ1ZSxcclxuXHRcdFx0XHRhbGxvd0N1c3RvbVByb2dyZXNzR29hbDogdHJ1ZSxcclxuXHRcdFx0XHRoaWRlUHJvZ3Jlc3NCYXJCYXNlZE9uQ29uZGl0aW9uczogZmFsc2UsXHJcblxyXG5cdFx0XHRcdC8vIFRhc2sgU3RhdHVzIFNldHRpbmdzIC0gRW5oYW5jZWRcclxuXHRcdFx0XHRlbmFibGVUYXNrU3RhdHVzU3dpdGNoZXI6IHRydWUsXHJcblx0XHRcdFx0ZW5hYmxlQ3ljbGVDb21wbGV0ZVN0YXR1czogdHJ1ZSxcclxuXHRcdFx0XHRlbmFibGVDdXN0b21UYXNrTWFya3M6IGZhbHNlLFxyXG5cclxuXHRcdFx0XHQvLyBWaWV3cyAtIEV4dGVuZGVkIHNldFxyXG5cdFx0XHRcdGVuYWJsZVZpZXc6IHRydWUsXHJcblx0XHRcdFx0ZW5hYmxlSW5saW5lRWRpdG9yOiB0cnVlLFxyXG5cdFx0XHRcdHZpZXdDb25maWd1cmF0aW9uOiBhZHZhbmNlZFZpZXdzLFxyXG5cclxuXHRcdFx0XHQvLyBGZWF0dXJlcyAtIEludGVybWVkaWF0ZVxyXG5cdFx0XHRcdGVuYWJsZURhdGVQaWNrZXI6IHRydWUsXHJcblx0XHRcdFx0ZW5hYmxlUHJpb3JpdHlQaWNrZXI6IHRydWUsXHJcblx0XHRcdFx0cXVpY2tDYXB0dXJlOiB7XHJcblx0XHRcdFx0XHQuLi5ERUZBVUxUX1NFVFRJTkdTLnF1aWNrQ2FwdHVyZSxcclxuXHRcdFx0XHRcdGVuYWJsZVF1aWNrQ2FwdHVyZTogdHJ1ZVxyXG5cdFx0XHRcdH0sXHJcblxyXG5cdFx0XHRcdC8vIFByb2plY3QgTWFuYWdlbWVudFxyXG5cdFx0XHRcdHByb2plY3RDb25maWc6IHtcclxuXHRcdFx0XHRcdC4uLkRFRkFVTFRfU0VUVElOR1MucHJvamVjdENvbmZpZyxcclxuXHRcdFx0XHRcdGVuYWJsZUVuaGFuY2VkUHJvamVjdDogdHJ1ZVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0ZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2U6IHtcclxuXHRcdFx0XHRcdC4uLkRFRkFVTFRfU0VUVElOR1MuZmlsZU1ldGFkYXRhSW5oZXJpdGFuY2UsXHJcblx0XHRcdFx0XHRlbmFibGVkOiB0cnVlXHJcblx0XHRcdFx0fSxcclxuXHJcblx0XHRcdFx0Ly8gQmFzaWMgV29ya2Zsb3dcclxuXHRcdFx0XHR3b3JrZmxvdzoge1xyXG5cdFx0XHRcdFx0Li4uREVGQVVMVF9TRVRUSU5HUy53b3JrZmxvdyxcclxuXHRcdFx0XHRcdGVuYWJsZVdvcmtmbG93OiB0cnVlLFxyXG5cdFx0XHRcdFx0YXV0b0FkZFRpbWVzdGFtcDogdHJ1ZVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0YXV0b0RhdGVNYW5hZ2VyOiB7XHJcblx0XHRcdFx0XHQuLi5ERUZBVUxUX1NFVFRJTkdTLmF1dG9EYXRlTWFuYWdlcixcclxuXHRcdFx0XHRcdGVuYWJsZWQ6IHRydWVcclxuXHRcdFx0XHR9LFxyXG5cclxuXHRcdFx0XHQvLyBUYXNrIE1hbmFnZW1lbnRcclxuXHRcdFx0XHRjb21wbGV0ZWRUYXNrTW92ZXI6IHtcclxuXHRcdFx0XHRcdC4uLkRFRkFVTFRfU0VUVElOR1MuY29tcGxldGVkVGFza01vdmVyLFxyXG5cdFx0XHRcdFx0ZW5hYmxlQ29tcGxldGVkVGFza01vdmVyOiB0cnVlXHJcblx0XHRcdFx0fSxcclxuXHJcblx0XHRcdFx0Ly8gU3RpbGwgZGlzYWJsZWQgZmVhdHVyZXNcclxuXHRcdFx0XHRyZXdhcmRzOiB7XHJcblx0XHRcdFx0XHQuLi5ERUZBVUxUX1NFVFRJTkdTLnJld2FyZHMsXHJcblx0XHRcdFx0XHRlbmFibGVSZXdhcmRzOiBmYWxzZVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0aGFiaXQ6IHtcclxuXHRcdFx0XHRcdC4uLkRFRkFVTFRfU0VUVElOR1MuaGFiaXQsXHJcblx0XHRcdFx0XHRlbmFibGVIYWJpdHM6IGZhbHNlXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRmaWxlUGFyc2luZ0NvbmZpZzoge1xyXG5cdFx0XHRcdFx0Li4uREVGQVVMVF9TRVRUSU5HUy5maWxlUGFyc2luZ0NvbmZpZyxcclxuXHRcdFx0XHRcdGVuYWJsZVdvcmtlclByb2Nlc3Npbmc6IHRydWUsXHJcblx0XHRcdFx0XHRlbmFibGVGaWxlTWV0YWRhdGFQYXJzaW5nOiBmYWxzZVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0dGltZWxpbmVTaWRlYmFyOiB7XHJcblx0XHRcdFx0XHQuLi5ERUZBVUxUX1NFVFRJTkdTLnRpbWVsaW5lU2lkZWJhcixcclxuXHRcdFx0XHRcdGVuYWJsZVRpbWVsaW5lU2lkZWJhcjogZmFsc2VcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgcG93ZXIgdXNlciBjb25maWd1cmF0aW9uIHRlbXBsYXRlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZXRQb3dlclVzZXJDb25maWcoKTogT25ib2FyZGluZ0NvbmZpZyB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRtb2RlOiAncG93ZXInLFxyXG5cdFx0XHRuYW1lOiB0KCdQb3dlciBVc2VyJyksXHJcblx0XHRcdGRlc2NyaXB0aW9uOiB0KCdGdWxsLWZlYXR1cmVkIGV4cGVyaWVuY2Ugd2l0aCBhbGwgY2FwYWJpbGl0aWVzJyksXHJcblx0XHRcdGZlYXR1cmVzOiBbXHJcblx0XHRcdFx0dCgnQWxsIHZpZXdzIGFuZCBhZHZhbmNlZCBjb25maWd1cmF0aW9ucycpLFxyXG5cdFx0XHRcdHQoJ0NvbXBsZXggd29ya2Zsb3cgZGVmaW5pdGlvbnMnKSxcclxuXHRcdFx0XHR0KCdSZXdhcmQgYW5kIGhhYml0IHRyYWNraW5nIHN5c3RlbXMnKSxcclxuXHRcdFx0XHR0KCdQZXJmb3JtYW5jZSBvcHRpbWl6YXRpb25zJyksXHJcblx0XHRcdFx0dCgnQWR2YW5jZWQgaW50ZWdyYXRpb25zJyksXHJcblx0XHRcdFx0dCgnRXhwZXJpbWVudGFsIGZlYXR1cmVzJyksXHJcblx0XHRcdFx0dCgnVGltZWxpbmUgYW5kIGNhbGVuZGFyIHN5bmMnKVxyXG5cdFx0XHRdLFxyXG5cdFx0XHRzZXR0aW5nczoge1xyXG5cdFx0XHRcdC8vIEFsbCBwcm9ncmVzcyBiYXIgZmVhdHVyZXNcclxuXHRcdFx0XHRwcm9ncmVzc0JhckRpc3BsYXlNb2RlOiBcImJvdGhcIixcclxuXHRcdFx0XHRkaXNwbGF5TW9kZTogXCJjdXN0b21cIixcclxuXHRcdFx0XHRzaG93UGVyY2VudGFnZTogdHJ1ZSxcclxuXHRcdFx0XHRjdXN0b21pemVQcm9ncmVzc1JhbmdlczogdHJ1ZSxcclxuXHRcdFx0XHRhbGxvd0N1c3RvbVByb2dyZXNzR29hbDogdHJ1ZSxcclxuXHRcdFx0XHRoaWRlUHJvZ3Jlc3NCYXJCYXNlZE9uQ29uZGl0aW9uczogdHJ1ZSxcclxuXHJcblx0XHRcdFx0Ly8gQWR2YW5jZWQgdGFzayBzdGF0dXNcclxuXHRcdFx0XHRlbmFibGVUYXNrU3RhdHVzU3dpdGNoZXI6IHRydWUsXHJcblx0XHRcdFx0ZW5hYmxlQ3VzdG9tVGFza01hcmtzOiB0cnVlLFxyXG5cdFx0XHRcdGVuYWJsZUN5Y2xlQ29tcGxldGVTdGF0dXM6IHRydWUsXHJcblxyXG5cdFx0XHRcdC8vIEFsbCB2aWV3cyBlbmFibGVkXHJcblx0XHRcdFx0ZW5hYmxlVmlldzogdHJ1ZSxcclxuXHRcdFx0XHRlbmFibGVJbmxpbmVFZGl0b3I6IHRydWUsXHJcblx0XHRcdFx0dmlld0NvbmZpZ3VyYXRpb246IERFRkFVTFRfU0VUVElOR1Mudmlld0NvbmZpZ3VyYXRpb24sXHJcblxyXG5cdFx0XHRcdC8vIEFsbCBmZWF0dXJlcyBlbmFibGVkXHJcblx0XHRcdFx0ZW5hYmxlRGF0ZVBpY2tlcjogdHJ1ZSxcclxuXHRcdFx0XHRlbmFibGVQcmlvcml0eVBpY2tlcjogdHJ1ZSxcclxuXHRcdFx0XHRxdWlja0NhcHR1cmU6IHtcclxuXHRcdFx0XHRcdC4uLkRFRkFVTFRfU0VUVElOR1MucXVpY2tDYXB0dXJlLFxyXG5cdFx0XHRcdFx0ZW5hYmxlUXVpY2tDYXB0dXJlOiB0cnVlLFxyXG5cdFx0XHRcdFx0ZW5hYmxlTWluaW1hbE1vZGU6IHRydWVcclxuXHRcdFx0XHR9LFxyXG5cclxuXHRcdFx0XHQvLyBBZHZhbmNlZCBwcm9qZWN0IGZlYXR1cmVzXHJcblx0XHRcdFx0cHJvamVjdENvbmZpZzoge1xyXG5cdFx0XHRcdFx0Li4uREVGQVVMVF9TRVRUSU5HUy5wcm9qZWN0Q29uZmlnLFxyXG5cdFx0XHRcdFx0ZW5hYmxlRW5oYW5jZWRQcm9qZWN0OiB0cnVlXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRmaWxlTWV0YWRhdGFJbmhlcml0YW5jZToge1xyXG5cdFx0XHRcdFx0Li4uREVGQVVMVF9TRVRUSU5HUy5maWxlTWV0YWRhdGFJbmhlcml0YW5jZSxcclxuXHRcdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0XHRpbmhlcml0RnJvbUZyb250bWF0dGVyOiB0cnVlLFxyXG5cdFx0XHRcdFx0aW5oZXJpdEZyb21Gcm9udG1hdHRlckZvclN1YnRhc2tzOiB0cnVlXHJcblx0XHRcdFx0fSxcclxuXHJcblx0XHRcdFx0Ly8gQWR2YW5jZWQgZmVhdHVyZXNcclxuXHRcdFx0XHR3b3JrZmxvdzoge1xyXG5cdFx0XHRcdFx0Li4uREVGQVVMVF9TRVRUSU5HUy53b3JrZmxvdyxcclxuXHRcdFx0XHRcdGVuYWJsZVdvcmtmbG93OiB0cnVlLFxyXG5cdFx0XHRcdFx0YXV0b0FkZFRpbWVzdGFtcDogdHJ1ZSxcclxuXHRcdFx0XHRcdGNhbGN1bGF0ZVNwZW50VGltZTogdHJ1ZVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0cmV3YXJkczoge1xyXG5cdFx0XHRcdFx0Li4uREVGQVVMVF9TRVRUSU5HUy5yZXdhcmRzLFxyXG5cdFx0XHRcdFx0ZW5hYmxlUmV3YXJkczogdHJ1ZVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0aGFiaXQ6IHtcclxuXHRcdFx0XHRcdC4uLkRFRkFVTFRfU0VUVElOR1MuaGFiaXQsXHJcblx0XHRcdFx0XHRlbmFibGVIYWJpdHM6IHRydWVcclxuXHRcdFx0XHR9LFxyXG5cclxuXHRcdFx0XHQvLyBQZXJmb3JtYW5jZSBvcHRpbWl6YXRpb25zXHJcblx0XHRcdFx0ZmlsZVBhcnNpbmdDb25maWc6IHtcclxuXHRcdFx0XHRcdC4uLkRFRkFVTFRfU0VUVElOR1MuZmlsZVBhcnNpbmdDb25maWcsXHJcblx0XHRcdFx0XHRlbmFibGVXb3JrZXJQcm9jZXNzaW5nOiB0cnVlLFxyXG5cdFx0XHRcdFx0ZW5hYmxlRmlsZU1ldGFkYXRhUGFyc2luZzogdHJ1ZSxcclxuXHRcdFx0XHRcdGVuYWJsZVRhZ0Jhc2VkVGFza1BhcnNpbmc6IHRydWUsXHJcblx0XHRcdFx0XHRlbmFibGVNdGltZU9wdGltaXphdGlvbjogdHJ1ZVxyXG5cdFx0XHRcdH0sXHJcblxyXG5cdFx0XHRcdC8vIEFkdmFuY2VkIGludGVncmF0aW9uc1xyXG5cdFx0XHRcdHRpbWVsaW5lU2lkZWJhcjoge1xyXG5cdFx0XHRcdFx0Li4uREVGQVVMVF9TRVRUSU5HUy50aW1lbGluZVNpZGViYXIsXHJcblx0XHRcdFx0XHRlbmFibGVUaW1lbGluZVNpZGViYXI6IHRydWVcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGF1dG9EYXRlTWFuYWdlcjoge1xyXG5cdFx0XHRcdFx0Li4uREVGQVVMVF9TRVRUSU5HUy5hdXRvRGF0ZU1hbmFnZXIsXHJcblx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0bWFuYWdlQ29tcGxldGVkRGF0ZTogdHJ1ZSxcclxuXHRcdFx0XHRcdG1hbmFnZVN0YXJ0RGF0ZTogdHJ1ZVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0Y29tcGxldGVkVGFza01vdmVyOiB7XHJcblx0XHRcdFx0XHQuLi5ERUZBVUxUX1NFVFRJTkdTLmNvbXBsZXRlZFRhc2tNb3ZlcixcclxuXHRcdFx0XHRcdGVuYWJsZUNvbXBsZXRlZFRhc2tNb3ZlcjogdHJ1ZSxcclxuXHRcdFx0XHRcdGVuYWJsZUF1dG9Nb3ZlOiB0cnVlXHJcblx0XHRcdFx0fSxcclxuXHJcblx0XHRcdFx0Ly8gQmV0YSBmZWF0dXJlc1xyXG5cdFx0XHRcdGJldGFUZXN0OiB7XHJcblx0XHRcdFx0XHRlbmFibGVCYXNlVmlldzogdHJ1ZVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEFwcGx5IGNvbmZpZ3VyYXRpb24gdGVtcGxhdGUgdG8gcGx1Z2luIHNldHRpbmdzIHdpdGggc2FmZSB2aWV3IG1lcmdpbmdcclxuXHQgKi9cclxuXHRhc3luYyBhcHBseUNvbmZpZ3VyYXRpb24obW9kZTogT25ib2FyZGluZ0NvbmZpZ01vZGUpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGNvbnN0IGNvbmZpZ3MgPSB0aGlzLmdldE9uYm9hcmRpbmdDb25maWdzKCk7XHJcblx0XHRjb25zdCBzZWxlY3RlZENvbmZpZyA9IGNvbmZpZ3MuZmluZChjb25maWcgPT4gY29uZmlnLm1vZGUgPT09IG1vZGUpO1xyXG5cclxuXHRcdGlmICghc2VsZWN0ZWRDb25maWcpIHtcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKGBDb25maWd1cmF0aW9uIG1vZGUgJHttb2RlfSBub3QgZm91bmRgKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBQcmVzZXJ2ZSB1c2VyJ3MgY3VzdG9tIHZpZXdzIGJlZm9yZSBhcHBseWluZyBjb25maWd1cmF0aW9uXHJcblx0XHRjb25zdCBjdXJyZW50Vmlld3MgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy52aWV3Q29uZmlndXJhdGlvbiB8fCBbXTtcclxuXHRcdGNvbnN0IHVzZXJDdXN0b21WaWV3cyA9IGN1cnJlbnRWaWV3cy5maWx0ZXIodmlldyA9PiB2aWV3LnR5cGUgPT09ICdjdXN0b20nKTtcclxuXHRcdGNvbnN0IHRlbXBsYXRlVmlld3MgPSBzZWxlY3RlZENvbmZpZy5zZXR0aW5ncy52aWV3Q29uZmlndXJhdGlvbiB8fCBbXTtcclxuXHJcblx0XHQvLyBTbWFydCBtZXJnZToga2VlcCB1c2VyIGN1c3RvbSB2aWV3cywgdXBkYXRlL2FkZCB0ZW1wbGF0ZSB2aWV3c1xyXG5cdFx0Y29uc3QgbWVyZ2VkVmlld3MgPSB0aGlzLm1lcmdlVmlld0NvbmZpZ3VyYXRpb25zKHRlbXBsYXRlVmlld3MsIHVzZXJDdXN0b21WaWV3cyk7XHJcblxyXG5cdFx0Ly8gRGVlcCBtZXJnZSB0aGUgc2VsZWN0ZWQgY29uZmlndXJhdGlvbiB3aXRoIGN1cnJlbnQgc2V0dGluZ3MsIGV4Y2x1ZGluZyB2aWV3Q29uZmlndXJhdGlvblxyXG5cdFx0Y29uc3QgY29uZmlnV2l0aG91dFZpZXdzID0geyAuLi5zZWxlY3RlZENvbmZpZy5zZXR0aW5ncyB9O1xyXG5cdFx0ZGVsZXRlIGNvbmZpZ1dpdGhvdXRWaWV3cy52aWV3Q29uZmlndXJhdGlvbjtcclxuXHRcdFxyXG5cdFx0Y29uc3QgbmV3U2V0dGluZ3MgPSB0aGlzLmRlZXBNZXJnZSh0aGlzLnBsdWdpbi5zZXR0aW5ncywgY29uZmlnV2l0aG91dFZpZXdzKTtcclxuXHRcdFxyXG5cdFx0Ly8gQXBwbHkgdGhlIHNhZmVseSBtZXJnZWQgdmlldyBjb25maWd1cmF0aW9uXHJcblx0XHRuZXdTZXR0aW5ncy52aWV3Q29uZmlndXJhdGlvbiA9IG1lcmdlZFZpZXdzO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSBvbmJvYXJkaW5nIHN0YXR1c1xyXG5cdFx0aWYgKCFuZXdTZXR0aW5ncy5vbmJvYXJkaW5nKSB7XHJcblx0XHRcdG5ld1NldHRpbmdzLm9uYm9hcmRpbmcgPSBERUZBVUxUX1NFVFRJTkdTLm9uYm9hcmRpbmc7XHJcblx0XHR9XHJcblx0XHRuZXdTZXR0aW5ncy5vbmJvYXJkaW5nLmNvbmZpZ01vZGUgPSBtb2RlO1xyXG5cclxuXHRcdC8vIEFwcGx5IG5ldyBzZXR0aW5nc1xyXG5cdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MgPSBuZXdTZXR0aW5ncyBhcyBUYXNrUHJvZ3Jlc3NCYXJTZXR0aW5ncztcclxuXHRcdGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cclxuXHRcdGNvbnNvbGUubG9nKGBBcHBsaWVkICR7bW9kZX0gY29uZmlndXJhdGlvbiB0ZW1wbGF0ZSB3aXRoICR7dXNlckN1c3RvbVZpZXdzLmxlbmd0aH0gdXNlciBjdXN0b20gdmlld3MgcHJlc2VydmVkYCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBNYXJrIG9uYm9hcmRpbmcgYXMgY29tcGxldGVkXHJcblx0ICovXHJcblx0YXN5bmMgY29tcGxldGVPbmJvYXJkaW5nKG1vZGU6IE9uYm9hcmRpbmdDb25maWdNb2RlKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRpZiAoIXRoaXMucGx1Z2luLnNldHRpbmdzLm9uYm9hcmRpbmcpIHtcclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3Mub25ib2FyZGluZyA9IHsuLi5ERUZBVUxUX1NFVFRJTkdTLm9uYm9hcmRpbmchfTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5vbmJvYXJkaW5nLmNvbXBsZXRlZCA9IHRydWU7XHJcblx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5vbmJvYXJkaW5nLmNvbmZpZ01vZGUgPSBtb2RlO1xyXG5cdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3Mub25ib2FyZGluZy5jb21wbGV0ZWRBdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcclxuXHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLm9uYm9hcmRpbmcudmVyc2lvbiA9IHRoaXMucGx1Z2luLm1hbmlmZXN0LnZlcnNpb247XHJcblxyXG5cdFx0YXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRjb25zb2xlLmxvZyhgT25ib2FyZGluZyBjb21wbGV0ZWQgd2l0aCAke21vZGV9IGNvbmZpZ3VyYXRpb25gKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGlmIHVzZXIgc2hvdWxkIHNlZSBvbmJvYXJkaW5nXHJcblx0ICovXHJcblx0c2hvdWxkU2hvd09uYm9hcmRpbmcoKTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gIXRoaXMucGx1Z2luLnNldHRpbmdzLm9uYm9hcmRpbmc/LmNvbXBsZXRlZCAmJiBcclxuXHRcdFx0ICAgIXRoaXMucGx1Z2luLnNldHRpbmdzLm9uYm9hcmRpbmc/LnNraXBPbmJvYXJkaW5nO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2tpcCBvbmJvYXJkaW5nXHJcblx0ICovXHJcblx0YXN5bmMgc2tpcE9uYm9hcmRpbmcoKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRpZiAoIXRoaXMucGx1Z2luLnNldHRpbmdzLm9uYm9hcmRpbmcpIHtcclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3Mub25ib2FyZGluZyA9IHsuLi5ERUZBVUxUX1NFVFRJTkdTLm9uYm9hcmRpbmchfTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5vbmJvYXJkaW5nLnNraXBPbmJvYXJkaW5nID0gdHJ1ZTtcclxuXHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLm9uYm9hcmRpbmcudmVyc2lvbiA9IHRoaXMucGx1Z2luLm1hbmlmZXN0LnZlcnNpb247XHJcblx0XHRhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdGNvbnNvbGUubG9nKCdPbmJvYXJkaW5nIHNraXBwZWQnKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlc2V0IG9uYm9hcmRpbmcgc3RhdHVzIChmb3IgcmVzdGFydCBmdW5jdGlvbmFsaXR5KVxyXG5cdCAqL1xyXG5cdGFzeW5jIHJlc2V0T25ib2FyZGluZygpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGlmICghdGhpcy5wbHVnaW4uc2V0dGluZ3Mub25ib2FyZGluZykge1xyXG5cdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5vbmJvYXJkaW5nID0gey4uLkRFRkFVTFRfU0VUVElOR1Mub25ib2FyZGluZyF9O1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLm9uYm9hcmRpbmcuY29tcGxldGVkID0gZmFsc2U7XHJcblx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5vbmJvYXJkaW5nLnNraXBPbmJvYXJkaW5nID0gZmFsc2U7XHJcblx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5vbmJvYXJkaW5nLmNvbXBsZXRlZEF0ID0gXCJcIjtcclxuXHRcdGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0Y29uc29sZS5sb2coJ09uYm9hcmRpbmcgcmVzZXQnKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBjdXJyZW50IGNvbmZpZ3VyYXRpb24gbW9kZSBkaXNwbGF5IG5hbWVcclxuXHQgKi9cclxuXHRnZXRDdXJyZW50Q29uZmlnTW9kZURpc3BsYXkoKTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IG1vZGUgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5vbmJvYXJkaW5nPy5jb25maWdNb2RlO1xyXG5cdFx0aWYgKCFtb2RlKSByZXR1cm4gdCgnTm90IGNvbmZpZ3VyZWQnKTtcclxuXHJcblx0XHRjb25zdCBjb25maWdzID0gdGhpcy5nZXRPbmJvYXJkaW5nQ29uZmlncygpO1xyXG5cdFx0Y29uc3QgY3VycmVudENvbmZpZyA9IGNvbmZpZ3MuZmluZChjb25maWcgPT4gY29uZmlnLm1vZGUgPT09IG1vZGUpO1xyXG5cdFx0cmV0dXJuIGN1cnJlbnRDb25maWcgPyBjdXJyZW50Q29uZmlnLm5hbWUgOiB0KCdDdXN0b20nKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIE1lcmdlIHZpZXcgY29uZmlndXJhdGlvbnMgc2FmZWx5LCBwcmVzZXJ2aW5nIHVzZXIgY3VzdG9tIHZpZXdzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBtZXJnZVZpZXdDb25maWd1cmF0aW9ucyh0ZW1wbGF0ZVZpZXdzOiBWaWV3Q29uZmlnW10sIHVzZXJDdXN0b21WaWV3czogVmlld0NvbmZpZ1tdKTogVmlld0NvbmZpZ1tdIHtcclxuXHRcdC8vIFN0YXJ0IHdpdGggdGVtcGxhdGUgdmlld3MgKHRoZXNlIGRlZmluZSB3aGljaCBkZWZhdWx0IHZpZXdzIGFyZSBlbmFibGVkIGZvciB0aGlzIG1vZGUpXHJcblx0XHRjb25zdCBtZXJnZWRWaWV3czogVmlld0NvbmZpZ1tdID0gWy4uLnRlbXBsYXRlVmlld3NdO1xyXG5cdFx0XHJcblx0XHQvLyBBZGQgYWxsIHVzZXIgY3VzdG9tIHZpZXdzICh0aGVzZSBhcmUgYWx3YXlzIHByZXNlcnZlZClcclxuXHRcdHVzZXJDdXN0b21WaWV3cy5mb3JFYWNoKHVzZXJWaWV3ID0+IHtcclxuXHRcdFx0Ly8gRW5zdXJlIG5vIGR1cGxpY2F0ZSBJRHMgKHNob3VsZG4ndCBoYXBwZW4gd2l0aCBjdXN0b20gdmlld3MsIGJ1dCBzYWZldHkgZmlyc3QpXHJcblx0XHRcdGlmICghbWVyZ2VkVmlld3MuZmluZCh2aWV3ID0+IHZpZXcuaWQgPT09IHVzZXJWaWV3LmlkKSkge1xyXG5cdFx0XHRcdG1lcmdlZFZpZXdzLnB1c2godXNlclZpZXcpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHRcdFxyXG5cdFx0cmV0dXJuIG1lcmdlZFZpZXdzO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHByZXZpZXcgb2YgY29uZmlndXJhdGlvbiBjaGFuZ2VzIHdpdGhvdXQgYXBwbHlpbmcgdGhlbVxyXG5cdCAqL1xyXG5cdGdldENvbmZpZ3VyYXRpb25QcmV2aWV3KG1vZGU6IE9uYm9hcmRpbmdDb25maWdNb2RlKToge1xyXG5cdFx0dmlld3NUb0FkZDogVmlld0NvbmZpZ1tdO1xyXG5cdFx0dmlld3NUb1VwZGF0ZTogVmlld0NvbmZpZ1tdO1xyXG5cdFx0dXNlckN1c3RvbVZpZXdzUHJlc2VydmVkOiBWaWV3Q29uZmlnW107XHJcblx0XHRzZXR0aW5nc0NoYW5nZXM6IHN0cmluZ1tdO1xyXG5cdH0ge1xyXG5cdFx0Y29uc3QgY29uZmlncyA9IHRoaXMuZ2V0T25ib2FyZGluZ0NvbmZpZ3MoKTtcclxuXHRcdGNvbnN0IHNlbGVjdGVkQ29uZmlnID0gY29uZmlncy5maW5kKGNvbmZpZyA9PiBjb25maWcubW9kZSA9PT0gbW9kZSk7XHJcblx0XHRcclxuXHRcdGlmICghc2VsZWN0ZWRDb25maWcpIHtcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKGBDb25maWd1cmF0aW9uIG1vZGUgJHttb2RlfSBub3QgZm91bmRgKTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBjdXJyZW50Vmlld3MgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy52aWV3Q29uZmlndXJhdGlvbiB8fCBbXTtcclxuXHRcdGNvbnN0IHVzZXJDdXN0b21WaWV3cyA9IGN1cnJlbnRWaWV3cy5maWx0ZXIodmlldyA9PiB2aWV3LnR5cGUgPT09ICdjdXN0b20nKTtcclxuXHRcdGNvbnN0IHRlbXBsYXRlVmlld3MgPSBzZWxlY3RlZENvbmZpZy5zZXR0aW5ncy52aWV3Q29uZmlndXJhdGlvbiB8fCBbXTtcclxuXHRcdFxyXG5cdFx0Y29uc3QgY3VycmVudFZpZXdJZHMgPSBuZXcgU2V0KGN1cnJlbnRWaWV3cy5tYXAodmlldyA9PiB2aWV3LmlkKSk7XHJcblx0XHRjb25zdCB2aWV3c1RvQWRkID0gdGVtcGxhdGVWaWV3cy5maWx0ZXIodmlldyA9PiAhY3VycmVudFZpZXdJZHMuaGFzKHZpZXcuaWQpKTtcclxuXHRcdGNvbnN0IHZpZXdzVG9VcGRhdGUgPSB0ZW1wbGF0ZVZpZXdzLmZpbHRlcih2aWV3ID0+IGN1cnJlbnRWaWV3SWRzLmhhcyh2aWV3LmlkKSk7XHJcblx0XHRcclxuXHRcdC8vIEFuYWx5emUgc2V0dGluZyBjaGFuZ2VzIChzaW1wbGlmaWVkIGZvciBub3cpXHJcblx0XHRjb25zdCBzZXR0aW5nc0NoYW5nZXM6IHN0cmluZ1tdID0gW107XHJcblx0XHRpZiAoc2VsZWN0ZWRDb25maWcuc2V0dGluZ3MuZW5hYmxlVmlldyAhPT0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZW5hYmxlVmlldykge1xyXG5cdFx0XHRzZXR0aW5nc0NoYW5nZXMucHVzaChgVmlld3MgJHtzZWxlY3RlZENvbmZpZy5zZXR0aW5ncy5lbmFibGVWaWV3ID8gJ2VuYWJsZWQnIDogJ2Rpc2FibGVkJ31gKTtcclxuXHRcdH1cclxuXHRcdGlmIChzZWxlY3RlZENvbmZpZy5zZXR0aW5ncy5xdWlja0NhcHR1cmU/LmVuYWJsZVF1aWNrQ2FwdHVyZSAhPT0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlPy5lbmFibGVRdWlja0NhcHR1cmUpIHtcclxuXHRcdFx0c2V0dGluZ3NDaGFuZ2VzLnB1c2goYFF1aWNrIENhcHR1cmUgJHtzZWxlY3RlZENvbmZpZy5zZXR0aW5ncy5xdWlja0NhcHR1cmU/LmVuYWJsZVF1aWNrQ2FwdHVyZSA/ICdlbmFibGVkJyA6ICdkaXNhYmxlZCd9YCk7XHJcblx0XHR9XHJcblx0XHRpZiAoc2VsZWN0ZWRDb25maWcuc2V0dGluZ3Mud29ya2Zsb3c/LmVuYWJsZVdvcmtmbG93ICE9PSB0aGlzLnBsdWdpbi5zZXR0aW5ncy53b3JrZmxvdz8uZW5hYmxlV29ya2Zsb3cpIHtcclxuXHRcdFx0c2V0dGluZ3NDaGFuZ2VzLnB1c2goYFdvcmtmbG93ICR7c2VsZWN0ZWRDb25maWcuc2V0dGluZ3Mud29ya2Zsb3c/LmVuYWJsZVdvcmtmbG93ID8gJ2VuYWJsZWQnIDogJ2Rpc2FibGVkJ31gKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHR2aWV3c1RvQWRkLFxyXG5cdFx0XHR2aWV3c1RvVXBkYXRlLFxyXG5cdFx0XHR1c2VyQ3VzdG9tVmlld3NQcmVzZXJ2ZWQ6IHVzZXJDdXN0b21WaWV3cyxcclxuXHRcdFx0c2V0dGluZ3NDaGFuZ2VzXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRGVlcCBtZXJnZSB1dGlsaXR5IGZ1bmN0aW9uXHJcblx0ICovXHJcblx0cHJpdmF0ZSBkZWVwTWVyZ2UodGFyZ2V0OiBhbnksIHNvdXJjZTogYW55KTogYW55IHtcclxuXHRcdGNvbnN0IHJlc3VsdCA9IHsgLi4udGFyZ2V0IH07XHJcblx0XHRcclxuXHRcdGZvciAoY29uc3Qga2V5IGluIHNvdXJjZSkge1xyXG5cdFx0XHRpZiAoc291cmNlLmhhc093blByb3BlcnR5KGtleSkpIHtcclxuXHRcdFx0XHRpZiAoc291cmNlW2tleV0gJiYgdHlwZW9mIHNvdXJjZVtrZXldID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheShzb3VyY2Vba2V5XSkpIHtcclxuXHRcdFx0XHRcdHJlc3VsdFtrZXldID0gdGhpcy5kZWVwTWVyZ2UocmVzdWx0W2tleV0gfHwge30sIHNvdXJjZVtrZXldKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0cmVzdWx0W2tleV0gPSBzb3VyY2Vba2V5XTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0cmV0dXJuIHJlc3VsdDtcclxuXHR9XHJcbn0iXX0=