import { t } from "@/translations/helper";
import { Notice } from "obsidian";
import { QuickCaptureModal } from "@/components/features/quick-capture/modals/QuickCaptureModal";
/**
 * Quick Capture Demo Component - Demo quick capture feature
 */
export class QuickCaptureDemo {
    /**
     * Render quick capture demo
     */
    static render(container, plugin) {
        const section = container.createDiv("quick-capture-section");
        section.createEl("h3", { text: t("Quick Capture") });
        const demo = section.createDiv("demo-content");
        demo.createEl("p", {
            text: t("Use Quick Capture to quickly create tasks from anywhere in Obsidian"),
        });
        // Demo button
        const button = demo.createEl("button", {
            text: t("Try Quick Capture"),
            cls: "mod-cta demo-button",
        });
        button.addEventListener("click", () => {
            var _a;
            try {
                if ((_a = plugin.settings.quickCapture) === null || _a === void 0 ? void 0 : _a.enableQuickCapture) {
                    new QuickCaptureModal(plugin.app, plugin).open();
                }
                else {
                    new Notice(t("Quick capture is now enabled in your configuration!"), 3000);
                }
            }
            catch (error) {
                console.error("Failed to open quick capture:", error);
                new Notice(t("Failed to open quick capture. Please try again later."), 3000);
            }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUXVpY2tDYXB0dXJlRGVtby5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlF1aWNrQ2FwdHVyZURlbW8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFFbEMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFFakc7O0dBRUc7QUFDSCxNQUFNLE9BQU8sZ0JBQWdCO0lBQzVCOztPQUVHO0lBQ0gsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFzQixFQUFFLE1BQTZCO1FBQ2xFLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUM3RCxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRXJELE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDL0MsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7WUFDbEIsSUFBSSxFQUFFLENBQUMsQ0FDTixxRUFBcUUsQ0FDckU7U0FDRCxDQUFDLENBQUM7UUFFSCxjQUFjO1FBQ2QsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUU7WUFDdEMsSUFBSSxFQUFFLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQztZQUM1QixHQUFHLEVBQUUscUJBQXFCO1NBQzFCLENBQUMsQ0FBQztRQUVILE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFOztZQUNyQyxJQUFJO2dCQUNILElBQUksTUFBQSxNQUFNLENBQUMsUUFBUSxDQUFDLFlBQVksMENBQUUsa0JBQWtCLEVBQUU7b0JBQ3JELElBQUksaUJBQWlCLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztpQkFDakQ7cUJBQU07b0JBQ04sSUFBSSxNQUFNLENBQ1QsQ0FBQyxDQUFDLHFEQUFxRCxDQUFDLEVBQ3hELElBQUksQ0FDSixDQUFDO2lCQUNGO2FBQ0Q7WUFBQyxPQUFPLEtBQUssRUFBRTtnQkFDZixPQUFPLENBQUMsS0FBSyxDQUFDLCtCQUErQixFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUN0RCxJQUFJLE1BQU0sQ0FDVCxDQUFDLENBQUMsdURBQXVELENBQUMsRUFDMUQsSUFBSSxDQUNKLENBQUM7YUFDRjtRQUNGLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHsgTm90aWNlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB0eXBlIFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5pbXBvcnQgeyBRdWlja0NhcHR1cmVNb2RhbCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvcXVpY2stY2FwdHVyZS9tb2RhbHMvUXVpY2tDYXB0dXJlTW9kYWxcIjtcclxuXHJcbi8qKlxyXG4gKiBRdWljayBDYXB0dXJlIERlbW8gQ29tcG9uZW50IC0gRGVtbyBxdWljayBjYXB0dXJlIGZlYXR1cmVcclxuICovXHJcbmV4cG9ydCBjbGFzcyBRdWlja0NhcHR1cmVEZW1vIHtcclxuXHQvKipcclxuXHQgKiBSZW5kZXIgcXVpY2sgY2FwdHVyZSBkZW1vXHJcblx0ICovXHJcblx0c3RhdGljIHJlbmRlcihjb250YWluZXI6IEhUTUxFbGVtZW50LCBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbikge1xyXG5cdFx0Y29uc3Qgc2VjdGlvbiA9IGNvbnRhaW5lci5jcmVhdGVEaXYoXCJxdWljay1jYXB0dXJlLXNlY3Rpb25cIik7XHJcblx0XHRzZWN0aW9uLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiB0KFwiUXVpY2sgQ2FwdHVyZVwiKSB9KTtcclxuXHJcblx0XHRjb25zdCBkZW1vID0gc2VjdGlvbi5jcmVhdGVEaXYoXCJkZW1vLWNvbnRlbnRcIik7XHJcblx0XHRkZW1vLmNyZWF0ZUVsKFwicFwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXHJcblx0XHRcdFx0XCJVc2UgUXVpY2sgQ2FwdHVyZSB0byBxdWlja2x5IGNyZWF0ZSB0YXNrcyBmcm9tIGFueXdoZXJlIGluIE9ic2lkaWFuXCJcclxuXHRcdFx0KSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIERlbW8gYnV0dG9uXHJcblx0XHRjb25zdCBidXR0b24gPSBkZW1vLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0dGV4dDogdChcIlRyeSBRdWljayBDYXB0dXJlXCIpLFxyXG5cdFx0XHRjbHM6IFwibW9kLWN0YSBkZW1vLWJ1dHRvblwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0YnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0aWYgKHBsdWdpbi5zZXR0aW5ncy5xdWlja0NhcHR1cmU/LmVuYWJsZVF1aWNrQ2FwdHVyZSkge1xyXG5cdFx0XHRcdFx0bmV3IFF1aWNrQ2FwdHVyZU1vZGFsKHBsdWdpbi5hcHAsIHBsdWdpbikub3BlbigpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRuZXcgTm90aWNlKFxyXG5cdFx0XHRcdFx0XHR0KFwiUXVpY2sgY2FwdHVyZSBpcyBub3cgZW5hYmxlZCBpbiB5b3VyIGNvbmZpZ3VyYXRpb24hXCIpLFxyXG5cdFx0XHRcdFx0XHQzMDAwXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIG9wZW4gcXVpY2sgY2FwdHVyZTpcIiwgZXJyb3IpO1xyXG5cdFx0XHRcdG5ldyBOb3RpY2UoXHJcblx0XHRcdFx0XHR0KFwiRmFpbGVkIHRvIG9wZW4gcXVpY2sgY2FwdHVyZS4gUGxlYXNlIHRyeSBhZ2FpbiBsYXRlci5cIiksXHJcblx0XHRcdFx0XHQzMDAwXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG59XHJcbiJdfQ==