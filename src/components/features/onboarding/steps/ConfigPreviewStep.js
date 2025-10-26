import { t } from "@/translations/helper";
import { Setting } from "obsidian";
import { ConfigSummary } from "./preview/ConfigSummary";
import { ViewsGrid } from "./preview/ViewsGrid";
import { SettingsList } from "./preview/SettingsList";
import { ChangesPreview } from "./preview/ChangesPreview";
import { Alert } from "../ui/Alert";
/**
 * Config Preview Step - Review configuration before applying
 */
export class ConfigPreviewStep {
    /**
     * Render the config preview step
     */
    static render(headerEl, contentEl, controller, configManager) {
        // Clear
        headerEl.empty();
        contentEl.empty();
        const state = controller.getState();
        const config = state.selectedConfig;
        // Redirect if no config selected
        if (!config) {
            controller.setStep(controller.getCurrentStep() - 1);
            return;
        }
        // Header
        headerEl.createEl("h1", { text: t("Review Your Configuration") });
        headerEl.createEl("p", {
            text: t("Review the settings that will be applied for your selected mode"),
            cls: "onboarding-subtitle",
        });
        // Config summary card
        ConfigSummary.render(contentEl, config);
        // Features section
        const featuresSection = contentEl.createDiv("config-features");
        featuresSection.createEl("h3", {
            text: t("Features to be enabled"),
        });
        const featuresList = featuresSection.createEl("ul", {
            cls: "enabled-features-list",
        });
        config.features.forEach((feature) => {
            const item = featuresList.createEl("li");
            const checkIcon = item.createSpan("feature-check");
            checkIcon.setText("✓");
            item.createSpan("feature-text").setText(feature);
        });
        // Views grid
        if (config.settings.viewConfiguration) {
            ViewsGrid.render(contentEl, config.settings.viewConfiguration);
        }
        // Settings summary
        SettingsList.render(contentEl, config);
        // Configuration changes preview
        ChangesPreview.render(contentEl, config, configManager);
        // Task guide option
        const optionsSection = contentEl.createDiv("config-options");
        new Setting(optionsSection)
            .setName(t("Include task creation guide"))
            .setDesc(t("Show a quick tutorial on creating your first task"))
            .addToggle((toggle) => {
            toggle.setValue(!state.skipTaskGuide).onChange((value) => {
                controller.setSkipTaskGuide(!value);
            });
        });
        // Note about customization
        Alert.create(contentEl, t("You can customize any of these settings later in the plugin settings"), {
            variant: "info",
            className: "customization-note",
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29uZmlnUHJldmlld1N0ZXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJDb25maWdQcmV2aWV3U3RlcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDMUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUduQyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDeEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ2hELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDMUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUVwQzs7R0FFRztBQUNILE1BQU0sT0FBTyxpQkFBaUI7SUFDN0I7O09BRUc7SUFDSCxNQUFNLENBQUMsTUFBTSxDQUNaLFFBQXFCLEVBQ3JCLFNBQXNCLEVBQ3RCLFVBQWdDLEVBQ2hDLGFBQXNDO1FBRXRDLFFBQVE7UUFDUixRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDakIsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRWxCLE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNwQyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDO1FBRXBDLGlDQUFpQztRQUNqQyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ1osVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDcEQsT0FBTztTQUNQO1FBRUQsU0FBUztRQUNULFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNsRSxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRTtZQUN0QixJQUFJLEVBQUUsQ0FBQyxDQUNOLGlFQUFpRSxDQUNqRTtZQUNELEdBQUcsRUFBRSxxQkFBcUI7U0FDMUIsQ0FBQyxDQUFDO1FBRUgsc0JBQXNCO1FBQ3RCLGFBQWEsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRXhDLG1CQUFtQjtRQUNuQixNQUFNLGVBQWUsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDL0QsZUFBZSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUU7WUFDOUIsSUFBSSxFQUFFLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQztTQUNqQyxDQUFDLENBQUM7UUFFSCxNQUFNLFlBQVksR0FBRyxlQUFlLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRTtZQUNuRCxHQUFHLEVBQUUsdUJBQXVCO1NBQzVCLENBQUMsQ0FBQztRQUVILE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDbkMsTUFBTSxJQUFJLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN6QyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ25ELFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdkIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbEQsQ0FBQyxDQUFDLENBQUM7UUFFSCxhQUFhO1FBQ2IsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFO1lBQ3RDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsQ0FBQztTQUMvRDtRQUVELG1CQUFtQjtRQUNuQixZQUFZLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUV2QyxnQ0FBZ0M7UUFDaEMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsTUFBTSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBRXhELG9CQUFvQjtRQUNwQixNQUFNLGNBQWMsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFFN0QsSUFBSSxPQUFPLENBQUMsY0FBYyxDQUFDO2FBQ3pCLE9BQU8sQ0FBQyxDQUFDLENBQUMsNkJBQTZCLENBQUMsQ0FBQzthQUN6QyxPQUFPLENBQUMsQ0FBQyxDQUFDLG1EQUFtRCxDQUFDLENBQUM7YUFDL0QsU0FBUyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDckIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDeEQsVUFBVSxDQUFDLGdCQUFnQixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDckMsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUVKLDJCQUEyQjtRQUMzQixLQUFLLENBQUMsTUFBTSxDQUNYLFNBQVMsRUFDVCxDQUFDLENBQ0Esc0VBQXNFLENBQ3RFLEVBQ0Q7WUFDQyxPQUFPLEVBQUUsTUFBTTtZQUNmLFNBQVMsRUFBRSxvQkFBb0I7U0FDL0IsQ0FDRCxDQUFDO0lBQ0gsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHsgU2V0dGluZyB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBPbmJvYXJkaW5nQ29udHJvbGxlciB9IGZyb20gXCIuLi9PbmJvYXJkaW5nQ29udHJvbGxlclwiO1xyXG5pbXBvcnQgeyBPbmJvYXJkaW5nQ29uZmlnTWFuYWdlciB9IGZyb20gXCJAL21hbmFnZXJzL29uYm9hcmRpbmctbWFuYWdlclwiO1xyXG5pbXBvcnQgeyBDb25maWdTdW1tYXJ5IH0gZnJvbSBcIi4vcHJldmlldy9Db25maWdTdW1tYXJ5XCI7XHJcbmltcG9ydCB7IFZpZXdzR3JpZCB9IGZyb20gXCIuL3ByZXZpZXcvVmlld3NHcmlkXCI7XHJcbmltcG9ydCB7IFNldHRpbmdzTGlzdCB9IGZyb20gXCIuL3ByZXZpZXcvU2V0dGluZ3NMaXN0XCI7XHJcbmltcG9ydCB7IENoYW5nZXNQcmV2aWV3IH0gZnJvbSBcIi4vcHJldmlldy9DaGFuZ2VzUHJldmlld1wiO1xyXG5pbXBvcnQgeyBBbGVydCB9IGZyb20gXCIuLi91aS9BbGVydFwiO1xyXG5cclxuLyoqXHJcbiAqIENvbmZpZyBQcmV2aWV3IFN0ZXAgLSBSZXZpZXcgY29uZmlndXJhdGlvbiBiZWZvcmUgYXBwbHlpbmdcclxuICovXHJcbmV4cG9ydCBjbGFzcyBDb25maWdQcmV2aWV3U3RlcCB7XHJcblx0LyoqXHJcblx0ICogUmVuZGVyIHRoZSBjb25maWcgcHJldmlldyBzdGVwXHJcblx0ICovXHJcblx0c3RhdGljIHJlbmRlcihcclxuXHRcdGhlYWRlckVsOiBIVE1MRWxlbWVudCxcclxuXHRcdGNvbnRlbnRFbDogSFRNTEVsZW1lbnQsXHJcblx0XHRjb250cm9sbGVyOiBPbmJvYXJkaW5nQ29udHJvbGxlcixcclxuXHRcdGNvbmZpZ01hbmFnZXI6IE9uYm9hcmRpbmdDb25maWdNYW5hZ2VyLFxyXG5cdCkge1xyXG5cdFx0Ly8gQ2xlYXJcclxuXHRcdGhlYWRlckVsLmVtcHR5KCk7XHJcblx0XHRjb250ZW50RWwuZW1wdHkoKTtcclxuXHJcblx0XHRjb25zdCBzdGF0ZSA9IGNvbnRyb2xsZXIuZ2V0U3RhdGUoKTtcclxuXHRcdGNvbnN0IGNvbmZpZyA9IHN0YXRlLnNlbGVjdGVkQ29uZmlnO1xyXG5cclxuXHRcdC8vIFJlZGlyZWN0IGlmIG5vIGNvbmZpZyBzZWxlY3RlZFxyXG5cdFx0aWYgKCFjb25maWcpIHtcclxuXHRcdFx0Y29udHJvbGxlci5zZXRTdGVwKGNvbnRyb2xsZXIuZ2V0Q3VycmVudFN0ZXAoKSAtIDEpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSGVhZGVyXHJcblx0XHRoZWFkZXJFbC5jcmVhdGVFbChcImgxXCIsIHsgdGV4dDogdChcIlJldmlldyBZb3VyIENvbmZpZ3VyYXRpb25cIikgfSk7XHJcblx0XHRoZWFkZXJFbC5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFxyXG5cdFx0XHRcdFwiUmV2aWV3IHRoZSBzZXR0aW5ncyB0aGF0IHdpbGwgYmUgYXBwbGllZCBmb3IgeW91ciBzZWxlY3RlZCBtb2RlXCIsXHJcblx0XHRcdCksXHJcblx0XHRcdGNsczogXCJvbmJvYXJkaW5nLXN1YnRpdGxlXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDb25maWcgc3VtbWFyeSBjYXJkXHJcblx0XHRDb25maWdTdW1tYXJ5LnJlbmRlcihjb250ZW50RWwsIGNvbmZpZyk7XHJcblxyXG5cdFx0Ly8gRmVhdHVyZXMgc2VjdGlvblxyXG5cdFx0Y29uc3QgZmVhdHVyZXNTZWN0aW9uID0gY29udGVudEVsLmNyZWF0ZURpdihcImNvbmZpZy1mZWF0dXJlc1wiKTtcclxuXHRcdGZlYXR1cmVzU2VjdGlvbi5jcmVhdGVFbChcImgzXCIsIHtcclxuXHRcdFx0dGV4dDogdChcIkZlYXR1cmVzIHRvIGJlIGVuYWJsZWRcIiksXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCBmZWF0dXJlc0xpc3QgPSBmZWF0dXJlc1NlY3Rpb24uY3JlYXRlRWwoXCJ1bFwiLCB7XHJcblx0XHRcdGNsczogXCJlbmFibGVkLWZlYXR1cmVzLWxpc3RcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbmZpZy5mZWF0dXJlcy5mb3JFYWNoKChmZWF0dXJlKSA9PiB7XHJcblx0XHRcdGNvbnN0IGl0ZW0gPSBmZWF0dXJlc0xpc3QuY3JlYXRlRWwoXCJsaVwiKTtcclxuXHRcdFx0Y29uc3QgY2hlY2tJY29uID0gaXRlbS5jcmVhdGVTcGFuKFwiZmVhdHVyZS1jaGVja1wiKTtcclxuXHRcdFx0Y2hlY2tJY29uLnNldFRleHQoXCLinJNcIik7XHJcblx0XHRcdGl0ZW0uY3JlYXRlU3BhbihcImZlYXR1cmUtdGV4dFwiKS5zZXRUZXh0KGZlYXR1cmUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gVmlld3MgZ3JpZFxyXG5cdFx0aWYgKGNvbmZpZy5zZXR0aW5ncy52aWV3Q29uZmlndXJhdGlvbikge1xyXG5cdFx0XHRWaWV3c0dyaWQucmVuZGVyKGNvbnRlbnRFbCwgY29uZmlnLnNldHRpbmdzLnZpZXdDb25maWd1cmF0aW9uKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTZXR0aW5ncyBzdW1tYXJ5XHJcblx0XHRTZXR0aW5nc0xpc3QucmVuZGVyKGNvbnRlbnRFbCwgY29uZmlnKTtcclxuXHJcblx0XHQvLyBDb25maWd1cmF0aW9uIGNoYW5nZXMgcHJldmlld1xyXG5cdFx0Q2hhbmdlc1ByZXZpZXcucmVuZGVyKGNvbnRlbnRFbCwgY29uZmlnLCBjb25maWdNYW5hZ2VyKTtcclxuXHJcblx0XHQvLyBUYXNrIGd1aWRlIG9wdGlvblxyXG5cdFx0Y29uc3Qgb3B0aW9uc1NlY3Rpb24gPSBjb250ZW50RWwuY3JlYXRlRGl2KFwiY29uZmlnLW9wdGlvbnNcIik7XHJcblxyXG5cdFx0bmV3IFNldHRpbmcob3B0aW9uc1NlY3Rpb24pXHJcblx0XHRcdC5zZXROYW1lKHQoXCJJbmNsdWRlIHRhc2sgY3JlYXRpb24gZ3VpZGVcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJTaG93IGEgcXVpY2sgdHV0b3JpYWwgb24gY3JlYXRpbmcgeW91ciBmaXJzdCB0YXNrXCIpKVxyXG5cdFx0XHQuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcclxuXHRcdFx0XHR0b2dnbGUuc2V0VmFsdWUoIXN0YXRlLnNraXBUYXNrR3VpZGUpLm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0Y29udHJvbGxlci5zZXRTa2lwVGFza0d1aWRlKCF2YWx1ZSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdC8vIE5vdGUgYWJvdXQgY3VzdG9taXphdGlvblxyXG5cdFx0QWxlcnQuY3JlYXRlKFxyXG5cdFx0XHRjb250ZW50RWwsXHJcblx0XHRcdHQoXHJcblx0XHRcdFx0XCJZb3UgY2FuIGN1c3RvbWl6ZSBhbnkgb2YgdGhlc2Ugc2V0dGluZ3MgbGF0ZXIgaW4gdGhlIHBsdWdpbiBzZXR0aW5nc1wiLFxyXG5cdFx0XHQpLFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0dmFyaWFudDogXCJpbmZvXCIsXHJcblx0XHRcdFx0Y2xhc3NOYW1lOiBcImN1c3RvbWl6YXRpb24tbm90ZVwiLFxyXG5cdFx0XHR9LFxyXG5cdFx0KTtcclxuXHR9XHJcbn1cclxuIl19