import { t } from "@/translations/helper";
import { OnboardingController } from "../OnboardingController";
import { TypingAnimation } from "./intro/TypingAnimation";
import { TransitionMessage } from "./intro/TransitionMessage";
import { ModeSelectionStep, UIMode } from "./ModeSelectionStep";

/**
 * Intro Step - Welcome message with typing animation + mode selection
 */
export class IntroStep {
	private typingAnimation?: TypingAnimation;
	private transitionMessage?: TransitionMessage;

	/**
	 * Render the intro step
	 */
	static render(
		headerEl: HTMLElement,
		contentEl: HTMLElement,
		footerEl: HTMLElement,
		controller: OnboardingController
	) {
		// Clear
		headerEl.empty();
		contentEl.empty();

		// Hide footer during intro animation
		footerEl.style.display = "none";

		// Create wrapper for typing animation
		const introWrapper = contentEl.createDiv({
			cls: "intro-typing-wrapper",
		});

		// Create typing container
		const typingContainer = introWrapper.createDiv({
			cls: "intro-typing",
		});

		// Define welcome messages with timing from original implementation
		const messages = [
			{
				text: t("Hi,"),
				className: "intro-line-1",
				speed: 35,
			},
			{
				text: t("Thank you for using Task Genius"),
				className: "intro-line-2",
				speed: 25,
			},
			{
				text: t(
					"In the following steps, you will gradually set up Task Genius to get a more suitable environment for you"
				),
				className: "intro-line-3",
				speed: 20,
				fadeOut: true,
				pauseAfter: 3000, // Wait 3s for user to read
				fadeOutDelay: 0, // Start fading out immediately after pause
				fadeOutDuration: 2000, // 2s fade out animation
				delayNext: 0, // No extra delay before next message
			},
			{
				text: t(
					"In the current version, Task Genius provides a brand new visual and interactive experience: Fluent; while also providing the option to return to the previous interface. Which one do you prefer?"
				),
				className: "intro-line-4",
				speed: 20,
				pauseAfter: 300, // Brief pause before showing mode selection
			},
		];

		// Start typing animation
		new TypingAnimation(typingContainer, messages, () => {
			// After typing completes, show mode selection in same container
			const modeContainer = introWrapper.createDiv({
				cls: "intro-mode-selection-container"
			});

			// Render mode selection inline (without clearing intro-line-4)
			ModeSelectionStep.renderInline(
				modeContainer,
				controller,
				(mode: UIMode) => {
					// User selected a mode, show footer with Next button
					controller.setUIMode(mode);
					footerEl.style.display = "";
				}
			);
		});
	}

	/**
	 * Cleanup
	 */
	cleanup() {
		this.typingAnimation?.cleanup();
		this.transitionMessage?.cleanup();
	}
}
