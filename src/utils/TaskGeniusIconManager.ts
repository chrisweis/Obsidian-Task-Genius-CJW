import { Component } from "obsidian";
import TaskProgressBarPlugin from "../index";
import { getStatusIcon } from "../icon";
import { TaskProgressBarSettings } from "../common/setting-definition";

/**
 * Manages Task Genius Icons functionality
 * Handles CSS style injection, body class management, and cleanup
 */
export class TaskGeniusIconManager extends Component {
	private plugin: TaskProgressBarPlugin;
	private styleElement: HTMLStyleElement | null = null;
	private readonly STYLE_ID = "task-genius-icons-styles";
	private readonly BODY_CLASS = "task-genius-checkbox";

	constructor(plugin: TaskProgressBarPlugin) {
		super();
		this.plugin = plugin;
	}

	async onload() {
		// Initialize if enabled
		if (this.plugin.settings.enableTaskGeniusIcons) {
			this.enable();
		}
	}

	onunload() {
		this.disable();
	}

	/**
	 * Enable Task Genius Icons functionality
	 */
	enable() {
		try {
			this.addBodyClass();
			this.injectStyles();
		} catch (error) {
			console.error("Task Genius: Failed to enable icons:", error);
		}
	}

	/**
	 * Disable Task Genius Icons functionality
	 */
	disable() {
		try {
			this.removeBodyClass();
			this.removeStyles();
		} catch (error) {
			console.error("Task Genius: Failed to disable icons:", error);
		}
	}

	/**
	 * Update functionality when settings change
	 */
	update() {
		if (this.plugin.settings.enableTaskGeniusIcons) {
			this.enable();
		} else {
			this.disable();
		}
	}

	/**
	 * Add task-genius-checkbox class to body
	 */
	private addBodyClass() {
		document.body.classList.add(this.BODY_CLASS);
	}

	/**
	 * Remove task-genius-checkbox class from body
	 */
	private removeBodyClass() {
		document.body.classList.remove(this.BODY_CLASS);
	}

	/**
	 * Inject CSS styles into head
	 */
	private injectStyles() {
		// Remove existing styles first
		this.removeStyles();

		// Generate CSS content
		const cssContent = this.generateCSS();

		// Create and inject style element
		this.styleElement = document.createElement("style");
		this.styleElement.id = this.STYLE_ID;
		this.styleElement.textContent = cssContent;
		document.head.appendChild(this.styleElement);
	}

	/**
	 * Remove injected CSS styles
	 */
	private removeStyles() {
		if (this.styleElement) {
			this.styleElement.remove();
			this.styleElement = null;
		}

		// Also remove any existing style element with our ID
		const existingStyle = document.getElementById(this.STYLE_ID);
		if (existingStyle) {
			existingStyle.remove();
		}
	}

	/**
	 * Generate CSS content based on current settings
	 */
	private generateCSS(): string {
		const settings = this.plugin.settings;
		const statusConfigs = this.parseTaskStatuses(settings);

		let css = "";

		for (const config of statusConfigs) {
			const svgIcon = getStatusIcon(config.status);
			const encodedSvg = this.encodeSvgForCSS(svgIcon);

			for (const char of config.chars) {
				css += this.generateCSSRuleForChar(char, encodedSvg);
			}
		}

		return css;
	}

	/**
	 * Parse taskStatuses configuration into structured format
	 */
	private parseTaskStatuses(settings: TaskProgressBarSettings): Array<{
		status:
			| "notStarted"
			| "inProgress"
			| "completed"
			| "abandoned"
			| "planned";
		chars: string[];
	}> {
		const result: Array<{
			status:
				| "notStarted"
				| "inProgress"
				| "completed"
				| "abandoned"
				| "planned";
			chars: string[];
		}> = [];

		const statusMap: Record<
			string,
			"notStarted" | "inProgress" | "completed" | "abandoned" | "planned"
		> = {
			notStarted: "notStarted",
			inProgress: "inProgress",
			completed: "completed",
			abandoned: "abandoned",
			planned: "planned",
		};

		for (const [statusKey, charString] of Object.entries(
			settings.taskStatuses
		)) {
			const status = statusMap[statusKey];
			if (status) {
				const chars = charString.split("|").map((char) => char.trim());
				result.push({ status, chars });
			}
		}

		return result;
	}

	/**
	 * Encode SVG for use in CSS data URI
	 */
	private encodeSvgForCSS(svgString: string): string {
		try {
			// Remove width and height attributes to make it scalable
			const cleanSvg = svgString
				.replace(/width="[^"]*"/g, "")
				.replace(/height="[^"]*"/g, "")
				.replace(/\s+/g, " ")
				.trim();

			// URL encode for data URI
			const encoded = encodeURIComponent(cleanSvg);
			return `data:image/svg+xml,${encoded}`;
		} catch (error) {
			console.error("Task Genius: Failed to encode SVG:", error);
			return "";
		}
	}

	/**
	 * Generate CSS rule for a specific character
	 */
	private generateCSSRuleForChar(char: string, encodedSvg: string): string {
		// Escape special characters for CSS selector
		const escapedChar = this.escapeCSSSelector(char);

		return `
.${this.BODY_CLASS} [data-task="${escapedChar}"] > input[type=checkbox]:checked:after,
.${this.BODY_CLASS} [data-task="${escapedChar}"] > p > input[type=checkbox]:checked:after,
.${this.BODY_CLASS} [data-task="${escapedChar}"][type=checkbox]:checked:after {
    --webkit-mask-image: url("${encodedSvg}");
    --webkit-mask-size: 20%;
}
`;
	}

	/**
	 * Escape special characters for CSS selector
	 */
	private escapeCSSSelector(char: string): string {
		// Handle space character specially
		if (char === " ") {
			return " ";
		}

		// Escape special CSS characters
		return char.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, "\\$&");
	}
}
