import { t } from "@/translations/helper";
import { ComponentPreviewFactory } from "../previews/ComponentPreviewFactory";
import "@/styles/onboarding-components.css";
export class FluentOtherViewsStep {
    static render(headerEl, contentEl, controller) {
        headerEl.empty();
        contentEl.empty();
        headerEl.createEl("h1", { text: t("Other Views") });
        headerEl.createEl("p", {
            text: t("Access Calendar, Gantt and Tags from the other views section"),
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
        const other = preview.querySelector(".fluent-sidebar-section-other");
        other === null || other === void 0 ? void 0 : other.classList.add("is-focused");
        const dimTargets = preview.querySelectorAll(".fluent-sidebar-section-primary, .fluent-sidebar-section-projects");
        dimTargets.forEach((el) => el.classList.add("is-dimmed"));
        desc.createEl("h3", { text: t("Specialized views") });
        desc.createEl("p", {
            text: t("Quickly reach views like Calendar, Gantt, Flagged and Tags, etc."),
        });
        const ul = desc.createEl("ul", { cls: "component-feature-list" });
        [
            t("Compact list with clear icons"),
            t("Right click for more options"),
        ].forEach((txt) => ul.createEl("li", { text: txt }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmx1ZW50T3RoZXJWaWV3c1N0ZXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJGbHVlbnRPdGhlclZpZXdzU3RlcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFMUMsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUUsT0FBTyxvQ0FBb0MsQ0FBQztBQUU1QyxNQUFNLE9BQU8sb0JBQW9CO0lBQ2hDLE1BQU0sQ0FBQyxNQUFNLENBQ1osUUFBcUIsRUFDckIsU0FBc0IsRUFDdEIsVUFBZ0M7UUFFaEMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2pCLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUVsQixRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3BELFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFO1lBQ3RCLElBQUksRUFBRSxDQUFDLENBQ04sOERBQThELENBQzlEO1lBQ0QsR0FBRyxFQUFFLHFCQUFxQjtTQUMxQixDQUFDLENBQUM7UUFFSCxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLG9CQUFvQixFQUFFLENBQUMsQ0FBQztRQUNwRSxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDO1lBQ2xDLEdBQUcsRUFBRSx1Q0FBdUM7U0FDNUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQztZQUMvQixHQUFHLEVBQUUsZ0NBQWdDO1NBQ3JDLENBQUMsQ0FBQztRQUVILHVCQUF1QixDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRXRELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQ2xDLCtCQUErQixDQUMvQixDQUFDO1FBQ0YsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLFNBQVMsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFbkMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUMxQyxtRUFBbUUsQ0FDbkUsQ0FBQztRQUNGLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFFMUQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3RELElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFO1lBQ2xCLElBQUksRUFBRSxDQUFDLENBQ04sa0VBQWtFLENBQ2xFO1NBQ0QsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxHQUFHLEVBQUUsd0JBQXdCLEVBQUUsQ0FBQyxDQUFDO1FBQ2xFO1lBQ0MsQ0FBQyxDQUFDLCtCQUErQixDQUFDO1lBQ2xDLENBQUMsQ0FBQyw4QkFBOEIsQ0FBQztTQUNqQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3RELENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCB7IE9uYm9hcmRpbmdDb250cm9sbGVyIH0gZnJvbSBcIi4uL09uYm9hcmRpbmdDb250cm9sbGVyXCI7XHJcbmltcG9ydCB7IENvbXBvbmVudFByZXZpZXdGYWN0b3J5IH0gZnJvbSBcIi4uL3ByZXZpZXdzL0NvbXBvbmVudFByZXZpZXdGYWN0b3J5XCI7XHJcbmltcG9ydCBcIkAvc3R5bGVzL29uYm9hcmRpbmctY29tcG9uZW50cy5jc3NcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBGbHVlbnRPdGhlclZpZXdzU3RlcCB7XHJcblx0c3RhdGljIHJlbmRlcihcclxuXHRcdGhlYWRlckVsOiBIVE1MRWxlbWVudCxcclxuXHRcdGNvbnRlbnRFbDogSFRNTEVsZW1lbnQsXHJcblx0XHRjb250cm9sbGVyOiBPbmJvYXJkaW5nQ29udHJvbGxlclxyXG5cdCkge1xyXG5cdFx0aGVhZGVyRWwuZW1wdHkoKTtcclxuXHRcdGNvbnRlbnRFbC5lbXB0eSgpO1xyXG5cclxuXHRcdGhlYWRlckVsLmNyZWF0ZUVsKFwiaDFcIiwgeyB0ZXh0OiB0KFwiT3RoZXIgVmlld3NcIikgfSk7XHJcblx0XHRoZWFkZXJFbC5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFxyXG5cdFx0XHRcdFwiQWNjZXNzIENhbGVuZGFyLCBHYW50dCBhbmQgVGFncyBmcm9tIHRoZSBvdGhlciB2aWV3cyBzZWN0aW9uXCJcclxuXHRcdFx0KSxcclxuXHRcdFx0Y2xzOiBcIm9uYm9hcmRpbmctc3VidGl0bGVcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IHNob3djYXNlID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJjb21wb25lbnQtc2hvd2Nhc2VcIiB9KTtcclxuXHRcdGNvbnN0IHByZXZpZXcgPSBzaG93Y2FzZS5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiY29tcG9uZW50LXNob3djYXNlLXByZXZpZXcgZm9jdXMtbW9kZVwiLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCBkZXNjID0gc2hvd2Nhc2UuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImNvbXBvbmVudC1zaG93Y2FzZS1kZXNjcmlwdGlvblwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Q29tcG9uZW50UHJldmlld0ZhY3RvcnkuY3JlYXRlU2lkZWJhclByZXZpZXcocHJldmlldyk7XHJcblxyXG5cdFx0Y29uc3Qgb3RoZXIgPSBwcmV2aWV3LnF1ZXJ5U2VsZWN0b3I8SFRNTEVsZW1lbnQ+KFxyXG5cdFx0XHRcIi5mbHVlbnQtc2lkZWJhci1zZWN0aW9uLW90aGVyXCJcclxuXHRcdCk7XHJcblx0XHRvdGhlcj8uY2xhc3NMaXN0LmFkZChcImlzLWZvY3VzZWRcIik7XHJcblxyXG5cdFx0Y29uc3QgZGltVGFyZ2V0cyA9IHByZXZpZXcucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oXHJcblx0XHRcdFwiLmZsdWVudC1zaWRlYmFyLXNlY3Rpb24tcHJpbWFyeSwgLmZsdWVudC1zaWRlYmFyLXNlY3Rpb24tcHJvamVjdHNcIlxyXG5cdFx0KTtcclxuXHRcdGRpbVRhcmdldHMuZm9yRWFjaCgoZWwpID0+IGVsLmNsYXNzTGlzdC5hZGQoXCJpcy1kaW1tZWRcIikpO1xyXG5cclxuXHRcdGRlc2MuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IHQoXCJTcGVjaWFsaXplZCB2aWV3c1wiKSB9KTtcclxuXHRcdGRlc2MuY3JlYXRlRWwoXCJwXCIsIHtcclxuXHRcdFx0dGV4dDogdChcclxuXHRcdFx0XHRcIlF1aWNrbHkgcmVhY2ggdmlld3MgbGlrZSBDYWxlbmRhciwgR2FudHQsIEZsYWdnZWQgYW5kIFRhZ3MsIGV0Yy5cIlxyXG5cdFx0XHQpLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCB1bCA9IGRlc2MuY3JlYXRlRWwoXCJ1bFwiLCB7IGNsczogXCJjb21wb25lbnQtZmVhdHVyZS1saXN0XCIgfSk7XHJcblx0XHRbXHJcblx0XHRcdHQoXCJDb21wYWN0IGxpc3Qgd2l0aCBjbGVhciBpY29uc1wiKSxcclxuXHRcdFx0dChcIlJpZ2h0IGNsaWNrIGZvciBtb3JlIG9wdGlvbnNcIiksXHJcblx0XHRdLmZvckVhY2goKHR4dCkgPT4gdWwuY3JlYXRlRWwoXCJsaVwiLCB7IHRleHQ6IHR4dCB9KSk7XHJcblx0fVxyXG59XHJcbiJdfQ==