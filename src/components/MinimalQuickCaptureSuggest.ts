import {
	App,
	Editor,
	EditorPosition,
	EditorSuggest,
	EditorSuggestContext,
	EditorSuggestTriggerInfo,
	TFile,
	Menu,
	Scope,
} from "obsidian";
import TaskProgressBarPlugin from "../index";
import { t } from "../translations/helper";

interface SuggestOption {
	id: string;
	label: string;
	icon: string;
	description: string;
	replacement: string;
}

export class MinimalQuickCaptureSuggest {
	app: App;
	plugin: TaskProgressBarPlugin;
	private isMinimalMode: boolean = false;

	constructor(app: App, plugin: TaskProgressBarPlugin) {
		this.app = app;
		this.plugin = plugin;
	}

	/**
	 * Set the minimal mode context
	 * This should be called by MinimalQuickCaptureModal to activate this suggest
	 */
	setMinimalMode(isMinimal: boolean): void {
		this.isMinimalMode = isMinimal;
	}

	/**
	 * Check if we should show the suggestion menu at the current cursor position
	 */
	shouldShowMenu(editor: Editor, cursor: EditorPosition): boolean {
		// Only trigger in minimal mode
		if (!this.isMinimalMode) {
			return false;
		}

		// Check if we're in a minimal quick capture context
		const editorEl = (editor as any).cm?.dom as HTMLElement;
		if (!editorEl || !editorEl.closest(".quick-capture-modal.minimal")) {
			return false;
		}

		// Get the current line
		const line = editor.getLine(cursor.line);
		const triggerChar =
			this.plugin.settings.quickCapture.minimalModeSettings
				?.suggestTrigger || "/";

		// Check if the cursor is right after the trigger character
		return cursor.ch > 0 && line.charAt(cursor.ch - 1) === triggerChar;
	}

	/**
	 * Show the suggestion menu at the cursor position
	 */
	showMenuAtCursor(editor: Editor, cursor: EditorPosition): void {
		const settings =
			this.plugin.settings.quickCapture.minimalModeSettings || {};
		
		// Get cursor position in screen coordinates for menu positioning
		const cursorCoords = (editor as any).coordsAtPos?.(cursor) || { left: 0, top: 0 };
		
		// Create the menu
		const menu = new Menu();
		
		// Add menu items based on settings
		if (settings.showDateButton !== false) {
			menu.addItem((item) => {
				item.setTitle(`📅 ${t("Date")}`);
				item.setIcon("calendar");
				item.onClick(() => {
					this.handleSuggestionSelection(editor, cursor, "date", "~");
				});
			});
		}

		if (settings.showPriorityButton !== false) {
			menu.addItem((item) => {
				item.setTitle(`! ${t("Priority")}`);
				item.setIcon("zap");
				item.onClick(() => {
					this.handleSuggestionSelection(editor, cursor, "priority", "!");
				});
			});
		}

		if (settings.showLocationButton !== false) {
			menu.addItem((item) => {
				item.setTitle(`📁 ${t("Location")}`);
				item.setIcon("folder");
				item.onClick(() => {
					this.handleSuggestionSelection(editor, cursor, "location", "📁");
				});
			});
		}

		if (settings.showTagButton !== false) {
			menu.addItem((item) => {
				item.setTitle(`# ${t("Tag")}`);
				item.setIcon("tag");
				item.onClick(() => {
					this.handleSuggestionSelection(editor, cursor, "tag", "#");
				});
			});
		}

		// Show the menu at cursor position with proper scope handling
		this.showMenuWithScope(menu, cursorCoords.left, cursorCoords.top);
	}

	/**
	 * Handle suggestion selection
	 */
	private handleSuggestionSelection(
		editor: Editor,
		cursor: EditorPosition,
		suggestionId: string,
		replacement: string
	): void {
		const triggerChar =
			this.plugin.settings.quickCapture.minimalModeSettings
				?.suggestTrigger || "/";

		// Replace the trigger character with the replacement
		const startPos = { line: cursor.line, ch: cursor.ch - 1 };
		const endPos = cursor;
		
		editor.replaceRange(replacement, startPos, endPos);

		// Move cursor to after the replacement
		const newCursor = {
			line: cursor.line,
			ch: cursor.ch - 1 + replacement.length,
		};
		editor.setCursor(newCursor);

		// Get the modal instance and trigger the appropriate action
		const editorEl = (editor as any).cm?.dom as HTMLElement;
		const modalEl = editorEl?.closest(".quick-capture-modal.minimal");
		const modal = (modalEl as any).__minimalQuickCaptureModal;

		if (!modal) return;

		// Get cursor position for menu positioning
		const cursorCoords = (editor as any).coordsAtPos?.(newCursor) || { left: 0, top: 0 };

		// Handle different suggestion types
		switch (suggestionId) {
			case "date":
				modal.showDatePickerAtCursor(cursorCoords, newCursor);
				break;
			case "priority":
				modal.showPriorityMenuAtCursor(cursorCoords, newCursor);
				break;
			case "location":
				modal.showLocationMenuAtCursor(cursorCoords, newCursor);
				break;
			case "tag":
				modal.showTagSelectorAtCursor(cursorCoords, newCursor);
				break;
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
		
		// Push the scope when menu is shown
		this.app.keymap.pushScope(menuScope);
		
		// Show the menu
		menu.showAtMouseEvent(new MouseEvent("click", { 
			clientX: x, 
			clientY: y 
		}));
		
		// Pop the scope when menu is hidden
		const originalOnHide = menu.onHide;
		menu.onHide = () => {
			this.app.keymap.popScope(menuScope);
			if (originalOnHide) {
				originalOnHide.call(menu);
			}
		};
	}
}
