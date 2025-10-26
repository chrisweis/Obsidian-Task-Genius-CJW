import { Notice } from "obsidian";
import { t } from "@/translations/helper";
/**
 * Priority suggest options based on existing priority system
 */
export function createPrioritySuggestOptions() {
    return [
        {
            id: "priority-highest",
            label: t("Highest Priority"),
            icon: "arrow-up",
            description: "",
            replacement: "",
            trigger: "!",
            action: (editor, cursor) => {
                var _a;
                // Update modal metadata instead of inserting text
                const editorEl = (_a = editor.cm) === null || _a === void 0 ? void 0 : _a.dom;
                const modalEl = editorEl === null || editorEl === void 0 ? void 0 : editorEl.closest(".quick-capture-modal.minimal");
                const modal = modalEl === null || modalEl === void 0 ? void 0 : modalEl.__minimalQuickCaptureModal;
                if (modal) {
                    modal.taskMetadata.priority = 5;
                    modal.updateButtonState(modal.priorityButton, true);
                }
                new Notice(t("Highest priority set"));
            },
        },
        {
            id: "priority-high",
            label: t("High Priority"),
            icon: "arrow-up",
            description: "",
            replacement: "",
            trigger: "!",
            action: (editor, cursor) => {
                var _a;
                // Update modal metadata instead of inserting text
                const editorEl = (_a = editor.cm) === null || _a === void 0 ? void 0 : _a.dom;
                const modalEl = editorEl === null || editorEl === void 0 ? void 0 : editorEl.closest(".quick-capture-modal.minimal");
                const modal = modalEl === null || modalEl === void 0 ? void 0 : modalEl.__minimalQuickCaptureModal;
                if (modal) {
                    modal.taskMetadata.priority = 4;
                    modal.updateButtonState(modal.priorityButton, true);
                }
                new Notice(t("High priority set"));
            },
        },
        {
            id: "priority-medium",
            label: t("Medium Priority"),
            icon: "minus",
            description: "",
            replacement: "",
            trigger: "!",
            action: (editor, cursor) => {
                var _a;
                // Update modal metadata instead of inserting text
                const editorEl = (_a = editor.cm) === null || _a === void 0 ? void 0 : _a.dom;
                const modalEl = editorEl === null || editorEl === void 0 ? void 0 : editorEl.closest(".quick-capture-modal.minimal");
                const modal = modalEl === null || modalEl === void 0 ? void 0 : modalEl.__minimalQuickCaptureModal;
                if (modal) {
                    modal.taskMetadata.priority = 3;
                    modal.updateButtonState(modal.priorityButton, true);
                }
                new Notice(t("Medium priority set"));
            },
        },
        {
            id: "priority-low",
            label: t("Low Priority"),
            icon: "arrow-down",
            description: "",
            replacement: "",
            trigger: "!",
            action: (editor, cursor) => {
                var _a;
                // Update modal metadata instead of inserting text
                const editorEl = (_a = editor.cm) === null || _a === void 0 ? void 0 : _a.dom;
                const modalEl = editorEl === null || editorEl === void 0 ? void 0 : editorEl.closest(".quick-capture-modal.minimal");
                const modal = modalEl === null || modalEl === void 0 ? void 0 : modalEl.__minimalQuickCaptureModal;
                if (modal) {
                    modal.taskMetadata.priority = 2;
                    modal.updateButtonState(modal.priorityButton, true);
                }
                new Notice(t("Low priority set"));
            },
        },
        {
            id: "priority-lowest",
            label: t("Lowest Priority"),
            icon: "arrow-down",
            description: "",
            replacement: "",
            trigger: "!",
            action: (editor, cursor) => {
                var _a;
                // Update modal metadata instead of inserting text
                const editorEl = (_a = editor.cm) === null || _a === void 0 ? void 0 : _a.dom;
                const modalEl = editorEl === null || editorEl === void 0 ? void 0 : editorEl.closest(".quick-capture-modal.minimal");
                const modal = modalEl === null || modalEl === void 0 ? void 0 : modalEl.__minimalQuickCaptureModal;
                if (modal) {
                    modal.taskMetadata.priority = 1;
                    modal.updateButtonState(modal.priorityButton, true);
                }
                new Notice(t("Lowest priority set"));
            },
        },
    ];
}
/**
 * Date suggest options for common date patterns
 */
export function createDateSuggestOptions() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formatDate = (date) => {
        return date.toISOString().split("T")[0];
    };
    return [
        {
            id: "date-today",
            label: t("Today"),
            icon: "calendar-days",
            description: t("Set due date to today"),
            replacement: "",
            trigger: "~",
            action: (editor, cursor) => {
                var _a;
                // Update modal metadata instead of inserting text
                const editorEl = (_a = editor.cm) === null || _a === void 0 ? void 0 : _a.dom;
                const modalEl = editorEl === null || editorEl === void 0 ? void 0 : editorEl.closest(".quick-capture-modal.minimal");
                const modal = modalEl === null || modalEl === void 0 ? void 0 : modalEl.__minimalQuickCaptureModal;
                if (modal) {
                    modal.taskMetadata.dueDate = today;
                    modal.updateButtonState(modal.dateButton, true);
                }
                new Notice(t("Due date set to today"));
            },
        },
        {
            id: "date-tomorrow",
            label: t("Tomorrow"),
            icon: "calendar-plus",
            description: t("Set due date to tomorrow"),
            replacement: "",
            trigger: "~",
            action: (editor, cursor) => {
                var _a;
                // Update modal metadata instead of inserting text
                const editorEl = (_a = editor.cm) === null || _a === void 0 ? void 0 : _a.dom;
                const modalEl = editorEl === null || editorEl === void 0 ? void 0 : editorEl.closest(".quick-capture-modal.minimal");
                const modal = modalEl === null || modalEl === void 0 ? void 0 : modalEl.__minimalQuickCaptureModal;
                if (modal) {
                    modal.taskMetadata.dueDate = tomorrow;
                    modal.updateButtonState(modal.dateButton, true);
                }
                new Notice(t("Due date set to tomorrow"));
            },
        },
        {
            id: "date-picker",
            label: t("Pick Date"),
            icon: "calendar",
            description: t("Open date picker"),
            replacement: "",
            trigger: "~",
            action: (editor, cursor) => {
                var _a;
                // Trigger the date picker modal
                const editorEl = (_a = editor.cm) === null || _a === void 0 ? void 0 : _a.dom;
                const modalEl = editorEl === null || editorEl === void 0 ? void 0 : editorEl.closest(".quick-capture-modal.minimal");
                const modal = modalEl === null || modalEl === void 0 ? void 0 : modalEl.__minimalQuickCaptureModal;
                if (modal) {
                    modal.showDatePicker();
                }
            },
        },
        {
            id: "date-scheduled",
            label: t("Scheduled Date"),
            icon: "calendar-clock",
            description: t("Set scheduled date"),
            replacement: "",
            trigger: "~",
            action: (editor, cursor) => {
                var _a;
                // Update modal metadata for scheduled date
                const editorEl = (_a = editor.cm) === null || _a === void 0 ? void 0 : _a.dom;
                const modalEl = editorEl === null || editorEl === void 0 ? void 0 : editorEl.closest(".quick-capture-modal.minimal");
                const modal = modalEl === null || modalEl === void 0 ? void 0 : modalEl.__minimalQuickCaptureModal;
                if (modal) {
                    modal.taskMetadata.scheduledDate = today;
                    modal.updateButtonState(modal.dateButton, true);
                }
                new Notice(t("Scheduled date set"));
            },
        },
    ];
}
/**
 * Target location suggest options
 */
export function createTargetSuggestOptions(plugin) {
    const options = [
        {
            id: "target-inbox",
            label: t("Inbox"),
            icon: "inbox",
            description: t("Save to inbox"),
            replacement: "",
            trigger: "*",
            action: (editor, cursor) => {
                var _a;
                // Update modal metadata instead of inserting text
                const editorEl = (_a = editor.cm) === null || _a === void 0 ? void 0 : _a.dom;
                const modalEl = editorEl === null || editorEl === void 0 ? void 0 : editorEl.closest(".quick-capture-modal.minimal");
                const modal = modalEl === null || modalEl === void 0 ? void 0 : modalEl.__minimalQuickCaptureModal;
                if (modal) {
                    modal.taskMetadata.location = "fixed";
                    modal.taskMetadata.targetFile = plugin.settings.quickCapture.targetFile;
                    modal.updateButtonState(modal.locationButton, true);
                }
                new Notice(t("Target set to Inbox"));
            },
        },
        {
            id: "target-daily",
            label: t("Daily Note"),
            icon: "calendar-days",
            description: t("Save to today's daily note"),
            replacement: "",
            trigger: "*",
            action: (editor, cursor) => {
                var _a;
                // Update modal metadata instead of inserting text
                const editorEl = (_a = editor.cm) === null || _a === void 0 ? void 0 : _a.dom;
                const modalEl = editorEl === null || editorEl === void 0 ? void 0 : editorEl.closest(".quick-capture-modal.minimal");
                const modal = modalEl === null || modalEl === void 0 ? void 0 : modalEl.__minimalQuickCaptureModal;
                if (modal) {
                    modal.taskMetadata.location = "daily";
                    modal.updateButtonState(modal.locationButton, true);
                }
                new Notice(t("Target set to Daily Note"));
            },
        },
        {
            id: "target-current",
            label: t("Current File"),
            icon: "file-text",
            description: t("Save to current file"),
            replacement: "",
            trigger: "*",
            action: (editor, cursor) => {
                var _a;
                // Update modal metadata instead of inserting text
                const editorEl = (_a = editor.cm) === null || _a === void 0 ? void 0 : _a.dom;
                const modalEl = editorEl === null || editorEl === void 0 ? void 0 : editorEl.closest(".quick-capture-modal.minimal");
                const modal = modalEl === null || modalEl === void 0 ? void 0 : modalEl.__minimalQuickCaptureModal;
                if (modal) {
                    modal.taskMetadata.location = "current";
                    modal.updateButtonState(modal.locationButton, true);
                }
                new Notice(t("Target set to Current File"));
            },
        },
        {
            id: "target-picker",
            label: t("Choose File"),
            icon: "folder-open",
            description: t("Open file picker"),
            replacement: "",
            trigger: "*",
            action: (editor, cursor) => {
                var _a;
                // Trigger the location menu
                const editorEl = (_a = editor.cm) === null || _a === void 0 ? void 0 : _a.dom;
                const modalEl = editorEl === null || editorEl === void 0 ? void 0 : editorEl.closest(".quick-capture-modal.minimal");
                const modal = modalEl === null || modalEl === void 0 ? void 0 : modalEl.__minimalQuickCaptureModal;
                if (modal) {
                    modal.showLocationMenu();
                }
            },
        },
    ];
    // Add recent files if available
    const recentFiles = plugin.app.workspace.getLastOpenFiles();
    recentFiles.slice(0, 3).forEach((filePath, index) => {
        var _a;
        const fileName = ((_a = filePath.split("/").pop()) === null || _a === void 0 ? void 0 : _a.replace(".md", "")) || filePath;
        options.push({
            id: `target-recent-${index}`,
            label: fileName,
            icon: "file",
            description: t("Save to recent file"),
            replacement: "",
            trigger: "*",
            action: (editor, cursor) => {
                var _a;
                // Update modal metadata instead of inserting text
                const editorEl = (_a = editor.cm) === null || _a === void 0 ? void 0 : _a.dom;
                const modalEl = editorEl === null || editorEl === void 0 ? void 0 : editorEl.closest(".quick-capture-modal.minimal");
                const modal = modalEl === null || modalEl === void 0 ? void 0 : modalEl.__minimalQuickCaptureModal;
                if (modal) {
                    modal.taskMetadata.location = "fixed";
                    modal.taskMetadata.targetFile = filePath;
                    modal.updateButtonState(modal.locationButton, true);
                }
                new Notice(t("Target set to") + ` ${fileName}`);
            },
        });
    });
    return options;
}
/**
 * Tag suggest options
 */
export function createTagSuggestOptions(plugin) {
    const options = [
        {
            id: "tag-important",
            label: t("Important"),
            icon: "star",
            description: t("Mark as important"),
            replacement: "",
            trigger: "#",
            action: (editor, cursor) => {
                var _a;
                // Update modal metadata instead of inserting text
                const editorEl = (_a = editor.cm) === null || _a === void 0 ? void 0 : _a.dom;
                const modalEl = editorEl === null || editorEl === void 0 ? void 0 : editorEl.closest(".quick-capture-modal.minimal");
                const modal = modalEl === null || modalEl === void 0 ? void 0 : modalEl.__minimalQuickCaptureModal;
                if (modal) {
                    if (!modal.taskMetadata.tags)
                        modal.taskMetadata.tags = [];
                    if (!modal.taskMetadata.tags.includes("important")) {
                        modal.taskMetadata.tags.push("important");
                    }
                    modal.updateButtonState(modal.tagButton, true);
                }
                new Notice(t("Tagged as important"));
            },
        },
        {
            id: "tag-urgent",
            label: t("Urgent"),
            icon: "zap",
            description: t("Mark as urgent"),
            replacement: "",
            trigger: "#",
            action: (editor, cursor) => {
                var _a;
                // Update modal metadata instead of inserting text
                const editorEl = (_a = editor.cm) === null || _a === void 0 ? void 0 : _a.dom;
                const modalEl = editorEl === null || editorEl === void 0 ? void 0 : editorEl.closest(".quick-capture-modal.minimal");
                const modal = modalEl === null || modalEl === void 0 ? void 0 : modalEl.__minimalQuickCaptureModal;
                if (modal) {
                    if (!modal.taskMetadata.tags)
                        modal.taskMetadata.tags = [];
                    if (!modal.taskMetadata.tags.includes("urgent")) {
                        modal.taskMetadata.tags.push("urgent");
                    }
                    modal.updateButtonState(modal.tagButton, true);
                }
                new Notice(t("Tagged as urgent"));
            },
        },
        {
            id: "tag-work",
            label: t("Work"),
            icon: "briefcase",
            description: t("Work related task"),
            replacement: "",
            trigger: "#",
            action: (editor, cursor) => {
                var _a;
                // Update modal metadata instead of inserting text
                const editorEl = (_a = editor.cm) === null || _a === void 0 ? void 0 : _a.dom;
                const modalEl = editorEl === null || editorEl === void 0 ? void 0 : editorEl.closest(".quick-capture-modal.minimal");
                const modal = modalEl === null || modalEl === void 0 ? void 0 : modalEl.__minimalQuickCaptureModal;
                if (modal) {
                    if (!modal.taskMetadata.tags)
                        modal.taskMetadata.tags = [];
                    if (!modal.taskMetadata.tags.includes("work")) {
                        modal.taskMetadata.tags.push("work");
                    }
                    modal.updateButtonState(modal.tagButton, true);
                }
                new Notice(t("Tagged as work"));
            },
        },
        {
            id: "tag-personal",
            label: t("Personal"),
            icon: "user",
            description: t("Personal task"),
            replacement: "",
            trigger: "#",
            action: (editor, cursor) => {
                var _a;
                // Update modal metadata instead of inserting text
                const editorEl = (_a = editor.cm) === null || _a === void 0 ? void 0 : _a.dom;
                const modalEl = editorEl === null || editorEl === void 0 ? void 0 : editorEl.closest(".quick-capture-modal.minimal");
                const modal = modalEl === null || modalEl === void 0 ? void 0 : modalEl.__minimalQuickCaptureModal;
                if (modal) {
                    if (!modal.taskMetadata.tags)
                        modal.taskMetadata.tags = [];
                    if (!modal.taskMetadata.tags.includes("personal")) {
                        modal.taskMetadata.tags.push("personal");
                    }
                    modal.updateButtonState(modal.tagButton, true);
                }
                new Notice(t("Tagged as personal"));
            },
        },
        {
            id: "tag-picker",
            label: t("Choose Tag"),
            icon: "tag",
            description: t("Open tag picker"),
            replacement: "",
            trigger: "#",
            action: (editor, cursor) => {
                var _a;
                // Trigger the tag selector modal
                const editorEl = (_a = editor.cm) === null || _a === void 0 ? void 0 : _a.dom;
                const modalEl = editorEl === null || editorEl === void 0 ? void 0 : editorEl.closest(".quick-capture-modal.minimal");
                const modal = modalEl === null || modalEl === void 0 ? void 0 : modalEl.__minimalQuickCaptureModal;
                if (modal) {
                    modal.showTagSelector();
                }
            },
        },
    ];
    // Add existing tags from vault
    try {
        const allTags = plugin.app.metadataCache.getTags();
        const tagNames = Object.keys(allTags)
            .map((tag) => tag.replace("#", ""))
            .filter((tag) => !["important", "urgent", "work", "personal"].includes(tag))
            .slice(0, 5); // Limit to 5 most common tags
        tagNames.forEach((tagName, index) => {
            options.push({
                id: `tag-existing-${index}`,
                label: `#${tagName}`,
                icon: "tag",
                description: t("Existing tag"),
                replacement: "",
                trigger: "#",
                action: (editor, cursor) => {
                    var _a;
                    // Update modal metadata instead of inserting text
                    const editorEl = (_a = editor.cm) === null || _a === void 0 ? void 0 : _a.dom;
                    const modalEl = editorEl === null || editorEl === void 0 ? void 0 : editorEl.closest(".quick-capture-modal.minimal");
                    const modal = modalEl === null || modalEl === void 0 ? void 0 : modalEl.__minimalQuickCaptureModal;
                    if (modal) {
                        if (!modal.taskMetadata.tags)
                            modal.taskMetadata.tags = [];
                        if (!modal.taskMetadata.tags.includes(tagName)) {
                            modal.taskMetadata.tags.push(tagName);
                        }
                        modal.updateButtonState(modal.tagButton, true);
                    }
                    new Notice(t("Tagged with") + ` #${tagName}`);
                },
            });
        });
    }
    catch (error) {
        console.warn("Failed to load existing tags:", error);
    }
    return options;
}
/**
 * Create all suggest options for a given plugin instance
 */
export function createAllSuggestOptions(plugin) {
    return {
        priority: createPrioritySuggestOptions(),
        date: createDateSuggestOptions(),
        target: createTargetSuggestOptions(plugin),
        tag: createTagSuggestOptions(plugin),
    };
}
/**
 * Get suggest options by trigger character
 */
export function getSuggestOptionsByTrigger(trigger, plugin) {
    const allOptions = createAllSuggestOptions(plugin);
    switch (trigger) {
        case "!":
            return allOptions.priority;
        case "~":
            return allOptions.date;
        case "*":
            return allOptions.target;
        case "#":
            return allOptions.tag;
        default:
            return [];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3BlY2lhbENoYXJhY3RlclN1Z2dlc3RzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiU3BlY2lhbENoYXJhY3RlclN1Z2dlc3RzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBMEIsTUFBTSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBRzFELE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUUxQzs7R0FFRztBQUNILE1BQU0sVUFBVSw0QkFBNEI7SUFDM0MsT0FBTztRQUNOO1lBQ0MsRUFBRSxFQUFFLGtCQUFrQjtZQUN0QixLQUFLLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixDQUFDO1lBQzVCLElBQUksRUFBRSxVQUFVO1lBQ2hCLFdBQVcsRUFBRSxFQUFFO1lBQ2YsV0FBVyxFQUFFLEVBQUU7WUFDZixPQUFPLEVBQUUsR0FBRztZQUNaLE1BQU0sRUFBRSxDQUFDLE1BQWMsRUFBRSxNQUFzQixFQUFFLEVBQUU7O2dCQUNsRCxrREFBa0Q7Z0JBQ2xELE1BQU0sUUFBUSxHQUFHLE1BQUMsTUFBYyxDQUFDLEVBQUUsMENBQUUsR0FBa0IsQ0FBQztnQkFDeEQsTUFBTSxPQUFPLEdBQUcsUUFBUSxhQUFSLFFBQVEsdUJBQVIsUUFBUSxDQUFFLE9BQU8sQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO2dCQUNsRSxNQUFNLEtBQUssR0FBSSxPQUFlLGFBQWYsT0FBTyx1QkFBUCxPQUFPLENBQVUsMEJBQTBCLENBQUM7Z0JBQzNELElBQUksS0FBSyxFQUFFO29CQUNWLEtBQUssQ0FBQyxZQUFZLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQztvQkFDaEMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUM7aUJBQ3BEO2dCQUNELElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUM7WUFDdkMsQ0FBQztTQUNEO1FBQ0Q7WUFDQyxFQUFFLEVBQUUs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QUEwQixDQUN6QyxPQUFlLEVBQ2YsTUFBNkI7SUFFN0IsTUFBTSxVQUFVLEdBQUcsdUJBQXVCLENBQUMsTUFBTSxDQUFDLENBQUM7SUFFbkQsUUFBUSxPQUFPLEVBQUU7UUFDaEIsS0FBSyxHQUFHO1lBQ1AsT0FBTyxVQUFVLENBQUMsUUFBUSxDQUFDO1FBQzVCLEtBQUssR0FBRztZQUNQLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQztRQUN4QixLQUFLLEdBQUc7WUFDUCxPQUFPLFVBQVUsQ0FBQyxNQUFNLENBQUM7UUFDMUIsS0FBSyxHQUFHO1lBQ1AsT0FBTyxVQUFVLENBQUMsR0FBRyxDQUFDO1FBQ3ZCO1lBQ0MsT0FBTyxFQUFFLENBQUM7S0FDWDtBQUNGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBFZGl0b3IsIEVkaXRvclBvc2l0aW9uLCBOb3RpY2UgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5pbXBvcnQgeyBTdWdnZXN0T3B0aW9uIH0gZnJvbSBcIi4vVW5pdmVyc2FsRWRpdG9yU3VnZ2VzdFwiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5cclxuLyoqXHJcbiAqIFByaW9yaXR5IHN1Z2dlc3Qgb3B0aW9ucyBiYXNlZCBvbiBleGlzdGluZyBwcmlvcml0eSBzeXN0ZW1cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQcmlvcml0eVN1Z2dlc3RPcHRpb25zKCk6IFN1Z2dlc3RPcHRpb25bXSB7XHJcblx0cmV0dXJuIFtcclxuXHRcdHtcclxuXHRcdFx0aWQ6IFwicHJpb3JpdHktaGlnaGVzdFwiLFxyXG5cdFx0XHRsYWJlbDogdChcIkhpZ2hlc3QgUHJpb3JpdHlcIiksXHJcblx0XHRcdGljb246IFwiYXJyb3ctdXBcIixcclxuXHRcdFx0ZGVzY3JpcHRpb246IFwiXCIsXHJcblx0XHRcdHJlcGxhY2VtZW50OiBcIlwiLFxyXG5cdFx0XHR0cmlnZ2VyOiBcIiFcIixcclxuXHRcdFx0YWN0aW9uOiAoZWRpdG9yOiBFZGl0b3IsIGN1cnNvcjogRWRpdG9yUG9zaXRpb24pID0+IHtcclxuXHRcdFx0XHQvLyBVcGRhdGUgbW9kYWwgbWV0YWRhdGEgaW5zdGVhZCBvZiBpbnNlcnRpbmcgdGV4dFxyXG5cdFx0XHRcdGNvbnN0IGVkaXRvckVsID0gKGVkaXRvciBhcyBhbnkpLmNtPy5kb20gYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRcdFx0Y29uc3QgbW9kYWxFbCA9IGVkaXRvckVsPy5jbG9zZXN0KFwiLnF1aWNrLWNhcHR1cmUtbW9kYWwubWluaW1hbFwiKTtcclxuXHRcdFx0XHRjb25zdCBtb2RhbCA9IChtb2RhbEVsIGFzIGFueSk/Ll9fbWluaW1hbFF1aWNrQ2FwdHVyZU1vZGFsO1xyXG5cdFx0XHRcdGlmIChtb2RhbCkge1xyXG5cdFx0XHRcdFx0bW9kYWwudGFza01ldGFkYXRhLnByaW9yaXR5ID0gNTtcclxuXHRcdFx0XHRcdG1vZGFsLnVwZGF0ZUJ1dHRvblN0YXRlKG1vZGFsLnByaW9yaXR5QnV0dG9uLCB0cnVlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0bmV3IE5vdGljZSh0KFwiSGlnaGVzdCBwcmlvcml0eSBzZXRcIikpO1xyXG5cdFx0XHR9LFxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aWQ6IFwicHJpb3JpdHktaGlnaFwiLFxyXG5cdFx0XHRsYWJlbDogdChcIkhpZ2ggUHJpb3JpdHlcIiksXHJcblx0XHRcdGljb246IFwiYXJyb3ctdXBcIixcclxuXHRcdFx0ZGVzY3JpcHRpb246IFwiXCIsXHJcblx0XHRcdHJlcGxhY2VtZW50OiBcIlwiLFxyXG5cdFx0XHR0cmlnZ2VyOiBcIiFcIixcclxuXHRcdFx0YWN0aW9uOiAoZWRpdG9yOiBFZGl0b3IsIGN1cnNvcjogRWRpdG9yUG9zaXRpb24pID0+IHtcclxuXHRcdFx0XHQvLyBVcGRhdGUgbW9kYWwgbWV0YWRhdGEgaW5zdGVhZCBvZiBpbnNlcnRpbmcgdGV4dFxyXG5cdFx0XHRcdGNvbnN0IGVkaXRvckVsID0gKGVkaXRvciBhcyBhbnkpLmNtPy5kb20gYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRcdFx0Y29uc3QgbW9kYWxFbCA9IGVkaXRvckVsPy5jbG9zZXN0KFwiLnF1aWNrLWNhcHR1cmUtbW9kYWwubWluaW1hbFwiKTtcclxuXHRcdFx0XHRjb25zdCBtb2RhbCA9IChtb2RhbEVsIGFzIGFueSk/Ll9fbWluaW1hbFF1aWNrQ2FwdHVyZU1vZGFsO1xyXG5cdFx0XHRcdGlmIChtb2RhbCkge1xyXG5cdFx0XHRcdFx0bW9kYWwudGFza01ldGFkYXRhLnByaW9yaXR5ID0gNDtcclxuXHRcdFx0XHRcdG1vZGFsLnVwZGF0ZUJ1dHRvblN0YXRlKG1vZGFsLnByaW9yaXR5QnV0dG9uLCB0cnVlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0bmV3IE5vdGljZSh0KFwiSGlnaCBwcmlvcml0eSBzZXRcIikpO1xyXG5cdFx0XHR9LFxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aWQ6IFwicHJpb3JpdHktbWVkaXVtXCIsXHJcblx0XHRcdGxhYmVsOiB0KFwiTWVkaXVtIFByaW9yaXR5XCIpLFxyXG5cdFx0XHRpY29uOiBcIm1pbnVzXCIsXHJcblx0XHRcdGRlc2NyaXB0aW9uOiBcIlwiLFxyXG5cdFx0XHRyZXBsYWNlbWVudDogXCJcIixcclxuXHRcdFx0dHJpZ2dlcjogXCIhXCIsXHJcblx0XHRcdGFjdGlvbjogKGVkaXRvcjogRWRpdG9yLCBjdXJzb3I6IEVkaXRvclBvc2l0aW9uKSA9PiB7XHJcblx0XHRcdFx0Ly8gVXBkYXRlIG1vZGFsIG1ldGFkYXRhIGluc3RlYWQgb2YgaW5zZXJ0aW5nIHRleHRcclxuXHRcdFx0XHRjb25zdCBlZGl0b3JFbCA9IChlZGl0b3IgYXMgYW55KS5jbT8uZG9tIGFzIEhUTUxFbGVtZW50O1xyXG5cdFx0XHRcdGNvbnN0IG1vZGFsRWwgPSBlZGl0b3JFbD8uY2xvc2VzdChcIi5xdWljay1jYXB0dXJlLW1vZGFsLm1pbmltYWxcIik7XHJcblx0XHRcdFx0Y29uc3QgbW9kYWwgPSAobW9kYWxFbCBhcyBhbnkpPy5fX21pbmltYWxRdWlja0NhcHR1cmVNb2RhbDtcclxuXHRcdFx0XHRpZiAobW9kYWwpIHtcclxuXHRcdFx0XHRcdG1vZGFsLnRhc2tNZXRhZGF0YS5wcmlvcml0eSA9IDM7XHJcblx0XHRcdFx0XHRtb2RhbC51cGRhdGVCdXR0b25TdGF0ZShtb2RhbC5wcmlvcml0eUJ1dHRvbiwgdHJ1ZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdG5ldyBOb3RpY2UodChcIk1lZGl1bSBwcmlvcml0eSBzZXRcIikpO1xyXG5cdFx0XHR9LFxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aWQ6IFwicHJpb3JpdHktbG93XCIsXHJcblx0XHRcdGxhYmVsOiB0KFwiTG93IFByaW9yaXR5XCIpLFxyXG5cdFx0XHRpY29uOiBcImFycm93LWRvd25cIixcclxuXHRcdFx0ZGVzY3JpcHRpb246IFwiXCIsXHJcblx0XHRcdHJlcGxhY2VtZW50OiBcIlwiLFxyXG5cdFx0XHR0cmlnZ2VyOiBcIiFcIixcclxuXHRcdFx0YWN0aW9uOiAoZWRpdG9yOiBFZGl0b3IsIGN1cnNvcjogRWRpdG9yUG9zaXRpb24pID0+IHtcclxuXHRcdFx0XHQvLyBVcGRhdGUgbW9kYWwgbWV0YWRhdGEgaW5zdGVhZCBvZiBpbnNlcnRpbmcgdGV4dFxyXG5cdFx0XHRcdGNvbnN0IGVkaXRvckVsID0gKGVkaXRvciBhcyBhbnkpLmNtPy5kb20gYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRcdFx0Y29uc3QgbW9kYWxFbCA9IGVkaXRvckVsPy5jbG9zZXN0KFwiLnF1aWNrLWNhcHR1cmUtbW9kYWwubWluaW1hbFwiKTtcclxuXHRcdFx0XHRjb25zdCBtb2RhbCA9IChtb2RhbEVsIGFzIGFueSk/Ll9fbWluaW1hbFF1aWNrQ2FwdHVyZU1vZGFsO1xyXG5cdFx0XHRcdGlmIChtb2RhbCkge1xyXG5cdFx0XHRcdFx0bW9kYWwudGFza01ldGFkYXRhLnByaW9yaXR5ID0gMjtcclxuXHRcdFx0XHRcdG1vZGFsLnVwZGF0ZUJ1dHRvblN0YXRlKG1vZGFsLnByaW9yaXR5QnV0dG9uLCB0cnVlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0bmV3IE5vdGljZSh0KFwiTG93IHByaW9yaXR5IHNldFwiKSk7XHJcblx0XHRcdH0sXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRpZDogXCJwcmlvcml0eS1sb3dlc3RcIixcclxuXHRcdFx0bGFiZWw6IHQoXCJMb3dlc3QgUHJpb3JpdHlcIiksXHJcblx0XHRcdGljb246IFwiYXJyb3ctZG93blwiLFxyXG5cdFx0XHRkZXNjcmlwdGlvbjogXCJcIixcclxuXHRcdFx0cmVwbGFjZW1lbnQ6IFwiXCIsXHJcblx0XHRcdHRyaWdnZXI6IFwiIVwiLFxyXG5cdFx0XHRhY3Rpb246IChlZGl0b3I6IEVkaXRvciwgY3Vyc29yOiBFZGl0b3JQb3NpdGlvbikgPT4ge1xyXG5cdFx0XHRcdC8vIFVwZGF0ZSBtb2RhbCBtZXRhZGF0YSBpbnN0ZWFkIG9mIGluc2VydGluZyB0ZXh0XHJcblx0XHRcdFx0Y29uc3QgZWRpdG9yRWwgPSAoZWRpdG9yIGFzIGFueSkuY20/LmRvbSBhcyBIVE1MRWxlbWVudDtcclxuXHRcdFx0XHRjb25zdCBtb2RhbEVsID0gZWRpdG9yRWw/LmNsb3Nlc3QoXCIucXVpY2stY2FwdHVyZS1tb2RhbC5taW5pbWFsXCIpO1xyXG5cdFx0XHRcdGNvbnN0IG1vZGFsID0gKG1vZGFsRWwgYXMgYW55KT8uX19taW5pbWFsUXVpY2tDYXB0dXJlTW9kYWw7XHJcblx0XHRcdFx0aWYgKG1vZGFsKSB7XHJcblx0XHRcdFx0XHRtb2RhbC50YXNrTWV0YWRhdGEucHJpb3JpdHkgPSAxO1xyXG5cdFx0XHRcdFx0bW9kYWwudXBkYXRlQnV0dG9uU3RhdGUobW9kYWwucHJpb3JpdHlCdXR0b24sIHRydWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRuZXcgTm90aWNlKHQoXCJMb3dlc3QgcHJpb3JpdHkgc2V0XCIpKTtcclxuXHRcdFx0fSxcclxuXHRcdH0sXHJcblx0XTtcclxufVxyXG5cclxuLyoqXHJcbiAqIERhdGUgc3VnZ2VzdCBvcHRpb25zIGZvciBjb21tb24gZGF0ZSBwYXR0ZXJuc1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZURhdGVTdWdnZXN0T3B0aW9ucygpOiBTdWdnZXN0T3B0aW9uW10ge1xyXG5cdGNvbnN0IHRvZGF5ID0gbmV3IERhdGUoKTtcclxuXHRjb25zdCB0b21vcnJvdyA9IG5ldyBEYXRlKHRvZGF5KTtcclxuXHR0b21vcnJvdy5zZXREYXRlKHRvbW9ycm93LmdldERhdGUoKSArIDEpO1xyXG5cclxuXHRjb25zdCBmb3JtYXREYXRlID0gKGRhdGU6IERhdGUpID0+IHtcclxuXHRcdHJldHVybiBkYXRlLnRvSVNPU3RyaW5nKCkuc3BsaXQoXCJUXCIpWzBdO1xyXG5cdH07XHJcblxyXG5cdHJldHVybiBbXHJcblx0XHR7XHJcblx0XHRcdGlkOiBcImRhdGUtdG9kYXlcIixcclxuXHRcdFx0bGFiZWw6IHQoXCJUb2RheVwiKSxcclxuXHRcdFx0aWNvbjogXCJjYWxlbmRhci1kYXlzXCIsXHJcblx0XHRcdGRlc2NyaXB0aW9uOiB0KFwiU2V0IGR1ZSBkYXRlIHRvIHRvZGF5XCIpLFxyXG5cdFx0XHRyZXBsYWNlbWVudDogXCJcIixcclxuXHRcdFx0dHJpZ2dlcjogXCJ+XCIsXHJcblx0XHRcdGFjdGlvbjogKGVkaXRvcjogRWRpdG9yLCBjdXJzb3I6IEVkaXRvclBvc2l0aW9uKSA9PiB7XHJcblx0XHRcdFx0Ly8gVXBkYXRlIG1vZGFsIG1ldGFkYXRhIGluc3RlYWQgb2YgaW5zZXJ0aW5nIHRleHRcclxuXHRcdFx0XHRjb25zdCBlZGl0b3JFbCA9IChlZGl0b3IgYXMgYW55KS5jbT8uZG9tIGFzIEhUTUxFbGVtZW50O1xyXG5cdFx0XHRcdGNvbnN0IG1vZGFsRWwgPSBlZGl0b3JFbD8uY2xvc2VzdChcIi5xdWljay1jYXB0dXJlLW1vZGFsLm1pbmltYWxcIik7XHJcblx0XHRcdFx0Y29uc3QgbW9kYWwgPSAobW9kYWxFbCBhcyBhbnkpPy5fX21pbmltYWxRdWlja0NhcHR1cmVNb2RhbDtcclxuXHRcdFx0XHRpZiAobW9kYWwpIHtcclxuXHRcdFx0XHRcdG1vZGFsLnRhc2tNZXRhZGF0YS5kdWVEYXRlID0gdG9kYXk7XHJcblx0XHRcdFx0XHRtb2RhbC51cGRhdGVCdXR0b25TdGF0ZShtb2RhbC5kYXRlQnV0dG9uLCB0cnVlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0bmV3IE5vdGljZSh0KFwiRHVlIGRhdGUgc2V0IHRvIHRvZGF5XCIpKTtcclxuXHRcdFx0fSxcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGlkOiBcImRhdGUtdG9tb3Jyb3dcIixcclxuXHRcdFx0bGFiZWw6IHQoXCJUb21vcnJvd1wiKSxcclxuXHRcdFx0aWNvbjogXCJjYWxlbmRhci1wbHVzXCIsXHJcblx0XHRcdGRlc2NyaXB0aW9uOiB0KFwiU2V0IGR1ZSBkYXRlIHRvIHRvbW9ycm93XCIpLFxyXG5cdFx0XHRyZXBsYWNlbWVudDogXCJcIixcclxuXHRcdFx0dHJpZ2dlcjogXCJ+XCIsXHJcblx0XHRcdGFjdGlvbjogKGVkaXRvcjogRWRpdG9yLCBjdXJzb3I6IEVkaXRvclBvc2l0aW9uKSA9PiB7XHJcblx0XHRcdFx0Ly8gVXBkYXRlIG1vZGFsIG1ldGFkYXRhIGluc3RlYWQgb2YgaW5zZXJ0aW5nIHRleHRcclxuXHRcdFx0XHRjb25zdCBlZGl0b3JFbCA9IChlZGl0b3IgYXMgYW55KS5jbT8uZG9tIGFzIEhUTUxFbGVtZW50O1xyXG5cdFx0XHRcdGNvbnN0IG1vZGFsRWwgPSBlZGl0b3JFbD8uY2xvc2VzdChcIi5xdWljay1jYXB0dXJlLW1vZGFsLm1pbmltYWxcIik7XHJcblx0XHRcdFx0Y29uc3QgbW9kYWwgPSAobW9kYWxFbCBhcyBhbnkpPy5fX21pbmltYWxRdWlja0NhcHR1cmVNb2RhbDtcclxuXHRcdFx0XHRpZiAobW9kYWwpIHtcclxuXHRcdFx0XHRcdG1vZGFsLnRhc2tNZXRhZGF0YS5kdWVEYXRlID0gdG9tb3Jyb3c7XHJcblx0XHRcdFx0XHRtb2RhbC51cGRhdGVCdXR0b25TdGF0ZShtb2RhbC5kYXRlQnV0dG9uLCB0cnVlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0bmV3IE5vdGljZSh0KFwiRHVlIGRhdGUgc2V0IHRvIHRvbW9ycm93XCIpKTtcclxuXHRcdFx0fSxcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGlkOiBcImRhdGUtcGlja2VyXCIsXHJcblx0XHRcdGxhYmVsOiB0KFwiUGljayBEYXRlXCIpLFxyXG5cdFx0XHRpY29uOiBcImNhbGVuZGFyXCIsXHJcblx0XHRcdGRlc2NyaXB0aW9uOiB0KFwiT3BlbiBkYXRlIHBpY2tlclwiKSxcclxuXHRcdFx0cmVwbGFjZW1lbnQ6IFwiXCIsXHJcblx0XHRcdHRyaWdnZXI6IFwiflwiLFxyXG5cdFx0XHRhY3Rpb246IChlZGl0b3I6IEVkaXRvciwgY3Vyc29yOiBFZGl0b3JQb3NpdGlvbikgPT4ge1xyXG5cdFx0XHRcdC8vIFRyaWdnZXIgdGhlIGRhdGUgcGlja2VyIG1vZGFsXHJcblx0XHRcdFx0Y29uc3QgZWRpdG9yRWwgPSAoZWRpdG9yIGFzIGFueSkuY20/LmRvbSBhcyBIVE1MRWxlbWVudDtcclxuXHRcdFx0XHRjb25zdCBtb2RhbEVsID0gZWRpdG9yRWw/LmNsb3Nlc3QoXCIucXVpY2stY2FwdHVyZS1tb2RhbC5taW5pbWFsXCIpO1xyXG5cdFx0XHRcdGNvbnN0IG1vZGFsID0gKG1vZGFsRWwgYXMgYW55KT8uX19taW5pbWFsUXVpY2tDYXB0dXJlTW9kYWw7XHJcblx0XHRcdFx0aWYgKG1vZGFsKSB7XHJcblx0XHRcdFx0XHRtb2RhbC5zaG93RGF0ZVBpY2tlcigpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSxcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGlkOiBcImRhdGUtc2NoZWR1bGVkXCIsXHJcblx0XHRcdGxhYmVsOiB0KFwiU2NoZWR1bGVkIERhdGVcIiksXHJcblx0XHRcdGljb246IFwiY2FsZW5kYXItY2xvY2tcIixcclxuXHRcdFx0ZGVzY3JpcHRpb246IHQoXCJTZXQgc2NoZWR1bGVkIGRhdGVcIiksXHJcblx0XHRcdHJlcGxhY2VtZW50OiBcIlwiLFxyXG5cdFx0XHR0cmlnZ2VyOiBcIn5cIixcclxuXHRcdFx0YWN0aW9uOiAoZWRpdG9yOiBFZGl0b3IsIGN1cnNvcjogRWRpdG9yUG9zaXRpb24pID0+IHtcclxuXHRcdFx0XHQvLyBVcGRhdGUgbW9kYWwgbWV0YWRhdGEgZm9yIHNjaGVkdWxlZCBkYXRlXHJcblx0XHRcdFx0Y29uc3QgZWRpdG9yRWwgPSAoZWRpdG9yIGFzIGFueSkuY20/LmRvbSBhcyBIVE1MRWxlbWVudDtcclxuXHRcdFx0XHRjb25zdCBtb2RhbEVsID0gZWRpdG9yRWw/LmNsb3Nlc3QoXCIucXVpY2stY2FwdHVyZS1tb2RhbC5taW5pbWFsXCIpO1xyXG5cdFx0XHRcdGNvbnN0IG1vZGFsID0gKG1vZGFsRWwgYXMgYW55KT8uX19taW5pbWFsUXVpY2tDYXB0dXJlTW9kYWw7XHJcblx0XHRcdFx0aWYgKG1vZGFsKSB7XHJcblx0XHRcdFx0XHRtb2RhbC50YXNrTWV0YWRhdGEuc2NoZWR1bGVkRGF0ZSA9IHRvZGF5O1xyXG5cdFx0XHRcdFx0bW9kYWwudXBkYXRlQnV0dG9uU3RhdGUobW9kYWwuZGF0ZUJ1dHRvbiwgdHJ1ZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdG5ldyBOb3RpY2UodChcIlNjaGVkdWxlZCBkYXRlIHNldFwiKSk7XHJcblx0XHRcdH0sXHJcblx0XHR9LFxyXG5cdF07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBUYXJnZXQgbG9jYXRpb24gc3VnZ2VzdCBvcHRpb25zXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVGFyZ2V0U3VnZ2VzdE9wdGlvbnMoXHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW5cclxuKTogU3VnZ2VzdE9wdGlvbltdIHtcclxuXHRjb25zdCBvcHRpb25zOiBTdWdnZXN0T3B0aW9uW10gPSBbXHJcblx0XHR7XHJcblx0XHRcdGlkOiBcInRhcmdldC1pbmJveFwiLFxyXG5cdFx0XHRsYWJlbDogdChcIkluYm94XCIpLFxyXG5cdFx0XHRpY29uOiBcImluYm94XCIsXHJcblx0XHRcdGRlc2NyaXB0aW9uOiB0KFwiU2F2ZSB0byBpbmJveFwiKSxcclxuXHRcdFx0cmVwbGFjZW1lbnQ6IFwiXCIsXHJcblx0XHRcdHRyaWdnZXI6IFwiKlwiLFxyXG5cdFx0XHRhY3Rpb246IChlZGl0b3I6IEVkaXRvciwgY3Vyc29yOiBFZGl0b3JQb3NpdGlvbikgPT4ge1xyXG5cdFx0XHRcdC8vIFVwZGF0ZSBtb2RhbCBtZXRhZGF0YSBpbnN0ZWFkIG9mIGluc2VydGluZyB0ZXh0XHJcblx0XHRcdFx0Y29uc3QgZWRpdG9yRWwgPSAoZWRpdG9yIGFzIGFueSkuY20/LmRvbSBhcyBIVE1MRWxlbWVudDtcclxuXHRcdFx0XHRjb25zdCBtb2RhbEVsID0gZWRpdG9yRWw/LmNsb3Nlc3QoXCIucXVpY2stY2FwdHVyZS1tb2RhbC5taW5pbWFsXCIpO1xyXG5cdFx0XHRcdGNvbnN0IG1vZGFsID0gKG1vZGFsRWwgYXMgYW55KT8uX19taW5pbWFsUXVpY2tDYXB0dXJlTW9kYWw7XHJcblx0XHRcdFx0aWYgKG1vZGFsKSB7XHJcblx0XHRcdFx0XHRtb2RhbC50YXNrTWV0YWRhdGEubG9jYXRpb24gPSBcImZpeGVkXCI7XHJcblx0XHRcdFx0XHRtb2RhbC50YXNrTWV0YWRhdGEudGFyZ2V0RmlsZSA9IHBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmUudGFyZ2V0RmlsZTtcclxuXHRcdFx0XHRcdG1vZGFsLnVwZGF0ZUJ1dHRvblN0YXRlKG1vZGFsLmxvY2F0aW9uQnV0dG9uLCB0cnVlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0bmV3IE5vdGljZSh0KFwiVGFyZ2V0IHNldCB0byBJbmJveFwiKSk7XHJcblx0XHRcdH0sXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRpZDogXCJ0YXJnZXQtZGFpbHlcIixcclxuXHRcdFx0bGFiZWw6IHQoXCJEYWlseSBOb3RlXCIpLFxyXG5cdFx0XHRpY29uOiBcImNhbGVuZGFyLWRheXNcIixcclxuXHRcdFx0ZGVzY3JpcHRpb246IHQoXCJTYXZlIHRvIHRvZGF5J3MgZGFpbHkgbm90ZVwiKSxcclxuXHRcdFx0cmVwbGFjZW1lbnQ6IFwiXCIsXHJcblx0XHRcdHRyaWdnZXI6IFwiKlwiLFxyXG5cdFx0XHRhY3Rpb246IChlZGl0b3I6IEVkaXRvciwgY3Vyc29yOiBFZGl0b3JQb3NpdGlvbikgPT4ge1xyXG5cdFx0XHRcdC8vIFVwZGF0ZSBtb2RhbCBtZXRhZGF0YSBpbnN0ZWFkIG9mIGluc2VydGluZyB0ZXh0XHJcblx0XHRcdFx0Y29uc3QgZWRpdG9yRWwgPSAoZWRpdG9yIGFzIGFueSkuY20/LmRvbSBhcyBIVE1MRWxlbWVudDtcclxuXHRcdFx0XHRjb25zdCBtb2RhbEVsID0gZWRpdG9yRWw/LmNsb3Nlc3QoXCIucXVpY2stY2FwdHVyZS1tb2RhbC5taW5pbWFsXCIpO1xyXG5cdFx0XHRcdGNvbnN0IG1vZGFsID0gKG1vZGFsRWwgYXMgYW55KT8uX19taW5pbWFsUXVpY2tDYXB0dXJlTW9kYWw7XHJcblx0XHRcdFx0aWYgKG1vZGFsKSB7XHJcblx0XHRcdFx0XHRtb2RhbC50YXNrTWV0YWRhdGEubG9jYXRpb24gPSBcImRhaWx5XCI7XHJcblx0XHRcdFx0XHRtb2RhbC51cGRhdGVCdXR0b25TdGF0ZShtb2RhbC5sb2NhdGlvbkJ1dHRvbiwgdHJ1ZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdG5ldyBOb3RpY2UodChcIlRhcmdldCBzZXQgdG8gRGFpbHkgTm90ZVwiKSk7XHJcblx0XHRcdH0sXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRpZDogXCJ0YXJnZXQtY3VycmVudFwiLFxyXG5cdFx0XHRsYWJlbDogdChcIkN1cnJlbnQgRmlsZVwiKSxcclxuXHRcdFx0aWNvbjogXCJmaWxlLXRleHRcIixcclxuXHRcdFx0ZGVzY3JpcHRpb246IHQoXCJTYXZlIHRvIGN1cnJlbnQgZmlsZVwiKSxcclxuXHRcdFx0cmVwbGFjZW1lbnQ6IFwiXCIsXHJcblx0XHRcdHRyaWdnZXI6IFwiKlwiLFxyXG5cdFx0XHRhY3Rpb246IChlZGl0b3I6IEVkaXRvciwgY3Vyc29yOiBFZGl0b3JQb3NpdGlvbikgPT4ge1xyXG5cdFx0XHRcdC8vIFVwZGF0ZSBtb2RhbCBtZXRhZGF0YSBpbnN0ZWFkIG9mIGluc2VydGluZyB0ZXh0XHJcblx0XHRcdFx0Y29uc3QgZWRpdG9yRWwgPSAoZWRpdG9yIGFzIGFueSkuY20/LmRvbSBhcyBIVE1MRWxlbWVudDtcclxuXHRcdFx0XHRjb25zdCBtb2RhbEVsID0gZWRpdG9yRWw/LmNsb3Nlc3QoXCIucXVpY2stY2FwdHVyZS1tb2RhbC5taW5pbWFsXCIpO1xyXG5cdFx0XHRcdGNvbnN0IG1vZGFsID0gKG1vZGFsRWwgYXMgYW55KT8uX19taW5pbWFsUXVpY2tDYXB0dXJlTW9kYWw7XHJcblx0XHRcdFx0aWYgKG1vZGFsKSB7XHJcblx0XHRcdFx0XHRtb2RhbC50YXNrTWV0YWRhdGEubG9jYXRpb24gPSBcImN1cnJlbnRcIjtcclxuXHRcdFx0XHRcdG1vZGFsLnVwZGF0ZUJ1dHRvblN0YXRlKG1vZGFsLmxvY2F0aW9uQnV0dG9uLCB0cnVlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0bmV3IE5vdGljZSh0KFwiVGFyZ2V0IHNldCB0byBDdXJyZW50IEZpbGVcIikpO1xyXG5cdFx0XHR9LFxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aWQ6IFwidGFyZ2V0LXBpY2tlclwiLFxyXG5cdFx0XHRsYWJlbDogdChcIkNob29zZSBGaWxlXCIpLFxyXG5cdFx0XHRpY29uOiBcImZvbGRlci1vcGVuXCIsXHJcblx0XHRcdGRlc2NyaXB0aW9uOiB0KFwiT3BlbiBmaWxlIHBpY2tlclwiKSxcclxuXHRcdFx0cmVwbGFjZW1lbnQ6IFwiXCIsXHJcblx0XHRcdHRyaWdnZXI6IFwiKlwiLFxyXG5cdFx0XHRhY3Rpb246IChlZGl0b3I6IEVkaXRvciwgY3Vyc29yOiBFZGl0b3JQb3NpdGlvbikgPT4ge1xyXG5cdFx0XHRcdC8vIFRyaWdnZXIgdGhlIGxvY2F0aW9uIG1lbnVcclxuXHRcdFx0XHRjb25zdCBlZGl0b3JFbCA9IChlZGl0b3IgYXMgYW55KS5jbT8uZG9tIGFzIEhUTUxFbGVtZW50O1xyXG5cdFx0XHRcdGNvbnN0IG1vZGFsRWwgPSBlZGl0b3JFbD8uY2xvc2VzdChcIi5xdWljay1jYXB0dXJlLW1vZGFsLm1pbmltYWxcIik7XHJcblx0XHRcdFx0Y29uc3QgbW9kYWwgPSAobW9kYWxFbCBhcyBhbnkpPy5fX21pbmltYWxRdWlja0NhcHR1cmVNb2RhbDtcclxuXHRcdFx0XHRpZiAobW9kYWwpIHtcclxuXHRcdFx0XHRcdG1vZGFsLnNob3dMb2NhdGlvbk1lbnUoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sXHJcblx0XHR9LFxyXG5cdF07XHJcblxyXG5cdC8vIEFkZCByZWNlbnQgZmlsZXMgaWYgYXZhaWxhYmxlXHJcblx0Y29uc3QgcmVjZW50RmlsZXMgPSBwbHVnaW4uYXBwLndvcmtzcGFjZS5nZXRMYXN0T3BlbkZpbGVzKCk7XHJcblx0cmVjZW50RmlsZXMuc2xpY2UoMCwgMykuZm9yRWFjaCgoZmlsZVBhdGgsIGluZGV4KSA9PiB7XHJcblx0XHRjb25zdCBmaWxlTmFtZSA9XHJcblx0XHRcdGZpbGVQYXRoLnNwbGl0KFwiL1wiKS5wb3AoKT8ucmVwbGFjZShcIi5tZFwiLCBcIlwiKSB8fCBmaWxlUGF0aDtcclxuXHRcdG9wdGlvbnMucHVzaCh7XHJcblx0XHRcdGlkOiBgdGFyZ2V0LXJlY2VudC0ke2luZGV4fWAsXHJcblx0XHRcdGxhYmVsOiBmaWxlTmFtZSxcclxuXHRcdFx0aWNvbjogXCJmaWxlXCIsXHJcblx0XHRcdGRlc2NyaXB0aW9uOiB0KFwiU2F2ZSB0byByZWNlbnQgZmlsZVwiKSxcclxuXHRcdFx0cmVwbGFjZW1lbnQ6IFwiXCIsXHJcblx0XHRcdHRyaWdnZXI6IFwiKlwiLFxyXG5cdFx0XHRhY3Rpb246IChlZGl0b3I6IEVkaXRvciwgY3Vyc29yOiBFZGl0b3JQb3NpdGlvbikgPT4ge1xyXG5cdFx0XHRcdC8vIFVwZGF0ZSBtb2RhbCBtZXRhZGF0YSBpbnN0ZWFkIG9mIGluc2VydGluZyB0ZXh0XHJcblx0XHRcdFx0Y29uc3QgZWRpdG9yRWwgPSAoZWRpdG9yIGFzIGFueSkuY20/LmRvbSBhcyBIVE1MRWxlbWVudDtcclxuXHRcdFx0XHRjb25zdCBtb2RhbEVsID0gZWRpdG9yRWw/LmNsb3Nlc3QoXCIucXVpY2stY2FwdHVyZS1tb2RhbC5taW5pbWFsXCIpO1xyXG5cdFx0XHRcdGNvbnN0IG1vZGFsID0gKG1vZGFsRWwgYXMgYW55KT8uX19taW5pbWFsUXVpY2tDYXB0dXJlTW9kYWw7XHJcblx0XHRcdFx0aWYgKG1vZGFsKSB7XHJcblx0XHRcdFx0XHRtb2RhbC50YXNrTWV0YWRhdGEubG9jYXRpb24gPSBcImZpeGVkXCI7XHJcblx0XHRcdFx0XHRtb2RhbC50YXNrTWV0YWRhdGEudGFyZ2V0RmlsZSA9IGZpbGVQYXRoO1xyXG5cdFx0XHRcdFx0bW9kYWwudXBkYXRlQnV0dG9uU3RhdGUobW9kYWwubG9jYXRpb25CdXR0b24sIHRydWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRuZXcgTm90aWNlKHQoXCJUYXJnZXQgc2V0IHRvXCIpICsgYCAke2ZpbGVOYW1lfWApO1xyXG5cdFx0XHR9LFxyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdHJldHVybiBvcHRpb25zO1xyXG59XHJcblxyXG4vKipcclxuICogVGFnIHN1Z2dlc3Qgb3B0aW9uc1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVRhZ1N1Z2dlc3RPcHRpb25zKFxyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luXHJcbik6IFN1Z2dlc3RPcHRpb25bXSB7XHJcblx0Y29uc3Qgb3B0aW9uczogU3VnZ2VzdE9wdGlvbltdID0gW1xyXG5cdFx0e1xyXG5cdFx0XHRpZDogXCJ0YWctaW1wb3J0YW50XCIsXHJcblx0XHRcdGxhYmVsOiB0KFwiSW1wb3J0YW50XCIpLFxyXG5cdFx0XHRpY29uOiBcInN0YXJcIixcclxuXHRcdFx0ZGVzY3JpcHRpb246IHQoXCJNYXJrIGFzIGltcG9ydGFudFwiKSxcclxuXHRcdFx0cmVwbGFjZW1lbnQ6IFwiXCIsXHJcblx0XHRcdHRyaWdnZXI6IFwiI1wiLFxyXG5cdFx0XHRhY3Rpb246IChlZGl0b3I6IEVkaXRvciwgY3Vyc29yOiBFZGl0b3JQb3NpdGlvbikgPT4ge1xyXG5cdFx0XHRcdC8vIFVwZGF0ZSBtb2RhbCBtZXRhZGF0YSBpbnN0ZWFkIG9mIGluc2VydGluZyB0ZXh0XHJcblx0XHRcdFx0Y29uc3QgZWRpdG9yRWwgPSAoZWRpdG9yIGFzIGFueSkuY20/LmRvbSBhcyBIVE1MRWxlbWVudDtcclxuXHRcdFx0XHRjb25zdCBtb2RhbEVsID0gZWRpdG9yRWw/LmNsb3Nlc3QoXCIucXVpY2stY2FwdHVyZS1tb2RhbC5taW5pbWFsXCIpO1xyXG5cdFx0XHRcdGNvbnN0IG1vZGFsID0gKG1vZGFsRWwgYXMgYW55KT8uX19taW5pbWFsUXVpY2tDYXB0dXJlTW9kYWw7XHJcblx0XHRcdFx0aWYgKG1vZGFsKSB7XHJcblx0XHRcdFx0XHRpZiAoIW1vZGFsLnRhc2tNZXRhZGF0YS50YWdzKSBtb2RhbC50YXNrTWV0YWRhdGEudGFncyA9IFtdO1xyXG5cdFx0XHRcdFx0aWYgKCFtb2RhbC50YXNrTWV0YWRhdGEudGFncy5pbmNsdWRlcyhcImltcG9ydGFudFwiKSkge1xyXG5cdFx0XHRcdFx0XHRtb2RhbC50YXNrTWV0YWRhdGEudGFncy5wdXNoKFwiaW1wb3J0YW50XCIpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0bW9kYWwudXBkYXRlQnV0dG9uU3RhdGUobW9kYWwudGFnQnV0dG9uLCB0cnVlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0bmV3IE5vdGljZSh0KFwiVGFnZ2VkIGFzIGltcG9ydGFudFwiKSk7XHJcblx0XHRcdH0sXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRpZDogXCJ0YWctdXJnZW50XCIsXHJcblx0XHRcdGxhYmVsOiB0KFwiVXJnZW50XCIpLFxyXG5cdFx0XHRpY29uOiBcInphcFwiLFxyXG5cdFx0XHRkZXNjcmlwdGlvbjogdChcIk1hcmsgYXMgdXJnZW50XCIpLFxyXG5cdFx0XHRyZXBsYWNlbWVudDogXCJcIixcclxuXHRcdFx0dHJpZ2dlcjogXCIjXCIsXHJcblx0XHRcdGFjdGlvbjogKGVkaXRvcjogRWRpdG9yLCBjdXJzb3I6IEVkaXRvclBvc2l0aW9uKSA9PiB7XHJcblx0XHRcdFx0Ly8gVXBkYXRlIG1vZGFsIG1ldGFkYXRhIGluc3RlYWQgb2YgaW5zZXJ0aW5nIHRleHRcclxuXHRcdFx0XHRjb25zdCBlZGl0b3JFbCA9IChlZGl0b3IgYXMgYW55KS5jbT8uZG9tIGFzIEhUTUxFbGVtZW50O1xyXG5cdFx0XHRcdGNvbnN0IG1vZGFsRWwgPSBlZGl0b3JFbD8uY2xvc2VzdChcIi5xdWljay1jYXB0dXJlLW1vZGFsLm1pbmltYWxcIik7XHJcblx0XHRcdFx0Y29uc3QgbW9kYWwgPSAobW9kYWxFbCBhcyBhbnkpPy5fX21pbmltYWxRdWlja0NhcHR1cmVNb2RhbDtcclxuXHRcdFx0XHRpZiAobW9kYWwpIHtcclxuXHRcdFx0XHRcdGlmICghbW9kYWwudGFza01ldGFkYXRhLnRhZ3MpIG1vZGFsLnRhc2tNZXRhZGF0YS50YWdzID0gW107XHJcblx0XHRcdFx0XHRpZiAoIW1vZGFsLnRhc2tNZXRhZGF0YS50YWdzLmluY2x1ZGVzKFwidXJnZW50XCIpKSB7XHJcblx0XHRcdFx0XHRcdG1vZGFsLnRhc2tNZXRhZGF0YS50YWdzLnB1c2goXCJ1cmdlbnRcIik7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRtb2RhbC51cGRhdGVCdXR0b25TdGF0ZShtb2RhbC50YWdCdXR0b24sIHRydWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRuZXcgTm90aWNlKHQoXCJUYWdnZWQgYXMgdXJnZW50XCIpKTtcclxuXHRcdFx0fSxcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGlkOiBcInRhZy13b3JrXCIsXHJcblx0XHRcdGxhYmVsOiB0KFwiV29ya1wiKSxcclxuXHRcdFx0aWNvbjogXCJicmllZmNhc2VcIixcclxuXHRcdFx0ZGVzY3JpcHRpb246IHQoXCJXb3JrIHJlbGF0ZWQgdGFza1wiKSxcclxuXHRcdFx0cmVwbGFjZW1lbnQ6IFwiXCIsXHJcblx0XHRcdHRyaWdnZXI6IFwiI1wiLFxyXG5cdFx0XHRhY3Rpb246IChlZGl0b3I6IEVkaXRvciwgY3Vyc29yOiBFZGl0b3JQb3NpdGlvbikgPT4ge1xyXG5cdFx0XHRcdC8vIFVwZGF0ZSBtb2RhbCBtZXRhZGF0YSBpbnN0ZWFkIG9mIGluc2VydGluZyB0ZXh0XHJcblx0XHRcdFx0Y29uc3QgZWRpdG9yRWwgPSAoZWRpdG9yIGFzIGFueSkuY20/LmRvbSBhcyBIVE1MRWxlbWVudDtcclxuXHRcdFx0XHRjb25zdCBtb2RhbEVsID0gZWRpdG9yRWw/LmNsb3Nlc3QoXCIucXVpY2stY2FwdHVyZS1tb2RhbC5taW5pbWFsXCIpO1xyXG5cdFx0XHRcdGNvbnN0IG1vZGFsID0gKG1vZGFsRWwgYXMgYW55KT8uX19taW5pbWFsUXVpY2tDYXB0dXJlTW9kYWw7XHJcblx0XHRcdFx0aWYgKG1vZGFsKSB7XHJcblx0XHRcdFx0XHRpZiAoIW1vZGFsLnRhc2tNZXRhZGF0YS50YWdzKSBtb2RhbC50YXNrTWV0YWRhdGEudGFncyA9IFtdO1xyXG5cdFx0XHRcdFx0aWYgKCFtb2RhbC50YXNrTWV0YWRhdGEudGFncy5pbmNsdWRlcyhcIndvcmtcIikpIHtcclxuXHRcdFx0XHRcdFx0bW9kYWwudGFza01ldGFkYXRhLnRhZ3MucHVzaChcIndvcmtcIik7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRtb2RhbC51cGRhdGVCdXR0b25TdGF0ZShtb2RhbC50YWdCdXR0b24sIHRydWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRuZXcgTm90aWNlKHQoXCJUYWdnZWQgYXMgd29ya1wiKSk7XHJcblx0XHRcdH0sXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRpZDogXCJ0YWctcGVyc29uYWxcIixcclxuXHRcdFx0bGFiZWw6IHQoXCJQZXJzb25hbFwiKSxcclxuXHRcdFx0aWNvbjogXCJ1c2VyXCIsXHJcblx0XHRcdGRlc2NyaXB0aW9uOiB0KFwiUGVyc29uYWwgdGFza1wiKSxcclxuXHRcdFx0cmVwbGFjZW1lbnQ6IFwiXCIsXHJcblx0XHRcdHRyaWdnZXI6IFwiI1wiLFxyXG5cdFx0XHRhY3Rpb246IChlZGl0b3I6IEVkaXRvciwgY3Vyc29yOiBFZGl0b3JQb3NpdGlvbikgPT4ge1xyXG5cdFx0XHRcdC8vIFVwZGF0ZSBtb2RhbCBtZXRhZGF0YSBpbnN0ZWFkIG9mIGluc2VydGluZyB0ZXh0XHJcblx0XHRcdFx0Y29uc3QgZWRpdG9yRWwgPSAoZWRpdG9yIGFzIGFueSkuY20/LmRvbSBhcyBIVE1MRWxlbWVudDtcclxuXHRcdFx0XHRjb25zdCBtb2RhbEVsID0gZWRpdG9yRWw/LmNsb3Nlc3QoXCIucXVpY2stY2FwdHVyZS1tb2RhbC5taW5pbWFsXCIpO1xyXG5cdFx0XHRcdGNvbnN0IG1vZGFsID0gKG1vZGFsRWwgYXMgYW55KT8uX19taW5pbWFsUXVpY2tDYXB0dXJlTW9kYWw7XHJcblx0XHRcdFx0aWYgKG1vZGFsKSB7XHJcblx0XHRcdFx0XHRpZiAoIW1vZGFsLnRhc2tNZXRhZGF0YS50YWdzKSBtb2RhbC50YXNrTWV0YWRhdGEudGFncyA9IFtdO1xyXG5cdFx0XHRcdFx0aWYgKCFtb2RhbC50YXNrTWV0YWRhdGEudGFncy5pbmNsdWRlcyhcInBlcnNvbmFsXCIpKSB7XHJcblx0XHRcdFx0XHRcdG1vZGFsLnRhc2tNZXRhZGF0YS50YWdzLnB1c2goXCJwZXJzb25hbFwiKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdG1vZGFsLnVwZGF0ZUJ1dHRvblN0YXRlKG1vZGFsLnRhZ0J1dHRvbiwgdHJ1ZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdG5ldyBOb3RpY2UodChcIlRhZ2dlZCBhcyBwZXJzb25hbFwiKSk7XHJcblx0XHRcdH0sXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRpZDogXCJ0YWctcGlja2VyXCIsXHJcblx0XHRcdGxhYmVsOiB0KFwiQ2hvb3NlIFRhZ1wiKSxcclxuXHRcdFx0aWNvbjogXCJ0YWdcIixcclxuXHRcdFx0ZGVzY3JpcHRpb246IHQoXCJPcGVuIHRhZyBwaWNrZXJcIiksXHJcblx0XHRcdHJlcGxhY2VtZW50OiBcIlwiLFxyXG5cdFx0XHR0cmlnZ2VyOiBcIiNcIixcclxuXHRcdFx0YWN0aW9uOiAoZWRpdG9yOiBFZGl0b3IsIGN1cnNvcjogRWRpdG9yUG9zaXRpb24pID0+IHtcclxuXHRcdFx0XHQvLyBUcmlnZ2VyIHRoZSB0YWcgc2VsZWN0b3IgbW9kYWxcclxuXHRcdFx0XHRjb25zdCBlZGl0b3JFbCA9IChlZGl0b3IgYXMgYW55KS5jbT8uZG9tIGFzIEhUTUxFbGVtZW50O1xyXG5cdFx0XHRcdGNvbnN0IG1vZGFsRWwgPSBlZGl0b3JFbD8uY2xvc2VzdChcIi5xdWljay1jYXB0dXJlLW1vZGFsLm1pbmltYWxcIik7XHJcblx0XHRcdFx0Y29uc3QgbW9kYWwgPSAobW9kYWxFbCBhcyBhbnkpPy5fX21pbmltYWxRdWlja0NhcHR1cmVNb2RhbDtcclxuXHRcdFx0XHRpZiAobW9kYWwpIHtcclxuXHRcdFx0XHRcdG1vZGFsLnNob3dUYWdTZWxlY3RvcigpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSxcclxuXHRcdH0sXHJcblx0XTtcclxuXHJcblx0Ly8gQWRkIGV4aXN0aW5nIHRhZ3MgZnJvbSB2YXVsdFxyXG5cdHRyeSB7XHJcblx0XHRjb25zdCBhbGxUYWdzID0gcGx1Z2luLmFwcC5tZXRhZGF0YUNhY2hlLmdldFRhZ3MoKTtcclxuXHRcdGNvbnN0IHRhZ05hbWVzID0gT2JqZWN0LmtleXMoYWxsVGFncylcclxuXHRcdFx0Lm1hcCgodGFnKSA9PiB0YWcucmVwbGFjZShcIiNcIiwgXCJcIikpXHJcblx0XHRcdC5maWx0ZXIoXHJcblx0XHRcdFx0KHRhZykgPT5cclxuXHRcdFx0XHRcdCFbXCJpbXBvcnRhbnRcIiwgXCJ1cmdlbnRcIiwgXCJ3b3JrXCIsIFwicGVyc29uYWxcIl0uaW5jbHVkZXModGFnKVxyXG5cdFx0XHQpXHJcblx0XHRcdC5zbGljZSgwLCA1KTsgLy8gTGltaXQgdG8gNSBtb3N0IGNvbW1vbiB0YWdzXHJcblxyXG5cdFx0dGFnTmFtZXMuZm9yRWFjaCgodGFnTmFtZSwgaW5kZXgpID0+IHtcclxuXHRcdFx0b3B0aW9ucy5wdXNoKHtcclxuXHRcdFx0XHRpZDogYHRhZy1leGlzdGluZy0ke2luZGV4fWAsXHJcblx0XHRcdFx0bGFiZWw6IGAjJHt0YWdOYW1lfWAsXHJcblx0XHRcdFx0aWNvbjogXCJ0YWdcIixcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogdChcIkV4aXN0aW5nIHRhZ1wiKSxcclxuXHRcdFx0XHRyZXBsYWNlbWVudDogXCJcIixcclxuXHRcdFx0XHR0cmlnZ2VyOiBcIiNcIixcclxuXHRcdFx0XHRhY3Rpb246IChlZGl0b3I6IEVkaXRvciwgY3Vyc29yOiBFZGl0b3JQb3NpdGlvbikgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gVXBkYXRlIG1vZGFsIG1ldGFkYXRhIGluc3RlYWQgb2YgaW5zZXJ0aW5nIHRleHRcclxuXHRcdFx0XHRcdGNvbnN0IGVkaXRvckVsID0gKGVkaXRvciBhcyBhbnkpLmNtPy5kb20gYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRcdFx0XHRjb25zdCBtb2RhbEVsID0gZWRpdG9yRWw/LmNsb3Nlc3QoXCIucXVpY2stY2FwdHVyZS1tb2RhbC5taW5pbWFsXCIpO1xyXG5cdFx0XHRcdFx0Y29uc3QgbW9kYWwgPSAobW9kYWxFbCBhcyBhbnkpPy5fX21pbmltYWxRdWlja0NhcHR1cmVNb2RhbDtcclxuXHRcdFx0XHRcdGlmIChtb2RhbCkge1xyXG5cdFx0XHRcdFx0XHRpZiAoIW1vZGFsLnRhc2tNZXRhZGF0YS50YWdzKSBtb2RhbC50YXNrTWV0YWRhdGEudGFncyA9IFtdO1xyXG5cdFx0XHRcdFx0XHRpZiAoIW1vZGFsLnRhc2tNZXRhZGF0YS50YWdzLmluY2x1ZGVzKHRhZ05hbWUpKSB7XHJcblx0XHRcdFx0XHRcdFx0bW9kYWwudGFza01ldGFkYXRhLnRhZ3MucHVzaCh0YWdOYW1lKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRtb2RhbC51cGRhdGVCdXR0b25TdGF0ZShtb2RhbC50YWdCdXR0b24sIHRydWUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0bmV3IE5vdGljZSh0KFwiVGFnZ2VkIHdpdGhcIikgKyBgICMke3RhZ05hbWV9YCk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0Y29uc29sZS53YXJuKFwiRmFpbGVkIHRvIGxvYWQgZXhpc3RpbmcgdGFnczpcIiwgZXJyb3IpO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIG9wdGlvbnM7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgYWxsIHN1Z2dlc3Qgb3B0aW9ucyBmb3IgYSBnaXZlbiBwbHVnaW4gaW5zdGFuY2VcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVBbGxTdWdnZXN0T3B0aW9ucyhwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbik6IHtcclxuXHRwcmlvcml0eTogU3VnZ2VzdE9wdGlvbltdO1xyXG5cdGRhdGU6IFN1Z2dlc3RPcHRpb25bXTtcclxuXHR0YXJnZXQ6IFN1Z2dlc3RPcHRpb25bXTtcclxuXHR0YWc6IFN1Z2dlc3RPcHRpb25bXTtcclxufSB7XHJcblx0cmV0dXJuIHtcclxuXHRcdHByaW9yaXR5OiBjcmVhdGVQcmlvcml0eVN1Z2dlc3RPcHRpb25zKCksXHJcblx0XHRkYXRlOiBjcmVhdGVEYXRlU3VnZ2VzdE9wdGlvbnMoKSxcclxuXHRcdHRhcmdldDogY3JlYXRlVGFyZ2V0U3VnZ2VzdE9wdGlvbnMocGx1Z2luKSxcclxuXHRcdHRhZzogY3JlYXRlVGFnU3VnZ2VzdE9wdGlvbnMocGx1Z2luKSxcclxuXHR9O1xyXG59XHJcblxyXG4vKipcclxuICogR2V0IHN1Z2dlc3Qgb3B0aW9ucyBieSB0cmlnZ2VyIGNoYXJhY3RlclxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFN1Z2dlc3RPcHRpb25zQnlUcmlnZ2VyKFxyXG5cdHRyaWdnZXI6IHN0cmluZyxcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpblxyXG4pOiBTdWdnZXN0T3B0aW9uW10ge1xyXG5cdGNvbnN0IGFsbE9wdGlvbnMgPSBjcmVhdGVBbGxTdWdnZXN0T3B0aW9ucyhwbHVnaW4pO1xyXG5cclxuXHRzd2l0Y2ggKHRyaWdnZXIpIHtcclxuXHRcdGNhc2UgXCIhXCI6XHJcblx0XHRcdHJldHVybiBhbGxPcHRpb25zLnByaW9yaXR5O1xyXG5cdFx0Y2FzZSBcIn5cIjpcclxuXHRcdFx0cmV0dXJuIGFsbE9wdGlvbnMuZGF0ZTtcclxuXHRcdGNhc2UgXCIqXCI6XHJcblx0XHRcdHJldHVybiBhbGxPcHRpb25zLnRhcmdldDtcclxuXHRcdGNhc2UgXCIjXCI6XHJcblx0XHRcdHJldHVybiBhbGxPcHRpb25zLnRhZztcclxuXHRcdGRlZmF1bHQ6XHJcblx0XHRcdHJldHVybiBbXTtcclxuXHR9XHJcbn1cclxuIl19