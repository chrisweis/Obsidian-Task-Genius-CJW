import { ViewPlugin, Decoration, WidgetType, MatchDecorator, } from "@codemirror/view";
import { editorInfoField, editorLivePreviewField, Keymap, Menu, } from "obsidian";
import { Annotation, EditorSelection } from "@codemirror/state";
// @ts-ignore - This import is necessary but TypeScript can't find it
import { syntaxTree, tokenClassNodeProp } from "@codemirror/language";
import { getTasksAPI } from "@/utils";
export const taskStatusChangeAnnotation = Annotation.define();
export const STATE_MARK_MAP = {
    TODO: " ",
    DOING: "-",
    "IN-PROGRESS": ">",
    DONE: "x",
};
class TaskStatusWidget extends WidgetType {
    constructor(app, plugin, view, from, to, currentState, listPrefix) {
        super();
        this.app = app;
        this.plugin = plugin;
        this.view = view;
        this.from = from;
        this.to = to;
        this.currentState = currentState;
        this.listPrefix = listPrefix;
        this.cycle = [];
        this.marks = {};
        const config = this.getStatusConfig();
        this.cycle = config.cycle;
        this.marks = config.marks;
        this.isLivePreview = view.state.field(editorLivePreviewField);
        this.bulletText = listPrefix.trim();
    }
    eq(other) {
        return (this.from === other.from &&
            this.to === other.to &&
            this.currentState === other.currentState &&
            this.bulletText === other.bulletText);
    }
    toDOM() {
        const { cycle, marks, excludeMarksFromCycle } = this.getStatusConfig();
        let nextState = this.currentState;
        const remainingCycle = cycle.filter((state) => !excludeMarksFromCycle.includes(state));
        if (remainingCycle.length > 0) {
            const currentIndex = remainingCycle.indexOf(this.currentState);
            const nextIndex = (currentIndex + 1) % remainingCycle.length;
            nextState = remainingCycle[nextIndex];
        }
        const wrapper = createEl("span", {
            cls: "task-status-widget",
            attr: {
                "aria-label": "Next status: " + nextState,
            },
        });
        // Only add the bullet point in Live Preview mode
        if (this.isLivePreview) {
            const isNumberedList = /^\d+[.)]$/.test(this.bulletText);
            wrapper.createEl("span", {
                cls: isNumberedList
                    ? "cm-formatting cm-formatting-list cm-formatting-list-ol"
                    : "cm-formatting cm-formatting-list cm-formatting-list-ul",
            }, (el) => {
                el.createEl("span", {
                    cls: isNumberedList ? "list-number" : "list-bullet",
                    text: this.bulletText,
                });
            });
        }
        const statusText = document.createElement("span");
        statusText.toggleClass([
            "task-state",
            this.isLivePreview ? "live-preview-mode" : "source-mode",
        ], true);
        // Add a specific class based on the mode
        if (this.isLivePreview) {
            statusText.classList.add("live-preview-mode");
        }
        else {
            statusText.classList.add("source-mode");
        }
        const mark = marks[this.currentState] || " ";
        statusText.setAttribute("data-task-state", mark);
        statusText.textContent = this.currentState;
        // Create invisible checkbox for compatibility with existing behaviors
        const invisibleCheckbox = createEl("input", {
            attr: {
                type: "checkbox",
            },
        });
        invisibleCheckbox.hide();
        wrapper.appendChild(invisibleCheckbox);
        // Click to cycle through states
        statusText.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Trigger the invisible checkbox click to maintain compatibility
            if (getTasksAPI(this.plugin)) {
                invisibleCheckbox.click();
                return;
            }
            if (Keymap.isModEvent(e)) {
                // When modifier key is pressed, jump to the first or last state
                const { cycle } = this.getStatusConfig();
                // Just use whatever states are available in the cycle
                if (cycle.length > 0) {
                    // Jump to the last state (DONE) if not already there
                    if (this.currentState !== cycle[cycle.length - 1]) {
                        this.setTaskState(cycle[cycle.length - 1]);
                    }
                    else {
                        // If already at the last state, jump to the first state
                        this.setTaskState(cycle[0]);
                    }
                }
            }
            else {
                // Normal click behavior - cycle to next state
                this.cycleTaskState();
            }
        });
        // Right-click to show menu with all available states
        statusText.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const menu = new Menu();
            // Add each available state to the menu
            for (const state of this.cycle) {
                menu.addItem((item) => {
                    item.setTitle(state);
                    // When clicked, directly set to the selected state
                    item.onClick(() => {
                        this.setTaskState(state);
                    });
                });
            }
            // Show the menu at the mouse position
            menu.showAtMouseEvent(e);
        });
        wrapper.appendChild(statusText);
        return wrapper;
    }
    setTaskState(status) {
        const currentText = this.view.state.doc.sliceString(this.from, this.to);
        const currentMarkMatch = currentText.match(/\[(.)]/);
        if (!currentMarkMatch)
            return;
        const nextMark = this.marks[status] || " ";
        // Replace text with the selected state's mark
        const newText = currentText.replace(/\[(.)]/, `[${nextMark}]`);
        // if (nextMark === "x" || nextMark === "X") {
        // 	const line = this.view.state.doc.lineAt(this.from);
        // 	const path =
        // 		this.view.state.field(editorInfoField)?.file?.path || "";
        // 	const task = parseTaskLine(
        // 		path,
        // 		line.text,
        // 		line.number,
        // 		this.plugin.settings.preferMetadataFormat
        // 	);
        // 	task &&
        // 		this.app.workspace.trigger("task-genius:task-completed", task);
        // }
        this.view.dispatch({
            changes: {
                from: this.from,
                to: this.to,
                insert: newText,
            },
            annotations: taskStatusChangeAnnotation.of("taskStatusChange"),
        });
    }
    getStatusConfig() {
        if (!this.plugin.settings.enableTaskStatusSwitcher) {
            return {
                cycle: Object.keys(STATE_MARK_MAP),
                marks: STATE_MARK_MAP,
                excludeMarksFromCycle: [],
            };
        }
        return {
            cycle: this.plugin.settings.taskStatusCycle,
            excludeMarksFromCycle: this.plugin.settings.excludeMarksFromCycle || [],
            marks: this.plugin.settings.taskStatusMarks,
        };
    }
    // Cycle through task states
    cycleTaskState() {
        var _a, _b;
        const currentText = this.view.state.doc.sliceString(this.from, this.to);
        const currentMarkMatch = currentText.match(/\[(.)]/);
        if (!currentMarkMatch)
            return;
        const currentMark = currentMarkMatch[1];
        const { cycle, marks, excludeMarksFromCycle } = this.getStatusConfig();
        const remainingCycle = cycle.filter((state) => !excludeMarksFromCycle.includes(state));
        if (remainingCycle.length === 0) {
            const editor = this.view.state.field(editorInfoField);
            if (editor) {
                (_b = (_a = editor === null || editor === void 0 ? void 0 : editor.editor) === null || _a === void 0 ? void 0 : _a.cm) === null || _b === void 0 ? void 0 : _b.dispatch({
                    selection: EditorSelection.range(this.to + 1, this.to + 1),
                });
            }
            // If no cycle is available, trigger the default editor:toggle-checklist-status command
            this.app.commands.executeCommandById("editor:toggle-checklist-status");
            return;
        }
        let currentStateIndex = -1;
        for (let i = 0; i < remainingCycle.length; i++) {
            const state = remainingCycle[i];
            if (marks[state] === currentMark) {
                currentStateIndex = i;
                break;
            }
        }
        if (currentStateIndex === -1) {
            currentStateIndex = 0;
        }
        // Calculate next state
        const nextStateIndex = (currentStateIndex + 1) % remainingCycle.length;
        const nextState = remainingCycle[nextStateIndex];
        const nextMark = marks[nextState] || " ";
        // Replace text
        const newText = currentText.replace(/\[(.)]/, `[${nextMark}]`);
        // if (nextMark === "x" || nextMark === "X") {
        // 	const line = this.view.state.doc.lineAt(this.from);
        // 	const path =
        // 		this.view.state.field(editorInfoField)?.file?.path || "";
        // 	const task = parseTaskLine(
        // 		path,
        // 		line.text,
        // 		line.number,
        // 		this.plugin.settings.preferMetadataFormat
        // 	);
        // 	task &&
        // 		this.app.workspace.trigger("task-genius:task-completed", task);
        // }
        this.view.dispatch({
            changes: {
                from: this.from,
                to: this.to,
                insert: newText,
            },
            annotations: taskStatusChangeAnnotation.of("taskStatusChange"),
            selection: EditorSelection.range(this.to + 1, this.to + 1),
        });
    }
}
export function taskStatusSwitcherExtension(app, plugin) {
    class TaskStatusViewPluginValue {
        constructor(view) {
            this.decorations = Decoration.none;
            this.lastUpdate = 0;
            this.updateThreshold = 50;
            this.match = new MatchDecorator({
                regexp: /^(\s*)((?:[-*+]|\d+[.)])\s)(\[(.)]\s)/g,
                decorate: (add, from, to, match, view) => {
                    if (!this.shouldRender(view, from, to)) {
                        return;
                    }
                    const mark = match[4];
                    const bulletWithSpace = match[2];
                    const bulletText = bulletWithSpace.trim();
                    const checkboxWithSpace = match[3];
                    const checkbox = checkboxWithSpace.trim();
                    const isLivePreview = this.isLivePreview(view.state);
                    const cycle = plugin.settings.taskStatusCycle;
                    const marks = plugin.settings.taskStatusMarks;
                    const excludeMarksFromCycle = plugin.settings.excludeMarksFromCycle || [];
                    const remainingCycle = cycle.filter((state) => !excludeMarksFromCycle.includes(state));
                    if (remainingCycle.length === 0 &&
                        !plugin.settings.enableCustomTaskMarks)
                        return;
                    let currentState = Object.keys(marks).find((state) => marks[state] === mark) ||
                        remainingCycle[0];
                    // In source mode with textmark enabled, only replace the checkbox part
                    if (!isLivePreview &&
                        plugin.settings.enableTextMarkInSourceMode) {
                        // Only replace the checkbox part, not including the bullet
                        const checkboxStart = from + match[1].length + bulletWithSpace.length;
                        const checkboxEnd = checkboxStart + checkbox.length;
                        add(checkboxStart, checkboxEnd, Decoration.replace({
                            widget: new TaskStatusWidget(app, plugin, view, checkboxStart, checkboxEnd, currentState, bulletText),
                        }));
                    }
                    else {
                        // In Live Preview mode, replace the whole bullet point + checkbox
                        add(from + match[1].length, from +
                            match[1].length +
                            bulletWithSpace.length +
                            checkbox.length, Decoration.replace({
                            widget: new TaskStatusWidget(app, plugin, view, from + match[1].length, from +
                                match[1].length +
                                bulletWithSpace.length +
                                checkbox.length, currentState, bulletText),
                        }));
                    }
                },
            });
            this.view = view;
            this.updateDecorations(view);
        }
        update(update) {
            const now = Date.now();
            if (update.docChanged ||
                update.viewportChanged ||
                (now - this.lastUpdate > this.updateThreshold &&
                    update.selectionSet)) {
                this.lastUpdate = now;
                this.updateDecorations(update.view, update);
            }
        }
        destroy() {
            this.decorations = Decoration.none;
        }
        updateDecorations(view, update) {
            if (!update ||
                update.docChanged ||
                update.selectionSet ||
                this.decorations.size === 0) {
                this.decorations = this.match.createDeco(view);
            }
            else {
                this.decorations = this.match.updateDeco(update, this.decorations);
            }
        }
        isLivePreview(state) {
            return state.field(editorLivePreviewField);
        }
        shouldRender(view, decorationFrom, decorationTo) {
            const syntaxNode = syntaxTree(view.state).resolveInner(decorationFrom + 1);
            const nodeProps = syntaxNode.type.prop(tokenClassNodeProp);
            if (nodeProps) {
                const props = nodeProps.split(" ");
                if (props.includes("hmd-codeblock") ||
                    props.includes("hmd-frontmatter")) {
                    return false;
                }
            }
            const selection = view.state.selection;
            const overlap = selection.ranges.some((r) => {
                return !(r.to <= decorationFrom || r.from >= decorationTo);
            });
            return (!overlap &&
                (this.isLivePreview(view.state) ||
                    plugin.settings.enableTextMarkInSourceMode));
        }
    }
    const TaskStatusViewPluginSpec = {
        decorations: (plugin) => {
            return plugin.decorations.update({
                filter: (rangeFrom, rangeTo, deco) => {
                    var _a;
                    const widget = (_a = deco.spec) === null || _a === void 0 ? void 0 : _a.widget;
                    if (widget.error) {
                        return false;
                    }
                    const selection = plugin.view.state.selection;
                    for (const range of selection.ranges) {
                        if (!(range.to <= rangeFrom || range.from >= rangeTo)) {
                            return false;
                        }
                    }
                    return true;
                },
            });
        },
    };
    return ViewPlugin.fromClass(TaskStatusViewPluginValue, TaskStatusViewPluginSpec);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzLXN3aXRjaGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic3RhdHVzLXN3aXRjaGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFFTixVQUFVLEVBRVYsVUFBVSxFQUVWLFVBQVUsRUFDVixjQUFjLEdBR2QsTUFBTSxrQkFBa0IsQ0FBQztBQUMxQixPQUFPLEVBRU4sZUFBZSxFQUNmLHNCQUFzQixFQUN0QixNQUFNLEVBQ04sSUFBSSxHQUNKLE1BQU0sVUFBVSxDQUFDO0FBRWxCLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDaEUscUVBQXFFO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUN0RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBR3RDLE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUU5RCxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQTJCO0lBQ3JELElBQUksRUFBRSxHQUFHO0lBQ1QsS0FBSyxFQUFFLEdBQUc7SUFDVixhQUFhLEVBQUUsR0FBRztJQUNsQixJQUFJLEVBQUUsR0FBRztDQUNULENBQUM7QUFFRixNQUFNLGdCQUFpQixTQUFRLFVBQVU7SUFNeEMsWUFDVSxHQUFRLEVBQ1IsTUFBNkIsRUFDN0IsSUFBZ0IsRUFDaEIsSUFBWSxFQUNaLEVBQVUsRUFDVixZQUF1QixFQUN2QixVQUFrQjtRQUUzQixLQUFLLEVBQUUsQ0FBQztRQVJDLFFBQUcsR0FBSCxHQUFHLENBQUs7UUFDUixXQUFNLEdBQU4sTUFBTSxDQUF1QjtRQUM3QixTQUFJLEdBQUosSUFBSSxDQUFZO1FBQ2hCLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixPQUFFLEdBQUYsRUFBRSxDQUFRO1FBQ1YsaUJBQVksR0FBWixZQUFZLENBQVc7UUFDdkIsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQVpwQixVQUFLLEdBQWEsRUFBRSxDQUFDO1FBQ3JCLFVBQUssR0FBMkIsRUFBRSxDQUFDO1FBYzFDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUN0QyxJQUFJLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUM7UUFDMUIsSUFBSSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDO1FBQzFCLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUM5RCxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0lBRUQsRUFBRSxDQUFDLEtBQXVCO1FBQ3pCLE9BQU8sQ0FDTixJQUFJLENBQUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxJQUFJO1lBQ3hCLElBQUksQ0FBQyxFQUFFLEtBQUssS0FBSyxDQUFDLEVBQUU7WUFDcEIsSUFBSSxDQUFDLFlBQVksS0FBSyxLQUFLLENBQUMsWUFBWTtZQUN4QyxJQUFJLENBQUMsVUFBVSxLQUFLLEtBQUssQ0FBQyxVQUFVLENBQ3BDLENBQUM7SUFDSCxDQUFDO0lBRUQsS0FBSztRQUNKLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLHFCQUFxQixFQUFFLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ3ZFLElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7UUFFbEMsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FDbEMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUNqRCxDQUFDO1FBRUYsSUFBSSxjQUFjLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUM5QixNQUFNLFlBQVksR0FBRyxjQUFjLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUMvRCxNQUFNLFNBQVMsR0FBRyxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsR0FBRyxjQUFjLENBQUMsTUFBTSxDQUFDO1lBQzdELFNBQVMsR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDdEM7UUFFRCxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFO1lBQ2hDLEdBQUcsRUFBRSxvQkFBb0I7WUFDekIsSUFBSSxFQUFFO2dCQUNMLFlBQVksRUFBRSxlQUFlLEdBQUcsU0FBUzthQUN6QztTQUNELENBQUMsQ0FBQztRQUVILGlEQUFpRDtRQUNqRCxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUU7WUFDdkIsTUFBTSxjQUFjLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFFekQsT0FBTyxDQUFDLFFBQVEsQ0FDZixNQUFNLEVBQ047Z0JBQ0MsR0FBRyxFQUFFLGNBQWM7b0JBQ2xCLENBQUMsQ0FBQyx3REFBd0Q7b0JBQzFELENBQUMsQ0FBQyx3REFBd0Q7YUFDM0QsRUFDRCxDQUFDLEVBQUUsRUFBRSxFQUFFO2dCQUNOLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFO29CQUNuQixHQUFHLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLGFBQWE7b0JBQ25ELElBQUksRUFBRSxJQUFJLENBQUMsVUFBVTtpQkFDckIsQ0FBQyxDQUFDO1lBQ0osQ0FBQyxDQUNELENBQUM7U0FDRjtRQUVELE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbEQsVUFBVSxDQUFDLFdBQVcsQ0FDckI7WUFDQyxZQUFZO1lBQ1osSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLGFBQWE7U0FDeEQsRUFDRCxJQUFJLENBQ0osQ0FBQztRQUVGLHlDQUF5QztRQUN6QyxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUU7WUFDdkIsVUFBVSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQztTQUM5QzthQUFNO1lBQ04sVUFBVSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7U0FDeEM7UUFFRCxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEdBQUcsQ0FBQztRQUM3QyxVQUFVLENBQUMsWUFBWSxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBRWpELFVBQVUsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQztRQUUzQyxzRUFBc0U7UUFDdEUsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsT0FBTyxFQUFFO1lBQzNDLElBQUksRUFBRTtnQkFDTCxJQUFJLEVBQUUsVUFBVTthQUNoQjtTQUNELENBQUMsQ0FBQztRQUNILGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3pCLE9BQU8sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUV2QyxnQ0FBZ0M7UUFDaEMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzFDLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNuQixDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7WUFFcEIsaUVBQWlFO1lBQ2pFLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDN0IsaUJBQWlCLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQzFCLE9BQU87YUFDUDtZQUVELElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDekIsZ0VBQWdFO2dCQUNoRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUN6QyxzREFBc0Q7Z0JBQ3RELElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7b0JBQ3JCLHFEQUFxRDtvQkFDckQsSUFBSSxJQUFJLENBQUMsWUFBWSxLQUFLLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUFFO3dCQUNsRCxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7cUJBQzNDO3lCQUFNO3dCQUNOLHdEQUF3RDt3QkFDeEQsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztxQkFDNUI7aUJBQ0Q7YUFDRDtpQkFBTTtnQkFDTiw4Q0FBOEM7Z0JBQzlDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQzthQUN0QjtRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUgscURBQXFEO1FBQ3JELFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNoRCxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDbkIsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3BCLE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7WUFFeEIsdUNBQXVDO1lBQ3ZDLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRTtnQkFDL0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO29CQUNyQixJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUNyQixtREFBbUQ7b0JBQ25ELElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFO3dCQUNqQixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUMxQixDQUFDLENBQUMsQ0FBQztnQkFDSixDQUFDLENBQUMsQ0FBQzthQUNIO1lBRUQsc0NBQXNDO1lBQ3RDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxQixDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDaEMsT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztJQUVPLFlBQVksQ0FBQyxNQUFjO1FBQ2xDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDeEUsTUFBTSxnQkFBZ0IsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRXJELElBQUksQ0FBQyxnQkFBZ0I7WUFBRSxPQUFPO1FBRTlCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDO1FBRTNDLDhDQUE4QztRQUM5QyxNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUM7UUFFL0QsOENBQThDO1FBQzlDLHVEQUF1RDtRQUN2RCxnQkFBZ0I7UUFDaEIsOERBQThEO1FBQzlELCtCQUErQjtRQUMvQixVQUFVO1FBQ1YsZUFBZTtRQUNmLGlCQUFpQjtRQUNqQiw4Q0FBOEM7UUFDOUMsTUFBTTtRQUNOLFdBQVc7UUFDWCxvRUFBb0U7UUFDcEUsSUFBSTtRQUVKLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQ2xCLE9BQU8sRUFBRTtnQkFDUixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7Z0JBQ2YsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFO2dCQUNYLE1BQU0sRUFBRSxPQUFPO2FBQ2Y7WUFDRCxXQUFXLEVBQUUsMEJBQTBCLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDO1NBQzlELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTyxlQUFlO1FBQ3RCLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRTtZQUNuRCxPQUFPO2dCQUNOLEtBQUssRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQztnQkFDbEMsS0FBSyxFQUFFLGNBQWM7Z0JBQ3JCLHFCQUFxQixFQUFFLEVBQUU7YUFDekIsQ0FBQztTQUNGO1FBRUQsT0FBTztZQUNOLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxlQUFlO1lBQzNDLHFCQUFxQixFQUNwQixJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsSUFBSSxFQUFFO1lBQ2pELEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxlQUFlO1NBQzNDLENBQUM7SUFDSCxDQUFDO0lBRUQsNEJBQTRCO0lBQzVCLGNBQWM7O1FBQ2IsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN4RSxNQUFNLGdCQUFnQixHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFckQsSUFBSSxDQUFDLGdCQUFnQjtZQUFFLE9BQU87UUFFOUIsTUFBTSxXQUFXLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEMsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUscUJBQXFCLEVBQUUsR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7UUFFdkUsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FDbEMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUNqRCxDQUFDO1FBRUYsSUFBSSxjQUFjLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUNoQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDdEQsSUFBSSxNQUFNLEVBQUU7Z0JBQ1gsTUFBQSxNQUFBLE1BQU0sYUFBTixNQUFNLHVCQUFOLE1BQU0sQ0FBRSxNQUFNLDBDQUFFLEVBQUUsMENBQUUsUUFBUSxDQUFDO29CQUM1QixTQUFTLEVBQUUsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztpQkFDMUQsQ0FBQyxDQUFDO2FBQ0g7WUFDRCx1RkFBdUY7WUFDdkYsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQ25DLGdDQUFnQyxDQUNoQyxDQUFDO1lBQ0YsT0FBTztTQUNQO1FBRUQsSUFBSSxpQkFBaUIsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUUzQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMvQyxNQUFNLEtBQUssR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDaEMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssV0FBVyxFQUFFO2dCQUNqQyxpQkFBaUIsR0FBRyxDQUFDLENBQUM7Z0JBQ3RCLE1BQU07YUFDTjtTQUNEO1FBRUQsSUFBSSxpQkFBaUIsS0FBSyxDQUFDLENBQUMsRUFBRTtZQUM3QixpQkFBaUIsR0FBRyxDQUFDLENBQUM7U0FDdEI7UUFFRCx1QkFBdUI7UUFDdkIsTUFBTSxjQUFjLEdBQUcsQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLENBQUMsR0FBRyxjQUFjLENBQUMsTUFBTSxDQUFDO1FBQ3ZFLE1BQU0sU0FBUyxHQUFHLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNqRCxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksR0FBRyxDQUFDO1FBRXpDLGVBQWU7UUFDZixNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUM7UUFFL0QsOENBQThDO1FBQzlDLHVEQUF1RDtRQUN2RCxnQkFBZ0I7UUFDaEIsOERBQThEO1FBQzlELCtCQUErQjtRQUMvQixVQUFVO1FBQ1YsZUFBZTtRQUNmLGlCQUFpQjtRQUNqQiw4Q0FBOEM7UUFDOUMsTUFBTTtRQUNOLFdBQVc7UUFDWCxvRUFBb0U7UUFDcEUsSUFBSTtRQUVKLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQ2xCLE9BQU8sRUFBRTtnQkFDUixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7Z0JBQ2YsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFO2dCQUNYLE1BQU0sRUFBRSxPQUFPO2FBQ2Y7WUFDRCxXQUFXLEVBQUUsMEJBQTBCLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDO1lBQzlELFNBQVMsRUFBRSxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQzFELENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRDtBQUVELE1BQU0sVUFBVSwyQkFBMkIsQ0FDMUMsR0FBUSxFQUNSLE1BQTZCO0lBRTdCLE1BQU0seUJBQXlCO1FBOEY5QixZQUFZLElBQWdCO1lBNUY1QixnQkFBVyxHQUFrQixVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ3JDLGVBQVUsR0FBVyxDQUFDLENBQUM7WUFDZCxvQkFBZSxHQUFXLEVBQUUsQ0FBQztZQUM3QixVQUFLLEdBQUcsSUFBSSxjQUFjLENBQUM7Z0JBQzNDLE1BQU0sRUFBRSx3Q0FBd0M7Z0JBQ2hELFFBQVEsRUFBRSxDQUNULEdBQUcsRUFDSCxJQUFZLEVBQ1osRUFBVSxFQUNWLEtBQXNCLEVBQ3RCLElBQWdCLEVBQ2YsRUFBRTtvQkFDSCxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxFQUFFO3dCQUN2QyxPQUFPO3FCQUNQO29CQUVELE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDdEIsTUFBTSxlQUFlLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNqQyxNQUFNLFVBQVUsR0FBRyxlQUFlLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQzFDLE1BQU0saUJBQWlCLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNuQyxNQUFNLFFBQVEsR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDMUMsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQ3JELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDO29CQUM5QyxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQztvQkFDOUMsTUFBTSxxQkFBcUIsR0FDMUIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsSUFBSSxFQUFFLENBQUM7b0JBQzdDLE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQ2xDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FDakQsQ0FBQztvQkFFRixJQUNDLGNBQWMsQ0FBQyxNQUFNLEtBQUssQ0FBQzt3QkFDM0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLHFCQUFxQjt3QkFFdEMsT0FBTztvQkFFUixJQUFJLFlBQVksR0FDZixNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLElBQUksQ0FBQzt3QkFDekQsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUVuQix1RUFBdUU7b0JBQ3ZFLElBQ0MsQ0FBQyxhQUFhO3dCQUNkLE1BQU0sQ0FBQyxRQUFRLENBQUMsMEJBQTBCLEVBQ3pDO3dCQUNELDJEQUEyRDt3QkFDM0QsTUFBTSxhQUFhLEdBQ2xCLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLGVBQWUsQ0FBQyxNQUFNLENBQUM7d0JBQ2pELE1BQU0sV0FBVyxHQUFHLGFBQWEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO3dCQUVwRCxHQUFHLENBQ0YsYUFBYSxFQUNiLFdBQVcsRUFDWCxVQUFVLENBQUMsT0FBTyxDQUFDOzRCQUNsQixNQUFNLEVBQUUsSUFBSSxnQkFBZ0IsQ0FDM0IsR0FBRyxFQUNILE1BQU0sRUFDTixJQUFJLEVBQ0osYUFBYSxFQUNiLFdBQVcsRUFDWCxZQUFZLEVBQ1osVUFBVSxDQUNWO3lCQUNELENBQUMsQ0FDRixDQUFDO3FCQUNGO3lCQUFNO3dCQUNOLGtFQUFrRTt3QkFDbEUsR0FBRyxDQUNGLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUN0QixJQUFJOzRCQUNILEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNOzRCQUNmLGVBQWUsQ0FBQyxNQUFNOzRCQUN0QixRQUFRLENBQUMsTUFBTSxFQUNoQixVQUFVLENBQUMsT0FBTyxDQUFDOzRCQUNsQixNQUFNLEVBQUUsSUFBSSxnQkFBZ0IsQ0FDM0IsR0FBRyxFQUNILE1BQU0sRUFDTixJQUFJLEVBQ0osSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQ3RCLElBQUk7Z0NBQ0gsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07Z0NBQ2YsZUFBZSxDQUFDLE1BQU07Z0NBQ3RCLFFBQVEsQ0FBQyxNQUFNLEVBQ2hCLFlBQVksRUFDWixVQUFVLENBQ1Y7eUJBQ0QsQ0FBQyxDQUNGLENBQUM7cUJBQ0Y7Z0JBQ0YsQ0FBQzthQUNELENBQUMsQ0FBQztZQUdGLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1lBQ2pCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM5QixDQUFDO1FBRUQsTUFBTSxDQUFDLE1BQWtCO1lBQ3hCLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUN2QixJQUNDLE1BQU0sQ0FBQyxVQUFVO2dCQUNqQixNQUFNLENBQUMsZUFBZTtnQkFDdEIsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsZUFBZTtvQkFDNUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxFQUNwQjtnQkFDRCxJQUFJLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQztnQkFDdEIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7YUFDNUM7UUFDRixDQUFDO1FBRUQsT0FBTztZQUNOLElBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQztRQUNwQyxDQUFDO1FBRUQsaUJBQWlCLENBQUMsSUFBZ0IsRUFBRSxNQUFtQjtZQUN0RCxJQUNDLENBQUMsTUFBTTtnQkFDUCxNQUFNLENBQUMsVUFBVTtnQkFDakIsTUFBTSxDQUFDLFlBQVk7Z0JBQ25CLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxLQUFLLENBQUMsRUFDMUI7Z0JBQ0QsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUMvQztpQkFBTTtnQkFDTixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUN2QyxNQUFNLEVBQ04sSUFBSSxDQUFDLFdBQVcsQ0FDaEIsQ0FBQzthQUNGO1FBQ0YsQ0FBQztRQUVELGFBQWEsQ0FBQyxLQUEwQjtZQUN2QyxPQUFPLEtBQUssQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBRUQsWUFBWSxDQUNYLElBQWdCLEVBQ2hCLGNBQXNCLEVBQ3RCLFlBQW9CO1lBRXBCLE1BQU0sVUFBVSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsWUFBWSxDQUNyRCxjQUFjLEdBQUcsQ0FBQyxDQUNsQixDQUFDO1lBQ0YsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztZQUUzRCxJQUFJLFNBQVMsRUFBRTtnQkFDZCxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNuQyxJQUNDLEtBQUssQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDO29CQUMvQixLQUFLLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLEVBQ2hDO29CQUNELE9BQU8sS0FBSyxDQUFDO2lCQUNiO2FBQ0Q7WUFFRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQztZQUV2QyxNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUMzQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLGNBQWMsSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLFlBQVksQ0FBQyxDQUFDO1lBQzVELENBQUMsQ0FBQyxDQUFDO1lBRUgsT0FBTyxDQUNOLENBQUMsT0FBTztnQkFDUixDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztvQkFDOUIsTUFBTSxDQUFDLFFBQVEsQ0FBQywwQkFBMEIsQ0FBQyxDQUM1QyxDQUFDO1FBQ0gsQ0FBQztLQUNEO0lBRUQsTUFBTSx3QkFBd0IsR0FBMEM7UUFDdkUsV0FBVyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDdkIsT0FBTyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQztnQkFDaEMsTUFBTSxFQUFFLENBQ1AsU0FBaUIsRUFDakIsT0FBZSxFQUNmLElBQWdCLEVBQ2YsRUFBRTs7b0JBQ0gsTUFBTSxNQUFNLEdBQUcsTUFBQSxJQUFJLENBQUMsSUFBSSwwQ0FBRSxNQUFNLENBQUM7b0JBQ2pDLElBQUssTUFBYyxDQUFDLEtBQUssRUFBRTt3QkFDMUIsT0FBTyxLQUFLLENBQUM7cUJBQ2I7b0JBRUQsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDO29CQUU5QyxLQUFLLE1BQU0sS0FBSyxJQUFJLFNBQVMsQ0FBQyxNQUFNLEVBQUU7d0JBQ3JDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksU0FBUyxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLEVBQUU7NEJBQ3RELE9BQU8sS0FBSyxDQUFDO3lCQUNiO3FCQUNEO29CQUVELE9BQU8sSUFBSSxDQUFDO2dCQUNiLENBQUM7YUFDRCxDQUFDLENBQUM7UUFDSixDQUFDO0tBQ0QsQ0FBQztJQUVGLE9BQU8sVUFBVSxDQUFDLFNBQVMsQ0FDMUIseUJBQXlCLEVBQ3pCLHdCQUF3QixDQUN4QixDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XHJcblx0RWRpdG9yVmlldyxcclxuXHRWaWV3UGx1Z2luLFxyXG5cdFZpZXdVcGRhdGUsXHJcblx0RGVjb3JhdGlvbixcclxuXHREZWNvcmF0aW9uU2V0LFxyXG5cdFdpZGdldFR5cGUsXHJcblx0TWF0Y2hEZWNvcmF0b3IsXHJcblx0UGx1Z2luVmFsdWUsXHJcblx0UGx1Z2luU3BlYyxcclxufSBmcm9tIFwiQGNvZGVtaXJyb3Ivdmlld1wiO1xyXG5pbXBvcnQge1xyXG5cdEFwcCxcclxuXHRlZGl0b3JJbmZvRmllbGQsXHJcblx0ZWRpdG9yTGl2ZVByZXZpZXdGaWVsZCxcclxuXHRLZXltYXAsXHJcblx0TWVudSxcclxufSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5pbXBvcnQgeyBBbm5vdGF0aW9uLCBFZGl0b3JTZWxlY3Rpb24gfSBmcm9tIFwiQGNvZGVtaXJyb3Ivc3RhdGVcIjtcclxuLy8gQHRzLWlnbm9yZSAtIFRoaXMgaW1wb3J0IGlzIG5lY2Vzc2FyeSBidXQgVHlwZVNjcmlwdCBjYW4ndCBmaW5kIGl0XHJcbmltcG9ydCB7IHN5bnRheFRyZWUsIHRva2VuQ2xhc3NOb2RlUHJvcCB9IGZyb20gXCJAY29kZW1pcnJvci9sYW5ndWFnZVwiO1xyXG5pbXBvcnQgeyBnZXRUYXNrc0FQSSB9IGZyb20gXCJAL3V0aWxzXCI7XHJcblxyXG5leHBvcnQgdHlwZSBUYXNrU3RhdGUgPSBzdHJpbmc7XHJcbmV4cG9ydCBjb25zdCB0YXNrU3RhdHVzQ2hhbmdlQW5ub3RhdGlvbiA9IEFubm90YXRpb24uZGVmaW5lKCk7XHJcblxyXG5leHBvcnQgY29uc3QgU1RBVEVfTUFSS19NQVA6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XHJcblx0VE9ETzogXCIgXCIsXHJcblx0RE9JTkc6IFwiLVwiLFxyXG5cdFwiSU4tUFJPR1JFU1NcIjogXCI+XCIsXHJcblx0RE9ORTogXCJ4XCIsXHJcbn07XHJcblxyXG5jbGFzcyBUYXNrU3RhdHVzV2lkZ2V0IGV4dGVuZHMgV2lkZ2V0VHlwZSB7XHJcblx0cHJpdmF0ZSBjeWNsZTogc3RyaW5nW10gPSBbXTtcclxuXHRwcml2YXRlIG1hcmtzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XHJcblx0cHJpdmF0ZSBpc0xpdmVQcmV2aWV3OiBib29sZWFuO1xyXG5cdHByaXZhdGUgYnVsbGV0VGV4dDogc3RyaW5nO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHJlYWRvbmx5IGFwcDogQXBwLFxyXG5cdFx0cmVhZG9ubHkgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRyZWFkb25seSB2aWV3OiBFZGl0b3JWaWV3LFxyXG5cdFx0cmVhZG9ubHkgZnJvbTogbnVtYmVyLFxyXG5cdFx0cmVhZG9ubHkgdG86IG51bWJlcixcclxuXHRcdHJlYWRvbmx5IGN1cnJlbnRTdGF0ZTogVGFza1N0YXRlLFxyXG5cdFx0cmVhZG9ubHkgbGlzdFByZWZpeDogc3RyaW5nXHJcblx0KSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0Y29uc3QgY29uZmlnID0gdGhpcy5nZXRTdGF0dXNDb25maWcoKTtcclxuXHRcdHRoaXMuY3ljbGUgPSBjb25maWcuY3ljbGU7XHJcblx0XHR0aGlzLm1hcmtzID0gY29uZmlnLm1hcmtzO1xyXG5cdFx0dGhpcy5pc0xpdmVQcmV2aWV3ID0gdmlldy5zdGF0ZS5maWVsZChlZGl0b3JMaXZlUHJldmlld0ZpZWxkKTtcclxuXHRcdHRoaXMuYnVsbGV0VGV4dCA9IGxpc3RQcmVmaXgudHJpbSgpO1xyXG5cdH1cclxuXHJcblx0ZXEob3RoZXI6IFRhc2tTdGF0dXNXaWRnZXQpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiAoXHJcblx0XHRcdHRoaXMuZnJvbSA9PT0gb3RoZXIuZnJvbSAmJlxyXG5cdFx0XHR0aGlzLnRvID09PSBvdGhlci50byAmJlxyXG5cdFx0XHR0aGlzLmN1cnJlbnRTdGF0ZSA9PT0gb3RoZXIuY3VycmVudFN0YXRlICYmXHJcblx0XHRcdHRoaXMuYnVsbGV0VGV4dCA9PT0gb3RoZXIuYnVsbGV0VGV4dFxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdHRvRE9NKCk6IEhUTUxFbGVtZW50IHtcclxuXHRcdGNvbnN0IHsgY3ljbGUsIG1hcmtzLCBleGNsdWRlTWFya3NGcm9tQ3ljbGUgfSA9IHRoaXMuZ2V0U3RhdHVzQ29uZmlnKCk7XHJcblx0XHRsZXQgbmV4dFN0YXRlID0gdGhpcy5jdXJyZW50U3RhdGU7XHJcblxyXG5cdFx0Y29uc3QgcmVtYWluaW5nQ3ljbGUgPSBjeWNsZS5maWx0ZXIoXHJcblx0XHRcdChzdGF0ZSkgPT4gIWV4Y2x1ZGVNYXJrc0Zyb21DeWNsZS5pbmNsdWRlcyhzdGF0ZSlcclxuXHRcdCk7XHJcblxyXG5cdFx0aWYgKHJlbWFpbmluZ0N5Y2xlLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0Y29uc3QgY3VycmVudEluZGV4ID0gcmVtYWluaW5nQ3ljbGUuaW5kZXhPZih0aGlzLmN1cnJlbnRTdGF0ZSk7XHJcblx0XHRcdGNvbnN0IG5leHRJbmRleCA9IChjdXJyZW50SW5kZXggKyAxKSAlIHJlbWFpbmluZ0N5Y2xlLmxlbmd0aDtcclxuXHRcdFx0bmV4dFN0YXRlID0gcmVtYWluaW5nQ3ljbGVbbmV4dEluZGV4XTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCB3cmFwcGVyID0gY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdFx0Y2xzOiBcInRhc2stc3RhdHVzLXdpZGdldFwiLFxyXG5cdFx0XHRhdHRyOiB7XHJcblx0XHRcdFx0XCJhcmlhLWxhYmVsXCI6IFwiTmV4dCBzdGF0dXM6IFwiICsgbmV4dFN0YXRlLFxyXG5cdFx0XHR9LFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gT25seSBhZGQgdGhlIGJ1bGxldCBwb2ludCBpbiBMaXZlIFByZXZpZXcgbW9kZVxyXG5cdFx0aWYgKHRoaXMuaXNMaXZlUHJldmlldykge1xyXG5cdFx0XHRjb25zdCBpc051bWJlcmVkTGlzdCA9IC9eXFxkK1suKV0kLy50ZXN0KHRoaXMuYnVsbGV0VGV4dCk7XHJcblxyXG5cdFx0XHR3cmFwcGVyLmNyZWF0ZUVsKFxyXG5cdFx0XHRcdFwic3BhblwiLFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGNsczogaXNOdW1iZXJlZExpc3RcclxuXHRcdFx0XHRcdFx0PyBcImNtLWZvcm1hdHRpbmcgY20tZm9ybWF0dGluZy1saXN0IGNtLWZvcm1hdHRpbmctbGlzdC1vbFwiXHJcblx0XHRcdFx0XHRcdDogXCJjbS1mb3JtYXR0aW5nIGNtLWZvcm1hdHRpbmctbGlzdCBjbS1mb3JtYXR0aW5nLWxpc3QtdWxcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdChlbCkgPT4ge1xyXG5cdFx0XHRcdFx0ZWwuY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdFx0XHRcdFx0Y2xzOiBpc051bWJlcmVkTGlzdCA/IFwibGlzdC1udW1iZXJcIiA6IFwibGlzdC1idWxsZXRcIixcclxuXHRcdFx0XHRcdFx0dGV4dDogdGhpcy5idWxsZXRUZXh0LFxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHN0YXR1c1RleHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3BhblwiKTtcclxuXHRcdHN0YXR1c1RleHQudG9nZ2xlQ2xhc3MoXHJcblx0XHRcdFtcclxuXHRcdFx0XHRcInRhc2stc3RhdGVcIixcclxuXHRcdFx0XHR0aGlzLmlzTGl2ZVByZXZpZXcgPyBcImxpdmUtcHJldmlldy1tb2RlXCIgOiBcInNvdXJjZS1tb2RlXCIsXHJcblx0XHRcdF0sXHJcblx0XHRcdHRydWVcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gQWRkIGEgc3BlY2lmaWMgY2xhc3MgYmFzZWQgb24gdGhlIG1vZGVcclxuXHRcdGlmICh0aGlzLmlzTGl2ZVByZXZpZXcpIHtcclxuXHRcdFx0c3RhdHVzVGV4dC5jbGFzc0xpc3QuYWRkKFwibGl2ZS1wcmV2aWV3LW1vZGVcIik7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRzdGF0dXNUZXh0LmNsYXNzTGlzdC5hZGQoXCJzb3VyY2UtbW9kZVwiKTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBtYXJrID0gbWFya3NbdGhpcy5jdXJyZW50U3RhdGVdIHx8IFwiIFwiO1xyXG5cdFx0c3RhdHVzVGV4dC5zZXRBdHRyaWJ1dGUoXCJkYXRhLXRhc2stc3RhdGVcIiwgbWFyayk7XHJcblxyXG5cdFx0c3RhdHVzVGV4dC50ZXh0Q29udGVudCA9IHRoaXMuY3VycmVudFN0YXRlO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBpbnZpc2libGUgY2hlY2tib3ggZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBleGlzdGluZyBiZWhhdmlvcnNcclxuXHRcdGNvbnN0IGludmlzaWJsZUNoZWNrYm94ID0gY3JlYXRlRWwoXCJpbnB1dFwiLCB7XHJcblx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHR0eXBlOiBcImNoZWNrYm94XCIsXHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHRcdGludmlzaWJsZUNoZWNrYm94LmhpZGUoKTtcclxuXHRcdHdyYXBwZXIuYXBwZW5kQ2hpbGQoaW52aXNpYmxlQ2hlY2tib3gpO1xyXG5cclxuXHRcdC8vIENsaWNrIHRvIGN5Y2xlIHRocm91Z2ggc3RhdGVzXHJcblx0XHRzdGF0dXNUZXh0LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoZSkgPT4ge1xyXG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblxyXG5cdFx0XHQvLyBUcmlnZ2VyIHRoZSBpbnZpc2libGUgY2hlY2tib3ggY2xpY2sgdG8gbWFpbnRhaW4gY29tcGF0aWJpbGl0eVxyXG5cdFx0XHRpZiAoZ2V0VGFza3NBUEkodGhpcy5wbHVnaW4pKSB7XHJcblx0XHRcdFx0aW52aXNpYmxlQ2hlY2tib3guY2xpY2soKTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChLZXltYXAuaXNNb2RFdmVudChlKSkge1xyXG5cdFx0XHRcdC8vIFdoZW4gbW9kaWZpZXIga2V5IGlzIHByZXNzZWQsIGp1bXAgdG8gdGhlIGZpcnN0IG9yIGxhc3Qgc3RhdGVcclxuXHRcdFx0XHRjb25zdCB7IGN5Y2xlIH0gPSB0aGlzLmdldFN0YXR1c0NvbmZpZygpO1xyXG5cdFx0XHRcdC8vIEp1c3QgdXNlIHdoYXRldmVyIHN0YXRlcyBhcmUgYXZhaWxhYmxlIGluIHRoZSBjeWNsZVxyXG5cdFx0XHRcdGlmIChjeWNsZS5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0XHQvLyBKdW1wIHRvIHRoZSBsYXN0IHN0YXRlIChET05FKSBpZiBub3QgYWxyZWFkeSB0aGVyZVxyXG5cdFx0XHRcdFx0aWYgKHRoaXMuY3VycmVudFN0YXRlICE9PSBjeWNsZVtjeWNsZS5sZW5ndGggLSAxXSkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnNldFRhc2tTdGF0ZShjeWNsZVtjeWNsZS5sZW5ndGggLSAxXSk7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHQvLyBJZiBhbHJlYWR5IGF0IHRoZSBsYXN0IHN0YXRlLCBqdW1wIHRvIHRoZSBmaXJzdCBzdGF0ZVxyXG5cdFx0XHRcdFx0XHR0aGlzLnNldFRhc2tTdGF0ZShjeWNsZVswXSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIE5vcm1hbCBjbGljayBiZWhhdmlvciAtIGN5Y2xlIHRvIG5leHQgc3RhdGVcclxuXHRcdFx0XHR0aGlzLmN5Y2xlVGFza1N0YXRlKCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFJpZ2h0LWNsaWNrIHRvIHNob3cgbWVudSB3aXRoIGFsbCBhdmFpbGFibGUgc3RhdGVzXHJcblx0XHRzdGF0dXNUZXh0LmFkZEV2ZW50TGlzdGVuZXIoXCJjb250ZXh0bWVudVwiLCAoZSkgPT4ge1xyXG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblx0XHRcdGNvbnN0IG1lbnUgPSBuZXcgTWVudSgpO1xyXG5cclxuXHRcdFx0Ly8gQWRkIGVhY2ggYXZhaWxhYmxlIHN0YXRlIHRvIHRoZSBtZW51XHJcblx0XHRcdGZvciAoY29uc3Qgc3RhdGUgb2YgdGhpcy5jeWNsZSkge1xyXG5cdFx0XHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRcdFx0aXRlbS5zZXRUaXRsZShzdGF0ZSk7XHJcblx0XHRcdFx0XHQvLyBXaGVuIGNsaWNrZWQsIGRpcmVjdGx5IHNldCB0byB0aGUgc2VsZWN0ZWQgc3RhdGVcclxuXHRcdFx0XHRcdGl0ZW0ub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMuc2V0VGFza1N0YXRlKHN0YXRlKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBTaG93IHRoZSBtZW51IGF0IHRoZSBtb3VzZSBwb3NpdGlvblxyXG5cdFx0XHRtZW51LnNob3dBdE1vdXNlRXZlbnQoZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR3cmFwcGVyLmFwcGVuZENoaWxkKHN0YXR1c1RleHQpO1xyXG5cdFx0cmV0dXJuIHdyYXBwZXI7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHNldFRhc2tTdGF0ZShzdGF0dXM6IHN0cmluZykge1xyXG5cdFx0Y29uc3QgY3VycmVudFRleHQgPSB0aGlzLnZpZXcuc3RhdGUuZG9jLnNsaWNlU3RyaW5nKHRoaXMuZnJvbSwgdGhpcy50byk7XHJcblx0XHRjb25zdCBjdXJyZW50TWFya01hdGNoID0gY3VycmVudFRleHQubWF0Y2goL1xcWyguKV0vKTtcclxuXHJcblx0XHRpZiAoIWN1cnJlbnRNYXJrTWF0Y2gpIHJldHVybjtcclxuXHJcblx0XHRjb25zdCBuZXh0TWFyayA9IHRoaXMubWFya3Nbc3RhdHVzXSB8fCBcIiBcIjtcclxuXHJcblx0XHQvLyBSZXBsYWNlIHRleHQgd2l0aCB0aGUgc2VsZWN0ZWQgc3RhdGUncyBtYXJrXHJcblx0XHRjb25zdCBuZXdUZXh0ID0gY3VycmVudFRleHQucmVwbGFjZSgvXFxbKC4pXS8sIGBbJHtuZXh0TWFya31dYCk7XHJcblxyXG5cdFx0Ly8gaWYgKG5leHRNYXJrID09PSBcInhcIiB8fCBuZXh0TWFyayA9PT0gXCJYXCIpIHtcclxuXHRcdC8vIFx0Y29uc3QgbGluZSA9IHRoaXMudmlldy5zdGF0ZS5kb2MubGluZUF0KHRoaXMuZnJvbSk7XHJcblx0XHQvLyBcdGNvbnN0IHBhdGggPVxyXG5cdFx0Ly8gXHRcdHRoaXMudmlldy5zdGF0ZS5maWVsZChlZGl0b3JJbmZvRmllbGQpPy5maWxlPy5wYXRoIHx8IFwiXCI7XHJcblx0XHQvLyBcdGNvbnN0IHRhc2sgPSBwYXJzZVRhc2tMaW5lKFxyXG5cdFx0Ly8gXHRcdHBhdGgsXHJcblx0XHQvLyBcdFx0bGluZS50ZXh0LFxyXG5cdFx0Ly8gXHRcdGxpbmUubnVtYmVyLFxyXG5cdFx0Ly8gXHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnByZWZlck1ldGFkYXRhRm9ybWF0XHJcblx0XHQvLyBcdCk7XHJcblx0XHQvLyBcdHRhc2sgJiZcclxuXHRcdC8vIFx0XHR0aGlzLmFwcC53b3Jrc3BhY2UudHJpZ2dlcihcInRhc2stZ2VuaXVzOnRhc2stY29tcGxldGVkXCIsIHRhc2spO1xyXG5cdFx0Ly8gfVxyXG5cclxuXHRcdHRoaXMudmlldy5kaXNwYXRjaCh7XHJcblx0XHRcdGNoYW5nZXM6IHtcclxuXHRcdFx0XHRmcm9tOiB0aGlzLmZyb20sXHJcblx0XHRcdFx0dG86IHRoaXMudG8sXHJcblx0XHRcdFx0aW5zZXJ0OiBuZXdUZXh0LFxyXG5cdFx0XHR9LFxyXG5cdFx0XHRhbm5vdGF0aW9uczogdGFza1N0YXR1c0NoYW5nZUFubm90YXRpb24ub2YoXCJ0YXNrU3RhdHVzQ2hhbmdlXCIpLFxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldFN0YXR1c0NvbmZpZygpIHtcclxuXHRcdGlmICghdGhpcy5wbHVnaW4uc2V0dGluZ3MuZW5hYmxlVGFza1N0YXR1c1N3aXRjaGVyKSB7XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0Y3ljbGU6IE9iamVjdC5rZXlzKFNUQVRFX01BUktfTUFQKSxcclxuXHRcdFx0XHRtYXJrczogU1RBVEVfTUFSS19NQVAsXHJcblx0XHRcdFx0ZXhjbHVkZU1hcmtzRnJvbUN5Y2xlOiBbXSxcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRjeWNsZTogdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c0N5Y2xlLFxyXG5cdFx0XHRleGNsdWRlTWFya3NGcm9tQ3ljbGU6XHJcblx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXhjbHVkZU1hcmtzRnJvbUN5Y2xlIHx8IFtdLFxyXG5cdFx0XHRtYXJrczogdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c01hcmtzLFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8vIEN5Y2xlIHRocm91Z2ggdGFzayBzdGF0ZXNcclxuXHRjeWNsZVRhc2tTdGF0ZSgpIHtcclxuXHRcdGNvbnN0IGN1cnJlbnRUZXh0ID0gdGhpcy52aWV3LnN0YXRlLmRvYy5zbGljZVN0cmluZyh0aGlzLmZyb20sIHRoaXMudG8pO1xyXG5cdFx0Y29uc3QgY3VycmVudE1hcmtNYXRjaCA9IGN1cnJlbnRUZXh0Lm1hdGNoKC9cXFsoLildLyk7XHJcblxyXG5cdFx0aWYgKCFjdXJyZW50TWFya01hdGNoKSByZXR1cm47XHJcblxyXG5cdFx0Y29uc3QgY3VycmVudE1hcmsgPSBjdXJyZW50TWFya01hdGNoWzFdO1xyXG5cdFx0Y29uc3QgeyBjeWNsZSwgbWFya3MsIGV4Y2x1ZGVNYXJrc0Zyb21DeWNsZSB9ID0gdGhpcy5nZXRTdGF0dXNDb25maWcoKTtcclxuXHJcblx0XHRjb25zdCByZW1haW5pbmdDeWNsZSA9IGN5Y2xlLmZpbHRlcihcclxuXHRcdFx0KHN0YXRlKSA9PiAhZXhjbHVkZU1hcmtzRnJvbUN5Y2xlLmluY2x1ZGVzKHN0YXRlKVxyXG5cdFx0KTtcclxuXHJcblx0XHRpZiAocmVtYWluaW5nQ3ljbGUubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdGNvbnN0IGVkaXRvciA9IHRoaXMudmlldy5zdGF0ZS5maWVsZChlZGl0b3JJbmZvRmllbGQpO1xyXG5cdFx0XHRpZiAoZWRpdG9yKSB7XHJcblx0XHRcdFx0ZWRpdG9yPy5lZGl0b3I/LmNtPy5kaXNwYXRjaCh7XHJcblx0XHRcdFx0XHRzZWxlY3Rpb246IEVkaXRvclNlbGVjdGlvbi5yYW5nZSh0aGlzLnRvICsgMSwgdGhpcy50byArIDEpLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdC8vIElmIG5vIGN5Y2xlIGlzIGF2YWlsYWJsZSwgdHJpZ2dlciB0aGUgZGVmYXVsdCBlZGl0b3I6dG9nZ2xlLWNoZWNrbGlzdC1zdGF0dXMgY29tbWFuZFxyXG5cdFx0XHR0aGlzLmFwcC5jb21tYW5kcy5leGVjdXRlQ29tbWFuZEJ5SWQoXHJcblx0XHRcdFx0XCJlZGl0b3I6dG9nZ2xlLWNoZWNrbGlzdC1zdGF0dXNcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0bGV0IGN1cnJlbnRTdGF0ZUluZGV4ID0gLTE7XHJcblxyXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCByZW1haW5pbmdDeWNsZS5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRjb25zdCBzdGF0ZSA9IHJlbWFpbmluZ0N5Y2xlW2ldO1xyXG5cdFx0XHRpZiAobWFya3Nbc3RhdGVdID09PSBjdXJyZW50TWFyaykge1xyXG5cdFx0XHRcdGN1cnJlbnRTdGF0ZUluZGV4ID0gaTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChjdXJyZW50U3RhdGVJbmRleCA9PT0gLTEpIHtcclxuXHRcdFx0Y3VycmVudFN0YXRlSW5kZXggPSAwO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENhbGN1bGF0ZSBuZXh0IHN0YXRlXHJcblx0XHRjb25zdCBuZXh0U3RhdGVJbmRleCA9IChjdXJyZW50U3RhdGVJbmRleCArIDEpICUgcmVtYWluaW5nQ3ljbGUubGVuZ3RoO1xyXG5cdFx0Y29uc3QgbmV4dFN0YXRlID0gcmVtYWluaW5nQ3ljbGVbbmV4dFN0YXRlSW5kZXhdO1xyXG5cdFx0Y29uc3QgbmV4dE1hcmsgPSBtYXJrc1tuZXh0U3RhdGVdIHx8IFwiIFwiO1xyXG5cclxuXHRcdC8vIFJlcGxhY2UgdGV4dFxyXG5cdFx0Y29uc3QgbmV3VGV4dCA9IGN1cnJlbnRUZXh0LnJlcGxhY2UoL1xcWyguKV0vLCBgWyR7bmV4dE1hcmt9XWApO1xyXG5cclxuXHRcdC8vIGlmIChuZXh0TWFyayA9PT0gXCJ4XCIgfHwgbmV4dE1hcmsgPT09IFwiWFwiKSB7XHJcblx0XHQvLyBcdGNvbnN0IGxpbmUgPSB0aGlzLnZpZXcuc3RhdGUuZG9jLmxpbmVBdCh0aGlzLmZyb20pO1xyXG5cdFx0Ly8gXHRjb25zdCBwYXRoID1cclxuXHRcdC8vIFx0XHR0aGlzLnZpZXcuc3RhdGUuZmllbGQoZWRpdG9ySW5mb0ZpZWxkKT8uZmlsZT8ucGF0aCB8fCBcIlwiO1xyXG5cdFx0Ly8gXHRjb25zdCB0YXNrID0gcGFyc2VUYXNrTGluZShcclxuXHRcdC8vIFx0XHRwYXRoLFxyXG5cdFx0Ly8gXHRcdGxpbmUudGV4dCxcclxuXHRcdC8vIFx0XHRsaW5lLm51bWJlcixcclxuXHRcdC8vIFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcmVmZXJNZXRhZGF0YUZvcm1hdFxyXG5cdFx0Ly8gXHQpO1xyXG5cdFx0Ly8gXHR0YXNrICYmXHJcblx0XHQvLyBcdFx0dGhpcy5hcHAud29ya3NwYWNlLnRyaWdnZXIoXCJ0YXNrLWdlbml1czp0YXNrLWNvbXBsZXRlZFwiLCB0YXNrKTtcclxuXHRcdC8vIH1cclxuXHJcblx0XHR0aGlzLnZpZXcuZGlzcGF0Y2goe1xyXG5cdFx0XHRjaGFuZ2VzOiB7XHJcblx0XHRcdFx0ZnJvbTogdGhpcy5mcm9tLFxyXG5cdFx0XHRcdHRvOiB0aGlzLnRvLFxyXG5cdFx0XHRcdGluc2VydDogbmV3VGV4dCxcclxuXHRcdFx0fSxcclxuXHRcdFx0YW5ub3RhdGlvbnM6IHRhc2tTdGF0dXNDaGFuZ2VBbm5vdGF0aW9uLm9mKFwidGFza1N0YXR1c0NoYW5nZVwiKSxcclxuXHRcdFx0c2VsZWN0aW9uOiBFZGl0b3JTZWxlY3Rpb24ucmFuZ2UodGhpcy50byArIDEsIHRoaXMudG8gKyAxKSxcclxuXHRcdH0pO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHRhc2tTdGF0dXNTd2l0Y2hlckV4dGVuc2lvbihcclxuXHRhcHA6IEFwcCxcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpblxyXG4pIHtcclxuXHRjbGFzcyBUYXNrU3RhdHVzVmlld1BsdWdpblZhbHVlIGltcGxlbWVudHMgUGx1Z2luVmFsdWUge1xyXG5cdFx0cHVibGljIHJlYWRvbmx5IHZpZXc6IEVkaXRvclZpZXc7XHJcblx0XHRkZWNvcmF0aW9uczogRGVjb3JhdGlvblNldCA9IERlY29yYXRpb24ubm9uZTtcclxuXHRcdHByaXZhdGUgbGFzdFVwZGF0ZTogbnVtYmVyID0gMDtcclxuXHRcdHByaXZhdGUgcmVhZG9ubHkgdXBkYXRlVGhyZXNob2xkOiBudW1iZXIgPSA1MDtcclxuXHRcdHByaXZhdGUgcmVhZG9ubHkgbWF0Y2ggPSBuZXcgTWF0Y2hEZWNvcmF0b3Ioe1xyXG5cdFx0XHRyZWdleHA6IC9eKFxccyopKCg/OlstKitdfFxcZCtbLildKVxccykoXFxbKC4pXVxccykvZyxcclxuXHRcdFx0ZGVjb3JhdGU6IChcclxuXHRcdFx0XHRhZGQsXHJcblx0XHRcdFx0ZnJvbTogbnVtYmVyLFxyXG5cdFx0XHRcdHRvOiBudW1iZXIsXHJcblx0XHRcdFx0bWF0Y2g6IFJlZ0V4cEV4ZWNBcnJheSxcclxuXHRcdFx0XHR2aWV3OiBFZGl0b3JWaWV3XHJcblx0XHRcdCkgPT4ge1xyXG5cdFx0XHRcdGlmICghdGhpcy5zaG91bGRSZW5kZXIodmlldywgZnJvbSwgdG8pKSB7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRjb25zdCBtYXJrID0gbWF0Y2hbNF07XHJcblx0XHRcdFx0Y29uc3QgYnVsbGV0V2l0aFNwYWNlID0gbWF0Y2hbMl07XHJcblx0XHRcdFx0Y29uc3QgYnVsbGV0VGV4dCA9IGJ1bGxldFdpdGhTcGFjZS50cmltKCk7XHJcblx0XHRcdFx0Y29uc3QgY2hlY2tib3hXaXRoU3BhY2UgPSBtYXRjaFszXTtcclxuXHRcdFx0XHRjb25zdCBjaGVja2JveCA9IGNoZWNrYm94V2l0aFNwYWNlLnRyaW0oKTtcclxuXHRcdFx0XHRjb25zdCBpc0xpdmVQcmV2aWV3ID0gdGhpcy5pc0xpdmVQcmV2aWV3KHZpZXcuc3RhdGUpO1xyXG5cdFx0XHRcdGNvbnN0IGN5Y2xlID0gcGx1Z2luLnNldHRpbmdzLnRhc2tTdGF0dXNDeWNsZTtcclxuXHRcdFx0XHRjb25zdCBtYXJrcyA9IHBsdWdpbi5zZXR0aW5ncy50YXNrU3RhdHVzTWFya3M7XHJcblx0XHRcdFx0Y29uc3QgZXhjbHVkZU1hcmtzRnJvbUN5Y2xlID1cclxuXHRcdFx0XHRcdHBsdWdpbi5zZXR0aW5ncy5leGNsdWRlTWFya3NGcm9tQ3ljbGUgfHwgW107XHJcblx0XHRcdFx0Y29uc3QgcmVtYWluaW5nQ3ljbGUgPSBjeWNsZS5maWx0ZXIoXHJcblx0XHRcdFx0XHQoc3RhdGUpID0+ICFleGNsdWRlTWFya3NGcm9tQ3ljbGUuaW5jbHVkZXMoc3RhdGUpXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0cmVtYWluaW5nQ3ljbGUubGVuZ3RoID09PSAwICYmXHJcblx0XHRcdFx0XHQhcGx1Z2luLnNldHRpbmdzLmVuYWJsZUN1c3RvbVRhc2tNYXJrc1xyXG5cdFx0XHRcdClcclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHJcblx0XHRcdFx0bGV0IGN1cnJlbnRTdGF0ZTogVGFza1N0YXRlID1cclxuXHRcdFx0XHRcdE9iamVjdC5rZXlzKG1hcmtzKS5maW5kKChzdGF0ZSkgPT4gbWFya3Nbc3RhdGVdID09PSBtYXJrKSB8fFxyXG5cdFx0XHRcdFx0cmVtYWluaW5nQ3ljbGVbMF07XHJcblxyXG5cdFx0XHRcdC8vIEluIHNvdXJjZSBtb2RlIHdpdGggdGV4dG1hcmsgZW5hYmxlZCwgb25seSByZXBsYWNlIHRoZSBjaGVja2JveCBwYXJ0XHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0IWlzTGl2ZVByZXZpZXcgJiZcclxuXHRcdFx0XHRcdHBsdWdpbi5zZXR0aW5ncy5lbmFibGVUZXh0TWFya0luU291cmNlTW9kZVxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0Ly8gT25seSByZXBsYWNlIHRoZSBjaGVja2JveCBwYXJ0LCBub3QgaW5jbHVkaW5nIHRoZSBidWxsZXRcclxuXHRcdFx0XHRcdGNvbnN0IGNoZWNrYm94U3RhcnQgPVxyXG5cdFx0XHRcdFx0XHRmcm9tICsgbWF0Y2hbMV0ubGVuZ3RoICsgYnVsbGV0V2l0aFNwYWNlLmxlbmd0aDtcclxuXHRcdFx0XHRcdGNvbnN0IGNoZWNrYm94RW5kID0gY2hlY2tib3hTdGFydCArIGNoZWNrYm94Lmxlbmd0aDtcclxuXHJcblx0XHRcdFx0XHRhZGQoXHJcblx0XHRcdFx0XHRcdGNoZWNrYm94U3RhcnQsXHJcblx0XHRcdFx0XHRcdGNoZWNrYm94RW5kLFxyXG5cdFx0XHRcdFx0XHREZWNvcmF0aW9uLnJlcGxhY2Uoe1xyXG5cdFx0XHRcdFx0XHRcdHdpZGdldDogbmV3IFRhc2tTdGF0dXNXaWRnZXQoXHJcblx0XHRcdFx0XHRcdFx0XHRhcHAsXHJcblx0XHRcdFx0XHRcdFx0XHRwbHVnaW4sXHJcblx0XHRcdFx0XHRcdFx0XHR2aWV3LFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2hlY2tib3hTdGFydCxcclxuXHRcdFx0XHRcdFx0XHRcdGNoZWNrYm94RW5kLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y3VycmVudFN0YXRlLFxyXG5cdFx0XHRcdFx0XHRcdFx0YnVsbGV0VGV4dFxyXG5cdFx0XHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHQvLyBJbiBMaXZlIFByZXZpZXcgbW9kZSwgcmVwbGFjZSB0aGUgd2hvbGUgYnVsbGV0IHBvaW50ICsgY2hlY2tib3hcclxuXHRcdFx0XHRcdGFkZChcclxuXHRcdFx0XHRcdFx0ZnJvbSArIG1hdGNoWzFdLmxlbmd0aCxcclxuXHRcdFx0XHRcdFx0ZnJvbSArXHJcblx0XHRcdFx0XHRcdFx0bWF0Y2hbMV0ubGVuZ3RoICtcclxuXHRcdFx0XHRcdFx0XHRidWxsZXRXaXRoU3BhY2UubGVuZ3RoICtcclxuXHRcdFx0XHRcdFx0XHRjaGVja2JveC5sZW5ndGgsXHJcblx0XHRcdFx0XHRcdERlY29yYXRpb24ucmVwbGFjZSh7XHJcblx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBuZXcgVGFza1N0YXR1c1dpZGdldChcclxuXHRcdFx0XHRcdFx0XHRcdGFwcCxcclxuXHRcdFx0XHRcdFx0XHRcdHBsdWdpbixcclxuXHRcdFx0XHRcdFx0XHRcdHZpZXcsXHJcblx0XHRcdFx0XHRcdFx0XHRmcm9tICsgbWF0Y2hbMV0ubGVuZ3RoLFxyXG5cdFx0XHRcdFx0XHRcdFx0ZnJvbSArXHJcblx0XHRcdFx0XHRcdFx0XHRcdG1hdGNoWzFdLmxlbmd0aCArXHJcblx0XHRcdFx0XHRcdFx0XHRcdGJ1bGxldFdpdGhTcGFjZS5sZW5ndGggK1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRjaGVja2JveC5sZW5ndGgsXHJcblx0XHRcdFx0XHRcdFx0XHRjdXJyZW50U3RhdGUsXHJcblx0XHRcdFx0XHRcdFx0XHRidWxsZXRUZXh0XHJcblx0XHRcdFx0XHRcdFx0KSxcclxuXHRcdFx0XHRcdFx0fSlcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3RydWN0b3IodmlldzogRWRpdG9yVmlldykge1xyXG5cdFx0XHR0aGlzLnZpZXcgPSB2aWV3O1xyXG5cdFx0XHR0aGlzLnVwZGF0ZURlY29yYXRpb25zKHZpZXcpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHVwZGF0ZSh1cGRhdGU6IFZpZXdVcGRhdGUpOiB2b2lkIHtcclxuXHRcdFx0Y29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHVwZGF0ZS5kb2NDaGFuZ2VkIHx8XHJcblx0XHRcdFx0dXBkYXRlLnZpZXdwb3J0Q2hhbmdlZCB8fFxyXG5cdFx0XHRcdChub3cgLSB0aGlzLmxhc3RVcGRhdGUgPiB0aGlzLnVwZGF0ZVRocmVzaG9sZCAmJlxyXG5cdFx0XHRcdFx0dXBkYXRlLnNlbGVjdGlvblNldClcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0dGhpcy5sYXN0VXBkYXRlID0gbm93O1xyXG5cdFx0XHRcdHRoaXMudXBkYXRlRGVjb3JhdGlvbnModXBkYXRlLnZpZXcsIHVwZGF0ZSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRkZXN0cm95KCk6IHZvaWQge1xyXG5cdFx0XHR0aGlzLmRlY29yYXRpb25zID0gRGVjb3JhdGlvbi5ub25lO1xyXG5cdFx0fVxyXG5cclxuXHRcdHVwZGF0ZURlY29yYXRpb25zKHZpZXc6IEVkaXRvclZpZXcsIHVwZGF0ZT86IFZpZXdVcGRhdGUpIHtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdCF1cGRhdGUgfHxcclxuXHRcdFx0XHR1cGRhdGUuZG9jQ2hhbmdlZCB8fFxyXG5cdFx0XHRcdHVwZGF0ZS5zZWxlY3Rpb25TZXQgfHxcclxuXHRcdFx0XHR0aGlzLmRlY29yYXRpb25zLnNpemUgPT09IDBcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0dGhpcy5kZWNvcmF0aW9ucyA9IHRoaXMubWF0Y2guY3JlYXRlRGVjbyh2aWV3KTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0aGlzLmRlY29yYXRpb25zID0gdGhpcy5tYXRjaC51cGRhdGVEZWNvKFxyXG5cdFx0XHRcdFx0dXBkYXRlLFxyXG5cdFx0XHRcdFx0dGhpcy5kZWNvcmF0aW9uc1xyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRpc0xpdmVQcmV2aWV3KHN0YXRlOiBFZGl0b3JWaWV3W1wic3RhdGVcIl0pOiBib29sZWFuIHtcclxuXHRcdFx0cmV0dXJuIHN0YXRlLmZpZWxkKGVkaXRvckxpdmVQcmV2aWV3RmllbGQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHNob3VsZFJlbmRlcihcclxuXHRcdFx0dmlldzogRWRpdG9yVmlldyxcclxuXHRcdFx0ZGVjb3JhdGlvbkZyb206IG51bWJlcixcclxuXHRcdFx0ZGVjb3JhdGlvblRvOiBudW1iZXJcclxuXHRcdCkge1xyXG5cdFx0XHRjb25zdCBzeW50YXhOb2RlID0gc3ludGF4VHJlZSh2aWV3LnN0YXRlKS5yZXNvbHZlSW5uZXIoXHJcblx0XHRcdFx0ZGVjb3JhdGlvbkZyb20gKyAxXHJcblx0XHRcdCk7XHJcblx0XHRcdGNvbnN0IG5vZGVQcm9wcyA9IHN5bnRheE5vZGUudHlwZS5wcm9wKHRva2VuQ2xhc3NOb2RlUHJvcCk7XHJcblxyXG5cdFx0XHRpZiAobm9kZVByb3BzKSB7XHJcblx0XHRcdFx0Y29uc3QgcHJvcHMgPSBub2RlUHJvcHMuc3BsaXQoXCIgXCIpO1xyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdHByb3BzLmluY2x1ZGVzKFwiaG1kLWNvZGVibG9ja1wiKSB8fFxyXG5cdFx0XHRcdFx0cHJvcHMuaW5jbHVkZXMoXCJobWQtZnJvbnRtYXR0ZXJcIilcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IHNlbGVjdGlvbiA9IHZpZXcuc3RhdGUuc2VsZWN0aW9uO1xyXG5cclxuXHRcdFx0Y29uc3Qgb3ZlcmxhcCA9IHNlbGVjdGlvbi5yYW5nZXMuc29tZSgocikgPT4ge1xyXG5cdFx0XHRcdHJldHVybiAhKHIudG8gPD0gZGVjb3JhdGlvbkZyb20gfHwgci5mcm9tID49IGRlY29yYXRpb25Ubyk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0cmV0dXJuIChcclxuXHRcdFx0XHQhb3ZlcmxhcCAmJlxyXG5cdFx0XHRcdCh0aGlzLmlzTGl2ZVByZXZpZXcodmlldy5zdGF0ZSkgfHxcclxuXHRcdFx0XHRcdHBsdWdpbi5zZXR0aW5ncy5lbmFibGVUZXh0TWFya0luU291cmNlTW9kZSlcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGNvbnN0IFRhc2tTdGF0dXNWaWV3UGx1Z2luU3BlYzogUGx1Z2luU3BlYzxUYXNrU3RhdHVzVmlld1BsdWdpblZhbHVlPiA9IHtcclxuXHRcdGRlY29yYXRpb25zOiAocGx1Z2luKSA9PiB7XHJcblx0XHRcdHJldHVybiBwbHVnaW4uZGVjb3JhdGlvbnMudXBkYXRlKHtcclxuXHRcdFx0XHRmaWx0ZXI6IChcclxuXHRcdFx0XHRcdHJhbmdlRnJvbTogbnVtYmVyLFxyXG5cdFx0XHRcdFx0cmFuZ2VUbzogbnVtYmVyLFxyXG5cdFx0XHRcdFx0ZGVjbzogRGVjb3JhdGlvblxyXG5cdFx0XHRcdCkgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc3Qgd2lkZ2V0ID0gZGVjby5zcGVjPy53aWRnZXQ7XHJcblx0XHRcdFx0XHRpZiAoKHdpZGdldCBhcyBhbnkpLmVycm9yKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRjb25zdCBzZWxlY3Rpb24gPSBwbHVnaW4udmlldy5zdGF0ZS5zZWxlY3Rpb247XHJcblxyXG5cdFx0XHRcdFx0Zm9yIChjb25zdCByYW5nZSBvZiBzZWxlY3Rpb24ucmFuZ2VzKSB7XHJcblx0XHRcdFx0XHRcdGlmICghKHJhbmdlLnRvIDw9IHJhbmdlRnJvbSB8fCByYW5nZS5mcm9tID49IHJhbmdlVG8pKSB7XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHR9LFxyXG5cdH07XHJcblxyXG5cdHJldHVybiBWaWV3UGx1Z2luLmZyb21DbGFzcyhcclxuXHRcdFRhc2tTdGF0dXNWaWV3UGx1Z2luVmFsdWUsXHJcblx0XHRUYXNrU3RhdHVzVmlld1BsdWdpblNwZWNcclxuXHQpO1xyXG59XHJcbiJdfQ==