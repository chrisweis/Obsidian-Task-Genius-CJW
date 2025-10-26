import { Component, } from "obsidian";
import { MarkdownRendererComponent } from "@/components/ui/renderers/MarkdownRenderer";
import { sanitizePriorityForClass } from "@/utils/task/priority-utils";
// Constants from GanttComponent (consider moving to a shared config/constants file)
const ROW_HEIGHT = 24;
const TASK_BAR_HEIGHT_RATIO = 0.6;
const MILESTONE_SIZE = 10;
const TASK_LABEL_PADDING = 5;
export class TaskRendererComponent extends Component {
    constructor(app, taskGroupEl) {
        super();
        this.params = null;
        this.eventListeners = [];
        this.app = app;
        this.taskGroupEl = taskGroupEl;
    }
    onload() {
        console.log("TaskRendererComponent loaded.");
    }
    onunload() {
        console.log("TaskRendererComponent unloaded.");
        // Clean up all event listeners
        this.cleanupEventListeners();
        // Clear the task group SVG elements
        this.taskGroupEl.empty();
        // Note: Child components added via addChild() are automatically
        // unloaded by Obsidian's Component system
    }
    cleanupEventListeners() {
        for (const { element, type, handler } of this.eventListeners) {
            element.removeEventListener(type, handler);
        }
        this.eventListeners = [];
    }
    addEventListener(element, type, handler) {
        element.addEventListener(type, handler);
        this.eventListeners.push({ element, type, handler });
    }
    updateParams(newParams) {
        this.params = newParams;
        this.render();
    }
    render() {
        if (!this.params) {
            console.warn("TaskRendererComponent: Cannot render, params not set.");
            return;
        }
        console.log("TaskRenderer received tasks:", JSON.stringify(this.params.preparedTasks.map((t) => ({
            id: t.task.id,
            sx: t.startX,
            w: t.width,
        })), null, 2));
        // Clean up previous render's resources before re-rendering
        this.cleanupEventListeners();
        this.taskGroupEl.empty(); // Clear previous tasks and their components
        const { preparedTasks, parentComponent } = this.params;
        // TODO: Implement virtualization - only render tasks currently in viewport
        preparedTasks.forEach((pt) => this.renderSingleTask(pt, parentComponent));
    }
    renderSingleTask(preparedTask, _parentComponent) {
        if (!this.params)
            return;
        const { handleTaskClick, handleTaskContextMenu, showTaskLabels, useMarkdownRenderer, rowHeight = ROW_HEIGHT, taskBarHeightRatio = TASK_BAR_HEIGHT_RATIO, milestoneSize = MILESTONE_SIZE, } = this.params;
        const task = preparedTask.task;
        const group = this.taskGroupEl.createSvg("g", {
            cls: "gantt-task-item",
        });
        group.setAttribute("data-task-id", task.id);
        // Add listener for clicking task (using our tracked addEventListener)
        const clickHandler = () => handleTaskClick(task);
        const contextMenuHandler = (event) => handleTaskContextMenu(event, task);
        this.addEventListener(group, "click", clickHandler);
        this.addEventListener(group, "contextmenu", contextMenuHandler);
        const barHeight = rowHeight * taskBarHeightRatio;
        const barY = preparedTask.y - barHeight / 2;
        let taskElement = null;
        if (preparedTask.isMilestone) {
            // Render milestone (circle and text)
            const x = preparedTask.startX;
            const y = preparedTask.y;
            const radius = milestoneSize / 2;
            // Draw circle
            taskElement = group.createSvg("circle", {
                attr: {
                    cx: x,
                    cy: y,
                    r: radius,
                    class: "gantt-task-milestone", // Base class
                },
            });
            // Add status and priority classes safely
            if (task.status && task.status.trim()) {
                taskElement.classList.add(`status-${task.status.trim()}`);
            }
            if (task.metadata.priority) {
                const sanitizedPriority = sanitizePriorityForClass(task.metadata.priority);
                if (sanitizedPriority) {
                    taskElement.classList.add(`priority-${sanitizedPriority}`);
                }
            }
            // Add text label to the right
            if (showTaskLabels && task.content) {
                // Check if we should use markdown renderer
                if (useMarkdownRenderer) {
                    // Create a foreign object to hold the markdown content
                    const foreignObject = group.createSvg("foreignObject", {
                        attr: {
                            x: x + radius + TASK_LABEL_PADDING,
                            y: y - 8,
                            width: 300,
                            height: 16,
                            class: "gantt-milestone-label-container",
                        },
                    });
                    // Create a div inside the foreignObject for markdown rendering
                    const labelContainer = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
                    labelContainer.style.pointerEvents = "none"; // Prevent capturing events
                    foreignObject.appendChild(labelContainer);
                    // Use markdown renderer to render the task content
                    const markdownRenderer = new MarkdownRendererComponent(this.app, labelContainer, task.filePath);
                    this.addChild(markdownRenderer);
                    markdownRenderer.render(task.content);
                }
                else {
                    // Use regular SVG text if markdown rendering is disabled
                    const textLabel = group.createSvg("text", {
                        attr: {
                            x: x + radius + TASK_LABEL_PADDING,
                            y: y,
                            class: "gantt-milestone-label",
                            // Vertically align middle of text with circle center
                            "dominant-baseline": "middle",
                        },
                    });
                    textLabel.textContent = task.content;
                    // Prevent text from capturing pointer events meant for the group/circle
                    textLabel.style.pointerEvents = "none";
                }
            }
            // Add tooltip for milestone
            group.setAttribute("title", `${task.content}\nDue: ${task.metadata.dueDate
                ? new Date(task.metadata.dueDate).toLocaleDateString()
                : "N/A"}`);
        }
        else if (preparedTask.width !== undefined && preparedTask.width > 0) {
            // Render task bar
            taskElement = group.createSvg("rect", {
                attr: {
                    x: preparedTask.startX,
                    y: barY,
                    width: preparedTask.width,
                    height: barHeight,
                    rx: 3,
                    ry: 3,
                    class: "gantt-task-bar", // Base class
                },
            });
            // Add status and priority classes safely
            if (task.status && task.status.trim()) {
                taskElement.classList.add(`status-${task.status.trim()}`);
            }
            if (task.metadata.priority) {
                const sanitizedPriority = sanitizePriorityForClass(task.metadata.priority);
                if (sanitizedPriority) {
                    taskElement.classList.add(`priority-${sanitizedPriority}`);
                }
            }
            // Add tooltip for bar
            group.setAttribute("title", `${task.content}\nStart: ${task.metadata.startDate
                ? new Date(task.metadata.startDate).toLocaleDateString()
                : "N/A"}\nDue: ${task.metadata.dueDate
                ? new Date(task.metadata.dueDate).toLocaleDateString()
                : "N/A"}`);
            // --- Render Task Label ---
            if (showTaskLabels && task.content) {
                const MIN_BAR_WIDTH_FOR_INTERNAL_LABEL = 30; // px, padding*2 + ~20px text
                if (preparedTask.width >= MIN_BAR_WIDTH_FOR_INTERNAL_LABEL) {
                    // --- Render Label Internally (using foreignObject for Markdown) ---
                    const foreignObject = group.createSvg("foreignObject", {
                        attr: {
                            x: preparedTask.startX + TASK_LABEL_PADDING,
                            // Position Y carefully relative to the bar center
                            y: preparedTask.y - barHeight / 2 - 2,
                            width: preparedTask.width - TASK_LABEL_PADDING * 2,
                            height: barHeight + 4,
                            class: "gantt-task-label-fo",
                        },
                    });
                    // Prevent foreignObject from capturing pointer events meant for the bar/group
                    foreignObject.style.pointerEvents = "none";
                    // Create the div container *inside* the foreignObject
                    const labelDiv = foreignObject.createDiv({
                        cls: "gantt-task-label-markdown",
                    });
                    if (useMarkdownRenderer) {
                        const sourcePath = task.filePath || "";
                        labelDiv.empty();
                        console.log("sourcePath", sourcePath);
                        const markdownRenderer = new MarkdownRendererComponent(this.app, labelDiv, sourcePath, true);
                        this.addChild(markdownRenderer);
                        markdownRenderer.update(task.content);
                    }
                    else {
                        // Fallback to simple text
                        labelDiv.textContent = task.content;
                        labelDiv.style.lineHeight = `${barHeight}px`;
                        labelDiv.style.whiteSpace = "nowrap";
                        labelDiv.style.overflow = "hidden";
                        labelDiv.style.textOverflow = "ellipsis";
                    }
                }
                else {
                    // --- Render Label Externally (using simple SVG text) ---
                    const textLabel = group.createSvg("text", {
                        attr: {
                            // Position text to the right of the narrow bar
                            x: preparedTask.startX +
                                preparedTask.width +
                                TASK_LABEL_PADDING,
                            y: preparedTask.y,
                            class: "gantt-task-label-external",
                            // Vertically align middle of text with bar center
                            "dominant-baseline": "middle",
                            "text-anchor": "start",
                        },
                    });
                    textLabel.textContent = task.content;
                    // Prevent text from capturing pointer events meant for the group/bar
                    textLabel.style.pointerEvents = "none";
                }
            }
        }
        // Apply status class to the group for potential styling overrides
        if (taskElement) {
            // group.classList.add(`status-${task.status}`); // Removed this redundant/potentially problematic class add
            // Status is already applied to the taskElement (bar or milestone) directly
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFzay1yZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRhc2stcmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUVOLFNBQVMsR0FHVCxNQUFNLFVBQVUsQ0FBQztBQUdsQixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN2RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUV2RSxvRkFBb0Y7QUFDcEYsTUFBTSxVQUFVLEdBQUcsRUFBRSxDQUFDO0FBQ3RCLE1BQU0scUJBQXFCLEdBQUcsR0FBRyxDQUFDO0FBQ2xDLE1BQU0sY0FBYyxHQUFHLEVBQUUsQ0FBQztBQUMxQixNQUFNLGtCQUFrQixHQUFHLENBQUMsQ0FBQztBQW1CN0IsTUFBTSxPQUFPLHFCQUFzQixTQUFRLFNBQVM7SUFNbkQsWUFBWSxHQUFRLEVBQUUsV0FBd0I7UUFDN0MsS0FBSyxFQUFFLENBQUM7UUFKRCxXQUFNLEdBQThCLElBQUksQ0FBQztRQUN6QyxtQkFBYyxHQUFzRSxFQUFFLENBQUM7UUFJOUYsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7UUFDZixJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztJQUNoQyxDQUFDO0lBRUQsTUFBTTtRQUNMLE9BQU8sQ0FBQyxHQUFHLENBQUMsK0JBQStCLENBQUMsQ0FBQztJQUM5QyxDQUFDO0lBRUQsUUFBUTtRQUNQLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUNBQWlDLENBQUMsQ0FBQztRQUUvQywrQkFBK0I7UUFDL0IsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7UUFFN0Isb0NBQW9DO1FBQ3BDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFekIsZ0VBQWdFO1FBQ2hFLDBDQUEwQztJQUMzQyxDQUFDO0lBRU8scUJBQXFCO1FBQzVCLEtBQUssTUFBTSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVB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O3dCQUNuQyxRQUFRLENBQUMsS0FBSyxDQUFDLFlBQVksR0FBRyxVQUFVLENBQUM7cUJBQ3pDO2lCQUNEO3FCQUFNO29CQUNOLDBEQUEwRDtvQkFDMUQsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUU7d0JBQ3pDLElBQUksRUFBRTs0QkFDTCwrQ0FBK0M7NEJBQy9DLENBQUMsRUFDQSxZQUFZLENBQUMsTUFBTTtnQ0FDbkIsWUFBWSxDQUFDLEtBQUs7Z0NBQ2xCLGtCQUFrQjs0QkFDbkIsQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDOzRCQUNqQixLQUFLLEVBQUUsMkJBQTJCOzRCQUNsQyxrREFBa0Q7NEJBQ2xELG1CQUFtQixFQUFFLFFBQVE7NEJBQzdCLGFBQWEsRUFBRSxPQUFPO3lCQUN0QjtxQkFDRCxDQUFDLENBQUM7b0JBQ0gsU0FBUyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO29CQUNyQyxxRUFBcUU7b0JBQ3JFLFNBQVMsQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQztpQkFDdkM7YUFDRDtTQUNEO1FBRUQsa0VBQWtFO1FBQ2xFLElBQUksV0FBVyxFQUFFO1lBQ2hCLDRHQUE0RztZQUM1RywyRUFBMkU7U0FDM0U7SUFDRixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xyXG5cdEFwcCxcclxuXHRDb21wb25lbnQsXHJcblx0TWFya2Rvd25SZW5kZXJlciBhcyBPYnNpZGlhbk1hcmtkb3duUmVuZGVyZXIsXHJcblx0VEZpbGUsXHJcbn0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IEdhbnR0VGFza0l0ZW0sIFBsYWNlZEdhbnR0VGFza0l0ZW0sIFRpbWVzY2FsZSB9IGZyb20gJy4vZ2FudHQnOyAvLyDmt7vliqBQbGFjZWRHYW50dFRhc2tJdGVt5a+85YWlXHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiQC90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7IE1hcmtkb3duUmVuZGVyZXJDb21wb25lbnQgfSBmcm9tIFwiQC9jb21wb25lbnRzL3VpL3JlbmRlcmVycy9NYXJrZG93blJlbmRlcmVyXCI7XHJcbmltcG9ydCB7IHNhbml0aXplUHJpb3JpdHlGb3JDbGFzcyB9IGZyb20gXCJAL3V0aWxzL3Rhc2svcHJpb3JpdHktdXRpbHNcIjtcclxuXHJcbi8vIENvbnN0YW50cyBmcm9tIEdhbnR0Q29tcG9uZW50IChjb25zaWRlciBtb3ZpbmcgdG8gYSBzaGFyZWQgY29uZmlnL2NvbnN0YW50cyBmaWxlKVxyXG5jb25zdCBST1dfSEVJR0hUID0gMjQ7XHJcbmNvbnN0IFRBU0tfQkFSX0hFSUdIVF9SQVRJTyA9IDAuNjtcclxuY29uc3QgTUlMRVNUT05FX1NJWkUgPSAxMDtcclxuY29uc3QgVEFTS19MQUJFTF9QQURESU5HID0gNTtcclxuXHJcbi8vIEludGVyZmFjZSBmb3IgcGFyYW1ldGVycyBuZWVkZWQgYnkgdGhlIHRhc2sgcmVuZGVyZXJcclxuaW50ZXJmYWNlIFRhc2tSZW5kZXJlclBhcmFtcyB7XHJcblx0YXBwOiBBcHA7XHJcblx0dGFza0dyb3VwRWw6IFNWR0dFbGVtZW50OyAvLyBUaGUgPGc+IGVsZW1lbnQgdG8gZHJhdyB0YXNrcyBpbnRvXHJcblx0cHJlcGFyZWRUYXNrczogUGxhY2VkR2FudHRUYXNrSXRlbVtdOyAvLyDkvb/nlKhQbGFjZWRHYW50dFRhc2tJdGVt5pu/5LujR2FudHRUYXNrSXRlbVxyXG5cdHJvd0hlaWdodD86IG51bWJlcjsgLy8gT3B0aW9uYWwgb3ZlcnJpZGVzXHJcblx0dGFza0JhckhlaWdodFJhdGlvPzogbnVtYmVyO1xyXG5cdG1pbGVzdG9uZVNpemU/OiBudW1iZXI7XHJcblx0c2hvd1Rhc2tMYWJlbHM6IGJvb2xlYW47XHJcblx0dXNlTWFya2Rvd25SZW5kZXJlcjogYm9vbGVhbjtcclxuXHRoYW5kbGVUYXNrQ2xpY2s6ICh0YXNrOiBUYXNrKSA9PiB2b2lkOyAvLyBDYWxsYmFjayBmb3IgdGFzayBjbGlja3NcclxuXHRoYW5kbGVUYXNrQ29udGV4dE1lbnU6IChldmVudDogTW91c2VFdmVudCwgdGFzazogVGFzaykgPT4gdm9pZDsgLy8gQ2FsbGJhY2sgZm9yIHRhc2sgY29udGV4dCBtZW51XHJcblx0Ly8gUGFzcyB0aGUgcGFyZW50IGNvbXBvbmVudCBmb3IgTWFya2Rvd25SZW5kZXJlciBjb250ZXh0IGlmIG5lZWRlZFxyXG5cdC8vIFdlIG1pZ2h0IG5lZWQgYSBkaWZmZXJlbnQgYXBwcm9hY2ggaWYgc3RhdGljIHJlbmRlcmluZyBpcyB1c2VkXHJcblx0cGFyZW50Q29tcG9uZW50OiBDb21wb25lbnQ7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBUYXNrUmVuZGVyZXJDb21wb25lbnQgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdHByaXZhdGUgYXBwOiBBcHA7XHJcblx0cHJpdmF0ZSB0YXNrR3JvdXBFbDogU1ZHR0VsZW1lbnQ7XHJcblx0cHJpdmF0ZSBwYXJhbXM6IFRhc2tSZW5kZXJlclBhcmFtcyB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgZXZlbnRMaXN0ZW5lcnM6IEFycmF5PHsgZWxlbWVudDogRWxlbWVudDsgdHlwZTogc3RyaW5nOyBoYW5kbGVyOiBFdmVudExpc3RlbmVyIH0+ID0gW107XHJcblxyXG5cdGNvbnN0cnVjdG9yKGFwcDogQXBwLCB0YXNrR3JvdXBFbDogU1ZHR0VsZW1lbnQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLmFwcCA9IGFwcDtcclxuXHRcdHRoaXMudGFza0dyb3VwRWwgPSB0YXNrR3JvdXBFbDtcclxuXHR9XHJcblxyXG5cdG9ubG9hZCgpIHtcclxuXHRcdGNvbnNvbGUubG9nKFwiVGFza1JlbmRlcmVyQ29tcG9uZW50IGxvYWRlZC5cIik7XHJcblx0fVxyXG5cclxuXHRvbnVubG9hZCgpIHtcclxuXHRcdGNvbnNvbGUubG9nKFwiVGFza1JlbmRlcmVyQ29tcG9uZW50IHVubG9hZGVkLlwiKTtcclxuXHRcdFxyXG5cdFx0Ly8gQ2xlYW4gdXAgYWxsIGV2ZW50IGxpc3RlbmVyc1xyXG5cdFx0dGhpcy5jbGVhbnVwRXZlbnRMaXN0ZW5lcnMoKTtcclxuXHRcdFxyXG5cdFx0Ly8gQ2xlYXIgdGhlIHRhc2sgZ3JvdXAgU1ZHIGVsZW1lbnRzXHJcblx0XHR0aGlzLnRhc2tHcm91cEVsLmVtcHR5KCk7XHJcblx0XHRcclxuXHRcdC8vIE5vdGU6IENoaWxkIGNvbXBvbmVudHMgYWRkZWQgdmlhIGFkZENoaWxkKCkgYXJlIGF1dG9tYXRpY2FsbHlcclxuXHRcdC8vIHVubG9hZGVkIGJ5IE9ic2lkaWFuJ3MgQ29tcG9uZW50IHN5c3RlbVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjbGVhbnVwRXZlbnRMaXN0ZW5lcnMoKSB7XHJcblx0XHRmb3IgKGNvbnN0IHsgZWxlbWVudCwgdHlwZSwgaGFuZGxlciB9IG9mIHRoaXMuZXZlbnRMaXN0ZW5lcnMpIHtcclxuXHRcdFx0ZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGhhbmRsZXIpO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5ldmVudExpc3RlbmVycyA9IFtdO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhZGRFdmVudExpc3RlbmVyKGVsZW1lbnQ6IEVsZW1lbnQsIHR5cGU6IHN0cmluZywgaGFuZGxlcjogRXZlbnRMaXN0ZW5lcikge1xyXG5cdFx0ZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGhhbmRsZXIpO1xyXG5cdFx0dGhpcy5ldmVudExpc3RlbmVycy5wdXNoKHsgZWxlbWVudCwgdHlwZSwgaGFuZGxlciB9KTtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZVBhcmFtcyhuZXdQYXJhbXM6IFRhc2tSZW5kZXJlclBhcmFtcykge1xyXG5cdFx0dGhpcy5wYXJhbXMgPSBuZXdQYXJhbXM7XHJcblx0XHR0aGlzLnJlbmRlcigpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSByZW5kZXIoKSB7XHJcblx0XHRpZiAoIXRoaXMucGFyYW1zKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcIlRhc2tSZW5kZXJlckNvbXBvbmVudDogQ2Fubm90IHJlbmRlciwgcGFyYW1zIG5vdCBzZXQuXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcIlRhc2tSZW5kZXJlciByZWNlaXZlZCB0YXNrczpcIixcclxuXHRcdFx0SlNPTi5zdHJpbmdpZnkoXHJcblx0XHRcdFx0dGhpcy5wYXJhbXMucHJlcGFyZWRUYXNrcy5tYXAoKHQpID0+ICh7XHJcblx0XHRcdFx0XHRpZDogdC50YXNrLmlkLFxyXG5cdFx0XHRcdFx0c3g6IHQuc3RhcnRYLFxyXG5cdFx0XHRcdFx0dzogdC53aWR0aCxcclxuXHRcdFx0XHR9KSksXHJcblx0XHRcdFx0bnVsbCxcclxuXHRcdFx0XHQyXHJcblx0XHRcdClcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gQ2xlYW4gdXAgcHJldmlvdXMgcmVuZGVyJ3MgcmVzb3VyY2VzIGJlZm9yZSByZS1yZW5kZXJpbmdcclxuXHRcdHRoaXMuY2xlYW51cEV2ZW50TGlzdGVuZXJzKCk7XHJcblx0XHR0aGlzLnRhc2tHcm91cEVsLmVtcHR5KCk7IC8vIENsZWFyIHByZXZpb3VzIHRhc2tzIGFuZCB0aGVpciBjb21wb25lbnRzXHJcblxyXG5cdFx0Y29uc3QgeyBwcmVwYXJlZFRhc2tzLCBwYXJlbnRDb21wb25lbnQgfSA9IHRoaXMucGFyYW1zO1xyXG5cclxuXHRcdC8vIFRPRE86IEltcGxlbWVudCB2aXJ0dWFsaXphdGlvbiAtIG9ubHkgcmVuZGVyIHRhc2tzIGN1cnJlbnRseSBpbiB2aWV3cG9ydFxyXG5cdFx0cHJlcGFyZWRUYXNrcy5mb3JFYWNoKChwdCkgPT5cclxuXHRcdFx0dGhpcy5yZW5kZXJTaW5nbGVUYXNrKHB0LCBwYXJlbnRDb21wb25lbnQpXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSByZW5kZXJTaW5nbGVUYXNrKFxyXG5cdFx0cHJlcGFyZWRUYXNrOiBQbGFjZWRHYW50dFRhc2tJdGVtLFxyXG5cdFx0X3BhcmVudENvbXBvbmVudDogQ29tcG9uZW50XHJcblx0KSB7XHJcblx0XHRpZiAoIXRoaXMucGFyYW1zKSByZXR1cm47XHJcblxyXG5cdFx0Y29uc3Qge1xyXG5cdFx0XHRoYW5kbGVUYXNrQ2xpY2ssXHJcblx0XHRcdGhhbmRsZVRhc2tDb250ZXh0TWVudSxcclxuXHRcdFx0c2hvd1Rhc2tMYWJlbHMsXHJcblx0XHRcdHVzZU1hcmtkb3duUmVuZGVyZXIsXHJcblx0XHRcdHJvd0hlaWdodCA9IFJPV19IRUlHSFQsXHJcblx0XHRcdHRhc2tCYXJIZWlnaHRSYXRpbyA9IFRBU0tfQkFSX0hFSUdIVF9SQVRJTyxcclxuXHRcdFx0bWlsZXN0b25lU2l6ZSA9IE1JTEVTVE9ORV9TSVpFLFxyXG5cdFx0fSA9IHRoaXMucGFyYW1zO1xyXG5cclxuXHRcdGNvbnN0IHRhc2sgPSBwcmVwYXJlZFRhc2sudGFzaztcclxuXHRcdGNvbnN0IGdyb3VwID0gdGhpcy50YXNrR3JvdXBFbC5jcmVhdGVTdmcoXCJnXCIsIHtcclxuXHRcdFx0Y2xzOiBcImdhbnR0LXRhc2staXRlbVwiLFxyXG5cdFx0fSk7XHJcblx0XHRncm91cC5zZXRBdHRyaWJ1dGUoXCJkYXRhLXRhc2staWRcIiwgdGFzay5pZCk7XHJcblx0XHQvLyBBZGQgbGlzdGVuZXIgZm9yIGNsaWNraW5nIHRhc2sgKHVzaW5nIG91ciB0cmFja2VkIGFkZEV2ZW50TGlzdGVuZXIpXHJcblx0XHRjb25zdCBjbGlja0hhbmRsZXIgPSAoKSA9PiBoYW5kbGVUYXNrQ2xpY2sodGFzayk7XHJcblx0XHRjb25zdCBjb250ZXh0TWVudUhhbmRsZXIgPSAoZXZlbnQ6IEV2ZW50KSA9PiBoYW5kbGVUYXNrQ29udGV4dE1lbnUoZXZlbnQgYXMgTW91c2VFdmVudCwgdGFzayk7XHJcblx0XHR0aGlzLmFkZEV2ZW50TGlzdGVuZXIoZ3JvdXAsIFwiY2xpY2tcIiwgY2xpY2tIYW5kbGVyKTtcclxuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihncm91cCwgXCJjb250ZXh0bWVudVwiLCBjb250ZXh0TWVudUhhbmRsZXIpO1xyXG5cclxuXHRcdGNvbnN0IGJhckhlaWdodCA9IHJvd0hlaWdodCAqIHRhc2tCYXJIZWlnaHRSYXRpbztcclxuXHRcdGNvbnN0IGJhclkgPSBwcmVwYXJlZFRhc2sueSAtIGJhckhlaWdodCAvIDI7XHJcblxyXG5cdFx0bGV0IHRhc2tFbGVtZW50OiBTVkdFbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcblxyXG5cdFx0aWYgKHByZXBhcmVkVGFzay5pc01pbGVzdG9uZSkge1xyXG5cdFx0XHQvLyBSZW5kZXIgbWlsZXN0b25lIChjaXJjbGUgYW5kIHRleHQpXHJcblx0XHRcdGNvbnN0IHggPSBwcmVwYXJlZFRhc2suc3RhcnRYO1xyXG5cdFx0XHRjb25zdCB5ID0gcHJlcGFyZWRUYXNrLnk7XHJcblx0XHRcdGNvbnN0IHJhZGl1cyA9IG1pbGVzdG9uZVNpemUgLyAyO1xyXG5cclxuXHRcdFx0Ly8gRHJhdyBjaXJjbGVcclxuXHRcdFx0dGFza0VsZW1lbnQgPSBncm91cC5jcmVhdGVTdmcoXCJjaXJjbGVcIiwge1xyXG5cdFx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHRcdGN4OiB4LFxyXG5cdFx0XHRcdFx0Y3k6IHksXHJcblx0XHRcdFx0XHRyOiByYWRpdXMsXHJcblx0XHRcdFx0XHRjbGFzczogXCJnYW50dC10YXNrLW1pbGVzdG9uZVwiLCAvLyBCYXNlIGNsYXNzXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdC8vIEFkZCBzdGF0dXMgYW5kIHByaW9yaXR5IGNsYXNzZXMgc2FmZWx5XHJcblx0XHRcdGlmICh0YXNrLnN0YXR1cyAmJiB0YXNrLnN0YXR1cy50cmltKCkpIHtcclxuXHRcdFx0XHR0YXNrRWxlbWVudC5jbGFzc0xpc3QuYWRkKGBzdGF0dXMtJHt0YXNrLnN0YXR1cy50cmltKCl9YCk7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKHRhc2subWV0YWRhdGEucHJpb3JpdHkpIHtcclxuXHRcdFx0XHRjb25zdCBzYW5pdGl6ZWRQcmlvcml0eSA9IHNhbml0aXplUHJpb3JpdHlGb3JDbGFzcyh0YXNrLm1ldGFkYXRhLnByaW9yaXR5KTtcclxuXHRcdFx0XHRpZiAoc2FuaXRpemVkUHJpb3JpdHkpIHtcclxuXHRcdFx0XHRcdHRhc2tFbGVtZW50LmNsYXNzTGlzdC5hZGQoYHByaW9yaXR5LSR7c2FuaXRpemVkUHJpb3JpdHl9YCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBBZGQgdGV4dCBsYWJlbCB0byB0aGUgcmlnaHRcclxuXHRcdFx0aWYgKHNob3dUYXNrTGFiZWxzICYmIHRhc2suY29udGVudCkge1xyXG5cdFx0XHRcdC8vIENoZWNrIGlmIHdlIHNob3VsZCB1c2UgbWFya2Rvd24gcmVuZGVyZXJcclxuXHRcdFx0XHRpZiAodXNlTWFya2Rvd25SZW5kZXJlcikge1xyXG5cdFx0XHRcdFx0Ly8gQ3JlYXRlIGEgZm9yZWlnbiBvYmplY3QgdG8gaG9sZCB0aGUgbWFya2Rvd24gY29udGVudFxyXG5cdFx0XHRcdFx0Y29uc3QgZm9yZWlnbk9iamVjdCA9IGdyb3VwLmNyZWF0ZVN2ZyhcImZvcmVpZ25PYmplY3RcIiwge1xyXG5cdFx0XHRcdFx0XHRhdHRyOiB7XHJcblx0XHRcdFx0XHRcdFx0eDogeCArIHJhZGl1cyArIFRBU0tfTEFCRUxfUEFERElORyxcclxuXHRcdFx0XHRcdFx0XHR5OiB5IC0gOCwgLy8gQWRqdXN0IHkgcG9zaXRpb24gdG8gY2VudGVyIHRoZSBjb250ZW50XHJcblx0XHRcdFx0XHRcdFx0d2lkdGg6IDMwMCwgLy8gU2V0IGEgcmVhc29uYWJsZSB3aWR0aFxyXG5cdFx0XHRcdFx0XHRcdGhlaWdodDogMTYsIC8vIFNldCBhIHJlYXNvbmFibGUgaGVpZ2h0XHJcblx0XHRcdFx0XHRcdFx0Y2xhc3M6IFwiZ2FudHQtbWlsZXN0b25lLWxhYmVsLWNvbnRhaW5lclwiLFxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gQ3JlYXRlIGEgZGl2IGluc2lkZSB0aGUgZm9yZWlnbk9iamVjdCBmb3IgbWFya2Rvd24gcmVuZGVyaW5nXHJcblx0XHRcdFx0XHRjb25zdCBsYWJlbENvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhcclxuXHRcdFx0XHRcdFx0XCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sXCIsXHJcblx0XHRcdFx0XHRcdFwiZGl2XCJcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRsYWJlbENvbnRhaW5lci5zdHlsZS5wb2ludGVyRXZlbnRzID0gXCJub25lXCI7IC8vIFByZXZlbnQgY2FwdHVyaW5nIGV2ZW50c1xyXG5cdFx0XHRcdFx0Zm9yZWlnbk9iamVjdC5hcHBlbmRDaGlsZChsYWJlbENvbnRhaW5lcik7XHJcblxyXG5cdFx0XHRcdFx0Ly8gVXNlIG1hcmtkb3duIHJlbmRlcmVyIHRvIHJlbmRlciB0aGUgdGFzayBjb250ZW50XHJcblx0XHRcdFx0XHRjb25zdCBtYXJrZG93blJlbmRlcmVyID0gbmV3IE1hcmtkb3duUmVuZGVyZXJDb21wb25lbnQoXHJcblx0XHRcdFx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHRcdFx0XHRsYWJlbENvbnRhaW5lcixcclxuXHRcdFx0XHRcdFx0dGFzay5maWxlUGF0aFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdHRoaXMuYWRkQ2hpbGQobWFya2Rvd25SZW5kZXJlcik7XHJcblx0XHRcdFx0XHRtYXJrZG93blJlbmRlcmVyLnJlbmRlcih0YXNrLmNvbnRlbnQpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHQvLyBVc2UgcmVndWxhciBTVkcgdGV4dCBpZiBtYXJrZG93biByZW5kZXJpbmcgaXMgZGlzYWJsZWRcclxuXHRcdFx0XHRcdGNvbnN0IHRleHRMYWJlbCA9IGdyb3VwLmNyZWF0ZVN2ZyhcInRleHRcIiwge1xyXG5cdFx0XHRcdFx0XHRhdHRyOiB7XHJcblx0XHRcdFx0XHRcdFx0eDogeCArIHJhZGl1cyArIFRBU0tfTEFCRUxfUEFERElORyxcclxuXHRcdFx0XHRcdFx0XHR5OiB5LFxyXG5cdFx0XHRcdFx0XHRcdGNsYXNzOiBcImdhbnR0LW1pbGVzdG9uZS1sYWJlbFwiLFxyXG5cdFx0XHRcdFx0XHRcdC8vIFZlcnRpY2FsbHkgYWxpZ24gbWlkZGxlIG9mIHRleHQgd2l0aCBjaXJjbGUgY2VudGVyXHJcblx0XHRcdFx0XHRcdFx0XCJkb21pbmFudC1iYXNlbGluZVwiOiBcIm1pZGRsZVwiLFxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR0ZXh0TGFiZWwudGV4dENvbnRlbnQgPSB0YXNrLmNvbnRlbnQ7XHJcblx0XHRcdFx0XHQvLyBQcmV2ZW50IHRleHQgZnJvbSBjYXB0dXJpbmcgcG9pbnRlciBldmVudHMgbWVhbnQgZm9yIHRoZSBncm91cC9jaXJjbGVcclxuXHRcdFx0XHRcdHRleHRMYWJlbC5zdHlsZS5wb2ludGVyRXZlbnRzID0gXCJub25lXCI7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBBZGQgdG9vbHRpcCBmb3IgbWlsZXN0b25lXHJcblx0XHRcdGdyb3VwLnNldEF0dHJpYnV0ZShcclxuXHRcdFx0XHRcInRpdGxlXCIsXHJcblx0XHRcdFx0YCR7dGFzay5jb250ZW50fVxcbkR1ZTogJHtcclxuXHRcdFx0XHRcdHRhc2subWV0YWRhdGEuZHVlRGF0ZVxyXG5cdFx0XHRcdFx0XHQ/IG5ldyBEYXRlKHRhc2subWV0YWRhdGEuZHVlRGF0ZSkudG9Mb2NhbGVEYXRlU3RyaW5nKClcclxuXHRcdFx0XHRcdFx0OiBcIk4vQVwiXHJcblx0XHRcdFx0fWBcclxuXHRcdFx0KTtcclxuXHRcdH0gZWxzZSBpZiAocHJlcGFyZWRUYXNrLndpZHRoICE9PSB1bmRlZmluZWQgJiYgcHJlcGFyZWRUYXNrLndpZHRoID4gMCkge1xyXG5cdFx0XHQvLyBSZW5kZXIgdGFzayBiYXJcclxuXHRcdFx0dGFza0VsZW1lbnQgPSBncm91cC5jcmVhdGVTdmcoXCJyZWN0XCIsIHtcclxuXHRcdFx0XHRhdHRyOiB7XHJcblx0XHRcdFx0XHR4OiBwcmVwYXJlZFRhc2suc3RhcnRYLFxyXG5cdFx0XHRcdFx0eTogYmFyWSxcclxuXHRcdFx0XHRcdHdpZHRoOiBwcmVwYXJlZFRhc2sud2lkdGgsXHJcblx0XHRcdFx0XHRoZWlnaHQ6IGJhckhlaWdodCxcclxuXHRcdFx0XHRcdHJ4OiAzLCAvLyBSb3VuZGVkIGNvcm5lcnNcclxuXHRcdFx0XHRcdHJ5OiAzLFxyXG5cdFx0XHRcdFx0Y2xhc3M6IFwiZ2FudHQtdGFzay1iYXJcIiwgLy8gQmFzZSBjbGFzc1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0XHQvLyBBZGQgc3RhdHVzIGFuZCBwcmlvcml0eSBjbGFzc2VzIHNhZmVseVxyXG5cdFx0XHRpZiAodGFzay5zdGF0dXMgJiYgdGFzay5zdGF0dXMudHJpbSgpKSB7XHJcblx0XHRcdFx0dGFza0VsZW1lbnQuY2xhc3NMaXN0LmFkZChgc3RhdHVzLSR7dGFzay5zdGF0dXMudHJpbSgpfWApO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmICh0YXNrLm1ldGFkYXRhLnByaW9yaXR5KSB7XHJcblx0XHRcdFx0Y29uc3Qgc2FuaXRpemVkUHJpb3JpdHkgPSBzYW5pdGl6ZVByaW9yaXR5Rm9yQ2xhc3ModGFzay5tZXRhZGF0YS5wcmlvcml0eSk7XHJcblx0XHRcdFx0aWYgKHNhbml0aXplZFByaW9yaXR5KSB7XHJcblx0XHRcdFx0XHR0YXNrRWxlbWVudC5jbGFzc0xpc3QuYWRkKGBwcmlvcml0eS0ke3Nhbml0aXplZFByaW9yaXR5fWApO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQWRkIHRvb2x0aXAgZm9yIGJhclxyXG5cdFx0XHRncm91cC5zZXRBdHRyaWJ1dGUoXHJcblx0XHRcdFx0XCJ0aXRsZVwiLFxyXG5cdFx0XHRcdGAke3Rhc2suY29udGVudH1cXG5TdGFydDogJHtcclxuXHRcdFx0XHRcdHRhc2subWV0YWRhdGEuc3RhcnREYXRlXHJcblx0XHRcdFx0XHRcdD8gbmV3IERhdGUodGFzay5tZXRhZGF0YS5zdGFydERhdGUpLnRvTG9jYWxlRGF0ZVN0cmluZygpXHJcblx0XHRcdFx0XHRcdDogXCJOL0FcIlxyXG5cdFx0XHRcdH1cXG5EdWU6ICR7XHJcblx0XHRcdFx0XHR0YXNrLm1ldGFkYXRhLmR1ZURhdGVcclxuXHRcdFx0XHRcdFx0PyBuZXcgRGF0ZSh0YXNrLm1ldGFkYXRhLmR1ZURhdGUpLnRvTG9jYWxlRGF0ZVN0cmluZygpXHJcblx0XHRcdFx0XHRcdDogXCJOL0FcIlxyXG5cdFx0XHRcdH1gXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyAtLS0gUmVuZGVyIFRhc2sgTGFiZWwgLS0tXHJcblx0XHRcdGlmIChzaG93VGFza0xhYmVscyAmJiB0YXNrLmNvbnRlbnQpIHtcclxuXHRcdFx0XHRjb25zdCBNSU5fQkFSX1dJRFRIX0ZPUl9JTlRFUk5BTF9MQUJFTCA9IDMwOyAvLyBweCwgcGFkZGluZyoyICsgfjIwcHggdGV4dFxyXG5cclxuXHRcdFx0XHRpZiAocHJlcGFyZWRUYXNrLndpZHRoID49IE1JTl9CQVJfV0lEVEhfRk9SX0lOVEVSTkFMX0xBQkVMKSB7XHJcblx0XHRcdFx0XHQvLyAtLS0gUmVuZGVyIExhYmVsIEludGVybmFsbHkgKHVzaW5nIGZvcmVpZ25PYmplY3QgZm9yIE1hcmtkb3duKSAtLS1cclxuXHRcdFx0XHRcdGNvbnN0IGZvcmVpZ25PYmplY3QgPSBncm91cC5jcmVhdGVTdmcoXCJmb3JlaWduT2JqZWN0XCIsIHtcclxuXHRcdFx0XHRcdFx0YXR0cjoge1xyXG5cdFx0XHRcdFx0XHRcdHg6IHByZXBhcmVkVGFzay5zdGFydFggKyBUQVNLX0xBQkVMX1BBRERJTkcsXHJcblx0XHRcdFx0XHRcdFx0Ly8gUG9zaXRpb24gWSBjYXJlZnVsbHkgcmVsYXRpdmUgdG8gdGhlIGJhciBjZW50ZXJcclxuXHRcdFx0XHRcdFx0XHR5OiBwcmVwYXJlZFRhc2sueSAtIGJhckhlaWdodCAvIDIgLSAyLCAvLyBBZGp1c3QgZmluZS10dW5pbmcgbmVlZGVkXHJcblx0XHRcdFx0XHRcdFx0d2lkdGg6IHByZXBhcmVkVGFzay53aWR0aCAtIFRBU0tfTEFCRUxfUEFERElORyAqIDIsIC8vIFdpZHRoIGlzIHN1ZmZpY2llbnRcclxuXHRcdFx0XHRcdFx0XHRoZWlnaHQ6IGJhckhlaWdodCArIDQsIC8vIEFsbG93IHNsaWdodGx5IG1vcmUgaGVpZ2h0XHJcblx0XHRcdFx0XHRcdFx0Y2xhc3M6IFwiZ2FudHQtdGFzay1sYWJlbC1mb1wiLFxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gUHJldmVudCBmb3JlaWduT2JqZWN0IGZyb20gY2FwdHVyaW5nIHBvaW50ZXIgZXZlbnRzIG1lYW50IGZvciB0aGUgYmFyL2dyb3VwXHJcblx0XHRcdFx0XHRmb3JlaWduT2JqZWN0LnN0eWxlLnBvaW50ZXJFdmVudHMgPSBcIm5vbmVcIjtcclxuXHJcblx0XHRcdFx0XHQvLyBDcmVhdGUgdGhlIGRpdiBjb250YWluZXIgKmluc2lkZSogdGhlIGZvcmVpZ25PYmplY3RcclxuXHRcdFx0XHRcdGNvbnN0IGxhYmVsRGl2ID0gZm9yZWlnbk9iamVjdC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdFx0XHRjbHM6IFwiZ2FudHQtdGFzay1sYWJlbC1tYXJrZG93blwiLFxyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0aWYgKHVzZU1hcmtkb3duUmVuZGVyZXIpIHtcclxuXHRcdFx0XHRcdFx0Y29uc3Qgc291cmNlUGF0aCA9IHRhc2suZmlsZVBhdGggfHwgXCJcIjtcclxuXHRcdFx0XHRcdFx0bGFiZWxEaXYuZW1wdHkoKTtcclxuXHJcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFwic291cmNlUGF0aFwiLCBzb3VyY2VQYXRoKTtcclxuXHJcblx0XHRcdFx0XHRcdGNvbnN0IG1hcmtkb3duUmVuZGVyZXIgPSBuZXcgTWFya2Rvd25SZW5kZXJlckNvbXBvbmVudChcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0XHRcdFx0XHRsYWJlbERpdiBhcyBIVE1MRWxlbWVudCxcclxuXHRcdFx0XHRcdFx0XHRzb3VyY2VQYXRoLFxyXG5cdFx0XHRcdFx0XHRcdHRydWVcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0dGhpcy5hZGRDaGlsZChtYXJrZG93blJlbmRlcmVyKTtcclxuXHRcdFx0XHRcdFx0bWFya2Rvd25SZW5kZXJlci51cGRhdGUodGFzay5jb250ZW50KTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdC8vIEZhbGxiYWNrIHRvIHNpbXBsZSB0ZXh0XHJcblx0XHRcdFx0XHRcdGxhYmVsRGl2LnRleHRDb250ZW50ID0gdGFzay5jb250ZW50O1xyXG5cdFx0XHRcdFx0XHRsYWJlbERpdi5zdHlsZS5saW5lSGVpZ2h0ID0gYCR7YmFySGVpZ2h0fXB4YDtcclxuXHRcdFx0XHRcdFx0bGFiZWxEaXYuc3R5bGUud2hpdGVTcGFjZSA9IFwibm93cmFwXCI7XHJcblx0XHRcdFx0XHRcdGxhYmVsRGl2LnN0eWxlLm92ZXJmbG93ID0gXCJoaWRkZW5cIjtcclxuXHRcdFx0XHRcdFx0bGFiZWxEaXYuc3R5bGUudGV4dE92ZXJmbG93ID0gXCJlbGxpcHNpc1wiO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHQvLyAtLS0gUmVuZGVyIExhYmVsIEV4dGVybmFsbHkgKHVzaW5nIHNpbXBsZSBTVkcgdGV4dCkgLS0tXHJcblx0XHRcdFx0XHRjb25zdCB0ZXh0TGFiZWwgPSBncm91cC5jcmVhdGVTdmcoXCJ0ZXh0XCIsIHtcclxuXHRcdFx0XHRcdFx0YXR0cjoge1xyXG5cdFx0XHRcdFx0XHRcdC8vIFBvc2l0aW9uIHRleHQgdG8gdGhlIHJpZ2h0IG9mIHRoZSBuYXJyb3cgYmFyXHJcblx0XHRcdFx0XHRcdFx0eDpcclxuXHRcdFx0XHRcdFx0XHRcdHByZXBhcmVkVGFzay5zdGFydFggK1xyXG5cdFx0XHRcdFx0XHRcdFx0cHJlcGFyZWRUYXNrLndpZHRoICtcclxuXHRcdFx0XHRcdFx0XHRcdFRBU0tfTEFCRUxfUEFERElORyxcclxuXHRcdFx0XHRcdFx0XHR5OiBwcmVwYXJlZFRhc2sueSwgLy8gVmVydGljYWxseSBjZW50ZXJlZCB3aXRoIHRoZSBiYXIncyBsb2dpY2FsIGNlbnRlclxyXG5cdFx0XHRcdFx0XHRcdGNsYXNzOiBcImdhbnR0LXRhc2stbGFiZWwtZXh0ZXJuYWxcIixcclxuXHRcdFx0XHRcdFx0XHQvLyBWZXJ0aWNhbGx5IGFsaWduIG1pZGRsZSBvZiB0ZXh0IHdpdGggYmFyIGNlbnRlclxyXG5cdFx0XHRcdFx0XHRcdFwiZG9taW5hbnQtYmFzZWxpbmVcIjogXCJtaWRkbGVcIixcclxuXHRcdFx0XHRcdFx0XHRcInRleHQtYW5jaG9yXCI6IFwic3RhcnRcIixcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0dGV4dExhYmVsLnRleHRDb250ZW50ID0gdGFzay5jb250ZW50O1xyXG5cdFx0XHRcdFx0Ly8gUHJldmVudCB0ZXh0IGZyb20gY2FwdHVyaW5nIHBvaW50ZXIgZXZlbnRzIG1lYW50IGZvciB0aGUgZ3JvdXAvYmFyXHJcblx0XHRcdFx0XHR0ZXh0TGFiZWwuc3R5bGUucG9pbnRlckV2ZW50cyA9IFwibm9uZVwiO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFwcGx5IHN0YXR1cyBjbGFzcyB0byB0aGUgZ3JvdXAgZm9yIHBvdGVudGlhbCBzdHlsaW5nIG92ZXJyaWRlc1xyXG5cdFx0aWYgKHRhc2tFbGVtZW50KSB7XHJcblx0XHRcdC8vIGdyb3VwLmNsYXNzTGlzdC5hZGQoYHN0YXR1cy0ke3Rhc2suc3RhdHVzfWApOyAvLyBSZW1vdmVkIHRoaXMgcmVkdW5kYW50L3BvdGVudGlhbGx5IHByb2JsZW1hdGljIGNsYXNzIGFkZFxyXG5cdFx0XHQvLyBTdGF0dXMgaXMgYWxyZWFkeSBhcHBsaWVkIHRvIHRoZSB0YXNrRWxlbWVudCAoYmFyIG9yIG1pbGVzdG9uZSkgZGlyZWN0bHlcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuIl19