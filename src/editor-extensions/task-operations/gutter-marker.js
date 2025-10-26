/**
 * Task Gutter Handler - Handles interaction for task markers in the gutter.
 * Displays a marker in front of task lines; clicking it shows task details.
 */
import { __awaiter } from "tslib";
import { gutter, GutterMarker } from "@/editor-extensions/core/extended-gutter";
import { Platform, ExtraButtonComponent } from "obsidian";
import { TaskDetailsModal } from "@/components/features/task/edit/TaskDetailsModal";
import { TaskDetailsPopover } from "@/components/features/task/edit/TaskDetailsPopover";
import { MarkdownTaskParser } from "@/dataflow/core/ConfigurableTaskParser";
// @ts-ignore - This import is necessary but TypeScript can't find it
import { syntaxTree, tokenClassNodeProp } from "@codemirror/language";
import "@/styles/task-gutter.css";
import { getConfig } from "@/common/task-parser-config";
const taskRegex = /^(([\s>]*)?(-|\d+\.|\*|\+)\s\[([^\[\]]{1})\])\s+(.*)$/m;
// Task icon marker
class TaskGutterMarker extends GutterMarker {
    constructor(text, lineNum, view, app, plugin) {
        super();
        this.text = text;
        this.lineNum = lineNum;
        this.view = view;
        this.app = app;
        this.plugin = plugin;
    }
    toDOM() {
        const markerEl = createEl("div");
        const button = new ExtraButtonComponent(markerEl)
            .setIcon("calendar-check")
            .onClick(() => {
            const lineText = this.view.state.doc.line(this.lineNum).text;
            const file = this.app.workspace.getActiveFile();
            if (!file || !taskRegex.test(lineText))
                return false;
            // Check if the line is in a codeblock or frontmatter
            const line = this.view.state.doc.line(this.lineNum);
            const syntaxNode = syntaxTree(this.view.state).resolveInner(line.from + 1);
            const nodeProps = syntaxNode.type.prop(tokenClassNodeProp);
            if (nodeProps) {
                const props = nodeProps.split(" ");
                if (props.includes("hmd-codeblock") ||
                    props.includes("hmd-frontmatter")) {
                    return false;
                }
            }
            const lineNum = this.view.state.doc.line(this.lineNum).number;
            const task = getTaskFromLine(this.plugin, file.path, lineText, lineNum - 1);
            if (task) {
                showTaskDetails(this.view, this.app, this.plugin, task, button.extraSettingsEl);
                return true;
            }
            return false;
        });
        button.extraSettingsEl.toggleClass("task-gutter-marker", true);
        return button.extraSettingsEl;
    }
}
/**
 * Shows task details.
 * Decides whether to show a Popover or a Modal based on the platform type.
 */
const showTaskDetails = (view, app, plugin, task, extraSettingsEl) => {
    // Task update callback function
    const onTaskUpdated = (updatedTask) => __awaiter(void 0, void 0, void 0, function* () {
        if (plugin.writeAPI) {
            yield plugin.writeAPI.updateTask({
                taskId: updatedTask.id,
                updates: updatedTask,
            });
        }
    });
    if (Platform.isDesktop) {
        // Desktop environment - show Popover
        const popover = new TaskDetailsPopover(app, plugin, task);
        const rect = extraSettingsEl.getBoundingClientRect();
        popover.showAtPosition({
            x: rect.left,
            y: rect.bottom + 10,
        });
    }
    else {
        // Mobile environment - show Modal
        const modal = new TaskDetailsModal(app, plugin, task, onTaskUpdated);
        modal.open();
    }
};
// Task parser instance
let taskParser = null;
/**
 * Parses a task from the line content.
 */
const getTaskFromLine = (plugin, filePath, line, lineNum) => {
    var _a, _b;
    try {
        // Try to get the task from dataflow index first
        if (plugin.dataflowOrchestrator &&
            ((_a = plugin.settings.projectConfig) === null || _a === void 0 ? void 0 : _a.enableEnhancedProject)) {
            try {
                // Try to find the task by ID in the existing index
                const taskId = `${filePath}-L${lineNum}`;
                const queryAPI = plugin.dataflowOrchestrator.getQueryAPI();
                const existingTask = queryAPI.getTaskByIdSync(taskId);
                if (existingTask) {
                    return existingTask;
                }
            }
            catch (error) {
                console.warn("Failed to get task from dataflow:", error);
            }
        }
        // Fallback to direct parser
        if (!taskParser) {
            taskParser = new MarkdownTaskParser(getConfig(plugin.settings.preferMetadataFormat, plugin));
        }
        const task = taskParser.parseTask(line, filePath, lineNum);
        // If we have a task and enhanced project is enabled, ensure the ID matches what Dataflow expects
        if (task &&
            plugin.dataflowOrchestrator &&
            ((_b = plugin.settings.projectConfig) === null || _b === void 0 ? void 0 : _b.enableEnhancedProject)) {
            // Ensure the task ID matches the format used by Dataflow
            task.id = `${filePath}-L${lineNum}`;
        }
        return task;
    }
    catch (error) {
        console.error("Error parsing task:", error);
        return null;
    }
};
/**
 * Task Gutter Extension
 */
export function taskGutterExtension(app, plugin) {
    // Create a regular expression to identify task lines
    return [
        gutter({
            class: "task-gutter",
            lineMarker(view, line) {
                const lineText = view.state.doc.lineAt(line.from).text;
                const lineNumber = view.state.doc.lineAt(line.from).number;
                // Skip if not a task
                if (!taskRegex.test(lineText))
                    return null;
                // Check if the line is in a codeblock or frontmatter
                const syntaxNode = syntaxTree(view.state).resolveInner(line.from + 1);
                const nodeProps = syntaxNode.type.prop(tokenClassNodeProp);
                if (nodeProps) {
                    const props = nodeProps.split(" ");
                    if (props.includes("hmd-codeblock") ||
                        props.includes("hmd-frontmatter")) {
                        return null;
                    }
                }
                return new TaskGutterMarker(lineText, lineNumber, view, app, plugin);
            },
        }),
    ];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3V0dGVyLW1hcmtlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImd1dHRlci1tYXJrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztHQUdHOztBQUdILE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFaEYsT0FBTyxFQUFPLFFBQVEsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUcvRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNwRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN4RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUM1RSxxRUFBcUU7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ3RFLE9BQU8sMEJBQTBCLENBQUM7QUFDbEMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBR3hELE1BQU0sU0FBUyxHQUFHLHdEQUF3RCxDQUFDO0FBRTNFLG1CQUFtQjtBQUNuQixNQUFNLGdCQUFpQixTQUFRLFlBQVk7SUFPMUMsWUFDQyxJQUFZLEVBQ1osT0FBZSxFQUNmLElBQWdCLEVBQ2hCLEdBQVEsRUFDUixNQUE2QjtRQUU3QixLQUFLLEVBQUUsQ0FBQztRQUNSLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO1FBQ2YsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDdEIsQ0FBQztJQUVELEtBQUs7UUFDSixNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakMsTUFBTSxNQUFNLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxRQUFRLENBQUM7YUFDL0MsT0FBTyxDQUFDLGdCQUFnQixDQUFDO2FBQ3pCLE9BQU8sQ0FBQyxHQUFHLEVBQUU7WUFDYixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDN0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFLENBQUM7WUFFaEQsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO2dCQUFFLE9BQU8sS0FBSyxDQUFDO1lBRXJELHFEQUFxRDtZQUNyRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNwRCxNQUFNLFVBQVUsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxZQUFZLENBQzFELElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUNiLENBQUM7WUFDRixNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBRTNELElBQUksU0FBUyxFQUFFO2dCQUNkLE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ25DLElBQ0MsS0FBSyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUM7b0JBQy9CLEtBQUssQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsRUFDaEM7b0JBQ0QsT0FBTyxLQUFLLENBQUM7aUJBQ2I7YUFDRDtZQUVELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQztZQUM5RCxNQUFNLElBQUksR0FBRyxlQUFlLENBQzNCLElBQUksQ0FBQyxNQUFNLEVBQ1gsSUFBSSxDQUFDLElBQUksRUFDVCxRQUFRLEVBQ1IsT0FBTyxHQUFHLENBQUMsQ0FDWCxDQUFDO1lBRUYsSUFBSSxJQUFJLEVBQUU7Z0JBQ1QsZUFBZSxDQUNkLElBQUksQ0FBQyxJQUFJLEVBQ1QsSUFBSSxDQUFDLEdBQUcsRUFDUixJQUFJLENBQUMsTUFBTSxFQUNYLElBQUksRUFDSixNQUFNLENBQUMsZUFBZSxDQUN0QixDQUFDO2dCQUNGLE9BQU8sSUFBSSxDQUFDO2FBQ1o7WUFFRCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUMsQ0FBQyxDQUFDO1FBRUosTUFBTSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDL0QsT0FBTyxNQUFNLENBQUMsZUFBZSxDQUFDO0lBQy9CLENBQUM7Q0FDRDtBQUVEOzs7R0FHRztBQUNILE1BQU0sZUFBZSxHQUFHLENBQ3ZCLElBQWdCLEVBQ2hCLEdBQVEsRUFDUixNQUE2QixFQUM3QixJQUFVLEVBQ1YsZUFBNEIsRUFDM0IsRUFBRTtJQUNILGdDQUFnQztJQUNoQyxNQUFNLGFBQWEsR0FBRyxDQUFPLFdBQWlCLEVBQUUsRUFBRTtRQUNqRCxJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUU7WUFDcEIsTUFBTSxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQztnQkFDaEMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxFQUFFO2dCQUN0QixPQUFPLEVBQUUsV0FBVzthQUNwQixDQUFDLENBQUM7U0FDSDtJQUNGLENBQUMsQ0FBQSxDQUFDO0lBRUYsSUFBSSxRQUFRLENBQUMsU0FBUyxFQUFFO1FBQ3ZCLHFDQUFxQztRQUNyQyxNQUFNLE9BQU8sR0FBRyxJQUFJLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDMUQsTUFBTSxJQUFJLEdBQUcsZUFBZSxDQUFDLHFCQUFxQixFQUFFLENBQUM7UUFDckQsT0FBTyxDQUFDLGNBQWMsQ0FBQztZQUN0QixDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDWixDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFO1NBQ25CLENBQUMsQ0FBQztLQUNIO1NBQU07UUFDTixrQ0FBa0M7UUFDbEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQztRQUNyRSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7S0FDYjtBQUNGLENBQUMsQ0FBQztBQUVGLHVCQUF1QjtBQUN2QixJQUFJLFVBQVUsR0FBOEIsSUFBSSxDQUFDO0FBRWpEOztHQUVHO0FBQ0gsTUFBTSxlQUFlLEdBQUcsQ0FDdkIsTUFBNkIsRUFDN0IsUUFBZ0IsRUFDaEIsSUFBWSxFQUNaLE9BQWUsRUFDRCxFQUFFOztJQUNoQixJQUFJO1FBQ0gsZ0RBQWdEO1FBQ2hELElBQ0MsTUFBTSxDQUFDLG9CQUFvQjthQUMzQixNQUFBLE1BQU0sQ0FBQyxRQUFRLENBQUMsYUFBYSwwQ0FBRSxxQkFBcUIsQ0FBQSxFQUNuRDtZQUNELElBQUk7Z0JBQ0gsbURBQW1EO2dCQUNuRCxNQUFNLE1BQU0sR0FBRyxHQUFHLFFBQVEsS0FBSyxPQUFPLEVBQUUsQ0FBQztnQkFDekMsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUMzRCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUN0RCxJQUFJLFlBQVksRUFBRTtvQkFDakIsT0FBTyxZQUFZLENBQUM7aUJBQ3BCO2FBQ0Q7WUFBQyxPQUFPLEtBQUssRUFBRTtnQkFDZixPQUFPLENBQUMsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLEtBQUssQ0FBQyxDQUFDO2FBQ3pEO1NBQ0Q7UUFFRCw0QkFBNEI7UUFDNUIsSUFBSSxDQUFDLFVBQVUsRUFBRTtZQUNoQixVQUFVLEdBQUcsSUFBSSxrQkFBa0IsQ0FDbEMsU0FBUyxDQUNSLE1BQU0sQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQ3BDLE1BQU0sQ0FDYyxDQUNyQixDQUFDO1NBQ0Y7UUFFRCxNQUFNLElBQUksR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFM0QsaUdBQWlHO1FBQ2pHLElBQ0MsSUFBSTtZQUNKLE1BQU0sQ0FBQyxvQkFBb0I7YUFDM0IsTUFBQSxNQUFNLENBQUMsUUFBUSxDQUFDLGFBQWEsMENBQUUscUJBQXFCLENBQUEsRUFDbkQ7WUFDRCx5REFBeUQ7WUFDekQsSUFBSSxDQUFDLEVBQUUsR0FBRyxHQUFHLFFBQVEsS0FBSyxPQUFPLEVBQUUsQ0FBQztTQUNwQztRQUVELE9BQU8sSUFBSSxDQUFDO0tBQ1o7SUFBQyxPQUFPLEtBQUssRUFBRTtRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMscUJBQXFCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDNUMsT0FBTyxJQUFJLENBQUM7S0FDWjtBQUNGLENBQUMsQ0FBQztBQUVGOztHQUVHO0FBQ0gsTUFBTSxVQUFVLG1CQUFtQixDQUNsQyxHQUFRLEVBQ1IsTUFBNkI7SUFFN0IscURBQXFEO0lBRXJELE9BQU87UUFDTixNQUFNLENBQUM7WUFDTixLQUFLLEVBQUUsYUFBYTtZQUNwQixVQUFVLENBQUMsSUFBSSxFQUFFLElBQUk7Z0JBQ3BCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUN2RCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQztnQkFFM0QscUJBQXFCO2dCQUNyQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7b0JBQUUsT0FBTyxJQUFJLENBQUM7Z0JBRTNDLHFEQUFxRDtnQkFDckQsTUFBTSxVQUFVLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxZQUFZLENBQ3JELElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUNiLENBQUM7Z0JBQ0YsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztnQkFFM0QsSUFBSSxTQUFTLEVBQUU7b0JBQ2QsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDbkMsSUFDQyxLQUFLLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQzt3QkFDL0IsS0FBSyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxFQUNoQzt3QkFDRCxPQUFPLElBQUksQ0FBQztxQkFDWjtpQkFDRDtnQkFFRCxPQUFPLElBQUksZ0JBQWdCLENBQzFCLFFBQVEsRUFDUixVQUFVLEVBQ1YsSUFBSSxFQUNKLEdBQUcsRUFDSCxNQUFNLENBQ04sQ0FBQztZQUNILENBQUM7U0FDRCxDQUFDO0tBQ0YsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogVGFzayBHdXR0ZXIgSGFuZGxlciAtIEhhbmRsZXMgaW50ZXJhY3Rpb24gZm9yIHRhc2sgbWFya2VycyBpbiB0aGUgZ3V0dGVyLlxyXG4gKiBEaXNwbGF5cyBhIG1hcmtlciBpbiBmcm9udCBvZiB0YXNrIGxpbmVzOyBjbGlja2luZyBpdCBzaG93cyB0YXNrIGRldGFpbHMuXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgRWRpdG9yVmlldyB9IGZyb20gXCJAY29kZW1pcnJvci92aWV3XCI7XHJcbmltcG9ydCB7IGd1dHRlciwgR3V0dGVyTWFya2VyIH0gZnJvbSBcIkAvZWRpdG9yLWV4dGVuc2lvbnMvY29yZS9leHRlbmRlZC1ndXR0ZXJcIjtcclxuaW1wb3J0IHsgRXh0ZW5zaW9uIH0gZnJvbSBcIkBjb2RlbWlycm9yL3N0YXRlXCI7XHJcbmltcG9ydCB7IEFwcCwgUGxhdGZvcm0sIEV4dHJhQnV0dG9uQ29tcG9uZW50IH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiQC90eXBlcy90YXNrXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjtcclxuaW1wb3J0IHsgVGFza0RldGFpbHNNb2RhbCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay9lZGl0L1Rhc2tEZXRhaWxzTW9kYWxcIjtcclxuaW1wb3J0IHsgVGFza0RldGFpbHNQb3BvdmVyIH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy90YXNrL2VkaXQvVGFza0RldGFpbHNQb3BvdmVyXCI7XHJcbmltcG9ydCB7IE1hcmtkb3duVGFza1BhcnNlciB9IGZyb20gXCJAL2RhdGFmbG93L2NvcmUvQ29uZmlndXJhYmxlVGFza1BhcnNlclwiO1xyXG4vLyBAdHMtaWdub3JlIC0gVGhpcyBpbXBvcnQgaXMgbmVjZXNzYXJ5IGJ1dCBUeXBlU2NyaXB0IGNhbid0IGZpbmQgaXRcclxuaW1wb3J0IHsgc3ludGF4VHJlZSwgdG9rZW5DbGFzc05vZGVQcm9wIH0gZnJvbSBcIkBjb2RlbWlycm9yL2xhbmd1YWdlXCI7XHJcbmltcG9ydCBcIkAvc3R5bGVzL3Rhc2stZ3V0dGVyLmNzc1wiO1xyXG5pbXBvcnQgeyBnZXRDb25maWcgfSBmcm9tIFwiQC9jb21tb24vdGFzay1wYXJzZXItY29uZmlnXCI7XHJcbmltcG9ydCB7IFRhc2tQYXJzZXJDb25maWcgfSBmcm9tIFwiQC90eXBlcy9UYXNrUGFyc2VyQ29uZmlnXCI7XHJcblxyXG5jb25zdCB0YXNrUmVnZXggPSAvXigoW1xccz5dKik/KC18XFxkK1xcLnxcXCp8XFwrKVxcc1xcWyhbXlxcW1xcXV17MX0pXFxdKVxccysoLiopJC9tO1xyXG5cclxuLy8gVGFzayBpY29uIG1hcmtlclxyXG5jbGFzcyBUYXNrR3V0dGVyTWFya2VyIGV4dGVuZHMgR3V0dGVyTWFya2VyIHtcclxuXHR0ZXh0OiBzdHJpbmc7XHJcblx0bGluZU51bTogbnVtYmVyO1xyXG5cdHZpZXc6IEVkaXRvclZpZXc7XHJcblx0YXBwOiBBcHA7XHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0dGV4dDogc3RyaW5nLFxyXG5cdFx0bGluZU51bTogbnVtYmVyLFxyXG5cdFx0dmlldzogRWRpdG9yVmlldyxcclxuXHRcdGFwcDogQXBwLFxyXG5cdFx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW5cclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLnRleHQgPSB0ZXh0O1xyXG5cdFx0dGhpcy5saW5lTnVtID0gbGluZU51bTtcclxuXHRcdHRoaXMudmlldyA9IHZpZXc7XHJcblx0XHR0aGlzLmFwcCA9IGFwcDtcclxuXHRcdHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG5cdH1cclxuXHJcblx0dG9ET00oKSB7XHJcblx0XHRjb25zdCBtYXJrZXJFbCA9IGNyZWF0ZUVsKFwiZGl2XCIpO1xyXG5cdFx0Y29uc3QgYnV0dG9uID0gbmV3IEV4dHJhQnV0dG9uQ29tcG9uZW50KG1hcmtlckVsKVxyXG5cdFx0XHQuc2V0SWNvbihcImNhbGVuZGFyLWNoZWNrXCIpXHJcblx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRjb25zdCBsaW5lVGV4dCA9IHRoaXMudmlldy5zdGF0ZS5kb2MubGluZSh0aGlzLmxpbmVOdW0pLnRleHQ7XHJcblx0XHRcdFx0Y29uc3QgZmlsZSA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVGaWxlKCk7XHJcblxyXG5cdFx0XHRcdGlmICghZmlsZSB8fCAhdGFza1JlZ2V4LnRlc3QobGluZVRleHQpKSByZXR1cm4gZmFsc2U7XHJcblxyXG5cdFx0XHRcdC8vIENoZWNrIGlmIHRoZSBsaW5lIGlzIGluIGEgY29kZWJsb2NrIG9yIGZyb250bWF0dGVyXHJcblx0XHRcdFx0Y29uc3QgbGluZSA9IHRoaXMudmlldy5zdGF0ZS5kb2MubGluZSh0aGlzLmxpbmVOdW0pO1xyXG5cdFx0XHRcdGNvbnN0IHN5bnRheE5vZGUgPSBzeW50YXhUcmVlKHRoaXMudmlldy5zdGF0ZSkucmVzb2x2ZUlubmVyKFxyXG5cdFx0XHRcdFx0bGluZS5mcm9tICsgMVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0Y29uc3Qgbm9kZVByb3BzID0gc3ludGF4Tm9kZS50eXBlLnByb3AodG9rZW5DbGFzc05vZGVQcm9wKTtcclxuXHJcblx0XHRcdFx0aWYgKG5vZGVQcm9wcykge1xyXG5cdFx0XHRcdFx0Y29uc3QgcHJvcHMgPSBub2RlUHJvcHMuc3BsaXQoXCIgXCIpO1xyXG5cdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRwcm9wcy5pbmNsdWRlcyhcImhtZC1jb2RlYmxvY2tcIikgfHxcclxuXHRcdFx0XHRcdFx0cHJvcHMuaW5jbHVkZXMoXCJobWQtZnJvbnRtYXR0ZXJcIilcclxuXHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRjb25zdCBsaW5lTnVtID0gdGhpcy52aWV3LnN0YXRlLmRvYy5saW5lKHRoaXMubGluZU51bSkubnVtYmVyO1xyXG5cdFx0XHRcdGNvbnN0IHRhc2sgPSBnZXRUYXNrRnJvbUxpbmUoXHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0XHRcdGZpbGUucGF0aCxcclxuXHRcdFx0XHRcdGxpbmVUZXh0LFxyXG5cdFx0XHRcdFx0bGluZU51bSAtIDFcclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRpZiAodGFzaykge1xyXG5cdFx0XHRcdFx0c2hvd1Rhc2tEZXRhaWxzKFxyXG5cdFx0XHRcdFx0XHR0aGlzLnZpZXcsXHJcblx0XHRcdFx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHRcdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0XHRcdFx0dGFzayxcclxuXHRcdFx0XHRcdFx0YnV0dG9uLmV4dHJhU2V0dGluZ3NFbFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRidXR0b24uZXh0cmFTZXR0aW5nc0VsLnRvZ2dsZUNsYXNzKFwidGFzay1ndXR0ZXItbWFya2VyXCIsIHRydWUpO1xyXG5cdFx0cmV0dXJuIGJ1dHRvbi5leHRyYVNldHRpbmdzRWw7XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICogU2hvd3MgdGFzayBkZXRhaWxzLlxyXG4gKiBEZWNpZGVzIHdoZXRoZXIgdG8gc2hvdyBhIFBvcG92ZXIgb3IgYSBNb2RhbCBiYXNlZCBvbiB0aGUgcGxhdGZvcm0gdHlwZS5cclxuICovXHJcbmNvbnN0IHNob3dUYXNrRGV0YWlscyA9IChcclxuXHR2aWV3OiBFZGl0b3JWaWV3LFxyXG5cdGFwcDogQXBwLFxyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdHRhc2s6IFRhc2ssXHJcblx0ZXh0cmFTZXR0aW5nc0VsOiBIVE1MRWxlbWVudFxyXG4pID0+IHtcclxuXHQvLyBUYXNrIHVwZGF0ZSBjYWxsYmFjayBmdW5jdGlvblxyXG5cdGNvbnN0IG9uVGFza1VwZGF0ZWQgPSBhc3luYyAodXBkYXRlZFRhc2s6IFRhc2spID0+IHtcclxuXHRcdGlmIChwbHVnaW4ud3JpdGVBUEkpIHtcclxuXHRcdFx0YXdhaXQgcGx1Z2luLndyaXRlQVBJLnVwZGF0ZVRhc2soe1xyXG5cdFx0XHRcdHRhc2tJZDogdXBkYXRlZFRhc2suaWQsXHJcblx0XHRcdFx0dXBkYXRlczogdXBkYXRlZFRhc2ssXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdGlmIChQbGF0Zm9ybS5pc0Rlc2t0b3ApIHtcclxuXHRcdC8vIERlc2t0b3AgZW52aXJvbm1lbnQgLSBzaG93IFBvcG92ZXJcclxuXHRcdGNvbnN0IHBvcG92ZXIgPSBuZXcgVGFza0RldGFpbHNQb3BvdmVyKGFwcCwgcGx1Z2luLCB0YXNrKTtcclxuXHRcdGNvbnN0IHJlY3QgPSBleHRyYVNldHRpbmdzRWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcblx0XHRwb3BvdmVyLnNob3dBdFBvc2l0aW9uKHtcclxuXHRcdFx0eDogcmVjdC5sZWZ0LFxyXG5cdFx0XHR5OiByZWN0LmJvdHRvbSArIDEwLFxyXG5cdFx0fSk7XHJcblx0fSBlbHNlIHtcclxuXHRcdC8vIE1vYmlsZSBlbnZpcm9ubWVudCAtIHNob3cgTW9kYWxcclxuXHRcdGNvbnN0IG1vZGFsID0gbmV3IFRhc2tEZXRhaWxzTW9kYWwoYXBwLCBwbHVnaW4sIHRhc2ssIG9uVGFza1VwZGF0ZWQpO1xyXG5cdFx0bW9kYWwub3BlbigpO1xyXG5cdH1cclxufTtcclxuXHJcbi8vIFRhc2sgcGFyc2VyIGluc3RhbmNlXHJcbmxldCB0YXNrUGFyc2VyOiBNYXJrZG93blRhc2tQYXJzZXIgfCBudWxsID0gbnVsbDtcclxuXHJcbi8qKlxyXG4gKiBQYXJzZXMgYSB0YXNrIGZyb20gdGhlIGxpbmUgY29udGVudC5cclxuICovXHJcbmNvbnN0IGdldFRhc2tGcm9tTGluZSA9IChcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRmaWxlUGF0aDogc3RyaW5nLFxyXG5cdGxpbmU6IHN0cmluZyxcclxuXHRsaW5lTnVtOiBudW1iZXJcclxuKTogVGFzayB8IG51bGwgPT4ge1xyXG5cdHRyeSB7XHJcblx0XHQvLyBUcnkgdG8gZ2V0IHRoZSB0YXNrIGZyb20gZGF0YWZsb3cgaW5kZXggZmlyc3RcclxuXHRcdGlmIChcclxuXHRcdFx0cGx1Z2luLmRhdGFmbG93T3JjaGVzdHJhdG9yICYmXHJcblx0XHRcdHBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnPy5lbmFibGVFbmhhbmNlZFByb2plY3RcclxuXHRcdCkge1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdC8vIFRyeSB0byBmaW5kIHRoZSB0YXNrIGJ5IElEIGluIHRoZSBleGlzdGluZyBpbmRleFxyXG5cdFx0XHRcdGNvbnN0IHRhc2tJZCA9IGAke2ZpbGVQYXRofS1MJHtsaW5lTnVtfWA7XHJcblx0XHRcdFx0Y29uc3QgcXVlcnlBUEkgPSBwbHVnaW4uZGF0YWZsb3dPcmNoZXN0cmF0b3IuZ2V0UXVlcnlBUEkoKTtcclxuXHRcdFx0XHRjb25zdCBleGlzdGluZ1Rhc2sgPSBxdWVyeUFQSS5nZXRUYXNrQnlJZFN5bmModGFza0lkKTtcclxuXHRcdFx0XHRpZiAoZXhpc3RpbmdUYXNrKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gZXhpc3RpbmdUYXNrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXCJGYWlsZWQgdG8gZ2V0IHRhc2sgZnJvbSBkYXRhZmxvdzpcIiwgZXJyb3IpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRmFsbGJhY2sgdG8gZGlyZWN0IHBhcnNlclxyXG5cdFx0aWYgKCF0YXNrUGFyc2VyKSB7XHJcblx0XHRcdHRhc2tQYXJzZXIgPSBuZXcgTWFya2Rvd25UYXNrUGFyc2VyKFxyXG5cdFx0XHRcdGdldENvbmZpZyhcclxuXHRcdFx0XHRcdHBsdWdpbi5zZXR0aW5ncy5wcmVmZXJNZXRhZGF0YUZvcm1hdCxcclxuXHRcdFx0XHRcdHBsdWdpblxyXG5cdFx0XHRcdCkgYXMgVGFza1BhcnNlckNvbmZpZ1xyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHRhc2sgPSB0YXNrUGFyc2VyLnBhcnNlVGFzayhsaW5lLCBmaWxlUGF0aCwgbGluZU51bSk7XHJcblxyXG5cdFx0Ly8gSWYgd2UgaGF2ZSBhIHRhc2sgYW5kIGVuaGFuY2VkIHByb2plY3QgaXMgZW5hYmxlZCwgZW5zdXJlIHRoZSBJRCBtYXRjaGVzIHdoYXQgRGF0YWZsb3cgZXhwZWN0c1xyXG5cdFx0aWYgKFxyXG5cdFx0XHR0YXNrICYmXHJcblx0XHRcdHBsdWdpbi5kYXRhZmxvd09yY2hlc3RyYXRvciAmJlxyXG5cdFx0XHRwbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZz8uZW5hYmxlRW5oYW5jZWRQcm9qZWN0XHJcblx0XHQpIHtcclxuXHRcdFx0Ly8gRW5zdXJlIHRoZSB0YXNrIElEIG1hdGNoZXMgdGhlIGZvcm1hdCB1c2VkIGJ5IERhdGFmbG93XHJcblx0XHRcdHRhc2suaWQgPSBgJHtmaWxlUGF0aH0tTCR7bGluZU51bX1gO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0YXNrO1xyXG5cdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRjb25zb2xlLmVycm9yKFwiRXJyb3IgcGFyc2luZyB0YXNrOlwiLCBlcnJvcik7XHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XHJcbn07XHJcblxyXG4vKipcclxuICogVGFzayBHdXR0ZXIgRXh0ZW5zaW9uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gdGFza0d1dHRlckV4dGVuc2lvbihcclxuXHRhcHA6IEFwcCxcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpblxyXG4pOiBFeHRlbnNpb24ge1xyXG5cdC8vIENyZWF0ZSBhIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byBpZGVudGlmeSB0YXNrIGxpbmVzXHJcblxyXG5cdHJldHVybiBbXHJcblx0XHRndXR0ZXIoe1xyXG5cdFx0XHRjbGFzczogXCJ0YXNrLWd1dHRlclwiLFxyXG5cdFx0XHRsaW5lTWFya2VyKHZpZXcsIGxpbmUpIHtcclxuXHRcdFx0XHRjb25zdCBsaW5lVGV4dCA9IHZpZXcuc3RhdGUuZG9jLmxpbmVBdChsaW5lLmZyb20pLnRleHQ7XHJcblx0XHRcdFx0Y29uc3QgbGluZU51bWJlciA9IHZpZXcuc3RhdGUuZG9jLmxpbmVBdChsaW5lLmZyb20pLm51bWJlcjtcclxuXHJcblx0XHRcdFx0Ly8gU2tpcCBpZiBub3QgYSB0YXNrXHJcblx0XHRcdFx0aWYgKCF0YXNrUmVnZXgudGVzdChsaW5lVGV4dCkpIHJldHVybiBudWxsO1xyXG5cclxuXHRcdFx0XHQvLyBDaGVjayBpZiB0aGUgbGluZSBpcyBpbiBhIGNvZGVibG9jayBvciBmcm9udG1hdHRlclxyXG5cdFx0XHRcdGNvbnN0IHN5bnRheE5vZGUgPSBzeW50YXhUcmVlKHZpZXcuc3RhdGUpLnJlc29sdmVJbm5lcihcclxuXHRcdFx0XHRcdGxpbmUuZnJvbSArIDFcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGNvbnN0IG5vZGVQcm9wcyA9IHN5bnRheE5vZGUudHlwZS5wcm9wKHRva2VuQ2xhc3NOb2RlUHJvcCk7XHJcblxyXG5cdFx0XHRcdGlmIChub2RlUHJvcHMpIHtcclxuXHRcdFx0XHRcdGNvbnN0IHByb3BzID0gbm9kZVByb3BzLnNwbGl0KFwiIFwiKTtcclxuXHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0cHJvcHMuaW5jbHVkZXMoXCJobWQtY29kZWJsb2NrXCIpIHx8XHJcblx0XHRcdFx0XHRcdHByb3BzLmluY2x1ZGVzKFwiaG1kLWZyb250bWF0dGVyXCIpXHJcblx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRyZXR1cm4gbmV3IFRhc2tHdXR0ZXJNYXJrZXIoXHJcblx0XHRcdFx0XHRsaW5lVGV4dCxcclxuXHRcdFx0XHRcdGxpbmVOdW1iZXIsXHJcblx0XHRcdFx0XHR2aWV3LFxyXG5cdFx0XHRcdFx0YXBwLFxyXG5cdFx0XHRcdFx0cGx1Z2luXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fSxcclxuXHRcdH0pLFxyXG5cdF07XHJcbn1cclxuIl19