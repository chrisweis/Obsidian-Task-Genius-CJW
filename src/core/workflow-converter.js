import { t } from "../translations/helper";
/**
 * Analyzes the current task structure around the cursor position
 */
export function analyzeTaskStructure(editor, cursor) {
    const lines = editor.getValue().split('\n');
    const currentLine = cursor.line;
    // Find the root task or start of the structure
    const rootLine = findRootTask(lines, currentLine);
    if (rootLine === -1)
        return null;
    return parseTaskStructure(lines, rootLine);
}
/**
 * Finds the root task line for the current context
 */
function findRootTask(lines, currentLine) {
    // Start from current line and go up to find the root
    for (let i = currentLine; i >= 0; i--) {
        const line = lines[i];
        const taskMatch = line.match(/^(\s*)[-*+] \[(.)\]/);
        if (taskMatch) {
            const indentation = taskMatch[1].length;
            // If this is at the root level (no indentation) or 
            // if the previous lines don't have tasks with less indentation
            if (indentation === 0) {
                return i;
            }
            // Check if there's a parent task with less indentation
            let hasParent = false;
            for (let j = i - 1; j >= 0; j--) {
                const parentLine = lines[j];
                const parentMatch = parentLine.match(/^(\s*)[-*+] \[(.)\]/);
                if (parentMatch && parentMatch[1].length < indentation) {
                    hasParent = true;
                    break;
                }
                // Stop if we hit a non-empty line that's not a task
                if (parentLine.trim() && !parentMatch) {
                    break;
                }
            }
            if (!hasParent) {
                return i;
            }
        }
    }
    return -1;
}
/**
 * Parses task structure starting from a given line
 */
function parseTaskStructure(lines, startLine) {
    var _a;
    const line = lines[startLine];
    const taskMatch = line.match(/^(\s*)[-*+] \[(.)\](.+)/);
    if (!taskMatch) {
        return {
            content: line.trim(),
            level: 0,
            line: startLine,
            isTask: false,
            status: '',
            children: []
        };
    }
    const indentation = taskMatch[1].length;
    const status = taskMatch[2];
    const content = taskMatch[3].trim();
    const structure = {
        content,
        level: indentation,
        line: startLine,
        isTask: true,
        status,
        children: []
    };
    // Find children
    let i = startLine + 1;
    while (i < lines.length) {
        const childLine = lines[i];
        // Skip empty lines
        if (!childLine.trim()) {
            i++;
            continue;
        }
        const childMatch = childLine.match(/^(\s*)[-*+] \[(.)\]/);
        if (childMatch) {
            const childIndentation = childMatch[1].length;
            // If this is a child (more indented)
            if (childIndentation > indentation) {
                const childStructure = parseTaskStructure(lines, i);
                structure.children.push(childStructure);
                // Skip the lines that were parsed as part of this child
                i = findNextSiblingLine(lines, i, childIndentation) || lines.length;
            }
            else {
                // This is a sibling or parent, stop parsing children
                break;
            }
        }
        else {
            // Non-task line, stop if it's at the same or less indentation
            const lineIndentation = ((_a = childLine.match(/^(\s*)/)) === null || _a === void 0 ? void 0 : _a[1].length) || 0;
            if (lineIndentation <= indentation) {
                break;
            }
            i++;
        }
    }
    return structure;
}
/**
 * Finds the next sibling line at the same indentation level
 */
function findNextSiblingLine(lines, currentLine, indentation) {
    for (let i = currentLine + 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim())
            continue;
        const match = line.match(/^(\s*)/);
        const lineIndentation = match ? match[1].length : 0;
        if (lineIndentation <= indentation) {
            return i;
        }
    }
    return null;
}
/**
 * Converts a task structure to a workflow definition
 */
export function convertTaskStructureToWorkflow(structure, workflowName, workflowId) {
    const stages = [];
    // Convert the main task and its children to stages
    if (structure.isTask) {
        // Add the root task as the first stage
        stages.push({
            id: generateStageId(structure.content),
            name: structure.content,
            type: structure.children.length > 0 ? "linear" : "terminal"
        });
        // Convert children to stages
        structure.children.forEach((child, index) => {
            const stage = convertTaskToStage(child, index === structure.children.length - 1);
            stages.push(stage);
        });
        // Set up stage transitions
        for (let i = 0; i < stages.length - 1; i++) {
            stages[i].next = stages[i + 1].id;
        }
    }
    return {
        id: workflowId,
        name: workflowName,
        description: t("Workflow generated from task structure"),
        stages,
        metadata: {
            version: "1.0",
            created: new Date().toISOString().split("T")[0],
            lastModified: new Date().toISOString().split("T")[0],
        }
    };
}
/**
 * Converts a single task to a workflow stage
 */
function convertTaskToStage(task, isLast) {
    const stage = {
        id: generateStageId(task.content),
        name: task.content,
        type: isLast ? "terminal" : "linear"
    };
    // If the task has children, make it a cycle stage with substages
    if (task.children.length > 0) {
        stage.type = "cycle";
        stage.subStages = task.children.map((child, index) => ({
            id: generateStageId(child.content),
            name: child.content,
            next: index < task.children.length - 1 ?
                generateStageId(task.children[index + 1].content) :
                generateStageId(task.children[0].content) // Cycle back to first
        }));
    }
    return stage;
}
/**
 * Generates a stage ID from content
 */
function generateStageId(content) {
    return content
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, "_")
        .substring(0, 30);
}
/**
 * Creates a workflow starting task at the current cursor position
 */
export function createWorkflowStartingTask(editor, cursor, workflow, plugin) {
    const currentLine = editor.getLine(cursor.line);
    const indentMatch = currentLine.match(/^(\s*)/);
    const indentation = indentMatch ? indentMatch[1] : "";
    // Create the root workflow task
    const rootTaskText = `${indentation}- [ ] ${workflow.name} #workflow/${workflow.id}`;
    // If we're on an empty line, replace it; otherwise insert a new line
    if (currentLine.trim() === "") {
        editor.setLine(cursor.line, rootTaskText);
    }
    else {
        editor.replaceRange(`\n${rootTaskText}`, { line: cursor.line, ch: currentLine.length }, { line: cursor.line, ch: currentLine.length });
    }
}
/**
 * Converts current task to workflow root by adding workflow tag
 */
export function convertCurrentTaskToWorkflowRoot(editor, cursor, workflowId) {
    const currentLine = editor.getLine(cursor.line);
    const taskMatch = currentLine.match(/^(\s*)[-*+] \[(.)\](.+)/);
    if (!taskMatch) {
        return false;
    }
    const [, indentation, status, content] = taskMatch;
    // Check if it already has a workflow tag
    if (content.includes("#workflow/")) {
        return false;
    }
    // Add the workflow tag
    const newContent = `${indentation}- [${status}]${content} #workflow/${workflowId}`;
    editor.setLine(cursor.line, newContent);
    return true;
}
/**
 * Analyzes existing workflows to suggest similar patterns
 */
export function suggestWorkflowFromExisting(structure, existingWorkflows) {
    // Simple heuristic: find workflow with similar number of stages
    const stageCount = 1 + structure.children.length;
    const similarWorkflow = existingWorkflows.find(workflow => Math.abs(workflow.stages.length - stageCount) <= 1);
    if (similarWorkflow) {
        // Create a modified version of the similar workflow
        return Object.assign(Object.assign({}, similarWorkflow), { id: generateStageId(structure.content + "_workflow"), name: `${structure.content} Workflow`, description: t("Workflow based on existing pattern"), metadata: {
                version: "1.0",
                created: new Date().toISOString().split("T")[0],
                lastModified: new Date().toISOString().split("T")[0],
            } });
    }
    return null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2Zsb3ctY29udmVydGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsid29ya2Zsb3ctY29udmVydGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUdBLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQWUzQzs7R0FFRztBQUNILE1BQU0sVUFBVSxvQkFBb0IsQ0FDbkMsTUFBYyxFQUNkLE1BQXNCO0lBRXRCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDNUMsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQztJQUVoQywrQ0FBK0M7SUFDL0MsTUFBTSxRQUFRLEdBQUcsWUFBWSxDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQztJQUNsRCxJQUFJLFFBQVEsS0FBSyxDQUFDLENBQUM7UUFBRSxPQUFPLElBQUksQ0FBQztJQUVqQyxPQUFPLGtCQUFrQixDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztBQUM1QyxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLFlBQVksQ0FBQyxLQUFlLEVBQUUsV0FBbUI7SUFDekQscURBQXFEO0lBQ3JELEtBQUssSUFBSSxDQUFDLEdBQUcsV0FBVyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDdEMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUVwRCxJQUFJLFNBQVMsRUFBRTtZQUNkLE1BQU0sV0FBVyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7WUFFeEMsb0RBQW9EO1lBQ3BELCtEQUErRDtZQUMvRCxJQUFJLFdBQVcsS0FBSyxDQUFDLEVBQUU7Z0JBQ3RCLE9BQU8sQ0FBQyxDQUFDO2FB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TyxHQUFHLFdBQVcsQ0FBQyxFQUNwRCxJQUFJLEVBQUUsR0FBRyxTQUFTLENBQUMsT0FBTyxXQUFXLEVBQ3JDLFdBQVcsRUFBRSxDQUFDLENBQUMsb0NBQW9DLENBQUMsRUFDcEQsUUFBUSxFQUFFO2dCQUNULE9BQU8sRUFBRSxLQUFLO2dCQUNkLE9BQU8sRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQy9DLFlBQVksRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDcEQsSUFDQTtLQUNGO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDYixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRWRpdG9yLCBFZGl0b3JQb3NpdGlvbiB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBXb3JrZmxvd0RlZmluaXRpb24sIFdvcmtmbG93U3RhZ2UgfSBmcm9tIFwiLi4vY29tbW9uL3NldHRpbmctZGVmaW5pdGlvblwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCIuLi9pbmRleFwiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIi4uL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuXHJcbi8qKlxyXG4gKiBVdGlsaXR5IGZ1bmN0aW9ucyBmb3IgY29udmVydGluZyB0YXNrcyB0byB3b3JrZmxvd3MgYW5kIHZpY2UgdmVyc2FcclxuICovXHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFRhc2tTdHJ1Y3R1cmUge1xyXG5cdGNvbnRlbnQ6IHN0cmluZztcclxuXHRsZXZlbDogbnVtYmVyO1xyXG5cdGxpbmU6IG51bWJlcjtcclxuXHRpc1Rhc2s6IGJvb2xlYW47XHJcblx0c3RhdHVzOiBzdHJpbmc7XHJcblx0Y2hpbGRyZW46IFRhc2tTdHJ1Y3R1cmVbXTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEFuYWx5emVzIHRoZSBjdXJyZW50IHRhc2sgc3RydWN0dXJlIGFyb3VuZCB0aGUgY3Vyc29yIHBvc2l0aW9uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZVRhc2tTdHJ1Y3R1cmUoXHJcblx0ZWRpdG9yOiBFZGl0b3IsXHJcblx0Y3Vyc29yOiBFZGl0b3JQb3NpdGlvblxyXG4pOiBUYXNrU3RydWN0dXJlIHwgbnVsbCB7XHJcblx0Y29uc3QgbGluZXMgPSBlZGl0b3IuZ2V0VmFsdWUoKS5zcGxpdCgnXFxuJyk7XHJcblx0Y29uc3QgY3VycmVudExpbmUgPSBjdXJzb3IubGluZTtcclxuXHRcclxuXHQvLyBGaW5kIHRoZSByb290IHRhc2sgb3Igc3RhcnQgb2YgdGhlIHN0cnVjdHVyZVxyXG5cdGNvbnN0IHJvb3RMaW5lID0gZmluZFJvb3RUYXNrKGxpbmVzLCBjdXJyZW50TGluZSk7XHJcblx0aWYgKHJvb3RMaW5lID09PSAtMSkgcmV0dXJuIG51bGw7XHJcblxyXG5cdHJldHVybiBwYXJzZVRhc2tTdHJ1Y3R1cmUobGluZXMsIHJvb3RMaW5lKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEZpbmRzIHRoZSByb290IHRhc2sgbGluZSBmb3IgdGhlIGN1cnJlbnQgY29udGV4dFxyXG4gKi9cclxuZnVuY3Rpb24gZmluZFJvb3RUYXNrKGxpbmVzOiBzdHJpbmdbXSwgY3VycmVudExpbmU6IG51bWJlcik6IG51bWJlciB7XHJcblx0Ly8gU3RhcnQgZnJvbSBjdXJyZW50IGxpbmUgYW5kIGdvIHVwIHRvIGZpbmQgdGhlIHJvb3RcclxuXHRmb3IgKGxldCBpID0gY3VycmVudExpbmU7IGkgPj0gMDsgaS0tKSB7XHJcblx0XHRjb25zdCBsaW5lID0gbGluZXNbaV07XHJcblx0XHRjb25zdCB0YXNrTWF0Y2ggPSBsaW5lLm1hdGNoKC9eKFxccyopWy0qK10gXFxbKC4pXFxdLyk7XHJcblx0XHRcclxuXHRcdGlmICh0YXNrTWF0Y2gpIHtcclxuXHRcdFx0Y29uc3QgaW5kZW50YXRpb24gPSB0YXNrTWF0Y2hbMV0ubGVuZ3RoO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gSWYgdGhpcyBpcyBhdCB0aGUgcm9vdCBsZXZlbCAobm8gaW5kZW50YXRpb24pIG9yIFxyXG5cdFx0XHQvLyBpZiB0aGUgcHJldmlvdXMgbGluZXMgZG9uJ3QgaGF2ZSB0YXNrcyB3aXRoIGxlc3MgaW5kZW50YXRpb25cclxuXHRcdFx0aWYgKGluZGVudGF0aW9uID09PSAwKSB7XHJcblx0XHRcdFx0cmV0dXJuIGk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdC8vIENoZWNrIGlmIHRoZXJlJ3MgYSBwYXJlbnQgdGFzayB3aXRoIGxlc3MgaW5kZW50YXRpb25cclxuXHRcdFx0bGV0IGhhc1BhcmVudCA9IGZhbHNlO1xyXG5cdFx0XHRmb3IgKGxldCBqID0gaSAtIDE7IGogPj0gMDsgai0tKSB7XHJcblx0XHRcdFx0Y29uc3QgcGFyZW50TGluZSA9IGxpbmVzW2pdO1xyXG5cdFx0XHRcdGNvbnN0IHBhcmVudE1hdGNoID0gcGFyZW50TGluZS5tYXRjaCgvXihcXHMqKVstKitdIFxcWyguKVxcXS8pO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGlmIChwYXJlbnRNYXRjaCAmJiBwYXJlbnRNYXRjaFsxXS5sZW5ndGggPCBpbmRlbnRhdGlvbikge1xyXG5cdFx0XHRcdFx0aGFzUGFyZW50ID0gdHJ1ZTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRcclxuXHRcdFx0XHQvLyBTdG9wIGlmIHdlIGhpdCBhIG5vbi1lbXB0eSBsaW5lIHRoYXQncyBub3QgYSB0YXNrXHJcblx0XHRcdFx0aWYgKHBhcmVudExpbmUudHJpbSgpICYmICFwYXJlbnRNYXRjaCkge1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoIWhhc1BhcmVudCkge1xyXG5cdFx0XHRcdHJldHVybiBpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cdFxyXG5cdHJldHVybiAtMTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFBhcnNlcyB0YXNrIHN0cnVjdHVyZSBzdGFydGluZyBmcm9tIGEgZ2l2ZW4gbGluZVxyXG4gKi9cclxuZnVuY3Rpb24gcGFyc2VUYXNrU3RydWN0dXJlKGxpbmVzOiBzdHJpbmdbXSwgc3RhcnRMaW5lOiBudW1iZXIpOiBUYXNrU3RydWN0dXJlIHtcclxuXHRjb25zdCBsaW5lID0gbGluZXNbc3RhcnRMaW5lXTtcclxuXHRjb25zdCB0YXNrTWF0Y2ggPSBsaW5lLm1hdGNoKC9eKFxccyopWy0qK10gXFxbKC4pXFxdKC4rKS8pO1xyXG5cdFxyXG5cdGlmICghdGFza01hdGNoKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRjb250ZW50OiBsaW5lLnRyaW0oKSxcclxuXHRcdFx0bGV2ZWw6IDAsXHJcblx0XHRcdGxpbmU6IHN0YXJ0TGluZSxcclxuXHRcdFx0aXNUYXNrOiBmYWxzZSxcclxuXHRcdFx0c3RhdHVzOiAnJyxcclxuXHRcdFx0Y2hpbGRyZW46IFtdXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0Y29uc3QgaW5kZW50YXRpb24gPSB0YXNrTWF0Y2hbMV0ubGVuZ3RoO1xyXG5cdGNvbnN0IHN0YXR1cyA9IHRhc2tNYXRjaFsyXTtcclxuXHRjb25zdCBjb250ZW50ID0gdGFza01hdGNoWzNdLnRyaW0oKTtcclxuXHRcclxuXHRjb25zdCBzdHJ1Y3R1cmU6IFRhc2tTdHJ1Y3R1cmUgPSB7XHJcblx0XHRjb250ZW50LFxyXG5cdFx0bGV2ZWw6IGluZGVudGF0aW9uLFxyXG5cdFx0bGluZTogc3RhcnRMaW5lLFxyXG5cdFx0aXNUYXNrOiB0cnVlLFxyXG5cdFx0c3RhdHVzLFxyXG5cdFx0Y2hpbGRyZW46IFtdXHJcblx0fTtcclxuXHJcblx0Ly8gRmluZCBjaGlsZHJlblxyXG5cdGxldCBpID0gc3RhcnRMaW5lICsgMTtcclxuXHR3aGlsZSAoaSA8IGxpbmVzLmxlbmd0aCkge1xyXG5cdFx0Y29uc3QgY2hpbGRMaW5lID0gbGluZXNbaV07XHJcblx0XHRcclxuXHRcdC8vIFNraXAgZW1wdHkgbGluZXNcclxuXHRcdGlmICghY2hpbGRMaW5lLnRyaW0oKSkge1xyXG5cdFx0XHRpKys7XHJcblx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRjb25zdCBjaGlsZE1hdGNoID0gY2hpbGRMaW5lLm1hdGNoKC9eKFxccyopWy0qK10gXFxbKC4pXFxdLyk7XHJcblx0XHRcclxuXHRcdGlmIChjaGlsZE1hdGNoKSB7XHJcblx0XHRcdGNvbnN0IGNoaWxkSW5kZW50YXRpb24gPSBjaGlsZE1hdGNoWzFdLmxlbmd0aDtcclxuXHRcdFx0XHJcblx0XHRcdC8vIElmIHRoaXMgaXMgYSBjaGlsZCAobW9yZSBpbmRlbnRlZClcclxuXHRcdFx0aWYgKGNoaWxkSW5kZW50YXRpb24gPiBpbmRlbnRhdGlvbikge1xyXG5cdFx0XHRcdGNvbnN0IGNoaWxkU3RydWN0dXJlID0gcGFyc2VUYXNrU3RydWN0dXJlKGxpbmVzLCBpKTtcclxuXHRcdFx0XHRzdHJ1Y3R1cmUuY2hpbGRyZW4ucHVzaChjaGlsZFN0cnVjdHVyZSk7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Ly8gU2tpcCB0aGUgbGluZXMgdGhhdCB3ZXJlIHBhcnNlZCBhcyBwYXJ0IG9mIHRoaXMgY2hpbGRcclxuXHRcdFx0XHRpID0gZmluZE5leHRTaWJsaW5nTGluZShsaW5lcywgaSwgY2hpbGRJbmRlbnRhdGlvbikgfHwgbGluZXMubGVuZ3RoO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIFRoaXMgaXMgYSBzaWJsaW5nIG9yIHBhcmVudCwgc3RvcCBwYXJzaW5nIGNoaWxkcmVuXHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIE5vbi10YXNrIGxpbmUsIHN0b3AgaWYgaXQncyBhdCB0aGUgc2FtZSBvciBsZXNzIGluZGVudGF0aW9uXHJcblx0XHRcdGNvbnN0IGxpbmVJbmRlbnRhdGlvbiA9IGNoaWxkTGluZS5tYXRjaCgvXihcXHMqKS8pPy5bMV0ubGVuZ3RoIHx8IDA7XHJcblx0XHRcdGlmIChsaW5lSW5kZW50YXRpb24gPD0gaW5kZW50YXRpb24pIHtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRpKys7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gc3RydWN0dXJlO1xyXG59XHJcblxyXG4vKipcclxuICogRmluZHMgdGhlIG5leHQgc2libGluZyBsaW5lIGF0IHRoZSBzYW1lIGluZGVudGF0aW9uIGxldmVsXHJcbiAqL1xyXG5mdW5jdGlvbiBmaW5kTmV4dFNpYmxpbmdMaW5lKGxpbmVzOiBzdHJpbmdbXSwgY3VycmVudExpbmU6IG51bWJlciwgaW5kZW50YXRpb246IG51bWJlcik6IG51bWJlciB8IG51bGwge1xyXG5cdGZvciAobGV0IGkgPSBjdXJyZW50TGluZSArIDE7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0Y29uc3QgbGluZSA9IGxpbmVzW2ldO1xyXG5cdFx0aWYgKCFsaW5lLnRyaW0oKSkgY29udGludWU7XHJcblx0XHRcclxuXHRcdGNvbnN0IG1hdGNoID0gbGluZS5tYXRjaCgvXihcXHMqKS8pO1xyXG5cdFx0Y29uc3QgbGluZUluZGVudGF0aW9uID0gbWF0Y2ggPyBtYXRjaFsxXS5sZW5ndGggOiAwO1xyXG5cdFx0XHJcblx0XHRpZiAobGluZUluZGVudGF0aW9uIDw9IGluZGVudGF0aW9uKSB7XHJcblx0XHRcdHJldHVybiBpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRyZXR1cm4gbnVsbDtcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbnZlcnRzIGEgdGFzayBzdHJ1Y3R1cmUgdG8gYSB3b3JrZmxvdyBkZWZpbml0aW9uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY29udmVydFRhc2tTdHJ1Y3R1cmVUb1dvcmtmbG93KFxyXG5cdHN0cnVjdHVyZTogVGFza1N0cnVjdHVyZSxcclxuXHR3b3JrZmxvd05hbWU6IHN0cmluZyxcclxuXHR3b3JrZmxvd0lkOiBzdHJpbmdcclxuKTogV29ya2Zsb3dEZWZpbml0aW9uIHtcclxuXHRjb25zdCBzdGFnZXM6IFdvcmtmbG93U3RhZ2VbXSA9IFtdO1xyXG5cdFxyXG5cdC8vIENvbnZlcnQgdGhlIG1haW4gdGFzayBhbmQgaXRzIGNoaWxkcmVuIHRvIHN0YWdlc1xyXG5cdGlmIChzdHJ1Y3R1cmUuaXNUYXNrKSB7XHJcblx0XHQvLyBBZGQgdGhlIHJvb3QgdGFzayBhcyB0aGUgZmlyc3Qgc3RhZ2VcclxuXHRcdHN0YWdlcy5wdXNoKHtcclxuXHRcdFx0aWQ6IGdlbmVyYXRlU3RhZ2VJZChzdHJ1Y3R1cmUuY29udGVudCksXHJcblx0XHRcdG5hbWU6IHN0cnVjdHVyZS5jb250ZW50LFxyXG5cdFx0XHR0eXBlOiBzdHJ1Y3R1cmUuY2hpbGRyZW4ubGVuZ3RoID4gMCA/IFwibGluZWFyXCIgOiBcInRlcm1pbmFsXCJcclxuXHRcdH0pO1xyXG5cdFx0XHJcblx0XHQvLyBDb252ZXJ0IGNoaWxkcmVuIHRvIHN0YWdlc1xyXG5cdFx0c3RydWN0dXJlLmNoaWxkcmVuLmZvckVhY2goKGNoaWxkLCBpbmRleCkgPT4ge1xyXG5cdFx0XHRjb25zdCBzdGFnZSA9IGNvbnZlcnRUYXNrVG9TdGFnZShjaGlsZCwgaW5kZXggPT09IHN0cnVjdHVyZS5jaGlsZHJlbi5sZW5ndGggLSAxKTtcclxuXHRcdFx0c3RhZ2VzLnB1c2goc3RhZ2UpO1xyXG5cdFx0fSk7XHJcblx0XHRcclxuXHRcdC8vIFNldCB1cCBzdGFnZSB0cmFuc2l0aW9uc1xyXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBzdGFnZXMubGVuZ3RoIC0gMTsgaSsrKSB7XHJcblx0XHRcdHN0YWdlc1tpXS5uZXh0ID0gc3RhZ2VzW2kgKyAxXS5pZDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJldHVybiB7XHJcblx0XHRpZDogd29ya2Zsb3dJZCxcclxuXHRcdG5hbWU6IHdvcmtmbG93TmFtZSxcclxuXHRcdGRlc2NyaXB0aW9uOiB0KFwiV29ya2Zsb3cgZ2VuZXJhdGVkIGZyb20gdGFzayBzdHJ1Y3R1cmVcIiksXHJcblx0XHRzdGFnZXMsXHJcblx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHR2ZXJzaW9uOiBcIjEuMFwiLFxyXG5cdFx0XHRjcmVhdGVkOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc3BsaXQoXCJUXCIpWzBdLFxyXG5cdFx0XHRsYXN0TW9kaWZpZWQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5zcGxpdChcIlRcIilbMF0sXHJcblx0XHR9XHJcblx0fTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbnZlcnRzIGEgc2luZ2xlIHRhc2sgdG8gYSB3b3JrZmxvdyBzdGFnZVxyXG4gKi9cclxuZnVuY3Rpb24gY29udmVydFRhc2tUb1N0YWdlKHRhc2s6IFRhc2tTdHJ1Y3R1cmUsIGlzTGFzdDogYm9vbGVhbik6IFdvcmtmbG93U3RhZ2Uge1xyXG5cdGNvbnN0IHN0YWdlOiBXb3JrZmxvd1N0YWdlID0ge1xyXG5cdFx0aWQ6IGdlbmVyYXRlU3RhZ2VJZCh0YXNrLmNvbnRlbnQpLFxyXG5cdFx0bmFtZTogdGFzay5jb250ZW50LFxyXG5cdFx0dHlwZTogaXNMYXN0ID8gXCJ0ZXJtaW5hbFwiIDogXCJsaW5lYXJcIlxyXG5cdH07XHJcblxyXG5cdC8vIElmIHRoZSB0YXNrIGhhcyBjaGlsZHJlbiwgbWFrZSBpdCBhIGN5Y2xlIHN0YWdlIHdpdGggc3Vic3RhZ2VzXHJcblx0aWYgKHRhc2suY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xyXG5cdFx0c3RhZ2UudHlwZSA9IFwiY3ljbGVcIjtcclxuXHRcdHN0YWdlLnN1YlN0YWdlcyA9IHRhc2suY2hpbGRyZW4ubWFwKChjaGlsZCwgaW5kZXgpID0+ICh7XHJcblx0XHRcdGlkOiBnZW5lcmF0ZVN0YWdlSWQoY2hpbGQuY29udGVudCksXHJcblx0XHRcdG5hbWU6IGNoaWxkLmNvbnRlbnQsXHJcblx0XHRcdG5leHQ6IGluZGV4IDwgdGFzay5jaGlsZHJlbi5sZW5ndGggLSAxID8gXHJcblx0XHRcdFx0Z2VuZXJhdGVTdGFnZUlkKHRhc2suY2hpbGRyZW5baW5kZXggKyAxXS5jb250ZW50KSA6IFxyXG5cdFx0XHRcdGdlbmVyYXRlU3RhZ2VJZCh0YXNrLmNoaWxkcmVuWzBdLmNvbnRlbnQpIC8vIEN5Y2xlIGJhY2sgdG8gZmlyc3RcclxuXHRcdH0pKTtcclxuXHR9XHJcblxyXG5cdHJldHVybiBzdGFnZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdlbmVyYXRlcyBhIHN0YWdlIElEIGZyb20gY29udGVudFxyXG4gKi9cclxuZnVuY3Rpb24gZ2VuZXJhdGVTdGFnZUlkKGNvbnRlbnQ6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0cmV0dXJuIGNvbnRlbnRcclxuXHRcdC50b0xvd2VyQ2FzZSgpXHJcblx0XHQucmVwbGFjZSgvW15hLXowLTlcXHNdL2csIFwiXCIpXHJcblx0XHQucmVwbGFjZSgvXFxzKy9nLCBcIl9cIilcclxuXHRcdC5zdWJzdHJpbmcoMCwgMzApO1xyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhIHdvcmtmbG93IHN0YXJ0aW5nIHRhc2sgYXQgdGhlIGN1cnJlbnQgY3Vyc29yIHBvc2l0aW9uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlV29ya2Zsb3dTdGFydGluZ1Rhc2soXHJcblx0ZWRpdG9yOiBFZGl0b3IsXHJcblx0Y3Vyc29yOiBFZGl0b3JQb3NpdGlvbixcclxuXHR3b3JrZmxvdzogV29ya2Zsb3dEZWZpbml0aW9uLFxyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luXHJcbik6IHZvaWQge1xyXG5cdGNvbnN0IGN1cnJlbnRMaW5lID0gZWRpdG9yLmdldExpbmUoY3Vyc29yLmxpbmUpO1xyXG5cdGNvbnN0IGluZGVudE1hdGNoID0gY3VycmVudExpbmUubWF0Y2goL14oXFxzKikvKTtcclxuXHRjb25zdCBpbmRlbnRhdGlvbiA9IGluZGVudE1hdGNoID8gaW5kZW50TWF0Y2hbMV0gOiBcIlwiO1xyXG5cdFxyXG5cdC8vIENyZWF0ZSB0aGUgcm9vdCB3b3JrZmxvdyB0YXNrXHJcblx0Y29uc3Qgcm9vdFRhc2tUZXh0ID0gYCR7aW5kZW50YXRpb259LSBbIF0gJHt3b3JrZmxvdy5uYW1lfSAjd29ya2Zsb3cvJHt3b3JrZmxvdy5pZH1gO1xyXG5cdFxyXG5cdC8vIElmIHdlJ3JlIG9uIGFuIGVtcHR5IGxpbmUsIHJlcGxhY2UgaXQ7IG90aGVyd2lzZSBpbnNlcnQgYSBuZXcgbGluZVxyXG5cdGlmIChjdXJyZW50TGluZS50cmltKCkgPT09IFwiXCIpIHtcclxuXHRcdGVkaXRvci5zZXRMaW5lKGN1cnNvci5saW5lLCByb290VGFza1RleHQpO1xyXG5cdH0gZWxzZSB7XHJcblx0XHRlZGl0b3IucmVwbGFjZVJhbmdlKFxyXG5cdFx0XHRgXFxuJHtyb290VGFza1RleHR9YCxcclxuXHRcdFx0eyBsaW5lOiBjdXJzb3IubGluZSwgY2g6IGN1cnJlbnRMaW5lLmxlbmd0aCB9LFxyXG5cdFx0XHR7IGxpbmU6IGN1cnNvci5saW5lLCBjaDogY3VycmVudExpbmUubGVuZ3RoIH1cclxuXHRcdCk7XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICogQ29udmVydHMgY3VycmVudCB0YXNrIHRvIHdvcmtmbG93IHJvb3QgYnkgYWRkaW5nIHdvcmtmbG93IHRhZ1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRDdXJyZW50VGFza1RvV29ya2Zsb3dSb290KFxyXG5cdGVkaXRvcjogRWRpdG9yLFxyXG5cdGN1cnNvcjogRWRpdG9yUG9zaXRpb24sXHJcblx0d29ya2Zsb3dJZDogc3RyaW5nXHJcbik6IGJvb2xlYW4ge1xyXG5cdGNvbnN0IGN1cnJlbnRMaW5lID0gZWRpdG9yLmdldExpbmUoY3Vyc29yLmxpbmUpO1xyXG5cdGNvbnN0IHRhc2tNYXRjaCA9IGN1cnJlbnRMaW5lLm1hdGNoKC9eKFxccyopWy0qK10gXFxbKC4pXFxdKC4rKS8pO1xyXG5cdFxyXG5cdGlmICghdGFza01hdGNoKSB7XHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblx0fVxyXG5cclxuXHRjb25zdCBbLCBpbmRlbnRhdGlvbiwgc3RhdHVzLCBjb250ZW50XSA9IHRhc2tNYXRjaDtcclxuXHRcclxuXHQvLyBDaGVjayBpZiBpdCBhbHJlYWR5IGhhcyBhIHdvcmtmbG93IHRhZ1xyXG5cdGlmIChjb250ZW50LmluY2x1ZGVzKFwiI3dvcmtmbG93L1wiKSkge1xyXG5cdFx0cmV0dXJuIGZhbHNlO1xyXG5cdH1cclxuXHJcblx0Ly8gQWRkIHRoZSB3b3JrZmxvdyB0YWdcclxuXHRjb25zdCBuZXdDb250ZW50ID0gYCR7aW5kZW50YXRpb259LSBbJHtzdGF0dXN9XSR7Y29udGVudH0gI3dvcmtmbG93LyR7d29ya2Zsb3dJZH1gO1xyXG5cdGVkaXRvci5zZXRMaW5lKGN1cnNvci5saW5lLCBuZXdDb250ZW50KTtcclxuXHRcclxuXHRyZXR1cm4gdHJ1ZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEFuYWx5emVzIGV4aXN0aW5nIHdvcmtmbG93cyB0byBzdWdnZXN0IHNpbWlsYXIgcGF0dGVybnNcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBzdWdnZXN0V29ya2Zsb3dGcm9tRXhpc3RpbmcoXHJcblx0c3RydWN0dXJlOiBUYXNrU3RydWN0dXJlLFxyXG5cdGV4aXN0aW5nV29ya2Zsb3dzOiBXb3JrZmxvd0RlZmluaXRpb25bXVxyXG4pOiBXb3JrZmxvd0RlZmluaXRpb24gfCBudWxsIHtcclxuXHQvLyBTaW1wbGUgaGV1cmlzdGljOiBmaW5kIHdvcmtmbG93IHdpdGggc2ltaWxhciBudW1iZXIgb2Ygc3RhZ2VzXHJcblx0Y29uc3Qgc3RhZ2VDb3VudCA9IDEgKyBzdHJ1Y3R1cmUuY2hpbGRyZW4ubGVuZ3RoO1xyXG5cdFxyXG5cdGNvbnN0IHNpbWlsYXJXb3JrZmxvdyA9IGV4aXN0aW5nV29ya2Zsb3dzLmZpbmQod29ya2Zsb3cgPT4gXHJcblx0XHRNYXRoLmFicyh3b3JrZmxvdy5zdGFnZXMubGVuZ3RoIC0gc3RhZ2VDb3VudCkgPD0gMVxyXG5cdCk7XHJcblx0XHJcblx0aWYgKHNpbWlsYXJXb3JrZmxvdykge1xyXG5cdFx0Ly8gQ3JlYXRlIGEgbW9kaWZpZWQgdmVyc2lvbiBvZiB0aGUgc2ltaWxhciB3b3JrZmxvd1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0Li4uc2ltaWxhcldvcmtmbG93LFxyXG5cdFx0XHRpZDogZ2VuZXJhdGVTdGFnZUlkKHN0cnVjdHVyZS5jb250ZW50ICsgXCJfd29ya2Zsb3dcIiksXHJcblx0XHRcdG5hbWU6IGAke3N0cnVjdHVyZS5jb250ZW50fSBXb3JrZmxvd2AsXHJcblx0XHRcdGRlc2NyaXB0aW9uOiB0KFwiV29ya2Zsb3cgYmFzZWQgb24gZXhpc3RpbmcgcGF0dGVyblwiKSxcclxuXHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHR2ZXJzaW9uOiBcIjEuMFwiLFxyXG5cdFx0XHRcdGNyZWF0ZWQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5zcGxpdChcIlRcIilbMF0sXHJcblx0XHRcdFx0bGFzdE1vZGlmaWVkOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc3BsaXQoXCJUXCIpWzBdLFxyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxuXHRcclxuXHRyZXR1cm4gbnVsbDtcclxufVxyXG4iXX0=