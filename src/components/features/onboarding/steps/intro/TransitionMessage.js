import { t } from "@/translations/helper";
/**
 * Transition message - Shows friendly confirmation after mode selection
 */
export class TransitionMessage {
    constructor(container, message, delay = 0) {
        this.container = container;
        this.show(message, delay);
    }
    /**
     * Show transition message with fade-in animation
     */
    show(message, delay) {
        const messageEl = this.container.createDiv({
            cls: "intro-transition-message",
        });
        // Start hidden
        messageEl.style.opacity = "0";
        messageEl.style.transform = "translateY(10px)";
        // Create icon
        const icon = messageEl.createSpan({
            cls: "transition-icon",
            text: "✨",
        });
        // Create text
        messageEl.createSpan({
            cls: "transition-text",
            text: message,
        });
        // Fade in after delay
        if (delay > 0) {
            this.timer = window.setTimeout(() => {
                messageEl.style.opacity = "1";
                messageEl.style.transform = "translateY(0)";
            }, delay);
        }
        else {
            // Immediate fade in
            requestAnimationFrame(() => {
                messageEl.style.opacity = "1";
                messageEl.style.transform = "translateY(0)";
            });
        }
    }
    /**
     * Cleanup
     */
    cleanup() {
        if (this.timer) {
            window.clearTimeout(this.timer);
        }
    }
    /**
     * Get appropriate message based on mode and user state
     */
    static getMessage(mode, hasChanges) {
        if (hasChanges) {
            return mode === "fluent"
                ? t("Nice choice! We noticed you've customized Task Genius. Let's make sure your settings are preserved.")
                : t("Got it! We'll help you keep your existing customizations while setting up the classic interface.");
        }
        return mode === "fluent"
            ? t("Excellent! Let's set up your modern workspace with the Fluent interface.")
            : t("Perfect! Let's configure Task Genius with the familiar classic interface.");
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHJhbnNpdGlvbk1lc3NhZ2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJUcmFuc2l0aW9uTWVzc2FnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFMUM7O0dBRUc7QUFDSCxNQUFNLE9BQU8saUJBQWlCO0lBSTdCLFlBQVksU0FBc0IsRUFBRSxPQUFlLEVBQUUsUUFBZ0IsQ0FBQztRQUNyRSxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUMzQixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMzQixDQUFDO0lBRUQ7O09BRUc7SUFDSyxJQUFJLENBQUMsT0FBZSxFQUFFLEtBQWE7UUFDMUMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUM7WUFDMUMsR0FBRyxFQUFFLDBCQUEwQjtTQUMvQixDQUFDLENBQUM7UUFFSCxlQUFlO1FBQ2YsU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDO1FBQzlCLFNBQVMsQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLGtCQUFrQixDQUFDO1FBRS9DLGNBQWM7UUFDZCxNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFDO1lBQ2pDLEdBQUcsRUFBRSxpQkFBaUI7WUFDdEIsSUFBSSxFQUFFLEdBQUc7U0FDVCxDQUFDLENBQUM7UUFFSCxjQUFjO1FBQ2QsU0FBUyxDQUFDLFVBQVUsQ0FBQztZQUNwQixHQUFHLEVBQUUsaUJBQWlCO1lBQ3RCLElBQUksRUFBRSxPQUFPO1NBQ2IsQ0FBQyxDQUFDO1FBRUgsc0JBQXNCO1FBQ3RCLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRTtZQUNkLElBQUksQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7Z0JBQ25DLFNBQVMsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQztnQkFDOUIsU0FBUyxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsZUFBZSxDQUFDO1lBQzdDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztTQUNWO2FBQU07WUFDTixvQkFBb0I7WUFDcEIscUJBQXFCLENBQUMsR0FBRyxFQUFFO2dCQUMxQixTQUFTLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUM7Z0JBQzlCLFNBQVMsQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLGVBQWUsQ0FBQztZQUM3QyxDQUFDLENBQUMsQ0FBQztTQUNIO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0gsT0FBTztRQUNOLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNmLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ2hDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0gsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUF5QixFQUFFLFVBQW1CO1FBQy9ELElBQUksVUFBVSxFQUFFO1lBQ2YsT0FBTyxJQUFJLEtBQUssUUFBUTtnQkFDdkIsQ0FBQyxDQUFDLENBQUMsQ0FDRCxxR0FBcUcsQ0FDcEc7Z0JBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FDRCxrR0FBa0csQ0FDakcsQ0FBQztTQUNMO1FBRUQsT0FBTyxJQUFJLEtBQUssUUFBUTtZQUN2QixDQUFDLENBQUMsQ0FBQyxDQUNELDBFQUEwRSxDQUN6RTtZQUNILENBQUMsQ0FBQyxDQUFDLENBQ0QsMkVBQTJFLENBQzFFLENBQUM7SUFDTixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5cclxuLyoqXHJcbiAqIFRyYW5zaXRpb24gbWVzc2FnZSAtIFNob3dzIGZyaWVuZGx5IGNvbmZpcm1hdGlvbiBhZnRlciBtb2RlIHNlbGVjdGlvblxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFRyYW5zaXRpb25NZXNzYWdlIHtcclxuXHRwcml2YXRlIGNvbnRhaW5lcjogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSB0aW1lcj86IG51bWJlcjtcclxuXHJcblx0Y29uc3RydWN0b3IoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgbWVzc2FnZTogc3RyaW5nLCBkZWxheTogbnVtYmVyID0gMCkge1xyXG5cdFx0dGhpcy5jb250YWluZXIgPSBjb250YWluZXI7XHJcblx0XHR0aGlzLnNob3cobWVzc2FnZSwgZGVsYXkpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2hvdyB0cmFuc2l0aW9uIG1lc3NhZ2Ugd2l0aCBmYWRlLWluIGFuaW1hdGlvblxyXG5cdCAqL1xyXG5cdHByaXZhdGUgc2hvdyhtZXNzYWdlOiBzdHJpbmcsIGRlbGF5OiBudW1iZXIpIHtcclxuXHRcdGNvbnN0IG1lc3NhZ2VFbCA9IHRoaXMuY29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJpbnRyby10cmFuc2l0aW9uLW1lc3NhZ2VcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFN0YXJ0IGhpZGRlblxyXG5cdFx0bWVzc2FnZUVsLnN0eWxlLm9wYWNpdHkgPSBcIjBcIjtcclxuXHRcdG1lc3NhZ2VFbC5zdHlsZS50cmFuc2Zvcm0gPSBcInRyYW5zbGF0ZVkoMTBweClcIjtcclxuXHJcblx0XHQvLyBDcmVhdGUgaWNvblxyXG5cdFx0Y29uc3QgaWNvbiA9IG1lc3NhZ2VFbC5jcmVhdGVTcGFuKHtcclxuXHRcdFx0Y2xzOiBcInRyYW5zaXRpb24taWNvblwiLFxyXG5cdFx0XHR0ZXh0OiBcIuKcqFwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIHRleHRcclxuXHRcdG1lc3NhZ2VFbC5jcmVhdGVTcGFuKHtcclxuXHRcdFx0Y2xzOiBcInRyYW5zaXRpb24tdGV4dFwiLFxyXG5cdFx0XHR0ZXh0OiBtZXNzYWdlLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gRmFkZSBpbiBhZnRlciBkZWxheVxyXG5cdFx0aWYgKGRlbGF5ID4gMCkge1xyXG5cdFx0XHR0aGlzLnRpbWVyID0gd2luZG93LnNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdG1lc3NhZ2VFbC5zdHlsZS5vcGFjaXR5ID0gXCIxXCI7XHJcblx0XHRcdFx0bWVzc2FnZUVsLnN0eWxlLnRyYW5zZm9ybSA9IFwidHJhbnNsYXRlWSgwKVwiO1xyXG5cdFx0XHR9LCBkZWxheSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBJbW1lZGlhdGUgZmFkZSBpblxyXG5cdFx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xyXG5cdFx0XHRcdG1lc3NhZ2VFbC5zdHlsZS5vcGFjaXR5ID0gXCIxXCI7XHJcblx0XHRcdFx0bWVzc2FnZUVsLnN0eWxlLnRyYW5zZm9ybSA9IFwidHJhbnNsYXRlWSgwKVwiO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsZWFudXBcclxuXHQgKi9cclxuXHRjbGVhbnVwKCkge1xyXG5cdFx0aWYgKHRoaXMudGltZXIpIHtcclxuXHRcdFx0d2luZG93LmNsZWFyVGltZW91dCh0aGlzLnRpbWVyKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBhcHByb3ByaWF0ZSBtZXNzYWdlIGJhc2VkIG9uIG1vZGUgYW5kIHVzZXIgc3RhdGVcclxuXHQgKi9cclxuXHRzdGF0aWMgZ2V0TWVzc2FnZShtb2RlOiBcImZsdWVudFwiIHwgXCJsZWdhY3lcIiwgaGFzQ2hhbmdlczogYm9vbGVhbik6IHN0cmluZyB7XHJcblx0XHRpZiAoaGFzQ2hhbmdlcykge1xyXG5cdFx0XHRyZXR1cm4gbW9kZSA9PT0gXCJmbHVlbnRcIlxyXG5cdFx0XHRcdD8gdChcclxuXHRcdFx0XHRcdFx0XCJOaWNlIGNob2ljZSEgV2Ugbm90aWNlZCB5b3UndmUgY3VzdG9taXplZCBUYXNrIEdlbml1cy4gTGV0J3MgbWFrZSBzdXJlIHlvdXIgc2V0dGluZ3MgYXJlIHByZXNlcnZlZC5cIlxyXG5cdFx0XHRcdCAgKVxyXG5cdFx0XHRcdDogdChcclxuXHRcdFx0XHRcdFx0XCJHb3QgaXQhIFdlJ2xsIGhlbHAgeW91IGtlZXAgeW91ciBleGlzdGluZyBjdXN0b21pemF0aW9ucyB3aGlsZSBzZXR0aW5nIHVwIHRoZSBjbGFzc2ljIGludGVyZmFjZS5cIlxyXG5cdFx0XHRcdCAgKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gbW9kZSA9PT0gXCJmbHVlbnRcIlxyXG5cdFx0XHQ/IHQoXHJcblx0XHRcdFx0XHRcIkV4Y2VsbGVudCEgTGV0J3Mgc2V0IHVwIHlvdXIgbW9kZXJuIHdvcmtzcGFjZSB3aXRoIHRoZSBGbHVlbnQgaW50ZXJmYWNlLlwiXHJcblx0XHRcdCAgKVxyXG5cdFx0XHQ6IHQoXHJcblx0XHRcdFx0XHRcIlBlcmZlY3QhIExldCdzIGNvbmZpZ3VyZSBUYXNrIEdlbml1cyB3aXRoIHRoZSBmYW1pbGlhciBjbGFzc2ljIGludGVyZmFjZS5cIlxyXG5cdFx0XHQgICk7XHJcblx0fVxyXG59XHJcbiJdfQ==