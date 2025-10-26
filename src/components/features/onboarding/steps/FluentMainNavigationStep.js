import { t } from "@/translations/helper";
import { ComponentPreviewFactory } from "../previews/ComponentPreviewFactory";
import "@/styles/onboarding-components.css";
export class FluentMainNavigationStep {
    static render(headerEl, contentEl, controller) {
        headerEl.empty();
        contentEl.empty();
        headerEl.createEl("h1", { text: t("Main Navigation") });
        headerEl.createEl("p", {
            text: t("Access Inbox, Today, Upcoming and more from the primary section"),
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
        const primary = preview.querySelector(".fluent-sidebar-section-primary");
        primary === null || primary === void 0 ? void 0 : primary.classList.add("is-focused");
        const dimTargets = preview.querySelectorAll(".fluent-sidebar-section-projects, .fluent-sidebar-section-other");
        dimTargets.forEach((el) => el.classList.add("is-dimmed"));
        desc.createEl("h3", { text: t("Navigate core views") });
        desc.createEl("p", {
            text: t("Quickly jump to core views like Inbox, Today, Upcoming and Flagged."),
        });
        const ul = desc.createEl("ul", { cls: "component-feature-list" });
        [
            t("Unread counts and indicators keep you informed"),
            t("Keyboard-ready with clear selection states"),
        ].forEach((txt) => ul.createEl("li", { text: txt }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmx1ZW50TWFpbk5hdmlnYXRpb25TdGVwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiRmx1ZW50TWFpbk5hdmlnYXRpb25TdGVwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUUxQyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RSxPQUFPLG9DQUFvQyxDQUFDO0FBRTVDLE1BQU0sT0FBTyx3QkFBd0I7SUFDcEMsTUFBTSxDQUFDLE1BQU0sQ0FDWixRQUFxQixFQUNyQixTQUFzQixFQUN0QixVQUFnQztRQUVoQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDakIsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRWxCLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN4RCxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRTtZQUN0QixJQUFJLEVBQUUsQ0FBQyxDQUNOLGlFQUFpRSxDQUNqRTtZQUNELEdBQUcsRUFBRSxxQkFBcUI7U0FDMUIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxvQkFBb0IsRUFBRSxDQUFDLENBQUM7UUFDcEUsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQztZQUNsQyxHQUFHLEVBQUUsdUNBQXVDO1NBQzVDLENBQUMsQ0FBQztRQUNILE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUM7WUFDL0IsR0FBRyxFQUFFLGdDQUFnQztTQUNyQyxDQUFDLENBQUM7UUFFSCx1QkFBdUIsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUV0RCxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsYUFBYSxDQUNwQyxpQ0FBaUMsQ0FDakMsQ0FBQztRQUNGLE9BQU8sYUFBUCxPQUFPLHVCQUFQLE9BQU8sQ0FBRSxTQUFTLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBRXJDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FDMUMsaUVBQWlFLENBQ2pFLENBQUM7UUFDRixVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBRTFELElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN4RCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRTtZQUNsQixJQUFJLEVBQUUsQ0FBQyxDQUNOLHFFQUFxRSxDQUNyRTtTQUNELENBQUMsQ0FBQztRQUNILE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsR0FBRyxFQUFFLHdCQUF3QixFQUFFLENBQUMsQ0FBQztRQUNsRTtZQUNDLENBQUMsQ0FBQyxnREFBZ0QsQ0FBQztZQUNuRCxDQUFDLENBQUMsNENBQTRDLENBQUM7U0FDL0MsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN0RCxDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgeyBPbmJvYXJkaW5nQ29udHJvbGxlciB9IGZyb20gXCIuLi9PbmJvYXJkaW5nQ29udHJvbGxlclwiO1xyXG5pbXBvcnQgeyBDb21wb25lbnRQcmV2aWV3RmFjdG9yeSB9IGZyb20gXCIuLi9wcmV2aWV3cy9Db21wb25lbnRQcmV2aWV3RmFjdG9yeVwiO1xyXG5pbXBvcnQgXCJAL3N0eWxlcy9vbmJvYXJkaW5nLWNvbXBvbmVudHMuY3NzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgRmx1ZW50TWFpbk5hdmlnYXRpb25TdGVwIHtcclxuXHRzdGF0aWMgcmVuZGVyKFxyXG5cdFx0aGVhZGVyRWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0Y29udGVudEVsOiBIVE1MRWxlbWVudCxcclxuXHRcdGNvbnRyb2xsZXI6IE9uYm9hcmRpbmdDb250cm9sbGVyXHJcblx0KSB7XHJcblx0XHRoZWFkZXJFbC5lbXB0eSgpO1xyXG5cdFx0Y29udGVudEVsLmVtcHR5KCk7XHJcblxyXG5cdFx0aGVhZGVyRWwuY3JlYXRlRWwoXCJoMVwiLCB7IHRleHQ6IHQoXCJNYWluIE5hdmlnYXRpb25cIikgfSk7XHJcblx0XHRoZWFkZXJFbC5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFxyXG5cdFx0XHRcdFwiQWNjZXNzIEluYm94LCBUb2RheSwgVXBjb21pbmcgYW5kIG1vcmUgZnJvbSB0aGUgcHJpbWFyeSBzZWN0aW9uXCJcclxuXHRcdFx0KSxcclxuXHRcdFx0Y2xzOiBcIm9uYm9hcmRpbmctc3VidGl0bGVcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IHNob3djYXNlID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJjb21wb25lbnQtc2hvd2Nhc2VcIiB9KTtcclxuXHRcdGNvbnN0IHByZXZpZXcgPSBzaG93Y2FzZS5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiY29tcG9uZW50LXNob3djYXNlLXByZXZpZXcgZm9jdXMtbW9kZVwiLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCBkZXNjID0gc2hvd2Nhc2UuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImNvbXBvbmVudC1zaG93Y2FzZS1kZXNjcmlwdGlvblwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Q29tcG9uZW50UHJldmlld0ZhY3RvcnkuY3JlYXRlU2lkZWJhclByZXZpZXcocHJldmlldyk7XHJcblxyXG5cdFx0Y29uc3QgcHJpbWFyeSA9IHByZXZpZXcucXVlcnlTZWxlY3RvcjxIVE1MRWxlbWVudD4oXHJcblx0XHRcdFwiLmZsdWVudC1zaWRlYmFyLXNlY3Rpb24tcHJpbWFyeVwiXHJcblx0XHQpO1xyXG5cdFx0cHJpbWFyeT8uY2xhc3NMaXN0LmFkZChcImlzLWZvY3VzZWRcIik7XHJcblxyXG5cdFx0Y29uc3QgZGltVGFyZ2V0cyA9IHByZXZpZXcucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oXHJcblx0XHRcdFwiLmZsdWVudC1zaWRlYmFyLXNlY3Rpb24tcHJvamVjdHMsIC5mbHVlbnQtc2lkZWJhci1zZWN0aW9uLW90aGVyXCJcclxuXHRcdCk7XHJcblx0XHRkaW1UYXJnZXRzLmZvckVhY2goKGVsKSA9PiBlbC5jbGFzc0xpc3QuYWRkKFwiaXMtZGltbWVkXCIpKTtcclxuXHJcblx0XHRkZXNjLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiB0KFwiTmF2aWdhdGUgY29yZSB2aWV3c1wiKSB9KTtcclxuXHRcdGRlc2MuY3JlYXRlRWwoXCJwXCIsIHtcclxuXHRcdFx0dGV4dDogdChcclxuXHRcdFx0XHRcIlF1aWNrbHkganVtcCB0byBjb3JlIHZpZXdzIGxpa2UgSW5ib3gsIFRvZGF5LCBVcGNvbWluZyBhbmQgRmxhZ2dlZC5cIlxyXG5cdFx0XHQpLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCB1bCA9IGRlc2MuY3JlYXRlRWwoXCJ1bFwiLCB7IGNsczogXCJjb21wb25lbnQtZmVhdHVyZS1saXN0XCIgfSk7XHJcblx0XHRbXHJcblx0XHRcdHQoXCJVbnJlYWQgY291bnRzIGFuZCBpbmRpY2F0b3JzIGtlZXAgeW91IGluZm9ybWVkXCIpLFxyXG5cdFx0XHR0KFwiS2V5Ym9hcmQtcmVhZHkgd2l0aCBjbGVhciBzZWxlY3Rpb24gc3RhdGVzXCIpLFxyXG5cdFx0XS5mb3JFYWNoKCh0eHQpID0+IHVsLmNyZWF0ZUVsKFwibGlcIiwgeyB0ZXh0OiB0eHQgfSkpO1xyXG5cdH1cclxufVxyXG4iXX0=