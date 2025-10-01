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
			const preview = body.createDiv({cls: ["mode-card-preview", "tg-noise-layer"]});
			// Visual representation for each mode
			const isDark = document.body.classList.contains('theme-dark');
			const theme = isDark ? '' : '-light';
			const imageUrl = `https://raw.githubusercontent.com/Quorafind/Obsidian-Task-Progress-Bar/master/media/${mode}${theme}.png`;

			preview.innerHTML = `<img src="${imageUrl}" alt="${mode} mode preview" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 4px;">`;
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
			t("Fluent"),
			t("New information architecture, navigation and interaction, with more elegant styles and animations."),
			"sparkles"
		);
		card(
			"legacy",
			t("Legacy"),
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

