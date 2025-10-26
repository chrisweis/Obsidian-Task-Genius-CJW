import { ViewPlugin, Decoration, WidgetType, } from "@codemirror/view";
import { setTooltip } from "obsidian";
import { Annotation } from "@codemirror/state";
// @ts-ignore - This import is necessary but TypeScript can't find it
import { syntaxTree, tokenClassNodeProp } from "@codemirror/language";
import { t } from "../../translations/helper";
import { extractWorkflowInfo, resolveWorkflowInfo, } from "../workflow/workflow-handler";
import { RegExpCursor } from "@codemirror/search";
import { setIcon } from "obsidian";
import "../../styles/workflow.css";
// Annotation that marks a transaction as a workflow decorator change
export const workflowDecoratorAnnotation = Annotation.define();
/**
 * Widget that displays a workflow stage indicator emoji
 */
class WorkflowStageWidget extends WidgetType {
    constructor(app, plugin, view, from, to, workflowType, stageId, subStageId) {
        super();
        this.app = app;
        this.plugin = plugin;
        this.view = view;
        this.from = from;
        this.to = to;
        this.workflowType = workflowType;
        this.stageId = stageId;
        this.subStageId = subStageId;
    }
    eq(other) {
        return (other.from === this.from &&
            other.to === this.to &&
            other.workflowType === this.workflowType &&
            other.stageId === this.stageId &&
            other.subStageId === this.subStageId);
    }
    toDOM() {
        const span = document.createElement("span");
        span.className = "cm-workflow-stage-indicator";
        // Get stage icon and type
        const { icon, stageType } = this.getStageIconAndType();
        setIcon(span.createSpan(), icon);
        span.setAttribute("data-stage-type", stageType);
        // Add tooltip
        const tooltipContent = this.generateTooltipContent();
        setTooltip(span, tooltipContent);
        // Add click handler for stage transitions
        span.addEventListener("click", (e) => {
            this.handleClick(e);
        });
        return span;
    }
    getStageIconAndType() {
        // Find the workflow definition
        const workflow = this.plugin.settings.workflow.definitions.find((wf) => wf.id === this.workflowType);
        if (!workflow) {
            return { icon: "help-circle", stageType: "unknown" }; // Unknown workflow
        }
        // Find the current stage
        const stage = workflow.stages.find((s) => s.id === this.stageId);
        if (!stage) {
            return { icon: "help-circle", stageType: "unknown" }; // Unknown stage
        }
        // Return icon and type based on stage type
        switch (stage.type) {
            case "linear":
                return { icon: "arrow-right", stageType: "linear" };
            case "cycle":
                return { icon: "rotate-cw", stageType: "cycle" };
            case "terminal":
                return { icon: "check", stageType: "terminal" };
            default:
                return { icon: "circle", stageType: "default" };
        }
    }
    generateTooltipContent() {
        var _a;
        // Find the workflow definition
        const workflow = this.plugin.settings.workflow.definitions.find((wf) => wf.id === this.workflowType);
        if (!workflow) {
            return t("Workflow not found");
        }
        // Find the current stage
        const stage = workflow.stages.find((s) => s.id === this.stageId);
        if (!stage) {
            return t("Stage not found");
        }
        let content = `${t("Workflow")}: ${workflow.name}\n`;
        if (this.subStageId) {
            const subStage = (_a = stage.subStages) === null || _a === void 0 ? void 0 : _a.find((ss) => ss.id === this.subStageId);
            if (subStage) {
                content += `${t("Current stage")}: ${stage.name} (${subStage.name})\n`;
            }
            else {
                content += `${t("Current stage")}: ${stage.name}\n`;
            }
        }
        else {
            content += `${t("Current stage")}: ${stage.name}\n`;
        }
        content += `${t("Type")}: ${stage.type}`;
        // Add next stage info if available
        if (stage.type !== "terminal") {
            if (stage.next) {
                const nextStage = workflow.stages.find((s) => s.id === stage.next);
                if (nextStage) {
                    content += `\n${t("Next")}: ${nextStage.name}`;
                }
            }
            else if (stage.canProceedTo && stage.canProceedTo.length > 0) {
                const nextStage = workflow.stages.find((s) => s.id === stage.canProceedTo[0]);
                if (nextStage) {
                    content += `\n${t("Next")}: ${nextStage.name}`;
                }
            }
        }
        return content;
    }
    handleClick(event) {
        var _a, _b;
        event.preventDefault();
        event.stopPropagation();
        // Get the active editor
        const activeLeaf = this.app.workspace.activeLeaf;
        if (!activeLeaf ||
            !activeLeaf.view ||
            !activeLeaf.view.editor) {
            return;
        }
        const editor = activeLeaf.view.editor;
        // Get the line containing this workflow marker
        const line = this.view.state.doc.lineAt(this.from);
        const lineText = line.text;
        // Resolve workflow information
        const resolvedInfo = resolveWorkflowInfo(lineText, this.view.state.doc, line.number, this.plugin);
        if (!resolvedInfo) {
            return;
        }
        const { currentStage, workflow, currentSubStage } = resolvedInfo;
        // Determine next stage
        let nextStageId;
        let nextSubStageId;
        if (currentStage.type === "terminal") {
            // Terminal stages don't transition
            return;
        }
        else if (currentStage.type === "cycle" && currentSubStage) {
            // Handle substage transitions
            if (currentSubStage.next) {
                nextStageId = currentStage.id;
                nextSubStageId = currentSubStage.next;
            }
            else if (currentStage.canProceedTo &&
                currentStage.canProceedTo.length > 0) {
                nextStageId = currentStage.canProceedTo[0];
                nextSubStageId = undefined;
            }
            else {
                // Cycle back to first substage
                nextStageId = currentStage.id;
                nextSubStageId = (_b = (_a = currentStage.subStages) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.id;
            }
        }
        else if (currentStage.canProceedTo &&
            currentStage.canProceedTo.length > 0) {
            // Use canProceedTo for stage jumping
            nextStageId = currentStage.canProceedTo[0];
        }
        else if (currentStage.next) {
            // Use explicit next stage
            nextStageId = Array.isArray(currentStage.next)
                ? currentStage.next[0]
                : currentStage.next;
        }
        else {
            // Find next stage in sequence
            const currentIndex = workflow.stages.findIndex((s) => s.id === currentStage.id);
            if (currentIndex >= 0 &&
                currentIndex < workflow.stages.length - 1) {
                nextStageId = workflow.stages[currentIndex + 1].id;
            }
            else {
                // No next stage
                return;
            }
        }
        // Find the next stage object
        const nextStage = workflow.stages.find((s) => s.id === nextStageId);
        if (!nextStage) {
            return;
        }
        // Create the new stage marker
        let newMarker;
        if (nextSubStageId) {
            newMarker = `[stage::${nextStageId}.${nextSubStageId}]`;
        }
        else {
            newMarker = `[stage::${nextStageId}]`;
        }
        // Replace the current stage marker
        const stageMarkerRegex = /\[stage::[^\]]+\]/;
        const match = lineText.match(stageMarkerRegex);
        if (match && match.index !== undefined) {
            const from = line.from + match.index;
            const to = from + match[0].length;
            editor.cm.dispatch({
                changes: {
                    from,
                    to,
                    insert: newMarker,
                },
            });
        }
    }
    ignoreEvent() {
        return false;
    }
}
/**
 * Creates an editor extension that decorates workflow stage markers with interactive indicators
 * @param app The Obsidian app instance
 * @param plugin The plugin instance
 * @returns An editor extension that can be registered with the plugin
 */
export function workflowDecoratorExtension(app, plugin) {
    // Don't enable if workflow feature is disabled
    if (!plugin.settings.workflow.enableWorkflow) {
        return [];
    }
    return ViewPlugin.fromClass(class {
        constructor(view) {
            this.view = view;
            this.decorations = Decoration.none;
            this.lastDocVersion = 0;
            this.lastViewportFrom = 0;
            this.lastViewportTo = 0;
            this.decorationCache = new Map();
            this.updateTimeout = null;
            this.MAX_CACHE_SIZE = 100; // Limit cache size to prevent memory leaks
            this.updateDecorations();
        }
        update(update) {
            // Only update if document changed or viewport significantly changed
            // Remove selectionSet trigger to avoid cursor movement causing re-renders
            const viewportChanged = update.viewportChanged &&
                (Math.abs(this.view.viewport.from - this.lastViewportFrom) >
                    100 ||
                    Math.abs(this.view.viewport.to - this.lastViewportTo) >
                        100);
            if (update.docChanged || viewportChanged) {
                // Clear cache if document changed
                if (update.docChanged) {
                    this.decorationCache.clear();
                    this.lastDocVersion = this.view.state.doc.length;
                }
                // Debounce updates to avoid rapid re-renders
                if (this.updateTimeout) {
                    clearTimeout(this.updateTimeout);
                }
                this.updateTimeout = window.setTimeout(() => {
                    this.updateDecorations();
                    this.updateTimeout = null;
                }, update.docChanged ? 0 : 50); // Immediate for doc changes, debounced for viewport
            }
        }
        destroy() {
            this.decorations = Decoration.none;
            this.decorationCache.clear();
            if (this.updateTimeout) {
                clearTimeout(this.updateTimeout);
            }
        }
        updateDecorations() {
            const decorations = [];
            // Update viewport tracking
            this.lastViewportFrom = this.view.viewport.from;
            this.lastViewportTo = this.view.viewport.to;
            for (const { from, to } of this.view.visibleRanges) {
                // Search for workflow tags and stage markers
                const workflowCursor = new RegExpCursor(this.view.state.doc, "(#workflow\\/[^\\/\\s]+|\\[stage::[^\\]]+\\])", {}, from, to);
                while (!workflowCursor.next().done) {
                    const { from: matchFrom, to: matchTo } = workflowCursor.value;
                    // Create cache key for this match - use line number and hash of content
                    const line = this.view.state.doc.lineAt(matchFrom);
                    const lineHash = this.simpleHash(line.text);
                    const cacheKey = `${line.number}:${lineHash}`;
                    // Check cache first
                    if (this.decorationCache.has(cacheKey)) {
                        const cachedDecoration = this.decorationCache.get(cacheKey);
                        decorations.push(cachedDecoration);
                        continue;
                    }
                    if (!this.shouldRender(matchFrom, matchTo)) {
                        continue;
                    }
                    const lineText = line.text;
                    // Check if this line contains a task - 修改正则表达式以支持更灵活的任务格式
                    // 原来的正则只匹配以任务标记开头的行，现在改为检查整行是否包含任务标记
                    const taskRegex = /^([\s|\t]*)([-*+]|\d+\.)\s+\[(.)]/;
                    const hasTaskMarker = /\[([ xX\-])\]/.test(lineText);
                    // 如果既不是标准任务格式，也没有任务标记，则跳过
                    if (!taskRegex.test(lineText) && !hasTaskMarker) {
                        continue;
                    }
                    // Extract workflow information
                    const workflowInfo = extractWorkflowInfo(lineText);
                    if (!workflowInfo) {
                        continue;
                    }
                    // Resolve complete workflow information
                    const resolvedInfo = resolveWorkflowInfo(lineText, this.view.state.doc, line.number, plugin);
                    if (!resolvedInfo) {
                        continue;
                    }
                    const { workflowType, currentStage, currentSubStage } = resolvedInfo;
                    // Add decoration after the matched text
                    const decoration = Decoration.widget({
                        widget: new WorkflowStageWidget(app, plugin, this.view, matchFrom, matchTo, workflowType, currentStage.id, currentSubStage === null || currentSubStage === void 0 ? void 0 : currentSubStage.id),
                        side: 1,
                    });
                    const decorationRange = decoration.range(matchTo, matchTo);
                    decorations.push(decorationRange);
                    // Cache the decoration with size limit
                    if (this.decorationCache.size >= this.MAX_CACHE_SIZE) {
                        // Remove oldest entry (first key)
                        const firstKey = this.decorationCache
                            .keys()
                            .next().value;
                        this.decorationCache.delete(firstKey);
                    }
                    this.decorationCache.set(cacheKey, decorationRange);
                }
            }
            this.decorations = Decoration.set(decorations.sort((a, b) => a.from - b.from));
        }
        simpleHash(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = (hash << 5) - hash + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return hash;
        }
        shouldRender(from, to) {
            try {
                // Check if we're in a code block or frontmatter
                const syntaxNode = syntaxTree(this.view.state).resolveInner(from + 1);
                const nodeProps = syntaxNode.type.prop(tokenClassNodeProp);
                if (nodeProps) {
                    const props = nodeProps.split(" ");
                    if (props.includes("hmd-codeblock") ||
                        props.includes("hmd-frontmatter")) {
                        return false;
                    }
                }
                // More lenient cursor overlap check - only hide if cursor is directly on the decoration
                const selection = this.view.state.selection;
                const directOverlap = selection.ranges.some((range) => {
                    return range.from === to || range.to === from;
                });
                return !directOverlap;
            }
            catch (e) {
                console.warn("Error checking if workflow decorator should render", e);
                return false;
            }
        }
    }, {
        decorations: (plugin) => plugin.decorations,
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2Zsb3ctZGVjb3JhdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsid29ya2Zsb3ctZGVjb3JhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFFTixVQUFVLEVBRVYsVUFBVSxFQUVWLFVBQVUsR0FJVixNQUFNLGtCQUFrQixDQUFDO0FBQzFCLE9BQU8sRUFBTyxVQUFVLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFFM0MsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQy9DLHFFQUFxRTtBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDdEUsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzlDLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsbUJBQW1CLEdBRW5CLE1BQU0sOEJBQThCLENBQUM7QUFHdEMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ2xELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDbkMsT0FBTywyQkFBMkIsQ0FBQztBQUVuQyxxRUFBcUU7QUFDckUsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsVUFBVSxDQUFDLE1BQU0sRUFBVSxDQUFDO0FBRXZFOztHQUVHO0FBQ0gsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO0lBQzNDLFlBQ1MsR0FBUSxFQUNSLE1BQTZCLEVBQzdCLElBQWdCLEVBQ2hCLElBQVksRUFDWixFQUFVLEVBQ1YsWUFBb0IsRUFDcEIsT0FBZSxFQUNmLFVBQW1CO1FBRTNCLEtBQUssRUFBRSxDQUFDO1FBVEEsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUNSLFdBQU0sR0FBTixNQUFNLENBQXVCO1FBQzdCLFNBQUksR0FBSixJQUFJLENBQVk7UUFDaEIsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNaLE9BQUUsR0FBRixFQUFFLENBQVE7UUFDVixp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QUMsQ0FBQztnQkFFM0QsSUFBSSxTQUFTLEVBQUU7b0JBQ2QsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDbkMsSUFDQyxLQUFLLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQzt3QkFDL0IsS0FBSyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxFQUNoQzt3QkFDRCxPQUFPLEtBQUssQ0FBQztxQkFDYjtpQkFDRDtnQkFFRCx3RkFBd0Y7Z0JBQ3hGLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQztnQkFDNUMsTUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtvQkFDckQsT0FBTyxLQUFLLENBQUMsSUFBSSxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsRUFBRSxLQUFLLElBQUksQ0FBQztnQkFDL0MsQ0FBQyxDQUFDLENBQUM7Z0JBRUgsT0FBTyxDQUFDLGFBQWEsQ0FBQzthQUN0QjtZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNYLE9BQU8sQ0FBQyxJQUFJLENBQ1gsb0RBQW9ELEVBQ3BELENBQUMsQ0FDRCxDQUFDO2dCQUNGLE9BQU8sS0FBSyxDQUFDO2FBQ2I7UUFDRixDQUFDO0tBQ0QsRUFDRDtRQUNDLFdBQVcsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLFdBQVc7S0FDM0MsQ0FDRCxDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XHJcblx0RWRpdG9yVmlldyxcclxuXHRWaWV3UGx1Z2luLFxyXG5cdFZpZXdVcGRhdGUsXHJcblx0RGVjb3JhdGlvbixcclxuXHREZWNvcmF0aW9uU2V0LFxyXG5cdFdpZGdldFR5cGUsXHJcblx0TWF0Y2hEZWNvcmF0b3IsXHJcblx0UGx1Z2luVmFsdWUsXHJcblx0UGx1Z2luU3BlYyxcclxufSBmcm9tIFwiQGNvZGVtaXJyb3Ivdmlld1wiO1xyXG5pbXBvcnQgeyBBcHAsIHNldFRvb2x0aXAgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiLi4vLi4vaW5kZXhcIjtcclxuaW1wb3J0IHsgQW5ub3RhdGlvbiB9IGZyb20gXCJAY29kZW1pcnJvci9zdGF0ZVwiO1xyXG4vLyBAdHMtaWdub3JlIC0gVGhpcyBpbXBvcnQgaXMgbmVjZXNzYXJ5IGJ1dCBUeXBlU2NyaXB0IGNhbid0IGZpbmQgaXRcclxuaW1wb3J0IHsgc3ludGF4VHJlZSwgdG9rZW5DbGFzc05vZGVQcm9wIH0gZnJvbSBcIkBjb2RlbWlycm9yL2xhbmd1YWdlXCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiLi4vLi4vdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQge1xyXG5cdGV4dHJhY3RXb3JrZmxvd0luZm8sXHJcblx0cmVzb2x2ZVdvcmtmbG93SW5mbyxcclxuXHRkZXRlcm1pbmVOZXh0U3RhZ2UsXHJcbn0gZnJvbSBcIi4uL3dvcmtmbG93L3dvcmtmbG93LWhhbmRsZXJcIjtcclxuaW1wb3J0IHsgdGFza1N0YXR1c0NoYW5nZUFubm90YXRpb24gfSBmcm9tIFwiLi4vdGFzay1vcGVyYXRpb25zL3N0YXR1cy1zd2l0Y2hlclwiO1xyXG5pbXBvcnQgeyBSYW5nZSB9IGZyb20gXCJAY29kZW1pcnJvci9zdGF0ZVwiO1xyXG5pbXBvcnQgeyBSZWdFeHBDdXJzb3IgfSBmcm9tIFwiQGNvZGVtaXJyb3Ivc2VhcmNoXCI7XHJcbmltcG9ydCB7IHNldEljb24gfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IFwiLi4vLi4vc3R5bGVzL3dvcmtmbG93LmNzc1wiO1xyXG5cclxuLy8gQW5ub3RhdGlvbiB0aGF0IG1hcmtzIGEgdHJhbnNhY3Rpb24gYXMgYSB3b3JrZmxvdyBkZWNvcmF0b3IgY2hhbmdlXHJcbmV4cG9ydCBjb25zdCB3b3JrZmxvd0RlY29yYXRvckFubm90YXRpb24gPSBBbm5vdGF0aW9uLmRlZmluZTxzdHJpbmc+KCk7XHJcblxyXG4vKipcclxuICogV2lkZ2V0IHRoYXQgZGlzcGxheXMgYSB3b3JrZmxvdyBzdGFnZSBpbmRpY2F0b3IgZW1vamlcclxuICovXHJcbmNsYXNzIFdvcmtmbG93U3RhZ2VXaWRnZXQgZXh0ZW5kcyBXaWRnZXRUeXBlIHtcclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHByaXZhdGUgYXBwOiBBcHAsXHJcblx0XHRwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0cHJpdmF0ZSB2aWV3OiBFZGl0b3JWaWV3LFxyXG5cdFx0cHJpdmF0ZSBmcm9tOiBudW1iZXIsXHJcblx0XHRwcml2YXRlIHRvOiBudW1iZXIsXHJcblx0XHRwcml2YXRlIHdvcmtmbG93VHlwZTogc3RyaW5nLFxyXG5cdFx0cHJpdmF0ZSBzdGFnZUlkOiBzdHJpbmcsXHJcblx0XHRwcml2YXRlIHN1YlN0YWdlSWQ/OiBzdHJpbmdcclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0fVxyXG5cclxuXHRlcShvdGhlcjogV29ya2Zsb3dTdGFnZVdpZGdldCk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIChcclxuXHRcdFx0b3RoZXIuZnJvbSA9PT0gdGhpcy5mcm9tICYmXHJcblx0XHRcdG90aGVyLnRvID09PSB0aGlzLnRvICYmXHJcblx0XHRcdG90aGVyLndvcmtmbG93VHlwZSA9PT0gdGhpcy53b3JrZmxvd1R5cGUgJiZcclxuXHRcdFx0b3RoZXIuc3RhZ2VJZCA9PT0gdGhpcy5zdGFnZUlkICYmXHJcblx0XHRcdG90aGVyLnN1YlN0YWdlSWQgPT09IHRoaXMuc3ViU3RhZ2VJZFxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdHRvRE9NKCk6IEhUTUxFbGVtZW50IHtcclxuXHRcdGNvbnN0IHNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3BhblwiKTtcclxuXHRcdHNwYW4uY2xhc3NOYW1lID0gXCJjbS13b3JrZmxvdy1zdGFnZS1pbmRpY2F0b3JcIjtcclxuXHJcblx0XHQvLyBHZXQgc3RhZ2UgaWNvbiBhbmQgdHlwZVxyXG5cdFx0Y29uc3QgeyBpY29uLCBzdGFnZVR5cGUgfSA9IHRoaXMuZ2V0U3RhZ2VJY29uQW5kVHlwZSgpO1xyXG5cdFx0c2V0SWNvbihzcGFuLmNyZWF0ZVNwYW4oKSwgaWNvbik7XHJcblx0XHRzcGFuLnNldEF0dHJpYnV0ZShcImRhdGEtc3RhZ2UtdHlwZVwiLCBzdGFnZVR5cGUpO1xyXG5cclxuXHRcdC8vIEFkZCB0b29sdGlwXHJcblx0XHRjb25zdCB0b29sdGlwQ29udGVudCA9IHRoaXMuZ2VuZXJhdGVUb29sdGlwQ29udGVudCgpO1xyXG5cdFx0c2V0VG9vbHRpcChzcGFuLCB0b29sdGlwQ29udGVudCk7XHJcblxyXG5cdFx0Ly8gQWRkIGNsaWNrIGhhbmRsZXIgZm9yIHN0YWdlIHRyYW5zaXRpb25zXHJcblx0XHRzcGFuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoZSkgPT4ge1xyXG5cdFx0XHR0aGlzLmhhbmRsZUNsaWNrKGUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIHNwYW47XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldFN0YWdlSWNvbkFuZFR5cGUoKTogeyBpY29uOiBzdHJpbmc7IHN0YWdlVHlwZTogc3RyaW5nIH0ge1xyXG5cdFx0Ly8gRmluZCB0aGUgd29ya2Zsb3cgZGVmaW5pdGlvblxyXG5cdFx0Y29uc3Qgd29ya2Zsb3cgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy53b3JrZmxvdy5kZWZpbml0aW9ucy5maW5kKFxyXG5cdFx0XHQod2YpID0+IHdmLmlkID09PSB0aGlzLndvcmtmbG93VHlwZVxyXG5cdFx0KTtcclxuXHJcblx0XHRpZiAoIXdvcmtmbG93KSB7XHJcblx0XHRcdHJldHVybiB7IGljb246IFwiaGVscC1jaXJjbGVcIiwgc3RhZ2VUeXBlOiBcInVua25vd25cIiB9OyAvLyBVbmtub3duIHdvcmtmbG93XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRmluZCB0aGUgY3VycmVudCBzdGFnZVxyXG5cdFx0Y29uc3Qgc3RhZ2UgPSB3b3JrZmxvdy5zdGFnZXMuZmluZCgocykgPT4gcy5pZCA9PT0gdGhpcy5zdGFnZUlkKTtcclxuXHRcdGlmICghc3RhZ2UpIHtcclxuXHRcdFx0cmV0dXJuIHsgaWNvbjogXCJoZWxwLWNpcmNsZVwiLCBzdGFnZVR5cGU6IFwidW5rbm93blwiIH07IC8vIFVua25vd24gc3RhZ2VcclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZXR1cm4gaWNvbiBhbmQgdHlwZSBiYXNlZCBvbiBzdGFnZSB0eXBlXHJcblx0XHRzd2l0Y2ggKHN0YWdlLnR5cGUpIHtcclxuXHRcdFx0Y2FzZSBcImxpbmVhclwiOlxyXG5cdFx0XHRcdHJldHVybiB7IGljb246IFwiYXJyb3ctcmlnaHRcIiwgc3RhZ2VUeXBlOiBcImxpbmVhclwiIH07XHJcblx0XHRcdGNhc2UgXCJjeWNsZVwiOlxyXG5cdFx0XHRcdHJldHVybiB7IGljb246IFwicm90YXRlLWN3XCIsIHN0YWdlVHlwZTogXCJjeWNsZVwiIH07XHJcblx0XHRcdGNhc2UgXCJ0ZXJtaW5hbFwiOlxyXG5cdFx0XHRcdHJldHVybiB7IGljb246IFwiY2hlY2tcIiwgc3RhZ2VUeXBlOiBcInRlcm1pbmFsXCIgfTtcclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRyZXR1cm4geyBpY29uOiBcImNpcmNsZVwiLCBzdGFnZVR5cGU6IFwiZGVmYXVsdFwiIH07XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdlbmVyYXRlVG9vbHRpcENvbnRlbnQoKTogc3RyaW5nIHtcclxuXHRcdC8vIEZpbmQgdGhlIHdvcmtmbG93IGRlZmluaXRpb25cclxuXHRcdGNvbnN0IHdvcmtmbG93ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3Mud29ya2Zsb3cuZGVmaW5pdGlvbnMuZmluZChcclxuXHRcdFx0KHdmKSA9PiB3Zi5pZCA9PT0gdGhpcy53b3JrZmxvd1R5cGVcclxuXHRcdCk7XHJcblxyXG5cdFx0aWYgKCF3b3JrZmxvdykge1xyXG5cdFx0XHRyZXR1cm4gdChcIldvcmtmbG93IG5vdCBmb3VuZFwiKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBGaW5kIHRoZSBjdXJyZW50IHN0YWdlXHJcblx0XHRjb25zdCBzdGFnZSA9IHdvcmtmbG93LnN0YWdlcy5maW5kKChzKSA9PiBzLmlkID09PSB0aGlzLnN0YWdlSWQpO1xyXG5cdFx0aWYgKCFzdGFnZSkge1xyXG5cdFx0XHRyZXR1cm4gdChcIlN0YWdlIG5vdCBmb3VuZFwiKTtcclxuXHRcdH1cclxuXHJcblx0XHRsZXQgY29udGVudCA9IGAke3QoXCJXb3JrZmxvd1wiKX06ICR7d29ya2Zsb3cubmFtZX1cXG5gO1xyXG5cclxuXHRcdGlmICh0aGlzLnN1YlN0YWdlSWQpIHtcclxuXHRcdFx0Y29uc3Qgc3ViU3RhZ2UgPSBzdGFnZS5zdWJTdGFnZXM/LmZpbmQoXHJcblx0XHRcdFx0KHNzKSA9PiBzcy5pZCA9PT0gdGhpcy5zdWJTdGFnZUlkXHJcblx0XHRcdCk7XHJcblx0XHRcdGlmIChzdWJTdGFnZSkge1xyXG5cdFx0XHRcdGNvbnRlbnQgKz0gYCR7dChcIkN1cnJlbnQgc3RhZ2VcIil9OiAke3N0YWdlLm5hbWV9ICgke1xyXG5cdFx0XHRcdFx0c3ViU3RhZ2UubmFtZVxyXG5cdFx0XHRcdH0pXFxuYDtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRjb250ZW50ICs9IGAke3QoXCJDdXJyZW50IHN0YWdlXCIpfTogJHtzdGFnZS5uYW1lfVxcbmA7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGNvbnRlbnQgKz0gYCR7dChcIkN1cnJlbnQgc3RhZ2VcIil9OiAke3N0YWdlLm5hbWV9XFxuYDtcclxuXHRcdH1cclxuXHJcblx0XHRjb250ZW50ICs9IGAke3QoXCJUeXBlXCIpfTogJHtzdGFnZS50eXBlfWA7XHJcblxyXG5cdFx0Ly8gQWRkIG5leHQgc3RhZ2UgaW5mbyBpZiBhdmFpbGFibGVcclxuXHRcdGlmIChzdGFnZS50eXBlICE9PSBcInRlcm1pbmFsXCIpIHtcclxuXHRcdFx0aWYgKHN0YWdlLm5leHQpIHtcclxuXHRcdFx0XHRjb25zdCBuZXh0U3RhZ2UgPSB3b3JrZmxvdy5zdGFnZXMuZmluZChcclxuXHRcdFx0XHRcdChzKSA9PiBzLmlkID09PSBzdGFnZS5uZXh0XHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRpZiAobmV4dFN0YWdlKSB7XHJcblx0XHRcdFx0XHRjb250ZW50ICs9IGBcXG4ke3QoXCJOZXh0XCIpfTogJHtuZXh0U3RhZ2UubmFtZX1gO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIGlmIChzdGFnZS5jYW5Qcm9jZWVkVG8gJiYgc3RhZ2UuY2FuUHJvY2VlZFRvLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRjb25zdCBuZXh0U3RhZ2UgPSB3b3JrZmxvdy5zdGFnZXMuZmluZChcclxuXHRcdFx0XHRcdChzKSA9PiBzLmlkID09PSBzdGFnZS5jYW5Qcm9jZWVkVG8hWzBdXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRpZiAobmV4dFN0YWdlKSB7XHJcblx0XHRcdFx0XHRjb250ZW50ICs9IGBcXG4ke3QoXCJOZXh0XCIpfTogJHtuZXh0U3RhZ2UubmFtZX1gO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBjb250ZW50O1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBoYW5kbGVDbGljayhldmVudDogTW91c2VFdmVudCk6IHZvaWQge1xyXG5cdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuXHRcdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cclxuXHRcdC8vIEdldCB0aGUgYWN0aXZlIGVkaXRvclxyXG5cdFx0Y29uc3QgYWN0aXZlTGVhZiA9IHRoaXMuYXBwLndvcmtzcGFjZS5hY3RpdmVMZWFmO1xyXG5cdFx0aWYgKFxyXG5cdFx0XHQhYWN0aXZlTGVhZiB8fFxyXG5cdFx0XHQhYWN0aXZlTGVhZi52aWV3IHx8XHJcblx0XHRcdCEoYWN0aXZlTGVhZi52aWV3IGFzIGFueSkuZWRpdG9yXHJcblx0XHQpIHtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IGVkaXRvciA9IChhY3RpdmVMZWFmLnZpZXcgYXMgYW55KS5lZGl0b3I7XHJcblxyXG5cdFx0Ly8gR2V0IHRoZSBsaW5lIGNvbnRhaW5pbmcgdGhpcyB3b3JrZmxvdyBtYXJrZXJcclxuXHRcdGNvbnN0IGxpbmUgPSB0aGlzLnZpZXcuc3RhdGUuZG9jLmxpbmVBdCh0aGlzLmZyb20pO1xyXG5cdFx0Y29uc3QgbGluZVRleHQgPSBsaW5lLnRleHQ7XHJcblxyXG5cdFx0Ly8gUmVzb2x2ZSB3b3JrZmxvdyBpbmZvcm1hdGlvblxyXG5cdFx0Y29uc3QgcmVzb2x2ZWRJbmZvID0gcmVzb2x2ZVdvcmtmbG93SW5mbyhcclxuXHRcdFx0bGluZVRleHQsXHJcblx0XHRcdHRoaXMudmlldy5zdGF0ZS5kb2MsXHJcblx0XHRcdGxpbmUubnVtYmVyLFxyXG5cdFx0XHR0aGlzLnBsdWdpblxyXG5cdFx0KTtcclxuXHJcblx0XHRpZiAoIXJlc29sdmVkSW5mbykge1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgeyBjdXJyZW50U3RhZ2UsIHdvcmtmbG93LCBjdXJyZW50U3ViU3RhZ2UgfSA9IHJlc29sdmVkSW5mbztcclxuXHJcblx0XHQvLyBEZXRlcm1pbmUgbmV4dCBzdGFnZVxyXG5cdFx0bGV0IG5leHRTdGFnZUlkOiBzdHJpbmc7XHJcblx0XHRsZXQgbmV4dFN1YlN0YWdlSWQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcclxuXHJcblx0XHRpZiAoY3VycmVudFN0YWdlLnR5cGUgPT09IFwidGVybWluYWxcIikge1xyXG5cdFx0XHQvLyBUZXJtaW5hbCBzdGFnZXMgZG9uJ3QgdHJhbnNpdGlvblxyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9IGVsc2UgaWYgKGN1cnJlbnRTdGFnZS50eXBlID09PSBcImN5Y2xlXCIgJiYgY3VycmVudFN1YlN0YWdlKSB7XHJcblx0XHRcdC8vIEhhbmRsZSBzdWJzdGFnZSB0cmFuc2l0aW9uc1xyXG5cdFx0XHRpZiAoY3VycmVudFN1YlN0YWdlLm5leHQpIHtcclxuXHRcdFx0XHRuZXh0U3RhZ2VJZCA9IGN1cnJlbnRTdGFnZS5pZDtcclxuXHRcdFx0XHRuZXh0U3ViU3RhZ2VJZCA9IGN1cnJlbnRTdWJTdGFnZS5uZXh0O1xyXG5cdFx0XHR9IGVsc2UgaWYgKFxyXG5cdFx0XHRcdGN1cnJlbnRTdGFnZS5jYW5Qcm9jZWVkVG8gJiZcclxuXHRcdFx0XHRjdXJyZW50U3RhZ2UuY2FuUHJvY2VlZFRvLmxlbmd0aCA+IDBcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0bmV4dFN0YWdlSWQgPSBjdXJyZW50U3RhZ2UuY2FuUHJvY2VlZFRvWzBdO1xyXG5cdFx0XHRcdG5leHRTdWJTdGFnZUlkID0gdW5kZWZpbmVkO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIEN5Y2xlIGJhY2sgdG8gZmlyc3Qgc3Vic3RhZ2VcclxuXHRcdFx0XHRuZXh0U3RhZ2VJZCA9IGN1cnJlbnRTdGFnZS5pZDtcclxuXHRcdFx0XHRuZXh0U3ViU3RhZ2VJZCA9IGN1cnJlbnRTdGFnZS5zdWJTdGFnZXM/LlswXT8uaWQ7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSBpZiAoXHJcblx0XHRcdGN1cnJlbnRTdGFnZS5jYW5Qcm9jZWVkVG8gJiZcclxuXHRcdFx0Y3VycmVudFN0YWdlLmNhblByb2NlZWRUby5sZW5ndGggPiAwXHJcblx0XHQpIHtcclxuXHRcdFx0Ly8gVXNlIGNhblByb2NlZWRUbyBmb3Igc3RhZ2UganVtcGluZ1xyXG5cdFx0XHRuZXh0U3RhZ2VJZCA9IGN1cnJlbnRTdGFnZS5jYW5Qcm9jZWVkVG9bMF07XHJcblx0XHR9IGVsc2UgaWYgKGN1cnJlbnRTdGFnZS5uZXh0KSB7XHJcblx0XHRcdC8vIFVzZSBleHBsaWNpdCBuZXh0IHN0YWdlXHJcblx0XHRcdG5leHRTdGFnZUlkID0gQXJyYXkuaXNBcnJheShjdXJyZW50U3RhZ2UubmV4dClcclxuXHRcdFx0XHQ/IGN1cnJlbnRTdGFnZS5uZXh0WzBdXHJcblx0XHRcdFx0OiBjdXJyZW50U3RhZ2UubmV4dDtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIEZpbmQgbmV4dCBzdGFnZSBpbiBzZXF1ZW5jZVxyXG5cdFx0XHRjb25zdCBjdXJyZW50SW5kZXggPSB3b3JrZmxvdy5zdGFnZXMuZmluZEluZGV4KFxyXG5cdFx0XHRcdChzKSA9PiBzLmlkID09PSBjdXJyZW50U3RhZ2UuaWRcclxuXHRcdFx0KTtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdGN1cnJlbnRJbmRleCA+PSAwICYmXHJcblx0XHRcdFx0Y3VycmVudEluZGV4IDwgd29ya2Zsb3cuc3RhZ2VzLmxlbmd0aCAtIDFcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0bmV4dFN0YWdlSWQgPSB3b3JrZmxvdy5zdGFnZXNbY3VycmVudEluZGV4ICsgMV0uaWQ7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gTm8gbmV4dCBzdGFnZVxyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEZpbmQgdGhlIG5leHQgc3RhZ2Ugb2JqZWN0XHJcblx0XHRjb25zdCBuZXh0U3RhZ2UgPSB3b3JrZmxvdy5zdGFnZXMuZmluZCgocykgPT4gcy5pZCA9PT0gbmV4dFN0YWdlSWQpO1xyXG5cdFx0aWYgKCFuZXh0U3RhZ2UpIHtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENyZWF0ZSB0aGUgbmV3IHN0YWdlIG1hcmtlclxyXG5cdFx0bGV0IG5ld01hcmtlcjogc3RyaW5nO1xyXG5cdFx0aWYgKG5leHRTdWJTdGFnZUlkKSB7XHJcblx0XHRcdG5ld01hcmtlciA9IGBbc3RhZ2U6OiR7bmV4dFN0YWdlSWR9LiR7bmV4dFN1YlN0YWdlSWR9XWA7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRuZXdNYXJrZXIgPSBgW3N0YWdlOjoke25leHRTdGFnZUlkfV1gO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlcGxhY2UgdGhlIGN1cnJlbnQgc3RhZ2UgbWFya2VyXHJcblx0XHRjb25zdCBzdGFnZU1hcmtlclJlZ2V4ID0gL1xcW3N0YWdlOjpbXlxcXV0rXFxdLztcclxuXHRcdGNvbnN0IG1hdGNoID0gbGluZVRleHQubWF0Y2goc3RhZ2VNYXJrZXJSZWdleCk7XHJcblxyXG5cdFx0aWYgKG1hdGNoICYmIG1hdGNoLmluZGV4ICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0Y29uc3QgZnJvbSA9IGxpbmUuZnJvbSArIG1hdGNoLmluZGV4O1xyXG5cdFx0XHRjb25zdCB0byA9IGZyb20gKyBtYXRjaFswXS5sZW5ndGg7XHJcblxyXG5cdFx0XHRlZGl0b3IuY20uZGlzcGF0Y2goe1xyXG5cdFx0XHRcdGNoYW5nZXM6IHtcclxuXHRcdFx0XHRcdGZyb20sXHJcblx0XHRcdFx0XHR0byxcclxuXHRcdFx0XHRcdGluc2VydDogbmV3TWFya2VyLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0aWdub3JlRXZlbnQoKTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhbiBlZGl0b3IgZXh0ZW5zaW9uIHRoYXQgZGVjb3JhdGVzIHdvcmtmbG93IHN0YWdlIG1hcmtlcnMgd2l0aCBpbnRlcmFjdGl2ZSBpbmRpY2F0b3JzXHJcbiAqIEBwYXJhbSBhcHAgVGhlIE9ic2lkaWFuIGFwcCBpbnN0YW5jZVxyXG4gKiBAcGFyYW0gcGx1Z2luIFRoZSBwbHVnaW4gaW5zdGFuY2VcclxuICogQHJldHVybnMgQW4gZWRpdG9yIGV4dGVuc2lvbiB0aGF0IGNhbiBiZSByZWdpc3RlcmVkIHdpdGggdGhlIHBsdWdpblxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHdvcmtmbG93RGVjb3JhdG9yRXh0ZW5zaW9uKFxyXG5cdGFwcDogQXBwLFxyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luXHJcbikge1xyXG5cdC8vIERvbid0IGVuYWJsZSBpZiB3b3JrZmxvdyBmZWF0dXJlIGlzIGRpc2FibGVkXHJcblx0aWYgKCFwbHVnaW4uc2V0dGluZ3Mud29ya2Zsb3cuZW5hYmxlV29ya2Zsb3cpIHtcclxuXHRcdHJldHVybiBbXTtcclxuXHR9XHJcblxyXG5cdHJldHVybiBWaWV3UGx1Z2luLmZyb21DbGFzcyhcclxuXHRcdGNsYXNzIGltcGxlbWVudHMgUGx1Z2luVmFsdWUge1xyXG5cdFx0XHRkZWNvcmF0aW9uczogRGVjb3JhdGlvblNldCA9IERlY29yYXRpb24ubm9uZTtcclxuXHRcdFx0cHJpdmF0ZSBsYXN0RG9jVmVyc2lvbjogbnVtYmVyID0gMDtcclxuXHRcdFx0cHJpdmF0ZSBsYXN0Vmlld3BvcnRGcm9tOiBudW1iZXIgPSAwO1xyXG5cdFx0XHRwcml2YXRlIGxhc3RWaWV3cG9ydFRvOiBudW1iZXIgPSAwO1xyXG5cdFx0XHRwcml2YXRlIGRlY29yYXRpb25DYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBSYW5nZTxEZWNvcmF0aW9uPj4oKTtcclxuXHRcdFx0cHJpdmF0ZSB1cGRhdGVUaW1lb3V0OiBudW1iZXIgfCBudWxsID0gbnVsbDtcclxuXHRcdFx0cHJpdmF0ZSByZWFkb25seSBNQVhfQ0FDSEVfU0laRSA9IDEwMDsgLy8gTGltaXQgY2FjaGUgc2l6ZSB0byBwcmV2ZW50IG1lbW9yeSBsZWFrc1xyXG5cclxuXHRcdFx0Y29uc3RydWN0b3IocHVibGljIHZpZXc6IEVkaXRvclZpZXcpIHtcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZURlY29yYXRpb25zKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHVwZGF0ZSh1cGRhdGU6IFZpZXdVcGRhdGUpIHtcclxuXHRcdFx0XHQvLyBPbmx5IHVwZGF0ZSBpZiBkb2N1bWVudCBjaGFuZ2VkIG9yIHZpZXdwb3J0IHNpZ25pZmljYW50bHkgY2hhbmdlZFxyXG5cdFx0XHRcdC8vIFJlbW92ZSBzZWxlY3Rpb25TZXQgdHJpZ2dlciB0byBhdm9pZCBjdXJzb3IgbW92ZW1lbnQgY2F1c2luZyByZS1yZW5kZXJzXHJcblx0XHRcdFx0Y29uc3Qgdmlld3BvcnRDaGFuZ2VkID1cclxuXHRcdFx0XHRcdHVwZGF0ZS52aWV3cG9ydENoYW5nZWQgJiZcclxuXHRcdFx0XHRcdChNYXRoLmFicyh0aGlzLnZpZXcudmlld3BvcnQuZnJvbSAtIHRoaXMubGFzdFZpZXdwb3J0RnJvbSkgPlxyXG5cdFx0XHRcdFx0XHQxMDAgfHxcclxuXHRcdFx0XHRcdFx0TWF0aC5hYnModGhpcy52aWV3LnZpZXdwb3J0LnRvIC0gdGhpcy5sYXN0Vmlld3BvcnRUbykgPlxyXG5cdFx0XHRcdFx0XHRcdDEwMCk7XHJcblxyXG5cdFx0XHRcdGlmICh1cGRhdGUuZG9jQ2hhbmdlZCB8fCB2aWV3cG9ydENoYW5nZWQpIHtcclxuXHRcdFx0XHRcdC8vIENsZWFyIGNhY2hlIGlmIGRvY3VtZW50IGNoYW5nZWRcclxuXHRcdFx0XHRcdGlmICh1cGRhdGUuZG9jQ2hhbmdlZCkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLmRlY29yYXRpb25DYWNoZS5jbGVhcigpO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmxhc3REb2NWZXJzaW9uID0gdGhpcy52aWV3LnN0YXRlLmRvYy5sZW5ndGg7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gRGVib3VuY2UgdXBkYXRlcyB0byBhdm9pZCByYXBpZCByZS1yZW5kZXJzXHJcblx0XHRcdFx0XHRpZiAodGhpcy51cGRhdGVUaW1lb3V0KSB7XHJcblx0XHRcdFx0XHRcdGNsZWFyVGltZW91dCh0aGlzLnVwZGF0ZVRpbWVvdXQpO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdHRoaXMudXBkYXRlVGltZW91dCA9IHdpbmRvdy5zZXRUaW1lb3V0KFxyXG5cdFx0XHRcdFx0XHQoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy51cGRhdGVEZWNvcmF0aW9ucygpO1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMudXBkYXRlVGltZW91dCA9IG51bGw7XHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdHVwZGF0ZS5kb2NDaGFuZ2VkID8gMCA6IDUwXHJcblx0XHRcdFx0XHQpOyAvLyBJbW1lZGlhdGUgZm9yIGRvYyBjaGFuZ2VzLCBkZWJvdW5jZWQgZm9yIHZpZXdwb3J0XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRkZXN0cm95KCk6IHZvaWQge1xyXG5cdFx0XHRcdHRoaXMuZGVjb3JhdGlvbnMgPSBEZWNvcmF0aW9uLm5vbmU7XHJcblx0XHRcdFx0dGhpcy5kZWNvcmF0aW9uQ2FjaGUuY2xlYXIoKTtcclxuXHRcdFx0XHRpZiAodGhpcy51cGRhdGVUaW1lb3V0KSB7XHJcblx0XHRcdFx0XHRjbGVhclRpbWVvdXQodGhpcy51cGRhdGVUaW1lb3V0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHByaXZhdGUgdXBkYXRlRGVjb3JhdGlvbnMoKTogdm9pZCB7XHJcblx0XHRcdFx0Y29uc3QgZGVjb3JhdGlvbnM6IFJhbmdlPERlY29yYXRpb24+W10gPSBbXTtcclxuXHJcblx0XHRcdFx0Ly8gVXBkYXRlIHZpZXdwb3J0IHRyYWNraW5nXHJcblx0XHRcdFx0dGhpcy5sYXN0Vmlld3BvcnRGcm9tID0gdGhpcy52aWV3LnZpZXdwb3J0LmZyb207XHJcblx0XHRcdFx0dGhpcy5sYXN0Vmlld3BvcnRUbyA9IHRoaXMudmlldy52aWV3cG9ydC50bztcclxuXHJcblx0XHRcdFx0Zm9yIChjb25zdCB7IGZyb20sIHRvIH0gb2YgdGhpcy52aWV3LnZpc2libGVSYW5nZXMpIHtcclxuXHRcdFx0XHRcdC8vIFNlYXJjaCBmb3Igd29ya2Zsb3cgdGFncyBhbmQgc3RhZ2UgbWFya2Vyc1xyXG5cdFx0XHRcdFx0Y29uc3Qgd29ya2Zsb3dDdXJzb3IgPSBuZXcgUmVnRXhwQ3Vyc29yKFxyXG5cdFx0XHRcdFx0XHR0aGlzLnZpZXcuc3RhdGUuZG9jLFxyXG5cdFx0XHRcdFx0XHRcIigjd29ya2Zsb3dcXFxcL1teXFxcXC9cXFxcc10rfFxcXFxbc3RhZ2U6OlteXFxcXF1dK1xcXFxdKVwiLFxyXG5cdFx0XHRcdFx0XHR7fSxcclxuXHRcdFx0XHRcdFx0ZnJvbSxcclxuXHRcdFx0XHRcdFx0dG9cclxuXHRcdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdFx0d2hpbGUgKCF3b3JrZmxvd0N1cnNvci5uZXh0KCkuZG9uZSkge1xyXG5cdFx0XHRcdFx0XHRjb25zdCB7IGZyb206IG1hdGNoRnJvbSwgdG86IG1hdGNoVG8gfSA9XHJcblx0XHRcdFx0XHRcdFx0d29ya2Zsb3dDdXJzb3IudmFsdWU7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBDcmVhdGUgY2FjaGUga2V5IGZvciB0aGlzIG1hdGNoIC0gdXNlIGxpbmUgbnVtYmVyIGFuZCBoYXNoIG9mIGNvbnRlbnRcclxuXHRcdFx0XHRcdFx0Y29uc3QgbGluZSA9IHRoaXMudmlldy5zdGF0ZS5kb2MubGluZUF0KG1hdGNoRnJvbSk7XHJcblx0XHRcdFx0XHRcdGNvbnN0IGxpbmVIYXNoID0gdGhpcy5zaW1wbGVIYXNoKGxpbmUudGV4dCk7XHJcblx0XHRcdFx0XHRcdGNvbnN0IGNhY2hlS2V5ID0gYCR7bGluZS5udW1iZXJ9OiR7bGluZUhhc2h9YDtcclxuXHJcblx0XHRcdFx0XHRcdC8vIENoZWNrIGNhY2hlIGZpcnN0XHJcblx0XHRcdFx0XHRcdGlmICh0aGlzLmRlY29yYXRpb25DYWNoZS5oYXMoY2FjaGVLZXkpKSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgY2FjaGVkRGVjb3JhdGlvbiA9XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLmRlY29yYXRpb25DYWNoZS5nZXQoY2FjaGVLZXkpITtcclxuXHRcdFx0XHRcdFx0XHRkZWNvcmF0aW9ucy5wdXNoKGNhY2hlZERlY29yYXRpb24pO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRpZiAoIXRoaXMuc2hvdWxkUmVuZGVyKG1hdGNoRnJvbSwgbWF0Y2hUbykpIHtcclxuXHRcdFx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0Y29uc3QgbGluZVRleHQgPSBsaW5lLnRleHQ7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBDaGVjayBpZiB0aGlzIGxpbmUgY29udGFpbnMgYSB0YXNrIC0g5L+u5pS55q2j5YiZ6KGo6L6+5byP5Lul5pSv5oyB5pu054G15rS755qE5Lu75Yqh5qC85byPXHJcblx0XHRcdFx0XHRcdC8vIOWOn+adpeeahOato+WImeWPquWMuemFjeS7peS7u+WKoeagh+iusOW8gOWktOeahOihjO+8jOeOsOWcqOaUueS4uuajgOafpeaVtOihjOaYr+WQpuWMheWQq+S7u+WKoeagh+iusFxyXG5cdFx0XHRcdFx0XHRjb25zdCB0YXNrUmVnZXggPSAvXihbXFxzfFxcdF0qKShbLSorXXxcXGQrXFwuKVxccytcXFsoLildLztcclxuXHRcdFx0XHRcdFx0Y29uc3QgaGFzVGFza01hcmtlciA9IC9cXFsoWyB4WFxcLV0pXFxdLy50ZXN0KGxpbmVUZXh0KTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIOWmguaenOaXouS4jeaYr+agh+WHhuS7u+WKoeagvOW8j++8jOS5n+ayoeacieS7u+WKoeagh+iusO+8jOWImei3s+i/h1xyXG5cdFx0XHRcdFx0XHRpZiAoIXRhc2tSZWdleC50ZXN0KGxpbmVUZXh0KSAmJiAhaGFzVGFza01hcmtlcikge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBFeHRyYWN0IHdvcmtmbG93IGluZm9ybWF0aW9uXHJcblx0XHRcdFx0XHRcdGNvbnN0IHdvcmtmbG93SW5mbyA9IGV4dHJhY3RXb3JrZmxvd0luZm8obGluZVRleHQpO1xyXG5cdFx0XHRcdFx0XHRpZiAoIXdvcmtmbG93SW5mbykge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBSZXNvbHZlIGNvbXBsZXRlIHdvcmtmbG93IGluZm9ybWF0aW9uXHJcblx0XHRcdFx0XHRcdGNvbnN0IHJlc29sdmVkSW5mbyA9IHJlc29sdmVXb3JrZmxvd0luZm8oXHJcblx0XHRcdFx0XHRcdFx0bGluZVRleHQsXHJcblx0XHRcdFx0XHRcdFx0dGhpcy52aWV3LnN0YXRlLmRvYyxcclxuXHRcdFx0XHRcdFx0XHRsaW5lLm51bWJlcixcclxuXHRcdFx0XHRcdFx0XHRwbHVnaW5cclxuXHRcdFx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0XHRcdGlmICghcmVzb2x2ZWRJbmZvKSB7XHJcblx0XHRcdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdGNvbnN0IHsgd29ya2Zsb3dUeXBlLCBjdXJyZW50U3RhZ2UsIGN1cnJlbnRTdWJTdGFnZSB9ID1cclxuXHRcdFx0XHRcdFx0XHRyZXNvbHZlZEluZm87XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBBZGQgZGVjb3JhdGlvbiBhZnRlciB0aGUgbWF0Y2hlZCB0ZXh0XHJcblx0XHRcdFx0XHRcdGNvbnN0IGRlY29yYXRpb24gPSBEZWNvcmF0aW9uLndpZGdldCh7XHJcblx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBuZXcgV29ya2Zsb3dTdGFnZVdpZGdldChcclxuXHRcdFx0XHRcdFx0XHRcdGFwcCxcclxuXHRcdFx0XHRcdFx0XHRcdHBsdWdpbixcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMudmlldyxcclxuXHRcdFx0XHRcdFx0XHRcdG1hdGNoRnJvbSxcclxuXHRcdFx0XHRcdFx0XHRcdG1hdGNoVG8sXHJcblx0XHRcdFx0XHRcdFx0XHR3b3JrZmxvd1R5cGUsXHJcblx0XHRcdFx0XHRcdFx0XHRjdXJyZW50U3RhZ2UuaWQsXHJcblx0XHRcdFx0XHRcdFx0XHRjdXJyZW50U3ViU3RhZ2U/LmlkXHJcblx0XHRcdFx0XHRcdFx0KSxcclxuXHRcdFx0XHRcdFx0XHRzaWRlOiAxLFxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRcdGNvbnN0IGRlY29yYXRpb25SYW5nZSA9IGRlY29yYXRpb24ucmFuZ2UoXHJcblx0XHRcdFx0XHRcdFx0bWF0Y2hUbyxcclxuXHRcdFx0XHRcdFx0XHRtYXRjaFRvXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdGRlY29yYXRpb25zLnB1c2goZGVjb3JhdGlvblJhbmdlKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIENhY2hlIHRoZSBkZWNvcmF0aW9uIHdpdGggc2l6ZSBsaW1pdFxyXG5cdFx0XHRcdFx0XHRpZiAodGhpcy5kZWNvcmF0aW9uQ2FjaGUuc2l6ZSA+PSB0aGlzLk1BWF9DQUNIRV9TSVpFKSB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gUmVtb3ZlIG9sZGVzdCBlbnRyeSAoZmlyc3Qga2V5KVxyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGZpcnN0S2V5ID0gdGhpcy5kZWNvcmF0aW9uQ2FjaGVcclxuXHRcdFx0XHRcdFx0XHRcdC5rZXlzKClcclxuXHRcdFx0XHRcdFx0XHRcdC5uZXh0KCkudmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5kZWNvcmF0aW9uQ2FjaGUuZGVsZXRlKGZpcnN0S2V5KTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR0aGlzLmRlY29yYXRpb25DYWNoZS5zZXQoY2FjaGVLZXksIGRlY29yYXRpb25SYW5nZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHR0aGlzLmRlY29yYXRpb25zID0gRGVjb3JhdGlvbi5zZXQoXHJcblx0XHRcdFx0XHRkZWNvcmF0aW9ucy5zb3J0KChhLCBiKSA9PiBhLmZyb20gLSBiLmZyb20pXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cHJpdmF0ZSBzaW1wbGVIYXNoKHN0cjogc3RyaW5nKTogbnVtYmVyIHtcclxuXHRcdFx0XHRsZXQgaGFzaCA9IDA7XHJcblx0XHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRcdGNvbnN0IGNoYXIgPSBzdHIuY2hhckNvZGVBdChpKTtcclxuXHRcdFx0XHRcdGhhc2ggPSAoaGFzaCA8PCA1KSAtIGhhc2ggKyBjaGFyO1xyXG5cdFx0XHRcdFx0aGFzaCA9IGhhc2ggJiBoYXNoOyAvLyBDb252ZXJ0IHRvIDMyLWJpdCBpbnRlZ2VyXHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHJldHVybiBoYXNoO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRwcml2YXRlIHNob3VsZFJlbmRlcihmcm9tOiBudW1iZXIsIHRvOiBudW1iZXIpOiBib29sZWFuIHtcclxuXHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0Ly8gQ2hlY2sgaWYgd2UncmUgaW4gYSBjb2RlIGJsb2NrIG9yIGZyb250bWF0dGVyXHJcblx0XHRcdFx0XHRjb25zdCBzeW50YXhOb2RlID0gc3ludGF4VHJlZSh0aGlzLnZpZXcuc3RhdGUpLnJlc29sdmVJbm5lcihcclxuXHRcdFx0XHRcdFx0ZnJvbSArIDFcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRjb25zdCBub2RlUHJvcHMgPSBzeW50YXhOb2RlLnR5cGUucHJvcCh0b2tlbkNsYXNzTm9kZVByb3ApO1xyXG5cclxuXHRcdFx0XHRcdGlmIChub2RlUHJvcHMpIHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgcHJvcHMgPSBub2RlUHJvcHMuc3BsaXQoXCIgXCIpO1xyXG5cdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0cHJvcHMuaW5jbHVkZXMoXCJobWQtY29kZWJsb2NrXCIpIHx8XHJcblx0XHRcdFx0XHRcdFx0cHJvcHMuaW5jbHVkZXMoXCJobWQtZnJvbnRtYXR0ZXJcIilcclxuXHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gTW9yZSBsZW5pZW50IGN1cnNvciBvdmVybGFwIGNoZWNrIC0gb25seSBoaWRlIGlmIGN1cnNvciBpcyBkaXJlY3RseSBvbiB0aGUgZGVjb3JhdGlvblxyXG5cdFx0XHRcdFx0Y29uc3Qgc2VsZWN0aW9uID0gdGhpcy52aWV3LnN0YXRlLnNlbGVjdGlvbjtcclxuXHRcdFx0XHRcdGNvbnN0IGRpcmVjdE92ZXJsYXAgPSBzZWxlY3Rpb24ucmFuZ2VzLnNvbWUoKHJhbmdlKSA9PiB7XHJcblx0XHRcdFx0XHRcdHJldHVybiByYW5nZS5mcm9tID09PSB0byB8fCByYW5nZS50byA9PT0gZnJvbTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdHJldHVybiAhZGlyZWN0T3ZlcmxhcDtcclxuXHRcdFx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRcdFwiRXJyb3IgY2hlY2tpbmcgaWYgd29ya2Zsb3cgZGVjb3JhdG9yIHNob3VsZCByZW5kZXJcIixcclxuXHRcdFx0XHRcdFx0ZVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGRlY29yYXRpb25zOiAocGx1Z2luKSA9PiBwbHVnaW4uZGVjb3JhdGlvbnMsXHJcblx0XHR9XHJcblx0KTtcclxufVxyXG4iXX0=