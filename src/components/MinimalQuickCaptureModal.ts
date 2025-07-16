import {
	App,
	Modal,
	Notice,
	TFile,
	moment,
	EditorPosition,
	Menu,
	Scope,
} from "obsidian";
import {
	createEmbeddableMarkdownEditor,
	EmbeddableMarkdownEditor,
} from "../editor-ext/markdownEditor";
import TaskProgressBarPlugin from "../index";
import { saveCapture } from "../utils/fileUtils";
import { t } from "../translations/helper";
import { MinimalQuickCaptureSuggest } from "./MinimalQuickCaptureSuggest";
import { DatePickerPopover } from "./date-picker/DatePickerPopover";
import { TagSuggest } from "./AutoComplete";

interface TaskMetadata {
	startDate?: Date;
	dueDate?: Date;
	scheduledDate?: Date;
	priority?: number;
	project?: string;
	context?: string;
	tags?: string[];
	location?: "fixed" | "daily-note";
	targetFile?: string;
}

export class MinimalQuickCaptureModal extends Modal {
	plugin: TaskProgressBarPlugin;
	markdownEditor: EmbeddableMarkdownEditor | null = null;
	capturedContent: string = "";
	taskMetadata: TaskMetadata = {};

	// UI Elements
	private dateButton: HTMLButtonElement | null = null;
	private priorityButton: HTMLButtonElement | null = null;
	private locationButton: HTMLButtonElement | null = null;
	private tagButton: HTMLButtonElement | null = null;

	// Suggest instance
	private minimalSuggest: MinimalQuickCaptureSuggest;

	constructor(app: App, plugin: TaskProgressBarPlugin) {
		super(app);
		this.plugin = plugin;
		this.minimalSuggest = plugin.minimalQuickCaptureSuggest;

		// Initialize default metadata with fallback
		const minimalSettings =
			this.plugin.settings.quickCapture.minimalModeSettings;
		this.taskMetadata.location =
			minimalSettings?.defaultLocation || "fixed";
		this.taskMetadata.targetFile = this.getTargetFile();
	}

	onOpen() {
		const { contentEl } = this;
		this.modalEl.addClass("quick-capture-modal");
		this.modalEl.addClass("minimal");

		// Store modal instance reference for suggest system
		(this.modalEl as any).__minimalQuickCaptureModal = this;

		// Set up the suggest system
		if (this.minimalSuggest) {
			this.minimalSuggest.setMinimalMode(true);
		}

		// Create the interface
		this.createMinimalInterface(contentEl);

		// Register the suggest - EditorSuggest should be registered at plugin level, not here
		// We'll register it in the plugin's onload method instead
	}

	onClose() {
		// Clean up suggest
		if (this.minimalSuggest) {
			this.minimalSuggest.setMinimalMode(false);
		}

		// Clean up editor
		if (this.markdownEditor) {
			this.markdownEditor.destroy();
			this.markdownEditor = null;
		}

		// Clean up modal reference
		delete (this.modalEl as any).__minimalQuickCaptureModal;

		// Clear content
		this.contentEl.empty();
	}

	private createMinimalInterface(contentEl: HTMLElement) {
		// Title
		this.titleEl.setText(t("Minimal Quick Capture"));

		// Editor container
		const editorContainer = contentEl.createDiv({
			cls: "quick-capture-minimal-editor-container",
		});

		this.setupMarkdownEditor(editorContainer);

		// Bottom buttons container
		const buttonsContainer = contentEl.createDiv({
			cls: "quick-capture-minimal-buttons",
		});

		this.createQuickActionButtons(buttonsContainer);
		this.createMainButtons(buttonsContainer);
	}

	private setupMarkdownEditor(container: HTMLElement) {
		setTimeout(() => {
			this.markdownEditor = createEmbeddableMarkdownEditor(
				this.app,
				container,
				{
					placeholder: t("Enter your task..."),
					singleLine: true, // Single line mode

					onEnter: (editor, mod, shift) => {
						if (mod) {
							// Submit on Cmd/Ctrl+Enter
							this.handleSubmit();
							return true;
						}
						// In minimal mode, Enter should also submit
						this.handleSubmit();
						return true;
					},

					onEscape: (editor) => {
						this.close();
					},

					onChange: (update) => {
						this.capturedContent = this.markdownEditor?.value || "";

						// Check if we should show the suggestion menu
						this.handleSuggestTrigger();
					},
				}
			);

			// Focus the editor
			this.markdownEditor?.editor?.focus();
		}, 50);
	}

	private createQuickActionButtons(container: HTMLElement) {
		const settings =
			this.plugin.settings.quickCapture.minimalModeSettings || {};
		const leftContainer = container.createDiv({
			cls: "quick-actions-left",
		});

		// Date button
		if (settings.showDateButton !== false) {
			this.dateButton = leftContainer.createEl("button", {
				cls: "quick-action-button",
				attr: { "aria-label": t("Set date") },
			});
			this.dateButton.innerHTML = "📅";
			this.dateButton.addEventListener("click", () =>
				this.showDatePicker()
			);
			this.updateButtonState(
				this.dateButton,
				!!this.taskMetadata.dueDate
			);
		}

		// Priority button
		if (settings.showPriorityButton !== false) {
			this.priorityButton = leftContainer.createEl("button", {
				cls: "quick-action-button",
				attr: { "aria-label": t("Set priority") },
			});
			this.priorityButton.innerHTML = "!";
			this.priorityButton.addEventListener("click", () =>
				this.showPriorityMenu()
			);
			this.updateButtonState(
				this.priorityButton,
				!!this.taskMetadata.priority
			);
		}

		// Location button
		if (settings.showLocationButton !== false) {
			this.locationButton = leftContainer.createEl("button", {
				cls: "quick-action-button",
				attr: { "aria-label": t("Set location") },
			});
			this.locationButton.innerHTML = "📁";
			this.locationButton.addEventListener("click", () =>
				this.showLocationMenu()
			);
			this.updateButtonState(
				this.locationButton,
				this.taskMetadata.location !==
					(settings.defaultLocation || "fixed")
			);
		}

		// Tag button
		if (settings.showTagButton !== false) {
			this.tagButton = leftContainer.createEl("button", {
				cls: "quick-action-button",
				attr: { "aria-label": t("Add tags") },
			});
			this.tagButton.innerHTML = "#";
			this.tagButton.addEventListener("click", () =>
				this.showTagSelector()
			);
			this.updateButtonState(
				this.tagButton,
				!!(this.taskMetadata.tags && this.taskMetadata.tags.length > 0)
			);
		}
	}

	private createMainButtons(container: HTMLElement) {
		const rightContainer = container.createDiv({
			cls: "quick-actions-right",
		});

		// Save button
		const saveButton = rightContainer.createEl("button", {
			text: t("Save"),
			cls: "mod-cta quick-action-save",
		});
		saveButton.addEventListener("click", () => this.handleSubmit());
	}

	private updateButtonState(button: HTMLButtonElement, isActive: boolean) {
		if (isActive) {
			button.addClass("active");
		} else {
			button.removeClass("active");
		}
	}

	/**
	 * Handle suggestion trigger check
	 */
	private handleSuggestTrigger(): void {
		if (!this.markdownEditor || !this.minimalSuggest) return;

		// Get current cursor position
		const cursor = (this.markdownEditor.editor.editor as any).getCursor();

		// Check if we should show the suggestion menu
		if (
			this.minimalSuggest.shouldShowMenu(
				this.markdownEditor.editor.editor as any,
				cursor
			)
		) {
			// Add a small delay to ensure the character is fully processed
			setTimeout(() => {
				this.minimalSuggest.showMenuAtCursor(
					this.markdownEditor!.editor.editor as any,
					cursor
				);
			}, 10);
		}
	}

	/**
	 * Show menu with proper scope handling to prevent enter key from propagating
	 */
	private showMenuWithScope(menu: Menu, x: number, y: number): void {
		// Create a new scope for the menu
		const menuScope = new Scope();

		// Override the Enter key to prevent it from propagating to the editor
		menuScope.register([], "Enter", (evt: KeyboardEvent) => {
			evt.preventDefault();
			evt.stopPropagation();
			return false;
		});

		// Also register Escape key to properly close menu
		menuScope.register([], "Escape", (evt: KeyboardEvent) => {
			evt.preventDefault();
			evt.stopPropagation();
			menu.hide();
			return false;
		});

		// Push the scope when menu is shown
		this.app.keymap.pushScope(menuScope);

		// Show the menu
		menu.showAtMouseEvent(
			new MouseEvent("click", {
				clientX: x,
				clientY: y,
			})
		);

		// Pop the scope when menu is hidden
		// We need to hook into the menu's onHide event
		const originalOnHide = menu.onHide;
		menu.onHide = () => {
			this.app.keymap.popScope(menuScope);
			if (originalOnHide) {
				originalOnHide.call(menu);
			}
		};

		// Add a stronger event listener directly to the menu DOM element
		// This is a backup method to ensure Enter key doesn't propagate
		const menuEl = (menu as any).dom;
		if (menuEl) {
			const handleKeydown = (evt: KeyboardEvent) => {
				if (evt.key === "Enter") {
					evt.preventDefault();
					evt.stopPropagation();
					evt.stopImmediatePropagation();
					
					// Find the selected item and trigger its click
					const selectedItem = menuEl.querySelector('.menu-item.selected');
					if (selectedItem) {
						(selectedItem as HTMLElement).click();
					}
				}
			};
			
			menuEl.addEventListener('keydown', handleKeydown, true);
			
			// Clean up the event listener when menu is hidden
			const originalHide = menu.onHide;
			menu.onHide = () => {
				menuEl.removeEventListener('keydown', handleKeydown, true);
				this.app.keymap.popScope(menuScope);
				if (originalHide) {
					originalHide.call(menu);
				}
			};
		}
	}

	// Methods called by MinimalQuickCaptureSuggest
	public showDatePickerAtCursor(cursorCoords: any, cursor: EditorPosition) {
		this.showDatePicker(cursor, cursorCoords);
	}

	public showDatePicker(cursor?: EditorPosition, coords?: any) {
		const quickDates = [
			{ label: t("Tomorrow"), date: moment().add(1, "day").toDate() },
			{
				label: t("Day after tomorrow"),
				date: moment().add(2, "day").toDate(),
			},
			{ label: t("Next week"), date: moment().add(1, "week").toDate() },
			{ label: t("Next month"), date: moment().add(1, "month").toDate() },
		];

		const menu = new Menu();

		quickDates.forEach((quickDate) => {
			menu.addItem((item) => {
				item.setTitle(quickDate.label);
				item.setIcon("calendar");
				item.onClick(() => {
					this.taskMetadata.dueDate = quickDate.date;
					this.updateButtonState(this.dateButton!, true);

					// If called from suggest, replace the ~ with date text
					if (cursor && this.markdownEditor) {
						this.replaceAtCursor(
							cursor,
							`📅 ${this.formatDate(quickDate.date)}`
						);
					}
				});
			});
		});

		menu.addSeparator();
		menu.addItem((item) => {
			item.setTitle(t("Choose date..."));
			item.setIcon("calendar-days");
			item.onClick(() => {
				// Open full date picker
				// TODO: Implement full date picker integration
			});
		});

		// Show menu at cursor position if provided, otherwise at button
		if (coords) {
			this.showMenuWithScope(menu, coords.left, coords.top);
		} else if (this.dateButton) {
			this.showMenuWithScope(
				menu,
				this.dateButton.offsetLeft,
				this.dateButton.offsetTop
			);
		}
	}

	public showPriorityMenuAtCursor(cursorCoords: any, cursor: EditorPosition) {
		this.showPriorityMenu(cursor, cursorCoords);
	}

	public showPriorityMenu(cursor?: EditorPosition, coords?: any) {
		const priorities = [
			{ level: 5, label: t("Highest"), icon: "🔺" },
			{ level: 4, label: t("High"), icon: "⏫" },
			{ level: 3, label: t("Medium"), icon: "🔼" },
			{ level: 2, label: t("Low"), icon: "🔽" },
			{ level: 1, label: t("Lowest"), icon: "⏬" },
		];

		const menu = new Menu();

		priorities.forEach((priority) => {
			menu.addItem((item) => {
				item.setTitle(`${priority.icon} ${priority.label}`);
				item.onClick(() => {
					this.taskMetadata.priority = priority.level;
					this.updateButtonState(this.priorityButton!, true);

					// If called from suggest, replace the ! with priority icon
					if (cursor && this.markdownEditor) {
						this.replaceAtCursor(cursor, priority.icon);
					}
				});
			});
		});

		// Show menu at cursor position if provided, otherwise at button
		if (coords) {
			this.showMenuWithScope(menu, coords.left, coords.top);
		} else if (this.priorityButton) {
			this.showMenuWithScope(
				menu,
				this.priorityButton.offsetLeft,
				this.priorityButton.offsetTop
			);
		}
	}

	public showLocationMenuAtCursor(cursorCoords: any, cursor: EditorPosition) {
		this.showLocationMenu(cursor, cursorCoords);
	}

	public showLocationMenu(cursor?: EditorPosition, coords?: any) {
		const menu = new Menu();

		menu.addItem((item) => {
			item.setTitle(t("Fixed location"));
			item.setIcon("file");
			item.onClick(() => {
				this.taskMetadata.location = "fixed";
				this.taskMetadata.targetFile =
					this.plugin.settings.quickCapture.targetFile;
				this.updateButtonState(
					this.locationButton!,
					this.taskMetadata.location !==
						(this.plugin.settings.quickCapture.minimalModeSettings
							?.defaultLocation || "fixed")
				);

				// If called from suggest, replace the 📁 with file icon
				if (cursor && this.markdownEditor) {
					this.replaceAtCursor(cursor, "📄");
				}
			});
		});

		menu.addItem((item) => {
			item.setTitle(t("Daily note"));
			item.setIcon("calendar");
			item.onClick(() => {
				this.taskMetadata.location = "daily-note";
				this.taskMetadata.targetFile = this.getDailyNoteFile();
				this.updateButtonState(
					this.locationButton!,
					this.taskMetadata.location !==
						(this.plugin.settings.quickCapture.minimalModeSettings
							?.defaultLocation || "fixed")
				);

				// If called from suggest, replace the 📁 with calendar icon
				if (cursor && this.markdownEditor) {
					this.replaceAtCursor(cursor, "📅");
				}
			});
		});

		// Show menu at cursor position if provided, otherwise at button
		if (coords) {
			this.showMenuWithScope(menu, coords.left, coords.top);
		} else if (this.locationButton) {
			this.showMenuWithScope(
				menu,
				this.locationButton.offsetLeft,
				this.locationButton.offsetTop
			);
		}
	}

	public showTagSelectorAtCursor(cursorCoords: any, cursor: EditorPosition) {
		this.showTagSelector(cursor, cursorCoords);
	}

	public showTagSelector(cursor?: EditorPosition, coords?: any) {
		// Create a temporary input for tag selection
		const tagInput = document.createElement("input");
		tagInput.type = "text";
		tagInput.placeholder = t("Enter tags (comma separated)");
		tagInput.className = "quick-capture-tag-input";

		// Position the input at cursor position if provided
		if (coords) {
			tagInput.style.position = "absolute";
			tagInput.style.left = `${coords.left}px`;
			tagInput.style.top = `${coords.top}px`;
			tagInput.style.zIndex = "1000";
		}

		// Add to modal temporarily
		this.contentEl.appendChild(tagInput);

		// Setup tag suggest
		new TagSuggest(this.app, tagInput, this.plugin);

		// Focus and handle completion
		tagInput.focus();
		tagInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				const tags = tagInput.value
					.split(",")
					.map((t) => t.trim())
					.filter((t) => t);
				this.taskMetadata.tags = tags;
				this.updateButtonState(this.tagButton!, tags.length > 0);

				// If called from suggest, replace the # with tags
				if (cursor && this.markdownEditor) {
					this.replaceAtCursor(
						cursor,
						tags.map((t) => `#${t}`).join(" ")
					);
				}

				// Remove temp input
				this.contentEl.removeChild(tagInput);
			} else if (e.key === "Escape") {
				this.contentEl.removeChild(tagInput);
			}
		});
	}

	private replaceAtCursor(cursor: EditorPosition, replacement: string) {
		if (!this.markdownEditor) return;

		// Replace the character at cursor position using CodeMirror API
		const cm = (this.markdownEditor.editor as any).cm;
		if (cm && cm.replaceRange) {
			cm.replaceRange(
				replacement,
				{ line: cursor.line, ch: cursor.ch - 1 },
				cursor
			);
		}
	}

	private getTargetFile(): string {
		const settings = this.plugin.settings.quickCapture;
		if (this.taskMetadata.location === "daily-note") {
			return this.getDailyNoteFile();
		}
		return settings.targetFile;
	}

	private getDailyNoteFile(): string {
		const settings = this.plugin.settings.quickCapture.dailyNoteSettings;
		const dateStr = moment().format(settings.format);
		return settings.folder
			? `${settings.folder}/${dateStr}.md`
			: `${dateStr}.md`;
	}

	private formatDate(date: Date): string {
		return moment(date).format("YYYY-MM-DD");
	}

	private processMinimalContent(content: string): string {
		if (!content.trim()) return "";

		const settings =
			this.plugin.settings.quickCapture.minimalModeSettings || {};

		// Auto-add task prefix if enabled
		if (settings.autoAddTaskPrefix !== false) {
			const lines = content.split("\n");
			const processedLines = lines.map((line) => {
				const trimmed = line.trim();
				if (trimmed && !trimmed.startsWith("- [")) {
					return `- [ ] ${trimmed}`;
				}
				return line;
			});
			return processedLines.join("\n");
		}

		return content;
	}

	private addMetadataToContent(content: string): string {
		const metadata: string[] = [];

		// Add date metadata
		if (this.taskMetadata.dueDate) {
			metadata.push(`📅 ${this.formatDate(this.taskMetadata.dueDate)}`);
		}

		// Add priority metadata
		if (this.taskMetadata.priority) {
			const priorityIcons = ["⏬", "🔽", "🔼", "⏫", "🔺"];
			metadata.push(priorityIcons[this.taskMetadata.priority - 1]);
		}

		// Add tags
		if (this.taskMetadata.tags && this.taskMetadata.tags.length > 0) {
			metadata.push(...this.taskMetadata.tags.map((tag) => `#${tag}`));
		}

		// Add metadata to content
		if (metadata.length > 0) {
			return `${content} ${metadata.join(" ")}`;
		}

		return content;
	}

	private async handleSubmit() {
		const content = this.capturedContent.trim();

		if (!content) {
			new Notice(t("Nothing to capture"));
			return;
		}

		try {
			// Process content
			let processedContent = this.processMinimalContent(content);
			processedContent = this.addMetadataToContent(processedContent);

			// Save options
			const captureOptions = {
				...this.plugin.settings.quickCapture,
				targetFile:
					this.taskMetadata.targetFile || this.getTargetFile(),
				targetType: this.taskMetadata.location || "fixed",
			};

			await saveCapture(this.app, processedContent, captureOptions);
			new Notice(t("Captured successfully"));
			this.close();
		} catch (error) {
			new Notice(`${t("Failed to save:")} ${error}`);
		}
	}
}
