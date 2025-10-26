import { __awaiter } from "tslib";
import { Component, setIcon, Menu, MarkdownView } from "obsidian";
import { createTaskCheckbox } from "@/components/features/task/view/details";
import { MarkdownRendererComponent } from "@/components/ui/renderers/MarkdownRenderer";
import { t } from "@/translations/helper";
import { sanitizePriorityForClass } from "@/utils/task/priority-utils";
export class QuadrantCardComponent extends Component {
    constructor(app, plugin, containerEl, task, params = {}) {
        super();
        this.app = app;
        this.plugin = plugin;
        this.containerEl = containerEl;
        this.task = task;
        this.params = params;
        // Initialize markdown renderer
        this.markdownRenderer = new MarkdownRendererComponent(this.app, this.containerEl, this.task.filePath, true // hideMarks = true
        );
        this.addChild(this.markdownRenderer);
    }
    onload() {
        super.onload();
        this.render();
    }
    render() {
        this.containerEl.empty();
        this.containerEl.addClass("tg-quadrant-card");
        this.containerEl.setAttribute("data-task-id", this.task.id);
        // Add priority class for styling
        const priorityClass = this.getPriorityClass();
        if (priorityClass) {
            this.containerEl.addClass(priorityClass);
        }
        // Create card header with checkbox and actions
        this.createHeader();
        // Create task content
        this.createContent();
        // Create metadata section
        this.createMetadata();
        // Add event listeners
        this.addEventListeners();
    }
    createHeader() {
        const headerEl = this.containerEl.createDiv("tg-quadrant-card-header");
        // Task checkbox
        this.checkboxEl = headerEl.createDiv("tg-quadrant-card-checkbox");
        const checkbox = createTaskCheckbox(this.task.status, this.task, this.checkboxEl);
        // Add change event listener for checkbox
        this.registerDomEvent(checkbox, "change", () => {
            const newStatus = checkbox.checked ? "x" : " ";
            if (this.params.onTaskStatusUpdate) {
                this.params.onTaskStatusUpdate(this.task.id, newStatus);
            }
        });
        // Actions menu
        const actionsEl = headerEl.createDiv("tg-quadrant-card-actions");
        const moreBtn = actionsEl.createEl("button", {
            cls: "tg-quadrant-card-more-btn",
            attr: { "aria-label": t("More actions") },
        });
        setIcon(moreBtn, "more-horizontal");
        this.registerDomEvent(moreBtn, "click", (e) => {
            e.stopPropagation();
            this.showContextMenu(e);
        });
    }
    createContent() {
        this.contentEl = this.containerEl.createDiv("tg-quadrant-card-content");
        // Task title/content - use markdown renderer
        const titleEl = this.contentEl.createDiv("tg-quadrant-card-title");
        // Create a new markdown renderer for this specific content
        const contentRenderer = new MarkdownRendererComponent(this.app, titleEl, this.task.filePath, true // hideMarks = true
        );
        this.addChild(contentRenderer);
        // Render the task content
        contentRenderer.render(this.task.content, true);
        // Priority indicator (use the logic from listItem.ts for numeric priority)
        // See @file_context_0 for reference
        // Tags
        const tags = this.extractTags();
        if (tags.length > 0) {
            const tagsEl = this.contentEl.createDiv("tg-quadrant-card-tags");
            tags.forEach((tag) => {
                const tagEl = tagsEl.createSpan("tg-quadrant-card-tag");
                tagEl.textContent = tag;
                // Add special styling for urgent/important tags
                if (tag === "#urgent") {
                    tagEl.addClass("tg-quadrant-tag--urgent");
                }
                else if (tag === "#important") {
                    tagEl.addClass("tg-quadrant-tag--important");
                }
            });
        }
    }
    createMetadata() {
        this.metadataEl = this.containerEl.createDiv("tg-quadrant-card-metadata");
        // Due date
        const dueDate = this.getTaskDueDate();
        if (dueDate) {
            const dueDateEl = this.metadataEl.createDiv("tg-quadrant-card-due-date");
            const dueDateText = dueDateEl.createSpan("tg-quadrant-card-due-date-text");
            dueDateText.textContent = this.formatDueDate(dueDate);
            // Add urgency styling
            if (this.isDueSoon(dueDate)) {
                dueDateEl.addClass("tg-quadrant-card-due-date--urgent");
            }
            else if (this.isOverdue(dueDate)) {
                dueDateEl.addClass("tg-quadrant-card-due-date--overdue");
            }
        }
        // File info
        this.metadataEl.createDiv("tg-quadrant-card-file-info", (el) => {
            if (this.task.metadata.priority) {
                // 将优先级转换为数字
                let numericPriority;
                if (typeof this.task.metadata.priority === "string") {
                    switch (this.task.metadata.priority.toLowerCase()) {
                        case "lowest":
                            numericPriority = 1;
                            break;
                        case "low":
                            numericPriority = 2;
                            break;
                        case "medium":
                            numericPriority = 3;
                            break;
                        case "high":
                            numericPriority = 4;
                            break;
                        case "highest":
                            numericPriority = 5;
                            break;
                        default:
                            numericPriority =
                                parseInt(this.task.metadata.priority) || 1;
                            break;
                    }
                }
                else {
                    numericPriority = this.task.metadata.priority;
                }
                const sanitizedPriority = sanitizePriorityForClass(numericPriority);
                const classes = ["tg-quadrant-card-priority"];
                if (sanitizedPriority) {
                    classes.push(`priority-${sanitizedPriority}`);
                }
                const priorityEl = el.createDiv({ cls: classes });
                // 根据优先级数字显示不同数量的感叹号
                let icon = "!".repeat(numericPriority);
                priorityEl.textContent = icon;
            }
            // File name
            const fileName = el.createSpan("tg-quadrant-card-file-name");
            fileName.textContent = this.getFileName();
            // Line number
            const lineEl = el.createSpan("tg-quadrant-card-line");
            lineEl.textContent = `L${this.task.line}`;
        });
    }
    addEventListeners() {
        // Card click to select task
        this.registerDomEvent(this.containerEl, "click", (e) => {
            if (e.target === this.checkboxEl ||
                this.checkboxEl.contains(e.target)) {
                return; // Don't select when clicking checkbox
            }
            if (this.params.onTaskSelected) {
                this.params.onTaskSelected(this.task);
            }
        });
        // Right-click context menu
        this.registerDomEvent(this.containerEl, "contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.params.onTaskContextMenu) {
                this.params.onTaskContextMenu(e, this.task);
            }
            else {
                this.showContextMenu(e);
            }
        });
        // Double-click to open file
        this.registerDomEvent(this.containerEl, "dblclick", (e) => {
            e.stopPropagation();
            this.openTaskInFile();
        });
    }
    showContextMenu(e) {
        var _a, _b;
        const menu = new Menu();
        menu.addItem((item) => {
            item.setTitle(t("Open in file"))
                .setIcon("external-link")
                .onClick(() => {
                this.openTaskInFile();
            });
        });
        menu.addItem((item) => {
            item.setTitle(t("Copy task"))
                .setIcon("copy")
                .onClick(() => {
                navigator.clipboard.writeText(this.task.originalMarkdown);
            });
        });
        menu.addSeparator();
        // Check if task already has urgent or important tags (check both content and metadata)
        const hasUrgentTag = this.task.content.includes("#urgent") ||
            ((_a = this.task.metadata.tags) === null || _a === void 0 ? void 0 : _a.includes("#urgent"));
        const hasImportantTag = this.task.content.includes("#important") ||
            ((_b = this.task.metadata.tags) === null || _b === void 0 ? void 0 : _b.includes("#important"));
        if (!hasUrgentTag) {
            menu.addItem((item) => {
                item.setTitle(t("Mark as urgent"))
                    .setIcon("zap")
                    .onClick(() => {
                    this.addTagToTask("#urgent");
                });
            });
        }
        else {
            menu.addItem((item) => {
                item.setTitle(t("Remove urgent tag"))
                    .setIcon("zap-off")
                    .onClick(() => {
                    this.removeTagFromTask("#urgent");
                });
            });
        }
        if (!hasImportantTag) {
            menu.addItem((item) => {
                item.setTitle(t("Mark as important"))
                    .setIcon("star")
                    .onClick(() => {
                    this.addTagToTask("#important");
                });
            });
        }
        else {
            menu.addItem((item) => {
                item.setTitle(t("Remove important tag"))
                    .setIcon("star-off")
                    .onClick(() => {
                    this.removeTagFromTask("#important");
                });
            });
        }
        menu.showAtMouseEvent(e);
    }
    openTaskInFile() {
        return __awaiter(this, void 0, void 0, function* () {
            const file = this.app.vault.getFileByPath(this.task.filePath);
            if (file) {
                const leaf = this.app.workspace.getLeaf(false);
                yield leaf.openFile(file);
                // Navigate to the specific line
                const view = leaf.view;
                if (view && view instanceof MarkdownView && view.editor) {
                    const lineNumber = this.task.line - 1;
                    view.editor.setCursor(lineNumber, 0);
                    view.editor.scrollIntoView({
                        from: { line: lineNumber, ch: 0 },
                        to: { line: lineNumber, ch: 0 },
                    }, true);
                }
            }
        });
    }
    addTagToTask(tag) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Create a copy of the task with the new tag
                const updatedTask = Object.assign({}, this.task);
                // Initialize tags array if it doesn't exist
                if (!updatedTask.metadata.tags) {
                    updatedTask.metadata.tags = [];
                }
                // Add the tag if it doesn't already exist
                if (!updatedTask.metadata.tags.includes(tag)) {
                    updatedTask.metadata.tags = [...updatedTask.metadata.tags, tag];
                }
                // Update the local task reference and re-render
                this.task = updatedTask;
                this.render();
                // Notify parent component about task update
                if (this.params.onTaskUpdated) {
                    yield this.params.onTaskUpdated(updatedTask);
                }
            }
            catch (error) {
                console.error(`Failed to add tag ${tag} to task ${this.task.id}:`, error);
            }
        });
    }
    removeTagFromTask(tag) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Create a copy of the task without the tag
                const updatedTask = Object.assign({}, this.task);
                // Remove the tag from the tags array
                updatedTask.metadata.tags = updatedTask.metadata.tags.filter((t) => t !== tag);
                // Update the local task reference and re-render
                this.task = updatedTask;
                this.render();
                // Notify parent component about task update
                if (this.params.onTaskUpdated) {
                    yield this.params.onTaskUpdated(updatedTask);
                }
            }
            catch (error) {
                console.error(`Failed to remove tag ${tag} from task ${this.task.id}:`, error);
            }
        });
    }
    extractTags() {
        const content = this.task.content || "";
        const results = [];
        let i = 0;
        while (i < content.length) {
            const hashIndex = content.indexOf("#", i);
            if (hashIndex === -1)
                break;
            // Count consecutive backslashes immediately before '#'
            let bsCount = 0;
            let j = hashIndex - 1;
            while (j >= 0 && content[j] === "\\") {
                bsCount++;
                j--;
            }
            // If odd number of backslashes precede '#', it is escaped → skip
            if (bsCount % 2 === 1) {
                i = hashIndex + 1;
                continue;
            }
            // Extract tag text: allow a-zA-Z0-9, '/', '-', '_', and non-ASCII (e.g., Chinese)
            let k = hashIndex + 1;
            while (k < content.length) {
                const ch = content[k];
                const code = ch.charCodeAt(0);
                const isAsciiAlnum = (code >= 48 && code <= 57) ||
                    (code >= 65 && code <= 90) ||
                    (code >= 97 && code <= 122);
                const isAllowed = isAsciiAlnum ||
                    ch === "/" ||
                    ch === "-" ||
                    ch === "_" ||
                    code > 127;
                if (!isAllowed)
                    break;
                k++;
            }
            if (k > hashIndex + 1) {
                results.push(content.substring(hashIndex, k));
                i = k;
            }
            else {
                i = hashIndex + 1;
            }
        }
        return results;
    }
    getPriorityClass() {
        if (this.task.content.includes("🔺"))
            return "tg-quadrant-card--priority-highest";
        if (this.task.content.includes("⏫"))
            return "tg-quadrant-card--priority-high";
        if (this.task.content.includes("🔼"))
            return "tg-quadrant-card--priority-medium";
        if (this.task.content.includes("🔽"))
            return "tg-quadrant-card--priority-low";
        if (this.task.content.includes("⏬"))
            return "tg-quadrant-card--priority-lowest";
        return "";
    }
    getTaskDueDate() {
        // Extract due date from task content - this is a simplified implementation
        const match = this.task.content.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
        if (match) {
            return new Date(match[1]);
        }
        return null;
    }
    formatDueDate(date) {
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days < 0) {
            const overdueDays = Math.abs(days);
            return t("Overdue by") + " " + overdueDays + " " + t("days");
        }
        else if (days === 0) {
            return t("Due today");
        }
        else if (days === 1) {
            return t("Due tomorrow");
        }
        else if (days <= 7) {
            return t("Due in") + " " + days + " " + t("days");
        }
        else {
            return date.toLocaleDateString();
        }
    }
    isDueSoon(date) {
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        const days = diff / (1000 * 60 * 60 * 24);
        return days >= 0 && days <= 3; // Due within 3 days
    }
    isOverdue(date) {
        const now = new Date();
        return date.getTime() < now.getTime();
    }
    getFileName() {
        const parts = this.task.filePath.split("/");
        return parts[parts.length - 1].replace(/\.md$/, "");
    }
    getTask() {
        return this.task;
    }
    updateTask(task) {
        this.task = task;
        this.render();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVhZHJhbnQtY2FyZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInF1YWRyYW50LWNhcmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBTyxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFHdkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDN0UsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdkYsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzFDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRXZFLE1BQU0sT0FBTyxxQkFBc0IsU0FBUSxTQUFTO0lBb0JuRCxZQUNDLEdBQVEsRUFDUixNQUE2QixFQUM3QixXQUF3QixFQUN4QixJQUFVLEVBQ1YsU0FTSSxFQUFFO1FBRU4sS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztRQUNmLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1FBQy9CLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBRXJCLCtCQUErQjtRQUMvQixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSx5QkFBeUIsQ0FDcEQsSUFBSSxDQUFDLEdBQUcsRUFDUixJQUFJLENBQUMsV0FBVyxFQUNoQixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFDbEIsSUFBSSxDQUFDLG1CQUFtQjtTQUN4QixDQUFDO1FBQ0YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRVEsTUFBTTtRQUNkLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNmLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNmLENBQUM7SUFFTyxNQUFNO1FBQ2IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN6QixJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQzlDLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRTVELGlDQUFpQztRQUNqQyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUM5QyxJQUFJLGFBQWEsRUFBRTtZQUNsQixJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQztTQUN6QztRQUVELCtDQUErQztRQUMvQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFFcEIsc0JBQXNCO1FBQ3RCLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUVyQiwwQkFBMEI7UUFDMUIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRXRCLHNCQUFzQjtRQUN0QixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRU8sWUFBWTtRQUNuQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBRXZFLGdCQUFnQjtRQUNoQixJQUFJLENBQUMsVUFBVSxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUNsRSxNQUFNLFFBQVEsR0FBRyxrQkFBa0IsQ0FDbEMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQ2hCLElBQUksQ0FBQyxJQUFJLEVBQ1QsSUFBSSxDQUFDLFVBQVUsQ0FDZixDQUFDO1FBRUYseUNBQXlDO1FBQ3pDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRTtZQUM5QyxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztZQUMvQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsa0JBQWtCLEVBQUU7Z0JBQ25DLElBQUksQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUM7YUFDeEQ7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILGVBQWU7UUFDZixNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLDBCQUEwQixDQUFDLENBQUM7UUFDakUsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUU7WUFDNUMsR0FBRyxFQUFFLDJCQUEyQjtZQUNoQyxJQUFJLEVBQUUsRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxFQUFFO1NBQ3pDLENBQUMsQ0FBQztRQUNILE9BQU8sQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUVwQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzdDLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pCLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVPLGFBQWE7UUFDcEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBRXhFLDZDQUE2QztRQUM3QyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBRW5FLDJEQUEyRDtRQUMzRCxNQUFNLGVBQWUsR0FBRyxJQUFJLHlCQUF5QixDQUNwRCxJQUFJLENBQUMsR0FBRyxFQUNSLE9BQU8sRUFDUCxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFDbEIsSUFBSSxDQUFDLG1CQUFtQjtTQUN4QixDQUFDO1FBQ0YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUUvQiwwQkFBMEI7UUFDMUIsZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUVoRCwyRUFBMkU7UUFDM0Usb0NBQW9DO1FBRXBDLE9BQU87UUFDUCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDaEMsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUNwQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1lBQ2pFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtnQkFDcEIsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO2dCQUN4RCxLQUFLLENBQUMsV0FBVyxHQUFHLEdBQUcsQ0FBQztnQkFFeEIsZ0RBQWdEO2dCQUNoRCxJQUFJLEdBQUcsS0FBSyxTQUFTLEVBQUU7b0JBQ3RCLEtBQUssQ0FBQyxRQUFRLENBQUMseUJBQXlCLENBQUMsQ0FBQztpQkFDMUM7cUJBQU0sSUFBSSxHQUFHLEtBQUssWUFBWSxFQUFFO29CQUNoQyxLQUFLLENBQUMsUUFBUSxDQUFDLDRCQUE0QixDQUFDLENBQUM7aUJBQzdDO1lBQ0YsQ0FBQyxDQUFDLENBQUM7U0FDSDtJQUNGLENBQUM7SUFFTyxjQUFjO1FBQ3JCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQzNDLDJCQUEyQixDQUMzQixDQUFDO1FBRUYsV0FBVztRQUNYLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUN0QyxJQUFJLE9BQU8sRUFBRTtZQUNaLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUMxQywyQkFBMkIsQ0FDM0IsQ0FBQztZQUVGLE1BQU0sV0FBVyxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQ3ZDLGdDQUFnQyxDQUNoQyxDQUFDO1lBQ0YsV0FBVyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRXRELHNCQUFzQjtZQUN0QixJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQzVCLFNBQVMsQ0FBQyxRQUFRLENBQUMsbUNBQW1DLENBQUMsQ0FBQzthQUN4RDtpQkFBTSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ25DLFNBQVMsQ0FBQyxRQUFRLENBQUMsb0NBQW9DLENBQUMsQ0FBQzthQUN6RDtTQUNEO1FBRUQsWUFBWTtRQUNaLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLDRCQUE0QixFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUU7WUFDOUQsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUU7Z0JBQ2hDLFlBQVk7Z0JBQ1osSUFBSSxlQUF1QixDQUFDO2dCQUM1QixJQUFJLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxLQUFLLFFBQVEsRUFBRTtvQkFDcEQsUUFDRSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFtQixDQUFDLFdBQVcsRUFBRSxFQUNwRDt3QkFDRCxLQUFLLFFBQVE7NEJBQ1osZUFBZSxHQUFHLENBQUMsQ0FBQzs0QkFDcEIsTUFBTTt3QkFDUCxLQUFLLEtBQUs7NEJBQ1QsZUFBZSxHQUFHLENBQUMsQ0FBQzs0QkFDcEIsTUFBTTt3QkFDUCxLQUFLLFFBQVE7NEJBQ1osZUFBZSxHQUFHLENBQUMsQ0FBQzs0QkFDcEIsTUFBTTt3QkFDUCxLQUFLLE1BQU07NEJBQ1YsZUFBZSxHQUFHLENBQUMsQ0FBQzs0QkFDcEIsTUFBTTt3QkFDUCxLQUFLLFNBQVM7NEJBQ2IsZUFBZSxHQUFHLENBQUMsQ0FBQzs0QkFDcEIsTUFBTTt3QkFDUDs0QkFDQyxlQUFlO2dDQUNkLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7NEJBQzVDLE1BQU07cUJBQ1A7aUJBQ0Q7cUJBQU07b0JBQ04sZUFBZSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztpQkFDOUM7Z0JBRUQsTUFBTSxpQkFBaUIsR0FDdEIsd0JBQXdCLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sT0FBTyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQztnQkFDOUMsSUFBSSxpQkFBaUIsRUFBRTtvQkFDdEIsT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLGlCQUFpQixFQUFFLENBQUMsQ0FBQztpQkFDOUM7Z0JBQ0QsTUFBTSxVQUFVLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO2dCQUVsRCxvQkFBb0I7Z0JBQ3BCLElBQUksSUFBSSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQ3ZDLFVBQVUsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO2FBQzlCO1lBRUQsWUFBWTtZQUNaLE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsNEJBQTRCLENBQUMsQ0FBQztZQUM3RCxRQUFRLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUUxQyxjQUFjO1lBQ2QsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1lBQ3RELE1BQU0sQ0FBQyxXQUFXLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQzNDLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVPLGlCQUFpQjtRQUN4Qiw0QkFBNEI7UUFDNUIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDdEQsSUFDQyxDQUFDLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxVQUFVO2dCQUM1QixJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBYyxDQUFDLEVBQ3pDO2dCQUNELE9BQU8sQ0FBQyxzQ0FBc0M7YUFDOUM7WUFFRCxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFO2dCQUMvQixJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDdEM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILDJCQUEyQjtRQUMzQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUM1RCxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDbkIsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBRXBCLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRTtnQkFDbEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQzVDO2lCQUFNO2dCQUNOLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDeEI7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILDRCQUE0QjtRQUM1QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN6RCxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDcEIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3ZCLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVPLGVBQWUsQ0FBQyxDQUFhOztRQUNwQyxNQUFNLElBQUksR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1FBRXhCLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUNyQixJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQztpQkFDOUIsT0FBTyxDQUFDLGVBQWUsQ0FBQztpQkFDeEIsT0FBTyxDQUFDLEdBQUcsRUFBRTtnQkFDYixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDdkIsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUNyQixJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztpQkFDM0IsT0FBTyxDQUFDLE1BQU0sQ0FBQztpQkFDZixPQUFPLENBQUMsR0FBRyxFQUFFO2dCQUNiLFNBQVMsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUMzRCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBRXBCLHVGQUF1RjtRQUN2RixNQUFNLFlBQVksR0FDakIsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQzthQUNyQyxNQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksMENBQUUsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFBLENBQUM7UUFDOUMsTUFBTSxlQUFlLEdBQ3BCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUM7YUFDeEMsTUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLDBDQUFFLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQSxDQUFDO1FBRWpELElBQUksQ0FBQyxZQUFZLEVBQUU7WUFDbEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO2dCQUNyQixJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO3FCQUNoQyxPQUFPLENBQUMsS0FBSyxDQUFDO3FCQUNkLE9BQU8sQ0FBQyxHQUFHLEVBQUU7b0JBQ2IsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDOUIsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztTQUNIO2FBQU07WUFDTixJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7Z0JBQ3JCLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUM7cUJBQ25DLE9BQU8sQ0FBQyxTQUFTLENBQUM7cUJBQ2xCLE9BQU8sQ0FBQyxHQUFHLEVBQUU7b0JBQ2IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUNuQyxDQUFDLENBQUMsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1NBQ0g7UUFFRCxJQUFJLENBQUMsZUFBZSxFQUFFO1lBQ3JCLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFDckIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQztxQkFDbkMsT0FBTyxDQUFDLE1BQU0sQ0FBQztxQkFDZixPQUFPLENBQUMsR0FBRyxFQUFFO29CQUNiLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQ2pDLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUM7U0FDSDthQUFNO1lBQ04sSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO2dCQUNyQixJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO3FCQUN0QyxPQUFPLENBQUMsVUFBVSxDQUFDO3FCQUNuQixPQUFPLENBQUMsR0FBRyxFQUFFO29CQUNiLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFDdEMsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztTQUNIO1FBRUQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFCLENBQUM7SUFFYSxjQUFjOztZQUMzQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUM5RCxJQUFJLElBQUksRUFBRTtnQkFDVCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQy9DLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFXLENBQUMsQ0FBQztnQkFFakMsZ0NBQWdDO2dCQUNoQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO2dCQUN2QixJQUFJLElBQUksSUFBSSxJQUFJLFlBQVksWUFBWSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7b0JBQ3hELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQztvQkFDdEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUNyQyxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FDekI7d0JBQ0MsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO3dCQUNqQyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7cUJBQy9CLEVBQ0QsSUFBSSxDQUNKLENBQUM7aUJBQ0Y7YUFDRDtRQUNGLENBQUM7S0FBQTtJQUVhLFlBQVksQ0FBQyxHQUFXOztZQUNyQyxJQUFJO2dCQUNILDZDQUE2QztnQkFDN0MsTUFBTSxXQUFXLHFCQUFRLElBQUksQ0FBQyxJQUFJLENBQUUsQ0FBQztnQkFFckMsNENBQTRDO2dCQUM1QyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUU7b0JBQy9CLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztpQkFDL0I7Z0JBRUQsMENBQTBDO2dCQUMxQyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFO29CQUM3QyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7aUJBQ2hFO2dCQUVELGdEQUFnRDtnQkFDaEQsSUFBSSxDQUFDLElBQUksR0FBRyxXQUFXLENBQUM7Z0JBQ3hCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFFZCw0Q0FBNEM7Z0JBQzVDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUU7b0JBQzlCLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUM7aUJBQzdDO2FBQ0Q7WUFBQyxPQUFPLEtBQUssRUFBRTtnQkFDZixPQUFPLENBQUMsS0FBSyxDQUNaLHFCQUFxQixHQUFHLFlBQVksSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFDbkQsS0FBSyxDQUNMLENBQUM7YUFDRjtRQUNGLENBQUM7S0FBQTtJQUVhLGlCQUFpQixDQUFDLEdBQVc7O1lBQzFDLElBQUk7Z0JBQ0gsNENBQTRDO2dCQUM1QyxNQUFNLFdBQVcscUJBQVEsSUFBSSxDQUFDLElBQUksQ0FBRSxDQUFDO2dCQUVyQyxxQ0FBcUM7Z0JBQ3JDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FDM0QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxHQUFHLENBQ2hCLENBQUM7Z0JBRUYsZ0RBQWdEO2dCQUNoRCxJQUFJLENBQUMsSUFBSSxHQUFHLFdBQVcsQ0FBQztnQkFDeEIsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUVkLDRDQUE0QztnQkFDNUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRTtvQkFDOUIsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQztpQkFDN0M7YUFDRDtZQUFDLE9BQU8sS0FBSyxFQUFFO2dCQUNmLE9BQU8sQ0FBQyxLQUFLLENBQ1osd0JBQXdCLEdBQUcsY0FBYyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUN4RCxLQUFLLENBQ0wsQ0FBQzthQUNGO1FBQ0YsQ0FBQztLQUFBO0lBRU8sV0FBVztRQUNsQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUM7UUFDeEMsTUFBTSxPQUFPLEdBQWEsRUFBRSxDQUFDO1FBQzdCLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNWLE9BQU8sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUU7WUFDMUIsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDMUMsSUFBSSxTQUFTLEtBQUssQ0FBQyxDQUFDO2dCQUFFLE1BQU07WUFDNUIsdURBQXVEO1lBQ3ZELElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQztZQUNoQixJQUFJLENBQUMsR0FBRyxTQUFTLEdBQUcsQ0FBQyxDQUFDO1lBQ3RCLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxFQUFFO2dCQUNyQyxPQUFPLEVBQUUsQ0FBQztnQkFDVixDQUFDLEVBQUUsQ0FBQzthQUNKO1lBQ0QsaUVBQWlFO1lBQ2pFLElBQUksT0FBTyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ3RCLENBQUMsR0FBRyxTQUFTLEdBQUcsQ0FBQyxDQUFDO2dCQUNsQixTQUFTO2FBQ1Q7WUFDRCxrRkFBa0Y7WUFDbEYsSUFBSSxDQUFDLEdBQUcsU0FBUyxHQUFHLENBQUMsQ0FBQztZQUN0QixPQUFPLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFO2dCQUMxQixNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3RCLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzlCLE1BQU0sWUFBWSxHQUNqQixDQUFDLElBQUksSUFBSSxFQUFFLElBQUksSUFBSSxJQUFJLEVBQUUsQ0FBQztvQkFDMUIsQ0FBQyxJQUFJLElBQUksRUFBRSxJQUFJLElBQUksSUFBSSxFQUFFLENBQUM7b0JBQzFCLENBQUMsSUFBSSxJQUFJLEVBQUUsSUFBSSxJQUFJLElBQUksR0FBRyxDQUFDLENBQUM7Z0JBQzdCLE1BQU0sU0FBUyxHQUNkLFlBQVk7b0JBQ1osRUFBRSxLQUFLLEdBQUc7b0JBQ1YsRUFBRSxLQUFLLEdBQUc7b0JBQ1YsRUFBRSxLQUFLLEdBQUc7b0JBQ1YsSUFBSSxHQUFHLEdBQUcsQ0FBQztnQkFDWixJQUFJLENBQUMsU0FBUztvQkFBRSxNQUFNO2dCQUN0QixDQUFDLEVBQUUsQ0FBQzthQUNKO1lBQ0QsSUFBSSxDQUFDLEdBQUcsU0FBUyxHQUFHLENBQUMsRUFBRTtnQkFDdEIsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM5QyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ047aUJBQU07Z0JBQ04sQ0FBQyxHQUFHLFNBQVMsR0FBRyxDQUFDLENBQUM7YUFDbEI7U0FDRDtRQUNELE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7SUFFTyxnQkFBZ0I7UUFDdkIsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO1lBQ25DLE9BQU8sb0NBQW9DLENBQUM7UUFDN0MsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDO1lBQ2xDLE9BQU8saUNBQWlDLENBQUM7UUFDMUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO1lBQ25DLE9BQU8sbUNBQW1DLENBQUM7UUFDNUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO1lBQ25DLE9BQU8sZ0NBQWdDLENBQUM7UUFDekMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDO1lBQ2xDLE9BQU8sbUNBQW1DLENBQUM7UUFDNUMsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRU8sY0FBYztRQUNyQiwyRUFBMkU7UUFDM0UsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLDBCQUEwQixDQUFDLENBQUM7UUFDbEUsSUFBSSxLQUFLLEVBQUU7WUFDVixPQUFPLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzFCO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRU8sYUFBYSxDQUFDLElBQVU7UUFDL0IsTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUN2QixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzVDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVyRCxJQUFJLElBQUksR0FBRyxDQUFDLEVBQUU7WUFDYixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ25DLE9BQU8sQ0FBQyxDQUFDLFlBQVksQ0FBQyxHQUFHLEdBQUcsR0FBRyxXQUFXLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUM3RDthQUFNLElBQUksSUFBSSxLQUFLLENBQUMsRUFBRTtZQUN0QixPQUFPLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztTQUN0QjthQUFNLElBQUksSUFBSSxLQUFLLENBQUMsRUFBRTtZQUN0QixPQUFPLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQztTQUN6QjthQUFNLElBQUksSUFBSSxJQUFJLENBQUMsRUFBRTtZQUNyQixPQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDbEQ7YUFBTTtZQUNOLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7U0FDakM7SUFDRixDQUFDO0lBRU8sU0FBUyxDQUFDLElBQVU7UUFDM0IsTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUN2QixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzVDLE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQzFDLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsb0JBQW9CO0lBQ3BELENBQUM7SUFFTyxTQUFTLENBQUMsSUFBVTtRQUMzQixNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN2QyxDQUFDO0lBRU8sV0FBVztRQUNsQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDNUMsT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFFTSxPQUFPO1FBQ2IsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ2xCLENBQUM7SUFFTSxVQUFVLENBQUMsSUFBVTtRQUMzQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDZixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHAsIENvbXBvbmVudCwgc2V0SWNvbiwgTWVudSwgTWFya2Rvd25WaWV3IH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjtcclxuaW1wb3J0IHsgVGFzayB9IGZyb20gXCJAL3R5cGVzL3Rhc2tcIjtcclxuaW1wb3J0IHsgY3JlYXRlVGFza0NoZWNrYm94IH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy90YXNrL3ZpZXcvZGV0YWlsc1wiO1xyXG5pbXBvcnQgeyBNYXJrZG93blJlbmRlcmVyQ29tcG9uZW50IH0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9yZW5kZXJlcnMvTWFya2Rvd25SZW5kZXJlclwiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgeyBzYW5pdGl6ZVByaW9yaXR5Rm9yQ2xhc3MgfSBmcm9tIFwiQC91dGlscy90YXNrL3ByaW9yaXR5LXV0aWxzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgUXVhZHJhbnRDYXJkQ29tcG9uZW50IGV4dGVuZHMgQ29tcG9uZW50IHtcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbjtcclxuXHRhcHA6IEFwcDtcclxuXHRwdWJsaWMgY29udGFpbmVyRWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgdGFzazogVGFzaztcclxuXHRwcml2YXRlIGNoZWNrYm94RWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgY29udGVudEVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIG1ldGFkYXRhRWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgbWFya2Rvd25SZW5kZXJlcjogTWFya2Rvd25SZW5kZXJlckNvbXBvbmVudDtcclxuXHRwcml2YXRlIHBhcmFtczoge1xyXG5cdFx0b25UYXNrU3RhdHVzVXBkYXRlPzogKFxyXG5cdFx0XHR0YXNrSWQ6IHN0cmluZyxcclxuXHRcdFx0bmV3U3RhdHVzTWFyazogc3RyaW5nXHJcblx0XHQpID0+IFByb21pc2U8dm9pZD47XHJcblx0XHRvblRhc2tTZWxlY3RlZD86ICh0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdFx0b25UYXNrQ29tcGxldGVkPzogKHRhc2s6IFRhc2spID0+IHZvaWQ7XHJcblx0XHRvblRhc2tDb250ZXh0TWVudT86IChldjogTW91c2VFdmVudCwgdGFzazogVGFzaykgPT4gdm9pZDtcclxuXHRcdG9uVGFza1VwZGF0ZWQ/OiAodGFzazogVGFzaykgPT4gUHJvbWlzZTx2b2lkPjtcclxuXHR9O1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdGFwcDogQXBwLFxyXG5cdFx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRjb250YWluZXJFbDogSFRNTEVsZW1lbnQsXHJcblx0XHR0YXNrOiBUYXNrLFxyXG5cdFx0cGFyYW1zOiB7XHJcblx0XHRcdG9uVGFza1N0YXR1c1VwZGF0ZT86IChcclxuXHRcdFx0XHR0YXNrSWQ6IHN0cmluZyxcclxuXHRcdFx0XHRuZXdTdGF0dXNNYXJrOiBzdHJpbmdcclxuXHRcdFx0KSA9PiBQcm9taXNlPHZvaWQ+O1xyXG5cdFx0XHRvblRhc2tTZWxlY3RlZD86ICh0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdFx0XHRvblRhc2tDb21wbGV0ZWQ/OiAodGFzazogVGFzaykgPT4gdm9pZDtcclxuXHRcdFx0b25UYXNrQ29udGV4dE1lbnU/OiAoZXY6IE1vdXNlRXZlbnQsIHRhc2s6IFRhc2spID0+IHZvaWQ7XHJcblx0XHRcdG9uVGFza1VwZGF0ZWQ/OiAodGFzazogVGFzaykgPT4gUHJvbWlzZTx2b2lkPjtcclxuXHRcdH0gPSB7fVxyXG5cdCkge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMuYXBwID0gYXBwO1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsID0gY29udGFpbmVyRWw7XHJcblx0XHR0aGlzLnRhc2sgPSB0YXNrO1xyXG5cdFx0dGhpcy5wYXJhbXMgPSBwYXJhbXM7XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBtYXJrZG93biByZW5kZXJlclxyXG5cdFx0dGhpcy5tYXJrZG93blJlbmRlcmVyID0gbmV3IE1hcmtkb3duUmVuZGVyZXJDb21wb25lbnQoXHJcblx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHR0aGlzLmNvbnRhaW5lckVsLFxyXG5cdFx0XHR0aGlzLnRhc2suZmlsZVBhdGgsXHJcblx0XHRcdHRydWUgLy8gaGlkZU1hcmtzID0gdHJ1ZVxyXG5cdFx0KTtcclxuXHRcdHRoaXMuYWRkQ2hpbGQodGhpcy5tYXJrZG93blJlbmRlcmVyKTtcclxuXHR9XHJcblxyXG5cdG92ZXJyaWRlIG9ubG9hZCgpIHtcclxuXHRcdHN1cGVyLm9ubG9hZCgpO1xyXG5cdFx0dGhpcy5yZW5kZXIoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyKCkge1xyXG5cdFx0dGhpcy5jb250YWluZXJFbC5lbXB0eSgpO1xyXG5cdFx0dGhpcy5jb250YWluZXJFbC5hZGRDbGFzcyhcInRnLXF1YWRyYW50LWNhcmRcIik7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLnNldEF0dHJpYnV0ZShcImRhdGEtdGFzay1pZFwiLCB0aGlzLnRhc2suaWQpO1xyXG5cclxuXHRcdC8vIEFkZCBwcmlvcml0eSBjbGFzcyBmb3Igc3R5bGluZ1xyXG5cdFx0Y29uc3QgcHJpb3JpdHlDbGFzcyA9IHRoaXMuZ2V0UHJpb3JpdHlDbGFzcygpO1xyXG5cdFx0aWYgKHByaW9yaXR5Q2xhc3MpIHtcclxuXHRcdFx0dGhpcy5jb250YWluZXJFbC5hZGRDbGFzcyhwcmlvcml0eUNsYXNzKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDcmVhdGUgY2FyZCBoZWFkZXIgd2l0aCBjaGVja2JveCBhbmQgYWN0aW9uc1xyXG5cdFx0dGhpcy5jcmVhdGVIZWFkZXIoKTtcclxuXHJcblx0XHQvLyBDcmVhdGUgdGFzayBjb250ZW50XHJcblx0XHR0aGlzLmNyZWF0ZUNvbnRlbnQoKTtcclxuXHJcblx0XHQvLyBDcmVhdGUgbWV0YWRhdGEgc2VjdGlvblxyXG5cdFx0dGhpcy5jcmVhdGVNZXRhZGF0YSgpO1xyXG5cclxuXHRcdC8vIEFkZCBldmVudCBsaXN0ZW5lcnNcclxuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcnMoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY3JlYXRlSGVhZGVyKCkge1xyXG5cdFx0Y29uc3QgaGVhZGVyRWwgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdihcInRnLXF1YWRyYW50LWNhcmQtaGVhZGVyXCIpO1xyXG5cclxuXHRcdC8vIFRhc2sgY2hlY2tib3hcclxuXHRcdHRoaXMuY2hlY2tib3hFbCA9IGhlYWRlckVsLmNyZWF0ZURpdihcInRnLXF1YWRyYW50LWNhcmQtY2hlY2tib3hcIik7XHJcblx0XHRjb25zdCBjaGVja2JveCA9IGNyZWF0ZVRhc2tDaGVja2JveChcclxuXHRcdFx0dGhpcy50YXNrLnN0YXR1cyxcclxuXHRcdFx0dGhpcy50YXNrLFxyXG5cdFx0XHR0aGlzLmNoZWNrYm94RWxcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gQWRkIGNoYW5nZSBldmVudCBsaXN0ZW5lciBmb3IgY2hlY2tib3hcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChjaGVja2JveCwgXCJjaGFuZ2VcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBuZXdTdGF0dXMgPSBjaGVja2JveC5jaGVja2VkID8gXCJ4XCIgOiBcIiBcIjtcclxuXHRcdFx0aWYgKHRoaXMucGFyYW1zLm9uVGFza1N0YXR1c1VwZGF0ZSkge1xyXG5cdFx0XHRcdHRoaXMucGFyYW1zLm9uVGFza1N0YXR1c1VwZGF0ZSh0aGlzLnRhc2suaWQsIG5ld1N0YXR1cyk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEFjdGlvbnMgbWVudVxyXG5cdFx0Y29uc3QgYWN0aW9uc0VsID0gaGVhZGVyRWwuY3JlYXRlRGl2KFwidGctcXVhZHJhbnQtY2FyZC1hY3Rpb25zXCIpO1xyXG5cdFx0Y29uc3QgbW9yZUJ0biA9IGFjdGlvbnNFbC5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdGNsczogXCJ0Zy1xdWFkcmFudC1jYXJkLW1vcmUtYnRuXCIsXHJcblx0XHRcdGF0dHI6IHsgXCJhcmlhLWxhYmVsXCI6IHQoXCJNb3JlIGFjdGlvbnNcIikgfSxcclxuXHRcdH0pO1xyXG5cdFx0c2V0SWNvbihtb3JlQnRuLCBcIm1vcmUtaG9yaXpvbnRhbFwiKTtcclxuXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQobW9yZUJ0biwgXCJjbGlja1wiLCAoZSkgPT4ge1xyXG5cdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cdFx0XHR0aGlzLnNob3dDb250ZXh0TWVudShlKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVDb250ZW50KCkge1xyXG5cdFx0dGhpcy5jb250ZW50RWwgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdihcInRnLXF1YWRyYW50LWNhcmQtY29udGVudFwiKTtcclxuXHJcblx0XHQvLyBUYXNrIHRpdGxlL2NvbnRlbnQgLSB1c2UgbWFya2Rvd24gcmVuZGVyZXJcclxuXHRcdGNvbnN0IHRpdGxlRWwgPSB0aGlzLmNvbnRlbnRFbC5jcmVhdGVEaXYoXCJ0Zy1xdWFkcmFudC1jYXJkLXRpdGxlXCIpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBhIG5ldyBtYXJrZG93biByZW5kZXJlciBmb3IgdGhpcyBzcGVjaWZpYyBjb250ZW50XHJcblx0XHRjb25zdCBjb250ZW50UmVuZGVyZXIgPSBuZXcgTWFya2Rvd25SZW5kZXJlckNvbXBvbmVudChcclxuXHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdHRpdGxlRWwsXHJcblx0XHRcdHRoaXMudGFzay5maWxlUGF0aCxcclxuXHRcdFx0dHJ1ZSAvLyBoaWRlTWFya3MgPSB0cnVlXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5hZGRDaGlsZChjb250ZW50UmVuZGVyZXIpO1xyXG5cclxuXHRcdC8vIFJlbmRlciB0aGUgdGFzayBjb250ZW50XHJcblx0XHRjb250ZW50UmVuZGVyZXIucmVuZGVyKHRoaXMudGFzay5jb250ZW50LCB0cnVlKTtcclxuXHJcblx0XHQvLyBQcmlvcml0eSBpbmRpY2F0b3IgKHVzZSB0aGUgbG9naWMgZnJvbSBsaXN0SXRlbS50cyBmb3IgbnVtZXJpYyBwcmlvcml0eSlcclxuXHRcdC8vIFNlZSBAZmlsZV9jb250ZXh0XzAgZm9yIHJlZmVyZW5jZVxyXG5cclxuXHRcdC8vIFRhZ3NcclxuXHRcdGNvbnN0IHRhZ3MgPSB0aGlzLmV4dHJhY3RUYWdzKCk7XHJcblx0XHRpZiAodGFncy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdGNvbnN0IHRhZ3NFbCA9IHRoaXMuY29udGVudEVsLmNyZWF0ZURpdihcInRnLXF1YWRyYW50LWNhcmQtdGFnc1wiKTtcclxuXHRcdFx0dGFncy5mb3JFYWNoKCh0YWcpID0+IHtcclxuXHRcdFx0XHRjb25zdCB0YWdFbCA9IHRhZ3NFbC5jcmVhdGVTcGFuKFwidGctcXVhZHJhbnQtY2FyZC10YWdcIik7XHJcblx0XHRcdFx0dGFnRWwudGV4dENvbnRlbnQgPSB0YWc7XHJcblxyXG5cdFx0XHRcdC8vIEFkZCBzcGVjaWFsIHN0eWxpbmcgZm9yIHVyZ2VudC9pbXBvcnRhbnQgdGFnc1xyXG5cdFx0XHRcdGlmICh0YWcgPT09IFwiI3VyZ2VudFwiKSB7XHJcblx0XHRcdFx0XHR0YWdFbC5hZGRDbGFzcyhcInRnLXF1YWRyYW50LXRhZy0tdXJnZW50XCIpO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAodGFnID09PSBcIiNpbXBvcnRhbnRcIikge1xyXG5cdFx0XHRcdFx0dGFnRWwuYWRkQ2xhc3MoXCJ0Zy1xdWFkcmFudC10YWctLWltcG9ydGFudFwiKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVNZXRhZGF0YSgpIHtcclxuXHRcdHRoaXMubWV0YWRhdGFFbCA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KFxyXG5cdFx0XHRcInRnLXF1YWRyYW50LWNhcmQtbWV0YWRhdGFcIlxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBEdWUgZGF0ZVxyXG5cdFx0Y29uc3QgZHVlRGF0ZSA9IHRoaXMuZ2V0VGFza0R1ZURhdGUoKTtcclxuXHRcdGlmIChkdWVEYXRlKSB7XHJcblx0XHRcdGNvbnN0IGR1ZURhdGVFbCA9IHRoaXMubWV0YWRhdGFFbC5jcmVhdGVEaXYoXHJcblx0XHRcdFx0XCJ0Zy1xdWFkcmFudC1jYXJkLWR1ZS1kYXRlXCJcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGNvbnN0IGR1ZURhdGVUZXh0ID0gZHVlRGF0ZUVsLmNyZWF0ZVNwYW4oXHJcblx0XHRcdFx0XCJ0Zy1xdWFkcmFudC1jYXJkLWR1ZS1kYXRlLXRleHRcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRkdWVEYXRlVGV4dC50ZXh0Q29udGVudCA9IHRoaXMuZm9ybWF0RHVlRGF0ZShkdWVEYXRlKTtcclxuXHJcblx0XHRcdC8vIEFkZCB1cmdlbmN5IHN0eWxpbmdcclxuXHRcdFx0aWYgKHRoaXMuaXNEdWVTb29uKGR1ZURhdGUpKSB7XHJcblx0XHRcdFx0ZHVlRGF0ZUVsLmFkZENsYXNzKFwidGctcXVhZHJhbnQtY2FyZC1kdWUtZGF0ZS0tdXJnZW50XCIpO1xyXG5cdFx0XHR9IGVsc2UgaWYgKHRoaXMuaXNPdmVyZHVlKGR1ZURhdGUpKSB7XHJcblx0XHRcdFx0ZHVlRGF0ZUVsLmFkZENsYXNzKFwidGctcXVhZHJhbnQtY2FyZC1kdWUtZGF0ZS0tb3ZlcmR1ZVwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEZpbGUgaW5mb1xyXG5cdFx0dGhpcy5tZXRhZGF0YUVsLmNyZWF0ZURpdihcInRnLXF1YWRyYW50LWNhcmQtZmlsZS1pbmZvXCIsIChlbCkgPT4ge1xyXG5cdFx0XHRpZiAodGhpcy50YXNrLm1ldGFkYXRhLnByaW9yaXR5KSB7XHJcblx0XHRcdFx0Ly8g5bCG5LyY5YWI57qn6L2s5o2i5Li65pWw5a2XXHJcblx0XHRcdFx0bGV0IG51bWVyaWNQcmlvcml0eTogbnVtYmVyO1xyXG5cdFx0XHRcdGlmICh0eXBlb2YgdGhpcy50YXNrLm1ldGFkYXRhLnByaW9yaXR5ID09PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdFx0XHRzd2l0Y2ggKFxyXG5cdFx0XHRcdFx0XHQodGhpcy50YXNrLm1ldGFkYXRhLnByaW9yaXR5IGFzIHN0cmluZykudG9Mb3dlckNhc2UoKVxyXG5cdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdGNhc2UgXCJsb3dlc3RcIjpcclxuXHRcdFx0XHRcdFx0XHRudW1lcmljUHJpb3JpdHkgPSAxO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHRjYXNlIFwibG93XCI6XHJcblx0XHRcdFx0XHRcdFx0bnVtZXJpY1ByaW9yaXR5ID0gMjtcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFx0Y2FzZSBcIm1lZGl1bVwiOlxyXG5cdFx0XHRcdFx0XHRcdG51bWVyaWNQcmlvcml0eSA9IDM7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcdGNhc2UgXCJoaWdoXCI6XHJcblx0XHRcdFx0XHRcdFx0bnVtZXJpY1ByaW9yaXR5ID0gNDtcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFx0Y2FzZSBcImhpZ2hlc3RcIjpcclxuXHRcdFx0XHRcdFx0XHRudW1lcmljUHJpb3JpdHkgPSA1O1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdFx0XHRcdG51bWVyaWNQcmlvcml0eSA9XHJcblx0XHRcdFx0XHRcdFx0XHRwYXJzZUludCh0aGlzLnRhc2subWV0YWRhdGEucHJpb3JpdHkpIHx8IDE7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdG51bWVyaWNQcmlvcml0eSA9IHRoaXMudGFzay5tZXRhZGF0YS5wcmlvcml0eTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGNvbnN0IHNhbml0aXplZFByaW9yaXR5ID1cclxuXHRcdFx0XHRcdHNhbml0aXplUHJpb3JpdHlGb3JDbGFzcyhudW1lcmljUHJpb3JpdHkpO1xyXG5cdFx0XHRcdGNvbnN0IGNsYXNzZXMgPSBbXCJ0Zy1xdWFkcmFudC1jYXJkLXByaW9yaXR5XCJdO1xyXG5cdFx0XHRcdGlmIChzYW5pdGl6ZWRQcmlvcml0eSkge1xyXG5cdFx0XHRcdFx0Y2xhc3Nlcy5wdXNoKGBwcmlvcml0eS0ke3Nhbml0aXplZFByaW9yaXR5fWApO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRjb25zdCBwcmlvcml0eUVsID0gZWwuY3JlYXRlRGl2KHsgY2xzOiBjbGFzc2VzIH0pO1xyXG5cclxuXHRcdFx0XHQvLyDmoLnmja7kvJjlhYjnuqfmlbDlrZfmmL7npLrkuI3lkIzmlbDph4/nmoTmhJ/lj7nlj7dcclxuXHRcdFx0XHRsZXQgaWNvbiA9IFwiIVwiLnJlcGVhdChudW1lcmljUHJpb3JpdHkpO1xyXG5cdFx0XHRcdHByaW9yaXR5RWwudGV4dENvbnRlbnQgPSBpY29uO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBGaWxlIG5hbWVcclxuXHRcdFx0Y29uc3QgZmlsZU5hbWUgPSBlbC5jcmVhdGVTcGFuKFwidGctcXVhZHJhbnQtY2FyZC1maWxlLW5hbWVcIik7XHJcblx0XHRcdGZpbGVOYW1lLnRleHRDb250ZW50ID0gdGhpcy5nZXRGaWxlTmFtZSgpO1xyXG5cclxuXHRcdFx0Ly8gTGluZSBudW1iZXJcclxuXHRcdFx0Y29uc3QgbGluZUVsID0gZWwuY3JlYXRlU3BhbihcInRnLXF1YWRyYW50LWNhcmQtbGluZVwiKTtcclxuXHRcdFx0bGluZUVsLnRleHRDb250ZW50ID0gYEwke3RoaXMudGFzay5saW5lfWA7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYWRkRXZlbnRMaXN0ZW5lcnMoKSB7XHJcblx0XHQvLyBDYXJkIGNsaWNrIHRvIHNlbGVjdCB0YXNrXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQodGhpcy5jb250YWluZXJFbCwgXCJjbGlja1wiLCAoZSkgPT4ge1xyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0ZS50YXJnZXQgPT09IHRoaXMuY2hlY2tib3hFbCB8fFxyXG5cdFx0XHRcdHRoaXMuY2hlY2tib3hFbC5jb250YWlucyhlLnRhcmdldCBhcyBOb2RlKVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRyZXR1cm47IC8vIERvbid0IHNlbGVjdCB3aGVuIGNsaWNraW5nIGNoZWNrYm94XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmICh0aGlzLnBhcmFtcy5vblRhc2tTZWxlY3RlZCkge1xyXG5cdFx0XHRcdHRoaXMucGFyYW1zLm9uVGFza1NlbGVjdGVkKHRoaXMudGFzayk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFJpZ2h0LWNsaWNrIGNvbnRleHQgbWVudVxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KHRoaXMuY29udGFpbmVyRWwsIFwiY29udGV4dG1lbnVcIiwgKGUpID0+IHtcclxuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cclxuXHRcdFx0aWYgKHRoaXMucGFyYW1zLm9uVGFza0NvbnRleHRNZW51KSB7XHJcblx0XHRcdFx0dGhpcy5wYXJhbXMub25UYXNrQ29udGV4dE1lbnUoZSwgdGhpcy50YXNrKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0aGlzLnNob3dDb250ZXh0TWVudShlKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gRG91YmxlLWNsaWNrIHRvIG9wZW4gZmlsZVxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KHRoaXMuY29udGFpbmVyRWwsIFwiZGJsY2xpY2tcIiwgKGUpID0+IHtcclxuXHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHRcdFx0dGhpcy5vcGVuVGFza0luRmlsZSgpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHNob3dDb250ZXh0TWVudShlOiBNb3VzZUV2ZW50KSB7XHJcblx0XHRjb25zdCBtZW51ID0gbmV3IE1lbnUoKTtcclxuXHJcblx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0aXRlbS5zZXRUaXRsZSh0KFwiT3BlbiBpbiBmaWxlXCIpKVxyXG5cdFx0XHRcdC5zZXRJY29uKFwiZXh0ZXJuYWwtbGlua1wiKVxyXG5cdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMub3BlblRhc2tJbkZpbGUoKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJDb3B5IHRhc2tcIikpXHJcblx0XHRcdFx0LnNldEljb24oXCJjb3B5XCIpXHJcblx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0bmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQodGhpcy50YXNrLm9yaWdpbmFsTWFya2Rvd24pO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0bWVudS5hZGRTZXBhcmF0b3IoKTtcclxuXHJcblx0XHQvLyBDaGVjayBpZiB0YXNrIGFscmVhZHkgaGFzIHVyZ2VudCBvciBpbXBvcnRhbnQgdGFncyAoY2hlY2sgYm90aCBjb250ZW50IGFuZCBtZXRhZGF0YSlcclxuXHRcdGNvbnN0IGhhc1VyZ2VudFRhZyA9XHJcblx0XHRcdHRoaXMudGFzay5jb250ZW50LmluY2x1ZGVzKFwiI3VyZ2VudFwiKSB8fFxyXG5cdFx0XHR0aGlzLnRhc2subWV0YWRhdGEudGFncz8uaW5jbHVkZXMoXCIjdXJnZW50XCIpO1xyXG5cdFx0Y29uc3QgaGFzSW1wb3J0YW50VGFnID1cclxuXHRcdFx0dGhpcy50YXNrLmNvbnRlbnQuaW5jbHVkZXMoXCIjaW1wb3J0YW50XCIpIHx8XHJcblx0XHRcdHRoaXMudGFzay5tZXRhZGF0YS50YWdzPy5pbmNsdWRlcyhcIiNpbXBvcnRhbnRcIik7XHJcblxyXG5cdFx0aWYgKCFoYXNVcmdlbnRUYWcpIHtcclxuXHRcdFx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdFx0aXRlbS5zZXRUaXRsZSh0KFwiTWFyayBhcyB1cmdlbnRcIikpXHJcblx0XHRcdFx0XHQuc2V0SWNvbihcInphcFwiKVxyXG5cdFx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLmFkZFRhZ1RvVGFzayhcIiN1cmdlbnRcIik7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJSZW1vdmUgdXJnZW50IHRhZ1wiKSlcclxuXHRcdFx0XHRcdC5zZXRJY29uKFwiemFwLW9mZlwiKVxyXG5cdFx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnJlbW92ZVRhZ0Zyb21UYXNrKFwiI3VyZ2VudFwiKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoIWhhc0ltcG9ydGFudFRhZykge1xyXG5cdFx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJNYXJrIGFzIGltcG9ydGFudFwiKSlcclxuXHRcdFx0XHRcdC5zZXRJY29uKFwic3RhclwiKVxyXG5cdFx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLmFkZFRhZ1RvVGFzayhcIiNpbXBvcnRhbnRcIik7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJSZW1vdmUgaW1wb3J0YW50IHRhZ1wiKSlcclxuXHRcdFx0XHRcdC5zZXRJY29uKFwic3Rhci1vZmZcIilcclxuXHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5yZW1vdmVUYWdGcm9tVGFzayhcIiNpbXBvcnRhbnRcIik7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0bWVudS5zaG93QXRNb3VzZUV2ZW50KGUpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBvcGVuVGFza0luRmlsZSgpIHtcclxuXHRcdGNvbnN0IGZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRGaWxlQnlQYXRoKHRoaXMudGFzay5maWxlUGF0aCk7XHJcblx0XHRpZiAoZmlsZSkge1xyXG5cdFx0XHRjb25zdCBsZWFmID0gdGhpcy5hcHAud29ya3NwYWNlLmdldExlYWYoZmFsc2UpO1xyXG5cdFx0XHRhd2FpdCBsZWFmLm9wZW5GaWxlKGZpbGUgYXMgYW55KTtcclxuXHJcblx0XHRcdC8vIE5hdmlnYXRlIHRvIHRoZSBzcGVjaWZpYyBsaW5lXHJcblx0XHRcdGNvbnN0IHZpZXcgPSBsZWFmLnZpZXc7XHJcblx0XHRcdGlmICh2aWV3ICYmIHZpZXcgaW5zdGFuY2VvZiBNYXJrZG93blZpZXcgJiYgdmlldy5lZGl0b3IpIHtcclxuXHRcdFx0XHRjb25zdCBsaW5lTnVtYmVyID0gdGhpcy50YXNrLmxpbmUgLSAxO1xyXG5cdFx0XHRcdHZpZXcuZWRpdG9yLnNldEN1cnNvcihsaW5lTnVtYmVyLCAwKTtcclxuXHRcdFx0XHR2aWV3LmVkaXRvci5zY3JvbGxJbnRvVmlldyhcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0ZnJvbTogeyBsaW5lOiBsaW5lTnVtYmVyLCBjaDogMCB9LFxyXG5cdFx0XHRcdFx0XHR0bzogeyBsaW5lOiBsaW5lTnVtYmVyLCBjaDogMCB9LFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHRydWVcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIGFkZFRhZ1RvVGFzayh0YWc6IHN0cmluZykge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Ly8gQ3JlYXRlIGEgY29weSBvZiB0aGUgdGFzayB3aXRoIHRoZSBuZXcgdGFnXHJcblx0XHRcdGNvbnN0IHVwZGF0ZWRUYXNrID0geyAuLi50aGlzLnRhc2sgfTtcclxuXHJcblx0XHRcdC8vIEluaXRpYWxpemUgdGFncyBhcnJheSBpZiBpdCBkb2Vzbid0IGV4aXN0XHJcblx0XHRcdGlmICghdXBkYXRlZFRhc2subWV0YWRhdGEudGFncykge1xyXG5cdFx0XHRcdHVwZGF0ZWRUYXNrLm1ldGFkYXRhLnRhZ3MgPSBbXTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQWRkIHRoZSB0YWcgaWYgaXQgZG9lc24ndCBhbHJlYWR5IGV4aXN0XHJcblx0XHRcdGlmICghdXBkYXRlZFRhc2subWV0YWRhdGEudGFncy5pbmNsdWRlcyh0YWcpKSB7XHJcblx0XHRcdFx0dXBkYXRlZFRhc2subWV0YWRhdGEudGFncyA9IFsuLi51cGRhdGVkVGFzay5tZXRhZGF0YS50YWdzLCB0YWddO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgdGhlIGxvY2FsIHRhc2sgcmVmZXJlbmNlIGFuZCByZS1yZW5kZXJcclxuXHRcdFx0dGhpcy50YXNrID0gdXBkYXRlZFRhc2s7XHJcblx0XHRcdHRoaXMucmVuZGVyKCk7XHJcblxyXG5cdFx0XHQvLyBOb3RpZnkgcGFyZW50IGNvbXBvbmVudCBhYm91dCB0YXNrIHVwZGF0ZVxyXG5cdFx0XHRpZiAodGhpcy5wYXJhbXMub25UYXNrVXBkYXRlZCkge1xyXG5cdFx0XHRcdGF3YWl0IHRoaXMucGFyYW1zLm9uVGFza1VwZGF0ZWQodXBkYXRlZFRhc2spO1xyXG5cdFx0XHR9XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFxyXG5cdFx0XHRcdGBGYWlsZWQgdG8gYWRkIHRhZyAke3RhZ30gdG8gdGFzayAke3RoaXMudGFzay5pZH06YCxcclxuXHRcdFx0XHRlcnJvclxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyByZW1vdmVUYWdGcm9tVGFzayh0YWc6IHN0cmluZykge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Ly8gQ3JlYXRlIGEgY29weSBvZiB0aGUgdGFzayB3aXRob3V0IHRoZSB0YWdcclxuXHRcdFx0Y29uc3QgdXBkYXRlZFRhc2sgPSB7IC4uLnRoaXMudGFzayB9O1xyXG5cclxuXHRcdFx0Ly8gUmVtb3ZlIHRoZSB0YWcgZnJvbSB0aGUgdGFncyBhcnJheVxyXG5cdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YS50YWdzID0gdXBkYXRlZFRhc2subWV0YWRhdGEudGFncy5maWx0ZXIoXHJcblx0XHRcdFx0KHQpID0+IHQgIT09IHRhZ1xyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIHRoZSBsb2NhbCB0YXNrIHJlZmVyZW5jZSBhbmQgcmUtcmVuZGVyXHJcblx0XHRcdHRoaXMudGFzayA9IHVwZGF0ZWRUYXNrO1xyXG5cdFx0XHR0aGlzLnJlbmRlcigpO1xyXG5cclxuXHRcdFx0Ly8gTm90aWZ5IHBhcmVudCBjb21wb25lbnQgYWJvdXQgdGFzayB1cGRhdGVcclxuXHRcdFx0aWYgKHRoaXMucGFyYW1zLm9uVGFza1VwZGF0ZWQpIHtcclxuXHRcdFx0XHRhd2FpdCB0aGlzLnBhcmFtcy5vblRhc2tVcGRhdGVkKHVwZGF0ZWRUYXNrKTtcclxuXHRcdFx0fVxyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcclxuXHRcdFx0XHRgRmFpbGVkIHRvIHJlbW92ZSB0YWcgJHt0YWd9IGZyb20gdGFzayAke3RoaXMudGFzay5pZH06YCxcclxuXHRcdFx0XHRlcnJvclxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBleHRyYWN0VGFncygpOiBzdHJpbmdbXSB7XHJcblx0XHRjb25zdCBjb250ZW50ID0gdGhpcy50YXNrLmNvbnRlbnQgfHwgXCJcIjtcclxuXHRcdGNvbnN0IHJlc3VsdHM6IHN0cmluZ1tdID0gW107XHJcblx0XHRsZXQgaSA9IDA7XHJcblx0XHR3aGlsZSAoaSA8IGNvbnRlbnQubGVuZ3RoKSB7XHJcblx0XHRcdGNvbnN0IGhhc2hJbmRleCA9IGNvbnRlbnQuaW5kZXhPZihcIiNcIiwgaSk7XHJcblx0XHRcdGlmIChoYXNoSW5kZXggPT09IC0xKSBicmVhaztcclxuXHRcdFx0Ly8gQ291bnQgY29uc2VjdXRpdmUgYmFja3NsYXNoZXMgaW1tZWRpYXRlbHkgYmVmb3JlICcjJ1xyXG5cdFx0XHRsZXQgYnNDb3VudCA9IDA7XHJcblx0XHRcdGxldCBqID0gaGFzaEluZGV4IC0gMTtcclxuXHRcdFx0d2hpbGUgKGogPj0gMCAmJiBjb250ZW50W2pdID09PSBcIlxcXFxcIikge1xyXG5cdFx0XHRcdGJzQ291bnQrKztcclxuXHRcdFx0XHRqLS07XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gSWYgb2RkIG51bWJlciBvZiBiYWNrc2xhc2hlcyBwcmVjZWRlICcjJywgaXQgaXMgZXNjYXBlZCDihpIgc2tpcFxyXG5cdFx0XHRpZiAoYnNDb3VudCAlIDIgPT09IDEpIHtcclxuXHRcdFx0XHRpID0gaGFzaEluZGV4ICsgMTtcclxuXHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0fVxyXG5cdFx0XHQvLyBFeHRyYWN0IHRhZyB0ZXh0OiBhbGxvdyBhLXpBLVowLTksICcvJywgJy0nLCAnXycsIGFuZCBub24tQVNDSUkgKGUuZy4sIENoaW5lc2UpXHJcblx0XHRcdGxldCBrID0gaGFzaEluZGV4ICsgMTtcclxuXHRcdFx0d2hpbGUgKGsgPCBjb250ZW50Lmxlbmd0aCkge1xyXG5cdFx0XHRcdGNvbnN0IGNoID0gY29udGVudFtrXTtcclxuXHRcdFx0XHRjb25zdCBjb2RlID0gY2guY2hhckNvZGVBdCgwKTtcclxuXHRcdFx0XHRjb25zdCBpc0FzY2lpQWxudW0gPVxyXG5cdFx0XHRcdFx0KGNvZGUgPj0gNDggJiYgY29kZSA8PSA1NykgfHxcclxuXHRcdFx0XHRcdChjb2RlID49IDY1ICYmIGNvZGUgPD0gOTApIHx8XHJcblx0XHRcdFx0XHQoY29kZSA+PSA5NyAmJiBjb2RlIDw9IDEyMik7XHJcblx0XHRcdFx0Y29uc3QgaXNBbGxvd2VkID1cclxuXHRcdFx0XHRcdGlzQXNjaWlBbG51bSB8fFxyXG5cdFx0XHRcdFx0Y2ggPT09IFwiL1wiIHx8XHJcblx0XHRcdFx0XHRjaCA9PT0gXCItXCIgfHxcclxuXHRcdFx0XHRcdGNoID09PSBcIl9cIiB8fFxyXG5cdFx0XHRcdFx0Y29kZSA+IDEyNztcclxuXHRcdFx0XHRpZiAoIWlzQWxsb3dlZCkgYnJlYWs7XHJcblx0XHRcdFx0aysrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChrID4gaGFzaEluZGV4ICsgMSkge1xyXG5cdFx0XHRcdHJlc3VsdHMucHVzaChjb250ZW50LnN1YnN0cmluZyhoYXNoSW5kZXgsIGspKTtcclxuXHRcdFx0XHRpID0gaztcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRpID0gaGFzaEluZGV4ICsgMTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHJlc3VsdHM7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldFByaW9yaXR5Q2xhc3MoKTogc3RyaW5nIHtcclxuXHRcdGlmICh0aGlzLnRhc2suY29udGVudC5pbmNsdWRlcyhcIvCflLpcIikpXHJcblx0XHRcdHJldHVybiBcInRnLXF1YWRyYW50LWNhcmQtLXByaW9yaXR5LWhpZ2hlc3RcIjtcclxuXHRcdGlmICh0aGlzLnRhc2suY29udGVudC5pbmNsdWRlcyhcIuKPq1wiKSlcclxuXHRcdFx0cmV0dXJuIFwidGctcXVhZHJhbnQtY2FyZC0tcHJpb3JpdHktaGlnaFwiO1xyXG5cdFx0aWYgKHRoaXMudGFzay5jb250ZW50LmluY2x1ZGVzKFwi8J+UvFwiKSlcclxuXHRcdFx0cmV0dXJuIFwidGctcXVhZHJhbnQtY2FyZC0tcHJpb3JpdHktbWVkaXVtXCI7XHJcblx0XHRpZiAodGhpcy50YXNrLmNvbnRlbnQuaW5jbHVkZXMoXCLwn5S9XCIpKVxyXG5cdFx0XHRyZXR1cm4gXCJ0Zy1xdWFkcmFudC1jYXJkLS1wcmlvcml0eS1sb3dcIjtcclxuXHRcdGlmICh0aGlzLnRhc2suY29udGVudC5pbmNsdWRlcyhcIuKPrFwiKSlcclxuXHRcdFx0cmV0dXJuIFwidGctcXVhZHJhbnQtY2FyZC0tcHJpb3JpdHktbG93ZXN0XCI7XHJcblx0XHRyZXR1cm4gXCJcIjtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZ2V0VGFza0R1ZURhdGUoKTogRGF0ZSB8IG51bGwge1xyXG5cdFx0Ly8gRXh0cmFjdCBkdWUgZGF0ZSBmcm9tIHRhc2sgY29udGVudCAtIHRoaXMgaXMgYSBzaW1wbGlmaWVkIGltcGxlbWVudGF0aW9uXHJcblx0XHRjb25zdCBtYXRjaCA9IHRoaXMudGFzay5jb250ZW50Lm1hdGNoKC/wn5OFXFxzKihcXGR7NH0tXFxkezJ9LVxcZHsyfSkvKTtcclxuXHRcdGlmIChtYXRjaCkge1xyXG5cdFx0XHRyZXR1cm4gbmV3IERhdGUobWF0Y2hbMV0pO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIG51bGw7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGZvcm1hdER1ZURhdGUoZGF0ZTogRGF0ZSk6IHN0cmluZyB7XHJcblx0XHRjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xyXG5cdFx0Y29uc3QgZGlmZiA9IGRhdGUuZ2V0VGltZSgpIC0gbm93LmdldFRpbWUoKTtcclxuXHRcdGNvbnN0IGRheXMgPSBNYXRoLmNlaWwoZGlmZiAvICgxMDAwICogNjAgKiA2MCAqIDI0KSk7XHJcblxyXG5cdFx0aWYgKGRheXMgPCAwKSB7XHJcblx0XHRcdGNvbnN0IG92ZXJkdWVEYXlzID0gTWF0aC5hYnMoZGF5cyk7XHJcblx0XHRcdHJldHVybiB0KFwiT3ZlcmR1ZSBieVwiKSArIFwiIFwiICsgb3ZlcmR1ZURheXMgKyBcIiBcIiArIHQoXCJkYXlzXCIpO1xyXG5cdFx0fSBlbHNlIGlmIChkYXlzID09PSAwKSB7XHJcblx0XHRcdHJldHVybiB0KFwiRHVlIHRvZGF5XCIpO1xyXG5cdFx0fSBlbHNlIGlmIChkYXlzID09PSAxKSB7XHJcblx0XHRcdHJldHVybiB0KFwiRHVlIHRvbW9ycm93XCIpO1xyXG5cdFx0fSBlbHNlIGlmIChkYXlzIDw9IDcpIHtcclxuXHRcdFx0cmV0dXJuIHQoXCJEdWUgaW5cIikgKyBcIiBcIiArIGRheXMgKyBcIiBcIiArIHQoXCJkYXlzXCIpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0cmV0dXJuIGRhdGUudG9Mb2NhbGVEYXRlU3RyaW5nKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGlzRHVlU29vbihkYXRlOiBEYXRlKTogYm9vbGVhbiB7XHJcblx0XHRjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xyXG5cdFx0Y29uc3QgZGlmZiA9IGRhdGUuZ2V0VGltZSgpIC0gbm93LmdldFRpbWUoKTtcclxuXHRcdGNvbnN0IGRheXMgPSBkaWZmIC8gKDEwMDAgKiA2MCAqIDYwICogMjQpO1xyXG5cdFx0cmV0dXJuIGRheXMgPj0gMCAmJiBkYXlzIDw9IDM7IC8vIER1ZSB3aXRoaW4gMyBkYXlzXHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGlzT3ZlcmR1ZShkYXRlOiBEYXRlKTogYm9vbGVhbiB7XHJcblx0XHRjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xyXG5cdFx0cmV0dXJuIGRhdGUuZ2V0VGltZSgpIDwgbm93LmdldFRpbWUoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZ2V0RmlsZU5hbWUoKTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IHBhcnRzID0gdGhpcy50YXNrLmZpbGVQYXRoLnNwbGl0KFwiL1wiKTtcclxuXHRcdHJldHVybiBwYXJ0c1twYXJ0cy5sZW5ndGggLSAxXS5yZXBsYWNlKC9cXC5tZCQvLCBcIlwiKTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBnZXRUYXNrKCk6IFRhc2sge1xyXG5cdFx0cmV0dXJuIHRoaXMudGFzaztcclxuXHR9XHJcblxyXG5cdHB1YmxpYyB1cGRhdGVUYXNrKHRhc2s6IFRhc2spIHtcclxuXHRcdHRoaXMudGFzayA9IHRhc2s7XHJcblx0XHR0aGlzLnJlbmRlcigpO1xyXG5cdH1cclxufVxyXG4iXX0=