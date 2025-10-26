import { __awaiter } from "tslib";
import { Setting } from "obsidian";
import { t } from "@/translations/helper";
export function renderProjectSettingsTab(settingTab, containerEl) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    new Setting(containerEl)
        .setName(t("Project Management"))
        .setDesc(t("Configure project display, organization and metadata mappings"))
        .setHeading();
    // Initialize projectConfig if it doesn't exist
    if (!settingTab.plugin.settings.projectConfig) {
        settingTab.plugin.settings.projectConfig = {
            enableEnhancedProject: false,
            pathMappings: [],
            metadataConfig: {
                metadataKey: "project",
                enabled: false,
            },
            configFile: {
                fileName: "project.md",
                searchRecursively: true,
                enabled: false,
            },
            metadataMappings: [],
            defaultProjectNaming: {
                strategy: "filename",
                stripExtension: true,
                enabled: false,
            },
        };
    }
    // Main enhanced project features toggle
    new Setting(containerEl)
        .setName(t("Enable project features"))
        .setDesc(t("Enable path-based, metadata-based, and config file-based project detection"))
        .addToggle((toggle) => {
        var _a;
        toggle
            .setValue(((_a = settingTab.plugin.settings.projectConfig) === null || _a === void 0 ? void 0 : _a.enableEnhancedProject) || false)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            if (!settingTab.plugin.settings.projectConfig) {
                settingTab.plugin.settings.projectConfig = {
                    enableEnhancedProject: false,
                    pathMappings: [],
                    metadataConfig: {
                        metadataKey: "project",
                        enabled: false,
                    },
                    configFile: {
                        fileName: "project.md",
                        searchRecursively: true,
                        enabled: false,
                    },
                    metadataMappings: [],
                    defaultProjectNaming: {
                        strategy: "filename",
                        stripExtension: true,
                        enabled: false,
                    },
                };
            }
            settingTab.plugin.settings.projectConfig.enableEnhancedProject =
                value;
            yield settingTab.plugin.saveSettings();
            setTimeout(() => {
                settingTab.display();
            }, 200);
        }));
    });
    if ((_a = settingTab.plugin.settings.projectConfig) === null || _a === void 0 ? void 0 : _a.enableEnhancedProject) {
        // Always show project management settings
        new Setting(containerEl)
            .setName(t("Path-based Project Mappings"))
            .setDesc(t("Configure project names based on file paths"))
            .setHeading();
        const pathMappingsContainer = containerEl.createDiv({
            cls: "project-path-mappings-container",
        });
        const refreshPathMappings = () => {
            var _a;
            pathMappingsContainer.empty();
            // Ensure pathMappings is always an array
            if (!settingTab.plugin.settings.projectConfig) {
                settingTab.plugin.settings.projectConfig = {
                    enableEnhancedProject: false,
                    pathMappings: [],
                    metadataConfig: {
                        metadataKey: "project",
                        enabled: false,
                    },
                    configFile: {
                        fileName: "project.md",
                        searchRecursively: true,
                        enabled: false,
                    },
                    metadataMappings: [],
                    defaultProjectNaming: {
                        strategy: "filename",
                        stripExtension: true,
                        enabled: false,
                    },
                };
            }
            if (!settingTab.plugin.settings.projectConfig.pathMappings ||
                !Array.isArray(settingTab.plugin.settings.projectConfig.pathMappings)) {
                settingTab.plugin.settings.projectConfig.pathMappings = [];
            }
            const pathMappings = ((_a = settingTab.plugin.settings.projectConfig) === null || _a === void 0 ? void 0 : _a.pathMappings) || [];
            if (pathMappings.length === 0) {
                pathMappingsContainer.createDiv({
                    cls: "no-mappings-message",
                    text: t("No path mappings configured yet."),
                });
            }
            pathMappings.forEach((mapping, index) => {
                const mappingRow = pathMappingsContainer.createDiv({
                    cls: "project-path-mapping-row",
                });
                new Setting(mappingRow)
                    .setName(`${t("Mapping")} ${index + 1}`)
                    .addText((text) => {
                    text.setPlaceholder(t("Path pattern (e.g., Projects/Work)"))
                        .setValue(mapping.pathPattern)
                        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                        if (settingTab.plugin.settings.projectConfig) {
                            settingTab.plugin.settings.projectConfig.pathMappings[index].pathPattern = value;
                            yield settingTab.plugin.saveSettings();
                        }
                    }));
                })
                    .addText((text) => {
                    text.setPlaceholder(t("Project name"))
                        .setValue(mapping.projectName)
                        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                        if (settingTab.plugin.settings.projectConfig) {
                            settingTab.plugin.settings.projectConfig.pathMappings[index].projectName = value;
                            yield settingTab.plugin.saveSettings();
                        }
                    }));
                })
                    .addToggle((toggle) => {
                    toggle
                        .setTooltip(t("Enabled"))
                        .setValue(mapping.enabled)
                        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                        if (settingTab.plugin.settings.projectConfig) {
                            settingTab.plugin.settings.projectConfig.pathMappings[index].enabled = value;
                            yield settingTab.plugin.saveSettings();
                        }
                    }));
                })
                    .addButton((button) => {
                    button
                        .setIcon("trash")
                        .setTooltip(t("Remove"))
                        .onClick(() => __awaiter(this, void 0, void 0, function* () {
                        if (settingTab.plugin.settings.projectConfig) {
                            settingTab.plugin.settings.projectConfig.pathMappings.splice(index, 1);
                            yield settingTab.plugin.saveSettings();
                            refreshPathMappings();
                        }
                    }));
                });
            });
            // Add new mapping button
            new Setting(pathMappingsContainer).addButton((button) => {
                button
                    .setButtonText(t("Add Path Mapping"))
                    .setCta()
                    .onClick(() => __awaiter(this, void 0, void 0, function* () {
                    // Ensure projectConfig exists
                    if (!settingTab.plugin.settings.projectConfig) {
                        settingTab.plugin.settings.projectConfig = {
                            enableEnhancedProject: true,
                            pathMappings: [],
                            metadataConfig: {
                                metadataKey: "project",
                                enabled: false,
                            },
                            configFile: {
                                fileName: "project.md",
                                searchRecursively: true,
                                enabled: false,
                            },
                            metadataMappings: [],
                            defaultProjectNaming: {
                                strategy: "filename",
                                stripExtension: true,
                                enabled: false,
                            },
                        };
                    }
                    // Ensure pathMappings is an array
                    if (!Array.isArray(settingTab.plugin.settings.projectConfig
                        .pathMappings)) {
                        settingTab.plugin.settings.projectConfig.pathMappings =
                            [];
                    }
                    // Add new mapping
                    settingTab.plugin.settings.projectConfig.pathMappings.push({
                        pathPattern: "",
                        projectName: "",
                        enabled: true,
                    });
                    yield settingTab.plugin.saveSettings();
                    setTimeout(() => {
                        refreshPathMappings();
                    }, 100);
                }));
            });
        };
        refreshPathMappings();
        // Metadata-based project detection settings
        new Setting(containerEl)
            .setName(t("Metadata-based Project Detection"))
            .setDesc(t("Configure project detection from file frontmatter"))
            .setHeading();
        new Setting(containerEl)
            .setName(t("Enable metadata project detection"))
            .setDesc(t("Detect project from file frontmatter metadata"))
            .addToggle((toggle) => {
            var _a, _b;
            toggle
                .setValue(((_b = (_a = settingTab.plugin.settings.projectConfig) === null || _a === void 0 ? void 0 : _a.metadataConfig) === null || _b === void 0 ? void 0 : _b.enabled) || false)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                var _c;
                if ((_c = settingTab.plugin.settings.projectConfig) === null || _c === void 0 ? void 0 : _c.metadataConfig) {
                    settingTab.plugin.settings.projectConfig.metadataConfig.enabled =
                        value;
                    yield settingTab.plugin.saveSettings();
                }
            }));
        });
        new Setting(containerEl)
            .setName(t("Metadata key"))
            .setDesc(t("The frontmatter key to use for project name"))
            .addText((text) => {
            var _a, _b;
            text.setPlaceholder("project")
                .setValue(((_b = (_a = settingTab.plugin.settings.projectConfig) === null || _a === void 0 ? void 0 : _a.metadataConfig) === null || _b === void 0 ? void 0 : _b.metadataKey) || "project")
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                var _c;
                if ((_c = settingTab.plugin.settings.projectConfig) === null || _c === void 0 ? void 0 : _c.metadataConfig) {
                    settingTab.plugin.settings.projectConfig.metadataConfig.metadataKey =
                        value || "project";
                    yield settingTab.plugin.saveSettings();
                }
            }));
        });
        // Config file-based project detection settings
        new Setting(containerEl)
            .setName(t("Config File-based Project Detection"))
            .setDesc(t("Configure project detection from project configuration files"))
            .setHeading();
        new Setting(containerEl)
            .setName(t("Enable config file project detection"))
            .setDesc(t("Detect project from project configuration files"))
            .addToggle((toggle) => {
            var _a, _b;
            toggle
                .setValue(((_b = (_a = settingTab.plugin.settings.projectConfig) === null || _a === void 0 ? void 0 : _a.configFile) === null || _b === void 0 ? void 0 : _b.enabled) || false)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                var _c;
                if ((_c = settingTab.plugin.settings.projectConfig) === null || _c === void 0 ? void 0 : _c.configFile) {
                    settingTab.plugin.settings.projectConfig.configFile.enabled =
                        value;
                    yield settingTab.plugin.saveSettings();
                }
            }));
        });
        new Setting(containerEl)
            .setName(t("Config file name"))
            .setDesc(t("Name of the project configuration file"))
            .addText((text) => {
            var _a, _b;
            text.setPlaceholder("project.md")
                .setValue(((_b = (_a = settingTab.plugin.settings.projectConfig) === null || _a === void 0 ? void 0 : _a.configFile) === null || _b === void 0 ? void 0 : _b.fileName) || "project.md")
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                var _c;
                if ((_c = settingTab.plugin.settings.projectConfig) === null || _c === void 0 ? void 0 : _c.configFile) {
                    settingTab.plugin.settings.projectConfig.configFile.fileName =
                        value || "project.md";
                    yield settingTab.plugin.saveSettings();
                }
            }));
        });
        // Custom Project Detection Methods
        new Setting(containerEl)
            .setName(t("Custom Project Detection Methods"))
            .setDesc(t("Configure additional methods to detect project files"))
            .setHeading();
        const detectionMethodsContainer = containerEl.createDiv({
            cls: "project-detection-methods-container",
        });
        const refreshDetectionMethods = () => {
            var _a, _b, _c, _d, _e;
            detectionMethodsContainer.empty();
            // Ensure detectionMethods exists
            if (!((_b = (_a = settingTab.plugin.settings.projectConfig) === null || _a === void 0 ? void 0 : _a.metadataConfig) === null || _b === void 0 ? void 0 : _b.detectionMethods)) {
                if ((_c = settingTab.plugin.settings.projectConfig) === null || _c === void 0 ? void 0 : _c.metadataConfig) {
                    settingTab.plugin.settings.projectConfig.metadataConfig.detectionMethods =
                        [];
                }
            }
            const methods = ((_e = (_d = settingTab.plugin.settings.projectConfig) === null || _d === void 0 ? void 0 : _d.metadataConfig) === null || _e === void 0 ? void 0 : _e.detectionMethods) || [];
            methods.forEach((method, index) => {
                const methodDiv = detectionMethodsContainer.createDiv({
                    cls: "project-detection-method",
                });
                new Setting(methodDiv)
                    .setName(`${t("Method")} ${index + 1}`)
                    .addDropdown((dropdown) => {
                    dropdown
                        .addOption("metadata", t("Metadata Property"))
                        .addOption("tag", t("Tag"))
                        .addOption("link", t("Linked Note"))
                        .setValue(method.type)
                        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                        method.type = value;
                        yield settingTab.plugin.saveSettings();
                        refreshDetectionMethods();
                    }));
                })
                    .addText((text) => {
                    const placeholder = method.type === "metadata"
                        ? "project"
                        : method.type === "tag"
                            ? "project"
                            : "category";
                    text.setPlaceholder(placeholder)
                        .setValue(method.propertyKey)
                        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                        method.propertyKey = value;
                        yield settingTab.plugin.saveSettings();
                    }));
                })
                    .addToggle((toggle) => {
                    toggle
                        .setValue(method.enabled)
                        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                        method.enabled = value;
                        yield settingTab.plugin.saveSettings();
                    }));
                })
                    .addButton((button) => {
                    button
                        .setIcon("trash")
                        .setTooltip(t("Remove"))
                        .onClick(() => __awaiter(this, void 0, void 0, function* () {
                        methods.splice(index, 1);
                        yield settingTab.plugin.saveSettings();
                        refreshDetectionMethods();
                    }));
                });
                // Add link filter field for link type
                if (method.type === "link") {
                    new Setting(methodDiv)
                        .setName(t("Link Filter"))
                        .setDesc(t("Optional: Only match links containing this text"))
                        .addText((text) => {
                        text.setPlaceholder("Projects/")
                            .setValue(method.linkFilter || "")
                            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                            method.linkFilter = value;
                            yield settingTab.plugin.saveSettings();
                        }));
                    });
                }
            });
            // Add new method button
            new Setting(detectionMethodsContainer).addButton((button) => {
                button
                    .setButtonText(t("Add Detection Method"))
                    .setCta()
                    .onClick(() => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b, _c, _d, _e, _f;
                    if (!((_b = (_a = settingTab.plugin.settings.projectConfig) === null || _a === void 0 ? void 0 : _a.metadataConfig) === null || _b === void 0 ? void 0 : _b.detectionMethods)) {
                        if ((_c = settingTab.plugin.settings.projectConfig) === null || _c === void 0 ? void 0 : _c.metadataConfig) {
                            settingTab.plugin.settings.projectConfig.metadataConfig.detectionMethods =
                                [];
                        }
                    }
                    (_f = (_e = (_d = settingTab.plugin.settings.projectConfig) === null || _d === void 0 ? void 0 : _d.metadataConfig) === null || _e === void 0 ? void 0 : _e.detectionMethods) === null || _f === void 0 ? void 0 : _f.push({
                        type: "metadata",
                        propertyKey: "",
                        enabled: false,
                    });
                    yield settingTab.plugin.saveSettings();
                    refreshDetectionMethods();
                }));
            });
        };
        refreshDetectionMethods();
        // Metadata mappings section
        new Setting(containerEl)
            .setName(t("Metadata Mappings"))
            .setDesc(t("Configure how metadata fields are mapped and transformed"))
            .setHeading();
        const metadataMappingsContainer = containerEl.createDiv({
            cls: "project-metadata-mappings-container",
        });
        const refreshMetadataMappings = () => {
            var _a, _b;
            metadataMappingsContainer.empty();
            // Ensure metadataMappings is always an array
            if (!((_a = settingTab.plugin.settings.projectConfig) === null || _a === void 0 ? void 0 : _a.metadataMappings) ||
                !Array.isArray(settingTab.plugin.settings.projectConfig.metadataMappings)) {
                if (settingTab.plugin.settings.projectConfig) {
                    settingTab.plugin.settings.projectConfig.metadataMappings =
                        [];
                }
            }
            const metadataMappings = ((_b = settingTab.plugin.settings.projectConfig) === null || _b === void 0 ? void 0 : _b.metadataMappings) ||
                [];
            if (metadataMappings.length === 0) {
                metadataMappingsContainer.createDiv({
                    cls: "no-mappings-message",
                    text: t("No metadata mappings configured yet."),
                });
            }
            metadataMappings.forEach((mapping, index) => {
                const mappingRow = metadataMappingsContainer.createDiv({
                    cls: "project-metadata-mapping-row",
                });
                // Get already used target keys to avoid duplicates
                const usedTargetKeys = new Set(metadataMappings
                    .filter((_, i) => i !== index)
                    .map((m) => m.targetKey)
                    .filter((key) => key && key.trim() !== ""));
                // Available target keys from StandardTaskMetadata
                const availableTargetKeys = [
                    "project",
                    "context",
                    "priority",
                    "tags",
                    "startDate",
                    "scheduledDate",
                    "dueDate",
                    "completedDate",
                    "createdDate",
                    "recurrence",
                ].filter((key) => !usedTargetKeys.has(key) || key === mapping.targetKey);
                new Setting(mappingRow)
                    .setName(`${t("Mapping")} ${index + 1}`)
                    .addText((text) => {
                    text.setPlaceholder(t("Source key (e.g., proj)"))
                        .setValue(mapping.sourceKey)
                        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                        if (settingTab.plugin.settings.projectConfig) {
                            settingTab.plugin.settings.projectConfig.metadataMappings[index].sourceKey = value;
                            yield settingTab.plugin.saveSettings();
                        }
                    }));
                })
                    .addDropdown((dropdown) => {
                    // Add empty option
                    dropdown.addOption("", t("Select target field"));
                    // Add available options
                    availableTargetKeys.forEach((key) => {
                        dropdown.addOption(key, key);
                    });
                    dropdown
                        .setValue(mapping.targetKey)
                        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                        if (settingTab.plugin.settings.projectConfig) {
                            settingTab.plugin.settings.projectConfig.metadataMappings[index].targetKey = value;
                            yield settingTab.plugin.saveSettings();
                            // Refresh to update available options for other dropdowns
                            refreshMetadataMappings();
                        }
                    }));
                })
                    .addToggle((toggle) => {
                    toggle
                        .setTooltip(t("Enabled"))
                        .setValue(mapping.enabled)
                        .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                        if (settingTab.plugin.settings.projectConfig) {
                            settingTab.plugin.settings.projectConfig.metadataMappings[index].enabled = value;
                            yield settingTab.plugin.saveSettings();
                        }
                    }));
                })
                    .addButton((button) => {
                    button
                        .setIcon("trash")
                        .setTooltip(t("Remove"))
                        .onClick(() => __awaiter(this, void 0, void 0, function* () {
                        if (settingTab.plugin.settings.projectConfig) {
                            settingTab.plugin.settings.projectConfig.metadataMappings.splice(index, 1);
                            yield settingTab.plugin.saveSettings();
                            refreshMetadataMappings();
                        }
                    }));
                });
            });
            // Add new mapping button
            new Setting(metadataMappingsContainer).addButton((button) => {
                button
                    .setButtonText(t("Add Metadata Mapping"))
                    .setCta()
                    .onClick(() => __awaiter(this, void 0, void 0, function* () {
                    if (settingTab.plugin.settings.projectConfig) {
                        if (!Array.isArray(settingTab.plugin.settings.projectConfig
                            .metadataMappings)) {
                            settingTab.plugin.settings.projectConfig.metadataMappings =
                                [];
                        }
                        settingTab.plugin.settings.projectConfig.metadataMappings.push({
                            sourceKey: "",
                            targetKey: "",
                            enabled: true,
                        });
                        yield settingTab.plugin.saveSettings();
                        setTimeout(() => {
                            refreshMetadataMappings();
                        }, 100);
                    }
                }));
            });
        };
        refreshMetadataMappings();
        // Default project naming section
        new Setting(containerEl)
            .setName(t("Default Project Naming"))
            .setDesc(t("Configure fallback project naming when no explicit project is found"))
            .setHeading();
        new Setting(containerEl)
            .setName(t("Enable default project naming"))
            .setDesc(t("Use default naming strategy when no project is explicitly defined"))
            .addToggle((toggle) => {
            var _a, _b;
            toggle
                .setValue(((_b = (_a = settingTab.plugin.settings.projectConfig) === null || _a === void 0 ? void 0 : _a.defaultProjectNaming) === null || _b === void 0 ? void 0 : _b.enabled) || false)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                var _c;
                if ((_c = settingTab.plugin.settings.projectConfig) === null || _c === void 0 ? void 0 : _c.defaultProjectNaming) {
                    settingTab.plugin.settings.projectConfig.defaultProjectNaming.enabled =
                        value;
                    yield settingTab.plugin.saveSettings();
                    setTimeout(() => {
                        settingTab.display();
                    }, 200);
                }
            }));
        });
        if (!((_b = settingTab.plugin.settings.projectConfig) === null || _b === void 0 ? void 0 : _b.defaultProjectNaming)) {
            settingTab.plugin.settings.projectConfig.defaultProjectNaming = {
                strategy: "filename",
                stripExtension: true,
                enabled: false,
            };
        }
        new Setting(containerEl)
            .setName(t("Naming strategy"))
            .setDesc(t("Strategy for generating default project names"))
            .addDropdown((dropdown) => {
            var _a, _b;
            dropdown
                .addOption("filename", t("Use filename"))
                .addOption("foldername", t("Use folder name"))
                .addOption("metadata", t("Use metadata field"))
                .setValue(((_b = (_a = settingTab.plugin.settings.projectConfig) === null || _a === void 0 ? void 0 : _a.defaultProjectNaming) === null || _b === void 0 ? void 0 : _b.strategy) || "filename")
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                var _c, _d;
                if (!((_c = settingTab.plugin.settings.projectConfig) === null || _c === void 0 ? void 0 : _c.defaultProjectNaming)) {
                    settingTab.plugin.settings.projectConfig.defaultProjectNaming =
                        {
                            strategy: "filename",
                            stripExtension: true,
                            enabled: false,
                        };
                }
                if ((_d = settingTab.plugin.settings.projectConfig) === null || _d === void 0 ? void 0 : _d.defaultProjectNaming) {
                    settingTab.plugin.settings.projectConfig.defaultProjectNaming.strategy =
                        value;
                    yield settingTab.plugin.saveSettings();
                    // Refresh to show/hide metadata key field
                    setTimeout(() => {
                        settingTab.display();
                    }, 200);
                }
            }));
        });
        console.log((_d = (_c = settingTab.plugin.settings.projectConfig) === null || _c === void 0 ? void 0 : _c.defaultProjectNaming) === null || _d === void 0 ? void 0 : _d.strategy);
        // Show metadata key field only for metadata strategy
        if (((_f = (_e = settingTab.plugin.settings.projectConfig) === null || _e === void 0 ? void 0 : _e.defaultProjectNaming) === null || _f === void 0 ? void 0 : _f.strategy) === "metadata") {
            new Setting(containerEl)
                .setName(t("Metadata key"))
                .setDesc(t("Metadata field to use as project name"))
                .addText((text) => {
                var _a, _b;
                text.setPlaceholder(t("Enter metadata key (e.g., project-name)"))
                    .setValue(((_b = (_a = settingTab.plugin.settings.projectConfig) === null || _a === void 0 ? void 0 : _a.defaultProjectNaming) === null || _b === void 0 ? void 0 : _b.metadataKey) || "")
                    .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                    var _c;
                    if ((_c = settingTab.plugin.settings.projectConfig) === null || _c === void 0 ? void 0 : _c.defaultProjectNaming) {
                        settingTab.plugin.settings.projectConfig.defaultProjectNaming.metadataKey =
                            value;
                        yield settingTab.plugin.saveSettings();
                    }
                }));
            });
        }
        // Show strip extension option only for filename strategy
        if (((_h = (_g = settingTab.plugin.settings.projectConfig) === null || _g === void 0 ? void 0 : _g.defaultProjectNaming) === null || _h === void 0 ? void 0 : _h.strategy) === "filename") {
            new Setting(containerEl)
                .setName(t("Strip file extension"))
                .setDesc(t("Remove file extension from filename when using as project name"))
                .addToggle((toggle) => {
                var _a, _b;
                toggle
                    .setValue(((_b = (_a = settingTab.plugin.settings.projectConfig) === null || _a === void 0 ? void 0 : _a.defaultProjectNaming) === null || _b === void 0 ? void 0 : _b.stripExtension) || true)
                    .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                    var _c;
                    if ((_c = settingTab.plugin.settings.projectConfig) === null || _c === void 0 ? void 0 : _c.defaultProjectNaming) {
                        settingTab.plugin.settings.projectConfig.defaultProjectNaming.stripExtension =
                            value;
                        yield settingTab.plugin.saveSettings();
                    }
                }));
            });
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUHJvamVjdFNldHRpbmdzVGFiLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiUHJvamVjdFNldHRpbmdzVGFiLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBRW5DLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUUxQyxNQUFNLFVBQVUsd0JBQXdCLENBQ3ZDLFVBQXFDLEVBQ3JDLFdBQXdCOztJQUV4QixJQUFJLE9BQU8sQ0FBQyxXQUFXLENBQUM7U0FDdEIsT0FBTyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1NBQ2hDLE9BQU8sQ0FDUCxDQUFDLENBQUMsK0RBQStELENBQUMsQ0FDbEU7U0FDQSxVQUFVLEVBQUUsQ0FBQztJQUVmLCtDQUErQztJQUMvQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFO1FBQzlDLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGFBQWEsR0FBRztZQUMxQyxxQkFBcUIsRUFBRSxLQUFLO1lBQzVCLFlBQVksRUFBRSxFQUFFO1lBQ2hCLGNBQWMsRUFBRTtnQkFDZixXQUFXLEVBQUUsU0FBUztnQkFDdEIsT0FBTyxFQUFFLEtBQUs7YUFDZDtZQUNELFVBQVUsRUFBRTtnQkFDWCxRQUFRLEVBQUUsWUFBWTtnQkFDdEIsaUJBQWlCLEVBQUUsSUFBSTtnQkFDdkIsT0FBTyxFQUFFLEtBQUs7YUFDZDtZQUNELGdCQUFnQixFQUFFLEVBQUU7WUFDcEIsb0JBQW9CLEVBQUU7Z0JBQ3JCLFFBQVEsRUFBRSxVQUFVO2dCQUNwQixjQUFjLEVBQUUsSUFBSTtnQkFDcEIsT0FBTyxFQUFFLEtBQUs7YUFDZDtTQUNELENBQUM7S0FDRjtJQUVELHdDQUF3QztJQUN4QyxJQUFJLE9BQU8sQ0FBQyxXQUFXLENBQUM7U0FDdEIsT0FBTyxDQUFDLENBQUMsQ0FBQyx5QkFBeUIs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Q0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFOztnQkFDckIsTUFBTTtxQkFDSixRQUFRLENBQ1IsQ0FBQSxNQUFBLE1BQUEsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsYUFBYSwwQ0FDckMsb0JBQW9CLDBDQUFFLGNBQWMsS0FBSSxJQUFJLENBQy9DO3FCQUNBLFFBQVEsQ0FBQyxDQUFPLEtBQUssRUFBRSxFQUFFOztvQkFDekIsSUFDQyxNQUFBLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGFBQWEsMENBQ3JDLG9CQUFvQixFQUN0Qjt3QkFDRCxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsb0JBQW9CLENBQUMsY0FBYzs0QkFDM0UsS0FBSyxDQUFDO3dCQUNQLE1BQU0sVUFBVSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztxQkFDdkM7Z0JBQ0YsQ0FBQyxDQUFBLENBQUMsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1NBQ0o7S0FDRDtBQUNGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTZXR0aW5nIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFRhc2tQcm9ncmVzc0JhclNldHRpbmdUYWIgfSBmcm9tIFwiQC9zZXR0aW5nXCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyUHJvamVjdFNldHRpbmdzVGFiKFxyXG5cdHNldHRpbmdUYWI6IFRhc2tQcm9ncmVzc0JhclNldHRpbmdUYWIsXHJcblx0Y29udGFpbmVyRWw6IEhUTUxFbGVtZW50LFxyXG4pIHtcclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJQcm9qZWN0IE1hbmFnZW1lbnRcIikpXHJcblx0XHQuc2V0RGVzYyhcclxuXHRcdFx0dChcIkNvbmZpZ3VyZSBwcm9qZWN0IGRpc3BsYXksIG9yZ2FuaXphdGlvbiBhbmQgbWV0YWRhdGEgbWFwcGluZ3NcIiksXHJcblx0XHQpXHJcblx0XHQuc2V0SGVhZGluZygpO1xyXG5cclxuXHQvLyBJbml0aWFsaXplIHByb2plY3RDb25maWcgaWYgaXQgZG9lc24ndCBleGlzdFxyXG5cdGlmICghc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZykge1xyXG5cdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZyA9IHtcclxuXHRcdFx0ZW5hYmxlRW5oYW5jZWRQcm9qZWN0OiBmYWxzZSxcclxuXHRcdFx0cGF0aE1hcHBpbmdzOiBbXSxcclxuXHRcdFx0bWV0YWRhdGFDb25maWc6IHtcclxuXHRcdFx0XHRtZXRhZGF0YUtleTogXCJwcm9qZWN0XCIsXHJcblx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdH0sXHJcblx0XHRcdGNvbmZpZ0ZpbGU6IHtcclxuXHRcdFx0XHRmaWxlTmFtZTogXCJwcm9qZWN0Lm1kXCIsXHJcblx0XHRcdFx0c2VhcmNoUmVjdXJzaXZlbHk6IHRydWUsXHJcblx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdH0sXHJcblx0XHRcdG1ldGFkYXRhTWFwcGluZ3M6IFtdLFxyXG5cdFx0XHRkZWZhdWx0UHJvamVjdE5hbWluZzoge1xyXG5cdFx0XHRcdHN0cmF0ZWd5OiBcImZpbGVuYW1lXCIsXHJcblx0XHRcdFx0c3RyaXBFeHRlbnNpb246IHRydWUsXHJcblx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdH0sXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0Ly8gTWFpbiBlbmhhbmNlZCBwcm9qZWN0IGZlYXR1cmVzIHRvZ2dsZVxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIkVuYWJsZSBwcm9qZWN0IGZlYXR1cmVzXCIpKVxyXG5cdFx0LnNldERlc2MoXHJcblx0XHRcdHQoXHJcblx0XHRcdFx0XCJFbmFibGUgcGF0aC1iYXNlZCwgbWV0YWRhdGEtYmFzZWQsIGFuZCBjb25maWcgZmlsZS1iYXNlZCBwcm9qZWN0IGRldGVjdGlvblwiLFxyXG5cdFx0XHQpLFxyXG5cdFx0KVxyXG5cdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XHJcblx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWdcclxuXHRcdFx0XHRcdFx0Py5lbmFibGVFbmhhbmNlZFByb2plY3QgfHwgZmFsc2UsXHJcblx0XHRcdFx0KVxyXG5cdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdGlmICghc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZykge1xyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnID0ge1xyXG5cdFx0XHRcdFx0XHRcdGVuYWJsZUVuaGFuY2VkUHJvamVjdDogZmFsc2UsXHJcblx0XHRcdFx0XHRcdFx0cGF0aE1hcHBpbmdzOiBbXSxcclxuXHRcdFx0XHRcdFx0XHRtZXRhZGF0YUNvbmZpZzoge1xyXG5cdFx0XHRcdFx0XHRcdFx0bWV0YWRhdGFLZXk6IFwicHJvamVjdFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHRjb25maWdGaWxlOiB7XHJcblx0XHRcdFx0XHRcdFx0XHRmaWxlTmFtZTogXCJwcm9qZWN0Lm1kXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRzZWFyY2hSZWN1cnNpdmVseTogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0bWV0YWRhdGFNYXBwaW5nczogW10sXHJcblx0XHRcdFx0XHRcdFx0ZGVmYXVsdFByb2plY3ROYW1pbmc6IHtcclxuXHRcdFx0XHRcdFx0XHRcdHN0cmF0ZWd5OiBcImZpbGVuYW1lXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRzdHJpcEV4dGVuc2lvbjogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnLmVuYWJsZUVuaGFuY2VkUHJvamVjdCA9XHJcblx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0YXdhaXQgc2V0dGluZ1RhYi5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5kaXNwbGF5KCk7XHJcblx0XHRcdFx0XHR9LCAyMDApO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdGlmIChzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnPy5lbmFibGVFbmhhbmNlZFByb2plY3QpIHtcclxuXHRcdC8vIEFsd2F5cyBzaG93IHByb2plY3QgbWFuYWdlbWVudCBzZXR0aW5nc1xyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJQYXRoLWJhc2VkIFByb2plY3QgTWFwcGluZ3NcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJDb25maWd1cmUgcHJvamVjdCBuYW1lcyBiYXNlZCBvbiBmaWxlIHBhdGhzXCIpKVxyXG5cdFx0XHQuc2V0SGVhZGluZygpO1xyXG5cclxuXHRcdGNvbnN0IHBhdGhNYXBwaW5nc0NvbnRhaW5lciA9IGNvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJwcm9qZWN0LXBhdGgtbWFwcGluZ3MtY29udGFpbmVyXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCByZWZyZXNoUGF0aE1hcHBpbmdzID0gKCkgPT4ge1xyXG5cdFx0XHRwYXRoTWFwcGluZ3NDb250YWluZXIuZW1wdHkoKTtcclxuXHJcblx0XHRcdC8vIEVuc3VyZSBwYXRoTWFwcGluZ3MgaXMgYWx3YXlzIGFuIGFycmF5XHJcblx0XHRcdGlmICghc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZykge1xyXG5cdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWcgPSB7XHJcblx0XHRcdFx0XHRlbmFibGVFbmhhbmNlZFByb2plY3Q6IGZhbHNlLFxyXG5cdFx0XHRcdFx0cGF0aE1hcHBpbmdzOiBbXSxcclxuXHRcdFx0XHRcdG1ldGFkYXRhQ29uZmlnOiB7XHJcblx0XHRcdFx0XHRcdG1ldGFkYXRhS2V5OiBcInByb2plY3RcIixcclxuXHJcblx0XHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdGNvbmZpZ0ZpbGU6IHtcclxuXHRcdFx0XHRcdFx0ZmlsZU5hbWU6IFwicHJvamVjdC5tZFwiLFxyXG5cdFx0XHRcdFx0XHRzZWFyY2hSZWN1cnNpdmVseTogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0bWV0YWRhdGFNYXBwaW5nczogW10sXHJcblx0XHRcdFx0XHRkZWZhdWx0UHJvamVjdE5hbWluZzoge1xyXG5cdFx0XHRcdFx0XHRzdHJhdGVneTogXCJmaWxlbmFtZVwiLFxyXG5cdFx0XHRcdFx0XHRzdHJpcEV4dGVuc2lvbjogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHQhc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZy5wYXRoTWFwcGluZ3MgfHxcclxuXHRcdFx0XHQhQXJyYXkuaXNBcnJheShcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWcucGF0aE1hcHBpbmdzLFxyXG5cdFx0XHRcdClcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZy5wYXRoTWFwcGluZ3MgPSBbXTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgcGF0aE1hcHBpbmdzID1cclxuXHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnPy5wYXRoTWFwcGluZ3MgfHwgW107XHJcblxyXG5cdFx0XHRpZiAocGF0aE1hcHBpbmdzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRcdHBhdGhNYXBwaW5nc0NvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdFx0Y2xzOiBcIm5vLW1hcHBpbmdzLW1lc3NhZ2VcIixcclxuXHRcdFx0XHRcdHRleHQ6IHQoXCJObyBwYXRoIG1hcHBpbmdzIGNvbmZpZ3VyZWQgeWV0LlwiKSxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cGF0aE1hcHBpbmdzLmZvckVhY2goKG1hcHBpbmcsIGluZGV4KSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgbWFwcGluZ1JvdyA9IHBhdGhNYXBwaW5nc0NvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdFx0Y2xzOiBcInByb2plY3QtcGF0aC1tYXBwaW5nLXJvd1wiLFxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRuZXcgU2V0dGluZyhtYXBwaW5nUm93KVxyXG5cdFx0XHRcdFx0LnNldE5hbWUoYCR7dChcIk1hcHBpbmdcIil9ICR7aW5kZXggKyAxfWApXHJcblx0XHRcdFx0XHQuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0ZXh0LnNldFBsYWNlaG9sZGVyKFxyXG5cdFx0XHRcdFx0XHRcdHQoXCJQYXRoIHBhdHRlcm4gKGUuZy4sIFByb2plY3RzL1dvcmspXCIpLFxyXG5cdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdFx0LnNldFZhbHVlKG1hcHBpbmcucGF0aFBhdHRlcm4pXHJcblx0XHRcdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWcpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZy5wYXRoTWFwcGluZ3NbXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0aW5kZXhcclxuXHRcdFx0XHRcdFx0XHRcdFx0XS5wYXRoUGF0dGVybiA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRhd2FpdCBzZXR0aW5nVGFiLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0XHQuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0ZXh0LnNldFBsYWNlaG9sZGVyKHQoXCJQcm9qZWN0IG5hbWVcIikpXHJcblx0XHRcdFx0XHRcdFx0LnNldFZhbHVlKG1hcHBpbmcucHJvamVjdE5hbWUpXHJcblx0XHRcdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWcpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZy5wYXRoTWFwcGluZ3NbXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0aW5kZXhcclxuXHRcdFx0XHRcdFx0XHRcdFx0XS5wcm9qZWN0TmFtZSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRhd2FpdCBzZXR0aW5nVGFiLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcclxuXHRcdFx0XHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0XHRcdFx0LnNldFRvb2x0aXAodChcIkVuYWJsZWRcIikpXHJcblx0XHRcdFx0XHRcdFx0LnNldFZhbHVlKG1hcHBpbmcuZW5hYmxlZClcclxuXHRcdFx0XHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRpZiAoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZykge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnLnBhdGhNYXBwaW5nc1tcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRpbmRleFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRdLmVuYWJsZWQgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0YXdhaXQgc2V0dGluZ1RhYi5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdFx0LmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XHJcblx0XHRcdFx0XHRcdGJ1dHRvblxyXG5cdFx0XHRcdFx0XHRcdC5zZXRJY29uKFwidHJhc2hcIilcclxuXHRcdFx0XHRcdFx0XHQuc2V0VG9vbHRpcCh0KFwiUmVtb3ZlXCIpKVxyXG5cdFx0XHRcdFx0XHRcdC5vbkNsaWNrKGFzeW5jICgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdGlmIChzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWcucGF0aE1hcHBpbmdzLnNwbGljZShcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRpbmRleCxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQxLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRhd2FpdCBzZXR0aW5nVGFiLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0cmVmcmVzaFBhdGhNYXBwaW5ncygpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQWRkIG5ldyBtYXBwaW5nIGJ1dHRvblxyXG5cdFx0XHRuZXcgU2V0dGluZyhwYXRoTWFwcGluZ3NDb250YWluZXIpLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XHJcblx0XHRcdFx0YnV0dG9uXHJcblx0XHRcdFx0XHQuc2V0QnV0dG9uVGV4dCh0KFwiQWRkIFBhdGggTWFwcGluZ1wiKSlcclxuXHRcdFx0XHRcdC5zZXRDdGEoKVxyXG5cdFx0XHRcdFx0Lm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHQvLyBFbnN1cmUgcHJvamVjdENvbmZpZyBleGlzdHNcclxuXHRcdFx0XHRcdFx0aWYgKCFzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnKSB7XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZyA9IHtcclxuXHRcdFx0XHRcdFx0XHRcdGVuYWJsZUVuaGFuY2VkUHJvamVjdDogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0XHRcdHBhdGhNYXBwaW5nczogW10sXHJcblx0XHRcdFx0XHRcdFx0XHRtZXRhZGF0YUNvbmZpZzoge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRtZXRhZGF0YUtleTogXCJwcm9qZWN0XCIsXHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcclxuXHRcdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0XHRjb25maWdGaWxlOiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGZpbGVOYW1lOiBcInByb2plY3QubWRcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0c2VhcmNoUmVjdXJzaXZlbHk6IHRydWUsXHJcblx0XHRcdFx0XHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHRcdG1ldGFkYXRhTWFwcGluZ3M6IFtdLFxyXG5cdFx0XHRcdFx0XHRcdFx0ZGVmYXVsdFByb2plY3ROYW1pbmc6IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0c3RyYXRlZ3k6IFwiZmlsZW5hbWVcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0c3RyaXBFeHRlbnNpb246IHRydWUsXHJcblx0XHRcdFx0XHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBFbnN1cmUgcGF0aE1hcHBpbmdzIGlzIGFuIGFycmF5XHJcblx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHQhQXJyYXkuaXNBcnJheShcclxuXHRcdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWdcclxuXHRcdFx0XHRcdFx0XHRcdFx0LnBhdGhNYXBwaW5ncyxcclxuXHRcdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWcucGF0aE1hcHBpbmdzID1cclxuXHRcdFx0XHRcdFx0XHRcdFtdO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBBZGQgbmV3IG1hcHBpbmdcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZy5wYXRoTWFwcGluZ3MucHVzaChcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRwYXRoUGF0dGVybjogXCJcIixcclxuXHRcdFx0XHRcdFx0XHRcdHByb2plY3ROYW1lOiBcIlwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdFx0YXdhaXQgc2V0dGluZ1RhYi5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdHJlZnJlc2hQYXRoTWFwcGluZ3MoKTtcclxuXHRcdFx0XHRcdFx0fSwgMTAwKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH07XHJcblxyXG5cdFx0cmVmcmVzaFBhdGhNYXBwaW5ncygpO1xyXG5cclxuXHRcdC8vIE1ldGFkYXRhLWJhc2VkIHByb2plY3QgZGV0ZWN0aW9uIHNldHRpbmdzXHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0LnNldE5hbWUodChcIk1ldGFkYXRhLWJhc2VkIFByb2plY3QgRGV0ZWN0aW9uXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyh0KFwiQ29uZmlndXJlIHByb2plY3QgZGV0ZWN0aW9uIGZyb20gZmlsZSBmcm9udG1hdHRlclwiKSlcclxuXHRcdFx0LnNldEhlYWRpbmcoKTtcclxuXHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0LnNldE5hbWUodChcIkVuYWJsZSBtZXRhZGF0YSBwcm9qZWN0IGRldGVjdGlvblwiKSlcclxuXHRcdFx0LnNldERlc2ModChcIkRldGVjdCBwcm9qZWN0IGZyb20gZmlsZSBmcm9udG1hdHRlciBtZXRhZGF0YVwiKSlcclxuXHRcdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XHJcblx0XHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWc/Lm1ldGFkYXRhQ29uZmlnXHJcblx0XHRcdFx0XHRcdFx0Py5lbmFibGVkIHx8IGZhbHNlLFxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdFx0Py5tZXRhZGF0YUNvbmZpZ1xyXG5cdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnLm1ldGFkYXRhQ29uZmlnLmVuYWJsZWQgPVxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0YXdhaXQgc2V0dGluZ1RhYi5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0LnNldE5hbWUodChcIk1ldGFkYXRhIGtleVwiKSlcclxuXHRcdFx0LnNldERlc2ModChcIlRoZSBmcm9udG1hdHRlciBrZXkgdG8gdXNlIGZvciBwcm9qZWN0IG5hbWVcIikpXHJcblx0XHRcdC5hZGRUZXh0KCh0ZXh0KSA9PiB7XHJcblx0XHRcdFx0dGV4dC5zZXRQbGFjZWhvbGRlcihcInByb2plY3RcIilcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZz8ubWV0YWRhdGFDb25maWdcclxuXHRcdFx0XHRcdFx0XHQ/Lm1ldGFkYXRhS2V5IHx8IFwicHJvamVjdFwiLFxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdFx0Py5tZXRhZGF0YUNvbmZpZ1xyXG5cdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnLm1ldGFkYXRhQ29uZmlnLm1ldGFkYXRhS2V5ID1cclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlIHx8IFwicHJvamVjdFwiO1xyXG5cdFx0XHRcdFx0XHRcdGF3YWl0IHNldHRpbmdUYWIucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ29uZmlnIGZpbGUtYmFzZWQgcHJvamVjdCBkZXRlY3Rpb24gc2V0dGluZ3NcclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiQ29uZmlnIEZpbGUtYmFzZWQgUHJvamVjdCBEZXRlY3Rpb25cIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcIkNvbmZpZ3VyZSBwcm9qZWN0IGRldGVjdGlvbiBmcm9tIHByb2plY3QgY29uZmlndXJhdGlvbiBmaWxlc1wiLFxyXG5cdFx0XHRcdCksXHJcblx0XHRcdClcclxuXHRcdFx0LnNldEhlYWRpbmcoKTtcclxuXHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0LnNldE5hbWUodChcIkVuYWJsZSBjb25maWcgZmlsZSBwcm9qZWN0IGRldGVjdGlvblwiKSlcclxuXHRcdFx0LnNldERlc2ModChcIkRldGVjdCBwcm9qZWN0IGZyb20gcHJvamVjdCBjb25maWd1cmF0aW9uIGZpbGVzXCIpKVxyXG5cdFx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcclxuXHRcdFx0XHR0b2dnbGVcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZz8uY29uZmlnRmlsZVxyXG5cdFx0XHRcdFx0XHRcdD8uZW5hYmxlZCB8fCBmYWxzZSxcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWc/LmNvbmZpZ0ZpbGVcclxuXHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZy5jb25maWdGaWxlLmVuYWJsZWQgPVxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0YXdhaXQgc2V0dGluZ1RhYi5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0LnNldE5hbWUodChcIkNvbmZpZyBmaWxlIG5hbWVcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJOYW1lIG9mIHRoZSBwcm9qZWN0IGNvbmZpZ3VyYXRpb24gZmlsZVwiKSlcclxuXHRcdFx0LmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0XHR0ZXh0LnNldFBsYWNlaG9sZGVyKFwicHJvamVjdC5tZFwiKVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnPy5jb25maWdGaWxlXHJcblx0XHRcdFx0XHRcdFx0Py5maWxlTmFtZSB8fCBcInByb2plY3QubWRcIixcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWc/LmNvbmZpZ0ZpbGVcclxuXHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZy5jb25maWdGaWxlLmZpbGVOYW1lID1cclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlIHx8IFwicHJvamVjdC5tZFwiO1xyXG5cdFx0XHRcdFx0XHRcdGF3YWl0IHNldHRpbmdUYWIucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ3VzdG9tIFByb2plY3QgRGV0ZWN0aW9uIE1ldGhvZHNcclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiQ3VzdG9tIFByb2plY3QgRGV0ZWN0aW9uIE1ldGhvZHNcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJDb25maWd1cmUgYWRkaXRpb25hbCBtZXRob2RzIHRvIGRldGVjdCBwcm9qZWN0IGZpbGVzXCIpKVxyXG5cdFx0XHQuc2V0SGVhZGluZygpO1xyXG5cclxuXHRcdGNvbnN0IGRldGVjdGlvbk1ldGhvZHNDb250YWluZXIgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwicHJvamVjdC1kZXRlY3Rpb24tbWV0aG9kcy1jb250YWluZXJcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IHJlZnJlc2hEZXRlY3Rpb25NZXRob2RzID0gKCkgPT4ge1xyXG5cdFx0XHRkZXRlY3Rpb25NZXRob2RzQ29udGFpbmVyLmVtcHR5KCk7XHJcblxyXG5cdFx0XHQvLyBFbnN1cmUgZGV0ZWN0aW9uTWV0aG9kcyBleGlzdHNcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdCFzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnPy5tZXRhZGF0YUNvbmZpZ1xyXG5cdFx0XHRcdFx0Py5kZXRlY3Rpb25NZXRob2RzXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdGlmIChzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnPy5tZXRhZGF0YUNvbmZpZykge1xyXG5cdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZy5tZXRhZGF0YUNvbmZpZy5kZXRlY3Rpb25NZXRob2RzID1cclxuXHRcdFx0XHRcdFx0W107XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBtZXRob2RzID1cclxuXHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnPy5tZXRhZGF0YUNvbmZpZ1xyXG5cdFx0XHRcdFx0Py5kZXRlY3Rpb25NZXRob2RzIHx8IFtdO1xyXG5cclxuXHRcdFx0bWV0aG9kcy5mb3JFYWNoKChtZXRob2QsIGluZGV4KSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgbWV0aG9kRGl2ID0gZGV0ZWN0aW9uTWV0aG9kc0NvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdFx0Y2xzOiBcInByb2plY3QtZGV0ZWN0aW9uLW1ldGhvZFwiLFxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRuZXcgU2V0dGluZyhtZXRob2REaXYpXHJcblx0XHRcdFx0XHQuc2V0TmFtZShgJHt0KFwiTWV0aG9kXCIpfSAke2luZGV4ICsgMX1gKVxyXG5cdFx0XHRcdFx0LmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xyXG5cdFx0XHRcdFx0XHRkcm9wZG93blxyXG5cdFx0XHRcdFx0XHRcdC5hZGRPcHRpb24oXCJtZXRhZGF0YVwiLCB0KFwiTWV0YWRhdGEgUHJvcGVydHlcIikpXHJcblx0XHRcdFx0XHRcdFx0LmFkZE9wdGlvbihcInRhZ1wiLCB0KFwiVGFnXCIpKVxyXG5cdFx0XHRcdFx0XHRcdC5hZGRPcHRpb24oXCJsaW5rXCIsIHQoXCJMaW5rZWQgTm90ZVwiKSlcclxuXHRcdFx0XHRcdFx0XHQuc2V0VmFsdWUobWV0aG9kLnR5cGUpXHJcblx0XHRcdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0bWV0aG9kLnR5cGUgPSB2YWx1ZSBhc1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR8IFwibWV0YWRhdGFcIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHR8IFwidGFnXCJcclxuXHRcdFx0XHRcdFx0XHRcdFx0fCBcImxpbmtcIjtcclxuXHRcdFx0XHRcdFx0XHRcdGF3YWl0IHNldHRpbmdUYWIucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdFx0XHRcdFx0cmVmcmVzaERldGVjdGlvbk1ldGhvZHMoKTtcclxuXHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0XHQuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBwbGFjZWhvbGRlciA9XHJcblx0XHRcdFx0XHRcdFx0bWV0aG9kLnR5cGUgPT09IFwibWV0YWRhdGFcIlxyXG5cdFx0XHRcdFx0XHRcdFx0PyBcInByb2plY3RcIlxyXG5cdFx0XHRcdFx0XHRcdFx0OiBtZXRob2QudHlwZSA9PT0gXCJ0YWdcIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ/IFwicHJvamVjdFwiXHJcblx0XHRcdFx0XHRcdFx0XHRcdDogXCJjYXRlZ29yeVwiO1xyXG5cdFx0XHRcdFx0XHR0ZXh0LnNldFBsYWNlaG9sZGVyKHBsYWNlaG9sZGVyKVxyXG5cdFx0XHRcdFx0XHRcdC5zZXRWYWx1ZShtZXRob2QucHJvcGVydHlLZXkpXHJcblx0XHRcdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0bWV0aG9kLnByb3BlcnR5S2V5ID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0XHRhd2FpdCBzZXR0aW5nVGFiLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcclxuXHRcdFx0XHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0XHRcdFx0LnNldFZhbHVlKG1ldGhvZC5lbmFibGVkKVxyXG5cdFx0XHRcdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdG1ldGhvZC5lbmFibGVkID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0XHRhd2FpdCBzZXR0aW5nVGFiLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0XHQuYWRkQnV0dG9uKChidXR0b24pID0+IHtcclxuXHRcdFx0XHRcdFx0YnV0dG9uXHJcblx0XHRcdFx0XHRcdFx0LnNldEljb24oXCJ0cmFzaFwiKVxyXG5cdFx0XHRcdFx0XHRcdC5zZXRUb29sdGlwKHQoXCJSZW1vdmVcIikpXHJcblx0XHRcdFx0XHRcdFx0Lm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0bWV0aG9kcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0XHRcdFx0XHRcdFx0YXdhaXQgc2V0dGluZ1RhYi5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0XHRcdFx0XHRyZWZyZXNoRGV0ZWN0aW9uTWV0aG9kcygpO1xyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIEFkZCBsaW5rIGZpbHRlciBmaWVsZCBmb3IgbGluayB0eXBlXHJcblx0XHRcdFx0aWYgKG1ldGhvZC50eXBlID09PSBcImxpbmtcIikge1xyXG5cdFx0XHRcdFx0bmV3IFNldHRpbmcobWV0aG9kRGl2KVxyXG5cdFx0XHRcdFx0XHQuc2V0TmFtZSh0KFwiTGluayBGaWx0ZXJcIikpXHJcblx0XHRcdFx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcdFx0XHRcIk9wdGlvbmFsOiBPbmx5IG1hdGNoIGxpbmtzIGNvbnRhaW5pbmcgdGhpcyB0ZXh0XCIsXHJcblx0XHRcdFx0XHRcdFx0KSxcclxuXHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHQuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdHRleHQuc2V0UGxhY2Vob2xkZXIoXCJQcm9qZWN0cy9cIilcclxuXHRcdFx0XHRcdFx0XHRcdC5zZXRWYWx1ZShtZXRob2QubGlua0ZpbHRlciB8fCBcIlwiKVxyXG5cdFx0XHRcdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRtZXRob2QubGlua0ZpbHRlciA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRhd2FpdCBzZXR0aW5nVGFiLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQWRkIG5ldyBtZXRob2QgYnV0dG9uXHJcblx0XHRcdG5ldyBTZXR0aW5nKGRldGVjdGlvbk1ldGhvZHNDb250YWluZXIpLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XHJcblx0XHRcdFx0YnV0dG9uXHJcblx0XHRcdFx0XHQuc2V0QnV0dG9uVGV4dCh0KFwiQWRkIERldGVjdGlvbiBNZXRob2RcIikpXHJcblx0XHRcdFx0XHQuc2V0Q3RhKClcclxuXHRcdFx0XHRcdC5vbkNsaWNrKGFzeW5jICgpID0+IHtcclxuXHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdCFzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnXHJcblx0XHRcdFx0XHRcdFx0XHQ/Lm1ldGFkYXRhQ29uZmlnPy5kZXRlY3Rpb25NZXRob2RzXHJcblx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWdcclxuXHRcdFx0XHRcdFx0XHRcdFx0Py5tZXRhZGF0YUNvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZy5tZXRhZGF0YUNvbmZpZy5kZXRlY3Rpb25NZXRob2RzID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0W107XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWc/Lm1ldGFkYXRhQ29uZmlnPy5kZXRlY3Rpb25NZXRob2RzPy5wdXNoKFxyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHR5cGU6IFwibWV0YWRhdGFcIixcclxuXHRcdFx0XHRcdFx0XHRcdHByb3BlcnR5S2V5OiBcIlwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0YXdhaXQgc2V0dGluZ1RhYi5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0XHRcdHJlZnJlc2hEZXRlY3Rpb25NZXRob2RzKCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHJlZnJlc2hEZXRlY3Rpb25NZXRob2RzKCk7XHJcblxyXG5cdFx0Ly8gTWV0YWRhdGEgbWFwcGluZ3Mgc2VjdGlvblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJNZXRhZGF0YSBNYXBwaW5nc1wiKSlcclxuXHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0dChcIkNvbmZpZ3VyZSBob3cgbWV0YWRhdGEgZmllbGRzIGFyZSBtYXBwZWQgYW5kIHRyYW5zZm9ybWVkXCIpLFxyXG5cdFx0XHQpXHJcblx0XHRcdC5zZXRIZWFkaW5nKCk7XHJcblxyXG5cdFx0Y29uc3QgbWV0YWRhdGFNYXBwaW5nc0NvbnRhaW5lciA9IGNvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJwcm9qZWN0LW1ldGFkYXRhLW1hcHBpbmdzLWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgcmVmcmVzaE1ldGFkYXRhTWFwcGluZ3MgPSAoKSA9PiB7XHJcblx0XHRcdG1ldGFkYXRhTWFwcGluZ3NDb250YWluZXIuZW1wdHkoKTtcclxuXHJcblx0XHRcdC8vIEVuc3VyZSBtZXRhZGF0YU1hcHBpbmdzIGlzIGFsd2F5cyBhbiBhcnJheVxyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0IXNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWc/Lm1ldGFkYXRhTWFwcGluZ3MgfHxcclxuXHRcdFx0XHQhQXJyYXkuaXNBcnJheShcclxuXHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWcubWV0YWRhdGFNYXBwaW5ncyxcclxuXHRcdFx0XHQpXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdGlmIChzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnKSB7XHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnLm1ldGFkYXRhTWFwcGluZ3MgPVxyXG5cdFx0XHRcdFx0XHRbXTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IG1ldGFkYXRhTWFwcGluZ3MgPVxyXG5cdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWc/Lm1ldGFkYXRhTWFwcGluZ3MgfHxcclxuXHRcdFx0XHRbXTtcclxuXHJcblx0XHRcdGlmIChtZXRhZGF0YU1hcHBpbmdzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRcdG1ldGFkYXRhTWFwcGluZ3NDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRcdGNsczogXCJuby1tYXBwaW5ncy1tZXNzYWdlXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiB0KFwiTm8gbWV0YWRhdGEgbWFwcGluZ3MgY29uZmlndXJlZCB5ZXQuXCIpLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRtZXRhZGF0YU1hcHBpbmdzLmZvckVhY2goKG1hcHBpbmcsIGluZGV4KSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgbWFwcGluZ1JvdyA9IG1ldGFkYXRhTWFwcGluZ3NDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRcdGNsczogXCJwcm9qZWN0LW1ldGFkYXRhLW1hcHBpbmctcm93XCIsXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIEdldCBhbHJlYWR5IHVzZWQgdGFyZ2V0IGtleXMgdG8gYXZvaWQgZHVwbGljYXRlc1xyXG5cdFx0XHRcdGNvbnN0IHVzZWRUYXJnZXRLZXlzID0gbmV3IFNldChcclxuXHRcdFx0XHRcdG1ldGFkYXRhTWFwcGluZ3NcclxuXHRcdFx0XHRcdFx0LmZpbHRlcigoXywgaSkgPT4gaSAhPT0gaW5kZXgpXHJcblx0XHRcdFx0XHRcdC5tYXAoKG0pID0+IG0udGFyZ2V0S2V5KVxyXG5cdFx0XHRcdFx0XHQuZmlsdGVyKChrZXkpID0+IGtleSAmJiBrZXkudHJpbSgpICE9PSBcIlwiKSxcclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHQvLyBBdmFpbGFibGUgdGFyZ2V0IGtleXMgZnJvbSBTdGFuZGFyZFRhc2tNZXRhZGF0YVxyXG5cdFx0XHRcdGNvbnN0IGF2YWlsYWJsZVRhcmdldEtleXMgPSBbXHJcblx0XHRcdFx0XHRcInByb2plY3RcIixcclxuXHRcdFx0XHRcdFwiY29udGV4dFwiLFxyXG5cdFx0XHRcdFx0XCJwcmlvcml0eVwiLFxyXG5cdFx0XHRcdFx0XCJ0YWdzXCIsXHJcblx0XHRcdFx0XHRcInN0YXJ0RGF0ZVwiLFxyXG5cdFx0XHRcdFx0XCJzY2hlZHVsZWREYXRlXCIsXHJcblx0XHRcdFx0XHRcImR1ZURhdGVcIixcclxuXHRcdFx0XHRcdFwiY29tcGxldGVkRGF0ZVwiLFxyXG5cdFx0XHRcdFx0XCJjcmVhdGVkRGF0ZVwiLFxyXG5cdFx0XHRcdFx0XCJyZWN1cnJlbmNlXCIsXHJcblx0XHRcdFx0XS5maWx0ZXIoXHJcblx0XHRcdFx0XHQoa2V5KSA9PlxyXG5cdFx0XHRcdFx0XHQhdXNlZFRhcmdldEtleXMuaGFzKGtleSkgfHwga2V5ID09PSBtYXBwaW5nLnRhcmdldEtleSxcclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRuZXcgU2V0dGluZyhtYXBwaW5nUm93KVxyXG5cdFx0XHRcdFx0LnNldE5hbWUoYCR7dChcIk1hcHBpbmdcIil9ICR7aW5kZXggKyAxfWApXHJcblx0XHRcdFx0XHQuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0ZXh0LnNldFBsYWNlaG9sZGVyKHQoXCJTb3VyY2Uga2V5IChlLmcuLCBwcm9qKVwiKSlcclxuXHRcdFx0XHRcdFx0XHQuc2V0VmFsdWUobWFwcGluZy5zb3VyY2VLZXkpXHJcblx0XHRcdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWcpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZy5tZXRhZGF0YU1hcHBpbmdzW1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGluZGV4XHJcblx0XHRcdFx0XHRcdFx0XHRcdF0uc291cmNlS2V5ID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGF3YWl0IHNldHRpbmdUYWIucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSlcclxuXHRcdFx0XHRcdC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8gQWRkIGVtcHR5IG9wdGlvblxyXG5cdFx0XHRcdFx0XHRkcm9wZG93bi5hZGRPcHRpb24oXCJcIiwgdChcIlNlbGVjdCB0YXJnZXQgZmllbGRcIikpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gQWRkIGF2YWlsYWJsZSBvcHRpb25zXHJcblx0XHRcdFx0XHRcdGF2YWlsYWJsZVRhcmdldEtleXMuZm9yRWFjaCgoa2V5KSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0ZHJvcGRvd24uYWRkT3B0aW9uKGtleSwga2V5KTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0XHRkcm9wZG93blxyXG5cdFx0XHRcdFx0XHRcdC5zZXRWYWx1ZShtYXBwaW5nLnRhcmdldEtleSlcclxuXHRcdFx0XHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRpZiAoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZykge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnLm1ldGFkYXRhTWFwcGluZ3NbXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0aW5kZXhcclxuXHRcdFx0XHRcdFx0XHRcdFx0XS50YXJnZXRLZXkgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0YXdhaXQgc2V0dGluZ1RhYi5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdC8vIFJlZnJlc2ggdG8gdXBkYXRlIGF2YWlsYWJsZSBvcHRpb25zIGZvciBvdGhlciBkcm9wZG93bnNcclxuXHRcdFx0XHRcdFx0XHRcdFx0cmVmcmVzaE1ldGFkYXRhTWFwcGluZ3MoKTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcclxuXHRcdFx0XHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0XHRcdFx0LnNldFRvb2x0aXAodChcIkVuYWJsZWRcIikpXHJcblx0XHRcdFx0XHRcdFx0LnNldFZhbHVlKG1hcHBpbmcuZW5hYmxlZClcclxuXHRcdFx0XHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRpZiAoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZykge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnLm1ldGFkYXRhTWFwcGluZ3NbXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0aW5kZXhcclxuXHRcdFx0XHRcdFx0XHRcdFx0XS5lbmFibGVkID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGF3YWl0IHNldHRpbmdUYWIucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSlcclxuXHRcdFx0XHRcdC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xyXG5cdFx0XHRcdFx0XHRidXR0b25cclxuXHRcdFx0XHRcdFx0XHQuc2V0SWNvbihcInRyYXNoXCIpXHJcblx0XHRcdFx0XHRcdFx0LnNldFRvb2x0aXAodChcIlJlbW92ZVwiKSlcclxuXHRcdFx0XHRcdFx0XHQub25DbGljayhhc3luYyAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRpZiAoc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZykge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnLm1ldGFkYXRhTWFwcGluZ3Muc3BsaWNlKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGluZGV4LFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdDEsXHJcblx0XHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGF3YWl0IHNldHRpbmdUYWIucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRyZWZyZXNoTWV0YWRhdGFNYXBwaW5ncygpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQWRkIG5ldyBtYXBwaW5nIGJ1dHRvblxyXG5cdFx0XHRuZXcgU2V0dGluZyhtZXRhZGF0YU1hcHBpbmdzQ29udGFpbmVyKS5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xyXG5cdFx0XHRcdGJ1dHRvblxyXG5cdFx0XHRcdFx0LnNldEJ1dHRvblRleHQodChcIkFkZCBNZXRhZGF0YSBNYXBwaW5nXCIpKVxyXG5cdFx0XHRcdFx0LnNldEN0YSgpXHJcblx0XHRcdFx0XHQub25DbGljayhhc3luYyAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdGlmIChzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnKSB7XHJcblx0XHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdFx0IUFycmF5LmlzQXJyYXkoXHJcblx0XHRcdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWdcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQubWV0YWRhdGFNYXBwaW5ncyxcclxuXHRcdFx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWcubWV0YWRhdGFNYXBwaW5ncyA9XHJcblx0XHRcdFx0XHRcdFx0XHRcdFtdO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZy5tZXRhZGF0YU1hcHBpbmdzLnB1c2goXHJcblx0XHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHNvdXJjZUtleTogXCJcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGFyZ2V0S2V5OiBcIlwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRhd2FpdCBzZXR0aW5nVGFiLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdHJlZnJlc2hNZXRhZGF0YU1hcHBpbmdzKCk7XHJcblx0XHRcdFx0XHRcdFx0fSwgMTAwKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fTtcclxuXHJcblx0XHRyZWZyZXNoTWV0YWRhdGFNYXBwaW5ncygpO1xyXG5cclxuXHRcdC8vIERlZmF1bHQgcHJvamVjdCBuYW1pbmcgc2VjdGlvblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJEZWZhdWx0IFByb2plY3QgTmFtaW5nXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XCJDb25maWd1cmUgZmFsbGJhY2sgcHJvamVjdCBuYW1pbmcgd2hlbiBubyBleHBsaWNpdCBwcm9qZWN0IGlzIGZvdW5kXCIsXHJcblx0XHRcdFx0KSxcclxuXHRcdFx0KVxyXG5cdFx0XHQuc2V0SGVhZGluZygpO1xyXG5cclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiRW5hYmxlIGRlZmF1bHQgcHJvamVjdCBuYW1pbmdcIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcIlVzZSBkZWZhdWx0IG5hbWluZyBzdHJhdGVneSB3aGVuIG5vIHByb2plY3QgaXMgZXhwbGljaXRseSBkZWZpbmVkXCIsXHJcblx0XHRcdFx0KSxcclxuXHRcdFx0KVxyXG5cdFx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcclxuXHRcdFx0XHR0b2dnbGVcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZShcclxuXHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdD8uZGVmYXVsdFByb2plY3ROYW1pbmc/LmVuYWJsZWQgfHwgZmFsc2UsXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnXHJcblx0XHRcdFx0XHRcdFx0XHQ/LmRlZmF1bHRQcm9qZWN0TmFtaW5nXHJcblx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWcuZGVmYXVsdFByb2plY3ROYW1pbmcuZW5hYmxlZCA9XHJcblx0XHRcdFx0XHRcdFx0XHR2YWx1ZTtcclxuXHRcdFx0XHRcdFx0XHRhd2FpdCBzZXR0aW5nVGFiLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHJcblx0XHRcdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmRpc3BsYXkoKTtcclxuXHRcdFx0XHRcdFx0XHR9LCAyMDApO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0aWYgKCFzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnPy5kZWZhdWx0UHJvamVjdE5hbWluZykge1xyXG5cdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnLmRlZmF1bHRQcm9qZWN0TmFtaW5nID0ge1xyXG5cdFx0XHRcdHN0cmF0ZWd5OiBcImZpbGVuYW1lXCIsXHJcblx0XHRcdFx0c3RyaXBFeHRlbnNpb246IHRydWUsXHJcblx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXHJcblx0XHRcdH07XHJcblx0XHR9XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJOYW1pbmcgc3RyYXRlZ3lcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJTdHJhdGVneSBmb3IgZ2VuZXJhdGluZyBkZWZhdWx0IHByb2plY3QgbmFtZXNcIikpXHJcblx0XHRcdC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcclxuXHRcdFx0XHRkcm9wZG93blxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcImZpbGVuYW1lXCIsIHQoXCJVc2UgZmlsZW5hbWVcIikpXHJcblx0XHRcdFx0XHQuYWRkT3B0aW9uKFwiZm9sZGVybmFtZVwiLCB0KFwiVXNlIGZvbGRlciBuYW1lXCIpKVxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcIm1ldGFkYXRhXCIsIHQoXCJVc2UgbWV0YWRhdGEgZmllbGRcIikpXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWdcclxuXHRcdFx0XHRcdFx0XHQ/LmRlZmF1bHRQcm9qZWN0TmFtaW5nPy5zdHJhdGVneSB8fCBcImZpbGVuYW1lXCIsXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHQhc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdFx0Py5kZWZhdWx0UHJvamVjdE5hbWluZ1xyXG5cdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnLmRlZmF1bHRQcm9qZWN0TmFtaW5nID1cclxuXHRcdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0c3RyYXRlZ3k6IFwiZmlsZW5hbWVcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0c3RyaXBFeHRlbnNpb246IHRydWUsXHJcblx0XHRcdFx0XHRcdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdFx0XHRcdFx0fTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdFx0Py5kZWZhdWx0UHJvamVjdE5hbWluZ1xyXG5cdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnLmRlZmF1bHRQcm9qZWN0TmFtaW5nLnN0cmF0ZWd5ID1cclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlIGFzIFwiZmlsZW5hbWVcIiB8IFwiZm9sZGVybmFtZVwiIHwgXCJtZXRhZGF0YVwiO1xyXG5cdFx0XHRcdFx0XHRcdGF3YWl0IHNldHRpbmdUYWIucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdFx0XHRcdC8vIFJlZnJlc2ggdG8gc2hvdy9oaWRlIG1ldGFkYXRhIGtleSBmaWVsZFxyXG5cdFx0XHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5kaXNwbGF5KCk7XHJcblx0XHRcdFx0XHRcdFx0fSwgMjAwKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnPy5kZWZhdWx0UHJvamVjdE5hbWluZ1xyXG5cdFx0XHRcdD8uc3RyYXRlZ3ksXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIFNob3cgbWV0YWRhdGEga2V5IGZpZWxkIG9ubHkgZm9yIG1ldGFkYXRhIHN0cmF0ZWd5XHJcblx0XHRpZiAoXHJcblx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWc/LmRlZmF1bHRQcm9qZWN0TmFtaW5nXHJcblx0XHRcdFx0Py5zdHJhdGVneSA9PT0gXCJtZXRhZGF0YVwiXHJcblx0XHQpIHtcclxuXHRcdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdFx0LnNldE5hbWUodChcIk1ldGFkYXRhIGtleVwiKSlcclxuXHRcdFx0XHQuc2V0RGVzYyh0KFwiTWV0YWRhdGEgZmllbGQgdG8gdXNlIGFzIHByb2plY3QgbmFtZVwiKSlcclxuXHRcdFx0XHQuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHRcdFx0dGV4dC5zZXRQbGFjZWhvbGRlcihcclxuXHRcdFx0XHRcdFx0dChcIkVudGVyIG1ldGFkYXRhIGtleSAoZS5nLiwgcHJvamVjdC1uYW1lKVwiKSxcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0LnNldFZhbHVlKFxyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWdcclxuXHRcdFx0XHRcdFx0XHRcdD8uZGVmYXVsdFByb2plY3ROYW1pbmc/Lm1ldGFkYXRhS2V5IHx8IFwiXCIsXHJcblx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLnByb2plY3RDb25maWdcclxuXHRcdFx0XHRcdFx0XHRcdFx0Py5kZWZhdWx0UHJvamVjdE5hbWluZ1xyXG5cdFx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZy5kZWZhdWx0UHJvamVjdE5hbWluZy5tZXRhZGF0YUtleSA9XHJcblx0XHRcdFx0XHRcdFx0XHRcdHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdFx0YXdhaXQgc2V0dGluZ1RhYi5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTaG93IHN0cmlwIGV4dGVuc2lvbiBvcHRpb24gb25seSBmb3IgZmlsZW5hbWUgc3RyYXRlZ3lcclxuXHRcdGlmIChcclxuXHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZz8uZGVmYXVsdFByb2plY3ROYW1pbmdcclxuXHRcdFx0XHQ/LnN0cmF0ZWd5ID09PSBcImZpbGVuYW1lXCJcclxuXHRcdCkge1xyXG5cdFx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0XHQuc2V0TmFtZSh0KFwiU3RyaXAgZmlsZSBleHRlbnNpb25cIikpXHJcblx0XHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XHRcIlJlbW92ZSBmaWxlIGV4dGVuc2lvbiBmcm9tIGZpbGVuYW1lIHdoZW4gdXNpbmcgYXMgcHJvamVjdCBuYW1lXCIsXHJcblx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdClcclxuXHRcdFx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcclxuXHRcdFx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdFx0XHQuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdFx0Py5kZWZhdWx0UHJvamVjdE5hbWluZz8uc3RyaXBFeHRlbnNpb24gfHwgdHJ1ZSxcclxuXHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MucHJvamVjdENvbmZpZ1xyXG5cdFx0XHRcdFx0XHRcdFx0XHQ/LmRlZmF1bHRQcm9qZWN0TmFtaW5nXHJcblx0XHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5wcm9qZWN0Q29uZmlnLmRlZmF1bHRQcm9qZWN0TmFtaW5nLnN0cmlwRXh0ZW5zaW9uID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0dmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0XHRhd2FpdCBzZXR0aW5nVGFiLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG4iXX0=