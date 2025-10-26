import { __awaiter } from "tslib";
import { Setting, Notice } from "obsidian";
import { t } from "@/translations/helper";
import { SelectableCard, } from "@/components/features/onboarding/ui/SelectableCard";
export function renderInterfaceSettingsTab(settingTab, containerEl) {
    var _a;
    // Header
    new Setting(containerEl)
        .setName(t("User Interface"))
        .setDesc(t("Choose your preferred interface style and configure how Task Genius displays in your workspace."))
        .setHeading();
    // Mode Selection Section
    new Setting(containerEl)
        .setName(t("Interface Mode"))
        .setDesc(t("Select between the modern Fluent interface or the classic Legacy interface."))
        .setHeading();
    // Create mode selection container
    const modeSelectionContainer = containerEl.createDiv({
        cls: "interface-mode-selection",
    });
    // Get current mode
    const currentMode = ((_a = settingTab.plugin.settings.fluentView) === null || _a === void 0 ? void 0 : _a.enableFluent)
        ? "fluent"
        : "legacy";
    // Create cards configuration
    const cardConfigs = [
        {
            id: "fluent",
            title: t("Fluent"),
            subtitle: t("Modern & Sleek"),
            description: t("New visual design with elegant animations and modern interactions"),
            preview: createFluentPreview(),
        },
        {
            id: "legacy",
            title: t("Legacy"),
            subtitle: t("Classic & Familiar"),
            description: t("Keep the familiar interface and interaction style you know"),
            preview: createLegacyPreview(),
        },
    ];
    // Create selectable cards
    const card = new SelectableCard(modeSelectionContainer, cardConfigs, {
        containerClass: "selectable-cards-container",
        cardClass: "selectable-card",
        showPreview: true,
    }, (mode) => __awaiter(this, void 0, void 0, function* () {
        // Update settings
        if (!settingTab.plugin.settings.fluentView) {
            settingTab.plugin.settings.fluentView = {
                enableFluent: false,
                showFluentRibbon: false,
            };
        }
        settingTab.plugin.settings.fluentView.enableFluent = mode === "fluent";
        yield settingTab.plugin.saveSettings();
        // Re-render the settings to show/hide Fluent-specific options
        renderFluentSpecificSettings();
    }));
    // Set initial selection
    card.setSelected(currentMode);
    // Container for Fluent-specific settings
    const fluentSettingsContainer = containerEl.createDiv({
        cls: "fluent-specific-settings",
    });
    // Function to render Fluent-specific settings
    const renderFluentSpecificSettings = () => {
        var _a;
        // Clear the container
        fluentSettingsContainer.empty();
        // Only show if Fluent is enabled
        if (!((_a = settingTab.plugin.settings.fluentView) === null || _a === void 0 ? void 0 : _a.enableFluent)) {
            return;
        }
        // Fluent Settings Header
        new Setting(fluentSettingsContainer)
            .setName(t("Fluent Interface Settings"))
            .setDesc(t("Configure options specific to the Fluent interface."))
            .setHeading();
        // Use workspace side leaves for Sidebar & Details
        new Setting(fluentSettingsContainer)
            .setName(t("Use Workspace Side Leaves"))
            .setDesc(t("Use left/right workspace side leaves for Sidebar and Details. When enabled, the main V2 view won't render in-view sidebar or details."))
            .addToggle((toggle) => {
            var _a, _b;
            const current = (_b = (_a = settingTab.plugin.settings.fluentView) === null || _a === void 0 ? void 0 : _a.useWorkspaceSideLeaves) !== null && _b !== void 0 ? _b : true;
            toggle
                .setValue(current)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                if (!settingTab.plugin.settings.fluentView) {
                    settingTab.plugin.settings.fluentView = {
                        enableFluent: false,
                        showFluentRibbon: false,
                    };
                }
                if (!settingTab.plugin.settings.fluentView.fluentConfig) {
                    settingTab.plugin.settings.fluentView.fluentConfig = {
                        enableWorkspaces: true,
                        defaultWorkspace: "default",
                        showTopNavigation: true,
                        showNewSidebar: true,
                        allowViewSwitching: true,
                        persistViewMode: true,
                    };
                }
                // Store via 'any' to avoid typing constraints for experimental backfill
                settingTab.plugin.settings.fluentView.useWorkspaceSideLeaves = value;
                yield settingTab.plugin.saveSettings();
                new Notice(t("Saved. Reopen the view to apply."));
            }));
        });
        // Max Other Views before overflow threshold
        new Setting(fluentSettingsContainer)
            .setName(t("Max Other Views before overflow"))
            .setDesc(t("Number of 'Other Views' to show before grouping the rest into an overflow menu (ellipsis)"))
            .addText((text) => {
            var _a, _b, _c;
            const current = (_c = (_b = (_a = settingTab.plugin.settings.fluentView) === null || _a === void 0 ? void 0 : _a.fluentConfig) === null || _b === void 0 ? void 0 : _b.maxOtherViewsBeforeOverflow) !== null && _c !== void 0 ? _c : 5;
            text.setPlaceholder("5")
                .setValue(String(current))
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                const n = parseInt(value, 10);
                if (!isNaN(n) && n >= 1 && n <= 50) {
                    if (!settingTab.plugin.settings.fluentView) {
                        settingTab.plugin.settings.fluentView = {
                            enableFluent: false,
                            showFluentRibbon: false,
                        };
                    }
                    if (!settingTab.plugin.settings.fluentView.fluentConfig) {
                        settingTab.plugin.settings.fluentView.fluentConfig = {
                            enableWorkspaces: true,
                            defaultWorkspace: "default",
                            showTopNavigation: true,
                            showNewSidebar: true,
                            allowViewSwitching: true,
                            persistViewMode: true,
                        };
                    }
                    settingTab.plugin.settings.fluentView.fluentConfig.maxOtherViewsBeforeOverflow = n;
                    yield settingTab.plugin.saveSettings();
                }
            }));
        });
    };
    // Initial render of Fluent-specific settings
    renderFluentSpecificSettings();
}
/**
 * Create Fluent mode preview
 */
function createFluentPreview() {
    const preview = createDiv({
        cls: ["mode-preview", "mode-preview-fluent"],
    });
    // Check theme
    const isDark = document.body.classList.contains("theme-dark");
    const theme = isDark ? "" : "-light";
    const imageUrl = `https://raw.githubusercontent.com/Quorafind/Obsidian-Task-Progress-Bar/master/media/fluent${theme}.png`;
    const img = preview.createEl("img", {
        attr: {
            src: imageUrl,
            alt: "Fluent mode preview",
        },
    });
    img.style.maxWidth = "100%";
    img.style.maxHeight = "100%";
    img.style.objectFit = "contain";
    img.style.borderRadius = "4px";
    return preview;
}
/**
 * Create Legacy mode preview
 */
function createLegacyPreview() {
    const preview = createDiv({
        cls: ["mode-preview", "mode-preview-legacy"],
    });
    // Check theme
    const isDark = document.body.classList.contains("theme-dark");
    const theme = isDark ? "" : "-light";
    const imageUrl = `https://raw.githubusercontent.com/Quorafind/Obsidian-Task-Progress-Bar/master/media/legacy${theme}.png`;
    const img = preview.createEl("img", {
        attr: {
            src: imageUrl,
            alt: "Legacy mode preview",
        },
    });
    img.style.maxWidth = "100%";
    img.style.maxHeight = "100%";
    img.style.objectFit = "contain";
    img.style.borderRadius = "4px";
    return preview;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSW50ZXJmYWNlU2V0dGluZ3NUYWIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJJbnRlcmZhY2VTZXR0aW5nc1RhYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFFM0MsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzFDLE9BQU8sRUFDTixjQUFjLEdBRWQsTUFBTSxvREFBb0QsQ0FBQztBQUU1RCxNQUFNLFVBQVUsMEJBQTBCLENBQ3pDLFVBQXFDLEVBQ3JDLFdBQXdCOztJQUV4QixTQUFTO0lBQ1QsSUFBSSxPQUFPLENBQUMsV0FBVyxDQUFDO1NBQ3RCLE9BQU8sQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztTQUM1QixPQUFPLENBQ1AsQ0FBQyxDQUNBLGlHQUFpRyxDQUNqRyxDQUNEO1NBQ0EsVUFBVSxFQUFFLENBQUM7SUFFZix5QkFBeUI7SUFDekIsSUFBSSxPQUFPLENBQUMsV0FBVyxDQUFDO1NBQ3RCLE9BQU8sQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztTQUM1QixPQUFPLENBQ1AsQ0FBQyxDQUNBLDZFQUE2RSxDQUM3RSxDQUNEO1NBQ0EsVUFBVSxFQUFFLENBQUM7SUFFZixrQ0FBa0M7SUFDbEMsTUFBTSxzQkFBc0IsR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFDO1FBQ3BELEdBQUcsRUFBRSwwQkFBMEI7S0FDL0IsQ0FBQyxDQUFDO0lBRUgsbUJBQW1CO0lBQ25CLE1BQU0sV0FBVyxHQUFHLENBQUEsTUFBQSxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLDBDQUFFLFlBQVk7UUFDdEUsQ0FBQyxDQUFDLFFBQVE7UUFDVixDQUFDLENBQUMsUUFBUSxDQUFDO0lBRVosNkJBQTZCO0lBQzdCLE1BQU0sV0FBVyxHQUFtQztRQUNuRDtZQUNDLEVBQUUsRUFBRSxRQUFRO1lBQ1os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QUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7SUFDckMsTUFBTSxRQUFRLEdBQUcsNkZBQTZGLEtBQUssTUFBTSxDQUFDO0lBRTFILE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFO1FBQ25DLElBQUksRUFBRTtZQUNMLEdBQUcsRUFBRSxRQUFRO1lBQ2IsR0FBRyxFQUFFLHFCQUFxQjtTQUMxQjtLQUNELENBQUMsQ0FBQztJQUNILEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQztJQUM1QixHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUM7SUFDN0IsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO0lBQ2hDLEdBQUcsQ0FBQyxLQUFLLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQztJQUUvQixPQUFPLE9BQU8sQ0FBQztBQUNoQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU2V0dGluZywgTm90aWNlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFRhc2tQcm9ncmVzc0JhclNldHRpbmdUYWIgfSBmcm9tIFwiQC9zZXR0aW5nXCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCB7XHJcblx0U2VsZWN0YWJsZUNhcmQsXHJcblx0U2VsZWN0YWJsZUNhcmRDb25maWcsXHJcbn0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy9vbmJvYXJkaW5nL3VpL1NlbGVjdGFibGVDYXJkXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVySW50ZXJmYWNlU2V0dGluZ3NUYWIoXHJcblx0c2V0dGluZ1RhYjogVGFza1Byb2dyZXNzQmFyU2V0dGluZ1RhYixcclxuXHRjb250YWluZXJFbDogSFRNTEVsZW1lbnRcclxuKSB7XHJcblx0Ly8gSGVhZGVyXHJcblx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHQuc2V0TmFtZSh0KFwiVXNlciBJbnRlcmZhY2VcIikpXHJcblx0XHQuc2V0RGVzYyhcclxuXHRcdFx0dChcclxuXHRcdFx0XHRcIkNob29zZSB5b3VyIHByZWZlcnJlZCBpbnRlcmZhY2Ugc3R5bGUgYW5kIGNvbmZpZ3VyZSBob3cgVGFzayBHZW5pdXMgZGlzcGxheXMgaW4geW91ciB3b3Jrc3BhY2UuXCJcclxuXHRcdFx0KVxyXG5cdFx0KVxyXG5cdFx0LnNldEhlYWRpbmcoKTtcclxuXHJcblx0Ly8gTW9kZSBTZWxlY3Rpb24gU2VjdGlvblxyXG5cdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0LnNldE5hbWUodChcIkludGVyZmFjZSBNb2RlXCIpKVxyXG5cdFx0LnNldERlc2MoXHJcblx0XHRcdHQoXHJcblx0XHRcdFx0XCJTZWxlY3QgYmV0d2VlbiB0aGUgbW9kZXJuIEZsdWVudCBpbnRlcmZhY2Ugb3IgdGhlIGNsYXNzaWMgTGVnYWN5IGludGVyZmFjZS5cIlxyXG5cdFx0XHQpXHJcblx0XHQpXHJcblx0XHQuc2V0SGVhZGluZygpO1xyXG5cclxuXHQvLyBDcmVhdGUgbW9kZSBzZWxlY3Rpb24gY29udGFpbmVyXHJcblx0Y29uc3QgbW9kZVNlbGVjdGlvbkNvbnRhaW5lciA9IGNvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRjbHM6IFwiaW50ZXJmYWNlLW1vZGUtc2VsZWN0aW9uXCIsXHJcblx0fSk7XHJcblxyXG5cdC8vIEdldCBjdXJyZW50IG1vZGVcclxuXHRjb25zdCBjdXJyZW50TW9kZSA9IHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmZsdWVudFZpZXc/LmVuYWJsZUZsdWVudFxyXG5cdFx0PyBcImZsdWVudFwiXHJcblx0XHQ6IFwibGVnYWN5XCI7XHJcblxyXG5cdC8vIENyZWF0ZSBjYXJkcyBjb25maWd1cmF0aW9uXHJcblx0Y29uc3QgY2FyZENvbmZpZ3M6IFNlbGVjdGFibGVDYXJkQ29uZmlnPHN0cmluZz5bXSA9IFtcclxuXHRcdHtcclxuXHRcdFx0aWQ6IFwiZmx1ZW50XCIsXHJcblx0XHRcdHRpdGxlOiB0KFwiRmx1ZW50XCIpLFxyXG5cdFx0XHRzdWJ0aXRsZTogdChcIk1vZGVybiAmIFNsZWVrXCIpLFxyXG5cdFx0XHRkZXNjcmlwdGlvbjogdChcclxuXHRcdFx0XHRcIk5ldyB2aXN1YWwgZGVzaWduIHdpdGggZWxlZ2FudCBhbmltYXRpb25zIGFuZCBtb2Rlcm4gaW50ZXJhY3Rpb25zXCJcclxuXHRcdFx0KSxcclxuXHRcdFx0cHJldmlldzogY3JlYXRlRmx1ZW50UHJldmlldygpLFxyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aWQ6IFwibGVnYWN5XCIsXHJcblx0XHRcdHRpdGxlOiB0KFwiTGVnYWN5XCIpLFxyXG5cdFx0XHRzdWJ0aXRsZTogdChcIkNsYXNzaWMgJiBGYW1pbGlhclwiKSxcclxuXHRcdFx0ZGVzY3JpcHRpb246IHQoXHJcblx0XHRcdFx0XCJLZWVwIHRoZSBmYW1pbGlhciBpbnRlcmZhY2UgYW5kIGludGVyYWN0aW9uIHN0eWxlIHlvdSBrbm93XCJcclxuXHRcdFx0KSxcclxuXHRcdFx0cHJldmlldzogY3JlYXRlTGVnYWN5UHJldmlldygpLFxyXG5cdFx0fSxcclxuXHRdO1xyXG5cclxuXHQvLyBDcmVhdGUgc2VsZWN0YWJsZSBjYXJkc1xyXG5cdGNvbnN0IGNhcmQgPSBuZXcgU2VsZWN0YWJsZUNhcmQ8c3RyaW5nPihcclxuXHRcdG1vZGVTZWxlY3Rpb25Db250YWluZXIsXHJcblx0XHRjYXJkQ29uZmlncyxcclxuXHRcdHtcclxuXHRcdFx0Y29udGFpbmVyQ2xhc3M6IFwic2VsZWN0YWJsZS1jYXJkcy1jb250YWluZXJcIixcclxuXHRcdFx0Y2FyZENsYXNzOiBcInNlbGVjdGFibGUtY2FyZFwiLFxyXG5cdFx0XHRzaG93UHJldmlldzogdHJ1ZSxcclxuXHRcdH0sXHJcblx0XHRhc3luYyAobW9kZSkgPT4ge1xyXG5cdFx0XHQvLyBVcGRhdGUgc2V0dGluZ3NcclxuXHRcdFx0aWYgKCFzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5mbHVlbnRWaWV3KSB7XHJcblx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZmx1ZW50VmlldyA9IHtcclxuXHRcdFx0XHRcdGVuYWJsZUZsdWVudDogZmFsc2UsXHJcblx0XHRcdFx0XHRzaG93Rmx1ZW50UmliYm9uOiBmYWxzZSxcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmZsdWVudFZpZXcuZW5hYmxlRmx1ZW50ID0gbW9kZSA9PT0gXCJmbHVlbnRcIjtcclxuXHRcdFx0YXdhaXQgc2V0dGluZ1RhYi5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblxyXG5cdFx0XHQvLyBSZS1yZW5kZXIgdGhlIHNldHRpbmdzIHRvIHNob3cvaGlkZSBGbHVlbnQtc3BlY2lmaWMgb3B0aW9uc1xyXG5cdFx0XHRyZW5kZXJGbHVlbnRTcGVjaWZpY1NldHRpbmdzKCk7XHJcblx0XHR9XHJcblx0KTtcclxuXHJcblx0Ly8gU2V0IGluaXRpYWwgc2VsZWN0aW9uXHJcblx0Y2FyZC5zZXRTZWxlY3RlZChjdXJyZW50TW9kZSk7XHJcblxyXG5cdC8vIENvbnRhaW5lciBmb3IgRmx1ZW50LXNwZWNpZmljIHNldHRpbmdzXHJcblx0Y29uc3QgZmx1ZW50U2V0dGluZ3NDb250YWluZXIgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0Y2xzOiBcImZsdWVudC1zcGVjaWZpYy1zZXR0aW5nc1wiLFxyXG5cdH0pO1xyXG5cclxuXHQvLyBGdW5jdGlvbiB0byByZW5kZXIgRmx1ZW50LXNwZWNpZmljIHNldHRpbmdzXHJcblx0Y29uc3QgcmVuZGVyRmx1ZW50U3BlY2lmaWNTZXR0aW5ncyA9ICgpID0+IHtcclxuXHRcdC8vIENsZWFyIHRoZSBjb250YWluZXJcclxuXHRcdGZsdWVudFNldHRpbmdzQ29udGFpbmVyLmVtcHR5KCk7XHJcblxyXG5cdFx0Ly8gT25seSBzaG93IGlmIEZsdWVudCBpcyBlbmFibGVkXHJcblx0XHRpZiAoIXNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmZsdWVudFZpZXc/LmVuYWJsZUZsdWVudCkge1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRmx1ZW50IFNldHRpbmdzIEhlYWRlclxyXG5cdFx0bmV3IFNldHRpbmcoZmx1ZW50U2V0dGluZ3NDb250YWluZXIpXHJcblx0XHRcdC5zZXROYW1lKHQoXCJGbHVlbnQgSW50ZXJmYWNlIFNldHRpbmdzXCIpKVxyXG5cdFx0XHQuc2V0RGVzYyh0KFwiQ29uZmlndXJlIG9wdGlvbnMgc3BlY2lmaWMgdG8gdGhlIEZsdWVudCBpbnRlcmZhY2UuXCIpKVxyXG5cdFx0XHQuc2V0SGVhZGluZygpO1xyXG5cclxuXHRcdC8vIFVzZSB3b3Jrc3BhY2Ugc2lkZSBsZWF2ZXMgZm9yIFNpZGViYXIgJiBEZXRhaWxzXHJcblx0XHRuZXcgU2V0dGluZyhmbHVlbnRTZXR0aW5nc0NvbnRhaW5lcilcclxuXHRcdFx0LnNldE5hbWUodChcIlVzZSBXb3Jrc3BhY2UgU2lkZSBMZWF2ZXNcIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcIlVzZSBsZWZ0L3JpZ2h0IHdvcmtzcGFjZSBzaWRlIGxlYXZlcyBmb3IgU2lkZWJhciBhbmQgRGV0YWlscy4gV2hlbiBlbmFibGVkLCB0aGUgbWFpbiBWMiB2aWV3IHdvbid0IHJlbmRlciBpbi12aWV3IHNpZGViYXIgb3IgZGV0YWlscy5cIlxyXG5cdFx0XHRcdClcclxuXHRcdFx0KVxyXG5cdFx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcclxuXHRcdFx0XHRjb25zdCBjdXJyZW50ID0gc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZmx1ZW50Vmlldz8udXNlV29ya3NwYWNlU2lkZUxlYXZlcyA/PyB0cnVlO1xyXG5cdFx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKGN1cnJlbnQpXHJcblx0XHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdGlmICghc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZmx1ZW50Vmlldykge1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmZsdWVudFZpZXcgPSB7XHJcblx0XHRcdFx0XHRcdFx0XHRlbmFibGVGbHVlbnQ6IGZhbHNlLFxyXG5cdFx0XHRcdFx0XHRcdFx0c2hvd0ZsdWVudFJpYmJvbjogZmFsc2UsXHJcblx0XHRcdFx0XHRcdFx0fTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRpZiAoIXNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmZsdWVudFZpZXcuZmx1ZW50Q29uZmlnKSB7XHJcblx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZmx1ZW50Vmlldy5mbHVlbnRDb25maWcgPSB7XHJcblx0XHRcdFx0XHRcdFx0XHRlbmFibGVXb3Jrc3BhY2VzOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRcdFx0ZGVmYXVsdFdvcmtzcGFjZTogXCJkZWZhdWx0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRzaG93VG9wTmF2aWdhdGlvbjogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0XHRcdHNob3dOZXdTaWRlYmFyOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRcdFx0YWxsb3dWaWV3U3dpdGNoaW5nOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRcdFx0cGVyc2lzdFZpZXdNb2RlOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0Ly8gU3RvcmUgdmlhICdhbnknIHRvIGF2b2lkIHR5cGluZyBjb25zdHJhaW50cyBmb3IgZXhwZXJpbWVudGFsIGJhY2tmaWxsXHJcblx0XHRcdFx0XHRcdChzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5mbHVlbnRWaWV3IGFzIGFueSkudXNlV29ya3NwYWNlU2lkZUxlYXZlcyA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRhd2FpdCBzZXR0aW5nVGFiLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHRcdFx0bmV3IE5vdGljZSh0KFwiU2F2ZWQuIFJlb3BlbiB0aGUgdmlldyB0byBhcHBseS5cIikpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdC8vIE1heCBPdGhlciBWaWV3cyBiZWZvcmUgb3ZlcmZsb3cgdGhyZXNob2xkXHJcblx0XHRuZXcgU2V0dGluZyhmbHVlbnRTZXR0aW5nc0NvbnRhaW5lcilcclxuXHRcdFx0LnNldE5hbWUodChcIk1heCBPdGhlciBWaWV3cyBiZWZvcmUgb3ZlcmZsb3dcIikpXHJcblx0XHRcdC5zZXREZXNjKFxyXG5cdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcIk51bWJlciBvZiAnT3RoZXIgVmlld3MnIHRvIHNob3cgYmVmb3JlIGdyb3VwaW5nIHRoZSByZXN0IGludG8gYW4gb3ZlcmZsb3cgbWVudSAoZWxsaXBzaXMpXCJcclxuXHRcdFx0XHQpXHJcblx0XHRcdClcclxuXHRcdFx0LmFkZFRleHQoKHRleHQpID0+IHtcclxuXHRcdFx0XHRjb25zdCBjdXJyZW50ID1cclxuXHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmZsdWVudFZpZXc/LmZsdWVudENvbmZpZ1xyXG5cdFx0XHRcdFx0XHQ/Lm1heE90aGVyVmlld3NCZWZvcmVPdmVyZmxvdyA/PyA1O1xyXG5cdFx0XHRcdHRleHQuc2V0UGxhY2Vob2xkZXIoXCI1XCIpXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUoU3RyaW5nKGN1cnJlbnQpKVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBuID0gcGFyc2VJbnQodmFsdWUsIDEwKTtcclxuXHRcdFx0XHRcdFx0aWYgKCFpc05hTihuKSAmJiBuID49IDEgJiYgbiA8PSA1MCkge1xyXG5cdFx0XHRcdFx0XHRcdGlmICghc2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZmx1ZW50Vmlldykge1xyXG5cdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5wbHVnaW4uc2V0dGluZ3MuZmx1ZW50VmlldyA9IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0ZW5hYmxlRmx1ZW50OiBmYWxzZSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0c2hvd0ZsdWVudFJpYmJvbjogZmFsc2UsXHJcblx0XHRcdFx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRpZiAoIXNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmZsdWVudFZpZXcuZmx1ZW50Q29uZmlnKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5mbHVlbnRWaWV3LmZsdWVudENvbmZpZyA9IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0ZW5hYmxlV29ya3NwYWNlczogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0ZGVmYXVsdFdvcmtzcGFjZTogXCJkZWZhdWx0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdHNob3dUb3BOYXZpZ2F0aW9uOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRzaG93TmV3U2lkZWJhcjogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0YWxsb3dWaWV3U3dpdGNoaW5nOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRwZXJzaXN0Vmlld01vZGU6IHRydWUsXHJcblx0XHRcdFx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5mbHVlbnRWaWV3LmZsdWVudENvbmZpZy5tYXhPdGhlclZpZXdzQmVmb3JlT3ZlcmZsb3cgPSBuO1xyXG5cdFx0XHRcdFx0XHRcdGF3YWl0IHNldHRpbmdUYWIucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0fTtcclxuXHJcblx0Ly8gSW5pdGlhbCByZW5kZXIgb2YgRmx1ZW50LXNwZWNpZmljIHNldHRpbmdzXHJcblx0cmVuZGVyRmx1ZW50U3BlY2lmaWNTZXR0aW5ncygpO1xyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlIEZsdWVudCBtb2RlIHByZXZpZXdcclxuICovXHJcbmZ1bmN0aW9uIGNyZWF0ZUZsdWVudFByZXZpZXcoKTogSFRNTEVsZW1lbnQge1xyXG5cdGNvbnN0IHByZXZpZXcgPSBjcmVhdGVEaXYoe1xyXG5cdFx0Y2xzOiBbXCJtb2RlLXByZXZpZXdcIiwgXCJtb2RlLXByZXZpZXctZmx1ZW50XCJdLFxyXG5cdH0pO1xyXG5cclxuXHQvLyBDaGVjayB0aGVtZVxyXG5cdGNvbnN0IGlzRGFyayA9IGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LmNvbnRhaW5zKFwidGhlbWUtZGFya1wiKTtcclxuXHRjb25zdCB0aGVtZSA9IGlzRGFyayA/IFwiXCIgOiBcIi1saWdodFwiO1xyXG5cdGNvbnN0IGltYWdlVXJsID0gYGh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9RdW9yYWZpbmQvT2JzaWRpYW4tVGFzay1Qcm9ncmVzcy1CYXIvbWFzdGVyL21lZGlhL2ZsdWVudCR7dGhlbWV9LnBuZ2A7XHJcblxyXG5cdGNvbnN0IGltZyA9IHByZXZpZXcuY3JlYXRlRWwoXCJpbWdcIiwge1xyXG5cdFx0YXR0cjoge1xyXG5cdFx0XHRzcmM6IGltYWdlVXJsLFxyXG5cdFx0XHRhbHQ6IFwiRmx1ZW50IG1vZGUgcHJldmlld1wiLFxyXG5cdFx0fSxcclxuXHR9KTtcclxuXHRpbWcuc3R5bGUubWF4V2lkdGggPSBcIjEwMCVcIjtcclxuXHRpbWcuc3R5bGUubWF4SGVpZ2h0ID0gXCIxMDAlXCI7XHJcblx0aW1nLnN0eWxlLm9iamVjdEZpdCA9IFwiY29udGFpblwiO1xyXG5cdGltZy5zdHlsZS5ib3JkZXJSYWRpdXMgPSBcIjRweFwiO1xyXG5cclxuXHRyZXR1cm4gcHJldmlldztcclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSBMZWdhY3kgbW9kZSBwcmV2aWV3XHJcbiAqL1xyXG5mdW5jdGlvbiBjcmVhdGVMZWdhY3lQcmV2aWV3KCk6IEhUTUxFbGVtZW50IHtcclxuXHRjb25zdCBwcmV2aWV3ID0gY3JlYXRlRGl2KHtcclxuXHRcdGNsczogW1wibW9kZS1wcmV2aWV3XCIsIFwibW9kZS1wcmV2aWV3LWxlZ2FjeVwiXSxcclxuXHR9KTtcclxuXHJcblx0Ly8gQ2hlY2sgdGhlbWVcclxuXHRjb25zdCBpc0RhcmsgPSBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5jb250YWlucyhcInRoZW1lLWRhcmtcIik7XHJcblx0Y29uc3QgdGhlbWUgPSBpc0RhcmsgPyBcIlwiIDogXCItbGlnaHRcIjtcclxuXHRjb25zdCBpbWFnZVVybCA9IGBodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vUXVvcmFmaW5kL09ic2lkaWFuLVRhc2stUHJvZ3Jlc3MtQmFyL21hc3Rlci9tZWRpYS9sZWdhY3kke3RoZW1lfS5wbmdgO1xyXG5cclxuXHRjb25zdCBpbWcgPSBwcmV2aWV3LmNyZWF0ZUVsKFwiaW1nXCIsIHtcclxuXHRcdGF0dHI6IHtcclxuXHRcdFx0c3JjOiBpbWFnZVVybCxcclxuXHRcdFx0YWx0OiBcIkxlZ2FjeSBtb2RlIHByZXZpZXdcIixcclxuXHRcdH0sXHJcblx0fSk7XHJcblx0aW1nLnN0eWxlLm1heFdpZHRoID0gXCIxMDAlXCI7XHJcblx0aW1nLnN0eWxlLm1heEhlaWdodCA9IFwiMTAwJVwiO1xyXG5cdGltZy5zdHlsZS5vYmplY3RGaXQgPSBcImNvbnRhaW5cIjtcclxuXHRpbWcuc3R5bGUuYm9yZGVyUmFkaXVzID0gXCI0cHhcIjtcclxuXHJcblx0cmV0dXJuIHByZXZpZXc7XHJcbn1cclxuIl19