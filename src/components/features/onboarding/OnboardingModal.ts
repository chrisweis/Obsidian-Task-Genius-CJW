import { App, Modal, Setting, ButtonComponent, setIcon } from "obsidian";
import type TaskProgressBarPlugin from "@/index";
import { t } from "@/translations/helper";
import {
	OnboardingConfigManager,
	OnboardingConfigMode,
	OnboardingConfig,
} from "@/managers/onboarding-manager";
import { UserLevelSelector } from "./UserLevelSelector";
import { ConfigPreview } from "./ConfigPreview";
import { TaskCreationGuide } from "./TaskCreationGuide";
import { OnboardingComplete } from "./OnboardingComplete";
import { IntroTyping } from "./IntroTyping";
import { ModeSelection } from "./ModeSelection";
import { FluentPlacement } from "./FluentPlacement";
import "@/experimental/v2/styles/v2-enhanced.css";

export enum OnboardingStep {
	INTRO = 0,
	MODE_SELECT = 1,
	FLUENT_PLACEMENT = 2,
	USER_LEVEL_SELECT = 3,
	CONFIG_PREVIEW = 4,
	TASK_CREATION_GUIDE = 5,
	COMPLETE = 6,
}

export interface OnboardingState {
	currentStep: OnboardingStep;
	selectedConfig?: OnboardingConfig;
	skipTaskGuide: boolean;
	isCompleting: boolean;
	uiMode: 'fluent' | 'legacy';
	useSideLeaves: boolean; // Applies when uiMode === 'fluent'
}

export class OnboardingModal extends Modal {
	private plugin: TaskProgressBarPlugin;
	private configManager: OnboardingConfigManager;
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
	private headerEl: HTMLElement;
	private onboardingContentEl: HTMLElement;
	private footerEl: HTMLElement;
	private nextButton: ButtonComponent;
	private backButton: ButtonComponent;
	private skipButton: ButtonComponent;

	constructor(
		app: App,
		plugin: TaskProgressBarPlugin,
		onComplete: () => void
	) {
		super(app);
		this.plugin = plugin;
		this.configManager = new OnboardingConfigManager(plugin);
		this.onComplete = onComplete;

		// Initialize state
		this.state = {
			currentStep: OnboardingStep.INTRO,
			skipTaskGuide: false,
			isCompleting: false,
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

		// Setup modal properties
		this.modalEl.addClass("onboarding-modal");
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.empty();

		this.createModalStructure();
		this.displayCurrentStep();
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}

	/**
	 * Create the basic modal structure
	 */
	private createModalStructure() {
		const {contentEl} = this;
 
		// Header section
		this.headerEl = contentEl.createDiv("onboarding-header");

		// Main content section
		this.onboardingContentEl = contentEl.createDiv("onboarding-content");

		// Footer with navigation buttons
		this.footerEl = contentEl.createDiv("onboarding-footer");
		this.createFooterButtons();

		// Apply initial UI mode class
		this.applyUIModeClass();
	}


	/**
	 * Render top header bar (minimal title-only; choices are in content)
	 */
	private renderHeaderBar() {
		this.applyUIModeClass();
		// const bar = this.headerEl.createDiv({cls: "onboarding-topbar"});
		// const left = bar.createDiv({cls: "onboarding-topbar-left"});
		// left.createEl("span", {text: t("Task Genius"), cls: "onboarding-topbar-title"});
		// bar.createDiv({cls: "onboarding-topbar-right"});
	}

	/**
	 * Toggle UI mode classes on the modal element
	 */
	private applyUIModeClass() {
		const root = this.modalEl;
		root.toggleClass("mod-fluent", this.state.uiMode === 'fluent');
		root.toggleClass("mod-legacy", this.state.uiMode === 'legacy');
	}

	/**
	 * Create footer navigation buttons
	 */
	private createFooterButtons() {
		const buttonContainer = this.footerEl.createDiv("onboarding-buttons");

		// Skip button (shown on welcome step)
		this.skipButton = new ButtonComponent(buttonContainer)
			.setButtonText(t("Skip onboarding"))
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
		this.nextButton.buttonEl.addClass("clickable-icon");
	}

	/**
	 * Display the current step content
	 */
	private displayCurrentStep() {
		// Clear content
		this.headerEl.empty();
		this.onboardingContentEl.empty();

		// Render topbar
		this.renderHeaderBar();

		// Update button visibility
		this.updateButtonStates();

		switch (this.state.currentStep) {
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
	 * Display welcome step
	 */
	private displayWelcomeStep() {
		// Header
		this.headerEl.createEl("h1", {text: t("Welcome to Task Genius")});
		this.headerEl.createEl("p", {
			text: t(
				"Transform your task management with advanced progress tracking and workflow automation"
			),
			cls: "onboarding-subtitle",
		});

		// Content
		const content = this.onboardingContentEl;

		// Welcome message
		const welcomeSection = content.createDiv("welcome-section");

		// Plugin features overview
		const featuresContainer = welcomeSection.createDiv("features-overview");

		const features = [
			{
				icon: "bar-chart-3", // Lucide bar chart icon
				title: t("Progress Tracking"),
				description: t(
					"Visual progress bars and completion tracking for all your tasks"
				),
			},
			{
				icon: "building", // Lucide building icon for project management
				title: t("Project Management"),
				description: t(
					"Organize tasks by projects with advanced filtering and sorting"
				),
			},
			{
				icon: "zap", // Lucide lightning bolt icon
				title: t("Workflow Automation"),
				description: t(
					"Automate task status changes and improve your productivity"
				),
			},
			{
				icon: "calendar", // Lucide calendar icon
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
	 * New: Intro typing step
	 */
	private displayIntroTypingStep() {
		// this.headerEl.createEl("h1", {text: t("Welcome")});
		this.introTyping.render(this.onboardingContentEl);
	}

	/**
	 * New: Mode selection (Fluent vs Legacy)
	 */
	private displayModeSelectionStep() {
		this.headerEl.createEl("h1", {text: t("Choose Your Interface Style")});
		this.headerEl.createEl("p", {
			text: t("Select your preferred visual and interaction style: modern Fluent or traditional Legacy"),
			cls: "onboarding-subtitle"
		});
		this.modeSelection.render(this.onboardingContentEl, this.state.uiMode as any, (mode) => {
			this.state.uiMode = mode;
			this.updateButtonStates();
		});
	}

	/**
	 * New: Fluent placement selection
	 */
	private displayFluentPlacementStep() {
		this.headerEl.createEl("h1", {text: t("Fluent Layout")});
		this.headerEl.createEl("p", {
			text: t("Choose how to display Fluent: use Sideleaves for enhanced multi-column collaboration, or Inline for an immersive single-page experience."),
			cls: "onboarding-subtitle"
		});
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
		this.headerEl.createEl("h1", {text: t("Choose Your Usage Mode")});
		this.headerEl.createEl("p", {
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
		this.headerEl.createEl("h1", {text: t("Configuration Preview")});
		this.headerEl.createEl("p", {
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
		this.headerEl.createEl("h1", {text: t("Create Your First Task")});
		this.headerEl.createEl("p", {
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
		this.headerEl.createEl("h1", {text: t("Setup Complete!")});
		this.headerEl.createEl("p", {
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

		// Skip button - only show on intro
		this.skipButton.buttonEl.style.display =
			step === OnboardingStep.INTRO ? "inline-block" : "none";

		// Back button - hide on first step
		this.backButton.buttonEl.style.display =
			step === OnboardingStep.INTRO ? "none" : "inline-block";

		// Next button
		const isLastStep = step === OnboardingStep.COMPLETE;
		this.nextButton.setButtonText(
			isLastStep ? t("Start Using Task Genius") : t("Next")
		);

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
		this.close();
	}

	/**
	 * Handle back navigation
	 */
	private handleBack() {
		if (this.state.currentStep > OnboardingStep.INTRO) {
			this.state.currentStep--;

			// Skip task guide if it was skipped
			if (
				this.state.currentStep === OnboardingStep.TASK_CREATION_GUIDE &&
				this.state.skipTaskGuide
			) {
				this.state.currentStep--;
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

		// Branching for intro/mode/placement
		if (step === OnboardingStep.INTRO) {
			this.state.currentStep = OnboardingStep.MODE_SELECT;
		} else if (step === OnboardingStep.MODE_SELECT) {
			this.state.currentStep = this.state.uiMode === 'fluent'
				? OnboardingStep.FLUENT_PLACEMENT
				: OnboardingStep.USER_LEVEL_SELECT;
		} else if (step === OnboardingStep.FLUENT_PLACEMENT) {
			this.state.currentStep = OnboardingStep.USER_LEVEL_SELECT;
		} else {
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

			// Close modal and trigger callback
			this.close();
			this.onComplete();
		} catch (error) {
			console.error("Failed to complete onboarding:", error);
			this.state.isCompleting = false;
			this.updateButtonStates();
		}
	}
}
