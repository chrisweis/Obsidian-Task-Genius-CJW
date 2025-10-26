import { FuzzySuggestModal, AbstractInputSuggest, } from "obsidian";
/**
 * Suggester for task IDs
 *
 * Note: This class includes null-safety checks for inputEl to prevent
 * "Cannot set properties of undefined" errors that can occur when
 * TextComponent.inputEl is not yet initialized during component creation.
 */
export class TaskIdSuggest extends AbstractInputSuggest {
    constructor(app, inputEl, plugin, onChoose) {
        super(app, inputEl);
        this.plugin = plugin;
        this.onChoose = onChoose;
        this.inputEl = inputEl;
    }
    getSuggestions(query) {
        if (!this.plugin.dataflowOrchestrator) {
            return [];
        }
        try {
            // Get all tasks that have IDs from dataflow using sync cache
            const queryAPI = this.plugin.dataflowOrchestrator.getQueryAPI();
            const allTasks = queryAPI.getAllTasksSync();
            const taskIds = allTasks
                .filter((task) => { var _a; return (_a = task.metadata) === null || _a === void 0 ? void 0 : _a.id; })
                .map((task) => task.metadata.id)
                .filter((id) => id.toLowerCase().includes(query.toLowerCase()));
            return taskIds.slice(0, 10); // Limit to 10 suggestions
        }
        catch (error) {
            console.warn("Failed to get task IDs from dataflow:", error);
            return [];
        }
    }
    renderSuggestion(taskId, el) {
        el.createDiv({ text: taskId, cls: "task-id-suggestion" });
        // Try to find the task and show its content
        if (this.plugin.dataflowOrchestrator) {
            try {
                const queryAPI = this.plugin.dataflowOrchestrator.getQueryAPI();
                const task = queryAPI.getTaskByIdSync(taskId);
                if (task && task.content) {
                    el.createDiv({
                        text: task.content,
                        cls: "task-content-preview",
                    });
                }
            }
            catch (error) {
                console.warn("Failed to get task from dataflow:", error);
            }
        }
    }
    selectSuggestion(taskId) {
        if (!this.inputEl) {
            console.warn("TaskIdSuggest: inputEl is undefined, cannot set value");
            this.close();
            return;
        }
        // Handle multiple task IDs in the input
        const currentValue = this.inputEl.value;
        const lastCommaIndex = currentValue.lastIndexOf(",");
        if (lastCommaIndex !== -1) {
            // Replace the last partial ID
            const beforeLastComma = currentValue.substring(0, lastCommaIndex + 1);
            this.inputEl.value = beforeLastComma + " " + taskId;
        }
        else {
            // Replace the entire value
            this.inputEl.value = taskId;
        }
        this.inputEl.trigger("input");
        this.onChoose(taskId);
        this.close();
    }
}
/**
 * Suggester for file locations
 *
 * Note: This class includes null-safety checks for inputEl to prevent
 * "Cannot set properties of undefined" errors that can occur when
 * TextComponent.inputEl is not yet initialized during component creation.
 */
export class FileLocationSuggest extends AbstractInputSuggest {
    constructor(app, inputEl, onChoose) {
        super(app, inputEl);
        this.onChoose = onChoose;
        this.inputEl = inputEl;
        this.onChoose = onChoose;
    }
    getSuggestions(query) {
        const files = this.app.vault.getMarkdownFiles();
        return files
            .filter((file) => file.path.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 10); // Limit to 10 suggestions
    }
    renderSuggestion(file, el) {
        el.createDiv({ text: file.name, cls: "file-name" });
        el.createDiv({ text: file.path, cls: "file-path" });
    }
    selectSuggestion(file) {
        if (!this.inputEl) {
            console.warn("FileLocationSuggest: inputEl is undefined, cannot set value");
            this.close();
            return;
        }
        this.inputEl.value = file.path;
        this.inputEl.trigger("input");
        this.onChoose(file);
        this.close();
    }
}
/**
 * Suggester for action types (used in simple text input scenarios)
 */
export class ActionTypeSuggest extends AbstractInputSuggest {
    constructor(app, inputEl) {
        super(app, inputEl);
        this.actionTypes = [
            "delete",
            "keep",
            "archive",
            "move:",
            "complete:",
            "duplicate",
        ];
        this.inputEl = inputEl;
    }
    getSuggestions(query) {
        return this.actionTypes.filter((action) => action.toLowerCase().includes(query.toLowerCase()));
    }
    renderSuggestion(actionType, el) {
        el.createDiv({ text: actionType, cls: "action-type-suggestion" });
        // Add description
        const description = this.getActionDescription(actionType);
        if (description) {
            el.createDiv({
                text: description,
                cls: "action-description",
            });
        }
    }
    getActionDescription(actionType) {
        switch (actionType) {
            case "delete":
                return "Remove the completed task from the file";
            case "keep":
                return "Keep the completed task in place";
            case "archive":
                return "Move the completed task to an archive file";
            case "move:":
                return "Move the completed task to another file";
            case "complete:":
                return "Mark related tasks as completed";
            case "duplicate":
                return "Create a copy of the completed task";
            default:
                return "";
        }
    }
    selectSuggestion(actionType) {
        if (!this.inputEl) {
            console.warn("ActionTypeSuggest: inputEl is undefined, cannot set value");
            this.close();
            return;
        }
        this.inputEl.value = actionType;
        this.inputEl.trigger("input");
        this.close();
    }
}
/**
 * Modal for selecting files with folder navigation
 */
export class FileSelectionModal extends FuzzySuggestModal {
    constructor(app, onChoose) {
        super(app);
        this.onChoose = onChoose;
        this.setPlaceholder("Type to search for files...");
    }
    getItems() {
        return this.app.vault.getMarkdownFiles();
    }
    getItemText(file) {
        return file.path;
    }
    onChooseItem(file) {
        this.onChoose(file);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT25Db21wbGV0aW9uU3VnZ2VzdGVycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIk9uQ29tcGxldGlvblN1Z2dlc3RlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUlOLGlCQUFpQixFQUNqQixvQkFBb0IsR0FFcEIsTUFBTSxVQUFVLENBQUM7QUFHbEI7Ozs7OztHQU1HO0FBQ0gsTUFBTSxPQUFPLGFBQWMsU0FBUSxvQkFBNEI7SUFHOUQsWUFDQyxHQUFRLEVBQ1IsT0FBeUIsRUFDakIsTUFBNkIsRUFDN0IsUUFBa0M7UUFFMUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUhaLFdBQU0sR0FBTixNQUFNLENBQXVCO1FBQzdCLGFBQVEsR0FBUixRQUFRLENBQTBCO1FBRzFDLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO0lBQ3hCLENBQUM7SUFFRCxjQUFjLENBQUMsS0FBYTtRQUMzQixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRTtZQUN0QyxPQUFPLEVBQUUsQ0FBQztTQUNWO1FBRUQsSUFBSTtZQUNILDZEQUE2RDtZQUM3RCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2hFLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUM1QyxNQUFNLE9BQU8sR0FBRyxRQUFRO2lCQUN0QixNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxXQUFDLE9BQUEsTUFBQSxJQUFJLENBQUMsUUFBUSwwQ0FBRSxFQUFFLENBQUEsRUFBQSxDQUFDO2lCQUNuQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRyxDQUFDO2lCQUNoQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFX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QWdCLENBQUMsVUFBa0I7UUFDbEMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDbEIsT0FBTyxDQUFDLElBQUksQ0FDWCwyREFBMkQsQ0FDM0QsQ0FBQztZQUNGLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNiLE9BQU87U0FDUDtRQUNELElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLFVBQVUsQ0FBQztRQUNoQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM5QixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDZCxDQUFDO0NBQ0Q7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxpQkFBd0I7SUFDL0QsWUFBWSxHQUFRLEVBQVUsUUFBK0I7UUFDNUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRGtCLGFBQVEsR0FBUixRQUFRLENBQXVCO1FBRTVELElBQUksQ0FBQyxjQUFjLENBQUMsNkJBQTZCLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBRUQsUUFBUTtRQUNQLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUMxQyxDQUFDO0lBRUQsV0FBVyxDQUFDLElBQVc7UUFDdEIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ2xCLENBQUM7SUFFRCxZQUFZLENBQUMsSUFBVztRQUN2QixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3JCLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XHJcblx0QXBwLFxyXG5cdFRGaWxlLFxyXG5cdFRGb2xkZXIsXHJcblx0RnV6enlTdWdnZXN0TW9kYWwsXHJcblx0QWJzdHJhY3RJbnB1dFN1Z2dlc3QsXHJcblx0VGV4dENvbXBvbmVudCxcclxufSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5cclxuLyoqXHJcbiAqIFN1Z2dlc3RlciBmb3IgdGFzayBJRHNcclxuICpcclxuICogTm90ZTogVGhpcyBjbGFzcyBpbmNsdWRlcyBudWxsLXNhZmV0eSBjaGVja3MgZm9yIGlucHV0RWwgdG8gcHJldmVudFxyXG4gKiBcIkNhbm5vdCBzZXQgcHJvcGVydGllcyBvZiB1bmRlZmluZWRcIiBlcnJvcnMgdGhhdCBjYW4gb2NjdXIgd2hlblxyXG4gKiBUZXh0Q29tcG9uZW50LmlucHV0RWwgaXMgbm90IHlldCBpbml0aWFsaXplZCBkdXJpbmcgY29tcG9uZW50IGNyZWF0aW9uLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFRhc2tJZFN1Z2dlc3QgZXh0ZW5kcyBBYnN0cmFjdElucHV0U3VnZ2VzdDxzdHJpbmc+IHtcclxuXHRwcm90ZWN0ZWQgaW5wdXRFbDogSFRNTElucHV0RWxlbWVudDtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRhcHA6IEFwcCxcclxuXHRcdGlucHV0RWw6IEhUTUxJbnB1dEVsZW1lbnQsXHJcblx0XHRwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0cHJpdmF0ZSBvbkNob29zZTogKHRhc2tJZDogc3RyaW5nKSA9PiB2b2lkXHJcblx0KSB7XHJcblx0XHRzdXBlcihhcHAsIGlucHV0RWwpO1xyXG5cdFx0dGhpcy5pbnB1dEVsID0gaW5wdXRFbDtcclxuXHR9XHJcblxyXG5cdGdldFN1Z2dlc3Rpb25zKHF1ZXJ5OiBzdHJpbmcpOiBzdHJpbmdbXSB7XHJcblx0XHRpZiAoIXRoaXMucGx1Z2luLmRhdGFmbG93T3JjaGVzdHJhdG9yKSB7XHJcblx0XHRcdHJldHVybiBbXTtcclxuXHRcdH1cclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBHZXQgYWxsIHRhc2tzIHRoYXQgaGF2ZSBJRHMgZnJvbSBkYXRhZmxvdyB1c2luZyBzeW5jIGNhY2hlXHJcblx0XHRcdGNvbnN0IHF1ZXJ5QVBJID0gdGhpcy5wbHVnaW4uZGF0YWZsb3dPcmNoZXN0cmF0b3IuZ2V0UXVlcnlBUEkoKTtcclxuXHRcdFx0Y29uc3QgYWxsVGFza3MgPSBxdWVyeUFQSS5nZXRBbGxUYXNrc1N5bmMoKTtcclxuXHRcdFx0Y29uc3QgdGFza0lkcyA9IGFsbFRhc2tzXHJcblx0XHRcdFx0LmZpbHRlcigodGFzaykgPT4gdGFzay5tZXRhZGF0YT8uaWQpXHJcblx0XHRcdFx0Lm1hcCgodGFzaykgPT4gdGFzay5tZXRhZGF0YS5pZCEpXHJcblx0XHRcdFx0LmZpbHRlcigoaWQpID0+IGlkLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMocXVlcnkudG9Mb3dlckNhc2UoKSkpO1xyXG5cclxuXHRcdFx0cmV0dXJuIHRhc2tJZHMuc2xpY2UoMCwgMTApOyAvLyBMaW1pdCB0byAxMCBzdWdnZXN0aW9uc1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFwiRmFpbGVkIHRvIGdldCB0YXNrIElEcyBmcm9tIGRhdGFmbG93OlwiLCBlcnJvcik7XHJcblx0XHRcdHJldHVybiBbXTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJlbmRlclN1Z2dlc3Rpb24odGFza0lkOiBzdHJpbmcsIGVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xyXG5cdFx0ZWwuY3JlYXRlRGl2KHsgdGV4dDogdGFza0lkLCBjbHM6IFwidGFzay1pZC1zdWdnZXN0aW9uXCIgfSk7XHJcblxyXG5cdFx0Ly8gVHJ5IHRvIGZpbmQgdGhlIHRhc2sgYW5kIHNob3cgaXRzIGNvbnRlbnRcclxuXHRcdGlmICh0aGlzLnBsdWdpbi5kYXRhZmxvd09yY2hlc3RyYXRvcikge1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdGNvbnN0IHF1ZXJ5QVBJID0gdGhpcy5wbHVnaW4uZGF0YWZsb3dPcmNoZXN0cmF0b3IuZ2V0UXVlcnlBUEkoKTtcclxuXHRcdFx0XHRjb25zdCB0YXNrID0gcXVlcnlBUEkuZ2V0VGFza0J5SWRTeW5jKHRhc2tJZCk7XHJcblx0XHRcdFx0aWYgKHRhc2sgJiYgdGFzay5jb250ZW50KSB7XHJcblx0XHRcdFx0XHRlbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdFx0XHR0ZXh0OiB0YXNrLmNvbnRlbnQsXHJcblx0XHRcdFx0XHRcdGNsczogXCJ0YXNrLWNvbnRlbnQtcHJldmlld1wiLFxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdGNvbnNvbGUud2FybihcIkZhaWxlZCB0byBnZXQgdGFzayBmcm9tIGRhdGFmbG93OlwiLCBlcnJvcik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHNlbGVjdFN1Z2dlc3Rpb24odGFza0lkOiBzdHJpbmcpOiB2b2lkIHtcclxuXHRcdGlmICghdGhpcy5pbnB1dEVsKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcIlRhc2tJZFN1Z2dlc3Q6IGlucHV0RWwgaXMgdW5kZWZpbmVkLCBjYW5ub3Qgc2V0IHZhbHVlXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSGFuZGxlIG11bHRpcGxlIHRhc2sgSURzIGluIHRoZSBpbnB1dFxyXG5cdFx0Y29uc3QgY3VycmVudFZhbHVlID0gdGhpcy5pbnB1dEVsLnZhbHVlO1xyXG5cdFx0Y29uc3QgbGFzdENvbW1hSW5kZXggPSBjdXJyZW50VmFsdWUubGFzdEluZGV4T2YoXCIsXCIpO1xyXG5cclxuXHRcdGlmIChsYXN0Q29tbWFJbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0Ly8gUmVwbGFjZSB0aGUgbGFzdCBwYXJ0aWFsIElEXHJcblx0XHRcdGNvbnN0IGJlZm9yZUxhc3RDb21tYSA9IGN1cnJlbnRWYWx1ZS5zdWJzdHJpbmcoXHJcblx0XHRcdFx0MCxcclxuXHRcdFx0XHRsYXN0Q29tbWFJbmRleCArIDFcclxuXHRcdFx0KTtcclxuXHRcdFx0dGhpcy5pbnB1dEVsLnZhbHVlID0gYmVmb3JlTGFzdENvbW1hICsgXCIgXCIgKyB0YXNrSWQ7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBSZXBsYWNlIHRoZSBlbnRpcmUgdmFsdWVcclxuXHRcdFx0dGhpcy5pbnB1dEVsLnZhbHVlID0gdGFza0lkO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuaW5wdXRFbC50cmlnZ2VyKFwiaW5wdXRcIik7XHJcblx0XHR0aGlzLm9uQ2hvb3NlKHRhc2tJZCk7XHJcblx0XHR0aGlzLmNsb3NlKCk7XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICogU3VnZ2VzdGVyIGZvciBmaWxlIGxvY2F0aW9uc1xyXG4gKlxyXG4gKiBOb3RlOiBUaGlzIGNsYXNzIGluY2x1ZGVzIG51bGwtc2FmZXR5IGNoZWNrcyBmb3IgaW5wdXRFbCB0byBwcmV2ZW50XHJcbiAqIFwiQ2Fubm90IHNldCBwcm9wZXJ0aWVzIG9mIHVuZGVmaW5lZFwiIGVycm9ycyB0aGF0IGNhbiBvY2N1ciB3aGVuXHJcbiAqIFRleHRDb21wb25lbnQuaW5wdXRFbCBpcyBub3QgeWV0IGluaXRpYWxpemVkIGR1cmluZyBjb21wb25lbnQgY3JlYXRpb24uXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgRmlsZUxvY2F0aW9uU3VnZ2VzdCBleHRlbmRzIEFic3RyYWN0SW5wdXRTdWdnZXN0PFRGaWxlPiB7XHJcblx0cHJvdGVjdGVkIGlucHV0RWw6IEhUTUxJbnB1dEVsZW1lbnQ7XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0YXBwOiBBcHAsXHJcblx0XHRpbnB1dEVsOiBIVE1MSW5wdXRFbGVtZW50LFxyXG5cdFx0cHJpdmF0ZSBvbkNob29zZTogKGZpbGU6IFRGaWxlKSA9PiB2b2lkXHJcblx0KSB7XHJcblx0XHRzdXBlcihhcHAsIGlucHV0RWwpO1xyXG5cdFx0dGhpcy5pbnB1dEVsID0gaW5wdXRFbDtcclxuXHRcdHRoaXMub25DaG9vc2UgPSBvbkNob29zZTtcclxuXHR9XHJcblxyXG5cdGdldFN1Z2dlc3Rpb25zKHF1ZXJ5OiBzdHJpbmcpOiBURmlsZVtdIHtcclxuXHRcdGNvbnN0IGZpbGVzID0gdGhpcy5hcHAudmF1bHQuZ2V0TWFya2Rvd25GaWxlcygpO1xyXG5cdFx0cmV0dXJuIGZpbGVzXHJcblx0XHRcdC5maWx0ZXIoKGZpbGUpID0+XHJcblx0XHRcdFx0ZmlsZS5wYXRoLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMocXVlcnkudG9Mb3dlckNhc2UoKSlcclxuXHRcdFx0KVxyXG5cdFx0XHQuc2xpY2UoMCwgMTApOyAvLyBMaW1pdCB0byAxMCBzdWdnZXN0aW9uc1xyXG5cdH1cclxuXHJcblx0cmVuZGVyU3VnZ2VzdGlvbihmaWxlOiBURmlsZSwgZWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHRlbC5jcmVhdGVEaXYoeyB0ZXh0OiBmaWxlLm5hbWUsIGNsczogXCJmaWxlLW5hbWVcIiB9KTtcclxuXHRcdGVsLmNyZWF0ZURpdih7IHRleHQ6IGZpbGUucGF0aCwgY2xzOiBcImZpbGUtcGF0aFwiIH0pO1xyXG5cdH1cclxuXHJcblx0c2VsZWN0U3VnZ2VzdGlvbihmaWxlOiBURmlsZSk6IHZvaWQge1xyXG5cdFx0aWYgKCF0aGlzLmlucHV0RWwpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFwiRmlsZUxvY2F0aW9uU3VnZ2VzdDogaW5wdXRFbCBpcyB1bmRlZmluZWQsIGNhbm5vdCBzZXQgdmFsdWVcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHR0aGlzLmNsb3NlKCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdHRoaXMuaW5wdXRFbC52YWx1ZSA9IGZpbGUucGF0aDtcclxuXHRcdHRoaXMuaW5wdXRFbC50cmlnZ2VyKFwiaW5wdXRcIik7XHJcblx0XHR0aGlzLm9uQ2hvb3NlKGZpbGUpO1xyXG5cdFx0dGhpcy5jbG9zZSgpO1xyXG5cdH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFN1Z2dlc3RlciBmb3IgYWN0aW9uIHR5cGVzICh1c2VkIGluIHNpbXBsZSB0ZXh0IGlucHV0IHNjZW5hcmlvcylcclxuICovXHJcbmV4cG9ydCBjbGFzcyBBY3Rpb25UeXBlU3VnZ2VzdCBleHRlbmRzIEFic3RyYWN0SW5wdXRTdWdnZXN0PHN0cmluZz4ge1xyXG5cdHByb3RlY3RlZCBpbnB1dEVsOiBIVE1MSW5wdXRFbGVtZW50O1xyXG5cclxuXHRwcml2YXRlIHJlYWRvbmx5IGFjdGlvblR5cGVzID0gW1xyXG5cdFx0XCJkZWxldGVcIixcclxuXHRcdFwia2VlcFwiLFxyXG5cdFx0XCJhcmNoaXZlXCIsXHJcblx0XHRcIm1vdmU6XCIsXHJcblx0XHRcImNvbXBsZXRlOlwiLFxyXG5cdFx0XCJkdXBsaWNhdGVcIixcclxuXHRdO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihhcHA6IEFwcCwgaW5wdXRFbDogSFRNTElucHV0RWxlbWVudCkge1xyXG5cdFx0c3VwZXIoYXBwLCBpbnB1dEVsKTtcclxuXHRcdHRoaXMuaW5wdXRFbCA9IGlucHV0RWw7XHJcblx0fVxyXG5cclxuXHRnZXRTdWdnZXN0aW9ucyhxdWVyeTogc3RyaW5nKTogc3RyaW5nW10ge1xyXG5cdFx0cmV0dXJuIHRoaXMuYWN0aW9uVHlwZXMuZmlsdGVyKChhY3Rpb24pID0+XHJcblx0XHRcdGFjdGlvbi50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHF1ZXJ5LnRvTG93ZXJDYXNlKCkpXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0cmVuZGVyU3VnZ2VzdGlvbihhY3Rpb25UeXBlOiBzdHJpbmcsIGVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xyXG5cdFx0ZWwuY3JlYXRlRGl2KHsgdGV4dDogYWN0aW9uVHlwZSwgY2xzOiBcImFjdGlvbi10eXBlLXN1Z2dlc3Rpb25cIiB9KTtcclxuXHJcblx0XHQvLyBBZGQgZGVzY3JpcHRpb25cclxuXHRcdGNvbnN0IGRlc2NyaXB0aW9uID0gdGhpcy5nZXRBY3Rpb25EZXNjcmlwdGlvbihhY3Rpb25UeXBlKTtcclxuXHRcdGlmIChkZXNjcmlwdGlvbikge1xyXG5cdFx0XHRlbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdHRleHQ6IGRlc2NyaXB0aW9uLFxyXG5cdFx0XHRcdGNsczogXCJhY3Rpb24tZGVzY3JpcHRpb25cIixcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldEFjdGlvbkRlc2NyaXB0aW9uKGFjdGlvblR5cGU6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHRzd2l0Y2ggKGFjdGlvblR5cGUpIHtcclxuXHRcdFx0Y2FzZSBcImRlbGV0ZVwiOlxyXG5cdFx0XHRcdHJldHVybiBcIlJlbW92ZSB0aGUgY29tcGxldGVkIHRhc2sgZnJvbSB0aGUgZmlsZVwiO1xyXG5cdFx0XHRjYXNlIFwia2VlcFwiOlxyXG5cdFx0XHRcdHJldHVybiBcIktlZXAgdGhlIGNvbXBsZXRlZCB0YXNrIGluIHBsYWNlXCI7XHJcblx0XHRcdGNhc2UgXCJhcmNoaXZlXCI6XHJcblx0XHRcdFx0cmV0dXJuIFwiTW92ZSB0aGUgY29tcGxldGVkIHRhc2sgdG8gYW4gYXJjaGl2ZSBmaWxlXCI7XHJcblx0XHRcdGNhc2UgXCJtb3ZlOlwiOlxyXG5cdFx0XHRcdHJldHVybiBcIk1vdmUgdGhlIGNvbXBsZXRlZCB0YXNrIHRvIGFub3RoZXIgZmlsZVwiO1xyXG5cdFx0XHRjYXNlIFwiY29tcGxldGU6XCI6XHJcblx0XHRcdFx0cmV0dXJuIFwiTWFyayByZWxhdGVkIHRhc2tzIGFzIGNvbXBsZXRlZFwiO1xyXG5cdFx0XHRjYXNlIFwiZHVwbGljYXRlXCI6XHJcblx0XHRcdFx0cmV0dXJuIFwiQ3JlYXRlIGEgY29weSBvZiB0aGUgY29tcGxldGVkIHRhc2tcIjtcclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRyZXR1cm4gXCJcIjtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHNlbGVjdFN1Z2dlc3Rpb24oYWN0aW9uVHlwZTogc3RyaW5nKTogdm9pZCB7XHJcblx0XHRpZiAoIXRoaXMuaW5wdXRFbCkge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XCJBY3Rpb25UeXBlU3VnZ2VzdDogaW5wdXRFbCBpcyB1bmRlZmluZWQsIGNhbm5vdCBzZXQgdmFsdWVcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHR0aGlzLmNsb3NlKCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdHRoaXMuaW5wdXRFbC52YWx1ZSA9IGFjdGlvblR5cGU7XHJcblx0XHR0aGlzLmlucHV0RWwudHJpZ2dlcihcImlucHV0XCIpO1xyXG5cdFx0dGhpcy5jbG9zZSgpO1xyXG5cdH1cclxufVxyXG5cclxuLyoqXHJcbiAqIE1vZGFsIGZvciBzZWxlY3RpbmcgZmlsZXMgd2l0aCBmb2xkZXIgbmF2aWdhdGlvblxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIEZpbGVTZWxlY3Rpb25Nb2RhbCBleHRlbmRzIEZ1enp5U3VnZ2VzdE1vZGFsPFRGaWxlPiB7XHJcblx0Y29uc3RydWN0b3IoYXBwOiBBcHAsIHByaXZhdGUgb25DaG9vc2U6IChmaWxlOiBURmlsZSkgPT4gdm9pZCkge1xyXG5cdFx0c3VwZXIoYXBwKTtcclxuXHRcdHRoaXMuc2V0UGxhY2Vob2xkZXIoXCJUeXBlIHRvIHNlYXJjaCBmb3IgZmlsZXMuLi5cIik7XHJcblx0fVxyXG5cclxuXHRnZXRJdGVtcygpOiBURmlsZVtdIHtcclxuXHRcdHJldHVybiB0aGlzLmFwcC52YXVsdC5nZXRNYXJrZG93bkZpbGVzKCk7XHJcblx0fVxyXG5cclxuXHRnZXRJdGVtVGV4dChmaWxlOiBURmlsZSk6IHN0cmluZyB7XHJcblx0XHRyZXR1cm4gZmlsZS5wYXRoO1xyXG5cdH1cclxuXHJcblx0b25DaG9vc2VJdGVtKGZpbGU6IFRGaWxlKTogdm9pZCB7XHJcblx0XHR0aGlzLm9uQ2hvb3NlKGZpbGUpO1xyXG5cdH1cclxufVxyXG4iXX0=