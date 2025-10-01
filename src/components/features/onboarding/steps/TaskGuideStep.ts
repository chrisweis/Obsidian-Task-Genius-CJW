import { t } from "@/translations/helper";
import type TaskProgressBarPlugin from "@/index";
import { OnboardingController } from "../OnboardingController";
import { FormatExamples } from "./guide/FormatExamples";
import { QuickCaptureDemo } from "./guide/QuickCaptureDemo";

/**
 * Task Guide Step - Learn how to create tasks
 */
export class TaskGuideStep {
	/**
	 * Render the task guide step
	 */
	static render(
		headerEl: HTMLElement,
		contentEl: HTMLElement,
		controller: OnboardingController,
		plugin: TaskProgressBarPlugin
	) {
		// Clear
		headerEl.empty();
		contentEl.empty();

		// Header
		headerEl.createEl("h1", { text: t("Creating Tasks") });
		headerEl.createEl("p", {
			text: t(
				"Learn different ways to create and format tasks in Task Genius"
			),
			cls: "onboarding-subtitle",
		});

		// Introduction
		const intro = contentEl.createDiv("task-guide-intro");
		intro.createEl("p", {
			text: t(
				"You can use either emoji-based or Dataview-style syntax for task metadata"
			),
			cls: "guide-description",
		});

		// Format examples
		FormatExamples.render(contentEl);

		// Quick capture demo
		QuickCaptureDemo.render(contentEl, plugin);
	}
}
