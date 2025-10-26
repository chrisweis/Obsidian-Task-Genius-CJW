/**
 * Task Metadata Editor Component
 * Provides functionality to display and edit task metadata.
 */
import { __awaiter } from "tslib";
import { Component, TextComponent, DropdownComponent, } from "obsidian";
import { t } from "@/translations/helper";
import { ProjectSuggest, TagSuggest, ContextSuggest, } from "@/components/ui/inputs/AutoComplete";
import { StatusComponent } from "@/components/ui/feedback/StatusIndicator";
// import { format } from "date-fns";
import { getEffectiveProject, isProjectReadonly, } from "@/utils/task/task-operations";
import { OnCompletionConfigurator } from "@/components/features/on-completion/OnCompletionConfigurator";
import { timestampToLocalDateString, localDateStringToTimestamp, } from "@/utils/date/date-display-helper";
export class TaskMetadataEditor extends Component {
    constructor(container, app, plugin, isCompactMode = false) {
        super();
        this.activeTab = "overview"; // Default active tab
        this.container = container;
        this.app = app;
        this.plugin = plugin;
        this.isCompactMode = isCompactMode;
    }
    /**
     * Displays the task metadata editing interface.
     */
    showTask(task) {
        this.task = task;
        this.container.empty();
        this.container.addClass("task-metadata-editor");
        if (this.isCompactMode) {
            this.createTabbedView();
        }
        else {
            this.createFullView();
        }
    }
    /**
     * Creates the tabbed view (for Popover - compact mode).
     */
    createTabbedView() {
        // Create status editor (at the top, outside tabs)
        this.createStatusEditor();
        const tabsContainer = this.container.createDiv({
            cls: "tabs-main-container",
        });
        const nav = tabsContainer.createEl("nav", { cls: "tabs-navigation" });
        const content = tabsContainer.createDiv({ cls: "tabs-content" });
        const tabs = [
            {
                id: "overview",
                label: t("Overview"),
                populateFn: this.populateOverviewTabContent.bind(this),
            },
            {
                id: "dates",
                label: t("Dates"),
                populateFn: this.populateDatesTabContent.bind(this),
            },
            {
                id: "details",
                label: t("Details"),
                populateFn: this.populateDetailsTabContent.bind(this),
            },
        ];
        const tabButtons = {};
        const tabPanes = {};
        tabs.forEach((tabInfo) => {
            const button = nav.createEl("button", {
                text: tabInfo.label,
                cls: "tab-button",
            });
            button.dataset.tab = tabInfo.id;
            tabButtons[tabInfo.id] = button;
            const pane = content.createDiv({
                cls: "tab-pane",
            });
            pane.id = `tab-pane-${tabInfo.id}`;
            tabPanes[tabInfo.id] = pane;
            tabInfo.populateFn(pane); // Populate content immediately
            this.registerDomEvent(button, "click", () => {
                this.activeTab = tabInfo.id;
                this.updateActiveTab(tabButtons, tabPanes);
            });
        });
        // Set initial active tab
        this.updateActiveTab(tabButtons, tabPanes);
    }
    updateActiveTab(tabButtons, tabPanes) {
        for (const id in tabButtons) {
            if (id === this.activeTab) {
                tabButtons[id].addClass("active");
                tabPanes[id].addClass("active");
            }
            else {
                tabButtons[id].removeClass("active");
                tabPanes[id].removeClass("active");
            }
        }
    }
    populateOverviewTabContent(pane) {
        this.createPriorityEditor(pane);
        this.createDateEditor(pane, t("Due Date"), "dueDate", this.getDateString(this.task.metadata.dueDate));
    }
    populateDatesTabContent(pane) {
        this.createDateEditor(pane, t("Start Date"), "startDate", this.getDateString(this.task.metadata.startDate));
        this.createDateEditor(pane, t("Scheduled Date"), "scheduledDate", this.getDateString(this.task.metadata.scheduledDate));
        this.createDateEditor(pane, t("Cancelled Date"), "cancelledDate", this.getDateString(this.task.metadata.cancelledDate));
        this.createRecurrenceEditor(pane);
    }
    populateDetailsTabContent(pane) {
        this.createProjectEditor(pane);
        this.createTagsEditor(pane);
        this.createContextEditor(pane);
        this.createOnCompletionEditor(pane);
        this.createDependsOnEditor(pane);
        this.createIdEditor(pane);
    }
    /**
     * Creates the full view (for Modal).
     */
    createFullView() {
        // Create status editor
        this.createStatusEditor();
        // Create full metadata editing area
        const metadataContainer = this.container.createDiv({
            cls: "metadata-full-container",
        });
        // Project editor
        this.createProjectEditor(metadataContainer);
        // Tags editor
        this.createTagsEditor(metadataContainer);
        // Context editor
        this.createContextEditor(metadataContainer);
        // Priority editor
        this.createPriorityEditor(metadataContainer);
        // Date editor (all date types)
        const datesContainer = metadataContainer.createDiv({
            cls: "dates-container",
        });
        this.createDateEditor(datesContainer, t("Due Date"), "dueDate", this.getDateString(this.task.metadata.dueDate));
        this.createDateEditor(datesContainer, t("Start Date"), "startDate", this.getDateString(this.task.metadata.startDate));
        this.createDateEditor(datesContainer, t("Scheduled Date"), "scheduledDate", this.getDateString(this.task.metadata.scheduledDate));
        this.createDateEditor(datesContainer, t("Cancelled Date"), "cancelledDate", this.getDateString(this.task.metadata.cancelledDate));
        // Recurrence rule editor
        this.createRecurrenceEditor(metadataContainer);
        // New fields
        this.createOnCompletionEditor(metadataContainer);
        this.createDependsOnEditor(metadataContainer);
        this.createIdEditor(metadataContainer);
    }
    /**
     * Converts a date value to a string.
     */
    getDateString(dateValue) {
        if (dateValue === undefined)
            return "";
        if (typeof dateValue === "number") {
            // For numeric timestamps, prefer helper for correct display across timezones
            return timestampToLocalDateString(dateValue);
        }
        // Already a YYYY-MM-DD string
        return dateValue;
    }
    /**
     * Creates a status editor.
     */
    createStatusEditor() {
        const statusContainer = this.container.createDiv({
            cls: "task-status-editor",
        });
        const statusComponent = new StatusComponent(this.plugin, statusContainer, this.task, {
            type: "quick-capture",
            onTaskUpdate: (task, updatedTask) => __awaiter(this, void 0, void 0, function* () {
                this.notifyMetadataChange("status", updatedTask.status);
            }),
            onTaskStatusSelected: (status) => {
                this.notifyMetadataChange("status", status);
            },
        });
        statusComponent.onload();
    }
    /**
     * Creates a priority editor.
     */
    createPriorityEditor(container) {
        const fieldContainer = container.createDiv({
            cls: "field-container priority-container",
        });
        const fieldLabel = fieldContainer.createDiv({ cls: "field-label" });
        fieldLabel.setText(t("Priority"));
        const priorityDropdown = new DropdownComponent(fieldContainer)
            .addOption("", t("None"))
            .addOption("1", "⏬️ " + t("Lowest"))
            .addOption("2", "🔽 " + t("Low"))
            .addOption("3", "🔼 " + t("Medium"))
            .addOption("4", "⏫ " + t("High"))
            .addOption("5", "🔺 " + t("Highest"))
            .onChange((value) => {
            this.notifyMetadataChange("priority", parseInt(value));
        });
        priorityDropdown.selectEl.addClass("priority-select");
        const taskPriority = this.getPriorityString(this.task.metadata.priority);
        priorityDropdown.setValue(taskPriority || "");
    }
    /**
     * Converts a priority value to a string.
     */
    getPriorityString(priority) {
        if (priority === undefined)
            return "";
        return String(priority);
    }
    /**
     * Creates a date editor.
     */
    createDateEditor(container, label, // Already wrapped with t() where called
    field, value) {
        const fieldContainer = container.createDiv({
            cls: `field-container date-container ${field}-container`,
        });
        const fieldLabel = fieldContainer.createDiv({ cls: "field-label" });
        fieldLabel.setText(label);
        const dateInput = fieldContainer.createEl("input", {
            cls: `date-input ${field}-input`,
            type: "date",
        });
        if (value) {
            // If already a YYYY-MM-DD string, use directly; else use helper for timestamp
            const isDateString = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
            if (isDateString) {
                dateInput.value = value;
            }
            else {
                try {
                    const asNum = typeof value === "number" ? value : Number(value);
                    dateInput.value = timestampToLocalDateString(Number.isFinite(asNum) ? asNum : undefined);
                }
                catch (e) {
                    console.error(`Cannot parse date: ${value}`, e);
                }
            }
        }
        this.registerDomEvent(dateInput, "change", () => {
            const dateValue = dateInput.value;
            if (dateValue) {
                // Use helper to convert local date string to UTC noon timestamp
                const timestamp = localDateStringToTimestamp(dateValue);
                if (timestamp !== undefined) {
                    this.notifyMetadataChange(field, timestamp);
                }
            }
            else {
                this.notifyMetadataChange(field, undefined);
            }
        });
    }
    /**
     * Creates a project editor.
     */
    createProjectEditor(container) {
        const fieldContainer = container.createDiv({
            cls: "field-container project-container",
        });
        const fieldLabel = fieldContainer.createDiv({ cls: "field-label" });
        fieldLabel.setText(t("Project"));
        const effectiveProject = getEffectiveProject(this.task);
        const isReadonly = isProjectReadonly(this.task);
        const projectInput = new TextComponent(fieldContainer)
            .setPlaceholder(t("Project name"))
            .setValue(effectiveProject || "")
            .setDisabled(isReadonly)
            .onChange((value) => {
            if (!isReadonly) {
                this.notifyMetadataChange("project", value);
            }
        });
        // Add visual indicator for tgProject - only show if no user-set project exists
        if (isReadonly &&
            this.task.metadata.tgProject &&
            (!this.task.metadata.project || !this.task.metadata.project.trim())) {
            fieldContainer.addClass("project-readonly");
            const indicator = fieldContainer.createDiv({
                cls: "project-source-indicator",
                text: `From ${this.task.metadata.tgProject.type}: ${this.task.metadata.tgProject.source || ""}`,
            });
        }
        this.registerDomEvent(projectInput.inputEl, "blur", () => {
            if (!isReadonly) {
                this.notifyMetadataChange("project", projectInput.inputEl.value);
            }
        });
        if (!isReadonly) {
            new ProjectSuggest(this.app, projectInput.inputEl, this.plugin);
        }
    }
    /**
     * Creates a tags editor.
     */
    createTagsEditor(container) {
        const fieldContainer = container.createDiv({
            cls: "field-container tags-container",
        });
        const fieldLabel = fieldContainer.createDiv({ cls: "field-label" });
        fieldLabel.setText(t("Tags"));
        const tagsInput = new TextComponent(fieldContainer)
            .setPlaceholder(t("e.g. #tag1, #tag2"))
            .setValue(Array.isArray(this.task.metadata.tags)
            ? this.task.metadata.tags.join(", ")
            : "");
        this.registerDomEvent(tagsInput.inputEl, "blur", () => {
            const tags = tagsInput.inputEl.value
                .split(",")
                .map((tag) => tag.trim())
                .filter((tag) => tag);
            this.notifyMetadataChange("tags", tags);
        });
        new TagSuggest(this.app, tagsInput.inputEl, this.plugin);
    }
    /**
     * Creates a context editor.
     */
    createContextEditor(container) {
        const fieldContainer = container.createDiv({
            cls: "field-container context-container",
        });
        const fieldLabel = fieldContainer.createDiv({ cls: "field-label" });
        fieldLabel.setText(t("Context"));
        const contextInput = new TextComponent(fieldContainer)
            .setPlaceholder(t("e.g. @home, @work"))
            .setValue(Array.isArray(this.task.metadata.context)
            ? this.task.metadata.context.join(", ")
            : "");
        this.registerDomEvent(contextInput.inputEl, "blur", () => {
            const contexts = contextInput.inputEl.value
                .split(",")
                .map((ctx) => ctx.trim())
                .filter((ctx) => ctx);
            this.notifyMetadataChange("context", contexts);
        });
        new ContextSuggest(this.app, contextInput.inputEl, this.plugin);
    }
    /**
     * Creates a recurrence rule editor.
     */
    createRecurrenceEditor(container) {
        const fieldContainer = container.createDiv({
            cls: "field-container recurrence-container",
        });
        const fieldLabel = fieldContainer.createDiv({ cls: "field-label" });
        fieldLabel.setText(t("Recurrence Rule"));
        const recurrenceInput = new TextComponent(fieldContainer)
            .setPlaceholder(t("e.g. every day, every week"))
            .setValue(this.task.metadata.recurrence || "")
            .onChange((value) => {
            this.notifyMetadataChange("recurrence", value);
        });
        this.registerDomEvent(recurrenceInput.inputEl, "blur", () => {
            this.notifyMetadataChange("recurrence", recurrenceInput.inputEl.value);
        });
    }
    /**
     * Creates an onCompletion editor.
     */
    createOnCompletionEditor(container) {
        const fieldContainer = container.createDiv({
            cls: "field-container oncompletion-container",
        });
        const fieldLabel = fieldContainer.createDiv({ cls: "field-label" });
        fieldLabel.setText(t("On Completion"));
        try {
            const onCompletionConfigurator = new OnCompletionConfigurator(fieldContainer, this.plugin, {
                initialValue: this.task.metadata.onCompletion || "",
                onChange: (value) => {
                    this.notifyMetadataChange("onCompletion", value);
                },
                onValidationChange: (isValid, error) => {
                    // Show validation feedback
                    const existingMessage = fieldContainer.querySelector(".oncompletion-validation-message");
                    if (existingMessage) {
                        existingMessage.remove();
                    }
                    if (error) {
                        const messageEl = fieldContainer.createDiv({
                            cls: "oncompletion-validation-message error",
                            text: error,
                        });
                    }
                    else if (isValid && this.task.metadata.onCompletion) {
                        const messageEl = fieldContainer.createDiv({
                            cls: "oncompletion-validation-message success",
                            text: t("Configuration is valid"),
                        });
                    }
                },
            });
            this.addChild(onCompletionConfigurator);
        }
        catch (error) {
            // Fallback to simple text input if OnCompletionConfigurator fails to load
            console.warn("Failed to load OnCompletionConfigurator, using fallback:", error);
            const onCompletionInput = new TextComponent(fieldContainer)
                .setPlaceholder(t("Action to execute on completion"))
                .setValue(this.task.metadata.onCompletion || "")
                .onChange((value) => {
                this.notifyMetadataChange("onCompletion", value);
            });
            this.registerDomEvent(onCompletionInput.inputEl, "blur", () => {
                this.notifyMetadataChange("onCompletion", onCompletionInput.inputEl.value);
            });
        }
    }
    /**
     * Creates a dependsOn editor.
     */
    createDependsOnEditor(container) {
        const fieldContainer = container.createDiv({
            cls: "field-container dependson-container",
        });
        const fieldLabel = fieldContainer.createDiv({ cls: "field-label" });
        fieldLabel.setText(t("Depends On"));
        const dependsOnInput = new TextComponent(fieldContainer)
            .setPlaceholder(t("Task IDs separated by commas"))
            .setValue(Array.isArray(this.task.metadata.dependsOn)
            ? this.task.metadata.dependsOn.join(", ")
            : "");
        this.registerDomEvent(dependsOnInput.inputEl, "blur", () => {
            const dependsOnValue = dependsOnInput.inputEl.value;
            const dependsOnArray = dependsOnValue
                .split(",")
                .map((id) => id.trim())
                .filter((id) => id.length > 0);
            this.notifyMetadataChange("dependsOn", dependsOnArray);
        });
    }
    /**
     * Creates an id editor.
     */
    createIdEditor(container) {
        const fieldContainer = container.createDiv({
            cls: "field-container id-container",
        });
        const fieldLabel = fieldContainer.createDiv({ cls: "field-label" });
        fieldLabel.setText(t("Task ID"));
        const idInput = new TextComponent(fieldContainer)
            .setPlaceholder(t("Unique task identifier"))
            .setValue(this.task.metadata.id || "")
            .onChange((value) => {
            this.notifyMetadataChange("id", value);
        });
        this.registerDomEvent(idInput.inputEl, "blur", () => {
            this.notifyMetadataChange("id", idInput.inputEl.value);
        });
    }
    /**
     * Notifies about metadata changes.
     */
    notifyMetadataChange(field, value) {
        if (this.onMetadataChange) {
            this.onMetadataChange({
                field,
                value,
                task: this.task,
            });
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWV0YWRhdGFFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJNZXRhZGF0YUVkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0dBR0c7O0FBRUgsT0FBTyxFQUVOLFNBQVMsRUFFVCxhQUFhLEVBQ2IsaUJBQWlCLEdBRWpCLE1BQU0sVUFBVSxDQUFDO0FBR2xCLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUMxQyxPQUFPLEVBQ04sY0FBYyxFQUNkLFVBQVUsRUFDVixjQUFjLEdBQ2QsTUFBTSxxQ0FBcUMsQ0FBQztBQUM3QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDM0UscUNBQXFDO0FBQ3JDLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsaUJBQWlCLEdBQ2pCLE1BQU0sOEJBQThCLENBQUM7QUFDdEMsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDeEcsT0FBTyxFQUNOLDBCQUEwQixFQUMxQiwwQkFBMEIsR0FDMUIsTUFBTSxrQ0FBa0MsQ0FBQztBQVExQyxNQUFNLE9BQU8sa0JBQW1CLFNBQVEsU0FBUztJQVVoRCxZQUNDLFNBQXNCLEVBQ3RCLEdBQVEsRUFDUixNQUE2QixFQUM3QixhQUFhLEdBQUcsS0FBSztRQUVyQixLQUFLLEVBQUUsQ0FBQztRQVZELGNBQVMsR0FBVyxVQUFVLENBQUMsQ0FBQyxxQkFBcUI7UUFXNUQsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7UUFDZixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsYUFBYSxHQUFHLGFBQWEsQ0FBQztJQUNwQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxRQUFRLENBQUMsSUFBVTtRQUNsQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQixJQUFJLENBQUMs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QUFDLGNBQWMsQ0FBQzthQUMvQyxjQUFjLENBQUMsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLENBQUM7YUFDM0MsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUM7YUFDckMsUUFBUSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDbkIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN4QyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUU7WUFDbkQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hELENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ0ssb0JBQW9CLENBQUMsS0FBYSxFQUFFLEtBQVU7UUFDckQsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUU7WUFDMUIsSUFBSSxDQUFDLGdCQUFnQixDQUFDO2dCQUNyQixLQUFLO2dCQUNMLEtBQUs7Z0JBQ0wsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO2FBQ2YsQ0FBQyxDQUFDO1NBQ0g7SUFDRixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogVGFzayBNZXRhZGF0YSBFZGl0b3IgQ29tcG9uZW50XHJcbiAqIFByb3ZpZGVzIGZ1bmN0aW9uYWxpdHkgdG8gZGlzcGxheSBhbmQgZWRpdCB0YXNrIG1ldGFkYXRhLlxyXG4gKi9cclxuXHJcbmltcG9ydCB7XHJcblx0QXBwLFxyXG5cdENvbXBvbmVudCxcclxuXHRzZXRJY29uLFxyXG5cdFRleHRDb21wb25lbnQsXHJcblx0RHJvcGRvd25Db21wb25lbnQsXHJcblx0VGV4dEFyZWFDb21wb25lbnQsXHJcbn0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiQC90eXBlcy90YXNrXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHtcclxuXHRQcm9qZWN0U3VnZ2VzdCxcclxuXHRUYWdTdWdnZXN0LFxyXG5cdENvbnRleHRTdWdnZXN0LFxyXG59IGZyb20gXCJAL2NvbXBvbmVudHMvdWkvaW5wdXRzL0F1dG9Db21wbGV0ZVwiO1xyXG5pbXBvcnQgeyBTdGF0dXNDb21wb25lbnQgfSBmcm9tIFwiQC9jb21wb25lbnRzL3VpL2ZlZWRiYWNrL1N0YXR1c0luZGljYXRvclwiO1xyXG4vLyBpbXBvcnQgeyBmb3JtYXQgfSBmcm9tIFwiZGF0ZS1mbnNcIjtcclxuaW1wb3J0IHtcclxuXHRnZXRFZmZlY3RpdmVQcm9qZWN0LFxyXG5cdGlzUHJvamVjdFJlYWRvbmx5LFxyXG59IGZyb20gXCJAL3V0aWxzL3Rhc2svdGFzay1vcGVyYXRpb25zXCI7XHJcbmltcG9ydCB7IE9uQ29tcGxldGlvbkNvbmZpZ3VyYXRvciB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvb24tY29tcGxldGlvbi9PbkNvbXBsZXRpb25Db25maWd1cmF0b3JcIjtcclxuaW1wb3J0IHtcclxuXHR0aW1lc3RhbXBUb0xvY2FsRGF0ZVN0cmluZyxcclxuXHRsb2NhbERhdGVTdHJpbmdUb1RpbWVzdGFtcCxcclxufSBmcm9tIFwiQC91dGlscy9kYXRlL2RhdGUtZGlzcGxheS1oZWxwZXJcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTWV0YWRhdGFDaGFuZ2VFdmVudCB7XHJcblx0ZmllbGQ6IHN0cmluZztcclxuXHR2YWx1ZTogYW55O1xyXG5cdHRhc2s6IFRhc2s7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBUYXNrTWV0YWRhdGFFZGl0b3IgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdHByaXZhdGUgdGFzazogVGFzaztcclxuXHRwcml2YXRlIGNvbnRhaW5lcjogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbjtcclxuXHRwcml2YXRlIGFwcDogQXBwO1xyXG5cdHByaXZhdGUgaXNDb21wYWN0TW9kZTogYm9vbGVhbjtcclxuXHRwcml2YXRlIGFjdGl2ZVRhYjogc3RyaW5nID0gXCJvdmVydmlld1wiOyAvLyBEZWZhdWx0IGFjdGl2ZSB0YWJcclxuXHJcblx0b25NZXRhZGF0YUNoYW5nZTogKGV2ZW50OiBNZXRhZGF0YUNoYW5nZUV2ZW50KSA9PiB2b2lkO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXHJcblx0XHRhcHA6IEFwcCxcclxuXHRcdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0aXNDb21wYWN0TW9kZSA9IGZhbHNlXHJcblx0KSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5jb250YWluZXIgPSBjb250YWluZXI7XHJcblx0XHR0aGlzLmFwcCA9IGFwcDtcclxuXHRcdHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG5cdFx0dGhpcy5pc0NvbXBhY3RNb2RlID0gaXNDb21wYWN0TW9kZTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIERpc3BsYXlzIHRoZSB0YXNrIG1ldGFkYXRhIGVkaXRpbmcgaW50ZXJmYWNlLlxyXG5cdCAqL1xyXG5cdHNob3dUYXNrKHRhc2s6IFRhc2spOiB2b2lkIHtcclxuXHRcdHRoaXMudGFzayA9IHRhc2s7XHJcblx0XHR0aGlzLmNvbnRhaW5lci5lbXB0eSgpO1xyXG5cdFx0dGhpcy5jb250YWluZXIuYWRkQ2xhc3MoXCJ0YXNrLW1ldGFkYXRhLWVkaXRvclwiKTtcclxuXHJcblx0XHRpZiAodGhpcy5pc0NvbXBhY3RNb2RlKSB7XHJcblx0XHRcdHRoaXMuY3JlYXRlVGFiYmVkVmlldygpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy5jcmVhdGVGdWxsVmlldygpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ3JlYXRlcyB0aGUgdGFiYmVkIHZpZXcgKGZvciBQb3BvdmVyIC0gY29tcGFjdCBtb2RlKS5cclxuXHQgKi9cclxuXHRwcml2YXRlIGNyZWF0ZVRhYmJlZFZpZXcoKTogdm9pZCB7XHJcblx0XHQvLyBDcmVhdGUgc3RhdHVzIGVkaXRvciAoYXQgdGhlIHRvcCwgb3V0c2lkZSB0YWJzKVxyXG5cdFx0dGhpcy5jcmVhdGVTdGF0dXNFZGl0b3IoKTtcclxuXHJcblx0XHRjb25zdCB0YWJzQ29udGFpbmVyID0gdGhpcy5jb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInRhYnMtbWFpbi1jb250YWluZXJcIixcclxuXHRcdH0pO1xyXG5cdFx0Y29uc3QgbmF2ID0gdGFic0NvbnRhaW5lci5jcmVhdGVFbChcIm5hdlwiLCB7IGNsczogXCJ0YWJzLW5hdmlnYXRpb25cIiB9KTtcclxuXHRcdGNvbnN0IGNvbnRlbnQgPSB0YWJzQ29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJ0YWJzLWNvbnRlbnRcIiB9KTtcclxuXHJcblx0XHRjb25zdCB0YWJzID0gW1xyXG5cdFx0XHR7XHJcblx0XHRcdFx0aWQ6IFwib3ZlcnZpZXdcIixcclxuXHRcdFx0XHRsYWJlbDogdChcIk92ZXJ2aWV3XCIpLFxyXG5cdFx0XHRcdHBvcHVsYXRlRm46IHRoaXMucG9wdWxhdGVPdmVydmlld1RhYkNvbnRlbnQuYmluZCh0aGlzKSxcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGlkOiBcImRhdGVzXCIsXHJcblx0XHRcdFx0bGFiZWw6IHQoXCJEYXRlc1wiKSxcclxuXHRcdFx0XHRwb3B1bGF0ZUZuOiB0aGlzLnBvcHVsYXRlRGF0ZXNUYWJDb250ZW50LmJpbmQodGhpcyksXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRpZDogXCJkZXRhaWxzXCIsXHJcblx0XHRcdFx0bGFiZWw6IHQoXCJEZXRhaWxzXCIpLFxyXG5cdFx0XHRcdHBvcHVsYXRlRm46IHRoaXMucG9wdWxhdGVEZXRhaWxzVGFiQ29udGVudC5iaW5kKHRoaXMpLFxyXG5cdFx0XHR9LFxyXG5cdFx0XTtcclxuXHJcblx0XHRjb25zdCB0YWJCdXR0b25zOiB7IFtrZXk6IHN0cmluZ106IEhUTUxCdXR0b25FbGVtZW50IH0gPSB7fTtcclxuXHRcdGNvbnN0IHRhYlBhbmVzOiB7IFtrZXk6IHN0cmluZ106IEhUTUxEaXZFbGVtZW50IH0gPSB7fTtcclxuXHJcblx0XHR0YWJzLmZvckVhY2goKHRhYkluZm8pID0+IHtcclxuXHRcdFx0Y29uc3QgYnV0dG9uID0gbmF2LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0XHR0ZXh0OiB0YWJJbmZvLmxhYmVsLFxyXG5cdFx0XHRcdGNsczogXCJ0YWItYnV0dG9uXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRidXR0b24uZGF0YXNldC50YWIgPSB0YWJJbmZvLmlkO1xyXG5cdFx0XHR0YWJCdXR0b25zW3RhYkluZm8uaWRdID0gYnV0dG9uO1xyXG5cclxuXHRcdFx0Y29uc3QgcGFuZSA9IGNvbnRlbnQuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwidGFiLXBhbmVcIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdHBhbmUuaWQgPSBgdGFiLXBhbmUtJHt0YWJJbmZvLmlkfWA7XHJcblx0XHRcdHRhYlBhbmVzW3RhYkluZm8uaWRdID0gcGFuZTtcclxuXHJcblx0XHRcdHRhYkluZm8ucG9wdWxhdGVGbihwYW5lKTsgLy8gUG9wdWxhdGUgY29udGVudCBpbW1lZGlhdGVseVxyXG5cclxuXHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGJ1dHRvbiwgXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5hY3RpdmVUYWIgPSB0YWJJbmZvLmlkO1xyXG5cdFx0XHRcdHRoaXMudXBkYXRlQWN0aXZlVGFiKHRhYkJ1dHRvbnMsIHRhYlBhbmVzKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBTZXQgaW5pdGlhbCBhY3RpdmUgdGFiXHJcblx0XHR0aGlzLnVwZGF0ZUFjdGl2ZVRhYih0YWJCdXR0b25zLCB0YWJQYW5lcyk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHVwZGF0ZUFjdGl2ZVRhYihcclxuXHRcdHRhYkJ1dHRvbnM6IHsgW2tleTogc3RyaW5nXTogSFRNTEJ1dHRvbkVsZW1lbnQgfSxcclxuXHRcdHRhYlBhbmVzOiB7IFtrZXk6IHN0cmluZ106IEhUTUxEaXZFbGVtZW50IH1cclxuXHQpOiB2b2lkIHtcclxuXHRcdGZvciAoY29uc3QgaWQgaW4gdGFiQnV0dG9ucykge1xyXG5cdFx0XHRpZiAoaWQgPT09IHRoaXMuYWN0aXZlVGFiKSB7XHJcblx0XHRcdFx0dGFiQnV0dG9uc1tpZF0uYWRkQ2xhc3MoXCJhY3RpdmVcIik7XHJcblx0XHRcdFx0dGFiUGFuZXNbaWRdLmFkZENsYXNzKFwiYWN0aXZlXCIpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRhYkJ1dHRvbnNbaWRdLnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpO1xyXG5cdFx0XHRcdHRhYlBhbmVzW2lkXS5yZW1vdmVDbGFzcyhcImFjdGl2ZVwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBwb3B1bGF0ZU92ZXJ2aWV3VGFiQ29udGVudChwYW5lOiBIVE1MRWxlbWVudCk6IHZvaWQge1xyXG5cdFx0dGhpcy5jcmVhdGVQcmlvcml0eUVkaXRvcihwYW5lKTtcclxuXHRcdHRoaXMuY3JlYXRlRGF0ZUVkaXRvcihcclxuXHRcdFx0cGFuZSxcclxuXHRcdFx0dChcIkR1ZSBEYXRlXCIpLFxyXG5cdFx0XHRcImR1ZURhdGVcIixcclxuXHRcdFx0dGhpcy5nZXREYXRlU3RyaW5nKHRoaXMudGFzay5tZXRhZGF0YS5kdWVEYXRlKVxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcG9wdWxhdGVEYXRlc1RhYkNvbnRlbnQocGFuZTogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdHRoaXMuY3JlYXRlRGF0ZUVkaXRvcihcclxuXHRcdFx0cGFuZSxcclxuXHRcdFx0dChcIlN0YXJ0IERhdGVcIiksXHJcblx0XHRcdFwic3RhcnREYXRlXCIsXHJcblx0XHRcdHRoaXMuZ2V0RGF0ZVN0cmluZyh0aGlzLnRhc2subWV0YWRhdGEuc3RhcnREYXRlKVxyXG5cdFx0KTtcclxuXHRcdHRoaXMuY3JlYXRlRGF0ZUVkaXRvcihcclxuXHRcdFx0cGFuZSxcclxuXHRcdFx0dChcIlNjaGVkdWxlZCBEYXRlXCIpLFxyXG5cdFx0XHRcInNjaGVkdWxlZERhdGVcIixcclxuXHRcdFx0dGhpcy5nZXREYXRlU3RyaW5nKHRoaXMudGFzay5tZXRhZGF0YS5zY2hlZHVsZWREYXRlKVxyXG5cdFx0KTtcclxuXHRcdHRoaXMuY3JlYXRlRGF0ZUVkaXRvcihcclxuXHRcdFx0cGFuZSxcclxuXHRcdFx0dChcIkNhbmNlbGxlZCBEYXRlXCIpLFxyXG5cdFx0XHRcImNhbmNlbGxlZERhdGVcIixcclxuXHRcdFx0dGhpcy5nZXREYXRlU3RyaW5nKHRoaXMudGFzay5tZXRhZGF0YS5jYW5jZWxsZWREYXRlKVxyXG5cdFx0KTtcclxuXHRcdHRoaXMuY3JlYXRlUmVjdXJyZW5jZUVkaXRvcihwYW5lKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcG9wdWxhdGVEZXRhaWxzVGFiQ29udGVudChwYW5lOiBIVE1MRWxlbWVudCk6IHZvaWQge1xyXG5cdFx0dGhpcy5jcmVhdGVQcm9qZWN0RWRpdG9yKHBhbmUpO1xyXG5cdFx0dGhpcy5jcmVhdGVUYWdzRWRpdG9yKHBhbmUpO1xyXG5cdFx0dGhpcy5jcmVhdGVDb250ZXh0RWRpdG9yKHBhbmUpO1xyXG5cdFx0dGhpcy5jcmVhdGVPbkNvbXBsZXRpb25FZGl0b3IocGFuZSk7XHJcblx0XHR0aGlzLmNyZWF0ZURlcGVuZHNPbkVkaXRvcihwYW5lKTtcclxuXHRcdHRoaXMuY3JlYXRlSWRFZGl0b3IocGFuZSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDcmVhdGVzIHRoZSBmdWxsIHZpZXcgKGZvciBNb2RhbCkuXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjcmVhdGVGdWxsVmlldygpOiB2b2lkIHtcclxuXHRcdC8vIENyZWF0ZSBzdGF0dXMgZWRpdG9yXHJcblx0XHR0aGlzLmNyZWF0ZVN0YXR1c0VkaXRvcigpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBmdWxsIG1ldGFkYXRhIGVkaXRpbmcgYXJlYVxyXG5cdFx0Y29uc3QgbWV0YWRhdGFDb250YWluZXIgPSB0aGlzLmNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwibWV0YWRhdGEtZnVsbC1jb250YWluZXJcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFByb2plY3QgZWRpdG9yXHJcblx0XHR0aGlzLmNyZWF0ZVByb2plY3RFZGl0b3IobWV0YWRhdGFDb250YWluZXIpO1xyXG5cclxuXHRcdC8vIFRhZ3MgZWRpdG9yXHJcblx0XHR0aGlzLmNyZWF0ZVRhZ3NFZGl0b3IobWV0YWRhdGFDb250YWluZXIpO1xyXG5cclxuXHRcdC8vIENvbnRleHQgZWRpdG9yXHJcblx0XHR0aGlzLmNyZWF0ZUNvbnRleHRFZGl0b3IobWV0YWRhdGFDb250YWluZXIpO1xyXG5cclxuXHRcdC8vIFByaW9yaXR5IGVkaXRvclxyXG5cdFx0dGhpcy5jcmVhdGVQcmlvcml0eUVkaXRvcihtZXRhZGF0YUNvbnRhaW5lcik7XHJcblxyXG5cdFx0Ly8gRGF0ZSBlZGl0b3IgKGFsbCBkYXRlIHR5cGVzKVxyXG5cdFx0Y29uc3QgZGF0ZXNDb250YWluZXIgPSBtZXRhZGF0YUNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZGF0ZXMtY29udGFpbmVyXCIsXHJcblx0XHR9KTtcclxuXHRcdHRoaXMuY3JlYXRlRGF0ZUVkaXRvcihcclxuXHRcdFx0ZGF0ZXNDb250YWluZXIsXHJcblx0XHRcdHQoXCJEdWUgRGF0ZVwiKSxcclxuXHRcdFx0XCJkdWVEYXRlXCIsXHJcblx0XHRcdHRoaXMuZ2V0RGF0ZVN0cmluZyh0aGlzLnRhc2subWV0YWRhdGEuZHVlRGF0ZSlcclxuXHRcdCk7XHJcblx0XHR0aGlzLmNyZWF0ZURhdGVFZGl0b3IoXHJcblx0XHRcdGRhdGVzQ29udGFpbmVyLFxyXG5cdFx0XHR0KFwiU3RhcnQgRGF0ZVwiKSxcclxuXHRcdFx0XCJzdGFydERhdGVcIixcclxuXHRcdFx0dGhpcy5nZXREYXRlU3RyaW5nKHRoaXMudGFzay5tZXRhZGF0YS5zdGFydERhdGUpXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5jcmVhdGVEYXRlRWRpdG9yKFxyXG5cdFx0XHRkYXRlc0NvbnRhaW5lcixcclxuXHRcdFx0dChcIlNjaGVkdWxlZCBEYXRlXCIpLFxyXG5cdFx0XHRcInNjaGVkdWxlZERhdGVcIixcclxuXHRcdFx0dGhpcy5nZXREYXRlU3RyaW5nKHRoaXMudGFzay5tZXRhZGF0YS5zY2hlZHVsZWREYXRlKVxyXG5cdFx0KTtcclxuXHRcdHRoaXMuY3JlYXRlRGF0ZUVkaXRvcihcclxuXHRcdFx0ZGF0ZXNDb250YWluZXIsXHJcblx0XHRcdHQoXCJDYW5jZWxsZWQgRGF0ZVwiKSxcclxuXHRcdFx0XCJjYW5jZWxsZWREYXRlXCIsXHJcblx0XHRcdHRoaXMuZ2V0RGF0ZVN0cmluZyh0aGlzLnRhc2subWV0YWRhdGEuY2FuY2VsbGVkRGF0ZSlcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gUmVjdXJyZW5jZSBydWxlIGVkaXRvclxyXG5cdFx0dGhpcy5jcmVhdGVSZWN1cnJlbmNlRWRpdG9yKG1ldGFkYXRhQ29udGFpbmVyKTtcclxuXHJcblx0XHQvLyBOZXcgZmllbGRzXHJcblx0XHR0aGlzLmNyZWF0ZU9uQ29tcGxldGlvbkVkaXRvcihtZXRhZGF0YUNvbnRhaW5lcik7XHJcblx0XHR0aGlzLmNyZWF0ZURlcGVuZHNPbkVkaXRvcihtZXRhZGF0YUNvbnRhaW5lcik7XHJcblx0XHR0aGlzLmNyZWF0ZUlkRWRpdG9yKG1ldGFkYXRhQ29udGFpbmVyKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENvbnZlcnRzIGEgZGF0ZSB2YWx1ZSB0byBhIHN0cmluZy5cclxuXHQgKi9cclxuXHRwcml2YXRlIGdldERhdGVTdHJpbmcoZGF0ZVZhbHVlOiBzdHJpbmcgfCBudW1iZXIgfCB1bmRlZmluZWQpOiBzdHJpbmcge1xyXG5cdFx0aWYgKGRhdGVWYWx1ZSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gXCJcIjtcclxuXHRcdGlmICh0eXBlb2YgZGF0ZVZhbHVlID09PSBcIm51bWJlclwiKSB7XHJcblx0XHRcdC8vIEZvciBudW1lcmljIHRpbWVzdGFtcHMsIHByZWZlciBoZWxwZXIgZm9yIGNvcnJlY3QgZGlzcGxheSBhY3Jvc3MgdGltZXpvbmVzXHJcblx0XHRcdHJldHVybiB0aW1lc3RhbXBUb0xvY2FsRGF0ZVN0cmluZyhkYXRlVmFsdWUpO1xyXG5cdFx0fVxyXG5cdFx0Ly8gQWxyZWFkeSBhIFlZWVktTU0tREQgc3RyaW5nXHJcblx0XHRyZXR1cm4gZGF0ZVZhbHVlO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ3JlYXRlcyBhIHN0YXR1cyBlZGl0b3IuXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjcmVhdGVTdGF0dXNFZGl0b3IoKTogdm9pZCB7XHJcblx0XHRjb25zdCBzdGF0dXNDb250YWluZXIgPSB0aGlzLmNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwidGFzay1zdGF0dXMtZWRpdG9yXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCBzdGF0dXNDb21wb25lbnQgPSBuZXcgU3RhdHVzQ29tcG9uZW50KFxyXG5cdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0c3RhdHVzQ29udGFpbmVyLFxyXG5cdFx0XHR0aGlzLnRhc2ssXHJcblx0XHRcdHtcclxuXHRcdFx0XHR0eXBlOiBcInF1aWNrLWNhcHR1cmVcIixcclxuXHRcdFx0XHRvblRhc2tVcGRhdGU6IGFzeW5jICh0YXNrLCB1cGRhdGVkVGFzaykgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5ub3RpZnlNZXRhZGF0YUNoYW5nZShcInN0YXR1c1wiLCB1cGRhdGVkVGFzay5zdGF0dXMpO1xyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0b25UYXNrU3RhdHVzU2VsZWN0ZWQ6IChzdGF0dXMpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMubm90aWZ5TWV0YWRhdGFDaGFuZ2UoXCJzdGF0dXNcIiwgc3RhdHVzKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cclxuXHRcdHN0YXR1c0NvbXBvbmVudC5vbmxvYWQoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZXMgYSBwcmlvcml0eSBlZGl0b3IuXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjcmVhdGVQcmlvcml0eUVkaXRvcihjb250YWluZXI6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHRjb25zdCBmaWVsZENvbnRhaW5lciA9IGNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZmllbGQtY29udGFpbmVyIHByaW9yaXR5LWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCBmaWVsZExhYmVsID0gZmllbGRDb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcImZpZWxkLWxhYmVsXCIgfSk7XHJcblx0XHRmaWVsZExhYmVsLnNldFRleHQodChcIlByaW9yaXR5XCIpKTtcclxuXHJcblx0XHRjb25zdCBwcmlvcml0eURyb3Bkb3duID0gbmV3IERyb3Bkb3duQ29tcG9uZW50KGZpZWxkQ29udGFpbmVyKVxyXG5cdFx0XHQuYWRkT3B0aW9uKFwiXCIsIHQoXCJOb25lXCIpKVxyXG5cdFx0XHQuYWRkT3B0aW9uKFwiMVwiLCBcIuKPrO+4jyBcIiArIHQoXCJMb3dlc3RcIikpXHJcblx0XHRcdC5hZGRPcHRpb24oXCIyXCIsIFwi8J+UvSBcIiArIHQoXCJMb3dcIikpXHJcblx0XHRcdC5hZGRPcHRpb24oXCIzXCIsIFwi8J+UvCBcIiArIHQoXCJNZWRpdW1cIikpXHJcblx0XHRcdC5hZGRPcHRpb24oXCI0XCIsIFwi4o+rIFwiICsgdChcIkhpZ2hcIikpXHJcblx0XHRcdC5hZGRPcHRpb24oXCI1XCIsIFwi8J+UuiBcIiArIHQoXCJIaWdoZXN0XCIpKVxyXG5cdFx0XHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5ub3RpZnlNZXRhZGF0YUNoYW5nZShcInByaW9yaXR5XCIsIHBhcnNlSW50KHZhbHVlKSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdHByaW9yaXR5RHJvcGRvd24uc2VsZWN0RWwuYWRkQ2xhc3MoXCJwcmlvcml0eS1zZWxlY3RcIik7XHJcblxyXG5cdFx0Y29uc3QgdGFza1ByaW9yaXR5ID0gdGhpcy5nZXRQcmlvcml0eVN0cmluZyhcclxuXHRcdFx0dGhpcy50YXNrLm1ldGFkYXRhLnByaW9yaXR5XHJcblx0XHQpO1xyXG5cdFx0cHJpb3JpdHlEcm9wZG93bi5zZXRWYWx1ZSh0YXNrUHJpb3JpdHkgfHwgXCJcIik7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDb252ZXJ0cyBhIHByaW9yaXR5IHZhbHVlIHRvIGEgc3RyaW5nLlxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZ2V0UHJpb3JpdHlTdHJpbmcocHJpb3JpdHk6IHN0cmluZyB8IG51bWJlciB8IHVuZGVmaW5lZCk6IHN0cmluZyB7XHJcblx0XHRpZiAocHJpb3JpdHkgPT09IHVuZGVmaW5lZCkgcmV0dXJuIFwiXCI7XHJcblx0XHRyZXR1cm4gU3RyaW5nKHByaW9yaXR5KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZXMgYSBkYXRlIGVkaXRvci5cclxuXHQgKi9cclxuXHRwcml2YXRlIGNyZWF0ZURhdGVFZGl0b3IoXHJcblx0XHRjb250YWluZXI6IEhUTUxFbGVtZW50LFxyXG5cdFx0bGFiZWw6IHN0cmluZywgLy8gQWxyZWFkeSB3cmFwcGVkIHdpdGggdCgpIHdoZXJlIGNhbGxlZFxyXG5cdFx0ZmllbGQ6IHN0cmluZyxcclxuXHRcdHZhbHVlOiBzdHJpbmdcclxuXHQpOiB2b2lkIHtcclxuXHRcdGNvbnN0IGZpZWxkQ29udGFpbmVyID0gY29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogYGZpZWxkLWNvbnRhaW5lciBkYXRlLWNvbnRhaW5lciAke2ZpZWxkfS1jb250YWluZXJgLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCBmaWVsZExhYmVsID0gZmllbGRDb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcImZpZWxkLWxhYmVsXCIgfSk7XHJcblx0XHRmaWVsZExhYmVsLnNldFRleHQobGFiZWwpO1xyXG5cclxuXHRcdGNvbnN0IGRhdGVJbnB1dCA9IGZpZWxkQ29udGFpbmVyLmNyZWF0ZUVsKFwiaW5wdXRcIiwge1xyXG5cdFx0XHRjbHM6IGBkYXRlLWlucHV0ICR7ZmllbGR9LWlucHV0YCxcclxuXHRcdFx0dHlwZTogXCJkYXRlXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHRpZiAodmFsdWUpIHtcclxuXHRcdFx0Ly8gSWYgYWxyZWFkeSBhIFlZWVktTU0tREQgc3RyaW5nLCB1c2UgZGlyZWN0bHk7IGVsc2UgdXNlIGhlbHBlciBmb3IgdGltZXN0YW1wXHJcblx0XHRcdGNvbnN0IGlzRGF0ZVN0cmluZyA9XHJcblx0XHRcdFx0dHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiICYmIC9eXFxkezR9LVxcZHsyfS1cXGR7Mn0kLy50ZXN0KHZhbHVlKTtcclxuXHRcdFx0aWYgKGlzRGF0ZVN0cmluZykge1xyXG5cdFx0XHRcdGRhdGVJbnB1dC52YWx1ZSA9IHZhbHVlIGFzIHN0cmluZztcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0Y29uc3QgYXNOdW0gPVxyXG5cdFx0XHRcdFx0XHR0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIgPyB2YWx1ZSA6IE51bWJlcih2YWx1ZSk7XHJcblx0XHRcdFx0XHRkYXRlSW5wdXQudmFsdWUgPSB0aW1lc3RhbXBUb0xvY2FsRGF0ZVN0cmluZyhcclxuXHRcdFx0XHRcdFx0TnVtYmVyLmlzRmluaXRlKGFzTnVtKSA/IChhc051bSBhcyBudW1iZXIpIDogdW5kZWZpbmVkXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoYENhbm5vdCBwYXJzZSBkYXRlOiAke3ZhbHVlfWAsIGUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChkYXRlSW5wdXQsIFwiY2hhbmdlXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZGF0ZVZhbHVlID0gZGF0ZUlucHV0LnZhbHVlO1xyXG5cdFx0XHRpZiAoZGF0ZVZhbHVlKSB7XHJcblx0XHRcdFx0Ly8gVXNlIGhlbHBlciB0byBjb252ZXJ0IGxvY2FsIGRhdGUgc3RyaW5nIHRvIFVUQyBub29uIHRpbWVzdGFtcFxyXG5cdFx0XHRcdGNvbnN0IHRpbWVzdGFtcCA9IGxvY2FsRGF0ZVN0cmluZ1RvVGltZXN0YW1wKGRhdGVWYWx1ZSk7XHJcblx0XHRcdFx0aWYgKHRpbWVzdGFtcCAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0XHR0aGlzLm5vdGlmeU1ldGFkYXRhQ2hhbmdlKGZpZWxkLCB0aW1lc3RhbXApO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0aGlzLm5vdGlmeU1ldGFkYXRhQ2hhbmdlKGZpZWxkLCB1bmRlZmluZWQpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZXMgYSBwcm9qZWN0IGVkaXRvci5cclxuXHQgKi9cclxuXHRwcml2YXRlIGNyZWF0ZVByb2plY3RFZGl0b3IoY29udGFpbmVyOiBIVE1MRWxlbWVudCk6IHZvaWQge1xyXG5cdFx0Y29uc3QgZmllbGRDb250YWluZXIgPSBjb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZpZWxkLWNvbnRhaW5lciBwcm9qZWN0LWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCBmaWVsZExhYmVsID0gZmllbGRDb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcImZpZWxkLWxhYmVsXCIgfSk7XHJcblx0XHRmaWVsZExhYmVsLnNldFRleHQodChcIlByb2plY3RcIikpO1xyXG5cclxuXHRcdGNvbnN0IGVmZmVjdGl2ZVByb2plY3QgPSBnZXRFZmZlY3RpdmVQcm9qZWN0KHRoaXMudGFzayk7XHJcblx0XHRjb25zdCBpc1JlYWRvbmx5ID0gaXNQcm9qZWN0UmVhZG9ubHkodGhpcy50YXNrKTtcclxuXHJcblx0XHRjb25zdCBwcm9qZWN0SW5wdXQgPSBuZXcgVGV4dENvbXBvbmVudChmaWVsZENvbnRhaW5lcilcclxuXHRcdFx0LnNldFBsYWNlaG9sZGVyKHQoXCJQcm9qZWN0IG5hbWVcIikpXHJcblx0XHRcdC5zZXRWYWx1ZShlZmZlY3RpdmVQcm9qZWN0IHx8IFwiXCIpXHJcblx0XHRcdC5zZXREaXNhYmxlZChpc1JlYWRvbmx5KVxyXG5cdFx0XHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0aWYgKCFpc1JlYWRvbmx5KSB7XHJcblx0XHRcdFx0XHR0aGlzLm5vdGlmeU1ldGFkYXRhQ2hhbmdlKFwicHJvamVjdFwiLCB2YWx1ZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHQvLyBBZGQgdmlzdWFsIGluZGljYXRvciBmb3IgdGdQcm9qZWN0IC0gb25seSBzaG93IGlmIG5vIHVzZXItc2V0IHByb2plY3QgZXhpc3RzXHJcblx0XHRpZiAoXHJcblx0XHRcdGlzUmVhZG9ubHkgJiZcclxuXHRcdFx0dGhpcy50YXNrLm1ldGFkYXRhLnRnUHJvamVjdCAmJlxyXG5cdFx0XHQoIXRoaXMudGFzay5tZXRhZGF0YS5wcm9qZWN0IHx8ICF0aGlzLnRhc2subWV0YWRhdGEucHJvamVjdC50cmltKCkpXHJcblx0XHQpIHtcclxuXHRcdFx0ZmllbGRDb250YWluZXIuYWRkQ2xhc3MoXCJwcm9qZWN0LXJlYWRvbmx5XCIpO1xyXG5cdFx0XHRjb25zdCBpbmRpY2F0b3IgPSBmaWVsZENvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJwcm9qZWN0LXNvdXJjZS1pbmRpY2F0b3JcIixcclxuXHRcdFx0XHR0ZXh0OiBgRnJvbSAke3RoaXMudGFzay5tZXRhZGF0YS50Z1Byb2plY3QudHlwZX06ICR7XHJcblx0XHRcdFx0XHR0aGlzLnRhc2subWV0YWRhdGEudGdQcm9qZWN0LnNvdXJjZSB8fCBcIlwiXHJcblx0XHRcdFx0fWAsXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChwcm9qZWN0SW5wdXQuaW5wdXRFbCwgXCJibHVyXCIsICgpID0+IHtcclxuXHRcdFx0aWYgKCFpc1JlYWRvbmx5KSB7XHJcblx0XHRcdFx0dGhpcy5ub3RpZnlNZXRhZGF0YUNoYW5nZShcclxuXHRcdFx0XHRcdFwicHJvamVjdFwiLFxyXG5cdFx0XHRcdFx0cHJvamVjdElucHV0LmlucHV0RWwudmFsdWVcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRpZiAoIWlzUmVhZG9ubHkpIHtcclxuXHRcdFx0bmV3IFByb2plY3RTdWdnZXN0KHRoaXMuYXBwLCBwcm9qZWN0SW5wdXQuaW5wdXRFbCwgdGhpcy5wbHVnaW4pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ3JlYXRlcyBhIHRhZ3MgZWRpdG9yLlxyXG5cdCAqL1xyXG5cdHByaXZhdGUgY3JlYXRlVGFnc0VkaXRvcihjb250YWluZXI6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHRjb25zdCBmaWVsZENvbnRhaW5lciA9IGNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZmllbGQtY29udGFpbmVyIHRhZ3MtY29udGFpbmVyXCIsXHJcblx0XHR9KTtcclxuXHRcdGNvbnN0IGZpZWxkTGFiZWwgPSBmaWVsZENvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwiZmllbGQtbGFiZWxcIiB9KTtcclxuXHRcdGZpZWxkTGFiZWwuc2V0VGV4dCh0KFwiVGFnc1wiKSk7XHJcblxyXG5cdFx0Y29uc3QgdGFnc0lucHV0ID0gbmV3IFRleHRDb21wb25lbnQoZmllbGRDb250YWluZXIpXHJcblx0XHRcdC5zZXRQbGFjZWhvbGRlcih0KFwiZS5nLiAjdGFnMSwgI3RhZzJcIikpXHJcblx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRBcnJheS5pc0FycmF5KHRoaXMudGFzay5tZXRhZGF0YS50YWdzKVxyXG5cdFx0XHRcdFx0PyB0aGlzLnRhc2subWV0YWRhdGEudGFncy5qb2luKFwiLCBcIilcclxuXHRcdFx0XHRcdDogXCJcIlxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudCh0YWdzSW5wdXQuaW5wdXRFbCwgXCJibHVyXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFncyA9IHRhZ3NJbnB1dC5pbnB1dEVsLnZhbHVlXHJcblx0XHRcdFx0LnNwbGl0KFwiLFwiKVxyXG5cdFx0XHRcdC5tYXAoKHRhZykgPT4gdGFnLnRyaW0oKSlcclxuXHRcdFx0XHQuZmlsdGVyKCh0YWcpID0+IHRhZyk7XHJcblx0XHRcdHRoaXMubm90aWZ5TWV0YWRhdGFDaGFuZ2UoXCJ0YWdzXCIsIHRhZ3MpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0bmV3IFRhZ1N1Z2dlc3QodGhpcy5hcHAsIHRhZ3NJbnB1dC5pbnB1dEVsLCB0aGlzLnBsdWdpbik7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDcmVhdGVzIGEgY29udGV4dCBlZGl0b3IuXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjcmVhdGVDb250ZXh0RWRpdG9yKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdGNvbnN0IGZpZWxkQ29udGFpbmVyID0gY29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmaWVsZC1jb250YWluZXIgY29udGV4dC1jb250YWluZXJcIixcclxuXHRcdH0pO1xyXG5cdFx0Y29uc3QgZmllbGRMYWJlbCA9IGZpZWxkQ29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJmaWVsZC1sYWJlbFwiIH0pO1xyXG5cdFx0ZmllbGRMYWJlbC5zZXRUZXh0KHQoXCJDb250ZXh0XCIpKTtcclxuXHJcblx0XHRjb25zdCBjb250ZXh0SW5wdXQgPSBuZXcgVGV4dENvbXBvbmVudChmaWVsZENvbnRhaW5lcilcclxuXHRcdFx0LnNldFBsYWNlaG9sZGVyKHQoXCJlLmcuIEBob21lLCBAd29ya1wiKSlcclxuXHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdEFycmF5LmlzQXJyYXkodGhpcy50YXNrLm1ldGFkYXRhLmNvbnRleHQpXHJcblx0XHRcdFx0XHQ/IHRoaXMudGFzay5tZXRhZGF0YS5jb250ZXh0LmpvaW4oXCIsIFwiKVxyXG5cdFx0XHRcdFx0OiBcIlwiXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGNvbnRleHRJbnB1dC5pbnB1dEVsLCBcImJsdXJcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb250ZXh0cyA9IGNvbnRleHRJbnB1dC5pbnB1dEVsLnZhbHVlXHJcblx0XHRcdFx0LnNwbGl0KFwiLFwiKVxyXG5cdFx0XHRcdC5tYXAoKGN0eCkgPT4gY3R4LnRyaW0oKSlcclxuXHRcdFx0XHQuZmlsdGVyKChjdHgpID0+IGN0eCk7XHJcblx0XHRcdHRoaXMubm90aWZ5TWV0YWRhdGFDaGFuZ2UoXCJjb250ZXh0XCIsIGNvbnRleHRzKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdG5ldyBDb250ZXh0U3VnZ2VzdCh0aGlzLmFwcCwgY29udGV4dElucHV0LmlucHV0RWwsIHRoaXMucGx1Z2luKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZXMgYSByZWN1cnJlbmNlIHJ1bGUgZWRpdG9yLlxyXG5cdCAqL1xyXG5cdHByaXZhdGUgY3JlYXRlUmVjdXJyZW5jZUVkaXRvcihjb250YWluZXI6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHRjb25zdCBmaWVsZENvbnRhaW5lciA9IGNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZmllbGQtY29udGFpbmVyIHJlY3VycmVuY2UtY29udGFpbmVyXCIsXHJcblx0XHR9KTtcclxuXHRcdGNvbnN0IGZpZWxkTGFiZWwgPSBmaWVsZENvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwiZmllbGQtbGFiZWxcIiB9KTtcclxuXHRcdGZpZWxkTGFiZWwuc2V0VGV4dCh0KFwiUmVjdXJyZW5jZSBSdWxlXCIpKTtcclxuXHJcblx0XHRjb25zdCByZWN1cnJlbmNlSW5wdXQgPSBuZXcgVGV4dENvbXBvbmVudChmaWVsZENvbnRhaW5lcilcclxuXHRcdFx0LnNldFBsYWNlaG9sZGVyKHQoXCJlLmcuIGV2ZXJ5IGRheSwgZXZlcnkgd2Vla1wiKSlcclxuXHRcdFx0LnNldFZhbHVlKHRoaXMudGFzay5tZXRhZGF0YS5yZWN1cnJlbmNlIHx8IFwiXCIpXHJcblx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHR0aGlzLm5vdGlmeU1ldGFkYXRhQ2hhbmdlKFwicmVjdXJyZW5jZVwiLCB2YWx1ZSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChyZWN1cnJlbmNlSW5wdXQuaW5wdXRFbCwgXCJibHVyXCIsICgpID0+IHtcclxuXHRcdFx0dGhpcy5ub3RpZnlNZXRhZGF0YUNoYW5nZShcclxuXHRcdFx0XHRcInJlY3VycmVuY2VcIixcclxuXHRcdFx0XHRyZWN1cnJlbmNlSW5wdXQuaW5wdXRFbC52YWx1ZVxyXG5cdFx0XHQpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDcmVhdGVzIGFuIG9uQ29tcGxldGlvbiBlZGl0b3IuXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjcmVhdGVPbkNvbXBsZXRpb25FZGl0b3IoY29udGFpbmVyOiBIVE1MRWxlbWVudCk6IHZvaWQge1xyXG5cdFx0Y29uc3QgZmllbGRDb250YWluZXIgPSBjb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZpZWxkLWNvbnRhaW5lciBvbmNvbXBsZXRpb24tY29udGFpbmVyXCIsXHJcblx0XHR9KTtcclxuXHRcdGNvbnN0IGZpZWxkTGFiZWwgPSBmaWVsZENvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwiZmllbGQtbGFiZWxcIiB9KTtcclxuXHRcdGZpZWxkTGFiZWwuc2V0VGV4dCh0KFwiT24gQ29tcGxldGlvblwiKSk7XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3Qgb25Db21wbGV0aW9uQ29uZmlndXJhdG9yID0gbmV3IE9uQ29tcGxldGlvbkNvbmZpZ3VyYXRvcihcclxuXHRcdFx0XHRmaWVsZENvbnRhaW5lcixcclxuXHRcdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRpbml0aWFsVmFsdWU6IHRoaXMudGFzay5tZXRhZGF0YS5vbkNvbXBsZXRpb24gfHwgXCJcIixcclxuXHRcdFx0XHRcdG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5ub3RpZnlNZXRhZGF0YUNoYW5nZShcIm9uQ29tcGxldGlvblwiLCB2YWx1ZSk7XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0b25WYWxpZGF0aW9uQ2hhbmdlOiAoaXNWYWxpZCwgZXJyb3IpID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8gU2hvdyB2YWxpZGF0aW9uIGZlZWRiYWNrXHJcblx0XHRcdFx0XHRcdGNvbnN0IGV4aXN0aW5nTWVzc2FnZSA9IGZpZWxkQ29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFx0XHRcdFx0XCIub25jb21wbGV0aW9uLXZhbGlkYXRpb24tbWVzc2FnZVwiXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdGlmIChleGlzdGluZ01lc3NhZ2UpIHtcclxuXHRcdFx0XHRcdFx0XHRleGlzdGluZ01lc3NhZ2UucmVtb3ZlKCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdGlmIChlcnJvcikge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IG1lc3NhZ2VFbCA9IGZpZWxkQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0XHRcdFx0XHRjbHM6IFwib25jb21wbGV0aW9uLXZhbGlkYXRpb24tbWVzc2FnZSBlcnJvclwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dGV4dDogZXJyb3IsXHJcblx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoaXNWYWxpZCAmJiB0aGlzLnRhc2subWV0YWRhdGEub25Db21wbGV0aW9uKSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgbWVzc2FnZUVsID0gZmllbGRDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRcdFx0XHRcdGNsczogXCJvbmNvbXBsZXRpb24tdmFsaWRhdGlvbi1tZXNzYWdlIHN1Y2Nlc3NcIixcclxuXHRcdFx0XHRcdFx0XHRcdHRleHQ6IHQoXCJDb25maWd1cmF0aW9uIGlzIHZhbGlkXCIpLFxyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH1cclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdHRoaXMuYWRkQ2hpbGQob25Db21wbGV0aW9uQ29uZmlndXJhdG9yKTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdC8vIEZhbGxiYWNrIHRvIHNpbXBsZSB0ZXh0IGlucHV0IGlmIE9uQ29tcGxldGlvbkNvbmZpZ3VyYXRvciBmYWlscyB0byBsb2FkXHJcblx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcIkZhaWxlZCB0byBsb2FkIE9uQ29tcGxldGlvbkNvbmZpZ3VyYXRvciwgdXNpbmcgZmFsbGJhY2s6XCIsXHJcblx0XHRcdFx0ZXJyb3JcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGNvbnN0IG9uQ29tcGxldGlvbklucHV0ID0gbmV3IFRleHRDb21wb25lbnQoZmllbGRDb250YWluZXIpXHJcblx0XHRcdFx0LnNldFBsYWNlaG9sZGVyKHQoXCJBY3Rpb24gdG8gZXhlY3V0ZSBvbiBjb21wbGV0aW9uXCIpKVxyXG5cdFx0XHRcdC5zZXRWYWx1ZSh0aGlzLnRhc2subWV0YWRhdGEub25Db21wbGV0aW9uIHx8IFwiXCIpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5ub3RpZnlNZXRhZGF0YUNoYW5nZShcIm9uQ29tcGxldGlvblwiLCB2YWx1ZSk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQob25Db21wbGV0aW9uSW5wdXQuaW5wdXRFbCwgXCJibHVyXCIsICgpID0+IHtcclxuXHRcdFx0XHR0aGlzLm5vdGlmeU1ldGFkYXRhQ2hhbmdlKFxyXG5cdFx0XHRcdFx0XCJvbkNvbXBsZXRpb25cIixcclxuXHRcdFx0XHRcdG9uQ29tcGxldGlvbklucHV0LmlucHV0RWwudmFsdWVcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZXMgYSBkZXBlbmRzT24gZWRpdG9yLlxyXG5cdCAqL1xyXG5cdHByaXZhdGUgY3JlYXRlRGVwZW5kc09uRWRpdG9yKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdGNvbnN0IGZpZWxkQ29udGFpbmVyID0gY29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmaWVsZC1jb250YWluZXIgZGVwZW5kc29uLWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCBmaWVsZExhYmVsID0gZmllbGRDb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcImZpZWxkLWxhYmVsXCIgfSk7XHJcblx0XHRmaWVsZExhYmVsLnNldFRleHQodChcIkRlcGVuZHMgT25cIikpO1xyXG5cclxuXHRcdGNvbnN0IGRlcGVuZHNPbklucHV0ID0gbmV3IFRleHRDb21wb25lbnQoZmllbGRDb250YWluZXIpXHJcblx0XHRcdC5zZXRQbGFjZWhvbGRlcih0KFwiVGFzayBJRHMgc2VwYXJhdGVkIGJ5IGNvbW1hc1wiKSlcclxuXHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdEFycmF5LmlzQXJyYXkodGhpcy50YXNrLm1ldGFkYXRhLmRlcGVuZHNPbilcclxuXHRcdFx0XHRcdD8gdGhpcy50YXNrLm1ldGFkYXRhLmRlcGVuZHNPbi5qb2luKFwiLCBcIilcclxuXHRcdFx0XHRcdDogXCJcIlxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChkZXBlbmRzT25JbnB1dC5pbnB1dEVsLCBcImJsdXJcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBkZXBlbmRzT25WYWx1ZSA9IGRlcGVuZHNPbklucHV0LmlucHV0RWwudmFsdWU7XHJcblx0XHRcdGNvbnN0IGRlcGVuZHNPbkFycmF5ID0gZGVwZW5kc09uVmFsdWVcclxuXHRcdFx0XHQuc3BsaXQoXCIsXCIpXHJcblx0XHRcdFx0Lm1hcCgoaWQpID0+IGlkLnRyaW0oKSlcclxuXHRcdFx0XHQuZmlsdGVyKChpZCkgPT4gaWQubGVuZ3RoID4gMCk7XHJcblx0XHRcdHRoaXMubm90aWZ5TWV0YWRhdGFDaGFuZ2UoXCJkZXBlbmRzT25cIiwgZGVwZW5kc09uQXJyYXkpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDcmVhdGVzIGFuIGlkIGVkaXRvci5cclxuXHQgKi9cclxuXHRwcml2YXRlIGNyZWF0ZUlkRWRpdG9yKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdGNvbnN0IGZpZWxkQ29udGFpbmVyID0gY29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmaWVsZC1jb250YWluZXIgaWQtY29udGFpbmVyXCIsXHJcblx0XHR9KTtcclxuXHRcdGNvbnN0IGZpZWxkTGFiZWwgPSBmaWVsZENvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwiZmllbGQtbGFiZWxcIiB9KTtcclxuXHRcdGZpZWxkTGFiZWwuc2V0VGV4dCh0KFwiVGFzayBJRFwiKSk7XHJcblxyXG5cdFx0Y29uc3QgaWRJbnB1dCA9IG5ldyBUZXh0Q29tcG9uZW50KGZpZWxkQ29udGFpbmVyKVxyXG5cdFx0XHQuc2V0UGxhY2Vob2xkZXIodChcIlVuaXF1ZSB0YXNrIGlkZW50aWZpZXJcIikpXHJcblx0XHRcdC5zZXRWYWx1ZSh0aGlzLnRhc2subWV0YWRhdGEuaWQgfHwgXCJcIilcclxuXHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdHRoaXMubm90aWZ5TWV0YWRhdGFDaGFuZ2UoXCJpZFwiLCB2YWx1ZSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChpZElucHV0LmlucHV0RWwsIFwiYmx1clwiLCAoKSA9PiB7XHJcblx0XHRcdHRoaXMubm90aWZ5TWV0YWRhdGFDaGFuZ2UoXCJpZFwiLCBpZElucHV0LmlucHV0RWwudmFsdWUpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBOb3RpZmllcyBhYm91dCBtZXRhZGF0YSBjaGFuZ2VzLlxyXG5cdCAqL1xyXG5cdHByaXZhdGUgbm90aWZ5TWV0YWRhdGFDaGFuZ2UoZmllbGQ6IHN0cmluZywgdmFsdWU6IGFueSk6IHZvaWQge1xyXG5cdFx0aWYgKHRoaXMub25NZXRhZGF0YUNoYW5nZSkge1xyXG5cdFx0XHR0aGlzLm9uTWV0YWRhdGFDaGFuZ2Uoe1xyXG5cdFx0XHRcdGZpZWxkLFxyXG5cdFx0XHRcdHZhbHVlLFxyXG5cdFx0XHRcdHRhc2s6IHRoaXMudGFzayxcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcbiJdfQ==