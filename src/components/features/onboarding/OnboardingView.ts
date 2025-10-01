import { ItemView, WorkspaceLeaf, setIcon, ButtonComponent, Setting } from "obsidian";
import type TaskProgressBarPlugin from "@/index";
import { t } from "@/translations/helper";
import {
	OnboardingConfigManager,
	OnboardingConfigMode,
	OnboardingConfig,
} from "@/managers/onboarding-manager";
import { SettingsChangeDetector } from "@/services/settings-change-detector";
import { UserLevelSelector } from "./UserLevelSelector";
import { ConfigPreview } from "./ConfigPreview";
import { TaskCreationGuide } from "./TaskCreationGuide";
import { OnboardingComplete } from "./OnboardingComplete";
import { IntroTyping } from "./IntroTyping";
import { ModeSelection } from "./ModeSelection";
import { FluentPlacement } from "./FluentPlacement";
import "@/experimental/v2/styles/v2-enhanced.css";

export const ONBOARDING_VIEW_TYPE = "task-genius-onboarding";

export enum OnboardingStep {
	SETTINGS_CHECK = 0,
	INTRO = 1,
	MODE_SELECT = 2,
	FLUENT_PLACEMENT = 3,
	USER_LEVEL_SELECT = 4,
	CONFIG_PREVIEW = 5,
	TASK_CREATION_GUIDE = 6,
	COMPLETE = 7,
}

export interface OnboardingState {
	currentStep: OnboardingStep;
	selectedConfig?: OnboardingConfig;
	skipTaskGuide: boolean;
	isCompleting: boolean;
	userHasChanges: boolean;
	changesSummary: string[];
	uiMode: 'fluent' | 'legacy';
	useSideLeaves: boolean; // Applies when uiMode === 'fluent'
}

export class OnboardingView extends ItemView {
	private plugin: TaskProgressBarPlugin;
	private configManager: OnboardingConfigManager;
	private settingsDetector: SettingsChangeDetector;
	private onComplete: () => void;
	private state: OnboardingState;

	// Step components
	private introTyping: IntroTyping;
	private modeSelection: ModeSelection;
	private fluentPlacement: FluentPlacement;
	private userLevelSelector: UserLevelSelector;
	private configPreview: ConfigPreview;
	private taskCreationGuide: TaskCreationGuide;
	private onboardingComplete: OnboardingComplete;

	// UI Elements
	private onboardingHeaderEl: HTMLElement;
	private onboardingContentEl: HTMLElement;
	private footerEl: HTMLElement;
	private nextButton: ButtonComponent;
	private backButton: ButtonComponent;
	private skipButton: ButtonComponent;

	constructor(leaf: WorkspaceLeaf, plugin: TaskProgressBarPlugin, onComplete: () => void) {
		super(leaf);
		this.plugin = plugin;
		this.configManager = new OnboardingConfigManager(plugin);
		this.settingsDetector = new SettingsChangeDetector(plugin);
		this.onComplete = onComplete;

		// Initialize state - always start with INTRO
		this.state = {
			currentStep: OnboardingStep.INTRO,
			skipTaskGuide: false,
			isCompleting: false,
			userHasChanges: this.settingsDetector.hasUserMadeChanges(),
			changesSummary: this.settingsDetector.getChangesSummary(),
			uiMode: 'fluent',
			useSideLeaves: true,
		};

		// Initialize components
		this.introTyping = new IntroTyping();
		this.modeSelection = new ModeSelection();
		this.fluentPlacement = new FluentPlacement();
		this.userLevelSelector = new UserLevelSelector(this.configManager);
		this.configPreview = new ConfigPreview(this.configManager);
		this.taskCreationGuide = new TaskCreationGuide(this.plugin);
		this.onboardingComplete = new OnboardingComplete();
	}

	getViewType(): string {
		return ONBOARDING_VIEW_TYPE;
	}

	getDisplayText(): string {
		return t("Task Genius Onboarding");
	}

	getIcon(): string {
		return "zap";
	}

	async onOpen() {
		this.createViewStructure();
		this.displayCurrentStep();
	}

	async onClose() {
		// Cleanup when view is closed
		this.contentEl.empty();
	}

	/**
	 * Create the basic view structure
	 */
	private createViewStructure() {
		const container = this.containerEl;
		container.empty();
		container.addClass("onboarding-view");

		// Header section
		this.onboardingHeaderEl = container.createDiv("onboarding-header");

		// Main content section
		this.onboardingContentEl = container.createDiv("onboarding-content");


		// Footer with navigation buttons
		this.footerEl = container.createDiv("onboarding-footer");
		this.createFooterButtons();

		// Apply initial UI mode class
		this.applyUIModeClass();

		container.createEl("div", {
			cls: "onboarding-shadow"
		});
	}


	/**
	 * Render top header bar (minimal title-only; choices are in content)
	 */
	private renderHeaderBar() {
		this.applyUIModeClass();
		// const bar = this.onboardingHeaderEl.createDiv({cls: "onboarding-topbar"});
		// const left = bar.createDiv({cls: "onboarding-topbar-left"});
		// left.createEl("span", {text: t("Task Genius"), cls: "onboarding-topbar-title"});
		// bar.createDiv({cls: "onboarding-topbar-right"});
	}

	/**
	 * Toggle UI mode classes on the root container
	 */
	private applyUIModeClass() {
		const root = this.contentEl;
		root.toggleClass("mod-fluent", this.state.uiMode === 'fluent');
		root.toggleClass("mod-legacy", this.state.uiMode === 'legacy');
	}

	/**
	 * Create footer navigation buttons
	 */
	private createFooterButtons() {
		const buttonContainer = this.footerEl.createDiv("onboarding-buttons");

		// Skip button (shown on appropriate steps)
		this.skipButton = new ButtonComponent(buttonContainer)
			.setButtonText(t("Skip setup"))
			.onClick(() => this.handleSkip());
		this.skipButton.buttonEl.addClass("clickable-icon");

		// Back button
		this.backButton = new ButtonComponent(buttonContainer)
			.setButtonText(t("Back"))
			.onClick(() => this.handleBack());
		this.backButton.buttonEl.addClass("clickable-icon");

		// Next button
		this.nextButton = new ButtonComponent(buttonContainer)
			.setButtonText(t("Next"))
			.setCta()
			.onClick(() => this.handleNext());
		// this.nextButton.buttonEl.addClass("clickable-icon");
	}

	/**
	 * Display the current step content
	 */
	private displayCurrentStep() {
		// Clear content
		this.onboardingHeaderEl.empty();
		this.onboardingContentEl.empty();

		// Render topbar
		this.renderHeaderBar();

		// Update button visibility
		this.updateButtonStates();

		switch (this.state.currentStep) {
			case OnboardingStep.SETTINGS_CHECK:
				this.displaySettingsCheckStep();
				break;
			case OnboardingStep.INTRO:
				this.displayIntroTypingStep();
				break;
			case OnboardingStep.MODE_SELECT:
				this.displayModeSelectionStep();
				break;
			case OnboardingStep.FLUENT_PLACEMENT:
				this.displayFluentPlacementStep();
				break;
			case OnboardingStep.USER_LEVEL_SELECT:
				this.displayUserLevelSelectStep();
				break;
			case OnboardingStep.CONFIG_PREVIEW:
				this.displayConfigPreviewStep();
				break;
			case OnboardingStep.TASK_CREATION_GUIDE:
				this.displayTaskCreationGuideStep();
				break;
			case OnboardingStep.COMPLETE:
				this.displayCompleteStep();
				break;
		}
	}

	/**
	 * Display settings check step - ask if user wants to continue wizard
	 */
	private displaySettingsCheckStep() {
		// Header
		this.onboardingHeaderEl.createEl("h1", {text: t("Task Genius Setup")});
		this.onboardingHeaderEl.createEl("p", {
			text: t("Oh, We noticed you've already configured Task Genius before."),
			cls: "onboarding-subtitle",
		});

		// Content
		const content = this.onboardingContentEl;
		const checkSection = content.createDiv("settings-check-section");

		// Show detected changes
		checkSection.createEl("h3", {text: t("Your current configuration includes:")});
		const changesList = checkSection.createEl("ul", {cls: "changes-summary-list"});

		this.state.changesSummary.forEach(change => {
			const item = changesList.createEl("li");
			const checkIcon = item.createSpan("change-check");
			setIcon(checkIcon, "check");
			item.createSpan("change-text").setText(change);
		});

		// Ask if they want onboarding
		const questionSection = content.createDiv("onboarding-question");
		questionSection.createEl("h3", {text: t("Would you like to continue with the setup wizard?")});

		const optionsContainer = questionSection.createDiv("question-options");

		const yesButton = optionsContainer.createEl("button", {
			text: t("Yes, show me the setup wizard"),
			cls: "mod-cta question-button clickable-icon",
		});
		yesButton.addEventListener("click", () => {
			this.state.currentStep = OnboardingStep.MODE_SELECT;
			this.displayCurrentStep();
		});

		const noButton = optionsContainer.createEl("button", {
			text: t("No, I'm happy with my current setup"),
			cls: "question-button clickable-icon",
		});
		noButton.addEventListener("click", () => this.handleSkip());
	}

	/**
	 * Display welcome step
	 */
	private displayWelcomeStep() {
		// Header
		this.onboardingHeaderEl.createEl("h1", {text: t("Welcome to Task Genius")});
		this.onboardingHeaderEl.createEl("p", {
			text: t(
				"Transform your task management with advanced progress tracking and workflow automation"
			),
			cls: "onboarding-subtitle",
		});

		// Content - reuse existing welcome step logic from modal
		const content = this.onboardingContentEl;
		const welcomeSection = content.createDiv("welcome-section");

		// Plugin features overview
		const featuresContainer = welcomeSection.createDiv("features-overview");

		const features = [
			{
				icon: "bar-chart-3",
				title: t("Progress Tracking"),
				description: t(
					"Visual progress bars and completion tracking for all your tasks"
				),
			},
			{
				icon: "building",
				title: t("Project Management"),
				description: t(
					"Organize tasks by projects with advanced filtering and sorting"
				),
			},
			{
				icon: "zap",
				title: t("Workflow Automation"),
				description: t(
					"Automate task status changes and improve your productivity"
				),
			},
			{
				icon: "calendar",
				title: t("Multiple Views"),
				description: t(
					"Kanban boards, calendars, Gantt charts, and more visualization options"
				),
			},
		];

		features.forEach((feature) => {
			const featureEl = featuresContainer.createDiv("feature-item");
			const iconEl = featureEl.createDiv("feature-icon");
			setIcon(iconEl, feature.icon);
			const featureContent = featureEl.createDiv("feature-content");
			featureContent.createEl("h3", {text: feature.title});
			featureContent.createEl("p", {text: feature.description});
		});

		// Setup note
		const setupNote = content.createDiv("setup-note");
		setupNote.createEl("p", {
			text: t(
				"This quick setup will help you configure Task Genius based on your experience level and needs. You can always change these settings later."
			),
			cls: "setup-description",
		});
	}

	/**
	 * New: Intro typing step - shows typing animation then mode selection
	 */
	private displayIntroTypingStep() {
		// Hide footer buttons during intro animation
		this.footerEl.style.display = 'none';

		// Create a wrapper container to hold both typing and mode selection
		const introWrapper = this.onboardingContentEl.createDiv({
			cls: "intro-typing-wrapper"
		});

		// Render typing animation
		this.introTyping.render(introWrapper, (typingContainer) => {
			// After typing completes, show mode selection in the same typing container
			// This prevents layout shift since they share the same parent
			const modeContainer = typingContainer.createDiv({
				cls: "intro-mode-selection-container"
			});

			this.modeSelection.render(modeContainer, this.state.uiMode as any, (mode) => {
				this.state.uiMode = mode;
				this.updateButtonStates();
			});

			// Show footer with Next button immediately after mode selection appears
			// User can proceed with default selection or change it
			this.footerEl.style.display = '';
			this.updateButtonStates();
		});
	}

	/**
	 * New: Mode selection (Fluent vs Legacy) with preview cards - standalone step (if needed)
	 */
	private displayModeSelectionStep() {
		// Header
		this.onboardingHeaderEl.createEl("h1", {text: t("Choose Your Interface Style")});
		this.onboardingHeaderEl.createEl("p", {
			text: t("Select your preferred visual and interaction style: modern Fluent or traditional Legacy"),
			cls: "onboarding-subtitle"
		});
		// Content
		this.modeSelection.render(this.onboardingContentEl, this.state.uiMode as any, (mode) => {
			this.state.uiMode = mode;
			this.updateButtonStates();
		});
	}

	/**
	 * New: Fluent placement selection (Sideleaves vs Inline)
	 */
	private displayFluentPlacementStep() {
		// Header
		this.onboardingHeaderEl.createEl("h1", {text: t("Fluent Layout")});
		this.onboardingHeaderEl.createEl("p", {
			text: t("Choose how to display Fluent: use Sideleaves for enhanced multi-column collaboration, or Inline for an immersive single-page experience."),
			cls: "onboarding-subtitle",
		});
		// Content
		this.fluentPlacement.render(this.onboardingContentEl, this.state.useSideLeaves ? "sideleaves" : "inline", (p) => {
			this.state.useSideLeaves = p === "sideleaves";
			this.updateButtonStates();
		});
	}

	/**
	 * Display user level selection step
	 */
	private displayUserLevelSelectStep() {
		// Header
		this.onboardingHeaderEl.createEl("h1", {text: t("Choose Your Usage Mode")});
		this.onboardingHeaderEl.createEl("p", {
			text: t(
				"Select the configuration that best matches your task management experience"
			),
			cls: "onboarding-subtitle",
		});

		// Content
		this.userLevelSelector.render(this.onboardingContentEl, (config) => {
			this.state.selectedConfig = config;
			this.updateButtonStates();
		});
	}

	/**
	 * Display configuration preview step
	 */
	private displayConfigPreviewStep() {
		if (!this.state.selectedConfig) {
			this.state.currentStep = OnboardingStep.USER_LEVEL_SELECT;
			this.displayCurrentStep();
			return;
		}

		// Header
		this.onboardingHeaderEl.createEl("h1", {text: t("Configuration Preview")});
		this.onboardingHeaderEl.createEl("p", {
			text: t(
				"Review the settings that will be applied for your selected mode"
			),
			cls: "onboarding-subtitle",
		});

		// Content
		this.configPreview.render(
			this.onboardingContentEl,
			this.state.selectedConfig
		);

		// Task guide option
		const optionsSection =
			this.onboardingContentEl.createDiv("config-options");

		new Setting(optionsSection)
			.setName(t("Include task creation guide"))
			.setDesc(t("Show a quick tutorial on creating your first task"))
			.addToggle((toggle) => {
				toggle.setValue(!this.state.skipTaskGuide).onChange((value) => {
					this.state.skipTaskGuide = !value;
				});
			});
	}

	/**
	 * Display task creation guide step
	 */
	private displayTaskCreationGuideStep() {
		// Header
		this.onboardingHeaderEl.createEl("h1", {text: t("Create Your First Task")});
		this.onboardingHeaderEl.createEl("p", {
			text: t("Learn how to create and format tasks in Task Genius"),
			cls: "onboarding-subtitle",
		});

		// Content
		this.taskCreationGuide.render(this.onboardingContentEl);
	}

	/**
	 * Display completion step
	 */
	private displayCompleteStep() {
		if (!this.state.selectedConfig) return;

		// Header
		this.onboardingHeaderEl.createEl("h1", {text: t("Setup Complete!")});
		this.onboardingHeaderEl.createEl("p", {
			text: t("Task Genius is now configured and ready to use"),
			cls: "onboarding-subtitle",
		});

		// Content
		this.onboardingComplete.render(
			this.onboardingContentEl,
			this.state.selectedConfig
		);
	}

	/**
	 * Update button states based on current step
	 */
	private updateButtonStates() {
		const step = this.state.currentStep;

		// Skip button - show on settings check and intro
		this.skipButton.buttonEl.style.display =
			step === OnboardingStep.SETTINGS_CHECK || step === OnboardingStep.INTRO
				? "inline-block" : "none";

		// Back button - hide on intro, show on settings check and after
		this.backButton.buttonEl.style.display =
			step === OnboardingStep.INTRO ? "none" : "inline-block";

		// Next button text and state
		const isLastStep = step === OnboardingStep.COMPLETE;
		const isSettingsCheck = step === OnboardingStep.SETTINGS_CHECK;

		if (isSettingsCheck) {
			this.nextButton.buttonEl.style.display = "none"; // Hide on settings check
		} else {
			this.nextButton.buttonEl.style.display = "inline-block";
			this.nextButton.setButtonText(
				isLastStep ? t("Start Using Task Genius") : t("Next")
			);
		}

		// Enable/disable next based on selection
		if (step === OnboardingStep.USER_LEVEL_SELECT) {
			this.nextButton.setDisabled(!this.state.selectedConfig);
		} else {
			this.nextButton.setDisabled(this.state.isCompleting);
		}
	}

	/**
	 * Handle skip onboarding
	 */
	private async handleSkip() {
		await this.configManager.skipOnboarding();
		this.onComplete();
		this.leaf.detach();
	}

	/**
	 * Handle back navigation
	 */
	private handleBack() {
		if (this.state.currentStep > OnboardingStep.INTRO) {
			// Handle back from settings check - go to intro
			if (this.state.currentStep === OnboardingStep.SETTINGS_CHECK) {
				this.state.currentStep = OnboardingStep.INTRO;
			}
			// Handle back from mode select - check if came from settings check
			else if (this.state.currentStep === OnboardingStep.MODE_SELECT) {
				// If user has changes, go back to settings check, otherwise to intro
				this.state.currentStep = this.state.userHasChanges
					? OnboardingStep.SETTINGS_CHECK
					: OnboardingStep.INTRO;
			} else {
				this.state.currentStep--;

				// Skip task guide if it was skipped
				if (
					this.state.currentStep === OnboardingStep.TASK_CREATION_GUIDE &&
					this.state.skipTaskGuide
				) {
					this.state.currentStep--;
				}
			}

			this.displayCurrentStep();
		}
	}

	/**
	 * Handle next navigation
	 */
	private async handleNext() {
		const step = this.state.currentStep;

		// Handle completion
		if (step === OnboardingStep.COMPLETE) {
			await this.completeOnboarding();
			return;
		}

		// Validate current step
		if (!this.validateCurrentStep()) {
			return;
		}

		// Custom flow for new intro/mode/placement steps
		// Intro step now includes mode selection, so skip MODE_SELECT step
		if (step === OnboardingStep.INTRO) {
			// After intro (which includes mode selection), check if user has changes
			if (this.state.userHasChanges) {
				this.state.currentStep = OnboardingStep.SETTINGS_CHECK;
			} else {
				// Skip MODE_SELECT and go directly to FLUENT_PLACEMENT or USER_LEVEL_SELECT
				this.state.currentStep = this.state.uiMode === 'fluent'
					? OnboardingStep.FLUENT_PLACEMENT
					: OnboardingStep.USER_LEVEL_SELECT;
			}
		} else if (step === OnboardingStep.MODE_SELECT) {
			// This step is now integrated into INTRO, but keep for backward compatibility
			this.state.currentStep = this.state.uiMode === 'fluent'
				? OnboardingStep.FLUENT_PLACEMENT
				: OnboardingStep.USER_LEVEL_SELECT;
		} else if (step === OnboardingStep.FLUENT_PLACEMENT) {
			this.state.currentStep = OnboardingStep.USER_LEVEL_SELECT;
		} else {
			// Default increment for the remaining steps
			this.state.currentStep++;
		}

		// Apply architecture selection and configuration when moving to preview
		if (
			this.state.currentStep === OnboardingStep.CONFIG_PREVIEW &&
			this.state.selectedConfig
		) {
			try {
				await this.applyArchitectureSelections();
				await this.configManager.applyConfiguration(
					this.state.selectedConfig.mode
				);
			} catch (error) {
				console.error("Failed to apply configuration:", error);
				// Continue anyway, user can adjust in settings
			}
		}

		// Skip task guide if requested
		if (
			this.state.currentStep === OnboardingStep.TASK_CREATION_GUIDE &&
			this.state.skipTaskGuide
		) {
			this.state.currentStep++;
		}

		this.displayCurrentStep();
	}

	/**
	 * Validate current step before proceeding
	 */
	private validateCurrentStep(): boolean {
		switch (this.state.currentStep) {
			case OnboardingStep.USER_LEVEL_SELECT:
				return !!this.state.selectedConfig;
			default:
				return true;
		}
	}

	/**
	 * Apply Legacy vs Fluent selection and sideleaves preference to settings
	 */
	private async applyArchitectureSelections() {
		const isFluent = this.state.uiMode === 'fluent';
		if (!this.plugin.settings.experimental) {
			(this.plugin.settings as any).experimental = {enableV2: false, showV2Ribbon: false};
		}
		this.plugin.settings.experimental!.enableV2 = isFluent;
		// Prepare v2 config and set placement option when Fluent is chosen
		if (!this.plugin.settings.experimental!.v2Config) {
			(this.plugin.settings.experimental as any).v2Config = {
				enableWorkspaces: true,
				defaultWorkspace: 'default',
				showTopNavigation: true,
				showNewSidebar: true,
				allowViewSwitching: true,
				persistViewMode: true,
				maxOtherViewsBeforeOverflow: 5,
			};
		}
		if (isFluent) {
			(this.plugin.settings.experimental as any).v2Config.useWorkspaceSideLeaves = !!this.state.useSideLeaves;
		}
		await this.plugin.saveSettings();
	}


	/**
	 * Complete onboarding process
	 */
	private async completeOnboarding() {
		if (!this.state.selectedConfig || this.state.isCompleting) return;

		this.state.isCompleting = true;
		this.updateButtonStates();

		try {
			// Mark onboarding as completed
			await this.configManager.completeOnboarding(
				this.state.selectedConfig.mode
			);

			// Close view and trigger callback
			this.onComplete();
			this.leaf.detach();
		} catch (error) {
			console.error("Failed to complete onboarding:", error);
			this.state.isCompleting = false;
			this.updateButtonStates();
		}
	}
}
