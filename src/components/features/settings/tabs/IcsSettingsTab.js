/**
 * ICS Settings Component
 * Provides UI for managing ICS calendar sources
 */
import { __awaiter } from "tslib";
import { Setting, ButtonComponent, Modal, Notice, setIcon, } from "obsidian";
import { t } from "@/translations/helper";
import "@/styles/ics-settings.css";
import { HolidayDetector } from "@/parsers/holiday-detector";
import { WebcalUrlConverter } from "@/parsers/webcal-converter";
export class IcsSettingsComponent {
    constructor(plugin, containerEl, onBack) {
        this.plugin = plugin;
        this.containerEl = containerEl;
        this.config = Object.assign({}, plugin.settings.icsIntegration);
        this.onBack = onBack;
    }
    display() {
        this.containerEl.empty();
        this.containerEl.addClass("ics-settings-container");
        const backheader = this.containerEl.createDiv("settings-tab-section-header");
        // Header with back button
        const headerContainer = this.containerEl.createDiv("ics-header-container");
        if (this.onBack) {
            const button = new ButtonComponent(backheader)
                .setClass("header-button")
                .onClick(() => {
                var _a;
                (_a = this.onBack) === null || _a === void 0 ? void 0 : _a.call(this);
            });
            button.buttonEl.createEl("span", {
                cls: "header-button-icon",
            }, (el) => {
                setIcon(el, "arrow-left");
            });
            button.buttonEl.createEl("span", {
                cls: "header-button-text",
                text: t("Back to main settings"),
            });
        }
        headerContainer.createEl("h2", {
            text: t("ICS Calendar Integration"),
        });
        headerContainer.createEl("p", {
            text: t("Configure external calendar sources to display events in your task views."),
            cls: "ics-description",
        });
        // Global settings
        this.displayGlobalSettings();
        // Sources list
        this.displaySourcesList();
        // Add source button in a styled container
        const addSourceContainer = this.containerEl.createDiv("ics-add-source-container");
        const addButton = addSourceContainer.createEl("button", {
            text: "+ " + t("Add New Calendar Source"),
        });
        addButton.onclick = () => {
            new IcsSourceModal(this.plugin.app, (source) => {
                this.config.sources.push(source);
                this.saveAndRefresh();
            }).open();
        };
    }
    displayGlobalSettings() {
        const globalContainer = this.containerEl.createDiv("ics-global-settings");
        globalContainer.createEl("h3", { text: t("Global Settings") });
        // Enable background refresh
        new Setting(globalContainer)
            .setName(t("Enable Background Refresh"))
            .setDesc(t("Automatically refresh calendar sources in the background"))
            .addToggle((toggle) => {
            toggle
                .setValue(this.config.enableBackgroundRefresh)
                .onChange((value) => {
                this.config.enableBackgroundRefresh = value;
                this.saveSettings();
            });
        });
        // Global refresh interval
        new Setting(globalContainer)
            .setName(t("Global Refresh Interval"))
            .setDesc(t("Default refresh interval for all sources (minutes)"))
            .addText((text) => {
            text.setPlaceholder("60")
                .setValue(this.config.globalRefreshInterval.toString())
                .onChange((value) => {
                const interval = parseInt(value, 10);
                if (!isNaN(interval) && interval > 0) {
                    this.config.globalRefreshInterval = interval;
                    this.saveSettings();
                }
            });
        });
        // Max cache age
        new Setting(globalContainer)
            .setName(t("Maximum Cache Age"))
            .setDesc(t("How long to keep cached data (hours)"))
            .addText((text) => {
            text.setPlaceholder("24")
                .setValue(this.config.maxCacheAge.toString())
                .onChange((value) => {
                const age = parseInt(value, 10);
                if (!isNaN(age) && age > 0) {
                    this.config.maxCacheAge = age;
                    this.saveSettings();
                }
            });
        });
        // Network timeout
        new Setting(globalContainer)
            .setName(t("Network Timeout"))
            .setDesc(t("Request timeout in seconds"))
            .addText((text) => {
            text.setPlaceholder("30")
                .setValue(this.config.networkTimeout.toString())
                .onChange((value) => {
                const timeout = parseInt(value, 10);
                if (!isNaN(timeout) && timeout > 0) {
                    this.config.networkTimeout = timeout;
                    this.saveSettings();
                }
            });
        });
        // Max events per source
        new Setting(globalContainer)
            .setName(t("Max Events Per Source"))
            .setDesc(t("Maximum number of events to load from each source"))
            .addText((text) => {
            text.setPlaceholder("1000")
                .setValue(this.config.maxEventsPerSource.toString())
                .onChange((value) => {
                const max = parseInt(value, 10);
                if (!isNaN(max) && max > 0) {
                    this.config.maxEventsPerSource = max;
                    this.saveSettings();
                }
            });
        });
        // Default event color
        new Setting(globalContainer)
            .setName(t("Default Event Color"))
            .setDesc(t("Default color for events without a specific color"))
            .addColorPicker((color) => {
            color
                .setValue(this.config.defaultEventColor)
                .onChange((value) => {
                this.config.defaultEventColor = value;
                this.saveSettings();
            });
        });
    }
    displaySourcesList() {
        const sourcesContainer = this.containerEl.createDiv("ics-sources-list");
        sourcesContainer.createEl("h3", { text: t("Calendar Sources") });
        if (this.config.sources.length === 0) {
            const emptyState = sourcesContainer.createDiv("ics-empty-state");
            emptyState.createEl("p", {
                text: t("No calendar sources configured. Add a source to get started."),
            });
            return;
        }
        this.config.sources.forEach((source, index) => {
            const sourceContainer = sourcesContainer.createDiv("ics-source-item");
            // Source header
            const sourceHeader = sourceContainer.createDiv("ics-source-header");
            const titleContainer = sourceHeader.createDiv("ics-source-title");
            titleContainer.createEl("strong", { text: source.name });
            const statusEl = sourceHeader.createEl("span", {
                cls: "ics-source-status",
            });
            statusEl.setText(source.enabled ? t("ICS Enabled") : t("ICS Disabled"));
            statusEl.addClass(source.enabled ? "status-enabled" : "status-disabled");
            // Source details
            const sourceDetails = sourceContainer.createDiv("ics-source-details");
            sourceDetails.createEl("div", {
                text: `${t("URL")}: ${this.truncateUrl(source.url)}`,
                title: source.url, // Show full URL on hover
            });
            sourceDetails.createEl("div", {
                text: `${t("Refresh")}: ${source.refreshInterval}${t("min")}`,
            });
            if (source.color) {
                const colorDiv = sourceDetails.createEl("div");
                colorDiv.createSpan({ text: `${t("Color")}: ` });
                colorDiv.createEl("span", {
                    attr: {
                        style: `display: inline-block; width: 12px; height: 12px; background: ${source.color}; border-radius: 2px; margin-left: 4px; vertical-align: middle;`,
                    },
                });
                colorDiv.createSpan({ text: ` ${source.color}` });
            }
            // Source actions - reorganized for better UX
            const sourceActions = sourceContainer.createDiv("ics-source-actions");
            // Primary actions (left side)
            const primaryActions = sourceActions.createDiv("primary-actions");
            // Edit button (most common action)
            const editButton = primaryActions.createEl("button", {
                text: t("Edit"),
                cls: "mod-cta",
                title: t("Edit this calendar source"),
            });
            editButton.onclick = () => {
                new IcsSourceModal(this.plugin.app, (updatedSource) => {
                    this.config.sources[index] = updatedSource;
                    this.saveAndRefresh();
                }, source).open();
            };
            // Sync button
            const syncButton = primaryActions.createEl("button", {
                text: t("Sync"),
                attr: {
                    "aria-label": t("Sync this calendar source now"),
                },
            });
            syncButton.onclick = () => __awaiter(this, void 0, void 0, function* () {
                syncButton.disabled = true;
                syncButton.addClass("syncing");
                syncButton.setText("⟳ " + t("Syncing..."));
                try {
                    const icsManager = this.plugin.getIcsManager();
                    if (icsManager) {
                        const result = yield icsManager.syncSource(source.id);
                        if (result.success) {
                            new Notice(t("Sync completed successfully"));
                            syncButton.removeClass("syncing");
                            syncButton.addClass("success");
                            setTimeout(() => syncButton.removeClass("success"), 2000);
                        }
                        else {
                            new Notice(t("Sync failed: ") + result.error);
                            syncButton.removeClass("syncing");
                            syncButton.addClass("error");
                            setTimeout(() => syncButton.removeClass("error"), 2000);
                        }
                    }
                }
                catch (error) {
                    new Notice(t("Sync failed: ") + error.message);
                    syncButton.removeClass("syncing");
                    syncButton.addClass("error");
                    setTimeout(() => syncButton.removeClass("error"), 2000);
                }
                finally {
                    syncButton.disabled = false;
                    syncButton.setText(t("Sync"));
                }
            });
            // Secondary actions (right side)
            const secondaryActions = sourceActions.createDiv("secondary-actions");
            // Toggle button
            const toggleButton = secondaryActions.createEl("button", {
                text: source.enabled ? t("Disable") : t("Enable"),
                title: source.enabled
                    ? t("Disable this source")
                    : t("Enable this source"),
            });
            toggleButton.onclick = () => {
                this.config.sources[index].enabled =
                    !this.config.sources[index].enabled;
                this.saveAndRefresh();
            };
            // Delete button (destructive action, placed last)
            const deleteButton = secondaryActions.createEl("button", {
                text: t("Delete"),
                cls: "mod-warning",
                title: t("Delete this calendar source"),
            });
            deleteButton.onclick = () => {
                if (confirm(t("Are you sure you want to delete this calendar source?"))) {
                    this.config.sources.splice(index, 1);
                    this.saveAndRefresh();
                }
            };
        });
    }
    truncateUrl(url, maxLength = 50) {
        if (url.length <= maxLength)
            return url;
        return url.substring(0, maxLength - 3) + "...";
    }
    saveSettings() {
        this.plugin.settings.icsIntegration = Object.assign({}, this.config);
        this.plugin.saveSettings();
        // Update ICS manager configuration
        const icsManager = this.plugin.getIcsManager();
        if (icsManager) {
            icsManager.updateConfig(this.config);
        }
    }
    saveAndRefresh() {
        this.saveSettings();
        this.display(); // Refresh the display
    }
}
/**
 * Modal for adding/editing ICS sources
 */
class IcsSourceModal extends Modal {
    constructor(app, onSave, existingSource) {
        super(app);
        this.onSave = onSave;
        this.isEditing = !!existingSource;
        this.modalEl.addClass("ics-source-modal");
        if (existingSource) {
            this.source = Object.assign({}, existingSource);
        }
        else {
            this.source = {
                id: this.generateId(),
                name: "",
                url: "",
                enabled: true,
                refreshInterval: 60,
                showAllDayEvents: true,
                showTimedEvents: true,
                showType: "event",
            };
        }
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h2", {
            text: this.isEditing ? t("Edit ICS Source") : t("Add ICS Source"),
        });
        // Name
        new Setting(contentEl)
            .setName(t("ICS Source Name"))
            .setDesc(t("Display name for this calendar source"))
            .addText((text) => {
            text.setPlaceholder(t("My Calendar"))
                .setValue(this.source.name)
                .onChange((value) => {
                this.source.name = value;
            });
        });
        // URL
        new Setting(contentEl)
            .setName(t("ICS URL"))
            .setDesc(t("URL to the ICS/iCal file (supports http://, https://, and webcal:// protocols)"))
            .addText((text) => {
            text.setPlaceholder("https://example.com/calendar.ics or webcal://example.com/calendar.ics")
                .setValue(this.source.url)
                .onChange((value) => {
                var _a, _b;
                this.source.url = value;
                // Show URL conversion info for webcal URLs
                if (WebcalUrlConverter.isWebcalUrl(value)) {
                    const conversionResult = WebcalUrlConverter.convertWebcalUrl(value);
                    if (conversionResult.success) {
                        const description = WebcalUrlConverter.getConversionDescription(conversionResult);
                        // Find the description element and update it
                        const descEl = (_a = text.inputEl.parentElement) === null || _a === void 0 ? void 0 : _a.querySelector(".setting-item-description");
                        if (descEl) {
                            descEl.textContent = `${t("URL to the ICS/iCal file (supports http://, https://, and webcal:// protocols)")} - ${description}`;
                        }
                    }
                }
                else {
                    // Reset description for non-webcal URLs
                    const descEl = (_b = text.inputEl.parentElement) === null || _b === void 0 ? void 0 : _b.querySelector(".setting-item-description");
                    if (descEl) {
                        descEl.textContent = t("URL to the ICS/iCal file (supports http://, https://, and webcal:// protocols)");
                    }
                }
            });
        });
        // Enabled
        new Setting(contentEl)
            .setName(t("ICS Enabled"))
            .setDesc(t("Whether this source is active"))
            .addToggle((toggle) => {
            toggle.setValue(this.source.enabled).onChange((value) => {
                this.source.enabled = value;
            });
        });
        // Refresh interval
        new Setting(contentEl)
            .setName(t("Refresh Interval"))
            .setDesc(t("How often to refresh this source (minutes)"))
            .addText((text) => {
            text.setPlaceholder("60")
                .setValue(this.source.refreshInterval.toString())
                .onChange((value) => {
                const interval = parseInt(value, 10);
                if (!isNaN(interval) && interval > 0) {
                    this.source.refreshInterval = interval;
                }
            });
        });
        // Color
        new Setting(contentEl)
            .setName(t("Color"))
            .setDesc(t("Color for events from this source (optional)"))
            .addText((text) => {
            text.setPlaceholder("#3b82f6")
                .setValue(this.source.color || "")
                .onChange((value) => {
                if (!value || value.match(/^#[0-9a-fA-F]{6}$/)) {
                    this.source.color = value || undefined;
                }
            });
        });
        // Show type
        new Setting(contentEl)
            .setName(t("Show Type"))
            .setDesc(t("How to display events from this source in calendar views"))
            .addDropdown((dropdown) => {
            dropdown
                .addOption("event", t("Event"))
                .addOption("badge", t("Badge"))
                .setValue(this.source.showType)
                .onChange((value) => {
                this.source.showType = value;
            });
        });
        // Show all-day events
        new Setting(contentEl)
            .setName(t("Show All-Day Events"))
            .setDesc(t("Include all-day events from this source"))
            .addToggle((toggle) => {
            toggle
                .setValue(this.source.showAllDayEvents)
                .onChange((value) => {
                this.source.showAllDayEvents = value;
            });
        });
        // Show timed events
        new Setting(contentEl)
            .setName(t("Show Timed Events"))
            .setDesc(t("Include timed events from this source"))
            .addToggle((toggle) => {
            toggle
                .setValue(this.source.showTimedEvents)
                .onChange((value) => {
                this.source.showTimedEvents = value;
            });
        });
        // Text Replacements section
        this.displayTextReplacements(contentEl);
        // Holiday Configuration section
        this.displayHolidayConfiguration(contentEl);
        // Status Mapping Configuration section
        this.displayStatusMappingConfiguration(contentEl);
        // Authentication section
        const authContainer = contentEl.createDiv();
        authContainer.createEl("h3", { text: t("Authentication (Optional)") });
        // Auth type
        new Setting(authContainer)
            .setName(t("Authentication Type"))
            .setDesc(t("Type of authentication required"))
            .addDropdown((dropdown) => {
            var _a;
            dropdown
                .addOption("none", t("ICS Auth None"))
                .addOption("basic", t("Basic Auth"))
                .addOption("bearer", t("Bearer Token"))
                .addOption("custom", t("Custom Headers"))
                .setValue(((_a = this.source.auth) === null || _a === void 0 ? void 0 : _a.type) || "none")
                .onChange((value) => {
                if (value === "none") {
                    this.source.auth = undefined;
                }
                else {
                    this.source.auth = Object.assign({ type: value }, this.source.auth);
                }
                this.refreshAuthFields(authContainer);
            });
        });
        this.refreshAuthFields(authContainer);
        // Buttons
        const buttonContainer = contentEl.createDiv("modal-button-container");
        const saveButton = buttonContainer.createEl("button", {
            text: t("Save"),
            cls: "mod-cta",
        });
        saveButton.onclick = () => {
            if (this.validateSource()) {
                this.onSave(this.source);
                this.close();
            }
        };
        const cancelButton = buttonContainer.createEl("button", {
            text: t("Cancel"),
        });
        cancelButton.onclick = () => {
            this.close();
        };
    }
    displayTextReplacements(contentEl) {
        const textReplacementsContainer = contentEl.createDiv();
        textReplacementsContainer.createEl("h3", {
            text: t("Text Replacements"),
        });
        textReplacementsContainer.createEl("p", {
            text: t("Configure rules to modify event text using regular expressions"),
            cls: "setting-item-description",
        });
        // Initialize textReplacements if not exists
        if (!this.source.textReplacements) {
            this.source.textReplacements = [];
        }
        // Container for replacement rules
        const rulesContainer = textReplacementsContainer.createDiv("text-replacements-list");
        const refreshRulesList = () => {
            rulesContainer.empty();
            if (this.source.textReplacements.length === 0) {
                const emptyState = rulesContainer.createDiv("text-replacements-empty");
                emptyState.createEl("p", {
                    text: t("No text replacement rules configured"),
                    cls: "setting-item-description",
                });
            }
            else {
                this.source.textReplacements.forEach((rule, index) => {
                    const ruleContainer = rulesContainer.createDiv("text-replacement-rule");
                    // Rule header
                    const ruleHeader = ruleContainer.createDiv("text-replacement-header");
                    const titleEl = ruleHeader.createEl("strong", {
                        text: rule.name || `Rule ${index + 1}`,
                    });
                    const statusEl = ruleHeader.createEl("span", {
                        cls: `text-replacement-status ${rule.enabled ? "enabled" : "disabled"}`,
                        text: rule.enabled ? t("Enabled") : t("Disabled"),
                    });
                    // Rule details
                    const ruleDetails = ruleContainer.createDiv("text-replacement-details");
                    ruleDetails.createEl("div", {
                        text: `${t("Target")}: ${rule.target}`,
                    });
                    ruleDetails.createEl("div", {
                        text: `${t("Pattern")}: ${rule.pattern}`,
                        cls: "text-replacement-pattern",
                    });
                    ruleDetails.createEl("div", {
                        text: `${t("Replacement")}: ${rule.replacement}`,
                        cls: "text-replacement-replacement",
                    });
                    // Rule actions
                    const ruleActions = ruleContainer.createDiv("text-replacement-actions");
                    const editButton = ruleActions.createEl("button", {
                        text: t("Edit"),
                        cls: "mod-cta",
                    });
                    editButton.onclick = () => {
                        new TextReplacementModal(this.app, (updatedRule) => {
                            this.source.textReplacements[index] =
                                updatedRule;
                            refreshRulesList();
                        }, rule).open();
                    };
                    const toggleButton = ruleActions.createEl("button", {
                        text: rule.enabled ? t("Disable") : t("Enable"),
                    });
                    toggleButton.onclick = () => {
                        this.source.textReplacements[index].enabled =
                            !rule.enabled;
                        refreshRulesList();
                    };
                    const deleteButton = ruleActions.createEl("button", {
                        text: t("Delete"),
                        cls: "mod-warning",
                    });
                    deleteButton.onclick = () => {
                        if (confirm(t("Are you sure you want to delete this text replacement rule?"))) {
                            this.source.textReplacements.splice(index, 1);
                            refreshRulesList();
                        }
                    };
                });
            }
        };
        refreshRulesList();
        // Add rule button
        const addRuleContainer = textReplacementsContainer.createDiv("text-replacement-add");
        const addButton = addRuleContainer.createEl("button", {
            text: "+ " + t("Add Text Replacement Rule"),
        });
        addButton.onclick = () => {
            new TextReplacementModal(this.app, (newRule) => {
                this.source.textReplacements.push(newRule);
                refreshRulesList();
            }).open();
        };
    }
    refreshAuthFields(container) {
        // Remove existing auth fields
        const existingFields = container.querySelectorAll(".auth-field");
        existingFields.forEach((field) => field.remove());
        if (!this.source.auth || this.source.auth.type === "none") {
            return;
        }
        switch (this.source.auth.type) {
            case "basic":
                new Setting(container)
                    .setName(t("ICS Username"))
                    .setClass("auth-field")
                    .addText((text) => {
                    var _a;
                    text.setValue(((_a = this.source.auth) === null || _a === void 0 ? void 0 : _a.username) || "").onChange((value) => {
                        if (this.source.auth) {
                            this.source.auth.username = value;
                        }
                    });
                });
                new Setting(container)
                    .setName(t("ICS Password"))
                    .setClass("auth-field")
                    .addText((text) => {
                    var _a;
                    text.setValue(((_a = this.source.auth) === null || _a === void 0 ? void 0 : _a.password) || "").onChange((value) => {
                        if (this.source.auth) {
                            this.source.auth.password = value;
                        }
                    });
                    text.inputEl.type = "password";
                });
                break;
            case "bearer":
                new Setting(container)
                    .setName(t("ICS Bearer Token"))
                    .setClass("auth-field")
                    .addText((text) => {
                    var _a;
                    text.setValue(((_a = this.source.auth) === null || _a === void 0 ? void 0 : _a.token) || "").onChange((value) => {
                        if (this.source.auth) {
                            this.source.auth.token = value;
                        }
                    });
                });
                break;
            case "custom":
                new Setting(container)
                    .setName(t("Custom Headers"))
                    .setDesc(t("JSON object with custom headers"))
                    .setClass("auth-field")
                    .addTextArea((text) => {
                    var _a;
                    text.setValue(JSON.stringify(((_a = this.source.auth) === null || _a === void 0 ? void 0 : _a.headers) || {}, null, 2)).onChange((value) => {
                        try {
                            const headers = JSON.parse(value);
                            if (this.source.auth) {
                                this.source.auth.headers = headers;
                            }
                        }
                        catch (_a) {
                            // Invalid JSON, ignore
                        }
                    });
                });
                break;
        }
    }
    displayHolidayConfiguration(contentEl) {
        const holidayContainer = contentEl.createDiv();
        holidayContainer.createEl("h3", { text: t("Holiday Configuration") });
        holidayContainer.createEl("p", {
            text: t("Configure how holiday events are detected and displayed"),
            cls: "setting-item-description",
        });
        // Initialize holiday config if not exists
        if (!this.source.holidayConfig) {
            this.source.holidayConfig = HolidayDetector.getDefaultConfig();
        }
        // Enable holiday detection
        new Setting(holidayContainer)
            .setName(t("Enable Holiday Detection"))
            .setDesc(t("Automatically detect and group holiday events"))
            .addToggle((toggle) => {
            toggle
                .setValue(this.source.holidayConfig.enabled)
                .onChange((value) => {
                this.source.holidayConfig.enabled = value;
                this.refreshHolidaySettings(holidayContainer);
            });
        });
        this.refreshHolidaySettings(holidayContainer);
    }
    displayStatusMappingConfiguration(contentEl) {
        const statusContainer = contentEl.createDiv();
        statusContainer.createEl("h3", { text: t("Status Mapping") });
        statusContainer.createEl("p", {
            text: t("Configure how ICS events are mapped to task statuses"),
            cls: "setting-item-description",
        });
        // Initialize status mapping if not exists
        if (!this.source.statusMapping) {
            this.source.statusMapping = {
                enabled: false,
                timingRules: {
                    pastEvents: "x",
                    currentEvents: "/",
                    futureEvents: " ",
                },
                overrideIcsStatus: true,
            };
        }
        // Enable status mapping
        new Setting(statusContainer)
            .setName(t("Enable Status Mapping"))
            .setDesc(t("Automatically map ICS events to specific task statuses"))
            .addToggle((toggle) => {
            toggle
                .setValue(this.source.statusMapping.enabled)
                .onChange((value) => {
                this.source.statusMapping.enabled = value;
                this.refreshStatusMappingSettings(statusContainer);
            });
        });
        this.refreshStatusMappingSettings(statusContainer);
    }
    refreshHolidaySettings(container) {
        var _a;
        // Remove existing holiday settings
        const existingSettings = container.querySelectorAll(".holiday-setting");
        existingSettings.forEach((setting) => setting.remove());
        if (!((_a = this.source.holidayConfig) === null || _a === void 0 ? void 0 : _a.enabled)) {
            return;
        }
        // Grouping strategy
        new Setting(container)
            .setName(t("Grouping Strategy"))
            .setDesc(t("How to handle consecutive holiday events"))
            .setClass("holiday-setting")
            .addDropdown((dropdown) => {
            dropdown
                .addOption("none", t("Show All Events"))
                .addOption("first-only", t("Show First Day Only"))
                .addOption("summary", t("Show Summary"))
                .addOption("range", t("Show First and Last"))
                .setValue(this.source.holidayConfig.groupingStrategy)
                .onChange((value) => {
                this.source.holidayConfig.groupingStrategy =
                    value;
            });
        });
        // Max gap days
        new Setting(container)
            .setName(t("Maximum Gap Days"))
            .setDesc(t("Maximum days between events to consider them consecutive"))
            .setClass("holiday-setting")
            .addText((text) => {
            text.setPlaceholder("1")
                .setValue(this.source.holidayConfig.maxGapDays.toString())
                .onChange((value) => {
                const gap = parseInt(value, 10);
                if (!isNaN(gap) && gap >= 0) {
                    this.source.holidayConfig.maxGapDays = gap;
                }
            });
        });
        // Show in forecast
        new Setting(container)
            .setName(t("Show in Forecast"))
            .setDesc(t("Whether to show holiday events in forecast view"))
            .setClass("holiday-setting")
            .addToggle((toggle) => {
            toggle
                .setValue(this.source.holidayConfig.showInForecast)
                .onChange((value) => {
                this.source.holidayConfig.showInForecast = value;
            });
        });
        // Show in calendar
        new Setting(container)
            .setName(t("Show in Calendar"))
            .setDesc(t("Whether to show holiday events in calendar view"))
            .setClass("holiday-setting")
            .addToggle((toggle) => {
            toggle
                .setValue(this.source.holidayConfig.showInCalendar)
                .onChange((value) => {
                this.source.holidayConfig.showInCalendar = value;
            });
        });
        // Detection patterns
        const patternsContainer = container.createDiv("holiday-setting");
        patternsContainer.createEl("h4", { text: t("Detection Patterns") });
        // Summary patterns
        new Setting(patternsContainer)
            .setName(t("Summary Patterns"))
            .setDesc(t("Regex patterns to match in event titles (one per line)"))
            .addTextArea((text) => {
            text.setValue((this.source.holidayConfig.detectionPatterns.summary ||
                []).join("\n")).onChange((value) => {
                this.source.holidayConfig.detectionPatterns.summary = value
                    .split("\n")
                    .map((line) => line.trim())
                    .filter((line) => line.length > 0);
            });
        });
        // Keywords
        new Setting(patternsContainer)
            .setName(t("Keywords"))
            .setDesc(t("Keywords to detect in event text (one per line)"))
            .addTextArea((text) => {
            text.setValue((this.source.holidayConfig.detectionPatterns.keywords ||
                []).join("\n")).onChange((value) => {
                this.source.holidayConfig.detectionPatterns.keywords =
                    value
                        .split("\n")
                        .map((line) => line.trim())
                        .filter((line) => line.length > 0);
            });
        });
        // Categories
        new Setting(patternsContainer)
            .setName(t("Categories"))
            .setDesc(t("Event categories that indicate holidays (one per line)"))
            .addTextArea((text) => {
            text.setValue((this.source.holidayConfig.detectionPatterns
                .categories || []).join("\n")).onChange((value) => {
                this.source.holidayConfig.detectionPatterns.categories =
                    value
                        .split("\n")
                        .map((line) => line.trim())
                        .filter((line) => line.length > 0);
            });
        });
        // Group display format
        new Setting(container)
            .setName(t("Group Display Format"))
            .setDesc(t("Format for grouped holiday display. Use {title}, {count}, {startDate}, {endDate}"))
            .setClass("holiday-setting")
            .addText((text) => {
            text.setPlaceholder("{title} ({count} days)")
                .setValue(this.source.holidayConfig.groupDisplayFormat || "")
                .onChange((value) => {
                this.source.holidayConfig.groupDisplayFormat =
                    value || undefined;
            });
        });
    }
    refreshStatusMappingSettings(container) {
        var _a;
        // Remove existing status mapping settings
        const existingSettings = container.querySelectorAll(".status-mapping-setting");
        existingSettings.forEach((setting) => setting.remove());
        if (!((_a = this.source.statusMapping) === null || _a === void 0 ? void 0 : _a.enabled)) {
            return;
        }
        // Override ICS status
        new Setting(container)
            .setName(t("Override ICS Status"))
            .setDesc(t("Override original ICS event status with mapped status"))
            .setClass("status-mapping-setting")
            .addToggle((toggle) => {
            toggle
                .setValue(this.source.statusMapping.overrideIcsStatus)
                .onChange((value) => {
                this.source.statusMapping.overrideIcsStatus = value;
            });
        });
        // Timing rules section
        const timingContainer = container.createDiv("status-mapping-setting");
        timingContainer.createEl("h4", { text: t("Timing Rules") });
        // Past events status
        new Setting(timingContainer)
            .setName(t("Past Events Status"))
            .setDesc(t("Status for events that have already ended"))
            .addDropdown((dropdown) => {
            dropdown
                .addOption(" ", t("Status Incomplete"))
                .addOption("x", t("Status Complete"))
                .addOption("-", t("Status Cancelled"))
                .addOption("/", t("Status In Progress"))
                .addOption("?", t("Status Question"))
                .setValue(this.source.statusMapping.timingRules.pastEvents)
                .onChange((value) => {
                this.source.statusMapping.timingRules.pastEvents =
                    value;
            });
        });
        // Current events status
        new Setting(timingContainer)
            .setName(t("Current Events Status"))
            .setDesc(t("Status for events happening today"))
            .addDropdown((dropdown) => {
            dropdown
                .addOption(" ", t("Status Incomplete"))
                .addOption("x", t("Status Complete"))
                .addOption("-", t("Status Cancelled"))
                .addOption("/", t("Status In Progress"))
                .addOption("?", t("Status Question"))
                .setValue(this.source.statusMapping.timingRules.currentEvents)
                .onChange((value) => {
                this.source.statusMapping.timingRules.currentEvents =
                    value;
            });
        });
        // Future events status
        new Setting(timingContainer)
            .setName(t("Future Events Status"))
            .setDesc(t("Status for events in the future"))
            .addDropdown((dropdown) => {
            dropdown
                .addOption(" ", t("Status Incomplete"))
                .addOption("x", t("Status Complete"))
                .addOption("-", t("Status Cancelled"))
                .addOption("/", t("Status In Progress"))
                .addOption("?", t("Status Question"))
                .setValue(this.source.statusMapping.timingRules.futureEvents)
                .onChange((value) => {
                this.source.statusMapping.timingRules.futureEvents =
                    value;
            });
        });
        // Property rules section
        const propertyContainer = container.createDiv("status-mapping-setting");
        propertyContainer.createEl("h4", { text: t("Property Rules") });
        propertyContainer.createEl("p", {
            text: t("Optional rules based on event properties (higher priority than timing rules)"),
            cls: "setting-item-description",
        });
        // Initialize property rules if not exists
        if (!this.source.statusMapping.propertyRules) {
            this.source.statusMapping.propertyRules = {};
        }
        // Holiday mapping
        new Setting(propertyContainer)
            .setName(t("Holiday Status"))
            .setDesc(t("Status for events detected as holidays"))
            .addDropdown((dropdown) => {
            var _a;
            dropdown
                .addOption("", t("Use timing rules"))
                .addOption(" ", t("Status Incomplete"))
                .addOption("x", t("Status Complete"))
                .addOption("-", t("Status Cancelled"))
                .addOption("/", t("Status In Progress"))
                .addOption("?", t("Status Question"))
                .setValue(((_a = this.source.statusMapping.propertyRules.holidayMapping) === null || _a === void 0 ? void 0 : _a.holidayStatus) || "")
                .onChange((value) => {
                if (!this.source.statusMapping.propertyRules
                    .holidayMapping) {
                    this.source.statusMapping.propertyRules.holidayMapping =
                        {
                            holidayStatus: "-",
                        };
                }
                if (value) {
                    this.source.statusMapping.propertyRules.holidayMapping.holidayStatus =
                        value;
                }
                else {
                    delete this.source.statusMapping.propertyRules
                        .holidayMapping;
                }
            });
        });
        // Category mapping
        new Setting(propertyContainer)
            .setName(t("Category Mapping"))
            .setDesc(t("Map specific categories to statuses (format: category:status, one per line)"))
            .addTextArea((text) => {
            const categoryMapping = this.source.statusMapping.propertyRules.categoryMapping ||
                {};
            const mappingText = Object.entries(categoryMapping)
                .map(([category, status]) => `${category}:${status}`)
                .join("\n");
            text.setValue(mappingText).onChange((value) => {
                const mapping = {};
                const lines = value
                    .split("\n")
                    .filter((line) => line.trim());
                for (const line of lines) {
                    const [category, status] = line
                        .split(":")
                        .map((s) => s.trim());
                    if (category && status) {
                        mapping[category] = status;
                    }
                }
                if (Object.keys(mapping).length > 0) {
                    this.source.statusMapping.propertyRules.categoryMapping =
                        mapping;
                }
                else {
                    delete this.source.statusMapping.propertyRules
                        .categoryMapping;
                }
            });
        });
    }
    validateSource() {
        if (!this.source.name.trim()) {
            new Notice(t("Please enter a name for the source"));
            return false;
        }
        if (!this.source.url.trim()) {
            new Notice(t("Please enter a URL for the source"));
            return false;
        }
        // Use WebcalUrlConverter for URL validation
        const conversionResult = WebcalUrlConverter.convertWebcalUrl(this.source.url);
        if (!conversionResult.success) {
            new Notice(t("Please enter a valid URL") + ": " + conversionResult.error);
            return false;
        }
        return true;
    }
    generateId() {
        return `ics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
/**
 * Modal for adding/editing text replacement rules
 */
class TextReplacementModal extends Modal {
    constructor(app, onSave, existingRule) {
        super(app);
        this.onSave = onSave;
        this.isEditing = !!existingRule;
        this.modalEl.addClass("ics-text-replacement-modal");
        if (existingRule) {
            this.rule = Object.assign({}, existingRule);
        }
        else {
            this.rule = {
                id: this.generateId(),
                name: "",
                enabled: true,
                target: "summary",
                pattern: "",
                replacement: "",
                flags: "g",
            };
        }
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h2", {
            text: this.isEditing
                ? t("Edit Text Replacement Rule")
                : t("Add Text Replacement Rule"),
        });
        // Rule name
        new Setting(contentEl)
            .setName(t("Rule Name"))
            .setDesc(t("Descriptive name for this replacement rule"))
            .addText((text) => {
            text.setPlaceholder(t("Remove Meeting Prefix"))
                .setValue(this.rule.name)
                .onChange((value) => {
                this.rule.name = value;
            });
        });
        // Enabled
        new Setting(contentEl)
            .setName(t("Enabled"))
            .setDesc(t("Whether this rule is active"))
            .addToggle((toggle) => {
            toggle.setValue(this.rule.enabled).onChange((value) => {
                this.rule.enabled = value;
            });
        });
        // Target field
        new Setting(contentEl)
            .setName(t("Target Field"))
            .setDesc(t("Which field to apply the replacement to"))
            .addDropdown((dropdown) => {
            dropdown
                .addOption("summary", t("Summary/Title"))
                .addOption("description", t("Description"))
                .addOption("location", t("Location"))
                .addOption("all", t("All Fields"))
                .setValue(this.rule.target)
                .onChange((value) => {
                this.rule.target = value;
            });
        });
        // Store references to update test output
        let testInput;
        let testOutput;
        // Define the update function
        const updateTestOutput = (input) => {
            if (!testOutput)
                return;
            try {
                if (this.rule.pattern && input) {
                    const regex = new RegExp(this.rule.pattern, this.rule.flags || "g");
                    const result = input.replace(regex, this.rule.replacement);
                    const resultSpan = testOutput.querySelector(".test-result");
                    if (resultSpan) {
                        resultSpan.textContent = result;
                        resultSpan.style.color =
                            result !== input ? "#4caf50" : "#666";
                    }
                }
                else {
                    const resultSpan = testOutput.querySelector(".test-result");
                    if (resultSpan) {
                        resultSpan.textContent = input || "";
                        resultSpan.style.color = "#666";
                    }
                }
            }
            catch (error) {
                const resultSpan = testOutput.querySelector(".test-result");
                if (resultSpan) {
                    resultSpan.textContent = "Invalid regex pattern";
                    resultSpan.style.color = "#f44336";
                }
            }
        };
        // Pattern
        new Setting(contentEl)
            .setName(t("Pattern (Regular Expression)"))
            .setDesc(t("Regular expression pattern to match. Use parentheses for capture groups."))
            .addText((text) => {
            text.setPlaceholder("^Meeting: ")
                .setValue(this.rule.pattern)
                .onChange((value) => {
                this.rule.pattern = value;
                if (testInput && testInput.getValue()) {
                    updateTestOutput(testInput.getValue());
                }
            });
        });
        // Replacement
        new Setting(contentEl)
            .setName(t("Replacement"))
            .setDesc(t("Text to replace matches with. Use $1, $2, etc. for capture groups."))
            .addText((text) => {
            text.setPlaceholder("")
                .setValue(this.rule.replacement)
                .onChange((value) => {
                this.rule.replacement = value;
                if (testInput && testInput.getValue()) {
                    updateTestOutput(testInput.getValue());
                }
            });
        });
        // Flags
        new Setting(contentEl)
            .setName(t("Regex Flags"))
            .setDesc(t("Regular expression flags (e.g., 'g' for global, 'i' for case-insensitive)"))
            .addText((text) => {
            text.setPlaceholder("g")
                .setValue(this.rule.flags || "")
                .onChange((value) => {
                this.rule.flags = value;
                if (testInput && testInput.getValue()) {
                    updateTestOutput(testInput.getValue());
                }
            });
        });
        // Examples section
        const examplesContainer = contentEl.createDiv();
        examplesContainer.createEl("h3", { text: t("Examples") });
        const examplesList = examplesContainer.createEl("ul");
        // Remove prefix example
        const example1 = examplesList.createEl("li");
        example1.createEl("strong", { text: t("Remove prefix") + ": " });
        example1.createSpan({ text: "Pattern: " });
        example1.createEl("code", { text: "^Meeting: " });
        example1.createSpan({ text: ", Replacement: " });
        example1.createEl("code", { text: "" });
        // Replace room numbers example
        const example2 = examplesList.createEl("li");
        example2.createEl("strong", { text: t("Replace room numbers") + ": " });
        example2.createSpan({ text: "Pattern: " });
        example2.createEl("code", { text: "Room (\\d+)" });
        example2.createSpan({ text: ", Replacement: " });
        example2.createEl("code", { text: "Conference Room $1" });
        // Swap words example
        const example3 = examplesList.createEl("li");
        example3.createEl("strong", { text: t("Swap words") + ": " });
        example3.createSpan({ text: "Pattern: " });
        example3.createEl("code", { text: "(\\w+) with (\\w+)" });
        example3.createSpan({ text: ", Replacement: " });
        example3.createEl("code", { text: "$2 and $1" });
        // Test section
        const testContainer = contentEl.createDiv();
        testContainer.createEl("h3", { text: t("Test Rule") });
        // Create test output first
        testOutput = testContainer.createDiv("test-output");
        testOutput.createEl("strong", { text: t("Output: ") });
        const outputText = testOutput.createEl("span", { cls: "test-result" });
        // Create test input
        new Setting(testContainer)
            .setName(t("Test Input"))
            .setDesc(t("Enter text to test the replacement rule"))
            .addText((text) => {
            testInput = text;
            text.setPlaceholder("Meeting: Weekly Standup").onChange((value) => {
                updateTestOutput(value);
            });
        });
        // Buttons
        const buttonContainer = contentEl.createDiv("modal-button-container");
        const saveButton = buttonContainer.createEl("button", {
            text: t("Save"),
            cls: "mod-cta",
        });
        saveButton.onclick = () => {
            if (this.validateRule()) {
                this.onSave(this.rule);
                this.close();
            }
        };
        const cancelButton = buttonContainer.createEl("button", {
            text: t("Cancel"),
        });
        cancelButton.onclick = () => {
            this.close();
        };
    }
    validateRule() {
        if (!this.rule.name.trim()) {
            new Notice(t("Please enter a name for the rule"));
            return false;
        }
        if (!this.rule.pattern.trim()) {
            new Notice(t("Please enter a pattern"));
            return false;
        }
        // Test if the regex pattern is valid
        try {
            new RegExp(this.rule.pattern, this.rule.flags || "g");
        }
        catch (error) {
            new Notice(t("Invalid regular expression pattern"));
            return false;
        }
        return true;
    }
    generateId() {
        return `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSWNzU2V0dGluZ3NUYWIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJJY3NTZXR0aW5nc1RhYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0dBR0c7O0FBRUgsT0FBTyxFQUNOLE9BQU8sRUFJUCxlQUFlLEVBQ2YsS0FBSyxFQUVMLE1BQU0sRUFDTixPQUFPLEdBQ1AsTUFBTSxVQUFVLENBQUM7QUFPbEIsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRTFDLE9BQU8sMkJBQTJCLENBQUM7QUFDbkMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzdELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBRWhFLE1BQU0sT0FBTyxvQkFBb0I7SUFNaEMsWUFDQyxNQUE2QixFQUM3QixXQUF3QixFQUN4QixNQUFtQjtRQUVuQixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztRQUMvQixJQUFJLENBQUMsTUFBTSxxQkFBUSxNQUFNLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBRSxDQUFDO1FBQ3BELElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN6QixJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBRXBELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUM1Qyw2QkFBNkIsQ0FDN0IsQ0FBQztRQUNGLDBCQUEwQjtRQUMxQixNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FDakQsc0JBQXNCLENBQ3RCLENBQUM7UUFFRixJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDaEIsTUFBTSxN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LENBQUM7SUFDYixDQUFDO0lBRU8sVUFBVTtRQUNqQixPQUFPLFFBQVEsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQ3hFLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBJQ1MgU2V0dGluZ3MgQ29tcG9uZW50XHJcbiAqIFByb3ZpZGVzIFVJIGZvciBtYW5hZ2luZyBJQ1MgY2FsZW5kYXIgc291cmNlc1xyXG4gKi9cclxuXHJcbmltcG9ydCB7XHJcblx0U2V0dGluZyxcclxuXHREcm9wZG93bkNvbXBvbmVudCxcclxuXHRUZXh0Q29tcG9uZW50LFxyXG5cdFRvZ2dsZUNvbXBvbmVudCxcclxuXHRCdXR0b25Db21wb25lbnQsXHJcblx0TW9kYWwsXHJcblx0QXBwLFxyXG5cdE5vdGljZSxcclxuXHRzZXRJY29uLFxyXG59IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQge1xyXG5cdEljc1NvdXJjZSxcclxuXHRJY3NNYW5hZ2VyQ29uZmlnLFxyXG5cdEljc1RleHRSZXBsYWNlbWVudCxcclxuXHRJY3NIb2xpZGF5Q29uZmlnLFxyXG59IGZyb20gXCJAL3R5cGVzL2ljc1wiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCBcIkAvc3R5bGVzL2ljcy1zZXR0aW5ncy5jc3NcIjtcclxuaW1wb3J0IHsgSG9saWRheURldGVjdG9yIH0gZnJvbSBcIkAvcGFyc2Vycy9ob2xpZGF5LWRldGVjdG9yXCI7XHJcbmltcG9ydCB7IFdlYmNhbFVybENvbnZlcnRlciB9IGZyb20gXCJAL3BhcnNlcnMvd2ViY2FsLWNvbnZlcnRlclwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEljc1NldHRpbmdzQ29tcG9uZW50IHtcclxuXHRwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luO1xyXG5cdHByaXZhdGUgY29udGFpbmVyRWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgY29uZmlnOiBJY3NNYW5hZ2VyQ29uZmlnO1xyXG5cdHByaXZhdGUgb25CYWNrPzogKCkgPT4gdm9pZDtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCxcclxuXHRcdG9uQmFjaz86ICgpID0+IHZvaWRcclxuXHQpIHtcclxuXHRcdHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG5cdFx0dGhpcy5jb250YWluZXJFbCA9IGNvbnRhaW5lckVsO1xyXG5cdFx0dGhpcy5jb25maWcgPSB7IC4uLnBsdWdpbi5zZXR0aW5ncy5pY3NJbnRlZ3JhdGlvbiB9O1xyXG5cdFx0dGhpcy5vbkJhY2sgPSBvbkJhY2s7XHJcblx0fVxyXG5cclxuXHRkaXNwbGF5KCk6IHZvaWQge1xyXG5cdFx0dGhpcy5jb250YWluZXJFbC5lbXB0eSgpO1xyXG5cdFx0dGhpcy5jb250YWluZXJFbC5hZGRDbGFzcyhcImljcy1zZXR0aW5ncy1jb250YWluZXJcIik7XHJcblxyXG5cdFx0Y29uc3QgYmFja2hlYWRlciA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KFxyXG5cdFx0XHRcInNldHRpbmdzLXRhYi1zZWN0aW9uLWhlYWRlclwiXHJcblx0XHQpO1xyXG5cdFx0Ly8gSGVhZGVyIHdpdGggYmFjayBidXR0b25cclxuXHRcdGNvbnN0IGhlYWRlckNvbnRhaW5lciA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KFxyXG5cdFx0XHRcImljcy1oZWFkZXItY29udGFpbmVyXCJcclxuXHRcdCk7XHJcblxyXG5cdFx0aWYgKHRoaXMub25CYWNrKSB7XHJcblx0XHRcdGNvbnN0IGJ1dHRvbiA9IG5ldyBCdXR0b25Db21wb25lbnQoYmFja2hlYWRlcilcclxuXHRcdFx0XHQuc2V0Q2xhc3MoXCJoZWFkZXItYnV0dG9uXCIpXHJcblx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5vbkJhY2s/LigpO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0YnV0dG9uLmJ1dHRvbkVsLmNyZWF0ZUVsKFxyXG5cdFx0XHRcdFwic3BhblwiLFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGNsczogXCJoZWFkZXItYnV0dG9uLWljb25cIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdChlbCkgPT4ge1xyXG5cdFx0XHRcdFx0c2V0SWNvbihlbCwgXCJhcnJvdy1sZWZ0XCIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0KTtcclxuXHRcdFx0YnV0dG9uLmJ1dHRvbkVsLmNyZWF0ZUVsKFwic3BhblwiLCB7XHJcblx0XHRcdFx0Y2xzOiBcImhlYWRlci1idXR0b24tdGV4dFwiLFxyXG5cdFx0XHRcdHRleHQ6IHQoXCJCYWNrIHRvIG1haW4gc2V0dGluZ3NcIiksXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdGhlYWRlckNvbnRhaW5lci5jcmVhdGVFbChcImgyXCIsIHtcclxuXHRcdFx0dGV4dDogdChcIklDUyBDYWxlbmRhciBJbnRlZ3JhdGlvblwiKSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGhlYWRlckNvbnRhaW5lci5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFxyXG5cdFx0XHRcdFwiQ29uZmlndXJlIGV4dGVybmFsIGNhbGVuZGFyIHNvdXJjZXMgdG8gZGlzcGxheSBldmVudHMgaW4geW91ciB0YXNrIHZpZXdzLlwiXHJcblx0XHRcdCksXHJcblx0XHRcdGNsczogXCJpY3MtZGVzY3JpcHRpb25cIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEdsb2JhbCBzZXR0aW5nc1xyXG5cdFx0dGhpcy5kaXNwbGF5R2xvYmFsU2V0dGluZ3MoKTtcclxuXHJcblx0XHQvLyBTb3VyY2VzIGxpc3RcclxuXHRcdHRoaXMuZGlzcGxheVNvdXJjZXNMaXN0KCk7XHJcblxyXG5cdFx0Ly8gQWRkIHNvdXJjZSBidXR0b24gaW4gYSBzdHlsZWQgY29udGFpbmVyXHJcblx0XHRjb25zdCBhZGRTb3VyY2VDb250YWluZXIgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdihcclxuXHRcdFx0XCJpY3MtYWRkLXNvdXJjZS1jb250YWluZXJcIlxyXG5cdFx0KTtcclxuXHRcdGNvbnN0IGFkZEJ1dHRvbiA9IGFkZFNvdXJjZUNvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdHRleHQ6IFwiKyBcIiArIHQoXCJBZGQgTmV3IENhbGVuZGFyIFNvdXJjZVwiKSxcclxuXHRcdH0pO1xyXG5cdFx0YWRkQnV0dG9uLm9uY2xpY2sgPSAoKSA9PiB7XHJcblx0XHRcdG5ldyBJY3NTb3VyY2VNb2RhbCh0aGlzLnBsdWdpbi5hcHAsIChzb3VyY2UpID0+IHtcclxuXHRcdFx0XHR0aGlzLmNvbmZpZy5zb3VyY2VzLnB1c2goc291cmNlKTtcclxuXHRcdFx0XHR0aGlzLnNhdmVBbmRSZWZyZXNoKCk7XHJcblx0XHRcdH0pLm9wZW4oKTtcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGRpc3BsYXlHbG9iYWxTZXR0aW5ncygpOiB2b2lkIHtcclxuXHRcdGNvbnN0IGdsb2JhbENvbnRhaW5lciA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KFxyXG5cdFx0XHRcImljcy1nbG9iYWwtc2V0dGluZ3NcIlxyXG5cdFx0KTtcclxuXHRcdGdsb2JhbENvbnRhaW5lci5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogdChcIkdsb2JhbCBTZXR0aW5nc1wiKSB9KTtcclxuXHJcblx0XHQvLyBFbmFibGUgYmFja2dyb3VuZCByZWZyZXNoXHJcblx0XHRuZXcgU2V0dGluZyhnbG9iYWxDb250YWluZXIpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJFbmFibGUgQmFja2dyb3VuZCBSZWZyZXNoXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHR0KFwiQXV0b21hdGljYWxseSByZWZyZXNoIGNhbGVuZGFyIHNvdXJjZXMgaW4gdGhlIGJhY2tncm91bmRcIilcclxuXHRcdFx0KVxyXG5cdFx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcclxuXHRcdFx0XHR0b2dnbGVcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZSh0aGlzLmNvbmZpZy5lbmFibGVCYWNrZ3JvdW5kUmVmcmVzaClcclxuXHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5jb25maWcuZW5hYmxlQmFja2dyb3VuZFJlZnJlc2ggPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0dGhpcy5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHQvLyBHbG9iYWwgcmVmcmVzaCBpbnRlcnZhbFxyXG5cdFx0bmV3IFNldHRpbmcoZ2xvYmFsQ29udGFpbmVyKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiR2xvYmFsIFJlZnJlc2ggSW50ZXJ2YWxcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJEZWZhdWx0IHJlZnJlc2ggaW50ZXJ2YWwgZm9yIGFsbCBzb3VyY2VzIChtaW51dGVzKVwiKSlcclxuXHRcdFx0LmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0XHR0ZXh0LnNldFBsYWNlaG9sZGVyKFwiNjBcIilcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZSh0aGlzLmNvbmZpZy5nbG9iYWxSZWZyZXNoSW50ZXJ2YWwudG9TdHJpbmcoKSlcclxuXHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgaW50ZXJ2YWwgPSBwYXJzZUludCh2YWx1ZSwgMTApO1xyXG5cdFx0XHRcdFx0XHRpZiAoIWlzTmFOKGludGVydmFsKSAmJiBpbnRlcnZhbCA+IDApIHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmNvbmZpZy5nbG9iYWxSZWZyZXNoSW50ZXJ2YWwgPSBpbnRlcnZhbDtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gTWF4IGNhY2hlIGFnZVxyXG5cdFx0bmV3IFNldHRpbmcoZ2xvYmFsQ29udGFpbmVyKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiTWF4aW11bSBDYWNoZSBBZ2VcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJIb3cgbG9uZyB0byBrZWVwIGNhY2hlZCBkYXRhIChob3VycylcIikpXHJcblx0XHRcdC5hZGRUZXh0KCh0ZXh0KSA9PiB7XHJcblx0XHRcdFx0dGV4dC5zZXRQbGFjZWhvbGRlcihcIjI0XCIpXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUodGhpcy5jb25maWcubWF4Q2FjaGVBZ2UudG9TdHJpbmcoKSlcclxuXHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgYWdlID0gcGFyc2VJbnQodmFsdWUsIDEwKTtcclxuXHRcdFx0XHRcdFx0aWYgKCFpc05hTihhZ2UpICYmIGFnZSA+IDApIHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmNvbmZpZy5tYXhDYWNoZUFnZSA9IGFnZTtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gTmV0d29yayB0aW1lb3V0XHJcblx0XHRuZXcgU2V0dGluZyhnbG9iYWxDb250YWluZXIpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJOZXR3b3JrIFRpbWVvdXRcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJSZXF1ZXN0IHRpbWVvdXQgaW4gc2Vjb25kc1wiKSlcclxuXHRcdFx0LmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0XHR0ZXh0LnNldFBsYWNlaG9sZGVyKFwiMzBcIilcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZSh0aGlzLmNvbmZpZy5uZXR3b3JrVGltZW91dC50b1N0cmluZygpKVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRjb25zdCB0aW1lb3V0ID0gcGFyc2VJbnQodmFsdWUsIDEwKTtcclxuXHRcdFx0XHRcdFx0aWYgKCFpc05hTih0aW1lb3V0KSAmJiB0aW1lb3V0ID4gMCkge1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMuY29uZmlnLm5ldHdvcmtUaW1lb3V0ID0gdGltZW91dDtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gTWF4IGV2ZW50cyBwZXIgc291cmNlXHJcblx0XHRuZXcgU2V0dGluZyhnbG9iYWxDb250YWluZXIpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJNYXggRXZlbnRzIFBlciBTb3VyY2VcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJNYXhpbXVtIG51bWJlciBvZiBldmVudHMgdG8gbG9hZCBmcm9tIGVhY2ggc291cmNlXCIpKVxyXG5cdFx0XHQuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHRcdHRleHQuc2V0UGxhY2Vob2xkZXIoXCIxMDAwXCIpXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUodGhpcy5jb25maWcubWF4RXZlbnRzUGVyU291cmNlLnRvU3RyaW5nKCkpXHJcblx0XHRcdFx0XHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IG1heCA9IHBhcnNlSW50KHZhbHVlLCAxMCk7XHJcblx0XHRcdFx0XHRcdGlmICghaXNOYU4obWF4KSAmJiBtYXggPiAwKSB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5jb25maWcubWF4RXZlbnRzUGVyU291cmNlID0gbWF4O1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMuc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHQvLyBEZWZhdWx0IGV2ZW50IGNvbG9yXHJcblx0XHRuZXcgU2V0dGluZyhnbG9iYWxDb250YWluZXIpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJEZWZhdWx0IEV2ZW50IENvbG9yXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyh0KFwiRGVmYXVsdCBjb2xvciBmb3IgZXZlbnRzIHdpdGhvdXQgYSBzcGVjaWZpYyBjb2xvclwiKSlcclxuXHRcdFx0LmFkZENvbG9yUGlja2VyKChjb2xvcikgPT4ge1xyXG5cdFx0XHRcdGNvbG9yXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUodGhpcy5jb25maWcuZGVmYXVsdEV2ZW50Q29sb3IpXHJcblx0XHRcdFx0XHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMuY29uZmlnLmRlZmF1bHRFdmVudENvbG9yID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdHRoaXMuc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGRpc3BsYXlTb3VyY2VzTGlzdCgpOiB2b2lkIHtcclxuXHRcdGNvbnN0IHNvdXJjZXNDb250YWluZXIgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdihcImljcy1zb3VyY2VzLWxpc3RcIik7XHJcblx0XHRzb3VyY2VzQ29udGFpbmVyLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiB0KFwiQ2FsZW5kYXIgU291cmNlc1wiKSB9KTtcclxuXHJcblx0XHRpZiAodGhpcy5jb25maWcuc291cmNlcy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0Y29uc3QgZW1wdHlTdGF0ZSA9IHNvdXJjZXNDb250YWluZXIuY3JlYXRlRGl2KFwiaWNzLWVtcHR5LXN0YXRlXCIpO1xyXG5cdFx0XHRlbXB0eVN0YXRlLmNyZWF0ZUVsKFwicFwiLCB7XHJcblx0XHRcdFx0dGV4dDogdChcclxuXHRcdFx0XHRcdFwiTm8gY2FsZW5kYXIgc291cmNlcyBjb25maWd1cmVkLiBBZGQgYSBzb3VyY2UgdG8gZ2V0IHN0YXJ0ZWQuXCJcclxuXHRcdFx0XHQpLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuY29uZmlnLnNvdXJjZXMuZm9yRWFjaCgoc291cmNlLCBpbmRleCkgPT4ge1xyXG5cdFx0XHRjb25zdCBzb3VyY2VDb250YWluZXIgPVxyXG5cdFx0XHRcdHNvdXJjZXNDb250YWluZXIuY3JlYXRlRGl2KFwiaWNzLXNvdXJjZS1pdGVtXCIpO1xyXG5cclxuXHRcdFx0Ly8gU291cmNlIGhlYWRlclxyXG5cdFx0XHRjb25zdCBzb3VyY2VIZWFkZXIgPSBzb3VyY2VDb250YWluZXIuY3JlYXRlRGl2KFwiaWNzLXNvdXJjZS1oZWFkZXJcIik7XHJcblxyXG5cdFx0XHRjb25zdCB0aXRsZUNvbnRhaW5lciA9IHNvdXJjZUhlYWRlci5jcmVhdGVEaXYoXCJpY3Mtc291cmNlLXRpdGxlXCIpO1xyXG5cdFx0XHR0aXRsZUNvbnRhaW5lci5jcmVhdGVFbChcInN0cm9uZ1wiLCB7IHRleHQ6IHNvdXJjZS5uYW1lIH0pO1xyXG5cclxuXHRcdFx0Y29uc3Qgc3RhdHVzRWwgPSBzb3VyY2VIZWFkZXIuY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdFx0XHRjbHM6IFwiaWNzLXNvdXJjZS1zdGF0dXNcIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdHN0YXR1c0VsLnNldFRleHQoXHJcblx0XHRcdFx0c291cmNlLmVuYWJsZWQgPyB0KFwiSUNTIEVuYWJsZWRcIikgOiB0KFwiSUNTIERpc2FibGVkXCIpXHJcblx0XHRcdCk7XHJcblx0XHRcdHN0YXR1c0VsLmFkZENsYXNzKFxyXG5cdFx0XHRcdHNvdXJjZS5lbmFibGVkID8gXCJzdGF0dXMtZW5hYmxlZFwiIDogXCJzdGF0dXMtZGlzYWJsZWRcIlxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gU291cmNlIGRldGFpbHNcclxuXHRcdFx0Y29uc3Qgc291cmNlRGV0YWlscyA9XHJcblx0XHRcdFx0c291cmNlQ29udGFpbmVyLmNyZWF0ZURpdihcImljcy1zb3VyY2UtZGV0YWlsc1wiKTtcclxuXHRcdFx0c291cmNlRGV0YWlscy5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdFx0dGV4dDogYCR7dChcIlVSTFwiKX06ICR7dGhpcy50cnVuY2F0ZVVybChzb3VyY2UudXJsKX1gLFxyXG5cdFx0XHRcdHRpdGxlOiBzb3VyY2UudXJsLCAvLyBTaG93IGZ1bGwgVVJMIG9uIGhvdmVyXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRzb3VyY2VEZXRhaWxzLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0XHR0ZXh0OiBgJHt0KFwiUmVmcmVzaFwiKX06ICR7c291cmNlLnJlZnJlc2hJbnRlcnZhbH0ke3QoXCJtaW5cIil9YCxcclxuXHRcdFx0fSk7XHJcblx0XHRcdGlmIChzb3VyY2UuY29sb3IpIHtcclxuXHRcdFx0XHRjb25zdCBjb2xvckRpdiA9IHNvdXJjZURldGFpbHMuY3JlYXRlRWwoXCJkaXZcIik7XHJcblx0XHRcdFx0Y29sb3JEaXYuY3JlYXRlU3Bhbih7IHRleHQ6IGAke3QoXCJDb2xvclwiKX06IGAgfSk7XHJcblx0XHRcdFx0Y29sb3JEaXYuY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdFx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHRcdFx0c3R5bGU6IGBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7IHdpZHRoOiAxMnB4OyBoZWlnaHQ6IDEycHg7IGJhY2tncm91bmQ6ICR7c291cmNlLmNvbG9yfTsgYm9yZGVyLXJhZGl1czogMnB4OyBtYXJnaW4tbGVmdDogNHB4OyB2ZXJ0aWNhbC1hbGlnbjogbWlkZGxlO2AsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGNvbG9yRGl2LmNyZWF0ZVNwYW4oeyB0ZXh0OiBgICR7c291cmNlLmNvbG9yfWAgfSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFNvdXJjZSBhY3Rpb25zIC0gcmVvcmdhbml6ZWQgZm9yIGJldHRlciBVWFxyXG5cdFx0XHRjb25zdCBzb3VyY2VBY3Rpb25zID1cclxuXHRcdFx0XHRzb3VyY2VDb250YWluZXIuY3JlYXRlRGl2KFwiaWNzLXNvdXJjZS1hY3Rpb25zXCIpO1xyXG5cclxuXHRcdFx0Ly8gUHJpbWFyeSBhY3Rpb25zIChsZWZ0IHNpZGUpXHJcblx0XHRcdGNvbnN0IHByaW1hcnlBY3Rpb25zID0gc291cmNlQWN0aW9ucy5jcmVhdGVEaXYoXCJwcmltYXJ5LWFjdGlvbnNcIik7XHJcblxyXG5cdFx0XHQvLyBFZGl0IGJ1dHRvbiAobW9zdCBjb21tb24gYWN0aW9uKVxyXG5cdFx0XHRjb25zdCBlZGl0QnV0dG9uID0gcHJpbWFyeUFjdGlvbnMuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHRcdHRleHQ6IHQoXCJFZGl0XCIpLFxyXG5cdFx0XHRcdGNsczogXCJtb2QtY3RhXCIsXHJcblx0XHRcdFx0dGl0bGU6IHQoXCJFZGl0IHRoaXMgY2FsZW5kYXIgc291cmNlXCIpLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0ZWRpdEJ1dHRvbi5vbmNsaWNrID0gKCkgPT4ge1xyXG5cdFx0XHRcdG5ldyBJY3NTb3VyY2VNb2RhbChcclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luLmFwcCxcclxuXHRcdFx0XHRcdCh1cGRhdGVkU291cmNlKSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMuY29uZmlnLnNvdXJjZXNbaW5kZXhdID0gdXBkYXRlZFNvdXJjZTtcclxuXHRcdFx0XHRcdFx0dGhpcy5zYXZlQW5kUmVmcmVzaCgpO1xyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHNvdXJjZVxyXG5cdFx0XHRcdCkub3BlbigpO1xyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gU3luYyBidXR0b25cclxuXHRcdFx0Y29uc3Qgc3luY0J1dHRvbiA9IHByaW1hcnlBY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0XHR0ZXh0OiB0KFwiU3luY1wiKSxcclxuXHRcdFx0XHRhdHRyOiB7XHJcblx0XHRcdFx0XHRcImFyaWEtbGFiZWxcIjogdChcIlN5bmMgdGhpcyBjYWxlbmRhciBzb3VyY2Ugbm93XCIpLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRzeW5jQnV0dG9uLm9uY2xpY2sgPSBhc3luYyAoKSA9PiB7XHJcblx0XHRcdFx0c3luY0J1dHRvbi5kaXNhYmxlZCA9IHRydWU7XHJcblx0XHRcdFx0c3luY0J1dHRvbi5hZGRDbGFzcyhcInN5bmNpbmdcIik7XHJcblx0XHRcdFx0c3luY0J1dHRvbi5zZXRUZXh0KFwi4p+zIFwiICsgdChcIlN5bmNpbmcuLi5cIikpO1xyXG5cclxuXHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0Y29uc3QgaWNzTWFuYWdlciA9IHRoaXMucGx1Z2luLmdldEljc01hbmFnZXIoKTtcclxuXHRcdFx0XHRcdGlmIChpY3NNYW5hZ2VyKSB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IGljc01hbmFnZXIuc3luY1NvdXJjZShzb3VyY2UuaWQpO1xyXG5cdFx0XHRcdFx0XHRpZiAocmVzdWx0LnN1Y2Nlc3MpIHtcclxuXHRcdFx0XHRcdFx0XHRuZXcgTm90aWNlKHQoXCJTeW5jIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHlcIikpO1xyXG5cdFx0XHRcdFx0XHRcdHN5bmNCdXR0b24ucmVtb3ZlQ2xhc3MoXCJzeW5jaW5nXCIpO1xyXG5cdFx0XHRcdFx0XHRcdHN5bmNCdXR0b24uYWRkQ2xhc3MoXCJzdWNjZXNzXCIpO1xyXG5cdFx0XHRcdFx0XHRcdHNldFRpbWVvdXQoXHJcblx0XHRcdFx0XHRcdFx0XHQoKSA9PiBzeW5jQnV0dG9uLnJlbW92ZUNsYXNzKFwic3VjY2Vzc1wiKSxcclxuXHRcdFx0XHRcdFx0XHRcdDIwMDBcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdG5ldyBOb3RpY2UodChcIlN5bmMgZmFpbGVkOiBcIikgKyByZXN1bHQuZXJyb3IpO1xyXG5cdFx0XHRcdFx0XHRcdHN5bmNCdXR0b24ucmVtb3ZlQ2xhc3MoXCJzeW5jaW5nXCIpO1xyXG5cdFx0XHRcdFx0XHRcdHN5bmNCdXR0b24uYWRkQ2xhc3MoXCJlcnJvclwiKTtcclxuXHRcdFx0XHRcdFx0XHRzZXRUaW1lb3V0KFxyXG5cdFx0XHRcdFx0XHRcdFx0KCkgPT4gc3luY0J1dHRvbi5yZW1vdmVDbGFzcyhcImVycm9yXCIpLFxyXG5cdFx0XHRcdFx0XHRcdFx0MjAwMFxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdFx0bmV3IE5vdGljZSh0KFwiU3luYyBmYWlsZWQ6IFwiKSArIGVycm9yLm1lc3NhZ2UpO1xyXG5cdFx0XHRcdFx0c3luY0J1dHRvbi5yZW1vdmVDbGFzcyhcInN5bmNpbmdcIik7XHJcblx0XHRcdFx0XHRzeW5jQnV0dG9uLmFkZENsYXNzKFwiZXJyb3JcIik7XHJcblx0XHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHN5bmNCdXR0b24ucmVtb3ZlQ2xhc3MoXCJlcnJvclwiKSwgMjAwMCk7XHJcblx0XHRcdFx0fSBmaW5hbGx5IHtcclxuXHRcdFx0XHRcdHN5bmNCdXR0b24uZGlzYWJsZWQgPSBmYWxzZTtcclxuXHRcdFx0XHRcdHN5bmNCdXR0b24uc2V0VGV4dCh0KFwiU3luY1wiKSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gU2Vjb25kYXJ5IGFjdGlvbnMgKHJpZ2h0IHNpZGUpXHJcblx0XHRcdGNvbnN0IHNlY29uZGFyeUFjdGlvbnMgPVxyXG5cdFx0XHRcdHNvdXJjZUFjdGlvbnMuY3JlYXRlRGl2KFwic2Vjb25kYXJ5LWFjdGlvbnNcIik7XHJcblxyXG5cdFx0XHQvLyBUb2dnbGUgYnV0dG9uXHJcblx0XHRcdGNvbnN0IHRvZ2dsZUJ1dHRvbiA9IHNlY29uZGFyeUFjdGlvbnMuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHRcdHRleHQ6IHNvdXJjZS5lbmFibGVkID8gdChcIkRpc2FibGVcIikgOiB0KFwiRW5hYmxlXCIpLFxyXG5cdFx0XHRcdHRpdGxlOiBzb3VyY2UuZW5hYmxlZFxyXG5cdFx0XHRcdFx0PyB0KFwiRGlzYWJsZSB0aGlzIHNvdXJjZVwiKVxyXG5cdFx0XHRcdFx0OiB0KFwiRW5hYmxlIHRoaXMgc291cmNlXCIpLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0dG9nZ2xlQnV0dG9uLm9uY2xpY2sgPSAoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5jb25maWcuc291cmNlc1tpbmRleF0uZW5hYmxlZCA9XHJcblx0XHRcdFx0XHQhdGhpcy5jb25maWcuc291cmNlc1tpbmRleF0uZW5hYmxlZDtcclxuXHRcdFx0XHR0aGlzLnNhdmVBbmRSZWZyZXNoKCk7XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBEZWxldGUgYnV0dG9uIChkZXN0cnVjdGl2ZSBhY3Rpb24sIHBsYWNlZCBsYXN0KVxyXG5cdFx0XHRjb25zdCBkZWxldGVCdXR0b24gPSBzZWNvbmRhcnlBY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0XHR0ZXh0OiB0KFwiRGVsZXRlXCIpLFxyXG5cdFx0XHRcdGNsczogXCJtb2Qtd2FybmluZ1wiLFxyXG5cdFx0XHRcdHRpdGxlOiB0KFwiRGVsZXRlIHRoaXMgY2FsZW5kYXIgc291cmNlXCIpLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0ZGVsZXRlQnV0dG9uLm9uY2xpY2sgPSAoKSA9PiB7XHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0Y29uZmlybShcclxuXHRcdFx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFx0XHRcIkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkZWxldGUgdGhpcyBjYWxlbmRhciBzb3VyY2U/XCJcclxuXHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0dGhpcy5jb25maWcuc291cmNlcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0XHRcdFx0dGhpcy5zYXZlQW5kUmVmcmVzaCgpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSB0cnVuY2F0ZVVybCh1cmw6IHN0cmluZywgbWF4TGVuZ3RoOiBudW1iZXIgPSA1MCk6IHN0cmluZyB7XHJcblx0XHRpZiAodXJsLmxlbmd0aCA8PSBtYXhMZW5ndGgpIHJldHVybiB1cmw7XHJcblx0XHRyZXR1cm4gdXJsLnN1YnN0cmluZygwLCBtYXhMZW5ndGggLSAzKSArIFwiLi4uXCI7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHNhdmVTZXR0aW5ncygpOiB2b2lkIHtcclxuXHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLmljc0ludGVncmF0aW9uID0geyAuLi50aGlzLmNvbmZpZyB9O1xyXG5cdFx0dGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIElDUyBtYW5hZ2VyIGNvbmZpZ3VyYXRpb25cclxuXHRcdGNvbnN0IGljc01hbmFnZXIgPSB0aGlzLnBsdWdpbi5nZXRJY3NNYW5hZ2VyKCk7XHJcblx0XHRpZiAoaWNzTWFuYWdlcikge1xyXG5cdFx0XHRpY3NNYW5hZ2VyLnVwZGF0ZUNvbmZpZyh0aGlzLmNvbmZpZyk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHNhdmVBbmRSZWZyZXNoKCk6IHZvaWQge1xyXG5cdFx0dGhpcy5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdHRoaXMuZGlzcGxheSgpOyAvLyBSZWZyZXNoIHRoZSBkaXNwbGF5XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICogTW9kYWwgZm9yIGFkZGluZy9lZGl0aW5nIElDUyBzb3VyY2VzXHJcbiAqL1xyXG5jbGFzcyBJY3NTb3VyY2VNb2RhbCBleHRlbmRzIE1vZGFsIHtcclxuXHRwcml2YXRlIHNvdXJjZTogSWNzU291cmNlO1xyXG5cdHByaXZhdGUgb25TYXZlOiAoc291cmNlOiBJY3NTb3VyY2UpID0+IHZvaWQ7XHJcblx0cHJpdmF0ZSBpc0VkaXRpbmc6IGJvb2xlYW47XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0YXBwOiBBcHAsXHJcblx0XHRvblNhdmU6IChzb3VyY2U6IEljc1NvdXJjZSkgPT4gdm9pZCxcclxuXHRcdGV4aXN0aW5nU291cmNlPzogSWNzU291cmNlXHJcblx0KSB7XHJcblx0XHRzdXBlcihhcHApO1xyXG5cdFx0dGhpcy5vblNhdmUgPSBvblNhdmU7XHJcblx0XHR0aGlzLmlzRWRpdGluZyA9ICEhZXhpc3RpbmdTb3VyY2U7XHJcblxyXG5cdFx0dGhpcy5tb2RhbEVsLmFkZENsYXNzKFwiaWNzLXNvdXJjZS1tb2RhbFwiKTtcclxuXHJcblx0XHRpZiAoZXhpc3RpbmdTb3VyY2UpIHtcclxuXHRcdFx0dGhpcy5zb3VyY2UgPSB7IC4uLmV4aXN0aW5nU291cmNlIH07XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLnNvdXJjZSA9IHtcclxuXHRcdFx0XHRpZDogdGhpcy5nZW5lcmF0ZUlkKCksXHJcblx0XHRcdFx0bmFtZTogXCJcIixcclxuXHRcdFx0XHR1cmw6IFwiXCIsXHJcblx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRyZWZyZXNoSW50ZXJ2YWw6IDYwLFxyXG5cdFx0XHRcdHNob3dBbGxEYXlFdmVudHM6IHRydWUsXHJcblx0XHRcdFx0c2hvd1RpbWVkRXZlbnRzOiB0cnVlLFxyXG5cdFx0XHRcdHNob3dUeXBlOiBcImV2ZW50XCIsXHJcblx0XHRcdH07XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRvbk9wZW4oKTogdm9pZCB7XHJcblx0XHRjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcclxuXHRcdGNvbnRlbnRFbC5lbXB0eSgpO1xyXG5cclxuXHRcdGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHtcclxuXHRcdFx0dGV4dDogdGhpcy5pc0VkaXRpbmcgPyB0KFwiRWRpdCBJQ1MgU291cmNlXCIpIDogdChcIkFkZCBJQ1MgU291cmNlXCIpLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gTmFtZVxyXG5cdFx0bmV3IFNldHRpbmcoY29udGVudEVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiSUNTIFNvdXJjZSBOYW1lXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyh0KFwiRGlzcGxheSBuYW1lIGZvciB0aGlzIGNhbGVuZGFyIHNvdXJjZVwiKSlcclxuXHRcdFx0LmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0XHR0ZXh0LnNldFBsYWNlaG9sZGVyKHQoXCJNeSBDYWxlbmRhclwiKSlcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZSh0aGlzLnNvdXJjZS5uYW1lKVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnNvdXJjZS5uYW1lID0gdmFsdWU7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gVVJMXHJcblx0XHRuZXcgU2V0dGluZyhjb250ZW50RWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJJQ1MgVVJMXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XCJVUkwgdG8gdGhlIElDUy9pQ2FsIGZpbGUgKHN1cHBvcnRzIGh0dHA6Ly8sIGh0dHBzOi8vLCBhbmQgd2ViY2FsOi8vIHByb3RvY29scylcIlxyXG5cdFx0XHRcdClcclxuXHRcdFx0KVxyXG5cdFx0XHQuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHRcdHRleHQuc2V0UGxhY2Vob2xkZXIoXHJcblx0XHRcdFx0XHRcImh0dHBzOi8vZXhhbXBsZS5jb20vY2FsZW5kYXIuaWNzIG9yIHdlYmNhbDovL2V4YW1wbGUuY29tL2NhbGVuZGFyLmljc1wiXHJcblx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKHRoaXMuc291cmNlLnVybClcclxuXHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5zb3VyY2UudXJsID0gdmFsdWU7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBTaG93IFVSTCBjb252ZXJzaW9uIGluZm8gZm9yIHdlYmNhbCBVUkxzXHJcblx0XHRcdFx0XHRcdGlmIChXZWJjYWxVcmxDb252ZXJ0ZXIuaXNXZWJjYWxVcmwodmFsdWUpKSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgY29udmVyc2lvblJlc3VsdCA9XHJcblx0XHRcdFx0XHRcdFx0XHRXZWJjYWxVcmxDb252ZXJ0ZXIuY29udmVydFdlYmNhbFVybCh2YWx1ZSk7XHJcblx0XHRcdFx0XHRcdFx0aWYgKGNvbnZlcnNpb25SZXN1bHQuc3VjY2Vzcykge1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgZGVzY3JpcHRpb24gPVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRXZWJjYWxVcmxDb252ZXJ0ZXIuZ2V0Q29udmVyc2lvbkRlc2NyaXB0aW9uKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnZlcnNpb25SZXN1bHRcclxuXHRcdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdC8vIEZpbmQgdGhlIGRlc2NyaXB0aW9uIGVsZW1lbnQgYW5kIHVwZGF0ZSBpdFxyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgZGVzY0VsID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0dGV4dC5pbnB1dEVsLnBhcmVudEVsZW1lbnQ/LnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XCIuc2V0dGluZy1pdGVtLWRlc2NyaXB0aW9uXCJcclxuXHRcdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdGlmIChkZXNjRWwpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0ZGVzY0VsLnRleHRDb250ZW50ID0gYCR7dChcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcIlVSTCB0byB0aGUgSUNTL2lDYWwgZmlsZSAoc3VwcG9ydHMgaHR0cDovLywgaHR0cHM6Ly8sIGFuZCB3ZWJjYWw6Ly8gcHJvdG9jb2xzKVwiXHJcblx0XHRcdFx0XHRcdFx0XHRcdCl9IC0gJHtkZXNjcmlwdGlvbn1gO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHQvLyBSZXNldCBkZXNjcmlwdGlvbiBmb3Igbm9uLXdlYmNhbCBVUkxzXHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgZGVzY0VsID1cclxuXHRcdFx0XHRcdFx0XHRcdHRleHQuaW5wdXRFbC5wYXJlbnRFbGVtZW50Py5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcIi5zZXR0aW5nLWl0ZW0tZGVzY3JpcHRpb25cIlxyXG5cdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRpZiAoZGVzY0VsKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRkZXNjRWwudGV4dENvbnRlbnQgPSB0KFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcIlVSTCB0byB0aGUgSUNTL2lDYWwgZmlsZSAoc3VwcG9ydHMgaHR0cDovLywgaHR0cHM6Ly8sIGFuZCB3ZWJjYWw6Ly8gcHJvdG9jb2xzKVwiXHJcblx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdC8vIEVuYWJsZWRcclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcclxuXHRcdFx0LnNldE5hbWUodChcIklDUyBFbmFibGVkXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyh0KFwiV2hldGhlciB0aGlzIHNvdXJjZSBpcyBhY3RpdmVcIikpXHJcblx0XHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xyXG5cdFx0XHRcdHRvZ2dsZS5zZXRWYWx1ZSh0aGlzLnNvdXJjZS5lbmFibGVkKS5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuc291cmNlLmVuYWJsZWQgPSB2YWx1ZTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gUmVmcmVzaCBpbnRlcnZhbFxyXG5cdFx0bmV3IFNldHRpbmcoY29udGVudEVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiUmVmcmVzaCBJbnRlcnZhbFwiKSlcclxuXHRcdFx0LnNldERlc2ModChcIkhvdyBvZnRlbiB0byByZWZyZXNoIHRoaXMgc291cmNlIChtaW51dGVzKVwiKSlcclxuXHRcdFx0LmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0XHR0ZXh0LnNldFBsYWNlaG9sZGVyKFwiNjBcIilcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZSh0aGlzLnNvdXJjZS5yZWZyZXNoSW50ZXJ2YWwudG9TdHJpbmcoKSlcclxuXHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgaW50ZXJ2YWwgPSBwYXJzZUludCh2YWx1ZSwgMTApO1xyXG5cdFx0XHRcdFx0XHRpZiAoIWlzTmFOKGludGVydmFsKSAmJiBpbnRlcnZhbCA+IDApIHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnNvdXJjZS5yZWZyZXNoSW50ZXJ2YWwgPSBpbnRlcnZhbDtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdC8vIENvbG9yXHJcblx0XHRuZXcgU2V0dGluZyhjb250ZW50RWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJDb2xvclwiKSlcclxuXHRcdFx0LnNldERlc2ModChcIkNvbG9yIGZvciBldmVudHMgZnJvbSB0aGlzIHNvdXJjZSAob3B0aW9uYWwpXCIpKVxyXG5cdFx0XHQuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHRcdHRleHQuc2V0UGxhY2Vob2xkZXIoXCIjM2I4MmY2XCIpXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUodGhpcy5zb3VyY2UuY29sb3IgfHwgXCJcIilcclxuXHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0aWYgKCF2YWx1ZSB8fCB2YWx1ZS5tYXRjaCgvXiNbMC05YS1mQS1GXXs2fSQvKSkge1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMuc291cmNlLmNvbG9yID0gdmFsdWUgfHwgdW5kZWZpbmVkO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gU2hvdyB0eXBlXHJcblx0XHRuZXcgU2V0dGluZyhjb250ZW50RWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJTaG93IFR5cGVcIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdHQoXCJIb3cgdG8gZGlzcGxheSBldmVudHMgZnJvbSB0aGlzIHNvdXJjZSBpbiBjYWxlbmRhciB2aWV3c1wiKVxyXG5cdFx0XHQpXHJcblx0XHRcdC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcclxuXHRcdFx0XHRkcm9wZG93blxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcImV2ZW50XCIsIHQoXCJFdmVudFwiKSlcclxuXHRcdFx0XHRcdC5hZGRPcHRpb24oXCJiYWRnZVwiLCB0KFwiQmFkZ2VcIikpXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUodGhpcy5zb3VyY2Uuc2hvd1R5cGUpXHJcblx0XHRcdFx0XHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMuc291cmNlLnNob3dUeXBlID0gdmFsdWUgYXMgXCJldmVudFwiIHwgXCJiYWRnZVwiO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdC8vIFNob3cgYWxsLWRheSBldmVudHNcclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcclxuXHRcdFx0LnNldE5hbWUodChcIlNob3cgQWxsLURheSBFdmVudHNcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJJbmNsdWRlIGFsbC1kYXkgZXZlbnRzIGZyb20gdGhpcyBzb3VyY2VcIikpXHJcblx0XHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xyXG5cdFx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKHRoaXMuc291cmNlLnNob3dBbGxEYXlFdmVudHMpXHJcblx0XHRcdFx0XHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMuc291cmNlLnNob3dBbGxEYXlFdmVudHMgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHQvLyBTaG93IHRpbWVkIGV2ZW50c1xyXG5cdFx0bmV3IFNldHRpbmcoY29udGVudEVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiU2hvdyBUaW1lZCBFdmVudHNcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJJbmNsdWRlIHRpbWVkIGV2ZW50cyBmcm9tIHRoaXMgc291cmNlXCIpKVxyXG5cdFx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcclxuXHRcdFx0XHR0b2dnbGVcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZSh0aGlzLnNvdXJjZS5zaG93VGltZWRFdmVudHMpXHJcblx0XHRcdFx0XHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMuc291cmNlLnNob3dUaW1lZEV2ZW50cyA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdC8vIFRleHQgUmVwbGFjZW1lbnRzIHNlY3Rpb25cclxuXHRcdHRoaXMuZGlzcGxheVRleHRSZXBsYWNlbWVudHMoY29udGVudEVsKTtcclxuXHJcblx0XHQvLyBIb2xpZGF5IENvbmZpZ3VyYXRpb24gc2VjdGlvblxyXG5cdFx0dGhpcy5kaXNwbGF5SG9saWRheUNvbmZpZ3VyYXRpb24oY29udGVudEVsKTtcclxuXHJcblx0XHQvLyBTdGF0dXMgTWFwcGluZyBDb25maWd1cmF0aW9uIHNlY3Rpb25cclxuXHRcdHRoaXMuZGlzcGxheVN0YXR1c01hcHBpbmdDb25maWd1cmF0aW9uKGNvbnRlbnRFbCk7XHJcblxyXG5cdFx0Ly8gQXV0aGVudGljYXRpb24gc2VjdGlvblxyXG5cdFx0Y29uc3QgYXV0aENvbnRhaW5lciA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoKTtcclxuXHRcdGF1dGhDb250YWluZXIuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IHQoXCJBdXRoZW50aWNhdGlvbiAoT3B0aW9uYWwpXCIpIH0pO1xyXG5cclxuXHRcdC8vIEF1dGggdHlwZVxyXG5cdFx0bmV3IFNldHRpbmcoYXV0aENvbnRhaW5lcilcclxuXHRcdFx0LnNldE5hbWUodChcIkF1dGhlbnRpY2F0aW9uIFR5cGVcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJUeXBlIG9mIGF1dGhlbnRpY2F0aW9uIHJlcXVpcmVkXCIpKVxyXG5cdFx0XHQuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XHJcblx0XHRcdFx0ZHJvcGRvd25cclxuXHRcdFx0XHRcdC5hZGRPcHRpb24oXCJub25lXCIsIHQoXCJJQ1MgQXV0aCBOb25lXCIpKVxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcImJhc2ljXCIsIHQoXCJCYXNpYyBBdXRoXCIpKVxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcImJlYXJlclwiLCB0KFwiQmVhcmVyIFRva2VuXCIpKVxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcImN1c3RvbVwiLCB0KFwiQ3VzdG9tIEhlYWRlcnNcIikpXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUodGhpcy5zb3VyY2UuYXV0aD8udHlwZSB8fCBcIm5vbmVcIilcclxuXHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0aWYgKHZhbHVlID09PSBcIm5vbmVcIikge1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMuc291cmNlLmF1dGggPSB1bmRlZmluZWQ7XHJcblx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5zb3VyY2UuYXV0aCA9IHtcclxuXHRcdFx0XHRcdFx0XHRcdHR5cGU6IHZhbHVlIGFzIGFueSxcclxuXHRcdFx0XHRcdFx0XHRcdC4uLnRoaXMuc291cmNlLmF1dGgsXHJcblx0XHRcdFx0XHRcdFx0fTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR0aGlzLnJlZnJlc2hBdXRoRmllbGRzKGF1dGhDb250YWluZXIpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdHRoaXMucmVmcmVzaEF1dGhGaWVsZHMoYXV0aENvbnRhaW5lcik7XHJcblxyXG5cdFx0Ly8gQnV0dG9uc1xyXG5cdFx0Y29uc3QgYnV0dG9uQ29udGFpbmVyID0gY29udGVudEVsLmNyZWF0ZURpdihcIm1vZGFsLWJ1dHRvbi1jb250YWluZXJcIik7XHJcblxyXG5cdFx0Y29uc3Qgc2F2ZUJ1dHRvbiA9IGJ1dHRvbkNvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXCJTYXZlXCIpLFxyXG5cdFx0XHRjbHM6IFwibW9kLWN0YVwiLFxyXG5cdFx0fSk7XHJcblx0XHRzYXZlQnV0dG9uLm9uY2xpY2sgPSAoKSA9PiB7XHJcblx0XHRcdGlmICh0aGlzLnZhbGlkYXRlU291cmNlKCkpIHtcclxuXHRcdFx0XHR0aGlzLm9uU2F2ZSh0aGlzLnNvdXJjZSk7XHJcblx0XHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdGNvbnN0IGNhbmNlbEJ1dHRvbiA9IGJ1dHRvbkNvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXCJDYW5jZWxcIiksXHJcblx0XHR9KTtcclxuXHRcdGNhbmNlbEJ1dHRvbi5vbmNsaWNrID0gKCkgPT4ge1xyXG5cdFx0XHR0aGlzLmNsb3NlKCk7XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBkaXNwbGF5VGV4dFJlcGxhY2VtZW50cyhjb250ZW50RWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHRjb25zdCB0ZXh0UmVwbGFjZW1lbnRzQ29udGFpbmVyID0gY29udGVudEVsLmNyZWF0ZURpdigpO1xyXG5cdFx0dGV4dFJlcGxhY2VtZW50c0NvbnRhaW5lci5jcmVhdGVFbChcImgzXCIsIHtcclxuXHRcdFx0dGV4dDogdChcIlRleHQgUmVwbGFjZW1lbnRzXCIpLFxyXG5cdFx0fSk7XHJcblx0XHR0ZXh0UmVwbGFjZW1lbnRzQ29udGFpbmVyLmNyZWF0ZUVsKFwicFwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXHJcblx0XHRcdFx0XCJDb25maWd1cmUgcnVsZXMgdG8gbW9kaWZ5IGV2ZW50IHRleHQgdXNpbmcgcmVndWxhciBleHByZXNzaW9uc1wiXHJcblx0XHRcdCksXHJcblx0XHRcdGNsczogXCJzZXR0aW5nLWl0ZW0tZGVzY3JpcHRpb25cIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgdGV4dFJlcGxhY2VtZW50cyBpZiBub3QgZXhpc3RzXHJcblx0XHRpZiAoIXRoaXMuc291cmNlLnRleHRSZXBsYWNlbWVudHMpIHtcclxuXHRcdFx0dGhpcy5zb3VyY2UudGV4dFJlcGxhY2VtZW50cyA9IFtdO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENvbnRhaW5lciBmb3IgcmVwbGFjZW1lbnQgcnVsZXNcclxuXHRcdGNvbnN0IHJ1bGVzQ29udGFpbmVyID0gdGV4dFJlcGxhY2VtZW50c0NvbnRhaW5lci5jcmVhdGVEaXYoXHJcblx0XHRcdFwidGV4dC1yZXBsYWNlbWVudHMtbGlzdFwiXHJcblx0XHQpO1xyXG5cclxuXHRcdGNvbnN0IHJlZnJlc2hSdWxlc0xpc3QgPSAoKSA9PiB7XHJcblx0XHRcdHJ1bGVzQ29udGFpbmVyLmVtcHR5KCk7XHJcblxyXG5cdFx0XHRpZiAodGhpcy5zb3VyY2UudGV4dFJlcGxhY2VtZW50cyEubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdFx0Y29uc3QgZW1wdHlTdGF0ZSA9IHJ1bGVzQ29udGFpbmVyLmNyZWF0ZURpdihcclxuXHRcdFx0XHRcdFwidGV4dC1yZXBsYWNlbWVudHMtZW1wdHlcIlxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0ZW1wdHlTdGF0ZS5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHRcdFx0dGV4dDogdChcIk5vIHRleHQgcmVwbGFjZW1lbnQgcnVsZXMgY29uZmlndXJlZFwiKSxcclxuXHRcdFx0XHRcdGNsczogXCJzZXR0aW5nLWl0ZW0tZGVzY3JpcHRpb25cIixcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0aGlzLnNvdXJjZS50ZXh0UmVwbGFjZW1lbnRzIS5mb3JFYWNoKChydWxlLCBpbmRleCkgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc3QgcnVsZUNvbnRhaW5lciA9IHJ1bGVzQ29udGFpbmVyLmNyZWF0ZURpdihcclxuXHRcdFx0XHRcdFx0XCJ0ZXh0LXJlcGxhY2VtZW50LXJ1bGVcIlxyXG5cdFx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0XHQvLyBSdWxlIGhlYWRlclxyXG5cdFx0XHRcdFx0Y29uc3QgcnVsZUhlYWRlciA9IHJ1bGVDb250YWluZXIuY3JlYXRlRGl2KFxyXG5cdFx0XHRcdFx0XHRcInRleHQtcmVwbGFjZW1lbnQtaGVhZGVyXCJcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRjb25zdCB0aXRsZUVsID0gcnVsZUhlYWRlci5jcmVhdGVFbChcInN0cm9uZ1wiLCB7XHJcblx0XHRcdFx0XHRcdHRleHQ6IHJ1bGUubmFtZSB8fCBgUnVsZSAke2luZGV4ICsgMX1gLFxyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0Y29uc3Qgc3RhdHVzRWwgPSBydWxlSGVhZGVyLmNyZWF0ZUVsKFwic3BhblwiLCB7XHJcblx0XHRcdFx0XHRcdGNsczogYHRleHQtcmVwbGFjZW1lbnQtc3RhdHVzICR7XHJcblx0XHRcdFx0XHRcdFx0cnVsZS5lbmFibGVkID8gXCJlbmFibGVkXCIgOiBcImRpc2FibGVkXCJcclxuXHRcdFx0XHRcdFx0fWAsXHJcblx0XHRcdFx0XHRcdHRleHQ6IHJ1bGUuZW5hYmxlZCA/IHQoXCJFbmFibGVkXCIpIDogdChcIkRpc2FibGVkXCIpLFxyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gUnVsZSBkZXRhaWxzXHJcblx0XHRcdFx0XHRjb25zdCBydWxlRGV0YWlscyA9IHJ1bGVDb250YWluZXIuY3JlYXRlRGl2KFxyXG5cdFx0XHRcdFx0XHRcInRleHQtcmVwbGFjZW1lbnQtZGV0YWlsc1wiXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0cnVsZURldGFpbHMuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHRcdFx0XHR0ZXh0OiBgJHt0KFwiVGFyZ2V0XCIpfTogJHtydWxlLnRhcmdldH1gLFxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRydWxlRGV0YWlscy5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdFx0XHRcdHRleHQ6IGAke3QoXCJQYXR0ZXJuXCIpfTogJHtydWxlLnBhdHRlcm59YCxcclxuXHRcdFx0XHRcdFx0Y2xzOiBcInRleHQtcmVwbGFjZW1lbnQtcGF0dGVyblwiLFxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRydWxlRGV0YWlscy5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdFx0XHRcdHRleHQ6IGAke3QoXCJSZXBsYWNlbWVudFwiKX06ICR7cnVsZS5yZXBsYWNlbWVudH1gLFxyXG5cdFx0XHRcdFx0XHRjbHM6IFwidGV4dC1yZXBsYWNlbWVudC1yZXBsYWNlbWVudFwiLFxyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gUnVsZSBhY3Rpb25zXHJcblx0XHRcdFx0XHRjb25zdCBydWxlQWN0aW9ucyA9IHJ1bGVDb250YWluZXIuY3JlYXRlRGl2KFxyXG5cdFx0XHRcdFx0XHRcInRleHQtcmVwbGFjZW1lbnQtYWN0aW9uc1wiXHJcblx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdGNvbnN0IGVkaXRCdXR0b24gPSBydWxlQWN0aW9ucy5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdFx0XHRcdHRleHQ6IHQoXCJFZGl0XCIpLFxyXG5cdFx0XHRcdFx0XHRjbHM6IFwibW9kLWN0YVwiLFxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRlZGl0QnV0dG9uLm9uY2xpY2sgPSAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdG5ldyBUZXh0UmVwbGFjZW1lbnRNb2RhbChcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0XHRcdFx0XHQodXBkYXRlZFJ1bGUpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMuc291cmNlLnRleHRSZXBsYWNlbWVudHMhW2luZGV4XSA9XHJcblx0XHRcdFx0XHRcdFx0XHRcdHVwZGF0ZWRSdWxlO1xyXG5cdFx0XHRcdFx0XHRcdFx0cmVmcmVzaFJ1bGVzTGlzdCgpO1xyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0cnVsZVxyXG5cdFx0XHRcdFx0XHQpLm9wZW4oKTtcclxuXHRcdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdFx0Y29uc3QgdG9nZ2xlQnV0dG9uID0gcnVsZUFjdGlvbnMuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHRcdFx0XHR0ZXh0OiBydWxlLmVuYWJsZWQgPyB0KFwiRGlzYWJsZVwiKSA6IHQoXCJFbmFibGVcIiksXHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdHRvZ2dsZUJ1dHRvbi5vbmNsaWNrID0gKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnNvdXJjZS50ZXh0UmVwbGFjZW1lbnRzIVtpbmRleF0uZW5hYmxlZCA9XHJcblx0XHRcdFx0XHRcdFx0IXJ1bGUuZW5hYmxlZDtcclxuXHRcdFx0XHRcdFx0cmVmcmVzaFJ1bGVzTGlzdCgpO1xyXG5cdFx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0XHRjb25zdCBkZWxldGVCdXR0b24gPSBydWxlQWN0aW9ucy5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdFx0XHRcdHRleHQ6IHQoXCJEZWxldGVcIiksXHJcblx0XHRcdFx0XHRcdGNsczogXCJtb2Qtd2FybmluZ1wiLFxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRkZWxldGVCdXR0b24ub25jbGljayA9ICgpID0+IHtcclxuXHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdGNvbmZpcm0oXHJcblx0XHRcdFx0XHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcIkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkZWxldGUgdGhpcyB0ZXh0IHJlcGxhY2VtZW50IHJ1bGU/XCJcclxuXHRcdFx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMuc291cmNlLnRleHRSZXBsYWNlbWVudHMhLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdFx0XHRcdFx0cmVmcmVzaFJ1bGVzTGlzdCgpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdHJlZnJlc2hSdWxlc0xpc3QoKTtcclxuXHJcblx0XHQvLyBBZGQgcnVsZSBidXR0b25cclxuXHRcdGNvbnN0IGFkZFJ1bGVDb250YWluZXIgPSB0ZXh0UmVwbGFjZW1lbnRzQ29udGFpbmVyLmNyZWF0ZURpdihcclxuXHRcdFx0XCJ0ZXh0LXJlcGxhY2VtZW50LWFkZFwiXHJcblx0XHQpO1xyXG5cdFx0Y29uc3QgYWRkQnV0dG9uID0gYWRkUnVsZUNvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdHRleHQ6IFwiKyBcIiArIHQoXCJBZGQgVGV4dCBSZXBsYWNlbWVudCBSdWxlXCIpLFxyXG5cdFx0fSk7XHJcblx0XHRhZGRCdXR0b24ub25jbGljayA9ICgpID0+IHtcclxuXHRcdFx0bmV3IFRleHRSZXBsYWNlbWVudE1vZGFsKHRoaXMuYXBwLCAobmV3UnVsZSkgPT4ge1xyXG5cdFx0XHRcdHRoaXMuc291cmNlLnRleHRSZXBsYWNlbWVudHMhLnB1c2gobmV3UnVsZSk7XHJcblx0XHRcdFx0cmVmcmVzaFJ1bGVzTGlzdCgpO1xyXG5cdFx0XHR9KS5vcGVuKCk7XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSByZWZyZXNoQXV0aEZpZWxkcyhjb250YWluZXI6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHQvLyBSZW1vdmUgZXhpc3RpbmcgYXV0aCBmaWVsZHNcclxuXHRcdGNvbnN0IGV4aXN0aW5nRmllbGRzID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoXCIuYXV0aC1maWVsZFwiKTtcclxuXHRcdGV4aXN0aW5nRmllbGRzLmZvckVhY2goKGZpZWxkKSA9PiBmaWVsZC5yZW1vdmUoKSk7XHJcblxyXG5cdFx0aWYgKCF0aGlzLnNvdXJjZS5hdXRoIHx8IHRoaXMuc291cmNlLmF1dGgudHlwZSA9PT0gXCJub25lXCIpIHtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdHN3aXRjaCAodGhpcy5zb3VyY2UuYXV0aC50eXBlKSB7XHJcblx0XHRcdGNhc2UgXCJiYXNpY1wiOlxyXG5cdFx0XHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lcilcclxuXHRcdFx0XHRcdC5zZXROYW1lKHQoXCJJQ1MgVXNlcm5hbWVcIikpXHJcblx0XHRcdFx0XHQuc2V0Q2xhc3MoXCJhdXRoLWZpZWxkXCIpXHJcblx0XHRcdFx0XHQuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0ZXh0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRcdHRoaXMuc291cmNlLmF1dGg/LnVzZXJuYW1lIHx8IFwiXCJcclxuXHRcdFx0XHRcdFx0KS5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRpZiAodGhpcy5zb3VyY2UuYXV0aCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5zb3VyY2UuYXV0aC51c2VybmFtZSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0bmV3IFNldHRpbmcoY29udGFpbmVyKVxyXG5cdFx0XHRcdFx0LnNldE5hbWUodChcIklDUyBQYXNzd29yZFwiKSlcclxuXHRcdFx0XHRcdC5zZXRDbGFzcyhcImF1dGgtZmllbGRcIilcclxuXHRcdFx0XHRcdC5hZGRUZXh0KCh0ZXh0KSA9PiB7XHJcblx0XHRcdFx0XHRcdHRleHQuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRcdFx0dGhpcy5zb3VyY2UuYXV0aD8ucGFzc3dvcmQgfHwgXCJcIlxyXG5cdFx0XHRcdFx0XHQpLm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdGlmICh0aGlzLnNvdXJjZS5hdXRoKSB7XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnNvdXJjZS5hdXRoLnBhc3N3b3JkID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0dGV4dC5pbnB1dEVsLnR5cGUgPSBcInBhc3N3b3JkXCI7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdGNhc2UgXCJiZWFyZXJcIjpcclxuXHRcdFx0XHRuZXcgU2V0dGluZyhjb250YWluZXIpXHJcblx0XHRcdFx0XHQuc2V0TmFtZSh0KFwiSUNTIEJlYXJlciBUb2tlblwiKSlcclxuXHRcdFx0XHRcdC5zZXRDbGFzcyhcImF1dGgtZmllbGRcIilcclxuXHRcdFx0XHRcdC5hZGRUZXh0KCh0ZXh0KSA9PiB7XHJcblx0XHRcdFx0XHRcdHRleHQuc2V0VmFsdWUodGhpcy5zb3VyY2UuYXV0aD8udG9rZW4gfHwgXCJcIikub25DaGFuZ2UoXHJcblx0XHRcdFx0XHRcdFx0KHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRpZiAodGhpcy5zb3VyY2UuYXV0aCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnNvdXJjZS5hdXRoLnRva2VuID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRjYXNlIFwiY3VzdG9tXCI6XHJcblx0XHRcdFx0bmV3IFNldHRpbmcoY29udGFpbmVyKVxyXG5cdFx0XHRcdFx0LnNldE5hbWUodChcIkN1c3RvbSBIZWFkZXJzXCIpKVxyXG5cdFx0XHRcdFx0LnNldERlc2ModChcIkpTT04gb2JqZWN0IHdpdGggY3VzdG9tIGhlYWRlcnNcIikpXHJcblx0XHRcdFx0XHQuc2V0Q2xhc3MoXCJhdXRoLWZpZWxkXCIpXHJcblx0XHRcdFx0XHQuYWRkVGV4dEFyZWEoKHRleHQpID0+IHtcclxuXHRcdFx0XHRcdFx0dGV4dC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdFx0XHRKU09OLnN0cmluZ2lmeShcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMuc291cmNlLmF1dGg/LmhlYWRlcnMgfHwge30sXHJcblx0XHRcdFx0XHRcdFx0XHRudWxsLFxyXG5cdFx0XHRcdFx0XHRcdFx0MlxyXG5cdFx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0KS5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgaGVhZGVycyA9IEpTT04ucGFyc2UodmFsdWUpO1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKHRoaXMuc291cmNlLmF1dGgpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5zb3VyY2UuYXV0aC5oZWFkZXJzID0gaGVhZGVycztcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9IGNhdGNoIHtcclxuXHRcdFx0XHRcdFx0XHRcdC8vIEludmFsaWQgSlNPTiwgaWdub3JlXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBkaXNwbGF5SG9saWRheUNvbmZpZ3VyYXRpb24oY29udGVudEVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xyXG5cdFx0Y29uc3QgaG9saWRheUNvbnRhaW5lciA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoKTtcclxuXHRcdGhvbGlkYXlDb250YWluZXIuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IHQoXCJIb2xpZGF5IENvbmZpZ3VyYXRpb25cIikgfSk7XHJcblx0XHRob2xpZGF5Q29udGFpbmVyLmNyZWF0ZUVsKFwicFwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXCJDb25maWd1cmUgaG93IGhvbGlkYXkgZXZlbnRzIGFyZSBkZXRlY3RlZCBhbmQgZGlzcGxheWVkXCIpLFxyXG5cdFx0XHRjbHM6IFwic2V0dGluZy1pdGVtLWRlc2NyaXB0aW9uXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBJbml0aWFsaXplIGhvbGlkYXkgY29uZmlnIGlmIG5vdCBleGlzdHNcclxuXHRcdGlmICghdGhpcy5zb3VyY2UuaG9saWRheUNvbmZpZykge1xyXG5cdFx0XHR0aGlzLnNvdXJjZS5ob2xpZGF5Q29uZmlnID0gSG9saWRheURldGVjdG9yLmdldERlZmF1bHRDb25maWcoKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBFbmFibGUgaG9saWRheSBkZXRlY3Rpb25cclxuXHRcdG5ldyBTZXR0aW5nKGhvbGlkYXlDb250YWluZXIpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJFbmFibGUgSG9saWRheSBEZXRlY3Rpb25cIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJBdXRvbWF0aWNhbGx5IGRldGVjdCBhbmQgZ3JvdXAgaG9saWRheSBldmVudHNcIikpXHJcblx0XHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xyXG5cdFx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKHRoaXMuc291cmNlLmhvbGlkYXlDb25maWchLmVuYWJsZWQpXHJcblx0XHRcdFx0XHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMuc291cmNlLmhvbGlkYXlDb25maWchLmVuYWJsZWQgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0dGhpcy5yZWZyZXNoSG9saWRheVNldHRpbmdzKGhvbGlkYXlDb250YWluZXIpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdHRoaXMucmVmcmVzaEhvbGlkYXlTZXR0aW5ncyhob2xpZGF5Q29udGFpbmVyKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZGlzcGxheVN0YXR1c01hcHBpbmdDb25maWd1cmF0aW9uKGNvbnRlbnRFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuXHRcdGNvbnN0IHN0YXR1c0NvbnRhaW5lciA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoKTtcclxuXHRcdHN0YXR1c0NvbnRhaW5lci5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogdChcIlN0YXR1cyBNYXBwaW5nXCIpIH0pO1xyXG5cdFx0c3RhdHVzQ29udGFpbmVyLmNyZWF0ZUVsKFwicFwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXCJDb25maWd1cmUgaG93IElDUyBldmVudHMgYXJlIG1hcHBlZCB0byB0YXNrIHN0YXR1c2VzXCIpLFxyXG5cdFx0XHRjbHM6IFwic2V0dGluZy1pdGVtLWRlc2NyaXB0aW9uXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBJbml0aWFsaXplIHN0YXR1cyBtYXBwaW5nIGlmIG5vdCBleGlzdHNcclxuXHRcdGlmICghdGhpcy5zb3VyY2Uuc3RhdHVzTWFwcGluZykge1xyXG5cdFx0XHR0aGlzLnNvdXJjZS5zdGF0dXNNYXBwaW5nID0ge1xyXG5cdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHRpbWluZ1J1bGVzOiB7XHJcblx0XHRcdFx0XHRwYXN0RXZlbnRzOiBcInhcIixcclxuXHRcdFx0XHRcdGN1cnJlbnRFdmVudHM6IFwiL1wiLFxyXG5cdFx0XHRcdFx0ZnV0dXJlRXZlbnRzOiBcIiBcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG92ZXJyaWRlSWNzU3RhdHVzOiB0cnVlLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEVuYWJsZSBzdGF0dXMgbWFwcGluZ1xyXG5cdFx0bmV3IFNldHRpbmcoc3RhdHVzQ29udGFpbmVyKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiRW5hYmxlIFN0YXR1cyBNYXBwaW5nXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHR0KFwiQXV0b21hdGljYWxseSBtYXAgSUNTIGV2ZW50cyB0byBzcGVjaWZpYyB0YXNrIHN0YXR1c2VzXCIpXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XHJcblx0XHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUodGhpcy5zb3VyY2Uuc3RhdHVzTWFwcGluZyEuZW5hYmxlZClcclxuXHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5zb3VyY2Uuc3RhdHVzTWFwcGluZyEuZW5hYmxlZCA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHR0aGlzLnJlZnJlc2hTdGF0dXNNYXBwaW5nU2V0dGluZ3Moc3RhdHVzQ29udGFpbmVyKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHR0aGlzLnJlZnJlc2hTdGF0dXNNYXBwaW5nU2V0dGluZ3Moc3RhdHVzQ29udGFpbmVyKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVmcmVzaEhvbGlkYXlTZXR0aW5ncyhjb250YWluZXI6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHQvLyBSZW1vdmUgZXhpc3RpbmcgaG9saWRheSBzZXR0aW5nc1xyXG5cdFx0Y29uc3QgZXhpc3RpbmdTZXR0aW5ncyA9IGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKFwiLmhvbGlkYXktc2V0dGluZ1wiKTtcclxuXHRcdGV4aXN0aW5nU2V0dGluZ3MuZm9yRWFjaCgoc2V0dGluZykgPT4gc2V0dGluZy5yZW1vdmUoKSk7XHJcblxyXG5cdFx0aWYgKCF0aGlzLnNvdXJjZS5ob2xpZGF5Q29uZmlnPy5lbmFibGVkKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBHcm91cGluZyBzdHJhdGVneVxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiR3JvdXBpbmcgU3RyYXRlZ3lcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJIb3cgdG8gaGFuZGxlIGNvbnNlY3V0aXZlIGhvbGlkYXkgZXZlbnRzXCIpKVxyXG5cdFx0XHQuc2V0Q2xhc3MoXCJob2xpZGF5LXNldHRpbmdcIilcclxuXHRcdFx0LmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xyXG5cdFx0XHRcdGRyb3Bkb3duXHJcblx0XHRcdFx0XHQuYWRkT3B0aW9uKFwibm9uZVwiLCB0KFwiU2hvdyBBbGwgRXZlbnRzXCIpKVxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcImZpcnN0LW9ubHlcIiwgdChcIlNob3cgRmlyc3QgRGF5IE9ubHlcIikpXHJcblx0XHRcdFx0XHQuYWRkT3B0aW9uKFwic3VtbWFyeVwiLCB0KFwiU2hvdyBTdW1tYXJ5XCIpKVxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcInJhbmdlXCIsIHQoXCJTaG93IEZpcnN0IGFuZCBMYXN0XCIpKVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKHRoaXMuc291cmNlLmhvbGlkYXlDb25maWchLmdyb3VwaW5nU3RyYXRlZ3kpXHJcblx0XHRcdFx0XHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMuc291cmNlLmhvbGlkYXlDb25maWchLmdyb3VwaW5nU3RyYXRlZ3kgPVxyXG5cdFx0XHRcdFx0XHRcdHZhbHVlIGFzIGFueTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHQvLyBNYXggZ2FwIGRheXNcclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lcilcclxuXHRcdFx0LnNldE5hbWUodChcIk1heGltdW0gR2FwIERheXNcIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdHQoXCJNYXhpbXVtIGRheXMgYmV0d2VlbiBldmVudHMgdG8gY29uc2lkZXIgdGhlbSBjb25zZWN1dGl2ZVwiKVxyXG5cdFx0XHQpXHJcblx0XHRcdC5zZXRDbGFzcyhcImhvbGlkYXktc2V0dGluZ1wiKVxyXG5cdFx0XHQuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHRcdHRleHQuc2V0UGxhY2Vob2xkZXIoXCIxXCIpXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUodGhpcy5zb3VyY2UuaG9saWRheUNvbmZpZyEubWF4R2FwRGF5cy50b1N0cmluZygpKVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBnYXAgPSBwYXJzZUludCh2YWx1ZSwgMTApO1xyXG5cdFx0XHRcdFx0XHRpZiAoIWlzTmFOKGdhcCkgJiYgZ2FwID49IDApIHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnNvdXJjZS5ob2xpZGF5Q29uZmlnIS5tYXhHYXBEYXlzID0gZ2FwO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gU2hvdyBpbiBmb3JlY2FzdFxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiU2hvdyBpbiBGb3JlY2FzdFwiKSlcclxuXHRcdFx0LnNldERlc2ModChcIldoZXRoZXIgdG8gc2hvdyBob2xpZGF5IGV2ZW50cyBpbiBmb3JlY2FzdCB2aWV3XCIpKVxyXG5cdFx0XHQuc2V0Q2xhc3MoXCJob2xpZGF5LXNldHRpbmdcIilcclxuXHRcdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XHJcblx0XHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUodGhpcy5zb3VyY2UuaG9saWRheUNvbmZpZyEuc2hvd0luRm9yZWNhc3QpXHJcblx0XHRcdFx0XHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMuc291cmNlLmhvbGlkYXlDb25maWchLnNob3dJbkZvcmVjYXN0ID0gdmFsdWU7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gU2hvdyBpbiBjYWxlbmRhclxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiU2hvdyBpbiBDYWxlbmRhclwiKSlcclxuXHRcdFx0LnNldERlc2ModChcIldoZXRoZXIgdG8gc2hvdyBob2xpZGF5IGV2ZW50cyBpbiBjYWxlbmRhciB2aWV3XCIpKVxyXG5cdFx0XHQuc2V0Q2xhc3MoXCJob2xpZGF5LXNldHRpbmdcIilcclxuXHRcdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XHJcblx0XHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUodGhpcy5zb3VyY2UuaG9saWRheUNvbmZpZyEuc2hvd0luQ2FsZW5kYXIpXHJcblx0XHRcdFx0XHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMuc291cmNlLmhvbGlkYXlDb25maWchLnNob3dJbkNhbGVuZGFyID0gdmFsdWU7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gRGV0ZWN0aW9uIHBhdHRlcm5zXHJcblx0XHRjb25zdCBwYXR0ZXJuc0NvbnRhaW5lciA9IGNvbnRhaW5lci5jcmVhdGVEaXYoXCJob2xpZGF5LXNldHRpbmdcIik7XHJcblx0XHRwYXR0ZXJuc0NvbnRhaW5lci5jcmVhdGVFbChcImg0XCIsIHsgdGV4dDogdChcIkRldGVjdGlvbiBQYXR0ZXJuc1wiKSB9KTtcclxuXHJcblx0XHQvLyBTdW1tYXJ5IHBhdHRlcm5zXHJcblx0XHRuZXcgU2V0dGluZyhwYXR0ZXJuc0NvbnRhaW5lcilcclxuXHRcdFx0LnNldE5hbWUodChcIlN1bW1hcnkgUGF0dGVybnNcIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdHQoXCJSZWdleCBwYXR0ZXJucyB0byBtYXRjaCBpbiBldmVudCB0aXRsZXMgKG9uZSBwZXIgbGluZSlcIilcclxuXHRcdFx0KVxyXG5cdFx0XHQuYWRkVGV4dEFyZWEoKHRleHQpID0+IHtcclxuXHRcdFx0XHR0ZXh0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0KFxyXG5cdFx0XHRcdFx0XHR0aGlzLnNvdXJjZS5ob2xpZGF5Q29uZmlnIS5kZXRlY3Rpb25QYXR0ZXJucy5zdW1tYXJ5IHx8XHJcblx0XHRcdFx0XHRcdFtdXHJcblx0XHRcdFx0XHQpLmpvaW4oXCJcXG5cIilcclxuXHRcdFx0XHQpLm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5zb3VyY2UuaG9saWRheUNvbmZpZyEuZGV0ZWN0aW9uUGF0dGVybnMuc3VtbWFyeSA9IHZhbHVlXHJcblx0XHRcdFx0XHRcdC5zcGxpdChcIlxcblwiKVxyXG5cdFx0XHRcdFx0XHQubWFwKChsaW5lKSA9PiBsaW5lLnRyaW0oKSlcclxuXHRcdFx0XHRcdFx0LmZpbHRlcigobGluZSkgPT4gbGluZS5sZW5ndGggPiAwKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gS2V5d29yZHNcclxuXHRcdG5ldyBTZXR0aW5nKHBhdHRlcm5zQ29udGFpbmVyKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiS2V5d29yZHNcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJLZXl3b3JkcyB0byBkZXRlY3QgaW4gZXZlbnQgdGV4dCAob25lIHBlciBsaW5lKVwiKSlcclxuXHRcdFx0LmFkZFRleHRBcmVhKCh0ZXh0KSA9PiB7XHJcblx0XHRcdFx0dGV4dC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdChcclxuXHRcdFx0XHRcdFx0dGhpcy5zb3VyY2UuaG9saWRheUNvbmZpZyEuZGV0ZWN0aW9uUGF0dGVybnMua2V5d29yZHMgfHxcclxuXHRcdFx0XHRcdFx0W11cclxuXHRcdFx0XHRcdCkuam9pbihcIlxcblwiKVxyXG5cdFx0XHRcdCkub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLnNvdXJjZS5ob2xpZGF5Q29uZmlnIS5kZXRlY3Rpb25QYXR0ZXJucy5rZXl3b3JkcyA9XHJcblx0XHRcdFx0XHRcdHZhbHVlXHJcblx0XHRcdFx0XHRcdFx0LnNwbGl0KFwiXFxuXCIpXHJcblx0XHRcdFx0XHRcdFx0Lm1hcCgobGluZSkgPT4gbGluZS50cmltKCkpXHJcblx0XHRcdFx0XHRcdFx0LmZpbHRlcigobGluZSkgPT4gbGluZS5sZW5ndGggPiAwKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ2F0ZWdvcmllc1xyXG5cdFx0bmV3IFNldHRpbmcocGF0dGVybnNDb250YWluZXIpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJDYXRlZ29yaWVzXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHR0KFwiRXZlbnQgY2F0ZWdvcmllcyB0aGF0IGluZGljYXRlIGhvbGlkYXlzIChvbmUgcGVyIGxpbmUpXCIpXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZFRleHRBcmVhKCh0ZXh0KSA9PiB7XHJcblx0XHRcdFx0dGV4dC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdChcclxuXHRcdFx0XHRcdFx0dGhpcy5zb3VyY2UuaG9saWRheUNvbmZpZyEuZGV0ZWN0aW9uUGF0dGVybnNcclxuXHRcdFx0XHRcdFx0XHQuY2F0ZWdvcmllcyB8fCBbXVxyXG5cdFx0XHRcdFx0KS5qb2luKFwiXFxuXCIpXHJcblx0XHRcdFx0KS5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuc291cmNlLmhvbGlkYXlDb25maWchLmRldGVjdGlvblBhdHRlcm5zLmNhdGVnb3JpZXMgPVxyXG5cdFx0XHRcdFx0XHR2YWx1ZVxyXG5cdFx0XHRcdFx0XHRcdC5zcGxpdChcIlxcblwiKVxyXG5cdFx0XHRcdFx0XHRcdC5tYXAoKGxpbmUpID0+IGxpbmUudHJpbSgpKVxyXG5cdFx0XHRcdFx0XHRcdC5maWx0ZXIoKGxpbmUpID0+IGxpbmUubGVuZ3RoID4gMCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdC8vIEdyb3VwIGRpc3BsYXkgZm9ybWF0XHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXIpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJHcm91cCBEaXNwbGF5IEZvcm1hdFwiKSlcclxuXHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFwiRm9ybWF0IGZvciBncm91cGVkIGhvbGlkYXkgZGlzcGxheS4gVXNlIHt0aXRsZX0sIHtjb3VudH0sIHtzdGFydERhdGV9LCB7ZW5kRGF0ZX1cIlxyXG5cdFx0XHRcdClcclxuXHRcdFx0KVxyXG5cdFx0XHQuc2V0Q2xhc3MoXCJob2xpZGF5LXNldHRpbmdcIilcclxuXHRcdFx0LmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0XHR0ZXh0LnNldFBsYWNlaG9sZGVyKFwie3RpdGxlfSAoe2NvdW50fSBkYXlzKVwiKVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHR0aGlzLnNvdXJjZS5ob2xpZGF5Q29uZmlnIS5ncm91cERpc3BsYXlGb3JtYXQgfHwgXCJcIlxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnNvdXJjZS5ob2xpZGF5Q29uZmlnIS5ncm91cERpc3BsYXlGb3JtYXQgPVxyXG5cdFx0XHRcdFx0XHRcdHZhbHVlIHx8IHVuZGVmaW5lZDtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVmcmVzaFN0YXR1c01hcHBpbmdTZXR0aW5ncyhjb250YWluZXI6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcblx0XHQvLyBSZW1vdmUgZXhpc3Rpbmcgc3RhdHVzIG1hcHBpbmcgc2V0dGluZ3NcclxuXHRcdGNvbnN0IGV4aXN0aW5nU2V0dGluZ3MgPSBjb250YWluZXIucXVlcnlTZWxlY3RvckFsbChcclxuXHRcdFx0XCIuc3RhdHVzLW1hcHBpbmctc2V0dGluZ1wiXHJcblx0XHQpO1xyXG5cdFx0ZXhpc3RpbmdTZXR0aW5ncy5mb3JFYWNoKChzZXR0aW5nKSA9PiBzZXR0aW5nLnJlbW92ZSgpKTtcclxuXHJcblx0XHRpZiAoIXRoaXMuc291cmNlLnN0YXR1c01hcHBpbmc/LmVuYWJsZWQpIHtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIE92ZXJyaWRlIElDUyBzdGF0dXNcclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lcilcclxuXHRcdFx0LnNldE5hbWUodChcIk92ZXJyaWRlIElDUyBTdGF0dXNcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJPdmVycmlkZSBvcmlnaW5hbCBJQ1MgZXZlbnQgc3RhdHVzIHdpdGggbWFwcGVkIHN0YXR1c1wiKSlcclxuXHRcdFx0LnNldENsYXNzKFwic3RhdHVzLW1hcHBpbmctc2V0dGluZ1wiKVxyXG5cdFx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcclxuXHRcdFx0XHR0b2dnbGVcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZSh0aGlzLnNvdXJjZS5zdGF0dXNNYXBwaW5nIS5vdmVycmlkZUljc1N0YXR1cylcclxuXHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5zb3VyY2Uuc3RhdHVzTWFwcGluZyEub3ZlcnJpZGVJY3NTdGF0dXMgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHQvLyBUaW1pbmcgcnVsZXMgc2VjdGlvblxyXG5cdFx0Y29uc3QgdGltaW5nQ29udGFpbmVyID0gY29udGFpbmVyLmNyZWF0ZURpdihcInN0YXR1cy1tYXBwaW5nLXNldHRpbmdcIik7XHJcblx0XHR0aW1pbmdDb250YWluZXIuY3JlYXRlRWwoXCJoNFwiLCB7IHRleHQ6IHQoXCJUaW1pbmcgUnVsZXNcIikgfSk7XHJcblxyXG5cdFx0Ly8gUGFzdCBldmVudHMgc3RhdHVzXHJcblx0XHRuZXcgU2V0dGluZyh0aW1pbmdDb250YWluZXIpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJQYXN0IEV2ZW50cyBTdGF0dXNcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJTdGF0dXMgZm9yIGV2ZW50cyB0aGF0IGhhdmUgYWxyZWFkeSBlbmRlZFwiKSlcclxuXHRcdFx0LmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xyXG5cdFx0XHRcdGRyb3Bkb3duXHJcblx0XHRcdFx0XHQuYWRkT3B0aW9uKFwiIFwiLCB0KFwiU3RhdHVzIEluY29tcGxldGVcIikpXHJcblx0XHRcdFx0XHQuYWRkT3B0aW9uKFwieFwiLCB0KFwiU3RhdHVzIENvbXBsZXRlXCIpKVxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcIi1cIiwgdChcIlN0YXR1cyBDYW5jZWxsZWRcIikpXHJcblx0XHRcdFx0XHQuYWRkT3B0aW9uKFwiL1wiLCB0KFwiU3RhdHVzIEluIFByb2dyZXNzXCIpKVxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcIj9cIiwgdChcIlN0YXR1cyBRdWVzdGlvblwiKSlcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZSh0aGlzLnNvdXJjZS5zdGF0dXNNYXBwaW5nIS50aW1pbmdSdWxlcy5wYXN0RXZlbnRzKVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnNvdXJjZS5zdGF0dXNNYXBwaW5nIS50aW1pbmdSdWxlcy5wYXN0RXZlbnRzID1cclxuXHRcdFx0XHRcdFx0XHR2YWx1ZSBhcyBhbnk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ3VycmVudCBldmVudHMgc3RhdHVzXHJcblx0XHRuZXcgU2V0dGluZyh0aW1pbmdDb250YWluZXIpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJDdXJyZW50IEV2ZW50cyBTdGF0dXNcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJTdGF0dXMgZm9yIGV2ZW50cyBoYXBwZW5pbmcgdG9kYXlcIikpXHJcblx0XHRcdC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcclxuXHRcdFx0XHRkcm9wZG93blxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcIiBcIiwgdChcIlN0YXR1cyBJbmNvbXBsZXRlXCIpKVxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcInhcIiwgdChcIlN0YXR1cyBDb21wbGV0ZVwiKSlcclxuXHRcdFx0XHRcdC5hZGRPcHRpb24oXCItXCIsIHQoXCJTdGF0dXMgQ2FuY2VsbGVkXCIpKVxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcIi9cIiwgdChcIlN0YXR1cyBJbiBQcm9ncmVzc1wiKSlcclxuXHRcdFx0XHRcdC5hZGRPcHRpb24oXCI/XCIsIHQoXCJTdGF0dXMgUXVlc3Rpb25cIikpXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRcdHRoaXMuc291cmNlLnN0YXR1c01hcHBpbmchLnRpbWluZ1J1bGVzLmN1cnJlbnRFdmVudHNcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5zb3VyY2Uuc3RhdHVzTWFwcGluZyEudGltaW5nUnVsZXMuY3VycmVudEV2ZW50cyA9XHJcblx0XHRcdFx0XHRcdFx0dmFsdWUgYXMgYW55O1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdC8vIEZ1dHVyZSBldmVudHMgc3RhdHVzXHJcblx0XHRuZXcgU2V0dGluZyh0aW1pbmdDb250YWluZXIpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJGdXR1cmUgRXZlbnRzIFN0YXR1c1wiKSlcclxuXHRcdFx0LnNldERlc2ModChcIlN0YXR1cyBmb3IgZXZlbnRzIGluIHRoZSBmdXR1cmVcIikpXHJcblx0XHRcdC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcclxuXHRcdFx0XHRkcm9wZG93blxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcIiBcIiwgdChcIlN0YXR1cyBJbmNvbXBsZXRlXCIpKVxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcInhcIiwgdChcIlN0YXR1cyBDb21wbGV0ZVwiKSlcclxuXHRcdFx0XHRcdC5hZGRPcHRpb24oXCItXCIsIHQoXCJTdGF0dXMgQ2FuY2VsbGVkXCIpKVxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcIi9cIiwgdChcIlN0YXR1cyBJbiBQcm9ncmVzc1wiKSlcclxuXHRcdFx0XHRcdC5hZGRPcHRpb24oXCI/XCIsIHQoXCJTdGF0dXMgUXVlc3Rpb25cIikpXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRcdHRoaXMuc291cmNlLnN0YXR1c01hcHBpbmchLnRpbWluZ1J1bGVzLmZ1dHVyZUV2ZW50c1xyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnNvdXJjZS5zdGF0dXNNYXBwaW5nIS50aW1pbmdSdWxlcy5mdXR1cmVFdmVudHMgPVxyXG5cdFx0XHRcdFx0XHRcdHZhbHVlIGFzIGFueTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHQvLyBQcm9wZXJ0eSBydWxlcyBzZWN0aW9uXHJcblx0XHRjb25zdCBwcm9wZXJ0eUNvbnRhaW5lciA9IGNvbnRhaW5lci5jcmVhdGVEaXYoXCJzdGF0dXMtbWFwcGluZy1zZXR0aW5nXCIpO1xyXG5cdFx0cHJvcGVydHlDb250YWluZXIuY3JlYXRlRWwoXCJoNFwiLCB7IHRleHQ6IHQoXCJQcm9wZXJ0eSBSdWxlc1wiKSB9KTtcclxuXHRcdHByb3BlcnR5Q29udGFpbmVyLmNyZWF0ZUVsKFwicFwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXHJcblx0XHRcdFx0XCJPcHRpb25hbCBydWxlcyBiYXNlZCBvbiBldmVudCBwcm9wZXJ0aWVzIChoaWdoZXIgcHJpb3JpdHkgdGhhbiB0aW1pbmcgcnVsZXMpXCJcclxuXHRcdFx0KSxcclxuXHRcdFx0Y2xzOiBcInNldHRpbmctaXRlbS1kZXNjcmlwdGlvblwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBwcm9wZXJ0eSBydWxlcyBpZiBub3QgZXhpc3RzXHJcblx0XHRpZiAoIXRoaXMuc291cmNlLnN0YXR1c01hcHBpbmchLnByb3BlcnR5UnVsZXMpIHtcclxuXHRcdFx0dGhpcy5zb3VyY2Uuc3RhdHVzTWFwcGluZyEucHJvcGVydHlSdWxlcyA9IHt9O1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEhvbGlkYXkgbWFwcGluZ1xyXG5cdFx0bmV3IFNldHRpbmcocHJvcGVydHlDb250YWluZXIpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJIb2xpZGF5IFN0YXR1c1wiKSlcclxuXHRcdFx0LnNldERlc2ModChcIlN0YXR1cyBmb3IgZXZlbnRzIGRldGVjdGVkIGFzIGhvbGlkYXlzXCIpKVxyXG5cdFx0XHQuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XHJcblx0XHRcdFx0ZHJvcGRvd25cclxuXHRcdFx0XHRcdC5hZGRPcHRpb24oXCJcIiwgdChcIlVzZSB0aW1pbmcgcnVsZXNcIikpXHJcblx0XHRcdFx0XHQuYWRkT3B0aW9uKFwiIFwiLCB0KFwiU3RhdHVzIEluY29tcGxldGVcIikpXHJcblx0XHRcdFx0XHQuYWRkT3B0aW9uKFwieFwiLCB0KFwiU3RhdHVzIENvbXBsZXRlXCIpKVxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcIi1cIiwgdChcIlN0YXR1cyBDYW5jZWxsZWRcIikpXHJcblx0XHRcdFx0XHQuYWRkT3B0aW9uKFwiL1wiLCB0KFwiU3RhdHVzIEluIFByb2dyZXNzXCIpKVxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcIj9cIiwgdChcIlN0YXR1cyBRdWVzdGlvblwiKSlcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdFx0dGhpcy5zb3VyY2Uuc3RhdHVzTWFwcGluZyEucHJvcGVydHlSdWxlcyEuaG9saWRheU1hcHBpbmdcclxuXHRcdFx0XHRcdFx0XHQ/LmhvbGlkYXlTdGF0dXMgfHwgXCJcIlxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0IXRoaXMuc291cmNlLnN0YXR1c01hcHBpbmchLnByb3BlcnR5UnVsZXMhXHJcblx0XHRcdFx0XHRcdFx0XHQuaG9saWRheU1hcHBpbmdcclxuXHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5zb3VyY2Uuc3RhdHVzTWFwcGluZyEucHJvcGVydHlSdWxlcyEuaG9saWRheU1hcHBpbmcgPVxyXG5cdFx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRob2xpZGF5U3RhdHVzOiBcIi1cIixcclxuXHRcdFx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0aWYgKHZhbHVlKSB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5zb3VyY2Uuc3RhdHVzTWFwcGluZyEucHJvcGVydHlSdWxlcyEuaG9saWRheU1hcHBpbmcuaG9saWRheVN0YXR1cyA9XHJcblx0XHRcdFx0XHRcdFx0XHR2YWx1ZSBhcyBhbnk7XHJcblx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0ZGVsZXRlIHRoaXMuc291cmNlLnN0YXR1c01hcHBpbmchLnByb3BlcnR5UnVsZXMhXHJcblx0XHRcdFx0XHRcdFx0XHQuaG9saWRheU1hcHBpbmc7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHQvLyBDYXRlZ29yeSBtYXBwaW5nXHJcblx0XHRuZXcgU2V0dGluZyhwcm9wZXJ0eUNvbnRhaW5lcilcclxuXHRcdFx0LnNldE5hbWUodChcIkNhdGVnb3J5IE1hcHBpbmdcIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcIk1hcCBzcGVjaWZpYyBjYXRlZ29yaWVzIHRvIHN0YXR1c2VzIChmb3JtYXQ6IGNhdGVnb3J5OnN0YXR1cywgb25lIHBlciBsaW5lKVwiXHJcblx0XHRcdFx0KVxyXG5cdFx0XHQpXHJcblx0XHRcdC5hZGRUZXh0QXJlYSgodGV4dCkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IGNhdGVnb3J5TWFwcGluZyA9XHJcblx0XHRcdFx0XHR0aGlzLnNvdXJjZS5zdGF0dXNNYXBwaW5nIS5wcm9wZXJ0eVJ1bGVzIS5jYXRlZ29yeU1hcHBpbmcgfHxcclxuXHRcdFx0XHRcdHt9O1xyXG5cdFx0XHRcdGNvbnN0IG1hcHBpbmdUZXh0ID0gT2JqZWN0LmVudHJpZXMoY2F0ZWdvcnlNYXBwaW5nKVxyXG5cdFx0XHRcdFx0Lm1hcCgoW2NhdGVnb3J5LCBzdGF0dXNdKSA9PiBgJHtjYXRlZ29yeX06JHtzdGF0dXN9YClcclxuXHRcdFx0XHRcdC5qb2luKFwiXFxuXCIpO1xyXG5cclxuXHRcdFx0XHR0ZXh0LnNldFZhbHVlKG1hcHBpbmdUZXh0KS5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdGNvbnN0IG1hcHBpbmc6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcclxuXHRcdFx0XHRcdGNvbnN0IGxpbmVzID0gdmFsdWVcclxuXHRcdFx0XHRcdFx0LnNwbGl0KFwiXFxuXCIpXHJcblx0XHRcdFx0XHRcdC5maWx0ZXIoKGxpbmUpID0+IGxpbmUudHJpbSgpKTtcclxuXHJcblx0XHRcdFx0XHRmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgW2NhdGVnb3J5LCBzdGF0dXNdID0gbGluZVxyXG5cdFx0XHRcdFx0XHRcdC5zcGxpdChcIjpcIilcclxuXHRcdFx0XHRcdFx0XHQubWFwKChzKSA9PiBzLnRyaW0oKSk7XHJcblx0XHRcdFx0XHRcdGlmIChjYXRlZ29yeSAmJiBzdGF0dXMpIHtcclxuXHRcdFx0XHRcdFx0XHRtYXBwaW5nW2NhdGVnb3J5XSA9IHN0YXR1cztcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdGlmIChPYmplY3Qua2V5cyhtYXBwaW5nKS5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMuc291cmNlLnN0YXR1c01hcHBpbmchLnByb3BlcnR5UnVsZXMhLmNhdGVnb3J5TWFwcGluZyA9XHJcblx0XHRcdFx0XHRcdFx0bWFwcGluZztcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdGRlbGV0ZSB0aGlzLnNvdXJjZS5zdGF0dXNNYXBwaW5nIS5wcm9wZXJ0eVJ1bGVzIVxyXG5cdFx0XHRcdFx0XHRcdC5jYXRlZ29yeU1hcHBpbmc7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSB2YWxpZGF0ZVNvdXJjZSgpOiBib29sZWFuIHtcclxuXHRcdGlmICghdGhpcy5zb3VyY2UubmFtZS50cmltKCkpIHtcclxuXHRcdFx0bmV3IE5vdGljZSh0KFwiUGxlYXNlIGVudGVyIGEgbmFtZSBmb3IgdGhlIHNvdXJjZVwiKSk7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoIXRoaXMuc291cmNlLnVybC50cmltKCkpIHtcclxuXHRcdFx0bmV3IE5vdGljZSh0KFwiUGxlYXNlIGVudGVyIGEgVVJMIGZvciB0aGUgc291cmNlXCIpKTtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFVzZSBXZWJjYWxVcmxDb252ZXJ0ZXIgZm9yIFVSTCB2YWxpZGF0aW9uXHJcblx0XHRjb25zdCBjb252ZXJzaW9uUmVzdWx0ID0gV2ViY2FsVXJsQ29udmVydGVyLmNvbnZlcnRXZWJjYWxVcmwoXHJcblx0XHRcdHRoaXMuc291cmNlLnVybFxyXG5cdFx0KTtcclxuXHRcdGlmICghY29udmVyc2lvblJlc3VsdC5zdWNjZXNzKSB7XHJcblx0XHRcdG5ldyBOb3RpY2UoXHJcblx0XHRcdFx0dChcIlBsZWFzZSBlbnRlciBhIHZhbGlkIFVSTFwiKSArIFwiOiBcIiArIGNvbnZlcnNpb25SZXN1bHQuZXJyb3JcclxuXHRcdFx0KTtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0cnVlO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBnZW5lcmF0ZUlkKCk6IHN0cmluZyB7XHJcblx0XHRyZXR1cm4gYGljcy0ke0RhdGUubm93KCl9LSR7TWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIDkpfWA7XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICogTW9kYWwgZm9yIGFkZGluZy9lZGl0aW5nIHRleHQgcmVwbGFjZW1lbnQgcnVsZXNcclxuICovXHJcbmNsYXNzIFRleHRSZXBsYWNlbWVudE1vZGFsIGV4dGVuZHMgTW9kYWwge1xyXG5cdHByaXZhdGUgcnVsZTogSWNzVGV4dFJlcGxhY2VtZW50O1xyXG5cdHByaXZhdGUgb25TYXZlOiAocnVsZTogSWNzVGV4dFJlcGxhY2VtZW50KSA9PiB2b2lkO1xyXG5cdHByaXZhdGUgaXNFZGl0aW5nOiBib29sZWFuO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdGFwcDogQXBwLFxyXG5cdFx0b25TYXZlOiAocnVsZTogSWNzVGV4dFJlcGxhY2VtZW50KSA9PiB2b2lkLFxyXG5cdFx0ZXhpc3RpbmdSdWxlPzogSWNzVGV4dFJlcGxhY2VtZW50XHJcblx0KSB7XHJcblx0XHRzdXBlcihhcHApO1xyXG5cdFx0dGhpcy5vblNhdmUgPSBvblNhdmU7XHJcblx0XHR0aGlzLmlzRWRpdGluZyA9ICEhZXhpc3RpbmdSdWxlO1xyXG5cdFx0dGhpcy5tb2RhbEVsLmFkZENsYXNzKFwiaWNzLXRleHQtcmVwbGFjZW1lbnQtbW9kYWxcIik7XHJcblx0XHRpZiAoZXhpc3RpbmdSdWxlKSB7XHJcblx0XHRcdHRoaXMucnVsZSA9IHsgLi4uZXhpc3RpbmdSdWxlIH07XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLnJ1bGUgPSB7XHJcblx0XHRcdFx0aWQ6IHRoaXMuZ2VuZXJhdGVJZCgpLFxyXG5cdFx0XHRcdG5hbWU6IFwiXCIsXHJcblx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHR0YXJnZXQ6IFwic3VtbWFyeVwiLFxyXG5cdFx0XHRcdHBhdHRlcm46IFwiXCIsXHJcblx0XHRcdFx0cmVwbGFjZW1lbnQ6IFwiXCIsXHJcblx0XHRcdFx0ZmxhZ3M6IFwiZ1wiLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0b25PcGVuKCk6IHZvaWQge1xyXG5cdFx0Y29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcblx0XHRjb250ZW50RWwuZW1wdHkoKTtcclxuXHJcblx0XHRjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7XHJcblx0XHRcdHRleHQ6IHRoaXMuaXNFZGl0aW5nXHJcblx0XHRcdFx0PyB0KFwiRWRpdCBUZXh0IFJlcGxhY2VtZW50IFJ1bGVcIilcclxuXHRcdFx0XHQ6IHQoXCJBZGQgVGV4dCBSZXBsYWNlbWVudCBSdWxlXCIpLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gUnVsZSBuYW1lXHJcblx0XHRuZXcgU2V0dGluZyhjb250ZW50RWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJSdWxlIE5hbWVcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJEZXNjcmlwdGl2ZSBuYW1lIGZvciB0aGlzIHJlcGxhY2VtZW50IHJ1bGVcIikpXHJcblx0XHRcdC5hZGRUZXh0KCh0ZXh0KSA9PiB7XHJcblx0XHRcdFx0dGV4dC5zZXRQbGFjZWhvbGRlcih0KFwiUmVtb3ZlIE1lZXRpbmcgUHJlZml4XCIpKVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKHRoaXMucnVsZS5uYW1lKVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnJ1bGUubmFtZSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdC8vIEVuYWJsZWRcclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcclxuXHRcdFx0LnNldE5hbWUodChcIkVuYWJsZWRcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJXaGV0aGVyIHRoaXMgcnVsZSBpcyBhY3RpdmVcIikpXHJcblx0XHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xyXG5cdFx0XHRcdHRvZ2dsZS5zZXRWYWx1ZSh0aGlzLnJ1bGUuZW5hYmxlZCkub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLnJ1bGUuZW5hYmxlZCA9IHZhbHVlO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHQvLyBUYXJnZXQgZmllbGRcclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcclxuXHRcdFx0LnNldE5hbWUodChcIlRhcmdldCBGaWVsZFwiKSlcclxuXHRcdFx0LnNldERlc2ModChcIldoaWNoIGZpZWxkIHRvIGFwcGx5IHRoZSByZXBsYWNlbWVudCB0b1wiKSlcclxuXHRcdFx0LmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xyXG5cdFx0XHRcdGRyb3Bkb3duXHJcblx0XHRcdFx0XHQuYWRkT3B0aW9uKFwic3VtbWFyeVwiLCB0KFwiU3VtbWFyeS9UaXRsZVwiKSlcclxuXHRcdFx0XHRcdC5hZGRPcHRpb24oXCJkZXNjcmlwdGlvblwiLCB0KFwiRGVzY3JpcHRpb25cIikpXHJcblx0XHRcdFx0XHQuYWRkT3B0aW9uKFwibG9jYXRpb25cIiwgdChcIkxvY2F0aW9uXCIpKVxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcImFsbFwiLCB0KFwiQWxsIEZpZWxkc1wiKSlcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZSh0aGlzLnJ1bGUudGFyZ2V0KVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnJ1bGUudGFyZ2V0ID0gdmFsdWUgYXNcclxuXHRcdFx0XHRcdFx0XHR8IFwic3VtbWFyeVwiXHJcblx0XHRcdFx0XHRcdFx0fCBcImRlc2NyaXB0aW9uXCJcclxuXHRcdFx0XHRcdFx0XHR8IFwibG9jYXRpb25cIlxyXG5cdFx0XHRcdFx0XHRcdHwgXCJhbGxcIjtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHQvLyBTdG9yZSByZWZlcmVuY2VzIHRvIHVwZGF0ZSB0ZXN0IG91dHB1dFxyXG5cdFx0bGV0IHRlc3RJbnB1dDogVGV4dENvbXBvbmVudDtcclxuXHRcdGxldCB0ZXN0T3V0cHV0OiBIVE1MRWxlbWVudDtcclxuXHJcblx0XHQvLyBEZWZpbmUgdGhlIHVwZGF0ZSBmdW5jdGlvblxyXG5cdFx0Y29uc3QgdXBkYXRlVGVzdE91dHB1dCA9IChpbnB1dDogc3RyaW5nKSA9PiB7XHJcblx0XHRcdGlmICghdGVzdE91dHB1dCkgcmV0dXJuO1xyXG5cclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRpZiAodGhpcy5ydWxlLnBhdHRlcm4gJiYgaW5wdXQpIHtcclxuXHRcdFx0XHRcdGNvbnN0IHJlZ2V4ID0gbmV3IFJlZ0V4cChcclxuXHRcdFx0XHRcdFx0dGhpcy5ydWxlLnBhdHRlcm4sXHJcblx0XHRcdFx0XHRcdHRoaXMucnVsZS5mbGFncyB8fCBcImdcIlxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdGNvbnN0IHJlc3VsdCA9IGlucHV0LnJlcGxhY2UocmVnZXgsIHRoaXMucnVsZS5yZXBsYWNlbWVudCk7XHJcblx0XHRcdFx0XHRjb25zdCByZXN1bHRTcGFuID0gdGVzdE91dHB1dC5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRcdFx0XHRcIi50ZXN0LXJlc3VsdFwiXHJcblx0XHRcdFx0XHQpIGFzIEhUTUxFbGVtZW50O1xyXG5cdFx0XHRcdFx0aWYgKHJlc3VsdFNwYW4pIHtcclxuXHRcdFx0XHRcdFx0cmVzdWx0U3Bhbi50ZXh0Q29udGVudCA9IHJlc3VsdDtcclxuXHRcdFx0XHRcdFx0cmVzdWx0U3Bhbi5zdHlsZS5jb2xvciA9XHJcblx0XHRcdFx0XHRcdFx0cmVzdWx0ICE9PSBpbnB1dCA/IFwiIzRjYWY1MFwiIDogXCIjNjY2XCI7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGNvbnN0IHJlc3VsdFNwYW4gPSB0ZXN0T3V0cHV0LnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFx0XHRcdFwiLnRlc3QtcmVzdWx0XCJcclxuXHRcdFx0XHRcdCkgYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRcdFx0XHRpZiAocmVzdWx0U3Bhbikge1xyXG5cdFx0XHRcdFx0XHRyZXN1bHRTcGFuLnRleHRDb250ZW50ID0gaW5wdXQgfHwgXCJcIjtcclxuXHRcdFx0XHRcdFx0cmVzdWx0U3Bhbi5zdHlsZS5jb2xvciA9IFwiIzY2NlwiO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRjb25zdCByZXN1bHRTcGFuID0gdGVzdE91dHB1dC5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRcdFx0XCIudGVzdC1yZXN1bHRcIlxyXG5cdFx0XHRcdCkgYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRcdFx0aWYgKHJlc3VsdFNwYW4pIHtcclxuXHRcdFx0XHRcdHJlc3VsdFNwYW4udGV4dENvbnRlbnQgPSBcIkludmFsaWQgcmVnZXggcGF0dGVyblwiO1xyXG5cdFx0XHRcdFx0cmVzdWx0U3Bhbi5zdHlsZS5jb2xvciA9IFwiI2Y0NDMzNlwiO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBQYXR0ZXJuXHJcblx0XHRuZXcgU2V0dGluZyhjb250ZW50RWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJQYXR0ZXJuIChSZWd1bGFyIEV4cHJlc3Npb24pXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XCJSZWd1bGFyIGV4cHJlc3Npb24gcGF0dGVybiB0byBtYXRjaC4gVXNlIHBhcmVudGhlc2VzIGZvciBjYXB0dXJlIGdyb3Vwcy5cIlxyXG5cdFx0XHRcdClcclxuXHRcdFx0KVxyXG5cdFx0XHQuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHRcdHRleHQuc2V0UGxhY2Vob2xkZXIoXCJeTWVldGluZzogXCIpXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUodGhpcy5ydWxlLnBhdHRlcm4pXHJcblx0XHRcdFx0XHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMucnVsZS5wYXR0ZXJuID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdGlmICh0ZXN0SW5wdXQgJiYgdGVzdElucHV0LmdldFZhbHVlKCkpIHtcclxuXHRcdFx0XHRcdFx0XHR1cGRhdGVUZXN0T3V0cHV0KHRlc3RJbnB1dC5nZXRWYWx1ZSgpKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdC8vIFJlcGxhY2VtZW50XHJcblx0XHRuZXcgU2V0dGluZyhjb250ZW50RWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJSZXBsYWNlbWVudFwiKSlcclxuXHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFwiVGV4dCB0byByZXBsYWNlIG1hdGNoZXMgd2l0aC4gVXNlICQxLCAkMiwgZXRjLiBmb3IgY2FwdHVyZSBncm91cHMuXCJcclxuXHRcdFx0XHQpXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0XHR0ZXh0LnNldFBsYWNlaG9sZGVyKFwiXCIpXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUodGhpcy5ydWxlLnJlcGxhY2VtZW50KVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnJ1bGUucmVwbGFjZW1lbnQgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0aWYgKHRlc3RJbnB1dCAmJiB0ZXN0SW5wdXQuZ2V0VmFsdWUoKSkge1xyXG5cdFx0XHRcdFx0XHRcdHVwZGF0ZVRlc3RPdXRwdXQodGVzdElucHV0LmdldFZhbHVlKCkpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gRmxhZ3NcclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcclxuXHRcdFx0LnNldE5hbWUodChcIlJlZ2V4IEZsYWdzXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XCJSZWd1bGFyIGV4cHJlc3Npb24gZmxhZ3MgKGUuZy4sICdnJyBmb3IgZ2xvYmFsLCAnaScgZm9yIGNhc2UtaW5zZW5zaXRpdmUpXCJcclxuXHRcdFx0XHQpXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0XHR0ZXh0LnNldFBsYWNlaG9sZGVyKFwiZ1wiKVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKHRoaXMucnVsZS5mbGFncyB8fCBcIlwiKVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnJ1bGUuZmxhZ3MgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0aWYgKHRlc3RJbnB1dCAmJiB0ZXN0SW5wdXQuZ2V0VmFsdWUoKSkge1xyXG5cdFx0XHRcdFx0XHRcdHVwZGF0ZVRlc3RPdXRwdXQodGVzdElucHV0LmdldFZhbHVlKCkpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gRXhhbXBsZXMgc2VjdGlvblxyXG5cdFx0Y29uc3QgZXhhbXBsZXNDb250YWluZXIgPSBjb250ZW50RWwuY3JlYXRlRGl2KCk7XHJcblx0XHRleGFtcGxlc0NvbnRhaW5lci5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogdChcIkV4YW1wbGVzXCIpIH0pO1xyXG5cclxuXHRcdGNvbnN0IGV4YW1wbGVzTGlzdCA9IGV4YW1wbGVzQ29udGFpbmVyLmNyZWF0ZUVsKFwidWxcIik7XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIHByZWZpeCBleGFtcGxlXHJcblx0XHRjb25zdCBleGFtcGxlMSA9IGV4YW1wbGVzTGlzdC5jcmVhdGVFbChcImxpXCIpO1xyXG5cdFx0ZXhhbXBsZTEuY3JlYXRlRWwoXCJzdHJvbmdcIiwgeyB0ZXh0OiB0KFwiUmVtb3ZlIHByZWZpeFwiKSArIFwiOiBcIiB9KTtcclxuXHRcdGV4YW1wbGUxLmNyZWF0ZVNwYW4oeyB0ZXh0OiBcIlBhdHRlcm46IFwiIH0pO1xyXG5cdFx0ZXhhbXBsZTEuY3JlYXRlRWwoXCJjb2RlXCIsIHsgdGV4dDogXCJeTWVldGluZzogXCIgfSk7XHJcblx0XHRleGFtcGxlMS5jcmVhdGVTcGFuKHsgdGV4dDogXCIsIFJlcGxhY2VtZW50OiBcIiB9KTtcclxuXHRcdGV4YW1wbGUxLmNyZWF0ZUVsKFwiY29kZVwiLCB7IHRleHQ6IFwiXCIgfSk7XHJcblxyXG5cdFx0Ly8gUmVwbGFjZSByb29tIG51bWJlcnMgZXhhbXBsZVxyXG5cdFx0Y29uc3QgZXhhbXBsZTIgPSBleGFtcGxlc0xpc3QuY3JlYXRlRWwoXCJsaVwiKTtcclxuXHRcdGV4YW1wbGUyLmNyZWF0ZUVsKFwic3Ryb25nXCIsIHsgdGV4dDogdChcIlJlcGxhY2Ugcm9vbSBudW1iZXJzXCIpICsgXCI6IFwiIH0pO1xyXG5cdFx0ZXhhbXBsZTIuY3JlYXRlU3Bhbih7IHRleHQ6IFwiUGF0dGVybjogXCIgfSk7XHJcblx0XHRleGFtcGxlMi5jcmVhdGVFbChcImNvZGVcIiwgeyB0ZXh0OiBcIlJvb20gKFxcXFxkKylcIiB9KTtcclxuXHRcdGV4YW1wbGUyLmNyZWF0ZVNwYW4oeyB0ZXh0OiBcIiwgUmVwbGFjZW1lbnQ6IFwiIH0pO1xyXG5cdFx0ZXhhbXBsZTIuY3JlYXRlRWwoXCJjb2RlXCIsIHsgdGV4dDogXCJDb25mZXJlbmNlIFJvb20gJDFcIiB9KTtcclxuXHJcblx0XHQvLyBTd2FwIHdvcmRzIGV4YW1wbGVcclxuXHRcdGNvbnN0IGV4YW1wbGUzID0gZXhhbXBsZXNMaXN0LmNyZWF0ZUVsKFwibGlcIik7XHJcblx0XHRleGFtcGxlMy5jcmVhdGVFbChcInN0cm9uZ1wiLCB7IHRleHQ6IHQoXCJTd2FwIHdvcmRzXCIpICsgXCI6IFwiIH0pO1xyXG5cdFx0ZXhhbXBsZTMuY3JlYXRlU3Bhbih7IHRleHQ6IFwiUGF0dGVybjogXCIgfSk7XHJcblx0XHRleGFtcGxlMy5jcmVhdGVFbChcImNvZGVcIiwgeyB0ZXh0OiBcIihcXFxcdyspIHdpdGggKFxcXFx3KylcIiB9KTtcclxuXHRcdGV4YW1wbGUzLmNyZWF0ZVNwYW4oeyB0ZXh0OiBcIiwgUmVwbGFjZW1lbnQ6IFwiIH0pO1xyXG5cdFx0ZXhhbXBsZTMuY3JlYXRlRWwoXCJjb2RlXCIsIHsgdGV4dDogXCIkMiBhbmQgJDFcIiB9KTtcclxuXHJcblx0XHQvLyBUZXN0IHNlY3Rpb25cclxuXHRcdGNvbnN0IHRlc3RDb250YWluZXIgPSBjb250ZW50RWwuY3JlYXRlRGl2KCk7XHJcblx0XHR0ZXN0Q29udGFpbmVyLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiB0KFwiVGVzdCBSdWxlXCIpIH0pO1xyXG5cclxuXHRcdC8vIENyZWF0ZSB0ZXN0IG91dHB1dCBmaXJzdFxyXG5cdFx0dGVzdE91dHB1dCA9IHRlc3RDb250YWluZXIuY3JlYXRlRGl2KFwidGVzdC1vdXRwdXRcIik7XHJcblx0XHR0ZXN0T3V0cHV0LmNyZWF0ZUVsKFwic3Ryb25nXCIsIHsgdGV4dDogdChcIk91dHB1dDogXCIpIH0pO1xyXG5cdFx0Y29uc3Qgb3V0cHV0VGV4dCA9IHRlc3RPdXRwdXQuY3JlYXRlRWwoXCJzcGFuXCIsIHsgY2xzOiBcInRlc3QtcmVzdWx0XCIgfSk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIHRlc3QgaW5wdXRcclxuXHRcdG5ldyBTZXR0aW5nKHRlc3RDb250YWluZXIpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJUZXN0IElucHV0XCIpKVxyXG5cdFx0XHQuc2V0RGVzYyh0KFwiRW50ZXIgdGV4dCB0byB0ZXN0IHRoZSByZXBsYWNlbWVudCBydWxlXCIpKVxyXG5cdFx0XHQuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHRcdHRlc3RJbnB1dCA9IHRleHQ7XHJcblx0XHRcdFx0dGV4dC5zZXRQbGFjZWhvbGRlcihcIk1lZXRpbmc6IFdlZWtseSBTdGFuZHVwXCIpLm9uQ2hhbmdlKFxyXG5cdFx0XHRcdFx0KHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdHVwZGF0ZVRlc3RPdXRwdXQodmFsdWUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdC8vIEJ1dHRvbnNcclxuXHRcdGNvbnN0IGJ1dHRvbkNvbnRhaW5lciA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoXCJtb2RhbC1idXR0b24tY29udGFpbmVyXCIpO1xyXG5cclxuXHRcdGNvbnN0IHNhdmVCdXR0b24gPSBidXR0b25Db250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFwiU2F2ZVwiKSxcclxuXHRcdFx0Y2xzOiBcIm1vZC1jdGFcIixcclxuXHRcdH0pO1xyXG5cdFx0c2F2ZUJ1dHRvbi5vbmNsaWNrID0gKCkgPT4ge1xyXG5cdFx0XHRpZiAodGhpcy52YWxpZGF0ZVJ1bGUoKSkge1xyXG5cdFx0XHRcdHRoaXMub25TYXZlKHRoaXMucnVsZSk7XHJcblx0XHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdGNvbnN0IGNhbmNlbEJ1dHRvbiA9IGJ1dHRvbkNvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXCJDYW5jZWxcIiksXHJcblx0XHR9KTtcclxuXHRcdGNhbmNlbEJ1dHRvbi5vbmNsaWNrID0gKCkgPT4ge1xyXG5cdFx0XHR0aGlzLmNsb3NlKCk7XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSB2YWxpZGF0ZVJ1bGUoKTogYm9vbGVhbiB7XHJcblx0XHRpZiAoIXRoaXMucnVsZS5uYW1lLnRyaW0oKSkge1xyXG5cdFx0XHRuZXcgTm90aWNlKHQoXCJQbGVhc2UgZW50ZXIgYSBuYW1lIGZvciB0aGUgcnVsZVwiKSk7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoIXRoaXMucnVsZS5wYXR0ZXJuLnRyaW0oKSkge1xyXG5cdFx0XHRuZXcgTm90aWNlKHQoXCJQbGVhc2UgZW50ZXIgYSBwYXR0ZXJuXCIpKTtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFRlc3QgaWYgdGhlIHJlZ2V4IHBhdHRlcm4gaXMgdmFsaWRcclxuXHRcdHRyeSB7XHJcblx0XHRcdG5ldyBSZWdFeHAodGhpcy5ydWxlLnBhdHRlcm4sIHRoaXMucnVsZS5mbGFncyB8fCBcImdcIik7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRuZXcgTm90aWNlKHQoXCJJbnZhbGlkIHJlZ3VsYXIgZXhwcmVzc2lvbiBwYXR0ZXJuXCIpKTtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0cnVlO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBnZW5lcmF0ZUlkKCk6IHN0cmluZyB7XHJcblx0XHRyZXR1cm4gYHJ1bGUtJHtEYXRlLm5vdygpfS0ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA5KX1gO1xyXG5cdH1cclxufVxyXG4iXX0=