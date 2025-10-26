import { t } from "@/translations/helper";
import { SelectableCard } from "../ui/SelectableCard";
/**
 * User Level Selection Step - Choose configuration based on experience level
 */
export class UserLevelStep {
    /**
     * Render the user level selection step
     */
    static render(headerEl, contentEl, controller, configManager) {
        // Clear
        headerEl.empty();
        contentEl.empty();
        // Header
        headerEl.createEl("h1", { text: t("Select Your Experience Level") });
        headerEl.createEl("p", {
            text: t("Choose the configuration that best matches your task management experience"),
            cls: "onboarding-subtitle",
        });
        // Get configurations
        const configs = configManager.getOnboardingConfigs();
        // Get current selection
        const currentConfig = controller.getState().selectedConfig;
        // Create cards configuration
        const cardConfigs = configs.map((config) => ({
            id: config.mode,
            title: config.name,
            description: config.description,
            icon: this.getConfigIcon(config.mode),
            badge: config.mode === "beginner" ? t("Recommended") : undefined,
            features: config.features,
        }));
        // Render selectable cards
        const card = new SelectableCard(contentEl, cardConfigs, {
            containerClass: [
                "selectable-cards-container",
                "user-level-cards",
            ],
            cardClass: "selectable-card",
            showIcon: true,
            showFeatures: true,
            showPreview: false,
        }, (mode) => {
            controller.setSelectedConfig(configs.find((c) => c.mode === mode));
        });
    }
    /**
     * Get icon for configuration mode
     */
    static getConfigIcon(mode) {
        return this.ICON_MAP[mode] || "clipboard-list";
    }
}
UserLevelStep.ICON_MAP = {
    beginner: "seedling",
    advanced: "zap",
    power: "rocket",
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVXNlckxldmVsU3RlcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlVzZXJMZXZlbFN0ZXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzFDLE9BQU8sRUFBRSxjQUFjLEVBQXdCLE1BQU0sc0JBQXNCLENBQUM7QUFRNUU7O0dBRUc7QUFDSCxNQUFNLE9BQU8sYUFBYTtJQU96Qjs7T0FFRztJQUNILE1BQU0sQ0FBQyxNQUFNLENBQ1osUUFBcUIsRUFDckIsU0FBc0IsRUFDdEIsVUFBZ0MsRUFDaEMsYUFBc0M7UUFFdEMsUUFBUTtRQUNSLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNqQixTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFbEIsU0FBUztRQUNULFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyw4QkFBOEIsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNyRSxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRTtZQUN0QixJQUFJLEVBQUUsQ0FBQyxDQUNOLDRFQUE0RSxDQUM1RTtZQUNELEdBQUcsRUFBRSxxQkFBcUI7U0FDMUIsQ0FBQyxDQUFDO1FBRUgscUJBQXFCO1FBQ3JCLE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBRXJELHdCQUF3QjtRQUN4QixNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUMsY0FBYyxDQUFDO1FBRTNELDZCQUE2QjtRQUM3QixNQUFNLFdBQVcsR0FDaEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztZQUN4QixFQUFFLEVBQUUsTUFBTSxDQUFDLElBQUk7WUFDZixLQUFLLEVBQUUsTUFBTSxDQUFDLElBQUk7WUFDbEIsV0FBVyxFQUFFLE1BQU0sQ0FBQyxXQUFXO1lBQy9CLElBQUksRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDckMsS0FBSyxFQUNKLE1BQU0sQ0FBQyxJQUFJLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDMUQsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRO1NBQ3pCLENBQUMsQ0FBQyxDQUFDO1FBRUwsMEJBQTBCO1FBQzFCLE1BQU0sSUFBSSxHQUFHLElBQUksY0FBYyxDQUM5QixTQUFTLEVBQ1QsV0FBVyxFQUNYO1lBQ0MsY0FBYyxFQUFFO2dCQUNmLDRCQUE0QjtnQkFDNUIsa0JBQWtCO2FBQ2xCO1lBQ0QsU0FBUyxFQUFFLGlCQUFpQjtZQUM1QixRQUFRLEVBQUUsSUFBSTtZQUNkLFlBQVksRUFBRSxJQUFJO1lBQ2xCLFdBQVcsRUFBRSxLQUFLO1NBQ2xCLEVBQ0QsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUNSLFVBQVUsQ0FBQyxpQkFBaUIsQ0FDM0IsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsQ0FDcEMsQ0FBQztRQUNILENBQUMsQ0FDRCxDQUFDO0lBQ0gsQ0FBQztJQUNEOztPQUVHO0lBQ0ssTUFBTSxDQUFDLGFBQWEsQ0FBQyxJQUFZO1FBQ3hDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQztJQUNoRCxDQUFDOztBQXhFdUIsc0JBQVEsR0FBMkI7SUFDMUQsUUFBUSxFQUFFLFVBQVU7SUFDcEIsUUFBUSxFQUFFLEtBQUs7SUFDZixLQUFLLEVBQUUsUUFBUTtDQUNmLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgeyBTZWxlY3RhYmxlQ2FyZCwgU2VsZWN0YWJsZUNhcmRDb25maWcgfSBmcm9tIFwiLi4vdWkvU2VsZWN0YWJsZUNhcmRcIjtcclxuaW1wb3J0IHsgT25ib2FyZGluZ0NvbnRyb2xsZXIgfSBmcm9tIFwiLi4vT25ib2FyZGluZ0NvbnRyb2xsZXJcIjtcclxuaW1wb3J0IHtcclxuXHRPbmJvYXJkaW5nQ29uZmlnTWFuYWdlcixcclxuXHRPbmJvYXJkaW5nQ29uZmlnLFxyXG5cdE9uYm9hcmRpbmdDb25maWdNb2RlLFxyXG59IGZyb20gXCJAL21hbmFnZXJzL29uYm9hcmRpbmctbWFuYWdlclwiO1xyXG5cclxuLyoqXHJcbiAqIFVzZXIgTGV2ZWwgU2VsZWN0aW9uIFN0ZXAgLSBDaG9vc2UgY29uZmlndXJhdGlvbiBiYXNlZCBvbiBleHBlcmllbmNlIGxldmVsXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgVXNlckxldmVsU3RlcCB7XHJcblx0cHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgSUNPTl9NQVA6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XHJcblx0XHRiZWdpbm5lcjogXCJzZWVkbGluZ1wiLFxyXG5cdFx0YWR2YW5jZWQ6IFwiemFwXCIsXHJcblx0XHRwb3dlcjogXCJyb2NrZXRcIixcclxuXHR9O1xyXG5cclxuXHQvKipcclxuXHQgKiBSZW5kZXIgdGhlIHVzZXIgbGV2ZWwgc2VsZWN0aW9uIHN0ZXBcclxuXHQgKi9cclxuXHRzdGF0aWMgcmVuZGVyKFxyXG5cdFx0aGVhZGVyRWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0Y29udGVudEVsOiBIVE1MRWxlbWVudCxcclxuXHRcdGNvbnRyb2xsZXI6IE9uYm9hcmRpbmdDb250cm9sbGVyLFxyXG5cdFx0Y29uZmlnTWFuYWdlcjogT25ib2FyZGluZ0NvbmZpZ01hbmFnZXJcclxuXHQpIHtcclxuXHRcdC8vIENsZWFyXHJcblx0XHRoZWFkZXJFbC5lbXB0eSgpO1xyXG5cdFx0Y29udGVudEVsLmVtcHR5KCk7XHJcblxyXG5cdFx0Ly8gSGVhZGVyXHJcblx0XHRoZWFkZXJFbC5jcmVhdGVFbChcImgxXCIsIHsgdGV4dDogdChcIlNlbGVjdCBZb3VyIEV4cGVyaWVuY2UgTGV2ZWxcIikgfSk7XHJcblx0XHRoZWFkZXJFbC5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFxyXG5cdFx0XHRcdFwiQ2hvb3NlIHRoZSBjb25maWd1cmF0aW9uIHRoYXQgYmVzdCBtYXRjaGVzIHlvdXIgdGFzayBtYW5hZ2VtZW50IGV4cGVyaWVuY2VcIlxyXG5cdFx0XHQpLFxyXG5cdFx0XHRjbHM6IFwib25ib2FyZGluZy1zdWJ0aXRsZVwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gR2V0IGNvbmZpZ3VyYXRpb25zXHJcblx0XHRjb25zdCBjb25maWdzID0gY29uZmlnTWFuYWdlci5nZXRPbmJvYXJkaW5nQ29uZmlncygpO1xyXG5cclxuXHRcdC8vIEdldCBjdXJyZW50IHNlbGVjdGlvblxyXG5cdFx0Y29uc3QgY3VycmVudENvbmZpZyA9IGNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5zZWxlY3RlZENvbmZpZztcclxuXHJcblx0XHQvLyBDcmVhdGUgY2FyZHMgY29uZmlndXJhdGlvblxyXG5cdFx0Y29uc3QgY2FyZENvbmZpZ3M6IFNlbGVjdGFibGVDYXJkQ29uZmlnPE9uYm9hcmRpbmdDb25maWdNb2RlPltdID1cclxuXHRcdFx0Y29uZmlncy5tYXAoKGNvbmZpZykgPT4gKHtcclxuXHRcdFx0XHRpZDogY29uZmlnLm1vZGUsXHJcblx0XHRcdFx0dGl0bGU6IGNvbmZpZy5uYW1lLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBjb25maWcuZGVzY3JpcHRpb24sXHJcblx0XHRcdFx0aWNvbjogdGhpcy5nZXRDb25maWdJY29uKGNvbmZpZy5tb2RlKSxcclxuXHRcdFx0XHRiYWRnZTpcclxuXHRcdFx0XHRcdGNvbmZpZy5tb2RlID09PSBcImJlZ2lubmVyXCIgPyB0KFwiUmVjb21tZW5kZWRcIikgOiB1bmRlZmluZWQsXHJcblx0XHRcdFx0ZmVhdHVyZXM6IGNvbmZpZy5mZWF0dXJlcyxcclxuXHRcdFx0fSkpO1xyXG5cclxuXHRcdC8vIFJlbmRlciBzZWxlY3RhYmxlIGNhcmRzXHJcblx0XHRjb25zdCBjYXJkID0gbmV3IFNlbGVjdGFibGVDYXJkPE9uYm9hcmRpbmdDb25maWdNb2RlPihcclxuXHRcdFx0Y29udGVudEVsLFxyXG5cdFx0XHRjYXJkQ29uZmlncyxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNvbnRhaW5lckNsYXNzOiBbXHJcblx0XHRcdFx0XHRcInNlbGVjdGFibGUtY2FyZHMtY29udGFpbmVyXCIsXHJcblx0XHRcdFx0XHRcInVzZXItbGV2ZWwtY2FyZHNcIixcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdGNhcmRDbGFzczogXCJzZWxlY3RhYmxlLWNhcmRcIixcclxuXHRcdFx0XHRzaG93SWNvbjogdHJ1ZSxcclxuXHRcdFx0XHRzaG93RmVhdHVyZXM6IHRydWUsXHJcblx0XHRcdFx0c2hvd1ByZXZpZXc6IGZhbHNlLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHQobW9kZSkgPT4ge1xyXG5cdFx0XHRcdGNvbnRyb2xsZXIuc2V0U2VsZWN0ZWRDb25maWcoXHJcblx0XHRcdFx0XHRjb25maWdzLmZpbmQoKGMpID0+IGMubW9kZSA9PT0gbW9kZSlcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cdH1cclxuXHQvKipcclxuXHQgKiBHZXQgaWNvbiBmb3IgY29uZmlndXJhdGlvbiBtb2RlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBzdGF0aWMgZ2V0Q29uZmlnSWNvbihtb2RlOiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIHRoaXMuSUNPTl9NQVBbbW9kZV0gfHwgXCJjbGlwYm9hcmQtbGlzdFwiO1xyXG5cdH1cclxufVxyXG4iXX0=