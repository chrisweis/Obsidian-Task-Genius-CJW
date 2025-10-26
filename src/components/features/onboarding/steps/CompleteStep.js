import { t } from "@/translations/helper";
import { setIcon } from "obsidian";
/**
 * Complete Step - Setup complete, show summary and next steps
 */
export class CompleteStep {
    /**
     * Render the complete step
     */
    static render(headerEl, contentEl, controller) {
        // Clear
        headerEl.empty();
        contentEl.empty();
        const config = controller.getState().selectedConfig;
        if (!config)
            return;
        // Header
        headerEl.createEl("h1", { text: t("Task Genius is ready!") });
        headerEl.createEl("p", {
            text: t("You're all set to start managing your tasks"),
            cls: "onboarding-subtitle",
        });
        // Success section
        const successSection = contentEl.createDiv("completion-success");
        const successIcon = successSection.createDiv("success-icon");
        successIcon.setText("🎉");
        successSection.createEl("h2", { text: t("Congratulations!") });
        successSection.createEl("p", {
            text: t("Task Genius has been configured with your selected preferences"),
            cls: "success-message",
        });
        // Config summary
        this.renderConfigSummary(contentEl, config);
        // Quick start guide
        this.renderQuickStart(contentEl, config);
        // Resources
        this.renderResources(contentEl);
    }
    /**
     * Render configuration summary
     */
    static renderConfigSummary(container, config) {
        const section = container.createDiv("completion-summary");
        section.createEl("h3", { text: t("Your Configuration") });
        const card = section.createDiv("config-summary-card");
        const header = card.createDiv("config-header");
        const icon = header.createDiv("config-icon");
        setIcon(icon, this.getConfigIcon(config.mode));
        header.createDiv("config-name").setText(config.name);
        const desc = card.createDiv("config-description");
        desc.setText(config.description);
    }
    /**
     * Render quick start guide
     */
    static renderQuickStart(container, config) {
        const section = container.createDiv("quick-start-section");
        section.createEl("h3", { text: t("Quick Start Guide") });
        const steps = section.createDiv("quick-start-steps");
        const quickSteps = this.getQuickStartSteps(config.mode);
        quickSteps.forEach((step, index) => {
            const stepEl = steps.createDiv("quick-start-step");
            stepEl.createDiv("step-number").setText((index + 1).toString());
            stepEl.createDiv("step-content").setText(step);
        });
    }
    /**
     * Render resources
     */
    static renderResources(container) {
        const section = container.createDiv("resources-section");
        section.createEl("h3", { text: t("Helpful Resources") });
        const list = section.createDiv("resources-list");
        const resources = [
            {
                icon: "book-open",
                title: t("Documentation"),
                desc: t("Complete guide to all features"),
                url: "https://taskgenius.md",
            },
            {
                icon: "message-circle",
                title: t("Community"),
                desc: t("Get help and share tips"),
                url: "https://discord.gg/ARR2rHHX6b",
            },
            {
                icon: "settings",
                title: t("Settings"),
                desc: t("Customize Task Genius"),
                action: "open-settings",
            },
        ];
        resources.forEach((r) => {
            const item = list.createDiv("resource-item");
            const icon = item.createDiv("resource-icon");
            setIcon(icon, r.icon);
            const content = item.createDiv("resource-content");
            content.createEl("h4", { text: r.title });
            content.createEl("p", { text: r.desc });
            if (r.url) {
                item.addEventListener("click", () => {
                    window.open(r.url, "_blank");
                });
                item.addClass("resource-clickable");
            }
            else if (r.action === "open-settings") {
                item.addEventListener("click", () => {
                    // Signal main plugin to open settings so we keep UI logic here.
                    const event = new CustomEvent("task-genius-open-settings");
                    document.dispatchEvent(event);
                });
                item.addClass("resource-clickable");
            }
        });
    }
    /**
     * Get quick start steps based on mode
     */
    static getQuickStartSteps(mode) {
        switch (mode) {
            case "beginner":
                return [
                    t("Click the Task Genius icon in the left sidebar"),
                    t("Start with the Inbox view to see all your tasks"),
                    t("Use quick capture panel to quickly add your first task"),
                    t("Try the Forecast view to see tasks by date"),
                ];
            case "advanced":
                return [
                    t("Open Task Genius and explore the available views"),
                    t("Set up a project using the Projects view"),
                    t("Try the Kanban board for visual task management"),
                    t("Use workflow stages to track task progress"),
                ];
            case "power":
                return [
                    t("Explore all available views and their configurations"),
                    t("Set up complex workflows for your projects"),
                    t("Configure habits and rewards to stay motivated"),
                    t("Integrate with external calendars and systems"),
                ];
            default:
                return [
                    t("Open Task Genius from the left sidebar"),
                    t("Create your first task"),
                    t("Explore the different views available"),
                    t("Customize settings as needed"),
                ];
        }
    }
    /**
     * Get config icon
     */
    static getConfigIcon(mode) {
        return this.ICON_MAP[mode] || "clipboard-list";
    }
}
CompleteStep.ICON_MAP = {
    beginner: "edit-3",
    advanced: "settings",
    power: "zap",
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29tcGxldGVTdGVwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQ29tcGxldGVTdGVwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUMxQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBSW5DOztHQUVHO0FBQ0gsTUFBTSxPQUFPLFlBQVk7SUFPeEI7O09BRUc7SUFDSCxNQUFNLENBQUMsTUFBTSxDQUNaLFFBQXFCLEVBQ3JCLFNBQXNCLEVBQ3RCLFVBQWdDO1FBRWhDLFFBQVE7UUFDUixRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDakIsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRWxCLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxjQUFjLENBQUM7UUFDcEQsSUFBSSxDQUFDLE1BQU07WUFBRSxPQUFPO1FBRXBCLFNBQVM7UUFDVCxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsdUJBQXVCLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDOUQsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7WUFDdEIsSUFBSSxFQUFFLENBQUMsQ0FBQyw2Q0FBNkMsQ0FBQztZQUN0RCxHQUFHLEVBQUUscUJBQXFCO1NBQzFCLENBQUMsQ0FBQztRQUVILGtCQUFrQjtRQUNsQixNQUFNLGNBQWMsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDakUsTUFBTSxXQUFXLEdBQUcsY0FBYyxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUM3RCxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTFCLGNBQWMsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxF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LE9BQU87Z0JBQ1gsT0FBTztvQkFDTixDQUFDLENBQUMsc0RBQXNELENBQUM7b0JBQ3pELENBQUMsQ0FBQyw0Q0FBNEMsQ0FBQztvQkFDL0MsQ0FBQyxDQUFDLGdEQUFnRCxDQUFDO29CQUNuRCxDQUFDLENBQUMsK0NBQStDLENBQUM7aUJBQ2xELENBQUM7WUFDSDtnQkFDQyxPQUFPO29CQUNOLENBQUMsQ0FBQyx3Q0FBd0MsQ0FBQztvQkFDM0MsQ0FBQyxDQUFDLHdCQUF3QixDQUFDO29CQUMzQixDQUFDLENBQUMsdUNBQXVDLENBQUM7b0JBQzFDLENBQUMsQ0FBQyw4QkFBOEIsQ0FBQztpQkFDakMsQ0FBQztTQUNIO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0ssTUFBTSxDQUFDLGFBQWEsQ0FBQyxJQUFZO1FBQ3hDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQztJQUNoRCxDQUFDOztBQTNMdUIscUJBQVEsR0FBMkI7SUFDMUQsUUFBUSxFQUFFLFFBQVE7SUFDbEIsUUFBUSxFQUFFLFVBQVU7SUFDcEIsS0FBSyxFQUFFLEtBQUs7Q0FDWixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHsgc2V0SWNvbiB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBPbmJvYXJkaW5nQ29udHJvbGxlciB9IGZyb20gXCIuLi9PbmJvYXJkaW5nQ29udHJvbGxlclwiO1xyXG5pbXBvcnQgeyBPbmJvYXJkaW5nQ29uZmlnIH0gZnJvbSBcIkAvbWFuYWdlcnMvb25ib2FyZGluZy1tYW5hZ2VyXCI7XHJcblxyXG4vKipcclxuICogQ29tcGxldGUgU3RlcCAtIFNldHVwIGNvbXBsZXRlLCBzaG93IHN1bW1hcnkgYW5kIG5leHQgc3RlcHNcclxuICovXHJcbmV4cG9ydCBjbGFzcyBDb21wbGV0ZVN0ZXAge1xyXG5cdHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IElDT05fTUFQOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xyXG5cdFx0YmVnaW5uZXI6IFwiZWRpdC0zXCIsXHJcblx0XHRhZHZhbmNlZDogXCJzZXR0aW5nc1wiLFxyXG5cdFx0cG93ZXI6IFwiemFwXCIsXHJcblx0fTtcclxuXHJcblx0LyoqXHJcblx0ICogUmVuZGVyIHRoZSBjb21wbGV0ZSBzdGVwXHJcblx0ICovXHJcblx0c3RhdGljIHJlbmRlcihcclxuXHRcdGhlYWRlckVsOiBIVE1MRWxlbWVudCxcclxuXHRcdGNvbnRlbnRFbDogSFRNTEVsZW1lbnQsXHJcblx0XHRjb250cm9sbGVyOiBPbmJvYXJkaW5nQ29udHJvbGxlclxyXG5cdCkge1xyXG5cdFx0Ly8gQ2xlYXJcclxuXHRcdGhlYWRlckVsLmVtcHR5KCk7XHJcblx0XHRjb250ZW50RWwuZW1wdHkoKTtcclxuXHJcblx0XHRjb25zdCBjb25maWcgPSBjb250cm9sbGVyLmdldFN0YXRlKCkuc2VsZWN0ZWRDb25maWc7XHJcblx0XHRpZiAoIWNvbmZpZykgcmV0dXJuO1xyXG5cclxuXHRcdC8vIEhlYWRlclxyXG5cdFx0aGVhZGVyRWwuY3JlYXRlRWwoXCJoMVwiLCB7IHRleHQ6IHQoXCJUYXNrIEdlbml1cyBpcyByZWFkeSFcIikgfSk7XHJcblx0XHRoZWFkZXJFbC5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFwiWW91J3JlIGFsbCBzZXQgdG8gc3RhcnQgbWFuYWdpbmcgeW91ciB0YXNrc1wiKSxcclxuXHRcdFx0Y2xzOiBcIm9uYm9hcmRpbmctc3VidGl0bGVcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFN1Y2Nlc3Mgc2VjdGlvblxyXG5cdFx0Y29uc3Qgc3VjY2Vzc1NlY3Rpb24gPSBjb250ZW50RWwuY3JlYXRlRGl2KFwiY29tcGxldGlvbi1zdWNjZXNzXCIpO1xyXG5cdFx0Y29uc3Qgc3VjY2Vzc0ljb24gPSBzdWNjZXNzU2VjdGlvbi5jcmVhdGVEaXYoXCJzdWNjZXNzLWljb25cIik7XHJcblx0XHRzdWNjZXNzSWNvbi5zZXRUZXh0KFwi8J+OiVwiKTtcclxuXHJcblx0XHRzdWNjZXNzU2VjdGlvbi5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogdChcIkNvbmdyYXR1bGF0aW9ucyFcIikgfSk7XHJcblx0XHRzdWNjZXNzU2VjdGlvbi5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFxyXG5cdFx0XHRcdFwiVGFzayBHZW5pdXMgaGFzIGJlZW4gY29uZmlndXJlZCB3aXRoIHlvdXIgc2VsZWN0ZWQgcHJlZmVyZW5jZXNcIlxyXG5cdFx0XHQpLFxyXG5cdFx0XHRjbHM6IFwic3VjY2Vzcy1tZXNzYWdlXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDb25maWcgc3VtbWFyeVxyXG5cdFx0dGhpcy5yZW5kZXJDb25maWdTdW1tYXJ5KGNvbnRlbnRFbCwgY29uZmlnKTtcclxuXHJcblx0XHQvLyBRdWljayBzdGFydCBndWlkZVxyXG5cdFx0dGhpcy5yZW5kZXJRdWlja1N0YXJ0KGNvbnRlbnRFbCwgY29uZmlnKTtcclxuXHJcblx0XHQvLyBSZXNvdXJjZXNcclxuXHRcdHRoaXMucmVuZGVyUmVzb3VyY2VzKGNvbnRlbnRFbCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW5kZXIgY29uZmlndXJhdGlvbiBzdW1tYXJ5XHJcblx0ICovXHJcblx0cHJpdmF0ZSBzdGF0aWMgcmVuZGVyQ29uZmlnU3VtbWFyeShcclxuXHRcdGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXHJcblx0XHRjb25maWc6IE9uYm9hcmRpbmdDb25maWdcclxuXHQpIHtcclxuXHRcdGNvbnN0IHNlY3Rpb24gPSBjb250YWluZXIuY3JlYXRlRGl2KFwiY29tcGxldGlvbi1zdW1tYXJ5XCIpO1xyXG5cdFx0c2VjdGlvbi5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogdChcIllvdXIgQ29uZmlndXJhdGlvblwiKSB9KTtcclxuXHJcblx0XHRjb25zdCBjYXJkID0gc2VjdGlvbi5jcmVhdGVEaXYoXCJjb25maWctc3VtbWFyeS1jYXJkXCIpO1xyXG5cclxuXHRcdGNvbnN0IGhlYWRlciA9IGNhcmQuY3JlYXRlRGl2KFwiY29uZmlnLWhlYWRlclwiKTtcclxuXHRcdGNvbnN0IGljb24gPSBoZWFkZXIuY3JlYXRlRGl2KFwiY29uZmlnLWljb25cIik7XHJcblx0XHRzZXRJY29uKGljb24sIHRoaXMuZ2V0Q29uZmlnSWNvbihjb25maWcubW9kZSkpO1xyXG5cdFx0aGVhZGVyLmNyZWF0ZURpdihcImNvbmZpZy1uYW1lXCIpLnNldFRleHQoY29uZmlnLm5hbWUpO1xyXG5cclxuXHRcdGNvbnN0IGRlc2MgPSBjYXJkLmNyZWF0ZURpdihcImNvbmZpZy1kZXNjcmlwdGlvblwiKTtcclxuXHRcdGRlc2Muc2V0VGV4dChjb25maWcuZGVzY3JpcHRpb24pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVuZGVyIHF1aWNrIHN0YXJ0IGd1aWRlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBzdGF0aWMgcmVuZGVyUXVpY2tTdGFydChcclxuXHRcdGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXHJcblx0XHRjb25maWc6IE9uYm9hcmRpbmdDb25maWdcclxuXHQpIHtcclxuXHRcdGNvbnN0IHNlY3Rpb24gPSBjb250YWluZXIuY3JlYXRlRGl2KFwicXVpY2stc3RhcnQtc2VjdGlvblwiKTtcclxuXHRcdHNlY3Rpb24uY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IHQoXCJRdWljayBTdGFydCBHdWlkZVwiKSB9KTtcclxuXHJcblx0XHRjb25zdCBzdGVwcyA9IHNlY3Rpb24uY3JlYXRlRGl2KFwicXVpY2stc3RhcnQtc3RlcHNcIik7XHJcblxyXG5cdFx0Y29uc3QgcXVpY2tTdGVwcyA9IHRoaXMuZ2V0UXVpY2tTdGFydFN0ZXBzKGNvbmZpZy5tb2RlKTtcclxuXHRcdHF1aWNrU3RlcHMuZm9yRWFjaCgoc3RlcCwgaW5kZXgpID0+IHtcclxuXHRcdFx0Y29uc3Qgc3RlcEVsID0gc3RlcHMuY3JlYXRlRGl2KFwicXVpY2stc3RhcnQtc3RlcFwiKTtcclxuXHRcdFx0c3RlcEVsLmNyZWF0ZURpdihcInN0ZXAtbnVtYmVyXCIpLnNldFRleHQoKGluZGV4ICsgMSkudG9TdHJpbmcoKSk7XHJcblx0XHRcdHN0ZXBFbC5jcmVhdGVEaXYoXCJzdGVwLWNvbnRlbnRcIikuc2V0VGV4dChzdGVwKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVuZGVyIHJlc291cmNlc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgc3RhdGljIHJlbmRlclJlc291cmNlcyhjb250YWluZXI6IEhUTUxFbGVtZW50KSB7XHJcblx0XHRjb25zdCBzZWN0aW9uID0gY29udGFpbmVyLmNyZWF0ZURpdihcInJlc291cmNlcy1zZWN0aW9uXCIpO1xyXG5cdFx0c2VjdGlvbi5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogdChcIkhlbHBmdWwgUmVzb3VyY2VzXCIpIH0pO1xyXG5cclxuXHRcdGNvbnN0IGxpc3QgPSBzZWN0aW9uLmNyZWF0ZURpdihcInJlc291cmNlcy1saXN0XCIpO1xyXG5cclxuXHRcdGNvbnN0IHJlc291cmNlcyA9IFtcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGljb246IFwiYm9vay1vcGVuXCIsXHJcblx0XHRcdFx0dGl0bGU6IHQoXCJEb2N1bWVudGF0aW9uXCIpLFxyXG5cdFx0XHRcdGRlc2M6IHQoXCJDb21wbGV0ZSBndWlkZSB0byBhbGwgZmVhdHVyZXNcIiksXHJcblx0XHRcdFx0dXJsOiBcImh0dHBzOi8vdGFza2dlbml1cy5tZFwiLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0aWNvbjogXCJtZXNzYWdlLWNpcmNsZVwiLFxyXG5cdFx0XHRcdHRpdGxlOiB0KFwiQ29tbXVuaXR5XCIpLFxyXG5cdFx0XHRcdGRlc2M6IHQoXCJHZXQgaGVscCBhbmQgc2hhcmUgdGlwc1wiKSxcclxuXHRcdFx0XHR1cmw6IFwiaHR0cHM6Ly9kaXNjb3JkLmdnL0FSUjJySEhYNmJcIixcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGljb246IFwic2V0dGluZ3NcIixcclxuXHRcdFx0XHR0aXRsZTogdChcIlNldHRpbmdzXCIpLFxyXG5cdFx0XHRcdGRlc2M6IHQoXCJDdXN0b21pemUgVGFzayBHZW5pdXNcIiksXHJcblx0XHRcdFx0YWN0aW9uOiBcIm9wZW4tc2V0dGluZ3NcIixcclxuXHRcdFx0fSxcclxuXHRcdF07XHJcblxyXG5cdFx0cmVzb3VyY2VzLmZvckVhY2goKHIpID0+IHtcclxuXHRcdFx0Y29uc3QgaXRlbSA9IGxpc3QuY3JlYXRlRGl2KFwicmVzb3VyY2UtaXRlbVwiKTtcclxuXHRcdFx0Y29uc3QgaWNvbiA9IGl0ZW0uY3JlYXRlRGl2KFwicmVzb3VyY2UtaWNvblwiKTtcclxuXHRcdFx0c2V0SWNvbihpY29uLCByLmljb24pO1xyXG5cdFx0XHRjb25zdCBjb250ZW50ID0gaXRlbS5jcmVhdGVEaXYoXCJyZXNvdXJjZS1jb250ZW50XCIpO1xyXG5cdFx0XHRjb250ZW50LmNyZWF0ZUVsKFwiaDRcIiwgeyB0ZXh0OiByLnRpdGxlIH0pO1xyXG5cdFx0XHRjb250ZW50LmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IHIuZGVzYyB9KTtcclxuXHJcblx0XHRcdGlmIChyLnVybCkge1xyXG5cdFx0XHRcdGl0ZW0uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0XHRcdHdpbmRvdy5vcGVuKHIudXJsLCBcIl9ibGFua1wiKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRpdGVtLmFkZENsYXNzKFwicmVzb3VyY2UtY2xpY2thYmxlXCIpO1xyXG5cdFx0XHR9IGVsc2UgaWYgKHIuYWN0aW9uID09PSBcIm9wZW4tc2V0dGluZ3NcIikge1xyXG5cdFx0XHRcdGl0ZW0uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0XHRcdC8vIFNpZ25hbCBtYWluIHBsdWdpbiB0byBvcGVuIHNldHRpbmdzIHNvIHdlIGtlZXAgVUkgbG9naWMgaGVyZS5cclxuXHRcdFx0XHRcdGNvbnN0IGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KFwidGFzay1nZW5pdXMtb3Blbi1zZXR0aW5nc1wiKTtcclxuXHRcdFx0XHRcdGRvY3VtZW50LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGl0ZW0uYWRkQ2xhc3MoXCJyZXNvdXJjZS1jbGlja2FibGVcIik7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHF1aWNrIHN0YXJ0IHN0ZXBzIGJhc2VkIG9uIG1vZGVcclxuXHQgKi9cclxuXHRwcml2YXRlIHN0YXRpYyBnZXRRdWlja1N0YXJ0U3RlcHMobW9kZTogc3RyaW5nKTogc3RyaW5nW10ge1xyXG5cdFx0c3dpdGNoIChtb2RlKSB7XHJcblx0XHRcdGNhc2UgXCJiZWdpbm5lclwiOlxyXG5cdFx0XHRcdHJldHVybiBbXHJcblx0XHRcdFx0XHR0KFwiQ2xpY2sgdGhlIFRhc2sgR2VuaXVzIGljb24gaW4gdGhlIGxlZnQgc2lkZWJhclwiKSxcclxuXHRcdFx0XHRcdHQoXCJTdGFydCB3aXRoIHRoZSBJbmJveCB2aWV3IHRvIHNlZSBhbGwgeW91ciB0YXNrc1wiKSxcclxuXHRcdFx0XHRcdHQoXCJVc2UgcXVpY2sgY2FwdHVyZSBwYW5lbCB0byBxdWlja2x5IGFkZCB5b3VyIGZpcnN0IHRhc2tcIiksXHJcblx0XHRcdFx0XHR0KFwiVHJ5IHRoZSBGb3JlY2FzdCB2aWV3IHRvIHNlZSB0YXNrcyBieSBkYXRlXCIpLFxyXG5cdFx0XHRcdF07XHJcblx0XHRcdGNhc2UgXCJhZHZhbmNlZFwiOlxyXG5cdFx0XHRcdHJldHVybiBbXHJcblx0XHRcdFx0XHR0KFwiT3BlbiBUYXNrIEdlbml1cyBhbmQgZXhwbG9yZSB0aGUgYXZhaWxhYmxlIHZpZXdzXCIpLFxyXG5cdFx0XHRcdFx0dChcIlNldCB1cCBhIHByb2plY3QgdXNpbmcgdGhlIFByb2plY3RzIHZpZXdcIiksXHJcblx0XHRcdFx0XHR0KFwiVHJ5IHRoZSBLYW5iYW4gYm9hcmQgZm9yIHZpc3VhbCB0YXNrIG1hbmFnZW1lbnRcIiksXHJcblx0XHRcdFx0XHR0KFwiVXNlIHdvcmtmbG93IHN0YWdlcyB0byB0cmFjayB0YXNrIHByb2dyZXNzXCIpLFxyXG5cdFx0XHRcdF07XHJcblx0XHRcdGNhc2UgXCJwb3dlclwiOlxyXG5cdFx0XHRcdHJldHVybiBbXHJcblx0XHRcdFx0XHR0KFwiRXhwbG9yZSBhbGwgYXZhaWxhYmxlIHZpZXdzIGFuZCB0aGVpciBjb25maWd1cmF0aW9uc1wiKSxcclxuXHRcdFx0XHRcdHQoXCJTZXQgdXAgY29tcGxleCB3b3JrZmxvd3MgZm9yIHlvdXIgcHJvamVjdHNcIiksXHJcblx0XHRcdFx0XHR0KFwiQ29uZmlndXJlIGhhYml0cyBhbmQgcmV3YXJkcyB0byBzdGF5IG1vdGl2YXRlZFwiKSxcclxuXHRcdFx0XHRcdHQoXCJJbnRlZ3JhdGUgd2l0aCBleHRlcm5hbCBjYWxlbmRhcnMgYW5kIHN5c3RlbXNcIiksXHJcblx0XHRcdFx0XTtcclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRyZXR1cm4gW1xyXG5cdFx0XHRcdFx0dChcIk9wZW4gVGFzayBHZW5pdXMgZnJvbSB0aGUgbGVmdCBzaWRlYmFyXCIpLFxyXG5cdFx0XHRcdFx0dChcIkNyZWF0ZSB5b3VyIGZpcnN0IHRhc2tcIiksXHJcblx0XHRcdFx0XHR0KFwiRXhwbG9yZSB0aGUgZGlmZmVyZW50IHZpZXdzIGF2YWlsYWJsZVwiKSxcclxuXHRcdFx0XHRcdHQoXCJDdXN0b21pemUgc2V0dGluZ3MgYXMgbmVlZGVkXCIpLFxyXG5cdFx0XHRcdF07XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgY29uZmlnIGljb25cclxuXHQgKi9cclxuXHRwcml2YXRlIHN0YXRpYyBnZXRDb25maWdJY29uKG1vZGU6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHRyZXR1cm4gdGhpcy5JQ09OX01BUFttb2RlXSB8fCBcImNsaXBib2FyZC1saXN0XCI7XHJcblx0fVxyXG59XHJcbiJdfQ==