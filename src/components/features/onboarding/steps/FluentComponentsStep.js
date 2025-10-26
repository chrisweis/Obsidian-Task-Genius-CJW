import { t } from "@/translations/helper";
import { ComponentPreviewFactory } from "../previews/ComponentPreviewFactory";
import "@/styles/onboarding-components.css";
/**
 * Fluent Components Step - Introduce main Fluent UI components
 */
export class FluentComponentsStep {
    /**
     * Render the Fluent components introduction step
     */
    static render(headerEl, contentEl, controller) {
        // Clear
        headerEl.empty();
        contentEl.empty();
        // Header
        headerEl.createEl("h1", { text: t("Discover Fluent Interface") });
        headerEl.createEl("p", {
            text: t("Get familiar with the main components that make up the Fluent experience"),
            cls: "onboarding-subtitle",
        });
        // Component tabs for switching
        const tabsContainer = contentEl.createDiv({ cls: "component-tabs" });
        const components = [
            { id: "sidebar", label: t("Sidebar") },
            { id: "topnav", label: t("Top Navigation") },
            // { id: "content", label: t("Content Area") },
            { id: "project", label: t("Project Management") },
        ];
        // Create tabs
        components.forEach((comp) => {
            const tab = tabsContainer.createDiv({ cls: "component-tab" });
            if (comp.id === this.currentComponent) {
                tab.addClass("is-active");
            }
            tab.textContent = comp.label;
            tab.addEventListener("click", () => {
                this.currentComponent = comp.id;
                this.render(headerEl, contentEl, controller);
            });
        });
        // Components grid
        const grid = contentEl.createDiv({ cls: "components-grid" });
        // Render current component
        this.renderComponent(grid, this.currentComponent);
    }
    /**
     * Render specific component showcase
     */
    static renderComponent(container, component) {
        const showcase = container.createDiv({ cls: "component-showcase" });
        // Preview section
        const previewSection = showcase.createDiv({
            cls: "component-showcase-preview",
        });
        // Description section
        const descSection = showcase.createDiv({
            cls: "component-showcase-description",
        });
        // Render based on component type
        switch (component) {
            case "sidebar":
                this.renderSidebarShowcase(previewSection, descSection);
                break;
            case "topnav":
                this.renderTopNavShowcase(previewSection, descSection);
                break;
            // case "content":
            // 	this.renderContentShowcase(previewSection, descSection);
            // 	break;
            case "project":
                this.renderProjectShowcase(previewSection, descSection);
                break;
        }
    }
    /**
     * Render sidebar component showcase
     */
    static renderSidebarShowcase(preview, description) {
        // Create preview
        ComponentPreviewFactory.createSidebarPreview(preview);
        // Create description
        description.createEl("h3", { text: t("Sidebar Navigation") });
        description.createEl("p", {
            text: t("The sidebar is your command center for navigating through different views, managing workspaces, and organizing projects."),
        });
        const features = description.createEl("ul", {
            cls: "component-feature-list",
        });
        const featureItems = [
            t("Switch between multiple workspaces instantly"),
            t("Quick access to Inbox, Today, Upcoming, and Flagged tasks"),
            t("Organize tasks with project hierarchies"),
            t("Access specialized views like Calendar, Gantt, and Tags"),
            t("Collapsible design to maximize content space"),
        ];
        featureItems.forEach((feature) => {
            features.createEl("li", { text: feature });
        });
    }
    /**
     * Render top navigation showcase
     */
    static renderTopNavShowcase(preview, description) {
        // Create preview
        ComponentPreviewFactory.createTopNavigationPreview(preview);
        // Create description
        description.createEl("h3", { text: t("Top Navigation Bar") });
        description.createEl("p", {
            text: t("The top navigation bar provides powerful tools for searching, filtering, and switching between different view modes."),
        });
        const features = description.createEl("ul", {
            cls: "component-feature-list",
        });
        const featureItems = [
            t("Global search across all tasks and projects"),
            t("Switch between List, Kanban, Tree, and Calendar views"),
            t("Apply advanced filters to focus on specific tasks"),
            t("Sort tasks by various criteria"),
            t("Quick access to view-specific settings"),
        ];
        featureItems.forEach((feature) => {
            features.createEl("li", { text: feature });
        });
    }
    /**
     * Render content area showcase
     */
    static renderContentShowcase(preview, description) {
        // Create preview
        ComponentPreviewFactory.createContentAreaPreview(preview);
        // Create description
        description.createEl("h3", { text: t("Content Display Area") });
        description.createEl("p", {
            text: t("The main content area displays your tasks in various formats, adapting to your preferred view mode and current context."),
        });
        const features = description.createEl("ul", {
            cls: "component-feature-list",
        });
        const featureItems = [
            t("List view for detailed task management"),
            t("Kanban board for visual workflow tracking"),
            t("Tree view for hierarchical task organization"),
            t("Calendar view for time-based planning"),
            t("Inline task editing and quick actions"),
        ];
        featureItems.forEach((feature) => {
            features.createEl("li", { text: feature });
        });
    }
    /**
     * Render project management showcase
     */
    static renderProjectShowcase(preview, description) {
        // Create preview
        ComponentPreviewFactory.createProjectPopoverPreview(preview);
        // Create description
        description.createEl("h3", { text: t("Project Management") });
        description.createEl("p", {
            text: t("Projects help you organize related tasks together. Access detailed project information, statistics, and quick actions through the project popover."),
        });
        const features = description.createEl("ul", {
            cls: "component-feature-list",
        });
        const featureItems = [
            t("View project task counts and completion statistics"),
            t("Quick access to all tasks within a project"),
            t("Color-coded project organization"),
            t("Create nested project hierarchies"),
            t("Manage project settings and properties"),
        ];
        featureItems.forEach((feature) => {
            features.createEl("li", { text: feature });
        });
    }
}
FluentComponentsStep.currentComponent = "sidebar";
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmx1ZW50Q29tcG9uZW50c1N0ZXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJGbHVlbnRDb21wb25lbnRzU3RlcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFMUMsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUUsT0FBTyxvQ0FBb0MsQ0FBQztBQUk1Qzs7R0FFRztBQUNILE1BQU0sT0FBTyxvQkFBb0I7SUFHaEM7O09BRUc7SUFDSCxNQUFNLENBQUMsTUFBTSxDQUNaLFFBQXFCLEVBQ3JCLFNBQXNCLEVBQ3RCLFVBQWdDO1FBRWhDLFFBQVE7UUFDUixRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDakIsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRWxCLFNBQVM7UUFDVCxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsMkJBQTJCLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbEUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7WUFDdEIsSUFBSSxFQUFFLENBQUMsQ0FDTiwwRUFBMEUsQ0FDMUU7WUFDRCxHQUFHLEVBQUUscUJBQXFCO1NBQzFCLENBQUMsQ0FBQztRQUVILCtCQUErQjtRQUMvQixNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLGdCQUFnQixFQUFFLENBQUMsQ0FBQztRQUVyRSxNQUFNLFVBQVUsR0FHWDtZQUNKLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ3RDLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEVBQUU7WUFDNUMsK0NBQStDO1lBQy9DLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLEVBQUU7U0FDakQsQ0FBQztRQUVGLGNBQWM7UUFDZCxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDM0IsTUFBTSxHQUFHLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxlQUFlLEVBQUUsQ0FBQyxDQUFDO1lBQzlELElBQUksSUFBSSxDQUFDLEVBQUUsS0FBSyxJQUFJLENBQUMsZ0JBQWdCLEVBQUU7Z0JBQ3RDLEdBQUcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7YUFDMUI7WUFDRCxHQUFHLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7WUFDN0IsR0FBRyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQ2xDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNoQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDOUMsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUVILGtCQUFrQjtRQUNsQixNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLGlCQUFpQixFQUFFLENBQUMsQ0FBQztRQUU3RCwyQkFBMkI7UUFDM0IsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVEOztPQUVHO0lBQ0ssTUFBTSxDQUFDLGVBQWUsQ0FDN0IsU0FBc0IsRUFDdEIsU0FBd0I7UUFFeEIsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxvQkFBb0IsRUFBRSxDQUFDLENBQUM7UUFFcEUsa0JBQWtCO1FBQ2xCLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUM7WUFDekMsR0FBRyxFQUFFLDRCQUE0QjtTQUNqQyxDQUFDLENBQUM7UUFFSCxzQkFBc0I7UUFDdEIsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQztZQUN0QyxHQUFHLEVBQUUsZ0NBQWdDO1NBQ3JDLENBQUMsQ0FBQztRQUVILGlDQUFpQztRQUNqQyxRQUFRLFNBQVMsRUFBRTtZQUNsQixLQUFLLFNBQVM7Z0JBQ2IsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsRUFBRSxXQUFXLENBQUMsQ0FBQztnQkFDeEQsTUFBTTtZQUNQLEtBQUssUUFBUTtnQkFDWixJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxFQUFFLFdBQVcsQ0FBQyxDQUFDO2dCQUN2RCxNQUFNO1lBQ04sa0JBQWtCO1lBQ2xCLDREQUE0RDtZQUM1RCxVQUFVO1lBQ1gsS0FBSyxTQUFTO2dCQUNiLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLEVBQUUsV0FBVyxDQUFDLENBQUM7Z0JBQ3hELE1BQU07U0FDUDtJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNLLE1BQU0sQ0FBQyxxQkFBcUIsQ0FDbkMsT0FBb0IsRUFDcEIsV0FBd0I7UUFFeEIsaUJBQWlCO1FBQ2pCLHVCQUF1QixDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRXRELHFCQUFxQjtRQUNyQixXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDOUQsV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7WUFDekIsSUFBSSxFQUFFLENBQUMsQ0FDTiwwSEFBMEgsQ0FDMUg7U0FDRCxDQUFDLENBQUM7UUFFSCxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRTtZQUMzQyxHQUFHLEVBQUUsd0JBQXdCO1NBQzdCLENBQUMsQ0FBQztRQUVILE1BQU0sWUFBWSxHQUFHO1lBQ3BCLENBQUMsQ0FBQyw4Q0FBOEMsQ0FBQztZQUNqRCxDQUFDLENBQUMsMkRBQTJELENBQUM7WUFDOUQsQ0FBQyxDQUFDLHlDQUF5QyxDQUFDO1lBQzVDLENBQUMsQ0FBQyx5REFBeUQsQ0FBQztZQUM1RCxDQUFDLENBQUMsOENBQThDLENBQUM7U0FDakQsQ0FBQztRQUVGLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUNoQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQzVDLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ0ssTUFBTSxDQUFDLG9CQUFvQixDQUNsQyxPQUFvQixFQUNwQixXQUF3QjtRQUV4QixpQkFBaUI7UUFDakIsdUJBQXVCLENBQUMsMEJBQTBCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFNUQscUJBQXFCO1FBQ3JCLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM5RCxXQUFXLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRTtZQUN6QixJQUFJLEVBQUUsQ0FBQyxDQUNOLHNIQUFzSCxDQUN0SDtTQUNELENBQUMsQ0FBQztRQUVILE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFO1lBQzNDLEdBQUcsRUFBRSx3QkFBd0I7U0FDN0IsQ0FBQyxDQUFDO1FBRUgsTUFBTSxZQUFZLEdBQUc7WUFDcEIsQ0FBQyxDQUFDLDZDQUE2QyxDQUFDO1lBQ2hELENBQUMsQ0FBQyx1REFBdUQsQ0FBQztZQUMxRCxDQUFDLENBQUMsbURBQW1ELENBQUM7WUFDdEQsQ0FBQyxDQUFDLGdDQUFnQyxDQUFDO1lBQ25DLENBQUMsQ0FBQyx3Q0FBd0MsQ0FBQztTQUMzQyxDQUFDO1FBRUYsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ2hDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDNUMsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDSyxNQUFNLENBQUMscUJBQXFCLENBQ25DLE9BQW9CLEVBQ3BCLFdBQXdCO1FBRXhCLGlCQUFpQjtRQUNqQix1QkFBdUIsQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUUxRCxxQkFBcUI7UUFDckIsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2hFLFdBQVcsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFO1lBQ3pCLElBQUksRUFBRSxDQUFDLENBQ04seUhBQXlILENBQ3pIO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUU7WUFDM0MsR0FBRyxFQUFFLHdCQUF3QjtTQUM3QixDQUFDLENBQUM7UUFFSCxNQUFNLFlBQVksR0FBRztZQUNwQixDQUFDLENBQUMsd0NBQXdDLENBQUM7WUFDM0MsQ0FBQyxDQUFDLDJDQUEyQyxDQUFDO1lBQzlDLENBQUMsQ0FBQyw4Q0FBOEMsQ0FBQztZQUNqRCxDQUFDLENBQUMsdUNBQXVDLENBQUM7WUFDMUMsQ0FBQyxDQUFDLHVDQUF1QyxDQUFDO1NBQzFDLENBQUM7UUFFRixZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDaEMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUM1QyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRDs7T0FFRztJQUNLLE1BQU0sQ0FBQyxxQkFBcUIsQ0FDbkMsT0FBb0IsRUFDcEIsV0FBd0I7UUFFeEIsaUJBQWlCO1FBQ2pCLHVCQUF1QixDQUFDLDJCQUEyQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRTdELHFCQUFxQjtRQUNyQixXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDOUQsV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7WUFDekIsSUFBSSxFQUFFLENBQUMsQ0FDTixvSkFBb0osQ0FDcEo7U0FDRCxDQUFDLENBQUM7UUFFSCxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRTtZQUMzQyxHQUFHLEVBQUUsd0JBQXdCO1NBQzdCLENBQUMsQ0FBQztRQUVILE1BQU0sWUFBWSxHQUFHO1lBQ3BCLENBQUMsQ0FBQyxvREFBb0QsQ0FBQztZQUN2RCxDQUFDLENBQUMsNENBQTRDLENBQUM7WUFDL0MsQ0FBQyxDQUFDLGtDQUFrQyxDQUFDO1lBQ3JDLENBQUMsQ0FBQyxtQ0FBbUMsQ0FBQztZQUN0QyxDQUFDLENBQUMsd0NBQXdDLENBQUM7U0FDM0MsQ0FBQztRQUVGLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUNoQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQzVDLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQzs7QUF0T2MscUNBQWdCLEdBQWtCLFNBQVMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCB7IE9uYm9hcmRpbmdDb250cm9sbGVyIH0gZnJvbSBcIi4uL09uYm9hcmRpbmdDb250cm9sbGVyXCI7XHJcbmltcG9ydCB7IENvbXBvbmVudFByZXZpZXdGYWN0b3J5IH0gZnJvbSBcIi4uL3ByZXZpZXdzL0NvbXBvbmVudFByZXZpZXdGYWN0b3J5XCI7XHJcbmltcG9ydCBcIkAvc3R5bGVzL29uYm9hcmRpbmctY29tcG9uZW50cy5jc3NcIjtcclxuXHJcbnR5cGUgQ29tcG9uZW50VHlwZSA9IFwic2lkZWJhclwiIHwgXCJ0b3BuYXZcIiB8IFwiY29udGVudFwiIHwgXCJwcm9qZWN0XCI7XHJcblxyXG4vKipcclxuICogRmx1ZW50IENvbXBvbmVudHMgU3RlcCAtIEludHJvZHVjZSBtYWluIEZsdWVudCBVSSBjb21wb25lbnRzXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgRmx1ZW50Q29tcG9uZW50c1N0ZXAge1xyXG5cdHByaXZhdGUgc3RhdGljIGN1cnJlbnRDb21wb25lbnQ6IENvbXBvbmVudFR5cGUgPSBcInNpZGViYXJcIjtcclxuXHJcblx0LyoqXHJcblx0ICogUmVuZGVyIHRoZSBGbHVlbnQgY29tcG9uZW50cyBpbnRyb2R1Y3Rpb24gc3RlcFxyXG5cdCAqL1xyXG5cdHN0YXRpYyByZW5kZXIoXHJcblx0XHRoZWFkZXJFbDogSFRNTEVsZW1lbnQsXHJcblx0XHRjb250ZW50RWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0Y29udHJvbGxlcjogT25ib2FyZGluZ0NvbnRyb2xsZXJcclxuXHQpIHtcclxuXHRcdC8vIENsZWFyXHJcblx0XHRoZWFkZXJFbC5lbXB0eSgpO1xyXG5cdFx0Y29udGVudEVsLmVtcHR5KCk7XHJcblxyXG5cdFx0Ly8gSGVhZGVyXHJcblx0XHRoZWFkZXJFbC5jcmVhdGVFbChcImgxXCIsIHsgdGV4dDogdChcIkRpc2NvdmVyIEZsdWVudCBJbnRlcmZhY2VcIikgfSk7XHJcblx0XHRoZWFkZXJFbC5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFxyXG5cdFx0XHRcdFwiR2V0IGZhbWlsaWFyIHdpdGggdGhlIG1haW4gY29tcG9uZW50cyB0aGF0IG1ha2UgdXAgdGhlIEZsdWVudCBleHBlcmllbmNlXCJcclxuXHRcdFx0KSxcclxuXHRcdFx0Y2xzOiBcIm9uYm9hcmRpbmctc3VidGl0bGVcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIENvbXBvbmVudCB0YWJzIGZvciBzd2l0Y2hpbmdcclxuXHRcdGNvbnN0IHRhYnNDb250YWluZXIgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcImNvbXBvbmVudC10YWJzXCIgfSk7XHJcblxyXG5cdFx0Y29uc3QgY29tcG9uZW50czogQXJyYXk8e1xyXG5cdFx0XHRpZDogQ29tcG9uZW50VHlwZTtcclxuXHRcdFx0bGFiZWw6IHN0cmluZztcclxuXHRcdH0+ID0gW1xyXG5cdFx0XHR7IGlkOiBcInNpZGViYXJcIiwgbGFiZWw6IHQoXCJTaWRlYmFyXCIpIH0sXHJcblx0XHRcdHsgaWQ6IFwidG9wbmF2XCIsIGxhYmVsOiB0KFwiVG9wIE5hdmlnYXRpb25cIikgfSxcclxuXHRcdFx0Ly8geyBpZDogXCJjb250ZW50XCIsIGxhYmVsOiB0KFwiQ29udGVudCBBcmVhXCIpIH0sXHJcblx0XHRcdHsgaWQ6IFwicHJvamVjdFwiLCBsYWJlbDogdChcIlByb2plY3QgTWFuYWdlbWVudFwiKSB9LFxyXG5cdFx0XTtcclxuXHJcblx0XHQvLyBDcmVhdGUgdGFic1xyXG5cdFx0Y29tcG9uZW50cy5mb3JFYWNoKChjb21wKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRhYiA9IHRhYnNDb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcImNvbXBvbmVudC10YWJcIiB9KTtcclxuXHRcdFx0aWYgKGNvbXAuaWQgPT09IHRoaXMuY3VycmVudENvbXBvbmVudCkge1xyXG5cdFx0XHRcdHRhYi5hZGRDbGFzcyhcImlzLWFjdGl2ZVwiKTtcclxuXHRcdFx0fVxyXG5cdFx0XHR0YWIudGV4dENvbnRlbnQgPSBjb21wLmxhYmVsO1xyXG5cdFx0XHR0YWIuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0XHR0aGlzLmN1cnJlbnRDb21wb25lbnQgPSBjb21wLmlkO1xyXG5cdFx0XHRcdHRoaXMucmVuZGVyKGhlYWRlckVsLCBjb250ZW50RWwsIGNvbnRyb2xsZXIpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIENvbXBvbmVudHMgZ3JpZFxyXG5cdFx0Y29uc3QgZ3JpZCA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwiY29tcG9uZW50cy1ncmlkXCIgfSk7XHJcblxyXG5cdFx0Ly8gUmVuZGVyIGN1cnJlbnQgY29tcG9uZW50XHJcblx0XHR0aGlzLnJlbmRlckNvbXBvbmVudChncmlkLCB0aGlzLmN1cnJlbnRDb21wb25lbnQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVuZGVyIHNwZWNpZmljIGNvbXBvbmVudCBzaG93Y2FzZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgc3RhdGljIHJlbmRlckNvbXBvbmVudChcclxuXHRcdGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXHJcblx0XHRjb21wb25lbnQ6IENvbXBvbmVudFR5cGVcclxuXHQpIHtcclxuXHRcdGNvbnN0IHNob3djYXNlID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJjb21wb25lbnQtc2hvd2Nhc2VcIiB9KTtcclxuXHJcblx0XHQvLyBQcmV2aWV3IHNlY3Rpb25cclxuXHRcdGNvbnN0IHByZXZpZXdTZWN0aW9uID0gc2hvd2Nhc2UuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImNvbXBvbmVudC1zaG93Y2FzZS1wcmV2aWV3XCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBEZXNjcmlwdGlvbiBzZWN0aW9uXHJcblx0XHRjb25zdCBkZXNjU2VjdGlvbiA9IHNob3djYXNlLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJjb21wb25lbnQtc2hvd2Nhc2UtZGVzY3JpcHRpb25cIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFJlbmRlciBiYXNlZCBvbiBjb21wb25lbnQgdHlwZVxyXG5cdFx0c3dpdGNoIChjb21wb25lbnQpIHtcclxuXHRcdFx0Y2FzZSBcInNpZGViYXJcIjpcclxuXHRcdFx0XHR0aGlzLnJlbmRlclNpZGViYXJTaG93Y2FzZShwcmV2aWV3U2VjdGlvbiwgZGVzY1NlY3Rpb24pO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwidG9wbmF2XCI6XHJcblx0XHRcdFx0dGhpcy5yZW5kZXJUb3BOYXZTaG93Y2FzZShwcmV2aWV3U2VjdGlvbiwgZGVzY1NlY3Rpb24pO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdC8vIGNhc2UgXCJjb250ZW50XCI6XHJcblx0XHRcdFx0Ly8gXHR0aGlzLnJlbmRlckNvbnRlbnRTaG93Y2FzZShwcmV2aWV3U2VjdGlvbiwgZGVzY1NlY3Rpb24pO1xyXG5cdFx0XHRcdC8vIFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgXCJwcm9qZWN0XCI6XHJcblx0XHRcdFx0dGhpcy5yZW5kZXJQcm9qZWN0U2hvd2Nhc2UocHJldmlld1NlY3Rpb24sIGRlc2NTZWN0aW9uKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbmRlciBzaWRlYmFyIGNvbXBvbmVudCBzaG93Y2FzZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgc3RhdGljIHJlbmRlclNpZGViYXJTaG93Y2FzZShcclxuXHRcdHByZXZpZXc6IEhUTUxFbGVtZW50LFxyXG5cdFx0ZGVzY3JpcHRpb246IEhUTUxFbGVtZW50XHJcblx0KSB7XHJcblx0XHQvLyBDcmVhdGUgcHJldmlld1xyXG5cdFx0Q29tcG9uZW50UHJldmlld0ZhY3RvcnkuY3JlYXRlU2lkZWJhclByZXZpZXcocHJldmlldyk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGRlc2NyaXB0aW9uXHJcblx0XHRkZXNjcmlwdGlvbi5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogdChcIlNpZGViYXIgTmF2aWdhdGlvblwiKSB9KTtcclxuXHRcdGRlc2NyaXB0aW9uLmNyZWF0ZUVsKFwicFwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXHJcblx0XHRcdFx0XCJUaGUgc2lkZWJhciBpcyB5b3VyIGNvbW1hbmQgY2VudGVyIGZvciBuYXZpZ2F0aW5nIHRocm91Z2ggZGlmZmVyZW50IHZpZXdzLCBtYW5hZ2luZyB3b3Jrc3BhY2VzLCBhbmQgb3JnYW5pemluZyBwcm9qZWN0cy5cIlxyXG5cdFx0XHQpLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgZmVhdHVyZXMgPSBkZXNjcmlwdGlvbi5jcmVhdGVFbChcInVsXCIsIHtcclxuXHRcdFx0Y2xzOiBcImNvbXBvbmVudC1mZWF0dXJlLWxpc3RcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IGZlYXR1cmVJdGVtcyA9IFtcclxuXHRcdFx0dChcIlN3aXRjaCBiZXR3ZWVuIG11bHRpcGxlIHdvcmtzcGFjZXMgaW5zdGFudGx5XCIpLFxyXG5cdFx0XHR0KFwiUXVpY2sgYWNjZXNzIHRvIEluYm94LCBUb2RheSwgVXBjb21pbmcsIGFuZCBGbGFnZ2VkIHRhc2tzXCIpLFxyXG5cdFx0XHR0KFwiT3JnYW5pemUgdGFza3Mgd2l0aCBwcm9qZWN0IGhpZXJhcmNoaWVzXCIpLFxyXG5cdFx0XHR0KFwiQWNjZXNzIHNwZWNpYWxpemVkIHZpZXdzIGxpa2UgQ2FsZW5kYXIsIEdhbnR0LCBhbmQgVGFnc1wiKSxcclxuXHRcdFx0dChcIkNvbGxhcHNpYmxlIGRlc2lnbiB0byBtYXhpbWl6ZSBjb250ZW50IHNwYWNlXCIpLFxyXG5cdFx0XTtcclxuXHJcblx0XHRmZWF0dXJlSXRlbXMuZm9yRWFjaCgoZmVhdHVyZSkgPT4ge1xyXG5cdFx0XHRmZWF0dXJlcy5jcmVhdGVFbChcImxpXCIsIHsgdGV4dDogZmVhdHVyZSB9KTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVuZGVyIHRvcCBuYXZpZ2F0aW9uIHNob3djYXNlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBzdGF0aWMgcmVuZGVyVG9wTmF2U2hvd2Nhc2UoXHJcblx0XHRwcmV2aWV3OiBIVE1MRWxlbWVudCxcclxuXHRcdGRlc2NyaXB0aW9uOiBIVE1MRWxlbWVudFxyXG5cdCkge1xyXG5cdFx0Ly8gQ3JlYXRlIHByZXZpZXdcclxuXHRcdENvbXBvbmVudFByZXZpZXdGYWN0b3J5LmNyZWF0ZVRvcE5hdmlnYXRpb25QcmV2aWV3KHByZXZpZXcpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBkZXNjcmlwdGlvblxyXG5cdFx0ZGVzY3JpcHRpb24uY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IHQoXCJUb3AgTmF2aWdhdGlvbiBCYXJcIikgfSk7XHJcblx0XHRkZXNjcmlwdGlvbi5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFxyXG5cdFx0XHRcdFwiVGhlIHRvcCBuYXZpZ2F0aW9uIGJhciBwcm92aWRlcyBwb3dlcmZ1bCB0b29scyBmb3Igc2VhcmNoaW5nLCBmaWx0ZXJpbmcsIGFuZCBzd2l0Y2hpbmcgYmV0d2VlbiBkaWZmZXJlbnQgdmlldyBtb2Rlcy5cIlxyXG5cdFx0XHQpLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgZmVhdHVyZXMgPSBkZXNjcmlwdGlvbi5jcmVhdGVFbChcInVsXCIsIHtcclxuXHRcdFx0Y2xzOiBcImNvbXBvbmVudC1mZWF0dXJlLWxpc3RcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IGZlYXR1cmVJdGVtcyA9IFtcclxuXHRcdFx0dChcIkdsb2JhbCBzZWFyY2ggYWNyb3NzIGFsbCB0YXNrcyBhbmQgcHJvamVjdHNcIiksXHJcblx0XHRcdHQoXCJTd2l0Y2ggYmV0d2VlbiBMaXN0LCBLYW5iYW4sIFRyZWUsIGFuZCBDYWxlbmRhciB2aWV3c1wiKSxcclxuXHRcdFx0dChcIkFwcGx5IGFkdmFuY2VkIGZpbHRlcnMgdG8gZm9jdXMgb24gc3BlY2lmaWMgdGFza3NcIiksXHJcblx0XHRcdHQoXCJTb3J0IHRhc2tzIGJ5IHZhcmlvdXMgY3JpdGVyaWFcIiksXHJcblx0XHRcdHQoXCJRdWljayBhY2Nlc3MgdG8gdmlldy1zcGVjaWZpYyBzZXR0aW5nc1wiKSxcclxuXHRcdF07XHJcblxyXG5cdFx0ZmVhdHVyZUl0ZW1zLmZvckVhY2goKGZlYXR1cmUpID0+IHtcclxuXHRcdFx0ZmVhdHVyZXMuY3JlYXRlRWwoXCJsaVwiLCB7IHRleHQ6IGZlYXR1cmUgfSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbmRlciBjb250ZW50IGFyZWEgc2hvd2Nhc2VcclxuXHQgKi9cclxuXHRwcml2YXRlIHN0YXRpYyByZW5kZXJDb250ZW50U2hvd2Nhc2UoXHJcblx0XHRwcmV2aWV3OiBIVE1MRWxlbWVudCxcclxuXHRcdGRlc2NyaXB0aW9uOiBIVE1MRWxlbWVudFxyXG5cdCkge1xyXG5cdFx0Ly8gQ3JlYXRlIHByZXZpZXdcclxuXHRcdENvbXBvbmVudFByZXZpZXdGYWN0b3J5LmNyZWF0ZUNvbnRlbnRBcmVhUHJldmlldyhwcmV2aWV3KTtcclxuXHJcblx0XHQvLyBDcmVhdGUgZGVzY3JpcHRpb25cclxuXHRcdGRlc2NyaXB0aW9uLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiB0KFwiQ29udGVudCBEaXNwbGF5IEFyZWFcIikgfSk7XHJcblx0XHRkZXNjcmlwdGlvbi5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFxyXG5cdFx0XHRcdFwiVGhlIG1haW4gY29udGVudCBhcmVhIGRpc3BsYXlzIHlvdXIgdGFza3MgaW4gdmFyaW91cyBmb3JtYXRzLCBhZGFwdGluZyB0byB5b3VyIHByZWZlcnJlZCB2aWV3IG1vZGUgYW5kIGN1cnJlbnQgY29udGV4dC5cIlxyXG5cdFx0XHQpLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgZmVhdHVyZXMgPSBkZXNjcmlwdGlvbi5jcmVhdGVFbChcInVsXCIsIHtcclxuXHRcdFx0Y2xzOiBcImNvbXBvbmVudC1mZWF0dXJlLWxpc3RcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IGZlYXR1cmVJdGVtcyA9IFtcclxuXHRcdFx0dChcIkxpc3QgdmlldyBmb3IgZGV0YWlsZWQgdGFzayBtYW5hZ2VtZW50XCIpLFxyXG5cdFx0XHR0KFwiS2FuYmFuIGJvYXJkIGZvciB2aXN1YWwgd29ya2Zsb3cgdHJhY2tpbmdcIiksXHJcblx0XHRcdHQoXCJUcmVlIHZpZXcgZm9yIGhpZXJhcmNoaWNhbCB0YXNrIG9yZ2FuaXphdGlvblwiKSxcclxuXHRcdFx0dChcIkNhbGVuZGFyIHZpZXcgZm9yIHRpbWUtYmFzZWQgcGxhbm5pbmdcIiksXHJcblx0XHRcdHQoXCJJbmxpbmUgdGFzayBlZGl0aW5nIGFuZCBxdWljayBhY3Rpb25zXCIpLFxyXG5cdFx0XTtcclxuXHJcblx0XHRmZWF0dXJlSXRlbXMuZm9yRWFjaCgoZmVhdHVyZSkgPT4ge1xyXG5cdFx0XHRmZWF0dXJlcy5jcmVhdGVFbChcImxpXCIsIHsgdGV4dDogZmVhdHVyZSB9KTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVuZGVyIHByb2plY3QgbWFuYWdlbWVudCBzaG93Y2FzZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgc3RhdGljIHJlbmRlclByb2plY3RTaG93Y2FzZShcclxuXHRcdHByZXZpZXc6IEhUTUxFbGVtZW50LFxyXG5cdFx0ZGVzY3JpcHRpb246IEhUTUxFbGVtZW50XHJcblx0KSB7XHJcblx0XHQvLyBDcmVhdGUgcHJldmlld1xyXG5cdFx0Q29tcG9uZW50UHJldmlld0ZhY3RvcnkuY3JlYXRlUHJvamVjdFBvcG92ZXJQcmV2aWV3KHByZXZpZXcpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBkZXNjcmlwdGlvblxyXG5cdFx0ZGVzY3JpcHRpb24uY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IHQoXCJQcm9qZWN0IE1hbmFnZW1lbnRcIikgfSk7XHJcblx0XHRkZXNjcmlwdGlvbi5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFxyXG5cdFx0XHRcdFwiUHJvamVjdHMgaGVscCB5b3Ugb3JnYW5pemUgcmVsYXRlZCB0YXNrcyB0b2dldGhlci4gQWNjZXNzIGRldGFpbGVkIHByb2plY3QgaW5mb3JtYXRpb24sIHN0YXRpc3RpY3MsIGFuZCBxdWljayBhY3Rpb25zIHRocm91Z2ggdGhlIHByb2plY3QgcG9wb3Zlci5cIlxyXG5cdFx0XHQpLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgZmVhdHVyZXMgPSBkZXNjcmlwdGlvbi5jcmVhdGVFbChcInVsXCIsIHtcclxuXHRcdFx0Y2xzOiBcImNvbXBvbmVudC1mZWF0dXJlLWxpc3RcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IGZlYXR1cmVJdGVtcyA9IFtcclxuXHRcdFx0dChcIlZpZXcgcHJvamVjdCB0YXNrIGNvdW50cyBhbmQgY29tcGxldGlvbiBzdGF0aXN0aWNzXCIpLFxyXG5cdFx0XHR0KFwiUXVpY2sgYWNjZXNzIHRvIGFsbCB0YXNrcyB3aXRoaW4gYSBwcm9qZWN0XCIpLFxyXG5cdFx0XHR0KFwiQ29sb3ItY29kZWQgcHJvamVjdCBvcmdhbml6YXRpb25cIiksXHJcblx0XHRcdHQoXCJDcmVhdGUgbmVzdGVkIHByb2plY3QgaGllcmFyY2hpZXNcIiksXHJcblx0XHRcdHQoXCJNYW5hZ2UgcHJvamVjdCBzZXR0aW5ncyBhbmQgcHJvcGVydGllc1wiKSxcclxuXHRcdF07XHJcblxyXG5cdFx0ZmVhdHVyZUl0ZW1zLmZvckVhY2goKGZlYXR1cmUpID0+IHtcclxuXHRcdFx0ZmVhdHVyZXMuY3JlYXRlRWwoXCJsaVwiLCB7IHRleHQ6IGZlYXR1cmUgfSk7XHJcblx0XHR9KTtcclxuXHR9XHJcbn1cclxuIl19