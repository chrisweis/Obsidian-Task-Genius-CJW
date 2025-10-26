import { t } from "@/translations/helper";
import { SelectableCard, } from "@/components/features/onboarding/ui/SelectableCard";
import { Alert } from "@/components/features/onboarding/ui/Alert";
/**
 * Mode Selection Step - Choose between Fluent and Legacy UI
 */
export class ModeSelectionStep {
    /**
     * Render the mode selection step
     */
    static render(headerEl, contentEl, controller) {
        // Clear
        headerEl.empty();
        contentEl.empty();
        headerEl.toggleClass("intro-typing-wrapper", true);
        contentEl.toggleClass("intro-typing-wrapper", true);
        // Intro guidance text (same as intro-line-4)
        headerEl.createEl("p", {
            cls: "intro-line intro-line-4",
            text: t("In the current version, Task Genius provides a brand new visual and interactive experience: Fluent; while also providing the option to return to the previous interface. Which one do you prefer?"),
        });
        // Get current state
        const currentMode = controller.getState().uiMode;
        // Create cards configuration
        const cardConfigs = [
            {
                id: "fluent",
                title: t("Fluent"),
                subtitle: t("Modern & Sleek"),
                description: t("New visual design with elegant animations and modern interactions"),
                preview: this.createFluentPreview(),
            },
            {
                id: "legacy",
                title: t("Legacy"),
                subtitle: t("Classic & Familiar"),
                description: t("Keep the familiar interface and interaction style you know"),
                preview: this.createLegacyPreview(),
            },
        ];
        // Render selectable cards
        const card = new SelectableCard(contentEl, cardConfigs, {
            containerClass: "selectable-cards-container",
            cardClass: "selectable-card",
            showPreview: true,
        }, (mode) => {
            controller.setUIMode(mode);
        });
        // Set initial selection
        if (currentMode) {
            card.setSelected(currentMode);
        }
        // Add info alert
        Alert.create(contentEl, t("You can change this option later in interface settings"), {
            variant: "info",
            className: "mode-selection-tip",
        });
    }
    /**
     * Create Fluent mode preview
     */
    static createFluentPreview() {
        const preview = createDiv({
            cls: ["mode-preview", "mode-preview-fluent"],
        });
        // Check theme
        const isDark = document.body.classList.contains("theme-dark");
        const theme = isDark ? "" : "-light";
        const imageUrl = `https://raw.githubusercontent.com/Quorafind/Obsidian-Task-Progress-Bar/master/media/fluent${theme}.png`;
        const img = preview.createEl("img", {
            attr: {
                src: imageUrl,
                alt: "Fluent mode preview",
            },
        });
        img.style.maxWidth = "100%";
        img.style.maxHeight = "100%";
        img.style.objectFit = "contain";
        img.style.borderRadius = "4px";
        return preview;
    }
    /**
     * Create Legacy mode preview
     */
    static createLegacyPreview() {
        const preview = createDiv({
            cls: ["mode-preview", "mode-preview-legacy"],
        });
        // Check theme
        const isDark = document.body.classList.contains("theme-dark");
        const theme = isDark ? "" : "-light";
        const imageUrl = `https://raw.githubusercontent.com/Quorafind/Obsidian-Task-Progress-Bar/master/media/legacy${theme}.png`;
        const img = preview.createEl("img", {
            attr: {
                src: imageUrl,
                alt: "Legacy mode preview",
            },
        });
        img.style.maxWidth = "100%";
        img.style.maxHeight = "100%";
        img.style.objectFit = "contain";
        img.style.borderRadius = "4px";
        return preview;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTW9kZVNlbGVjdGlvblN0ZXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJNb2RlU2VsZWN0aW9uU3RlcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDMUMsT0FBTyxFQUNOLGNBQWMsR0FFZCxNQUFNLG9EQUFvRCxDQUFDO0FBRTVELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUlsRTs7R0FFRztBQUNILE1BQU0sT0FBTyxpQkFBaUI7SUFDN0I7O09BRUc7SUFDSCxNQUFNLENBQUMsTUFBTSxDQUNaLFFBQXFCLEVBQ3JCLFNBQXNCLEVBQ3RCLFVBQWdDO1FBRWhDLFFBQVE7UUFDUixRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDakIsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRWxCLFFBQVEsQ0FBQyxXQUFXLENBQUMsc0JBQXNCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbkQsU0FBUyxDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUVwRCw2Q0FBNkM7UUFDN0MsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7WUFDdEIsR0FBRyxFQUFFLHlCQUF5QjtZQUM5QixJQUFJLEVBQUUsQ0FBQyxDQUNOLG1NQUFtTSxDQUNuTTtTQUNELENBQUMsQ0FBQztRQUVILG9CQUFvQjtRQUNwQixNQUFNLFdBQVcsR0FBRyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUMsTUFBTSxDQUFDO1FBRWpELDZCQUE2QjtRQUM3QixNQUFNLFdBQVcsR0FBbUM7WUFDbkQ7Z0JBQ0MsRUFBRSxFQUFFLFFBQVE7Z0JBQ1osS0FBSyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUM7Z0JBQ2xCLFFBQVEsRUFBRSxDQUFDLENBQUMsZ0JBQWdCLENBQUM7Z0JBQzdCLFdBQVcsRUFBRSxDQUFDLENBQ2IsbUVBQW1FLENBQ25FO2dCQUNE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QUMsQ0FBQztRQUNILEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQztRQUM1QixHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUM7UUFDN0IsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQ2hDLEdBQUcsQ0FBQyxLQUFLLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQztRQUUvQixPQUFPLE9BQU8sQ0FBQztJQUNoQixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQge1xyXG5cdFNlbGVjdGFibGVDYXJkLFxyXG5cdFNlbGVjdGFibGVDYXJkQ29uZmlnLFxyXG59IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvb25ib2FyZGluZy91aS9TZWxlY3RhYmxlQ2FyZFwiO1xyXG5pbXBvcnQgeyBPbmJvYXJkaW5nQ29udHJvbGxlciB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvb25ib2FyZGluZy9PbmJvYXJkaW5nQ29udHJvbGxlclwiO1xyXG5pbXBvcnQgeyBBbGVydCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvb25ib2FyZGluZy91aS9BbGVydFwiO1xyXG5cclxuZXhwb3J0IHR5cGUgVUlNb2RlID0gXCJmbHVlbnRcIiB8IFwibGVnYWN5XCI7XHJcblxyXG4vKipcclxuICogTW9kZSBTZWxlY3Rpb24gU3RlcCAtIENob29zZSBiZXR3ZWVuIEZsdWVudCBhbmQgTGVnYWN5IFVJXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgTW9kZVNlbGVjdGlvblN0ZXAge1xyXG5cdC8qKlxyXG5cdCAqIFJlbmRlciB0aGUgbW9kZSBzZWxlY3Rpb24gc3RlcFxyXG5cdCAqL1xyXG5cdHN0YXRpYyByZW5kZXIoXHJcblx0XHRoZWFkZXJFbDogSFRNTEVsZW1lbnQsXHJcblx0XHRjb250ZW50RWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0Y29udHJvbGxlcjogT25ib2FyZGluZ0NvbnRyb2xsZXIsXHJcblx0KSB7XHJcblx0XHQvLyBDbGVhclxyXG5cdFx0aGVhZGVyRWwuZW1wdHkoKTtcclxuXHRcdGNvbnRlbnRFbC5lbXB0eSgpO1xyXG5cclxuXHRcdGhlYWRlckVsLnRvZ2dsZUNsYXNzKFwiaW50cm8tdHlwaW5nLXdyYXBwZXJcIiwgdHJ1ZSk7XHJcblx0XHRjb250ZW50RWwudG9nZ2xlQ2xhc3MoXCJpbnRyby10eXBpbmctd3JhcHBlclwiLCB0cnVlKTtcclxuXHJcblx0XHQvLyBJbnRybyBndWlkYW5jZSB0ZXh0IChzYW1lIGFzIGludHJvLWxpbmUtNClcclxuXHRcdGhlYWRlckVsLmNyZWF0ZUVsKFwicFwiLCB7XHJcblx0XHRcdGNsczogXCJpbnRyby1saW5lIGludHJvLWxpbmUtNFwiLFxyXG5cdFx0XHR0ZXh0OiB0KFxyXG5cdFx0XHRcdFwiSW4gdGhlIGN1cnJlbnQgdmVyc2lvbiwgVGFzayBHZW5pdXMgcHJvdmlkZXMgYSBicmFuZCBuZXcgdmlzdWFsIGFuZCBpbnRlcmFjdGl2ZSBleHBlcmllbmNlOiBGbHVlbnQ7IHdoaWxlIGFsc28gcHJvdmlkaW5nIHRoZSBvcHRpb24gdG8gcmV0dXJuIHRvIHRoZSBwcmV2aW91cyBpbnRlcmZhY2UuIFdoaWNoIG9uZSBkbyB5b3UgcHJlZmVyP1wiLFxyXG5cdFx0XHQpLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gR2V0IGN1cnJlbnQgc3RhdGVcclxuXHRcdGNvbnN0IGN1cnJlbnRNb2RlID0gY29udHJvbGxlci5nZXRTdGF0ZSgpLnVpTW9kZTtcclxuXHJcblx0XHQvLyBDcmVhdGUgY2FyZHMgY29uZmlndXJhdGlvblxyXG5cdFx0Y29uc3QgY2FyZENvbmZpZ3M6IFNlbGVjdGFibGVDYXJkQ29uZmlnPFVJTW9kZT5bXSA9IFtcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGlkOiBcImZsdWVudFwiLFxyXG5cdFx0XHRcdHRpdGxlOiB0KFwiRmx1ZW50XCIpLFxyXG5cdFx0XHRcdHN1YnRpdGxlOiB0KFwiTW9kZXJuICYgU2xlZWtcIiksXHJcblx0XHRcdFx0ZGVzY3JpcHRpb246IHQoXHJcblx0XHRcdFx0XHRcIk5ldyB2aXN1YWwgZGVzaWduIHdpdGggZWxlZ2FudCBhbmltYXRpb25zIGFuZCBtb2Rlcm4gaW50ZXJhY3Rpb25zXCIsXHJcblx0XHRcdFx0KSxcclxuXHRcdFx0XHRwcmV2aWV3OiB0aGlzLmNyZWF0ZUZsdWVudFByZXZpZXcoKSxcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGlkOiBcImxlZ2FjeVwiLFxyXG5cdFx0XHRcdHRpdGxlOiB0KFwiTGVnYWN5XCIpLFxyXG5cdFx0XHRcdHN1YnRpdGxlOiB0KFwiQ2xhc3NpYyAmIEZhbWlsaWFyXCIpLFxyXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiB0KFxyXG5cdFx0XHRcdFx0XCJLZWVwIHRoZSBmYW1pbGlhciBpbnRlcmZhY2UgYW5kIGludGVyYWN0aW9uIHN0eWxlIHlvdSBrbm93XCIsXHJcblx0XHRcdFx0KSxcclxuXHRcdFx0XHRwcmV2aWV3OiB0aGlzLmNyZWF0ZUxlZ2FjeVByZXZpZXcoKSxcclxuXHRcdFx0fSxcclxuXHRcdF07XHJcblxyXG5cdFx0Ly8gUmVuZGVyIHNlbGVjdGFibGUgY2FyZHNcclxuXHRcdGNvbnN0IGNhcmQgPSBuZXcgU2VsZWN0YWJsZUNhcmQ8VUlNb2RlPihcclxuXHRcdFx0Y29udGVudEVsLFxyXG5cdFx0XHRjYXJkQ29uZmlncyxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNvbnRhaW5lckNsYXNzOiBcInNlbGVjdGFibGUtY2FyZHMtY29udGFpbmVyXCIsXHJcblx0XHRcdFx0Y2FyZENsYXNzOiBcInNlbGVjdGFibGUtY2FyZFwiLFxyXG5cdFx0XHRcdHNob3dQcmV2aWV3OiB0cnVlLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHQobW9kZSkgPT4ge1xyXG5cdFx0XHRcdGNvbnRyb2xsZXIuc2V0VUlNb2RlKG1vZGUpO1xyXG5cdFx0XHR9LFxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBTZXQgaW5pdGlhbCBzZWxlY3Rpb25cclxuXHRcdGlmIChjdXJyZW50TW9kZSkge1xyXG5cdFx0XHRjYXJkLnNldFNlbGVjdGVkKGN1cnJlbnRNb2RlKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGQgaW5mbyBhbGVydFxyXG5cdFx0QWxlcnQuY3JlYXRlKFxyXG5cdFx0XHRjb250ZW50RWwsXHJcblx0XHRcdHQoXCJZb3UgY2FuIGNoYW5nZSB0aGlzIG9wdGlvbiBsYXRlciBpbiBpbnRlcmZhY2Ugc2V0dGluZ3NcIiksXHJcblx0XHRcdHtcclxuXHRcdFx0XHR2YXJpYW50OiBcImluZm9cIixcclxuXHRcdFx0XHRjbGFzc05hbWU6IFwibW9kZS1zZWxlY3Rpb24tdGlwXCIsXHJcblx0XHRcdH0sXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ3JlYXRlIEZsdWVudCBtb2RlIHByZXZpZXdcclxuXHQgKi9cclxuXHRwcml2YXRlIHN0YXRpYyBjcmVhdGVGbHVlbnRQcmV2aWV3KCk6IEhUTUxFbGVtZW50IHtcclxuXHRcdGNvbnN0IHByZXZpZXcgPSBjcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFtcIm1vZGUtcHJldmlld1wiLCBcIm1vZGUtcHJldmlldy1mbHVlbnRcIl0sXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDaGVjayB0aGVtZVxyXG5cdFx0Y29uc3QgaXNEYXJrID0gZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QuY29udGFpbnMoXCJ0aGVtZS1kYXJrXCIpO1xyXG5cdFx0Y29uc3QgdGhlbWUgPSBpc0RhcmsgPyBcIlwiIDogXCItbGlnaHRcIjtcclxuXHRcdGNvbnN0IGltYWdlVXJsID0gYGh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9RdW9yYWZpbmQvT2JzaWRpYW4tVGFzay1Qcm9ncmVzcy1CYXIvbWFzdGVyL21lZGlhL2ZsdWVudCR7dGhlbWV9LnBuZ2A7XHJcblxyXG5cdFx0Y29uc3QgaW1nID0gcHJldmlldy5jcmVhdGVFbChcImltZ1wiLCB7XHJcblx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHRzcmM6IGltYWdlVXJsLFxyXG5cdFx0XHRcdGFsdDogXCJGbHVlbnQgbW9kZSBwcmV2aWV3XCIsXHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHRcdGltZy5zdHlsZS5tYXhXaWR0aCA9IFwiMTAwJVwiO1xyXG5cdFx0aW1nLnN0eWxlLm1heEhlaWdodCA9IFwiMTAwJVwiO1xyXG5cdFx0aW1nLnN0eWxlLm9iamVjdEZpdCA9IFwiY29udGFpblwiO1xyXG5cdFx0aW1nLnN0eWxlLmJvcmRlclJhZGl1cyA9IFwiNHB4XCI7XHJcblxyXG5cdFx0cmV0dXJuIHByZXZpZXc7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDcmVhdGUgTGVnYWN5IG1vZGUgcHJldmlld1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgc3RhdGljIGNyZWF0ZUxlZ2FjeVByZXZpZXcoKTogSFRNTEVsZW1lbnQge1xyXG5cdFx0Y29uc3QgcHJldmlldyA9IGNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogW1wibW9kZS1wcmV2aWV3XCIsIFwibW9kZS1wcmV2aWV3LWxlZ2FjeVwiXSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIENoZWNrIHRoZW1lXHJcblx0XHRjb25zdCBpc0RhcmsgPSBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5jb250YWlucyhcInRoZW1lLWRhcmtcIik7XHJcblx0XHRjb25zdCB0aGVtZSA9IGlzRGFyayA/IFwiXCIgOiBcIi1saWdodFwiO1xyXG5cdFx0Y29uc3QgaW1hZ2VVcmwgPSBgaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL1F1b3JhZmluZC9PYnNpZGlhbi1UYXNrLVByb2dyZXNzLUJhci9tYXN0ZXIvbWVkaWEvbGVnYWN5JHt0aGVtZX0ucG5nYDtcclxuXHJcblx0XHRjb25zdCBpbWcgPSBwcmV2aWV3LmNyZWF0ZUVsKFwiaW1nXCIsIHtcclxuXHRcdFx0YXR0cjoge1xyXG5cdFx0XHRcdHNyYzogaW1hZ2VVcmwsXHJcblx0XHRcdFx0YWx0OiBcIkxlZ2FjeSBtb2RlIHByZXZpZXdcIixcclxuXHRcdFx0fSxcclxuXHRcdH0pO1xyXG5cdFx0aW1nLnN0eWxlLm1heFdpZHRoID0gXCIxMDAlXCI7XHJcblx0XHRpbWcuc3R5bGUubWF4SGVpZ2h0ID0gXCIxMDAlXCI7XHJcblx0XHRpbWcuc3R5bGUub2JqZWN0Rml0ID0gXCJjb250YWluXCI7XHJcblx0XHRpbWcuc3R5bGUuYm9yZGVyUmFkaXVzID0gXCI0cHhcIjtcclxuXHJcblx0XHRyZXR1cm4gcHJldmlldztcclxuXHR9XHJcbn1cclxuIl19