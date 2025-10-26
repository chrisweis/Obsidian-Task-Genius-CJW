import { __awaiter } from "tslib";
import { Component, ExtraButtonComponent, Modal, Notice, Platform, setIcon, } from "obsidian";
import { t } from "@/translations/helper";
import "@/styles/review-view.css"; // Assuming styles will be added here
import { TaskListRendererComponent } from "./TaskList"; // Import the base renderer
const DAY_MAP = {
    daily: 1,
    weekly: 7,
    "every 2 weeks": 14,
    monthly: 30,
    quarterly: 90,
    "every 6 months": 180,
    yearly: 365,
};
class ReviewConfigureModal extends Modal {
    constructor(app, plugin, projectName, existingSetting, onSave) {
        super(app);
        this.frequency = "";
        this.frequencyOptions = [
            "daily",
            "weekly",
            "every 2 weeks",
            "monthly",
            "quarterly",
            "every 6 months",
            "yearly",
        ];
        this.projectName = projectName;
        this.existingSetting = existingSetting;
        this.plugin = plugin;
        this.onSave = onSave;
        // Initialize with existing setting if present
        if (existingSetting && existingSetting.frequency) {
            this.frequency = existingSetting.frequency;
        }
        else {
            this.frequency = "weekly"; // Default value
        }
    }
    onOpen() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const { contentEl } = this;
            // Add title
            contentEl.createEl("h2", {
                text: t("Configure Review for") + ` "${this.projectName}"`,
                cls: "review-modal-title",
            });
            // Create form container
            const formContainer = contentEl.createDiv({
                cls: "review-modal-form",
            });
            // Frequency selection
            const frequencyContainer = formContainer.createDiv({
                cls: "review-modal-field",
            });
            // Label
            frequencyContainer.createEl("label", {
                text: t("Review Frequency"),
                cls: "review-modal-label",
                attr: { for: "review-frequency" },
            });
            // Description
            frequencyContainer.createEl("div", {
                text: t("How often should this project be reviewed"),
                cls: "review-modal-description",
            });
            // Create dropdown for frequency
            const frequencySelect = frequencyContainer.createEl("select", {
                cls: "review-modal-select",
                attr: { id: "review-frequency" },
            });
            // Add frequency options
            this.frequencyOptions.forEach((option) => {
                const optionEl = frequencySelect.createEl("option", {
                    text: option,
                    value: option,
                });
                if (option === this.frequency) {
                    optionEl.selected = true;
                }
            });
            // Custom frequency option
            const customOption = frequencySelect.createEl("option", {
                text: t("Custom..."),
                value: "custom",
            });
            // Custom frequency input (initially hidden)
            const customFrequencyContainer = frequencyContainer.createDiv({
                cls: "review-modal-custom-frequency",
            });
            customFrequencyContainer.style.display = "none";
            const customFrequencyInput = customFrequencyContainer.createEl("input", {
                cls: "review-modal-input",
                attr: {
                    type: "text",
                    placeholder: t("e.g., every 3 months"),
                },
            });
            // Show/hide custom input based on dropdown selection
            frequencySelect.addEventListener("change", (e) => {
                const value = e.target.value;
                if (value === "custom") {
                    customFrequencyContainer.style.display = "block";
                    customFrequencyInput.focus();
                    this.frequency = ""; // Reset frequency when switching to custom
                }
                else {
                    customFrequencyContainer.style.display = "none";
                    this.frequency = value;
                }
            });
            // Update frequency when typing in custom input
            customFrequencyInput.addEventListener("input", (e) => {
                this.frequency = e.target.value;
            });
            // If existing setting has a custom frequency that's not in the dropdown,
            // select the custom option and show the custom input
            if (this.frequency && !this.frequencyOptions.includes(this.frequency)) {
                customOption.selected = true;
                customFrequencyContainer.style.display = "block";
                customFrequencyInput.value = this.frequency;
            }
            // Last reviewed information
            const lastReviewedInfo = formContainer.createDiv({
                cls: "review-modal-field",
            });
            lastReviewedInfo.createEl("label", {
                text: t("Last Reviewed"),
                cls: "review-modal-label",
            });
            const lastReviewedText = ((_a = this.existingSetting) === null || _a === void 0 ? void 0 : _a.lastReviewed)
                ? new Date(this.existingSetting.lastReviewed).toLocaleString()
                : "Never";
            lastReviewedInfo.createEl("div", {
                text: lastReviewedText,
                cls: "review-modal-last-reviewed",
            });
            // Buttons
            const buttonContainer = contentEl.createDiv({
                cls: "review-modal-buttons",
            });
            // Cancel button
            const cancelButton = buttonContainer.createEl("button", {
                text: t("Cancel"),
                cls: "review-modal-button review-modal-button-cancel",
            });
            cancelButton.addEventListener("click", () => {
                this.close();
            });
            // Save button
            const saveButton = buttonContainer.createEl("button", {
                text: t("Save"),
                cls: "review-modal-button review-modal-button-save",
            });
            saveButton.addEventListener("click", () => {
                this.saveSettings();
            });
        });
    }
    validateFrequency() {
        if (!this.frequency || this.frequency.trim() === "") {
            new Notice(t("Please specify a review frequency"));
            return false;
        }
        return true;
    }
    saveSettings() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.validateFrequency()) {
                return;
            }
            // Create or update setting
            const updatedSetting = {
                frequency: this.frequency,
                lastReviewed: ((_a = this.existingSetting) === null || _a === void 0 ? void 0 : _a.lastReviewed) || undefined,
                reviewedTaskIds: ((_b = this.existingSetting) === null || _b === void 0 ? void 0 : _b.reviewedTaskIds) || [],
            };
            // Update plugin settings
            this.plugin.settings.reviewSettings[this.projectName] = updatedSetting;
            yield this.plugin.saveSettings();
            // Notify parent component
            this.onSave(updatedSetting);
            // Show confirmation and close
            new Notice(t("Review schedule updated for") + ` ${this.projectName}`);
            this.close();
        });
    }
    onClose() {
        return __awaiter(this, void 0, void 0, function* () {
            const { contentEl } = this;
            contentEl.empty();
        });
    }
}
export class ReviewComponent extends Component {
    constructor(parentEl, app, plugin, params = {}) {
        super();
        this.parentEl = parentEl;
        this.app = app;
        this.plugin = plugin;
        this.params = params;
        // State
        this.allTasks = [];
        this.reviewableProjects = new Map();
        this.selectedProject = {
            project: null,
            tasks: [],
            setting: null,
        };
        this.showAllTasks = false; // Default to filtered view
        this.allTasksMap = new Map();
    }
    onload() {
        // Create main container
        this.containerEl = this.parentEl.createDiv({
            cls: "review-container",
        });
        // Create content container for columns
        const contentContainer = this.containerEl.createDiv({
            cls: "review-content",
        });
        // Left column: create projects list
        this.createLeftColumn(contentContainer);
        // Right column: create task list for selected project
        this.createRightColumn(contentContainer);
        // Initialize the task renderer
        this.taskRenderer = new TaskListRendererComponent(this, // Parent component
        this.taskListContainerEl, // Container element
        this.plugin, this.app, "review" // Context
        );
        // Connect event handlers
        this.taskRenderer.onTaskSelected = (task) => {
            if (this.params.onTaskSelected)
                this.params.onTaskSelected(task);
        };
        this.taskRenderer.onTaskCompleted = (task) => {
            if (this.params.onTaskCompleted)
                this.params.onTaskCompleted(task);
            // Potentially add review completion logic here later
        };
        this.taskRenderer.onTaskUpdate = (originalTask, updatedTask) => __awaiter(this, void 0, void 0, function* () {
            if (this.params.onTaskUpdate) {
                yield this.params.onTaskUpdate(originalTask, updatedTask);
            }
        });
        this.taskRenderer.onTaskContextMenu = (event, task) => {
            if (this.params.onTaskContextMenu)
                this.params.onTaskContextMenu(event, task);
        };
        // Don't load initial data here - wait for setTasks to be called
        // this.loadReviewSettings();
        // Show empty state initially
        this.renderEmptyTaskList(t("Select a project to review its tasks."));
    }
    createLeftColumn(parentEl) {
        this.leftColumnEl = parentEl.createDiv({
            cls: "review-left-column", // Specific class
        });
        // Add close button for mobile
        if (Platform.isPhone) {
            const closeBtn = this.leftColumnEl.createDiv({
                cls: "review-sidebar-close",
            });
            new ExtraButtonComponent(closeBtn).setIcon("x").onClick(() => {
                this.toggleLeftColumnVisibility(false);
            });
        }
        // Header for the projects section
        const headerEl = this.leftColumnEl.createDiv({
            cls: "review-sidebar-header",
        });
        const headerTitle = headerEl.createDiv({
            cls: "review-sidebar-title",
            text: t("Review Projects"), // Title specific to review
        });
        // TODO: Add button to configure review settings?
        // Projects list container
        this.projectsListEl = this.leftColumnEl.createDiv({
            cls: "review-sidebar-list",
        });
    }
    createRightColumn(parentEl) {
        this.taskContainerEl = parentEl.createDiv({
            cls: "review-right-column",
        });
        // Task list header - will be populated when a project is selected
        this.taskHeaderEl = this.taskContainerEl.createDiv({
            cls: "review-task-header",
        });
        // Add sidebar toggle button for mobile
        if (Platform.isPhone) {
            this.taskHeaderEl.createEl("div", {
                cls: "review-sidebar-toggle",
            }, (el) => {
                new ExtraButtonComponent(el)
                    .setIcon("sidebar")
                    .onClick(() => {
                    this.toggleLeftColumnVisibility();
                });
            });
        }
        // Task list container - This is where the renderer will place tasks
        this.taskListContainerEl = this.taskContainerEl.createDiv({
            cls: "review-task-list",
        });
    }
    loadReviewSettings() {
        this.reviewableProjects.clear();
        const settings = this.plugin.settings.reviewSettings;
        // Get all unique projects from tasks
        const allProjects = new Set();
        this.allTasks.forEach((task) => {
            if (task.metadata.project) {
                allProjects.add(task.metadata.project);
            }
        });
        // Add all projects to the sidebar, marking ones with review settings
        for (const projectName of allProjects) {
            // If the project has review settings, use them
            if (settings[projectName]) {
                this.reviewableProjects.set(projectName, settings[projectName]);
            }
            else {
                // For projects without review settings, add with a placeholder setting
                // We'll render these differently in the UI
                const placeholderSetting = {
                    frequency: "",
                    lastReviewed: undefined,
                    reviewedTaskIds: [],
                };
                this.reviewableProjects.set(projectName, placeholderSetting);
            }
        }
        console.log("Loaded Projects:", this.reviewableProjects);
        this.renderProjectsList();
        // If a project is currently selected but no longer available, clear the selection
        if (this.selectedProject.project &&
            !this.allTasks.some((t) => t.metadata.project === this.selectedProject.project)) {
            this.clearSelection();
        }
        else if (this.selectedProject.project) {
            // If a project is already selected and still valid, refresh its view
            this.selectProject(this.selectedProject.project);
        }
        else {
            // No project selected, show empty state
            this.renderEmptyTaskList(t("Select a project to review its tasks."));
        }
    }
    /**
     * Clear the current project selection
     */
    clearSelection() {
        this.selectedProject = { project: null, tasks: [], setting: null };
        // Update UI to remove selection highlight
        const projectItems = this.projectsListEl.querySelectorAll(".review-project-item");
        projectItems.forEach((item) => item.classList.remove("selected"));
        // Show empty task list
        this.renderEmptyTaskList(t("Select a project to review its tasks."));
    }
    setTasks(tasks) {
        console.log("ReviewComponent.setTasks called with", tasks.length, "tasks");
        this.allTasks = tasks;
        // Reload settings potentially, in case a project relevant to settings was added/removed
        // Or just filter existing settings based on current tasks
        this.loadReviewSettings(); // Reload and filter settings based on potentially new tasks
        // Note: loadReviewSettings already handles re-selecting or selecting the first project
    }
    renderProjectsList() {
        this.projectsListEl.empty();
        const sortedProjects = Array.from(this.reviewableProjects.keys()).sort();
        // First display projects with review settings
        const projectsWithSettings = sortedProjects.filter((projectName) => {
            const setting = this.reviewableProjects.get(projectName);
            return setting && setting.frequency;
        });
        // Then display projects without review settings
        const projectsWithoutSettings = sortedProjects.filter((projectName) => {
            const setting = this.reviewableProjects.get(projectName);
            return !setting || !setting.frequency;
        });
        // Helper function to render a project item
        const renderProjectItem = (projectName) => {
            const projectSetting = this.reviewableProjects.get(projectName);
            if (!projectSetting)
                return; // Should not happen
            const projectItem = this.projectsListEl.createDiv({
                cls: "review-project-item", // Specific class
            });
            projectItem.dataset.project = projectName; // Store project name
            // Add class if the project has review settings configured
            if (projectSetting.frequency) {
                projectItem.addClass("has-review-settings");
            }
            // Add class if review is due
            if (this.isReviewDue(projectSetting)) {
                projectItem.addClass("is-review-due");
            }
            // Icon
            const iconEl = projectItem.createDiv({
                cls: "review-project-icon",
            });
            // Use different icon based on whether project has review settings
            setIcon(iconEl, projectSetting.frequency ? "folder-check" : "folder");
            // Name
            const nameEl = projectItem.createDiv({
                cls: "review-project-name",
            });
            nameEl.setText(projectName);
            // Highlight if selected
            if (this.selectedProject.project === projectName) {
                projectItem.addClass("selected");
            }
            // Click handler
            this.registerDomEvent(projectItem, "click", () => {
                this.selectProject(projectName);
            });
        };
        // If there are projects with settings, add a header
        if (projectsWithSettings.length > 0) {
            const withSettingsHeader = this.projectsListEl.createDiv({
                cls: "review-projects-group-header",
            });
            withSettingsHeader.setText(t("Configured for Review"));
            // Render projects with review settings
            projectsWithSettings.forEach(renderProjectItem);
        }
        // If there are projects without settings, add a header
        if (projectsWithoutSettings.length > 0) {
            const withoutSettingsHeader = this.projectsListEl.createDiv({
                cls: "review-projects-group-header",
            });
            withoutSettingsHeader.setText(t("Not Configured"));
            // Render projects without review settings
            projectsWithoutSettings.forEach(renderProjectItem);
        }
        if (sortedProjects.length === 0) {
            const emptyEl = this.projectsListEl.createDiv({
                cls: "review-empty-state", // Use a specific class if needed
            });
            emptyEl.setText(t("No projects available."));
        }
    }
    selectProject(projectName) {
        // Handle deselection or selecting non-existent project
        if (!projectName || !this.reviewableProjects.has(projectName)) {
            this.selectedProject = { project: null, tasks: [], setting: null };
            this.renderEmptyTaskList(t("Select a project to review."));
            // Update UI to remove selection highlight
            const projectItems = this.projectsListEl.querySelectorAll(".review-project-item");
            projectItems.forEach((item) => item.classList.remove("selected"));
            return;
        }
        const setting = this.reviewableProjects.get(projectName);
        if (!setting)
            return; // Should be caught above, but safety check
        this.selectedProject.project = projectName;
        this.selectedProject.setting = setting;
        // Update UI highlighting
        const projectItems = this.projectsListEl.querySelectorAll(".review-project-item");
        projectItems.forEach((item) => {
            if (item.getAttribute("data-project") === projectName) {
                item.classList.add("selected");
            }
            else {
                item.classList.remove("selected");
            }
        });
        // Hide sidebar on mobile after selection
        if (Platform.isPhone) {
            this.toggleLeftColumnVisibility(false);
        }
        // Load and render tasks for this project
        this.updateSelectedProjectTasks();
    }
    updateSelectedProjectTasks() {
        if (!this.selectedProject.project) {
            // Use renderer's empty state
            this.renderEmptyTaskList(t("Select a project to review its tasks."));
            return;
        }
        // Filter tasks for the selected project
        const allProjectTasks = this.allTasks.filter((task) => task.metadata.project === this.selectedProject.project);
        // Get review settings for the selected project
        const reviewSetting = this.selectedProject.setting;
        // Array to store filtered tasks that should be displayed
        let filteredTasks = [];
        // Clear any existing filter info
        const taskHeaderContent = this.taskHeaderEl.querySelector(".review-header-content");
        const existingFilterInfo = taskHeaderContent === null || taskHeaderContent === void 0 ? void 0 : taskHeaderContent.querySelector(".review-filter-info");
        if (existingFilterInfo) {
            existingFilterInfo.remove();
        }
        if (reviewSetting && reviewSetting.lastReviewed && !this.showAllTasks) {
            // If project has been reviewed before and we're not showing all tasks, filter the tasks
            const lastReviewDate = reviewSetting.lastReviewed;
            const reviewedTaskIds = new Set(reviewSetting.reviewedTaskIds || []);
            // Filter tasks to only show:
            // 1. Tasks that were created after the last review date
            // 2. Tasks that existed during last review but weren't completed then and still aren't completed
            // 3. Tasks that are in progress (might have been modified since last review)
            filteredTasks = allProjectTasks.filter((task) => {
                // Always include incomplete new tasks (created after last review)
                if (task.metadata.createdDate &&
                    task.metadata.createdDate > lastReviewDate) {
                    return true;
                }
                // If task was already reviewed in previous review and is now completed, exclude it
                if (reviewedTaskIds.has(task.id) && task.completed) {
                    return false;
                }
                // Include tasks that were reviewed before but aren't completed yet
                if (reviewedTaskIds.has(task.id) && !task.completed) {
                    return true;
                }
                // Include tasks that weren't reviewed before (they might be older tasks
                // that were added to this project after the last review)
                if (!reviewedTaskIds.has(task.id)) {
                    return true;
                }
                return false;
            });
            // Add a message about filtered tasks if some were filtered out
            if (filteredTasks.length < allProjectTasks.length &&
                taskHeaderContent) {
                const filterInfo = taskHeaderContent.createDiv({
                    cls: "review-filter-info",
                });
                const hiddenTasks = allProjectTasks.length - filteredTasks.length;
                const filterText = filterInfo.createSpan({
                    text: t(`Showing new and in-progress tasks only. ${hiddenTasks} completed tasks from previous reviews are hidden.`),
                });
                // Add toggle link
                const toggleLink = filterInfo.createSpan({
                    cls: "review-filter-toggle",
                    text: t("Show all tasks"),
                });
                this.registerDomEvent(toggleLink, "click", () => {
                    this.toggleShowAllTasks();
                });
            }
        }
        else {
            // If the project has never been reviewed or we're showing all tasks
            filteredTasks = allProjectTasks;
            // If we're explicitly showing all tasks, display this info
            if (this.showAllTasks &&
                taskHeaderContent &&
                (reviewSetting === null || reviewSetting === void 0 ? void 0 : reviewSetting.lastReviewed)) {
                const filterInfo = taskHeaderContent.createDiv({
                    cls: "review-filter-info",
                });
                const filterText = filterInfo.createSpan({
                    text: t("Showing all tasks, including completed tasks from previous reviews."),
                });
                // Add toggle link
                const toggleLink = filterInfo.createSpan({
                    cls: "review-filter-toggle",
                    text: t("Show only new and in-progress tasks"),
                });
                this.registerDomEvent(toggleLink, "click", () => {
                    this.toggleShowAllTasks();
                });
            }
        }
        // Update the selected project's tasks
        this.selectedProject.tasks = filteredTasks;
        // Sort tasks (example: by due date, then priority)
        this.selectedProject.tasks.sort((a, b) => {
            // First by completion status (incomplete first)
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            // Then by due date (early to late, nulls last)
            const dueDateA = a.metadata.dueDate
                ? new Date(a.metadata.dueDate).getTime()
                : Number.MAX_SAFE_INTEGER;
            const dueDateB = b.metadata.dueDate
                ? new Date(b.metadata.dueDate).getTime()
                : Number.MAX_SAFE_INTEGER;
            if (dueDateA !== dueDateB) {
                return dueDateA - dueDateB;
            }
            // Then by priority (high to low, 0 is lowest)
            const priorityA = a.metadata.priority || 0;
            const priorityB = b.metadata.priority || 0;
            return priorityB - priorityA;
        });
        // Update the task list using the renderer
        this.renderTaskList();
        // Update filter info in header (needs to be called after renderTaskList updates the header)
        this.updateFilterInfoInHeader(allProjectTasks.length, filteredTasks.length);
    }
    updateFilterInfoInHeader(totalTasks, visibleTasks) {
        const taskHeaderContent = this.taskHeaderEl.querySelector(".review-header-content");
        if (!taskHeaderContent)
            return;
        // Clear existing filter info
        const existingFilterInfo = taskHeaderContent.querySelector(".review-filter-info");
        if (existingFilterInfo) {
            existingFilterInfo.remove();
        }
        // Determine which message and toggle to show
        const reviewSetting = this.selectedProject.setting;
        if (reviewSetting === null || reviewSetting === void 0 ? void 0 : reviewSetting.lastReviewed) {
            const hiddenTasks = totalTasks - visibleTasks;
            if (!this.showAllTasks && hiddenTasks > 0) {
                // Showing filtered view
                const filterInfo = taskHeaderContent.createDiv({
                    cls: "review-filter-info",
                });
                filterInfo.createSpan({
                    text: t(`Showing new and in-progress tasks only. ${hiddenTasks} completed tasks from previous reviews are hidden.`),
                });
                const toggleLink = filterInfo.createSpan({
                    cls: "review-filter-toggle",
                    text: t("Show all tasks"),
                });
                this.registerDomEvent(toggleLink, "click", () => {
                    this.toggleShowAllTasks();
                });
            }
            else if (this.showAllTasks && totalTasks > 0) {
                // Showing all tasks explicitly
                const filterInfo = taskHeaderContent.createDiv({
                    cls: "review-filter-info",
                });
                filterInfo.createSpan({
                    text: t("Showing all tasks, including completed tasks from previous reviews."),
                });
                const toggleLink = filterInfo.createSpan({
                    cls: "review-filter-toggle",
                    text: t("Show only new and in-progress tasks"),
                });
                this.registerDomEvent(toggleLink, "click", () => {
                    this.toggleShowAllTasks();
                });
            }
        }
    }
    toggleShowAllTasks() {
        this.showAllTasks = !this.showAllTasks;
        this.updateSelectedProjectTasks(); // This will re-render and update the header info
    }
    renderTaskList() {
        // Renderer handles component cleanup and container clearing
        this.taskHeaderEl.empty(); // Still need to clear/re-render the specific header
        if (Platform.isPhone) {
            this.renderMobileToggle();
        }
        if (!this.selectedProject.project || !this.selectedProject.setting) {
            this.renderEmptyTaskList(t("Select a project to review its tasks."));
            return;
        }
        // --- Render Header ---
        this.renderReviewHeader(this.selectedProject.project, this.selectedProject.setting);
        // --- Render Tasks using Renderer ---
        this.allTasksMap = new Map(this.allTasks.map((task) => [task.id, task]));
        this.taskRenderer.renderTasks(this.selectedProject.tasks, false, // isTreeView = false
        this.allTasksMap, t("No tasks found for this project.") // emptyMessage
        );
    }
    renderReviewHeader(projectName, setting) {
        this.taskHeaderEl.empty(); // Clear previous header content
        if (Platform.isPhone) {
            this.renderMobileToggle();
        }
        const headerContent = this.taskHeaderEl.createDiv({
            cls: "review-header-content",
        });
        // Project Title
        headerContent.createEl("h3", {
            cls: ["review-title", "content-title"],
            text: projectName,
        });
        // Review Info Line (Frequency and Last Reviewed Date)
        const reviewInfoEl = headerContent.createDiv({ cls: "review-info" });
        // Display different content based on whether project has review settings
        if (setting.frequency) {
            // Frequency Text
            const frequencyText = `${t("Review every")} ${setting.frequency}`;
            reviewInfoEl.createSpan({
                cls: "review-frequency",
                text: frequencyText,
            }, (el) => {
                this.registerDomEvent(el, "click", () => {
                    this.openConfigureModal(projectName, setting);
                });
            });
            // Separator
            reviewInfoEl.createSpan({ cls: "review-separator", text: "•" });
            // Last Reviewed Date Text
            const lastReviewedDate = setting.lastReviewed
                ? new Date(setting.lastReviewed).toLocaleDateString()
                : t("never");
            reviewInfoEl.createSpan({
                cls: "review-last-date",
                text: `${t("Last reviewed")}: ${lastReviewedDate}`,
            });
            // Add "Mark as Reviewed" button
            const reviewButtonContainer = headerContent.createDiv({
                cls: "review-button-container",
            });
            const reviewButton = reviewButtonContainer.createEl("button", {
                cls: "review-complete-btn",
                text: t("Mark as Reviewed"),
            });
            this.registerDomEvent(reviewButton, "click", () => {
                this.markProjectAsReviewed(projectName);
            });
        }
        else {
            // No review settings configured message
            reviewInfoEl.createSpan({
                cls: "review-no-settings",
                text: t("No review schedule configured for this project"),
            });
            // Add "Configure Review" button
            const reviewButtonContainer = headerContent.createDiv({
                cls: "review-button-container",
            });
            const configureButton = reviewButtonContainer.createEl("button", {
                cls: "review-configure-btn",
                text: t("Configure Review Schedule"),
            });
            this.registerDomEvent(configureButton, "click", () => {
                this.openConfigureModal(projectName, setting);
            });
        }
    }
    /**
     * Open the configure review modal for a project
     */
    openConfigureModal(projectName, existingSetting) {
        const modal = new ReviewConfigureModal(this.app, this.plugin, projectName, existingSetting, (updatedSetting) => {
            // Update the local state
            if (this.selectedProject.project === projectName) {
                this.selectedProject.setting = updatedSetting;
                this.renderReviewHeader(projectName, updatedSetting);
            }
            // Refresh the projects list to update the styling
            this.loadReviewSettings();
        });
        modal.open();
    }
    /**
     * Mark a project as reviewed, updating the last reviewed timestamp
     * and recording the IDs of current tasks that have been reviewed
     */
    markProjectAsReviewed(projectName) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Marking ${projectName} as reviewed...`);
            const now = Date.now();
            const currentSettings = this.plugin.settings.reviewSettings;
            // Get all current tasks for this project
            const projectTasks = this.allTasks.filter((task) => task.metadata.project === projectName);
            const taskIds = projectTasks.map((task) => task.id);
            if (currentSettings[projectName]) {
                // Update the last reviewed timestamp and record current task IDs
                currentSettings[projectName].lastReviewed = now;
                currentSettings[projectName].reviewedTaskIds = taskIds;
                // Save settings via plugin
                yield this.plugin.saveSettings();
                // Update local state
                this.selectedProject.setting = currentSettings[projectName];
                // Show notice
                new Notice(t(`${projectName} marked as reviewed with ${taskIds.length} tasks`));
                // Update UI - need to refresh task list since we'll now filter out reviewed tasks
                this.renderReviewHeader(projectName, currentSettings[projectName]);
                this.updateSelectedProjectTasks();
            }
            else {
                // If the project doesn't have settings yet, create them
                const newSetting = {
                    frequency: "weekly",
                    lastReviewed: now,
                    reviewedTaskIds: taskIds,
                };
                // Save the new settings
                currentSettings[projectName] = newSetting;
                yield this.plugin.saveSettings();
                // Update local state
                this.selectedProject.setting = newSetting;
                this.reviewableProjects.set(projectName, newSetting);
                // Show notice
                new Notice(t(`${projectName} marked as reviewed with ${taskIds.length} tasks`));
                // Update UI
                this.renderReviewHeader(projectName, newSetting);
                this.renderProjectsList(); // Also refresh the project list to update styling
                this.updateSelectedProjectTasks();
            }
        });
    }
    renderMobileToggle() {
        this.taskHeaderEl.createEl("div", {
            cls: "review-sidebar-toggle",
        }, (el) => {
            new ExtraButtonComponent(el).setIcon("sidebar").onClick(() => {
                this.toggleLeftColumnVisibility();
            });
        });
    }
    renderEmptyTaskList(message) {
        this.taskHeaderEl.empty(); // Clear specific header
        // Add sidebar toggle button for mobile
        if (Platform.isPhone) {
            this.renderMobileToggle();
        }
        // Set default header if no project is selected
        if (!this.selectedProject.project) {
            const defaultHeader = this.taskHeaderEl.createDiv({
                cls: "review-header-content",
            });
            defaultHeader.createEl("h3", {
                cls: ["review-title", "content-title"],
                text: t("Project Review"),
            });
            defaultHeader.createDiv({
                cls: "review-info",
                text: t("Select a project from the left sidebar to review its tasks."),
            });
        }
        this.allTasksMap = new Map(this.allTasks.map((task) => [task.id, task]));
        // Use the renderer to show the empty state message in the task list area
        this.taskRenderer.renderTasks([], // No tasks
        false, // Not tree view
        this.allTasksMap, message // The specific empty message
        );
    }
    updateTask(updatedTask) {
        console.log("ReviewComponent received task update:", updatedTask.id, updatedTask.metadata.project);
        let needsListRefresh = false;
        // Update in allTasks list
        const taskIndexAll = this.allTasks.findIndex((t) => t.id === updatedTask.id);
        if (taskIndexAll !== -1) {
            const oldTask = this.allTasks[taskIndexAll];
            // If project changed, the whole view might need refresh
            if (oldTask.metadata.project !== updatedTask.metadata.project) {
                console.log("Task project changed, reloading review settings.");
                this.loadReviewSettings(); // Reloads projects list and potentially task list
                return; // Exit, loadReviewSettings handles UI update
            }
            this.allTasks[taskIndexAll] = updatedTask;
        }
        else {
            // New task
            this.allTasks.push(updatedTask);
            // Check if it affects the current view
            if (updatedTask.metadata.project === this.selectedProject.project) {
                needsListRefresh = true; // New task added to selected project
            }
            else if (updatedTask.metadata.project &&
                !this.reviewableProjects.has(updatedTask.metadata.project)) {
                // New task belongs to a previously unknown project, refresh left list
                this.loadReviewSettings();
                return;
            }
        }
        // If the updated task belongs to the currently selected project
        if (this.selectedProject.project === updatedTask.metadata.project) {
            const taskIndexSelected = this.selectedProject.tasks.findIndex((t) => t.id === updatedTask.id);
            // Check if task visibility changed due to update (e.g., completed)
            const shouldBeVisible = this.checkTaskVisibility(updatedTask);
            if (taskIndexSelected !== -1) {
                // Task was in the list
                if (shouldBeVisible) {
                    // Update task data and ask renderer to update component
                    this.selectedProject.tasks[taskIndexSelected] = updatedTask;
                    this.taskRenderer.updateTask(updatedTask);
                    // Optional: Re-sort if needed
                }
                else {
                    // Task should no longer be visible, refresh the whole list
                    needsListRefresh = true;
                }
            }
            else if (shouldBeVisible) {
                // Task wasn't in list but should be now
                needsListRefresh = true;
            }
        }
        // If needed, refresh the task list for the selected project
        if (needsListRefresh) {
            this.updateSelectedProjectTasks(); // Re-filters and re-renders
        }
    }
    // Helper to check if a task should be visible based on current filters
    checkTaskVisibility(task) {
        var _a;
        if (this.showAllTasks || !((_a = this.selectedProject.setting) === null || _a === void 0 ? void 0 : _a.lastReviewed)) {
            return true; // Show all or no review history
        }
        const lastReviewDate = this.selectedProject.setting.lastReviewed;
        const reviewedTaskIds = new Set(this.selectedProject.setting.reviewedTaskIds || []);
        // Copied logic from updateSelectedProjectTasks filtering part
        if (task.metadata.createdDate &&
            task.metadata.createdDate > lastReviewDate) {
            return true; // New since last review
        }
        if (reviewedTaskIds.has(task.id) && task.completed) {
            return false; // Reviewed and completed
        }
        if (reviewedTaskIds.has(task.id) && !task.completed) {
            return true; // Reviewed but incomplete
        }
        if (!reviewedTaskIds.has(task.id)) {
            return true; // Not reviewed before (maybe older task added to project)
        }
        return false; // Default case (shouldn't be reached ideally)
    }
    refreshReviewSettings() {
        console.log("Explicitly refreshing review settings...");
        this.loadReviewSettings();
    }
    onunload() {
        var _a;
        // Renderer is child, managed by Obsidian unload
        (_a = this.containerEl) === null || _a === void 0 ? void 0 : _a.remove();
    }
    // Toggle left column visibility with animation support
    toggleLeftColumnVisibility(visible) {
        if (visible === undefined) {
            // Toggle based on current state
            visible = !this.leftColumnEl.hasClass("is-visible");
        }
        if (visible) {
            this.leftColumnEl.addClass("is-visible");
            this.leftColumnEl.show();
        }
        else {
            this.leftColumnEl.removeClass("is-visible");
            // Wait for animation to complete before hiding
            setTimeout(() => {
                if (!this.leftColumnEl.hasClass("is-visible")) {
                    this.leftColumnEl.hide();
                }
            }, 300); // Match CSS transition duration
        }
    }
    /**
     * Check if a project review is due based on its frequency and last reviewed date.
     * @param setting The review setting for the project.
     * @returns True if the review is due, false otherwise.
     */
    isReviewDue(setting) {
        // Cannot be due if not configured with a frequency
        if (!setting.frequency) {
            return false;
        }
        // Always due if never reviewed before
        if (!setting.lastReviewed) {
            return true;
        }
        const lastReviewedDate = new Date(setting.lastReviewed);
        const today = new Date();
        // Set time to 00:00:00.000 for day-level comparison
        today.setHours(0, 0, 0, 0);
        let intervalDays = 0;
        // Check predefined frequencies
        if (DAY_MAP[setting.frequency]) {
            intervalDays = DAY_MAP[setting.frequency];
        }
        else {
            // Basic parsing for "every N days" - could be expanded later
            const match = setting.frequency.match(/every (\d+) days/i);
            if (match && match[1]) {
                intervalDays = parseInt(match[1], 10);
            }
            else {
                // Cannot determine interval for unknown custom frequencies
                console.warn(`Unknown frequency format: ${setting.frequency}`);
                return false; // Treat unknown formats as not due for now
            }
        }
        // Calculate the next review date
        const nextReviewDate = new Date(lastReviewedDate);
        nextReviewDate.setDate(lastReviewedDate.getDate() + intervalDays);
        // Also set time to 00:00:00.000 for comparison
        nextReviewDate.setHours(0, 0, 0, 0);
        // Review is due if today is on or after the next review date
        return today >= nextReviewDate;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmV2aWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicmV2aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBRU4sU0FBUyxFQUNULG9CQUFvQixFQUNwQixLQUFLLEVBQ0wsTUFBTSxFQUNOLFFBQVEsRUFDUixPQUFPLEdBQ1AsTUFBTSxVQUFVLENBQUM7QUFFbEIsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRzFDLE9BQU8sMEJBQTBCLENBQUMsQ0FBQyxxQ0FBcUM7QUFDeEUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sWUFBWSxDQUFDLENBQUMsMkJBQTJCO0FBUW5GLE1BQU0sT0FBTyxHQUFHO0lBQ2YsS0FBSyxFQUFFLENBQUM7SUFDUixNQUFNLEVBQUUsQ0FBQztJQUNULGVBQWUsRUFBRSxFQUFFO0lBQ25CLE9BQU8sRUFBRSxFQUFFO0lBQ1gsU0FBUyxFQUFFLEVBQUU7SUFDYixnQkFBZ0IsRUFBRSxHQUFHO0lBQ3JCLE1BQU0sRUFBRSxHQUFHO0NBQ1gsQ0FBQztBQUVGLE1BQU0sb0JBQXFCLFNBQVEsS0FBSztJQWlCdkMsWUFDQyxHQUFRLEVBQ1IsTUFBNkIsRUFDN0IsV0FBbUIsRUFDbkIsZUFBNEMsRUFDNUMsTUFBK0M7UUFFL0MsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBdEJKLGNBQVMsR0FBVyxFQUFFLENBQUM7UUFLdkIscUJBQWdCLEdBQUc7WUFDMUIsT0FBTztZQUNQLFFBQVE7WUFDUixlQUFlO1lBQ2YsU0FBUztZQUNULFdBQVc7WUFDWCxnQkFBZ0I7WUFDaEIsUUFBUTtTQUNSLENBQUM7UUFVRCxJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztRQUMvQixJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQztRQUN2QyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUVyQiw4Q0FB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IHtcclxuXHRBcHAsXHJcblx0Q29tcG9uZW50LFxyXG5cdEV4dHJhQnV0dG9uQ29tcG9uZW50LFxyXG5cdE1vZGFsLFxyXG5cdE5vdGljZSxcclxuXHRQbGF0Zm9ybSxcclxuXHRzZXRJY29uLFxyXG59IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBUYXNrIH0gZnJvbSBcIkAvdHlwZXMvdGFza1wiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgeyBQcm9qZWN0UmV2aWV3U2V0dGluZyB9IGZyb20gXCJAL2NvbW1vbi9zZXR0aW5nLWRlZmluaXRpb25cIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiOyAvLyBQYXRoIHVzZWQgaW4gVGFza1ZpZXcudHNcclxuaW1wb3J0IFwiQC9zdHlsZXMvcmV2aWV3LXZpZXcuY3NzXCI7IC8vIEFzc3VtaW5nIHN0eWxlcyB3aWxsIGJlIGFkZGVkIGhlcmVcclxuaW1wb3J0IHsgVGFza0xpc3RSZW5kZXJlckNvbXBvbmVudCB9IGZyb20gXCIuL1Rhc2tMaXN0XCI7IC8vIEltcG9ydCB0aGUgYmFzZSByZW5kZXJlclxyXG5cclxuaW50ZXJmYWNlIFNlbGVjdGVkUmV2aWV3UHJvamVjdCB7XHJcblx0cHJvamVjdDogc3RyaW5nIHwgbnVsbDtcclxuXHR0YXNrczogVGFza1tdO1xyXG5cdHNldHRpbmc6IFByb2plY3RSZXZpZXdTZXR0aW5nIHwgbnVsbDtcclxufVxyXG5cclxuY29uc3QgREFZX01BUCA9IHtcclxuXHRkYWlseTogMSxcclxuXHR3ZWVrbHk6IDcsXHJcblx0XCJldmVyeSAyIHdlZWtzXCI6IDE0LFxyXG5cdG1vbnRobHk6IDMwLFxyXG5cdHF1YXJ0ZXJseTogOTAsXHJcblx0XCJldmVyeSA2IG1vbnRoc1wiOiAxODAsXHJcblx0eWVhcmx5OiAzNjUsXHJcbn07XHJcblxyXG5jbGFzcyBSZXZpZXdDb25maWd1cmVNb2RhbCBleHRlbmRzIE1vZGFsIHtcclxuXHRwcml2YXRlIHByb2plY3ROYW1lOiBzdHJpbmc7XHJcblx0cHJpdmF0ZSBmcmVxdWVuY3k6IHN0cmluZyA9IFwiXCI7XHJcblx0cHJpdmF0ZSBleGlzdGluZ1NldHRpbmc6IFByb2plY3RSZXZpZXdTZXR0aW5nIHwgbnVsbDtcclxuXHRwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luO1xyXG5cdHByaXZhdGUgb25TYXZlOiAoc2V0dGluZzogUHJvamVjdFJldmlld1NldHRpbmcpID0+IHZvaWQ7XHJcblxyXG5cdHByaXZhdGUgZnJlcXVlbmN5T3B0aW9ucyA9IFtcclxuXHRcdFwiZGFpbHlcIixcclxuXHRcdFwid2Vla2x5XCIsXHJcblx0XHRcImV2ZXJ5IDIgd2Vla3NcIixcclxuXHRcdFwibW9udGhseVwiLFxyXG5cdFx0XCJxdWFydGVybHlcIixcclxuXHRcdFwiZXZlcnkgNiBtb250aHNcIixcclxuXHRcdFwieWVhcmx5XCIsXHJcblx0XTtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRhcHA6IEFwcCxcclxuXHRcdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0cHJvamVjdE5hbWU6IHN0cmluZyxcclxuXHRcdGV4aXN0aW5nU2V0dGluZzogUHJvamVjdFJldmlld1NldHRpbmcgfCBudWxsLFxyXG5cdFx0b25TYXZlOiAoc2V0dGluZzogUHJvamVjdFJldmlld1NldHRpbmcpID0+IHZvaWRcclxuXHQpIHtcclxuXHRcdHN1cGVyKGFwcCk7XHJcblx0XHR0aGlzLnByb2plY3ROYW1lID0gcHJvamVjdE5hbWU7XHJcblx0XHR0aGlzLmV4aXN0aW5nU2V0dGluZyA9IGV4aXN0aW5nU2V0dGluZztcclxuXHRcdHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG5cdFx0dGhpcy5vblNhdmUgPSBvblNhdmU7XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSB3aXRoIGV4aXN0aW5nIHNldHRpbmcgaWYgcHJlc2VudFxyXG5cdFx0aWYgKGV4aXN0aW5nU2V0dGluZyAmJiBleGlzdGluZ1NldHRpbmcuZnJlcXVlbmN5KSB7XHJcblx0XHRcdHRoaXMuZnJlcXVlbmN5ID0gZXhpc3RpbmdTZXR0aW5nLmZyZXF1ZW5jeTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMuZnJlcXVlbmN5ID0gXCJ3ZWVrbHlcIjsgLy8gRGVmYXVsdCB2YWx1ZVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0YXN5bmMgb25PcGVuKCkge1xyXG5cdFx0Y29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcblxyXG5cdFx0Ly8gQWRkIHRpdGxlXHJcblx0XHRjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXCJDb25maWd1cmUgUmV2aWV3IGZvclwiKSArIGAgXCIke3RoaXMucHJvamVjdE5hbWV9XCJgLFxyXG5cdFx0XHRjbHM6IFwicmV2aWV3LW1vZGFsLXRpdGxlXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDcmVhdGUgZm9ybSBjb250YWluZXJcclxuXHRcdGNvbnN0IGZvcm1Db250YWluZXIgPSBjb250ZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInJldmlldy1tb2RhbC1mb3JtXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBGcmVxdWVuY3kgc2VsZWN0aW9uXHJcblx0XHRjb25zdCBmcmVxdWVuY3lDb250YWluZXIgPSBmb3JtQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJyZXZpZXctbW9kYWwtZmllbGRcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIExhYmVsXHJcblx0XHRmcmVxdWVuY3lDb250YWluZXIuY3JlYXRlRWwoXCJsYWJlbFwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXCJSZXZpZXcgRnJlcXVlbmN5XCIpLFxyXG5cdFx0XHRjbHM6IFwicmV2aWV3LW1vZGFsLWxhYmVsXCIsXHJcblx0XHRcdGF0dHI6IHsgZm9yOiBcInJldmlldy1mcmVxdWVuY3lcIiB9LFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gRGVzY3JpcHRpb25cclxuXHRcdGZyZXF1ZW5jeUNvbnRhaW5lci5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXCJIb3cgb2Z0ZW4gc2hvdWxkIHRoaXMgcHJvamVjdCBiZSByZXZpZXdlZFwiKSxcclxuXHRcdFx0Y2xzOiBcInJldmlldy1tb2RhbC1kZXNjcmlwdGlvblwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGRyb3Bkb3duIGZvciBmcmVxdWVuY3lcclxuXHRcdGNvbnN0IGZyZXF1ZW5jeVNlbGVjdCA9IGZyZXF1ZW5jeUNvbnRhaW5lci5jcmVhdGVFbChcInNlbGVjdFwiLCB7XHJcblx0XHRcdGNsczogXCJyZXZpZXctbW9kYWwtc2VsZWN0XCIsXHJcblx0XHRcdGF0dHI6IHsgaWQ6IFwicmV2aWV3LWZyZXF1ZW5jeVwiIH0sXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBBZGQgZnJlcXVlbmN5IG9wdGlvbnNcclxuXHRcdHRoaXMuZnJlcXVlbmN5T3B0aW9ucy5mb3JFYWNoKChvcHRpb24pID0+IHtcclxuXHRcdFx0Y29uc3Qgb3B0aW9uRWwgPSBmcmVxdWVuY3lTZWxlY3QuY3JlYXRlRWwoXCJvcHRpb25cIiwge1xyXG5cdFx0XHRcdHRleHQ6IG9wdGlvbixcclxuXHRcdFx0XHR2YWx1ZTogb3B0aW9uLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGlmIChvcHRpb24gPT09IHRoaXMuZnJlcXVlbmN5KSB7XHJcblx0XHRcdFx0b3B0aW9uRWwuc2VsZWN0ZWQgPSB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDdXN0b20gZnJlcXVlbmN5IG9wdGlvblxyXG5cdFx0Y29uc3QgY3VzdG9tT3B0aW9uID0gZnJlcXVlbmN5U2VsZWN0LmNyZWF0ZUVsKFwib3B0aW9uXCIsIHtcclxuXHRcdFx0dGV4dDogdChcIkN1c3RvbS4uLlwiKSxcclxuXHRcdFx0dmFsdWU6IFwiY3VzdG9tXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDdXN0b20gZnJlcXVlbmN5IGlucHV0IChpbml0aWFsbHkgaGlkZGVuKVxyXG5cdFx0Y29uc3QgY3VzdG9tRnJlcXVlbmN5Q29udGFpbmVyID0gZnJlcXVlbmN5Q29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJyZXZpZXctbW9kYWwtY3VzdG9tLWZyZXF1ZW5jeVwiLFxyXG5cdFx0fSk7XHJcblx0XHRjdXN0b21GcmVxdWVuY3lDb250YWluZXIuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG5cclxuXHRcdGNvbnN0IGN1c3RvbUZyZXF1ZW5jeUlucHV0ID0gY3VzdG9tRnJlcXVlbmN5Q29udGFpbmVyLmNyZWF0ZUVsKFxyXG5cdFx0XHRcImlucHV0XCIsXHJcblx0XHRcdHtcclxuXHRcdFx0XHRjbHM6IFwicmV2aWV3LW1vZGFsLWlucHV0XCIsXHJcblx0XHRcdFx0YXR0cjoge1xyXG5cdFx0XHRcdFx0dHlwZTogXCJ0ZXh0XCIsXHJcblx0XHRcdFx0XHRwbGFjZWhvbGRlcjogdChcImUuZy4sIGV2ZXJ5IDMgbW9udGhzXCIpLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gU2hvdy9oaWRlIGN1c3RvbSBpbnB1dCBiYXNlZCBvbiBkcm9wZG93biBzZWxlY3Rpb25cclxuXHRcdGZyZXF1ZW5jeVNlbGVjdC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIChlKSA9PiB7XHJcblx0XHRcdGNvbnN0IHZhbHVlID0gKGUudGFyZ2V0IGFzIEhUTUxTZWxlY3RFbGVtZW50KS52YWx1ZTtcclxuXHRcdFx0aWYgKHZhbHVlID09PSBcImN1c3RvbVwiKSB7XHJcblx0XHRcdFx0Y3VzdG9tRnJlcXVlbmN5Q29udGFpbmVyLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcblx0XHRcdFx0Y3VzdG9tRnJlcXVlbmN5SW5wdXQuZm9jdXMoKTtcclxuXHRcdFx0XHR0aGlzLmZyZXF1ZW5jeSA9IFwiXCI7IC8vIFJlc2V0IGZyZXF1ZW5jeSB3aGVuIHN3aXRjaGluZyB0byBjdXN0b21cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRjdXN0b21GcmVxdWVuY3lDb250YWluZXIuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG5cdFx0XHRcdHRoaXMuZnJlcXVlbmN5ID0gdmFsdWU7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSBmcmVxdWVuY3kgd2hlbiB0eXBpbmcgaW4gY3VzdG9tIGlucHV0XHJcblx0XHRjdXN0b21GcmVxdWVuY3lJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiaW5wdXRcIiwgKGUpID0+IHtcclxuXHRcdFx0dGhpcy5mcmVxdWVuY3kgPSAoZS50YXJnZXQgYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWU7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBJZiBleGlzdGluZyBzZXR0aW5nIGhhcyBhIGN1c3RvbSBmcmVxdWVuY3kgdGhhdCdzIG5vdCBpbiB0aGUgZHJvcGRvd24sXHJcblx0XHQvLyBzZWxlY3QgdGhlIGN1c3RvbSBvcHRpb24gYW5kIHNob3cgdGhlIGN1c3RvbSBpbnB1dFxyXG5cdFx0aWYgKHRoaXMuZnJlcXVlbmN5ICYmICF0aGlzLmZyZXF1ZW5jeU9wdGlvbnMuaW5jbHVkZXModGhpcy5mcmVxdWVuY3kpKSB7XHJcblx0XHRcdGN1c3RvbU9wdGlvbi5zZWxlY3RlZCA9IHRydWU7XHJcblx0XHRcdGN1c3RvbUZyZXF1ZW5jeUNvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xyXG5cdFx0XHRjdXN0b21GcmVxdWVuY3lJbnB1dC52YWx1ZSA9IHRoaXMuZnJlcXVlbmN5O1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIExhc3QgcmV2aWV3ZWQgaW5mb3JtYXRpb25cclxuXHRcdGNvbnN0IGxhc3RSZXZpZXdlZEluZm8gPSBmb3JtQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJyZXZpZXctbW9kYWwtZmllbGRcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdGxhc3RSZXZpZXdlZEluZm8uY3JlYXRlRWwoXCJsYWJlbFwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXCJMYXN0IFJldmlld2VkXCIpLFxyXG5cdFx0XHRjbHM6IFwicmV2aWV3LW1vZGFsLWxhYmVsXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCBsYXN0UmV2aWV3ZWRUZXh0ID0gdGhpcy5leGlzdGluZ1NldHRpbmc/Lmxhc3RSZXZpZXdlZFxyXG5cdFx0XHQ/IG5ldyBEYXRlKHRoaXMuZXhpc3RpbmdTZXR0aW5nLmxhc3RSZXZpZXdlZCkudG9Mb2NhbGVTdHJpbmcoKVxyXG5cdFx0XHQ6IFwiTmV2ZXJcIjtcclxuXHJcblx0XHRsYXN0UmV2aWV3ZWRJbmZvLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0dGV4dDogbGFzdFJldmlld2VkVGV4dCxcclxuXHRcdFx0Y2xzOiBcInJldmlldy1tb2RhbC1sYXN0LXJldmlld2VkXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBCdXR0b25zXHJcblx0XHRjb25zdCBidXR0b25Db250YWluZXIgPSBjb250ZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInJldmlldy1tb2RhbC1idXR0b25zXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDYW5jZWwgYnV0dG9uXHJcblx0XHRjb25zdCBjYW5jZWxCdXR0b24gPSBidXR0b25Db250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFwiQ2FuY2VsXCIpLFxyXG5cdFx0XHRjbHM6IFwicmV2aWV3LW1vZGFsLWJ1dHRvbiByZXZpZXctbW9kYWwtYnV0dG9uLWNhbmNlbFwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y2FuY2VsQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdHRoaXMuY2xvc2UoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFNhdmUgYnV0dG9uXHJcblx0XHRjb25zdCBzYXZlQnV0dG9uID0gYnV0dG9uQ29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0dGV4dDogdChcIlNhdmVcIiksXHJcblx0XHRcdGNsczogXCJyZXZpZXctbW9kYWwtYnV0dG9uIHJldmlldy1tb2RhbC1idXR0b24tc2F2ZVwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0c2F2ZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHR0aGlzLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHZhbGlkYXRlRnJlcXVlbmN5KCk6IGJvb2xlYW4ge1xyXG5cdFx0aWYgKCF0aGlzLmZyZXF1ZW5jeSB8fCB0aGlzLmZyZXF1ZW5jeS50cmltKCkgPT09IFwiXCIpIHtcclxuXHRcdFx0bmV3IE5vdGljZSh0KFwiUGxlYXNlIHNwZWNpZnkgYSByZXZpZXcgZnJlcXVlbmN5XCIpKTtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRydWU7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIHNhdmVTZXR0aW5ncygpIHtcclxuXHRcdGlmICghdGhpcy52YWxpZGF0ZUZyZXF1ZW5jeSgpKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDcmVhdGUgb3IgdXBkYXRlIHNldHRpbmdcclxuXHRcdGNvbnN0IHVwZGF0ZWRTZXR0aW5nOiBQcm9qZWN0UmV2aWV3U2V0dGluZyA9IHtcclxuXHRcdFx0ZnJlcXVlbmN5OiB0aGlzLmZyZXF1ZW5jeSxcclxuXHRcdFx0bGFzdFJldmlld2VkOiB0aGlzLmV4aXN0aW5nU2V0dGluZz8ubGFzdFJldmlld2VkIHx8IHVuZGVmaW5lZCxcclxuXHRcdFx0cmV2aWV3ZWRUYXNrSWRzOiB0aGlzLmV4aXN0aW5nU2V0dGluZz8ucmV2aWV3ZWRUYXNrSWRzIHx8IFtdLFxyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBVcGRhdGUgcGx1Z2luIHNldHRpbmdzXHJcblx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5yZXZpZXdTZXR0aW5nc1t0aGlzLnByb2plY3ROYW1lXSA9IHVwZGF0ZWRTZXR0aW5nO1xyXG5cdFx0YXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblxyXG5cdFx0Ly8gTm90aWZ5IHBhcmVudCBjb21wb25lbnRcclxuXHRcdHRoaXMub25TYXZlKHVwZGF0ZWRTZXR0aW5nKTtcclxuXHJcblx0XHQvLyBTaG93IGNvbmZpcm1hdGlvbiBhbmQgY2xvc2VcclxuXHRcdG5ldyBOb3RpY2UodChcIlJldmlldyBzY2hlZHVsZSB1cGRhdGVkIGZvclwiKSArIGAgJHt0aGlzLnByb2plY3ROYW1lfWApO1xyXG5cdFx0dGhpcy5jbG9zZSgpO1xyXG5cdH1cclxuXHJcblx0YXN5bmMgb25DbG9zZSgpIHtcclxuXHRcdGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xyXG5cdFx0Y29udGVudEVsLmVtcHR5KCk7XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgUmV2aWV3Q29tcG9uZW50IGV4dGVuZHMgQ29tcG9uZW50IHtcclxuXHQvLyBVSSBFbGVtZW50c1xyXG5cdHB1YmxpYyBjb250YWluZXJFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBwcm9qZWN0c0xpc3RFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSB0YXNrQ29udGFpbmVyRWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgdGFza0xpc3RDb250YWluZXJFbDogSFRNTEVsZW1lbnQ7IC8vIENvbnRhaW5lciBwYXNzZWQgdG8gdGhlIHJlbmRlcmVyXHJcblx0cHJpdmF0ZSB0YXNrSGVhZGVyRWw6IEhUTUxFbGVtZW50OyAvLyBUbyBob2xkIHRpdGxlLCBsYXN0IHJldmlld2VkIGRhdGUsIGZyZXF1ZW5jeVxyXG5cdHByaXZhdGUgbGVmdENvbHVtbkVsOiBIVE1MRWxlbWVudDtcclxuXHJcblx0Ly8gQ2hpbGQgY29tcG9uZW50c1xyXG5cdC8vIHByaXZhdGUgdGFza0NvbXBvbmVudHM6IFRhc2tMaXN0SXRlbUNvbXBvbmVudFtdID0gW107IC8vIE1hbmFnZWQgYnkgcmVuZGVyZXJcclxuXHRwcml2YXRlIHRhc2tSZW5kZXJlcjogVGFza0xpc3RSZW5kZXJlckNvbXBvbmVudDsgLy8gSW5zdGFuY2Ugb2YgdGhlIGJhc2UgcmVuZGVyZXJcclxuXHJcblx0Ly8gU3RhdGVcclxuXHRwcml2YXRlIGFsbFRhc2tzOiBUYXNrW10gPSBbXTtcclxuXHRwcml2YXRlIHJldmlld2FibGVQcm9qZWN0czogTWFwPHN0cmluZywgUHJvamVjdFJldmlld1NldHRpbmc+ID0gbmV3IE1hcCgpO1xyXG5cdHByaXZhdGUgc2VsZWN0ZWRQcm9qZWN0OiBTZWxlY3RlZFJldmlld1Byb2plY3QgPSB7XHJcblx0XHRwcm9qZWN0OiBudWxsLFxyXG5cdFx0dGFza3M6IFtdLCAvLyBUaGlzIGhvbGRzIHRoZSBmaWx0ZXJlZCB0YXNrcyBmb3IgdGhlIHNlbGVjdGVkIHByb2plY3RcclxuXHRcdHNldHRpbmc6IG51bGwsXHJcblx0fTtcclxuXHRwcml2YXRlIHNob3dBbGxUYXNrczogYm9vbGVhbiA9IGZhbHNlOyAvLyBEZWZhdWx0IHRvIGZpbHRlcmVkIHZpZXdcclxuXHRwcml2YXRlIGFsbFRhc2tzTWFwOiBNYXA8c3RyaW5nLCBUYXNrPiA9IG5ldyBNYXAoKTtcclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHByaXZhdGUgcGFyZW50RWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0cHJpdmF0ZSBhcHA6IEFwcCxcclxuXHRcdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRwcml2YXRlIHBhcmFtczoge1xyXG5cdFx0XHRvblRhc2tTZWxlY3RlZD86ICh0YXNrOiBUYXNrIHwgbnVsbCkgPT4gdm9pZDtcclxuXHRcdFx0b25UYXNrQ29tcGxldGVkPzogKHRhc2s6IFRhc2spID0+IHZvaWQ7XHJcblx0XHRcdG9uVGFza1VwZGF0ZT86ICh0YXNrOiBUYXNrLCB1cGRhdGVkVGFzazogVGFzaykgPT4gUHJvbWlzZTx2b2lkPjtcclxuXHRcdFx0b25UYXNrQ29udGV4dE1lbnU/OiAoZXZlbnQ6IE1vdXNlRXZlbnQsIHRhc2s6IFRhc2spID0+IHZvaWQ7XHJcblx0XHR9ID0ge31cclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0fVxyXG5cclxuXHRvbmxvYWQoKSB7XHJcblx0XHQvLyBDcmVhdGUgbWFpbiBjb250YWluZXJcclxuXHRcdHRoaXMuY29udGFpbmVyRWwgPSB0aGlzLnBhcmVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJyZXZpZXctY29udGFpbmVyXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDcmVhdGUgY29udGVudCBjb250YWluZXIgZm9yIGNvbHVtbnNcclxuXHRcdGNvbnN0IGNvbnRlbnRDb250YWluZXIgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJyZXZpZXctY29udGVudFwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gTGVmdCBjb2x1bW46IGNyZWF0ZSBwcm9qZWN0cyBsaXN0XHJcblx0XHR0aGlzLmNyZWF0ZUxlZnRDb2x1bW4oY29udGVudENvbnRhaW5lcik7XHJcblxyXG5cdFx0Ly8gUmlnaHQgY29sdW1uOiBjcmVhdGUgdGFzayBsaXN0IGZvciBzZWxlY3RlZCBwcm9qZWN0XHJcblx0XHR0aGlzLmNyZWF0ZVJpZ2h0Q29sdW1uKGNvbnRlbnRDb250YWluZXIpO1xyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgdGhlIHRhc2sgcmVuZGVyZXJcclxuXHRcdHRoaXMudGFza1JlbmRlcmVyID0gbmV3IFRhc2tMaXN0UmVuZGVyZXJDb21wb25lbnQoXHJcblx0XHRcdHRoaXMsIC8vIFBhcmVudCBjb21wb25lbnRcclxuXHRcdFx0dGhpcy50YXNrTGlzdENvbnRhaW5lckVsLCAvLyBDb250YWluZXIgZWxlbWVudFxyXG5cdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFwicmV2aWV3XCIgLy8gQ29udGV4dFxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBDb25uZWN0IGV2ZW50IGhhbmRsZXJzXHJcblx0XHR0aGlzLnRhc2tSZW5kZXJlci5vblRhc2tTZWxlY3RlZCA9ICh0YXNrKSA9PiB7XHJcblx0XHRcdGlmICh0aGlzLnBhcmFtcy5vblRhc2tTZWxlY3RlZCkgdGhpcy5wYXJhbXMub25UYXNrU2VsZWN0ZWQodGFzayk7XHJcblx0XHR9O1xyXG5cdFx0dGhpcy50YXNrUmVuZGVyZXIub25UYXNrQ29tcGxldGVkID0gKHRhc2spID0+IHtcclxuXHRcdFx0aWYgKHRoaXMucGFyYW1zLm9uVGFza0NvbXBsZXRlZCkgdGhpcy5wYXJhbXMub25UYXNrQ29tcGxldGVkKHRhc2spO1xyXG5cdFx0XHQvLyBQb3RlbnRpYWxseSBhZGQgcmV2aWV3IGNvbXBsZXRpb24gbG9naWMgaGVyZSBsYXRlclxyXG5cdFx0fTtcclxuXHRcdHRoaXMudGFza1JlbmRlcmVyLm9uVGFza1VwZGF0ZSA9IGFzeW5jIChvcmlnaW5hbFRhc2ssIHVwZGF0ZWRUYXNrKSA9PiB7XHJcblx0XHRcdGlmICh0aGlzLnBhcmFtcy5vblRhc2tVcGRhdGUpIHtcclxuXHRcdFx0XHRhd2FpdCB0aGlzLnBhcmFtcy5vblRhc2tVcGRhdGUob3JpZ2luYWxUYXNrLCB1cGRhdGVkVGFzayk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0XHR0aGlzLnRhc2tSZW5kZXJlci5vblRhc2tDb250ZXh0TWVudSA9IChldmVudCwgdGFzaykgPT4ge1xyXG5cdFx0XHRpZiAodGhpcy5wYXJhbXMub25UYXNrQ29udGV4dE1lbnUpXHJcblx0XHRcdFx0dGhpcy5wYXJhbXMub25UYXNrQ29udGV4dE1lbnUoZXZlbnQsIHRhc2spO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBEb24ndCBsb2FkIGluaXRpYWwgZGF0YSBoZXJlIC0gd2FpdCBmb3Igc2V0VGFza3MgdG8gYmUgY2FsbGVkXHJcblx0XHQvLyB0aGlzLmxvYWRSZXZpZXdTZXR0aW5ncygpO1xyXG5cdFx0Ly8gU2hvdyBlbXB0eSBzdGF0ZSBpbml0aWFsbHlcclxuXHRcdHRoaXMucmVuZGVyRW1wdHlUYXNrTGlzdChcclxuXHRcdFx0dChcIlNlbGVjdCBhIHByb2plY3QgdG8gcmV2aWV3IGl0cyB0YXNrcy5cIilcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNyZWF0ZUxlZnRDb2x1bW4ocGFyZW50RWw6IEhUTUxFbGVtZW50KSB7XHJcblx0XHR0aGlzLmxlZnRDb2x1bW5FbCA9IHBhcmVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJyZXZpZXctbGVmdC1jb2x1bW5cIiwgLy8gU3BlY2lmaWMgY2xhc3NcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEFkZCBjbG9zZSBidXR0b24gZm9yIG1vYmlsZVxyXG5cdFx0aWYgKFBsYXRmb3JtLmlzUGhvbmUpIHtcclxuXHRcdFx0Y29uc3QgY2xvc2VCdG4gPSB0aGlzLmxlZnRDb2x1bW5FbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJyZXZpZXctc2lkZWJhci1jbG9zZVwiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdG5ldyBFeHRyYUJ1dHRvbkNvbXBvbmVudChjbG9zZUJ0bikuc2V0SWNvbihcInhcIikub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy50b2dnbGVMZWZ0Q29sdW1uVmlzaWJpbGl0eShmYWxzZSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEhlYWRlciBmb3IgdGhlIHByb2plY3RzIHNlY3Rpb25cclxuXHRcdGNvbnN0IGhlYWRlckVsID0gdGhpcy5sZWZ0Q29sdW1uRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInJldmlldy1zaWRlYmFyLWhlYWRlclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgaGVhZGVyVGl0bGUgPSBoZWFkZXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwicmV2aWV3LXNpZGViYXItdGl0bGVcIixcclxuXHRcdFx0dGV4dDogdChcIlJldmlldyBQcm9qZWN0c1wiKSwgLy8gVGl0bGUgc3BlY2lmaWMgdG8gcmV2aWV3XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBUT0RPOiBBZGQgYnV0dG9uIHRvIGNvbmZpZ3VyZSByZXZpZXcgc2V0dGluZ3M/XHJcblxyXG5cdFx0Ly8gUHJvamVjdHMgbGlzdCBjb250YWluZXJcclxuXHRcdHRoaXMucHJvamVjdHNMaXN0RWwgPSB0aGlzLmxlZnRDb2x1bW5FbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwicmV2aWV3LXNpZGViYXItbGlzdFwiLFxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNyZWF0ZVJpZ2h0Q29sdW1uKHBhcmVudEVsOiBIVE1MRWxlbWVudCkge1xyXG5cdFx0dGhpcy50YXNrQ29udGFpbmVyRWwgPSBwYXJlbnRFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwicmV2aWV3LXJpZ2h0LWNvbHVtblwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gVGFzayBsaXN0IGhlYWRlciAtIHdpbGwgYmUgcG9wdWxhdGVkIHdoZW4gYSBwcm9qZWN0IGlzIHNlbGVjdGVkXHJcblx0XHR0aGlzLnRhc2tIZWFkZXJFbCA9IHRoaXMudGFza0NvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJyZXZpZXctdGFzay1oZWFkZXJcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEFkZCBzaWRlYmFyIHRvZ2dsZSBidXR0b24gZm9yIG1vYmlsZVxyXG5cdFx0aWYgKFBsYXRmb3JtLmlzUGhvbmUpIHtcclxuXHRcdFx0dGhpcy50YXNrSGVhZGVyRWwuY3JlYXRlRWwoXHJcblx0XHRcdFx0XCJkaXZcIixcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRjbHM6IFwicmV2aWV3LXNpZGViYXItdG9nZ2xlXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHQoZWwpID0+IHtcclxuXHRcdFx0XHRcdG5ldyBFeHRyYUJ1dHRvbkNvbXBvbmVudChlbClcclxuXHRcdFx0XHRcdFx0LnNldEljb24oXCJzaWRlYmFyXCIpXHJcblx0XHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnRvZ2dsZUxlZnRDb2x1bW5WaXNpYmlsaXR5KCk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBUYXNrIGxpc3QgY29udGFpbmVyIC0gVGhpcyBpcyB3aGVyZSB0aGUgcmVuZGVyZXIgd2lsbCBwbGFjZSB0YXNrc1xyXG5cdFx0dGhpcy50YXNrTGlzdENvbnRhaW5lckVsID0gdGhpcy50YXNrQ29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInJldmlldy10YXNrLWxpc3RcIixcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBsb2FkUmV2aWV3U2V0dGluZ3MoKSB7XHJcblx0XHR0aGlzLnJldmlld2FibGVQcm9qZWN0cy5jbGVhcigpO1xyXG5cdFx0Y29uc3Qgc2V0dGluZ3MgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5yZXZpZXdTZXR0aW5ncztcclxuXHJcblx0XHQvLyBHZXQgYWxsIHVuaXF1ZSBwcm9qZWN0cyBmcm9tIHRhc2tzXHJcblx0XHRjb25zdCBhbGxQcm9qZWN0cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG5cdFx0dGhpcy5hbGxUYXNrcy5mb3JFYWNoKCh0YXNrKSA9PiB7XHJcblx0XHRcdGlmICh0YXNrLm1ldGFkYXRhLnByb2plY3QpIHtcclxuXHRcdFx0XHRhbGxQcm9qZWN0cy5hZGQodGFzay5tZXRhZGF0YS5wcm9qZWN0KTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQWRkIGFsbCBwcm9qZWN0cyB0byB0aGUgc2lkZWJhciwgbWFya2luZyBvbmVzIHdpdGggcmV2aWV3IHNldHRpbmdzXHJcblx0XHRmb3IgKGNvbnN0IHByb2plY3ROYW1lIG9mIGFsbFByb2plY3RzKSB7XHJcblx0XHRcdC8vIElmIHRoZSBwcm9qZWN0IGhhcyByZXZpZXcgc2V0dGluZ3MsIHVzZSB0aGVtXHJcblx0XHRcdGlmIChzZXR0aW5nc1twcm9qZWN0TmFtZV0pIHtcclxuXHRcdFx0XHR0aGlzLnJldmlld2FibGVQcm9qZWN0cy5zZXQocHJvamVjdE5hbWUsIHNldHRpbmdzW3Byb2plY3ROYW1lXSk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gRm9yIHByb2plY3RzIHdpdGhvdXQgcmV2aWV3IHNldHRpbmdzLCBhZGQgd2l0aCBhIHBsYWNlaG9sZGVyIHNldHRpbmdcclxuXHRcdFx0XHQvLyBXZSdsbCByZW5kZXIgdGhlc2UgZGlmZmVyZW50bHkgaW4gdGhlIFVJXHJcblx0XHRcdFx0Y29uc3QgcGxhY2Vob2xkZXJTZXR0aW5nOiBQcm9qZWN0UmV2aWV3U2V0dGluZyA9IHtcclxuXHRcdFx0XHRcdGZyZXF1ZW5jeTogXCJcIixcclxuXHRcdFx0XHRcdGxhc3RSZXZpZXdlZDogdW5kZWZpbmVkLFxyXG5cdFx0XHRcdFx0cmV2aWV3ZWRUYXNrSWRzOiBbXSxcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHRcdHRoaXMucmV2aWV3YWJsZVByb2plY3RzLnNldChwcm9qZWN0TmFtZSwgcGxhY2Vob2xkZXJTZXR0aW5nKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnNvbGUubG9nKFwiTG9hZGVkIFByb2plY3RzOlwiLCB0aGlzLnJldmlld2FibGVQcm9qZWN0cyk7XHJcblx0XHR0aGlzLnJlbmRlclByb2plY3RzTGlzdCgpO1xyXG5cclxuXHRcdC8vIElmIGEgcHJvamVjdCBpcyBjdXJyZW50bHkgc2VsZWN0ZWQgYnV0IG5vIGxvbmdlciBhdmFpbGFibGUsIGNsZWFyIHRoZSBzZWxlY3Rpb25cclxuXHRcdGlmIChcclxuXHRcdFx0dGhpcy5zZWxlY3RlZFByb2plY3QucHJvamVjdCAmJlxyXG5cdFx0XHQhdGhpcy5hbGxUYXNrcy5zb21lKFxyXG5cdFx0XHRcdCh0KSA9PiB0Lm1ldGFkYXRhLnByb2plY3QgPT09IHRoaXMuc2VsZWN0ZWRQcm9qZWN0LnByb2plY3RcclxuXHRcdFx0KVxyXG5cdFx0KSB7XHJcblx0XHRcdHRoaXMuY2xlYXJTZWxlY3Rpb24oKTtcclxuXHRcdH0gZWxzZSBpZiAodGhpcy5zZWxlY3RlZFByb2plY3QucHJvamVjdCkge1xyXG5cdFx0XHQvLyBJZiBhIHByb2plY3QgaXMgYWxyZWFkeSBzZWxlY3RlZCBhbmQgc3RpbGwgdmFsaWQsIHJlZnJlc2ggaXRzIHZpZXdcclxuXHRcdFx0dGhpcy5zZWxlY3RQcm9qZWN0KHRoaXMuc2VsZWN0ZWRQcm9qZWN0LnByb2plY3QpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gTm8gcHJvamVjdCBzZWxlY3RlZCwgc2hvdyBlbXB0eSBzdGF0ZVxyXG5cdFx0XHR0aGlzLnJlbmRlckVtcHR5VGFza0xpc3QoXHJcblx0XHRcdFx0dChcIlNlbGVjdCBhIHByb2plY3QgdG8gcmV2aWV3IGl0cyB0YXNrcy5cIilcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsZWFyIHRoZSBjdXJyZW50IHByb2plY3Qgc2VsZWN0aW9uXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjbGVhclNlbGVjdGlvbigpIHtcclxuXHRcdHRoaXMuc2VsZWN0ZWRQcm9qZWN0ID0geyBwcm9qZWN0OiBudWxsLCB0YXNrczogW10sIHNldHRpbmc6IG51bGwgfTtcclxuXHJcblx0XHQvLyBVcGRhdGUgVUkgdG8gcmVtb3ZlIHNlbGVjdGlvbiBoaWdobGlnaHRcclxuXHRcdGNvbnN0IHByb2plY3RJdGVtcyA9IHRoaXMucHJvamVjdHNMaXN0RWwucXVlcnlTZWxlY3RvckFsbChcclxuXHRcdFx0XCIucmV2aWV3LXByb2plY3QtaXRlbVwiXHJcblx0XHQpO1xyXG5cdFx0cHJvamVjdEl0ZW1zLmZvckVhY2goKGl0ZW0pID0+IGl0ZW0uY2xhc3NMaXN0LnJlbW92ZShcInNlbGVjdGVkXCIpKTtcclxuXHJcblx0XHQvLyBTaG93IGVtcHR5IHRhc2sgbGlzdFxyXG5cdFx0dGhpcy5yZW5kZXJFbXB0eVRhc2tMaXN0KHQoXCJTZWxlY3QgYSBwcm9qZWN0IHRvIHJldmlldyBpdHMgdGFza3MuXCIpKTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzZXRUYXNrcyh0YXNrczogVGFza1tdKSB7XHJcblx0XHRjb25zb2xlLmxvZyhcIlJldmlld0NvbXBvbmVudC5zZXRUYXNrcyBjYWxsZWQgd2l0aFwiLCB0YXNrcy5sZW5ndGgsIFwidGFza3NcIik7XHJcblx0XHR0aGlzLmFsbFRhc2tzID0gdGFza3M7XHJcblx0XHQvLyBSZWxvYWQgc2V0dGluZ3MgcG90ZW50aWFsbHksIGluIGNhc2UgYSBwcm9qZWN0IHJlbGV2YW50IHRvIHNldHRpbmdzIHdhcyBhZGRlZC9yZW1vdmVkXHJcblx0XHQvLyBPciBqdXN0IGZpbHRlciBleGlzdGluZyBzZXR0aW5ncyBiYXNlZCBvbiBjdXJyZW50IHRhc2tzXHJcblx0XHR0aGlzLmxvYWRSZXZpZXdTZXR0aW5ncygpOyAvLyBSZWxvYWQgYW5kIGZpbHRlciBzZXR0aW5ncyBiYXNlZCBvbiBwb3RlbnRpYWxseSBuZXcgdGFza3NcclxuXHRcdC8vIE5vdGU6IGxvYWRSZXZpZXdTZXR0aW5ncyBhbHJlYWR5IGhhbmRsZXMgcmUtc2VsZWN0aW5nIG9yIHNlbGVjdGluZyB0aGUgZmlyc3QgcHJvamVjdFxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSByZW5kZXJQcm9qZWN0c0xpc3QoKSB7XHJcblx0XHR0aGlzLnByb2plY3RzTGlzdEVsLmVtcHR5KCk7XHJcblx0XHRjb25zdCBzb3J0ZWRQcm9qZWN0cyA9IEFycmF5LmZyb20oXHJcblx0XHRcdHRoaXMucmV2aWV3YWJsZVByb2plY3RzLmtleXMoKVxyXG5cdFx0KS5zb3J0KCk7XHJcblxyXG5cdFx0Ly8gRmlyc3QgZGlzcGxheSBwcm9qZWN0cyB3aXRoIHJldmlldyBzZXR0aW5nc1xyXG5cdFx0Y29uc3QgcHJvamVjdHNXaXRoU2V0dGluZ3MgPSBzb3J0ZWRQcm9qZWN0cy5maWx0ZXIoKHByb2plY3ROYW1lKSA9PiB7XHJcblx0XHRcdGNvbnN0IHNldHRpbmcgPSB0aGlzLnJldmlld2FibGVQcm9qZWN0cy5nZXQocHJvamVjdE5hbWUpO1xyXG5cdFx0XHRyZXR1cm4gc2V0dGluZyAmJiBzZXR0aW5nLmZyZXF1ZW5jeTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFRoZW4gZGlzcGxheSBwcm9qZWN0cyB3aXRob3V0IHJldmlldyBzZXR0aW5nc1xyXG5cdFx0Y29uc3QgcHJvamVjdHNXaXRob3V0U2V0dGluZ3MgPSBzb3J0ZWRQcm9qZWN0cy5maWx0ZXIoKHByb2plY3ROYW1lKSA9PiB7XHJcblx0XHRcdGNvbnN0IHNldHRpbmcgPSB0aGlzLnJldmlld2FibGVQcm9qZWN0cy5nZXQocHJvamVjdE5hbWUpO1xyXG5cdFx0XHRyZXR1cm4gIXNldHRpbmcgfHwgIXNldHRpbmcuZnJlcXVlbmN5O1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gSGVscGVyIGZ1bmN0aW9uIHRvIHJlbmRlciBhIHByb2plY3QgaXRlbVxyXG5cdFx0Y29uc3QgcmVuZGVyUHJvamVjdEl0ZW0gPSAocHJvamVjdE5hbWU6IHN0cmluZykgPT4ge1xyXG5cdFx0XHRjb25zdCBwcm9qZWN0U2V0dGluZyA9IHRoaXMucmV2aWV3YWJsZVByb2plY3RzLmdldChwcm9qZWN0TmFtZSk7XHJcblx0XHRcdGlmICghcHJvamVjdFNldHRpbmcpIHJldHVybjsgLy8gU2hvdWxkIG5vdCBoYXBwZW5cclxuXHJcblx0XHRcdGNvbnN0IHByb2plY3RJdGVtID0gdGhpcy5wcm9qZWN0c0xpc3RFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJyZXZpZXctcHJvamVjdC1pdGVtXCIsIC8vIFNwZWNpZmljIGNsYXNzXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRwcm9qZWN0SXRlbS5kYXRhc2V0LnByb2plY3QgPSBwcm9qZWN0TmFtZTsgLy8gU3RvcmUgcHJvamVjdCBuYW1lXHJcblxyXG5cdFx0XHQvLyBBZGQgY2xhc3MgaWYgdGhlIHByb2plY3QgaGFzIHJldmlldyBzZXR0aW5ncyBjb25maWd1cmVkXHJcblx0XHRcdGlmIChwcm9qZWN0U2V0dGluZy5mcmVxdWVuY3kpIHtcclxuXHRcdFx0XHRwcm9qZWN0SXRlbS5hZGRDbGFzcyhcImhhcy1yZXZpZXctc2V0dGluZ3NcIik7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEFkZCBjbGFzcyBpZiByZXZpZXcgaXMgZHVlXHJcblx0XHRcdGlmICh0aGlzLmlzUmV2aWV3RHVlKHByb2plY3RTZXR0aW5nKSkge1xyXG5cdFx0XHRcdHByb2plY3RJdGVtLmFkZENsYXNzKFwiaXMtcmV2aWV3LWR1ZVwiKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSWNvblxyXG5cdFx0XHRjb25zdCBpY29uRWwgPSBwcm9qZWN0SXRlbS5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJyZXZpZXctcHJvamVjdC1pY29uXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHQvLyBVc2UgZGlmZmVyZW50IGljb24gYmFzZWQgb24gd2hldGhlciBwcm9qZWN0IGhhcyByZXZpZXcgc2V0dGluZ3NcclxuXHRcdFx0c2V0SWNvbihcclxuXHRcdFx0XHRpY29uRWwsXHJcblx0XHRcdFx0cHJvamVjdFNldHRpbmcuZnJlcXVlbmN5ID8gXCJmb2xkZXItY2hlY2tcIiA6IFwiZm9sZGVyXCJcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIE5hbWVcclxuXHRcdFx0Y29uc3QgbmFtZUVsID0gcHJvamVjdEl0ZW0uY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwicmV2aWV3LXByb2plY3QtbmFtZVwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0bmFtZUVsLnNldFRleHQocHJvamVjdE5hbWUpO1xyXG5cclxuXHRcdFx0Ly8gSGlnaGxpZ2h0IGlmIHNlbGVjdGVkXHJcblx0XHRcdGlmICh0aGlzLnNlbGVjdGVkUHJvamVjdC5wcm9qZWN0ID09PSBwcm9qZWN0TmFtZSkge1xyXG5cdFx0XHRcdHByb2plY3RJdGVtLmFkZENsYXNzKFwic2VsZWN0ZWRcIik7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENsaWNrIGhhbmRsZXJcclxuXHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KHByb2plY3RJdGVtLCBcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0XHR0aGlzLnNlbGVjdFByb2plY3QocHJvamVjdE5hbWUpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gSWYgdGhlcmUgYXJlIHByb2plY3RzIHdpdGggc2V0dGluZ3MsIGFkZCBhIGhlYWRlclxyXG5cdFx0aWYgKHByb2plY3RzV2l0aFNldHRpbmdzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0Y29uc3Qgd2l0aFNldHRpbmdzSGVhZGVyID0gdGhpcy5wcm9qZWN0c0xpc3RFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJyZXZpZXctcHJvamVjdHMtZ3JvdXAtaGVhZGVyXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHR3aXRoU2V0dGluZ3NIZWFkZXIuc2V0VGV4dCh0KFwiQ29uZmlndXJlZCBmb3IgUmV2aWV3XCIpKTtcclxuXHJcblx0XHRcdC8vIFJlbmRlciBwcm9qZWN0cyB3aXRoIHJldmlldyBzZXR0aW5nc1xyXG5cdFx0XHRwcm9qZWN0c1dpdGhTZXR0aW5ncy5mb3JFYWNoKHJlbmRlclByb2plY3RJdGVtKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBJZiB0aGVyZSBhcmUgcHJvamVjdHMgd2l0aG91dCBzZXR0aW5ncywgYWRkIGEgaGVhZGVyXHJcblx0XHRpZiAocHJvamVjdHNXaXRob3V0U2V0dGluZ3MubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRjb25zdCB3aXRob3V0U2V0dGluZ3NIZWFkZXIgPSB0aGlzLnByb2plY3RzTGlzdEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcInJldmlldy1wcm9qZWN0cy1ncm91cC1oZWFkZXJcIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdHdpdGhvdXRTZXR0aW5nc0hlYWRlci5zZXRUZXh0KHQoXCJOb3QgQ29uZmlndXJlZFwiKSk7XHJcblxyXG5cdFx0XHQvLyBSZW5kZXIgcHJvamVjdHMgd2l0aG91dCByZXZpZXcgc2V0dGluZ3NcclxuXHRcdFx0cHJvamVjdHNXaXRob3V0U2V0dGluZ3MuZm9yRWFjaChyZW5kZXJQcm9qZWN0SXRlbSk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHNvcnRlZFByb2plY3RzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRjb25zdCBlbXB0eUVsID0gdGhpcy5wcm9qZWN0c0xpc3RFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJyZXZpZXctZW1wdHktc3RhdGVcIiwgLy8gVXNlIGEgc3BlY2lmaWMgY2xhc3MgaWYgbmVlZGVkXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRlbXB0eUVsLnNldFRleHQodChcIk5vIHByb2plY3RzIGF2YWlsYWJsZS5cIikpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBzZWxlY3RQcm9qZWN0KHByb2plY3ROYW1lOiBzdHJpbmcgfCBudWxsKSB7XHJcblx0XHQvLyBIYW5kbGUgZGVzZWxlY3Rpb24gb3Igc2VsZWN0aW5nIG5vbi1leGlzdGVudCBwcm9qZWN0XHJcblx0XHRpZiAoIXByb2plY3ROYW1lIHx8ICF0aGlzLnJldmlld2FibGVQcm9qZWN0cy5oYXMocHJvamVjdE5hbWUpKSB7XHJcblx0XHRcdHRoaXMuc2VsZWN0ZWRQcm9qZWN0ID0geyBwcm9qZWN0OiBudWxsLCB0YXNrczogW10sIHNldHRpbmc6IG51bGwgfTtcclxuXHRcdFx0dGhpcy5yZW5kZXJFbXB0eVRhc2tMaXN0KHQoXCJTZWxlY3QgYSBwcm9qZWN0IHRvIHJldmlldy5cIikpO1xyXG5cdFx0XHQvLyBVcGRhdGUgVUkgdG8gcmVtb3ZlIHNlbGVjdGlvbiBoaWdobGlnaHRcclxuXHRcdFx0Y29uc3QgcHJvamVjdEl0ZW1zID0gdGhpcy5wcm9qZWN0c0xpc3RFbC5xdWVyeVNlbGVjdG9yQWxsKFxyXG5cdFx0XHRcdFwiLnJldmlldy1wcm9qZWN0LWl0ZW1cIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRwcm9qZWN0SXRlbXMuZm9yRWFjaCgoaXRlbSkgPT4gaXRlbS5jbGFzc0xpc3QucmVtb3ZlKFwic2VsZWN0ZWRcIikpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3Qgc2V0dGluZyA9IHRoaXMucmV2aWV3YWJsZVByb2plY3RzLmdldChwcm9qZWN0TmFtZSk7XHJcblx0XHRpZiAoIXNldHRpbmcpIHJldHVybjsgLy8gU2hvdWxkIGJlIGNhdWdodCBhYm92ZSwgYnV0IHNhZmV0eSBjaGVja1xyXG5cclxuXHRcdHRoaXMuc2VsZWN0ZWRQcm9qZWN0LnByb2plY3QgPSBwcm9qZWN0TmFtZTtcclxuXHRcdHRoaXMuc2VsZWN0ZWRQcm9qZWN0LnNldHRpbmcgPSBzZXR0aW5nO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSBVSSBoaWdobGlnaHRpbmdcclxuXHRcdGNvbnN0IHByb2plY3RJdGVtcyA9IHRoaXMucHJvamVjdHNMaXN0RWwucXVlcnlTZWxlY3RvckFsbChcclxuXHRcdFx0XCIucmV2aWV3LXByb2plY3QtaXRlbVwiXHJcblx0XHQpO1xyXG5cdFx0cHJvamVjdEl0ZW1zLmZvckVhY2goKGl0ZW0pID0+IHtcclxuXHRcdFx0aWYgKGl0ZW0uZ2V0QXR0cmlidXRlKFwiZGF0YS1wcm9qZWN0XCIpID09PSBwcm9qZWN0TmFtZSkge1xyXG5cdFx0XHRcdGl0ZW0uY2xhc3NMaXN0LmFkZChcInNlbGVjdGVkXCIpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGl0ZW0uY2xhc3NMaXN0LnJlbW92ZShcInNlbGVjdGVkXCIpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBIaWRlIHNpZGViYXIgb24gbW9iaWxlIGFmdGVyIHNlbGVjdGlvblxyXG5cdFx0aWYgKFBsYXRmb3JtLmlzUGhvbmUpIHtcclxuXHRcdFx0dGhpcy50b2dnbGVMZWZ0Q29sdW1uVmlzaWJpbGl0eShmYWxzZSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gTG9hZCBhbmQgcmVuZGVyIHRhc2tzIGZvciB0aGlzIHByb2plY3RcclxuXHRcdHRoaXMudXBkYXRlU2VsZWN0ZWRQcm9qZWN0VGFza3MoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgdXBkYXRlU2VsZWN0ZWRQcm9qZWN0VGFza3MoKSB7XHJcblx0XHRpZiAoIXRoaXMuc2VsZWN0ZWRQcm9qZWN0LnByb2plY3QpIHtcclxuXHRcdFx0Ly8gVXNlIHJlbmRlcmVyJ3MgZW1wdHkgc3RhdGVcclxuXHRcdFx0dGhpcy5yZW5kZXJFbXB0eVRhc2tMaXN0KFxyXG5cdFx0XHRcdHQoXCJTZWxlY3QgYSBwcm9qZWN0IHRvIHJldmlldyBpdHMgdGFza3MuXCIpXHJcblx0XHRcdCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBGaWx0ZXIgdGFza3MgZm9yIHRoZSBzZWxlY3RlZCBwcm9qZWN0XHJcblx0XHRjb25zdCBhbGxQcm9qZWN0VGFza3MgPSB0aGlzLmFsbFRhc2tzLmZpbHRlcihcclxuXHRcdFx0KHRhc2spID0+IHRhc2subWV0YWRhdGEucHJvamVjdCA9PT0gdGhpcy5zZWxlY3RlZFByb2plY3QucHJvamVjdFxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBHZXQgcmV2aWV3IHNldHRpbmdzIGZvciB0aGUgc2VsZWN0ZWQgcHJvamVjdFxyXG5cdFx0Y29uc3QgcmV2aWV3U2V0dGluZyA9IHRoaXMuc2VsZWN0ZWRQcm9qZWN0LnNldHRpbmc7XHJcblxyXG5cdFx0Ly8gQXJyYXkgdG8gc3RvcmUgZmlsdGVyZWQgdGFza3MgdGhhdCBzaG91bGQgYmUgZGlzcGxheWVkXHJcblx0XHRsZXQgZmlsdGVyZWRUYXNrczogVGFza1tdID0gW107XHJcblxyXG5cdFx0Ly8gQ2xlYXIgYW55IGV4aXN0aW5nIGZpbHRlciBpbmZvXHJcblx0XHRjb25zdCB0YXNrSGVhZGVyQ29udGVudCA9IHRoaXMudGFza0hlYWRlckVsLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFwiLnJldmlldy1oZWFkZXItY29udGVudFwiXHJcblx0XHQpO1xyXG5cdFx0Y29uc3QgZXhpc3RpbmdGaWx0ZXJJbmZvID0gdGFza0hlYWRlckNvbnRlbnQ/LnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFwiLnJldmlldy1maWx0ZXItaW5mb1wiXHJcblx0XHQpO1xyXG5cdFx0aWYgKGV4aXN0aW5nRmlsdGVySW5mbykge1xyXG5cdFx0XHRleGlzdGluZ0ZpbHRlckluZm8ucmVtb3ZlKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHJldmlld1NldHRpbmcgJiYgcmV2aWV3U2V0dGluZy5sYXN0UmV2aWV3ZWQgJiYgIXRoaXMuc2hvd0FsbFRhc2tzKSB7XHJcblx0XHRcdC8vIElmIHByb2plY3QgaGFzIGJlZW4gcmV2aWV3ZWQgYmVmb3JlIGFuZCB3ZSdyZSBub3Qgc2hvd2luZyBhbGwgdGFza3MsIGZpbHRlciB0aGUgdGFza3NcclxuXHRcdFx0Y29uc3QgbGFzdFJldmlld0RhdGUgPSByZXZpZXdTZXR0aW5nLmxhc3RSZXZpZXdlZDtcclxuXHRcdFx0Y29uc3QgcmV2aWV3ZWRUYXNrSWRzID0gbmV3IFNldChcclxuXHRcdFx0XHRyZXZpZXdTZXR0aW5nLnJldmlld2VkVGFza0lkcyB8fCBbXVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gRmlsdGVyIHRhc2tzIHRvIG9ubHkgc2hvdzpcclxuXHRcdFx0Ly8gMS4gVGFza3MgdGhhdCB3ZXJlIGNyZWF0ZWQgYWZ0ZXIgdGhlIGxhc3QgcmV2aWV3IGRhdGVcclxuXHRcdFx0Ly8gMi4gVGFza3MgdGhhdCBleGlzdGVkIGR1cmluZyBsYXN0IHJldmlldyBidXQgd2VyZW4ndCBjb21wbGV0ZWQgdGhlbiBhbmQgc3RpbGwgYXJlbid0IGNvbXBsZXRlZFxyXG5cdFx0XHQvLyAzLiBUYXNrcyB0aGF0IGFyZSBpbiBwcm9ncmVzcyAobWlnaHQgaGF2ZSBiZWVuIG1vZGlmaWVkIHNpbmNlIGxhc3QgcmV2aWV3KVxyXG5cdFx0XHRmaWx0ZXJlZFRhc2tzID0gYWxsUHJvamVjdFRhc2tzLmZpbHRlcigodGFzaykgPT4ge1xyXG5cdFx0XHRcdC8vIEFsd2F5cyBpbmNsdWRlIGluY29tcGxldGUgbmV3IHRhc2tzIChjcmVhdGVkIGFmdGVyIGxhc3QgcmV2aWV3KVxyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdHRhc2subWV0YWRhdGEuY3JlYXRlZERhdGUgJiZcclxuXHRcdFx0XHRcdHRhc2subWV0YWRhdGEuY3JlYXRlZERhdGUgPiBsYXN0UmV2aWV3RGF0ZVxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBJZiB0YXNrIHdhcyBhbHJlYWR5IHJldmlld2VkIGluIHByZXZpb3VzIHJldmlldyBhbmQgaXMgbm93IGNvbXBsZXRlZCwgZXhjbHVkZSBpdFxyXG5cdFx0XHRcdGlmIChyZXZpZXdlZFRhc2tJZHMuaGFzKHRhc2suaWQpICYmIHRhc2suY29tcGxldGVkKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBJbmNsdWRlIHRhc2tzIHRoYXQgd2VyZSByZXZpZXdlZCBiZWZvcmUgYnV0IGFyZW4ndCBjb21wbGV0ZWQgeWV0XHJcblx0XHRcdFx0aWYgKHJldmlld2VkVGFza0lkcy5oYXModGFzay5pZCkgJiYgIXRhc2suY29tcGxldGVkKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIEluY2x1ZGUgdGFza3MgdGhhdCB3ZXJlbid0IHJldmlld2VkIGJlZm9yZSAodGhleSBtaWdodCBiZSBvbGRlciB0YXNrc1xyXG5cdFx0XHRcdC8vIHRoYXQgd2VyZSBhZGRlZCB0byB0aGlzIHByb2plY3QgYWZ0ZXIgdGhlIGxhc3QgcmV2aWV3KVxyXG5cdFx0XHRcdGlmICghcmV2aWV3ZWRUYXNrSWRzLmhhcyh0YXNrLmlkKSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQWRkIGEgbWVzc2FnZSBhYm91dCBmaWx0ZXJlZCB0YXNrcyBpZiBzb21lIHdlcmUgZmlsdGVyZWQgb3V0XHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHRmaWx0ZXJlZFRhc2tzLmxlbmd0aCA8IGFsbFByb2plY3RUYXNrcy5sZW5ndGggJiZcclxuXHRcdFx0XHR0YXNrSGVhZGVyQ29udGVudFxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRjb25zdCBmaWx0ZXJJbmZvID0gdGFza0hlYWRlckNvbnRlbnQuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRcdGNsczogXCJyZXZpZXctZmlsdGVyLWluZm9cIixcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Y29uc3QgaGlkZGVuVGFza3MgPVxyXG5cdFx0XHRcdFx0YWxsUHJvamVjdFRhc2tzLmxlbmd0aCAtIGZpbHRlcmVkVGFza3MubGVuZ3RoO1xyXG5cdFx0XHRcdGNvbnN0IGZpbHRlclRleHQgPSBmaWx0ZXJJbmZvLmNyZWF0ZVNwYW4oe1xyXG5cdFx0XHRcdFx0dGV4dDogdChcclxuXHRcdFx0XHRcdFx0YFNob3dpbmcgbmV3IGFuZCBpbi1wcm9ncmVzcyB0YXNrcyBvbmx5LiAke2hpZGRlblRhc2tzfSBjb21wbGV0ZWQgdGFza3MgZnJvbSBwcmV2aW91cyByZXZpZXdzIGFyZSBoaWRkZW4uYFxyXG5cdFx0XHRcdFx0KSxcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gQWRkIHRvZ2dsZSBsaW5rXHJcblx0XHRcdFx0Y29uc3QgdG9nZ2xlTGluayA9IGZpbHRlckluZm8uY3JlYXRlU3Bhbih7XHJcblx0XHRcdFx0XHRjbHM6IFwicmV2aWV3LWZpbHRlci10b2dnbGVcIixcclxuXHRcdFx0XHRcdHRleHQ6IHQoXCJTaG93IGFsbCB0YXNrc1wiKSxcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KHRvZ2dsZUxpbmssIFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy50b2dnbGVTaG93QWxsVGFza3MoKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gSWYgdGhlIHByb2plY3QgaGFzIG5ldmVyIGJlZW4gcmV2aWV3ZWQgb3Igd2UncmUgc2hvd2luZyBhbGwgdGFza3NcclxuXHRcdFx0ZmlsdGVyZWRUYXNrcyA9IGFsbFByb2plY3RUYXNrcztcclxuXHJcblx0XHRcdC8vIElmIHdlJ3JlIGV4cGxpY2l0bHkgc2hvd2luZyBhbGwgdGFza3MsIGRpc3BsYXkgdGhpcyBpbmZvXHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHR0aGlzLnNob3dBbGxUYXNrcyAmJlxyXG5cdFx0XHRcdHRhc2tIZWFkZXJDb250ZW50ICYmXHJcblx0XHRcdFx0cmV2aWV3U2V0dGluZz8ubGFzdFJldmlld2VkXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdGNvbnN0IGZpbHRlckluZm8gPSB0YXNrSGVhZGVyQ29udGVudC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdFx0Y2xzOiBcInJldmlldy1maWx0ZXItaW5mb1wiLFxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRjb25zdCBmaWx0ZXJUZXh0ID0gZmlsdGVySW5mby5jcmVhdGVTcGFuKHtcclxuXHRcdFx0XHRcdHRleHQ6IHQoXHJcblx0XHRcdFx0XHRcdFwiU2hvd2luZyBhbGwgdGFza3MsIGluY2x1ZGluZyBjb21wbGV0ZWQgdGFza3MgZnJvbSBwcmV2aW91cyByZXZpZXdzLlwiXHJcblx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyBBZGQgdG9nZ2xlIGxpbmtcclxuXHRcdFx0XHRjb25zdCB0b2dnbGVMaW5rID0gZmlsdGVySW5mby5jcmVhdGVTcGFuKHtcclxuXHRcdFx0XHRcdGNsczogXCJyZXZpZXctZmlsdGVyLXRvZ2dsZVwiLFxyXG5cdFx0XHRcdFx0dGV4dDogdChcIlNob3cgb25seSBuZXcgYW5kIGluLXByb2dyZXNzIHRhc2tzXCIpLFxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQodG9nZ2xlTGluaywgXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLnRvZ2dsZVNob3dBbGxUYXNrcygpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHRoZSBzZWxlY3RlZCBwcm9qZWN0J3MgdGFza3NcclxuXHRcdHRoaXMuc2VsZWN0ZWRQcm9qZWN0LnRhc2tzID0gZmlsdGVyZWRUYXNrcztcclxuXHRcdC8vIFNvcnQgdGFza3MgKGV4YW1wbGU6IGJ5IGR1ZSBkYXRlLCB0aGVuIHByaW9yaXR5KVxyXG5cdFx0dGhpcy5zZWxlY3RlZFByb2plY3QudGFza3Muc29ydCgoYSwgYikgPT4ge1xyXG5cdFx0XHQvLyBGaXJzdCBieSBjb21wbGV0aW9uIHN0YXR1cyAoaW5jb21wbGV0ZSBmaXJzdClcclxuXHRcdFx0aWYgKGEuY29tcGxldGVkICE9PSBiLmNvbXBsZXRlZCkge1xyXG5cdFx0XHRcdHJldHVybiBhLmNvbXBsZXRlZCA/IDEgOiAtMTtcclxuXHRcdFx0fVxyXG5cdFx0XHQvLyBUaGVuIGJ5IGR1ZSBkYXRlIChlYXJseSB0byBsYXRlLCBudWxscyBsYXN0KVxyXG5cdFx0XHRjb25zdCBkdWVEYXRlQSA9IGEubWV0YWRhdGEuZHVlRGF0ZVxyXG5cdFx0XHRcdD8gbmV3IERhdGUoYS5tZXRhZGF0YS5kdWVEYXRlKS5nZXRUaW1lKClcclxuXHRcdFx0XHQ6IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSO1xyXG5cdFx0XHRjb25zdCBkdWVEYXRlQiA9IGIubWV0YWRhdGEuZHVlRGF0ZVxyXG5cdFx0XHRcdD8gbmV3IERhdGUoYi5tZXRhZGF0YS5kdWVEYXRlKS5nZXRUaW1lKClcclxuXHRcdFx0XHQ6IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSO1xyXG5cdFx0XHRpZiAoZHVlRGF0ZUEgIT09IGR1ZURhdGVCKSB7XHJcblx0XHRcdFx0cmV0dXJuIGR1ZURhdGVBIC0gZHVlRGF0ZUI7XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gVGhlbiBieSBwcmlvcml0eSAoaGlnaCB0byBsb3csIDAgaXMgbG93ZXN0KVxyXG5cdFx0XHRjb25zdCBwcmlvcml0eUEgPSBhLm1ldGFkYXRhLnByaW9yaXR5IHx8IDA7XHJcblx0XHRcdGNvbnN0IHByaW9yaXR5QiA9IGIubWV0YWRhdGEucHJpb3JpdHkgfHwgMDtcclxuXHRcdFx0cmV0dXJuIHByaW9yaXR5QiAtIHByaW9yaXR5QTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSB0aGUgdGFzayBsaXN0IHVzaW5nIHRoZSByZW5kZXJlclxyXG5cdFx0dGhpcy5yZW5kZXJUYXNrTGlzdCgpO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSBmaWx0ZXIgaW5mbyBpbiBoZWFkZXIgKG5lZWRzIHRvIGJlIGNhbGxlZCBhZnRlciByZW5kZXJUYXNrTGlzdCB1cGRhdGVzIHRoZSBoZWFkZXIpXHJcblx0XHR0aGlzLnVwZGF0ZUZpbHRlckluZm9JbkhlYWRlcihcclxuXHRcdFx0YWxsUHJvamVjdFRhc2tzLmxlbmd0aCxcclxuXHRcdFx0ZmlsdGVyZWRUYXNrcy5sZW5ndGhcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHVwZGF0ZUZpbHRlckluZm9JbkhlYWRlcih0b3RhbFRhc2tzOiBudW1iZXIsIHZpc2libGVUYXNrczogbnVtYmVyKSB7XHJcblx0XHRjb25zdCB0YXNrSGVhZGVyQ29udGVudCA9IHRoaXMudGFza0hlYWRlckVsLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFwiLnJldmlldy1oZWFkZXItY29udGVudFwiXHJcblx0XHQpO1xyXG5cdFx0aWYgKCF0YXNrSGVhZGVyQ29udGVudCkgcmV0dXJuO1xyXG5cclxuXHRcdC8vIENsZWFyIGV4aXN0aW5nIGZpbHRlciBpbmZvXHJcblx0XHRjb25zdCBleGlzdGluZ0ZpbHRlckluZm8gPSB0YXNrSGVhZGVyQ29udGVudC5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRcIi5yZXZpZXctZmlsdGVyLWluZm9cIlxyXG5cdFx0KTtcclxuXHRcdGlmIChleGlzdGluZ0ZpbHRlckluZm8pIHtcclxuXHRcdFx0ZXhpc3RpbmdGaWx0ZXJJbmZvLnJlbW92ZSgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIERldGVybWluZSB3aGljaCBtZXNzYWdlIGFuZCB0b2dnbGUgdG8gc2hvd1xyXG5cdFx0Y29uc3QgcmV2aWV3U2V0dGluZyA9IHRoaXMuc2VsZWN0ZWRQcm9qZWN0LnNldHRpbmc7XHJcblx0XHRpZiAocmV2aWV3U2V0dGluZz8ubGFzdFJldmlld2VkKSB7XHJcblx0XHRcdGNvbnN0IGhpZGRlblRhc2tzID0gdG90YWxUYXNrcyAtIHZpc2libGVUYXNrcztcclxuXHRcdFx0aWYgKCF0aGlzLnNob3dBbGxUYXNrcyAmJiBoaWRkZW5UYXNrcyA+IDApIHtcclxuXHRcdFx0XHQvLyBTaG93aW5nIGZpbHRlcmVkIHZpZXdcclxuXHRcdFx0XHRjb25zdCBmaWx0ZXJJbmZvID0gdGFza0hlYWRlckNvbnRlbnQuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRcdGNsczogXCJyZXZpZXctZmlsdGVyLWluZm9cIixcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRmaWx0ZXJJbmZvLmNyZWF0ZVNwYW4oe1xyXG5cdFx0XHRcdFx0dGV4dDogdChcclxuXHRcdFx0XHRcdFx0YFNob3dpbmcgbmV3IGFuZCBpbi1wcm9ncmVzcyB0YXNrcyBvbmx5LiAke2hpZGRlblRhc2tzfSBjb21wbGV0ZWQgdGFza3MgZnJvbSBwcmV2aW91cyByZXZpZXdzIGFyZSBoaWRkZW4uYFxyXG5cdFx0XHRcdFx0KSxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRjb25zdCB0b2dnbGVMaW5rID0gZmlsdGVySW5mby5jcmVhdGVTcGFuKHtcclxuXHRcdFx0XHRcdGNsczogXCJyZXZpZXctZmlsdGVyLXRvZ2dsZVwiLFxyXG5cdFx0XHRcdFx0dGV4dDogdChcIlNob3cgYWxsIHRhc2tzXCIpLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudCh0b2dnbGVMaW5rLCBcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMudG9nZ2xlU2hvd0FsbFRhc2tzKCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0gZWxzZSBpZiAodGhpcy5zaG93QWxsVGFza3MgJiYgdG90YWxUYXNrcyA+IDApIHtcclxuXHRcdFx0XHQvLyBTaG93aW5nIGFsbCB0YXNrcyBleHBsaWNpdGx5XHJcblx0XHRcdFx0Y29uc3QgZmlsdGVySW5mbyA9IHRhc2tIZWFkZXJDb250ZW50LmNyZWF0ZURpdih7XHJcblx0XHRcdFx0XHRjbHM6IFwicmV2aWV3LWZpbHRlci1pbmZvXCIsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0ZmlsdGVySW5mby5jcmVhdGVTcGFuKHtcclxuXHRcdFx0XHRcdHRleHQ6IHQoXHJcblx0XHRcdFx0XHRcdFwiU2hvd2luZyBhbGwgdGFza3MsIGluY2x1ZGluZyBjb21wbGV0ZWQgdGFza3MgZnJvbSBwcmV2aW91cyByZXZpZXdzLlwiXHJcblx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGNvbnN0IHRvZ2dsZUxpbmsgPSBmaWx0ZXJJbmZvLmNyZWF0ZVNwYW4oe1xyXG5cdFx0XHRcdFx0Y2xzOiBcInJldmlldy1maWx0ZXItdG9nZ2xlXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiB0KFwiU2hvdyBvbmx5IG5ldyBhbmQgaW4tcHJvZ3Jlc3MgdGFza3NcIiksXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KHRvZ2dsZUxpbmssIFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy50b2dnbGVTaG93QWxsVGFza3MoKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSB0b2dnbGVTaG93QWxsVGFza3MoKSB7XHJcblx0XHR0aGlzLnNob3dBbGxUYXNrcyA9ICF0aGlzLnNob3dBbGxUYXNrcztcclxuXHRcdHRoaXMudXBkYXRlU2VsZWN0ZWRQcm9qZWN0VGFza3MoKTsgLy8gVGhpcyB3aWxsIHJlLXJlbmRlciBhbmQgdXBkYXRlIHRoZSBoZWFkZXIgaW5mb1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSByZW5kZXJUYXNrTGlzdCgpIHtcclxuXHRcdC8vIFJlbmRlcmVyIGhhbmRsZXMgY29tcG9uZW50IGNsZWFudXAgYW5kIGNvbnRhaW5lciBjbGVhcmluZ1xyXG5cdFx0dGhpcy50YXNrSGVhZGVyRWwuZW1wdHkoKTsgLy8gU3RpbGwgbmVlZCB0byBjbGVhci9yZS1yZW5kZXIgdGhlIHNwZWNpZmljIGhlYWRlclxyXG5cclxuXHRcdGlmIChQbGF0Zm9ybS5pc1Bob25lKSB7XHJcblx0XHRcdHRoaXMucmVuZGVyTW9iaWxlVG9nZ2xlKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKCF0aGlzLnNlbGVjdGVkUHJvamVjdC5wcm9qZWN0IHx8ICF0aGlzLnNlbGVjdGVkUHJvamVjdC5zZXR0aW5nKSB7XHJcblx0XHRcdHRoaXMucmVuZGVyRW1wdHlUYXNrTGlzdChcclxuXHRcdFx0XHR0KFwiU2VsZWN0IGEgcHJvamVjdCB0byByZXZpZXcgaXRzIHRhc2tzLlwiKVxyXG5cdFx0XHQpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gLS0tIFJlbmRlciBIZWFkZXIgLS0tXHJcblx0XHR0aGlzLnJlbmRlclJldmlld0hlYWRlcihcclxuXHRcdFx0dGhpcy5zZWxlY3RlZFByb2plY3QucHJvamVjdCxcclxuXHRcdFx0dGhpcy5zZWxlY3RlZFByb2plY3Quc2V0dGluZ1xyXG5cdFx0KTtcclxuXHJcblx0XHQvLyAtLS0gUmVuZGVyIFRhc2tzIHVzaW5nIFJlbmRlcmVyIC0tLVxyXG5cclxuXHRcdHRoaXMuYWxsVGFza3NNYXAgPSBuZXcgTWFwKFxyXG5cdFx0XHR0aGlzLmFsbFRhc2tzLm1hcCgodGFzaykgPT4gW3Rhc2suaWQsIHRhc2tdKVxyXG5cdFx0KTtcclxuXHJcblx0XHR0aGlzLnRhc2tSZW5kZXJlci5yZW5kZXJUYXNrcyhcclxuXHRcdFx0dGhpcy5zZWxlY3RlZFByb2plY3QudGFza3MsXHJcblx0XHRcdGZhbHNlLCAvLyBpc1RyZWVWaWV3ID0gZmFsc2VcclxuXHRcdFx0dGhpcy5hbGxUYXNrc01hcCxcclxuXHRcdFx0dChcIk5vIHRhc2tzIGZvdW5kIGZvciB0aGlzIHByb2plY3QuXCIpIC8vIGVtcHR5TWVzc2FnZVxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyUmV2aWV3SGVhZGVyKFxyXG5cdFx0cHJvamVjdE5hbWU6IHN0cmluZyxcclxuXHRcdHNldHRpbmc6IFByb2plY3RSZXZpZXdTZXR0aW5nXHJcblx0KSB7XHJcblx0XHR0aGlzLnRhc2tIZWFkZXJFbC5lbXB0eSgpOyAvLyBDbGVhciBwcmV2aW91cyBoZWFkZXIgY29udGVudFxyXG5cclxuXHRcdGlmIChQbGF0Zm9ybS5pc1Bob25lKSB7XHJcblx0XHRcdHRoaXMucmVuZGVyTW9iaWxlVG9nZ2xlKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgaGVhZGVyQ29udGVudCA9IHRoaXMudGFza0hlYWRlckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJyZXZpZXctaGVhZGVyLWNvbnRlbnRcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFByb2plY3QgVGl0bGVcclxuXHRcdGhlYWRlckNvbnRlbnQuY3JlYXRlRWwoXCJoM1wiLCB7XHJcblx0XHRcdGNsczogW1wicmV2aWV3LXRpdGxlXCIsIFwiY29udGVudC10aXRsZVwiXSxcclxuXHRcdFx0dGV4dDogcHJvamVjdE5hbWUsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBSZXZpZXcgSW5mbyBMaW5lIChGcmVxdWVuY3kgYW5kIExhc3QgUmV2aWV3ZWQgRGF0ZSlcclxuXHRcdGNvbnN0IHJldmlld0luZm9FbCA9IGhlYWRlckNvbnRlbnQuY3JlYXRlRGl2KHsgY2xzOiBcInJldmlldy1pbmZvXCIgfSk7XHJcblxyXG5cdFx0Ly8gRGlzcGxheSBkaWZmZXJlbnQgY29udGVudCBiYXNlZCBvbiB3aGV0aGVyIHByb2plY3QgaGFzIHJldmlldyBzZXR0aW5nc1xyXG5cdFx0aWYgKHNldHRpbmcuZnJlcXVlbmN5KSB7XHJcblx0XHRcdC8vIEZyZXF1ZW5jeSBUZXh0XHJcblx0XHRcdGNvbnN0IGZyZXF1ZW5jeVRleHQgPSBgJHt0KFwiUmV2aWV3IGV2ZXJ5XCIpfSAke3NldHRpbmcuZnJlcXVlbmN5fWA7XHJcblx0XHRcdHJldmlld0luZm9FbC5jcmVhdGVTcGFuKFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGNsczogXCJyZXZpZXctZnJlcXVlbmN5XCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBmcmVxdWVuY3lUZXh0LFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0KGVsKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZWwsIFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLm9wZW5Db25maWd1cmVNb2RhbChwcm9qZWN0TmFtZSwgc2V0dGluZyk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBTZXBhcmF0b3JcclxuXHRcdFx0cmV2aWV3SW5mb0VsLmNyZWF0ZVNwYW4oeyBjbHM6IFwicmV2aWV3LXNlcGFyYXRvclwiLCB0ZXh0OiBcIuKAolwiIH0pO1xyXG5cclxuXHRcdFx0Ly8gTGFzdCBSZXZpZXdlZCBEYXRlIFRleHRcclxuXHRcdFx0Y29uc3QgbGFzdFJldmlld2VkRGF0ZSA9IHNldHRpbmcubGFzdFJldmlld2VkXHJcblx0XHRcdFx0PyBuZXcgRGF0ZShzZXR0aW5nLmxhc3RSZXZpZXdlZCkudG9Mb2NhbGVEYXRlU3RyaW5nKClcclxuXHRcdFx0XHQ6IHQoXCJuZXZlclwiKTtcclxuXHRcdFx0cmV2aWV3SW5mb0VsLmNyZWF0ZVNwYW4oe1xyXG5cdFx0XHRcdGNsczogXCJyZXZpZXctbGFzdC1kYXRlXCIsXHJcblx0XHRcdFx0dGV4dDogYCR7dChcIkxhc3QgcmV2aWV3ZWRcIil9OiAke2xhc3RSZXZpZXdlZERhdGV9YCxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBBZGQgXCJNYXJrIGFzIFJldmlld2VkXCIgYnV0dG9uXHJcblx0XHRcdGNvbnN0IHJldmlld0J1dHRvbkNvbnRhaW5lciA9IGhlYWRlckNvbnRlbnQuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwicmV2aWV3LWJ1dHRvbi1jb250YWluZXJcIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdGNvbnN0IHJldmlld0J1dHRvbiA9IHJldmlld0J1dHRvbkNvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdFx0Y2xzOiBcInJldmlldy1jb21wbGV0ZS1idG5cIixcclxuXHRcdFx0XHR0ZXh0OiB0KFwiTWFyayBhcyBSZXZpZXdlZFwiKSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChyZXZpZXdCdXR0b24sIFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMubWFya1Byb2plY3RBc1Jldmlld2VkKHByb2plY3ROYW1lKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBObyByZXZpZXcgc2V0dGluZ3MgY29uZmlndXJlZCBtZXNzYWdlXHJcblx0XHRcdHJldmlld0luZm9FbC5jcmVhdGVTcGFuKHtcclxuXHRcdFx0XHRjbHM6IFwicmV2aWV3LW5vLXNldHRpbmdzXCIsXHJcblx0XHRcdFx0dGV4dDogdChcIk5vIHJldmlldyBzY2hlZHVsZSBjb25maWd1cmVkIGZvciB0aGlzIHByb2plY3RcIiksXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQWRkIFwiQ29uZmlndXJlIFJldmlld1wiIGJ1dHRvblxyXG5cdFx0XHRjb25zdCByZXZpZXdCdXR0b25Db250YWluZXIgPSBoZWFkZXJDb250ZW50LmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcInJldmlldy1idXR0b24tY29udGFpbmVyXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRjb25zdCBjb25maWd1cmVCdXR0b24gPSByZXZpZXdCdXR0b25Db250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHRcdGNsczogXCJyZXZpZXctY29uZmlndXJlLWJ0blwiLFxyXG5cdFx0XHRcdHRleHQ6IHQoXCJDb25maWd1cmUgUmV2aWV3IFNjaGVkdWxlXCIpLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGNvbmZpZ3VyZUJ1dHRvbiwgXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5vcGVuQ29uZmlndXJlTW9kYWwocHJvamVjdE5hbWUsIHNldHRpbmcpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIE9wZW4gdGhlIGNvbmZpZ3VyZSByZXZpZXcgbW9kYWwgZm9yIGEgcHJvamVjdFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgb3BlbkNvbmZpZ3VyZU1vZGFsKFxyXG5cdFx0cHJvamVjdE5hbWU6IHN0cmluZyxcclxuXHRcdGV4aXN0aW5nU2V0dGluZzogUHJvamVjdFJldmlld1NldHRpbmdcclxuXHQpIHtcclxuXHRcdGNvbnN0IG1vZGFsID0gbmV3IFJldmlld0NvbmZpZ3VyZU1vZGFsKFxyXG5cdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdHByb2plY3ROYW1lLFxyXG5cdFx0XHRleGlzdGluZ1NldHRpbmcsXHJcblx0XHRcdCh1cGRhdGVkU2V0dGluZzogUHJvamVjdFJldmlld1NldHRpbmcpID0+IHtcclxuXHRcdFx0XHQvLyBVcGRhdGUgdGhlIGxvY2FsIHN0YXRlXHJcblx0XHRcdFx0aWYgKHRoaXMuc2VsZWN0ZWRQcm9qZWN0LnByb2plY3QgPT09IHByb2plY3ROYW1lKSB7XHJcblx0XHRcdFx0XHR0aGlzLnNlbGVjdGVkUHJvamVjdC5zZXR0aW5nID0gdXBkYXRlZFNldHRpbmc7XHJcblx0XHRcdFx0XHR0aGlzLnJlbmRlclJldmlld0hlYWRlcihwcm9qZWN0TmFtZSwgdXBkYXRlZFNldHRpbmcpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gUmVmcmVzaCB0aGUgcHJvamVjdHMgbGlzdCB0byB1cGRhdGUgdGhlIHN0eWxpbmdcclxuXHRcdFx0XHR0aGlzLmxvYWRSZXZpZXdTZXR0aW5ncygpO1xyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cclxuXHRcdG1vZGFsLm9wZW4oKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIE1hcmsgYSBwcm9qZWN0IGFzIHJldmlld2VkLCB1cGRhdGluZyB0aGUgbGFzdCByZXZpZXdlZCB0aW1lc3RhbXBcclxuXHQgKiBhbmQgcmVjb3JkaW5nIHRoZSBJRHMgb2YgY3VycmVudCB0YXNrcyB0aGF0IGhhdmUgYmVlbiByZXZpZXdlZFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgbWFya1Byb2plY3RBc1Jldmlld2VkKHByb2plY3ROYW1lOiBzdHJpbmcpIHtcclxuXHRcdGNvbnNvbGUubG9nKGBNYXJraW5nICR7cHJvamVjdE5hbWV9IGFzIHJldmlld2VkLi4uYCk7XHJcblx0XHRjb25zdCBub3cgPSBEYXRlLm5vdygpO1xyXG5cdFx0Y29uc3QgY3VycmVudFNldHRpbmdzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucmV2aWV3U2V0dGluZ3M7XHJcblxyXG5cdFx0Ly8gR2V0IGFsbCBjdXJyZW50IHRhc2tzIGZvciB0aGlzIHByb2plY3RcclxuXHRcdGNvbnN0IHByb2plY3RUYXNrcyA9IHRoaXMuYWxsVGFza3MuZmlsdGVyKFxyXG5cdFx0XHQodGFzaykgPT4gdGFzay5tZXRhZGF0YS5wcm9qZWN0ID09PSBwcm9qZWN0TmFtZVxyXG5cdFx0KTtcclxuXHRcdGNvbnN0IHRhc2tJZHMgPSBwcm9qZWN0VGFza3MubWFwKCh0YXNrKSA9PiB0YXNrLmlkKTtcclxuXHJcblx0XHRpZiAoY3VycmVudFNldHRpbmdzW3Byb2plY3ROYW1lXSkge1xyXG5cdFx0XHQvLyBVcGRhdGUgdGhlIGxhc3QgcmV2aWV3ZWQgdGltZXN0YW1wIGFuZCByZWNvcmQgY3VycmVudCB0YXNrIElEc1xyXG5cdFx0XHRjdXJyZW50U2V0dGluZ3NbcHJvamVjdE5hbWVdLmxhc3RSZXZpZXdlZCA9IG5vdztcclxuXHRcdFx0Y3VycmVudFNldHRpbmdzW3Byb2plY3ROYW1lXS5yZXZpZXdlZFRhc2tJZHMgPSB0YXNrSWRzO1xyXG5cclxuXHRcdFx0Ly8gU2F2ZSBzZXR0aW5ncyB2aWEgcGx1Z2luXHJcblx0XHRcdGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIGxvY2FsIHN0YXRlXHJcblx0XHRcdHRoaXMuc2VsZWN0ZWRQcm9qZWN0LnNldHRpbmcgPSBjdXJyZW50U2V0dGluZ3NbcHJvamVjdE5hbWVdO1xyXG5cclxuXHRcdFx0Ly8gU2hvdyBub3RpY2VcclxuXHRcdFx0bmV3IE5vdGljZShcclxuXHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0YCR7cHJvamVjdE5hbWV9IG1hcmtlZCBhcyByZXZpZXdlZCB3aXRoICR7dGFza0lkcy5sZW5ndGh9IHRhc2tzYFxyXG5cdFx0XHRcdClcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIFVwZGF0ZSBVSSAtIG5lZWQgdG8gcmVmcmVzaCB0YXNrIGxpc3Qgc2luY2Ugd2UnbGwgbm93IGZpbHRlciBvdXQgcmV2aWV3ZWQgdGFza3NcclxuXHRcdFx0dGhpcy5yZW5kZXJSZXZpZXdIZWFkZXIocHJvamVjdE5hbWUsIGN1cnJlbnRTZXR0aW5nc1twcm9qZWN0TmFtZV0pO1xyXG5cdFx0XHR0aGlzLnVwZGF0ZVNlbGVjdGVkUHJvamVjdFRhc2tzKCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBJZiB0aGUgcHJvamVjdCBkb2Vzbid0IGhhdmUgc2V0dGluZ3MgeWV0LCBjcmVhdGUgdGhlbVxyXG5cdFx0XHRjb25zdCBuZXdTZXR0aW5nOiBQcm9qZWN0UmV2aWV3U2V0dGluZyA9IHtcclxuXHRcdFx0XHRmcmVxdWVuY3k6IFwid2Vla2x5XCIsIC8vIERlZmF1bHQgZnJlcXVlbmN5XHJcblx0XHRcdFx0bGFzdFJldmlld2VkOiBub3csXHJcblx0XHRcdFx0cmV2aWV3ZWRUYXNrSWRzOiB0YXNrSWRzLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gU2F2ZSB0aGUgbmV3IHNldHRpbmdzXHJcblx0XHRcdGN1cnJlbnRTZXR0aW5nc1twcm9qZWN0TmFtZV0gPSBuZXdTZXR0aW5nO1xyXG5cdFx0XHRhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHJcblx0XHRcdC8vIFVwZGF0ZSBsb2NhbCBzdGF0ZVxyXG5cdFx0XHR0aGlzLnNlbGVjdGVkUHJvamVjdC5zZXR0aW5nID0gbmV3U2V0dGluZztcclxuXHRcdFx0dGhpcy5yZXZpZXdhYmxlUHJvamVjdHMuc2V0KHByb2plY3ROYW1lLCBuZXdTZXR0aW5nKTtcclxuXHJcblx0XHRcdC8vIFNob3cgbm90aWNlXHJcblx0XHRcdG5ldyBOb3RpY2UoXHJcblx0XHRcdFx0dChcclxuXHRcdFx0XHRcdGAke3Byb2plY3ROYW1lfSBtYXJrZWQgYXMgcmV2aWV3ZWQgd2l0aCAke3Rhc2tJZHMubGVuZ3RofSB0YXNrc2BcclxuXHRcdFx0XHQpXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgVUlcclxuXHRcdFx0dGhpcy5yZW5kZXJSZXZpZXdIZWFkZXIocHJvamVjdE5hbWUsIG5ld1NldHRpbmcpO1xyXG5cdFx0XHR0aGlzLnJlbmRlclByb2plY3RzTGlzdCgpOyAvLyBBbHNvIHJlZnJlc2ggdGhlIHByb2plY3QgbGlzdCB0byB1cGRhdGUgc3R5bGluZ1xyXG5cdFx0XHR0aGlzLnVwZGF0ZVNlbGVjdGVkUHJvamVjdFRhc2tzKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbmRlck1vYmlsZVRvZ2dsZSgpIHtcclxuXHRcdHRoaXMudGFza0hlYWRlckVsLmNyZWF0ZUVsKFxyXG5cdFx0XHRcImRpdlwiLFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0Y2xzOiBcInJldmlldy1zaWRlYmFyLXRvZ2dsZVwiLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHQoZWwpID0+IHtcclxuXHRcdFx0XHRuZXcgRXh0cmFCdXR0b25Db21wb25lbnQoZWwpLnNldEljb24oXCJzaWRlYmFyXCIpLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy50b2dnbGVMZWZ0Q29sdW1uVmlzaWJpbGl0eSgpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSByZW5kZXJFbXB0eVRhc2tMaXN0KG1lc3NhZ2U6IHN0cmluZykge1xyXG5cdFx0dGhpcy50YXNrSGVhZGVyRWwuZW1wdHkoKTsgLy8gQ2xlYXIgc3BlY2lmaWMgaGVhZGVyXHJcblxyXG5cdFx0Ly8gQWRkIHNpZGViYXIgdG9nZ2xlIGJ1dHRvbiBmb3IgbW9iaWxlXHJcblx0XHRpZiAoUGxhdGZvcm0uaXNQaG9uZSkge1xyXG5cdFx0XHR0aGlzLnJlbmRlck1vYmlsZVRvZ2dsZSgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFNldCBkZWZhdWx0IGhlYWRlciBpZiBubyBwcm9qZWN0IGlzIHNlbGVjdGVkXHJcblx0XHRpZiAoIXRoaXMuc2VsZWN0ZWRQcm9qZWN0LnByb2plY3QpIHtcclxuXHRcdFx0Y29uc3QgZGVmYXVsdEhlYWRlciA9IHRoaXMudGFza0hlYWRlckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcInJldmlldy1oZWFkZXItY29udGVudFwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0ZGVmYXVsdEhlYWRlci5jcmVhdGVFbChcImgzXCIsIHtcclxuXHRcdFx0XHRjbHM6IFtcInJldmlldy10aXRsZVwiLCBcImNvbnRlbnQtdGl0bGVcIl0sXHJcblx0XHRcdFx0dGV4dDogdChcIlByb2plY3QgUmV2aWV3XCIpLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0ZGVmYXVsdEhlYWRlci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJyZXZpZXctaW5mb1wiLFxyXG5cdFx0XHRcdHRleHQ6IHQoXHJcblx0XHRcdFx0XHRcIlNlbGVjdCBhIHByb2plY3QgZnJvbSB0aGUgbGVmdCBzaWRlYmFyIHRvIHJldmlldyBpdHMgdGFza3MuXCJcclxuXHRcdFx0XHQpLFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmFsbFRhc2tzTWFwID0gbmV3IE1hcChcclxuXHRcdFx0dGhpcy5hbGxUYXNrcy5tYXAoKHRhc2spID0+IFt0YXNrLmlkLCB0YXNrXSlcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gVXNlIHRoZSByZW5kZXJlciB0byBzaG93IHRoZSBlbXB0eSBzdGF0ZSBtZXNzYWdlIGluIHRoZSB0YXNrIGxpc3QgYXJlYVxyXG5cdFx0dGhpcy50YXNrUmVuZGVyZXIucmVuZGVyVGFza3MoXHJcblx0XHRcdFtdLCAvLyBObyB0YXNrc1xyXG5cdFx0XHRmYWxzZSwgLy8gTm90IHRyZWUgdmlld1xyXG5cdFx0XHR0aGlzLmFsbFRhc2tzTWFwLFxyXG5cdFx0XHRtZXNzYWdlIC8vIFRoZSBzcGVjaWZpYyBlbXB0eSBtZXNzYWdlXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0cHVibGljIHVwZGF0ZVRhc2sodXBkYXRlZFRhc2s6IFRhc2spIHtcclxuXHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcIlJldmlld0NvbXBvbmVudCByZWNlaXZlZCB0YXNrIHVwZGF0ZTpcIixcclxuXHRcdFx0dXBkYXRlZFRhc2suaWQsXHJcblx0XHRcdHVwZGF0ZWRUYXNrLm1ldGFkYXRhLnByb2plY3RcclxuXHRcdCk7XHJcblx0XHRsZXQgbmVlZHNMaXN0UmVmcmVzaCA9IGZhbHNlO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSBpbiBhbGxUYXNrcyBsaXN0XHJcblx0XHRjb25zdCB0YXNrSW5kZXhBbGwgPSB0aGlzLmFsbFRhc2tzLmZpbmRJbmRleChcclxuXHRcdFx0KHQpID0+IHQuaWQgPT09IHVwZGF0ZWRUYXNrLmlkXHJcblx0XHQpO1xyXG5cdFx0aWYgKHRhc2tJbmRleEFsbCAhPT0gLTEpIHtcclxuXHRcdFx0Y29uc3Qgb2xkVGFzayA9IHRoaXMuYWxsVGFza3NbdGFza0luZGV4QWxsXTtcclxuXHRcdFx0Ly8gSWYgcHJvamVjdCBjaGFuZ2VkLCB0aGUgd2hvbGUgdmlldyBtaWdodCBuZWVkIHJlZnJlc2hcclxuXHRcdFx0aWYgKG9sZFRhc2subWV0YWRhdGEucHJvamVjdCAhPT0gdXBkYXRlZFRhc2subWV0YWRhdGEucHJvamVjdCkge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiVGFzayBwcm9qZWN0IGNoYW5nZWQsIHJlbG9hZGluZyByZXZpZXcgc2V0dGluZ3MuXCIpO1xyXG5cdFx0XHRcdHRoaXMubG9hZFJldmlld1NldHRpbmdzKCk7IC8vIFJlbG9hZHMgcHJvamVjdHMgbGlzdCBhbmQgcG90ZW50aWFsbHkgdGFzayBsaXN0XHJcblx0XHRcdFx0cmV0dXJuOyAvLyBFeGl0LCBsb2FkUmV2aWV3U2V0dGluZ3MgaGFuZGxlcyBVSSB1cGRhdGVcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGlzLmFsbFRhc2tzW3Rhc2tJbmRleEFsbF0gPSB1cGRhdGVkVGFzaztcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIE5ldyB0YXNrXHJcblx0XHRcdHRoaXMuYWxsVGFza3MucHVzaCh1cGRhdGVkVGFzayk7XHJcblx0XHRcdC8vIENoZWNrIGlmIGl0IGFmZmVjdHMgdGhlIGN1cnJlbnQgdmlld1xyXG5cdFx0XHRpZiAodXBkYXRlZFRhc2subWV0YWRhdGEucHJvamVjdCA9PT0gdGhpcy5zZWxlY3RlZFByb2plY3QucHJvamVjdCkge1xyXG5cdFx0XHRcdG5lZWRzTGlzdFJlZnJlc2ggPSB0cnVlOyAvLyBOZXcgdGFzayBhZGRlZCB0byBzZWxlY3RlZCBwcm9qZWN0XHJcblx0XHRcdH0gZWxzZSBpZiAoXHJcblx0XHRcdFx0dXBkYXRlZFRhc2subWV0YWRhdGEucHJvamVjdCAmJlxyXG5cdFx0XHRcdCF0aGlzLnJldmlld2FibGVQcm9qZWN0cy5oYXModXBkYXRlZFRhc2subWV0YWRhdGEucHJvamVjdClcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0Ly8gTmV3IHRhc2sgYmVsb25ncyB0byBhIHByZXZpb3VzbHkgdW5rbm93biBwcm9qZWN0LCByZWZyZXNoIGxlZnQgbGlzdFxyXG5cdFx0XHRcdHRoaXMubG9hZFJldmlld1NldHRpbmdzKCk7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSWYgdGhlIHVwZGF0ZWQgdGFzayBiZWxvbmdzIHRvIHRoZSBjdXJyZW50bHkgc2VsZWN0ZWQgcHJvamVjdFxyXG5cdFx0aWYgKHRoaXMuc2VsZWN0ZWRQcm9qZWN0LnByb2plY3QgPT09IHVwZGF0ZWRUYXNrLm1ldGFkYXRhLnByb2plY3QpIHtcclxuXHRcdFx0Y29uc3QgdGFza0luZGV4U2VsZWN0ZWQgPSB0aGlzLnNlbGVjdGVkUHJvamVjdC50YXNrcy5maW5kSW5kZXgoXHJcblx0XHRcdFx0KHQpID0+IHQuaWQgPT09IHVwZGF0ZWRUYXNrLmlkXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBDaGVjayBpZiB0YXNrIHZpc2liaWxpdHkgY2hhbmdlZCBkdWUgdG8gdXBkYXRlIChlLmcuLCBjb21wbGV0ZWQpXHJcblx0XHRcdGNvbnN0IHNob3VsZEJlVmlzaWJsZSA9IHRoaXMuY2hlY2tUYXNrVmlzaWJpbGl0eSh1cGRhdGVkVGFzayk7XHJcblxyXG5cdFx0XHRpZiAodGFza0luZGV4U2VsZWN0ZWQgIT09IC0xKSB7XHJcblx0XHRcdFx0Ly8gVGFzayB3YXMgaW4gdGhlIGxpc3RcclxuXHRcdFx0XHRpZiAoc2hvdWxkQmVWaXNpYmxlKSB7XHJcblx0XHRcdFx0XHQvLyBVcGRhdGUgdGFzayBkYXRhIGFuZCBhc2sgcmVuZGVyZXIgdG8gdXBkYXRlIGNvbXBvbmVudFxyXG5cdFx0XHRcdFx0dGhpcy5zZWxlY3RlZFByb2plY3QudGFza3NbdGFza0luZGV4U2VsZWN0ZWRdID0gdXBkYXRlZFRhc2s7XHJcblx0XHRcdFx0XHR0aGlzLnRhc2tSZW5kZXJlci51cGRhdGVUYXNrKHVwZGF0ZWRUYXNrKTtcclxuXHRcdFx0XHRcdC8vIE9wdGlvbmFsOiBSZS1zb3J0IGlmIG5lZWRlZFxyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHQvLyBUYXNrIHNob3VsZCBubyBsb25nZXIgYmUgdmlzaWJsZSwgcmVmcmVzaCB0aGUgd2hvbGUgbGlzdFxyXG5cdFx0XHRcdFx0bmVlZHNMaXN0UmVmcmVzaCA9IHRydWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2UgaWYgKHNob3VsZEJlVmlzaWJsZSkge1xyXG5cdFx0XHRcdC8vIFRhc2sgd2Fzbid0IGluIGxpc3QgYnV0IHNob3VsZCBiZSBub3dcclxuXHRcdFx0XHRuZWVkc0xpc3RSZWZyZXNoID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIElmIG5lZWRlZCwgcmVmcmVzaCB0aGUgdGFzayBsaXN0IGZvciB0aGUgc2VsZWN0ZWQgcHJvamVjdFxyXG5cdFx0aWYgKG5lZWRzTGlzdFJlZnJlc2gpIHtcclxuXHRcdFx0dGhpcy51cGRhdGVTZWxlY3RlZFByb2plY3RUYXNrcygpOyAvLyBSZS1maWx0ZXJzIGFuZCByZS1yZW5kZXJzXHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBIZWxwZXIgdG8gY2hlY2sgaWYgYSB0YXNrIHNob3VsZCBiZSB2aXNpYmxlIGJhc2VkIG9uIGN1cnJlbnQgZmlsdGVyc1xyXG5cdHByaXZhdGUgY2hlY2tUYXNrVmlzaWJpbGl0eSh0YXNrOiBUYXNrKTogYm9vbGVhbiB7XHJcblx0XHRpZiAodGhpcy5zaG93QWxsVGFza3MgfHwgIXRoaXMuc2VsZWN0ZWRQcm9qZWN0LnNldHRpbmc/Lmxhc3RSZXZpZXdlZCkge1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTsgLy8gU2hvdyBhbGwgb3Igbm8gcmV2aWV3IGhpc3RvcnlcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBsYXN0UmV2aWV3RGF0ZSA9IHRoaXMuc2VsZWN0ZWRQcm9qZWN0LnNldHRpbmcubGFzdFJldmlld2VkO1xyXG5cdFx0Y29uc3QgcmV2aWV3ZWRUYXNrSWRzID0gbmV3IFNldChcclxuXHRcdFx0dGhpcy5zZWxlY3RlZFByb2plY3Quc2V0dGluZy5yZXZpZXdlZFRhc2tJZHMgfHwgW11cclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gQ29waWVkIGxvZ2ljIGZyb20gdXBkYXRlU2VsZWN0ZWRQcm9qZWN0VGFza3MgZmlsdGVyaW5nIHBhcnRcclxuXHRcdGlmIChcclxuXHRcdFx0dGFzay5tZXRhZGF0YS5jcmVhdGVkRGF0ZSAmJlxyXG5cdFx0XHR0YXNrLm1ldGFkYXRhLmNyZWF0ZWREYXRlID4gbGFzdFJldmlld0RhdGVcclxuXHRcdCkge1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTsgLy8gTmV3IHNpbmNlIGxhc3QgcmV2aWV3XHJcblx0XHR9XHJcblx0XHRpZiAocmV2aWV3ZWRUYXNrSWRzLmhhcyh0YXNrLmlkKSAmJiB0YXNrLmNvbXBsZXRlZCkge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7IC8vIFJldmlld2VkIGFuZCBjb21wbGV0ZWRcclxuXHRcdH1cclxuXHRcdGlmIChyZXZpZXdlZFRhc2tJZHMuaGFzKHRhc2suaWQpICYmICF0YXNrLmNvbXBsZXRlZCkge1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTsgLy8gUmV2aWV3ZWQgYnV0IGluY29tcGxldGVcclxuXHRcdH1cclxuXHRcdGlmICghcmV2aWV3ZWRUYXNrSWRzLmhhcyh0YXNrLmlkKSkge1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTsgLy8gTm90IHJldmlld2VkIGJlZm9yZSAobWF5YmUgb2xkZXIgdGFzayBhZGRlZCB0byBwcm9qZWN0KVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIGZhbHNlOyAvLyBEZWZhdWx0IGNhc2UgKHNob3VsZG4ndCBiZSByZWFjaGVkIGlkZWFsbHkpXHJcblx0fVxyXG5cclxuXHRwdWJsaWMgcmVmcmVzaFJldmlld1NldHRpbmdzKCkge1xyXG5cdFx0Y29uc29sZS5sb2coXCJFeHBsaWNpdGx5IHJlZnJlc2hpbmcgcmV2aWV3IHNldHRpbmdzLi4uXCIpO1xyXG5cdFx0dGhpcy5sb2FkUmV2aWV3U2V0dGluZ3MoKTtcclxuXHR9XHJcblxyXG5cdG9udW5sb2FkKCkge1xyXG5cdFx0Ly8gUmVuZGVyZXIgaXMgY2hpbGQsIG1hbmFnZWQgYnkgT2JzaWRpYW4gdW5sb2FkXHJcblx0XHR0aGlzLmNvbnRhaW5lckVsPy5yZW1vdmUoKTtcclxuXHR9XHJcblxyXG5cdC8vIFRvZ2dsZSBsZWZ0IGNvbHVtbiB2aXNpYmlsaXR5IHdpdGggYW5pbWF0aW9uIHN1cHBvcnRcclxuXHRwcml2YXRlIHRvZ2dsZUxlZnRDb2x1bW5WaXNpYmlsaXR5KHZpc2libGU/OiBib29sZWFuKSB7XHJcblx0XHRpZiAodmlzaWJsZSA9PT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdC8vIFRvZ2dsZSBiYXNlZCBvbiBjdXJyZW50IHN0YXRlXHJcblx0XHRcdHZpc2libGUgPSAhdGhpcy5sZWZ0Q29sdW1uRWwuaGFzQ2xhc3MoXCJpcy12aXNpYmxlXCIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh2aXNpYmxlKSB7XHJcblx0XHRcdHRoaXMubGVmdENvbHVtbkVsLmFkZENsYXNzKFwiaXMtdmlzaWJsZVwiKTtcclxuXHRcdFx0dGhpcy5sZWZ0Q29sdW1uRWwuc2hvdygpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy5sZWZ0Q29sdW1uRWwucmVtb3ZlQ2xhc3MoXCJpcy12aXNpYmxlXCIpO1xyXG5cclxuXHRcdFx0Ly8gV2FpdCBmb3IgYW5pbWF0aW9uIHRvIGNvbXBsZXRlIGJlZm9yZSBoaWRpbmdcclxuXHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0aWYgKCF0aGlzLmxlZnRDb2x1bW5FbC5oYXNDbGFzcyhcImlzLXZpc2libGVcIikpIHtcclxuXHRcdFx0XHRcdHRoaXMubGVmdENvbHVtbkVsLmhpZGUoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sIDMwMCk7IC8vIE1hdGNoIENTUyB0cmFuc2l0aW9uIGR1cmF0aW9uXHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDaGVjayBpZiBhIHByb2plY3QgcmV2aWV3IGlzIGR1ZSBiYXNlZCBvbiBpdHMgZnJlcXVlbmN5IGFuZCBsYXN0IHJldmlld2VkIGRhdGUuXHJcblx0ICogQHBhcmFtIHNldHRpbmcgVGhlIHJldmlldyBzZXR0aW5nIGZvciB0aGUgcHJvamVjdC5cclxuXHQgKiBAcmV0dXJucyBUcnVlIGlmIHRoZSByZXZpZXcgaXMgZHVlLCBmYWxzZSBvdGhlcndpc2UuXHJcblx0ICovXHJcblx0cHJpdmF0ZSBpc1Jldmlld0R1ZShzZXR0aW5nOiBQcm9qZWN0UmV2aWV3U2V0dGluZyk6IGJvb2xlYW4ge1xyXG5cdFx0Ly8gQ2Fubm90IGJlIGR1ZSBpZiBub3QgY29uZmlndXJlZCB3aXRoIGEgZnJlcXVlbmN5XHJcblx0XHRpZiAoIXNldHRpbmcuZnJlcXVlbmN5KSB7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBBbHdheXMgZHVlIGlmIG5ldmVyIHJldmlld2VkIGJlZm9yZVxyXG5cdFx0aWYgKCFzZXR0aW5nLmxhc3RSZXZpZXdlZCkge1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBsYXN0UmV2aWV3ZWREYXRlID0gbmV3IERhdGUoc2V0dGluZy5sYXN0UmV2aWV3ZWQpO1xyXG5cdFx0Y29uc3QgdG9kYXkgPSBuZXcgRGF0ZSgpO1xyXG5cdFx0Ly8gU2V0IHRpbWUgdG8gMDA6MDA6MDAuMDAwIGZvciBkYXktbGV2ZWwgY29tcGFyaXNvblxyXG5cdFx0dG9kYXkuc2V0SG91cnMoMCwgMCwgMCwgMCk7XHJcblxyXG5cdFx0bGV0IGludGVydmFsRGF5cyA9IDA7XHJcblxyXG5cdFx0Ly8gQ2hlY2sgcHJlZGVmaW5lZCBmcmVxdWVuY2llc1xyXG5cdFx0aWYgKERBWV9NQVBbc2V0dGluZy5mcmVxdWVuY3kgYXMga2V5b2YgdHlwZW9mIERBWV9NQVBdKSB7XHJcblx0XHRcdGludGVydmFsRGF5cyA9IERBWV9NQVBbc2V0dGluZy5mcmVxdWVuY3kgYXMga2V5b2YgdHlwZW9mIERBWV9NQVBdO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gQmFzaWMgcGFyc2luZyBmb3IgXCJldmVyeSBOIGRheXNcIiAtIGNvdWxkIGJlIGV4cGFuZGVkIGxhdGVyXHJcblx0XHRcdGNvbnN0IG1hdGNoID0gc2V0dGluZy5mcmVxdWVuY3kubWF0Y2goL2V2ZXJ5IChcXGQrKSBkYXlzL2kpO1xyXG5cdFx0XHRpZiAobWF0Y2ggJiYgbWF0Y2hbMV0pIHtcclxuXHRcdFx0XHRpbnRlcnZhbERheXMgPSBwYXJzZUludChtYXRjaFsxXSwgMTApO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIENhbm5vdCBkZXRlcm1pbmUgaW50ZXJ2YWwgZm9yIHVua25vd24gY3VzdG9tIGZyZXF1ZW5jaWVzXHJcblx0XHRcdFx0Y29uc29sZS53YXJuKGBVbmtub3duIGZyZXF1ZW5jeSBmb3JtYXQ6ICR7c2V0dGluZy5mcmVxdWVuY3l9YCk7XHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlOyAvLyBUcmVhdCB1bmtub3duIGZvcm1hdHMgYXMgbm90IGR1ZSBmb3Igbm93XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBDYWxjdWxhdGUgdGhlIG5leHQgcmV2aWV3IGRhdGVcclxuXHRcdGNvbnN0IG5leHRSZXZpZXdEYXRlID0gbmV3IERhdGUobGFzdFJldmlld2VkRGF0ZSk7XHJcblx0XHRuZXh0UmV2aWV3RGF0ZS5zZXREYXRlKGxhc3RSZXZpZXdlZERhdGUuZ2V0RGF0ZSgpICsgaW50ZXJ2YWxEYXlzKTtcclxuXHRcdC8vIEFsc28gc2V0IHRpbWUgdG8gMDA6MDA6MDAuMDAwIGZvciBjb21wYXJpc29uXHJcblx0XHRuZXh0UmV2aWV3RGF0ZS5zZXRIb3VycygwLCAwLCAwLCAwKTtcclxuXHJcblx0XHQvLyBSZXZpZXcgaXMgZHVlIGlmIHRvZGF5IGlzIG9uIG9yIGFmdGVyIHRoZSBuZXh0IHJldmlldyBkYXRlXHJcblx0XHRyZXR1cm4gdG9kYXkgPj0gbmV4dFJldmlld0RhdGU7XHJcblx0fVxyXG59XHJcbiJdfQ==