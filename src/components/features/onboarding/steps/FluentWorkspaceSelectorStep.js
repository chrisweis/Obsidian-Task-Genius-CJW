import { t } from "@/translations/helper";
import { ComponentPreviewFactory } from "../previews/ComponentPreviewFactory";
import "@/styles/onboarding-components.css";
export class FluentWorkspaceSelectorStep {
    static render(headerEl, contentEl, controller) {
        headerEl.empty();
        contentEl.empty();
        headerEl.createEl("h1", { text: t("Workspace Selector") });
        headerEl.createEl("p", {
            text: t("Switch and manage workspaces from the top of the sidebar"),
            cls: "onboarding-subtitle",
        });
        const showcase = contentEl.createDiv({ cls: "component-showcase" });
        const preview = showcase.createDiv({
            cls: "component-showcase-preview focus-mode",
        });
        const desc = showcase.createDiv({
            cls: "component-showcase-description",
        });
        ComponentPreviewFactory.createSidebarPreview(preview);
        // Focus workspace selector, dim other parts
        const wsBtn = preview.querySelector(".workspace-selector-button");
        wsBtn === null || wsBtn === void 0 ? void 0 : wsBtn.classList.add("is-focused");
        const contentSections = preview.querySelectorAll(".fluent-sidebar-content, .fluent-navigation-list, .fluent-project-list, .fluent-section-header, .fluent-top-navigation");
        contentSections.forEach((el) => {
            if (!wsBtn || !el.contains(wsBtn))
                el.classList.add("is-dimmed");
        });
        desc.createEl("h3", { text: t("Manage your spaces") });
        desc.createEl("p", {
            text: t("Use the workspace selector to switch between personal, work, or any custom workspace."),
        });
        const ul = desc.createEl("ul", { cls: "component-feature-list" });
        [
            t("Quickly toggle between multiple workspaces"),
            t("Create and organize workspaces for different contexts"),
            t("Consistent placement at the top of the sidebar"),
        ].forEach((txt) => ul.createEl("li", { text: txt }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmx1ZW50V29ya3NwYWNlU2VsZWN0b3JTdGVwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiRmx1ZW50V29ya3NwYWNlU2VsZWN0b3JTdGVwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUUxQyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RSxPQUFPLG9DQUFvQyxDQUFDO0FBRTVDLE1BQU0sT0FBTywyQkFBMkI7SUFDdkMsTUFBTSxDQUFDLE1BQU0sQ0FDWixRQUFxQixFQUNyQixTQUFzQixFQUN0QixVQUFnQztRQUVoQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDakIsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRWxCLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMzRCxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRTtZQUN0QixJQUFJLEVBQUUsQ0FBQyxDQUFDLDBEQUEwRCxDQUFDO1lBQ25FLEdBQUcsRUFBRSxxQkFBcUI7U0FDMUIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxvQkFBb0IsRUFBRSxDQUFDLENBQUM7UUFDcEUsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQztZQUNsQyxHQUFHLEVBQUUsdUNBQXVDO1NBQzVDLENBQUMsQ0FBQztRQUNILE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUM7WUFDL0IsR0FBRyxFQUFFLGdDQUFnQztTQUNyQyxDQUFDLENBQUM7UUFFSCx1QkFBdUIsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUV0RCw0Q0FBNEM7UUFDNUMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FDbEMsNEJBQTRCLENBQzVCLENBQUM7UUFDRixLQUFLLGFBQUwsS0FBSyx1QkFBTCxLQUFLLENBQUUsU0FBUyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUVuQyxNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQy9DLHdIQUF3SCxDQUN4SCxDQUFDO1FBQ0YsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFO1lBQzlCLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztnQkFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNsRSxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN2RCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRTtZQUNsQixJQUFJLEVBQUUsQ0FBQyxDQUNOLHVGQUF1RixDQUN2RjtTQUNELENBQUMsQ0FBQztRQUNILE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsR0FBRyxFQUFFLHdCQUF3QixFQUFFLENBQUMsQ0FBQztRQUNsRTtZQUNDLENBQUMsQ0FBQyw0Q0FBNEMsQ0FBQztZQUMvQyxDQUFDLENBQUMsdURBQXVELENBQUM7WUFDMUQsQ0FBQyxDQUFDLGdEQUFnRCxDQUFDO1NBQ25ELENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDdEQsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHsgT25ib2FyZGluZ0NvbnRyb2xsZXIgfSBmcm9tIFwiLi4vT25ib2FyZGluZ0NvbnRyb2xsZXJcIjtcclxuaW1wb3J0IHsgQ29tcG9uZW50UHJldmlld0ZhY3RvcnkgfSBmcm9tIFwiLi4vcHJldmlld3MvQ29tcG9uZW50UHJldmlld0ZhY3RvcnlcIjtcclxuaW1wb3J0IFwiQC9zdHlsZXMvb25ib2FyZGluZy1jb21wb25lbnRzLmNzc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEZsdWVudFdvcmtzcGFjZVNlbGVjdG9yU3RlcCB7XHJcblx0c3RhdGljIHJlbmRlcihcclxuXHRcdGhlYWRlckVsOiBIVE1MRWxlbWVudCxcclxuXHRcdGNvbnRlbnRFbDogSFRNTEVsZW1lbnQsXHJcblx0XHRjb250cm9sbGVyOiBPbmJvYXJkaW5nQ29udHJvbGxlclxyXG5cdCkge1xyXG5cdFx0aGVhZGVyRWwuZW1wdHkoKTtcclxuXHRcdGNvbnRlbnRFbC5lbXB0eSgpO1xyXG5cclxuXHRcdGhlYWRlckVsLmNyZWF0ZUVsKFwiaDFcIiwgeyB0ZXh0OiB0KFwiV29ya3NwYWNlIFNlbGVjdG9yXCIpIH0pO1xyXG5cdFx0aGVhZGVyRWwuY3JlYXRlRWwoXCJwXCIsIHtcclxuXHRcdFx0dGV4dDogdChcIlN3aXRjaCBhbmQgbWFuYWdlIHdvcmtzcGFjZXMgZnJvbSB0aGUgdG9wIG9mIHRoZSBzaWRlYmFyXCIpLFxyXG5cdFx0XHRjbHM6IFwib25ib2FyZGluZy1zdWJ0aXRsZVwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3Qgc2hvd2Nhc2UgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcImNvbXBvbmVudC1zaG93Y2FzZVwiIH0pO1xyXG5cdFx0Y29uc3QgcHJldmlldyA9IHNob3djYXNlLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJjb21wb25lbnQtc2hvd2Nhc2UtcHJldmlldyBmb2N1cy1tb2RlXCIsXHJcblx0XHR9KTtcclxuXHRcdGNvbnN0IGRlc2MgPSBzaG93Y2FzZS5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiY29tcG9uZW50LXNob3djYXNlLWRlc2NyaXB0aW9uXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHRDb21wb25lbnRQcmV2aWV3RmFjdG9yeS5jcmVhdGVTaWRlYmFyUHJldmlldyhwcmV2aWV3KTtcclxuXHJcblx0XHQvLyBGb2N1cyB3b3Jrc3BhY2Ugc2VsZWN0b3IsIGRpbSBvdGhlciBwYXJ0c1xyXG5cdFx0Y29uc3Qgd3NCdG4gPSBwcmV2aWV3LnF1ZXJ5U2VsZWN0b3I8SFRNTEVsZW1lbnQ+KFxyXG5cdFx0XHRcIi53b3Jrc3BhY2Utc2VsZWN0b3ItYnV0dG9uXCJcclxuXHRcdCk7XHJcblx0XHR3c0J0bj8uY2xhc3NMaXN0LmFkZChcImlzLWZvY3VzZWRcIik7XHJcblxyXG5cdFx0Y29uc3QgY29udGVudFNlY3Rpb25zID0gcHJldmlldy5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PihcclxuXHRcdFx0XCIuZmx1ZW50LXNpZGViYXItY29udGVudCwgLmZsdWVudC1uYXZpZ2F0aW9uLWxpc3QsIC5mbHVlbnQtcHJvamVjdC1saXN0LCAuZmx1ZW50LXNlY3Rpb24taGVhZGVyLCAuZmx1ZW50LXRvcC1uYXZpZ2F0aW9uXCJcclxuXHRcdCk7XHJcblx0XHRjb250ZW50U2VjdGlvbnMuZm9yRWFjaCgoZWwpID0+IHtcclxuXHRcdFx0aWYgKCF3c0J0biB8fCAhZWwuY29udGFpbnMod3NCdG4pKSBlbC5jbGFzc0xpc3QuYWRkKFwiaXMtZGltbWVkXCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0ZGVzYy5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogdChcIk1hbmFnZSB5b3VyIHNwYWNlc1wiKSB9KTtcclxuXHRcdGRlc2MuY3JlYXRlRWwoXCJwXCIsIHtcclxuXHRcdFx0dGV4dDogdChcclxuXHRcdFx0XHRcIlVzZSB0aGUgd29ya3NwYWNlIHNlbGVjdG9yIHRvIHN3aXRjaCBiZXR3ZWVuIHBlcnNvbmFsLCB3b3JrLCBvciBhbnkgY3VzdG9tIHdvcmtzcGFjZS5cIlxyXG5cdFx0XHQpLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCB1bCA9IGRlc2MuY3JlYXRlRWwoXCJ1bFwiLCB7IGNsczogXCJjb21wb25lbnQtZmVhdHVyZS1saXN0XCIgfSk7XHJcblx0XHRbXHJcblx0XHRcdHQoXCJRdWlja2x5IHRvZ2dsZSBiZXR3ZWVuIG11bHRpcGxlIHdvcmtzcGFjZXNcIiksXHJcblx0XHRcdHQoXCJDcmVhdGUgYW5kIG9yZ2FuaXplIHdvcmtzcGFjZXMgZm9yIGRpZmZlcmVudCBjb250ZXh0c1wiKSxcclxuXHRcdFx0dChcIkNvbnNpc3RlbnQgcGxhY2VtZW50IGF0IHRoZSB0b3Agb2YgdGhlIHNpZGViYXJcIiksXHJcblx0XHRdLmZvckVhY2goKHR4dCkgPT4gdWwuY3JlYXRlRWwoXCJsaVwiLCB7IHRleHQ6IHR4dCB9KSk7XHJcblx0fVxyXG59XHJcbiJdfQ==