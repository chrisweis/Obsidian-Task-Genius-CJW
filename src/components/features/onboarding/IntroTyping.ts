import { t } from "@/translations/helper";

export class IntroTyping {
	private timers: number[] = [];
	private onComplete?: () => void;

	cleanup() {
		this.timers.forEach((id) => window.clearTimeout(id));
		this.timers = [];
	}

	render(container: HTMLElement, onComplete?: () => void) {
		this.onComplete = onComplete;
		container.empty();
		const wrap = container.createDiv({cls: "intro-typing"});

		const line1 = wrap.createEl("h1", {cls: "intro-line intro-line-1"});
		const line2 = wrap.createEl("h2", {cls: "intro-line intro-line-2"});
		const line3 = wrap.createEl("p", {cls: "intro-line intro-line-3"});
		const line4 = wrap.createEl("p", {cls: "intro-line intro-line-4"});

		const seq = [
			{
				el: line1,
				text: t("Hi,"),
				speed: 35,
				keepAfter: true
			},
			{
				el: line2,
				text: t("Thank you for using Task Genius"),
				speed: 25,
				keepAfter: false // Will be removed after line3
			},
			{
				el: line3,
				text: t("In the following steps, you will gradually set up Task Genius to get a more suitable environment for you"),
				speed: 20,
				keepAfter: false, // Will be removed after line3
				delayNext: 5000, // Wait for fade out to complete (600ms wait + 500ms fade + 100ms buffer)
				afterComplete: () => {
					// Fade out and remove line2 and line3 after a brief pause
					const id = window.setTimeout(() => {
						line1.addClass("intro-line-fadeout");
						line2.addClass("intro-line-fadeout");
						line3.addClass("intro-line-fadeout");
						const id2 = window.setTimeout(() => {
							line1.remove();
							line2.remove();
							line3.remove();
						}, 2000); // Match CSS transition duration
						this.timers.push(id2);
					}, 3000);
					this.timers.push(id);
				}
			},
			{
				el: line4,
				text: t("In the current version, Task Genius provides a brand new visual and interactive experience: Fluent; while also providing the option to return to the previous interface. Which one do you prefer?"),
				speed: 20,
				keepAfter: true,
				afterComplete: () => {
					// Trigger callback to show mode selection buttons
					if (this.onComplete) {
						const id = window.setTimeout(() => {
							this.onComplete?.();
						}, 300);
						this.timers.push(id);
					}
				}
			},
		];

		this.aiStreamSequence(seq);
	}

	/**
	 * AI-style streaming text effect with smooth character fade-in
	 */
	private aiStreamSequence(seq: {
		el: HTMLElement;
		text: string;
		speed: number;
		afterComplete?: () => void;
		delayNext?: number
	}[]) {
		const streamLine = (idx: number) => {
			if (idx >= seq.length) return;
			const {el, text, speed, afterComplete, delayNext} = seq[idx];

			// Clear and prepare element
			el.empty();
			el.addClass("is-streaming");

			// Create individual character spans for smooth animation
			const chars: HTMLElement[] = [];
			for (let i = 0; i < text.length; i++) {
				const char = text[i];
				const span = el.createSpan({
					cls: "intro-char",
					text: char,
				});
				// Special handling for spaces to preserve layout
				if (char === " ") {
					span.addClass("intro-char-space");
				}
				chars.push(span);
			}

			// Create cursor element that will follow the characters
			const cursor = el.createSpan({
				cls: "intro-cursor",
				text: "▊",
			});

			// Animate characters with AI-style streaming effect
			let charIndex = 0;
			const animateChar = () => {
				if (charIndex < chars.length) {
					const char = chars[charIndex];
					// Add small random variation for more natural feel
					const jitter = Math.random() * speed * 0.3;
					char.addClass("intro-char-visible");

					// Move cursor after the just-revealed character
					char.after(cursor);

					charIndex++;
					const id = window.setTimeout(animateChar, speed + jitter);
					this.timers.push(id);
				} else {
					// Line complete, remove cursor and move to next
					cursor.remove();
					el.removeClass("is-streaming");
					el.addClass("stream-complete");

					// Execute afterComplete callback if provided
					if (afterComplete) {
						afterComplete();
					}

					// Delay before next line (custom or default 300ms)
					const nextDelay = delayNext !== undefined ? delayNext : 300;
					const id = window.setTimeout(() => streamLine(idx + 1), nextDelay);
					this.timers.push(id);
				}
			};

			// Start animation
			animateChar();
		};

		streamLine(0);
	}
}

