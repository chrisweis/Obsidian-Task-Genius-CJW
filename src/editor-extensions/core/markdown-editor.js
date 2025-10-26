import { Scope, } from "obsidian";
import { EditorSelection, Prec } from "@codemirror/state";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import { around } from "monkey-around";
/**
 * Creates an embeddable markdown editor
 * @param app The Obsidian app instance
 * @param container The container element
 * @param options Editor options
 * @returns A configured markdown editor
 */
export function createEmbeddableMarkdownEditor(app, container, options) {
    // Get the editor class
    const EditorClass = resolveEditorPrototype(app);
    // Create the editor instance
    return new EmbeddableMarkdownEditor(app, EditorClass, container, options);
}
/**
 * Resolves the markdown editor prototype from the app
 */
function resolveEditorPrototype(app) {
    // Create a temporary editor to resolve the prototype of ScrollableMarkdownEditor
    const widgetEditorView = app.embedRegistry.embedByExtension.md({ app, containerEl: createDiv() }, null, "");
    // Mark as editable to instantiate the editor
    widgetEditorView.editable = true;
    widgetEditorView.showEditor();
    const MarkdownEditor = Object.getPrototypeOf(Object.getPrototypeOf(widgetEditorView.editMode));
    // Unload to remove the temporary editor
    widgetEditorView.unload();
    // Return the constructor, using 'any' type to bypass the abstract class check
    return MarkdownEditor.constructor;
}
const defaultProperties = {
    cursorLocation: { anchor: 0, head: 0 },
    value: "",
    singleLine: false,
    cls: "",
    placeholder: "",
    onEnter: () => false,
    onEscape: () => { },
    onSubmit: () => { },
    // NOTE: Blur takes precedence over Escape (this can be changed)
    onBlur: () => { },
    onPaste: () => { },
    onChange: () => { },
};
/**
 * A markdown editor that can be embedded in any container
 */
export class EmbeddableMarkdownEditor {
    /**
     * Construct the editor
     * @param app - Reference to App instance
     * @param EditorClass - The editor class constructor
     * @param container - Container element to add the editor to
     * @param options - Options for controlling the initial state of the editor
     */
    constructor(app, EditorClass, container, options) {
        var _a;
        // Store user options first
        this.options = Object.assign(Object.assign({}, defaultProperties), options);
        this.initial_value = this.options.value;
        this.scope = new Scope(app.scope);
        // Prevent Mod+Enter default behavior
        this.scope.register(["Mod"], "Enter", () => true);
        // Store reference to self for the patched method BEFORE using it
        const self = this;
        // Use monkey-around to safely patch the method
        const uninstaller = around(EditorClass.prototype, {
            buildLocalExtensions: (originalMethod) => function () {
                const extensions = originalMethod.call(this);
                // Only add our custom extensions if this is our editor instance
                if (this === self.editor) {
                    // Add placeholder if configured
                    if (self.options.placeholder) {
                        extensions.push(placeholder(self.options.placeholder));
                    }
                    // Add paste, blur, and focus event handlers
                    extensions.push(EditorView.domEventHandlers({
                        paste: (event) => {
                            self.options.onPaste(event, self);
                        },
                        blur: () => {
                            // Always trigger blur callback and let it handle the logic
                            app.keymap.popScope(self.scope);
                            if (self.options.onBlur) {
                                self.options.onBlur(self);
                            }
                        },
                        focusin: () => {
                            app.keymap.pushScope(self.scope);
                            app.workspace.activeEditor = self.owner;
                        },
                    }));
                    // Add keyboard handlers
                    const keyBindings = [
                        {
                            key: "Enter",
                            run: () => {
                                return self.options.onEnter(self, false, false);
                            },
                            shift: () => self.options.onEnter(self, false, true),
                        },
                        {
                            key: "Mod-Enter",
                            run: () => self.options.onEnter(self, true, false),
                            shift: () => self.options.onEnter(self, true, true),
                        },
                        {
                            key: "Escape",
                            run: () => {
                                self.options.onEscape(self);
                                return true;
                            },
                            preventDefault: true,
                        },
                    ];
                    // For single line mode, prevent Enter key from creating new lines
                    if (self.options.singleLine) {
                        keyBindings[0] = {
                            key: "Enter",
                            run: () => {
                                // In single line mode, Enter should trigger onEnter
                                return self.options.onEnter(self, false, false);
                            },
                            shift: () => {
                                // Even with shift, still call onEnter in single line mode
                                return self.options.onEnter(self, false, true);
                            },
                        };
                    }
                    extensions.push(Prec.highest(keymap.of(keyBindings)));
                }
                return extensions;
            },
        });
        // Create the editor with the app instance
        this.editor = new EditorClass(app, container, {
            app,
            // This mocks the MarkdownView functions, required for proper scrolling
            onMarkdownScroll: () => { },
            getMode: () => "source",
        });
        // Register the uninstaller for cleanup
        this.register(uninstaller);
        // Set up the editor relationship for commands to work
        if (this.owner) {
            this.owner.editMode = this;
            this.owner.editor = this.editor.editor;
        }
        // Set initial content
        this.set(options.value || "", false);
        // Prevent active leaf changes while focused
        this.register(around(app.workspace, {
            setActiveLeaf: (oldMethod) => (leaf, ...args) => {
                var _a;
                if (!((_a = this.activeCM) === null || _a === void 0 ? void 0 : _a.hasFocus)) {
                    oldMethod.call(app.workspace, leaf, ...args);
                }
            },
        }));
        // Blur and focus event handlers are now handled via EditorView.domEventHandlers in buildLocalExtensions
        // Apply custom class if provided
        if (options.cls && this.editorEl) {
            this.editorEl.classList.add(options.cls);
        }
        // Set cursor position if specified
        if (options.cursorLocation && ((_a = this.editor.editor) === null || _a === void 0 ? void 0 : _a.cm)) {
            this.editor.editor.cm.dispatch({
                selection: EditorSelection.range(options.cursorLocation.anchor, options.cursorLocation.head),
            });
        }
        // Override onUpdate to call our onChange handler
        const originalOnUpdate = this.editor.onUpdate.bind(this.editor);
        this.editor.onUpdate = (update, changed) => {
            originalOnUpdate(update, changed);
            if (changed)
                this.options.onChange(update);
        };
    }
    // Expose commonly accessed properties
    get editorEl() {
        return this.editor.editorEl;
    }
    get containerEl() {
        return this.editor.containerEl;
    }
    get activeCM() {
        return this.editor.activeCM;
    }
    get app() {
        return this.editor.app;
    }
    get owner() {
        return this.editor.owner;
    }
    get _loaded() {
        return this.editor._loaded;
    }
    // Get the current editor value
    get value() {
        var _a, _b;
        return ((_b = (_a = this.editor.editor) === null || _a === void 0 ? void 0 : _a.cm) === null || _b === void 0 ? void 0 : _b.state.doc.toString()) || "";
    }
    // Set content in the editor
    set(content, focus = false) {
        this.editor.set(content, focus);
    }
    // Register cleanup callback
    register(cb) {
        this.editor.register(cb);
    }
    // Clean up method that ensures proper destruction
    destroy() {
        if (this._loaded && typeof this.editor.unload === "function") {
            this.editor.unload();
        }
        this.app.keymap.popScope(this.scope);
        this.app.workspace.activeEditor = null;
        this.containerEl.empty();
        this.editor.destroy();
    }
    // Unload handler
    onunload() {
        if (typeof this.editor.onunload === "function") {
            this.editor.onunload();
        }
        this.destroy();
    }
    // Required method for MarkdownScrollableEditView compatibility
    unload() {
        if (typeof this.editor.unload === "function") {
            this.editor.unload();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd24tZWRpdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFya2Rvd24tZWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFHTixLQUFLLEdBSUwsTUFBTSxVQUFVLENBQUM7QUFFbEIsT0FBTyxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQWMsTUFBTSxrQkFBa0IsQ0FBQztBQUUvRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBRXZDOzs7Ozs7R0FNRztBQUNILE1BQU0sVUFBVSw4QkFBOEIsQ0FDN0MsR0FBUSxFQUNSLFNBQXNCLEVBQ3RCLE9BQXFDO0lBRXJDLHVCQUF1QjtJQUN2QixNQUFNLFdBQVcsR0FBRyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUVoRCw2QkFBNkI7SUFDN0IsT0FBTyxJQUFJLHdCQUF3QixDQUFDLEdBQUcsRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQzNFLENBQUM7QUFFRDs7R0FFRztBQUNILFNBQVMsc0JBQXNCLENBQUMsR0FBUTtJQUN2QyxpRkFBaUY7SUFDakYsTUFBTSxnQkFBZ0IsR0FBRyxHQUFHLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FDN0QsRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQ2pDLElBQXdCLEVBQ3hCLEVBQUUsQ0FDa0IsQ0FBQztJQUV0Qiw2Q0FBNkM7SUFDN0MsZ0JBQWdCLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztJQUNqQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUM5QixNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUMsY0FBYyxDQUMzQyxNQUFNLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLFFBQVMsQ0FBQyxD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QWtEO0lBQ2xELE9BQU87UUFDTixJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sS0FBSyxVQUFVLEVBQUU7WUFDN0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztTQUNyQjtRQUVELElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztRQUN2QyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRXpCLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDdkIsQ0FBQztJQUVELGlCQUFpQjtJQUNqQixRQUFRO1FBQ1AsSUFBSSxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxLQUFLLFVBQVUsRUFBRTtZQUMvQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO1NBQ3ZCO1FBQ0QsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2hCLENBQUM7SUFFRCwrREFBK0Q7SUFDL0QsTUFBTTtRQUNMLElBQUksT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sS0FBSyxVQUFVLEVBQUU7WUFDN0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztTQUNyQjtJQUNGLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XHJcblx0QXBwLFxyXG5cdE1hcmtkb3duU2Nyb2xsYWJsZUVkaXRWaWV3LFxyXG5cdFNjb3BlLFxyXG5cdFRGaWxlLFxyXG5cdFdpZGdldEVkaXRvclZpZXcsXHJcblx0V29ya3NwYWNlTGVhZixcclxufSBmcm9tIFwib2JzaWRpYW5cIjtcclxuXHJcbmltcG9ydCB7IEVkaXRvclNlbGVjdGlvbiwgUHJlYyB9IGZyb20gXCJAY29kZW1pcnJvci9zdGF0ZVwiO1xyXG5pbXBvcnQgeyBFZGl0b3JWaWV3LCBrZXltYXAsIHBsYWNlaG9sZGVyLCBWaWV3VXBkYXRlIH0gZnJvbSBcIkBjb2RlbWlycm9yL3ZpZXdcIjtcclxuXHJcbmltcG9ydCB7IGFyb3VuZCB9IGZyb20gXCJtb25rZXktYXJvdW5kXCI7XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhbiBlbWJlZGRhYmxlIG1hcmtkb3duIGVkaXRvclxyXG4gKiBAcGFyYW0gYXBwIFRoZSBPYnNpZGlhbiBhcHAgaW5zdGFuY2VcclxuICogQHBhcmFtIGNvbnRhaW5lciBUaGUgY29udGFpbmVyIGVsZW1lbnRcclxuICogQHBhcmFtIG9wdGlvbnMgRWRpdG9yIG9wdGlvbnNcclxuICogQHJldHVybnMgQSBjb25maWd1cmVkIG1hcmtkb3duIGVkaXRvclxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVtYmVkZGFibGVNYXJrZG93bkVkaXRvcihcclxuXHRhcHA6IEFwcCxcclxuXHRjb250YWluZXI6IEhUTUxFbGVtZW50LFxyXG5cdG9wdGlvbnM6IFBhcnRpYWw8TWFya2Rvd25FZGl0b3JQcm9wcz5cclxuKTogRW1iZWRkYWJsZU1hcmtkb3duRWRpdG9yIHtcclxuXHQvLyBHZXQgdGhlIGVkaXRvciBjbGFzc1xyXG5cdGNvbnN0IEVkaXRvckNsYXNzID0gcmVzb2x2ZUVkaXRvclByb3RvdHlwZShhcHApO1xyXG5cclxuXHQvLyBDcmVhdGUgdGhlIGVkaXRvciBpbnN0YW5jZVxyXG5cdHJldHVybiBuZXcgRW1iZWRkYWJsZU1hcmtkb3duRWRpdG9yKGFwcCwgRWRpdG9yQ2xhc3MsIGNvbnRhaW5lciwgb3B0aW9ucyk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZXNvbHZlcyB0aGUgbWFya2Rvd24gZWRpdG9yIHByb3RvdHlwZSBmcm9tIHRoZSBhcHBcclxuICovXHJcbmZ1bmN0aW9uIHJlc29sdmVFZGl0b3JQcm90b3R5cGUoYXBwOiBBcHApOiBhbnkge1xyXG5cdC8vIENyZWF0ZSBhIHRlbXBvcmFyeSBlZGl0b3IgdG8gcmVzb2x2ZSB0aGUgcHJvdG90eXBlIG9mIFNjcm9sbGFibGVNYXJrZG93bkVkaXRvclxyXG5cdGNvbnN0IHdpZGdldEVkaXRvclZpZXcgPSBhcHAuZW1iZWRSZWdpc3RyeS5lbWJlZEJ5RXh0ZW5zaW9uLm1kKFxyXG5cdFx0eyBhcHAsIGNvbnRhaW5lckVsOiBjcmVhdGVEaXYoKSB9LFxyXG5cdFx0bnVsbCBhcyB1bmtub3duIGFzIFRGaWxlLFxyXG5cdFx0XCJcIlxyXG5cdCkgYXMgV2lkZ2V0RWRpdG9yVmlldztcclxuXHJcblx0Ly8gTWFyayBhcyBlZGl0YWJsZSB0byBpbnN0YW50aWF0ZSB0aGUgZWRpdG9yXHJcblx0d2lkZ2V0RWRpdG9yVmlldy5lZGl0YWJsZSA9IHRydWU7XHJcblx0d2lkZ2V0RWRpdG9yVmlldy5zaG93RWRpdG9yKCk7XHJcblx0Y29uc3QgTWFya2Rvd25FZGl0b3IgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoXHJcblx0XHRPYmplY3QuZ2V0UHJvdG90eXBlT2Yod2lkZ2V0RWRpdG9yVmlldy5lZGl0TW9kZSEpXHJcblx0KTtcclxuXHJcblx0Ly8gVW5sb2FkIHRvIHJlbW92ZSB0aGUgdGVtcG9yYXJ5IGVkaXRvclxyXG5cdHdpZGdldEVkaXRvclZpZXcudW5sb2FkKCk7XHJcblxyXG5cdC8vIFJldHVybiB0aGUgY29uc3RydWN0b3IsIHVzaW5nICdhbnknIHR5cGUgdG8gYnlwYXNzIHRoZSBhYnN0cmFjdCBjbGFzcyBjaGVja1xyXG5cdHJldHVybiBNYXJrZG93bkVkaXRvci5jb25zdHJ1Y3RvcjtcclxufVxyXG5cclxuaW50ZXJmYWNlIE1hcmtkb3duRWRpdG9yUHJvcHMge1xyXG5cdGN1cnNvckxvY2F0aW9uPzogeyBhbmNob3I6IG51bWJlcjsgaGVhZDogbnVtYmVyIH07XHJcblx0dmFsdWU/OiBzdHJpbmc7XHJcblx0Y2xzPzogc3RyaW5nO1xyXG5cdHBsYWNlaG9sZGVyPzogc3RyaW5nO1xyXG5cdHNpbmdsZUxpbmU/OiBib29sZWFuOyAvLyBOZXcgb3B0aW9uIGZvciBzaW5nbGUgbGluZSBtb2RlXHJcblxyXG5cdG9uRW50ZXI6IChcclxuXHRcdGVkaXRvcjogRW1iZWRkYWJsZU1hcmtkb3duRWRpdG9yLFxyXG5cdFx0bW9kOiBib29sZWFuLFxyXG5cdFx0c2hpZnQ6IGJvb2xlYW5cclxuXHQpID0+IGJvb2xlYW47XHJcblx0b25Fc2NhcGU6IChlZGl0b3I6IEVtYmVkZGFibGVNYXJrZG93bkVkaXRvcikgPT4gdm9pZDtcclxuXHRvblN1Ym1pdDogKGVkaXRvcjogRW1iZWRkYWJsZU1hcmtkb3duRWRpdG9yKSA9PiB2b2lkO1xyXG5cdG9uQmx1cjogKGVkaXRvcjogRW1iZWRkYWJsZU1hcmtkb3duRWRpdG9yKSA9PiB2b2lkO1xyXG5cdG9uUGFzdGU6IChlOiBDbGlwYm9hcmRFdmVudCwgZWRpdG9yOiBFbWJlZGRhYmxlTWFya2Rvd25FZGl0b3IpID0+IHZvaWQ7XHJcblx0b25DaGFuZ2U6ICh1cGRhdGU6IFZpZXdVcGRhdGUpID0+IHZvaWQ7XHJcbn1cclxuXHJcbmNvbnN0IGRlZmF1bHRQcm9wZXJ0aWVzOiBNYXJrZG93bkVkaXRvclByb3BzID0ge1xyXG5cdGN1cnNvckxvY2F0aW9uOiB7IGFuY2hvcjogMCwgaGVhZDogMCB9LFxyXG5cdHZhbHVlOiBcIlwiLFxyXG5cdHNpbmdsZUxpbmU6IGZhbHNlLFxyXG5cdGNsczogXCJcIixcclxuXHRwbGFjZWhvbGRlcjogXCJcIixcclxuXHJcblx0b25FbnRlcjogKCkgPT4gZmFsc2UsXHJcblx0b25Fc2NhcGU6ICgpID0+IHt9LFxyXG5cdG9uU3VibWl0OiAoKSA9PiB7fSxcclxuXHQvLyBOT1RFOiBCbHVyIHRha2VzIHByZWNlZGVuY2Ugb3ZlciBFc2NhcGUgKHRoaXMgY2FuIGJlIGNoYW5nZWQpXHJcblx0b25CbHVyOiAoKSA9PiB7fSxcclxuXHRvblBhc3RlOiAoKSA9PiB7fSxcclxuXHRvbkNoYW5nZTogKCkgPT4ge30sXHJcbn07XHJcblxyXG4vKipcclxuICogQSBtYXJrZG93biBlZGl0b3IgdGhhdCBjYW4gYmUgZW1iZWRkZWQgaW4gYW55IGNvbnRhaW5lclxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIEVtYmVkZGFibGVNYXJrZG93bkVkaXRvciB7XHJcblx0b3B0aW9uczogTWFya2Rvd25FZGl0b3JQcm9wcztcclxuXHRpbml0aWFsX3ZhbHVlOiBzdHJpbmc7XHJcblx0c2NvcGU6IFNjb3BlO1xyXG5cdGVkaXRvcjogTWFya2Rvd25TY3JvbGxhYmxlRWRpdFZpZXc7XHJcblxyXG5cdC8vIEV4cG9zZSBjb21tb25seSBhY2Nlc3NlZCBwcm9wZXJ0aWVzXHJcblx0Z2V0IGVkaXRvckVsKCk6IEhUTUxFbGVtZW50IHtcclxuXHRcdHJldHVybiB0aGlzLmVkaXRvci5lZGl0b3JFbDtcclxuXHR9XHJcblx0Z2V0IGNvbnRhaW5lckVsKCk6IEhUTUxFbGVtZW50IHtcclxuXHRcdHJldHVybiB0aGlzLmVkaXRvci5jb250YWluZXJFbDtcclxuXHR9XHJcblx0Z2V0IGFjdGl2ZUNNKCk6IEVkaXRvclZpZXcge1xyXG5cdFx0cmV0dXJuIHRoaXMuZWRpdG9yLmFjdGl2ZUNNO1xyXG5cdH1cclxuXHRnZXQgYXBwKCk6IEFwcCB7XHJcblx0XHRyZXR1cm4gdGhpcy5lZGl0b3IuYXBwO1xyXG5cdH1cclxuXHRnZXQgb3duZXIoKTogYW55IHtcclxuXHRcdHJldHVybiB0aGlzLmVkaXRvci5vd25lcjtcclxuXHR9XHJcblx0Z2V0IF9sb2FkZWQoKTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gdGhpcy5lZGl0b3IuX2xvYWRlZDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENvbnN0cnVjdCB0aGUgZWRpdG9yXHJcblx0ICogQHBhcmFtIGFwcCAtIFJlZmVyZW5jZSB0byBBcHAgaW5zdGFuY2VcclxuXHQgKiBAcGFyYW0gRWRpdG9yQ2xhc3MgLSBUaGUgZWRpdG9yIGNsYXNzIGNvbnN0cnVjdG9yXHJcblx0ICogQHBhcmFtIGNvbnRhaW5lciAtIENvbnRhaW5lciBlbGVtZW50IHRvIGFkZCB0aGUgZWRpdG9yIHRvXHJcblx0ICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25zIGZvciBjb250cm9sbGluZyB0aGUgaW5pdGlhbCBzdGF0ZSBvZiB0aGUgZWRpdG9yXHJcblx0ICovXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRhcHA6IEFwcCxcclxuXHRcdEVkaXRvckNsYXNzOiBhbnksXHJcblx0XHRjb250YWluZXI6IEhUTUxFbGVtZW50LFxyXG5cdFx0b3B0aW9uczogUGFydGlhbDxNYXJrZG93bkVkaXRvclByb3BzPlxyXG5cdCkge1xyXG5cdFx0Ly8gU3RvcmUgdXNlciBvcHRpb25zIGZpcnN0XHJcblx0XHR0aGlzLm9wdGlvbnMgPSB7IC4uLmRlZmF1bHRQcm9wZXJ0aWVzLCAuLi5vcHRpb25zIH07XHJcblx0XHR0aGlzLmluaXRpYWxfdmFsdWUgPSB0aGlzLm9wdGlvbnMudmFsdWUhO1xyXG5cdFx0dGhpcy5zY29wZSA9IG5ldyBTY29wZShhcHAuc2NvcGUpO1xyXG5cclxuXHRcdC8vIFByZXZlbnQgTW9kK0VudGVyIGRlZmF1bHQgYmVoYXZpb3JcclxuXHRcdHRoaXMuc2NvcGUucmVnaXN0ZXIoW1wiTW9kXCJdLCBcIkVudGVyXCIsICgpID0+IHRydWUpO1xyXG5cclxuXHRcdC8vIFN0b3JlIHJlZmVyZW5jZSB0byBzZWxmIGZvciB0aGUgcGF0Y2hlZCBtZXRob2QgQkVGT1JFIHVzaW5nIGl0XHJcblx0XHRjb25zdCBzZWxmID0gdGhpcztcclxuXHJcblx0XHQvLyBVc2UgbW9ua2V5LWFyb3VuZCB0byBzYWZlbHkgcGF0Y2ggdGhlIG1ldGhvZFxyXG5cdFx0Y29uc3QgdW5pbnN0YWxsZXIgPSBhcm91bmQoRWRpdG9yQ2xhc3MucHJvdG90eXBlLCB7XHJcblx0XHRcdGJ1aWxkTG9jYWxFeHRlbnNpb25zOiAob3JpZ2luYWxNZXRob2Q6IGFueSkgPT5cclxuXHRcdFx0XHRmdW5jdGlvbiAodGhpczogYW55KSB7XHJcblx0XHRcdFx0XHRjb25zdCBleHRlbnNpb25zID0gb3JpZ2luYWxNZXRob2QuY2FsbCh0aGlzKTtcclxuXHJcblx0XHRcdFx0XHQvLyBPbmx5IGFkZCBvdXIgY3VzdG9tIGV4dGVuc2lvbnMgaWYgdGhpcyBpcyBvdXIgZWRpdG9yIGluc3RhbmNlXHJcblx0XHRcdFx0XHRpZiAodGhpcyA9PT0gc2VsZi5lZGl0b3IpIHtcclxuXHRcdFx0XHRcdFx0Ly8gQWRkIHBsYWNlaG9sZGVyIGlmIGNvbmZpZ3VyZWRcclxuXHRcdFx0XHRcdFx0aWYgKHNlbGYub3B0aW9ucy5wbGFjZWhvbGRlcikge1xyXG5cdFx0XHRcdFx0XHRcdGV4dGVuc2lvbnMucHVzaChcclxuXHRcdFx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyKHNlbGYub3B0aW9ucy5wbGFjZWhvbGRlcilcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBBZGQgcGFzdGUsIGJsdXIsIGFuZCBmb2N1cyBldmVudCBoYW5kbGVyc1xyXG5cdFx0XHRcdFx0XHRleHRlbnNpb25zLnB1c2goXHJcblx0XHRcdFx0XHRcdFx0RWRpdG9yVmlldy5kb21FdmVudEhhbmRsZXJzKHtcclxuXHRcdFx0XHRcdFx0XHRcdHBhc3RlOiAoZXZlbnQpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0c2VsZi5vcHRpb25zLm9uUGFzdGUoZXZlbnQsIHNlbGYpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHRcdGJsdXI6ICgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gQWx3YXlzIHRyaWdnZXIgYmx1ciBjYWxsYmFjayBhbmQgbGV0IGl0IGhhbmRsZSB0aGUgbG9naWNcclxuXHRcdFx0XHRcdFx0XHRcdFx0YXBwLmtleW1hcC5wb3BTY29wZShzZWxmLnNjb3BlKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKHNlbGYub3B0aW9ucy5vbkJsdXIpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRzZWxmLm9wdGlvbnMub25CbHVyKHNlbGYpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdFx0Zm9jdXNpbjogKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRhcHAua2V5bWFwLnB1c2hTY29wZShzZWxmLnNjb3BlKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0YXBwLndvcmtzcGFjZS5hY3RpdmVFZGl0b3IgPSBzZWxmLm93bmVyO1xyXG5cdFx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gQWRkIGtleWJvYXJkIGhhbmRsZXJzXHJcblx0XHRcdFx0XHRcdGNvbnN0IGtleUJpbmRpbmdzID0gW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdGtleTogXCJFbnRlclwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0cnVuOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiBzZWxmLm9wdGlvbnMub25FbnRlcihcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRzZWxmLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGZhbHNlLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGZhbHNlXHJcblx0XHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdFx0c2hpZnQ6ICgpID0+XHJcblx0XHRcdFx0XHRcdFx0XHRcdHNlbGYub3B0aW9ucy5vbkVudGVyKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHNlbGYsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZmFsc2UsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0dHJ1ZVxyXG5cdFx0XHRcdFx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0a2V5OiBcIk1vZC1FbnRlclwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0cnVuOiAoKSA9PlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRzZWxmLm9wdGlvbnMub25FbnRlcihcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRzZWxmLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRydWUsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZmFsc2VcclxuXHRcdFx0XHRcdFx0XHRcdFx0KSxcclxuXHRcdFx0XHRcdFx0XHRcdHNoaWZ0OiAoKSA9PlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRzZWxmLm9wdGlvbnMub25FbnRlcihcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRzZWxmLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRydWUsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0dHJ1ZVxyXG5cdFx0XHRcdFx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0a2V5OiBcIkVzY2FwZVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0cnVuOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHNlbGYub3B0aW9ucy5vbkVzY2FwZShzZWxmKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdFx0cHJldmVudERlZmF1bHQ6IHRydWUsXHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIEZvciBzaW5nbGUgbGluZSBtb2RlLCBwcmV2ZW50IEVudGVyIGtleSBmcm9tIGNyZWF0aW5nIG5ldyBsaW5lc1xyXG5cdFx0XHRcdFx0XHRpZiAoc2VsZi5vcHRpb25zLnNpbmdsZUxpbmUpIHtcclxuXHRcdFx0XHRcdFx0XHRrZXlCaW5kaW5nc1swXSA9IHtcclxuXHRcdFx0XHRcdFx0XHRcdGtleTogXCJFbnRlclwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0cnVuOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdC8vIEluIHNpbmdsZSBsaW5lIG1vZGUsIEVudGVyIHNob3VsZCB0cmlnZ2VyIG9uRW50ZXJcclxuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHNlbGYub3B0aW9ucy5vbkVudGVyKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHNlbGYsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZmFsc2UsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZmFsc2VcclxuXHRcdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0XHRzaGlmdDogKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBFdmVuIHdpdGggc2hpZnQsIHN0aWxsIGNhbGwgb25FbnRlciBpbiBzaW5nbGUgbGluZSBtb2RlXHJcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiBzZWxmLm9wdGlvbnMub25FbnRlcihcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRzZWxmLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGZhbHNlLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRydWVcclxuXHRcdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0fTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0ZXh0ZW5zaW9ucy5wdXNoKFxyXG5cdFx0XHRcdFx0XHRcdFByZWMuaGlnaGVzdChrZXltYXAub2Yoa2V5QmluZGluZ3MpKVxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdHJldHVybiBleHRlbnNpb25zO1xyXG5cdFx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDcmVhdGUgdGhlIGVkaXRvciB3aXRoIHRoZSBhcHAgaW5zdGFuY2VcclxuXHRcdHRoaXMuZWRpdG9yID0gbmV3IEVkaXRvckNsYXNzKGFwcCwgY29udGFpbmVyLCB7XHJcblx0XHRcdGFwcCxcclxuXHRcdFx0Ly8gVGhpcyBtb2NrcyB0aGUgTWFya2Rvd25WaWV3IGZ1bmN0aW9ucywgcmVxdWlyZWQgZm9yIHByb3BlciBzY3JvbGxpbmdcclxuXHRcdFx0b25NYXJrZG93blNjcm9sbDogKCkgPT4ge30sXHJcblx0XHRcdGdldE1vZGU6ICgpID0+IFwic291cmNlXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBSZWdpc3RlciB0aGUgdW5pbnN0YWxsZXIgZm9yIGNsZWFudXBcclxuXHRcdHRoaXMucmVnaXN0ZXIodW5pbnN0YWxsZXIpO1xyXG5cclxuXHRcdC8vIFNldCB1cCB0aGUgZWRpdG9yIHJlbGF0aW9uc2hpcCBmb3IgY29tbWFuZHMgdG8gd29ya1xyXG5cdFx0aWYgKHRoaXMub3duZXIpIHtcclxuXHRcdFx0dGhpcy5vd25lci5lZGl0TW9kZSA9IHRoaXM7XHJcblx0XHRcdHRoaXMub3duZXIuZWRpdG9yID0gdGhpcy5lZGl0b3IuZWRpdG9yO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFNldCBpbml0aWFsIGNvbnRlbnRcclxuXHRcdHRoaXMuc2V0KG9wdGlvbnMudmFsdWUgfHwgXCJcIiwgZmFsc2UpO1xyXG5cclxuXHRcdC8vIFByZXZlbnQgYWN0aXZlIGxlYWYgY2hhbmdlcyB3aGlsZSBmb2N1c2VkXHJcblx0XHR0aGlzLnJlZ2lzdGVyKFxyXG5cdFx0XHRhcm91bmQoYXBwLndvcmtzcGFjZSwge1xyXG5cdFx0XHRcdHNldEFjdGl2ZUxlYWY6XHJcblx0XHRcdFx0XHQob2xkTWV0aG9kOiBhbnkpID0+XHJcblx0XHRcdFx0XHQobGVhZjogV29ya3NwYWNlTGVhZiwgLi4uYXJnczogYW55W10pID0+IHtcclxuXHRcdFx0XHRcdFx0aWYgKCF0aGlzLmFjdGl2ZUNNPy5oYXNGb2N1cykge1xyXG5cdFx0XHRcdFx0XHRcdG9sZE1ldGhvZC5jYWxsKGFwcC53b3Jrc3BhY2UsIGxlYWYsIC4uLmFyZ3MpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBCbHVyIGFuZCBmb2N1cyBldmVudCBoYW5kbGVycyBhcmUgbm93IGhhbmRsZWQgdmlhIEVkaXRvclZpZXcuZG9tRXZlbnRIYW5kbGVycyBpbiBidWlsZExvY2FsRXh0ZW5zaW9uc1xyXG5cclxuXHRcdC8vIEFwcGx5IGN1c3RvbSBjbGFzcyBpZiBwcm92aWRlZFxyXG5cdFx0aWYgKG9wdGlvbnMuY2xzICYmIHRoaXMuZWRpdG9yRWwpIHtcclxuXHRcdFx0dGhpcy5lZGl0b3JFbC5jbGFzc0xpc3QuYWRkKG9wdGlvbnMuY2xzKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTZXQgY3Vyc29yIHBvc2l0aW9uIGlmIHNwZWNpZmllZFxyXG5cdFx0aWYgKG9wdGlvbnMuY3Vyc29yTG9jYXRpb24gJiYgdGhpcy5lZGl0b3IuZWRpdG9yPy5jbSkge1xyXG5cdFx0XHR0aGlzLmVkaXRvci5lZGl0b3IuY20uZGlzcGF0Y2goe1xyXG5cdFx0XHRcdHNlbGVjdGlvbjogRWRpdG9yU2VsZWN0aW9uLnJhbmdlKFxyXG5cdFx0XHRcdFx0b3B0aW9ucy5jdXJzb3JMb2NhdGlvbi5hbmNob3IsXHJcblx0XHRcdFx0XHRvcHRpb25zLmN1cnNvckxvY2F0aW9uLmhlYWRcclxuXHRcdFx0XHQpLFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBPdmVycmlkZSBvblVwZGF0ZSB0byBjYWxsIG91ciBvbkNoYW5nZSBoYW5kbGVyXHJcblx0XHRjb25zdCBvcmlnaW5hbE9uVXBkYXRlID0gdGhpcy5lZGl0b3Iub25VcGRhdGUuYmluZCh0aGlzLmVkaXRvcik7XHJcblx0XHR0aGlzLmVkaXRvci5vblVwZGF0ZSA9ICh1cGRhdGU6IFZpZXdVcGRhdGUsIGNoYW5nZWQ6IGJvb2xlYW4pID0+IHtcclxuXHRcdFx0b3JpZ2luYWxPblVwZGF0ZSh1cGRhdGUsIGNoYW5nZWQpO1xyXG5cdFx0XHRpZiAoY2hhbmdlZCkgdGhpcy5vcHRpb25zLm9uQ2hhbmdlKHVwZGF0ZSk7XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0Ly8gR2V0IHRoZSBjdXJyZW50IGVkaXRvciB2YWx1ZVxyXG5cdGdldCB2YWx1ZSgpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIHRoaXMuZWRpdG9yLmVkaXRvcj8uY20/LnN0YXRlLmRvYy50b1N0cmluZygpIHx8IFwiXCI7XHJcblx0fVxyXG5cclxuXHQvLyBTZXQgY29udGVudCBpbiB0aGUgZWRpdG9yXHJcblx0c2V0KGNvbnRlbnQ6IHN0cmluZywgZm9jdXM6IGJvb2xlYW4gPSBmYWxzZSk6IHZvaWQge1xyXG5cdFx0dGhpcy5lZGl0b3Iuc2V0KGNvbnRlbnQsIGZvY3VzKTtcclxuXHR9XHJcblxyXG5cdC8vIFJlZ2lzdGVyIGNsZWFudXAgY2FsbGJhY2tcclxuXHRyZWdpc3RlcihjYjogYW55KTogdm9pZCB7XHJcblx0XHR0aGlzLmVkaXRvci5yZWdpc3RlcihjYik7XHJcblx0fVxyXG5cclxuXHQvLyBDbGVhbiB1cCBtZXRob2QgdGhhdCBlbnN1cmVzIHByb3BlciBkZXN0cnVjdGlvblxyXG5cdGRlc3Ryb3koKTogdm9pZCB7XHJcblx0XHRpZiAodGhpcy5fbG9hZGVkICYmIHR5cGVvZiB0aGlzLmVkaXRvci51bmxvYWQgPT09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHR0aGlzLmVkaXRvci51bmxvYWQoKTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmFwcC5rZXltYXAucG9wU2NvcGUodGhpcy5zY29wZSk7XHJcblx0XHR0aGlzLmFwcC53b3Jrc3BhY2UuYWN0aXZlRWRpdG9yID0gbnVsbDtcclxuXHRcdHRoaXMuY29udGFpbmVyRWwuZW1wdHkoKTtcclxuXHJcblx0XHR0aGlzLmVkaXRvci5kZXN0cm95KCk7XHJcblx0fVxyXG5cclxuXHQvLyBVbmxvYWQgaGFuZGxlclxyXG5cdG9udW5sb2FkKCk6IHZvaWQge1xyXG5cdFx0aWYgKHR5cGVvZiB0aGlzLmVkaXRvci5vbnVubG9hZCA9PT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdHRoaXMuZWRpdG9yLm9udW5sb2FkKCk7XHJcblx0XHR9XHJcblx0XHR0aGlzLmRlc3Ryb3koKTtcclxuXHR9XHJcblxyXG5cdC8vIFJlcXVpcmVkIG1ldGhvZCBmb3IgTWFya2Rvd25TY3JvbGxhYmxlRWRpdFZpZXcgY29tcGF0aWJpbGl0eVxyXG5cdHVubG9hZCgpOiB2b2lkIHtcclxuXHRcdGlmICh0eXBlb2YgdGhpcy5lZGl0b3IudW5sb2FkID09PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0dGhpcy5lZGl0b3IudW5sb2FkKCk7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcbiJdfQ==