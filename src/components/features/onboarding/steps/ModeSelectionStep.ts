import { t } from "@/translations/helper";
import { SelectableCard, SelectableCardConfig } from "@/components/features/onboarding/ui/SelectableCard";
import { OnboardingController } from "@/components/features/onboarding/OnboardingController";
import { Alert } from "@/components/features/onboarding/ui/Alert";

export type UIMode = 'fluent' | 'legacy';

/**
 * Mode Selection Step - Choose between Fluent and Legacy UI
 */
export class ModeSelectionStep {
	/**
	 * Render the mode selection step
	 */
	static render(
		headerEl: HTMLElement,
		contentEl: HTMLElement,
		controller: OnboardingController
	) {
		// Clear
		headerEl.empty();
		contentEl.empty();

		// Get current state
		const currentMode = controller.getState().uiMode;

		// Create cards configuration
		const cardConfigs: SelectableCardConfig<UIMode>[] = [
			{
				id: "fluent",
				title: t("Fluent"),
				subtitle: t("Modern & Sleek"),
				description: t(
					"New visual design with elegant animations and modern interactions"
				),
				preview: this.createFluentPreview(),
			},
			{
				id: "legacy",
				title: t("Legacy"),
				subtitle: t("Classic & Familiar"),
				description: t(
					"Keep the familiar interface and interaction style you know"
				),
				preview: this.createLegacyPreview(),
			},
		];

		// Render selectable cards
		const card = new SelectableCard<UIMode>(
			contentEl,
			cardConfigs,
			{
				containerClass: "selectable-cards-container",
				cardClass: "selectable-card",
				showPreview: true,
			},
			(mode) => {
				controller.setUIMode(mode);
			}
		);

		// Set initial selection
		if (currentMode) {
			card.setSelected(currentMode);
		}

		// Add info alert
		Alert.create(
			contentEl,
			t("You can change this option later in settings"),
			{
				variant: "info",
				className: "mode-selection-tip",
			}
		);
	}

	/**
	 * Render mode selection inline (for intro step)
	 * This version doesn't clear the container and calls a custom callback
	 */
	static renderInline(
		containerEl: HTMLElement,
		controller: OnboardingController,
		onSelect: (mode: UIMode) => void
	) {
		// Get current state
		const currentMode = controller.getState().uiMode;

		// Create cards configuration
		const cardConfigs: SelectableCardConfig<UIMode>[] = [
			{
				id: "fluent",
				title: t("Fluent"),
				subtitle: t("Modern & Sleek"),
				description: t(
					"New visual design with elegant animations and modern interactions"
				),
				preview: this.createFluentPreview(),
			},
			{
				id: "legacy",
				title: t("Legacy"),
				subtitle: t("Classic & Familiar"),
				description: t(
					"Keep the familiar interface and interaction style you know"
				),
				preview: this.createLegacyPreview(),
			},
		];

		// Render selectable cards
		const card = new SelectableCard<UIMode>(
			containerEl,
			cardConfigs,
			{
				containerClass: "selectable-cards-container",
				cardClass: "selectable-card",
				showPreview: true,
			},
			(mode) => {
				onSelect(mode);
			}
		);

		// Set initial selection
		if (currentMode) {
			card.setSelected(currentMode);
		}

		// Add info alert
		Alert.create(
			containerEl,
			t("You can change this option later in settings"),
			{
				variant: "info",
				className: "mode-selection-tip",
			}
		);
	}

	/**
	 * Create Fluent mode preview
	 */
	private static createFluentPreview(): HTMLElement {
		const preview = document.createElement("div");
		preview.addClass("mode-preview", "mode-preview-fluent");

		// Check theme
		const isDark = document.body.classList.contains("theme-dark");
		const theme = isDark ? "" : "-light";
		const imageUrl = `https://raw.githubusercontent.com/Quorafind/Obsidian-Task-Progress-Bar/master/media/fluent${theme}.png`;

		preview.innerHTML = `<img src="${imageUrl}" alt="Fluent mode preview" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 4px;">`;

		return preview;
	}

	/**
	 * Create Legacy mode preview
	 */
	private static createLegacyPreview(): HTMLElement {
		const preview = document.createElement("div");
		preview.addClass("mode-preview", "mode-preview-legacy");

		// Check theme
		const isDark = document.body.classList.contains("theme-dark");
		const theme = isDark ? "" : "-light";
		const imageUrl = `https://raw.githubusercontent.com/Quorafind/Obsidian-Task-Progress-Bar/master/media/legacy${theme}.png`;

		preview.innerHTML = `<img src="${imageUrl}" alt="Legacy mode preview" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 4px;">`;

		return preview;
	}
}
