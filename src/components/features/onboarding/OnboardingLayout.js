import { ButtonComponent, Component } from "obsidian";
import { t } from "@/translations/helper";
import { OnboardingStep } from "./OnboardingController";
/**
 * Layout component for onboarding view
 * Manages:
 * - Header section
 * - Content section (for steps to render into)
 * - Footer with navigation buttons
 */
export class OnboardingLayout extends Component {
    constructor(container, controller, callbacks) {
        super();
        this.container = container;
        this.controller = controller;
        this.callbacks = callbacks;
        this.createLayout();
        this.setupListeners();
        this.updateButtons();
    }
    /**
     * Create the layout structure
     */
    createLayout() {
        this.container.empty();
        this.container.toggleClass(["onboarding-view"], true);
        // Header section
        this.headerEl = this.container.createDiv("onboarding-header");
        // Main content section
        this.contentEl = this.container.createDiv("onboarding-content");
        // Footer with navigation buttons
        this.footerEl = this.container.createDiv("onboarding-footer");
        this.createFooterButtons();
        // Shadow element
        this.container.createEl("div", {
            cls: "onboarding-shadow",
        });
        this.container.createEl("div", {
            cls: "tg-noise-layer",
        });
    }
    /**
     * Create footer navigation buttons
     */
    createFooterButtons() {
        const buttonContainer = this.footerEl.createDiv("onboarding-buttons");
        // Left side - Back and Skip buttons
        const leftButtons = buttonContainer.createDiv("buttons-left");
        // Back button
        this.backButton = new ButtonComponent(leftButtons)
            .setButtonText(t("Back"))
            .onClick(() => this.callbacks.onBack());
        this.backButton.buttonEl.addClass("clickable-icon");
        // Skip button
        this.skipButton = new ButtonComponent(leftButtons)
            .setButtonText(t("Skip setup"))
            .onClick(() => this.callbacks.onSkip());
        this.skipButton.buttonEl.addClass("clickable-icon");
        // Right side - Next button
        const rightButtons = buttonContainer.createDiv("buttons-right");
        // Next button
        this.nextButton = new ButtonComponent(rightButtons)
            .setButtonText(t("Next"))
            .setCta()
            .onClick(() => this.callbacks.onNext());
    }
    /**
     * Setup listeners for controller events
     */
    setupListeners() {
        this.controller.on("step-changed", () => {
            this.updateButtons();
        });
        this.controller.on("state-updated", () => {
            this.updateButtons();
        });
    }
    /**
     * Update button states based on current step
     */
    updateButtons() {
        const step = this.controller.getCurrentStep();
        const state = this.controller.getState();
        // Skip button visibility
        this.skipButton.buttonEl.toggleVisibility(this.controller.canSkip());
        // Back button visibility
        this.backButton.buttonEl.toggleVisibility(this.controller.canGoBack());
        // Next button
        const isLastStep = step === OnboardingStep.COMPLETE;
        const isSettingsCheck = step === OnboardingStep.SETTINGS_CHECK;
        const isModeSelect = step === OnboardingStep.MODE_SELECT;
        this.nextButton.buttonEl.toggleVisibility(true);
        // Update button text based on step and selection
        if (isSettingsCheck) {
            if (state.settingsCheckAction === "wizard") {
                this.nextButton.setButtonText(t("Continue with Wizard"));
            }
            else if (state.settingsCheckAction === "keep") {
                this.nextButton.setButtonText(t("Keep Settings"));
            }
            else {
                this.nextButton.setButtonText(t("Continue"));
            }
        }
        else if (isModeSelect && state.uiMode === "fluent") {
            this.nextButton.setButtonText(t("Next to Introduction"));
        }
        else {
            this.nextButton.setButtonText(isLastStep ? t("Start Using Task Genius") : t("Next"));
        }
        // Enable/disable next based on validation
        this.nextButton.setDisabled(!this.controller.canGoNext() || state.isCompleting);
    }
    /**
     * Get header element for step to render into
     */
    getHeaderElement() {
        return this.headerEl;
    }
    /**
     * Get content element for step to render into
     */
    getContentElement() {
        return this.contentEl;
    }
    /**
     * Get footer element
     */
    getFooterElement() {
        return this.footerEl;
    }
    /**
     * Clear header content
     */
    clearHeader() {
        var _a;
        (_a = this.headerEl) === null || _a === void 0 ? void 0 : _a.empty();
    }
    /**
     * Clear content
     */
    clearContent() {
        var _a;
        (_a = this.contentEl) === null || _a === void 0 ? void 0 : _a.empty();
    }
    /**
     * Show/hide footer
     */
    setFooterVisible(visible) {
        this.footerEl.toggleVisibility(visible);
    }
    /**
     * Cleanup
     */
    cleanup() {
        this.container.empty();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT25ib2FyZGluZ0xheW91dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIk9uYm9hcmRpbmdMYXlvdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLGVBQWUsRUFBRSxTQUFTLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDdEQsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzFDLE9BQU8sRUFBd0IsY0FBYyxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFROUU7Ozs7OztHQU1HO0FBQ0gsTUFBTSxPQUFPLGdCQUFpQixTQUFRLFNBQVM7SUFlOUMsWUFDQyxTQUFzQixFQUN0QixVQUFnQyxFQUNoQyxTQUFvQztRQUVwQyxLQUFLLEVBQUUsQ0FBQztRQUNSLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzNCLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO1FBQzdCLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBRTNCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNwQixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDdEIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQ3RCLENBQUM7SUFFRDs7T0FFRztJQUNLLFlBQVk7UUFDbkIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN2QixJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFdEQsaUJBQWlCO1FBQ2pCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUU5RCx1QkFBdUI7UUFDdkIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBRWhFLGlDQUFpQztRQUNqQyxJ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LENBQUMsWUFBWSxDQUNsRCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsZ0JBQWdCO1FBQ2YsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQ3RCLENBQUM7SUFFRDs7T0FFRztJQUNILGlCQUFpQjtRQUNoQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7SUFDdkIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsZ0JBQWdCO1FBQ2YsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQ3RCLENBQUM7SUFFRDs7T0FFRztJQUNILFdBQVc7O1FBQ1YsTUFBQSxJQUFJLENBQUMsUUFBUSwwQ0FBRSxLQUFLLEVBQUUsQ0FBQztJQUN4QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxZQUFZOztRQUNYLE1BQUEsSUFBSSxDQUFDLFNBQVMsMENBQUUsS0FBSyxFQUFFLENBQUM7SUFDekIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsZ0JBQWdCLENBQUMsT0FBZ0I7UUFDaEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxPQUFPO1FBQ04sSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN4QixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBCdXR0b25Db21wb25lbnQsIENvbXBvbmVudCB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgeyBPbmJvYXJkaW5nQ29udHJvbGxlciwgT25ib2FyZGluZ1N0ZXAgfSBmcm9tIFwiLi9PbmJvYXJkaW5nQ29udHJvbGxlclwiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBPbmJvYXJkaW5nTGF5b3V0Q2FsbGJhY2tzIHtcclxuXHRvbk5leHQ6ICgpID0+IFByb21pc2U8dm9pZD47XHJcblx0b25CYWNrOiAoKSA9PiBQcm9taXNlPHZvaWQ+O1xyXG5cdG9uU2tpcDogKCkgPT4gUHJvbWlzZTx2b2lkPjtcclxufVxyXG5cclxuLyoqXHJcbiAqIExheW91dCBjb21wb25lbnQgZm9yIG9uYm9hcmRpbmcgdmlld1xyXG4gKiBNYW5hZ2VzOlxyXG4gKiAtIEhlYWRlciBzZWN0aW9uXHJcbiAqIC0gQ29udGVudCBzZWN0aW9uIChmb3Igc3RlcHMgdG8gcmVuZGVyIGludG8pXHJcbiAqIC0gRm9vdGVyIHdpdGggbmF2aWdhdGlvbiBidXR0b25zXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgT25ib2FyZGluZ0xheW91dCBleHRlbmRzIENvbXBvbmVudCB7XHJcblx0cHJpdmF0ZSBjb250YWluZXI6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgY29udHJvbGxlcjogT25ib2FyZGluZ0NvbnRyb2xsZXI7XHJcblx0cHJpdmF0ZSBjYWxsYmFja3M6IE9uYm9hcmRpbmdMYXlvdXRDYWxsYmFja3M7XHJcblxyXG5cdC8vIExheW91dCBlbGVtZW50c1xyXG5cdHByaXZhdGUgaGVhZGVyRWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgY29udGVudEVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIGZvb3RlckVsOiBIVE1MRWxlbWVudDtcclxuXHJcblx0Ly8gTmF2aWdhdGlvbiBidXR0b25zXHJcblx0cHJpdmF0ZSBuZXh0QnV0dG9uOiBCdXR0b25Db21wb25lbnQ7XHJcblx0cHJpdmF0ZSBiYWNrQnV0dG9uOiBCdXR0b25Db21wb25lbnQ7XHJcblx0cHJpdmF0ZSBza2lwQnV0dG9uOiBCdXR0b25Db21wb25lbnQ7XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0Y29udGFpbmVyOiBIVE1MRWxlbWVudCxcclxuXHRcdGNvbnRyb2xsZXI6IE9uYm9hcmRpbmdDb250cm9sbGVyLFxyXG5cdFx0Y2FsbGJhY2tzOiBPbmJvYXJkaW5nTGF5b3V0Q2FsbGJhY2tzLFxyXG5cdCkge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMuY29udGFpbmVyID0gY29udGFpbmVyO1xyXG5cdFx0dGhpcy5jb250cm9sbGVyID0gY29udHJvbGxlcjtcclxuXHRcdHRoaXMuY2FsbGJhY2tzID0gY2FsbGJhY2tzO1xyXG5cclxuXHRcdHRoaXMuY3JlYXRlTGF5b3V0KCk7XHJcblx0XHR0aGlzLnNldHVwTGlzdGVuZXJzKCk7XHJcblx0XHR0aGlzLnVwZGF0ZUJ1dHRvbnMoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZSB0aGUgbGF5b3V0IHN0cnVjdHVyZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgY3JlYXRlTGF5b3V0KCkge1xyXG5cdFx0dGhpcy5jb250YWluZXIuZW1wdHkoKTtcclxuXHRcdHRoaXMuY29udGFpbmVyLnRvZ2dsZUNsYXNzKFtcIm9uYm9hcmRpbmctdmlld1wiXSwgdHJ1ZSk7XHJcblxyXG5cdFx0Ly8gSGVhZGVyIHNlY3Rpb25cclxuXHRcdHRoaXMuaGVhZGVyRWwgPSB0aGlzLmNvbnRhaW5lci5jcmVhdGVEaXYoXCJvbmJvYXJkaW5nLWhlYWRlclwiKTtcclxuXHJcblx0XHQvLyBNYWluIGNvbnRlbnQgc2VjdGlvblxyXG5cdFx0dGhpcy5jb250ZW50RWwgPSB0aGlzLmNvbnRhaW5lci5jcmVhdGVEaXYoXCJvbmJvYXJkaW5nLWNvbnRlbnRcIik7XHJcblxyXG5cdFx0Ly8gRm9vdGVyIHdpdGggbmF2aWdhdGlvbiBidXR0b25zXHJcblx0XHR0aGlzLmZvb3RlckVsID0gdGhpcy5jb250YWluZXIuY3JlYXRlRGl2KFwib25ib2FyZGluZy1mb290ZXJcIik7XHJcblx0XHR0aGlzLmNyZWF0ZUZvb3RlckJ1dHRvbnMoKTtcclxuXHJcblx0XHQvLyBTaGFkb3cgZWxlbWVudFxyXG5cdFx0dGhpcy5jb250YWluZXIuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHRjbHM6IFwib25ib2FyZGluZy1zaGFkb3dcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuY29udGFpbmVyLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0Y2xzOiBcInRnLW5vaXNlLWxheWVyXCIsXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZSBmb290ZXIgbmF2aWdhdGlvbiBidXR0b25zXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjcmVhdGVGb290ZXJCdXR0b25zKCkge1xyXG5cdFx0Y29uc3QgYnV0dG9uQ29udGFpbmVyID0gdGhpcy5mb290ZXJFbC5jcmVhdGVEaXYoXCJvbmJvYXJkaW5nLWJ1dHRvbnNcIik7XHJcblxyXG5cdFx0Ly8gTGVmdCBzaWRlIC0gQmFjayBhbmQgU2tpcCBidXR0b25zXHJcblx0XHRjb25zdCBsZWZ0QnV0dG9ucyA9IGJ1dHRvbkNvbnRhaW5lci5jcmVhdGVEaXYoXCJidXR0b25zLWxlZnRcIik7XHJcblxyXG5cdFx0Ly8gQmFjayBidXR0b25cclxuXHRcdHRoaXMuYmFja0J1dHRvbiA9IG5ldyBCdXR0b25Db21wb25lbnQobGVmdEJ1dHRvbnMpXHJcblx0XHRcdC5zZXRCdXR0b25UZXh0KHQoXCJCYWNrXCIpKVxyXG5cdFx0XHQub25DbGljaygoKSA9PiB0aGlzLmNhbGxiYWNrcy5vbkJhY2soKSk7XHJcblx0XHR0aGlzLmJhY2tCdXR0b24uYnV0dG9uRWwuYWRkQ2xhc3MoXCJjbGlja2FibGUtaWNvblwiKTtcclxuXHJcblx0XHQvLyBTa2lwIGJ1dHRvblxyXG5cdFx0dGhpcy5za2lwQnV0dG9uID0gbmV3IEJ1dHRvbkNvbXBvbmVudChsZWZ0QnV0dG9ucylcclxuXHRcdFx0LnNldEJ1dHRvblRleHQodChcIlNraXAgc2V0dXBcIikpXHJcblx0XHRcdC5vbkNsaWNrKCgpID0+IHRoaXMuY2FsbGJhY2tzLm9uU2tpcCgpKTtcclxuXHRcdHRoaXMuc2tpcEJ1dHRvbi5idXR0b25FbC5hZGRDbGFzcyhcImNsaWNrYWJsZS1pY29uXCIpO1xyXG5cclxuXHRcdC8vIFJpZ2h0IHNpZGUgLSBOZXh0IGJ1dHRvblxyXG5cdFx0Y29uc3QgcmlnaHRCdXR0b25zID0gYnV0dG9uQ29udGFpbmVyLmNyZWF0ZURpdihcImJ1dHRvbnMtcmlnaHRcIik7XHJcblxyXG5cdFx0Ly8gTmV4dCBidXR0b25cclxuXHRcdHRoaXMubmV4dEJ1dHRvbiA9IG5ldyBCdXR0b25Db21wb25lbnQocmlnaHRCdXR0b25zKVxyXG5cdFx0XHQuc2V0QnV0dG9uVGV4dCh0KFwiTmV4dFwiKSlcclxuXHRcdFx0LnNldEN0YSgpXHJcblx0XHRcdC5vbkNsaWNrKCgpID0+IHRoaXMuY2FsbGJhY2tzLm9uTmV4dCgpKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNldHVwIGxpc3RlbmVycyBmb3IgY29udHJvbGxlciBldmVudHNcclxuXHQgKi9cclxuXHRwcml2YXRlIHNldHVwTGlzdGVuZXJzKCkge1xyXG5cdFx0dGhpcy5jb250cm9sbGVyLm9uKFwic3RlcC1jaGFuZ2VkXCIsICgpID0+IHtcclxuXHRcdFx0dGhpcy51cGRhdGVCdXR0b25zKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLmNvbnRyb2xsZXIub24oXCJzdGF0ZS11cGRhdGVkXCIsICgpID0+IHtcclxuXHRcdFx0dGhpcy51cGRhdGVCdXR0b25zKCk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBidXR0b24gc3RhdGVzIGJhc2VkIG9uIGN1cnJlbnQgc3RlcFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgdXBkYXRlQnV0dG9ucygpIHtcclxuXHRcdGNvbnN0IHN0ZXAgPSB0aGlzLmNvbnRyb2xsZXIuZ2V0Q3VycmVudFN0ZXAoKTtcclxuXHRcdGNvbnN0IHN0YXRlID0gdGhpcy5jb250cm9sbGVyLmdldFN0YXRlKCk7XHJcblxyXG5cdFx0Ly8gU2tpcCBidXR0b24gdmlzaWJpbGl0eVxyXG5cdFx0dGhpcy5za2lwQnV0dG9uLmJ1dHRvbkVsLnRvZ2dsZVZpc2liaWxpdHkodGhpcy5jb250cm9sbGVyLmNhblNraXAoKSk7XHJcblxyXG5cdFx0Ly8gQmFjayBidXR0b24gdmlzaWJpbGl0eVxyXG5cdFx0dGhpcy5iYWNrQnV0dG9uLmJ1dHRvbkVsLnRvZ2dsZVZpc2liaWxpdHkodGhpcy5jb250cm9sbGVyLmNhbkdvQmFjaygpKTtcclxuXHJcblx0XHQvLyBOZXh0IGJ1dHRvblxyXG5cdFx0Y29uc3QgaXNMYXN0U3RlcCA9IHN0ZXAgPT09IE9uYm9hcmRpbmdTdGVwLkNPTVBMRVRFO1xyXG5cdFx0Y29uc3QgaXNTZXR0aW5nc0NoZWNrID0gc3RlcCA9PT0gT25ib2FyZGluZ1N0ZXAuU0VUVElOR1NfQ0hFQ0s7XHJcblx0XHRjb25zdCBpc01vZGVTZWxlY3QgPSBzdGVwID09PSBPbmJvYXJkaW5nU3RlcC5NT0RFX1NFTEVDVDtcclxuXHRcdHRoaXMubmV4dEJ1dHRvbi5idXR0b25FbC50b2dnbGVWaXNpYmlsaXR5KHRydWUpO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSBidXR0b24gdGV4dCBiYXNlZCBvbiBzdGVwIGFuZCBzZWxlY3Rpb25cclxuXHRcdGlmIChpc1NldHRpbmdzQ2hlY2spIHtcclxuXHRcdFx0aWYgKHN0YXRlLnNldHRpbmdzQ2hlY2tBY3Rpb24gPT09IFwid2l6YXJkXCIpIHtcclxuXHRcdFx0XHR0aGlzLm5leHRCdXR0b24uc2V0QnV0dG9uVGV4dCh0KFwiQ29udGludWUgd2l0aCBXaXphcmRcIikpO1xyXG5cdFx0XHR9IGVsc2UgaWYgKHN0YXRlLnNldHRpbmdzQ2hlY2tBY3Rpb24gPT09IFwia2VlcFwiKSB7XHJcblx0XHRcdFx0dGhpcy5uZXh0QnV0dG9uLnNldEJ1dHRvblRleHQodChcIktlZXAgU2V0dGluZ3NcIikpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMubmV4dEJ1dHRvbi5zZXRCdXR0b25UZXh0KHQoXCJDb250aW51ZVwiKSk7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSBpZiAoaXNNb2RlU2VsZWN0ICYmIHN0YXRlLnVpTW9kZSA9PT0gXCJmbHVlbnRcIikge1xyXG5cdFx0XHR0aGlzLm5leHRCdXR0b24uc2V0QnV0dG9uVGV4dCh0KFwiTmV4dCB0byBJbnRyb2R1Y3Rpb25cIikpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy5uZXh0QnV0dG9uLnNldEJ1dHRvblRleHQoXHJcblx0XHRcdFx0aXNMYXN0U3RlcCA/IHQoXCJTdGFydCBVc2luZyBUYXNrIEdlbml1c1wiKSA6IHQoXCJOZXh0XCIpLFxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEVuYWJsZS9kaXNhYmxlIG5leHQgYmFzZWQgb24gdmFsaWRhdGlvblxyXG5cdFx0dGhpcy5uZXh0QnV0dG9uLnNldERpc2FibGVkKFxyXG5cdFx0XHQhdGhpcy5jb250cm9sbGVyLmNhbkdvTmV4dCgpIHx8IHN0YXRlLmlzQ29tcGxldGluZyxcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgaGVhZGVyIGVsZW1lbnQgZm9yIHN0ZXAgdG8gcmVuZGVyIGludG9cclxuXHQgKi9cclxuXHRnZXRIZWFkZXJFbGVtZW50KCk6IEhUTUxFbGVtZW50IHtcclxuXHRcdHJldHVybiB0aGlzLmhlYWRlckVsO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGNvbnRlbnQgZWxlbWVudCBmb3Igc3RlcCB0byByZW5kZXIgaW50b1xyXG5cdCAqL1xyXG5cdGdldENvbnRlbnRFbGVtZW50KCk6IEhUTUxFbGVtZW50IHtcclxuXHRcdHJldHVybiB0aGlzLmNvbnRlbnRFbDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBmb290ZXIgZWxlbWVudFxyXG5cdCAqL1xyXG5cdGdldEZvb3RlckVsZW1lbnQoKTogSFRNTEVsZW1lbnQge1xyXG5cdFx0cmV0dXJuIHRoaXMuZm9vdGVyRWw7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDbGVhciBoZWFkZXIgY29udGVudFxyXG5cdCAqL1xyXG5cdGNsZWFySGVhZGVyKCkge1xyXG5cdFx0dGhpcy5oZWFkZXJFbD8uZW1wdHkoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsZWFyIGNvbnRlbnRcclxuXHQgKi9cclxuXHRjbGVhckNvbnRlbnQoKSB7XHJcblx0XHR0aGlzLmNvbnRlbnRFbD8uZW1wdHkoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNob3cvaGlkZSBmb290ZXJcclxuXHQgKi9cclxuXHRzZXRGb290ZXJWaXNpYmxlKHZpc2libGU6IGJvb2xlYW4pIHtcclxuXHRcdHRoaXMuZm9vdGVyRWwudG9nZ2xlVmlzaWJpbGl0eSh2aXNpYmxlKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsZWFudXBcclxuXHQgKi9cclxuXHRjbGVhbnVwKCkge1xyXG5cdFx0dGhpcy5jb250YWluZXIuZW1wdHkoKTtcclxuXHR9XHJcbn1cclxuIl19