import { Component, DropdownComponent, TextComponent, ToggleComponent, } from "obsidian";
import { OnCompletionActionType, } from "@/types/onCompletion";
import { t } from "@/translations/helper";
import { TaskIdSuggest, FileLocationSuggest, } from "./OnCompletionSuggesters";
import "@/styles/onCompletion.css";
/**
 * Component for configuring onCompletion actions with a user-friendly interface
 */
export class OnCompletionConfigurator extends Component {
    constructor(parentEl, plugin, options = {}) {
        super();
        this.plugin = plugin;
        this.options = options;
        this.currentConfig = null;
        this.currentRawValue = "";
        this.isInternalUpdate = false;
        this.lastActionType = null;
        this.isUserConfiguring = false;
        this.containerEl = parentEl.createDiv({
            cls: "oncompletion-configurator",
        });
        this.initializeUI();
        if (this.options.initialValue) {
            this.setValue(this.options.initialValue);
        }
    }
    initializeUI() {
        // Action type selection
        const actionTypeContainer = this.containerEl.createDiv({
            cls: "oncompletion-action-type",
        });
        actionTypeContainer.createDiv({
            cls: "oncompletion-label",
            text: t("Action Type"),
        });
        this.actionTypeDropdown = new DropdownComponent(actionTypeContainer);
        this.actionTypeDropdown.addOption("", t("Select action type..."));
        this.actionTypeDropdown.addOption(OnCompletionActionType.DELETE, t("Delete task"));
        this.actionTypeDropdown.addOption(OnCompletionActionType.KEEP, t("Keep task"));
        this.actionTypeDropdown.addOption(OnCompletionActionType.COMPLETE, t("Complete related tasks"));
        this.actionTypeDropdown.addOption(OnCompletionActionType.MOVE, t("Move task"));
        this.actionTypeDropdown.addOption(OnCompletionActionType.ARCHIVE, t("Archive task"));
        this.actionTypeDropdown.addOption(OnCompletionActionType.DUPLICATE, t("Duplicate task"));
        this.actionTypeDropdown.onChange((value) => {
            this.onActionTypeChange(value);
        });
        // Configuration container for action-specific options
        this.configContainer = this.containerEl.createDiv({
            cls: "oncompletion-config",
        });
    }
    onActionTypeChange(actionType) {
        this.isInternalUpdate = true;
        this.lastActionType = actionType;
        this.isUserConfiguring = false; // Reset user configuring state
        // Clear previous configuration
        this.configContainer.empty();
        this.currentConfig = null;
        if (!actionType) {
            this.updateValue();
            this.isInternalUpdate = false;
            return;
        }
        // Create base configuration
        switch (actionType) {
            case OnCompletionActionType.DELETE:
                this.currentConfig = { type: OnCompletionActionType.DELETE };
                break;
            case OnCompletionActionType.KEEP:
                this.currentConfig = { type: OnCompletionActionType.KEEP };
                break;
            case OnCompletionActionType.COMPLETE:
                this.createCompleteConfiguration();
                break;
            case OnCompletionActionType.MOVE:
                this.createMoveConfiguration();
                break;
            case OnCompletionActionType.ARCHIVE:
                this.createArchiveConfiguration();
                break;
            case OnCompletionActionType.DUPLICATE:
                this.createDuplicateConfiguration();
                break;
        }
        this.updateValue();
        this.isInternalUpdate = false;
    }
    /**
     * Initialize UI for action type without clearing existing configuration
     * Used during programmatic initialization to preserve parsed config data
     */
    initializeUIForActionType(actionType, existingConfig) {
        this.isInternalUpdate = true;
        // Clear previous UI but preserve configuration
        this.configContainer.empty();
        if (!actionType) {
            this.isInternalUpdate = false;
            return;
        }
        // Create UI and preserve existing configuration
        switch (actionType) {
            case OnCompletionActionType.DELETE:
                this.currentConfig = existingConfig || {
                    type: OnCompletionActionType.DELETE,
                };
                break;
            case OnCompletionActionType.KEEP:
                this.currentConfig = existingConfig || {
                    type: OnCompletionActionType.KEEP,
                };
                break;
            case OnCompletionActionType.COMPLETE:
                this.createCompleteConfiguration(existingConfig);
                break;
            case OnCompletionActionType.MOVE:
                this.createMoveConfiguration(existingConfig);
                break;
            case OnCompletionActionType.ARCHIVE:
                this.createArchiveConfiguration(existingConfig);
                break;
            case OnCompletionActionType.DUPLICATE:
                this.createDuplicateConfiguration(existingConfig);
                break;
        }
        this.isInternalUpdate = false;
    }
    createCompleteConfiguration(existingConfig) {
        // Use existing config if provided, otherwise create new one
        const completeConfig = existingConfig &&
            existingConfig.type === OnCompletionActionType.COMPLETE
            ? existingConfig
            : { type: OnCompletionActionType.COMPLETE, taskIds: [] };
        this.currentConfig = completeConfig;
        const taskIdsContainer = this.configContainer.createDiv({
            cls: "oncompletion-field",
        });
        taskIdsContainer.createDiv({
            cls: "oncompletion-label",
            text: t("Task IDs"),
        });
        this.taskIdsInput = new TextComponent(taskIdsContainer);
        this.taskIdsInput.setPlaceholder(t("Enter task IDs separated by commas"));
        // Set initial value if exists
        if (completeConfig.taskIds && completeConfig.taskIds.length > 0) {
            this.taskIdsInput.setValue(completeConfig.taskIds.join(", "));
        }
        this.taskIdsInput.onChange((value) => {
            if (this.currentConfig &&
                this.currentConfig.type === OnCompletionActionType.COMPLETE) {
                this.isUserConfiguring = true; // Mark as user configuring
                this.currentConfig.taskIds = value
                    .split(",")
                    .map((id) => id.trim())
                    .filter((id) => id);
                this.updateValue();
            }
        });
        // Add task ID suggester with safe initialization
        new TaskIdSuggest(this.plugin.app, this.taskIdsInput.inputEl, this.plugin, (taskId) => {
            // TaskIdSuggest already updates the input value and triggers input event
            // The TextComponent onChange handler will process the updated value
            // No need to manually set taskIds here to avoid data type conflicts
        });
        taskIdsContainer.createDiv({
            cls: "oncompletion-description",
            text: t("Comma-separated list of task IDs to complete when this task is completed"),
        });
    }
    createMoveConfiguration(existingConfig) {
        // Use existing config if provided, otherwise create new one
        const moveConfig = existingConfig &&
            existingConfig.type === OnCompletionActionType.MOVE
            ? existingConfig
            : { type: OnCompletionActionType.MOVE, targetFile: "" };
        this.currentConfig = moveConfig;
        // Target file input
        const targetFileContainer = this.configContainer.createDiv({
            cls: "oncompletion-field",
        });
        targetFileContainer.createDiv({
            cls: "oncompletion-label",
            text: t("Target File"),
        });
        this.targetFileInput = new TextComponent(targetFileContainer);
        this.targetFileInput.setPlaceholder(t("Path to target file"));
        // Set initial value if exists
        if (moveConfig.targetFile) {
            this.targetFileInput.setValue(moveConfig.targetFile);
        }
        this.targetFileInput.onChange((value) => {
            if (this.currentConfig &&
                this.currentConfig.type === OnCompletionActionType.MOVE) {
                this.isUserConfiguring = true; // Mark as user configuring
                this.currentConfig.targetFile = value;
                this.updateValue();
            }
        });
        // Add file location suggester with safe initialization
        new FileLocationSuggest(this.plugin.app, this.targetFileInput.inputEl, (file) => {
            // FileLocationSuggest already updates the input value and triggers input event
            // The TextComponent onChange handler will process the updated value
            // No need to manually set targetFile here to avoid data races
        });
        // Target section input (optional)
        const targetSectionContainer = this.configContainer.createDiv({
            cls: "oncompletion-field",
        });
        targetSectionContainer.createDiv({
            cls: "oncompletion-label",
            text: t("Target Section (Optional)"),
        });
        this.targetSectionInput = new TextComponent(targetSectionContainer);
        this.targetSectionInput.setPlaceholder(t("Section name in target file"));
        // Set initial value if exists
        if (moveConfig.targetSection) {
            this.targetSectionInput.setValue(moveConfig.targetSection);
        }
        this.targetSectionInput.onChange((value) => {
            if (this.currentConfig &&
                this.currentConfig.type === OnCompletionActionType.MOVE) {
                this.isUserConfiguring = true; // Mark as user configuring
                this.currentConfig.targetSection = value || undefined;
                this.updateValue();
            }
        });
    }
    createArchiveConfiguration(existingConfig) {
        // Use existing config if provided, otherwise create new one
        const archiveConfig = existingConfig &&
            existingConfig.type === OnCompletionActionType.ARCHIVE
            ? existingConfig
            : { type: OnCompletionActionType.ARCHIVE };
        this.currentConfig = archiveConfig;
        // Archive file input (optional)
        const archiveFileContainer = this.configContainer.createDiv({
            cls: "oncompletion-field",
        });
        archiveFileContainer.createDiv({
            cls: "oncompletion-label",
            text: t("Archive File (Optional)"),
        });
        this.archiveFileInput = new TextComponent(archiveFileContainer);
        this.archiveFileInput.setPlaceholder(t("Default: Archive/Completed Tasks.md"));
        // Set initial value if exists
        if (archiveConfig.archiveFile) {
            this.archiveFileInput.setValue(archiveConfig.archiveFile);
        }
        this.archiveFileInput.onChange((value) => {
            if (this.currentConfig &&
                this.currentConfig.type === OnCompletionActionType.ARCHIVE) {
                this.isUserConfiguring = true; // Mark as user configuring
                this.currentConfig.archiveFile = value || undefined;
                this.updateValue();
            }
        });
        // Add file location suggester with safe initialization
        new FileLocationSuggest(this.plugin.app, this.archiveFileInput.inputEl, (file) => {
            // FileLocationSuggest already updates the input value and triggers input event
            // The TextComponent onChange handler will process the updated value
            // No need to manually set archiveFile here to avoid data races
        });
        // Archive section input (optional)
        const archiveSectionContainer = this.configContainer.createDiv({
            cls: "oncompletion-field",
        });
        archiveSectionContainer.createDiv({
            cls: "oncompletion-label",
            text: t("Archive Section (Optional)"),
        });
        this.archiveSectionInput = new TextComponent(archiveSectionContainer);
        this.archiveSectionInput.setPlaceholder(t("Default: Completed Tasks"));
        // Set initial value if exists
        if (archiveConfig.archiveSection) {
            this.archiveSectionInput.setValue(archiveConfig.archiveSection);
        }
        this.archiveSectionInput.onChange((value) => {
            if (this.currentConfig &&
                this.currentConfig.type === OnCompletionActionType.ARCHIVE) {
                this.isUserConfiguring = true; // Mark as user configuring
                this.currentConfig.archiveSection = value || undefined;
                this.updateValue();
            }
        });
    }
    createDuplicateConfiguration(existingConfig) {
        // Use existing config if provided, otherwise create new one
        const duplicateConfig = existingConfig &&
            existingConfig.type === OnCompletionActionType.DUPLICATE
            ? existingConfig
            : { type: OnCompletionActionType.DUPLICATE };
        this.currentConfig = duplicateConfig;
        // Target file input (optional)
        const targetFileContainer = this.configContainer.createDiv({
            cls: "oncompletion-field",
        });
        targetFileContainer.createDiv({
            cls: "oncompletion-label",
            text: t("Target File (Optional)"),
        });
        this.targetFileInput = new TextComponent(targetFileContainer);
        this.targetFileInput.setPlaceholder(t("Default: same file"));
        // Set initial value if exists
        if (duplicateConfig.targetFile) {
            this.targetFileInput.setValue(duplicateConfig.targetFile);
        }
        this.targetFileInput.onChange((value) => {
            if (this.currentConfig &&
                this.currentConfig.type === OnCompletionActionType.DUPLICATE) {
                this.isUserConfiguring = true; // Mark as user configuring
                this.currentConfig.targetFile = value || undefined;
                console.log(this.currentConfig, "currentConfig", value);
                this.updateValue();
            }
        });
        // Add file location suggester with safe initialization
        new FileLocationSuggest(this.plugin.app, this.targetFileInput.inputEl, (file) => {
            // FileLocationSuggest already updates the input value and triggers input event
            // The TextComponent onChange handler will process the updated value
            // No need to manually set targetFile here to avoid data races
        });
        // Target section input (optional)
        const targetSectionContainer = this.configContainer.createDiv({
            cls: "oncompletion-field",
        });
        targetSectionContainer.createDiv({
            cls: "oncompletion-label",
            text: t("Target Section (Optional)"),
        });
        this.targetSectionInput = new TextComponent(targetSectionContainer);
        this.targetSectionInput.setPlaceholder(t("Section name in target file"));
        // Set initial value if exists
        if (duplicateConfig.targetSection) {
            this.targetSectionInput.setValue(duplicateConfig.targetSection);
        }
        this.targetSectionInput.onChange((value) => {
            if (this.currentConfig &&
                this.currentConfig.type === OnCompletionActionType.DUPLICATE) {
                this.isUserConfiguring = true; // Mark as user configuring
                this.currentConfig.targetSection = value || undefined;
                this.updateValue();
            }
        });
        // Preserve metadata toggle
        const preserveMetadataContainer = this.configContainer.createDiv({
            cls: "oncompletion-field",
        });
        preserveMetadataContainer.createDiv({
            cls: "oncompletion-label",
            text: t("Preserve Metadata"),
        });
        this.preserveMetadataToggle = new ToggleComponent(preserveMetadataContainer);
        // Set initial value if exists
        if (duplicateConfig.preserveMetadata !== undefined) {
            this.preserveMetadataToggle.setValue(duplicateConfig.preserveMetadata);
        }
        this.preserveMetadataToggle.onChange((value) => {
            if (this.currentConfig &&
                this.currentConfig.type === OnCompletionActionType.DUPLICATE) {
                this.isUserConfiguring = true; // Mark as user configuring
                this.currentConfig.preserveMetadata = value;
                this.updateValue();
            }
        });
        preserveMetadataContainer.createDiv({
            cls: "oncompletion-description",
            text: t("Keep completion dates and other metadata in the duplicated task"),
        });
    }
    updateValue() {
        if (!this.currentConfig) {
            this.currentRawValue = "";
        }
        else {
            // Generate simple format for basic actions, JSON for complex ones
            this.currentRawValue = this.generateRawValue(this.currentConfig);
        }
        // Skip validation for now since OnCompletionManager is being removed
        // This validation will need to be reimplemented in Dataflow
        const isValid = true; // Temporarily assume valid
        // Notify about changes only if not an internal update
        // Allow onChange for user configuration even during internal updates
        if ((!this.isInternalUpdate || this.isUserConfiguring) &&
            this.options.onChange) {
            this.options.onChange(this.currentRawValue);
        }
        if (this.options.onValidationChange) {
            this.options.onValidationChange(isValid, undefined);
        }
    }
    generateRawValue(config) {
        switch (config.type) {
            case OnCompletionActionType.DELETE:
                return "delete";
            case OnCompletionActionType.KEEP:
                return "keep";
            case OnCompletionActionType.ARCHIVE:
                const archiveConfig = config;
                if (archiveConfig.archiveFile) {
                    return `archive:${archiveConfig.archiveFile}`;
                }
                return "archive";
            case OnCompletionActionType.COMPLETE:
                const completeConfig = config;
                if (completeConfig.taskIds &&
                    completeConfig.taskIds.length > 0) {
                    return `complete:${completeConfig.taskIds.join(",")}`;
                }
                return "complete:"; // Return partial config instead of empty string
            case OnCompletionActionType.MOVE:
                const moveConfig = config;
                if (moveConfig.targetFile) {
                    return `move:${moveConfig.targetFile}`;
                }
                return "move:"; // Return partial config instead of empty string
            case OnCompletionActionType.DUPLICATE:
                const duplicateConfig = config;
                // Use JSON format for complex duplicate configurations
                if (duplicateConfig.targetFile ||
                    duplicateConfig.targetSection ||
                    duplicateConfig.preserveMetadata) {
                    return JSON.stringify(config);
                }
                return "duplicate";
            default:
                return JSON.stringify(config);
        }
    }
    setValue(value) {
        this.currentRawValue = value;
        // Parse the value manually for now since OnCompletionManager is being removed
        // This parsing will need to be reimplemented in Dataflow
        try {
            const config = this.parseOnCompletionValue(value);
            if (config) {
                this.currentConfig = config;
                this.updateUIFromConfig(config);
            }
            else {
                this.currentConfig = null;
                this.actionTypeDropdown.setValue("");
                this.configContainer.empty();
            }
        }
        catch (e) {
            this.currentConfig = null;
            this.actionTypeDropdown.setValue("");
            this.configContainer.empty();
        }
    }
    updateUIFromConfig(config) {
        this.actionTypeDropdown.setValue(config.type);
        // Use initialization method instead of onActionTypeChange to preserve config
        // The initializeUIForActionType method now handles setting all input values
        this.initializeUIForActionType(config.type, config);
    }
    getValue() {
        return this.currentRawValue;
    }
    getConfig() {
        return this.currentConfig;
    }
    isValid() {
        // Temporarily return true until OnCompletion parsing is reimplemented in Dataflow
        return this.currentConfig !== null;
    }
    /**
     * Temporary parsing method until OnCompletion is reimplemented in Dataflow
     */
    parseOnCompletionValue(value) {
        if (!value)
            return null;
        const trimmed = value.trim();
        // Simple actions
        if (trimmed === 'delete')
            return { type: OnCompletionActionType.DELETE };
        if (trimmed === 'keep')
            return { type: OnCompletionActionType.KEEP };
        if (trimmed === 'duplicate')
            return { type: OnCompletionActionType.DUPLICATE };
        // Archive action
        if (trimmed === 'archive')
            return { type: OnCompletionActionType.ARCHIVE };
        if (trimmed.startsWith('archive:')) {
            const archiveFile = trimmed.substring(8).trim();
            return { type: OnCompletionActionType.ARCHIVE, archiveFile };
        }
        // Complete action
        if (trimmed.startsWith('complete:')) {
            const taskIdsStr = trimmed.substring(9).trim();
            const taskIds = taskIdsStr ? taskIdsStr.split(',').map(id => id.trim()) : [];
            return { type: OnCompletionActionType.COMPLETE, taskIds };
        }
        // Move action
        if (trimmed.startsWith('move:')) {
            const targetFile = trimmed.substring(5).trim();
            return { type: OnCompletionActionType.MOVE, targetFile };
        }
        // Try JSON parsing for complex configurations
        try {
            const parsed = JSON.parse(trimmed);
            if (parsed && parsed.type) {
                return parsed;
            }
        }
        catch (e) {
            // Not JSON, ignore
        }
        return null;
    }
    onunload() {
        this.containerEl.remove();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT25Db21wbGV0aW9uQ29uZmlndXJhdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiT25Db21wbGV0aW9uQ29uZmlndXJhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFDTixTQUFTLEVBQ1QsaUJBQWlCLEVBQ2pCLGFBQWEsRUFDYixlQUFlLEdBRWYsTUFBTSxVQUFVLENBQUM7QUFDbEIsT0FBTyxFQUVOLHNCQUFzQixHQUV0QixNQUFNLHNCQUFzQixDQUFDO0FBRTlCLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUMxQyxPQUFPLEVBQ04sYUFBYSxFQUNiLG1CQUFtQixHQUVuQixNQUFNLDBCQUEwQixDQUFDO0FBQ2xDLE9BQU8sMkJBQTJCLENBQUM7QUFRbkM7O0dBRUc7QUFDSCxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsU0FBUztJQWtCdEQsWUFDQyxRQUFxQixFQUNiLE1BQTZCLEVBQzdCLFVBQTJDLEVBQUU7UUFFckQsS0FBSyxFQUFFLENBQUM7UUFIQSxXQUFNLEdBQU4sTUFBTSxDQUF1QjtRQUM3QixZQUFPLEdBQVAsT0FBTyxDQUFzQztRQWpCOUMsa0JBQWEsR0FBOEIsSUFBSSxDQUFDO1FBQ2hELG9CQUFlLEdBQVcsRUFBRSxDQUFDO1FBQzdCLHFCQUFnQixHQUFZLEtBQUssQ0FBQztRQUNsQyxtQkFBYyxHQUFrQyxJQUFJLENBQUM7UUFDckQsc0JBQWlCLEdBQVksS0FBSyxDQUFDO1FBZ0IxQyxJQUFJLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUM7WUFDckMsR0FBRyxFQUFFLDJCQUEyQjtTQUNoQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFFcEIsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRTtZQUM5QixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7U0FDekM7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RyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQy9DLE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzdFLE9BQU8sRUFBRSxJQUFJLEVBQUUsc0JBQXNCLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBUyxDQUFDO1NBQ2pFO1FBRUQsY0FBYztRQUNkLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUNoQyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQy9DLE9BQU8sRUFBRSxJQUFJLEVBQUUsc0JBQXNCLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBUyxDQUFDO1NBQ2hFO1FBRUQsOENBQThDO1FBQzlDLElBQUk7WUFDSCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ25DLElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxJQUFJLEVBQUU7Z0JBQzFCLE9BQU8sTUFBTSxDQUFDO2FBQ2Q7U0FDRDtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1gsbUJBQW1CO1NBQ25CO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsUUFBUTtRQUNQLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDM0IsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcclxuXHRDb21wb25lbnQsXHJcblx0RHJvcGRvd25Db21wb25lbnQsXHJcblx0VGV4dENvbXBvbmVudCxcclxuXHRUb2dnbGVDb21wb25lbnQsXHJcblx0VEZpbGUsXHJcbn0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7XHJcblx0T25Db21wbGV0aW9uQ29uZmlnLFxyXG5cdE9uQ29tcGxldGlvbkFjdGlvblR5cGUsXHJcblx0T25Db21wbGV0aW9uUGFyc2VSZXN1bHQsXHJcbn0gZnJvbSBcIkAvdHlwZXMvb25Db21wbGV0aW9uXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHtcclxuXHRUYXNrSWRTdWdnZXN0LFxyXG5cdEZpbGVMb2NhdGlvblN1Z2dlc3QsXHJcblx0QWN0aW9uVHlwZVN1Z2dlc3QsXHJcbn0gZnJvbSBcIi4vT25Db21wbGV0aW9uU3VnZ2VzdGVyc1wiO1xyXG5pbXBvcnQgXCJAL3N0eWxlcy9vbkNvbXBsZXRpb24uY3NzXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE9uQ29tcGxldGlvbkNvbmZpZ3VyYXRvck9wdGlvbnMge1xyXG5cdGluaXRpYWxWYWx1ZT86IHN0cmluZztcclxuXHRvbkNoYW5nZT86ICh2YWx1ZTogc3RyaW5nKSA9PiB2b2lkO1xyXG5cdG9uVmFsaWRhdGlvbkNoYW5nZT86IChpc1ZhbGlkOiBib29sZWFuLCBlcnJvcj86IHN0cmluZykgPT4gdm9pZDtcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbXBvbmVudCBmb3IgY29uZmlndXJpbmcgb25Db21wbGV0aW9uIGFjdGlvbnMgd2l0aCBhIHVzZXItZnJpZW5kbHkgaW50ZXJmYWNlXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgT25Db21wbGV0aW9uQ29uZmlndXJhdG9yIGV4dGVuZHMgQ29tcG9uZW50IHtcclxuXHRwcml2YXRlIGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIGFjdGlvblR5cGVEcm9wZG93bjogRHJvcGRvd25Db21wb25lbnQ7XHJcblx0cHJpdmF0ZSBjb25maWdDb250YWluZXI6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgY3VycmVudENvbmZpZzogT25Db21wbGV0aW9uQ29uZmlnIHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBjdXJyZW50UmF3VmFsdWU6IHN0cmluZyA9IFwiXCI7XHJcblx0cHJpdmF0ZSBpc0ludGVybmFsVXBkYXRlOiBib29sZWFuID0gZmFsc2U7XHJcblx0cHJpdmF0ZSBsYXN0QWN0aW9uVHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZSB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgaXNVc2VyQ29uZmlndXJpbmc6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcblx0Ly8gQWN0aW9uLXNwZWNpZmljIGlucHV0IGNvbXBvbmVudHNcclxuXHRwcml2YXRlIHRhc2tJZHNJbnB1dD86IFRleHRDb21wb25lbnQ7XHJcblx0cHJpdmF0ZSB0YXJnZXRGaWxlSW5wdXQ/OiBUZXh0Q29tcG9uZW50O1xyXG5cdHByaXZhdGUgdGFyZ2V0U2VjdGlvbklucHV0PzogVGV4dENvbXBvbmVudDtcclxuXHRwcml2YXRlIGFyY2hpdmVGaWxlSW5wdXQ/OiBUZXh0Q29tcG9uZW50O1xyXG5cdHByaXZhdGUgYXJjaGl2ZVNlY3Rpb25JbnB1dD86IFRleHRDb21wb25lbnQ7XHJcblx0cHJpdmF0ZSBwcmVzZXJ2ZU1ldGFkYXRhVG9nZ2xlPzogVG9nZ2xlQ29tcG9uZW50O1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHBhcmVudEVsOiBIVE1MRWxlbWVudCxcclxuXHRcdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRwcml2YXRlIG9wdGlvbnM6IE9uQ29tcGxldGlvbkNvbmZpZ3VyYXRvck9wdGlvbnMgPSB7fVxyXG5cdCkge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMuY29udGFpbmVyRWwgPSBwYXJlbnRFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwib25jb21wbGV0aW9uLWNvbmZpZ3VyYXRvclwiLFxyXG5cdFx0fSk7XHJcblx0XHR0aGlzLmluaXRpYWxpemVVSSgpO1xyXG5cclxuXHRcdGlmICh0aGlzLm9wdGlvbnMuaW5pdGlhbFZhbHVlKSB7XHJcblx0XHRcdHRoaXMuc2V0VmFsdWUodGhpcy5vcHRpb25zLmluaXRpYWxWYWx1ZSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGluaXRpYWxpemVVSSgpIHtcclxuXHRcdC8vIEFjdGlvbiB0eXBlIHNlbGVjdGlvblxyXG5cdFx0Y29uc3QgYWN0aW9uVHlwZUNvbnRhaW5lciA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcIm9uY29tcGxldGlvbi1hY3Rpb24tdHlwZVwiLFxyXG5cdFx0fSk7XHJcblx0XHRhY3Rpb25UeXBlQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJvbmNvbXBsZXRpb24tbGFiZWxcIixcclxuXHRcdFx0dGV4dDogdChcIkFjdGlvbiBUeXBlXCIpLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5hY3Rpb25UeXBlRHJvcGRvd24gPSBuZXcgRHJvcGRvd25Db21wb25lbnQoYWN0aW9uVHlwZUNvbnRhaW5lcik7XHJcblx0XHR0aGlzLmFjdGlvblR5cGVEcm9wZG93bi5hZGRPcHRpb24oXCJcIiwgdChcIlNlbGVjdCBhY3Rpb24gdHlwZS4uLlwiKSk7XHJcblx0XHR0aGlzLmFjdGlvblR5cGVEcm9wZG93bi5hZGRPcHRpb24oXHJcblx0XHRcdE9uQ29tcGxldGlvbkFjdGlvblR5cGUuREVMRVRFLFxyXG5cdFx0XHR0KFwiRGVsZXRlIHRhc2tcIilcclxuXHRcdCk7XHJcblx0XHR0aGlzLmFjdGlvblR5cGVEcm9wZG93bi5hZGRPcHRpb24oXHJcblx0XHRcdE9uQ29tcGxldGlvbkFjdGlvblR5cGUuS0VFUCxcclxuXHRcdFx0dChcIktlZXAgdGFza1wiKVxyXG5cdFx0KTtcclxuXHRcdHRoaXMuYWN0aW9uVHlwZURyb3Bkb3duLmFkZE9wdGlvbihcclxuXHRcdFx0T25Db21wbGV0aW9uQWN0aW9uVHlwZS5DT01QTEVURSxcclxuXHRcdFx0dChcIkNvbXBsZXRlIHJlbGF0ZWQgdGFza3NcIilcclxuXHRcdCk7XHJcblx0XHR0aGlzLmFjdGlvblR5cGVEcm9wZG93bi5hZGRPcHRpb24oXHJcblx0XHRcdE9uQ29tcGxldGlvbkFjdGlvblR5cGUuTU9WRSxcclxuXHRcdFx0dChcIk1vdmUgdGFza1wiKVxyXG5cdFx0KTtcclxuXHRcdHRoaXMuYWN0aW9uVHlwZURyb3Bkb3duLmFkZE9wdGlvbihcclxuXHRcdFx0T25Db21wbGV0aW9uQWN0aW9uVHlwZS5BUkNISVZFLFxyXG5cdFx0XHR0KFwiQXJjaGl2ZSB0YXNrXCIpXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5hY3Rpb25UeXBlRHJvcGRvd24uYWRkT3B0aW9uKFxyXG5cdFx0XHRPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkRVUExJQ0FURSxcclxuXHRcdFx0dChcIkR1cGxpY2F0ZSB0YXNrXCIpXHJcblx0XHQpO1xyXG5cclxuXHRcdHRoaXMuYWN0aW9uVHlwZURyb3Bkb3duLm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHR0aGlzLm9uQWN0aW9uVHlwZUNoYW5nZSh2YWx1ZSBhcyBPbkNvbXBsZXRpb25BY3Rpb25UeXBlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIENvbmZpZ3VyYXRpb24gY29udGFpbmVyIGZvciBhY3Rpb24tc3BlY2lmaWMgb3B0aW9uc1xyXG5cdFx0dGhpcy5jb25maWdDb250YWluZXIgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJvbmNvbXBsZXRpb24tY29uZmlnXCIsXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgb25BY3Rpb25UeXBlQ2hhbmdlKGFjdGlvblR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUpIHtcclxuXHRcdHRoaXMuaXNJbnRlcm5hbFVwZGF0ZSA9IHRydWU7XHJcblx0XHR0aGlzLmxhc3RBY3Rpb25UeXBlID0gYWN0aW9uVHlwZTtcclxuXHRcdHRoaXMuaXNVc2VyQ29uZmlndXJpbmcgPSBmYWxzZTsgLy8gUmVzZXQgdXNlciBjb25maWd1cmluZyBzdGF0ZVxyXG5cclxuXHRcdC8vIENsZWFyIHByZXZpb3VzIGNvbmZpZ3VyYXRpb25cclxuXHRcdHRoaXMuY29uZmlnQ29udGFpbmVyLmVtcHR5KCk7XHJcblx0XHR0aGlzLmN1cnJlbnRDb25maWcgPSBudWxsO1xyXG5cclxuXHRcdGlmICghYWN0aW9uVHlwZSkge1xyXG5cdFx0XHR0aGlzLnVwZGF0ZVZhbHVlKCk7XHJcblx0XHRcdHRoaXMuaXNJbnRlcm5hbFVwZGF0ZSA9IGZhbHNlO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGJhc2UgY29uZmlndXJhdGlvblxyXG5cdFx0c3dpdGNoIChhY3Rpb25UeXBlKSB7XHJcblx0XHRcdGNhc2UgT25Db21wbGV0aW9uQWN0aW9uVHlwZS5ERUxFVEU6XHJcblx0XHRcdFx0dGhpcy5jdXJyZW50Q29uZmlnID0geyB0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkRFTEVURSB9O1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIE9uQ29tcGxldGlvbkFjdGlvblR5cGUuS0VFUDpcclxuXHRcdFx0XHR0aGlzLmN1cnJlbnRDb25maWcgPSB7IHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuS0VFUCB9O1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQ09NUExFVEU6XHJcblx0XHRcdFx0dGhpcy5jcmVhdGVDb21wbGV0ZUNvbmZpZ3VyYXRpb24oKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLk1PVkU6XHJcblx0XHRcdFx0dGhpcy5jcmVhdGVNb3ZlQ29uZmlndXJhdGlvbigpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQVJDSElWRTpcclxuXHRcdFx0XHR0aGlzLmNyZWF0ZUFyY2hpdmVDb25maWd1cmF0aW9uKCk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgT25Db21wbGV0aW9uQWN0aW9uVHlwZS5EVVBMSUNBVEU6XHJcblx0XHRcdFx0dGhpcy5jcmVhdGVEdXBsaWNhdGVDb25maWd1cmF0aW9uKCk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy51cGRhdGVWYWx1ZSgpO1xyXG5cdFx0dGhpcy5pc0ludGVybmFsVXBkYXRlID0gZmFsc2U7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBJbml0aWFsaXplIFVJIGZvciBhY3Rpb24gdHlwZSB3aXRob3V0IGNsZWFyaW5nIGV4aXN0aW5nIGNvbmZpZ3VyYXRpb25cclxuXHQgKiBVc2VkIGR1cmluZyBwcm9ncmFtbWF0aWMgaW5pdGlhbGl6YXRpb24gdG8gcHJlc2VydmUgcGFyc2VkIGNvbmZpZyBkYXRhXHJcblx0ICovXHJcblx0cHJpdmF0ZSBpbml0aWFsaXplVUlGb3JBY3Rpb25UeXBlKFxyXG5cdFx0YWN0aW9uVHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZSxcclxuXHRcdGV4aXN0aW5nQ29uZmlnPzogT25Db21wbGV0aW9uQ29uZmlnXHJcblx0KSB7XHJcblx0XHR0aGlzLmlzSW50ZXJuYWxVcGRhdGUgPSB0cnVlO1xyXG5cclxuXHRcdC8vIENsZWFyIHByZXZpb3VzIFVJIGJ1dCBwcmVzZXJ2ZSBjb25maWd1cmF0aW9uXHJcblx0XHR0aGlzLmNvbmZpZ0NvbnRhaW5lci5lbXB0eSgpO1xyXG5cclxuXHRcdGlmICghYWN0aW9uVHlwZSkge1xyXG5cdFx0XHR0aGlzLmlzSW50ZXJuYWxVcGRhdGUgPSBmYWxzZTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENyZWF0ZSBVSSBhbmQgcHJlc2VydmUgZXhpc3RpbmcgY29uZmlndXJhdGlvblxyXG5cdFx0c3dpdGNoIChhY3Rpb25UeXBlKSB7XHJcblx0XHRcdGNhc2UgT25Db21wbGV0aW9uQWN0aW9uVHlwZS5ERUxFVEU6XHJcblx0XHRcdFx0dGhpcy5jdXJyZW50Q29uZmlnID0gZXhpc3RpbmdDb25maWcgfHwge1xyXG5cdFx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5ERUxFVEUsXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLktFRVA6XHJcblx0XHRcdFx0dGhpcy5jdXJyZW50Q29uZmlnID0gZXhpc3RpbmdDb25maWcgfHwge1xyXG5cdFx0XHRcdFx0dHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5LRUVQLFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgT25Db21wbGV0aW9uQWN0aW9uVHlwZS5DT01QTEVURTpcclxuXHRcdFx0XHR0aGlzLmNyZWF0ZUNvbXBsZXRlQ29uZmlndXJhdGlvbihleGlzdGluZ0NvbmZpZyk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgT25Db21wbGV0aW9uQWN0aW9uVHlwZS5NT1ZFOlxyXG5cdFx0XHRcdHRoaXMuY3JlYXRlTW92ZUNvbmZpZ3VyYXRpb24oZXhpc3RpbmdDb25maWcpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQVJDSElWRTpcclxuXHRcdFx0XHR0aGlzLmNyZWF0ZUFyY2hpdmVDb25maWd1cmF0aW9uKGV4aXN0aW5nQ29uZmlnKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkRVUExJQ0FURTpcclxuXHRcdFx0XHR0aGlzLmNyZWF0ZUR1cGxpY2F0ZUNvbmZpZ3VyYXRpb24oZXhpc3RpbmdDb25maWcpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuaXNJbnRlcm5hbFVwZGF0ZSA9IGZhbHNlO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVDb21wbGV0ZUNvbmZpZ3VyYXRpb24oZXhpc3RpbmdDb25maWc/OiBPbkNvbXBsZXRpb25Db25maWcpIHtcclxuXHRcdC8vIFVzZSBleGlzdGluZyBjb25maWcgaWYgcHJvdmlkZWQsIG90aGVyd2lzZSBjcmVhdGUgbmV3IG9uZVxyXG5cdFx0Y29uc3QgY29tcGxldGVDb25maWcgPVxyXG5cdFx0XHRleGlzdGluZ0NvbmZpZyAmJlxyXG5cdFx0XHRleGlzdGluZ0NvbmZpZy50eXBlID09PSBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkNPTVBMRVRFXHJcblx0XHRcdFx0PyAoZXhpc3RpbmdDb25maWcgYXMgYW55KVxyXG5cdFx0XHRcdDogeyB0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkNPTVBMRVRFLCB0YXNrSWRzOiBbXSB9O1xyXG5cclxuXHRcdHRoaXMuY3VycmVudENvbmZpZyA9IGNvbXBsZXRlQ29uZmlnO1xyXG5cclxuXHRcdGNvbnN0IHRhc2tJZHNDb250YWluZXIgPSB0aGlzLmNvbmZpZ0NvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwib25jb21wbGV0aW9uLWZpZWxkXCIsXHJcblx0XHR9KTtcclxuXHRcdHRhc2tJZHNDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcIm9uY29tcGxldGlvbi1sYWJlbFwiLFxyXG5cdFx0XHR0ZXh0OiB0KFwiVGFzayBJRHNcIiksXHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLnRhc2tJZHNJbnB1dCA9IG5ldyBUZXh0Q29tcG9uZW50KHRhc2tJZHNDb250YWluZXIpO1xyXG5cdFx0dGhpcy50YXNrSWRzSW5wdXQuc2V0UGxhY2Vob2xkZXIoXHJcblx0XHRcdHQoXCJFbnRlciB0YXNrIElEcyBzZXBhcmF0ZWQgYnkgY29tbWFzXCIpXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIFNldCBpbml0aWFsIHZhbHVlIGlmIGV4aXN0c1xyXG5cdFx0aWYgKGNvbXBsZXRlQ29uZmlnLnRhc2tJZHMgJiYgY29tcGxldGVDb25maWcudGFza0lkcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdHRoaXMudGFza0lkc0lucHV0LnNldFZhbHVlKGNvbXBsZXRlQ29uZmlnLnRhc2tJZHMuam9pbihcIiwgXCIpKTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnRhc2tJZHNJbnB1dC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHRoaXMuY3VycmVudENvbmZpZyAmJlxyXG5cdFx0XHRcdHRoaXMuY3VycmVudENvbmZpZy50eXBlID09PSBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkNPTVBMRVRFXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHRoaXMuaXNVc2VyQ29uZmlndXJpbmcgPSB0cnVlOyAvLyBNYXJrIGFzIHVzZXIgY29uZmlndXJpbmdcclxuXHRcdFx0XHQodGhpcy5jdXJyZW50Q29uZmlnIGFzIGFueSkudGFza0lkcyA9IHZhbHVlXHJcblx0XHRcdFx0XHQuc3BsaXQoXCIsXCIpXHJcblx0XHRcdFx0XHQubWFwKChpZCkgPT4gaWQudHJpbSgpKVxyXG5cdFx0XHRcdFx0LmZpbHRlcigoaWQpID0+IGlkKTtcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZVZhbHVlKCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEFkZCB0YXNrIElEIHN1Z2dlc3RlciB3aXRoIHNhZmUgaW5pdGlhbGl6YXRpb25cclxuXHRcdG5ldyBUYXNrSWRTdWdnZXN0KFxyXG5cdFx0XHR0aGlzLnBsdWdpbi5hcHAsXHJcblx0XHRcdHRoaXMudGFza0lkc0lucHV0IS5pbnB1dEVsLFxyXG5cdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0KHRhc2tJZDogc3RyaW5nKSA9PiB7XHJcblx0XHRcdFx0Ly8gVGFza0lkU3VnZ2VzdCBhbHJlYWR5IHVwZGF0ZXMgdGhlIGlucHV0IHZhbHVlIGFuZCB0cmlnZ2VycyBpbnB1dCBldmVudFxyXG5cdFx0XHRcdC8vIFRoZSBUZXh0Q29tcG9uZW50IG9uQ2hhbmdlIGhhbmRsZXIgd2lsbCBwcm9jZXNzIHRoZSB1cGRhdGVkIHZhbHVlXHJcblx0XHRcdFx0Ly8gTm8gbmVlZCB0byBtYW51YWxseSBzZXQgdGFza0lkcyBoZXJlIHRvIGF2b2lkIGRhdGEgdHlwZSBjb25mbGljdHNcclxuXHRcdFx0fVxyXG5cdFx0KTtcclxuXHJcblx0XHR0YXNrSWRzQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJvbmNvbXBsZXRpb24tZGVzY3JpcHRpb25cIixcclxuXHRcdFx0dGV4dDogdChcclxuXHRcdFx0XHRcIkNvbW1hLXNlcGFyYXRlZCBsaXN0IG9mIHRhc2sgSURzIHRvIGNvbXBsZXRlIHdoZW4gdGhpcyB0YXNrIGlzIGNvbXBsZXRlZFwiXHJcblx0XHRcdCksXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY3JlYXRlTW92ZUNvbmZpZ3VyYXRpb24oZXhpc3RpbmdDb25maWc/OiBPbkNvbXBsZXRpb25Db25maWcpIHtcclxuXHRcdC8vIFVzZSBleGlzdGluZyBjb25maWcgaWYgcHJvdmlkZWQsIG90aGVyd2lzZSBjcmVhdGUgbmV3IG9uZVxyXG5cdFx0Y29uc3QgbW92ZUNvbmZpZyA9XHJcblx0XHRcdGV4aXN0aW5nQ29uZmlnICYmXHJcblx0XHRcdGV4aXN0aW5nQ29uZmlnLnR5cGUgPT09IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuTU9WRVxyXG5cdFx0XHRcdD8gKGV4aXN0aW5nQ29uZmlnIGFzIGFueSlcclxuXHRcdFx0XHQ6IHsgdHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5NT1ZFLCB0YXJnZXRGaWxlOiBcIlwiIH07XHJcblxyXG5cdFx0dGhpcy5jdXJyZW50Q29uZmlnID0gbW92ZUNvbmZpZztcclxuXHJcblx0XHQvLyBUYXJnZXQgZmlsZSBpbnB1dFxyXG5cdFx0Y29uc3QgdGFyZ2V0RmlsZUNvbnRhaW5lciA9IHRoaXMuY29uZmlnQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJvbmNvbXBsZXRpb24tZmllbGRcIixcclxuXHRcdH0pO1xyXG5cdFx0dGFyZ2V0RmlsZUNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwib25jb21wbGV0aW9uLWxhYmVsXCIsXHJcblx0XHRcdHRleHQ6IHQoXCJUYXJnZXQgRmlsZVwiKSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMudGFyZ2V0RmlsZUlucHV0ID0gbmV3IFRleHRDb21wb25lbnQodGFyZ2V0RmlsZUNvbnRhaW5lcik7XHJcblx0XHR0aGlzLnRhcmdldEZpbGVJbnB1dC5zZXRQbGFjZWhvbGRlcih0KFwiUGF0aCB0byB0YXJnZXQgZmlsZVwiKSk7XHJcblxyXG5cdFx0Ly8gU2V0IGluaXRpYWwgdmFsdWUgaWYgZXhpc3RzXHJcblx0XHRpZiAobW92ZUNvbmZpZy50YXJnZXRGaWxlKSB7XHJcblx0XHRcdHRoaXMudGFyZ2V0RmlsZUlucHV0LnNldFZhbHVlKG1vdmVDb25maWcudGFyZ2V0RmlsZSk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy50YXJnZXRGaWxlSW5wdXQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHR0aGlzLmN1cnJlbnRDb25maWcgJiZcclxuXHRcdFx0XHR0aGlzLmN1cnJlbnRDb25maWcudHlwZSA9PT0gT25Db21wbGV0aW9uQWN0aW9uVHlwZS5NT1ZFXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHRoaXMuaXNVc2VyQ29uZmlndXJpbmcgPSB0cnVlOyAvLyBNYXJrIGFzIHVzZXIgY29uZmlndXJpbmdcclxuXHRcdFx0XHQodGhpcy5jdXJyZW50Q29uZmlnIGFzIGFueSkudGFyZ2V0RmlsZSA9IHZhbHVlO1xyXG5cdFx0XHRcdHRoaXMudXBkYXRlVmFsdWUoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQWRkIGZpbGUgbG9jYXRpb24gc3VnZ2VzdGVyIHdpdGggc2FmZSBpbml0aWFsaXphdGlvblxyXG5cdFx0bmV3IEZpbGVMb2NhdGlvblN1Z2dlc3QoXHJcblx0XHRcdHRoaXMucGx1Z2luLmFwcCxcclxuXHRcdFx0dGhpcy50YXJnZXRGaWxlSW5wdXQhLmlucHV0RWwsXHJcblx0XHRcdChmaWxlOiBURmlsZSkgPT4ge1xyXG5cdFx0XHRcdC8vIEZpbGVMb2NhdGlvblN1Z2dlc3QgYWxyZWFkeSB1cGRhdGVzIHRoZSBpbnB1dCB2YWx1ZSBhbmQgdHJpZ2dlcnMgaW5wdXQgZXZlbnRcclxuXHRcdFx0XHQvLyBUaGUgVGV4dENvbXBvbmVudCBvbkNoYW5nZSBoYW5kbGVyIHdpbGwgcHJvY2VzcyB0aGUgdXBkYXRlZCB2YWx1ZVxyXG5cdFx0XHRcdC8vIE5vIG5lZWQgdG8gbWFudWFsbHkgc2V0IHRhcmdldEZpbGUgaGVyZSB0byBhdm9pZCBkYXRhIHJhY2VzXHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gVGFyZ2V0IHNlY3Rpb24gaW5wdXQgKG9wdGlvbmFsKVxyXG5cdFx0Y29uc3QgdGFyZ2V0U2VjdGlvbkNvbnRhaW5lciA9IHRoaXMuY29uZmlnQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJvbmNvbXBsZXRpb24tZmllbGRcIixcclxuXHRcdH0pO1xyXG5cdFx0dGFyZ2V0U2VjdGlvbkNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwib25jb21wbGV0aW9uLWxhYmVsXCIsXHJcblx0XHRcdHRleHQ6IHQoXCJUYXJnZXQgU2VjdGlvbiAoT3B0aW9uYWwpXCIpLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy50YXJnZXRTZWN0aW9uSW5wdXQgPSBuZXcgVGV4dENvbXBvbmVudCh0YXJnZXRTZWN0aW9uQ29udGFpbmVyKTtcclxuXHRcdHRoaXMudGFyZ2V0U2VjdGlvbklucHV0LnNldFBsYWNlaG9sZGVyKFxyXG5cdFx0XHR0KFwiU2VjdGlvbiBuYW1lIGluIHRhcmdldCBmaWxlXCIpXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIFNldCBpbml0aWFsIHZhbHVlIGlmIGV4aXN0c1xyXG5cdFx0aWYgKG1vdmVDb25maWcudGFyZ2V0U2VjdGlvbikge1xyXG5cdFx0XHR0aGlzLnRhcmdldFNlY3Rpb25JbnB1dC5zZXRWYWx1ZShtb3ZlQ29uZmlnLnRhcmdldFNlY3Rpb24pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMudGFyZ2V0U2VjdGlvbklucHV0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0dGhpcy5jdXJyZW50Q29uZmlnICYmXHJcblx0XHRcdFx0dGhpcy5jdXJyZW50Q29uZmlnLnR5cGUgPT09IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuTU9WRVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHR0aGlzLmlzVXNlckNvbmZpZ3VyaW5nID0gdHJ1ZTsgLy8gTWFyayBhcyB1c2VyIGNvbmZpZ3VyaW5nXHJcblx0XHRcdFx0KHRoaXMuY3VycmVudENvbmZpZyBhcyBhbnkpLnRhcmdldFNlY3Rpb24gPSB2YWx1ZSB8fCB1bmRlZmluZWQ7XHJcblx0XHRcdFx0dGhpcy51cGRhdGVWYWx1ZSgpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY3JlYXRlQXJjaGl2ZUNvbmZpZ3VyYXRpb24oZXhpc3RpbmdDb25maWc/OiBPbkNvbXBsZXRpb25Db25maWcpIHtcclxuXHRcdC8vIFVzZSBleGlzdGluZyBjb25maWcgaWYgcHJvdmlkZWQsIG90aGVyd2lzZSBjcmVhdGUgbmV3IG9uZVxyXG5cdFx0Y29uc3QgYXJjaGl2ZUNvbmZpZyA9XHJcblx0XHRcdGV4aXN0aW5nQ29uZmlnICYmXHJcblx0XHRcdGV4aXN0aW5nQ29uZmlnLnR5cGUgPT09IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQVJDSElWRVxyXG5cdFx0XHRcdD8gKGV4aXN0aW5nQ29uZmlnIGFzIGFueSlcclxuXHRcdFx0XHQ6IHsgdHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5BUkNISVZFIH07XHJcblxyXG5cdFx0dGhpcy5jdXJyZW50Q29uZmlnID0gYXJjaGl2ZUNvbmZpZztcclxuXHJcblx0XHQvLyBBcmNoaXZlIGZpbGUgaW5wdXQgKG9wdGlvbmFsKVxyXG5cdFx0Y29uc3QgYXJjaGl2ZUZpbGVDb250YWluZXIgPSB0aGlzLmNvbmZpZ0NvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwib25jb21wbGV0aW9uLWZpZWxkXCIsXHJcblx0XHR9KTtcclxuXHRcdGFyY2hpdmVGaWxlQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJvbmNvbXBsZXRpb24tbGFiZWxcIixcclxuXHRcdFx0dGV4dDogdChcIkFyY2hpdmUgRmlsZSAoT3B0aW9uYWwpXCIpLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5hcmNoaXZlRmlsZUlucHV0ID0gbmV3IFRleHRDb21wb25lbnQoYXJjaGl2ZUZpbGVDb250YWluZXIpO1xyXG5cdFx0dGhpcy5hcmNoaXZlRmlsZUlucHV0LnNldFBsYWNlaG9sZGVyKFxyXG5cdFx0XHR0KFwiRGVmYXVsdDogQXJjaGl2ZS9Db21wbGV0ZWQgVGFza3MubWRcIilcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gU2V0IGluaXRpYWwgdmFsdWUgaWYgZXhpc3RzXHJcblx0XHRpZiAoYXJjaGl2ZUNvbmZpZy5hcmNoaXZlRmlsZSkge1xyXG5cdFx0XHR0aGlzLmFyY2hpdmVGaWxlSW5wdXQuc2V0VmFsdWUoYXJjaGl2ZUNvbmZpZy5hcmNoaXZlRmlsZSk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5hcmNoaXZlRmlsZUlucHV0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0dGhpcy5jdXJyZW50Q29uZmlnICYmXHJcblx0XHRcdFx0dGhpcy5jdXJyZW50Q29uZmlnLnR5cGUgPT09IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQVJDSElWRVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHR0aGlzLmlzVXNlckNvbmZpZ3VyaW5nID0gdHJ1ZTsgLy8gTWFyayBhcyB1c2VyIGNvbmZpZ3VyaW5nXHJcblx0XHRcdFx0KHRoaXMuY3VycmVudENvbmZpZyBhcyBhbnkpLmFyY2hpdmVGaWxlID0gdmFsdWUgfHwgdW5kZWZpbmVkO1xyXG5cdFx0XHRcdHRoaXMudXBkYXRlVmFsdWUoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQWRkIGZpbGUgbG9jYXRpb24gc3VnZ2VzdGVyIHdpdGggc2FmZSBpbml0aWFsaXphdGlvblxyXG5cdFx0bmV3IEZpbGVMb2NhdGlvblN1Z2dlc3QoXHJcblx0XHRcdHRoaXMucGx1Z2luLmFwcCxcclxuXHRcdFx0dGhpcy5hcmNoaXZlRmlsZUlucHV0IS5pbnB1dEVsLFxyXG5cdFx0XHQoZmlsZTogVEZpbGUpID0+IHtcclxuXHRcdFx0XHQvLyBGaWxlTG9jYXRpb25TdWdnZXN0IGFscmVhZHkgdXBkYXRlcyB0aGUgaW5wdXQgdmFsdWUgYW5kIHRyaWdnZXJzIGlucHV0IGV2ZW50XHJcblx0XHRcdFx0Ly8gVGhlIFRleHRDb21wb25lbnQgb25DaGFuZ2UgaGFuZGxlciB3aWxsIHByb2Nlc3MgdGhlIHVwZGF0ZWQgdmFsdWVcclxuXHRcdFx0XHQvLyBObyBuZWVkIHRvIG1hbnVhbGx5IHNldCBhcmNoaXZlRmlsZSBoZXJlIHRvIGF2b2lkIGRhdGEgcmFjZXNcclxuXHRcdFx0fVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBBcmNoaXZlIHNlY3Rpb24gaW5wdXQgKG9wdGlvbmFsKVxyXG5cdFx0Y29uc3QgYXJjaGl2ZVNlY3Rpb25Db250YWluZXIgPSB0aGlzLmNvbmZpZ0NvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwib25jb21wbGV0aW9uLWZpZWxkXCIsXHJcblx0XHR9KTtcclxuXHRcdGFyY2hpdmVTZWN0aW9uQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJvbmNvbXBsZXRpb24tbGFiZWxcIixcclxuXHRcdFx0dGV4dDogdChcIkFyY2hpdmUgU2VjdGlvbiAoT3B0aW9uYWwpXCIpLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5hcmNoaXZlU2VjdGlvbklucHV0ID0gbmV3IFRleHRDb21wb25lbnQoYXJjaGl2ZVNlY3Rpb25Db250YWluZXIpO1xyXG5cdFx0dGhpcy5hcmNoaXZlU2VjdGlvbklucHV0LnNldFBsYWNlaG9sZGVyKHQoXCJEZWZhdWx0OiBDb21wbGV0ZWQgVGFza3NcIikpO1xyXG5cclxuXHRcdC8vIFNldCBpbml0aWFsIHZhbHVlIGlmIGV4aXN0c1xyXG5cdFx0aWYgKGFyY2hpdmVDb25maWcuYXJjaGl2ZVNlY3Rpb24pIHtcclxuXHRcdFx0dGhpcy5hcmNoaXZlU2VjdGlvbklucHV0LnNldFZhbHVlKGFyY2hpdmVDb25maWcuYXJjaGl2ZVNlY3Rpb24pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuYXJjaGl2ZVNlY3Rpb25JbnB1dC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHRoaXMuY3VycmVudENvbmZpZyAmJlxyXG5cdFx0XHRcdHRoaXMuY3VycmVudENvbmZpZy50eXBlID09PSBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkFSQ0hJVkVcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0dGhpcy5pc1VzZXJDb25maWd1cmluZyA9IHRydWU7IC8vIE1hcmsgYXMgdXNlciBjb25maWd1cmluZ1xyXG5cdFx0XHRcdCh0aGlzLmN1cnJlbnRDb25maWcgYXMgYW55KS5hcmNoaXZlU2VjdGlvbiA9IHZhbHVlIHx8IHVuZGVmaW5lZDtcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZVZhbHVlKCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVEdXBsaWNhdGVDb25maWd1cmF0aW9uKGV4aXN0aW5nQ29uZmlnPzogT25Db21wbGV0aW9uQ29uZmlnKSB7XHJcblx0XHQvLyBVc2UgZXhpc3RpbmcgY29uZmlnIGlmIHByb3ZpZGVkLCBvdGhlcndpc2UgY3JlYXRlIG5ldyBvbmVcclxuXHRcdGNvbnN0IGR1cGxpY2F0ZUNvbmZpZyA9XHJcblx0XHRcdGV4aXN0aW5nQ29uZmlnICYmXHJcblx0XHRcdGV4aXN0aW5nQ29uZmlnLnR5cGUgPT09IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuRFVQTElDQVRFXHJcblx0XHRcdFx0PyAoZXhpc3RpbmdDb25maWcgYXMgYW55KVxyXG5cdFx0XHRcdDogeyB0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkRVUExJQ0FURSB9O1xyXG5cclxuXHRcdHRoaXMuY3VycmVudENvbmZpZyA9IGR1cGxpY2F0ZUNvbmZpZztcclxuXHJcblx0XHQvLyBUYXJnZXQgZmlsZSBpbnB1dCAob3B0aW9uYWwpXHJcblx0XHRjb25zdCB0YXJnZXRGaWxlQ29udGFpbmVyID0gdGhpcy5jb25maWdDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcIm9uY29tcGxldGlvbi1maWVsZFwiLFxyXG5cdFx0fSk7XHJcblx0XHR0YXJnZXRGaWxlQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJvbmNvbXBsZXRpb24tbGFiZWxcIixcclxuXHRcdFx0dGV4dDogdChcIlRhcmdldCBGaWxlIChPcHRpb25hbClcIiksXHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLnRhcmdldEZpbGVJbnB1dCA9IG5ldyBUZXh0Q29tcG9uZW50KHRhcmdldEZpbGVDb250YWluZXIpO1xyXG5cdFx0dGhpcy50YXJnZXRGaWxlSW5wdXQuc2V0UGxhY2Vob2xkZXIodChcIkRlZmF1bHQ6IHNhbWUgZmlsZVwiKSk7XHJcblxyXG5cdFx0Ly8gU2V0IGluaXRpYWwgdmFsdWUgaWYgZXhpc3RzXHJcblx0XHRpZiAoZHVwbGljYXRlQ29uZmlnLnRhcmdldEZpbGUpIHtcclxuXHRcdFx0dGhpcy50YXJnZXRGaWxlSW5wdXQuc2V0VmFsdWUoZHVwbGljYXRlQ29uZmlnLnRhcmdldEZpbGUpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMudGFyZ2V0RmlsZUlucHV0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0dGhpcy5jdXJyZW50Q29uZmlnICYmXHJcblx0XHRcdFx0dGhpcy5jdXJyZW50Q29uZmlnLnR5cGUgPT09IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuRFVQTElDQVRFXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHRoaXMuaXNVc2VyQ29uZmlndXJpbmcgPSB0cnVlOyAvLyBNYXJrIGFzIHVzZXIgY29uZmlndXJpbmdcclxuXHRcdFx0XHQodGhpcy5jdXJyZW50Q29uZmlnIGFzIGFueSkudGFyZ2V0RmlsZSA9IHZhbHVlIHx8IHVuZGVmaW5lZDtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyh0aGlzLmN1cnJlbnRDb25maWcsIFwiY3VycmVudENvbmZpZ1wiLCB2YWx1ZSk7XHJcblx0XHRcdFx0dGhpcy51cGRhdGVWYWx1ZSgpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBBZGQgZmlsZSBsb2NhdGlvbiBzdWdnZXN0ZXIgd2l0aCBzYWZlIGluaXRpYWxpemF0aW9uXHJcblx0XHRuZXcgRmlsZUxvY2F0aW9uU3VnZ2VzdChcclxuXHRcdFx0dGhpcy5wbHVnaW4uYXBwLFxyXG5cdFx0XHR0aGlzLnRhcmdldEZpbGVJbnB1dCEuaW5wdXRFbCxcclxuXHRcdFx0KGZpbGU6IFRGaWxlKSA9PiB7XHJcblx0XHRcdFx0Ly8gRmlsZUxvY2F0aW9uU3VnZ2VzdCBhbHJlYWR5IHVwZGF0ZXMgdGhlIGlucHV0IHZhbHVlIGFuZCB0cmlnZ2VycyBpbnB1dCBldmVudFxyXG5cdFx0XHRcdC8vIFRoZSBUZXh0Q29tcG9uZW50IG9uQ2hhbmdlIGhhbmRsZXIgd2lsbCBwcm9jZXNzIHRoZSB1cGRhdGVkIHZhbHVlXHJcblx0XHRcdFx0Ly8gTm8gbmVlZCB0byBtYW51YWxseSBzZXQgdGFyZ2V0RmlsZSBoZXJlIHRvIGF2b2lkIGRhdGEgcmFjZXNcclxuXHRcdFx0fVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBUYXJnZXQgc2VjdGlvbiBpbnB1dCAob3B0aW9uYWwpXHJcblx0XHRjb25zdCB0YXJnZXRTZWN0aW9uQ29udGFpbmVyID0gdGhpcy5jb25maWdDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcIm9uY29tcGxldGlvbi1maWVsZFwiLFxyXG5cdFx0fSk7XHJcblx0XHR0YXJnZXRTZWN0aW9uQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJvbmNvbXBsZXRpb24tbGFiZWxcIixcclxuXHRcdFx0dGV4dDogdChcIlRhcmdldCBTZWN0aW9uIChPcHRpb25hbClcIiksXHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLnRhcmdldFNlY3Rpb25JbnB1dCA9IG5ldyBUZXh0Q29tcG9uZW50KHRhcmdldFNlY3Rpb25Db250YWluZXIpO1xyXG5cdFx0dGhpcy50YXJnZXRTZWN0aW9uSW5wdXQuc2V0UGxhY2Vob2xkZXIoXHJcblx0XHRcdHQoXCJTZWN0aW9uIG5hbWUgaW4gdGFyZ2V0IGZpbGVcIilcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gU2V0IGluaXRpYWwgdmFsdWUgaWYgZXhpc3RzXHJcblx0XHRpZiAoZHVwbGljYXRlQ29uZmlnLnRhcmdldFNlY3Rpb24pIHtcclxuXHRcdFx0dGhpcy50YXJnZXRTZWN0aW9uSW5wdXQuc2V0VmFsdWUoZHVwbGljYXRlQ29uZmlnLnRhcmdldFNlY3Rpb24pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMudGFyZ2V0U2VjdGlvbklucHV0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0dGhpcy5jdXJyZW50Q29uZmlnICYmXHJcblx0XHRcdFx0dGhpcy5jdXJyZW50Q29uZmlnLnR5cGUgPT09IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuRFVQTElDQVRFXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHRoaXMuaXNVc2VyQ29uZmlndXJpbmcgPSB0cnVlOyAvLyBNYXJrIGFzIHVzZXIgY29uZmlndXJpbmdcclxuXHRcdFx0XHQodGhpcy5jdXJyZW50Q29uZmlnIGFzIGFueSkudGFyZ2V0U2VjdGlvbiA9IHZhbHVlIHx8IHVuZGVmaW5lZDtcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZVZhbHVlKCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFByZXNlcnZlIG1ldGFkYXRhIHRvZ2dsZVxyXG5cdFx0Y29uc3QgcHJlc2VydmVNZXRhZGF0YUNvbnRhaW5lciA9IHRoaXMuY29uZmlnQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJvbmNvbXBsZXRpb24tZmllbGRcIixcclxuXHRcdH0pO1xyXG5cdFx0cHJlc2VydmVNZXRhZGF0YUNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwib25jb21wbGV0aW9uLWxhYmVsXCIsXHJcblx0XHRcdHRleHQ6IHQoXCJQcmVzZXJ2ZSBNZXRhZGF0YVwiKSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMucHJlc2VydmVNZXRhZGF0YVRvZ2dsZSA9IG5ldyBUb2dnbGVDb21wb25lbnQoXHJcblx0XHRcdHByZXNlcnZlTWV0YWRhdGFDb250YWluZXJcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gU2V0IGluaXRpYWwgdmFsdWUgaWYgZXhpc3RzXHJcblx0XHRpZiAoZHVwbGljYXRlQ29uZmlnLnByZXNlcnZlTWV0YWRhdGEgIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHR0aGlzLnByZXNlcnZlTWV0YWRhdGFUb2dnbGUuc2V0VmFsdWUoXHJcblx0XHRcdFx0ZHVwbGljYXRlQ29uZmlnLnByZXNlcnZlTWV0YWRhdGFcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnByZXNlcnZlTWV0YWRhdGFUb2dnbGUub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHR0aGlzLmN1cnJlbnRDb25maWcgJiZcclxuXHRcdFx0XHR0aGlzLmN1cnJlbnRDb25maWcudHlwZSA9PT0gT25Db21wbGV0aW9uQWN0aW9uVHlwZS5EVVBMSUNBVEVcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0dGhpcy5pc1VzZXJDb25maWd1cmluZyA9IHRydWU7IC8vIE1hcmsgYXMgdXNlciBjb25maWd1cmluZ1xyXG5cdFx0XHRcdCh0aGlzLmN1cnJlbnRDb25maWcgYXMgYW55KS5wcmVzZXJ2ZU1ldGFkYXRhID0gdmFsdWU7XHJcblx0XHRcdFx0dGhpcy51cGRhdGVWYWx1ZSgpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRwcmVzZXJ2ZU1ldGFkYXRhQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJvbmNvbXBsZXRpb24tZGVzY3JpcHRpb25cIixcclxuXHRcdFx0dGV4dDogdChcclxuXHRcdFx0XHRcIktlZXAgY29tcGxldGlvbiBkYXRlcyBhbmQgb3RoZXIgbWV0YWRhdGEgaW4gdGhlIGR1cGxpY2F0ZWQgdGFza1wiXHJcblx0XHRcdCksXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgdXBkYXRlVmFsdWUoKSB7XHJcblx0XHRpZiAoIXRoaXMuY3VycmVudENvbmZpZykge1xyXG5cdFx0XHR0aGlzLmN1cnJlbnRSYXdWYWx1ZSA9IFwiXCI7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBHZW5lcmF0ZSBzaW1wbGUgZm9ybWF0IGZvciBiYXNpYyBhY3Rpb25zLCBKU09OIGZvciBjb21wbGV4IG9uZXNcclxuXHRcdFx0dGhpcy5jdXJyZW50UmF3VmFsdWUgPSB0aGlzLmdlbmVyYXRlUmF3VmFsdWUodGhpcy5jdXJyZW50Q29uZmlnKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTa2lwIHZhbGlkYXRpb24gZm9yIG5vdyBzaW5jZSBPbkNvbXBsZXRpb25NYW5hZ2VyIGlzIGJlaW5nIHJlbW92ZWRcclxuXHRcdC8vIFRoaXMgdmFsaWRhdGlvbiB3aWxsIG5lZWQgdG8gYmUgcmVpbXBsZW1lbnRlZCBpbiBEYXRhZmxvd1xyXG5cdFx0Y29uc3QgaXNWYWxpZCA9IHRydWU7IC8vIFRlbXBvcmFyaWx5IGFzc3VtZSB2YWxpZFxyXG5cclxuXHRcdC8vIE5vdGlmeSBhYm91dCBjaGFuZ2VzIG9ubHkgaWYgbm90IGFuIGludGVybmFsIHVwZGF0ZVxyXG5cdFx0Ly8gQWxsb3cgb25DaGFuZ2UgZm9yIHVzZXIgY29uZmlndXJhdGlvbiBldmVuIGR1cmluZyBpbnRlcm5hbCB1cGRhdGVzXHJcblx0XHRpZiAoXHJcblx0XHRcdCghdGhpcy5pc0ludGVybmFsVXBkYXRlIHx8IHRoaXMuaXNVc2VyQ29uZmlndXJpbmcpICYmXHJcblx0XHRcdHRoaXMub3B0aW9ucy5vbkNoYW5nZVxyXG5cdFx0KSB7XHJcblx0XHRcdHRoaXMub3B0aW9ucy5vbkNoYW5nZSh0aGlzLmN1cnJlbnRSYXdWYWx1ZSk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHRoaXMub3B0aW9ucy5vblZhbGlkYXRpb25DaGFuZ2UpIHtcclxuXHRcdFx0dGhpcy5vcHRpb25zLm9uVmFsaWRhdGlvbkNoYW5nZShpc1ZhbGlkLCB1bmRlZmluZWQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBnZW5lcmF0ZVJhd1ZhbHVlKGNvbmZpZzogT25Db21wbGV0aW9uQ29uZmlnKTogc3RyaW5nIHtcclxuXHRcdHN3aXRjaCAoY29uZmlnLnR5cGUpIHtcclxuXHRcdFx0Y2FzZSBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkRFTEVURTpcclxuXHRcdFx0XHRyZXR1cm4gXCJkZWxldGVcIjtcclxuXHRcdFx0Y2FzZSBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLktFRVA6XHJcblx0XHRcdFx0cmV0dXJuIFwia2VlcFwiO1xyXG5cdFx0XHRjYXNlIE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQVJDSElWRTpcclxuXHRcdFx0XHRjb25zdCBhcmNoaXZlQ29uZmlnID0gY29uZmlnIGFzIGFueTtcclxuXHRcdFx0XHRpZiAoYXJjaGl2ZUNvbmZpZy5hcmNoaXZlRmlsZSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGBhcmNoaXZlOiR7YXJjaGl2ZUNvbmZpZy5hcmNoaXZlRmlsZX1gO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gXCJhcmNoaXZlXCI7XHJcblx0XHRcdGNhc2UgT25Db21wbGV0aW9uQWN0aW9uVHlwZS5DT01QTEVURTpcclxuXHRcdFx0XHRjb25zdCBjb21wbGV0ZUNvbmZpZyA9IGNvbmZpZyBhcyBhbnk7XHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0Y29tcGxldGVDb25maWcudGFza0lkcyAmJlxyXG5cdFx0XHRcdFx0Y29tcGxldGVDb25maWcudGFza0lkcy5sZW5ndGggPiAwXHJcblx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gYGNvbXBsZXRlOiR7Y29tcGxldGVDb25maWcudGFza0lkcy5qb2luKFwiLFwiKX1gO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gXCJjb21wbGV0ZTpcIjsgLy8gUmV0dXJuIHBhcnRpYWwgY29uZmlnIGluc3RlYWQgb2YgZW1wdHkgc3RyaW5nXHJcblx0XHRcdGNhc2UgT25Db21wbGV0aW9uQWN0aW9uVHlwZS5NT1ZFOlxyXG5cdFx0XHRcdGNvbnN0IG1vdmVDb25maWcgPSBjb25maWcgYXMgYW55O1xyXG5cdFx0XHRcdGlmIChtb3ZlQ29uZmlnLnRhcmdldEZpbGUpIHtcclxuXHRcdFx0XHRcdHJldHVybiBgbW92ZToke21vdmVDb25maWcudGFyZ2V0RmlsZX1gO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gXCJtb3ZlOlwiOyAvLyBSZXR1cm4gcGFydGlhbCBjb25maWcgaW5zdGVhZCBvZiBlbXB0eSBzdHJpbmdcclxuXHRcdFx0Y2FzZSBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkRVUExJQ0FURTpcclxuXHRcdFx0XHRjb25zdCBkdXBsaWNhdGVDb25maWcgPSBjb25maWcgYXMgYW55O1xyXG5cdFx0XHRcdC8vIFVzZSBKU09OIGZvcm1hdCBmb3IgY29tcGxleCBkdXBsaWNhdGUgY29uZmlndXJhdGlvbnNcclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRkdXBsaWNhdGVDb25maWcudGFyZ2V0RmlsZSB8fFxyXG5cdFx0XHRcdFx0ZHVwbGljYXRlQ29uZmlnLnRhcmdldFNlY3Rpb24gfHxcclxuXHRcdFx0XHRcdGR1cGxpY2F0ZUNvbmZpZy5wcmVzZXJ2ZU1ldGFkYXRhXHJcblx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gSlNPTi5zdHJpbmdpZnkoY29uZmlnKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cmV0dXJuIFwiZHVwbGljYXRlXCI7XHJcblx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0cmV0dXJuIEpTT04uc3RyaW5naWZ5KGNvbmZpZyk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgc2V0VmFsdWUodmFsdWU6IHN0cmluZykge1xyXG5cdFx0dGhpcy5jdXJyZW50UmF3VmFsdWUgPSB2YWx1ZTtcclxuXHJcblx0XHQvLyBQYXJzZSB0aGUgdmFsdWUgbWFudWFsbHkgZm9yIG5vdyBzaW5jZSBPbkNvbXBsZXRpb25NYW5hZ2VyIGlzIGJlaW5nIHJlbW92ZWRcclxuXHRcdC8vIFRoaXMgcGFyc2luZyB3aWxsIG5lZWQgdG8gYmUgcmVpbXBsZW1lbnRlZCBpbiBEYXRhZmxvd1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgY29uZmlnID0gdGhpcy5wYXJzZU9uQ29tcGxldGlvblZhbHVlKHZhbHVlKTtcclxuXHRcdFx0aWYgKGNvbmZpZykge1xyXG5cdFx0XHRcdHRoaXMuY3VycmVudENvbmZpZyA9IGNvbmZpZztcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZVVJRnJvbUNvbmZpZyhjb25maWcpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMuY3VycmVudENvbmZpZyA9IG51bGw7XHJcblx0XHRcdFx0dGhpcy5hY3Rpb25UeXBlRHJvcGRvd24uc2V0VmFsdWUoXCJcIik7XHJcblx0XHRcdFx0dGhpcy5jb25maWdDb250YWluZXIuZW1wdHkoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHR0aGlzLmN1cnJlbnRDb25maWcgPSBudWxsO1xyXG5cdFx0XHR0aGlzLmFjdGlvblR5cGVEcm9wZG93bi5zZXRWYWx1ZShcIlwiKTtcclxuXHRcdFx0dGhpcy5jb25maWdDb250YWluZXIuZW1wdHkoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgdXBkYXRlVUlGcm9tQ29uZmlnKGNvbmZpZzogT25Db21wbGV0aW9uQ29uZmlnKSB7XHJcblx0XHR0aGlzLmFjdGlvblR5cGVEcm9wZG93bi5zZXRWYWx1ZShjb25maWcudHlwZSk7XHJcblx0XHQvLyBVc2UgaW5pdGlhbGl6YXRpb24gbWV0aG9kIGluc3RlYWQgb2Ygb25BY3Rpb25UeXBlQ2hhbmdlIHRvIHByZXNlcnZlIGNvbmZpZ1xyXG5cdFx0Ly8gVGhlIGluaXRpYWxpemVVSUZvckFjdGlvblR5cGUgbWV0aG9kIG5vdyBoYW5kbGVzIHNldHRpbmcgYWxsIGlucHV0IHZhbHVlc1xyXG5cdFx0dGhpcy5pbml0aWFsaXplVUlGb3JBY3Rpb25UeXBlKGNvbmZpZy50eXBlLCBjb25maWcpO1xyXG5cdH1cclxuXHJcblx0cHVibGljIGdldFZhbHVlKCk6IHN0cmluZyB7XHJcblx0XHRyZXR1cm4gdGhpcy5jdXJyZW50UmF3VmFsdWU7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgZ2V0Q29uZmlnKCk6IE9uQ29tcGxldGlvbkNvbmZpZyB8IG51bGwge1xyXG5cdFx0cmV0dXJuIHRoaXMuY3VycmVudENvbmZpZztcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBpc1ZhbGlkKCk6IGJvb2xlYW4ge1xyXG5cdFx0Ly8gVGVtcG9yYXJpbHkgcmV0dXJuIHRydWUgdW50aWwgT25Db21wbGV0aW9uIHBhcnNpbmcgaXMgcmVpbXBsZW1lbnRlZCBpbiBEYXRhZmxvd1xyXG5cdFx0cmV0dXJuIHRoaXMuY3VycmVudENvbmZpZyAhPT0gbnVsbDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFRlbXBvcmFyeSBwYXJzaW5nIG1ldGhvZCB1bnRpbCBPbkNvbXBsZXRpb24gaXMgcmVpbXBsZW1lbnRlZCBpbiBEYXRhZmxvd1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgcGFyc2VPbkNvbXBsZXRpb25WYWx1ZSh2YWx1ZTogc3RyaW5nKTogT25Db21wbGV0aW9uQ29uZmlnIHwgbnVsbCB7XHJcblx0XHRpZiAoIXZhbHVlKSByZXR1cm4gbnVsbDtcclxuXHRcdFxyXG5cdFx0Y29uc3QgdHJpbW1lZCA9IHZhbHVlLnRyaW0oKTtcclxuXHRcdFxyXG5cdFx0Ly8gU2ltcGxlIGFjdGlvbnNcclxuXHRcdGlmICh0cmltbWVkID09PSAnZGVsZXRlJykgcmV0dXJuIHsgdHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5ERUxFVEUgfTtcclxuXHRcdGlmICh0cmltbWVkID09PSAna2VlcCcpIHJldHVybiB7IHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuS0VFUCB9O1xyXG5cdFx0aWYgKHRyaW1tZWQgPT09ICdkdXBsaWNhdGUnKSByZXR1cm4geyB0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkRVUExJQ0FURSB9O1xyXG5cdFx0XHJcblx0XHQvLyBBcmNoaXZlIGFjdGlvblxyXG5cdFx0aWYgKHRyaW1tZWQgPT09ICdhcmNoaXZlJykgcmV0dXJuIHsgdHlwZTogT25Db21wbGV0aW9uQWN0aW9uVHlwZS5BUkNISVZFIH07XHJcblx0XHRpZiAodHJpbW1lZC5zdGFydHNXaXRoKCdhcmNoaXZlOicpKSB7XHJcblx0XHRcdGNvbnN0IGFyY2hpdmVGaWxlID0gdHJpbW1lZC5zdWJzdHJpbmcoOCkudHJpbSgpO1xyXG5cdFx0XHRyZXR1cm4geyB0eXBlOiBPbkNvbXBsZXRpb25BY3Rpb25UeXBlLkFSQ0hJVkUsIGFyY2hpdmVGaWxlIH0gYXMgYW55O1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvLyBDb21wbGV0ZSBhY3Rpb25cclxuXHRcdGlmICh0cmltbWVkLnN0YXJ0c1dpdGgoJ2NvbXBsZXRlOicpKSB7XHJcblx0XHRcdGNvbnN0IHRhc2tJZHNTdHIgPSB0cmltbWVkLnN1YnN0cmluZyg5KS50cmltKCk7XHJcblx0XHRcdGNvbnN0IHRhc2tJZHMgPSB0YXNrSWRzU3RyID8gdGFza0lkc1N0ci5zcGxpdCgnLCcpLm1hcChpZCA9PiBpZC50cmltKCkpIDogW107XHJcblx0XHRcdHJldHVybiB7IHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuQ09NUExFVEUsIHRhc2tJZHMgfSBhcyBhbnk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdC8vIE1vdmUgYWN0aW9uXHJcblx0XHRpZiAodHJpbW1lZC5zdGFydHNXaXRoKCdtb3ZlOicpKSB7XHJcblx0XHRcdGNvbnN0IHRhcmdldEZpbGUgPSB0cmltbWVkLnN1YnN0cmluZyg1KS50cmltKCk7XHJcblx0XHRcdHJldHVybiB7IHR5cGU6IE9uQ29tcGxldGlvbkFjdGlvblR5cGUuTU9WRSwgdGFyZ2V0RmlsZSB9IGFzIGFueTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Ly8gVHJ5IEpTT04gcGFyc2luZyBmb3IgY29tcGxleCBjb25maWd1cmF0aW9uc1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZSh0cmltbWVkKTtcclxuXHRcdFx0aWYgKHBhcnNlZCAmJiBwYXJzZWQudHlwZSkge1xyXG5cdFx0XHRcdHJldHVybiBwYXJzZWQ7XHJcblx0XHRcdH1cclxuXHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0Ly8gTm90IEpTT04sIGlnbm9yZVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XHJcblxyXG5cdG9udW5sb2FkKCkge1xyXG5cdFx0dGhpcy5jb250YWluZXJFbC5yZW1vdmUoKTtcclxuXHR9XHJcbn1cclxuIl19