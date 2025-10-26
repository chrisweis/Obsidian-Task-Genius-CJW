import { __awaiter } from "tslib";
import { DropdownComponent, Modal, Setting, setIcon } from "obsidian";
import { t } from "@/translations/helper";
import { FilterMode } from "@/common/setting-definition";
import { FolderSuggest, SimpleFileSuggest as FileSuggest, } from "@/components/ui/inputs/AutoComplete";
import "@/styles/file-filter-settings.css";
export class FileFilterRuleEditorModal extends Modal {
    constructor(app, plugin, options = {}) {
        super(app);
        this.rulesContainer = null;
        this.statsContainer = null;
        this.plugin = plugin;
        this.options = options;
    }
    onOpen() {
        this.modalEl.addClass("file-filter-rule-editor-modal");
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h2", { text: t("Edit File Filter Rules") });
        contentEl.createEl("p", {
            text: t("Configure which files, folders, or patterns are included during task indexing."),
            cls: "setting-item-description",
        });
        new Setting(contentEl)
            .setName(t("Filter Mode"))
            .setDesc(t("Whitelist: include only specified paths. Blacklist: exclude specified paths."))
            .addDropdown((dropdown) => dropdown
            .addOption(FilterMode.WHITELIST, t("Whitelist (Include only)"))
            .addOption(FilterMode.BLACKLIST, t("Blacklist (Exclude)"))
            .setValue(this.plugin.settings.fileFilter.mode)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.fileFilter.mode = value;
            yield this.plugin.saveSettings();
            this.updateStats();
        })));
        const actionSetting = new Setting(contentEl);
        actionSetting.settingEl.addClass("file-filter-rule-actions");
        actionSetting
            .addButton((button) => button
            .setButtonText(t("Add File Rule"))
            .setCta()
            .onClick(() => {
            void this.addRule("file");
        }))
            .addButton((button) => button.setButtonText(t("Add Folder Rule")).onClick(() => {
            void this.addRule("folder");
        }))
            .addButton((button) => button.setButtonText(t("Add Pattern Rule")).onClick(() => {
            void this.addRule("pattern");
        }));
        this.rulesContainer = contentEl.createDiv({
            cls: "file-filter-rules-container",
        });
        this.statsContainer = contentEl.createDiv({
            cls: "file-filter-stats-preview",
        });
        new Setting(contentEl).addButton((button) => button
            .setButtonText(t("Done"))
            .setCta()
            .onClick(() => this.close()));
        this.renderRules();
        this.updateStats();
        if (this.options.autoAddRuleType) {
            void this.addRule(this.options.autoAddRuleType).then((rule) => {
                this.pendingRule = rule;
            });
        }
    }
    onClose() {
        var _a, _b;
        if (this.pendingRule && !this.pendingRule.path.trim()) {
            const index = this.plugin.settings.fileFilter.rules.indexOf(this.pendingRule);
            if (index !== -1) {
                this.plugin.settings.fileFilter.rules.splice(index, 1);
                void this.plugin.saveSettings();
            }
        }
        this.pendingRule = undefined;
        this.contentEl.empty();
        (_b = (_a = this.options).onClose) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
    addRule(type) {
        return __awaiter(this, void 0, void 0, function* () {
            const newRule = {
                type,
                path: "",
                enabled: true,
            };
            this.plugin.settings.fileFilter.rules.push(newRule);
            yield this.plugin.saveSettings();
            this.renderRules();
            this.updateStats();
            return newRule;
        });
    }
    renderRules() {
        if (!this.rulesContainer)
            return;
        const container = this.rulesContainer;
        container.empty();
        if (this.plugin.settings.fileFilter.rules.length === 0) {
            container.createEl("p", {
                text: t("No filter rules configured yet"),
                cls: "setting-item-description",
            });
            return;
        }
        this.plugin.settings.fileFilter.rules.forEach((rule, index) => {
            const ruleContainer = container.createDiv({
                cls: "file-filter-rule",
            });
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
                rule.type = value;
                yield this.plugin.saveSettings();
                this.renderRules();
                this.updateStats();
            }));
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
                yield this.plugin.saveSettings();
            }));
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
            if (rule.type === "folder") {
                new FolderSuggest(this.plugin.app, pathInput, this.plugin, "single");
            }
            else if (rule.type === "file") {
                new FileSuggest(pathInput, this.plugin, (file) => {
                    rule.path = file.path;
                    pathInput.value = file.path;
                    this.plugin.saveSettings();
                });
            }
            pathInput.addEventListener("input", () => __awaiter(this, void 0, void 0, function* () {
                rule.path = pathInput.value;
                yield this.plugin.saveSettings();
            }));
            const enabledContainer = ruleContainer.createDiv({
                cls: "file-filter-rule-enabled",
            });
            enabledContainer.createEl("label", { text: t("Enabled:") });
            const enabledCheckbox = enabledContainer.createEl("input", {
                type: "checkbox",
            });
            enabledCheckbox.checked = rule.enabled;
            enabledCheckbox.addEventListener("change", () => __awaiter(this, void 0, void 0, function* () {
                rule.enabled = enabledCheckbox.checked;
                yield this.plugin.saveSettings();
                this.updateStats();
            }));
            const deleteButton = ruleContainer.createEl("button", {
                cls: "file-filter-rule-delete mod-destructive",
            });
            setIcon(deleteButton, "trash");
            deleteButton.title = t("Delete rule");
            deleteButton.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.fileFilter.rules.splice(index, 1);
                yield this.plugin.saveSettings();
                this.renderRules();
                this.updateStats();
            }));
        });
    }
    updateStats() {
        if (!this.statsContainer)
            return;
        const container = this.statsContainer;
        container.empty();
        const activeRules = this.plugin.settings.fileFilter.rules.filter((rule) => rule.enabled).length;
        const stats = [
            {
                label: t("Active Rules"),
                value: activeRules.toString(),
            },
            {
                label: t("Filter Mode"),
                value: this.plugin.settings.fileFilter.mode ===
                    FilterMode.WHITELIST
                    ? t("Whitelist")
                    : t("Blacklist"),
            },
            {
                label: t("Status"),
                value: this.plugin.settings.fileFilter.enabled
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
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmlsZUZpbHRlclJ1bGVFZGl0b3JNb2RhbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkZpbGVGaWx0ZXJSdWxlRWRpdG9yTW9kYWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBTyxpQkFBaUIsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUMzRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFMUMsT0FBTyxFQUFFLFVBQVUsRUFBa0IsTUFBTSw2QkFBNkIsQ0FBQztBQUN6RSxPQUFPLEVBQ04sYUFBYSxFQUNiLGlCQUFpQixJQUFJLFdBQVcsR0FDaEMsTUFBTSxxQ0FBcUMsQ0FBQztBQUM3QyxPQUFPLG1DQUFtQyxDQUFDO0FBTzNDLE1BQU0sT0FBTyx5QkFBMEIsU0FBUSxLQUFLO0lBT25ELFlBQ0MsR0FBUSxFQUNSLE1BQTZCLEVBQzdCLFVBQTRDLEVBQUU7UUFFOUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBWEosbUJBQWMsR0FBdUIsSUFBSSxDQUFDO1FBQzFDLG1CQUFjLEdBQXVCLElBQUksQ0FBQztRQVdqRCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztJQUN4QixDQUFDO0lBRUQsTUFBTTtRQUNMLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLCtCQUErQixDQUFDLENBQUM7UUFDdkQsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQztRQUMzQixTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFbEIsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2hFLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFO1lBQ3ZCLElBQUksRUFB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QUFDLENBQUMsQ0FBQyxVQUFVLENBQUM7YUFDaEI7U0FDRCxDQUFDO1FBRUYsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ3RCLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO1lBQ2xFLFFBQVEsQ0FBQyxVQUFVLENBQUM7Z0JBQ25CLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSztnQkFDaEIsR0FBRyxFQUFFLG1CQUFtQjthQUN4QixDQUFDLENBQUM7WUFDSCxRQUFRLENBQUMsVUFBVSxDQUFDO2dCQUNuQixJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUs7Z0JBQ2hCLEdBQUcsRUFBRSxtQkFBbUI7YUFDeEIsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHAsIERyb3Bkb3duQ29tcG9uZW50LCBNb2RhbCwgU2V0dGluZywgc2V0SWNvbiB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7IEZpbHRlck1vZGUsIEZpbGVGaWx0ZXJSdWxlIH0gZnJvbSBcIkAvY29tbW9uL3NldHRpbmctZGVmaW5pdGlvblwiO1xyXG5pbXBvcnQge1xyXG5cdEZvbGRlclN1Z2dlc3QsXHJcblx0U2ltcGxlRmlsZVN1Z2dlc3QgYXMgRmlsZVN1Z2dlc3QsXHJcbn0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9pbnB1dHMvQXV0b0NvbXBsZXRlXCI7XHJcbmltcG9ydCBcIkAvc3R5bGVzL2ZpbGUtZmlsdGVyLXNldHRpbmdzLmNzc1wiO1xyXG5cclxuaW50ZXJmYWNlIEZpbGVGaWx0ZXJSdWxlRWRpdG9yTW9kYWxPcHRpb25zIHtcclxuXHRhdXRvQWRkUnVsZVR5cGU/OiBGaWxlRmlsdGVyUnVsZVtcInR5cGVcIl07XHJcblx0b25DbG9zZT86ICgpID0+IHZvaWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBGaWxlRmlsdGVyUnVsZUVkaXRvck1vZGFsIGV4dGVuZHMgTW9kYWwge1xyXG5cdHByaXZhdGUgcnVsZXNDb250YWluZXI6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBzdGF0c0NvbnRhaW5lcjogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIHBlbmRpbmdSdWxlPzogRmlsZUZpbHRlclJ1bGU7XHJcblx0cHJpdmF0ZSByZWFkb25seSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbjtcclxuXHRwcml2YXRlIHJlYWRvbmx5IG9wdGlvbnM6IEZpbGVGaWx0ZXJSdWxlRWRpdG9yTW9kYWxPcHRpb25zO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdGFwcDogQXBwLFxyXG5cdFx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRvcHRpb25zOiBGaWxlRmlsdGVyUnVsZUVkaXRvck1vZGFsT3B0aW9ucyA9IHt9XHJcblx0KSB7XHJcblx0XHRzdXBlcihhcHApO1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0XHR0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xyXG5cdH1cclxuXHJcblx0b25PcGVuKCk6IHZvaWQge1xyXG5cdFx0dGhpcy5tb2RhbEVsLmFkZENsYXNzKFwiZmlsZS1maWx0ZXItcnVsZS1lZGl0b3ItbW9kYWxcIik7XHJcblx0XHRjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcclxuXHRcdGNvbnRlbnRFbC5lbXB0eSgpO1xyXG5cclxuXHRcdGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogdChcIkVkaXQgRmlsZSBGaWx0ZXIgUnVsZXNcIikgfSk7XHJcblx0XHRjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHtcclxuXHRcdFx0dGV4dDogdChcclxuXHRcdFx0XHRcIkNvbmZpZ3VyZSB3aGljaCBmaWxlcywgZm9sZGVycywgb3IgcGF0dGVybnMgYXJlIGluY2x1ZGVkIGR1cmluZyB0YXNrIGluZGV4aW5nLlwiXHJcblx0XHRcdCksXHJcblx0XHRcdGNsczogXCJzZXR0aW5nLWl0ZW0tZGVzY3JpcHRpb25cIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcclxuXHRcdFx0LnNldE5hbWUodChcIkZpbHRlciBNb2RlXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyhcclxuXHRcdFx0XHR0KFxyXG5cdFx0XHRcdFx0XCJXaGl0ZWxpc3Q6IGluY2x1ZGUgb25seSBzcGVjaWZpZWQgcGF0aHMuIEJsYWNrbGlzdDogZXhjbHVkZSBzcGVjaWZpZWQgcGF0aHMuXCJcclxuXHRcdFx0XHQpXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZERyb3Bkb3duKChkcm9wZG93bikgPT5cclxuXHRcdFx0XHRkcm9wZG93blxyXG5cdFx0XHRcdFx0LmFkZE9wdGlvbihcclxuXHRcdFx0XHRcdFx0RmlsdGVyTW9kZS5XSElURUxJU1QsXHJcblx0XHRcdFx0XHRcdHQoXCJXaGl0ZWxpc3QgKEluY2x1ZGUgb25seSlcIilcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdC5hZGRPcHRpb24oRmlsdGVyTW9kZS5CTEFDS0xJU1QsIHQoXCJCbGFja2xpc3QgKEV4Y2x1ZGUpXCIpKVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmZpbGVGaWx0ZXIubW9kZSlcclxuXHRcdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWU6IEZpbHRlck1vZGUpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuZmlsZUZpbHRlci5tb2RlID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdFx0XHR0aGlzLnVwZGF0ZVN0YXRzKCk7XHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdGNvbnN0IGFjdGlvblNldHRpbmcgPSBuZXcgU2V0dGluZyhjb250ZW50RWwpO1xyXG5cdFx0YWN0aW9uU2V0dGluZy5zZXR0aW5nRWwuYWRkQ2xhc3MoXCJmaWxlLWZpbHRlci1ydWxlLWFjdGlvbnNcIik7XHJcblxyXG5cdFx0YWN0aW9uU2V0dGluZ1xyXG5cdFx0XHQuYWRkQnV0dG9uKChidXR0b24pID0+XHJcblx0XHRcdFx0YnV0dG9uXHJcblx0XHRcdFx0XHQuc2V0QnV0dG9uVGV4dCh0KFwiQWRkIEZpbGUgUnVsZVwiKSlcclxuXHRcdFx0XHRcdC5zZXRDdGEoKVxyXG5cdFx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHR2b2lkIHRoaXMuYWRkUnVsZShcImZpbGVcIik7XHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHQpXHJcblx0XHRcdC5hZGRCdXR0b24oKGJ1dHRvbikgPT5cclxuXHRcdFx0XHRidXR0b24uc2V0QnV0dG9uVGV4dCh0KFwiQWRkIEZvbGRlciBSdWxlXCIpKS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdHZvaWQgdGhpcy5hZGRSdWxlKFwiZm9sZGVyXCIpO1xyXG5cdFx0XHRcdH0pXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZEJ1dHRvbigoYnV0dG9uKSA9PlxyXG5cdFx0XHRcdGJ1dHRvbi5zZXRCdXR0b25UZXh0KHQoXCJBZGQgUGF0dGVybiBSdWxlXCIpKS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdHZvaWQgdGhpcy5hZGRSdWxlKFwicGF0dGVyblwiKTtcclxuXHRcdFx0XHR9KVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdHRoaXMucnVsZXNDb250YWluZXIgPSBjb250ZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZpbGUtZmlsdGVyLXJ1bGVzLWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5zdGF0c0NvbnRhaW5lciA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiZmlsZS1maWx0ZXItc3RhdHMtcHJldmlld1wiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGVudEVsKS5hZGRCdXR0b24oKGJ1dHRvbikgPT5cclxuXHRcdFx0YnV0dG9uXHJcblx0XHRcdFx0LnNldEJ1dHRvblRleHQodChcIkRvbmVcIikpXHJcblx0XHRcdFx0LnNldEN0YSgpXHJcblx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4gdGhpcy5jbG9zZSgpKVxyXG5cdFx0KTtcclxuXHJcblx0XHR0aGlzLnJlbmRlclJ1bGVzKCk7XHJcblx0XHR0aGlzLnVwZGF0ZVN0YXRzKCk7XHJcblxyXG5cdFx0aWYgKHRoaXMub3B0aW9ucy5hdXRvQWRkUnVsZVR5cGUpIHtcclxuXHRcdFx0dm9pZCB0aGlzLmFkZFJ1bGUodGhpcy5vcHRpb25zLmF1dG9BZGRSdWxlVHlwZSkudGhlbigocnVsZSkgPT4ge1xyXG5cdFx0XHRcdHRoaXMucGVuZGluZ1J1bGUgPSBydWxlO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdG9uQ2xvc2UoKSB7XHJcblx0XHRpZiAodGhpcy5wZW5kaW5nUnVsZSAmJiAhdGhpcy5wZW5kaW5nUnVsZS5wYXRoLnRyaW0oKSkge1xyXG5cdFx0XHRjb25zdCBpbmRleCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmZpbGVGaWx0ZXIucnVsZXMuaW5kZXhPZihcclxuXHRcdFx0XHR0aGlzLnBlbmRpbmdSdWxlXHJcblx0XHRcdCk7XHJcblx0XHRcdGlmIChpbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5maWxlRmlsdGVyLnJ1bGVzLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdFx0dm9pZCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMucGVuZGluZ1J1bGUgPSB1bmRlZmluZWQ7XHJcblx0XHR0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xyXG5cdFx0dGhpcy5vcHRpb25zLm9uQ2xvc2U/LigpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBhZGRSdWxlKFxyXG5cdFx0dHlwZTogRmlsZUZpbHRlclJ1bGVbXCJ0eXBlXCJdXHJcblx0KTogUHJvbWlzZTxGaWxlRmlsdGVyUnVsZT4ge1xyXG5cdFx0Y29uc3QgbmV3UnVsZTogRmlsZUZpbHRlclJ1bGUgPSB7XHJcblx0XHRcdHR5cGUsXHJcblx0XHRcdHBhdGg6IFwiXCIsXHJcblx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLmZpbGVGaWx0ZXIucnVsZXMucHVzaChuZXdSdWxlKTtcclxuXHRcdGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0dGhpcy5yZW5kZXJSdWxlcygpO1xyXG5cdFx0dGhpcy51cGRhdGVTdGF0cygpO1xyXG5cdFx0cmV0dXJuIG5ld1J1bGU7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbmRlclJ1bGVzKCkge1xyXG5cdFx0aWYgKCF0aGlzLnJ1bGVzQ29udGFpbmVyKSByZXR1cm47XHJcblxyXG5cdFx0Y29uc3QgY29udGFpbmVyID0gdGhpcy5ydWxlc0NvbnRhaW5lcjtcclxuXHRcdGNvbnRhaW5lci5lbXB0eSgpO1xyXG5cclxuXHRcdGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5maWxlRmlsdGVyLnJ1bGVzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRjb250YWluZXIuY3JlYXRlRWwoXCJwXCIsIHtcclxuXHRcdFx0XHR0ZXh0OiB0KFwiTm8gZmlsdGVyIHJ1bGVzIGNvbmZpZ3VyZWQgeWV0XCIpLFxyXG5cdFx0XHRcdGNsczogXCJzZXR0aW5nLWl0ZW0tZGVzY3JpcHRpb25cIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5maWxlRmlsdGVyLnJ1bGVzLmZvckVhY2goKHJ1bGUsIGluZGV4KSA9PiB7XHJcblx0XHRcdGNvbnN0IHJ1bGVDb250YWluZXIgPSBjb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwiZmlsZS1maWx0ZXItcnVsZVwiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IHR5cGVDb250YWluZXIgPSBydWxlQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcImZpbGUtZmlsdGVyLXJ1bGUtdHlwZVwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0dHlwZUNvbnRhaW5lci5jcmVhdGVFbChcImxhYmVsXCIsIHsgdGV4dDogdChcIlR5cGU6XCIpIH0pO1xyXG5cclxuXHRcdFx0bmV3IERyb3Bkb3duQ29tcG9uZW50KHR5cGVDb250YWluZXIpXHJcblx0XHRcdFx0LmFkZE9wdGlvbihcImZpbGVcIiwgdChcIkZpbGVcIikpXHJcblx0XHRcdFx0LmFkZE9wdGlvbihcImZvbGRlclwiLCB0KFwiRm9sZGVyXCIpKVxyXG5cdFx0XHRcdC5hZGRPcHRpb24oXCJwYXR0ZXJuXCIsIHQoXCJQYXR0ZXJuXCIpKVxyXG5cdFx0XHRcdC5zZXRWYWx1ZShydWxlLnR5cGUpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZTogRmlsZUZpbHRlclJ1bGVbXCJ0eXBlXCJdKSA9PiB7XHJcblx0XHRcdFx0XHRydWxlLnR5cGUgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdFx0dGhpcy5yZW5kZXJSdWxlcygpO1xyXG5cdFx0XHRcdFx0dGhpcy51cGRhdGVTdGF0cygpO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3Qgc2NvcGVDb250YWluZXIgPSBydWxlQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcImZpbGUtZmlsdGVyLXJ1bGUtc2NvcGVcIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdHNjb3BlQ29udGFpbmVyLmNyZWF0ZUVsKFwibGFiZWxcIiwgeyB0ZXh0OiB0KFwiU2NvcGU6XCIpIH0pO1xyXG5cdFx0XHRuZXcgRHJvcGRvd25Db21wb25lbnQoc2NvcGVDb250YWluZXIpXHJcblx0XHRcdFx0LmFkZE9wdGlvbihcImJvdGhcIiwgdChcIkJvdGhcIikpXHJcblx0XHRcdFx0LmFkZE9wdGlvbihcImlubGluZVwiLCB0KFwiSW5saW5lXCIpKVxyXG5cdFx0XHRcdC5hZGRPcHRpb24oXCJmaWxlXCIsIHQoXCJGaWxlXCIpKVxyXG5cdFx0XHRcdC5zZXRWYWx1ZSgocnVsZSBhcyBhbnkpLnNjb3BlIHx8IFwiYm90aFwiKVxyXG5cdFx0XHRcdC5vbkNoYW5nZShhc3luYyAodmFsdWU6IFwiYm90aFwiIHwgXCJpbmxpbmVcIiB8IFwiZmlsZVwiKSA9PiB7XHJcblx0XHRcdFx0XHQocnVsZSBhcyBhbnkpLnNjb3BlID0gdmFsdWU7XHJcblx0XHRcdFx0XHRhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IHBhdGhDb250YWluZXIgPSBydWxlQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcImZpbGUtZmlsdGVyLXJ1bGUtcGF0aFwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0cGF0aENvbnRhaW5lci5jcmVhdGVFbChcImxhYmVsXCIsIHsgdGV4dDogdChcIlBhdGg6XCIpIH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgcGF0aElucHV0ID0gcGF0aENvbnRhaW5lci5jcmVhdGVFbChcImlucHV0XCIsIHtcclxuXHRcdFx0XHR0eXBlOiBcInRleHRcIixcclxuXHRcdFx0XHR2YWx1ZTogcnVsZS5wYXRoLFxyXG5cdFx0XHRcdHBsYWNlaG9sZGVyOlxyXG5cdFx0XHRcdFx0cnVsZS50eXBlID09PSBcInBhdHRlcm5cIlxyXG5cdFx0XHRcdFx0XHQ/IFwiKi50bXAsIHRlbXAvKlwiXHJcblx0XHRcdFx0XHRcdDogcnVsZS50eXBlID09PSBcImZvbGRlclwiXHJcblx0XHRcdFx0XHRcdD8gXCJwYXRoL3RvL2ZvbGRlclwiXHJcblx0XHRcdFx0XHRcdDogXCJwYXRoL3RvL2ZpbGUubWRcIixcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRpZiAocnVsZS50eXBlID09PSBcImZvbGRlclwiKSB7XHJcblx0XHRcdFx0bmV3IEZvbGRlclN1Z2dlc3QoXHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbi5hcHAsXHJcblx0XHRcdFx0XHRwYXRoSW5wdXQsXHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0XHRcdFwic2luZ2xlXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9IGVsc2UgaWYgKHJ1bGUudHlwZSA9PT0gXCJmaWxlXCIpIHtcclxuXHRcdFx0XHRuZXcgRmlsZVN1Z2dlc3QocGF0aElucHV0LCB0aGlzLnBsdWdpbiwgKGZpbGUpID0+IHtcclxuXHRcdFx0XHRcdHJ1bGUucGF0aCA9IGZpbGUucGF0aDtcclxuXHRcdFx0XHRcdHBhdGhJbnB1dC52YWx1ZSA9IGZpbGUucGF0aDtcclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRwYXRoSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImlucHV0XCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0XHRydWxlLnBhdGggPSBwYXRoSW5wdXQudmFsdWU7XHJcblx0XHRcdFx0YXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgZW5hYmxlZENvbnRhaW5lciA9IHJ1bGVDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwiZmlsZS1maWx0ZXItcnVsZS1lbmFibGVkXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRlbmFibGVkQ29udGFpbmVyLmNyZWF0ZUVsKFwibGFiZWxcIiwgeyB0ZXh0OiB0KFwiRW5hYmxlZDpcIikgfSk7XHJcblxyXG5cdFx0XHRjb25zdCBlbmFibGVkQ2hlY2tib3ggPSBlbmFibGVkQ29udGFpbmVyLmNyZWF0ZUVsKFwiaW5wdXRcIiwge1xyXG5cdFx0XHRcdHR5cGU6IFwiY2hlY2tib3hcIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdGVuYWJsZWRDaGVja2JveC5jaGVja2VkID0gcnVsZS5lbmFibGVkO1xyXG5cclxuXHRcdFx0ZW5hYmxlZENoZWNrYm94LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRcdHJ1bGUuZW5hYmxlZCA9IGVuYWJsZWRDaGVja2JveC5jaGVja2VkO1xyXG5cdFx0XHRcdGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdHRoaXMudXBkYXRlU3RhdHMoKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCBkZWxldGVCdXR0b24gPSBydWxlQ29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0XHRjbHM6IFwiZmlsZS1maWx0ZXItcnVsZS1kZWxldGUgbW9kLWRlc3RydWN0aXZlXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRzZXRJY29uKGRlbGV0ZUJ1dHRvbiwgXCJ0cmFzaFwiKTtcclxuXHRcdFx0ZGVsZXRlQnV0dG9uLnRpdGxlID0gdChcIkRlbGV0ZSBydWxlXCIpO1xyXG5cclxuXHRcdFx0ZGVsZXRlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuZmlsZUZpbHRlci5ydWxlcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0XHRcdGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdHRoaXMucmVuZGVyUnVsZXMoKTtcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZVN0YXRzKCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHVwZGF0ZVN0YXRzKCkge1xyXG5cdFx0aWYgKCF0aGlzLnN0YXRzQ29udGFpbmVyKSByZXR1cm47XHJcblxyXG5cdFx0Y29uc3QgY29udGFpbmVyID0gdGhpcy5zdGF0c0NvbnRhaW5lcjtcclxuXHRcdGNvbnRhaW5lci5lbXB0eSgpO1xyXG5cclxuXHRcdGNvbnN0IGFjdGl2ZVJ1bGVzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZmlsZUZpbHRlci5ydWxlcy5maWx0ZXIoXHJcblx0XHRcdChydWxlKSA9PiBydWxlLmVuYWJsZWRcclxuXHRcdCkubGVuZ3RoO1xyXG5cclxuXHRcdGNvbnN0IHN0YXRzID0gW1xyXG5cdFx0XHR7XHJcblx0XHRcdFx0bGFiZWw6IHQoXCJBY3RpdmUgUnVsZXNcIiksXHJcblx0XHRcdFx0dmFsdWU6IGFjdGl2ZVJ1bGVzLnRvU3RyaW5nKCksXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRsYWJlbDogdChcIkZpbHRlciBNb2RlXCIpLFxyXG5cdFx0XHRcdHZhbHVlOlxyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuZmlsZUZpbHRlci5tb2RlID09PVxyXG5cdFx0XHRcdFx0RmlsdGVyTW9kZS5XSElURUxJU1RcclxuXHRcdFx0XHRcdFx0PyB0KFwiV2hpdGVsaXN0XCIpXHJcblx0XHRcdFx0XHRcdDogdChcIkJsYWNrbGlzdFwiKSxcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGxhYmVsOiB0KFwiU3RhdHVzXCIpLFxyXG5cdFx0XHRcdHZhbHVlOiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5maWxlRmlsdGVyLmVuYWJsZWRcclxuXHRcdFx0XHRcdD8gdChcIkVuYWJsZWRcIilcclxuXHRcdFx0XHRcdDogdChcIkRpc2FibGVkXCIpLFxyXG5cdFx0XHR9LFxyXG5cdFx0XTtcclxuXHJcblx0XHRzdGF0cy5mb3JFYWNoKChzdGF0KSA9PiB7XHJcblx0XHRcdGNvbnN0IHN0YXRJdGVtID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJmaWx0ZXItc3RhdC1pdGVtXCIgfSk7XHJcblx0XHRcdHN0YXRJdGVtLmNyZWF0ZVNwYW4oe1xyXG5cdFx0XHRcdHRleHQ6IHN0YXQudmFsdWUsXHJcblx0XHRcdFx0Y2xzOiBcImZpbHRlci1zdGF0LXZhbHVlXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRzdGF0SXRlbS5jcmVhdGVTcGFuKHtcclxuXHRcdFx0XHR0ZXh0OiBzdGF0LmxhYmVsLFxyXG5cdFx0XHRcdGNsczogXCJmaWx0ZXItc3RhdC1sYWJlbFwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH1cclxufVxyXG4iXX0=