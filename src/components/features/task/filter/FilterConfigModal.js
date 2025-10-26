import { __awaiter } from "tslib";
import { Modal, Setting, Notice } from "obsidian";
import { t } from "@/translations/helper";
export class FilterConfigModal extends Modal {
    constructor(app, plugin, mode, currentFilterState, onSave, onLoad) {
        super(app);
        this.plugin = plugin;
        this.mode = mode;
        this.currentFilterState = currentFilterState;
        this.onSave = onSave;
        this.onLoad = onLoad;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        if (this.mode === "save") {
            this.renderSaveMode();
        }
        else {
            this.renderLoadMode();
        }
    }
    renderSaveMode() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: t("Save Filter Configuration") });
        let nameValue = "";
        let descriptionValue = "";
        new Setting(contentEl)
            .setName(t("Filter Configuration Name"))
            .setDesc(t("Enter a name for this filter configuration"))
            .addText((text) => {
            text.setPlaceholder(t("Filter Configuration Name"))
                .setValue(nameValue)
                .onChange((value) => {
                nameValue = value;
            });
        });
        new Setting(contentEl)
            .setName(t("Filter Configuration Description"))
            .setDesc(t("Enter a description for this filter configuration (optional)"))
            .addTextArea((text) => {
            text.setPlaceholder(t("Filter Configuration Description"))
                .setValue(descriptionValue)
                .onChange((value) => {
                descriptionValue = value;
            });
            text.inputEl.rows = 3;
        });
        new Setting(contentEl)
            .addButton((btn) => {
            btn.setButtonText(t("Save"))
                .setCta()
                .onClick(() => {
                this.saveConfiguration(nameValue, descriptionValue);
            });
        })
            .addButton((btn) => {
            btn.setButtonText(t("Cancel")).onClick(() => {
                this.close();
            });
        });
    }
    renderLoadMode() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: t("Load Filter Configuration") });
        const savedConfigs = this.plugin.settings.filterConfig.savedConfigs;
        if (savedConfigs.length === 0) {
            contentEl.createEl("p", {
                text: t("No saved filter configurations"),
            });
            new Setting(contentEl).addButton((btn) => {
                btn.setButtonText(t("Close")).onClick(() => {
                    this.close();
                });
            });
            return;
        }
        let selectedConfigId = "";
        new Setting(contentEl)
            .setName(t("Select a saved filter configuration"))
            .addDropdown((dropdown) => {
            dropdown.addOption("", t("Select a saved filter configuration"));
            savedConfigs.forEach((config) => {
                dropdown.addOption(config.id, config.name);
            });
            dropdown.onChange((value) => {
                selectedConfigId = value;
                this.updateConfigDetails(value);
            });
        });
        // Container for config details
        const detailsContainer = contentEl.createDiv({
            cls: "filter-config-details",
        });
        // Buttons container
        const buttonsContainer = contentEl.createDiv({
            cls: "filter-config-buttons",
        });
        new Setting(buttonsContainer)
            .addButton((btn) => {
            btn.setButtonText(t("Load"))
                .setCta()
                .onClick(() => {
                this.loadConfiguration(selectedConfigId);
            });
        })
            .addButton((btn) => {
            btn.setButtonText(t("Delete"))
                .setWarning()
                .onClick(() => {
                this.deleteConfiguration(selectedConfigId);
            });
        })
            .addButton((btn) => {
            btn.setButtonText(t("Cancel")).onClick(() => {
                this.close();
            });
        });
        // Store references for updating
        this.detailsContainer = detailsContainer;
    }
    updateConfigDetails(configId) {
        const detailsContainer = this.detailsContainer;
        if (!detailsContainer)
            return;
        detailsContainer.empty();
        if (!configId)
            return;
        const config = this.plugin.settings.filterConfig.savedConfigs.find((c) => c.id === configId);
        if (!config)
            return;
        detailsContainer.createEl("h3", { text: config.name });
        if (config.description) {
            detailsContainer.createEl("p", { text: config.description });
        }
        detailsContainer.createEl("p", {
            text: `${t("Created")}: ${new Date(config.createdAt).toLocaleString()}`,
            cls: "filter-config-meta",
        });
        detailsContainer.createEl("p", {
            text: `${t("Updated")}: ${new Date(config.updatedAt).toLocaleString()}`,
            cls: "filter-config-meta",
        });
        // Show filter summary
        const filterSummary = detailsContainer.createDiv({
            cls: "filter-config-summary",
        });
        filterSummary.createEl("h4", { text: t("Filter Summary") });
        const groupCount = config.filterState.filterGroups.length;
        const totalFilters = config.filterState.filterGroups.reduce((sum, group) => sum + group.filters.length, 0);
        filterSummary.createEl("p", {
            text: `${groupCount} ${t("filter group")}${groupCount !== 1 ? "s" : ""}, ${totalFilters} ${t("filter")}${totalFilters !== 1 ? "s" : ""}`,
        });
        filterSummary.createEl("p", {
            text: `${t("Root condition")}: ${config.filterState.rootCondition}`,
        });
    }
    saveConfiguration(name, description) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!name.trim()) {
                new Notice(t("Filter configuration name is required"));
                return;
            }
            if (!this.currentFilterState) {
                new Notice(t("Failed to save filter configuration"));
                return;
            }
            const now = new Date().toISOString();
            const config = {
                id: `filter-config-${Date.now()}-${Math.random()
                    .toString(36)
                    .substr(2, 9)}`,
                name: name.trim(),
                description: description.trim() || undefined,
                filterState: JSON.parse(JSON.stringify(this.currentFilterState)),
                createdAt: now,
                updatedAt: now,
            };
            try {
                this.plugin.settings.filterConfig.savedConfigs.push(config);
                yield this.plugin.saveSettings();
                new Notice(t("Filter configuration saved successfully"));
                if (this.onSave) {
                    this.onSave(config);
                }
                this.close();
            }
            catch (error) {
                console.error("Failed to save filter configuration:", error);
                new Notice(t("Failed to save filter configuration"));
            }
        });
    }
    loadConfiguration(configId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!configId) {
                new Notice(t("Select a saved filter configuration"));
                return;
            }
            const config = this.plugin.settings.filterConfig.savedConfigs.find((c) => c.id === configId);
            if (!config) {
                new Notice(t("Failed to load filter configuration"));
                return;
            }
            try {
                if (this.onLoad) {
                    this.onLoad(config);
                }
                new Notice(t("Filter configuration loaded successfully"));
                this.close();
            }
            catch (error) {
                console.error("Failed to load filter configuration:", error);
                new Notice(t("Failed to load filter configuration"));
            }
        });
    }
    deleteConfiguration(configId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!configId) {
                new Notice(t("Select a saved filter configuration"));
                return;
            }
            const config = this.plugin.settings.filterConfig.savedConfigs.find((c) => c.id === configId);
            if (!config) {
                new Notice(t("Failed to delete filter configuration"));
                return;
            }
            // Confirm deletion
            const confirmed = yield new Promise((resolve) => {
                const confirmModal = new Modal(this.app);
                confirmModal.contentEl.createEl("h2", {
                    text: t("Delete Filter Configuration"),
                });
                confirmModal.contentEl.createEl("p", {
                    text: t("Are you sure you want to delete this filter configuration?"),
                });
                confirmModal.contentEl.createEl("p", {
                    text: `"${config.name}"`,
                    cls: "filter-config-name-highlight",
                });
                new Setting(confirmModal.contentEl)
                    .addButton((btn) => {
                    btn.setButtonText(t("Delete"))
                        .setWarning()
                        .onClick(() => {
                        resolve(true);
                        confirmModal.close();
                    });
                })
                    .addButton((btn) => {
                    btn.setButtonText(t("Cancel")).onClick(() => {
                        resolve(false);
                        confirmModal.close();
                    });
                });
                confirmModal.open();
            });
            if (!confirmed)
                return;
            try {
                this.plugin.settings.filterConfig.savedConfigs =
                    this.plugin.settings.filterConfig.savedConfigs.filter((c) => c.id !== configId);
                yield this.plugin.saveSettings();
                new Notice(t("Filter configuration deleted successfully"));
                // Refresh the load mode display
                this.close();
                // Reopen in load mode to refresh the list
                const newModal = new FilterConfigModal(this.app, this.plugin, "load", undefined, this.onSave, this.onLoad);
                newModal.open();
            }
            catch (error) {
                console.error("Failed to delete filter configuration:", error);
                new Notice(t("Failed to delete filter configuration"));
            }
        });
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmlsdGVyQ29uZmlnTW9kYWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJGaWx0ZXJDb25maWdNb2RhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFPLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFxQixNQUFNLFVBQVUsQ0FBQztBQUMxRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFLMUMsTUFBTSxPQUFPLGlCQUFrQixTQUFRLEtBQUs7SUFPM0MsWUFDQyxHQUFRLEVBQ1IsTUFBNkIsRUFDN0IsSUFBcUIsRUFDckIsa0JBQW9DLEVBQ3BDLE1BQTRDLEVBQzVDLE1BQTRDO1FBRTVDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNYLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxrQkFBa0IsQ0FBQztRQUM3QyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUN0QixDQUFDO0lBRUQsTUFBTTtRQUNMLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFDM0IsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRWxCLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUU7WUFDekIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1NBQ3RCO2FBQU07WUFDTixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7U0FDdEI7SUFDRixDQUFDO0lBRU8sY0FBYztRQUNyQixNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBRTNCLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxFQUFFLENBQUMs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Q0FBQztZQUVILElBQUksQ0FBQyxTQUFTO2dCQUFFLE9BQU87WUFFdkIsSUFBSTtnQkFDSCxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsWUFBWTtvQkFDN0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQ3BELENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLFFBQVEsQ0FDeEIsQ0FBQztnQkFFSCxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBRWpDLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDLENBQUM7Z0JBRTNELGdDQUFnQztnQkFDaEMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUViLDBDQUEwQztnQkFDMUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxpQkFBaUIsQ0FDckMsSUFBSSxDQUFDLEdBQUcsRUFDUixJQUFJLENBQUMsTUFBTSxFQUNYLE1BQU0sRUFDTixTQUFTLEVBQ1QsSUFBSSxDQUFDLE1BQU0sRUFDWCxJQUFJLENBQUMsTUFBTSxDQUNYLENBQUM7Z0JBQ0YsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO2FBQ2hCO1lBQUMsT0FBTyxLQUFLLEVBQUU7Z0JBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyx3Q0FBd0MsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDL0QsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLHVDQUF1QyxDQUFDLENBQUMsQ0FBQzthQUN2RDtRQUNGLENBQUM7S0FBQTtJQUVELE9BQU87UUFDTixNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBQzNCLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNuQixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHAsIE1vZGFsLCBTZXR0aW5nLCBOb3RpY2UsIERyb3Bkb3duQ29tcG9uZW50IH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCB7IFNhdmVkRmlsdGVyQ29uZmlnIH0gZnJvbSBcIkAvY29tbW9uL3NldHRpbmctZGVmaW5pdGlvblwiO1xyXG5pbXBvcnQgeyBSb290RmlsdGVyU3RhdGUgfSBmcm9tIFwiLi9WaWV3VGFza0ZpbHRlclwiO1xyXG5pbXBvcnQgdHlwZSBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBGaWx0ZXJDb25maWdNb2RhbCBleHRlbmRzIE1vZGFsIHtcclxuXHRwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luO1xyXG5cdHByaXZhdGUgbW9kZTogXCJzYXZlXCIgfCBcImxvYWRcIjtcclxuXHRwcml2YXRlIGN1cnJlbnRGaWx0ZXJTdGF0ZT86IFJvb3RGaWx0ZXJTdGF0ZTtcclxuXHRwcml2YXRlIG9uU2F2ZT86IChjb25maWc6IFNhdmVkRmlsdGVyQ29uZmlnKSA9PiB2b2lkO1xyXG5cdHByaXZhdGUgb25Mb2FkPzogKGNvbmZpZzogU2F2ZWRGaWx0ZXJDb25maWcpID0+IHZvaWQ7XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0YXBwOiBBcHAsXHJcblx0XHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdG1vZGU6IFwic2F2ZVwiIHwgXCJsb2FkXCIsXHJcblx0XHRjdXJyZW50RmlsdGVyU3RhdGU/OiBSb290RmlsdGVyU3RhdGUsXHJcblx0XHRvblNhdmU/OiAoY29uZmlnOiBTYXZlZEZpbHRlckNvbmZpZykgPT4gdm9pZCxcclxuXHRcdG9uTG9hZD86IChjb25maWc6IFNhdmVkRmlsdGVyQ29uZmlnKSA9PiB2b2lkXHJcblx0KSB7XHJcblx0XHRzdXBlcihhcHApO1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0XHR0aGlzLm1vZGUgPSBtb2RlO1xyXG5cdFx0dGhpcy5jdXJyZW50RmlsdGVyU3RhdGUgPSBjdXJyZW50RmlsdGVyU3RhdGU7XHJcblx0XHR0aGlzLm9uU2F2ZSA9IG9uU2F2ZTtcclxuXHRcdHRoaXMub25Mb2FkID0gb25Mb2FkO1xyXG5cdH1cclxuXHJcblx0b25PcGVuKCkge1xyXG5cdFx0Y29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcblx0XHRjb250ZW50RWwuZW1wdHkoKTtcclxuXHJcblx0XHRpZiAodGhpcy5tb2RlID09PSBcInNhdmVcIikge1xyXG5cdFx0XHR0aGlzLnJlbmRlclNhdmVNb2RlKCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLnJlbmRlckxvYWRNb2RlKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbmRlclNhdmVNb2RlKCkge1xyXG5cdFx0Y29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcblxyXG5cdFx0Y29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiB0KFwiU2F2ZSBGaWx0ZXIgQ29uZmlndXJhdGlvblwiKSB9KTtcclxuXHJcblx0XHRsZXQgbmFtZVZhbHVlID0gXCJcIjtcclxuXHRcdGxldCBkZXNjcmlwdGlvblZhbHVlID0gXCJcIjtcclxuXHJcblx0XHRuZXcgU2V0dGluZyhjb250ZW50RWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJGaWx0ZXIgQ29uZmlndXJhdGlvbiBOYW1lXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyh0KFwiRW50ZXIgYSBuYW1lIGZvciB0aGlzIGZpbHRlciBjb25maWd1cmF0aW9uXCIpKVxyXG5cdFx0XHQuYWRkVGV4dCgodGV4dCkgPT4ge1xyXG5cdFx0XHRcdHRleHQuc2V0UGxhY2Vob2xkZXIodChcIkZpbHRlciBDb25maWd1cmF0aW9uIE5hbWVcIikpXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUobmFtZVZhbHVlKVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRuYW1lVmFsdWUgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRuZXcgU2V0dGluZyhjb250ZW50RWwpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJGaWx0ZXIgQ29uZmlndXJhdGlvbiBEZXNjcmlwdGlvblwiKSlcclxuXHRcdFx0LnNldERlc2MoXHJcblx0XHRcdFx0dChcclxuXHRcdFx0XHRcdFwiRW50ZXIgYSBkZXNjcmlwdGlvbiBmb3IgdGhpcyBmaWx0ZXIgY29uZmlndXJhdGlvbiAob3B0aW9uYWwpXCJcclxuXHRcdFx0XHQpXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZFRleHRBcmVhKCh0ZXh0KSA9PiB7XHJcblx0XHRcdFx0dGV4dC5zZXRQbGFjZWhvbGRlcih0KFwiRmlsdGVyIENvbmZpZ3VyYXRpb24gRGVzY3JpcHRpb25cIikpXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUoZGVzY3JpcHRpb25WYWx1ZSlcclxuXHRcdFx0XHRcdC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdFx0ZGVzY3JpcHRpb25WYWx1ZSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0dGV4dC5pbnB1dEVsLnJvd3MgPSAzO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRuZXcgU2V0dGluZyhjb250ZW50RWwpXHJcblx0XHRcdC5hZGRCdXR0b24oKGJ0bikgPT4ge1xyXG5cdFx0XHRcdGJ0bi5zZXRCdXR0b25UZXh0KHQoXCJTYXZlXCIpKVxyXG5cdFx0XHRcdFx0LnNldEN0YSgpXHJcblx0XHRcdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMuc2F2ZUNvbmZpZ3VyYXRpb24obmFtZVZhbHVlLCBkZXNjcmlwdGlvblZhbHVlKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9KVxyXG5cdFx0XHQuYWRkQnV0dG9uKChidG4pID0+IHtcclxuXHRcdFx0XHRidG4uc2V0QnV0dG9uVGV4dCh0KFwiQ2FuY2VsXCIpKS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuY2xvc2UoKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbmRlckxvYWRNb2RlKCkge1xyXG5cdFx0Y29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcblxyXG5cdFx0Y29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiB0KFwiTG9hZCBGaWx0ZXIgQ29uZmlndXJhdGlvblwiKSB9KTtcclxuXHJcblx0XHRjb25zdCBzYXZlZENvbmZpZ3MgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5maWx0ZXJDb25maWcuc2F2ZWRDb25maWdzO1xyXG5cclxuXHRcdGlmIChzYXZlZENvbmZpZ3MubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdGNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHRcdHRleHQ6IHQoXCJObyBzYXZlZCBmaWx0ZXIgY29uZmlndXJhdGlvbnNcIiksXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRuZXcgU2V0dGluZyhjb250ZW50RWwpLmFkZEJ1dHRvbigoYnRuKSA9PiB7XHJcblx0XHRcdFx0YnRuLnNldEJ1dHRvblRleHQodChcIkNsb3NlXCIpKS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuY2xvc2UoKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHRsZXQgc2VsZWN0ZWRDb25maWdJZCA9IFwiXCI7XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGVudEVsKVxyXG5cdFx0XHQuc2V0TmFtZSh0KFwiU2VsZWN0IGEgc2F2ZWQgZmlsdGVyIGNvbmZpZ3VyYXRpb25cIikpXHJcblx0XHRcdC5hZGREcm9wZG93bigoZHJvcGRvd246IERyb3Bkb3duQ29tcG9uZW50KSA9PiB7XHJcblx0XHRcdFx0ZHJvcGRvd24uYWRkT3B0aW9uKFxyXG5cdFx0XHRcdFx0XCJcIixcclxuXHRcdFx0XHRcdHQoXCJTZWxlY3QgYSBzYXZlZCBmaWx0ZXIgY29uZmlndXJhdGlvblwiKVxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdHNhdmVkQ29uZmlncy5mb3JFYWNoKChjb25maWcpID0+IHtcclxuXHRcdFx0XHRcdGRyb3Bkb3duLmFkZE9wdGlvbihjb25maWcuaWQsIGNvbmZpZy5uYW1lKTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0ZHJvcGRvd24ub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRzZWxlY3RlZENvbmZpZ0lkID0gdmFsdWU7XHJcblx0XHRcdFx0XHR0aGlzLnVwZGF0ZUNvbmZpZ0RldGFpbHModmFsdWUpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHQvLyBDb250YWluZXIgZm9yIGNvbmZpZyBkZXRhaWxzXHJcblx0XHRjb25zdCBkZXRhaWxzQ29udGFpbmVyID0gY29udGVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmaWx0ZXItY29uZmlnLWRldGFpbHNcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEJ1dHRvbnMgY29udGFpbmVyXHJcblx0XHRjb25zdCBidXR0b25zQ29udGFpbmVyID0gY29udGVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmaWx0ZXItY29uZmlnLWJ1dHRvbnNcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdG5ldyBTZXR0aW5nKGJ1dHRvbnNDb250YWluZXIpXHJcblx0XHRcdC5hZGRCdXR0b24oKGJ0bikgPT4ge1xyXG5cdFx0XHRcdGJ0bi5zZXRCdXR0b25UZXh0KHQoXCJMb2FkXCIpKVxyXG5cdFx0XHRcdFx0LnNldEN0YSgpXHJcblx0XHRcdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMubG9hZENvbmZpZ3VyYXRpb24oc2VsZWN0ZWRDb25maWdJZCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSlcclxuXHRcdFx0LmFkZEJ1dHRvbigoYnRuKSA9PiB7XHJcblx0XHRcdFx0YnRuLnNldEJ1dHRvblRleHQodChcIkRlbGV0ZVwiKSlcclxuXHRcdFx0XHRcdC5zZXRXYXJuaW5nKClcclxuXHRcdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5kZWxldGVDb25maWd1cmF0aW9uKHNlbGVjdGVkQ29uZmlnSWQpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pXHJcblx0XHRcdC5hZGRCdXR0b24oKGJ0bikgPT4ge1xyXG5cdFx0XHRcdGJ0bi5zZXRCdXR0b25UZXh0KHQoXCJDYW5jZWxcIikpLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHQvLyBTdG9yZSByZWZlcmVuY2VzIGZvciB1cGRhdGluZ1xyXG5cdFx0KHRoaXMgYXMgYW55KS5kZXRhaWxzQ29udGFpbmVyID0gZGV0YWlsc0NvbnRhaW5lcjtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgdXBkYXRlQ29uZmlnRGV0YWlscyhjb25maWdJZDogc3RyaW5nKSB7XHJcblx0XHRjb25zdCBkZXRhaWxzQ29udGFpbmVyID0gKHRoaXMgYXMgYW55KS5kZXRhaWxzQ29udGFpbmVyO1xyXG5cdFx0aWYgKCFkZXRhaWxzQ29udGFpbmVyKSByZXR1cm47XHJcblxyXG5cdFx0ZGV0YWlsc0NvbnRhaW5lci5lbXB0eSgpO1xyXG5cclxuXHRcdGlmICghY29uZmlnSWQpIHJldHVybjtcclxuXHJcblx0XHRjb25zdCBjb25maWcgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5maWx0ZXJDb25maWcuc2F2ZWRDb25maWdzLmZpbmQoXHJcblx0XHRcdChjKSA9PiBjLmlkID09PSBjb25maWdJZFxyXG5cdFx0KTtcclxuXHJcblx0XHRpZiAoIWNvbmZpZykgcmV0dXJuO1xyXG5cclxuXHRcdGRldGFpbHNDb250YWluZXIuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IGNvbmZpZy5uYW1lIH0pO1xyXG5cclxuXHRcdGlmIChjb25maWcuZGVzY3JpcHRpb24pIHtcclxuXHRcdFx0ZGV0YWlsc0NvbnRhaW5lci5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBjb25maWcuZGVzY3JpcHRpb24gfSk7XHJcblx0XHR9XHJcblxyXG5cdFx0ZGV0YWlsc0NvbnRhaW5lci5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHR0ZXh0OiBgJHt0KFwiQ3JlYXRlZFwiKX06ICR7bmV3IERhdGUoXHJcblx0XHRcdFx0Y29uZmlnLmNyZWF0ZWRBdFxyXG5cdFx0XHQpLnRvTG9jYWxlU3RyaW5nKCl9YCxcclxuXHRcdFx0Y2xzOiBcImZpbHRlci1jb25maWctbWV0YVwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0ZGV0YWlsc0NvbnRhaW5lci5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHR0ZXh0OiBgJHt0KFwiVXBkYXRlZFwiKX06ICR7bmV3IERhdGUoXHJcblx0XHRcdFx0Y29uZmlnLnVwZGF0ZWRBdFxyXG5cdFx0XHQpLnRvTG9jYWxlU3RyaW5nKCl9YCxcclxuXHRcdFx0Y2xzOiBcImZpbHRlci1jb25maWctbWV0YVwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gU2hvdyBmaWx0ZXIgc3VtbWFyeVxyXG5cdFx0Y29uc3QgZmlsdGVyU3VtbWFyeSA9IGRldGFpbHNDb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZpbHRlci1jb25maWctc3VtbWFyeVwiLFxyXG5cdFx0fSk7XHJcblx0XHRmaWx0ZXJTdW1tYXJ5LmNyZWF0ZUVsKFwiaDRcIiwgeyB0ZXh0OiB0KFwiRmlsdGVyIFN1bW1hcnlcIikgfSk7XHJcblxyXG5cdFx0Y29uc3QgZ3JvdXBDb3VudCA9IGNvbmZpZy5maWx0ZXJTdGF0ZS5maWx0ZXJHcm91cHMubGVuZ3RoO1xyXG5cdFx0Y29uc3QgdG90YWxGaWx0ZXJzID0gY29uZmlnLmZpbHRlclN0YXRlLmZpbHRlckdyb3Vwcy5yZWR1Y2UoXHJcblx0XHRcdChzdW0sIGdyb3VwKSA9PiBzdW0gKyBncm91cC5maWx0ZXJzLmxlbmd0aCxcclxuXHRcdFx0MFxyXG5cdFx0KTtcclxuXHJcblx0XHRmaWx0ZXJTdW1tYXJ5LmNyZWF0ZUVsKFwicFwiLCB7XHJcblx0XHRcdHRleHQ6IGAke2dyb3VwQ291bnR9ICR7dChcImZpbHRlciBncm91cFwiKX0ke1xyXG5cdFx0XHRcdGdyb3VwQ291bnQgIT09IDEgPyBcInNcIiA6IFwiXCJcclxuXHRcdFx0fSwgJHt0b3RhbEZpbHRlcnN9ICR7dChcImZpbHRlclwiKX0ke3RvdGFsRmlsdGVycyAhPT0gMSA/IFwic1wiIDogXCJcIn1gLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0ZmlsdGVyU3VtbWFyeS5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHR0ZXh0OiBgJHt0KFwiUm9vdCBjb25kaXRpb25cIil9OiAke2NvbmZpZy5maWx0ZXJTdGF0ZS5yb290Q29uZGl0aW9ufWAsXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgc2F2ZUNvbmZpZ3VyYXRpb24obmFtZTogc3RyaW5nLCBkZXNjcmlwdGlvbjogc3RyaW5nKSB7XHJcblx0XHRpZiAoIW5hbWUudHJpbSgpKSB7XHJcblx0XHRcdG5ldyBOb3RpY2UodChcIkZpbHRlciBjb25maWd1cmF0aW9uIG5hbWUgaXMgcmVxdWlyZWRcIikpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKCF0aGlzLmN1cnJlbnRGaWx0ZXJTdGF0ZSkge1xyXG5cdFx0XHRuZXcgTm90aWNlKHQoXCJGYWlsZWQgdG8gc2F2ZSBmaWx0ZXIgY29uZmlndXJhdGlvblwiKSk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBub3cgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcblx0XHRjb25zdCBjb25maWc6IFNhdmVkRmlsdGVyQ29uZmlnID0ge1xyXG5cdFx0XHRpZDogYGZpbHRlci1jb25maWctJHtEYXRlLm5vdygpfS0ke01hdGgucmFuZG9tKClcclxuXHRcdFx0XHQudG9TdHJpbmcoMzYpXHJcblx0XHRcdFx0LnN1YnN0cigyLCA5KX1gLFxyXG5cdFx0XHRuYW1lOiBuYW1lLnRyaW0oKSxcclxuXHRcdFx0ZGVzY3JpcHRpb246IGRlc2NyaXB0aW9uLnRyaW0oKSB8fCB1bmRlZmluZWQsXHJcblx0XHRcdGZpbHRlclN0YXRlOiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMuY3VycmVudEZpbHRlclN0YXRlKSksXHJcblx0XHRcdGNyZWF0ZWRBdDogbm93LFxyXG5cdFx0XHR1cGRhdGVkQXQ6IG5vdyxcclxuXHRcdH07XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuZmlsdGVyQ29uZmlnLnNhdmVkQ29uZmlncy5wdXNoKGNvbmZpZyk7XHJcblx0XHRcdGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cclxuXHRcdFx0bmV3IE5vdGljZSh0KFwiRmlsdGVyIGNvbmZpZ3VyYXRpb24gc2F2ZWQgc3VjY2Vzc2Z1bGx5XCIpKTtcclxuXHJcblx0XHRcdGlmICh0aGlzLm9uU2F2ZSkge1xyXG5cdFx0XHRcdHRoaXMub25TYXZlKGNvbmZpZyk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHRoaXMuY2xvc2UoKTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gc2F2ZSBmaWx0ZXIgY29uZmlndXJhdGlvbjpcIiwgZXJyb3IpO1xyXG5cdFx0XHRuZXcgTm90aWNlKHQoXCJGYWlsZWQgdG8gc2F2ZSBmaWx0ZXIgY29uZmlndXJhdGlvblwiKSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIGxvYWRDb25maWd1cmF0aW9uKGNvbmZpZ0lkOiBzdHJpbmcpIHtcclxuXHRcdGlmICghY29uZmlnSWQpIHtcclxuXHRcdFx0bmV3IE5vdGljZSh0KFwiU2VsZWN0IGEgc2F2ZWQgZmlsdGVyIGNvbmZpZ3VyYXRpb25cIikpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgY29uZmlnID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZmlsdGVyQ29uZmlnLnNhdmVkQ29uZmlncy5maW5kKFxyXG5cdFx0XHQoYykgPT4gYy5pZCA9PT0gY29uZmlnSWRcclxuXHRcdCk7XHJcblxyXG5cdFx0aWYgKCFjb25maWcpIHtcclxuXHRcdFx0bmV3IE5vdGljZSh0KFwiRmFpbGVkIHRvIGxvYWQgZmlsdGVyIGNvbmZpZ3VyYXRpb25cIikpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0aWYgKHRoaXMub25Mb2FkKSB7XHJcblx0XHRcdFx0dGhpcy5vbkxvYWQoY29uZmlnKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0bmV3IE5vdGljZSh0KFwiRmlsdGVyIGNvbmZpZ3VyYXRpb24gbG9hZGVkIHN1Y2Nlc3NmdWxseVwiKSk7XHJcblx0XHRcdHRoaXMuY2xvc2UoKTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gbG9hZCBmaWx0ZXIgY29uZmlndXJhdGlvbjpcIiwgZXJyb3IpO1xyXG5cdFx0XHRuZXcgTm90aWNlKHQoXCJGYWlsZWQgdG8gbG9hZCBmaWx0ZXIgY29uZmlndXJhdGlvblwiKSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIGRlbGV0ZUNvbmZpZ3VyYXRpb24oY29uZmlnSWQ6IHN0cmluZykge1xyXG5cdFx0aWYgKCFjb25maWdJZCkge1xyXG5cdFx0XHRuZXcgTm90aWNlKHQoXCJTZWxlY3QgYSBzYXZlZCBmaWx0ZXIgY29uZmlndXJhdGlvblwiKSk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBjb25maWcgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5maWx0ZXJDb25maWcuc2F2ZWRDb25maWdzLmZpbmQoXHJcblx0XHRcdChjKSA9PiBjLmlkID09PSBjb25maWdJZFxyXG5cdFx0KTtcclxuXHJcblx0XHRpZiAoIWNvbmZpZykge1xyXG5cdFx0XHRuZXcgTm90aWNlKHQoXCJGYWlsZWQgdG8gZGVsZXRlIGZpbHRlciBjb25maWd1cmF0aW9uXCIpKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENvbmZpcm0gZGVsZXRpb25cclxuXHRcdGNvbnN0IGNvbmZpcm1lZCA9IGF3YWl0IG5ldyBQcm9taXNlPGJvb2xlYW4+KChyZXNvbHZlKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbmZpcm1Nb2RhbCA9IG5ldyBNb2RhbCh0aGlzLmFwcCk7XHJcblx0XHRcdGNvbmZpcm1Nb2RhbC5jb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7XHJcblx0XHRcdFx0dGV4dDogdChcIkRlbGV0ZSBGaWx0ZXIgQ29uZmlndXJhdGlvblwiKSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdGNvbmZpcm1Nb2RhbC5jb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHtcclxuXHRcdFx0XHR0ZXh0OiB0KFxyXG5cdFx0XHRcdFx0XCJBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gZGVsZXRlIHRoaXMgZmlsdGVyIGNvbmZpZ3VyYXRpb24/XCJcclxuXHRcdFx0XHQpLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0Y29uZmlybU1vZGFsLmNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHRcdHRleHQ6IGBcIiR7Y29uZmlnLm5hbWV9XCJgLFxyXG5cdFx0XHRcdGNsczogXCJmaWx0ZXItY29uZmlnLW5hbWUtaGlnaGxpZ2h0XCIsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0bmV3IFNldHRpbmcoY29uZmlybU1vZGFsLmNvbnRlbnRFbClcclxuXHRcdFx0XHQuYWRkQnV0dG9uKChidG4pID0+IHtcclxuXHRcdFx0XHRcdGJ0bi5zZXRCdXR0b25UZXh0KHQoXCJEZWxldGVcIikpXHJcblx0XHRcdFx0XHRcdC5zZXRXYXJuaW5nKClcclxuXHRcdFx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdHJlc29sdmUodHJ1ZSk7XHJcblx0XHRcdFx0XHRcdFx0Y29uZmlybU1vZGFsLmNsb3NlKCk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0pXHJcblx0XHRcdFx0LmFkZEJ1dHRvbigoYnRuKSA9PiB7XHJcblx0XHRcdFx0XHRidG4uc2V0QnV0dG9uVGV4dCh0KFwiQ2FuY2VsXCIpKS5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0cmVzb2x2ZShmYWxzZSk7XHJcblx0XHRcdFx0XHRcdGNvbmZpcm1Nb2RhbC5jbG9zZSgpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25maXJtTW9kYWwub3BlbigpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aWYgKCFjb25maXJtZWQpIHJldHVybjtcclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5maWx0ZXJDb25maWcuc2F2ZWRDb25maWdzID1cclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5maWx0ZXJDb25maWcuc2F2ZWRDb25maWdzLmZpbHRlcihcclxuXHRcdFx0XHRcdChjKSA9PiBjLmlkICE9PSBjb25maWdJZFxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHJcblx0XHRcdG5ldyBOb3RpY2UodChcIkZpbHRlciBjb25maWd1cmF0aW9uIGRlbGV0ZWQgc3VjY2Vzc2Z1bGx5XCIpKTtcclxuXHJcblx0XHRcdC8vIFJlZnJlc2ggdGhlIGxvYWQgbW9kZSBkaXNwbGF5XHJcblx0XHRcdHRoaXMuY2xvc2UoKTtcclxuXHJcblx0XHRcdC8vIFJlb3BlbiBpbiBsb2FkIG1vZGUgdG8gcmVmcmVzaCB0aGUgbGlzdFxyXG5cdFx0XHRjb25zdCBuZXdNb2RhbCA9IG5ldyBGaWx0ZXJDb25maWdNb2RhbChcclxuXHRcdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0XHRcImxvYWRcIixcclxuXHRcdFx0XHR1bmRlZmluZWQsXHJcblx0XHRcdFx0dGhpcy5vblNhdmUsXHJcblx0XHRcdFx0dGhpcy5vbkxvYWRcclxuXHRcdFx0KTtcclxuXHRcdFx0bmV3TW9kYWwub3BlbigpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBkZWxldGUgZmlsdGVyIGNvbmZpZ3VyYXRpb246XCIsIGVycm9yKTtcclxuXHRcdFx0bmV3IE5vdGljZSh0KFwiRmFpbGVkIHRvIGRlbGV0ZSBmaWx0ZXIgY29uZmlndXJhdGlvblwiKSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRvbkNsb3NlKCkge1xyXG5cdFx0Y29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcblx0XHRjb250ZW50RWwuZW1wdHkoKTtcclxuXHR9XHJcbn1cclxuIl19