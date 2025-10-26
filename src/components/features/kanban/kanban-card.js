import { Component } from "obsidian";
import { MarkdownRendererComponent } from "@/components/ui/renderers/MarkdownRenderer"; // Adjust path
import { createTaskCheckbox } from "@/components/features/task/view/details";
import { getEffectiveProject } from "@/utils/task/task-operations";
import { sanitizePriorityForClass } from "@/utils/task/priority-utils";
export class KanbanCardComponent extends Component {
    // Events (Optional, could be handled by DragManager or view)
    // public onCardClick: (task: Task) => void;
    // public onCardContextMenu: (event: MouseEvent, task: Task) => void;
    constructor(app, plugin, containerEl, // The column's contentEl where the card should be added
    task, params = {}) {
        super();
        this.app = app;
        this.containerEl = containerEl;
        this.params = params;
        this.plugin = plugin;
        this.task = task;
    }
    onload() {
        this.element = this.containerEl.createDiv({
            cls: "tg-kanban-card",
            attr: { "data-task-id": this.task.id },
        });
        if (this.task.completed) {
            this.element.classList.add("task-completed");
        }
        const metadata = this.task.metadata || {};
        if (metadata.priority) {
            const sanitizedPriority = sanitizePriorityForClass(metadata.priority);
            if (sanitizedPriority) {
                this.element.classList.add(`priority-${sanitizedPriority}`);
            }
        }
        // --- Card Content ---
        this.element.createDiv({
            cls: "tg-kanban-card-container",
        }, (el) => {
            var _a, _b;
            const checkbox = createTaskCheckbox(this.task.status, this.task, el);
            this.registerDomEvent(checkbox, "click", (ev) => {
                var _a;
                ev.stopPropagation();
                if ((_a = this.params) === null || _a === void 0 ? void 0 : _a.onTaskCompleted) {
                    this.params.onTaskCompleted(this.task);
                }
                if (this.task.status === " ") {
                    checkbox.checked = true;
                    checkbox.dataset.task = "x";
                }
            });
            if ((_b = (_a = this.plugin.settings.viewConfiguration.find((v) => v.id === "kanban")) === null || _a === void 0 ? void 0 : _a.specificConfig) === null || _b === void 0 ? void 0 : _b.showCheckbox) {
                checkbox.show();
            }
            else {
                checkbox.hide();
            }
            this.contentEl = el.createDiv("tg-kanban-card-content");
        });
        this.renderMarkdown();
        // --- Card Metadata ---
        this.metadataEl = this.element.createDiv({
            cls: "tg-kanban-card-metadata",
        });
        this.renderMetadata();
        // --- Context Menu ---
        this.registerDomEvent(this.element, "contextmenu", (event) => {
            var _a, _b;
            (_b = (_a = this.params).onTaskContextMenu) === null || _b === void 0 ? void 0 : _b.call(_a, event, this.task);
        });
    }
    onunload() {
        var _a;
        (_a = this.element) === null || _a === void 0 ? void 0 : _a.remove();
    }
    renderMarkdown() {
        this.contentEl.empty(); // Clear previous content
        if (this.markdownRenderer) {
            this.removeChild(this.markdownRenderer);
        }
        // Create new renderer
        this.markdownRenderer = new MarkdownRendererComponent(this.app, this.contentEl, this.task.filePath);
        this.addChild(this.markdownRenderer);
        // Render the markdown content (use originalMarkdown or just description)
        // Using originalMarkdown might be too much, maybe just the description part?
        this.markdownRenderer.render(this.task.content || this.task.originalMarkdown);
    }
    renderMetadata() {
        this.metadataEl.empty();
        const metadata = this.task.metadata || {};
        // Display dates (similar to TaskListItemComponent)
        if (!this.task.completed) {
            if (metadata.dueDate)
                this.renderDueDate();
            // Add scheduled, start dates if needed
        }
        else {
            if (metadata.completedDate)
                this.renderCompletionDate();
            // Add created date if needed
        }
        // Project (if not grouped by project already) - Kanban might inherently group by status
        if (getEffectiveProject(this.task))
            this.renderProject();
        // Tags
        if (metadata.tags && metadata.tags.length > 0)
            this.renderTags();
        // Priority
        if (metadata.priority)
            this.renderPriority();
    }
    renderDueDate() {
        const dueEl = this.metadataEl.createEl("div", {
            cls: ["task-date", "task-due-date"],
        });
        const metadata = this.task.metadata || {};
        const dueDate = new Date(metadata.dueDate || "");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        let dateText = "";
        if (dueDate.getTime() < today.getTime()) {
            dateText = "Overdue";
            dueEl.classList.add("task-overdue");
        }
        else if (dueDate.getTime() === today.getTime()) {
            dateText = "Today";
            dueEl.classList.add("task-due-today");
        }
        else if (dueDate.getTime() === tomorrow.getTime()) {
            dateText = "Tomorrow";
        }
        else {
            dateText = dueDate.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
            });
        }
        dueEl.textContent = `${dateText}`;
        dueEl.setAttribute("aria-label", `Due: ${dueDate.toLocaleDateString()}`);
    }
    renderCompletionDate() {
        const completedEl = this.metadataEl.createEl("div", {
            cls: ["task-date", "task-done-date"],
        });
        const metadata = this.task.metadata || {};
        const completedDate = new Date(metadata.completedDate || "");
        completedEl.textContent = `Done: ${completedDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
        completedEl.setAttribute("aria-label", `Completed: ${completedDate.toLocaleDateString()}`);
    }
    renderProject() {
        const effectiveProject = getEffectiveProject(this.task);
        if (!effectiveProject)
            return;
        const projectEl = this.metadataEl.createEl("div", {
            cls: ["task-project", "clickable-metadata"],
        });
        // Add visual indicator for tgProject
        const metadata = this.task.metadata || {};
        if (!metadata.project && metadata.tgProject) {
            projectEl.addClass("task-project-tg");
            projectEl.title = `Project from ${metadata.tgProject.type}: ${metadata.tgProject.source || ""}`;
        }
        projectEl.textContent = effectiveProject;
        projectEl.setAttribute("aria-label", `Project: ${effectiveProject}`);
        // Make project clickable for filtering
        this.registerDomEvent(projectEl, "click", (ev) => {
            ev.stopPropagation();
            if (this.params.onFilterApply && effectiveProject) {
                this.params.onFilterApply("project", effectiveProject);
            }
        });
    }
    renderTags() {
        const tagsContainer = this.metadataEl.createEl("div", {
            cls: "task-tags-container",
        });
        const metadata = this.task.metadata || {};
        (metadata.tags || []).forEach((tag) => {
            // Skip non-string tags
            if (typeof tag !== "string") {
                return;
            }
            const tagEl = tagsContainer.createEl("span", {
                cls: ["task-tag", "clickable-metadata"],
                text: tag.startsWith("#") ? tag : `#${tag}`,
            });
            // Add support for colored tags plugin
            const tagName = tag.replace("#", "");
            tagEl.setAttribute("data-tag-name", tagName);
            // Check if colored tags plugin is available and apply colors
            this.applyTagColor(tagEl, tagName);
            // Make tag clickable for filtering
            this.registerDomEvent(tagEl, "click", (ev) => {
                ev.stopPropagation();
                if (this.params.onFilterApply) {
                    this.params.onFilterApply("tag", tag);
                }
            });
        });
    }
    renderPriority() {
        const metadata = this.task.metadata || {};
        const sanitizedPriority = sanitizePriorityForClass(metadata.priority);
        const classes = ["task-priority", "clickable-metadata"];
        if (sanitizedPriority) {
            classes.push(`priority-${sanitizedPriority}`);
        }
        const priorityEl = this.metadataEl.createDiv({ cls: classes });
        priorityEl.textContent = `${"!".repeat(metadata.priority || 0)}`;
        priorityEl.setAttribute("aria-label", `Priority ${metadata.priority}`);
        // Make priority clickable for filtering
        this.registerDomEvent(priorityEl, "click", (ev) => {
            ev.stopPropagation();
            if (this.params.onFilterApply && metadata.priority) {
                // Convert numeric priority to icon representation for filter compatibility
                const priorityIcon = this.getPriorityIcon(metadata.priority);
                this.params.onFilterApply("priority", priorityIcon);
            }
        });
    }
    getPriorityIcon(priority) {
        const PRIORITY_ICONS = {
            5: "🔺",
            4: "⏫",
            3: "🔼",
            2: "🔽",
            1: "⏬",
        };
        return PRIORITY_ICONS[priority] || priority.toString();
    }
    applyTagColor(tagEl, tagName) {
        // Check if colored tags plugin is available
        // @ts-ignore - accessing global app for plugin check
        const coloredTagsPlugin = this.app.plugins.plugins["colored-tags"];
        if (coloredTagsPlugin && coloredTagsPlugin.settings) {
            const tagColors = coloredTagsPlugin.settings.tags;
            if (tagColors && tagColors[tagName]) {
                const color = tagColors[tagName];
                tagEl.style.setProperty("--tag-color", color);
                tagEl.classList.add("colored-tag");
            }
        }
        // Fallback: check for CSS custom properties set by other tag color plugins
        const computedStyle = getComputedStyle(document.body);
        const tagColorVar = computedStyle.getPropertyValue(`--tag-color-${tagName}`);
        if (tagColorVar) {
            tagEl.style.setProperty("--tag-color", tagColorVar);
            tagEl.classList.add("colored-tag");
        }
    }
    getTask() {
        return this.task;
    }
    // Optional: Method to update card display if task data changes
    updateTask(newTask) {
        var _a, _b;
        const oldTask = this.task;
        this.task = newTask;
        const oldMetadata = oldTask.metadata || {};
        const newMetadata = newTask.metadata || {};
        // Update classes
        if (oldTask.completed !== newTask.completed) {
            this.element.classList.toggle("task-completed", newTask.completed);
        }
        if (oldMetadata.priority !== newMetadata.priority) {
            if (oldMetadata.priority) {
                const oldSanitized = sanitizePriorityForClass(oldMetadata.priority);
                if (oldSanitized) {
                    this.element.classList.remove(`priority-${oldSanitized}`);
                }
            }
            if (newMetadata.priority) {
                const newSanitized = sanitizePriorityForClass(newMetadata.priority);
                if (newSanitized) {
                    this.element.classList.add(`priority-${newSanitized}`);
                }
            }
        }
        // Re-render content and metadata if needed
        if (oldTask.originalMarkdown !== newTask.originalMarkdown ||
            oldTask.content !== newTask.content) {
            // Adjust condition as needed
            this.renderMarkdown();
        }
        // Check if metadata-relevant fields changed
        if (oldMetadata.dueDate !== newMetadata.dueDate ||
            oldMetadata.completedDate !== newMetadata.completedDate ||
            ((_a = oldMetadata.tags) === null || _a === void 0 ? void 0 : _a.join(",")) !== ((_b = newMetadata.tags) === null || _b === void 0 ? void 0 : _b.join(",")) || // Simple comparison
            oldMetadata.priority !== newMetadata.priority ||
            oldMetadata.project !== newMetadata.project) {
            this.renderMetadata();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2FuYmFuLWNhcmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJrYW5iYW4tY2FyZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQU8sU0FBUyxFQUFpQyxNQUFNLFVBQVUsQ0FBQztBQUV6RSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQyxDQUFDLGNBQWM7QUFHdEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDN0UsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDbkUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFdkUsTUFBTSxPQUFPLG1CQUFvQixTQUFRLFNBQVM7SUFRakQsNkRBQTZEO0lBQzdELDRDQUE0QztJQUM1QyxxRUFBcUU7SUFFckUsWUFDUyxHQUFRLEVBQ2hCLE1BQTZCLEVBQ3JCLFdBQXdCLEVBQUUsd0RBQXdEO0lBQzFGLElBQVUsRUFDRixTQVFKLEVBQUU7UUFFTixLQUFLLEVBQUUsQ0FBQztRQWRBLFFBQUcsR0FBSCxHQUFHLENBQUs7UUFFUixnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUV4QixXQUFNLEdBQU4sTUFBTSxDQVFSO1FBR04sSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDbEIsQ0FBQztJQUVRLE1BQU07UUFDZCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDO1lBQ3pDLEdBQUcsRUFBRSxnQkFBZ0I7WUFDckIsSUFBSSxFQUFFLEVBQUUsY0FBYyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFO1NBQ3RDLENBQUMsQ0FBQztRQUVILElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUU7WUFDeEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFT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QUFDLE9BQU8sRUFDbEM7WUFDRCw2QkFBNkI7WUFDN0IsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1NBQ3RCO1FBQ0QsNENBQTRDO1FBQzVDLElBQ0MsV0FBVyxDQUFDLE9BQU8sS0FBSyxXQUFXLENBQUMsT0FBTztZQUMzQyxXQUFXLENBQUMsYUFBYSxLQUFLLFdBQVcsQ0FBQyxhQUFhO1lBQ3ZELENBQUEsTUFBQSxXQUFXLENBQUMsSUFBSSwwQ0FBRSxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQUssTUFBQSxXQUFXLENBQUMsSUFBSSwwQ0FBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUEsSUFBSSxvQkFBb0I7WUFDbkYsV0FBVyxDQUFDLFFBQVEsS0FBSyxXQUFXLENBQUMsUUFBUTtZQUM3QyxXQUFXLENBQUMsT0FBTyxLQUFLLFdBQVcsQ0FBQyxPQUFPLEVBQzFDO1lBQ0QsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1NBQ3RCO0lBQ0YsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwLCBDb21wb25lbnQsIE1hcmtkb3duUmVuZGVyZXIsIE1lbnUsIFRGaWxlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiQC90eXBlcy90YXNrXCI7IC8vIEFkanVzdCBwYXRoXHJcbmltcG9ydCB7IE1hcmtkb3duUmVuZGVyZXJDb21wb25lbnQgfSBmcm9tIFwiQC9jb21wb25lbnRzL3VpL3JlbmRlcmVycy9NYXJrZG93blJlbmRlcmVyXCI7IC8vIEFkanVzdCBwYXRoXHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjsgLy8gQWRqdXN0IHBhdGhcclxuaW1wb3J0IHsgS2FuYmFuU3BlY2lmaWNDb25maWcgfSBmcm9tIFwiQC9jb21tb24vc2V0dGluZy1kZWZpbml0aW9uXCI7XHJcbmltcG9ydCB7IGNyZWF0ZVRhc2tDaGVja2JveCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay92aWV3L2RldGFpbHNcIjtcclxuaW1wb3J0IHsgZ2V0RWZmZWN0aXZlUHJvamVjdCB9IGZyb20gXCJAL3V0aWxzL3Rhc2svdGFzay1vcGVyYXRpb25zXCI7XHJcbmltcG9ydCB7IHNhbml0aXplUHJpb3JpdHlGb3JDbGFzcyB9IGZyb20gXCJAL3V0aWxzL3Rhc2svcHJpb3JpdHktdXRpbHNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBLYW5iYW5DYXJkQ29tcG9uZW50IGV4dGVuZHMgQ29tcG9uZW50IHtcclxuXHRwdWJsaWMgZWxlbWVudDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSB0YXNrOiBUYXNrO1xyXG5cdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblx0cHJpdmF0ZSBtYXJrZG93blJlbmRlcmVyOiBNYXJrZG93blJlbmRlcmVyQ29tcG9uZW50O1xyXG5cdHByaXZhdGUgY29udGVudEVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIG1ldGFkYXRhRWw6IEhUTUxFbGVtZW50O1xyXG5cclxuXHQvLyBFdmVudHMgKE9wdGlvbmFsLCBjb3VsZCBiZSBoYW5kbGVkIGJ5IERyYWdNYW5hZ2VyIG9yIHZpZXcpXHJcblx0Ly8gcHVibGljIG9uQ2FyZENsaWNrOiAodGFzazogVGFzaykgPT4gdm9pZDtcclxuXHQvLyBwdWJsaWMgb25DYXJkQ29udGV4dE1lbnU6IChldmVudDogTW91c2VFdmVudCwgdGFzazogVGFzaykgPT4gdm9pZDtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwcml2YXRlIGFwcDogQXBwLFxyXG5cdFx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRwcml2YXRlIGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCwgLy8gVGhlIGNvbHVtbidzIGNvbnRlbnRFbCB3aGVyZSB0aGUgY2FyZCBzaG91bGQgYmUgYWRkZWRcclxuXHRcdHRhc2s6IFRhc2ssXHJcblx0XHRwcml2YXRlIHBhcmFtczoge1xyXG5cdFx0XHRvblRhc2tTZWxlY3RlZD86ICh0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdFx0XHRvblRhc2tDb21wbGV0ZWQ/OiAodGFzazogVGFzaykgPT4gdm9pZDtcclxuXHRcdFx0b25UYXNrQ29udGV4dE1lbnU/OiAoZXY6IE1vdXNlRXZlbnQsIHRhc2s6IFRhc2spID0+IHZvaWQ7XHJcblx0XHRcdG9uRmlsdGVyQXBwbHk/OiAoXHJcblx0XHRcdFx0ZmlsdGVyVHlwZTogc3RyaW5nLFxyXG5cdFx0XHRcdHZhbHVlOiBzdHJpbmcgfCBudW1iZXIgfCBzdHJpbmdbXVxyXG5cdFx0XHQpID0+IHZvaWQ7XHJcblx0XHR9ID0ge31cclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuXHRcdHRoaXMudGFzayA9IHRhc2s7XHJcblx0fVxyXG5cclxuXHRvdmVycmlkZSBvbmxvYWQoKTogdm9pZCB7XHJcblx0XHR0aGlzLmVsZW1lbnQgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ0Zy1rYW5iYW4tY2FyZFwiLFxyXG5cdFx0XHRhdHRyOiB7IFwiZGF0YS10YXNrLWlkXCI6IHRoaXMudGFzay5pZCB9LFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0aWYgKHRoaXMudGFzay5jb21wbGV0ZWQpIHtcclxuXHRcdFx0dGhpcy5lbGVtZW50LmNsYXNzTGlzdC5hZGQoXCJ0YXNrLWNvbXBsZXRlZFwiKTtcclxuXHRcdH1cclxuXHRcdGNvbnN0IG1ldGFkYXRhID0gdGhpcy50YXNrLm1ldGFkYXRhIHx8IHt9O1xyXG5cdFx0aWYgKG1ldGFkYXRhLnByaW9yaXR5KSB7XHJcblx0XHRcdGNvbnN0IHNhbml0aXplZFByaW9yaXR5ID0gc2FuaXRpemVQcmlvcml0eUZvckNsYXNzKFxyXG5cdFx0XHRcdG1ldGFkYXRhLnByaW9yaXR5XHJcblx0XHRcdCk7XHJcblx0XHRcdGlmIChzYW5pdGl6ZWRQcmlvcml0eSkge1xyXG5cdFx0XHRcdHRoaXMuZWxlbWVudC5jbGFzc0xpc3QuYWRkKGBwcmlvcml0eS0ke3Nhbml0aXplZFByaW9yaXR5fWApO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gLS0tIENhcmQgQ29udGVudCAtLS1cclxuXHRcdHRoaXMuZWxlbWVudC5jcmVhdGVEaXYoXHJcblx0XHRcdHtcclxuXHRcdFx0XHRjbHM6IFwidGcta2FuYmFuLWNhcmQtY29udGFpbmVyXCIsXHJcblx0XHRcdH0sXHJcblx0XHRcdChlbCkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IGNoZWNrYm94ID0gY3JlYXRlVGFza0NoZWNrYm94KFxyXG5cdFx0XHRcdFx0dGhpcy50YXNrLnN0YXR1cyxcclxuXHRcdFx0XHRcdHRoaXMudGFzayxcclxuXHRcdFx0XHRcdGVsXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGNoZWNrYm94LCBcImNsaWNrXCIsIChldikgPT4ge1xyXG5cdFx0XHRcdFx0ZXYuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblxyXG5cdFx0XHRcdFx0aWYgKHRoaXMucGFyYW1zPy5vblRhc2tDb21wbGV0ZWQpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5wYXJhbXMub25UYXNrQ29tcGxldGVkKHRoaXMudGFzayk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0aWYgKHRoaXMudGFzay5zdGF0dXMgPT09IFwiIFwiKSB7XHJcblx0XHRcdFx0XHRcdGNoZWNrYm94LmNoZWNrZWQgPSB0cnVlO1xyXG5cdFx0XHRcdFx0XHRjaGVja2JveC5kYXRhc2V0LnRhc2sgPSBcInhcIjtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0KFxyXG5cdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy52aWV3Q29uZmlndXJhdGlvbi5maW5kKFxyXG5cdFx0XHRcdFx0XHRcdCh2KSA9PiB2LmlkID09PSBcImthbmJhblwiXHJcblx0XHRcdFx0XHRcdCk/LnNwZWNpZmljQ29uZmlnIGFzIEthbmJhblNwZWNpZmljQ29uZmlnXHJcblx0XHRcdFx0XHQpPy5zaG93Q2hlY2tib3hcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdGNoZWNrYm94LnNob3coKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0Y2hlY2tib3guaGlkZSgpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0dGhpcy5jb250ZW50RWwgPSBlbC5jcmVhdGVEaXYoXCJ0Zy1rYW5iYW4tY2FyZC1jb250ZW50XCIpO1xyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cdFx0dGhpcy5yZW5kZXJNYXJrZG93bigpO1xyXG5cclxuXHRcdC8vIC0tLSBDYXJkIE1ldGFkYXRhIC0tLVxyXG5cdFx0dGhpcy5tZXRhZGF0YUVsID0gdGhpcy5lbGVtZW50LmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ0Zy1rYW5iYW4tY2FyZC1tZXRhZGF0YVwiLFxyXG5cdFx0fSk7XHJcblx0XHR0aGlzLnJlbmRlck1ldGFkYXRhKCk7XHJcblxyXG5cdFx0Ly8gLS0tIENvbnRleHQgTWVudSAtLS1cclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudCh0aGlzLmVsZW1lbnQsIFwiY29udGV4dG1lbnVcIiwgKGV2ZW50KSA9PiB7XHJcblx0XHRcdHRoaXMucGFyYW1zLm9uVGFza0NvbnRleHRNZW51Py4oZXZlbnQsIHRoaXMudGFzayk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdG92ZXJyaWRlIG9udW5sb2FkKCk6IHZvaWQge1xyXG5cdFx0dGhpcy5lbGVtZW50Py5yZW1vdmUoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyTWFya2Rvd24oKSB7XHJcblx0XHR0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyAvLyBDbGVhciBwcmV2aW91cyBjb250ZW50XHJcblx0XHRpZiAodGhpcy5tYXJrZG93blJlbmRlcmVyKSB7XHJcblx0XHRcdHRoaXMucmVtb3ZlQ2hpbGQodGhpcy5tYXJrZG93blJlbmRlcmVyKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDcmVhdGUgbmV3IHJlbmRlcmVyXHJcblx0XHR0aGlzLm1hcmtkb3duUmVuZGVyZXIgPSBuZXcgTWFya2Rvd25SZW5kZXJlckNvbXBvbmVudChcclxuXHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdHRoaXMuY29udGVudEVsLFxyXG5cdFx0XHR0aGlzLnRhc2suZmlsZVBhdGhcclxuXHRcdCk7XHJcblx0XHR0aGlzLmFkZENoaWxkKHRoaXMubWFya2Rvd25SZW5kZXJlcik7XHJcblxyXG5cdFx0Ly8gUmVuZGVyIHRoZSBtYXJrZG93biBjb250ZW50ICh1c2Ugb3JpZ2luYWxNYXJrZG93biBvciBqdXN0IGRlc2NyaXB0aW9uKVxyXG5cdFx0Ly8gVXNpbmcgb3JpZ2luYWxNYXJrZG93biBtaWdodCBiZSB0b28gbXVjaCwgbWF5YmUganVzdCB0aGUgZGVzY3JpcHRpb24gcGFydD9cclxuXHRcdHRoaXMubWFya2Rvd25SZW5kZXJlci5yZW5kZXIoXHJcblx0XHRcdHRoaXMudGFzay5jb250ZW50IHx8IHRoaXMudGFzay5vcmlnaW5hbE1hcmtkb3duXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSByZW5kZXJNZXRhZGF0YSgpIHtcclxuXHRcdHRoaXMubWV0YWRhdGFFbC5lbXB0eSgpO1xyXG5cclxuXHRcdGNvbnN0IG1ldGFkYXRhID0gdGhpcy50YXNrLm1ldGFkYXRhIHx8IHt9O1xyXG5cdFx0Ly8gRGlzcGxheSBkYXRlcyAoc2ltaWxhciB0byBUYXNrTGlzdEl0ZW1Db21wb25lbnQpXHJcblx0XHRpZiAoIXRoaXMudGFzay5jb21wbGV0ZWQpIHtcclxuXHRcdFx0aWYgKG1ldGFkYXRhLmR1ZURhdGUpIHRoaXMucmVuZGVyRHVlRGF0ZSgpO1xyXG5cdFx0XHQvLyBBZGQgc2NoZWR1bGVkLCBzdGFydCBkYXRlcyBpZiBuZWVkZWRcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGlmIChtZXRhZGF0YS5jb21wbGV0ZWREYXRlKSB0aGlzLnJlbmRlckNvbXBsZXRpb25EYXRlKCk7XHJcblx0XHRcdC8vIEFkZCBjcmVhdGVkIGRhdGUgaWYgbmVlZGVkXHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUHJvamVjdCAoaWYgbm90IGdyb3VwZWQgYnkgcHJvamVjdCBhbHJlYWR5KSAtIEthbmJhbiBtaWdodCBpbmhlcmVudGx5IGdyb3VwIGJ5IHN0YXR1c1xyXG5cdFx0aWYgKGdldEVmZmVjdGl2ZVByb2plY3QodGhpcy50YXNrKSkgdGhpcy5yZW5kZXJQcm9qZWN0KCk7XHJcblxyXG5cdFx0Ly8gVGFnc1xyXG5cdFx0aWYgKG1ldGFkYXRhLnRhZ3MgJiYgbWV0YWRhdGEudGFncy5sZW5ndGggPiAwKSB0aGlzLnJlbmRlclRhZ3MoKTtcclxuXHJcblx0XHQvLyBQcmlvcml0eVxyXG5cdFx0aWYgKG1ldGFkYXRhLnByaW9yaXR5KSB0aGlzLnJlbmRlclByaW9yaXR5KCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbmRlckR1ZURhdGUoKSB7XHJcblx0XHRjb25zdCBkdWVFbCA9IHRoaXMubWV0YWRhdGFFbC5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdGNsczogW1widGFzay1kYXRlXCIsIFwidGFzay1kdWUtZGF0ZVwiXSxcclxuXHRcdH0pO1xyXG5cdFx0Y29uc3QgbWV0YWRhdGEgPSB0aGlzLnRhc2subWV0YWRhdGEgfHwge307XHJcblx0XHRjb25zdCBkdWVEYXRlID0gbmV3IERhdGUobWV0YWRhdGEuZHVlRGF0ZSB8fCBcIlwiKTtcclxuXHRcdGNvbnN0IHRvZGF5ID0gbmV3IERhdGUoKTtcclxuXHRcdHRvZGF5LnNldEhvdXJzKDAsIDAsIDAsIDApO1xyXG5cdFx0Y29uc3QgdG9tb3Jyb3cgPSBuZXcgRGF0ZSh0b2RheSk7XHJcblx0XHR0b21vcnJvdy5zZXREYXRlKHRvbW9ycm93LmdldERhdGUoKSArIDEpO1xyXG5cclxuXHRcdGxldCBkYXRlVGV4dCA9IFwiXCI7XHJcblx0XHRpZiAoZHVlRGF0ZS5nZXRUaW1lKCkgPCB0b2RheS5nZXRUaW1lKCkpIHtcclxuXHRcdFx0ZGF0ZVRleHQgPSBcIk92ZXJkdWVcIjtcclxuXHRcdFx0ZHVlRWwuY2xhc3NMaXN0LmFkZChcInRhc2stb3ZlcmR1ZVwiKTtcclxuXHRcdH0gZWxzZSBpZiAoZHVlRGF0ZS5nZXRUaW1lKCkgPT09IHRvZGF5LmdldFRpbWUoKSkge1xyXG5cdFx0XHRkYXRlVGV4dCA9IFwiVG9kYXlcIjtcclxuXHRcdFx0ZHVlRWwuY2xhc3NMaXN0LmFkZChcInRhc2stZHVlLXRvZGF5XCIpO1xyXG5cdFx0fSBlbHNlIGlmIChkdWVEYXRlLmdldFRpbWUoKSA9PT0gdG9tb3Jyb3cuZ2V0VGltZSgpKSB7XHJcblx0XHRcdGRhdGVUZXh0ID0gXCJUb21vcnJvd1wiO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0ZGF0ZVRleHQgPSBkdWVEYXRlLnRvTG9jYWxlRGF0ZVN0cmluZyh1bmRlZmluZWQsIHtcclxuXHRcdFx0XHRtb250aDogXCJzaG9ydFwiLFxyXG5cdFx0XHRcdGRheTogXCJudW1lcmljXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdFx0ZHVlRWwudGV4dENvbnRlbnQgPSBgJHtkYXRlVGV4dH1gO1xyXG5cdFx0ZHVlRWwuc2V0QXR0cmlidXRlKFxyXG5cdFx0XHRcImFyaWEtbGFiZWxcIixcclxuXHRcdFx0YER1ZTogJHtkdWVEYXRlLnRvTG9jYWxlRGF0ZVN0cmluZygpfWBcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbmRlckNvbXBsZXRpb25EYXRlKCkge1xyXG5cdFx0Y29uc3QgY29tcGxldGVkRWwgPSB0aGlzLm1ldGFkYXRhRWwuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHRjbHM6IFtcInRhc2stZGF0ZVwiLCBcInRhc2stZG9uZS1kYXRlXCJdLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCBtZXRhZGF0YSA9IHRoaXMudGFzay5tZXRhZGF0YSB8fCB7fTtcclxuXHRcdGNvbnN0IGNvbXBsZXRlZERhdGUgPSBuZXcgRGF0ZShtZXRhZGF0YS5jb21wbGV0ZWREYXRlIHx8IFwiXCIpO1xyXG5cdFx0Y29tcGxldGVkRWwudGV4dENvbnRlbnQgPSBgRG9uZTogJHtjb21wbGV0ZWREYXRlLnRvTG9jYWxlRGF0ZVN0cmluZyhcclxuXHRcdFx0dW5kZWZpbmVkLFxyXG5cdFx0XHR7IG1vbnRoOiBcInNob3J0XCIsIGRheTogXCJudW1lcmljXCIgfVxyXG5cdFx0KX1gO1xyXG5cdFx0Y29tcGxldGVkRWwuc2V0QXR0cmlidXRlKFxyXG5cdFx0XHRcImFyaWEtbGFiZWxcIixcclxuXHRcdFx0YENvbXBsZXRlZDogJHtjb21wbGV0ZWREYXRlLnRvTG9jYWxlRGF0ZVN0cmluZygpfWBcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbmRlclByb2plY3QoKSB7XHJcblx0XHRjb25zdCBlZmZlY3RpdmVQcm9qZWN0ID0gZ2V0RWZmZWN0aXZlUHJvamVjdCh0aGlzLnRhc2spO1xyXG5cdFx0aWYgKCFlZmZlY3RpdmVQcm9qZWN0KSByZXR1cm47XHJcblxyXG5cdFx0Y29uc3QgcHJvamVjdEVsID0gdGhpcy5tZXRhZGF0YUVsLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0Y2xzOiBbXCJ0YXNrLXByb2plY3RcIiwgXCJjbGlja2FibGUtbWV0YWRhdGFcIl0sXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBBZGQgdmlzdWFsIGluZGljYXRvciBmb3IgdGdQcm9qZWN0XHJcblx0XHRjb25zdCBtZXRhZGF0YSA9IHRoaXMudGFzay5tZXRhZGF0YSB8fCB7fTtcclxuXHRcdGlmICghbWV0YWRhdGEucHJvamVjdCAmJiBtZXRhZGF0YS50Z1Byb2plY3QpIHtcclxuXHRcdFx0cHJvamVjdEVsLmFkZENsYXNzKFwidGFzay1wcm9qZWN0LXRnXCIpO1xyXG5cdFx0XHRwcm9qZWN0RWwudGl0bGUgPSBgUHJvamVjdCBmcm9tICR7bWV0YWRhdGEudGdQcm9qZWN0LnR5cGV9OiAke1xyXG5cdFx0XHRcdG1ldGFkYXRhLnRnUHJvamVjdC5zb3VyY2UgfHwgXCJcIlxyXG5cdFx0XHR9YDtcclxuXHRcdH1cclxuXHJcblx0XHRwcm9qZWN0RWwudGV4dENvbnRlbnQgPSBlZmZlY3RpdmVQcm9qZWN0O1xyXG5cdFx0cHJvamVjdEVsLnNldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIiwgYFByb2plY3Q6ICR7ZWZmZWN0aXZlUHJvamVjdH1gKTtcclxuXHJcblx0XHQvLyBNYWtlIHByb2plY3QgY2xpY2thYmxlIGZvciBmaWx0ZXJpbmdcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChwcm9qZWN0RWwsIFwiY2xpY2tcIiwgKGV2KSA9PiB7XHJcblx0XHRcdGV2LnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cdFx0XHRpZiAodGhpcy5wYXJhbXMub25GaWx0ZXJBcHBseSAmJiBlZmZlY3RpdmVQcm9qZWN0KSB7XHJcblx0XHRcdFx0dGhpcy5wYXJhbXMub25GaWx0ZXJBcHBseShcInByb2plY3RcIiwgZWZmZWN0aXZlUHJvamVjdCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSByZW5kZXJUYWdzKCkge1xyXG5cdFx0Y29uc3QgdGFnc0NvbnRhaW5lciA9IHRoaXMubWV0YWRhdGFFbC5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdGNsczogXCJ0YXNrLXRhZ3MtY29udGFpbmVyXCIsXHJcblx0XHR9KTtcclxuXHRcdGNvbnN0IG1ldGFkYXRhID0gdGhpcy50YXNrLm1ldGFkYXRhIHx8IHt9O1xyXG5cdFx0KG1ldGFkYXRhLnRhZ3MgfHwgW10pLmZvckVhY2goKHRhZykgPT4ge1xyXG5cdFx0XHQvLyBTa2lwIG5vbi1zdHJpbmcgdGFnc1xyXG5cdFx0XHRpZiAodHlwZW9mIHRhZyAhPT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgdGFnRWwgPSB0YWdzQ29udGFpbmVyLmNyZWF0ZUVsKFwic3BhblwiLCB7XHJcblx0XHRcdFx0Y2xzOiBbXCJ0YXNrLXRhZ1wiLCBcImNsaWNrYWJsZS1tZXRhZGF0YVwiXSxcclxuXHRcdFx0XHR0ZXh0OiB0YWcuc3RhcnRzV2l0aChcIiNcIikgPyB0YWcgOiBgIyR7dGFnfWAsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQWRkIHN1cHBvcnQgZm9yIGNvbG9yZWQgdGFncyBwbHVnaW5cclxuXHRcdFx0Y29uc3QgdGFnTmFtZSA9IHRhZy5yZXBsYWNlKFwiI1wiLCBcIlwiKTtcclxuXHRcdFx0dGFnRWwuc2V0QXR0cmlidXRlKFwiZGF0YS10YWctbmFtZVwiLCB0YWdOYW1lKTtcclxuXHJcblx0XHRcdC8vIENoZWNrIGlmIGNvbG9yZWQgdGFncyBwbHVnaW4gaXMgYXZhaWxhYmxlIGFuZCBhcHBseSBjb2xvcnNcclxuXHRcdFx0dGhpcy5hcHBseVRhZ0NvbG9yKHRhZ0VsLCB0YWdOYW1lKTtcclxuXHJcblx0XHRcdC8vIE1ha2UgdGFnIGNsaWNrYWJsZSBmb3IgZmlsdGVyaW5nXHJcblx0XHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudCh0YWdFbCwgXCJjbGlja1wiLCAoZXYpID0+IHtcclxuXHRcdFx0XHRldi5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHRcdFx0XHRpZiAodGhpcy5wYXJhbXMub25GaWx0ZXJBcHBseSkge1xyXG5cdFx0XHRcdFx0dGhpcy5wYXJhbXMub25GaWx0ZXJBcHBseShcInRhZ1wiLCB0YWcpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyUHJpb3JpdHkoKSB7XHJcblx0XHRjb25zdCBtZXRhZGF0YSA9IHRoaXMudGFzay5tZXRhZGF0YSB8fCB7fTtcclxuXHRcdGNvbnN0IHNhbml0aXplZFByaW9yaXR5ID0gc2FuaXRpemVQcmlvcml0eUZvckNsYXNzKG1ldGFkYXRhLnByaW9yaXR5KTtcclxuXHRcdGNvbnN0IGNsYXNzZXMgPSBbXCJ0YXNrLXByaW9yaXR5XCIsIFwiY2xpY2thYmxlLW1ldGFkYXRhXCJdO1xyXG5cdFx0aWYgKHNhbml0aXplZFByaW9yaXR5KSB7XHJcblx0XHRcdGNsYXNzZXMucHVzaChgcHJpb3JpdHktJHtzYW5pdGl6ZWRQcmlvcml0eX1gKTtcclxuXHRcdH1cclxuXHRcdGNvbnN0IHByaW9yaXR5RWwgPSB0aGlzLm1ldGFkYXRhRWwuY3JlYXRlRGl2KHsgY2xzOiBjbGFzc2VzIH0pO1xyXG5cdFx0cHJpb3JpdHlFbC50ZXh0Q29udGVudCA9IGAke1wiIVwiLnJlcGVhdChtZXRhZGF0YS5wcmlvcml0eSB8fCAwKX1gO1xyXG5cdFx0cHJpb3JpdHlFbC5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIGBQcmlvcml0eSAke21ldGFkYXRhLnByaW9yaXR5fWApO1xyXG5cclxuXHRcdC8vIE1ha2UgcHJpb3JpdHkgY2xpY2thYmxlIGZvciBmaWx0ZXJpbmdcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChwcmlvcml0eUVsLCBcImNsaWNrXCIsIChldikgPT4ge1xyXG5cdFx0XHRldi5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHRcdFx0aWYgKHRoaXMucGFyYW1zLm9uRmlsdGVyQXBwbHkgJiYgbWV0YWRhdGEucHJpb3JpdHkpIHtcclxuXHRcdFx0XHQvLyBDb252ZXJ0IG51bWVyaWMgcHJpb3JpdHkgdG8gaWNvbiByZXByZXNlbnRhdGlvbiBmb3IgZmlsdGVyIGNvbXBhdGliaWxpdHlcclxuXHRcdFx0XHRjb25zdCBwcmlvcml0eUljb24gPSB0aGlzLmdldFByaW9yaXR5SWNvbihtZXRhZGF0YS5wcmlvcml0eSk7XHJcblx0XHRcdFx0dGhpcy5wYXJhbXMub25GaWx0ZXJBcHBseShcInByaW9yaXR5XCIsIHByaW9yaXR5SWNvbik7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBnZXRQcmlvcml0eUljb24ocHJpb3JpdHk6IG51bWJlcik6IHN0cmluZyB7XHJcblx0XHRjb25zdCBQUklPUklUWV9JQ09OUzogUmVjb3JkPG51bWJlciwgc3RyaW5nPiA9IHtcclxuXHRcdFx0NTogXCLwn5S6XCIsXHJcblx0XHRcdDQ6IFwi4o+rXCIsXHJcblx0XHRcdDM6IFwi8J+UvFwiLFxyXG5cdFx0XHQyOiBcIvCflL1cIixcclxuXHRcdFx0MTogXCLij6xcIixcclxuXHRcdH07XHJcblx0XHRyZXR1cm4gUFJJT1JJVFlfSUNPTlNbcHJpb3JpdHldIHx8IHByaW9yaXR5LnRvU3RyaW5nKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFwcGx5VGFnQ29sb3IodGFnRWw6IEhUTUxFbGVtZW50LCB0YWdOYW1lOiBzdHJpbmcpIHtcclxuXHRcdC8vIENoZWNrIGlmIGNvbG9yZWQgdGFncyBwbHVnaW4gaXMgYXZhaWxhYmxlXHJcblx0XHQvLyBAdHMtaWdub3JlIC0gYWNjZXNzaW5nIGdsb2JhbCBhcHAgZm9yIHBsdWdpbiBjaGVja1xyXG5cdFx0Y29uc3QgY29sb3JlZFRhZ3NQbHVnaW4gPSB0aGlzLmFwcC5wbHVnaW5zLnBsdWdpbnNbXCJjb2xvcmVkLXRhZ3NcIl07XHJcblxyXG5cdFx0aWYgKGNvbG9yZWRUYWdzUGx1Z2luICYmIGNvbG9yZWRUYWdzUGx1Z2luLnNldHRpbmdzKSB7XHJcblx0XHRcdGNvbnN0IHRhZ0NvbG9ycyA9IGNvbG9yZWRUYWdzUGx1Z2luLnNldHRpbmdzLnRhZ3M7XHJcblx0XHRcdGlmICh0YWdDb2xvcnMgJiYgdGFnQ29sb3JzW3RhZ05hbWVdKSB7XHJcblx0XHRcdFx0Y29uc3QgY29sb3IgPSB0YWdDb2xvcnNbdGFnTmFtZV07XHJcblx0XHRcdFx0dGFnRWwuc3R5bGUuc2V0UHJvcGVydHkoXCItLXRhZy1jb2xvclwiLCBjb2xvcik7XHJcblx0XHRcdFx0dGFnRWwuY2xhc3NMaXN0LmFkZChcImNvbG9yZWQtdGFnXCIpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRmFsbGJhY2s6IGNoZWNrIGZvciBDU1MgY3VzdG9tIHByb3BlcnRpZXMgc2V0IGJ5IG90aGVyIHRhZyBjb2xvciBwbHVnaW5zXHJcblx0XHRjb25zdCBjb21wdXRlZFN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZShkb2N1bWVudC5ib2R5KTtcclxuXHRcdGNvbnN0IHRhZ0NvbG9yVmFyID0gY29tcHV0ZWRTdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKFxyXG5cdFx0XHRgLS10YWctY29sb3ItJHt0YWdOYW1lfWBcclxuXHRcdCk7XHJcblx0XHRpZiAodGFnQ29sb3JWYXIpIHtcclxuXHRcdFx0dGFnRWwuc3R5bGUuc2V0UHJvcGVydHkoXCItLXRhZy1jb2xvclwiLCB0YWdDb2xvclZhcik7XHJcblx0XHRcdHRhZ0VsLmNsYXNzTGlzdC5hZGQoXCJjb2xvcmVkLXRhZ1wiKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHB1YmxpYyBnZXRUYXNrKCk6IFRhc2sge1xyXG5cdFx0cmV0dXJuIHRoaXMudGFzaztcclxuXHR9XHJcblxyXG5cdC8vIE9wdGlvbmFsOiBNZXRob2QgdG8gdXBkYXRlIGNhcmQgZGlzcGxheSBpZiB0YXNrIGRhdGEgY2hhbmdlc1xyXG5cdHB1YmxpYyB1cGRhdGVUYXNrKG5ld1Rhc2s6IFRhc2spIHtcclxuXHRcdGNvbnN0IG9sZFRhc2sgPSB0aGlzLnRhc2s7XHJcblx0XHR0aGlzLnRhc2sgPSBuZXdUYXNrO1xyXG5cclxuXHRcdGNvbnN0IG9sZE1ldGFkYXRhID0gb2xkVGFzay5tZXRhZGF0YSB8fCB7fTtcclxuXHRcdGNvbnN0IG5ld01ldGFkYXRhID0gbmV3VGFzay5tZXRhZGF0YSB8fCB7fTtcclxuXHJcblx0XHQvLyBVcGRhdGUgY2xhc3Nlc1xyXG5cdFx0aWYgKG9sZFRhc2suY29tcGxldGVkICE9PSBuZXdUYXNrLmNvbXBsZXRlZCkge1xyXG5cdFx0XHR0aGlzLmVsZW1lbnQuY2xhc3NMaXN0LnRvZ2dsZShcInRhc2stY29tcGxldGVkXCIsIG5ld1Rhc2suY29tcGxldGVkKTtcclxuXHRcdH1cclxuXHRcdGlmIChvbGRNZXRhZGF0YS5wcmlvcml0eSAhPT0gbmV3TWV0YWRhdGEucHJpb3JpdHkpIHtcclxuXHRcdFx0aWYgKG9sZE1ldGFkYXRhLnByaW9yaXR5KSB7XHJcblx0XHRcdFx0Y29uc3Qgb2xkU2FuaXRpemVkID0gc2FuaXRpemVQcmlvcml0eUZvckNsYXNzKFxyXG5cdFx0XHRcdFx0b2xkTWV0YWRhdGEucHJpb3JpdHlcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGlmIChvbGRTYW5pdGl6ZWQpIHtcclxuXHRcdFx0XHRcdHRoaXMuZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKGBwcmlvcml0eS0ke29sZFNhbml0aXplZH1gKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKG5ld01ldGFkYXRhLnByaW9yaXR5KSB7XHJcblx0XHRcdFx0Y29uc3QgbmV3U2FuaXRpemVkID0gc2FuaXRpemVQcmlvcml0eUZvckNsYXNzKFxyXG5cdFx0XHRcdFx0bmV3TWV0YWRhdGEucHJpb3JpdHlcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGlmIChuZXdTYW5pdGl6ZWQpIHtcclxuXHRcdFx0XHRcdHRoaXMuZWxlbWVudC5jbGFzc0xpc3QuYWRkKGBwcmlvcml0eS0ke25ld1Nhbml0aXplZH1gKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZS1yZW5kZXIgY29udGVudCBhbmQgbWV0YWRhdGEgaWYgbmVlZGVkXHJcblx0XHRpZiAoXHJcblx0XHRcdG9sZFRhc2sub3JpZ2luYWxNYXJrZG93biAhPT0gbmV3VGFzay5vcmlnaW5hbE1hcmtkb3duIHx8XHJcblx0XHRcdG9sZFRhc2suY29udGVudCAhPT0gbmV3VGFzay5jb250ZW50XHJcblx0XHQpIHtcclxuXHRcdFx0Ly8gQWRqdXN0IGNvbmRpdGlvbiBhcyBuZWVkZWRcclxuXHRcdFx0dGhpcy5yZW5kZXJNYXJrZG93bigpO1xyXG5cdFx0fVxyXG5cdFx0Ly8gQ2hlY2sgaWYgbWV0YWRhdGEtcmVsZXZhbnQgZmllbGRzIGNoYW5nZWRcclxuXHRcdGlmIChcclxuXHRcdFx0b2xkTWV0YWRhdGEuZHVlRGF0ZSAhPT0gbmV3TWV0YWRhdGEuZHVlRGF0ZSB8fFxyXG5cdFx0XHRvbGRNZXRhZGF0YS5jb21wbGV0ZWREYXRlICE9PSBuZXdNZXRhZGF0YS5jb21wbGV0ZWREYXRlIHx8XHJcblx0XHRcdG9sZE1ldGFkYXRhLnRhZ3M/LmpvaW4oXCIsXCIpICE9PSBuZXdNZXRhZGF0YS50YWdzPy5qb2luKFwiLFwiKSB8fCAvLyBTaW1wbGUgY29tcGFyaXNvblxyXG5cdFx0XHRvbGRNZXRhZGF0YS5wcmlvcml0eSAhPT0gbmV3TWV0YWRhdGEucHJpb3JpdHkgfHxcclxuXHRcdFx0b2xkTWV0YWRhdGEucHJvamVjdCAhPT0gbmV3TWV0YWRhdGEucHJvamVjdFxyXG5cdFx0KSB7XHJcblx0XHRcdHRoaXMucmVuZGVyTWV0YWRhdGEoKTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuIl19