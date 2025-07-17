import {
	App,
	Editor,
	EditorPosition,
	EditorSuggest,
	EditorSuggestContext,
	EditorSuggestTriggerInfo,
	TFile,
	setIcon,
} from "obsidian";
import TaskProgressBarPlugin from "../index";
import { t } from "../translations/helper";
import { getSuggestOptionsByTrigger } from "./suggest/SpecialCharacterSuggests";

interface SuggestOption {
	id: string;
	label: string;
	icon: string;
	description: string;
	replacement: string;
	trigger?: string;
	action?: (editor: Editor, cursor: EditorPosition) => void;
}

export class MinimalQuickCaptureSuggest extends EditorSuggest<SuggestOption> {
	plugin: TaskProgressBarPlugin;
	private isMinimalMode: boolean = false;

	constructor(app: App, plugin: TaskProgressBarPlugin) {
		super(app);
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
	 * Get the trigger regex for the suggestion
	 */
	onTrigger(
		cursor: EditorPosition,
		editor: Editor,
		file: TFile
	): EditorSuggestTriggerInfo | null {
		// Only trigger in minimal mode
		if (!this.isMinimalMode) {
			return null;
		}

		// Check if we're in a minimal quick capture context
		const editorEl = (editor as any).cm?.dom as HTMLElement;
		if (!editorEl || !editorEl.closest(".quick-capture-modal.minimal")) {
			return null;
		}

		// Get the current line
		const line = editor.getLine(cursor.line);
		const triggerChar =
			this.plugin.settings.quickCapture.minimalModeSettings
				?.suggestTrigger || "/";

		// Check if the cursor is right after the trigger character
		if (cursor.ch > 0 && line.charAt(cursor.ch - 1) === triggerChar) {
			return {
				start: { line: cursor.line, ch: cursor.ch - 1 },
				end: cursor,
				query: triggerChar,
			};
		}

		return null;
	}

	/**
	 * Get suggestions based on the trigger
	 */
	getSuggestions(context: EditorSuggestContext): SuggestOption[] {
		// Map old @ to new * for target location
		const triggerChar = context.query === "@" ? "*" : context.query;

		// Get suggestions from the new system
		const suggestions = getSuggestOptionsByTrigger(
			triggerChar,
			this.plugin
		);

		// For backward compatibility, return simple trigger suggestions if no specific ones found
		if (suggestions.length === 0) {
			return [
				{
					id: "date",
					label: t("Date"),
					icon: "calendar",
					description: t("Add date"),
					replacement: "~",
					trigger: "~",
				},
				{
					id: "priority",
					label: t("Priority"),
					icon: "zap",
					description: t("Set priority"),
					replacement: "!",
					trigger: "!",
				},
				{
					id: "target",
					label: t("Target Location"),
					icon: "folder",
					description: t("Set target location"),
					replacement: "*",
					trigger: "*",
				},
				{
					id: "tag",
					label: t("Tag"),
					icon: "tag",
					description: t("Add tags"),
					replacement: "#",
					trigger: "#",
				},
			];
		}

		return suggestions;
	}

	/**
	 * Render suggestion using Obsidian Menu DOM structure
	 */
	renderSuggestion(suggestion: SuggestOption, el: HTMLElement): void {
		el.addClass("menu-item");
		el.addClass("tappable");

		// Create icon element
		const iconEl = el.createDiv("menu-item-icon");
		setIcon(iconEl, suggestion.icon);

		// Create title element
		const titleEl = el.createDiv("menu-item-title");
		titleEl.textContent = suggestion.label;
	}

	/**
	 * Handle suggestion selection
	 */
	selectSuggestion(
		suggestion: SuggestOption,
		evt: MouseEvent | KeyboardEvent
	): void {
		const editor = this.context?.editor;
		const cursor = this.context?.end;

		if (!editor || !cursor) return;

		// Replace the trigger character with the replacement
		const startPos = { line: cursor.line, ch: cursor.ch - 1 };
		const endPos = cursor;

		editor.replaceRange(suggestion.replacement, startPos, endPos);

		// Move cursor to after the replacement
		const newCursor = {
			line: cursor.line,
			ch: cursor.ch - 1 + suggestion.replacement.length,
		};
		editor.setCursor(newCursor);

		// Execute custom action if provided (new system)
		if (suggestion.action) {
			suggestion.action(editor, newCursor);
			return;
		}

		// Fallback to legacy modal-based actions
		const editorEl = (editor as any).cm?.dom as HTMLElement;
		const modalEl = editorEl?.closest(".quick-capture-modal.minimal");
		const modal = (modalEl as any).__minimalQuickCaptureModal;

		this.close();

		if (!modal) return;

		// Get cursor position for menu positioning
		const cursorCoords = (editor as any).coordsAtPos?.(newCursor) || {
			left: 0,
			top: 0,
		};

		// Handle different suggestion types (legacy support)
		switch (suggestion.id) {
			case "date":
				modal.showDatePickerAtCursor?.(cursorCoords, newCursor);
				break;
			case "priority":
				modal.showPriorityMenuAtCursor?.(cursorCoords, newCursor);
				break;
			case "target":
			case "location":
				modal.showLocationMenuAtCursor?.(cursorCoords, newCursor);
				break;
			case "tag":
				modal.showTagSelectorAtCursor?.(cursorCoords, newCursor);
				break;
		}
	}
}
