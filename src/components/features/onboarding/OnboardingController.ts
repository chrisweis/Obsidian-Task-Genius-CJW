import { OnboardingConfig, OnboardingConfigMode } from "@/managers/onboarding-manager";

export enum OnboardingStep {
	INTRO = 0,
	MODE_SELECT = 1,
	FLUENT_PLACEMENT = 2,
	USER_LEVEL_SELECT = 3,
	CONFIG_PREVIEW = 4,
	TASK_CREATION_GUIDE = 5,
	COMPLETE = 6,
	SETTINGS_CHECK = 7,
}

export interface OnboardingState {
	currentStep: OnboardingStep;
	selectedConfig?: OnboardingConfig;
	skipTaskGuide: boolean;
	isCompleting: boolean;
	userHasChanges: boolean;
	changesSummary: string[];
	uiMode: 'fluent' | 'legacy';
	useSideLeaves: boolean;
	settingsCheckAction?: 'wizard' | 'keep';
}

export type OnboardingEventType =
	| 'step-changed'
	| 'state-updated'
	| 'navigation-blocked'
	| 'completed';

export interface OnboardingEvent {
	type: OnboardingEventType;
	step?: OnboardingStep;
	state?: Partial<OnboardingState>;
}

/**
 * Central controller for onboarding state and navigation
 * Manages:
 * - Current step tracking
 * - Navigation logic (next, back, skip)
 * - State updates
 * - Validation
 */
export class OnboardingController {
	private state: OnboardingState;
	private listeners: Map<OnboardingEventType, ((event: OnboardingEvent) => void)[]> = new Map();

	constructor(initialState?: Partial<OnboardingState>) {
		this.state = {
			currentStep: OnboardingStep.INTRO,
			skipTaskGuide: false,
			isCompleting: false,
			userHasChanges: false,
			changesSummary: [],
			uiMode: 'fluent',
			useSideLeaves: true,
			...initialState,
		};
	}

	// ==================== State Management ====================

	/**
	 * Get current state
	 */
	getState(): OnboardingState {
		return { ...this.state };
	}

	/**
	 * Get current step
	 */
	getCurrentStep(): OnboardingStep {
		return this.state.currentStep;
	}

	/**
	 * Update state partially
	 */
	updateState(updates: Partial<OnboardingState>) {
		this.state = { ...this.state, ...updates };
		this.emit('state-updated', { state: updates });
	}

	/**
	 * Set selected configuration
	 */
	setSelectedConfig(config: OnboardingConfig | undefined) {
		this.updateState({ selectedConfig: config });
	}

	/**
	 * Set UI mode
	 */
	setUIMode(mode: 'fluent' | 'legacy') {
		this.updateState({ uiMode: mode });
	}

	/**
	 * Set side leaves preference
	 */
	setUseSideLeaves(use: boolean) {
		this.updateState({ useSideLeaves: use });
	}

	/**
	 * Set skip task guide
	 */
	setSkipTaskGuide(skip: boolean) {
		this.updateState({ skipTaskGuide: skip });
	}

	// ==================== Navigation ====================

	/**
	 * Navigate to next step
	 */
	async next(): Promise<boolean> {
		// Validate current step
		if (!this.validateCurrentStep()) {
			this.emit('navigation-blocked', { step: this.state.currentStep });
			return false;
		}

		const currentStep = this.state.currentStep;
		let nextStep: OnboardingStep;

		// Determine next step based on current step and state
		switch (currentStep) {
			case OnboardingStep.INTRO:
				// Check if user has changes
				if (this.state.userHasChanges) {
					nextStep = OnboardingStep.SETTINGS_CHECK;
				} else if (this.state.uiMode === 'fluent') {
					nextStep = OnboardingStep.FLUENT_PLACEMENT;
				} else {
					nextStep = OnboardingStep.USER_LEVEL_SELECT;
				}
				break;

			case OnboardingStep.SETTINGS_CHECK:
				// User decided to continue, go to appropriate step
				if (this.state.uiMode === 'fluent') {
					nextStep = OnboardingStep.FLUENT_PLACEMENT;
				} else {
					nextStep = OnboardingStep.USER_LEVEL_SELECT;
				}
				break;

			case OnboardingStep.MODE_SELECT:
				// Legacy step, kept for backward compatibility
				if (this.state.uiMode === 'fluent') {
					nextStep = OnboardingStep.FLUENT_PLACEMENT;
				} else {
					nextStep = OnboardingStep.USER_LEVEL_SELECT;
				}
				break;

			case OnboardingStep.FLUENT_PLACEMENT:
				nextStep = OnboardingStep.USER_LEVEL_SELECT;
				break;

			case OnboardingStep.USER_LEVEL_SELECT:
				nextStep = OnboardingStep.CONFIG_PREVIEW;
				break;

			case OnboardingStep.CONFIG_PREVIEW:
				// Skip task guide if requested
				if (this.state.skipTaskGuide) {
					nextStep = OnboardingStep.COMPLETE;
				} else {
					nextStep = OnboardingStep.TASK_CREATION_GUIDE;
				}
				break;

			case OnboardingStep.TASK_CREATION_GUIDE:
				nextStep = OnboardingStep.COMPLETE;
				break;

			case OnboardingStep.COMPLETE:
				// Trigger completion
				this.emit('completed', { step: currentStep });
				return true;

			default:
				// Should not reach here
				return false;
		}

		this.setStep(nextStep);
		return true;
	}

	/**
	 * Navigate to previous step
	 */
	async back(): Promise<boolean> {
		const currentStep = this.state.currentStep;

		// Cannot go back from intro
		if (currentStep === OnboardingStep.INTRO) {
			return false;
		}

		let prevStep: OnboardingStep;

		// Determine previous step based on current step and state
		switch (currentStep) {
			case OnboardingStep.SETTINGS_CHECK:
				prevStep = OnboardingStep.INTRO;
				break;

			case OnboardingStep.MODE_SELECT:
				if (this.state.userHasChanges) {
					prevStep = OnboardingStep.SETTINGS_CHECK;
				} else {
					prevStep = OnboardingStep.INTRO;
				}
				break;

			case OnboardingStep.FLUENT_PLACEMENT:
				prevStep = OnboardingStep.INTRO;
				break;

			case OnboardingStep.USER_LEVEL_SELECT:
				// Go back based on UI mode
				if (this.state.uiMode === 'fluent') {
					prevStep = OnboardingStep.FLUENT_PLACEMENT;
				} else {
					prevStep = OnboardingStep.INTRO;
				}
				break;

			case OnboardingStep.CONFIG_PREVIEW:
				prevStep = OnboardingStep.USER_LEVEL_SELECT;
				break;

			case OnboardingStep.TASK_CREATION_GUIDE:
				prevStep = OnboardingStep.CONFIG_PREVIEW;
				break;

			case OnboardingStep.COMPLETE:
				// Skip task guide if it was skipped
				if (this.state.skipTaskGuide) {
					prevStep = OnboardingStep.CONFIG_PREVIEW;
				} else {
					prevStep = OnboardingStep.TASK_CREATION_GUIDE;
				}
				break;

			default:
				return false;
		}

		this.setStep(prevStep);
		return true;
	}

	/**
	 * Set step directly
	 */
	setStep(step: OnboardingStep) {
		this.state.currentStep = step;
		this.emit('step-changed', { step });
	}

	/**
	 * Skip onboarding
	 */
	skip() {
		this.emit('completed', { step: this.state.currentStep });
	}

	// ==================== Validation ====================

	/**
	 * Validate current step before proceeding
	 */
	private validateCurrentStep(): boolean {
		switch (this.state.currentStep) {
			case OnboardingStep.INTRO:
				// Must have UI mode selected
				return !!this.state.uiMode;

			case OnboardingStep.SETTINGS_CHECK:
				// Must have an action selected
				return !!this.state.settingsCheckAction;

			case OnboardingStep.USER_LEVEL_SELECT:
				// Must have a config selected
				return !!this.state.selectedConfig;

			case OnboardingStep.MODE_SELECT:
			case OnboardingStep.FLUENT_PLACEMENT:
			case OnboardingStep.CONFIG_PREVIEW:
			case OnboardingStep.TASK_CREATION_GUIDE:
			case OnboardingStep.COMPLETE:
			default:
				return true;
		}
	}

	/**
	 * Check if can go to next step
	 */
	canGoNext(): boolean {
		return this.validateCurrentStep();
	}

	/**
	 * Check if can go back
	 */
	canGoBack(): boolean {
		return this.state.currentStep !== OnboardingStep.INTRO;
	}

	/**
	 * Check if skip button should be shown
	 */
	canSkip(): boolean {
		return (
			this.state.currentStep === OnboardingStep.INTRO ||
			this.state.currentStep === OnboardingStep.SETTINGS_CHECK
		);
	}

	// ==================== Event System ====================

	/**
	 * Register event listener
	 */
	on(event: OnboardingEventType, callback: (event: OnboardingEvent) => void) {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, []);
		}
		this.listeners.get(event)!.push(callback);
	}

	/**
	 * Unregister event listener
	 */
	off(event: OnboardingEventType, callback: (event: OnboardingEvent) => void) {
		const callbacks = this.listeners.get(event);
		if (callbacks) {
			const index = callbacks.indexOf(callback);
			if (index > -1) {
				callbacks.splice(index, 1);
			}
		}
	}

	/**
	 * Emit event to all listeners
	 */
	private emit(type: OnboardingEventType, data: Partial<OnboardingEvent> = {}) {
		const event: OnboardingEvent = { type, ...data };
		const callbacks = this.listeners.get(type);
		if (callbacks) {
			callbacks.forEach((cb) => cb(event));
		}
	}
}
