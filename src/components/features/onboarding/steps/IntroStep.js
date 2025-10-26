import { t } from "@/translations/helper";
import { OnboardingStep } from "../OnboardingController";
import { TypingAnimation } from "./intro/TypingAnimation";
/**
 * Intro Step - Welcome message with typing animation + mode selection
 */
export class IntroStep {
    /**
     * Render the intro step
     */
    static render(headerEl, contentEl, footerEl, controller) {
        // Clear
        headerEl.empty();
        contentEl.empty();
        // Hide footer during intro animation
        footerEl.hide();
        // Create wrapper for typing animation
        const introWrapper = contentEl.createDiv({
            cls: "intro-typing-wrapper",
        });
        // Create typing container
        const typingContainer = introWrapper.createDiv({
            cls: "intro-typing",
        });
        // Define welcome messages with timing from original implementation
        const messages = [
            {
                text: t("Hi,"),
                className: "intro-line-1",
                speed: 35,
            },
            {
                text: t("Thank you for using Task Genius"),
                className: "intro-line-2",
                speed: 25,
            },
            {
                text: t("In the following steps, you will gradually set up Task Genius to get a more suitable environment for you"),
                className: "intro-line-3",
                speed: 20,
                fadeOut: true,
                pauseAfter: 2000,
                fadeOutDelay: 0,
                fadeOutDuration: 1000,
                delayNext: 0, // No extra delay before next message
            },
            {
                text: t("In the current version, Task Genius provides a brand new visual and interactive experience: Fluent; while also providing the option to return to the previous interface. Which one do you prefer?"),
                className: "intro-line-4",
                speed: 20,
                pauseAfter: 300, // Brief pause before showing mode selection
            },
        ];
        // Start typing animation
        new TypingAnimation(typingContainer, messages, () => {
            // Typing completed: show footer and move to Mode Selection step
            footerEl.show();
            controller.setStep(OnboardingStep.MODE_SELECT);
        });
    }
    /**
     * Cleanup
     */
    cleanup() {
        var _a, _b;
        (_a = this.typingAnimation) === null || _a === void 0 ? void 0 : _a.cleanup();
        (_b = this.transitionMessage) === null || _b === void 0 ? void 0 : _b.cleanup();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSW50cm9TdGVwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiSW50cm9TdGVwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUMxQyxPQUFPLEVBQXdCLGNBQWMsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQy9FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUcxRDs7R0FFRztBQUNILE1BQU0sT0FBTyxTQUFTO0lBSXJCOztPQUVHO0lBQ0gsTUFBTSxDQUFDLE1BQU0sQ0FDWixRQUFxQixFQUNyQixTQUFzQixFQUN0QixRQUFxQixFQUNyQixVQUFnQztRQUVoQyxRQUFRO1FBQ1IsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2pCLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUVsQixxQ0FBcUM7UUFDckMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO1FBRWhCLHNDQUFzQztRQUN0QyxNQUFNLFlBQVksR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDO1lBQ3hDLEdBQUcsRUFBRSxzQkFBc0I7U0FDM0IsQ0FBQyxDQUFDO1FBRUgsMEJBQTBCO1FBQzFCLE1BQU0sZUFBZSxHQUFHLFlBQVksQ0FBQyxTQUFTLENBQUM7WUFDOUMsR0FBRyxFQUFFLGNBQWM7U0FDbkIsQ0FBQyxDQUFDO1FBRUgsbUVBQW1FO1FBQ25FLE1BQU0sUUFBUSxHQUFHO1lBQ2hCO2dCQUNDLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDO2dCQUNkLFNBQVMsRUFBRSxjQUFjO2dCQUN6QixLQUFLLEVBQUUsRUFBRTthQUNUO1lBQ0Q7Z0JBQ0MsSUFBSSxFQUFFLENBQUMsQ0FBQyxpQ0FBaUMsQ0FBQztnQkFDMUMsU0FBUyxFQUFFLGNBQWM7Z0JBQ3pCLEtBQUssRUFBRSxFQUFFO2FBQ1Q7WUFDRDtnQkFDQyxJQUFJLEVBQUUsQ0FBQyxDQUNOLDBHQUEwRyxDQUMxRztnQkFDRCxTQUFTLEVBQUUsY0FBYztnQkFDekIsS0FBSyxFQUFFLEVBQUU7Z0JBQ1QsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsVUFBVSxFQUFFLElBQUk7Z0JBQ2hCLFlBQVksRUFBRSxDQUFDO2dCQUNmLGVBQWUsRUFBRSxJQUFJO2dCQUNyQixTQUFTLEVBQUUsQ0FBQyxFQUFFLHFDQUFxQzthQUNuRDtZQUNEO2dCQUNDLElBQUksRUFBRSxDQUFDLENBQ04sbU1BQW1NLENBQ25NO2dCQUNELFNBQVMsRUFBRSxjQUFjO2dCQUN6QixLQUFLLEVBQUUsRUFBRTtnQkFDVCxVQUFVLEVBQUUsR0FBRyxFQUFFLDRDQUE0QzthQUM3RDtTQUNELENBQUM7UUFFRix5QkFBeUI7UUFDekIsSUFBSSxlQUFlLENBQUMsZUFBZSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUU7WUFDbkQsZ0VBQWdFO1lBQ2hFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixVQUFVLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNoRCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRDs7T0FFRztJQUNILE9BQU87O1FBQ04sTUFBQSxJQUFJLENBQUMsZUFBZSwwQ0FBRSxPQUFPLEVBQUUsQ0FBQztRQUNoQyxNQUFBLElBQUksQ0FBQyxpQkFBaUIsMENBQUUsT0FBTyxFQUFFLENBQUM7SUFDbkMsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IHsgT25ib2FyZGluZ0NvbnRyb2xsZXIsIE9uYm9hcmRpbmdTdGVwIH0gZnJvbSBcIi4uL09uYm9hcmRpbmdDb250cm9sbGVyXCI7XHJcbmltcG9ydCB7IFR5cGluZ0FuaW1hdGlvbiB9IGZyb20gXCIuL2ludHJvL1R5cGluZ0FuaW1hdGlvblwiO1xyXG5pbXBvcnQgeyBUcmFuc2l0aW9uTWVzc2FnZSB9IGZyb20gXCIuL2ludHJvL1RyYW5zaXRpb25NZXNzYWdlXCI7XHJcblxyXG4vKipcclxuICogSW50cm8gU3RlcCAtIFdlbGNvbWUgbWVzc2FnZSB3aXRoIHR5cGluZyBhbmltYXRpb24gKyBtb2RlIHNlbGVjdGlvblxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIEludHJvU3RlcCB7XHJcblx0cHJpdmF0ZSB0eXBpbmdBbmltYXRpb24/OiBUeXBpbmdBbmltYXRpb247XHJcblx0cHJpdmF0ZSB0cmFuc2l0aW9uTWVzc2FnZT86IFRyYW5zaXRpb25NZXNzYWdlO1xyXG5cclxuXHQvKipcclxuXHQgKiBSZW5kZXIgdGhlIGludHJvIHN0ZXBcclxuXHQgKi9cclxuXHRzdGF0aWMgcmVuZGVyKFxyXG5cdFx0aGVhZGVyRWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0Y29udGVudEVsOiBIVE1MRWxlbWVudCxcclxuXHRcdGZvb3RlckVsOiBIVE1MRWxlbWVudCxcclxuXHRcdGNvbnRyb2xsZXI6IE9uYm9hcmRpbmdDb250cm9sbGVyXHJcblx0KSB7XHJcblx0XHQvLyBDbGVhclxyXG5cdFx0aGVhZGVyRWwuZW1wdHkoKTtcclxuXHRcdGNvbnRlbnRFbC5lbXB0eSgpO1xyXG5cclxuXHRcdC8vIEhpZGUgZm9vdGVyIGR1cmluZyBpbnRybyBhbmltYXRpb25cclxuXHRcdGZvb3RlckVsLmhpZGUoKTtcclxuXHJcblx0XHQvLyBDcmVhdGUgd3JhcHBlciBmb3IgdHlwaW5nIGFuaW1hdGlvblxyXG5cdFx0Y29uc3QgaW50cm9XcmFwcGVyID0gY29udGVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJpbnRyby10eXBpbmctd3JhcHBlclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIHR5cGluZyBjb250YWluZXJcclxuXHRcdGNvbnN0IHR5cGluZ0NvbnRhaW5lciA9IGludHJvV3JhcHBlci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiaW50cm8tdHlwaW5nXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBEZWZpbmUgd2VsY29tZSBtZXNzYWdlcyB3aXRoIHRpbWluZyBmcm9tIG9yaWdpbmFsIGltcGxlbWVudGF0aW9uXHJcblx0XHRjb25zdCBtZXNzYWdlcyA9IFtcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHRleHQ6IHQoXCJIaSxcIiksXHJcblx0XHRcdFx0Y2xhc3NOYW1lOiBcImludHJvLWxpbmUtMVwiLFxyXG5cdFx0XHRcdHNwZWVkOiAzNSxcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHRleHQ6IHQoXCJUaGFuayB5b3UgZm9yIHVzaW5nIFRhc2sgR2VuaXVzXCIpLFxyXG5cdFx0XHRcdGNsYXNzTmFtZTogXCJpbnRyby1saW5lLTJcIixcclxuXHRcdFx0XHRzcGVlZDogMjUsXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHR0ZXh0OiB0KFxyXG5cdFx0XHRcdFx0XCJJbiB0aGUgZm9sbG93aW5nIHN0ZXBzLCB5b3Ugd2lsbCBncmFkdWFsbHkgc2V0IHVwIFRhc2sgR2VuaXVzIHRvIGdldCBhIG1vcmUgc3VpdGFibGUgZW52aXJvbm1lbnQgZm9yIHlvdVwiXHJcblx0XHRcdFx0KSxcclxuXHRcdFx0XHRjbGFzc05hbWU6IFwiaW50cm8tbGluZS0zXCIsXHJcblx0XHRcdFx0c3BlZWQ6IDIwLFxyXG5cdFx0XHRcdGZhZGVPdXQ6IHRydWUsXHJcblx0XHRcdFx0cGF1c2VBZnRlcjogMjAwMCwgLy8gV2FpdCAzcyBmb3IgdXNlciB0byByZWFkXHJcblx0XHRcdFx0ZmFkZU91dERlbGF5OiAwLCAvLyBTdGFydCBmYWRpbmcgb3V0IGltbWVkaWF0ZWx5IGFmdGVyIHBhdXNlXHJcblx0XHRcdFx0ZmFkZU91dER1cmF0aW9uOiAxMDAwLCAvLyAycyBmYWRlIG91dCBhbmltYXRpb25cclxuXHRcdFx0XHRkZWxheU5leHQ6IDAsIC8vIE5vIGV4dHJhIGRlbGF5IGJlZm9yZSBuZXh0IG1lc3NhZ2VcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHRleHQ6IHQoXHJcblx0XHRcdFx0XHRcIkluIHRoZSBjdXJyZW50IHZlcnNpb24sIFRhc2sgR2VuaXVzIHByb3ZpZGVzIGEgYnJhbmQgbmV3IHZpc3VhbCBhbmQgaW50ZXJhY3RpdmUgZXhwZXJpZW5jZTogRmx1ZW50OyB3aGlsZSBhbHNvIHByb3ZpZGluZyB0aGUgb3B0aW9uIHRvIHJldHVybiB0byB0aGUgcHJldmlvdXMgaW50ZXJmYWNlLiBXaGljaCBvbmUgZG8geW91IHByZWZlcj9cIlxyXG5cdFx0XHRcdCksXHJcblx0XHRcdFx0Y2xhc3NOYW1lOiBcImludHJvLWxpbmUtNFwiLFxyXG5cdFx0XHRcdHNwZWVkOiAyMCxcclxuXHRcdFx0XHRwYXVzZUFmdGVyOiAzMDAsIC8vIEJyaWVmIHBhdXNlIGJlZm9yZSBzaG93aW5nIG1vZGUgc2VsZWN0aW9uXHJcblx0XHRcdH0sXHJcblx0XHRdO1xyXG5cclxuXHRcdC8vIFN0YXJ0IHR5cGluZyBhbmltYXRpb25cclxuXHRcdG5ldyBUeXBpbmdBbmltYXRpb24odHlwaW5nQ29udGFpbmVyLCBtZXNzYWdlcywgKCkgPT4ge1xyXG5cdFx0XHQvLyBUeXBpbmcgY29tcGxldGVkOiBzaG93IGZvb3RlciBhbmQgbW92ZSB0byBNb2RlIFNlbGVjdGlvbiBzdGVwXHJcblx0XHRcdGZvb3RlckVsLnNob3coKTtcclxuXHRcdFx0Y29udHJvbGxlci5zZXRTdGVwKE9uYm9hcmRpbmdTdGVwLk1PREVfU0VMRUNUKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2xlYW51cFxyXG5cdCAqL1xyXG5cdGNsZWFudXAoKSB7XHJcblx0XHR0aGlzLnR5cGluZ0FuaW1hdGlvbj8uY2xlYW51cCgpO1xyXG5cdFx0dGhpcy50cmFuc2l0aW9uTWVzc2FnZT8uY2xlYW51cCgpO1xyXG5cdH1cclxufVxyXG4iXX0=