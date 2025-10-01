import { t } from "@/translations/helper";

export type UIMode = 'fluent' | 'legacy';

export class ModeSelection {
	render(
		container: HTMLElement,
		current: UIMode | null,
		onSelect: (mode: UIMode) => void
	) {
		container.empty();

		const section = container.createDiv({cls: "mode-selection"});

		const options = section.createDiv({cls: "mode-options"});

		const card = (
			mode: UIMode,
			title: string,
			desc: string,
			icon: string
		) => {
			const el = options.createDiv({cls: `mode-card mode-${mode}`});
			const header = el.createDiv({cls: "mode-card-header"});
			const titleEl = header.createDiv({cls: "mode-card-title"});
			titleEl.setText(title);
			const body = el.createDiv({cls: "mode-card-body"});
			const preview = body.createDiv({cls: "mode-card-preview"});
			// Visual representation for each mode
			if (mode === "fluent") {
				preview.innerHTML = "✨"; // Sparkles for modern
			} else {
				preview.innerHTML = "☰"; // Menu icon for traditional
			}
			const description = body.createDiv({cls: "mode-card-desc"});
			description.setText(desc);

			if (current === mode) el.addClass("is-selected");
			el.addEventListener("click", () => {
				// Remove previous selection
				options.querySelectorAll('.mode-card').forEach(card => {
					card.removeClass('is-selected');
				});
				el.addClass('is-selected');
				onSelect(mode);
			});
			el.setAttr("tabindex", "0");
			el.addClass("clickable-icon");
			return el;
		};

		card(
			"fluent",
			t("Fluent (Modern & Dynamic)"),
			t("New information architecture, navigation and interaction, with more elegant styles and animations."),
			"sparkles"
		);
		card(
			"legacy",
			t("Legacy (Classic & Stable)"),
			t("Continue the previous interface and interaction style, maintaining a familiar user experience."),
			"layout"
		);

		// Tips
		const tips = section.createDiv({cls: "mode-tips"});
		tips.createEl("p", {
			text: t("You can switch these options at any time in settings. We'll try to keep the migration smooth and safe."),
			cls: "text-muted",
		});
	}
}

