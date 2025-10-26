import { t } from "@/translations/helper";
import { SelectableCard } from "../ui/SelectableCard";
import { Alert } from "../ui/Alert";
import "@/styles/layout-placement.css";
/**
 * Fluent Placement Step - Choose between Sideleaves and Inline
 */
export class PlacementStep {
    /**
     * Render the placement selection step
     */
    static render(headerEl, contentEl, controller) {
        // Clear
        headerEl.empty();
        contentEl.empty();
        // Header
        headerEl.createEl("h1", { text: t("Fluent Layout") });
        headerEl.createEl("p", {
            text: t("Choose how to display Fluent views in your workspace"),
            cls: "onboarding-subtitle",
        });
        // Get current state
        const currentPlacement = controller.getState().useSideLeaves
            ? "sideleaves"
            : "inline";
        // Create cards configuration
        const cardConfigs = [
            {
                id: "sideleaves",
                title: t("Sideleaves"),
                subtitle: t("Multi-Column Collaboration"),
                description: t("Left navigation and right details as separate workspace sidebars, ideal for simultaneous browsing and editing"),
                preview: this.createSideleavesPreview(),
            },
            {
                id: "inline",
                title: t("Inline"),
                subtitle: t("Single-Page Immersion"),
                description: t("All content in one page, focusing on the main view and reducing interface distractions"),
                preview: this.createInlinePreview(),
            },
        ];
        // Render selectable cards
        const card = new SelectableCard(contentEl, cardConfigs, {
            containerClass: "selectable-cards-container",
            cardClass: "selectable-card",
            showPreview: true,
        }, (placement) => {
            controller.setUseSideLeaves(placement === "sideleaves");
        });
        // Set initial selection
        card.setSelected("inline");
        // Add info alert
        Alert.create(contentEl, t("You can change this option later in settings"), {
            variant: "info",
            className: "placement-selection-tip",
        });
    }
    /**
     * Create Sideleaves preview
     */
    static createSideleavesPreview() {
        const preview = document.createElement("div");
        preview.addClass("placement-preview", "placement-preview-sideleaves");
        // Left sidebar (active)
        const leftSidebar = preview.createDiv({
            cls: "placement-sidebar placement-sidebar-active",
        });
        // Add file list placeholders
        for (let i = 0; i < 6; i++) {
            leftSidebar.createDiv({
                cls: "placement-sidebar-item placement-sidebar-item-active",
            });
        }
        // Center area with tabs and content (active)
        const centerArea = preview.createDiv({
            cls: "placement-center placement-center-active",
        });
        // Tab bar
        const tabBar = centerArea.createDiv({ cls: "placement-tab-bar" });
        for (let i = 0; i < 3; i++) {
            const tab = tabBar.createDiv({ cls: "placement-tab" });
            // Only highlight the second tab
            if (i === 1) {
                tab.addClass("placement-tab-active");
            }
        }
        // Content area
        const content = centerArea.createDiv({ cls: "placement-content" });
        for (let i = 0; i < 5; i++) {
            const line = content.createDiv({
                cls: "placement-content-line",
            });
            line.style.width = `${90 - i * 12}%`;
        }
        // Right sidebar (active)
        const rightSidebar = preview.createDiv({
            cls: "placement-sidebar placement-sidebar-active",
        });
        // Add property list placeholders
        for (let i = 0; i < 8; i++) {
            rightSidebar.createDiv({
                cls: "placement-sidebar-item placement-sidebar-item-active placement-sidebar-item-small",
            });
        }
        return preview;
    }
    /**
     * Create Inline preview
     */
    static createInlinePreview() {
        const preview = document.createElement("div");
        preview.addClass("placement-preview", "placement-preview-inline");
        // Left sidebar (inactive/dimmed)
        const leftSidebar = preview.createDiv({
            cls: "placement-sidebar placement-sidebar-inactive",
        });
        // Add file list placeholders (dimmed)
        for (let i = 0; i < 6; i++) {
            leftSidebar.createDiv({
                cls: "placement-sidebar-item placement-sidebar-item-inactive",
            });
        }
        // Center area with tabs and content (active - only this one is highlighted)
        const centerArea = preview.createDiv({
            cls: "placement-center placement-center-active",
        });
        // Tab bar
        const tabBar = centerArea.createDiv({ cls: "placement-tab-bar" });
        for (let i = 0; i < 3; i++) {
            const tab = tabBar.createDiv({ cls: "placement-tab" });
            // Only highlight the second tab
            if (i === 1) {
                tab.addClass("placement-tab-active");
            }
        }
        // Content area
        const content = centerArea.createDiv({ cls: "placement-content" });
        for (let i = 0; i < 5; i++) {
            const line = content.createDiv({
                cls: "placement-content-line",
            });
            line.style.width = `${90 - i * 12}%`;
        }
        // Right sidebar (inactive/dimmed)
        const rightSidebar = preview.createDiv({
            cls: "placement-sidebar placement-sidebar-inactive",
        });
        // Add property list placeholders (dimmed)
        for (let i = 0; i < 8; i++) {
            rightSidebar.createDiv({
                cls: "placement-sidebar-item placement-sidebar-item-inactive placement-sidebar-item-small",
            });
        }
        return preview;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGxhY2VtZW50U3RlcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlBsYWNlbWVudFN0ZXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzFDLE9BQU8sRUFBRSxjQUFjLEVBQXdCLE1BQU0sc0JBQXNCLENBQUM7QUFFNUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNwQyxPQUFPLCtCQUErQixDQUFDO0FBSXZDOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGFBQWE7SUFDekI7O09BRUc7SUFDSCxNQUFNLENBQUMsTUFBTSxDQUNaLFFBQXFCLEVBQ3JCLFNBQXNCLEVBQ3RCLFVBQWdDO1FBRWhDLFFBQVE7UUFDUixRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDakIsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRWxCLFNBQVM7UUFDVCxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3RELFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFO1lBQ3RCLElBQUksRUFBRSxDQUFDLENBQUMsc0RBQXNELENBQUM7WUFDL0QsR0FBRyxFQUFFLHFCQUFxQjtTQUMxQixDQUFDLENBQUM7UUFFSCxvQkFBb0I7UUFDcEIsTUFBTSxnQkFBZ0IsR0FBYyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUMsYUFBYTtZQUN0RSxDQUFDLENBQUMsWUFBWTtZQUNkLENBQUMsQ0FBQyxRQUFRLENBQUM7UUFFWiw2QkFBNkI7UUFDN0IsTUFBTSxXQUFXLEdBQXNDO1lBQ3REO2dCQUNDLEVBQUUsRUFBRSxZQUFZO2dCQUNoQixLQUFLLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQztnQkFDdEIsUUFBUSxFQUFFLENBQUMsQ0FBQyw0QkFBNEIsQ0FBQztnQkFDekMsV0FBVyxF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aW1wb3J0IHsgU2VsZWN0YWJsZUNhcmQsIFNlbGVjdGFibGVDYXJkQ29uZmlnIH0gZnJvbSBcIi4uL3VpL1NlbGVjdGFibGVDYXJkXCI7XHJcbmltcG9ydCB7IE9uYm9hcmRpbmdDb250cm9sbGVyIH0gZnJvbSBcIi4uL09uYm9hcmRpbmdDb250cm9sbGVyXCI7XHJcbmltcG9ydCB7IEFsZXJ0IH0gZnJvbSBcIi4uL3VpL0FsZXJ0XCI7XHJcbmltcG9ydCBcIkAvc3R5bGVzL2xheW91dC1wbGFjZW1lbnQuY3NzXCI7XHJcblxyXG5leHBvcnQgdHlwZSBQbGFjZW1lbnQgPSBcInNpZGVsZWF2ZXNcIiB8IFwiaW5saW5lXCI7XHJcblxyXG4vKipcclxuICogRmx1ZW50IFBsYWNlbWVudCBTdGVwIC0gQ2hvb3NlIGJldHdlZW4gU2lkZWxlYXZlcyBhbmQgSW5saW5lXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUGxhY2VtZW50U3RlcCB7XHJcblx0LyoqXHJcblx0ICogUmVuZGVyIHRoZSBwbGFjZW1lbnQgc2VsZWN0aW9uIHN0ZXBcclxuXHQgKi9cclxuXHRzdGF0aWMgcmVuZGVyKFxyXG5cdFx0aGVhZGVyRWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0Y29udGVudEVsOiBIVE1MRWxlbWVudCxcclxuXHRcdGNvbnRyb2xsZXI6IE9uYm9hcmRpbmdDb250cm9sbGVyLFxyXG5cdCkge1xyXG5cdFx0Ly8gQ2xlYXJcclxuXHRcdGhlYWRlckVsLmVtcHR5KCk7XHJcblx0XHRjb250ZW50RWwuZW1wdHkoKTtcclxuXHJcblx0XHQvLyBIZWFkZXJcclxuXHRcdGhlYWRlckVsLmNyZWF0ZUVsKFwiaDFcIiwgeyB0ZXh0OiB0KFwiRmx1ZW50IExheW91dFwiKSB9KTtcclxuXHRcdGhlYWRlckVsLmNyZWF0ZUVsKFwicFwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXCJDaG9vc2UgaG93IHRvIGRpc3BsYXkgRmx1ZW50IHZpZXdzIGluIHlvdXIgd29ya3NwYWNlXCIpLFxyXG5cdFx0XHRjbHM6IFwib25ib2FyZGluZy1zdWJ0aXRsZVwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gR2V0IGN1cnJlbnQgc3RhdGVcclxuXHRcdGNvbnN0IGN1cnJlbnRQbGFjZW1lbnQ6IFBsYWNlbWVudCA9IGNvbnRyb2xsZXIuZ2V0U3RhdGUoKS51c2VTaWRlTGVhdmVzXHJcblx0XHRcdD8gXCJzaWRlbGVhdmVzXCJcclxuXHRcdFx0OiBcImlubGluZVwiO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBjYXJkcyBjb25maWd1cmF0aW9uXHJcblx0XHRjb25zdCBjYXJkQ29uZmlnczogU2VsZWN0YWJsZUNhcmRDb25maWc8UGxhY2VtZW50PltdID0gW1xyXG5cdFx0XHR7XHJcblx0XHRcdFx0aWQ6IFwic2lkZWxlYXZlc1wiLFxyXG5cdFx0XHRcdHRpdGxlOiB0KFwiU2lkZWxlYXZlc1wiKSxcclxuXHRcdFx0XHRzdWJ0aXRsZTogdChcIk11bHRpLUNvbHVtbiBDb2xsYWJvcmF0aW9uXCIpLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiB0KFxyXG5cdFx0XHRcdFx0XCJMZWZ0IG5hdmlnYXRpb24gYW5kIHJpZ2h0IGRldGFpbHMgYXMgc2VwYXJhdGUgd29ya3NwYWNlIHNpZGViYXJzLCBpZGVhbCBmb3Igc2ltdWx0YW5lb3VzIGJyb3dzaW5nIGFuZCBlZGl0aW5nXCIsXHJcblx0XHRcdFx0KSxcclxuXHRcdFx0XHRwcmV2aWV3OiB0aGlzLmNyZWF0ZVNpZGVsZWF2ZXNQcmV2aWV3KCksXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRpZDogXCJpbmxpbmVcIixcclxuXHRcdFx0XHR0aXRsZTogdChcIklubGluZVwiKSxcclxuXHRcdFx0XHRzdWJ0aXRsZTogdChcIlNpbmdsZS1QYWdlIEltbWVyc2lvblwiKSxcclxuXHRcdFx0XHRkZXNjcmlwdGlvbjogdChcclxuXHRcdFx0XHRcdFwiQWxsIGNvbnRlbnQgaW4gb25lIHBhZ2UsIGZvY3VzaW5nIG9uIHRoZSBtYWluIHZpZXcgYW5kIHJlZHVjaW5nIGludGVyZmFjZSBkaXN0cmFjdGlvbnNcIixcclxuXHRcdFx0XHQpLFxyXG5cdFx0XHRcdHByZXZpZXc6IHRoaXMuY3JlYXRlSW5saW5lUHJldmlldygpLFxyXG5cdFx0XHR9LFxyXG5cdFx0XTtcclxuXHJcblx0XHQvLyBSZW5kZXIgc2VsZWN0YWJsZSBjYXJkc1xyXG5cdFx0Y29uc3QgY2FyZCA9IG5ldyBTZWxlY3RhYmxlQ2FyZDxQbGFjZW1lbnQ+KFxyXG5cdFx0XHRjb250ZW50RWwsXHJcblx0XHRcdGNhcmRDb25maWdzLFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0Y29udGFpbmVyQ2xhc3M6IFwic2VsZWN0YWJsZS1jYXJkcy1jb250YWluZXJcIixcclxuXHRcdFx0XHRjYXJkQ2xhc3M6IFwic2VsZWN0YWJsZS1jYXJkXCIsXHJcblx0XHRcdFx0c2hvd1ByZXZpZXc6IHRydWUsXHJcblx0XHRcdH0sXHJcblx0XHRcdChwbGFjZW1lbnQpID0+IHtcclxuXHRcdFx0XHRjb250cm9sbGVyLnNldFVzZVNpZGVMZWF2ZXMocGxhY2VtZW50ID09PSBcInNpZGVsZWF2ZXNcIik7XHJcblx0XHRcdH0sXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIFNldCBpbml0aWFsIHNlbGVjdGlvblxyXG5cdFx0Y2FyZC5zZXRTZWxlY3RlZChcImlubGluZVwiKTtcclxuXHJcblx0XHQvLyBBZGQgaW5mbyBhbGVydFxyXG5cdFx0QWxlcnQuY3JlYXRlKFxyXG5cdFx0XHRjb250ZW50RWwsXHJcblx0XHRcdHQoXCJZb3UgY2FuIGNoYW5nZSB0aGlzIG9wdGlvbiBsYXRlciBpbiBzZXR0aW5nc1wiKSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHZhcmlhbnQ6IFwiaW5mb1wiLFxyXG5cdFx0XHRcdGNsYXNzTmFtZTogXCJwbGFjZW1lbnQtc2VsZWN0aW9uLXRpcFwiLFxyXG5cdFx0XHR9LFxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZSBTaWRlbGVhdmVzIHByZXZpZXdcclxuXHQgKi9cclxuXHRwcml2YXRlIHN0YXRpYyBjcmVhdGVTaWRlbGVhdmVzUHJldmlldygpOiBIVE1MRWxlbWVudCB7XHJcblx0XHRjb25zdCBwcmV2aWV3ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuXHRcdHByZXZpZXcuYWRkQ2xhc3MoXCJwbGFjZW1lbnQtcHJldmlld1wiLCBcInBsYWNlbWVudC1wcmV2aWV3LXNpZGVsZWF2ZXNcIik7XHJcblxyXG5cdFx0Ly8gTGVmdCBzaWRlYmFyIChhY3RpdmUpXHJcblx0XHRjb25zdCBsZWZ0U2lkZWJhciA9IHByZXZpZXcuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInBsYWNlbWVudC1zaWRlYmFyIHBsYWNlbWVudC1zaWRlYmFyLWFjdGl2ZVwiLFxyXG5cdFx0fSk7XHJcblx0XHQvLyBBZGQgZmlsZSBsaXN0IHBsYWNlaG9sZGVyc1xyXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCA2OyBpKyspIHtcclxuXHRcdFx0bGVmdFNpZGViYXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwicGxhY2VtZW50LXNpZGViYXItaXRlbSBwbGFjZW1lbnQtc2lkZWJhci1pdGVtLWFjdGl2ZVwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDZW50ZXIgYXJlYSB3aXRoIHRhYnMgYW5kIGNvbnRlbnQgKGFjdGl2ZSlcclxuXHRcdGNvbnN0IGNlbnRlckFyZWEgPSBwcmV2aWV3LmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJwbGFjZW1lbnQtY2VudGVyIHBsYWNlbWVudC1jZW50ZXItYWN0aXZlXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBUYWIgYmFyXHJcblx0XHRjb25zdCB0YWJCYXIgPSBjZW50ZXJBcmVhLmNyZWF0ZURpdih7IGNsczogXCJwbGFjZW1lbnQtdGFiLWJhclwiIH0pO1xyXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcclxuXHRcdFx0Y29uc3QgdGFiID0gdGFiQmFyLmNyZWF0ZURpdih7IGNsczogXCJwbGFjZW1lbnQtdGFiXCIgfSk7XHJcblx0XHRcdC8vIE9ubHkgaGlnaGxpZ2h0IHRoZSBzZWNvbmQgdGFiXHJcblx0XHRcdGlmIChpID09PSAxKSB7XHJcblx0XHRcdFx0dGFiLmFkZENsYXNzKFwicGxhY2VtZW50LXRhYi1hY3RpdmVcIik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBDb250ZW50IGFyZWFcclxuXHRcdGNvbnN0IGNvbnRlbnQgPSBjZW50ZXJBcmVhLmNyZWF0ZURpdih7IGNsczogXCJwbGFjZW1lbnQtY29udGVudFwiIH0pO1xyXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCA1OyBpKyspIHtcclxuXHRcdFx0Y29uc3QgbGluZSA9IGNvbnRlbnQuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwicGxhY2VtZW50LWNvbnRlbnQtbGluZVwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0bGluZS5zdHlsZS53aWR0aCA9IGAkezkwIC0gaSAqIDEyfSVgO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJpZ2h0IHNpZGViYXIgKGFjdGl2ZSlcclxuXHRcdGNvbnN0IHJpZ2h0U2lkZWJhciA9IHByZXZpZXcuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInBsYWNlbWVudC1zaWRlYmFyIHBsYWNlbWVudC1zaWRlYmFyLWFjdGl2ZVwiLFxyXG5cdFx0fSk7XHJcblx0XHQvLyBBZGQgcHJvcGVydHkgbGlzdCBwbGFjZWhvbGRlcnNcclxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgODsgaSsrKSB7XHJcblx0XHRcdHJpZ2h0U2lkZWJhci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJwbGFjZW1lbnQtc2lkZWJhci1pdGVtIHBsYWNlbWVudC1zaWRlYmFyLWl0ZW0tYWN0aXZlIHBsYWNlbWVudC1zaWRlYmFyLWl0ZW0tc21hbGxcIixcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHByZXZpZXc7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDcmVhdGUgSW5saW5lIHByZXZpZXdcclxuXHQgKi9cclxuXHRwcml2YXRlIHN0YXRpYyBjcmVhdGVJbmxpbmVQcmV2aWV3KCk6IEhUTUxFbGVtZW50IHtcclxuXHRcdGNvbnN0IHByZXZpZXcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG5cdFx0cHJldmlldy5hZGRDbGFzcyhcInBsYWNlbWVudC1wcmV2aWV3XCIsIFwicGxhY2VtZW50LXByZXZpZXctaW5saW5lXCIpO1xyXG5cclxuXHRcdC8vIExlZnQgc2lkZWJhciAoaW5hY3RpdmUvZGltbWVkKVxyXG5cdFx0Y29uc3QgbGVmdFNpZGViYXIgPSBwcmV2aWV3LmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJwbGFjZW1lbnQtc2lkZWJhciBwbGFjZW1lbnQtc2lkZWJhci1pbmFjdGl2ZVwiLFxyXG5cdFx0fSk7XHJcblx0XHQvLyBBZGQgZmlsZSBsaXN0IHBsYWNlaG9sZGVycyAoZGltbWVkKVxyXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCA2OyBpKyspIHtcclxuXHRcdFx0bGVmdFNpZGViYXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwicGxhY2VtZW50LXNpZGViYXItaXRlbSBwbGFjZW1lbnQtc2lkZWJhci1pdGVtLWluYWN0aXZlXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENlbnRlciBhcmVhIHdpdGggdGFicyBhbmQgY29udGVudCAoYWN0aXZlIC0gb25seSB0aGlzIG9uZSBpcyBoaWdobGlnaHRlZClcclxuXHRcdGNvbnN0IGNlbnRlckFyZWEgPSBwcmV2aWV3LmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJwbGFjZW1lbnQtY2VudGVyIHBsYWNlbWVudC1jZW50ZXItYWN0aXZlXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBUYWIgYmFyXHJcblx0XHRjb25zdCB0YWJCYXIgPSBjZW50ZXJBcmVhLmNyZWF0ZURpdih7IGNsczogXCJwbGFjZW1lbnQtdGFiLWJhclwiIH0pO1xyXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcclxuXHRcdFx0Y29uc3QgdGFiID0gdGFiQmFyLmNyZWF0ZURpdih7IGNsczogXCJwbGFjZW1lbnQtdGFiXCIgfSk7XHJcblx0XHRcdC8vIE9ubHkgaGlnaGxpZ2h0IHRoZSBzZWNvbmQgdGFiXHJcblx0XHRcdGlmIChpID09PSAxKSB7XHJcblx0XHRcdFx0dGFiLmFkZENsYXNzKFwicGxhY2VtZW50LXRhYi1hY3RpdmVcIik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBDb250ZW50IGFyZWFcclxuXHRcdGNvbnN0IGNvbnRlbnQgPSBjZW50ZXJBcmVhLmNyZWF0ZURpdih7IGNsczogXCJwbGFjZW1lbnQtY29udGVudFwiIH0pO1xyXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCA1OyBpKyspIHtcclxuXHRcdFx0Y29uc3QgbGluZSA9IGNvbnRlbnQuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwicGxhY2VtZW50LWNvbnRlbnQtbGluZVwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0bGluZS5zdHlsZS53aWR0aCA9IGAkezkwIC0gaSAqIDEyfSVgO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJpZ2h0IHNpZGViYXIgKGluYWN0aXZlL2RpbW1lZClcclxuXHRcdGNvbnN0IHJpZ2h0U2lkZWJhciA9IHByZXZpZXcuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInBsYWNlbWVudC1zaWRlYmFyIHBsYWNlbWVudC1zaWRlYmFyLWluYWN0aXZlXCIsXHJcblx0XHR9KTtcclxuXHRcdC8vIEFkZCBwcm9wZXJ0eSBsaXN0IHBsYWNlaG9sZGVycyAoZGltbWVkKVxyXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCA4OyBpKyspIHtcclxuXHRcdFx0cmlnaHRTaWRlYmFyLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcInBsYWNlbWVudC1zaWRlYmFyLWl0ZW0gcGxhY2VtZW50LXNpZGViYXItaXRlbS1pbmFjdGl2ZSBwbGFjZW1lbnQtc2lkZWJhci1pdGVtLXNtYWxsXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBwcmV2aWV3O1xyXG5cdH1cclxufVxyXG4iXX0=