import { t } from "@/translations/helper";
import { setIcon } from "obsidian";
import { Badge } from "../ui/Badge";
/**
 * Settings Check Step - Show if user has existing configuration
 */
export class SettingsCheckStep {
    /**
     * Render the settings check step
     */
    static render(headerEl, contentEl, controller) {
        // Clear
        headerEl.empty();
        contentEl.empty();
        // Reset selection
        this.selectedAction = null;
        const state = controller.getState();
        // Header - friendly and direct
        headerEl.createEl("h1", { text: t("You've Customized Task Genius") });
        headerEl.createEl("p", {
            text: t("Great! Let's decide how to proceed with your existing setup."),
            cls: "onboarding-subtitle",
        });
        // Main content - two-column layout
        const mainContent = contentEl.createDiv("settings-check-content");
        // Left: Current configuration summary card
        const currentConfigCard = mainContent.createDiv("settings-check-current-card");
        const currentHeader = currentConfigCard.createDiv("settings-check-card-header");
        const currentIcon = currentHeader.createDiv("check-header-icon");
        setIcon(currentIcon, "check-circle");
        const currentTitle = currentHeader.createDiv("check-header-title");
        currentTitle.createEl("h3", { text: t("Your Current Setup") });
        Badge.create(currentTitle, t("Active"), { variant: "success" });
        const currentBody = currentConfigCard.createDiv("settings-check-card-body");
        currentBody.createEl("p", {
            text: t("You've made the following customizations:"),
            cls: "check-card-desc",
        });
        // Render changes as elegant list
        const changesList = currentBody.createEl("ul", {
            cls: "settings-check-changes-list",
        });
        state.changesSummary.forEach((change) => {
            const item = changesList.createEl("li");
            const checkIcon = item.createSpan("change-check-icon");
            setIcon(checkIcon, "check");
            item.createSpan({ text: change });
        });
        // Right: Two action cards
        const actionsContainer = mainContent.createDiv("settings-check-actions");
        // Action 2: Keep current settings (secondary)
        const keepCard = actionsContainer.createDiv("settings-check-action-card settings-check-action-keep");
        // Action 1: Continue with wizard (prominent)
        const wizardCard = actionsContainer.createDiv("settings-check-action-card settings-check-action-wizard");
        // 先渲染卡片内容，再绑定事件，避免 keepCard/wizardCard 未定义
        const wizardHeader = wizardCard.createDiv("action-card-header");
        const wizardIcon = wizardHeader.createDiv("action-card-icon");
        setIcon(wizardIcon, "wand-2");
        const wizardContent = wizardCard.createDiv("action-card-content");
        wizardContent.createEl("h3", { text: t("Start Setup Wizard") });
        wizardContent.createEl("p", {
            text: t("Get personalized recommendations and discover features you might have missed"),
        });
        const wizardFeatures = wizardContent.createEl("ul", {
            cls: "action-card-features",
        });
        [
            t("Personalized configuration"),
            t("Feature discovery"),
            t("Quick setup guide"),
        ].forEach((feature) => {
            const item = wizardFeatures.createEl("li");
            const icon = item.createSpan("feature-icon");
            setIcon(icon, "arrow-right");
            item.createSpan({ text: feature });
        });
        const keepHeader = keepCard.createDiv("action-card-header");
        const keepIcon = keepHeader.createDiv("action-card-icon");
        setIcon(keepIcon, "shield-check");
        const keepContent = keepCard.createDiv("action-card-content");
        keepContent.createEl("h3", { text: t("Keep Current Settings") });
        keepContent.createEl("p", {
            text: t("Continue with your existing configuration. You can always access the wizard later from settings."),
        });
        const keepNote = keepContent.createDiv("action-card-note");
        const noteIcon = keepNote.createSpan("note-icon");
        setIcon(noteIcon, "info");
        keepNote.createSpan({
            text: t("Your customizations will be preserved"),
        });
        // 事件绑定前，确保两个卡片都已渲染
        wizardCard.addEventListener("click", () => {
            if (this.selectedAction === "wizard")
                return;
            this.selectedAction = "wizard";
            this.updateCardSelection(wizardCard, keepCard);
            controller.updateState({ settingsCheckAction: "wizard" });
        });
        keepCard.addEventListener("click", () => {
            if (this.selectedAction === "keep")
                return;
            this.selectedAction = "keep";
            this.updateCardSelection(keepCard, wizardCard);
            controller.updateState({ settingsCheckAction: "keep" });
        });
    }
    /**
     * Update card selection visual state
     */
    static updateCardSelection(selectedCard, otherCard) {
        // Add selected class to clicked card
        selectedCard.addClass("is-selected");
        // Remove selected class from other card
        otherCard.removeClass("is-selected");
    }
}
SettingsCheckStep.selectedAction = null;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2V0dGluZ3NDaGVja1N0ZXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJTZXR0aW5nc0NoZWNrU3RlcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDMUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUVuQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRXBDOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGlCQUFpQjtJQUc3Qjs7T0FFRztJQUNILE1BQU0sQ0FBQyxNQUFNLENBQ1osUUFBcUIsRUFDckIsU0FBc0IsRUFDdEIsVUFBZ0M7UUFFaEMsUUFBUTtRQUNSLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNqQixTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFbEIsa0JBQWtCO1FBQ2xCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO1FBRTNCLE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUVwQywrQkFBK0I7UUFDL0IsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLCtCQUErQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3RFLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFO1lBQ3RCLElBQUksRUFBRSxDQUFDLENBQ04sOERBQThELENBQzlEO1lBQ0QsR0FBRyxFQUFFLHFCQUFxQjtTQUMxQixDQUFDLENBQUM7UUFFSCxtQ0FBbUM7UUFDbkMsTUFBTSxXQUFXLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBRWxFLDJDQUEyQztRQUMzQyxNQUFNLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQzlDLDZCQUE2QixDQUM3QixDQUFDO1FBRUYsTUFBTSxhQUFhLEdBQUcsaUJBQWlCLENBQUMs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QUU7WUFDekMsSUFBSSxJQUFJLENBQUMsY0FBYyxLQUFLLFFBQVE7Z0JBQUUsT0FBTztZQUM3QyxJQUFJLENBQUMsY0FBYyxHQUFHLFFBQVEsQ0FBQztZQUMvQixJQUFJLENBQUMsbUJBQW1CLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQy9DLFVBQVUsQ0FBQyxXQUFXLENBQUMsRUFBRSxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQzNELENBQUMsQ0FBQyxDQUFDO1FBRUgsUUFBUSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7WUFDdkMsSUFBSSxJQUFJLENBQUMsY0FBYyxLQUFLLE1BQU07Z0JBQUUsT0FBTztZQUMzQyxJQUFJLENBQUMsY0FBYyxHQUFHLE1BQU0sQ0FBQztZQUM3QixJQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQy9DLFVBQVUsQ0FBQyxXQUFXLENBQUMsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ0ssTUFBTSxDQUFDLG1CQUFtQixDQUNqQyxZQUF5QixFQUN6QixTQUFzQjtRQUV0QixxQ0FBcUM7UUFDckMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUVyQyx3Q0FBd0M7UUFDeEMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUN0QyxDQUFDOztBQTFKYyxnQ0FBYyxHQUE2QixJQUFJLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgeyBzZXRJY29uIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IE9uYm9hcmRpbmdDb250cm9sbGVyIH0gZnJvbSBcIi4uL09uYm9hcmRpbmdDb250cm9sbGVyXCI7XHJcbmltcG9ydCB7IEJhZGdlIH0gZnJvbSBcIi4uL3VpL0JhZGdlXCI7XHJcblxyXG4vKipcclxuICogU2V0dGluZ3MgQ2hlY2sgU3RlcCAtIFNob3cgaWYgdXNlciBoYXMgZXhpc3RpbmcgY29uZmlndXJhdGlvblxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFNldHRpbmdzQ2hlY2tTdGVwIHtcclxuXHRwcml2YXRlIHN0YXRpYyBzZWxlY3RlZEFjdGlvbjogXCJ3aXphcmRcIiB8IFwia2VlcFwiIHwgbnVsbCA9IG51bGw7XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbmRlciB0aGUgc2V0dGluZ3MgY2hlY2sgc3RlcFxyXG5cdCAqL1xyXG5cdHN0YXRpYyByZW5kZXIoXHJcblx0XHRoZWFkZXJFbDogSFRNTEVsZW1lbnQsXHJcblx0XHRjb250ZW50RWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0Y29udHJvbGxlcjogT25ib2FyZGluZ0NvbnRyb2xsZXJcclxuXHQpIHtcclxuXHRcdC8vIENsZWFyXHJcblx0XHRoZWFkZXJFbC5lbXB0eSgpO1xyXG5cdFx0Y29udGVudEVsLmVtcHR5KCk7XHJcblxyXG5cdFx0Ly8gUmVzZXQgc2VsZWN0aW9uXHJcblx0XHR0aGlzLnNlbGVjdGVkQWN0aW9uID0gbnVsbDtcclxuXHJcblx0XHRjb25zdCBzdGF0ZSA9IGNvbnRyb2xsZXIuZ2V0U3RhdGUoKTtcclxuXHJcblx0XHQvLyBIZWFkZXIgLSBmcmllbmRseSBhbmQgZGlyZWN0XHJcblx0XHRoZWFkZXJFbC5jcmVhdGVFbChcImgxXCIsIHsgdGV4dDogdChcIllvdSd2ZSBDdXN0b21pemVkIFRhc2sgR2VuaXVzXCIpIH0pO1xyXG5cdFx0aGVhZGVyRWwuY3JlYXRlRWwoXCJwXCIsIHtcclxuXHRcdFx0dGV4dDogdChcclxuXHRcdFx0XHRcIkdyZWF0ISBMZXQncyBkZWNpZGUgaG93IHRvIHByb2NlZWQgd2l0aCB5b3VyIGV4aXN0aW5nIHNldHVwLlwiXHJcblx0XHRcdCksXHJcblx0XHRcdGNsczogXCJvbmJvYXJkaW5nLXN1YnRpdGxlXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBNYWluIGNvbnRlbnQgLSB0d28tY29sdW1uIGxheW91dFxyXG5cdFx0Y29uc3QgbWFpbkNvbnRlbnQgPSBjb250ZW50RWwuY3JlYXRlRGl2KFwic2V0dGluZ3MtY2hlY2stY29udGVudFwiKTtcclxuXHJcblx0XHQvLyBMZWZ0OiBDdXJyZW50IGNvbmZpZ3VyYXRpb24gc3VtbWFyeSBjYXJkXHJcblx0XHRjb25zdCBjdXJyZW50Q29uZmlnQ2FyZCA9IG1haW5Db250ZW50LmNyZWF0ZURpdihcclxuXHRcdFx0XCJzZXR0aW5ncy1jaGVjay1jdXJyZW50LWNhcmRcIlxyXG5cdFx0KTtcclxuXHJcblx0XHRjb25zdCBjdXJyZW50SGVhZGVyID0gY3VycmVudENvbmZpZ0NhcmQuY3JlYXRlRGl2KFxyXG5cdFx0XHRcInNldHRpbmdzLWNoZWNrLWNhcmQtaGVhZGVyXCJcclxuXHRcdCk7XHJcblx0XHRjb25zdCBjdXJyZW50SWNvbiA9IGN1cnJlbnRIZWFkZXIuY3JlYXRlRGl2KFwiY2hlY2staGVhZGVyLWljb25cIik7XHJcblx0XHRzZXRJY29uKGN1cnJlbnRJY29uLCBcImNoZWNrLWNpcmNsZVwiKTtcclxuXHJcblx0XHRjb25zdCBjdXJyZW50VGl0bGUgPSBjdXJyZW50SGVhZGVyLmNyZWF0ZURpdihcImNoZWNrLWhlYWRlci10aXRsZVwiKTtcclxuXHRcdGN1cnJlbnRUaXRsZS5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogdChcIllvdXIgQ3VycmVudCBTZXR1cFwiKSB9KTtcclxuXHRcdEJhZGdlLmNyZWF0ZShjdXJyZW50VGl0bGUsIHQoXCJBY3RpdmVcIiksIHsgdmFyaWFudDogXCJzdWNjZXNzXCIgfSk7XHJcblxyXG5cdFx0Y29uc3QgY3VycmVudEJvZHkgPSBjdXJyZW50Q29uZmlnQ2FyZC5jcmVhdGVEaXYoXHJcblx0XHRcdFwic2V0dGluZ3MtY2hlY2stY2FyZC1ib2R5XCJcclxuXHRcdCk7XHJcblx0XHRjdXJyZW50Qm9keS5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFwiWW91J3ZlIG1hZGUgdGhlIGZvbGxvd2luZyBjdXN0b21pemF0aW9uczpcIiksXHJcblx0XHRcdGNsczogXCJjaGVjay1jYXJkLWRlc2NcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFJlbmRlciBjaGFuZ2VzIGFzIGVsZWdhbnQgbGlzdFxyXG5cdFx0Y29uc3QgY2hhbmdlc0xpc3QgPSBjdXJyZW50Qm9keS5jcmVhdGVFbChcInVsXCIsIHtcclxuXHRcdFx0Y2xzOiBcInNldHRpbmdzLWNoZWNrLWNoYW5nZXMtbGlzdFwiLFxyXG5cdFx0fSk7XHJcblx0XHRzdGF0ZS5jaGFuZ2VzU3VtbWFyeS5mb3JFYWNoKChjaGFuZ2UpID0+IHtcclxuXHRcdFx0Y29uc3QgaXRlbSA9IGNoYW5nZXNMaXN0LmNyZWF0ZUVsKFwibGlcIik7XHJcblx0XHRcdGNvbnN0IGNoZWNrSWNvbiA9IGl0ZW0uY3JlYXRlU3BhbihcImNoYW5nZS1jaGVjay1pY29uXCIpO1xyXG5cdFx0XHRzZXRJY29uKGNoZWNrSWNvbiwgXCJjaGVja1wiKTtcclxuXHRcdFx0aXRlbS5jcmVhdGVTcGFuKHsgdGV4dDogY2hhbmdlIH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gUmlnaHQ6IFR3byBhY3Rpb24gY2FyZHNcclxuXHRcdGNvbnN0IGFjdGlvbnNDb250YWluZXIgPSBtYWluQ29udGVudC5jcmVhdGVEaXYoXHJcblx0XHRcdFwic2V0dGluZ3MtY2hlY2stYWN0aW9uc1wiXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIEFjdGlvbiAyOiBLZWVwIGN1cnJlbnQgc2V0dGluZ3MgKHNlY29uZGFyeSlcclxuXHRcdGNvbnN0IGtlZXBDYXJkID0gYWN0aW9uc0NvbnRhaW5lci5jcmVhdGVEaXYoXHJcblx0XHRcdFwic2V0dGluZ3MtY2hlY2stYWN0aW9uLWNhcmQgc2V0dGluZ3MtY2hlY2stYWN0aW9uLWtlZXBcIlxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBBY3Rpb24gMTogQ29udGludWUgd2l0aCB3aXphcmQgKHByb21pbmVudClcclxuXHRcdGNvbnN0IHdpemFyZENhcmQgPSBhY3Rpb25zQ29udGFpbmVyLmNyZWF0ZURpdihcclxuXHRcdFx0XCJzZXR0aW5ncy1jaGVjay1hY3Rpb24tY2FyZCBzZXR0aW5ncy1jaGVjay1hY3Rpb24td2l6YXJkXCJcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8g5YWI5riy5p+T5Y2h54mH5YaF5a6577yM5YaN57uR5a6a5LqL5Lu277yM6YG/5YWNIGtlZXBDYXJkL3dpemFyZENhcmQg5pyq5a6a5LmJXHJcblx0XHRjb25zdCB3aXphcmRIZWFkZXIgPSB3aXphcmRDYXJkLmNyZWF0ZURpdihcImFjdGlvbi1jYXJkLWhlYWRlclwiKTtcclxuXHRcdGNvbnN0IHdpemFyZEljb24gPSB3aXphcmRIZWFkZXIuY3JlYXRlRGl2KFwiYWN0aW9uLWNhcmQtaWNvblwiKTtcclxuXHRcdHNldEljb24od2l6YXJkSWNvbiwgXCJ3YW5kLTJcIik7XHJcblxyXG5cdFx0Y29uc3Qgd2l6YXJkQ29udGVudCA9IHdpemFyZENhcmQuY3JlYXRlRGl2KFwiYWN0aW9uLWNhcmQtY29udGVudFwiKTtcclxuXHRcdHdpemFyZENvbnRlbnQuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IHQoXCJTdGFydCBTZXR1cCBXaXphcmRcIikgfSk7XHJcblx0XHR3aXphcmRDb250ZW50LmNyZWF0ZUVsKFwicFwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXHJcblx0XHRcdFx0XCJHZXQgcGVyc29uYWxpemVkIHJlY29tbWVuZGF0aW9ucyBhbmQgZGlzY292ZXIgZmVhdHVyZXMgeW91IG1pZ2h0IGhhdmUgbWlzc2VkXCJcclxuXHRcdFx0KSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IHdpemFyZEZlYXR1cmVzID0gd2l6YXJkQ29udGVudC5jcmVhdGVFbChcInVsXCIsIHtcclxuXHRcdFx0Y2xzOiBcImFjdGlvbi1jYXJkLWZlYXR1cmVzXCIsXHJcblx0XHR9KTtcclxuXHRcdFtcclxuXHRcdFx0dChcIlBlcnNvbmFsaXplZCBjb25maWd1cmF0aW9uXCIpLFxyXG5cdFx0XHR0KFwiRmVhdHVyZSBkaXNjb3ZlcnlcIiksXHJcblx0XHRcdHQoXCJRdWljayBzZXR1cCBndWlkZVwiKSxcclxuXHRcdF0uZm9yRWFjaCgoZmVhdHVyZSkgPT4ge1xyXG5cdFx0XHRjb25zdCBpdGVtID0gd2l6YXJkRmVhdHVyZXMuY3JlYXRlRWwoXCJsaVwiKTtcclxuXHRcdFx0Y29uc3QgaWNvbiA9IGl0ZW0uY3JlYXRlU3BhbihcImZlYXR1cmUtaWNvblwiKTtcclxuXHRcdFx0c2V0SWNvbihpY29uLCBcImFycm93LXJpZ2h0XCIpO1xyXG5cdFx0XHRpdGVtLmNyZWF0ZVNwYW4oeyB0ZXh0OiBmZWF0dXJlIH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3Qga2VlcEhlYWRlciA9IGtlZXBDYXJkLmNyZWF0ZURpdihcImFjdGlvbi1jYXJkLWhlYWRlclwiKTtcclxuXHRcdGNvbnN0IGtlZXBJY29uID0ga2VlcEhlYWRlci5jcmVhdGVEaXYoXCJhY3Rpb24tY2FyZC1pY29uXCIpO1xyXG5cdFx0c2V0SWNvbihrZWVwSWNvbiwgXCJzaGllbGQtY2hlY2tcIik7XHJcblxyXG5cdFx0Y29uc3Qga2VlcENvbnRlbnQgPSBrZWVwQ2FyZC5jcmVhdGVEaXYoXCJhY3Rpb24tY2FyZC1jb250ZW50XCIpO1xyXG5cdFx0a2VlcENvbnRlbnQuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IHQoXCJLZWVwIEN1cnJlbnQgU2V0dGluZ3NcIikgfSk7XHJcblx0XHRrZWVwQ29udGVudC5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFxyXG5cdFx0XHRcdFwiQ29udGludWUgd2l0aCB5b3VyIGV4aXN0aW5nIGNvbmZpZ3VyYXRpb24uIFlvdSBjYW4gYWx3YXlzIGFjY2VzcyB0aGUgd2l6YXJkIGxhdGVyIGZyb20gc2V0dGluZ3MuXCJcclxuXHRcdFx0KSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IGtlZXBOb3RlID0ga2VlcENvbnRlbnQuY3JlYXRlRGl2KFwiYWN0aW9uLWNhcmQtbm90ZVwiKTtcclxuXHRcdGNvbnN0IG5vdGVJY29uID0ga2VlcE5vdGUuY3JlYXRlU3BhbihcIm5vdGUtaWNvblwiKTtcclxuXHRcdHNldEljb24obm90ZUljb24sIFwiaW5mb1wiKTtcclxuXHRcdGtlZXBOb3RlLmNyZWF0ZVNwYW4oe1xyXG5cdFx0XHR0ZXh0OiB0KFwiWW91ciBjdXN0b21pemF0aW9ucyB3aWxsIGJlIHByZXNlcnZlZFwiKSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIOS6i+S7tue7keWumuWJje+8jOehruS/neS4pOS4quWNoeeJh+mDveW3sua4suafk1xyXG5cdFx0d2l6YXJkQ2FyZC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRpZiAodGhpcy5zZWxlY3RlZEFjdGlvbiA9PT0gXCJ3aXphcmRcIikgcmV0dXJuO1xyXG5cdFx0XHR0aGlzLnNlbGVjdGVkQWN0aW9uID0gXCJ3aXphcmRcIjtcclxuXHRcdFx0dGhpcy51cGRhdGVDYXJkU2VsZWN0aW9uKHdpemFyZENhcmQsIGtlZXBDYXJkKTtcclxuXHRcdFx0Y29udHJvbGxlci51cGRhdGVTdGF0ZSh7IHNldHRpbmdzQ2hlY2tBY3Rpb246IFwid2l6YXJkXCIgfSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRrZWVwQ2FyZC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRpZiAodGhpcy5zZWxlY3RlZEFjdGlvbiA9PT0gXCJrZWVwXCIpIHJldHVybjtcclxuXHRcdFx0dGhpcy5zZWxlY3RlZEFjdGlvbiA9IFwia2VlcFwiO1xyXG5cdFx0XHR0aGlzLnVwZGF0ZUNhcmRTZWxlY3Rpb24oa2VlcENhcmQsIHdpemFyZENhcmQpO1xyXG5cdFx0XHRjb250cm9sbGVyLnVwZGF0ZVN0YXRlKHsgc2V0dGluZ3NDaGVja0FjdGlvbjogXCJrZWVwXCIgfSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBjYXJkIHNlbGVjdGlvbiB2aXN1YWwgc3RhdGVcclxuXHQgKi9cclxuXHRwcml2YXRlIHN0YXRpYyB1cGRhdGVDYXJkU2VsZWN0aW9uKFxyXG5cdFx0c2VsZWN0ZWRDYXJkOiBIVE1MRWxlbWVudCxcclxuXHRcdG90aGVyQ2FyZDogSFRNTEVsZW1lbnRcclxuXHQpIHtcclxuXHRcdC8vIEFkZCBzZWxlY3RlZCBjbGFzcyB0byBjbGlja2VkIGNhcmRcclxuXHRcdHNlbGVjdGVkQ2FyZC5hZGRDbGFzcyhcImlzLXNlbGVjdGVkXCIpO1xyXG5cclxuXHRcdC8vIFJlbW92ZSBzZWxlY3RlZCBjbGFzcyBmcm9tIG90aGVyIGNhcmRcclxuXHRcdG90aGVyQ2FyZC5yZW1vdmVDbGFzcyhcImlzLXNlbGVjdGVkXCIpO1xyXG5cdH1cclxufVxyXG4iXX0=