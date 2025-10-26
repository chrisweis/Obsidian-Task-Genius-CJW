import { moment } from "obsidian";
import { EditorState, } from "@codemirror/state";
import { Annotation } from "@codemirror/state";
import { taskStatusChangeAnnotation } from "@/editor-extensions/task-operations/status-switcher";
import { priorityChangeAnnotation } from "@/editor-extensions/ui-widgets/priority-picker";
import { buildIndentString } from "@/utils";
// @ts-ignore
import { foldable } from "@codemirror/language";
import { t } from "@/translations/helper";
import { convertTaskToWorkflowCommand, createQuickWorkflowCommand, startWorkflowHereCommand, } from "@/commands/workflowCommands";
// Annotation that marks a transaction as a workflow change
export const workflowChangeAnnotation = Annotation.define();
const WORKFLOW_TAG_REGEX = /#workflow\/([^\/\s]+)/;
const STAGE_MARKER_REGEX = /\[stage::([^\]]+)\]/;
const STAGE_MARKER_DISPLAY_REGEX = /\s*\[stage::[^\]]+\]/;
const TASK_REGEX = /^(\s*)([-*+]|\d+\.)\s+\[(.)]/;
const TIME_SPENT_REGEX = /\(⏱️\s+([0-9:]+)\)/;
const ROOT_STAGE_ID = "_root_task_";
const STAGE_SEPARATOR = ".";
function getIndentation(text) {
    const match = text.match(/^(\s*)/);
    return match ? match[1] : "";
}
function removeTrailingIndentation(indentation, app, levels = 1) {
    const indentUnit = buildIndentString(app);
    const removal = indentUnit.repeat(levels);
    if (indentation.endsWith(removal)) {
        return indentation.slice(0, Math.max(0, indentation.length - removal.length));
    }
    // Fallback: remove whitespace characters equal to indentUnit length * levels
    const fallbackLength = indentUnit.length * levels;
    return indentation.slice(0, Math.max(0, indentation.length - fallbackLength));
}
function ensureWithinBounds(lineNumber, doc) {
    if (lineNumber < 1) {
        return 1;
    }
    if (lineNumber > doc.lines) {
        return doc.lines;
    }
    return lineNumber;
}
function safelyFindStageMarker(lineText) {
    const match = lineText.match(STAGE_MARKER_DISPLAY_REGEX);
    return match && typeof match.index === "number"
        ? match
        : null;
}
/**
 * Calculate the foldable range for a position
 * @param state The editor state
 * @param pos The position to calculate the range for
 * @returns The text range or null if no foldable range is found
 */
function calculateRangeForTransform(state, pos) {
    const line = state.doc.lineAt(pos);
    const foldRange = foldable(state, line.from, line.to);
    if (!foldRange) {
        return null;
    }
    return { from: line.from, to: foldRange.to };
}
/**
 * Creates an editor extension that handles task workflow stage updates
 * @param app The Obsidian app instance
 * @param plugin The plugin instance
 * @returns An editor extension that can be registered with the plugin
 */
export function workflowExtension(app, plugin) {
    return EditorState.transactionFilter.of((tr) => {
        return handleWorkflowTransaction(tr, app, plugin);
    });
}
/**
 * Extract workflow tag from a line of text
 * @param lineText The line text to analyze
 * @returns An object containing workflow information or null if no workflow tag found
 */
export function extractWorkflowInfo(lineText) {
    const stageMatch = lineText.match(STAGE_MARKER_REGEX);
    if (stageMatch) {
        const stageId = stageMatch[1];
        if (stageId.includes(STAGE_SEPARATOR)) {
            const [stage, subStage] = stageId.split(STAGE_SEPARATOR);
            return {
                workflowType: "fromParent",
                currentStage: stage,
                subStage,
            };
        }
        return {
            workflowType: "fromParent",
            currentStage: stageId,
        };
    }
    const workflowMatch = lineText.match(WORKFLOW_TAG_REGEX);
    if (workflowMatch) {
        return {
            workflowType: workflowMatch[1],
            currentStage: "root",
        };
    }
    return null;
}
/**
 * Find the parent workflow for a task by looking up the document
 * @param doc The document text
 * @param lineNum The current line number
 * @returns The workflow type or null if not found
 */
export function findParentWorkflow(doc, lineNum) {
    const safeLineNum = ensureWithinBounds(lineNum, doc);
    if (safeLineNum <= 1) {
        return null;
    }
    const currentLineIndex = safeLineNum - 1;
    const currentLine = doc.line(currentLineIndex + 1);
    const currentIndent = getIndentation(currentLine.text).length;
    for (let i = currentLineIndex; i >= 0; i--) {
        const line = doc.line(i + 1);
        const lineText = line.text;
        const indent = getIndentation(lineText).length;
        const workflowMatch = lineText.match(WORKFLOW_TAG_REGEX);
        if (workflowMatch) {
            if (indent < currentIndent ||
                (indent === currentIndent && i < currentLineIndex)) {
                return workflowMatch[1];
            }
        }
    }
    return null;
}
/**
 * Handles transactions to detect task status changes to workflow-tagged tasks
 * @param tr The transaction to handle
 * @param app The Obsidian app instance
 * @param plugin The plugin instance
 * @returns The original transaction or a modified transaction
 */
export function handleWorkflowTransaction(tr, app, plugin) {
    var _a;
    // Only process if workflow feature is enabled
    if (!plugin.settings.workflow.enableWorkflow) {
        return tr;
    }
    // Only process transactions that change the document
    if (!tr.docChanged) {
        return tr;
    }
    // Skip if this transaction already has a workflow or task status annotation
    if (tr.annotation(workflowChangeAnnotation) ||
        tr.annotation(priorityChangeAnnotation) ||
        ((_a = tr.annotation(taskStatusChangeAnnotation)) === null || _a === void 0 ? void 0 : _a.startsWith("workflowChange"))) {
        return tr;
    }
    const changes = [];
    tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
        changes.push({
            fromA,
            toA,
            fromB,
            toB,
            text: inserted.toString(),
        });
    });
    const completedStatuses = plugin.settings.taskStatuses.completed.split("|");
    const isCompletionChange = (text) => completedStatuses.includes(text) ||
        completedStatuses.some((status) => text === `- [${status}]` || text === `[${status}]`);
    if (!changes.some((c) => isCompletionChange(c.text))) {
        return tr;
    }
    const workflowUpdates = [];
    for (const change of changes) {
        if (!isCompletionChange(change.text)) {
            continue;
        }
        const line = tr.newDoc.lineAt(change.fromB);
        const lineText = line.text;
        const taskMatch = lineText.match(TASK_REGEX);
        if (!taskMatch) {
            continue;
        }
        const resolvedInfo = resolveWorkflowInfo(lineText, tr.newDoc, line.number, plugin);
        if (resolvedInfo) {
            workflowUpdates.push({
                lineNumber: line.number,
                lineText,
                resolvedInfo,
            });
        }
    }
    const newChanges = [];
    // Process each workflow update
    if (workflowUpdates.length > 0) {
        for (const update of workflowUpdates) {
            const { resolvedInfo, lineNumber, lineText } = update;
            const line = tr.newDoc.line(lineNumber);
            const { workflowType, currentStage, currentSubStage, workflow, isRootTask, } = resolvedInfo;
            if (!workflow.stages.length) {
                continue;
            }
            // Handle timestamp removal and time calculation
            const timeChanges = processTimestampAndCalculateTime(line.text, tr.newDoc, line.from, line.number, workflowType, plugin);
            newChanges.push(...timeChanges);
            // Remove the [stage::] marker from the current line
            if (plugin.settings.workflow.autoRemoveLastStageMarker) {
                const stageMarker = safelyFindStageMarker(line.text);
                if (stageMarker) {
                    newChanges.push({
                        from: line.from + stageMarker.index,
                        to: line.from +
                            stageMarker.index +
                            stageMarker[0].length,
                        insert: "",
                    });
                }
            }
            if (currentStage.type === "terminal") {
                const indentation = getIndentation(line.text).length;
                const taskMatch = line.text.match(TASK_REGEX);
                if (!taskMatch) {
                    continue;
                }
                const completedStatuses = plugin.settings.taskStatuses.completed.split("|");
                for (let i = lineNumber - 1; i >= 1; i--) {
                    const checkLine = tr.newDoc.line(i);
                    const checkIndent = getIndentation(checkLine.text).length;
                    if (checkIndent < indentation &&
                        checkLine.text.includes(`#workflow/${workflowType}`)) {
                        const rootTaskMatch = checkLine.text.match(TASK_REGEX);
                        if (rootTaskMatch) {
                            const rootTaskStatus = rootTaskMatch[3];
                            if (!completedStatuses.includes(rootTaskStatus)) {
                                const rootTaskStart = checkLine.from +
                                    rootTaskMatch[0].indexOf("[");
                                newChanges.push({
                                    from: rootTaskStart + 1,
                                    to: rootTaskStart + 2,
                                    insert: "x",
                                });
                            }
                        }
                        break;
                    }
                }
                continue;
            }
            const { nextStageId, nextSubStageId } = determineNextStage(currentStage, workflow, currentSubStage);
            const nextStage = workflow.stages.find((s) => s.id === nextStageId);
            if (!nextStage)
                continue;
            let nextSubStage;
            if (nextSubStageId && nextStage.subStages) {
                nextSubStage = nextStage.subStages.find((ss) => ss.id === nextSubStageId);
            }
            const indentation = getIndentation(lineText);
            const defaultIndentation = buildIndentString(app);
            const newTaskIndentation = isRootTask
                ? indentation + defaultIndentation
                : indentation;
            const completeTaskText = generateWorkflowTaskText(nextStage, newTaskIndentation, plugin, true, nextSubStage);
            const insertionPoint = determineTaskInsertionPoint(line, tr.newDoc, indentation);
            if (!(tr.annotation(taskStatusChangeAnnotation) ===
                "autoCompleteParent.DONE")) {
                newChanges.push({
                    from: insertionPoint,
                    to: insertionPoint,
                    insert: `\n${completeTaskText}`,
                });
            }
        }
    }
    if (newChanges.length > 0) {
        return {
            changes: [tr.changes, ...newChanges],
            selection: tr.selection,
            annotations: workflowChangeAnnotation.of("workflowChange"),
        };
    }
    return tr;
}
/**
 * Process timestamp and calculate spent time for workflow tasks
 * @param lineText The text of the line containing the task
 * @param doc The document text
 * @param lineFrom Starting position of the line in the document
 * @param lineNumber The line number in the document (1-based)
 * @param workflowType The workflow ID
 * @param plugin The plugin instance
 * @returns Array of changes to apply
 */
export function processTimestampAndCalculateTime(lineText, doc, lineFrom, lineNumber, workflowType, plugin) {
    const changes = [];
    const timestampFormat = plugin.settings.workflow.timestampFormat || "YYYY-MM-DD HH:mm:ss";
    const timestampToken = `🛫 ${moment().format(timestampFormat)}`;
    const timestampLength = timestampToken.length;
    const startMarkIndex = lineText.indexOf("🛫");
    if (startMarkIndex === -1) {
        return changes;
    }
    const endMarkIndex = startMarkIndex + timestampLength;
    const timestampText = lineText.substring(startMarkIndex, endMarkIndex);
    const startTime = moment(timestampText.replace("🛫 ", ""), timestampFormat, true);
    if (!startTime.isValid()) {
        return changes;
    }
    const endTime = moment();
    const duration = moment.duration(endTime.diff(startTime));
    const isFinalStage = isLastWorkflowStageOrNotWorkflow(lineText, lineNumber, doc, plugin);
    // Remove timestamp if enabled
    if (plugin.settings.workflow.removeTimestampOnTransition) {
        const timestampStart = lineFrom + startMarkIndex;
        const timestampEnd = timestampStart + timestampLength;
        changes.push({
            from: timestampStart - 1,
            to: timestampEnd,
            insert: "",
        });
    }
    // Add spent time if enabled
    if (plugin.settings.workflow.calculateSpentTime) {
        const spentTime = moment
            .utc(duration.asMilliseconds())
            .format(plugin.settings.workflow.spentTimeFormat);
        // Determine insertion position (before any stage marker)
        const stageMarkerIndex = lineText.indexOf("[stage::");
        const insertPosition = lineFrom +
            (stageMarkerIndex !== -1 ? stageMarkerIndex : lineText.length);
        if (!isFinalStage || !plugin.settings.workflow.calculateFullSpentTime) {
            changes.push({
                from: insertPosition,
                to: insertPosition,
                insert: ` (⏱️ ${spentTime})`,
            });
        }
        // Calculate and add total time for final stage if enabled
        if (plugin.settings.workflow.calculateFullSpentTime && isFinalStage) {
            const workflowTag = `#workflow/${workflowType}`;
            let totalDuration = moment.duration(0);
            let foundStartTime = false;
            // Get current task indentation level
            const currentIndentLevel = getIndentation(lineText).length;
            // Look up to find the root task
            for (let i = lineNumber - 1; i >= 1; i--) {
                if (i > doc.lines)
                    continue;
                const checkLine = doc.line(i);
                if (checkLine.text.includes(workflowTag)) {
                    // Found root task, now look for all tasks with time spent markers
                    for (let j = i; j <= lineNumber; j++) {
                        if (j > doc.lines)
                            continue;
                        const taskLine = doc.line(j);
                        const indentLevel = getIndentation(taskLine.text).length;
                        if (indentLevel > currentIndentLevel) {
                            continue;
                        }
                        const timeSpentMatch = taskLine.text.match(TIME_SPENT_REGEX);
                        if (timeSpentMatch && timeSpentMatch[1]) {
                            // Parse the time spent
                            const timeParts = timeSpentMatch[1].split(":");
                            let timeInMs = 0;
                            if (timeParts.length === 3) {
                                // HH:mm:ss format
                                timeInMs =
                                    (parseInt(timeParts[0]) * 3600 +
                                        parseInt(timeParts[1]) * 60 +
                                        parseInt(timeParts[2])) *
                                        1000;
                            }
                            else if (timeParts.length === 2) {
                                // mm:ss format
                                timeInMs =
                                    (parseInt(timeParts[0]) * 60 +
                                        parseInt(timeParts[1])) *
                                        1000;
                            }
                            if (timeInMs > 0) {
                                totalDuration.add(timeInMs);
                                foundStartTime = true;
                            }
                        }
                    }
                    break;
                }
            }
            // If we couldn't find any time spent markers, use the current duration
            if (!foundStartTime) {
                totalDuration = duration;
                foundStartTime = true;
            }
            else {
                // Add the current task's duration to the total
                totalDuration.add(duration);
            }
            if (foundStartTime) {
                const totalSpentTime = moment
                    .utc(totalDuration.asMilliseconds())
                    .format(plugin.settings.workflow.spentTimeFormat);
                // Add total time to the current line
                changes.push({
                    from: insertPosition,
                    to: insertPosition,
                    insert: ` (${t("Total")}: ${totalSpentTime})`,
                });
            }
        }
    }
    return changes;
}
/**
 * Updates the context menu with workflow options
 * @param menu The context menu to update
 * @param editor The editor instance
 * @param plugin The plugin instance
 */
export function updateWorkflowContextMenu(menu, editor, plugin) {
    if (!plugin.settings.workflow.enableWorkflow) {
        return;
    }
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    // Check if this line contains a task
    const taskRegex = /^([\s|\t]*)([-*+]|\d+\.)\s+\[(.)]/;
    const taskMatch = line.match(taskRegex);
    if (!taskMatch) {
        return;
    }
    // Check if this task has a workflow tag or stage marker
    const workflowInfo = extractWorkflowInfo(line);
    if (!workflowInfo) {
        // Add option to add workflow
        menu.addItem((item) => {
            item.setTitle(t("Workflow"));
            item.setIcon("list-ordered");
            // Create submenu
            const submenu = item.setSubmenu();
            // Add option to add workflow root
            submenu.addItem((addItem) => {
                addItem.setTitle(t("Add as workflow root"));
                addItem.setIcon("plus-circle");
                // Create a submenu for available workflows
                const workflowSubmenu = addItem.setSubmenu();
                plugin.settings.workflow.definitions.forEach((workflow) => {
                    workflowSubmenu.addItem((wfItem) => {
                        wfItem.setTitle(workflow.name);
                        wfItem.onClick(() => {
                            // Add workflow tag using dispatch
                            editor.cm.dispatch({
                                changes: {
                                    from: editor.posToOffset(cursor),
                                    to: editor.posToOffset(cursor),
                                    insert: `#workflow/${workflow.id}`,
                                },
                            });
                        });
                    });
                });
            });
            // Add quick workflow actions
            submenu.addSeparator();
            // Convert task to workflow template
            submenu.addItem((convertItem) => {
                convertItem.setTitle(t("Convert to workflow template"));
                convertItem.setIcon("convert");
                convertItem.onClick(() => {
                    // Import the conversion function
                    convertTaskToWorkflowCommand(false, editor, null, plugin);
                });
            });
            // Start workflow here
            submenu.addItem((startItem) => {
                startItem.setTitle(t("Start workflow here"));
                startItem.setIcon("play");
                startItem.onClick(() => {
                    startWorkflowHereCommand(false, editor, null, plugin);
                });
            });
            // Quick workflow creation
            submenu.addItem((quickItem) => {
                quickItem.setTitle(t("Create quick workflow"));
                quickItem.setIcon("zap");
                quickItem.onClick(() => {
                    createQuickWorkflowCommand(false, editor, null, plugin);
                });
            });
        });
        return;
    }
    // If we're here, the task has a workflow tag or stage marker
    // Resolve complete workflow information
    const resolvedInfo = resolveWorkflowInfo(line, editor.cm.state.doc, cursor.line + 1, plugin);
    if (!resolvedInfo) {
        return;
    }
    const { workflowType, currentStage, currentSubStage, workflow, isRootTask, } = resolvedInfo;
    menu.addItem((item) => {
        item.setTitle(t("Workflow"));
        item.setIcon("list-ordered");
        // Create submenu
        const submenu = item.setSubmenu();
        // Show available next stages
        if (currentStage.id === "_root_task_") {
            if (workflow.stages.length > 0) {
                const firstStage = workflow.stages[0];
                submenu.addItem((nextItem) => {
                    nextItem.setTitle(`${t("Move to stage")} ${firstStage.name}`);
                    nextItem.onClick(() => {
                        const changes = createWorkflowStageTransition(plugin, editor, line, cursor.line, firstStage, true, undefined, undefined);
                        editor.cm.dispatch({
                            changes,
                            annotations: taskStatusChangeAnnotation.of("workflowChange"),
                        });
                    });
                });
            }
        }
        else if (currentStage.canProceedTo) {
            currentStage.canProceedTo.forEach((nextStageId) => {
                const nextStage = workflow.stages.find((s) => s.id === nextStageId);
                if (nextStage) {
                    submenu.addItem((nextItem) => {
                        // Check if this is the last stage
                        const isLastStage = isLastWorkflowStageOrNotWorkflow(line, cursor.line, editor.cm.state.doc, plugin);
                        // If last stage, show "Complete stage" instead of "Move to"
                        nextItem.setTitle(isLastStage
                            ? `${t("Complete stage")}: ${nextStage.name}`
                            : `${t("Move to stage")} ${nextStage.name}`);
                        nextItem.onClick(() => {
                            const changes = createWorkflowStageTransition(plugin, editor, line, cursor.line, nextStage, false, undefined, currentSubStage);
                            editor.cm.dispatch({
                                changes,
                                annotations: taskStatusChangeAnnotation.of(isLastStage
                                    ? "workflowChange.completeStage"
                                    : "workflowChange.moveToStage"),
                            });
                        });
                    });
                }
            });
        }
        else if (currentStage.type === "terminal") {
            submenu.addItem((nextItem) => {
                nextItem.setTitle(t("Complete workflow"));
                nextItem.onClick(() => {
                    const changes = createWorkflowStageTransition(plugin, editor, line, cursor.line, currentStage, false, undefined, currentSubStage);
                    editor.cm.dispatch({
                        changes,
                        annotations: taskStatusChangeAnnotation.of("workflowChange"),
                    });
                });
            });
        }
        else {
            // Use determineNextStage to find the next stage
            const { nextStageId } = determineNextStage(currentStage, workflow, currentSubStage);
            // Only add menu option if there's a valid next stage that's different from current
            if (nextStageId && nextStageId !== currentStage.id) {
                const nextStage = workflow.stages.find((s) => s.id === nextStageId);
                if (nextStage) {
                    submenu.addItem((nextItem) => {
                        nextItem.setTitle(`${t("Move to")} ${nextStage.name}`);
                        nextItem.onClick(() => {
                            const changes = createWorkflowStageTransition(plugin, editor, line, cursor.line, nextStage, false, undefined, undefined);
                            editor.cm.dispatch({
                                changes,
                                annotations: taskStatusChangeAnnotation.of("workflowChange"),
                            });
                        });
                    });
                }
            }
        }
        // Add option to add a child task with same stage
        submenu.addSeparator();
        submenu.addItem((addItem) => {
            addItem.setTitle(t("Add child task with same stage"));
            addItem.setIcon("plus-circle");
            addItem.onClick(() => {
                if (workflowInfo.currentStage === "root") {
                    if (workflow.stages.length > 0) {
                        const firstStage = workflow.stages[0];
                        const changes = createWorkflowStageTransition(plugin, editor, line, cursor.line, firstStage, false, undefined, undefined);
                        editor.cm.dispatch({
                            changes,
                            annotations: taskStatusChangeAnnotation.of("workflowChange"),
                        });
                    }
                }
                else if (currentStage.id === "_root_task_") {
                    if (workflow.stages.length > 0) {
                        const firstStage = workflow.stages[0];
                        const changes = createWorkflowStageTransition(plugin, editor, line, cursor.line, firstStage, false, undefined, undefined);
                        editor.cm.dispatch({
                            changes,
                            annotations: taskStatusChangeAnnotation.of("workflowChange"),
                        });
                    }
                }
                else {
                    const changes = createWorkflowStageTransition(plugin, editor, line, cursor.line, currentStage, false, currentSubStage, undefined);
                    editor.cm.dispatch({
                        changes,
                        annotations: taskStatusChangeAnnotation.of("workflowChange"),
                    });
                }
            });
        });
    });
}
/**
 * Checks if a task line represents the final stage of a workflow or is not part of a workflow.
 * Returns true if it's the final stage or not a workflow task, false otherwise.
 * @param lineText The text of the line containing the task
 * @param lineNumber The line number (1-based)
 * @param doc The document text
 * @param plugin The plugin instance
 * @returns boolean
 */
export function isLastWorkflowStageOrNotWorkflow(lineText, lineNumber, doc, plugin) {
    const workflowInfo = extractWorkflowInfo(lineText);
    if (!workflowInfo) {
        return true;
    }
    let workflowType = workflowInfo.workflowType;
    let currentStageId = workflowInfo.currentStage;
    let currentSubStageId = workflowInfo.subStage;
    if (workflowType === "fromParent") {
        const safeLineNumber = ensureWithinBounds(lineNumber, doc);
        const parentWorkflow = findParentWorkflow(doc, safeLineNumber);
        if (!parentWorkflow) {
            return true;
        }
        workflowType = parentWorkflow;
    }
    const workflow = plugin.settings.workflow.definitions.find((wf) => wf.id === workflowType);
    if (!workflow) {
        return true;
    }
    if (currentStageId === "root") {
        return false;
    }
    const currentStage = workflow.stages.find((s) => s.id === currentStageId);
    if (!currentStage) {
        return true;
    }
    if (currentStage.type === "terminal") {
        return true;
    }
    if (currentStage.type === "cycle" &&
        currentStage.subStages &&
        currentSubStageId) {
        const currentSubStage = currentStage.subStages.find((ss) => ss.id === currentSubStageId);
        if (!currentSubStage) {
            return true;
        }
        const isLastSubStage = !currentSubStage.next;
        const parentStageCanProceed = currentStage.canProceedTo && currentStage.canProceedTo.length > 0;
        const parentStageHasLinearNext = typeof currentStage.next === "string" ||
            (Array.isArray(currentStage.next) && currentStage.next.length > 0);
        if (isLastSubStage &&
            !parentStageCanProceed &&
            !parentStageHasLinearNext) {
            const currentIndex = workflow.stages.findIndex((s) => s.id === currentStage.id);
            if (currentIndex === workflow.stages.length - 1) {
                return true;
            }
        }
        return false;
    }
    const hasExplicitNext = currentStage.next ||
        (currentStage.canProceedTo && currentStage.canProceedTo.length > 0);
    if (hasExplicitNext) {
        return false;
    }
    const currentIndex = workflow.stages.findIndex((s) => s.id === currentStage.id);
    if (currentIndex < 0) {
        return true;
    }
    if (currentIndex === workflow.stages.length - 1) {
        return true;
    }
    return false;
}
/**
 * Determines the next stage in a workflow based on the current stage and workflow definition
 * @param currentStage The current workflow stage
 * @param workflow The workflow definition
 * @param currentSubStage Optional current substage object
 * @returns Object containing the next stage ID and optional next substage ID
 */
export function determineNextStage(currentStage, workflow, currentSubStage) {
    var _a, _b, _c, _d, _e, _f, _g;
    let nextStageId = currentStage.id;
    let nextSubStageId;
    if (currentStage.id === ROOT_STAGE_ID) {
        nextStageId = (_b = (_a = workflow.stages[0]) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : currentStage.id;
        return { nextStageId, nextSubStageId };
    }
    if (currentStage.type === "terminal") {
        return { nextStageId, nextSubStageId };
    }
    if (currentStage.type === "cycle" && currentSubStage) {
        if (currentSubStage.next) {
            nextStageId = currentStage.id;
            nextSubStageId = currentSubStage.next;
            return { nextStageId, nextSubStageId };
        }
        if ((_c = currentStage.canProceedTo) === null || _c === void 0 ? void 0 : _c.length) {
            nextStageId = currentStage.canProceedTo[0];
            return { nextStageId, nextSubStageId };
        }
        const subStageCount = (_e = (_d = currentStage.subStages) === null || _d === void 0 ? void 0 : _d.length) !== null && _e !== void 0 ? _e : 0;
        if (subStageCount === 1) {
            nextStageId = currentStage.id;
            nextSubStageId = currentSubStage.id;
        }
        else if (subStageCount > 1) {
            nextStageId = currentStage.id;
            nextSubStageId = currentStage.subStages[0].id;
        }
        return { nextStageId, nextSubStageId };
    }
    if (currentStage.type === "linear") {
        if (typeof currentStage.next === "string") {
            nextStageId = currentStage.next;
        }
        else if (Array.isArray(currentStage.next) &&
            currentStage.next.length) {
            nextStageId = currentStage.next[0];
        }
        else if ((_f = currentStage.canProceedTo) === null || _f === void 0 ? void 0 : _f.length) {
            nextStageId = currentStage.canProceedTo[0];
        }
        else {
            const currentIndex = workflow.stages.findIndex((stage) => stage.id === currentStage.id);
            if (currentIndex >= 0 &&
                currentIndex < workflow.stages.length - 1) {
                nextStageId = workflow.stages[currentIndex + 1].id;
            }
        }
        return { nextStageId, nextSubStageId };
    }
    if (currentStage.type === "cycle") {
        if ((_g = currentStage.canProceedTo) === null || _g === void 0 ? void 0 : _g.length) {
            nextStageId = currentStage.canProceedTo[0];
        }
        return { nextStageId, nextSubStageId };
    }
    return { nextStageId, nextSubStageId };
}
// Helper function to create workflow stage transition
export function createWorkflowStageTransition(plugin, editor, line, lineNumber, nextStage, isRootTask, nextSubStage, currentSubStage) {
    const doc = editor.cm.state.doc;
    const app = plugin.app;
    const safeLineNumber = ensureWithinBounds(lineNumber + 1, doc);
    const lineStart = doc.line(safeLineNumber);
    const defaultIndentation = buildIndentString(app);
    let indentation = getIndentation(line);
    if (isRootTask) {
        indentation += defaultIndentation;
    }
    const changes = [];
    const isFinalStage = isLastWorkflowStageOrNotWorkflow(line, lineNumber, doc, plugin);
    const taskMatch = line.match(TASK_REGEX);
    if (taskMatch) {
        const taskStart = lineStart.from + taskMatch[0].indexOf("[");
        changes.push({
            from: taskStart + 1,
            to: taskStart + 2,
            insert: "x",
        });
    }
    let workflowType = "";
    const workflowTagMatch = line.match(WORKFLOW_TAG_REGEX);
    if (workflowTagMatch) {
        workflowType = workflowTagMatch[1];
    }
    else {
        workflowType =
            findParentWorkflow(doc, safeLineNumber) ||
                nextStage.id.split(STAGE_SEPARATOR)[0];
    }
    const timeChanges = processTimestampAndCalculateTime(line, doc, lineStart.from, lineNumber, workflowType, plugin);
    changes.push(...timeChanges);
    // If we're transitioning from a sub-stage to a new main stage
    // Mark the current sub-stage as complete and reduce indentation
    if (currentSubStage && !nextSubStage && !isFinalStage) {
        const stageMarker = safelyFindStageMarker(line);
        if (stageMarker && plugin.settings.workflow.autoRemoveLastStageMarker) {
            changes.push({
                from: lineStart.from + stageMarker.index,
                to: lineStart.from + stageMarker.index + stageMarker[0].length,
                insert: "",
            });
        }
        indentation = removeTrailingIndentation(indentation, app);
    }
    if (!isFinalStage) {
        const newTaskText = generateWorkflowTaskText(nextStage, indentation, plugin, true, nextSubStage);
        // Add the new task after the current line
        changes.push({
            from: lineStart.to,
            to: lineStart.to,
            insert: `\n${newTaskText}`,
        });
    }
    // Remove stage marker from current line if setting enabled
    if (plugin === null || plugin === void 0 ? void 0 : plugin.settings.workflow.autoRemoveLastStageMarker) {
        const stageMarker = safelyFindStageMarker(line);
        if (stageMarker) {
            changes.push({
                from: lineStart.from + stageMarker.index,
                to: lineStart.from + stageMarker.index + stageMarker[0].length,
                insert: "",
            });
        }
    }
    return changes;
}
/**
 * Resolves complete workflow information for a task line
 * @param lineText The text of the line containing the task
 * @param doc The document text
 * @param lineNumber The line number (1-based)
 * @param plugin The plugin instance
 * @returns Complete workflow information or null if not a workflow task
 */
export function resolveWorkflowInfo(lineText, doc, lineNumber, plugin) {
    const workflowInfo = extractWorkflowInfo(lineText);
    if (!workflowInfo) {
        return null;
    }
    let workflowType = workflowInfo.workflowType;
    let stageId = workflowInfo.currentStage;
    let subStageId = workflowInfo.subStage;
    if (workflowType === "fromParent") {
        const safeLineNumber = ensureWithinBounds(lineNumber, doc);
        const parentWorkflow = findParentWorkflow(doc, safeLineNumber);
        if (!parentWorkflow) {
            return null;
        }
        workflowType = parentWorkflow;
    }
    const workflow = plugin.settings.workflow.definitions.find((wf) => wf.id === workflowType);
    if (!workflow) {
        return null;
    }
    const isRootTask = stageId === "root" ||
        (lineText.includes(`#workflow/${workflowType}`) &&
            !lineText.includes("[stage::"));
    let currentStage;
    if (stageId === "root" || isRootTask) {
        currentStage = {
            id: ROOT_STAGE_ID,
            name: "Root Task",
            type: "linear",
            next: workflow.stages.length > 0 ? workflow.stages[0].id : undefined,
        };
    }
    else {
        const foundStage = workflow.stages.find((s) => s.id === stageId);
        if (!foundStage) {
            return null;
        }
        currentStage = foundStage;
    }
    let currentSubStage;
    if (subStageId && currentStage.subStages) {
        currentSubStage = currentStage.subStages.find((ss) => ss.id === subStageId);
    }
    return {
        workflowType,
        currentStage,
        currentSubStage,
        workflow,
        isRootTask,
    };
}
/**
 * Generates text for a workflow task
 * @param nextStage The workflow stage to create task text for
 * @param nextSubStage Optional substage within the stage
 * @param indentation The indentation to use for the task
 * @param plugin The plugin instance
 * @param addSubtasks Whether to add subtasks for cycle stages
 * @returns The generated task text
 */
export function generateWorkflowTaskText(nextStage, indentation, plugin, addSubtasks = true, nextSubStage) {
    // Generate timestamp if configured
    const timestamp = plugin.settings.workflow.autoAddTimestamp
        ? ` 🛫 ${moment().format(plugin.settings.workflow.timestampFormat ||
            "YYYY-MM-DD HH:mm:ss")}`
        : "";
    const defaultIndentation = buildIndentString(plugin.app);
    // Create task text
    if (nextSubStage) {
        return `${indentation}- [ ] ${nextStage.name} (${nextSubStage.name}) [stage::${nextStage.id}${STAGE_SEPARATOR}${nextSubStage.id}]${timestamp}`;
    }
    let taskText = `${indentation}- [ ] ${nextStage.name} [stage::${nextStage.id}]${timestamp}`;
    if (addSubtasks &&
        nextStage.type === "cycle" &&
        nextStage.subStages &&
        nextStage.subStages.length > 0) {
        const firstSubStage = nextStage.subStages[0];
        const subTaskIndentation = indentation + defaultIndentation;
        taskText += `\n${subTaskIndentation}- [ ] ${nextStage.name} (${firstSubStage.name}) [stage::${nextStage.id}${STAGE_SEPARATOR}${firstSubStage.id}]${timestamp}`;
    }
    return taskText;
}
/**
 * Determines the insertion point for a new workflow task
 * @param line The current line information
 * @param doc The document text
 * @param indentation The current line's indentation
 * @returns The position to insert the new task
 */
export function determineTaskInsertionPoint(line, doc, indentation) {
    // Default insertion point is after the current line
    let insertionPoint = line.to;
    // Check if there are child tasks by looking for lines with greater indentation
    const lineIndent = indentation.length;
    let lastChildLine = line.number;
    let foundChildren = false;
    // Look at the next 20 lines to find potential child tasks
    // This is a reasonable limit for most task hierarchies
    for (let i = line.number + 1; i <= Math.min(line.number + 20, doc.lines); i++) {
        const checkLine = doc.line(i);
        const checkIndent = getIndentation(checkLine.text).length;
        if (checkIndent > lineIndent) {
            lastChildLine = i;
            foundChildren = true;
        }
        else if (foundChildren) {
            break;
        }
    }
    // If we found child tasks, insert after the last child
    if (foundChildren) {
        insertionPoint = doc.line(lastChildLine).to;
    }
    return insertionPoint;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2Zsb3ctaGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIndvcmtmbG93LWhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFlLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUMvQyxPQUFPLEVBQ04sV0FBVyxHQUlYLE1BQU0sbUJBQW1CLENBQUM7QUFDM0IsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRS9DLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUM1QyxhQUFhO0FBQ2IsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ2hELE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUUxQyxPQUFPLEVBQ04sNEJBQTRCLEVBQzVCLDBCQUEwQixFQUMxQix3QkFBd0IsR0FDeEIsTUFBTSw2QkFBNkIsQ0FBQztBQUVyQywyREFBMkQ7QUFDM0QsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsVUFBVSxDQUFDLE1BQU0sRUFBVSxDQUFDO0FBRXBFLE1BQU0sa0JBQWtCLEdBQUcsdUJBQXVCLENBQUM7QUFDbkQsTUFBTSxrQkFBa0IsR0FBRyxxQkFBcUIsQ0FBQztBQUNqRCxNQUFNLDBCQUEwQixHQUFHLHNCQUFzQixDQUFDO0FBQzFELE1BQU0sVUFBVSxHQUFHLDhCQUE4QixDQUFDO0FBQ2xELE1BQU0sZ0JBQWdCLEdBQUcsb0JBQW9CLENBQUM7QUFDOUMsTUFBTSxhQUFhLEdBQUcsYUFBYSxDQUFDO0FBQ3BDLE1BQU0sZUFBZSxHQUFHLEdBQUcsQ0FBQztBQTRCNUIsU0FBUyxjQUFjLENBQUMsSUFBWTtJQUNuQyxNQUFNLEtBQUssR0FBRyxJQUFJ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QUFDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQzFDLENBQUMsRUFBRSxFQUNGO1FBQ0QsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5QixNQUFNLFdBQVcsR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUUxRCxJQUFJLFdBQVcsR0FBRyxVQUFVLEVBQUU7WUFDN0IsYUFBYSxHQUFHLENBQUMsQ0FBQztZQUNsQixhQUFhLEdBQUcsSUFBSSxDQUFDO1NBQ3JCO2FBQU0sSUFBSSxhQUFhLEVBQUU7WUFDekIsTUFBTTtTQUNOO0tBQ0Q7SUFFRCx1REFBdUQ7SUFDdkQsSUFBSSxhQUFhLEVBQUU7UUFDbEIsY0FBYyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxDQUFDO0tBQzVDO0lBRUQsT0FBTyxjQUFjLENBQUM7QUFDdkIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcCwgRWRpdG9yLCBtb21lbnQgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHtcclxuXHRFZGl0b3JTdGF0ZSxcclxuXHRUcmFuc2FjdGlvbixcclxuXHRUcmFuc2FjdGlvblNwZWMsXHJcblx0VGV4dCxcclxufSBmcm9tIFwiQGNvZGVtaXJyb3Ivc3RhdGVcIjtcclxuaW1wb3J0IHsgQW5ub3RhdGlvbiB9IGZyb20gXCJAY29kZW1pcnJvci9zdGF0ZVwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7IHRhc2tTdGF0dXNDaGFuZ2VBbm5vdGF0aW9uIH0gZnJvbSBcIkAvZWRpdG9yLWV4dGVuc2lvbnMvdGFzay1vcGVyYXRpb25zL3N0YXR1cy1zd2l0Y2hlclwiO1xyXG5pbXBvcnQgeyBwcmlvcml0eUNoYW5nZUFubm90YXRpb24gfSBmcm9tIFwiQC9lZGl0b3ItZXh0ZW5zaW9ucy91aS13aWRnZXRzL3ByaW9yaXR5LXBpY2tlclwiO1xyXG5pbXBvcnQgeyBidWlsZEluZGVudFN0cmluZyB9IGZyb20gXCJAL3V0aWxzXCI7XHJcbi8vIEB0cy1pZ25vcmVcclxuaW1wb3J0IHsgZm9sZGFibGUgfSBmcm9tIFwiQGNvZGVtaXJyb3IvbGFuZ3VhZ2VcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHsgV29ya2Zsb3dEZWZpbml0aW9uLCBXb3JrZmxvd1N0YWdlIH0gZnJvbSBcIkAvY29tbW9uL3NldHRpbmctZGVmaW5pdGlvblwiO1xyXG5pbXBvcnQge1xyXG5cdGNvbnZlcnRUYXNrVG9Xb3JrZmxvd0NvbW1hbmQsXHJcblx0Y3JlYXRlUXVpY2tXb3JrZmxvd0NvbW1hbmQsXHJcblx0c3RhcnRXb3JrZmxvd0hlcmVDb21tYW5kLFxyXG59IGZyb20gXCJAL2NvbW1hbmRzL3dvcmtmbG93Q29tbWFuZHNcIjtcclxuXHJcbi8vIEFubm90YXRpb24gdGhhdCBtYXJrcyBhIHRyYW5zYWN0aW9uIGFzIGEgd29ya2Zsb3cgY2hhbmdlXHJcbmV4cG9ydCBjb25zdCB3b3JrZmxvd0NoYW5nZUFubm90YXRpb24gPSBBbm5vdGF0aW9uLmRlZmluZTxzdHJpbmc+KCk7XHJcblxyXG5jb25zdCBXT1JLRkxPV19UQUdfUkVHRVggPSAvI3dvcmtmbG93XFwvKFteXFwvXFxzXSspLztcclxuY29uc3QgU1RBR0VfTUFSS0VSX1JFR0VYID0gL1xcW3N0YWdlOjooW15cXF1dKylcXF0vO1xyXG5jb25zdCBTVEFHRV9NQVJLRVJfRElTUExBWV9SRUdFWCA9IC9cXHMqXFxbc3RhZ2U6OlteXFxdXStcXF0vO1xyXG5jb25zdCBUQVNLX1JFR0VYID0gL14oXFxzKikoWy0qK118XFxkK1xcLilcXHMrXFxbKC4pXS87XHJcbmNvbnN0IFRJTUVfU1BFTlRfUkVHRVggPSAvXFwo4o+x77iPXFxzKyhbMC05Ol0rKVxcKS87XHJcbmNvbnN0IFJPT1RfU1RBR0VfSUQgPSBcIl9yb290X3Rhc2tfXCI7XHJcbmNvbnN0IFNUQUdFX1NFUEFSQVRPUiA9IFwiLlwiO1xyXG5cclxudHlwZSBXb3JrZmxvd1N1YlN0YWdlID0geyBpZDogc3RyaW5nOyBuYW1lOiBzdHJpbmc7IG5leHQ/OiBzdHJpbmcgfTtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgV29ya2Zsb3dJbmZvIHtcclxuXHR3b3JrZmxvd1R5cGU6IHN0cmluZztcclxuXHRjdXJyZW50U3RhZ2U6IHN0cmluZztcclxuXHRzdWJTdGFnZT86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBSZXNvbHZlZFdvcmtmbG93SW5mbyB7XHJcblx0d29ya2Zsb3dUeXBlOiBzdHJpbmc7XHJcblx0Y3VycmVudFN0YWdlOiBXb3JrZmxvd1N0YWdlO1xyXG5cdGN1cnJlbnRTdWJTdGFnZT86IFdvcmtmbG93U3ViU3RhZ2U7XHJcblx0d29ya2Zsb3c6IFdvcmtmbG93RGVmaW5pdGlvbjtcclxuXHRpc1Jvb3RUYXNrOiBib29sZWFuO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgV29ya2Zsb3dVcGRhdGUge1xyXG5cdGxpbmVOdW1iZXI6IG51bWJlcjtcclxuXHRsaW5lVGV4dDogc3RyaW5nO1xyXG5cdHJlc29sdmVkSW5mbzogUmVzb2x2ZWRXb3JrZmxvd0luZm87XHJcbn1cclxuXHJcbmludGVyZmFjZSBTdGFnZU1hcmtlck1hdGNoIGV4dGVuZHMgUmVnRXhwTWF0Y2hBcnJheSB7XHJcblx0aW5kZXg6IG51bWJlcjtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0SW5kZW50YXRpb24odGV4dDogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRjb25zdCBtYXRjaCA9IHRleHQubWF0Y2goL14oXFxzKikvKTtcclxuXHRyZXR1cm4gbWF0Y2ggPyBtYXRjaFsxXSA6IFwiXCI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZVRyYWlsaW5nSW5kZW50YXRpb24oXHJcblx0aW5kZW50YXRpb246IHN0cmluZyxcclxuXHRhcHA6IEFwcCxcclxuXHRsZXZlbHM6IG51bWJlciA9IDEsXHJcbik6IHN0cmluZyB7XHJcblx0Y29uc3QgaW5kZW50VW5pdCA9IGJ1aWxkSW5kZW50U3RyaW5nKGFwcCk7XHJcblx0Y29uc3QgcmVtb3ZhbCA9IGluZGVudFVuaXQucmVwZWF0KGxldmVscyk7XHJcblxyXG5cdGlmIChpbmRlbnRhdGlvbi5lbmRzV2l0aChyZW1vdmFsKSkge1xyXG5cdFx0cmV0dXJuIGluZGVudGF0aW9uLnNsaWNlKFxyXG5cdFx0XHQwLFxyXG5cdFx0XHRNYXRoLm1heCgwLCBpbmRlbnRhdGlvbi5sZW5ndGggLSByZW1vdmFsLmxlbmd0aCksXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0Ly8gRmFsbGJhY2s6IHJlbW92ZSB3aGl0ZXNwYWNlIGNoYXJhY3RlcnMgZXF1YWwgdG8gaW5kZW50VW5pdCBsZW5ndGggKiBsZXZlbHNcclxuXHRjb25zdCBmYWxsYmFja0xlbmd0aCA9IGluZGVudFVuaXQubGVuZ3RoICogbGV2ZWxzO1xyXG5cdHJldHVybiBpbmRlbnRhdGlvbi5zbGljZShcclxuXHRcdDAsXHJcblx0XHRNYXRoLm1heCgwLCBpbmRlbnRhdGlvbi5sZW5ndGggLSBmYWxsYmFja0xlbmd0aCksXHJcblx0KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZW5zdXJlV2l0aGluQm91bmRzKGxpbmVOdW1iZXI6IG51bWJlciwgZG9jOiBUZXh0KTogbnVtYmVyIHtcclxuXHRpZiAobGluZU51bWJlciA8IDEpIHtcclxuXHRcdHJldHVybiAxO1xyXG5cdH1cclxuXHJcblx0aWYgKGxpbmVOdW1iZXIgPiBkb2MubGluZXMpIHtcclxuXHRcdHJldHVybiBkb2MubGluZXM7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gbGluZU51bWJlcjtcclxufVxyXG5cclxuZnVuY3Rpb24gc2FmZWx5RmluZFN0YWdlTWFya2VyKGxpbmVUZXh0OiBzdHJpbmcpOiBTdGFnZU1hcmtlck1hdGNoIHwgbnVsbCB7XHJcblx0Y29uc3QgbWF0Y2ggPSBsaW5lVGV4dC5tYXRjaChTVEFHRV9NQVJLRVJfRElTUExBWV9SRUdFWCk7XHJcblx0cmV0dXJuIG1hdGNoICYmIHR5cGVvZiBtYXRjaC5pbmRleCA9PT0gXCJudW1iZXJcIlxyXG5cdFx0PyAobWF0Y2ggYXMgU3RhZ2VNYXJrZXJNYXRjaClcclxuXHRcdDogbnVsbDtcclxufVxyXG5cclxuLy8gRGVmaW5lIGEgc2ltcGxlIFRleHRSYW5nZSBpbnRlcmZhY2UgdG8gbWF0Y2ggdGhlIHByb3ZpZGVkIGNvZGVcclxuaW50ZXJmYWNlIFRleHRSYW5nZSB7XHJcblx0ZnJvbTogbnVtYmVyO1xyXG5cdHRvOiBudW1iZXI7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDYWxjdWxhdGUgdGhlIGZvbGRhYmxlIHJhbmdlIGZvciBhIHBvc2l0aW9uXHJcbiAqIEBwYXJhbSBzdGF0ZSBUaGUgZWRpdG9yIHN0YXRlXHJcbiAqIEBwYXJhbSBwb3MgVGhlIHBvc2l0aW9uIHRvIGNhbGN1bGF0ZSB0aGUgcmFuZ2UgZm9yXHJcbiAqIEByZXR1cm5zIFRoZSB0ZXh0IHJhbmdlIG9yIG51bGwgaWYgbm8gZm9sZGFibGUgcmFuZ2UgaXMgZm91bmRcclxuICovXHJcbmZ1bmN0aW9uIGNhbGN1bGF0ZVJhbmdlRm9yVHJhbnNmb3JtKFxyXG5cdHN0YXRlOiBFZGl0b3JTdGF0ZSxcclxuXHRwb3M6IG51bWJlcixcclxuKTogVGV4dFJhbmdlIHwgbnVsbCB7XHJcblx0Y29uc3QgbGluZSA9IHN0YXRlLmRvYy5saW5lQXQocG9zKTtcclxuXHRjb25zdCBmb2xkUmFuZ2UgPSBmb2xkYWJsZShzdGF0ZSwgbGluZS5mcm9tLCBsaW5lLnRvKTtcclxuXHJcblx0aWYgKCFmb2xkUmFuZ2UpIHtcclxuXHRcdHJldHVybiBudWxsO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIHsgZnJvbTogbGluZS5mcm9tLCB0bzogZm9sZFJhbmdlLnRvIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGFuIGVkaXRvciBleHRlbnNpb24gdGhhdCBoYW5kbGVzIHRhc2sgd29ya2Zsb3cgc3RhZ2UgdXBkYXRlc1xyXG4gKiBAcGFyYW0gYXBwIFRoZSBPYnNpZGlhbiBhcHAgaW5zdGFuY2VcclxuICogQHBhcmFtIHBsdWdpbiBUaGUgcGx1Z2luIGluc3RhbmNlXHJcbiAqIEByZXR1cm5zIEFuIGVkaXRvciBleHRlbnNpb24gdGhhdCBjYW4gYmUgcmVnaXN0ZXJlZCB3aXRoIHRoZSBwbHVnaW5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiB3b3JrZmxvd0V4dGVuc2lvbihhcHA6IEFwcCwgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4pIHtcclxuXHRyZXR1cm4gRWRpdG9yU3RhdGUudHJhbnNhY3Rpb25GaWx0ZXIub2YoKHRyOiBUcmFuc2FjdGlvbikgPT4ge1xyXG5cdFx0cmV0dXJuIGhhbmRsZVdvcmtmbG93VHJhbnNhY3Rpb24odHIsIGFwcCwgcGx1Z2luKTtcclxuXHR9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEV4dHJhY3Qgd29ya2Zsb3cgdGFnIGZyb20gYSBsaW5lIG9mIHRleHRcclxuICogQHBhcmFtIGxpbmVUZXh0IFRoZSBsaW5lIHRleHQgdG8gYW5hbHl6ZVxyXG4gKiBAcmV0dXJucyBBbiBvYmplY3QgY29udGFpbmluZyB3b3JrZmxvdyBpbmZvcm1hdGlvbiBvciBudWxsIGlmIG5vIHdvcmtmbG93IHRhZyBmb3VuZFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RXb3JrZmxvd0luZm8obGluZVRleHQ6IHN0cmluZyk6IFdvcmtmbG93SW5mbyB8IG51bGwge1xyXG5cdGNvbnN0IHN0YWdlTWF0Y2ggPSBsaW5lVGV4dC5tYXRjaChTVEFHRV9NQVJLRVJfUkVHRVgpO1xyXG5cclxuXHRpZiAoc3RhZ2VNYXRjaCkge1xyXG5cdFx0Y29uc3Qgc3RhZ2VJZCA9IHN0YWdlTWF0Y2hbMV07XHJcblxyXG5cdFx0aWYgKHN0YWdlSWQuaW5jbHVkZXMoU1RBR0VfU0VQQVJBVE9SKSkge1xyXG5cdFx0XHRjb25zdCBbc3RhZ2UsIHN1YlN0YWdlXSA9IHN0YWdlSWQuc3BsaXQoU1RBR0VfU0VQQVJBVE9SKTtcclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHR3b3JrZmxvd1R5cGU6IFwiZnJvbVBhcmVudFwiLFxyXG5cdFx0XHRcdGN1cnJlbnRTdGFnZTogc3RhZ2UsXHJcblx0XHRcdFx0c3ViU3RhZ2UsXHJcblx0XHRcdH07XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0d29ya2Zsb3dUeXBlOiBcImZyb21QYXJlbnRcIixcclxuXHRcdFx0Y3VycmVudFN0YWdlOiBzdGFnZUlkLFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdGNvbnN0IHdvcmtmbG93TWF0Y2ggPSBsaW5lVGV4dC5tYXRjaChXT1JLRkxPV19UQUdfUkVHRVgpO1xyXG5cclxuXHRpZiAod29ya2Zsb3dNYXRjaCkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0d29ya2Zsb3dUeXBlOiB3b3JrZmxvd01hdGNoWzFdLFxyXG5cdFx0XHRjdXJyZW50U3RhZ2U6IFwicm9vdFwiLFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdHJldHVybiBudWxsO1xyXG59XHJcblxyXG4vKipcclxuICogRmluZCB0aGUgcGFyZW50IHdvcmtmbG93IGZvciBhIHRhc2sgYnkgbG9va2luZyB1cCB0aGUgZG9jdW1lbnRcclxuICogQHBhcmFtIGRvYyBUaGUgZG9jdW1lbnQgdGV4dFxyXG4gKiBAcGFyYW0gbGluZU51bSBUaGUgY3VycmVudCBsaW5lIG51bWJlclxyXG4gKiBAcmV0dXJucyBUaGUgd29ya2Zsb3cgdHlwZSBvciBudWxsIGlmIG5vdCBmb3VuZFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRQYXJlbnRXb3JrZmxvdyhkb2M6IFRleHQsIGxpbmVOdW06IG51bWJlcik6IHN0cmluZyB8IG51bGwge1xyXG5cdGNvbnN0IHNhZmVMaW5lTnVtID0gZW5zdXJlV2l0aGluQm91bmRzKGxpbmVOdW0sIGRvYyk7XHJcblxyXG5cdGlmIChzYWZlTGluZU51bSA8PSAxKSB7XHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XHJcblxyXG5cdGNvbnN0IGN1cnJlbnRMaW5lSW5kZXggPSBzYWZlTGluZU51bSAtIDE7XHJcblx0Y29uc3QgY3VycmVudExpbmUgPSBkb2MubGluZShjdXJyZW50TGluZUluZGV4ICsgMSk7XHJcblx0Y29uc3QgY3VycmVudEluZGVudCA9IGdldEluZGVudGF0aW9uKGN1cnJlbnRMaW5lLnRleHQpLmxlbmd0aDtcclxuXHJcblx0Zm9yIChsZXQgaSA9IGN1cnJlbnRMaW5lSW5kZXg7IGkgPj0gMDsgaS0tKSB7XHJcblx0XHRjb25zdCBsaW5lID0gZG9jLmxpbmUoaSArIDEpO1xyXG5cdFx0Y29uc3QgbGluZVRleHQgPSBsaW5lLnRleHQ7XHJcblx0XHRjb25zdCBpbmRlbnQgPSBnZXRJbmRlbnRhdGlvbihsaW5lVGV4dCkubGVuZ3RoO1xyXG5cclxuXHRcdGNvbnN0IHdvcmtmbG93TWF0Y2ggPSBsaW5lVGV4dC5tYXRjaChXT1JLRkxPV19UQUdfUkVHRVgpO1xyXG5cdFx0aWYgKHdvcmtmbG93TWF0Y2gpIHtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdGluZGVudCA8IGN1cnJlbnRJbmRlbnQgfHxcclxuXHRcdFx0XHQoaW5kZW50ID09PSBjdXJyZW50SW5kZW50ICYmIGkgPCBjdXJyZW50TGluZUluZGV4KVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRyZXR1cm4gd29ya2Zsb3dNYXRjaFsxXTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIG51bGw7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBIYW5kbGVzIHRyYW5zYWN0aW9ucyB0byBkZXRlY3QgdGFzayBzdGF0dXMgY2hhbmdlcyB0byB3b3JrZmxvdy10YWdnZWQgdGFza3NcclxuICogQHBhcmFtIHRyIFRoZSB0cmFuc2FjdGlvbiB0byBoYW5kbGVcclxuICogQHBhcmFtIGFwcCBUaGUgT2JzaWRpYW4gYXBwIGluc3RhbmNlXHJcbiAqIEBwYXJhbSBwbHVnaW4gVGhlIHBsdWdpbiBpbnN0YW5jZVxyXG4gKiBAcmV0dXJucyBUaGUgb3JpZ2luYWwgdHJhbnNhY3Rpb24gb3IgYSBtb2RpZmllZCB0cmFuc2FjdGlvblxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGhhbmRsZVdvcmtmbG93VHJhbnNhY3Rpb24oXHJcblx0dHI6IFRyYW5zYWN0aW9uLFxyXG5cdGFwcDogQXBwLFxyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG4pOiBUcmFuc2FjdGlvblNwZWMge1xyXG5cdC8vIE9ubHkgcHJvY2VzcyBpZiB3b3JrZmxvdyBmZWF0dXJlIGlzIGVuYWJsZWRcclxuXHRpZiAoIXBsdWdpbi5zZXR0aW5ncy53b3JrZmxvdy5lbmFibGVXb3JrZmxvdykge1xyXG5cdFx0cmV0dXJuIHRyO1xyXG5cdH1cclxuXHJcblx0Ly8gT25seSBwcm9jZXNzIHRyYW5zYWN0aW9ucyB0aGF0IGNoYW5nZSB0aGUgZG9jdW1lbnRcclxuXHRpZiAoIXRyLmRvY0NoYW5nZWQpIHtcclxuXHRcdHJldHVybiB0cjtcclxuXHR9XHJcblxyXG5cdC8vIFNraXAgaWYgdGhpcyB0cmFuc2FjdGlvbiBhbHJlYWR5IGhhcyBhIHdvcmtmbG93IG9yIHRhc2sgc3RhdHVzIGFubm90YXRpb25cclxuXHRpZiAoXHJcblx0XHR0ci5hbm5vdGF0aW9uKHdvcmtmbG93Q2hhbmdlQW5ub3RhdGlvbikgfHxcclxuXHRcdHRyLmFubm90YXRpb24ocHJpb3JpdHlDaGFuZ2VBbm5vdGF0aW9uKSB8fFxyXG5cdFx0KHRyLmFubm90YXRpb24odGFza1N0YXR1c0NoYW5nZUFubm90YXRpb24pIGFzIHN0cmluZyk/LnN0YXJ0c1dpdGgoXHJcblx0XHRcdFwid29ya2Zsb3dDaGFuZ2VcIixcclxuXHRcdClcclxuXHQpIHtcclxuXHRcdHJldHVybiB0cjtcclxuXHR9XHJcblxyXG5cdGNvbnN0IGNoYW5nZXM6IHtcclxuXHRcdGZyb21BOiBudW1iZXI7XHJcblx0XHR0b0E6IG51bWJlcjtcclxuXHRcdGZyb21COiBudW1iZXI7XHJcblx0XHR0b0I6IG51bWJlcjtcclxuXHRcdHRleHQ6IHN0cmluZztcclxuXHR9W10gPSBbXTtcclxuXHJcblx0dHIuY2hhbmdlcy5pdGVyQ2hhbmdlcygoZnJvbUEsIHRvQSwgZnJvbUIsIHRvQiwgaW5zZXJ0ZWQpID0+IHtcclxuXHRcdGNoYW5nZXMucHVzaCh7XHJcblx0XHRcdGZyb21BLFxyXG5cdFx0XHR0b0EsXHJcblx0XHRcdGZyb21CLFxyXG5cdFx0XHR0b0IsXHJcblx0XHRcdHRleHQ6IGluc2VydGVkLnRvU3RyaW5nKCksXHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0Y29uc3QgY29tcGxldGVkU3RhdHVzZXMgPSBwbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c2VzLmNvbXBsZXRlZC5zcGxpdChcInxcIik7XHJcblx0Y29uc3QgaXNDb21wbGV0aW9uQ2hhbmdlID0gKHRleHQ6IHN0cmluZykgPT5cclxuXHRcdGNvbXBsZXRlZFN0YXR1c2VzLmluY2x1ZGVzKHRleHQpIHx8XHJcblx0XHRjb21wbGV0ZWRTdGF0dXNlcy5zb21lKFxyXG5cdFx0XHQoc3RhdHVzKSA9PiB0ZXh0ID09PSBgLSBbJHtzdGF0dXN9XWAgfHwgdGV4dCA9PT0gYFske3N0YXR1c31dYCxcclxuXHRcdCk7XHJcblxyXG5cdGlmICghY2hhbmdlcy5zb21lKChjKSA9PiBpc0NvbXBsZXRpb25DaGFuZ2UoYy50ZXh0KSkpIHtcclxuXHRcdHJldHVybiB0cjtcclxuXHR9XHJcblxyXG5cdGNvbnN0IHdvcmtmbG93VXBkYXRlczogV29ya2Zsb3dVcGRhdGVbXSA9IFtdO1xyXG5cclxuXHRmb3IgKGNvbnN0IGNoYW5nZSBvZiBjaGFuZ2VzKSB7XHJcblx0XHRpZiAoIWlzQ29tcGxldGlvbkNoYW5nZShjaGFuZ2UudGV4dCkpIHtcclxuXHRcdFx0Y29udGludWU7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgbGluZSA9IHRyLm5ld0RvYy5saW5lQXQoY2hhbmdlLmZyb21CKTtcclxuXHRcdGNvbnN0IGxpbmVUZXh0ID0gbGluZS50ZXh0O1xyXG5cdFx0Y29uc3QgdGFza01hdGNoID0gbGluZVRleHQubWF0Y2goVEFTS19SRUdFWCk7XHJcblxyXG5cdFx0aWYgKCF0YXNrTWF0Y2gpIHtcclxuXHRcdFx0Y29udGludWU7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgcmVzb2x2ZWRJbmZvID0gcmVzb2x2ZVdvcmtmbG93SW5mbyhcclxuXHRcdFx0bGluZVRleHQsXHJcblx0XHRcdHRyLm5ld0RvYyxcclxuXHRcdFx0bGluZS5udW1iZXIsXHJcblx0XHRcdHBsdWdpbixcclxuXHRcdCk7XHJcblxyXG5cdFx0aWYgKHJlc29sdmVkSW5mbykge1xyXG5cdFx0XHR3b3JrZmxvd1VwZGF0ZXMucHVzaCh7XHJcblx0XHRcdFx0bGluZU51bWJlcjogbGluZS5udW1iZXIsXHJcblx0XHRcdFx0bGluZVRleHQsXHJcblx0XHRcdFx0cmVzb2x2ZWRJbmZvLFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGNvbnN0IG5ld0NoYW5nZXM6IHsgZnJvbTogbnVtYmVyOyB0bzogbnVtYmVyOyBpbnNlcnQ6IHN0cmluZyB9W10gPSBbXTtcclxuXHQvLyBQcm9jZXNzIGVhY2ggd29ya2Zsb3cgdXBkYXRlXHJcblx0aWYgKHdvcmtmbG93VXBkYXRlcy5sZW5ndGggPiAwKSB7XHJcblx0XHRmb3IgKGNvbnN0IHVwZGF0ZSBvZiB3b3JrZmxvd1VwZGF0ZXMpIHtcclxuXHRcdFx0Y29uc3QgeyByZXNvbHZlZEluZm8sIGxpbmVOdW1iZXIsIGxpbmVUZXh0IH0gPSB1cGRhdGU7XHJcblx0XHRcdGNvbnN0IGxpbmUgPSB0ci5uZXdEb2MubGluZShsaW5lTnVtYmVyKTtcclxuXHRcdFx0Y29uc3Qge1xyXG5cdFx0XHRcdHdvcmtmbG93VHlwZSxcclxuXHRcdFx0XHRjdXJyZW50U3RhZ2UsXHJcblx0XHRcdFx0Y3VycmVudFN1YlN0YWdlLFxyXG5cdFx0XHRcdHdvcmtmbG93LFxyXG5cdFx0XHRcdGlzUm9vdFRhc2ssXHJcblx0XHRcdH0gPSByZXNvbHZlZEluZm87XHJcblxyXG5cdFx0XHRpZiAoIXdvcmtmbG93LnN0YWdlcy5sZW5ndGgpIHtcclxuXHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSGFuZGxlIHRpbWVzdGFtcCByZW1vdmFsIGFuZCB0aW1lIGNhbGN1bGF0aW9uXHJcblx0XHRcdGNvbnN0IHRpbWVDaGFuZ2VzID0gcHJvY2Vzc1RpbWVzdGFtcEFuZENhbGN1bGF0ZVRpbWUoXHJcblx0XHRcdFx0bGluZS50ZXh0LFxyXG5cdFx0XHRcdHRyLm5ld0RvYyxcclxuXHRcdFx0XHRsaW5lLmZyb20sXHJcblx0XHRcdFx0bGluZS5udW1iZXIsXHJcblx0XHRcdFx0d29ya2Zsb3dUeXBlLFxyXG5cdFx0XHRcdHBsdWdpbixcclxuXHRcdFx0KTtcclxuXHRcdFx0bmV3Q2hhbmdlcy5wdXNoKC4uLnRpbWVDaGFuZ2VzKTtcclxuXHJcblx0XHRcdC8vIFJlbW92ZSB0aGUgW3N0YWdlOjpdIG1hcmtlciBmcm9tIHRoZSBjdXJyZW50IGxpbmVcclxuXHRcdFx0aWYgKHBsdWdpbi5zZXR0aW5ncy53b3JrZmxvdy5hdXRvUmVtb3ZlTGFzdFN0YWdlTWFya2VyKSB7XHJcblx0XHRcdFx0Y29uc3Qgc3RhZ2VNYXJrZXIgPSBzYWZlbHlGaW5kU3RhZ2VNYXJrZXIobGluZS50ZXh0KTtcclxuXHRcdFx0XHRpZiAoc3RhZ2VNYXJrZXIpIHtcclxuXHRcdFx0XHRcdG5ld0NoYW5nZXMucHVzaCh7XHJcblx0XHRcdFx0XHRcdGZyb206IGxpbmUuZnJvbSArIHN0YWdlTWFya2VyLmluZGV4LFxyXG5cdFx0XHRcdFx0XHR0bzpcclxuXHRcdFx0XHRcdFx0XHRsaW5lLmZyb20gK1xyXG5cdFx0XHRcdFx0XHRcdHN0YWdlTWFya2VyLmluZGV4ICtcclxuXHRcdFx0XHRcdFx0XHRzdGFnZU1hcmtlclswXS5sZW5ndGgsXHJcblx0XHRcdFx0XHRcdGluc2VydDogXCJcIixcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKGN1cnJlbnRTdGFnZS50eXBlID09PSBcInRlcm1pbmFsXCIpIHtcclxuXHRcdFx0XHRjb25zdCBpbmRlbnRhdGlvbiA9IGdldEluZGVudGF0aW9uKGxpbmUudGV4dCkubGVuZ3RoO1xyXG5cdFx0XHRcdGNvbnN0IHRhc2tNYXRjaCA9IGxpbmUudGV4dC5tYXRjaChUQVNLX1JFR0VYKTtcclxuXHJcblx0XHRcdFx0aWYgKCF0YXNrTWF0Y2gpIHtcclxuXHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Y29uc3QgY29tcGxldGVkU3RhdHVzZXMgPVxyXG5cdFx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLnRhc2tTdGF0dXNlcy5jb21wbGV0ZWQuc3BsaXQoXCJ8XCIpO1xyXG5cclxuXHRcdFx0XHRmb3IgKGxldCBpID0gbGluZU51bWJlciAtIDE7IGkgPj0gMTsgaS0tKSB7XHJcblx0XHRcdFx0XHRjb25zdCBjaGVja0xpbmUgPSB0ci5uZXdEb2MubGluZShpKTtcclxuXHRcdFx0XHRcdGNvbnN0IGNoZWNrSW5kZW50ID0gZ2V0SW5kZW50YXRpb24oY2hlY2tMaW5lLnRleHQpLmxlbmd0aDtcclxuXHJcblx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdGNoZWNrSW5kZW50IDwgaW5kZW50YXRpb24gJiZcclxuXHRcdFx0XHRcdFx0Y2hlY2tMaW5lLnRleHQuaW5jbHVkZXMoYCN3b3JrZmxvdy8ke3dvcmtmbG93VHlwZX1gKVxyXG5cdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IHJvb3RUYXNrTWF0Y2ggPSBjaGVja0xpbmUudGV4dC5tYXRjaChUQVNLX1JFR0VYKTtcclxuXHRcdFx0XHRcdFx0aWYgKHJvb3RUYXNrTWF0Y2gpIHtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCByb290VGFza1N0YXR1cyA9IHJvb3RUYXNrTWF0Y2hbM107XHJcblx0XHRcdFx0XHRcdFx0aWYgKCFjb21wbGV0ZWRTdGF0dXNlcy5pbmNsdWRlcyhyb290VGFza1N0YXR1cykpIHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IHJvb3RUYXNrU3RhcnQgPVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRjaGVja0xpbmUuZnJvbSArXHJcblx0XHRcdFx0XHRcdFx0XHRcdHJvb3RUYXNrTWF0Y2hbMF0uaW5kZXhPZihcIltcIik7XHJcblx0XHRcdFx0XHRcdFx0XHRuZXdDaGFuZ2VzLnB1c2goe1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRmcm9tOiByb290VGFza1N0YXJ0ICsgMSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0dG86IHJvb3RUYXNrU3RhcnQgKyAyLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRpbnNlcnQ6IFwieFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgeyBuZXh0U3RhZ2VJZCwgbmV4dFN1YlN0YWdlSWQgfSA9IGRldGVybWluZU5leHRTdGFnZShcclxuXHRcdFx0XHRjdXJyZW50U3RhZ2UsXHJcblx0XHRcdFx0d29ya2Zsb3csXHJcblx0XHRcdFx0Y3VycmVudFN1YlN0YWdlLFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Y29uc3QgbmV4dFN0YWdlID0gd29ya2Zsb3cuc3RhZ2VzLmZpbmQoKHMpID0+IHMuaWQgPT09IG5leHRTdGFnZUlkKTtcclxuXHRcdFx0aWYgKCFuZXh0U3RhZ2UpIGNvbnRpbnVlO1xyXG5cclxuXHRcdFx0bGV0IG5leHRTdWJTdGFnZTogV29ya2Zsb3dTdWJTdGFnZSB8IHVuZGVmaW5lZDtcclxuXHRcdFx0aWYgKG5leHRTdWJTdGFnZUlkICYmIG5leHRTdGFnZS5zdWJTdGFnZXMpIHtcclxuXHRcdFx0XHRuZXh0U3ViU3RhZ2UgPSBuZXh0U3RhZ2Uuc3ViU3RhZ2VzLmZpbmQoXHJcblx0XHRcdFx0XHQoc3MpID0+IHNzLmlkID09PSBuZXh0U3ViU3RhZ2VJZCxcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBpbmRlbnRhdGlvbiA9IGdldEluZGVudGF0aW9uKGxpbmVUZXh0KTtcclxuXHRcdFx0Y29uc3QgZGVmYXVsdEluZGVudGF0aW9uID0gYnVpbGRJbmRlbnRTdHJpbmcoYXBwKTtcclxuXHRcdFx0Y29uc3QgbmV3VGFza0luZGVudGF0aW9uID0gaXNSb290VGFza1xyXG5cdFx0XHRcdD8gaW5kZW50YXRpb24gKyBkZWZhdWx0SW5kZW50YXRpb25cclxuXHRcdFx0XHQ6IGluZGVudGF0aW9uO1xyXG5cclxuXHRcdFx0Y29uc3QgY29tcGxldGVUYXNrVGV4dCA9IGdlbmVyYXRlV29ya2Zsb3dUYXNrVGV4dChcclxuXHRcdFx0XHRuZXh0U3RhZ2UsXHJcblx0XHRcdFx0bmV3VGFza0luZGVudGF0aW9uLFxyXG5cdFx0XHRcdHBsdWdpbixcclxuXHRcdFx0XHR0cnVlLFxyXG5cdFx0XHRcdG5leHRTdWJTdGFnZSxcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGNvbnN0IGluc2VydGlvblBvaW50ID0gZGV0ZXJtaW5lVGFza0luc2VydGlvblBvaW50KFxyXG5cdFx0XHRcdGxpbmUsXHJcblx0XHRcdFx0dHIubmV3RG9jLFxyXG5cdFx0XHRcdGluZGVudGF0aW9uLFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdCEoXHJcblx0XHRcdFx0XHR0ci5hbm5vdGF0aW9uKHRhc2tTdGF0dXNDaGFuZ2VBbm5vdGF0aW9uKSA9PT1cclxuXHRcdFx0XHRcdFwiYXV0b0NvbXBsZXRlUGFyZW50LkRPTkVcIlxyXG5cdFx0XHRcdClcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0bmV3Q2hhbmdlcy5wdXNoKHtcclxuXHRcdFx0XHRcdGZyb206IGluc2VydGlvblBvaW50LFxyXG5cdFx0XHRcdFx0dG86IGluc2VydGlvblBvaW50LFxyXG5cdFx0XHRcdFx0aW5zZXJ0OiBgXFxuJHtjb21wbGV0ZVRhc2tUZXh0fWAsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGlmIChuZXdDaGFuZ2VzLmxlbmd0aCA+IDApIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGNoYW5nZXM6IFt0ci5jaGFuZ2VzLCAuLi5uZXdDaGFuZ2VzXSxcclxuXHRcdFx0c2VsZWN0aW9uOiB0ci5zZWxlY3Rpb24sXHJcblx0XHRcdGFubm90YXRpb25zOiB3b3JrZmxvd0NoYW5nZUFubm90YXRpb24ub2YoXCJ3b3JrZmxvd0NoYW5nZVwiKSxcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gdHI7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQcm9jZXNzIHRpbWVzdGFtcCBhbmQgY2FsY3VsYXRlIHNwZW50IHRpbWUgZm9yIHdvcmtmbG93IHRhc2tzXHJcbiAqIEBwYXJhbSBsaW5lVGV4dCBUaGUgdGV4dCBvZiB0aGUgbGluZSBjb250YWluaW5nIHRoZSB0YXNrXHJcbiAqIEBwYXJhbSBkb2MgVGhlIGRvY3VtZW50IHRleHRcclxuICogQHBhcmFtIGxpbmVGcm9tIFN0YXJ0aW5nIHBvc2l0aW9uIG9mIHRoZSBsaW5lIGluIHRoZSBkb2N1bWVudFxyXG4gKiBAcGFyYW0gbGluZU51bWJlciBUaGUgbGluZSBudW1iZXIgaW4gdGhlIGRvY3VtZW50ICgxLWJhc2VkKVxyXG4gKiBAcGFyYW0gd29ya2Zsb3dUeXBlIFRoZSB3b3JrZmxvdyBJRFxyXG4gKiBAcGFyYW0gcGx1Z2luIFRoZSBwbHVnaW4gaW5zdGFuY2VcclxuICogQHJldHVybnMgQXJyYXkgb2YgY2hhbmdlcyB0byBhcHBseVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHByb2Nlc3NUaW1lc3RhbXBBbmRDYWxjdWxhdGVUaW1lKFxyXG5cdGxpbmVUZXh0OiBzdHJpbmcsXHJcblx0ZG9jOiBUZXh0LFxyXG5cdGxpbmVGcm9tOiBudW1iZXIsXHJcblx0bGluZU51bWJlcjogbnVtYmVyLFxyXG5cdHdvcmtmbG93VHlwZTogc3RyaW5nLFxyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG4pOiB7IGZyb206IG51bWJlcjsgdG86IG51bWJlcjsgaW5zZXJ0OiBzdHJpbmcgfVtdIHtcclxuXHRjb25zdCBjaGFuZ2VzOiB7IGZyb206IG51bWJlcjsgdG86IG51bWJlcjsgaW5zZXJ0OiBzdHJpbmcgfVtdID0gW107XHJcblxyXG5cdGNvbnN0IHRpbWVzdGFtcEZvcm1hdCA9XHJcblx0XHRwbHVnaW4uc2V0dGluZ3Mud29ya2Zsb3cudGltZXN0YW1wRm9ybWF0IHx8IFwiWVlZWS1NTS1ERCBISDptbTpzc1wiO1xyXG5cdGNvbnN0IHRpbWVzdGFtcFRva2VuID0gYPCfm6sgJHttb21lbnQoKS5mb3JtYXQodGltZXN0YW1wRm9ybWF0KX1gO1xyXG5cdGNvbnN0IHRpbWVzdGFtcExlbmd0aCA9IHRpbWVzdGFtcFRva2VuLmxlbmd0aDtcclxuXHRjb25zdCBzdGFydE1hcmtJbmRleCA9IGxpbmVUZXh0LmluZGV4T2YoXCLwn5urXCIpO1xyXG5cclxuXHRpZiAoc3RhcnRNYXJrSW5kZXggPT09IC0xKSB7XHJcblx0XHRyZXR1cm4gY2hhbmdlcztcclxuXHR9XHJcblxyXG5cdGNvbnN0IGVuZE1hcmtJbmRleCA9IHN0YXJ0TWFya0luZGV4ICsgdGltZXN0YW1wTGVuZ3RoO1xyXG5cdGNvbnN0IHRpbWVzdGFtcFRleHQgPSBsaW5lVGV4dC5zdWJzdHJpbmcoc3RhcnRNYXJrSW5kZXgsIGVuZE1hcmtJbmRleCk7XHJcblx0Y29uc3Qgc3RhcnRUaW1lID0gbW9tZW50KFxyXG5cdFx0dGltZXN0YW1wVGV4dC5yZXBsYWNlKFwi8J+bqyBcIiwgXCJcIiksXHJcblx0XHR0aW1lc3RhbXBGb3JtYXQsXHJcblx0XHR0cnVlLFxyXG5cdCk7XHJcblxyXG5cdGlmICghc3RhcnRUaW1lLmlzVmFsaWQoKSkge1xyXG5cdFx0cmV0dXJuIGNoYW5nZXM7XHJcblx0fVxyXG5cclxuXHRjb25zdCBlbmRUaW1lID0gbW9tZW50KCk7XHJcblx0Y29uc3QgZHVyYXRpb24gPSBtb21lbnQuZHVyYXRpb24oZW5kVGltZS5kaWZmKHN0YXJ0VGltZSkpO1xyXG5cdGNvbnN0IGlzRmluYWxTdGFnZSA9IGlzTGFzdFdvcmtmbG93U3RhZ2VPck5vdFdvcmtmbG93KFxyXG5cdFx0bGluZVRleHQsXHJcblx0XHRsaW5lTnVtYmVyLFxyXG5cdFx0ZG9jLFxyXG5cdFx0cGx1Z2luLFxyXG5cdCk7XHJcblxyXG5cdC8vIFJlbW92ZSB0aW1lc3RhbXAgaWYgZW5hYmxlZFxyXG5cdGlmIChwbHVnaW4uc2V0dGluZ3Mud29ya2Zsb3cucmVtb3ZlVGltZXN0YW1wT25UcmFuc2l0aW9uKSB7XHJcblx0XHRjb25zdCB0aW1lc3RhbXBTdGFydCA9IGxpbmVGcm9tICsgc3RhcnRNYXJrSW5kZXg7XHJcblx0XHRjb25zdCB0aW1lc3RhbXBFbmQgPSB0aW1lc3RhbXBTdGFydCArIHRpbWVzdGFtcExlbmd0aDtcclxuXHRcdGNoYW5nZXMucHVzaCh7XHJcblx0XHRcdGZyb206IHRpbWVzdGFtcFN0YXJ0IC0gMSwgLy8gSW5jbHVkZSB0aGUgc3BhY2UgYmVmb3JlIHRoZSB0aW1lc3RhbXBcclxuXHRcdFx0dG86IHRpbWVzdGFtcEVuZCxcclxuXHRcdFx0aW5zZXJ0OiBcIlwiLFxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyBBZGQgc3BlbnQgdGltZSBpZiBlbmFibGVkXHJcblx0aWYgKHBsdWdpbi5zZXR0aW5ncy53b3JrZmxvdy5jYWxjdWxhdGVTcGVudFRpbWUpIHtcclxuXHRcdGNvbnN0IHNwZW50VGltZSA9IG1vbWVudFxyXG5cdFx0XHQudXRjKGR1cmF0aW9uLmFzTWlsbGlzZWNvbmRzKCkpXHJcblx0XHRcdC5mb3JtYXQocGx1Z2luLnNldHRpbmdzLndvcmtmbG93LnNwZW50VGltZUZvcm1hdCk7XHJcblxyXG5cdFx0Ly8gRGV0ZXJtaW5lIGluc2VydGlvbiBwb3NpdGlvbiAoYmVmb3JlIGFueSBzdGFnZSBtYXJrZXIpXHJcblx0XHRjb25zdCBzdGFnZU1hcmtlckluZGV4ID0gbGluZVRleHQuaW5kZXhPZihcIltzdGFnZTo6XCIpO1xyXG5cdFx0Y29uc3QgaW5zZXJ0UG9zaXRpb24gPVxyXG5cdFx0XHRsaW5lRnJvbSArXHJcblx0XHRcdChzdGFnZU1hcmtlckluZGV4ICE9PSAtMSA/IHN0YWdlTWFya2VySW5kZXggOiBsaW5lVGV4dC5sZW5ndGgpO1xyXG5cclxuXHRcdGlmICghaXNGaW5hbFN0YWdlIHx8ICFwbHVnaW4uc2V0dGluZ3Mud29ya2Zsb3cuY2FsY3VsYXRlRnVsbFNwZW50VGltZSkge1xyXG5cdFx0XHRjaGFuZ2VzLnB1c2goe1xyXG5cdFx0XHRcdGZyb206IGluc2VydFBvc2l0aW9uLFxyXG5cdFx0XHRcdHRvOiBpbnNlcnRQb3NpdGlvbixcclxuXHRcdFx0XHRpbnNlcnQ6IGAgKOKPse+4jyAke3NwZW50VGltZX0pYCxcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2FsY3VsYXRlIGFuZCBhZGQgdG90YWwgdGltZSBmb3IgZmluYWwgc3RhZ2UgaWYgZW5hYmxlZFxyXG5cdFx0aWYgKHBsdWdpbi5zZXR0aW5ncy53b3JrZmxvdy5jYWxjdWxhdGVGdWxsU3BlbnRUaW1lICYmIGlzRmluYWxTdGFnZSkge1xyXG5cdFx0XHRjb25zdCB3b3JrZmxvd1RhZyA9IGAjd29ya2Zsb3cvJHt3b3JrZmxvd1R5cGV9YDtcclxuXHRcdFx0bGV0IHRvdGFsRHVyYXRpb24gPSBtb21lbnQuZHVyYXRpb24oMCk7XHJcblx0XHRcdGxldCBmb3VuZFN0YXJ0VGltZSA9IGZhbHNlO1xyXG5cclxuXHRcdFx0Ly8gR2V0IGN1cnJlbnQgdGFzayBpbmRlbnRhdGlvbiBsZXZlbFxyXG5cdFx0XHRjb25zdCBjdXJyZW50SW5kZW50TGV2ZWwgPSBnZXRJbmRlbnRhdGlvbihsaW5lVGV4dCkubGVuZ3RoO1xyXG5cclxuXHRcdFx0Ly8gTG9vayB1cCB0byBmaW5kIHRoZSByb290IHRhc2tcclxuXHRcdFx0Zm9yIChsZXQgaSA9IGxpbmVOdW1iZXIgLSAxOyBpID49IDE7IGktLSkge1xyXG5cdFx0XHRcdGlmIChpID4gZG9jLmxpbmVzKSBjb250aW51ZTtcclxuXHJcblx0XHRcdFx0Y29uc3QgY2hlY2tMaW5lID0gZG9jLmxpbmUoaSk7XHJcblx0XHRcdFx0aWYgKGNoZWNrTGluZS50ZXh0LmluY2x1ZGVzKHdvcmtmbG93VGFnKSkge1xyXG5cdFx0XHRcdFx0Ly8gRm91bmQgcm9vdCB0YXNrLCBub3cgbG9vayBmb3IgYWxsIHRhc2tzIHdpdGggdGltZSBzcGVudCBtYXJrZXJzXHJcblx0XHRcdFx0XHRmb3IgKGxldCBqID0gaTsgaiA8PSBsaW5lTnVtYmVyOyBqKyspIHtcclxuXHRcdFx0XHRcdFx0aWYgKGogPiBkb2MubGluZXMpIGNvbnRpbnVlO1xyXG5cclxuXHRcdFx0XHRcdFx0Y29uc3QgdGFza0xpbmUgPSBkb2MubGluZShqKTtcclxuXHJcblx0XHRcdFx0XHRcdGNvbnN0IGluZGVudExldmVsID0gZ2V0SW5kZW50YXRpb24oXHJcblx0XHRcdFx0XHRcdFx0dGFza0xpbmUudGV4dCxcclxuXHRcdFx0XHRcdFx0KS5sZW5ndGg7XHJcblxyXG5cdFx0XHRcdFx0XHRpZiAoaW5kZW50TGV2ZWwgPiBjdXJyZW50SW5kZW50TGV2ZWwpIHtcclxuXHRcdFx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0Y29uc3QgdGltZVNwZW50TWF0Y2ggPVxyXG5cdFx0XHRcdFx0XHRcdHRhc2tMaW5lLnRleHQubWF0Y2goVElNRV9TUEVOVF9SRUdFWCk7XHJcblxyXG5cdFx0XHRcdFx0XHRpZiAodGltZVNwZW50TWF0Y2ggJiYgdGltZVNwZW50TWF0Y2hbMV0pIHtcclxuXHRcdFx0XHRcdFx0XHQvLyBQYXJzZSB0aGUgdGltZSBzcGVudFxyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHRpbWVQYXJ0cyA9IHRpbWVTcGVudE1hdGNoWzFdLnNwbGl0KFwiOlwiKTtcclxuXHRcdFx0XHRcdFx0XHRsZXQgdGltZUluTXMgPSAwO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRpZiAodGltZVBhcnRzLmxlbmd0aCA9PT0gMykge1xyXG5cdFx0XHRcdFx0XHRcdFx0Ly8gSEg6bW06c3MgZm9ybWF0XHJcblx0XHRcdFx0XHRcdFx0XHR0aW1lSW5NcyA9XHJcblx0XHRcdFx0XHRcdFx0XHRcdChwYXJzZUludCh0aW1lUGFydHNbMF0pICogMzYwMCArXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0cGFyc2VJbnQodGltZVBhcnRzWzFdKSAqIDYwICtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRwYXJzZUludCh0aW1lUGFydHNbMl0pKSAqXHJcblx0XHRcdFx0XHRcdFx0XHRcdDEwMDA7XHJcblx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmICh0aW1lUGFydHMubGVuZ3RoID09PSAyKSB7XHJcblx0XHRcdFx0XHRcdFx0XHQvLyBtbTpzcyBmb3JtYXRcclxuXHRcdFx0XHRcdFx0XHRcdHRpbWVJbk1zID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0KHBhcnNlSW50KHRpbWVQYXJ0c1swXSkgKiA2MCArXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0cGFyc2VJbnQodGltZVBhcnRzWzFdKSkgKlxyXG5cdFx0XHRcdFx0XHRcdFx0XHQxMDAwO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0aWYgKHRpbWVJbk1zID4gMCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0dG90YWxEdXJhdGlvbi5hZGQodGltZUluTXMpO1xyXG5cdFx0XHRcdFx0XHRcdFx0Zm91bmRTdGFydFRpbWUgPSB0cnVlO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBJZiB3ZSBjb3VsZG4ndCBmaW5kIGFueSB0aW1lIHNwZW50IG1hcmtlcnMsIHVzZSB0aGUgY3VycmVudCBkdXJhdGlvblxyXG5cdFx0XHRpZiAoIWZvdW5kU3RhcnRUaW1lKSB7XHJcblx0XHRcdFx0dG90YWxEdXJhdGlvbiA9IGR1cmF0aW9uO1xyXG5cdFx0XHRcdGZvdW5kU3RhcnRUaW1lID0gdHJ1ZTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBBZGQgdGhlIGN1cnJlbnQgdGFzaydzIGR1cmF0aW9uIHRvIHRoZSB0b3RhbFxyXG5cdFx0XHRcdHRvdGFsRHVyYXRpb24uYWRkKGR1cmF0aW9uKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKGZvdW5kU3RhcnRUaW1lKSB7XHJcblx0XHRcdFx0Y29uc3QgdG90YWxTcGVudFRpbWUgPSBtb21lbnRcclxuXHRcdFx0XHRcdC51dGModG90YWxEdXJhdGlvbi5hc01pbGxpc2Vjb25kcygpKVxyXG5cdFx0XHRcdFx0LmZvcm1hdChwbHVnaW4uc2V0dGluZ3Mud29ya2Zsb3cuc3BlbnRUaW1lRm9ybWF0KTtcclxuXHJcblx0XHRcdFx0Ly8gQWRkIHRvdGFsIHRpbWUgdG8gdGhlIGN1cnJlbnQgbGluZVxyXG5cdFx0XHRcdGNoYW5nZXMucHVzaCh7XHJcblx0XHRcdFx0XHRmcm9tOiBpbnNlcnRQb3NpdGlvbixcclxuXHRcdFx0XHRcdHRvOiBpbnNlcnRQb3NpdGlvbixcclxuXHRcdFx0XHRcdGluc2VydDogYCAoJHt0KFwiVG90YWxcIil9OiAke3RvdGFsU3BlbnRUaW1lfSlgLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gY2hhbmdlcztcclxufVxyXG5cclxuLyoqXHJcbiAqIFVwZGF0ZXMgdGhlIGNvbnRleHQgbWVudSB3aXRoIHdvcmtmbG93IG9wdGlvbnNcclxuICogQHBhcmFtIG1lbnUgVGhlIGNvbnRleHQgbWVudSB0byB1cGRhdGVcclxuICogQHBhcmFtIGVkaXRvciBUaGUgZWRpdG9yIGluc3RhbmNlXHJcbiAqIEBwYXJhbSBwbHVnaW4gVGhlIHBsdWdpbiBpbnN0YW5jZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZVdvcmtmbG93Q29udGV4dE1lbnUoXHJcblx0bWVudTogYW55LFxyXG5cdGVkaXRvcjogRWRpdG9yLFxyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG4pIHtcclxuXHRpZiAoIXBsdWdpbi5zZXR0aW5ncy53b3JrZmxvdy5lbmFibGVXb3JrZmxvdykge1xyXG5cdFx0cmV0dXJuO1xyXG5cdH1cclxuXHJcblx0Y29uc3QgY3Vyc29yID0gZWRpdG9yLmdldEN1cnNvcigpO1xyXG5cdGNvbnN0IGxpbmUgPSBlZGl0b3IuZ2V0TGluZShjdXJzb3IubGluZSk7XHJcblxyXG5cdC8vIENoZWNrIGlmIHRoaXMgbGluZSBjb250YWlucyBhIHRhc2tcclxuXHRjb25zdCB0YXNrUmVnZXggPSAvXihbXFxzfFxcdF0qKShbLSorXXxcXGQrXFwuKVxccytcXFsoLildLztcclxuXHRjb25zdCB0YXNrTWF0Y2ggPSBsaW5lLm1hdGNoKHRhc2tSZWdleCk7XHJcblxyXG5cdGlmICghdGFza01hdGNoKSB7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cclxuXHQvLyBDaGVjayBpZiB0aGlzIHRhc2sgaGFzIGEgd29ya2Zsb3cgdGFnIG9yIHN0YWdlIG1hcmtlclxyXG5cdGNvbnN0IHdvcmtmbG93SW5mbyA9IGV4dHJhY3RXb3JrZmxvd0luZm8obGluZSk7XHJcblxyXG5cdGlmICghd29ya2Zsb3dJbmZvKSB7XHJcblx0XHQvLyBBZGQgb3B0aW9uIHRvIGFkZCB3b3JrZmxvd1xyXG5cdFx0bWVudS5hZGRJdGVtKChpdGVtOiBhbnkpID0+IHtcclxuXHRcdFx0aXRlbS5zZXRUaXRsZSh0KFwiV29ya2Zsb3dcIikpO1xyXG5cdFx0XHRpdGVtLnNldEljb24oXCJsaXN0LW9yZGVyZWRcIik7XHJcblxyXG5cdFx0XHQvLyBDcmVhdGUgc3VibWVudVxyXG5cdFx0XHRjb25zdCBzdWJtZW51ID0gaXRlbS5zZXRTdWJtZW51KCk7XHJcblxyXG5cdFx0XHQvLyBBZGQgb3B0aW9uIHRvIGFkZCB3b3JrZmxvdyByb290XHJcblx0XHRcdHN1Ym1lbnUuYWRkSXRlbSgoYWRkSXRlbTogYW55KSA9PiB7XHJcblx0XHRcdFx0YWRkSXRlbS5zZXRUaXRsZSh0KFwiQWRkIGFzIHdvcmtmbG93IHJvb3RcIikpO1xyXG5cdFx0XHRcdGFkZEl0ZW0uc2V0SWNvbihcInBsdXMtY2lyY2xlXCIpO1xyXG5cclxuXHRcdFx0XHQvLyBDcmVhdGUgYSBzdWJtZW51IGZvciBhdmFpbGFibGUgd29ya2Zsb3dzXHJcblx0XHRcdFx0Y29uc3Qgd29ya2Zsb3dTdWJtZW51ID0gYWRkSXRlbS5zZXRTdWJtZW51KCk7XHJcblxyXG5cdFx0XHRcdHBsdWdpbi5zZXR0aW5ncy53b3JrZmxvdy5kZWZpbml0aW9ucy5mb3JFYWNoKCh3b3JrZmxvdykgPT4ge1xyXG5cdFx0XHRcdFx0d29ya2Zsb3dTdWJtZW51LmFkZEl0ZW0oKHdmSXRlbTogYW55KSA9PiB7XHJcblx0XHRcdFx0XHRcdHdmSXRlbS5zZXRUaXRsZSh3b3JrZmxvdy5uYW1lKTtcclxuXHRcdFx0XHRcdFx0d2ZJdGVtLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdC8vIEFkZCB3b3JrZmxvdyB0YWcgdXNpbmcgZGlzcGF0Y2hcclxuXHRcdFx0XHRcdFx0XHRlZGl0b3IuY20uZGlzcGF0Y2goe1xyXG5cdFx0XHRcdFx0XHRcdFx0Y2hhbmdlczoge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRmcm9tOiBlZGl0b3IucG9zVG9PZmZzZXQoY3Vyc29yKSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0dG86IGVkaXRvci5wb3NUb09mZnNldChjdXJzb3IpLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRpbnNlcnQ6IGAjd29ya2Zsb3cvJHt3b3JrZmxvdy5pZH1gLFxyXG5cdFx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBBZGQgcXVpY2sgd29ya2Zsb3cgYWN0aW9uc1xyXG5cdFx0XHRzdWJtZW51LmFkZFNlcGFyYXRvcigpO1xyXG5cclxuXHRcdFx0Ly8gQ29udmVydCB0YXNrIHRvIHdvcmtmbG93IHRlbXBsYXRlXHJcblx0XHRcdHN1Ym1lbnUuYWRkSXRlbSgoY29udmVydEl0ZW06IGFueSkgPT4ge1xyXG5cdFx0XHRcdGNvbnZlcnRJdGVtLnNldFRpdGxlKHQoXCJDb252ZXJ0IHRvIHdvcmtmbG93IHRlbXBsYXRlXCIpKTtcclxuXHRcdFx0XHRjb252ZXJ0SXRlbS5zZXRJY29uKFwiY29udmVydFwiKTtcclxuXHRcdFx0XHRjb252ZXJ0SXRlbS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdC8vIEltcG9ydCB0aGUgY29udmVyc2lvbiBmdW5jdGlvblxyXG5cdFx0XHRcdFx0Y29udmVydFRhc2tUb1dvcmtmbG93Q29tbWFuZChcclxuXHRcdFx0XHRcdFx0ZmFsc2UsXHJcblx0XHRcdFx0XHRcdGVkaXRvcixcclxuXHRcdFx0XHRcdFx0bnVsbCBhcyBhbnksXHJcblx0XHRcdFx0XHRcdHBsdWdpbixcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gU3RhcnQgd29ya2Zsb3cgaGVyZVxyXG5cdFx0XHRzdWJtZW51LmFkZEl0ZW0oKHN0YXJ0SXRlbTogYW55KSA9PiB7XHJcblx0XHRcdFx0c3RhcnRJdGVtLnNldFRpdGxlKHQoXCJTdGFydCB3b3JrZmxvdyBoZXJlXCIpKTtcclxuXHRcdFx0XHRzdGFydEl0ZW0uc2V0SWNvbihcInBsYXlcIik7XHJcblx0XHRcdFx0c3RhcnRJdGVtLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0c3RhcnRXb3JrZmxvd0hlcmVDb21tYW5kKFxyXG5cdFx0XHRcdFx0XHRmYWxzZSxcclxuXHRcdFx0XHRcdFx0ZWRpdG9yLFxyXG5cdFx0XHRcdFx0XHRudWxsIGFzIGFueSxcclxuXHRcdFx0XHRcdFx0cGx1Z2luLFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBRdWljayB3b3JrZmxvdyBjcmVhdGlvblxyXG5cdFx0XHRzdWJtZW51LmFkZEl0ZW0oKHF1aWNrSXRlbTogYW55KSA9PiB7XHJcblx0XHRcdFx0cXVpY2tJdGVtLnNldFRpdGxlKHQoXCJDcmVhdGUgcXVpY2sgd29ya2Zsb3dcIikpO1xyXG5cdFx0XHRcdHF1aWNrSXRlbS5zZXRJY29uKFwiemFwXCIpO1xyXG5cdFx0XHRcdHF1aWNrSXRlbS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdGNyZWF0ZVF1aWNrV29ya2Zsb3dDb21tYW5kKFxyXG5cdFx0XHRcdFx0XHRmYWxzZSxcclxuXHRcdFx0XHRcdFx0ZWRpdG9yLFxyXG5cdFx0XHRcdFx0XHRudWxsIGFzIGFueSxcclxuXHRcdFx0XHRcdFx0cGx1Z2luLFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHRcdHJldHVybjtcclxuXHR9XHJcblxyXG5cdC8vIElmIHdlJ3JlIGhlcmUsIHRoZSB0YXNrIGhhcyBhIHdvcmtmbG93IHRhZyBvciBzdGFnZSBtYXJrZXJcclxuXHQvLyBSZXNvbHZlIGNvbXBsZXRlIHdvcmtmbG93IGluZm9ybWF0aW9uXHJcblx0Y29uc3QgcmVzb2x2ZWRJbmZvID0gcmVzb2x2ZVdvcmtmbG93SW5mbyhcclxuXHRcdGxpbmUsXHJcblx0XHRlZGl0b3IuY20uc3RhdGUuZG9jLFxyXG5cdFx0Y3Vyc29yLmxpbmUgKyAxLFxyXG5cdFx0cGx1Z2luLFxyXG5cdCk7XHJcblxyXG5cdGlmICghcmVzb2x2ZWRJbmZvKSB7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cclxuXHRjb25zdCB7XHJcblx0XHR3b3JrZmxvd1R5cGUsXHJcblx0XHRjdXJyZW50U3RhZ2UsXHJcblx0XHRjdXJyZW50U3ViU3RhZ2UsXHJcblx0XHR3b3JrZmxvdyxcclxuXHRcdGlzUm9vdFRhc2ssXHJcblx0fSA9IHJlc29sdmVkSW5mbztcclxuXHJcblx0bWVudS5hZGRJdGVtKChpdGVtOiBhbnkpID0+IHtcclxuXHRcdGl0ZW0uc2V0VGl0bGUodChcIldvcmtmbG93XCIpKTtcclxuXHRcdGl0ZW0uc2V0SWNvbihcImxpc3Qtb3JkZXJlZFwiKTtcclxuXHJcblx0XHQvLyBDcmVhdGUgc3VibWVudVxyXG5cdFx0Y29uc3Qgc3VibWVudSA9IGl0ZW0uc2V0U3VibWVudSgpO1xyXG5cclxuXHRcdC8vIFNob3cgYXZhaWxhYmxlIG5leHQgc3RhZ2VzXHJcblx0XHRpZiAoY3VycmVudFN0YWdlLmlkID09PSBcIl9yb290X3Rhc2tfXCIpIHtcclxuXHRcdFx0aWYgKHdvcmtmbG93LnN0YWdlcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0Y29uc3QgZmlyc3RTdGFnZSA9IHdvcmtmbG93LnN0YWdlc1swXTtcclxuXHRcdFx0XHRzdWJtZW51LmFkZEl0ZW0oKG5leHRJdGVtOiBhbnkpID0+IHtcclxuXHRcdFx0XHRcdG5leHRJdGVtLnNldFRpdGxlKFxyXG5cdFx0XHRcdFx0XHRgJHt0KFwiTW92ZSB0byBzdGFnZVwiKX0gJHtmaXJzdFN0YWdlLm5hbWV9YCxcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRuZXh0SXRlbS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgY2hhbmdlcyA9IGNyZWF0ZVdvcmtmbG93U3RhZ2VUcmFuc2l0aW9uKFxyXG5cdFx0XHRcdFx0XHRcdHBsdWdpbixcclxuXHRcdFx0XHRcdFx0XHRlZGl0b3IsXHJcblx0XHRcdFx0XHRcdFx0bGluZSxcclxuXHRcdFx0XHRcdFx0XHRjdXJzb3IubGluZSxcclxuXHRcdFx0XHRcdFx0XHRmaXJzdFN0YWdlLFxyXG5cdFx0XHRcdFx0XHRcdHRydWUsXHJcblx0XHRcdFx0XHRcdFx0dW5kZWZpbmVkLFxyXG5cdFx0XHRcdFx0XHRcdHVuZGVmaW5lZCxcclxuXHRcdFx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0XHRcdGVkaXRvci5jbS5kaXNwYXRjaCh7XHJcblx0XHRcdFx0XHRcdFx0Y2hhbmdlcyxcclxuXHRcdFx0XHRcdFx0XHRhbm5vdGF0aW9uczpcclxuXHRcdFx0XHRcdFx0XHRcdHRhc2tTdGF0dXNDaGFuZ2VBbm5vdGF0aW9uLm9mKFwid29ya2Zsb3dDaGFuZ2VcIiksXHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSBpZiAoY3VycmVudFN0YWdlLmNhblByb2NlZWRUbykge1xyXG5cdFx0XHRjdXJyZW50U3RhZ2UuY2FuUHJvY2VlZFRvLmZvckVhY2goKG5leHRTdGFnZUlkKSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgbmV4dFN0YWdlID0gd29ya2Zsb3cuc3RhZ2VzLmZpbmQoXHJcblx0XHRcdFx0XHQocykgPT4gcy5pZCA9PT0gbmV4dFN0YWdlSWQsXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0aWYgKG5leHRTdGFnZSkge1xyXG5cdFx0XHRcdFx0c3VibWVudS5hZGRJdGVtKChuZXh0SXRlbTogYW55KSA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIENoZWNrIGlmIHRoaXMgaXMgdGhlIGxhc3Qgc3RhZ2VcclxuXHRcdFx0XHRcdFx0Y29uc3QgaXNMYXN0U3RhZ2UgPSBpc0xhc3RXb3JrZmxvd1N0YWdlT3JOb3RXb3JrZmxvdyhcclxuXHRcdFx0XHRcdFx0XHRsaW5lLFxyXG5cdFx0XHRcdFx0XHRcdGN1cnNvci5saW5lLFxyXG5cdFx0XHRcdFx0XHRcdGVkaXRvci5jbS5zdGF0ZS5kb2MsXHJcblx0XHRcdFx0XHRcdFx0cGx1Z2luLFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gSWYgbGFzdCBzdGFnZSwgc2hvdyBcIkNvbXBsZXRlIHN0YWdlXCIgaW5zdGVhZCBvZiBcIk1vdmUgdG9cIlxyXG5cdFx0XHRcdFx0XHRuZXh0SXRlbS5zZXRUaXRsZShcclxuXHRcdFx0XHRcdFx0XHRpc0xhc3RTdGFnZVxyXG5cdFx0XHRcdFx0XHRcdFx0PyBgJHt0KFwiQ29tcGxldGUgc3RhZ2VcIil9OiAke25leHRTdGFnZS5uYW1lfWBcclxuXHRcdFx0XHRcdFx0XHRcdDogYCR7dChcIk1vdmUgdG8gc3RhZ2VcIil9ICR7bmV4dFN0YWdlLm5hbWV9YCxcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0bmV4dEl0ZW0ub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgY2hhbmdlcyA9IGNyZWF0ZVdvcmtmbG93U3RhZ2VUcmFuc2l0aW9uKFxyXG5cdFx0XHRcdFx0XHRcdFx0cGx1Z2luLFxyXG5cdFx0XHRcdFx0XHRcdFx0ZWRpdG9yLFxyXG5cdFx0XHRcdFx0XHRcdFx0bGluZSxcclxuXHRcdFx0XHRcdFx0XHRcdGN1cnNvci5saW5lLFxyXG5cdFx0XHRcdFx0XHRcdFx0bmV4dFN0YWdlLFxyXG5cdFx0XHRcdFx0XHRcdFx0ZmFsc2UsXHJcblx0XHRcdFx0XHRcdFx0XHR1bmRlZmluZWQsXHJcblx0XHRcdFx0XHRcdFx0XHRjdXJyZW50U3ViU3RhZ2UsXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRlZGl0b3IuY20uZGlzcGF0Y2goe1xyXG5cdFx0XHRcdFx0XHRcdFx0Y2hhbmdlcyxcclxuXHRcdFx0XHRcdFx0XHRcdGFubm90YXRpb25zOiB0YXNrU3RhdHVzQ2hhbmdlQW5ub3RhdGlvbi5vZihcclxuXHRcdFx0XHRcdFx0XHRcdFx0aXNMYXN0U3RhZ2VcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQ/IFwid29ya2Zsb3dDaGFuZ2UuY29tcGxldGVTdGFnZVwiXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0OiBcIndvcmtmbG93Q2hhbmdlLm1vdmVUb1N0YWdlXCIsXHJcblx0XHRcdFx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9IGVsc2UgaWYgKGN1cnJlbnRTdGFnZS50eXBlID09PSBcInRlcm1pbmFsXCIpIHtcclxuXHRcdFx0c3VibWVudS5hZGRJdGVtKChuZXh0SXRlbTogYW55KSA9PiB7XHJcblx0XHRcdFx0bmV4dEl0ZW0uc2V0VGl0bGUodChcIkNvbXBsZXRlIHdvcmtmbG93XCIpKTtcclxuXHRcdFx0XHRuZXh0SXRlbS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdGNvbnN0IGNoYW5nZXMgPSBjcmVhdGVXb3JrZmxvd1N0YWdlVHJhbnNpdGlvbihcclxuXHRcdFx0XHRcdFx0cGx1Z2luLFxyXG5cdFx0XHRcdFx0XHRlZGl0b3IsXHJcblx0XHRcdFx0XHRcdGxpbmUsXHJcblx0XHRcdFx0XHRcdGN1cnNvci5saW5lLFxyXG5cdFx0XHRcdFx0XHRjdXJyZW50U3RhZ2UsXHJcblx0XHRcdFx0XHRcdGZhbHNlLFxyXG5cdFx0XHRcdFx0XHR1bmRlZmluZWQsXHJcblx0XHRcdFx0XHRcdGN1cnJlbnRTdWJTdGFnZSxcclxuXHRcdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdFx0ZWRpdG9yLmNtLmRpc3BhdGNoKHtcclxuXHRcdFx0XHRcdFx0Y2hhbmdlcyxcclxuXHRcdFx0XHRcdFx0YW5ub3RhdGlvbnM6XHJcblx0XHRcdFx0XHRcdFx0dGFza1N0YXR1c0NoYW5nZUFubm90YXRpb24ub2YoXCJ3b3JrZmxvd0NoYW5nZVwiKSxcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIFVzZSBkZXRlcm1pbmVOZXh0U3RhZ2UgdG8gZmluZCB0aGUgbmV4dCBzdGFnZVxyXG5cdFx0XHRjb25zdCB7IG5leHRTdGFnZUlkIH0gPSBkZXRlcm1pbmVOZXh0U3RhZ2UoXHJcblx0XHRcdFx0Y3VycmVudFN0YWdlLFxyXG5cdFx0XHRcdHdvcmtmbG93LFxyXG5cdFx0XHRcdGN1cnJlbnRTdWJTdGFnZSxcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIE9ubHkgYWRkIG1lbnUgb3B0aW9uIGlmIHRoZXJlJ3MgYSB2YWxpZCBuZXh0IHN0YWdlIHRoYXQncyBkaWZmZXJlbnQgZnJvbSBjdXJyZW50XHJcblx0XHRcdGlmIChuZXh0U3RhZ2VJZCAmJiBuZXh0U3RhZ2VJZCAhPT0gY3VycmVudFN0YWdlLmlkKSB7XHJcblx0XHRcdFx0Y29uc3QgbmV4dFN0YWdlID0gd29ya2Zsb3cuc3RhZ2VzLmZpbmQoXHJcblx0XHRcdFx0XHQocykgPT4gcy5pZCA9PT0gbmV4dFN0YWdlSWQsXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRpZiAobmV4dFN0YWdlKSB7XHJcblx0XHRcdFx0XHRzdWJtZW51LmFkZEl0ZW0oKG5leHRJdGVtOiBhbnkpID0+IHtcclxuXHRcdFx0XHRcdFx0bmV4dEl0ZW0uc2V0VGl0bGUoYCR7dChcIk1vdmUgdG9cIil9ICR7bmV4dFN0YWdlLm5hbWV9YCk7XHJcblx0XHRcdFx0XHRcdG5leHRJdGVtLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGNoYW5nZXMgPSBjcmVhdGVXb3JrZmxvd1N0YWdlVHJhbnNpdGlvbihcclxuXHRcdFx0XHRcdFx0XHRcdHBsdWdpbixcclxuXHRcdFx0XHRcdFx0XHRcdGVkaXRvcixcclxuXHRcdFx0XHRcdFx0XHRcdGxpbmUsXHJcblx0XHRcdFx0XHRcdFx0XHRjdXJzb3IubGluZSxcclxuXHRcdFx0XHRcdFx0XHRcdG5leHRTdGFnZSxcclxuXHRcdFx0XHRcdFx0XHRcdGZhbHNlLFxyXG5cdFx0XHRcdFx0XHRcdFx0dW5kZWZpbmVkLFxyXG5cdFx0XHRcdFx0XHRcdFx0dW5kZWZpbmVkLFxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdGVkaXRvci5jbS5kaXNwYXRjaCh7XHJcblx0XHRcdFx0XHRcdFx0XHRjaGFuZ2VzLFxyXG5cdFx0XHRcdFx0XHRcdFx0YW5ub3RhdGlvbnM6XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRhc2tTdGF0dXNDaGFuZ2VBbm5vdGF0aW9uLm9mKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFwid29ya2Zsb3dDaGFuZ2VcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0KSxcclxuXHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGQgb3B0aW9uIHRvIGFkZCBhIGNoaWxkIHRhc2sgd2l0aCBzYW1lIHN0YWdlXHJcblx0XHRzdWJtZW51LmFkZFNlcGFyYXRvcigpO1xyXG5cdFx0c3VibWVudS5hZGRJdGVtKChhZGRJdGVtOiBhbnkpID0+IHtcclxuXHRcdFx0YWRkSXRlbS5zZXRUaXRsZSh0KFwiQWRkIGNoaWxkIHRhc2sgd2l0aCBzYW1lIHN0YWdlXCIpKTtcclxuXHRcdFx0YWRkSXRlbS5zZXRJY29uKFwicGx1cy1jaXJjbGVcIik7XHJcblx0XHRcdGFkZEl0ZW0ub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0aWYgKHdvcmtmbG93SW5mby5jdXJyZW50U3RhZ2UgPT09IFwicm9vdFwiKSB7XHJcblx0XHRcdFx0XHRpZiAod29ya2Zsb3cuc3RhZ2VzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgZmlyc3RTdGFnZSA9IHdvcmtmbG93LnN0YWdlc1swXTtcclxuXHRcdFx0XHRcdFx0Y29uc3QgY2hhbmdlcyA9IGNyZWF0ZVdvcmtmbG93U3RhZ2VUcmFuc2l0aW9uKFxyXG5cdFx0XHRcdFx0XHRcdHBsdWdpbixcclxuXHRcdFx0XHRcdFx0XHRlZGl0b3IsXHJcblx0XHRcdFx0XHRcdFx0bGluZSxcclxuXHRcdFx0XHRcdFx0XHRjdXJzb3IubGluZSxcclxuXHRcdFx0XHRcdFx0XHRmaXJzdFN0YWdlLFxyXG5cdFx0XHRcdFx0XHRcdGZhbHNlLFxyXG5cdFx0XHRcdFx0XHRcdHVuZGVmaW5lZCxcclxuXHRcdFx0XHRcdFx0XHR1bmRlZmluZWQsXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdGVkaXRvci5jbS5kaXNwYXRjaCh7XHJcblx0XHRcdFx0XHRcdFx0Y2hhbmdlcyxcclxuXHRcdFx0XHRcdFx0XHRhbm5vdGF0aW9uczpcclxuXHRcdFx0XHRcdFx0XHRcdHRhc2tTdGF0dXNDaGFuZ2VBbm5vdGF0aW9uLm9mKFwid29ya2Zsb3dDaGFuZ2VcIiksXHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0gZWxzZSBpZiAoY3VycmVudFN0YWdlLmlkID09PSBcIl9yb290X3Rhc2tfXCIpIHtcclxuXHRcdFx0XHRcdGlmICh3b3JrZmxvdy5zdGFnZXMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBmaXJzdFN0YWdlID0gd29ya2Zsb3cuc3RhZ2VzWzBdO1xyXG5cdFx0XHRcdFx0XHRjb25zdCBjaGFuZ2VzID0gY3JlYXRlV29ya2Zsb3dTdGFnZVRyYW5zaXRpb24oXHJcblx0XHRcdFx0XHRcdFx0cGx1Z2luLFxyXG5cdFx0XHRcdFx0XHRcdGVkaXRvcixcclxuXHRcdFx0XHRcdFx0XHRsaW5lLFxyXG5cdFx0XHRcdFx0XHRcdGN1cnNvci5saW5lLFxyXG5cdFx0XHRcdFx0XHRcdGZpcnN0U3RhZ2UsXHJcblx0XHRcdFx0XHRcdFx0ZmFsc2UsXHJcblx0XHRcdFx0XHRcdFx0dW5kZWZpbmVkLFxyXG5cdFx0XHRcdFx0XHRcdHVuZGVmaW5lZCxcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0ZWRpdG9yLmNtLmRpc3BhdGNoKHtcclxuXHRcdFx0XHRcdFx0XHRjaGFuZ2VzLFxyXG5cdFx0XHRcdFx0XHRcdGFubm90YXRpb25zOlxyXG5cdFx0XHRcdFx0XHRcdFx0dGFza1N0YXR1c0NoYW5nZUFubm90YXRpb24ub2YoXCJ3b3JrZmxvd0NoYW5nZVwiKSxcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGNvbnN0IGNoYW5nZXMgPSBjcmVhdGVXb3JrZmxvd1N0YWdlVHJhbnNpdGlvbihcclxuXHRcdFx0XHRcdFx0cGx1Z2luLFxyXG5cdFx0XHRcdFx0XHRlZGl0b3IsXHJcblx0XHRcdFx0XHRcdGxpbmUsXHJcblx0XHRcdFx0XHRcdGN1cnNvci5saW5lLFxyXG5cdFx0XHRcdFx0XHRjdXJyZW50U3RhZ2UsXHJcblx0XHRcdFx0XHRcdGZhbHNlLFxyXG5cdFx0XHRcdFx0XHRjdXJyZW50U3ViU3RhZ2UsXHJcblx0XHRcdFx0XHRcdHVuZGVmaW5lZCxcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRlZGl0b3IuY20uZGlzcGF0Y2goe1xyXG5cdFx0XHRcdFx0XHRjaGFuZ2VzLFxyXG5cdFx0XHRcdFx0XHRhbm5vdGF0aW9uczpcclxuXHRcdFx0XHRcdFx0XHR0YXNrU3RhdHVzQ2hhbmdlQW5ub3RhdGlvbi5vZihcIndvcmtmbG93Q2hhbmdlXCIpLFxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG59XHJcblxyXG4vKipcclxuICogQ2hlY2tzIGlmIGEgdGFzayBsaW5lIHJlcHJlc2VudHMgdGhlIGZpbmFsIHN0YWdlIG9mIGEgd29ya2Zsb3cgb3IgaXMgbm90IHBhcnQgb2YgYSB3b3JrZmxvdy5cclxuICogUmV0dXJucyB0cnVlIGlmIGl0J3MgdGhlIGZpbmFsIHN0YWdlIG9yIG5vdCBhIHdvcmtmbG93IHRhc2ssIGZhbHNlIG90aGVyd2lzZS5cclxuICogQHBhcmFtIGxpbmVUZXh0IFRoZSB0ZXh0IG9mIHRoZSBsaW5lIGNvbnRhaW5pbmcgdGhlIHRhc2tcclxuICogQHBhcmFtIGxpbmVOdW1iZXIgVGhlIGxpbmUgbnVtYmVyICgxLWJhc2VkKVxyXG4gKiBAcGFyYW0gZG9jIFRoZSBkb2N1bWVudCB0ZXh0XHJcbiAqIEBwYXJhbSBwbHVnaW4gVGhlIHBsdWdpbiBpbnN0YW5jZVxyXG4gKiBAcmV0dXJucyBib29sZWFuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaXNMYXN0V29ya2Zsb3dTdGFnZU9yTm90V29ya2Zsb3coXHJcblx0bGluZVRleHQ6IHN0cmluZyxcclxuXHRsaW5lTnVtYmVyOiBudW1iZXIsXHJcblx0ZG9jOiBUZXh0LFxyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG4pOiBib29sZWFuIHtcclxuXHRjb25zdCB3b3JrZmxvd0luZm8gPSBleHRyYWN0V29ya2Zsb3dJbmZvKGxpbmVUZXh0KTtcclxuXHRpZiAoIXdvcmtmbG93SW5mbykge1xyXG5cdFx0cmV0dXJuIHRydWU7XHJcblx0fVxyXG5cclxuXHRsZXQgd29ya2Zsb3dUeXBlID0gd29ya2Zsb3dJbmZvLndvcmtmbG93VHlwZTtcclxuXHRsZXQgY3VycmVudFN0YWdlSWQgPSB3b3JrZmxvd0luZm8uY3VycmVudFN0YWdlO1xyXG5cdGxldCBjdXJyZW50U3ViU3RhZ2VJZCA9IHdvcmtmbG93SW5mby5zdWJTdGFnZTtcclxuXHJcblx0aWYgKHdvcmtmbG93VHlwZSA9PT0gXCJmcm9tUGFyZW50XCIpIHtcclxuXHRcdGNvbnN0IHNhZmVMaW5lTnVtYmVyID0gZW5zdXJlV2l0aGluQm91bmRzKGxpbmVOdW1iZXIsIGRvYyk7XHJcblx0XHRjb25zdCBwYXJlbnRXb3JrZmxvdyA9IGZpbmRQYXJlbnRXb3JrZmxvdyhkb2MsIHNhZmVMaW5lTnVtYmVyKTtcclxuXHJcblx0XHRpZiAoIXBhcmVudFdvcmtmbG93KSB7XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fVxyXG5cdFx0d29ya2Zsb3dUeXBlID0gcGFyZW50V29ya2Zsb3c7XHJcblx0fVxyXG5cclxuXHRjb25zdCB3b3JrZmxvdyA9IHBsdWdpbi5zZXR0aW5ncy53b3JrZmxvdy5kZWZpbml0aW9ucy5maW5kKFxyXG5cdFx0KHdmOiBXb3JrZmxvd0RlZmluaXRpb24pID0+IHdmLmlkID09PSB3b3JrZmxvd1R5cGUsXHJcblx0KTtcclxuXHJcblx0aWYgKCF3b3JrZmxvdykge1xyXG5cdFx0cmV0dXJuIHRydWU7XHJcblx0fVxyXG5cclxuXHRpZiAoY3VycmVudFN0YWdlSWQgPT09IFwicm9vdFwiKSB7XHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblx0fVxyXG5cclxuXHRjb25zdCBjdXJyZW50U3RhZ2UgPSB3b3JrZmxvdy5zdGFnZXMuZmluZCgocykgPT4gcy5pZCA9PT0gY3VycmVudFN0YWdlSWQpO1xyXG5cdGlmICghY3VycmVudFN0YWdlKSB7XHJcblx0XHRyZXR1cm4gdHJ1ZTtcclxuXHR9XHJcblxyXG5cdGlmIChjdXJyZW50U3RhZ2UudHlwZSA9PT0gXCJ0ZXJtaW5hbFwiKSB7XHJcblx0XHRyZXR1cm4gdHJ1ZTtcclxuXHR9XHJcblxyXG5cdGlmIChcclxuXHRcdGN1cnJlbnRTdGFnZS50eXBlID09PSBcImN5Y2xlXCIgJiZcclxuXHRcdGN1cnJlbnRTdGFnZS5zdWJTdGFnZXMgJiZcclxuXHRcdGN1cnJlbnRTdWJTdGFnZUlkXHJcblx0KSB7XHJcblx0XHRjb25zdCBjdXJyZW50U3ViU3RhZ2UgPSBjdXJyZW50U3RhZ2Uuc3ViU3RhZ2VzLmZpbmQoXHJcblx0XHRcdChzcykgPT4gc3MuaWQgPT09IGN1cnJlbnRTdWJTdGFnZUlkLFxyXG5cdFx0KTtcclxuXHRcdGlmICghY3VycmVudFN1YlN0YWdlKSB7XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IGlzTGFzdFN1YlN0YWdlID0gIWN1cnJlbnRTdWJTdGFnZS5uZXh0O1xyXG5cdFx0Y29uc3QgcGFyZW50U3RhZ2VDYW5Qcm9jZWVkID1cclxuXHRcdFx0Y3VycmVudFN0YWdlLmNhblByb2NlZWRUbyAmJiBjdXJyZW50U3RhZ2UuY2FuUHJvY2VlZFRvLmxlbmd0aCA+IDA7XHJcblx0XHRjb25zdCBwYXJlbnRTdGFnZUhhc0xpbmVhck5leHQgPVxyXG5cdFx0XHR0eXBlb2YgY3VycmVudFN0YWdlLm5leHQgPT09IFwic3RyaW5nXCIgfHxcclxuXHRcdFx0KEFycmF5LmlzQXJyYXkoY3VycmVudFN0YWdlLm5leHQpICYmIGN1cnJlbnRTdGFnZS5uZXh0Lmxlbmd0aCA+IDApO1xyXG5cclxuXHRcdGlmIChcclxuXHRcdFx0aXNMYXN0U3ViU3RhZ2UgJiZcclxuXHRcdFx0IXBhcmVudFN0YWdlQ2FuUHJvY2VlZCAmJlxyXG5cdFx0XHQhcGFyZW50U3RhZ2VIYXNMaW5lYXJOZXh0XHJcblx0XHQpIHtcclxuXHRcdFx0Y29uc3QgY3VycmVudEluZGV4ID0gd29ya2Zsb3cuc3RhZ2VzLmZpbmRJbmRleChcclxuXHRcdFx0XHQocykgPT4gcy5pZCA9PT0gY3VycmVudFN0YWdlLmlkLFxyXG5cdFx0XHQpO1xyXG5cdFx0XHRpZiAoY3VycmVudEluZGV4ID09PSB3b3JrZmxvdy5zdGFnZXMubGVuZ3RoIC0gMSkge1xyXG5cdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblx0fVxyXG5cclxuXHRjb25zdCBoYXNFeHBsaWNpdE5leHQgPVxyXG5cdFx0Y3VycmVudFN0YWdlLm5leHQgfHxcclxuXHRcdChjdXJyZW50U3RhZ2UuY2FuUHJvY2VlZFRvICYmIGN1cnJlbnRTdGFnZS5jYW5Qcm9jZWVkVG8ubGVuZ3RoID4gMCk7XHJcblx0aWYgKGhhc0V4cGxpY2l0TmV4dCkge1xyXG5cdFx0cmV0dXJuIGZhbHNlO1xyXG5cdH1cclxuXHJcblx0Y29uc3QgY3VycmVudEluZGV4ID0gd29ya2Zsb3cuc3RhZ2VzLmZpbmRJbmRleChcclxuXHRcdChzKSA9PiBzLmlkID09PSBjdXJyZW50U3RhZ2UuaWQsXHJcblx0KTtcclxuXHRpZiAoY3VycmVudEluZGV4IDwgMCkge1xyXG5cdFx0cmV0dXJuIHRydWU7XHJcblx0fVxyXG5cdGlmIChjdXJyZW50SW5kZXggPT09IHdvcmtmbG93LnN0YWdlcy5sZW5ndGggLSAxKSB7XHJcblx0XHRyZXR1cm4gdHJ1ZTtcclxuXHR9XHJcblxyXG5cdHJldHVybiBmYWxzZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIERldGVybWluZXMgdGhlIG5leHQgc3RhZ2UgaW4gYSB3b3JrZmxvdyBiYXNlZCBvbiB0aGUgY3VycmVudCBzdGFnZSBhbmQgd29ya2Zsb3cgZGVmaW5pdGlvblxyXG4gKiBAcGFyYW0gY3VycmVudFN0YWdlIFRoZSBjdXJyZW50IHdvcmtmbG93IHN0YWdlXHJcbiAqIEBwYXJhbSB3b3JrZmxvdyBUaGUgd29ya2Zsb3cgZGVmaW5pdGlvblxyXG4gKiBAcGFyYW0gY3VycmVudFN1YlN0YWdlIE9wdGlvbmFsIGN1cnJlbnQgc3Vic3RhZ2Ugb2JqZWN0XHJcbiAqIEByZXR1cm5zIE9iamVjdCBjb250YWluaW5nIHRoZSBuZXh0IHN0YWdlIElEIGFuZCBvcHRpb25hbCBuZXh0IHN1YnN0YWdlIElEXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZGV0ZXJtaW5lTmV4dFN0YWdlKFxyXG5cdGN1cnJlbnRTdGFnZTogV29ya2Zsb3dTdGFnZSxcclxuXHR3b3JrZmxvdzogV29ya2Zsb3dEZWZpbml0aW9uLFxyXG5cdGN1cnJlbnRTdWJTdGFnZT86IFdvcmtmbG93U3ViU3RhZ2UsXHJcbik6IHsgbmV4dFN0YWdlSWQ6IHN0cmluZzsgbmV4dFN1YlN0YWdlSWQ/OiBzdHJpbmcgfSB7XHJcblx0bGV0IG5leHRTdGFnZUlkID0gY3VycmVudFN0YWdlLmlkO1xyXG5cdGxldCBuZXh0U3ViU3RhZ2VJZDogc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG5cclxuXHRpZiAoY3VycmVudFN0YWdlLmlkID09PSBST09UX1NUQUdFX0lEKSB7XHJcblx0XHRuZXh0U3RhZ2VJZCA9IHdvcmtmbG93LnN0YWdlc1swXT8uaWQgPz8gY3VycmVudFN0YWdlLmlkO1xyXG5cdFx0cmV0dXJuIHsgbmV4dFN0YWdlSWQsIG5leHRTdWJTdGFnZUlkIH07XHJcblx0fVxyXG5cclxuXHRpZiAoY3VycmVudFN0YWdlLnR5cGUgPT09IFwidGVybWluYWxcIikge1xyXG5cdFx0cmV0dXJuIHsgbmV4dFN0YWdlSWQsIG5leHRTdWJTdGFnZUlkIH07XHJcblx0fVxyXG5cclxuXHRpZiAoY3VycmVudFN0YWdlLnR5cGUgPT09IFwiY3ljbGVcIiAmJiBjdXJyZW50U3ViU3RhZ2UpIHtcclxuXHRcdGlmIChjdXJyZW50U3ViU3RhZ2UubmV4dCkge1xyXG5cdFx0XHRuZXh0U3RhZ2VJZCA9IGN1cnJlbnRTdGFnZS5pZDtcclxuXHRcdFx0bmV4dFN1YlN0YWdlSWQgPSBjdXJyZW50U3ViU3RhZ2UubmV4dDtcclxuXHRcdFx0cmV0dXJuIHsgbmV4dFN0YWdlSWQsIG5leHRTdWJTdGFnZUlkIH07XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKGN1cnJlbnRTdGFnZS5jYW5Qcm9jZWVkVG8/Lmxlbmd0aCkge1xyXG5cdFx0XHRuZXh0U3RhZ2VJZCA9IGN1cnJlbnRTdGFnZS5jYW5Qcm9jZWVkVG9bMF07XHJcblx0XHRcdHJldHVybiB7IG5leHRTdGFnZUlkLCBuZXh0U3ViU3RhZ2VJZCB9O1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHN1YlN0YWdlQ291bnQgPSBjdXJyZW50U3RhZ2Uuc3ViU3RhZ2VzPy5sZW5ndGggPz8gMDtcclxuXHRcdGlmIChzdWJTdGFnZUNvdW50ID09PSAxKSB7XHJcblx0XHRcdG5leHRTdGFnZUlkID0gY3VycmVudFN0YWdlLmlkO1xyXG5cdFx0XHRuZXh0U3ViU3RhZ2VJZCA9IGN1cnJlbnRTdWJTdGFnZS5pZDtcclxuXHRcdH0gZWxzZSBpZiAoc3ViU3RhZ2VDb3VudCA+IDEpIHtcclxuXHRcdFx0bmV4dFN0YWdlSWQgPSBjdXJyZW50U3RhZ2UuaWQ7XHJcblx0XHRcdG5leHRTdWJTdGFnZUlkID0gY3VycmVudFN0YWdlLnN1YlN0YWdlcyFbMF0uaWQ7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4geyBuZXh0U3RhZ2VJZCwgbmV4dFN1YlN0YWdlSWQgfTtcclxuXHR9XHJcblxyXG5cdGlmIChjdXJyZW50U3RhZ2UudHlwZSA9PT0gXCJsaW5lYXJcIikge1xyXG5cdFx0aWYgKHR5cGVvZiBjdXJyZW50U3RhZ2UubmV4dCA9PT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHRuZXh0U3RhZ2VJZCA9IGN1cnJlbnRTdGFnZS5uZXh0O1xyXG5cdFx0fSBlbHNlIGlmIChcclxuXHRcdFx0QXJyYXkuaXNBcnJheShjdXJyZW50U3RhZ2UubmV4dCkgJiZcclxuXHRcdFx0Y3VycmVudFN0YWdlLm5leHQubGVuZ3RoXHJcblx0XHQpIHtcclxuXHRcdFx0bmV4dFN0YWdlSWQgPSBjdXJyZW50U3RhZ2UubmV4dFswXTtcclxuXHRcdH0gZWxzZSBpZiAoY3VycmVudFN0YWdlLmNhblByb2NlZWRUbz8ubGVuZ3RoKSB7XHJcblx0XHRcdG5leHRTdGFnZUlkID0gY3VycmVudFN0YWdlLmNhblByb2NlZWRUb1swXTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGNvbnN0IGN1cnJlbnRJbmRleCA9IHdvcmtmbG93LnN0YWdlcy5maW5kSW5kZXgoXHJcblx0XHRcdFx0KHN0YWdlKSA9PiBzdGFnZS5pZCA9PT0gY3VycmVudFN0YWdlLmlkLFxyXG5cdFx0XHQpO1xyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0Y3VycmVudEluZGV4ID49IDAgJiZcclxuXHRcdFx0XHRjdXJyZW50SW5kZXggPCB3b3JrZmxvdy5zdGFnZXMubGVuZ3RoIC0gMVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRuZXh0U3RhZ2VJZCA9IHdvcmtmbG93LnN0YWdlc1tjdXJyZW50SW5kZXggKyAxXS5pZDtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHsgbmV4dFN0YWdlSWQsIG5leHRTdWJTdGFnZUlkIH07XHJcblx0fVxyXG5cclxuXHRpZiAoY3VycmVudFN0YWdlLnR5cGUgPT09IFwiY3ljbGVcIikge1xyXG5cdFx0aWYgKGN1cnJlbnRTdGFnZS5jYW5Qcm9jZWVkVG8/Lmxlbmd0aCkge1xyXG5cdFx0XHRuZXh0U3RhZ2VJZCA9IGN1cnJlbnRTdGFnZS5jYW5Qcm9jZWVkVG9bMF07XHJcblx0XHR9XHJcblx0XHRyZXR1cm4geyBuZXh0U3RhZ2VJZCwgbmV4dFN1YlN0YWdlSWQgfTtcclxuXHR9XHJcblxyXG5cdHJldHVybiB7IG5leHRTdGFnZUlkLCBuZXh0U3ViU3RhZ2VJZCB9O1xyXG59XHJcblxyXG4vLyBIZWxwZXIgZnVuY3Rpb24gdG8gY3JlYXRlIHdvcmtmbG93IHN0YWdlIHRyYW5zaXRpb25cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVdvcmtmbG93U3RhZ2VUcmFuc2l0aW9uKFxyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdGVkaXRvcjogRWRpdG9yLFxyXG5cdGxpbmU6IHN0cmluZyxcclxuXHRsaW5lTnVtYmVyOiBudW1iZXIsXHJcblx0bmV4dFN0YWdlOiBXb3JrZmxvd1N0YWdlLFxyXG5cdGlzUm9vdFRhc2s6IGJvb2xlYW4sXHJcblx0bmV4dFN1YlN0YWdlPzogV29ya2Zsb3dTdWJTdGFnZSxcclxuXHRjdXJyZW50U3ViU3RhZ2U/OiBXb3JrZmxvd1N1YlN0YWdlLFxyXG4pIHtcclxuXHRjb25zdCBkb2MgPSBlZGl0b3IuY20uc3RhdGUuZG9jO1xyXG5cdGNvbnN0IGFwcCA9IHBsdWdpbi5hcHA7XHJcblxyXG5cdGNvbnN0IHNhZmVMaW5lTnVtYmVyID0gZW5zdXJlV2l0aGluQm91bmRzKGxpbmVOdW1iZXIgKyAxLCBkb2MpO1xyXG5cdGNvbnN0IGxpbmVTdGFydCA9IGRvYy5saW5lKHNhZmVMaW5lTnVtYmVyKTtcclxuXHJcblx0Y29uc3QgZGVmYXVsdEluZGVudGF0aW9uID0gYnVpbGRJbmRlbnRTdHJpbmcoYXBwKTtcclxuXHRsZXQgaW5kZW50YXRpb24gPSBnZXRJbmRlbnRhdGlvbihsaW5lKTtcclxuXHRpZiAoaXNSb290VGFzaykge1xyXG5cdFx0aW5kZW50YXRpb24gKz0gZGVmYXVsdEluZGVudGF0aW9uO1xyXG5cdH1cclxuXHJcblx0Y29uc3QgY2hhbmdlczogeyBmcm9tOiBudW1iZXI7IHRvOiBudW1iZXI7IGluc2VydDogc3RyaW5nIH1bXSA9IFtdO1xyXG5cdGNvbnN0IGlzRmluYWxTdGFnZSA9IGlzTGFzdFdvcmtmbG93U3RhZ2VPck5vdFdvcmtmbG93KFxyXG5cdFx0bGluZSxcclxuXHRcdGxpbmVOdW1iZXIsXHJcblx0XHRkb2MsXHJcblx0XHRwbHVnaW4sXHJcblx0KTtcclxuXHJcblx0Y29uc3QgdGFza01hdGNoID0gbGluZS5tYXRjaChUQVNLX1JFR0VYKTtcclxuXHRpZiAodGFza01hdGNoKSB7XHJcblx0XHRjb25zdCB0YXNrU3RhcnQgPSBsaW5lU3RhcnQuZnJvbSArIHRhc2tNYXRjaFswXS5pbmRleE9mKFwiW1wiKTtcclxuXHRcdGNoYW5nZXMucHVzaCh7XHJcblx0XHRcdGZyb206IHRhc2tTdGFydCArIDEsXHJcblx0XHRcdHRvOiB0YXNrU3RhcnQgKyAyLFxyXG5cdFx0XHRpbnNlcnQ6IFwieFwiLFxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRsZXQgd29ya2Zsb3dUeXBlID0gXCJcIjtcclxuXHRjb25zdCB3b3JrZmxvd1RhZ01hdGNoID0gbGluZS5tYXRjaChXT1JLRkxPV19UQUdfUkVHRVgpO1xyXG5cdGlmICh3b3JrZmxvd1RhZ01hdGNoKSB7XHJcblx0XHR3b3JrZmxvd1R5cGUgPSB3b3JrZmxvd1RhZ01hdGNoWzFdO1xyXG5cdH0gZWxzZSB7XHJcblx0XHR3b3JrZmxvd1R5cGUgPVxyXG5cdFx0XHRmaW5kUGFyZW50V29ya2Zsb3coZG9jLCBzYWZlTGluZU51bWJlcikgfHxcclxuXHRcdFx0bmV4dFN0YWdlLmlkLnNwbGl0KFNUQUdFX1NFUEFSQVRPUilbMF07XHJcblx0fVxyXG5cclxuXHRjb25zdCB0aW1lQ2hhbmdlcyA9IHByb2Nlc3NUaW1lc3RhbXBBbmRDYWxjdWxhdGVUaW1lKFxyXG5cdFx0bGluZSxcclxuXHRcdGRvYyxcclxuXHRcdGxpbmVTdGFydC5mcm9tLFxyXG5cdFx0bGluZU51bWJlcixcclxuXHRcdHdvcmtmbG93VHlwZSxcclxuXHRcdHBsdWdpbixcclxuXHQpO1xyXG5cdGNoYW5nZXMucHVzaCguLi50aW1lQ2hhbmdlcyk7XHJcblxyXG5cdC8vIElmIHdlJ3JlIHRyYW5zaXRpb25pbmcgZnJvbSBhIHN1Yi1zdGFnZSB0byBhIG5ldyBtYWluIHN0YWdlXHJcblx0Ly8gTWFyayB0aGUgY3VycmVudCBzdWItc3RhZ2UgYXMgY29tcGxldGUgYW5kIHJlZHVjZSBpbmRlbnRhdGlvblxyXG5cdGlmIChjdXJyZW50U3ViU3RhZ2UgJiYgIW5leHRTdWJTdGFnZSAmJiAhaXNGaW5hbFN0YWdlKSB7XHJcblx0XHRjb25zdCBzdGFnZU1hcmtlciA9IHNhZmVseUZpbmRTdGFnZU1hcmtlcihsaW5lKTtcclxuXHRcdGlmIChzdGFnZU1hcmtlciAmJiBwbHVnaW4uc2V0dGluZ3Mud29ya2Zsb3cuYXV0b1JlbW92ZUxhc3RTdGFnZU1hcmtlcikge1xyXG5cdFx0XHRjaGFuZ2VzLnB1c2goe1xyXG5cdFx0XHRcdGZyb206IGxpbmVTdGFydC5mcm9tICsgc3RhZ2VNYXJrZXIuaW5kZXgsXHJcblx0XHRcdFx0dG86IGxpbmVTdGFydC5mcm9tICsgc3RhZ2VNYXJrZXIuaW5kZXggKyBzdGFnZU1hcmtlclswXS5sZW5ndGgsXHJcblx0XHRcdFx0aW5zZXJ0OiBcIlwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHRpbmRlbnRhdGlvbiA9IHJlbW92ZVRyYWlsaW5nSW5kZW50YXRpb24oaW5kZW50YXRpb24sIGFwcCk7XHJcblx0fVxyXG5cclxuXHRpZiAoIWlzRmluYWxTdGFnZSkge1xyXG5cdFx0Y29uc3QgbmV3VGFza1RleHQgPSBnZW5lcmF0ZVdvcmtmbG93VGFza1RleHQoXHJcblx0XHRcdG5leHRTdGFnZSxcclxuXHRcdFx0aW5kZW50YXRpb24sXHJcblx0XHRcdHBsdWdpbixcclxuXHRcdFx0dHJ1ZSxcclxuXHRcdFx0bmV4dFN1YlN0YWdlLFxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBBZGQgdGhlIG5ldyB0YXNrIGFmdGVyIHRoZSBjdXJyZW50IGxpbmVcclxuXHRcdGNoYW5nZXMucHVzaCh7XHJcblx0XHRcdGZyb206IGxpbmVTdGFydC50byxcclxuXHRcdFx0dG86IGxpbmVTdGFydC50byxcclxuXHRcdFx0aW5zZXJ0OiBgXFxuJHtuZXdUYXNrVGV4dH1gLFxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyBSZW1vdmUgc3RhZ2UgbWFya2VyIGZyb20gY3VycmVudCBsaW5lIGlmIHNldHRpbmcgZW5hYmxlZFxyXG5cdGlmIChwbHVnaW4/LnNldHRpbmdzLndvcmtmbG93LmF1dG9SZW1vdmVMYXN0U3RhZ2VNYXJrZXIpIHtcclxuXHRcdGNvbnN0IHN0YWdlTWFya2VyID0gc2FmZWx5RmluZFN0YWdlTWFya2VyKGxpbmUpO1xyXG5cdFx0aWYgKHN0YWdlTWFya2VyKSB7XHJcblx0XHRcdGNoYW5nZXMucHVzaCh7XHJcblx0XHRcdFx0ZnJvbTogbGluZVN0YXJ0LmZyb20gKyBzdGFnZU1hcmtlci5pbmRleCxcclxuXHRcdFx0XHR0bzogbGluZVN0YXJ0LmZyb20gKyBzdGFnZU1hcmtlci5pbmRleCArIHN0YWdlTWFya2VyWzBdLmxlbmd0aCxcclxuXHRcdFx0XHRpbnNlcnQ6IFwiXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIGNoYW5nZXM7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZXNvbHZlcyBjb21wbGV0ZSB3b3JrZmxvdyBpbmZvcm1hdGlvbiBmb3IgYSB0YXNrIGxpbmVcclxuICogQHBhcmFtIGxpbmVUZXh0IFRoZSB0ZXh0IG9mIHRoZSBsaW5lIGNvbnRhaW5pbmcgdGhlIHRhc2tcclxuICogQHBhcmFtIGRvYyBUaGUgZG9jdW1lbnQgdGV4dFxyXG4gKiBAcGFyYW0gbGluZU51bWJlciBUaGUgbGluZSBudW1iZXIgKDEtYmFzZWQpXHJcbiAqIEBwYXJhbSBwbHVnaW4gVGhlIHBsdWdpbiBpbnN0YW5jZVxyXG4gKiBAcmV0dXJucyBDb21wbGV0ZSB3b3JrZmxvdyBpbmZvcm1hdGlvbiBvciBudWxsIGlmIG5vdCBhIHdvcmtmbG93IHRhc2tcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlV29ya2Zsb3dJbmZvKFxyXG5cdGxpbmVUZXh0OiBzdHJpbmcsXHJcblx0ZG9jOiBUZXh0LFxyXG5cdGxpbmVOdW1iZXI6IG51bWJlcixcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuKToge1xyXG5cdHdvcmtmbG93VHlwZTogc3RyaW5nO1xyXG5cdGN1cnJlbnRTdGFnZTogV29ya2Zsb3dTdGFnZTtcclxuXHRjdXJyZW50U3ViU3RhZ2U/OiBXb3JrZmxvd1N1YlN0YWdlO1xyXG5cdHdvcmtmbG93OiBXb3JrZmxvd0RlZmluaXRpb247XHJcblx0aXNSb290VGFzazogYm9vbGVhbjtcclxufSB8IG51bGwge1xyXG5cdGNvbnN0IHdvcmtmbG93SW5mbyA9IGV4dHJhY3RXb3JrZmxvd0luZm8obGluZVRleHQpO1xyXG5cdGlmICghd29ya2Zsb3dJbmZvKSB7XHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XHJcblxyXG5cdGxldCB3b3JrZmxvd1R5cGUgPSB3b3JrZmxvd0luZm8ud29ya2Zsb3dUeXBlO1xyXG5cdGxldCBzdGFnZUlkID0gd29ya2Zsb3dJbmZvLmN1cnJlbnRTdGFnZTtcclxuXHRsZXQgc3ViU3RhZ2VJZCA9IHdvcmtmbG93SW5mby5zdWJTdGFnZTtcclxuXHJcblx0aWYgKHdvcmtmbG93VHlwZSA9PT0gXCJmcm9tUGFyZW50XCIpIHtcclxuXHRcdGNvbnN0IHNhZmVMaW5lTnVtYmVyID0gZW5zdXJlV2l0aGluQm91bmRzKGxpbmVOdW1iZXIsIGRvYyk7XHJcblx0XHRjb25zdCBwYXJlbnRXb3JrZmxvdyA9IGZpbmRQYXJlbnRXb3JrZmxvdyhkb2MsIHNhZmVMaW5lTnVtYmVyKTtcclxuXHJcblx0XHRpZiAoIXBhcmVudFdvcmtmbG93KSB7XHJcblx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0fVxyXG5cdFx0d29ya2Zsb3dUeXBlID0gcGFyZW50V29ya2Zsb3c7XHJcblx0fVxyXG5cclxuXHRjb25zdCB3b3JrZmxvdyA9IHBsdWdpbi5zZXR0aW5ncy53b3JrZmxvdy5kZWZpbml0aW9ucy5maW5kKFxyXG5cdFx0KHdmOiBXb3JrZmxvd0RlZmluaXRpb24pID0+IHdmLmlkID09PSB3b3JrZmxvd1R5cGUsXHJcblx0KTtcclxuXHRpZiAoIXdvcmtmbG93KSB7XHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XHJcblxyXG5cdGNvbnN0IGlzUm9vdFRhc2sgPVxyXG5cdFx0c3RhZ2VJZCA9PT0gXCJyb290XCIgfHxcclxuXHRcdChsaW5lVGV4dC5pbmNsdWRlcyhgI3dvcmtmbG93LyR7d29ya2Zsb3dUeXBlfWApICYmXHJcblx0XHRcdCFsaW5lVGV4dC5pbmNsdWRlcyhcIltzdGFnZTo6XCIpKTtcclxuXHJcblx0bGV0IGN1cnJlbnRTdGFnZTogV29ya2Zsb3dTdGFnZTtcclxuXHJcblx0aWYgKHN0YWdlSWQgPT09IFwicm9vdFwiIHx8IGlzUm9vdFRhc2spIHtcclxuXHRcdGN1cnJlbnRTdGFnZSA9IHtcclxuXHRcdFx0aWQ6IFJPT1RfU1RBR0VfSUQsXHJcblx0XHRcdG5hbWU6IFwiUm9vdCBUYXNrXCIsXHJcblx0XHRcdHR5cGU6IFwibGluZWFyXCIsXHJcblx0XHRcdG5leHQ6XHJcblx0XHRcdFx0d29ya2Zsb3cuc3RhZ2VzLmxlbmd0aCA+IDAgPyB3b3JrZmxvdy5zdGFnZXNbMF0uaWQgOiB1bmRlZmluZWQsXHJcblx0XHR9O1xyXG5cdH0gZWxzZSB7XHJcblx0XHRjb25zdCBmb3VuZFN0YWdlID0gd29ya2Zsb3cuc3RhZ2VzLmZpbmQoKHMpID0+IHMuaWQgPT09IHN0YWdlSWQpO1xyXG5cdFx0aWYgKCFmb3VuZFN0YWdlKSB7XHJcblx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0fVxyXG5cdFx0Y3VycmVudFN0YWdlID0gZm91bmRTdGFnZTtcclxuXHR9XHJcblxyXG5cdGxldCBjdXJyZW50U3ViU3RhZ2U6IFdvcmtmbG93U3ViU3RhZ2UgfCB1bmRlZmluZWQ7XHJcblx0aWYgKHN1YlN0YWdlSWQgJiYgY3VycmVudFN0YWdlLnN1YlN0YWdlcykge1xyXG5cdFx0Y3VycmVudFN1YlN0YWdlID0gY3VycmVudFN0YWdlLnN1YlN0YWdlcy5maW5kKFxyXG5cdFx0XHQoc3MpID0+IHNzLmlkID09PSBzdWJTdGFnZUlkLFxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdHJldHVybiB7XHJcblx0XHR3b3JrZmxvd1R5cGUsXHJcblx0XHRjdXJyZW50U3RhZ2UsXHJcblx0XHRjdXJyZW50U3ViU3RhZ2UsXHJcblx0XHR3b3JrZmxvdyxcclxuXHRcdGlzUm9vdFRhc2ssXHJcblx0fTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdlbmVyYXRlcyB0ZXh0IGZvciBhIHdvcmtmbG93IHRhc2tcclxuICogQHBhcmFtIG5leHRTdGFnZSBUaGUgd29ya2Zsb3cgc3RhZ2UgdG8gY3JlYXRlIHRhc2sgdGV4dCBmb3JcclxuICogQHBhcmFtIG5leHRTdWJTdGFnZSBPcHRpb25hbCBzdWJzdGFnZSB3aXRoaW4gdGhlIHN0YWdlXHJcbiAqIEBwYXJhbSBpbmRlbnRhdGlvbiBUaGUgaW5kZW50YXRpb24gdG8gdXNlIGZvciB0aGUgdGFza1xyXG4gKiBAcGFyYW0gcGx1Z2luIFRoZSBwbHVnaW4gaW5zdGFuY2VcclxuICogQHBhcmFtIGFkZFN1YnRhc2tzIFdoZXRoZXIgdG8gYWRkIHN1YnRhc2tzIGZvciBjeWNsZSBzdGFnZXNcclxuICogQHJldHVybnMgVGhlIGdlbmVyYXRlZCB0YXNrIHRleHRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZVdvcmtmbG93VGFza1RleHQoXHJcblx0bmV4dFN0YWdlOiBXb3JrZmxvd1N0YWdlLFxyXG5cdGluZGVudGF0aW9uOiBzdHJpbmcsXHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0YWRkU3VidGFza3M6IGJvb2xlYW4gPSB0cnVlLFxyXG5cdG5leHRTdWJTdGFnZT86IFdvcmtmbG93U3ViU3RhZ2UsXHJcbik6IHN0cmluZyB7XHJcblx0Ly8gR2VuZXJhdGUgdGltZXN0YW1wIGlmIGNvbmZpZ3VyZWRcclxuXHRjb25zdCB0aW1lc3RhbXAgPSBwbHVnaW4uc2V0dGluZ3Mud29ya2Zsb3cuYXV0b0FkZFRpbWVzdGFtcFxyXG5cdFx0PyBgIPCfm6sgJHttb21lbnQoKS5mb3JtYXQoXHJcblx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLndvcmtmbG93LnRpbWVzdGFtcEZvcm1hdCB8fFxyXG5cdFx0XHRcdFx0XCJZWVlZLU1NLUREIEhIOm1tOnNzXCIsXHJcblx0XHRcdCl9YFxyXG5cdFx0OiBcIlwiO1xyXG5cdGNvbnN0IGRlZmF1bHRJbmRlbnRhdGlvbiA9IGJ1aWxkSW5kZW50U3RyaW5nKHBsdWdpbi5hcHApO1xyXG5cclxuXHQvLyBDcmVhdGUgdGFzayB0ZXh0XHJcblx0aWYgKG5leHRTdWJTdGFnZSkge1xyXG5cdFx0cmV0dXJuIGAke2luZGVudGF0aW9ufS0gWyBdICR7bmV4dFN0YWdlLm5hbWV9ICgke25leHRTdWJTdGFnZS5uYW1lfSkgW3N0YWdlOjoke25leHRTdGFnZS5pZH0ke1NUQUdFX1NFUEFSQVRPUn0ke25leHRTdWJTdGFnZS5pZH1dJHt0aW1lc3RhbXB9YDtcclxuXHR9XHJcblxyXG5cdGxldCB0YXNrVGV4dCA9IGAke2luZGVudGF0aW9ufS0gWyBdICR7bmV4dFN0YWdlLm5hbWV9IFtzdGFnZTo6JHtuZXh0U3RhZ2UuaWR9XSR7dGltZXN0YW1wfWA7XHJcblxyXG5cdGlmIChcclxuXHRcdGFkZFN1YnRhc2tzICYmXHJcblx0XHRuZXh0U3RhZ2UudHlwZSA9PT0gXCJjeWNsZVwiICYmXHJcblx0XHRuZXh0U3RhZ2Uuc3ViU3RhZ2VzICYmXHJcblx0XHRuZXh0U3RhZ2Uuc3ViU3RhZ2VzLmxlbmd0aCA+IDBcclxuXHQpIHtcclxuXHRcdGNvbnN0IGZpcnN0U3ViU3RhZ2UgPSBuZXh0U3RhZ2Uuc3ViU3RhZ2VzWzBdO1xyXG5cdFx0Y29uc3Qgc3ViVGFza0luZGVudGF0aW9uID0gaW5kZW50YXRpb24gKyBkZWZhdWx0SW5kZW50YXRpb247XHJcblx0XHR0YXNrVGV4dCArPSBgXFxuJHtzdWJUYXNrSW5kZW50YXRpb259LSBbIF0gJHtuZXh0U3RhZ2UubmFtZX0gKCR7Zmlyc3RTdWJTdGFnZS5uYW1lfSkgW3N0YWdlOjoke25leHRTdGFnZS5pZH0ke1NUQUdFX1NFUEFSQVRPUn0ke2ZpcnN0U3ViU3RhZ2UuaWR9XSR7dGltZXN0YW1wfWA7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gdGFza1RleHQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZXRlcm1pbmVzIHRoZSBpbnNlcnRpb24gcG9pbnQgZm9yIGEgbmV3IHdvcmtmbG93IHRhc2tcclxuICogQHBhcmFtIGxpbmUgVGhlIGN1cnJlbnQgbGluZSBpbmZvcm1hdGlvblxyXG4gKiBAcGFyYW0gZG9jIFRoZSBkb2N1bWVudCB0ZXh0XHJcbiAqIEBwYXJhbSBpbmRlbnRhdGlvbiBUaGUgY3VycmVudCBsaW5lJ3MgaW5kZW50YXRpb25cclxuICogQHJldHVybnMgVGhlIHBvc2l0aW9uIHRvIGluc2VydCB0aGUgbmV3IHRhc2tcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBkZXRlcm1pbmVUYXNrSW5zZXJ0aW9uUG9pbnQoXHJcblx0bGluZTogeyBudW1iZXI6IG51bWJlcjsgdG86IG51bWJlcjsgdGV4dDogc3RyaW5nIH0sXHJcblx0ZG9jOiBUZXh0LFxyXG5cdGluZGVudGF0aW9uOiBzdHJpbmcsXHJcbik6IG51bWJlciB7XHJcblx0Ly8gRGVmYXVsdCBpbnNlcnRpb24gcG9pbnQgaXMgYWZ0ZXIgdGhlIGN1cnJlbnQgbGluZVxyXG5cdGxldCBpbnNlcnRpb25Qb2ludCA9IGxpbmUudG87XHJcblxyXG5cdC8vIENoZWNrIGlmIHRoZXJlIGFyZSBjaGlsZCB0YXNrcyBieSBsb29raW5nIGZvciBsaW5lcyB3aXRoIGdyZWF0ZXIgaW5kZW50YXRpb25cclxuXHRjb25zdCBsaW5lSW5kZW50ID0gaW5kZW50YXRpb24ubGVuZ3RoO1xyXG5cdGxldCBsYXN0Q2hpbGRMaW5lID0gbGluZS5udW1iZXI7XHJcblx0bGV0IGZvdW5kQ2hpbGRyZW4gPSBmYWxzZTtcclxuXHJcblx0Ly8gTG9vayBhdCB0aGUgbmV4dCAyMCBsaW5lcyB0byBmaW5kIHBvdGVudGlhbCBjaGlsZCB0YXNrc1xyXG5cdC8vIFRoaXMgaXMgYSByZWFzb25hYmxlIGxpbWl0IGZvciBtb3N0IHRhc2sgaGllcmFyY2hpZXNcclxuXHRmb3IgKFxyXG5cdFx0bGV0IGkgPSBsaW5lLm51bWJlciArIDE7XHJcblx0XHRpIDw9IE1hdGgubWluKGxpbmUubnVtYmVyICsgMjAsIGRvYy5saW5lcyk7XHJcblx0XHRpKytcclxuXHQpIHtcclxuXHRcdGNvbnN0IGNoZWNrTGluZSA9IGRvYy5saW5lKGkpO1xyXG5cdFx0Y29uc3QgY2hlY2tJbmRlbnQgPSBnZXRJbmRlbnRhdGlvbihjaGVja0xpbmUudGV4dCkubGVuZ3RoO1xyXG5cclxuXHRcdGlmIChjaGVja0luZGVudCA+IGxpbmVJbmRlbnQpIHtcclxuXHRcdFx0bGFzdENoaWxkTGluZSA9IGk7XHJcblx0XHRcdGZvdW5kQ2hpbGRyZW4gPSB0cnVlO1xyXG5cdFx0fSBlbHNlIGlmIChmb3VuZENoaWxkcmVuKSB7XHJcblx0XHRcdGJyZWFrO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gSWYgd2UgZm91bmQgY2hpbGQgdGFza3MsIGluc2VydCBhZnRlciB0aGUgbGFzdCBjaGlsZFxyXG5cdGlmIChmb3VuZENoaWxkcmVuKSB7XHJcblx0XHRpbnNlcnRpb25Qb2ludCA9IGRvYy5saW5lKGxhc3RDaGlsZExpbmUpLnRvO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIGluc2VydGlvblBvaW50O1xyXG59XHJcbiJdfQ==