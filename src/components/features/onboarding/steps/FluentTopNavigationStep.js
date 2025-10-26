import { t } from "@/translations/helper";
import { ComponentPreviewFactory } from "../previews/ComponentPreviewFactory";
import "@/styles/onboarding-components.css";
export class FluentTopNavigationStep {
    static render(headerEl, contentEl, controller) {
        headerEl.empty();
        contentEl.empty();
        headerEl.createEl("h1", { text: t("Top Navigation") });
        headerEl.createEl("p", {
            text: t("Search, switch views, and access quick settings from the top bar"),
            cls: "onboarding-subtitle",
        });
        const showcase = contentEl.createDiv({ cls: "component-showcase" });
        const preview = showcase.createDiv({
            cls: "component-showcase-preview focus-mode",
        });
        const desc = showcase.createDiv({
            cls: "component-showcase-description",
        });
        ComponentPreviewFactory.createTopNavigationPreview(preview);
        const topNav = preview.querySelector(".fluent-top-navigation");
        topNav === null || topNav === void 0 ? void 0 : topNav.classList.add("is-focused");
        desc.createEl("h3", { text: t("Global controls") });
        desc.createEl("p", {
            text: t("Use the top bar to search across everything, switch view modes, and open notifications or settings."),
        });
        const ul = desc.createEl("ul", { cls: "component-feature-list" });
        [
            t("Quick view mode switching"),
            t("Accessible controls with clear icons"),
        ].forEach((txt) => ul.createEl("li", { text: txt }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmx1ZW50VG9wTmF2aWdhdGlvblN0ZXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJGbHVlbnRUb3BOYXZpZ2F0aW9uU3RlcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFMUMsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUUsT0FBTyxvQ0FBb0MsQ0FBQztBQUU1QyxNQUFNLE9BQU8sdUJBQXVCO0lBQ25DLE1BQU0sQ0FBQyxNQUFNLENBQ1osUUFBcUIsRUFDckIsU0FBc0IsRUFDdEIsVUFBZ0M7UUFFaEMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2pCLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUVsQixRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdkQsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7WUFDdEIsSUFBSSxFQUFFLENBQUMsQ0FDTixrRUFBa0UsQ0FDbEU7WUFDRCxHQUFHLEVBQUUscUJBQXFCO1NBQzFCLENBQUMsQ0FBQztRQUVILE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUM7WUFDbEMsR0FBRyxFQUFFLHVDQUF1QztTQUM1QyxDQUFDLENBQUM7UUFDSCxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDO1lBQy9CLEdBQUcsRUFBRSxnQ0FBZ0M7U0FDckMsQ0FBQyxDQUFDO1FBRUgsdUJBQXVCLENBQUMsMEJBQTBCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFNUQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FDbkMsd0JBQXdCLENBQ3hCLENBQUM7UUFDRixNQUFNLGFBQU4sTUFBTSx1QkFBTixNQUFNLENBQUUsU0FBUyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUVwQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7WUFDbEIsSUFBSSxFQUFFLENBQUMsQ0FDTixxR0FBcUcsQ0FDckc7U0FDRCxDQUFDLENBQUM7UUFDSCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEdBQUcsRUFBRSx3QkFBd0IsRUFBRSxDQUFDLENBQUM7UUFDbEU7WUFDQyxDQUFDLENBQUMsMkJBQTJCLENBQUM7WUFDOUIsQ0FBQyxDQUFDLHNDQUFzQyxDQUFDO1NBQ3pDLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDdEQsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHsgT25ib2FyZGluZ0NvbnRyb2xsZXIgfSBmcm9tIFwiLi4vT25ib2FyZGluZ0NvbnRyb2xsZXJcIjtcclxuaW1wb3J0IHsgQ29tcG9uZW50UHJldmlld0ZhY3RvcnkgfSBmcm9tIFwiLi4vcHJldmlld3MvQ29tcG9uZW50UHJldmlld0ZhY3RvcnlcIjtcclxuaW1wb3J0IFwiQC9zdHlsZXMvb25ib2FyZGluZy1jb21wb25lbnRzLmNzc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEZsdWVudFRvcE5hdmlnYXRpb25TdGVwIHtcclxuXHRzdGF0aWMgcmVuZGVyKFxyXG5cdFx0aGVhZGVyRWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0Y29udGVudEVsOiBIVE1MRWxlbWVudCxcclxuXHRcdGNvbnRyb2xsZXI6IE9uYm9hcmRpbmdDb250cm9sbGVyXHJcblx0KSB7XHJcblx0XHRoZWFkZXJFbC5lbXB0eSgpO1xyXG5cdFx0Y29udGVudEVsLmVtcHR5KCk7XHJcblxyXG5cdFx0aGVhZGVyRWwuY3JlYXRlRWwoXCJoMVwiLCB7IHRleHQ6IHQoXCJUb3AgTmF2aWdhdGlvblwiKSB9KTtcclxuXHRcdGhlYWRlckVsLmNyZWF0ZUVsKFwicFwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXHJcblx0XHRcdFx0XCJTZWFyY2gsIHN3aXRjaCB2aWV3cywgYW5kIGFjY2VzcyBxdWljayBzZXR0aW5ncyBmcm9tIHRoZSB0b3AgYmFyXCJcclxuXHRcdFx0KSxcclxuXHRcdFx0Y2xzOiBcIm9uYm9hcmRpbmctc3VidGl0bGVcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IHNob3djYXNlID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJjb21wb25lbnQtc2hvd2Nhc2VcIiB9KTtcclxuXHRcdGNvbnN0IHByZXZpZXcgPSBzaG93Y2FzZS5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiY29tcG9uZW50LXNob3djYXNlLXByZXZpZXcgZm9jdXMtbW9kZVwiLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCBkZXNjID0gc2hvd2Nhc2UuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImNvbXBvbmVudC1zaG93Y2FzZS1kZXNjcmlwdGlvblwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Q29tcG9uZW50UHJldmlld0ZhY3RvcnkuY3JlYXRlVG9wTmF2aWdhdGlvblByZXZpZXcocHJldmlldyk7XHJcblxyXG5cdFx0Y29uc3QgdG9wTmF2ID0gcHJldmlldy5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PihcclxuXHRcdFx0XCIuZmx1ZW50LXRvcC1uYXZpZ2F0aW9uXCJcclxuXHRcdCk7XHJcblx0XHR0b3BOYXY/LmNsYXNzTGlzdC5hZGQoXCJpcy1mb2N1c2VkXCIpO1xyXG5cclxuXHRcdGRlc2MuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IHQoXCJHbG9iYWwgY29udHJvbHNcIikgfSk7XHJcblx0XHRkZXNjLmNyZWF0ZUVsKFwicFwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXHJcblx0XHRcdFx0XCJVc2UgdGhlIHRvcCBiYXIgdG8gc2VhcmNoIGFjcm9zcyBldmVyeXRoaW5nLCBzd2l0Y2ggdmlldyBtb2RlcywgYW5kIG9wZW4gbm90aWZpY2F0aW9ucyBvciBzZXR0aW5ncy5cIlxyXG5cdFx0XHQpLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCB1bCA9IGRlc2MuY3JlYXRlRWwoXCJ1bFwiLCB7IGNsczogXCJjb21wb25lbnQtZmVhdHVyZS1saXN0XCIgfSk7XHJcblx0XHRbXHJcblx0XHRcdHQoXCJRdWljayB2aWV3IG1vZGUgc3dpdGNoaW5nXCIpLFxyXG5cdFx0XHR0KFwiQWNjZXNzaWJsZSBjb250cm9scyB3aXRoIGNsZWFyIGljb25zXCIpLFxyXG5cdFx0XS5mb3JFYWNoKCh0eHQpID0+IHVsLmNyZWF0ZUVsKFwibGlcIiwgeyB0ZXh0OiB0eHQgfSkpO1xyXG5cdH1cclxufVxyXG4iXX0=