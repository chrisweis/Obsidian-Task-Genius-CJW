import { t } from "@/translations/helper";

export type UIMode = 'fluent' | 'legacy';

export class ModeSelection {
  render(
    container: HTMLElement,
    current: UIMode | null,
    onSelect: (mode: UIMode) => void
  ) {
    container.empty();

    const section = container.createDiv({ cls: "mode-selection" });
    section.createEl("h2", { text: t("选择界面风格"), cls: "section-title" });
    section.createEl("p", {
      text: t("在下方选择你更喜欢的视觉与交互风格：全新的 Fluent 或 传统的 Legacy"),
      cls: "section-desc",
    });

    const options = section.createDiv({ cls: "mode-options" });

    const card = (
      mode: UIMode,
      title: string,
      desc: string,
      icon: string
    ) => {
      const el = options.createDiv({ cls: `mode-card tg-v2-card mode-${mode}` });
      const header = el.createDiv({ cls: "tg-v2-card-header" });
      const titleEl = header.createDiv({ cls: "tg-v2-card-title" });
      titleEl.setText(title);
      const body = el.createDiv({ cls: "mode-card-body" });
      const preview = body.createDiv({ cls: "mode-card-preview" });
      preview.setText(" "); // 预览区域占位，后续可替换为图片
      const description = body.createDiv({ cls: "mode-card-desc" });
      description.setText(desc);

      if (current === mode) el.addClass("is-selected");
      el.addEventListener("click", () => onSelect(mode));
      el.setAttr("tabindex", "0");
      el.addClass("clickable-icon");
      return el;
    };

    card(
      "fluent",
      t("Fluent（现代与灵动）"),
      t("全新的信息架构、导航与交互，配合更优雅的样式与动画。"),
      "sparkles"
    );
    card(
      "legacy",
      t("Legacy（经典与稳定）"),
      t("延续过往界面与交互风格，保持熟悉的使用体验。"),
      "layout"
    );

    // 小提示
    const tips = section.createDiv({ cls: "mode-tips" });
    tips.createEl("p", {
      text: t("你可以在设置中随时切换这些选项。我们会尽量保持迁移的平滑与安全。"),
      cls: "text-muted",
    });
  }
}

