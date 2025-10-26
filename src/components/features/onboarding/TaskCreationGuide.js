import { Setting, Notice, setIcon } from "obsidian";
import { t } from "@/translations/helper";
import { QuickCaptureModal } from "@/components/features/quick-capture/modals/QuickCaptureModalWithSwitch";
export class TaskCreationGuide {
    constructor(plugin) {
        this.plugin = plugin;
    }
    /**
     * Render task creation guide
     */
    render(containerEl) {
        containerEl.empty();
        // Introduction
        const introSection = containerEl.createDiv("task-guide-intro");
        introSection.createEl("p", {
            text: t("Learn the different ways to create and format tasks in Task Genius. You can use either emoji-based or Dataview-style syntax."),
            cls: "guide-description",
        });
        // Task format examples
        this.renderTaskFormats(containerEl);
        // Quick capture demo
        this.renderQuickCaptureDemo(containerEl);
    }
    /**
     * Render task format examples
     */
    renderTaskFormats(containerEl) {
        const formatsSection = containerEl.createDiv("task-formats-section");
        formatsSection.createEl("h3", { text: t("Task Format Examples") });
        // Basic task format
        const basicFormat = formatsSection.createDiv("format-example");
        basicFormat.createEl("h4", { text: t("Basic Task") });
        basicFormat.createEl("code", {
            text: "- [ ] Complete project documentation",
        });
        // Emoji format
        const emojiFormat = formatsSection.createDiv("format-example");
        emojiFormat.createEl("h4", { text: t("With Emoji Metadata") });
        emojiFormat.createEl("code", {
            text: "- [ ] Complete project documentation 📅 2024-01-15 🔺 #project/docs",
        });
        const emojiLegend = emojiFormat.createDiv("format-legend");
        emojiLegend.createEl("small", {
            text: t("📅 = Due date, 🔺 = High priority, #project/ = Docs project tag"),
        });
        // Dataview format
        const dataviewFormat = formatsSection.createDiv("format-example");
        dataviewFormat.createEl("h4", { text: t("With Dataview Metadata") });
        dataviewFormat.createEl("code", {
            text: "- [ ] Complete project documentation [due:: 2024-01-15] [priority:: high] [project:: docs]",
        });
        // Mixed format
        const mixedFormat = formatsSection.createDiv("format-example");
        mixedFormat.createEl("h4", { text: t("Mixed Format") });
        mixedFormat.createEl("code", {
            text: "- [ ] Complete project documentation 📅 2024-01-15 [priority:: high] @work",
        });
        const mixedLegend = mixedFormat.createDiv("format-legend");
        mixedLegend.createEl("small", {
            text: t("Combine emoji and dataview syntax as needed"),
        });
        // Status markers
        const statusSection = formatsSection.createDiv("status-markers");
        statusSection.createEl("h4", { text: t("Task Status Markers") });
        const statusList = statusSection.createEl("ul", { cls: "status-list" });
        const statusMarkers = [
            { marker: "[ ]", description: t("Not started") },
            { marker: "[x]", description: t("Completed") },
            { marker: "[/]", description: t("In progress") },
            { marker: "[?]", description: t("Planned") },
            { marker: "[-]", description: t("Abandoned") },
        ];
        statusMarkers.forEach((status) => {
            const item = statusList.createEl("li");
            item.createEl("code", { text: status.marker });
            item.createSpan().setText(" - " + status.description);
        });
        // Metadata symbols
        const metadataSection = formatsSection.createDiv("metadata-symbols");
        metadataSection.createEl("h4", { text: t("Common Metadata Symbols") });
        const symbolsList = metadataSection.createEl("ul", {
            cls: "symbols-list",
        });
        const symbols = [
            { symbol: "📅", description: t("Due date") },
            { symbol: "🛫", description: t("Start date") },
            { symbol: "⏳", description: t("Scheduled date") },
            { symbol: "🔺", description: t("High priority") },
            { symbol: "⏫", description: t("Higher priority") },
            { symbol: "🔼", description: t("Medium priority") },
            { symbol: "🔽", description: t("Lower priority") },
            { symbol: "⏬", description: t("Lowest priority") },
            { symbol: "🔁", description: t("Recurring task") },
            { symbol: "#", description: t("Project/tag") },
            { symbol: "@", description: t("Context") },
        ];
        symbols.forEach((symbol) => {
            const item = symbolsList.createEl("li");
            item.createSpan().setText(symbol.symbol + " - " + symbol.description);
        });
    }
    /**
     * Render quick capture demo
     */
    renderQuickCaptureDemo(containerEl) {
        const quickCaptureSection = containerEl.createDiv("quick-capture-section");
        quickCaptureSection.createEl("h3", { text: t("Quick Capture") });
        const demoContent = quickCaptureSection.createDiv("demo-content");
        demoContent.createEl("p", {
            text: t("Use quick capture panel to quickly capture tasks from anywhere in Obsidian."),
        });
        // Demo button
        const demoButton = demoContent.createEl("button", {
            text: t("Try Quick Capture"),
            cls: "mod-cta demo-button",
        });
        demoButton.addEventListener("click", () => {
            var _a;
            // Try to open quick capture modal
            try {
                if ((_a = this.plugin.settings.quickCapture) === null || _a === void 0 ? void 0 : _a.enableQuickCapture) {
                    // Use the direct import of QuickCaptureModal
                    new QuickCaptureModal(this.plugin.app, this.plugin).open();
                }
                else {
                    // Show info that quick capture will be enabled
                    new Notice(t("Quick capture is now enabled in your configuration!"), 3000);
                }
            }
            catch (error) {
                console.error("Failed to open quick capture:", error);
                new Notice(t("Failed to open quick capture. Please try again later."), 3000);
            }
        });
    }
    /**
     * Render interactive practice section
     */
    renderInteractivePractice(containerEl) {
        const practiceSection = containerEl.createDiv("practice-section");
        practiceSection.createEl("h3", { text: t("Try It Yourself") });
        practiceSection.createEl("p", {
            text: t("Practice creating a task with the format you prefer:"),
        });
        let practiceInput;
        new Setting(practiceSection)
            .setName(t("Practice Task"))
            .setDesc(t("Enter a task using any of the formats shown above"))
            .addTextArea((textArea) => {
            practiceInput = textArea;
            textArea
                .setPlaceholder(t("- [ ] Your task here"))
                .setValue("")
                .then(() => {
                textArea.inputEl.rows = 3;
                textArea.inputEl.style.width = "100%";
            });
        });
        // Validation feedback
        const feedback = practiceSection.createDiv("practice-feedback");
        // Validate button
        const validateButton = practiceSection.createEl("button", {
            text: t("Validate Task"),
            cls: "demo-button",
        });
        validateButton.addEventListener("click", () => {
            const input = practiceInput.getValue().trim();
            this.validateTaskFormat(input, feedback);
        });
    }
    /**
     * Validate task format
     */
    validateTaskFormat(input, feedbackEl) {
        feedbackEl.empty();
        if (!input) {
            feedbackEl.createEl("div", {
                text: t("Please enter a task to validate"),
                cls: "validation-message validation-warning",
            });
            return;
        }
        // Check if it's a valid task format
        const isValidTask = /^-\s*\[.\]\s*.+/.test(input);
        if (!isValidTask) {
            feedbackEl.createEl("div", {
                text: t("This doesn't look like a valid task. Tasks should start with '- [ ]'"),
                cls: "validation-message validation-error",
            });
            return;
        }
        // Check for metadata
        const hasEmojiMetadata = /[📅🛫⏳🔺⏫🔼🔽⏬🔁]/.test(input);
        const hasDataviewMetadata = /\[[\w]+::[^\]]+\]/.test(input);
        const hasProjectTag = /#[\w\/]+/.test(input);
        const hasContext = /@[\w]+/.test(input);
        const successMessage = feedbackEl.createEl("div", {
            cls: "validation-message validation-success",
        });
        const checkIcon = successMessage.createSpan();
        setIcon(checkIcon, "check");
        successMessage.createSpan().setText(" " + t("Valid task format!"));
        // Provide feedback on detected metadata
        const detectedFeatures = [];
        if (hasEmojiMetadata)
            detectedFeatures.push(t("Emoji metadata"));
        if (hasDataviewMetadata)
            detectedFeatures.push(t("Dataview metadata"));
        if (hasProjectTag)
            detectedFeatures.push(t("Project tags"));
        if (hasContext)
            detectedFeatures.push(t("Context"));
        if (detectedFeatures.length > 0) {
            feedbackEl.createEl("div", {
                text: t("Detected features: ") + detectedFeatures.join(", "),
                cls: "validation-message validation-info",
            });
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGFza0NyZWF0aW9uR3VpZGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJUYXNrQ3JlYXRpb25HdWlkZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsT0FBTyxFQUFxQixNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBRXZFLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUMxQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUUzRyxNQUFNLE9BQU8saUJBQWlCO0lBRzdCLFlBQVksTUFBNkI7UUFDeEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDdEIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsTUFBTSxDQUFDLFdBQXdCO1FBQzlCLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUVwQixlQUFlO1FBQ2YsTUFBTSxZQUFZLEdBQUcsV0FBVyxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQy9ELFlBQVksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFO1lBQzFCLElBQUksRUFBRSxDQUFDLENBQ04sOEhBQThILENBQzlIO1lBQ0QsR0FBRyxFQUFFLG1CQUFtQjtTQUN4QixDQUFDLENBQUM7UUFFSCx1QkFBdUI7UUFDdkIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRXBDLHFCQUFxQjtRQUNyQixJQUFJLENBQUMsc0JBQXNCLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVEOztPQUVHO0lBQ0ssaUJBQWlCLENBQUMsV0FBd0I7UUFDakQsTUFBTSxjQUFjLEdBQUcsV0FBVyxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ3JFLGNBQWMsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztR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LFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUM1QixjQUFjLENBQUMsVUFBVSxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO1FBRW5FLHdDQUF3QztRQUN4QyxNQUFNLGdCQUFnQixHQUFHLEVBQUUsQ0FBQztRQUM1QixJQUFJLGdCQUFnQjtZQUFFLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1FBQ2pFLElBQUksbUJBQW1CO1lBQUUsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7UUFDdkUsSUFBSSxhQUFhO1lBQUUsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1FBQzVELElBQUksVUFBVTtZQUFFLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUVwRCxJQUFJLGdCQUFnQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDaEMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUU7Z0JBQzFCLElBQUksRUFBRSxDQUFDLENBQUMscUJBQXFCLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO2dCQUM1RCxHQUFHLEVBQUUsb0NBQW9DO2FBQ3pDLENBQUMsQ0FBQztTQUNIO0lBQ0YsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU2V0dGluZywgVGV4dEFyZWFDb21wb25lbnQsIE5vdGljZSwgc2V0SWNvbiB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgdHlwZSBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHsgUXVpY2tDYXB0dXJlTW9kYWwgfSBmcm9tIFwiQC9jb21wb25lbnRzL2ZlYXR1cmVzL3F1aWNrLWNhcHR1cmUvbW9kYWxzL1F1aWNrQ2FwdHVyZU1vZGFsV2l0aFN3aXRjaFwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFRhc2tDcmVhdGlvbkd1aWRlIHtcclxuXHRwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbikge1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW5kZXIgdGFzayBjcmVhdGlvbiBndWlkZVxyXG5cdCAqL1xyXG5cdHJlbmRlcihjb250YWluZXJFbDogSFRNTEVsZW1lbnQpIHtcclxuXHRcdGNvbnRhaW5lckVsLmVtcHR5KCk7XHJcblxyXG5cdFx0Ly8gSW50cm9kdWN0aW9uXHJcblx0XHRjb25zdCBpbnRyb1NlY3Rpb24gPSBjb250YWluZXJFbC5jcmVhdGVEaXYoXCJ0YXNrLWd1aWRlLWludHJvXCIpO1xyXG5cdFx0aW50cm9TZWN0aW9uLmNyZWF0ZUVsKFwicFwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXHJcblx0XHRcdFx0XCJMZWFybiB0aGUgZGlmZmVyZW50IHdheXMgdG8gY3JlYXRlIGFuZCBmb3JtYXQgdGFza3MgaW4gVGFzayBHZW5pdXMuIFlvdSBjYW4gdXNlIGVpdGhlciBlbW9qaS1iYXNlZCBvciBEYXRhdmlldy1zdHlsZSBzeW50YXguXCIsXHJcblx0XHRcdCksXHJcblx0XHRcdGNsczogXCJndWlkZS1kZXNjcmlwdGlvblwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gVGFzayBmb3JtYXQgZXhhbXBsZXNcclxuXHRcdHRoaXMucmVuZGVyVGFza0Zvcm1hdHMoY29udGFpbmVyRWwpO1xyXG5cclxuXHRcdC8vIFF1aWNrIGNhcHR1cmUgZGVtb1xyXG5cdFx0dGhpcy5yZW5kZXJRdWlja0NhcHR1cmVEZW1vKGNvbnRhaW5lckVsKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbmRlciB0YXNrIGZvcm1hdCBleGFtcGxlc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgcmVuZGVyVGFza0Zvcm1hdHMoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KSB7XHJcblx0XHRjb25zdCBmb3JtYXRzU2VjdGlvbiA9IGNvbnRhaW5lckVsLmNyZWF0ZURpdihcInRhc2stZm9ybWF0cy1zZWN0aW9uXCIpO1xyXG5cdFx0Zm9ybWF0c1NlY3Rpb24uY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IHQoXCJUYXNrIEZvcm1hdCBFeGFtcGxlc1wiKSB9KTtcclxuXHJcblx0XHQvLyBCYXNpYyB0YXNrIGZvcm1hdFxyXG5cdFx0Y29uc3QgYmFzaWNGb3JtYXQgPSBmb3JtYXRzU2VjdGlvbi5jcmVhdGVEaXYoXCJmb3JtYXQtZXhhbXBsZVwiKTtcclxuXHRcdGJhc2ljRm9ybWF0LmNyZWF0ZUVsKFwiaDRcIiwgeyB0ZXh0OiB0KFwiQmFzaWMgVGFza1wiKSB9KTtcclxuXHRcdGJhc2ljRm9ybWF0LmNyZWF0ZUVsKFwiY29kZVwiLCB7XHJcblx0XHRcdHRleHQ6IFwiLSBbIF0gQ29tcGxldGUgcHJvamVjdCBkb2N1bWVudGF0aW9uXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBFbW9qaSBmb3JtYXRcclxuXHRcdGNvbnN0IGVtb2ppRm9ybWF0ID0gZm9ybWF0c1NlY3Rpb24uY3JlYXRlRGl2KFwiZm9ybWF0LWV4YW1wbGVcIik7XHJcblx0XHRlbW9qaUZvcm1hdC5jcmVhdGVFbChcImg0XCIsIHsgdGV4dDogdChcIldpdGggRW1vamkgTWV0YWRhdGFcIikgfSk7XHJcblx0XHRlbW9qaUZvcm1hdC5jcmVhdGVFbChcImNvZGVcIiwge1xyXG5cdFx0XHR0ZXh0OiBcIi0gWyBdIENvbXBsZXRlIHByb2plY3QgZG9jdW1lbnRhdGlvbiDwn5OFIDIwMjQtMDEtMTUg8J+UuiAjcHJvamVjdC9kb2NzXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCBlbW9qaUxlZ2VuZCA9IGVtb2ppRm9ybWF0LmNyZWF0ZURpdihcImZvcm1hdC1sZWdlbmRcIik7XHJcblx0XHRlbW9qaUxlZ2VuZC5jcmVhdGVFbChcInNtYWxsXCIsIHtcclxuXHRcdFx0dGV4dDogdChcclxuXHRcdFx0XHRcIvCfk4UgPSBEdWUgZGF0ZSwg8J+UuiA9IEhpZ2ggcHJpb3JpdHksICNwcm9qZWN0LyA9IERvY3MgcHJvamVjdCB0YWdcIixcclxuXHRcdFx0KSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIERhdGF2aWV3IGZvcm1hdFxyXG5cdFx0Y29uc3QgZGF0YXZpZXdGb3JtYXQgPSBmb3JtYXRzU2VjdGlvbi5jcmVhdGVEaXYoXCJmb3JtYXQtZXhhbXBsZVwiKTtcclxuXHRcdGRhdGF2aWV3Rm9ybWF0LmNyZWF0ZUVsKFwiaDRcIiwgeyB0ZXh0OiB0KFwiV2l0aCBEYXRhdmlldyBNZXRhZGF0YVwiKSB9KTtcclxuXHRcdGRhdGF2aWV3Rm9ybWF0LmNyZWF0ZUVsKFwiY29kZVwiLCB7XHJcblx0XHRcdHRleHQ6IFwiLSBbIF0gQ29tcGxldGUgcHJvamVjdCBkb2N1bWVudGF0aW9uIFtkdWU6OiAyMDI0LTAxLTE1XSBbcHJpb3JpdHk6OiBoaWdoXSBbcHJvamVjdDo6IGRvY3NdXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBNaXhlZCBmb3JtYXRcclxuXHRcdGNvbnN0IG1peGVkRm9ybWF0ID0gZm9ybWF0c1NlY3Rpb24uY3JlYXRlRGl2KFwiZm9ybWF0LWV4YW1wbGVcIik7XHJcblx0XHRtaXhlZEZvcm1hdC5jcmVhdGVFbChcImg0XCIsIHsgdGV4dDogdChcIk1peGVkIEZvcm1hdFwiKSB9KTtcclxuXHRcdG1peGVkRm9ybWF0LmNyZWF0ZUVsKFwiY29kZVwiLCB7XHJcblx0XHRcdHRleHQ6IFwiLSBbIF0gQ29tcGxldGUgcHJvamVjdCBkb2N1bWVudGF0aW9uIPCfk4UgMjAyNC0wMS0xNSBbcHJpb3JpdHk6OiBoaWdoXSBAd29ya1wiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgbWl4ZWRMZWdlbmQgPSBtaXhlZEZvcm1hdC5jcmVhdGVEaXYoXCJmb3JtYXQtbGVnZW5kXCIpO1xyXG5cdFx0bWl4ZWRMZWdlbmQuY3JlYXRlRWwoXCJzbWFsbFwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXCJDb21iaW5lIGVtb2ppIGFuZCBkYXRhdmlldyBzeW50YXggYXMgbmVlZGVkXCIpLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gU3RhdHVzIG1hcmtlcnNcclxuXHRcdGNvbnN0IHN0YXR1c1NlY3Rpb24gPSBmb3JtYXRzU2VjdGlvbi5jcmVhdGVEaXYoXCJzdGF0dXMtbWFya2Vyc1wiKTtcclxuXHRcdHN0YXR1c1NlY3Rpb24uY3JlYXRlRWwoXCJoNFwiLCB7IHRleHQ6IHQoXCJUYXNrIFN0YXR1cyBNYXJrZXJzXCIpIH0pO1xyXG5cclxuXHRcdGNvbnN0IHN0YXR1c0xpc3QgPSBzdGF0dXNTZWN0aW9uLmNyZWF0ZUVsKFwidWxcIiwgeyBjbHM6IFwic3RhdHVzLWxpc3RcIiB9KTtcclxuXHRcdGNvbnN0IHN0YXR1c01hcmtlcnMgPSBbXHJcblx0XHRcdHsgbWFya2VyOiBcIlsgXVwiLCBkZXNjcmlwdGlvbjogdChcIk5vdCBzdGFydGVkXCIpIH0sXHJcblx0XHRcdHsgbWFya2VyOiBcIlt4XVwiLCBkZXNjcmlwdGlvbjogdChcIkNvbXBsZXRlZFwiKSB9LFxyXG5cdFx0XHR7IG1hcmtlcjogXCJbL11cIiwgZGVzY3JpcHRpb246IHQoXCJJbiBwcm9ncmVzc1wiKSB9LFxyXG5cdFx0XHR7IG1hcmtlcjogXCJbP11cIiwgZGVzY3JpcHRpb246IHQoXCJQbGFubmVkXCIpIH0sXHJcblx0XHRcdHsgbWFya2VyOiBcIlstXVwiLCBkZXNjcmlwdGlvbjogdChcIkFiYW5kb25lZFwiKSB9LFxyXG5cdFx0XTtcclxuXHJcblx0XHRzdGF0dXNNYXJrZXJzLmZvckVhY2goKHN0YXR1cykgPT4ge1xyXG5cdFx0XHRjb25zdCBpdGVtID0gc3RhdHVzTGlzdC5jcmVhdGVFbChcImxpXCIpO1xyXG5cdFx0XHRpdGVtLmNyZWF0ZUVsKFwiY29kZVwiLCB7IHRleHQ6IHN0YXR1cy5tYXJrZXIgfSk7XHJcblx0XHRcdGl0ZW0uY3JlYXRlU3BhbigpLnNldFRleHQoXCIgLSBcIiArIHN0YXR1cy5kZXNjcmlwdGlvbik7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBNZXRhZGF0YSBzeW1ib2xzXHJcblx0XHRjb25zdCBtZXRhZGF0YVNlY3Rpb24gPSBmb3JtYXRzU2VjdGlvbi5jcmVhdGVEaXYoXCJtZXRhZGF0YS1zeW1ib2xzXCIpO1xyXG5cdFx0bWV0YWRhdGFTZWN0aW9uLmNyZWF0ZUVsKFwiaDRcIiwgeyB0ZXh0OiB0KFwiQ29tbW9uIE1ldGFkYXRhIFN5bWJvbHNcIikgfSk7XHJcblxyXG5cdFx0Y29uc3Qgc3ltYm9sc0xpc3QgPSBtZXRhZGF0YVNlY3Rpb24uY3JlYXRlRWwoXCJ1bFwiLCB7XHJcblx0XHRcdGNsczogXCJzeW1ib2xzLWxpc3RcIixcclxuXHRcdH0pO1xyXG5cdFx0Y29uc3Qgc3ltYm9scyA9IFtcclxuXHRcdFx0eyBzeW1ib2w6IFwi8J+ThVwiLCBkZXNjcmlwdGlvbjogdChcIkR1ZSBkYXRlXCIpIH0sXHJcblx0XHRcdHsgc3ltYm9sOiBcIvCfm6tcIiwgZGVzY3JpcHRpb246IHQoXCJTdGFydCBkYXRlXCIpIH0sXHJcblx0XHRcdHsgc3ltYm9sOiBcIuKPs1wiLCBkZXNjcmlwdGlvbjogdChcIlNjaGVkdWxlZCBkYXRlXCIpIH0sXHJcblx0XHRcdHsgc3ltYm9sOiBcIvCflLpcIiwgZGVzY3JpcHRpb246IHQoXCJIaWdoIHByaW9yaXR5XCIpIH0sXHJcblx0XHRcdHsgc3ltYm9sOiBcIuKPq1wiLCBkZXNjcmlwdGlvbjogdChcIkhpZ2hlciBwcmlvcml0eVwiKSB9LFxyXG5cdFx0XHR7IHN5bWJvbDogXCLwn5S8XCIsIGRlc2NyaXB0aW9uOiB0KFwiTWVkaXVtIHByaW9yaXR5XCIpIH0sXHJcblx0XHRcdHsgc3ltYm9sOiBcIvCflL1cIiwgZGVzY3JpcHRpb246IHQoXCJMb3dlciBwcmlvcml0eVwiKSB9LFxyXG5cdFx0XHR7IHN5bWJvbDogXCLij6xcIiwgZGVzY3JpcHRpb246IHQoXCJMb3dlc3QgcHJpb3JpdHlcIikgfSxcclxuXHRcdFx0eyBzeW1ib2w6IFwi8J+UgVwiLCBkZXNjcmlwdGlvbjogdChcIlJlY3VycmluZyB0YXNrXCIpIH0sXHJcblx0XHRcdHsgc3ltYm9sOiBcIiNcIiwgZGVzY3JpcHRpb246IHQoXCJQcm9qZWN0L3RhZ1wiKSB9LFxyXG5cdFx0XHR7IHN5bWJvbDogXCJAXCIsIGRlc2NyaXB0aW9uOiB0KFwiQ29udGV4dFwiKSB9LFxyXG5cdFx0XTtcclxuXHJcblx0XHRzeW1ib2xzLmZvckVhY2goKHN5bWJvbCkgPT4ge1xyXG5cdFx0XHRjb25zdCBpdGVtID0gc3ltYm9sc0xpc3QuY3JlYXRlRWwoXCJsaVwiKTtcclxuXHRcdFx0aXRlbS5jcmVhdGVTcGFuKCkuc2V0VGV4dChcclxuXHRcdFx0XHRzeW1ib2wuc3ltYm9sICsgXCIgLSBcIiArIHN5bWJvbC5kZXNjcmlwdGlvbixcclxuXHRcdFx0KTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVuZGVyIHF1aWNrIGNhcHR1cmUgZGVtb1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgcmVuZGVyUXVpY2tDYXB0dXJlRGVtbyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpIHtcclxuXHRcdGNvbnN0IHF1aWNrQ2FwdHVyZVNlY3Rpb24gPSBjb250YWluZXJFbC5jcmVhdGVEaXYoXHJcblx0XHRcdFwicXVpY2stY2FwdHVyZS1zZWN0aW9uXCIsXHJcblx0XHQpO1xyXG5cdFx0cXVpY2tDYXB0dXJlU2VjdGlvbi5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogdChcIlF1aWNrIENhcHR1cmVcIikgfSk7XHJcblxyXG5cdFx0Y29uc3QgZGVtb0NvbnRlbnQgPSBxdWlja0NhcHR1cmVTZWN0aW9uLmNyZWF0ZURpdihcImRlbW8tY29udGVudFwiKTtcclxuXHRcdGRlbW9Db250ZW50LmNyZWF0ZUVsKFwicFwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXHJcblx0XHRcdFx0XCJVc2UgcXVpY2sgY2FwdHVyZSBwYW5lbCB0byBxdWlja2x5IGNhcHR1cmUgdGFza3MgZnJvbSBhbnl3aGVyZSBpbiBPYnNpZGlhbi5cIixcclxuXHRcdFx0KSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIERlbW8gYnV0dG9uXHJcblx0XHRjb25zdCBkZW1vQnV0dG9uID0gZGVtb0NvbnRlbnQuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFwiVHJ5IFF1aWNrIENhcHR1cmVcIiksXHJcblx0XHRcdGNsczogXCJtb2QtY3RhIGRlbW8tYnV0dG9uXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHRkZW1vQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdC8vIFRyeSB0byBvcGVuIHF1aWNrIGNhcHR1cmUgbW9kYWxcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MucXVpY2tDYXB0dXJlPy5lbmFibGVRdWlja0NhcHR1cmUpIHtcclxuXHRcdFx0XHRcdC8vIFVzZSB0aGUgZGlyZWN0IGltcG9ydCBvZiBRdWlja0NhcHR1cmVNb2RhbFxyXG5cdFx0XHRcdFx0bmV3IFF1aWNrQ2FwdHVyZU1vZGFsKHRoaXMucGx1Z2luLmFwcCwgdGhpcy5wbHVnaW4pLm9wZW4oKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0Ly8gU2hvdyBpbmZvIHRoYXQgcXVpY2sgY2FwdHVyZSB3aWxsIGJlIGVuYWJsZWRcclxuXHRcdFx0XHRcdG5ldyBOb3RpY2UoXHJcblx0XHRcdFx0XHRcdHQoXHJcblx0XHRcdFx0XHRcdFx0XCJRdWljayBjYXB0dXJlIGlzIG5vdyBlbmFibGVkIGluIHlvdXIgY29uZmlndXJhdGlvbiFcIixcclxuXHRcdFx0XHRcdFx0KSxcclxuXHRcdFx0XHRcdFx0MzAwMCxcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gb3BlbiBxdWljayBjYXB0dXJlOlwiLCBlcnJvcik7XHJcblx0XHRcdFx0bmV3IE5vdGljZShcclxuXHRcdFx0XHRcdHQoXCJGYWlsZWQgdG8gb3BlbiBxdWljayBjYXB0dXJlLiBQbGVhc2UgdHJ5IGFnYWluIGxhdGVyLlwiKSxcclxuXHRcdFx0XHRcdDMwMDAsXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW5kZXIgaW50ZXJhY3RpdmUgcHJhY3RpY2Ugc2VjdGlvblxyXG5cdCAqL1xyXG5cdHByaXZhdGUgcmVuZGVySW50ZXJhY3RpdmVQcmFjdGljZShjb250YWluZXJFbDogSFRNTEVsZW1lbnQpIHtcclxuXHRcdGNvbnN0IHByYWN0aWNlU2VjdGlvbiA9IGNvbnRhaW5lckVsLmNyZWF0ZURpdihcInByYWN0aWNlLXNlY3Rpb25cIik7XHJcblx0XHRwcmFjdGljZVNlY3Rpb24uY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IHQoXCJUcnkgSXQgWW91cnNlbGZcIikgfSk7XHJcblxyXG5cdFx0cHJhY3RpY2VTZWN0aW9uLmNyZWF0ZUVsKFwicFwiLCB7XHJcblx0XHRcdHRleHQ6IHQoXCJQcmFjdGljZSBjcmVhdGluZyBhIHRhc2sgd2l0aCB0aGUgZm9ybWF0IHlvdSBwcmVmZXI6XCIpLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0bGV0IHByYWN0aWNlSW5wdXQ6IFRleHRBcmVhQ29tcG9uZW50O1xyXG5cclxuXHRcdG5ldyBTZXR0aW5nKHByYWN0aWNlU2VjdGlvbilcclxuXHRcdFx0LnNldE5hbWUodChcIlByYWN0aWNlIFRhc2tcIikpXHJcblx0XHRcdC5zZXREZXNjKHQoXCJFbnRlciBhIHRhc2sgdXNpbmcgYW55IG9mIHRoZSBmb3JtYXRzIHNob3duIGFib3ZlXCIpKVxyXG5cdFx0XHQuYWRkVGV4dEFyZWEoKHRleHRBcmVhKSA9PiB7XHJcblx0XHRcdFx0cHJhY3RpY2VJbnB1dCA9IHRleHRBcmVhO1xyXG5cdFx0XHRcdHRleHRBcmVhXHJcblx0XHRcdFx0XHQuc2V0UGxhY2Vob2xkZXIodChcIi0gWyBdIFlvdXIgdGFzayBoZXJlXCIpKVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKFwiXCIpXHJcblx0XHRcdFx0XHQudGhlbigoKSA9PiB7XHJcblx0XHRcdFx0XHRcdHRleHRBcmVhLmlucHV0RWwucm93cyA9IDM7XHJcblx0XHRcdFx0XHRcdHRleHRBcmVhLmlucHV0RWwuc3R5bGUud2lkdGggPSBcIjEwMCVcIjtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHQvLyBWYWxpZGF0aW9uIGZlZWRiYWNrXHJcblx0XHRjb25zdCBmZWVkYmFjayA9IHByYWN0aWNlU2VjdGlvbi5jcmVhdGVEaXYoXCJwcmFjdGljZS1mZWVkYmFja1wiKTtcclxuXHJcblx0XHQvLyBWYWxpZGF0ZSBidXR0b25cclxuXHRcdGNvbnN0IHZhbGlkYXRlQnV0dG9uID0gcHJhY3RpY2VTZWN0aW9uLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0dGV4dDogdChcIlZhbGlkYXRlIFRhc2tcIiksXHJcblx0XHRcdGNsczogXCJkZW1vLWJ1dHRvblwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dmFsaWRhdGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgaW5wdXQgPSBwcmFjdGljZUlucHV0LmdldFZhbHVlKCkudHJpbSgpO1xyXG5cdFx0XHR0aGlzLnZhbGlkYXRlVGFza0Zvcm1hdChpbnB1dCwgZmVlZGJhY2spO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBWYWxpZGF0ZSB0YXNrIGZvcm1hdFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgdmFsaWRhdGVUYXNrRm9ybWF0KGlucHV0OiBzdHJpbmcsIGZlZWRiYWNrRWw6IEhUTUxFbGVtZW50KSB7XHJcblx0XHRmZWVkYmFja0VsLmVtcHR5KCk7XHJcblxyXG5cdFx0aWYgKCFpbnB1dCkge1xyXG5cdFx0XHRmZWVkYmFja0VsLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0XHR0ZXh0OiB0KFwiUGxlYXNlIGVudGVyIGEgdGFzayB0byB2YWxpZGF0ZVwiKSxcclxuXHRcdFx0XHRjbHM6IFwidmFsaWRhdGlvbi1tZXNzYWdlIHZhbGlkYXRpb24td2FybmluZ1wiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENoZWNrIGlmIGl0J3MgYSB2YWxpZCB0YXNrIGZvcm1hdFxyXG5cdFx0Y29uc3QgaXNWYWxpZFRhc2sgPSAvXi1cXHMqXFxbLlxcXVxccyouKy8udGVzdChpbnB1dCk7XHJcblxyXG5cdFx0aWYgKCFpc1ZhbGlkVGFzaykge1xyXG5cdFx0XHRmZWVkYmFja0VsLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0XHR0ZXh0OiB0KFxyXG5cdFx0XHRcdFx0XCJUaGlzIGRvZXNuJ3QgbG9vayBsaWtlIGEgdmFsaWQgdGFzay4gVGFza3Mgc2hvdWxkIHN0YXJ0IHdpdGggJy0gWyBdJ1wiLFxyXG5cdFx0XHRcdCksXHJcblx0XHRcdFx0Y2xzOiBcInZhbGlkYXRpb24tbWVzc2FnZSB2YWxpZGF0aW9uLWVycm9yXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2hlY2sgZm9yIG1ldGFkYXRhXHJcblx0XHRjb25zdCBoYXNFbW9qaU1ldGFkYXRhID0gL1vwn5OF8J+bq+KPs/CflLrij6vwn5S88J+UveKPrPCflIFdLy50ZXN0KGlucHV0KTtcclxuXHRcdGNvbnN0IGhhc0RhdGF2aWV3TWV0YWRhdGEgPSAvXFxbW1xcd10rOjpbXlxcXV0rXFxdLy50ZXN0KGlucHV0KTtcclxuXHRcdGNvbnN0IGhhc1Byb2plY3RUYWcgPSAvI1tcXHdcXC9dKy8udGVzdChpbnB1dCk7XHJcblx0XHRjb25zdCBoYXNDb250ZXh0ID0gL0BbXFx3XSsvLnRlc3QoaW5wdXQpO1xyXG5cclxuXHRcdGNvbnN0IHN1Y2Nlc3NNZXNzYWdlID0gZmVlZGJhY2tFbC5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdGNsczogXCJ2YWxpZGF0aW9uLW1lc3NhZ2UgdmFsaWRhdGlvbi1zdWNjZXNzXCIsXHJcblx0XHR9KTtcclxuXHRcdGNvbnN0IGNoZWNrSWNvbiA9IHN1Y2Nlc3NNZXNzYWdlLmNyZWF0ZVNwYW4oKTtcclxuXHRcdHNldEljb24oY2hlY2tJY29uLCBcImNoZWNrXCIpO1xyXG5cdFx0c3VjY2Vzc01lc3NhZ2UuY3JlYXRlU3BhbigpLnNldFRleHQoXCIgXCIgKyB0KFwiVmFsaWQgdGFzayBmb3JtYXQhXCIpKTtcclxuXHJcblx0XHQvLyBQcm92aWRlIGZlZWRiYWNrIG9uIGRldGVjdGVkIG1ldGFkYXRhXHJcblx0XHRjb25zdCBkZXRlY3RlZEZlYXR1cmVzID0gW107XHJcblx0XHRpZiAoaGFzRW1vamlNZXRhZGF0YSkgZGV0ZWN0ZWRGZWF0dXJlcy5wdXNoKHQoXCJFbW9qaSBtZXRhZGF0YVwiKSk7XHJcblx0XHRpZiAoaGFzRGF0YXZpZXdNZXRhZGF0YSkgZGV0ZWN0ZWRGZWF0dXJlcy5wdXNoKHQoXCJEYXRhdmlldyBtZXRhZGF0YVwiKSk7XHJcblx0XHRpZiAoaGFzUHJvamVjdFRhZykgZGV0ZWN0ZWRGZWF0dXJlcy5wdXNoKHQoXCJQcm9qZWN0IHRhZ3NcIikpO1xyXG5cdFx0aWYgKGhhc0NvbnRleHQpIGRldGVjdGVkRmVhdHVyZXMucHVzaCh0KFwiQ29udGV4dFwiKSk7XHJcblxyXG5cdFx0aWYgKGRldGVjdGVkRmVhdHVyZXMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRmZWVkYmFja0VsLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0XHR0ZXh0OiB0KFwiRGV0ZWN0ZWQgZmVhdHVyZXM6IFwiKSArIGRldGVjdGVkRmVhdHVyZXMuam9pbihcIiwgXCIpLFxyXG5cdFx0XHRcdGNsczogXCJ2YWxpZGF0aW9uLW1lc3NhZ2UgdmFsaWRhdGlvbi1pbmZvXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG4iXX0=