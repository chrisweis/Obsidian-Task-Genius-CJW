import { t } from "@/translations/helper";

export type Placement = "sideleaves" | "inline";

export class FluentPlacement {
  render(
    container: HTMLElement,
    current: Placement | null,
    onSelect: (p: Placement) => void
  ) {
    container.empty();

    const section = container.createDiv({ cls: "placement-selection" });
    section.createEl("h2", { text: t("Fluent Layout"), cls: "section-title" });
    section.createEl("p", {
      text: t("Choose how to display Fluent: use Sideleaves for enhanced multi-column collaboration, or Inline for an immersive single-page experience."),
      cls: "section-desc"
    });

    const options = section.createDiv({ cls: "placement-options" });

    const makeCard = (
      id: Placement,
      titleText: string,
      descText: string
    ) => {
      const el = options.createDiv({ cls: `placement-card placement-${id}` });
      const header = el.createDiv({ cls: "placement-card-header" });
      header.createDiv({ cls: "placement-card-title", text: titleText });
      const body = el.createDiv({ cls: "placement-card-body" });
      const preview = body.createDiv({ cls: "placement-card-preview" });
      // Visual representation for each placement mode
      if (id === "sideleaves") {
        // Three column layout visual
        const col1 = preview.createDiv({ cls: "placement-preview-col" });
        const col2 = preview.createDiv({ cls: "placement-preview-col placement-preview-main" });
        const col3 = preview.createDiv({ cls: "placement-preview-col" });
      } else {
        // Single column layout visual
        const single = preview.createDiv({ cls: "placement-preview-single" });
      }
      body.createDiv({ cls: "placement-card-desc", text: descText });
      if (current === id) el.addClass("is-selected");
      el.addEventListener("click", () => {
        // Remove previous selection
        options.querySelectorAll('.placement-card').forEach(card => {
          card.removeClass('is-selected');
        });
        el.addClass('is-selected');
        onSelect(id);
      });
      el.addClass("clickable-icon");
    };

    
    makeCard(
      "inline",
      t("Inline (Single-Page Immersion)"),
      t("All content in one page, focusing on the main view and reducing interface distractions.")
    );

    makeCard(
      "sideleaves",
      t("Sideleaves (Multi-Column Collaboration)"),
      t("Left navigation and right details as separate workspace sidebars, ideal for simultaneous browsing and editing.")
    );


    const tips = section.createDiv({ cls: "placement-tips" });
    tips.createEl("p", {
      text: t("You can change this option later in settings. We'll strive to maintain fluidity and elegance."),
      cls: "text-muted",
    });
  }
}