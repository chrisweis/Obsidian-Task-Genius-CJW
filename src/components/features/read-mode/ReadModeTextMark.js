import { Component, debounce, TFile, } from "obsidian";
import { getTasksAPI } from "@/utils";
import { parseTaskLine } from '@/utils/task/task-operations';
// This component replaces standard checkboxes with custom text marks in reading view
export function applyTaskTextMarks({ plugin, element, ctx, }) {
    // Find all task list items in the element - handle both ul and ol lists
    const taskItems = element.findAll(".task-list-item");
    // Track processed task items to avoid duplicates
    const processedItems = new Set();
    for (const taskItem of taskItems) {
        // Skip if this task item already has our custom mark
        if (taskItem.querySelector(".task-text-mark") ||
            processedItems.has(taskItem)) {
            continue;
        }
        // Mark this item as processed
        processedItems.add(taskItem);
        // Get the original checkbox
        const checkbox = taskItem.querySelector(".task-list-item-checkbox");
        if (!checkbox)
            continue;
        // Get the current task mark
        const dataTask = taskItem.getAttribute("data-task") || " ";
        // Create our custom text mark component
        new TaskTextMark(plugin, taskItem, checkbox, dataTask, ctx).load();
    }
}
class TaskTextMark extends Component {
    constructor(plugin, taskItem, originalCheckbox, currentMark, ctx) {
        super();
        this.plugin = plugin;
        this.taskItem = taskItem;
        this.originalCheckbox = originalCheckbox;
        this.currentMark = currentMark;
        this.ctx = ctx;
        this.debounceCycleTaskStatus = debounce(() => {
            this.cycleTaskStatus();
        }, 200);
    }
    load() {
        var _a, _b, _c, _d;
        if ((_b = (_a = this.ctx) === null || _a === void 0 ? void 0 : _a.el) === null || _b === void 0 ? void 0 : _b.hasClass("planner-sticky-block-content")) {
            return;
        }
        if (this.plugin.settings.enableCustomTaskMarks) {
            // Create container for custom task mark
            this.markContainerEl = createEl("span", {
                cls: "task-state-container",
                attr: { "data-task-state": this.currentMark },
            });
            // Create bullet element
            this.bulletEl = this.markContainerEl.createEl("span", {
                cls: "task-fake-bullet",
            });
            // Create custom mark element
            this.markEl = this.markContainerEl.createEl("span", {
                cls: "task-state",
                attr: { "data-task-state": this.currentMark },
            });
            // Apply styling based on current status
            this.styleMarkByStatus();
            // Insert custom mark after the checkbox
            (_c = this.originalCheckbox.parentElement) === null || _c === void 0 ? void 0 : _c.insertBefore(this.markContainerEl, this.originalCheckbox.nextSibling);
            // Register click handler for status cycling
            this.registerDomEvent(this.markEl, "click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.debounceCycleTaskStatus();
            });
        }
        else {
            // When custom marks are disabled, clone the checkbox for interaction
            const newCheckbox = this.originalCheckbox.cloneNode(true);
            // Insert cloned checkbox
            (_d = this.originalCheckbox.parentElement) === null || _d === void 0 ? void 0 : _d.insertBefore(newCheckbox, this.originalCheckbox.nextSibling);
            // Register click handler on the cloned checkbox
            this.registerDomEvent(newCheckbox, "click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.debounceCycleTaskStatus();
            });
        }
        // Hide the original checkbox in both cases
        this.originalCheckbox.hide();
        return this;
    }
    styleMarkByStatus() {
        // Clear any previous content
        this.markEl.empty();
        // Get current mark's status type
        const status = this.getTaskStatusFromMark(this.currentMark);
        if (status) {
            this.markEl.setText(status);
        }
        else {
            this.markEl.setText(this.currentMark);
        }
    }
    triggerMarkUpdate(nextMark) {
        if (this.plugin.settings.enableCustomTaskMarks) {
            this.taskItem.setAttribute("data-task", nextMark);
            this.markEl.setAttribute("data-task-state", nextMark);
            this.styleMarkByStatus();
        }
    }
    cycleTaskStatus() {
        var _a;
        // Get the section info to locate the task in the file
        const sectionInfo = this.ctx.getSectionInfo(this.taskItem);
        const file = this.ctx.sourcePath
            ? this.plugin.app.vault.getFileByPath(this.ctx.sourcePath)
            : null;
        if (!file || !(file instanceof TFile))
            return;
        let calloutInfo = null;
        if (!sectionInfo) {
            // Check if containerEl exists and has cmView (for callouts)
            // @ts-ignore - TypeScript doesn't know about containerEl and cmView properties
            if ((_a = this.ctx.containerEl) === null || _a === void 0 ? void 0 : _a.cmView) {
                // @ts-ignore - Accessing dynamic properties
                const cmView = this.ctx.containerEl.cmView;
                // Check if this is a callout
                if (cmView.widget.clazz === "cm-callout") {
                    calloutInfo = {
                        lineStart: 0,
                        start: cmView.widget.start,
                        end: cmView.widget.end,
                        text: cmView.widget.text,
                    };
                }
            }
            // If we couldn't get callout info either, we can't proceed
            if (!calloutInfo)
                return;
        }
        // Get cycle configuration from plugin settings
        const cycle = this.plugin.settings.taskStatusCycle || [];
        const marks = this.plugin.settings.taskStatusMarks || {};
        const excludeMarksFromCycle = this.plugin.settings.excludeMarksFromCycle || [];
        // Filter out excluded marks
        const remainingCycle = cycle.filter((state) => !excludeMarksFromCycle.includes(state));
        if (remainingCycle.length === 0)
            return;
        // Find current state in cycle
        let currentState = Object.keys(marks).find((state) => marks[state] === this.currentMark) || remainingCycle[0];
        // Find next state in cycle
        const currentIndex = remainingCycle.indexOf(currentState);
        const nextIndex = (currentIndex + 1) % remainingCycle.length;
        const nextState = remainingCycle[nextIndex];
        const nextMark = marks[nextState] || " ";
        // Check if next state is DONE and Tasks plugin is available
        const tasksApi = getTasksAPI(this.plugin);
        const isDoneState = nextState === "DONE" && tasksApi;
        const isCurrentDone = currentState === "DONE";
        // Update the underlying file using the process method for atomic operations
        this.plugin.app.vault.process(file, (content) => {
            var _a;
            const lines = content.split("\n");
            let actualLineIndex;
            let taskLine;
            if (sectionInfo) {
                // Standard method using sectionInfo
                // Get the relative line number from the taskItem's data-line attribute
                const dataLine = parseInt(this.taskItem.getAttribute("data-line") || "0");
                // Calculate the actual line in the file by adding the relative line to section start
                actualLineIndex = sectionInfo.lineStart + dataLine;
                taskLine = lines[actualLineIndex];
            }
            else if (calloutInfo) {
                // Get the line number from the task item's data-line attribute
                const dataLine = parseInt(((_a = this.taskItem
                    .querySelector("input")) === null || _a === void 0 ? void 0 : _a.getAttribute("data-line")) || "0");
                // Calculate actual line number by adding data-line to lines before callout
                const contentBeforeCallout = content.substring(0, calloutInfo.start);
                const linesBefore = contentBeforeCallout.split("\n").length - 1;
                actualLineIndex = linesBefore + dataLine;
                taskLine = lines[actualLineIndex];
            }
            else {
                return content; // Can't proceed without location info
            }
            if (isDoneState) {
                // Use Tasks API to toggle the task
                const updatedContent = tasksApi.executeToggleTaskDoneCommand(taskLine, file.path);
                // Handle potential multi-line result (recurring tasks might create new lines)
                const updatedLines = updatedContent.split("\n");
                if (updatedLines.length === 1) {
                    // Simple replacement
                    lines[actualLineIndex] = updatedContent;
                }
                else {
                    // Handle multi-line result (like recurring tasks)
                    lines.splice(actualLineIndex, 1, ...updatedLines);
                }
                // Update the UI immediately
                this.currentMark = nextMark;
                this.triggerMarkUpdate(nextMark);
                this.originalCheckbox.checked = true;
            }
            else {
                // Use the original logic for other status changes
                let updatedLine = taskLine;
                if (isCurrentDone) {
                    // Remove completion date if switching from DONE state
                    updatedLine = updatedLine.replace(/\s+✅\s+\d{4}-\d{2}-\d{2}/, "");
                }
                updatedLine = updatedLine.replace(/(\s*[-*+]\s*\[)(.)(])/, `$1${nextMark}$3`);
                if (updatedLine !== taskLine) {
                    lines[actualLineIndex] = updatedLine;
                    // Update the UI immediately without waiting for file change event
                    this.currentMark = nextMark;
                    this.triggerMarkUpdate(nextMark);
                    // Update the original checkbox checked state if appropriate
                    const completedMarks = this.plugin.settings.taskStatuses.completed.split("|");
                    this.originalCheckbox.checked =
                        completedMarks.includes(nextMark);
                }
            }
            if (nextMark === "x" || nextMark === "X") {
                const task = parseTaskLine(file.path, taskLine, actualLineIndex, this.plugin.settings.preferMetadataFormat, this.plugin // Pass plugin for configurable prefix support
                );
                task &&
                    this.plugin.app.workspace.trigger("task-genius:task-completed", task);
            }
            return lines.join("\n");
        });
    }
    getTaskStatusFromMark(mark) {
        const cycle = this.plugin.settings.taskStatusCycle;
        const marks = this.plugin.settings.taskStatusMarks;
        const excludeMarksFromCycle = this.plugin.settings.excludeMarksFromCycle || [];
        const remainingCycle = cycle.filter((state) => !excludeMarksFromCycle.includes(state));
        if (remainingCycle.length === 0)
            return null;
        let currentState = Object.keys(marks).find((state) => marks[state] === mark) ||
            remainingCycle[0];
        return currentState;
    }
    unload() {
        // Remove our mark and restore original checkbox
        if (this.markEl) {
            this.markEl.remove();
        }
        // Remove the bullet element if it exists
        if (this.bulletEl) {
            this.bulletEl.remove();
        }
        // Show the original checkbox again
        if (this.originalCheckbox) {
            this.originalCheckbox.style.display = "";
        }
        super.unload();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmVhZE1vZGVUZXh0TWFyay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlJlYWRNb2RlVGV4dE1hcmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUNOLFNBQVMsRUFDVCxRQUFRLEVBR1IsS0FBSyxHQUNMLE1BQU0sVUFBVSxDQUFDO0FBQ2xCLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFDdEMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRTdELHFGQUFxRjtBQUNyRixNQUFNLFVBQVUsa0JBQWtCLENBQUMsRUFDbEMsTUFBTSxFQUNOLE9BQU8sRUFDUCxHQUFHLEdBS0g7SUFDQSx3RUFBd0U7SUFDeEUsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBRXJELGlEQUFpRDtJQUNqRCxNQUFNLGNBQWMsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO0lBRWpDLEtBQUssTUFBTSxRQUFRLElBQUksU0FBUyxFQUFFO1FBQ2pDLHFEQUFxRDtRQUNyRCxJQUNDLFFBQVEsQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUM7WUFDekMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFDM0I7WUFDRCxTQUFTO1NBQ1Q7UUFFRCw4QkFBOEI7UUFDOUIsY0FBYyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUU3Qiw0QkFBNEI7UUFDNUIsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FDdEMsMEJBQTBCLENBQ04sQ0FBQztRQUV0QixJQUFJLENBQUMsUUFBUTtZQUFFLFNBQVM7UUFFeEIsNEJBQTRCO1FBQzVCLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLElBQUksR0FBRyxDQUFDO1FBRTNELHdDQUF3QztRQUN4QyxJQUFJLFlBQVksQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7S0FDbkU7QUFDRixDQUFDO0FBRUQsTUFBTSxZQUFhLFNBQVEsU0FBUztJQUtuQyxZQUNTLE1BQTZCLEVBQzdCLFFBQXFCLEVBQ3JCLGdCQUFrQyxFQUNsQyxXQUFtQixFQUNuQixHQUFpQztRQUV6QyxLQUFLLEVBQUUsQ0FBQztRQU5BLFdBQU0sR0FBTixNQUFNLENBQXVCO1FBQzdCLGFBQVEsR0FBUixRQUFRLENBQWE7UUFDckIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUNsQyxnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUNuQixRQUFHLEdBQUgsR0FBRyxDQUE4QjtRQW1GMUMsNEJBQXVCLEdBQUcsUUFBUSxDQUFDLEdBQUcsRUFBRTtZQUN2QyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDeEIsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBbEZSLENBQUM7SUFFRCxJQUFJOztRQUNILElBQUksTUFBQSxNQUFDLElBQUksQ0FBQyxHQUFXLDBDQUFFLEVBQUUsMENBQUUsUUFBUSxDQUFDLDhCQUE4QixDQUFDLEVBQUU7WUFDcEUsT0FBTztTQUNQO1FBRUQsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRTtZQUMvQyx3Q0FBd0M7WUFDeEMsSUFBSSxDQUFDLGVBQWUsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFO2dCQUN2QyxHQUFHLEVBQUUsc0JBQXNCO2dCQUMzQixJQUFJLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFO2FBQzdDLENBQUMsQ0FBQztZQUVILHdCQUF3QjtZQUN4QixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRTtnQkFDckQsR0FBRyxFQUFFLGtCQUFrQjthQUN2QixDQUFDLENBQUM7WUFFSCw2QkFBNkI7WUFDN0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUU7Z0JBQ25ELEdBQUcsRUFBRSxZQUFZO2dCQUNqQixJQUFJLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFO2FBQzdDLENBQUMsQ0FBQztZQUVILHdDQUF3QztZQUN4QyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUV6Qix3Q0FBd0M7WUFDeEMsTUFBQSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsYUFBYSwwQ0FBRSxZQUFZLENBQ2hELElBQUksQ0FBQyxlQUFlLEVBQ3BCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQ2pDLENBQUM7WUFFRiw0Q0FBNEM7WUFDNUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQ2pELENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDbkIsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUNwQixJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUNoQyxDQUFDLENBQUMsQ0FBQztTQUNIO2FBQU07WUFDTixxRUFBcUU7WUFDckUsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FDbEQsSUFBSSxDQUNnQixDQUFDO1lBRXRCLHlCQUF5QjtZQUN6QixNQUFBLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLDBDQUFFLFlBQVksQ0FDaEQsV0FBVyxFQUNYLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQ2pDLENBQUM7WUFFRixnREFBZ0Q7WUFDaEQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDakQsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUNuQixDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ3BCLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1lBQ2hDLENBQUMsQ0FBQyxDQUFDO1NBQ0g7UUFFRCwyQ0FBMkM7UUFDM0MsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDO1FBRTdCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELGlCQUFpQjtRQUNoQiw2QkFBNkI7UUFDN0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUVwQixpQ0FBaUM7UUFDakMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUU1RCxJQUFJLE1BQU0sRUFBRTtZQUNYLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQzVCO2FBQU07WUFDTixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7U0FDdEM7SUFDRixDQUFDO0lBTUQsaUJBQWlCLENBQUMsUUFBZ0I7UUFDakMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRTtZQUMvQyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDbEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDdEQsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7U0FDekI7SUFDRixDQUFDO0lBRUQsZUFBZTs7UUFDZCxzREFBc0Q7UUFDdEQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTNELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVTtZQUMvQixDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQztZQUMxRCxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ1IsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxZQUFZLEtBQUssQ0FBQztZQUFFLE9BQU87UUFTOUMsSUFBSSxXQUFXLEdBQXVCLElBQUksQ0FBQztRQUMzQyxJQUFJLENBQUMsV0FBVyxFQUFFO1lBQ2pCLDREQUE0RDtZQUM1RCwrRUFBK0U7WUFDL0UsSUFBSSxNQUFBLElBQUksQ0FBQyxHQUFHLENBQUMsV0FBVywwQ0FBRSxNQUFNLEVBQUU7Z0JBQ2pDLDRDQUE0QztnQkFDNUMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDO2dCQUMzQyw2QkFBNkI7Z0JBQzdCLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEtBQUssWUFBWSxFQUFFO29CQUN6QyxXQUFXLEdBQUc7d0JBQ2IsU0FBUyxFQUFFLENBQUM7d0JBQ1osS0FBSyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSzt3QkFDMUIsR0FBRyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRzt3QkFDdEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSTtxQkFDeEIsQ0FBQztpQkFDRjthQUNEO1lBRUQsMkRBQTJEO1lBQzNELElBQUksQ0FBQyxXQUFXO2dCQUFFLE9BQU87U0FDekI7UUFFRCwrQ0FBK0M7UUFDL0MsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsZUFBZSxJQUFJLEVBQUUsQ0FBQztRQUN6RCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxlQUFlLElBQUksRUFBRSxDQUFDO1FBQ3pELE1BQU0scUJBQXFCLEdBQzFCLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLHFCQUFxQixJQUFJLEVBQUUsQ0FBQztRQUVsRCw0QkFBNEI7UUFDNUIsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FDbEMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUNqRCxDQUFDO1FBRUYsSUFBSSxjQUFjLENBQUMsTUFBTSxLQUFLLENBQUM7WUFBRSxPQUFPO1FBRXhDLDhCQUE4QjtRQUM5QixJQUFJLFlBQVksR0FDZixNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FDdEIsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxJQUFJLENBQUMsV0FBVyxDQUM1QyxJQUFJLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV4QiwyQkFBMkI7UUFDM0IsTUFBTSxZQUFZLEdBQUcsY0FBYyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMxRCxNQUFNLFNBQVMsR0FBRyxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsR0FBRyxjQUFjLENBQUMsTUFBTSxDQUFDO1FBQzdELE1BQU0sU0FBUyxHQUFHLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM1QyxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksR0FBRyxDQUFDO1FBQ3pDLDREQUE0RDtRQUM1RCxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzFDLE1BQU0sV0FBVyxHQUFHLFNBQVMsS0FBSyxNQUFNLElBQUksUUFBUSxDQUFDO1FBQ3JELE1BQU0sYUFBYSxHQUFHLFlBQVksS0FBSyxNQUFNLENBQUM7UUFFOUMsNEVBQTRFO1FBQzVFLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLEVBQUU7O1lBQy9DLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEMsSUFBSSxlQUF1QixDQUFDO1lBQzVCLElBQUksUUFBZ0IsQ0FBQztZQUVyQixJQUFJLFdBQVcsRUFBRTtnQkFDaEIsb0NBQW9DO2dCQUNwQyx1RUFBdUU7Z0JBQ3ZFLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FDeEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLElBQUksR0FBRyxDQUM5QyxDQUFDO2dCQUVGLHFGQUFxRjtnQkFDckYsZUFBZSxHQUFHLFdBQVcsQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDO2dCQUNuRCxRQUFRLEdBQUcsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDO2FBQ2xDO2lCQUFNLElBQUksV0FBVyxFQUFFO2dCQUN2QiwrREFBK0Q7Z0JBQy9ELE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FDeEIsQ0FBQSxNQUFBLElBQUksQ0FBQyxRQUFRO3FCQUNYLGFBQWEsQ0FBQyxPQUFPLENBQUMsMENBQ3JCLFlBQVksQ0FBQyxXQUFXLENBQUMsS0FBSSxHQUFHLENBQ25DLENBQUM7Z0JBRUYsMkVBQTJFO2dCQUMzRSxNQUFNLG9CQUFvQixHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQzdDLENBQUMsRUFDRCxXQUFXLENBQUMsS0FBSyxDQUNqQixDQUFDO2dCQUNGLE1BQU0sV0FBVyxHQUFHLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO2dCQUNoRSxlQUFlLEdBQUcsV0FBVyxHQUFHLFFBQVEsQ0FBQztnQkFDekMsUUFBUSxHQUFHLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQzthQUNsQztpQkFBTTtnQkFDTixPQUFPLE9BQU8sQ0FBQyxDQUFDLHNDQUFzQzthQUN0RDtZQUVELElBQUksV0FBVyxFQUFFO2dCQUNoQixtQ0FBbUM7Z0JBQ25DLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyw0QkFBNEIsQ0FDM0QsUUFBUSxFQUNSLElBQUksQ0FBQyxJQUFJLENBQ1QsQ0FBQztnQkFFRiw4RUFBOEU7Z0JBQzlFLE1BQU0sWUFBWSxHQUFHLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBRWhELElBQUksWUFBWSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7b0JBQzlCLHFCQUFxQjtvQkFDckIsS0FBSyxDQUFDLGVBQWUsQ0FBQyxHQUFHLGNBQWMsQ0FBQztpQkFDeEM7cUJBQU07b0JBQ04sa0RBQWtEO29CQUNsRCxLQUFLLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxDQUFDLEVBQUUsR0FBRyxZQUFZLENBQUMsQ0FBQztpQkFDbEQ7Z0JBRUQsNEJBQTRCO2dCQUM1QixJQUFJLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQztnQkFDNUIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUNqQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQzthQUNyQztpQkFBTTtnQkFDTixrREFBa0Q7Z0JBQ2xELElBQUksV0FBVyxHQUFHLFFBQVEsQ0FBQztnQkFFM0IsSUFBSSxhQUFhLEVBQUU7b0JBQ2xCLHNEQUFzRDtvQkFDdEQsV0FBVyxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQ2hDLDBCQUEwQixFQUMxQixFQUFFLENBQ0YsQ0FBQztpQkFDRjtnQkFFRCxXQUFXLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FDaEMsdUJBQXVCLEVBQ3ZCLEtBQUssUUFBUSxJQUFJLENBQ2pCLENBQUM7Z0JBRUYsSUFBSSxXQUFXLEtBQUssUUFBUSxFQUFFO29CQUM3QixLQUFLLENBQUMsZUFBZSxDQUFDLEdBQUcsV0FBVyxDQUFDO29CQUVyQyxrRUFBa0U7b0JBQ2xFLElBQUksQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDO29CQUM1QixJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ2pDLDREQUE0RDtvQkFDNUQsTUFBTSxjQUFjLEdBQ25CLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUN4RCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTzt3QkFDNUIsY0FBYyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztpQkFDbkM7YUFDRDtZQUVELElBQUksUUFBUSxLQUFLLEdBQUcsSUFBSSxRQUFRLEtBQUssR0FBRyxFQUFFO2dCQUN6QyxNQUFNLElBQUksR0FBRyxhQUFhLENBQ3pCLElBQUksQ0FBQyxJQUFJLEVBQ1QsUUFBUSxFQUNSLGVBQWUsRUFDZixJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFDekMsSUFBSSxDQUFDLE1BQU0sQ0FBQyw4Q0FBOEM7aUJBQzFELENBQUM7Z0JBQ0YsSUFBSTtvQkFDSCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUNoQyw0QkFBNEIsRUFDNUIsSUFBSSxDQUNKLENBQUM7YUFDSDtZQUVELE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6QixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxxQkFBcUIsQ0FBQyxJQUFZO1FBQ2pDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQztRQUNuRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUM7UUFDbkQsTUFBTSxxQkFBcUIsR0FDMUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMscUJBQXFCLElBQUksRUFBRSxDQUFDO1FBQ2xELE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQ2xDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FDakQsQ0FBQztRQUVGLElBQUksY0FBYyxDQUFDLE1BQU0sS0FBSyxDQUFDO1lBQUUsT0FBTyxJQUFJLENBQUM7UUFFN0MsSUFBSSxZQUFZLEdBQ2YsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxJQUFJLENBQUM7WUFDekQsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRW5CLE9BQU8sWUFBWSxDQUFDO0lBQ3JCLENBQUM7SUFFRCxNQUFNO1FBQ0wsZ0RBQWdEO1FBQ2hELElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNoQixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1NBQ3JCO1FBRUQseUNBQXlDO1FBQ3pDLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUNsQixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1NBQ3ZCO1FBRUQsbUNBQW1DO1FBQ25DLElBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFO1lBQzFCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztTQUN6QztRQUVELEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNoQixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gJ0AvaW5kZXgnO1xyXG5pbXBvcnQge1xyXG5cdENvbXBvbmVudCxcclxuXHRkZWJvdW5jZSxcclxuXHRNYXJrZG93blBvc3RQcm9jZXNzb3JDb250ZXh0LFxyXG5cdHNldEljb24sXHJcblx0VEZpbGUsXHJcbn0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IGdldFRhc2tzQVBJIH0gZnJvbSBcIkAvdXRpbHNcIjtcclxuaW1wb3J0IHsgcGFyc2VUYXNrTGluZSB9IGZyb20gJ0AvdXRpbHMvdGFzay90YXNrLW9wZXJhdGlvbnMnO1xyXG5cclxuLy8gVGhpcyBjb21wb25lbnQgcmVwbGFjZXMgc3RhbmRhcmQgY2hlY2tib3hlcyB3aXRoIGN1c3RvbSB0ZXh0IG1hcmtzIGluIHJlYWRpbmcgdmlld1xyXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlUYXNrVGV4dE1hcmtzKHtcclxuXHRwbHVnaW4sXHJcblx0ZWxlbWVudCxcclxuXHRjdHgsXHJcbn06IHtcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbjtcclxuXHRlbGVtZW50OiBIVE1MRWxlbWVudDtcclxuXHRjdHg6IE1hcmtkb3duUG9zdFByb2Nlc3NvckNvbnRleHQ7XHJcbn0pIHtcclxuXHQvLyBGaW5kIGFsbCB0YXNrIGxpc3QgaXRlbXMgaW4gdGhlIGVsZW1lbnQgLSBoYW5kbGUgYm90aCB1bCBhbmQgb2wgbGlzdHNcclxuXHRjb25zdCB0YXNrSXRlbXMgPSBlbGVtZW50LmZpbmRBbGwoXCIudGFzay1saXN0LWl0ZW1cIik7XHJcblxyXG5cdC8vIFRyYWNrIHByb2Nlc3NlZCB0YXNrIGl0ZW1zIHRvIGF2b2lkIGR1cGxpY2F0ZXNcclxuXHRjb25zdCBwcm9jZXNzZWRJdGVtcyA9IG5ldyBTZXQoKTtcclxuXHJcblx0Zm9yIChjb25zdCB0YXNrSXRlbSBvZiB0YXNrSXRlbXMpIHtcclxuXHRcdC8vIFNraXAgaWYgdGhpcyB0YXNrIGl0ZW0gYWxyZWFkeSBoYXMgb3VyIGN1c3RvbSBtYXJrXHJcblx0XHRpZiAoXHJcblx0XHRcdHRhc2tJdGVtLnF1ZXJ5U2VsZWN0b3IoXCIudGFzay10ZXh0LW1hcmtcIikgfHxcclxuXHRcdFx0cHJvY2Vzc2VkSXRlbXMuaGFzKHRhc2tJdGVtKVxyXG5cdFx0KSB7XHJcblx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIE1hcmsgdGhpcyBpdGVtIGFzIHByb2Nlc3NlZFxyXG5cdFx0cHJvY2Vzc2VkSXRlbXMuYWRkKHRhc2tJdGVtKTtcclxuXHJcblx0XHQvLyBHZXQgdGhlIG9yaWdpbmFsIGNoZWNrYm94XHJcblx0XHRjb25zdCBjaGVja2JveCA9IHRhc2tJdGVtLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFwiLnRhc2stbGlzdC1pdGVtLWNoZWNrYm94XCJcclxuXHRcdCkgYXMgSFRNTElucHV0RWxlbWVudDtcclxuXHJcblx0XHRpZiAoIWNoZWNrYm94KSBjb250aW51ZTtcclxuXHJcblx0XHQvLyBHZXQgdGhlIGN1cnJlbnQgdGFzayBtYXJrXHJcblx0XHRjb25zdCBkYXRhVGFzayA9IHRhc2tJdGVtLmdldEF0dHJpYnV0ZShcImRhdGEtdGFza1wiKSB8fCBcIiBcIjtcclxuXHJcblx0XHQvLyBDcmVhdGUgb3VyIGN1c3RvbSB0ZXh0IG1hcmsgY29tcG9uZW50XHJcblx0XHRuZXcgVGFza1RleHRNYXJrKHBsdWdpbiwgdGFza0l0ZW0sIGNoZWNrYm94LCBkYXRhVGFzaywgY3R4KS5sb2FkKCk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBUYXNrVGV4dE1hcmsgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdHByaXZhdGUgbWFya0VsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIGJ1bGxldEVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIG1hcmtDb250YWluZXJFbDogSFRNTEVsZW1lbnQ7XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cHJpdmF0ZSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdHByaXZhdGUgdGFza0l0ZW06IEhUTUxFbGVtZW50LFxyXG5cdFx0cHJpdmF0ZSBvcmlnaW5hbENoZWNrYm94OiBIVE1MSW5wdXRFbGVtZW50LFxyXG5cdFx0cHJpdmF0ZSBjdXJyZW50TWFyazogc3RyaW5nLFxyXG5cdFx0cHJpdmF0ZSBjdHg6IE1hcmtkb3duUG9zdFByb2Nlc3NvckNvbnRleHRcclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0fVxyXG5cclxuXHRsb2FkKCkge1xyXG5cdFx0aWYgKCh0aGlzLmN0eCBhcyBhbnkpPy5lbD8uaGFzQ2xhc3MoXCJwbGFubmVyLXN0aWNreS1ibG9jay1jb250ZW50XCIpKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuZW5hYmxlQ3VzdG9tVGFza01hcmtzKSB7XHJcblx0XHRcdC8vIENyZWF0ZSBjb250YWluZXIgZm9yIGN1c3RvbSB0YXNrIG1hcmtcclxuXHRcdFx0dGhpcy5tYXJrQ29udGFpbmVyRWwgPSBjcmVhdGVFbChcInNwYW5cIiwge1xyXG5cdFx0XHRcdGNsczogXCJ0YXNrLXN0YXRlLWNvbnRhaW5lclwiLFxyXG5cdFx0XHRcdGF0dHI6IHsgXCJkYXRhLXRhc2stc3RhdGVcIjogdGhpcy5jdXJyZW50TWFyayB9LFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIENyZWF0ZSBidWxsZXQgZWxlbWVudFxyXG5cdFx0XHR0aGlzLmJ1bGxldEVsID0gdGhpcy5tYXJrQ29udGFpbmVyRWwuY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdFx0XHRjbHM6IFwidGFzay1mYWtlLWJ1bGxldFwiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIENyZWF0ZSBjdXN0b20gbWFyayBlbGVtZW50XHJcblx0XHRcdHRoaXMubWFya0VsID0gdGhpcy5tYXJrQ29udGFpbmVyRWwuY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdFx0XHRjbHM6IFwidGFzay1zdGF0ZVwiLFxyXG5cdFx0XHRcdGF0dHI6IHsgXCJkYXRhLXRhc2stc3RhdGVcIjogdGhpcy5jdXJyZW50TWFyayB9LFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIEFwcGx5IHN0eWxpbmcgYmFzZWQgb24gY3VycmVudCBzdGF0dXNcclxuXHRcdFx0dGhpcy5zdHlsZU1hcmtCeVN0YXR1cygpO1xyXG5cclxuXHRcdFx0Ly8gSW5zZXJ0IGN1c3RvbSBtYXJrIGFmdGVyIHRoZSBjaGVja2JveFxyXG5cdFx0XHR0aGlzLm9yaWdpbmFsQ2hlY2tib3gucGFyZW50RWxlbWVudD8uaW5zZXJ0QmVmb3JlKFxyXG5cdFx0XHRcdHRoaXMubWFya0NvbnRhaW5lckVsLFxyXG5cdFx0XHRcdHRoaXMub3JpZ2luYWxDaGVja2JveC5uZXh0U2libGluZ1xyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gUmVnaXN0ZXIgY2xpY2sgaGFuZGxlciBmb3Igc3RhdHVzIGN5Y2xpbmdcclxuXHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KHRoaXMubWFya0VsLCBcImNsaWNrXCIsIChlKSA9PiB7XHJcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblx0XHRcdFx0dGhpcy5kZWJvdW5jZUN5Y2xlVGFza1N0YXR1cygpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIFdoZW4gY3VzdG9tIG1hcmtzIGFyZSBkaXNhYmxlZCwgY2xvbmUgdGhlIGNoZWNrYm94IGZvciBpbnRlcmFjdGlvblxyXG5cdFx0XHRjb25zdCBuZXdDaGVja2JveCA9IHRoaXMub3JpZ2luYWxDaGVja2JveC5jbG9uZU5vZGUoXHJcblx0XHRcdFx0dHJ1ZVxyXG5cdFx0XHQpIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcblxyXG5cdFx0XHQvLyBJbnNlcnQgY2xvbmVkIGNoZWNrYm94XHJcblx0XHRcdHRoaXMub3JpZ2luYWxDaGVja2JveC5wYXJlbnRFbGVtZW50Py5pbnNlcnRCZWZvcmUoXHJcblx0XHRcdFx0bmV3Q2hlY2tib3gsXHJcblx0XHRcdFx0dGhpcy5vcmlnaW5hbENoZWNrYm94Lm5leHRTaWJsaW5nXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBSZWdpc3RlciBjbGljayBoYW5kbGVyIG9uIHRoZSBjbG9uZWQgY2hlY2tib3hcclxuXHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KG5ld0NoZWNrYm94LCBcImNsaWNrXCIsIChlKSA9PiB7XHJcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblx0XHRcdFx0dGhpcy5kZWJvdW5jZUN5Y2xlVGFza1N0YXR1cygpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBIaWRlIHRoZSBvcmlnaW5hbCBjaGVja2JveCBpbiBib3RoIGNhc2VzXHJcblx0XHR0aGlzLm9yaWdpbmFsQ2hlY2tib3guaGlkZSgpO1xyXG5cclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH1cclxuXHJcblx0c3R5bGVNYXJrQnlTdGF0dXMoKSB7XHJcblx0XHQvLyBDbGVhciBhbnkgcHJldmlvdXMgY29udGVudFxyXG5cdFx0dGhpcy5tYXJrRWwuZW1wdHkoKTtcclxuXHJcblx0XHQvLyBHZXQgY3VycmVudCBtYXJrJ3Mgc3RhdHVzIHR5cGVcclxuXHRcdGNvbnN0IHN0YXR1cyA9IHRoaXMuZ2V0VGFza1N0YXR1c0Zyb21NYXJrKHRoaXMuY3VycmVudE1hcmspO1xyXG5cclxuXHRcdGlmIChzdGF0dXMpIHtcclxuXHRcdFx0dGhpcy5tYXJrRWwuc2V0VGV4dChzdGF0dXMpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy5tYXJrRWwuc2V0VGV4dCh0aGlzLmN1cnJlbnRNYXJrKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGRlYm91bmNlQ3ljbGVUYXNrU3RhdHVzID0gZGVib3VuY2UoKCkgPT4ge1xyXG5cdFx0dGhpcy5jeWNsZVRhc2tTdGF0dXMoKTtcclxuXHR9LCAyMDApO1xyXG5cclxuXHR0cmlnZ2VyTWFya1VwZGF0ZShuZXh0TWFyazogc3RyaW5nKSB7XHJcblx0XHRpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuZW5hYmxlQ3VzdG9tVGFza01hcmtzKSB7XHJcblx0XHRcdHRoaXMudGFza0l0ZW0uc2V0QXR0cmlidXRlKFwiZGF0YS10YXNrXCIsIG5leHRNYXJrKTtcclxuXHRcdFx0dGhpcy5tYXJrRWwuc2V0QXR0cmlidXRlKFwiZGF0YS10YXNrLXN0YXRlXCIsIG5leHRNYXJrKTtcclxuXHRcdFx0dGhpcy5zdHlsZU1hcmtCeVN0YXR1cygpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Y3ljbGVUYXNrU3RhdHVzKCkge1xyXG5cdFx0Ly8gR2V0IHRoZSBzZWN0aW9uIGluZm8gdG8gbG9jYXRlIHRoZSB0YXNrIGluIHRoZSBmaWxlXHJcblx0XHRjb25zdCBzZWN0aW9uSW5mbyA9IHRoaXMuY3R4LmdldFNlY3Rpb25JbmZvKHRoaXMudGFza0l0ZW0pO1xyXG5cclxuXHRcdGNvbnN0IGZpbGUgPSB0aGlzLmN0eC5zb3VyY2VQYXRoXHJcblx0XHRcdD8gdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmdldEZpbGVCeVBhdGgodGhpcy5jdHguc291cmNlUGF0aClcclxuXHRcdFx0OiBudWxsO1xyXG5cdFx0aWYgKCFmaWxlIHx8ICEoZmlsZSBpbnN0YW5jZW9mIFRGaWxlKSkgcmV0dXJuO1xyXG5cclxuXHRcdC8vIEZhbGxiYWNrIGZvciBjYWxsb3V0cyAtIGNoZWNrIGlmIHdlJ3JlIGluIGEgY2FsbG91dCBhbmQgc2VjdGlvbkluZm8gaXMgbm90IGF2YWlsYWJsZVxyXG5cdFx0aW50ZXJmYWNlIENhbGxvdXRJbmZvIHtcclxuXHRcdFx0bGluZVN0YXJ0OiBudW1iZXI7XHJcblx0XHRcdHN0YXJ0OiBudW1iZXI7XHJcblx0XHRcdGVuZDogbnVtYmVyO1xyXG5cdFx0XHR0ZXh0OiBzdHJpbmc7XHJcblx0XHR9XHJcblx0XHRsZXQgY2FsbG91dEluZm86IENhbGxvdXRJbmZvIHwgbnVsbCA9IG51bGw7XHJcblx0XHRpZiAoIXNlY3Rpb25JbmZvKSB7XHJcblx0XHRcdC8vIENoZWNrIGlmIGNvbnRhaW5lckVsIGV4aXN0cyBhbmQgaGFzIGNtVmlldyAoZm9yIGNhbGxvdXRzKVxyXG5cdFx0XHQvLyBAdHMtaWdub3JlIC0gVHlwZVNjcmlwdCBkb2Vzbid0IGtub3cgYWJvdXQgY29udGFpbmVyRWwgYW5kIGNtVmlldyBwcm9wZXJ0aWVzXHJcblx0XHRcdGlmICh0aGlzLmN0eC5jb250YWluZXJFbD8uY21WaWV3KSB7XHJcblx0XHRcdFx0Ly8gQHRzLWlnbm9yZSAtIEFjY2Vzc2luZyBkeW5hbWljIHByb3BlcnRpZXNcclxuXHRcdFx0XHRjb25zdCBjbVZpZXcgPSB0aGlzLmN0eC5jb250YWluZXJFbC5jbVZpZXc7XHJcblx0XHRcdFx0Ly8gQ2hlY2sgaWYgdGhpcyBpcyBhIGNhbGxvdXRcclxuXHRcdFx0XHRpZiAoY21WaWV3LndpZGdldC5jbGF6eiA9PT0gXCJjbS1jYWxsb3V0XCIpIHtcclxuXHRcdFx0XHRcdGNhbGxvdXRJbmZvID0ge1xyXG5cdFx0XHRcdFx0XHRsaW5lU3RhcnQ6IDAsIC8vIFdlJ2xsIGNhbGN1bGF0ZSByZWxhdGl2ZSBwb3NpdGlvblxyXG5cdFx0XHRcdFx0XHRzdGFydDogY21WaWV3LndpZGdldC5zdGFydCxcclxuXHRcdFx0XHRcdFx0ZW5kOiBjbVZpZXcud2lkZ2V0LmVuZCxcclxuXHRcdFx0XHRcdFx0dGV4dDogY21WaWV3LndpZGdldC50ZXh0LFxyXG5cdFx0XHRcdFx0fTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIElmIHdlIGNvdWxkbid0IGdldCBjYWxsb3V0IGluZm8gZWl0aGVyLCB3ZSBjYW4ndCBwcm9jZWVkXHJcblx0XHRcdGlmICghY2FsbG91dEluZm8pIHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBHZXQgY3ljbGUgY29uZmlndXJhdGlvbiBmcm9tIHBsdWdpbiBzZXR0aW5nc1xyXG5cdFx0Y29uc3QgY3ljbGUgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXNrU3RhdHVzQ3ljbGUgfHwgW107XHJcblx0XHRjb25zdCBtYXJrcyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnRhc2tTdGF0dXNNYXJrcyB8fCB7fTtcclxuXHRcdGNvbnN0IGV4Y2x1ZGVNYXJrc0Zyb21DeWNsZSA9XHJcblx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLmV4Y2x1ZGVNYXJrc0Zyb21DeWNsZSB8fCBbXTtcclxuXHJcblx0XHQvLyBGaWx0ZXIgb3V0IGV4Y2x1ZGVkIG1hcmtzXHJcblx0XHRjb25zdCByZW1haW5pbmdDeWNsZSA9IGN5Y2xlLmZpbHRlcihcclxuXHRcdFx0KHN0YXRlKSA9PiAhZXhjbHVkZU1hcmtzRnJvbUN5Y2xlLmluY2x1ZGVzKHN0YXRlKVxyXG5cdFx0KTtcclxuXHJcblx0XHRpZiAocmVtYWluaW5nQ3ljbGUubGVuZ3RoID09PSAwKSByZXR1cm47XHJcblxyXG5cdFx0Ly8gRmluZCBjdXJyZW50IHN0YXRlIGluIGN5Y2xlXHJcblx0XHRsZXQgY3VycmVudFN0YXRlID1cclxuXHRcdFx0T2JqZWN0LmtleXMobWFya3MpLmZpbmQoXHJcblx0XHRcdFx0KHN0YXRlKSA9PiBtYXJrc1tzdGF0ZV0gPT09IHRoaXMuY3VycmVudE1hcmtcclxuXHRcdFx0KSB8fCByZW1haW5pbmdDeWNsZVswXTtcclxuXHJcblx0XHQvLyBGaW5kIG5leHQgc3RhdGUgaW4gY3ljbGVcclxuXHRcdGNvbnN0IGN1cnJlbnRJbmRleCA9IHJlbWFpbmluZ0N5Y2xlLmluZGV4T2YoY3VycmVudFN0YXRlKTtcclxuXHRcdGNvbnN0IG5leHRJbmRleCA9IChjdXJyZW50SW5kZXggKyAxKSAlIHJlbWFpbmluZ0N5Y2xlLmxlbmd0aDtcclxuXHRcdGNvbnN0IG5leHRTdGF0ZSA9IHJlbWFpbmluZ0N5Y2xlW25leHRJbmRleF07XHJcblx0XHRjb25zdCBuZXh0TWFyayA9IG1hcmtzW25leHRTdGF0ZV0gfHwgXCIgXCI7XHJcblx0XHQvLyBDaGVjayBpZiBuZXh0IHN0YXRlIGlzIERPTkUgYW5kIFRhc2tzIHBsdWdpbiBpcyBhdmFpbGFibGVcclxuXHRcdGNvbnN0IHRhc2tzQXBpID0gZ2V0VGFza3NBUEkodGhpcy5wbHVnaW4pO1xyXG5cdFx0Y29uc3QgaXNEb25lU3RhdGUgPSBuZXh0U3RhdGUgPT09IFwiRE9ORVwiICYmIHRhc2tzQXBpO1xyXG5cdFx0Y29uc3QgaXNDdXJyZW50RG9uZSA9IGN1cnJlbnRTdGF0ZSA9PT0gXCJET05FXCI7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHRoZSB1bmRlcmx5aW5nIGZpbGUgdXNpbmcgdGhlIHByb2Nlc3MgbWV0aG9kIGZvciBhdG9taWMgb3BlcmF0aW9uc1xyXG5cdFx0dGhpcy5wbHVnaW4uYXBwLnZhdWx0LnByb2Nlc3MoZmlsZSwgKGNvbnRlbnQpID0+IHtcclxuXHRcdFx0Y29uc3QgbGluZXMgPSBjb250ZW50LnNwbGl0KFwiXFxuXCIpO1xyXG5cdFx0XHRsZXQgYWN0dWFsTGluZUluZGV4OiBudW1iZXI7XHJcblx0XHRcdGxldCB0YXNrTGluZTogc3RyaW5nO1xyXG5cclxuXHRcdFx0aWYgKHNlY3Rpb25JbmZvKSB7XHJcblx0XHRcdFx0Ly8gU3RhbmRhcmQgbWV0aG9kIHVzaW5nIHNlY3Rpb25JbmZvXHJcblx0XHRcdFx0Ly8gR2V0IHRoZSByZWxhdGl2ZSBsaW5lIG51bWJlciBmcm9tIHRoZSB0YXNrSXRlbSdzIGRhdGEtbGluZSBhdHRyaWJ1dGVcclxuXHRcdFx0XHRjb25zdCBkYXRhTGluZSA9IHBhcnNlSW50KFxyXG5cdFx0XHRcdFx0dGhpcy50YXNrSXRlbS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWxpbmVcIikgfHwgXCIwXCJcclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHQvLyBDYWxjdWxhdGUgdGhlIGFjdHVhbCBsaW5lIGluIHRoZSBmaWxlIGJ5IGFkZGluZyB0aGUgcmVsYXRpdmUgbGluZSB0byBzZWN0aW9uIHN0YXJ0XHJcblx0XHRcdFx0YWN0dWFsTGluZUluZGV4ID0gc2VjdGlvbkluZm8ubGluZVN0YXJ0ICsgZGF0YUxpbmU7XHJcblx0XHRcdFx0dGFza0xpbmUgPSBsaW5lc1thY3R1YWxMaW5lSW5kZXhdO1xyXG5cdFx0XHR9IGVsc2UgaWYgKGNhbGxvdXRJbmZvKSB7XHJcblx0XHRcdFx0Ly8gR2V0IHRoZSBsaW5lIG51bWJlciBmcm9tIHRoZSB0YXNrIGl0ZW0ncyBkYXRhLWxpbmUgYXR0cmlidXRlXHJcblx0XHRcdFx0Y29uc3QgZGF0YUxpbmUgPSBwYXJzZUludChcclxuXHRcdFx0XHRcdHRoaXMudGFza0l0ZW1cclxuXHRcdFx0XHRcdFx0LnF1ZXJ5U2VsZWN0b3IoXCJpbnB1dFwiKVxyXG5cdFx0XHRcdFx0XHQ/LmdldEF0dHJpYnV0ZShcImRhdGEtbGluZVwiKSB8fCBcIjBcIlxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdC8vIENhbGN1bGF0ZSBhY3R1YWwgbGluZSBudW1iZXIgYnkgYWRkaW5nIGRhdGEtbGluZSB0byBsaW5lcyBiZWZvcmUgY2FsbG91dFxyXG5cdFx0XHRcdGNvbnN0IGNvbnRlbnRCZWZvcmVDYWxsb3V0ID0gY29udGVudC5zdWJzdHJpbmcoXHJcblx0XHRcdFx0XHQwLFxyXG5cdFx0XHRcdFx0Y2FsbG91dEluZm8uc3RhcnRcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGNvbnN0IGxpbmVzQmVmb3JlID0gY29udGVudEJlZm9yZUNhbGxvdXQuc3BsaXQoXCJcXG5cIikubGVuZ3RoIC0gMTtcclxuXHRcdFx0XHRhY3R1YWxMaW5lSW5kZXggPSBsaW5lc0JlZm9yZSArIGRhdGFMaW5lO1xyXG5cdFx0XHRcdHRhc2tMaW5lID0gbGluZXNbYWN0dWFsTGluZUluZGV4XTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRyZXR1cm4gY29udGVudDsgLy8gQ2FuJ3QgcHJvY2VlZCB3aXRob3V0IGxvY2F0aW9uIGluZm9cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKGlzRG9uZVN0YXRlKSB7XHJcblx0XHRcdFx0Ly8gVXNlIFRhc2tzIEFQSSB0byB0b2dnbGUgdGhlIHRhc2tcclxuXHRcdFx0XHRjb25zdCB1cGRhdGVkQ29udGVudCA9IHRhc2tzQXBpLmV4ZWN1dGVUb2dnbGVUYXNrRG9uZUNvbW1hbmQoXHJcblx0XHRcdFx0XHR0YXNrTGluZSxcclxuXHRcdFx0XHRcdGZpbGUucGF0aFxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdC8vIEhhbmRsZSBwb3RlbnRpYWwgbXVsdGktbGluZSByZXN1bHQgKHJlY3VycmluZyB0YXNrcyBtaWdodCBjcmVhdGUgbmV3IGxpbmVzKVxyXG5cdFx0XHRcdGNvbnN0IHVwZGF0ZWRMaW5lcyA9IHVwZGF0ZWRDb250ZW50LnNwbGl0KFwiXFxuXCIpO1xyXG5cclxuXHRcdFx0XHRpZiAodXBkYXRlZExpbmVzLmxlbmd0aCA9PT0gMSkge1xyXG5cdFx0XHRcdFx0Ly8gU2ltcGxlIHJlcGxhY2VtZW50XHJcblx0XHRcdFx0XHRsaW5lc1thY3R1YWxMaW5lSW5kZXhdID0gdXBkYXRlZENvbnRlbnQ7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdC8vIEhhbmRsZSBtdWx0aS1saW5lIHJlc3VsdCAobGlrZSByZWN1cnJpbmcgdGFza3MpXHJcblx0XHRcdFx0XHRsaW5lcy5zcGxpY2UoYWN0dWFsTGluZUluZGV4LCAxLCAuLi51cGRhdGVkTGluZXMpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gVXBkYXRlIHRoZSBVSSBpbW1lZGlhdGVseVxyXG5cdFx0XHRcdHRoaXMuY3VycmVudE1hcmsgPSBuZXh0TWFyaztcclxuXHRcdFx0XHR0aGlzLnRyaWdnZXJNYXJrVXBkYXRlKG5leHRNYXJrKTtcclxuXHRcdFx0XHR0aGlzLm9yaWdpbmFsQ2hlY2tib3guY2hlY2tlZCA9IHRydWU7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gVXNlIHRoZSBvcmlnaW5hbCBsb2dpYyBmb3Igb3RoZXIgc3RhdHVzIGNoYW5nZXNcclxuXHRcdFx0XHRsZXQgdXBkYXRlZExpbmUgPSB0YXNrTGluZTtcclxuXHJcblx0XHRcdFx0aWYgKGlzQ3VycmVudERvbmUpIHtcclxuXHRcdFx0XHRcdC8vIFJlbW92ZSBjb21wbGV0aW9uIGRhdGUgaWYgc3dpdGNoaW5nIGZyb20gRE9ORSBzdGF0ZVxyXG5cdFx0XHRcdFx0dXBkYXRlZExpbmUgPSB1cGRhdGVkTGluZS5yZXBsYWNlKFxyXG5cdFx0XHRcdFx0XHQvXFxzK+KchVxccytcXGR7NH0tXFxkezJ9LVxcZHsyfS8sXHJcblx0XHRcdFx0XHRcdFwiXCJcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHR1cGRhdGVkTGluZSA9IHVwZGF0ZWRMaW5lLnJlcGxhY2UoXHJcblx0XHRcdFx0XHQvKFxccypbLSorXVxccypcXFspKC4pKF0pLyxcclxuXHRcdFx0XHRcdGAkMSR7bmV4dE1hcmt9JDNgXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0aWYgKHVwZGF0ZWRMaW5lICE9PSB0YXNrTGluZSkge1xyXG5cdFx0XHRcdFx0bGluZXNbYWN0dWFsTGluZUluZGV4XSA9IHVwZGF0ZWRMaW5lO1xyXG5cclxuXHRcdFx0XHRcdC8vIFVwZGF0ZSB0aGUgVUkgaW1tZWRpYXRlbHkgd2l0aG91dCB3YWl0aW5nIGZvciBmaWxlIGNoYW5nZSBldmVudFxyXG5cdFx0XHRcdFx0dGhpcy5jdXJyZW50TWFyayA9IG5leHRNYXJrO1xyXG5cdFx0XHRcdFx0dGhpcy50cmlnZ2VyTWFya1VwZGF0ZShuZXh0TWFyayk7XHJcblx0XHRcdFx0XHQvLyBVcGRhdGUgdGhlIG9yaWdpbmFsIGNoZWNrYm94IGNoZWNrZWQgc3RhdGUgaWYgYXBwcm9wcmlhdGVcclxuXHRcdFx0XHRcdGNvbnN0IGNvbXBsZXRlZE1hcmtzID1cclxuXHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c2VzLmNvbXBsZXRlZC5zcGxpdChcInxcIik7XHJcblx0XHRcdFx0XHR0aGlzLm9yaWdpbmFsQ2hlY2tib3guY2hlY2tlZCA9XHJcblx0XHRcdFx0XHRcdGNvbXBsZXRlZE1hcmtzLmluY2x1ZGVzKG5leHRNYXJrKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChuZXh0TWFyayA9PT0gXCJ4XCIgfHwgbmV4dE1hcmsgPT09IFwiWFwiKSB7XHJcblx0XHRcdFx0Y29uc3QgdGFzayA9IHBhcnNlVGFza0xpbmUoXHJcblx0XHRcdFx0XHRmaWxlLnBhdGgsXHJcblx0XHRcdFx0XHR0YXNrTGluZSxcclxuXHRcdFx0XHRcdGFjdHVhbExpbmVJbmRleCxcclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnByZWZlck1ldGFkYXRhRm9ybWF0LFxyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4gLy8gUGFzcyBwbHVnaW4gZm9yIGNvbmZpZ3VyYWJsZSBwcmVmaXggc3VwcG9ydFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0dGFzayAmJlxyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4uYXBwLndvcmtzcGFjZS50cmlnZ2VyKFxyXG5cdFx0XHRcdFx0XHRcInRhc2stZ2VuaXVzOnRhc2stY29tcGxldGVkXCIsXHJcblx0XHRcdFx0XHRcdHRhc2tcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBsaW5lcy5qb2luKFwiXFxuXCIpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRnZXRUYXNrU3RhdHVzRnJvbU1hcmsobWFyazogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XHJcblx0XHRjb25zdCBjeWNsZSA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnRhc2tTdGF0dXNDeWNsZTtcclxuXHRcdGNvbnN0IG1hcmtzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c01hcmtzO1xyXG5cdFx0Y29uc3QgZXhjbHVkZU1hcmtzRnJvbUN5Y2xlID1cclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXhjbHVkZU1hcmtzRnJvbUN5Y2xlIHx8IFtdO1xyXG5cdFx0Y29uc3QgcmVtYWluaW5nQ3ljbGUgPSBjeWNsZS5maWx0ZXIoXHJcblx0XHRcdChzdGF0ZSkgPT4gIWV4Y2x1ZGVNYXJrc0Zyb21DeWNsZS5pbmNsdWRlcyhzdGF0ZSlcclxuXHRcdCk7XHJcblxyXG5cdFx0aWYgKHJlbWFpbmluZ0N5Y2xlLmxlbmd0aCA9PT0gMCkgcmV0dXJuIG51bGw7XHJcblxyXG5cdFx0bGV0IGN1cnJlbnRTdGF0ZTogc3RyaW5nID1cclxuXHRcdFx0T2JqZWN0LmtleXMobWFya3MpLmZpbmQoKHN0YXRlKSA9PiBtYXJrc1tzdGF0ZV0gPT09IG1hcmspIHx8XHJcblx0XHRcdHJlbWFpbmluZ0N5Y2xlWzBdO1xyXG5cclxuXHRcdHJldHVybiBjdXJyZW50U3RhdGU7XHJcblx0fVxyXG5cclxuXHR1bmxvYWQoKSB7XHJcblx0XHQvLyBSZW1vdmUgb3VyIG1hcmsgYW5kIHJlc3RvcmUgb3JpZ2luYWwgY2hlY2tib3hcclxuXHRcdGlmICh0aGlzLm1hcmtFbCkge1xyXG5cdFx0XHR0aGlzLm1hcmtFbC5yZW1vdmUoKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZW1vdmUgdGhlIGJ1bGxldCBlbGVtZW50IGlmIGl0IGV4aXN0c1xyXG5cdFx0aWYgKHRoaXMuYnVsbGV0RWwpIHtcclxuXHRcdFx0dGhpcy5idWxsZXRFbC5yZW1vdmUoKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTaG93IHRoZSBvcmlnaW5hbCBjaGVja2JveCBhZ2FpblxyXG5cdFx0aWYgKHRoaXMub3JpZ2luYWxDaGVja2JveCkge1xyXG5cdFx0XHR0aGlzLm9yaWdpbmFsQ2hlY2tib3guc3R5bGUuZGlzcGxheSA9IFwiXCI7XHJcblx0XHR9XHJcblxyXG5cdFx0c3VwZXIudW5sb2FkKCk7XHJcblx0fVxyXG59XHJcbiJdfQ==