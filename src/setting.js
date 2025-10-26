import { __awaiter } from "tslib";
import { PluginSettingTab, setIcon, ButtonComponent, Platform, requireApiVersion, debounce, } from "obsidian";
import { t } from "./translations/helper";
import "./styles/setting.css";
import "./styles/setting-v2.css";
import "./styles/beta-warning.css";
import "./styles/settings-search.css";
import "./styles/settings-migration.css";
import { renderAboutSettingsTab, renderBetaTestSettingsTab, renderHabitSettingsTab, renderInterfaceSettingsTab, renderProgressSettingsTab, renderTaskStatusSettingsTab, renderDatePrioritySettingsTab, renderTaskFilterSettingsTab, renderWorkflowSettingsTab, renderQuickCaptureSettingsTab, renderTaskHandlerSettingsTab, renderViewSettingsTab, renderProjectSettingsTab, renderRewardSettingsTab, renderTimelineSidebarSettingsTab, renderIndexSettingsTab, IcsSettingsComponent, renderDesktopIntegrationSettingsTab, } from "./components/features/settings";
import { renderFileFilterSettingsTab } from "./components/features/settings/tabs/FileFilterSettingsTab";
import { renderTimeParsingSettingsTab } from "./components/features/settings/tabs/TimeParsingSettingsTab";
import { SettingsSearchComponent } from "./components//features/settings/components/SettingsSearchComponent";
import { renderMcpIntegrationSettingsTab } from "./components/features/settings/tabs/McpIntegrationSettingsTab";
import { IframeModal } from "@/components/ui/modals/IframeModal";
import { renderTaskTimerSettingTab } from "./components/features/settings/tabs/TaskTimerSettingsTab";
import { renderBasesSettingsTab } from "./components/features/settings/tabs/BasesSettingsTab";
export class TaskProgressBarSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.searchComponent = null;
        // Tabs management
        this.currentTab = "general";
        this.tabs = [
            // Core Settings
            {
                id: "general",
                name: t("General"),
                icon: "settings",
                category: "core",
            },
            {
                id: "index",
                name: t("Index & Sources"),
                icon: "database",
                category: "core",
            },
            {
                id: "view-settings",
                name: t("Views"),
                icon: "layout",
                category: "core",
            },
            {
                id: "interface",
                name: t("Interface"),
                icon: "layout-dashboard",
                category: "core",
            },
            {
                id: "file-filter",
                name: t("File Filter"),
                icon: "folder-x",
                category: "core",
            },
            // Display & Progress
            {
                id: "progress-bar",
                name: t("Progress Display"),
                icon: "trending-up",
                category: "display",
            },
            {
                id: "task-status",
                name: t("Checkbox Status"),
                icon: "checkbox-glyph",
                category: "display",
            },
            // Task Management
            {
                id: "task-handler",
                name: t("Task Handler"),
                icon: "list-checks",
                category: "management",
            },
            {
                id: "task-filter",
                name: t("Task Filter"),
                icon: "filter",
                category: "management",
            },
            {
                id: "project",
                name: t("Projects"),
                icon: "folder-open",
                category: "core",
            },
            // Workflow & Automation
            {
                id: "workflow",
                name: t("Workflows"),
                icon: "git-branch",
                category: "workflow",
            },
            {
                id: "date-priority",
                name: t("Dates & Priority"),
                icon: "calendar-clock",
                category: "workflow",
            },
            {
                id: "quick-capture",
                name: t("Quick Capture"),
                icon: "zap",
                category: "workflow",
            },
            {
                id: "task-timer",
                name: "Task Timer",
                icon: "timer",
                category: "workflow",
            },
            {
                id: "time-parsing",
                name: t("Time Parsing"),
                icon: "clock",
                category: "workflow",
            },
            {
                id: "timeline-sidebar",
                name: t("Timeline Sidebar"),
                icon: "clock",
                category: "workflow",
            },
            // Gamification
            {
                id: "reward",
                name: t("Rewards"),
                icon: "gift",
                category: "gamification",
            },
            {
                id: "habit",
                name: t("Habits"),
                icon: "repeat",
                category: "gamification",
            },
            // Integration & Advanced
            {
                id: "ics-integration",
                name: t("Calendar Sync"),
                icon: "calendar-plus",
                category: "integration",
            },
            {
                id: "desktop-integration",
                name: t("Desktop Integration"),
                icon: "monitor",
                category: "integration",
            },
            {
                id: "mcp-integration",
                name: t("MCP Integration"),
                icon: "network",
                category: "integration",
            },
            {
                id: "bases-support",
                name: t("Bases Support"),
                icon: "layout",
                category: "integration",
            },
            {
                id: "beta-test",
                name: t("Beta Features"),
                icon: "flask-conical",
                category: "advanced",
            },
            // {
            // 	id: "experimental",
            // 	name: t("Experimental"),
            // 	icon: "beaker",
            // 	category: "advanced",
            // },
            { id: "about", name: t("About"), icon: "info", category: "info" },
        ];
        this.plugin = plugin;
        // Initialize debounced functions
        this.debouncedApplySettings = debounce(() => __awaiter(this, void 0, void 0, function* () {
            var _a;
            yield plugin.saveSettings();
            // Update dataflow orchestrator with new settings
            if (plugin.dataflowOrchestrator) {
                // Call async updateSettings and await to ensure incremental reindex completes
                yield plugin.dataflowOrchestrator.updateSettings(plugin.settings);
            }
            // Reload notification manager to apply changes immediately
            yield ((_a = plugin.notificationManager) === null || _a === void 0 ? void 0 : _a.reloadSettings());
            // Trigger view updates to reflect setting changes
            yield plugin.triggerViewUpdate();
        }), 100, true);
        this.debouncedApplyNotifications = debounce(() => __awaiter(this, void 0, void 0, function* () {
            var _b;
            yield plugin.saveSettings();
            // Only refresh notification-related UI; do not touch dataflow orchestrator
            yield ((_b = plugin.notificationManager) === null || _b === void 0 ? void 0 : _b.reloadSettings());
            // Minimal view updates are unnecessary here
        }), 100, true);
    }
    applySettingsUpdate() {
        this.debouncedApplySettings();
    }
    // Lightweight updater for notifications/tray changes to avoid reloading task caches
    applyNotificationsUpdateLight() {
        this.debouncedApplyNotifications();
    }
    // 创建搜索组件
    createSearchComponent() {
        if (this.searchComponent) {
            this.searchComponent.destroy();
        }
        this.searchComponent = new SettingsSearchComponent(this, this.containerEl);
    }
    // Tabs management with categories
    createCategorizedTabsUI() {
        this.containerEl.toggleClass("task-genius-settings", true);
        // 创建搜索组件
        this.createSearchComponent();
        // Group tabs by category
        const categories = {
            core: { name: t("Core Settings"), tabs: [] },
            display: {
                name: t("Display & Progress"),
                tabs: [],
            },
            management: {
                name: t("Task Management"),
                tabs: [],
            },
            workflow: {
                name: t("Workflow & Automation"),
                tabs: [],
            },
            gamification: {
                name: t("Gamification"),
                tabs: [],
            },
            integration: {
                name: t("Integration"),
                tabs: [],
            },
            advanced: { name: t("Advanced"), tabs: [] },
            info: { name: t("Information"), tabs: [] },
        };
        // Group tabs by category
        this.tabs.forEach((tab) => {
            // Skip MCP tab on non-desktop platforms
            if (tab.id === "mcp-integration" && !Platform.isDesktopApp) {
                return;
            }
            const category = tab.category || "core";
            if (categories[category]) {
                categories[category].tabs.push(tab);
            }
        });
        // Create categorized tabs container
        const tabsContainer = this.containerEl.createDiv();
        tabsContainer.addClass("settings-tabs-categorized-container");
        // Create tabs for each category
        Object.entries(categories).forEach(([categoryKey, category]) => {
            if (category.tabs.length === 0)
                return;
            // Create category section
            const categorySection = tabsContainer.createDiv();
            categorySection.addClass("settings-category-section");
            // Category header
            const categoryHeader = categorySection.createDiv();
            categoryHeader.addClass("settings-category-header");
            categoryHeader.setText(category.name);
            // Category tabs container
            const categoryTabsContainer = categorySection.createDiv();
            categoryTabsContainer.addClass("settings-category-tabs");
            // Create tabs for this category
            category.tabs.forEach((tab) => {
                const tabEl = categoryTabsContainer.createDiv();
                tabEl.addClass("settings-tab");
                if (this.currentTab === tab.id) {
                    tabEl.addClass("settings-tab-active");
                }
                tabEl.setAttribute("data-tab-id", tab.id);
                tabEl.setAttribute("data-category", categoryKey);
                // Add icon
                const iconEl = tabEl.createSpan();
                iconEl.addClass("settings-tab-icon");
                setIcon(iconEl, tab.icon);
                // Add label
                const labelEl = tabEl.createSpan();
                labelEl.addClass("settings-tab-label");
                labelEl.setText(tab.name +
                    (tab.id === "about"
                        ? " v" + this.plugin.manifest.version
                        : ""));
                // Add click handler
                tabEl.addEventListener("click", () => {
                    this.switchToTab(tab.id);
                });
            });
        });
        // Create sections container
        const sectionsContainer = this.containerEl.createDiv();
        sectionsContainer.addClass("settings-tab-sections");
    }
    switchToTab(tabId) {
        console.log("Switching to tab:", tabId);
        // Update current tab
        this.currentTab = tabId;
        // Update active tab states
        const tabs = this.containerEl.querySelectorAll(".settings-tab");
        tabs.forEach((tab) => {
            if (tab.getAttribute("data-tab-id") === tabId) {
                tab.addClass("settings-tab-active");
            }
            else {
                tab.removeClass("settings-tab-active");
            }
        });
        // Show active section, hide others
        const sections = this.containerEl.querySelectorAll(".settings-tab-section");
        sections.forEach((section) => {
            if (section.getAttribute("data-tab-id") === tabId) {
                section.addClass("settings-tab-section-active");
                section.style.display = "block";
            }
            else {
                section.removeClass("settings-tab-section-active");
                section.style.display = "none";
            }
        });
        // Handle tab container and header visibility based on selected tab
        const tabsContainer = this.containerEl.querySelector(".settings-tabs-categorized-container");
        const settingsHeader = this.containerEl.querySelector(".task-genius-settings-header");
        if (tabId === "general") {
            // Show tabs and header for general tab
            if (tabsContainer)
                tabsContainer.style.display =
                    "flex";
            if (settingsHeader)
                settingsHeader.style.display =
                    "block";
        }
        else {
            // Hide tabs and header for specific tab pages
            if (tabsContainer)
                tabsContainer.style.display =
                    "none";
            if (settingsHeader)
                settingsHeader.style.display =
                    "none";
        }
    }
    openTab(tabId) {
        this.currentTab = tabId;
        this.display();
    }
    /**
     * Navigate to a specific tab via URI
     */
    navigateToTab(tabId, section, search) {
        // Set the current tab
        this.currentTab = tabId;
        // Re-display the settings
        this.display();
        // Wait for display to complete
        setTimeout(() => {
            // If search is provided, perform search
            if (search && this.searchComponent) {
                this.searchComponent.performSearch(search);
            }
            // If section is provided, scroll to it
            if (section) {
                this.scrollToSection(section);
            }
        }, 100);
    }
    /**
     * Scroll to a specific section within the current tab
     */
    scrollToSection(sectionId) {
        var _a;
        // Look for headers containing the section ID
        const headers = this.containerEl.querySelectorAll("h3, h4");
        headers.forEach((header) => {
            var _a;
            const headerText = (_a = header.textContent) === null || _a === void 0 ? void 0 : _a.toLowerCase();
            if (headerText &&
                headerText.includes(sectionId.replace("-", " "))) {
                header.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        });
        // Special handling for MCP sections
        if (sectionId === "cursor" && this.currentTab === "mcp-integration") {
            const cursorSection = this.containerEl.querySelector(".mcp-client-section");
            if (cursorSection) {
                const header = cursorSection.querySelector(".mcp-client-header");
                if (header && ((_a = header.textContent) === null || _a === void 0 ? void 0 : _a.includes("Cursor"))) {
                    // Click to expand
                    header.click();
                    cursorSection.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                    });
                }
            }
        }
    }
    createTabSection(tabId) {
        // Get the sections container
        const sectionsContainer = this.containerEl.querySelector(".settings-tab-sections");
        if (!sectionsContainer)
            return this.containerEl;
        // Create section element
        const section = sectionsContainer.createDiv();
        section.addClass("settings-tab-section");
        if (this.currentTab === tabId) {
            section.addClass("settings-tab-section-active");
        }
        section.setAttribute("data-tab-id", tabId);
        // Attach category for search indexer
        const tabInfo = this.tabs.find((t) => t.id === tabId);
        if (tabInfo === null || tabInfo === void 0 ? void 0 : tabInfo.category) {
            section.setAttribute("data-category", tabInfo.category);
        }
        // Create header
        if (tabId !== "general") {
            const headerEl = section.createDiv();
            headerEl.addClass("settings-tab-section-header");
            // Left: How to use button (opens iframe modal with docs)
            const howToBtn = new ButtonComponent(headerEl);
            howToBtn.setClass("header-button");
            howToBtn.setClass("how-to-button");
            howToBtn.onClick(() => {
                var _a;
                const url = this.getHowToUseUrl(tabId);
                try {
                    new IframeModal(this.app, url, `How to use — ${(_a = tabInfo === null || tabInfo === void 0 ? void 0 : tabInfo.name) !== null && _a !== void 0 ? _a : tabId}`).open();
                }
                catch (e) {
                    window.open(url);
                }
            });
            const howToIconEl = howToBtn.buttonEl.createEl("span");
            howToIconEl.addClass("header-button-icon");
            setIcon(howToIconEl, "book");
            const howToTextEl = howToBtn.buttonEl.createEl("span");
            howToTextEl.addClass("header-button-text");
            howToTextEl.setText(t("How to use"));
            // Right: Back to main settings
            const backBtn = new ButtonComponent(headerEl)
                .setClass("header-button")
                .onClick(() => {
                this.currentTab = "general";
                this.display();
            });
            backBtn.setClass("header-button-back");
            const iconEl = backBtn.buttonEl.createEl("span");
            iconEl.addClass("header-button-icon");
            setIcon(iconEl, "arrow-left");
            const textEl = backBtn.buttonEl.createEl("span");
            textEl.addClass("header-button-text");
            textEl.setText(t("Back to main settings"));
        }
        return section;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        // Ensure we start with general tab if no tab is set
        if (!this.currentTab) {
            this.currentTab = "general";
        }
        // Create tabs UI with categories
        this.createCategorizedTabsUI();
        // General Tab
        const generalSection = this.createTabSection("general");
        this.displayGeneralSettings(generalSection);
        // Progress Bar Tab
        const progressBarSection = this.createTabSection("progress-bar");
        this.displayProgressBarSettings(progressBarSection);
        // Checkbox Status Tab
        const taskStatusSection = this.createTabSection("task-status");
        this.displayTaskStatusSettings(taskStatusSection);
        // Task Filter Tab
        const taskFilterSection = this.createTabSection("task-filter");
        this.displayTaskFilterSettings(taskFilterSection);
        // File Filter Tab
        const fileFilterSection = this.createTabSection("file-filter");
        this.displayFileFilterSettings(fileFilterSection);
        // Task Handler Tab
        const taskHandlerSection = this.createTabSection("task-handler");
        this.displayTaskHandlerSettings(taskHandlerSection);
        // Quick Capture Tab
        const quickCaptureSection = this.createTabSection("quick-capture");
        this.displayQuickCaptureSettings(quickCaptureSection);
        // Task Timer Tab
        const taskTimerSection = this.createTabSection("task-timer");
        this.displayTaskTimerSettings(taskTimerSection);
        // Time Parsing Tab
        const timeParsingSection = this.createTabSection("time-parsing");
        this.displayTimeParsingSettings(timeParsingSection);
        // Timeline Sidebar Tab
        const timelineSidebarSection = this.createTabSection("timeline-sidebar");
        this.displayTimelineSidebarSettings(timelineSidebarSection);
        // Workflow Tab
        const workflowSection = this.createTabSection("workflow");
        this.displayWorkflowSettings(workflowSection);
        // Date & Priority Tab
        const datePrioritySection = this.createTabSection("date-priority");
        this.displayDatePrioritySettings(datePrioritySection);
        // Project Tab
        const projectSection = this.createTabSection("project");
        this.displayProjectSettings(projectSection);
        // Index Settings Tab
        const indexSection = this.createTabSection("index");
        this.displayIndexSettings(indexSection);
        // View Settings Tab
        const viewSettingsSection = this.createTabSection("view-settings");
        this.displayViewSettings(viewSettingsSection);
        // Interface Tab
        const interfaceSection = this.createTabSection("interface");
        this.displayInterfaceSettings(interfaceSection);
        // Reward Tab
        const rewardSection = this.createTabSection("reward");
        this.displayRewardSettings(rewardSection);
        // Habit Tab
        const habitSection = this.createTabSection("habit");
        this.displayHabitSettings(habitSection);
        // ICS Integration Tab
        const icsSection = this.createTabSection("ics-integration");
        this.displayIcsSettings(icsSection);
        // Notifications Tab
        const notificationsSection = this.createTabSection("desktop-integration");
        this.displayDesktopIntegrationSettings(notificationsSection);
        // MCP Integration Tab (only on desktop)
        if (Platform.isDesktopApp) {
            const mcpSection = this.createTabSection("mcp-integration");
            this.displayMcpSettings(mcpSection);
        }
        if (requireApiVersion("1.9.10")) {
            const basesSection = this.createTabSection("bases-support");
            this.displayBasesSettings(basesSection);
        }
        // Beta Test Tab
        const betaTestSection = this.createTabSection("beta-test");
        this.displayBetaTestSettings(betaTestSection);
        // // Experimental Tab
        // const experimentalSection = this.createTabSection("experimental");
        // this.displayExperimentalSettings(experimentalSection);
        // About Tab
        const aboutSection = this.createTabSection("about");
        this.displayAboutSettings(aboutSection);
        // Initialize the correct tab state
        this.switchToTab(this.currentTab);
    }
    getHowToUseUrl(tabId) {
        const base = "https://taskgenius.md/docs";
        switch (tabId) {
            case "index":
                return `${base}/task-view/indexer`;
            case "view-settings":
                return `${base}/task-view`;
            case "interface":
                return `${base}/interface`;
            case "file-filter":
                return `${base}/file-filter`;
            case "progress-bar":
                return `${base}/progress-bars`;
            case "task-status":
                return `${base}/task-status`;
            case "task-handler":
                return `${base}/task-gutter`;
            case "task-filter":
                return `${base}/filtering`;
            case "project":
                return `${base}/project`;
            case "date-priority":
                return `${base}/date-priority`;
            case "quick-capture":
                return `${base}/quick-capture`;
            case "task-timer":
                return `${base}/task-timer`;
            case "time-parsing":
                return `${base}/time-parsing`;
            case "workflow":
                return `${base}/workflows`;
            case "timeline-sidebar":
                return `${base}/task-view/timeline-sidebar-view`;
            case "reward":
                return `${base}/reward`;
            case "habit":
                return `${base}/habit`;
            case "ics-integration":
                return `${base}/ics-support`;
            case "mcp-integration":
                return `${base}/mcp-integration`;
            case "bases-support":
                return `${base}/bases-support`;
            case "desktop-integration":
                return `${base}/bases-support`;
            case "beta-test":
                return `${base}/getting-started`;
            case "experimental":
                return `${base}/getting-started`;
            case "about":
                return `${base}/getting-started`;
            default:
                return `${base}/getting-started`;
        }
    }
    displayGeneralSettings(containerEl) {
        // Notifications and Desktop integration
    }
    displayProgressBarSettings(containerEl) {
        renderProgressSettingsTab(this, containerEl);
    }
    displayTaskStatusSettings(containerEl) {
        renderTaskStatusSettingsTab(this, containerEl);
    }
    displayDatePrioritySettings(containerEl) {
        renderDatePrioritySettingsTab(this, containerEl);
    }
    displayTaskFilterSettings(containerEl) {
        renderTaskFilterSettingsTab(this, containerEl);
    }
    displayFileFilterSettings(containerEl) {
        renderFileFilterSettingsTab(this, containerEl);
    }
    displayWorkflowSettings(containerEl) {
        renderWorkflowSettingsTab(this, containerEl);
    }
    displayQuickCaptureSettings(containerEl) {
        renderQuickCaptureSettingsTab(this, containerEl);
    }
    displayTaskTimerSettings(containerEl) {
        this.renderTaskTimerSettingsTab(containerEl);
    }
    displayTimeParsingSettings(containerEl) {
        renderTimeParsingSettingsTab(this, containerEl);
    }
    displayTimelineSidebarSettings(containerEl) {
        renderTimelineSidebarSettingsTab(this, containerEl);
    }
    displayTaskHandlerSettings(containerEl) {
        renderTaskHandlerSettingsTab(this, containerEl);
    }
    displayViewSettings(containerEl) {
        renderViewSettingsTab(this, containerEl);
    }
    displayInterfaceSettings(containerEl) {
        renderInterfaceSettingsTab(this, containerEl);
    }
    displayIndexSettings(containerEl) {
        renderIndexSettingsTab(this, containerEl);
    }
    displayProjectSettings(containerEl) {
        renderProjectSettingsTab(this, containerEl);
    }
    displayIcsSettings(containerEl) {
        const icsSettingsComponent = new IcsSettingsComponent(this.plugin, containerEl, () => {
            this.currentTab = "general";
            this.display();
        });
        icsSettingsComponent.display();
    }
    displayDesktopIntegrationSettings(containerEl) {
        renderDesktopIntegrationSettingsTab(this, containerEl);
    }
    displayMcpSettings(containerEl) {
        renderMcpIntegrationSettingsTab(containerEl, this.plugin, () => this.applySettingsUpdate());
    }
    displayBasesSettings(containerEl) {
        renderBasesSettingsTab(this, containerEl);
    }
    displayAboutSettings(containerEl) {
        renderAboutSettingsTab(this, containerEl);
    }
    // START: New Reward Settings Section
    displayRewardSettings(containerEl) {
        renderRewardSettingsTab(this, containerEl);
    }
    displayHabitSettings(containerEl) {
        renderHabitSettingsTab(this, containerEl);
    }
    displayBetaTestSettings(containerEl) {
        renderBetaTestSettingsTab(this, containerEl);
    }
    // private displayExperimentalSettings(containerEl: HTMLElement): void {
    // 	this.renderExperimentalSettingsTab(containerEl);
    // }
    renderTaskTimerSettingsTab(containerEl) {
        renderTaskTimerSettingTab(this, containerEl);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNldHRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFFTixnQkFBZ0IsRUFDaEIsT0FBTyxFQUNQLGVBQWUsRUFFZixRQUFRLEVBQ1IsaUJBQWlCLEVBQ2pCLFFBQVEsR0FJUixNQUFNLFVBQVUsQ0FBQztBQUdsQixPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDMUMsT0FBTyxzQkFBc0IsQ0FBQztBQUM5QixPQUFPLHlCQUF5QixDQUFDO0FBQ2pDLE9BQU8sMkJBQTJCLENBQUM7QUFDbkMsT0FBTyw4QkFBOEIsQ0FBQztBQUN0QyxPQUFPLGlDQUFpQyxDQUFDO0FBQ3pDLE9BQU8sMENBQTBDLENBQUM7QUFDbEQsT0FBTyxFQUNOLHNCQUFzQixFQUN0Qix5QkFBeUIsRUFDekIsc0JBQXNCLEVBQ3RCLDBCQUEwQixFQUMxQix5QkFBeUIsRUFDekIsMkJBQTJCLEVBQzNCLDZCQUE2QixFQUM3QiwyQkFBMkIsRUFDM0IseUJBQXlCLEVBQ3pCLDZCQUE2QixFQUM3Qiw0QkFBNEIsRUFDNUIscUJBQXFCLEVBQ3JCLHdCQUF3QixFQUN4Qix1QkFBdUIsRUFDdkIsZ0NBQWdDLEVBQ2hDLHNCQUFzQixFQUN0QixvQkFBb0IsRUFDcEIsbUNBQW1DLEdBQ25DLE1BQU0sZ0NBQWdDLENBQUM7QUFDeEMsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDeEcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDMUcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sb0VBQW9FLENBQUM7QUFDN0csT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDaEgsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDBE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Q0FBQztJQUVPLG9CQUFvQixDQUFDLFdBQXdCO1FBQ3BELHNCQUFzQixDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBRU8sdUJBQXVCLENBQUMsV0FBd0I7UUFDdkQseUJBQXlCLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFFTyx5QkFBeUIsQ0FBQyxXQUF3QjtRQUN6RCwwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVELHdFQUF3RTtJQUN4RSxvREFBb0Q7SUFDcEQsSUFBSTtJQUVJLDBCQUEwQixDQUFDLFdBQXdCO1FBQzFELHlCQUF5QixDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztJQUM5QyxDQUFDO0NBRUQiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xyXG5cdEFwcCxcclxuXHRQbHVnaW5TZXR0aW5nVGFiLFxyXG5cdHNldEljb24sXHJcblx0QnV0dG9uQ29tcG9uZW50LFxyXG5cdFNldHRpbmcsXHJcblx0UGxhdGZvcm0sXHJcblx0cmVxdWlyZUFwaVZlcnNpb24sXHJcblx0ZGVib3VuY2UsXHJcblx0TWVudSxcclxuXHRNb2RhbCxcclxuXHROb3RpY2UsXHJcbn0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIi5cIjtcclxuXHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiLi90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCBcIi4vc3R5bGVzL3NldHRpbmcuY3NzXCI7XHJcbmltcG9ydCBcIi4vc3R5bGVzL3NldHRpbmctdjIuY3NzXCI7XHJcbmltcG9ydCBcIi4vc3R5bGVzL2JldGEtd2FybmluZy5jc3NcIjtcclxuaW1wb3J0IFwiLi9zdHlsZXMvc2V0dGluZ3Mtc2VhcmNoLmNzc1wiO1xyXG5pbXBvcnQgXCIuL3N0eWxlcy9zZXR0aW5ncy1taWdyYXRpb24uY3NzXCI7XHJcbmltcG9ydCBcIi4vc3R5bGVzL3dvcmtzcGFjZS1zZXR0aW5ncy1zZWxlY3Rvci5jc3NcIjtcclxuaW1wb3J0IHtcclxuXHRyZW5kZXJBYm91dFNldHRpbmdzVGFiLFxyXG5cdHJlbmRlckJldGFUZXN0U2V0dGluZ3NUYWIsXHJcblx0cmVuZGVySGFiaXRTZXR0aW5nc1RhYixcclxuXHRyZW5kZXJJbnRlcmZhY2VTZXR0aW5nc1RhYixcclxuXHRyZW5kZXJQcm9ncmVzc1NldHRpbmdzVGFiLFxyXG5cdHJlbmRlclRhc2tTdGF0dXNTZXR0aW5nc1RhYixcclxuXHRyZW5kZXJEYXRlUHJpb3JpdHlTZXR0aW5nc1RhYixcclxuXHRyZW5kZXJUYXNrRmlsdGVyU2V0dGluZ3NUYWIsXHJcblx0cmVuZGVyV29ya2Zsb3dTZXR0aW5nc1RhYixcclxuXHRyZW5kZXJRdWlja0NhcHR1cmVTZXR0aW5nc1RhYixcclxuXHRyZW5kZXJUYXNrSGFuZGxlclNldHRpbmdzVGFiLFxyXG5cdHJlbmRlclZpZXdTZXR0aW5nc1RhYixcclxuXHRyZW5kZXJQcm9qZWN0U2V0dGluZ3NUYWIsXHJcblx0cmVuZGVyUmV3YXJkU2V0dGluZ3NUYWIsXHJcblx0cmVuZGVyVGltZWxpbmVTaWRlYmFyU2V0dGluZ3NUYWIsXHJcblx0cmVuZGVySW5kZXhTZXR0aW5nc1RhYixcclxuXHRJY3NTZXR0aW5nc0NvbXBvbmVudCxcclxuXHRyZW5kZXJEZXNrdG9wSW50ZWdyYXRpb25TZXR0aW5nc1RhYixcclxufSBmcm9tIFwiLi9jb21wb25lbnRzL2ZlYXR1cmVzL3NldHRpbmdzXCI7XHJcbmltcG9ydCB7IHJlbmRlckZpbGVGaWx0ZXJTZXR0aW5nc1RhYiB9IGZyb20gXCIuL2NvbXBvbmVudHMvZmVhdHVyZXMvc2V0dGluZ3MvdGFicy9GaWxlRmlsdGVyU2V0dGluZ3NUYWJcIjtcclxuaW1wb3J0IHsgcmVuZGVyVGltZVBhcnNpbmdTZXR0aW5nc1RhYiB9IGZyb20gXCIuL2NvbXBvbmVudHMvZmVhdHVyZXMvc2V0dGluZ3MvdGFicy9UaW1lUGFyc2luZ1NldHRpbmdzVGFiXCI7XHJcbmltcG9ydCB7IFNldHRpbmdzU2VhcmNoQ29tcG9uZW50IH0gZnJvbSBcIi4vY29tcG9uZW50cy8vZmVhdHVyZXMvc2V0dGluZ3MvY29tcG9uZW50cy9TZXR0aW5nc1NlYXJjaENvbXBvbmVudFwiO1xyXG5pbXBvcnQgeyByZW5kZXJNY3BJbnRlZ3JhdGlvblNldHRpbmdzVGFiIH0gZnJvbSBcIi4vY29tcG9uZW50cy9mZWF0dXJlcy9zZXR0aW5ncy90YWJzL01jcEludGVncmF0aW9uU2V0dGluZ3NUYWJcIjtcclxuaW1wb3J0IHsgSWZyYW1lTW9kYWwgfSBmcm9tIFwiQC9jb21wb25lbnRzL3VpL21vZGFscy9JZnJhbWVNb2RhbFwiO1xyXG5pbXBvcnQgeyByZW5kZXJUYXNrVGltZXJTZXR0aW5nVGFiIH0gZnJvbSBcIi4vY29tcG9uZW50cy9mZWF0dXJlcy9zZXR0aW5ncy90YWJzL1Rhc2tUaW1lclNldHRpbmdzVGFiXCI7XHJcbmltcG9ydCB7IHJlbmRlckJhc2VzU2V0dGluZ3NUYWIgfSBmcm9tIFwiLi9jb21wb25lbnRzL2ZlYXR1cmVzL3NldHRpbmdzL3RhYnMvQmFzZXNTZXR0aW5nc1RhYlwiO1xyXG5pbXBvcnQgeyByZW5kZXJXb3Jrc3BhY2VTZXR0aW5nc1RhYiB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvc2V0dGluZ3MvdGFicy9Xb3Jrc3BhY2VTZXR0aW5nVGFiXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgVGFza1Byb2dyZXNzQmFyU2V0dGluZ1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luO1xyXG5cdHByaXZhdGUgZGVib3VuY2VkQXBwbHlTZXR0aW5nczogKCkgPT4gdm9pZDtcclxuXHRwcml2YXRlIGRlYm91bmNlZEFwcGx5Tm90aWZpY2F0aW9uczogKCkgPT4gdm9pZDtcclxuXHRwcml2YXRlIHNlYXJjaENvbXBvbmVudDogU2V0dGluZ3NTZWFyY2hDb21wb25lbnQgfCBudWxsID0gbnVsbDtcclxuXHJcblx0Ly8gVGFicyBtYW5hZ2VtZW50XHJcblx0cHJpdmF0ZSBjdXJyZW50VGFiOiBzdHJpbmcgPSBcImdlbmVyYWxcIjtcclxuXHRwdWJsaWMgY29udGFpbmVyRWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgdGFiczogQXJyYXk8e1xyXG5cdFx0aWQ6IHN0cmluZztcclxuXHRcdG5hbWU6IHN0cmluZztcclxuXHRcdGljb246IHN0cmluZztcclxuXHRcdGNhdGVnb3J5Pzogc3RyaW5nO1xyXG5cdH0+ID0gW1xyXG5cdFx0Ly8gQ29yZSBTZXR0aW5nc1xyXG5cdFx0e1xyXG5cdFx0XHRpZDogXCJnZW5lcmFsXCIsXHJcblx0XHRcdG5hbWU6IHQoXCJHZW5lcmFsXCIpLFxyXG5cdFx0XHRpY29uOiBcInNldHRpbmdzXCIsXHJcblx0XHRcdGNhdGVnb3J5OiBcImNvcmVcIixcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGlkOiBcImluZGV4XCIsXHJcblx0XHRcdG5hbWU6IHQoXCJJbmRleCAmIFNvdXJjZXNcIiksXHJcblx0XHRcdGljb246IFwiZGF0YWJhc2VcIixcclxuXHRcdFx0Y2F0ZWdvcnk6IFwiY29yZVwiLFxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aWQ6IFwidmlldy1zZXR0aW5nc1wiLFxyXG5cdFx0XHRuYW1lOiB0KFwiVmlld3NcIiksXHJcblx0XHRcdGljb246IFwibGF5b3V0XCIsXHJcblx0XHRcdGNhdGVnb3J5OiBcImNvcmVcIixcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGlkOiBcImludGVyZmFjZVwiLFxyXG5cdFx0XHRuYW1lOiB0KFwiSW50ZXJmYWNlXCIpLFxyXG5cdFx0XHRpY29uOiBcImxheW91dC1kYXNoYm9hcmRcIixcclxuXHRcdFx0Y2F0ZWdvcnk6IFwiY29yZVwiLFxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aWQ6IFwiZmlsZS1maWx0ZXJcIixcclxuXHRcdFx0bmFtZTogdChcIkZpbGUgRmlsdGVyXCIpLFxyXG5cdFx0XHRpY29uOiBcImZvbGRlci14XCIsXHJcblx0XHRcdGNhdGVnb3J5OiBcImNvcmVcIixcclxuXHRcdH0sXHJcblxyXG5cdFx0Ly8gRGlzcGxheSAmIFByb2dyZXNzXHJcblx0XHR7XHJcblx0XHRcdGlkOiBcInByb2dyZXNzLWJhclwiLFxyXG5cdFx0XHRuYW1lOiB0KFwiUHJvZ3Jlc3MgRGlzcGxheVwiKSxcclxuXHRcdFx0aWNvbjogXCJ0cmVuZGluZy11cFwiLFxyXG5cdFx0XHRjYXRlZ29yeTogXCJkaXNwbGF5XCIsXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRpZDogXCJ0YXNrLXN0YXR1c1wiLFxyXG5cdFx0XHRuYW1lOiB0KFwiQ2hlY2tib3ggU3RhdHVzXCIpLFxyXG5cdFx0XHRpY29uOiBcImNoZWNrYm94LWdseXBoXCIsXHJcblx0XHRcdGNhdGVnb3J5OiBcImRpc3BsYXlcIixcclxuXHRcdH0sXHJcblxyXG5cdFx0Ly8gVGFzayBNYW5hZ2VtZW50XHJcblx0XHR7XHJcblx0XHRcdGlkOiBcInRhc2staGFuZGxlclwiLFxyXG5cdFx0XHRuYW1lOiB0KFwiVGFzayBIYW5kbGVyXCIpLFxyXG5cdFx0XHRpY29uOiBcImxpc3QtY2hlY2tzXCIsXHJcblx0XHRcdGNhdGVnb3J5OiBcIm1hbmFnZW1lbnRcIixcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGlkOiBcInRhc2stZmlsdGVyXCIsXHJcblx0XHRcdG5hbWU6IHQoXCJUYXNrIEZpbHRlclwiKSxcclxuXHRcdFx0aWNvbjogXCJmaWx0ZXJcIixcclxuXHRcdFx0Y2F0ZWdvcnk6IFwibWFuYWdlbWVudFwiLFxyXG5cdFx0fSxcclxuXHJcblx0XHR7XHJcblx0XHRcdGlkOiBcInByb2plY3RcIixcclxuXHRcdFx0bmFtZTogdChcIlByb2plY3RzXCIpLFxyXG5cdFx0XHRpY29uOiBcImZvbGRlci1vcGVuXCIsXHJcblx0XHRcdGNhdGVnb3J5OiBcImNvcmVcIixcclxuXHRcdH0sXHJcblxyXG5cdFx0Ly8gV29ya2Zsb3cgJiBBdXRvbWF0aW9uXHJcblx0XHR7XHJcblx0XHRcdGlkOiBcIndvcmtmbG93XCIsXHJcblx0XHRcdG5hbWU6IHQoXCJXb3JrZmxvd3NcIiksXHJcblx0XHRcdGljb246IFwiZ2l0LWJyYW5jaFwiLFxyXG5cdFx0XHRjYXRlZ29yeTogXCJ3b3JrZmxvd1wiLFxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aWQ6IFwiZGF0ZS1wcmlvcml0eVwiLFxyXG5cdFx0XHRuYW1lOiB0KFwiRGF0ZXMgJiBQcmlvcml0eVwiKSxcclxuXHRcdFx0aWNvbjogXCJjYWxlbmRhci1jbG9ja1wiLFxyXG5cdFx0XHRjYXRlZ29yeTogXCJ3b3JrZmxvd1wiLFxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aWQ6IFwicXVpY2stY2FwdHVyZVwiLFxyXG5cdFx0XHRuYW1lOiB0KFwiUXVpY2sgQ2FwdHVyZVwiKSxcclxuXHRcdFx0aWNvbjogXCJ6YXBcIixcclxuXHRcdFx0Y2F0ZWdvcnk6IFwid29ya2Zsb3dcIixcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGlkOiBcInRhc2stdGltZXJcIixcclxuXHRcdFx0bmFtZTogXCJUYXNrIFRpbWVyXCIsXHJcblx0XHRcdGljb246IFwidGltZXJcIixcclxuXHRcdFx0Y2F0ZWdvcnk6IFwid29ya2Zsb3dcIixcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGlkOiBcInRpbWUtcGFyc2luZ1wiLFxyXG5cdFx0XHRuYW1lOiB0KFwiVGltZSBQYXJzaW5nXCIpLFxyXG5cdFx0XHRpY29uOiBcImNsb2NrXCIsXHJcblx0XHRcdGNhdGVnb3J5OiBcIndvcmtmbG93XCIsXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRpZDogXCJ0aW1lbGluZS1zaWRlYmFyXCIsXHJcblx0XHRcdG5hbWU6IHQoXCJUaW1lbGluZSBTaWRlYmFyXCIpLFxyXG5cdFx0XHRpY29uOiBcImNsb2NrXCIsXHJcblx0XHRcdGNhdGVnb3J5OiBcIndvcmtmbG93XCIsXHJcblx0XHR9LFxyXG5cclxuXHRcdC8vIEdhbWlmaWNhdGlvblxyXG5cdFx0e1xyXG5cdFx0XHRpZDogXCJyZXdhcmRcIixcclxuXHRcdFx0bmFtZTogdChcIlJld2FyZHNcIiksXHJcblx0XHRcdGljb246IFwiZ2lmdFwiLFxyXG5cdFx0XHRjYXRlZ29yeTogXCJnYW1pZmljYXRpb25cIixcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGlkOiBcImhhYml0XCIsXHJcblx0XHRcdG5hbWU6IHQoXCJIYWJpdHNcIiksXHJcblx0XHRcdGljb246IFwicmVwZWF0XCIsXHJcblx0XHRcdGNhdGVnb3J5OiBcImdhbWlmaWNhdGlvblwiLFxyXG5cdFx0fSxcclxuXHJcblx0XHQvLyBJbnRlZ3JhdGlvbiAmIEFkdmFuY2VkXHJcblx0XHR7XHJcblx0XHRcdGlkOiBcImljcy1pbnRlZ3JhdGlvblwiLFxyXG5cdFx0XHRuYW1lOiB0KFwiQ2FsZW5kYXIgU3luY1wiKSxcclxuXHRcdFx0aWNvbjogXCJjYWxlbmRhci1wbHVzXCIsXHJcblx0XHRcdGNhdGVnb3J5OiBcImludGVncmF0aW9uXCIsXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRpZDogXCJkZXNrdG9wLWludGVncmF0aW9uXCIsXHJcblx0XHRcdG5hbWU6IHQoXCJEZXNrdG9wIEludGVncmF0aW9uXCIpLFxyXG5cdFx0XHRpY29uOiBcIm1vbml0b3JcIixcclxuXHRcdFx0Y2F0ZWdvcnk6IFwiaW50ZWdyYXRpb25cIixcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGlkOiBcIm1jcC1pbnRlZ3JhdGlvblwiLFxyXG5cdFx0XHRuYW1lOiB0KFwiTUNQIEludGVncmF0aW9uXCIpLFxyXG5cdFx0XHRpY29uOiBcIm5ldHdvcmtcIixcclxuXHRcdFx0Y2F0ZWdvcnk6IFwiaW50ZWdyYXRpb25cIixcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGlkOiBcImJhc2VzLXN1cHBvcnRcIixcclxuXHRcdFx0bmFtZTogdChcIkJhc2VzIFN1cHBvcnRcIiksXHJcblx0XHRcdGljb246IFwibGF5b3V0XCIsXHJcblx0XHRcdGNhdGVnb3J5OiBcImludGVncmF0aW9uXCIsXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRpZDogXCJ3b3Jrc3BhY2VzXCIsXHJcblx0XHRcdG5hbWU6IHQoXCJXb3Jrc3BhY2VzXCIpLFxyXG5cdFx0XHRpY29uOiBcImxheWVyc1wiLFxyXG5cdFx0XHRjYXRlZ29yeTogXCJpbnRlZ3JhdGlvblwiLFxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aWQ6IFwiYmV0YS10ZXN0XCIsXHJcblx0XHRcdG5hbWU6IHQoXCJCZXRhIEZlYXR1cmVzXCIpLFxyXG5cdFx0XHRpY29uOiBcImZsYXNrLWNvbmljYWxcIixcclxuXHRcdFx0Y2F0ZWdvcnk6IFwiYWR2YW5jZWRcIixcclxuXHRcdH0sXHJcblx0XHQvLyB7XHJcblx0XHQvLyBcdGlkOiBcImV4cGVyaW1lbnRhbFwiLFxyXG5cdFx0Ly8gXHRuYW1lOiB0KFwiRXhwZXJpbWVudGFsXCIpLFxyXG5cdFx0Ly8gXHRpY29uOiBcImJlYWtlclwiLFxyXG5cdFx0Ly8gXHRjYXRlZ29yeTogXCJhZHZhbmNlZFwiLFxyXG5cdFx0Ly8gfSxcclxuXHRcdHtpZDogXCJhYm91dFwiLCBuYW1lOiB0KFwiQWJvdXRcIiksIGljb246IFwiaW5mb1wiLCBjYXRlZ29yeTogXCJpbmZvXCJ9LFxyXG5cdF07XHJcblxyXG5cdGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbikge1xyXG5cdFx0c3VwZXIoYXBwLCBwbHVnaW4pO1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBkZWJvdW5jZWQgZnVuY3Rpb25zXHJcblx0XHR0aGlzLmRlYm91bmNlZEFwcGx5U2V0dGluZ3MgPSBkZWJvdW5jZShcclxuXHRcdFx0YXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRcdGF3YWl0IHBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHJcblx0XHRcdFx0Ly8gVXBkYXRlIGRhdGFmbG93IG9yY2hlc3RyYXRvciB3aXRoIG5ldyBzZXR0aW5nc1xyXG5cdFx0XHRcdGlmIChwbHVnaW4uZGF0YWZsb3dPcmNoZXN0cmF0b3IpIHtcclxuXHRcdFx0XHRcdC8vIENhbGwgYXN5bmMgdXBkYXRlU2V0dGluZ3MgYW5kIGF3YWl0IHRvIGVuc3VyZSBpbmNyZW1lbnRhbCByZWluZGV4IGNvbXBsZXRlc1xyXG5cdFx0XHRcdFx0YXdhaXQgcGx1Z2luLmRhdGFmbG93T3JjaGVzdHJhdG9yLnVwZGF0ZVNldHRpbmdzKFxyXG5cdFx0XHRcdFx0XHRwbHVnaW4uc2V0dGluZ3NcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBSZWxvYWQgbm90aWZpY2F0aW9uIG1hbmFnZXIgdG8gYXBwbHkgY2hhbmdlcyBpbW1lZGlhdGVseVxyXG5cdFx0XHRcdGF3YWl0IHBsdWdpbi5ub3RpZmljYXRpb25NYW5hZ2VyPy5yZWxvYWRTZXR0aW5ncygpO1xyXG5cclxuXHRcdFx0XHQvLyBUcmlnZ2VyIHZpZXcgdXBkYXRlcyB0byByZWZsZWN0IHNldHRpbmcgY2hhbmdlc1xyXG5cdFx0XHRcdGF3YWl0IHBsdWdpbi50cmlnZ2VyVmlld1VwZGF0ZSgpO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHQxMDAsXHJcblx0XHRcdHRydWVcclxuXHRcdCk7XHJcblxyXG5cdFx0dGhpcy5kZWJvdW5jZWRBcHBseU5vdGlmaWNhdGlvbnMgPSBkZWJvdW5jZShcclxuXHRcdFx0YXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRcdGF3YWl0IHBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHQvLyBPbmx5IHJlZnJlc2ggbm90aWZpY2F0aW9uLXJlbGF0ZWQgVUk7IGRvIG5vdCB0b3VjaCBkYXRhZmxvdyBvcmNoZXN0cmF0b3JcclxuXHRcdFx0XHRhd2FpdCBwbHVnaW4ubm90aWZpY2F0aW9uTWFuYWdlcj8ucmVsb2FkU2V0dGluZ3MoKTtcclxuXHRcdFx0XHQvLyBNaW5pbWFsIHZpZXcgdXBkYXRlcyBhcmUgdW5uZWNlc3NhcnkgaGVyZVxyXG5cdFx0XHR9LFxyXG5cdFx0XHQxMDAsXHJcblx0XHRcdHRydWVcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHRhcHBseVNldHRpbmdzVXBkYXRlKCkge1xyXG5cdFx0dGhpcy5kZWJvdW5jZWRBcHBseVNldHRpbmdzKCk7XHJcblx0fVxyXG5cclxuXHQvLyBMaWdodHdlaWdodCB1cGRhdGVyIGZvciBub3RpZmljYXRpb25zL3RyYXkgY2hhbmdlcyB0byBhdm9pZCByZWxvYWRpbmcgdGFzayBjYWNoZXNcclxuXHRhcHBseU5vdGlmaWNhdGlvbnNVcGRhdGVMaWdodCgpIHtcclxuXHRcdHRoaXMuZGVib3VuY2VkQXBwbHlOb3RpZmljYXRpb25zKCk7XHJcblx0fVxyXG5cclxuXHQvLyDliJvlu7rmkJzntKLnu4Tku7ZcclxuXHRwcml2YXRlIGNyZWF0ZVNlYXJjaENvbXBvbmVudCgpIHtcclxuXHRcdGlmICh0aGlzLnNlYXJjaENvbXBvbmVudCkge1xyXG5cdFx0XHR0aGlzLnNlYXJjaENvbXBvbmVudC5kZXN0cm95KCk7XHJcblx0XHR9XHJcblx0XHR0aGlzLnNlYXJjaENvbXBvbmVudCA9IG5ldyBTZXR0aW5nc1NlYXJjaENvbXBvbmVudChcclxuXHRcdFx0dGhpcyxcclxuXHRcdFx0dGhpcy5jb250YWluZXJFbFxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdC8vIFRhYnMgbWFuYWdlbWVudCB3aXRoIGNhdGVnb3JpZXNcclxuXHRwcml2YXRlIGNyZWF0ZUNhdGVnb3JpemVkVGFic1VJKCkge1xyXG5cdFx0dGhpcy5jb250YWluZXJFbC50b2dnbGVDbGFzcyhcInRhc2stZ2VuaXVzLXNldHRpbmdzXCIsIHRydWUpO1xyXG5cclxuXHRcdC8vIOWIm+W7uuaQnOe0oue7hOS7tlxyXG5cdFx0dGhpcy5jcmVhdGVTZWFyY2hDb21wb25lbnQoKTtcclxuXHJcblx0XHQvLyBHcm91cCB0YWJzIGJ5IGNhdGVnb3J5XHJcblx0XHRjb25zdCBjYXRlZ29yaWVzID0ge1xyXG5cdFx0XHRjb3JlOiB7bmFtZTogdChcIkNvcmUgU2V0dGluZ3NcIiksIHRhYnM6IFtdIGFzIHR5cGVvZiB0aGlzLnRhYnN9LFxyXG5cdFx0XHRkaXNwbGF5OiB7XHJcblx0XHRcdFx0bmFtZTogdChcIkRpc3BsYXkgJiBQcm9ncmVzc1wiKSxcclxuXHRcdFx0XHR0YWJzOiBbXSBhcyB0eXBlb2YgdGhpcy50YWJzLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHRtYW5hZ2VtZW50OiB7XHJcblx0XHRcdFx0bmFtZTogdChcIlRhc2sgTWFuYWdlbWVudFwiKSxcclxuXHRcdFx0XHR0YWJzOiBbXSBhcyB0eXBlb2YgdGhpcy50YWJzLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR3b3JrZmxvdzoge1xyXG5cdFx0XHRcdG5hbWU6IHQoXCJXb3JrZmxvdyAmIEF1dG9tYXRpb25cIiksXHJcblx0XHRcdFx0dGFiczogW10gYXMgdHlwZW9mIHRoaXMudGFicyxcclxuXHRcdFx0fSxcclxuXHRcdFx0Z2FtaWZpY2F0aW9uOiB7XHJcblx0XHRcdFx0bmFtZTogdChcIkdhbWlmaWNhdGlvblwiKSxcclxuXHRcdFx0XHR0YWJzOiBbXSBhcyB0eXBlb2YgdGhpcy50YWJzLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHRpbnRlZ3JhdGlvbjoge1xyXG5cdFx0XHRcdG5hbWU6IHQoXCJJbnRlZ3JhdGlvblwiKSxcclxuXHRcdFx0XHR0YWJzOiBbXSBhcyB0eXBlb2YgdGhpcy50YWJzLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHRhZHZhbmNlZDoge25hbWU6IHQoXCJBZHZhbmNlZFwiKSwgdGFiczogW10gYXMgdHlwZW9mIHRoaXMudGFic30sXHJcblx0XHRcdGluZm86IHtuYW1lOiB0KFwiSW5mb3JtYXRpb25cIiksIHRhYnM6IFtdIGFzIHR5cGVvZiB0aGlzLnRhYnN9LFxyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBHcm91cCB0YWJzIGJ5IGNhdGVnb3J5XHJcblx0XHR0aGlzLnRhYnMuZm9yRWFjaCgodGFiKSA9PiB7XHJcblx0XHRcdC8vIFNraXAgTUNQIHRhYiBvbiBub24tZGVza3RvcCBwbGF0Zm9ybXNcclxuXHRcdFx0aWYgKHRhYi5pZCA9PT0gXCJtY3AtaW50ZWdyYXRpb25cIiAmJiAhUGxhdGZvcm0uaXNEZXNrdG9wQXBwKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblx0XHRcdC8vIFNraXAgd29ya3NwYWNlcyB0YWIgZnJvbSBtYWluIG5hdmlnYXRpb24gKGFjY2Vzc2VkIHZpYSBkcm9wZG93bilcclxuXHRcdFx0aWYgKHRhYi5pZCA9PT0gXCJ3b3Jrc3BhY2VzXCIpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdFx0Y29uc3QgY2F0ZWdvcnkgPSB0YWIuY2F0ZWdvcnkgfHwgXCJjb3JlXCI7XHJcblx0XHRcdGlmIChjYXRlZ29yaWVzW2NhdGVnb3J5IGFzIGtleW9mIHR5cGVvZiBjYXRlZ29yaWVzXSkge1xyXG5cdFx0XHRcdGNhdGVnb3JpZXNbY2F0ZWdvcnkgYXMga2V5b2YgdHlwZW9mIGNhdGVnb3JpZXNdLnRhYnMucHVzaCh0YWIpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDcmVhdGUgY2F0ZWdvcml6ZWQgdGFicyBjb250YWluZXJcclxuXHRcdGNvbnN0IHRhYnNDb250YWluZXIgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdigpO1xyXG5cdFx0dGFic0NvbnRhaW5lci5hZGRDbGFzcyhcInNldHRpbmdzLXRhYnMtY2F0ZWdvcml6ZWQtY29udGFpbmVyXCIpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSB0YWJzIGZvciBlYWNoIGNhdGVnb3J5XHJcblx0XHRPYmplY3QuZW50cmllcyhjYXRlZ29yaWVzKS5mb3JFYWNoKChbY2F0ZWdvcnlLZXksIGNhdGVnb3J5XSkgPT4ge1xyXG5cdFx0XHRpZiAoY2F0ZWdvcnkudGFicy5sZW5ndGggPT09IDApIHJldHVybjtcclxuXHJcblx0XHRcdC8vIENyZWF0ZSBjYXRlZ29yeSBzZWN0aW9uXHJcblx0XHRcdGNvbnN0IGNhdGVnb3J5U2VjdGlvbiA9IHRhYnNDb250YWluZXIuY3JlYXRlRGl2KCk7XHJcblx0XHRcdGNhdGVnb3J5U2VjdGlvbi5hZGRDbGFzcyhcInNldHRpbmdzLWNhdGVnb3J5LXNlY3Rpb25cIik7XHJcblxyXG5cdFx0XHQvLyBDYXRlZ29yeSBoZWFkZXJcclxuXHRcdFx0Y29uc3QgY2F0ZWdvcnlIZWFkZXIgPSBjYXRlZ29yeVNlY3Rpb24uY3JlYXRlRGl2KCk7XHJcblx0XHRcdGNhdGVnb3J5SGVhZGVyLmFkZENsYXNzKFwic2V0dGluZ3MtY2F0ZWdvcnktaGVhZGVyXCIpO1xyXG5cdFx0XHRjYXRlZ29yeUhlYWRlci5zZXRUZXh0KGNhdGVnb3J5Lm5hbWUpO1xyXG5cclxuXHRcdFx0Ly8gQ2F0ZWdvcnkgdGFicyBjb250YWluZXJcclxuXHRcdFx0Y29uc3QgY2F0ZWdvcnlUYWJzQ29udGFpbmVyID0gY2F0ZWdvcnlTZWN0aW9uLmNyZWF0ZURpdigpO1xyXG5cdFx0XHRjYXRlZ29yeVRhYnNDb250YWluZXIuYWRkQ2xhc3MoXCJzZXR0aW5ncy1jYXRlZ29yeS10YWJzXCIpO1xyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIHRhYnMgZm9yIHRoaXMgY2F0ZWdvcnlcclxuXHRcdFx0Y2F0ZWdvcnkudGFicy5mb3JFYWNoKCh0YWIpID0+IHtcclxuXHRcdFx0XHRjb25zdCB0YWJFbCA9IGNhdGVnb3J5VGFic0NvbnRhaW5lci5jcmVhdGVEaXYoKTtcclxuXHRcdFx0XHR0YWJFbC5hZGRDbGFzcyhcInNldHRpbmdzLXRhYlwiKTtcclxuXHRcdFx0XHRpZiAodGhpcy5jdXJyZW50VGFiID09PSB0YWIuaWQpIHtcclxuXHRcdFx0XHRcdHRhYkVsLmFkZENsYXNzKFwic2V0dGluZ3MtdGFiLWFjdGl2ZVwiKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0dGFiRWwuc2V0QXR0cmlidXRlKFwiZGF0YS10YWItaWRcIiwgdGFiLmlkKTtcclxuXHRcdFx0XHR0YWJFbC5zZXRBdHRyaWJ1dGUoXCJkYXRhLWNhdGVnb3J5XCIsIGNhdGVnb3J5S2V5KTtcclxuXHJcblx0XHRcdFx0Ly8gQWRkIGljb25cclxuXHRcdFx0XHRjb25zdCBpY29uRWwgPSB0YWJFbC5jcmVhdGVTcGFuKCk7XHJcblx0XHRcdFx0aWNvbkVsLmFkZENsYXNzKFwic2V0dGluZ3MtdGFiLWljb25cIik7XHJcblx0XHRcdFx0c2V0SWNvbihpY29uRWwsIHRhYi5pY29uKTtcclxuXHJcblx0XHRcdFx0Ly8gQWRkIGxhYmVsXHJcblx0XHRcdFx0Y29uc3QgbGFiZWxFbCA9IHRhYkVsLmNyZWF0ZVNwYW4oKTtcclxuXHRcdFx0XHRsYWJlbEVsLmFkZENsYXNzKFwic2V0dGluZ3MtdGFiLWxhYmVsXCIpO1xyXG5cdFx0XHRcdGxhYmVsRWwuc2V0VGV4dChcclxuXHRcdFx0XHRcdHRhYi5uYW1lICtcclxuXHRcdFx0XHRcdCh0YWIuaWQgPT09IFwiYWJvdXRcIlxyXG5cdFx0XHRcdFx0XHQ/IFwiIHZcIiArIHRoaXMucGx1Z2luLm1hbmlmZXN0LnZlcnNpb25cclxuXHRcdFx0XHRcdFx0OiBcIlwiKVxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdC8vIEFkZCBjbGljayBoYW5kbGVyXHJcblx0XHRcdFx0dGFiRWwuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuc3dpdGNoVG9UYWIodGFiLmlkKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDcmVhdGUgc2VjdGlvbnMgY29udGFpbmVyXHJcblx0XHRjb25zdCBzZWN0aW9uc0NvbnRhaW5lciA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KCk7XHJcblx0XHRzZWN0aW9uc0NvbnRhaW5lci5hZGRDbGFzcyhcInNldHRpbmdzLXRhYi1zZWN0aW9uc1wiKTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzd2l0Y2hUb1RhYih0YWJJZDogc3RyaW5nKSB7XHJcblx0XHRjb25zb2xlLmxvZyhcIlN3aXRjaGluZyB0byB0YWI6XCIsIHRhYklkKTtcclxuXHJcblx0XHQvLyBVcGRhdGUgY3VycmVudCB0YWJcclxuXHRcdHRoaXMuY3VycmVudFRhYiA9IHRhYklkO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSBhY3RpdmUgdGFiIHN0YXRlc1xyXG5cdFx0Y29uc3QgdGFicyA9IHRoaXMuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvckFsbChcIi5zZXR0aW5ncy10YWJcIik7XHJcblx0XHR0YWJzLmZvckVhY2goKHRhYikgPT4ge1xyXG5cdFx0XHRpZiAodGFiLmdldEF0dHJpYnV0ZShcImRhdGEtdGFiLWlkXCIpID09PSB0YWJJZCkge1xyXG5cdFx0XHRcdHRhYi5hZGRDbGFzcyhcInNldHRpbmdzLXRhYi1hY3RpdmVcIik7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGFiLnJlbW92ZUNsYXNzKFwic2V0dGluZ3MtdGFiLWFjdGl2ZVwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gU2hvdyBhY3RpdmUgc2VjdGlvbiwgaGlkZSBvdGhlcnNcclxuXHRcdGNvbnN0IHNlY3Rpb25zID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKFxyXG5cdFx0XHRcIi5zZXR0aW5ncy10YWItc2VjdGlvblwiXHJcblx0XHQpO1xyXG5cdFx0c2VjdGlvbnMuZm9yRWFjaCgoc2VjdGlvbikgPT4ge1xyXG5cdFx0XHRpZiAoc2VjdGlvbi5nZXRBdHRyaWJ1dGUoXCJkYXRhLXRhYi1pZFwiKSA9PT0gdGFiSWQpIHtcclxuXHRcdFx0XHRzZWN0aW9uLmFkZENsYXNzKFwic2V0dGluZ3MtdGFiLXNlY3Rpb24tYWN0aXZlXCIpO1xyXG5cdFx0XHRcdChzZWN0aW9uIGFzIHVua25vd24gYXMgSFRNTEVsZW1lbnQpLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0c2VjdGlvbi5yZW1vdmVDbGFzcyhcInNldHRpbmdzLXRhYi1zZWN0aW9uLWFjdGl2ZVwiKTtcclxuXHRcdFx0XHQoc2VjdGlvbiBhcyB1bmtub3duIGFzIEhUTUxFbGVtZW50KS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEhhbmRsZSB0YWIgY29udGFpbmVyIGFuZCBoZWFkZXIgdmlzaWJpbGl0eSBiYXNlZCBvbiBzZWxlY3RlZCB0YWJcclxuXHRcdGNvbnN0IHRhYnNDb250YWluZXIgPSB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFwiLnNldHRpbmdzLXRhYnMtY2F0ZWdvcml6ZWQtY29udGFpbmVyXCJcclxuXHRcdCk7XHJcblx0XHRjb25zdCBzZXR0aW5nc0hlYWRlciA9IHRoaXMuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvcihcclxuXHRcdFx0XCIudGFzay1nZW5pdXMtc2V0dGluZ3MtaGVhZGVyXCJcclxuXHRcdCk7XHJcblxyXG5cdFx0aWYgKHRhYklkID09PSBcImdlbmVyYWxcIikge1xyXG5cdFx0XHQvLyBTaG93IHRhYnMgYW5kIGhlYWRlciBmb3IgZ2VuZXJhbCB0YWJcclxuXHRcdFx0aWYgKHRhYnNDb250YWluZXIpXHJcblx0XHRcdFx0KHRhYnNDb250YWluZXIgYXMgdW5rbm93biBhcyBIVE1MRWxlbWVudCkuc3R5bGUuZGlzcGxheSA9XHJcblx0XHRcdFx0XHRcImZsZXhcIjtcclxuXHRcdFx0aWYgKHNldHRpbmdzSGVhZGVyKVxyXG5cdFx0XHRcdChzZXR0aW5nc0hlYWRlciBhcyB1bmtub3duIGFzIEhUTUxFbGVtZW50KS5zdHlsZS5kaXNwbGF5ID1cclxuXHRcdFx0XHRcdFwiYmxvY2tcIjtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIEhpZGUgdGFicyBhbmQgaGVhZGVyIGZvciBzcGVjaWZpYyB0YWIgcGFnZXNcclxuXHRcdFx0aWYgKHRhYnNDb250YWluZXIpXHJcblx0XHRcdFx0KHRhYnNDb250YWluZXIgYXMgdW5rbm93biBhcyBIVE1MRWxlbWVudCkuc3R5bGUuZGlzcGxheSA9XHJcblx0XHRcdFx0XHRcIm5vbmVcIjtcclxuXHRcdFx0aWYgKHNldHRpbmdzSGVhZGVyKVxyXG5cdFx0XHRcdChzZXR0aW5nc0hlYWRlciBhcyB1bmtub3duIGFzIEhUTUxFbGVtZW50KS5zdHlsZS5kaXNwbGF5ID1cclxuXHRcdFx0XHRcdFwibm9uZVwiO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIHdvcmtzcGFjZXMgdGFiIC0gZW5zdXJlIGl0J3Mgc3RpbGwgYWNjZXNzaWJsZSB2aWEgZHJvcGRvd25cclxuXHRcdGlmICh0YWJJZCA9PT0gXCJ3b3Jrc3BhY2VzXCIpIHtcclxuXHRcdFx0Ly8gTWFrZSBzdXJlIHRoZSB3b3Jrc3BhY2Ugc2VjdGlvbiBpcyB2aXNpYmxlIGV2ZW4gdGhvdWdoIHRoZSB0YWIgaXMgaGlkZGVuXHJcblx0XHRcdGNvbnN0IHdvcmtzcGFjZVNlY3Rpb24gPSB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFx0J1tkYXRhLXRhYi1pZD1cIndvcmtzcGFjZXNcIl0nXHJcblx0XHRcdCk7XHJcblx0XHRcdGlmICh3b3Jrc3BhY2VTZWN0aW9uKSB7XHJcblx0XHRcdFx0KHdvcmtzcGFjZVNlY3Rpb24gYXMgdW5rbm93biBhcyBIVE1MRWxlbWVudCkuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcclxuXHRcdFx0XHR3b3Jrc3BhY2VTZWN0aW9uLmFkZENsYXNzKFwic2V0dGluZ3MtdGFiLXNlY3Rpb24tYWN0aXZlXCIpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgb3BlblRhYih0YWJJZDogc3RyaW5nKSB7XHJcblx0XHR0aGlzLmN1cnJlbnRUYWIgPSB0YWJJZDtcclxuXHRcdHRoaXMuZGlzcGxheSgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTmF2aWdhdGUgdG8gYSBzcGVjaWZpYyB0YWIgdmlhIFVSSVxyXG5cdCAqL1xyXG5cdHB1YmxpYyBuYXZpZ2F0ZVRvVGFiKFxyXG5cdFx0dGFiSWQ6IHN0cmluZyxcclxuXHRcdHNlY3Rpb24/OiBzdHJpbmcsXHJcblx0XHRzZWFyY2g/OiBzdHJpbmdcclxuXHQpOiB2b2lkIHtcclxuXHRcdC8vIFNldCB0aGUgY3VycmVudCB0YWJcclxuXHRcdHRoaXMuY3VycmVudFRhYiA9IHRhYklkO1xyXG5cclxuXHRcdC8vIFJlLWRpc3BsYXkgdGhlIHNldHRpbmdzXHJcblx0XHR0aGlzLmRpc3BsYXkoKTtcclxuXHJcblx0XHQvLyBXYWl0IGZvciBkaXNwbGF5IHRvIGNvbXBsZXRlXHJcblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0Ly8gSWYgc2VhcmNoIGlzIHByb3ZpZGVkLCBwZXJmb3JtIHNlYXJjaFxyXG5cdFx0XHRpZiAoc2VhcmNoICYmIHRoaXMuc2VhcmNoQ29tcG9uZW50KSB7XHJcblx0XHRcdFx0dGhpcy5zZWFyY2hDb21wb25lbnQucGVyZm9ybVNlYXJjaChzZWFyY2gpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBJZiBzZWN0aW9uIGlzIHByb3ZpZGVkLCBzY3JvbGwgdG8gaXRcclxuXHRcdFx0aWYgKHNlY3Rpb24pIHtcclxuXHRcdFx0XHR0aGlzLnNjcm9sbFRvU2VjdGlvbihzZWN0aW9uKTtcclxuXHRcdFx0fVxyXG5cdFx0fSwgMTAwKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNjcm9sbCB0byBhIHNwZWNpZmljIHNlY3Rpb24gd2l0aGluIHRoZSBjdXJyZW50IHRhYlxyXG5cdCAqL1xyXG5cdHByaXZhdGUgc2Nyb2xsVG9TZWN0aW9uKHNlY3Rpb25JZDogc3RyaW5nKTogdm9pZCB7XHJcblx0XHQvLyBMb29rIGZvciBoZWFkZXJzIGNvbnRhaW5pbmcgdGhlIHNlY3Rpb24gSURcclxuXHRcdGNvbnN0IGhlYWRlcnMgPSB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoXCJoMywgaDRcIik7XHJcblx0XHRoZWFkZXJzLmZvckVhY2goKGhlYWRlcjogSFRNTEVsZW1lbnQpID0+IHtcclxuXHRcdFx0Y29uc3QgaGVhZGVyVGV4dCA9IGhlYWRlci50ZXh0Q29udGVudD8udG9Mb3dlckNhc2UoKTtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdGhlYWRlclRleHQgJiZcclxuXHRcdFx0XHRoZWFkZXJUZXh0LmluY2x1ZGVzKHNlY3Rpb25JZC5yZXBsYWNlKFwiLVwiLCBcIiBcIikpXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdGhlYWRlci5zY3JvbGxJbnRvVmlldyh7YmVoYXZpb3I6IFwic21vb3RoXCIsIGJsb2NrOiBcInN0YXJ0XCJ9KTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gU3BlY2lhbCBoYW5kbGluZyBmb3IgTUNQIHNlY3Rpb25zXHJcblx0XHRpZiAoc2VjdGlvbklkID09PSBcImN1cnNvclwiICYmIHRoaXMuY3VycmVudFRhYiA9PT0gXCJtY3AtaW50ZWdyYXRpb25cIikge1xyXG5cdFx0XHRjb25zdCBjdXJzb3JTZWN0aW9uID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRcdFwiLm1jcC1jbGllbnQtc2VjdGlvblwiXHJcblx0XHRcdCk7XHJcblx0XHRcdGlmIChjdXJzb3JTZWN0aW9uKSB7XHJcblx0XHRcdFx0Y29uc3QgaGVhZGVyID1cclxuXHRcdFx0XHRcdGN1cnNvclNlY3Rpb24ucXVlcnlTZWxlY3RvcihcIi5tY3AtY2xpZW50LWhlYWRlclwiKTtcclxuXHRcdFx0XHRpZiAoaGVhZGVyICYmIGhlYWRlci50ZXh0Q29udGVudD8uaW5jbHVkZXMoXCJDdXJzb3JcIikpIHtcclxuXHRcdFx0XHRcdC8vIENsaWNrIHRvIGV4cGFuZFxyXG5cdFx0XHRcdFx0KGhlYWRlciBhcyBIVE1MRWxlbWVudCkuY2xpY2soKTtcclxuXHRcdFx0XHRcdGN1cnNvclNlY3Rpb24uc2Nyb2xsSW50b1ZpZXcoe1xyXG5cdFx0XHRcdFx0XHRiZWhhdmlvcjogXCJzbW9vdGhcIixcclxuXHRcdFx0XHRcdFx0YmxvY2s6IFwic3RhcnRcIixcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVUYWJTZWN0aW9uKHRhYklkOiBzdHJpbmcpOiBIVE1MRWxlbWVudCB7XHJcblx0XHQvLyBHZXQgdGhlIHNlY3Rpb25zIGNvbnRhaW5lclxyXG5cdFx0Y29uc3Qgc2VjdGlvbnNDb250YWluZXIgPSB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFwiLnNldHRpbmdzLXRhYi1zZWN0aW9uc1wiXHJcblx0XHQpO1xyXG5cdFx0aWYgKCFzZWN0aW9uc0NvbnRhaW5lcikgcmV0dXJuIHRoaXMuY29udGFpbmVyRWw7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIHNlY3Rpb24gZWxlbWVudFxyXG5cdFx0Y29uc3Qgc2VjdGlvbiA9IHNlY3Rpb25zQ29udGFpbmVyLmNyZWF0ZURpdigpO1xyXG5cdFx0c2VjdGlvbi5hZGRDbGFzcyhcInNldHRpbmdzLXRhYi1zZWN0aW9uXCIpO1xyXG5cdFx0aWYgKHRoaXMuY3VycmVudFRhYiA9PT0gdGFiSWQpIHtcclxuXHRcdFx0c2VjdGlvbi5hZGRDbGFzcyhcInNldHRpbmdzLXRhYi1zZWN0aW9uLWFjdGl2ZVwiKTtcclxuXHRcdH1cclxuXHRcdHNlY3Rpb24uc2V0QXR0cmlidXRlKFwiZGF0YS10YWItaWRcIiwgdGFiSWQpO1xyXG5cclxuXHRcdC8vIEF0dGFjaCBjYXRlZ29yeSBmb3Igc2VhcmNoIGluZGV4ZXJcclxuXHRcdGNvbnN0IHRhYkluZm8gPSB0aGlzLnRhYnMuZmluZCgodCkgPT4gdC5pZCA9PT0gdGFiSWQpO1xyXG5cdFx0aWYgKHRhYkluZm8/LmNhdGVnb3J5KSB7XHJcblx0XHRcdHNlY3Rpb24uc2V0QXR0cmlidXRlKFwiZGF0YS1jYXRlZ29yeVwiLCB0YWJJbmZvLmNhdGVnb3J5KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDcmVhdGUgaGVhZGVyXHJcblx0XHRpZiAodGFiSWQgIT09IFwiZ2VuZXJhbFwiKSB7XHJcblx0XHRcdGNvbnN0IGhlYWRlckVsID0gc2VjdGlvbi5jcmVhdGVEaXYoKTtcclxuXHRcdFx0aGVhZGVyRWwuYWRkQ2xhc3MoXCJzZXR0aW5ncy10YWItc2VjdGlvbi1oZWFkZXJcIik7XHJcblxyXG5cdFx0XHQvLyBMZWZ0OiBIb3cgdG8gdXNlIGJ1dHRvbiAob3BlbnMgaWZyYW1lIG1vZGFsIHdpdGggZG9jcylcclxuXHRcdFx0Y29uc3QgaG93VG9CdG4gPSBuZXcgQnV0dG9uQ29tcG9uZW50KGhlYWRlckVsKTtcclxuXHRcdFx0aG93VG9CdG4uc2V0Q2xhc3MoXCJoZWFkZXItYnV0dG9uXCIpO1xyXG5cdFx0XHRob3dUb0J0bi5zZXRDbGFzcyhcImhvdy10by1idXR0b25cIik7XHJcblx0XHRcdGhvd1RvQnRuLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IHVybCA9IHRoaXMuZ2V0SG93VG9Vc2VVcmwodGFiSWQpO1xyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRuZXcgSWZyYW1lTW9kYWwoXHJcblx0XHRcdFx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHRcdFx0XHR1cmwsXHJcblx0XHRcdFx0XHRcdGBIb3cgdG8gdXNlIOKAlCAke3RhYkluZm8/Lm5hbWUgPz8gdGFiSWR9YFxyXG5cdFx0XHRcdFx0KS5vcGVuKCk7XHJcblx0XHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdFx0d2luZG93Lm9wZW4odXJsKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgaG93VG9JY29uRWwgPSBob3dUb0J0bi5idXR0b25FbC5jcmVhdGVFbChcInNwYW5cIik7XHJcblx0XHRcdGhvd1RvSWNvbkVsLmFkZENsYXNzKFwiaGVhZGVyLWJ1dHRvbi1pY29uXCIpO1xyXG5cdFx0XHRzZXRJY29uKGhvd1RvSWNvbkVsLCBcImJvb2tcIik7XHJcblxyXG5cdFx0XHRjb25zdCBob3dUb1RleHRFbCA9IGhvd1RvQnRuLmJ1dHRvbkVsLmNyZWF0ZUVsKFwic3BhblwiKTtcclxuXHRcdFx0aG93VG9UZXh0RWwuYWRkQ2xhc3MoXCJoZWFkZXItYnV0dG9uLXRleHRcIik7XHJcblx0XHRcdGhvd1RvVGV4dEVsLnNldFRleHQodChcIkhvdyB0byB1c2VcIikpO1xyXG5cclxuXHRcdFx0Ly8gUmlnaHQ6IEJhY2sgdG8gbWFpbiBzZXR0aW5nc1xyXG5cdFx0XHRjb25zdCBiYWNrQnRuID0gbmV3IEJ1dHRvbkNvbXBvbmVudChoZWFkZXJFbClcclxuXHRcdFx0XHQuc2V0Q2xhc3MoXCJoZWFkZXItYnV0dG9uXCIpXHJcblx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5jdXJyZW50VGFiID0gXCJnZW5lcmFsXCI7XHJcblx0XHRcdFx0XHR0aGlzLmRpc3BsYXkoKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0YmFja0J0bi5zZXRDbGFzcyhcImhlYWRlci1idXR0b24tYmFja1wiKTtcclxuXHJcblx0XHRcdGNvbnN0IGljb25FbCA9IGJhY2tCdG4uYnV0dG9uRWwuY3JlYXRlRWwoXCJzcGFuXCIpO1xyXG5cdFx0XHRpY29uRWwuYWRkQ2xhc3MoXCJoZWFkZXItYnV0dG9uLWljb25cIik7XHJcblx0XHRcdHNldEljb24oaWNvbkVsLCBcImFycm93LWxlZnRcIik7XHJcblxyXG5cdFx0XHRjb25zdCB0ZXh0RWwgPSBiYWNrQnRuLmJ1dHRvbkVsLmNyZWF0ZUVsKFwic3BhblwiKTtcclxuXHRcdFx0dGV4dEVsLmFkZENsYXNzKFwiaGVhZGVyLWJ1dHRvbi10ZXh0XCIpO1xyXG5cdFx0XHR0ZXh0RWwuc2V0VGV4dCh0KFwiQmFjayB0byBtYWluIHNldHRpbmdzXCIpKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gc2VjdGlvbjtcclxuXHR9XHJcblxyXG5cdGRpc3BsYXkoKTogdm9pZCB7XHJcblx0XHRjb25zdCB7Y29udGFpbmVyRWx9ID0gdGhpcztcclxuXHJcblx0XHRjb250YWluZXJFbC5lbXB0eSgpO1xyXG5cclxuXHRcdC8vIEVuc3VyZSB3ZSBzdGFydCB3aXRoIGdlbmVyYWwgdGFiIGlmIG5vIHRhYiBpcyBzZXRcclxuXHRcdGlmICghdGhpcy5jdXJyZW50VGFiKSB7XHJcblx0XHRcdHRoaXMuY3VycmVudFRhYiA9IFwiZ2VuZXJhbFwiO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENyZWF0ZSB0YWJzIFVJIHdpdGggY2F0ZWdvcmllc1xyXG5cdFx0dGhpcy5jcmVhdGVDYXRlZ29yaXplZFRhYnNVSSgpO1xyXG5cclxuXHRcdC8vIEdlbmVyYWwgVGFiXHJcblx0XHRjb25zdCBnZW5lcmFsU2VjdGlvbiA9IHRoaXMuY3JlYXRlVGFiU2VjdGlvbihcImdlbmVyYWxcIik7XHJcblx0XHR0aGlzLmRpc3BsYXlHZW5lcmFsU2V0dGluZ3MoZ2VuZXJhbFNlY3Rpb24pO1xyXG5cclxuXHRcdC8vIFByb2dyZXNzIEJhciBUYWJcclxuXHRcdGNvbnN0IHByb2dyZXNzQmFyU2VjdGlvbiA9IHRoaXMuY3JlYXRlVGFiU2VjdGlvbihcInByb2dyZXNzLWJhclwiKTtcclxuXHRcdHRoaXMuZGlzcGxheVByb2dyZXNzQmFyU2V0dGluZ3MocHJvZ3Jlc3NCYXJTZWN0aW9uKTtcclxuXHJcblx0XHQvLyBDaGVja2JveCBTdGF0dXMgVGFiXHJcblx0XHRjb25zdCB0YXNrU3RhdHVzU2VjdGlvbiA9IHRoaXMuY3JlYXRlVGFiU2VjdGlvbihcInRhc2stc3RhdHVzXCIpO1xyXG5cdFx0dGhpcy5kaXNwbGF5VGFza1N0YXR1c1NldHRpbmdzKHRhc2tTdGF0dXNTZWN0aW9uKTtcclxuXHJcblx0XHQvLyBUYXNrIEZpbHRlciBUYWJcclxuXHRcdGNvbnN0IHRhc2tGaWx0ZXJTZWN0aW9uID0gdGhpcy5jcmVhdGVUYWJTZWN0aW9uKFwidGFzay1maWx0ZXJcIik7XHJcblx0XHR0aGlzLmRpc3BsYXlUYXNrRmlsdGVyU2V0dGluZ3ModGFza0ZpbHRlclNlY3Rpb24pO1xyXG5cclxuXHRcdC8vIEZpbGUgRmlsdGVyIFRhYlxyXG5cdFx0Y29uc3QgZmlsZUZpbHRlclNlY3Rpb24gPSB0aGlzLmNyZWF0ZVRhYlNlY3Rpb24oXCJmaWxlLWZpbHRlclwiKTtcclxuXHRcdHRoaXMuZGlzcGxheUZpbGVGaWx0ZXJTZXR0aW5ncyhmaWxlRmlsdGVyU2VjdGlvbik7XHJcblxyXG5cdFx0Ly8gVGFzayBIYW5kbGVyIFRhYlxyXG5cdFx0Y29uc3QgdGFza0hhbmRsZXJTZWN0aW9uID0gdGhpcy5jcmVhdGVUYWJTZWN0aW9uKFwidGFzay1oYW5kbGVyXCIpO1xyXG5cdFx0dGhpcy5kaXNwbGF5VGFza0hhbmRsZXJTZXR0aW5ncyh0YXNrSGFuZGxlclNlY3Rpb24pO1xyXG5cclxuXHRcdC8vIFF1aWNrIENhcHR1cmUgVGFiXHJcblx0XHRjb25zdCBxdWlja0NhcHR1cmVTZWN0aW9uID0gdGhpcy5jcmVhdGVUYWJTZWN0aW9uKFwicXVpY2stY2FwdHVyZVwiKTtcclxuXHRcdHRoaXMuZGlzcGxheVF1aWNrQ2FwdHVyZVNldHRpbmdzKHF1aWNrQ2FwdHVyZVNlY3Rpb24pO1xyXG5cclxuXHRcdC8vIFRhc2sgVGltZXIgVGFiXHJcblx0XHRjb25zdCB0YXNrVGltZXJTZWN0aW9uID0gdGhpcy5jcmVhdGVUYWJTZWN0aW9uKFwidGFzay10aW1lclwiKTtcclxuXHRcdHRoaXMuZGlzcGxheVRhc2tUaW1lclNldHRpbmdzKHRhc2tUaW1lclNlY3Rpb24pO1xyXG5cclxuXHRcdC8vIFRpbWUgUGFyc2luZyBUYWJcclxuXHRcdGNvbnN0IHRpbWVQYXJzaW5nU2VjdGlvbiA9IHRoaXMuY3JlYXRlVGFiU2VjdGlvbihcInRpbWUtcGFyc2luZ1wiKTtcclxuXHRcdHRoaXMuZGlzcGxheVRpbWVQYXJzaW5nU2V0dGluZ3ModGltZVBhcnNpbmdTZWN0aW9uKTtcclxuXHJcblx0XHQvLyBUaW1lbGluZSBTaWRlYmFyIFRhYlxyXG5cdFx0Y29uc3QgdGltZWxpbmVTaWRlYmFyU2VjdGlvbiA9XHJcblx0XHRcdHRoaXMuY3JlYXRlVGFiU2VjdGlvbihcInRpbWVsaW5lLXNpZGViYXJcIik7XHJcblx0XHR0aGlzLmRpc3BsYXlUaW1lbGluZVNpZGViYXJTZXR0aW5ncyh0aW1lbGluZVNpZGViYXJTZWN0aW9uKTtcclxuXHJcblx0XHQvLyBXb3JrZmxvdyBUYWJcclxuXHRcdGNvbnN0IHdvcmtmbG93U2VjdGlvbiA9IHRoaXMuY3JlYXRlVGFiU2VjdGlvbihcIndvcmtmbG93XCIpO1xyXG5cdFx0dGhpcy5kaXNwbGF5V29ya2Zsb3dTZXR0aW5ncyh3b3JrZmxvd1NlY3Rpb24pO1xyXG5cclxuXHRcdC8vIERhdGUgJiBQcmlvcml0eSBUYWJcclxuXHRcdGNvbnN0IGRhdGVQcmlvcml0eVNlY3Rpb24gPSB0aGlzLmNyZWF0ZVRhYlNlY3Rpb24oXCJkYXRlLXByaW9yaXR5XCIpO1xyXG5cdFx0dGhpcy5kaXNwbGF5RGF0ZVByaW9yaXR5U2V0dGluZ3MoZGF0ZVByaW9yaXR5U2VjdGlvbik7XHJcblxyXG5cdFx0Ly8gUHJvamVjdCBUYWJcclxuXHRcdGNvbnN0IHByb2plY3RTZWN0aW9uID0gdGhpcy5jcmVhdGVUYWJTZWN0aW9uKFwicHJvamVjdFwiKTtcclxuXHRcdHRoaXMuZGlzcGxheVByb2plY3RTZXR0aW5ncyhwcm9qZWN0U2VjdGlvbik7XHJcblxyXG5cdFx0Ly8gSW5kZXggU2V0dGluZ3MgVGFiXHJcblx0XHRjb25zdCBpbmRleFNlY3Rpb24gPSB0aGlzLmNyZWF0ZVRhYlNlY3Rpb24oXCJpbmRleFwiKTtcclxuXHRcdHRoaXMuZGlzcGxheUluZGV4U2V0dGluZ3MoaW5kZXhTZWN0aW9uKTtcclxuXHJcblx0XHQvLyBWaWV3IFNldHRpbmdzIFRhYlxyXG5cdFx0Y29uc3Qgdmlld1NldHRpbmdzU2VjdGlvbiA9IHRoaXMuY3JlYXRlVGFiU2VjdGlvbihcInZpZXctc2V0dGluZ3NcIik7XHJcblx0XHR0aGlzLmRpc3BsYXlWaWV3U2V0dGluZ3Modmlld1NldHRpbmdzU2VjdGlvbik7XHJcblxyXG5cdFx0Ly8gSW50ZXJmYWNlIFRhYlxyXG5cdFx0Y29uc3QgaW50ZXJmYWNlU2VjdGlvbiA9IHRoaXMuY3JlYXRlVGFiU2VjdGlvbihcImludGVyZmFjZVwiKTtcclxuXHRcdHRoaXMuZGlzcGxheUludGVyZmFjZVNldHRpbmdzKGludGVyZmFjZVNlY3Rpb24pO1xyXG5cclxuXHRcdC8vIFJld2FyZCBUYWJcclxuXHRcdGNvbnN0IHJld2FyZFNlY3Rpb24gPSB0aGlzLmNyZWF0ZVRhYlNlY3Rpb24oXCJyZXdhcmRcIik7XHJcblx0XHR0aGlzLmRpc3BsYXlSZXdhcmRTZXR0aW5ncyhyZXdhcmRTZWN0aW9uKTtcclxuXHJcblx0XHQvLyBIYWJpdCBUYWJcclxuXHRcdGNvbnN0IGhhYml0U2VjdGlvbiA9IHRoaXMuY3JlYXRlVGFiU2VjdGlvbihcImhhYml0XCIpO1xyXG5cdFx0dGhpcy5kaXNwbGF5SGFiaXRTZXR0aW5ncyhoYWJpdFNlY3Rpb24pO1xyXG5cclxuXHRcdC8vIElDUyBJbnRlZ3JhdGlvbiBUYWJcclxuXHRcdGNvbnN0IGljc1NlY3Rpb24gPSB0aGlzLmNyZWF0ZVRhYlNlY3Rpb24oXCJpY3MtaW50ZWdyYXRpb25cIik7XHJcblx0XHR0aGlzLmRpc3BsYXlJY3NTZXR0aW5ncyhpY3NTZWN0aW9uKTtcclxuXHJcblx0XHQvLyBOb3RpZmljYXRpb25zIFRhYlxyXG5cdFx0Y29uc3Qgbm90aWZpY2F0aW9uc1NlY3Rpb24gPSB0aGlzLmNyZWF0ZVRhYlNlY3Rpb24oXHJcblx0XHRcdFwiZGVza3RvcC1pbnRlZ3JhdGlvblwiXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5kaXNwbGF5RGVza3RvcEludGVncmF0aW9uU2V0dGluZ3Mobm90aWZpY2F0aW9uc1NlY3Rpb24pO1xyXG5cclxuXHRcdC8vIE1DUCBJbnRlZ3JhdGlvbiBUYWIgKG9ubHkgb24gZGVza3RvcClcclxuXHRcdGlmIChQbGF0Zm9ybS5pc0Rlc2t0b3BBcHApIHtcclxuXHRcdFx0Y29uc3QgbWNwU2VjdGlvbiA9IHRoaXMuY3JlYXRlVGFiU2VjdGlvbihcIm1jcC1pbnRlZ3JhdGlvblwiKTtcclxuXHRcdFx0dGhpcy5kaXNwbGF5TWNwU2V0dGluZ3MobWNwU2VjdGlvbik7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHJlcXVpcmVBcGlWZXJzaW9uKFwiMS45LjEwXCIpKSB7XHJcblx0XHRcdGNvbnN0IGJhc2VzU2VjdGlvbiA9IHRoaXMuY3JlYXRlVGFiU2VjdGlvbihcImJhc2VzLXN1cHBvcnRcIik7XHJcblx0XHRcdHRoaXMuZGlzcGxheUJhc2VzU2V0dGluZ3MoYmFzZXNTZWN0aW9uKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBXb3Jrc3BhY2VzIFRhYlxyXG5cdFx0Y29uc3Qgd29ya3NwYWNlc1NlY3Rpb24gPSB0aGlzLmNyZWF0ZVRhYlNlY3Rpb24oXCJ3b3Jrc3BhY2VzXCIpO1xyXG5cdFx0dGhpcy5kaXNwbGF5V29ya3NwYWNlc1NldHRpbmdzKHdvcmtzcGFjZXNTZWN0aW9uKTtcclxuXHJcblx0XHQvLyBCZXRhIFRlc3QgVGFiXHJcblx0XHRjb25zdCBiZXRhVGVzdFNlY3Rpb24gPSB0aGlzLmNyZWF0ZVRhYlNlY3Rpb24oXCJiZXRhLXRlc3RcIik7XHJcblx0XHR0aGlzLmRpc3BsYXlCZXRhVGVzdFNldHRpbmdzKGJldGFUZXN0U2VjdGlvbik7XHJcblxyXG5cdFx0Ly8gLy8gRXhwZXJpbWVudGFsIFRhYlxyXG5cdFx0Ly8gY29uc3QgZXhwZXJpbWVudGFsU2VjdGlvbiA9IHRoaXMuY3JlYXRlVGFiU2VjdGlvbihcImV4cGVyaW1lbnRhbFwiKTtcclxuXHRcdC8vIHRoaXMuZGlzcGxheUV4cGVyaW1lbnRhbFNldHRpbmdzKGV4cGVyaW1lbnRhbFNlY3Rpb24pO1xyXG5cclxuXHRcdC8vIEFib3V0IFRhYlxyXG5cdFx0Y29uc3QgYWJvdXRTZWN0aW9uID0gdGhpcy5jcmVhdGVUYWJTZWN0aW9uKFwiYWJvdXRcIik7XHJcblx0XHR0aGlzLmRpc3BsYXlBYm91dFNldHRpbmdzKGFib3V0U2VjdGlvbik7XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSB0aGUgY29ycmVjdCB0YWIgc3RhdGVcclxuXHRcdHRoaXMuc3dpdGNoVG9UYWIodGhpcy5jdXJyZW50VGFiKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZ2V0SG93VG9Vc2VVcmwodGFiSWQ6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHRjb25zdCBiYXNlID0gXCJodHRwczovL3Rhc2tnZW5pdXMubWQvZG9jc1wiO1xyXG5cdFx0c3dpdGNoICh0YWJJZCkge1xyXG5cdFx0XHRjYXNlIFwiaW5kZXhcIjpcclxuXHRcdFx0XHRyZXR1cm4gYCR7YmFzZX0vdGFzay12aWV3L2luZGV4ZXJgO1xyXG5cdFx0XHRjYXNlIFwidmlldy1zZXR0aW5nc1wiOlxyXG5cdFx0XHRcdHJldHVybiBgJHtiYXNlfS90YXNrLXZpZXdgO1xyXG5cdFx0XHRjYXNlIFwiaW50ZXJmYWNlXCI6XHJcblx0XHRcdFx0cmV0dXJuIGAke2Jhc2V9L2ludGVyZmFjZWA7XHJcblx0XHRcdGNhc2UgXCJmaWxlLWZpbHRlclwiOlxyXG5cdFx0XHRcdHJldHVybiBgJHtiYXNlfS9maWxlLWZpbHRlcmA7XHJcblx0XHRcdGNhc2UgXCJwcm9ncmVzcy1iYXJcIjpcclxuXHRcdFx0XHRyZXR1cm4gYCR7YmFzZX0vcHJvZ3Jlc3MtYmFyc2A7XHJcblx0XHRcdGNhc2UgXCJ0YXNrLXN0YXR1c1wiOlxyXG5cdFx0XHRcdHJldHVybiBgJHtiYXNlfS90YXNrLXN0YXR1c2A7XHJcblx0XHRcdGNhc2UgXCJ0YXNrLWhhbmRsZXJcIjpcclxuXHRcdFx0XHRyZXR1cm4gYCR7YmFzZX0vdGFzay1ndXR0ZXJgO1xyXG5cdFx0XHRjYXNlIFwidGFzay1maWx0ZXJcIjpcclxuXHRcdFx0XHRyZXR1cm4gYCR7YmFzZX0vZmlsdGVyaW5nYDtcclxuXHRcdFx0Y2FzZSBcInByb2plY3RcIjpcclxuXHRcdFx0XHRyZXR1cm4gYCR7YmFzZX0vcHJvamVjdGA7XHJcblx0XHRcdGNhc2UgXCJkYXRlLXByaW9yaXR5XCI6XHJcblx0XHRcdFx0cmV0dXJuIGAke2Jhc2V9L2RhdGUtcHJpb3JpdHlgO1xyXG5cdFx0XHRjYXNlIFwicXVpY2stY2FwdHVyZVwiOlxyXG5cdFx0XHRcdHJldHVybiBgJHtiYXNlfS9xdWljay1jYXB0dXJlYDtcclxuXHRcdFx0Y2FzZSBcInRhc2stdGltZXJcIjpcclxuXHRcdFx0XHRyZXR1cm4gYCR7YmFzZX0vdGFzay10aW1lcmA7XHJcblx0XHRcdGNhc2UgXCJ0aW1lLXBhcnNpbmdcIjpcclxuXHRcdFx0XHRyZXR1cm4gYCR7YmFzZX0vdGltZS1wYXJzaW5nYDtcclxuXHRcdFx0Y2FzZSBcIndvcmtmbG93XCI6XHJcblx0XHRcdFx0cmV0dXJuIGAke2Jhc2V9L3dvcmtmbG93c2A7XHJcblx0XHRcdGNhc2UgXCJ0aW1lbGluZS1zaWRlYmFyXCI6XHJcblx0XHRcdFx0cmV0dXJuIGAke2Jhc2V9L3Rhc2stdmlldy90aW1lbGluZS1zaWRlYmFyLXZpZXdgO1xyXG5cdFx0XHRjYXNlIFwicmV3YXJkXCI6XHJcblx0XHRcdFx0cmV0dXJuIGAke2Jhc2V9L3Jld2FyZGA7XHJcblx0XHRcdGNhc2UgXCJoYWJpdFwiOlxyXG5cdFx0XHRcdHJldHVybiBgJHtiYXNlfS9oYWJpdGA7XHJcblx0XHRcdGNhc2UgXCJpY3MtaW50ZWdyYXRpb25cIjpcclxuXHRcdFx0XHRyZXR1cm4gYCR7YmFzZX0vaWNzLXN1cHBvcnRgO1xyXG5cdFx0XHRjYXNlIFwibWNwLWludGVncmF0aW9uXCI6XHJcblx0XHRcdFx0cmV0dXJuIGAke2Jhc2V9L21jcC1pbnRlZ3JhdGlvbmA7XHJcblx0XHRcdGNhc2UgXCJiYXNlcy1zdXBwb3J0XCI6XHJcblx0XHRcdFx0cmV0dXJuIGAke2Jhc2V9L2Jhc2VzLXN1cHBvcnRgO1xyXG5cdFx0XHRjYXNlIFwiZGVza3RvcC1pbnRlZ3JhdGlvblwiOlxyXG5cdFx0XHRcdHJldHVybiBgJHtiYXNlfS9iYXNlcy1zdXBwb3J0YDtcclxuXHRcdFx0Y2FzZSBcIndvcmtzcGFjZXNcIjpcclxuXHRcdFx0XHRyZXR1cm4gYCR7YmFzZX0vd29ya3NwYWNlc2A7XHJcblx0XHRcdGNhc2UgXCJiZXRhLXRlc3RcIjpcclxuXHRcdFx0XHRyZXR1cm4gYCR7YmFzZX0vZ2V0dGluZy1zdGFydGVkYDtcclxuXHRcdFx0Y2FzZSBcImV4cGVyaW1lbnRhbFwiOlxyXG5cdFx0XHRcdHJldHVybiBgJHtiYXNlfS9nZXR0aW5nLXN0YXJ0ZWRgO1xyXG5cdFx0XHRjYXNlIFwiYWJvdXRcIjpcclxuXHRcdFx0XHRyZXR1cm4gYCR7YmFzZX0vZ2V0dGluZy1zdGFydGVkYDtcclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRyZXR1cm4gYCR7YmFzZX0vZ2V0dGluZy1zdGFydGVkYDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZGlzcGxheUdlbmVyYWxTZXR0aW5ncyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdC8vIE5vdGlmaWNhdGlvbnMgYW5kIERlc2t0b3AgaW50ZWdyYXRpb25cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZGlzcGxheVByb2dyZXNzQmFyU2V0dGluZ3MoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHRyZW5kZXJQcm9ncmVzc1NldHRpbmdzVGFiKHRoaXMsIGNvbnRhaW5lckVsKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZGlzcGxheVRhc2tTdGF0dXNTZXR0aW5ncyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdHJlbmRlclRhc2tTdGF0dXNTZXR0aW5nc1RhYih0aGlzLCBjb250YWluZXJFbCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGRpc3BsYXlEYXRlUHJpb3JpdHlTZXR0aW5ncyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdHJlbmRlckRhdGVQcmlvcml0eVNldHRpbmdzVGFiKHRoaXMsIGNvbnRhaW5lckVsKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZGlzcGxheVRhc2tGaWx0ZXJTZXR0aW5ncyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdHJlbmRlclRhc2tGaWx0ZXJTZXR0aW5nc1RhYih0aGlzLCBjb250YWluZXJFbCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGRpc3BsYXlGaWxlRmlsdGVyU2V0dGluZ3MoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHRyZW5kZXJGaWxlRmlsdGVyU2V0dGluZ3NUYWIodGhpcywgY29udGFpbmVyRWwpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBkaXNwbGF5V29ya2Zsb3dTZXR0aW5ncyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdHJlbmRlcldvcmtmbG93U2V0dGluZ3NUYWIodGhpcywgY29udGFpbmVyRWwpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBkaXNwbGF5UXVpY2tDYXB0dXJlU2V0dGluZ3MoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHRyZW5kZXJRdWlja0NhcHR1cmVTZXR0aW5nc1RhYih0aGlzLCBjb250YWluZXJFbCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGRpc3BsYXlUYXNrVGltZXJTZXR0aW5ncyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdHRoaXMucmVuZGVyVGFza1RpbWVyU2V0dGluZ3NUYWIoY29udGFpbmVyRWwpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBkaXNwbGF5VGltZVBhcnNpbmdTZXR0aW5ncyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdHJlbmRlclRpbWVQYXJzaW5nU2V0dGluZ3NUYWIodGhpcywgY29udGFpbmVyRWwpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBkaXNwbGF5VGltZWxpbmVTaWRlYmFyU2V0dGluZ3MoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHRyZW5kZXJUaW1lbGluZVNpZGViYXJTZXR0aW5nc1RhYih0aGlzLCBjb250YWluZXJFbCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGRpc3BsYXlUYXNrSGFuZGxlclNldHRpbmdzKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xyXG5cdFx0cmVuZGVyVGFza0hhbmRsZXJTZXR0aW5nc1RhYih0aGlzLCBjb250YWluZXJFbCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGRpc3BsYXlWaWV3U2V0dGluZ3MoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHRyZW5kZXJWaWV3U2V0dGluZ3NUYWIodGhpcywgY29udGFpbmVyRWwpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBkaXNwbGF5SW50ZXJmYWNlU2V0dGluZ3MoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHRyZW5kZXJJbnRlcmZhY2VTZXR0aW5nc1RhYih0aGlzLCBjb250YWluZXJFbCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGRpc3BsYXlJbmRleFNldHRpbmdzKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xyXG5cdFx0cmVuZGVySW5kZXhTZXR0aW5nc1RhYih0aGlzLCBjb250YWluZXJFbCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGRpc3BsYXlQcm9qZWN0U2V0dGluZ3MoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHRyZW5kZXJQcm9qZWN0U2V0dGluZ3NUYWIodGhpcywgY29udGFpbmVyRWwpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBkaXNwbGF5SWNzU2V0dGluZ3MoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHRjb25zdCBpY3NTZXR0aW5nc0NvbXBvbmVudCA9IG5ldyBJY3NTZXR0aW5nc0NvbXBvbmVudChcclxuXHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdGNvbnRhaW5lckVsLFxyXG5cdFx0XHQoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5jdXJyZW50VGFiID0gXCJnZW5lcmFsXCI7XHJcblx0XHRcdFx0dGhpcy5kaXNwbGF5KCk7XHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblx0XHRpY3NTZXR0aW5nc0NvbXBvbmVudC5kaXNwbGF5KCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGRpc3BsYXlEZXNrdG9wSW50ZWdyYXRpb25TZXR0aW5ncyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdHJlbmRlckRlc2t0b3BJbnRlZ3JhdGlvblNldHRpbmdzVGFiKHRoaXMsIGNvbnRhaW5lckVsKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZGlzcGxheU1jcFNldHRpbmdzKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xyXG5cdFx0cmVuZGVyTWNwSW50ZWdyYXRpb25TZXR0aW5nc1RhYihjb250YWluZXJFbCwgdGhpcy5wbHVnaW4sICgpID0+XHJcblx0XHRcdHRoaXMuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBkaXNwbGF5QmFzZXNTZXR0aW5ncyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdHJlbmRlckJhc2VzU2V0dGluZ3NUYWIodGhpcywgY29udGFpbmVyRWwpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBkaXNwbGF5QWJvdXRTZXR0aW5ncyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdHJlbmRlckFib3V0U2V0dGluZ3NUYWIodGhpcywgY29udGFpbmVyRWwpO1xyXG5cdH1cclxuXHJcblx0Ly8gU1RBUlQ6IE5ldyBSZXdhcmQgU2V0dGluZ3MgU2VjdGlvblxyXG5cdHByaXZhdGUgZGlzcGxheVJld2FyZFNldHRpbmdzKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xyXG5cdFx0cmVuZGVyUmV3YXJkU2V0dGluZ3NUYWIodGhpcywgY29udGFpbmVyRWwpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBkaXNwbGF5SGFiaXRTZXR0aW5ncyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdHJlbmRlckhhYml0U2V0dGluZ3NUYWIodGhpcywgY29udGFpbmVyRWwpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBkaXNwbGF5QmV0YVRlc3RTZXR0aW5ncyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdHJlbmRlckJldGFUZXN0U2V0dGluZ3NUYWIodGhpcywgY29udGFpbmVyRWwpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBkaXNwbGF5V29ya3NwYWNlc1NldHRpbmdzKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xyXG5cdFx0cmVuZGVyV29ya3NwYWNlU2V0dGluZ3NUYWIodGhpcywgY29udGFpbmVyRWwpO1xyXG5cdH1cclxuXHJcblx0Ly8gcHJpdmF0ZSBkaXNwbGF5RXhwZXJpbWVudGFsU2V0dGluZ3MoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0Ly8gXHR0aGlzLnJlbmRlckV4cGVyaW1lbnRhbFNldHRpbmdzVGFiKGNvbnRhaW5lckVsKTtcclxuXHQvLyB9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyVGFza1RpbWVyU2V0dGluZ3NUYWIoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHRyZW5kZXJUYXNrVGltZXJTZXR0aW5nVGFiKHRoaXMsIGNvbnRhaW5lckVsKTtcclxuXHR9XHJcblxyXG59XHJcbiJdfQ==