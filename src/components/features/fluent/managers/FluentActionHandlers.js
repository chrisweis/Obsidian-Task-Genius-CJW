import { __awaiter } from "tslib";
import { Component, Menu, Notice, TFile } from "obsidian";
import { QuickCaptureModal } from "@/components/features/quick-capture/modals/QuickCaptureModal";
import { ConfirmModal } from "@/components/ui/modals/ConfirmModal";
import { createTaskCheckbox } from "@/components/features/task/view/details";
import { emitTaskSelected } from "@/components/features/fluent/events/ui-event";
import { t } from "@/translations/helper";
/**
 * FluentActionHandlers - Handles all user actions and task operations
 *
 * Responsibilities:
 * - Task selection and deselection
 * - Task completion toggling
 * - Task updates (status, metadata, etc.)
 * - Task context menus
 * - Task deletion (with children support)
 * - Navigation actions (view switch, project select, search)
 * - Settings and UI actions
 */
export class FluentActionHandlers extends Component {
    constructor(app, plugin, getWorkspaceId, useSideLeaves) {
        super();
        this.app = app;
        this.plugin = plugin;
        this.getWorkspaceId = getWorkspaceId;
        this.useSideLeaves = useSideLeaves;
        // Task selection state
        this.currentSelectedTaskId = null;
        this.lastToggleTimestamp = 0;
    }
    /**
     * Set callbacks for action results
     */
    setCallbacks(callbacks) {
        this.onTaskSelectionChanged = callbacks.onTaskSelectionChanged;
        this.onTaskUpdated = callbacks.onTaskUpdated;
        this.onTaskDeleted = callbacks.onTaskDeleted;
        this.onNavigateToView = callbacks.onNavigateToView;
        this.onSearchQueryChanged = callbacks.onSearchQueryChanged;
        this.onProjectSelected = callbacks.onProjectSelected;
        this.onViewModeChanged = callbacks.onViewModeChanged;
        this.showDetailsPanel = callbacks.showDetailsPanel;
        this.toggleDetailsVisibility = callbacks.toggleDetailsVisibility;
        this.getIsDetailsVisible = callbacks.getIsDetailsVisible;
    }
    /**
     * Handle task selection
     */
    handleTaskSelection(task) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        // Emit cross-view selection when using side leaves
        if (this.useSideLeaves()) {
            emitTaskSelected(this.app, {
                taskId: (_a = task === null || task === void 0 ? void 0 : task.id) !== null && _a !== void 0 ? _a : null,
                origin: "main",
                workspaceId: this.getWorkspaceId(),
            });
        }
        if (task) {
            const now = Date.now();
            const timeSinceLastToggle = now - this.lastToggleTimestamp;
            if (this.currentSelectedTaskId !== task.id) {
                this.currentSelectedTaskId = task.id;
                (_b = this.showDetailsPanel) === null || _b === void 0 ? void 0 : _b.call(this, task);
                const isDetailsVisible = (_d = (_c = this.getIsDetailsVisible) === null || _c === void 0 ? void 0 : _c.call(this)) !== null && _d !== void 0 ? _d : false;
                if (!isDetailsVisible) {
                    (_e = this.toggleDetailsVisibility) === null || _e === void 0 ? void 0 : _e.call(this, true);
                }
                this.lastToggleTimestamp = now;
                (_f = this.onTaskSelectionChanged) === null || _f === void 0 ? void 0 : _f.call(this, task);
                return;
            }
            if (timeSinceLastToggle > 150) {
                const isDetailsVisible = (_h = (_g = this.getIsDetailsVisible) === null || _g === void 0 ? void 0 : _g.call(this)) !== null && _h !== void 0 ? _h : false;
                (_j = this.toggleDetailsVisibility) === null || _j === void 0 ? void 0 : _j.call(this, !isDetailsVisible);
                this.lastToggleTimestamp = now;
            }
        }
        else {
            (_k = this.toggleDetailsVisibility) === null || _k === void 0 ? void 0 : _k.call(this, false);
            this.currentSelectedTaskId = null;
            (_l = this.onTaskSelectionChanged) === null || _l === void 0 ? void 0 : _l.call(this, null);
        }
    }
    /**
     * Toggle task completion status
     */
    toggleTaskCompletion(task) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.plugin.writeAPI) {
                new Notice("WriteAPI not available");
                return;
            }
            const updatedTask = Object.assign(Object.assign({}, task), { completed: !task.completed });
            if (updatedTask.completed) {
                updatedTask.metadata.completedDate = Date.now();
                const completedMark = (this.plugin.settings.taskStatuses.completed || "x").split("|")[0];
                if (updatedTask.status !== completedMark) {
                    updatedTask.status = completedMark;
                }
            }
            else {
                updatedTask.metadata.completedDate = undefined;
                const notStartedMark = this.plugin.settings.taskStatuses.notStarted || " ";
                if (this.isCompletedMark(updatedTask.status)) {
                    updatedTask.status = notStartedMark;
                }
            }
            yield this.handleTaskUpdate(task, updatedTask);
        });
    }
    /**
     * Handle task update
     */
    handleTaskUpdate(originalTask, updatedTask) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.plugin.writeAPI) {
                console.error("WriteAPI not available");
                return;
            }
            try {
                const updates = this.extractChangedFields(originalTask, updatedTask);
                const writeResult = yield this.plugin.writeAPI.updateTask({
                    taskId: originalTask.id,
                    updates: updates,
                });
                if (!writeResult.success) {
                    throw new Error(writeResult.error || "Failed to update task");
                }
                const updated = writeResult.task || updatedTask;
                // Notify about task update
                (_a = this.onTaskUpdated) === null || _a === void 0 ? void 0 : _a.call(this, originalTask.id, updated);
                new Notice(t("Task updated"));
            }
            catch (error) {
                console.error("Failed to update task:", error);
                new Notice("Failed to update task");
            }
        });
    }
    /**
     * Handle kanban task status update
     */
    handleKanbanTaskStatusUpdate(task, newStatusMark) {
        return __awaiter(this, void 0, void 0, function* () {
            const isCompleted = this.isCompletedMark(newStatusMark);
            const completedDate = isCompleted ? Date.now() : undefined;
            if (task.status !== newStatusMark || task.completed !== isCompleted) {
                yield this.handleTaskUpdate(task, Object.assign(Object.assign({}, task), { status: newStatusMark, completed: isCompleted, metadata: Object.assign(Object.assign({}, task.metadata), { completedDate: completedDate }) }));
            }
        });
    }
    /**
     * Show task context menu
     */
    handleTaskContextMenu(event, task) {
        const menu = new Menu();
        menu.addItem((item) => {
            item.setTitle(t("Complete"));
            item.setIcon("check-square");
            item.onClick(() => {
                this.toggleTaskCompletion(task);
            });
        })
            .addItem((item) => {
            item.setIcon("square-pen");
            item.setTitle(t("Switch status"));
            const submenu = item.setSubmenu();
            // Get unique statuses from taskStatusMarks
            const statusMarks = this.plugin.settings.taskStatusMarks;
            const uniqueStatuses = new Map();
            // Build a map of unique mark -> status name to avoid duplicates
            for (const status of Object.keys(statusMarks)) {
                const mark = statusMarks[status];
                if (!Array.from(uniqueStatuses.values()).includes(mark)) {
                    uniqueStatuses.set(status, mark);
                }
            }
            // Create menu items from unique statuses
            for (const [status, mark] of uniqueStatuses) {
                submenu.addItem((item) => {
                    item.titleEl.createEl("span", {
                        cls: "status-option-checkbox",
                    }, (el) => {
                        createTaskCheckbox(mark, task, el);
                    });
                    item.titleEl.createEl("span", {
                        cls: "status-option",
                        text: status,
                    });
                    item.onClick(() => __awaiter(this, void 0, void 0, function* () {
                        const willComplete = this.isCompletedMark(mark);
                        const updatedTask = Object.assign(Object.assign({}, task), { status: mark, completed: willComplete });
                        if (!task.completed && willComplete) {
                            updatedTask.metadata.completedDate = Date.now();
                        }
                        else if (task.completed && !willComplete) {
                            updatedTask.metadata.completedDate = undefined;
                        }
                        yield this.handleTaskUpdate(task, updatedTask);
                    }));
                });
            }
        })
            .addSeparator()
            .addItem((item) => {
            item.setTitle(t("Edit"));
            item.setIcon("pencil");
            item.onClick(() => {
                this.handleTaskSelection(task);
            });
        })
            .addItem((item) => {
            item.setTitle(t("Edit in File"));
            item.setIcon("pencil");
            item.onClick(() => {
                this.editTask(task);
            });
        })
            .addSeparator()
            .addItem((item) => {
            item.setTitle(t("Delete Task"));
            item.setIcon("trash");
            item.onClick(() => {
                this.confirmAndDeleteTask(event, task);
            });
        });
        menu.showAtMouseEvent(event);
    }
    /**
     * Edit task in file
     */
    editTask(task) {
        return __awaiter(this, void 0, void 0, function* () {
            const file = this.app.vault.getFileByPath(task.filePath);
            if (!(file instanceof TFile))
                return;
            const leaf = this.app.workspace.getLeaf(false);
            yield leaf.openFile(file, {
                eState: { line: task.line },
            });
        });
    }
    /**
     * Confirm and delete task (with children option)
     */
    confirmAndDeleteTask(event, task) {
        const hasChildren = task.metadata &&
            task.metadata.children &&
            task.metadata.children.length > 0;
        if (hasChildren) {
            const menu = new Menu();
            menu.addItem((item) => {
                item.setTitle(t("Delete task only"));
                item.setIcon("trash");
                item.onClick(() => {
                    this.deleteTask(task, false);
                });
            });
            menu.addItem((item) => {
                item.setTitle(t("Delete task and all subtasks"));
                item.setIcon("trash-2");
                item.onClick(() => {
                    this.deleteTask(task, true);
                });
            });
            menu.addSeparator();
            menu.addItem((item) => {
                item.setTitle(t("Cancel"));
            });
            menu.showAtMouseEvent(event);
        }
        else {
            const modal = new ConfirmModal(this.plugin, {
                title: t("Delete Task"),
                message: t("Are you sure you want to delete this task?"),
                confirmText: t("Delete"),
                cancelText: t("Cancel"),
                onConfirm: (confirmed) => {
                    if (confirmed) {
                        this.deleteTask(task, false);
                    }
                },
            });
            modal.open();
        }
    }
    /**
     * Delete task (and optionally children)
     */
    deleteTask(task, deleteChildren) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.plugin.writeAPI) {
                console.error("WriteAPI not available for deleteTask");
                new Notice(t("Failed to delete task"));
                return;
            }
            try {
                const result = yield this.plugin.writeAPI.deleteTask({
                    taskId: task.id,
                    deleteChildren,
                });
                if (result.success) {
                    new Notice(t("Task deleted"));
                    // Notify about task deletion
                    (_a = this.onTaskDeleted) === null || _a === void 0 ? void 0 : _a.call(this, task.id, deleteChildren);
                    // Clear selection if deleted task was selected
                    if (this.currentSelectedTaskId === task.id) {
                        this.handleTaskSelection(null);
                    }
                }
                else {
                    new Notice(t("Failed to delete task") +
                        ": " +
                        (result.error || "Unknown error"));
                }
            }
            catch (error) {
                console.error("Error deleting task:", error);
                new Notice(t("Failed to delete task") + ": " + error.message);
            }
        });
    }
    /**
     * Handle navigation to a view or create new task
     */
    handleNavigate(viewId) {
        var _a;
        if (viewId === "new-task") {
            new QuickCaptureModal(this.app, this.plugin).open();
        }
        else {
            console.log(`[FluentAction] handleNavigate to ${viewId}`);
            (_a = this.onNavigateToView) === null || _a === void 0 ? void 0 : _a.call(this, viewId);
        }
    }
    /**
     * Handle search query change
     */
    handleSearch(query) {
        var _a;
        (_a = this.onSearchQueryChanged) === null || _a === void 0 ? void 0 : _a.call(this, query);
    }
    /**
     * Handle project selection
     */
    handleProjectSelect(projectId) {
        var _a;
        console.log(`[FluentAction] Project selected: ${projectId}`);
        (_a = this.onProjectSelected) === null || _a === void 0 ? void 0 : _a.call(this, projectId);
    }
    /**
     * Handle view mode change (list/tree/kanban/calendar)
     */
    handleViewModeChange(mode) {
        var _a;
        (_a = this.onViewModeChanged) === null || _a === void 0 ? void 0 : _a.call(this, mode);
    }
    /**
     * Handle settings button click
     */
    handleSettingsClick() {
        // Open Obsidian settings and navigate to the plugin tab
        this.app.setting.open();
        this.app.setting.openTabById(this.plugin.manifest.id);
    }
    /**
     * Check if a status mark indicates completion
     */
    isCompletedMark(mark) {
        var _a;
        if (!mark)
            return false;
        try {
            const lower = mark.toLowerCase();
            const completedCfg = String(((_a = this.plugin.settings.taskStatuses) === null || _a === void 0 ? void 0 : _a.completed) || "x");
            const completedSet = completedCfg
                .split("|")
                .map((s) => s.trim().toLowerCase())
                .filter(Boolean);
            return completedSet.includes(lower);
        }
        catch (_) {
            return false;
        }
    }
    /**
     * Extract changed fields from task update
     */
    extractChangedFields(originalTask, updatedTask) {
        var _a, _b;
        const changes = {};
        // Check top-level fields
        if (originalTask.content !== updatedTask.content) {
            changes.content = updatedTask.content;
        }
        if (originalTask.completed !== updatedTask.completed) {
            changes.completed = updatedTask.completed;
        }
        if (originalTask.status !== updatedTask.status) {
            changes.status = updatedTask.status;
        }
        // Check metadata fields
        const metadataChanges = {};
        let hasMetadataChanges = false;
        const metadataFields = [
            "priority",
            "project",
            "tags",
            "context",
            "dueDate",
            "startDate",
            "scheduledDate",
            "completedDate",
            "recurrence",
        ];
        for (const field of metadataFields) {
            const originalValue = (_a = originalTask.metadata) === null || _a === void 0 ? void 0 : _a[field];
            const updatedValue = (_b = updatedTask.metadata) === null || _b === void 0 ? void 0 : _b[field];
            if (field === "tags") {
                const origTags = originalValue || [];
                const updTags = updatedValue || [];
                if (origTags.length !== updTags.length ||
                    !origTags.every((t, i) => t === updTags[i])) {
                    metadataChanges.tags = updTags;
                    hasMetadataChanges = true;
                }
            }
            else if (originalValue !== updatedValue) {
                metadataChanges[field] = updatedValue;
                hasMetadataChanges = true;
            }
        }
        if (hasMetadataChanges) {
            changes.metadata = metadataChanges;
        }
        return changes;
    }
    /**
     * Get current selected task ID
     */
    getCurrentSelectedTaskId() {
        return this.currentSelectedTaskId;
    }
    /**
     * Clear task selection
     */
    clearSelection() {
        var _a;
        this.currentSelectedTaskId = null;
        (_a = this.onTaskSelectionChanged) === null || _a === void 0 ? void 0 : _a.call(this, null);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmx1ZW50QWN0aW9uSGFuZGxlcnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJGbHVlbnRBY3Rpb25IYW5kbGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFPLFNBQVMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUcvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDN0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDaEYsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRzFDOzs7Ozs7Ozs7OztHQVdHO0FBQ0gsTUFBTSxPQUFPLG9CQUFxQixTQUFRLFNBQVM7SUFpQmxELFlBQ1MsR0FBUSxFQUNSLE1BQTZCLEVBQzdCLGNBQTRCLEVBQzVCLGFBQTRCO1FBRXBDLEtBQUssRUFBRSxDQUFDO1FBTEEsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUNSLFdBQU0sR0FBTixNQUFNLENBQXVCO1FBQzdCLG1CQUFjLEdBQWQsY0FBYyxDQUFjO1FBQzVCLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBcEJyQyx1QkFBdUI7UUFDZiwwQkFBcUIsR0FBa0IsSUFBSSxDQUFDO1FBQzVDLHdCQUFtQixHQUFHLENBQUMsQ0FBQztJQXFCaEMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsWUFBWSxDQUFDLFNBV1o7UUFDQSxJQUFJLENBQUMsc0JBQXNCLEdBQUcsU0FBUyxDQUFDLHNCQUFzQixDQUFDO1FBQy9ELElBQUksQ0FBQyxhQUFhLEdBQUcsU0FBUyxDQUFDLGFBQWEsQ0FBQztRQUM3QyxJQUFJLENBQUMsYUFBYSxHQUFHLFNBQVMsQ0FBQyxhQUFhLENBQUM7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QUNsQyxNQUFBLElBQUksQ0FBQyxzQkFBc0IscURBQUcsSUFBSSxDQUFDLENBQUM7SUFDckMsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwLCBDb21wb25lbnQsIE1lbnUsIE5vdGljZSwgVEZpbGUgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5pbXBvcnQgeyBUYXNrIH0gZnJvbSBcIkAvdHlwZXMvdGFza1wiO1xyXG5pbXBvcnQgeyBRdWlja0NhcHR1cmVNb2RhbCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvcXVpY2stY2FwdHVyZS9tb2RhbHMvUXVpY2tDYXB0dXJlTW9kYWxcIjtcclxuaW1wb3J0IHsgQ29uZmlybU1vZGFsIH0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9tb2RhbHMvQ29uZmlybU1vZGFsXCI7XHJcbmltcG9ydCB7IGNyZWF0ZVRhc2tDaGVja2JveCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay92aWV3L2RldGFpbHNcIjtcclxuaW1wb3J0IHsgZW1pdFRhc2tTZWxlY3RlZCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvZmx1ZW50L2V2ZW50cy91aS1ldmVudFwiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgeyBWaWV3TW9kZSB9IGZyb20gXCIuLi9jb21wb25lbnRzL0ZsdWVudFRvcE5hdmlnYXRpb25cIjtcclxuXHJcbi8qKlxyXG4gKiBGbHVlbnRBY3Rpb25IYW5kbGVycyAtIEhhbmRsZXMgYWxsIHVzZXIgYWN0aW9ucyBhbmQgdGFzayBvcGVyYXRpb25zXHJcbiAqXHJcbiAqIFJlc3BvbnNpYmlsaXRpZXM6XHJcbiAqIC0gVGFzayBzZWxlY3Rpb24gYW5kIGRlc2VsZWN0aW9uXHJcbiAqIC0gVGFzayBjb21wbGV0aW9uIHRvZ2dsaW5nXHJcbiAqIC0gVGFzayB1cGRhdGVzIChzdGF0dXMsIG1ldGFkYXRhLCBldGMuKVxyXG4gKiAtIFRhc2sgY29udGV4dCBtZW51c1xyXG4gKiAtIFRhc2sgZGVsZXRpb24gKHdpdGggY2hpbGRyZW4gc3VwcG9ydClcclxuICogLSBOYXZpZ2F0aW9uIGFjdGlvbnMgKHZpZXcgc3dpdGNoLCBwcm9qZWN0IHNlbGVjdCwgc2VhcmNoKVxyXG4gKiAtIFNldHRpbmdzIGFuZCBVSSBhY3Rpb25zXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgRmx1ZW50QWN0aW9uSGFuZGxlcnMgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdC8vIFRhc2sgc2VsZWN0aW9uIHN0YXRlXHJcblx0cHJpdmF0ZSBjdXJyZW50U2VsZWN0ZWRUYXNrSWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgbGFzdFRvZ2dsZVRpbWVzdGFtcCA9IDA7XHJcblxyXG5cdC8vIENhbGxiYWNrc1xyXG5cdHByaXZhdGUgb25UYXNrU2VsZWN0aW9uQ2hhbmdlZD86ICh0YXNrOiBUYXNrIHwgbnVsbCkgPT4gdm9pZDtcclxuXHRwcml2YXRlIG9uVGFza1VwZGF0ZWQ/OiAodGFza0lkOiBzdHJpbmcsIHVwZGF0ZWRUYXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdHByaXZhdGUgb25UYXNrRGVsZXRlZD86ICh0YXNrSWQ6IHN0cmluZywgZGVsZXRlQ2hpbGRyZW46IGJvb2xlYW4pID0+IHZvaWQ7XHJcblx0cHJpdmF0ZSBvbk5hdmlnYXRlVG9WaWV3PzogKHZpZXdJZDogc3RyaW5nKSA9PiB2b2lkO1xyXG5cdHByaXZhdGUgb25TZWFyY2hRdWVyeUNoYW5nZWQ/OiAocXVlcnk6IHN0cmluZykgPT4gdm9pZDtcclxuXHRwcml2YXRlIG9uUHJvamVjdFNlbGVjdGVkPzogKHByb2plY3RJZDogc3RyaW5nKSA9PiB2b2lkO1xyXG5cdHByaXZhdGUgb25WaWV3TW9kZUNoYW5nZWQ/OiAobW9kZTogVmlld01vZGUpID0+IHZvaWQ7XHJcblx0cHJpdmF0ZSBzaG93RGV0YWlsc1BhbmVsPzogKHRhc2s6IFRhc2spID0+IHZvaWQ7XHJcblx0cHJpdmF0ZSB0b2dnbGVEZXRhaWxzVmlzaWJpbGl0eT86ICh2aXNpYmxlOiBib29sZWFuKSA9PiB2b2lkO1xyXG5cdHByaXZhdGUgZ2V0SXNEZXRhaWxzVmlzaWJsZT86ICgpID0+IGJvb2xlYW47XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cHJpdmF0ZSBhcHA6IEFwcCxcclxuXHRcdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRwcml2YXRlIGdldFdvcmtzcGFjZUlkOiAoKSA9PiBzdHJpbmcsXHJcblx0XHRwcml2YXRlIHVzZVNpZGVMZWF2ZXM6ICgpID0+IGJvb2xlYW5cclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTZXQgY2FsbGJhY2tzIGZvciBhY3Rpb24gcmVzdWx0c1xyXG5cdCAqL1xyXG5cdHNldENhbGxiYWNrcyhjYWxsYmFja3M6IHtcclxuXHRcdG9uVGFza1NlbGVjdGlvbkNoYW5nZWQ/OiAodGFzazogVGFzayB8IG51bGwpID0+IHZvaWQ7XHJcblx0XHRvblRhc2tVcGRhdGVkPzogKHRhc2tJZDogc3RyaW5nLCB1cGRhdGVkVGFzazogVGFzaykgPT4gdm9pZDtcclxuXHRcdG9uVGFza0RlbGV0ZWQ/OiAodGFza0lkOiBzdHJpbmcsIGRlbGV0ZUNoaWxkcmVuOiBib29sZWFuKSA9PiB2b2lkO1xyXG5cdFx0b25OYXZpZ2F0ZVRvVmlldz86ICh2aWV3SWQ6IHN0cmluZykgPT4gdm9pZDtcclxuXHRcdG9uU2VhcmNoUXVlcnlDaGFuZ2VkPzogKHF1ZXJ5OiBzdHJpbmcpID0+IHZvaWQ7XHJcblx0XHRvblByb2plY3RTZWxlY3RlZD86IChwcm9qZWN0SWQ6IHN0cmluZykgPT4gdm9pZDtcclxuXHRcdG9uVmlld01vZGVDaGFuZ2VkPzogKG1vZGU6IFZpZXdNb2RlKSA9PiB2b2lkO1xyXG5cdFx0c2hvd0RldGFpbHNQYW5lbD86ICh0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdFx0dG9nZ2xlRGV0YWlsc1Zpc2liaWxpdHk/OiAodmlzaWJsZTogYm9vbGVhbikgPT4gdm9pZDtcclxuXHRcdGdldElzRGV0YWlsc1Zpc2libGU/OiAoKSA9PiBib29sZWFuO1xyXG5cdH0pOiB2b2lkIHtcclxuXHRcdHRoaXMub25UYXNrU2VsZWN0aW9uQ2hhbmdlZCA9IGNhbGxiYWNrcy5vblRhc2tTZWxlY3Rpb25DaGFuZ2VkO1xyXG5cdFx0dGhpcy5vblRhc2tVcGRhdGVkID0gY2FsbGJhY2tzLm9uVGFza1VwZGF0ZWQ7XHJcblx0XHR0aGlzLm9uVGFza0RlbGV0ZWQgPSBjYWxsYmFja3Mub25UYXNrRGVsZXRlZDtcclxuXHRcdHRoaXMub25OYXZpZ2F0ZVRvVmlldyA9IGNhbGxiYWNrcy5vbk5hdmlnYXRlVG9WaWV3O1xyXG5cdFx0dGhpcy5vblNlYXJjaFF1ZXJ5Q2hhbmdlZCA9IGNhbGxiYWNrcy5vblNlYXJjaFF1ZXJ5Q2hhbmdlZDtcclxuXHRcdHRoaXMub25Qcm9qZWN0U2VsZWN0ZWQgPSBjYWxsYmFja3Mub25Qcm9qZWN0U2VsZWN0ZWQ7XHJcblx0XHR0aGlzLm9uVmlld01vZGVDaGFuZ2VkID0gY2FsbGJhY2tzLm9uVmlld01vZGVDaGFuZ2VkO1xyXG5cdFx0dGhpcy5zaG93RGV0YWlsc1BhbmVsID0gY2FsbGJhY2tzLnNob3dEZXRhaWxzUGFuZWw7XHJcblx0XHR0aGlzLnRvZ2dsZURldGFpbHNWaXNpYmlsaXR5ID0gY2FsbGJhY2tzLnRvZ2dsZURldGFpbHNWaXNpYmlsaXR5O1xyXG5cdFx0dGhpcy5nZXRJc0RldGFpbHNWaXNpYmxlID0gY2FsbGJhY2tzLmdldElzRGV0YWlsc1Zpc2libGU7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBIYW5kbGUgdGFzayBzZWxlY3Rpb25cclxuXHQgKi9cclxuXHRoYW5kbGVUYXNrU2VsZWN0aW9uKHRhc2s6IFRhc2sgfCBudWxsKTogdm9pZCB7XHJcblx0XHQvLyBFbWl0IGNyb3NzLXZpZXcgc2VsZWN0aW9uIHdoZW4gdXNpbmcgc2lkZSBsZWF2ZXNcclxuXHRcdGlmICh0aGlzLnVzZVNpZGVMZWF2ZXMoKSkge1xyXG5cdFx0XHRlbWl0VGFza1NlbGVjdGVkKHRoaXMuYXBwLCB7XHJcblx0XHRcdFx0dGFza0lkOiB0YXNrPy5pZCA/PyBudWxsLFxyXG5cdFx0XHRcdG9yaWdpbjogXCJtYWluXCIsXHJcblx0XHRcdFx0d29ya3NwYWNlSWQ6IHRoaXMuZ2V0V29ya3NwYWNlSWQoKSxcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHRhc2spIHtcclxuXHRcdFx0Y29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcclxuXHRcdFx0Y29uc3QgdGltZVNpbmNlTGFzdFRvZ2dsZSA9IG5vdyAtIHRoaXMubGFzdFRvZ2dsZVRpbWVzdGFtcDtcclxuXHJcblx0XHRcdGlmICh0aGlzLmN1cnJlbnRTZWxlY3RlZFRhc2tJZCAhPT0gdGFzay5pZCkge1xyXG5cdFx0XHRcdHRoaXMuY3VycmVudFNlbGVjdGVkVGFza0lkID0gdGFzay5pZDtcclxuXHRcdFx0XHR0aGlzLnNob3dEZXRhaWxzUGFuZWw/Lih0YXNrKTtcclxuXHRcdFx0XHRjb25zdCBpc0RldGFpbHNWaXNpYmxlID0gdGhpcy5nZXRJc0RldGFpbHNWaXNpYmxlPy4oKSA/PyBmYWxzZTtcclxuXHRcdFx0XHRpZiAoIWlzRGV0YWlsc1Zpc2libGUpIHtcclxuXHRcdFx0XHRcdHRoaXMudG9nZ2xlRGV0YWlsc1Zpc2liaWxpdHk/Lih0cnVlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0dGhpcy5sYXN0VG9nZ2xlVGltZXN0YW1wID0gbm93O1xyXG5cdFx0XHRcdHRoaXMub25UYXNrU2VsZWN0aW9uQ2hhbmdlZD8uKHRhc2spO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKHRpbWVTaW5jZUxhc3RUb2dnbGUgPiAxNTApIHtcclxuXHRcdFx0XHRjb25zdCBpc0RldGFpbHNWaXNpYmxlID0gdGhpcy5nZXRJc0RldGFpbHNWaXNpYmxlPy4oKSA/PyBmYWxzZTtcclxuXHRcdFx0XHR0aGlzLnRvZ2dsZURldGFpbHNWaXNpYmlsaXR5Py4oIWlzRGV0YWlsc1Zpc2libGUpO1xyXG5cdFx0XHRcdHRoaXMubGFzdFRvZ2dsZVRpbWVzdGFtcCA9IG5vdztcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy50b2dnbGVEZXRhaWxzVmlzaWJpbGl0eT8uKGZhbHNlKTtcclxuXHRcdFx0dGhpcy5jdXJyZW50U2VsZWN0ZWRUYXNrSWQgPSBudWxsO1xyXG5cdFx0XHR0aGlzLm9uVGFza1NlbGVjdGlvbkNoYW5nZWQ/LihudWxsKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFRvZ2dsZSB0YXNrIGNvbXBsZXRpb24gc3RhdHVzXHJcblx0ICovXHJcblx0YXN5bmMgdG9nZ2xlVGFza0NvbXBsZXRpb24odGFzazogVGFzayk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0aWYgKCF0aGlzLnBsdWdpbi53cml0ZUFQSSkge1xyXG5cdFx0XHRuZXcgTm90aWNlKFwiV3JpdGVBUEkgbm90IGF2YWlsYWJsZVwiKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHVwZGF0ZWRUYXNrID0gey4uLnRhc2ssIGNvbXBsZXRlZDogIXRhc2suY29tcGxldGVkfTtcclxuXHJcblx0XHRpZiAodXBkYXRlZFRhc2suY29tcGxldGVkKSB7XHJcblx0XHRcdHVwZGF0ZWRUYXNrLm1ldGFkYXRhLmNvbXBsZXRlZERhdGUgPSBEYXRlLm5vdygpO1xyXG5cdFx0XHRjb25zdCBjb21wbGV0ZWRNYXJrID0gKFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnRhc2tTdGF0dXNlcy5jb21wbGV0ZWQgfHwgXCJ4XCJcclxuXHRcdFx0KS5zcGxpdChcInxcIilbMF07XHJcblx0XHRcdGlmICh1cGRhdGVkVGFzay5zdGF0dXMgIT09IGNvbXBsZXRlZE1hcmspIHtcclxuXHRcdFx0XHR1cGRhdGVkVGFzay5zdGF0dXMgPSBjb21wbGV0ZWRNYXJrO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YS5jb21wbGV0ZWREYXRlID0gdW5kZWZpbmVkO1xyXG5cdFx0XHRjb25zdCBub3RTdGFydGVkTWFyayA9XHJcblx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c2VzLm5vdFN0YXJ0ZWQgfHwgXCIgXCI7XHJcblx0XHRcdGlmICh0aGlzLmlzQ29tcGxldGVkTWFyayh1cGRhdGVkVGFzay5zdGF0dXMpKSB7XHJcblx0XHRcdFx0dXBkYXRlZFRhc2suc3RhdHVzID0gbm90U3RhcnRlZE1hcms7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRhd2FpdCB0aGlzLmhhbmRsZVRhc2tVcGRhdGUodGFzaywgdXBkYXRlZFRhc2spO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSGFuZGxlIHRhc2sgdXBkYXRlXHJcblx0ICovXHJcblx0YXN5bmMgaGFuZGxlVGFza1VwZGF0ZShcclxuXHRcdG9yaWdpbmFsVGFzazogVGFzayxcclxuXHRcdHVwZGF0ZWRUYXNrOiBUYXNrXHJcblx0KTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRpZiAoIXRoaXMucGx1Z2luLndyaXRlQVBJKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJXcml0ZUFQSSBub3QgYXZhaWxhYmxlXCIpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgdXBkYXRlcyA9IHRoaXMuZXh0cmFjdENoYW5nZWRGaWVsZHMoXHJcblx0XHRcdFx0b3JpZ2luYWxUYXNrLFxyXG5cdFx0XHRcdHVwZGF0ZWRUYXNrXHJcblx0XHRcdCk7XHJcblx0XHRcdGNvbnN0IHdyaXRlUmVzdWx0ID0gYXdhaXQgdGhpcy5wbHVnaW4ud3JpdGVBUEkudXBkYXRlVGFzayh7XHJcblx0XHRcdFx0dGFza0lkOiBvcmlnaW5hbFRhc2suaWQsXHJcblx0XHRcdFx0dXBkYXRlczogdXBkYXRlcyxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRpZiAoIXdyaXRlUmVzdWx0LnN1Y2Nlc3MpIHtcclxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3Iod3JpdGVSZXN1bHQuZXJyb3IgfHwgXCJGYWlsZWQgdG8gdXBkYXRlIHRhc2tcIik7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IHVwZGF0ZWQgPSB3cml0ZVJlc3VsdC50YXNrIHx8IHVwZGF0ZWRUYXNrO1xyXG5cclxuXHRcdFx0Ly8gTm90aWZ5IGFib3V0IHRhc2sgdXBkYXRlXHJcblx0XHRcdHRoaXMub25UYXNrVXBkYXRlZD8uKG9yaWdpbmFsVGFzay5pZCwgdXBkYXRlZCk7XHJcblxyXG5cdFx0XHRuZXcgTm90aWNlKHQoXCJUYXNrIHVwZGF0ZWRcIikpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkZhaWxlZCB0byB1cGRhdGUgdGFzazpcIiwgZXJyb3IpO1xyXG5cdFx0XHRuZXcgTm90aWNlKFwiRmFpbGVkIHRvIHVwZGF0ZSB0YXNrXCIpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSGFuZGxlIGthbmJhbiB0YXNrIHN0YXR1cyB1cGRhdGVcclxuXHQgKi9cclxuXHRhc3luYyBoYW5kbGVLYW5iYW5UYXNrU3RhdHVzVXBkYXRlKFxyXG5cdFx0dGFzazogVGFzayxcclxuXHRcdG5ld1N0YXR1c01hcms6IHN0cmluZ1xyXG5cdCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Y29uc3QgaXNDb21wbGV0ZWQgPSB0aGlzLmlzQ29tcGxldGVkTWFyayhuZXdTdGF0dXNNYXJrKTtcclxuXHRcdGNvbnN0IGNvbXBsZXRlZERhdGUgPSBpc0NvbXBsZXRlZCA/IERhdGUubm93KCkgOiB1bmRlZmluZWQ7XHJcblxyXG5cdFx0aWYgKHRhc2suc3RhdHVzICE9PSBuZXdTdGF0dXNNYXJrIHx8IHRhc2suY29tcGxldGVkICE9PSBpc0NvbXBsZXRlZCkge1xyXG5cdFx0XHRhd2FpdCB0aGlzLmhhbmRsZVRhc2tVcGRhdGUodGFzaywge1xyXG5cdFx0XHRcdC4uLnRhc2ssXHJcblx0XHRcdFx0c3RhdHVzOiBuZXdTdGF0dXNNYXJrLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogaXNDb21wbGV0ZWQsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdC4uLnRhc2subWV0YWRhdGEsXHJcblx0XHRcdFx0XHRjb21wbGV0ZWREYXRlOiBjb21wbGV0ZWREYXRlLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2hvdyB0YXNrIGNvbnRleHQgbWVudVxyXG5cdCAqL1xyXG5cdGhhbmRsZVRhc2tDb250ZXh0TWVudShldmVudDogTW91c2VFdmVudCwgdGFzazogVGFzayk6IHZvaWQge1xyXG5cdFx0Y29uc3QgbWVudSA9IG5ldyBNZW51KCk7XHJcblxyXG5cdFx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdGl0ZW0uc2V0VGl0bGUodChcIkNvbXBsZXRlXCIpKTtcclxuXHRcdFx0aXRlbS5zZXRJY29uKFwiY2hlY2stc3F1YXJlXCIpO1xyXG5cdFx0XHRpdGVtLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMudG9nZ2xlVGFza0NvbXBsZXRpb24odGFzayk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSlcclxuXHRcdFx0LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRpdGVtLnNldEljb24oXCJzcXVhcmUtcGVuXCIpO1xyXG5cdFx0XHRcdGl0ZW0uc2V0VGl0bGUodChcIlN3aXRjaCBzdGF0dXNcIikpO1xyXG5cdFx0XHRcdGNvbnN0IHN1Ym1lbnUgPSBpdGVtLnNldFN1Ym1lbnUoKTtcclxuXHJcblx0XHRcdFx0Ly8gR2V0IHVuaXF1ZSBzdGF0dXNlcyBmcm9tIHRhc2tTdGF0dXNNYXJrc1xyXG5cdFx0XHRcdGNvbnN0IHN0YXR1c01hcmtzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c01hcmtzO1xyXG5cdFx0XHRcdGNvbnN0IHVuaXF1ZVN0YXR1c2VzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcclxuXHJcblx0XHRcdFx0Ly8gQnVpbGQgYSBtYXAgb2YgdW5pcXVlIG1hcmsgLT4gc3RhdHVzIG5hbWUgdG8gYXZvaWQgZHVwbGljYXRlc1xyXG5cdFx0XHRcdGZvciAoY29uc3Qgc3RhdHVzIG9mIE9iamVjdC5rZXlzKHN0YXR1c01hcmtzKSkge1xyXG5cdFx0XHRcdFx0Y29uc3QgbWFyayA9XHJcblx0XHRcdFx0XHRcdHN0YXR1c01hcmtzW3N0YXR1cyBhcyBrZXlvZiB0eXBlb2Ygc3RhdHVzTWFya3NdO1xyXG5cdFx0XHRcdFx0aWYgKCFBcnJheS5mcm9tKHVuaXF1ZVN0YXR1c2VzLnZhbHVlcygpKS5pbmNsdWRlcyhtYXJrKSkge1xyXG5cdFx0XHRcdFx0XHR1bmlxdWVTdGF0dXNlcy5zZXQoc3RhdHVzLCBtYXJrKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIENyZWF0ZSBtZW51IGl0ZW1zIGZyb20gdW5pcXVlIHN0YXR1c2VzXHJcblx0XHRcdFx0Zm9yIChjb25zdCBbc3RhdHVzLCBtYXJrXSBvZiB1bmlxdWVTdGF0dXNlcykge1xyXG5cdFx0XHRcdFx0c3VibWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdFx0XHRcdGl0ZW0udGl0bGVFbC5jcmVhdGVFbChcclxuXHRcdFx0XHRcdFx0XHRcInNwYW5cIixcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRjbHM6IFwic3RhdHVzLW9wdGlvbi1jaGVja2JveFwiLFxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0KGVsKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRjcmVhdGVUYXNrQ2hlY2tib3gobWFyaywgdGFzaywgZWwpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0aXRlbS50aXRsZUVsLmNyZWF0ZUVsKFwic3BhblwiLCB7XHJcblx0XHRcdFx0XHRcdFx0Y2xzOiBcInN0YXR1cy1vcHRpb25cIixcclxuXHRcdFx0XHRcdFx0XHR0ZXh0OiBzdGF0dXMsXHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRpdGVtLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHdpbGxDb21wbGV0ZSA9IHRoaXMuaXNDb21wbGV0ZWRNYXJrKG1hcmspO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHVwZGF0ZWRUYXNrID0ge1xyXG5cdFx0XHRcdFx0XHRcdFx0Li4udGFzayxcclxuXHRcdFx0XHRcdFx0XHRcdHN0YXR1czogbWFyayxcclxuXHRcdFx0XHRcdFx0XHRcdGNvbXBsZXRlZDogd2lsbENvbXBsZXRlLFxyXG5cdFx0XHRcdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdFx0XHRcdGlmICghdGFzay5jb21wbGV0ZWQgJiYgd2lsbENvbXBsZXRlKSB7XHJcblx0XHRcdFx0XHRcdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YS5jb21wbGV0ZWREYXRlID0gRGF0ZS5ub3coKTtcclxuXHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKHRhc2suY29tcGxldGVkICYmICF3aWxsQ29tcGxldGUpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHVwZGF0ZWRUYXNrLm1ldGFkYXRhLmNvbXBsZXRlZERhdGUgPSB1bmRlZmluZWQ7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRhd2FpdCB0aGlzLmhhbmRsZVRhc2tVcGRhdGUodGFzaywgdXBkYXRlZFRhc2spO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSlcclxuXHRcdFx0LmFkZFNlcGFyYXRvcigpXHJcblx0XHRcdC5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdFx0aXRlbS5zZXRUaXRsZSh0KFwiRWRpdFwiKSk7XHJcblx0XHRcdFx0aXRlbS5zZXRJY29uKFwicGVuY2lsXCIpO1xyXG5cdFx0XHRcdGl0ZW0ub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLmhhbmRsZVRhc2tTZWxlY3Rpb24odGFzayk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pXHJcblx0XHRcdC5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdFx0aXRlbS5zZXRUaXRsZSh0KFwiRWRpdCBpbiBGaWxlXCIpKTtcclxuXHRcdFx0XHRpdGVtLnNldEljb24oXCJwZW5jaWxcIik7XHJcblx0XHRcdFx0aXRlbS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuZWRpdFRhc2sodGFzayk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pXHJcblx0XHRcdC5hZGRTZXBhcmF0b3IoKVxyXG5cdFx0XHQuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRcdGl0ZW0uc2V0VGl0bGUodChcIkRlbGV0ZSBUYXNrXCIpKTtcclxuXHRcdFx0XHRpdGVtLnNldEljb24oXCJ0cmFzaFwiKTtcclxuXHRcdFx0XHRpdGVtLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5jb25maXJtQW5kRGVsZXRlVGFzayhldmVudCwgdGFzayk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdG1lbnUuc2hvd0F0TW91c2VFdmVudChldmVudCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFZGl0IHRhc2sgaW4gZmlsZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgZWRpdFRhc2sodGFzazogVGFzayk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Y29uc3QgZmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEZpbGVCeVBhdGgodGFzay5maWxlUGF0aCk7XHJcblx0XHRpZiAoIShmaWxlIGluc3RhbmNlb2YgVEZpbGUpKSByZXR1cm47XHJcblx0XHRjb25zdCBsZWFmID0gdGhpcy5hcHAud29ya3NwYWNlLmdldExlYWYoZmFsc2UpO1xyXG5cdFx0YXdhaXQgbGVhZi5vcGVuRmlsZShmaWxlLCB7XHJcblx0XHRcdGVTdGF0ZToge2xpbmU6IHRhc2subGluZX0sXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENvbmZpcm0gYW5kIGRlbGV0ZSB0YXNrICh3aXRoIGNoaWxkcmVuIG9wdGlvbilcclxuXHQgKi9cclxuXHRwcml2YXRlIGNvbmZpcm1BbmREZWxldGVUYXNrKGV2ZW50OiBNb3VzZUV2ZW50LCB0YXNrOiBUYXNrKTogdm9pZCB7XHJcblx0XHRjb25zdCBoYXNDaGlsZHJlbiA9XHJcblx0XHRcdHRhc2subWV0YWRhdGEgJiZcclxuXHRcdFx0dGFzay5tZXRhZGF0YS5jaGlsZHJlbiAmJlxyXG5cdFx0XHR0YXNrLm1ldGFkYXRhLmNoaWxkcmVuLmxlbmd0aCA+IDA7XHJcblxyXG5cdFx0aWYgKGhhc0NoaWxkcmVuKSB7XHJcblx0XHRcdGNvbnN0IG1lbnUgPSBuZXcgTWVudSgpO1xyXG5cdFx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJEZWxldGUgdGFzayBvbmx5XCIpKTtcclxuXHRcdFx0XHRpdGVtLnNldEljb24oXCJ0cmFzaFwiKTtcclxuXHRcdFx0XHRpdGVtLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5kZWxldGVUYXNrKHRhc2ssIGZhbHNlKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRcdGl0ZW0uc2V0VGl0bGUodChcIkRlbGV0ZSB0YXNrIGFuZCBhbGwgc3VidGFza3NcIikpO1xyXG5cdFx0XHRcdGl0ZW0uc2V0SWNvbihcInRyYXNoLTJcIik7XHJcblx0XHRcdFx0aXRlbS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuZGVsZXRlVGFzayh0YXNrLCB0cnVlKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdG1lbnUuYWRkU2VwYXJhdG9yKCk7XHJcblx0XHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRcdGl0ZW0uc2V0VGl0bGUodChcIkNhbmNlbFwiKSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0XHRtZW51LnNob3dBdE1vdXNlRXZlbnQoZXZlbnQpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Y29uc3QgbW9kYWwgPSBuZXcgQ29uZmlybU1vZGFsKHRoaXMucGx1Z2luLCB7XHJcblx0XHRcdFx0dGl0bGU6IHQoXCJEZWxldGUgVGFza1wiKSxcclxuXHRcdFx0XHRtZXNzYWdlOiB0KFwiQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGRlbGV0ZSB0aGlzIHRhc2s/XCIpLFxyXG5cdFx0XHRcdGNvbmZpcm1UZXh0OiB0KFwiRGVsZXRlXCIpLFxyXG5cdFx0XHRcdGNhbmNlbFRleHQ6IHQoXCJDYW5jZWxcIiksXHJcblx0XHRcdFx0b25Db25maXJtOiAoY29uZmlybWVkKSA9PiB7XHJcblx0XHRcdFx0XHRpZiAoY29uZmlybWVkKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMuZGVsZXRlVGFzayh0YXNrLCBmYWxzZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdG1vZGFsLm9wZW4oKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIERlbGV0ZSB0YXNrIChhbmQgb3B0aW9uYWxseSBjaGlsZHJlbilcclxuXHQgKi9cclxuXHRwcml2YXRlIGFzeW5jIGRlbGV0ZVRhc2soXHJcblx0XHR0YXNrOiBUYXNrLFxyXG5cdFx0ZGVsZXRlQ2hpbGRyZW46IGJvb2xlYW5cclxuXHQpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGlmICghdGhpcy5wbHVnaW4ud3JpdGVBUEkpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIldyaXRlQVBJIG5vdCBhdmFpbGFibGUgZm9yIGRlbGV0ZVRhc2tcIik7XHJcblx0XHRcdG5ldyBOb3RpY2UodChcIkZhaWxlZCB0byBkZWxldGUgdGFza1wiKSk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnBsdWdpbi53cml0ZUFQSS5kZWxldGVUYXNrKHtcclxuXHRcdFx0XHR0YXNrSWQ6IHRhc2suaWQsXHJcblx0XHRcdFx0ZGVsZXRlQ2hpbGRyZW4sXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0aWYgKHJlc3VsdC5zdWNjZXNzKSB7XHJcblx0XHRcdFx0bmV3IE5vdGljZSh0KFwiVGFzayBkZWxldGVkXCIpKTtcclxuXHJcblx0XHRcdFx0Ly8gTm90aWZ5IGFib3V0IHRhc2sgZGVsZXRpb25cclxuXHRcdFx0XHR0aGlzLm9uVGFza0RlbGV0ZWQ/Lih0YXNrLmlkLCBkZWxldGVDaGlsZHJlbik7XHJcblxyXG5cdFx0XHRcdC8vIENsZWFyIHNlbGVjdGlvbiBpZiBkZWxldGVkIHRhc2sgd2FzIHNlbGVjdGVkXHJcblx0XHRcdFx0aWYgKHRoaXMuY3VycmVudFNlbGVjdGVkVGFza0lkID09PSB0YXNrLmlkKSB7XHJcblx0XHRcdFx0XHR0aGlzLmhhbmRsZVRhc2tTZWxlY3Rpb24obnVsbCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdG5ldyBOb3RpY2UoXHJcblx0XHRcdFx0XHR0KFwiRmFpbGVkIHRvIGRlbGV0ZSB0YXNrXCIpICtcclxuXHRcdFx0XHRcdFwiOiBcIiArXHJcblx0XHRcdFx0XHQocmVzdWx0LmVycm9yIHx8IFwiVW5rbm93biBlcnJvclwiKVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFcnJvciBkZWxldGluZyB0YXNrOlwiLCBlcnJvcik7XHJcblx0XHRcdG5ldyBOb3RpY2UoXHJcblx0XHRcdFx0dChcIkZhaWxlZCB0byBkZWxldGUgdGFza1wiKSArIFwiOiBcIiArIChlcnJvciBhcyBhbnkpLm1lc3NhZ2VcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSBuYXZpZ2F0aW9uIHRvIGEgdmlldyBvciBjcmVhdGUgbmV3IHRhc2tcclxuXHQgKi9cclxuXHRoYW5kbGVOYXZpZ2F0ZSh2aWV3SWQ6IHN0cmluZyk6IHZvaWQge1xyXG5cdFx0aWYgKHZpZXdJZCA9PT0gXCJuZXctdGFza1wiKSB7XHJcblx0XHRcdG5ldyBRdWlja0NhcHR1cmVNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4pLm9wZW4oKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKGBbRmx1ZW50QWN0aW9uXSBoYW5kbGVOYXZpZ2F0ZSB0byAke3ZpZXdJZH1gKTtcclxuXHRcdFx0dGhpcy5vbk5hdmlnYXRlVG9WaWV3Py4odmlld0lkKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSBzZWFyY2ggcXVlcnkgY2hhbmdlXHJcblx0ICovXHJcblx0aGFuZGxlU2VhcmNoKHF1ZXJ5OiBzdHJpbmcpOiB2b2lkIHtcclxuXHRcdHRoaXMub25TZWFyY2hRdWVyeUNoYW5nZWQ/LihxdWVyeSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBIYW5kbGUgcHJvamVjdCBzZWxlY3Rpb25cclxuXHQgKi9cclxuXHRoYW5kbGVQcm9qZWN0U2VsZWN0KHByb2plY3RJZDogc3RyaW5nKTogdm9pZCB7XHJcblx0XHRjb25zb2xlLmxvZyhgW0ZsdWVudEFjdGlvbl0gUHJvamVjdCBzZWxlY3RlZDogJHtwcm9qZWN0SWR9YCk7XHJcblx0XHR0aGlzLm9uUHJvamVjdFNlbGVjdGVkPy4ocHJvamVjdElkKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSB2aWV3IG1vZGUgY2hhbmdlIChsaXN0L3RyZWUva2FuYmFuL2NhbGVuZGFyKVxyXG5cdCAqL1xyXG5cdGhhbmRsZVZpZXdNb2RlQ2hhbmdlKG1vZGU6IFZpZXdNb2RlKTogdm9pZCB7XHJcblx0XHR0aGlzLm9uVmlld01vZGVDaGFuZ2VkPy4obW9kZSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBIYW5kbGUgc2V0dGluZ3MgYnV0dG9uIGNsaWNrXHJcblx0ICovXHJcblx0aGFuZGxlU2V0dGluZ3NDbGljaygpOiB2b2lkIHtcclxuXHRcdC8vIE9wZW4gT2JzaWRpYW4gc2V0dGluZ3MgYW5kIG5hdmlnYXRlIHRvIHRoZSBwbHVnaW4gdGFiXHJcblx0XHR0aGlzLmFwcC5zZXR0aW5nLm9wZW4oKTtcclxuXHRcdHRoaXMuYXBwLnNldHRpbmcub3BlblRhYkJ5SWQodGhpcy5wbHVnaW4ubWFuaWZlc3QuaWQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgYSBzdGF0dXMgbWFyayBpbmRpY2F0ZXMgY29tcGxldGlvblxyXG5cdCAqL1xyXG5cdHByaXZhdGUgaXNDb21wbGV0ZWRNYXJrKG1hcms6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0aWYgKCFtYXJrKSByZXR1cm4gZmFsc2U7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBsb3dlciA9IG1hcmsudG9Mb3dlckNhc2UoKTtcclxuXHRcdFx0Y29uc3QgY29tcGxldGVkQ2ZnID0gU3RyaW5nKFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnRhc2tTdGF0dXNlcz8uY29tcGxldGVkIHx8IFwieFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdGNvbnN0IGNvbXBsZXRlZFNldCA9IGNvbXBsZXRlZENmZ1xyXG5cdFx0XHRcdC5zcGxpdChcInxcIilcclxuXHRcdFx0XHQubWFwKChzKSA9PiBzLnRyaW0oKS50b0xvd2VyQ2FzZSgpKVxyXG5cdFx0XHRcdC5maWx0ZXIoQm9vbGVhbik7XHJcblx0XHRcdHJldHVybiBjb21wbGV0ZWRTZXQuaW5jbHVkZXMobG93ZXIpO1xyXG5cdFx0fSBjYXRjaCAoXykge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFeHRyYWN0IGNoYW5nZWQgZmllbGRzIGZyb20gdGFzayB1cGRhdGVcclxuXHQgKi9cclxuXHRwcml2YXRlIGV4dHJhY3RDaGFuZ2VkRmllbGRzKFxyXG5cdFx0b3JpZ2luYWxUYXNrOiBUYXNrLFxyXG5cdFx0dXBkYXRlZFRhc2s6IFRhc2tcclxuXHQpOiBQYXJ0aWFsPFRhc2s+IHtcclxuXHRcdGNvbnN0IGNoYW5nZXM6IFBhcnRpYWw8VGFzaz4gPSB7fTtcclxuXHJcblx0XHQvLyBDaGVjayB0b3AtbGV2ZWwgZmllbGRzXHJcblx0XHRpZiAob3JpZ2luYWxUYXNrLmNvbnRlbnQgIT09IHVwZGF0ZWRUYXNrLmNvbnRlbnQpIHtcclxuXHRcdFx0Y2hhbmdlcy5jb250ZW50ID0gdXBkYXRlZFRhc2suY29udGVudDtcclxuXHRcdH1cclxuXHRcdGlmIChvcmlnaW5hbFRhc2suY29tcGxldGVkICE9PSB1cGRhdGVkVGFzay5jb21wbGV0ZWQpIHtcclxuXHRcdFx0Y2hhbmdlcy5jb21wbGV0ZWQgPSB1cGRhdGVkVGFzay5jb21wbGV0ZWQ7XHJcblx0XHR9XHJcblx0XHRpZiAob3JpZ2luYWxUYXNrLnN0YXR1cyAhPT0gdXBkYXRlZFRhc2suc3RhdHVzKSB7XHJcblx0XHRcdGNoYW5nZXMuc3RhdHVzID0gdXBkYXRlZFRhc2suc3RhdHVzO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENoZWNrIG1ldGFkYXRhIGZpZWxkc1xyXG5cdFx0Y29uc3QgbWV0YWRhdGFDaGFuZ2VzOiBQYXJ0aWFsPHR5cGVvZiBvcmlnaW5hbFRhc2subWV0YWRhdGE+ID0ge307XHJcblx0XHRsZXQgaGFzTWV0YWRhdGFDaGFuZ2VzID0gZmFsc2U7XHJcblxyXG5cdFx0Y29uc3QgbWV0YWRhdGFGaWVsZHMgPSBbXHJcblx0XHRcdFwicHJpb3JpdHlcIixcclxuXHRcdFx0XCJwcm9qZWN0XCIsXHJcblx0XHRcdFwidGFnc1wiLFxyXG5cdFx0XHRcImNvbnRleHRcIixcclxuXHRcdFx0XCJkdWVEYXRlXCIsXHJcblx0XHRcdFwic3RhcnREYXRlXCIsXHJcblx0XHRcdFwic2NoZWR1bGVkRGF0ZVwiLFxyXG5cdFx0XHRcImNvbXBsZXRlZERhdGVcIixcclxuXHRcdFx0XCJyZWN1cnJlbmNlXCIsXHJcblx0XHRdO1xyXG5cclxuXHRcdGZvciAoY29uc3QgZmllbGQgb2YgbWV0YWRhdGFGaWVsZHMpIHtcclxuXHRcdFx0Y29uc3Qgb3JpZ2luYWxWYWx1ZSA9IChvcmlnaW5hbFRhc2subWV0YWRhdGEgYXMgYW55KT8uW2ZpZWxkXTtcclxuXHRcdFx0Y29uc3QgdXBkYXRlZFZhbHVlID0gKHVwZGF0ZWRUYXNrLm1ldGFkYXRhIGFzIGFueSk/LltmaWVsZF07XHJcblxyXG5cdFx0XHRpZiAoZmllbGQgPT09IFwidGFnc1wiKSB7XHJcblx0XHRcdFx0Y29uc3Qgb3JpZ1RhZ3MgPSBvcmlnaW5hbFZhbHVlIHx8IFtdO1xyXG5cdFx0XHRcdGNvbnN0IHVwZFRhZ3MgPSB1cGRhdGVkVmFsdWUgfHwgW107XHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0b3JpZ1RhZ3MubGVuZ3RoICE9PSB1cGRUYWdzLmxlbmd0aCB8fFxyXG5cdFx0XHRcdFx0IW9yaWdUYWdzLmV2ZXJ5KCh0OiBzdHJpbmcsIGk6IG51bWJlcikgPT4gdCA9PT0gdXBkVGFnc1tpXSlcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdG1ldGFkYXRhQ2hhbmdlcy50YWdzID0gdXBkVGFncztcclxuXHRcdFx0XHRcdGhhc01ldGFkYXRhQ2hhbmdlcyA9IHRydWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2UgaWYgKG9yaWdpbmFsVmFsdWUgIT09IHVwZGF0ZWRWYWx1ZSkge1xyXG5cdFx0XHRcdChtZXRhZGF0YUNoYW5nZXMgYXMgYW55KVtmaWVsZF0gPSB1cGRhdGVkVmFsdWU7XHJcblx0XHRcdFx0aGFzTWV0YWRhdGFDaGFuZ2VzID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChoYXNNZXRhZGF0YUNoYW5nZXMpIHtcclxuXHRcdFx0Y2hhbmdlcy5tZXRhZGF0YSA9IG1ldGFkYXRhQ2hhbmdlcyBhcyBhbnk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGNoYW5nZXM7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgY3VycmVudCBzZWxlY3RlZCB0YXNrIElEXHJcblx0ICovXHJcblx0Z2V0Q3VycmVudFNlbGVjdGVkVGFza0lkKCk6IHN0cmluZyB8IG51bGwge1xyXG5cdFx0cmV0dXJuIHRoaXMuY3VycmVudFNlbGVjdGVkVGFza0lkO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2xlYXIgdGFzayBzZWxlY3Rpb25cclxuXHQgKi9cclxuXHRjbGVhclNlbGVjdGlvbigpOiB2b2lkIHtcclxuXHRcdHRoaXMuY3VycmVudFNlbGVjdGVkVGFza0lkID0gbnVsbDtcclxuXHRcdHRoaXMub25UYXNrU2VsZWN0aW9uQ2hhbmdlZD8uKG51bGwpO1xyXG5cdH1cclxufVxyXG4iXX0=