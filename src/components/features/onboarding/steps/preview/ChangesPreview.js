import { t } from "@/translations/helper";
import { setIcon } from "obsidian";
import { Alert } from "../../ui/Alert";
/**
 * Changes Preview Component - Show what will change
 */
export class ChangesPreview {
    /**
     * Render configuration changes preview
     */
    static render(container, config, configManager) {
        try {
            const preview = configManager.getConfigurationPreview(config.mode);
            const section = container.createDiv("config-changes-summary");
            section.createEl("h3", { text: t("Configuration Changes") });
            // User custom views preserved
            if (preview.userCustomViewsPreserved.length > 0) {
                this.renderPreservedViews(section, preview.userCustomViewsPreserved);
            }
            // Views to be added
            if (preview.viewsToAdd.length > 0) {
                this.renderChangeItem(section, "plus-circle", t("New views to be added") +
                    ` (${preview.viewsToAdd.length})`);
            }
            // Views to be updated
            if (preview.viewsToUpdate.length > 0) {
                this.renderChangeItem(section, "refresh-cw", t("Existing views to be updated") +
                    ` (${preview.viewsToUpdate.length})`);
            }
            // Settings changes
            if (preview.settingsChanges.length > 0) {
                this.renderSettingsChanges(section, preview.settingsChanges);
            }
            // Safety note
            Alert.create(section, t("Only template settings will be applied. Your existing custom configurations will be preserved."), {
                variant: "info",
                icon: "info",
                className: "safety-note",
            });
        }
        catch (error) {
            console.warn("Could not generate configuration preview:", error);
        }
    }
    /**
     * Render preserved views
     */
    static renderPreservedViews(container, views) {
        const section = container.createDiv("preserved-views");
        const header = section.createDiv("preserved-header");
        const icon = header.createSpan("preserved-icon");
        setIcon(icon, "shield-check");
        header
            .createSpan("preserved-text")
            .setText(t("Your custom views will be preserved") + ` (${views.length})`);
        const list = section.createEl("ul", {
            cls: "preserved-views-list",
        });
        views.forEach((view) => {
            const item = list.createEl("li");
            const viewIcon = item.createSpan();
            setIcon(viewIcon, view.icon || "list");
            item.createSpan().setText(" " + view.name);
        });
    }
    /**
     * Render a change item
     */
    static renderChangeItem(container, iconName, text) {
        const section = container.createDiv("change-item");
        const icon = section.createSpan("change-icon");
        setIcon(icon, iconName);
        section.createSpan("change-text").setText(text);
    }
    /**
     * Render settings changes
     */
    static renderSettingsChanges(container, changes) {
        const section = container.createDiv("settings-changes");
        const icon = section.createSpan("change-icon");
        setIcon(icon, "settings");
        section.createSpan("change-text").setText(t("Feature changes"));
        const list = section.createEl("ul", {
            cls: "settings-changes-list",
        });
        changes.forEach((change) => {
            const item = list.createEl("li");
            item.setText(change);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2hhbmdlc1ByZXZpZXcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJDaGFuZ2VzUHJldmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDMUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUtuQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFFdkM7O0dBRUc7QUFDSCxNQUFNLE9BQU8sY0FBYztJQUMxQjs7T0FFRztJQUNILE1BQU0sQ0FBQyxNQUFNLENBQ1osU0FBc0IsRUFDdEIsTUFBd0IsRUFDeEIsYUFBc0M7UUFFdEMsSUFBSTtZQUNILE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFbkUsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1lBQzlELE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUU3RCw4QkFBOEI7WUFDOUIsSUFBSSxPQUFPLENBQUMsd0JBQXdCLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtnQkFDaEQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsd0JBQXdCLENBQUMsQ0FBQzthQUNyRTtZQUVELG9CQUFvQjtZQUNwQixJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtnQkFDbEMsSUFBSSxDQUFDLGdCQUFnQixDQUNwQixPQUFPLEVBQ1AsYUFBYSxFQUNiLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQztvQkFDekIsS0FBSyxPQUFPLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUNsQyxDQUFDO2FBQ0Y7WUFFRCxzQkFBc0I7WUFDdEIsSUFBSSxPQUFPLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7Z0JBQ3JDLElBQUksQ0FBQyxnQkFBZ0IsQ0FDcEIsT0FBTyxFQUNQLFlBQVksRUFDWixDQUFDLENBQUMsOEJBQThCLENBQUM7b0JBQ2hDLEtBQUssT0FBTyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FDckMsQ0FBQzthQUNGO1lBRUQsbUJBQW1CO1lBQ25CLElBQUksT0FBTyxDQUFDLGVBQWUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUN2QyxJQUFJLENBQUMscUJBQXFCLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQzthQUM3RDtZQUVELGNBQWM7WUFDZCxLQUFLLENBQUMsTUFBTSxDQUNYLE9BQU8sRUFDUCxDQUFDLENBQ0EsZ0dBQWdHLENBQ2hHLEVBQ0Q7Z0JBQ0MsT0FBTyxFQUFFLE1BQU07Z0JBQ2YsSUFBSSxFQUFFLE1BQU07Z0JBQ1osU0FBUyxFQUFFLGFBQWE7YUFDeEIsQ0FDRCxDQUFDO1NBQ0Y7UUFBQyxPQUFPLEtBQUssRUFBRTtZQUNmLE9BQU8sQ0FBQyxJQUFJLENBQUMsMkNBQTJDLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDakU7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSyxNQUFNLENBQUMsb0JBQW9CLENBQ2xDLFNBQXNCLEVBQ3RCLEtBQVk7UUFFWixNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDdkQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBRXJELE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUNqRCxPQUFPLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBRTlCLE1BQU07YUFDSixVQUFVLENBQUMsZ0JBQWdCLENBQUM7YUFDNUIsT0FBTyxDQUNQLENBQUMsQ0FBQyxxQ0FBcUMsQ0FBQyxHQUFHLEtBQUssS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUMvRCxDQUFDO1FBRUgsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUU7WUFDbkMsR0FBRyxFQUFFLHNCQUFzQjtTQUMzQixDQUFDLENBQUM7UUFFSCxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDdEIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNqQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDbkMsT0FBTyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSSxJQUFJLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1QyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRDs7T0FFRztJQUNLLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FDOUIsU0FBc0IsRUFDdEIsUUFBZ0IsRUFDaEIsSUFBWTtRQUVaLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDbkQsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUMvQyxPQUFPLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3hCLE9BQU8sQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2pELENBQUM7SUFFRDs7T0FFRztJQUNLLE1BQU0sQ0FBQyxxQkFBcUIsQ0FDbkMsU0FBc0IsRUFDdEIsT0FBaUI7UUFFakIsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDL0MsT0FBTyxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztRQUMxQixPQUFPLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1FBRWhFLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFO1lBQ25DLEdBQUcsRUFBRSx1QkFBdUI7U0FDNUIsQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQzFCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDakMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0QixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCB7IHNldEljb24gfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHtcclxuXHRPbmJvYXJkaW5nQ29uZmlnLFxyXG5cdE9uYm9hcmRpbmdDb25maWdNYW5hZ2VyLFxyXG59IGZyb20gXCJAL21hbmFnZXJzL29uYm9hcmRpbmctbWFuYWdlclwiO1xyXG5pbXBvcnQgeyBBbGVydCB9IGZyb20gXCIuLi8uLi91aS9BbGVydFwiO1xyXG5cclxuLyoqXHJcbiAqIENoYW5nZXMgUHJldmlldyBDb21wb25lbnQgLSBTaG93IHdoYXQgd2lsbCBjaGFuZ2VcclxuICovXHJcbmV4cG9ydCBjbGFzcyBDaGFuZ2VzUHJldmlldyB7XHJcblx0LyoqXHJcblx0ICogUmVuZGVyIGNvbmZpZ3VyYXRpb24gY2hhbmdlcyBwcmV2aWV3XHJcblx0ICovXHJcblx0c3RhdGljIHJlbmRlcihcclxuXHRcdGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXHJcblx0XHRjb25maWc6IE9uYm9hcmRpbmdDb25maWcsXHJcblx0XHRjb25maWdNYW5hZ2VyOiBPbmJvYXJkaW5nQ29uZmlnTWFuYWdlclxyXG5cdCkge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgcHJldmlldyA9IGNvbmZpZ01hbmFnZXIuZ2V0Q29uZmlndXJhdGlvblByZXZpZXcoY29uZmlnLm1vZGUpO1xyXG5cclxuXHRcdFx0Y29uc3Qgc2VjdGlvbiA9IGNvbnRhaW5lci5jcmVhdGVEaXYoXCJjb25maWctY2hhbmdlcy1zdW1tYXJ5XCIpO1xyXG5cdFx0XHRzZWN0aW9uLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiB0KFwiQ29uZmlndXJhdGlvbiBDaGFuZ2VzXCIpIH0pO1xyXG5cclxuXHRcdFx0Ly8gVXNlciBjdXN0b20gdmlld3MgcHJlc2VydmVkXHJcblx0XHRcdGlmIChwcmV2aWV3LnVzZXJDdXN0b21WaWV3c1ByZXNlcnZlZC5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0dGhpcy5yZW5kZXJQcmVzZXJ2ZWRWaWV3cyhzZWN0aW9uLCBwcmV2aWV3LnVzZXJDdXN0b21WaWV3c1ByZXNlcnZlZCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFZpZXdzIHRvIGJlIGFkZGVkXHJcblx0XHRcdGlmIChwcmV2aWV3LnZpZXdzVG9BZGQubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdHRoaXMucmVuZGVyQ2hhbmdlSXRlbShcclxuXHRcdFx0XHRcdHNlY3Rpb24sXHJcblx0XHRcdFx0XHRcInBsdXMtY2lyY2xlXCIsXHJcblx0XHRcdFx0XHR0KFwiTmV3IHZpZXdzIHRvIGJlIGFkZGVkXCIpICtcclxuXHRcdFx0XHRcdFx0YCAoJHtwcmV2aWV3LnZpZXdzVG9BZGQubGVuZ3RofSlgXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVmlld3MgdG8gYmUgdXBkYXRlZFxyXG5cdFx0XHRpZiAocHJldmlldy52aWV3c1RvVXBkYXRlLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHR0aGlzLnJlbmRlckNoYW5nZUl0ZW0oXHJcblx0XHRcdFx0XHRzZWN0aW9uLFxyXG5cdFx0XHRcdFx0XCJyZWZyZXNoLWN3XCIsXHJcblx0XHRcdFx0XHR0KFwiRXhpc3Rpbmcgdmlld3MgdG8gYmUgdXBkYXRlZFwiKSArXHJcblx0XHRcdFx0XHRcdGAgKCR7cHJldmlldy52aWV3c1RvVXBkYXRlLmxlbmd0aH0pYFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFNldHRpbmdzIGNoYW5nZXNcclxuXHRcdFx0aWYgKHByZXZpZXcuc2V0dGluZ3NDaGFuZ2VzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHR0aGlzLnJlbmRlclNldHRpbmdzQ2hhbmdlcyhzZWN0aW9uLCBwcmV2aWV3LnNldHRpbmdzQ2hhbmdlcyk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFNhZmV0eSBub3RlXHJcblx0XHRcdEFsZXJ0LmNyZWF0ZShcclxuXHRcdFx0XHRzZWN0aW9uLFxyXG5cdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcIk9ubHkgdGVtcGxhdGUgc2V0dGluZ3Mgd2lsbCBiZSBhcHBsaWVkLiBZb3VyIGV4aXN0aW5nIGN1c3RvbSBjb25maWd1cmF0aW9ucyB3aWxsIGJlIHByZXNlcnZlZC5cIlxyXG5cdFx0XHRcdCksXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dmFyaWFudDogXCJpbmZvXCIsXHJcblx0XHRcdFx0XHRpY29uOiBcImluZm9cIixcclxuXHRcdFx0XHRcdGNsYXNzTmFtZTogXCJzYWZldHktbm90ZVwiLFxyXG5cdFx0XHRcdH1cclxuXHRcdFx0KTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcIkNvdWxkIG5vdCBnZW5lcmF0ZSBjb25maWd1cmF0aW9uIHByZXZpZXc6XCIsIGVycm9yKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbmRlciBwcmVzZXJ2ZWQgdmlld3NcclxuXHQgKi9cclxuXHRwcml2YXRlIHN0YXRpYyByZW5kZXJQcmVzZXJ2ZWRWaWV3cyhcclxuXHRcdGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXHJcblx0XHR2aWV3czogYW55W11cclxuXHQpIHtcclxuXHRcdGNvbnN0IHNlY3Rpb24gPSBjb250YWluZXIuY3JlYXRlRGl2KFwicHJlc2VydmVkLXZpZXdzXCIpO1xyXG5cdFx0Y29uc3QgaGVhZGVyID0gc2VjdGlvbi5jcmVhdGVEaXYoXCJwcmVzZXJ2ZWQtaGVhZGVyXCIpO1xyXG5cclxuXHRcdGNvbnN0IGljb24gPSBoZWFkZXIuY3JlYXRlU3BhbihcInByZXNlcnZlZC1pY29uXCIpO1xyXG5cdFx0c2V0SWNvbihpY29uLCBcInNoaWVsZC1jaGVja1wiKTtcclxuXHJcblx0XHRoZWFkZXJcclxuXHRcdFx0LmNyZWF0ZVNwYW4oXCJwcmVzZXJ2ZWQtdGV4dFwiKVxyXG5cdFx0XHQuc2V0VGV4dChcclxuXHRcdFx0XHR0KFwiWW91ciBjdXN0b20gdmlld3Mgd2lsbCBiZSBwcmVzZXJ2ZWRcIikgKyBgICgke3ZpZXdzLmxlbmd0aH0pYFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdGNvbnN0IGxpc3QgPSBzZWN0aW9uLmNyZWF0ZUVsKFwidWxcIiwge1xyXG5cdFx0XHRjbHM6IFwicHJlc2VydmVkLXZpZXdzLWxpc3RcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdHZpZXdzLmZvckVhY2goKHZpZXcpID0+IHtcclxuXHRcdFx0Y29uc3QgaXRlbSA9IGxpc3QuY3JlYXRlRWwoXCJsaVwiKTtcclxuXHRcdFx0Y29uc3Qgdmlld0ljb24gPSBpdGVtLmNyZWF0ZVNwYW4oKTtcclxuXHRcdFx0c2V0SWNvbih2aWV3SWNvbiwgdmlldy5pY29uIHx8IFwibGlzdFwiKTtcclxuXHRcdFx0aXRlbS5jcmVhdGVTcGFuKCkuc2V0VGV4dChcIiBcIiArIHZpZXcubmFtZSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbmRlciBhIGNoYW5nZSBpdGVtXHJcblx0ICovXHJcblx0cHJpdmF0ZSBzdGF0aWMgcmVuZGVyQ2hhbmdlSXRlbShcclxuXHRcdGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXHJcblx0XHRpY29uTmFtZTogc3RyaW5nLFxyXG5cdFx0dGV4dDogc3RyaW5nXHJcblx0KSB7XHJcblx0XHRjb25zdCBzZWN0aW9uID0gY29udGFpbmVyLmNyZWF0ZURpdihcImNoYW5nZS1pdGVtXCIpO1xyXG5cdFx0Y29uc3QgaWNvbiA9IHNlY3Rpb24uY3JlYXRlU3BhbihcImNoYW5nZS1pY29uXCIpO1xyXG5cdFx0c2V0SWNvbihpY29uLCBpY29uTmFtZSk7XHJcblx0XHRzZWN0aW9uLmNyZWF0ZVNwYW4oXCJjaGFuZ2UtdGV4dFwiKS5zZXRUZXh0KHRleHQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVuZGVyIHNldHRpbmdzIGNoYW5nZXNcclxuXHQgKi9cclxuXHRwcml2YXRlIHN0YXRpYyByZW5kZXJTZXR0aW5nc0NoYW5nZXMoXHJcblx0XHRjb250YWluZXI6IEhUTUxFbGVtZW50LFxyXG5cdFx0Y2hhbmdlczogc3RyaW5nW11cclxuXHQpIHtcclxuXHRcdGNvbnN0IHNlY3Rpb24gPSBjb250YWluZXIuY3JlYXRlRGl2KFwic2V0dGluZ3MtY2hhbmdlc1wiKTtcclxuXHRcdGNvbnN0IGljb24gPSBzZWN0aW9uLmNyZWF0ZVNwYW4oXCJjaGFuZ2UtaWNvblwiKTtcclxuXHRcdHNldEljb24oaWNvbiwgXCJzZXR0aW5nc1wiKTtcclxuXHRcdHNlY3Rpb24uY3JlYXRlU3BhbihcImNoYW5nZS10ZXh0XCIpLnNldFRleHQodChcIkZlYXR1cmUgY2hhbmdlc1wiKSk7XHJcblxyXG5cdFx0Y29uc3QgbGlzdCA9IHNlY3Rpb24uY3JlYXRlRWwoXCJ1bFwiLCB7XHJcblx0XHRcdGNsczogXCJzZXR0aW5ncy1jaGFuZ2VzLWxpc3RcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNoYW5nZXMuZm9yRWFjaCgoY2hhbmdlKSA9PiB7XHJcblx0XHRcdGNvbnN0IGl0ZW0gPSBsaXN0LmNyZWF0ZUVsKFwibGlcIik7XHJcblx0XHRcdGl0ZW0uc2V0VGV4dChjaGFuZ2UpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG59XHJcbiJdfQ==