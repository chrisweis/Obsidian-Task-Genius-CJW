import { editorInfoField, Menu } from "obsidian";
import { Prec } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { extractWorkflowInfo, resolveWorkflowInfo, determineNextStage, generateWorkflowTaskText, createWorkflowStageTransition, } from "@/editor-extensions/workflow/workflow-handler";
import { t } from "@/translations/helper";
import { buildIndentString } from "@/utils";
import { taskStatusChangeAnnotation } from "@/editor-extensions/task-operations/status-switcher";
const TASK_REGEX = /^(\s*)([-*+]|\d+\.)\s+\[(.)]/;
const TASK_PREFIX = "- [ ] ";
function getIndentation(text) {
    const match = text.match(/^(\s*)/);
    return match ? match[1] : "";
}
function getEditorFromView(view) {
    var _a, _b;
    return (_b = (_a = view.state.field(editorInfoField)) === null || _a === void 0 ? void 0 : _a.editor) !== null && _b !== void 0 ? _b : null;
}
function cursorAfterTaskPrefix(lineEnd, indentation) {
    return lineEnd + 1 + indentation.length + TASK_PREFIX.length;
}
/**
 * Show workflow menu at cursor position
 * @param view The editor view
 * @param app The Obsidian app instance
 * @param plugin The plugin instance
 * @param lineNumber The line number where the menu should appear
 * @param workflowInfo The workflow information for the current line
 */
function showWorkflowMenu(view, app, plugin, lineNumber, workflowInfo) {
    var _a, _b;
    const menu = new Menu();
    const doc = view.state.doc;
    if (lineNumber < 1 || lineNumber > doc.lines) {
        return false;
    }
    const line = doc.line(lineNumber);
    const lineText = line.text;
    const resolvedInfo = resolveWorkflowInfo(lineText, doc, lineNumber, plugin);
    if (!resolvedInfo) {
        return false;
    }
    const { currentStage, currentSubStage, workflow, isRootTask } = resolvedInfo;
    if (workflowInfo.currentStage === "root" || isRootTask) {
        menu.addItem((item) => {
            item.setTitle(t("Start workflow"))
                .setIcon("play")
                .onClick(() => {
                startWorkflow(view, app, plugin, lineNumber);
            });
        });
    }
    else if (currentStage.type === "terminal") {
        menu.addItem((item) => {
            item.setTitle(t("Complete workflow"))
                .setIcon("check")
                .onClick(() => {
                completeWorkflow(view, plugin, lineNumber);
            });
        });
    }
    else {
        const { nextStageId, nextSubStageId } = determineNextStage(currentStage, workflow, currentSubStage);
        if (nextStageId) {
            const nextStage = workflow.stages.find((s) => s.id === nextStageId);
            if (nextStage) {
                let menuTitle;
                if (nextStageId === currentStage.id &&
                    nextSubStageId === (currentSubStage === null || currentSubStage === void 0 ? void 0 : currentSubStage.id)) {
                    menuTitle = `${t("Continue")} ${nextStage.name}${nextSubStageId ? ` (${currentSubStage === null || currentSubStage === void 0 ? void 0 : currentSubStage.name})` : ""}`;
                }
                else if (nextStageId === currentStage.id && nextSubStageId) {
                    const nextSubStage = (_a = nextStage.subStages) === null || _a === void 0 ? void 0 : _a.find((ss) => ss.id === nextSubStageId);
                    menuTitle = `${t("Move to")} ${nextStage.name} (${(nextSubStage === null || nextSubStage === void 0 ? void 0 : nextSubStage.name) || nextSubStageId})`;
                }
                else {
                    menuTitle = `${t("Move to")} ${nextStage.name}`;
                }
                menu.addItem((item) => {
                    item.setTitle(menuTitle)
                        .setIcon("arrow-right")
                        .onClick(() => {
                        var _a;
                        moveToNextStageWithSubStage(view, app, plugin, lineNumber, nextStage, false, nextSubStageId
                            ? (_a = nextStage.subStages) === null || _a === void 0 ? void 0 : _a.find((ss) => ss.id === nextSubStageId)
                            : undefined, currentSubStage);
                    });
                });
            }
        }
        if (currentSubStage && currentStage.type === "cycle") {
            const candidateStageIds = new Set();
            if ((_b = currentStage.canProceedTo) === null || _b === void 0 ? void 0 : _b.length) {
                currentStage.canProceedTo.forEach((id) => candidateStageIds.add(id));
            }
            else if (typeof currentStage.next === "string") {
                candidateStageIds.add(currentStage.next);
            }
            else if (Array.isArray(currentStage.next) &&
                currentStage.next.length > 0) {
                candidateStageIds.add(currentStage.next[0]);
            }
            else {
                const currentIndex = workflow.stages.findIndex((s) => s.id === currentStage.id);
                if (currentIndex >= 0 &&
                    currentIndex < workflow.stages.length - 1) {
                    candidateStageIds.add(workflow.stages[currentIndex + 1].id);
                }
            }
            candidateStageIds.forEach((nextStageCandidate) => {
                const nextMainStage = workflow.stages.find((stage) => stage.id === nextStageCandidate);
                if (!nextMainStage) {
                    return;
                }
                menu.addItem((item) => {
                    item.setTitle(`${t("Complete substage and move to")} ${nextMainStage.name}`)
                        .setIcon("skip-forward")
                        .onClick(() => {
                        completeSubstageAndMoveToNextMainStage(view, plugin, lineNumber, nextMainStage, currentSubStage);
                    });
                });
            });
        }
        menu.addSeparator();
        menu.addItem((item) => {
            item.setTitle(t("Add child task with same stage"))
                .setIcon("plus-circle")
                .onClick(() => {
                addChildTaskWithSameStage(view, app, plugin, lineNumber, currentStage, currentSubStage);
            });
        });
    }
    menu.addSeparator();
    menu.addItem((item) => {
        item.setTitle(t("Add new task"))
            .setIcon("plus")
            .onClick(() => {
            addNewSiblingTask(view, lineNumber);
        });
    });
    // Add new sub-task option
    menu.addItem((item) => {
        item.setTitle(t("Add new sub-task"))
            .setIcon("plus-circle")
            .onClick(() => {
            addNewSubTask(view, app, lineNumber);
        });
    });
    const selection = view.state.selection.main;
    const coords = view.coordsAtPos(selection.head);
    if (coords) {
        menu.showAtPosition({ x: coords.left, y: coords.bottom });
    }
    else {
        menu.showAtMouseEvent(window.event);
    }
    return true;
}
/**
 * Add a new sibling task after the current line (same indentation level)
 * @param view The editor view
 * @param lineNumber The current line number
 */
function addNewSiblingTask(view, lineNumber) {
    const line = view.state.doc.line(lineNumber);
    const indentation = getIndentation(line.text);
    const insert = `\n${indentation}${TASK_PREFIX}`;
    view.dispatch({
        changes: { from: line.to, to: line.to, insert },
        selection: {
            anchor: cursorAfterTaskPrefix(line.to, indentation),
        },
    });
    view.focus();
}
/**
 * Add a new sub-task after the current line (indented)
 * @param view The editor view
 * @param app The Obsidian app instance
 * @param lineNumber The current line number
 */
function addNewSubTask(view, app, lineNumber) {
    const line = view.state.doc.line(lineNumber);
    const indentation = getIndentation(line.text);
    const defaultIndentation = buildIndentString(app);
    const newTaskIndentation = indentation + defaultIndentation;
    const insert = `\n${newTaskIndentation}${TASK_PREFIX}`;
    view.dispatch({
        changes: { from: line.to, to: line.to, insert },
        selection: {
            anchor: cursorAfterTaskPrefix(line.to, newTaskIndentation),
        },
    });
    view.focus();
}
/**
 * Start the workflow by creating the first stage task
 * @param view The editor view
 * @param app The Obsidian app instance
 * @param plugin The plugin instance
 * @param lineNumber The current line number
 */
function startWorkflow(view, app, plugin, lineNumber) {
    const doc = view.state.doc;
    if (lineNumber < 1 || lineNumber > doc.lines) {
        return;
    }
    const line = doc.line(lineNumber);
    const lineText = line.text;
    const workflowInfo = extractWorkflowInfo(lineText);
    if (!workflowInfo) {
        return;
    }
    // Resolve complete workflow information
    const resolvedInfo = resolveWorkflowInfo(lineText, view.state.doc, lineNumber, plugin);
    if (!resolvedInfo || !resolvedInfo.workflow.stages.length) {
        return;
    }
    const { workflow } = resolvedInfo;
    const firstStage = workflow.stages[0];
    const indentation = getIndentation(lineText);
    const newTaskIndentation = indentation + buildIndentString(app);
    const newTaskText = generateWorkflowTaskText(firstStage, newTaskIndentation, plugin, true);
    const insertText = `\n${newTaskText}`;
    const cursorPosition = cursorAfterTaskPrefix(line.to, newTaskIndentation);
    view.dispatch({
        changes: {
            from: line.to,
            to: line.to,
            insert: insertText,
        },
        selection: {
            anchor: cursorPosition,
        },
    });
    view.focus();
}
/**
 * Creates an editor extension that handles Enter key for workflow root tasks
 * @param app The Obsidian app instance
 * @param plugin The plugin instance
 * @returns An editor extension that can be registered with the plugin
 */
export function workflowRootEnterHandlerExtension(app, plugin) {
    // Don't enable if workflow feature is disabled
    if (!plugin.settings.workflow.enableWorkflow) {
        return [];
    }
    const keymapExtension = Prec.high(keymap.of([
        {
            key: "Enter",
            run: (view) => {
                // Get current cursor position
                const selection = view.state.selection.main;
                const line = view.state.doc.lineAt(selection.head);
                const lineText = line.text;
                // Check if this is a workflow root task
                const taskMatch = lineText.match(TASK_REGEX);
                if (!taskMatch) {
                    return false; // Not a task, allow default behavior
                }
                // Check if this task has a workflow tag or stage marker
                const workflowInfo = extractWorkflowInfo(lineText);
                if (!workflowInfo) {
                    return false; // Not a workflow task, allow default behavior
                }
                // Check if cursor is at the end of the line
                if (selection.head !== line.to) {
                    return false; // Not at end of line, allow default behavior
                }
                // Show the workflow menu
                return showWorkflowMenu(view, app, plugin, line.number, workflowInfo);
            },
        },
    ]));
    return [keymapExtension];
}
/**
 * Move to the next stage in workflow with substage support
 * @param view The editor view
 * @param app The Obsidian app instance
 * @param plugin The plugin instance
 * @param lineNumber The current line number
 * @param nextStage The next stage to move to
 * @param isRootTask Whether this is a root task
 * @param nextSubStage The next substage to move to
 * @param currentSubStage The current substage
 */
function moveToNextStageWithSubStage(view, app, plugin, lineNumber, nextStage, isRootTask, nextSubStage, currentSubStage) {
    const doc = view.state.doc;
    if (lineNumber < 1 || lineNumber > doc.lines) {
        return;
    }
    const line = doc.line(lineNumber);
    const lineText = line.text;
    const editor = getEditorFromView(view);
    if (!editor) {
        return;
    }
    const changes = createWorkflowStageTransition(plugin, editor, lineText, lineNumber - 1, // Convert to 0-based line number for the function
    nextStage, isRootTask, nextSubStage, currentSubStage);
    const indentation = getIndentation(lineText);
    const defaultIndentation = buildIndentString(app);
    const newTaskIndentation = isRootTask
        ? indentation + defaultIndentation
        : indentation;
    const insertedTask = changes.some((change) => change.insert && change.insert.includes(TASK_PREFIX));
    const cursorPosition = insertedTask
        ? cursorAfterTaskPrefix(line.to, newTaskIndentation)
        : line.to;
    view.dispatch({
        changes,
        selection: {
            anchor: cursorPosition,
        },
        annotations: taskStatusChangeAnnotation.of("workflowChange"),
    });
    view.focus();
}
/**
 * Move to the next stage in workflow
 * @param view The editor view
 * @param app The Obsidian app instance
 * @param plugin The plugin instance
 * @param lineNumber The current line number
 * @param nextStage The next stage to move to
 * @param isRootTask Whether this is a root task
 */
function moveToNextStage(view, app, plugin, lineNumber, nextStage, isRootTask) {
    const doc = view.state.doc;
    if (lineNumber < 1 || lineNumber > doc.lines) {
        return;
    }
    const line = doc.line(lineNumber);
    const lineText = line.text;
    const editor = getEditorFromView(view);
    if (!editor) {
        return;
    }
    const changes = createWorkflowStageTransition(plugin, editor, lineText, lineNumber - 1, // Convert to 0-based line number for the function
    nextStage, isRootTask, undefined, // nextSubStage
    undefined);
    const indentation = getIndentation(lineText);
    const defaultIndentation = buildIndentString(app);
    const newTaskIndentation = isRootTask
        ? indentation + defaultIndentation
        : indentation;
    const insertedTask = changes.some((change) => change.insert && change.insert.includes(TASK_PREFIX));
    const cursorPosition = insertedTask
        ? cursorAfterTaskPrefix(line.to, newTaskIndentation)
        : line.to;
    view.dispatch({
        changes,
        selection: {
            anchor: cursorPosition,
        },
        annotations: taskStatusChangeAnnotation.of("workflowChange"),
    });
    view.focus();
}
/**
 * Complete the workflow
 * @param view The editor view
 * @param plugin The plugin instance
 * @param lineNumber The current line number
 */
function completeWorkflow(view, plugin, lineNumber) {
    const doc = view.state.doc;
    if (lineNumber < 1 || lineNumber > doc.lines) {
        return;
    }
    const line = doc.line(lineNumber);
    const lineText = line.text;
    const editor = getEditorFromView(view);
    if (!editor) {
        return;
    }
    const resolvedInfo = resolveWorkflowInfo(lineText, doc, lineNumber, plugin);
    if (!resolvedInfo) {
        return;
    }
    const { currentStage, currentSubStage } = resolvedInfo;
    const changes = createWorkflowStageTransition(plugin, editor, lineText, lineNumber - 1, // Convert to 0-based line number for the function
    currentStage, // Pass the current stage as the "next" stage for terminal completion
    false, // Not a root task
    undefined, // No next substage
    currentSubStage);
    view.dispatch({
        changes,
        annotations: taskStatusChangeAnnotation.of("workflowChange"),
    });
    view.focus();
}
/**
 * Add a child task with the same stage
 * @param view The editor view
 * @param app The Obsidian app instance
 * @param plugin The plugin instance
 * @param lineNumber The current line number
 * @param currentStage The current stage
 * @param currentSubStage The current substage
 */
function addChildTaskWithSameStage(view, app, plugin, lineNumber, currentStage, currentSubStage) {
    const line = view.state.doc.line(lineNumber);
    const indentation = getIndentation(line.text);
    const defaultIndentation = buildIndentString(app);
    const newTaskIndentation = indentation + defaultIndentation;
    // Create task text with the same stage
    const newTaskText = generateWorkflowTaskText(currentStage, newTaskIndentation, plugin, false, currentSubStage);
    // Insert the new task after the current line
    view.dispatch({
        changes: {
            from: line.to,
            to: line.to,
            insert: `\n${newTaskText}`,
        },
        selection: {
            anchor: cursorAfterTaskPrefix(line.to, newTaskIndentation),
        },
    });
    view.focus();
}
/**
 * Move to the next main stage and complete both current substage and parent stage
 * @param view The editor view
 * @param plugin The plugin instance
 * @param lineNumber The current line number
 * @param nextStage The next main stage to move to
 * @param currentSubStage The current substage
 */
function completeSubstageAndMoveToNextMainStage(view, plugin, lineNumber, nextStage, currentSubStage) {
    const doc = view.state.doc;
    if (lineNumber < 1 || lineNumber > doc.lines) {
        return;
    }
    const line = doc.line(lineNumber);
    const lineText = line.text;
    const editor = getEditorFromView(view);
    if (!editor) {
        return;
    }
    let changes = [];
    const currentIndent = getIndentation(lineText).length;
    for (let i = lineNumber - 1; i >= 1; i--) {
        const checkLine = doc.line(i);
        const checkIndent = getIndentation(checkLine.text).length;
        if (checkIndent < currentIndent) {
            const parentTaskMatch = checkLine.text.match(TASK_REGEX);
            if (parentTaskMatch) {
                if (checkLine.text.includes("[stage::")) {
                    const parentTransitionChanges = createWorkflowStageTransition(plugin, editor, checkLine.text, i - 1, // Convert to 0-based line number for the function
                    nextStage, // The next stage we're transitioning to
                    false, // Not a root task
                    undefined, // No next substage for parent
                    undefined);
                    const parentCompletionChanges = parentTransitionChanges.filter((change) => !change.insert ||
                        !change.insert.includes(TASK_PREFIX));
                    changes.push(...parentCompletionChanges);
                    break; // Found and handled the parent, stop looking
                }
            }
        }
    }
    // 2. Use the existing createWorkflowStageTransition function to handle the current task and create the next stage
    // This will automatically complete the current substage task and create the next stage
    const transitionChanges = createWorkflowStageTransition(plugin, editor, lineText, lineNumber - 1, // Convert to 0-based line number for the function
    nextStage, false, // Not a root task
    undefined, // No next substage - moving to main stage
    currentSubStage);
    // Combine all changes
    changes.push(...transitionChanges);
    view.dispatch({
        changes,
        annotations: taskStatusChangeAnnotation.of("workflowChange"),
    });
    view.focus();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2Zsb3ctZW50ZXItaGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIndvcmtmbG93LWVudGVyLWhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFlLGVBQWUsRUFBRSxJQUFJLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFFOUQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ3pDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUMxQyxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLG1CQUFtQixFQUNuQixrQkFBa0IsRUFDbEIsd0JBQXdCLEVBQ3hCLDZCQUE2QixHQUU3QixNQUFNLCtDQUErQyxDQUFDO0FBRXZELE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUMxQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFDNUMsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFFakcsTUFBTSxVQUFVLEdBQUcsOEJBQThCLENBQUM7QUFDbEQsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDO0FBRzdCLFNBQVMsY0FBYyxDQUFDLElBQVk7SUFDbkMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNuQyxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDOUIsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQUMsSUFBZ0I7O0lBQzFDLE9BQU8sTUFBQSxNQUFBLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQywwQ0FBRSxNQUFNLG1DQUFJLElBQUksQ0FBQztBQUMxRCxDQUFDO0FBRUQsU0FBUyxxQkFBcUIsQ0FBQyxPQUFlLEVBQUUsV0FBbUI7SUFDbEUsT0FB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QVMsQ0FDVCxDQUFDO29CQUVILE1BQU0sdUJBQXVCLEdBQzVCLHVCQUF1QixDQUFDLE1BQU0sQ0FDN0IsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUNWLENBQUMsTUFBTSxDQUFDLE1BQU07d0JBQ2QsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FDckMsQ0FBQztvQkFFSCxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsdUJBQXVCLENBQUMsQ0FBQztvQkFDekMsTUFBTSxDQUFDLDZDQUE2QztpQkFDcEQ7YUFDRDtTQUNEO0tBQ0Q7SUFFRCxrSEFBa0g7SUFDbEgsdUZBQXVGO0lBQ3ZGLE1BQU0saUJBQWlCLEdBQUcsNkJBQTZCLENBQ3RELE1BQU0sRUFDTixNQUFNLEVBQ04sUUFBUSxFQUNSLFVBQVUsR0FBRyxDQUFDLEVBQUUsa0RBQWtEO0lBQ2xFLFNBQVMsRUFDVCxLQUFLLEVBQUUsa0JBQWtCO0lBQ3pCLFNBQVMsRUFBRSwwQ0FBMEM7SUFDckQsZUFBZSxDQUNmLENBQUM7SUFFRixzQkFBc0I7SUFDdEIsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLGlCQUFpQixDQUFDLENBQUM7SUFFbkMsSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUNiLE9BQU87UUFDUCxXQUFXLEVBQUUsMEJBQTBCLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDO0tBQzVELENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUNkLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBFZGl0b3JWaWV3IH0gZnJvbSBcIkBjb2RlbWlycm9yL3ZpZXdcIjtcclxuaW1wb3J0IHsgQXBwLCBFZGl0b3IsIGVkaXRvckluZm9GaWVsZCwgTWVudSB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7IFByZWMgfSBmcm9tIFwiQGNvZGVtaXJyb3Ivc3RhdGVcIjtcclxuaW1wb3J0IHsga2V5bWFwIH0gZnJvbSBcIkBjb2RlbWlycm9yL3ZpZXdcIjtcclxuaW1wb3J0IHtcclxuXHRleHRyYWN0V29ya2Zsb3dJbmZvLFxyXG5cdHJlc29sdmVXb3JrZmxvd0luZm8sXHJcblx0ZGV0ZXJtaW5lTmV4dFN0YWdlLFxyXG5cdGdlbmVyYXRlV29ya2Zsb3dUYXNrVGV4dCxcclxuXHRjcmVhdGVXb3JrZmxvd1N0YWdlVHJhbnNpdGlvbixcclxuXHR0eXBlIFdvcmtmbG93SW5mbyxcclxufSBmcm9tIFwiQC9lZGl0b3ItZXh0ZW5zaW9ucy93b3JrZmxvdy93b3JrZmxvdy1oYW5kbGVyXCI7XHJcbmltcG9ydCB0eXBlIHsgV29ya2Zsb3dTdGFnZSB9IGZyb20gXCJAL2NvbW1vbi9zZXR0aW5nLWRlZmluaXRpb25cIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHsgYnVpbGRJbmRlbnRTdHJpbmcgfSBmcm9tIFwiQC91dGlsc1wiO1xyXG5pbXBvcnQgeyB0YXNrU3RhdHVzQ2hhbmdlQW5ub3RhdGlvbiB9IGZyb20gXCJAL2VkaXRvci1leHRlbnNpb25zL3Rhc2stb3BlcmF0aW9ucy9zdGF0dXMtc3dpdGNoZXJcIjtcclxuXHJcbmNvbnN0IFRBU0tfUkVHRVggPSAvXihcXHMqKShbLSorXXxcXGQrXFwuKVxccytcXFsoLildLztcclxuY29uc3QgVEFTS19QUkVGSVggPSBcIi0gWyBdIFwiO1xyXG50eXBlIFdvcmtmbG93U3ViU3RhZ2UgPSBOb25OdWxsYWJsZTxXb3JrZmxvd1N0YWdlW1wic3ViU3RhZ2VzXCJdPltudW1iZXJdO1xyXG5cclxuZnVuY3Rpb24gZ2V0SW5kZW50YXRpb24odGV4dDogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRjb25zdCBtYXRjaCA9IHRleHQubWF0Y2goL14oXFxzKikvKTtcclxuXHRyZXR1cm4gbWF0Y2ggPyBtYXRjaFsxXSA6IFwiXCI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEVkaXRvckZyb21WaWV3KHZpZXc6IEVkaXRvclZpZXcpOiBFZGl0b3IgfCBudWxsIHtcclxuXHRyZXR1cm4gdmlldy5zdGF0ZS5maWVsZChlZGl0b3JJbmZvRmllbGQpPy5lZGl0b3IgPz8gbnVsbDtcclxufVxyXG5cclxuZnVuY3Rpb24gY3Vyc29yQWZ0ZXJUYXNrUHJlZml4KGxpbmVFbmQ6IG51bWJlciwgaW5kZW50YXRpb246IHN0cmluZyk6IG51bWJlciB7XHJcblx0cmV0dXJuIGxpbmVFbmQgKyAxICsgaW5kZW50YXRpb24ubGVuZ3RoICsgVEFTS19QUkVGSVgubGVuZ3RoO1xyXG59XHJcblxyXG4vKipcclxuICogU2hvdyB3b3JrZmxvdyBtZW51IGF0IGN1cnNvciBwb3NpdGlvblxyXG4gKiBAcGFyYW0gdmlldyBUaGUgZWRpdG9yIHZpZXdcclxuICogQHBhcmFtIGFwcCBUaGUgT2JzaWRpYW4gYXBwIGluc3RhbmNlXHJcbiAqIEBwYXJhbSBwbHVnaW4gVGhlIHBsdWdpbiBpbnN0YW5jZVxyXG4gKiBAcGFyYW0gbGluZU51bWJlciBUaGUgbGluZSBudW1iZXIgd2hlcmUgdGhlIG1lbnUgc2hvdWxkIGFwcGVhclxyXG4gKiBAcGFyYW0gd29ya2Zsb3dJbmZvIFRoZSB3b3JrZmxvdyBpbmZvcm1hdGlvbiBmb3IgdGhlIGN1cnJlbnQgbGluZVxyXG4gKi9cclxuZnVuY3Rpb24gc2hvd1dvcmtmbG93TWVudShcclxuXHR2aWV3OiBFZGl0b3JWaWV3LFxyXG5cdGFwcDogQXBwLFxyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdGxpbmVOdW1iZXI6IG51bWJlcixcclxuXHR3b3JrZmxvd0luZm86IFdvcmtmbG93SW5mbyxcclxuKTogYm9vbGVhbiB7XHJcblx0Y29uc3QgbWVudSA9IG5ldyBNZW51KCk7XHJcblx0Y29uc3QgZG9jID0gdmlldy5zdGF0ZS5kb2M7XHJcblx0aWYgKGxpbmVOdW1iZXIgPCAxIHx8IGxpbmVOdW1iZXIgPiBkb2MubGluZXMpIHtcclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHR9XHJcblx0Y29uc3QgbGluZSA9IGRvYy5saW5lKGxpbmVOdW1iZXIpO1xyXG5cdGNvbnN0IGxpbmVUZXh0ID0gbGluZS50ZXh0O1xyXG5cdGNvbnN0IHJlc29sdmVkSW5mbyA9IHJlc29sdmVXb3JrZmxvd0luZm8obGluZVRleHQsIGRvYywgbGluZU51bWJlciwgcGx1Z2luKTtcclxuXHJcblx0aWYgKCFyZXNvbHZlZEluZm8pIHtcclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHR9XHJcblxyXG5cdGNvbnN0IHsgY3VycmVudFN0YWdlLCBjdXJyZW50U3ViU3RhZ2UsIHdvcmtmbG93LCBpc1Jvb3RUYXNrIH0gPVxyXG5cdFx0cmVzb2x2ZWRJbmZvO1xyXG5cclxuXHRpZiAod29ya2Zsb3dJbmZvLmN1cnJlbnRTdGFnZSA9PT0gXCJyb290XCIgfHwgaXNSb290VGFzaykge1xyXG5cdFx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdGl0ZW0uc2V0VGl0bGUodChcIlN0YXJ0IHdvcmtmbG93XCIpKVxyXG5cdFx0XHRcdC5zZXRJY29uKFwicGxheVwiKVxyXG5cdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdHN0YXJ0V29ya2Zsb3codmlldywgYXBwLCBwbHVnaW4sIGxpbmVOdW1iZXIpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fSBlbHNlIGlmIChjdXJyZW50U3RhZ2UudHlwZSA9PT0gXCJ0ZXJtaW5hbFwiKSB7XHJcblx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0aXRlbS5zZXRUaXRsZSh0KFwiQ29tcGxldGUgd29ya2Zsb3dcIikpXHJcblx0XHRcdFx0LnNldEljb24oXCJjaGVja1wiKVxyXG5cdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdGNvbXBsZXRlV29ya2Zsb3codmlldywgcGx1Z2luLCBsaW5lTnVtYmVyKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH0gZWxzZSB7XHJcblx0XHRjb25zdCB7IG5leHRTdGFnZUlkLCBuZXh0U3ViU3RhZ2VJZCB9ID0gZGV0ZXJtaW5lTmV4dFN0YWdlKFxyXG5cdFx0XHRjdXJyZW50U3RhZ2UsXHJcblx0XHRcdHdvcmtmbG93LFxyXG5cdFx0XHRjdXJyZW50U3ViU3RhZ2UsXHJcblx0XHQpO1xyXG5cclxuXHRcdGlmIChuZXh0U3RhZ2VJZCkge1xyXG5cdFx0XHRjb25zdCBuZXh0U3RhZ2UgPSB3b3JrZmxvdy5zdGFnZXMuZmluZCgocykgPT4gcy5pZCA9PT0gbmV4dFN0YWdlSWQpO1xyXG5cdFx0XHRpZiAobmV4dFN0YWdlKSB7XHJcblx0XHRcdFx0bGV0IG1lbnVUaXRsZTogc3RyaW5nO1xyXG5cclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRuZXh0U3RhZ2VJZCA9PT0gY3VycmVudFN0YWdlLmlkICYmXHJcblx0XHRcdFx0XHRuZXh0U3ViU3RhZ2VJZCA9PT0gY3VycmVudFN1YlN0YWdlPy5pZFxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0bWVudVRpdGxlID0gYCR7dChcIkNvbnRpbnVlXCIpfSAke25leHRTdGFnZS5uYW1lfSR7XHJcblx0XHRcdFx0XHRcdG5leHRTdWJTdGFnZUlkID8gYCAoJHtjdXJyZW50U3ViU3RhZ2U/Lm5hbWV9KWAgOiBcIlwiXHJcblx0XHRcdFx0XHR9YDtcclxuXHRcdFx0XHR9IGVsc2UgaWYgKG5leHRTdGFnZUlkID09PSBjdXJyZW50U3RhZ2UuaWQgJiYgbmV4dFN1YlN0YWdlSWQpIHtcclxuXHRcdFx0XHRcdGNvbnN0IG5leHRTdWJTdGFnZSA9IG5leHRTdGFnZS5zdWJTdGFnZXM/LmZpbmQoXHJcblx0XHRcdFx0XHRcdChzcykgPT4gc3MuaWQgPT09IG5leHRTdWJTdGFnZUlkLFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdG1lbnVUaXRsZSA9IGAke3QoXCJNb3ZlIHRvXCIpfSAke25leHRTdGFnZS5uYW1lfSAoJHtcclxuXHRcdFx0XHRcdFx0bmV4dFN1YlN0YWdlPy5uYW1lIHx8IG5leHRTdWJTdGFnZUlkXHJcblx0XHRcdFx0XHR9KWA7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdG1lbnVUaXRsZSA9IGAke3QoXCJNb3ZlIHRvXCIpfSAke25leHRTdGFnZS5uYW1lfWA7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRcdGl0ZW0uc2V0VGl0bGUobWVudVRpdGxlKVxyXG5cdFx0XHRcdFx0XHQuc2V0SWNvbihcImFycm93LXJpZ2h0XCIpXHJcblx0XHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRtb3ZlVG9OZXh0U3RhZ2VXaXRoU3ViU3RhZ2UoXHJcblx0XHRcdFx0XHRcdFx0XHR2aWV3LFxyXG5cdFx0XHRcdFx0XHRcdFx0YXBwLFxyXG5cdFx0XHRcdFx0XHRcdFx0cGx1Z2luLFxyXG5cdFx0XHRcdFx0XHRcdFx0bGluZU51bWJlcixcclxuXHRcdFx0XHRcdFx0XHRcdG5leHRTdGFnZSxcclxuXHRcdFx0XHRcdFx0XHRcdGZhbHNlLFxyXG5cdFx0XHRcdFx0XHRcdFx0bmV4dFN1YlN0YWdlSWRcclxuXHRcdFx0XHRcdFx0XHRcdFx0PyBuZXh0U3RhZ2Uuc3ViU3RhZ2VzPy5maW5kKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0KHNzKSA9PiBzcy5pZCA9PT0gbmV4dFN1YlN0YWdlSWQsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ6IHVuZGVmaW5lZCxcclxuXHRcdFx0XHRcdFx0XHRcdGN1cnJlbnRTdWJTdGFnZSxcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChjdXJyZW50U3ViU3RhZ2UgJiYgY3VycmVudFN0YWdlLnR5cGUgPT09IFwiY3ljbGVcIikge1xyXG5cdFx0XHRjb25zdCBjYW5kaWRhdGVTdGFnZUlkcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG5cclxuXHRcdFx0aWYgKGN1cnJlbnRTdGFnZS5jYW5Qcm9jZWVkVG8/Lmxlbmd0aCkge1xyXG5cdFx0XHRcdGN1cnJlbnRTdGFnZS5jYW5Qcm9jZWVkVG8uZm9yRWFjaCgoaWQpID0+XHJcblx0XHRcdFx0XHRjYW5kaWRhdGVTdGFnZUlkcy5hZGQoaWQpLFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0gZWxzZSBpZiAodHlwZW9mIGN1cnJlbnRTdGFnZS5uZXh0ID09PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdFx0Y2FuZGlkYXRlU3RhZ2VJZHMuYWRkKGN1cnJlbnRTdGFnZS5uZXh0KTtcclxuXHRcdFx0fSBlbHNlIGlmIChcclxuXHRcdFx0XHRBcnJheS5pc0FycmF5KGN1cnJlbnRTdGFnZS5uZXh0KSAmJlxyXG5cdFx0XHRcdGN1cnJlbnRTdGFnZS5uZXh0Lmxlbmd0aCA+IDBcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0Y2FuZGlkYXRlU3RhZ2VJZHMuYWRkKGN1cnJlbnRTdGFnZS5uZXh0WzBdKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRjb25zdCBjdXJyZW50SW5kZXggPSB3b3JrZmxvdy5zdGFnZXMuZmluZEluZGV4KFxyXG5cdFx0XHRcdFx0KHMpID0+IHMuaWQgPT09IGN1cnJlbnRTdGFnZS5pZCxcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdGN1cnJlbnRJbmRleCA+PSAwICYmXHJcblx0XHRcdFx0XHRjdXJyZW50SW5kZXggPCB3b3JrZmxvdy5zdGFnZXMubGVuZ3RoIC0gMVxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0Y2FuZGlkYXRlU3RhZ2VJZHMuYWRkKHdvcmtmbG93LnN0YWdlc1tjdXJyZW50SW5kZXggKyAxXS5pZCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjYW5kaWRhdGVTdGFnZUlkcy5mb3JFYWNoKChuZXh0U3RhZ2VDYW5kaWRhdGUpID0+IHtcclxuXHRcdFx0XHRjb25zdCBuZXh0TWFpblN0YWdlID0gd29ya2Zsb3cuc3RhZ2VzLmZpbmQoXHJcblx0XHRcdFx0XHQoc3RhZ2UpID0+IHN0YWdlLmlkID09PSBuZXh0U3RhZ2VDYW5kaWRhdGUsXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRpZiAoIW5leHRNYWluU3RhZ2UpIHtcclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRcdFx0aXRlbS5zZXRUaXRsZShcclxuXHRcdFx0XHRcdFx0YCR7dChcIkNvbXBsZXRlIHN1YnN0YWdlIGFuZCBtb3ZlIHRvXCIpfSAke1xyXG5cdFx0XHRcdFx0XHRcdG5leHRNYWluU3RhZ2UubmFtZVxyXG5cdFx0XHRcdFx0XHR9YCxcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0LnNldEljb24oXCJza2lwLWZvcndhcmRcIilcclxuXHRcdFx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdGNvbXBsZXRlU3Vic3RhZ2VBbmRNb3ZlVG9OZXh0TWFpblN0YWdlKFxyXG5cdFx0XHRcdFx0XHRcdFx0dmlldyxcclxuXHRcdFx0XHRcdFx0XHRcdHBsdWdpbixcclxuXHRcdFx0XHRcdFx0XHRcdGxpbmVOdW1iZXIsXHJcblx0XHRcdFx0XHRcdFx0XHRuZXh0TWFpblN0YWdlLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y3VycmVudFN1YlN0YWdlLFxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHRtZW51LmFkZFNlcGFyYXRvcigpO1xyXG5cdFx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdGl0ZW0uc2V0VGl0bGUodChcIkFkZCBjaGlsZCB0YXNrIHdpdGggc2FtZSBzdGFnZVwiKSlcclxuXHRcdFx0XHQuc2V0SWNvbihcInBsdXMtY2lyY2xlXCIpXHJcblx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0YWRkQ2hpbGRUYXNrV2l0aFNhbWVTdGFnZShcclxuXHRcdFx0XHRcdFx0dmlldyxcclxuXHRcdFx0XHRcdFx0YXBwLFxyXG5cdFx0XHRcdFx0XHRwbHVnaW4sXHJcblx0XHRcdFx0XHRcdGxpbmVOdW1iZXIsXHJcblx0XHRcdFx0XHRcdGN1cnJlbnRTdGFnZSxcclxuXHRcdFx0XHRcdFx0Y3VycmVudFN1YlN0YWdlLFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0bWVudS5hZGRTZXBhcmF0b3IoKTtcclxuXHJcblx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRpdGVtLnNldFRpdGxlKHQoXCJBZGQgbmV3IHRhc2tcIikpXHJcblx0XHRcdC5zZXRJY29uKFwicGx1c1wiKVxyXG5cdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0YWRkTmV3U2libGluZ1Rhc2sodmlldywgbGluZU51bWJlcik7XHJcblx0XHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHQvLyBBZGQgbmV3IHN1Yi10YXNrIG9wdGlvblxyXG5cdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0aXRlbS5zZXRUaXRsZSh0KFwiQWRkIG5ldyBzdWItdGFza1wiKSlcclxuXHRcdFx0LnNldEljb24oXCJwbHVzLWNpcmNsZVwiKVxyXG5cdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0YWRkTmV3U3ViVGFzayh2aWV3LCBhcHAsIGxpbmVOdW1iZXIpO1xyXG5cdFx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0Y29uc3Qgc2VsZWN0aW9uID0gdmlldy5zdGF0ZS5zZWxlY3Rpb24ubWFpbjtcclxuXHRjb25zdCBjb29yZHMgPSB2aWV3LmNvb3Jkc0F0UG9zKHNlbGVjdGlvbi5oZWFkKTtcclxuXHJcblx0aWYgKGNvb3Jkcykge1xyXG5cdFx0bWVudS5zaG93QXRQb3NpdGlvbih7IHg6IGNvb3Jkcy5sZWZ0LCB5OiBjb29yZHMuYm90dG9tIH0pO1xyXG5cdH0gZWxzZSB7XHJcblx0XHRtZW51LnNob3dBdE1vdXNlRXZlbnQod2luZG93LmV2ZW50IGFzIE1vdXNlRXZlbnQpO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIHRydWU7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBZGQgYSBuZXcgc2libGluZyB0YXNrIGFmdGVyIHRoZSBjdXJyZW50IGxpbmUgKHNhbWUgaW5kZW50YXRpb24gbGV2ZWwpXHJcbiAqIEBwYXJhbSB2aWV3IFRoZSBlZGl0b3Igdmlld1xyXG4gKiBAcGFyYW0gbGluZU51bWJlciBUaGUgY3VycmVudCBsaW5lIG51bWJlclxyXG4gKi9cclxuZnVuY3Rpb24gYWRkTmV3U2libGluZ1Rhc2sodmlldzogRWRpdG9yVmlldywgbGluZU51bWJlcjogbnVtYmVyKTogdm9pZCB7XHJcblx0Y29uc3QgbGluZSA9IHZpZXcuc3RhdGUuZG9jLmxpbmUobGluZU51bWJlcik7XHJcblx0Y29uc3QgaW5kZW50YXRpb24gPSBnZXRJbmRlbnRhdGlvbihsaW5lLnRleHQpO1xyXG5cclxuXHRjb25zdCBpbnNlcnQgPSBgXFxuJHtpbmRlbnRhdGlvbn0ke1RBU0tfUFJFRklYfWA7XHJcblx0dmlldy5kaXNwYXRjaCh7XHJcblx0XHRjaGFuZ2VzOiB7IGZyb206IGxpbmUudG8sIHRvOiBsaW5lLnRvLCBpbnNlcnQgfSxcclxuXHRcdHNlbGVjdGlvbjoge1xyXG5cdFx0XHRhbmNob3I6IGN1cnNvckFmdGVyVGFza1ByZWZpeChsaW5lLnRvLCBpbmRlbnRhdGlvbiksXHJcblx0XHR9LFxyXG5cdH0pO1xyXG5cclxuXHR2aWV3LmZvY3VzKCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBZGQgYSBuZXcgc3ViLXRhc2sgYWZ0ZXIgdGhlIGN1cnJlbnQgbGluZSAoaW5kZW50ZWQpXHJcbiAqIEBwYXJhbSB2aWV3IFRoZSBlZGl0b3Igdmlld1xyXG4gKiBAcGFyYW0gYXBwIFRoZSBPYnNpZGlhbiBhcHAgaW5zdGFuY2VcclxuICogQHBhcmFtIGxpbmVOdW1iZXIgVGhlIGN1cnJlbnQgbGluZSBudW1iZXJcclxuICovXHJcbmZ1bmN0aW9uIGFkZE5ld1N1YlRhc2sodmlldzogRWRpdG9yVmlldywgYXBwOiBBcHAsIGxpbmVOdW1iZXI6IG51bWJlcik6IHZvaWQge1xyXG5cdGNvbnN0IGxpbmUgPSB2aWV3LnN0YXRlLmRvYy5saW5lKGxpbmVOdW1iZXIpO1xyXG5cdGNvbnN0IGluZGVudGF0aW9uID0gZ2V0SW5kZW50YXRpb24obGluZS50ZXh0KTtcclxuXHRjb25zdCBkZWZhdWx0SW5kZW50YXRpb24gPSBidWlsZEluZGVudFN0cmluZyhhcHApO1xyXG5cdGNvbnN0IG5ld1Rhc2tJbmRlbnRhdGlvbiA9IGluZGVudGF0aW9uICsgZGVmYXVsdEluZGVudGF0aW9uO1xyXG5cclxuXHRjb25zdCBpbnNlcnQgPSBgXFxuJHtuZXdUYXNrSW5kZW50YXRpb259JHtUQVNLX1BSRUZJWH1gO1xyXG5cdHZpZXcuZGlzcGF0Y2goe1xyXG5cdFx0Y2hhbmdlczogeyBmcm9tOiBsaW5lLnRvLCB0bzogbGluZS50bywgaW5zZXJ0IH0sXHJcblx0XHRzZWxlY3Rpb246IHtcclxuXHRcdFx0YW5jaG9yOiBjdXJzb3JBZnRlclRhc2tQcmVmaXgobGluZS50bywgbmV3VGFza0luZGVudGF0aW9uKSxcclxuXHRcdH0sXHJcblx0fSk7XHJcblxyXG5cdHZpZXcuZm9jdXMoKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFN0YXJ0IHRoZSB3b3JrZmxvdyBieSBjcmVhdGluZyB0aGUgZmlyc3Qgc3RhZ2UgdGFza1xyXG4gKiBAcGFyYW0gdmlldyBUaGUgZWRpdG9yIHZpZXdcclxuICogQHBhcmFtIGFwcCBUaGUgT2JzaWRpYW4gYXBwIGluc3RhbmNlXHJcbiAqIEBwYXJhbSBwbHVnaW4gVGhlIHBsdWdpbiBpbnN0YW5jZVxyXG4gKiBAcGFyYW0gbGluZU51bWJlciBUaGUgY3VycmVudCBsaW5lIG51bWJlclxyXG4gKi9cclxuZnVuY3Rpb24gc3RhcnRXb3JrZmxvdyhcclxuXHR2aWV3OiBFZGl0b3JWaWV3LFxyXG5cdGFwcDogQXBwLFxyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdGxpbmVOdW1iZXI6IG51bWJlcixcclxuKTogdm9pZCB7XHJcblx0Y29uc3QgZG9jID0gdmlldy5zdGF0ZS5kb2M7XHJcblx0aWYgKGxpbmVOdW1iZXIgPCAxIHx8IGxpbmVOdW1iZXIgPiBkb2MubGluZXMpIHtcclxuXHRcdHJldHVybjtcclxuXHR9XHJcblx0Y29uc3QgbGluZSA9IGRvYy5saW5lKGxpbmVOdW1iZXIpO1xyXG5cdGNvbnN0IGxpbmVUZXh0ID0gbGluZS50ZXh0O1xyXG5cclxuXHRjb25zdCB3b3JrZmxvd0luZm8gPSBleHRyYWN0V29ya2Zsb3dJbmZvKGxpbmVUZXh0KTtcclxuXHRpZiAoIXdvcmtmbG93SW5mbykge1xyXG5cdFx0cmV0dXJuO1xyXG5cdH1cclxuXHJcblx0Ly8gUmVzb2x2ZSBjb21wbGV0ZSB3b3JrZmxvdyBpbmZvcm1hdGlvblxyXG5cdGNvbnN0IHJlc29sdmVkSW5mbyA9IHJlc29sdmVXb3JrZmxvd0luZm8oXHJcblx0XHRsaW5lVGV4dCxcclxuXHRcdHZpZXcuc3RhdGUuZG9jLFxyXG5cdFx0bGluZU51bWJlcixcclxuXHRcdHBsdWdpbixcclxuXHQpO1xyXG5cclxuXHRpZiAoIXJlc29sdmVkSW5mbyB8fCAhcmVzb2x2ZWRJbmZvLndvcmtmbG93LnN0YWdlcy5sZW5ndGgpIHtcclxuXHRcdHJldHVybjtcclxuXHR9XHJcblxyXG5cdGNvbnN0IHsgd29ya2Zsb3cgfSA9IHJlc29sdmVkSW5mbztcclxuXHRjb25zdCBmaXJzdFN0YWdlID0gd29ya2Zsb3cuc3RhZ2VzWzBdO1xyXG5cclxuXHRjb25zdCBpbmRlbnRhdGlvbiA9IGdldEluZGVudGF0aW9uKGxpbmVUZXh0KTtcclxuXHRjb25zdCBuZXdUYXNrSW5kZW50YXRpb24gPSBpbmRlbnRhdGlvbiArIGJ1aWxkSW5kZW50U3RyaW5nKGFwcCk7XHJcblx0Y29uc3QgbmV3VGFza1RleHQgPSBnZW5lcmF0ZVdvcmtmbG93VGFza1RleHQoXHJcblx0XHRmaXJzdFN0YWdlLFxyXG5cdFx0bmV3VGFza0luZGVudGF0aW9uLFxyXG5cdFx0cGx1Z2luLFxyXG5cdFx0dHJ1ZSxcclxuXHQpO1xyXG5cdGNvbnN0IGluc2VydFRleHQgPSBgXFxuJHtuZXdUYXNrVGV4dH1gO1xyXG5cdGNvbnN0IGN1cnNvclBvc2l0aW9uID0gY3Vyc29yQWZ0ZXJUYXNrUHJlZml4KGxpbmUudG8sIG5ld1Rhc2tJbmRlbnRhdGlvbik7XHJcblxyXG5cdHZpZXcuZGlzcGF0Y2goe1xyXG5cdFx0Y2hhbmdlczoge1xyXG5cdFx0XHRmcm9tOiBsaW5lLnRvLFxyXG5cdFx0XHR0bzogbGluZS50byxcclxuXHRcdFx0aW5zZXJ0OiBpbnNlcnRUZXh0LFxyXG5cdFx0fSxcclxuXHRcdHNlbGVjdGlvbjoge1xyXG5cdFx0XHRhbmNob3I6IGN1cnNvclBvc2l0aW9uLFxyXG5cdFx0fSxcclxuXHR9KTtcclxuXHJcblx0dmlldy5mb2N1cygpO1xyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhbiBlZGl0b3IgZXh0ZW5zaW9uIHRoYXQgaGFuZGxlcyBFbnRlciBrZXkgZm9yIHdvcmtmbG93IHJvb3QgdGFza3NcclxuICogQHBhcmFtIGFwcCBUaGUgT2JzaWRpYW4gYXBwIGluc3RhbmNlXHJcbiAqIEBwYXJhbSBwbHVnaW4gVGhlIHBsdWdpbiBpbnN0YW5jZVxyXG4gKiBAcmV0dXJucyBBbiBlZGl0b3IgZXh0ZW5zaW9uIHRoYXQgY2FuIGJlIHJlZ2lzdGVyZWQgd2l0aCB0aGUgcGx1Z2luXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gd29ya2Zsb3dSb290RW50ZXJIYW5kbGVyRXh0ZW5zaW9uKFxyXG5cdGFwcDogQXBwLFxyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG4pIHtcclxuXHQvLyBEb24ndCBlbmFibGUgaWYgd29ya2Zsb3cgZmVhdHVyZSBpcyBkaXNhYmxlZFxyXG5cdGlmICghcGx1Z2luLnNldHRpbmdzLndvcmtmbG93LmVuYWJsZVdvcmtmbG93KSB7XHJcblx0XHRyZXR1cm4gW107XHJcblx0fVxyXG5cclxuXHRjb25zdCBrZXltYXBFeHRlbnNpb24gPSBQcmVjLmhpZ2goXHJcblx0XHRrZXltYXAub2YoW1xyXG5cdFx0XHR7XHJcblx0XHRcdFx0a2V5OiBcIkVudGVyXCIsXHJcblx0XHRcdFx0cnVuOiAodmlldzogRWRpdG9yVmlldykgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gR2V0IGN1cnJlbnQgY3Vyc29yIHBvc2l0aW9uXHJcblx0XHRcdFx0XHRjb25zdCBzZWxlY3Rpb24gPSB2aWV3LnN0YXRlLnNlbGVjdGlvbi5tYWluO1xyXG5cdFx0XHRcdFx0Y29uc3QgbGluZSA9IHZpZXcuc3RhdGUuZG9jLmxpbmVBdChzZWxlY3Rpb24uaGVhZCk7XHJcblx0XHRcdFx0XHRjb25zdCBsaW5lVGV4dCA9IGxpbmUudGV4dDtcclxuXHJcblx0XHRcdFx0XHQvLyBDaGVjayBpZiB0aGlzIGlzIGEgd29ya2Zsb3cgcm9vdCB0YXNrXHJcblx0XHRcdFx0XHRjb25zdCB0YXNrTWF0Y2ggPSBsaW5lVGV4dC5tYXRjaChUQVNLX1JFR0VYKTtcclxuXHJcblx0XHRcdFx0XHRpZiAoIXRhc2tNYXRjaCkge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7IC8vIE5vdCBhIHRhc2ssIGFsbG93IGRlZmF1bHQgYmVoYXZpb3JcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBDaGVjayBpZiB0aGlzIHRhc2sgaGFzIGEgd29ya2Zsb3cgdGFnIG9yIHN0YWdlIG1hcmtlclxyXG5cdFx0XHRcdFx0Y29uc3Qgd29ya2Zsb3dJbmZvID0gZXh0cmFjdFdvcmtmbG93SW5mbyhsaW5lVGV4dCk7XHJcblx0XHRcdFx0XHRpZiAoIXdvcmtmbG93SW5mbykge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7IC8vIE5vdCBhIHdvcmtmbG93IHRhc2ssIGFsbG93IGRlZmF1bHQgYmVoYXZpb3JcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBDaGVjayBpZiBjdXJzb3IgaXMgYXQgdGhlIGVuZCBvZiB0aGUgbGluZVxyXG5cdFx0XHRcdFx0aWYgKHNlbGVjdGlvbi5oZWFkICE9PSBsaW5lLnRvKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTsgLy8gTm90IGF0IGVuZCBvZiBsaW5lLCBhbGxvdyBkZWZhdWx0IGJlaGF2aW9yXHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gU2hvdyB0aGUgd29ya2Zsb3cgbWVudVxyXG5cdFx0XHRcdFx0cmV0dXJuIHNob3dXb3JrZmxvd01lbnUoXHJcblx0XHRcdFx0XHRcdHZpZXcsXHJcblx0XHRcdFx0XHRcdGFwcCxcclxuXHRcdFx0XHRcdFx0cGx1Z2luLFxyXG5cdFx0XHRcdFx0XHRsaW5lLm51bWJlcixcclxuXHRcdFx0XHRcdFx0d29ya2Zsb3dJbmZvLFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9LFxyXG5cdFx0XSksXHJcblx0KTtcclxuXHJcblx0cmV0dXJuIFtrZXltYXBFeHRlbnNpb25dO1xyXG59XHJcblxyXG4vKipcclxuICogTW92ZSB0byB0aGUgbmV4dCBzdGFnZSBpbiB3b3JrZmxvdyB3aXRoIHN1YnN0YWdlIHN1cHBvcnRcclxuICogQHBhcmFtIHZpZXcgVGhlIGVkaXRvciB2aWV3XHJcbiAqIEBwYXJhbSBhcHAgVGhlIE9ic2lkaWFuIGFwcCBpbnN0YW5jZVxyXG4gKiBAcGFyYW0gcGx1Z2luIFRoZSBwbHVnaW4gaW5zdGFuY2VcclxuICogQHBhcmFtIGxpbmVOdW1iZXIgVGhlIGN1cnJlbnQgbGluZSBudW1iZXJcclxuICogQHBhcmFtIG5leHRTdGFnZSBUaGUgbmV4dCBzdGFnZSB0byBtb3ZlIHRvXHJcbiAqIEBwYXJhbSBpc1Jvb3RUYXNrIFdoZXRoZXIgdGhpcyBpcyBhIHJvb3QgdGFza1xyXG4gKiBAcGFyYW0gbmV4dFN1YlN0YWdlIFRoZSBuZXh0IHN1YnN0YWdlIHRvIG1vdmUgdG9cclxuICogQHBhcmFtIGN1cnJlbnRTdWJTdGFnZSBUaGUgY3VycmVudCBzdWJzdGFnZVxyXG4gKi9cclxuZnVuY3Rpb24gbW92ZVRvTmV4dFN0YWdlV2l0aFN1YlN0YWdlKFxyXG5cdHZpZXc6IEVkaXRvclZpZXcsXHJcblx0YXBwOiBBcHAsXHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0bGluZU51bWJlcjogbnVtYmVyLFxyXG5cdG5leHRTdGFnZTogV29ya2Zsb3dTdGFnZSxcclxuXHRpc1Jvb3RUYXNrOiBib29sZWFuLFxyXG5cdG5leHRTdWJTdGFnZT86IFdvcmtmbG93U3ViU3RhZ2UsXHJcblx0Y3VycmVudFN1YlN0YWdlPzogV29ya2Zsb3dTdWJTdGFnZSxcclxuKTogdm9pZCB7XHJcblx0Y29uc3QgZG9jID0gdmlldy5zdGF0ZS5kb2M7XHJcblx0aWYgKGxpbmVOdW1iZXIgPCAxIHx8IGxpbmVOdW1iZXIgPiBkb2MubGluZXMpIHtcclxuXHRcdHJldHVybjtcclxuXHR9XHJcblx0Y29uc3QgbGluZSA9IGRvYy5saW5lKGxpbmVOdW1iZXIpO1xyXG5cdGNvbnN0IGxpbmVUZXh0ID0gbGluZS50ZXh0O1xyXG5cclxuXHRjb25zdCBlZGl0b3IgPSBnZXRFZGl0b3JGcm9tVmlldyh2aWV3KTtcclxuXHRpZiAoIWVkaXRvcikge1xyXG5cdFx0cmV0dXJuO1xyXG5cdH1cclxuXHJcblx0Y29uc3QgY2hhbmdlcyA9IGNyZWF0ZVdvcmtmbG93U3RhZ2VUcmFuc2l0aW9uKFxyXG5cdFx0cGx1Z2luLFxyXG5cdFx0ZWRpdG9yLFxyXG5cdFx0bGluZVRleHQsXHJcblx0XHRsaW5lTnVtYmVyIC0gMSwgLy8gQ29udmVydCB0byAwLWJhc2VkIGxpbmUgbnVtYmVyIGZvciB0aGUgZnVuY3Rpb25cclxuXHRcdG5leHRTdGFnZSxcclxuXHRcdGlzUm9vdFRhc2ssXHJcblx0XHRuZXh0U3ViU3RhZ2UsXHJcblx0XHRjdXJyZW50U3ViU3RhZ2UsXHJcblx0KTtcclxuXHJcblx0Y29uc3QgaW5kZW50YXRpb24gPSBnZXRJbmRlbnRhdGlvbihsaW5lVGV4dCk7XHJcblx0Y29uc3QgZGVmYXVsdEluZGVudGF0aW9uID0gYnVpbGRJbmRlbnRTdHJpbmcoYXBwKTtcclxuXHRjb25zdCBuZXdUYXNrSW5kZW50YXRpb24gPSBpc1Jvb3RUYXNrXHJcblx0XHQ/IGluZGVudGF0aW9uICsgZGVmYXVsdEluZGVudGF0aW9uXHJcblx0XHQ6IGluZGVudGF0aW9uO1xyXG5cdGNvbnN0IGluc2VydGVkVGFzayA9IGNoYW5nZXMuc29tZShcclxuXHRcdChjaGFuZ2UpID0+IGNoYW5nZS5pbnNlcnQgJiYgY2hhbmdlLmluc2VydC5pbmNsdWRlcyhUQVNLX1BSRUZJWCksXHJcblx0KTtcclxuXHRjb25zdCBjdXJzb3JQb3NpdGlvbiA9IGluc2VydGVkVGFza1xyXG5cdFx0PyBjdXJzb3JBZnRlclRhc2tQcmVmaXgobGluZS50bywgbmV3VGFza0luZGVudGF0aW9uKVxyXG5cdFx0OiBsaW5lLnRvO1xyXG5cclxuXHR2aWV3LmRpc3BhdGNoKHtcclxuXHRcdGNoYW5nZXMsXHJcblx0XHRzZWxlY3Rpb246IHtcclxuXHRcdFx0YW5jaG9yOiBjdXJzb3JQb3NpdGlvbixcclxuXHRcdH0sXHJcblx0XHRhbm5vdGF0aW9uczogdGFza1N0YXR1c0NoYW5nZUFubm90YXRpb24ub2YoXCJ3b3JrZmxvd0NoYW5nZVwiKSxcclxuXHR9KTtcclxuXHJcblx0dmlldy5mb2N1cygpO1xyXG59XHJcblxyXG4vKipcclxuICogTW92ZSB0byB0aGUgbmV4dCBzdGFnZSBpbiB3b3JrZmxvd1xyXG4gKiBAcGFyYW0gdmlldyBUaGUgZWRpdG9yIHZpZXdcclxuICogQHBhcmFtIGFwcCBUaGUgT2JzaWRpYW4gYXBwIGluc3RhbmNlXHJcbiAqIEBwYXJhbSBwbHVnaW4gVGhlIHBsdWdpbiBpbnN0YW5jZVxyXG4gKiBAcGFyYW0gbGluZU51bWJlciBUaGUgY3VycmVudCBsaW5lIG51bWJlclxyXG4gKiBAcGFyYW0gbmV4dFN0YWdlIFRoZSBuZXh0IHN0YWdlIHRvIG1vdmUgdG9cclxuICogQHBhcmFtIGlzUm9vdFRhc2sgV2hldGhlciB0aGlzIGlzIGEgcm9vdCB0YXNrXHJcbiAqL1xyXG5mdW5jdGlvbiBtb3ZlVG9OZXh0U3RhZ2UoXHJcblx0dmlldzogRWRpdG9yVmlldyxcclxuXHRhcHA6IEFwcCxcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRsaW5lTnVtYmVyOiBudW1iZXIsXHJcblx0bmV4dFN0YWdlOiBXb3JrZmxvd1N0YWdlLFxyXG5cdGlzUm9vdFRhc2s6IGJvb2xlYW4sXHJcbik6IHZvaWQge1xyXG5cdGNvbnN0IGRvYyA9IHZpZXcuc3RhdGUuZG9jO1xyXG5cdGlmIChsaW5lTnVtYmVyIDwgMSB8fCBsaW5lTnVtYmVyID4gZG9jLmxpbmVzKSB7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cdGNvbnN0IGxpbmUgPSBkb2MubGluZShsaW5lTnVtYmVyKTtcclxuXHRjb25zdCBsaW5lVGV4dCA9IGxpbmUudGV4dDtcclxuXHJcblx0Y29uc3QgZWRpdG9yID0gZ2V0RWRpdG9yRnJvbVZpZXcodmlldyk7XHJcblx0aWYgKCFlZGl0b3IpIHtcclxuXHRcdHJldHVybjtcclxuXHR9XHJcblxyXG5cdGNvbnN0IGNoYW5nZXMgPSBjcmVhdGVXb3JrZmxvd1N0YWdlVHJhbnNpdGlvbihcclxuXHRcdHBsdWdpbixcclxuXHRcdGVkaXRvcixcclxuXHRcdGxpbmVUZXh0LFxyXG5cdFx0bGluZU51bWJlciAtIDEsIC8vIENvbnZlcnQgdG8gMC1iYXNlZCBsaW5lIG51bWJlciBmb3IgdGhlIGZ1bmN0aW9uXHJcblx0XHRuZXh0U3RhZ2UsXHJcblx0XHRpc1Jvb3RUYXNrLFxyXG5cdFx0dW5kZWZpbmVkLCAvLyBuZXh0U3ViU3RhZ2VcclxuXHRcdHVuZGVmaW5lZCwgLy8gY3VycmVudFN1YlN0YWdlXHJcblx0KTtcclxuXHJcblx0Y29uc3QgaW5kZW50YXRpb24gPSBnZXRJbmRlbnRhdGlvbihsaW5lVGV4dCk7XHJcblx0Y29uc3QgZGVmYXVsdEluZGVudGF0aW9uID0gYnVpbGRJbmRlbnRTdHJpbmcoYXBwKTtcclxuXHRjb25zdCBuZXdUYXNrSW5kZW50YXRpb24gPSBpc1Jvb3RUYXNrXHJcblx0XHQ/IGluZGVudGF0aW9uICsgZGVmYXVsdEluZGVudGF0aW9uXHJcblx0XHQ6IGluZGVudGF0aW9uO1xyXG5cdGNvbnN0IGluc2VydGVkVGFzayA9IGNoYW5nZXMuc29tZShcclxuXHRcdChjaGFuZ2UpID0+IGNoYW5nZS5pbnNlcnQgJiYgY2hhbmdlLmluc2VydC5pbmNsdWRlcyhUQVNLX1BSRUZJWCksXHJcblx0KTtcclxuXHRjb25zdCBjdXJzb3JQb3NpdGlvbiA9IGluc2VydGVkVGFza1xyXG5cdFx0PyBjdXJzb3JBZnRlclRhc2tQcmVmaXgobGluZS50bywgbmV3VGFza0luZGVudGF0aW9uKVxyXG5cdFx0OiBsaW5lLnRvO1xyXG5cclxuXHR2aWV3LmRpc3BhdGNoKHtcclxuXHRcdGNoYW5nZXMsXHJcblx0XHRzZWxlY3Rpb246IHtcclxuXHRcdFx0YW5jaG9yOiBjdXJzb3JQb3NpdGlvbixcclxuXHRcdH0sXHJcblx0XHRhbm5vdGF0aW9uczogdGFza1N0YXR1c0NoYW5nZUFubm90YXRpb24ub2YoXCJ3b3JrZmxvd0NoYW5nZVwiKSxcclxuXHR9KTtcclxuXHJcblx0dmlldy5mb2N1cygpO1xyXG59XHJcblxyXG4vKipcclxuICogQ29tcGxldGUgdGhlIHdvcmtmbG93XHJcbiAqIEBwYXJhbSB2aWV3IFRoZSBlZGl0b3Igdmlld1xyXG4gKiBAcGFyYW0gcGx1Z2luIFRoZSBwbHVnaW4gaW5zdGFuY2VcclxuICogQHBhcmFtIGxpbmVOdW1iZXIgVGhlIGN1cnJlbnQgbGluZSBudW1iZXJcclxuICovXHJcbmZ1bmN0aW9uIGNvbXBsZXRlV29ya2Zsb3coXHJcblx0dmlldzogRWRpdG9yVmlldyxcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRsaW5lTnVtYmVyOiBudW1iZXIsXHJcbik6IHZvaWQge1xyXG5cdGNvbnN0IGRvYyA9IHZpZXcuc3RhdGUuZG9jO1xyXG5cdGlmIChsaW5lTnVtYmVyIDwgMSB8fCBsaW5lTnVtYmVyID4gZG9jLmxpbmVzKSB7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cdGNvbnN0IGxpbmUgPSBkb2MubGluZShsaW5lTnVtYmVyKTtcclxuXHRjb25zdCBsaW5lVGV4dCA9IGxpbmUudGV4dDtcclxuXHJcblx0Y29uc3QgZWRpdG9yID0gZ2V0RWRpdG9yRnJvbVZpZXcodmlldyk7XHJcblxyXG5cdGlmICghZWRpdG9yKSB7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cclxuXHRjb25zdCByZXNvbHZlZEluZm8gPSByZXNvbHZlV29ya2Zsb3dJbmZvKGxpbmVUZXh0LCBkb2MsIGxpbmVOdW1iZXIsIHBsdWdpbik7XHJcblxyXG5cdGlmICghcmVzb2x2ZWRJbmZvKSB7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cclxuXHRjb25zdCB7IGN1cnJlbnRTdGFnZSwgY3VycmVudFN1YlN0YWdlIH0gPSByZXNvbHZlZEluZm87XHJcblxyXG5cdGNvbnN0IGNoYW5nZXMgPSBjcmVhdGVXb3JrZmxvd1N0YWdlVHJhbnNpdGlvbihcclxuXHRcdHBsdWdpbixcclxuXHRcdGVkaXRvcixcclxuXHRcdGxpbmVUZXh0LFxyXG5cdFx0bGluZU51bWJlciAtIDEsIC8vIENvbnZlcnQgdG8gMC1iYXNlZCBsaW5lIG51bWJlciBmb3IgdGhlIGZ1bmN0aW9uXHJcblx0XHRjdXJyZW50U3RhZ2UsIC8vIFBhc3MgdGhlIGN1cnJlbnQgc3RhZ2UgYXMgdGhlIFwibmV4dFwiIHN0YWdlIGZvciB0ZXJtaW5hbCBjb21wbGV0aW9uXHJcblx0XHRmYWxzZSwgLy8gTm90IGEgcm9vdCB0YXNrXHJcblx0XHR1bmRlZmluZWQsIC8vIE5vIG5leHQgc3Vic3RhZ2VcclxuXHRcdGN1cnJlbnRTdWJTdGFnZSxcclxuXHQpO1xyXG5cclxuXHR2aWV3LmRpc3BhdGNoKHtcclxuXHRcdGNoYW5nZXMsXHJcblx0XHRhbm5vdGF0aW9uczogdGFza1N0YXR1c0NoYW5nZUFubm90YXRpb24ub2YoXCJ3b3JrZmxvd0NoYW5nZVwiKSxcclxuXHR9KTtcclxuXHJcblx0dmlldy5mb2N1cygpO1xyXG59XHJcblxyXG4vKipcclxuICogQWRkIGEgY2hpbGQgdGFzayB3aXRoIHRoZSBzYW1lIHN0YWdlXHJcbiAqIEBwYXJhbSB2aWV3IFRoZSBlZGl0b3Igdmlld1xyXG4gKiBAcGFyYW0gYXBwIFRoZSBPYnNpZGlhbiBhcHAgaW5zdGFuY2VcclxuICogQHBhcmFtIHBsdWdpbiBUaGUgcGx1Z2luIGluc3RhbmNlXHJcbiAqIEBwYXJhbSBsaW5lTnVtYmVyIFRoZSBjdXJyZW50IGxpbmUgbnVtYmVyXHJcbiAqIEBwYXJhbSBjdXJyZW50U3RhZ2UgVGhlIGN1cnJlbnQgc3RhZ2VcclxuICogQHBhcmFtIGN1cnJlbnRTdWJTdGFnZSBUaGUgY3VycmVudCBzdWJzdGFnZVxyXG4gKi9cclxuZnVuY3Rpb24gYWRkQ2hpbGRUYXNrV2l0aFNhbWVTdGFnZShcclxuXHR2aWV3OiBFZGl0b3JWaWV3LFxyXG5cdGFwcDogQXBwLFxyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdGxpbmVOdW1iZXI6IG51bWJlcixcclxuXHRjdXJyZW50U3RhZ2U6IFdvcmtmbG93U3RhZ2UsXHJcblx0Y3VycmVudFN1YlN0YWdlPzogV29ya2Zsb3dTdWJTdGFnZSxcclxuKTogdm9pZCB7XHJcblx0Y29uc3QgbGluZSA9IHZpZXcuc3RhdGUuZG9jLmxpbmUobGluZU51bWJlcik7XHJcblx0Y29uc3QgaW5kZW50YXRpb24gPSBnZXRJbmRlbnRhdGlvbihsaW5lLnRleHQpO1xyXG5cdGNvbnN0IGRlZmF1bHRJbmRlbnRhdGlvbiA9IGJ1aWxkSW5kZW50U3RyaW5nKGFwcCk7XHJcblx0Y29uc3QgbmV3VGFza0luZGVudGF0aW9uID0gaW5kZW50YXRpb24gKyBkZWZhdWx0SW5kZW50YXRpb247XHJcblxyXG5cdC8vIENyZWF0ZSB0YXNrIHRleHQgd2l0aCB0aGUgc2FtZSBzdGFnZVxyXG5cdGNvbnN0IG5ld1Rhc2tUZXh0ID0gZ2VuZXJhdGVXb3JrZmxvd1Rhc2tUZXh0KFxyXG5cdFx0Y3VycmVudFN0YWdlLFxyXG5cdFx0bmV3VGFza0luZGVudGF0aW9uLFxyXG5cdFx0cGx1Z2luLFxyXG5cdFx0ZmFsc2UsXHJcblx0XHRjdXJyZW50U3ViU3RhZ2UsXHJcblx0KTtcclxuXHJcblx0Ly8gSW5zZXJ0IHRoZSBuZXcgdGFzayBhZnRlciB0aGUgY3VycmVudCBsaW5lXHJcblx0dmlldy5kaXNwYXRjaCh7XHJcblx0XHRjaGFuZ2VzOiB7XHJcblx0XHRcdGZyb206IGxpbmUudG8sXHJcblx0XHRcdHRvOiBsaW5lLnRvLFxyXG5cdFx0XHRpbnNlcnQ6IGBcXG4ke25ld1Rhc2tUZXh0fWAsXHJcblx0XHR9LFxyXG5cdFx0c2VsZWN0aW9uOiB7XHJcblx0XHRcdGFuY2hvcjogY3Vyc29yQWZ0ZXJUYXNrUHJlZml4KGxpbmUudG8sIG5ld1Rhc2tJbmRlbnRhdGlvbiksXHJcblx0XHR9LFxyXG5cdH0pO1xyXG5cclxuXHR2aWV3LmZvY3VzKCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBNb3ZlIHRvIHRoZSBuZXh0IG1haW4gc3RhZ2UgYW5kIGNvbXBsZXRlIGJvdGggY3VycmVudCBzdWJzdGFnZSBhbmQgcGFyZW50IHN0YWdlXHJcbiAqIEBwYXJhbSB2aWV3IFRoZSBlZGl0b3Igdmlld1xyXG4gKiBAcGFyYW0gcGx1Z2luIFRoZSBwbHVnaW4gaW5zdGFuY2VcclxuICogQHBhcmFtIGxpbmVOdW1iZXIgVGhlIGN1cnJlbnQgbGluZSBudW1iZXJcclxuICogQHBhcmFtIG5leHRTdGFnZSBUaGUgbmV4dCBtYWluIHN0YWdlIHRvIG1vdmUgdG9cclxuICogQHBhcmFtIGN1cnJlbnRTdWJTdGFnZSBUaGUgY3VycmVudCBzdWJzdGFnZVxyXG4gKi9cclxuZnVuY3Rpb24gY29tcGxldGVTdWJzdGFnZUFuZE1vdmVUb05leHRNYWluU3RhZ2UoXHJcblx0dmlldzogRWRpdG9yVmlldyxcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRsaW5lTnVtYmVyOiBudW1iZXIsXHJcblx0bmV4dFN0YWdlOiBXb3JrZmxvd1N0YWdlLFxyXG5cdGN1cnJlbnRTdWJTdGFnZTogV29ya2Zsb3dTdWJTdGFnZSxcclxuKTogdm9pZCB7XHJcblx0Y29uc3QgZG9jID0gdmlldy5zdGF0ZS5kb2M7XHJcblx0aWYgKGxpbmVOdW1iZXIgPCAxIHx8IGxpbmVOdW1iZXIgPiBkb2MubGluZXMpIHtcclxuXHRcdHJldHVybjtcclxuXHR9XHJcblx0Y29uc3QgbGluZSA9IGRvYy5saW5lKGxpbmVOdW1iZXIpO1xyXG5cdGNvbnN0IGxpbmVUZXh0ID0gbGluZS50ZXh0O1xyXG5cclxuXHRjb25zdCBlZGl0b3IgPSBnZXRFZGl0b3JGcm9tVmlldyh2aWV3KTtcclxuXHJcblx0aWYgKCFlZGl0b3IpIHtcclxuXHRcdHJldHVybjtcclxuXHR9XHJcblxyXG5cdGxldCBjaGFuZ2VzOiB7IGZyb206IG51bWJlcjsgdG86IG51bWJlcjsgaW5zZXJ0OiBzdHJpbmcgfVtdID0gW107XHJcblxyXG5cdGNvbnN0IGN1cnJlbnRJbmRlbnQgPSBnZXRJbmRlbnRhdGlvbihsaW5lVGV4dCkubGVuZ3RoO1xyXG5cclxuXHRmb3IgKGxldCBpID0gbGluZU51bWJlciAtIDE7IGkgPj0gMTsgaS0tKSB7XHJcblx0XHRjb25zdCBjaGVja0xpbmUgPSBkb2MubGluZShpKTtcclxuXHRcdGNvbnN0IGNoZWNrSW5kZW50ID0gZ2V0SW5kZW50YXRpb24oY2hlY2tMaW5lLnRleHQpLmxlbmd0aDtcclxuXHJcblx0XHRpZiAoY2hlY2tJbmRlbnQgPCBjdXJyZW50SW5kZW50KSB7XHJcblx0XHRcdGNvbnN0IHBhcmVudFRhc2tNYXRjaCA9IGNoZWNrTGluZS50ZXh0Lm1hdGNoKFRBU0tfUkVHRVgpO1xyXG5cdFx0XHRpZiAocGFyZW50VGFza01hdGNoKSB7XHJcblx0XHRcdFx0aWYgKGNoZWNrTGluZS50ZXh0LmluY2x1ZGVzKFwiW3N0YWdlOjpcIikpIHtcclxuXHRcdFx0XHRcdGNvbnN0IHBhcmVudFRyYW5zaXRpb25DaGFuZ2VzID1cclxuXHRcdFx0XHRcdFx0Y3JlYXRlV29ya2Zsb3dTdGFnZVRyYW5zaXRpb24oXHJcblx0XHRcdFx0XHRcdFx0cGx1Z2luLFxyXG5cdFx0XHRcdFx0XHRcdGVkaXRvcixcclxuXHRcdFx0XHRcdFx0XHRjaGVja0xpbmUudGV4dCxcclxuXHRcdFx0XHRcdFx0XHRpIC0gMSwgLy8gQ29udmVydCB0byAwLWJhc2VkIGxpbmUgbnVtYmVyIGZvciB0aGUgZnVuY3Rpb25cclxuXHRcdFx0XHRcdFx0XHRuZXh0U3RhZ2UsIC8vIFRoZSBuZXh0IHN0YWdlIHdlJ3JlIHRyYW5zaXRpb25pbmcgdG9cclxuXHRcdFx0XHRcdFx0XHRmYWxzZSwgLy8gTm90IGEgcm9vdCB0YXNrXHJcblx0XHRcdFx0XHRcdFx0dW5kZWZpbmVkLCAvLyBObyBuZXh0IHN1YnN0YWdlIGZvciBwYXJlbnRcclxuXHRcdFx0XHRcdFx0XHR1bmRlZmluZWQsIC8vIE5vIGN1cnJlbnQgc3Vic3RhZ2UgZm9yIHBhcmVudFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdGNvbnN0IHBhcmVudENvbXBsZXRpb25DaGFuZ2VzID1cclxuXHRcdFx0XHRcdFx0cGFyZW50VHJhbnNpdGlvbkNoYW5nZXMuZmlsdGVyKFxyXG5cdFx0XHRcdFx0XHRcdChjaGFuZ2UpID0+XHJcblx0XHRcdFx0XHRcdFx0XHQhY2hhbmdlLmluc2VydCB8fFxyXG5cdFx0XHRcdFx0XHRcdFx0IWNoYW5nZS5pbnNlcnQuaW5jbHVkZXMoVEFTS19QUkVGSVgpLFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdGNoYW5nZXMucHVzaCguLi5wYXJlbnRDb21wbGV0aW9uQ2hhbmdlcyk7XHJcblx0XHRcdFx0XHRicmVhazsgLy8gRm91bmQgYW5kIGhhbmRsZWQgdGhlIHBhcmVudCwgc3RvcCBsb29raW5nXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyAyLiBVc2UgdGhlIGV4aXN0aW5nIGNyZWF0ZVdvcmtmbG93U3RhZ2VUcmFuc2l0aW9uIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgY3VycmVudCB0YXNrIGFuZCBjcmVhdGUgdGhlIG5leHQgc3RhZ2VcclxuXHQvLyBUaGlzIHdpbGwgYXV0b21hdGljYWxseSBjb21wbGV0ZSB0aGUgY3VycmVudCBzdWJzdGFnZSB0YXNrIGFuZCBjcmVhdGUgdGhlIG5leHQgc3RhZ2VcclxuXHRjb25zdCB0cmFuc2l0aW9uQ2hhbmdlcyA9IGNyZWF0ZVdvcmtmbG93U3RhZ2VUcmFuc2l0aW9uKFxyXG5cdFx0cGx1Z2luLFxyXG5cdFx0ZWRpdG9yLFxyXG5cdFx0bGluZVRleHQsXHJcblx0XHRsaW5lTnVtYmVyIC0gMSwgLy8gQ29udmVydCB0byAwLWJhc2VkIGxpbmUgbnVtYmVyIGZvciB0aGUgZnVuY3Rpb25cclxuXHRcdG5leHRTdGFnZSxcclxuXHRcdGZhbHNlLCAvLyBOb3QgYSByb290IHRhc2tcclxuXHRcdHVuZGVmaW5lZCwgLy8gTm8gbmV4dCBzdWJzdGFnZSAtIG1vdmluZyB0byBtYWluIHN0YWdlXHJcblx0XHRjdXJyZW50U3ViU3RhZ2UsXHJcblx0KTtcclxuXHJcblx0Ly8gQ29tYmluZSBhbGwgY2hhbmdlc1xyXG5cdGNoYW5nZXMucHVzaCguLi50cmFuc2l0aW9uQ2hhbmdlcyk7XHJcblxyXG5cdHZpZXcuZGlzcGF0Y2goe1xyXG5cdFx0Y2hhbmdlcyxcclxuXHRcdGFubm90YXRpb25zOiB0YXNrU3RhdHVzQ2hhbmdlQW5ub3RhdGlvbi5vZihcIndvcmtmbG93Q2hhbmdlXCIpLFxyXG5cdH0pO1xyXG5cclxuXHR2aWV3LmZvY3VzKCk7XHJcbn1cclxuIl19