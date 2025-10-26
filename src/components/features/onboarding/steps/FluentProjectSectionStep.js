import { t } from "@/translations/helper";
import { ComponentPreviewFactory } from "../previews/ComponentPreviewFactory";
import "@/styles/onboarding-components.css";
export class FluentProjectSectionStep {
    static render(headerEl, contentEl, controller) {
        headerEl.empty();
        contentEl.empty();
        headerEl.createEl("h1", { text: t("Projects Section") });
        headerEl.createEl("p", {
            text: t("Organize your work with projects and hierarchies"),
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
        const projects = preview.querySelector(".fluent-sidebar-section-projects");
        projects === null || projects === void 0 ? void 0 : projects.classList.add("is-focused");
        const dimTargets = preview.querySelectorAll(".fluent-sidebar-section-primary, .fluent-sidebar-section-other");
        dimTargets.forEach((el) => el.classList.add("is-dimmed"));
        desc.createEl("h3", { text: t("Project organization") });
        desc.createEl("p", {
            text: t("Group related tasks under projects. Build nested hierarchies and get quick stats."),
        });
        const ul = desc.createEl("ul", { cls: "component-feature-list" });
        [
            t("Color-coded projects with counts (You can change the color in the settings)"),
            t("Supports nested structures for complex work"),
            t("Right click for more options"),
            t("Sort projects by name or tasks count, etc."),
        ].forEach((txt) => ul.createEl("li", { text: txt }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmx1ZW50UHJvamVjdFNlY3Rpb25TdGVwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiRmx1ZW50UHJvamVjdFNlY3Rpb25TdGVwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUUxQyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RSxPQUFPLG9DQUFvQyxDQUFDO0FBRTVDLE1BQU0sT0FBTyx3QkFBd0I7SUFDcEMsTUFBTSxDQUFDLE1BQU0sQ0FDWixRQUFxQixFQUNyQixTQUFzQixFQUN0QixVQUFnQztRQUVoQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDakIsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRWxCLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN6RCxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRTtZQUN0QixJQUFJLEVBQUUsQ0FBQyxDQUFDLGtEQUFrRCxDQUFDO1lBQzNELEdBQUcsRUFBRSxxQkFBcUI7U0FDMUIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxvQkFBb0IsRUFBRSxDQUFDLENBQUM7UUFDcEUsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQztZQUNsQyxHQUFHLEVBQUUsdUNBQXVDO1NBQzVDLENBQUMsQ0FBQztRQUNILE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUM7WUFDL0IsR0FBRyxFQUFFLGdDQUFnQztTQUNyQyxDQUFDLENBQUM7UUFFSCx1QkFBdUIsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUV0RCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUNyQyxrQ0FBa0MsQ0FDbEMsQ0FBQztRQUNGLFFBQVEsYUFBUixRQUFRLHVCQUFSLFFBQVEsQ0FBRSxTQUFTLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBRXRDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FDMUMsZ0VBQWdFLENBQ2hFLENBQUM7UUFDRixVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBRTFELElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN6RCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRTtZQUNsQixJQUFJLEVBQUUsQ0FBQyxDQUNOLG1GQUFtRixDQUNuRjtTQUNELENBQUMsQ0FBQztRQUNILE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsR0FBRyxFQUFFLHdCQUF3QixFQUFFLENBQUMsQ0FBQztRQUNsRTtZQUNDLENBQUMsQ0FDQSw2RUFBNkUsQ0FDN0U7WUFDRCxDQUFDLENBQUMsNkNBQTZDLENBQUM7WUFDaEQsQ0FBQyxDQUFDLDhCQUE4QixDQUFDO1lBQ2pDLENBQUMsQ0FBQyw0Q0FBNEMsQ0FBQztTQUMvQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3RELENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCB7IE9uYm9hcmRpbmdDb250cm9sbGVyIH0gZnJvbSBcIi4uL09uYm9hcmRpbmdDb250cm9sbGVyXCI7XHJcbmltcG9ydCB7IENvbXBvbmVudFByZXZpZXdGYWN0b3J5IH0gZnJvbSBcIi4uL3ByZXZpZXdzL0NvbXBvbmVudFByZXZpZXdGYWN0b3J5XCI7XHJcbmltcG9ydCBcIkAvc3R5bGVzL29uYm9hcmRpbmctY29tcG9uZW50cy5jc3NcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBGbHVlbnRQcm9qZWN0U2VjdGlvblN0ZXAge1xyXG5cdHN0YXRpYyByZW5kZXIoXHJcblx0XHRoZWFkZXJFbDogSFRNTEVsZW1lbnQsXHJcblx0XHRjb250ZW50RWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0Y29udHJvbGxlcjogT25ib2FyZGluZ0NvbnRyb2xsZXJcclxuXHQpIHtcclxuXHRcdGhlYWRlckVsLmVtcHR5KCk7XHJcblx0XHRjb250ZW50RWwuZW1wdHkoKTtcclxuXHJcblx0XHRoZWFkZXJFbC5jcmVhdGVFbChcImgxXCIsIHsgdGV4dDogdChcIlByb2plY3RzIFNlY3Rpb25cIikgfSk7XHJcblx0XHRoZWFkZXJFbC5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFwiT3JnYW5pemUgeW91ciB3b3JrIHdpdGggcHJvamVjdHMgYW5kIGhpZXJhcmNoaWVzXCIpLFxyXG5cdFx0XHRjbHM6IFwib25ib2FyZGluZy1zdWJ0aXRsZVwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3Qgc2hvd2Nhc2UgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcImNvbXBvbmVudC1zaG93Y2FzZVwiIH0pO1xyXG5cdFx0Y29uc3QgcHJldmlldyA9IHNob3djYXNlLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJjb21wb25lbnQtc2hvd2Nhc2UtcHJldmlldyBmb2N1cy1tb2RlXCIsXHJcblx0XHR9KTtcclxuXHRcdGNvbnN0IGRlc2MgPSBzaG93Y2FzZS5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiY29tcG9uZW50LXNob3djYXNlLWRlc2NyaXB0aW9uXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHRDb21wb25lbnRQcmV2aWV3RmFjdG9yeS5jcmVhdGVTaWRlYmFyUHJldmlldyhwcmV2aWV3KTtcclxuXHJcblx0XHRjb25zdCBwcm9qZWN0cyA9IHByZXZpZXcucXVlcnlTZWxlY3RvcjxIVE1MRWxlbWVudD4oXHJcblx0XHRcdFwiLmZsdWVudC1zaWRlYmFyLXNlY3Rpb24tcHJvamVjdHNcIlxyXG5cdFx0KTtcclxuXHRcdHByb2plY3RzPy5jbGFzc0xpc3QuYWRkKFwiaXMtZm9jdXNlZFwiKTtcclxuXHJcblx0XHRjb25zdCBkaW1UYXJnZXRzID0gcHJldmlldy5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PihcclxuXHRcdFx0XCIuZmx1ZW50LXNpZGViYXItc2VjdGlvbi1wcmltYXJ5LCAuZmx1ZW50LXNpZGViYXItc2VjdGlvbi1vdGhlclwiXHJcblx0XHQpO1xyXG5cdFx0ZGltVGFyZ2V0cy5mb3JFYWNoKChlbCkgPT4gZWwuY2xhc3NMaXN0LmFkZChcImlzLWRpbW1lZFwiKSk7XHJcblxyXG5cdFx0ZGVzYy5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogdChcIlByb2plY3Qgb3JnYW5pemF0aW9uXCIpIH0pO1xyXG5cdFx0ZGVzYy5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFxyXG5cdFx0XHRcdFwiR3JvdXAgcmVsYXRlZCB0YXNrcyB1bmRlciBwcm9qZWN0cy4gQnVpbGQgbmVzdGVkIGhpZXJhcmNoaWVzIGFuZCBnZXQgcXVpY2sgc3RhdHMuXCJcclxuXHRcdFx0KSxcclxuXHRcdH0pO1xyXG5cdFx0Y29uc3QgdWwgPSBkZXNjLmNyZWF0ZUVsKFwidWxcIiwgeyBjbHM6IFwiY29tcG9uZW50LWZlYXR1cmUtbGlzdFwiIH0pO1xyXG5cdFx0W1xyXG5cdFx0XHR0KFxyXG5cdFx0XHRcdFwiQ29sb3ItY29kZWQgcHJvamVjdHMgd2l0aCBjb3VudHMgKFlvdSBjYW4gY2hhbmdlIHRoZSBjb2xvciBpbiB0aGUgc2V0dGluZ3MpXCJcclxuXHRcdFx0KSxcclxuXHRcdFx0dChcIlN1cHBvcnRzIG5lc3RlZCBzdHJ1Y3R1cmVzIGZvciBjb21wbGV4IHdvcmtcIiksXHJcblx0XHRcdHQoXCJSaWdodCBjbGljayBmb3IgbW9yZSBvcHRpb25zXCIpLFxyXG5cdFx0XHR0KFwiU29ydCBwcm9qZWN0cyBieSBuYW1lIG9yIHRhc2tzIGNvdW50LCBldGMuXCIpLFxyXG5cdFx0XS5mb3JFYWNoKCh0eHQpID0+IHVsLmNyZWF0ZUVsKFwibGlcIiwgeyB0ZXh0OiB0eHQgfSkpO1xyXG5cdH1cclxufVxyXG4iXX0=