import {
	App,
	TFile,
	AbstractInputSuggest,
	prepareFuzzySearch,
	SearchResult,
} from "obsidian";
import { t } from "@/translations/helper";
import { processDateTemplates } from "@/utils/file/file-operations";

/**
 * File name suggest for quick capture file creation mode
 */
export class FileNameSuggest extends AbstractInputSuggest<TFile> {
	private currentFolder: string = "";
	private fileTemplates: string[] = [
		"{{DATE:YYYY-MM-DD}} - Meeting Notes",
		"{{DATE:YYYY-MM-DD}} - Daily Log",
		"{{DATE:YYYY-MM-DD}} - Task List",
		"Project - {{DATE:YYYY-MM}}",
		"Notes - {{DATE:YYYY-MM-DD-HHmm}}",
	];
	protected textInputEl: HTMLInputElement;

	constructor(app: App, textInputEl: HTMLInputElement, currentFolder?: string) {
		super(app, textInputEl);
		this.textInputEl = textInputEl;
		this.currentFolder = currentFolder || "";
	}

	/**
	 * Get suggestions based on input
	 */
	getSuggestions(inputStr: string): TFile[] {
		const files = this.app.vault.getMarkdownFiles();
		const lowerInputStr = inputStr.toLowerCase();
		const suggestions: TFile[] = [];

		// Filter files in current folder
		const folderFiles = files.filter((file) => {
			if (this.currentFolder && !file.path.startsWith(this.currentFolder)) {
				return false;
			}
			return file.basename.toLowerCase().contains(lowerInputStr);
		});

		// Add matching files
		suggestions.push(...folderFiles.slice(0, 5));

		return suggestions;
	}

	/**
	 * Render a suggestion
	 */
	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.setText(file.basename);
		el.createDiv({
			cls: "suggestion-folder",
			text: file.parent?.path || "/",
		});
	}

	/**
	 * Select a suggestion
	 */
	selectSuggestion(file: TFile): void {
		this.textInputEl.value = file.basename;
		this.textInputEl.trigger("input");
		this.close();
	}
}

/**
 * File name input component with template support
 */
export class FileNameInput {
	private container: HTMLElement;
	private inputEl: HTMLInputElement | null = null;
	private suggest: FileNameSuggest | null = null;
	private templateButtons: HTMLElement | null = null;
	private app: App;
	private onChange?: (value: string) => void;

	constructor(
		app: App,
		container: HTMLElement,
		options?: {
			placeholder?: string;
			defaultValue?: string;
			currentFolder?: string;
			onChange?: (value: string) => void;
		}
	) {
		this.app = app;
		this.container = container;
		this.onChange = options?.onChange;

		this.render(options);
	}

	/**
	 * Render the component
	 */
	private render(options?: {
		placeholder?: string;
		defaultValue?: string;
		currentFolder?: string;
	}): void {
		// Create input container
		const inputContainer = this.container.createDiv({
			cls: "file-name-input-container",
		});

		// Label
		inputContainer.createEl("label", {
			text: t("File Name"),
			cls: "file-name-label",
		});

		// Input field with default template applied
		const defaultValue = processDateTemplates(options?.defaultValue || "{{DATE:YYYY-MM-DD}}");
		this.inputEl = inputContainer.createEl("input", {
			type: "text",
			cls: "file-name-input",
			placeholder: options?.placeholder || t("Enter file name..."),
			value: defaultValue,
		});

		// Add suggest
		this.suggest = new FileNameSuggest(this.app, this.inputEl, options?.currentFolder);

		// Template buttons
		this.createTemplateButtons();

		// Event listeners
		this.inputEl.addEventListener("input", () => {
			if (this.onChange) {
				this.onChange(this.getValue());
			}
		});
	}

	/**
	 * Create template buttons
	 */
	private createTemplateButtons(): void {
		this.templateButtons = this.container.createDiv({
			cls: "file-name-templates",
		});

		const templatesLabel = this.templateButtons.createDiv({
			cls: "templates-label",
			text: t("Quick Templates:"),
		});

		const buttonContainer = this.templateButtons.createDiv({
			cls: "template-buttons",
		});

		const templates = [
			{ label: t("Today's Note"), template: "{{DATE:YYYY-MM-DD}}" },
			{ label: t("Meeting"), template: "{{DATE:YYYY-MM-DD}} - Meeting" },
			{ label: t("Project"), template: "Project - {{DATE:YYYY-MM}}" },
			{ label: t("Task List"), template: "{{DATE:YYYY-MM-DD}} - Tasks" },
		];

		templates.forEach((tmpl) => {
			const button = buttonContainer.createEl("button", {
				text: tmpl.label,
				cls: "template-button",
			});
			button.addEventListener("click", () => {
				if (this.inputEl) {
					// Process template immediately
					const processedValue = processDateTemplates(tmpl.template);
					this.inputEl.value = processedValue;
					if (this.onChange) {
						this.onChange(this.getValue());
					}
					this.inputEl.focus();
				}
			});
		});
	}

	/**
	 * Get the current value
	 */
	getValue(): string {
		if (!this.inputEl) return "";
		// Just return the value directly since templates are already processed
		return this.inputEl.value;
	}

	/**
	 * Set the value
	 */
	setValue(value: string): void {
		if (this.inputEl) {
			this.inputEl.value = value;
		}
	}

	/**
	 * Clear the input
	 */
	clear(): void {
		this.setValue("");
	}

	/**
	 * Focus the input
	 */
	focus(): void {
		this.inputEl?.focus();
	}

	/**
	 * Destroy the component
	 */
	destroy(): void {
		this.suggest?.close();
		this.container.empty();
	}
}