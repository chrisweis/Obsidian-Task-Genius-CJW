import { __awaiter } from "tslib";
import { Setting, Notice, setIcon, DropdownComponent } from "obsidian";
import { t } from "@/translations/helper";
import { FilterMode } from "@/common/setting-definition";
import { FolderSuggest, SimpleFileSuggest as FileSuggest, } from "@/components/ui/inputs/AutoComplete";
import { FileFilterRuleEditorModal } from "@/components/features/onboarding/modals/FileFilterRuleEditorModal";
import "@/styles/onboarding-components.css";
import "@/styles/file-filter-settings.css";
/**
 * File Filter Configuration Step
 */
export class FileFilterStep {
    /**
     * Render the file filter configuration step
     */
    static render(headerEl, contentEl, controller, plugin) {
        // Clear
        headerEl.empty();
        contentEl.empty();
        // Header
        headerEl.createEl("h1", { text: t("Optimize Performance") });
        headerEl.createEl("p", {
            text: t("Configure file filtering to improve indexing performance and focus on relevant content"),
            cls: "onboarding-subtitle",
        });
        // Two-column layout
        const showcase = contentEl.createDiv({ cls: "component-showcase" });
        // Left: Configuration
        const configSection = showcase.createDiv({
            cls: "component-showcase-preview file-filter-preview",
        });
        // Right: Description and recommendations
        const descSection = showcase.createDiv({
            cls: "component-showcase-description",
        });
        // Render configuration UI
        this.renderConfiguration(configSection, plugin);
        // Render description and recommendations
        this.renderDescription(descSection, plugin);
    }
    /**
     * Render configuration UI
     */
    static renderConfiguration(container, plugin) {
        // Enable/Disable toggle
        new Setting(container)
            .setName(t("Enable File Filter"))
            .setDesc(t("Filter files during task indexing to improve performance"))
            .addToggle((toggle) => toggle
            .setValue(plugin.settings.fileFilter.enabled)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            plugin.settings.fileFilter.enabled = value;
            yield plugin.saveSettings();
            // Re-render to show/hide configuration
            this.render((_a = container.parentElement) === null || _a === void 0 ? void 0 : _a.previousElementSibling, (_b = container.parentElement) === null || _b === void 0 ? void 0 : _b.parentElement, {}, plugin);
        })));
        if (!plugin.settings.fileFilter.enabled) {
            return;
        }
        // Filter mode selection
        new Setting(container)
            .setName(t("Filter Mode"))
            .setDesc(t("Whitelist: Include only specified paths | Blacklist: Exclude specified paths"))
            .addDropdown((dropdown) => dropdown
            .addOption(FilterMode.WHITELIST, t("Whitelist (Include only)"))
            .addOption(FilterMode.BLACKLIST, t("Blacklist (Exclude)"))
            .setValue(plugin.settings.fileFilter.mode)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            plugin.settings.fileFilter.mode = value;
            yield plugin.saveSettings();
            this.updateStats(container, plugin);
        })));
        // Quick add rules section
        const quickAddContainer = container.createDiv({
            cls: "file-filter-config",
        });
        quickAddContainer.createEl("h4", { text: t("Quick Add Rules") });
        const buttonsContainer = quickAddContainer.createDiv({
            cls: "setting-item-control",
        });
        // Add file rule button
        const addFileBtn = buttonsContainer.createEl("button", {
            text: t("Add File"),
            cls: "mod-cta",
        });
        addFileBtn.addEventListener("click", () => {
            const modal = new FileFilterRuleEditorModal(plugin.app, plugin, {
                autoAddRuleType: "file",
                onClose: () => {
                    const rulesEl = container.querySelector(".file-filter-rules-container");
                    const statsEl = container.querySelector(".file-filter-stats-preview");
                    if (rulesEl) {
                        this.renderRules(rulesEl, plugin);
                    }
                    if (statsEl) {
                        this.updateStats(statsEl, plugin);
                    }
                },
            });
            modal.open();
        });
        // Add folder rule button
        const addFolderBtn = buttonsContainer.createEl("button", {
            text: t("Add Folder"),
        });
        addFolderBtn.addEventListener("click", () => {
            const modal = new FileFilterRuleEditorModal(plugin.app, plugin, {
                autoAddRuleType: "folder",
                onClose: () => {
                    const rulesEl = container.querySelector(".file-filter-rules-container");
                    const statsEl = container.querySelector(".file-filter-stats-preview");
                    if (rulesEl) {
                        this.renderRules(rulesEl, plugin);
                    }
                    if (statsEl) {
                        this.updateStats(statsEl, plugin);
                    }
                },
            });
            modal.open();
        });
        // Add pattern rule button
        const addPatternBtn = buttonsContainer.createEl("button", {
            text: t("Add Pattern"),
        });
        addPatternBtn.addEventListener("click", () => {
            const modal = new FileFilterRuleEditorModal(plugin.app, plugin, {
                autoAddRuleType: "pattern",
                onClose: () => {
                    const rulesEl = container.querySelector(".file-filter-rules-container");
                    const statsEl = container.querySelector(".file-filter-stats-preview");
                    if (rulesEl) {
                        this.renderRules(rulesEl, plugin);
                    }
                    if (statsEl) {
                        this.updateStats(statsEl, plugin);
                    }
                },
            });
            modal.open();
        });
        // Current rules list
        const rulesContainer = container.createDiv({
            cls: "file-filter-rules-container",
        });
        this.renderRules(rulesContainer, plugin);
        // Statistics
        const statsContainer = container.createDiv({
            cls: "file-filter-stats-preview",
        });
        this.updateStats(statsContainer, plugin);
    }
    /**
     * Render current rules with inline editing support
     */
    static renderRules(container, plugin) {
        container.empty();
        if (plugin.settings.fileFilter.rules.length === 0) {
            container.createEl("p", {
                text: t("No filter rules configured yet"),
                cls: "setting-item-description",
            });
            return;
        }
        plugin.settings.fileFilter.rules.forEach((rule, index) => {
            const ruleContainer = container.createDiv({
                cls: "file-filter-rule",
            });
            // Rule type dropdown
            const typeContainer = ruleContainer.createDiv({
                cls: "file-filter-rule-type",
            });
            typeContainer.createEl("label", { text: t("Type:") });
            new DropdownComponent(typeContainer)
                .addOption("file", t("File"))
                .addOption("folder", t("Folder"))
                .addOption("pattern", t("Pattern"))
                .setValue(rule.type)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                rule.type = value;
                yield plugin.saveSettings();
                // Only re-render rules container, not the whole component
                this.renderRules(container, plugin);
                this.updateStats((_a = container.parentElement) === null || _a === void 0 ? void 0 : _a.querySelector(".file-filter-stats-preview"), plugin);
            }));
            // Rule scope dropdown (per-rule)
            const scopeContainer = ruleContainer.createDiv({
                cls: "file-filter-rule-scope",
            });
            scopeContainer.createEl("label", { text: t("Scope:") });
            new DropdownComponent(scopeContainer)
                .addOption("both", t("Both"))
                .addOption("inline", t("Inline"))
                .addOption("file", t("File"))
                .setValue(rule.scope || "both")
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                rule.scope = value;
                yield plugin.saveSettings();
            }));
            // Path input with autocomplete
            const pathContainer = ruleContainer.createDiv({
                cls: "file-filter-rule-path",
            });
            pathContainer.createEl("label", { text: t("Path:") });
            const pathInput = pathContainer.createEl("input", {
                type: "text",
                value: rule.path,
                placeholder: rule.type === "pattern"
                    ? "*.tmp, temp/*"
                    : rule.type === "folder"
                        ? "path/to/folder"
                        : "path/to/file.md",
            });
            // Add appropriate autocomplete based on rule type
            if (rule.type === "folder") {
                new FolderSuggest(plugin.app, pathInput, plugin, "single");
            }
            else if (rule.type === "file") {
                new FileSuggest(pathInput, plugin, (file) => {
                    rule.path = file.path;
                    pathInput.value = file.path;
                    plugin.saveSettings();
                });
            }
            pathInput.addEventListener("input", () => __awaiter(this, void 0, void 0, function* () {
                rule.path = pathInput.value;
                yield plugin.saveSettings();
            }));
            // Enabled toggle
            const enabledContainer = ruleContainer.createDiv({
                cls: "file-filter-rule-enabled",
            });
            enabledContainer.createEl("label", { text: t("Enabled:") });
            const enabledCheckbox = enabledContainer.createEl("input", {
                type: "checkbox",
            });
            enabledCheckbox.checked = rule.enabled;
            enabledCheckbox.addEventListener("change", () => __awaiter(this, void 0, void 0, function* () {
                var _b;
                rule.enabled = enabledCheckbox.checked;
                yield plugin.saveSettings();
                this.updateStats((_b = container.parentElement) === null || _b === void 0 ? void 0 : _b.querySelector(".file-filter-stats-preview"), plugin);
            }));
            // Delete button
            const deleteButton = ruleContainer.createEl("button", {
                cls: "file-filter-rule-delete mod-destructive",
            });
            setIcon(deleteButton, "trash");
            deleteButton.title = t("Delete rule");
            deleteButton.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
                var _c;
                plugin.settings.fileFilter.rules.splice(index, 1);
                yield plugin.saveSettings();
                this.renderRules(container, plugin);
                this.updateStats((_c = container.parentElement) === null || _c === void 0 ? void 0 : _c.querySelector(".file-filter-stats-preview"), plugin);
            }));
        });
    }
    /**
     * Update statistics display
     */
    static updateStats(container, plugin) {
        if (!container)
            return;
        container.empty();
        const activeRules = plugin.settings.fileFilter.rules.filter((r) => r.enabled).length;
        const stats = [
            {
                label: t("Active Rules"),
                value: activeRules.toString(),
            },
            {
                label: t("Filter Mode"),
                value: plugin.settings.fileFilter.mode === FilterMode.WHITELIST
                    ? t("Whitelist")
                    : t("Blacklist"),
            },
            {
                label: t("Status"),
                value: plugin.settings.fileFilter.enabled
                    ? t("Enabled")
                    : t("Disabled"),
            },
        ];
        stats.forEach((stat) => {
            const statItem = container.createDiv({ cls: "filter-stat-item" });
            statItem.createSpan({
                text: stat.value,
                cls: "filter-stat-value",
            });
            statItem.createSpan({
                text: stat.label,
                cls: "filter-stat-label",
            });
        });
    }
    /**
     * Render description and recommendations
     */
    static renderDescription(container, plugin) {
        container.createEl("h3", { text: t("Why File Filtering?") });
        container.createEl("p", {
            text: t("File filtering helps you focus on relevant content while improving performance, especially in large vaults."),
        });
        // Recommended configurations
        const recsContainer = container.createDiv({
            cls: "recommended-configs",
        });
        recsContainer.createEl("h4", { text: t("Recommended Configurations") });
        const recommendations = [
            {
                title: t("Exclude Temporary Files"),
                description: t("Ignore system and temporary files"),
                rules: [
                    { type: "pattern", path: "*.tmp" },
                    { type: "pattern", path: ".DS_Store" },
                    { type: "pattern", path: "*~" },
                ],
            },
            {
                title: t("Exclude Archive Folder"),
                description: t("Skip archived content"),
                rules: [{ type: "folder", path: "Archive" }],
            },
            {
                title: t("Focus on Projects"),
                description: t("Index only specific project folders"),
                rules: [
                    { type: "folder", path: "Projects" },
                    { type: "folder", path: "Work" },
                ],
                mode: FilterMode.WHITELIST,
            },
        ];
        recommendations.forEach((rec) => {
            const recEl = recsContainer.createDiv({
                cls: "recommended-config-item",
            });
            recEl.createEl("h4", { text: rec.title });
            recEl.createEl("p", { text: rec.description });
            recEl.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
                var _a;
                // Apply recommended configuration
                if (rec.mode) {
                    plugin.settings.fileFilter.mode = rec.mode;
                }
                rec.rules.forEach((rule) => {
                    // Check if rule already exists
                    const exists = plugin.settings.fileFilter.rules.some((r) => r.path === rule.path && r.type === rule.type);
                    if (!exists) {
                        plugin.settings.fileFilter.rules.push(Object.assign(Object.assign({}, rule), { enabled: true }));
                    }
                });
                plugin.settings.fileFilter.enabled = true;
                yield plugin.saveSettings();
                new Notice(t("Applied recommended configuration: ") + rec.title);
                // Re-render configuration section
                const configSection = (_a = container.parentElement) === null || _a === void 0 ? void 0 : _a.querySelector(".file-filter-preview");
                if (configSection) {
                    this.renderConfiguration(configSection, plugin);
                }
            }));
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmlsZUZpbHRlclN0ZXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJGaWxlRmlsdGVyU3RlcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUUxQyxPQUFPLEVBQUUsVUFBVSxFQUFrQixNQUFNLDZCQUE2QixDQUFDO0FBRXpFLE9BQU8sRUFDTixhQUFhLEVBQ2IsaUJBQWlCLElBQUksV0FBVyxHQUNoQyxNQUFNLHFDQUFxQyxDQUFDO0FBQzdDLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQzlHLE9BQU8sb0NBQW9DLENBQUM7QUFDNUMsT0FBTyxtQ0FBbUMsQ0FBQztBQUUzQzs7R0FFRztBQUNILE1BQU0sT0FBTyxjQUFjO0lBQzFCOztPQUVHO0lBQ0gsTUFBTSxDQUFDLE1BQU0sQ0FDWixRQUFxQixFQUNyQixTQUFzQixFQUN0QixVQUFnQyxFQUNoQyxNQUE2QjtRQUU3QixRQUFRO1FBQ1IsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2pCLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUVsQixTQUFTO1FBQ1QsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzdELFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFO1lBQ3RCLElBQUksRUFBRSxDQUFDLENBQ04sd0ZBQXdGLENBQ3hGO1lBQ0QsR0FBRyxFQUFFLHFCQUFxQjtTQUMxQixDQUFDLENBQUM7UUFFSCxvQkFBb0I7UUFDcEIsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxvQkFBb0IsRUFB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QUFJLENBQ25ELENBQUM7b0JBQ0YsSUFBSSxDQUFDLE1BQU0sRUFBRTt3QkFDWixNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxpQ0FDakMsSUFBSSxLQUNQLE9BQU8sRUFBRSxJQUFJLElBQ1osQ0FBQztxQkFDSDtnQkFDRixDQUFDLENBQUMsQ0FBQztnQkFDSCxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO2dCQUMxQyxNQUFNLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFFNUIsSUFBSSxNQUFNLENBQ1QsQ0FBQyxDQUFDLHFDQUFxQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FDcEQsQ0FBQztnQkFFRixrQ0FBa0M7Z0JBQ2xDLE1BQU0sYUFBYSxHQUFHLE1BQUEsU0FBUyxDQUFDLGFBQWEsMENBQUUsYUFBYSxDQUMzRCxzQkFBc0IsQ0FDdEIsQ0FBQztnQkFDRixJQUFJLGFBQWEsRUFBRTtvQkFDbEIsSUFBSSxDQUFDLG1CQUFtQixDQUN2QixhQUE0QixFQUM1QixNQUFNLENBQ04sQ0FBQztpQkFDRjtZQUNGLENBQUMsQ0FBQSxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFNldHRpbmcsIE5vdGljZSwgc2V0SWNvbiwgRHJvcGRvd25Db21wb25lbnQgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHsgT25ib2FyZGluZ0NvbnRyb2xsZXIgfSBmcm9tIFwiLi4vT25ib2FyZGluZ0NvbnRyb2xsZXJcIjtcclxuaW1wb3J0IHsgRmlsdGVyTW9kZSwgRmlsZUZpbHRlclJ1bGUgfSBmcm9tIFwiQC9jb21tb24vc2V0dGluZy1kZWZpbml0aW9uXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjtcclxuaW1wb3J0IHtcclxuXHRGb2xkZXJTdWdnZXN0LFxyXG5cdFNpbXBsZUZpbGVTdWdnZXN0IGFzIEZpbGVTdWdnZXN0LFxyXG59IGZyb20gXCJAL2NvbXBvbmVudHMvdWkvaW5wdXRzL0F1dG9Db21wbGV0ZVwiO1xyXG5pbXBvcnQgeyBGaWxlRmlsdGVyUnVsZUVkaXRvck1vZGFsIH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy9vbmJvYXJkaW5nL21vZGFscy9GaWxlRmlsdGVyUnVsZUVkaXRvck1vZGFsXCI7XHJcbmltcG9ydCBcIkAvc3R5bGVzL29uYm9hcmRpbmctY29tcG9uZW50cy5jc3NcIjtcclxuaW1wb3J0IFwiQC9zdHlsZXMvZmlsZS1maWx0ZXItc2V0dGluZ3MuY3NzXCI7XHJcblxyXG4vKipcclxuICogRmlsZSBGaWx0ZXIgQ29uZmlndXJhdGlvbiBTdGVwXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgRmlsZUZpbHRlclN0ZXAge1xyXG5cdC8qKlxyXG5cdCAqIFJlbmRlciB0aGUgZmlsZSBmaWx0ZXIgY29uZmlndXJhdGlvbiBzdGVwXHJcblx0ICovXHJcblx0c3RhdGljIHJlbmRlcihcclxuXHRcdGhlYWRlckVsOiBIVE1MRWxlbWVudCxcclxuXHRcdGNvbnRlbnRFbDogSFRNTEVsZW1lbnQsXHJcblx0XHRjb250cm9sbGVyOiBPbmJvYXJkaW5nQ29udHJvbGxlcixcclxuXHRcdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdCkge1xyXG5cdFx0Ly8gQ2xlYXJcclxuXHRcdGhlYWRlckVsLmVtcHR5KCk7XHJcblx0XHRjb250ZW50RWwuZW1wdHkoKTtcclxuXHJcblx0XHQvLyBIZWFkZXJcclxuXHRcdGhlYWRlckVsLmNyZWF0ZUVsKFwiaDFcIiwgeyB0ZXh0OiB0KFwiT3B0aW1pemUgUGVyZm9ybWFuY2VcIikgfSk7XHJcblx0XHRoZWFkZXJFbC5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFxyXG5cdFx0XHRcdFwiQ29uZmlndXJlIGZpbGUgZmlsdGVyaW5nIHRvIGltcHJvdmUgaW5kZXhpbmcgcGVyZm9ybWFuY2UgYW5kIGZvY3VzIG9uIHJlbGV2YW50IGNvbnRlbnRcIixcclxuXHRcdFx0KSxcclxuXHRcdFx0Y2xzOiBcIm9uYm9hcmRpbmctc3VidGl0bGVcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFR3by1jb2x1bW4gbGF5b3V0XHJcblx0XHRjb25zdCBzaG93Y2FzZSA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwiY29tcG9uZW50LXNob3djYXNlXCIgfSk7XHJcblxyXG5cdFx0Ly8gTGVmdDogQ29uZmlndXJhdGlvblxyXG5cdFx0Y29uc3QgY29uZmlnU2VjdGlvbiA9IHNob3djYXNlLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJjb21wb25lbnQtc2hvd2Nhc2UtcHJldmlldyBmaWxlLWZpbHRlci1wcmV2aWV3XCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBSaWdodDogRGVzY3JpcHRpb24gYW5kIHJlY29tbWVuZGF0aW9uc1xyXG5cdFx0Y29uc3QgZGVzY1NlY3Rpb24gPSBzaG93Y2FzZS5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiY29tcG9uZW50LXNob3djYXNlLWRlc2NyaXB0aW9uXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBSZW5kZXIgY29uZmlndXJhdGlvbiBVSVxyXG5cdFx0dGhpcy5yZW5kZXJDb25maWd1cmF0aW9uKGNvbmZpZ1NlY3Rpb24sIHBsdWdpbik7XHJcblxyXG5cdFx0Ly8gUmVuZGVyIGRlc2NyaXB0aW9uIGFuZCByZWNvbW1lbmRhdGlvbnNcclxuXHRcdHRoaXMucmVuZGVyRGVzY3JpcHRpb24oZGVzY1NlY3Rpb24sIHBsdWdpbik7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW5kZXIgY29uZmlndXJhdGlvbiBVSVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgc3RhdGljIHJlbmRlckNvbmZpZ3VyYXRpb24oXHJcblx0XHRjb250YWluZXI6IEhUTUxFbGVtZW50LFxyXG5cdFx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0KSB7XHJcblx0XHQvLyBFbmFibGUvRGlzYWJsZSB0b2dnbGVcclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lcilcclxuXHRcdFx0LnNldE5hbWUodChcIkVuYWJsZSBGaWxlIEZpbHRlclwiKSlcclxuXHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0dChcIkZpbHRlciBmaWxlcyBkdXJpbmcgdGFzayBpbmRleGluZyB0byBpbXByb3ZlIHBlcmZvcm1hbmNlXCIpLFxyXG5cdFx0XHQpXHJcblx0XHRcdC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT5cclxuXHRcdFx0XHR0b2dnbGVcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZShwbHVnaW4uc2V0dGluZ3MuZmlsZUZpbHRlci5lbmFibGVkKVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRwbHVnaW4uc2V0dGluZ3MuZmlsZUZpbHRlci5lbmFibGVkID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdGF3YWl0IHBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHRcdFx0Ly8gUmUtcmVuZGVyIHRvIHNob3cvaGlkZSBjb25maWd1cmF0aW9uXHJcblx0XHRcdFx0XHRcdHRoaXMucmVuZGVyKFxyXG5cdFx0XHRcdFx0XHRcdGNvbnRhaW5lci5wYXJlbnRFbGVtZW50XHJcblx0XHRcdFx0XHRcdFx0XHQ/LnByZXZpb3VzRWxlbWVudFNpYmxpbmcgYXMgSFRNTEVsZW1lbnQsXHJcblx0XHRcdFx0XHRcdFx0Y29udGFpbmVyLnBhcmVudEVsZW1lbnRcclxuXHRcdFx0XHRcdFx0XHRcdD8ucGFyZW50RWxlbWVudCBhcyBIVE1MRWxlbWVudCxcclxuXHRcdFx0XHRcdFx0XHR7fSBhcyBPbmJvYXJkaW5nQ29udHJvbGxlcixcclxuXHRcdFx0XHRcdFx0XHRwbHVnaW4sXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9KSxcclxuXHRcdFx0KTtcclxuXHJcblx0XHRpZiAoIXBsdWdpbi5zZXR0aW5ncy5maWxlRmlsdGVyLmVuYWJsZWQpIHtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEZpbHRlciBtb2RlIHNlbGVjdGlvblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiRmlsdGVyIE1vZGVcIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcIldoaXRlbGlzdDogSW5jbHVkZSBvbmx5IHNwZWNpZmllZCBwYXRocyB8IEJsYWNrbGlzdDogRXhjbHVkZSBzcGVjaWZpZWQgcGF0aHNcIixcclxuXHRcdFx0XHQpLFxyXG5cdFx0XHQpXHJcblx0XHRcdC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+XHJcblx0XHRcdFx0ZHJvcGRvd25cclxuXHRcdFx0XHRcdC5hZGRPcHRpb24oXHJcblx0XHRcdFx0XHRcdEZpbHRlck1vZGUuV0hJVEVMSVNULFxyXG5cdFx0XHRcdFx0XHR0KFwiV2hpdGVsaXN0IChJbmNsdWRlIG9ubHkpXCIpLFxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihGaWx0ZXJNb2RlLkJMQUNLTElTVCwgdChcIkJsYWNrbGlzdCAoRXhjbHVkZSlcIikpXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUocGx1Z2luLnNldHRpbmdzLmZpbGVGaWx0ZXIubW9kZSlcclxuXHRcdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWU6IEZpbHRlck1vZGUpID0+IHtcclxuXHRcdFx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLmZpbGVGaWx0ZXIubW9kZSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRhd2FpdCBwbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0XHRcdHRoaXMudXBkYXRlU3RhdHMoY29udGFpbmVyLCBwbHVnaW4pO1xyXG5cdFx0XHRcdFx0fSksXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0Ly8gUXVpY2sgYWRkIHJ1bGVzIHNlY3Rpb25cclxuXHRcdGNvbnN0IHF1aWNrQWRkQ29udGFpbmVyID0gY29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmaWxlLWZpbHRlci1jb25maWdcIixcclxuXHRcdH0pO1xyXG5cdFx0cXVpY2tBZGRDb250YWluZXIuY3JlYXRlRWwoXCJoNFwiLCB7IHRleHQ6IHQoXCJRdWljayBBZGQgUnVsZXNcIikgfSk7XHJcblxyXG5cdFx0Y29uc3QgYnV0dG9uc0NvbnRhaW5lciA9IHF1aWNrQWRkQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJzZXR0aW5nLWl0ZW0tY29udHJvbFwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQWRkIGZpbGUgcnVsZSBidXR0b25cclxuXHRcdGNvbnN0IGFkZEZpbGVCdG4gPSBidXR0b25zQ29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0dGV4dDogdChcIkFkZCBGaWxlXCIpLFxyXG5cdFx0XHRjbHM6IFwibW9kLWN0YVwiLFxyXG5cdFx0fSk7XHJcblx0XHRhZGRGaWxlQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IG1vZGFsID0gbmV3IEZpbGVGaWx0ZXJSdWxlRWRpdG9yTW9kYWwocGx1Z2luLmFwcCwgcGx1Z2luLCB7XHJcblx0XHRcdFx0YXV0b0FkZFJ1bGVUeXBlOiBcImZpbGVcIixcclxuXHRcdFx0XHRvbkNsb3NlOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRjb25zdCBydWxlc0VsID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFx0XHRcdFwiLmZpbGUtZmlsdGVyLXJ1bGVzLWNvbnRhaW5lclwiLFxyXG5cdFx0XHRcdFx0KSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XHJcblx0XHRcdFx0XHRjb25zdCBzdGF0c0VsID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFx0XHRcdFwiLmZpbGUtZmlsdGVyLXN0YXRzLXByZXZpZXdcIixcclxuXHRcdFx0XHRcdCkgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xyXG5cdFx0XHRcdFx0aWYgKHJ1bGVzRWwpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5yZW5kZXJSdWxlcyhydWxlc0VsLCBwbHVnaW4pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0aWYgKHN0YXRzRWwpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy51cGRhdGVTdGF0cyhzdGF0c0VsLCBwbHVnaW4pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRtb2RhbC5vcGVuKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBBZGQgZm9sZGVyIHJ1bGUgYnV0dG9uXHJcblx0XHRjb25zdCBhZGRGb2xkZXJCdG4gPSBidXR0b25zQ29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0dGV4dDogdChcIkFkZCBGb2xkZXJcIiksXHJcblx0XHR9KTtcclxuXHRcdGFkZEZvbGRlckJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBtb2RhbCA9IG5ldyBGaWxlRmlsdGVyUnVsZUVkaXRvck1vZGFsKHBsdWdpbi5hcHAsIHBsdWdpbiwge1xyXG5cdFx0XHRcdGF1dG9BZGRSdWxlVHlwZTogXCJmb2xkZXJcIixcclxuXHRcdFx0XHRvbkNsb3NlOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRjb25zdCBydWxlc0VsID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFx0XHRcdFwiLmZpbGUtZmlsdGVyLXJ1bGVzLWNvbnRhaW5lclwiLFxyXG5cdFx0XHRcdFx0KSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XHJcblx0XHRcdFx0XHRjb25zdCBzdGF0c0VsID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFx0XHRcdFwiLmZpbGUtZmlsdGVyLXN0YXRzLXByZXZpZXdcIixcclxuXHRcdFx0XHRcdCkgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xyXG5cdFx0XHRcdFx0aWYgKHJ1bGVzRWwpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5yZW5kZXJSdWxlcyhydWxlc0VsLCBwbHVnaW4pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0aWYgKHN0YXRzRWwpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy51cGRhdGVTdGF0cyhzdGF0c0VsLCBwbHVnaW4pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRtb2RhbC5vcGVuKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBBZGQgcGF0dGVybiBydWxlIGJ1dHRvblxyXG5cdFx0Y29uc3QgYWRkUGF0dGVybkJ0biA9IGJ1dHRvbnNDb250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFwiQWRkIFBhdHRlcm5cIiksXHJcblx0XHR9KTtcclxuXHRcdGFkZFBhdHRlcm5CdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgbW9kYWwgPSBuZXcgRmlsZUZpbHRlclJ1bGVFZGl0b3JNb2RhbChwbHVnaW4uYXBwLCBwbHVnaW4sIHtcclxuXHRcdFx0XHRhdXRvQWRkUnVsZVR5cGU6IFwicGF0dGVyblwiLFxyXG5cdFx0XHRcdG9uQ2xvc2U6ICgpID0+IHtcclxuXHRcdFx0XHRcdGNvbnN0IHJ1bGVzRWwgPSBjb250YWluZXIucXVlcnlTZWxlY3RvcihcclxuXHRcdFx0XHRcdFx0XCIuZmlsZS1maWx0ZXItcnVsZXMtY29udGFpbmVyXCIsXHJcblx0XHRcdFx0XHQpIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcclxuXHRcdFx0XHRcdGNvbnN0IHN0YXRzRWwgPSBjb250YWluZXIucXVlcnlTZWxlY3RvcihcclxuXHRcdFx0XHRcdFx0XCIuZmlsZS1maWx0ZXItc3RhdHMtcHJldmlld1wiLFxyXG5cdFx0XHRcdFx0KSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XHJcblx0XHRcdFx0XHRpZiAocnVsZXNFbCkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnJlbmRlclJ1bGVzKHJ1bGVzRWwsIHBsdWdpbik7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRpZiAoc3RhdHNFbCkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnVwZGF0ZVN0YXRzKHN0YXRzRWwsIHBsdWdpbik7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdG1vZGFsLm9wZW4oKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEN1cnJlbnQgcnVsZXMgbGlzdFxyXG5cdFx0Y29uc3QgcnVsZXNDb250YWluZXIgPSBjb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZpbGUtZmlsdGVyLXJ1bGVzLWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblx0XHR0aGlzLnJlbmRlclJ1bGVzKHJ1bGVzQ29udGFpbmVyLCBwbHVnaW4pO1xyXG5cclxuXHRcdC8vIFN0YXRpc3RpY3NcclxuXHRcdGNvbnN0IHN0YXRzQ29udGFpbmVyID0gY29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmaWxlLWZpbHRlci1zdGF0cy1wcmV2aWV3XCIsXHJcblx0XHR9KTtcclxuXHRcdHRoaXMudXBkYXRlU3RhdHMoc3RhdHNDb250YWluZXIsIHBsdWdpbik7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW5kZXIgY3VycmVudCBydWxlcyB3aXRoIGlubGluZSBlZGl0aW5nIHN1cHBvcnRcclxuXHQgKi9cclxuXHRwcml2YXRlIHN0YXRpYyByZW5kZXJSdWxlcyhcclxuXHRcdGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXHJcblx0XHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHQpIHtcclxuXHRcdGNvbnRhaW5lci5lbXB0eSgpO1xyXG5cclxuXHRcdGlmIChwbHVnaW4uc2V0dGluZ3MuZmlsZUZpbHRlci5ydWxlcy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0Y29udGFpbmVyLmNyZWF0ZUVsKFwicFwiLCB7XHJcblx0XHRcdFx0dGV4dDogdChcIk5vIGZpbHRlciBydWxlcyBjb25maWd1cmVkIHlldFwiKSxcclxuXHRcdFx0XHRjbHM6IFwic2V0dGluZy1pdGVtLWRlc2NyaXB0aW9uXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0cGx1Z2luLnNldHRpbmdzLmZpbGVGaWx0ZXIucnVsZXMuZm9yRWFjaCgocnVsZSwgaW5kZXgpID0+IHtcclxuXHRcdFx0Y29uc3QgcnVsZUNvbnRhaW5lciA9IGNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJmaWxlLWZpbHRlci1ydWxlXCIsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gUnVsZSB0eXBlIGRyb3Bkb3duXHJcblx0XHRcdGNvbnN0IHR5cGVDb250YWluZXIgPSBydWxlQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcImZpbGUtZmlsdGVyLXJ1bGUtdHlwZVwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0dHlwZUNvbnRhaW5lci5jcmVhdGVFbChcImxhYmVsXCIsIHsgdGV4dDogdChcIlR5cGU6XCIpIH0pO1xyXG5cclxuXHRcdFx0bmV3IERyb3Bkb3duQ29tcG9uZW50KHR5cGVDb250YWluZXIpXHJcblx0XHRcdFx0LmFkZE9wdGlvbihcImZpbGVcIiwgdChcIkZpbGVcIikpXHJcblx0XHRcdFx0LmFkZE9wdGlvbihcImZvbGRlclwiLCB0KFwiRm9sZGVyXCIpKVxyXG5cdFx0XHRcdC5hZGRPcHRpb24oXCJwYXR0ZXJuXCIsIHQoXCJQYXR0ZXJuXCIpKVxyXG5cdFx0XHRcdC5zZXRWYWx1ZShydWxlLnR5cGUpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZTogXCJmaWxlXCIgfCBcImZvbGRlclwiIHwgXCJwYXR0ZXJuXCIpID0+IHtcclxuXHRcdFx0XHRcdHJ1bGUudHlwZSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0YXdhaXQgcGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdFx0Ly8gT25seSByZS1yZW5kZXIgcnVsZXMgY29udGFpbmVyLCBub3QgdGhlIHdob2xlIGNvbXBvbmVudFxyXG5cdFx0XHRcdFx0dGhpcy5yZW5kZXJSdWxlcyhjb250YWluZXIsIHBsdWdpbik7XHJcblx0XHRcdFx0XHR0aGlzLnVwZGF0ZVN0YXRzKFxyXG5cdFx0XHRcdFx0XHRjb250YWluZXIucGFyZW50RWxlbWVudD8ucXVlcnlTZWxlY3RvcihcclxuXHRcdFx0XHRcdFx0XHRcIi5maWxlLWZpbHRlci1zdGF0cy1wcmV2aWV3XCIsXHJcblx0XHRcdFx0XHRcdCkgYXMgSFRNTEVsZW1lbnQsXHJcblx0XHRcdFx0XHRcdHBsdWdpbixcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBSdWxlIHNjb3BlIGRyb3Bkb3duIChwZXItcnVsZSlcclxuXHRcdFx0Y29uc3Qgc2NvcGVDb250YWluZXIgPSBydWxlQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcImZpbGUtZmlsdGVyLXJ1bGUtc2NvcGVcIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdHNjb3BlQ29udGFpbmVyLmNyZWF0ZUVsKFwibGFiZWxcIiwgeyB0ZXh0OiB0KFwiU2NvcGU6XCIpIH0pO1xyXG5cdFx0XHRuZXcgRHJvcGRvd25Db21wb25lbnQoc2NvcGVDb250YWluZXIpXHJcblx0XHRcdFx0LmFkZE9wdGlvbihcImJvdGhcIiwgdChcIkJvdGhcIikpXHJcblx0XHRcdFx0LmFkZE9wdGlvbihcImlubGluZVwiLCB0KFwiSW5saW5lXCIpKVxyXG5cdFx0XHRcdC5hZGRPcHRpb24oXCJmaWxlXCIsIHQoXCJGaWxlXCIpKVxyXG5cdFx0XHRcdC5zZXRWYWx1ZSgocnVsZSBhcyBhbnkpLnNjb3BlIHx8IFwiYm90aFwiKVxyXG5cdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWU6IFwiYm90aFwiIHwgXCJpbmxpbmVcIiB8IFwiZmlsZVwiKSA9PiB7XHJcblx0XHRcdFx0XHQocnVsZSBhcyBhbnkpLnNjb3BlID0gdmFsdWU7XHJcblx0XHRcdFx0XHRhd2FpdCBwbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBQYXRoIGlucHV0IHdpdGggYXV0b2NvbXBsZXRlXHJcblx0XHRcdGNvbnN0IHBhdGhDb250YWluZXIgPSBydWxlQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcImZpbGUtZmlsdGVyLXJ1bGUtcGF0aFwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0cGF0aENvbnRhaW5lci5jcmVhdGVFbChcImxhYmVsXCIsIHsgdGV4dDogdChcIlBhdGg6XCIpIH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgcGF0aElucHV0ID0gcGF0aENvbnRhaW5lci5jcmVhdGVFbChcImlucHV0XCIsIHtcclxuXHRcdFx0XHR0eXBlOiBcInRleHRcIixcclxuXHRcdFx0XHR2YWx1ZTogcnVsZS5wYXRoLFxyXG5cdFx0XHRcdHBsYWNlaG9sZGVyOlxyXG5cdFx0XHRcdFx0cnVsZS50eXBlID09PSBcInBhdHRlcm5cIlxyXG5cdFx0XHRcdFx0XHQ/IFwiKi50bXAsIHRlbXAvKlwiXHJcblx0XHRcdFx0XHRcdDogcnVsZS50eXBlID09PSBcImZvbGRlclwiXHJcblx0XHRcdFx0XHRcdFx0PyBcInBhdGgvdG8vZm9sZGVyXCJcclxuXHRcdFx0XHRcdFx0XHQ6IFwicGF0aC90by9maWxlLm1kXCIsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQWRkIGFwcHJvcHJpYXRlIGF1dG9jb21wbGV0ZSBiYXNlZCBvbiBydWxlIHR5cGVcclxuXHRcdFx0aWYgKHJ1bGUudHlwZSA9PT0gXCJmb2xkZXJcIikge1xyXG5cdFx0XHRcdG5ldyBGb2xkZXJTdWdnZXN0KHBsdWdpbi5hcHAsIHBhdGhJbnB1dCwgcGx1Z2luLCBcInNpbmdsZVwiKTtcclxuXHRcdFx0fSBlbHNlIGlmIChydWxlLnR5cGUgPT09IFwiZmlsZVwiKSB7XHJcblx0XHRcdFx0bmV3IEZpbGVTdWdnZXN0KHBhdGhJbnB1dCwgcGx1Z2luLCAoZmlsZSkgPT4ge1xyXG5cdFx0XHRcdFx0cnVsZS5wYXRoID0gZmlsZS5wYXRoO1xyXG5cdFx0XHRcdFx0cGF0aElucHV0LnZhbHVlID0gZmlsZS5wYXRoO1xyXG5cdFx0XHRcdFx0cGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRwYXRoSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImlucHV0XCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0XHRydWxlLnBhdGggPSBwYXRoSW5wdXQudmFsdWU7XHJcblx0XHRcdFx0YXdhaXQgcGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIEVuYWJsZWQgdG9nZ2xlXHJcblx0XHRcdGNvbnN0IGVuYWJsZWRDb250YWluZXIgPSBydWxlQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcImZpbGUtZmlsdGVyLXJ1bGUtZW5hYmxlZFwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0ZW5hYmxlZENvbnRhaW5lci5jcmVhdGVFbChcImxhYmVsXCIsIHsgdGV4dDogdChcIkVuYWJsZWQ6XCIpIH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgZW5hYmxlZENoZWNrYm94ID0gZW5hYmxlZENvbnRhaW5lci5jcmVhdGVFbChcImlucHV0XCIsIHtcclxuXHRcdFx0XHR0eXBlOiBcImNoZWNrYm94XCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRlbmFibGVkQ2hlY2tib3guY2hlY2tlZCA9IHJ1bGUuZW5hYmxlZDtcclxuXHJcblx0XHRcdGVuYWJsZWRDaGVja2JveC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0XHRydWxlLmVuYWJsZWQgPSBlbmFibGVkQ2hlY2tib3guY2hlY2tlZDtcclxuXHRcdFx0XHRhd2FpdCBwbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0dGhpcy51cGRhdGVTdGF0cyhcclxuXHRcdFx0XHRcdGNvbnRhaW5lci5wYXJlbnRFbGVtZW50Py5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRcdFx0XHRcIi5maWxlLWZpbHRlci1zdGF0cy1wcmV2aWV3XCIsXHJcblx0XHRcdFx0XHQpIGFzIEhUTUxFbGVtZW50LFxyXG5cdFx0XHRcdFx0cGx1Z2luLFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gRGVsZXRlIGJ1dHRvblxyXG5cdFx0XHRjb25zdCBkZWxldGVCdXR0b24gPSBydWxlQ29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0XHRjbHM6IFwiZmlsZS1maWx0ZXItcnVsZS1kZWxldGUgbW9kLWRlc3RydWN0aXZlXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRzZXRJY29uKGRlbGV0ZUJ1dHRvbiwgXCJ0cmFzaFwiKTtcclxuXHRcdFx0ZGVsZXRlQnV0dG9uLnRpdGxlID0gdChcIkRlbGV0ZSBydWxlXCIpO1xyXG5cclxuXHRcdFx0ZGVsZXRlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLmZpbGVGaWx0ZXIucnVsZXMuc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0XHRhd2FpdCBwbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0dGhpcy5yZW5kZXJSdWxlcyhjb250YWluZXIsIHBsdWdpbik7XHJcblx0XHRcdFx0dGhpcy51cGRhdGVTdGF0cyhcclxuXHRcdFx0XHRcdGNvbnRhaW5lci5wYXJlbnRFbGVtZW50Py5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRcdFx0XHRcIi5maWxlLWZpbHRlci1zdGF0cy1wcmV2aWV3XCIsXHJcblx0XHRcdFx0XHQpIGFzIEhUTUxFbGVtZW50LFxyXG5cdFx0XHRcdFx0cGx1Z2luLFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgc3RhdGlzdGljcyBkaXNwbGF5XHJcblx0ICovXHJcblx0cHJpdmF0ZSBzdGF0aWMgdXBkYXRlU3RhdHMoXHJcblx0XHRjb250YWluZXI6IEhUTUxFbGVtZW50LFxyXG5cdFx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0KSB7XHJcblx0XHRpZiAoIWNvbnRhaW5lcikgcmV0dXJuO1xyXG5cclxuXHRcdGNvbnRhaW5lci5lbXB0eSgpO1xyXG5cclxuXHRcdGNvbnN0IGFjdGl2ZVJ1bGVzID0gcGx1Z2luLnNldHRpbmdzLmZpbGVGaWx0ZXIucnVsZXMuZmlsdGVyKFxyXG5cdFx0XHQocikgPT4gci5lbmFibGVkLFxyXG5cdFx0KS5sZW5ndGg7XHJcblxyXG5cdFx0Y29uc3Qgc3RhdHMgPSBbXHJcblx0XHRcdHtcclxuXHRcdFx0XHRsYWJlbDogdChcIkFjdGl2ZSBSdWxlc1wiKSxcclxuXHRcdFx0XHR2YWx1ZTogYWN0aXZlUnVsZXMudG9TdHJpbmcoKSxcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGxhYmVsOiB0KFwiRmlsdGVyIE1vZGVcIiksXHJcblx0XHRcdFx0dmFsdWU6XHJcblx0XHRcdFx0XHRwbHVnaW4uc2V0dGluZ3MuZmlsZUZpbHRlci5tb2RlID09PSBGaWx0ZXJNb2RlLldISVRFTElTVFxyXG5cdFx0XHRcdFx0XHQ/IHQoXCJXaGl0ZWxpc3RcIilcclxuXHRcdFx0XHRcdFx0OiB0KFwiQmxhY2tsaXN0XCIpLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0bGFiZWw6IHQoXCJTdGF0dXNcIiksXHJcblx0XHRcdFx0dmFsdWU6IHBsdWdpbi5zZXR0aW5ncy5maWxlRmlsdGVyLmVuYWJsZWRcclxuXHRcdFx0XHRcdD8gdChcIkVuYWJsZWRcIilcclxuXHRcdFx0XHRcdDogdChcIkRpc2FibGVkXCIpLFxyXG5cdFx0XHR9LFxyXG5cdFx0XTtcclxuXHJcblx0XHRzdGF0cy5mb3JFYWNoKChzdGF0KSA9PiB7XHJcblx0XHRcdGNvbnN0IHN0YXRJdGVtID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJmaWx0ZXItc3RhdC1pdGVtXCIgfSk7XHJcblx0XHRcdHN0YXRJdGVtLmNyZWF0ZVNwYW4oe1xyXG5cdFx0XHRcdHRleHQ6IHN0YXQudmFsdWUsXHJcblx0XHRcdFx0Y2xzOiBcImZpbHRlci1zdGF0LXZhbHVlXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRzdGF0SXRlbS5jcmVhdGVTcGFuKHtcclxuXHRcdFx0XHR0ZXh0OiBzdGF0LmxhYmVsLFxyXG5cdFx0XHRcdGNsczogXCJmaWx0ZXItc3RhdC1sYWJlbFwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVuZGVyIGRlc2NyaXB0aW9uIGFuZCByZWNvbW1lbmRhdGlvbnNcclxuXHQgKi9cclxuXHRwcml2YXRlIHN0YXRpYyByZW5kZXJEZXNjcmlwdGlvbihcclxuXHRcdGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXHJcblx0XHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHQpIHtcclxuXHRcdGNvbnRhaW5lci5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogdChcIldoeSBGaWxlIEZpbHRlcmluZz9cIikgfSk7XHJcblx0XHRjb250YWluZXIuY3JlYXRlRWwoXCJwXCIsIHtcclxuXHRcdFx0dGV4dDogdChcclxuXHRcdFx0XHRcIkZpbGUgZmlsdGVyaW5nIGhlbHBzIHlvdSBmb2N1cyBvbiByZWxldmFudCBjb250ZW50IHdoaWxlIGltcHJvdmluZyBwZXJmb3JtYW5jZSwgZXNwZWNpYWxseSBpbiBsYXJnZSB2YXVsdHMuXCIsXHJcblx0XHRcdCksXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBSZWNvbW1lbmRlZCBjb25maWd1cmF0aW9uc1xyXG5cdFx0Y29uc3QgcmVjc0NvbnRhaW5lciA9IGNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwicmVjb21tZW5kZWQtY29uZmlnc1wiLFxyXG5cdFx0fSk7XHJcblx0XHRyZWNzQ29udGFpbmVyLmNyZWF0ZUVsKFwiaDRcIiwgeyB0ZXh0OiB0KFwiUmVjb21tZW5kZWQgQ29uZmlndXJhdGlvbnNcIikgfSk7XHJcblxyXG5cdFx0Y29uc3QgcmVjb21tZW5kYXRpb25zID0gW1xyXG5cdFx0XHR7XHJcblx0XHRcdFx0dGl0bGU6IHQoXCJFeGNsdWRlIFRlbXBvcmFyeSBGaWxlc1wiKSxcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogdChcIklnbm9yZSBzeXN0ZW0gYW5kIHRlbXBvcmFyeSBmaWxlc1wiKSxcclxuXHRcdFx0XHRydWxlczogW1xyXG5cdFx0XHRcdFx0eyB0eXBlOiBcInBhdHRlcm5cIiBhcyBjb25zdCwgcGF0aDogXCIqLnRtcFwiIH0sXHJcblx0XHRcdFx0XHR7IHR5cGU6IFwicGF0dGVyblwiIGFzIGNvbnN0LCBwYXRoOiBcIi5EU19TdG9yZVwiIH0sXHJcblx0XHRcdFx0XHR7IHR5cGU6IFwicGF0dGVyblwiIGFzIGNvbnN0LCBwYXRoOiBcIip+XCIgfSxcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0dGl0bGU6IHQoXCJFeGNsdWRlIEFyY2hpdmUgRm9sZGVyXCIpLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiB0KFwiU2tpcCBhcmNoaXZlZCBjb250ZW50XCIpLFxyXG5cdFx0XHRcdHJ1bGVzOiBbeyB0eXBlOiBcImZvbGRlclwiIGFzIGNvbnN0LCBwYXRoOiBcIkFyY2hpdmVcIiB9XSxcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHRpdGxlOiB0KFwiRm9jdXMgb24gUHJvamVjdHNcIiksXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IHQoXCJJbmRleCBvbmx5IHNwZWNpZmljIHByb2plY3QgZm9sZGVyc1wiKSxcclxuXHRcdFx0XHRydWxlczogW1xyXG5cdFx0XHRcdFx0eyB0eXBlOiBcImZvbGRlclwiIGFzIGNvbnN0LCBwYXRoOiBcIlByb2plY3RzXCIgfSxcclxuXHRcdFx0XHRcdHsgdHlwZTogXCJmb2xkZXJcIiBhcyBjb25zdCwgcGF0aDogXCJXb3JrXCIgfSxcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdG1vZGU6IEZpbHRlck1vZGUuV0hJVEVMSVNULFxyXG5cdFx0XHR9LFxyXG5cdFx0XTtcclxuXHJcblx0XHRyZWNvbW1lbmRhdGlvbnMuZm9yRWFjaCgocmVjKSA9PiB7XHJcblx0XHRcdGNvbnN0IHJlY0VsID0gcmVjc0NvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJyZWNvbW1lbmRlZC1jb25maWctaXRlbVwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0cmVjRWwuY3JlYXRlRWwoXCJoNFwiLCB7IHRleHQ6IHJlYy50aXRsZSB9KTtcclxuXHRcdFx0cmVjRWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogcmVjLmRlc2NyaXB0aW9uIH0pO1xyXG5cclxuXHRcdFx0cmVjRWwuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0XHQvLyBBcHBseSByZWNvbW1lbmRlZCBjb25maWd1cmF0aW9uXHJcblx0XHRcdFx0aWYgKHJlYy5tb2RlKSB7XHJcblx0XHRcdFx0XHRwbHVnaW4uc2V0dGluZ3MuZmlsZUZpbHRlci5tb2RlID0gcmVjLm1vZGU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHJlYy5ydWxlcy5mb3JFYWNoKChydWxlKSA9PiB7XHJcblx0XHRcdFx0XHQvLyBDaGVjayBpZiBydWxlIGFscmVhZHkgZXhpc3RzXHJcblx0XHRcdFx0XHRjb25zdCBleGlzdHMgPSBwbHVnaW4uc2V0dGluZ3MuZmlsZUZpbHRlci5ydWxlcy5zb21lKFxyXG5cdFx0XHRcdFx0XHQocikgPT4gci5wYXRoID09PSBydWxlLnBhdGggJiYgci50eXBlID09PSBydWxlLnR5cGUsXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0aWYgKCFleGlzdHMpIHtcclxuXHRcdFx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLmZpbGVGaWx0ZXIucnVsZXMucHVzaCh7XHJcblx0XHRcdFx0XHRcdFx0Li4ucnVsZSxcclxuXHRcdFx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRwbHVnaW4uc2V0dGluZ3MuZmlsZUZpbHRlci5lbmFibGVkID0gdHJ1ZTtcclxuXHRcdFx0XHRhd2FpdCBwbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblxyXG5cdFx0XHRcdG5ldyBOb3RpY2UoXHJcblx0XHRcdFx0XHR0KFwiQXBwbGllZCByZWNvbW1lbmRlZCBjb25maWd1cmF0aW9uOiBcIikgKyByZWMudGl0bGUsXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0Ly8gUmUtcmVuZGVyIGNvbmZpZ3VyYXRpb24gc2VjdGlvblxyXG5cdFx0XHRcdGNvbnN0IGNvbmZpZ1NlY3Rpb24gPSBjb250YWluZXIucGFyZW50RWxlbWVudD8ucXVlcnlTZWxlY3RvcihcclxuXHRcdFx0XHRcdFwiLmZpbGUtZmlsdGVyLXByZXZpZXdcIixcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGlmIChjb25maWdTZWN0aW9uKSB7XHJcblx0XHRcdFx0XHR0aGlzLnJlbmRlckNvbmZpZ3VyYXRpb24oXHJcblx0XHRcdFx0XHRcdGNvbmZpZ1NlY3Rpb24gYXMgSFRNTEVsZW1lbnQsXHJcblx0XHRcdFx0XHRcdHBsdWdpbixcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH1cclxufVxyXG4iXX0=