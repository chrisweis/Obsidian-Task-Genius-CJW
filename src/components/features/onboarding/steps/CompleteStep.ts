import { t } from "@/translations/helper";
import { setIcon } from "obsidian";
import { OnboardingController } from "../OnboardingController";
import { OnboardingConfig } from "@/managers/onboarding-manager";

/**
 * Complete Step - Setup complete, show summary and next steps
 */
export class CompleteStep {
	private static readonly ICON_MAP: Record<string, string> = {
		beginner: "seedling",
		advanced: "zap",
		power: "rocket",
	};

	/**
	 * Render the complete step
	 */
	static render(
		headerEl: HTMLElement,
		contentEl: HTMLElement,
		controller: OnboardingController
	) {
		// Clear
		headerEl.empty();
		contentEl.empty();

		const config = controller.getState().selectedConfig;
		if (!config) return;

		// Header
		headerEl.createEl("h1", { text: t("Setup Complete! 🎉") });
		headerEl.createEl("p", {
			text: t("Task Genius is ready to use"),
			cls: "onboarding-subtitle",
		});

		// Success section
		const successSection = contentEl.createDiv("completion-success");
		const successIcon = successSection.createDiv("success-icon");
		successIcon.setText("✨");

		successSection.createEl("p", {
			text: t(
				"Your task management workspace has been configured successfully"
			),
			cls: "success-message",
		});

		// Config summary
		this.renderConfigSummary(contentEl, config);

		// Quick start guide
		this.renderQuickStart(contentEl, config);

		// Next steps
		this.renderNextSteps(contentEl);

		// Resources
		this.renderResources(contentEl);
	}

	/**
	 * Render configuration summary
	 */
	private static renderConfigSummary(
		container: HTMLElement,
		config: OnboardingConfig
	) {
		const section = container.createDiv("completion-summary");
		section.createEl("h3", { text: t("Your Configuration") });

		const card = section.createDiv("config-summary-card");

		const header = card.createDiv("config-header");
		const icon = header.createDiv("config-icon");
		setIcon(icon, this.getConfigIcon(config.mode));
		header.createDiv("config-name").setText(config.name);

		const desc = card.createDiv("config-description");
		desc.setText(config.description);
	}

	/**
	 * Render quick start guide
	 */
	private static renderQuickStart(
		container: HTMLElement,
		config: OnboardingConfig
	) {
		const section = container.createDiv("quick-start-section");
		section.createEl("h3", { text: t("Quick Start Guide") });

		const steps = section.createDiv("quick-start-steps");

		const quickSteps = this.getQuickStartSteps(config.mode);
		quickSteps.forEach((step, index) => {
			const stepEl = steps.createDiv("quick-start-step");
			stepEl.createDiv("step-number").setText((index + 1).toString());
			stepEl.createDiv("step-content").setText(step);
		});
	}

	/**
	 * Render next steps
	 */
	private static renderNextSteps(container: HTMLElement) {
		const section = container.createDiv("next-steps-section");
		section.createEl("h3", { text: t("What's next?") });

		const list = section.createEl("ul", { cls: "next-steps-list" });

		const steps = [
			t("Open Task Genius view from the left sidebar"),
			t("Create your first task using Quick Capture"),
			t("Explore different views to organize your tasks"),
			t("Customize settings anytime in plugin settings"),
		];

		steps.forEach((step) => {
			const item = list.createEl("li");
			const checkIcon = item.createSpan("step-check");
			setIcon(checkIcon, "arrow-right");
			item.createSpan("step-text").setText(step);
		});
	}

	/**
	 * Render resources
	 */
	private static renderResources(container: HTMLElement) {
		const section = container.createDiv("resources-section");
		section.createEl("h3", { text: t("Resources") });

		const list = section.createDiv("resources-list");

		const resources = [
			{
				icon: "book-open",
				title: t("Documentation"),
				desc: t("Learn all features"),
				url: "https://taskgenius.md",
			},
			{
				icon: "message-circle",
				title: t("Community"),
				desc: t("Get help and share tips"),
				url: "https://discord.gg/ARR2rHHX6b",
			},
		];

		resources.forEach((r) => {
			const item = list.createDiv("resource-item resource-clickable");
			const icon = item.createDiv("resource-icon");
			setIcon(icon, r.icon);
			const content = item.createDiv("resource-content");
			content.createEl("h4", { text: r.title });
			content.createEl("p", { text: r.desc });

			item.addEventListener("click", () => {
				window.open(r.url, "_blank");
			});
		});
	}

	/**
	 * Get quick start steps based on mode
	 */
	private static getQuickStartSteps(mode: string): string[] {
		switch (mode) {
			case "beginner":
				return [
					t("Click the Task Genius icon in the left sidebar"),
					t("Start with the Inbox view to see all your tasks"),
					t("Use Quick Capture to add your first task"),
					t("Try the Forecast view to see tasks by date"),
				];
			case "advanced":
				return [
					t("Open Task Genius and explore the available views"),
					t("Set up a project using the Projects view"),
					t("Try the Kanban board for visual task management"),
					t("Use workflow stages to track task progress"),
				];
			case "power":
				return [
					t("Explore all available views and configurations"),
					t("Set up complex workflows for your projects"),
					t("Configure habits and rewards to stay motivated"),
					t("Integrate with external calendars and systems"),
				];
			default:
				return [
					t("Open Task Genius from the left sidebar"),
					t("Create your first task"),
					t("Explore different views"),
					t("Customize settings as needed"),
				];
		}
	}

	/**
	 * Get config icon
	 */
	private static getConfigIcon(mode: string): string {
		return this.ICON_MAP[mode] || "clipboard-list";
	}
}
