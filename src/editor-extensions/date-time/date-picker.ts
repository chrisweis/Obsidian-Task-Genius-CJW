import {
	EditorView,
	ViewPlugin,
	ViewUpdate,
	Decoration,
	DecorationSet,
	WidgetType,
	MatchDecorator,
	PluginValue,
	PluginSpec,
} from "@codemirror/view";
import {
	App,
	editorLivePreviewField,
	Menu,
	MenuItem,
	moment,
	Platform,
} from "obsidian";
import TaskProgressBarPlugin from "../../index";
import { Annotation } from "@codemirror/state";
// @ts-ignore - This import is necessary but TypeScript can't find it
import { syntaxTree, tokenClassNodeProp } from "@codemirror/language";
import { t } from "../../translations/helper";
import { DatePickerPopover } from "@/components/ui/date-picker/DatePickerPopover";
import { DatePickerModal } from "@/components/ui/date-picker/DatePickerModal";
export const dateChangeAnnotation = Annotation.define();

class DatePickerWidget extends WidgetType {
	constructor(
		readonly app: App,
		readonly plugin: TaskProgressBarPlugin,
		readonly view: EditorView,
		readonly from: number,
		readonly to: number,
		readonly currentDate: string,
		readonly dateMark: string
	) {
		super();
	}

	eq(other: DatePickerWidget): boolean {
		return (
			this.from === other.from &&
			this.to === other.to &&
			this.currentDate === other.currentDate
		);
	}

	toDOM(): HTMLElement {
		try {
			const wrapper = createEl("span", {
				cls: "date-picker-widget",
				attr: {
					"aria-label": "Task Date",
				},
			});

			const dateText = createSpan({
				cls: "task-date-text",
				text: this.currentDate,
			});

			// Handle click to show date menu
			dateText.addEventListener("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				this.showDateMenu(e);
			});

			wrapper.appendChild(dateText);
			return wrapper;
		} catch (error) {
			console.error("Error creating date picker widget DOM:", error);
			// Return a fallback element to prevent crashes
			const fallback = createEl("span", {
				cls: "date-picker-widget-error",
				text: this.currentDate,
			});
			return fallback;
		}
	}

	private showDateMenu(e: MouseEvent) {
		try {
			// Extract current date from the widget text
			const currentDateMatch =
				this.currentDate.match(/\d{4}-\d{2}-\d{2}/);
			const currentDate = currentDateMatch ? currentDateMatch[0] : null;

			if (Platform.isDesktop) {
				// Desktop environment - show Popover
				const popover = new DatePickerPopover(
					this.app,
					this.plugin,
					currentDate || undefined,
					this.dateMark
				);

				popover.onDateSelected = (date: string | null) => {
					if (date) {
						this.setDate(date);
					} else {
						// Clear date
						this.setDate("");
					}
				};

				popover.showAtPosition({
					x: e.clientX,
					y: e.clientY,
				});
			} else {
				// Mobile environment - show Modal
				const modal = new DatePickerModal(
					this.app,
					this.plugin,
					currentDate || undefined,
					this.dateMark
				);

				modal.onDateSelected = (date: string | null) => {
					if (date) {
						this.setDate(date);
					} else {
						// Clear date
						this.setDate("");
					}
				};

				modal.open();
			}
		} catch (error) {
			console.error("Error showing date menu:", error);
		}
	}

	private escapeRegex(str: string): string {
		return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}

	// Resolve the current range of this widget's date in the live document
	private resolveCurrentRange(): { from: number; to: number } | null {
		try {
			const state = this.view?.state;
			if (!state) return null;
			const line = state.doc.lineAt(this.from);
			const text = line.text;
			const useDataviewFormat =
				this.plugin.settings.preferMetadataFormat === "dataview";
			if (useDataviewFormat) {
				// Match [field:: YYYY-MM-DD] on this line only
				const regex = /\[[^\]]+::\s*\d{4}-\d{2}-\d{2}\]/g;
				let m: RegExpExecArray | null;
				while ((m = regex.exec(text)) !== null) {
					const absFrom = line.from + m.index;
					const absTo = absFrom + m[0].length;
					// Prefer the one starting with the same prefix as dateMark
					if (
						m[0].startsWith(this.dateMark) ||
						(this.from >= absFrom && this.from <= absTo)
					) {
						return { from: absFrom, to: absTo };
					}
				}
			} else {
				// Match the specific emoji marker followed by date
				const pattern = new RegExp(
					`${this.escapeRegex(
						this.dateMark
					)}\\s*\\d{4}-\\d{2}-\\d{2}`,
					"g"
				);
				let m: RegExpExecArray | null;
				while ((m = pattern.exec(text)) !== null) {
					const absFrom = line.from + m.index;
					const absTo = absFrom + m[0].length;
					if (this.from >= absFrom && this.from <= absTo) {
						return { from: absFrom, to: absTo };
					}
				}
			}
			return null;
		} catch (e) {
			console.warn("Failed to resolve current date range:", e);
			return null;
		}
	}

	private setDate(date: string) {
		try {
			// Validate the view
			if (!this.view) {
				console.warn("Invalid view state, skipping date update");
				return;
			}

			// Re-resolve the current range in case the document changed since widget creation
			const range = this.resolveCurrentRange();
			if (!range) {
				console.warn(
					"Could not locate current date range; skipping update"
				);
				return;
			}
			// Extra safety: ensure single-line range
			const fromLine = this.view.state.doc.lineAt(range.from);
			const toLine = this.view.state.doc.lineAt(range.to);
			if (fromLine.number !== toLine.number) {
				console.warn("Refusing to replace multi-line range for date");
				return;
			}

			const useDataviewFormat =
				this.plugin.settings.preferMetadataFormat === "dataview";
			let newText = "";

			if (date) {
				if (useDataviewFormat) {
					// For dataview format: reconstruct [xxx:: date] pattern
					newText = `${this.dateMark}${date}]`;
				} else {
					// For tasks format: emoji + space + date
					newText = `${this.dateMark} ${date}`;
				}
			}

			const transaction = this.view.state.update({
				changes: { from: range.from, to: range.to, insert: newText },
				annotations: [dateChangeAnnotation.of(true)],
			});
			this.view.dispatch(transaction);
		} catch (error) {
			console.error("Error setting date:", error);
		}
	}
}

export function datePickerExtension(app: App, plugin: TaskProgressBarPlugin) {
	// Don't enable if the setting is off
	if (!plugin.settings.enableDatePicker) {
		return [];
	}

	class DatePickerViewPluginValue implements PluginValue {
		public readonly view: EditorView;
		public readonly plugin: TaskProgressBarPlugin;
		decorations: DecorationSet = Decoration.none;
		private lastUpdate: number = 0;
		private readonly updateThreshold: number = 50; // Increased threshold for better stability
		public isDestroyed: boolean = false;

		// Date matcher
		private readonly dateMatch = new MatchDecorator({
			regexp: this.createDateRegex(plugin.settings.preferMetadataFormat),
			decorate: (
				add,
				from: number,
				to: number,
				match: RegExpExecArray,
				view: EditorView
			) => {
				try {
					if (!this.shouldRender(view, from, to)) {
						return;
					}

					const useDataviewFormat =
						this.plugin.settings.preferMetadataFormat ===
						"dataview";
					let fullMatch: string;
					let dateMark: string;

					if (useDataviewFormat) {
						// For dataview format: match[0] is full match, match[1] is [xxx::, match[2] is date
						fullMatch = match[0]; // e.g., "[start:: 2024-01-01]"
						dateMark = match[1]; // e.g., "[start:: "
					} else {
						// For tasks format: match[0] is full match, match[1] is emoji, match[2] is date
						fullMatch = match[0]; // e.g., "📅 2024-01-01"
						dateMark = match[1]; // e.g., "📅"
					}

					add(
						from,
						to,
						Decoration.replace({
							widget: new DatePickerWidget(
								app,
								plugin,
								view,
								from,
								to,
								fullMatch,
								dateMark
							),
						})
					);
				} catch (error) {
					console.warn("Error decorating date:", error);
				}
			},
		});

		constructor(view: EditorView) {
			this.view = view;
			this.plugin = plugin;
			this.updateDecorations(view);
		}

		/**
		 * Create date regex based on preferMetadataFormat setting
		 */
		private createDateRegex(preferMetadataFormat: string): RegExp {
			const useDataviewFormat = preferMetadataFormat === "dataview";

			if (useDataviewFormat) {
				// For dataview format: match [xxx:: yyyy-mm-dd] pattern on a single line (no line breaks)
				return new RegExp(
					`(\\[[^\\]\\\n]+::\\s*)(\\d{4}-\\d{2}-\\d{2})\\]`,
					"g"
				);
			} else {
				// For tasks format: match emoji + date pattern
				// Using Unicode property escapes to match all emojis
				return new RegExp(
					`([\\p{Emoji}\\p{Emoji_Modifier}\\p{Emoji_Component}\\p{Emoji_Modifier_Base}\\p{Emoji_Presentation}])\\s*(\\d{4}-\\d{2}-\\d{2})`,
					"gu"
				);
			}
		}

		update(update: ViewUpdate): void {
			if (this.isDestroyed) return;

			try {
				// More aggressive updates to handle content changes
				if (
					update.docChanged ||
					update.viewportChanged ||
					update.selectionSet ||
					update.transactions.some((tr) =>
						tr.annotation(dateChangeAnnotation)
					)
				) {
					// Throttle updates to avoid performance issues with large documents
					const now = Date.now();
					if (now - this.lastUpdate > this.updateThreshold) {
						this.lastUpdate = now;
						this.updateDecorations(update.view, update);
					} else {
						// Schedule an update in the near future to ensure rendering
						setTimeout(() => {
							if (this.view && !this.isDestroyed) {
								this.updateDecorations(this.view);
							}
						}, this.updateThreshold);
					}
				}
			} catch (error) {
				console.error("Error in date picker update:", error);
			}
		}

		destroy(): void {
			this.isDestroyed = true;
			this.decorations = Decoration.none;
		}

		updateDecorations(view: EditorView, update?: ViewUpdate) {
			if (this.isDestroyed) return;

			// Only apply in live preview mode
			if (!this.isLivePreview(view.state)) {
				this.decorations = Decoration.none;
				return;
			}

			try {
				// Check if we can incrementally update, otherwise do a full recreation
				if (update && !update.docChanged && this.decorations.size > 0) {
					this.decorations = this.dateMatch.updateDeco(
						update,
						this.decorations
					);
				} else {
					this.decorations = this.dateMatch.createDeco(view);
				}
			} catch (e) {
				console.warn(
					"Error updating date decorations, clearing decorations",
					e
				);
				// Clear decorations on error to prevent crashes
				this.decorations = Decoration.none;
			}
		}

		isLivePreview(state: EditorView["state"]): boolean {
			try {
				return state.field(editorLivePreviewField);
			} catch (error) {
				console.warn("Error checking live preview state:", error);
				return false;
			}
		}

		shouldRender(
			view: EditorView,
			decorationFrom: number,
			decorationTo: number
		) {
			// Skip checking in code blocks or frontmatter
			try {
				// Validate positions
				if (
					decorationFrom < 0 ||
					decorationTo > view.state.doc.length ||
					decorationFrom >= decorationTo
				) {
					return false;
				}

				const syntaxNode = syntaxTree(view.state).resolveInner(
					decorationFrom + 1
				);
				const nodeProps = syntaxNode.type.prop(tokenClassNodeProp);

				if (nodeProps) {
					const props = nodeProps.split(" ");
					if (
						props.includes("hmd-codeblock") ||
						props.includes("hmd-frontmatter")
					) {
						return false;
					}
				}

				const selection = view.state.selection;

				// Avoid rendering over selected text
				const overlap = selection.ranges.some((r) => {
					return !(r.to <= decorationFrom || r.from >= decorationTo);
				});

				return !overlap && this.isLivePreview(view.state);
			} catch (e) {
				// If error in checking, default to not rendering to avoid breaking the editor
				console.warn("Error checking if date should render", e);
				return false;
			}
		}
	}

	const DatePickerViewPluginSpec: PluginSpec<DatePickerViewPluginValue> = {
		decorations: (plugin) => {
			try {
				if (plugin.isDestroyed) {
					return Decoration.none;
				}

				return plugin.decorations.update({
					filter: (
						rangeFrom: number,
						rangeTo: number,
						deco: Decoration
					) => {
						try {
							const widget = deco.spec?.widget;
							if ((widget as any).error) {
								return false;
							}

							// Validate range
							if (
								rangeFrom < 0 ||
								rangeTo > plugin.view.state.doc.length ||
								rangeFrom >= rangeTo
							) {
								return false;
							}

							const selection = plugin.view.state.selection;

							// Remove decorations when cursor is inside them
							for (const range of selection.ranges) {
								if (
									!(
										range.to <= rangeFrom ||
										range.from >= rangeTo
									)
								) {
									return false;
								}
							}

							return true;
						} catch (error) {
							console.warn(
								"Error filtering date decoration:",
								error
							);
							return false;
						}
					},
				});
			} catch (e) {
				// If error in filtering, return current decorations to avoid breaking the editor
				console.warn("Error filtering date decorations", e);
				return plugin.decorations;
			}
		},
	};

	// Create the plugin with our implementation
	const pluginInstance = ViewPlugin.fromClass(
		DatePickerViewPluginValue,
		DatePickerViewPluginSpec
	);

	return pluginInstance;
}
