import { __awaiter } from "tslib";
import { ItemView } from "obsidian";
import { t } from "@/translations/helper";
import { OnboardingConfigManager } from "@/managers/onboarding-manager";
import { SettingsChangeDetector } from "@/services/settings-change-detector";
import { OnboardingController, OnboardingStep } from "./OnboardingController";
import { OnboardingLayout } from "./OnboardingLayout";
// Import step components
import { IntroStep } from "./steps/IntroStep";
import { ModeSelectionStep } from "./steps/ModeSelectionStep";
import { FluentOverviewStep } from "./steps/FluentOverviewStep";
import { FluentWorkspaceSelectorStep } from "./steps/FluentWorkspaceSelectorStep";
import { FluentMainNavigationStep } from "./steps/FluentMainNavigationStep";
import { FluentProjectSectionStep } from "./steps/FluentProjectSectionStep";
import { FluentOtherViewsStep } from "./steps/FluentOtherViewsStep";
import { FluentTopNavigationStep } from "./steps/FluentTopNavigationStep";
import { PlacementStep } from "./steps/PlacementStep";
import { UserLevelStep } from "./steps/UserLevelStep";
import { FileFilterStep } from "./steps/FileFilterStep";
import { ConfigPreviewStep } from "./steps/ConfigPreviewStep";
import { TaskGuideStep } from "./steps/TaskGuideStep";
import { CompleteStep } from "./steps/CompleteStep";
import { SettingsCheckStep } from "./steps/SettingsCheckStep";
import { ConfigCheckTransition } from "@/components/features/onboarding/steps/intro/ConfigCheckTransition";
export const ONBOARDING_VIEW_TYPE = "task-genius-onboarding";
/**
 * Onboarding View - Refactored with new architecture
 *
 * Architecture:
 * - OnboardingController: Manages state and navigation
 * - OnboardingLayout: Manages UI layout (header, content, footer)
 * - Step Components: Each step is a separate component
 *
 * Flow:
 * 1. Controller manages state changes
 * 2. View listens to controller events
 * 3. View renders appropriate step component
 */
export class OnboardingView extends ItemView {
    constructor(leaf, plugin, onComplete) {
        super(leaf);
        this.plugin = plugin;
        this.configManager = new OnboardingConfigManager(plugin);
        this.settingsDetector = new SettingsChangeDetector(plugin);
        this.onComplete = onComplete;
        // Initialize controller with initial state
        const hasUserChanges = this.settingsDetector.hasUserMadeChanges();
        this.controller = new OnboardingController({
            currentStep: OnboardingStep.INTRO,
            userHasChanges: hasUserChanges,
            changesSummary: this.settingsDetector.getChangesSummary(),
            uiMode: "fluent",
            useSideLeaves: true,
        });
        // Setup event listeners
        this.setupControllerListeners();
    }
    getViewType() {
        return ONBOARDING_VIEW_TYPE;
    }
    getDisplayText() {
        return t("Setup");
    }
    getIcon() {
        return "task-genius";
    }
    onOpen() {
        return __awaiter(this, void 0, void 0, function* () {
            // Create layout
            this.layout = new OnboardingLayout(this.containerEl, this.controller, {
                onNext: () => __awaiter(this, void 0, void 0, function* () { return this.handleNext(); }),
                onBack: () => __awaiter(this, void 0, void 0, function* () { return this.handleBack(); }),
                onSkip: () => __awaiter(this, void 0, void 0, function* () { return this.handleSkip(); }),
            });
            // Render initial step
            this.renderCurrentStep();
        });
    }
    onClose() {
        return __awaiter(this, void 0, void 0, function* () {
            // Cleanup
            this.containerEl.empty();
        });
    }
    /**
     * Setup controller event listeners
     */
    setupControllerListeners() {
        this.controller.on("step-changed", () => {
            this.renderCurrentStep();
        });
        this.controller.on("completed", () => __awaiter(this, void 0, void 0, function* () {
            yield this.completeOnboarding();
        }));
    }
    /**
     * Render the current step
     */
    renderCurrentStep() {
        const step = this.controller.getCurrentStep();
        console.log("Rendering step:", OnboardingStep[step]);
        // Clear header and content - ensure complete clearing
        this.layout.clearHeader();
        this.layout.clearContent();
        // Force DOM update by using requestAnimationFrame
        requestAnimationFrame(() => {
            // Get header and content elements
            const headerEl = this.layout.getHeaderElement();
            const contentEl = this.layout.getContentElement();
            const footerEl = this.layout.getFooterElement();
            // Render appropriate step
            switch (step) {
                case OnboardingStep.INTRO:
                    IntroStep.render(headerEl, contentEl, footerEl, this.controller);
                    break;
                case OnboardingStep.MODE_SELECT:
                    ModeSelectionStep.render(headerEl, contentEl, this.controller);
                    break;
                case OnboardingStep.FLUENT_OVERVIEW:
                    FluentOverviewStep.render(headerEl, contentEl, this.controller);
                    break;
                case OnboardingStep.FLUENT_WS_SELECTOR:
                    FluentWorkspaceSelectorStep.render(headerEl, contentEl, this.controller);
                    break;
                case OnboardingStep.FLUENT_MAIN_NAV:
                    FluentMainNavigationStep.render(headerEl, contentEl, this.controller);
                    break;
                case OnboardingStep.FLUENT_PROJECTS:
                    FluentProjectSectionStep.render(headerEl, contentEl, this.controller);
                    break;
                case OnboardingStep.FLUENT_OTHER_VIEWS:
                    FluentOtherViewsStep.render(headerEl, contentEl, this.controller);
                    break;
                case OnboardingStep.FLUENT_TOPNAV:
                    FluentTopNavigationStep.render(headerEl, contentEl, this.controller);
                    break;
                case OnboardingStep.FLUENT_PLACEMENT:
                    PlacementStep.render(headerEl, contentEl, this.controller);
                    break;
                case OnboardingStep.SETTINGS_CHECK:
                    SettingsCheckStep.render(headerEl, contentEl, this.controller);
                    break;
                case OnboardingStep.USER_LEVEL_SELECT:
                    UserLevelStep.render(headerEl, contentEl, this.controller, this.configManager);
                    break;
                case OnboardingStep.FILE_FILTER:
                    FileFilterStep.render(headerEl, contentEl, this.controller, this.plugin);
                    break;
                case OnboardingStep.CONFIG_PREVIEW:
                    ConfigPreviewStep.render(headerEl, contentEl, this.controller, this.configManager);
                    break;
                case OnboardingStep.TASK_CREATION_GUIDE:
                    TaskGuideStep.render(headerEl, contentEl, this.controller, this.plugin);
                    break;
                case OnboardingStep.COMPLETE:
                    CompleteStep.render(headerEl, contentEl, this.controller);
                    break;
            }
        });
    }
    /**
     * Handle next button click
     */
    handleNext() {
        return __awaiter(this, void 0, void 0, function* () {
            const step = this.controller.getCurrentStep();
            const state = this.controller.getState();
            // Show config check transition only when entering Settings Check from:
            // - Mode Select with Legacy
            // - The final Fluent step (Placement selection)
            if (step === OnboardingStep.MODE_SELECT) {
                if (state.uiMode === "legacy" && state.userHasChanges) {
                    // Clear header before showing transition to avoid residual UI
                    this.layout.clearHeader();
                    yield this.showConfigCheckTransition();
                }
            }
            if (step === OnboardingStep.FLUENT_PLACEMENT) {
                if (state.userHasChanges) {
                    // Clear header before showing transition to avoid residual UI
                    this.layout.clearHeader();
                    yield this.showConfigCheckTransition();
                }
            }
            // Special handling for SETTINGS_CHECK step
            if (step === OnboardingStep.SETTINGS_CHECK) {
                if (state.settingsCheckAction === "keep") {
                    // User chose to keep settings, skip onboarding
                    yield this.configManager.skipOnboarding();
                    this.onComplete();
                    this.leaf.detach();
                    return;
                }
                // If "wizard", continue to next step normally
            }
            // Apply configuration when moving to preview
            if (step === OnboardingStep.USER_LEVEL_SELECT &&
                this.controller.canGoNext()) {
                const config = state.selectedConfig;
                if (config) {
                    try {
                        yield this.applyArchitectureSelections();
                        yield this.configManager.applyConfiguration(config.mode);
                    }
                    catch (error) {
                        console.error("Failed to apply configuration:", error);
                        // Continue anyway, user can adjust in settings
                    }
                }
            }
            // Navigate to next step
            const success = yield this.controller.next();
            console.log("handleNext - Navigation result:", success);
            console.log("handleNext - New step:", OnboardingStep[this.controller.getCurrentStep()]);
        });
    }
    /**
     * Show config check transition animation
     */
    showConfigCheckTransition() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                // Import dynamically to avoid circular dependency
                const contentEl = this.layout.getContentElement();
                const state = this.controller.getState();
                // Clear content and show transition
                contentEl.empty();
                new ConfigCheckTransition(contentEl, () => {
                    resolve();
                }, state.userHasChanges);
            });
        });
    }
    /**
     * Handle back button click
     */
    handleBack() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.controller.back();
        });
    }
    /**
     * Handle skip button click
     */
    handleSkip() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.configManager.skipOnboarding();
            this.onComplete();
            this.leaf.detach();
        });
    }
    /**
     * Apply architecture selections (UI mode and sideleaves)
     */
    applyArchitectureSelections() {
        return __awaiter(this, void 0, void 0, function* () {
            const state = this.controller.getState();
            const isFluent = state.uiMode === "fluent";
            if (!this.plugin.settings.fluentView) {
                this.plugin.settings.experimental = {
                    enableV2: false,
                    showV2Ribbon: false,
                };
            }
            this.plugin.settings.fluentView.enableFluent = isFluent;
            // Prepare v2 config and set placement option when Fluent is chosen
            if (!this.plugin.settings.fluentView) {
                this.plugin.settings.fluentView.fluentConfig = {
                    enableWorkspaces: true,
                    defaultWorkspace: "default",
                    showTopNavigation: true,
                    showNewSidebar: true,
                    allowViewSwitching: true,
                    persistViewMode: true,
                    maxOtherViewsBeforeOverflow: 5,
                };
            }
            if (isFluent && this.plugin.settings.fluentView) {
                this.plugin.settings.fluentView.useWorkspaceSideLeaves =
                    !!state.useSideLeaves;
            }
            yield this.plugin.saveSettings();
        });
    }
    /**
     * Complete onboarding process
     */
    completeOnboarding() {
        return __awaiter(this, void 0, void 0, function* () {
            const state = this.controller.getState();
            const config = state.selectedConfig;
            if (!config || state.isCompleting)
                return;
            this.controller.updateState({ isCompleting: true });
            try {
                // Mark onboarding as completed
                yield this.configManager.completeOnboarding(config.mode);
                // Close view and trigger callback
                this.onComplete();
                this.leaf.detach();
            }
            catch (error) {
                console.error("Failed to complete onboarding:", error);
                this.controller.updateState({ isCompleting: false });
            }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT25ib2FyZGluZ1ZpZXcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJPbmJvYXJkaW5nVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFFLFFBQVEsRUFBaUIsTUFBTSxVQUFVLENBQUM7QUFFbkQsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzFDLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxjQUFjLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUM5RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUV0RCx5QkFBeUI7QUFDekIsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzlELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ2hFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3BFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDdEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3hELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzlELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDcEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDOUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0VBQW9FLENBQUM7QUFFM0csTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsd0JBQXdCLENBQUM7QUFFN0Q7Ozs7Ozs7Ozs7OztHQVlHO0FBQ0gsTUFBTSxPQUFPLGNBQWUsU0FBUSxRQUFRO0lBVTNDLFlBQ0MsSUFBbUIsRUFDbkIsTUFBNkIsRUFDN0IsVUFBc0I7UUFFdEIsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ1osSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3pELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLHNCQUFzQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzNELElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO1FBRTdCLDJDQUEyQztRQUMzQyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUNsRSxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksb0JBQW9CLENBQUM7WUFDMUMsV0FBVyxFQUFFLGNBQWMsQ0FBQyxLQUFLO1lBQ2pDLGNBQWMsRUFBRSxjQUFjO1lBQzlCLGNBQWMsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLEVBQUU7WUFDekQsTUFBTSxFQUFFLFFBQVE7WUFDaEIsYUFBYSxFQUFFLElBQUk7U0FDbkIsQ0FBQyxDQUFDO1FBRUgsd0JBQXdCO1FBQ3hCLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO0lBQ2pDLENBQUM7SUFFRCxXQUFXO1FBQ1YsT0FBTyxvQkFBb0IsQ0FBQztJQUM3QixDQUFDO0lBRUQsY0FBYztRQUNiLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ25CLENBQUM7SUFFRCxPQUFPO1FBQ04sT0FBTyxhQUFhLENBQUM7SUFDdEIsQ0FBQztJQUVLLE1BQU07O1lBQ1gsZ0JBQWdCO1lBQ2hCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUU7Z0JBQ3JFLE1BQU0sRUFBRSxHQUFTLEVBQUUsZ0RBQUMsT0FBQSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUEsR0FBQTtnQkFDckMsTUFBTSxFQUFFLEdBQVMsRUFBRSxnREFBQyxPQUFBLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQSxHQUFBO2dCQUNyQyxNQUFNLEVBQUUsR0FBUyxFQUFFLGdEQUFDLE9BQUEsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBLEdBQUE7YUFDckMsQ0FBQyxDQUFDO1lBRUgsc0JBQXNCO1lBQ3RCLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQzFCLENBQUM7S0FBQTtJQUVLLE9BQU87O1lBQ1osVUFBVTtZQUNWLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDMUIsQ0FBQztLQUFBO0lBRUQ7O09BRUc7SUFDSyx3QkFBd0I7UUFDL0IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtZQUN2QyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUMxQixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxHQUFTLEVBQUU7WUFDMUMsTUFBTSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUNqQyxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ0ssaUJBQWlCO1FBQ3hCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDOUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUVyRCxzREFBc0Q7UUFDdEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUMxQixJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBRTNCLGtEQUFrRDtRQUNsRCxxQkFBcUIsQ0FBQyxHQUFHLEVBQUU7WUFDMUIsa0NBQWtDO1lBQ2xDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUNoRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDbEQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBRWhELDBCQUEwQjtZQUMxQixRQUFRLElBQUksRUFBRTtnQkFDYixLQUFLLGNBQWMsQ0FBQyxLQUFLO29CQUN4QixTQUFTLENBQUMsTUFBTSxDQUNmLFFBQVEsRUFDUixTQUFTLEVBQ1QsUUFBUSxFQUNSLElBQUksQ0FBQyxVQUFVLENBQ2YsQ0FBQztvQkFDRixNQUFNO2dCQUVQLEtBQUssY0FBYyxDQUFDLFdBQVc7b0JBQzlCLGlCQUFpQixDQUFDLE1BQU0sQ0FDdkIsUUFBUSxFQUNSLFNBQVMsRUFDVCxJQUFJLENBQUMsVUFBVSxDQUNmLENBQUM7b0JBQ0YsTUFBTTtnQkFFUCxLQUFLLGNBQWMsQ0FBQyxlQUFlO29CQUNsQyxrQkFBa0IsQ0FBQyxNQUFNLENBQ3hCLFFBQVEsRUFDUixTQUFTLEVBQ1QsSUFBSSxDQUFDLFVBQVUsQ0FDZixDQUFDO29CQUNGLE1BQU07Z0JBQ1AsS0FBSyxjQUFjLENBQUMsa0JBQWtCO29CQUNyQywyQkFBMkIsQ0FBQyxNQUFNLENBQ2pDLFFBQVEsRUFDUixTQUFTLEVBQ1QsSUFBSSxDQUFDLFVBQVUsQ0FDZixDQUFDO29CQUNGLE1BQU07Z0JBQ1AsS0FBSyxjQUFjLENBQUMsZUFBZTtvQkFDbEMsd0JBQXdCLENBQUMsTUFBTSxDQUM5QixRQUFRLEVBQ1IsU0FBUyxFQUNULElBQUksQ0FBQyxVQUFVLENBQ2YsQ0FBQztvQkFDRixNQUFNO2dCQUNQLEtBQUssY0FBYyxDQUFDLGVBQWU7b0JBQ2xDLHdCQUF3QixDQUFDLE1BQU0sQ0FDOUIsUUFBUSxFQUNSLFNBQVMsRUFDVCxJQUFJLENBQUMsVUFBVSxDQUNmLENBQUM7b0JBQ0YsTUFBTTtnQkFDUCxLQUFLLGNBQWMsQ0FBQyxrQkFBa0I7b0JBQ3JDLG9CQUFvQixDQUFDLE1BQU0sQ0FDMUIsUUFBUSxFQUNSLFNBQVMsRUFDVCxJQUFJLENBQUMsVUFBVSxDQUNmLENBQUM7b0JBQ0YsTUFBTTtnQkFDUCxLQUFLLGNBQWMsQ0FBQyxhQUFhO29CQUNoQyx1QkFBdUIsQ0FBQyxNQUFNLENBQzdCLFFBQVEsRUFDUixTQUFTLEVBQ1QsSUFBSSxDQUFDLFVBQVUsQ0FDZixDQUFDO29CQUNGLE1BQU07Z0JBQ1AsS0FBSyxjQUFjLENBQUMsZ0JBQWdCO29CQUNuQyxhQUFhLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUMzRCxNQUFNO2dCQUVQLEtBQUssY0FBYyxDQUFDLGNBQWM7b0JBQ2pDLGlCQUFpQixDQUFDLE1BQU0sQ0FDdkIsUUFBUSxFQUNSLFNBQVMsRUFDVCxJQUFJLENBQUMsVUFBVSxDQUNmLENBQUM7b0JBQ0YsTUFBTTtnQkFFUCxLQUFLLGNBQWMsQ0FBQyxpQkFBaUI7b0JBQ3BDLGFBQWEsQ0FBQyxNQUFNLENBQ25CLFFBQVEsRUFDUixTQUFTLEVBQ1QsSUFBSSxDQUFDLFVBQVUsRUFDZixJQUFJLENBQUMsYUFBYSxDQUNsQixDQUFDO29CQUNGLE1BQU07Z0JBRVAsS0FBSyxjQUFjLENBQUMsV0FBVztvQkFDOUIsY0FBYyxDQUFDLE1BQU0sQ0FDcEIsUUFBUSxFQUNSLFNBQVMsRUFDVCxJQUFJLENBQUMsVUFBVSxFQUNmLElBQUksQ0FBQyxNQUFNLENBQ1gsQ0FBQztvQkFDRixNQUFNO2dCQUVQLEtBQUssY0FBYyxDQUFDLGNBQWM7b0JBQ2pDLGlCQUFpQixDQUFDLE1BQU0sQ0FDdkIsUUFBUSxFQUNSLFNBQVMsRUFDVCxJQUFJLENBQUMsVUFBVSxFQUNmLElBQUksQ0FBQyxhQUFhLENBQ2xCLENBQUM7b0JBQ0YsTUFBTTtnQkFFUCxLQUFLLGNBQWMsQ0FBQyxtQkFBbUI7b0JBQ3RDLGFBQWEsQ0FBQyxNQUFNLENBQ25CLFFBQVEsRUFDUixTQUFTLEVBQ1QsSUFBSSxDQUFDLFVBQVUsRUFDZixJQUFJLENBQUMsTUFBTSxDQUNYLENBQUM7b0JBQ0YsTUFBTTtnQkFFUCxLQUFLLGNBQWMsQ0FBQyxRQUFRO29CQUMzQixZQUFZLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUMxRCxNQUFNO2FBQ1A7UUFDRixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRDs7T0FFRztJQUNXLFVBQVU7O1lBQ3ZCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDOUMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUV6Qyx1RUFBdUU7WUFDdkUsNEJBQTRCO1lBQzVCLGdEQUFnRDtZQUNoRCxJQUFJLElBQUksS0FBSyxjQUFjLENBQUMsV0FBVyxFQUFFO2dCQUN4QyxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssUUFBUSxJQUFJLEtBQUssQ0FBQyxjQUFjLEVBQUU7b0JBQ3RELDhEQUE4RDtvQkFDOUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDMUIsTUFBTSxJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQztpQkFDdkM7YUFDRDtZQUNELElBQUksSUFBSSxLQUFLLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRTtnQkFDN0MsSUFBSSxLQUFLLENBQUMsY0FBYyxFQUFFO29CQUN6Qiw4REFBOEQ7b0JBQzlELElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUM7b0JBQzFCLE1BQU0sSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUM7aUJBQ3ZDO2FBQ0Q7WUFFRCwyQ0FBMkM7WUFDM0MsSUFBSSxJQUFJLEtBQUssY0FBYyxDQUFDLGNBQWMsRUFBRTtnQkFDM0MsSUFBSSxLQUFLLENBQUMsbUJBQW1CLEtBQUssTUFBTSxFQUFFO29CQUN6QywrQ0FBK0M7b0JBQy9DLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLEVBQUUsQ0FBQztvQkFDMUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO29CQUNsQixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUNuQixPQUFPO2lCQUNQO2dCQUNELDhDQUE4QzthQUM5QztZQUVELDZDQUE2QztZQUM3QyxJQUNDLElBQUksS0FBSyxjQUFjLENBQUMsaUJBQWlCO2dCQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxFQUMxQjtnQkFDRCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDO2dCQUNwQyxJQUFJLE1BQU0sRUFBRTtvQkFDWCxJQUFJO3dCQUNILE1BQU0sSUFBSSxDQUFDLDJCQUEyQixFQUFFLENBQUM7d0JBQ3pDLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7cUJBQ3pEO29CQUFDLE9BQU8sS0FBSyxFQUFFO3dCQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsZ0NBQWdDLEVBQUUsS0FBSyxDQUFDLENBQUM7d0JBQ3ZELCtDQUErQztxQkFDL0M7aUJBQ0Q7YUFDRDtZQUVELHdCQUF3QjtZQUN4QixNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDN0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQ0FBaUMsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUN4RCxPQUFPLENBQUMsR0FBRyxDQUNWLHdCQUF3QixFQUN4QixjQUFjLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUNoRCxDQUFDO1FBQ0gsQ0FBQztLQUFBO0lBRUQ7O09BRUc7SUFDVyx5QkFBeUI7O1lBQ3RDLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQkFDOUIsa0RBQWtEO2dCQUNsRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLENBQUM7Z0JBQ2xELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBRXpDLG9DQUFvQztnQkFDcEMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUVsQixJQUFJLHFCQUFxQixDQUN4QixTQUFTLEVBQ1QsR0FBRyxFQUFFO29CQUNKLE9BQU8sRUFBRSxDQUFDO2dCQUNYLENBQUMsRUFDRCxLQUFLLENBQUMsY0FBYyxDQUNwQixDQUFDO1lBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDO0tBQUE7SUFFRDs7T0FFRztJQUNXLFVBQVU7O1lBQ3ZCLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUM5QixDQUFDO0tBQUE7SUFFRDs7T0FFRztJQUNXLFVBQVU7O1lBQ3ZCLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUMxQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDbEIsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNwQixDQUFDO0tBQUE7SUFFRDs7T0FFRztJQUNXLDJCQUEyQjs7WUFDeEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUN6QyxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsTUFBTSxLQUFLLFFBQVEsQ0FBQztZQUUzQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFO2dCQUNwQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQWdCLENBQUMsWUFBWSxHQUFHO29CQUM1QyxRQUFRLEVBQUUsS0FBSztvQkFDZixZQUFZLEVBQUUsS0FBSztpQkFDbkIsQ0FBQzthQUNGO1lBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVyxDQUFDLFlBQVksR0FBRyxRQUFRLENBQUM7WUFFekQsbUVBQW1FO1lBQ25FLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUU7Z0JBQ3BDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQWtCLENBQUMsWUFBWSxHQUFHO29CQUN2RCxnQkFBZ0IsRUFBRSxJQUFJO29CQUN0QixnQkFBZ0IsRUFBRSxTQUFTO29CQUMzQixpQkFBaUIsRUFBRSxJQUFJO29CQUN2QixjQUFjLEVBQUUsSUFBSTtvQkFDcEIsa0JBQWtCLEVBQUUsSUFBSTtvQkFDeEIsZUFBZSxFQUFFLElBQUk7b0JBQ3JCLDJCQUEyQixFQUFFLENBQUM7aUJBQzlCLENBQUM7YUFDRjtZQUVELElBQUksUUFBUSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRTtnQkFDaEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLHNCQUFzQjtvQkFDckQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUM7YUFDdkI7WUFFRCxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDbEMsQ0FBQztLQUFBO0lBRUQ7O09BRUc7SUFDVyxrQkFBa0I7O1lBQy9CLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDekMsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQztZQUVwQyxJQUFJLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxZQUFZO2dCQUFFLE9BQU87WUFFMUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUVwRCxJQUFJO2dCQUNILCtCQUErQjtnQkFDL0IsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFFekQsa0NBQWtDO2dCQUNsQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ2xCLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7YUFDbkI7WUFBQyxPQUFPLEtBQUssRUFBRTtnQkFDZixPQUFPLENBQUMsS0FBSyxDQUFDLGdDQUFnQyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUN2RCxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO2FBQ3JEO1FBQ0YsQ0FBQztLQUFBO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBJdGVtVmlldywgV29ya3NwYWNlTGVhZiB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgdHlwZSBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHsgT25ib2FyZGluZ0NvbmZpZ01hbmFnZXIgfSBmcm9tIFwiQC9tYW5hZ2Vycy9vbmJvYXJkaW5nLW1hbmFnZXJcIjtcclxuaW1wb3J0IHsgU2V0dGluZ3NDaGFuZ2VEZXRlY3RvciB9IGZyb20gXCJAL3NlcnZpY2VzL3NldHRpbmdzLWNoYW5nZS1kZXRlY3RvclwiO1xyXG5pbXBvcnQgeyBPbmJvYXJkaW5nQ29udHJvbGxlciwgT25ib2FyZGluZ1N0ZXAgfSBmcm9tIFwiLi9PbmJvYXJkaW5nQ29udHJvbGxlclwiO1xyXG5pbXBvcnQgeyBPbmJvYXJkaW5nTGF5b3V0IH0gZnJvbSBcIi4vT25ib2FyZGluZ0xheW91dFwiO1xyXG5cclxuLy8gSW1wb3J0IHN0ZXAgY29tcG9uZW50c1xyXG5pbXBvcnQgeyBJbnRyb1N0ZXAgfSBmcm9tIFwiLi9zdGVwcy9JbnRyb1N0ZXBcIjtcclxuaW1wb3J0IHsgTW9kZVNlbGVjdGlvblN0ZXAgfSBmcm9tIFwiLi9zdGVwcy9Nb2RlU2VsZWN0aW9uU3RlcFwiO1xyXG5pbXBvcnQgeyBGbHVlbnRPdmVydmlld1N0ZXAgfSBmcm9tIFwiLi9zdGVwcy9GbHVlbnRPdmVydmlld1N0ZXBcIjtcclxuaW1wb3J0IHsgRmx1ZW50V29ya3NwYWNlU2VsZWN0b3JTdGVwIH0gZnJvbSBcIi4vc3RlcHMvRmx1ZW50V29ya3NwYWNlU2VsZWN0b3JTdGVwXCI7XHJcbmltcG9ydCB7IEZsdWVudE1haW5OYXZpZ2F0aW9uU3RlcCB9IGZyb20gXCIuL3N0ZXBzL0ZsdWVudE1haW5OYXZpZ2F0aW9uU3RlcFwiO1xyXG5pbXBvcnQgeyBGbHVlbnRQcm9qZWN0U2VjdGlvblN0ZXAgfSBmcm9tIFwiLi9zdGVwcy9GbHVlbnRQcm9qZWN0U2VjdGlvblN0ZXBcIjtcclxuaW1wb3J0IHsgRmx1ZW50T3RoZXJWaWV3c1N0ZXAgfSBmcm9tIFwiLi9zdGVwcy9GbHVlbnRPdGhlclZpZXdzU3RlcFwiO1xyXG5pbXBvcnQgeyBGbHVlbnRUb3BOYXZpZ2F0aW9uU3RlcCB9IGZyb20gXCIuL3N0ZXBzL0ZsdWVudFRvcE5hdmlnYXRpb25TdGVwXCI7XHJcbmltcG9ydCB7IFBsYWNlbWVudFN0ZXAgfSBmcm9tIFwiLi9zdGVwcy9QbGFjZW1lbnRTdGVwXCI7XHJcbmltcG9ydCB7IFVzZXJMZXZlbFN0ZXAgfSBmcm9tIFwiLi9zdGVwcy9Vc2VyTGV2ZWxTdGVwXCI7XHJcbmltcG9ydCB7IEZpbGVGaWx0ZXJTdGVwIH0gZnJvbSBcIi4vc3RlcHMvRmlsZUZpbHRlclN0ZXBcIjtcclxuaW1wb3J0IHsgQ29uZmlnUHJldmlld1N0ZXAgfSBmcm9tIFwiLi9zdGVwcy9Db25maWdQcmV2aWV3U3RlcFwiO1xyXG5pbXBvcnQgeyBUYXNrR3VpZGVTdGVwIH0gZnJvbSBcIi4vc3RlcHMvVGFza0d1aWRlU3RlcFwiO1xyXG5pbXBvcnQgeyBDb21wbGV0ZVN0ZXAgfSBmcm9tIFwiLi9zdGVwcy9Db21wbGV0ZVN0ZXBcIjtcclxuaW1wb3J0IHsgU2V0dGluZ3NDaGVja1N0ZXAgfSBmcm9tIFwiLi9zdGVwcy9TZXR0aW5nc0NoZWNrU3RlcFwiO1xyXG5pbXBvcnQgeyBDb25maWdDaGVja1RyYW5zaXRpb24gfSBmcm9tIFwiQC9jb21wb25lbnRzL2ZlYXR1cmVzL29uYm9hcmRpbmcvc3RlcHMvaW50cm8vQ29uZmlnQ2hlY2tUcmFuc2l0aW9uXCI7XHJcblxyXG5leHBvcnQgY29uc3QgT05CT0FSRElOR19WSUVXX1RZUEUgPSBcInRhc2stZ2VuaXVzLW9uYm9hcmRpbmdcIjtcclxuXHJcbi8qKlxyXG4gKiBPbmJvYXJkaW5nIFZpZXcgLSBSZWZhY3RvcmVkIHdpdGggbmV3IGFyY2hpdGVjdHVyZVxyXG4gKlxyXG4gKiBBcmNoaXRlY3R1cmU6XHJcbiAqIC0gT25ib2FyZGluZ0NvbnRyb2xsZXI6IE1hbmFnZXMgc3RhdGUgYW5kIG5hdmlnYXRpb25cclxuICogLSBPbmJvYXJkaW5nTGF5b3V0OiBNYW5hZ2VzIFVJIGxheW91dCAoaGVhZGVyLCBjb250ZW50LCBmb290ZXIpXHJcbiAqIC0gU3RlcCBDb21wb25lbnRzOiBFYWNoIHN0ZXAgaXMgYSBzZXBhcmF0ZSBjb21wb25lbnRcclxuICpcclxuICogRmxvdzpcclxuICogMS4gQ29udHJvbGxlciBtYW5hZ2VzIHN0YXRlIGNoYW5nZXNcclxuICogMi4gVmlldyBsaXN0ZW5zIHRvIGNvbnRyb2xsZXIgZXZlbnRzXHJcbiAqIDMuIFZpZXcgcmVuZGVycyBhcHByb3ByaWF0ZSBzdGVwIGNvbXBvbmVudFxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIE9uYm9hcmRpbmdWaWV3IGV4dGVuZHMgSXRlbVZpZXcge1xyXG5cdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblx0cHJpdmF0ZSBjb25maWdNYW5hZ2VyOiBPbmJvYXJkaW5nQ29uZmlnTWFuYWdlcjtcclxuXHRwcml2YXRlIHNldHRpbmdzRGV0ZWN0b3I6IFNldHRpbmdzQ2hhbmdlRGV0ZWN0b3I7XHJcblx0cHJpdmF0ZSBvbkNvbXBsZXRlOiAoKSA9PiB2b2lkO1xyXG5cclxuXHQvLyBDb3JlIGNvbXBvbmVudHNcclxuXHRwcml2YXRlIGNvbnRyb2xsZXI6IE9uYm9hcmRpbmdDb250cm9sbGVyO1xyXG5cdHByaXZhdGUgbGF5b3V0OiBPbmJvYXJkaW5nTGF5b3V0O1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdGxlYWY6IFdvcmtzcGFjZUxlYWYsXHJcblx0XHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdG9uQ29tcGxldGU6ICgpID0+IHZvaWQsXHJcblx0KSB7XHJcblx0XHRzdXBlcihsZWFmKTtcclxuXHRcdHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG5cdFx0dGhpcy5jb25maWdNYW5hZ2VyID0gbmV3IE9uYm9hcmRpbmdDb25maWdNYW5hZ2VyKHBsdWdpbik7XHJcblx0XHR0aGlzLnNldHRpbmdzRGV0ZWN0b3IgPSBuZXcgU2V0dGluZ3NDaGFuZ2VEZXRlY3RvcihwbHVnaW4pO1xyXG5cdFx0dGhpcy5vbkNvbXBsZXRlID0gb25Db21wbGV0ZTtcclxuXHJcblx0XHQvLyBJbml0aWFsaXplIGNvbnRyb2xsZXIgd2l0aCBpbml0aWFsIHN0YXRlXHJcblx0XHRjb25zdCBoYXNVc2VyQ2hhbmdlcyA9IHRoaXMuc2V0dGluZ3NEZXRlY3Rvci5oYXNVc2VyTWFkZUNoYW5nZXMoKTtcclxuXHRcdHRoaXMuY29udHJvbGxlciA9IG5ldyBPbmJvYXJkaW5nQ29udHJvbGxlcih7XHJcblx0XHRcdGN1cnJlbnRTdGVwOiBPbmJvYXJkaW5nU3RlcC5JTlRSTyxcclxuXHRcdFx0dXNlckhhc0NoYW5nZXM6IGhhc1VzZXJDaGFuZ2VzLFxyXG5cdFx0XHRjaGFuZ2VzU3VtbWFyeTogdGhpcy5zZXR0aW5nc0RldGVjdG9yLmdldENoYW5nZXNTdW1tYXJ5KCksXHJcblx0XHRcdHVpTW9kZTogXCJmbHVlbnRcIixcclxuXHRcdFx0dXNlU2lkZUxlYXZlczogdHJ1ZSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFNldHVwIGV2ZW50IGxpc3RlbmVyc1xyXG5cdFx0dGhpcy5zZXR1cENvbnRyb2xsZXJMaXN0ZW5lcnMoKTtcclxuXHR9XHJcblxyXG5cdGdldFZpZXdUeXBlKCk6IHN0cmluZyB7XHJcblx0XHRyZXR1cm4gT05CT0FSRElOR19WSUVXX1RZUEU7XHJcblx0fVxyXG5cclxuXHRnZXREaXNwbGF5VGV4dCgpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIHQoXCJTZXR1cFwiKTtcclxuXHR9XHJcblxyXG5cdGdldEljb24oKTogc3RyaW5nIHtcclxuXHRcdHJldHVybiBcInRhc2stZ2VuaXVzXCI7XHJcblx0fVxyXG5cclxuXHRhc3luYyBvbk9wZW4oKSB7XHJcblx0XHQvLyBDcmVhdGUgbGF5b3V0XHJcblx0XHR0aGlzLmxheW91dCA9IG5ldyBPbmJvYXJkaW5nTGF5b3V0KHRoaXMuY29udGFpbmVyRWwsIHRoaXMuY29udHJvbGxlciwge1xyXG5cdFx0XHRvbk5leHQ6IGFzeW5jICgpID0+IHRoaXMuaGFuZGxlTmV4dCgpLFxyXG5cdFx0XHRvbkJhY2s6IGFzeW5jICgpID0+IHRoaXMuaGFuZGxlQmFjaygpLFxyXG5cdFx0XHRvblNraXA6IGFzeW5jICgpID0+IHRoaXMuaGFuZGxlU2tpcCgpLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gUmVuZGVyIGluaXRpYWwgc3RlcFxyXG5cdFx0dGhpcy5yZW5kZXJDdXJyZW50U3RlcCgpO1xyXG5cdH1cclxuXHJcblx0YXN5bmMgb25DbG9zZSgpIHtcclxuXHRcdC8vIENsZWFudXBcclxuXHRcdHRoaXMuY29udGFpbmVyRWwuZW1wdHkoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNldHVwIGNvbnRyb2xsZXIgZXZlbnQgbGlzdGVuZXJzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBzZXR1cENvbnRyb2xsZXJMaXN0ZW5lcnMoKSB7XHJcblx0XHR0aGlzLmNvbnRyb2xsZXIub24oXCJzdGVwLWNoYW5nZWRcIiwgKCkgPT4ge1xyXG5cdFx0XHR0aGlzLnJlbmRlckN1cnJlbnRTdGVwKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLmNvbnRyb2xsZXIub24oXCJjb21wbGV0ZWRcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRhd2FpdCB0aGlzLmNvbXBsZXRlT25ib2FyZGluZygpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW5kZXIgdGhlIGN1cnJlbnQgc3RlcFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgcmVuZGVyQ3VycmVudFN0ZXAoKSB7XHJcblx0XHRjb25zdCBzdGVwID0gdGhpcy5jb250cm9sbGVyLmdldEN1cnJlbnRTdGVwKCk7XHJcblx0XHRjb25zb2xlLmxvZyhcIlJlbmRlcmluZyBzdGVwOlwiLCBPbmJvYXJkaW5nU3RlcFtzdGVwXSk7XHJcblxyXG5cdFx0Ly8gQ2xlYXIgaGVhZGVyIGFuZCBjb250ZW50IC0gZW5zdXJlIGNvbXBsZXRlIGNsZWFyaW5nXHJcblx0XHR0aGlzLmxheW91dC5jbGVhckhlYWRlcigpO1xyXG5cdFx0dGhpcy5sYXlvdXQuY2xlYXJDb250ZW50KCk7XHJcblxyXG5cdFx0Ly8gRm9yY2UgRE9NIHVwZGF0ZSBieSB1c2luZyByZXF1ZXN0QW5pbWF0aW9uRnJhbWVcclxuXHRcdHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XHJcblx0XHRcdC8vIEdldCBoZWFkZXIgYW5kIGNvbnRlbnQgZWxlbWVudHNcclxuXHRcdFx0Y29uc3QgaGVhZGVyRWwgPSB0aGlzLmxheW91dC5nZXRIZWFkZXJFbGVtZW50KCk7XHJcblx0XHRcdGNvbnN0IGNvbnRlbnRFbCA9IHRoaXMubGF5b3V0LmdldENvbnRlbnRFbGVtZW50KCk7XHJcblx0XHRcdGNvbnN0IGZvb3RlckVsID0gdGhpcy5sYXlvdXQuZ2V0Rm9vdGVyRWxlbWVudCgpO1xyXG5cclxuXHRcdFx0Ly8gUmVuZGVyIGFwcHJvcHJpYXRlIHN0ZXBcclxuXHRcdFx0c3dpdGNoIChzdGVwKSB7XHJcblx0XHRcdFx0Y2FzZSBPbmJvYXJkaW5nU3RlcC5JTlRSTzpcclxuXHRcdFx0XHRcdEludHJvU3RlcC5yZW5kZXIoXHJcblx0XHRcdFx0XHRcdGhlYWRlckVsLFxyXG5cdFx0XHRcdFx0XHRjb250ZW50RWwsXHJcblx0XHRcdFx0XHRcdGZvb3RlckVsLFxyXG5cdFx0XHRcdFx0XHR0aGlzLmNvbnRyb2xsZXIsXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdGNhc2UgT25ib2FyZGluZ1N0ZXAuTU9ERV9TRUxFQ1Q6XHJcblx0XHRcdFx0XHRNb2RlU2VsZWN0aW9uU3RlcC5yZW5kZXIoXHJcblx0XHRcdFx0XHRcdGhlYWRlckVsLFxyXG5cdFx0XHRcdFx0XHRjb250ZW50RWwsXHJcblx0XHRcdFx0XHRcdHRoaXMuY29udHJvbGxlcixcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0Y2FzZSBPbmJvYXJkaW5nU3RlcC5GTFVFTlRfT1ZFUlZJRVc6XHJcblx0XHRcdFx0XHRGbHVlbnRPdmVydmlld1N0ZXAucmVuZGVyKFxyXG5cdFx0XHRcdFx0XHRoZWFkZXJFbCxcclxuXHRcdFx0XHRcdFx0Y29udGVudEVsLFxyXG5cdFx0XHRcdFx0XHR0aGlzLmNvbnRyb2xsZXIsXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBPbmJvYXJkaW5nU3RlcC5GTFVFTlRfV1NfU0VMRUNUT1I6XHJcblx0XHRcdFx0XHRGbHVlbnRXb3Jrc3BhY2VTZWxlY3RvclN0ZXAucmVuZGVyKFxyXG5cdFx0XHRcdFx0XHRoZWFkZXJFbCxcclxuXHRcdFx0XHRcdFx0Y29udGVudEVsLFxyXG5cdFx0XHRcdFx0XHR0aGlzLmNvbnRyb2xsZXIsXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBPbmJvYXJkaW5nU3RlcC5GTFVFTlRfTUFJTl9OQVY6XHJcblx0XHRcdFx0XHRGbHVlbnRNYWluTmF2aWdhdGlvblN0ZXAucmVuZGVyKFxyXG5cdFx0XHRcdFx0XHRoZWFkZXJFbCxcclxuXHRcdFx0XHRcdFx0Y29udGVudEVsLFxyXG5cdFx0XHRcdFx0XHR0aGlzLmNvbnRyb2xsZXIsXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBPbmJvYXJkaW5nU3RlcC5GTFVFTlRfUFJPSkVDVFM6XHJcblx0XHRcdFx0XHRGbHVlbnRQcm9qZWN0U2VjdGlvblN0ZXAucmVuZGVyKFxyXG5cdFx0XHRcdFx0XHRoZWFkZXJFbCxcclxuXHRcdFx0XHRcdFx0Y29udGVudEVsLFxyXG5cdFx0XHRcdFx0XHR0aGlzLmNvbnRyb2xsZXIsXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBPbmJvYXJkaW5nU3RlcC5GTFVFTlRfT1RIRVJfVklFV1M6XHJcblx0XHRcdFx0XHRGbHVlbnRPdGhlclZpZXdzU3RlcC5yZW5kZXIoXHJcblx0XHRcdFx0XHRcdGhlYWRlckVsLFxyXG5cdFx0XHRcdFx0XHRjb250ZW50RWwsXHJcblx0XHRcdFx0XHRcdHRoaXMuY29udHJvbGxlcixcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIE9uYm9hcmRpbmdTdGVwLkZMVUVOVF9UT1BOQVY6XHJcblx0XHRcdFx0XHRGbHVlbnRUb3BOYXZpZ2F0aW9uU3RlcC5yZW5kZXIoXHJcblx0XHRcdFx0XHRcdGhlYWRlckVsLFxyXG5cdFx0XHRcdFx0XHRjb250ZW50RWwsXHJcblx0XHRcdFx0XHRcdHRoaXMuY29udHJvbGxlcixcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIE9uYm9hcmRpbmdTdGVwLkZMVUVOVF9QTEFDRU1FTlQ6XHJcblx0XHRcdFx0XHRQbGFjZW1lbnRTdGVwLnJlbmRlcihoZWFkZXJFbCwgY29udGVudEVsLCB0aGlzLmNvbnRyb2xsZXIpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdGNhc2UgT25ib2FyZGluZ1N0ZXAuU0VUVElOR1NfQ0hFQ0s6XHJcblx0XHRcdFx0XHRTZXR0aW5nc0NoZWNrU3RlcC5yZW5kZXIoXHJcblx0XHRcdFx0XHRcdGhlYWRlckVsLFxyXG5cdFx0XHRcdFx0XHRjb250ZW50RWwsXHJcblx0XHRcdFx0XHRcdHRoaXMuY29udHJvbGxlcixcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0Y2FzZSBPbmJvYXJkaW5nU3RlcC5VU0VSX0xFVkVMX1NFTEVDVDpcclxuXHRcdFx0XHRcdFVzZXJMZXZlbFN0ZXAucmVuZGVyKFxyXG5cdFx0XHRcdFx0XHRoZWFkZXJFbCxcclxuXHRcdFx0XHRcdFx0Y29udGVudEVsLFxyXG5cdFx0XHRcdFx0XHR0aGlzLmNvbnRyb2xsZXIsXHJcblx0XHRcdFx0XHRcdHRoaXMuY29uZmlnTWFuYWdlcixcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0Y2FzZSBPbmJvYXJkaW5nU3RlcC5GSUxFX0ZJTFRFUjpcclxuXHRcdFx0XHRcdEZpbGVGaWx0ZXJTdGVwLnJlbmRlcihcclxuXHRcdFx0XHRcdFx0aGVhZGVyRWwsXHJcblx0XHRcdFx0XHRcdGNvbnRlbnRFbCxcclxuXHRcdFx0XHRcdFx0dGhpcy5jb250cm9sbGVyLFxyXG5cdFx0XHRcdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0Y2FzZSBPbmJvYXJkaW5nU3RlcC5DT05GSUdfUFJFVklFVzpcclxuXHRcdFx0XHRcdENvbmZpZ1ByZXZpZXdTdGVwLnJlbmRlcihcclxuXHRcdFx0XHRcdFx0aGVhZGVyRWwsXHJcblx0XHRcdFx0XHRcdGNvbnRlbnRFbCxcclxuXHRcdFx0XHRcdFx0dGhpcy5jb250cm9sbGVyLFxyXG5cdFx0XHRcdFx0XHR0aGlzLmNvbmZpZ01hbmFnZXIsXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdGNhc2UgT25ib2FyZGluZ1N0ZXAuVEFTS19DUkVBVElPTl9HVUlERTpcclxuXHRcdFx0XHRcdFRhc2tHdWlkZVN0ZXAucmVuZGVyKFxyXG5cdFx0XHRcdFx0XHRoZWFkZXJFbCxcclxuXHRcdFx0XHRcdFx0Y29udGVudEVsLFxyXG5cdFx0XHRcdFx0XHR0aGlzLmNvbnRyb2xsZXIsXHJcblx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRjYXNlIE9uYm9hcmRpbmdTdGVwLkNPTVBMRVRFOlxyXG5cdFx0XHRcdFx0Q29tcGxldGVTdGVwLnJlbmRlcihoZWFkZXJFbCwgY29udGVudEVsLCB0aGlzLmNvbnRyb2xsZXIpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSGFuZGxlIG5leHQgYnV0dG9uIGNsaWNrXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhc3luYyBoYW5kbGVOZXh0KCkge1xyXG5cdFx0Y29uc3Qgc3RlcCA9IHRoaXMuY29udHJvbGxlci5nZXRDdXJyZW50U3RlcCgpO1xyXG5cdFx0Y29uc3Qgc3RhdGUgPSB0aGlzLmNvbnRyb2xsZXIuZ2V0U3RhdGUoKTtcclxuXHJcblx0XHQvLyBTaG93IGNvbmZpZyBjaGVjayB0cmFuc2l0aW9uIG9ubHkgd2hlbiBlbnRlcmluZyBTZXR0aW5ncyBDaGVjayBmcm9tOlxyXG5cdFx0Ly8gLSBNb2RlIFNlbGVjdCB3aXRoIExlZ2FjeVxyXG5cdFx0Ly8gLSBUaGUgZmluYWwgRmx1ZW50IHN0ZXAgKFBsYWNlbWVudCBzZWxlY3Rpb24pXHJcblx0XHRpZiAoc3RlcCA9PT0gT25ib2FyZGluZ1N0ZXAuTU9ERV9TRUxFQ1QpIHtcclxuXHRcdFx0aWYgKHN0YXRlLnVpTW9kZSA9PT0gXCJsZWdhY3lcIiAmJiBzdGF0ZS51c2VySGFzQ2hhbmdlcykge1xyXG5cdFx0XHRcdC8vIENsZWFyIGhlYWRlciBiZWZvcmUgc2hvd2luZyB0cmFuc2l0aW9uIHRvIGF2b2lkIHJlc2lkdWFsIFVJXHJcblx0XHRcdFx0dGhpcy5sYXlvdXQuY2xlYXJIZWFkZXIoKTtcclxuXHRcdFx0XHRhd2FpdCB0aGlzLnNob3dDb25maWdDaGVja1RyYW5zaXRpb24oKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0aWYgKHN0ZXAgPT09IE9uYm9hcmRpbmdTdGVwLkZMVUVOVF9QTEFDRU1FTlQpIHtcclxuXHRcdFx0aWYgKHN0YXRlLnVzZXJIYXNDaGFuZ2VzKSB7XHJcblx0XHRcdFx0Ly8gQ2xlYXIgaGVhZGVyIGJlZm9yZSBzaG93aW5nIHRyYW5zaXRpb24gdG8gYXZvaWQgcmVzaWR1YWwgVUlcclxuXHRcdFx0XHR0aGlzLmxheW91dC5jbGVhckhlYWRlcigpO1xyXG5cdFx0XHRcdGF3YWl0IHRoaXMuc2hvd0NvbmZpZ0NoZWNrVHJhbnNpdGlvbigpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU3BlY2lhbCBoYW5kbGluZyBmb3IgU0VUVElOR1NfQ0hFQ0sgc3RlcFxyXG5cdFx0aWYgKHN0ZXAgPT09IE9uYm9hcmRpbmdTdGVwLlNFVFRJTkdTX0NIRUNLKSB7XHJcblx0XHRcdGlmIChzdGF0ZS5zZXR0aW5nc0NoZWNrQWN0aW9uID09PSBcImtlZXBcIikge1xyXG5cdFx0XHRcdC8vIFVzZXIgY2hvc2UgdG8ga2VlcCBzZXR0aW5ncywgc2tpcCBvbmJvYXJkaW5nXHJcblx0XHRcdFx0YXdhaXQgdGhpcy5jb25maWdNYW5hZ2VyLnNraXBPbmJvYXJkaW5nKCk7XHJcblx0XHRcdFx0dGhpcy5vbkNvbXBsZXRlKCk7XHJcblx0XHRcdFx0dGhpcy5sZWFmLmRldGFjaCgpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHQvLyBJZiBcIndpemFyZFwiLCBjb250aW51ZSB0byBuZXh0IHN0ZXAgbm9ybWFsbHlcclxuXHRcdH1cclxuXHJcblx0XHQvLyBBcHBseSBjb25maWd1cmF0aW9uIHdoZW4gbW92aW5nIHRvIHByZXZpZXdcclxuXHRcdGlmIChcclxuXHRcdFx0c3RlcCA9PT0gT25ib2FyZGluZ1N0ZXAuVVNFUl9MRVZFTF9TRUxFQ1QgJiZcclxuXHRcdFx0dGhpcy5jb250cm9sbGVyLmNhbkdvTmV4dCgpXHJcblx0XHQpIHtcclxuXHRcdFx0Y29uc3QgY29uZmlnID0gc3RhdGUuc2VsZWN0ZWRDb25maWc7XHJcblx0XHRcdGlmIChjb25maWcpIHtcclxuXHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0YXdhaXQgdGhpcy5hcHBseUFyY2hpdGVjdHVyZVNlbGVjdGlvbnMoKTtcclxuXHRcdFx0XHRcdGF3YWl0IHRoaXMuY29uZmlnTWFuYWdlci5hcHBseUNvbmZpZ3VyYXRpb24oY29uZmlnLm1vZGUpO1xyXG5cdFx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIGFwcGx5IGNvbmZpZ3VyYXRpb246XCIsIGVycm9yKTtcclxuXHRcdFx0XHRcdC8vIENvbnRpbnVlIGFueXdheSwgdXNlciBjYW4gYWRqdXN0IGluIHNldHRpbmdzXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gTmF2aWdhdGUgdG8gbmV4dCBzdGVwXHJcblx0XHRjb25zdCBzdWNjZXNzID0gYXdhaXQgdGhpcy5jb250cm9sbGVyLm5leHQoKTtcclxuXHRcdGNvbnNvbGUubG9nKFwiaGFuZGxlTmV4dCAtIE5hdmlnYXRpb24gcmVzdWx0OlwiLCBzdWNjZXNzKTtcclxuXHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcImhhbmRsZU5leHQgLSBOZXcgc3RlcDpcIixcclxuXHRcdFx0T25ib2FyZGluZ1N0ZXBbdGhpcy5jb250cm9sbGVyLmdldEN1cnJlbnRTdGVwKCldLFxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNob3cgY29uZmlnIGNoZWNrIHRyYW5zaXRpb24gYW5pbWF0aW9uXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhc3luYyBzaG93Q29uZmlnQ2hlY2tUcmFuc2l0aW9uKCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcblx0XHRcdC8vIEltcG9ydCBkeW5hbWljYWxseSB0byBhdm9pZCBjaXJjdWxhciBkZXBlbmRlbmN5XHJcblx0XHRcdGNvbnN0IGNvbnRlbnRFbCA9IHRoaXMubGF5b3V0LmdldENvbnRlbnRFbGVtZW50KCk7XHJcblx0XHRcdGNvbnN0IHN0YXRlID0gdGhpcy5jb250cm9sbGVyLmdldFN0YXRlKCk7XHJcblxyXG5cdFx0XHQvLyBDbGVhciBjb250ZW50IGFuZCBzaG93IHRyYW5zaXRpb25cclxuXHRcdFx0Y29udGVudEVsLmVtcHR5KCk7XHJcblxyXG5cdFx0XHRuZXcgQ29uZmlnQ2hlY2tUcmFuc2l0aW9uKFxyXG5cdFx0XHRcdGNvbnRlbnRFbCxcclxuXHRcdFx0XHQoKSA9PiB7XHJcblx0XHRcdFx0XHRyZXNvbHZlKCk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRzdGF0ZS51c2VySGFzQ2hhbmdlcyxcclxuXHRcdFx0KTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSGFuZGxlIGJhY2sgYnV0dG9uIGNsaWNrXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhc3luYyBoYW5kbGVCYWNrKCkge1xyXG5cdFx0YXdhaXQgdGhpcy5jb250cm9sbGVyLmJhY2soKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSBza2lwIGJ1dHRvbiBjbGlja1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgaGFuZGxlU2tpcCgpIHtcclxuXHRcdGF3YWl0IHRoaXMuY29uZmlnTWFuYWdlci5za2lwT25ib2FyZGluZygpO1xyXG5cdFx0dGhpcy5vbkNvbXBsZXRlKCk7XHJcblx0XHR0aGlzLmxlYWYuZGV0YWNoKCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBBcHBseSBhcmNoaXRlY3R1cmUgc2VsZWN0aW9ucyAoVUkgbW9kZSBhbmQgc2lkZWxlYXZlcylcclxuXHQgKi9cclxuXHRwcml2YXRlIGFzeW5jIGFwcGx5QXJjaGl0ZWN0dXJlU2VsZWN0aW9ucygpIHtcclxuXHRcdGNvbnN0IHN0YXRlID0gdGhpcy5jb250cm9sbGVyLmdldFN0YXRlKCk7XHJcblx0XHRjb25zdCBpc0ZsdWVudCA9IHN0YXRlLnVpTW9kZSA9PT0gXCJmbHVlbnRcIjtcclxuXHJcblx0XHRpZiAoIXRoaXMucGx1Z2luLnNldHRpbmdzLmZsdWVudFZpZXcpIHtcclxuXHRcdFx0KHRoaXMucGx1Z2luLnNldHRpbmdzIGFzIGFueSkuZXhwZXJpbWVudGFsID0ge1xyXG5cdFx0XHRcdGVuYWJsZVYyOiBmYWxzZSxcclxuXHRcdFx0XHRzaG93VjJSaWJib246IGZhbHNlLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLmZsdWVudFZpZXchLmVuYWJsZUZsdWVudCA9IGlzRmx1ZW50O1xyXG5cclxuXHRcdC8vIFByZXBhcmUgdjIgY29uZmlnIGFuZCBzZXQgcGxhY2VtZW50IG9wdGlvbiB3aGVuIEZsdWVudCBpcyBjaG9zZW5cclxuXHRcdGlmICghdGhpcy5wbHVnaW4uc2V0dGluZ3MuZmx1ZW50Vmlldykge1xyXG5cdFx0XHQodGhpcy5wbHVnaW4uc2V0dGluZ3MuZmx1ZW50VmlldyBhcyBhbnkpLmZsdWVudENvbmZpZyA9IHtcclxuXHRcdFx0XHRlbmFibGVXb3Jrc3BhY2VzOiB0cnVlLFxyXG5cdFx0XHRcdGRlZmF1bHRXb3Jrc3BhY2U6IFwiZGVmYXVsdFwiLFxyXG5cdFx0XHRcdHNob3dUb3BOYXZpZ2F0aW9uOiB0cnVlLFxyXG5cdFx0XHRcdHNob3dOZXdTaWRlYmFyOiB0cnVlLFxyXG5cdFx0XHRcdGFsbG93Vmlld1N3aXRjaGluZzogdHJ1ZSxcclxuXHRcdFx0XHRwZXJzaXN0Vmlld01vZGU6IHRydWUsXHJcblx0XHRcdFx0bWF4T3RoZXJWaWV3c0JlZm9yZU92ZXJmbG93OiA1LFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChpc0ZsdWVudCAmJiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5mbHVlbnRWaWV3KSB7XHJcblx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLmZsdWVudFZpZXcudXNlV29ya3NwYWNlU2lkZUxlYXZlcyA9XHJcblx0XHRcdFx0ISFzdGF0ZS51c2VTaWRlTGVhdmVzO1xyXG5cdFx0fVxyXG5cclxuXHRcdGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ29tcGxldGUgb25ib2FyZGluZyBwcm9jZXNzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhc3luYyBjb21wbGV0ZU9uYm9hcmRpbmcoKSB7XHJcblx0XHRjb25zdCBzdGF0ZSA9IHRoaXMuY29udHJvbGxlci5nZXRTdGF0ZSgpO1xyXG5cdFx0Y29uc3QgY29uZmlnID0gc3RhdGUuc2VsZWN0ZWRDb25maWc7XHJcblxyXG5cdFx0aWYgKCFjb25maWcgfHwgc3RhdGUuaXNDb21wbGV0aW5nKSByZXR1cm47XHJcblxyXG5cdFx0dGhpcy5jb250cm9sbGVyLnVwZGF0ZVN0YXRlKHsgaXNDb21wbGV0aW5nOiB0cnVlIH0pO1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdC8vIE1hcmsgb25ib2FyZGluZyBhcyBjb21wbGV0ZWRcclxuXHRcdFx0YXdhaXQgdGhpcy5jb25maWdNYW5hZ2VyLmNvbXBsZXRlT25ib2FyZGluZyhjb25maWcubW9kZSk7XHJcblxyXG5cdFx0XHQvLyBDbG9zZSB2aWV3IGFuZCB0cmlnZ2VyIGNhbGxiYWNrXHJcblx0XHRcdHRoaXMub25Db21wbGV0ZSgpO1xyXG5cdFx0XHR0aGlzLmxlYWYuZGV0YWNoKCk7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIGNvbXBsZXRlIG9uYm9hcmRpbmc6XCIsIGVycm9yKTtcclxuXHRcdFx0dGhpcy5jb250cm9sbGVyLnVwZGF0ZVN0YXRlKHsgaXNDb21wbGV0aW5nOiBmYWxzZSB9KTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuIl19